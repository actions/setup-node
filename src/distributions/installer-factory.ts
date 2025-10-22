import BaseDistribution from './base-distribution.js';
import {NodeInputs} from './base-models.js';
import NightlyNodejs from './nightly/nightly_builds.js';
import OfficialBuilds from './official_builds/official_builds.js';
import RcBuild from './rc/rc_builds.js';
import CanaryBuild from './v8-canary/canary_builds.js';

enum Distributions {
  DEFAULT = '',
  CANARY = 'v8-canary',
  NIGHTLY = 'nightly',
  RC = 'rc'
}

export function getNodejsDistribution(
  installerOptions: NodeInputs
): BaseDistribution {
  const versionSpec = installerOptions.versionSpec;
  let distribution: BaseDistribution;
  if (versionSpec.includes(Distributions.NIGHTLY)) {
    distribution = new NightlyNodejs(installerOptions);
  } else if (versionSpec.includes(Distributions.CANARY)) {
    distribution = new CanaryBuild(installerOptions);
  } else if (versionSpec.includes(Distributions.RC)) {
    distribution = new RcBuild(installerOptions);
  } else {
    distribution = new OfficialBuilds(installerOptions);
  }

  return distribution;
}
