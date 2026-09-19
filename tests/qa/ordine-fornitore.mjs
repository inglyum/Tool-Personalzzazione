#!/usr/bin/env node
/**
 * ordine-fornitore.mjs — l'ordine d'acquisto reale, nella Gestione Fornitori
 * vera.
 *
 * Prima di questa release, il pulsante «🛒 Ordine» di ogni fornitore chiamava
 * `SupplierIntelligence`, che tiene i fornitori in un localStorage separato
 * da quello che questa lista mostra (IDB `suppliers`): un ordine registrato
 * su un fornitore visibile in lista poteva finire su un altro record, o su
 * nessuno. Le card «Ordini in Attesa» / «⚠️ In Ritardo» leggevano lo store
 * `supplier_orders`, dichiarato da anni e mai scritto da nessuno — sempre a
 * zero. Il tab «Confronta» chiamava `_renderConfronta`, mai definita — un
 * crash mai osservato solo perché nessun pulsante impostava mai quel tab.
 *
 * Qui si verifica il percorso vero: si crea un ordine da un fornitore reale,
 * si controlla che le KPI smettano di essere a zero, si registra un
 * ricevimento con un click vero e si controlla che la giacenza (registro di
 * magazzino) e le statistiche del fornitore siano quelle vere — non un
 * numero a mano — e che il confronto fornitori non vada in crash e non
 * inventi un punteggio per chi ha un solo ordine.
 *
 *   node tests/qa/ordine-fornitore.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(e.message));
page.on('dialog', (d) => d.accept().catch(() => {}));
await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

/* ── primo avvio reale: senza un account attivo, il "saas-gate" copre tutta
   la pagina e blocca ogni click reale sull'app sottostante (stesso percorso
   verificato in tests/qa/ciclo-account.mjs). ────────────────────────────── */
await page.evaluate(async () => {
  if (!document.getElementById('su-submit')) return;
  document.getElementById('su-lab').value = 'Laboratorio Test Procurement';
  document.getElementById('su-nome').value = 'Tester';
  document.getElementById('su-email').value = 'tester-procurement@prova.it';
  document.getElementById('su-pass').value = 'Laboratorio2026';
  document.getElementById('su-conf').value = 'Laboratorio2026';
  await window.InglyPrimoAvvio.invia();
});
await page.waitForTimeout(500);

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

const NOME = 'Fornitore Test Procurement';
const SUP_ID = 990001;

/* ── seme: un fornitore reale nello store che la lista mostra davvero ────── */
await page.evaluate(async (args) => {
  await IDB.put('suppliers', { id: args.id, name: args.nome, cat: 'materiali', materials: 'MDF 3mm', rating: 4 });
}, { id: SUP_ID, nome: NOME });

await page.evaluate(() => App.navigate('suppliers'));
await page.waitForTimeout(400);

async function leggiKpi() {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('#view-suppliers .kpi-card')];
    const val = (label) => {
      const card = cards.find((c) => c.querySelector('.kpi-label')?.textContent.trim() === label);
      return card ? card.querySelector('.kpi-value')?.textContent.trim() : null;
    };
    return { attesa: val('Ordini in Attesa'), ritardo: val('⚠️ In Ritardo') };
  });
}

const baseline = await leggiKpi();
dico('prima di qualunque ordine, la KPI «Ordini in Attesa» è a zero (store mai scritto)', baseline.attesa === '0', baseline.attesa);

/* ── si crea un ordine con un click vero sulla card del fornitore vero ────── */
const bottoneTrovato = await page.evaluate((nome) => {
  const btns = [...document.querySelectorAll('#view-suppliers button')].filter((b) => b.textContent.trim() === '🛒 Ordine');
  for (const b of btns) {
    const card = b.closest('div[style*="border-left"]');
    if (card && card.textContent.includes(nome)) { b.click(); return true; }
  }
  return false;
}, NOME);
dico('il pulsante «🛒 Ordine» del fornitore vero si trova e si clicca', bottoneTrovato);
await page.waitForTimeout(200);

await page.fill('#po-item', 'MDF 3mm 60x90');
await page.fill('#po-qty', '40');
await page.fill('#po-cost', '2.5');
await page.fill('#po-date', '2020-01-01'); // sempre passata: verifica "in ritardo"
await page.click('button:has-text("✅ Crea ordine")');
await page.waitForTimeout(300);

const dopoCreazione = await page.evaluate(async (supplierId) => {
  const ordini = (await InglyPurchaseOrderStore.tutti()).filter((o) => String(o.supplierId) === String(supplierId));
  return ordini;
}, SUP_ID);
dico('l\'ordine è stato scritto davvero in supplier_orders', dopoCreazione.length === 1);
dico('con lo stato "attesa" e la riga corretta', dopoCreazione[0]?.status === 'attesa' && dopoCreazione[0]?.righe[0]?.quantity === 40);
dico('e il fornitore giusto (non uno a caso di un altro store)', String(dopoCreazione[0]?.supplierId) === String(SUP_ID));

await page.evaluate(() => App.navigate('suppliers'));
await page.waitForTimeout(300);
const dopoKpi = await leggiKpi();
dico('la KPI «Ordini in Attesa» ora è reale, non più a zero', dopoKpi.attesa === '1', dopoKpi.attesa);
dico('la KPI «In Ritardo» rileva la data di consegna già passata', dopoKpi.ritardo === '1', dopoKpi.ritardo);

/* ── il registro ordini, prima uno stub («in arrivo»), ora una vista vera ── */
await page.click('button:has-text("📦 Ordini")');
await page.waitForTimeout(200);
const registro = await page.evaluate(() => document.getElementById('po-registry-modal')?.innerHTML || '');
dico('il registro ordini mostra l\'ordine appena creato', registro.includes(NOME) && registro.includes('MDF 3mm'));
dico('segnala il ritardo nel registro', /In ritardo/.test(registro));
dico('non è più lo stub "in arrivo"', !/in arrivo/.test(registro));

/* ── si riceve l'ordine con un click vero: la giacenza deve muoversi ──────── */
const cliccatoRicevi = await page.evaluate(() => {
  const b = [...document.querySelectorAll('#po-registry-modal button')].find((x) => x.textContent.trim() === '✅ Segna ricevuto');
  if (!b) return false;
  b.click();
  return true;
});
dico('il pulsante «✅ Segna ricevuto» del registro si trova e si clicca', cliccatoRicevi);
await page.waitForTimeout(400);

const dopoRicevimento = await page.evaluate(async (supplierId) => {
  const ordini = await InglyPurchaseOrderStore.tutti();
  const ordine = ordini.find((o) => String(o.supplierId) === String(supplierId));
  const movimenti = await IDB.getAll('inventory_ledger').catch(() => []);
  const movimento = movimenti.find((m) => m.referenceId === ordine.id);
  const fornitore = await IDB.get('suppliers', supplierId);
  return { statoOrdine: ordine.status, movimento, totalSpent: fornitore.totalSpent, orderCount: fornitore.orderCount };
}, SUP_ID);
dico('l\'ordine passa a "ricevuto"', dopoRicevimento.statoOrdine === 'ricevuto');
dico('nasce un movimento PURCHASE nel registro di magazzino — non un secondo modo di scrivere la giacenza', !!dopoRicevimento.movimento && dopoRicevimento.movimento.type === 'PURCHASE' && dopoRicevimento.movimento.quantity === 40);
dico('il movimento porta il fornitore giusto', String(dopoRicevimento.movimento?.supplierId) === String(SUP_ID));
dico('le statistiche del fornitore sono ricalcolate dagli ordini ricevuti (100€, 1 ordine) — non più sempre a zero', dopoRicevimento.totalSpent === 100 && dopoRicevimento.orderCount === 1);

await page.evaluate(() => document.getElementById('po-registry-modal')?.remove());
await page.evaluate(() => App.navigate('suppliers'));
await page.waitForTimeout(300);
const kpiDopoRicevimento = await leggiKpi();
dico('ricevuto l\'ordine, la KPI «Ordini in Attesa» torna a zero', kpiDopoRicevimento.attesa === '0', kpiDopoRicevimento.attesa);

/* ── confronto fornitori: mai un crash, mai un punteggio da un solo ordine ── */
const primaErroriPreConfronta = erroriJS.length;
await page.click('button:has-text("📊 Confronta")');
await page.waitForTimeout(300);
dico('aprire "Confronta" non crasha più (era chiamato e mai definito)', erroriJS.length === primaErroriPreConfronta);
const testoConfrontaUnOrdine = await page.evaluate(() => document.getElementById('view-suppliers')?.innerText || '');
dico('con un solo ordine ricevuto, il fornitore resta "dati insufficienti" — nessun punteggio inventato', testoConfrontaUnOrdine.includes('Dati insufficienti') || testoConfrontaUnOrdine.includes('dati insufficienti'));

/* ── un secondo ordine, puntuale: ora il fornitore è confrontabile davvero ── */
await page.evaluate(() => { SuppliersManager._tab = 'mylist'; App.navigate('suppliers'); });
await page.waitForTimeout(300);
await page.evaluate((id) => SuppliersManager._nuovoOrdine(id), SUP_ID);
await page.waitForTimeout(200);
await page.fill('#po-item', 'Acrilico 5mm');
await page.fill('#po-qty', '10');
await page.fill('#po-cost', '5');
await page.fill('#po-date', '2030-01-01'); // futura: consegna puntuale possibile
await page.click('button:has-text("✅ Crea ordine")');
await page.waitForTimeout(300);
await page.evaluate(async (supplierId) => {
  const ordini = (await InglyPurchaseOrderStore.tutti()).filter((o) => String(o.supplierId) === String(supplierId) && o.status === 'attesa');
  const ultimo = ordini[ordini.length - 1];
  await InglyPurchaseOrderStore.ricevi(ultimo.id, { righe: [{ itemId: ultimo.righe[0].itemId, quantity: 10 }] });
}, SUP_ID);

await page.evaluate(() => App.navigate('suppliers'));
await page.waitForTimeout(300);
await page.click('button:has-text("📊 Confronta")');
await page.waitForTimeout(300);
const testoConfrontaDueOrdini = await page.evaluate(() => document.getElementById('view-suppliers')?.innerText || '');
dico('con due ordini ricevuti, il fornitore mostra una puntualità reale, non più "dati insufficienti"', testoConfrontaDueOrdini.includes(NOME) && !/Dati insufficienti — nessun ordine/.test(testoConfrontaDueOrdini));

/* ── persistenza: gli ordini e le statistiche sopravvivono a un reload vero ── */
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(15000);
const dopoReload = await page.evaluate(async (supplierId) => {
  const ordini = (await InglyPurchaseOrderStore.tutti()).filter((o) => String(o.supplierId) === String(supplierId));
  const fornitore = await IDB.get('suppliers', supplierId);
  return { numeroOrdini: ordini.length, ricevuti: ordini.filter((o) => o.status === 'ricevuto').length, totalSpent: fornitore.totalSpent };
}, SUP_ID);
dico('i due ordini sopravvivono al ricaricamento', dopoReload.numeroOrdini === 2);
dico('entrambi ricevuti sopravvivono come tali', dopoReload.ricevuti === 2);
dico('le statistiche del fornitore pure (100 + 50 = 150€)', dopoReload.totalSpent === 150, dopoReload.totalSpent);

await browser.close();

const falliti = passi.filter((p) => !p.esito);
console.log('\nORDINE FORNITORE · dal suggerimento di riordino alla giacenza reale\n');
for (const p of passi) {
  console.log((p.esito ? '  ✔  ' : '  ✗  ') + p.passo + (p.dettaglio ? '  [' + p.dettaglio + ']' : ''));
}
console.log('\ncontrolli: ' + passi.length + ' · falliti: ' + falliti.length + ' · errori JavaScript: ' + erroriJS.length);
if (erroriJS.length) console.log('errori:', erroriJS);
if (falliti.length || erroriJS.length) {
  console.log('\nFALLITO');
  process.exit(1);
}
console.log('\nl\'ordine d\'acquisto è reale: KPI vere, giacenza vera, confronto vero ✔');
