'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;

function _path() {
  const data = require('path');

  _path = function _path() {
    return data;
  };

  return data;
}

function _pEachSeries() {
  const data = _interopRequireDefault(require('p-each-series'));

  _pEachSeries = function _pEachSeries() {
    return data;
  };

  return data;
}

function _pirates() {
  const data = require('pirates');

  _pirates = function _pirates() {
    return data;
  };

  return data;
}

function _transform() {
  const data = require('@jest/transform');

  _transform = function _transform() {
    return data;
  };

  return data;
}

function _jestUtil() {
  const data = require('jest-util');

  _jestUtil = function _jestUtil() {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }
  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function() {
    var self = this,
      args = arguments;
    return new Promise(function(resolve, reject) {
      var gen = fn.apply(self, args);
      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, 'next', value);
      }
      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, 'throw', err);
      }
      _next(undefined);
    });
  };
}

var _default =
  /*#__PURE__*/
  (function() {
    var _ref = _asyncToGenerator(function*({
      allTests,
      globalConfig,
      moduleName
    }) {
      const globalModulePaths = new Set(
        allTests.map(test => test.context.config[moduleName])
      );

      if (globalConfig[moduleName]) {
        globalModulePaths.add(globalConfig[moduleName]);
      }

      if (globalModulePaths.size > 0) {
        yield (0, _pEachSeries().default)(
          Array.from(globalModulePaths),
          /*#__PURE__*/
          (function() {
            var _ref2 = _asyncToGenerator(function*(modulePath) {
              if (!modulePath) {
                return;
              }

              const correctConfig = allTests.find(
                t => t.context.config[moduleName] === modulePath
              );
              const projectConfig = correctConfig
                ? correctConfig.context.config // Fallback to first config
                : allTests[0].context.config;
              const transformer = new (_transform()).ScriptTransformer(
                projectConfig
              ); // Load the transformer to avoid a cycle where we need to load a
              // transformer in order to transform it in the require hooks

              transformer.preloadTransformer(modulePath);
              let transforming = false;
              const revertHook = (0, _pirates().addHook)(
                (code, filename) => {
                  try {
                    transforming = true;
                    return (
                      transformer.transformSource(filename, code, false).code ||
                      code
                    );
                  } finally {
                    transforming = false;
                  }
                },
                {
                  exts: [(0, _path().extname)(modulePath)],
                  ignoreNodeModules: false,
                  matcher: (...args) => {
                    if (transforming) {
                      // Don't transform any dependency required by the transformer itself
                      return false;
                    }

                    return transformer.shouldTransform(...args);
                  }
                }
              );
              const globalModule = (0, _jestUtil().interopRequireDefault)(
                require(modulePath)
              ).default;

              if (typeof globalModule !== 'function') {
                throw new TypeError(
                  `${moduleName} file must export a function at ${modulePath}`
                );
              }

              yield globalModule(globalConfig);
              revertHook();
            });

            return function(_x2) {
              return _ref2.apply(this, arguments);
            };
          })()
        );
      }

      return Promise.resolve();
    });

    return function(_x) {
      return _ref.apply(this, arguments);
    };
  })();

exports.default = _default;
