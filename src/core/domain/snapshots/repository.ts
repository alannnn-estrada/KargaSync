/**
 * Repository for accessing snapshot data from the database
 * Provides methods to retrieve and fetch snapshot data for comparison
 */

import type { SqliteDatabase } from '../../../db/sqlite';
import type { SnapshotFileEntry, EnvironmentSnapshot } from './types';

export interface SnapshotFileRow {
    snapshotId: number;
    fileRecordId: number;
    relativePath: string;
    contentHash: string;
    sizeBytes: number;
}

export interface SnapshotMetadataRow {
    id: number;
    projectId: number;
    environmentId: number;
    environmentName: string;
    label: string | null;
    createdAt: string;
    fileCount: number;
    totalBytes: number;
}

export interface SnapshotRepository {
    /**
     * Get a snapshot by ID with all its file entries
     */
    getSnapshotById(snapshotId: number): Promise<EnvironmentSnapshot | null>;

    /**
     * Get the latest snapshot for an environment
     */
    getLatestSnapshotByEnvironmentId(environmentId: number): Promise<EnvironmentSnapshot | null>;

    /**
     * Get all snapshots for an environment
     */
    getSnapshotsByEnvironmentId(environmentId: number): Promise<EnvironmentSnapshot[]>;

    /**
     * Get snapshot by environment name within a project
     * Returns the latest snapshot if multiple exist
     */
    getLatestSnapshotByEnvironmentName(
        projectId: number,
        environmentName: string,
    ): Promise<EnvironmentSnapshot | null>;

    /**
     * Get all snapshots for a project
     */
    getSnapshotsByProjectId(projectId: number): Promise<EnvironmentSnapshot[]>;

    /**
     * Get file entries for a snapshot
     */
    getSnapshotFiles(snapshotId: number): Promise<SnapshotFileEntry[]>;
}

export function createSnapshotRepository(db: SqliteDatabase): SnapshotRepository {
    const getSnapshotMetadata = db.prepare(`
        SELECT 
            s.id,
            s.project_id AS projectId,
            s.environment_id AS environmentId,
            e.name AS environmentName,
            s.label,
            s.created_at AS createdAt,
            s.file_count AS fileCount,
            s.total_bytes AS totalBytes
        FROM snapshots s
        INNER JOIN environments e ON s.environment_id = e.id
        WHERE s.id = ?
    `);

    const getSnapshotFileEntries = db.prepare(`
        SELECT 
            snapshot_id AS snapshotId,
            relative_path AS relativePath,
            content_hash AS contentHash,
            size_bytes AS sizeBytes
        FROM snapshot_files
        WHERE snapshot_id = ?
        ORDER BY relative_path ASC
    `);

    const getLatestByEnvironmentId = db.prepare(`
        SELECT 
            s.id,
            s.project_id AS projectId,
            s.environment_id AS environmentId,
            e.name AS environmentName,
            s.label,
            s.created_at AS createdAt,
            s.file_count AS fileCount,
            s.total_bytes AS totalBytes
        FROM snapshots s
        INNER JOIN environments e ON s.environment_id = e.id
        WHERE s.environment_id = ?
        ORDER BY s.created_at DESC
        LIMIT 1
    `);

    const getAllByEnvironmentId = db.prepare(`
        SELECT 
            s.id,
            s.project_id AS projectId,
            s.environment_id AS environmentId,
            e.name AS environmentName,
            s.label,
            s.created_at AS createdAt,
            s.file_count AS fileCount,
            s.total_bytes AS totalBytes
        FROM snapshots s
        INNER JOIN environments e ON s.environment_id = e.id
        WHERE s.environment_id = ?
        ORDER BY s.created_at DESC
    `);

    const getLatestByEnvironmentName = db.prepare(`
        SELECT 
            s.id,
            s.project_id AS projectId,
            s.environment_id AS environmentId,
            e.name AS environmentName,
            s.label,
            s.created_at AS createdAt,
            s.file_count AS fileCount,
            s.total_bytes AS totalBytes
        FROM snapshots s
        INNER JOIN environments e ON s.environment_id = e.id
        WHERE s.project_id = ? AND e.name = ?
        ORDER BY s.created_at DESC
        LIMIT 1
    `);

    const getAllByProjectId = db.prepare(`
        SELECT 
            s.id,
            s.project_id AS projectId,
            s.environment_id AS environmentId,
            e.name AS environmentName,
            s.label,
            s.created_at AS createdAt,
            s.file_count AS fileCount,
            s.total_bytes AS totalBytes
        FROM snapshots s
        INNER JOIN environments e ON s.environment_id = e.id
        WHERE s.project_id = ?
        ORDER BY e.name ASC, s.created_at DESC
    `);

    const mapMetadataRow = (row: any): SnapshotMetadataRow => ({
        id: row.id,
        projectId: row.projectId,
        environmentId: row.environmentId,
        environmentName: row.environmentName,
        label: row.label ?? null,
        createdAt: row.createdAt,
        fileCount: row.fileCount,
        totalBytes: row.totalBytes,
    });

    const mapFileRow = (row: any): SnapshotFileEntry => ({
        relativePath: row.relativePath,
        contentHash: row.contentHash,
        sizeBytes: row.sizeBytes,
    });

    const buildSnapshot = (metadata: SnapshotMetadataRow, files: SnapshotFileEntry[]): EnvironmentSnapshot => ({
        id: metadata.id,
        environmentId: metadata.environmentId,
        environmentName: metadata.environmentName,
        label: metadata.label,
        createdAt: metadata.createdAt,
        fileCount: metadata.fileCount,
        totalBytes: metadata.totalBytes,
        files,
    });

    async function getSnapshotById(snapshotId: number): Promise<EnvironmentSnapshot | null> {
        const metadata = getSnapshotMetadata.get(snapshotId) as any;
        if (!metadata) {
            return null;
        }

        const fileRows = getSnapshotFileEntries.all(snapshotId) as any[];
        const files = fileRows.map(mapFileRow);

        return buildSnapshot(mapMetadataRow(metadata), files);
    }

    async function getLatestSnapshotByEnvironmentId(environmentId: number): Promise<EnvironmentSnapshot | null> {
        const metadata = getLatestByEnvironmentId.get(environmentId) as any;
        if (!metadata) {
            return null;
        }

        const fileRows = getSnapshotFileEntries.all(metadata.id) as any[];
        const files = fileRows.map(mapFileRow);

        return buildSnapshot(mapMetadataRow(metadata), files);
    }

    async function getSnapshotsByEnvironmentId(environmentId: number): Promise<EnvironmentSnapshot[]> {
        const metadataRows = getAllByEnvironmentId.all(environmentId) as any[];
        const snapshots: EnvironmentSnapshot[] = [];

        for (const metadata of metadataRows) {
            const fileRows = getSnapshotFileEntries.all(metadata.id) as any[];
            const files = fileRows.map(mapFileRow);
            snapshots.push(buildSnapshot(mapMetadataRow(metadata), files));
        }

        return snapshots;
    }

    async function getLatestSnapshotByEnvironmentName(
        projectId: number,
        environmentName: string,
    ): Promise<EnvironmentSnapshot | null> {
        const metadata = getLatestByEnvironmentName.get(projectId, environmentName) as any;
        if (!metadata) {
            return null;
        }

        const fileRows = getSnapshotFileEntries.all(metadata.id) as any[];
        const files = fileRows.map(mapFileRow);

        return buildSnapshot(mapMetadataRow(metadata), files);
    }

    async function getSnapshotsByProjectId(projectId: number): Promise<EnvironmentSnapshot[]> {
        const metadataRows = getAllByProjectId.all(projectId) as any[];
        const snapshots: EnvironmentSnapshot[] = [];

        for (const metadata of metadataRows) {
            const fileRows = getSnapshotFileEntries.all(metadata.id) as any[];
            const files = fileRows.map(mapFileRow);
            snapshots.push(buildSnapshot(mapMetadataRow(metadata), files));
        }

        return snapshots;
    }

    async function getSnapshotFiles(snapshotId: number): Promise<SnapshotFileEntry[]> {
        const fileRows = getSnapshotFileEntries.all(snapshotId) as any[];
        return fileRows.map(mapFileRow);
    }

    return {
        getSnapshotById,
        getLatestSnapshotByEnvironmentId,
        getSnapshotsByEnvironmentId,
        getLatestSnapshotByEnvironmentName,
        getSnapshotsByProjectId,
        getSnapshotFiles,
    };
}
