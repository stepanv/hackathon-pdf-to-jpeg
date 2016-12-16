/**
 * Copyright 2016, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// [START app]
'use strict';

const express = require('express');
const multer = require('multer');
var tmp = require('tmp');
var request = require('request');

var fs = require("fs");

const app = express();
app.set('view engine', 'pug');


var tmpobj = tmp.dirSync();
console.log("Dir: ", tmpobj.name);

// [START config]
// Multer is required to process file uploads and make them available via
// req.files.
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, tmpobj.name)
        },
        filename: (req, file, cb) => {
            cb(null, file.fieldname + '-' + Date.now())
        }
    }),
    limits: {
        fileSize: 5 * 1024 * 1024 // no larger than 5mb, you can change as needed.
    }
});

const BACKEND_URI = process.env.BACKEND_URI || "http://localhost:8081/pdf";

// [START form]
// Display a form for uploading files.
app.get('/', (req, res) => {
    res.render('form.pug');

    console.log("Received GET request");
});
// [END form]

const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf8');

// [START process]
// Process the file upload and upload to Google Cloud Storage.
app.post('/upload', upload.single('file'), (req, res, next) => {
    if (!req.file) {
        res.status(400).send('No file uploaded.');
        return;
    }

    console.log("Submitting the file to: " + BACKEND_URI + "?originalname=" + req.file.originalname)

    fs.createReadStream(req.file.path).pipe(request
        .post({ url: BACKEND_URI + "?originalname=" + req.file.originalname }, (err, httpResponse, body) => {
            if (err) {
                res.status(400).render('error.pug');
                return console.error('upload failed:', err);
            }
            console.log('Upload successful!  Server responded with:', body);
            res.status(httpResponse.statusCode).render('result.pug', {
                link: decoder.write(body)
            });
        })
    );
});
// [END process]

//const PORT = process.env.PORT || 8080;
const PORT = 8080;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
});
// [END app]
