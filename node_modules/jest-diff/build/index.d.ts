/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { DiffOptions as JestDiffOptions } from './types';
declare function diff(a: any, b: any, options?: JestDiffOptions): string | null;
declare namespace diff {
    type DiffOptions = JestDiffOptions;
}
export = diff;
//# sourceMappingURL=index.d.ts.map