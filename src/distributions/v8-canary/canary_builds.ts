import {INodejs} from '../base-models';
import NightlyNodejs from '../nightly/nightly_builds';

export default class CanaryBuild extends NightlyNodejs {
  constructor(nodeInfo: INodejs) {
    super(nodeInfo);
    this.distribution = 'v8-canary';
  }

  protected getDistributionUrl(): string {
    return 'https://nodejs.org/download/v8-canary';
  }
}
