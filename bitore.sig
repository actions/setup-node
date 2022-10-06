Skip to content
teer
Pull requests
Issues
Marketplace
Explore
 
@zakwarlord7 
Your account has been flagged.
Because of that, your profile is hidden from the public. If you believe this is a mistake, contact support to have your account status reviewed.
actions
/
setup-node
Public
Code
Issues
25
Pull requests
11
Actions
Projects
Security
Insights
Print node, npm and yarn versions after installation (#368)
 main (#368)
@havenchyk
havenchyk committed 3 days ago 
1 parent c96ab56 commit c81d8ad96dab0a834a87f7a0300b154386f2e26a
Show file tree Hide file tree
Showing 4 changed files with 1,020 additions and 953 deletions.
Filter changed files
  15  
__tests__/installer.test.ts
@@ -249,6 +249,21 @@ describe('setup-node', () => {

    let expPath = path.join(toolPath, 'bin');

    expect(getExecOutputSpy).toHaveBeenCalledWith(
      'node',
      ['--version'],
      expect.anything()
    );
    expect(getExecOutputSpy).toHaveBeenCalledWith(
      'npm',
      ['--version'],
      expect.anything()
    );
    expect(getExecOutputSpy).toHaveBeenCalledWith(
      'yarn',
      ['--version'],
      expect.anything()
    );
    expect(dlSpy).toHaveBeenCalled();
    expect(exSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
  376  
dist/cache-save/index.js
@@ -60979,74 +60979,74 @@ exports.fromPromise = function (fn) {
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const core = __importStar(__nccwpck_require__(2186));
const cache = __importStar(__nccwpck_require__(7799));
const fs_1 = __importDefault(__nccwpck_require__(7147));
const constants_1 = __nccwpck_require__(9042);
const cache_utils_1 = __nccwpck_require__(1678);
// Catch and log any unhandled exceptions.  These exceptions can leak out of the uploadChunk method in
// @actions/toolkit when a failed upload closes the file descriptor causing any in-process reads to
// throw an uncaught exception.  Instead of failing this action, just warn.
process.on('uncaughtException', e => {
    const warningPrefix = '[warning]';
    core.info(`${warningPrefix}${e.message}`);
});
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const cacheLock = core.getInput('cache');
            yield cachePackages(cacheLock);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
exports.run = run;
const cachePackages = (packageManager) => __awaiter(void 0, void 0, void 0, function* () {
    const state = core.getState(constants_1.State.CacheMatchedKey);
    const primaryKey = core.getState(constants_1.State.CachePrimaryKey);
    const packageManagerInfo = yield cache_utils_1.getPackageManagerInfo(packageManager);
    if (!packageManagerInfo) {
        core.debug(`Caching for '${packageManager}' is not supported`);
        return;
    }
    const cachePath = yield cache_utils_1.getCacheDirectoryPath(packageManagerInfo, packageManager);
    if (!fs_1.default.existsSync(cachePath)) {
        throw new Error(`Cache folder path is retrieved for ${packageManager} but doesn't exist on disk: ${cachePath}`);
    }
    if (primaryKey === state) {
        core.info(`Cache hit occurred on the primary key ${primaryKey}, not saving cache.`);
        return;
    }
    const cacheId = yield cache.saveCache([cachePath], primaryKey);
    if (cacheId == -1) {
        return;
    }
    core.info(`Cache saved with the key: ${primaryKey}`);
});
run();

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const core = __importStar(__nccwpck_require__(2186));
const cache = __importStar(__nccwpck_require__(7799));
const fs_1 = __importDefault(__nccwpck_require__(7147));
const constants_1 = __nccwpck_require__(9042);
const cache_utils_1 = __nccwpck_require__(1678);
// Catch and log any unhandled exceptions.  These exceptions can leak out of the uploadChunk method in
// @actions/toolkit when a failed upload closes the file descriptor causing any in-process reads to
// throw an uncaught exception.  Instead of failing this action, just warn.
process.on('uncaughtException', e => {
    const warningPrefix = '[warning]';
    core.info(`${warningPrefix}${e.message}`);
});
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const cacheLock = core.getInput('cache');
            yield cachePackages(cacheLock);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
exports.run = run;
const cachePackages = (packageManager) => __awaiter(void 0, void 0, void 0, function* () {
    const state = core.getState(constants_1.State.CacheMatchedKey);
    const primaryKey = core.getState(constants_1.State.CachePrimaryKey);
    const packageManagerInfo = yield cache_utils_1.getPackageManagerInfo(packageManager);
    if (!packageManagerInfo) {
        core.debug(`Caching for '${packageManager}' is not supported`);
        return;
    }
    const cachePath = yield cache_utils_1.getCacheDirectoryPath(packageManagerInfo, packageManager);
    if (!fs_1.default.existsSync(cachePath)) {
        throw new Error(`Cache folder path is retrieved for ${packageManager} but doesn't exist on disk: ${cachePath}`);
    }
    if (primaryKey === state) {
        core.info(`Cache hit occurred on the primary key ${primaryKey}, not saving cache.`);
        return;
    }
    const cacheId = yield cache.saveCache([cachePath], primaryKey);
    if (cacheId == -1) {
        return;
    }
    core.info(`Cache saved with the key: ${primaryKey}`);
});
run();


/***/ }),
@@ -61055,109 +61055,109 @@ run();
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const core = __importStar(__nccwpck_require__(2186));
const exec = __importStar(__nccwpck_require__(1514));
const cache = __importStar(__nccwpck_require__(7799));
exports.supportedPackageManagers = {
    npm: {
        lockFilePatterns: ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock'],
        getCacheFolderCommand: 'npm config get cache'
    },
    pnpm: {
        lockFilePatterns: ['pnpm-lock.yaml'],
        getCacheFolderCommand: 'pnpm store path --silent'
    },
    yarn1: {
        lockFilePatterns: ['yarn.lock'],
        getCacheFolderCommand: 'yarn cache dir'
    },
    yarn2: {
        lockFilePatterns: ['yarn.lock'],
        getCacheFolderCommand: 'yarn config get cacheFolder'
    }
};
exports.getCommandOutput = (toolCommand) => __awaiter(void 0, void 0, void 0, function* () {
    let { stdout, stderr, exitCode } = yield exec.getExecOutput(toolCommand, undefined, { ignoreReturnCode: true });
    if (exitCode) {
        stderr = !stderr.trim()
            ? `The '${toolCommand}' command failed with exit code: ${exitCode}`
            : stderr;
        throw new Error(stderr);
    }
    return stdout.trim();
});
const getPackageManagerVersion = (packageManager, command) => __awaiter(void 0, void 0, void 0, function* () {
    const stdOut = yield exports.getCommandOutput(`${packageManager} ${command}`);
    if (!stdOut) {
        throw new Error(`Could not retrieve version of ${packageManager}`);
    }
    return stdOut;
});
exports.getPackageManagerInfo = (packageManager) => __awaiter(void 0, void 0, void 0, function* () {
    if (packageManager === 'npm') {
        return exports.supportedPackageManagers.npm;
    }
    else if (packageManager === 'pnpm') {
        return exports.supportedPackageManagers.pnpm;
    }
    else if (packageManager === 'yarn') {
        const yarnVersion = yield getPackageManagerVersion('yarn', '--version');
        core.debug(`Consumed yarn version is ${yarnVersion}`);
        if (yarnVersion.startsWith('1.')) {
            return exports.supportedPackageManagers.yarn1;
        }
        else {
            return exports.supportedPackageManagers.yarn2;
        }
    }
    else {
        return null;
    }
});
exports.getCacheDirectoryPath = (packageManagerInfo, packageManager) => __awaiter(void 0, void 0, void 0, function* () {
    const stdOut = yield exports.getCommandOutput(packageManagerInfo.getCacheFolderCommand);
    if (!stdOut) {
        throw new Error(`Could not get cache folder path for ${packageManager}`);
    }
    core.debug(`${packageManager} path is ${stdOut}`);
    return stdOut.trim();
});
function isGhes() {
    const ghUrl = new URL(process.env['GITHUB_SERVER_URL'] || 'https://github.com');
    return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
}
exports.isGhes = isGhes;
function isCacheFeatureAvailable() {
    if (!cache.isFeatureAvailable()) {
        if (isGhes()) {
            throw new Error('Cache action is only supported on GHES version >= 3.5. If you are on version >=3.5 Please check with GHES admin if Actions cache service is enabled or not.');
        }
        else {
            core.warning('The runner was not able to contact the cache service. Caching will be skipped');
        }
        return false;
    }
    return true;
}
exports.isCacheFeatureAvailable = isCacheFeatureAvailable;

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const core = __importStar(__nccwpck_require__(2186));
const exec = __importStar(__nccwpck_require__(1514));
const cache = __importStar(__nccwpck_require__(7799));
exports.supportedPackageManagers = {
    npm: {
        lockFilePatterns: ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock'],
        getCacheFolderCommand: 'npm config get cache'
    },
    pnpm: {
        lockFilePatterns: ['pnpm-lock.yaml'],
        getCacheFolderCommand: 'pnpm store path --silent'
    },
    yarn1: {
        lockFilePatterns: ['yarn.lock'],
        getCacheFolderCommand: 'yarn cache dir'
    },
    yarn2: {
        lockFilePatterns: ['yarn.lock'],
        getCacheFolderCommand: 'yarn config get cacheFolder'
    }
};
exports.getCommandOutput = (toolCommand) => __awaiter(void 0, void 0, void 0, function* () {
    let { stdout, stderr, exitCode } = yield exec.getExecOutput(toolCommand, undefined, { ignoreReturnCode: true });
    if (exitCode) {
        stderr = !stderr.trim()
            ? `The '${toolCommand}' command failed with exit code: ${exitCode}`
            : stderr;
        throw new Error(stderr);
    }
    return stdout.trim();
});
const getPackageManagerVersion = (packageManager, command) => __awaiter(void 0, void 0, void 0, function* () {
    const stdOut = yield exports.getCommandOutput(`${packageManager} ${command}`);
    if (!stdOut) {
        throw new Error(`Could not retrieve version of ${packageManager}`);
    }
    return stdOut;
});
exports.getPackageManagerInfo = (packageManager) => __awaiter(void 0, void 0, void 0, function* () {
    if (packageManager === 'npm') {
        return exports.supportedPackageManagers.npm;
    }
    else if (packageManager === 'pnpm') {
        return exports.supportedPackageManagers.pnpm;
    }
    else if (packageManager === 'yarn') {
        const yarnVersion = yield getPackageManagerVersion('yarn', '--version');
        core.debug(`Consumed yarn version is ${yarnVersion}`);
        if (yarnVersion.startsWith('1.')) {
            return exports.supportedPackageManagers.yarn1;
        }
        else {
            return exports.supportedPackageManagers.yarn2;
        }
    }
    else {
        return null;
    }
});
exports.getCacheDirectoryPath = (packageManagerInfo, packageManager) => __awaiter(void 0, void 0, void 0, function* () {
    const stdOut = yield exports.getCommandOutput(packageManagerInfo.getCacheFolderCommand);
    if (!stdOut) {
        throw new Error(`Could not get cache folder path for ${packageManager}`);
    }
    core.debug(`${packageManager} path is ${stdOut}`);
    return stdOut.trim();
});
function isGhes() {
    const ghUrl = new URL(process.env['GITHUB_SERVER_URL'] || 'https://github.com');
    return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
}
exports.isGhes = isGhes;
function isCacheFeatureAvailable() {
    if (!cache.isFeatureAvailable()) {
        if (isGhes()) {
            throw new Error('Cache action is only supported on GHES version >= 3.5. If you are on version >=3.5 Please check with GHES admin if Actions cache service is enabled or not.');
        }
        else {
            core.warning('The runner was not able to contact the cache service. Caching will be skipped');
        }
        return false;
    }
    return true;
}
exports.isCacheFeatureAvailable = isCacheFeatureAvailable;


/***/ }),
@@ -61166,23 +61166,23 @@ exports.isCacheFeatureAvailable = isCacheFeatureAvailable;
/***/ ((__unused_webpack_module, exports) => {

"use strict";
Object.defineProperty(exports, "__esModule", ({ value: true }));
var LockType;
(function (LockType) {
    LockType["Npm"] = "npm";
    LockType["Pnpm"] = "pnpm";
    LockType["Yarn"] = "yarn";
})(LockType = exports.LockType || (exports.LockType = {}));
var State;
(function (State) {
    State["CachePrimaryKey"] = "CACHE_KEY";
    State["CacheMatchedKey"] = "CACHE_RESULT";
})(State = exports.State || (exports.State = {}));
var Outputs;
(function (Outputs) {
    Outputs["CacheHit"] = "cache-hit";
})(Outputs = exports.Outputs || (exports.Outputs = {}));

Object.defineProperty(exports, "__esModule", ({ value: true }));
var LockType;
(function (LockType) {
    LockType["Npm"] = "npm";
    LockType["Pnpm"] = "pnpm";
    LockType["Yarn"] = "yarn";
})(LockType = exports.LockType || (exports.LockType = {}));
var State;
(function (State) {
    State["CachePrimaryKey"] = "CACHE_KEY";
    State["CacheMatchedKey"] = "CACHE_RESULT";
})(State = exports.State || (exports.State = {}));
var Outputs;
(function (Outputs) {
    Outputs["CacheHit"] = "cache-hit";
})(Outputs = exports.Outputs || (exports.Outputs = {}));


/***/ }),
 1,534  
dist/setup/index.js
@@ -72875,62 +72875,62 @@ function wrappy (fn, cb) {
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const fs = __importStar(__nccwpck_require__(7147));
const os = __importStar(__nccwpck_require__(2037));
const path = __importStar(__nccwpck_require__(1017));
const core = __importStar(__nccwpck_require__(2186));
const github = __importStar(__nccwpck_require__(5438));
function configAuthentication(registryUrl, alwaysAuth) {
    const npmrc = path.resolve(process.env['RUNNER_TEMP'] || process.cwd(), '.npmrc');
    if (!registryUrl.endsWith('/')) {
        registryUrl += '/';
    }
    writeRegistryToFile(registryUrl, npmrc, alwaysAuth);
}
exports.configAuthentication = configAuthentication;
function writeRegistryToFile(registryUrl, fileLocation, alwaysAuth) {
    let scope = core.getInput('scope');
    if (!scope && registryUrl.indexOf('npm.pkg.github.com') > -1) {
        scope = github.context.repo.owner;
    }
    if (scope && scope[0] != '@') {
        scope = '@' + scope;
    }
    if (scope) {
        scope = scope.toLowerCase();
    }
    core.debug(`Setting auth in ${fileLocation}`);
    let newContents = '';
    if (fs.existsSync(fileLocation)) {
        const curContents = fs.readFileSync(fileLocation, 'utf8');
        curContents.split(os.EOL).forEach((line) => {
            // Add current contents unless they are setting the registry
            if (!line.toLowerCase().startsWith('registry')) {
                newContents += line + os.EOL;
            }
        });
    }
    // Remove http: or https: from front of registry.
    const authString = registryUrl.replace(/(^\w+:|^)/, '') + ':_authToken=${NODE_AUTH_TOKEN}';
    const registryString = scope
        ? `${scope}:registry=${registryUrl}`
        : `registry=${registryUrl}`;
    const alwaysAuthString = `always-auth=${alwaysAuth}`;
    newContents += `${authString}${os.EOL}${registryString}${os.EOL}${alwaysAuthString}`;
    fs.writeFileSync(fileLocation, newContents);
    core.exportVariable('NPM_CONFIG_USERCONFIG', fileLocation);
    // Export empty node_auth_token if didn't exist so npm doesn't complain about not being able to find it
    core.exportVariable('NODE_AUTH_TOKEN', process.env.NODE_AUTH_TOKEN || 'XXXXX-XXXXX-XXXXX-XXXXX');
}

var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const fs = __importStar(__nccwpck_require__(7147));
const os = __importStar(__nccwpck_require__(2037));
const path = __importStar(__nccwpck_require__(1017));
const core = __importStar(__nccwpck_require__(2186));
const github = __importStar(__nccwpck_require__(5438));
function configAuthentication(registryUrl, alwaysAuth) {
    const npmrc = path.resolve(process.env['RUNNER_TEMP'] || process.cwd(), '.npmrc');
    if (!registryUrl.endsWith('/')) {
        registryUrl += '/';
    }
    writeRegistryToFile(registryUrl, npmrc, alwaysAuth);
}
exports.configAuthentication = configAuthentication;
function writeRegistryToFile(registryUrl, fileLocation, alwaysAuth) {
    let scope = core.getInput('scope');
    if (!scope && registryUrl.indexOf('npm.pkg.github.com') > -1) {
        scope = github.context.repo.owner;
    }
    if (scope && scope[0] != '@') {
        scope = '@' + scope;
    }
    if (scope) {
        scope = scope.toLowerCase();
    }
    core.debug(`Setting auth in ${fileLocation}`);
    let newContents = '';
    if (fs.existsSync(fileLocation)) {
        const curContents = fs.readFileSync(fileLocation, 'utf8');
        curContents.split(os.EOL).forEach((line) => {
            // Add current contents unless they are setting the registry
            if (!line.toLowerCase().startsWith('registry')) {
                newContents += line + os.EOL;
            }
        });
    }
    // Remove http: or https: from front of registry.
    const authString = registryUrl.replace(/(^\w+:|^)/, '') + ':_authToken=${NODE_AUTH_TOKEN}';
    const registryString = scope
        ? `${scope}:registry=${registryUrl}`
        : `registry=${registryUrl}`;
    const alwaysAuthString = `always-auth=${alwaysAuth}`;
    newContents += `${authString}${os.EOL}${registryString}${os.EOL}${alwaysAuthString}`;
    fs.writeFileSync(fileLocation, newContents);
    core.exportVariable('NPM_CONFIG_USERCONFIG', fileLocation);
    // Export empty node_auth_token if didn't exist so npm doesn't complain about not being able to find it
    core.exportVariable('NODE_AUTH_TOKEN', process.env.NODE_AUTH_TOKEN || 'XXXXX-XXXXX-XXXXX-XXXXX');
}


/***/ }),
@@ -72939,70 +72939,70 @@ function writeRegistryToFile(registryUrl, fileLocation, alwaysAuth) {
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const cache = __importStar(__nccwpck_require__(7799));
const core = __importStar(__nccwpck_require__(2186));
const glob = __importStar(__nccwpck_require__(8090));
const path_1 = __importDefault(__nccwpck_require__(1017));
const fs_1 = __importDefault(__nccwpck_require__(7147));
const constants_1 = __nccwpck_require__(9042);
const cache_utils_1 = __nccwpck_require__(1678);
exports.restoreCache = (packageManager, cacheDependencyPath) => __awaiter(void 0, void 0, void 0, function* () {
    const packageManagerInfo = yield cache_utils_1.getPackageManagerInfo(packageManager);
    if (!packageManagerInfo) {
        throw new Error(`Caching for '${packageManager}' is not supported`);
    }
    const platform = process.env.RUNNER_OS;
    const cachePath = yield cache_utils_1.getCacheDirectoryPath(packageManagerInfo, packageManager);
    const lockFilePath = cacheDependencyPath
        ? cacheDependencyPath
        : findLockFile(packageManagerInfo);
    const fileHash = yield glob.hashFiles(lockFilePath);
    if (!fileHash) {
        throw new Error('Some specified paths were not resolved, unable to cache dependencies.');
    }
    const primaryKey = `node-cache-${platform}-${packageManager}-${fileHash}`;
    core.debug(`primary key is ${primaryKey}`);
    core.saveState(constants_1.State.CachePrimaryKey, primaryKey);
    const cacheKey = yield cache.restoreCache([cachePath], primaryKey);
    core.setOutput('cache-hit', Boolean(cacheKey));
    if (!cacheKey) {
        core.info(`${packageManager} cache is not found`);
        return;
    }
    core.saveState(constants_1.State.CacheMatchedKey, cacheKey);
    core.info(`Cache restored from key: ${cacheKey}`);
});
const findLockFile = (packageManager) => {
    let lockFiles = packageManager.lockFilePatterns;
    const workspace = process.env.GITHUB_WORKSPACE;
    const rootContent = fs_1.default.readdirSync(workspace);
    const lockFile = lockFiles.find(item => rootContent.includes(item));
    if (!lockFile) {
        throw new Error(`Dependencies lock file is not found in ${workspace}. Supported file patterns: ${lockFiles.toString()}`);
    }
    return path_1.default.join(workspace, lockFile);
};

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const cache = __importStar(__nccwpck_require__(7799));
const core = __importStar(__nccwpck_require__(2186));
const glob = __importStar(__nccwpck_require__(8090));
const path_1 = __importDefault(__nccwpck_require__(1017));
const fs_1 = __importDefault(__nccwpck_require__(7147));
const constants_1 = __nccwpck_require__(9042);
const cache_utils_1 = __nccwpck_require__(1678);
exports.restoreCache = (packageManager, cacheDependencyPath) => __awaiter(void 0, void 0, void 0, function* () {
    const packageManagerInfo = yield cache_utils_1.getPackageManagerInfo(packageManager);
    if (!packageManagerInfo) {
        throw new Error(`Caching for '${packageManager}' is not supported`);
    }
    const platform = process.env.RUNNER_OS;
    const cachePath = yield cache_utils_1.getCacheDirectoryPath(packageManagerInfo, packageManager);
    const lockFilePath = cacheDependencyPath
        ? cacheDependencyPath
        : findLockFile(packageManagerInfo);
    const fileHash = yield glob.hashFiles(lockFilePath);
    if (!fileHash) {
        throw new Error('Some specified paths were not resolved, unable to cache dependencies.');
    }
    const primaryKey = `node-cache-${platform}-${packageManager}-${fileHash}`;
    core.debug(`primary key is ${primaryKey}`);
    core.saveState(constants_1.State.CachePrimaryKey, primaryKey);
    const cacheKey = yield cache.restoreCache([cachePath], primaryKey);
    core.setOutput('cache-hit', Boolean(cacheKey));
    if (!cacheKey) {
        core.info(`${packageManager} cache is not found`);
        return;
    }
    core.saveState(constants_1.State.CacheMatchedKey, cacheKey);
    core.info(`Cache restored from key: ${cacheKey}`);
});
const findLockFile = (packageManager) => {
    let lockFiles = packageManager.lockFilePatterns;
    const workspace = process.env.GITHUB_WORKSPACE;
    const rootContent = fs_1.default.readdirSync(workspace);
    const lockFile = lockFiles.find(item => rootContent.includes(item));
    if (!lockFile) {
        throw new Error(`Dependencies lock file is not found in ${workspace}. Supported file patterns: ${lockFiles.toString()}`);
    }
    return path_1.default.join(workspace, lockFile);
};


/***/ }),
@@ -73011,109 +73011,109 @@ const findLockFile = (packageManager) => {
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const core = __importStar(__nccwpck_require__(2186));
const exec = __importStar(__nccwpck_require__(1514));
const cache = __importStar(__nccwpck_require__(7799));
exports.supportedPackageManagers = {
    npm: {
        lockFilePatterns: ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock'],
        getCacheFolderCommand: 'npm config get cache'
    },
    pnpm: {
        lockFilePatterns: ['pnpm-lock.yaml'],
        getCacheFolderCommand: 'pnpm store path --silent'
    },
    yarn1: {
        lockFilePatterns: ['yarn.lock'],
        getCacheFolderCommand: 'yarn cache dir'
    },
    yarn2: {
        lockFilePatterns: ['yarn.lock'],
        getCacheFolderCommand: 'yarn config get cacheFolder'
    }
};
exports.getCommandOutput = (toolCommand) => __awaiter(void 0, void 0, void 0, function* () {
    let { stdout, stderr, exitCode } = yield exec.getExecOutput(toolCommand, undefined, { ignoreReturnCode: true });
    if (exitCode) {
        stderr = !stderr.trim()
            ? `The '${toolCommand}' command failed with exit code: ${exitCode}`
            : stderr;
        throw new Error(stderr);
    }
    return stdout.trim();
});
const getPackageManagerVersion = (packageManager, command) => __awaiter(void 0, void 0, void 0, function* () {
    const stdOut = yield exports.getCommandOutput(`${packageManager} ${command}`);
    if (!stdOut) {
        throw new Error(`Could not retrieve version of ${packageManager}`);
    }
    return stdOut;
});
exports.getPackageManagerInfo = (packageManager) => __awaiter(void 0, void 0, void 0, function* () {
    if (packageManager === 'npm') {
        return exports.supportedPackageManagers.npm;
    }
    else if (packageManager === 'pnpm') {
        return exports.supportedPackageManagers.pnpm;
    }
    else if (packageManager === 'yarn') {
        const yarnVersion = yield getPackageManagerVersion('yarn', '--version');
        core.debug(`Consumed yarn version is ${yarnVersion}`);
        if (yarnVersion.startsWith('1.')) {
            return exports.supportedPackageManagers.yarn1;
        }
        else {
            return exports.supportedPackageManagers.yarn2;
        }
    }
    else {
        return null;
    }
});
exports.getCacheDirectoryPath = (packageManagerInfo, packageManager) => __awaiter(void 0, void 0, void 0, function* () {
    const stdOut = yield exports.getCommandOutput(packageManagerInfo.getCacheFolderCommand);
    if (!stdOut) {
        throw new Error(`Could not get cache folder path for ${packageManager}`);
    }
    core.debug(`${packageManager} path is ${stdOut}`);
    return stdOut.trim();
});
function isGhes() {
    const ghUrl = new URL(process.env['GITHUB_SERVER_URL'] || 'https://github.com');
    return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
}
exports.isGhes = isGhes;
function isCacheFeatureAvailable() {
    if (!cache.isFeatureAvailable()) {
        if (isGhes()) {
            throw new Error('Cache action is only supported on GHES version >= 3.5. If you are on version >=3.5 Please check with GHES admin if Actions cache service is enabled or not.');
        }
        else {
            core.warning('The runner was not able to contact the cache service. Caching will be skipped');
        }
        return false;
    }
    return true;
}
exports.isCacheFeatureAvailable = isCacheFeatureAvailable;

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const core = __importStar(__nccwpck_require__(2186));
const exec = __importStar(__nccwpck_require__(1514));
const cache = __importStar(__nccwpck_require__(7799));
exports.supportedPackageManagers = {
    npm: {
        lockFilePatterns: ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock'],
        getCacheFolderCommand: 'npm config get cache'
    },
    pnpm: {
        lockFilePatterns: ['pnpm-lock.yaml'],
        getCacheFolderCommand: 'pnpm store path --silent'
    },
    yarn1: {
        lockFilePatterns: ['yarn.lock'],
        getCacheFolderCommand: 'yarn cache dir'
    },
    yarn2: {
        lockFilePatterns: ['yarn.lock'],
        getCacheFolderCommand: 'yarn config get cacheFolder'
    }
};
exports.getCommandOutput = (toolCommand) => __awaiter(void 0, void 0, void 0, function* () {
    let { stdout, stderr, exitCode } = yield exec.getExecOutput(toolCommand, undefined, { ignoreReturnCode: true });
    if (exitCode) {
        stderr = !stderr.trim()
            ? `The '${toolCommand}' command failed with exit code: ${exitCode}`
            : stderr;
        throw new Error(stderr);
    }
    return stdout.trim();
});
const getPackageManagerVersion = (packageManager, command) => __awaiter(void 0, void 0, void 0, function* () {
    const stdOut = yield exports.getCommandOutput(`${packageManager} ${command}`);
    if (!stdOut) {
        throw new Error(`Could not retrieve version of ${packageManager}`);
    }
    return stdOut;
});
exports.getPackageManagerInfo = (packageManager) => __awaiter(void 0, void 0, void 0, function* () {
    if (packageManager === 'npm') {
        return exports.supportedPackageManagers.npm;
    }
    else if (packageManager === 'pnpm') {
        return exports.supportedPackageManagers.pnpm;
    }
    else if (packageManager === 'yarn') {
        const yarnVersion = yield getPackageManagerVersion('yarn', '--version');
        core.debug(`Consumed yarn version is ${yarnVersion}`);
        if (yarnVersion.startsWith('1.')) {
            return exports.supportedPackageManagers.yarn1;
        }
        else {
            return exports.supportedPackageManagers.yarn2;
        }
    }
    else {
        return null;
    }
});
exports.getCacheDirectoryPath = (packageManagerInfo, packageManager) => __awaiter(void 0, void 0, void 0, function* () {
    const stdOut = yield exports.getCommandOutput(packageManagerInfo.getCacheFolderCommand);
    if (!stdOut) {
        throw new Error(`Could not get cache folder path for ${packageManager}`);
    }
    core.debug(`${packageManager} path is ${stdOut}`);
    return stdOut.trim();
});
function isGhes() {
    const ghUrl = new URL(process.env['GITHUB_SERVER_URL'] || 'https://github.com');
    return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
}
exports.isGhes = isGhes;
function isCacheFeatureAvailable() {
    if (!cache.isFeatureAvailable()) {
        if (isGhes()) {
            throw new Error('Cache action is only supported on GHES version >= 3.5. If you are on version >=3.5 Please check with GHES admin if Actions cache service is enabled or not.');
        }
        else {
            core.warning('The runner was not able to contact the cache service. Caching will be skipped');
        }
        return false;
    }
    return true;
}
exports.isCacheFeatureAvailable = isCacheFeatureAvailable;


/***/ }),
@@ -73122,23 +73122,23 @@ exports.isCacheFeatureAvailable = isCacheFeatureAvailable;
/***/ ((__unused_webpack_module, exports) => {

"use strict";
Object.defineProperty(exports, "__esModule", ({ value: true }));
var LockType;
(function (LockType) {
    LockType["Npm"] = "npm";
    LockType["Pnpm"] = "pnpm";
    LockType["Yarn"] = "yarn";
})(LockType = exports.LockType || (exports.LockType = {}));
var State;
(function (State) {
    State["CachePrimaryKey"] = "CACHE_KEY";
    State["CacheMatchedKey"] = "CACHE_RESULT";
})(State = exports.State || (exports.State = {}));
var Outputs;
(function (Outputs) {
    Outputs["CacheHit"] = "cache-hit";
})(Outputs = exports.Outputs || (exports.Outputs = {}));

Object.defineProperty(exports, "__esModule", ({ value: true }));
var LockType;
(function (LockType) {
    LockType["Npm"] = "npm";
    LockType["Pnpm"] = "pnpm";
    LockType["Yarn"] = "yarn";
})(LockType = exports.LockType || (exports.LockType = {}));
var State;
(function (State) {
    State["CachePrimaryKey"] = "CACHE_KEY";
    State["CacheMatchedKey"] = "CACHE_RESULT";
})(State = exports.State || (exports.State = {}));
var Outputs;
(function (Outputs) {
    Outputs["CacheHit"] = "cache-hit";
})(Outputs = exports.Outputs || (exports.Outputs = {}));


/***/ }),
@@ -73147,414 +73147,414 @@ var Outputs;
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const os = __nccwpck_require__(2037);
const assert = __importStar(__nccwpck_require__(9491));
const core = __importStar(__nccwpck_require__(2186));
const hc = __importStar(__nccwpck_require__(9925));
const io = __importStar(__nccwpck_require__(7436));
const tc = __importStar(__nccwpck_require__(7784));
const path = __importStar(__nccwpck_require__(1017));
const semver = __importStar(__nccwpck_require__(5911));
const fs = __nccwpck_require__(7147);
function getNode(versionSpec, stable, checkLatest, auth, arch = os.arch()) {
    return __awaiter(this, void 0, void 0, function* () {
        // Store manifest data to avoid multiple calls
        let manifest;
        let nodeVersions;
        let osPlat = os.platform();
        let osArch = translateArchToDistUrl(arch);
        if (isLtsAlias(versionSpec)) {
            core.info('Attempt to resolve LTS alias from manifest...');
            // No try-catch since it's not possible to resolve LTS alias without manifest
            manifest = yield getManifest(auth);
            versionSpec = resolveLtsAliasFromManifest(versionSpec, stable, manifest);
        }
        if (isLatestSyntax(versionSpec)) {
            nodeVersions = yield getVersionsFromDist();
            versionSpec = yield queryDistForMatch(versionSpec, arch, nodeVersions);
            core.info(`getting latest node version...`);
        }
        if (checkLatest) {
            core.info('Attempt to resolve the latest version from manifest...');
            const resolvedVersion = yield resolveVersionFromManifest(versionSpec, stable, auth, osArch, manifest);
            if (resolvedVersion) {
                versionSpec = resolvedVersion;
                core.info(`Resolved as '${versionSpec}'`);
            }
            else {
                core.info(`Failed to resolve version ${versionSpec} from manifest`);
            }
        }
        // check cache
        let toolPath;
        toolPath = tc.find('node', versionSpec, osArch);
        // If not found in cache, download
        if (toolPath) {
            core.info(`Found in cache @ ${toolPath}`);
        }
        else {
            core.info(`Attempting to download ${versionSpec}...`);
            let downloadPath = '';
            let info = null;
            //
            // Try download from internal distribution (popular versions only)
            //
            try {
                info = yield getInfoFromManifest(versionSpec, stable, auth, osArch, manifest);
                if (info) {
                    core.info(`Acquiring ${info.resolvedVersion} - ${info.arch} from ${info.downloadUrl}`);
                    downloadPath = yield tc.downloadTool(info.downloadUrl, undefined, auth);
                }
                else {
                    core.info('Not found in manifest.  Falling back to download directly from Node');
                }
            }
            catch (err) {
                // Rate limit?
                if (err instanceof tc.HTTPError &&
                    (err.httpStatusCode === 403 || err.httpStatusCode === 429)) {
                    core.info(`Received HTTP status code ${err.httpStatusCode}.  This usually indicates the rate limit has been exceeded`);
                }
                else {
                    core.info(err.message);
                }
                core.debug(err.stack);
                core.info('Falling back to download directly from Node');
            }
            //
            // Download from nodejs.org
            //
            if (!downloadPath) {
                info = yield getInfoFromDist(versionSpec, arch, nodeVersions);
                if (!info) {
                    throw new Error(`Unable to find Node version '${versionSpec}' for platform ${osPlat} and architecture ${osArch}.`);
                }
                core.info(`Acquiring ${info.resolvedVersion} - ${info.arch} from ${info.downloadUrl}`);
                try {
                    downloadPath = yield tc.downloadTool(info.downloadUrl);
                }
                catch (err) {
                    if (err instanceof tc.HTTPError && err.httpStatusCode == 404) {
                        return yield acquireNodeFromFallbackLocation(info.resolvedVersion, info.arch);
                    }
                    throw err;
                }
            }
            //
            // Extract
            //
            core.info('Extracting ...');
            let extPath;
            info = info || {}; // satisfy compiler, never null when reaches here
            if (osPlat == 'win32') {
                let _7zPath = path.join(__dirname, '../..', 'externals', '7zr.exe');
                extPath = yield tc.extract7z(downloadPath, undefined, _7zPath);
                // 7z extracts to folder matching file name
                let nestedPath = path.join(extPath, path.basename(info.fileName, '.7z'));
                if (fs.existsSync(nestedPath)) {
                    extPath = nestedPath;
                }
            }
            else {
                extPath = yield tc.extractTar(downloadPath, undefined, [
                    'xz',
                    '--strip',
                    '1'
                ]);
            }
            //
            // Install into the local tool cache - node extracts with a root folder that matches the fileName downloaded
            //
            core.info('Adding to the cache ...');
            toolPath = yield tc.cacheDir(extPath, 'node', info.resolvedVersion, info.arch);
            core.info('Done');
        }
        //
        // a tool installer initimately knows details about the layout of that tool
        // for example, node binary is in the bin folder after the extract on Mac/Linux.
        // layouts could change by version, by platform etc... but that's the tool installers job
        //
        if (osPlat != 'win32') {
            toolPath = path.join(toolPath, 'bin');
        }
        //
        // prepend the tools path. instructs the agent to prepend for future tasks
        core.addPath(toolPath);
    });
}
exports.getNode = getNode;
function isLtsAlias(versionSpec) {
    return versionSpec.startsWith('lts/');
}
function getManifest(auth) {
    core.debug('Getting manifest from actions/node-versions@main');
    return tc.getManifestFromRepo('actions', 'node-versions', auth, 'main');
}
function resolveLtsAliasFromManifest(versionSpec, stable, manifest) {
    var _a;
    const alias = (_a = versionSpec.split('lts/')[1]) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    if (!alias) {
        throw new Error(`Unable to parse LTS alias for Node version '${versionSpec}'`);
    }
    core.debug(`LTS alias '${alias}' for Node version '${versionSpec}'`);
    // Supported formats are `lts/<alias>`, `lts/*`, and `lts/-n`. Where asterisk means highest possible LTS and -n means the nth-highest.
    const n = Number(alias);
    const aliases = Object.fromEntries(manifest
        .filter(x => x.lts && x.stable === stable)
        .map(x => [x.lts.toLowerCase(), x])
        .reverse());
    const numbered = Object.values(aliases);
    const release = alias === '*'
        ? numbered[numbered.length - 1]
        : n < 0
            ? numbered[numbered.length - 1 + n]
            : aliases[alias];
    if (!release) {
        throw new Error(`Unable to find LTS release '${alias}' for Node version '${versionSpec}'.`);
    }
    core.debug(`Found LTS release '${release.version}' for Node version '${versionSpec}'`);
    return release.version.split('.')[0];
}
function getInfoFromManifest(versionSpec, stable, auth, osArch = translateArchToDistUrl(os.arch()), manifest) {
    return __awaiter(this, void 0, void 0, function* () {
        let info = null;
        if (!manifest) {
            core.debug('No manifest cached');
            manifest = yield getManifest(auth);
        }
        const rel = yield tc.findFromManifest(versionSpec, stable, manifest, osArch);
        if (rel && rel.files.length > 0) {
            info = {};
            info.resolvedVersion = rel.version;
            info.arch = rel.files[0].arch;
            info.downloadUrl = rel.files[0].download_url;
            info.fileName = rel.files[0].filename;
        }
        return info;
    });
}
function getInfoFromDist(versionSpec, arch = os.arch(), nodeVersions) {
    return __awaiter(this, void 0, void 0, function* () {
        let osPlat = os.platform();
        let osArch = translateArchToDistUrl(arch);
        let version = yield queryDistForMatch(versionSpec, arch, nodeVersions);
        if (!version) {
            return null;
        }
        //
        // Download - a tool installer intimately knows how to get the tool (and construct urls)
        //
        version = semver.clean(version) || '';
        let fileName = osPlat == 'win32'
            ? `node-v${version}-win-${osArch}`
            : `node-v${version}-${osPlat}-${osArch}`;
        let urlFileName = osPlat == 'win32' ? `${fileName}.7z` : `${fileName}.tar.gz`;
        let url = `https://nodejs.org/dist/v${version}/${urlFileName}`;
        return {
            downloadUrl: url,
            resolvedVersion: version,
            arch: arch,
            fileName: fileName
        };
    });
}
function resolveVersionFromManifest(versionSpec, stable, auth, osArch = translateArchToDistUrl(os.arch()), manifest) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const info = yield getInfoFromManifest(versionSpec, stable, auth, osArch, manifest);
            return info === null || info === void 0 ? void 0 : info.resolvedVersion;
        }
        catch (err) {
            core.info('Unable to resolve version from manifest...');
            core.debug(err.message);
        }
    });
}
// TODO - should we just export this from @actions/tool-cache? Lifted directly from there
function evaluateVersions(versions, versionSpec) {
    let version = '';
    core.debug(`evaluating ${versions.length} versions`);
    versions = versions.sort((a, b) => {
        if (semver.gt(a, b)) {
            return 1;
        }
        return -1;
    });
    for (let i = versions.length - 1; i >= 0; i--) {
        const potential = versions[i];
        const satisfied = semver.satisfies(potential, versionSpec);
        if (satisfied) {
            version = potential;
            break;
        }
    }
    if (version) {
        core.debug(`matched: ${version}`);
    }
    else {
        core.debug('match not found');
    }
    return version;
}
function queryDistForMatch(versionSpec, arch = os.arch(), nodeVersions) {
    return __awaiter(this, void 0, void 0, function* () {
        let osPlat = os.platform();
        let osArch = translateArchToDistUrl(arch);
        // node offers a json list of versions
        let dataFileName;
        switch (osPlat) {
            case 'linux':
                dataFileName = `linux-${osArch}`;
                break;
            case 'darwin':
                dataFileName = `osx-${osArch}-tar`;
                break;
            case 'win32':
                dataFileName = `win-${osArch}-exe`;
                break;
            default:
                throw new Error(`Unexpected OS '${osPlat}'`);
        }
        if (!nodeVersions) {
            core.debug('No dist manifest cached');
            nodeVersions = yield getVersionsFromDist();
        }
        let versions = [];
        if (isLatestSyntax(versionSpec)) {
            core.info(`getting latest node version...`);
            return nodeVersions[0].version;
        }
        nodeVersions.forEach((nodeVersion) => {
            // ensure this version supports your os and platform
            if (nodeVersion.files.indexOf(dataFileName) >= 0) {
                versions.push(nodeVersion.version);
            }
        });
        // get the latest version that matches the version spec
        let version = evaluateVersions(versions, versionSpec);
        return version;
    });
}
function getVersionsFromDist() {
    return __awaiter(this, void 0, void 0, function* () {
        let dataUrl = 'https://nodejs.org/dist/index.json';
        let httpClient = new hc.HttpClient('setup-node', [], {
            allowRetries: true,
            maxRetries: 3
        });
        let response = yield httpClient.getJson(dataUrl);
        return response.result || [];
    });
}
exports.getVersionsFromDist = getVersionsFromDist;
// For non LTS versions of Node, the files we need (for Windows) are sometimes located
// in a different folder than they normally are for other versions.
// Normally the format is similar to: https://nodejs.org/dist/v5.10.1/node-v5.10.1-win-x64.7z
// In this case, there will be two files located at:
//      /dist/v5.10.1/win-x64/node.exe
//      /dist/v5.10.1/win-x64/node.lib
// If this is not the structure, there may also be two files located at:
//      /dist/v0.12.18/node.exe
//      /dist/v0.12.18/node.lib
// This method attempts to download and cache the resources from these alternative locations.
// Note also that the files are normally zipped but in this case they are just an exe
// and lib file in a folder, not zipped.
function acquireNodeFromFallbackLocation(version, arch = os.arch()) {
    return __awaiter(this, void 0, void 0, function* () {
        let osPlat = os.platform();
        let osArch = translateArchToDistUrl(arch);
        // Create temporary folder to download in to
        const tempDownloadFolder = 'temp_' + Math.floor(Math.random() * 2000000000);
        const tempDirectory = process.env['RUNNER_TEMP'] || '';
        assert.ok(tempDirectory, 'Expected RUNNER_TEMP to be defined');
        const tempDir = path.join(tempDirectory, tempDownloadFolder);
        yield io.mkdirP(tempDir);
        let exeUrl;
        let libUrl;
        try {
            exeUrl = `https://nodejs.org/dist/v${version}/win-${osArch}/node.exe`;
            libUrl = `https://nodejs.org/dist/v${version}/win-${osArch}/node.lib`;
            core.info(`Downloading only node binary from ${exeUrl}`);
            const exePath = yield tc.downloadTool(exeUrl);
            yield io.cp(exePath, path.join(tempDir, 'node.exe'));
            const libPath = yield tc.downloadTool(libUrl);
            yield io.cp(libPath, path.join(tempDir, 'node.lib'));
        }
        catch (err) {
            if (err instanceof tc.HTTPError && err.httpStatusCode == 404) {
                exeUrl = `https://nodejs.org/dist/v${version}/node.exe`;
                libUrl = `https://nodejs.org/dist/v${version}/node.lib`;
                const exePath = yield tc.downloadTool(exeUrl);
                yield io.cp(exePath, path.join(tempDir, 'node.exe'));
                const libPath = yield tc.downloadTool(libUrl);
                yield io.cp(libPath, path.join(tempDir, 'node.lib'));
            }
            else {
                throw err;
            }
        }
        let toolPath = yield tc.cacheDir(tempDir, 'node', version, arch);
        core.addPath(toolPath);
        return toolPath;
    });
}
// os.arch does not always match the relative download url, e.g.
// os.arch == 'arm' != node-v12.13.1-linux-armv7l.tar.gz
// All other currently supported architectures match, e.g.:
//   os.arch = arm64 => https://nodejs.org/dist/v{VERSION}/node-v{VERSION}-{OS}-arm64.tar.gz
//   os.arch = x64 => https://nodejs.org/dist/v{VERSION}/node-v{VERSION}-{OS}-x64.tar.gz
function translateArchToDistUrl(arch) {
    switch (arch) {
        case 'arm':
            return 'armv7l';
        default:
            return arch;
    }
}
function parseNodeVersionFile(contents) {
    var _a, _b, _c;
    let nodeVersion;
    // Try parsing the file as an NPM `package.json` file.
    try {
        nodeVersion = (_a = JSON.parse(contents).volta) === null || _a === void 0 ? void 0 : _a.node;
        if (!nodeVersion)
            nodeVersion = (_b = JSON.parse(contents).engines) === null || _b === void 0 ? void 0 : _b.node;
    }
    catch (_d) {
        core.info('Node version file is not JSON file');
    }
    if (!nodeVersion) {
        const found = contents.match(/^(?:nodejs\s+)?v?(?<version>[^\s]+)$/m);
        nodeVersion = (_c = found === null || found === void 0 ? void 0 : found.groups) === null || _c === void 0 ? void 0 : _c.version;
    }
    // In the case of an unknown format,
    // return as is and evaluate the version separately.
    if (!nodeVersion)
        nodeVersion = contents.trim();
    return nodeVersion;
}
exports.parseNodeVersionFile = parseNodeVersionFile;
function isLatestSyntax(versionSpec) {
    return ['current', 'latest', 'node'].includes(versionSpec);
}

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const os = __nccwpck_require__(2037);
const assert = __importStar(__nccwpck_require__(9491));
const core = __importStar(__nccwpck_require__(2186));
const hc = __importStar(__nccwpck_require__(9925));
const io = __importStar(__nccwpck_require__(7436));
const tc = __importStar(__nccwpck_require__(7784));
const path = __importStar(__nccwpck_require__(1017));
const semver = __importStar(__nccwpck_require__(5911));
const fs = __nccwpck_require__(7147);
function getNode(versionSpec, stable, checkLatest, auth, arch = os.arch()) {
    return __awaiter(this, void 0, void 0, function* () {
        // Store manifest data to avoid multiple calls
        let manifest;
        let nodeVersions;
        let osPlat = os.platform();
        let osArch = translateArchToDistUrl(arch);
        if (isLtsAlias(versionSpec)) {
            core.info('Attempt to resolve LTS alias from manifest...');
            // No try-catch since it's not possible to resolve LTS alias without manifest
            manifest = yield getManifest(auth);
            versionSpec = resolveLtsAliasFromManifest(versionSpec, stable, manifest);
        }
        if (isLatestSyntax(versionSpec)) {
            nodeVersions = yield getVersionsFromDist();
            versionSpec = yield queryDistForMatch(versionSpec, arch, nodeVersions);
            core.info(`getting latest node version...`);
        }
        if (checkLatest) {
            core.info('Attempt to resolve the latest version from manifest...');
            const resolvedVersion = yield resolveVersionFromManifest(versionSpec, stable, auth, osArch, manifest);
            if (resolvedVersion) {
                versionSpec = resolvedVersion;
                core.info(`Resolved as '${versionSpec}'`);
            }
            else {
                core.info(`Failed to resolve version ${versionSpec} from manifest`);
            }
        }
        // check cache
        let toolPath;
        toolPath = tc.find('node', versionSpec, osArch);
        // If not found in cache, download
        if (toolPath) {
            core.info(`Found in cache @ ${toolPath}`);
        }
        else {
            core.info(`Attempting to download ${versionSpec}...`);
            let downloadPath = '';
            let info = null;
            //
            // Try download from internal distribution (popular versions only)
            //
            try {
                info = yield getInfoFromManifest(versionSpec, stable, auth, osArch, manifest);
                if (info) {
                    core.info(`Acquiring ${info.resolvedVersion} - ${info.arch} from ${info.downloadUrl}`);
                    downloadPath = yield tc.downloadTool(info.downloadUrl, undefined, auth);
                }
                else {
                    core.info('Not found in manifest.  Falling back to download directly from Node');
                }
            }
            catch (err) {
                // Rate limit?
                if (err instanceof tc.HTTPError &&
                    (err.httpStatusCode === 403 || err.httpStatusCode === 429)) {
                    core.info(`Received HTTP status code ${err.httpStatusCode}.  This usually indicates the rate limit has been exceeded`);
                }
                else {
                    core.info(err.message);
                }
                core.debug(err.stack);
                core.info('Falling back to download directly from Node');
            }
            //
            // Download from nodejs.org
            //
            if (!downloadPath) {
                info = yield getInfoFromDist(versionSpec, arch, nodeVersions);
                if (!info) {
                    throw new Error(`Unable to find Node version '${versionSpec}' for platform ${osPlat} and architecture ${osArch}.`);
                }
                core.info(`Acquiring ${info.resolvedVersion} - ${info.arch} from ${info.downloadUrl}`);
                try {
                    downloadPath = yield tc.downloadTool(info.downloadUrl);
                }
                catch (err) {
                    if (err instanceof tc.HTTPError && err.httpStatusCode == 404) {
                        return yield acquireNodeFromFallbackLocation(info.resolvedVersion, info.arch);
                    }
                    throw err;
                }
            }
            //
            // Extract
            //
            core.info('Extracting ...');
            let extPath;
            info = info || {}; // satisfy compiler, never null when reaches here
            if (osPlat == 'win32') {
                let _7zPath = path.join(__dirname, '../..', 'externals', '7zr.exe');
                extPath = yield tc.extract7z(downloadPath, undefined, _7zPath);
                // 7z extracts to folder matching file name
                let nestedPath = path.join(extPath, path.basename(info.fileName, '.7z'));
                if (fs.existsSync(nestedPath)) {
                    extPath = nestedPath;
                }
            }
            else {
                extPath = yield tc.extractTar(downloadPath, undefined, [
                    'xz',
                    '--strip',
                    '1'
                ]);
            }
            //
            // Install into the local tool cache - node extracts with a root folder that matches the fileName downloaded
            //
            core.info('Adding to the cache ...');
            toolPath = yield tc.cacheDir(extPath, 'node', info.resolvedVersion, info.arch);
            core.info('Done');
        }
        //
        // a tool installer initimately knows details about the layout of that tool
        // for example, node binary is in the bin folder after the extract on Mac/Linux.
        // layouts could change by version, by platform etc... but that's the tool installers job
        //
        if (osPlat != 'win32') {
            toolPath = path.join(toolPath, 'bin');
        }
        //
        // prepend the tools path. instructs the agent to prepend for future tasks
        core.addPath(toolPath);
    });
}
exports.getNode = getNode;
function isLtsAlias(versionSpec) {
    return versionSpec.startsWith('lts/');
}
function getManifest(auth) {
    core.debug('Getting manifest from actions/node-versions@main');
    return tc.getManifestFromRepo('actions', 'node-versions', auth, 'main');
}
function resolveLtsAliasFromManifest(versionSpec, stable, manifest) {
    var _a;
    const alias = (_a = versionSpec.split('lts/')[1]) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    if (!alias) {
        throw new Error(`Unable to parse LTS alias for Node version '${versionSpec}'`);
    }
    core.debug(`LTS alias '${alias}' for Node version '${versionSpec}'`);
    // Supported formats are `lts/<alias>`, `lts/*`, and `lts/-n`. Where asterisk means highest possible LTS and -n means the nth-highest.
    const n = Number(alias);
    const aliases = Object.fromEntries(manifest
        .filter(x => x.lts && x.stable === stable)
        .map(x => [x.lts.toLowerCase(), x])
        .reverse());
    const numbered = Object.values(aliases);
    const release = alias === '*'
        ? numbered[numbered.length - 1]
        : n < 0
            ? numbered[numbered.length - 1 + n]
            : aliases[alias];
    if (!release) {
        throw new Error(`Unable to find LTS release '${alias}' for Node version '${versionSpec}'.`);
    }
    core.debug(`Found LTS release '${release.version}' for Node version '${versionSpec}'`);
    return release.version.split('.')[0];
}
function getInfoFromManifest(versionSpec, stable, auth, osArch = translateArchToDistUrl(os.arch()), manifest) {
    return __awaiter(this, void 0, void 0, function* () {
        let info = null;
        if (!manifest) {
            core.debug('No manifest cached');
            manifest = yield getManifest(auth);
        }
        const rel = yield tc.findFromManifest(versionSpec, stable, manifest, osArch);
        if (rel && rel.files.length > 0) {
            info = {};
            info.resolvedVersion = rel.version;
            info.arch = rel.files[0].arch;
            info.downloadUrl = rel.files[0].download_url;
            info.fileName = rel.files[0].filename;
        }
        return info;
    });
}
function getInfoFromDist(versionSpec, arch = os.arch(), nodeVersions) {
    return __awaiter(this, void 0, void 0, function* () {
        let osPlat = os.platform();
        let osArch = translateArchToDistUrl(arch);
        let version = yield queryDistForMatch(versionSpec, arch, nodeVersions);
        if (!version) {
            return null;
        }
        //
        // Download - a tool installer intimately knows how to get the tool (and construct urls)
        //
        version = semver.clean(version) || '';
        let fileName = osPlat == 'win32'
            ? `node-v${version}-win-${osArch}`
            : `node-v${version}-${osPlat}-${osArch}`;
        let urlFileName = osPlat == 'win32' ? `${fileName}.7z` : `${fileName}.tar.gz`;
        let url = `https://nodejs.org/dist/v${version}/${urlFileName}`;
        return {
            downloadUrl: url,
            resolvedVersion: version,
            arch: arch,
            fileName: fileName
        };
    });
}
function resolveVersionFromManifest(versionSpec, stable, auth, osArch = translateArchToDistUrl(os.arch()), manifest) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const info = yield getInfoFromManifest(versionSpec, stable, auth, osArch, manifest);
            return info === null || info === void 0 ? void 0 : info.resolvedVersion;
        }
        catch (err) {
            core.info('Unable to resolve version from manifest...');
            core.debug(err.message);
        }
    });
}
// TODO - should we just export this from @actions/tool-cache? Lifted directly from there
function evaluateVersions(versions, versionSpec) {
    let version = '';
    core.debug(`evaluating ${versions.length} versions`);
    versions = versions.sort((a, b) => {
        if (semver.gt(a, b)) {
            return 1;
        }
        return -1;
    });
    for (let i = versions.length - 1; i >= 0; i--) {
        const potential = versions[i];
        const satisfied = semver.satisfies(potential, versionSpec);
        if (satisfied) {
            version = potential;
            break;
        }
    }
    if (version) {
        core.debug(`matched: ${version}`);
    }
    else {
        core.debug('match not found');
    }
    return version;
}
function queryDistForMatch(versionSpec, arch = os.arch(), nodeVersions) {
    return __awaiter(this, void 0, void 0, function* () {
        let osPlat = os.platform();
        let osArch = translateArchToDistUrl(arch);
        // node offers a json list of versions
        let dataFileName;
        switch (osPlat) {
            case 'linux':
                dataFileName = `linux-${osArch}`;
                break;
            case 'darwin':
                dataFileName = `osx-${osArch}-tar`;
                break;
            case 'win32':
                dataFileName = `win-${osArch}-exe`;
                break;
            default:
                throw new Error(`Unexpected OS '${osPlat}'`);
        }
        if (!nodeVersions) {
            core.debug('No dist manifest cached');
            nodeVersions = yield getVersionsFromDist();
        }
        let versions = [];
        if (isLatestSyntax(versionSpec)) {
            core.info(`getting latest node version...`);
            return nodeVersions[0].version;
        }
        nodeVersions.forEach((nodeVersion) => {
            // ensure this version supports your os and platform
            if (nodeVersion.files.indexOf(dataFileName) >= 0) {
                versions.push(nodeVersion.version);
            }
        });
        // get the latest version that matches the version spec
        let version = evaluateVersions(versions, versionSpec);
        return version;
    });
}
function getVersionsFromDist() {
    return __awaiter(this, void 0, void 0, function* () {
        let dataUrl = 'https://nodejs.org/dist/index.json';
        let httpClient = new hc.HttpClient('setup-node', [], {
            allowRetries: true,
            maxRetries: 3
        });
        let response = yield httpClient.getJson(dataUrl);
        return response.result || [];
    });
}
exports.getVersionsFromDist = getVersionsFromDist;
// For non LTS versions of Node, the files we need (for Windows) are sometimes located
// in a different folder than they normally are for other versions.
// Normally the format is similar to: https://nodejs.org/dist/v5.10.1/node-v5.10.1-win-x64.7z
// In this case, there will be two files located at:
//      /dist/v5.10.1/win-x64/node.exe
//      /dist/v5.10.1/win-x64/node.lib
// If this is not the structure, there may also be two files located at:
//      /dist/v0.12.18/node.exe
//      /dist/v0.12.18/node.lib
// This method attempts to download and cache the resources from these alternative locations.
// Note also that the files are normally zipped but in this case they are just an exe
// and lib file in a folder, not zipped.
function acquireNodeFromFallbackLocation(version, arch = os.arch()) {
    return __awaiter(this, void 0, void 0, function* () {
        let osPlat = os.platform();
        let osArch = translateArchToDistUrl(arch);
        // Create temporary folder to download in to
        const tempDownloadFolder = 'temp_' + Math.floor(Math.random() * 2000000000);
        const tempDirectory = process.env['RUNNER_TEMP'] || '';
        assert.ok(tempDirectory, 'Expected RUNNER_TEMP to be defined');
        const tempDir = path.join(tempDirectory, tempDownloadFolder);
        yield io.mkdirP(tempDir);
        let exeUrl;
        let libUrl;
        try {
            exeUrl = `https://nodejs.org/dist/v${version}/win-${osArch}/node.exe`;
            libUrl = `https://nodejs.org/dist/v${version}/win-${osArch}/node.lib`;
            core.info(`Downloading only node binary from ${exeUrl}`);
            const exePath = yield tc.downloadTool(exeUrl);
            yield io.cp(exePath, path.join(tempDir, 'node.exe'));
            const libPath = yield tc.downloadTool(libUrl);
            yield io.cp(libPath, path.join(tempDir, 'node.lib'));
        }
        catch (err) {
            if (err instanceof tc.HTTPError && err.httpStatusCode == 404) {
                exeUrl = `https://nodejs.org/dist/v${version}/node.exe`;
                libUrl = `https://nodejs.org/dist/v${version}/node.lib`;
                const exePath = yield tc.downloadTool(exeUrl);
                yield io.cp(exePath, path.join(tempDir, 'node.exe'));
                const libPath = yield tc.downloadTool(libUrl);
                yield io.cp(libPath, path.join(tempDir, 'node.lib'));
            }
            else {
                throw err;
            }
        }
        let toolPath = yield tc.cacheDir(tempDir, 'node', version, arch);
        core.addPath(toolPath);
        return toolPath;
    });
}
// os.arch does not always match the relative download url, e.g.
// os.arch == 'arm' != node-v12.13.1-linux-armv7l.tar.gz
// All other currently supported architectures match, e.g.:
//   os.arch = arm64 => https://nodejs.org/dist/v{VERSION}/node-v{VERSION}-{OS}-arm64.tar.gz
//   os.arch = x64 => https://nodejs.org/dist/v{VERSION}/node-v{VERSION}-{OS}-x64.tar.gz
function translateArchToDistUrl(arch) {
    switch (arch) {
        case 'arm':
            return 'armv7l';
        default:
            return arch;
    }
}
function parseNodeVersionFile(contents) {
    var _a, _b, _c;
    let nodeVersion;
    // Try parsing the file as an NPM `package.json` file.
    try {
        nodeVersion = (_a = JSON.parse(contents).volta) === null || _a === void 0 ? void 0 : _a.node;
        if (!nodeVersion)
            nodeVersion = (_b = JSON.parse(contents).engines) === null || _b === void 0 ? void 0 : _b.node;
    }
    catch (_d) {
        core.info('Node version file is not JSON file');
    }
    if (!nodeVersion) {
        const found = contents.match(/^(?:nodejs\s+)?v?(?<version>[^\s]+)$/m);
        nodeVersion = (_c = found === null || found === void 0 ? void 0 : found.groups) === null || _c === void 0 ? void 0 : _c.version;
    }
    // In the case of an unknown format,
    // return as is and evaluate the version separately.
    if (!nodeVersion)
        nodeVersion = contents.trim();
    return nodeVersion;
}
exports.parseNodeVersionFile = parseNodeVersionFile;
function isLatestSyntax(versionSpec) {
    return ['current', 'latest', 'node'].includes(versionSpec);
}


/***/ }),
@@ -73563,108 +73563,134 @@ function isLatestSyntax(versionSpec) {
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const core = __importStar(__nccwpck_require__(2186));
const exec = __importStar(__nccwpck_require__(1514));
const installer = __importStar(__nccwpck_require__(2574));
const fs_1 = __importDefault(__nccwpck_require__(7147));
const auth = __importStar(__nccwpck_require__(7573));
const path = __importStar(__nccwpck_require__(1017));
const cache_restore_1 = __nccwpck_require__(9517);
const cache_utils_1 = __nccwpck_require__(1678);
const os = __nccwpck_require__(2037);
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //
            // Version is optional.  If supplied, install / use from the tool cache
            // If not supplied then task is still used to setup proxy, auth, etc...
            //
            let version = resolveVersionInput();
            let arch = core.getInput('architecture');
            const cache = core.getInput('cache');
            // if architecture supplied but node-version is not
            // if we don't throw a warning, the already installed x64 node will be used which is not probably what user meant.
            if (arch && !version) {
                core.warning('`architecture` is provided but `node-version` is missing. In this configuration, the version/architecture of Node will not be changed. To fix this, provide `architecture` in combination with `node-version`');
            }
            if (!arch) {
                arch = os.arch();
            }
            if (version) {
                let token = core.getInput('token');
                let auth = !token || cache_utils_1.isGhes() ? undefined : `token ${token}`;
                let stable = (core.getInput('stable') || 'true').toUpperCase() === 'TRUE';
                const checkLatest = (core.getInput('check-latest') || 'false').toUpperCase() === 'TRUE';
                yield installer.getNode(version, stable, checkLatest, auth, arch);
            }
            // Output version of node is being used
            try {
                const { stdout: installedVersion } = yield exec.getExecOutput('node', ['--version'], { ignoreReturnCode: true, silent: true });
                core.setOutput('node-version', installedVersion.trim());
            }
            catch (err) {
                core.setOutput('node-version', '');
            }
            const registryUrl = core.getInput('registry-url');
            const alwaysAuth = core.getInput('always-auth');
            if (registryUrl) {
                auth.configAuthentication(registryUrl, alwaysAuth);
            }
            if (cache && cache_utils_1.isCacheFeatureAvailable()) {
                const cacheDependencyPath = core.getInput('cache-dependency-path');
                yield cache_restore_1.restoreCache(cache, cacheDependencyPath);
            }
            const matchersPath = path.join(__dirname, '../..', '.github');
            core.info(`##[add-matcher]${path.join(matchersPath, 'tsc.json')}`);
            core.info(`##[add-matcher]${path.join(matchersPath, 'eslint-stylish.json')}`);
            core.info(`##[add-matcher]${path.join(matchersPath, 'eslint-compact.json')}`);
        }
        catch (err) {
            core.setFailed(err.message);
        }
    });
}
exports.run = run;
function resolveVersionInput() {
    let version = core.getInput('node-version');
    const versionFileInput = core.getInput('node-version-file');
    if (version && versionFileInput) {
        core.warning('Both node-version and node-version-file inputs are specified, only node-version will be used');
    }
    if (version) {
        return version;
    }
    if (versionFileInput) {
        const versionFilePath = path.join(process.env.GITHUB_WORKSPACE, versionFileInput);
        if (!fs_1.default.existsSync(versionFilePath)) {
            throw new Error(`The specified node version file at: ${versionFilePath} does not exist`);
        }
        version = installer.parseNodeVersionFile(fs_1.default.readFileSync(versionFilePath, 'utf8'));
        core.info(`Resolved ${versionFileInput} as ${version}`);
    }
    return version;
}

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const core = __importStar(__nccwpck_require__(2186));
const exec = __importStar(__nccwpck_require__(1514));
const installer = __importStar(__nccwpck_require__(2574));
const fs_1 = __importDefault(__nccwpck_require__(7147));
const auth = __importStar(__nccwpck_require__(7573));
const path = __importStar(__nccwpck_require__(1017));
const cache_restore_1 = __nccwpck_require__(9517);
const cache_utils_1 = __nccwpck_require__(1678);
const os = __nccwpck_require__(2037);
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //
            // Version is optional.  If supplied, install / use from the tool cache
            // If not supplied then task is still used to setup proxy, auth, etc...
            //
            let version = resolveVersionInput();
            let arch = core.getInput('architecture');
            const cache = core.getInput('cache');
            // if architecture supplied but node-version is not
            // if we don't throw a warning, the already installed x64 node will be used which is not probably what user meant.
            if (arch && !version) {
                core.warning('`architecture` is provided but `node-version` is missing. In this configuration, the version/architecture of Node will not be changed. To fix this, provide `architecture` in combination with `node-version`');
            }
            if (!arch) {
                arch = os.arch();
            }
            if (version) {
                let token = core.getInput('token');
                let auth = !token || cache_utils_1.isGhes() ? undefined : `token ${token}`;
                let stable = (core.getInput('stable') || 'true').toUpperCase() === 'TRUE';
                const checkLatest = (core.getInput('check-latest') || 'false').toUpperCase() === 'TRUE';
                yield installer.getNode(version, stable, checkLatest, auth, arch);
            }
            yield printEnvDetailsAndSetOutput();
            const registryUrl = core.getInput('registry-url');
            const alwaysAuth = core.getInput('always-auth');
            if (registryUrl) {
                auth.configAuthentication(registryUrl, alwaysAuth);
            }
            if (cache && cache_utils_1.isCacheFeatureAvailable()) {
                const cacheDependencyPath = core.getInput('cache-dependency-path');
                yield cache_restore_1.restoreCache(cache, cacheDependencyPath);
            }
            const matchersPath = path.join(__dirname, '../..', '.github');
            core.info(`##[add-matcher]${path.join(matchersPath, 'tsc.json')}`);
            core.info(`##[add-matcher]${path.join(matchersPath, 'eslint-stylish.json')}`);
            core.info(`##[add-matcher]${path.join(matchersPath, 'eslint-compact.json')}`);
        }
        catch (err) {
            core.setFailed(err.message);
        }
    });
}
exports.run = run;
function resolveVersionInput() {
    let version = core.getInput('node-version');
    const versionFileInput = core.getInput('node-version-file');
    if (version && versionFileInput) {
        core.warning('Both node-version and node-version-file inputs are specified, only node-version will be used');
    }
    if (version) {
        return version;
    }
    if (versionFileInput) {
        const versionFilePath = path.join(process.env.GITHUB_WORKSPACE, versionFileInput);
        if (!fs_1.default.existsSync(versionFilePath)) {
            throw new Error(`The specified node version file at: ${versionFilePath} does not exist`);
        }
        version = installer.parseNodeVersionFile(fs_1.default.readFileSync(versionFilePath, 'utf8'));
        core.info(`Resolved ${versionFileInput} as ${version}`);
    }
    return version;
}
function printEnvDetailsAndSetOutput() {
    return __awaiter(this, void 0, void 0, function* () {
        core.startGroup('Environment details');
        const promises = ['node', 'npm', 'yarn'].map((tool) => __awaiter(this, void 0, void 0, function* () {
            const output = yield getToolVersion(tool, ['--version']);
            if (tool === 'node') {
                core.setOutput(`${tool}-version`, output);
            }
            core.info(`${tool}: ${output}`);
        }));
        yield Promise.all(promises);
        core.endGroup();
    });
}
exports.printEnvDetailsAndSetOutput = printEnvDetailsAndSetOutput;
function getToolVersion(tool, options) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { stdout, stderr, exitCode } = yield exec.getExecOutput(tool, options, {
                ignoreReturnCode: true,
                silent: true
            });
            if (exitCode > 0) {
                core.warning(`[warning]${stderr}`);
                return '';
            }
            return stdout;
        }
        catch (err) {
            return '';
        }
    });
}


/***/ }),
@@ -73920,10 +73946,10 @@ var __webpack_exports__ = {};
(() => {
"use strict";
var exports = __webpack_exports__;
Object.defineProperty(exports, "__esModule", ({ value: true }));
const main_1 = __nccwpck_require__(399);
main_1.run();

Object.defineProperty(exports, "__esModule", ({ value: true }));
const main_1 = __nccwpck_require__(399);
main_1.run();

})();

  48  
src/main.ts
@@ -40,17 +40,7 @@ export async function run() {
      await installer.getNode(version, stable, checkLatest, auth, arch);
    }

    // Output version of node is being used
    try {
      const {stdout: installedVersion} = await exec.getExecOutput(
        'node',
        ['--version'],
        {ignoreReturnCode: true, silent: true}
      );
      core.setOutput('node-version', installedVersion.trim());
    } catch (err) {
      core.setOutput('node-version', '');
    }
    await printEnvDetailsAndSetOutput();

    const registryUrl: string = core.getInput('registry-url');
    const alwaysAuth: string = core.getInput('always-auth');
@@ -111,3 +101,39 @@ function resolveVersionInput(): string {

  return version;
}

export async function printEnvDetailsAndSetOutput() {
  core.startGroup('Environment details');

  const promises = ['node', 'npm', 'yarn'].map(async tool => {
    const output = await getToolVersion(tool, ['--version']);

    if (tool === 'node') {
      core.setOutput(`${tool}-version`, output);
    }

    core.info(`${tool}: ${output}`);
  });

  await Promise.all(promises);

  core.endGroup();
}

async function getToolVersion(tool: string, options: string[]) {
  try {
    const {stdout, stderr, exitCode} = await exec.getExecOutput(tool, options, {
      ignoreReturnCode: true,
      silent: true
    });

    if (exitCode > 0) {
      core.warning(`[warning]${stderr}`);
      return '';
    }

    return stdout;
  } catch (err) {
    return '';
  }
}
0 comments on commit c81d8ad
@zakwarlord7
 
Add heading textAdd bold text, <Ctrl+b>Add italic text, <Ctrl+i>
Add a quote, <Ctrl+Shift+.>Add code, <Ctrl+e>Add a link, <Ctrl+k>
Add a bulleted list, <Ctrl+Shift+8>Add a numbered list, <Ctrl+Shift+7>Add a task list, <Ctrl+Shift+l>
Directly mention a user or team
Reference an issue, pull request, or discussion
Add saved reply
Leave a comment
No file chosen
Attach files by dragging & dropping, selecting or pasting them.
Styling with Markdown is supported
 You’re not receiving notifications from this thread.
Footer
© 2022 GitHub, Inc.
Footer navigation
Terms
Privacy
Security
Status
Docs
Contact GitHub
Pricing
API
Training
Blog
About
