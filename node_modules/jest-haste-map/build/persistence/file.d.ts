import { InternalHasteMap, Persistence } from '../types';
declare class FilePersistence implements Persistence {
    write(cachePath: string, internalHasteMap: InternalHasteMap): void;
    read(cachePath: string): InternalHasteMap;
    getType(): string;
}
declare const _default: FilePersistence;
export default _default;
//# sourceMappingURL=file.d.ts.map