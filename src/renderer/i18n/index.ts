import { createI18n } from 'vue-i18n';

import en from './locales/en.json';
import es from './locales/es.json';
import { DEFAULT_APP_SETTINGS, isSupportedLanguage, type SupportedLanguage } from '../../shared/settings';

export const SUPPORTED_LOCALES = ['es', 'en'] as const;
export type SupportedLocale = SupportedLanguage;

export const DEFAULT_LOCALE: SupportedLocale = DEFAULT_APP_SETTINGS.language;

const messages = {
    en,
    es,
} as const;

function isSupportedLocale(locale: string): locale is SupportedLocale {
    return isSupportedLanguage(locale);
}

export function resolveLocale(input?: string | null): SupportedLocale {
    if (!input) {
        return DEFAULT_LOCALE;
    }

    const normalized = input.toLowerCase();

    if (normalized.startsWith('en')) {
        return 'en';
    }

    if (normalized.startsWith('es')) {
        return 'es';
    }

    const baseLocale = normalized.split('-')[0] ?? '';

    if (isSupportedLocale(baseLocale)) {
        return baseLocale;
    }

    return DEFAULT_LOCALE;
}

export function getInitialLocale(): SupportedLocale {
    if (typeof window === 'undefined') {
        return DEFAULT_LOCALE;
    }

    const browserLocale = window.navigator.languages?.[0] ?? window.navigator.language;
    return resolveLocale(browserLocale);
}

export function createRendererI18n(initialLocale: SupportedLocale = getInitialLocale()) {
    const locale = resolveLocale(initialLocale);

    return createI18n({
        legacy: false,
        globalInjection: true,
        locale,
        fallbackLocale: DEFAULT_LOCALE,
        messages,
    });
}

export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export function formatUiErrorMessage(error: unknown, t: TranslateFn): string {
    const message = error instanceof Error ? error.message : String(error ?? '');

    const patterns: Array<[RegExp, string, Record<string, string | number>?]> = [
        [/^Renderer API is not available\. Check preload and contextBridge setup\.$/, 'errors.rendererUnavailable'],
        [/^Failed to load projects\.$/, 'errors.loadProjects'],
        [/^Failed to compare environments\.$/, 'errors.compareEnvironments'],
        [/^Failed to create project\.$/, 'errors.createProject'],
        [/^Failed to load settings\.$/, 'errors.loadSettings'],
        [/^Failed to update settings\.$/, 'errors.updateSettings'],
        [/^Project not found: (\d+)$/, 'errors.projectNotFound', { id: 1 }],
        [/^Environment not found: (\d+)$/, 'errors.environmentNotFound', { id: 1 }],
        [/^Environment (\d+) does not belong to project (\d+)\.?$/, 'errors.environmentMismatch', { environmentId: 1, projectId: 2 }],
        [/^Snapshot not found: (\d+)$/, 'errors.snapshotNotFound', { id: 1 }],
        [/^Source snapshot not found: (\d+)$/, 'errors.sourceSnapshotNotFound', { id: 1 }],
        [/^Target snapshot not found: (\d+)$/, 'errors.targetSnapshotNotFound', { id: 1 }],
        [/^No snapshot found for source environment ID: (\d+)$/, 'errors.noSourceSnapshotById', { id: 1 }],
        [/^No snapshot found for target environment ID: (\d+)$/, 'errors.noTargetSnapshotById', { id: 1 }],
        [/^No snapshot found for source environment: (.+) in project (\d+)$/, 'errors.noSourceSnapshotByName', { environmentName: 1, projectId: 2 }],
        [/^No snapshot found for target environment: (.+) in project (\d+)$/, 'errors.noTargetSnapshotByName', { environmentName: 1, projectId: 2 }],
        [/^No remote environment binding matched environment (\d+)\.?$/, 'errors.remoteBindingNotFound', { environmentId: 1 }],
        [/^Multiple remote bindings matched environment (\d+)\..*$/, 'errors.remoteBindingAmbiguous', { environmentId: 1 }],
        [/^Connection (\d+) referenced by binding (\d+) was not found\.?$/, 'errors.connectionNotFound', { connectionId: 1, bindingId: 2 }],
        [/^Environment binding (\d+) has no connection ID\.?$/, 'errors.bindingMissingConnection', { bindingId: 1 }],
        [/^Environment binding (\d+) has no remote path\.?$/, 'errors.bindingMissingRemotePath', { bindingId: 1 }],
        [/^Failed to upsert file record for path: (.+)$/, 'errors.fileRecordUpsertFailed', { path: 1 }],
        [/^Snapshot insert failed\.$/, 'errors.snapshotInsertFailed'],
        [/^Project insert failed\.$/, 'errors.projectInsertFailed'],
        [/^Environment insert failed\.$/, 'errors.environmentInsertFailed'],
        [/^Connection insert failed\.$/, 'errors.connectionInsertFailed'],
        [/^Backup insert failed\.$/, 'errors.backupInsertFailed'],
        [/^Unexpected SQLite result shape\.$/, 'errors.unexpectedSqliteResult'],
        [/^No snapshot found for source environment ID: (\d+)$/, 'errors.noSourceSnapshotById', { id: 1 }],
        [/^No snapshot found for target environment ID: (\d+)$/, 'errors.noTargetSnapshotById', { id: 1 }],
    ];

    for (const [pattern, key, paramMap] of patterns) {
        const match = message.match(pattern);

        if (!match) {
            continue;
        }

        const params = paramMap
            ? Object.fromEntries(
                Object.entries(paramMap).map(([name, position]) => [name, match[position] ?? '']),
            )
            : undefined;

        return t(key, params);
    }

    if (!message) {
        return t('errors.unexpected');
    }

    return message;
}