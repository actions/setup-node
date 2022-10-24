import os = require('os');
import fs = require('fs');
import * as assert from 'assert';
import * as core from '@actions/core';
import * as hc from '@actions/http-client';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as path from 'path';
import * as semver from 'semver';

//
// Node versions interface
// see https://nodejs.org/dist/index.json
// for nightly https://nodejs.org/download/nightly/index.json
// for canary https://nodejs.org/download/v8-canary/index.json

export interface INodeVersion {
  version: string;
  files: string[];
}

interface INodeVersionInfo {
  downloadUrl: string;
  resolvedVersion: string;
  arch: string;
  fileName: string;
}

interface INodeRelease extends tc.IToolRelease {
  lts?: string;
}

// TODO: unify with other isNnn?
const V8_CANARY = 'v8-canary';
const isVersionCanary = (versionSpec: string):boolean => versionSpec.includes(`-${V8_CANARY}`);

export async function getNode(
  versionSpec: string,
  stable: boolean,
  checkLatest: boolean,
  auth: string | undefined,
  arch: string = os.arch()
) {
  // Store manifest data to avoid multiple calls
  let manifest: INodeRelease[] | undefined;
  let nodeVersions: INodeVersion[] | undefined;
  let isCanary = isVersionCanary(versionSpec);
  let isNightly = versionSpec.includes('nightly') && !isCanary; // avoid both set by preceding isCanary
  let osPlat: string = os.platform();
  let osArch: string = translateArchToDistUrl(arch);

  core.debug(`get node isLtsAlias=${isLtsAlias(versionSpec)} isCanary=${isCanary} isNightly=${isNightly}`);

  if (isLtsAlias(versionSpec)) {
    core.info('Attempt to resolve LTS alias from manifest...');

    // No try-catch since it's not possible to resolve LTS alias without manifest
    manifest = await getManifest(auth);

    versionSpec = resolveLtsAliasFromManifest(versionSpec, stable, manifest);
  }

  if (isLatestSyntax(versionSpec)) {
    core.debug('will use latest node version from node repository because of latest syntax ...');
    nodeVersions = await getVersionsFromDist(versionSpec);
    versionSpec = await queryDistForMatch(versionSpec, arch, nodeVersions);
    core.info(`getting latest node version ${versionSpec}...`);
  }

  if (isNightly && checkLatest || isCanary && checkLatest) {
    core.debug(
      `will check latest node version from node repository because of check latest input with ${isNightly ? 'nightly' : 'canary'} set...`
    );
    nodeVersions = await getVersionsFromDist(versionSpec);
    versionSpec = await queryDistForMatch(versionSpec, arch, nodeVersions);
    core.info(`getting node version ${versionSpec}...`);
  }

  if (checkLatest && !isNightly && !isCanary) {
    core.info('Attempt to resolve the latest version from manifest...');
    const resolvedVersion = await resolveVersionFromManifest(
      versionSpec,
      stable,
      auth,
      osArch,
      manifest
    );
    if (resolvedVersion) {
      versionSpec = resolvedVersion;
      core.info(`Resolved as '${versionSpec}'`);
    } else {
      core.info(`Failed to resolve version ${versionSpec} from manifest`);
    }
  }

  // check cache
  core.debug('check toolcache');
  let toolPath: string;
  if (isNightly || isCanary) {
    const nightlyOrCanaryVersion = findNightlyOrCanaryVersionInHostedToolcache(
      versionSpec,
      osArch
    );
    toolPath = nightlyOrCanaryVersion && tc.find('node', nightlyOrCanaryVersion, osArch);
  } else {
    toolPath = tc.find('node', versionSpec, osArch);
  }

  // If not found in cache, download
  if (toolPath) {
    core.info(`Found in cache @ ${toolPath}`);
  } else {
    core.info(`Attempting to download ${versionSpec}...`);
    let downloadPath = '';
    let info: INodeVersionInfo | null = null;

    //
    // Try download from internal distribution (popular versions only)
    //
    try {
      info = await getInfoFromManifest(
        versionSpec,
        !isNightly && !isVersionCanary,
        auth,
        osArch,
        manifest
      );
      if (info) {
        core.info(
          `Acquiring ${info.resolvedVersion} - ${info.arch} from ${info.downloadUrl}`
        );
        downloadPath = await tc.downloadTool(info.downloadUrl, undefined, auth);
      } else {
        core.info(
          'Not found in manifest.  Falling back to download directly from Node'
        );
      }
    } catch (err) {
      // Rate limit?
      if (
        err instanceof tc.HTTPError &&
        (err.httpStatusCode === 403 || err.httpStatusCode === 429)
      ) {
        core.info(
          `Received HTTP status code ${err.httpStatusCode}.  This usually indicates the rate limit has been exceeded`
        );
      } else {
        core.info(err.message);
      }
      core.debug(err.stack);
      core.info('Falling back to download directly from Node');
    }

    //
    // Download from nodejs.org
    //
    if (!downloadPath) {
      info = await getInfoFromDist(versionSpec, arch, nodeVersions);
      if (!info) {
        throw new Error(
          `Unable to find Node version '${versionSpec}' for platform ${osPlat} and architecture ${osArch}.`
        );
      }

      core.info(
        `Acquiring ${info.resolvedVersion} - ${info.arch} from ${info.downloadUrl}`
      );
      try {
        downloadPath = await tc.downloadTool(info.downloadUrl);
      } catch (err) {
        if (err instanceof tc.HTTPError && err.httpStatusCode == 404) {
          return await acquireNodeFromFallbackLocation(
            info.resolvedVersion,
            info.arch
          );
        }

        throw err;
      }
    }

    //
    // Extract
    //
    core.info('Extracting ...');
    let extPath: string;
    info = info || ({} as INodeVersionInfo); // satisfy compiler, never null when reaches here
    if (osPlat == 'win32') {
      let _7zPath = path.join(__dirname, '../..', 'externals', '7zr.exe');
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
    core.info('Adding to the cache ...');
    toolPath = await tc.cacheDir(
      extPath,
      'node',
      info.resolvedVersion,
      info.arch
    );
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
}

function findNightlyOrCanaryVersionInHostedToolcache(
  versionsSpec: string,
  osArch: string
) {
  const foundAllVersions = tc.findAllVersions('node', osArch);
  core.debug(foundAllVersions.join('\n'));
  return evaluateVersions(foundAllVersions, versionsSpec);
}

function isLtsAlias(versionSpec: string): boolean {
  return versionSpec.startsWith('lts/');
}

function getManifest(auth: string | undefined): Promise<tc.IToolRelease[]> {
  core.debug('Getting manifest from actions/node-versions@main');
  return tc.getManifestFromRepo('actions', 'node-versions', auth, 'main');
}

function resolveLtsAliasFromManifest(
  versionSpec: string,
  stable: boolean,
  manifest: INodeRelease[]
): string {
  const alias = versionSpec.split('lts/')[1]?.toLowerCase();

  if (!alias) {
    throw new Error(
      `Unable to parse LTS alias for Node version '${versionSpec}'`
    );
  }

  core.debug(`LTS alias '${alias}' for Node version '${versionSpec}'`);

  // Supported formats are `lts/<alias>`, `lts/*`, and `lts/-n`. Where asterisk means highest possible LTS and -n means the nth-highest.
  const n = Number(alias);
  const aliases = Object.fromEntries(
    manifest
      .filter(x => x.lts && x.stable === stable)
      .map(x => [x.lts!.toLowerCase(), x])
      .reverse()
  );
  const numbered = Object.values(aliases);
  const release =
    alias === '*'
      ? numbered[numbered.length - 1]
      : n < 0
      ? numbered[numbered.length - 1 + n]
      : aliases[alias];

  if (!release) {
    throw new Error(
      `Unable to find LTS release '${alias}' for Node version '${versionSpec}'.`
    );
  }

  core.debug(
    `Found LTS release '${release.version}' for Node version '${versionSpec}'`
  );

  return release.version.split('.')[0];
}

async function getInfoFromManifest(
  versionSpec: string,
  stable: boolean,
  auth: string | undefined,
  osArch: string = translateArchToDistUrl(os.arch()),
  manifest: tc.IToolRelease[] | undefined
): Promise<INodeVersionInfo | null> {
  let info: INodeVersionInfo | null = null;
  if (!manifest) {
    core.debug('No manifest cached');
    manifest = await getManifest(auth);
  }

  const rel = await tc.findFromManifest(versionSpec, stable, manifest, osArch);

  if (rel && rel.files.length > 0) {
    info = <INodeVersionInfo>{};
    info.resolvedVersion = rel.version;
    info.arch = rel.files[0].arch;
    info.downloadUrl = rel.files[0].download_url;
    info.fileName = rel.files[0].filename;
  }

  return info;
}

async function getInfoFromDist(
  versionSpec: string,
  arch: string = os.arch(),
  nodeVersions?: INodeVersion[]
): Promise<INodeVersionInfo | null> {
  let osPlat: string = os.platform();
  let osArch: string = translateArchToDistUrl(arch);

  core.debug(`getting the release version from index.json in node repository`);
  let version: string = await queryDistForMatch(
    versionSpec,
    arch,
    nodeVersions
  );
  if (version) {
    core.debug(`got "${version}" release version from index.json in node repository`);
  } else {
    core.debug(`release version from index.json in node repository not found`);
  }

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
  const initialUrl = getNodejsDistUrl(versionSpec);
  let url = `${initialUrl}/v${version}/${urlFileName}`;

  return <INodeVersionInfo>{
    downloadUrl: url,
    resolvedVersion: version,
    arch: arch,
    fileName: fileName
  };
}

async function resolveVersionFromManifest(
  versionSpec: string,
  stable: boolean,
  auth: string | undefined,
  osArch: string = translateArchToDistUrl(os.arch()),
  manifest: tc.IToolRelease[] | undefined
): Promise<string | undefined> {
  try {
    const info = await getInfoFromManifest(
      versionSpec,
      stable,
      auth,
      osArch,
      manifest
    );
    return info?.resolvedVersion;
  } catch (err) {
    core.info('Unable to resolve version from manifest...');
    core.debug(err.message);
  }
}

function evaluateNightlyVersions(
  versions: string[],
  versionSpec: string
): string {
  let version = '';
  let range: string | null | undefined;
  const [raw, prerelease] = versionSpec.split('-');
  const isValidVersion = semver.valid(raw);
  const rawVersion = isValidVersion ? raw : semver.coerce(raw);
  if (rawVersion) {
    if (prerelease !== 'nightly') {
      range = `${rawVersion}+${prerelease.replace('nightly', 'nightly.')}`;
    } else {
      range = semver.validRange(`^${rawVersion}`);
    }
  }

  if (range) {
    versions = versions.sort((a, b) => {
      if (semver.gt(a, b)) {
        return 1;
      }
      return -1;
    });
    for (let i = versions.length - 1; i >= 0; i--) {
      const potential: string = versions[i];
      const satisfied: boolean = semver.satisfies(
        potential.replace('-nightly', '+nightly.'),
        range
      );
      if (satisfied) {
        version = potential;
        break;
      }
    }
  }

  if (version) {
    core.debug(`matched: ${version}`);
  } else {
    core.debug('match not found');
  }

  return version;
}

function evaluateCanaryVersions(
  versions: string[],
  versionSpec: string
): string {
  let version = '';
  let range: string | null | undefined;
  const [raw, prerelease] = versionSpec.split(/-(.*)/s);
  const isValidVersion = semver.valid(raw);
  const rawVersion = isValidVersion ? raw : semver.coerce(raw)?.version;
  if (rawVersion) {
    if (prerelease === V8_CANARY) {
      range = semver.validRange(`^${rawVersion}`);
    } else {
      range = `${rawVersion}+${prerelease.replace(V8_CANARY, V8_CANARY + '.')}`;
    }
  }
  core.debug(`evaluate canary versions rawVersion="${rawVersion}" range="${range}"`)

  if (range) {
    const versionsReversed = versions.sort((a, b) => {
      if (semver.gt(a, b)) {
        return -1;
      } else if (semver.lt(a, b)) {
        return 1;
      }
      return 0;
    });
    for (const potential of versionsReversed) {
      const satisfied: boolean = semver.satisfies(
        potential.replace('-' + V8_CANARY, '+' + V8_CANARY + '.'),
        range);
      if (satisfied) {
        version = potential;
        break;
      }
    }
  }

  if (version) {
    core.debug(`matched: ${version}`);
  } else {
    core.debug('match not found');
  }

  return version;
}

// TODO - should we just export this from @actions/tool-cache? Lifted directly from there
function evaluateVersions(versions: string[], versionSpec: string): string {
  let version = '';
  core.debug(`evaluating ${versions.length} versions`);
  core.debug(versions[1])

  if (versionSpec.includes('nightly')) {
    return evaluateNightlyVersions(versions, versionSpec);
  } else if (isVersionCanary(versionSpec)) {
    return evaluateCanaryVersions(versions, versionSpec);
  }

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

function getNodejsDistUrl(version: string) {
  const prerelease = semver.prerelease(version);
  if (version.includes('nightly')) {
    core.debug('requested nightly build');
    return 'https://nodejs.org/download/nightly';
  } else if (isVersionCanary(version)) {
    core.debug('requested v8 canary build');
    return 'https://nodejs.org/download/v8-canary';
  } else if (!prerelease) {
    return 'https://nodejs.org/dist';
  } else {
    core.debug('requested RC build');
    return 'https://nodejs.org/download/rc';
  }
}

async function queryDistForMatch(
  versionSpec: string,
  arch: string = os.arch(),
  nodeVersions?: INodeVersion[]
): Promise<string> {
  let osPlat: string = os.platform();
  let osArch: string = translateArchToDistUrl(arch);

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

  if (!nodeVersions) {
    core.debug('No dist manifest cached');
    nodeVersions = await getVersionsFromDist(versionSpec);
  }

  let versions: string[] = [];

  if (isLatestSyntax(versionSpec)) {
    core.info(`getting latest node version...`);
    return nodeVersions[0].version;
  }

  nodeVersions.forEach((nodeVersion: INodeVersion) => {
    // ensure this version supports your os and platform
    if (nodeVersion.files.indexOf(dataFileName) >= 0) {
      versions.push(nodeVersion.version);
    }
  });

  // get the latest version that matches the version spec
  let version = evaluateVersions(versions, versionSpec);
  return version;
}

export async function getVersionsFromDist(
  versionSpec: string
): Promise<INodeVersion[]> {
  const initialUrl = getNodejsDistUrl(versionSpec);
  const dataUrl = `${initialUrl}/index.json`;
  core.debug(`download ${dataUrl}`);
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
  version: string,
  arch: string = os.arch()
): Promise<string> {
  const initialUrl = getNodejsDistUrl(version);
  let osPlat: string = os.platform();
  let osArch: string = translateArchToDistUrl(arch);

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
    exeUrl = `${initialUrl}/v${version}/win-${osArch}/node.exe`;
    libUrl = `${initialUrl}/v${version}/win-${osArch}/node.lib`;

    core.info(`Downloading only node binary from ${exeUrl}`);

    const exePath = await tc.downloadTool(exeUrl);
    await io.cp(exePath, path.join(tempDir, 'node.exe'));
    const libPath = await tc.downloadTool(libUrl);
    await io.cp(libPath, path.join(tempDir, 'node.lib'));
  } catch (err) {
    if (err instanceof tc.HTTPError && err.httpStatusCode == 404) {
      exeUrl = `${initialUrl}/v${version}/node.exe`;
      libUrl = `${initialUrl}/v${version}/node.lib`;

      const exePath = await tc.downloadTool(exeUrl);
      await io.cp(exePath, path.join(tempDir, 'node.exe'));
      const libPath = await tc.downloadTool(libUrl);
      await io.cp(libPath, path.join(tempDir, 'node.lib'));
    } else {
      throw err;
    }
  }
  let toolPath = await tc.cacheDir(tempDir, 'node', version, arch);
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

export function parseNodeVersionFile(contents: string): string {
  let nodeVersion: string | undefined;

  // Try parsing the file as an NPM `package.json` file.
  try {
    nodeVersion = JSON.parse(contents).volta?.node;
    if (!nodeVersion) nodeVersion = JSON.parse(contents).engines?.node;
  } catch {
    core.info('Node version file is not JSON file');
  }

  if (!nodeVersion) {
    const found = contents.match(/^(?:nodejs\s+)?v?(?<version>[^\s]+)$/m);
    nodeVersion = found?.groups?.version;
  }

  // In the case of an unknown format,
  // return as is and evaluate the version separately.
  if (!nodeVersion) nodeVersion = contents.trim();

  return nodeVersion as string;
}

function isLatestSyntax(versionSpec): boolean {
  return ['current', 'latest', 'node'].includes(versionSpec);
}
