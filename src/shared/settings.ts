export type SupportedLanguage = 'en' | 'es';

export type SupportedTheme = 'light' | 'dark' | 'system';

export interface AppSettings {
    language: SupportedLanguage;
    theme: SupportedTheme;
    externalEditor: ExternalEditor;
    customEditorPath?: string;
    scanConcurrency?: number;
}

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['en', 'es'];
export const SUPPORTED_THEMES: readonly SupportedTheme[] = ['light', 'dark', 'system'];

export const DEFAULT_APP_SETTINGS: AppSettings = {
    language: 'es',
    theme: 'system',
    externalEditor: 'system',
};

export type ExternalEditor = 'system' | 'vscode' | 'cursor' | 'windsurf' | 'zed' | 'notepad++' | 'custom';

export const SUPPORTED_EXTERNAL_EDITORS: readonly ExternalEditor[] = [
    'system', 'vscode', 'cursor', 'windsurf', 'zed', 'notepad++', 'custom',
];

export function isSupportedExternalEditor(value: string): value is ExternalEditor {
    return SUPPORTED_EXTERNAL_EDITORS.includes(value as ExternalEditor);
}

export function isSupportedLanguage(value: string): value is SupportedLanguage {
    return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

export function isSupportedTheme(value: string): value is SupportedTheme {
    return SUPPORTED_THEMES.includes(value as SupportedTheme);
}
