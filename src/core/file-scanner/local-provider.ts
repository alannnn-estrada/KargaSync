import fs from 'node:fs';
import path from 'node:path';

import { joinProviderPath, relativePosixPath, toPosixPath } from './path-utils';
import type { FileEntry, FileProvider } from './types';

const statFile = (filePath: string): Promise<fs.Stats> => fs.promises.lstat(filePath);

const toFileEntry = (rootPath: string, filePath: string, stats: fs.Stats): FileEntry => ({
    path: relativePosixPath(rootPath, filePath),
    size: stats.size,
    mtime: stats.mtime,
});

async function* walkDirectory(rootPath: string, directoryPath: string): AsyncGenerator<FileEntry> {
    const directory = await fs.promises.opendir(directoryPath);

    for await (const entry of directory) {
        const absoluteEntryPath = path.join(directoryPath, entry.name);

        if (entry.isDirectory()) {
            yield* walkDirectory(rootPath, absoluteEntryPath);
            continue;
        }

        if (entry.isSymbolicLink()) {
            continue;
        }

        const stats = await statFile(absoluteEntryPath);

        if (!stats.isFile()) {
            continue;
        }

        yield toFileEntry(rootPath, absoluteEntryPath, stats);
    }
}

export interface LocalProviderOptions {
    rootPath: string;
}

export class LocalProvider implements FileProvider {
    readonly kind = 'local' as const;

    constructor(private readonly options: LocalProviderOptions) {}

    async *iterateFiles(): AsyncGenerator<FileEntry> {
        const rootPath = path.resolve(this.options.rootPath);
        const rootStats = await statFile(rootPath);

        if (rootStats.isFile()) {
            yield {
                path: toPosixPath(path.basename(rootPath)),
                size: rootStats.size,
                mtime: rootStats.mtime,
            };

            return;
        }

        if (!rootStats.isDirectory()) {
            return;
        }

        yield* walkDirectory(rootPath, rootPath);
    }

    async openFile(filePath: string): Promise<NodeJS.ReadableStream> {
        return fs.createReadStream(joinProviderPath(this.options.rootPath, filePath));
    }
}