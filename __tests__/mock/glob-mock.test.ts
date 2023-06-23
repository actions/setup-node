import {MockGlobber} from './glob-mock';

describe('mocked globber tests', () => {
  it('globber should return generator', async () => {
    const globber = new MockGlobber(['aaa', 'bbb', 'ccc']);
    const generator = globber.globGenerator();
    const result: string[] = [];
    for await (const itemPath of generator) {
      result.push(itemPath);
    }
    expect(result).toEqual(['aaa', 'bbb', 'ccc']);
  });
  it('globber should return glob', async () => {
    const globber = new MockGlobber(['aaa', 'bbb', 'ccc']);
    const result: string[] = await globber.glob();
    expect(result).toEqual(['aaa', 'bbb', 'ccc']);
  });
});
