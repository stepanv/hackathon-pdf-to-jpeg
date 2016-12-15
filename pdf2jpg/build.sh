#!/bin/bash -ex

APP=pdf2jpg
PORT=8082

KUBECTL_RUN_PARAMS="--replicas=4 --env=\"CONVERT_EXECUTABLE=/usr/bin/convert\""
