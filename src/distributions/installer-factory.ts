import BaseDistribution from './base-distribution';
import {INodejs} from './base-models';
import NightlyNodejs from './nightly/nightly_builds';
import OfficialBuilds from './official_builds/official_builds';
import RcBuild from './rc/rc_builds';
import CanaryBuild from './v8-canary/canary_builds';

enum Distributions {
  DEFAULT = '',
  CANARY = 'v8-canary',
  NIGHTLY = 'nightly',
  RC = 'rc'
}

function identifyDistribution(versionSpec: string) {
  let distribution = Distributions.DEFAULT;
  if (versionSpec.includes(Distributions.NIGHTLY)) {
    distribution = Distributions.NIGHTLY;
  } else if (versionSpec.includes(Distributions.CANARY)) {
    distribution = Distributions.CANARY;
  } else if (versionSpec.includes(Distributions.RC)) {
    distribution = Distributions.RC;
  }

  return distribution;
}

export function getNodejsDistribution(
  installerOptions: INodejs
): BaseDistribution {
  const distributionName = identifyDistribution(installerOptions.versionSpec);
  switch (distributionName) {
    case Distributions.NIGHTLY:
      return new NightlyNodejs(installerOptions);
    case Distributions.CANARY:
      return new CanaryBuild(installerOptions);
    case Distributions.RC:
      return new RcBuild(installerOptions);
    default:
      return new OfficialBuilds(installerOptions);
  }
}
