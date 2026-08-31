#!/usr/bin/env node
/**
 * quoter-3d-carico.mjs — il preventivatore su un archivio vero.
 *
 * Mille materiali, cento macchine, mille clienti, mille preventivi. Non è un
 * numero scelto per fare impressione: è la dimensione a cui arriva un
 * laboratorio dopo qualche anno, ed è la dimensione a cui i difetti di
 * prestazione smettono di essere teorici — una ricerca senza indice, una
 * tabella che si ridisegna intera, un `JSON.parse` dentro un ciclo.
 *
 *   node tests/qa/quoter-3d-carico.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(e.message));
page.on('dialog', (d) => d.accept());

await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');

  /* Mille clienti nella rubrica. */
  const clienti = [];
  for (let i = 1; i <= 1000; i++) {
    clienti.push({ id: 'c' + i, name: 'Cliente ' + String(i).padStart(4, '0'),
      email: 'c' + i + '@t.it', phone: i % 3 ? '+3900' + i : '', company: i % 2 ? 'Azienda ' + i : '' });
  }
  localStorage.setItem('ingly_crm_v1', JSON.stringify(clienti));

  /* Mille preventivi in archivio. */
  const preventivi = [];
  for (let i = 1; i <= 1000; i++) {
    preventivi.push({ id: 'q' + i, client: 'Cliente ' + String((i % 1000) + 1).padStart(4, '0'),
      date: '2026-0' + ((i % 9) + 1) + '-15', total: 50 + (i % 300), status: i % 4 ? 'sent' : 'draft' });
  }
  localStorage.setItem('lb2b_quotes_v1', JSON.stringify(preventivi));

  /* Mille materiali e cento macchine nella lista locale del preventivatore. */
  const mats = [];
  for (let i = 1; i <= 1000; i++) {
    mats.push({ id: 'm' + i, n: 'PLA lotto ' + i, t: i % 5 === 0 ? 'resin' : 'fdm',
      p: 12 + (i % 30), u: 1000, s: 'Fornitore ' + (i % 40) });
  }
  localStorage.setItem('p3dq_v4', JSON.stringify({ mats: mats, saved: [] }));
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 180000 });
await page.waitForTimeout(14000);

const esito = await page.evaluate(async () => {
  const out = { passi: [], errori: [], tempi: {} };
  const dico = (k, v) => out.passi.push({ passo: k, esito: v });
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  if (typeof Print3DQuoter === 'undefined') { out.errori.push('Print3DQuoter assente'); return out; }

  /* Cento macchine, aggiunte all'elenco che la vista usa davvero. */
  const misura = async (nome, fn, soglia) => {
    const t0 = performance.now();
    await fn();
    const ms = performance.now() - t0;
    out.tempi[nome] = Math.round(ms);
    dico(nome + ' in ' + Math.round(ms) + ' ms (soglia ' + soglia + ')', ms < soglia);
    return ms;
  };

  for (const sez of ['print3d_quoter', 'quoter_3d', 'print3d', 'quoter3d']) {
    try { await App.navigate(sez); } catch (e) { /* si prova il successivo */ }
    await a(900);
    if (document.getElementById('p3d-g')) break;
  }
  if (!document.getElementById('p3d-g')) { out.errori.push('la vista non si apre'); return out; }

  const sv = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  sv('p3d-g', 290); sv('p3d-mkg', 15.99); Print3DQuoter.tempoDaDecimale(9.95);
  sv('p3d-qty', 1);

  dico('mille materiali sono caricati', (Print3DQuoter._state().mats || []).length >= 1000);

  /* Un ricalcolo con l'archivio pieno: è quel che succede a ogni tasto. */
  await misura('un ricalcolo', async () => { Print3DQuoter.calc(); }, 400);

  /* Venti ricalcoli di fila: scrivere un numero in un campo. */
  await misura('venti ricalcoli (scrivere in un campo)', async () => {
    for (let i = 0; i < 20; i++) { sv('p3d-g', 100 + i); Print3DQuoter.calc(); }
  }, 2500);

  /* Il ridisegno completo della vista, con mille materiali nel menu. */
  await misura('un ridisegno completo', async () => { Print3DQuoter.render(); }, 1200);

  /* Cinquanta voci in preventivo, con il loro snapshot. */
  Print3DQuoter.clearLines(); await a(200);
  await misura('cinquanta voci aggiunte al preventivo', async () => {
    for (let i = 0; i < 50; i++) Print3DQuoter.addLine();
  }, 9000);
  dico('le cinquanta voci ci sono', Print3DQuoter._state().lines.length === 50);

  await misura('i totali di cinquanta voci', async () => {
    for (let i = 0; i < 50; i++) Print3DQuoter._totali();
  }, 200);

  /* La card «preventivato vs reale» disegna cinquanta righe con i loro
     confronti: è il pezzo aggiunto per ultimo, quindi quello meno provato. */
  await misura('preventivato vs reale su cinquanta voci', async () => { Print3DQuoter.calc(); }, 2500);

  const T = Print3DQuoter._totali();
  dico('e i totali restano coerenti', T.netto > 0 && Math.abs(T.lordo - (T.netto + T.iva)) < 0.01);

  Print3DQuoter.clearLines(); await a(300);
  return out;
});

console.log('\nSMART QUOTER 3D — SU MILLE MATERIALI, MILLE CLIENTI, MILLE PREVENTIVI\n');
const problemi = [];
for (const p of esito.passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
esito.errori.forEach((e) => problemi.push(e));
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));

console.log('\nerrori JavaScript: ' + erroriJS.length);
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nregge il carico ✔\n');
await browser.close();
