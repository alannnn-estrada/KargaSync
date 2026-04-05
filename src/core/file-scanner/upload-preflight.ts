import fs from 'node:fs';
import path from 'node:path';

import type { ConnectionRow } from '../../db/types';
import type { ProjectManager, ResolveRemoteBindingInput } from '../../db/project-manager';

export interface SyncComparableFile {
    path?: string;
    relativePath?: string;
    hash?: string;
    contentHash?: string;
    size?: number;
    sizeBytes?: number;
}

interface SyncFileSignature {
    path: string;
    contentHash: string;
    sizeBytes: number;
}

export interface SyncChangeSet {
    added: string[];
    modified: string[];
    deleted: string[];
}

export interface EvaluateSyncConflictInput {
    snapshotFiles: SyncComparableFile[];
    localFiles: SyncComparableFile[];
    remoteFiles: SyncComparableFile[];
}

export interface EvaluateSyncConflictResult {
    localVsSnapshot: SyncChangeSet;
    remoteVsSnapshot: SyncChangeSet;
    remoteChangedAfterLastSync: boolean;
    hasConflict: boolean;
    conflictPaths: string[];
    warning: string | null;
}

export interface PrepareRemoteUploadInput {
    projectManager: Pick<ProjectManager, 'resolveRemoteBinding'>;
    environmentId: number;
    localFilePath: string;
    binding?: ResolveRemoteBindingInput;
    fetchRemoteFile: (input: { connection: ConnectionRow; remotePath: string }) => Promise<Buffer | null>;
    backupDirectory: string;
    now?: Date;
}

export interface PrepareRemoteUploadResult {
    environmentId: number;
    localFilePath: string;
    connection: ConnectionRow;
    remotePath: string;
    backupPath: string | null;
    previousRemoteFile: Buffer | null;
}

const sanitizeForFileName = (value: string): string =>
    value
        .replace(/[:*?"<>|]/g, '_')
        .replace(/[\\/]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

const buildBackupFileName = (input: {
    environmentId: number;
    connectionId: number;
    remotePath: string;
    now: Date;
}) => {
    const timestamp = input.now.toISOString().replace(/[:]/g, '-');
    const remotePathSegment = sanitizeForFileName(input.remotePath) || 'remote-file';

    return `env-${input.environmentId}_conn-${input.connectionId}_${remotePathSegment}_${timestamp}.bak`;
};

const compareSignatures = (
    left: SyncFileSignature | null,
    right: SyncFileSignature | null,
): boolean => {
    if (left === null || right === null) {
        return left === right;
    }

    return left.contentHash === right.contentHash && left.sizeBytes === right.sizeBytes;
};

const toSignatureMap = (files: SyncComparableFile[]): Map<string, SyncFileSignature> => {
    const map = new Map<string, SyncFileSignature>();

    for (const file of files) {
        const filePath = (file.relativePath ?? file.path ?? '').trim();
        const contentHash = (file.contentHash ?? file.hash ?? '').trim();
        const sizeBytes = file.sizeBytes ?? file.size;

        if (filePath.length === 0 || contentHash.length === 0 || typeof sizeBytes !== 'number') {
            continue;
        }

        map.set(filePath, {
            path: filePath,
            contentHash,
            sizeBytes,
        });
    }

    return map;
};

const compareWithSnapshot = (
    snapshotMap: Map<string, SyncFileSignature>,
    currentMap: Map<string, SyncFileSignature>,
): SyncChangeSet => {
    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];

    for (const [snapshotPath, snapshotFile] of snapshotMap) {
        const currentFile = currentMap.get(snapshotPath) ?? null;

        if (currentFile === null) {
            deleted.push(snapshotPath);
            continue;
        }

        if (!compareSignatures(snapshotFile, currentFile)) {
            modified.push(snapshotPath);
        }
    }

    for (const currentPath of currentMap.keys()) {
        if (!snapshotMap.has(currentPath)) {
            added.push(currentPath);
        }
    }

    return {
        added: added.sort(),
        modified: modified.sort(),
        deleted: deleted.sort(),
    };
};

export const evaluateSyncConflict = (
    input: EvaluateSyncConflictInput,
): EvaluateSyncConflictResult => {
    const snapshotMap = toSignatureMap(input.snapshotFiles);
    const localMap = toSignatureMap(input.localFiles);
    const remoteMap = toSignatureMap(input.remoteFiles);

    const localVsSnapshot = compareWithSnapshot(snapshotMap, localMap);
    const remoteVsSnapshot = compareWithSnapshot(snapshotMap, remoteMap);
    const remoteChangedAfterLastSync =
        remoteVsSnapshot.added.length > 0 ||
        remoteVsSnapshot.modified.length > 0 ||
        remoteVsSnapshot.deleted.length > 0;

    const allPaths = new Set<string>([
        ...snapshotMap.keys(),
        ...localMap.keys(),
        ...remoteMap.keys(),
    ]);
    const conflictPaths: string[] = [];

    for (const filePath of allPaths) {
        const snapshotFile = snapshotMap.get(filePath) ?? null;
        const localFile = localMap.get(filePath) ?? null;
        const remoteFile = remoteMap.get(filePath) ?? null;

        const localChanged = !compareSignatures(snapshotFile, localFile);
        const remoteChanged = !compareSignatures(snapshotFile, remoteFile);

        if (!localChanged || !remoteChanged) {
            continue;
        }

        if (compareSignatures(localFile, remoteFile)) {
            continue;
        }

        conflictPaths.push(filePath);
    }

    conflictPaths.sort();

    const hasConflict = conflictPaths.length > 0;
    const warning = hasConflict
        ? `Conflict detected: remote changed after last sync and diverges from local changes (${conflictPaths.length} file${conflictPaths.length === 1 ? '' : 's'}).`
        : null;

    return {
        localVsSnapshot,
        remoteVsSnapshot,
        remoteChangedAfterLastSync,
        hasConflict,
        conflictPaths,
        warning,
    };
};

export const prepareRemoteUpload = async (
    input: PrepareRemoteUploadInput,
): Promise<PrepareRemoteUploadResult> => {
    const resolved = input.projectManager.resolveRemoteBinding(input.environmentId, input.binding);
    const remotePath = resolved.binding.remotePath as string;
    const previousRemoteFile = await input.fetchRemoteFile({
        connection: resolved.connection,
        remotePath,
    });

    let backupPath: string | null = null;

    if (previousRemoteFile !== null) {
        const now = input.now ?? new Date();
        const fileName = buildBackupFileName({
            environmentId: input.environmentId,
            connectionId: resolved.connection.id,
            remotePath,
            now,
        });

        fs.mkdirSync(input.backupDirectory, { recursive: true });
        backupPath = path.join(input.backupDirectory, fileName);
        await fs.promises.writeFile(backupPath, previousRemoteFile);
    }

    return {
        environmentId: input.environmentId,
        localFilePath: input.localFilePath,
        connection: resolved.connection,
        remotePath,
        backupPath,
        previousRemoteFile,
    };
};
