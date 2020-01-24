/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Config } from '@jest/types';
import { OnTestFailure, OnTestStart, OnTestSuccess, Test as JestTest, TestRunnerContext, TestRunnerOptions, TestWatcher } from './types';
declare namespace TestRunner {
    type Test = JestTest;
}
declare class TestRunner {
    private _globalConfig;
    private _context;
    constructor(globalConfig: Config.GlobalConfig, context?: TestRunnerContext);
    runTests(tests: Array<JestTest>, watcher: TestWatcher, onStart: OnTestStart, onResult: OnTestSuccess, onFailure: OnTestFailure, options: TestRunnerOptions): Promise<void>;
    private _createInBandTestRun;
    private _createParallelTestRun;
}
export = TestRunner;
//# sourceMappingURL=index.d.ts.map