'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getMaxWorkers;

function _os() {
  const data = _interopRequireDefault(require('os'));

  _os = function _os() {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
function getMaxWorkers(argv) {
  if (argv.runInBand) {
    return 1;
  } else if (argv.maxWorkers) {
    // TODO: How to type this properly? Should probably use `coerce` from `yargs`
    const maxWorkers = argv.maxWorkers;
    const parsed = parseInt(maxWorkers, 10);

    if (
      typeof maxWorkers === 'string' &&
      maxWorkers.trim().endsWith('%') &&
      parsed > 0 &&
      parsed <= 100
    ) {
      const cpus = _os().default.cpus().length;

      const workers = Math.floor((parsed / 100) * cpus);
      return workers >= 1 ? workers : 1;
    }

    return parsed > 0 ? parsed : 1;
  } else {
    // In watch mode, Jest should be unobtrusive and not use all available CPUs.
    const cpus = _os().default.cpus() ? _os().default.cpus().length : 1;
    return Math.max(argv.watch ? Math.floor(cpus / 2) : cpus - 1, 1);
  }
}
