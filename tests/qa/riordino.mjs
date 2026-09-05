#!/usr/bin/env node
/**
 * riordino.mjs — quando ricomprare, calcolato invece che indovinato.
 *
 * Il difetto misurato: Stock Alert prometteva «basato sui tuoi ordini reali» e
 * leggeva `m.monthlyConsumption` — un secondo numero scritto a mano accanto a
 * `minStock`, che nessuno aggiorna. Il registro dei movimenti sa quanto è
 * uscito e quando, e non veniva interrogato.
 *
 *   node tests/qa/riordino.mjs [file]
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
  ['ingly_wizard_done_v2', 'ingly_tour_done_v1', '_wizard_done_v37'].forEach((k) => localStorage.setItem(k, '1'));
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* ── 1 · IL MOTORE C'È ED È PURO ────────────────────────────────────────── */
const base = await page.evaluate(() => {
  if (typeof InglyRiordino === 'undefined') return { assente: true };
  return {
    assente: false,
    funzioni: ['consumo', 'puntoRiordino', 'analizza', 'elenco'].filter((f) => typeof InglyRiordino[f] !== 'function'),
  };
});
dico('il motore del riordino è in pagina', !base.assente);
dico('con tutte le sue funzioni (' + (base.funzioni || []).join(', ') + ')', (base.funzioni || []).length === 0);

/* ── 2 · IL CONSUMO VIENE DAI MOVIMENTI VERI ────────────────────────────── */
const dati = await page.evaluate(async () => {
  const GIORNO = 24 * 60 * 60 * 1000;
  const ora = Date.now();
  const fa = (n) => new Date(ora - n * GIORNO).toISOString();

  /* Un materiale con sessanta giorni di storico: 2 al giorno. */
  await IDB.put('materials', {
    id: 90101, name: 'PLA Nero QA', quantity: 30, unit: 'kg',
    minStock: 3, monthlyConsumption: 999, leadTime: 7, price: 20,
  });
  /* Un materiale senza nessun movimento: il consumo non è misurabile. */
  await IDB.put('materials', {
    id: 90102, name: 'Resina Muta QA', quantity: 10, unit: 'L',
    minStock: 2, monthlyConsumption: 6, price: 40,
  });

  for (let g = 60, i = 0; g >= 1; g -= 2, i += 1) {
    await IDB.put('inventory_ledger', {
      id: 'qa-mov-' + i, itemId: 90101, type: 'CONSUMPTION',
      quantity: 4, at: fa(g), unitCost: 20,
    });
  }

  const mov = await IDB.getAll('inventory_ledger');
  const a = InglyRiordino.analizza(mov, { id: 90101, name: 'PLA Nero QA', stock: 30, minStock: 3, leadTime: 7 }, {});
  const b = InglyRiordino.analizza(mov, { id: 90102, name: 'Resina Muta QA', stock: 10, minStock: 2 }, {});
  return { a, b, movimenti: mov.filter((m) => m.itemId === 90101).length };
});
dico('i movimenti sono nel registro (' + dati.movimenti + ')', dati.movimenti === 30);
dico('il consumo è misurabile', dati.a.misurabile === true);
dico('e vale circa 2 al giorno (' + dati.a.consumo.alGiorno.toFixed(2) + ')',
  Math.abs(dati.a.consumo.alGiorno - 2) < 0.1);
dico('la stima è dichiarata affidabile', dati.a.consumo.affidabile === true);
dico('il punto di riordino è calcolato, non copiato da minStock',
  dati.a.suggerito > 0 && Math.abs(dati.a.suggerito - dati.a.sogliaScritta) > 1);
dico('e si vede che la soglia scritta era troppo bassa', dati.a.scostamentoSoglia > 0);
dico('i giorni residui sono giacenza diviso consumo (' + Math.round(dati.a.giorniResidui) + ')',
  Math.abs(dati.a.giorniResidui - 15) < 2);

dico('un materiale senza movimenti dichiara che non lo sa', dati.b.misurabile === false);
dico('e non propone un numero inventato', dati.b.suggerito === undefined);
dico('ma dice cosa fare', (dati.b.cosaFare || '').length > 0);

/* ── 3 · LA SOGLIA DELL'UTENTE NON VIENE SOVRASCRITTA ───────────────────── */
const intatta = await page.evaluate(async () => {
  const prima = await IDB.get('materials', 90101);
  const mov = await IDB.getAll('inventory_ledger');
  InglyRiordino.analizza(mov, prima, {});
  InglyRiordino.elenco(mov, [prima], {});
  const dopo = await IDB.get('materials', 90101);
  return { prima: prima.minStock, dopo: dopo.minStock };
});
dico('analizzare non tocca minStock', intatta.prima === intatta.dopo && intatta.dopo === 3);

/* ── 4 · LA SEZIONE LO MOSTRA ───────────────────────────────────────────── */
const vista = await page.evaluate(async () => {
  App.navigate('stockalert');
  await new Promise((s) => setTimeout(s, 3200));
  const el = document.getElementById('view-stockalert');
  const testo = el ? el.textContent : '';
  return {
    aperta: !!el && testo.length > 100,
    sottotitolo: /movimenti di magazzino registrati/.test(testo),
    promessaVecchia: /basato sui tuoi ordini reali/.test(testo),
    suggerimento: /dai movimenti:/.test(testo),
    nostroMateriale: /PLA Nero QA/.test(testo),
    nonDaiMovimenti: /non dai movimenti/.test(testo),
  };
});
dico('la sezione Stock Alert si apre', vista.aperta);
dico('il nostro materiale è in elenco', vista.nostroMateriale);
dico('mostra la soglia calcolata dai movimenti', vista.suggerimento);
dico('il sottotitolo dice quel che la sezione fa davvero', vista.sottotitolo);
dico('e non promette più «basato sui tuoi ordini reali»', !vista.promessaVecchia);
dico('un materiale senza movimenti è dichiarato tale', vista.nonDaiMovimenti);

/* ── 5 · L'ELENCO ORDINA PER URGENZA ────────────────────────────────────── */
const ordine = await page.evaluate(async () => {
  const mov = await IDB.getAll('inventory_ledger');
  const items = [
    { id: 90101, name: 'Abbondante', stock: 5000, leadTime: 7 },
    { id: 90101, name: 'Esaurito', stock: 0, leadTime: 7 },
    { id: 90101, name: 'Da ordinare', stock: 10, leadTime: 7 },
    { id: 90199, name: 'Mai usato', stock: 3 },
  ];
  const e = InglyRiordino.elenco(mov, items, {});
  return { nomi: e.righe.map((r) => r.nome), daOrdinare: e.daOrdinare.length, nonMisurabili: e.nonMisurabili };
});
dico('l esaurito viene per primo', ordine.nomi[0] === 'Esaurito');
dico('e il non misurabile va in fondo, senza sparire', ordine.nomi[ordine.nomi.length - 1] === 'Mai usato');
dico('l elenco conta quanti sono da ordinare', ordine.daOrdinare >= 2);
dico('e quanti non sono misurabili', ordine.nonMisurabili === 1);

/* ── 6 · PERSISTENZA ────────────────────────────────────────────────────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);
const dopo = await page.evaluate(async () => {
  const mov = await IDB.getAll('inventory_ledger');
  const m = await IDB.get('materials', 90101);
  const a = InglyRiordino.analizza(mov, m, {});
  return { movimenti: mov.filter((x) => x.itemId === 90101).length, alGiorno: a.misurabile ? a.consumo.alGiorno : null, minStock: m.minStock };
});
dico('dopo la ricarica i movimenti ci sono ancora', dopo.movimenti === 30);
dico('e il consumo si ricalcola uguale', dopo.alGiorno != null && Math.abs(dopo.alGiorno - 2) < 0.1);
dico('e minStock non è cambiato', dopo.minStock === 3);

console.log('\nMAGAZZINO — QUANDO RICOMPRARE\n');
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
console.log('\ncalcolato, non indovinato ✔\n');
await browser.close();
