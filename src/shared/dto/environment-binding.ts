export interface EnvironmentBindingDTO {
    id: number;
    environmentId: number;
    bindingType: 'local' | 'remote';
    localPath: string | null;
    serverId: number | null;
    remotePath: string | null;
    environmentName: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AssignEnvironmentBindingRequestDTO {
    environmentId: number;
    bindingType: 'remote' | 'local';
    serverId?: number;
    remotePath?: string;
    localPath?: string;
    environmentName?: string | null;
}

export type GetEnvironmentBindingsResponseDTO = EnvironmentBindingDTO[];
