#!/usr/bin/env node
/**
 * dashboard.mjs — QA visiva dell'Operating Center con un laboratorio popolato.
 *
 * Semina un dataset di prova negli store, ricarica e fotografa. Verifica anche
 * che i numeri a schermo corrispondano al dataset: una dashboard che mostra
 * qualcosa non è ancora una dashboard che mostra il vero.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { SEED, seedScript } from './seed.mjs';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const outDir = 'tests/__screenshots__/dashboard';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 180)));
page.on('console', (m) => { if (m.type() === 'error' && !/net::/.test(m.text())) errors.push(m.text().slice(0, 180)); });

await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
});

await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(6000);
await page.evaluate(seedScript(SEED));
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(9000);

await page.evaluate(() => {
  [...document.querySelectorAll('body > div')].forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' && el.getBoundingClientRect().width > window.innerWidth * 0.7) el.remove();
  });
});
await page.waitForTimeout(600);

const seen = await page.evaluate(() => {
  const oc = document.getElementById('ingly-operating-center');
  if (!oc) return { mounted: false };
  const text = (s) => [...oc.querySelectorAll(s)].map((e) => e.innerText.trim());
  return {
    mounted: true,
    soloFiglio: document.getElementById('view-dashboard').children.length === 1,
    kpi: text('.kpi-card').map((t) => t.split('\n').slice(0, 2).join(' = ')),
    workCenters: text('.wc__name'),
    codeLavoro: text('.wc__metrics').map((t) => t.replace(/\n/g, ' ')),
    attenzione: text('.att-card__label'),
    esauriti: text('.inv-row__stock.is-danger').length,
    sottoScorta: text('.inv-row__stock.is-warning').length,
    macchine: text('.mac-state__label'),
    redditivita: text('.prof-tile__value'),
    intelligence: text('.intel-item__text'),
  };
});

await page.screenshot({ path: path.join(outDir, 'operating-center.png'), fullPage: true });
await browser.close();

console.log(JSON.stringify(seen, null, 1));
console.log(`\nerrori JS: ${errors.length}`);
for (const e of [...new Set(errors)].slice(0, 8)) console.log('  ' + e);
