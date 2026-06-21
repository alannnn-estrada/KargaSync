import fs from 'node:fs';
import path from 'node:path';

import { createCredentialManager } from './credentials';
import { createProjectManager, type ProjectManager } from './project-manager';
import { createSettingsManager, type SettingsManager } from './settings-manager';
import { openSqliteDatabase, type SqliteDatabase } from './sqlite';
import schemaSql from './schema.sql?raw';
import type { CredentialManager } from './types';

export interface InitializeDatabaseOptions {
    filePath: string;
}

export interface DatabaseHandle {
    db: SqliteDatabase;
    credentials: CredentialManager;
    projectManager: ProjectManager;
    settings: SettingsManager;
    close: () => void;
}

const ensureDirectory = (filePath: string) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const recordInitialMigration = (db: SqliteDatabase) => {
    const applied = db
        .prepare('SELECT 1 FROM schema_migrations WHERE version = ? LIMIT 1')
        .get(1) as { '1': number } | undefined;

    if (!applied) {
        db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(1, 'initial_schema');
    }
};

const applyServerModelMigration = (db: SqliteDatabase) => {
    const hasServers = db
        .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'servers' LIMIT 1")
        .get() as { '1': number } | undefined;

    if (!hasServers) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS servers (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              host TEXT NOT NULL,
              port INTEGER NOT NULL CHECK (port > 0 AND port < 65536),
              username TEXT NOT NULL,
              auth_type TEXT NOT NULL CHECK (auth_type IN ('password', 'key')),
              protocol TEXT NOT NULL CHECK (protocol IN ('ftp', 'sftp')) DEFAULT 'sftp',
              credential_ref TEXT NOT NULL UNIQUE,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(host, port, username, auth_type, protocol)
            );
        `);

        const hasConnections = db
            .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'connections' LIMIT 1")
            .get() as { '1': number } | undefined;

        if (hasConnections) {
            db.exec(`
                INSERT INTO servers (id, host, port, username, auth_type, protocol, credential_ref, created_at, updated_at)
                SELECT id, host, port, username, auth_type, 'sftp', credential_ref, created_at, updated_at
                FROM connections;
            `);
        }
    }

    const serverColumns = db.prepare('PRAGMA table_info(servers)').all() as Array<{ name: string }>;
    const hasServerName = serverColumns.some((column) => column.name === 'name');

    if (!hasServerName) {
        db.exec('ALTER TABLE servers ADD COLUMN name TEXT');
    }

    const bindingColumns = db.prepare('PRAGMA table_info(environment_bindings)').all() as Array<{ name: string }>;
    const hasServerId = bindingColumns.some((column) => column.name === 'server_id');
    const hasEnvironmentName = bindingColumns.some((column) => column.name === 'environment_name');

    if (!hasServerId || !hasEnvironmentName) {
        db.exec(`
            ALTER TABLE environment_bindings RENAME TO environment_bindings_legacy;

            CREATE TABLE environment_bindings (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              environment_id INTEGER NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
              binding_type TEXT NOT NULL CHECK (binding_type IN ('local', 'remote')),
              local_path TEXT,
              server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
              remote_path TEXT,
              environment_name TEXT,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CHECK (
                (binding_type = 'local' AND local_path IS NOT NULL AND server_id IS NULL AND remote_path IS NULL AND environment_name IS NULL)
                OR
                (binding_type = 'remote' AND local_path IS NULL AND server_id IS NOT NULL AND remote_path IS NOT NULL)
              )
            );

            INSERT INTO environment_bindings (
                id,
                environment_id,
                binding_type,
                local_path,
                server_id,
                remote_path,
                environment_name,
                created_at,
                updated_at
            )
            SELECT
                id,
                environment_id,
                binding_type,
                local_path,
                connection_id,
                remote_path,
                NULL,
                created_at,
                updated_at
            FROM environment_bindings_legacy;

            DROP TABLE environment_bindings_legacy;

            CREATE INDEX IF NOT EXISTS idx_environment_bindings_environment_id
              ON environment_bindings(environment_id);
            CREATE INDEX IF NOT EXISTS idx_environment_bindings_server_id
              ON environment_bindings(server_id);
        `);
    }

    const migrationApplied = db
        .prepare('SELECT 1 FROM schema_migrations WHERE version = ? LIMIT 1')
        .get(2) as { '1': number } | undefined;

    if (!migrationApplied) {
        db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(2, 'server_environment_binding_model');
    }
};

const applyVersionsMigration = (db: SqliteDatabase) => {
    const hasTable = db
        .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='versions' LIMIT 1")
        .get() as { '1': number } | undefined;

    if (!hasTable) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS versions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
              remote_path TEXT NOT NULL,
              label TEXT,
              status TEXT NOT NULL CHECK(status IN ('pending','running','completed','failed')) DEFAULT 'pending',
              storage_path TEXT NOT NULL,
              file_count INTEGER NOT NULL DEFAULT 0,
              bytes_stored INTEGER NOT NULL DEFAULT 0,
              error_message TEXT,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              finished_at TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_versions_server_remote
              ON versions(server_id, remote_path, created_at DESC);
        `);
    }

    const applied = db
        .prepare('SELECT 1 FROM schema_migrations WHERE version = ? LIMIT 1')
        .get(3) as { '1': number } | undefined;

    if (!applied) {
        db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(3, 'versions_table');
    }
};

export function initializeDatabase(options: InitializeDatabaseOptions): DatabaseHandle {
    ensureDirectory(options.filePath);

    const db = openSqliteDatabase(options.filePath);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('temp_store = MEMORY');

    try {
        db.exec(schemaSql);
    } catch (err: any) {
        // If schema execution fails due to a missing column (e.g. older DB lacking
        // `server_id`) attempt to apply the server model migration first, then
        // re-run the schema SQL. This handles existing DB files created by
        // older releases where index creation may reference columns that don't
        // yet exist.
        const msg = String(err && err.message ? err.message : err);
        if (msg.includes('server_id') || msg.includes('no such column')) {
            applyServerModelMigration(db);
            db.exec(schemaSql);
        } else {
            throw err;
        }
    }

    recordInitialMigration(db);
    applyServerModelMigration(db);
    applyVersionsMigration(db);

    const credentials = createCredentialManager({
        fallbackFilePath: path.join(path.dirname(options.filePath), 'credential-store.json'),
        fallbackKeyFilePath: path.join(path.dirname(options.filePath), 'credential-store.key'),
    });
    const settings = createSettingsManager(db);

    settings.ensureDefaultSettings();

    return {
        db,
        credentials,
        projectManager: createProjectManager({ db, credentials }),
        settings,
        close: () => db.close(),
    };
}
