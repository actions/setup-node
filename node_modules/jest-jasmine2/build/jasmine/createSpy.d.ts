/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { Spy } from '../types';
interface Fn {
    (): any;
    [key: string]: any;
}
declare function createSpy(name: string, originalFn: Fn): Spy;
export default createSpy;
//# sourceMappingURL=createSpy.d.ts.map