export interface EnvironmentDTO {
    id: number;
    projectId: number;
    name: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateEnvironmentRequestDTO {
    projectId: number;
    name: string;
}

export type GetEnvironmentsResponseDTO = EnvironmentDTO[];

export interface UpdateEnvironmentRequestDTO {
    id: number;
    name?: string;
}
