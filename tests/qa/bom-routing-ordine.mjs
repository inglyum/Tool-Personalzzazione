#!/usr/bin/env node
/**
 * bom-routing-ordine.mjs — Multi-Tech BOM, rilascio 3: un ordine di un
 * prodotto con distinta base riceve il routing dalla distinta, non dedotto
 * dalla sua singola tecnologia.
 *
 * Due superfici generano un routing quando manca — la transizione
 * automatica a produzione (WorkflowSync.transition, patch 042) e il
 * Pannello Produzione aperto a mano (GestioneOrdini.openProductionPanel,
 * patch 052) — ed entrambe ora passano da InglyProductBOMStore.routingDaOrdine
 * prima di ricadere sulla vecchia deduzione a singola tecnologia
 * (InglyOperazioni.costruisciDaOrdine). Qui si verificano entrambe, un
 * ordine senza distinta collegata (nessuna regressione) e la persistenza
 * dopo un ricaricamento vero.
 *
 *   node tests/qa/bom-routing-ordine.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
page.on('dialog', (d) => d.accept().catch(() => {}));
await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

const PRODUCT_ID = 995001;
const ORDER_TRANSIZIONE = 995101;
const ORDER_SENZA_DISTINTA = 995102;
const ORDER_PANNELLO = 995103;

/* ── prodotto con distinta base multi-tecnologia (laser + uv), avviamento
   e tempo per pezzo separati e diversi fra le due lavorazioni ──────────── */
const setup = await page.evaluate(async (productId) => {
  await IDB.put('catalog', { id: productId, name: 'Orologio Routing Test', category: 'Orologi', costPrice: 10, salePrice: 30, tech: 'laser' });
  const r = await InglyProductBOMStore.crea({
    productId,
    righe: [
      { type: 'operazione', technology: 'laser', setupTime: 15, timePerUnit: 0.5, sequence: 1 },
      { type: 'operazione', technology: 'uv', setupTime: 10, timePerUnit: 0.3, sequence: 2 },
    ],
  });
  return { ok: r.ok, motivo: r.motivo };
}, PRODUCT_ID);
dico('la distinta base multi-tecnologia si salva davvero', setup.ok, setup.motivo);

/* ── A. transizione automatica a produzione (WorkflowSync) ───────────── */
await page.evaluate(async (args) => {
  await IDB.put('orders', { id: args.orderId, clientName: 'Cliente Routing A', items: [{ catalogId: args.productId, qty: 20, name: 'Orologio', desc: 'Orologio' }], total: 600, stage: 'backlog', status: 'backlog' });
}, { orderId: ORDER_TRANSIZIONE, productId: PRODUCT_ID });

const dopoTransizione = await page.evaluate(async (orderId) => {
  await WorkflowSync.transition(orderId, 'working');
  const ordine = await IDB.get('orders', orderId);
  const routing = InglyOperazioni.leggi(ordine);
  return { routing, hasOperations: Array.isArray(ordine.operations) };
}, ORDER_TRANSIZIONE);

dico('la transizione a "working" genera un routing', dopoTransizione.routing.length > 0);
dico('il routing ha le due lavorazioni della distinta (laser + uv), non una sola dedotta', dopoTransizione.routing.length === 2, dopoTransizione.routing.map((o) => o.technology));
dico('la tecnologia laser è quella della prima riga', dopoTransizione.routing[0]?.technology === 'laser');
dico('la tecnologia uv è quella della seconda riga', dopoTransizione.routing[1]?.technology === 'uv');
dico('il tempo laser è avviamento + tempo/pezzo × 20, non moltiplicato per intero (15+0.5×20=25)', dopoTransizione.routing[0]?.estimatedTime === 25, dopoTransizione.routing[0]?.estimatedTime);
dico('il tempo uv è 10+0.3×20=16, non un secondo avviamento centuplicato', dopoTransizione.routing[1]?.estimatedTime === 16, dopoTransizione.routing[1]?.estimatedTime);
dico('il routing è scritto anche su order.operations, non solo in production', dopoTransizione.hasOperations);

/* ── una seconda transizione non ricostruisce il routing già presente ── */
const dopoSeconda = await page.evaluate(async (orderId) => {
  const prima = await IDB.get('orders', orderId);
  const idPrima = InglyOperazioni.leggi(prima).map((o) => o.id).join(',');
  await WorkflowSync.transition(orderId, 'ready');
  const dopo = await IDB.get('orders', orderId);
  const idDopo = InglyOperazioni.leggi(dopo).map((o) => o.id).join(',');
  return { uguali: idPrima === idDopo, conteggio: InglyOperazioni.leggi(dopo).length };
}, ORDER_TRANSIZIONE);
dico('una transizione successiva non ricostruisce un routing già presente', dopoSeconda.uguali && dopoSeconda.conteggio === 2);

/* ── B. nessuna regressione: un ordine senza distinta collegata si comporta
   esattamente come prima (deduzione a singola tecnologia) ─────────────── */
await page.evaluate(async (orderId) => {
  await IDB.put('orders', { id: orderId, clientName: 'Cliente Senza Distinta', technology: 'laser', total: 100, stage: 'backlog', status: 'backlog' });
}, ORDER_SENZA_DISTINTA);

const senzaDistinta = await page.evaluate(async (orderId) => {
  await WorkflowSync.transition(orderId, 'working');
  const ordine = await IDB.get('orders', orderId);
  return InglyOperazioni.leggi(ordine);
}, ORDER_SENZA_DISTINTA);
dico('un ordine senza distinta collegata riceve ancora una sola operazione dedotta (nessuna regressione)', senzaDistinta.length === 1 && senzaDistinta[0]?.technology === 'laser');

/* ── C. lo stesso routing dalla distinta, aprendo il Pannello Produzione
   direttamente — senza passare da una transizione di stato ────────────── */
await page.evaluate(async (args) => {
  await IDB.put('orders', { id: args.orderId, clientName: 'Cliente Routing C', items: [{ catalogId: args.productId, qty: 5, name: 'Orologio', desc: 'Orologio' }], total: 150, stage: 'backlog', status: 'backlog' });
}, { orderId: ORDER_PANNELLO, productId: PRODUCT_ID });

await page.evaluate(async (orderId) => { await GestioneOrdini.openProductionPanel(orderId); await new Promise((r) => setTimeout(r, 200)); }, ORDER_PANNELLO);
const pannello = await page.evaluate(async (orderId) => {
  const ordine = await IDB.get('orders', orderId);
  return InglyOperazioni.leggi(ordine);
}, ORDER_PANNELLO);
dico('il Pannello Produzione aperto a mano genera lo stesso routing dalla distinta (5 pezzi: 15+0.5×5=17.5, 10+0.3×5=11.5)',
  pannello.length === 2 && pannello[0]?.estimatedTime === 17.5 && pannello[1]?.estimatedTime === 11.5,
  pannello.map((o) => [o.technology, o.estimatedTime]));

/* ── persistenza dopo un ricaricamento vero ───────────────────────────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);
const dopoReload = await page.evaluate(async (orderId) => {
  const ordine = await IDB.get('orders', orderId);
  return InglyOperazioni.leggi(ordine);
}, ORDER_TRANSIZIONE);
dico('il routing dalla distinta resta dopo un ricaricamento vero della pagina', dopoReload.length === 2 && dopoReload[0]?.technology === 'laser' && dopoReload[1]?.technology === 'uv');

/* ── esito ─────────────────────────────────────────────────────────────── */
const fallite = passi.filter((p) => !p.esito);
console.log('BOM ROUTING ORDINE →', JSON.stringify({ totale: passi.length, falliti: fallite.length, erroriJS: erroriJS.length }, null, 2));
passi.forEach((p) => console.log(`  ${p.esito ? '✅' : '❌'} ${p.passo}${p.dettaglio != null ? ' — ' + JSON.stringify(p.dettaglio) : ''}`));
if (erroriJS.length) console.log('ERRORI JS:', erroriJS);

await browser.close();
if (fallite.length || erroriJS.length) process.exit(1);
