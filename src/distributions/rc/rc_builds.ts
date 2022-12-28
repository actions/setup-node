import BaseDistribution from '../base-distribution';
import {NodeInputs} from '../base-models';

export default class RcBuild extends BaseDistribution {
  constructor(nodeInfo: NodeInputs) {
    super(nodeInfo);
  }

  getDistributionUrl(): string {
    return 'https://nodejs.org/download/rc';
  }
}
