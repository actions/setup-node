import * as tc from '@actions/tool-cache';
import * as hc from '@actions/http-client';
import * as core from '@actions/core';
import * as io from '@actions/io';

import semver from 'semver';
import * as assert from 'assert';

import * as path from 'path';
import * as os from 'os';
import fs from 'fs';

import {INodejs, INodeVersion, INodeVersionInfo} from './base-models';

export default abstract class BaseDistribution {
  protected httpClient: hc.HttpClient;
  protected osPlat = os.platform();

  constructor(protected nodeInfo: INodejs) {
    this.httpClient = new hc.HttpClient('setup-node', [], {
      allowRetries: true,
      maxRetries: 3
    });
  }

  protected abstract getDistributionUrl(): string;
  protected abstract evaluateVersions(nodeVersions: string[]): string;

  public async getNodeJsInfo() {
    let toolPath = this.findVersionInHoostedToolCacheDirectory();
    if (!toolPath) {
      const nodeVersions = await this.getNodejsVersions();
      const versions = this.filterVersions(nodeVersions);
      const evaluatedVersion = this.evaluateVersions(versions);
      const toolName = this.getNodejsDistInfo(evaluatedVersion, this.osPlat);
      toolPath = await this.downloadNodejs(toolName);
    }

    if (this.osPlat != 'win32') {
      toolPath = path.join(toolPath, 'bin');
    }

    core.addPath(toolPath);
  }

  protected findVersionInHoostedToolCacheDirectory() {
    return tc.find('node', this.nodeInfo.versionSpec, this.nodeInfo.arch);
  }

  protected async getNodejsVersions(): Promise<INodeVersion[]> {
    const initialUrl = this.getDistributionUrl();
    const dataUrl = `${initialUrl}/index.json`;

    let response = await this.httpClient.getJson<INodeVersion[]>(dataUrl);
    return response.result || [];
  }

  protected getNodejsDistInfo(version: string, osPlat: string) {
    let osArch: string = this.translateArchToDistUrl(this.nodeInfo.arch);
    version = semver.clean(version) || '';
    let fileName: string =
      osPlat == 'win32'
        ? `node-v${version}-win-${osArch}`
        : `node-v${version}-${osPlat}-${osArch}`;
    let urlFileName: string =
      osPlat == 'win32' ? `${fileName}.7z` : `${fileName}.tar.gz`;
    const initialUrl = this.getDistributionUrl();
    const url = `${initialUrl}/v${version}/${urlFileName}`;

    return <INodeVersionInfo>{
      downloadUrl: url,
      resolvedVersion: version,
      arch: osArch, // have to be arch but not osArch,
      fileName: fileName
    };
  }

  protected async downloadNodejs(info: INodeVersionInfo) {
    let osPlat: string = os.platform();
    let downloadPath = '';
    try {
      downloadPath = await tc.downloadTool(info.downloadUrl);
    } catch (err) {
      if (err instanceof tc.HTTPError && err.httpStatusCode == 404) {
        return await this.acquireNodeFromFallbackLocation(
          info.resolvedVersion,
          info.arch
        );
      }

      throw err;
    }

    let toolPath = await this.extractArchive(downloadPath, info);
    core.info('Done');

    return toolPath;
  }

  protected async acquireNodeFromFallbackLocation(
    version: string,
    arch: string = os.arch()
  ): Promise<string> {
    const initialUrl = this.getDistributionUrl();
    let osArch: string = this.translateArchToDistUrl(arch);

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
    const toolPath = await tc.cacheDir(
      extPath,
      'node',
      info.resolvedVersion,
      info.arch
    );

    return toolPath;
  }

  protected getDistFileName(arch: string = os.arch()): string {
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

    return dataFileName;
  }

  protected filterVersions(nodeVersions: INodeVersion[]) {
    let versions: string[] = [];

    const dataFileName = this.getDistFileName(this.nodeInfo.arch);

    nodeVersions.forEach((nodeVersion: INodeVersion) => {
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
