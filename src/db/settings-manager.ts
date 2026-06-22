import type { AppSettings } from '../shared/settings';
import { DEFAULT_APP_SETTINGS, isSupportedLanguage, isSupportedTheme, isSupportedExternalEditor } from '../shared/settings';

import type { SqliteDatabase } from './sqlite';

export interface SettingsManager {
    getSettings: () => AppSettings;
    updateSettings: (input: Partial<AppSettings>) => AppSettings;
    ensureDefaultSettings: () => void;
}

interface SettingsRow {
    key: string;
    value: string;
}

const readSettings = (rows: SettingsRow[]): AppSettings => {
    const settingsByKey = new Map(rows.map((row) => [row.key, row.value]));
    const language = settingsByKey.get('language') ?? DEFAULT_APP_SETTINGS.language;
    const theme = settingsByKey.get('theme') ?? DEFAULT_APP_SETTINGS.theme;
    const externalEditor = settingsByKey.get('externalEditor') ?? DEFAULT_APP_SETTINGS.externalEditor;
    const customEditorPath = settingsByKey.get('customEditorPath');
    const scanConcurrencyRaw = settingsByKey.get('scanConcurrency');
    const scanConcurrencyParsed = scanConcurrencyRaw !== undefined ? parseInt(scanConcurrencyRaw, 10) : undefined;

    return {
        language: isSupportedLanguage(language) ? language : DEFAULT_APP_SETTINGS.language,
        theme: isSupportedTheme(theme) ? theme : DEFAULT_APP_SETTINGS.theme,
        externalEditor: isSupportedExternalEditor(externalEditor) ? externalEditor : DEFAULT_APP_SETTINGS.externalEditor,
        customEditorPath: customEditorPath || undefined,
        scanConcurrency: scanConcurrencyParsed !== undefined && !isNaN(scanConcurrencyParsed) ? scanConcurrencyParsed : undefined,
    };
};

export function createSettingsManager(db: SqliteDatabase): SettingsManager {
    const listSettings = db.prepare('SELECT key, value FROM app_settings ORDER BY key ASC');
    const upsertSetting = db.prepare(
        `
      INSERT INTO app_settings (key, value)
      VALUES (@key, @value)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `,
    );
    const insertSettingIfMissing = db.prepare(
        `
      INSERT INTO app_settings (key, value)
      VALUES (@key, @value)
      ON CONFLICT(key) DO NOTHING
    `,
    );

    const persistSettings = db.transaction((settings: AppSettings) => {
        upsertSetting.run({ key: 'language', value: settings.language });
        upsertSetting.run({ key: 'theme', value: settings.theme });
        upsertSetting.run({ key: 'externalEditor', value: settings.externalEditor });
        if (settings.customEditorPath !== undefined) {
            upsertSetting.run({ key: 'customEditorPath', value: settings.customEditorPath });
        }
        if (settings.scanConcurrency !== undefined) {
            upsertSetting.run({ key: 'scanConcurrency', value: String(settings.scanConcurrency) });
        }
    });

    const getSettings = (): AppSettings => readSettings(listSettings.all() as SettingsRow[]);

    const updateSettings = (input: Partial<AppSettings>): AppSettings => {
        const currentSettings = getSettings();
        const nextSettings: AppSettings = {
            language: input.language ?? currentSettings.language,
            theme: input.theme ?? currentSettings.theme,
            externalEditor: input.externalEditor ?? currentSettings.externalEditor,
            customEditorPath: input.customEditorPath !== undefined ? input.customEditorPath : currentSettings.customEditorPath,
            scanConcurrency: input.scanConcurrency !== undefined ? input.scanConcurrency : currentSettings.scanConcurrency,
        };

        persistSettings(nextSettings);

        return nextSettings;
    };

    const ensureDefaultSettings = (): void => {
        insertSettingIfMissing.run({ key: 'language', value: DEFAULT_APP_SETTINGS.language });
        insertSettingIfMissing.run({ key: 'theme', value: DEFAULT_APP_SETTINGS.theme });
        insertSettingIfMissing.run({ key: 'externalEditor', value: DEFAULT_APP_SETTINGS.externalEditor });
    };

    return {
        getSettings,
        updateSettings,
        ensureDefaultSettings,
    };
}
