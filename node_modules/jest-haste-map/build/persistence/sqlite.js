'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;

function _v() {
  const data = _interopRequireDefault(require('v8'));

  _v = function _v() {
    return data;
  };

  return data;
}

function _fs() {
  const data = _interopRequireDefault(require('fs'));

  _fs = function _fs() {
    return data;
  };

  return data;
}

function _betterSqlite() {
  const data = _interopRequireDefault(require('better-sqlite3'));

  _betterSqlite = function _betterSqlite() {
    return data;
  };

  return data;
}

var _constants = _interopRequireDefault(require('../constants'));

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}

function _slicedToArray(arr, i) {
  return (
    _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest()
  );
}

function _nonIterableRest() {
  throw new TypeError('Invalid attempt to destructure non-iterable instance');
}

function _iterableToArrayLimit(arr, i) {
  var _arr = [];
  var _n = true;
  var _d = false;
  var _e = undefined;
  try {
    for (
      var _i = arr[Symbol.iterator](), _s;
      !(_n = (_s = _i.next()).done);
      _n = true
    ) {
      _arr.push(_s.value);
      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i['return'] != null) _i['return']();
    } finally {
      if (_d) throw _e;
    }
  }
  return _arr;
}

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

class SQLitePersistence {
  read(cachePath) {
    // Get database, throw if does not exist.
    const db = this.getDatabase(cachePath, true); // Create empty map to populate.

    const internalHasteMap = {
      files: new Map(),
      map: new Map(),
      mocks: new Map(),
      duplicates: new Map(),
      clocks: new Map()
    }; // Fetch files.

    const filesArr = db.prepare(`SELECT * FROM files`).all();
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (
        var _iterator = filesArr[Symbol.iterator](), _step;
        !(_iteratorNormalCompletion = (_step = _iterator.next()).done);
        _iteratorNormalCompletion = true
      ) {
        const file = _step.value;
        internalHasteMap.files.set(file.filePath, [
          file.id,
          file.mtime,
          file.size,
          file.visited,
          file.dependencies,
          file.sha1
        ]);
      } // Fetch map.
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return != null) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    const mapsArr = db.prepare(`SELECT * FROM map`).all();
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (
        var _iterator2 = mapsArr[Symbol.iterator](), _step2;
        !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done);
        _iteratorNormalCompletion2 = true
      ) {
        const map = _step2.value;
        const mapItem = {};

        if (map.genericPath !== null && map.genericType !== null) {
          mapItem[_constants.default.GENERIC_PLATFORM] = [
            map.genericPath,
            map.genericType
          ];
        }

        if (map.nativePath !== null && map.nativeType !== null) {
          mapItem[_constants.default.NATIVE_PLATFORM] = [
            map.nativePath,
            map.nativeType
          ];
        }

        if (map.iosPath !== null && map.iosType !== null) {
          mapItem[_constants.default.IOS_PLATFORM] = [map.iosPath, map.iosType];
        }

        if (map.androidPath !== null && map.androidType !== null) {
          mapItem[_constants.default.ANDROID_PLATFORM] = [
            map.androidPath,
            map.androidType
          ];
        }

        internalHasteMap.map.set(map.name, mapItem);
      } // Fetch mocks.
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    const mocksArr = db.prepare(`SELECT * FROM mocks`).all();
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (
        var _iterator3 = mocksArr[Symbol.iterator](), _step3;
        !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done);
        _iteratorNormalCompletion3 = true
      ) {
        const mock = _step3.value;
        internalHasteMap.mocks.set(mock.name, mock.filePath);
      } // Fetch duplicates.
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3.return != null) {
          _iterator3.return();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }

    const duplicatesArr = db.prepare(`SELECT * FROM duplicates`).all();
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
      for (
        var _iterator4 = duplicatesArr[Symbol.iterator](), _step4;
        !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done);
        _iteratorNormalCompletion4 = true
      ) {
        const duplicate = _step4.value;
        internalHasteMap.duplicates.set(
          name,
          _v().default.deserialize(new Buffer(duplicate.serialized))
        );
      } // Fetch clocks.
    } catch (err) {
      _didIteratorError4 = true;
      _iteratorError4 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion4 && _iterator4.return != null) {
          _iterator4.return();
        }
      } finally {
        if (_didIteratorError4) {
          throw _iteratorError4;
        }
      }
    }

    const clocksArr = db.prepare(`SELECT * FROM clocks`).all();
    var _iteratorNormalCompletion5 = true;
    var _didIteratorError5 = false;
    var _iteratorError5 = undefined;

    try {
      for (
        var _iterator5 = clocksArr[Symbol.iterator](), _step5;
        !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done);
        _iteratorNormalCompletion5 = true
      ) {
        const clock = _step5.value;
        internalHasteMap.clocks.set(clock.relativeRoot, clock.since);
      } // Close database connection,
    } catch (err) {
      _didIteratorError5 = true;
      _iteratorError5 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion5 && _iterator5.return != null) {
          _iterator5.return();
        }
      } finally {
        if (_didIteratorError5) {
          throw _iteratorError5;
        }
      }
    }

    db.close();
    return internalHasteMap;
  }

  write(cachePath, internalHasteMap, removedFiles, changedFiles) {
    const db = this.getDatabase(cachePath, false);
    db.transaction(() => {
      // Incrementally update files.
      const runFileStmt = (stmt, [filePath, file]) => {
        stmt.run(
          filePath,
          file[_constants.default.ID],
          file[_constants.default.MTIME],
          file[_constants.default.SIZE],
          file[_constants.default.VISITED],
          file[_constants.default.DEPENDENCIES],
          file[_constants.default.SHA1]
        );
      };

      if (changedFiles !== undefined) {
        const removeFileStmt = db.prepare(`DELETE FROM files WHERE filePath=?`);
        var _iteratorNormalCompletion6 = true;
        var _didIteratorError6 = false;
        var _iteratorError6 = undefined;

        try {
          for (
            var _iterator6 = removedFiles.keys()[Symbol.iterator](), _step6;
            !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done);
            _iteratorNormalCompletion6 = true
          ) {
            const filePath = _step6.value;
            removeFileStmt.run(filePath);
          }
        } catch (err) {
          _didIteratorError6 = true;
          _iteratorError6 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion6 && _iterator6.return != null) {
              _iterator6.return();
            }
          } finally {
            if (_didIteratorError6) {
              throw _iteratorError6;
            }
          }
        }

        const upsertFileStmt = db.prepare(
          `INSERT OR REPLACE INTO files (filePath, id, mtime, size, visited, dependencies, sha1) VALUES (?, ?, ?, ?, ?, ?, ?)`
        );
        var _iteratorNormalCompletion7 = true;
        var _didIteratorError7 = false;
        var _iteratorError7 = undefined;

        try {
          for (
            var _iterator7 = changedFiles[Symbol.iterator](), _step7;
            !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done);
            _iteratorNormalCompletion7 = true
          ) {
            const changedFile = _step7.value;
            runFileStmt(upsertFileStmt, changedFile);
          }
        } catch (err) {
          _didIteratorError7 = true;
          _iteratorError7 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion7 && _iterator7.return != null) {
              _iterator7.return();
            }
          } finally {
            if (_didIteratorError7) {
              throw _iteratorError7;
            }
          }
        }
      } else {
        db.exec('DELETE FROM files');
        const insertFileStmt = db.prepare(
          `INSERT INTO files (filePath, id, mtime, size, visited, dependencies, sha1) VALUES (?, ?, ?, ?, ?, ?, ?)`
        );
        var _iteratorNormalCompletion8 = true;
        var _didIteratorError8 = false;
        var _iteratorError8 = undefined;

        try {
          for (
            var _iterator8 = internalHasteMap.files[Symbol.iterator](), _step8;
            !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done);
            _iteratorNormalCompletion8 = true
          ) {
            const file = _step8.value;
            runFileStmt(insertFileStmt, file);
          }
        } catch (err) {
          _didIteratorError8 = true;
          _iteratorError8 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion8 && _iterator8.return != null) {
              _iterator8.return();
            }
          } finally {
            if (_didIteratorError8) {
              throw _iteratorError8;
            }
          }
        }
      } // Incrementally update map.

      const runMapStmt = (stmt, [name, mapItem]) => {
        stmt.run(
          name,
          mapItem[_constants.default.GENERIC_PLATFORM] || [null, null],
          mapItem[_constants.default.NATIVE_PLATFORM] || [null, null],
          mapItem[_constants.default.IOS_PLATFORM] || [null, null],
          mapItem[_constants.default.ANDROID_PLATFORM] || [null, null]
        );
      };

      if (changedFiles !== undefined) {
        const removeMapItemStmt = db.prepare(`DELETE FROM map WHERE name=?`);
        var _iteratorNormalCompletion9 = true;
        var _didIteratorError9 = false;
        var _iteratorError9 = undefined;

        try {
          for (
            var _iterator9 = removedFiles.values()[Symbol.iterator](), _step9;
            !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done);
            _iteratorNormalCompletion9 = true
          ) {
            const file = _step9.value;
            removeMapItemStmt.run(file[_constants.default.ID]);
          }
        } catch (err) {
          _didIteratorError9 = true;
          _iteratorError9 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion9 && _iterator9.return != null) {
              _iterator9.return();
            }
          } finally {
            if (_didIteratorError9) {
              throw _iteratorError9;
            }
          }
        }

        const upsertFileStmt = db.prepare(
          `INSERT OR REPLACE INTO map (name, genericPath, genericType, nativePath, nativeType) VALUES (?, ?, ?, ?, ?)`
        );
        var _iteratorNormalCompletion10 = true;
        var _didIteratorError10 = false;
        var _iteratorError10 = undefined;

        try {
          for (
            var _iterator10 = changedFiles.values()[Symbol.iterator](), _step10;
            !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next())
              .done);
            _iteratorNormalCompletion10 = true
          ) {
            const changedFile = _step10.value;

            if (changedFile[_constants.default.MODULE]) {
              const mapItem = internalHasteMap.map.get(
                changedFile[_constants.default.MODULE]
              );
              runMapStmt(upsertFileStmt, [
                changedFile[_constants.default.MODULE],
                mapItem
              ]);
            }
          }
        } catch (err) {
          _didIteratorError10 = true;
          _iteratorError10 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion10 && _iterator10.return != null) {
              _iterator10.return();
            }
          } finally {
            if (_didIteratorError10) {
              throw _iteratorError10;
            }
          }
        }
      } else {
        db.exec('DELETE FROM map');
        const insertMapItem = db.prepare(
          `INSERT INTO map (name, genericPath, genericType, nativePath, nativeType, iosPath, iosType, androidPath, androidType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        var _iteratorNormalCompletion11 = true;
        var _didIteratorError11 = false;
        var _iteratorError11 = undefined;

        try {
          for (
            var _iterator11 = internalHasteMap.map[Symbol.iterator](), _step11;
            !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next())
              .done);
            _iteratorNormalCompletion11 = true
          ) {
            const mapItem = _step11.value;
            runMapStmt(insertMapItem, mapItem);
          }
        } catch (err) {
          _didIteratorError11 = true;
          _iteratorError11 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion11 && _iterator11.return != null) {
              _iterator11.return();
            }
          } finally {
            if (_didIteratorError11) {
              throw _iteratorError11;
            }
          }
        }
      } // Replace mocks.

      db.exec('DELETE FROM mocks');
      const insertMock = db.prepare(
        `INSERT INTO mocks (name, filePath) VALUES (?, ?)`
      );
      var _iteratorNormalCompletion12 = true;
      var _didIteratorError12 = false;
      var _iteratorError12 = undefined;

      try {
        for (
          var _iterator12 = internalHasteMap.mocks[Symbol.iterator](), _step12;
          !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done);
          _iteratorNormalCompletion12 = true
        ) {
          const _step12$value = _slicedToArray(_step12.value, 2),
            name = _step12$value[0],
            filePath = _step12$value[1];

          insertMock.run(name, filePath);
        } // Incrementally update duplicates.
      } catch (err) {
        _didIteratorError12 = true;
        _iteratorError12 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion12 && _iterator12.return != null) {
            _iterator12.return();
          }
        } finally {
          if (_didIteratorError12) {
            throw _iteratorError12;
          }
        }
      }

      if (changedFiles === undefined) {
        const insertDuplicateStmt = db.prepare(
          `INSERT INTO duplicates (name, serialized) VALUES (?, ?)`
        );
        var _iteratorNormalCompletion13 = true;
        var _didIteratorError13 = false;
        var _iteratorError13 = undefined;

        try {
          for (
            var _iterator13 = internalHasteMap.duplicates[Symbol.iterator](),
              _step13;
            !(_iteratorNormalCompletion13 = (_step13 = _iterator13.next())
              .done);
            _iteratorNormalCompletion13 = true
          ) {
            const _step13$value = _slicedToArray(_step13.value, 2),
              name = _step13$value[0],
              duplicate = _step13$value[1];

            insertDuplicateStmt.run(name, _v().default.serialize(duplicate));
          }
        } catch (err) {
          _didIteratorError13 = true;
          _iteratorError13 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion13 && _iterator13.return != null) {
              _iterator13.return();
            }
          } finally {
            if (_didIteratorError13) {
              throw _iteratorError13;
            }
          }
        }
      } else if (removedFiles.size) {
        const upsertDuplicateStmt = db.prepare(
          `INSERT OR REPLACE INTO duplicates (name, serialized) VALUES (?, ?)`
        );
        const deleteDuplicateStmt = db.prepare(
          `DELETE FROM duplicates WHERE name=?`
        );
        var _iteratorNormalCompletion14 = true;
        var _didIteratorError14 = false;
        var _iteratorError14 = undefined;

        try {
          for (
            var _iterator14 = removedFiles.values()[Symbol.iterator](), _step14;
            !(_iteratorNormalCompletion14 = (_step14 = _iterator14.next())
              .done);
            _iteratorNormalCompletion14 = true
          ) {
            const file = _step14.value;
            const moduleID = file[_constants.default.ID];
            const duplicate = internalHasteMap.duplicates.get(moduleID);

            if (duplicate) {
              upsertDuplicateStmt.run(name, _v().default.serialize(duplicate));
            } else {
              deleteDuplicateStmt.run(name);
            }
          }
        } catch (err) {
          _didIteratorError14 = true;
          _iteratorError14 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion14 && _iterator14.return != null) {
              _iterator14.return();
            }
          } finally {
            if (_didIteratorError14) {
              throw _iteratorError14;
            }
          }
        }
      } // Replace clocks.

      db.exec('DELETE FROM clocks');
      const insertClock = db.prepare(
        `INSERT INTO clocks (relativeRoot, since) VALUES (?, ?)`
      );
      var _iteratorNormalCompletion15 = true;
      var _didIteratorError15 = false;
      var _iteratorError15 = undefined;

      try {
        for (
          var _iterator15 = internalHasteMap.clocks[Symbol.iterator](), _step15;
          !(_iteratorNormalCompletion15 = (_step15 = _iterator15.next()).done);
          _iteratorNormalCompletion15 = true
        ) {
          const _step15$value = _slicedToArray(_step15.value, 2),
            relativeRoot = _step15$value[0],
            since = _step15$value[1];

          insertClock.run(relativeRoot, since);
        }
      } catch (err) {
        _didIteratorError15 = true;
        _iteratorError15 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion15 && _iterator15.return != null) {
            _iterator15.return();
          }
        } finally {
          if (_didIteratorError15) {
            throw _iteratorError15;
          }
        }
      }
    })();
    db.close();
  }

  getDatabase(cachePath, mustExist) {
    const dbExists = _fs().default.existsSync(cachePath);

    if (dbExists === false && mustExist) {
      throw new Error(`Haste SQLite DB does not exist at ${cachePath}`);
    }

    const db = (0, _betterSqlite().default)(cachePath, {
      fileMustExist: dbExists
    });

    if (dbExists === false) {
      db.exec(`CREATE TABLE IF NOT EXISTS files(
        filePath text PRIMARY KEY,
        id text NOT NULL,
        mtime integer NOT NULL,
        size integer NOT NULL,
        visited integer NOT NULL,
        dependencies text NOT NULL,
        sha1 text
      );`);
      db.exec(`CREATE TABLE IF NOT EXISTS map(
        name text NOT NULL,
        genericPath text,
        genericType integer,
        nativePath text,
        nativeType integer,
        iosPath text,
        iosType integer,
        androidPath text,
        androidType integer
      );`);
      db.exec(`CREATE TABLE IF NOT EXISTS mocks(
        name text PRIMARY KEY,
        filePath text NOT NULL
      );`);
      db.exec(`CREATE TABLE IF NOT EXISTS duplicates(
        name text PRIMARY KEY,
        serialized text NOT NULL
      );`);
      db.exec(`CREATE TABLE IF NOT EXISTS clocks(
        relativeRoot text,
        since text
      );`);
    }

    return db;
  }

  getType() {
    return 'sqlite';
  }
}

var _default = new SQLitePersistence();

exports.default = _default;
