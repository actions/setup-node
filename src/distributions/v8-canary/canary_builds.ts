import BasePrereleaseNodejs from '../base-distribution-prerelease.js';
import {NodeInputs} from '../base-models.js';

export default class CanaryBuild extends BasePrereleaseNodejs {
  protected distribution = 'v8-canary';
  constructor(nodeInfo: NodeInputs) {
    super(nodeInfo);
  }

  protected getDistributionUrl(mirror: string): string {
    const url = mirror || 'https://nodejs.org';
    return `${url}/download/v8-canary`;
  }
}
