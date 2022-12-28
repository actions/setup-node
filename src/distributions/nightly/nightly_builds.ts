import BasePrereleaseNodejs from '../base-distribution-prerelease';
import {NodeInputs} from '../base-models';

export default class NightlyNodejs extends BasePrereleaseNodejs {
  protected distribution = 'nightly';
  constructor(nodeInfo: NodeInputs) {
    super(nodeInfo);
  }

  protected getDistributionUrl(): string {
    return 'https://nodejs.org/download/nightly';
  }
}
