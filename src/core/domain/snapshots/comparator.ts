/**
 * Service for comparing environments based on their snapshots
 * Uses the DiffEngine for file-level comparison
 * Works with ANY environments without hardcoding environment types
 */

import { createDiffEngine } from '../../shared/utils';
import type { EnvironmentComparisonResult, SnapshotFileComparison, CompareSnapshotsInput } from './types';
import type { EnvironmentSnapshot, SnapshotFileEntry } from './types';

interface ComparisonDependencies {
    sourceSnapshot: EnvironmentSnapshot;
    targetSnapshot: EnvironmentSnapshot;
}

/**
 * Performs a detailed file-level comparison between two environment snapshots
 * Returns added, deleted, modified, and unchanged files
 */
export function createEnvironmentComparator(
    { sourceSnapshot, targetSnapshot }: ComparisonDependencies,
) {
    const diffEngine = createDiffEngine<SnapshotFileEntry>({
        sourceKey: (file) => file.relativePath,
        targetKey: (file) => file.relativePath,
        areEqual: (source, target) =>
            source.contentHash === target.contentHash && source.sizeBytes === target.sizeBytes,
    });

    async function compare(): Promise<EnvironmentComparisonResult> {
        const diffResult = await diffEngine.compare(
            sourceSnapshot.files,
            targetSnapshot.files,
            {
                source: sourceSnapshot.environmentName,
                target: targetSnapshot.environmentName,
            },
        );

        // Build file comparison results
        const files: SnapshotFileComparison[] = [];

        // Added files (in target, not in source)
        for (const addition of diffResult.added) {
            files.push({
                relativePath: addition.key,
                status: 'added',
                target: {
                    contentHash: addition.target.contentHash,
                    sizeBytes: addition.target.sizeBytes,
                },
            });
        }

        // Deleted files (in source, not in target)
        for (const deletion of diffResult.deleted) {
            files.push({
                relativePath: deletion.key,
                status: 'deleted',
                source: {
                    contentHash: deletion.source.contentHash,
                    sizeBytes: deletion.source.sizeBytes,
                },
            });
        }

        // Modified files (different hash or size)
        for (const modification of diffResult.modified) {
            files.push({
                relativePath: modification.key,
                status: 'modified',
                source: {
                    contentHash: modification.source.contentHash,
                    sizeBytes: modification.source.sizeBytes,
                },
                target: {
                    contentHash: modification.target.contentHash,
                    sizeBytes: modification.target.sizeBytes,
                },
            });
        }

        // Calculate summary statistics
        const summary = {
            sourceSnapshot: {
                environmentId: sourceSnapshot.environmentId,
                environmentName: sourceSnapshot.environmentName,
                label: sourceSnapshot.label,
                fileCount: sourceSnapshot.fileCount,
                totalBytes: sourceSnapshot.totalBytes,
            },
            targetSnapshot: {
                environmentId: targetSnapshot.environmentId,
                environmentName: targetSnapshot.environmentName,
                label: targetSnapshot.label,
                fileCount: targetSnapshot.fileCount,
                totalBytes: targetSnapshot.totalBytes,
            },
            comparisonStats: {
                added: diffResult.added.length,
                deleted: diffResult.deleted.length,
                modified: diffResult.modified.length,
                unchanged: sourceSnapshot.files.length - diffResult.added.length - diffResult.deleted.length,
                total: Math.max(sourceSnapshot.files.length, targetSnapshot.files.length),
            },
            bytesChanged: calculateBytesChanged(files),
        };

        return {
            summary,
            files,
        };
    }

    return { compare };
}

/**
 * Calculates byte changes across all file differences
 */
function calculateBytesChanged(files: SnapshotFileComparison[]) {
    let addedBytes = 0;
    let deletedBytes = 0;
    let modifiedBytes = 0;

    for (const file of files) {
        if (file.status === 'added' && file.target) {
            addedBytes += file.target.sizeBytes;
        } else if (file.status === 'deleted' && file.source) {
            deletedBytes += file.source.sizeBytes;
        } else if (file.status === 'modified' && file.source && file.target) {
            modifiedBytes += Math.abs(file.target.sizeBytes - file.source.sizeBytes);
        }
    }

    return {
        added: addedBytes,
        deleted: deletedBytes,
        modified: modifiedBytes,
        total: addedBytes + deletedBytes + modifiedBytes,
    };
}
