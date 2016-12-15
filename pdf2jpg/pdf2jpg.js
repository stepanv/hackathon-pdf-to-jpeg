'use strict';

var express = require('express');
var app = express();
var fs = require("fs");
var tmp = require('tmp');
var child_process = require('child_process');

const spawn = child_process.spawn;
const CONVERT_EXECUTABLE = process.env.CONVERT_EXECUTABLE || "/usr/local/bin/convert";

app.post('/pdf2jpg', (req, res, next) => {
    tmp.file({mode: '0644', prefix: 'prefix-', postfix: '.pdf'}, (err, path, fd) => {
        console.log("Writing to: " + path);

        req
            .pipe(fs.createWriteStream(path))
            .on('finish', () => {
                const convert = spawn(CONVERT_EXECUTABLE, ['-quality', '95', '-verbose', '-colorspace', 'rgb', '-density', '150', path, path + '_image.jpg'])
                convert.stderr.on('data', data => {
                    console.log("Convert error output: " + data);
                });

                convert.on('close', code => {
                    console.log("Streaming: " + path + '_image.jpg')
                    var writeStream = fs.createReadStream(path + '_image.jpg');
                    writeStream.pipe(res);
                    writeStream.on('end', () => {
                        console.log("Data sent")
                    });
                });
            });
    });
})

var server = app.listen(8082, function () {

    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)

})
