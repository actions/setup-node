import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import semver from 'semver';

import BaseDistribution from '../base-distribution';
import {INodejs, INodeVersion} from '../base-models';

export default class NightlyNodejs extends BaseDistribution {
  constructor(nodeInfo: INodejs) {
    super(nodeInfo);
  }

  protected findVersionInHoostedToolCacheDirectory(): string {
    const localVersionPaths = tc
      .findAllVersions('node', this.nodeInfo.arch)
      .filter(i => {
        const prerelease = semver.prerelease(i);
        if (!prerelease) {
          return false;
        }

        return prerelease[0].includes('nightly');
      });
    const localVersion = this.evaluateVersions(localVersionPaths);
    const toolPath = tc.find('node', localVersion, this.nodeInfo.arch);

    return toolPath;
  }

  protected evaluateVersions(versions: string[]): string {
    let version = '';

    core.debug(`evaluating ${versions.length} versions`);

    const {includePrerelease, range} = this.createRangePreRelease(
      this.nodeInfo.versionSpec,
      'nightly'
    );

    for (let i = 0; i < versions.length; i++) {
      const potential: string = versions[i];
      const satisfied: boolean = semver.satisfies(
        potential.replace('nightly', 'nightly.'),
        range,
        {
          includePrerelease: includePrerelease
        }
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
    return 'https://nodejs.org/download/nightly';
  }

  async getNodejsVersions(): Promise<INodeVersion[]> {
    const initialUrl = this.getDistributionUrl();
    const dataUrl = `${initialUrl}/index.json`;

    let response = await this.httpClient.getJson<INodeVersion[]>(dataUrl);
    return response.result || [];
  }

  protected createRangePreRelease(
    versionSpec: string,
    distribution: string = ''
  ) {
    let range: string;
    const [raw, prerelease] = this.splitVersionSpec(versionSpec);
    const isValidVersion = semver.valid(raw);
    const rawVersion = (isValidVersion ? raw : semver.coerce(raw))!;

    if (prerelease !== distribution) {
      range = `${rawVersion}-${prerelease.replace(
        distribution,
        `${distribution}.`
      )}`;
    } else {
      range = `${semver.validRange(`^${rawVersion}-${distribution}`)}-0`;
    }

    return {range, includePrerelease: !isValidVersion};
  }

  protected splitVersionSpec(versionSpec: string) {
    return versionSpec.split(/-(.*)/s);
  }
}
