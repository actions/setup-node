import BasePrereleaseNodejs from '../base-distribution-prerelease';
import {NodeInputs} from '../base-models';
export default class CanaryBuild extends BasePrereleaseNodejs {
  protected distribution = 'v8-canary';
  constructor(nodeInfo: NodeInputs) {
    super(nodeInfo);
  }

  protected getDistributionUrl(): string {
    if (this.nodeInfo.mirrorURL) {
      return this.nodeInfo.mirrorURL;
    } else {
      return 'https://nodejs.org/download/v8-canary';
    }
  }
}
