import tscMatcher from '../.github/tsc.json';

describe('problem matcher tests', () => {
  it('tsc: matches TypeScript "pretty" error message', () => {
    const [
      {
        pattern: [{regexp}]
      }
    ] = tscMatcher.problemMatcher;
    const exampleErrorMessage =
      "lib/index.js:23:42 - error TS2345: Argument of type 'A' is not assignable to parameter of type 'B'.";

    const match = exampleErrorMessage.match(new RegExp(regexp));
    expect(match).not.toBeNull();
    expect(match![1]).toEqual('lib/index.js');
    expect(match![2]).toEqual('23');
    expect(match![3]).toEqual('42');
    expect(match![4]).toEqual('error');
    expect(match![5]).toEqual('2345');
    expect(match![6]).toEqual(
      "Argument of type 'A' is not assignable to parameter of type 'B'."
    );
  });

  it('tsc: matches TypeScript error message from log file', () => {
    const [
      {
        pattern: [{regexp}]
      }
    ] = tscMatcher.problemMatcher;
    const exampleErrorMessage =
      "lib/index.js(23,42): error TS2345: Argument of type 'A' is not assignable to parameter of type 'B'.";

    const match = exampleErrorMessage.match(new RegExp(regexp));
    expect(match).not.toBeNull();
    expect(match![1]).toEqual('lib/index.js');
    expect(match![2]).toEqual('23');
    expect(match![3]).toEqual('42');
    expect(match![4]).toEqual('error');
    expect(match![5]).toEqual('2345');
    expect(match![6]).toEqual(
      "Argument of type 'A' is not assignable to parameter of type 'B'."
    );
  });
});
