"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
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
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const tc = __importStar(require("@actions/tool-cache"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const semver = __importStar(require("semver"));
const restm = __importStar(require("typed-rest-client/RestClient"));
let osPlat = os.platform();
let osArch = os.arch();
const IS_WINDOWS = osPlat === 'win32';
function getNode(versionSpec) {
    return __awaiter(this, void 0, void 0, function* () {
        versionSpec = versionSpec.trim();
        // resolve node codenames
        let version = yield resolve(versionSpec);
        if (!version) {
            throw new Error(`Unable to find Node version '${versionSpec}' for platform ${osPlat} and architecture ${osArch}.`);
        }
        // check cache
        let toolPath = tc.find('node', version, osArch);
        // Not found in cache -> download
        if (!toolPath) {
            // download, extract, cache
            toolPath = yield acquireNode(version);
        }
        // a tool installer initimately knows details about the layout of that tool
        // for example, node binary is in the bin folder after the extract on Mac/Linux.
        // layouts could change by version, by platform etc... but that's the tool installers job
        if (!IS_WINDOWS) {
            toolPath = path.join(toolPath, 'bin');
        }
        // prepend the tools path. instructs the agent to prepend for future tasks
        core.addPath(toolPath);
    });
}
exports.getNode = getNode;
function resolve(versionSpec) {
    return __awaiter(this, void 0, void 0, function* () {
        let version = semver.clean(versionSpec) || '';
        return semver.valid(version) || tc.find('node', versionSpec, osArch)
            ? version || versionSpec
            : queryNodeVersions(versionSpec);
    });
}
function queryNodeVersions(versionSpec) {
    return __awaiter(this, void 0, void 0, function* () {
        core.debug(`querying Node.js for ${versionSpec}`);
        // node offers a json list of versions
        let dataUrl = 'https://nodejs.org/dist/index.json';
        let rest = new restm.RestClient('setup-node');
        let nodeVersions = (yield rest.get(dataUrl)).result || [];
        let dataFileName;
        switch (osPlat) {
            case 'linux':
                dataFileName = `linux-${osArch}`;
                break;
            case 'darwin':
                dataFileName = `osx-${osArch}-tar`;
                break;
            case 'win32':
                dataFileName = `win-${osArch}-7z`;
                break;
            default:
                throw new Error(`Unexpected OS '${osPlat}'`);
        }
        // ensure this version supports your os and platform
        nodeVersions = nodeVersions.filter((nodeVersion) => nodeVersion.files.indexOf(dataFileName) > -1);
        // sort node versions by descending version
        nodeVersions = nodeVersions.sort((a, b) => semver.gt(b.version, a.version) ? 1 : -1);
        const isLatestSpec = /^latest|current$/i.test(versionSpec);
        const isLTSSpec = /^lts$/i.test(versionSpec);
        const isLTSCodenameSpec = !isLatestSpec && !isLTSSpec && /^[a-zA-Z]+$/.test(versionSpec);
        const findNodeVersion = (predicator) => {
            nodeVersions = nodeVersions.filter(predicator);
            return nodeVersions.length
                ? semver.clean(nodeVersions[0].version) || ''
                : '';
        };
        // resolve latest or current node version
        if (isLatestSpec) {
            return findNodeVersion((nodeVersion) => typeof nodeVersion.lts !== 'string');
        }
        // resolve lts node version
        if (isLTSSpec) {
            return findNodeVersion((nodeVersion) => typeof nodeVersion.lts === 'string');
        }
        // resolve node version codename
        if (isLTSCodenameSpec) {
            return findNodeVersion((nodeVersion) => typeof nodeVersion.lts === 'string' &&
                nodeVersion.lts.toLowerCase() === versionSpec.toLowerCase());
        }
        // get the latest version that matches the version spec
        return evaluateVersions(nodeVersions, versionSpec);
    });
}
// TODO - should we just export this from @actions/tool-cache? Lifted directly from there
function evaluateVersions(nodeVersions, versionSpec) {
    core.debug(`evaluating ${nodeVersions.length} versions`);
    const versions = nodeVersions.map((nodeVersion) => nodeVersion.version);
    const version = versions.find((potential) => semver.satisfies(potential, versionSpec)) || '';
    if (version) {
        core.debug(`matched: ${version}`);
    }
    else {
        core.debug('match not found');
    }
    return semver.clean(version) || '';
}
function acquireNode(version) {
    return __awaiter(this, void 0, void 0, function* () {
        // Download - a tool installer intimately knows how to get the tool (and construct urls)
        const fileName = `node-v${version}-${IS_WINDOWS ? 'win' : osPlat}-${osArch}`;
        const urlFileName = `${fileName}.${IS_WINDOWS ? '7z' : 'tar.gz'}`;
        const downloadUrl = `https://nodejs.org/dist/v${version}/${urlFileName}`;
        let downloadPath;
        try {
            downloadPath = yield tc.downloadTool(downloadUrl);
        }
        catch (err) {
            if (err instanceof tc.HTTPError && err.httpStatusCode === 404) {
                if (IS_WINDOWS) {
                    return acquireNodeFromFallbackLocation(version);
                }
            }
            throw err;
        }
        // Extract
        const _7zPath = path.join(__dirname, '..', 'externals', '7zr.exe');
        const extPath = IS_WINDOWS
            ? yield tc.extract7z(downloadPath, undefined, _7zPath)
            : yield tc.extractTar(downloadPath);
        // Install into the local tool cache
        // node extracts with a root folder that matches the fileName downloaded
        const toolRoot = path.join(extPath, fileName);
        return tc.cacheDir(toolRoot, 'node', version, osArch);
    });
}
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
function acquireNodeFromFallbackLocation(version) {
    return __awaiter(this, void 0, void 0, function* () {
        // Create temporary folder to download in to
        const tempDownloadFolder = `temp_${Math.floor(Math.random() * 2000000000)}`;
        const tempDir = path.join(getTempDirectory(), tempDownloadFolder);
        const baseUrl = `https://nodejs.org/dist/v${version}/`;
        const tryDownload = (url) => __awaiter(this, void 0, void 0, function* () {
            const exeFileName = 'node.exe';
            const libFileName = 'node.lib';
            const exePath = yield tc.downloadTool(`${url}${exeFileName}`);
            yield io.cp(exePath, path.join(tempDir, exeFileName));
            const libPath = yield tc.downloadTool(`${url}${libFileName}`);
            yield io.cp(libPath, path.join(tempDir, libFileName));
        });
        try {
            yield io.mkdirP(tempDir);
            yield tryDownload(`${baseUrl}win-${osArch}/`);
        }
        catch (err) {
            if (err instanceof tc.HTTPError && err.httpStatusCode === 404) {
                yield tryDownload(baseUrl);
            }
            else {
                throw err;
            }
        }
        return tc.cacheDir(tempDir, 'node', version, osArch);
    });
}
function getTempDirectory() {
    const baseLocation = 
    // On windows use the USERPROFILE env variable
    process.platform === 'win32'
        ? process.env['USERPROFILE'] || 'C:\\'
        : process.platform === 'darwin'
            ? '/Users'
            : '/home';
    return (process.env['RUNNER_TEMP'] || path.join(baseLocation, 'actions', 'temp'));
}
