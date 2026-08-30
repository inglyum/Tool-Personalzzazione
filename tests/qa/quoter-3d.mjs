#!/usr/bin/env node
/**
 * quoter-3d.mjs — il margine chiesto è il margine ottenuto.
 *
 * Il difetto misurato: `PRICES = {p1: costo × 3.5}`. Lo slider «margine»
 * esisteva, andava dal 10 all'80%, e serviva solo per un avviso. Chi
 * impostava il 40% otteneva il 71,4%.
 *
 * Qui si guarda quello che finisce a schermo, non il sorgente: si leggono i
 * prezzi dalla tabella degli scaglioni e si confrontano con quelli che il
 * motore produce dagli stessi ingressi.
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
  const dico = (k, v) => out.passi.push({ passo: k, esito: v });
  const vicino = (a, b, t = 0.02) => Math.abs(a - b) < t;
  const E = window.InglyCostEngine;
  if (!E) { out.errori.push('InglyCostEngine assente'); return out; }
  if (typeof Print3DQuoter === 'undefined') { out.errori.push('Print3DQuoter assente'); return out; }

  /* `App.navigate` non restituisce sempre una promessa: si prova ogni nome
     conosciuto della sezione finché i campi non compaiono. */
  for (const sez of ['print3d_quoter', 'quoter_3d', 'print3d', 'quoter3d', 'stampa3d', 'smart_quoter_3d']) {
    try { await App.navigate(sez); } catch (e) { /* si prova il successivo */ }
    await new Promise((s) => setTimeout(s, 900));
    if (document.getElementById('p3d-g')) break;
  }
  dico('la vista del preventivatore 3D si apre', !!document.getElementById('p3d-g'));
  if (!document.getElementById('p3d-g')) return out;

  /* Il caso di calibrazione, inserito come farebbe l'utente. */
  const sv = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  sv('p3d-g', 290); sv('p3d-h', 9.95); sv('p3d-mkg', 24); sv('p3d-mu', 1000);
  sv('p3d-watt', 150); sv('p3d-kwh', 0.28); sv('p3d-duty', 0.6);
  sv('p3d-mc', 400); sv('p3d-lh', 2000); sv('p3d-mnt', 0.12);
  sv('p3d-fail', 7); sv('p3d-lr', 18); sv('p3d-setup', 15); sv('p3d-lm', 10);
  sv('p3d-qty', 1); sv('p3d-sup', 0); sv('p3d-wash', 0);
  Print3DQuoter.calc();
  await new Promise((s) => setTimeout(s, 500));

  const dettaglio = document.getElementById('p3d-bk')?.textContent || '';
  dico('il dettaglio dei costi viene disegnato', dettaglio.length > 60);

  const leggiEuro = (s) => parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.')) || 0;
  const costoSchermo = leggiEuro((dettaglio.match(/COSTO \/ PZ\s*€?\s*[\d.,]+/i) || [''])[0]);

  /* Lo stesso conto, chiesto al motore direttamente. */
  const atteso = E.calcola({
    tecnologia: 'print3d', grams: 290, hours: 9.95, qty: 1,
    spoolPrice: 24, spoolGrams: 1000, watt: 150, kwhPrice: 0.28, dutyCycle: 0.6,
    machinePrice: 400, machineLifeHours: 2000, maintenancePerHour: 0.12,
    failureRate: 7, laborPerHour: 18, setupMin: 15, finishMin: 10, washCureMin: 0,
  });
  dico('il costo a schermo è quello del motore (' + costoSchermo.toFixed(2) + ' vs ' + atteso.costoPezzo.toFixed(2) + ')',
    vicino(costoSchermo, atteso.costoPezzo, 0.05));

  /* I tre scaglioni: il prezzo deve venire dal margine, non dal moltiplicatore. */
  const tiers = document.getElementById('p3d-tiers')?.textContent || '';
  dico('gli scaglioni vengono disegnati', /SINGOLO/.test(tiers));

  const m1 = parseFloat(document.getElementById('p3d-m1')?.value) || 3.5;
  const margineDaMolt = (1 - 1 / m1) * 100;
  const prezzoAtteso = E.prezzo(atteso.costoPezzo, { strategia: 'margine', marginePct: margineDaMolt, ivaPct: 0 }).netto;
  const prezzoVecchio = atteso.costoPezzo * m1;

  dico('il moltiplicatore ×' + m1 + ' vale un margine del ' + margineDaMolt.toFixed(1) + '%', margineDaMolt > 70);
  dico('e il prezzo dal margine coincide con il vecchio ricarico (nessun numero si è mosso)',
    vicino(prezzoAtteso, prezzoVecchio, 0.02));

  /* Il margine mostrato accanto allo scaglione deve essere quello vero. */
  const margineMostrato = parseFloat((tiers.match(/Margine\s*([\d.,]+)%/) || [0, '0'])[1].replace(',', '.'));
  dico('il margine mostrato è quello reale (' + margineMostrato.toFixed(1) + '%)',
    vicino(margineMostrato, margineDaMolt, 0.15));

  /* La prova che lo slider adesso comanda: si cambia e il prezzo cambia. */
  const modulo = window.InglyQuoter3DView;
  dico('il modulo della vista è nel bundle', !!modulo);
  if (modulo) {
    const ing = { tecnologia: 'print3d', grams: 290, hours: 9.95, qty: 1, materialPricePerKg: 24,
      watt: 150, kwhPrice: 0.28, dutyCycle: 0.6, machinePrice: 400, machineLifeHours: 2000,
      maintenancePerHour: 0.12, failureRate: 7, laborPerHour: 18, setupMin: 15, finishMin: 10 };
    const a40 = modulo.calcola(ing, { modalita: 'completo', marginePct: 40 });
    const a60 = modulo.calcola(ing, { modalita: 'completo', marginePct: 60 });
    dico('chiedendo il 40% si ottiene il 40%', vicino(a40.marginePct, 40, 0.001));
    dico('chiedendo il 60% si ottiene il 60%', vicino(a60.marginePct, 60, 0.001));
    dico('e il prezzo cambia di conseguenza', a60.prezzo > a40.prezzo * 1.4);
    dico('il costo di stampa si vede accanto a quello pieno', vicino(a40.costoStampa, 7.21, 0.05) && vicino(a40.costo, 18.68, 0.05));
    dico('le quattro politiche sono calcolate', a40.strategie.length === 4);
    dico('e ognuna ottiene il margine che dichiara',
      a40.strategie.every((s) => vicino(s.marginePct, s.marginTarget, 0.001)));
  }

  /* Nessuna duplicazione introdotta. */
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id).filter(Boolean);
  const dupli = ids.filter((x, i) => ids.indexOf(x) !== i);
  dico('nessun id duplicato nel documento', dupli.length === 0);
  const bottoniCalc = [...document.querySelectorAll('#view-print3d_quoter button, [id^=p3d] button')]
    .filter((b) => /calcola/i.test(b.textContent)).length;
  dico('nessun pulsante «calcola» duplicato', bottoniCalc <= 1);

  return out;
});

console.log('\nSMART QUOTER 3D — il margine chiesto è il margine ottenuto\n');
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
console.log('\nil prezzo lo fa il motore, anche a schermo ✔\n');
await browser.close();
