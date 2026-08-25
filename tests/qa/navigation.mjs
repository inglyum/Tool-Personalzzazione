#!/usr/bin/env node
/**
 * navigation.mjs — naviga tutte le sezioni dichiarate e riporta quali non
 * diventano visibili. È il modo per trovare le voci di menu che portano a una
 * schermata vuota: 105 sezioni non si controllano a mano.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const baseline = JSON.parse(fs.readFileSync('baseline/ingly-os.json', 'utf8'));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));

await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('_v37sidebar_done', '1');
  localStorage.setItem('ingly_theme', 'dark');
});

await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(6000);

const results = [];
for (const section of baseline.sections) {
  const r = await page.evaluate(async (sec) => {
    try {
      window.App.navigate(sec);
    } catch (e) {
      return { state: 'throw', detail: String(e).slice(0, 100) };
    }
    await new Promise((r) => setTimeout(r, 90));
    const active = [...document.querySelectorAll('.section-view.active')].map((e) => e.id);
    const view = document.getElementById('view-' + sec);
    return {
      state: !view ? 'no-view' : view.offsetParent === null ? 'hidden' : 'ok',
      chars: view ? (view.innerText || '').trim().length : 0,
      active: active.length === 1 ? active[0] : active.join('+') || '(nessuna)',
    };
  }, section);
  results.push({ section, ...r });
}

await browser.close();

const by = (s) => results.filter((r) => r.state === s);
const empty = by('ok').filter((r) => r.chars < 120);

console.log(`sezioni verificate: ${results.length}`);
console.log(`  visibili con contenuto : ${by('ok').length - empty.length}`);
console.log(`  visibili ma quasi vuote: ${empty.length}`);
console.log(`  nascoste               : ${by('hidden').length}`);
console.log(`  senza vista            : ${by('no-view').length}`);
console.log(`  eccezione              : ${by('throw').length}`);
console.log(`errori JS durante il giro: ${errors.length}`);

const show = (label, rows) => {
  if (!rows.length) return;
  console.log(`\n${label}`);
  for (const r of rows) console.log(`  ${r.section.padEnd(22)} attiva=${r.active} chars=${r.chars}`);
};
show('NASCOSTE (la voce di menu non mostra nulla)', by('hidden'));
show('SENZA VISTA', by('no-view'));
show('ECCEZIONE', by('throw'));
show('QUASI VUOTE (<120 caratteri)', empty);
for (const e of [...new Set(errors)].slice(0, 10)) console.log('  JS ' + e);
