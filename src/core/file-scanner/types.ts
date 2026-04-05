export interface FileEntry {
    path: string;
    size: number;
    mtime: Date;
}

export interface FileRecord extends FileEntry {
    hash: string;
}

export interface FileProvider {
    readonly kind: 'local' | 'sftp';

    iterateFiles(): AsyncIterable<FileEntry>;
    openFile(filePath: string): Promise<NodeJS.ReadableStream>;
}

export interface FileScannerOptions {
    hashAlgorithm?: string;
}