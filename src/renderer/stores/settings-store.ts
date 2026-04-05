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
    return left.language === right.language && left.theme === right.theme && left.externalEditor === right.externalEditor;
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
    const hasLoaded = ref(false);

    let saveQueue: Promise<void> = Promise.resolve();

    function applySettings(nextSettings: AppSettings): void {
        language.value = nextSettings.language;
        theme.value = nextSettings.theme;
        externalEditor.value = nextSettings.externalEditor;
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
                // DB appears to have fallen back to defaults; keep the user's last known settings and try to heal persistence.
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

    function queuePersist(): Promise<void> {
        const nextSettings: UpdateSettingsRequestDto = {
            language: language.value,
            theme: theme.value,
            externalEditor: externalEditor.value,
        };

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
        cacheSettings({ language: language.value, theme: theme.value });

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
        cacheSettings({ language: language.value, theme: theme.value });

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
        cacheSettings({ language: language.value, theme: theme.value, externalEditor: externalEditor.value });

        if (!hasLoaded.value) {
            return Promise.resolve();
        }

        return queuePersist();
    }

    return {
        language,
        theme,
        externalEditor,
        hasLoaded,
        loadSettings,
        setLanguage,
        setTheme,
        setExternalEditor,
    };
});