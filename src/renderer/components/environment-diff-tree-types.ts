export type DiffFileStatus = 'added' | 'modified' | 'deleted';

export interface DiffTreeFileNode {
    key: string;
    type: 'file';
    name: string;
    path: string;
    status: DiffFileStatus;
}

export interface DiffTreeFolderNode {
    key: string;
    type: 'folder';
    name: string;
    path: string;
    children: DiffTreeNode[];
    counts: Record<DiffFileStatus, number>;
}

export type DiffTreeNode = DiffTreeFolderNode | DiffTreeFileNode;
