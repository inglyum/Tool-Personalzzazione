#!/usr/bin/env node
/**
 * riordino-consumo-reale.mjs — il riordino legge i movimenti veri.
 *
 * «Il riordino si calcola dal consumo reale» era una funzione che non aveva
 * mai funzionato, per due difetti indipendenti, ciascuno dei quali da solo
 * bastava a renderla inerte:
 *
 *   1. Il registro identifica l'articolo con una chiave composta —
 *      `materials:5`, perché lo stesso numero 5 può essere anche un articolo
 *      di magazzino — e chi lo interrogava passava l'id nudo, `5`.
 *   2. `quando()` leggeva `at`, `date`, `createdAt`. Il registro scrive
 *      `timestamp`. Ogni movimento valeva tempo zero e usciva dalla finestra.
 *
 * Misurato prima della correzione: cinque consumi registrati, e l'analisi che
 * rispondeva «nessuna uscita registrata negli ultimi 90 giorni». Trentacinque
 * test unitari verdi non se ne erano accorti, perché costruivano i movimenti
 * a mano con i campi che il modulo si aspettava.
 *
 * Questa suite parte dall'archivio vero: scrive un materiale, registra
 * consumi con `InglyInventory`, e guarda cosa dice la schermata.
 *
 *   node tests/qa/riordino-consumo-reale.mjs [file]
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

/* ── FASE A · una sola sezione per «cosa devo ricomprare» ───────────────── */

const sezioni = await page.evaluate(() => ({
  riordino: !!window.InglyRiordino,
  registro: !!window.InglyInventory,
  vistaAiReorder: !!document.getElementById('view-ai-reorder'),
  vistaStockalert: !!document.getElementById('view-stockalert'),
}));
dico('FASE A · il modulo del riordino c\'è', sezioni.riordino && sezioni.registro);
dico('FASE A2 · la seconda sezione «Riordino Intelligente» non c\'è più',
  !sezioni.vistaAiReorder && sezioni.vistaStockalert);

const rotta = await page.evaluate(async () => {
  await window.App.navigate('ai-reorder');
  await new Promise((r) => setTimeout(r, 2500));
  const v = document.getElementById('view-stockalert');
  return { attiva: !!v && v.classList.contains('active'), chars: v ? v.innerText.trim().length : 0 };
});
dico('FASE A3 · e il suo nome apre la sezione vera (' + rotta.chars + ' caratteri)',
  rotta.attiva && rotta.chars > 200);

/* ── FASE B · il registro e l'analisi parlano la stessa lingua ──────────── */

const contratto = await page.evaluate(async () => {
  const mat = { id: 980001, name: 'Collaudo consumo', unit: 'mq', costPer: 10, stock: 50, minStock: 5 };
  await window.IDB.put('materials', mat);
  /* Consumi distribuiti nel tempo: un consumo tutto in un giorno non dice
     niente sul ritmo, ed è giusto che il modulo lo rifiuti. */
  for (const giorni of [60, 45, 30, 15, 5]) {
    await window.InglyInventory.consuma('materials', 980001, 3, {
      itemName: mat.name, unit: 'mq', referenceType: 'MANUAL',
      timestamp: new Date(Date.now() - giorni * 86400000).toISOString(),
    });
  }
  const movimenti = await window.IDB.getAll('inventory_ledger').catch(() => []);
  const miei = movimenti.filter((m) => String(m.itemId).indexOf('980001') >= 0);
  const R = window.InglyRiordino;
  const analisi = R.analizza(movimenti, { ...mat, id: mat.id, stock: 35, minStock: 5 },
    { store: 'materials' });
  return {
    movimenti: miei.length,
    chiaveScritta: miei.length ? String(miei[0].itemId) : '—',
    campoData: miei.length ? Object.keys(miei[0]).filter((k) => /time|date|^at$/i.test(k)).join(',') : '—',
    misurabile: analisi.misurabile,
    motivo: analisi.consumo && analisi.consumo.motivo,
    alGiorno: analisi.misurabile ? analisi.consumo.alGiorno : null,
    suggerito: analisi.suggerito,
    giorniResidui: analisi.giorniResidui,
  };
});
dico('FASE B · i consumi finiscono nel registro (' + contratto.movimenti + ')',
  contratto.movimenti >= 5);
dico('FASE B2 · con la chiave composta che il registro usa (' + contratto.chiaveScritta + ')',
  /^materials:/.test(contratto.chiaveScritta));
dico('FASE B3 · e il campo data è «timestamp» (' + contratto.campoData + ')',
  /timestamp/.test(contratto.campoData));
dico('FASE B4 · l\'analisi li riconosce — prima diceva «nessuna uscita registrata» ('
  + (contratto.misurabile ? 'misurabile' : (contratto.motivo || 'no')) + ')',
  contratto.misurabile === true);
dico('FASE B5 · e ne ricava un consumo al giorno ('
  + (contratto.alGiorno != null ? contratto.alGiorno.toFixed(3) : '—') + ')',
  contratto.alGiorno > 0);
dico('FASE B6 · un punto di riordino calcolato, non scritto a mano ('
  + (contratto.suggerito != null ? contratto.suggerito.toFixed(1) : '—') + ')',
  contratto.suggerito > 0);
dico('FASE B7 · e i giorni che restano prima di rimanere senza ('
  + (contratto.giorniResidui != null ? Math.round(contratto.giorniResidui) : '—') + ')',
  contratto.giorniResidui > 0);

/* ── FASE C · e la schermata lo mostra ─────────────────────────────────── */

const schermata = await page.evaluate(async () => {
  await window.App.navigate('dashboard');
  await new Promise((r) => setTimeout(r, 600));
  await window.App.navigate('stockalert');
  await new Promise((r) => setTimeout(r, 4000));
  const v = document.getElementById('view-stockalert');
  const t = v ? v.innerText : '';
  return {
    chars: t.trim().length,
    trovaArticolo: /Collaudo consumo/.test(t),
    diceMovimenti: /movimenti/i.test(t),
    /* Le soglie inventate della vecchia sezione. */
    nienteMinimoInventato: !/Min: 3\b/.test(t),
  };
});
dico('FASE C · la sezione si disegna (' + schermata.chars + ' caratteri)', schermata.chars > 300);
dico('FASE C2 · e trova l\'articolo con i consumi registrati', schermata.trovaArticolo);
dico('FASE C3 · dichiarando che il numero viene dai movimenti', schermata.diceMovimenti);
dico('FASE C4 · niente soglia minima inventata', schermata.nienteMinimoInventato);

/* ── FASE D · senza movimenti non si inventa un consumo ────────────────── */

const senzaDati = await page.evaluate(async () => {
  const mat = { id: 980002, name: 'Collaudo senza movimenti', unit: 'pz', costPer: 2, stock: 4, minStock: 10 };
  await window.IDB.put('materials', mat);
  const movimenti = await window.IDB.getAll('inventory_ledger').catch(() => []);
  const a = window.InglyRiordino.analizza(movimenti, { ...mat, id: mat.id, stock: 4, minStock: 10 },
    { store: 'materials' });
  return { misurabile: a.misurabile, suggerito: a.suggerito, motivo: a.motivo || '', urgenza: a.urgenza };
});
dico('FASE D · senza movimenti il consumo non si inventa', senzaDati.misurabile === false);
dico('FASE D2 · e non esce un punto di riordino finto', senzaDati.suggerito === undefined || senzaDati.suggerito == null);
dico('FASE D3 · si dice che manca il dato (' + senzaDati.motivo.slice(0, 40) + '…)',
  /nessuna uscita registrata/.test(senzaDati.motivo));

console.log('\nRIORDINO — SUI MOVIMENTI VERI, NON SU UNA SOGLIA INVENTATA\n');
console.log('  chiave nel registro : ' + contratto.chiaveScritta);
console.log('  campo data          : ' + contratto.campoData);
console.log('  consumo al giorno   : ' + (contratto.alGiorno != null ? contratto.alGiorno.toFixed(3) : '—'));
console.log('  punto di riordino   : ' + (contratto.suggerito != null ? contratto.suggerito.toFixed(1) : '—'));
console.log('  giorni residui      : ' + (contratto.giorniResidui != null ? Math.round(contratto.giorniResidui) : '—') + '\n');

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
console.log('\nil consumo si legge dai movimenti, o si dice che manca ✔\n');
await browser.close();
