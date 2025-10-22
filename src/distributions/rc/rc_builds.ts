import BaseDistribution from '../base-distribution.js';
import {NodeInputs} from '../base-models.js';

export default class RcBuild extends BaseDistribution {
  constructor(nodeInfo: NodeInputs) {
    super(nodeInfo);
  }

  getDistributionUrl(mirror: string): string {
    const url = mirror || 'https://nodejs.org';
    return `${url}/download/rc`;
  }
}
