import BaseDistribution from '../base-distribution';
import {NodeInputs} from '../base-models';
import * as core from '@actions/core';

export default class RcBuild extends BaseDistribution {

  constructor(nodeInfo: NodeInputs) {
    super(nodeInfo);
  }

  getDistributionUrl(): string {
    return 'https://nodejs.org/download/rc';
  }

  protected getDistributionMirrorUrl(): string {
    // Check if mirrorUrl exists in the nodeInfo and return it if available
    const mirrorUrl = this.nodeInfo.mirrorURL;
    if (mirrorUrl) {
      core.info(`Using mirror URL: ${mirrorUrl}`);
      return mirrorUrl;
    }

    // Return the default URL if no mirror URL is provided
    return this.getDistributionUrl();
  }
}
