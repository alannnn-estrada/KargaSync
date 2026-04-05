<template>
    <div class="app-shell min-h-screen text-(--app-text)" :class="{ 'is-collapsed': isSidebarCollapsed }"
        :style="layoutStyle">
        <aside
            class="relative border-b border-(--app-border) bg-(--app-sidebar) md:sticky md:top-0 md:min-h-screen md:border-b-0 md:border-r">
            <div class="flex h-full flex-col gap-5 p-4 md:p-5">
                <div>
                    <div class="flex items-start justify-between gap-3"
                        :class="isSidebarCollapsed ? 'md:flex-col md:items-center' : ''">
                        <div class="flex items-center gap-3" :class="isSidebarCollapsed ? 'md:flex-col' : ''">
                            <button type="button"
                                class="flex h-10 w-10 items-center justify-center rounded-xl border border-(--app-accent) bg-(--app-accent) text-white transition hover:opacity-90"
                                aria-label="Toggle app menu" @click="toggleAppMenu">
                                <img :src="logoImage" alt="KargaSync" class="h-6 w-6 object-contain" />
                            </button>

                            <div v-if="!isSidebarCollapsed">
                                <p class="text-[11px] font-medium uppercase tracking-[0.18em] text-(--app-muted)">{{
                                    t('app.title') }}</p>
                                <h1 class="mt-1 text-xl font-semibold tracking-tight">{{ t('app.brand') }}</h1>
                            </div>
                        </div>

                        <button type="button"
                            class="hidden h-9 w-9 items-center justify-center rounded-lg border border-(--app-border) bg-(--app-elevated) text-(--app-muted) transition hover:text-(--app-text) md:inline-flex"
                            :title="isSidebarCollapsed ? t('app.expandSidebar') : t('app.collapseSidebar')"
                            @click="toggleSidebar">
                            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path v-if="isSidebarCollapsed" d="M7 4l6 6-6 6" />
                                <path v-else d="M13 4l-6 6 6 6" />
                            </svg>
                        </button>
                    </div>

                    <p v-if="!isSidebarCollapsed" class="mt-2 text-sm leading-6 text-(--app-muted)">{{ t('app.subtitle')
                    }}</p>
                </div>

                <nav class="space-y-2" :class="isSidebarCollapsed ? 'md:space-y-1.5' : ''">
                    <RouterLink v-for="item in navigation" :key="item.to" :to="item.to"
                        :title="isSidebarCollapsed ? item.label : ''" :aria-label="item.label"
                        class="group flex items-center gap-3 rounded-xl border text-sm font-medium transition" :class="[
                            isSidebarCollapsed ? 'justify-center px-2.5 py-2.5 md:mx-auto md:w-11' : 'px-4 py-3',
                            route.path === item.to
                                ? 'border-(--app-accent) bg-(--app-elevated) text-(--app-text) shadow-(--app-shadow-sm)'
                                : 'border-transparent bg-transparent text-(--app-muted) hover:border-(--app-border) hover:bg-(--app-elevated) hover:text-(--app-text)',
                        ]">
                        <span class="flex h-8 w-8 items-center justify-center rounded-lg border" :class="route.path === item.to
                            ? 'border-(--app-accent) bg-(--app-accent) text-white'
                            : 'border-(--app-border) bg-(--app-muted-surface) text-(--app-muted)'">
                            <svg v-if="item.icon === 'workspace'" class="h-4 w-4" viewBox="0 0 20 20" fill="none"
                                stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                                aria-hidden="true">
                                <rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1" />
                                <rect x="11" y="3.5" width="5.5" height="5.5" rx="1" />
                                <rect x="3.5" y="11" width="5.5" height="5.5" rx="1" />
                                <rect x="11" y="11" width="5.5" height="5.5" rx="1" />
                            </svg>

                            <svg v-else-if="item.icon === 'servers'" class="h-4 w-4" viewBox="0 0 20 20" fill="none"
                                stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                                aria-hidden="true">
                                <rect x="3" y="4" width="14" height="4.5" rx="1.2" />
                                <rect x="3" y="11.5" width="14" height="4.5" rx="1.2" />
                                <circle cx="6" cy="6.2" r="0.8" fill="currentColor" stroke="none" />
                                <circle cx="6" cy="13.7" r="0.8" fill="currentColor" stroke="none" />
                            </svg>

                            <svg v-else-if="item.icon === 'explorer'" class="h-4 w-4" viewBox="0 0 20 20" fill="none"
                                stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                                aria-hidden="true">
                                <path d="M3.5 6.5h5l1.2 1.6H16a1 1 0 0 1 1 1v6.4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7.5a1 1 0 0 1 .5-1Z" />
                            </svg>

                            <svg v-else class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <circle cx="10" cy="10" r="2.3" />
                                <path
                                    d="M16.2 10a6.2 6.2 0 0 0-.08-.93l1.76-1.37-1.5-2.6-2.14.67a6 6 0 0 0-1.6-.93L12.2 2.6H9.2l-.45 2.24c-.56.2-1.09.5-1.57.87L5.04 5 3.5 7.62l1.76 1.34a6.6 6.6 0 0 0 0 2.03L3.5 12.38 5.04 15l2.14-.7c.48.38 1.01.68 1.57.88l.45 2.22h3l.45-2.22c.56-.2 1.09-.5 1.57-.88l2.14.7 1.54-2.62-1.76-1.39c.05-.33.08-.66.08-.99Z" />
                            </svg>
                        </span>

                        <span v-if="!isSidebarCollapsed">{{ item.label }}</span>
                    </RouterLink>

                    <button type="button" :title="isSidebarCollapsed ? t('changelog.menuLabel') : ''"
                        :aria-label="t('changelog.menuLabel')"
                        class="group relative flex w-full items-center gap-3 rounded-xl border text-sm font-medium transition"
                        :class="[
                            isSidebarCollapsed ? 'justify-center px-2.5 py-2.5 md:mx-auto md:w-11' : 'px-4 py-3',
                            changelogStore.isModalOpen
                                ? 'border-(--app-accent) bg-(--app-elevated) text-(--app-text) shadow-(--app-shadow-sm)'
                                : 'border-transparent bg-transparent text-(--app-muted) hover:border-(--app-border) hover:bg-(--app-elevated) hover:text-(--app-text)',
                        ]" @click="openChangelog">
                        <span class="flex h-8 w-8 items-center justify-center rounded-lg border" :class="changelogStore.isModalOpen
                            ? 'border-(--app-accent) bg-(--app-accent) text-white'
                            : 'border-(--app-border) bg-(--app-muted-surface) text-(--app-muted)'">
                            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M4 4.5h12" />
                                <path d="M4 8.5h12" />
                                <path d="M4 12.5h8" />
                                <path d="M4 16.5h6" />
                            </svg>
                        </span>

                        <span v-if="!isSidebarCollapsed">{{ t('changelog.menuLabel') }}</span>

                        <span v-if="changelogStore.hasUnreadLatest"
                            class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-(--status-added-border) bg-(--status-added-bg) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-(--status-added-text)">
                            {{ t('changelog.newBadge') }}
                        </span>
                    </button>
                </nav>

                <div v-if="!isSidebarCollapsed" class="mt-3">
                    <p class="text-[11px] font-medium uppercase tracking-[0.14em] text-(--app-muted)">{{ t('app.projects') }}</p>
                    <div class="mt-2 space-y-2">
                        <div v-for="project in projectStore.projects" :key="project.id" class="rounded-lg border border-(--app-border) bg-(--app-elevated) p-2">
                            <div class="flex items-center justify-between">
                                <button type="button" class="text-sm font-medium text-(--app-text) truncate text-left" @click="toggleProject(project.id)">{{ project.name }}</button>
                                <div class="flex items-center gap-2">
                                    <button type="button" title="Toggle" class="h-7 w-7 rounded-md border border-(--app-border) bg-transparent" @click="toggleProject(project.id)">
                                        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path v-if="sidebar.isProjectExpanded(project.id)" d="M6 10h8" /><path v-else d="M10 6v8" /></svg>
                                    </button>
                                </div>
                            </div>

                            <div v-if="sidebar.isProjectExpanded(project.id)" class="mt-2 space-y-2">
                                <div v-if="projectStore.getEnvironmentsForProject(project.id).length > 0" class="space-y-1">
                                    <div v-for="env in projectStore.getEnvironmentsForProject(project.id)" :key="env.id" class="flex items-center justify-between text-sm text-(--app-muted)">
                                        <div>{{ env.name }}</div>
                                        <div class="flex items-center gap-2">
                                            <button type="button" class="text-xs rounded px-2 py-1 border" @click="selectProjectAndView(project, '/workspace')">{{ t('actions.open') }}</button>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="text-xs text-(--app-muted)">{{ t('project.noEnvironments') }}</div>

                                <div class="mt-2 flex gap-2">
                                    <button type="button" class="text-xs rounded px-2 py-1 border" @click="onQuickCompare(project)">{{ t('actions.compare') }}</button>
                                    <button type="button" class="text-xs rounded px-2 py-1 border" @click="onCreateSnapshot(project)">{{ t('actions.snapshot') }}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="!isSidebarCollapsed"
                    class="mt-auto rounded-2xl border border-(--app-border) bg-(--app-elevated) p-3 shadow-(--app-shadow-sm)">
                    <p class="text-[11px] font-medium uppercase tracking-[0.14em] text-(--app-muted)">{{
                        t('settings.section') }}</p>
                    <p class="mt-1 text-xs leading-5 text-(--app-muted)">{{ t('app.sidebarHint') }}</p>
                </div>
            </div>

            <button v-if="!isSidebarCollapsed" type="button"
                class="absolute -right-1.5 top-0 hidden h-full w-3 cursor-col-resize border-l border-r border-transparent bg-transparent transition hover:border-(--app-border) md:block"
                :title="t('app.resizeSidebar')" @mousedown="beginResize" />
        </aside>

        <main class="min-w-0 bg-(--app-panel)">
            <RouterView />
        </main>

        <ChangelogModal />
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import logoImage from './assets/logo.png';
import { ChangelogModal } from './renderer/components';
import { useChangelogStore } from './renderer/stores/changelog-store';
import { useProjectComparisonStore, useSidebarStore } from './renderer/stores';
import { listEnvironments } from './renderer/services/api';

const route = useRoute();
const { t } = useI18n({ useScope: 'global' });

const SIDEBAR_MIN_WIDTH = 240;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 288;
const SIDEBAR_COLLAPSED_WIDTH = 84;
const SIDEBAR_STORAGE_KEY = 'karga-sync.ui.sidebar';

const isSidebarCollapsed = ref(false);
const sidebarWidth = ref(SIDEBAR_DEFAULT_WIDTH);
const isResizing = ref(false);
const changelogStore = useChangelogStore();
const projectStore = useProjectComparisonStore();
const sidebar = useSidebarStore();
const router = useRouter();

// environments are stored in the project store so multiple views stay in sync

async function loadEnvsFor(projectId: number) {
    // avoid double-loading when already present in the central store
    if (projectStore.environments && Object.prototype.hasOwnProperty.call(projectStore.environments, projectId)) return;

    try {
        const results = await listEnvironments(projectId);
        projectStore.setEnvironmentsForProject(projectId, results);
    } catch {
        projectStore.setEnvironmentsForProject(projectId, []);
    }
}

function toggleProject(projectId: number) {
    sidebar.toggleProjectExpanded(projectId);
    if (sidebar.isProjectExpanded(projectId)) {
        void loadEnvsFor(projectId);
    }
}

function selectProjectAndView(project: any, view: string) {
    projectStore.setSelectedProject(project);
    sidebar.setLastSelectedProjectId(project?.id ?? null);
    sidebar.setLastView(view);
    void router.push(view);
}

function onQuickCompare(project: any) {
    projectStore.setSelectedProject(project);
    sidebar.setLastSelectedProjectId(project?.id ?? null);
    sidebar.setLastView('/workspace');
    void router.push('/workspace');
}

function onCreateSnapshot(project: any) {
    // placeholder quick action: navigate to workspace and leave UI to handle
    projectStore.setSelectedProject(project);
    sidebar.setLastSelectedProjectId(project?.id ?? null);
    void router.push('/workspace');
}

const navigation = computed(() => [
    { to: '/workspace', label: t('app.workspace'), icon: 'workspace' as const },
    { to: '/servers', label: t('servers.section'), icon: 'servers' as const },
    { to: '/explorer', label: t('servers.explorerMenu'), icon: 'explorer' as const },
    { to: '/settings', label: t('settings.section'), icon: 'settings' as const },
]);

const layoutStyle = computed(() => ({
    '--sidebar-width': `${isSidebarCollapsed.value ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth.value}px`,
}));

function clampSidebarWidth(value: number): number {
    return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, value));
}

function loadSidebarState(): void {
    if (typeof window === 'undefined') {
        return;
    }

    const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);

    if (!raw) {
        return;
    }

    try {
        const parsed = JSON.parse(raw) as { collapsed?: boolean; width?: number };

        if (typeof parsed.collapsed === 'boolean') {
            isSidebarCollapsed.value = parsed.collapsed;
        }

        if (typeof parsed.width === 'number') {
            sidebarWidth.value = clampSidebarWidth(parsed.width);
        }
    } catch {
        // Ignore malformed sidebar cache values.
    }
}

function saveSidebarState(): void {
    if (typeof window === 'undefined') {
        return;
    }

    const payload = {
        collapsed: isSidebarCollapsed.value,
        width: sidebarWidth.value,
    };

    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(payload));
}

function toggleSidebar(): void {
    isSidebarCollapsed.value = !isSidebarCollapsed.value;
}

function toggleAppMenu(event: MouseEvent): void {
    if (typeof window === 'undefined' || !window.api?.toggleAppMenu) {
        return;
    }

    const target = event.currentTarget;

    if (!(target instanceof HTMLElement)) {
        return;
    }

    const bounds = target.getBoundingClientRect();

    void window.api.toggleAppMenu({
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height,
    });
}

function openChangelog(): void {
    changelogStore.openModal();
}

function onResizeMove(event: MouseEvent): void {
    if (!isResizing.value || isSidebarCollapsed.value) {
        return;
    }

    sidebarWidth.value = clampSidebarWidth(event.clientX);
}

function stopResize(): void {
    if (!isResizing.value) {
        return;
    }

    isResizing.value = false;
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', stopResize);
    saveSidebarState();
}

function beginResize(event: MouseEvent): void {
    if (isSidebarCollapsed.value) {
        return;
    }

    event.preventDefault();
    isResizing.value = true;
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', stopResize);
}

onMounted(() => {
    loadSidebarState();
    void changelogStore.initialize();
    // restore sidebar UI (expanded projects, last selected project)
    sidebar.load();
    // restore last view when available
    if (sidebar.lastView) {
        void router.replace(sidebar.lastView);
    }
});

onBeforeUnmount(() => {
    stopResize();
});

watch([isSidebarCollapsed, sidebarWidth], () => {
    saveSidebarState();
});

watch(
    () => route.path,
    (next) => {
        sidebar.setLastView(next);
    },
);
</script>