<template>
    <Transition name="update-banner">
        <div v-if="state"
            class="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-(--app-border) bg-(--app-elevated) p-3 shadow-lg">
            <div class="flex min-w-0 flex-1 flex-col gap-1">
                <p class="text-xs font-semibold text-(--app-text)">
                    <template v-if="state.mode === 'downloading'">{{ t('update.downloading') }}</template>
                    <template v-else-if="state.mode === 'downloaded'">{{ t('update.downloaded', { version: state.version }) }}</template>
                    <template v-else>{{ t('update.availableManual', { version: state.version }) }}</template>
                </p>
                <p v-if="state.mode === 'manual'" class="text-[11px] text-(--app-muted)">
                    {{ t('update.manualHint') }}
                </p>
                <div class="mt-1 flex gap-2">
                    <button v-if="state.mode === 'downloaded'"
                        class="rounded bg-(--app-accent) px-2.5 py-1 text-[11px] font-semibold text-white transition hover:opacity-90"
                        @click="install">
                        {{ t('update.restart') }}
                    </button>
                    <button v-else-if="state.mode === 'manual'"
                        class="rounded bg-(--app-accent) px-2.5 py-1 text-[11px] font-semibold text-white transition hover:opacity-90"
                        @click="openDownload">
                        {{ t('update.download') }}
                    </button>
                    <button
                        class="rounded border border-(--app-border) px-2.5 py-1 text-[11px] text-(--app-muted) transition hover:text-(--app-text)"
                        @click="dismiss">
                        {{ t('update.dismiss') }}
                    </button>
                </div>
            </div>

            <!-- update icon -->
            <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-(--app-accent)">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 3v9M6.5 8.5 10 12l3.5-3.5" />
                    <path d="M4 15h12" />
                </svg>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { UpdateAvailableEvent, UpdateDownloadedEvent } from '../../shared/ipc/contracts';

const { t } = useI18n({ useScope: 'global' });

interface BannerState {
    mode: 'downloading' | 'downloaded' | 'manual';
    version: string;
    url?: string;
}

const state = ref<BannerState | null>(null);

let unsubAvailable: (() => void) | null = null;
let unsubDownloaded: (() => void) | null = null;

onMounted(() => {
    unsubAvailable = window.api.onUpdateAvailable((event: UpdateAvailableEvent) => {
        state.value = { mode: event.mode, version: event.version, url: event.url };
    });
    unsubDownloaded = window.api.onUpdateDownloaded((event: UpdateDownloadedEvent) => {
        state.value = { mode: 'downloaded', version: event.version };
    });
});

onBeforeUnmount(() => {
    unsubAvailable?.();
    unsubDownloaded?.();
});

function install(): void {
    window.api.installUpdate();
}

function openDownload(): void {
    if (state.value?.url) {
        void window.api.openExternalUrl(state.value.url);
    }
}

function dismiss(): void {
    state.value = null;
}
</script>

<style scoped>
.update-banner-enter-active,
.update-banner-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}
.update-banner-enter-from,
.update-banner-leave-to {
    opacity: 0;
    transform: translateY(8px);
}
</style>
