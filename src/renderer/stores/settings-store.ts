import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { GetSettingsResponseDto, UpdateSettingsRequestDto } from '../services';
import { getSettings, updateSettings } from '../services';
import {
    DEFAULT_APP_SETTINGS,
    isSupportedLanguage,
    isSupportedTheme,
    isSupportedExternalEditor,
    type AppSettings,
    type SupportedLanguage,
    type SupportedTheme,
    type ExternalEditor,
} from '../../shared/settings';

const SETTINGS_CACHE_KEY = 'karga-sync.settings-cache';

function areSettingsEqual(left: AppSettings, right: AppSettings): boolean {
    return (
        left.language === right.language &&
        left.theme === right.theme &&
        left.externalEditor === right.externalEditor &&
        (left.customEditorPath ?? '') === (right.customEditorPath ?? '') &&
        (left.scanConcurrency ?? 0) === (right.scanConcurrency ?? 0)
    );
}

function isDefaultSettings(settings: AppSettings): boolean {
    return areSettingsEqual(settings, DEFAULT_APP_SETTINGS);
}

function readCachedSettings(): AppSettings | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const raw = window.localStorage.getItem(SETTINGS_CACHE_KEY);

    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as Partial<AppSettings>;

        if (!parsed.language || !parsed.theme || !parsed.externalEditor) {
            return null;
        }

        if (!isSupportedLanguage(parsed.language) || !isSupportedTheme(parsed.theme) || !isSupportedExternalEditor(parsed.externalEditor)) {
            return null;
        }

        return {
            language: parsed.language,
            theme: parsed.theme,
            externalEditor: parsed.externalEditor,
            customEditorPath: typeof parsed.customEditorPath === 'string' ? parsed.customEditorPath : undefined,
            scanConcurrency: typeof parsed.scanConcurrency === 'number' ? parsed.scanConcurrency : undefined,
        };
    } catch {
        return null;
    }
}

function cacheSettings(settings: AppSettings): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
}

export const useSettingsStore = defineStore('settings', () => {
    const language = ref<SupportedLanguage>(DEFAULT_APP_SETTINGS.language);
    const theme = ref<SupportedTheme>(DEFAULT_APP_SETTINGS.theme);
    const externalEditor = ref<ExternalEditor>(DEFAULT_APP_SETTINGS.externalEditor);
    const customEditorPath = ref<string>('');
    const scanConcurrency = ref<number>(0);
    const hasLoaded = ref(false);

    let saveQueue: Promise<void> = Promise.resolve();

    function applySettings(nextSettings: AppSettings): void {
        language.value = nextSettings.language;
        theme.value = nextSettings.theme;
        externalEditor.value = nextSettings.externalEditor;
        customEditorPath.value = nextSettings.customEditorPath ?? '';
        scanConcurrency.value = nextSettings.scanConcurrency ?? 0;
        cacheSettings(nextSettings);
    }

    async function loadSettings(): Promise<void> {
        const cachedSettings = readCachedSettings();

        if (cachedSettings) {
            applySettings(cachedSettings);
        }

        try {
            const nextSettings: GetSettingsResponseDto = await getSettings();

            if (cachedSettings && isDefaultSettings(nextSettings) && !isDefaultSettings(cachedSettings)) {
                await updateSettings(cachedSettings);
                applySettings(cachedSettings);
                return;
            }

            applySettings(nextSettings);
        } catch (error) {
            console.error(error);

            if (!cachedSettings) {
                applySettings(DEFAULT_APP_SETTINGS);
            }
        } finally {
            hasLoaded.value = true;
        }
    }

    function buildCurrentSettings(): UpdateSettingsRequestDto {
        return {
            language: language.value,
            theme: theme.value,
            externalEditor: externalEditor.value,
            customEditorPath: customEditorPath.value || undefined,
            scanConcurrency: scanConcurrency.value,
        };
    }

    function queuePersist(): Promise<void> {
        const nextSettings = buildCurrentSettings();

        saveQueue = saveQueue.then(async () => {
            const savedSettings = await updateSettings(nextSettings);
            applySettings(savedSettings);
        }).catch((error) => {
            console.error(error);
        });

        return saveQueue;
    }

    function setLanguage(nextLanguage: SupportedLanguage): Promise<void> {
        if (language.value === nextLanguage) {
            return Promise.resolve();
        }

        language.value = nextLanguage;
        cacheSettings({ language: language.value, theme: theme.value, externalEditor: externalEditor.value, customEditorPath: customEditorPath.value || undefined, scanConcurrency: scanConcurrency.value });

        if (!hasLoaded.value) {
            return Promise.resolve();
        }

        return queuePersist();
    }

    function setTheme(nextTheme: SupportedTheme): Promise<void> {
        if (theme.value === nextTheme) {
            return Promise.resolve();
        }

        theme.value = nextTheme;
        cacheSettings({ language: language.value, theme: theme.value, externalEditor: externalEditor.value, customEditorPath: customEditorPath.value || undefined, scanConcurrency: scanConcurrency.value });

        if (!hasLoaded.value) {
            return Promise.resolve();
        }

        return queuePersist();
    }

    function setExternalEditor(next: ExternalEditor): Promise<void> {
        if (externalEditor.value === next) {
            return Promise.resolve();
        }

        externalEditor.value = next;
        cacheSettings({ language: language.value, theme: theme.value, externalEditor: externalEditor.value, customEditorPath: customEditorPath.value || undefined, scanConcurrency: scanConcurrency.value });

        if (!hasLoaded.value) {
            return Promise.resolve();
        }

        return queuePersist();
    }

    function setCustomEditorPath(next: string): Promise<void> {
        customEditorPath.value = next;
        cacheSettings({ language: language.value, theme: theme.value, externalEditor: externalEditor.value, customEditorPath: next || undefined, scanConcurrency: scanConcurrency.value });

        if (!hasLoaded.value) {
            return Promise.resolve();
        }

        return queuePersist();
    }

    function setScanConcurrency(next: number): Promise<void> {
        scanConcurrency.value = Math.max(0, Math.floor(next));
        cacheSettings({ language: language.value, theme: theme.value, externalEditor: externalEditor.value, customEditorPath: customEditorPath.value || undefined, scanConcurrency: scanConcurrency.value });

        if (!hasLoaded.value) {
            return Promise.resolve();
        }

        return queuePersist();
    }

    return {
        language,
        theme,
        externalEditor,
        customEditorPath,
        scanConcurrency,
        hasLoaded,
        loadSettings,
        setLanguage,
        setTheme,
        setExternalEditor,
        setCustomEditorPath,
        setScanConcurrency,
    };
});
