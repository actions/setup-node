import BaseDistribution from '../base-distribution';
import {INodejs} from '../base-models';

export default class RcBuild extends BaseDistribution {
  constructor(nodeInfo: INodejs) {
    super(nodeInfo);
  }

  getDistributionUrl(): string {
    return 'https://nodejs.org/download/rc';
  }
}
