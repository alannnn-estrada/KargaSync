<template>
    <section class="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col gap-6 px-3 py-3 md:px-4 md:py-4">
        <header class="rounded-3xl border border-(--app-border) bg-(--app-surface) px-5 py-4 shadow-(--app-shadow)">
            <p class="text-[11px] font-medium uppercase tracking-[0.18em] text-(--app-muted)">{{ t('servers.section') }}
            </p>
            <h1 class="mt-1 text-xl font-semibold tracking-tight text-(--app-text)">{{ t('servers.title') }}</h1>
            <p class="mt-2 max-w-2xl text-sm text-(--app-muted)">{{ t('servers.description') }}</p>
        </header>

        <div class="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
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
                            <input v-model="form.secret" :type="form.authType === 'password' ? 'password' : 'text'"
                                class="mt-2 w-full rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm outline-none ring-(--app-accent) transition focus:ring-1"
                                :placeholder="form.authType === 'password' ? t('servers.passwordPlaceholder') : t('servers.keyPlaceholder')"
                                :disabled="isSaving" />
                        </label>
                    </div>

                    <p v-if="isEditing" class="text-xs text-(--app-muted)">{{ t('servers.editSecretHint') }}</p>

                    <div class="mt-1 flex flex-wrap items-center gap-2">
                        <button type="button"
                            class="rounded-lg border border-(--app-border) bg-(--app-muted-surface) px-4 py-2 text-sm font-semibold text-(--app-text) transition hover:border-(--app-accent)"
                            :disabled="!canSubmit || isTesting" @click="handleTestConnection">
                            {{ isTesting ? t('servers.testing') : t('servers.test') }}
                        </button>

                        <button type="submit"
                            class="rounded-lg bg-(--app-accent) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            :disabled="!canSubmit || isSaving">
                            {{ isSaving ? t('servers.creating') : (isEditing ? t('servers.save') : t('servers.create'))
                            }}
                        </button>

                        <button v-if="isEditing" type="button"
                            class="rounded-lg border border-(--app-border) bg-(--app-elevated) px-4 py-2 text-sm font-semibold"
                            :disabled="isSaving" @click="resetForm">
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
                        class="rounded-lg border border-(--app-border) bg-(--app-muted-surface) px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-(--app-text) transition hover:border-(--app-accent)"
                        :disabled="isLoading" @click="loadServers">
                        {{ t('servers.refresh') }}
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
                                class="rounded-md border border-(--app-border) bg-(--app-elevated) px-3 py-1.5 text-xs"
                                @click="beginEdit(server)">
                                {{ t('servers.edit') }}
                            </button>
                            <button type="button"
                                class="rounded-md border border-(--status-deleted-border) bg-(--status-deleted-bg) px-3 py-1.5 text-xs text-(--status-deleted-text)"
                                @click="handleDeleteServer(server.id)">
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

import { useApi } from '../composables';
import type { GetAllServersResponseDto } from '../services/api';

const { t } = useI18n({ useScope: 'global' });
const { listServers, createServer, updateServer, deleteServer, testServer } = useApi();

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
