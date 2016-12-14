'use strict';

var express = require('express');
var app = express();
var fs = require("fs");
var tmp = require('tmp');
var child_process = require('child_process');
var zipFolder = require('zip-folder');

const format = require('util').format;
const Multer = require('multer');

const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // no larger than 5mb, you can change as needed.
    }
});

const Storage = require('@google-cloud/storage');

// Instantiate a storage client
const storage = Storage();

const CONVERT_EXECUTABLE = process.env.CONVERT_EXECUTABLE || "/usr/local/bin/convert";

var bucketName = process.env.GCLOUD_STORAGE_BUCKET;
console.log("Will use bucket: " + bucketName);
const bucket = storage.bucket(bucketName);

app.post('/pdf', multer.single('file'), (req, res, next) => {
    console.log("Handling post!");

    if (!req.file) {
        console.log("INFO: no file uploaded");
        res.status(400).send('No file uploaded.');
        return;
    }

    tmp.file({mode: '0644', prefix: 'prefix-', postfix: '.txt'}, (err, path, fd) => {
        if (err) throw err;

        console.log("File: ", path);
        console.log("Filedescriptor: ", fd);

        var wstream = fs.createWriteStream(path);
        wstream.on('finish', function () {
            console.log('file has been written');

            const spawn = child_process.spawn;
            const ls = spawn('/bin/ls', ['-la', path]);

            ls.stdout.on('data', data => {
                console.log(`stdout: ${data}`);

                tmp.dir({ mode: '0750', prefix: 'convert_output_' }, (err, dirPath) => {
                    if (err) throw err;

                    const convert = spawn(CONVERT_EXECUTABLE, ['-quality','95', '-verbose', '-colorspace', 'rgb', '-density', '150', path, dirPath + '/image.jpg'])

                    convert.stderr.on('data', data => {
                        console.log("Convert error output: " + data);
                    });
                    convert.on('close', code => {
                        if (code == 0) {
                            console.log("Convert went OK")

                            tmp.file({mode: '0644', prefix: 'prefix-', postfix: '.zip'}, (err, zipPath, fd) => {

                                zipFolder(dirPath, zipPath, (err) => {
                                    if(err) {
                                        console.log('oh no!', err);
                                    } else {

                                        console.log("Uploading file to Cloud Storage.")
                                        // upload the resulting zip to the Cloud Storage
                                        // Create a new blob in the bucket and upload the file data.
                                        const blob = bucket.file(req.file.originalname + "-" + Math.floor((Math.random() * 1000000000000000000000) + 1) + ".zip");
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
                            res.status(400).send("Output: " + data);
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
        wstream.write(req.file.buffer);
        wstream.end();
    });

})

var server = app.listen(8081, function () {

    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)

})
