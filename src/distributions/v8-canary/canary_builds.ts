import BasePrereleaseNodejs from '../base-distribution-prerelease';
import {NodeInputs} from '../base-models';
import * as core from '@actions/core';
export default class CanaryBuild extends BasePrereleaseNodejs {
  
  protected distribution = 'v8-canary';
  constructor(nodeInfo: NodeInputs) {
    super(nodeInfo);
  }

  protected getDistributionUrl(): string {
    return 'https://nodejs.org/download/v8-canary';
  }

  protected getDistributionMirrorUrl(): string {
    // Check if mirrorUrl exists in the nodeInfo and return it if available
    const mirrorUrl = this.nodeInfo.mirrorURL;
    if (mirrorUrl) {
      core.info(`Using mirror URL: ${mirrorUrl}`);
      return mirrorUrl;
    }
    return 'https://nodejs.org/download/v8-canary';
  }
}
