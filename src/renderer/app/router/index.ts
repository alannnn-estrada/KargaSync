import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

import SettingsPage from '../../pages/SettingsPage.vue';
import ServersPage from '../../pages/ServersPage.vue';
import FileExplorerPage from '../../pages/FileExplorerPage.vue';
import WorkspacePage from '../../pages/WorkspacePage.vue';

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        redirect: '/workspace',
    },
    {
        path: '/workspace',
        name: 'workspace',
        component: WorkspacePage,
    },
    {
        path: '/settings',
        name: 'settings',
        component: SettingsPage,
    },
    {
        path: '/servers',
        name: 'servers',
        component: ServersPage,
    },
    {
        path: '/explorer',
        name: 'explorer',
        component: FileExplorerPage,
    },
];

export const router = createRouter({
    history: createWebHashHistory(),
    routes,
});