#!/usr/bin/env node
/**
 * clv-a-margine.mjs — il valore del cliente si misura sul margine.
 *
 * Tre schermate calcolavano il «valore cliente» e tutte e tre sommavano il
 * **fatturato**. La CLV Dashboard faceva `avgTicket × ordiniAnno × 3`, con tre
 * cose storte: il fatturato al posto del margine, la frequenza contata sugli
 * acquisti invece che sugli intervalli — su due acquisti, il doppio — e un
 * orizzonte di tre anni che nessuno aveva dichiarato.
 *
 * Qui si scrivono vendite vere in archivio e si guarda cosa mostra la
 * schermata. Il caso costruito apposta: un cliente che **fattura di più e
 * rende di meno**. Se la classifica lo mette in cima, il difetto è tornato.
 *
 *   node tests/qa/clv-a-margine.mjs [file]
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
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* ── FASE A · il modulo puro risponde ─────────────────────────────────────── */

const puro = await page.evaluate(() => {
  const C = window.InglyCLV;
  if (!C) return null;
  const g = (n) => new Date(Date.now() - n * 86400000).toISOString();
  const righe = [
    /* Ricco: fattura tanto, rende poco. */
    { clientId: 'ricco', clientName: 'Ricco', amount: 900, date: g(300), economic: { costTotal: 850 } },
    { clientId: 'ricco', clientName: 'Ricco', amount: 900, date: g(60), economic: { costTotal: 850 } },
    /* Buono: fattura meno, rende di più. */
    { clientId: 'buono', clientName: 'Buono', amount: 300, date: g(300), economic: { costTotal: 120 } },
    { clientId: 'buono', clientName: 'Buono', amount: 300, date: g(60), economic: { costTotal: 120 } },
  ];
  const r = C.calcola(righe, [], { adesso: Date.now() });
  return {
    primo: r[0].nome,
    fatturatoPrimo: r[0].storico.ricavo,
    marginePrimo: r[0].storico.margine,
    fatturatoSecondo: r[1].storico.ricavo,
    margineSecondo: r[1].storico.margine,
  };
});
dico('FASE A · il modulo del valore cliente è nel file consegnato', puro !== null);
dico('FASE A2 · in cima c\'è chi rende di più, non chi fattura di più ('
  + (puro ? puro.primo : '—') + ')', puro && puro.primo === 'Buono');
dico('FASE A3 · e infatti il primo fattura meno del secondo ('
  + (puro ? puro.fatturatoPrimo + ' contro ' + puro.fatturatoSecondo : '—') + ')',
  puro && puro.fatturatoPrimo < puro.fatturatoSecondo);
dico('FASE A4 · ma ha più margine (' + (puro ? puro.marginePrimo + ' contro ' + puro.margineSecondo : '—') + ')',
  puro && puro.marginePrimo > puro.margineSecondo);

/* ── FASE B · la frequenza si conta sugli intervalli ──────────────────────── */

const frequenza = await page.evaluate(() => {
  const C = window.InglyCLV;
  const g = (n) => new Date(Date.now() - n * 86400000).toISOString();
  const r = C.calcola([
    { clientId: 'x', clientName: 'X', amount: 100, date: g(365), economic: { costTotal: 50 } },
    { clientId: 'x', clientName: 'X', amount: 100, date: g(0), economic: { costTotal: 50 } },
  ], [], { adesso: Date.now() })[0];
  return { ordiniAnno: r.medie.ordiniAnno, previsto: r.previsto.margine, orizzonte: r.previsto.orizzonteMesi };
});
dico('FASE B · due acquisti a un anno di distanza fanno un intervallo, non due ('
  + frequenza.ordiniAnno.toFixed(2) + '/anno)', Math.abs(frequenza.ordiniAnno - 1) < 0.02);
dico('FASE B2 · e la proiezione a 12 mesi vale un margine medio ('
  + frequenza.previsto.toFixed(2) + ')', Math.abs(frequenza.previsto - 50) < 1);
dico('FASE B3 · con l\'orizzonte dichiarato (' + frequenza.orizzonte + ' mesi)',
  frequenza.orizzonte === 12);

/* ── FASE C · quello che non si sa non si inventa ─────────────────────────── */

const ignoto = await page.evaluate(() => {
  const C = window.InglyCLV;
  const g = (n) => new Date(Date.now() - n * 86400000).toISOString();
  const r = C.calcola([
    { clientId: 'y', clientName: 'Y', amount: 100, date: g(200) },
    { clientId: 'y', clientName: 'Y', amount: 100, date: g(20) },
    { clientId: 'z', clientName: 'Z', amount: 100, date: g(20) },
  ], [], { adesso: Date.now() });
  const y = r.find((c) => c.id === 'y');
  const z = r.find((c) => c.id === 'z');
  return {
    margineY: y.previsto.margine, ricavoY: y.previsto.ricavo, motivoY: y.previsto.motivo,
    margineZ: z.previsto.margine, motivoZ: z.previsto.motivo,
  };
});
dico('FASE C · senza costo dichiarato il margine previsto non si inventa',
  ignoto.margineY === null && /nessun costo/.test(ignoto.motivoY));
dico('FASE C2 · ma il fatturato si proietta lo stesso (' + (ignoto.ricavoY || 0).toFixed(0) + ')',
  ignoto.ricavoY > 0);
dico('FASE C3 · e con un acquisto solo non c\'è proiezione ('
  + (ignoto.motivoZ || '').slice(0, 30) + '…)',
  ignoto.margineZ === null && /un acquisto solo/.test(ignoto.motivoZ));

/* ── FASE D · la schermata mostra quello che il modulo calcola ────────────── */

const schermata = await page.evaluate(async () => {
  const g = (n) => new Date(Date.now() - n * 86400000).toISOString();
  const vendite = [
    { id: 950001, clientId: 950001, clientName: 'Collaudo Ricco', amount: 900, status: 'pagato', date: g(300), economic: { costTotal: 850 } },
    { id: 950002, clientId: 950001, clientName: 'Collaudo Ricco', amount: 900, status: 'pagato', date: g(60), economic: { costTotal: 850 } },
    { id: 950003, clientId: 950002, clientName: 'Collaudo Buono', amount: 300, status: 'pagato', date: g(300), economic: { costTotal: 120 } },
    { id: 950004, clientId: 950002, clientName: 'Collaudo Buono', amount: 300, status: 'pagato', date: g(60), economic: { costTotal: 120 } },
    { id: 950005, clientId: 950003, clientName: 'Collaudo Ignoto', amount: 400, status: 'pagato', date: g(250), economic: undefined },
    { id: 950006, clientId: 950003, clientName: 'Collaudo Ignoto', amount: 400, status: 'pagato', date: g(30), economic: undefined },
  ];
  for (const v of vendite) await window.IDB.put('sales', v);
  await window.IDB.put('clients', { id: 950001, name: 'Collaudo Ricco' });
  await window.IDB.put('clients', { id: 950002, name: 'Collaudo Buono' });
  await window.IDB.put('clients', { id: 950003, name: 'Collaudo Ignoto' });

  await window.App.navigate('clv');
  await new Promise((r) => setTimeout(r, 4000));
  const v = document.getElementById('view-clv');
  const t = v ? v.textContent : '';
  const righe = [...(v ? v.querySelectorAll('tbody tr') : [])]
    .map((r) => r.textContent.replace(/\s+/g, ' ').trim())
    .filter((r) => /Collaudo/.test(r));

  for (const s of vendite) await window.IDB.del('sales', s.id).catch(() => {});
  for (const c of [950001, 950002, 950003]) await window.IDB.del('clients', c).catch(() => {});

  return {
    chars: t.trim().length,
    intestazione12: /Valore 12 mesi/.test(t),
    niente3yr: !/CLV 3yr/.test(t),
    diceMargine: /a margine/i.test(t),
    copertura: /Costo noto su/.test(t),
    ordineRighe: righe.map((r) => (r.match(/Collaudo \w+/) || [''])[0]),
    etichettaMargine: righe.filter((r) => /margine/.test(r)).length,
    etichettaFatturato: righe.filter((r) => /costo non noto/.test(r)).length,
  };
});
dico('FASE D · la schermata si disegna (' + schermata.chars + ' caratteri)', schermata.chars > 500);
dico('FASE D2 · l\'orizzonte è dichiarato in intestazione', schermata.intestazione12);
dico('FASE D3 · e il «CLV 3yr» non dichiarato è sparito', schermata.niente3yr);
dico('FASE D4 · dice di misurare a margine e non a fatturato', schermata.diceMargine);
dico('FASE D5 · e dichiara su quanti clienti il costo è noto', schermata.copertura);
dico('FASE D6 · in classifica il cliente che rende di più sta sopra a quello che fattura di più ('
  + schermata.ordineRighe.join(' → ') + ')',
  schermata.ordineRighe.indexOf('Collaudo Buono') >= 0
  && schermata.ordineRighe.indexOf('Collaudo Buono') < schermata.ordineRighe.indexOf('Collaudo Ricco'));
dico('FASE D6b · e chi ha il costo non dichiarato sta sotto, non sopra',
  schermata.ordineRighe.indexOf('Collaudo Ignoto') > schermata.ordineRighe.indexOf('Collaudo Ricco'));
dico('FASE D7 · le righe col costo noto sono marcate «margine» ('
  + schermata.etichettaMargine + ')', schermata.etichettaMargine >= 2);
dico('FASE D8 · e quella senza costo dice che è fatturato ('
  + schermata.etichettaFatturato + ')', schermata.etichettaFatturato >= 1);

console.log('\nVALORE CLIENTE — A MARGINE, NON A FATTURATO\n');
if (puro) {
  console.log('  in cima  : ' + puro.primo);
  console.log('  fattura  : € ' + puro.fatturatoPrimo + ' contro € ' + puro.fatturatoSecondo);
  console.log('  rende    : € ' + puro.marginePrimo + ' contro € ' + puro.margineSecondo + '\n');
}
console.log('  classifica a schermo: ' + (schermata.ordineRighe.join(' → ') || '—') + '\n');

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
console.log('\nil cliente migliore è quello che rende, non quello che fattura ✔\n');
await browser.close();
