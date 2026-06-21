<template>
    <div class="app-shell min-h-screen text-(--app-text)" :class="{ 'is-collapsed': isSidebarCollapsed }"
        :style="layoutStyle">
        <aside
            class="relative flex flex-col border-b border-(--app-border) bg-(--app-sidebar) md:sticky md:top-0 md:min-h-screen md:border-b-0 md:border-r"
            :class="isSidebarCollapsed ? 'md:w-[5.25rem]' : ''">
            <div class="flex h-full flex-col gap-3 p-3"
                :class="isSidebarCollapsed ? 'md:items-center' : ''">

                <!-- Header: logo + brand + controls -->
                <div :class="isSidebarCollapsed ? 'flex flex-col items-center gap-2 w-full' : ''">
                    <!-- Expanded -->
                    <div v-if="!isSidebarCollapsed" class="flex items-center justify-between gap-2">
                        <div class="flex min-w-0 items-center gap-2.5">
                            <button type="button"
                                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-(--app-accent) bg-(--app-accent) text-white transition hover:opacity-90"
                                aria-label="Toggle app menu" @click="toggleAppMenu">
                                <img :src="logoImage" alt="KargaSync" class="h-5 w-5 object-contain" />
                            </button>
                            <h1 class="truncate text-sm font-semibold tracking-tight text-(--app-text)">{{ t('app.brand') }}</h1>
                        </div>
                        <div class="hidden shrink-0 items-center gap-1 md:flex">
                            <button type="button"
                                class="inline-flex h-7 w-7 items-center justify-center rounded border border-(--app-border) bg-(--app-elevated) text-(--app-muted) transition hover:border-(--app-accent) hover:text-(--app-accent)"
                                :title="themeLabel + ' — cycle theme'" @click="cycleTheme">
                                <span class="text-xs leading-none">{{ themeLabel }}</span>
                            </button>
                            <button type="button"
                                class="inline-flex h-7 w-7 items-center justify-center rounded border border-(--app-border) bg-(--app-elevated) text-(--app-muted) transition hover:text-(--app-text)"
                                :title="t('app.collapseSidebar')" @click="toggleSidebar">
                                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M13 4l-6 6 6 6" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Collapsed -->
                    <template v-if="isSidebarCollapsed">
                        <button type="button"
                            class="flex h-8 w-8 items-center justify-center rounded-lg border border-(--app-accent) bg-(--app-accent) text-white transition hover:opacity-90"
                            aria-label="Toggle app menu" @click="toggleAppMenu">
                            <img :src="logoImage" alt="KargaSync" class="h-5 w-5 object-contain" />
                        </button>
                        <button type="button"
                            class="hidden h-7 w-7 items-center justify-center rounded border border-(--app-border) bg-(--app-elevated) text-(--app-muted) transition hover:text-(--app-text) md:inline-flex"
                            :title="t('app.expandSidebar')" @click="toggleSidebar">
                            <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M7 4l6 6-6 6" />
                            </svg>
                        </button>
                    </template>
                </div>

                <!-- Separator -->
                <div class="h-px w-full bg-(--app-border)" />

                <!-- Nav links -->
                <nav class="w-full space-y-0.5">
                    <RouterLink v-for="item in navigation" :key="item.to" :to="item.to"
                        :title="isSidebarCollapsed ? item.label : ''"
                        :aria-label="item.label"
                        class="flex w-full items-center rounded-md text-xs font-medium transition"
                        :class="[
                            isSidebarCollapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-2',
                            route.path === item.to
                                ? 'bg-(--app-elevated) text-(--app-text)'
                                : 'text-(--app-muted) hover:bg-(--app-elevated) hover:text-(--app-text)',
                        ]">
                        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                            :class="route.path === item.to
                                ? 'bg-(--app-accent) text-white'
                                : 'text-(--app-muted)'">
                            <svg v-if="item.icon === 'workspace'" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1" />
                                <rect x="11" y="3.5" width="5.5" height="5.5" rx="1" />
                                <rect x="3.5" y="11" width="5.5" height="5.5" rx="1" />
                                <rect x="11" y="11" width="5.5" height="5.5" rx="1" />
                            </svg>
                            <svg v-else-if="item.icon === 'servers'" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="4" width="14" height="4.5" rx="1.2" />
                                <rect x="3" y="11.5" width="14" height="4.5" rx="1.2" />
                                <circle cx="6" cy="6.2" r="0.8" fill="currentColor" stroke="none" />
                                <circle cx="6" cy="13.7" r="0.8" fill="currentColor" stroke="none" />
                            </svg>
                            <svg v-else-if="item.icon === 'explorer'" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3.5 6.5h5l1.2 1.6H16a1 1 0 0 1 1 1v6.4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7.5a1 1 0 0 1 .5-1Z" />
                            </svg>
                            <svg v-else class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="10" cy="10" r="2.3" />
                                <path d="M16.2 10a6.2 6.2 0 0 0-.08-.93l1.76-1.37-1.5-2.6-2.14.67a6 6 0 0 0-1.6-.93L12.2 2.6H9.2l-.45 2.24c-.56.2-1.09.5-1.57.87L5.04 5 3.5 7.62l1.76 1.34a6.6 6.6 0 0 0 0 2.03L3.5 12.38 5.04 15l2.14-.7c.48.38 1.01.68 1.57.88l.45 2.22h3l.45-2.22c.56-.2 1.09-.5 1.57-.88l2.14.7 1.54-2.62-1.76-1.39c.05-.33.08-.66.08-.99Z" />
                            </svg>
                        </span>
                        <span v-if="!isSidebarCollapsed" class="min-w-0 truncate uppercase tracking-[0.1em]">{{ item.label }}</span>
                    </RouterLink>

                    <!-- Changelog button -->
                    <button type="button"
                        :title="isSidebarCollapsed ? t('changelog.menuLabel') : ''"
                        :aria-label="t('changelog.menuLabel')"
                        class="relative flex w-full items-center rounded-md text-xs font-medium transition"
                        :class="[
                            isSidebarCollapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-2',
                            changelogStore.isModalOpen
                                ? 'bg-(--app-elevated) text-(--app-text)'
                                : 'text-(--app-muted) hover:bg-(--app-elevated) hover:text-(--app-text)',
                        ]"
                        @click="openChangelog">
                        <span class="relative flex h-6 w-6 shrink-0 items-center justify-center rounded"
                            :class="changelogStore.isModalOpen ? 'bg-(--app-accent) text-white' : 'text-(--app-muted)'">
                            <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4 4.5h12" /><path d="M4 8.5h12" /><path d="M4 12.5h8" /><path d="M4 16.5h6" />
                            </svg>
                            <span v-if="changelogStore.hasUnreadLatest && isSidebarCollapsed"
                                class="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-(--status-added-text)" />
                        </span>
                        <span v-if="!isSidebarCollapsed" class="min-w-0 flex-1 truncate text-left uppercase tracking-[0.1em]">{{ t('changelog.menuLabel') }}</span>
                        <span v-if="changelogStore.hasUnreadLatest && !isSidebarCollapsed"
                            class="ml-auto shrink-0 rounded-full border border-(--status-added-border) bg-(--status-added-bg) px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-(--status-added-text)">
                            {{ t('changelog.newBadge') }}
                        </span>
                    </button>
                </nav>

                <!-- Separator -->
                <div v-if="!isSidebarCollapsed" class="h-px w-full bg-(--app-border)" />

                <!-- Projects list (expanded only) -->
                <div v-if="!isSidebarCollapsed" class="min-w-0 flex-1 overflow-auto">
                    <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-(--app-muted)">{{ t('app.projects') }}</p>
                    <div class="mt-1.5 space-y-1">
                        <div v-for="project in projectStore.projects" :key="project.id" class="min-w-0 rounded border border-(--app-border) bg-(--app-elevated)">
                            <div class="flex min-w-0 items-center gap-1.5 px-2 py-1.5">
                                <button type="button" class="min-w-0 flex-1 truncate text-left text-xs font-medium text-(--app-text)" @click="toggleProject(project.id)">{{ project.name }}</button>
                                <button type="button" :title="t('actions.expandFolder')" class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-(--app-muted) transition hover:text-(--app-text)" @click="toggleProject(project.id)">
                                    <svg class="h-3 w-3 transform transition-transform" :class="sidebar.isProjectExpanded(project.id) ? 'rotate-90' : ''" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/></svg>
                                </button>
                            </div>

                            <div v-if="sidebar.isProjectExpanded(project.id)" class="border-t border-(--app-border) px-2 py-1.5 space-y-1">
                                <div v-if="projectStore.getEnvironmentsForProject(project.id).length > 0" class="space-y-0.5">
                                    <div v-for="env in projectStore.getEnvironmentsForProject(project.id)" :key="env.id" class="flex min-w-0 items-center justify-between gap-1">
                                        <span class="min-w-0 truncate text-xs text-(--app-muted)">{{ env.name }}</span>
                                        <button type="button" class="shrink-0 rounded border border-(--app-border) px-1.5 py-0.5 text-[10px] text-(--app-muted) transition hover:border-(--app-accent) hover:text-(--app-accent)" @click="selectProjectAndView(project, '/workspace')">{{ t('actions.open') }}</button>
                                    </div>
                                </div>
                                <p v-else class="text-xs text-(--app-muted)">{{ t('project.noEnvironments') }}</p>

                                <div class="flex gap-1 pt-0.5">
                                    <button type="button"
                                        :title="t('actions.compare')"
                                        class="flex flex-1 items-center justify-center gap-1 rounded border border-(--app-border) bg-(--app-muted-surface) px-1.5 py-1 text-[10px] font-medium text-(--app-muted) transition hover:border-(--app-accent) hover:text-(--app-accent)"
                                        @click="onQuickCompare(project)">
                                        <svg class="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                            <rect x="1" y="3" width="6" height="10" rx="1"/><rect x="9" y="3" width="6" height="10" rx="1"/>
                                            <path d="M7 8h2"/>
                                        </svg>
                                        <span v-if="sidebarWidth > 260" class="truncate">{{ t('actions.compare') }}</span>
                                    </button>
                                    <button type="button"
                                        :title="t('actions.snapshot')"
                                        class="flex flex-1 items-center justify-center gap-1 rounded border border-(--app-border) bg-(--app-muted-surface) px-1.5 py-1 text-[10px] font-medium text-(--app-muted) transition hover:border-(--app-accent) hover:text-(--app-accent)"
                                        @click="onCreateSnapshot(project)">
                                        <svg class="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M13 5.5H11l-1.5-2h-3L5 5.5H3a1 1 0 0 0-1 1V12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1Z"/>
                                            <circle cx="8" cy="9" r="2"/>
                                        </svg>
                                        <span v-if="sidebarWidth > 260" class="truncate">{{ t('actions.snapshot') }}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bottom: theme + shortcuts -->
                <div class="mt-auto flex gap-1" :class="isSidebarCollapsed ? 'flex-col' : 'border-t border-(--app-border) pt-3'">
                    <button type="button"
                        class="flex shrink-0 items-center justify-center rounded border border-(--app-border) bg-(--app-elevated) text-(--app-muted) transition hover:border-(--app-accent) hover:text-(--app-accent)"
                        :class="isSidebarCollapsed ? 'h-7 w-7' : 'h-7 flex-1 gap-2 px-2 text-xs'"
                        :title="themeLabel + ' — cycle theme'" @click="cycleTheme">
                        <span class="text-xs leading-none">{{ themeLabel }}</span>
                        <span v-if="!isSidebarCollapsed" class="uppercase tracking-[0.1em] text-[10px] font-semibold">{{ settingsStore.theme }}</span>
                    </button>
                    <button type="button"
                        class="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-(--app-border) bg-(--app-elevated) text-(--app-muted) transition hover:border-(--app-accent) hover:text-(--app-accent)"
                        :title="t('shortcuts.title') + ' (?)'" @click="shortcutsOpen = true">
                        <span class="text-[10px] font-bold leading-none">?</span>
                    </button>
                </div>
            </div>

            <!-- Resize handle (expanded only) -->
            <button v-if="!isSidebarCollapsed" type="button"
                class="absolute -right-1 top-0 hidden h-full w-2 cursor-col-resize bg-transparent transition hover:bg-(--app-accent)/20 md:block"
                :title="t('app.resizeSidebar')" @mousedown="beginResize" />
        </aside>

        <main class="min-w-0 bg-(--app-panel)">
            <RouterView />
        </main>

        <ChangelogModal />
        <KeyboardShortcutsModal :visible="shortcutsOpen" @close="shortcutsOpen = false" />
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import logoImage from './assets/logo.png';
import { ChangelogModal, KeyboardShortcutsModal } from './renderer/components';
import { useChangelogStore } from './renderer/stores/changelog-store';
import { useProjectComparisonStore, useSidebarStore, useSettingsStore } from './renderer/stores';
import { listEnvironments } from './renderer/services/api';

const route = useRoute();
const { t } = useI18n({ useScope: 'global' });

const SIDEBAR_MIN_WIDTH = 240;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 288;
const SIDEBAR_COLLAPSED_WIDTH = 84;
const SIDEBAR_STORAGE_KEY = 'karga-sync.ui.sidebar';

const isSidebarCollapsed = ref(false);
const shortcutsOpen = ref(false);
const sidebarWidth = ref(SIDEBAR_DEFAULT_WIDTH);
const isResizing = ref(false);
const changelogStore = useChangelogStore();
const projectStore = useProjectComparisonStore();
const sidebar = useSidebarStore();
const settingsStore = useSettingsStore();
const router = useRouter();

function cycleTheme(): void {
    const current = settingsStore.theme;
    const next = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
    void settingsStore.setTheme(next);
}

const themeLabel = computed(() => {
    if (settingsStore.theme === 'dark') return '🌙';
    if (settingsStore.theme === 'light') return '☀️';
    return '💻';
});

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
    { to: '/explorer', label: t('servers.explorerNav'), icon: 'explorer' as const },
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

function isTextEditingTarget(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}

function handleGlobalShortcuts(e: KeyboardEvent): void {
    if (isTextEditingTarget(e.target)) return;

    const key = e.key;
    const isCtrl = e.ctrlKey || e.metaKey;

    if (key === '?' && !isCtrl && !e.altKey) {
        shortcutsOpen.value = true;
        return;
    }

    if (isCtrl && !e.shiftKey && !e.altKey) {
        if (key === '1') { e.preventDefault(); void router.push('/workspace'); return; }
        if (key === '2') { e.preventDefault(); void router.push('/servers'); return; }
        if (key === '3') { e.preventDefault(); void router.push('/explorer'); return; }
        if (key === '4' || key === ',') { e.preventDefault(); void router.push('/settings'); return; }
    }
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
    sidebar.load();
    if (sidebar.lastView) {
        void router.replace(sidebar.lastView);
    }
    window.addEventListener('keydown', handleGlobalShortcuts);
});

onBeforeUnmount(() => {
    stopResize();
    window.removeEventListener('keydown', handleGlobalShortcuts);
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