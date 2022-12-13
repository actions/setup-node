import * as core from '@actions/core';

import semver from 'semver';

import BaseDistribution from '../base-distribution';
import {INodejs, INodeVersion} from '../base-models';

export default class CanaryBuild extends BaseDistribution {
  protected evaluateVersions(nodeVersions: INodeVersion[]): string {
    let version = '';
    const versions = this.filterVersions(nodeVersions);

    core.debug(`evaluating ${versions.length} versions`);

    const {includePrerelease, range} = this.createRangePreRelease(
      this.nodeInfo.versionSpec,
      '-v8-canary'
    );

    for (let i = versions.length - 1; i >= 0; i--) {
      const potential: string = versions[i];
      const satisfied: boolean = semver.satisfies(potential, range, {
        includePrerelease: includePrerelease
      });
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
  constructor(nodeInfo: INodejs) {
    super(nodeInfo);
  }
  protected getDistributionUrl(): string {
    return 'https://nodejs.org/download/v8-canary';
  }

  async getNodejsVersions(): Promise<INodeVersion[]> {
    const initialUrl = this.getDistributionUrl();
    const dataUrl = `${initialUrl}/index.json`;

    let response = await this.httpClient.getJson<INodeVersion[]>(dataUrl);
    return response.result || [];
  }

  createRangePreRelease(versionSpec: string, distribution: string = '') {
    let range: string | undefined;
    const [raw, prerelease] = this.splitVersionSpec(versionSpec);
    const isValidVersion = semver.valid(raw);
    const rawVersion = (isValidVersion ? raw : semver.coerce(raw))!;

    if (`-${prerelease}` !== distribution) {
      range = `${rawVersion}${`-${prerelease}`.replace(
        distribution,
        `${distribution}.`
      )}`;
    } else {
      range = `${semver.validRange(`^${rawVersion}${distribution}`)}-0`;
    }

    return {range, includePrerelease: !isValidVersion};
  }

  splitVersionSpec(versionSpec: string) {
    return versionSpec.split(/-(.*)/s);
  }
}
