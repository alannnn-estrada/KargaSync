<template>
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div
            class="w-full max-w-lg rounded-2xl border border-(--app-border) bg-(--app-surface) p-6 shadow-2xl mx-4">
            <header class="flex items-center justify-between gap-3">
                <div>
                    <p class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">
                        {{ t('deploy.modalTitle') }}
                    </p>
                    <h2 class="mt-1 text-base font-semibold text-(--app-text)">
                        {{ sourceLabel }} → {{ targetLabel }}
                    </h2>
                </div>
                <span v-if="!isDone"
                    class="rounded-full border border-(--app-border) bg-(--app-muted-surface) px-3 py-1 text-xs font-medium text-(--app-muted)">
                    {{ t('deploy.inProgress') }}
                </span>
            </header>

            <ul class="mt-4 max-h-80 overflow-y-auto space-y-1 rounded-xl border border-(--app-border-subtle) bg-(--app-muted-surface) p-2">
                <li v-for="file in files" :key="file"
                    class="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition"
                    :class="fileRowClass(file)">
                    <span class="shrink-0 text-sm font-mono" :class="statusIconClass(file)">{{ statusIcon(file) }}</span>
                    <span class="min-w-0 flex-1 truncate font-mono text-xs text-(--app-text)">{{ file }}</span>
                    <span v-if="getProgress(file)?.status === 'transferring'"
                        class="shrink-0 text-xs text-(--status-modified-text)">
                        {{ t('deploy.statusTransferring') }}
                    </span>
                    <span v-else-if="getProgress(file)?.status === 'done'"
                        class="shrink-0 text-xs text-(--status-added-text)">
                        {{ t('deploy.statusDone') }}
                    </span>
                    <span v-else-if="getProgress(file)?.status === 'error'"
                        class="shrink-0 max-w-[40%] truncate text-xs text-(--status-deleted-text)"
                        :title="getProgress(file)?.error">
                        {{ getProgress(file)?.error || t('deploy.statusError') }}
                    </span>
                    <span v-else-if="getProgress(file)?.status === 'skipped'"
                        class="shrink-0 text-xs text-(--app-muted)">
                        {{ t('deploy.statusSkipped') }}
                    </span>
                    <span v-else class="shrink-0 text-xs text-(--app-muted)">
                        {{ t('deploy.statusPending') }}
                    </span>
                </li>
            </ul>

            <footer class="mt-5 flex items-center justify-between gap-4">
                <p v-if="isDone" class="text-sm text-(--app-muted)">
                    {{ t('deploy.summary', { transferred: transferredCount, failed: failedCount }) }}
                </p>
                <p v-else class="text-sm text-(--app-muted)">
                    {{ completedCount }} / {{ files.length }}
                </p>

                <button type="button"
                    class="rounded-lg px-4 py-2 text-sm font-semibold transition"
                    :class="isDone
                        ? 'bg-(--app-accent) text-white hover:opacity-90'
                        : 'bg-(--app-muted-surface) text-(--app-muted) border border-(--app-border) cursor-not-allowed opacity-60'"
                    :disabled="!isDone"
                    @click="isDone && emit('close')">
                    {{ t('deploy.close') }}
                </button>
            </footer>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { DeployProgressEvent } from '../../shared/ipc/contracts';

const props = defineProps<{
    visible: boolean;
    files: string[];
    sourceLabel: string;
    targetLabel: string;
    progress: Map<string, DeployProgressEvent>;
}>();

const emit = defineEmits<{
    (event: 'close'): void;
}>();

const { t } = useI18n({ useScope: 'global' });

function getProgress(file: string): DeployProgressEvent | undefined {
    return props.progress.get(file);
}

const completedCount = computed(() =>
    props.files.filter((f) => {
        const s = getProgress(f)?.status;
        return s === 'done' || s === 'error' || s === 'skipped';
    }).length,
);

const transferredCount = computed(() =>
    props.files.filter((f) => getProgress(f)?.status === 'done').length,
);

const failedCount = computed(() =>
    props.files.filter((f) => getProgress(f)?.status === 'error').length,
);

const isDone = computed(() => completedCount.value >= props.files.length && props.files.length > 0);

function statusIcon(file: string): string {
    const s = getProgress(file)?.status;
    if (s === 'done') return '✓';
    if (s === 'error') return '✗';
    if (s === 'transferring') return '↑';
    if (s === 'skipped') return '–';
    return '·';
}

function statusIconClass(file: string): string {
    const s = getProgress(file)?.status;
    if (s === 'done') return 'text-(--status-added-text)';
    if (s === 'error') return 'text-(--status-deleted-text)';
    if (s === 'transferring') return 'text-(--status-modified-text)';
    return 'text-(--app-muted)';
}

function fileRowClass(file: string): string {
    const s = getProgress(file)?.status;
    if (s === 'done') return 'bg-(--status-added-soft) border border-(--status-added-border)';
    if (s === 'error') return 'bg-(--status-deleted-soft) border border-(--status-deleted-border)';
    if (s === 'transferring') return 'bg-(--status-modified-soft) border border-(--status-modified-border)';
    return '';
}
</script>
