'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.printReceivedConstructorNameNot = exports.printReceivedConstructorName = exports.printExpectedConstructorNameNot = exports.printExpectedConstructorName = exports.printDiffOrStringify = exports.printReceivedArrayContainExpectedItem = exports.printReceivedStringContainExpectedResult = exports.printReceivedStringContainExpectedSubstring = void 0;

var _jestGetType = _interopRequireWildcard(require('jest-get-type'));

var _jestMatcherUtils = require('jest-matcher-utils');

var _utils = require('./utils');

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};
    if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          var desc =
            Object.defineProperty && Object.getOwnPropertyDescriptor
              ? Object.getOwnPropertyDescriptor(obj, key)
              : {};
          if (desc.get || desc.set) {
            Object.defineProperty(newObj, key, desc);
          } else {
            newObj[key] = obj[key];
          }
        }
      }
    }
    newObj.default = obj;
    return newObj;
  }
}

/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// Format substring but do not enclose in double quote marks.
// The replacement is compatible with pretty-format package.
const printSubstring = val => val.replace(/"|\\/g, '\\$&');

const printReceivedStringContainExpectedSubstring = (received, start, length) =>
  (0, _jestMatcherUtils.RECEIVED_COLOR)(
    '"' +
      printSubstring(received.slice(0, start)) +
      (0, _jestMatcherUtils.INVERTED_COLOR)(
        printSubstring(received.slice(start, start + length))
      ) +
      printSubstring(received.slice(start + length)) +
      '"'
  );

exports.printReceivedStringContainExpectedSubstring = printReceivedStringContainExpectedSubstring;

const printReceivedStringContainExpectedResult = (received, result) =>
  result === null
    ? (0, _jestMatcherUtils.printReceived)(received)
    : printReceivedStringContainExpectedSubstring(
        received,
        result.index,
        result[0].length
      ); // The serialized array is compatible with pretty-format package min option.
// However, items have default stringify depth (instead of depth - 1)
// so expected item looks consistent by itself and enclosed in the array.

exports.printReceivedStringContainExpectedResult = printReceivedStringContainExpectedResult;

const printReceivedArrayContainExpectedItem = (received, index) =>
  (0, _jestMatcherUtils.RECEIVED_COLOR)(
    '[' +
      received
        .map((item, i) => {
          const stringified = (0, _jestMatcherUtils.stringify)(item);
          return i === index
            ? (0, _jestMatcherUtils.INVERTED_COLOR)(stringified)
            : stringified;
        })
        .join(', ') +
      ']'
  );

exports.printReceivedArrayContainExpectedItem = printReceivedArrayContainExpectedItem;

const shouldPrintDiff = (expected, received) => {
  const expectedType = (0, _jestGetType.default)(expected);
  const receivedType = (0, _jestGetType.default)(received);

  if (expectedType !== receivedType) {
    return false;
  }

  if ((0, _jestGetType.isPrimitive)(expected)) {
    // Print diff only if both strings have more than one line.
    return (
      expectedType === 'string' && !(0, _utils.isOneline)(expected, received)
    );
  }

  if (
    expectedType === 'date' ||
    expectedType === 'function' ||
    expectedType === 'regexp'
  ) {
    return false;
  }

  if (expected instanceof Error && received instanceof Error) {
    return false;
  }

  return true;
};

const printDiffOrStringify = (
  expected,
  received,
  expectedLabel,
  receivedLabel,
  expand
) => {
  // Cannot use same serialization as shortcut to avoid diff,
  // because stringify (that is, pretty-format with min option)
  // omits constructor name for array or object, too bad so sad :(
  const difference = shouldPrintDiff(expected, received)
    ? (0, _jestMatcherUtils.diff)(expected, received, {
        aAnnotation: expectedLabel,
        bAnnotation: receivedLabel,
        expand
      }) // string | null
    : null; // Cannot reuse value of stringify(received) in report string,
  // because printReceived does inverse highlight space at end of line,
  // but RECEIVED_COLOR does not (it refers to a plain chalk method).

  if (
    typeof difference === 'string' &&
    difference.includes('- ' + expectedLabel) &&
    difference.includes('+ ' + receivedLabel)
  ) {
    return difference;
  }

  const printLabel = (0, _jestMatcherUtils.getLabelPrinter)(
    expectedLabel,
    receivedLabel
  );
  return (
    `${printLabel(expectedLabel)}${(0, _jestMatcherUtils.printExpected)(
      expected
    )}\n` +
    `${printLabel(receivedLabel)}${
      (0, _jestMatcherUtils.stringify)(expected) ===
      (0, _jestMatcherUtils.stringify)(received)
        ? 'serializes to the same string'
        : (0, _jestMatcherUtils.printReceived)(received)
    }`
  );
};

exports.printDiffOrStringify = printDiffOrStringify;

const printExpectedConstructorName = (label, expected) =>
  printConstructorName(label, expected, false, true) + '\n';

exports.printExpectedConstructorName = printExpectedConstructorName;

const printExpectedConstructorNameNot = (label, expected) =>
  printConstructorName(label, expected, true, true) + '\n';

exports.printExpectedConstructorNameNot = printExpectedConstructorNameNot;

const printReceivedConstructorName = (label, received) =>
  printConstructorName(label, received, false, false) + '\n'; // Do not call function if received is equal to expected.

exports.printReceivedConstructorName = printReceivedConstructorName;

const printReceivedConstructorNameNot = (label, received, expected) =>
  typeof expected.name === 'string' &&
  expected.name.length !== 0 &&
  typeof received.name === 'string' &&
  received.name.length !== 0
    ? printConstructorName(label, received, true, false) +
      ` ${
        Object.getPrototypeOf(received) === expected
          ? 'extends'
          : 'extends … extends'
      } ${(0, _jestMatcherUtils.EXPECTED_COLOR)(expected.name)}` +
      '\n'
    : printConstructorName(label, received, false, false) + '\n';

exports.printReceivedConstructorNameNot = printReceivedConstructorNameNot;

const printConstructorName = (label, constructor, isNot, isExpected) =>
  typeof constructor.name !== 'string'
    ? `${label} name is not a string`
    : constructor.name.length === 0
    ? `${label} name is an empty string`
    : `${label}: ${!isNot ? '' : isExpected ? 'not ' : '    '}${
        isExpected
          ? (0, _jestMatcherUtils.EXPECTED_COLOR)(constructor.name)
          : (0, _jestMatcherUtils.RECEIVED_COLOR)(constructor.name)
      }`;
