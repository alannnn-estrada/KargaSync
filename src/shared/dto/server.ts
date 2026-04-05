export interface ServerDTO {
    id: number;
    name: string | null;
    host: string;
    port: number;
    username: string;
    authType: 'password' | 'key';
    protocol: 'ftp' | 'sftp';
    credentialRef: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateServerRequestDTO {
    name?: string | null;
    host: string;
    port: number;
    username: string;
    authType: 'password' | 'key';
    protocol?: 'ftp' | 'sftp';
    secret: string;
}

export interface UpdateServerRequestDTO {
    id: number;
    name?: string | null;
    host?: string;
    port?: number;
    username?: string;
    authType?: 'password' | 'key';
    protocol?: 'ftp' | 'sftp';
    secret?: string;
}

export type GetAllServersResponseDTO = ServerDTO[];
