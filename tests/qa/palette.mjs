#!/usr/bin/env node
/**
 * palette.mjs — topbar, command palette e ricerca globale.
 * Verifica che la ricerca trovi davvero nei sei store e che i pulsanti della
 * topbar storica non siano stati persi: devono essere nel menu, non spariti.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { SEED, seedScript } from './seed.mjs';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const outDir = 'tests/__screenshots__/palette';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error' && !/net::/.test(m.text())) errors.push(m.text().slice(0, 200)); });

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
await page.waitForTimeout(8000);
await page.evaluate(() => {
  [...document.querySelectorAll('body > div')].forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' && el.getBoundingClientRect().width > window.innerWidth * 0.7) el.remove();
  });
});

const out = {};

// La topbar deve avere pochi elementi in barra e nessun pulsante perso.
out.topbar = await page.evaluate(() => {
  const tb = document.querySelector('#topbar .tb');
  if (!tb) return { ricostruita: false };
  return {
    ricostruita: true,
    inBarra: tb.querySelectorAll('.tb__slot > *').length,
    nelMenu: tb.querySelectorAll('[data-tb-menu] > *').length,
  };
});
await page.screenshot({ path: path.join(outDir, '01-topbar.png'), clip: { x: 0, y: 0, width: 1440, height: 70 } });

// Palette da tastiera
await page.keyboard.press('Control+k');
await page.waitForTimeout(500);
out.apertaConScorciatoia = await page.evaluate(() => document.getElementById('ingly-palette').classList.contains('is-open'));
out.comandi = await page.$$eval('#ingly-palette .ds-palette__item .cp__label', (e) => e.slice(0, 4).map((x) => x.innerText.trim()));
await page.screenshot({ path: path.join(outDir, '02-comandi.png') });

// Ricerca nei dati reali
await page.fill('#ingly-palette input', 'ortigia');
await page.waitForTimeout(900);
out.ricercaOrtigia = await page.$$eval('#ingly-palette .ds-palette__item', (e) =>
  e.map((x) => x.innerText.replace(/\n/g, ' · ').trim()));
out.gruppi = await page.$$eval('#ingly-palette .cp__group', (e) => e.map((x) => x.innerText.trim()));
await page.screenshot({ path: path.join(outDir, '03-ricerca.png') });

await page.fill('#ingly-palette input', 'dtf');
await page.waitForTimeout(900);
out.ricercaDtf = await page.$$eval('#ingly-palette .ds-palette__item', (e) =>
  e.map((x) => x.innerText.replace(/\n/g, ' · ').trim()).slice(0, 6));

// Navigazione da tastiera + invio
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await page.waitForTimeout(900);
out.chiusaDopoInvio = await page.evaluate(() => !document.getElementById('ingly-palette').classList.contains('is-open'));
out.sezioneAperta = await page.evaluate(() => window.App && window.App.currentSection);

await browser.close();
console.log(JSON.stringify(out, null, 1));
console.log(`\nerrori JS: ${errors.length}`);
for (const e of [...new Set(errors)].slice(0, 6)) console.log('  ' + e);
