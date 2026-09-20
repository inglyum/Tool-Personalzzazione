#!/usr/bin/env node
/**
 * multitech-material-net-availability.mjs — Multi-Tech BOM, rilascio 8:
 * il fabbisogno netto sugli ordini aperti.
 *
 * `fabbisognoDaOrdine` (rilascio 6, 2.0.0) diceva solo «quanto c'è oggi
 * sullo scaffale» — la sua stessa documentazione rimandava esplicitamente
 * l'incrocio con gli altri ordini aperti a «un rilascio a sé». Qui si
 * verifica quell'incrocio: due ordini aperti che chiedono lo stesso
 * materiale, ciascuno singolarmente coperto dalla giacenza, ma non insieme.
 *
 * L'impegno degli altri ordini viene da due vie, mai sommate sullo stesso
 * ordine (altrimenti si conterebbe due volte):
 *   - un ordine aperto CON distinta: dalla distinta stessa (BOM);
 *   - un ordine aperto SENZA distinta ma con un preventivo collegato:
 *     dal motore esistente `InglyFabbisogno.daOrdine` (costBreakdown) —
 *     riuso, non un secondo calcolo.
 * Un ordine chiuso (consegnato) non impegna più niente.
 *
 *   node tests/qa/multitech-material-net-availability.mjs [file]
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

const PRODUCT_ID = 997201;
const MAT = 997202;              // 1000 g in giacenza
const ORDER_A = 997301;          // aperto, con distinta, chiede 600g
const ORDER_B = 997302;          // aperto, con distinta, chiede 600g — insieme ad A non ci stanno
const ORDER_CHIUSO = 997303;     // consegnato, chiede 600g — NON deve impegnare
const ORDER_PREVENTIVO = 997304; // aperto, SENZA distinta ma con un preventivo collegato allo stesso materiale

/* ── un prodotto con un solo materiale, giacenza 1000g ───────────────────── */
const setup = await page.evaluate(async (a) => {
  await IDB.put('catalog', { id: a.productId, name: 'Gadget Conteso', category: 'Gadget', costPrice: 5, salePrice: 15, tech: 'laser' });
  await IDB.put('materials', { id: a.mat, name: 'Resina epossidica' });
  const mov = InglyInventoryLedger.crea({ id: 'mv-997-201', itemId: `materials:${a.mat}`, warehouseId: 'default', type: 'PURCHASE', quantity: 1000, unitCost: 2 }, 0);
  await IDB.put('inventory_ledger', mov);
  const r = await InglyProductBOMStore.crea({
    productId: a.productId,
    righe: [
      { type: 'materiale', itemKey: `materials:${a.mat}`, quantity: 600, unit: 'g', label: 'Resina epossidica' },
      { type: 'operazione', technology: 'laser', setupTime: 5, timePerUnit: 1, sequence: 1 },
    ],
  });
  return { ok: r.ok, motivo: r.motivo };
}, { productId: PRODUCT_ID, mat: MAT });
dico('la distinta (600g per pezzo, 1 pezzo per ordine) si salva', setup.ok, setup.motivo);

/* ── da soli, un solo ordine aperto: nessun impegno da altri, come prima ── */
await page.evaluate(async (a) => {
  await IDB.put('orders', { id: a.orderId, clientName: 'Cliente A', items: [{ catalogId: a.productId, qty: 1, name: 'Gadget', desc: 'Gadget' }], total: 15, stage: 'backlog', status: 'backlog' });
}, { orderId: ORDER_A, productId: PRODUCT_ID });

const solo = await page.evaluate(async (id) => {
  await GestioneOrdini.openProductionPanel(id);
  await new Promise((r) => setTimeout(r, 250));
  const n = document.getElementById('pp-materiali');
  return { testo: n ? n.textContent : '' };
}, ORDER_A);
dico('da solo, l\'ordine A è coperto e non mostra nessun impegno da altri (nessuna regressione rispetto al 2.0.0)',
  /disponibile/.test(solo.testo) && !/altri ordini aperti impegnano \d/.test(solo.testo), solo.testo);

/* ── secondo ordine aperto sullo stesso materiale: insieme non ci stanno ── */
await page.evaluate(async (a) => {
  await IDB.put('orders', { id: a.orderId, clientName: 'Cliente B', items: [{ catalogId: a.productId, qty: 1, name: 'Gadget', desc: 'Gadget' }], total: 15, stage: 'backlog', status: 'backlog' });
}, { orderId: ORDER_B, productId: PRODUCT_ID });

const doppio = await page.evaluate(async (id) => {
  await GestioneOrdini.openProductionPanel(id);
  await new Promise((r) => setTimeout(r, 250));
  const n = document.getElementById('pp-materiali');
  return { testo: n ? n.textContent : '' };
}, ORDER_A);
dico('ora l\'ordine A mostra che l\'altro ordine aperto (B) impegna 600g', /impegnano 600 g/.test(doppio.testo), doppio.testo);
dico('e dice che il netto per A non basta (1000-600=400 < 600 richiesti)', /netto per questo ordine: 400 g \(insufficiente\)/.test(doppio.testo), doppio.testo);

const bVedeA = await page.evaluate(async (id) => {
  await GestioneOrdini.openProductionPanel(id);
  await new Promise((r) => setTimeout(r, 250));
  const n = document.getElementById('pp-materiali');
  return { testo: n ? n.textContent : '' };
}, ORDER_B);
dico('e simmetricamente B vede impegnati i 600g di A, non i propri', /impegnano 600 g/.test(bVedeA.testo), bVedeA.testo);

/* ── un ordine con lo stesso materiale ma CHIUSO non impegna più niente ── */
await page.evaluate(async (a) => {
  await IDB.put('orders', { id: a.orderId, clientName: 'Cliente Consegnato', items: [{ catalogId: a.productId, qty: 1, name: 'Gadget', desc: 'Gadget' }], total: 15, stage: 'delivered', status: 'delivered' });
}, { orderId: ORDER_CHIUSO, productId: PRODUCT_ID });

const dopoChiuso = await page.evaluate(async (id) => {
  await GestioneOrdini.openProductionPanel(id);
  await new Promise((r) => setTimeout(r, 250));
  const n = document.getElementById('pp-materiali');
  return { testo: n ? n.textContent : '' };
}, ORDER_A);
dico('un ordine consegnato non aggiunge impegno (resta 600g, non 1200g)', /impegnano 600 g/.test(dopoChiuso.testo) && !/impegnano 1200 g/.test(dopoChiuso.testo), dopoChiuso.testo);

/* ── un ordine SENZA distinta ma con un preventivo collegato allo stesso
   materiale impegna comunque, dalla via del motore esistente ────────────── */
await page.evaluate(async (a) => {
  await IDB.put('orders', {
    id: a.orderId, clientName: 'Cliente Preventivo', total: 40, stage: 'confermato', status: 'confermato',
    costBreakdown: { voci: [{ label: 'Resina epossidica', category: 'material', itemKey: `materials:${a.mat}`, quantity: 100, unit: 'g', unitCost: 2, totalCost: 200 }] },
  });
}, { orderId: ORDER_PREVENTIVO, mat: MAT });

const conPreventivo = await page.evaluate(async (id) => {
  await GestioneOrdini.openProductionPanel(id);
  await new Promise((r) => setTimeout(r, 250));
  const n = document.getElementById('pp-materiali');
  return { testo: n ? n.textContent : '' };
}, ORDER_A);
dico('un ordine SENZA distinta ma con un preventivo sullo stesso materiale impegna anche lui (600+100=700g)', /impegnano 700 g/.test(conPreventivo.testo), conPreventivo.testo);

/* ── nessuna regressione: ordine senza distinta e senza materiale in comune ── */
const NORMAL_ORDER = 997305;
await page.evaluate(async (id) => {
  await IDB.put('orders', { id, clientName: 'Cliente Normale', technology: 'laser', total: 30, stage: 'backlog', status: 'backlog' });
}, NORMAL_ORDER);
const normale = await page.evaluate(async (id) => {
  await GestioneOrdini.openProductionPanel(id);
  await new Promise((r) => setTimeout(r, 250));
  const n = document.getElementById('pp-materiali');
  return { testo: n ? n.textContent : '' };
}, NORMAL_ORDER);
dico('un ordine senza distinta collegata continua a non mostrare la sezione (nessuna regressione)', normale.testo.trim() === '');

/* ── persistenza dopo un ricaricamento vero ──────────────────────────────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);
const dopoReload = await page.evaluate(async (id) => {
  await GestioneOrdini.openProductionPanel(id);
  await new Promise((r) => setTimeout(r, 250));
  const n = document.getElementById('pp-materiali');
  return { testo: n ? n.textContent : '' };
}, ORDER_A);
dico('dopo un ricaricamento vero, il fabbisogno netto resta calcolabile e coerente (700g impegnati)', /impegnano 700 g/.test(dopoReload.testo), dopoReload.testo);

/* ── esito ─────────────────────────────────────────────────────────────── */
const fallite = passi.filter((p) => !p.esito);
console.log('MULTI-TECH FABBISOGNO NETTO (2.3.0) →', JSON.stringify({ totale: passi.length, falliti: fallite.length, erroriJS: erroriJS.length }, null, 2));
passi.forEach((p) => console.log(`  ${p.esito ? '✅' : '❌'} ${p.passo}${p.dettaglio != null ? ' — ' + JSON.stringify(p.dettaglio) : ''}`));
if (erroriJS.length) console.log('ERRORI JS:', erroriJS);

await browser.close();
if (fallite.length || erroriJS.length) process.exit(1);
