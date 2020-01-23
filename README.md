# setup-node

<p align="left">
  <a href="https://github.com/actions/setup-node"><img alt="GitHub Actions status" src="https://github.com/actions/setup-node/workflows/Main%20workflow/badge.svg"></a>
</p>

This action sets the node environment for use in actions by:

- optionally downloading and caching a version of node - npm by version spec and add to PATH
- registering problem matchers for error output 

# Usage

See [action.yml](action.yml)

You can use any valid [SemVer](https://semver.org/) range supported by the [sem-ver](https://www.npmjs.com/package/semver#ranges) module.

For example [`node-version: '*'`](https://www.npmjs.com/package/semver#x-ranges-12x-1x-12-) would satisfy the latest version.

See also the [`evaluateVersions`](https://github.com/actions/setup-node/blob/93313caf82afbdb49b8e4790ac7f1c97c8034826/src/installer.ts#L114) method and its usage of [`semver.satisfies`](https://github.com/actions/setup-node/blob/93313caf82afbdb49b8e4790ac7f1c97c8034826/src/installer.ts#L130)

Basic:
```yaml
steps:
- uses: actions/checkout@v1
- uses: actions/setup-node@v1
  with:
    node-version: '10.x'
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
        node: [ '10', '8' ]
    name: Node ${{ matrix.node }} sample
    steps:
      - uses: actions/checkout@v1
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
- uses: actions/checkout@v1
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
- uses: actions/checkout@v1
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
- uses: actions/checkout@v1
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
