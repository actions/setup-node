import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import path from 'path';

import BaseDistribution from '../base-distribution';
import {NodeInputs, INodeVersion, INodeVersionInfo} from '../base-models';

interface INodeRelease extends tc.IToolRelease {
  lts?: string;
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
      const resolvedVersion = await this.resolveVersionFromManifest(
        this.nodeInfo.versionSpec,
        this.nodeInfo.stable,
        osArch,
        manifest
      );
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
      this.addToolPath(toolPath);
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
          this.nodeInfo.auth
        );

        if (downloadPath) {
          toolPath = await this.extractArchive(downloadPath, versionInfo);
        }
      } else {
        core.info(
          'Not found in manifest. Falling back to download directly from Node'
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

    if (this.osPlat != 'win32') {
      toolPath = path.join(toolPath, 'bin');
    }

    core.addPath(toolPath);
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

  protected getDistributionUrl(): string {
    return `https://nodejs.org/dist`;
  }

  private getManifest(): Promise<tc.IToolRelease[]> {
    core.debug('Getting manifest from actions/node-versions@main');
    return tc.getManifestFromRepo(
      'actions',
      'node-versions',
      this.nodeInfo.auth,
      'main'
    );
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

  private async resolveVersionFromManifest(
    versionSpec: string,
    stable: boolean,
    osArch: string,
    manifest: tc.IToolRelease[] | undefined
  ): Promise<string | undefined> {
    try {
      const info = await this.getInfoFromManifest(
        versionSpec,
        stable,
        osArch,
        manifest
      );
      return info?.resolvedVersion;
    } catch (err) {
      core.info('Unable to resolve version from manifest...');
      core.debug((err as Error).message);
    }
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
}
