import * as nv from '../src/installer';


let nodeTestDist = require('./data/node-dist-index.json');

describe('node-version-file', () => {
  let getVersionsFromDist: jest.SpyInstance;

  beforeEach(() => {
    // @actions/core
    console.log('::stop-commands::stoptoken'); // Disable executing of runner commands when running tests in actions

    getVersionsFromDist = jest.spyOn(nv, 'getVersionsFromDist');

    // gets
    getVersionsFromDist.mockImplementation(() => <nv.INodeVersion>nodeTestDist);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    //jest.restoreAllMocks();
  });

  afterAll(async () => {
    console.log('::stoptoken::'); // Re-enable executing of runner commands when running tests in actions
  }, 100000);

  //--------------------------------------------------
  // Manifest find tests
  //--------------------------------------------------
  describe('parseNodeVersionFile', () => {
    it('without `v` prefix', async () => {
      // Arrange
      const versionSpec = '12';

      // Act
      const result = await nv.parseNodeVersionFile(versionSpec);

      // Assert
      expect(result).toBe(versionSpec);
    });

    it('lts/*', async () => {
      // Arrange
      const versionSpec = 'lts/*';

      // Act
      const result = await nv.parseNodeVersionFile(versionSpec);

      // Assert
      expect(result).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('lts/erbium', async () => {
      // Arrange
      const versionSpec = 'lts/*';

      // Act
      const result = await nv.parseNodeVersionFile(versionSpec);

      // Assert
      expect(result).toMatch(/\d\.\d\.\d/);
    });

    it('partial syntax like 12', async () => {
      // Arrange
      const versionSpec = '12';

      // Act
      const result = await nv.parseNodeVersionFile(versionSpec);

      // Assert
      expect(result).toBe(versionSpec);
    });

    it('partial syntax like 12.16', async () => {
      // Arrange
      const versionSpec = '12.16';

      // Act
      const result = await nv.parseNodeVersionFile(versionSpec);

      // Assert
      expect(result).toBe(versionSpec);
    });
  });
});
