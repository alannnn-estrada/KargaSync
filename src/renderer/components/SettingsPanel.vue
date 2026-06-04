<template>
    <section class="rounded-2xl border border-(--app-border) bg-(--app-elevated) p-5 shadow-(--app-shadow-sm)">
        <div class="space-y-5">
            <!-- Language -->
            <div>
                <p class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">
                    {{ t('settings.language') }}
                </p>
                <div class="mt-2 flex gap-2">
                    <button
                        v-for="opt in languageOptions"
                        :key="opt.value"
                        type="button"
                        class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition"
                        :class="languageModel === opt.value
                            ? 'border-(--app-accent) bg-(--app-accent)/10 text-(--app-accent)'
                            : 'border-(--app-border) bg-(--app-muted-surface) text-(--app-muted) hover:border-(--app-border) hover:text-(--app-text)'"
                        @click="languageModel = opt.value">
                        {{ opt.label }}
                    </button>
                </div>
            </div>

            <!-- Theme -->
            <div>
                <p class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">
                    {{ t('settings.theme') }}
                </p>
                <div class="mt-2 flex gap-2">
                    <button
                        v-for="opt in themeOptions"
                        :key="opt.value"
                        type="button"
                        class="flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition"
                        :class="themeModel === opt.value
                            ? 'border-(--app-accent) bg-(--app-accent)/10 text-(--app-accent)'
                            : 'border-(--app-border) bg-(--app-muted-surface) text-(--app-muted) hover:border-(--app-border) hover:text-(--app-text)'"
                        @click="themeModel = opt.value">
                        <span class="block text-center text-base leading-none">{{ opt.icon }}</span>
                        <span class="mt-1 block text-center text-xs">{{ t(`settings.${opt.value}`) }}</span>
                    </button>
                </div>
            </div>

            <!-- External editor -->
            <div>
                <p class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">
                    {{ t('settings.externalEditor') }}
                </p>
                <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    <button
                        v-for="opt in editorOptions"
                        :key="opt.value"
                        type="button"
                        class="rounded-lg border px-3 py-2 text-sm font-medium transition"
                        :class="externalEditorModel === opt.value
                            ? 'border-(--app-accent) bg-(--app-accent)/10 text-(--app-accent)'
                            : 'border-(--app-border) bg-(--app-muted-surface) text-(--app-muted) hover:border-(--app-border) hover:text-(--app-text)'"
                        @click="externalEditorModel = opt.value">
                        <span class="block text-center text-base leading-none">{{ opt.icon }}</span>
                        <span class="mt-0.5 block truncate text-center text-xs">{{ opt.label }}</span>
                    </button>
                </div>

                <!-- Custom editor path — only show when "custom" is selected -->
                <div v-if="externalEditorModel === 'custom'" class="mt-3">
                    <label class="block text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">
                        {{ t('settings.customEditorPath') }}
                    </label>
                    <input
                        v-model="customPathModel"
                        type="text"
                        class="mt-2 w-full rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm text-(--app-text) outline-none ring-(--app-accent) transition focus:ring-1"
                        :placeholder="t('settings.customEditorPathPlaceholder')"
                        @blur="saveCustomPath" />
                    <p class="mt-1 text-xs text-(--app-muted)">{{ t('settings.customEditorPathHint') }}</p>
                </div>
            </div>

            <!-- Changelog -->
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

        <p class="mt-4 text-xs text-(--app-muted)">
            {{ t('settings.autoSave') }}
        </p>
    </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { SupportedLanguage, SupportedTheme, ExternalEditor } from '../../shared/settings';
import { useSettingsStore } from '../stores';
import { useChangelogStore } from '../stores/changelog-store';

const { t } = useI18n({ useScope: 'global' });
const settingsStore = useSettingsStore();
const changelogStore = useChangelogStore();

const languageOptions: { value: SupportedLanguage; label: string }[] = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
];

const themeOptions: { value: SupportedTheme; icon: string }[] = [
    { value: 'system', icon: '💻' },
    { value: 'light', icon: '☀️' },
    { value: 'dark', icon: '🌙' },
];

const editorOptions: { value: ExternalEditor; label: string; icon: string }[] = [
    { value: 'system', label: 'System', icon: '🖥️' },
    { value: 'vscode', label: 'VS Code', icon: '🔵' },
    { value: 'cursor', label: 'Cursor', icon: '⚡' },
    { value: 'windsurf', label: 'Windsurf', icon: '🌊' },
    { value: 'zed', label: 'Zed', icon: '🔷' },
    { value: 'notepad++', label: 'Notepad++', icon: '📝' },
    { value: 'custom', label: 'Custom', icon: '🔧' },
];

const customPathModel = ref(settingsStore.customEditorPath);

watch(() => settingsStore.customEditorPath, (v) => {
    customPathModel.value = v;
});

function saveCustomPath() {
    void settingsStore.setCustomEditorPath(customPathModel.value);
}

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
