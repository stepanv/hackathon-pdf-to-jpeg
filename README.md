PDF to JPG converter
====================

This is a PDF to JPG Converter powered by Google Cloud Engine.


# Build and Deployment
1. To build the application, execute:
    
    ```
    GCLOUD_PROJECT=??? GCLOUD_STORAGE_BUCKET=??? ./build.sh 
    ```

    The deployment uses `kubectl` which needs to be activated somehow. For instance, by running `cloud container clusters get-credentials ...`

2. Create Google Storage bucket

# Description

## Usage
1. Deploy the applications to the Kubernetes and 
2. access the exposed address of the `ui` service such as *http://104.197.108.252:8080/*
3. Follow the instructions on the page and upload a PDF file
4. Download the resulting ZIP archive that contains JPEG files per each page of PDF

## Design

Microservices:

1. UI
2. PDF Split (splits PDF per each page) (Currently, PDF Split performs even the services as described at 3. and 4.
3. (not yet implemented) Conversion (parallel conversion of a single page PDF to a JPG)
4. (not yet implemented) Zipper & Storage uploader (to gather all the resulting JPGs and iterative zipping)