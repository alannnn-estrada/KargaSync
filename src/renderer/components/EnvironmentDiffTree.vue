<template>
    <section
        class="rounded-2xl border border-(--app-border) bg-(--app-elevated) p-4 md:p-5 shadow-[var(--app-shadow-sm)]">
        <header
            class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-(--app-border-subtle) pb-3">
            <div>
                <p class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">{{ t('diff.section') }}
                </p>
                <h3 class="text-sm font-semibold text-(--app-text)">{{ t('diff.title') }}</h3>
            </div>

            <div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.11em]">
                <span
                    class="rounded-full border border-(--status-added-border) bg-(--status-added-bg) px-2 py-0.5 text-(--status-added-text)">{{
                        t('diff.added', { count: summaryCounts.added }) }}</span>
                <span
                    class="rounded-full border border-(--status-modified-border) bg-(--status-modified-bg) px-2 py-0.5 text-(--status-modified-text)">{{
                        t('diff.modified', { count: summaryCounts.modified }) }}</span>
                <span
                    class="rounded-full border border-(--status-deleted-border) bg-(--status-deleted-bg) px-2 py-0.5 text-(--status-deleted-text)">{{
                        t('diff.deleted', { count: summaryCounts.deleted }) }}</span>
            </div>
        </header>

        <p v-if="treeNodes.length === 0"
            class="rounded-xl border border-dashed border-(--app-border) bg-(--app-muted-surface) px-3 py-4 text-sm text-(--app-muted)">
            {{ t('diff.empty') }}
        </p>

        <ul v-else class="space-y-1">
            <EnvironmentDiffTreeNode v-for="node in treeNodes" :key="node.key" :node="node"
                :expanded-state="expandedState" @toggle-folder="toggleFolder" />
        </ul>
    </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { EnvironmentComparisonResult } from '../../core/domain/snapshots';
import type { CompareEnvironmentsResponseDto } from '../services';
import EnvironmentDiffTreeNode from './EnvironmentDiffTreeNode.vue';
import type { DiffFileStatus, DiffTreeFolderNode, DiffTreeNode } from './environment-diff-tree-types';

type ComparisonInput = EnvironmentComparisonResult | CompareEnvironmentsResponseDto;

type StatusCounts = Record<DiffFileStatus, number>;

const props = withDefaults(
    defineProps<{
        result: ComparisonInput;
        initiallyExpandedDepth?: number;
    }>(),
    {
        initiallyExpandedDepth: 1,
    },
);

const { t } = useI18n({ useScope: 'global' });

const expandedState = ref<Record<string, boolean>>({ '/': true });

const summaryCounts = computed<StatusCounts>(() => ({
    added: props.result.summary.comparisonStats.added,
    modified: props.result.summary.comparisonStats.modified,
    deleted: props.result.summary.comparisonStats.deleted,
}));

const treeNodes = computed<DiffTreeNode[]>(() => buildDiffTree(props.result.files));

watch(
    treeNodes,
    (nextTreeNodes) => {
        const nextState: Record<string, boolean> = { '/': true };
        const maxDepth = Math.max(0, props.initiallyExpandedDepth);

        for (const node of nextTreeNodes) {
            collectExpandedFolders(node, 0, maxDepth, nextState);
        }

        expandedState.value = nextState;
    },
    { immediate: true },
);

function toggleFolder(folderPath: string): void {
    expandedState.value = {
        ...expandedState.value,
        [folderPath]: !(expandedState.value[folderPath] ?? false),
    };
}

function buildDiffTree(files: ComparisonInput['files']): DiffTreeNode[] {
    const root = createFolderNode('/', '/');

    const changedFiles = files
        .map((file) => {
            const status = toDiffStatus(file.status);

            if (!status) {
                return null;
            }

            return {
                relativePath: file.relativePath,
                status,
            };
        })
        .filter((file): file is { relativePath: string; status: DiffFileStatus } => file !== null)
        .sort((a, b) => normalizePath(a.relativePath).localeCompare(normalizePath(b.relativePath)));

    for (const file of changedFiles) {
        const normalizedPath = normalizePath(file.relativePath);
        const pathParts = normalizedPath.split('/').filter(Boolean);

        if (pathParts.length === 0) {
            continue;
        }

        let currentFolder = root;

        for (let index = 0; index < pathParts.length - 1; index += 1) {
            const part = pathParts[index];
            const childPath = `${currentFolder.path === '/' ? '' : currentFolder.path}/${part}`;

            const existingFolder = currentFolder.children.find(
                (child): child is DiffTreeFolderNode => child.type === 'folder' && child.path === childPath,
            );

            if (existingFolder) {
                currentFolder = existingFolder;
                continue;
            }

            const nextFolder = createFolderNode(part, childPath);
            currentFolder.children.push(nextFolder);
            currentFolder = nextFolder;
        }

        const fileName = pathParts[pathParts.length - 1];
        const filePath = `${currentFolder.path === '/' ? '' : currentFolder.path}/${fileName}`;

        currentFolder.children.push({
            key: `file:${filePath}`,
            type: 'file',
            name: fileName,
            path: filePath,
            status: file.status,
        });
    }

    computeFolderCounts(root);
    sortTreeNodes(root.children);

    return root.children;
}

function createFolderNode(name: string, path: string): DiffTreeFolderNode {
    return {
        key: `folder:${path}`,
        type: 'folder',
        name,
        path,
        children: [],
        counts: { added: 0, modified: 0, deleted: 0 },
    };
}

function computeFolderCounts(node: DiffTreeFolderNode): StatusCounts {
    const counts: StatusCounts = { added: 0, modified: 0, deleted: 0 };

    for (const child of node.children) {
        if (child.type === 'file') {
            counts[child.status] += 1;
            continue;
        }

        const nestedCounts = computeFolderCounts(child);
        counts.added += nestedCounts.added;
        counts.modified += nestedCounts.modified;
        counts.deleted += nestedCounts.deleted;
    }

    node.counts = counts;
    return counts;
}

function sortTreeNodes(nodes: DiffTreeNode[]): void {
    nodes.sort((left, right) => {
        if (left.type !== right.type) {
            return left.type === 'folder' ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
    });

    for (const node of nodes) {
        if (node.type === 'folder') {
            sortTreeNodes(node.children);
        }
    }
}

function collectExpandedFolders(
    node: DiffTreeNode,
    depth: number,
    maxDepth: number,
    output: Record<string, boolean>,
): void {
    if (node.type !== 'folder') {
        return;
    }

    if (depth < maxDepth) {
        output[node.path] = true;
    }

    for (const child of node.children) {
        collectExpandedFolders(child, depth + 1, maxDepth, output);
    }
}

function normalizePath(path: string): string {
    return path.replace(/\\+/g, '/').replace(/^\/+/, '');
}

function toDiffStatus(status: string): DiffFileStatus | null {
    if (status === 'added' || status === 'modified' || status === 'deleted') {
        return status;
    }

    return null;
}
</script>
