import {v4 as uuidv4} from 'uuid';
import * as tc from '@actions/tool-cache';
import * as hc from '@actions/http-client';
import * as core from '@actions/core';
import * as io from '@actions/io';

import semver from 'semver';
import * as assert from 'assert';

import * as path from 'path';
import os from 'os';
import fs from 'fs';

import {NodeInputs, INodeVersion, INodeVersionInfo} from './base-models';

export default abstract class BaseDistribution {
  protected httpClient: hc.HttpClient;
  protected osPlat = os.platform();

  constructor(protected nodeInfo: NodeInputs) {
    this.httpClient = new hc.HttpClient('setup-node', [], {
      allowRetries: true,
      maxRetries: 3
    });
  }

  protected abstract getDistributionUrl(): string;

  public async setupNodeJs() {
    let nodeJsVersions: INodeVersion[] | undefined;
    if (this.nodeInfo.checkLatest) {
      const evaluatedVersion = await this.findVersionInDist(nodeJsVersions);
      this.nodeInfo.versionSpec = evaluatedVersion;
    }

    let toolPath = this.findVersionInHostedToolCacheDirectory();
    if (toolPath) {
      core.info(`Found in cache @ ${toolPath}`);
    } else {
      const evaluatedVersion = await this.findVersionInDist(nodeJsVersions);
      const toolName = this.getNodejsDistInfo(evaluatedVersion);
      toolPath = await this.downloadNodejs(toolName);
    }

    if (this.osPlat != 'win32') {
      toolPath = path.join(toolPath, 'bin');
    }

    core.addPath(toolPath);
  }

  protected async findVersionInDist(nodeJsVersions?: INodeVersion[]) {
    if (!nodeJsVersions) {
      nodeJsVersions = await this.getNodeJsVersions();
    }
    const versions = this.filterVersions(nodeJsVersions);
    const evaluatedVersion = this.evaluateVersions(versions);
    if (!evaluatedVersion) {
      throw new Error(
        `Unable to find Node version '${this.nodeInfo.versionSpec}' for platform ${this.osPlat} and architecture ${this.nodeInfo.arch}.`
      );
    }

    return evaluatedVersion;
  }

  protected evaluateVersions(versions: string[]): string {
    let version = '';

    const {range, options} = this.validRange(this.nodeInfo.versionSpec);

    core.debug(`evaluating ${versions.length} versions`);

    for (const potential of versions) {
      const satisfied: boolean = semver.satisfies(potential, range, options);
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

  protected findVersionInHostedToolCacheDirectory() {
    return tc.find(
      'node',
      this.nodeInfo.versionSpec,
      this.translateArchToDistUrl(this.nodeInfo.arch)
    );
  }

  protected async getNodeJsVersions(): Promise<INodeVersion[]> {
    const initialUrl = this.getDistributionUrl();
    const dataUrl = `${initialUrl}/index.json`;

    const response = await this.httpClient.getJson<INodeVersion[]>(dataUrl);
    return response.result || [];
  }

  protected getNodejsDistInfo(version: string) {
    const osArch: string = this.translateArchToDistUrl(this.nodeInfo.arch);
    version = semver.clean(version) || '';
    const fileName: string =
      this.osPlat == 'win32'
        ? `node-v${version}-win-${osArch}`
        : `node-v${version}-${this.osPlat}-${osArch}`;
    const urlFileName: string =
      this.osPlat == 'win32'
        ? this.nodeInfo.arch === 'arm64'
          ? `${fileName}.zip`
          : `${fileName}.7z`
        : `${fileName}.tar.gz`;
    const initialUrl = this.getDistributionUrl();
    const url = `${initialUrl}/v${version}/${urlFileName}`;

    return <INodeVersionInfo>{
      downloadUrl: url,
      resolvedVersion: version,
      arch: osArch,
      fileName: fileName
    };
  }

  protected async downloadNodejs(info: INodeVersionInfo) {
    let downloadPath = '';
    core.info(
      `Acquiring ${info.resolvedVersion} - ${info.arch} from ${info.downloadUrl}`
    );
    try {
      downloadPath = await tc.downloadTool(info.downloadUrl);
    } catch (err) {
      if (
        err instanceof tc.HTTPError &&
        err.httpStatusCode == 404 &&
        this.osPlat == 'win32'
      ) {
        return await this.acquireWindowsNodeFromFallbackLocation(
          info.resolvedVersion,
          info.arch
        );
      }

      throw err;
    }

    const toolPath = await this.extractArchive(downloadPath, info);
    core.info('Done');

    return toolPath;
  }

  protected validRange(versionSpec: string) {
    let options: semver.RangeOptions | undefined;
    const c = semver.clean(versionSpec) || '';
    const valid = semver.valid(c) ?? versionSpec;

    return {range: valid, options};
  }

  protected async acquireWindowsNodeFromFallbackLocation(
    version: string,
    arch: string = os.arch()
  ): Promise<string> {
    const initialUrl = this.getDistributionUrl();
    const osArch: string = this.translateArchToDistUrl(arch);

    // Create temporary folder to download to
    const tempDownloadFolder = `temp_${uuidv4()}`;
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

    const toolPath = await tc.cacheDir(tempDir, 'node', version, arch);

    return toolPath;
  }

  protected async extractArchive(
    downloadPath: string,
    info: INodeVersionInfo | null
  ) {
    //
    // Extract
    //
    core.info('Extracting ...');
    let extPath: string;
    info = info || ({} as INodeVersionInfo); // satisfy compiler, never null when reaches here
    if (this.osPlat == 'win32') {
      const extension = this.nodeInfo.arch === 'arm64' ? '.zip' : '.7z';
      // Rename archive to add extension because after downloading
      // archive does not contain extension type and it leads to some issues
      // on Windows runners without PowerShell Core.
      //
      // For default PowerShell Windows it should contain extension type to unpack it.
      if (extension === '.zip') {
        const renamedArchive = `${downloadPath}.zip`;
        fs.renameSync(downloadPath, renamedArchive);
        extPath = await tc.extractZip(renamedArchive);
      } else {
        const _7zPath = path.join(__dirname, '../..', 'externals', '7zr.exe');
        extPath = await tc.extract7z(downloadPath, undefined, _7zPath);
      }
      // 7z extracts to folder matching file name
      const nestedPath = path.join(
        extPath,
        path.basename(info.fileName, extension)
      );
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
    const toolPath = await tc.cacheDir(
      extPath,
      'node',
      info.resolvedVersion,
      info.arch
    );

    return toolPath;
  }

  protected getDistFileName(): string {
    const osArch: string = this.translateArchToDistUrl(this.nodeInfo.arch);

    // node offers a json list of versions
    let dataFileName: string;
    switch (this.osPlat) {
      case 'linux':
        dataFileName = `linux-${osArch}`;
        break;
      case 'darwin':
        dataFileName = `osx-${osArch}-tar`;
        break;
      case 'win32':
        if (this.nodeInfo.arch === 'arm64') {
          dataFileName = `win-${osArch}-zip`;
        } else {
          dataFileName = `win-${osArch}-exe`;
        }
        break;
      default:
        throw new Error(`Unexpected OS '${this.osPlat}'`);
    }

    return dataFileName;
  }

  protected filterVersions(nodeJsVersions: INodeVersion[]) {
    const versions: string[] = [];

    const dataFileName = this.getDistFileName();

    nodeJsVersions.forEach((nodeVersion: INodeVersion) => {
      // ensure this version supports your os and platform
      if (nodeVersion.files.indexOf(dataFileName) >= 0) {
        versions.push(nodeVersion.version);
      }
    });

    return versions.sort(semver.rcompare);
  }

  protected translateArchToDistUrl(arch: string): string {
    switch (arch) {
      case 'arm':
        return 'armv7l';
      default:
        return arch;
    }
  }
}
