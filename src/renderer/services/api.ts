import type {
    CompareEnvironmentsRequestDto,
    CompareEnvironmentsResponseDto,
    CreateProjectRequestDto,
    CreateProjectResponseDto,
    CreateSnapshotRequestDto,
    CreateSnapshotResponseDto,
    GetAllProjectsResponseDto,
    GetSettingsResponseDto,
    UpdateSettingsRequestDto,
    UpdateSettingsResponseDto,
    RendererApi,
} from '../../shared/ipc/contracts';

import type {
    ServerDto,
    GetAllServersResponseDto,
    EnvironmentDto,
    GetEnvironmentsResponseDto,
    EnvironmentBindingDto,
    GetEnvironmentBindingsResponseDto,
} from '../../shared/ipc/contracts';

export interface FrontendApi {
    getProjects: () => Promise<GetAllProjectsResponseDto>;
    createProject: (input: CreateProjectRequestDto) => Promise<CreateProjectResponseDto>;
    updateProject: (input: { id: number; name?: string; rootPath?: string | null }) => Promise<CreateProjectResponseDto | null>;
    deleteProject: (projectId: number) => Promise<boolean>;
    compareEnvironments: (input: CompareEnvironmentsRequestDto) => Promise<CompareEnvironmentsResponseDto>;
    createSnapshot: (input: CreateSnapshotRequestDto) => Promise<CreateSnapshotResponseDto>;
    getSettings: () => Promise<GetSettingsResponseDto>;
    updateSettings: (input: UpdateSettingsRequestDto) => Promise<UpdateSettingsResponseDto>;
}

export interface ServersApi {
    listServers: () => Promise<GetAllServersResponseDto>;
    createServer: (input: import('../../shared/dto').CreateServerRequestDTO) => Promise<ServerDto>;
    updateServer: (input: import('../../shared/dto').UpdateServerRequestDTO) => Promise<ServerDto | null>;
    deleteServer: (serverId: number) => Promise<boolean>;
}

export interface EnvironmentsApi {
    listEnvironments: (projectId: number) => Promise<GetEnvironmentsResponseDto>;
    createEnvironment: (input: import('../../shared/dto').CreateEnvironmentRequestDTO) => Promise<EnvironmentDto>;
    listEnvironmentBindings: (environmentId: number) => Promise<GetEnvironmentBindingsResponseDto>;
    assignEnvironmentBinding: (input: import('../../shared/dto').AssignEnvironmentBindingRequestDTO) => Promise<EnvironmentBindingDto>;
    updateEnvironment: (input: import('../../shared/dto').UpdateEnvironmentRequestDTO) => Promise<EnvironmentDto | null>;
    deleteEnvironment: (environmentId: number) => Promise<boolean>;
}

export interface LocalFilesApi {
    getDefaultRoot: () => Promise<string>;
    chooseRoot: () => Promise<string | null>;
    listFiles: (directoryPath: string) => Promise<import('../../shared/ipc/contracts').RemoteFileEntryDto[]>;
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, contentBase64: string) => Promise<void>;
    createDirectory: (directoryPath: string) => Promise<void>;
    createFile: (filePath: string) => Promise<void>;
    renamePath: (sourcePath: string, targetPath: string) => Promise<void>;
    deletePath: (targetPath: string) => Promise<void>;
}

export interface RemoteFilesApi {
    listRemoteFiles: (serverId: number, remotePath: string, credentialOverride?: string | { username?: string; password?: string }) => Promise<import('../../shared/ipc/contracts').RemoteFileEntryDto[]>;
    downloadRemoteFile: (serverId: number, remotePath: string, credentialOverride?: string | { username?: string; password?: string }) => Promise<string>;
    downloadRemoteFileToDirectory: (serverId: number, remotePath: string, localDirectoryPath: string, credentialOverride?: string | { username?: string; password?: string }) => Promise<string>;
    uploadRemoteFile: (serverId: number, remotePath: string, contentBase64: string, credentialOverride?: string | { username?: string; password?: string }) => Promise<void>;
    deleteRemoteFile: (serverId: number, remotePath: string, credentialOverride?: string | { username?: string; password?: string }) => Promise<void>;
    createRemoteDirectory: (serverId: number, remotePath: string, credentialOverride?: string | { username?: string; password?: string }) => Promise<void>;
    createRemoteFile: (serverId: number, remotePath: string, credentialOverride?: string | { username?: string; password?: string }) => Promise<void>;
    renameRemotePath: (serverId: number, sourcePath: string, targetPath: string, credentialOverride?: string | { username?: string; password?: string }) => Promise<void>;
    openRemoteFileExternal: (localPath: string) => Promise<void>;
}

function getRendererApi(): RendererApi {
    if (typeof window === 'undefined' || !window.api) {
        throw new Error('Renderer API is not available. Check preload and contextBridge setup.');
    }

    return window.api;
}

export const apiService: FrontendApi = {
    getProjects: () => getRendererApi().getAllProjects(),
    createProject: (input) => getRendererApi().createProject(input),
    updateProject: (input) => getRendererApi().updateProject(input),
    deleteProject: (projectId) => getRendererApi().deleteProject(projectId),
    compareEnvironments: (input) => getRendererApi().compareEnvironments(input),
    createSnapshot: (input) => getRendererApi().createSnapshot(input),
    getSettings: () => getRendererApi().getSettings(),
    updateSettings: (input) => getRendererApi().updateSettings(input),
};

export const serversService: ServersApi = {
    listServers: () => getRendererApi().listServers(),
    createServer: (input) => getRendererApi().createServer(input),
    updateServer: (input) => getRendererApi().updateServer(input),
    deleteServer: (serverId) => getRendererApi().deleteServer(serverId),
};

export const testServerConnection = (input: import('../../shared/dto').CreateServerRequestDTO) =>
    getRendererApi().testServerConnection(input);

export const environmentsService: EnvironmentsApi = {
    listEnvironments: (projectId: number) => getRendererApi().listEnvironments(projectId),
    createEnvironment: (input) => getRendererApi().createEnvironment(input),
    listEnvironmentBindings: (environmentId: number) => getRendererApi().listEnvironmentBindings(environmentId),
    assignEnvironmentBinding: (input) => getRendererApi().assignEnvironmentBinding(input),
    updateEnvironment: (input) => getRendererApi().updateEnvironment(input),
    deleteEnvironment: (environmentId) => getRendererApi().deleteEnvironment(environmentId),
};

export const remoteFilesService: RemoteFilesApi = {
    listRemoteFiles: (serverId, remotePath, credentialOverride) => getRendererApi().listRemoteFiles(serverId, remotePath, credentialOverride),
    downloadRemoteFile: (serverId, remotePath, credentialOverride) => getRendererApi().downloadRemoteFile(serverId, remotePath, credentialOverride),
    downloadRemoteFileToDirectory: (serverId, remotePath, localDirectoryPath, credentialOverride) => getRendererApi().downloadRemoteFileToDirectory(serverId, remotePath, localDirectoryPath, credentialOverride),
    uploadRemoteFile: (serverId, remotePath, contentBase64, credentialOverride) => getRendererApi().uploadRemoteFile(serverId, remotePath, contentBase64, credentialOverride),
    deleteRemoteFile: (serverId, remotePath, credentialOverride) => getRendererApi().deleteRemoteFile(serverId, remotePath, credentialOverride),
    createRemoteDirectory: (serverId, remotePath, credentialOverride) => getRendererApi().createRemoteDirectory(serverId, remotePath, credentialOverride),
    createRemoteFile: (serverId, remotePath, credentialOverride) => getRendererApi().createRemoteFile(serverId, remotePath, credentialOverride),
    renameRemotePath: (serverId, sourcePath, targetPath, credentialOverride) => getRendererApi().renameRemotePath(serverId, sourcePath, targetPath, credentialOverride),
    openRemoteFileExternal: (localPath) => getRendererApi().openRemoteFileExternal(localPath),
};

export const getProjects = (): Promise<GetAllProjectsResponseDto> => apiService.getProjects();

export const createProject = (
    input: CreateProjectRequestDto,
): Promise<CreateProjectResponseDto> => apiService.createProject(input);

export const updateProject = (input: { id: number; name?: string; rootPath?: string | null }) => apiService.updateProject(input);

export const deleteProject = (projectId: number) => apiService.deleteProject(projectId);

export const compareEnvironments = (
    input: CompareEnvironmentsRequestDto,
): Promise<CompareEnvironmentsResponseDto> => apiService.compareEnvironments(input);

export const createSnapshot = (
    input: CreateSnapshotRequestDto,
): Promise<CreateSnapshotResponseDto> => apiService.createSnapshot(input);

export const scanLocalSnapshot = (
    input: { projectId: number; environmentId: number; localPath: string; label?: string },
): Promise<CreateSnapshotResponseDto> => getRendererApi().scanLocalSnapshot(input);

export const scanRemoteSnapshot = (
    input: { projectId: number; environmentId: number; serverId: number; remotePath: string; label?: string },
): Promise<CreateSnapshotResponseDto> => getRendererApi().scanRemoteSnapshot(input);

export const getLatestSnapshot = (environmentId: number): Promise<CreateSnapshotResponseDto | null> =>
    getRendererApi().getLatestSnapshot(environmentId);

export const getSettings = (): Promise<GetSettingsResponseDto> => apiService.getSettings();

export const updateSettings = (
    input: UpdateSettingsRequestDto,
): Promise<UpdateSettingsResponseDto> => apiService.updateSettings(input);

export const listServers = (): Promise<GetAllServersResponseDto> => serversService.listServers();
export const createServer = (input: import('../../shared/dto').CreateServerRequestDTO) => serversService.createServer(input);
export const updateServer = (input: import('../../shared/dto').UpdateServerRequestDTO) => serversService.updateServer(input);
export const deleteServer = (serverId: number) => serversService.deleteServer(serverId);
export const testServer = (input: import('../../shared/dto').CreateServerRequestDTO) => testServerConnection(input);

export const listEnvironments = (projectId: number): Promise<GetEnvironmentsResponseDto> => environmentsService.listEnvironments(projectId);

export const createEnvironment = (input: import('../../shared/dto').CreateEnvironmentRequestDTO) => environmentsService.createEnvironment(input);

export const updateEnvironment = (input: import('../../shared/dto').UpdateEnvironmentRequestDTO) => environmentsService.updateEnvironment(input);

export const deleteEnvironment = (environmentId: number) => environmentsService.deleteEnvironment(environmentId);

export const listEnvironmentBindings = (environmentId: number) => environmentsService.listEnvironmentBindings(environmentId);

export const assignEnvironmentBinding = (input: import('../../shared/dto').AssignEnvironmentBindingRequestDTO) => environmentsService.assignEnvironmentBinding(input);

export type {
    CompareEnvironmentsRequestDto,
    CompareEnvironmentsResponseDto,
    CreateProjectRequestDto,
    CreateProjectResponseDto,
    CreateSnapshotRequestDto,
    CreateSnapshotResponseDto,
    GetAllProjectsResponseDto,
    GetSettingsResponseDto,
    UpdateSettingsRequestDto,
    UpdateSettingsResponseDto,
};

export const listVersions = (serverId: number) =>
    getRendererApi().listVersions(serverId);

export const listVersionFiles = (versionId: number) =>
    getRendererApi().listVersionFiles(versionId);

export const startVersionSession = (input: import('../../shared/ipc/contracts').StartVersionInput) =>
    getRendererApi().startVersionSession(input);

export const backupFileForVersion = (input: import('../../shared/ipc/contracts').BackupFileForVersionInput) =>
    getRendererApi().backupFileForVersion(input);

export const finishVersionSession = (versionId: number) =>
    getRendererApi().finishVersionSession(versionId);

export const abortVersionSession = (versionId: number) =>
    getRendererApi().abortVersionSession(versionId);

export const rollbackVersion = (versionId: number) =>
    getRendererApi().rollbackVersion(versionId);

export const deleteVersion = (versionId: number) =>
    getRendererApi().deleteVersion(versionId);

export const chooseKeyFile = () =>
    getRendererApi().chooseKeyFile();

export type { VersionDto } from '../../shared/ipc/contracts';

export const openLocalFolder = (folderPath: string) =>
    getRendererApi().openLocalFolder(folderPath);

export const listIgnorePatterns = (projectId: number): Promise<string[]> =>
    getRendererApi().listIgnorePatterns(projectId);

export const saveIgnorePatterns = (projectId: number, patterns: string[]): Promise<void> =>
    getRendererApi().saveIgnorePatterns(projectId, patterns);

export const deployBatch = (input: import('../../shared/ipc/contracts').DeployBatchInput) =>
    getRendererApi().deployBatch(input);

export const onDeployProgress = (callback: (event: import('../../shared/ipc/contracts').DeployProgressEvent) => void) =>
    getRendererApi().onDeployProgress(callback);

export const readFileDiff = (input: import('../../shared/ipc/contracts').FileDiffInput) =>
    getRendererApi().readFileDiff(input);

export const localFilesService: LocalFilesApi = {
    getDefaultRoot: () => getRendererApi().getLocalFilesDefaultRoot(),
    chooseRoot: () => getRendererApi().chooseLocalFilesRoot(),
    listFiles: (directoryPath) => getRendererApi().listLocalFiles(directoryPath),
    readFile: (filePath) => getRendererApi().readLocalFile(filePath),
    writeFile: (filePath, contentBase64) => getRendererApi().writeLocalFile(filePath, contentBase64),
    createDirectory: (directoryPath) => getRendererApi().createLocalDirectory(directoryPath),
    createFile: (filePath) => getRendererApi().createLocalFile(filePath),
    renamePath: (sourcePath, targetPath) => getRendererApi().renameLocalPath(sourcePath, targetPath),
    deletePath: (targetPath) => getRendererApi().deleteLocalPath(targetPath),
};