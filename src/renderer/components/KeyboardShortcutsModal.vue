<template>
    <Teleport to="body">
        <div v-if="visible"
            class="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            @click.self="emit('close')">
            <div class="w-full max-w-lg overflow-hidden rounded-2xl border border-(--app-border) bg-(--app-surface) shadow-(--app-shadow)">
                <!-- Header -->
                <div class="flex items-center justify-between border-b border-(--app-border) px-5 py-4">
                    <div class="flex items-center gap-2.5">
                        <svg class="h-4 w-4 text-(--app-accent)" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="1" y="3" width="3.5" height="2.5" rx="0.6"/>
                            <rect x="5.5" y="3" width="3.5" height="2.5" rx="0.6"/>
                            <rect x="10" y="3" width="5" height="2.5" rx="0.6"/>
                            <rect x="1" y="7.5" width="5" height="2.5" rx="0.6"/>
                            <rect x="7" y="7.5" width="8" height="2.5" rx="0.6"/>
                            <rect x="1" y="12" width="14" height="2" rx="0.6"/>
                        </svg>
                        <h2 class="text-sm font-semibold tracking-tight text-(--app-text)">{{ t('shortcuts.title') }}</h2>
                    </div>
                    <button type="button"
                        class="flex h-7 w-7 items-center justify-center rounded border border-(--app-border) bg-(--app-elevated) text-(--app-muted) transition hover:text-(--app-text)"
                        @click="emit('close')">
                        <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round">
                            <path d="M3 3l10 10M13 3L3 13"/>
                        </svg>
                    </button>
                </div>

                <!-- Body -->
                <div class="max-h-[65vh] space-y-5 overflow-y-auto px-5 py-4">
                    <section v-for="section in sections" :key="section.label">
                        <h3 class="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-(--app-muted)">
                            {{ section.label }}
                        </h3>
                        <div class="overflow-hidden rounded-xl border border-(--app-border) bg-(--app-elevated) divide-y divide-(--app-border)">
                            <div v-for="row in section.rows" :key="row.desc"
                                class="flex items-center gap-3 px-3 py-2">
                                <div class="flex shrink-0 items-center gap-0.5">
                                    <template v-for="(part, idx) in row.keys" :key="idx">
                                        <span v-if="part === '/'" class="mx-1 text-[10px] text-(--app-muted)">/</span>
                                        <kbd v-else
                                            class="rounded border border-(--app-border) bg-(--app-surface) px-1.5 py-0.5 font-mono text-[11px] font-medium text-(--app-text) shadow-sm">
                                            {{ part }}
                                        </kbd>
                                    </template>
                                </div>
                                <span class="min-w-0 flex-1 text-xs text-(--app-muted)">{{ row.desc }}</span>
                            </div>
                        </div>
                    </section>
                </div>

                <!-- Footer -->
                <div class="flex justify-end border-t border-(--app-border) px-5 py-3">
                    <button type="button"
                        class="rounded-lg border border-(--app-border) bg-(--app-elevated) px-4 py-2 text-sm font-medium text-(--app-text) transition hover:bg-(--app-muted-surface)"
                        @click="emit('close')">
                        {{ t('common.close') }}
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();
const { t } = useI18n({ useScope: 'global' });

const sections = computed(() => [
    {
        label: t('shortcuts.navSection'),
        rows: [
            { keys: ['Ctrl', '1'], desc: t('shortcuts.nav1') },
            { keys: ['Ctrl', '2'], desc: t('shortcuts.nav2') },
            { keys: ['Ctrl', '3'], desc: t('shortcuts.nav3') },
            { keys: ['Ctrl', '4'], desc: t('shortcuts.nav4') },
            { keys: ['Ctrl', ','], desc: t('shortcuts.navSettings') },
            { keys: ['?'], desc: t('shortcuts.showShortcuts') },
        ],
    },
    {
        label: t('shortcuts.explorerSection'),
        rows: [
            { keys: ['F5', '/', 'Ctrl+R'], desc: t('shortcuts.explorerRefresh') },
            { keys: ['Tab'], desc: t('shortcuts.explorerSwitchPane') },
            { keys: ['Enter'], desc: t('shortcuts.explorerOpen') },
            { keys: ['Backspace'], desc: t('shortcuts.explorerParent') },
            { keys: ['Delete'], desc: t('shortcuts.explorerDelete') },
            { keys: ['F2'], desc: t('shortcuts.explorerRename') },
            { keys: ['Ctrl', 'A'], desc: t('shortcuts.explorerSelectAll') },
            { keys: ['Ctrl', 'C'], desc: t('shortcuts.explorerCopy') },
            { keys: ['Ctrl', 'X'], desc: t('shortcuts.explorerCut') },
            { keys: ['Ctrl', 'V'], desc: t('shortcuts.explorerPaste') },
            { keys: ['Shift', '↑↓'], desc: t('shortcuts.explorerExtendSel') },
        ],
    },
]);

function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && props.visible) {
        emit('close');
    }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>
