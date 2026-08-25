#!/usr/bin/env node
/**
 * responsive.mjs — verifica che a ogni larghezza il contenuto stia dentro lo
 * schermo. L'errore più comune in un gestionale denso non è il layout brutto:
 * è la tabella che spinge il documento fuori dal viewport e rende la pagina
 * scorrevole in orizzontale.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const outDir = 'tests/__screenshots__/responsive';
fs.mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1680, height: 1050 },
  { name: 'laptop', width: 1366, height: 800 },
  { name: 'tablet', width: 900, height: 1200 },
  { name: 'mobile', width: 390, height: 844 },
];
const SECTIONS = ['dashboard', 'quoter', 'items', 'sales', 'finance'];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

const problems = [];
for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await page.addInitScript(() => {
    localStorage.setItem('ingly_wizard_done_v2', '1');
    localStorage.setItem('ingly_tour_done_v1', '1');
    localStorage.setItem('_wizard_done_v37', '1');
    localStorage.setItem('ingly_color_scheme', 'dark');
  });
  await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(6000);
  await page.evaluate(() => {
    [...document.querySelectorAll('body > div')].forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' && el.getBoundingClientRect().width > window.innerWidth * 0.8) el.remove();
    });
  });

  for (const s of SECTIONS) {
    await page.evaluate((sec) => window.App && window.App.navigate(sec), s);
    await page.waitForTimeout(700);
    const res = await page.evaluate(() => {
      const doc = document.documentElement;
      // Chi sfora davvero: si guardano gli elementi, non solo il totale.
      const offenders = [...document.querySelectorAll('.section-view.active *')]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 2)
        .slice(0, 3)
        .map((el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
      return { over: doc.scrollWidth - window.innerWidth, offenders };
    });
    if (res.over > 1) problems.push(`${vp.name} · ${s}: +${res.over}px  ${res.offenders.join(' ')}`);
  }

  await page.evaluate(() => window.App && window.App.navigate('dashboard'));
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(outDir, `${vp.name}.png`), fullPage: false });
  await page.close();
}

await browser.close();

console.log(`viewport verificati: ${VIEWPORTS.map((v) => v.name + ' ' + v.width).join(' · ')}`);
console.log(`sezioni per viewport: ${SECTIONS.length}`);
if (problems.length) {
  console.log(`\noverflow orizzontale in ${problems.length} combinazioni:`);
  for (const p of problems) console.log('  ' + p);
  process.exitCode = 1;
} else {
  console.log('\nnessun overflow orizzontale ✔');
}
