#!/bin/bash -ex

APP=ui
PORT=8080

KUBECTL_RUN_PARAMS="--env=\"BACKEND_URI=http://pdfsplit:8081/pdf\""
KUBECTL_EXPOSE_PARAMS="--type=LoadBalancer"
