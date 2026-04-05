export * from './bootstrap';
export * from './credentials';
export * from './types';

import fs from 'node:fs';
import path from 'node:path';

import { createDiffEngine, type DiffResult } from '../core/shared/utils';
import { openSqliteDatabase, type SqliteDatabase } from './sqlite';

export type EnvironmentKind = 'local' | 'test' | 'prod';

export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ProjectRow {
    id: number;
    name: string;
    rootPath: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface EnvironmentRow {
    id: number;
    projectId: number;
    kind: EnvironmentKind;
    name: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface FileRecordRow {
    id: number;
    projectId: number;
    relativePath: string;
    absolutePath: string | null;
    contentHash: string;
    sizeBytes: number;
    modifiedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SnapshotRow {
    id: number;
    projectId: number;
    environmentId: number;
    label: string | null;
    createdAt: string;
    fileCount: number;
    totalBytes: number;
}

export interface SnapshotFileRow {
    snapshotId: number;
    fileRecordId: number;
    relativePath: string;
    contentHash: string;
    sizeBytes: number;
}

export interface BackupRow {
    id: number;
    projectId: number;
    environmentId: number | null;
    snapshotId: number | null;
    status: BackupStatus;
    storagePath: string;
    startedAt: string;
    finishedAt: string | null;
    bytesStored: number | null;
    errorMessage: string | null;
}

export interface CreateProjectInput {
    name: string;
    rootPath?: string | null;
}

export interface UpdateProjectInput {
    name?: string;
    rootPath?: string | null;
}

export interface UpsertEnvironmentInput {
    projectId: number;
    kind: EnvironmentKind;
    name?: string | null;
    isActive?: boolean;
}

export interface UpsertFileRecordInput {
    projectId: number;
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
    fileCount?: number;
    totalBytes?: number;
}

export interface SnapshotFileInput {
    snapshotId: number;
    fileRecordId: number;
    relativePath: string;
    contentHash: string;
    sizeBytes: number;
}

export interface CreateBackupInput {
    projectId: number;
    environmentId?: number | null;
    snapshotId?: number | null;
    status?: BackupStatus;
    storagePath: string;
    bytesStored?: number | null;
    errorMessage?: string | null;
}

export interface DatabaseLayer {
    db: SqliteDatabase;
    projects: {
        create: (input: CreateProjectInput) => ProjectRow;
        list: () => ProjectRow[];
        getById: (id: number) => ProjectRow | null;
        update: (id: number, input: UpdateProjectInput) => ProjectRow | null;
        delete: (id: number) => boolean;
    };
    environments: {
        upsert: (input: UpsertEnvironmentInput) => EnvironmentRow;
        listByProject: (projectId: number) => EnvironmentRow[];
        getById: (id: number) => EnvironmentRow | null;
        getByProjectAndKind: (projectId: number, kind: EnvironmentKind) => EnvironmentRow | null;
    };
    files: {
        upsert: (input: UpsertFileRecordInput) => FileRecordRow;
        listByProject: (projectId: number) => FileRecordRow[];
        getById: (id: number) => FileRecordRow | null;
        getByProjectAndPath: (projectId: number, relativePath: string) => FileRecordRow | null;
    };
    snapshots: {
        create: (input: CreateSnapshotInput) => SnapshotRow;
        listByProject: (projectId: number) => SnapshotRow[];
        listByProjectAndEnvironment: (projectId: number, environmentId: number) => SnapshotRow[];
        getById: (id: number) => SnapshotRow | null;
        getByProjectAndEnvironment: (projectId: number, environmentId: number) => SnapshotRow | null;
        replaceFiles: (snapshotId: number, files: SnapshotFileInput[]) => SnapshotFileRow[];
        listFiles: (snapshotId: number) => SnapshotFileRow[];
        compare: (
            sourceSnapshotId: number,
            targetSnapshotId: number,
        ) => Promise<DiffResult<SnapshotFileRow, SnapshotFileRow>>;
    };
    backups: {
        create: (input: CreateBackupInput) => BackupRow;
        listByProject: (projectId: number) => BackupRow[];
        getById: (id: number) => BackupRow | null;
        updateStatus: (
            id: number,
            input: {
                status: BackupStatus;
                bytesStored?: number | null;
                errorMessage?: string | null;
                finished?: boolean;
            },
        ) => BackupRow | null;
    };
    close: () => void;
}

interface Migration {
    version: number;
    name: string;
    up: (db: SqliteDatabase) => void;
}

interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
}

const migrations: Migration[] = [
    {
        version: 1,
        name: 'initial_schema',
        up: (db) => {
            db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          root_path TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS environments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          kind TEXT NOT NULL CHECK (kind IN ('local', 'test', 'prod')),
          name TEXT,
          is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, kind)
        );

        CREATE TABLE IF NOT EXISTS file_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          relative_path TEXT NOT NULL,
          absolute_path TEXT,
          content_hash TEXT NOT NULL,
          size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
          modified_at TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, relative_path)
        );

        CREATE INDEX IF NOT EXISTS idx_file_records_project_id
          ON file_records(project_id);

        CREATE TABLE IF NOT EXISTS snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    environment_id INTEGER NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
          label TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          file_count INTEGER NOT NULL DEFAULT 0 CHECK (file_count >= 0),
          total_bytes INTEGER NOT NULL DEFAULT 0 CHECK (total_bytes >= 0)
        );

        CREATE INDEX IF NOT EXISTS idx_snapshots_project_created_at
          ON snapshots(project_id, created_at DESC);

        CREATE TABLE IF NOT EXISTS snapshot_files (
          snapshot_id INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
          file_record_id INTEGER NOT NULL REFERENCES file_records(id) ON DELETE CASCADE,
          relative_path TEXT NOT NULL,
          content_hash TEXT NOT NULL,
          size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
          PRIMARY KEY (snapshot_id, file_record_id)
        );

        CREATE INDEX IF NOT EXISTS idx_snapshot_files_file_record_id
          ON snapshot_files(file_record_id);

        CREATE TABLE IF NOT EXISTS backups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          environment_id INTEGER REFERENCES environments(id) ON DELETE SET NULL,
          snapshot_id INTEGER REFERENCES snapshots(id) ON DELETE SET NULL,
          status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
          storage_path TEXT NOT NULL,
          started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          finished_at TEXT,
          bytes_stored INTEGER,
          error_message TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_backups_project_started_at
          ON backups(project_id, started_at DESC);
      `);
        },
    },
];

const toBoolean = (value: number): boolean => value === 1;

const normalizeRowid = (rowid: number | bigint): number =>
    typeof rowid === 'bigint' ? Number(rowid) : rowid;

const mapProject = (row: any): ProjectRow => ({
    id: row.id,
    name: row.name,
    rootPath: row.rootPath ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

const mapEnvironment = (row: any): EnvironmentRow => ({
    id: row.id,
    projectId: row.projectId,
    kind: row.kind as EnvironmentKind,
    name: row.name ?? null,
    isActive: toBoolean(row.isActive),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

const mapFileRecord = (row: any): FileRecordRow => ({
    id: row.id,
    projectId: row.projectId,
    relativePath: row.relativePath,
    absolutePath: row.absolutePath ?? null,
    contentHash: row.contentHash,
    sizeBytes: row.sizeBytes,
    modifiedAt: row.modifiedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

const mapSnapshot = (row: any): SnapshotRow => ({
    id: row.id,
    projectId: row.projectId,
    environmentId: row.environmentId,
    label: row.label ?? null,
    createdAt: row.createdAt,
    fileCount: row.fileCount,
    totalBytes: row.totalBytes,
});

const mapSnapshotFile = (row: any): SnapshotFileRow => ({
    snapshotId: row.snapshotId,
    fileRecordId: row.fileRecordId,
    relativePath: row.relativePath,
    contentHash: row.contentHash,
    sizeBytes: row.sizeBytes,
});

const mapBackup = (row: any): BackupRow => ({
    id: row.id,
    projectId: row.projectId,
    environmentId: row.environmentId ?? null,
    snapshotId: row.snapshotId ?? null,
    status: row.status as BackupStatus,
    storagePath: row.storagePath,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt ?? null,
    bytesStored: row.bytesStored ?? null,
    errorMessage: row.errorMessage ?? null,
});

const ensureDirectory = (filePath: string) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const ensureMigrationsTable = (db: SqliteDatabase) => {
    db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const getAppliedVersions = (db: SqliteDatabase): Set<number> => {
    const rows = db.prepare('SELECT version FROM schema_migrations ORDER BY version ASC').all() as Array<{
        version: number;
    }>;

    return new Set(rows.map((row) => row.version));
};

const runMigrations = (db: SqliteDatabase) => {
    ensureMigrationsTable(db);

    const appliedVersions = getAppliedVersions(db);
    const insertMigration = db.prepare(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    );

    db.transaction(() => {
        for (const migration of migrations) {
            if (appliedVersions.has(migration.version)) {
                continue;
            }

            migration.up(db);
            insertMigration.run(migration.version, migration.name);
        }
    })();
};

function isSqliteResult(result: unknown): result is RunResult {
    return typeof result === 'object' && result !== null && 'changes' in result && 'lastInsertRowid' in result;
}

const asRunResult = (result: unknown): RunResult => {
    if (!isSqliteResult(result)) {
        throw new Error('Unexpected SQLite result shape.');
    }

    return result;
};

const createProjectQueries = (db: SqliteDatabase) => {
    const insert = db.prepare(
        `
      INSERT INTO projects (name, root_path)
      VALUES (@name, @rootPath)
    `,
    );
    const list = db.prepare('SELECT id, name, root_path AS rootPath, created_at AS createdAt, updated_at AS updatedAt FROM projects ORDER BY name ASC');
    const getById = db.prepare('SELECT id, name, root_path AS rootPath, created_at AS createdAt, updated_at AS updatedAt FROM projects WHERE id = ?');
    const update = db.prepare(
        `
      UPDATE projects
      SET
        name = COALESCE(@name, name),
        root_path = CASE WHEN @hasRootPath = 1 THEN @rootPath ELSE root_path END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `,
    );
    const remove = db.prepare('DELETE FROM projects WHERE id = ?');
    const getProjectById = (id: number): ProjectRow | null => {
        const row = getById.get(id);
        return row ? mapProject(row) : null;
    };

    return {
        create(input: CreateProjectInput): ProjectRow {
            const result = asRunResult(insert.run({ name: input.name, rootPath: input.rootPath ?? null }));
            const row = getById.get(normalizeRowid(result.lastInsertRowid));
            if (!row) {
                throw new Error('Project insert failed.');
            }

            return mapProject(row);
        },
        list(): ProjectRow[] {
            return list.all().map(mapProject);
        },
        getById(id: number): ProjectRow | null {
            return getProjectById(id);
        },
        update(id: number, input: UpdateProjectInput): ProjectRow | null {
            const result = asRunResult(
                update.run({
                    id,
                    name: input.name ?? null,
                    rootPath: input.rootPath ?? null,
                    hasRootPath: Object.prototype.hasOwnProperty.call(input, 'rootPath') ? 1 : 0,
                }),
            );

            if (result.changes === 0) {
                return null;
            }

            return getProjectById(id);
        },
        delete(id: number): boolean {
            const result = asRunResult(remove.run(id));
            return result.changes > 0;
        },
    };
};

const createEnvironmentQueries = (db: SqliteDatabase) => {
    const upsert = db.prepare(
        `
      INSERT INTO environments (project_id, kind, name, is_active)
      VALUES (@projectId, @kind, @name, @isActive)
      ON CONFLICT(project_id, kind) DO UPDATE SET
        name = excluded.name,
        is_active = excluded.is_active,
        updated_at = CURRENT_TIMESTAMP
    `,
    );
    const list = db.prepare(
        'SELECT id, project_id AS projectId, kind, name, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt FROM environments WHERE project_id = ? ORDER BY kind ASC',
    );
    const getById = db.prepare(
        'SELECT id, project_id AS projectId, kind, name, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt FROM environments WHERE id = ?',
    );
    const getByProjectAndKind = db.prepare(
        'SELECT id, project_id AS projectId, kind, name, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt FROM environments WHERE project_id = ? AND kind = ? LIMIT 1',
    );
    const getEnvironmentByProjectAndKind = (
        projectId: number,
        kind: EnvironmentKind,
    ): EnvironmentRow | null => {
        const row = getByProjectAndKind.get(projectId, kind);
        return row ? mapEnvironment(row) : null;
    };

    return {
        upsert(input: UpsertEnvironmentInput): EnvironmentRow {
            asRunResult(
                upsert.run({
                    projectId: input.projectId,
                    kind: input.kind,
                    name: input.name ?? null,
                    isActive: input.isActive === false ? 0 : 1,
                }),
            );

            const row = getByProjectAndKind.get(input.projectId, input.kind);
            if (!row) {
                throw new Error('Environment upsert failed.');
            }

            return mapEnvironment(row);
        },
        listByProject(projectId: number): EnvironmentRow[] {
            return list.all(projectId).map(mapEnvironment);
        },
        getById(id: number): EnvironmentRow | null {
            const row = getById.get(id);
            return row ? mapEnvironment(row) : null;
        },
        getByProjectAndKind(projectId: number, kind: EnvironmentKind): EnvironmentRow | null {
            return getEnvironmentByProjectAndKind(projectId, kind);
        },
    };
};

const createFileRecordQueries = (db: SqliteDatabase) => {
    const upsert = db.prepare(
        `
      INSERT INTO file_records (
        project_id,
        relative_path,
        absolute_path,
        content_hash,
        size_bytes,
        modified_at
      )
      VALUES (
        @projectId,
        @relativePath,
        @absolutePath,
        @contentHash,
        @sizeBytes,
        @modifiedAt
      )
      ON CONFLICT(project_id, relative_path) DO UPDATE SET
        absolute_path = excluded.absolute_path,
        content_hash = excluded.content_hash,
        size_bytes = excluded.size_bytes,
        modified_at = excluded.modified_at,
        updated_at = CURRENT_TIMESTAMP
    `,
    );
    const list = db.prepare(
        'SELECT id, project_id AS projectId, relative_path AS relativePath, absolute_path AS absolutePath, content_hash AS contentHash, size_bytes AS sizeBytes, modified_at AS modifiedAt, created_at AS createdAt, updated_at AS updatedAt FROM file_records WHERE project_id = ? ORDER BY relative_path ASC',
    );
    const getById = db.prepare(
        'SELECT id, project_id AS projectId, relative_path AS relativePath, absolute_path AS absolutePath, content_hash AS contentHash, size_bytes AS sizeBytes, modified_at AS modifiedAt, created_at AS createdAt, updated_at AS updatedAt FROM file_records WHERE id = ?',
    );
    const getByProjectAndPath = db.prepare(
        'SELECT id, project_id AS projectId, relative_path AS relativePath, absolute_path AS absolutePath, content_hash AS contentHash, size_bytes AS sizeBytes, modified_at AS modifiedAt, created_at AS createdAt, updated_at AS updatedAt FROM file_records WHERE project_id = ? AND relative_path = ? LIMIT 1',
    );
    const getFileRecordByProjectAndPath = (projectId: number, relativePath: string): FileRecordRow | null => {
        const row = getByProjectAndPath.get(projectId, relativePath);
        return row ? mapFileRecord(row) : null;
    };

    return {
        upsert(input: UpsertFileRecordInput): FileRecordRow {
            asRunResult(
                upsert.run({
                    projectId: input.projectId,
                    relativePath: input.relativePath,
                    absolutePath: input.absolutePath ?? null,
                    contentHash: input.contentHash,
                    sizeBytes: input.sizeBytes,
                    modifiedAt: input.modifiedAt ?? null,
                }),
            );

            const row = getByProjectAndPath.get(input.projectId, input.relativePath);
            if (!row) {
                throw new Error('File record upsert failed.');
            }

            return mapFileRecord(row);
        },
        listByProject(projectId: number): FileRecordRow[] {
            return list.all(projectId).map(mapFileRecord);
        },
        getById(id: number): FileRecordRow | null {
            const row = getById.get(id);
            return row ? mapFileRecord(row) : null;
        },
        getByProjectAndPath(projectId: number, relativePath: string): FileRecordRow | null {
            return getFileRecordByProjectAndPath(projectId, relativePath);
        },
    };
};

const createSnapshotQueries = (db: SqliteDatabase) => {
    const insert = db.prepare(
        `
      INSERT INTO snapshots (project_id, environment_id, label, file_count, total_bytes)
      VALUES (@projectId, @environmentId, @label, @fileCount, @totalBytes)
    `,
    );
    const list = db.prepare(
        'SELECT id, project_id AS projectId, environment_id AS environmentId, label, created_at AS createdAt, file_count AS fileCount, total_bytes AS totalBytes FROM snapshots WHERE project_id = ? ORDER BY created_at DESC, id DESC',
    );
    const getEnvironmentById = db.prepare(
        'SELECT id, project_id AS projectId FROM environments WHERE id = ?',
    );
    const listByProjectAndEnvironment = db.prepare(
        'SELECT id, project_id AS projectId, environment_id AS environmentId, label, created_at AS createdAt, file_count AS fileCount, total_bytes AS totalBytes FROM snapshots WHERE project_id = ? AND environment_id = ? ORDER BY created_at DESC, id DESC',
    );
    const getById = db.prepare(
        'SELECT id, project_id AS projectId, environment_id AS environmentId, label, created_at AS createdAt, file_count AS fileCount, total_bytes AS totalBytes FROM snapshots WHERE id = ?',
    );
    const getByProjectAndEnvironment = db.prepare(
        'SELECT id, project_id AS projectId, environment_id AS environmentId, label, created_at AS createdAt, file_count AS fileCount, total_bytes AS totalBytes FROM snapshots WHERE project_id = ? AND environment_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
    );
    const insertSnapshotFile = db.prepare(
        `
      INSERT INTO snapshot_files (
        snapshot_id,
        file_record_id,
        relative_path,
        content_hash,
        size_bytes
      )
      VALUES (
        @snapshotId,
        @fileRecordId,
        @relativePath,
        @contentHash,
        @sizeBytes
      )
    `,
    );
    const deleteSnapshotFiles = db.prepare('DELETE FROM snapshot_files WHERE snapshot_id = ?');
    const listSnapshotFiles = db.prepare(
        'SELECT snapshot_id AS snapshotId, file_record_id AS fileRecordId, relative_path AS relativePath, content_hash AS contentHash, size_bytes AS sizeBytes FROM snapshot_files WHERE snapshot_id = ? ORDER BY relative_path ASC',
    );
    const updateCounts = db.prepare(
        'UPDATE snapshots SET file_count = @fileCount, total_bytes = @totalBytes WHERE id = @snapshotId',
    );
    const compareEngine = createDiffEngine<SnapshotFileRow>({
        sourceKey: (file) => file.relativePath,
        areEqual: (source, target) => source.contentHash === target.contentHash && source.sizeBytes === target.sizeBytes,
    });
    const listFilesForSnapshot = (snapshotId: number): SnapshotFileRow[] =>
        listSnapshotFiles.all(snapshotId).map(mapSnapshotFile);
    const describeSnapshot = (snapshot: SnapshotRow) => {
        const label = snapshot.label?.trim();
        const baseLabel = label && label.length > 0 ? label : `snapshot ${snapshot.id}`;

        return `${baseLabel} (project ${snapshot.projectId}, environment ${snapshot.environmentId})`;
    };

    return {
        create(input: CreateSnapshotInput): SnapshotRow {
            const environment = getEnvironmentById.get(input.environmentId) as { id: number; projectId: number } | undefined;

            if (!environment) {
                throw new Error(`Environment ${input.environmentId} was not found.`);
            }

            if (environment.projectId !== input.projectId) {
                throw new Error(`Environment ${input.environmentId} does not belong to project ${input.projectId}.`);
            }

            const result = asRunResult(
                insert.run({
                    projectId: input.projectId,
                    environmentId: input.environmentId,
                    label: input.label ?? null,
                    fileCount: input.fileCount ?? 0,
                    totalBytes: input.totalBytes ?? 0,
                }),
            );

            const row = getById.get(normalizeRowid(result.lastInsertRowid));
            if (!row) {
                throw new Error('Snapshot insert failed.');
            }

            return mapSnapshot(row);
        },
        listByProject(projectId: number): SnapshotRow[] {
            return list.all(projectId).map(mapSnapshot);
        },
        listByProjectAndEnvironment(projectId: number, environmentId: number): SnapshotRow[] {
            return listByProjectAndEnvironment.all(projectId, environmentId).map(mapSnapshot);
        },
        getById(id: number): SnapshotRow | null {
            const row = getById.get(id);
            return row ? mapSnapshot(row) : null;
        },
        getByProjectAndEnvironment(projectId: number, environmentId: number): SnapshotRow | null {
            const row = getByProjectAndEnvironment.get(projectId, environmentId);
            return row ? mapSnapshot(row) : null;
        },
        replaceFiles(snapshotId: number, files: SnapshotFileInput[]): SnapshotFileRow[] {
            db.transaction((nextFiles: SnapshotFileInput[]) => {
                deleteSnapshotFiles.run(snapshotId);

                let fileCount = 0;
                let totalBytes = 0;

                for (const file of nextFiles) {
                    insertSnapshotFile.run(file);
                    fileCount += 1;
                    totalBytes += file.sizeBytes;
                }

                updateCounts.run({ snapshotId, fileCount, totalBytes });
            })(files);

            return listFilesForSnapshot(snapshotId);
        },
        listFiles(snapshotId: number): SnapshotFileRow[] {
            return listFilesForSnapshot(snapshotId);
        },
        async compare(sourceSnapshotId: number, targetSnapshotId: number): Promise<DiffResult<SnapshotFileRow, SnapshotFileRow>> {
            const sourceSnapshot = getById.get(sourceSnapshotId);
            const targetSnapshot = getById.get(targetSnapshotId);

            if (!sourceSnapshot) {
                throw new Error(`Snapshot ${sourceSnapshotId} was not found.`);
            }

            if (!targetSnapshot) {
                throw new Error(`Snapshot ${targetSnapshotId} was not found.`);
            }

            return compareEngine.compare(
                listFilesForSnapshot(sourceSnapshotId),
                listFilesForSnapshot(targetSnapshotId),
                {
                    source: describeSnapshot(mapSnapshot(sourceSnapshot)),
                    target: describeSnapshot(mapSnapshot(targetSnapshot)),
                },
            );
        },
    };
};

const createBackupQueries = (db: SqliteDatabase) => {
    const insert = db.prepare(
        `
      INSERT INTO backups (
        project_id,
        environment_id,
        snapshot_id,
        status,
        storage_path,
        bytes_stored,
        error_message
      )
      VALUES (
        @projectId,
        @environmentId,
        @snapshotId,
        @status,
        @storagePath,
        @bytesStored,
        @errorMessage
      )
    `,
    );
    const list = db.prepare(
        'SELECT id, project_id AS projectId, environment_id AS environmentId, snapshot_id AS snapshotId, status, storage_path AS storagePath, started_at AS startedAt, finished_at AS finishedAt, bytes_stored AS bytesStored, error_message AS errorMessage FROM backups WHERE project_id = ? ORDER BY started_at DESC, id DESC',
    );
    const getById = db.prepare(
        'SELECT id, project_id AS projectId, environment_id AS environmentId, snapshot_id AS snapshotId, status, storage_path AS storagePath, started_at AS startedAt, finished_at AS finishedAt, bytes_stored AS bytesStored, error_message AS errorMessage FROM backups WHERE id = ?',
    );
    const updateStatus = db.prepare(
        `
      UPDATE backups
      SET status = @status,
          finished_at = CASE WHEN @finished = 1 THEN CURRENT_TIMESTAMP ELSE finished_at END,
          bytes_stored = COALESCE(@bytesStored, bytes_stored),
          error_message = @errorMessage
      WHERE id = @id
    `,
    );
    const getBackupById = (id: number): BackupRow | null => {
        const row = getById.get(id);
        return row ? mapBackup(row) : null;
    };

    return {
        create(input: CreateBackupInput): BackupRow {
            const result = asRunResult(
                insert.run({
                    projectId: input.projectId,
                    environmentId: input.environmentId ?? null,
                    snapshotId: input.snapshotId ?? null,
                    status: input.status ?? 'pending',
                    storagePath: input.storagePath,
                    bytesStored: input.bytesStored ?? null,
                    errorMessage: input.errorMessage ?? null,
                }),
            );

            const row = getById.get(normalizeRowid(result.lastInsertRowid));
            if (!row) {
                throw new Error('Backup insert failed.');
            }

            return mapBackup(row);
        },
        listByProject(projectId: number): BackupRow[] {
            return list.all(projectId).map(mapBackup);
        },
        getById(id: number): BackupRow | null {
            const row = getById.get(id);
            return row ? mapBackup(row) : null;
        },
        updateStatus(
            id: number,
            input: {
                status: BackupStatus;
                bytesStored?: number | null;
                errorMessage?: string | null;
                finished?: boolean;
            },
        ): BackupRow | null {
            const result = asRunResult(
                updateStatus.run({
                    id,
                    status: input.status,
                    finished: input.finished === false ? 0 : 1,
                    bytesStored: input.bytesStored ?? null,
                    errorMessage: input.errorMessage ?? null,
                }),
            );

            if (result.changes === 0) {
                return null;
            }

            return getBackupById(id);
        },
    };
};

export interface InitializeDatabaseOptions {
    filePath: string;
}

export function initializeDatabase(options: InitializeDatabaseOptions): DatabaseLayer {
    fs.mkdirSync(path.dirname(options.filePath), { recursive: true });

    const db = openSqliteDatabase(options.filePath);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('temp_store = MEMORY');

    ensureMigrationsTable(db);
    runMigrations(db);

    const projects = createProjectQueries(db);
    const environments = createEnvironmentQueries(db);
    const files = createFileRecordQueries(db);
    const snapshots = createSnapshotQueries(db);
    const backups = createBackupQueries(db);

    return {
        db,
        projects,
        environments,
        files,
        snapshots,
        backups,
        close: () => db.close(),
    };
}
