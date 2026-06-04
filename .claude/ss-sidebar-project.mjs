import { _electron as electron } from 'playwright-core';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '..');
const SHOT_DIR = path.join(APP_DIR, '.claude', 'shots');
const TMP_DATA = path.join(os.tmpdir(), 'karga-ss-' + Date.now());
fs.mkdirSync(SHOT_DIR, { recursive: true });
const electronBin = path.join(APP_DIR, 'node_modules', 'electron', 'dist', 'electron.exe');

const app = await electron.launch({ executablePath: electronBin, args: [APP_DIR, '--user-data-dir=' + TMP_DATA], timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));
const page = app.windows().find(w => !w.url().startsWith('devtools://'));
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(1500);
// close changelog
await page.evaluate(() => { const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Cerrar'); if (btn) btn.click(); });
await page.waitForTimeout(400);

// Create a project
await page.evaluate(async () => {
    const i = [...document.querySelectorAll('input')].find(i => i.placeholder?.includes('Nombre'));
    if (i) { i.value = 'Mi Proyecto'; i.dispatchEvent(new Event('input', { bubbles: true })); }
    await new Promise(r => setTimeout(r, 200));
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Crear proyecto');
    if (btn) btn.click();
});
await page.waitForTimeout(1500);

// Expand project in sidebar
await page.evaluate(() => {
    const btns = [...document.querySelectorAll('aside button')].filter(b => b.querySelector('svg'));
    // find chevron button near project name
    if (btns.length > 2) btns[btns.length - 3]?.click();
});
await page.waitForTimeout(500);

const f = path.join(SHOT_DIR, 'sidebar-with-project.png');
await page.screenshot({ path: f });
console.log('shot:', f);

// Also zoom into sidebar
const sidebar = await page.evaluate(() => {
    const el = document.querySelector('aside');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
});
console.log('sidebar bounds:', sidebar);

await app.close();
fs.rmSync(TMP_DATA, { recursive: true, force: true });
