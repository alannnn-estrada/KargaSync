<template>
    <teleport to="body">
        <div v-if="visible"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-[2px] md:p-5"
            @click.self="onClose">
            <section
                class="w-full max-w-2xl overflow-hidden rounded-3xl border border-(--app-border) bg-(--app-elevated) shadow-(--app-shadow)">
                <header class="border-b border-(--app-border) px-4 py-4 md:px-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-[11px] font-medium uppercase tracking-[0.18em] text-(--app-muted)">{{
                                t('project.environments') }}</p>
                            <h2 class="mt-1 text-lg font-semibold tracking-tight text-(--app-text)">{{ environment?.name
                                ?? t('project.selectProject') }}</h2>
                        </div>

                        <button type="button"
                            class="rounded-lg border border-(--app-border) bg-(--app-muted-surface) px-3 py-2 text-sm font-medium text-(--app-text) transition hover:border-(--app-accent) hover:text-(--app-accent)"
                            @click="onClose">
                            {{ t('changelog.close') }}
                        </button>
                    </div>
                </header>

                <div class="p-5">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">{{
                                t('project.selectServer') }}</label>
                            <select v-model.number="localSelectedServer"
                                class="mt-2 w-full rounded-md border border-(--app-border) bg-(--app-input) px-3 py-2 text-sm">
                                <option :value="null">{{ t('project.selectServerPlaceholder') }}</option>
                                <option v-for="s in servers" :key="s.id" :value="s.id">{{ s.host }}:{{ s.port }} — {{
                                    s.username }}</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">{{
                                t('project.remotePath') }}</label>
                            <input v-model="localRemotePath" type="text"
                                class="mt-2 w-full rounded-md border border-(--app-border) bg-(--app-input) px-3 py-2 text-sm"
                                placeholder="/remote/path" />
                        </div>

                        <div class="flex justify-end">
                            <button type="button" class="mr-2 rounded-md border px-3 py-2 text-sm" @click="onClose">{{
                                t('changelog.close') }}</button>
                            <button type="button"
                                class="rounded-md bg-(--app-accent) px-4 py-2 text-sm font-semibold text-white"
                                :disabled="!canSave" @click="onSave">{{ t('project.save') }}</button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    visible: { type: Boolean, required: true },
    environment: { type: Object as () => any, required: false },
    servers: { type: Array as () => any[], required: true },
    selectedServer: { type: Number as () => number | null, required: false },
    remotePath: { type: String as () => string, required: false },
});

const emit = defineEmits(['close', 'save']);
const { t } = useI18n({ useScope: 'global' });

const localSelectedServer = ref<number | null>(props.selectedServer ?? null);
const localRemotePath = ref<string>(props.remotePath ?? '');

watch(() => props.selectedServer, (v) => { localSelectedServer.value = v ?? null; });
watch(() => props.remotePath, (v) => { localRemotePath.value = v ?? ''; });

const canSave = computed(() => !!localSelectedServer.value && localRemotePath.value.trim().length > 0 && !!props.environment);

function onClose() {
    emit('close');
}

function onSave() {
    if (!props.environment || !localSelectedServer.value) return;
    emit('save', { environmentId: props.environment.id, serverId: localSelectedServer.value, remotePath: localRemotePath.value.trim() });
}
</script>
