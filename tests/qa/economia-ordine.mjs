#!/usr/bin/env node
/**
 * economia-ordine.mjs — la card «Preventivato · Reale · Scostamento».
 *
 * Sulla schermata segnalata mostrava **Costo € 0,00**: leggeva `o.cost`, un
 * campo che gli ordini nati dal preventivatore non scrivono — loro scrivono
 * `totalCost` — e ripiegava lì perché lo snapshot non c'era.
 *
 * Ora la fonte primaria è `order.economic`, congelato al momento del
 * preventivo. Qui si verifica il giro come lo fa una persona: preventivo con
 * le sue voci, ordine, card, costi reali, scostamento.
 *
 *   node tests/qa/economia-ordine.mjs [file]
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

/* ── Il preventivo, con le voci del comando ──────────────────────────────── */
const salvato = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  const clienteId = Date.now();
  await IDB.put('clients', { id: clienteId, name: 'Comune QA' });

  App.navigate('quoter');
  await a(2600);
  if (Quoter.renderClients) await Quoter.renderClients();
  await a(500);
  set('q-name', 'Medagliere');
  const sel = document.getElementById('q-client');
  if (sel) { sel.value = String(clienteId); sel.dispatchEvent(new Event('change', { bubbles: true })); }

  Quoter.editId = null; Quoter._lastSavedId = null;
  /* Il caso del comando: quattro voci di costo per un pezzo. */
  Quoter.lines = [
    { id: 1, name: 'Materiale', qty: 1, unitCost: 2.00, subtotal: 2.00, price: 60, category: 'Materiale' },
    { id: 2, name: 'Laser', qty: 1, unitCost: 0.80, subtotal: 0.80, price: 40, category: 'Lavorazione' },
    { id: 3, name: 'Manodopera', qty: 1, unitCost: 1.20, subtotal: 1.20, price: 40, category: 'Manodopera' },
    { id: 4, name: 'Scarto', qty: 1, unitCost: 0.50, subtotal: 0.50, price: 10, category: 'Scarto' },
  ];
  Quoter.renderLines(); Quoter.recalcRight();
  await a(900);

  const r = await Quoter.saveQuote();
  await a(600);
  const q = r && r.id ? await IDB.get('quotes', r.id) : null;
  return {
    clienteId, ok: !!(r && r.ok), quoteId: r && r.id,
    haEconomic: !!(q && q.economic),
    costo: q && q.economic ? q.economic.costTotal : null,
    ricavo: q && q.economic ? q.economic.revenueNet : null,
    profitto: q && q.economic ? q.economic.profit : null,
    margine: q && q.economic ? q.economic.marginPct : null,
    linee: q && q.economic ? q.economic.lines.length : 0,
    costs: q && q.economic ? q.economic.costs : null,
    versione: q && q.economic ? q.economic.calculationVersion : null,
  };
});
dico('FASE A · il preventivo si salva (#' + salvato.quoteId + ')', salvato.ok);
dico('FASE A2 · e porta il modello economico canonico', salvato.haEconomic);
dico('FASE A3 · con il costo di produzione (€ ' + salvato.costo + ' su € 4,50 di voci)',
  Math.abs(salvato.costo - 4.5) < 0.01);
dico('FASE A4 · il ricavo (€ ' + salvato.ricavo + ')', salvato.ricavo > 0);
dico('FASE A5 · e il profitto, che è ricavo meno costo (€ ' + salvato.profitto + ')',
  Math.abs(salvato.profitto - (salvato.ricavo - salvato.costo)) < 0.01);
dico('FASE A6 · una linea economica per voce (' + salvato.linee + ')', salvato.linee === 4);
dico('FASE A7 · e la versione del motore che l ha calcolato (' + salvato.versione + ')',
  !!salvato.versione);

/* ── L'ordine lo riceve ──────────────────────────────────────────────────── */
const inviato = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const r = await Quoter.sendToWorkflow();
  await a(1200);
  const o = r && r.orderId ? await IDB.get('orders', r.orderId) : null;
  const E = window.InglyOrderEconomics;
  return {
    ok: !!(r && r.ok), orderId: r && r.orderId,
    haEconomic: !!(o && o.economic),
    costo: o && o.economic ? o.economic.costTotal : null,
    ricavo: o && o.economic ? o.economic.revenueNet : null,
    profitto: o && o.economic ? o.economic.profit : null,
    linee: o && o.economic ? o.economic.lines.length : 0,
    /* I lettori canonici che il comando chiede. */
    ricavoCanonico: E.ricavoOrdine(o),
    ricavoNetto: E.ricavoNettoOrdine(o),
    costoCanonico: E.costoOrdine(o),
    /* Il campo che la card leggeva prima, e che questi ordini non scrivono. */
    campoCost: o ? o.cost : undefined,
  };
});
dico('FASE B · l ordine nasce (#' + inviato.orderId + ')', inviato.ok);
dico('FASE B2 · e porta l economia, non solo il totale', inviato.haEconomic);
dico('FASE B3 · costo € ' + inviato.costo + ' = quello del preventivo',
  Math.abs(inviato.costo - salvato.costo) < 0.01);
dico('FASE B4 · ricavo € ' + inviato.ricavo + ' = quello del preventivo',
  Math.abs(inviato.ricavo - salvato.ricavo) < 0.01);
dico('FASE B5 · profitto € ' + inviato.profitto, Math.abs(inviato.profitto - salvato.profitto) < 0.01);
dico('FASE B6 · e le quattro linee economiche (' + inviato.linee + ')', inviato.linee === 4);
dico('FASE B7 · il lettore canonico del ricavo funziona (€ ' + inviato.ricavoCanonico + ')',
  inviato.ricavoCanonico > 0);
dico('FASE B8 · e quello del costo lo dichiara noto (€ '
  + inviato.costoCanonico.valore + ', noto ' + inviato.costoCanonico.noto + ')',
  inviato.costoCanonico.noto === true && Math.abs(inviato.costoCanonico.valore - salvato.costo) < 0.01);
dico('FASE B9 · mentre `o.cost` — il campo che la card leggeva — resta assente ('
  + inviato.campoCost + ')', inviato.campoCost === undefined);

/* ── La card ─────────────────────────────────────────────────────────────── */
const card = await page.evaluate(async (orderId) => {
  const o = await IDB.get('orders', orderId);
  const html = window.InglyOrderEconomics.pannelloConsuntivo(o, { registrato: false }, {});
  const testo = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  return {
    testo: testo.slice(0, 400),
    costoZero: /Costo\s+€\s*0[.,]00/.test(testo),
    avvisoVecchio: /non da uno storico congelato/.test(testo),
    haRegistra: /Registra com/.test(testo),
    haInterna: /Economia preventivata/.test(html) || true,
  };
}, inviato.orderId);
dico('FASE C · la card non mostra più «Costo € 0,00»', !card.costoZero);
dico('FASE C2 · e non dice più «preventivato dai campi dell ordine» ('
  + (card.avvisoVecchio ? 'lo dice ancora' : 'sparito') + ')', !card.avvisoVecchio);
dico('FASE C3 · la sezione «Registra com è andata» resta', card.haRegistra);

/* ── I costi reali non toccano il preventivato ───────────────────────────── */
const reale = await page.evaluate(async (orderId) => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const prima = JSON.parse(JSON.stringify((await IDB.get('orders', orderId)).economic));
  /* Si registra un costo reale come farebbe l'utente dalla card. */
  await window.InglyOrderEconomics.registraVoce(orderId, 'materiale', '5.20');
  await a(900);
  const o = await IDB.get('orders', orderId);
  return {
    prima,
    dopo: o.economic,
    identico: JSON.stringify(o.economic) === JSON.stringify(prima),
  };
}, inviato.orderId);
dico('FASE D · registrare un costo reale non cambia il preventivato', reale.identico);
dico('FASE D2 · costo preventivato ancora € ' + reale.dopo.costTotal,
  Math.abs(reale.dopo.costTotal - salvato.costo) < 0.01);
dico('FASE D3 · e ricavo ancora € ' + reale.dopo.revenueNet,
  Math.abs(reale.dopo.revenueNet - salvato.ricavo) < 0.01);

/* ── L'ordine legacy continua ad aprirsi ─────────────────────────────────── */
const legacy = await page.evaluate(async () => {
  const id = Date.now() + 7;
  await IDB.put('orders', { id, name: 'Ordine vecchio', clientName: 'X',
    value: 100, stage: 'inviato', status: 'inviato' });
  const o = await IDB.get('orders', id);
  const E = window.InglyOrderEconomics;
  let html = '';
  let rotto = null;
  try { html = E.pannelloConsuntivo(o, { registrato: false }, {}); }
  catch (e) { rotto = String(e.message); }
  const testo = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  return {
    rotto,
    ricavo: E.ricavoOrdine(o),
    costo: E.costoOrdine(o),
    diceCheManca: /non dichiarato/.test(testo),
    mostraZero: /Costo\s+€\s*0[.,]00/.test(testo),
  };
});
dico('FASE E · un ordine vecchio senza economic si apre lo stesso', !legacy.rotto);
dico('FASE E2 · il ricavo si legge dai campi che ha (€ ' + legacy.ricavo + ')',
  legacy.ricavo === 100);
dico('FASE E3 · il costo è dichiarato non noto, non zero (noto: ' + legacy.costo.noto + ')',
  legacy.costo.noto === false);
dico('FASE E4 · e la card lo dice invece di mostrare € 0,00', legacy.diceCheManca && !legacy.mostraZero);

/* ── L'economia preventivata è interna ───────────────────────────────────── */
const interna = await page.evaluate(async (orderId) => {
  const o = await IDB.get('orders', orderId);
  const html = window.InglyOrderBreakdown.economiaPreventivata(o);
  return {
    esiste: html.length > 0,
    dichiarataInterna: /solo interna/.test(html),
    haCosto: /Costo di produzione/.test(html),
    haProfitto: /Profitto previsto/.test(html),
    haMargine: /Margine previsto/.test(html),
    nonAlCliente: /non compaiono in nessun documento per il cliente/.test(html),
  };
}, inviato.orderId);
dico('FASE F · la sezione «Economia preventivata» esiste', interna.esiste);
dico('FASE F2 · con costo di produzione, profitto e margine',
  interna.haCosto && interna.haProfitto && interna.haMargine);
dico('FASE F3 · ed è dichiarata interna', interna.dichiarataInterna && interna.nonAlCliente);

/* ── Il cliente non vede il costo ────────────────────────────────────────── */
const cliente = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  /* `shareWhatsApp` non apre niente: mostra un'anteprima del messaggio con un
     `<a>` che l'utente preme. Il primo giro di questa suite intercettava
     `window.open`, non misurava nulla e concludeva il falso. Il messaggio si
     legge dove sta, che è anche quello che l'utente vede prima di inviare. */
  /* Il preventivatore va riportato allo stato in cui l'utente preme il
     pulsante: dopo l'invio a Workflow la navigazione lo ha svuotato, e
     `shareWhatsApp` si ferma subito su un preventivo senza voci. */
  App.navigate('quoter');
  await a(2200);
  const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  set('q-name', 'Medagliere');
  Quoter.lines = [
    { id: 1, name: 'Materiale', qty: 1, unitCost: 2.00, subtotal: 2.00, price: 60, category: 'Materiale' },
    { id: 2, name: 'Laser', qty: 1, unitCost: 0.80, subtotal: 0.80, price: 40, category: 'Lavorazione' },
  ];
  Quoter.renderLines(); Quoter.recalcRight();
  await a(700);
  try { await Quoter.shareWhatsApp(); } catch (e) {}
  await a(900);
  /* Il messaggio si legge dal link che lo porta: `wa.me?text=…` contiene
     esattamente ciò che il cliente riceverà. Cercare il contenitore per il
     testo che mostra è fragile — pesca il primo nodo fisso che nomina
     WhatsApp, che può essere tutt'altro — mentre questo href o c'è o non c'è. */
  const link = document.querySelector('a[href*="wa.me"]');
  const url = link ? decodeURIComponent(link.getAttribute('href')) : '';
  const overlay = link ? link.closest('[style*="position:fixed"]') : null;
  const testo = url;
  if (overlay) overlay.remove();
  return {
    trovato: !!link,
    testo: testo.slice(0, 300),
    haTotale: /Totale/i.test(testo),
    haCosto: /costo di produzione|costo produzione|costo materiale|costo macchina/i.test(testo),
    haMargine: /margine|markup/i.test(testo),
    haProfitto: /profitto/i.test(testo),
  };
});
dico('FASE G · l anteprima del messaggio al cliente si apre', cliente.trovato);
dico('FASE G2 · e porta un totale', cliente.haTotale);
dico('FASE G3 · non il costo di produzione', !cliente.haCosto);
dico('FASE G4 · né il margine o il markup', !cliente.haMargine);
dico('FASE G5 · né il profitto', !cliente.haProfitto);

console.log('\nL ECONOMIA DELL ORDINE\n');
console.log('  preventivo #' + salvato.quoteId + ' · costo € ' + salvato.costo
  + ' · ricavo € ' + salvato.ricavo + ' · profitto € ' + salvato.profitto);
console.log('  ordine     #' + inviato.orderId + ' · le stesse cifre, e quattro linee');
console.log('  costo reale registrato: il preventivato non si è mosso\n');

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
console.log('\nl ordine sa quanto è costato, e il cliente non lo vede ✔\n');
await browser.close();
