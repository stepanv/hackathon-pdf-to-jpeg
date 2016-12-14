#!/bin/bash -ex

GCLOUD_PROJECT="${GCLOUD_PROJECT?:Variable GCLOULD_PROJECT must be set for the build}"
GCLOUD_STORAGE_BUCKET="${GCLOUD_STORAGE_BUCKET:?Variable GCLOUD_STORAGE_BUCKET must be set for the build}"

docker_build_push() {
    DOCKER_IMAGE="${1:?Docker image is missing}"

    docker build . -t "$DOCKER_IMAGE" --build-arg HTTP_PROXY=$http_proxy --build-arg HTTPS_PROXY=$https_proxy --build-arg http_proxy=$http_proxy --build-arg https_proxy=$https_proxy
    gcloud docker -- push "$DOCKER_IMAGE"
}

kubectl_redeploy() {

    APP="${1:?Application name is required}"
    DOCKER_IMAGE="${2:?Docker image name is missing}"

    kubectl delete service,deployment "$APP" || true
    kubectl run "$APP" --image="$DOCKER_IMAGE" --port="$PORT" $KUBECTL_RUN_PARAMS
    kubectl expose deployment "$APP" $KUBECTL_EXPOSE_PARAMS

}

kubectl_info() {
    APP="${1:?Application name si required}"

    kubectl get service "$APP"
}

([ "$#" -gt 0 ] && echo $@ || find $(dirname $0) -name build.sh -mindepth 2) | while read MODULE; do

    source "$MODULE"

    DOCKER_IMAGE="us.gcr.io/$GCLOUD_PROJECT/$APP"

    pushd $(dirname "$MODULE")

    docker_build_push "$DOCKER_IMAGE"
    kubectl_redeploy "$APP" "$DOCKER_IMAGE"
    kubectl_info "$APP"

    popd

done


