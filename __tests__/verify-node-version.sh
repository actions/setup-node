#!/bin/sh

if [ -z "$1" ]; then
  echo "Must supply version argument"
  exit 1
fi

node_version="$(node --version)"
echo "Found node version '$node_version'"
if [ -z "$(echo $node_version | grep v$1)" ]; then
  echo "Unexpected version"
  exit 1
fi