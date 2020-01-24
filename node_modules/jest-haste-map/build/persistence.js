'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
// Try to load SQLite persistence, but fall back to file persistence when SQLite
let chosenModule;

try {
  require.resolve('better-sqlite3');

  chosenModule = require('./persistence/sqlite').default;
} catch (_unused) {
  chosenModule = require('./persistence/file').default;
}

var _default = chosenModule;
exports.default = _default;
