#!/usr/bin/env node
/**
 * crm-preventivi.mjs — CRM-001…010 nel browser vero.
 *
 * Il difetto misurato: il preventivatore crea i preventivi con
 * `status:'in_attesa'`, e la striscia «Pipeline €» del CRM sommava quelli con
 * stato `'inviato'` o `'bozza'` — due valori che nessuna parte del programma
 * scrive mai. Ogni preventivo nasceva già fuori dal conto: la pipeline
 * segnava zero euro qualunque cosa si facesse, ed è questo che faceva
 * sembrare i preventivi «fermi».
 *
 *   node tests/qa/crm-preventivi.mjs [file]
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

/* ── CRM-001/002/003 · cliente, preventivo, salvataggio ─────────────────── */
const preparato = await page.evaluate(async () => {
  await IDB.clearStore('quotes');
  await IDB.put('clients', { id: 5501, name: 'Ditta Omega', email: 'omega@example.it' });
  /* Preventivi scritti con lo stato che il preventivatore usa davvero. */
  await IDB.put('quotes', { id: 5601, name: 'Insegna', clientId: 5501, clientName: 'Ditta Omega',
    status: 'in_attesa', grossPrice: 1000, date: '2026-06-01' });
  await IDB.put('quotes', { id: 5602, name: 'Targhe', clientId: 5501, clientName: 'Ditta Omega',
    status: 'in_attesa', grossPrice: 500, date: '2026-06-02' });
  await IDB.put('quotes', { id: 5603, name: 'Vecchio scaduto', clientId: 5501, clientName: 'Ditta Omega',
    status: 'inviato', grossPrice: 300, date: '2025-01-01', deadline: '2025-02-01' });
  await IDB.put('quotes', { id: 5604, name: 'Solo per nome', clientName: 'Ditta Omega',
    status: 'in_attesa', grossPrice: 200, date: '2026-06-03' });
  return { modulo: typeof InglyQuoteStatus !== 'undefined' };
});
dico('il vocabolario degli stati è caricato', preparato.modulo);

/* ── CRM-004 · la pipeline non è più a zero ─────────────────────────────── */
const pipeline = await page.evaluate(async () => {
  App.navigate('clienti');
  await new Promise((s) => setTimeout(s, 2500));
  const strip = document.getElementById('crm-kpi-preventivi');
  const testo = strip ? strip.textContent.replace(/\s+/g, ' ') : '';
  const quotes = await IDB.getAll('quotes');
  const orders = await IDB.getAll('orders').catch(() => []);
  const conto = InglyQuoteStatus.pipeline(quotes, { orders });
  /* Il criterio vecchio, per il confronto: è quello che dava sempre zero. */
  const vecchio = quotes.filter((q) => q.status === 'inviato' || q.status === 'bozza')
    .reduce((a, q) => a + (+q.grossPrice || 0), 0);
  return { testo, valore: conto.valore, aperti: conto.aperti, scaduti: conto.scadutiDerivati, vecchio };
});
/* Il criterio vecchio (`'inviato'` o `'bozza'`) non vedeva nessuno dei tre
   preventivi creati dal preventivatore con `'in_attesa'`: vedeva solo il
   quarto, che porta `'inviato'` — ed è per giunta scaduto. */
dico('CRM-004 · il criterio vecchio ignorava i preventivi appena creati (' + pipeline.vecchio + ' su 1700)',
  pipeline.vecchio === 300);
dico('CRM-004b · quello nuovo conta i preventivi veri (' + pipeline.valore + ' €)', pipeline.valore === 1700);
dico('CRM-004c · e la striscia CRM lo mostra (' + pipeline.testo.slice(0, 90) + ')', /1\.700|1700/.test(pipeline.testo));
dico('CRM-004d · la striscia dice anche quanti sono aperti (' + pipeline.aperti + ')',
  pipeline.aperti === 3 && /Preventivi aperti/i.test(pipeline.testo));
/* Un preventivo è già deciso — quello scaduto — e nessuno è stato convertito:
   0% è la risposta giusta, non l'assenza di risposta. Il caso «nessun
   preventivo deciso → nessun tasso» è coperto dal test unitario CRM-004c. */
dico('CRM-004h · la conversione si calcola sui preventivi decisi', /Conversione/i.test(pipeline.testo) && /Conversione0%/.test(pipeline.testo.replace(/\s+/g,'')));
dico('CRM-010 · un preventivo con validità scaduta esce dalla pipeline', pipeline.scaduti === 1);

/* ── CRM-005 · lo storico del cliente ───────────────────────────────────── */
const storico = await page.evaluate(async () => {
  const cliente = await IDB.get('clients', 5501);
  const quotes = await IDB.getAll('quotes');
  const miei = InglyQuoteStatus.preventiviDi(cliente, quotes);
  return {
    quanti: miei.length,
    perNome: miei.some((q) => q.id === 5604),
    etichette: miei.map((q) => InglyQuoteStatus.statoDi(q, {}).label),
  };
});
dico('CRM-005 · lo storico del cliente contiene i suoi preventivi (' + storico.quanti + ')', storico.quanti === 4);
dico('CRM-005b · compreso quello collegato solo per nome', storico.perNome === true);
dico('CRM-005c · ognuno con un etichetta del vocabolario (' + storico.etichette.join(', ') + ')',
  storico.etichette.every((e) => ['Bozza', 'Inviato', 'Visto dal cliente', 'Accettato', 'Convertito in ordine', 'Rifiutato', 'Scaduto'].includes(e)));

/* ── CRM-006/007/008 · conversione in ordine e legame nei due sensi ─────── */
const conversione = await page.evaluate(async () => {
  /* Si crea l'ordine dal preventivo come fa il programma: l'ordine nomina il
     preventivo, e lo stato del preventivo può anche restare indietro. */
  await IDB.put('orders', { id: 5701, name: 'Insegna', clientId: 5501, clientName: 'Ditta Omega',
    stage: 'accettato', total: 1000, originQuote: 5601 });
  const quotes = await IDB.getAll('quotes');
  const orders = await IDB.getAll('orders');
  const q = quotes.filter((x) => x.id === 5601)[0];
  const o = orders.filter((x) => x.id === 5701)[0];
  return {
    statoQuoteScritto: q.status,
    statoQuoteVero: InglyQuoteStatus.statoDi(q, { orders }).id,
    ordineTrovato: (InglyQuoteStatus.ordineDi(q, orders) || {}).id,
    preventivoTrovato: (InglyQuoteStatus.preventivoDi(o, quotes) || {}).id,
    pipelineDopo: InglyQuoteStatus.pipeline(quotes, { orders }).valore,
  };
});
dico('CRM-006 · il preventivo convertito è riconosciuto anche se il suo stato è rimasto indietro ('
  + conversione.statoQuoteScritto + ' → ' + conversione.statoQuoteVero + ')',
  conversione.statoQuoteScritto === 'in_attesa' && conversione.statoQuoteVero === 'CONVERTED');
dico('CRM-007 · dal preventivo si arriva all ordine', conversione.ordineTrovato === 5701);
dico('CRM-008 · e dall ordine si torna al preventivo', conversione.preventivoTrovato === 5601);
dico('CRM-006b · e la pipeline smette di contarlo (' + conversione.pipelineDopo + ' €)', conversione.pipelineDopo === 700);

/* ── CRM-009 · nessun preventivo si perde per strada ────────────────────── */
const nessunaPerdita = await page.evaluate(async () => {
  const quotes = await IDB.getAll('quotes');
  const orders = await IDB.getAll('orders');
  const conto = InglyQuoteStatus.pipeline(quotes, { orders });
  const somma = Object.keys(conto.conteggi).reduce((a, k) => a + conto.conteggi[k], 0);
  return { totale: conto.totale, somma, senzaStato: quotes.filter((q) => !q.status).length };
});
dico('CRM-009 · ogni preventivo finisce in uno e un solo stato ('
  + nessunaPerdita.somma + '/' + nessunaPerdita.totale + ')',
  nessunaPerdita.somma === nessunaPerdita.totale && nessunaPerdita.totale === 4);

/* ── CRM-004e · e dopo il ricaricamento ─────────────────────────────────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);
const dopo = await page.evaluate(async () => {
  App.navigate('clienti');
  await new Promise((s) => setTimeout(s, 2500));
  const strip = document.getElementById('crm-kpi-preventivi');
  const quotes = await IDB.getAll('quotes');
  const orders = await IDB.getAll('orders');
  return {
    testo: strip ? strip.textContent.replace(/\s+/g, ' ') : '',
    valore: InglyQuoteStatus.pipeline(quotes, { orders }).valore,
    preventivi: quotes.length,
  };
});
dico('CRM-004e · dopo il ricaricamento i preventivi ci sono ancora (' + dopo.preventivi + ')', dopo.preventivi === 4);
dico('CRM-004f · e la pipeline resta quella (' + dopo.valore + ' €)', dopo.valore === 700);
dico('CRM-004g · la striscia non è più a zero', !/^\s*0/.test(dopo.testo) && /700/.test(dopo.testo));

console.log('\nCRM — PREVENTIVI, CLIENTI, ORDINI\n');
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
console.log('\ni preventivi non sono più fermi ✔\n');
await browser.close();
