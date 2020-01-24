#!/bin/sh

if [[ -z "$1" ]]; then
  echo "Must supply version argument"
  exit 1
fi

node_version="$(node --version)"
echo "Found node version '$node_version'"
if [[ $node_version =~ "v$1" ]]; then
  echo "Success. Version matches 'v$1'"
else
  echo "Unexpected version"
  exit 1
fi