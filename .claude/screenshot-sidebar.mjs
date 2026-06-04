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

// close changelog
await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Cerrar' || b.textContent?.trim() === 'Close');
    if (btn) btn.click();
});
await page.waitForTimeout(500);

async function shot(name) {
    const f = path.join(SHOT_DIR, name + '.png');
    await page.screenshot({ path: f });
    console.log('shot:', name);
}

async function clickCollapseBtn() {
    await page.evaluate(() => {
        const btn = [...document.querySelectorAll('aside button')].find(b => b.title?.includes('Colapsar') || b.title?.includes('Collapse'));
        if (btn) { btn.click(); console.log('clicked collapse'); }
        else console.log('collapse btn not found');
    });
    await page.waitForTimeout(600);
}

async function clickExpandBtn() {
    await page.evaluate(() => {
        const btn = [...document.querySelectorAll('aside button')].find(b => b.title?.includes('Expandir') || b.title?.includes('Expand'));
        if (btn) { btn.click(); console.log('clicked expand'); }
        else console.log('expand btn not found');
    });
    await page.waitForTimeout(600);
}

// 1. Light expanded
await page.evaluate(() => { document.documentElement.classList.remove('dark'); });
await shot('sidebar-expanded-light');

// 2. Light collapsed
await clickCollapseBtn();
const isCollapsed = await page.evaluate(() => document.querySelector('.app-shell')?.classList.contains('is-collapsed'));
console.log('collapsed:', isCollapsed);
await shot('sidebar-collapsed-light');

// 3. Dark collapsed
await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
});
await page.waitForTimeout(300);
await shot('sidebar-collapsed-dark');

// 4. Dark expanded
await clickExpandBtn();
await shot('sidebar-expanded-dark');

await app.close();
fs.rmSync(TMP_DATA, { recursive: true, force: true });
console.log('Done');
