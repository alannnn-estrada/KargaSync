import { app, BrowserWindow, Menu, nativeImage } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Suppress Node.js experimental warnings (e.g. node:sqlite) — these are expected in Electron
process.removeAllListeners('warning');
process.on('warning', (w) => { if (w.name !== 'ExperimentalWarning') process.stderr.write(`${w.name}: ${w.message}\n`); });

import { initializeDatabase, type DatabaseHandle } from '../../db/bootstrap';
import { registerIpcHandlers } from './ipc/register-ipc-handlers';
import { createMainWindow } from './windows/create-main-window';
import { initUpdater } from './updater';

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (started) {
    app.quit();
}

if (!gotSingleInstanceLock) {
    app.quit();
}

let database: DatabaseHandle | null = null;

const onReady = (): void => {
    app.setName('KargaSync');
    Menu.setApplicationMenu(null);

    const appLogoPath = path.join(app.getAppPath(), 'src', 'assets', 'icons', '512x512.png');

    if (process.platform === 'darwin') {
        app.dock?.setIcon(nativeImage.createFromPath(appLogoPath));
    }

    database = initializeDatabase({
        filePath: path.join(app.getPath('userData'), 'karga-sync.sqlite3'),
    });

    try {
        registerIpcHandlers(database);
        console.log('[karga-sync] IPC handlers registered');
    } catch (error) {
        console.error('[karga-sync] Failed to register IPC handlers', error);
        throw error;
    }

    createMainWindow();
    initUpdater();
};

app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows();

    if (windows.length > 0) {
        const window = windows[0];
        if (window.isMinimized()) {
            window.restore();
        }

        window.show();
        window.focus();
    }
});

const onActivate = (): void => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
};

const onWindowAllClosed = (): void => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
};

const onBeforeQuit = (): void => {
    database?.close();
    database = null;
};

app.whenReady().then(onReady);
app.on('activate', onActivate);
app.on('window-all-closed', onWindowAllClosed);
app.on('before-quit', onBeforeQuit);
