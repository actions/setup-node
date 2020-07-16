# setup-node

<p align="left">
  <a href="https://github.com/actions/setup-node/actions?query=workflow%3Abuild-test"><img alt="build-test status" src="https://github.com/actions/setup-node/workflows/build-test/badge.svg"></a> <a href="https://github.com/actions/setup-node/actions?query=workflow%3Aversions"><img alt="versions status" src="https://github.com/actions/setup-node/workflows/versions/badge.svg"></a> <a href="https://github.com/actions/setup-node/actions?query=workflow%3Aproxy"><img alt="proxy status" src="https://github.com/actions/setup-node/workflows/proxy/badge.svg"></a> 
</p>

This action sets by node environment for use in actions by:

- optionally downloading and caching a version of node - npm by version spec and add to PATH
- registering problem matchers for error output
- configuring authentication for GPR or npm

# v2-beta

A beta release which adds reliability for pulling node distributions from a cache of node releases is available by referencing the `v2-beta` tag.

```yaml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v2-beta
  with:
    node-version: '12'
```

It will first check the local cache for a semver match.  The hosted images have been updated with the latest of each LTS from v8, v10, v12, and v14. `self-hosted` machines will benefit from the cache as well only downloading once.  It will pull LTS versions from `main` branch of [node-versions](https://github.com/actions/node-versions/blob/main/versions-manifest.json) repository and on miss or failure, it will fall back to the previous behavior of download directly from [node dist](https://nodejs.org/dist/).

The `node-version` input is optional.  If not supplied, node which is in your PATH will be used.  However, this action will still register problem matchers and support auth features.  So setting up the node environment is still a valid scenario without downloading and caching versions.

# Usage

See [action.yml](action.yml)

Basic:
```yaml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v1
  with:
    node-version: '12'
- run: npm install
- run: npm test
```

Check latest version:  
> In basic example, without `check-latest` flag, the action tries to resolve version from local cache firstly and download only if it is not found. Local cache on image is updated with a couple of weeks latency.  
`check-latest` flag forces the action to check if the cached version is the latest one. It reduces latency significantly but it is much more likely to incur version downloading.
```yaml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v2
  with:
    node-version: '12'
    check-latest: true
- run: npm install
- run: npm test
```

Matrix Testing:
```yaml
jobs:
  build:
    runs-on: ubuntu-16.04
    strategy:
      matrix:
        node: [ '10', '12' ]
    name: Node ${{ matrix.node }} sample
    steps:
      - uses: actions/checkout@v2
      - name: Setup node
        uses: actions/setup-node@v1
        with:
          node-version: ${{ matrix.node }}
      - run: npm install
      - run: npm test
```

Publish to npmjs and GPR with npm:
```yaml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v1
  with:
    node-version: '10.x'
    registry-url: 'https://registry.npmjs.org'
- run: npm install
- run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
- uses: actions/setup-node@v1
  with:
    registry-url: 'https://npm.pkg.github.com'
- run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Publish to npmjs and GPR with yarn:
```yaml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v1
  with:
    node-version: '10.x'
    registry-url: <registry url>
- run: yarn install
- run: yarn publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.YARN_TOKEN }}
- uses: actions/setup-node@v1
  with:
    registry-url: 'https://npm.pkg.github.com'
- run: yarn publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Use private packages:
```yaml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-node@v1
  with:
    node-version: '10.x'
    registry-url: 'https://registry.npmjs.org'
# Skip post-install scripts here, as a malicious
# script could steal NODE_AUTH_TOKEN.
- run: npm install --ignore-scripts
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
# `npm rebuild` will run all those post-install scripts for us.
- run: npm rebuild && npm run prepare --if-present
```


# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

# Contributions

Contributions are welcome!  See [Contributor's Guide](docs/contributors.md)

## Code of Conduct

:wave: Be nice.  See [our code of conduct](CONDUCT)
