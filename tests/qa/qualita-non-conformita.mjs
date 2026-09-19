#!/usr/bin/env node
/**
 * qualita-non-conformita.mjs — uno scarto diventa una decisione, nel
 * pannello produzione vero.
 *
 * `InglyOperazioni` contava già buoni/scarti/rifacimenti per operazione, ma
 * nessuna schermata mostrava il routing di un ordine (solo un badge «2/3»
 * in lista) e non esisteva un modo per registrare quei numeri, né per
 * decidere cosa fare di un pezzo non conforme. Qui si verifica il percorso
 * vero: si apre il Pannello Produzione di un ordine reale, si registra uno
 * scarto con un click vero, si controlla che nasca una non conformità
 * (mai senza un motivo dichiarato), e che chiuderla con una disposizione
 * aggiorni il registro — con persistenza dopo un ricaricamento vero.
 *
 *   node tests/qa/qualita-non-conformita.mjs [file]
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

const ORDER_ID = 993001;

await page.evaluate(async (id) => {
  await IDB.put('orders', { id, clientName: 'Officina Test Qualità', technology: 'laser', total: 200, name: 'Serie targhe' });
}, ORDER_ID);

/* ── apre il pannello produzione reale: il routing si vede per la prima volta ── */
const primaApertura = await page.evaluate(async (id) => {
  await GestioneOrdini.openProductionPanel(id);
  await new Promise((r) => setTimeout(r, 200));
  return document.getElementById('pp-qualita')?.innerHTML || '';
}, ORDER_ID);
dico('il pannello produzione mostra la sezione Qualità', primaApertura.includes('Qualità'));
dico('mostra l\'operazione dedotta dalla tecnologia dell\'ordine (laser)', /laser/i.test(primaApertura));
dico('non mostra ancora nessuna non conformità', !primaApertura.includes('Non conformità'));

/* ── si registra uno scarto con un click vero sul form dell'operazione ────── */
const opId = await page.evaluate(async (id) => {
  const ordine = await IDB.get('orders', id);
  const routing = InglyOperazioni.leggi(ordine);
  return routing[0]?.id;
}, ORDER_ID);
dico('il routing ha davvero un\'operazione con un id', !!opId, opId);

await page.fill('#pq-good-' + opId, '18');
await page.fill('#pq-waste-' + opId, '2');
await page.fill('#pq-reason-' + opId, 'bruciatura bordo');
await page.click(`button[onclick*="_registraQualita('${ORDER_ID}','${opId}')"]`);
await page.waitForTimeout(400);

const dopoRegistrazione = await page.evaluate(async (args) => {
  const ordine = await IDB.get('orders', args.id);
  const op = (ordine.operations || []).find((o) => String(o.id) === String(args.opId));
  const ncrs = await InglyQualityNCRStore.perOrdine(args.id);
  return { op, ncrs, pannello: document.getElementById('pp-qualita')?.innerHTML || '' };
}, { id: ORDER_ID, opId });

dico('la quantità buona è stata scritta sull\'operazione vera (non un log a parte)', dopoRegistrazione.op?.goodQuantity === 18);
dico('lo scarto pure (2)', dopoRegistrazione.op?.wasteQuantity === 2);
dico('nasce una non conformità reale — non un contatore, una decisione da prendere', dopoRegistrazione.ncrs.length === 1);
dico('la non conformità porta il motivo dichiarato', dopoRegistrazione.ncrs[0]?.reason === 'bruciatura bordo');
dico('nasce aperta', dopoRegistrazione.ncrs[0]?.status === 'aperta');
dico('il pannello (riaperto da solo dopo il salvataggio) la mostra', dopoRegistrazione.pannello.includes('Non conformità') && dopoRegistrazione.pannello.includes('bruciatura bordo'));

/* ── senza un motivo, uno scarto NON genera una non conformità inventata ─── */
const senzaMotivo = await page.evaluate(async (id) => {
  const before = (await InglyQualityNCRStore.tutte()).length;
  const p = InglyQualityNCR.daOperazione(InglyOperazioni.normalizza({ id: 'op-x', wasteQuantity: 5 }), { orderId: id });
  return { proponibile: p && p.proponibile, before };
}, ORDER_ID);
dico('un\'operazione con scarto ma senza motivo non produce una proposta di non conformità', senzaMotivo.proponibile === false);

/* ── si chiude la non conformità con un click vero, scegliendo la disposizione ── */
const ncrId = dopoRegistrazione.ncrs[0]?.id;
await page.selectOption('#ncr-disp-' + ncrId, 'rilavorazione');
await page.click(`button[onclick*="_chiudiNCR('${ORDER_ID}','${ncrId}')"]`);
await page.waitForTimeout(400);

const dopoChiusura = await page.evaluate(async (id) => {
  const tutte = await InglyQualityNCRStore.tutte();
  return tutte.find((n) => n.id === id);
}, ncrId);
dico('la non conformità è chiusa', dopoChiusura?.status === 'chiusa');
dico('con la disposizione scelta (rilavorazione, non scarto)', dopoChiusura?.disposition === 'rilavorazione');
dico('e una data di chiusura', !!dopoChiusura?.closedAt);

/* ── persistenza: routing, qualità e non conformità sopravvivono a un reload vero ── */
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(15000);
const dopoReload = await page.evaluate(async (args) => {
  const ordine = await IDB.get('orders', args.id);
  const op = (ordine.operations || []).find((o) => String(o.id) === String(args.opId));
  const ncr = (await InglyQualityNCRStore.tutte()).find((n) => n.id === args.ncrId);
  return { goodQuantity: op?.goodQuantity, ncrStatus: ncr?.status, ncrDisposition: ncr?.disposition };
}, { id: ORDER_ID, opId, ncrId });
dico('la qualità registrata sopravvive al ricaricamento', dopoReload.goodQuantity === 18);
dico('la non conformità chiusa pure, con la sua disposizione', dopoReload.ncrStatus === 'chiusa' && dopoReload.ncrDisposition === 'rilavorazione');

await browser.close();

const falliti = passi.filter((p) => !p.esito);
console.log('\nQUALITÀ · uno scarto diventa una decisione\n');
for (const p of passi) {
  console.log((p.esito ? '  ✔  ' : '  ✘  ') + p.passo + (p.dettaglio ? '  [' + p.dettaglio + ']' : ''));
}
console.log('\ncontrolli: ' + passi.length + ' · falliti: ' + falliti.length + ' · errori JavaScript: ' + erroriJS.length);
if (erroriJS.length) console.log('errori:', erroriJS);
if (falliti.length || erroriJS.length) {
  console.log('\nFALLITO');
  process.exit(1);
}
console.log('\nuno scarto non sparisce dai conti: diventa una decisione tracciata ✔');
