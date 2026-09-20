#!/usr/bin/env node
/**
 * multitech-actual-consumption.mjs — Multi-Tech BOM downstream, rilascio
 * 2.2.0: il percorso completo ORDER → WORK ORDER (routing) → OPERAZIONE
 * COMPLETATA → CONSUMO MATERIALE REALE → REGISTRO DI MAGAZZINO → COSTO
 * REALE → PROFITTO, verificato in browser reale.
 *
 * Ogni registrazione di qualità (buoni/scarti/rifacimenti) su un'operazione
 * di un ordine con distinta base ora consuma davvero il materiale dal
 * magazzino — solo la differenza rispetto a quanto già consumato, mai
 * l'intero totale una seconda volta. Un pezzo scartato ha comunque
 * consumato il materiale del tentativo: lo scarto non sparisce dal conto.
 *
 * Si verifica: completamento parziale (4 di 10, poi i 6 rimanenti),
 * scarto compreso nel consumo, protezione dal doppio conteggio (la stessa
 * registrazione due volte non raddoppia il consumo), costo reale
 * accumulato sull'operazione, il pannello Preventivato·Reale·Scostamento
 * che mostra «Consumo reale registrato», e la persistenza dopo un
 * ricaricamento vero. Un ordine senza distinta non fa niente di tutto
 * questo: nessuna regressione.
 *
 *   node tests/qa/multitech-actual-consumption.mjs [file]
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

const PRODUCT_ID = 998001;
const MATERIAL_ID = 998002;
const M_3D = 'm-998-3d';
const M_LASER = 'm-998-laser';
const ORDER_ID = 998101;
const QTY = 10;

/* ── prodotto multi-tecnologia (3D + laser), scorta abbondante ──────────── */
const setup = await page.evaluate(async (a) => {
  await IDB.put('catalog', { id: a.productId, name: 'Portachiavi Multi-Tech', category: 'Gadget', costPrice: 3, salePrice: 12, tech: 'print3d' });
  await IDB.put('materials', { id: a.materialId, name: 'Filamento PLA' });
  await IDB.put('equipment', { id: a.m3d, name: 'Stampante 3D', ratedPowerW: 200, kwhPrice: 0.28, purchasePrice: 800, usefulLifeHours: 3000, maintenancePerHour: 0.05 });
  await IDB.put('equipment', { id: a.mLaser, name: 'Laser incisore', ratedPowerW: 150, kwhPrice: 0.28, purchasePrice: 1500, usefulLifeHours: 5000, maintenancePerHour: 0.10 });
  const mv = InglyInventoryLedger.crea({ id: 'mv-998-1', itemId: `materials:${a.materialId}`, warehouseId: 'default', type: 'PURCHASE', quantity: 5000, unitCost: 0.02 }, 0);
  await IDB.put('inventory_ledger', mv);

  const r = await InglyProductBOMStore.crea({
    productId: a.productId,
    righe: [
      { type: 'materiale', itemKey: `materials:${a.materialId}`, quantity: 10, unit: 'g', label: 'Filamento PLA' },
      { type: 'operazione', technology: 'stampa3d', machineId: a.m3d, setupTime: 10, timePerUnit: 4, sequence: 1 },
      { type: 'operazione', technology: 'laser', machineId: a.mLaser, setupTime: 5, timePerUnit: 1, sequence: 2 },
    ],
  });
  return { ok: r.ok, motivo: r.motivo };
}, { productId: PRODUCT_ID, materialId: MATERIAL_ID, m3d: M_3D, mLaser: M_LASER });
dico('la distinta multi-tecnologia si salva', setup.ok, setup.motivo);

/* ── ordine reale, 10 pezzi ───────────────────────────────────────────────── */
await page.evaluate(async (a) => {
  await IDB.put('orders', { id: a.orderId, clientName: 'Cliente Consumo Reale', items: [{ catalogId: a.productId, qty: a.qty, name: 'Portachiavi', desc: 'Portachiavi' }], total: 120, stage: 'backlog', status: 'backlog' });
}, { orderId: ORDER_ID, productId: PRODUCT_ID, qty: QTY });

/* ── routing reale + avvio della prima operazione ────────────────────────── */
const routing0 = await page.evaluate(async (id) => {
  await GestioneOrdini.openProductionPanel(id);
  await new Promise((r) => setTimeout(r, 250));
  const ordine = await IDB.get('orders', id);
  const routing = InglyOperazioni.leggi(ordine);
  return routing.map((o) => ({ id: o.id, tech: o.technology, status: o.status }));
}, ORDER_ID);
dico('il routing ha le due lavorazioni della distinta', routing0.length === 2, routing0);
const OP_3D = routing0[0]?.id;

const giacenzaIniziale = await page.evaluate(async (materialId) => {
  const mov = await IDB.getAll('inventory_ledger');
  return InglyInventoryLedger.ricostruisci(mov, `materials:${materialId}`, null).quantity;
}, MATERIAL_ID);
dico('la giacenza iniziale del materiale è quella acquistata (5000g)', giacenzaIniziale === 5000, giacenzaIniziale);

/* ── avvia la prima operazione (transizione di stato reale) ──────────────── */
await page.evaluate(async (id) => {
  const ordine = await IDB.get('orders', id);
  const routing = InglyOperazioni.leggi(ordine);
  const op = routing[0];
  const dopo = InglyOperazioni.cambiaStato(op, 'in_corso');
  if (dopo.ok) {
    const lista = (ordine.production && ordine.production.operations) || ordine.operations;
    const idx = lista.findIndex((o) => String(o.id) === String(op.id));
    lista[idx] = Object.assign({}, lista[idx], { status: 'in_corso' });
    await IDB.put('orders', ordine);
  }
}, ORDER_ID);

/* ── COMPLETAMENTO PARZIALE: 3 buoni + 1 scarto = 4 pezzi lavorati ───────── */
await page.fill('#pq-good-' + OP_3D, '3');
await page.fill('#pq-waste-' + OP_3D, '1');
await page.fill('#pq-reason-' + OP_3D, 'bordo imperfetto');
await page.click(`button[onclick*="_registraQualita('${ORDER_ID}','${OP_3D}')"]`);
await page.waitForTimeout(400);

const dopoParziale = await page.evaluate(async (a) => {
  const ordine = await IDB.get('orders', a.orderId);
  const routing = InglyOperazioni.leggi(ordine);
  const op = routing.find((o) => String(o.id) === String(a.opId));
  const mov = await IDB.getAll('inventory_ledger');
  const consumo = mov.filter((m) => m.referenceType === 'PRODUCTION' && String(m.referenceId) === String(a.orderId));
  const giacenza = InglyInventoryLedger.ricostruisci(mov, `materials:${a.materialId}`, null).quantity;
  return { actualCost: op.actualCost, actualTime: op.actualTime, consumoCount: consumo.length, consumoQty: consumo.reduce((s, m) => s + m.quantity, 0), giacenza };
}, { orderId: ORDER_ID, opId: OP_3D, materialId: MATERIAL_ID });
// 4 pezzi × 10g = 40g consumati
dico('un movimento di consumo reale viene scritto nel registro', dopoParziale.consumoCount === 1, dopoParziale);
dico('il consumo è per 4 pezzi (3 buoni + 1 scarto), non solo i buoni: lo scarto non sparisce', dopoParziale.consumoQty === 40, dopoParziale.consumoQty);
dico('la giacenza si riduce esattamente di quanto consumato (5000-40=4960)', dopoParziale.giacenza === 4960, dopoParziale.giacenza);
dico('l\'operazione ha un costo reale calcolato (materiale + lavorazione)', dopoParziale.actualCost > 0, dopoParziale.actualCost);

/* ── PROTEZIONE DOPPIO CONTEGGIO: la stessa registrazione due volte ──────── */
const primaDelDoppio = dopoParziale;
await page.click(`button[onclick*="_registraQualita('${ORDER_ID}','${OP_3D}')"]`);
await page.waitForTimeout(400);
const dopoDoppio = await page.evaluate(async (a) => {
  const ordine = await IDB.get('orders', a.orderId);
  const routing = InglyOperazioni.leggi(ordine);
  const op = routing.find((o) => String(o.id) === String(a.opId));
  const mov = await IDB.getAll('inventory_ledger');
  const consumo = mov.filter((m) => m.referenceType === 'PRODUCTION' && String(m.referenceId) === String(a.orderId));
  return { actualCost: op.actualCost, consumoCount: consumo.length, consumoQty: consumo.reduce((s, m) => s + m.quantity, 0) };
}, { orderId: ORDER_ID, opId: OP_3D });
dico('registrare due volte lo stesso totale non scrive un secondo movimento (idempotenza)', dopoDoppio.consumoCount === primaDelDoppio.consumoCount, dopoDoppio.consumoCount);
dico('e non consuma materiale una seconda volta', dopoDoppio.consumoQty === primaDelDoppio.consumoQty, dopoDoppio.consumoQty);
dico('né raddoppia il costo reale già accumulato', dopoDoppio.actualCost === primaDelDoppio.actualCost, [dopoDoppio.actualCost, primaDelDoppio.actualCost]);

/* ── verifica esplicita a livello di funzione: stessa chiamata due volte ── */
const chiamataDiretta = await page.evaluate(async (a) => {
  const ordine = await IDB.get('orders', a.orderId);
  const routing = InglyOperazioni.leggi(ordine);
  const op = routing.find((o) => String(o.id) === String(a.opId));
  const r1 = await InglyProductBOMStore.consumaDaOperazione(ordine, op, 4);
  const r2 = await InglyProductBOMStore.consumaDaOperazione(ordine, op, 4);
  return { r1: { consumato: r1.consumato, delta: r1.delta }, r2: { consumato: r2.consumato, delta: r2.delta } };
}, { orderId: ORDER_ID, opId: OP_3D });
dico('chiamare consumaDaOperazione due volte con lo stesso totale: la prima non consuma nulla (già fatto)', chiamataDiretta.r1.consumato === false && chiamataDiretta.r1.delta === 0);
dico('e la seconda nemmeno', chiamataDiretta.r2.consumato === false && chiamataDiretta.r2.delta === 0);

/* ── COMPLETAMENTO DEI RIMANENTI: 8 buoni + 2 scarti = 10 pezzi totali ───── */
await page.fill('#pq-good-' + OP_3D, '8');
await page.fill('#pq-waste-' + OP_3D, '2');
await page.click(`button[onclick*="_registraQualita('${ORDER_ID}','${OP_3D}')"]`);
await page.waitForTimeout(400);

const dopoCompleto = await page.evaluate(async (a) => {
  const ordine = await IDB.get('orders', a.orderId);
  const routing = InglyOperazioni.leggi(ordine);
  const op = routing.find((o) => String(o.id) === String(a.opId));
  const mov = await IDB.getAll('inventory_ledger');
  const consumo = mov.filter((m) => m.referenceType === 'PRODUCTION' && String(m.referenceId) === String(a.orderId));
  const giacenza = InglyInventoryLedger.ricostruisci(mov, `materials:${a.materialId}`, null).quantity;
  return { consumoCount: consumo.length, consumoQtyTotale: consumo.reduce((s, m) => s + m.quantity, 0), giacenza, actualCost: op.actualCost };
}, { orderId: ORDER_ID, opId: OP_3D, materialId: MATERIAL_ID });
// ora due movimenti: 4 pezzi + 6 pezzi = 10 pezzi × 10g = 100g totali
dico('un secondo movimento di consumo si aggiunge per i 6 pezzi rimanenti (totale 2 movimenti)', dopoCompleto.consumoCount === 2, dopoCompleto.consumoCount);
dico('il consumo totale è per tutti i 10 pezzi (100g), non ricalcolato sull\'intero due volte', dopoCompleto.consumoQtyTotale === 100, dopoCompleto.consumoQtyTotale);
dico('la giacenza finale riflette il consumo totale (5000-100=4900)', dopoCompleto.giacenza === 4900, dopoCompleto.giacenza);
dico('il costo reale dell\'operazione è cresciuto rispetto al parziale (non azzerato, non raddoppiato dal nulla)', dopoCompleto.actualCost > primaDelDoppio.actualCost);

/* ── il pannello ordine mostra il consumo reale ───────────────────────────── */
await page.evaluate(() => App.navigate('gestione_ordini'));
await page.waitForTimeout(2000);
const pannello = await page.evaluate(async (id) => {
  await GestioneOrdini._openDetail(id);
  await new Promise((r) => setTimeout(r, 1500));
  const n = document.getElementById('go-consuntivo');
  return { testo: n ? n.textContent : '' };
}, ORDER_ID);
dico('il pannello Preventivato·Reale·Scostamento mostra "Consumo reale registrato"', /Consumo reale registrato/.test(pannello.testo));
dico('nomina i 10 pezzi lavorati sull\'operazione 3D completata', /10 pezzi lavorati/.test(pannello.testo), pannello.testo.match(/\d+ pezzi lavorati/));

/* ── nessuna regressione: un ordine senza distinta non consuma nulla ─────── */
const ORDINE_NORMALE = 998102;
await page.evaluate(async (id) => {
  await IDB.put('orders', { id, clientName: 'Cliente Normale', technology: 'laser', total: 50, stage: 'backlog', status: 'backlog' });
}, ORDINE_NORMALE);
const normale = await page.evaluate(async (id) => {
  await GestioneOrdini.openProductionPanel(id);
  await new Promise((r) => setTimeout(r, 200));
  const ordine = await IDB.get('orders', id);
  const routing = InglyOperazioni.leggi(ordine);
  return routing[0]?.id;
}, ORDINE_NORMALE);
await page.fill('#pq-good-' + normale, '5');
await page.click(`button[onclick*="_registraQualita('${ORDINE_NORMALE}','${normale}')"]`);
await page.waitForTimeout(300);
const dopoNormale = await page.evaluate(async (id) => {
  const ordine = await IDB.get('orders', id);
  const routing = InglyOperazioni.leggi(ordine);
  return { good: routing[0]?.goodQuantity, hasConsumptionState: !!(ordine.production && ordine.production.materialConsumption) };
}, ORDINE_NORMALE);
dico('un ordine senza distinta registra ancora la qualità normalmente (nessuna regressione)', dopoNormale.good === 5);
dico('ma non genera nessuno stato di consumo materiale (non applicabile)', !dopoNormale.hasConsumptionState);

/* ── persistenza dopo un ricaricamento vero ──────────────────────────────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);
const dopoReload = await page.evaluate(async (a) => {
  const ordine = await IDB.get('orders', a.orderId);
  const routing = InglyOperazioni.leggi(ordine);
  const op = routing.find((o) => String(o.id) === String(a.opId));
  const mov = await IDB.getAll('inventory_ledger');
  const consumo = mov.filter((m) => m.referenceType === 'PRODUCTION' && String(m.referenceId) === String(a.orderId));
  const giacenza = InglyInventoryLedger.ricostruisci(mov, `materials:${a.materialId}`, null).quantity;
  const consumoReale = await InglyProductBOMStore.consumoRealeDaOrdine(ordine);
  return { consumoCount: consumo.length, giacenza, actualCost: op.actualCost, consumoRealeRegistrato: consumoReale && consumoReale.registrato, pezziProcessati: consumoReale && consumoReale.pezziProcessati };
}, { orderId: ORDER_ID, opId: OP_3D, materialId: MATERIAL_ID });
dico('dopo un ricaricamento vero i movimenti di consumo restano (2)', dopoReload.consumoCount === 2, dopoReload.consumoCount);
dico('la giacenza resta corretta', dopoReload.giacenza === 4900, dopoReload.giacenza);
dico('il costo reale dell\'operazione resta', dopoReload.actualCost === dopoCompleto.actualCost, [dopoReload.actualCost, dopoCompleto.actualCost]);
dico('consumoRealeDaOrdine resta calcolabile e coerente (10 pezzi processati)', dopoReload.consumoRealeRegistrato && dopoReload.pezziProcessati === 10, dopoReload.pezziProcessati);

/* ── esito ─────────────────────────────────────────────────────────────── */
const fallite = passi.filter((p) => !p.esito);
console.log('MULTI-TECH ACTUAL CONSUMPTION (2.2.0) →', JSON.stringify({ totale: passi.length, falliti: fallite.length, erroriJS: erroriJS.length }, null, 2));
passi.forEach((p) => console.log(`  ${p.esito ? '✅' : '❌'} ${p.passo}${p.dettaglio != null ? ' — ' + JSON.stringify(p.dettaglio) : ''}`));
if (erroriJS.length) console.log('ERRORI JS:', erroriJS);

await browser.close();
if (fallite.length || erroriJS.length) process.exit(1);
