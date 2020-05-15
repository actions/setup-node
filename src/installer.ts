import os = require('os');
import * as assert from 'assert';
import * as core from '@actions/core';
import * as hc from '@actions/http-client';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as path from 'path';
import * as semver from 'semver';
import fs = require('fs');

//
// Node versions interface
// see https://nodejs.org/dist/index.json
//
export interface INodeVersion {
  version: string;
  files: string[];
}

interface INodeVersionInfo {
  downloadUrl: string;
  resolvedVersion: string;
  fileName: string;
}

export async function getNode(
  versionSpec: string,
  stable: boolean,
  auth: string | undefined
) {
  let osPlat: string = os.platform();
  let osArch: string = translateArchToDistUrl(os.arch());

  // check cache
  let toolPath: string;
  toolPath = tc.find('node', versionSpec);

  // If not found in cache, download
  if (toolPath) {
    console.log(`Found in cache @ ${toolPath}`);
  } else {
    console.log(`Attempting to download ${versionSpec}...`);
    let downloadPath = '';
    let info: INodeVersionInfo | null = null;

    //
    // Try download from internal distribution (popular versions only)
    //
    try {
      info = await getInfoFromManifest(versionSpec, stable, auth);
      if (info) {
        console.log(
          `Acquiring ${info.resolvedVersion} from ${info.downloadUrl}`
        );
        downloadPath = await tc.downloadTool(info.downloadUrl, undefined, auth);
      } else {
        console.log(
          'Not found in manifest.  Falling back to download directly from Node'
        );
      }
    } catch (err) {
      // Rate limit?
      if (
        err instanceof tc.HTTPError &&
        (err.httpStatusCode === 403 || err.httpStatusCode === 429)
      ) {
        console.log(
          `Received HTTP status code ${err.httpStatusCode}.  This usually indicates the rate limit has been exceeded`
        );
      } else {
        console.log(err.message);
      }
      core.debug(err.stack);
      console.log('Falling back to download directly from Node');
    }

    //
    // Download from nodejs.org
    //
    if (!downloadPath) {
      info = await getInfoFromDist(versionSpec);
      if (!info) {
        throw new Error(
          `Unable to find Node version '${versionSpec}' for platform ${osPlat} and architecture ${osArch}.`
        );
      }

      console.log(`Acquiring ${info.resolvedVersion} from ${info.downloadUrl}`);
      try {
        downloadPath = await tc.downloadTool(info.downloadUrl);
      } catch (err) {
        if (err instanceof tc.HTTPError && err.httpStatusCode == 404) {
          return await acquireNodeFromFallbackLocation(info.resolvedVersion);
        }

        throw err;
      }
    }

    //
    // Extract
    //
    console.log('Extracting ...');
    let extPath: string;
    info = info || ({} as INodeVersionInfo); // satisfy compiler, never null when reaches here
    if (osPlat == 'win32') {
      let _7zPath = path.join(__dirname, '..', 'externals', '7zr.exe');
      extPath = await tc.extract7z(downloadPath, undefined, _7zPath);
      // 7z extracts to folder matching file name
      let nestedPath = path.join(extPath, path.basename(info.fileName, '.7z'));
      if (fs.existsSync(nestedPath)) {
        extPath = nestedPath;
      }
    } else {
      extPath = await tc.extractTar(downloadPath, undefined, [
        'xz',
        '--strip',
        '1'
      ]);
    }

    //
    // Install into the local tool cache - node extracts with a root folder that matches the fileName downloaded
    //
    console.log('Adding to the cache ...');
    toolPath = await tc.cacheDir(extPath, 'node', info.resolvedVersion);
    console.log('Done');
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
}

async function getInfoFromManifest(
  versionSpec: string,
  stable: boolean,
  auth: string | undefined
): Promise<INodeVersionInfo | null> {
  let info: INodeVersionInfo | null = null;
  const releases = await tc.getManifestFromRepo(
    'actions',
    'node-versions',
    auth
  );
  console.log(`matching ${versionSpec}...`);
  const rel = await tc.findFromManifest(versionSpec, stable, releases);

  if (rel && rel.files.length > 0) {
    info = <INodeVersionInfo>{};
    info.resolvedVersion = rel.version;
    info.downloadUrl = rel.files[0].download_url;
    info.fileName = rel.files[0].filename;
  }

  return info;
}

async function getInfoFromDist(
  versionSpec: string
): Promise<INodeVersionInfo | null> {
  let osPlat: string = os.platform();
  let osArch: string = translateArchToDistUrl(os.arch());

  let version: string;

  version = await queryDistForMatch(versionSpec);
  if (!version) {
    return null;
  }

  //
  // Download - a tool installer intimately knows how to get the tool (and construct urls)
  //
  version = semver.clean(version) || '';
  let fileName: string =
    osPlat == 'win32'
      ? `node-v${version}-win-${osArch}`
      : `node-v${version}-${osPlat}-${osArch}`;
  let urlFileName: string =
    osPlat == 'win32' ? `${fileName}.7z` : `${fileName}.tar.gz`;
  let url = `https://nodejs.org/dist/v${version}/${urlFileName}`;

  return <INodeVersionInfo>{
    downloadUrl: url,
    resolvedVersion: version,
    fileName: fileName
  };
}

// TODO - should we just export this from @actions/tool-cache? Lifted directly from there
function evaluateVersions(versions: string[], versionSpec: string): string {
  let version = '';
  core.debug(`evaluating ${versions.length} versions`);
  versions = versions.sort((a, b) => {
    if (semver.gt(a, b)) {
      return 1;
    }
    return -1;
  });
  for (let i = versions.length - 1; i >= 0; i--) {
    const potential: string = versions[i];
    const satisfied: boolean = semver.satisfies(potential, versionSpec);
    if (satisfied) {
      version = potential;
      break;
    }
  }

  if (version) {
    core.debug(`matched: ${version}`);
  } else {
    core.debug('match not found');
  }

  return version;
}

async function queryDistForMatch(versionSpec: string): Promise<string> {
  let osPlat: string = os.platform();
  let osArch: string = translateArchToDistUrl(os.arch());

  // node offers a json list of versions
  let dataFileName: string;
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

  let versions: string[] = [];
  let nodeVersions = await module.exports.getVersionsFromDist();

  nodeVersions.forEach((nodeVersion: INodeVersion) => {
    // ensure this version supports your os and platform
    if (nodeVersion.files.indexOf(dataFileName) >= 0) {
      versions.push(nodeVersion.version);
    }
  });

  // get the latest version that matches the version spec
  let version: string = evaluateVersions(versions, versionSpec);
  return version;
}

export async function getVersionsFromDist(): Promise<INodeVersion[]> {
  let dataUrl = 'https://nodejs.org/dist/index.json';
  let httpClient = new hc.HttpClient('setup-node', [], {
    allowRetries: true,
    maxRetries: 3
  });
  let response = await httpClient.getJson<INodeVersion[]>(dataUrl);
  return response.result || [];
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
  let osPlat: string = os.platform();
  let osArch: string = translateArchToDistUrl(os.arch());

  // Create temporary folder to download in to
  const tempDownloadFolder: string =
    'temp_' + Math.floor(Math.random() * 2000000000);
  const tempDirectory = process.env['RUNNER_TEMP'] || '';
  assert.ok(tempDirectory, 'Expected RUNNER_TEMP to be defined');
  const tempDir: string = path.join(tempDirectory, tempDownloadFolder);
  await io.mkdirP(tempDir);
  let exeUrl: string;
  let libUrl: string;
  try {
    exeUrl = `https://nodejs.org/dist/v${version}/win-${osArch}/node.exe`;
    libUrl = `https://nodejs.org/dist/v${version}/win-${osArch}/node.lib`;

    console.log(`Downloading only node binary from ${exeUrl}`);

    const exePath = await tc.downloadTool(exeUrl);
    await io.cp(exePath, path.join(tempDir, 'node.exe'));
    const libPath = await tc.downloadTool(libUrl);
    await io.cp(libPath, path.join(tempDir, 'node.lib'));
  } catch (err) {
    if (err instanceof tc.HTTPError && err.httpStatusCode == 404) {
      exeUrl = `https://nodejs.org/dist/v${version}/node.exe`;
      libUrl = `https://nodejs.org/dist/v${version}/node.lib`;

      const exePath = await tc.downloadTool(exeUrl);
      await io.cp(exePath, path.join(tempDir, 'node.exe'));
      const libPath = await tc.downloadTool(libUrl);
      await io.cp(libPath, path.join(tempDir, 'node.lib'));
    } else {
      throw err;
    }
  }
  let toolPath = await tc.cacheDir(tempDir, 'node', version);
  core.addPath(toolPath);
  return toolPath;
}

// os.arch does not always match the relative download url, e.g.
// os.arch == 'arm' != node-v12.13.1-linux-armv7l.tar.gz
// All other currently supported architectures match, e.g.:
//   os.arch = arm64 => https://nodejs.org/dist/v{VERSION}/node-v{VERSION}-{OS}-arm64.tar.gz
//   os.arch = x64 => https://nodejs.org/dist/v{VERSION}/node-v{VERSION}-{OS}-x64.tar.gz
function translateArchToDistUrl(arch: string): string {
  switch (arch) {
    case 'arm':
      return 'armv7l';
    default:
      return arch;
  }
}
