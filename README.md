# setup-node

<p align="left">
  <a href="https://github.com/actions/setup-node"><img alt="GitHub Actions status" src="https://github.com/actions/setup-node/workflows/Main%20workflow/badge.svg"></a>
</p>

This action sets by node environment for use in actions by:

- optionally downloading and caching a version of node - npm by version spec and add to PATH
- registering problem matchers for error output 

# Usage

See [action.yml](action.yml)

Basic:
```yaml
steps:
- uses: actions/checkout@master
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
      - uses: actions/checkout@master
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
- uses: actions/checkout@master
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
- uses: actions/checkout@master
- uses: actions/setup-node@v1
  with:
    node-version: '10.x'
    registry-url: <registry url>
- run: npm install -g yarn
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

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

# Contributions

Contributions are welcome!  See [Contributor's Guide](docs/contributors.md)
