#!/usr/bin/env node
/**
 * profili-economici-pannello.mjs — la schermata che mancava.
 *
 * `cost-profiles.js` sa gestire manodopera, spese generali e imballo da prima
 * di questo pannello. Ci entravano però solo se qualcuno li scriveva a mano
 * nell'archivio: il codice li leggeva, nessuna schermata li scriveva. Un costo
 * che il programma sa trattare e che l'utente non può dichiarare vale zero.
 *
 * Qui si verifica il giro completo, come lo farebbe una persona: apro il
 * pannello, scrivo i miei numeri, salvo, e il preventivo cambia.
 *
 *   node tests/qa/profili-economici-pannello.mjs [file]
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

const NODO = '#ingly-profili-economici';

/* ── Il pannello esiste e si apre ────────────────────────────────────────── */
dico('il modulo del pannello è raggiungibile',
  await page.evaluate(() => typeof window.InglyProfiliEconomici === 'object'));

await page.evaluate(() => window.InglyProfiliEconomici.apri());
await page.waitForTimeout(1200);

const aperto = await page.evaluate((sel) => {
  const n = document.querySelector(sel);
  if (!n) return null;
  return {
    visibile: n.getBoundingClientRect().width > 200,
    schede: [...n.querySelectorAll('[data-tab]')].map((b) => b.getAttribute('data-tab')),
    campi: n.querySelectorAll('[data-campo]').length,
    testo: n.textContent.slice(0, 400),
  };
}, NODO);
dico('si apre e si vede', aperto && aperto.visibile);
dico('con le tre sezioni (' + (aperto ? aperto.schede.join(' · ') : '—') + ')',
  aperto && ['manodopera', 'overhead', 'imballo'].every((s) => aperto.schede.includes(s)));
dico('e i ruoli hanno due colonne, costo interno e tariffa cliente ('
  + (aperto ? aperto.campi : 0) + ' campi)', aperto && aperto.campi >= 18);
dico('la manodopera distingue i due numeri a parole, non solo nei campi',
  aperto && /costo interno/i.test(aperto.testo) && /tariffa cliente/i.test(aperto.testo));

/* ── Le spese generali: una modalità sola, e il conto si vede ────────────── */
await page.evaluate((sel) => {
  const n = document.querySelector(sel);
  n.querySelector('[data-tab="overhead"]').click();
}, NODO);
await page.waitForTimeout(500);

const spese = await page.evaluate((sel) => {
  const n = document.querySelector(sel);
  return {
    vuoteAvvisano: /non entrano in nessun preventivo/i.test(n.textContent),
    modi: [...n.querySelectorAll('[data-modo]')].map((b) => b.getAttribute('data-modo')),
    voci: n.querySelectorAll('[data-campo^="overhead.voci"]').length,
    zeroDiPartenza: [...n.querySelectorAll('[data-campo^="overhead.voci"]')]
      .every((e) => !parseFloat(e.value)),
  };
}, NODO);
dico('FASE A · le spese partono da zero, non da un affitto plausibile ('
  + spese.voci + ' voci)', spese.zeroDiPartenza && spese.voci >= 5);
dico('FASE A2 · e a zero il pannello dice che non entrano nel preventivo',
  spese.vuoteAvvisano);
dico('FASE A3 · le modalità di ripartizione sono quattro, esclusive ('
  + spese.modi.join(' · ') + ')',
  ['ora', 'lavoro', 'percento', 'nessuno'].every((m) => spese.modi.includes(m)));

/* Si compila come farebbe il laboratorio. */
const conto = await page.evaluate(async (sel) => {
  const n = document.querySelector(sel);
  const scrivi = (chiave, v) => {
    const e = n.querySelector('[data-campo="' + chiave + '"]');
    if (!e) return false;
    e.value = String(v);
    e.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  };
  scrivi('overhead.voci.0.mensile', 350);
  scrivi('overhead.voci.4.mensile', 50);
  await new Promise((s) => setTimeout(s, 350));
  scrivi('overhead.oreProduttiveAnnue', 1200);
  await new Promise((s) => setTimeout(s, 500));
  return document.querySelector(sel).textContent;
}, NODO);
dico('FASE B · 400 €/mese su 1200 ore diventa 4 €/h, e il pannello lo scrive',
  /4[.,]00.*l'ora|4[.,]00 l.ora/i.test(conto) || /€ 4,00 l/.test(conto));

/* ── Salvataggio, e il preventivo cambia ─────────────────────────────────── */
const prima = await page.evaluate(async () => {
  const s = window.InglyCostProfilesStore;
  const i = await s.ingresso({});
  return { labor: i.laborPerHour, overhead: i.overheadPerHour };
});

await page.evaluate(async (sel) => {
  const n = document.querySelector(sel);
  n.querySelector('[data-tab="manodopera"]').click();
  await new Promise((s) => setTimeout(s, 300));
  const e = document.querySelector(sel).querySelector('[data-campo="manodopera.0.costoOrarioInterno"]');
  e.value = '24';
  e.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((s) => setTimeout(s, 200));
  document.querySelector(sel).querySelector('[data-azione="salva"]').click();
}, NODO);
await page.waitForTimeout(1800);

const dopo = await page.evaluate(async () => {
  const s = window.InglyCostProfilesStore;
  s.invalida();
  const i = await s.ingresso({});
  return {
    labor: i.laborPerHour, overhead: i.overheadPerHour,
    chiuso: !document.querySelector('#ingly-profili-economici'),
    fonte: i._fonti && i._fonti.overhead,
  };
});
dico('FASE C · dopo il salvataggio il pannello si chiude', dopo.chiuso);
dico('FASE C2 · la manodopera salvata è quella scritta (' + prima.labor
  + ' → ' + dopo.labor + ' €/h)', dopo.labor === 24);
dico('FASE C3 · le spese generali salvate arrivano al motore (' + prima.overhead
  + ' → ' + dopo.overhead + ' €/h)', Math.abs(dopo.overhead - 4) < 0.001);
dico('FASE C4 · e non sono più «mancanti» ma dichiarate (' + dopo.fonte + ')',
  dopo.fonte === 'declared');

/* ── Riaperto, mostra quello che è stato salvato ─────────────────────────── */
await page.evaluate(() => window.InglyProfiliEconomici.apri('manodopera'));
await page.waitForTimeout(1200);
const riletto = await page.evaluate((sel) => {
  const n = document.querySelector(sel);
  const e = n.querySelector('[data-campo="manodopera.0.costoOrarioInterno"]');
  return { valore: e ? parseFloat(e.value) : null,
    spuntato: /✓/.test(n.querySelector('[data-tab="manodopera"]').textContent) };
}, NODO);
dico('FASE D · riaprendolo mostra i valori salvati (' + riletto.valore + ')',
  riletto.valore === 24);
dico('FASE D2 · e la scheda dice che è configurata', riletto.spuntato);

/* ── L imballo distingue pezzo e ordine ──────────────────────────────────── */
await page.evaluate((sel) => document.querySelector(sel).querySelector('[data-tab="imballo"]').click(), NODO);
await page.waitForTimeout(500);
const imballo = await page.evaluate((sel) => {
  const n = document.querySelector(sel);
  return {
    perOrdine: [...n.querySelectorAll('[data-campo$=".per"]')]
      .filter((s) => s.value === 'ordine').length,
    spiega: /su dieci pezzi/i.test(n.textContent),
    interruttori: n.querySelectorAll('input[type="checkbox"][data-campo]').length,
  };
}, NODO);
dico('FASE E · l imballo distingue «per pezzo» e «per ordine» ('
  + imballo.perOrdine + ' voci per ordine)', imballo.perOrdine > 0);
dico('FASE E2 · e spiega che il costo per ordine si divide', imballo.spiega);
dico('FASE E3 · ogni voce si può escludere senza cancellarla ('
  + imballo.interruttori + ')', imballo.interruttori >= 5);

await page.evaluate(() => window.InglyProfiliEconomici.chiudi());
await page.waitForTimeout(400);
dico('FASE F · chiudendolo non resta niente in pagina',
  await page.evaluate((sel) => !document.querySelector(sel), NODO));

console.log('\nPROFILI ECONOMICI — LA SCHERMATA CHE MANCAVA\n');
console.log('  manodopera : ' + prima.labor + ' → ' + dopo.labor + ' €/h');
console.log('  spese gen. : ' + prima.overhead + ' → ' + dopo.overhead + ' €/h (' + dopo.fonte + ')\n');

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
console.log('\nil laboratorio può dichiararsi ✔\n');
await browser.close();
