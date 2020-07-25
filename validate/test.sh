
#/bin/bash

set -e

rm -rf ./temp
rm -rf ./node

# uncomment to use charles proxy or other debugging proxy
# export NODE_TLS_REJECT_UNAUTHORIZED=0
# export https_proxy=http://127.0.0.1:8888

export RUNNER_TOOL_CACHE=$(pwd)
export RUNNER_TEMP="${RUNNER_TOOL_CACHE}/temp"
export INPUT_STABLE=true
export INPUT_VERSION="12"   #"0.12.7"  #"12" #"11.15.0"
# export your PAT with repo scope before running
export INPUT_TOKEN=$GITHUB_TOKEN

echo "Getting ${INPUT_VERSION} ($INPUT_STABLE) with ${INPUT_TOKEN}..."

node ../dist/index.js
