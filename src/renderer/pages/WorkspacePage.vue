<template>
    <main class="px-3 py-3 md:px-4 md:py-4">
        <div
            class="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-3xl border border-(--app-border) bg-(--app-surface) shadow-(--app-shadow) md:grid-cols-[320px_minmax(0,1fr)]">
            <aside
                class="flex min-h-0 flex-col border-b border-(--app-border) bg-(--app-sidebar) p-4 md:border-b-0 md:border-r md:p-5">
                <div>
                    <p class="text-[11px] font-medium uppercase tracking-[0.18em] text-(--app-muted)">{{
                        t('app.workspace') }}</p>
                    <h1 class="mt-1 text-lg font-semibold tracking-tight">{{ t('app.projects') }}</h1>
                </div>

                <form
                    class="mt-4 rounded-xl border border-(--app-border) bg-(--app-elevated) p-4 shadow-(--app-shadow-sm)"
                    @submit.prevent="handleCreateProject">
                    <label class="block text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)"
                        for="project-name">
                        {{ t('project.new') }}
                    </label>
                    <input id="project-name" v-model="newProjectName" type="text"
                        class="mt-2 w-full rounded-md border border-(--app-border) bg-(--app-input) px-3 py-2 text-sm outline-none ring-(--app-accent) transition focus:ring-1"
                        :placeholder="t('project.name')" :disabled="isCreating">
                    <input v-model="newProjectRootPath" type="text"
                        class="mt-2 w-full rounded-md border border-(--app-border) bg-(--app-input) px-3 py-2 text-sm outline-none ring-(--app-accent) transition focus:ring-1"
                        :placeholder="t('project.rootPath')" :disabled="isCreating">
                    <button type="submit"
                        class="mt-3 w-full rounded-md border border-transparent bg-(--app-accent) px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        :disabled="isCreating || !canCreateProject">
                        {{ isCreating ? t('project.creating') : t('project.create') }}
                    </button>
                </form>

                <p v-if="errorMessage"
                    class="mt-3 rounded-md border border-(--status-deleted-border) bg-(--status-deleted-soft) px-3 py-2 text-sm text-(--status-deleted-text)">
                    {{ errorMessage }}
                </p>

                <div class="mt-4 min-h-0 flex-1 overflow-auto">
                    <p v-if="isLoading" class="text-sm text-(--app-muted)">{{ t('project.loading') }}</p>

                    <ul v-else-if="projects.length" class="space-y-1">
                        <li v-for="project in projects" :key="project.id">
                            <div class="flex items-center gap-2">
                                <button type="button"
                                    class="group flex flex-1 items-center gap-3 rounded-lg border px-3 py-2 text-left transition"
                                    :class="selectedProjectId === project.id
                                        ? 'border-(--app-accent) bg-(--app-elevated) text-(--app-text) shadow-[inset_0_0_0_1px_var(--app-accent)]'
                                        : 'border-transparent text-(--app-muted) hover:border-(--app-border) hover:bg-(--app-elevated)'
                                        " @click="selectProject(project.id)">
                                    <span class="h-2 w-2 rounded-full"
                                        :class="selectedProjectId === project.id ? 'bg-(--app-accent)' : 'bg-(--app-border)'" />
                                    <span class="truncate text-sm font-medium">{{ project.name }}</span>
                                </button>
                                <div class="flex gap-1">
                                    <button type="button" :title="t('actions.edit')"
                                        class="flex h-8 w-8 items-center justify-center rounded-md border border-(--app-border) bg-(--app-muted-surface) text-(--app-muted) transition hover:border-(--app-accent) hover:text-(--app-accent)"
                                        @click="openEditModalForProject(project)">
                                        <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M11.5 2.5a1.41 1.41 0 0 1 2 2L5 13H2v-3L11.5 2.5Z"/>
                                        </svg>
                                    </button>
                                    <button type="button" :title="t('actions.delete')"
                                        class="flex h-8 w-8 items-center justify-center rounded-md border border-(--app-border) bg-(--app-muted-surface) text-(--app-muted) transition hover:border-(--status-deleted-border) hover:text-(--status-deleted-text)"
                                        @click="handleDeleteProject(project)">
                                        <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="2 4 14 4"/><path d="M5 4V2h6v2"/><path d="M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </li>
                    </ul>

                    <p v-else
                        class="rounded-xl border border-dashed border-(--app-border) bg-(--app-elevated) px-3 py-5 text-sm text-(--app-muted)">
                        {{ t('project.empty') }}
                    </p>
                </div>
            </aside>

            <section class="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] bg-(--app-panel)">
                <header class="border-b border-(--app-border) px-4 py-3 md:px-7 md:py-4">
                    <p class="text-[11px] uppercase tracking-[0.18em] text-(--app-muted)">{{ t('comparison.section') }}
                    </p>
                    <h2 class="mt-1 text-lg font-semibold">{{ selectedProject?.name ?? t('project.selectProject') }}
                    </h2>
                </header>

                <div class="overflow-auto p-4 md:p-7">
                    <div v-if="selectedProject" class="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                        <article
                            class="rounded-2xl border border-(--app-border) bg-(--app-elevated) p-5 shadow-(--app-shadow-sm) md:p-6">
                            <div class="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">{{
                                        t('comparison.flow') }}</p>
                                    <h3 class="mt-1 text-base font-semibold text-(--app-text)">{{ t('comparison.title')
                                    }}</h3>
                                </div>

                                <span v-if="selectedProject"
                                    class="rounded-full border border-(--app-border) bg-(--app-muted-surface) px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-(--app-muted)">
                                    {{ t('project.idBadge', { id: selectedProject.id }) }}
                                </span>
                            </div>

                            <p class="mt-3 max-w-2xl text-sm text-(--app-muted)">
                                {{ t('comparison.description') }}
                            </p>

                            <form class="mt-5 space-y-4" @submit.prevent="handleCompareEnvironments">
                                <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-end">
                                    <label class="block">
                                        <span
                                            class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">{{
                                                t('comparison.source') }}</span>
                                        <input v-model="sourceEnvironmentName" type="text"
                                            class="mt-2 w-full rounded-lg border border-(--app-border) px-3 py-2.5 text-sm outline-none ring-(--app-accent) transition focus:ring-1"
                                            :placeholder="t('comparison.sourcePlaceholder')" :disabled="isComparing">
                                    </label>

                                    <button type="button"
                                        class="mx-auto h-10 w-10 rounded-full border border-(--app-border) bg-(--app-muted-surface) text-sm font-semibold text-(--app-muted) transition hover:border-(--app-accent) hover:text-(--app-accent) disabled:cursor-not-allowed disabled:opacity-60"
                                        :disabled="isComparing" @click="swapEnvironments"
                                        :aria-label="t('comparison.swap')">
                                        ⇄
                                    </button>

                                    <label class="block">
                                        <span
                                            class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">{{
                                                t('comparison.target') }}</span>
                                        <input v-model="targetEnvironmentName" type="text"
                                            class="mt-2 w-full rounded-lg border border-(--app-border) px-3 py-2.5 text-sm outline-none ring-(--app-accent) transition focus:ring-1"
                                            :placeholder="t('comparison.targetPlaceholder')" :disabled="isComparing">
                                    </label>
                                </div>

                                <div class="flex flex-wrap items-center gap-3">
                                    <button type="submit"
                                        class="rounded-lg bg-(--app-accent) px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                        :disabled="!canCompare || isComparing">
                                        {{ isComparing ? t('comparison.running') : t('comparison.run') }}
                                    </button>

                                    <p class="text-sm text-(--app-muted)">
                                        {{ comparisonHint }}
                                    </p>
                                </div>
                            </form>

                            <p v-if="comparisonError"
                                class="mt-4 rounded-lg border border-(--status-deleted-border) bg-(--status-deleted-soft) px-3 py-2 text-sm text-(--status-deleted-text)">
                                {{ comparisonError }}
                            </p>
                        </article>

                        <article
                            class="rounded-2xl border border-(--app-border) bg-(--app-elevated) p-5 shadow-(--app-shadow-sm) md:p-6">
                            <p class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">{{
                                t('project.details') }}</p>

                            <dl v-if="selectedProject" class="mt-4 space-y-3 text-sm">
                                <div
                                    class="flex items-start justify-between gap-4 border-b border-(--app-border-subtle) pb-2">
                                    <dt class="text-(--app-muted)">{{ t('project.nameLabel') }}</dt>
                                    <dd class="max-w-[60%] text-right font-medium">{{ selectedProject.name }}</dd>
                                </div>
                                <div
                                    class="flex items-start justify-between gap-4 border-b border-(--app-border-subtle) pb-2">
                                    <dt class="text-(--app-muted)">{{ t('project.rootPathLabel') }}</dt>
                                    <dd class="max-w-[60%] truncate text-right font-medium">{{ selectedProject.rootPath
                                        || t('project.notSet') }}</dd>
                                </div>
                                <div
                                    class="flex items-start justify-between gap-4 border-b border-(--app-border-subtle) pb-2">
                                    <dt class="text-(--app-muted)">{{ t('project.created') }}</dt>
                                    <dd class="font-medium">{{ selectedProject.createdAt }}</dd>
                                </div>
                                <div class="flex items-start justify-between gap-4">
                                    <dt class="text-(--app-muted)">{{ t('project.updated') }}</dt>
                                    <dd class="font-medium">{{ selectedProject.updatedAt }}</dd>
                                </div>
                            </dl>

                            <p v-else class="mt-4 text-sm text-(--app-muted)">
                                {{ t('project.selectProject') }}
                            </p>
                        </article>

                        <article v-if="selectedProject"
                            class="rounded-2xl border border-(--app-border) bg-(--app-elevated) p-5 shadow-(--app-shadow-sm) md:p-6">
                            <p class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">{{
                                t('project.environments') }}</p>

                            <div class="mt-4 space-y-3">
                                <form class="flex gap-2" @submit.prevent="handleCreateEnvironment">
                                    <input v-model="newEnvironmentName" type="text"
                                        class="min-w-0 flex-1 rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2 text-sm outline-none ring-(--app-accent) transition focus:ring-1"
                                        :placeholder="t('project.newEnvironmentPlaceholder')" />
                                    <button type="submit"
                                        class="shrink-0 rounded-lg bg-(--app-accent) px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90">{{ t('actions.add') }}</button>
                                </form>

                                <div v-if="loadingEnvironments" class="text-sm text-(--app-muted)">{{
                                    t('project.loadingEnvironments') }}</div>

                                <ul v-else-if="displayedEnvironments.length" class="space-y-1.5">
                                    <li v-for="env in displayedEnvironments" :key="env.id"
                                        class="rounded-xl border border-(--app-border) bg-(--app-muted-surface) p-3">
                                        <div class="flex min-w-0 items-center justify-between gap-2">
                                            <div class="min-w-0 truncate text-sm font-medium text-(--app-text)">{{ env.name }}</div>
                                            <div class="flex shrink-0 items-center gap-1.5">
                                                <button type="button"
                                                    class="rounded-md border border-(--app-border) bg-(--app-elevated) px-2.5 py-1 text-xs font-medium text-(--app-text) transition hover:border-(--app-accent) hover:text-(--app-accent)"
                                                    @click="openBindingModal(env)">{{ t('project.configure') }}</button>
                                                <button type="button"
                                                    class="rounded-md border border-(--app-border) bg-(--app-elevated) px-2.5 py-1 text-xs font-medium text-(--app-muted) transition hover:text-(--app-text)"
                                                    @click="openEditModalForEnvironment(env)">{{ t('actions.edit')
                                                    }}</button>
                                                <button type="button"
                                                    class="rounded-md border border-(--status-deleted-border) bg-(--status-deleted-bg) px-2.5 py-1 text-xs font-medium text-(--status-deleted-text) transition hover:opacity-80"
                                                    @click="handleDeleteEnvironment(env)">{{ t('actions.delete')
                                                    }}</button>
                                            </div>
                                        </div>
                                    </li>
                                </ul>

                                <p v-else class="text-sm text-(--app-muted)">{{ t('project.noEnvironmentsConfigured') }}
                                </p>
                            </div>
                        </article>
                    </div>

                    <div v-else
                        class="rounded-2xl border border-dashed border-(--app-border) bg-(--app-elevated) px-5 py-8 text-sm text-(--app-muted)">
                        {{ t('project.selectProject') }}
                    </div>

                    <article v-if="comparisonResults"
                        class="mt-4 rounded-2xl border border-(--app-border) bg-(--app-elevated) p-5 md:p-6">
                        <div
                            class="flex flex-wrap items-start justify-between gap-4 border-b border-(--app-border-subtle) pb-4">
                            <div>
                                <p class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">{{
                                    t('comparison.resultSummary') }}</p>
                                <h3 class="mt-1 text-base font-semibold text-(--app-text)">{{
                                    t('comparison.summaryTitle', {
                                        source:
                                            comparisonResults.summary.sourceSnapshot.environmentName, target:
                                            comparisonResults.summary.targetSnapshot.environmentName
                                    }) }}</h3>
                            </div>

                            <div class="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.11em]">
                                <span
                                    class="rounded-full border border-(--status-added-border) bg-(--status-added-bg) px-2 py-0.5 text-(--status-added-text)">{{
                                        t('diff.added', { count: comparisonResults.summary.comparisonStats.added })
                                    }}</span>
                                <span
                                    class="rounded-full border border-(--status-modified-border) bg-(--status-modified-bg) px-2 py-0.5 text-(--status-modified-text)">{{
                                        t('diff.modified', { count: comparisonResults.summary.comparisonStats.modified })
                                    }}</span>
                                <span
                                    class="rounded-full border border-(--status-deleted-border) bg-(--status-deleted-bg) px-2 py-0.5 text-(--status-deleted-text)">{{
                                        t('diff.deleted', { count: comparisonResults.summary.comparisonStats.deleted })
                                    }}</span>
                            </div>
                        </div>

                        <div class="mt-4 grid gap-4 lg:grid-cols-2">
                            <div class="rounded-xl border border-(--app-border-subtle) bg-(--app-muted-surface) p-4">
                                <p class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">{{
                                    t('comparison.sourceSnapshot') }}</p>
                                <h4 class="mt-1 text-base font-semibold">{{
                                    comparisonResults.summary.sourceSnapshot.environmentName }}</h4>
                                <dl class="mt-3 space-y-2 text-sm">
                                    <div class="flex items-center justify-between gap-4">
                                        <dt class="text-(--app-muted)">{{ t('comparison.files') }}</dt>
                                        <dd class="font-medium">{{ comparisonResults.summary.sourceSnapshot.fileCount }}
                                        </dd>
                                    </div>
                                    <div class="flex items-center justify-between gap-4">
                                        <dt class="text-(--app-muted)">{{ t('comparison.bytes') }}</dt>
                                        <dd class="font-medium">{{ comparisonResults.summary.sourceSnapshot.totalBytes
                                        }}</dd>
                                    </div>
                                    <div v-if="comparisonResults.summary.sourceSnapshot.label"
                                        class="flex items-center justify-between gap-4">
                                        <dt class="text-(--app-muted)">{{ t('comparison.label') }}</dt>
                                        <dd class="font-medium">{{ comparisonResults.summary.sourceSnapshot.label }}
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            <div class="rounded-xl border border-(--app-border-subtle) bg-(--app-muted-surface) p-4">
                                <p class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">{{
                                    t('comparison.targetSnapshot') }}</p>
                                <h4 class="mt-1 text-base font-semibold">{{
                                    comparisonResults.summary.targetSnapshot.environmentName }}</h4>
                                <dl class="mt-3 space-y-2 text-sm">
                                    <div class="flex items-center justify-between gap-4">
                                        <dt class="text-(--app-muted)">{{ t('comparison.files') }}</dt>
                                        <dd class="font-medium">{{ comparisonResults.summary.targetSnapshot.fileCount }}
                                        </dd>
                                    </div>
                                    <div class="flex items-center justify-between gap-4">
                                        <dt class="text-(--app-muted)">{{ t('comparison.bytes') }}</dt>
                                        <dd class="font-medium">{{ comparisonResults.summary.targetSnapshot.totalBytes
                                        }}</dd>
                                    </div>
                                    <div v-if="comparisonResults.summary.targetSnapshot.label"
                                        class="flex items-center justify-between gap-4">
                                        <dt class="text-(--app-muted)">{{ t('comparison.label') }}</dt>
                                        <dd class="font-medium">{{ comparisonResults.summary.targetSnapshot.label }}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </div>

                        <dl class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div class="rounded-xl border border-(--app-border-subtle) bg-(--app-muted-surface) p-4">
                                <dt class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">{{
                                    t('comparison.totalFiles') }}</dt>
                                <dd class="mt-1 truncate text-xl font-semibold text-(--app-text)">{{
                                    comparisonResults.summary.comparisonStats.total }}</dd>
                            </div>
                            <div class="rounded-xl border border-(--app-border-subtle) bg-(--app-muted-surface) p-4">
                                <dt class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">{{
                                    t('comparison.unchanged') }}</dt>
                                <dd class="mt-1 truncate text-xl font-semibold text-(--app-text)">{{
                                    comparisonResults.summary.comparisonStats.unchanged }}</dd>
                            </div>
                            <div class="rounded-xl border border-(--app-border-subtle) bg-(--app-muted-surface) p-4">
                                <dt class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">{{
                                    t('comparison.bytesChanged') }}</dt>
                                <dd class="mt-1 truncate text-xl font-semibold text-(--app-text)">{{ comparisonResults.summary.bytesChanged.total
                                }}</dd>
                            </div>
                            <div class="rounded-xl border border-(--app-border-subtle) bg-(--app-muted-surface) p-4">
                                <dt class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">{{
                                    t('comparison.modifiedBytes') }}</dt>
                                <dd class="mt-1 truncate text-xl font-semibold text-(--app-text)">{{
                                    comparisonResults.summary.bytesChanged.modified }}</dd>
                            </div>
                        </dl>
                    </article>

                    <EnvironmentDiffTree v-if="comparisonResults" class="mt-4" :result="comparisonResults"
                        :initially-expanded-depth="2" />

                    <article v-else
                        class="mt-4 rounded-2xl border border-dashed border-(--app-border) bg-(--app-elevated) px-5 py-8 text-sm text-(--app-muted)">
                        {{ t('comparison.empty') }}
                    </article>
                </div>
            </section>
        </div>
    </main>
    <EnvironmentBindingModal :visible="bindingModal.visible" :environment="bindingModal.environment" :servers="servers"
        :selectedServer="bindingModal.selectedServer" :remotePath="bindingModal.remotePath" @close="closeBindingModal"
        @save="onBindingSave" />

    <!-- Edit Modal for renaming projects/environments -->
    <div v-if="editModal.visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="editModal.visible = false">
        <div class="w-full max-w-md rounded-2xl border border-(--app-border) bg-(--app-elevated) p-6 shadow-(--app-shadow)">
            <h3 class="text-base font-semibold text-(--app-text)">{{ editModal.type === 'project' ? t('project.rename') :
                t('project.renameEnvironment') }}</h3>
            <input v-model="editModal.name" type="text"
                class="mt-4 w-full rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm text-(--app-text) outline-none ring-(--app-accent) transition focus:ring-1"
                @keyup.enter="saveEditModal" @keyup.escape="editModal.visible = false" />
            <div class="mt-5 flex justify-end gap-2">
                <button class="rounded-lg border border-(--app-border) bg-(--app-muted-surface) px-4 py-2 text-sm font-medium text-(--app-text) transition hover:bg-(--app-elevated)" @click="editModal.visible = false">{{
                    t('actions.cancel') }}</button>
                <button class="rounded-lg bg-(--app-accent) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90" @click="saveEditModal">{{
                    t('actions.save') }}</button>
            </div>
        </div>
    </div>

</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import EnvironmentBindingModal from '../components/EnvironmentBindingModal.vue';

import { useApi } from '../composables';
import { EnvironmentDiffTree } from '../components';
import { useProjectComparisonStore } from '../stores';
import type { GetAllProjectsResponseDto } from '../services';
import { formatUiErrorMessage } from '../i18n';

const { createProject, getProjects, compareEnvironments, listServers, listEnvironments, createEnvironment, assignEnvironmentBinding, listEnvironmentBindings, updateEnvironment, deleteEnvironment, updateProject, deleteProject } = useApi();
const projectStore = useProjectComparisonStore();
const { t, locale } = useI18n({ useScope: 'global' });

const isLoading = ref(false);
const isCreating = ref(false);
const isComparing = ref(false);
const errorMessage = ref('');
const comparisonError = ref('');
const newProjectName = ref('');
const newProjectRootPath = ref('');
const sourceEnvironmentName = ref('');
const targetEnvironmentName = ref('');
const environments = ref<any[]>([]);
const displayedEnvironments = computed(() => projectStore.getEnvironmentsForProject(selectedProjectId.value ?? -1));
const newEnvironmentName = ref('');
const servers = ref<any[]>([]);
const loadingEnvironments = ref(false);
const loadingServers = ref(false);
const bindingModal = ref({ visible: false, environment: null as any, selectedServer: null as number | null, remotePath: '' });

const projects = projectStore.projects;
const selectedProject = projectStore.selectedProject;
const selectedProjectId = projectStore.selectedProjectId;
const comparisonResults = projectStore.comparisonResults;
const canCreateProject = computed(() => newProjectName.value.trim().length > 0);
const canCompare = computed(() => (
    selectedProjectId.value !== null
    && sourceEnvironmentName.value.trim().length > 0
    && targetEnvironmentName.value.trim().length > 0
));
const comparisonHint = computed(() => {
    locale.value;

    if (!selectedProject.value) {
        return t('comparison.chooseProject');
    }

    if (!sourceEnvironmentName.value.trim() || !targetEnvironmentName.value.trim()) {
        return t('comparison.enterNames');
    }

    return t('comparison.projectScope', { project: selectedProject.value.name });
});

function syncProjects(nextProjects: GetAllProjectsResponseDto): void {
    projectStore.setProjects(nextProjects);

    if (nextProjects.length === 0) {
        projectStore.setSelectedProject(null);
        return;
    }

    if (!projectStore.selectedProject) {
        projectStore.setSelectedProject(nextProjects[0]);
    }
}

async function loadServers(): Promise<void> {
    loadingServers.value = true;
    try {
        servers.value = await listServers();
    } catch (err) {
        // ignore for now
    } finally {
        loadingServers.value = false;
    }
}

async function loadEnvironmentsForSelectedProject(): Promise<void> {
    const projectId = selectedProjectId.value;
    if (projectId === null) {
        environments.value = [];
        return;
    }

    loadingEnvironments.value = true;
    try {
        const envs = await listEnvironments(projectId);
        environments.value = envs.map((e) => ({ ...e, _selectedServer: null, _remotePath: '' }));
        // store into central project store so sidebar and other views stay in sync
        projectStore.setEnvironmentsForProject(projectId, environments.value);

        // Try to hydrate from any existing remote bindings (use first remote binding if present)
        for (const env of environments.value) {
            try {
                const bindings = await listEnvironmentBindings(env.id);
                const remote = bindings.find((b: any) => b.bindingType === 'remote');
                if (remote) {
                    env._selectedServer = remote.serverId ?? null;
                    env._remotePath = remote.remotePath ?? '';
                }
            } catch (err) {
                // ignore per-environment binding load failures
            }
        }
    } catch (err) {
        environments.value = [];
        projectStore.setEnvironmentsForProject(projectId, []);
    } finally {
        loadingEnvironments.value = false;
    }
}

async function handleCreateEnvironment(): Promise<void> {
    const name = newEnvironmentName.value.trim();
    const projectId = selectedProjectId.value;
    if (!name || projectId === null) return;

    try {
        await createEnvironment({ projectId, name });
        newEnvironmentName.value = '';
        await loadEnvironmentsForSelectedProject();
    } catch (_) {
        // ignore
    }
}

async function handleAssignBinding(envId: number, serverId: number | null, remotePath: string) {
    if (!serverId || !remotePath) return;

    try {
        await assignEnvironmentBinding({ environmentId: envId, bindingType: 'remote', serverId, remotePath });
        // reload bindings if needed
    } catch (_) {
        // ignore
    }
}

const editModal = ref({ visible: false, type: '' as 'project' | 'environment' | '', id: null as number | null, name: '' });

function openEditModalForEnvironment(env: any) {
    editModal.value = { visible: true, type: 'environment', id: env.id, name: env.name };
}

async function saveEditModal() {
    const { type, id, name } = editModal.value;
    if (!name || !id) {
        editModal.value.visible = false;
        return;
    }

    try {
        if (type === 'environment') {
            await updateEnvironment({ id, name: name.trim() });
            await loadEnvironmentsForSelectedProject();
        } else if (type === 'project') {
            await updateProject({ id, name: name.trim() });
            await loadProjects();
        }
    } catch (_) {
        // ignore
    } finally {
        editModal.value.visible = false;
    }
}

async function handleDeleteEnvironment(env: any) {
    const ok = await (window as any).api.showConfirm(t('project.deleteConfirm', { name: env.name }));
    if (!ok) return;

    try {
        await deleteEnvironment(env.id);
        await loadEnvironmentsForSelectedProject();
    } catch (_) {
        // ignore
    }
}

async function loadProjects(): Promise<void> {
    isLoading.value = true;
    errorMessage.value = '';

    try {
        const nextProjects = await getProjects();
        syncProjects(nextProjects);
    } catch (error) {
        errorMessage.value = formatUiErrorMessage(error, t);
    } finally {
        isLoading.value = false;
    }
}

function selectProject(projectId: number): void {
    projectStore.selectProjectById(projectId);
}

function openEditModalForProject(project: any) {
    editModal.value = { visible: true, type: 'project', id: project.id, name: project.name };
}

async function handleDeleteProject(project: any) {
    const ok = await (window as any).api.showConfirm(t('project.deleteConfirm', { name: project.name }));
    if (!ok) return;

    try {
        await deleteProject(project.id);
        await loadProjects();
    } catch (_) {
        // ignore
    }
}

function swapEnvironments(): void {
    const nextSource = sourceEnvironmentName.value;
    sourceEnvironmentName.value = targetEnvironmentName.value;
    targetEnvironmentName.value = nextSource;
}

async function handleCompareEnvironments(): Promise<void> {
    const projectId = selectedProjectId.value;
    const source = sourceEnvironmentName.value.trim();
    const target = targetEnvironmentName.value.trim();

    if (projectId === null || !source || !target) {
        return;
    }

    isComparing.value = true;
    comparisonError.value = '';

    try {
        const result = await compareEnvironments({
            projectId,
            sourceEnvironmentName: source,
            targetEnvironmentName: target,
        });

        projectStore.setComparisonResults(result);
    } catch (error) {
        comparisonError.value = formatUiErrorMessage(error, t);
    } finally {
        isComparing.value = false;
    }
}

async function handleCreateProject(): Promise<void> {
    const name = newProjectName.value.trim();

    if (!name) {
        return;
    }

    isCreating.value = true;
    errorMessage.value = '';

    try {
        const rootPath = newProjectRootPath.value.trim();
        const createdProject = await createProject({
            name,
            rootPath: rootPath || null,
        });

        // Reload projects from the DB to ensure the store reflects persisted
        // state and to avoid creating duplicates in-memory.
        await loadProjects();

        // Select the newly created project if present in the reloaded list.
        const found = projectStore.projects.find((p) => p.id === createdProject.id);
        if (found) {
            projectStore.setSelectedProject(found);
        } else {
            projectStore.setSelectedProject(createdProject);
        }

        newProjectName.value = '';
        newProjectRootPath.value = '';
    } catch (error) {
        errorMessage.value = formatUiErrorMessage(error, t);
    } finally {
        isCreating.value = false;
    }
}

onMounted(() => {
    void loadProjects();
    void loadServers();
});

function openBindingModal(env: any): void {
    bindingModal.value.environment = env;
    bindingModal.value.selectedServer = env._selectedServer ?? null;
    bindingModal.value.remotePath = env._remotePath ?? '';
    bindingModal.value.visible = true;
}

function closeBindingModal(): void {
    bindingModal.value.visible = false;
    bindingModal.value.environment = null;
}

async function onBindingSave(payload: { environmentId: number; serverId: number; remotePath: string }) {
    try {
        await assignEnvironmentBinding({ environmentId: payload.environmentId, bindingType: 'remote', serverId: payload.serverId, remotePath: payload.remotePath });
        // refresh list of environments to reflect saved binding
        await loadEnvironmentsForSelectedProject();
    } catch (_) {
        // ignore for now
    } finally {
        closeBindingModal();
    }
}

watch(selectedProjectId, () => {
    comparisonError.value = '';
    projectStore.clearComparisonResults();
    void loadEnvironmentsForSelectedProject();
});
</script>