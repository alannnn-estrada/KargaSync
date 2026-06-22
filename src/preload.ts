import { contextBridge, ipcRenderer, shell } from 'electron';

import { IPC_CHANNELS, LOCAL_FILE_CHANNELS, REMOTE_FILE_CHANNELS, DEPLOY_CHANNELS, UPDATE_CHANNELS, type RendererApi, type DeployProgressEvent, type UpdateAvailableEvent, type UpdateDownloadedEvent } from './shared/ipc/contracts';

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

    // Ignore patterns
    listIgnorePatterns: (projectId: number) => ipcRenderer.invoke(IPC_CHANNELS.ignorePatternsList, projectId),
    saveIgnorePatterns: (projectId: number, patterns: string[]) => ipcRenderer.invoke(IPC_CHANNELS.ignorePatternsSave, projectId, patterns),

    // Deploy
    deployBatch: (input) => ipcRenderer.invoke(IPC_CHANNELS.deployBatch, input),
    onDeployProgress: (callback) => {
        const handler = (_event: Electron.IpcRendererEvent, data: DeployProgressEvent) => callback(data);
        ipcRenderer.on(DEPLOY_CHANNELS.progress, handler);
        return () => ipcRenderer.removeListener(DEPLOY_CHANNELS.progress, handler);
    },

    // Versions
    listVersions: (serverId) => ipcRenderer.invoke(IPC_CHANNELS.versionsList, serverId),
    listVersionFiles: (versionId) => ipcRenderer.invoke(IPC_CHANNELS.versionsFilesList, versionId),
    startVersionSession: (input) => ipcRenderer.invoke(IPC_CHANNELS.versionsStart, input),
    backupFileForVersion: (input) => ipcRenderer.invoke(IPC_CHANNELS.versionsBackupFile, input),
    finishVersionSession: (versionId) => ipcRenderer.invoke(IPC_CHANNELS.versionsFinish, versionId),
    abortVersionSession: (versionId) => ipcRenderer.invoke(IPC_CHANNELS.versionsAbort, versionId),
    rollbackVersion: (versionId) => ipcRenderer.invoke(IPC_CHANNELS.versionsRollback, versionId),
    deleteVersion: (versionId) => ipcRenderer.invoke(IPC_CHANNELS.versionsDelete, versionId),
    chooseKeyFile: () => ipcRenderer.invoke(LOCAL_FILE_CHANNELS.chooseKeyFile),
    readFileDiff: (input) => ipcRenderer.invoke(IPC_CHANNELS.fileDiffRead, input),
    onUpdateAvailable: (callback) => {
        const handler = (_event: Electron.IpcRendererEvent, data: UpdateAvailableEvent) => callback(data);
        ipcRenderer.on(UPDATE_CHANNELS.available, handler);
        return () => ipcRenderer.removeListener(UPDATE_CHANNELS.available, handler);
    },
    onUpdateDownloaded: (callback) => {
        const handler = (_event: Electron.IpcRendererEvent, data: UpdateDownloadedEvent) => callback(data);
        ipcRenderer.on(UPDATE_CHANNELS.downloaded, handler);
        return () => ipcRenderer.removeListener(UPDATE_CHANNELS.downloaded, handler);
    },
    installUpdate: () => ipcRenderer.send(UPDATE_CHANNELS.install),
    openExternalUrl: (url: string) => {
        let parsed: URL;
        try { parsed = new URL(url); } catch { return Promise.resolve(); }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return Promise.resolve();
        return shell.openExternal(url);
    },
    openLocalFolder: (folderPath: string) => shell.openPath(folderPath),
};

contextBridge.exposeInMainWorld('api', Object.freeze(api));
contextBridge.exposeInMainWorld('platform', process.platform);

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
