import { randomUUID } from 'node:crypto';

import { toConnectionCredentialRef } from './credentials';
import type {
    ConnectionAuthType,
    ConnectionCredentialInput,
    ConnectionRow,
    CredentialManager,
    EnvironmentBindingRow,
    EnvironmentBindingType,
    EnvironmentRow,
    ProjectRow,
} from './types';
import type { SqliteDatabase } from './sqlite';

type RunResult = {
    changes: number;
    lastInsertRowid: number | bigint;
};

export interface ProjectManagerDependencies {
    db: SqliteDatabase;
    credentials: CredentialManager;
}

export interface CreateProjectInput {
    name: string;
    rootPath?: string | null;
}

export interface UpdateProjectInput {
    name?: string;
    rootPath?: string | null;
}

export interface CreateEnvironmentInput {
    projectId: number;
    name: string;
}

export interface CreateServerInput {
    name?: string | null;
    host: string;
    port: number;
    username: string;
    authType: ConnectionAuthType;
    protocol?: 'ftp' | 'sftp';
    secret: string | ConnectionCredentialInput;
}

export interface UpdateServerInput {
    name?: string | null;
    host?: string;
    port?: number;
    username?: string;
    authType?: ConnectionAuthType;
    protocol?: 'ftp' | 'sftp';
    secret?: string | ConnectionCredentialInput;
}

export interface LocalBindingInput {
    bindingType: 'local';
    localPath: string;
}

export interface RemoteBindingInput {
    bindingType: 'remote';
    serverId: number;
    connectionId?: number;
    remotePath: string;
    environmentName?: string;
}

export type RemoteBindingLegacyInput = {
    bindingType: 'remote';
    connectionId: number;
    remotePath: string;
    environmentName?: string;
};

export type EnvironmentBindingInput = LocalBindingInput | RemoteBindingInput | RemoteBindingLegacyInput;

export interface ResolveRemoteBindingInput {
    bindingId?: number;
    serverId?: number;
    connectionId?: number;
    environmentName?: string;
    remotePath?: string;
}

export interface ResolvedRemoteBinding {
    environment: EnvironmentRow;
    binding: EnvironmentBindingRow;
    connection: ConnectionRow;
    server: ConnectionRow;
}

export type CreateConnectionInput = CreateServerInput;
export type CreateConnectionResult = ConnectionRow;

export interface ProjectManager {
    createProject: (input: CreateProjectInput) => ProjectRow;
    listProjects: () => ProjectRow[];
    getProject: (id: number) => ProjectRow | null;
    updateProject: (id: number, input: UpdateProjectInput) => ProjectRow | null;
    deleteProject: (id: number) => boolean;
    createEnvironment: (input: CreateEnvironmentInput) => EnvironmentRow;
    listEnvironments: (projectId: number) => EnvironmentRow[];
    getEnvironment: (id: number) => EnvironmentRow | null;
    updateEnvironment: (id: number, input: { name?: string }) => EnvironmentRow | null;
    deleteEnvironment: (id: number) => boolean;
    createServer: (input: CreateServerInput) => Promise<ConnectionRow>;
    listServers: () => ConnectionRow[];
    getServer: (id: number) => ConnectionRow | null;
    updateServer: (id: number, input: UpdateServerInput) => Promise<ConnectionRow | null>;
    deleteServer: (id: number) => Promise<boolean>;
    createConnection: (input: CreateServerInput) => Promise<ConnectionRow>;
    listConnections: () => ConnectionRow[];
    getConnection: (id: number) => ConnectionRow | null;
    assignEnvironmentBinding: (environmentId: number, input: EnvironmentBindingInput) => EnvironmentBindingRow;
    replaceEnvironmentBindings: (environmentId: number, bindings: EnvironmentBindingInput[]) => EnvironmentBindingRow[];
    listEnvironmentBindings: (environmentId: number) => EnvironmentBindingRow[];
    resolveRemoteBinding: (environmentId: number, input?: ResolveRemoteBindingInput) => ResolvedRemoteBinding;
    listIgnorePatterns: (projectId: number) => string[];
    setIgnorePatterns: (projectId: number, patterns: string[]) => void;
}

const normalizeRowid = (rowid: number | bigint): number =>
    typeof rowid === 'bigint' ? Number(rowid) : rowid;

const asRunResult = (result: unknown): RunResult => {
    if (typeof result !== 'object' || result === null || !('changes' in result) || !('lastInsertRowid' in result)) {
        throw new Error('Unexpected SQLite result shape.');
    }

    return result as RunResult;
};

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
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

const mapConnection = (row: any): ConnectionRow => ({
    id: row.id,
    name: row.name ?? null,
    host: row.host,
    port: row.port,
    username: row.username,
    authType: row.authType as ConnectionAuthType,
    protocol: (row.protocol as 'ftp' | 'sftp') ?? 'sftp',
    credentialRef: row.credentialRef,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

const mapEnvironmentBinding = (row: any): EnvironmentBindingRow => ({
    id: row.id,
    environmentId: row.environmentId,
    bindingType: row.bindingType as EnvironmentBindingType,
    localPath: row.localPath ?? null,
    serverId: row.serverId ?? null,
    remotePath: row.remotePath ?? null,
    environmentName: row.environmentName ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

const createProjectByIdLookup = (db: SqliteDatabase) =>
    db.prepare(
        'SELECT id, name, root_path AS rootPath, created_at AS createdAt, updated_at AS updatedAt FROM projects WHERE id = ?',
    );

const createEnvironmentByIdLookup = (db: SqliteDatabase) =>
    db.prepare(
        'SELECT id, project_id AS projectId, name, created_at AS createdAt, updated_at AS updatedAt FROM environments WHERE id = ?',
    );

const createServerByIdLookup = (db: SqliteDatabase) =>
    db.prepare(
        'SELECT id, name, host, port, username, auth_type AS authType, protocol, credential_ref AS credentialRef, created_at AS createdAt, updated_at AS updatedAt FROM servers WHERE id = ?',
    );

const createBindingByEnvironmentLookup = (db: SqliteDatabase) =>
    db.prepare(
        'SELECT id, environment_id AS environmentId, binding_type AS bindingType, local_path AS localPath, server_id AS serverId, remote_path AS remotePath, environment_name AS environmentName, created_at AS createdAt, updated_at AS updatedAt FROM environment_bindings WHERE environment_id = ? ORDER BY id ASC',
    );

const resolveBindingServerId = (input: RemoteBindingInput | RemoteBindingLegacyInput): number =>
    'serverId' in input ? input.serverId : input.connectionId;

export function createProjectManager({ db, credentials }: ProjectManagerDependencies): ProjectManager {
    const insertProject = db.prepare(
        `
      INSERT INTO projects (name, root_path)
      VALUES (@name, @rootPath)
    `,
    );
    const listProjects = db.prepare(
        'SELECT id, name, root_path AS rootPath, created_at AS createdAt, updated_at AS updatedAt FROM projects ORDER BY name ASC',
    );
    const getProjectById = createProjectByIdLookup(db);
    const updateProject = db.prepare(
        `
      UPDATE projects
      SET
        name = COALESCE(@name, name),
        root_path = CASE WHEN @hasRootPath = 1 THEN @rootPath ELSE root_path END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `,
    );
    const deleteProject = db.prepare('DELETE FROM projects WHERE id = ?');

    const insertEnvironment = db.prepare(
        `
      INSERT INTO environments (project_id, name)
      VALUES (@projectId, @name)
    `,
    );
    const listEnvironments = db.prepare(
        'SELECT id, project_id AS projectId, name, created_at AS createdAt, updated_at AS updatedAt FROM environments WHERE project_id = ? ORDER BY name ASC, id ASC',
    );
    const getEnvironmentById = createEnvironmentByIdLookup(db);

        const updateEnvironmentRow = db.prepare(
                `
            UPDATE environments
            SET
                name = COALESCE(@name, name),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `,
        );

        const deleteEnvironmentRow = db.prepare('DELETE FROM environments WHERE id = ?');

        const insertConnection = db.prepare(
                `
            INSERT INTO servers (name, host, port, username, auth_type, protocol, credential_ref)
            VALUES (@name, @host, @port, @username, @authType, @protocol, @credentialRef)
        `,
        );
        const updateConnectionCredentialRef = db.prepare(
                `
            UPDATE servers
            SET credential_ref = @credentialRef,
                    updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `,
        );
    const updateServer = db.prepare(
        `
            UPDATE servers
            SET
                name = CASE WHEN @hasName = 1 THEN @name ELSE name END,
                host = COALESCE(@host, host),
                port = COALESCE(@port, port),
                username = COALESCE(@username, username),
                auth_type = COALESCE(@authType, auth_type),
                protocol = COALESCE(@protocol, protocol),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `,
    );

    const listServers = db.prepare(
        'SELECT id, name, host, port, username, auth_type AS authType, protocol, credential_ref AS credentialRef, created_at AS createdAt, updated_at AS updatedAt FROM servers ORDER BY COALESCE(name, host) ASC, host ASC, port ASC, username ASC',
    );
    const getServerById = createServerByIdLookup(db);
    const deleteServerRow = db.prepare('DELETE FROM servers WHERE id = ?');

        const insertBinding = db.prepare(
                `
            INSERT INTO environment_bindings (
                environment_id,
                binding_type,
                local_path,
                server_id,
                remote_path,
                environment_name
            )
            VALUES (
                @environmentId,
                @bindingType,
                @localPath,
                @serverId,
                @remotePath,
                @environmentName
            )
        `,
        );
    const deleteBindingsForEnvironment = db.prepare('DELETE FROM environment_bindings WHERE environment_id = ?');
    const listBindingsForEnvironment = createBindingByEnvironmentLookup(db);

    const listIgnorePatternsStmt = db.prepare(
        'SELECT pattern FROM ignore_patterns WHERE project_id = ? ORDER BY id ASC',
    );
    const deleteIgnorePatternsStmt = db.prepare('DELETE FROM ignore_patterns WHERE project_id = ?');
    const insertIgnorePatternStmt = db.prepare(
        'INSERT OR IGNORE INTO ignore_patterns (project_id, pattern) VALUES (@projectId, @pattern)',
    );

    const createProject = (input: CreateProjectInput): ProjectRow => {
        const result = asRunResult(insertProject.run({ name: input.name, rootPath: input.rootPath ?? null }));
        const row = getProjectById.get(normalizeRowid(result.lastInsertRowid));

        if (!row) {
            throw new Error('Project insert failed.');
        }

        return mapProject(row);
    };

    const createEnvironment = (input: CreateEnvironmentInput): EnvironmentRow => {
        const result = asRunResult(insertEnvironment.run({ projectId: input.projectId, name: input.name }));
        const row = getEnvironmentById.get(normalizeRowid(result.lastInsertRowid));

        if (!row) {
            throw new Error('Environment insert failed.');
        }

        return mapEnvironment(row);
    };

    const updateEnvironment = (id: number, input: { name?: string }): EnvironmentRow | null => {
        const existing = getEnvironmentById.get(id);

        if (!existing) return null;

        const result = asRunResult(
            updateEnvironmentRow.run({ id, name: input.name ?? null }),
        );

        if (result.changes === 0) return null;

        const row = getEnvironmentById.get(id);
        return row ? mapEnvironment(row) : null;
    };

    const deleteEnvironment = (id: number): boolean => {
        const result = asRunResult(deleteEnvironmentRow.run(id));
        // also delete any bindings for the environment
        deleteBindingsForEnvironment.run(id);
        return result.changes > 0;
    };

    const createServer = async (input: CreateServerInput): Promise<ConnectionRow> => {
        const placeholderCredentialRef = `pending:${randomUUID()}`;
        const result = asRunResult(
            insertConnection.run({
                name: input.name?.trim() ? input.name.trim() : null,
                host: input.host,
                port: input.port,
                username: input.username,
                authType: input.authType,
                protocol: input.protocol ?? 'sftp',
                credentialRef: placeholderCredentialRef,
            }),
        );

        const serverId = normalizeRowid(result.lastInsertRowid);
        const credentialRef = toConnectionCredentialRef(serverId);

        updateConnectionCredentialRef.run({ id: serverId, credentialRef });

        try {
            await credentials.saveCredential(serverId, input.secret);
        } catch (error) {
            deleteServerRow.run(serverId);
            throw error;
        }

        const row = getServerById.get(serverId);

        if (!row) {
            throw new Error('Server insert failed.');
        }

        return mapConnection(row);
    };

    const updateServerById = async (id: number, input: UpdateServerInput): Promise<ConnectionRow | null> => {
        const existing = getServerById.get(id);

        if (!existing) {
            return null;
        }

        const result = asRunResult(
            updateServer.run({
                id,
                hasName: Object.prototype.hasOwnProperty.call(input, 'name') ? 1 : 0,
                name: input.name?.trim() ? input.name.trim() : null,
                host: input.host ?? null,
                port: input.port ?? null,
                username: input.username ?? null,
                authType: input.authType ?? null,
                protocol: input.protocol ?? null,
            }),
        );

        if (result.changes === 0) {
            return null;
        }

        if (Object.prototype.hasOwnProperty.call(input, 'secret') && input.secret != null) {
            await credentials.saveCredential(id, input.secret);
        }

        const row = getServerById.get(id);
        return row ? mapConnection(row) : null;
    };

    const deleteServerById = async (id: number): Promise<boolean> => {
        const result = asRunResult(deleteServerRow.run(id));

        if (result.changes === 0) {
            return false;
        }

        await credentials.deleteCredential(id);
        return true;
    };

    const listEnvironmentBindings = (environmentId: number): EnvironmentBindingRow[] =>
        listBindingsForEnvironment.all(environmentId).map(mapEnvironmentBinding);

    const assignEnvironmentBinding = (
        environmentId: number,
        input: EnvironmentBindingInput,
    ): EnvironmentBindingRow => {
        const result = asRunResult(
            insertBinding.run({
                environmentId,
                bindingType: input.bindingType,
                localPath: input.bindingType === 'local' ? input.localPath : null,
                serverId:
                    input.bindingType === 'remote'
                        ? resolveBindingServerId(input)
                        : null,
                remotePath: input.bindingType === 'remote' ? input.remotePath : null,
                environmentName: input.bindingType === 'remote' ? input.environmentName ?? null : null,
            }),
        );

        const bindingId = normalizeRowid(result.lastInsertRowid);
        const row = db
            .prepare(
                'SELECT id, environment_id AS environmentId, binding_type AS bindingType, local_path AS localPath, server_id AS serverId, remote_path AS remotePath, environment_name AS environmentName, created_at AS createdAt, updated_at AS updatedAt FROM environment_bindings WHERE id = ?',
            )
            .get(bindingId);

        if (!row) {
            throw new Error('Environment binding insert failed.');
        }

        return mapEnvironmentBinding(row);
    };

    const replaceEnvironmentBindings = (
        environmentId: number,
        bindings: EnvironmentBindingInput[],
    ): EnvironmentBindingRow[] => {
        db.transaction((nextBindings: EnvironmentBindingInput[]) => {
            deleteBindingsForEnvironment.run(environmentId);

            for (const binding of nextBindings) {
                insertBinding.run({
                    environmentId,
                    bindingType: binding.bindingType,
                    localPath: binding.bindingType === 'local' ? binding.localPath : null,
                    serverId:
                        binding.bindingType === 'remote'
                            ? resolveBindingServerId(binding)
                            : null,
                    remotePath: binding.bindingType === 'remote' ? binding.remotePath : null,
                    environmentName: binding.bindingType === 'remote' ? binding.environmentName ?? null : null,
                });
            }
        })(bindings);

        return listEnvironmentBindings(environmentId);
    };

    const resolveRemoteBinding = (
        environmentId: number,
        input: ResolveRemoteBindingInput = {},
    ): ResolvedRemoteBinding => {
        const environmentRow = getEnvironmentById.get(environmentId);
        const environment = environmentRow ? mapEnvironment(environmentRow) : null;

        if (!environment) {
            throw new Error(`Environment ${environmentId} was not found.`);
        }

        const remoteBindings = listEnvironmentBindings(environmentId).filter(
            (binding) => binding.bindingType === 'remote',
        );

        const matchingBindings = remoteBindings.filter((binding) => {
            if (input.bindingId != null && binding.id !== input.bindingId) {
                return false;
            }

            const selectedServerId = input.serverId ?? input.connectionId;
            if (selectedServerId != null && binding.serverId !== selectedServerId) {
                return false;
            }

            if (input.remotePath != null && binding.remotePath !== input.remotePath) {
                return false;
            }

            if (input.environmentName != null && binding.environmentName !== input.environmentName) {
                return false;
            }

            return true;
        });

        if (matchingBindings.length === 0) {
            throw new Error(
                `No remote environment binding matched environment ${environmentId}.`,
            );
        }

        if (matchingBindings.length > 1) {
            const ids = matchingBindings.map((binding) => binding.id).join(', ');
            throw new Error(
                `Multiple remote bindings matched environment ${environmentId}. Narrow the selection using bindingId, serverId, environmentName, or remotePath. Matching binding IDs: ${ids}.`,
            );
        }

        const binding = matchingBindings[0];


        if (binding.serverId == null) {
            throw new Error(`Remote binding ${binding.id} has no server ID.`);
        }

        if (!binding.remotePath) {
            throw new Error(`Remote binding ${binding.id} has no remote path.`);
        }

        const serverRow = getServerById.get(binding.serverId);
        const server = serverRow ? mapConnection(serverRow) : null;

        if (!server) {
            throw new Error(
                `Server ${binding.serverId} referenced by binding ${binding.id} was not found.`,
            );
        }

        return {
            environment,
            binding,
            connection: server,
            server,
        };
    };

    return {
        createProject,
        listProjects: () => listProjects.all().map(mapProject),
        getProject: (id: number) => {
            const row = getProjectById.get(id);
            return row ? mapProject(row) : null;
        },
        updateProject: (id: number, input: UpdateProjectInput) => {
            const result = asRunResult(
                updateProject.run({
                    id,
                    name: input.name ?? null,
                    rootPath: input.rootPath ?? null,
                    hasRootPath: Object.prototype.hasOwnProperty.call(input, 'rootPath') ? 1 : 0,
                }),
            );

            if (result.changes === 0) {
                return null;
            }

            const row = getProjectById.get(id);
            return row ? mapProject(row) : null;
        },
        deleteProject: (id: number) => asRunResult(deleteProject.run(id)).changes > 0,
        createEnvironment,
        listEnvironments: (projectId: number) => listEnvironments.all(projectId).map(mapEnvironment),
        getEnvironment: (id: number) => {
            const row = getEnvironmentById.get(id);
            return row ? mapEnvironment(row) : null;
        },
        updateEnvironment,
        deleteEnvironment,
        createServer,
        listServers: () => listServers.all().map(mapConnection),
        getServer: (id: number) => {
            const row = getServerById.get(id);
            return row ? mapConnection(row) : null;
        },
        updateServer: updateServerById,
        deleteServer: deleteServerById,
        createConnection: createServer,
        listConnections: () => listServers.all().map(mapConnection),
        getConnection: (id: number) => {
            const row = getServerById.get(id);
            return row ? mapConnection(row) : null;
        },
        assignEnvironmentBinding,
        replaceEnvironmentBindings,
        listEnvironmentBindings,
        resolveRemoteBinding,
        listIgnorePatterns: (projectId: number): string[] => {
            const rows = listIgnorePatternsStmt.all(projectId) as Array<{ pattern: string }>;
            return rows.map((r) => r.pattern);
        },
        setIgnorePatterns: (projectId: number, patterns: string[]): void => {
            db.transaction((nextPatterns: string[]) => {
                deleteIgnorePatternsStmt.run(projectId);
                for (const pattern of nextPatterns) {
                    const trimmed = pattern.trim();
                    if (trimmed.length > 0) {
                        insertIgnorePatternStmt.run({ projectId, pattern: trimmed });
                    }
                }
            })(patterns);
        },
    };
}