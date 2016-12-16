'use strict';

var express = require('express');
var app = express();
var fs = require("fs");
var tmp = require('tmp');
var child_process = require('child_process');
var zipFolder = require('zip-folder');
var request = require('request');

const format = require('util').format;
const Storage = require('@google-cloud/storage');

// Instantiate a storage client
const storage = Storage();

const GS_EXECUTABLE = process.env.CONVERT_EXECUTABLE || "/usr/local/bin/gs";
const PDF2JPG_URI = process.env.PDF2JPG_URI || "http://localhost:8082/pdf2jpg";

var bucketName = process.env.GCLOUD_STORAGE_BUCKET;
console.log("Will use bucket: " + bucketName);
const bucket = storage.bucket(bucketName);

app.post('/pdf', (req, res, next) => {
    console.log("Handling post!");

    tmp.file({mode: '0644', prefix: 'prefix-', postfix: '.pdf'}, (err, path, fd) => {
        console.log("Writing to: " + path);

        req
            .pipe(fs.createWriteStream(path))
            .on('finish', () => {

                console.log('file has been written');

                const spawn = child_process.spawn;
                const ls = spawn('/bin/ls', ['-la', path]);

                ls.stdout.on('data', data => {
                    console.log(`stdout: ${data}`);

                    tmp.dir({mode: '0750', prefix: 'convert_output_'}, (err, dirPath) => {
                        if (err) throw err;

                        //const convert = spawn(CONVERT_EXECUTABLE, ['-quality','95', '-verbose', '-colorspace', 'rgb', '-density',
                        // '150', path, dirPath + '/image.jpg'])
                        const split = spawn(GS_EXECUTABLE, ['-sDEVICE=pdfwrite', '-dSAFER', '-o', dirPath + '/outname.%d.pdf', path])

                        split.stderr.on('data', data => {
                            console.log("Convert error output: " + data);
                        });
                        split.stdout.on('data', data => {
                            console.log("Convert std output: " + data);
                        });
                        split.on('close', code => {
                            if (code == 0) {
                                console.log("Convert went OK: " + dirPath)

                                tmp.dir({mode: '0750', prefix: 'jpg_output_'}, (err, jpgDirPath) => {
                                    if (err) throw err;

                                    // iterate over each file
                                    fs.readdir(dirPath, (errReadDir, files) => {

                                        var pictureCount = {
                                            count: 0
                                        }
                                        const totalCount = files.length;

                                        files.forEach(pdfFile => {

                                            if (pdfFile == "." || pdfFile == "..") {
                                                return;
                                            }
                                            var pdfFilePath = dirPath + "/" + pdfFile
                                            console.log("Iterating over pdf page file: " + pdfFilePath);

                                            fs.createReadStream(pdfFilePath).pipe(request
                                                .post(PDF2JPG_URI)
                                                .on('error', (err) => {
                                                    console.log("PDF File streaming error: " + err);
                                                })
                                                .on('response', (response) => {
                                                    console.log("Response for file " + pdfFilePath + ": " + response.statusCode) // 200

                                                    ++pictureCount.count;

                                                    // we have one picture
                                                    console.log("Received picture: " + pictureCount.count)
                                                    if (pictureCount.count == totalCount) {
                                                        // we have all images

                                                        tmp.file({mode: '0644', prefix: 'prefix-', postfix: '.zip'}, (err, zipPath, fd) => {

                                                            zipFolder(jpgDirPath, zipPath, (err) => {
                                                                if (err) {
                                                                    console.log('oh no!', err);
                                                                } else {

                                                                    console.log("Uploading file to Cloud Storage.")
                                                                    // upload the resulting zip to the Cloud Storage
                                                                    // Create a new blob in the bucket and upload the file data.
                                                                    const blob = bucket.file(req.query.originalname + "-" + Math.floor((Math.random() * 1000000000000000000000) + 1) + ".zip");
                                                                    const blobStream = blob.createWriteStream();

                                                                    blobStream.on('error', (err) => {
                                                                        next(err);
                                                                        console.log("Error: " + JSON.stringify(err, null, 2));
                                                                        return;
                                                                    });

                                                                    blobStream.on('finish', () => {
                                                                        // The public URL can be used to directly access the file via HTTP.
                                                                        const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
                                                                        res.status(200).send(publicUrl);
                                                                        console.log("Public URL: " + publicUrl)
                                                                    });

                                                                    fs.readFile(zipPath, (err, data) => {
                                                                        if (err) throw err;
                                                                        blobStream.end(data);
                                                                    });
                                                                }
                                                            });
                                                        });

                                                    } else {
                                                        console.log(`Current picture count: ${pictureCount.count}/${totalCount}`)
                                                    }
                                                })
                                            ).pipe(fs.createWriteStream(jpgDirPath + "/" + pdfFile + ".jpg"));

                                        });
                                    });


                                });


                            } else {
                                console.log("Convert wasn't successful: " + code)
                                res.status(400).send("Convert code: " + code);
                            }
                        })


                        console.log("Dir: ", path);
                    });


                });

                ls.stderr.on('data', data => {
                    console.log(`stderr: ${data}`);

                    res.status(400).send("Error: " + data);
                });

                ls.on('close', code => {
                    console.log(`child process exited with code ${code}`);
                });
            });
    });
})

var server = app.listen(8081, function () {

    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)

})
