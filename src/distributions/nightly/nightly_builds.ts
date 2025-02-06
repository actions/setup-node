import BasePrereleaseNodejs from '../base-distribution-prerelease';
import {NodeInputs} from '../base-models';
import * as core from '@actions/core';

export default class NightlyNodejs extends BasePrereleaseNodejs {
  
  protected distribution = 'nightly';

  constructor(nodeInfo: NodeInputs) {
    super(nodeInfo);
  }

  protected getDistributionMirrorUrl(): string {
    // Implement the method to return the mirror URL or an empty string if not available
    return this.nodeInfo.mirrorURL || '';
  }

  // Updated getDistributionUrl method to handle mirror URL or fallback
  protected getDistributionUrl(): string {
    // Check if mirrorUrl exists in the nodeInfo and return it if available
    const mirrorUrl = this.nodeInfo.mirrorURL;
    if (mirrorUrl) {
      core.info(`Downloding Using mirror URL: ${mirrorUrl}`);
      return mirrorUrl;
    }

    // Default to the official Node.js nightly distribution URL if no mirror URL is provided
    core.info('Using default distribution URL for nightly Node.js.');
    return 'https://nodejs.org/download/nightly';
  }
}
