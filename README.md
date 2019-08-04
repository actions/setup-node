# setup-node

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
    version: '10.x'
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
          version: ${{ matrix.node }}
      - run: npm install
      - run: npm test
```

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

# Contributions

Contributions are welcome!  See [Contributor's Guide](docs/contributors.md)
