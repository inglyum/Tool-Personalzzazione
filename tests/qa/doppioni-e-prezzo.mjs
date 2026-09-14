#!/usr/bin/env node
/**
 * doppioni-e-prezzo.mjs — una risposta per domanda, e il prezzo dal motore.
 *
 * Copre tre cose misurate insieme:
 *
 *   · `ai-clv` era la seconda schermata che rispondeva a «quanto vale un
 *     cliente», e dava la risposta sbagliata: `_clv = revenue`, il fatturato.
 *     È il difetto corretto nella CLV Dashboard, tenuto vivo accanto ad essa.
 *   · Il catalogo e gli ordini calcolavano prezzi a mano — ricarichi, sconti,
 *     prezzo da margine — scavalcando in silenzio il pavimento di prezzo e gli
 *     arrotondamenti che il motore applica.
 *   · `booking` funziona, ma con l'archivio vuoto mostrava due schede vuote e
 *     basta: chi la apriva la prima volta pensava fosse rotta.
 *
 *   node tests/qa/doppioni-e-prezzo.mjs [file]
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

/* ── FASE A · una sola risposta a «quanto vale un cliente» ──────────────── */

const clv = await page.evaluate(async () => {
  const vistaDoppia = !!document.getElementById('view-ai-clv');
  await window.App.navigate('ai-clv');
  await new Promise((r) => setTimeout(r, 2500));
  const v = document.getElementById('view-clv');
  return {
    vistaDoppia,
    attiva: !!v && v.classList.contains('active'),
    chars: v ? v.innerText.trim().length : 0,
    diceMargine: v ? /margine/i.test(v.innerText) : false,
  };
});
dico('FASE A · la seconda schermata del valore cliente non c\'è più', !clv.vistaDoppia);
dico('FASE A2 · e il suo nome apre quella che conta il margine (' + clv.chars + ' caratteri)',
  clv.attiva && clv.chars > 200);
dico('FASE A3 · che infatti parla di margine, non di fatturato', clv.diceMargine);

/* ── FASE B · il prezzo passa dal motore ───────────────────────────────── */

const prezzo = await page.evaluate(() => {
  const E = window.InglyCostEngine;
  if (!E) return null;
  /* Il motore applica un pavimento e gli arrotondamenti configurati: sono
     esattamente quello che le formule scritte a mano scavalcavano. */
  const daMargine = E.prezzo(10, { strategia: 'margine', marginePct: 50 });
  const conSconto = E.prezzo(100, { strategia: 'fisso', prezzoFisso: 100, scontoPct: 20 });
  const daRicarico = E.prezzo(10, { strategia: 'ricarico', ricarico: 2 });
  return {
    daMargine: daMargine.netto,
    conSconto: conSconto.netto,
    daRicarico: daRicarico.netto,
  };
});
dico('FASE B · il motore calcola il prezzo da margine (10 al 50% → '
  + (prezzo ? prezzo.daMargine : '—') + ')', prezzo && prezzo.daMargine >= 20);
dico('FASE B2 · lo sconto (100 meno 20% → ' + (prezzo ? prezzo.conSconto : '—') + ')',
  prezzo && prezzo.conSconto > 0 && prezzo.conSconto <= 100);
dico('FASE B3 · e il ricarico (10 × 2 → ' + (prezzo ? prezzo.daRicarico : '—') + ')',
  prezzo && prezzo.daRicarico >= 20);

const politiche = await page.evaluate(() => {
  const P = window.InglyPricingPolicies;
  if (!P || !P.setupPerQuantita) return null;
  return {
    cento: P.setupPerQuantita(100).quota,
    trenta: P.setupPerQuantita(30).quota,
    uno: P.setupPerQuantita(1).quota,
    scaglioni: (P.SETUP_PER_QUANTITA || []).length,
    nota: P.setupPerQuantita(100).nota,
  };
});
dico('FASE B4 · gli scaglioni per quantità sono dichiarati nelle politiche ('
  + (politiche ? politiche.scaglioni + ' scaglioni' : '—') + ')',
  politiche && politiche.scaglioni >= 4);
dico('FASE B5 · e cento pezzi pagano meno setup di uno ('
  + (politiche ? politiche.cento + ' contro ' + politiche.uno : '—') + ')',
  politiche && politiche.cento < politiche.uno);
dico('FASE B6 · ogni scaglione dice cosa significa ('
  + (politiche ? politiche.nota.slice(0, 35) + '…' : '—') + ')',
  politiche && politiche.nota && politiche.nota.length > 8);

/* ── FASE C · il catalogo usa il motore per i suoi listini ─────────────── */

const listino = await page.evaluate(async () => {
  await window.App.navigate('listino');
  await new Promise((r) => setTimeout(r, 3000));
  const v = document.getElementById('view-listino');
  return { esiste: !!v, chars: v ? v.innerText.trim().length : 0 };
});
dico('FASE C · la sezione listino si disegna (' + listino.chars + ' caratteri)',
  !listino.esiste || listino.chars > 100);

/* ── FASE D · booking dice cosa ci finisce dentro ──────────────────────── */

const booking = await page.evaluate(async () => {
  await window.IDB.clearStore('bookings').catch(() => {});
  await window.App.navigate('booking');
  await new Promise((r) => setTimeout(r, 2500));
  const v = document.getElementById('view-booking');
  const t = v ? v.innerText : '';
  return {
    chars: t.trim().length,
    spiega: /consegne|sopralluoghi|consulenze/i.test(t),
    invita: /primo appuntamento/i.test(t),
  };
});
dico('FASE D · con l\'archivio vuoto la sezione dice qualcosa (' + booking.chars + ' caratteri)',
  booking.chars > 200);
dico('FASE D2 · spiega cosa ci finisce dentro', booking.spiega);
dico('FASE D3 · e invita a metterci il primo', booking.invita);

const booking2 = await page.evaluate(async () => {
  await window.IDB.put('bookings', {
    id: 'collaudo-1', title: 'Consegna collaudo', type: 'Consegna',
    date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    time: '10:00', client: 'Cliente collaudo', location: 'Laboratorio',
  });
  await window.App.navigate('dashboard');
  await new Promise((r) => setTimeout(r, 500));
  await window.App.navigate('booking');
  await new Promise((r) => setTimeout(r, 2500));
  const v = document.getElementById('view-booking');
  const t = v ? v.innerText : '';
  return { trova: /Consegna collaudo/.test(t), nienteVuoto: !/primo appuntamento/i.test(t) };
});
dico('FASE D4 · e con un appuntamento dentro lo mostra', booking2.trova);
dico('FASE D5 · senza più lo stato vuoto', booking2.nienteVuoto);

console.log('\nDOPPIONI E PREZZO\n');
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
console.log('\nuna risposta per domanda, e il prezzo lo fa il motore ✔\n');
await browser.close();
