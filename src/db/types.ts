export type EnvironmentName = string;

export type EnvironmentBindingType = 'local' | 'remote';

export type ConnectionAuthType = 'password' | 'key';

export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ProjectRow {
    id: number;
    name: string;
    rootPath: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ConnectionRow {
    id: number;
    name: string | null;
    host: string;
    port: number;
    username: string;
    authType: ConnectionAuthType;
    protocol: 'ftp' | 'sftp';
    credentialRef: string;
    createdAt: string;
    updatedAt: string;
}

export interface EnvironmentRow {
    id: number;
    projectId: number;
    name: EnvironmentName;
    createdAt: string;
    updatedAt: string;
}

export interface EnvironmentBindingRow {
    id: number;
    environmentId: number;
    bindingType: EnvironmentBindingType;
    localPath: string | null;
    serverId: number | null;
    remotePath: string | null;
    environmentName: string | null;
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

export interface CredentialVault {
    save: (credentialRef: string, secret: string) => Promise<void>;
    read: (credentialRef: string) => Promise<string | null>;
    delete: (credentialRef: string) => Promise<boolean>;
}

export type ConnectionId = ConnectionRow['id'] | string;

export interface ConnectionCredentialInput {
    secret?: string;
    password?: string;
    privateKey?: string;
}

export interface CredentialManager extends CredentialVault {
    saveCredential: (connectionId: ConnectionId, credential: string | ConnectionCredentialInput) => Promise<void>;
    getCredential: (connectionId: ConnectionId) => Promise<string | null>;
    deleteCredential: (connectionId: ConnectionId) => Promise<boolean>;
}
