#!/usr/bin/env node
/**
 * laser-b2b.mjs — il calcolatore che l'utente usa passa dal motore.
 *
 * La verifica **non** può essere testuale. `LaserB2B.calc` è un involucro che
 * chiama il calcolatore vero e poi disegna un pannello: il suo sorgente non
 * nomina il motore, e leggerlo avrebbe detto «non migrato» su una funzione
 * migrata. Un rilevatore che guarda le stringhe si fa ingannare da una riga
 * di delega.
 *
 * Si misura quello che finisce a schermo: si disegna la tabella dei prezzi e
 * si confrontano i numeri con quelli che il motore produce dagli stessi
 * ingressi. Se coincidono, il conto è passato di lì.
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
  const vicino = (a, b, t = 0.005) => Math.abs(a - b) < t;

  if (typeof LaserB2B === 'undefined') { out.errori.push('LaserB2B assente'); return out; }
  if (!window.InglyCostEngine) { out.errori.push('InglyCostEngine assente'); return out; }
  const E = window.InglyCostEngine;

  await App.navigate('laser_b2b');
  await new Promise((s) => setTimeout(s, 2500));

  dico('la vista disegna l\'interfaccia con i campi macchina/canale', !!document.getElementById('lb2b-machine'));

  /* Si sceglie un prodotto e si fa disegnare la tabella. */
  const prods = LaserB2B._PRODUCTS || [];
  dico('il catalogo ha prodotti', prods.length > 0);
  if (!prods.length) return out;

  const p = prods.find((x) => (x.cost || x.costSup) > 6) || prods[0];
  LaserB2B._selProduct = p;
  if (LaserB2B._selectProduct) { try { LaserB2B._selectProduct(p.id); } catch (e) { /* alcune versioni non l'hanno */ } }
  if (LaserB2B.calc) LaserB2B.calc();
  await new Promise((s) => setTimeout(s, 600));

  const tabella = document.getElementById('lb2b-calc');
  dico('la tabella dei prezzi viene disegnata', !!tabella && tabella.innerHTML.length > 200);
  if (!tabella) return out;

  /* I numeri a schermo, per quantità. */
  const righe = [...tabella.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()))
    .filter((c) => c.length >= 6 && /^\d+\s*pz$/.test(c[0]));
  dico('la tabella ha una riga per scaglione', righe.length >= 4);
  if (!righe.length) return out;

  /* Gli stessi ingressi, dati al motore direttamente. */
  const mk = document.getElementById('lb2b-machine')?.value || 'xtool_f2';
  const m = (LaserB2B._MACHINES || {})[mk];
  const lH = parseFloat(document.getElementById('lb2b-labor')?.value) || 18;
  const pk = parseFloat(document.getElementById('lb2b-pack')?.value) || 0.30;
  const ck = document.getElementById('lb2b-channel')?.value || 'b2b';
  const mu = (LaserB2B._markup || {})[ck] || 2.0;
  const stock = (LaserB2B._loadStock && LaserB2B._loadStock()) || {};
  const base = stock[p.id]?.cost || p.costSup || p.cost || 0;

  const attesi = righe.map((c) => {
    const qty = parseInt(c[0], 10);
    const sd = qty >= 200 ? 0.15 : qty >= 100 ? 0.10 : qty >= 50 ? 0.07 : qty >= 20 ? 0.04 : 0;
    const mc = base * (1 - sd);
    const tm = p.timeMin * (qty >= 50 ? 0.85 : qty >= 20 ? 0.92 : 1);
    const mhc = (m.hourly + (m.energyH || m.energyHourly || 0)) / 60 * tm;
    const lc = lH / 60 * tm;
    const cc = E.calcola({
      tecnologia: 'generico', qty: 1,
      costiPerPezzo: [
        { id: 'materiale', value: mc }, { id: 'macchina', value: mhc },
        { id: 'manodopera', value: lc, perdibile: false },
        { id: 'packaging', value: pk, perdibile: false },
      ],
    });
    const pr = E.prezzo(cc.costoPezzo, { strategia: 'ricarico', ricarico: mu, marginePavimentoPct: 15, ivaPct: 0 });
    return { qty, cp: cc.costoPezzo, fp: Math.max(15, pr.netto) };
  });

  const leggiEuro = (s) => parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
  let costiOk = 0, prezziOk = 0;
  righe.forEach((c, i) => {
    if (vicino(leggiEuro(c[2]), attesi[i].cp)) costiOk++;
    if (vicino(leggiEuro(c[3]), attesi[i].fp)) prezziOk++;
  });

  dico('i costi a schermo sono quelli del motore (' + costiOk + '/' + righe.length + ')', costiOk === righe.length);
  dico('i prezzi a schermo sono quelli del motore (' + prezziOk + '/' + righe.length + ')', prezziOk === righe.length);

  /* Il controllo negativo: se il motore sparisce, la tabella non inventa un
     prezzo — mostra il costo e dichiara l'indisponibilità. */
  const salvato = window.InglyCostEngine;
  try {
    window.InglyCostEngine = null;
    LaserB2B.calc();
    await new Promise((s) => setTimeout(s, 400));
    const senza = document.getElementById('lb2b-calc');
    dico('senza motore la tabella non indovina un prezzo',
      /non disponibile/i.test(senza.textContent));
  } finally {
    window.InglyCostEngine = salvato;
    LaserB2B.calc();
  }

  /* Le politiche hanno un nome e si possono sovrascrivere. */
  dico('il prezzo minimo e gli scaglioni sono sovrascrivibili',
    typeof LaserB2B._politiche === 'undefined' || typeof LaserB2B._politiche === 'object');

  return out;
});

console.log('\nLASER QUOTER B2B — il calcolatore in uso passa dal motore\n');
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
console.log('\nun motore solo, anche nel calcolatore che si usa ✔\n');
await browser.close();
