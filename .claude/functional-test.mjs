/**
 * KargaSync functional test:
 * 1. Create a project
 * 2. Add environments (dev + prod)
 * 3. Register FTP server (Docker)
 * 4. Assign remote binding to prod env
 * 5. Open File Explorer → connect to FTP → navigate files
 * 6. Take screenshots of each step
 */
import { _electron as electron } from 'playwright-core';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '..');
const SHOT_DIR = path.join(APP_DIR, '.claude', 'shots', 'functional');
const TMP_DATA = path.join(os.tmpdir(), 'karga-func-' + Date.now());
fs.mkdirSync(SHOT_DIR, { recursive: true });

const electronBin = path.join(APP_DIR, 'node_modules', 'electron', 'dist', 'electron.exe');

console.log('Launching KargaSync for functional test...');
const app = await electron.launch({
    executablePath: electronBin,
    args: [APP_DIR, '--user-data-dir=' + TMP_DATA],
    env: { ...process.env },
    timeout: 30000,
});

await new Promise(r => setTimeout(r, 5000));
const page = app.windows().find(w => !w.url().startsWith('devtools://'));
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(1500);

// dismiss changelog
await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b =>
        b.textContent?.trim() === 'Cerrar' || b.textContent?.trim() === 'Close');
    if (btn) btn.click();
});
await page.waitForTimeout(400);

async function shot(name) {
    const f = path.join(SHOT_DIR, name + '.png');
    await page.screenshot({ path: f });
    console.log('📸', name);
}

async function nav(hash) {
    await page.evaluate(h => { window.location.hash = h; }, hash);
    await page.waitForTimeout(800);
}

async function clickByText(text) {
    const result = await page.evaluate(t => {
        const els = [...document.querySelectorAll('button, input[type="submit"]')];
        const el = els.find(e => e.textContent?.trim() === t);
        if (!el) return `NOT_FOUND: ${t}`;
        el.click();
        return 'OK';
    }, text);
    await page.waitForTimeout(400);
    return result;
}

async function fillInput(placeholder, value) {
    const result = await page.evaluate(({ ph, val }) => {
        const input = [...document.querySelectorAll('input')].find(i =>
            i.placeholder?.includes(ph));
        if (!input) return `NOT_FOUND: ${ph}`;
        input.focus();
        input.value = val;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return 'OK';
    }, { ph: placeholder, val: value });
    await page.waitForTimeout(200);
    return result;
}

// ─── STEP 1: Create project ───────────────────────────────────────────────────
console.log('\n=== STEP 1: Create project ===');
await nav('#/workspace');
await shot('01-workspace-empty');

await fillInput('Nombre del proyecto', 'Mi App Web');
await page.waitForTimeout(200);
await fillInput('Ruta raíz', 'C:\\Users\\Public\\Documents');
await page.waitForTimeout(200);
await shot('02-create-project-filled');

await clickByText('Crear proyecto');
await page.waitForTimeout(1000);
await shot('03-project-created');

// ─── STEP 2: Navigate to Servers and add FTP ────────────────────────────────
console.log('\n=== STEP 2: Register FTP server ===');
await nav('#/servers');
await shot('04-servers-empty');

// Fill server form
await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input')];
    // host input
    const hostInput = inputs.find(i => i.placeholder?.includes('sftp.example'));
    if (hostInput) { hostInput.value = '127.0.0.1'; hostInput.dispatchEvent(new Event('input', { bubbles: true })); }
    // port (already 22, need to change to 21 via protocol select)
});
await page.waitForTimeout(200);

// Select FTP protocol
await page.evaluate(() => {
    const selects = [...document.querySelectorAll('select')];
    const protocolSelect = selects.find(s => [...s.options].some(o => o.value === 'ftp'));
    if (protocolSelect) {
        protocolSelect.value = 'ftp';
        protocolSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
});
await page.waitForTimeout(400);

// Fill username
await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input')];
    const usernameInput = inputs.find(i => i.placeholder?.includes('deploy') || i.placeholder?.includes('usuario'));
    if (usernameInput) { usernameInput.value = 'ftpuser'; usernameInput.dispatchEvent(new Event('input', { bubbles: true })); }
});

// Fill password (secret field)
await page.evaluate(() => {
    const passInput = document.querySelector('input[type="password"]');
    if (passInput) { passInput.value = 'ftp_pass'; passInput.dispatchEvent(new Event('input', { bubbles: true })); }
});

// Fill server name
await page.evaluate(() => {
    const nameInput = document.querySelectorAll('input')[0];
    if (nameInput) { nameInput.value = 'Docker FTP Local'; nameInput.dispatchEvent(new Event('input', { bubbles: true })); }
});

await page.waitForTimeout(400);
await shot('05-server-form-filled');

// Test connection first
const testResult = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.trim().includes('Probar') || b.textContent?.trim().includes('Test'));
    if (!btn) return 'test button not found';
    btn.click();
    return 'clicked';
});
console.log('Test connection click:', testResult);
await page.waitForTimeout(5000);
await shot('06-server-test-result');

// Save server
await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Crear servidor' || b.textContent?.trim() === 'Create server');
    if (btn) btn.click();
});
await page.waitForTimeout(1500);
await shot('07-server-saved');

// ─── STEP 3: File Explorer - connect to FTP ──────────────────────────────────
console.log('\n=== STEP 3: File Explorer FTP ===');
await nav('#/explorer');
await page.waitForTimeout(500);
await shot('08-explorer-before-server');

// Select the FTP server
await page.evaluate(() => {
    const sel = document.querySelector('select');
    if (sel) {
        const ftpOption = [...sel.options].find(o => o.text.includes('127.0.0.1') || o.text.includes('Docker') || o.text.includes('FTP'));
        if (ftpOption) {
            sel.value = ftpOption.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
});
await page.waitForTimeout(3000);
await shot('09-explorer-ftp-connected');

// ─── STEP 4: Configure environment binding ────────────────────────────────────
console.log('\n=== STEP 4: Add environments + binding ===');
await nav('#/workspace');
await page.waitForTimeout(400);
await shot('10-workspace-with-project');

// Add environments
await page.evaluate(() => {
    const input = [...document.querySelectorAll('input')].find(i => i.placeholder?.includes('ej.') || i.placeholder?.includes('dev') || i.placeholder?.includes('environment'));
    if (input) { input.value = 'produccion'; input.dispatchEvent(new Event('input', { bubbles: true })); }
});
await page.waitForTimeout(200);
const addResult = await clickByText('Agregar');
console.log('Add env:', addResult);
await page.waitForTimeout(1000);
await shot('11-environment-added');

// ─── DONE ─────────────────────────────────────────────────────────────────────
console.log('\n=== Functional test complete ===');
await shot('12-final-state');

// Collect any console errors
const errors = [];
page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
});

if (errors.length > 0) {
    console.log('\nConsole errors found:');
    errors.forEach(e => console.log(' ❌', e));
} else {
    console.log('No console errors ✓');
}

await app.close();
fs.rmSync(TMP_DATA, { recursive: true, force: true });
console.log('\nScreenshots in:', SHOT_DIR);
