<template>
    <section class="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col gap-6 px-3 py-3 md:px-4 md:py-4">
        <header class="rounded-3xl border border-(--app-border) bg-(--app-surface) px-5 py-4 shadow-(--app-shadow)">
            <p class="text-[11px] font-medium uppercase tracking-[0.18em] text-(--app-muted)">{{ t('settings.section')
                }}</p>
            <h1 class="mt-1 text-xl font-semibold tracking-tight text-(--app-text)">{{ t('settings.title') }}</h1>
            <p class="mt-2 max-w-2xl text-sm text-(--app-muted)">{{ t('settings.description') }}</p>
        </header>

        <SettingsPanel />
    </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import { SettingsPanel } from '../components';

const { t } = useI18n({ useScope: 'global' });
</script>