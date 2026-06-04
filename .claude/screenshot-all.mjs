import { _electron as electron } from 'playwright-core';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '..');
const SHOT_DIR = path.join(APP_DIR, '.claude', 'shots');
const TMP_DATA = path.join(os.tmpdir(), 'karga-pw-' + Date.now());
fs.mkdirSync(SHOT_DIR, { recursive: true });

const electronBin = path.join(APP_DIR, 'node_modules', 'electron', 'dist', 'electron.exe');

console.log('Launching...');
const app = await electron.launch({
    executablePath: electronBin,
    args: [APP_DIR, '--user-data-dir=' + TMP_DATA],
    env: { ...process.env },
    timeout: 30000,
});

await new Promise(r => setTimeout(r, 5000));
let page = app.windows().find(w => !w.url().startsWith('devtools://'));
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(1500);

// close changelog modal if open
await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Cerrar') || b.textContent?.includes('Close'));
    if (btn) btn.click();
});
await page.waitForTimeout(500);

// expand sidebar
await page.evaluate(() => {
    const collapsed = document.querySelector('.app-shell.is-collapsed');
    if (collapsed) {
        // click collapse button to expand
        const btn = document.querySelector('button[title*="xpand"], button[aria-label*="xpand"]');
        if (btn) btn.click();
    }
});
await page.waitForTimeout(400);

async function shot(name) {
    const f = path.join(SHOT_DIR, name + '.png');
    await page.screenshot({ path: f });
    console.log('shot:', name);
}

async function nav(hash) {
    await page.evaluate(h => { window.location.hash = h; }, hash);
    await page.waitForTimeout(800);
}

async function setTheme(dark) {
    await page.evaluate(d => {
        document.documentElement.classList.toggle('dark', d);
        document.documentElement.style.colorScheme = d ? 'dark' : 'light';
    }, dark);
    await page.waitForTimeout(300);
}

// Light mode
await setTheme(false);
await nav('#/workspace');
await shot('01-workspace-light');
await nav('#/servers');
await shot('02-servers-light');
await nav('#/explorer');
await shot('03-explorer-light');
await nav('#/settings');
await shot('04-settings-light');

// Dark mode
await setTheme(true);
await nav('#/workspace');
await shot('05-workspace-dark');
await nav('#/servers');
await shot('06-servers-dark');
await nav('#/explorer');
await shot('07-explorer-dark');
await nav('#/settings');
await shot('08-settings-dark');

await app.close();
fs.rmSync(TMP_DATA, { recursive: true, force: true });
console.log('Done:', SHOT_DIR);
