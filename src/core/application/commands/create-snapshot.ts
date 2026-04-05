import type { ProjectManager } from '../../../db/project-manager';
import type { SqliteDatabase } from '../../../db/sqlite';
import type { SnapshotRow } from '../../../db/types';

interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
}

interface FileRecordRow {
    id: number;
}

export interface SnapshotFileInput {
    relativePath: string;
    absolutePath?: string | null;
    contentHash: string;
    sizeBytes: number;
    modifiedAt?: string | null;
}

export interface CreateSnapshotInput {
    projectId: number;
    environmentId: number;
    label?: string | null;
    files: SnapshotFileInput[];
}

export interface CreateSnapshotCommand {
    execute: (input: CreateSnapshotInput) => SnapshotRow;
}

export interface CreateSnapshotCommandDependencies {
    db: SqliteDatabase;
    projectManager: ProjectManager;
}

const normalizeRowid = (rowid: number | bigint): number =>
    typeof rowid === 'bigint' ? Number(rowid) : rowid;

const asRunResult = (result: unknown): RunResult => {
    if (typeof result !== 'object' || result === null || !('changes' in result) || !('lastInsertRowid' in result)) {
        throw new Error('Unexpected SQLite result shape.');
    }

    return result as RunResult;
};

export function createCreateSnapshotCommand(
    { db, projectManager }: CreateSnapshotCommandDependencies,
): CreateSnapshotCommand {
    const getEnvironmentById = db.prepare(
        'SELECT id, project_id AS projectId FROM environments WHERE id = ?',
    );
    const insertFileRecord = db.prepare(
        `
        INSERT INTO file_records (project_id, relative_path, absolute_path, content_hash, size_bytes, modified_at)
        VALUES (@projectId, @relativePath, @absolutePath, @contentHash, @sizeBytes, @modifiedAt)
        ON CONFLICT(project_id, relative_path) DO UPDATE SET
            absolute_path = excluded.absolute_path,
            content_hash = excluded.content_hash,
            size_bytes = excluded.size_bytes,
            modified_at = excluded.modified_at,
            updated_at = CURRENT_TIMESTAMP
    `,
    );
    const getFileRecordByProjectAndPath = db.prepare(
        'SELECT id FROM file_records WHERE project_id = ? AND relative_path = ?',
    );
    const insertSnapshot = db.prepare(
        `
        INSERT INTO snapshots (project_id, environment_id, label, file_count, total_bytes)
        VALUES (@projectId, @environmentId, @label, @fileCount, @totalBytes)
    `,
    );
    const insertSnapshotFile = db.prepare(
        `
        INSERT INTO snapshot_files (snapshot_id, file_record_id, relative_path, content_hash, size_bytes)
        VALUES (@snapshotId, @fileRecordId, @relativePath, @contentHash, @sizeBytes)
    `,
    );
    const getSnapshotById = db.prepare(
        'SELECT id, project_id AS projectId, environment_id AS environmentId, label, created_at AS createdAt, file_count AS fileCount, total_bytes AS totalBytes FROM snapshots WHERE id = ?',
    );

    return {
        execute: (input) => {
            const project = projectManager.getProject(input.projectId);
            if (!project) {
                throw new Error(`Project not found: ${input.projectId}`);
            }

            const environment = getEnvironmentById.get(input.environmentId) as { id: number; projectId: number } | undefined;
            if (!environment) {
                throw new Error(`Environment not found: ${input.environmentId}`);
            }

            if (environment.projectId !== input.projectId) {
                throw new Error(`Environment ${input.environmentId} does not belong to project ${input.projectId}`);
            }

            const fileCount = input.files.length;
            const totalBytes = input.files.reduce((total, file) => total + file.sizeBytes, 0);

            let createdSnapshotId = 0;

            db.transaction(() => {
                const snapshotInsert = asRunResult(
                    insertSnapshot.run({
                        projectId: input.projectId,
                        environmentId: input.environmentId,
                        label: input.label ?? null,
                        fileCount,
                        totalBytes,
                    }),
                );

                createdSnapshotId = normalizeRowid(snapshotInsert.lastInsertRowid);

                for (const file of input.files) {
                    insertFileRecord.run({
                        projectId: input.projectId,
                        relativePath: file.relativePath,
                        absolutePath: file.absolutePath ?? null,
                        contentHash: file.contentHash,
                        sizeBytes: file.sizeBytes,
                        modifiedAt: file.modifiedAt ?? null,
                    });

                    const fileRecord = getFileRecordByProjectAndPath.get(
                        input.projectId,
                        file.relativePath,
                    ) as FileRecordRow | undefined;

                    if (!fileRecord) {
                        throw new Error(`Failed to upsert file record for path: ${file.relativePath}`);
                    }

                    insertSnapshotFile.run({
                        snapshotId: createdSnapshotId,
                        fileRecordId: fileRecord.id,
                        relativePath: file.relativePath,
                        contentHash: file.contentHash,
                        sizeBytes: file.sizeBytes,
                    });
                }
            })();

            const row = getSnapshotById.get(createdSnapshotId) as SnapshotRow | undefined;
            if (!row) {
                throw new Error('Snapshot insert failed.');
            }

            return row;
        },
    };
}
