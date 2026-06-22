import type {
    CompareEnvironmentsRequestDTO,
    CompareEnvironmentsResponseDTO,
    CreateProjectRequestDTO,
    CreateProjectResponseDTO,
    CreateSnapshotRequestDTO,
    CreateSnapshotResponseDTO,
    GetAllProjectsResponseDTO,
    GetSettingsResponseDTO,
    UpdateSettingsRequestDTO,
    UpdateSettingsResponseDTO,
} from '../dto';

export const IPC_CHANNELS = {
    projectsGetAll: 'projects:getAll',
    projectsCreate: 'projects:create',
    projectsUpdate: 'projects:update',
    projectsDelete: 'projects:delete',
    dialogConfirm: 'dialog:confirm',
    compareEnvironments: 'compare:environments',
    snapshotsCreate: 'snapshots:create',
    snapshotsScanLocal: 'snapshots:scanLocal',
    snapshotsScanRemote: 'snapshots:scanRemote',
    snapshotsLatest: 'snapshots:latest',
    settingsGet: 'settings:get',
    settingsUpdate: 'settings:update',
    appMenuToggle: 'app-menu:toggle',
    serversList: 'servers:list',
    serversCreate: 'servers:create',
    serversUpdate: 'servers:update',
    serversDelete: 'servers:delete',
    serversTest: 'servers:test',
    environmentsList: 'environments:list',
    environmentsCreate: 'environments:create',
    environmentsUpdate: 'environments:update',
    environmentsDelete: 'environments:delete',
    environmentBindingsAssign: 'environmentBindings:assign',
    environmentBindingsList: 'environmentBindings:list',
    ignorePatternsList: 'ignorePatterns:list',
    ignorePatternsSave: 'ignorePatterns:save',
    deployBatch: 'deploy:batch',
    versionsList: 'versions:list',
    versionsFilesList: 'versions:filesList',
    versionsStart: 'versions:start',
    versionsBackupFile: 'versions:backupFile',
    versionsFinish: 'versions:finish',
    versionsAbort: 'versions:abort',
    versionsRollback: 'versions:rollback',
    versionsDelete: 'versions:delete',
    fileDiffRead: 'fileDiff:read',
} as const;

export const DEPLOY_CHANNELS = {
    progress: 'deploy:progress',
} as const;

export const UPDATE_CHANNELS = {
    available: 'update:available',
    downloaded: 'update:downloaded',
    install: 'update:install',
} as const;

export interface UpdateAvailableEvent {
    version: string;
    url?: string;
    mode: 'downloading' | 'manual';
}

export interface UpdateDownloadedEvent {
    version: string;
}

export interface DeployBatchInput {
    sourceEnvironmentId: number;
    targetEnvironmentId: number;
    filePaths: string[];
    skipDeleted?: boolean;
}

export interface DeployProgressEvent {
    file: string;
    status: 'pending' | 'transferring' | 'done' | 'error' | 'skipped';
    error?: string;
}

export interface DeployBatchResult {
    transferred: number;
    skipped: number;
    failed: number;
    errors: Array<{ file: string; error: string }>;
}

export const LOCAL_FILE_CHANNELS = {
    defaultRoot: 'localFiles:defaultRoot',
    chooseRoot: 'localFiles:chooseRoot',
    chooseKeyFile: 'localFiles:chooseKeyFile',
    list: 'localFiles:list',
    readFile: 'localFiles:readFile',
    writeFile: 'localFiles:writeFile',
    mkdir: 'localFiles:mkdir',
    createFile: 'localFiles:createFile',
    rename: 'localFiles:rename',
    delete: 'localFiles:delete',
} as const;

export const REMOTE_FILE_CHANNELS = {
    list: 'remoteFiles:list',
    download: 'remoteFiles:download',
    downloadToDirectory: 'remoteFiles:downloadToDirectory',
    upload: 'remoteFiles:upload',
    delete: 'remoteFiles:delete',
    mkdir: 'remoteFiles:mkdir',
    createFile: 'remoteFiles:createFile',
    rename: 'remoteFiles:rename',
    openExternal: 'remoteFiles:openExternal',
} as const;

export type GetAllProjectsResponseDto = GetAllProjectsResponseDTO;
export type CreateProjectRequestDto = CreateProjectRequestDTO;
export type CreateProjectResponseDto = CreateProjectResponseDTO;
export type CompareEnvironmentsRequestDto = CompareEnvironmentsRequestDTO;
export type CompareEnvironmentsResponseDto = CompareEnvironmentsResponseDTO;
export type CreateSnapshotRequestDto = CreateSnapshotRequestDTO;
export type CreateSnapshotResponseDto = CreateSnapshotResponseDTO;
export type GetSettingsResponseDto = GetSettingsResponseDTO;
export type UpdateSettingsRequestDto = UpdateSettingsRequestDTO;
export type UpdateSettingsResponseDto = UpdateSettingsResponseDTO;

export type ServerDto = import('../dto').ServerDTO;
export type GetAllServersResponseDto = import('../dto').GetAllServersResponseDTO;

export type EnvironmentDto = import('../dto').EnvironmentDTO;
export type GetEnvironmentsResponseDto = import('../dto').GetEnvironmentsResponseDTO;

export type EnvironmentBindingDto = import('../dto').EnvironmentBindingDTO;
export type GetEnvironmentBindingsResponseDto = import('../dto').GetEnvironmentBindingsResponseDTO;

export interface VersionDto {
    id: number;
    serverId: number;
    remotePath: string;
    label: string | null;
    status: 'pending' | 'running' | 'completed' | 'failed';
    storagePath: string;
    fileCount: number;
    bytesStored: number;
    errorMessage: string | null;
    createdAt: string;
    finishedAt: string | null;
}

export interface StartVersionInput {
    serverId: number;
    label?: string;
}

export interface BackupFileForVersionInput {
    versionId: number;
    serverId: number;
    remotePath: string;
    credentialOverride?: string | RemoteFileCredentialOverrideDto;
}

export interface VersionFileDto {
    remotePath: string;
    localPath: string | null;
    sizeBytes: number;
    isNewFile: boolean;
}

export interface FileDiffInput {
    sourceEnvironmentId: number;
    targetEnvironmentId: number;
    relativePath: string;
}

export interface FileDiffLine {
    type: 'equal' | 'insert' | 'delete' | 'replace';
    leftLineNo: number | null;
    rightLineNo: number | null;
    leftText: string;
    rightText: string;
}

export interface FileDiffResult {
    lines: FileDiffLine[];
    leftTotal: number;
    rightTotal: number;
    changedCount: number;
}

export interface AppMenuAnchorDto {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface RemoteFileEntryDto {
    name: string;
    path: string;
    isDirectory: boolean;
    size?: number | null;
    modifiedAt?: string | null;
}

export interface RemoteFileCredentialOverrideDto {
    username?: string;
    password?: string;
}

export interface RendererApi {
    getAllProjects: () => Promise<GetAllProjectsResponseDto>;
    createProject: (input: CreateProjectRequestDto) => Promise<CreateProjectResponseDto>;
    compareEnvironments: (input: CompareEnvironmentsRequestDto) => Promise<CompareEnvironmentsResponseDto>;
    createSnapshot: (input: CreateSnapshotRequestDto) => Promise<CreateSnapshotResponseDto>;
    scanLocalSnapshot: (input: { projectId: number; environmentId: number; localPath: string; label?: string }) => Promise<CreateSnapshotResponseDto>;
    scanRemoteSnapshot: (input: { projectId: number; environmentId: number; serverId: number; remotePath: string; label?: string }) => Promise<CreateSnapshotResponseDto>;
    getLatestSnapshot: (environmentId: number) => Promise<CreateSnapshotResponseDto | null>;
    getSettings: () => Promise<GetSettingsResponseDto>;
    updateSettings: (input: UpdateSettingsRequestDto) => Promise<UpdateSettingsResponseDto>;
    toggleAppMenu: (anchor: AppMenuAnchorDto) => Promise<void>;
    showConfirm: (message: string) => Promise<boolean>;

    // Servers
    listServers: () => Promise<GetAllServersResponseDto>;
    createServer: (input: import('../dto').CreateServerRequestDTO) => Promise<ServerDto>;
    updateServer: (input: import('../dto').UpdateServerRequestDTO) => Promise<ServerDto | null>;
    deleteServer: (serverId: number) => Promise<boolean>;
    testServerConnection: (input: import('../dto').CreateServerRequestDTO) => Promise<boolean>;

    // Environments
    listEnvironments: (projectId: number) => Promise<GetEnvironmentsResponseDto>;
    createEnvironment: (input: import('../dto').CreateEnvironmentRequestDTO) => Promise<EnvironmentDto>;
    updateEnvironment: (input: import('../dto').UpdateEnvironmentRequestDTO) => Promise<EnvironmentDto | null>;
    deleteEnvironment: (environmentId: number) => Promise<boolean>;
    // Projects
    updateProject: (input: { id: number; name?: string; rootPath?: string | null }) => Promise<CreateProjectResponseDto | null>;
    deleteProject: (projectId: number) => Promise<boolean>;

    // Environment bindings
    assignEnvironmentBinding: (input: import('../dto').AssignEnvironmentBindingRequestDTO) => Promise<EnvironmentBindingDto>;
    listEnvironmentBindings: (environmentId: number) => Promise<GetEnvironmentBindingsResponseDto>;

    // Ignore patterns
    listIgnorePatterns: (projectId: number) => Promise<string[]>;
    saveIgnorePatterns: (projectId: number, patterns: string[]) => Promise<void>;

    // Deploy
    deployBatch: (input: DeployBatchInput) => Promise<DeployBatchResult>;
    onDeployProgress: (callback: (event: DeployProgressEvent) => void) => () => void;

    getLocalFilesDefaultRoot: () => Promise<string>;
    chooseLocalFilesRoot: () => Promise<string | null>;
    listLocalFiles: (directoryPath: string) => Promise<RemoteFileEntryDto[]>;
    readLocalFile: (filePath: string) => Promise<string>;
    writeLocalFile: (filePath: string, contentBase64: string) => Promise<void>;
    createLocalDirectory: (directoryPath: string) => Promise<void>;
    createLocalFile: (filePath: string) => Promise<void>;
    renameLocalPath: (sourcePath: string, targetPath: string) => Promise<void>;
    deleteLocalPath: (targetPath: string) => Promise<void>;
    // Remote files
    listRemoteFiles: (serverId: number, remotePath: string, credentialOverride?: string | RemoteFileCredentialOverrideDto) => Promise<RemoteFileEntryDto[]>;
    downloadRemoteFile: (serverId: number, remotePath: string, credentialOverride?: string | RemoteFileCredentialOverrideDto) => Promise<string>; // returns local temp path
    downloadRemoteFileToDirectory: (serverId: number, remotePath: string, localDirectoryPath: string, credentialOverride?: string | RemoteFileCredentialOverrideDto) => Promise<string>;
    uploadRemoteFile: (serverId: number, remotePath: string, contentBase64: string, credentialOverride?: string | RemoteFileCredentialOverrideDto) => Promise<void>;
    deleteRemoteFile: (serverId: number, remotePath: string, credentialOverride?: string | RemoteFileCredentialOverrideDto) => Promise<void>;
    createRemoteDirectory: (serverId: number, remotePath: string, credentialOverride?: string | RemoteFileCredentialOverrideDto) => Promise<void>;
    createRemoteFile: (serverId: number, remotePath: string, credentialOverride?: string | RemoteFileCredentialOverrideDto) => Promise<void>;
    renameRemotePath: (serverId: number, sourcePath: string, targetPath: string, credentialOverride?: string | RemoteFileCredentialOverrideDto) => Promise<void>;
    openRemoteFileExternal: (localPath: string) => Promise<void>;
    // Versions
    listVersions: (serverId: number) => Promise<VersionDto[]>;
    listVersionFiles: (versionId: number) => Promise<VersionFileDto[]>;
    startVersionSession: (input: StartVersionInput) => Promise<{ id: number; storagePath: string }>;
    backupFileForVersion: (input: BackupFileForVersionInput) => Promise<{ backed: boolean; isNewFile?: boolean }>;
    finishVersionSession: (versionId: number) => Promise<void>;
    abortVersionSession: (versionId: number) => Promise<void>;
    rollbackVersion: (versionId: number) => Promise<void>;
    deleteVersion: (versionId: number) => Promise<boolean>;
    chooseKeyFile: () => Promise<string | null>;
    readFileDiff: (input: FileDiffInput) => Promise<FileDiffResult>;
    onUpdateAvailable: (callback: (event: UpdateAvailableEvent) => void) => () => void;
    onUpdateDownloaded: (callback: (event: UpdateDownloadedEvent) => void) => () => void;
    installUpdate: () => void;
    openExternalUrl: (url: string) => Promise<void>;
    openLocalFolder: (folderPath: string) => Promise<void>;
}
