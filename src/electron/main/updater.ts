import { autoUpdater, BrowserWindow, app, ipcMain } from 'electron';
import { UPDATE_CHANNELS, type UpdateAvailableEvent } from '../../shared/ipc/contracts';

const GITHUB_REPO = 'alann-estrada-KSH/KargaSync';

function getMainWindow(): BrowserWindow | null {
    const wins = BrowserWindow.getAllWindows().filter(w => !w.isDestroyed());
    return wins[0] ?? null;
}

function sendToRenderer(channel: string, data: unknown): void {
    const win = getMainWindow();
    if (win && !win.webContents.isDestroyed()) {
        win.webContents.send(channel, data);
    }
}

function isNewer(latest: string, current: string): boolean {
    const parse = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0);
    const [la, lb, lc] = parse(latest);
    const [ca, cb, cc] = parse(current);
    return la !== ca ? la > ca : lb !== cb ? lb > cb : lc > cc;
}

async function checkGitHubRelease(): Promise<void> {
    const currentVersion = app.getVersion();
    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
            headers: { 'User-Agent': `KargaSync/${currentVersion}` },
        });
        if (!res.ok) return;
        const data = await res.json() as { tag_name?: string; html_url?: string };
        const latest = (data.tag_name ?? '').replace(/^v/, '');
        if (latest && isNewer(latest, currentVersion)) {
            const event: UpdateAvailableEvent = { version: latest, url: data.html_url, mode: 'manual' };
            sendToRenderer(UPDATE_CHANNELS.available, event);
        }
    } catch {
        // network failure — ignore silently
    }
}

function setupSquirrelUpdater(): void {
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
    const version = app.getVersion();
    try {
        autoUpdater.setFeedURL({
            url: `https://update.electronjs.org/${GITHUB_REPO}/win32-${arch}/${version}`,
            serverType: 'json',
        });
        // Only listen to downloaded — GitHub API already handles the "available" notification.
        // If Squirrel succeeds, upgrade the banner to "Restart to install".
        autoUpdater.on('update-downloaded', (_e: unknown, _notes: unknown, releaseName: string) => {
            sendToRenderer(UPDATE_CHANNELS.downloaded, { version: releaseName ?? 'latest' });
        });
        autoUpdater.on('error', (err: Error) => {
            console.error('[updater] Squirrel error:', err.message);
            // GitHub API notification is already shown — user can still click Download.
        });
        setTimeout(() => autoUpdater.checkForUpdates(), 5000);
    } catch (err) {
        console.error('[updater] Squirrel init failed:', err);
    }
}

export function initUpdater(): void {
    if (!app.isPackaged) return;

    ipcMain.on(UPDATE_CHANNELS.install, () => autoUpdater.quitAndInstall());

    // All platforms: GitHub API detects new version → shows banner with Download link.
    setTimeout(() => void checkGitHubRelease(), 5000);

    // Windows only: Squirrel also runs silently in background.
    // If download succeeds, banner upgrades from "Download" → "Restart to install".
    // If Squirrel fails, user still has the Download button from GitHub API check above.
    if (process.platform === 'win32') {
        setupSquirrelUpdater();
    }
}
