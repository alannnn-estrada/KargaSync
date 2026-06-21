import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { isPpkContent, convertPpkToPrivateKey } from '../utils/ppk-converter';

import { createCreateProjectCommand } from '../../../core/application/commands/create-project';
import { createCreateSnapshotCommand } from '../../../core/application/commands/create-snapshot';
import { createGetAllProjectsQuery } from '../../../core/application/queries/get-all-projects';
import { createCompareEnvironmentsUseCase } from '../../../core/application/use-cases/compare-environments';
import type { CreateSnapshotInput } from '../../../core/application/commands/create-snapshot';
import type {
    CompareEnvironmentsInput,
    EnvironmentComparisonResult,
    SnapshotFileComparison,
} from '../../../core/domain/snapshots/types';
import { createSnapshotRepository } from '../../../core/domain/snapshots/repository';
import type { DatabaseHandle } from '../../../db/bootstrap';
import type { ProjectRow, SnapshotRow } from '../../../db/types';
import type {
    CompareEnvironmentsDTO,
    CompareEnvironmentsFileDiffDTO,
    CompareEnvironmentsRequestDTO,
    CreateProjectRequestDTO,
    CreateSnapshotRequestDTO,
    ProjectDTO,
    SnapshotDTO,
    GetSettingsResponseDTO,
    UpdateSettingsRequestDTO,
} from '../../../shared/dto';
import {
    IPC_CHANNELS,
    LOCAL_FILE_CHANNELS,
    REMOTE_FILE_CHANNELS,
    type AppMenuAnchorDto,
} from '../../../shared/ipc/contracts';
import { toggleAppMenu } from '../services/app-menu';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import SftpClient from 'ssh2-sftp-client';
import { Client as FtpClient, enterPassiveModeIPv4 } from 'basic-ftp';
import type { ExternalEditor } from '../../../shared/settings';

type RemoteFileCredentialOverride = string | { username?: string; password?: string } | undefined;

const REMOTE_OPERATION_TIMEOUT_MS = 15000;

function resolveRemoteCredential(credential: string | null, override?: RemoteFileCredentialOverride): { username?: string; password?: string } {
    if (typeof override === 'string') {
        return { password: override };
    }

    return {
        username: override?.username,
        password: override?.password ?? credential ?? undefined,
    };
}

async function persistRemoteCredentialOverride(
    database: DatabaseHandle,
    serverId: number,
    server: { username: string; authType: 'password' | 'key'; protocol: 'ftp' | 'sftp' },
    credentialOverride: RemoteFileCredentialOverride,
    resolvedCredential: { username?: string; password?: string },
): Promise<void> {
    if (!credentialOverride) {
        return;
    }

    const nextUsername = resolvedCredential.username ?? server.username;
    const nextSecret = resolvedCredential.password;

    if (!nextSecret) {
        return;
    }

    await database.projectManager.updateServer(serverId, {
        username: nextUsername,
        secret: nextSecret,
    });
}

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`${label} timed out after ${REMOTE_OPERATION_TIMEOUT_MS / 1000} seconds.`));
        }, REMOTE_OPERATION_TIMEOUT_MS);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

function normalizeFtpHost(host: string): string {
    // Docker Desktop + vsftpd can behave inconsistently with localhost/IPv6 in passive mode.
    return host.trim().toLowerCase() === 'localhost' ? '127.0.0.1' : host;
}

function createFtpClient(): FtpClient {
    const client = new FtpClient();
    client.prepareTransfer = enterPassiveModeIPv4;
    return client;
}

function normalizeFtpRemotePath(remotePath: string): string {
    return remotePath.replace(/^\/+/, '') || '.';
}

function toProjectDto(project: ProjectRow): ProjectDTO {
    return {
        id: project.id,
        name: project.name,
        rootPath: project.rootPath,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
    };
}

function toSnapshotDto(snapshot: SnapshotRow): SnapshotDTO {
    return {
        id: snapshot.id,
        projectId: snapshot.projectId,
        environmentId: snapshot.environmentId,
        label: snapshot.label,
        createdAt: snapshot.createdAt,
        fileCount: snapshot.fileCount,
        totalBytes: snapshot.totalBytes,
    };
}

function toCompareFileDiffDto(file: SnapshotFileComparison): CompareEnvironmentsFileDiffDTO {
    return {
        relativePath: file.relativePath,
        status: file.status,
        source: file.source
            ? {
                contentHash: file.source.contentHash,
                sizeBytes: file.source.sizeBytes,
            }
            : undefined,
        target: file.target
            ? {
                contentHash: file.target.contentHash,
                sizeBytes: file.target.sizeBytes,
            }
            : undefined,
    };
}

function toCompareEnvironmentsDto(result: EnvironmentComparisonResult): CompareEnvironmentsDTO {
    return {
        summary: {
            sourceSnapshot: {
                environmentId: result.summary.sourceSnapshot.environmentId,
                environmentName: result.summary.sourceSnapshot.environmentName,
                label: result.summary.sourceSnapshot.label,
                fileCount: result.summary.sourceSnapshot.fileCount,
                totalBytes: result.summary.sourceSnapshot.totalBytes,
            },
            targetSnapshot: {
                environmentId: result.summary.targetSnapshot.environmentId,
                environmentName: result.summary.targetSnapshot.environmentName,
                label: result.summary.targetSnapshot.label,
                fileCount: result.summary.targetSnapshot.fileCount,
                totalBytes: result.summary.targetSnapshot.totalBytes,
            },
            comparisonStats: {
                added: result.summary.comparisonStats.added,
                deleted: result.summary.comparisonStats.deleted,
                modified: result.summary.comparisonStats.modified,
                unchanged: result.summary.comparisonStats.unchanged,
                total: result.summary.comparisonStats.total,
            },
            bytesChanged: {
                added: result.summary.bytesChanged.added,
                deleted: result.summary.bytesChanged.deleted,
                modified: result.summary.bytesChanged.modified,
                total: result.summary.bytesChanged.total,
            },
        },
        files: result.files.map(toCompareFileDiffDto),
    };
}

function toCompareEnvironmentsInput(input: CompareEnvironmentsRequestDTO): CompareEnvironmentsInput {
    return {
        projectId: input.projectId,
        sourceEnvironmentId: input.sourceEnvironmentId,
        sourceEnvironmentName: input.sourceEnvironmentName,
        sourceSnapshotId: input.sourceSnapshotId,
        targetEnvironmentId: input.targetEnvironmentId,
        targetEnvironmentName: input.targetEnvironmentName,
        targetSnapshotId: input.targetSnapshotId,
    };
}

function toCreateSnapshotInput(input: CreateSnapshotRequestDTO): CreateSnapshotInput {
    return {
        projectId: input.projectId,
        environmentId: input.environmentId,
        label: input.label,
        files: input.files.map((file) => ({
            relativePath: file.relativePath,
            contentHash: file.contentHash,
            sizeBytes: file.sizeBytes,
            modifiedAt: file.modifiedAt,
            absolutePath: null,
        })),
    };
}

function toSettingsDto(settings: GetSettingsResponseDTO): GetSettingsResponseDTO {
    return {
        language: settings.language,
        theme: settings.theme,
        externalEditor: (settings as any).externalEditor ?? 'system',
        customEditorPath: (settings as any).customEditorPath ?? undefined,
    };
}

function resolveSftpPrivateKey(keyContent: string): string {
    if (isPpkContent(keyContent)) {
        return convertPpkToPrivateKey(keyContent);
    }
    return keyContent;
}

export function registerIpcHandlers(database: DatabaseHandle): void {
    const getAllProjectsQuery = createGetAllProjectsQuery({
        projectManager: database.projectManager,
    });
    const createProjectCommand = createCreateProjectCommand({
        projectManager: database.projectManager,
    });
    const createSnapshotCommand = createCreateSnapshotCommand({
        db: database.db,
        projectManager: database.projectManager,
    });
    const compareEnvironmentsUseCase = createCompareEnvironmentsUseCase({
        snapshotRepository: createSnapshotRepository(database.db),
    });

    [
        IPC_CHANNELS.projectsGetAll,
        IPC_CHANNELS.projectsCreate,
        IPC_CHANNELS.compareEnvironments,
        IPC_CHANNELS.snapshotsCreate,
        IPC_CHANNELS.snapshotsScanLocal,
        IPC_CHANNELS.snapshotsScanRemote,
        IPC_CHANNELS.snapshotsLatest,
        IPC_CHANNELS.settingsGet,
        IPC_CHANNELS.settingsUpdate,
        IPC_CHANNELS.appMenuToggle,
        IPC_CHANNELS.serversList,
        IPC_CHANNELS.serversCreate,
        IPC_CHANNELS.serversUpdate,
        IPC_CHANNELS.serversDelete,
        IPC_CHANNELS.serversTest,
        IPC_CHANNELS.environmentsList,
        IPC_CHANNELS.environmentsCreate,
        IPC_CHANNELS.environmentBindingsAssign,
        IPC_CHANNELS.environmentBindingsList,
            LOCAL_FILE_CHANNELS.defaultRoot,
            LOCAL_FILE_CHANNELS.chooseRoot,
            LOCAL_FILE_CHANNELS.list,
            LOCAL_FILE_CHANNELS.readFile,
            LOCAL_FILE_CHANNELS.writeFile,
            LOCAL_FILE_CHANNELS.mkdir,
            LOCAL_FILE_CHANNELS.createFile,
            LOCAL_FILE_CHANNELS.rename,
            LOCAL_FILE_CHANNELS.delete,
        REMOTE_FILE_CHANNELS.list,
        REMOTE_FILE_CHANNELS.download,
        REMOTE_FILE_CHANNELS.upload,
        REMOTE_FILE_CHANNELS.delete,
        REMOTE_FILE_CHANNELS.mkdir,
        REMOTE_FILE_CHANNELS.createFile,
        REMOTE_FILE_CHANNELS.rename,
        REMOTE_FILE_CHANNELS.openExternal,
        LOCAL_FILE_CHANNELS.chooseKeyFile,
        IPC_CHANNELS.versionsList,
        IPC_CHANNELS.versionsStart,
        IPC_CHANNELS.versionsBackupFile,
        IPC_CHANNELS.versionsFinish,
        IPC_CHANNELS.versionsAbort,
        IPC_CHANNELS.versionsRollback,
        IPC_CHANNELS.versionsDelete,
    ].forEach((channel) => ipcMain.removeHandler(channel));

    ipcMain.handle(LOCAL_FILE_CHANNELS.defaultRoot, async () => {
        return path.join(os.homedir());
    });

    ipcMain.handle(IPC_CHANNELS.projectsUpdate, async (_event, input: { id: number; name?: string; rootPath?: string | null }) => {
        const updated = database.projectManager.updateProject(input.id, { name: input.name, rootPath: input.rootPath });
        if (!updated) return null;
        return { id: updated.id, name: updated.name, rootPath: updated.rootPath, createdAt: updated.createdAt, updatedAt: updated.updatedAt };
    });

    ipcMain.handle(IPC_CHANNELS.projectsDelete, async (_event, projectId: number) => {
        const ok = database.projectManager.deleteProject(projectId);
        return ok;
    });

    ipcMain.handle(LOCAL_FILE_CHANNELS.chooseRoot, async (event) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showOpenDialog(window ?? undefined, {
            title: 'Choose local folder',
            properties: ['openDirectory'],
            defaultPath: os.homedir(),
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        return result.filePaths[0];
    });

    ipcMain.handle(LOCAL_FILE_CHANNELS.list, async (_event, directoryPath: string) => {
        const entries = await fs.readdir(directoryPath, { withFileTypes: true });
        const mapped = await Promise.all(entries.map(async (entry) => {
            const entryPath = path.join(directoryPath, entry.name);
            const stats = await fs.lstat(entryPath);

            return {
                name: entry.name,
                path: entryPath,
                isDirectory: stats.isDirectory(),
                size: stats.isFile() ? stats.size : null,
                modifiedAt: stats.mtime.toISOString(),
            };
        }));

        return mapped.sort((left, right) => {
            if (left.isDirectory !== right.isDirectory) {
                return left.isDirectory ? -1 : 1;
            }

            return left.name.localeCompare(right.name);
        });
    });

    ipcMain.handle(LOCAL_FILE_CHANNELS.readFile, async (_event, filePath: string) => {
        const buffer = await fs.readFile(filePath);
        return buffer.toString('base64');
    });

    ipcMain.handle(LOCAL_FILE_CHANNELS.writeFile, async (_event, filePath: string, contentBase64: string) => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, Buffer.from(contentBase64, 'base64'));
    });

    ipcMain.handle(LOCAL_FILE_CHANNELS.mkdir, async (_event, directoryPath: string) => {
        await fs.mkdir(directoryPath, { recursive: true });
    });

    ipcMain.handle(LOCAL_FILE_CHANNELS.createFile, async (_event, filePath: string) => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, Buffer.alloc(0));
    });

    ipcMain.handle(LOCAL_FILE_CHANNELS.rename, async (_event, sourcePath: string, targetPath: string) => {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.rename(sourcePath, targetPath);
    });

    ipcMain.handle(LOCAL_FILE_CHANNELS.delete, async (_event, targetPath: string) => {
        await fs.rm(targetPath, { recursive: true, force: true });
    });

    ipcMain.handle(IPC_CHANNELS.projectsGetAll, async () => {
        const projects = getAllProjectsQuery.execute();
        return projects.map(toProjectDto);
    });

    ipcMain.handle(IPC_CHANNELS.dialogConfirm, async (event, message: string) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showMessageBox(window ?? undefined, {
            type: 'question',
            buttons: ['Yes', 'No'],
            defaultId: 0,
            cancelId: 1,
            message,
        });

        return result.response === 0;
    });

    ipcMain.handle(
        IPC_CHANNELS.projectsCreate,
        async (_event, input: CreateProjectRequestDTO) => {
            const project = createProjectCommand.execute(input);
            return toProjectDto(project);
        },
    );

    ipcMain.handle(
        IPC_CHANNELS.compareEnvironments,
        async (_event, input: CompareEnvironmentsRequestDTO) => {
            const result = await compareEnvironmentsUseCase.compareEnvironments(
                toCompareEnvironmentsInput(input),
            );
            return toCompareEnvironmentsDto(result);
        },
    );

    ipcMain.handle(
        IPC_CHANNELS.snapshotsCreate,
        async (_event, input: CreateSnapshotRequestDTO) => {
            const snapshot = createSnapshotCommand.execute(toCreateSnapshotInput(input));
            return toSnapshotDto(snapshot);
        },
    );

    ipcMain.handle(IPC_CHANNELS.settingsGet, async () => toSettingsDto(database.settings.getSettings()));

    ipcMain.handle(
        IPC_CHANNELS.settingsUpdate,
        async (_event, input: UpdateSettingsRequestDTO) => toSettingsDto(database.settings.updateSettings(input)),
    );

    ipcMain.handle(IPC_CHANNELS.appMenuToggle, async (event, anchor: AppMenuAnchorDto) => {
        const window = BrowserWindow.fromWebContents(event.sender);

        if (!window) {
            return;
        }

        toggleAppMenu(window, anchor);
    });

    ipcMain.handle(IPC_CHANNELS.serversList, async () => {
        const rows = database.projectManager.listServers();
        return rows.map((r) => ({
            id: r.id,
            name: r.name,
            host: r.host,
            port: r.port,
            username: r.username,
            authType: r.authType,
            protocol: r.protocol,
            credentialRef: r.credentialRef,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        }));
    });

    ipcMain.handle(IPC_CHANNELS.serversCreate, async (_event, input: import('../../../shared/dto').CreateServerRequestDTO) => {
        const server = await database.projectManager.createServer(input as any);
        return {
            id: server.id,
            name: server.name,
            host: server.host,
            port: server.port,
            username: server.username,
            authType: server.authType,
            protocol: server.protocol,
            credentialRef: server.credentialRef,
            createdAt: server.createdAt,
            updatedAt: server.updatedAt,
        };
    });

    ipcMain.handle(IPC_CHANNELS.serversUpdate, async (_event, input: import('../../../shared/dto').UpdateServerRequestDTO) => {
        const updated = await database.projectManager.updateServer(input.id, input as any);

        if (!updated) {
            return null;
        }

        return {
            id: updated.id,
            name: updated.name,
            host: updated.host,
            port: updated.port,
            username: updated.username,
            authType: updated.authType,
            protocol: updated.protocol,
            credentialRef: updated.credentialRef,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    });

    ipcMain.handle(IPC_CHANNELS.serversDelete, async (_event, serverId: number) => {
        return database.projectManager.deleteServer(serverId);
    });

    ipcMain.handle(IPC_CHANNELS.serversTest, async (_event, input: import('../../../shared/dto').CreateServerRequestDTO) => {
        // Test the same authentication path used by the explorer.
        const protocol = input.protocol ?? 'sftp';

        if (protocol === 'sftp') {
            const client = new SftpClient();

            try {
                const connectConfig: any = {
                    host: input.host,
                    port: input.port,
                    username: input.username,
                };

                if (input.authType === 'password') {
                    connectConfig.password = input.secret;
                } else if (input.authType === 'key') {
                    connectConfig.privateKey = input.secret;
                }

                await client.connect(connectConfig as any);
                await client.end();
                return true;
            } catch (err) {
                try {
                    await client.end();
                } catch {}
                return false;
            }
        }

        // FTP must authenticate successfully, not just accept a TCP connection.
        if (protocol === 'ftp') {
            if (input.authType !== 'password') {
                return false;
            }

            const client = createFtpClient();

            try {
                await withTimeout(
                    client.access({
                        host: normalizeFtpHost(input.host),
                        port: input.port,
                        user: input.username,
                        password: input.secret,
                        secure: false,
                    }),
                    'FTP connection test',
                );

                await client.close();
                return true;
            } catch {
                try {
                    client.close();
                } catch {
                    // ignore
                }

                return false;
            }
        }

        return false;
    });

    ipcMain.handle(IPC_CHANNELS.environmentsList, async (_event, projectId: number) => {
        const envs = database.projectManager.listEnvironments(projectId);
        return envs.map((e) => ({ id: e.id, projectId: e.projectId, name: e.name, createdAt: e.createdAt, updatedAt: e.updatedAt }));
    });

    ipcMain.handle(IPC_CHANNELS.environmentsCreate, async (_event, input: import('../../../shared/dto').CreateEnvironmentRequestDTO) => {
        const env = database.projectManager.createEnvironment(input as any);
        return { id: env.id, projectId: env.projectId, name: env.name, createdAt: env.createdAt, updatedAt: env.updatedAt };
    });

    ipcMain.handle(IPC_CHANNELS.environmentsUpdate, async (_event, input: import('../../../shared/dto').UpdateEnvironmentRequestDTO) => {
        const env = database.projectManager.updateEnvironment(input.id, { name: input.name ?? undefined } as any);
        if (!env) return null;
        return { id: env.id, projectId: env.projectId, name: env.name, createdAt: env.createdAt, updatedAt: env.updatedAt };
    });

    ipcMain.handle(IPC_CHANNELS.environmentsDelete, async (_event, environmentId: number) => {
        const ok = database.projectManager.deleteEnvironment(environmentId);
        return ok;
    });

    ipcMain.handle(IPC_CHANNELS.environmentBindingsAssign, async (_event, input: import('../../../shared/dto').AssignEnvironmentBindingRequestDTO) => {
        const binding = database.projectManager.assignEnvironmentBinding(input.environmentId, input as any);
        return {
            id: binding.id,
            environmentId: binding.environmentId,
            bindingType: binding.bindingType,
            localPath: binding.localPath,
            serverId: binding.serverId,
            remotePath: binding.remotePath,
            environmentName: binding.environmentName,
            createdAt: binding.createdAt,
            updatedAt: binding.updatedAt,
        };
    });

    ipcMain.handle(IPC_CHANNELS.environmentBindingsList, async (_event, environmentId: number) => {
        const bindings = database.projectManager.listEnvironmentBindings(environmentId);
        return bindings.map((b) => ({
            id: b.id,
            environmentId: b.environmentId,
            bindingType: b.bindingType,
            localPath: b.localPath,
            serverId: b.serverId,
            remotePath: b.remotePath,
            environmentName: b.environmentName,
            createdAt: b.createdAt,
            updatedAt: b.updatedAt,
        }));
    });

    // Remote file operations using SFTP
    ipcMain.handle(REMOTE_FILE_CHANNELS.list, async (_event, serverId: number, remotePath: string, credentialOverride?: RemoteFileCredentialOverride) => {
        const server = database.projectManager.getServer(serverId);
        if (!server) throw new Error(`Server ${serverId} not found`);
        const storedCredential = await database.credentials.getCredential(serverId);
        const credential = resolveRemoteCredential(storedCredential, credentialOverride);

        if (!credential) {
            throw new Error(`Credential not found for server ${serverId}`);
        }

        const targetPath = remotePath || '/';

        if (server.protocol === 'ftp') {
            if (server.authType !== 'password') {
                throw new Error('FTP only supports password authentication in file explorer mode.');
            }

            const client = createFtpClient();

            try {
                await withTimeout(
                    client.access({
                        host: normalizeFtpHost(server.host),
                        port: server.port,
                        user: credential.username ?? server.username,
                        password: credential.password,
                        secure: false,
                    }),
                    'FTP connection',
                );

                const list = await withTimeout(client.list(targetPath), 'FTP directory listing');
                await persistRemoteCredentialOverride(database, serverId, server, credentialOverride, credential);
                return list.map((item) => ({
                    name: item.name,
                    path: path.posix.join(targetPath, item.name),
                    isDirectory: item.isDirectory,
                    size: item.size ?? null,
                    modifiedAt: item.modifiedAt ? item.modifiedAt.toISOString() : null,
                }));
            } finally {
                client.close();
            }
        }

        const client = new SftpClient();
        try {
            const connectOpts: any = {
                host: server.host,
                port: server.port,
                username: server.username,
            };

            if (server.authType === 'password') {
                connectOpts.username = credential.username ?? server.username;
                connectOpts.password = credential.password;
            } else {
                connectOpts.privateKey = credential.password ? resolveSftpPrivateKey(credential.password) : undefined;
            }

            await withTimeout(client.connect(connectOpts), 'SFTP connection');
            const list = await withTimeout(client.list(targetPath === '/' ? '.' : targetPath), 'SFTP directory listing');
            await persistRemoteCredentialOverride(database, serverId, server, credentialOverride, credential);
            return list.map((item: any) => ({
                name: item.name,
                path: path.posix.join(targetPath, item.name),
                isDirectory: item.type === 'd',
                size: item.size ?? null,
                modifiedAt: item.modifyTime ? new Date(item.modifyTime * 1000).toISOString() : null,
            }));
        } finally {
            client.end();
        }
    });

    ipcMain.handle(REMOTE_FILE_CHANNELS.download, async (_event, serverId: number, remotePath: string, credentialOverride?: RemoteFileCredentialOverride) => {
        const server = database.projectManager.getServer(serverId);
        if (!server) throw new Error(`Server ${serverId} not found`);
        const storedCredential = await database.credentials.getCredential(serverId);
        const credential = resolveRemoteCredential(storedCredential, credentialOverride);

        if (!credential) {
            throw new Error(`Credential not found for server ${serverId}`);
        }

        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'karga-'));
        const fileName = path.posix.basename(remotePath);
        const localPath = path.join(tmpDir, fileName);

        if (server.protocol === 'ftp') {
            if (server.authType !== 'password') {
                throw new Error('FTP only supports password authentication in file explorer mode.');
            }

            const ftpClient = createFtpClient();

            try {
                await withTimeout(
                    ftpClient.access({
                        host: normalizeFtpHost(server.host),
                        port: server.port,
                        user: credential.username ?? server.username,
                        password: credential.password,
                        secure: false,
                    }),
                    'FTP connection',
                );
                await withTimeout(ftpClient.downloadTo(localPath, remotePath), 'FTP download');
                await persistRemoteCredentialOverride(database, serverId, server, credentialOverride, credential);
                return localPath;
            } finally {
                ftpClient.close();
            }
        }

        const client = new SftpClient();

        try {
            const connectOpts: any = { host: server.host, port: server.port, username: credential.username ?? server.username };
            if (server.authType === 'password') connectOpts.password = credential.password; else connectOpts.privateKey = credential.password ? resolveSftpPrivateKey(credential.password) : undefined;
            await withTimeout(client.connect(connectOpts), 'SFTP connection');
            await withTimeout(client.fastGet(remotePath, localPath), 'SFTP download');
            await persistRemoteCredentialOverride(database, serverId, server, credentialOverride, credential);
            return localPath;
        } finally {
            client.end();
        }
    });

    ipcMain.handle(REMOTE_FILE_CHANNELS.downloadToDirectory, async (_event, serverId: number, remotePath: string, localDirectoryPath: string, credentialOverride?: RemoteFileCredentialOverride) => {
        const server = database.projectManager.getServer(serverId);
        if (!server) throw new Error(`Server ${serverId} not found`);
        const storedCredential = await database.credentials.getCredential(serverId);
        const credential = resolveRemoteCredential(storedCredential, credentialOverride);

        if (!credential) {
            throw new Error(`Credential not found for server ${serverId}`);
        }

        await fs.mkdir(localDirectoryPath, { recursive: true });
        const localPath = path.join(localDirectoryPath, path.posix.basename(remotePath));

        if (server.protocol === 'ftp') {
            if (server.authType !== 'password') {
                throw new Error('FTP only supports password authentication in file explorer mode.');
            }

            const ftpClient = createFtpClient();

            try {
                await withTimeout(
                    ftpClient.access({
                        host: normalizeFtpHost(server.host),
                        port: server.port,
                        user: credential.username ?? server.username,
                        password: credential.password,
                        secure: false,
                    }),
                    'FTP connection',
                );
                await withTimeout(ftpClient.downloadTo(localPath, remotePath), 'FTP download');
                await persistRemoteCredentialOverride(database, serverId, server, credentialOverride, credential);
                return localPath;
            } finally {
                ftpClient.close();
            }
        }

        const client = new SftpClient();

        try {
            const connectOpts: any = { host: server.host, port: server.port, username: credential.username ?? server.username };
            if (server.authType === 'password') connectOpts.password = credential.password; else connectOpts.privateKey = credential.password ? resolveSftpPrivateKey(credential.password) : undefined;
            await withTimeout(client.connect(connectOpts), 'SFTP connection');
            await withTimeout(client.fastGet(remotePath, localPath), 'SFTP download');
            await persistRemoteCredentialOverride(database, serverId, server, credentialOverride, credential);
            return localPath;
        } finally {
            client.end();
        }
    });

    ipcMain.handle(REMOTE_FILE_CHANNELS.upload, async (_event, serverId: number, remotePath: string, contentBase64: string, credentialOverride?: RemoteFileCredentialOverride) => {
        const server = database.projectManager.getServer(serverId);
        if (!server) throw new Error(`Server ${serverId} not found`);
        const storedCredential = await database.credentials.getCredential(serverId);
        const credential = resolveRemoteCredential(storedCredential, credentialOverride);

        if (!credential) {
            throw new Error(`Credential not found for server ${serverId}`);
        }

        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'karga-'));
        const localPath = path.join(tmpDir, path.posix.basename(remotePath));

        if (server.protocol === 'ftp') {
            if (server.authType !== 'password') {
                throw new Error('FTP only supports password authentication in file explorer mode.');
            }

            const ftpClient = createFtpClient();

            try {
                await fs.writeFile(localPath, Buffer.from(contentBase64, 'base64'));
                await withTimeout(
                    ftpClient.access({
                        host: normalizeFtpHost(server.host),
                        port: server.port,
                        user: credential.username ?? server.username,
                        password: credential.password,
                        secure: false,
                    }),
                    'FTP connection',
                );
                await withTimeout(ftpClient.uploadFrom(localPath, remotePath), 'FTP upload');
                await persistRemoteCredentialOverride(database, serverId, server, credentialOverride, credential);
            } finally {
                ftpClient.close();
                try { await fs.rm(localPath); } catch { /* ignore */ }
            }

            return;
        }

        const client = new SftpClient();

        try {
            await fs.writeFile(localPath, Buffer.from(contentBase64, 'base64'));
            const connectOpts: any = { host: server.host, port: server.port, username: credential.username ?? server.username };
            if (server.authType === 'password') connectOpts.password = credential.password; else connectOpts.privateKey = credential.password ? resolveSftpPrivateKey(credential.password) : undefined;
            await withTimeout(client.connect(connectOpts), 'SFTP connection');
            await withTimeout(client.fastPut(localPath, remotePath), 'SFTP upload');
            await persistRemoteCredentialOverride(database, serverId, server, credentialOverride, credential);
        } finally {
            client.end();
            // best-effort cleanup
            try { await fs.rm(localPath); } catch { /* ignore */ }
        }
    });

    ipcMain.handle(REMOTE_FILE_CHANNELS.delete, async (_event, serverId: number, remotePath: string, credentialOverride?: RemoteFileCredentialOverride) => {
        const server = database.projectManager.getServer(serverId);
        if (!server) throw new Error(`Server ${serverId} not found`);
        const storedCredential = await database.credentials.getCredential(serverId);
        const credential = resolveRemoteCredential(storedCredential, credentialOverride);

        if (!credential) {
            throw new Error(`Credential not found for server ${serverId}`);
        }

        if (server.protocol === 'ftp') {
            if (server.authType !== 'password') {
                throw new Error('FTP only supports password authentication in file explorer mode.');
            }

            const ftpClient = createFtpClient();

            try {
                await withTimeout(
                    ftpClient.access({
                        host: normalizeFtpHost(server.host),
                        port: server.port,
                        user: credential.username ?? server.username,
                        password: credential.password,
                        secure: false,
                    }),
                    'FTP connection',
                );

                try {
                    await withTimeout(ftpClient.remove(remotePath), 'FTP delete');
                } catch {
                    await withTimeout(ftpClient.removeDir(remotePath), 'FTP directory delete');
                }
                await persistRemoteCredentialOverride(database, serverId, server, credentialOverride, credential);
            } finally {
                ftpClient.close();
            }

            return;
        }

        const client = new SftpClient();
        try {
            const connectOpts: any = { host: server.host, port: server.port, username: credential.username ?? server.username };
            if (server.authType === 'password') connectOpts.password = credential.password; else connectOpts.privateKey = credential.password ? resolveSftpPrivateKey(credential.password) : undefined;
            await withTimeout(client.connect(connectOpts), 'SFTP connection');
            try {
                await withTimeout(client.delete(remotePath), 'SFTP delete');
            } catch (err) {
                // try rmdir for directories
                await withTimeout(client.rmdir(remotePath, true), 'SFTP directory delete');
            }
            await persistRemoteCredentialOverride(database, serverId, server, credentialOverride, credential);
        } finally {
            client.end();
        }
    });

    ipcMain.handle(REMOTE_FILE_CHANNELS.mkdir, async (_event, serverId: number, remotePath: string, credentialOverride?: RemoteFileCredentialOverride) => {
        const server = database.projectManager.getServer(serverId);
        if (!server) throw new Error(`Server ${serverId} not found`);
        const storedCredential = await database.credentials.getCredential(serverId);
        const credential = resolveRemoteCredential(storedCredential, credentialOverride);

        if (!credential.password) {
            throw new Error(`Credential not found for server ${serverId}`);
        }

        if (server.protocol === 'ftp') {
            if (server.authType !== 'password') {
                throw new Error('FTP only supports password authentication in file explorer mode.');
            }

            const ftpClient = createFtpClient();

            try {
                await withTimeout(
                    ftpClient.access({
                        host: normalizeFtpHost(server.host),
                        port: server.port,
                        user: credential.username ?? server.username,
                        password: credential.password,
                        secure: false,
                    }),
                    'FTP connection',
                );
                await withTimeout(ftpClient.cd('/'), 'FTP reset directory');
                await withTimeout(ftpClient.ensureDir(normalizeFtpRemotePath(remotePath)), 'FTP mkdir');
                await withTimeout(ftpClient.cd('/'), 'FTP reset directory');
                await persistRemoteCredentialOverride(database, serverId, server, credentialOverride, credential);
                return;
            } finally {
                ftpClient.close();
            }
        }

        const client = new SftpClient();
        try {
            const connectOpts: any = { host: server.host, port: server.port, username: credential.username ?? server.username };
            if (server.authType === 'password') connectOpts.password = credential.password; else connectOpts.privateKey = credential.password ? resolveSftpPrivateKey(credential.password) : undefined;
            await withTimeout(client.connect(connectOpts), 'SFTP connection');
            await withTimeout(client.mkdir(remotePath, true), 'SFTP mkdir');
            await persistRemoteCredentialOverride(database, serverId, server, credentialOverride, credential);
        } finally {
            client.end();
        }
    });

    ipcMain.handle(REMOTE_FILE_CHANNELS.createFile, async (_event, serverId: number, remotePath: string, credentialOverride?: RemoteFileCredentialOverride) => {
        const server = database.projectManager.getServer(serverId);
        if (!server) throw new Error(`Server ${serverId} not found`);
        const storedCredential = await database.credentials.getCredential(serverId);
        const credential = resolveRemoteCredential(storedCredential, credentialOverride);

        if (!credential.password) {
            throw new Error(`Credential not found for server ${serverId}`);
        }

        if (server.protocol === 'ftp') {
            if (server.authType !== 'password') {
                throw new Error('FTP only supports password authentication in file explorer mode.');
            }

            const ftpClient = createFtpClient();
            const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'karga-'));
            const localPath = path.join(tmpDir, `${path.posix.basename(normalizeFtpRemotePath(remotePath)) || 'new-file'}.tmp`);

            try {
                await fs.writeFile(localPath, '');
                await withTimeout(
                    ftpClient.access({
                        host: normalizeFtpHost(server.host),
                        port: server.port,
                        user: credential.username ?? server.username,
                        password: credential.password,
                        secure: false,
                    }),
                    'FTP connection',
                );
                await withTimeout(ftpClient.uploadFrom(localPath, normalizeFtpRemotePath(remotePath)), 'FTP create file');
                await persistRemoteCredentialOverride(database, serverId, server, credentialOverride, credential);
                return;
            } finally {
                ftpClient.close();
                try {
                    await fs.rm(tmpDir, { recursive: true, force: true });
                } catch {
                    // ignore cleanup failures
                }
            }
        }

        const client = new SftpClient();
        try {
            const connectOpts: any = { host: server.host, port: server.port, username: credential.username ?? server.username };
            if (server.authType === 'password') connectOpts.password = credential.password; else connectOpts.privateKey = credential.password ? resolveSftpPrivateKey(credential.password) : undefined;
            await withTimeout(client.connect(connectOpts), 'SFTP connection');
            await withTimeout(client.put(Buffer.alloc(0), remotePath), 'SFTP create file');
            await persistRemoteCredentialOverride(database, serverId, server, credentialOverride, credential);
        } finally {
            client.end();
        }
    });

    ipcMain.handle(REMOTE_FILE_CHANNELS.rename, async (_event, serverId: number, sourcePath: string, targetPath: string, credentialOverride?: RemoteFileCredentialOverride) => {
        const server = database.projectManager.getServer(serverId);
        if (!server) throw new Error(`Server ${serverId} not found`);
        const storedCredential = await database.credentials.getCredential(serverId);
        const credential = resolveRemoteCredential(storedCredential, credentialOverride);

        if (!credential.password) {
            throw new Error(`Credential not found for server ${serverId}`);
        }

        if (server.protocol === 'ftp') {
            if (server.authType !== 'password') {
                throw new Error('FTP only supports password authentication in file explorer mode.');
            }

            const ftpClient = createFtpClient();

            try {
                await withTimeout(
                    ftpClient.access({
                        host: normalizeFtpHost(server.host),
                        port: server.port,
                        user: credential.username ?? server.username,
                        password: credential.password,
                        secure: false,
                    }),
                    'FTP connection',
                );
                await withTimeout(ftpClient.rename(sourcePath, targetPath), 'FTP rename');
                await persistRemoteCredentialOverride(database, serverId, server, credentialOverride, credential);
                return;
            } finally {
                ftpClient.close();
            }
        }

        const client = new SftpClient();
        try {
            const connectOpts: any = { host: server.host, port: server.port, username: credential.username ?? server.username };
            if (server.authType === 'password') connectOpts.password = credential.password; else connectOpts.privateKey = credential.password ? resolveSftpPrivateKey(credential.password) : undefined;
            await withTimeout(client.connect(connectOpts), 'SFTP connection');
            await withTimeout(client.rename(sourcePath, targetPath), 'SFTP rename');
            await persistRemoteCredentialOverride(database, serverId, server, credentialOverride, credential);
        } finally {
            client.end();
        }
    });

    ipcMain.handle(REMOTE_FILE_CHANNELS.openExternal, async (_event, localPath: string) => {
        const { shell } = await import('electron');
        const { spawn } = await import('node:child_process');

        const settings = database.settings.getSettings();
        const pref = (settings && (settings as any).externalEditor) as ExternalEditor | undefined;
        const customPath = (settings as any).customEditorPath as string | undefined;

        const CLI_MAP: Record<string, string> = {
            vscode: 'code',
            cursor: 'cursor',
            windsurf: 'windsurf',
            zed: 'zed',
            'notepad++': process.platform === 'win32' ? 'notepad++' : '',
        };

        const cliCmd = pref && pref !== 'system' && pref !== 'custom' ? CLI_MAP[pref] : undefined;
        const execPath = pref === 'custom' ? customPath : undefined;

        if (execPath) {
            try {
                const child = spawn(execPath, [localPath], { detached: true, stdio: 'ignore' });
                child.on('error', async () => { await shell.openPath(localPath); });
                try { child.unref(); } catch { /* ignore */ }
                return;
            } catch {
                await shell.openPath(localPath);
                return;
            }
        }

        if (cliCmd) {
            try {
                const child = spawn(cliCmd, [localPath], { detached: true, stdio: 'ignore' });
                child.on('error', async () => { await shell.openPath(localPath); });
                try { child.unref(); } catch { /* ignore */ }
                return;
            } catch {
                await shell.openPath(localPath);
                return;
            }
        }

        await shell.openPath(localPath);
    });

    // ── Snapshot scanning ─────────────────────────────────────────────────────

    ipcMain.handle(IPC_CHANNELS.snapshotsLatest, async (_event, environmentId: number) => {
        const stmt = database.db.prepare(
            'SELECT id, project_id AS projectId, environment_id AS environmentId, label, created_at AS createdAt, file_count AS fileCount, total_bytes AS totalBytes FROM snapshots WHERE environment_id = ? ORDER BY created_at DESC LIMIT 1',
        );
        const row = stmt.get(environmentId) as import('../../../db/types').SnapshotRow | undefined;
        if (!row) return null;
        return toSnapshotDto(row);
    });

    ipcMain.handle(IPC_CHANNELS.snapshotsScanLocal, async (
        _event,
        input: { projectId: number; environmentId: number; localPath: string; label?: string },
    ) => {
        const crypto = await import('node:crypto');
        const files: import('../../../core/application/commands/create-snapshot').SnapshotFileInput[] = [];

        async function walkLocal(dir: string, base: string): Promise<void> {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relPath = path.join(base, entry.name).replace(/\\/g, '/');
                if (entry.isDirectory()) {
                    await walkLocal(fullPath, relPath);
                } else if (entry.isFile()) {
                    const stat = await fs.stat(fullPath);
                    const buf = await fs.readFile(fullPath);
                    const hash = crypto.createHash('sha256').update(buf).digest('hex');
                    files.push({
                        relativePath: relPath,
                        absolutePath: fullPath,
                        contentHash: hash,
                        sizeBytes: stat.size,
                        modifiedAt: stat.mtime.toISOString(),
                    });
                }
            }
        }

        await walkLocal(input.localPath, '');
        const snapshot = createSnapshotCommand.execute({
            projectId: input.projectId,
            environmentId: input.environmentId,
            label: input.label ?? null,
            files,
        });
        return toSnapshotDto(snapshot);
    });

    ipcMain.handle(IPC_CHANNELS.snapshotsScanRemote, async (
        _event,
        input: { projectId: number; environmentId: number; serverId: number; remotePath: string; label?: string },
    ) => {
        const crypto = await import('node:crypto');
        const serverRow = database.projectManager.getServer(input.serverId);
        if (!serverRow) throw new Error(`Server not found: ${input.serverId}`);
        const credential = database.credentials.getCredential(serverRow.credentialRef);

        const files: import('../../../core/application/commands/create-snapshot').SnapshotFileInput[] = [];

        function buildProxyHash(size: number, mtime: string | undefined, relPath: string): string {
            return crypto.createHash('sha256').update(`${mtime ?? ''}|${size}|${relPath}`).digest('hex');
        }

        if (serverRow.protocol === 'sftp') {
            const client = new SftpClient();
            try {
                const connectOpts: any = { host: serverRow.host, port: serverRow.port, username: serverRow.username };
                if (serverRow.authType === 'password') connectOpts.password = credential ?? undefined;
                else connectOpts.privateKey = credential ?? undefined;
                await withTimeout(client.connect(connectOpts), 'SFTP connect');

                async function walkSftp(remotePath: string, base: string): Promise<void> {
                    const listing = await client.list(remotePath || '.');
                    for (const item of listing) {
                        const itemRemote = `${remotePath === '/' ? '' : remotePath}/${item.name}`;
                        const relPath = `${base ? base + '/' : ''}${item.name}`;
                        if (item.type === 'd') {
                            await walkSftp(itemRemote, relPath);
                        } else if (item.type === '-') {
                            const mtime = item.modifyTime ? new Date(item.modifyTime * 1000).toISOString() : undefined;
                            files.push({
                                relativePath: relPath,
                                contentHash: buildProxyHash(item.size, mtime, relPath),
                                sizeBytes: item.size,
                                modifiedAt: mtime ?? null,
                            });
                        }
                    }
                }

                const root = input.remotePath || '/';
                await withTimeout(walkSftp(root, ''), 'SFTP scan');
            } finally {
                try { await client.end(); } catch { /* ignore */ }
            }
        } else {
            // FTP
            const ftpClient = createFtpClient();
            try {
                await withTimeout(ftpClient.access({
                    host: normalizeFtpHost(serverRow.host),
                    port: serverRow.port,
                    user: serverRow.username,
                    password: credential ?? undefined,
                    secure: false,
                }), 'FTP connect');

                async function walkFtp(remotePath: string, base: string): Promise<void> {
                    const normalized = normalizeFtpRemotePath(remotePath);
                    const listing = await ftpClient.list(normalized || '.');
                    for (const item of listing) {
                        if (!item.name || item.name === '.' || item.name === '..') continue;
                        const childRemote = `${remotePath}/${item.name}`;
                        const relPath = `${base ? base + '/' : ''}${item.name}`;
                        if (item.isDirectory) {
                            await walkFtp(childRemote, relPath);
                        } else {
                            const mtime = item.rawModifiedAt ? new Date(item.rawModifiedAt).toISOString() : undefined;
                            files.push({
                                relativePath: relPath,
                                contentHash: buildProxyHash(item.size ?? 0, mtime, relPath),
                                sizeBytes: item.size ?? 0,
                                modifiedAt: mtime ?? null,
                            });
                        }
                    }
                }

                const root = input.remotePath || '/';
                await withTimeout(walkFtp(root, ''), 'FTP scan');
            } finally {
                try { ftpClient.close(); } catch { /* ignore */ }
            }
        }

        const snapshot = createSnapshotCommand.execute({
            projectId: input.projectId,
            environmentId: input.environmentId,
            label: input.label ?? null,
            files,
        });
        return toSnapshotDto(snapshot);
    });

    // ── Key file chooser ─────────────────────────────────────────────────────

    ipcMain.handle(LOCAL_FILE_CHANNELS.chooseKeyFile, async (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showOpenDialog(win ?? undefined, {
            title: 'Choose SSH private key file',
            properties: ['openFile'],
            filters: [
                { name: 'Private Key Files', extensions: ['ppk', 'pem', 'key', 'rsa'] },
                { name: 'All Files', extensions: ['*'] },
            ],
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        const content = await fs.readFile(result.filePaths[0], 'utf-8');
        return content;
    });

    // ── Versioning ────────────────────────────────────────────────────────────

    function toVersionDto(row: any): import('../../../shared/ipc/contracts').VersionDto {
        return {
            id: row.id,
            serverId: row.server_id,
            remotePath: row.remote_path,
            label: row.label ?? null,
            status: row.status,
            storagePath: row.storage_path,
            fileCount: row.file_count ?? 0,
            bytesStored: row.bytes_stored ?? 0,
            errorMessage: row.error_message ?? null,
            createdAt: row.created_at,
            finishedAt: row.finished_at ?? null,
        };
    }

    async function versionSftpDownload(server: any, credential: any, remotePath: string, localPath: string): Promise<void> {
        if (server.protocol === 'ftp') {
            const ftpClient = createFtpClient();
            try {
                await withTimeout(ftpClient.access({ host: normalizeFtpHost(server.host), port: server.port, user: credential.username, password: credential.password, secure: false }), 'FTP connect');
                await withTimeout(ftpClient.downloadTo(localPath, remotePath), 'FTP download');
            } finally { ftpClient.close(); }
        } else {
            const client = new SftpClient();
            try {
                const opts: any = { host: server.host, port: server.port, username: credential.username };
                if (server.authType === 'password') opts.password = credential.password; else opts.privateKey = credential.password ? resolveSftpPrivateKey(credential.password) : undefined;
                await withTimeout(client.connect(opts), 'SFTP connect');
                await withTimeout(client.fastGet(remotePath, localPath), 'SFTP download');
            } finally { client.end(); }
        }
    }

    async function versionSftpUpload(server: any, credential: any, localPath: string, remotePath: string): Promise<void> {
        if (server.protocol === 'ftp') {
            const ftpClient = createFtpClient();
            try {
                await withTimeout(ftpClient.access({ host: normalizeFtpHost(server.host), port: server.port, user: credential.username, password: credential.password, secure: false }), 'FTP connect');
                await withTimeout(ftpClient.uploadFrom(localPath, remotePath), 'FTP upload');
            } finally { ftpClient.close(); }
        } else {
            const client = new SftpClient();
            try {
                const opts: any = { host: server.host, port: server.port, username: credential.username };
                if (server.authType === 'password') opts.password = credential.password; else opts.privateKey = credential.password ? resolveSftpPrivateKey(credential.password) : undefined;
                await withTimeout(client.connect(opts), 'SFTP connect');
                await withTimeout(client.fastPut(localPath, remotePath), 'SFTP upload');
            } finally { client.end(); }
        }
    }

    ipcMain.handle(IPC_CHANNELS.versionsList, async (_event, serverId: number) => {
        const rows = database.db.prepare(
            'SELECT * FROM versions WHERE server_id = ? ORDER BY created_at DESC',
        ).all(serverId) as any[];
        return rows.map(toVersionDto);
    });

    ipcMain.handle(IPC_CHANNELS.versionsStart, async (
        _event,
        input: import('../../../shared/ipc/contracts').StartVersionInput,
    ) => {
        const timestamp = Date.now();
        const safeLbl = (input.label ?? '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40);
        const versionDir = path.join(
            app.getPath('userData'),
            'versions',
            String(input.serverId),
            `${timestamp}${safeLbl ? '_' + safeLbl : ''}`,
        );
        await fs.mkdir(versionDir, { recursive: true });
        const result = database.db.prepare(
            `INSERT INTO versions (server_id, remote_path, label, status, storage_path) VALUES (?, '/', ?, 'running', ?)`,
        ).run(input.serverId, input.label ?? null, versionDir);
        return { id: Number(result.lastInsertRowid), storagePath: versionDir };
    });

    ipcMain.handle(IPC_CHANNELS.versionsBackupFile, async (
        _event,
        input: import('../../../shared/ipc/contracts').BackupFileForVersionInput,
    ) => {
        const version = database.db.prepare('SELECT * FROM versions WHERE id = ?').get(input.versionId) as any;
        if (!version) throw new Error(`Version ${input.versionId} not found`);

        const server = database.projectManager.getServer(input.serverId);
        if (!server) throw new Error(`Server ${input.serverId} not found`);
        const storedCred = await database.credentials.getCredential(input.serverId);
        const credential = { username: server.username, password: storedCred ?? undefined };

        const relPath = input.remotePath.replace(/^\/+/, '').split('/').join(path.sep);
        const localDest = path.join(version.storage_path, relPath);
        await fs.mkdir(path.dirname(localDest), { recursive: true });

        try {
            await versionSftpDownload(server, credential, input.remotePath, localDest);
            const stat = await fs.stat(localDest);
            database.db.prepare(
                `INSERT INTO version_files (version_id, remote_path, local_path, size_bytes) VALUES (?, ?, ?, ?)`,
            ).run(input.versionId, input.remotePath, localDest, stat.size);
            database.db.prepare(
                `UPDATE versions SET file_count = file_count + 1, bytes_stored = bytes_stored + ? WHERE id = ?`,
            ).run(stat.size, input.versionId);
            return { backed: true };
        } catch {
            return { backed: false };
        }
    });

    ipcMain.handle(IPC_CHANNELS.versionsFinish, async (_event, versionId: number) => {
        database.db.prepare(
            `UPDATE versions SET status='completed', finished_at=CURRENT_TIMESTAMP WHERE id = ?`,
        ).run(versionId);
    });

    ipcMain.handle(IPC_CHANNELS.versionsAbort, async (_event, versionId: number) => {
        database.db.prepare(
            `UPDATE versions SET status='failed', error_message='Aborted by user', finished_at=CURRENT_TIMESTAMP WHERE id = ?`,
        ).run(versionId);
    });

    ipcMain.handle(IPC_CHANNELS.versionsRollback, async (_event, versionId: number) => {
        const version = database.db.prepare('SELECT * FROM versions WHERE id = ?').get(versionId) as any;
        if (!version) throw new Error(`Version ${versionId} not found`);

        const server = database.projectManager.getServer(version.server_id);
        if (!server) throw new Error(`Server ${version.server_id} not found`);
        const storedCred = await database.credentials.getCredential(version.server_id);
        const credential = { username: server.username, password: storedCred ?? undefined };

        const fileRows = database.db.prepare(
            'SELECT * FROM version_files WHERE version_id = ?',
        ).all(versionId) as any[];

        for (const fileRow of fileRows) {
            const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'karga-rollback-'));
            const tmpPath = path.join(tmpDir, path.basename(fileRow.local_path));
            try {
                await fs.copyFile(fileRow.local_path, tmpPath);
                await versionSftpUpload(server, credential, tmpPath, fileRow.remote_path);
            } finally {
                try { await fs.rm(tmpPath); } catch { /* ignore */ }
            }
        }
    });

    ipcMain.handle(IPC_CHANNELS.versionsDelete, async (_event, versionId: number) => {
        const version = database.db.prepare('SELECT * FROM versions WHERE id = ?').get(versionId) as any;
        if (!version) return false;
        try { await fs.rm(version.storage_path, { recursive: true, force: true }); } catch { /* ignore */ }
        database.db.prepare('DELETE FROM versions WHERE id = ?').run(versionId);
        return true;
    });
}
