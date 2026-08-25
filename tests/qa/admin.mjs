#!/usr/bin/env node
/**
 * admin.mjs — verifica i flussi critici della console: primo accesso, login,
 * navigazione fra le pagine, logout. E soprattutto che le credenziali
 * hardcoded rimosse non funzionino più.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-CLOUD-ADMIN.html';
const outDir = 'tests/__screenshots__/admin';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(2500);

const results = {};

// 1. Le credenziali master rimosse non devono più funzionare.
async function tryLogin(user, pass) {
  await page.fill('#l-user', user);
  await page.fill('#l-pass', pass);
  await page.click('.lc-btn');
  await page.waitForTimeout(1200);
  return page.evaluate(() => {
    const login = document.getElementById('login-screen');
    const first = document.getElementById('fl-pwd1');
    return {
      loginVisible: !!login && getComputedStyle(login).display !== 'none',
      firstRun: !!first,
      error: (document.getElementById('l-err')?.textContent || '').trim(),
    };
  });
}

results['admin/admin rifiutato'] = await tryLogin('admin', 'admin');
await page.screenshot({ path: path.join(outDir, '01-login.png') });

// 2. Il super admin senza password deve portare alla schermata di primo accesso.
results['primo accesso'] = await tryLogin('superadmin', 'qualsiasi-cosa');
await page.screenshot({ path: path.join(outDir, '02-primo-accesso.png') });

// 3. Impostare una password e accedere.
if (results['primo accesso'].firstRun) {
  await page.fill('#fl-pwd1', 'IngLy2026sicura');
  await page.fill('#fl-pwd2', 'IngLy2026sicura');
  await page.click('.lc-btn');
  await page.waitForTimeout(2500);
  results['dopo il setup'] = await page.evaluate(() => ({
    loginVisible: getComputedStyle(document.getElementById('login-screen')).display !== 'none',
    hashSalvato: (JSON.parse(localStorage.getItem('ingly_saas_db') || '{}').admins || [])
      .map((a) => String(a.passwordHash).slice(0, 12)),
    pagine: document.querySelectorAll('#sidebar .sb-item[data-page]').length,
    identita: [
      document.getElementById('sb-username')?.textContent,
      document.getElementById('tb-role-badge')?.textContent,
    ],
    sezioni: [...document.querySelectorAll('#sidebar .sb-section')].map((e) => e.textContent),
  }));
  await page.screenshot({ path: path.join(outDir, '03-console.png') });
}

// 4. Percorrere tutte le pagine del menu.
const pages = await page.$$eval('#sidebar .sb-item[data-page]', (els) => els.map((e) => e.dataset.page));
const broken = [];
for (const p of pages) {
  await page.evaluate((id) => window.nav(id), p);
  await page.waitForTimeout(250);
  const ok = await page.evaluate((id) => {
    const el = document.getElementById('page-' + id);
    return el ? (el.innerText || '').trim().length : -1;
  }, p);
  if (ok <= 0) broken.push(`${p} (${ok === -1 ? 'pagina assente' : 'vuota'})`);
}
results['pagine percorse'] = pages.length;
results['pagine vuote'] = broken;
await page.screenshot({ path: path.join(outDir, '04-ultima-pagina.png') });

await browser.close();

console.log(JSON.stringify(results, null, 1));
console.log(`\nerrori console/JS: ${errors.length}`);
for (const e of [...new Set(errors)].slice(0, 10)) console.log('  ' + e);
