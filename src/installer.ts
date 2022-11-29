import os from 'os';
import * as assert from 'assert';
import * as core from '@actions/core';
import * as hc from '@actions/http-client';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as path from 'path';
import * as semver from 'semver';
import fs from 'fs';

//
// Node versions interface
// see https://nodejs.org/dist/index.json
// for nightly https://nodejs.org/download/nightly/index.json
// for rc https://nodejs.org/download/rc/index.json
// for canary https://nodejs.org/download/v8-canary/index.json
//
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

export enum Distributions {
  DEFAULT = '',
  CANARY = '-v8-canary',
  NIGHTLY = '-nightly',
  RC = '-rc'
}

export const distributionOf = (versionSpec: string): Distributions => {
  if (versionSpec.includes(Distributions.CANARY)) return Distributions.CANARY;
  if (versionSpec.includes(Distributions.NIGHTLY)) return Distributions.NIGHTLY;
  if (semver.prerelease(versionSpec)) return Distributions.RC;
  return Distributions.DEFAULT;
};

interface VersionMatcher {
  (potential: string): boolean;

  // memoize the factory for testing and debug purposes
  factory:
    | ((ver: string, suffix: string) => VersionMatcher)
    | ((semverRanger: string) => VersionMatcher)
    | (() => VersionMatcher);
}

export const semverVersionMatcherFactory = (range: string): VersionMatcher => {
  const matcher = (potential: string): boolean =>{
    core.debug(`potential is ${potential}`)
    return semver.satisfies(potential, range);
  }
  core.debug(`range is ${range}`);
  matcher.factory = semverVersionMatcherFactory;
  return matcher;
};

export const canaryRangeVersionMatcherFactory = (
  version: string
): VersionMatcher => {
  const {range, includePrerelease} = createRangePreRelease(
    version,
    Distributions.CANARY
  )!;
  const matcher = (potential: string): boolean =>
    semver.satisfies(
      potential.replace(Distributions.CANARY, `${Distributions.CANARY}.`),
      range!,
      {includePrerelease: includePrerelease}
    );
  matcher.factory = canaryRangeVersionMatcherFactory;
  return matcher;
};

export const nightlyRangeVersionMatcherFactory = (
  version: string
): VersionMatcher => {
  const {range, includePrerelease} = createRangePreRelease(
    version,
    Distributions.NIGHTLY
  )!;
  const matcher = (potential: string): boolean =>
    distributionOf(potential) === Distributions.NIGHTLY &&
    semver.satisfies(
      potential.replace(Distributions.NIGHTLY, `${Distributions.NIGHTLY}.`),
      range!,
      {includePrerelease: includePrerelease}
    );
  matcher.factory = nightlyRangeVersionMatcherFactory;
  return matcher;
};

// [raw, prerelease]
export const splitVersionSpec = (versionSpec: string): string[] =>
  versionSpec.split(/-(.*)/s);

const createRangePreRelease = (
  versionSpec: string,
  preRelease: string = ''
) => {
  let range: string | undefined;
  const [raw, prerelease] = splitVersionSpec(versionSpec);
  const isValidVersion = semver.valid(raw);
  const rawVersion = isValidVersion ? raw : semver.coerce(raw);

  if (rawVersion) {
    if (`-${prerelease}` !== preRelease) {
      core.debug(`came to full version ${preRelease}`);
      range = `${rawVersion}${`-${prerelease}`.replace(
        preRelease,
        `${preRelease}.`
      )}`;
    } else {
      core.debug('came to range version');
      range = `${semver.validRange(`^${rawVersion}${preRelease}`)}-0`;
    }
  }
  core.debug(`prerelease is ${prerelease}, preRelease is ${preRelease}`);
  core.debug(`Version Range for ${versionSpec} is ${range}`);

  return {range, includePrerelease: !isValidVersion};
};

export function versionMatcherFactory(versionSpec: string): VersionMatcher {
  const raw = splitVersionSpec(versionSpec)[0];
  const validVersion = semver.valid(raw) ? raw : semver.coerce(raw)?.version;

  if (validVersion) {
    switch (distributionOf(versionSpec)) {
      case Distributions.CANARY:
        return canaryRangeVersionMatcherFactory(versionSpec);
      case Distributions.NIGHTLY:
        return nightlyRangeVersionMatcherFactory(versionSpec);
      case Distributions.RC:
      case Distributions.DEFAULT:
        return semverVersionMatcherFactory(versionSpec);
    }
  } else {
    throw Error(`Invalid version input "${versionSpec}"`);
  }
}

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
  const osPlat: string = os.platform();
  const osArch: string = translateArchToDistUrl(arch);
  const distribution = distributionOf(versionSpec);

  if (isLtsAlias(versionSpec)) {
    core.info('Attempt to resolve LTS alias from manifest...');

    // No try-catch since it's not possible to resolve LTS alias without manifest
    manifest = await getManifest(auth);

    versionSpec = resolveLtsAliasFromManifest(versionSpec, stable, manifest);
  }

  if (isLatestSyntax(versionSpec)) {
    nodeVersions = await getVersionsFromDist(versionSpec);
    versionSpec = await queryDistForMatch(versionSpec, arch, nodeVersions);
    core.info(`getting latest node version ${versionSpec}...`);
  }

  if (
    (distribution === Distributions.NIGHTLY ||
      distribution === Distributions.CANARY) &&
    checkLatest
  ) {
    nodeVersions = await getVersionsFromDist(versionSpec);
    versionSpec = await queryDistForMatch(versionSpec, arch, nodeVersions);
  }

  if (
    checkLatest &&
    distribution !== Distributions.NIGHTLY &&
    distribution !== Distributions.CANARY
  ) {
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
  let toolPath: string;
  if (distribution === Distributions.DEFAULT) {
    toolPath = tc.find('node', versionSpec, osArch);
  } else {
    const localVersionPaths = tc.findAllVersions('node', osArch);
    const localVersion = evaluateVersions(localVersionPaths, versionSpec);
    toolPath = localVersion && tc.find('node', localVersion, osArch);
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
        stable,
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

export function isLtsAlias(versionSpec: string): boolean {
  return versionSpec.startsWith('lts/');
}

function getManifest(auth: string | undefined): Promise<tc.IToolRelease[]> {
  core.debug('Getting manifest from actions/node-versions@main');
  return tc.getManifestFromRepo('actions', 'node-versions', auth, 'main');
}

export function resolveLtsAliasFromManifest(
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

  let version: string = await queryDistForMatch(
    versionSpec,
    arch,
    nodeVersions
  );

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
  const url = `${initialUrl}/v${version}/${urlFileName}`;

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

// TODO - should we just export this from @actions/tool-cache? Lifted directly from there
//      -  the answer from dsame@github.com - we have customized matcher and can not
//         export `evaluateVersions` from tc. But it would be possible to modify tc to accept
//         the matcher as an optional parameter to `evaluateVersions`
export function evaluateVersions(
  versions: string[],
  versionSpec: string
): string {
  core.debug(`evaluating ${versions.length} versions`);

  const matcher = versionMatcherFactory(versionSpec);
  const version = versions.sort(semver.rcompare).find(matcher) || '';

  if (version) {
    core.debug(`matched: ${version}`);
  } else {
    core.debug('match not found');
  }

  return version;
}

export function getNodejsDistUrl(version: string) {
  switch (distributionOf(version)) {
    case Distributions.CANARY:
      return 'https://nodejs.org/download/v8-canary';
    case Distributions.NIGHTLY:
      return 'https://nodejs.org/download/nightly';
    case Distributions.RC:
      return 'https://nodejs.org/download/rc';
    case Distributions.DEFAULT:
      return 'https://nodejs.org/dist';
  }
}

export async function queryDistForMatch(
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

  if (isLatestSyntax(versionSpec)) {
    core.info(`getting latest node version...`);
    return nodeVersions[0].version;
  }

  const versions: string[] = [];
  nodeVersions.forEach((nodeVersion: INodeVersion) => {
    // ensure this version supports your os and platform
    if (nodeVersion.files.indexOf(dataFileName) >= 0) {
      versions.push(nodeVersion.version);
    }
  });

  // get the latest version that matches the version spec
  const version = evaluateVersions(versions, versionSpec);
  return version;
}

export async function getVersionsFromDist(
  versionSpec: string
): Promise<INodeVersion[]> {
  const distUrl = getNodejsDistUrl(versionSpec);
  const dataUrl = `${distUrl}/index.json`;
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

export function isLatestSyntax(versionSpec): boolean {
  return ['current', 'latest', 'node'].includes(versionSpec);
}
