import BaseDistribution from '../base-distribution';
import {NodeInputs} from '../base-models';
import * as core from '@actions/core';

export default class RcBuild extends BaseDistribution {
  getDistributionMirrorUrl() {
    throw new Error('Method not implemented.');
  }

  constructor(nodeInfo: NodeInputs) {
    super(nodeInfo);
  }
  protected getDistributionUrl(): string {
    if (this.nodeInfo.mirrorURL) {
      if (this.nodeInfo.mirrorURL != '') {
        return this.nodeInfo.mirrorURL;
      } else {
        if (this.nodeInfo.mirrorURL === '') {
          throw new Error(
            'Mirror URL is empty. Please provide a valid mirror URL.'
          );
        } else {
          throw new Error('Mirror URL is not a valid');
        }
      }
    } else {
      return 'https://nodejs.org/download/rc';
    }
  }
}
