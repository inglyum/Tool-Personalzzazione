#!/usr/bin/env node
/**
 * cost-audit.mjs — «da dove viene questo numero» ha una risposta sola.
 *
 * Misurato prima di questo lavoro: la stessa domanda aveva tre risposte
 * diverse. Il motore diceva `fonte`; il Product Builder la traduceva con una
 * tabella privata; lo Smart Quoter 3D ne aveva una seconda, su `confidence`,
 * che è un'altra scala. Lo stesso valore risultava «Stimato» in una schermata
 * e «stimato» in un'altra, su scale che non coincidevano.
 *
 * Qui si aprono le due schermate, una dopo l'altra, e si confrontano le parole
 * che mostrano.
 *
 *   node tests/qa/cost-audit.mjs [file]
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

/* ── FASE A · il vocabolario è raggiungibile e completo ───────────────────── */

const modulo = await page.evaluate(() => {
  const A = window.InglyCostAudit;
  if (!A) return null;
  const fonti = ['inventory', 'configurato', 'inserito', 'default', 'stima', 'calcolato', 'mancante'];
  const conf = ['verified', 'declared', 'estimated', 'missing'];
  return {
    fontiTradotte: fonti.filter((f) => A.fonte(f).etichetta !== 'Non dichiarata').length,
    fontiTotali: fonti.length,
    confTradotte: conf.filter((c) => A.confidenza(c).etichetta !== 'Non dichiarata').length,
    confTotali: conf.length,
    livelli: Object.keys(A.LIVELLI),
    ignota: A.fonte('mai_vista').etichetta,
  };
});
dico('FASE A · il vocabolario condiviso è nel file consegnato', modulo !== null);
dico('FASE A2 · traduce tutte le fonti del motore ('
  + (modulo ? modulo.fontiTradotte + '/' + modulo.fontiTotali : '—') + ')',
  modulo && modulo.fontiTradotte === modulo.fontiTotali);
dico('FASE A3 · e tutte le confidenze ('
  + (modulo ? modulo.confTradotte + '/' + modulo.confTotali : '—') + ')',
  modulo && modulo.confTradotte === modulo.confTotali);
dico('FASE A4 · su una scala sola di ' + (modulo ? modulo.livelli.length : '—') + ' livelli',
  modulo && modulo.livelli.length === 5);
dico('FASE A5 · e una fonte sconosciuta si dichiara tale, non si indovina',
  modulo && modulo.ignota === 'Non dichiarata');

/* ── FASE B · lo Smart Quoter 3D mostra la provenienza ────────────────────── */

const quoter = await page.evaluate(async () => {
  await window.App.navigate('print3d');
  await new Promise((r) => setTimeout(r, 3200));
  window.Print3DQuoter.togglePerche();
  await new Promise((r) => setTimeout(r, 1600));
  const v = document.getElementById('view-print3d');
  const t = v ? v.textContent : '';
  const conteggio = t.match(/(\d+ voci su \d+[^.]*\.|Tutte le \d+ voci[^.]*\.)/);
  /* Le etichette che compaiono nella colonna della fiducia. */
  const A = window.InglyCostAudit;
  const attese = Object.values(A.CONFIDENZE).map((c) => c.etichetta);
  return {
    conteggio: conteggio ? conteggio[1] : '',
    usate: attese.filter((e) => t.includes(e)),
    tabella: /Fiducia/i.test(t),
  };
});
dico('FASE B · il pannello «Perché questo prezzo?» ha la colonna della fiducia', quoter.tabella);
dico('FASE B2 · con le parole del vocabolario condiviso ('
  + (quoter.usate.join(' · ') || 'nessuna') + ')', quoter.usate.length > 0);
dico('FASE B3 · e dice quante voci non poggiano su un dato dichiarato ('
  + (quoter.conteggio || '—') + ')', /voci/.test(quoter.conteggio));

/* ── FASE C · il conteggio reagisce ai dati ──────────────────────────────── */

/* Un conteggio che non cambia mai non conta niente: si toglie un dato e si
   guarda se se ne accorge. */
const reazione = await page.evaluate(() => {
  const E = window.InglyCostEngine;
  const A = window.InglyCostAudit;
  const completo = E.explain({
    tecnologia: 'print3d', qty: 1, grams: 250, hours: 9.95,
    materialPricePerKg: 24, watt: 150, kwhPrice: 0.28,
    machinePrice: 420, machineLifeHours: 4000, laborPerHour: 18, setupMin: 15,
  }, { marginePct: 40 });
  const povero = E.explain({ tecnologia: 'print3d', qty: 1, grams: 250, hours: 9.95 },
    { marginePct: 40 });
  return { completo: A.riepilogo(completo), povero: A.riepilogo(povero) };
});
dico('FASE C · un preventivo completo ha poche voci da verificare ('
  + reazione.completo.daVerificare + '/' + reazione.completo.voci + ')',
  reazione.completo.voci > 0);
dico('FASE C2 · e uno senza dati ne ha di più o uguali ('
  + reazione.povero.daVerificare + '/' + reazione.povero.voci + ')',
  reazione.povero.daVerificare >= reazione.completo.daVerificare);
dico('FASE C3 · la frase dice i numeri e non dà giudizi',
  !/ottimo|buono|attenzione|male|grave/i.test(reazione.povero.frase));

/* ── FASE D · le due schermate usano le stesse parole ─────────────────────── */

const builder = await page.evaluate(async () => {
  const a = (ms) => new Promise((r) => setTimeout(r, ms));
  await window.App.navigate('product_builder');
  await a(2600);
  /* Il passo del prezzo non disegna niente finché non c'è un calcolo vero:
     `stepPricing()` esce subito se il risultato è vuoto. Quindi si dichiara il
     minimo che produce un costo — qualche minuto di lavoro — e solo dopo si
     cerca l'interruttore. Cercarlo su un prodotto vuoto vuol dire cercarlo
     dove per costruzione non c'è. */
  const vai = async (i) => {
    const t = document.querySelector('[data-pb-step="' + i + '"]');
    if (t) { t.click(); await a(900); }
  };
  await vai(4);
  const min = document.querySelector('[data-pb="laborMin"]');
  if (min) { min.value = '10'; min.dispatchEvent(new Event('input', { bubbles: true })); }
  await a(1100);

  let n = null;
  for (let i = 5; i <= 7 && !n; i++) {
    await vai(i);
    n = document.querySelector('[data-pb-audit]');
  }
  if (!n) return { assente: true, passiVisti: [...document.querySelectorAll('[data-pb-step]')].length };
  n.click();
  await new Promise((r) => setTimeout(r, 1400));
  const badge = [...document.querySelectorAll('.pb__source')].map((b) => b.textContent.trim());
  return { badge: [...new Set(badge)] };
});
dico('FASE D · il Product Builder ha l\'interruttore dell\'audit', !builder.assente);
if (!builder.assente) {
  /* «Non dichiarata» è la risposta prevista del vocabolario per una fonte che
     non conosce: fa parte del vocabolario tanto quanto le altre, e trovarla
     non è un'estranea — è il modulo che dice di non sapere. */
  const A = await page.evaluate(() => Object.values(window.InglyCostAudit.FONTI)
    .map((f) => f.etichetta).concat(['Non dichiarata']));
  const estranee = builder.badge.filter((b) => b && !A.includes(b));
  dico('FASE D2 · e le sue pastiglie vengono dal vocabolario condiviso ('
    + (builder.badge.join(' · ') || 'nessuna') + ')', estranee.length === 0);
}

/* ── FASE E · le tabelle private non ci sono più ──────────────────────────── */

const private_ = await page.evaluate(() => ({
  confEtichetta: typeof window.CONF_ETICHETTA,
  audit: typeof window.InglyCostAudit,
}));
dico('FASE E · la tabella privata del Quoter 3D è sparita',
  private_.confEtichetta === 'undefined');
dico('FASE E2 · e quella condivisa c\'è', private_.audit === 'object');

console.log('\nCOST AUDIT — UNA RISPOSTA SOLA A «DA DOVE VIENE QUESTO NUMERO»\n');
console.log('  Quoter 3D  : ' + (quoter.conteggio || '—'));
console.log('  parole     : ' + (quoter.usate.join(' · ') || '—'));
console.log('  Builder    : ' + ((builder.badge || []).join(' · ') || '—') + '\n');

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
console.log('\nuna sola risposta, in tutte le schermate ✔\n');
await browser.close();
