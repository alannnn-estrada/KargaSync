<template>
    <section class="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col gap-6 px-3 py-3 md:px-4 md:py-4">
        <header class="flex items-center gap-3 rounded-xl border border-(--app-border) bg-(--app-surface) px-4 py-3 shadow-(--app-shadow-sm)">
            <p class="text-[11px] font-medium uppercase tracking-[0.18em] text-(--app-muted)">{{ t('settings.section') }}</p>
            <span class="h-3 w-px bg-(--app-border)" />
            <h1 class="text-sm font-semibold tracking-tight text-(--app-text)">{{ t('settings.title') }}</h1>
        </header>

        <SettingsPanel />
    </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import { SettingsPanel } from '../components';

const { t } = useI18n({ useScope: 'global' });
</script>