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
// Load tempDirectory before it gets wiped by tool-cache
let tempDirectory = process.env['RUNNER_TEMPDIRECTORY'] || '';
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const tc = __importStar(require("@actions/tool-cache"));
const restm = __importStar(require("typed-rest-client/RestClient"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const semver = __importStar(require("semver"));
let osPlat = os.platform();
let osArch = translateArchToDistUrl(os.arch());
if (!tempDirectory) {
    let baseLocation;
    if (process.platform === 'win32') {
        // On windows use the USERPROFILE env variable
        baseLocation = process.env['USERPROFILE'] || 'C:\\';
    }
    else {
        if (process.platform === 'darwin') {
            baseLocation = '/Users';
        }
        else {
            baseLocation = '/home';
        }
    }
    tempDirectory = path.join(baseLocation, 'actions', 'temp');
}
function getNode(versionSpec) {
    return __awaiter(this, void 0, void 0, function* () {
        // check cache
        let toolPath;
        toolPath = tc.find('node', versionSpec);
        // If not found in cache, download
        if (!toolPath) {
            let version;
            const c = semver.clean(versionSpec) || '';
            // If explicit version
            if (semver.valid(c) != null) {
                // version to download
                version = versionSpec;
            }
            else {
                // query nodejs.org for a matching version
                version = yield queryLatestMatch(versionSpec);
                if (!version) {
                    throw new Error(`Unable to find Node version '${versionSpec}' for platform ${osPlat} and architecture ${osArch}.`);
                }
                // check cache
                toolPath = tc.find('node', version);
            }
            if (!toolPath) {
                // download, extract, cache
                toolPath = yield acquireNode(version);
            }
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
function queryLatestMatch(versionSpec) {
    return __awaiter(this, void 0, void 0, function* () {
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
        let versions = [];
        let dataUrl = 'https://nodejs.org/dist/index.json';
        let rest = new restm.RestClient('setup-node');
        let nodeVersions = (yield rest.get(dataUrl)).result || [];
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
function acquireNode(version) {
    return __awaiter(this, void 0, void 0, function* () {
        //
        // Download - a tool installer intimately knows how to get the tool (and construct urls)
        //
        version = semver.clean(version) || '';
        let fileName = osPlat == 'win32'
            ? `node-v${version}-win-${osArch}`
            : `node-v${version}-${osPlat}-${osArch}`;
        let urlFileName = osPlat == 'win32' ? `${fileName}.7z` : `${fileName}.tar.gz`;
        let downloadUrl = `https://nodejs.org/dist/v${version}/${urlFileName}`;
        let downloadPath;
        try {
            downloadPath = yield tc.downloadTool(downloadUrl);
        }
        catch (err) {
            if (err instanceof tc.HTTPError && err.httpStatusCode == 404) {
                return yield acquireNodeFromFallbackLocation(version);
            }
            throw err;
        }
        //
        // Extract
        //
        let extPath;
        if (osPlat == 'win32') {
            let _7zPath = path.join(__dirname, '..', 'externals', '7zr.exe');
            extPath = yield tc.extract7z(downloadPath, undefined, _7zPath);
        }
        else {
            extPath = yield tc.extractTar(downloadPath);
        }
        //
        // Install into the local tool cache - node extracts with a root folder that matches the fileName downloaded
        //
        let toolRoot = path.join(extPath, fileName);
        return yield tc.cacheDir(toolRoot, 'node', version);
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
        let tempDownloadFolder = 'temp_' + Math.floor(Math.random() * 2000000000);
        let tempDir = path.join(tempDirectory, tempDownloadFolder);
        yield io.mkdirP(tempDir);
        let exeUrl;
        let libUrl;
        try {
            exeUrl = `https://nodejs.org/dist/v${version}/win-${osArch}/node.exe`;
            libUrl = `https://nodejs.org/dist/v${version}/win-${osArch}/node.lib`;
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
        return yield tc.cacheDir(tempDir, 'node', version);
    });
}
// os.arch does not always match the relative download url, e.g.
// os.arch == 'arm' != node-v12.13.1-linux-armv7l.tar.gz
function translateArchToDistUrl(arch) {
    switch (arch) {
        case 'arm':
            return 'armv7l';
        default:
            return arch;
    }
}
