import type { ProjectManager } from '../../../db/project-manager';
import type { ProjectRow } from '../../../db/types';

export interface GetAllProjectsQuery {
    execute: () => ProjectRow[];
}

export interface GetAllProjectsQueryDependencies {
    projectManager: ProjectManager;
}

export function createGetAllProjectsQuery(
    { projectManager }: GetAllProjectsQueryDependencies,
): GetAllProjectsQuery {
    return {
        execute: () => projectManager.listProjects(),
    };
}
