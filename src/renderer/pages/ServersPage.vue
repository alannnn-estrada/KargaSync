<template>
    <section class="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col gap-6 px-3 py-3 md:px-4 md:py-4">
        <header class="flex items-center gap-3 rounded-xl border border-(--app-border) bg-(--app-surface) px-4 py-3 shadow-(--app-shadow-sm)">
            <p class="text-[11px] font-medium uppercase tracking-[0.18em] text-(--app-muted)">{{ t('servers.section') }}</p>
            <span class="h-3 w-px bg-(--app-border)" />
            <h1 class="text-sm font-semibold tracking-tight text-(--app-text)">{{ t('servers.title') }}</h1>
        </header>

        <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <article class="rounded-2xl border border-(--app-border) bg-(--app-elevated) p-5 shadow-(--app-shadow-sm)">
                <p class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">
                    {{ isEditing ? t('servers.edit') : t('servers.create') }}
                </p>

                <form class="mt-4 grid gap-3" @submit.prevent="handleSaveServer">
                    <label class="block">
                        <span class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">{{
                            t('servers.name') }}</span>
                        <input v-model="form.name" type="text"
                            class="mt-2 w-full rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm outline-none ring-(--app-accent) transition focus:ring-1"
                            :placeholder="t('servers.namePlaceholder')" :disabled="isSaving" />
                    </label>

                    <label class="block">
                        <span class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">{{
                            t('servers.host') }}</span>
                        <input v-model="form.host" type="text"
                            class="mt-2 w-full rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm outline-none ring-(--app-accent) transition focus:ring-1"
                            :placeholder="t('servers.hostPlaceholder')" :disabled="isSaving" />
                    </label>

                    <div class="grid gap-3 sm:grid-cols-2">
                        <label class="block">
                            <span class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">{{
                                t('servers.port') }}</span>
                            <input v-model.number="form.port" type="number" min="1" max="65535"
                                class="mt-2 w-full rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm outline-none ring-(--app-accent) transition focus:ring-1"
                                :disabled="isSaving" />
                        </label>

                        <label class="block">
                            <span class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">{{
                                t('servers.protocol') }}</span>
                            <select v-model="form.protocol"
                                class="mt-2 w-full rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm outline-none ring-(--app-accent) transition focus:ring-1"
                                :disabled="isSaving">
                                <option value="sftp">SFTP</option>
                                <option value="ftp">FTP</option>
                            </select>
                        </label>
                    </div>

                    <label class="block">
                        <span class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">{{
                            t('servers.username') }}</span>
                        <input v-model="form.username" type="text"
                            class="mt-2 w-full rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm outline-none ring-(--app-accent) transition focus:ring-1"
                            :placeholder="t('servers.usernamePlaceholder')" :disabled="isSaving" />
                    </label>

                    <div class="grid gap-3 sm:grid-cols-2">
                        <label class="block">
                            <span class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">{{
                                t('servers.authType') }}</span>
                            <select v-model="form.authType"
                                class="mt-2 w-full rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm outline-none ring-(--app-accent) transition focus:ring-1"
                                :disabled="isSaving">
                                <option value="password">{{ t('servers.authPassword') }}</option>
                                <option value="key">{{ t('servers.authKey') }}</option>
                            </select>
                        </label>

                        <label class="block">
                            <span class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">{{
                                t('servers.secret') }}</span>
                            <div class="mt-2 flex gap-2">
                                <input v-model="form.secret" :type="form.authType === 'password' ? 'password' : 'text'"
                                    class="min-w-0 flex-1 rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm outline-none ring-(--app-accent) transition focus:ring-1"
                                    :placeholder="form.authType === 'password' ? t('servers.passwordPlaceholder') : t('servers.keyPlaceholder')"
                                    :disabled="isSaving" />
                                <button v-if="form.authType === 'key'" type="button"
                                    class="shrink-0 rounded-lg border border-(--app-border) bg-(--app-muted-surface) px-3 py-2 text-xs font-semibold text-(--app-text) transition hover:border-(--app-accent)"
                                    :disabled="isSaving" @click="handleChooseKeyFile">
                                    {{ t('servers.chooseKeyFile') }}
                                </button>
                            </div>
                        </label>
                    </div>

                    <p v-if="isEditing" class="text-xs text-(--app-muted)">{{ t('servers.editSecretHint') }}</p>

                    <div class="mt-1 flex flex-wrap items-center gap-2">
                        <button type="button"
                            class="inline-flex items-center gap-2 rounded-lg border border-(--app-border) bg-(--app-muted-surface) px-4 py-2 text-sm font-semibold text-(--app-text) transition hover:border-(--app-accent)"
                            :disabled="!canSubmit || isTesting" @click="handleTestConnection">
                            <svg v-if="!isTesting" class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M2 8a6 6 0 1 0 12 0M8 2v4M8 11v.5"/>
                            </svg>
                            <svg v-else class="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 2a6 6 0 1 0 6 6" stroke-linecap="round"/></svg>
                            {{ isTesting ? t('servers.testing') : t('servers.test') }}
                        </button>

                        <button type="submit"
                            class="inline-flex items-center gap-2 rounded-lg bg-(--app-accent) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            :disabled="!canSubmit || isSaving">
                            <svg v-if="!isSaving" class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path v-if="!isEditing" d="M8 3v10M3 8h10"/>
                                <path v-else d="M2 11l4-4 3 3 5-6"/>
                            </svg>
                            <svg v-else class="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 2a6 6 0 1 0 6 6" stroke-linecap="round"/></svg>
                            {{ isSaving ? t('servers.creating') : (isEditing ? t('servers.save') : t('servers.create')) }}
                        </button>

                        <button v-if="isEditing" type="button"
                            class="inline-flex items-center gap-2 rounded-lg border border-(--app-border) bg-(--app-elevated) px-4 py-2 text-sm font-semibold"
                            :disabled="isSaving" @click="resetForm">
                            <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
                            {{ t('servers.cancel') }}
                        </button>
                    </div>
                </form>

                <p v-if="feedback" class="mt-3 text-sm"
                    :class="feedbackType === 'error' ? 'text-(--status-deleted-text)' : 'text-(--status-added-text)'">
                    {{ feedback }}
                </p>
            </article>

            <article class="rounded-2xl border border-(--app-border) bg-(--app-elevated) p-5 shadow-(--app-shadow-sm)">
                <div class="flex items-center justify-between gap-3">
                    <p class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">{{ t('servers.list')
                        }}</p>
                    <button type="button"
                        class="flex items-center justify-center rounded-lg border border-(--app-border) bg-(--app-muted-surface) p-1.5 text-(--app-text) transition hover:border-(--app-accent) disabled:opacity-50"
                        :disabled="isLoading" :title="t('servers.refresh')" @click="loadServers">
                        <RefreshCw class="h-4 w-4" :class="isLoading ? 'animate-spin' : ''" />
                    </button>
                </div>

                <p v-if="isLoading" class="mt-3 text-sm text-(--app-muted)">{{ t('servers.loading') }}</p>

                <div v-else-if="servers.length === 0"
                    class="mt-3 rounded-xl border border-dashed border-(--app-border) bg-(--app-muted-surface) px-4 py-5 text-sm text-(--app-muted)">
                    {{ t('servers.empty') }}
                </div>

                <ul v-else class="mt-3 space-y-2">
                    <li v-for="server in servers" :key="server.id"
                        class="rounded-xl border border-(--app-border) bg-(--app-muted-surface) p-3">
                        <p class="text-sm font-semibold text-(--app-text)">{{ server.name || server.host }}</p>
                        <p class="mt-1 text-xs text-(--app-muted)">{{ server.host }}:{{ server.port }} • {{
                            server.username }} • {{ server.protocol.toUpperCase() }} • {{ server.authType }}</p>

                        <div class="mt-3 flex gap-2">
                            <button type="button"
                                class="inline-flex items-center gap-1.5 rounded-md border border-(--app-border) bg-(--app-elevated) px-3 py-1.5 text-xs transition hover:border-(--app-accent) hover:text-(--app-accent)"
                                @click="beginEdit(server)">
                                <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M11.5 2.5a1.41 1.41 0 0 1 2 2L5 13H2v-3L11.5 2.5Z"/>
                                </svg>
                                {{ t('servers.edit') }}
                            </button>
                            <button type="button"
                                class="inline-flex items-center gap-1.5 rounded-md border border-(--app-border) bg-transparent px-3 py-1.5 text-xs text-(--app-muted) transition hover:border-(--status-deleted-border) hover:text-(--status-deleted-text)"
                                @click="handleDeleteServer(server.id)">
                                <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="2 4 14 4"/><path d="M5 4V2h6v2"/><path d="M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9"/>
                                </svg>
                                {{ t('servers.delete') }}
                            </button>
                        </div>
                    </li>
                </ul>
            </article>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RefreshCw } from '@lucide/vue';

import { useApi } from '../composables';
import type { GetAllServersResponseDto } from '../services/api';
import { chooseKeyFile } from '../services/api';

const { t } = useI18n({ useScope: 'global' });
const { listServers, createServer, updateServer, deleteServer, testServer } = useApi();

async function handleChooseKeyFile() {
    const content = await chooseKeyFile();
    if (content != null) form.value.secret = content;
}

const servers = ref<GetAllServersResponseDto>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const isTesting = ref(false);
const feedback = ref('');
const feedbackType = ref<'success' | 'error'>('success');
const editingServerId = ref<number | null>(null);

const form = ref({
    name: '',
    host: '',
    port: 22,
    username: '',
    authType: 'password' as 'password' | 'key',
    protocol: 'sftp' as 'ftp' | 'sftp',
    secret: '',
});

const isEditing = computed(() => editingServerId.value !== null);

const canSubmit = computed(() => (
    form.value.host.trim().length > 0
    && form.value.username.trim().length > 0
    && Number.isInteger(form.value.port)
    && form.value.port > 0
    && form.value.port < 65536
    && (isEditing.value || form.value.secret.trim().length > 0)
));

watch(
    () => form.value.protocol,
    (protocol) => {
        form.value.port = protocol === 'ftp' ? 21 : 22;
    },
);

async function loadServers(): Promise<void> {
    isLoading.value = true;

    try {
        servers.value = await listServers();
    } catch {
        feedbackType.value = 'error';
        feedback.value = t('errors.unexpected');
    } finally {
        isLoading.value = false;
    }
}

function resetForm(): void {
    editingServerId.value = null;
    form.value = {
        name: '',
        host: '',
        port: 22,
        username: '',
        authType: 'password',
        protocol: 'sftp',
        secret: '',
    };
}

function beginEdit(server: GetAllServersResponseDto[number]): void {
    editingServerId.value = server.id;
    form.value = {
        name: server.name ?? '',
        host: server.host,
        port: server.port,
        username: server.username,
        authType: server.authType,
        protocol: server.protocol,
        secret: '',
    };
}

async function handleTestConnection(): Promise<void> {
    if (!canSubmit.value) {
        return;
    }

    isTesting.value = true;
    feedback.value = '';

    try {
        const ok = await testServer({
            name: form.value.name.trim() || null,
            host: form.value.host.trim(),
            port: form.value.port,
            username: form.value.username.trim(),
            authType: form.value.authType,
            protocol: form.value.protocol,
            secret: form.value.secret,
        });

        feedbackType.value = ok ? 'success' : 'error';
        feedback.value = ok ? t('servers.testSuccess') : t('servers.testFailure');
    } catch {
        feedbackType.value = 'error';
        feedback.value = t('servers.testFailure');
    } finally {
        isTesting.value = false;
    }
}

async function handleSaveServer(): Promise<void> {
    if (!canSubmit.value) {
        return;
    }

    isSaving.value = true;
    feedback.value = '';

    try {
        if (isEditing.value && editingServerId.value !== null) {
            await updateServer({
                id: editingServerId.value,
                name: form.value.name.trim() || null,
                host: form.value.host.trim(),
                port: form.value.port,
                username: form.value.username.trim(),
                authType: form.value.authType,
                protocol: form.value.protocol,
                secret: form.value.secret.trim() ? form.value.secret : undefined,
            });
            feedbackType.value = 'success';
            feedback.value = t('servers.updated');
        } else {
            await createServer({
                name: form.value.name.trim() || null,
                host: form.value.host.trim(),
                port: form.value.port,
                username: form.value.username.trim(),
                authType: form.value.authType,
                protocol: form.value.protocol,
                secret: form.value.secret,
            });
            feedbackType.value = 'success';
            feedback.value = t('servers.created');
        }

        resetForm();
        await loadServers();
    } catch {
        feedbackType.value = 'error';
        feedback.value = t('errors.unexpected');
    } finally {
        isSaving.value = false;
    }
}

async function handleDeleteServer(serverId: number): Promise<void> {
    const accepted = window.confirm(t('servers.deleteConfirm'));

    if (!accepted) {
        return;
    }

    try {
        const deleted = await deleteServer(serverId);
        feedbackType.value = deleted ? 'success' : 'error';
        feedback.value = deleted ? t('servers.deleted') : t('errors.unexpected');

        if (editingServerId.value === serverId) {
            resetForm();
        }

        await loadServers();
    } catch {
        feedbackType.value = 'error';
        feedback.value = t('errors.unexpected');
    }
}

onMounted(() => {
    void loadServers();
});
</script>
