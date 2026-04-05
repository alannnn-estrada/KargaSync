import {
    BrowserWindow,
    Menu,
    type MenuItemConstructorOptions,
    shell,
} from 'electron';

import type { AppMenuAnchorDto } from '../../../shared/ipc/contracts';

const openedMenuByWindow = new WeakMap<BrowserWindow, Menu>();

function buildAppMenu(window: BrowserWindow): Menu {
    const template: MenuItemConstructorOptions[] = [
        {
            label: 'File',
            submenu:
                process.platform === 'darwin'
                    ? [{ role: 'close' }]
                    : [{ role: 'quit' }],
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'delete' },
                { role: 'selectAll' },
            ],
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
            ],
        },
        {
            label: 'Help',
            submenu: [
                { role: 'about', label: 'About KargaSync' },
                {
                    label: 'Learn More',
                    click: () => {
                        void shell.openExternal('https://www.electronjs.org');
                    },
                },
            ],
        },
    ];

    return Menu.buildFromTemplate(template);
}

function getPopupPosition(anchor: AppMenuAnchorDto): { x: number; y: number } {
    return {
        x: Math.max(0, Math.round(anchor.x)),
        y: Math.max(0, Math.round(anchor.y + anchor.height)),
    };
}

export function toggleAppMenu(window: BrowserWindow, anchor: AppMenuAnchorDto): void {
    const openedMenu = openedMenuByWindow.get(window);

    if (openedMenu) {
        openedMenu.closePopup(window);
        openedMenuByWindow.delete(window);
        return;
    }

    const menu = buildAppMenu(window);
    const { x, y } = getPopupPosition(anchor);

    openedMenuByWindow.set(window, menu);

    menu.once('menu-will-close', () => {
        if (openedMenuByWindow.get(window) === menu) {
            openedMenuByWindow.delete(window);
        }
    });

    menu.popup({
        window,
        x,
        y,
        callback: () => {
            if (openedMenuByWindow.get(window) === menu) {
                openedMenuByWindow.delete(window);
            }
        },
    });
}
