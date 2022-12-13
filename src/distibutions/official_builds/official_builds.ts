import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import * as semver from 'semver';
import os from 'os';

import {INodeVersion} from '../../installer';
import BaseDistribution from '../base-distribution';
import {INodejs, INodeVersionInfo} from '../base-models';

interface INodeRelease extends tc.IToolRelease {
  lts?: string;
}

export default class OfficialBuilds extends BaseDistribution {
  constructor(nodeInfo: INodejs) {
    super(nodeInfo);
  }

  protected async queryDistForMatch(
    versionSpec: string,
    arch: string = os.arch(),
    nodeVersions: INodeVersion[]
  ): Promise<string> {
    let osPlat: string = os.platform();
    let osArch: string = this.translateArchToDistUrl(arch);

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

    if (this.isLatestSyntax(versionSpec)) {
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
    const version = this.evaluateVersions(nodeVersions);
    return version;
  }

  public async getNodeJsInfo() {
    let manifest: tc.IToolRelease[] = [];
    let nodeVersions: INodeVersion[] = [];
    if (this.isLtsAlias(this.nodeInfo.versionSpec)) {
      core.info('Attempt to resolve LTS alias from manifest...');

      // No try-catch since it's not possible to resolve LTS alias without manifest
      manifest = await this.getManifest();

      this.nodeInfo.versionSpec = this.resolveLtsAliasFromManifest(
        this.nodeInfo.versionSpec,
        true,
        manifest
      );
    }

    if (this.isLatestSyntax(this.nodeInfo.versionSpec)) {
      nodeVersions = await this.getNodejsVersions();
      this.nodeInfo.versionSpec = await this.queryDistForMatch(
        this.nodeInfo.versionSpec,
        this.nodeInfo.arch,
        nodeVersions
      );
      core.info(`getting latest node version...`);
    }

    let toolPath = this.findVersionInHoostedToolCacheDirectory();

    if (!toolPath) {
      try {
        const versionInfo = await this.getInfoFromManifest(
          this.nodeInfo.versionSpec,
          true,
          this.nodeInfo.auth,
          this.nodeInfo.arch,
          undefined
        );
        if (versionInfo) {
          core.info(
            `Acquiring ${versionInfo.resolvedVersion} - ${versionInfo.arch} from ${versionInfo.downloadUrl}`
          );
          toolPath = await tc.downloadTool(
            versionInfo.downloadUrl,
            undefined,
            this.nodeInfo.auth
          );
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

      const versions = await this.getNodejsVersions();
      const evaluatedVersion = this.evaluateVersions(versions);
      const toolName = this.getNodejsDistInfo(evaluatedVersion, this.osPlat);
      toolPath = await this.downloadNodejs(toolName);
    }

    core.addPath(toolPath);
  }

  protected evaluateVersions(nodeVersions: INodeVersion[]): string {
    let version = '';
    const versions = this.filterVersions(nodeVersions);

    if (this.isLatestSyntax(this.nodeInfo.versionSpec)) {
      core.info(`getting latest node version...`);
      return versions[0];
    }

    core.debug(`evaluating ${versions.length} versions`);

    for (let i = versions.length - 1; i >= 0; i--) {
      const potential: string = versions[i];
      const satisfied: boolean = semver.satisfies(
        potential,
        this.nodeInfo.versionSpec
      );
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

  protected getDistributionUrl(): string {
    return `https://nodejs.org/dist`;
  }

  protected async getNodejsVersions(): Promise<INodeVersion[]> {
    const initialUrl = this.getDistributionUrl();
    const dataUrl = `${initialUrl}/index.json`;

    let response = await this.httpClient.getJson<INodeVersion[]>(dataUrl);
    return response.result || [];
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

  private async getInfoFromManifest(
    versionSpec: string,
    stable: boolean,
    auth: string | undefined,
    osArch: string = this.translateArchToDistUrl(os.arch()),
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
