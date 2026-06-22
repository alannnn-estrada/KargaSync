<template>
    <li>
        <div class="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition"
            :class="node.type === 'file' ? fileRowClass : 'hover:bg-(--app-muted-surface) cursor-pointer'"
            @click="node.type === 'folder' ? emit('toggle-folder', node.path) : undefined">
            <button v-if="node.type === 'folder'" type="button"
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-(--app-muted)"
                :aria-label="isExpanded ? t('actions.collapseFolder') : t('actions.expandFolder')"
                @click.stop="emit('toggle-folder', node.path)">
                <svg class="h-3.5 w-3.5 transform transition-transform duration-150"
                    :class="isExpanded ? 'rotate-90' : ''"
                    viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 4l4 4-4 4"/>
                </svg>
            </button>
            <template v-else>
                <template v-if="!mergeMode">
                    <input type="checkbox"
                        class="h-3.5 w-3.5 shrink-0 cursor-pointer"
                        :checked="isSelected"
                        @click.stop
                        @change="emit('toggle-file', node.path)" />
                </template>
                <div v-else class="flex shrink-0 items-center gap-0.5">
                    <button type="button"
                        class="rounded px-1.5 py-0.5 text-[10px] font-semibold transition"
                        :class="decision === 'source' ? 'bg-(--app-accent) text-white' : 'border border-(--app-border) text-(--app-muted) hover:border-(--app-accent) hover:text-(--app-accent)'"
                        :title="t('diff.keepSource')"
                        @click.stop="emit('set-decision', node.path, 'source')">
                        ← {{ t('diff.sourceSide') }}
                    </button>
                    <button type="button"
                        class="rounded px-1.5 py-0.5 text-[10px] font-semibold transition"
                        :class="decision === 'skip' ? 'border border-(--app-border) bg-(--app-muted-surface) text-(--app-text)' : 'border border-transparent text-(--app-muted) hover:border-(--app-border) hover:text-(--app-text)'"
                        :title="t('diff.skipFile')"
                        @click.stop="emit('set-decision', node.path, 'skip')">
                        {{ t('diff.skipFile') }}
                    </button>
                    <button type="button"
                        class="rounded px-1.5 py-0.5 text-[10px] font-semibold transition"
                        :class="decision === 'target' ? 'bg-(--status-added-bg) text-(--status-added-text) border border-(--status-added-border)' : 'border border-(--app-border) text-(--app-muted) hover:border-(--app-accent) hover:text-(--app-accent)'"
                        :title="t('diff.keepTarget')"
                        @click.stop="emit('set-decision', node.path, 'target')">
                        {{ t('diff.targetSide') }} →
                    </button>
                </div>
            </template>

            <span class="shrink-0 text-sm leading-none" :class="node.type === 'folder' ? 'text-(--app-muted)' : fileIconClass">
                {{ node.type === 'folder' ? (isExpanded ? '📂' : '📁') : fileStatusIcon }}
            </span>

            <div class="min-w-0 flex-1">
                <p class="truncate text-sm" :class="nameClass">{{ node.name }}</p>
            </div>

            <button
                v-if="node.type === 'file' && node.status === 'modified'"
                type="button"
                class="hidden shrink-0 items-center gap-1 rounded border border-(--app-border) bg-(--app-elevated) px-1.5 py-0.5 text-[10px] font-medium text-(--app-muted) transition hover:border-(--app-accent) hover:text-(--app-accent) group-hover:flex"
                :title="t('diff.viewDiff')"
                @click.stop="emit('view-diff', node.path)">
                <svg class="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M1 4h6M1 8h4M1 12h6M15 4H9M15 8h-4M15 12H9"/></svg>
                {{ t('diff.viewDiff') }}
            </button>

            <span v-if="node.type === 'file'"
                class="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                :class="statusBadgeClass">
                {{ t(`diff.status.${node.status}`) }}
            </span>

            <div v-else class="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
                <span v-if="node.counts.added"
                    class="rounded-full border border-(--status-added-border) bg-(--status-added-bg) px-1.5 py-0.5 text-(--status-added-text)">+{{
                        node.counts.added }}</span>
                <span v-if="node.counts.modified"
                    class="rounded-full border border-(--status-modified-border) bg-(--status-modified-bg) px-1.5 py-0.5 text-(--status-modified-text)">~{{
                        node.counts.modified }}</span>
                <span v-if="node.counts.deleted"
                    class="rounded-full border border-(--status-deleted-border) bg-(--status-deleted-bg) px-1.5 py-0.5 text-(--status-deleted-text)">-{{
                        node.counts.deleted }}</span>
            </div>
        </div>

        <ul v-if="node.type === 'folder' && isExpanded" class="ml-3 border-l border-(--app-border) pl-2">
            <EnvironmentDiffTreeNode v-for="child in node.children" :key="child.key" :node="child"
                :expanded-state="expandedState" :selected-files="selectedFiles"
                :merge-mode="mergeMode" :merge-decisions="mergeDecisions"
                @toggle-folder="emit('toggle-folder', $event)"
                @toggle-file="emit('toggle-file', $event)"
                @view-diff="emit('view-diff', $event)"
                @set-decision="(path, d) => emit('set-decision', path, d)" />
        </ul>
    </li>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { DiffFileStatus, DiffTreeNode } from './environment-diff-tree-types';

const props = defineProps<{
    node: DiffTreeNode;
    expandedState: Record<string, boolean>;
    selectedFiles: Set<string>;
    mergeMode?: boolean;
    mergeDecisions?: Record<string, 'source' | 'target' | 'skip'>;
}>();

const emit = defineEmits<{
    (event: 'toggle-folder', folderPath: string): void;
    (event: 'toggle-file', filePath: string): void;
    (event: 'view-diff', filePath: string): void;
    (event: 'set-decision', path: string, decision: 'source' | 'target' | 'skip'): void;
}>();

const { t } = useI18n({ useScope: 'global' });

const isExpanded = computed(() => {
    if (props.node.type !== 'folder') {
        return false;
    }

    return props.expandedState[props.node.path] ?? false;
});

const isSelected = computed(() => {
    if (props.node.type !== 'file') {
        return false;
    }
    return props.selectedFiles.has(props.node.path);
});

const decision = computed(() => {
    if (props.node.type !== 'file') return undefined;
    return props.mergeDecisions?.[props.node.path];
});

const fileStatusIcon = computed(() => {
    if (props.node.type !== 'file') return '';
    return statusIcon(props.node.status);
});

const fileRowClass = computed(() => {
    if (props.node.type !== 'file') {
        return '';
    }

    if (props.node.status === 'added') {
        return 'border border-(--status-added-border) bg-(--status-added-soft)';
    }

    if (props.node.status === 'modified') {
        return 'border border-(--status-modified-border) bg-(--status-modified-soft)';
    }

    return 'border border-(--status-deleted-border) bg-(--status-deleted-soft)';
});

const fileIconClass = computed(() => {
    if (props.node.type !== 'file') {
        return '';
    }

    if (props.node.status === 'added') {
        return 'text-(--status-added-text)';
    }

    if (props.node.status === 'modified') {
        return 'text-(--status-modified-text)';
    }

    return 'text-(--status-deleted-text)';
});

const nameClass = computed(() => {
    if (props.node.type === 'folder') {
        return 'font-medium text-(--app-text)';
    }

    if (props.node.status === 'added') {
        return 'font-medium text-(--status-added-text)';
    }

    if (props.node.status === 'modified') {
        return 'font-medium text-(--status-modified-text)';
    }

    return 'font-medium text-(--status-deleted-text) line-through decoration-(--status-deleted-border)';
});

const statusBadgeClass = computed(() => {
    if (props.node.type !== 'file') {
        return '';
    }

    if (props.node.status === 'added') {
        return 'border-(--status-added-border) bg-(--status-added-bg) text-(--status-added-text)';
    }

    if (props.node.status === 'modified') {
        return 'border-(--status-modified-border) bg-(--status-modified-bg) text-(--status-modified-text)';
    }

    return 'border-(--status-deleted-border) bg-(--status-deleted-bg) text-(--status-deleted-text)';
});

function statusIcon(status: DiffFileStatus): string {
    if (status === 'added') {
        return '+';
    }

    if (status === 'modified') {
        return '~';
    }

    return '-';
}
</script>
