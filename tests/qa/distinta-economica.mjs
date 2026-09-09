#!/usr/bin/env node
/**
 * distinta-economica.mjs — le voci sopravvivono a tutti i passaggi.
 *
 * Un preventivo salvato conservava tre numeri: costo, netto, lordo. L'ordine
 * che ne nasceva aveva un totale e nient'altro; la vendita che nasceva
 * dall'ordine leggeva `o.value` — un campo che gli ordini del preventivatore
 * non scrivono — e nasceva a **zero euro**.
 *
 * Qui si segue una distinta dal preventivo alla vendita, passando per una
 * modifica in lavorazione, e si guarda l'archivio a ogni passo.
 *
 *   node tests/qa/distinta-economica.mjs [file]
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
await page.waitForTimeout(20000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* ── I moduli ci sono ────────────────────────────────────────────────────── */
const moduli = await page.evaluate(() => ({
  distinta: typeof window.InglyCostBreakdown,
  vista: typeof window.InglyOrderEconomics,
  tariffa: typeof window.InglyMachineRate,
}));
dico('la distinta economica è raggiungibile (' + moduli.distinta + ')', moduli.distinta === 'object');
dico('la vista dell economia ordine pure (' + moduli.vista + ')', moduli.vista === 'object');
dico('e la tariffa macchina esplicita (' + moduli.tariffa + ')', moduli.tariffa === 'object');

/* ── Il preventivo porta la distinta ─────────────────────────────────────── */
const salvato = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  const clienteId = Date.now();
  await IDB.put('clients', { id: clienteId, name: 'Officina QA', email: 'qa@esempio.it' });

  App.navigate('quoter');
  await a(2600);
  if (Quoter.renderClients) await Quoter.renderClients();
  await a(500);
  set('q-name', 'Portachiavi personalizzato');
  const sel = document.getElementById('q-client');
  if (sel) { sel.value = String(clienteId); sel.dispatchEvent(new Event('change', { bubbles: true })); }

  Quoter.editId = null; Quoter._lastSavedId = null;
  Quoter.lines = [
    { id: 1, name: 'Materiale PLA', qty: 20, unitCost: 0.9, subtotal: 18, category: 'Materiale', itemKey: 'items:9' },
    { id: 2, name: 'Incisione laser', qty: 20, unitCost: 0.5, subtotal: 10, category: 'Lavorazione' },
  ];
  set('qr-ext-pack', '4');
  Quoter.renderLines(); Quoter.recalcRight();
  await a(900);

  const r = await Quoter.saveQuote();
  await a(600);
  const q = r && r.id ? await IDB.get('quotes', r.id) : null;
  return {
    clienteId, ok: !!(r && r.ok), quoteId: r && r.id,
    haDistinta: !!(q && q.costBreakdown && q.costBreakdown.voci),
    voci: q && q.costBreakdown ? q.costBreakdown.voci.length : 0,
    haSnapshot: !!(q && q.pricingSnapshot),
    costo: q && q.costBreakdown ? q.costBreakdown.totals.costoVoci : null,
    campiRiga: q && q.costBreakdown && q.costBreakdown.voci[0]
      ? Object.keys(q.costBreakdown.voci[0]).sort().join(',') : '',
    fonti: q && q.costBreakdown ? q.costBreakdown.voci.map((v) => v.source) : [],
  };
});
dico('FASE A · il preventivo si salva (#' + salvato.quoteId + ')', salvato.ok);
dico('FASE A2 · e porta la distinta, non solo il totale ('
  + salvato.voci + ' voci)', salvato.haDistinta && salvato.voci >= 2);
dico('FASE A3 · ogni riga ha i campi richiesti (' + salvato.campiRiga + ')',
  ['category', 'editable', 'id', 'label', 'quantity', 'source', 'totalCost', 'unit', 'unitCost']
    .every((k) => salvato.campiRiga.includes(k)));
dico('FASE A4 · e dichiara da dove viene (' + salvato.fonti.join(' · ') + ')',
  salvato.fonti.includes('magazzino') && salvato.fonti.includes('preventivo'));
dico('FASE A5 · lo snapshot originale è congelato a parte', salvato.haSnapshot);

/* ── L'ordine la riceve ──────────────────────────────────────────────────── */
const inviato = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const r = await Quoter.sendToWorkflow();
  await a(1200);
  const o = r && r.orderId ? await IDB.get('orders', r.orderId) : null;
  return {
    ok: !!(r && r.ok), orderId: r && r.orderId,
    haDistinta: !!(o && o.costBreakdown && o.costBreakdown.voci),
    haSnapshot: !!(o && o.pricingSnapshot),
    haCorrente: !!(o && o.currentPricing),
    voci: o && o.costBreakdown ? o.costBreakdown.voci.length : 0,
    items: o && o.items ? o.items.length : 0,
    clientId: o ? o.clientId : null,
    totale: o ? o.total : null,
    /* Snapshot e corrente non devono condividere gli stessi oggetti. */
    condivisi: !!(o && o.pricingSnapshot && o.currentPricing
      && o.pricingSnapshot.voci[0] === o.currentPricing.voci[0]),
  };
});
dico('FASE B · l ordine nasce (#' + inviato.orderId + ')', inviato.ok);
dico('FASE B2 · e porta la distinta (' + inviato.voci + ' voci)', inviato.haDistinta);
dico('FASE B3 · in tre copie: distinta, preventivato, corrente',
  inviato.haDistinta && inviato.haSnapshot && inviato.haCorrente);
dico('FASE B4 · che non condividono gli stessi oggetti', !inviato.condivisi);
dico('FASE B5 · e i dati prodotto viaggiano con l economia (' + inviato.items + ' voci)',
  inviato.items === 2);

/* ── La modifica in lavorazione ──────────────────────────────────────────── */
const modificato = await page.evaluate(async (orderId) => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const B = window.InglyCostBreakdown;
  const o = await IDB.get('orders', orderId);
  const prima = {
    costo: o.currentPricing.totals.costoTotale,
    netto: o.currentPricing.totals.netto,
    snapshotCosto: o.pricingSnapshot.totals.costoTotale,
  };
  const voce = o.currentPricing.voci[0];
  o.currentPricing = B.conVoce(o.currentPricing, voce.id, { totalCost: voce.totalCost + 10 });
  o.pricingHistory = [{ quando: new Date().toISOString(), cosa: 'prova' }];
  o.total = o.currentPricing.totals.netto;
  o.totalCost = o.currentPricing.totals.costoTotale;
  await IDB.put('orders', o);
  const riletto = await IDB.get('orders', orderId);
  const s = B.scostamento(riletto.pricingSnapshot, riletto.currentPricing);
  return {
    prima,
    dopoCosto: riletto.currentPricing.totals.costoTotale,
    dopoNetto: riletto.currentPricing.totals.netto,
    marginePrima: o.pricingSnapshot.totals.marginePct,
    margineDopo: riletto.currentPricing.totals.marginePct,
    snapshotIntatto: riletto.pricingSnapshot.totals.costoTotale === prima.snapshotCosto,
    scostamentoCosto: s.costo,
    vociCambiate: s.voci.length,
    totaleOrdine: riletto.total,
  };
}, inviato.orderId);
dico('FASE C · modificare una voce alza il costo corrente (€ ' + modificato.prima.costo
  + ' → € ' + modificato.dopoCosto + ')', modificato.dopoCosto > modificato.prima.costo);
/* Il prezzo concordato non si muove da solo quando un costo sale: è il
   margine a scendere, ed è quello che serve vedere. Riprezzare è una
   decisione commerciale a parte. */
dico('FASE C2 · il prezzo concordato resta (€ ' + modificato.dopoNetto
  + ') e il margine scende', modificato.dopoNetto === modificato.prima.netto
  && modificato.margineDopo < modificato.marginePrima);
dico('FASE C3 · lo snapshot del preventivo resta intatto', modificato.snapshotIntatto);
dico('FASE C4 · e lo scostamento lo dice (+€ ' + modificato.scostamentoCosto
  + ', ' + modificato.vociCambiate + ' voce)', modificato.scostamentoCosto > 9.9);
dico('FASE C5 · il totale dell ordine segue le sue voci (€ ' + modificato.totaleOrdine + ')',
  Math.abs(modificato.totaleOrdine - modificato.dopoNetto) < 0.01);
dico('FASE C6 · e il margine racconta quanto è costata la modifica ('
  + modificato.marginePrima + '% → ' + modificato.margineDopo + '%)',
  modificato.margineDopo < modificato.marginePrima);

/* ── La vendita ──────────────────────────────────────────────────────────── */
const venduto = await page.evaluate(async (orderId) => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  /* `askConfirm` è un modale dell'applicazione, non un dialogo del browser:
     il gestore di Playwright non lo vede e la suite resterebbe appesa. Si
     risponde «sì» come farebbe una persona, e si rimette com'era dopo. */
  const _ask = window.askConfirm;
  window.askConfirm = async () => true;
  const prima = (await IDB.getAll('sales')).length;
  /* È il pulsante del cassetto, cioè quello che si preme davvero. */
  await OrderFlow.convertToSale(orderId);
  await a(1500);
  const vendite = await IDB.getAll('sales');
  const v = vendite.filter((x) => String(x.fromOrderId) === String(orderId))[0];
  const o = await IDB.get('orders', orderId);
  window.askConfirm = _ask;
  return {
    creata: vendite.length > prima,
    importo: v ? v.amount : null,
    attesa: o.currentPricing.totals.netto,
    haDistinta: !!(v && v.costBreakdown && v.costBreakdown.voci),
    haSnapshot: !!(v && v.pricingSnapshot),
    quoteId: v ? v.quoteId : null,
    orderId: v ? v.orderId : null,
    costo: v ? v.totalCost : null,
  };
}, inviato.orderId);
dico('FASE D · la vendita si crea', venduto.creata);
dico('FASE D2 · e NON a zero euro: € ' + venduto.importo + ' contro € ' + venduto.attesa,
  venduto.importo > 0 && Math.abs(venduto.importo - venduto.attesa) < 0.01);
dico('FASE D3 · porta la distinta economica', venduto.haDistinta);
dico('FASE D4 · e lo snapshot del preventivo', venduto.haSnapshot);
dico('FASE D5 · con i legami a preventivo e ordine ('
  + venduto.quoteId + ' · ' + venduto.orderId + ')',
  String(venduto.quoteId) === String(salvato.quoteId)
  && String(venduto.orderId) === String(inviato.orderId));
dico('FASE D6 · e il costo, per sapere che margine si è fatto (€ ' + venduto.costo + ')',
  venduto.costo > 0);

/* ── Dopo un ricaricamento vero ──────────────────────────────────────────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);
const dopoReload = await page.evaluate(async (ids) => {
  const q = await IDB.get('quotes', ids.quoteId);
  const o = await IDB.get('orders', ids.orderId);
  const vendite = await IDB.getAll('sales');
  const v = vendite.filter((x) => String(x.fromOrderId) === String(ids.orderId))[0];
  return {
    quote: !!(q && q.costBreakdown && q.costBreakdown.voci.length),
    ordine: !!(o && o.currentPricing && o.currentPricing.voci.length),
    snapshot: !!(o && o.pricingSnapshot && o.pricingSnapshot.voci.length),
    vendita: !!(v && v.costBreakdown && v.costBreakdown.voci.length),
    importo: v ? v.amount : null,
  };
}, { quoteId: salvato.quoteId, orderId: inviato.orderId });
dico('FASE E · dopo il ricaricamento la distinta è nel preventivo', dopoReload.quote);
dico('FASE E2 · nell ordine, corrente e preventivato', dopoReload.ordine && dopoReload.snapshot);
dico('FASE E3 · e nella vendita (€ ' + dopoReload.importo + ')', dopoReload.vendita);

/* ── La card nell ordine ─────────────────────────────────────────────────── */
const card = await page.evaluate(async (orderId) => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  App.navigate('gestione_ordini');
  await a(2500);
  /* È il dettaglio che si apre premendo ✏️ nella lista: quello di
     GestioneOrdini, non il cassetto di OrderFlow — che vive in un'altra
     sezione. Il primo giro di questa suite montava la card nel secondo e
     misurava una schermata che nessuno apriva da lì. */
  await GestioneOrdini._openDetail(orderId);
  await a(1500);
  const nodo = document.getElementById('go-economia');
  const testo = nodo ? nodo.textContent : '';
  return {
    montata: !!(nodo && nodo.querySelector('[data-economia]')),
    righe: nodo ? nodo.querySelectorAll('[data-voce]').length : 0,
    modifica: nodo ? nodo.querySelectorAll('[data-mod]').length : 0,
    aggiungi: !!(nodo && nodo.querySelector('[data-aggiungi]')),
    scostamento: /Scostamento dal preventivo/.test(testo),
    fonti: /Magazzino|Modificato in lavorazione/.test(testo),
    intestazioni: /Costo unit\./.test(testo) && /Margine/.test(testo),
  };
}, inviato.orderId);
dico('FASE F · la card «Economia ordine» si monta nel dettaglio', card.montata);
dico('FASE F2 · con una riga per voce (' + card.righe + ')', card.righe >= 2);
dico('FASE F3 · ognuna modificabile (' + card.modifica + ' pulsanti)', card.modifica === card.righe);
dico('FASE F4 · e si può aggiungere una voce', card.aggiungi);
dico('FASE F5 · lo scostamento dal preventivo si vede', card.scostamento);
dico('FASE F6 · e ogni numero dichiara la sua provenienza', card.fonti);
dico('FASE F7 · con quantità, costo unitario e margine in tabella', card.intestazioni);

console.log('\nLA DISTINTA, DAL PREVENTIVO ALLA VENDITA\n');
console.log('  preventivo #' + salvato.quoteId + ' · ' + salvato.voci + ' voci · costo € ' + salvato.costo);
console.log('  ordine     #' + inviato.orderId + ' · costo € ' + modificato.prima.costo
  + ' → € ' + modificato.dopoCosto + ' dopo la modifica');
console.log('  vendita    € ' + venduto.importo + ' (prima di questo lavoro: € 0,00)\n');

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
console.log('\nnessuna voce si perde per strada ✔\n');
await browser.close();
