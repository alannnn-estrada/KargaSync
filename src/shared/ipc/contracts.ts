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
} as const;

export const LOCAL_FILE_CHANNELS = {
    defaultRoot: 'localFiles:defaultRoot',
    chooseRoot: 'localFiles:chooseRoot',
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
}
