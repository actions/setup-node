import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {getNodeVersionFromFile} from '../src/util.js';

describe('getNodeVersionFromFile Volta extends cycles', () => {
  const fixtureRoot = path.resolve('volta-extends-fixtures');
  let contents: Map<string, string>;

  beforeEach(() => {
    contents = new Map();

    jest
      .spyOn(fs, 'existsSync')
      .mockImplementation(filePath =>
        contents.has(path.resolve(filePath.toString()))
      );
    jest.spyOn(fs, 'readFileSync').mockImplementation((filePath: any) => {
      const content = contents.get(path.resolve(filePath.toString()));
      if (content === undefined) {
        throw new Error(`Unexpected read of ${filePath}`);
      }
      return content;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports a self-referencing extends chain', () => {
    const packagePath = path.join(fixtureRoot, 'package.json');
    contents.set(
      packagePath,
      JSON.stringify({volta: {extends: './package.json'}})
    );

    expect(() => getNodeVersionFromFile(packagePath)).toThrow(
      `Circular Volta extends reference detected: ${packagePath} -> ${packagePath}`
    );
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
  });

  it('reports a multi-file extends cycle', () => {
    const firstPath = path.join(fixtureRoot, 'first.json');
    const secondPath = path.join(fixtureRoot, 'second.json');
    contents.set(
      firstPath,
      JSON.stringify({volta: {extends: './second.json'}})
    );
    contents.set(
      secondPath,
      JSON.stringify({volta: {extends: './first.json'}})
    );

    expect(() => getNodeVersionFromFile(firstPath)).toThrow(
      `Circular Volta extends reference detected: ${firstPath} -> ${secondPath} -> ${firstPath}`
    );
    expect(fs.readFileSync).toHaveBeenCalledTimes(2);
  });

  it('continues resolving an acyclic extends chain', () => {
    const packagePath = path.join(fixtureRoot, 'package.json');
    const basePath = path.join(fixtureRoot, 'base.json');
    contents.set(
      packagePath,
      JSON.stringify({volta: {extends: './base.json'}})
    );
    contents.set(basePath, JSON.stringify({volta: {node: '24.0.0'}}));

    expect(getNodeVersionFromFile(packagePath)).toBe('24.0.0');
  });
});
