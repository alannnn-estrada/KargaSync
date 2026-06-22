<template>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div v-if="visible" class="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4" @keydown.esc="$emit('close')" @mousedown.self="$emit('close')">
                <div class="flex h-[85vh] w-[92vw] max-w-[1400px] flex-col rounded-2xl border border-(--app-border) bg-(--app-surface) shadow-2xl">
                    <!-- Header -->
                    <div class="flex shrink-0 items-center gap-3 border-b border-(--app-border) px-4 py-3">
                        <svg class="h-4 w-4 shrink-0 text-(--app-accent)" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M1 4h6M1 8h4M1 12h6M15 4H9M15 8h-4M15 12H9" stroke-linecap="round"/>
                            <path d="M7.5 1v14M8.5 1v14" opacity=".4"/>
                        </svg>
                        <span class="flex-1 truncate text-sm font-semibold text-(--app-text)">{{ relativePath }}</span>
                        <div class="flex items-center gap-2 text-xs text-(--app-muted)">
                            <span v-if="result">{{ result.changedCount }} {{ t('diff.changedLines') }}</span>
                            <span v-if="loading" class="animate-pulse">{{ t('common.loading') }}…</span>
                        </div>
                        <button type="button" class="flex h-7 w-7 items-center justify-center rounded-lg text-(--app-muted) transition hover:bg-(--app-muted-surface) hover:text-(--app-text)" @click="$emit('close')">
                            <svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/></svg>
                        </button>
                    </div>

                    <!-- Error state -->
                    <div v-if="error" class="flex flex-1 items-center justify-center p-8">
                        <div class="text-center">
                            <p class="text-sm font-medium text-red-400">{{ t('errors.unexpected') }}</p>
                            <p class="mt-1 text-xs text-(--app-muted)">{{ error }}</p>
                            <button type="button" class="mt-4 rounded-lg border border-(--app-border) px-4 py-2 text-sm text-(--app-text) hover:border-(--app-accent)" @click="loadDiff">{{ t('servers.retry') }}</button>
                        </div>
                    </div>

                    <!-- Loading state -->
                    <div v-else-if="loading" class="flex flex-1 items-center justify-center">
                        <div class="h-8 w-8 animate-spin rounded-full border-2 border-(--app-accent) border-t-transparent"></div>
                    </div>

                    <!-- Column labels -->
                    <div v-else-if="result" class="grid shrink-0 grid-cols-2 gap-0 border-b border-(--app-border) bg-(--app-elevated)">
                        <div class="border-r border-(--app-border) px-4 py-1.5 text-xs font-medium text-(--app-muted)">{{ sourceLabel }}</div>
                        <div class="px-4 py-1.5 text-xs font-medium text-(--app-muted)">{{ targetLabel }}</div>
                    </div>

                    <!-- Diff body -->
                    <div v-if="result" ref="scrollEl" class="flex-1 overflow-auto font-mono text-xs leading-5">
                        <table class="w-full border-collapse">
                            <tbody>
                                <tr
                                    v-for="(line, idx) in result.lines"
                                    :key="idx"
                                    :class="rowClass(line.type)">
                                    <!-- Left -->
                                    <td class="w-10 select-none border-r border-(--app-border) px-2 text-right text-(--app-muted) opacity-60" style="min-width:2.5rem">
                                        {{ line.leftLineNo ?? '' }}
                                    </td>
                                    <td class="w-5 select-none border-r border-(--app-border) px-1 text-center font-bold" :class="gutterClass(line.type, 'left')">
                                        {{ gutterSymbol(line.type, 'left') }}
                                    </td>
                                    <td class="w-1/2 whitespace-pre-wrap break-all border-r border-(--app-border) px-3 py-px" :class="cellClass(line.type, 'left')">{{ line.leftText }}</td>
                                    <!-- Right -->
                                    <td class="w-10 select-none border-r border-(--app-border) px-2 text-right text-(--app-muted) opacity-60" style="min-width:2.5rem">
                                        {{ line.rightLineNo ?? '' }}
                                    </td>
                                    <td class="w-5 select-none border-r border-(--app-border) px-1 text-center font-bold" :class="gutterClass(line.type, 'right')">
                                        {{ gutterSymbol(line.type, 'right') }}
                                    </td>
                                    <td class="w-1/2 whitespace-pre-wrap break-all px-3 py-px" :class="cellClass(line.type, 'right')">{{ line.rightText }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FileDiffResult, FileDiffLine } from '../../shared/ipc/contracts';
import { readFileDiff } from '../services/api';

interface Props {
    visible: boolean;
    sourceEnvironmentId: number | null;
    targetEnvironmentId: number | null;
    relativePath: string;
    sourceLabel?: string;
    targetLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
    sourceLabel: 'Source',
    targetLabel: 'Target',
});

defineEmits<{ close: [] }>();

const { t } = useI18n({ useScope: 'global' });

const loading = ref(false);
const error = ref<string | null>(null);
const result = ref<FileDiffResult | null>(null);
const scrollEl = ref<HTMLElement | null>(null);

async function loadDiff() {
    if (!props.sourceEnvironmentId || !props.targetEnvironmentId || !props.relativePath) return;
    loading.value = true;
    error.value = null;
    result.value = null;

    try {
        result.value = await readFileDiff({
            sourceEnvironmentId: props.sourceEnvironmentId,
            targetEnvironmentId: props.targetEnvironmentId,
            relativePath: props.relativePath,
        });
    } catch (err) {
        error.value = err instanceof Error ? err.message : String(err);
    } finally {
        loading.value = false;
    }
}

watch(() => [props.visible, props.relativePath, props.sourceEnvironmentId, props.targetEnvironmentId] as const, ([vis]) => {
    if (vis) loadDiff();
    else { result.value = null; error.value = null; }
});

type DiffType = FileDiffLine['type'];

function rowClass(type: DiffType): string {
    if (type === 'equal') return 'bg-(--app-surface)';
    if (type === 'insert') return 'bg-green-500/8';
    if (type === 'delete') return 'bg-red-500/8';
    return 'bg-yellow-500/8';
}

function cellClass(type: DiffType, side: 'left' | 'right'): string {
    if (type === 'equal') return 'text-(--app-text)';
    if (type === 'insert') return side === 'right' ? 'bg-green-500/15 text-green-400' : 'text-(--app-muted)';
    if (type === 'delete') return side === 'left' ? 'bg-red-500/15 text-red-400' : 'text-(--app-muted)';
    // replace
    return side === 'left' ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400';
}

function gutterClass(type: DiffType, side: 'left' | 'right'): string {
    if (type === 'insert') return side === 'right' ? 'text-green-400' : 'text-(--app-muted)';
    if (type === 'delete') return side === 'left' ? 'text-red-400' : 'text-(--app-muted)';
    if (type === 'replace') return side === 'left' ? 'text-red-400' : 'text-green-400';
    return 'text-transparent';
}

function gutterSymbol(type: DiffType, side: 'left' | 'right'): string {
    if (type === 'insert') return side === 'right' ? '+' : '';
    if (type === 'delete') return side === 'left' ? '-' : '';
    if (type === 'replace') return side === 'left' ? '-' : '+';
    return '';
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.15s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}
</style>
