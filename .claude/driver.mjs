// KargaSync Electron driver — Windows
import { _electron as electron } from 'playwright-core';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '..');
const SHOT_DIR = process.env.SCREENSHOT_DIR || path.join(APP_DIR, '.claude', 'shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

const electronBin = path.join(APP_DIR, 'node_modules', 'electron', 'dist', 'electron.exe');

let app = null;
let page = null;

async function launch() {
    if (app) { console.log('already launched'); return; }

    // Build first if needed
    if (!fs.existsSync(path.join(APP_DIR, '.vite', 'build', 'main.js'))) {
        console.log('building...');
        const { execSync } = await import('node:child_process');
        execSync('npx electron-forge start --quit-after-build 2>&1 || true', {
            cwd: APP_DIR, stdio: 'inherit', timeout: 60000,
        });
    }

    console.log('launching electron...');
    app = await electron.launch({
        executablePath: electronBin,
        args: [APP_DIR],
        env: { ...process.env },
        timeout: 30000,
    });

    await new Promise(r => setTimeout(r, 5000));

    // find the real UI window
    const wins = app.windows();
    page = wins.find(w => !w.url().startsWith('devtools://')) ?? await app.firstWindow();
    console.log('launched. windows:');
    for (const w of app.windows()) console.log(' ', w.url());
}

async function ss(name = `ss-${Date.now()}`) {
    if (!page) { console.log('ERROR: launch first'); return; }
    const f = path.join(SHOT_DIR, name + '.png');
    await page.screenshot({ path: f, fullPage: false });
    console.log('screenshot:', f);
    return f;
}

async function navigate(route) {
    if (!page) { console.log('ERROR: launch first'); return; }
    await page.evaluate(r => window.location.hash = r, route);
    await page.waitForTimeout(800);
    console.log('navigated to', route);
}

async function click(sel) {
    if (!page) { console.log('ERROR: launch first'); return; }
    const r = await page.evaluate(s => {
        const el = document.querySelector(s);
        if (!el) return 'NOT_FOUND';
        el.click(); return 'OK';
    }, sel);
    await page.waitForTimeout(300);
    console.log('click', sel, '->', r);
}

async function evalJs(expr) {
    if (!page) { console.log('ERROR: launch first'); return; }
    try { console.log(JSON.stringify(await page.evaluate(expr))); }
    catch (e) { console.log('ERROR:', e.message); }
}

async function quit() {
    if (app) await app.close().catch(() => {});
    app = null; page = null;
}

export { launch, ss, navigate, click, evalJs, quit, SHOT_DIR };
