import BaseDistribution from '../base-distribution';
import {NodeInputs} from '../base-models';

export default class RcBuild extends BaseDistribution {
  constructor(nodeInfo: NodeInputs) {
    super(nodeInfo);
  }

  getDistributionUrl(mirror: string): string {
    const url = mirror || 'https://nodejs.org';
    return `${url}/download/rc`;
  }
}
