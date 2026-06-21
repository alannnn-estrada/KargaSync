import { _electron as electron } from 'playwright-core';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '..');
const SHOT_DIR = path.join(APP_DIR, '.claude', 'shots');
const TMP_DATA = path.join(os.tmpdir(), 'ks-icons-' + Date.now());

const app = await electron.launch({ executablePath: path.join(APP_DIR, 'node_modules/electron/dist/electron.exe'), args: [APP_DIR, '--user-data-dir=' + TMP_DATA], timeout: 30000 });
await new Promise(r => setTimeout(r, 6000));
const page = app.windows().find(w => !w.url().startsWith('devtools://'));
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(2000);
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Cerrar'); if (b) b.click(); });
await page.waitForTimeout(500);

// Create project
await page.evaluate(() => {
    const i = [...document.querySelectorAll('input')].find(i => i.placeholder?.includes('Nombre'));
    if (i) { i.value = 'Sitio Web'; i.dispatchEvent(new Event('input', { bubbles: true })); }
});
await page.waitForTimeout(200);
await page.evaluate(() => { const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Crear proyecto')); if (btn) btn.click(); });
await page.waitForTimeout(1500);

// Add environment
await page.evaluate(() => {
    const allInputs = [...document.querySelectorAll('input')];
    const envInput = allInputs.find(i => i.placeholder?.toLowerCase().includes('entorno') || i.placeholder?.includes('dev') || i.placeholder?.includes('ej.'));
    if (envInput) { envInput.value = 'produccion'; envInput.dispatchEvent(new Event('input', { bubbles: true })); }
});
await page.waitForTimeout(200);
await page.evaluate(() => { const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Agregar'); if (btn) btn.click(); });
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(SHOT_DIR, 'workspace-with-envs.png'), timeout: 20000 });

// Servers
await page.evaluate(() => { window.location.hash = '#/servers'; });
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(SHOT_DIR, 'servers-with-icons.png'), timeout: 20000 });

console.log('done');
await app.close();
fs.rmSync(TMP_DATA, { recursive: true, force: true });
