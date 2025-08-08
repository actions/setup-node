#!/bin/sh

if [ -z "$1" ]; then
  echo "Must supply node version argument"
  exit 1
fi

node_version="$(node --version)"
echo "Found node version '$node_version'"

# Extract the major version from the node version (remove the 'v' prefix)
actual_major_version=$(echo $node_version | sed -E 's/^v([0-9]+)\..*/\1/')
expected_major_version=$(echo $1 | sed -E 's/^([0-9]+)\..*/\1/') # Extract major version from argument

if [ "$actual_major_version" != "$expected_major_version" ]; then
  echo "Expected Node.js $expected_major_version.x.x but found $node_version"
  exit 1
fi

if [ -z "$2" ]; then
  echo "Testing npm install"
  mkdir -p test-npm-install
  cd test-npm-install
  npm init -y || exit 1
  npm install @actions/core || exit 1
else
  echo "Skip testing npm"
fi
