#!/bin/bash -ex

APP=pdfsplit
PORT=8081

KUBECTL_RUN_PARAMS="--env=\"GCLOUD_PROJECT=$GCLOUD_PROJECT\" --env=\"GCLOUD_STORAGE_BUCKET=$GCLOUD_STORAGE_BUCKET\" --env=\"PDF2JPG_URI=http://pdf2jpg:8082/pdf2jpg\" --env=\"GS_EXECUTABLE=/usr/bin/gs\""
