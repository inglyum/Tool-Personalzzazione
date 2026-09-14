#!/usr/bin/env node
/**
 * navigazione-invariante.mjs — 17 patch ridefiniscono `App.navigate`, 31
 * `App.renderSection`. La domanda non è quante siano: è se si comportino come
 * un percorso solo.
 *
 * Misurato: una sola `renderSection` per `navigate`, una sola sezione attiva,
 * zero errori. La catena di wrapper funziona. Smontarla sarebbe rischio senza
 * beneficio misurato — quindi invece di riscriverla si blocca l'invariante,
 * così la prossima patch non può romperla in silenzio.
 *
 * Due render per navigazione non sono un dettaglio estetico: raddoppiano il
 * lavoro e, dove una sezione registra listener nel proprio render, li
 * raddoppiano insieme al lavoro.
 *
 *   node tests/qa/navigazione-invariante.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
page.on('dialog', (d) => d.accept().catch(() => {}));
await page.addInitScript(() => {
  ['ingly_wizard_done_v2', 'ingly_tour_done_v1', '_wizard_done_v37', '_v37sidebar_done']
    .forEach((k) => localStorage.setItem(k, '1'));
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

const SEZIONI = ['dashboard', 'orders', 'sales', 'quoter', 'clients', 'inventory', 'catalog'];

const misura = await page.evaluate(async (sezioni) => {
  const out = { render: {}, tempo: {}, attive: {}, errori: [] };
  let n = 0;
  const vero = window.App.renderSection;
  window.App.renderSection = function () { n++; return vero.apply(this, arguments); };
  for (const s of sezioni) {
    n = 0;
    const t0 = performance.now();
    try { await window.App.navigate(s); } catch (e) { out.errori.push(s + ': ' + e.message); }
    await new Promise((r) => setTimeout(r, 500));
    out.render[s] = n;
    out.tempo[s] = Math.round(performance.now() - t0 - 500);
    out.attive[s] = document.querySelectorAll('.section-view.active').length;
  }
  window.App.renderSection = vero;

  /* Tornare due volte di fila sulla stessa sezione non deve raddoppiare
     niente: è il caso in cui i wrapper si accumulano. */
  let m = 0;
  window.App.renderSection = function () { m++; return vero.apply(this, arguments); };
  await window.App.navigate('orders'); await new Promise((r) => setTimeout(r, 300));
  await window.App.navigate('orders'); await new Promise((r) => setTimeout(r, 300));
  window.App.renderSection = vero;
  out.dueVolte = m;

  /* La lettura dell'archivio, per sapere se il costo sta nella navigazione o
     nei dati. */
  const t1 = performance.now();
  await window.IDB.getAll('materials').catch(() => []);
  out.letturaMagazzino = Math.round(performance.now() - t1);
  return out;
}, SEZIONI);

for (const s of SEZIONI) {
  dico(s + ' · una sola render per navigazione (' + misura.render[s] + ')', misura.render[s] === 1);
  dico(s + ' · una sola sezione attiva (' + misura.attive[s] + ')', misura.attive[s] === 1);
}
dico('due navigazioni consecutive → due render, non quattro (' + misura.dueVolte + ')',
  misura.dueVolte === 2);
dico('nessuna navigazione solleva un errore', misura.errori.length === 0);

/* ── Prestazioni: si corregge solo ciò che si misura ─────────────────────── */

const lente = SEZIONI.filter((s) => misura.tempo[s] > 2500);
const elenco = SEZIONI.map((s) => s + ' ' + misura.tempo[s] + 'ms').join(' · ');
dico('nessuna sezione impiega più di 2,5 s ad aprirsi (' + elenco + ')', lente.length === 0);
dico('la lettura del magazzino (172 materiali) sta sotto il secondo ('
  + misura.letturaMagazzino + 'ms)', misura.letturaMagazzino < 1000);

console.log('\nNAVIGAZIONE · INVARIANTE E PRESTAZIONI\n');
const problemi = [];
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));
console.log('\ncontrolli: ' + passi.length + ' · errori JavaScript: ' + erroriJS.length);
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nquarantotto patch, un percorso solo ✔\n');
await browser.close();
