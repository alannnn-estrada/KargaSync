import type { AppSettings, SupportedLanguage, SupportedTheme, ExternalEditor } from '../settings';

export type GetSettingsResponseDTO = AppSettings;

export interface UpdateSettingsRequestDTO {
    language?: SupportedLanguage;
    theme?: SupportedTheme;
    externalEditor?: ExternalEditor;
    customEditorPath?: string;
}

export type UpdateSettingsResponseDTO = GetSettingsResponseDTO;
