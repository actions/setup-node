import * as tc from '@actions/tool-cache';

import semver from 'semver';

import BaseDistribution from '../base-distribution';
import {INodejs} from '../base-models';

export default class CanaryBuild extends BaseDistribution {
  protected distribution = 'v8-canary';
  constructor(nodeInfo: INodejs) {
    super(nodeInfo);
  }

  protected findVersionInHostedToolCacheDirectory(): string {
    let toolPath = '';
    const localVersionPaths = tc
      .findAllVersions('node', this.nodeInfo.arch)
      .filter(i => {
        const prerelease = semver.prerelease(i);
        if (!prerelease) {
          return false;
        }

        return prerelease[0].includes(this.distribution);
      });
    localVersionPaths.sort(semver.rcompare);
    const localVersion = this.evaluateVersions(localVersionPaths);
    if (localVersion) {
      toolPath = tc.find('node', localVersion, this.nodeInfo.arch);
    }

    return toolPath;
  }

  protected getDistributionUrl(): string {
    return 'https://nodejs.org/download/v8-canary';
  }

  protected validRange(versionSpec: string) {
    let range: string;
    const [raw, prerelease] = this.splitVersionSpec(versionSpec);
    const isValidVersion = semver.valid(raw);
    const rawVersion = (isValidVersion ? raw : semver.coerce(raw))!;

    if (prerelease !== this.distribution) {
      range = `${rawVersion}-${prerelease.replace(
        this.distribution,
        `${this.distribution}.`
      )}`;
    } else {
      range = `${semver.validRange(`^${rawVersion}-${this.distribution}`)}-0`;
    }

    return {range, options: {includePrerelease: !isValidVersion}};
  }

  protected splitVersionSpec(versionSpec: string) {
    return versionSpec.split(/-(.*)/s);
  }
}
