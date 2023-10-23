import * as tc from '@actions/tool-cache';

import semver from 'semver';

import BaseDistribution from './base-distribution';
import {NodeInputs} from './base-models';

export default abstract class BasePrereleaseNodejs extends BaseDistribution {
  protected abstract distribution: string;
  constructor(nodeInfo: NodeInputs) {
    super(nodeInfo);
  }

  protected findVersionInHostedToolCacheDirectory(): string {
    let toolPath = '';
    const localVersionPaths = tc
      .findAllVersions('node', this.nodeInfo.arch)
      .filter(i => {
        const prerelease = semver.prerelease(i, {});
        if (!prerelease) {
          return false;
        }

        return prerelease[0].toString().includes(this.distribution);
      });
    localVersionPaths.sort(semver.rcompare);
    const localVersion = this.evaluateVersions(localVersionPaths);
    if (localVersion) {
      toolPath = tc.find('node', localVersion, this.nodeInfo.arch);
    }

    return toolPath;
  }

  protected validRange(versionSpec: string) {
    let range: string;
    const [raw, prerelease] = this.splitVersionSpec(versionSpec);
    const isValidVersion = semver.valid(raw);
    const rawVersion = (isValidVersion ? raw : semver.coerce(raw))!;

    if (prerelease !== this.distribution) {
      range = versionSpec;
    } else {
      range = `${semver.validRange(`^${rawVersion}-${this.distribution}`)}-0`;
    }

    return {range, options: {includePrerelease: !isValidVersion}};
  }

  protected splitVersionSpec(versionSpec: string) {
    return versionSpec.split(/-(.*)/s);
  }
}
