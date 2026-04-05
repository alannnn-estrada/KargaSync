<template>
    <section class="rounded-2xl border border-(--app-border) bg-(--app-elevated) p-4 shadow-(--app-shadow-sm)">
        <div>
            <p class="text-[11px] font-medium uppercase tracking-[0.18em] text-(--app-muted)">
                {{ t('settings.section') }}
            </p>
            <h2 class="mt-1 text-base font-semibold text-(--app-text)">
                {{ t('settings.title') }}
            </h2>
        </div>

        <p class="mt-2 text-sm text-(--app-muted)">
            {{ t('settings.description') }}
        </p>

        <div class="mt-4 space-y-4">
            <label class="block">
                <span class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">
                    {{ t('settings.language') }}
                </span>
                <select v-model="languageModel"
                    class="mt-2 w-full rounded-xl border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm outline-none ring-(--app-accent) transition focus:ring-1">
                    <option value="es">
                        {{ t('settings.spanish') }}
                    </option>
                    <option value="en">
                        {{ t('settings.english') }}
                    </option>
                </select>
            </label>

            <label class="block">
                <span class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">
                    {{ t('settings.theme') }}
                </span>
                <select v-model="themeModel"
                    class="mt-2 w-full rounded-xl border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm outline-none ring-(--app-accent) transition focus:ring-1">
                    <option value="system">
                        {{ t('settings.system') }}
                    </option>
                    <option value="light">
                        {{ t('settings.light') }}
                    </option>
                    <option value="dark">
                        {{ t('settings.dark') }}
                    </option>
                </select>
            </label>

            <label class="block">
                <span class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">
                    {{ t('settings.externalEditor') }}
                </span>
                <select v-model="externalEditorModel"
                    class="mt-2 w-full rounded-xl border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm outline-none ring-(--app-accent) transition focus:ring-1">
                    <option value="system">{{ t('settings.externalEditorSystem') }}</option>
                    <option value="vscode">{{ t('settings.externalEditorVscode') }}</option>
                </select>
            </label>

            <div class="rounded-xl border border-(--app-border) bg-(--app-muted-surface) p-3.5">
                <p class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">
                    {{ t('changelog.title') }}
                </p>
                <p class="mt-1 text-sm text-(--app-muted)">
                    {{ t('changelog.settingsHint') }}
                </p>
                <button type="button"
                    class="mt-3 inline-flex items-center rounded-lg border border-(--app-border) bg-(--app-elevated) px-3 py-2 text-sm font-medium text-(--app-text) transition hover:border-(--app-accent) hover:text-(--app-accent)"
                    @click="openChangelog">
                    {{ t('changelog.viewInSettings') }}
                </button>
            </div>
        </div>

        <p class="mt-3 text-xs text-(--app-muted)">
            {{ t('settings.autoSave') }}
        </p>
    </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { SupportedLanguage, SupportedTheme, ExternalEditor } from '../../shared/settings';
import { useSettingsStore } from '../stores';
import { useChangelogStore } from '../stores/changelog-store';

const { t } = useI18n({ useScope: 'global' });
const settingsStore = useSettingsStore();
const changelogStore = useChangelogStore();

const languageModel = computed<SupportedLanguage>({
    get: () => settingsStore.language,
    set: (value) => {
        void settingsStore.setLanguage(value);
    },
});

const themeModel = computed<SupportedTheme>({
    get: () => settingsStore.theme,
    set: (value) => {
        void settingsStore.setTheme(value);
    },
});

const externalEditorModel = computed<ExternalEditor>({
    get: () => settingsStore.externalEditor,
    set: (value) => {
        void settingsStore.setExternalEditor(value);
    },
});

function openChangelog(): void {
    changelogStore.openModal();
}
</script>