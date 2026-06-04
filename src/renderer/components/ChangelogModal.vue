<template>
    <teleport to="body">
        <div v-if="changelogStore.isModalOpen"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-[2px] md:p-5"
            @click.self="closeModal">
            <section
                class="grid h-[min(90vh,760px)] w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-3xl border border-(--app-border) bg-(--app-elevated) shadow-(--app-shadow)">
                <header class="border-b border-(--app-border) px-4 py-4 md:px-6">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <p class="text-[11px] font-medium uppercase tracking-[0.18em] text-(--app-muted)">
                                {{ t('changelog.title') }}
                            </p>
                            <h2 class="mt-1 text-xl font-semibold tracking-tight text-(--app-text)">
                                {{ t('changelog.modalTitle') }}
                            </h2>
                            <p class="mt-2 text-sm text-(--app-muted)">
                                {{ t('changelog.modalDescription') }}
                            </p>
                        </div>

                        <button type="button"
                            class="rounded-lg border border-(--app-border) bg-(--app-muted-surface) px-3 py-2 text-sm font-medium text-(--app-text) transition hover:border-(--app-accent) hover:text-(--app-accent)"
                            @click="closeModal">
                            {{ t('changelog.close') }}
                        </button>
                    </div>
                </header>

                <div class="grid min-h-0 md:grid-cols-[240px_minmax(0,1fr)]">
                    <aside class="border-b border-(--app-border) bg-(--app-sidebar) md:border-b-0 md:border-r">
                        <div class="h-full overflow-auto p-3 md:p-4">
                            <p class="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-(--app-muted)">
                                {{ t('changelog.history') }}
                            </p>

                            <div class="space-y-1.5" v-if="changelogStore.entries.length">
                                <button v-for="entry in changelogStore.entries" :key="entry.version" type="button"
                                    class="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm font-medium transition"
                                    :class="selectedVersion === entry.version
                                        ? 'border-(--app-accent) bg-(--app-elevated) text-(--app-text)'
                                        : 'border-transparent text-(--app-muted) hover:border-(--app-border) hover:bg-(--app-elevated) hover:text-(--app-text)'"
                                    @click="selectVersion(entry.version)">
                                    <span>{{ entry.version }}</span>
                                    <span v-if="entry.isLatest"
                                        class="rounded-full border border-(--status-added-border) bg-(--status-added-bg) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-(--status-added-text)">
                                        {{ t('changelog.latestBadge') }}
                                    </span>
                                </button>
                            </div>

                            <p v-else
                                class="rounded-lg border border-dashed border-(--app-border) bg-(--app-elevated) px-3 py-4 text-sm text-(--app-muted)">
                                {{ t('changelog.noEntries') }}
                            </p>
                        </div>
                    </aside>

                    <article class="min-h-0 overflow-auto px-4 py-4 md:px-7 md:py-6">
                        <div v-if="selectedEntry"
                            class="prose prose-sm max-w-none prose-headings:tracking-tight changelog-content"
                            v-html="selectedEntry.html" />
                        <p v-else
                            class="rounded-lg border border-dashed border-(--app-border) bg-(--app-muted-surface) px-3 py-4 text-sm text-(--app-muted)">
                            {{ t('changelog.noEntries') }}
                        </p>
                    </article>
                </div>
            </section>
        </div>
    </teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useChangelogStore } from '../stores/changelog-store';

const changelogStore = useChangelogStore();
const { t } = useI18n({ useScope: 'global' });

const selectedVersion = ref('');

const selectedEntry = computed(() => {
    return changelogStore.entries.find((entry) => entry.version === selectedVersion.value) ?? null;
});

function closeModal(): void {
    changelogStore.closeModal();
}

function selectVersion(version: string): void {
    selectedVersion.value = version;
}

function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && changelogStore.isModalOpen) {
        closeModal();
    }
}

watch(
    () => changelogStore.entries,
    (entries) => {
        if (!entries.length) {
            selectedVersion.value = '';
            return;
        }

        if (!entries.some((entry) => entry.version === selectedVersion.value)) {
            selectedVersion.value = entries[0].version;
        }
    },
    { immediate: true },
);

onMounted(() => {
    window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.changelog-content :deep(h1),
.changelog-content :deep(h2),
.changelog-content :deep(h3),
.changelog-content :deep(h4) {
    color: var(--app-text);
    font-weight: 600;
    line-height: 1.3;
    margin-top: 1.25em;
    margin-bottom: 0.5em;
}

.changelog-content :deep(h1) { font-size: 1.2rem; }
.changelog-content :deep(h2) { font-size: 1.05rem; }
.changelog-content :deep(h3) { font-size: 0.95rem; }

.changelog-content :deep(p) {
    color: var(--app-muted);
    line-height: 1.6;
    margin-bottom: 0.75em;
}

.changelog-content :deep(ul),
.changelog-content :deep(ol) {
    color: var(--app-muted);
    padding-left: 1.25rem;
    margin-bottom: 0.75em;
}

.changelog-content :deep(ul) { list-style-type: disc; }
.changelog-content :deep(ol) { list-style-type: decimal; }

.changelog-content :deep(li) {
    color: var(--app-muted);
    margin-bottom: 0.25em;
    line-height: 1.5;
}

.changelog-content :deep(code) {
    border-radius: 0.3rem;
    background: var(--app-muted-surface);
    padding: 0.1rem 0.35rem;
    color: var(--app-text);
    font-family: 'IBM Plex Mono', 'Consolas', monospace;
    font-size: 0.85em;
}

.changelog-content :deep(pre) {
    background: var(--app-muted-surface);
    border: 1px solid var(--app-border);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    overflow-x: auto;
    margin-bottom: 0.75em;
}

.changelog-content :deep(pre code) {
    background: transparent;
    padding: 0;
}

.changelog-content :deep(blockquote) {
    border-left: 3px solid var(--app-accent);
    margin-left: 0;
    padding: 0.5rem 1rem;
    background: var(--app-muted-surface);
    border-radius: 0 0.375rem 0.375rem 0;
    color: var(--app-muted);
    font-style: italic;
    margin-bottom: 0.75em;
}

.changelog-content :deep(a) {
    color: var(--app-accent);
    text-decoration: underline;
    text-underline-offset: 2px;
}

.changelog-content :deep(a:hover) {
    opacity: 0.8;
}

.changelog-content :deep(hr) {
    border-color: var(--app-border);
    margin: 1rem 0;
}

.changelog-content :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 0.75em;
    font-size: 0.85rem;
}

.changelog-content :deep(th),
.changelog-content :deep(td) {
    border: 1px solid var(--app-border);
    padding: 0.375rem 0.75rem;
    text-align: left;
    color: var(--app-muted);
}

.changelog-content :deep(th) {
    background: var(--app-muted-surface);
    color: var(--app-text);
    font-weight: 600;
}
</style>
