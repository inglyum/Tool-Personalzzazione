#!/usr/bin/env node
/**
 * coerenza-moduli.mjs — FASI 6, 7, 8 e 10.
 *
 * Tre domande, tutte sul comportamento reale nel browser:
 *
 *   1. lo **stesso** prodotto costa lo stesso in Catalogo, Preventivo e
 *      Ordine — e quando il costo di catalogo cambia, i preventivi nuovi
 *      seguono mentre l'ordine storico resta al suo snapshot;
 *   2. ogni cosa creata sopravvive a CREA → SALVA → RICARICA → VERIFICA;
 *   3. quando un salvataggio fallisce, l'utente lo sa: non resta un'interfaccia
 *      invariata e un messaggio di successo.
 *
 *   node tests/qa/coerenza-moduli.mjs [file]
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
  window.__avvisi = [];
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* ── FASE 10 · CREA → SALVA su sei entità ───────────────────────────────── */
const creato = await page.evaluate(async () => {
  const scrivi = async (store, rec) => { await IDB.put(store, rec); return rec.id; };
  const snap = { stato: 'SNAPSHOT', lines: [],
    totals: { subtotalCost: 12, setupCost: 0, overhead: 0, totalCost: 12,
      subtotalNet: 20, totalGross: 24.4, grossProfit: 8, operatingProfit: 8,
      marginPct: 40, markupPct: 66.7 } };
  await scrivi('clients', { id: 4401, name: 'Coerenza SpA', email: 'c@x.it' });
  await scrivi('catalog', { id: 4402, name: 'Targa coerenza', sku: 'TC1', costPrice: 12, salePrice: 20 });
  await scrivi('quotes', { id: 4403, name: 'Preventivo coerenza', clientId: 4401,
    clientName: 'Coerenza SpA', status: 'in_attesa', grossPrice: 24.4, netPrice: 20,
    totalCost: 12, economicSnapshot: snap, date: '2026-06-01' });
  await scrivi('orders', { id: 4404, name: 'Ordine coerenza', clientId: 4401,
    clientName: 'Coerenza SpA', stage: 'produzione', total: 20, originQuote: 4403,
    economicSnapshot: snap, estimatedHours: 2, machineId: '4406',
    assignedTo: 'Operatore Test', technology: 'laser' });
  await scrivi('equipment', { id: 4406, name: 'Laser coerenza', brand: 'INGLY', model: 'LC',
    tech: 'laser', hoursPerDay: 8 });
  await scrivi('items', { id: 4405, name: 'Materiale coerenza', quantity: 100, minStock: 10, costPrice: 2 });
  await IDB.put('inventory_ledger', { id: 4407, itemId: 4405, type: 'CONSUMPTION',
    quantity: 5, at: new Date().toISOString(), note: 'coerenza' });
  return { fatto: true };
});
dico('sei entità create e salvate', creato.fatto === true);

/* ── FASE 6 · lo stesso costo ovunque ───────────────────────────────────── */
const coerenza = await page.evaluate(async () => {
  const cat = await IDB.get('catalog', 4402);
  const q = await IDB.get('quotes', 4403);
  const o = await IDB.get('orders', 4404);
  const S = window.InglyOrderSnapshot;
  return {
    catalogo: cat.costPrice,
    preventivo: q.totalCost,
    preventivoSnap: S.leggi(q).snapshot.totals.totalCost,
    ordineSnap: S.leggi(o).snapshot.totals.totalCost,
    margineOrdine: window.InglyOrderFields.margine(o).valore,
  };
});
dico('FASE 6 · catalogo, preventivo e ordine dicono lo stesso costo ('
  + [coerenza.catalogo, coerenza.preventivo, coerenza.preventivoSnap, coerenza.ordineSnap].join(' · ') + ')',
  coerenza.catalogo === 12 && coerenza.preventivo === 12
  && coerenza.preventivoSnap === 12 && coerenza.ordineSnap === 12);
dico('FASE 6b · e il margine dell ordine viene dallo stesso snapshot', coerenza.margineOrdine === 8);

/* Il catalogo cambia: l'ordine storico non deve muoversi. */
const dopoModifica = await page.evaluate(async () => {
  const cat = await IDB.get('catalog', 4402);
  cat.costPrice = 30;
  await IDB.put('catalog', cat);
  const o = await IDB.get('orders', 4404);
  const q = await IDB.get('quotes', 4403);
  const S = window.InglyOrderSnapshot;
  /* Un preventivo nuovo, fatto adesso, deve invece usare il costo di adesso. */
  const R = window.InglyCatalogRicalcolo;
  const proposta = R.proposta([await IDB.get('catalog', 4402)], { marginePct: 40, arrotondamento: 'nessuno' });
  return {
    catalogoOra: (await IDB.get('catalog', 4402)).costPrice,
    ordineSnap: S.leggi(o).snapshot.totals.totalCost,
    preventivoSnap: S.leggi(q).snapshot.totals.totalCost,
    margineOrdine: window.InglyOrderFields.margine(o).valore,
    prezzoNuovoDalCatalogo: proposta.righe[0].prezzoNuovo,
  };
});
dico('FASE 6c · il costo di catalogo è cambiato (12 → ' + dopoModifica.catalogoOra + ')', dopoModifica.catalogoOra === 30);
dico('FASE 6d · l ordine storico NON si è mosso (' + dopoModifica.ordineSnap + ')', dopoModifica.ordineSnap === 12);
dico('FASE 6e · né il suo margine (' + dopoModifica.margineOrdine + ')', dopoModifica.margineOrdine === 8);
dico('FASE 6f · né il preventivo già fatto (' + dopoModifica.preventivoSnap + ')', dopoModifica.preventivoSnap === 12);
dico('FASE 6g · ma un calcolo nuovo usa il costo nuovo (' + dopoModifica.prezzoNuovoDalCatalogo + ')',
  Math.abs(dopoModifica.prezzoNuovoDalCatalogo - 50) < 0.01);

/* ── FASE 7 · ogni valore derivato dichiara di esserlo ──────────────────── */
const provenienza = await page.evaluate(async () => {
  const o = await IDB.get('orders', 4404);
  const q = await IDB.get('quotes', 4403);
  const macchine = await IDB.getAll('equipment');
  const ordini = await IDB.getAll('orders');
  const movimenti = await IDB.getAll('inventory_ledger').catch(() => []);
  const item = await IDB.get('items', 4405);
  return {
    margine: window.InglyOrderFields.margine(o).fonte,
    immagine: (window.InglyOrderFields.immagine(o, {}) || { fonte: 'assente' }).fonte,
    capacita: window.InglyProduzione.capacitaMacchina(macchine[0] || {}).fonte,
    oreOrdine: window.InglyProduzione.oreOrdine(o, {}).fonte,
    statoQuote: window.InglyQuoteStatus.statoDi(q, { orders: ordini }).fonte,
    statoDerivato: window.InglyQuoteStatus.statoDi(q, { orders: ordini }).derivato,
    riordino: (function () {
      /* `analizza` prende un articolo solo; l'elenco è `elenco`. */
      const riga = window.InglyRiordino.analizza(movimenti, item);
      return { misurabile: riga.misurabile, urgenza: riga.urgenza,
        dichiarato: typeof riga.misurabile === 'boolean' && typeof riga.urgenza === 'string' };
    })(),
  };
});
dico('FASE 7 · il margine dichiara da dove viene (' + provenienza.margine + ')', provenienza.margine === 'snapshot');
dico('FASE 7b · la capacità dichiara se è dichiarata o derivata (' + provenienza.capacita + ')',
  ['dichiarata', 'derivata', 'assente'].includes(provenienza.capacita));
dico('FASE 7c · le ore di un ordine dichiarano la loro origine (' + provenienza.oreOrdine + ')',
  ['dichiarate', 'consuntivo', 'assente'].includes(provenienza.oreOrdine));
dico('FASE 7d · lo stato del preventivo dichiara la sua fonte (' + provenienza.statoQuote + ')',
  typeof provenienza.statoQuote === 'string' && provenienza.statoQuote.length > 0
  && typeof provenienza.statoDerivato === 'boolean');
dico('FASE 7e · il riordino dichiara se il consumo è misurabile ('
  + provenienza.riordino.misurabile + ' · ' + provenienza.riordino.urgenza + ')',
  provenienza.riordino.dichiarato === true);

/* ── FASE 8 · un salvataggio fallito non passa per riuscito ─────────────── */
const fallimento = await page.evaluate(async () => {
  const avvisi = [];
  const toastOriginale = window.toast;
  window.toast = function (m, t) { avvisi.push({ m: String(m), t: t }); if (toastOriginale) return toastOriginale.apply(this, arguments); };

  const putOriginale = IDB.put;
  IDB.put = function () { return Promise.reject(new Error('spazio esaurito (simulato)')); };
  let esito = null;
  try {
    await GestioneOrdini.openProductionPanel(4404);
    await new Promise((s) => setTimeout(s, 700));
    const chi = document.getElementById('pp-assignee');
    if (chi) chi.value = '';
    await GestioneOrdini._savePanelChanges(4404);
    await new Promise((s) => setTimeout(s, 600));
    esito = 'gestito';
  } catch (e) { esito = 'eccezione: ' + e.message; }
  IDB.put = putOriginale;
  document.getElementById('_prod-panel')?.remove();

  const errori = window.Ingly && Ingly.Errors ? Ingly.Errors.elenco() : [];
  window.toast = toastOriginale;
  return {
    esito,
    avvisoErrore: avvisi.some((a) => a.t === 'error' && /non riuscit/i.test(a.m)),
    falsoSuccesso: avvisi.some((a) => a.t === 'success'),
    registrato: errori.some((e) => /spazio esaurito/.test(e.messaggio)),
  };
});
dico('FASE 8 · il salvataggio fallito non lancia un eccezione non gestita', fallimento.esito === 'gestito');
dico('FASE 8b · l utente viene avvisato', fallimento.avvisoErrore === true);
dico('FASE 8c · e non riceve un messaggio di successo', fallimento.falsoSuccesso === false);
dico('FASE 8d · l errore è nel registro', fallimento.registrato === true);

/* Una promessa rifiutata e non gestita da nessuno: il presidio centrale
   deve dirlo, non solo registrarlo. */
const reteCentrale = await page.evaluate(async () => {
  const avvisi = [];
  const toastOriginale = window.toast;
  window.toast = function (m, t) { avvisi.push({ m: String(m), t: t }); };
  Promise.reject(new Error('guasto non gestito (simulato)'));
  await new Promise((s) => setTimeout(s, 900));
  window.toast = toastOriginale;
  const errori = window.Ingly && Ingly.Errors ? Ingly.Errors.elenco() : [];
  return {
    avvisato: avvisi.some((a) => /non è riuscita/i.test(a.m)),
    registrato: errori.some((e) => /guasto non gestito/.test(e.messaggio)),
  };
});
dico('FASE 8e · una promessa rifiutata avvisa l utente, non solo il registro', reteCentrale.avvisato === true);
dico('FASE 8f · e resta comunque registrata', reteCentrale.registrato === true);

/* ── FASE 10 · RICARICA → VERIFICA ──────────────────────────────────────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const dopoReload = await page.evaluate(async () => {
  const leggi = async (store, id) => await IDB.get(store, id).catch(() => null);
  const cliente = await leggi('clients', 4401);
  const prodotto = await leggi('catalog', 4402);
  const preventivo = await leggi('quotes', 4403);
  const ordine = await leggi('orders', 4404);
  const articolo = await leggi('items', 4405);
  const macchina = await leggi('equipment', 4406);
  const movimenti = (await IDB.getAll('inventory_ledger').catch(() => []))
    .filter((m) => m.itemId === 4405);
  const S = window.InglyOrderSnapshot;
  const QS = window.InglyQuoteStatus;
  const ordini = await IDB.getAll('orders');
  const quotes = await IDB.getAll('quotes');
  return {
    presenti: [cliente, prodotto, preventivo, ordine, articolo, macchina].filter(Boolean).length,
    movimenti: movimenti.length,
    assegnatario: ordine && ordine.assignedTo,
    ore: ordine && ordine.estimatedHours,
    snapOrdine: ordine ? S.leggi(ordine).snapshot.totals.totalCost : null,
    costoCatalogo: prodotto && prodotto.costPrice,
    legameQuote: (QS.preventivoDi(ordine, quotes) || {}).id,
    legameOrdine: (QS.ordineDi(preventivo, ordini) || {}).id,
    statoQuote: QS.statoDi(preventivo, { orders: ordini }).id,
  };
});
dico('FASE 10 · le sei entità sono ancora lì dopo il ricaricamento (' + dopoReload.presenti + '/6)',
  dopoReload.presenti === 6);
dico('FASE 10b · e il movimento di magazzino (' + dopoReload.movimenti + ')', dopoReload.movimenti === 1);
dico('FASE 10c · l assegnazione operatore è sopravvissuta', dopoReload.assegnatario === 'Operatore Test');
dico('FASE 10d · le ore di produzione anche', dopoReload.ore === 2);
dico('FASE 10e · lo snapshot dell ordine è ancora quello di allora (' + dopoReload.snapOrdine + ')',
  dopoReload.snapOrdine === 12 && dopoReload.costoCatalogo === 30);
dico('FASE 10f · QUOTE → ORDER regge dopo il ricaricamento', dopoReload.legameOrdine === 4404);
dico('FASE 10g · e ORDER → QUOTE pure', dopoReload.legameQuote === 4403);
dico('FASE 10h · il preventivo risulta convertito (' + dopoReload.statoQuote + ')', dopoReload.statoQuote === 'CONVERTED');

/* ── FASE 6 · e la produzione vede l ordine sulla sua macchina ──────────── */
const produzione = await page.evaluate(async () => {
  const macchine = await IDB.getAll('equipment');
  const ordini = await IDB.getAll('orders');
  const a = window.InglyProduzione.analizza({ macchine, ordini, timelogs: [], finestraGiorni: 30 });
  const riga = a.righe.filter((r) => String(r.id) === '4406')[0];
  return { carico: riga && riga.carico, ordini: riga && riga.ordini, capacita: riga && riga.disponibile };
});
dico('FASE 6h · la produzione conta l ordine sulla macchina giusta ('
  + produzione.carico + ' h su ' + produzione.capacita + ')',
  produzione.ordini === 1 && produzione.carico === 2 && produzione.capacita > 0);

console.log('\nCOERENZA FRA MODULI — STESSO DATO, STESSA RISPOSTA\n');
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
console.log('\nlo stesso dato dà la stessa risposta ovunque ✔\n');
await browser.close();
