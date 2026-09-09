#!/usr/bin/env node
/**
 * preventivo-a-ordine.mjs — il flusso critico, nel browser.
 *
 * Misurato prima di questo lavoro: `Quoter.sendToWorkflow` esisteva in cinque
 * copie e a runtime vinceva quella della patch 051, che faceva
 *
 *     await this.saveQuote().catch(()=>{});
 *
 * calcolava il totale con una formula sua e creava l'ordine senza `quoteId`
 * né `clientId`. Due clic facevano due ordini.
 *
 * Qui si fa il giro come lo farebbe una persona, e si guarda l'archivio dopo
 * ogni passo — non il toast, che è quello che mentiva.
 *
 *   node tests/qa/preventivo-a-ordine.mjs [file]
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

/* ── Una implementazione sola ────────────────────────────────────────────── */
const impianto = await page.evaluate(() => {
  const src = String(Quoter.sendToWorkflow);
  return {
    pipeline: typeof window.InglyQuoteToOrder,
    delega: /InglyQuoteToOrder/.test(src),
    catchVuoto: /catch\(\(\)=>\{\}\)/.test(src.replace(/\s/g, '')),
    formulaLocale: /subtotal\s*\*\s*\(1\s*\+\s*markup\)/.test(src),
    bridge: /WorkflowBridge/.test(src),
    rotta: (src.match(/navigate\('([a-z_]+)'\)/) || [])[1],
  };
});
dico('la pipeline autorevole esiste (' + impianto.pipeline + ')', impianto.pipeline === 'object');
dico('e «Invia a Workflow» delega a lei, invece di avere una logica sua', impianto.delega);
dico('nessun catch(()=>{}) nel flusso critico', !impianto.catchVuoto);
dico('nessuna formula di totale parallela', !impianto.formulaLocale);
dico('nessuna delle quattro sostituzioni è sopravvissuta', !impianto.bridge);
dico('e porta a Ordini & Workflow, non alla rotta legacy (' + impianto.rotta + ')',
  impianto.rotta === 'gestione_ordini');

/* ── Il giro completo ────────────────────────────────────────────────────── */
const giro = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const set = (id, v) => {
    const e = document.getElementById(id);
    if (!e) return false;
    e.value = v;
    e.dispatchEvent(new Event('input', { bubbles: true }));
    e.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  /* Un cliente vero, scritto nell'archivio: l'ordine deve prenderne l'id. */
  const clienteId = Date.now();
  await IDB.put('clients', { id: clienteId, name: 'Bar Duomo QA', email: 'qa@esempio.it' });

  App.navigate('quoter');
  await a(3000);
  if (typeof Quoter.renderClients === 'function') await Quoter.renderClients();
  await a(600);

  set('q-name', 'Targa Ortigia QA');
  const sel = document.getElementById('q-client');
  if (sel) { sel.value = String(clienteId); sel.dispatchEvent(new Event('change', { bubbles: true })); }
  set('q-notes', 'consegna a mano');
  set('q-deadline', '2026-10-01');

  /* Una riga, aggiunta come la aggiunge una persona. */
  Quoter.lines = [{ name: 'Targa laser', qty: 1, unitCost: 12, subtotal: 12, category: 'Laser' }];
  if (typeof Quoter.renderLines === 'function') Quoter.renderLines();
  if (typeof Quoter.recalcRight === 'function') Quoter.recalcRight();
  await a(800);

  const salvato = await Quoter.saveQuote();
  await a(600);
  const inArchivio = salvato && salvato.id ? await IDB.get('quotes', salvato.id) : null;

  return {
    clienteId,
    salvato: !!(salvato && salvato.ok),
    formaEsito: salvato ? Object.keys(salvato).sort().join(',') : null,
    quoteId: salvato ? salvato.id : null,
    inArchivio: !!inArchivio,
    clientIdSalvato: inArchivio ? inArchivio.clientId : null,
    netPrice: inArchivio ? inArchivio.netPrice : null,
    grossPrice: inArchivio ? inArchivio.grossPrice : null,
    totalCost: inArchivio ? inArchivio.totalCost : null,
    haSnapshot: !!(inArchivio && inArchivio.economicSnapshot),
  };
});
dico('FASE A · saveQuote restituisce un esito, non undefined (' + giro.formaEsito + ')',
  giro.formaEsito === 'id,ok,quote');
dico('FASE A2 · e il preventivo è davvero in archivio (id ' + giro.quoteId + ')', giro.inArchivio);
dico('FASE A3 · con il clientId, non solo il nome (' + giro.clientIdSalvato + ')',
  giro.clientIdSalvato === giro.clienteId);
dico('FASE A4 · e con lo storico economico congelato', giro.haSnapshot);

/* ── L'invio ─────────────────────────────────────────────────────────────── */
const invio = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const eventi = [];
  const spia = (e) => eventi.push(e.detail && e.detail.id);
  document.addEventListener('orderUpdated', spia);

  const r = await Quoter.sendToWorkflow();
  await a(1200);
  document.removeEventListener('orderUpdated', spia);

  const ordine = r && r.orderId ? await IDB.get('orders', r.orderId) : null;
  const quote = r && r.quoteId ? await IDB.get('quotes', r.quoteId) : null;
  return {
    ok: !!(r && r.ok), passo: r && r.passo,
    orderId: r && r.orderId, quoteId: r && r.quoteId,
    ordineInArchivio: !!ordine,
    quoteIdSullOrdine: ordine ? ordine.quoteId : null,
    clientIdSullOrdine: ordine ? ordine.clientId : null,
    totaleOrdine: ordine ? ordine.total : null,
    nettoQuote: quote ? quote.netPrice : null,
    orderIdSulQuote: quote ? quote.orderId : null,
    snapshotSullOrdine: !!(ordine && ordine.economicSnapshot),
    eventi: eventi.length,
    rotta: (document.querySelector('.section-view.active') || {}).id,
  };
});
dico('FASE B · l invio riesce e restituisce un esito (' + invio.passo + ')', invio.ok);
dico('FASE B2 · l ordine è davvero in archivio (id ' + invio.orderId + ')', invio.ordineInArchivio);
dico('FASE B3 · l ordine sa da quale preventivo viene (quoteId ' + invio.quoteIdSullOrdine + ')',
  String(invio.quoteIdSullOrdine) === String(invio.quoteId));
dico('FASE B4 · e il preventivo sa qual è il suo ordine (orderId ' + invio.orderIdSulQuote + ')',
  String(invio.orderIdSulQuote) === String(invio.orderId));
dico('FASE B5 · l ordine porta il clientId, non solo il nome (' + invio.clientIdSullOrdine + ')',
  invio.clientIdSullOrdine === giro.clienteId);
dico('FASE B6 · il totale dell ordine è quello del preventivo (€ ' + invio.totaleOrdine
  + ' vs € ' + invio.nettoQuote + ')',
  Math.abs((invio.totaleOrdine || 0) - (invio.nettoQuote || 0)) < 0.001);
dico('FASE B7 · lo storico economico è arrivato all ordine', invio.snapshotSullOrdine);
dico('FASE B8 · un evento solo, e dopo la verifica (' + invio.eventi + ')', invio.eventi === 1);
dico('FASE B9 · e si apre Ordini & Workflow (' + invio.rotta + ')',
  invio.rotta === 'view-gestione_ordini');

/* ── Il doppio clic ──────────────────────────────────────────────────────────
   Va provato **senza** navigare in mezzo: andando e tornando dal preventivatore
   il modulo si ridisegna vuoto, la validazione si ferma prima e il controllo
   sull'idempotenza non viene nemmeno raggiunto. Il primo giro di questa suite
   lo faceva, e misurava il nulla passando lo stesso. */
const doppio = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };

  App.navigate('quoter');
  await a(2000);
  Quoter.editId = null; Quoter._lastSavedId = null;
  set('q-name', 'Preventivo premuto due volte');
  Quoter.lines = [{ name: 'Voce', qty: 1, unitCost: 7, subtotal: 7, category: 'Laser' }];
  if (Quoter.renderLines) Quoter.renderLines();
  await a(600);

  const prima = (await IDB.getAll('orders')).length;

  /* 1 · due chiamate contemporanee: il pulsante disabilitato non le copre. */
  const [x, y] = await Promise.all([Quoter.sendToWorkflow(), Quoter.sendToWorkflow()]);
  await a(900);
  const dopoContemporanee = (await IDB.getAll('orders')).length;

  /* 2 · e una terza dopo che la prima è finita, sullo stesso preventivo a
     schermo: qui deve intervenire l'idempotenza su quoteId. */
  App.navigate('quoter');
  await a(1200);
  Quoter.lines = [{ name: 'Voce', qty: 1, unitCost: 7, subtotal: 7, category: 'Laser' }];
  set('q-name', 'Preventivo premuto due volte');
  await a(400);
  const terza = await Quoter.sendToWorkflow();
  await a(900);
  const fine = (await IDB.getAll('orders')).length;

  return {
    prima, dopoContemporanee, fine,
    contemporanei: [x && x.passo, y && y.passo],
    stessoOggetto: x === y,
    passo: terza && terza.passo,
    duplicato: !!(terza && terza.duplicatoEvitato),
    orderId: terza && terza.orderId,
  };
});
dico('FASE C · due invii contemporanei creano un ordine solo ('
  + doppio.prima + ' → ' + doppio.dopoContemporanee + ', '
  + doppio.contemporanei.join(' + ') + ')',
  doppio.dopoContemporanee === doppio.prima + 1);
dico('FASE C2 · perché la seconda chiamata aspetta la prima invece di partire',
  doppio.stessoOggetto);
dico('FASE C3 · e un terzo invio dello stesso preventivo non ne fa un altro ('
  + doppio.dopoContemporanee + ' → ' + doppio.fine + ', ' + doppio.passo + ')',
  doppio.fine === doppio.dopoContemporanee && doppio.duplicato);
dico('FASE C4 · dicendo quale ordine aprire (#' + doppio.orderId + ')',
  doppio.orderId != null);

/* ── Il fallimento non deve mai dichiararsi riuscito ─────────────────────── */
const fallimento = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  App.navigate('quoter');
  await a(1500);
  /* Preventivo nuovo, e il workflow che rifiuta di scrivere. */
  Quoter.editId = null; Quoter._lastSavedId = null;
  const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  set('q-name', 'Preventivo che non diventa ordine');
  Quoter.lines = [{ name: 'Voce', qty: 1, unitCost: 5, subtotal: 5, category: 'Laser' }];
  if (Quoter.renderLines) Quoter.renderLines();
  await a(500);

  const vero = GestioneOrdini._saveOrderFromQuoter.bind(GestioneOrdini);
  GestioneOrdini._saveOrderFromQuoter = async () => ({ ok: false, motivo: 'archivio pieno (prova)' });
  const ordiniPrima = (await IDB.getAll('orders')).length;
  const r = await Quoter.sendToWorkflow();
  await a(600);
  const ordiniDopo = (await IDB.getAll('orders')).length;
  GestioneOrdini._saveOrderFromQuoter = vero;

  const quotePresente = r && r.quoteId ? !!(await IDB.get('quotes', r.quoteId)) : false;
  return { ok: !!(r && r.ok), passo: r && r.passo, quoteSalvato: !!(r && r.quoteSalvato),
    ordiniPrima, ordiniDopo, quotePresente, motivo: r && r.motivo };
});
dico('FASE D · se l ordine non si crea, il flusso non dice riuscito ('
  + fallimento.passo + ')', fallimento.ok === false);
dico('FASE D2 · e nessun ordine nasce comunque ('
  + fallimento.ordiniPrima + ' → ' + fallimento.ordiniDopo + ')',
  fallimento.ordiniDopo === fallimento.ordiniPrima);
dico('FASE D3 · ma il preventivo resta salvato: buttarlo sarebbe peggio',
  fallimento.quoteSalvato && fallimento.quotePresente);
dico('FASE D4 · e il motivo è specifico, non «errore generico» ('
  + String(fallimento.motivo).slice(0, 60) + ')',
  /archivio pieno/.test(String(fallimento.motivo)));

/* ── Un preventivo che non si salva non produce un ordine ────────────────── */
const senzaTitolo = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  App.navigate('quoter');
  await a(1500);
  Quoter.editId = null; Quoter._lastSavedId = null;
  const e = document.getElementById('q-name'); if (e) { e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); }
  Quoter.lines = [{ name: 'Voce', qty: 1, unitCost: 5, subtotal: 5, category: 'Laser' }];
  const prima = (await IDB.getAll('orders')).length;
  const r = await Quoter.sendToWorkflow();
  await a(600);
  const dopo = (await IDB.getAll('orders')).length;
  return { ok: !!(r && r.ok), passo: r && r.passo, prima, dopo, motivo: r && r.motivo };
});
dico('FASE E · senza titolo il preventivo non si salva e l ordine non nasce ('
  + senzaTitolo.passo + ')',
  senzaTitolo.ok === false && senzaTitolo.dopo === senzaTitolo.prima);
dico('FASE E2 · ed è il caso esatto che il vecchio catch(()=>{}) lasciava passare',
  /titolo/i.test(String(senzaTitolo.motivo)));

/* ── Un totale solo: schermo, preventivo, PDF, WhatsApp, ordine ───────────
   Sette chiamate su otto passavano `{setupCost:0}` e una no. I sei campi dei
   costi extra — imballo, spedizione, verniciatura, lavorazione, personalizzato,
   altro — entravano quindi solo nel riepilogo a destra: la tabella delle voci
   diceva un totale, il riepilogo un altro, e quello che finiva nel preventivo
   salvato, nel PDF, in WhatsApp e nell'ordine era il totale **senza** gli
   extra. Misurato prima della correzione: € 30 a schermo, € 20 salvati. */
const totali = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  App.navigate('quoter');
  await a(2200);
  Quoter.editId = null; Quoter._lastSavedId = null;
  set('q-name', 'Preventivo con costi extra');
  Quoter.lines = [{ id: 1, name: 'Voce', qty: 1, unitCost: 10, subtotal: 10, markup: 1.4, price: 14, category: 'Laser' }];
  set('qr-ext-pack', '3');
  set('qr-ext-ship', '7');
  Quoter.renderLines(); Quoter.recalcRight();
  await a(1000);

  const num = (t) => parseFloat(String(t || '').replace(/[^0-9.,-]/g, '').replace(',', '.'));
  const schermo = num((document.getElementById('qr-sub') || {}).textContent);
  const motore = Quoter._calcola();
  const salvato = await Quoter.saveQuote();
  await a(600);
  const q = salvato && salvato.id ? await IDB.get('quotes', salvato.id) : null;
  const inviato = await Quoter.sendToWorkflow();
  await a(900);
  const ordine = inviato && inviato.orderId ? await IDB.get('orders', inviato.orderId) : null;

  return {
    extra: Quoter._getExtraCosts(),
    schermo,
    motoreNetto: motore.subtotalNet,
    quoteNetto: q ? q.netPrice : null,
    quoteCosto: q ? q.totalCost : null,
    ordineTotale: ordine ? ordine.total : null,
  };
});
dico('FASE H · i costi extra entrano nel conto (€ ' + totali.extra + ')', totali.extra === 10);
dico('FASE H2 · e schermo e motore dicono lo stesso netto (€ ' + totali.schermo
  + ' vs € ' + totali.motoreNetto + ')',
  Math.abs(totali.schermo - totali.motoreNetto) < 0.01);
dico('FASE H3 · il preventivo salvato pure (€ ' + totali.quoteNetto + ')',
  Math.abs(totali.quoteNetto - totali.motoreNetto) < 0.01);
dico('FASE H4 · e l ordine che ne nasce (€ ' + totali.ordineTotale + ')',
  Math.abs(totali.ordineTotale - totali.quoteNetto) < 0.01);
dico('FASE H5 · il costo comprende gli extra, non li perde per strada (€ '
  + totali.quoteCosto + ' su € 10 di voci più € ' + totali.extra + ')',
  Math.abs(totali.quoteCosto - 20) < 0.01);

/* ── L'ordine si vede senza ricaricare ───────────────────────────────────── */
const visibile = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  App.navigate('gestione_ordini');
  await a(2500);
  const vista = document.getElementById('view-gestione_ordini');
  const testo = vista ? vista.textContent : '';
  return {
    trovato: /Targa Ortigia QA/.test(testo),
    cliente: /Bar Duomo QA/.test(testo),
  };
});
dico('FASE F · il nuovo ordine compare in Ordini & Workflow senza ricaricare', visibile.trovato);
dico('FASE F2 · con il suo cliente', visibile.cliente);

/* ── Dopo un ricaricamento vero ──────────────────────────────────────────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);
const dopoReload = await page.evaluate(async () => {
  const ordini = await IDB.getAll('orders');
  const mio = ordini.filter((o) => o.name === 'Targa Ortigia QA')[0];
  const quote = mio && mio.quoteId ? await IDB.get('quotes', mio.quoteId) : null;
  return {
    quanti: ordini.filter((o) => o.name === 'Targa Ortigia QA').length,
    quoteId: mio ? mio.quoteId : null,
    clientId: mio ? mio.clientId : null,
    totale: mio ? mio.total : null,
    quoteRitrovato: !!quote,
    orderIdSulQuote: quote ? quote.orderId : null,
  };
});
dico('FASE G · dopo il ricaricamento l ordine c è ancora, uno solo ('
  + dopoReload.quanti + ')', dopoReload.quanti === 1);
dico('FASE G2 · e il legame nei due versi regge (' + dopoReload.quoteId
  + ' ↔ ' + dopoReload.orderIdSulQuote + ')',
  dopoReload.quoteRitrovato && String(dopoReload.orderIdSulQuote) === String(invio.orderId));
dico('FASE G3 · con cliente e totale intatti (' + dopoReload.clientId
  + ' · € ' + dopoReload.totale + ')',
  dopoReload.clientId === giro.clienteId && Math.abs(dopoReload.totale - invio.nettoQuote) < 0.001);

console.log('\nPREVENTIVO → ORDINE — LA PIPELINE CRITICA\n');
console.log('  preventivo #' + invio.quoteId + ' · netto € ' + invio.nettoQuote);
console.log('  ordine     #' + invio.orderId + ' · totale € ' + invio.totaleOrdine
  + ' · cliente ' + invio.clientIdSullOrdine);
console.log('  doppio clic: ' + doppio.prima + ' ordini prima, ' + doppio.fine + ' dopo\n');

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
console.log('\nun preventivo, un ordine, e nessuna bugia in mezzo ✔\n');
await browser.close();
