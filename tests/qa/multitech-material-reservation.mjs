#!/usr/bin/env node
/**
 * multitech-material-reservation.mjs — Multi-Tech BOM downstream, rilascio
 * 2.0.0: il Pannello Produzione mostra il fabbisogno materiali dalla
 * distinta base, con la giacenza reale letta dal registro di magazzino.
 *
 * `InglyFabbisogno` (material-requirement.js) esiste dalla Fase 31/32 ma non
 * ha mai avuto un consumatore — verificato con `grep`, zero occorrenze fuori
 * dal proprio file — e legge comunque solo da `costBreakdown.voci` (il
 * preventivo), mai dalla distinta di un prodotto. Qui si verifica il nuovo
 * `InglyProductBOMStore.fabbisognoDaOrdine`: un ordine con distinta mostra
 * quanto materiale serve e se lo scaffale ne ha abbastanza, senza impegnare
 * o scrivere nulla; un ordine senza distinta non mostra la sezione.
 *
 *   node tests/qa/multitech-material-reservation.mjs [file]
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

const PRODUCT_ID = 997001;
const MAT_ABBONDANTE = 997002; // scaffale pieno
const MAT_SCARSO = 997003;     // scaffale quasi vuoto
const ORDER_SUFFICIENTE = 997101;
const ORDER_CARENTE = 997102;

/* ── un prodotto con due materiali: uno abbondante, uno scarso ──────────── */
const setup = await page.evaluate(async (a) => {
  await IDB.put('catalog', { id: a.productId, name: 'Gadget Multi-Materiale', category: 'Gadget', costPrice: 5, salePrice: 15, tech: 'laser' });
  await IDB.put('materials', { id: a.matAbbondante, name: 'Legno compensato' });
  await IDB.put('materials', { id: a.matScarso, name: 'Placca oro 24k' });

  const abbondante = InglyInventoryLedger.crea({ id: 'mv-997-1', itemId: `materials:${a.matAbbondante}`, warehouseId: 'default', type: 'PURCHASE', quantity: 1000, unitCost: 0.5 }, 0);
  const scarso = InglyInventoryLedger.crea({ id: 'mv-997-2', itemId: `materials:${a.matScarso}`, warehouseId: 'default', type: 'PURCHASE', quantity: 4, unitCost: 20 }, 0);
  await IDB.put('inventory_ledger', abbondante);
  await IDB.put('inventory_ledger', scarso);

  const r = await InglyProductBOMStore.crea({
    productId: a.productId,
    righe: [
      { type: 'materiale', itemKey: `materials:${a.matAbbondante}`, quantity: 5, unit: 'g', label: 'Legno compensato' },
      { type: 'materiale', itemKey: `materials:${a.matScarso}`, quantity: 1, unit: 'g', label: 'Placca oro 24k' },
      { type: 'operazione', technology: 'laser', setupTime: 5, timePerUnit: 1, sequence: 1 },
    ],
  });
  return { ok: r.ok, motivo: r.motivo };
}, { productId: PRODUCT_ID, matAbbondante: MAT_ABBONDANTE, matScarso: MAT_SCARSO });
dico('la distinta con due materiali si salva', setup.ok, setup.motivo);

/* ── ordine A: quantità piccola, entrambi i materiali bastano ───────────── */
await page.evaluate(async (a) => {
  await IDB.put('orders', { id: a.orderId, clientName: 'Cliente Sufficiente', items: [{ catalogId: a.productId, qty: 3, name: 'Gadget', desc: 'Gadget' }], total: 45, stage: 'backlog', status: 'backlog' });
}, { orderId: ORDER_SUFFICIENTE, productId: PRODUCT_ID });

const suff = await page.evaluate(async (id) => {
  await GestioneOrdini.openProductionPanel(id);
  await new Promise((r) => setTimeout(r, 250));
  const n = document.getElementById('pp-materiali');
  return { presente: !!n, testo: n ? n.textContent : '' };
}, ORDER_SUFFICIENTE);
dico('la sezione Materiali necessari compare per un ordine con distinta', suff.presente && suff.testo.includes('Materiali necessari'));
dico('nomina entrambi i materiali', /Legno compensato/.test(suff.testo) && /Placca oro/.test(suff.testo));
dico('per 3 pezzi bastano entrambi (5×3=15g legno, 1×3=3g oro, entrambi disponibili)', /disponibile/.test(suff.testo) && !/manca/.test(suff.testo));

/* ── ordine B: quantità grande, il materiale scarso non basta ───────────── */
await page.evaluate(async (a) => {
  await IDB.put('orders', { id: a.orderId, clientName: 'Cliente Carente', items: [{ catalogId: a.productId, qty: 50, name: 'Gadget', desc: 'Gadget' }], total: 750, stage: 'backlog', status: 'backlog' });
}, { orderId: ORDER_CARENTE, productId: PRODUCT_ID });

const carente = await page.evaluate(async (id) => {
  await GestioneOrdini.openProductionPanel(id);
  await new Promise((r) => setTimeout(r, 250));
  const n = document.getElementById('pp-materiali');
  return { testo: n ? n.textContent : '' };
}, ORDER_CARENTE);
// 50 pezzi: legno 5×50=250g (< 1000g in giacenza, ok), oro 1×50=50g (> 4g in giacenza, manca 46)
dico('per 50 pezzi il legno basta ancora', /disponibile/.test(carente.testo));
dico('ma la placca oro non basta, e lo dice con un numero preciso (manca 46)', /manca 46/.test(carente.testo), carente.testo);

/* ── nessuna regressione: un ordine senza distinta non mostra la sezione ── */
const NORMAL_ORDER = 997103;
await page.evaluate(async (id) => {
  await IDB.put('orders', { id, clientName: 'Cliente Normale', technology: 'laser', total: 30, stage: 'backlog', status: 'backlog' });
}, NORMAL_ORDER);
const normale = await page.evaluate(async (id) => {
  await GestioneOrdini.openProductionPanel(id);
  await new Promise((r) => setTimeout(r, 250));
  const n = document.getElementById('pp-materiali');
  return { testo: n ? n.textContent : '' };
}, NORMAL_ORDER);
dico('un ordine senza distinta collegata non mostra la sezione (nessuna regressione)', normale.testo.trim() === '');

/* ── persistenza dopo un ricaricamento vero ──────────────────────────────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);
const dopoReload = await page.evaluate(async (id) => {
  await GestioneOrdini.openProductionPanel(id);
  await new Promise((r) => setTimeout(r, 250));
  const n = document.getElementById('pp-materiali');
  return { testo: n ? n.textContent : '' };
}, ORDER_CARENTE);
dico('dopo un ricaricamento vero, il fabbisogno resta calcolabile e coerente', /manca 46/.test(dopoReload.testo));

/* ── esito ─────────────────────────────────────────────────────────────── */
const fallite = passi.filter((p) => !p.esito);
console.log('MULTI-TECH MATERIAL RESERVATION (2.0.0) →', JSON.stringify({ totale: passi.length, falliti: fallite.length, erroriJS: erroriJS.length }, null, 2));
passi.forEach((p) => console.log(`  ${p.esito ? '✅' : '❌'} ${p.passo}${p.dettaglio != null ? ' — ' + JSON.stringify(p.dettaglio) : ''}`));
if (erroriJS.length) console.log('ERRORI JS:', erroriJS);

await browser.close();
if (fallite.length || erroriJS.length) process.exit(1);
