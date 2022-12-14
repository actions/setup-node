import * as core from '@actions/core';

import * as semver from 'semver';

import BaseDistribution from '../../base-distribution';
import {INodejs, INodeVersion} from '../../base-models';

export default class RcBuild extends BaseDistribution {
  constructor(nodeInfo: INodejs) {
    super(nodeInfo);
  }

  protected evaluateVersions(versions: string[]): string {
    let version = '';

    core.debug(`evaluating ${versions.length} versions`);

    for (let i = 0; i < versions.length; i++) {
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

  getDistributionUrl(): string {
    return 'https://nodejs.org/download/rc';
  }
}
