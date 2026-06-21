import { contextBridge, ipcRenderer } from 'electron';

import { IPC_CHANNELS, LOCAL_FILE_CHANNELS, type RendererApi } from './shared/ipc/contracts';
import { REMOTE_FILE_CHANNELS } from './shared/ipc/contracts';

const api: RendererApi = {
    getAllProjects: () => ipcRenderer.invoke(IPC_CHANNELS.projectsGetAll),
    createProject: (input) => ipcRenderer.invoke(IPC_CHANNELS.projectsCreate, input),
    compareEnvironments: (input) => ipcRenderer.invoke(IPC_CHANNELS.compareEnvironments, input),
    createSnapshot: (input) => ipcRenderer.invoke(IPC_CHANNELS.snapshotsCreate, input),
    scanLocalSnapshot: (input) => ipcRenderer.invoke(IPC_CHANNELS.snapshotsScanLocal, input),
    scanRemoteSnapshot: (input) => ipcRenderer.invoke(IPC_CHANNELS.snapshotsScanRemote, input),
    getLatestSnapshot: (environmentId) => ipcRenderer.invoke(IPC_CHANNELS.snapshotsLatest, environmentId),
    getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet),
    updateSettings: (input) => ipcRenderer.invoke(IPC_CHANNELS.settingsUpdate, input),
    toggleAppMenu: (anchor) => ipcRenderer.invoke(IPC_CHANNELS.appMenuToggle, anchor),
    // Servers
    listServers: () => ipcRenderer.invoke(IPC_CHANNELS.serversList),
    createServer: (input) => ipcRenderer.invoke(IPC_CHANNELS.serversCreate, input),
    updateServer: (input) => ipcRenderer.invoke(IPC_CHANNELS.serversUpdate, input),
    deleteServer: (serverId) => ipcRenderer.invoke(IPC_CHANNELS.serversDelete, serverId),
    testServerConnection: (input) => ipcRenderer.invoke(IPC_CHANNELS.serversTest, input),

    // Environments
    listEnvironments: (projectId: number) => ipcRenderer.invoke(IPC_CHANNELS.environmentsList, projectId),
    createEnvironment: (input) => ipcRenderer.invoke(IPC_CHANNELS.environmentsCreate, input),
    updateEnvironment: (input) => ipcRenderer.invoke(IPC_CHANNELS.environmentsUpdate, input),
    deleteEnvironment: (environmentId: number) => ipcRenderer.invoke(IPC_CHANNELS.environmentsDelete, environmentId),
    // Projects
    updateProject: (input: { id: number; name?: string; rootPath?: string | null }) => ipcRenderer.invoke(IPC_CHANNELS.projectsUpdate, input),
    deleteProject: (projectId: number) => ipcRenderer.invoke(IPC_CHANNELS.projectsDelete, projectId),

    // Dialogs
    showConfirm: (message: string) => ipcRenderer.invoke(IPC_CHANNELS.dialogConfirm, message),

    // Environment bindings
    assignEnvironmentBinding: (input) => ipcRenderer.invoke(IPC_CHANNELS.environmentBindingsAssign, input),
    listEnvironmentBindings: (environmentId: number) => ipcRenderer.invoke(IPC_CHANNELS.environmentBindingsList, environmentId),
    getLocalFilesDefaultRoot: () => Promise.resolve(resolveLocalDefaultRoot()),
    chooseLocalFilesRoot: () => ipcRenderer.invoke(LOCAL_FILE_CHANNELS.chooseRoot),
    listLocalFiles: (directoryPath: string) => ipcRenderer.invoke(LOCAL_FILE_CHANNELS.list, directoryPath),
    readLocalFile: (filePath: string) => ipcRenderer.invoke(LOCAL_FILE_CHANNELS.readFile, filePath),
    writeLocalFile: (filePath: string, contentBase64: string) => ipcRenderer.invoke(LOCAL_FILE_CHANNELS.writeFile, filePath, contentBase64),
    createLocalDirectory: (directoryPath: string) => ipcRenderer.invoke(LOCAL_FILE_CHANNELS.mkdir, directoryPath),
    createLocalFile: (filePath: string) => ipcRenderer.invoke(LOCAL_FILE_CHANNELS.createFile, filePath),
    renameLocalPath: (sourcePath: string, targetPath: string) => ipcRenderer.invoke(LOCAL_FILE_CHANNELS.rename, sourcePath, targetPath),
    deleteLocalPath: (targetPath: string) => ipcRenderer.invoke(LOCAL_FILE_CHANNELS.delete, targetPath),
    // Remote files
    listRemoteFiles: (serverId: number, remotePath: string, credentialOverride?: string | { username?: string; password?: string }) => ipcRenderer.invoke(REMOTE_FILE_CHANNELS.list, serverId, remotePath, credentialOverride),
    downloadRemoteFile: (serverId: number, remotePath: string, credentialOverride?: string | { username?: string; password?: string }) => ipcRenderer.invoke(REMOTE_FILE_CHANNELS.download, serverId, remotePath, credentialOverride),
    downloadRemoteFileToDirectory: (serverId: number, remotePath: string, localDirectoryPath: string, credentialOverride?: string | { username?: string; password?: string }) => ipcRenderer.invoke(REMOTE_FILE_CHANNELS.downloadToDirectory, serverId, remotePath, localDirectoryPath, credentialOverride),
    uploadRemoteFile: (serverId: number, remotePath: string, contentBase64: string, credentialOverride?: string | { username?: string; password?: string }) => ipcRenderer.invoke(REMOTE_FILE_CHANNELS.upload, serverId, remotePath, contentBase64, credentialOverride),
    deleteRemoteFile: (serverId: number, remotePath: string, credentialOverride?: string | { username?: string; password?: string }) => ipcRenderer.invoke(REMOTE_FILE_CHANNELS.delete, serverId, remotePath, credentialOverride),
    createRemoteDirectory: (serverId: number, remotePath: string, credentialOverride?: string | { username?: string; password?: string }) => ipcRenderer.invoke(REMOTE_FILE_CHANNELS.mkdir, serverId, remotePath, credentialOverride),
    createRemoteFile: (serverId: number, remotePath: string, credentialOverride?: string | { username?: string; password?: string }) => ipcRenderer.invoke(REMOTE_FILE_CHANNELS.createFile, serverId, remotePath, credentialOverride),
    renameRemotePath: (serverId: number, sourcePath: string, targetPath: string, credentialOverride?: string | { username?: string; password?: string }) => ipcRenderer.invoke(REMOTE_FILE_CHANNELS.rename, serverId, sourcePath, targetPath, credentialOverride),
    openRemoteFileExternal: (localPath: string) => ipcRenderer.invoke(REMOTE_FILE_CHANNELS.openExternal, localPath),
};

contextBridge.exposeInMainWorld('api', Object.freeze(api));

function resolveLocalDefaultRoot(): string {
    const platform = process.platform;

    if (platform === 'win32') {
        return process.env.USERPROFILE ?? 'C:\\Users\\Public';
    }

    if (platform === 'darwin') {
        return process.env.HOME ?? '/Users';
    }

    return process.env.HOME ?? '/home';
}
