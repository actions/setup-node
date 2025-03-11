import BaseDistribution from '../base-distribution';
import {NodeInputs} from '../base-models';

export default class RcBuild extends BaseDistribution {
  constructor(nodeInfo: NodeInputs) {
    super(nodeInfo);
  }
  protected getDistributionUrl(): string {
    if (this.nodeInfo.mirrorURL) {
      return this.nodeInfo.mirrorURL;
    } else {
      return 'https://nodejs.org/download/rc';
    }
  }
}
