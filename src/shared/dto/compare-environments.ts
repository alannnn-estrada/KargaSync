export interface CompareEnvironmentsRequestDTO {
    projectId: number;
    sourceEnvironmentId?: number;
    sourceEnvironmentName?: string;
    sourceSnapshotId?: number;
    targetEnvironmentId?: number;
    targetEnvironmentName?: string;
    targetSnapshotId?: number;
}

export interface CompareEnvironmentsFileSideDTO {
    contentHash: string;
    sizeBytes: number;
}

export interface CompareEnvironmentsFileDiffDTO {
    relativePath: string;
    status: 'added' | 'deleted' | 'modified' | 'unchanged';
    source?: CompareEnvironmentsFileSideDTO;
    target?: CompareEnvironmentsFileSideDTO;
}

export interface CompareEnvironmentsSnapshotSummaryDTO {
    environmentId: number;
    environmentName: string;
    label: string | null;
    fileCount: number;
    totalBytes: number;
}

export interface CompareEnvironmentsStatsDTO {
    added: number;
    deleted: number;
    modified: number;
    unchanged: number;
    total: number;
}

export interface CompareEnvironmentsBytesChangedDTO {
    added: number;
    deleted: number;
    modified: number;
    total: number;
}

export interface CompareEnvironmentsSummaryDTO {
    sourceSnapshot: CompareEnvironmentsSnapshotSummaryDTO;
    targetSnapshot: CompareEnvironmentsSnapshotSummaryDTO;
    comparisonStats: CompareEnvironmentsStatsDTO;
    bytesChanged: CompareEnvironmentsBytesChangedDTO;
}

export interface CompareEnvironmentsDTO {
    summary: CompareEnvironmentsSummaryDTO;
    files: CompareEnvironmentsFileDiffDTO[];
}

export type CompareEnvironmentsResponseDTO = CompareEnvironmentsDTO;
