export interface ProjectDTO {
    id: number;
    name: string;
    rootPath: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateProjectRequestDTO {
    name: string;
    rootPath?: string | null;
}

export type GetAllProjectsResponseDTO = ProjectDTO[];
export type CreateProjectResponseDTO = ProjectDTO;
