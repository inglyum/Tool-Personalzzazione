#!/usr/bin/env node
/**
 * multitech-bom-e2e.mjs — Multi-Tech BOM, rilascio 1.9.0: il percorso vero,
 * dal prodotto all'ordine, con l'orchestratore reale (`InglyProductBOMStore.
 * costoDaOrdine`) che risolve tariffe macchina, manodopera e materiale da
 * IndexedDB — non numeri passati a mano.
 *
 * Un solo caso, tre tecnologie (stampa 3D + laser + assemblaggio a mano,
 * senza macchina — per verificare anche il ripiego sulla manodopera):
 * prodotto → distinta → ordine → Pannello Produzione (routing reale) →
 * pannello Preventivato·Reale·Scostamento (costo dalla distinta, vero
 * orchestratore IDB) → ricaricamento → tutto resta.
 *
 *   node tests/qa/multitech-bom-e2e.mjs [file]
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

const PRODUCT_ID = 996001;
const MATERIAL_ID = 996002;
const ORDER_ID = 996101;
const M_3D = 'm-996-3d';
const M_LASER = 'm-996-laser';
const QTY = 10;

/* ── prodotto, macchine, registro di magazzino: dati reali in IDB ───────── */
const setup = await page.evaluate(async (a) => {
  await IDB.put('catalog', { id: a.productId, name: 'Orologio 3D+Laser+Assemblaggio', category: 'Orologi', costPrice: 10, salePrice: 40, tech: 'print3d' });
  await IDB.put('materials', { id: a.materialId, name: 'Resina base' });
  await IDB.put('equipment', { id: a.m3d, name: 'Stampante 3D FDM', ratedPowerW: 250, kwhPrice: 0.28, purchasePrice: 900, usefulLifeHours: 4000, maintenancePerHour: 0.10 });
  await IDB.put('equipment', { id: a.mLaser, name: 'Laser Fiber 30W', ratedPowerW: 300, kwhPrice: 0.28, purchasePrice: 3200, usefulLifeHours: 6000, maintenancePerHour: 0.30 });
  const movimento = InglyInventoryLedger.crea({ id: 'mv-996-1', itemId: `materials:${a.materialId}`, warehouseId: 'default', type: 'PURCHASE', quantity: 50, unitCost: 4 }, 0);
  await IDB.put('inventory_ledger', movimento);

  const r = await InglyProductBOMStore.crea({
    productId: a.productId,
    righe: [
      { type: 'materiale', itemKey: `materials:${a.materialId}`, quantity: 1, unit: 'pz', label: 'Resina base', scrapPct: 5 },
      { type: 'operazione', technology: 'stampa3d', machineId: a.m3d, setupTime: 20, timePerUnit: 8, sequence: 1 },
      { type: 'operazione', technology: 'laser', machineId: a.mLaser, setupTime: 15, timePerUnit: 2, sequence: 2 },
      { type: 'operazione', technology: 'finitura', setupTime: 5, timePerUnit: 3, sequence: 3 }, // assemblaggio a mano, nessuna macchina
    ],
  });
  return { ok: r.ok, motivo: r.motivo };
}, { productId: PRODUCT_ID, materialId: MATERIAL_ID, m3d: M_3D, mLaser: M_LASER });
dico('la distinta a tre tecnologie (3D + laser + assemblaggio a mano) si salva', setup.ok, setup.motivo);

/* ── un ordine vero per questo prodotto ──────────────────────────────────── */
await page.evaluate(async (a) => {
  await IDB.put('orders', {
    id: a.orderId, clientName: 'Cliente Multi-Tech E2E',
    items: [{ catalogId: a.productId, qty: a.qty, name: 'Orologio', desc: 'Orologio 3D+Laser+Assemblaggio', price: 40, cost: 10 }],
    total: 400, totalNet: 400 / 1.22, stage: 'backlog', status: 'backlog',
  });
}, { orderId: ORDER_ID, productId: PRODUCT_ID, qty: QTY });

/* ── 1 · ROUTING: il Pannello Produzione, un'operazione per lavorazione ──── */
await page.evaluate(async (id) => { await GestioneOrdini.openProductionPanel(id); await new Promise((r) => setTimeout(r, 250)); }, ORDER_ID);
const routing = await page.evaluate(async (id) => {
  const ordine = await IDB.get('orders', id);
  return InglyOperazioni.leggi(ordine);
}, ORDER_ID);
dico('il routing ha le tre lavorazioni dichiarate dalla distinta', routing.length === 3, routing.map((o) => o.technology));
// InglyOperazioni.normalizza canonicalizza «stampa3d» in «3d» (production-model.js):
// stessa lavorazione, id canonico diverso dalla stringa grezza della distinta.
dico('l\'ordine delle operazioni segue la sequenza della distinta (3D, laser, finitura)',
  routing[0]?.technology === '3d' && routing[1]?.technology === 'laser' && routing[2]?.technology === 'finitura',
  routing.map((o) => o.technology));

/* ── 2 · COSTO: l'orchestratore reale, tariffe risolte da IDB ───────────── */
const costo1 = await page.evaluate(async (id) => {
  const ordine = await IDB.get('orders', id);
  return await InglyProductBOMStore.costoDaOrdine(ordine);
}, ORDER_ID);
dico('il costo si risolve, ed è completo (tutte le tariffe/costi sono stati trovati)', costo1 && costo1.completo === true, costo1 && costo1.motivo);
dico('coinvolge le tre tecnologie', costo1 && costo1.tecnologie.slice().sort().join(',') === 'finitura,laser,stampa3d');
dico('ha quattro voci: tre operazioni + un materiale', costo1 && costo1.voci.length === 4);
dico('la voce di assemblaggio (senza macchina) è valorizzata dal ripiego sulla manodopera',
  costo1 && costo1.voci.find((v) => v.technology === 'finitura')?.fonte === 'manodopera');
dico('le voci con macchina sono valorizzate dalla tariffa macchina, non dalla manodopera',
  costo1 && costo1.voci.find((v) => v.technology === 'stampa3d')?.fonte === 'macchina'
    && costo1.voci.find((v) => v.technology === 'laser')?.fonte === 'macchina');
dico('il costo per pezzo è un numero positivo reale, non un numero inventato', costo1 && costo1.costoPerPezzo > 0, costo1 && costo1.costoPerPezzo);

/* ── 3 · PROTEZIONE DOPPIO CONTEGGIO: ricalcolare non accumula ──────────── */
const costo2 = await page.evaluate(async (id) => {
  const ordine = await IDB.get('orders', id);
  return await InglyProductBOMStore.costoDaOrdine(ordine);
}, ORDER_ID);
dico('richiamare costoDaOrdine due volte dà lo stesso identico risultato (nessun accumulo)',
  costo1.costoPerPezzo === costo2.costoPerPezzo && costo1.unaTantum === costo2.unaTantum);

const soloOperazioni = await page.evaluate(async (id) => {
  const ordine = await IDB.get('orders', id);
  const bom = await InglyProductBOMStore.corrente(ordine.items[0].catalogId);
  return InglyBOMCost.costoOperazioni(bom, { tariffeMacchina: {}, manodoperaOraria: 0 }).length;
}, ORDER_ID);
dico('la distinta ha esattamente tre righe di operazione, non di più (nessuna lavorazione duplicata)', soloOperazioni === 3);

/* ── 4 · ORDER ECONOMICS: il pannello Preventivato·Reale·Scostamento ────── */
await page.evaluate(() => App.navigate('gestione_ordini'));
await page.waitForTimeout(2000);
const dett = await page.evaluate(async (id) => {
  await GestioneOrdini._openDetail(id);
  await new Promise((r) => setTimeout(r, 1500));
  const n = document.getElementById('go-consuntivo');
  return { presente: !!n, testo: n ? n.textContent : '' };
}, ORDER_ID);
dico('il pannello del consuntivo si apre sull\'ordine vero', dett.presente);
dico('mostra la sezione "Secondo la distinta"', /Secondo la distinta/.test(dett.testo));
dico('nomina tutte e tre le tecnologie della distinta', /stampa3d/.test(dett.testo) && /laser/.test(dett.testo) && /finitura/.test(dett.testo));
dico('il preventivo del cliente non è stato toccato (il testo lo dichiara ancora)', /non cambia/i.test(dett.testo));

/* ── 5 · PERSISTENZA dopo un ricaricamento vero ──────────────────────────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);
const dopoReload = await page.evaluate(async (id) => {
  const ordine = await IDB.get('orders', id);
  const routing = InglyOperazioni.leggi(ordine);
  const costo = await InglyProductBOMStore.costoDaOrdine(ordine);
  return { routing: routing.length, tecnologie: routing.map((o) => o.technology), costoPerPezzo: costo?.costoPerPezzo, completo: costo?.completo };
}, ORDER_ID);
dico('il routing a tre operazioni resta dopo il ricaricamento', dopoReload.routing === 3);
dico('il costo dalla distinta resta calcolabile e identico dopo il ricaricamento',
  dopoReload.completo === true && dopoReload.costoPerPezzo === costo1.costoPerPezzo);

/* ── 6 · NESSUNA REGRESSIONE: un ordine senza distinta non vede la sezione ─ */
const NORMAL_ORDER = 996102;
await page.evaluate(async (id) => {
  await IDB.put('orders', { id, clientName: 'Cliente Normale', technology: 'laser', total: 50, totalNet: 40, stage: 'backlog', status: 'backlog' });
}, NORMAL_ORDER);
const dettNormale = await page.evaluate(async (id) => {
  await GestioneOrdini._openDetail(id);
  await new Promise((r) => setTimeout(r, 1500));
  const n = document.getElementById('go-consuntivo');
  return { testo: n ? n.textContent : '' };
}, NORMAL_ORDER);
dico('un ordine senza distinta collegata non mostra la sezione "Secondo la distinta" (nessuna regressione)',
  !/Secondo la distinta/.test(dettNormale.testo));

/* ── esito ─────────────────────────────────────────────────────────────── */
const fallite = passi.filter((p) => !p.esito);
console.log('MULTI-TECH BOM E2E (1.9.0) →', JSON.stringify({ totale: passi.length, falliti: fallite.length, erroriJS: erroriJS.length }, null, 2));
passi.forEach((p) => console.log(`  ${p.esito ? '✅' : '❌'} ${p.passo}${p.dettaglio != null ? ' — ' + JSON.stringify(p.dettaglio) : ''}`));
if (erroriJS.length) console.log('ERRORI JS:', erroriJS);

await browser.close();
if (fallite.length || erroriJS.length) process.exit(1);
