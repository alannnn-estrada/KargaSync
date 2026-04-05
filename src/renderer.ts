/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import { createApp, watch } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './index.css';
import { router } from './renderer/app/router';
import { createRendererI18n } from './renderer/i18n';
import { useSettingsStore, useProjectComparisonStore } from './renderer/stores';
import { useSidebarStore } from './renderer/stores';
import { getProjects } from './renderer/services/api';
import type { SupportedTheme } from './shared/settings';

const app = createApp(App);
const pinia = createPinia();
const settingsStore = useSettingsStore(pinia);

app.use(pinia);
app.use(router);

function resolveTheme(theme: SupportedTheme): 'light' | 'dark' {
    if (theme !== 'system') {
        return theme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: SupportedTheme): void {
    const resolvedTheme = resolveTheme(theme);
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    document.documentElement.style.colorScheme = resolvedTheme;
}

async function bootstrap(): Promise<void> {
    applyTheme(settingsStore.theme);

    try {
        await settingsStore.loadSettings();
    } catch {
        // Fall back to the in-memory defaults when persistence is unavailable.
    }

    const i18n = createRendererI18n(settingsStore.language);
    app.use(i18n);

    // Hydrate project list into Pinia on renderer bootstrap so the app has
    // persisted projects available immediately (avoids relying only on page
    // components to load them).
    try {
        const projectStore = useProjectComparisonStore(pinia);
        const nextProjects = await getProjects();
        projectStore.setProjects(nextProjects);

        if (!projectStore.selectedProject && nextProjects.length > 0) {
            projectStore.setSelectedProject(nextProjects[0]);
        }
    } catch (err) {
        // Fail gracefully; individual pages will surface load errors.
        // Avoid blocking app bootstrap if DB or IPC is temporarily unavailable.
        // eslint-disable-next-line no-console
        console.warn('Failed to hydrate projects on bootstrap:', err);
    }

    try {
        const sidebarStore = useSidebarStore(pinia);
        sidebarStore.load();
    } catch {
        // ignore
    }

    const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncTheme = () => {
        applyTheme(settingsStore.theme);
    };

    watch(
        () => settingsStore.language,
        (nextLocale) => {
            document.documentElement.lang = nextLocale;
            i18n.global.locale.value = nextLocale;
        },
        { immediate: true },
    );

    watch(
        () => settingsStore.theme,
        () => {
            syncTheme();
        },
        { immediate: true },
    );

    if (typeof systemThemeQuery.addEventListener === 'function') {
        systemThemeQuery.addEventListener('change', syncTheme);
    } else {
        systemThemeQuery.addListener(syncTheme);
    }

    document.documentElement.lang = settingsStore.language;

    app.mount('#app');
}

void bootstrap();
