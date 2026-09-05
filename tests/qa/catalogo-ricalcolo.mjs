#!/usr/bin/env node
/**
 * catalogo-ricalcolo.mjs — CAT-001…011 nel browser vero.
 *
 * Prima: «Margini bassi» elencava i prodotti sotto il 30% con due pulsanti
 * che riscrivevano il prezzo al clic, e «Applica 45% a tutti» lo faceva su
 * tutti senza mostrare prima cosa sarebbe successo. Nessuna anteprima
 * dell'insieme, nessun annullamento.
 *
 * In più due chiamate a `Catalogo._prezzoConsigliato` — oggetto che non
 * esiste — lanciavano un ReferenceError: quel pannello non si apriva.
 *
 *   node tests/qa/catalogo-ricalcolo.mjs [file]
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
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

const preparato = await page.evaluate(async () => {
  /* Il catalogo di partenza contiene i prodotti del seed: qui serve una base
     nota, altrimenti i conteggi misurano il seed e non il ricalcolo. */
  await IDB.clearStore('catalog');
  const prodotti = [
    { id: 66001, name: 'Targa piccola', sku: 'T1', costPrice: 10, salePrice: 12, category: 'targhe' },
    { id: 66002, name: 'Portachiavi', sku: 'P1', costPrice: 2, salePrice: 8, category: 'gadget' },
    { id: 66003, name: 'Senza costo', sku: 'S1', costPrice: 0, salePrice: 30, category: 'gadget' },
  ];
  for (const p of prodotti) await IDB.put('catalog', p);
  App.navigate('catalog');
  await new Promise((s) => setTimeout(s, 1800));
  return {
    modulo: typeof InglyCatalogRicalcolo !== 'undefined',
    pulsante: !!document.getElementById('cat-ricalcola'),
  };
});
dico('il modulo di ricalcolo è caricato', preparato.modulo);
dico('CAT-001 · il pulsante «Ricalcola prezzi» esiste', preparato.pulsante);

/* ── CAT-002 · l anteprima mostra il confronto ──────────────────────────── */
const anteprima = await page.evaluate(async () => {
  document.getElementById('cat-ricalcola').click();
  await new Promise((s) => setTimeout(s, 900));
  const ov = document.getElementById('cat-ricalcolo');
  if (!ov) return { aperta: false };
  const intestazioni = [...ov.querySelectorAll('thead th')].map((t) => t.textContent.trim());
  const righe = [...ov.querySelectorAll('tbody tr')];
  const targa = righe.find((r) => r.textContent.includes('Targa piccola'));
  const celle = targa ? [...targa.querySelectorAll('td')].map((t) => t.textContent.trim()) : [];
  return {
    aperta: true,
    intestazioni,
    righe: righe.length,
    celle,
    riepilogo: (document.getElementById('cat-ric-riepilogo') || {}).textContent || '',
    conferma: (document.getElementById('cat-ric-conferma') || {}).textContent || '',
  };
});
dico('CAT-002 · l anteprima si apre', anteprima.aperta);
dico('CAT-002b · e ha le colonne richieste (' + (anteprima.intestazioni || []).join('|') + ')',
  ['Costo', 'Attuale', 'Nuovo', 'Delta €', 'Delta %', 'Mg attuale', 'Mg nuovo']
    .every((c) => (anteprima.intestazioni || []).includes(c)));
dico('CAT-002c · elenca tutti i prodotti, anche quelli non calcolabili (' + anteprima.righe + ')', anteprima.righe === 3);
dico('CAT-005 · attuale, nuovo e delta sono nella riga (' + (anteprima.celle || []).slice(3, 7).join(' ') + ')',
  (anteprima.celle || [])[3] === '€12.00' && (anteprima.celle || [])[4] === '€19.00' && /\+€7\.00/.test((anteprima.celle || [])[5] || ''));
dico('CAT-007 · margine attuale e nuovo sono nella riga (' + (anteprima.celle || []).slice(7, 9).join(' ') + ')',
  /16\.7%/.test((anteprima.celle || [])[7] || '') && /47\.4%/.test((anteprima.celle || [])[8] || ''));
dico('CAT-008 · il piede riassume il listino prima e dopo', /listino/.test(anteprima.riepilogo) && /€20\.00/.test(anteprima.riepilogo));

/* ── CAT-003 · annullare non scrive niente ──────────────────────────────── */
const annullato = await page.evaluate(async () => {
  const prima = await IDB.getAll('catalog');
  document.getElementById('cat-ric-annulla').click();
  await new Promise((s) => setTimeout(s, 600));
  const dopo = await IDB.getAll('catalog');
  const prezzo = (l, id) => (l.filter((p) => p.id === id)[0] || {}).salePrice;
  return {
    chiusa: !document.getElementById('cat-ricalcolo'),
    targaPrima: prezzo(prima, 66001), targaDopo: prezzo(dopo, 66001),
    portaPrima: prezzo(prima, 66002), portaDopo: prezzo(dopo, 66002),
    statoRipulito: Catalog._ricalcolo === null,
  };
});
dico('CAT-003 · «Annulla» chiude l anteprima', annullato.chiusa);
dico('CAT-003b · e nessun prezzo è cambiato (' + annullato.targaPrima + '→' + annullato.targaDopo + ')',
  annullato.targaPrima === annullato.targaDopo && annullato.portaPrima === annullato.portaDopo);
dico('CAT-003c · lo stato dell anteprima non resta appeso', annullato.statoRipulito);

/* ── CAT-004 · escludere una riga e confermare il resto ─────────────────── */
const confermato = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  document.getElementById('cat-ricalcola').click();
  await a(900);
  const primaDiEscludere = document.getElementById('cat-ric-conferma').textContent;
  /* Si esclude il portachiavi: la sua riga non deve essere scritta. */
  Catalog._ricalcoloEscludi(66002, true);
  await a(400);
  const testoPulsante = document.getElementById('cat-ric-conferma').textContent;
  document.getElementById('cat-ric-conferma').click();
  await a(1200);
  const dopo = await IDB.getAll('catalog');
  const p = (id) => dopo.filter((x) => x.id === id)[0] || {};
  return {
    primaDiEscludere, testoPulsante,
    targa: p(66001).salePrice,
    portachiavi: p(66002).salePrice,
    senzaCosto: p(66003).salePrice,
    storia: p(66001)._ricalcolo || null,
    chiusa: !document.getElementById('cat-ricalcolo'),
  };
});
dico('CAT-004 · il pulsante dice quante righe applicherà (' + confermato.primaDiEscludere.trim() + ')',
  /Applica 2 prezzi/.test(confermato.primaDiEscludere));
dico('CAT-004a · escludere una riga aggiorna il conto (' + confermato.testoPulsante.trim() + ')',
  /Applica 1 prezzi/.test(confermato.testoPulsante));
dico('CAT-004b · la riga confermata è stata scritta (' + confermato.targa + ')', confermato.targa === 19);
dico('CAT-004c · la riga esclusa non è stata toccata (' + confermato.portachiavi + ')', confermato.portachiavi === 8);
dico('CAT-009 · il prodotto senza costo è rimasto com era (' + confermato.senzaCosto + ')', confermato.senzaCosto === 30);
dico('CAT-011 · il record conserva perché quel prezzo è quello',
  !!confermato.storia && confermato.storia.marginePct === 45 && confermato.storia.prezzoPrecedente === 12);
dico('CAT-004d · dopo la conferma l anteprima si chiude', confermato.chiusa);

/* ── CAT-010 · dopo il ricaricamento, e il ricalcolo è stabile ──────────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const dopoReload = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const items = await IDB.getAll('catalog');
  const p = (id) => items.filter((x) => x.id === id)[0] || {};
  App.navigate('catalog');
  await a(1800);
  document.getElementById('cat-ricalcola').click();
  await a(900);
  const prop = Catalog._ricalcolo && Catalog._ricalcolo.proposta;
  const targaAncora = prop ? prop.righe.filter((r) => r.id === 66001)[0] : null;
  const conferma = (document.getElementById('cat-ric-conferma') || {}).textContent || '';
  Catalog.chiudiRicalcolo();
  return {
    targa: p(66001).salePrice,
    targaCambia: targaAncora ? targaAncora.cambia : null,
    conferma: conferma.trim(),
  };
});
dico('CAT-010 · il prezzo confermato è ancora lì dopo il ricaricamento', dopoReload.targa === 19);
dico('CAT-010b · e il ricalcolo non propone di riscriverlo di nuovo', dopoReload.targaCambia === false);
dico('CAT-010c · resta da cambiare solo ciò che era stato escluso (' + dopoReload.conferma + ')',
  /Applica 1 prezzi/.test(dopoReload.conferma));

console.log('\nCATALOGO — RICALCOLO CON ANTEPRIMA\n');
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
console.log('\nil ricalcolo si vede prima di applicarlo ✔\n');
await browser.close();
