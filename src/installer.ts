import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';
import * as restm from 'typed-rest-client/RestClient';

let osPlat: string = os.platform();
let osArch: string = os.arch();
const IS_WINDOWS: boolean = osPlat === 'win32';

/*
 * Node versions interface
 * see https://nodejs.org/dist/index.json
 */
export interface INodeVersion {
  version: string;
  files: string[];
  lts: string | false;
}

export async function getNode(versionSpec: string): Promise<void> {
  versionSpec = versionSpec.trim();

  // resolve node codenames
  let version = await resolve(versionSpec);

  if (!version) {
    throw new Error(
      `Unable to find Node version '${versionSpec}' for platform ${osPlat} and architecture ${osArch}.`
    );
  }

  // check cache
  let toolPath = tc.find('node', version, osArch);

  // Not found in cache -> download
  if (!toolPath) {
    // download, extract, cache
    toolPath = await acquireNode(version);
  }

  // a tool installer initimately knows details about the layout of that tool
  // for example, node binary is in the bin folder after the extract on Mac/Linux.
  // layouts could change by version, by platform etc... but that's the tool installers job
  if (!IS_WINDOWS) {
    toolPath = path.join(toolPath, 'bin');
  }

  // prepend the tools path. instructs the agent to prepend for future tasks
  core.addPath(toolPath);
}

async function resolve(versionSpec: string): Promise<string> {
  let version = semver.clean(versionSpec) || '';
  return semver.valid(version) || tc.find('node', versionSpec, osArch)
    ? version || versionSpec
    : queryNodeVersions(versionSpec);
}

async function queryNodeVersions(versionSpec: string): Promise<string> {
  core.debug(`querying Node.js for ${versionSpec}`);
  // node offers a json list of versions
  let dataUrl = 'https://nodejs.org/dist/index.json';
  let rest = new restm.RestClient('setup-node');
  let nodeVersions: INodeVersion[] =
    (await rest.get<INodeVersion[]>(dataUrl)).result || [];
  let dataFileName: string;
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
  nodeVersions = nodeVersions.filter(
    (nodeVersion: INodeVersion) => nodeVersion.files.indexOf(dataFileName) > -1
  );

  // sort node versions by descending version
  nodeVersions = nodeVersions.sort((a: INodeVersion, b: INodeVersion) =>
    semver.gt(b.version, a.version) ? 1 : -1
  );

  const isLatestSpec = /^latest|current$/i.test(versionSpec);
  const isLTSSpec = /^lts$/i.test(versionSpec);
  const isLTSCodenameSpec =
    !isLatestSpec && !isLTSSpec && /^[a-zA-Z]+$/.test(versionSpec);
  const findNodeVersion = (
    predicator: (nodeVersion: INodeVersion) => boolean
  ): string => {
    nodeVersions = nodeVersions.filter(predicator);
    return nodeVersions.length
      ? semver.clean(nodeVersions[0].version) || ''
      : '';
  };

  // resolve latest or current node version
  if (isLatestSpec) {
    return findNodeVersion(
      (nodeVersion: INodeVersion) => typeof nodeVersion.lts !== 'string'
    );
  }

  // resolve lts node version
  if (isLTSSpec) {
    return findNodeVersion(
      (nodeVersion: INodeVersion) => typeof nodeVersion.lts === 'string'
    );
  }

  // resolve node version codename
  if (isLTSCodenameSpec) {
    return findNodeVersion(
      (nodeVersion: INodeVersion) =>
        typeof nodeVersion.lts === 'string' &&
        nodeVersion.lts.toLowerCase() === versionSpec.toLowerCase()
    );
  }

  // get the latest version that matches the version spec
  return evaluateVersions(nodeVersions, versionSpec);
}

// TODO - should we just export this from @actions/tool-cache? Lifted directly from there
function evaluateVersions(
  nodeVersions: INodeVersion[],
  versionSpec: string
): string {
  core.debug(`evaluating ${nodeVersions.length} versions`);
  const versions = nodeVersions.map(
    (nodeVersion: INodeVersion) => nodeVersion.version
  );
  const version =
    versions.find((potential: string) =>
      semver.satisfies(potential, versionSpec)
    ) || '';

  if (version) {
    core.debug(`matched: ${version}`);
  } else {
    core.debug('match not found');
  }

  return semver.clean(version) || '';
}

async function acquireNode(version: string): Promise<string> {
  // Download - a tool installer intimately knows how to get the tool (and construct urls)
  const fileName: string = `node-v${version}-${
    IS_WINDOWS ? 'win' : osPlat
  }-${osArch}`;
  const urlFileName: string = `${fileName}.${IS_WINDOWS ? '7z' : 'tar.gz'}`;
  const downloadUrl = `https://nodejs.org/dist/v${version}/${urlFileName}`;

  let downloadPath: string;
  try {
    downloadPath = await tc.downloadTool(downloadUrl);
  } catch (err) {
    if (err instanceof tc.HTTPError && err.httpStatusCode === 404) {
      if (IS_WINDOWS) {
        return acquireNodeFromFallbackLocation(version);
      }
    }
    throw err;
  }

  // Extract
  const _7zPath = path.join(__dirname, '..', 'externals', '7zr.exe');
  const extPath: string = IS_WINDOWS
    ? await tc.extract7z(downloadPath, undefined, _7zPath)
    : await tc.extractTar(downloadPath);

  // Install into the local tool cache
  // node extracts with a root folder that matches the fileName downloaded
  const toolRoot = path.join(extPath, fileName);
  return tc.cacheDir(toolRoot, 'node', version, osArch);
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
async function acquireNodeFromFallbackLocation(
  version: string
): Promise<string> {
  // Create temporary folder to download in to
  const tempDownloadFolder: string = `temp_${Math.floor(
    Math.random() * 2000000000
  )}`;
  const tempDir: string = path.join(getTempDirectory(), tempDownloadFolder);
  const baseUrl = `https://nodejs.org/dist/v${version}/`;
  const tryDownload = async (url: string) => {
    const exeFileName = 'node.exe';
    const libFileName = 'node.lib';
    const exePath = await tc.downloadTool(`${url}${exeFileName}`);
    await io.cp(exePath, path.join(tempDir, exeFileName));
    const libPath = await tc.downloadTool(`${url}${libFileName}`);
    await io.cp(libPath, path.join(tempDir, libFileName));
  };

  try {
    await io.mkdirP(tempDir);
    await tryDownload(`${baseUrl}win-${osArch}/`);
  } catch (err) {
    if (err instanceof tc.HTTPError && err.httpStatusCode === 404) {
      await tryDownload(baseUrl);
    } else {
      throw err;
    }
  }
  return tc.cacheDir(tempDir, 'node', version, osArch);
}

function getTempDirectory(): string {
  const baseLocation: string =
    // On windows use the USERPROFILE env variable
    process.platform === 'win32'
      ? process.env['USERPROFILE'] || 'C:\\'
      : process.platform === 'darwin'
      ? '/Users'
      : '/home';
  return (
    process.env['RUNNER_TEMP'] || path.join(baseLocation, 'actions', 'temp')
  );
}
