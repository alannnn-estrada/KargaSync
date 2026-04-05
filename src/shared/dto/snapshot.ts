export interface CreateSnapshotFileRequestDTO {
    relativePath: string;
    contentHash: string;
    sizeBytes: number;
    modifiedAt?: string | null;
}

export interface CreateSnapshotRequestDTO {
    projectId: number;
    environmentId: number;
    label?: string | null;
    files: CreateSnapshotFileRequestDTO[];
}

export interface SnapshotDTO {
    id: number;
    projectId: number;
    environmentId: number;
    label: string | null;
    createdAt: string;
    fileCount: number;
    totalBytes: number;
}

export type CreateSnapshotResponseDTO = SnapshotDTO;
