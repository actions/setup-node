import { InternalHasteMap, Persistence, FileData } from '../types';
declare class SQLitePersistence implements Persistence {
    read(cachePath: string): InternalHasteMap;
    write(cachePath: string, internalHasteMap: InternalHasteMap, removedFiles: FileData, changedFiles?: FileData): void;
    private getDatabase;
    getType(): string;
}
declare const _default: SQLitePersistence;
export default _default;
//# sourceMappingURL=sqlite.d.ts.map