import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import semver from 'semver';

import BaseDistribution from '../base-distribution';
import {INodejs} from '../base-models';

export default class CanaryBuild extends BaseDistribution {
  protected distribution = 'v8-canary';
  constructor(nodeInfo: INodejs) {
    super(nodeInfo);
  }

  protected findVersionInHoostedToolCacheDirectory(): string {
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

  protected evaluateVersions(versions: string[]): string {
    let version = '';

    core.debug(`evaluating ${versions.length} versions`);

    const {includePrerelease, range} = this.createRangePreRelease(
      this.nodeInfo.versionSpec
    );

    for (let i = 0; i < versions.length; i++) {
      const potential: string = versions[i];
      const satisfied: boolean = semver.satisfies(
        potential.replace(this.distribution, `${this.distribution}.`),
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

  protected createRangePreRelease(versionSpec: string) {
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

    return {range, includePrerelease: !isValidVersion};
  }

  protected splitVersionSpec(versionSpec: string) {
    return versionSpec.split(/-(.*)/s);
  }
}
