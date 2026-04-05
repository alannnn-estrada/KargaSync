import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useProjectComparisonStore } from './project-comparison-store';

const SIDEBAR_UI_KEY = 'karga-sync.ui.sidebar.v1';

type SidebarCache = {
    lastSelectedProjectId?: number | null;
    lastView?: string | null;
    expandedProjectIds?: number[];
};

function readCache(): SidebarCache | null {
    if (typeof window === 'undefined') return null;

    try {
        const raw = window.localStorage.getItem(SIDEBAR_UI_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as SidebarCache;
    } catch {
        return null;
    }
}

function writeCache(payload: SidebarCache): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(SIDEBAR_UI_KEY, JSON.stringify(payload));
    } catch {
        // ignore
    }
}

export const useSidebarStore = defineStore('sidebar-ui', () => {
    const lastSelectedProjectId = ref<number | null>(null);
    const lastView = ref<string | null>(null);
    const expandedProjectIds = ref<number[]>([]);

    function setLastSelectedProjectId(id: number | null) {
        lastSelectedProjectId.value = id;
        persist();
    }

    function setLastView(view: string | null) {
        lastView.value = view;
        persist();
    }

    function toggleProjectExpanded(projectId: number) {
        const idx = expandedProjectIds.value.indexOf(projectId);
        if (idx === -1) {
            expandedProjectIds.value.push(projectId);
        } else {
            expandedProjectIds.value.splice(idx, 1);
        }
        persist();
    }

    function isProjectExpanded(projectId: number) {
        return expandedProjectIds.value.includes(projectId);
    }

    function persist() {
        writeCache({
            lastSelectedProjectId: lastSelectedProjectId.value,
            lastView: lastView.value,
            expandedProjectIds: expandedProjectIds.value,
        });
    }

    function load() {
        const cached = readCache();
        if (!cached) return;

        if (typeof cached.lastSelectedProjectId === 'number') {
            lastSelectedProjectId.value = cached.lastSelectedProjectId;
            // also set into project store if available
            try {
                const projectStore = useProjectComparisonStore();
                projectStore.selectProjectById(cached.lastSelectedProjectId ?? null);
            } catch {
                // ignore if pinia not initialized
            }
        }

        if (typeof cached.lastView === 'string') {
            lastView.value = cached.lastView;
        }

        if (Array.isArray(cached.expandedProjectIds)) {
            expandedProjectIds.value = cached.expandedProjectIds;
        }
    }

    return {
        lastSelectedProjectId,
        lastView,
        expandedProjectIds,
        setLastSelectedProjectId,
        setLastView,
        toggleProjectExpanded,
        isProjectExpanded,
        load,
    };
});
