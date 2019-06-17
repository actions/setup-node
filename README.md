# @actions/setup-node

This action sets by node environment for use in actions by:

- optionally downloading and caching a version of node - npm by version spec and add to PATH
- registering problem matchers for error output 
- TODO: configuring authentication for npm packages 
- TODO: configuring proxy if the runner is configured to use a proxy (coming with private runners)

# Usage

See [action.yml](action.yml)

Basic:
```yaml
actions:
- uses: actions/setup-node@latest
  with:
    version: 10.x 
- run: npm install
- run: npm test
```

Matrix Testing:
```yaml
jobs:
  build:
    strategy:
      matrix:
        node: [ 10, 8 ]
    name: Node ${{ matrix.node }} sample
    actions:
      - name: Setup node
        uses: actions/setup-node@latest
        with:
          version: ${{ matrix.node }}
      - run: npm install
      - run: npm test
```

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

# Contributions

Contributions are welcome!  See [Contributor's Guide](docs/contributors.md)