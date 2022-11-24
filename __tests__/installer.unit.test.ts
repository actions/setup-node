import semver from 'semver';
import {
  canaryExactVersionMatcherFactory,
  canaryRangeVersionMatcherFactory,
  distributionOf,
  Distributions,
  evaluateVersions,
  getNodejsDistUrl,
  nightlyExactVersionMatcherFactory,
  nightlyRangeVersionMatcherFactory,
  semverVersionMatcherFactory,
  splitVersionSpec,
  versionMatcherFactory
} from '../src/installer';

describe('setup-node unit tests', () => {
  describe('splitVersionSpec', () => {
    it('splitVersionSpec correctly splits version spec without dashes', () => {
      const [raw, prerelease] = splitVersionSpec('1.1.1')
      expect(raw).toBe('1.1.1')
      expect(prerelease).toBeUndefined()
    })
    it('splitVersionSpec correctly splits version spec with one dash', () => {
      const [raw, prerelease] = splitVersionSpec('1.1.1-nightly12345678')
      expect(raw).toBe('1.1.1')
      expect(prerelease).toBe('nightly12345678')
    })
    it('splitVersionSpec correctly splits version spec with 2 dashes', () => {
      const [raw, prerelease] = splitVersionSpec('1.1.1-v8-canary12345678')
      expect(raw).toBe('1.1.1')
      expect(prerelease).toBe('v8-canary12345678')
    })
  })

  describe('distributionOf', () => {
    it('1.1.1-v8-canary should be CANARY', () => {
      expect(distributionOf('1.1.1-v8-canary')).toBe(Distributions.CANARY)
    })
    it('1.1.1-v8-canary20221103f7e2421e91 should be CANARY', () => {
      expect(distributionOf('1.1.1-v8-canary20221103f7e2421e91')).toBe(Distributions.CANARY)
    })
    it('1.1.1-canary should throw exception', () => {
      expect(() => distributionOf('1.1.1-canary')).toThrow('Canary version must have "-v8-canary suffix"')
    })
    it('1.1.1-canary20221103f7e2421e91 should throw exception', () => {
      expect(() => distributionOf('1.1.1-canary20221103f7e2421e91')).toThrow('Canary version must have "-v8-canary suffix"')
    })
    it('1.1.1-nightly should be NIGHTLY', () => {
      expect(distributionOf('1.1.1-nightly')).toBe(Distributions.NIGHTLY)
    })
    it('1.1.1-nightly20221103f7e2421e91 should be NIGHTLY', () => {
      expect(distributionOf('1.1.1-nightly20221103f7e2421e91')).toBe(Distributions.NIGHTLY)
    })
    it('1.1.1-rc.0 should be RC', () => {
      expect(distributionOf('1.1.1-rc.0')).toBe(Distributions.RC)
    })
  })

  describe('versionMatcherFactory', () => {
    it('1.1.1 should be handled by semverVersionMatcherFactory', () => {
      expect(versionMatcherFactory('1.1.1').factory).toBe(semverVersionMatcherFactory)
    })
    it('v1.1.1 should be handled by semverVersionMatcherFactory', () => {
      expect(versionMatcherFactory('v1.1.1').factory).toBe(semverVersionMatcherFactory)
    })
    it('v1.1.1-v8-canary should be handled by canaryRangeVersionMatcherFactory', () => {
      expect(versionMatcherFactory('v1.1.1-v8-canary').factory).toBe(canaryRangeVersionMatcherFactory)
    })
    it('v1.1.1-v8-canary123 should be handled by canaryExactVersionMatcherFactory', () => {
      expect(versionMatcherFactory('v1.1.1-v8-canary123').factory).toBe(canaryExactVersionMatcherFactory)
    })
    it('v1.1.1-nightly should be handled by nightlyRangeVersionMatcherFactory', () => {
      expect(versionMatcherFactory('v1.1.1-nightly').factory).toBe(nightlyRangeVersionMatcherFactory)
    })
    it('v1.1.1-nigthly123 should be handled by nightlyExactVersionMatcherFactory', () => {
      expect(versionMatcherFactory('v1.1.1-nightly123').factory).toBe(nightlyExactVersionMatcherFactory)
    })
    it('v1.1.1-rc should be handled by semverVersionMatcherFactory', () => {
      expect(versionMatcherFactory('v1.1.1-rc').factory).toBe(semverVersionMatcherFactory)
    })
    it('v1.1.1-rc.1 should be handled by semverVersionMatcherFactory', () => {
      expect(versionMatcherFactory('v1.1.1-rc.1').factory).toBe(semverVersionMatcherFactory)
    })
  })

  describe('Version spec matchers', () => {
    it('semverVersionMatcher should always work as semver.satisfies does', () => {
      const rangePlain = '1.1.1'
      const matcherPlain = semverVersionMatcherFactory(rangePlain)
      expect(matcherPlain('1.1.1')).toBe(semver.satisfies('1.1.1', rangePlain))
      expect(matcherPlain('1.1.2')).toBe(semver.satisfies('1.1.2', rangePlain))

      const rangeEq = '=1.1.1'
      const matcherEq = semverVersionMatcherFactory(rangeEq)
      expect(matcherEq('1.1.1')).toBe(semver.satisfies('1.1.1', rangeEq))
      expect(matcherEq('1.1.2')).toBe(semver.satisfies('1.1.2', rangeEq))

      // TODO: add for discovered issues if any
    })

    it('canaryExactVersionMatcher should match v20.0.0-v8-canary20221103f7e2421e91 only v20.0.0-v8-canary20221103f7e2421e91', () => {
      const version = semver.coerce('v20.0.0')!.version
      const matcher = canaryExactVersionMatcherFactory(version, 'v8-canary20221103f7e2421e91');
      expect(matcher('v20.0.0-v8-canary20221103f7e2421e91')).toBeTruthy();
      // see  https://github.com/actions/setup-node/blob/00e1b6691b40cce14b5078cb411dd1ec7dab07f7/__tests__/verify-node.sh#L10
      expect(matcher('v20.0.0-v8-canary202211026bf85d0fb4')).toBeFalsy();
    })

    it('canaryRangeVersionMatcherFactory should match v20-v8-canary to any minor and patch version', () => {
      const version = semver.coerce('v20')!.version
      const matcher = canaryRangeVersionMatcherFactory(version);
      expect(matcher('v20.0.0-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.0.1-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.1.0-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.1.1-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.0.0-v8-canary202211026bf85d0fb4')).toBeTruthy();
    });

    it('canaryRangeVersionMatcherFactory should not match v20-v8-canary to v21.x & v19.x', () => {
      const version = semver.coerce('v20')!.version
      const matcher = canaryRangeVersionMatcherFactory(version);
      expect(matcher('v21.0.0-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v21.1.0-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v21.1.1-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v19.0.0-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v19.1.0-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v19.1.-v8-canary20221103f7e2421e91')).toBeFalsy();
    });

    it('canaryRangeVersionMatcherFactory should match v20.1-v8-canary to any v20.1 patch version and minor above or eq v20.1', () => {
      const version = semver.coerce('v20.1')!.version
      const matcher = canaryRangeVersionMatcherFactory(version);
      expect(matcher('v20.1.0-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.1.1-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.1.0-v8-canary202211026bf85d0fb4')).toBeTruthy();
      expect(matcher('v20.2.0-v8-canary20221103f7e2421e91')).toBeTruthy();
    });

    it('canaryRangeVersionMatcherFactory should not match canaryRangeVersionMatcherFactory to v21.x, v19.x, and v20 minor less v20.2', () => {
      const version = semver.coerce('v20.2')!.version
      const matcher = canaryRangeVersionMatcherFactory(version);
      expect(matcher('v20.1.0-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v21.0.0-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v19.0.0-v8-canary20221103f7e2421e91')).toBeFalsy();
    });

    it('canaryRangeVersionMatcherFactory should not match v20.1.1-v8-canary v20.1.x to patch versions above or eq v20.1.1', () => {
      const version = semver.coerce('v20.1.1')!.version
      const matcher = canaryRangeVersionMatcherFactory('v20.1.1-v8-canary');
      expect(matcher('v20.1.1-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.1.2-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.2.0-v8-canary20221103f7e2421e91')).toBeTruthy();
    });

    it('canaryRangeVersionMatcherFactory should match v20.1.1-v8-canary to patch versions with any canary timestamp', () => {
      const version = semver.coerce('v20.1.1')!.version
      const matcher = canaryRangeVersionMatcherFactory(version);
      expect(matcher('v20.1.1-v8-canary20221103f7e2421e91')).toBeTruthy();
      expect(matcher('v20.1.1-v8-canary202211026bf85d0fb4')).toBeTruthy();
    });

    it('canaryRangeVersionMatcherFactory should not match v20.1.1-v8-canary to any other minor versions and patch versions below v20.1.1', () => {
      const version = semver.coerce('v20.1.1')!.version
      const matcher = canaryRangeVersionMatcherFactory(version);
      expect(matcher('v20.1.0-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v21.0.0-v8-canary20221103f7e2421e91')).toBeFalsy();
      expect(matcher('v19.0.0-v8-canary20221103f7e2421e91')).toBeFalsy();
    });
  })

  describe('evaluateVersions', () => {
    it('evaluateVersions should handle v8-canary version spec without timestamp', () => {
      const versions = [
        'v20.0.0-v8-canary20221103f7e2421e91',
        'v20.0.1-v8-canary20221103f7e2421e91',
        'v20.1.0-v8-canary20221103f7e2421e91',
        'v20.1.1-v8-canary20221103f7e2421e91',
        'v21.1.0-v8-canary20221103f7e2421e91',
        'v19.1.0-v8-canary20221103f7e2421e91'
      ];
      const version = evaluateVersions(versions, 'v20-v8-canary');
      expect(version).toBe('v20.1.1-v8-canary20221103f7e2421e91');
    });

    it('evaluateVersions should handle v8-canary version spec with timestamp', () => {
      const versions = [
        'v20.0.0-v8-canary20221103f7e2421e91',
        'v20.0.1-v8-canary20221103f7e2421e91',
        'v20.0.1-v8-canary20221103f7e2421e92',
        'v20.0.1-v8-canary20221103f7e2421e93',
        'v20.0.2-v8-canary20221103f7e2421e91'
      ];
      const version = evaluateVersions(versions, 'v20.0.1-v8-canary20221103f7e2421e92');
      expect(version).toBe('v20.0.1-v8-canary20221103f7e2421e92');
    });
  })

  describe('getNodejsDistUrl', () => {
    it('getNodejsDistUrl should handle v8 canary version spec', async () => {
      expect(getNodejsDistUrl('1.1.1-v8-canary')).toBe('https://nodejs.org/download/v8-canary');
      expect(getNodejsDistUrl('1.1.1-v8-canary123')).toBe('https://nodejs.org/download/v8-canary');
      expect(getNodejsDistUrl('v1.1.1-v8-canary')).toBe('https://nodejs.org/download/v8-canary');
      expect(getNodejsDistUrl('v1.1.1-v8-canary123')).toBe('https://nodejs.org/download/v8-canary');
    });

    it('getNodejsDistUrl should handle nightly version spec', async () => {
      expect(getNodejsDistUrl('1.1.1-nightly')).toBe('https://nodejs.org/download/nightly');
      expect(getNodejsDistUrl('v1.1.1-nightly')).toBe('https://nodejs.org/download/nightly');
      expect(getNodejsDistUrl('1.1.1-nightly123')).toBe('https://nodejs.org/download/nightly');
      expect(getNodejsDistUrl('v1.1.1-nightly123')).toBe('https://nodejs.org/download/nightly');
    });

    it('getNodejsDistUrl should handle rc version spec', async () => {
      expect(getNodejsDistUrl('1.1.1-rc')).toBe('https://nodejs.org/download/rc');
      expect(getNodejsDistUrl('v1.1.1-rc')).toBe('https://nodejs.org/download/rc');
      expect(getNodejsDistUrl('1.1.1-rc.0')).toBe('https://nodejs.org/download/rc');
      expect(getNodejsDistUrl('v1.1.1-rc.0')).toBe('https://nodejs.org/download/rc');
    });

    it('getNodejsDistUrl should handle unspecific version spec', async () => {
      expect(getNodejsDistUrl('1.1.1')).toBe('https://nodejs.org/dist');
      expect(getNodejsDistUrl('v1.1.1')).toBe('https://nodejs.org/dist');
    });
  })
});
