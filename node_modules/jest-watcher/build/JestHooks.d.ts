/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { JestHookSubscriber, JestHookEmitter } from './types';
declare type AvailableHooks = 'onFileChange' | 'onTestRunComplete' | 'shouldRunTestSuite';
declare class JestHooks {
    private _listeners;
    constructor();
    isUsed(hook: AvailableHooks): number;
    getSubscriber(): JestHookSubscriber;
    getEmitter(): JestHookEmitter;
}
export default JestHooks;
//# sourceMappingURL=JestHooks.d.ts.map