#!/usr/bin/env node
/**
 * energia-fonte-unica.mjs — un prezzo dell'energia solo, per tutta l'app.
 *
 * Prima di questa suite il prezzo del kilowattora era scritto a mano in sette
 * posti: il markup del Calcolatore Laser, quello del Catalogo macchine, e
 * cinque preventivatori che se lo ricopiavano a vicenda. Cambiare la bolletta
 * significava trovarli tutti, e chi ne trovava sei otteneva sei preventivi
 * coerenti e uno sbagliato.
 *
 * Qui non si legge il codice: si apre l'applicazione, si dichiara un prezzo
 * assurdo e riconoscibile — 0,99 €/kWh — e si controlla che arrivi ovunque.
 * Un numero che nessun predefinito potrebbe produrre per caso.
 *
 *   node tests/qa/energia-fonte-unica.mjs [file]
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

const PREZZO = 0.99;

/* ── FASE A · prima di dichiarare: c'è un valore di partenza, e si dichiara ── */

const partenza = await page.evaluate(() => {
  const S = window.InglyCostProfilesStore;
  if (!S) return null;
  const i = S.ingressoSincrono({}) || {};
  return { kwh: i.kwhPrice, fonte: i._fonti && i._fonti.energia };
});
dico('FASE A · lo store risponde col prezzo dell\'energia', partenza && partenza.kwh > 0);
dico('FASE A2 · e dichiara che è un valore di partenza (' + (partenza ? partenza.fonte : '—') + ')',
  partenza && partenza.fonte === 'estimated');

/* ── FASE B · si dichiara il prezzo, come farebbe una persona ─────────────── */

const salvato = await page.evaluate(async (p) => {
  const S = window.InglyCostProfilesStore;
  const ok = await S.salvaEnergia(p);
  S.invalida();
  await S.ingresso({});
  return ok;
}, PREZZO);
dico('FASE B · il prezzo dichiarato si salva', salvato);

const dopo = await page.evaluate(() => {
  const i = window.InglyCostProfilesStore.ingressoSincrono({}) || {};
  return { kwh: i.kwhPrice, fonte: i._fonti && i._fonti.energia };
});
dico('FASE B2 · e torna indietro identico (' + (dopo ? dopo.kwh : '—') + ' €/kWh)',
  dopo && Math.abs(dopo.kwh - PREZZO) < 0.0001);
dico('FASE B3 · adesso la fonte è «dichiarato»', dopo && dopo.fonte === 'declared');

/* ── FASE C · salvare l'energia non cancella le spese generali ────────────── */

const convivenza = await page.evaluate(async () => {
  const S = window.InglyCostProfilesStore;
  await S.salvaOverhead({
    modo: 'ora', oreProduttiveAnnue: 1200, lavoriAnnui: 0, percentuale: 0,
    voci: [{ id: 'affitto', label: 'Affitto', mensile: 600 }],
  });
  S.invalida();
  await S.ingresso({});
  const a = S.ingressoSincrono({}) || {};
  await S.salvaEnergia(0.99);
  S.invalida();
  await S.ingresso({});
  const b = S.ingressoSincrono({}) || {};
  return { affittoPrima: a.overheadPerHour, affittoDopo: b.overheadPerHour, kwh: b.kwhPrice };
});
dico('FASE C · le spese generali entrano nel conto ('
  + (convivenza.affittoPrima || 0).toFixed(2) + ' €/h)', convivenza.affittoPrima > 0);
dico('FASE C2 · salvare l\'energia non le cancella',
  Math.abs(convivenza.affittoDopo - convivenza.affittoPrima) < 0.001);
dico('FASE C3 · e l\'energia è ancora quella dichiarata',
  Math.abs(convivenza.kwh - PREZZO) < 0.0001);

const controprova = await page.evaluate(async () => {
  const S = window.InglyCostProfilesStore;
  await S.salvaOverhead({
    modo: 'ora', oreProduttiveAnnue: 1200, lavoriAnnui: 0, percentuale: 0,
    voci: [{ id: 'affitto', label: 'Affitto', mensile: 700 }],
  });
  S.invalida();
  await S.ingresso({});
  return (S.ingressoSincrono({}) || {}).kwhPrice;
});
dico('FASE C4 · e salvare le spese generali non cancella l\'energia ('
  + controprova + ')', Math.abs(controprova - PREZZO) < 0.0001);

/* ── FASE D · il prezzo arriva nei preventivatori ─────────────────────────── */

const quoter3d = await page.evaluate(() => {
  const Q = window.Print3DQuoter;
  if (!Q || typeof Q.prezzoEnergia !== 'function') return null;
  return Q.prezzoEnergia();
});
dico('FASE D · Smart Quoter 3D usa il prezzo dichiarato (' + quoter3d + ')',
  quoter3d != null && Math.abs(quoter3d - PREZZO) < 0.0001);

/* La rotta «lasercalc» la disegna il Calcolatore Macchine v4 (patch 120), non
   il LaserCalcPage del markup: tre moduli scrivono in #view-lasercalc e vince
   l'ultimo che si aggancia alla navigazione. Qui si prova quello vivo — quello
   che l'utente vede aprendo la sezione. */
await page.evaluate(() => { try { localStorage.removeItem('v4_cm_input'); } catch (e) {} });
await page.evaluate(() => window.App.navigate('lasercalc'));
await page.waitForTimeout(3500);

const calcMacchine = await page.evaluate(() => {
  const campo = document.getElementById('_f_kwh');
  return {
    disegnato: !!document.querySelector('#view-lasercalc ._cm_mach_card') || !!campo,
    kwh: campo ? parseFloat(campo.value) : null,
  };
});
dico('FASE D2 · la sezione «Calcolatore» si disegna', calcMacchine.disegnato);
dico('FASE D3 · e usa il prezzo dichiarato (' + calcMacchine.kwh + ')',
  calcMacchine.kwh != null && Math.abs(calcMacchine.kwh - PREZZO) < 0.0001);

/* Il Catalogo: i parametri macchina stanno nella scheda prodotto. */
const catalogo = await page.evaluate(async () => {
  try { localStorage.removeItem('ingly_laser_80w'); } catch (e) {}
  window.App.navigate('catalog');
  await new Promise((r) => setTimeout(r, 2000));
  if (window.Catalog && window.Catalog.openModal) { try { await window.Catalog.openModal(); } catch (e) { return { errore: e.message }; } }
  await new Promise((r) => setTimeout(r, 1500));
  const k = document.getElementById('cm-kwh');
  const l = document.getElementById('cm-labor');
  const n = document.getElementById('cm-profilo-nota');
  return {
    kwh: k ? parseFloat(k.value) : null,
    labor: l ? parseFloat(l.value) : null,
    nota: n ? n.textContent.trim() : '',
  };
});
dico('FASE D4 · il Catalogo macchine usa il prezzo dichiarato (' + catalogo.kwh + ')',
  catalogo.kwh != null && Math.abs(catalogo.kwh - PREZZO) < 0.0001);
dico('FASE D5 · e la tariffa oraria arriva dai profili (' + catalogo.labor + ' €/h)',
  catalogo.labor > 0);
dico('FASE D6 · e dice da dove vengono i due numeri',
  /profili economici/i.test(catalogo.nota));

/* ── FASE E · il valore del profilo non viene congelato ──────────────────── */

const congelamento = await page.evaluate(async () => {
  /* Il difetto che questa fase esiste per prendere: la schermata salvava tutti
     i campi a ogni ricalcolo. Il primo rendering avrebbe scritto in archivio il
     valore del profilo, e da lì in poi cambiare i profili non avrebbe cambiato
     più niente — il collegamento sarebbe esistito solo il giorno in cui è stato
     scritto. */
  window.Catalog.saveMachineParams();
  const salvato = JSON.parse(localStorage.getItem('ingly_laser_80w') || '{}');
  const S = window.InglyCostProfilesStore;
  await S.salvaEnergia(0.44);
  S.invalida();
  await S.ingresso({});
  window.Catalog.loadMachineParams();
  const campo = document.getElementById('cm-kwh');
  return {
    congelato: Object.prototype.hasOwnProperty.call(salvato, 'kwh'),
    dopoIlCambio: campo ? parseFloat(campo.value) : null,
  };
});
dico('FASE E · il valore del profilo non finisce in archivio', !congelamento.congelato);
dico('FASE E2 · e cambiare i profili cambia davvero il campo ('
  + congelamento.dopoIlCambio + ')',
  congelamento.dopoIlCambio != null && Math.abs(congelamento.dopoIlCambio - 0.44) < 0.0001);

/* ── FASE F · un valore scritto a mano resta di chi l'ha scritto ─────────── */

const manuale = await page.evaluate(async () => {
  const campo = document.getElementById('cm-kwh');
  if (!campo) return null;
  campo.value = '0.61';
  window.Catalog.saveMachineParams();
  const salvato = JSON.parse(localStorage.getItem('ingly_laser_80w') || '{}');
  window.Catalog.loadMachineParams();
  const dopo = document.getElementById('cm-kwh');
  return { inArchivio: salvato.kwh, sopravvive: dopo ? parseFloat(dopo.value) : null };
});
dico('FASE F · un prezzo scritto a mano si salva (' + (manuale && manuale.inArchivio) + ')',
  manuale && Math.abs(manuale.inArchivio - 0.61) < 0.0001);
dico('FASE F2 · e sopravvive alla rilettura', manuale && Math.abs(manuale.sopravvive - 0.61) < 0.0001);

/* ── FASE G · il pannello dei profili ha il campo ─────────────────────────── */

await page.evaluate(() => { if (window.InglyProfiliEconomici) window.InglyProfiliEconomici.apri('overhead'); });
await page.waitForTimeout(1200);
const pannello = await page.evaluate(() => {
  const n = document.querySelector('#ingly-profili-economici');
  if (!n) return null;
  const campo = n.querySelector('[data-campo="overhead.kwhPrice"]');
  return { campo: !!campo, valore: campo ? parseFloat(campo.value) : null, testo: n.textContent };
});
dico('FASE G · il pannello ha il campo del prezzo dell\'energia', pannello && pannello.campo);
dico('FASE G2 · e mostra quello dichiarato (' + (pannello ? pannello.valore : '—') + ')',
  pannello && Math.abs(pannello.valore - 0.44) < 0.0001);
dico('FASE G3 · e spiega quali schermate lo usano',
  pannello && /calcolatore laser/i.test(pannello.testo));
await page.evaluate(() => window.InglyProfiliEconomici.chiudi());

console.log('\nENERGIA — UN PREZZO SOLO PER TUTTA L\'APPLICAZIONE\n');
console.log('  partenza          : ' + (partenza ? partenza.kwh : '—') + ' €/kWh (' + (partenza ? partenza.fonte : '—') + ')');
console.log('  dichiarato        : ' + PREZZO + ' €/kWh');
console.log('  Smart Quoter 3D   : ' + quoter3d);
console.log('  Calcolatore       : ' + calcMacchine.kwh);
console.log('  Catalogo macchine : ' + catalogo.kwh + '\n');

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
console.log('\nla bolletta si scrive una volta sola ✔\n');
await browser.close();
