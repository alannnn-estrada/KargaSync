/**
 * Domain types for snapshot-based environment comparison
 * Supports comparing ANY two environments without hardcoding environment types
 */

/**
 * Represents a file from an environment snapshot
 */
export interface SnapshotFileEntry {
    relativePath: string;
    contentHash: string;
    sizeBytes: number;
}

/**
 * Represents a snapshot of an environment at a point in time
 */
export interface EnvironmentSnapshot {
    id: number;
    environmentId: number;
    environmentName: string;
    label: string | null;
    createdAt: string;
    fileCount: number;
    totalBytes: number;
    files: SnapshotFileEntry[];
}

/**
 * Represents a single file comparison between two environment snapshots
 */
export interface SnapshotFileComparison {
    relativePath: string;
    status: 'added' | 'deleted' | 'modified' | 'unchanged';
    source?: {
        contentHash: string;
        sizeBytes: number;
    };
    target?: {
        contentHash: string;
        sizeBytes: number;
    };
}

/**
 * Summary statistics for environment comparison
 */
export interface EnvironmentComparisonSummary {
    sourceSnapshot: {
        environmentId: number;
        environmentName: string;
        label: string | null;
        fileCount: number;
        totalBytes: number;
    };
    targetSnapshot: {
        environmentId: number;
        environmentName: string;
        label: string | null;
        fileCount: number;
        totalBytes: number;
    };
    comparisonStats: {
        added: number;
        deleted: number;
        modified: number;
        unchanged: number;
        total: number;
    };
    bytesChanged: {
        added: number;
        deleted: number;
        modified: number;
        total: number;
    };
}

/**
 * Complete comparison result between two environment snapshots
 */
export interface EnvironmentComparisonResult {
    summary: EnvironmentComparisonSummary;
    files: SnapshotFileComparison[];
}

/**
 * Input parameters for comparing two environments
 * Supports multiple ways to specify environments:
 * - By environment ID
 * - By environment name (within a project)
 * - By snapshot ID
 */
export interface CompareEnvironmentsInput {
    projectId: number;
    sourceEnvironmentId?: number;
    sourceEnvironmentName?: string;
    sourceSnapshotId?: number;
    targetEnvironmentId?: number;
    targetEnvironmentName?: string;
    targetSnapshotId?: number;
}

/**
 * Input for comparing specific snapshots
 */
export interface CompareSnapshotsInput {
    sourceSnapshotId: number;
    targetSnapshotId: number;
}
