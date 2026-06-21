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
                <input type="checkbox"
                    class="h-3.5 w-3.5 shrink-0 cursor-pointer"
                    :checked="isSelected"
                    @click.stop
                    @change="emit('toggle-file', node.path)" />
            </template>

            <span class="shrink-0 text-sm leading-none" :class="node.type === 'folder' ? 'text-(--app-muted)' : fileIconClass">
                {{ node.type === 'folder' ? (isExpanded ? '📂' : '📁') : fileStatusIcon }}
            </span>

            <div class="min-w-0 flex-1">
                <p class="truncate text-sm" :class="nameClass">{{ node.name }}</p>
            </div>

            <span v-if="node.type === 'file'"
                class="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
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
                @toggle-folder="emit('toggle-folder', $event)"
                @toggle-file="emit('toggle-file', $event)" />
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
}>();

const emit = defineEmits<{
    (event: 'toggle-folder', folderPath: string): void;
    (event: 'toggle-file', filePath: string): void;
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
