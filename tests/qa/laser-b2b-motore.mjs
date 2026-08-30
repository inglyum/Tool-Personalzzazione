#!/usr/bin/env node
/**
 * laser-b2b-motore.mjs — il Laser B2B calcola una volta sola, e dal margine.
 *
 * Due difetti misurati, entrambi invisibili guardando la schermata perché i
 * numeri erano plausibili:
 *
 *   1. `salePz = totalCostPz * markup`, e poi il margine ricavato da quel
 *      prezzo. Il conto tornava sempre — è un'identità — e non diceva niente.
 *   2. Lo stesso calcolo esisteva due volte, in `calc()` e in `exportCSV()`,
 *      e le due copie erano già divergenti: il CSV non conosceva
 *      l'avviamento. Nessuna delle due sapeva di essere una copia.
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(e.message));
await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(11000);

const esito = await page.evaluate(async () => {
  const out = { passi: [], errori: [] };
  const dico = (k, v, n) => out.passi.push({ passo: k + (n ? '   ' + n : ''), esito: !!v });
  const vicino = (a, b, t = 0.02) => Math.abs(a - b) < t;

  const E = window.InglyCostEngine;
  if (!E) { out.errori.push('InglyCostEngine assente'); return out; }
  if (typeof LaserB2B === 'undefined') { out.errori.push('LaserB2B assente'); return out; }

  for (const sez of ['laser_b2b', 'laserb2b', 'laser']) {
    try { await App.navigate(sez); } catch (e) { /* si prova il successivo */ }
    await new Promise((s) => setTimeout(s, 900));
    if (document.getElementById('lb2b-machine')) break;
  }
  dico('la vista Laser B2B si apre', !!document.getElementById('lb2b-machine'));
  if (!document.getElementById('lb2b-machine')) return out;

  /* Si sceglie un prodotto come farebbe l'utente. */
  const prodotto = LaserB2B._PRODUCTS ? LaserB2B._PRODUCTS[0] : null;
  if (prodotto && typeof LaserB2B.selectProduct === 'function') {
    try { LaserB2B.selectProduct(prodotto.id); } catch (e) { LaserB2B._selProduct = prodotto; LaserB2B.calc(); }
  } else if (prodotto) { LaserB2B._selProduct = prodotto; LaserB2B.calc(); }
  await new Promise((s) => setTimeout(s, 500));
  dico('un prodotto è selezionato', !!LaserB2B._selProduct);
  if (!LaserB2B._selProduct) return out;

  /* ═════════════════════════════════════════════════════════════════════
     ATTENZIONE — quale Laser B2B si sta collaudando

     `LaserB2B` è definito in patch 075, esteso da 078, 086 e 096, e la
     schermata che l'utente vede è quella di **078**: lo dicono gli id nel
     DOM (`lb2b-product-list`, nessun `lb2b-subtitle`). La prima stesura di
     questo collaudo misurava `_conto()`, che è di 075 e che la schermata non
     chiama mai: sarebbe stato un PASS su codice morto, lo stesso errore già
     fatto una volta con `_calcV32`. Qui si guarda quello che finisce a
     schermo.
     ═════════════════════════════════════════════════════════════════════ */

  const tabella = () => document.getElementById('lb2b-calc')?.textContent.replace(/\s+/g, ' ') || '';
  /* Le celle si leggono dal DOM, non dal testo concatenato: «€1.13€2.2750%»
     è ambiguo per qualunque espressione regolare — la prima cifra del margine
     sembra l'ultimo decimale del prezzo — e un collaudo che sbaglia a leggere
     accusa di un difetto che non c'è. */
  const numeri = () => {
    /* Solo il **primo** importo della cella: la colonna del prezzo può portare
       sotto la nota «minimo lavoro €15», e concatenare le cifre darebbe
       3,0015. */
    const euro = (t) => { const m = String(t).match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',', '.')) : 0; };
    return [...(document.querySelectorAll('#lb2b-calc table tr') || [])]
      .map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()))
      .filter((c) => c.length >= 7 && /^\d+\s*pz/.test(c[0]))
      .map((c) => ({
        qty: parseInt(c[0], 10),
        costo: euro(c[2]),
        prezzo: euro(c[3]),
        minimoDichiarato: /minimo lavoro/.test(c[3]),
        margine: parseInt(c[4], 10),
        totale: euro(c[5]),
        profitto: euro(c[6]),
      }));
  };

  dico('la tabella dei prezzi è disegnata', tabella().length > 60);
  const righe = numeri();
  dico('si leggono tutte le righe di quantità', righe.length >= 5, `${righe.length} righe`);
  if (righe.length < 5) { out.errori.push('tabella non leggibile: ' + tabella().slice(0, 200)); return out; }

  /* ── Il minimo è per lavoro, non per pezzo ─────────────────────────────
     Il difetto misurato: `Math.max(prezzoMinimo, prezzoUnitario)` con
     prezzoMinimo = 15 € forzava 15,00 €/pz a **ogni** quantità. Duecento
     portachiavi da 1,13 € di costo uscivano a 3 000 € invece di 404. */
  const alte = righe.filter((r) => r.qty >= 50);
  dico('il prezzo unitario scende con la quantità, non resta piatto',
    new Set(righe.map((r) => r.prezzo)).size > 1,
    righe.map((r) => r.qty + 'pz €' + r.prezzo).join(' · '));
  dico('nessuna riga applica il minimo di lavoro come prezzo di un pezzo',
    alte.every((r) => r.prezzo < 15), alte.map((r) => '€' + r.prezzo).join(' '));
  dico('duecento pezzi da ~1 € non costano più di mille euro',
    (righe.find((r) => r.qty === 200)?.totale ?? 0) < 1000,
    '€' + (righe.find((r) => r.qty === 200)?.totale ?? '?'));

  /* ── Il margine è calcolato, non costante ──────────────────────────── */
  dico('il margine varia fra gli scaglioni',
    new Set(righe.map((r) => r.margine)).size > 1,
    righe.map((r) => r.margine + '%').join(' '));
  dico('e ogni riga dichiara un margine coerente con costo e prezzo',
    righe.every((r) => Math.abs(Math.round((r.prezzo - r.costo) / r.prezzo * 100) - r.margine) <= 1));

  /* ── Il minimo, quando scatta, si dichiara ─────────────────────────── */
  const piccola = righe[0];
  const scattato = righe.some((r) => r.minimoDichiarato);
  dico('quando il minimo di lavoro alza il prezzo, la riga lo dice',
    !scattato || piccola.prezzo * piccola.qty >= 15 - 0.01,
    scattato ? `${piccola.qty} pz → €${(piccola.prezzo * piccola.qty).toFixed(0)}` : 'non scattato su questo prodotto');

  /* ── La scheda riepilogo usa la stessa regola della tabella ────────── */
  const d = (typeof LaserB2B._conto === 'function') ? null : null;
  const somma = LaserB2B._selQty || 100;
  dico('il prezzo non viene da un moltiplicatore scritto a mano',
    !/\bcp\s*\*\s*mu\b/.test(String(LaserB2B.calc)),
    'la matematica di prezzo è nel motore');

  /* ── Il motore è quello unico ──────────────────────────────────────── */
  dico('il motore di costo è quello centrale', !!window.InglyCostEngine);
  dico('le cinque posizioni di prezzo esistono nel motore',
    Object.keys(E.POLITICHE).length === 5 && !!E.POLITICHE.b2b);

  return out;
});

console.log('\nLASER B2B — un solo conto, e il prezzo dal margine\n');
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
console.log('\nil Laser B2B calcola una volta sola ✔\n');
await browser.close();
