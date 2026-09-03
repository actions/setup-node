import fs from 'node:fs';
import path from 'node:path';

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';

import BaseDistribution from '../base-distribution.js';
import {NodeInputs, INodeVersion, INodeVersionInfo} from '../base-models.js';

interface INodeRelease extends tc.IToolRelease {
  lts?: string;
}

const nodeVersionsManifestFile = 'setup-node-versions-manifest.json';
const nodeVersionsManifestUrl =
  'https://raw.githubusercontent.com/actions/node-versions/main/versions-manifest.json';
const invalidManifestMessage =
  'The manifest fetched is empty, truncated, or does not contain any valid tool release entries.';

/** @param {unknown} manifest */
function isValidManifest(manifest: unknown): manifest is tc.IToolRelease[] {
  return Array.isArray(manifest) && manifest.length > 0;
}

export default class OfficialBuilds extends BaseDistribution {
  constructor(nodeInfo: NodeInputs) {
    super(nodeInfo);
  }

  public async setupNodeJs() {
    let manifest: tc.IToolRelease[] | undefined;
    let nodeJsVersions: INodeVersion[] | undefined;
    const osArch = this.translateArchToDistUrl(this.nodeInfo.arch);

    if (this.isLtsAlias(this.nodeInfo.versionSpec)) {
      core.info('Attempt to resolve LTS alias from manifest...');

      // No try-catch since it's not possible to resolve LTS alias without manifest
      manifest = await this.getManifest();

      this.nodeInfo.versionSpec = this.resolveLtsAliasFromManifest(
        this.nodeInfo.versionSpec,
        this.nodeInfo.stable,
        manifest
      );
    }

    if (this.isLatestSyntax(this.nodeInfo.versionSpec)) {
      nodeJsVersions = await this.getNodeJsVersions();
      const versions = this.filterVersions(nodeJsVersions);
      this.nodeInfo.versionSpec = this.evaluateVersions(versions);

      core.info('getting latest node version...');
    }

    if (this.nodeInfo.checkLatest) {
      core.info('Attempt to resolve the latest version from manifest...');
      let resolvedVersion: string | undefined;
      try {
        manifest ??= await this.getManifest();
        const info = await this.getInfoFromManifest(
          this.nodeInfo.versionSpec,
          this.nodeInfo.stable,
          osArch,
          manifest
        );
        resolvedVersion = info?.resolvedVersion;
      } catch (error) {
        core.info('Unable to resolve version from manifest...');
        core.debug((error as Error).message);
      }
      if (resolvedVersion) {
        this.nodeInfo.versionSpec = resolvedVersion;
        core.info(`Resolved as '${resolvedVersion}'`);
      } else {
        core.info(
          `Failed to resolve version ${this.nodeInfo.versionSpec} from manifest`
        );
      }
    }

    let toolPath = this.findVersionInHostedToolCacheDirectory();

    if (toolPath) {
      core.info(`Found in cache @ ${toolPath}`);
      const installedDir = toolPath;
      this.addToolPath(toolPath);
      await this.verifyNodeVersion(installedDir);
      return;
    }

    let downloadPath = '';
    try {
      core.info(`Attempting to download ${this.nodeInfo.versionSpec}...`);

      const versionInfo = await this.getInfoFromManifest(
        this.nodeInfo.versionSpec,
        this.nodeInfo.stable,
        osArch,
        manifest
      );

      if (versionInfo) {
        core.info(
          `Acquiring ${versionInfo.resolvedVersion} - ${versionInfo.arch} from ${versionInfo.downloadUrl}`
        );
        downloadPath = await tc.downloadTool(
          versionInfo.downloadUrl,
          undefined,
          this.nodeInfo.mirror && this.nodeInfo.mirrorToken
            ? this.nodeInfo.mirrorToken
            : this.nodeInfo.auth
        );

        if (downloadPath) {
          toolPath = await this.extractArchive(
            downloadPath,
            versionInfo,
            false
          );
        }
      } else {
        core.info(
          `Not found in manifest. Falling back to download directly from ${
            this.nodeInfo.mirror || 'Node'
          }`
        );
      }
    } catch (err) {
      // Rate limit?
      if (
        err instanceof tc.HTTPError &&
        (err.httpStatusCode === 403 || err.httpStatusCode === 429)
      ) {
        core.info(
          `Received HTTP status code ${err.httpStatusCode}. This usually indicates the rate limit has been exceeded`
        );
      } else {
        core.info((err as Error).message);
      }
      core.debug((err as Error).stack ?? 'empty stack');
      core.info('Falling back to download directly from Node');
    }

    if (!toolPath) {
      toolPath = await this.downloadDirectlyFromNode();
    }

    const installedDir = toolPath;
    if (this.osPlat != 'win32') {
      toolPath = path.join(toolPath, 'bin');
    }

    core.addPath(toolPath);
    await this.verifyNodeVersion(installedDir);
  }

  protected addToolPath(toolPath: string) {
    if (this.osPlat != 'win32') {
      toolPath = path.join(toolPath, 'bin');
    }

    core.addPath(toolPath);
  }

  protected async downloadDirectlyFromNode() {
    const nodeJsVersions = await this.getNodeJsVersions();
    const versions = this.filterVersions(nodeJsVersions);
    const evaluatedVersion = this.evaluateVersions(versions);

    if (!evaluatedVersion) {
      throw new Error(
        `Unable to find Node version '${this.nodeInfo.versionSpec}' for platform ${this.osPlat} and architecture ${this.nodeInfo.arch}.`
      );
    }

    const toolName = this.getNodejsDistInfo(evaluatedVersion);

    try {
      const toolPath = await this.downloadNodejs(toolName);
      return toolPath;
    } catch (error) {
      if (error instanceof tc.HTTPError && error.httpStatusCode === 404) {
        core.warning(
          `Node version ${this.nodeInfo.versionSpec} for platform ${this.osPlat} and architecture ${this.nodeInfo.arch} was found but failed to download. ` +
            'This usually happens when downloadable binaries are not fully updated at https://nodejs.org/. ' +
            'To resolve this issue you may either fall back to the older version or try again later.'
        );
      }

      throw error;
    }
  }

  protected evaluateVersions(versions: string[]): string {
    let version = '';

    if (this.isLatestSyntax(this.nodeInfo.versionSpec)) {
      core.info(`getting latest node version...`);
      return versions[0];
    }

    version = super.evaluateVersions(versions);

    return version;
  }

  protected getDistributionUrl(mirror: string): string {
    const url = mirror || 'https://nodejs.org';
    return `${url}/dist`;
  }

  private async getManifest(): Promise<tc.IToolRelease[]> {
    const runnerTemp = process.env['RUNNER_TEMP'];
    const manifestPath = runnerTemp
      ? path.join(runnerTemp, nodeVersionsManifestFile)
      : undefined;
    const cachedManifest = this.nodeInfo.checkLatest
      ? undefined
      : this.getCachedManifest(manifestPath);
    if (cachedManifest) {
      return cachedManifest;
    }

    core.debug(`Getting manifest from ${nodeVersionsManifestUrl}`);
    try {
      const {result} = await this.httpClient.getJson<tc.IToolRelease[]>(
        nodeVersionsManifestUrl
      );
      if (!isValidManifest(result)) {
        throw new Error(invalidManifestMessage);
      }
      this.cacheManifest(manifestPath, result);
      return result;
    } catch (error) {
      core.debug(
        `Unable to get manifest from ${nodeVersionsManifestUrl}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    let lastError: Error | undefined;
    const maxAttempts = 3;
    core.debug(`Getting manifest from actions/node-versions@main`);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const manifest = await tc.getManifestFromRepo(
          'actions',
          'node-versions',
          this.nodeInfo.mirror && this.nodeInfo.mirrorToken
            ? this.nodeInfo.mirrorToken
            : this.nodeInfo.auth,
          'main'
        );
        if (isValidManifest(manifest)) {
          this.cacheManifest(manifestPath, manifest);
          return manifest;
        }
        lastError = new Error(invalidManifestMessage);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
      core.debug(
        `Attempt ${attempt}/${maxAttempts} to fetch the manifest failed: ${lastError.message}`
      );
      if (attempt < maxAttempts) {
        core.info(`Retrying to fetch the manifest...`);
        await new Promise(resolve =>
          setTimeout(resolve, 1000 * 2 ** (attempt - 1))
        ); // Retry after a delay
      }
    }
    throw new Error(
      `Failed to fetch a valid manifest after ${maxAttempts} attempts. Last error: ${lastError?.message}`
    );
  }

  /** @param {string | undefined} manifestPath */
  private getCachedManifest(
    manifestPath: string | undefined
  ): tc.IToolRelease[] | undefined {
    if (!manifestPath) {
      return undefined;
    }

    try {
      const manifest: unknown = JSON.parse(
        fs.readFileSync(manifestPath, 'utf8')
      );
      if (isValidManifest(manifest)) {
        core.debug(`Found manifest in ${manifestPath}`);
        return manifest;
      }
      core.debug(`Ignoring invalid manifest in ${manifestPath}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        core.debug(
          `Unable to read manifest from ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return undefined;
  }

  /**
   * @param {string | undefined} manifestPath
   * @param {tc.IToolRelease[]} manifest
   */
  private cacheManifest(
    manifestPath: string | undefined,
    manifest: tc.IToolRelease[]
  ): void {
    if (!manifestPath) {
      return;
    }

    try {
      fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    } catch (error) {
      core.debug(
        `Unable to cache manifest in ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private resolveLtsAliasFromManifest(
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

  private async getInfoFromManifest(
    versionSpec: string,
    stable: boolean,
    osArch: string,
    manifest: tc.IToolRelease[] | undefined
  ): Promise<INodeVersionInfo | null> {
    let info: INodeVersionInfo | null = null;
    if (!manifest) {
      core.debug('No manifest cached');
      manifest = await this.getManifest();
    }

    const rel = await tc.findFromManifest(
      versionSpec,
      stable,
      manifest,
      osArch
    );

    if (rel && rel.files.length > 0) {
      info = <INodeVersionInfo>{};
      info.resolvedVersion = rel.version;
      info.arch = rel.files[0].arch;
      info.downloadUrl = rel.files[0].download_url;
      info.fileName = rel.files[0].filename;
    }

    return info;
  }

  private isLtsAlias(versionSpec: string): boolean {
    return versionSpec.startsWith('lts/');
  }

  private isLatestSyntax(versionSpec): boolean {
    return ['current', 'latest', 'node'].includes(versionSpec);
  }

  private async verifyNodeVersion(installedDir: string) {
    // tool-cache layout: <root>/node/<version>/<arch>
    const expectedVersion = 'v' + path.basename(path.dirname(installedDir));
    let actualVersion = '';
    try {
      const {stdout} = await exec.getExecOutput('node', ['--version'], {
        silent: true
      });
      actualVersion = stdout.trim();
    } catch (err) {
      throw new Error(
        `Node installation failed. Node may not be installed or not on PATH: ${(err as Error).message}`,
        {cause: err}
      );
    }
    if (actualVersion !== expectedVersion) {
      core.debug(
        `Node installation failed: expected ${expectedVersion} but "node --version" reported ${actualVersion || '(empty)'} (installedDir: ${installedDir}).`
      );

      throw new Error(
        `Node ${expectedVersion} installation failed, likely due to an incomplete or corrupted download.`
      );
    }
  }
}
