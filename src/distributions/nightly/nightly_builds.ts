import BasePrereleaseNodejs from '../base-distribution-prerelease.js';
import {NodeInputs} from '../base-models.js';

export default class NightlyNodejs extends BasePrereleaseNodejs {
  protected distribution = 'nightly';
  constructor(nodeInfo: NodeInputs) {
    super(nodeInfo);
  }

  protected getDistributionUrl(mirror: string): string {
    const url = mirror || 'https://nodejs.org';
    return `${url}/download/nightly`;
  }
}
