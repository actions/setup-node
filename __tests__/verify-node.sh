#!/bin/sh

if [ -z "$1" ]; then
  echo "Must supply node version argument"
  exit 1
fi

if [ -z "$2" ]; then
  echo "Must supply npm version argument"
  exit 1
fi

node_version="$(node --version)"
echo "Found node version '$node_version'"
if [ -z "$(echo $node_version | grep v$1)" ]; then
  echo "Unexpected version"
  exit 1
fi

npm_version="$(npm --version)"
echo "Found npm version '$npm_version'"
if [ -z "$(echo $npm_version | grep v$2)" ]; then
  echo "Unexpected version"
  exit 1
fi

echo "Testing npm install"
mkdir -p test-npm-install
cd test-npm-install
npm install @actions/core .
cd ..