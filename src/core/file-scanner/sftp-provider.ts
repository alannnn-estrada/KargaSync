import type { FileEntry, FileProvider } from './types';

export interface SftpProviderOptions {
    host: string;
    port?: number;
    username: string;
    rootPath: string;
}

export class SFTPProvider implements FileProvider {
    readonly kind = 'sftp' as const;

    constructor(private readonly options: SftpProviderOptions) {}

    async *iterateFiles(): AsyncGenerator<FileEntry> {
        void this.options;
        throw new Error('SFTPProvider is not implemented yet.');
    }

    async openFile(_filePath: string): Promise<NodeJS.ReadableStream> {
        throw new Error('SFTPProvider is not implemented yet.');
    }
}