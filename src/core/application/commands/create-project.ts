import type { CreateProjectInput, ProjectManager } from '../../../db/project-manager';
import type { ProjectRow } from '../../../db/types';

export interface CreateProjectCommand {
    execute: (input: CreateProjectInput) => ProjectRow;
}

export interface CreateProjectCommandDependencies {
    projectManager: ProjectManager;
}

export function createCreateProjectCommand(
    { projectManager }: CreateProjectCommandDependencies,
): CreateProjectCommand {
    return {
        execute: (input) => {
            // Prevent duplicate projects by name at the application layer.
            // If a project already exists with the same name, return it instead
            // of attempting a new insert. This avoids surfacing a DB unique
            // constraint error to the renderer and keeps behavior idempotent.
            const existing = projectManager.listProjects().find((p) => p.name === input.name);

            if (existing) {
                return existing;
            }

            return projectManager.createProject(input);
        },
    };
}
