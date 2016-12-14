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
const Multer = require('multer');

var fs = require("fs");

const app = express();
app.set('view engine', 'pug');

// [START config]
// Multer is required to process file uploads and make them available via
// req.files.
const multer = Multer({
    storage: Multer.memoryStorage(),
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
app.post('/upload', multer.single('file'), (req, res, next) => {
    if (!req.file) {
        res.status(400).send('No file uploaded.');
        return;
    }

    var FormData = require('form-data');

    var form = new FormData();

    form.append('file', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        knownLength: req.file.size
    });

    console.log("Submitting the file to: " + BACKEND_URI)
    form.submit(BACKEND_URI, (err, result) => {

        result.on('data', (chunk) => {
            console.log('BODY: ' + chunk);
            res.status(result.statusCode).render('result.pug', {
                link: decoder.write(chunk)
            });
        });
        console.log("Resumed: " + result.statusCode);
        console.log("Err: " + err);

    });
});
// [END process]

//const PORT = process.env.PORT || 8080;
const PORT = 8080;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
});
// [END app]
