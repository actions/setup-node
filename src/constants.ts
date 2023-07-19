export enum LockType {
  Npm = 'npm',
  Pnpm = 'pnpm',
  Yarn = 'yarn'
}

export enum State {
  CachePackageManager = 'SETUP_NODE_CACHE_PACKAGE_MANAGER',
  CachePrimaryKey = 'CACHE_KEY',
  CacheMatchedKey = 'CACHE_RESULT',
  CachePaths = 'CACHE_PATHS'
}

export enum Outputs {
  CacheHit = 'cache-hit'
}
