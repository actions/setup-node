import {Globber} from '@actions/glob';

export class MockGlobber implements Globber {
  private readonly expected: string[];
  constructor(expected: string[]) {
    this.expected = expected;
  }
  getSearchPaths(): string[] {
    return this.expected.slice();
  }

  async glob(): Promise<string[]> {
    const result: string[] = [];
    for await (const itemPath of this.globGenerator()) {
      result.push(itemPath);
    }
    return result;
  }

  async *globGenerator(): AsyncGenerator<string, void> {
    for (const e of this.expected) {
      yield e;
    }
  }

  static async create(expected: string[]): Promise<MockGlobber> {
    return new MockGlobber(expected);
  }
}
