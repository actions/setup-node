'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;

function _jestSerializer() {
  const data = _interopRequireDefault(require('jest-serializer'));

  _jestSerializer = function _jestSerializer() {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}

class FilePersistence {
  write(cachePath, internalHasteMap) {
    _jestSerializer().default.writeFileSync(cachePath, internalHasteMap);
  }

  read(cachePath) {
    return _jestSerializer().default.readFileSync(cachePath);
  }

  getType() {
    return 'file';
  }
}

var _default = new FilePersistence();

exports.default = _default;
