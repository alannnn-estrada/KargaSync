import { app, BrowserWindow } from 'electron';
import path from 'node:path';

export const createMainWindow = (): BrowserWindow => {
    const iconPath = path.join(app.getAppPath(), 'src', 'assets', 'logo.png');

    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1024,
        minHeight: 640,
        show: false,
        title: 'KargaSync',
        icon: iconPath,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.removeMenu();

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        void mainWindow.loadFile(
            path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
        );
    }

    if (!BrowserWindow.getFocusedWindow() && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    return mainWindow;
};
