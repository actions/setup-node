name: proxy

on:
  pull_request:
    paths-ignore:
      - '**.md'    
  push:    
    branches:
      - master
      - releases/*
    paths-ignore:
      - '**.md'
      
jobs:
  test-proxy:
    runs-on: ubuntu-latest
    strategy:    
      fail-fast: false    
    container:
      image: ubuntu:latest
      options: --dns 127.0.0.1
    services:
      squid-proxy:
        image: datadog/squid:latest
        ports:
          - 3128:3128
    env:
      https_proxy: http://squid-proxy:3128
    steps:
      - uses: actions/checkout@v2
      - name: Clear tool cache
        run: rm -rf $RUNNER_TOOL_CACHE/*
      - name: Setup node 10
        uses: ./
        with:
          node-version: 10.x
      - name: Verify node and npm
        run: __tests__/verify-node.sh 10

  test-bypass-proxy:
    runs-on: ubuntu-latest
    strategy:    
      fail-fast: false
    env:
      https_proxy: http://no-such-proxy:3128
      no_proxy: api.github.com,github.com,nodejs.org,registry.npmjs.org,*.s3.amazonaws.com,s3.amazonaws.com
    steps:
      - uses: actions/checkout@v2
      - name: Clear tool cache
        run: rm -rf $RUNNER_TOOL_CACHE/*
      - name: Setup node 11
        uses: ./
        with:
          node-version: 11
      - name: Verify node and npm
        run: __tests__/verify-node.sh 11
