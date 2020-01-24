'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = pluralize;

// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
function pluralize(word, count, ending) {
  return `${count} ${word}${count === 1 ? '' : ending}`;
}
