import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import { loadChangelogEntries, type ChangelogEntry } from '../services/changelog';

const CHANGELOG_SEEN_KEY = 'karga-sync.changelog.latest-seen';

function readSeenVersion(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.localStorage.getItem(CHANGELOG_SEEN_KEY);
}

function saveSeenVersion(version: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(CHANGELOG_SEEN_KEY, version);
}

export const useChangelogStore = defineStore('changelog', () => {
    const entries = ref<ChangelogEntry[]>([]);
    const isModalOpen = ref(false);
    const hasUnreadLatest = ref(false);
    const hasInitialized = ref(false);

    const latestEntry = computed(() => entries.value[0] ?? null);

    function markLatestAsSeen(): void {
        if (!latestEntry.value) {
            return;
        }

        saveSeenVersion(latestEntry.value.version);
        hasUnreadLatest.value = false;
    }

    function openModal(): void {
        isModalOpen.value = true;
        markLatestAsSeen();
    }

    function closeModal(): void {
        isModalOpen.value = false;
    }

    async function initialize(): Promise<void> {
        if (hasInitialized.value) {
            return;
        }

        entries.value = loadChangelogEntries();
        const seenVersion = readSeenVersion();

        if (latestEntry.value && seenVersion !== latestEntry.value.version) {
            hasUnreadLatest.value = true;
            isModalOpen.value = true;
        }

        hasInitialized.value = true;
    }

    return {
        entries,
        isModalOpen,
        hasUnreadLatest,
        latestEntry,
        openModal,
        closeModal,
        initialize,
    };
});
