#!/bin/sh

if [ -n "$1" ]; then
  architecture="$(node -e 'console.log(process.arch)')"
  if [ -z "$(echo $architecture | grep --fixed-strings $1)" ]; then
    echo "Unexpected architecture"
    exit 1
  fi
else
  echo "Skip testing architecture"
fi