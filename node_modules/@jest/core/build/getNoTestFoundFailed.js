'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getNoTestFoundFailed;

function _chalk() {
  const data = _interopRequireDefault(require('chalk'));

  _chalk = function _chalk() {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}

// Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
function getNoTestFoundFailed() {
  return (
    _chalk().default.bold('No failed test found.\n') +
    _chalk().default.dim('Press `f` to quit "only failed tests" mode.')
  );
}
