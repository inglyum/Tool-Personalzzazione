#!/usr/bin/env node
/**
 * smoke.mjs — apre davvero l'applicazione in Chromium, guarda la console e
 * fotografa le sezioni. Nessun refactor di 9 MB di CSS si valida a occhio sul
 * diff: serve vedere le schermate.
 *
 *   node tests/qa/smoke.mjs dist/INGLY-OS.html [--out tests/__screenshots__]
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const argOut = process.argv.indexOf('--out');
const outDir = argOut > -1 ? process.argv[argOut + 1] : 'tests/__screenshots__';
const sections = (process.argv.includes('--sections')
  ? process.argv[process.argv.indexOf('--sections') + 1]
  : 'dashboard,quoter,clients,items,sales,finance,settings'
).split(',');

fs.mkdirSync(outDir, { recursive: true });

const errors = [];
const warnings = [];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on('console', (msg) => {
  const t = msg.type();
  if (t === 'error') errors.push(msg.text().slice(0, 300));
  else if (t === 'warning') warnings.push(msg.text().slice(0, 200));
});
page.on('pageerror', (e) => errors.push('UNCAUGHT ' + String(e).slice(0, 300)));

// Il wizard di primo avvio e il tour guidato coprono l'applicazione con una
// modale: per fotografare le schermate servono segnati come già visti, come
// in un'installazione in uso.
await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('_v37sidebar_done', '1');
  localStorage.setItem('ingly_theme', 'dark');
});

await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(6000); // le patch storiche si applicano via polling

const boot = await page.evaluate(() => ({
  title: document.title,
  hasApp: typeof window.App === 'object',
  navigate: typeof window.App?.navigate === 'function',
  views: document.querySelectorAll('.section-view').length,
  navItems: document.querySelectorAll('.nav-item').length,
  primary: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
  bg: getComputedStyle(document.body).backgroundColor,
  loginVisible: !!document.querySelector('#login-screen:not([style*="display: none"])'),
}));

console.log('boot:', JSON.stringify(boot, null, 2));
await page.screenshot({ path: path.join(outDir, '00-primo-avvio.png') });

// Al primo avvio più overlay a schermo intero si sovrappongono. Contarli è
// una misura di qualità in sé; per fotografare l'applicazione vanno chiusi.
const overlays = await page.evaluate(() => {
  const found = [...document.querySelectorAll('body > div')].filter((el) => {
    const cs = getComputedStyle(el);
    return (
      cs.position === 'fixed' &&
      cs.display !== 'none' &&
      el.getBoundingClientRect().width > window.innerWidth * 0.8 &&
      el.getBoundingClientRect().height > window.innerHeight * 0.8
    );
  });
  const ids = found.map((el) => el.id || el.className || '(anonimo)');
  found.forEach((el) => el.remove());
  return ids;
});
console.log(`overlay a schermo intero al primo avvio: ${overlays.length} → ${overlays.join(' · ')}`);
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(outDir, '01-boot.png') });

const visited = [];
for (const s of sections) {
  try {
    await page.evaluate((sec) => window.App && window.App.navigate && window.App.navigate(sec), s);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, `${s}.png`) });
    const shown = await page.evaluate((sec) => {
      const v = document.getElementById('view-' + sec);
      return v ? { exists: true, visible: v.offsetParent !== null, text: (v.innerText || '').trim().length } : { exists: false };
    }, s);
    visited.push({ section: s, ...shown });
  } catch (e) {
    visited.push({ section: s, error: String(e).slice(0, 120) });
  }
}

// Un controllo che il CSS non può mentire: il body deve scorrere solo in verticale.
const overflow = await page.evaluate(() => ({
  docWidth: document.documentElement.scrollWidth,
  winWidth: window.innerWidth,
}));

await browser.close();

console.log('\nsezioni:');
for (const v of visited) console.log('  ', JSON.stringify(v));
console.log(`\noverflow orizzontale: ${overflow.docWidth > overflow.winWidth + 1 ? 'SÌ (' + overflow.docWidth + ' > ' + overflow.winWidth + ')' : 'no'}`);
console.log(`console: ${errors.length} errori · ${warnings.length} warning`);
for (const e of [...new Set(errors)].slice(0, 15)) console.log('  ERR ' + e);
for (const w of [...new Set(warnings)].slice(0, 6)) console.log('  WARN ' + w);
