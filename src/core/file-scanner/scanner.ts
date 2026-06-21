import { createHash } from 'node:crypto';

import type { Readable } from 'node:stream';

import type { FileEntry, FileProvider, FileRecord, FileScannerOptions } from './types';
import { shouldIgnore } from './ignore-matcher';

const DEFAULT_HASH_ALGORITHM = 'sha256';

const hashStream = async (stream: Readable, hashAlgorithm: string): Promise<string> => {
    const hash = createHash(hashAlgorithm);

    for await (const chunk of stream) {
        hash.update(chunk);
    }

    return hash.digest('hex');
};

const scanEntry = async (provider: FileProvider, entry: FileEntry, hashAlgorithm: string): Promise<FileRecord> => {
    const stream = await provider.openFile(entry.path);

    try {
        const hash = await hashStream(stream, hashAlgorithm);

        return {
            path: entry.path,
            size: entry.size,
            mtime: entry.mtime,
            hash,
        };
    } finally {
        stream.destroy();
    }
};

export class FileScanner {
    private readonly hashAlgorithm: string;
    private readonly ignorePatterns: string[];

    constructor(
        private readonly provider: FileProvider,
        options: FileScannerOptions = {},
    ) {
        this.hashAlgorithm = options.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM;
        this.ignorePatterns = options.ignorePatterns ?? [];
    }

    async *scan(): AsyncGenerator<FileRecord> {
        for await (const entry of this.provider.iterateFiles()) {
            if (this.ignorePatterns.length > 0 && shouldIgnore(entry.path, this.ignorePatterns)) {
                continue;
            }

            yield await scanEntry(this.provider, entry, this.hashAlgorithm);
        }
    }

    async scanAll(): Promise<FileRecord[]> {
        const files: FileRecord[] = [];

        for await (const record of this.scan()) {
            files.push(record);
        }

        return files;
    }
}