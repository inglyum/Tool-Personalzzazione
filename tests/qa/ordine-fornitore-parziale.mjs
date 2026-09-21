#!/usr/bin/env node
/**
 * ordine-fornitore-parziale.mjs — ricevimento parziale riga per riga, dal
 * registro ordini fornitore vero.
 *
 * Il motore (`InglyPurchaseOrder.ricevi`) e lo store lo supportavano già,
 * testato a unità (`tests/purchase-order.test.mjs`) — mancava solo la UI:
 * «✅ Segna ricevuto» riceveva sempre l'intero residuo di ogni riga, quindi
 * chi riceveva tre casse su cinque ordinate doveva forzare un «tutto
 * ricevuto» falso o aspettare le altre due prima di registrare qualcosa.
 * Qui si verifica il nuovo pulsante «✏️ Parziale»: un modulo con una
 * quantità per riga, precompilata al residuo, che accetta anche un numero
 * più piccolo — e lo stesso ordine, ricevuto in due volte, non deve mai
 * contare due volte quanto è già arrivato.
 *
 *   node tests/qa/ordine-fornitore-parziale.mjs [file]
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

await page.evaluate(async () => {
  if (!document.getElementById('su-submit')) return;
  document.getElementById('su-lab').value = 'Laboratorio Test Procurement Parziale';
  document.getElementById('su-nome').value = 'Tester';
  document.getElementById('su-email').value = 'tester-procurement-parziale@prova.it';
  document.getElementById('su-pass').value = 'Laboratorio2026';
  document.getElementById('su-conf').value = 'Laboratorio2026';
  await window.InglyPrimoAvvio.invia();
});
await page.waitForTimeout(500);

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

const SUP_ID = 990101;
const ORDER_ID = 'po-test-parziale-1';

/* ── seme: un fornitore vero e un ordine con DUE righe (la UI di creazione
   ne accetta una per invio, il motore no — si semina direttamente con
   InglyPurchaseOrderStore.crea, lo stesso punto di scrittura che usa la
   UI, non un IDB.put a mano) ─────────────────────────────────────────── */
const setup = await page.evaluate(async (a) => {
  await IDB.put('suppliers', { id: a.supId, name: 'Fornitore Due Righe', cat: 'materiali' });
  const r = await InglyPurchaseOrderStore.crea({
    id: a.orderId, supplierId: a.supId,
    righe: [
      { itemId: 'materials:1', itemName: 'MDF 3mm', quantity: 40, unitCost: 2, unit: 'pz' },
      { itemId: 'materials:2', itemName: 'Acrilico 5mm', quantity: 10, unitCost: 8, unit: 'pz' },
    ],
  });
  return { ok: r.ok, motivo: r.motivo };
}, { supId: SUP_ID, orderId: ORDER_ID });
dico('un ordine con due righe si crea (bypassando il form a una riga per volta)', setup.ok, setup.motivo);

await page.evaluate(() => App.navigate('suppliers'));
await page.waitForTimeout(300);
await page.click('button:has-text("📦 Ordini")');
await page.waitForTimeout(200);

/* ── si apre il modulo «✏️ Parziale» con un click vero ────────────────────── */
const aperto = await page.evaluate((id) => {
  const b = [...document.querySelectorAll('#po-registry-modal button')].find((x) => x.textContent.trim() === '✏️ Parziale');
  if (!b) return false;
  b.click();
  const box = document.getElementById('po-parziale-' + id);
  return !!box && box.style.display !== 'none';
}, ORDER_ID);
dico('il pulsante «✏️ Parziale» del registro si trova, si clicca e apre il modulo', aperto);

const precompilato = await page.evaluate((id) => {
  const i0 = document.getElementById('po-partial-qty-' + id + '-0');
  const i1 = document.getElementById('po-partial-qty-' + id + '-1');
  return { q0: i0 ? i0.value : null, q1: i1 ? i1.value : null };
}, ORDER_ID);
dico('ogni riga è precompilata al proprio residuo (40 e 10), non a un valore condiviso', precompilato.q0 === '40' && precompilato.q1 === '10', precompilato);

/* ── si riceve MENO del residuo su entrambe le righe (25 di 40, 4 di 10) ── */
await page.evaluate((id) => {
  document.getElementById('po-partial-qty-' + id + '-0').value = '25';
  document.getElementById('po-partial-qty-' + id + '-1').value = '4';
}, ORDER_ID);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('#po-registry-modal button')].find((x) => x.textContent.trim() === 'Conferma ricevimento');
  b && b.click();
});
await page.waitForTimeout(400);

const dopoPrimo = await page.evaluate(async (id) => {
  const ordine = await InglyPurchaseOrderStore.tutti().then((t) => t.find((o) => o.id === id));
  const movimenti = (await IDB.getAll('inventory_ledger').catch(() => [])).filter((m) => m.referenceId === id);
  return {
    status: ordine.status,
    ricevuto0: ordine.righe[0].received, ricevuto1: ordine.righe[1].received,
    numMovimenti: movimenti.length,
    quantitaMovimenti: movimenti.map((m) => m.quantity).sort((a, b) => a - b),
  };
}, ORDER_ID);
dico('dopo il primo parziale l\'ordine è "ricevuto_parziale", non "ricevuto"', dopoPrimo.status === 'ricevuto_parziale', dopoPrimo.status);
dico('ogni riga porta esattamente quanto dichiarato (25 e 4), non il residuo intero', dopoPrimo.ricevuto0 === 25 && dopoPrimo.ricevuto1 === 4, dopoPrimo);
dico('nascono due movimenti di magazzino, uno per riga, con le quantità giuste', dopoPrimo.numMovimenti === 2 && dopoPrimo.quantitaMovimenti[0] === 4 && dopoPrimo.quantitaMovimenti[1] === 25, dopoPrimo);

/* ── si riceve il resto: il modulo ora precompila il RESIDUO (15 e 6), non
   di nuovo il totale originale — altrimenti si conterebbe due volte.
   `_confermaRicevimentoParziale` ha già chiuso e riaperto il registro da
   sé (come fa `_riceviTuttoOrdine`): non va ri-cliccato «📦 Ordini», il
   modale è già in pagina. ─────────────────────────────────────────────── */
const precompilatoResiduo = await page.evaluate((id) => {
  const b = [...document.querySelectorAll('#po-registry-modal button')].find((x) => x.textContent.trim() === '✏️ Parziale');
  b && b.click();
  const i0 = document.getElementById('po-partial-qty-' + id + '-0');
  const i1 = document.getElementById('po-partial-qty-' + id + '-1');
  return { q0: i0 ? i0.value : null, q1: i1 ? i1.value : null };
}, ORDER_ID);
dico('riaperto il modulo, precompila il residuo rimasto (15 e 6), non il totale da capo', precompilatoResiduo.q0 === '15' && precompilatoResiduo.q1 === '6', precompilatoResiduo);

await page.evaluate(() => {
  const b = [...document.querySelectorAll('#po-registry-modal button')].find((x) => x.textContent.trim() === 'Conferma ricevimento');
  b && b.click();
});
await page.waitForTimeout(400);

const dopoSecondo = await page.evaluate(async (id) => {
  const ordine = await InglyPurchaseOrderStore.tutti().then((t) => t.find((o) => o.id === id));
  const movimenti = (await IDB.getAll('inventory_ledger').catch(() => [])).filter((m) => m.referenceId === id);
  return {
    status: ordine.status,
    ricevuto0: ordine.righe[0].received, ricevuto1: ordine.righe[1].received,
    numMovimenti: movimenti.length,
  };
}, ORDER_ID);
dico('dopo aver ricevuto il resto, l\'ordine risulta "ricevuto" per intero', dopoSecondo.status === 'ricevuto', dopoSecondo.status);
dico('il totale ricevuto per riga è quello ordinato (40 e 10), non di più', dopoSecondo.ricevuto0 === 40 && dopoSecondo.ricevuto1 === 10, dopoSecondo);
dico('un secondo movimento per riga si aggiunge al primo (4 in tutto), nessuno duplicato', dopoSecondo.numMovimenti === 4, dopoSecondo);

/* ── nessuna regressione: «✅ Segna ricevuto» (tutto) continua a funzionare
   su un ordine diverso, a una sola riga ─────────────────────────────────── */
const ORDER_TOTALE = 'po-test-parziale-totale';
await page.evaluate(async (a) => {
  await InglyPurchaseOrderStore.crea({ id: a.orderId, supplierId: a.supId, righe: [{ itemId: 'materials:3', itemName: 'Vernice', quantity: 5, unitCost: 3, unit: 'pz' }] });
}, { supId: SUP_ID, orderId: ORDER_TOTALE });
/* Il registro è già aperto (riaperto dopo il ricevimento precedente) ma con
   il contenuto di prima del nuovo ordine appena creato: si chiude e si
   riapre dal motore, non dal pulsante — che il modale già in pagina
   intercetterebbe. */
await page.evaluate(() => { document.getElementById('po-registry-modal')?.remove(); SuppliersManager.openOrders(); });
await page.waitForTimeout(200);
const cliccatoTotale = await page.evaluate(() => {
  const b = [...document.querySelectorAll('#po-registry-modal button')].find((x) => x.textContent.trim() === '✅ Segna ricevuto');
  if (!b) return false;
  b.click();
  return true;
});
await page.waitForTimeout(300);
const dopoTotale = await page.evaluate(async (id) => {
  const ordine = await InglyPurchaseOrderStore.tutti().then((t) => t.find((o) => o.id === id));
  return ordine ? ordine.status : null;
}, ORDER_TOTALE);
dico('il pulsante «✅ Segna ricevuto» (ricevimento totale) continua a funzionare senza regressioni', cliccatoTotale && dopoTotale === 'ricevuto', dopoTotale);

/* ── persistenza dopo un ricaricamento vero ──────────────────────────────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);
const dopoReload = await page.evaluate(async (id) => {
  const ordine = await InglyPurchaseOrderStore.tutti().then((t) => t.find((o) => o.id === id));
  return ordine ? { status: ordine.status, r0: ordine.righe[0].received, r1: ordine.righe[1].received } : null;
}, ORDER_ID);
dico('dopo un ricaricamento vero, l\'ordine ricevuto in due volte resta coerente', dopoReload && dopoReload.status === 'ricevuto' && dopoReload.r0 === 40 && dopoReload.r1 === 10, dopoReload);

/* ── esito ─────────────────────────────────────────────────────────────── */
const fallite = passi.filter((p) => !p.esito);
console.log('ORDINE FORNITORE · RICEVIMENTO PARZIALE PER RIGA →', JSON.stringify({ totale: passi.length, falliti: fallite.length, erroriJS: erroriJS.length }, null, 2));
passi.forEach((p) => console.log(`  ${p.esito ? '✅' : '❌'} ${p.passo}${p.dettaglio != null ? ' — ' + JSON.stringify(p.dettaglio) : ''}`));
if (erroriJS.length) console.log('ERRORI JS:', erroriJS);

await browser.close();
if (fallite.length || erroriJS.length) process.exit(1);
