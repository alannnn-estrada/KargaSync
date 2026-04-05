import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import type {
    CompareEnvironmentsResponseDto,
    GetAllProjectsResponseDto,
} from '../services';

type ProjectItem = GetAllProjectsResponseDto[number];

export const useProjectComparisonStore = defineStore('project-comparison', () => {
    const projects = ref<GetAllProjectsResponseDto>([]);
    const selectedProject = ref<ProjectItem | null>(null);
    const comparisonResults = ref<CompareEnvironmentsResponseDto | null>(null);
    const environments = ref<Record<number, any[]>>({});

    const selectedProjectId = computed(() => selectedProject.value?.id ?? null);

    function setProjects(nextProjects: GetAllProjectsResponseDto) {
        projects.value = nextProjects;

        if (!selectedProject.value) {
            return;
        }

        const matchingProject = nextProjects.find((project) => project.id === selectedProject.value?.id);
        selectedProject.value = matchingProject ?? null;
    }

    function setSelectedProject(project: ProjectItem | null) {
        selectedProject.value = project;
    }

    function selectProjectById(projectId: number | null) {
        if (projectId === null) {
            selectedProject.value = null;
            return;
        }

        const matchingProject = projects.value.find((project) => project.id === projectId);
        selectedProject.value = matchingProject ?? null;
    }

    function setComparisonResults(results: CompareEnvironmentsResponseDto | null) {
        comparisonResults.value = results;
    }

    function setEnvironmentsForProject(projectId: number, nextEnvs: any[]) {
        environments.value = { ...environments.value, [projectId]: nextEnvs };
    }

    function getEnvironmentsForProject(projectId: number): any[] {
        return environments.value[projectId] ?? [];
    }

    function clearEnvironmentsForProject(projectId: number) {
        const copy = { ...environments.value };
        delete copy[projectId];
        environments.value = copy;
    }

    function clearComparisonResults() {
        comparisonResults.value = null;
    }

    function resetState() {
        projects.value = [];
        selectedProject.value = null;
        comparisonResults.value = null;
        environments.value = {};
    }

    return {
        projects,
        selectedProject,
        selectedProjectId,
        comparisonResults,
        environments,
        setProjects,
        setSelectedProject,
        selectProjectById,
        setComparisonResults,
        setEnvironmentsForProject,
        getEnvironmentsForProject,
        clearEnvironmentsForProject,
        clearComparisonResults,
        resetState,
    };
});
