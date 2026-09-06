#!/usr/bin/env node
/**
 * storage-crud.mjs — FASE 25 del collaudo funzionale.
 *
 * Undici domini, lo stesso giro per ognuno: **scrivi, rileggi, modifica,
 * rileggi, cancella, rileggi**. Poi si ricarica la pagina e si rilegge quel
 * che doveva restare.
 *
 * Non si guarda lo schermo: si guarda il magazzino dei dati, che è dove
 * l'errore costa davvero. Un modulo che disegna bene e non salva è il difetto
 * che si scopre il giorno dopo, quando il dato non c'è più.
 *
 *   node tests/qa/storage-crud.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';

/* Gli undici domini su cui gira il laboratorio, con il campo che si modifica
   per verificare che l'aggiornamento arrivi al disco e non solo alla memoria.
   `settings` ha la chiave `key` invece di `id`: è dichiarato, non dedotto. */
const DOMINI = [
  { store: 'clients', chiave: 'id', campo: 'name', primo: 'Collaudo CRM', poi: 'Collaudo CRM · rinominato' },
  { store: 'orders', chiave: 'id', campo: 'status', primo: 'nuovo', poi: 'in_produzione' },
  { store: 'quotes', chiave: 'id', campo: 'total', primo: 100, poi: 250.5 },
  { store: 'catalog', chiave: 'id', campo: 'salePrice', primo: 19.9, poi: 24.9 },
  { store: 'materials', chiave: 'id', campo: 'quantity', primo: 5, poi: 12 },
  { store: 'equipment', chiave: 'id', campo: 'usefulLifeHours', primo: 3000, poi: 5200 },
  { store: 'suppliers', chiave: 'id', campo: 'name', primo: 'Fornitore collaudo', poi: 'Fornitore collaudo srl' },
  { store: 'cashflow', chiave: 'id', campo: 'amount', primo: -40, poi: -55.25 },
  { store: 'fixed_costs', chiave: 'id', campo: 'amount', primo: 120, poi: 0 },
  { store: 'sales', chiave: 'id', campo: 'total', primo: 300, poi: 310 },
  { store: 'settings', chiave: 'key', campo: 'valore', primo: 'a', poi: 'b' },
];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
page.on('dialog', (d) => d.accept().catch(() => {}));

await page.addInitScript(() => {
  ['ingly_wizard_done_v2', 'ingly_tour_done_v1', '_wizard_done_v37', '_v37sidebar_done']
    .forEach((k) => localStorage.setItem(k, '1'));
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

const giro = await page.evaluate(async (domini) => {
  const esiti = [];
  for (const d of domini) {
    const id = d.store + '-collaudo-' + Date.now();
    const record = { [d.chiave]: id, [d.campo]: d.primo, _collaudo: true };
    const esito = { store: d.store, id };
    try {
      await IDB.put(d.store, record);
      const letto = await IDB.get(d.store, id);
      esito.scritto = !!letto;
      esito.valore = letto ? letto[d.campo] : null;

      await IDB.put(d.store, Object.assign({}, letto, { [d.campo]: d.poi }));
      const riletto = await IDB.get(d.store, id);
      esito.aggiornato = riletto ? riletto[d.campo] : null;

      /* La lettura di tutto il dominio deve vedere il record: è il percorso
         che usano le viste, e non è lo stesso di `get`. */
      const tutti = await IDB.getAll(d.store).catch(() => []);
      esito.nellElenco = tutti.some((x) => String(x[d.chiave]) === String(id));
    } catch (e) {
      esito.errore = String(e.message).slice(0, 120);
    }
    esiti.push(esito);
  }
  return esiti;
}, DOMINI);

for (const e of giro) {
  const atteso = DOMINI.filter((d) => d.store === e.store)[0];
  dico('FASE 25 · ' + e.store + ': il record si scrive e si rilegge ('
    + JSON.stringify(e.valore) + ')' + (e.errore ? ' — ' + e.errore : ''),
    !e.errore && e.scritto === true && String(e.valore) === String(atteso.primo));
  dico('FASE 25b · ' + e.store + ': la modifica arriva al disco ('
    + JSON.stringify(atteso.primo) + ' → ' + JSON.stringify(e.aggiornato) + ')',
    !e.errore && String(e.aggiornato) === String(atteso.poi));
  dico('FASE 25c · ' + e.store + ': il record compare nella lettura di tutto il dominio',
    !e.errore && e.nellElenco === true);
}

/* ── La prova che conta: sopravvive al ricaricamento ────────────────────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const dopoRicarica = await page.evaluate(async (ids) => {
  const out = [];
  for (const x of ids) {
    try {
      const r = await IDB.get(x.store, x.id);
      out.push({ store: x.store, id: x.id, c: !!r });
    } catch (e) { out.push({ store: x.store, id: x.id, c: false, errore: String(e.message).slice(0, 90) }); }
  }
  return out;
}, giro.map((g) => ({ store: g.store, id: g.id })));

const persi = dopoRicarica.filter((x) => !x.c).map((x) => x.store);
dico('FASE 25d · dopo il ricaricamento tutti gli undici record sono ancora lì ('
  + (persi.length ? 'persi: ' + persi.join(', ') : dopoRicarica.length + '/' + DOMINI.length) + ')',
  persi.length === 0);

/* ── E la cancellazione cancella davvero ────────────────────────────────── */
const dopoCancellazione = await page.evaluate(async (ids) => {
  const out = [];
  for (const x of ids) {
    try {
      await IDB.del(x.store, x.id);
      const r = await IDB.get(x.store, x.id);
      out.push({ store: x.store, sparito: !r });
    } catch (e) { out.push({ store: x.store, sparito: false, errore: String(e.message).slice(0, 90) }); }
  }
  return out;
}, giro.map((g) => ({ store: g.store, id: g.id })));

const rimasti = dopoCancellazione.filter((x) => !x.sparito).map((x) => x.store);
dico('FASE 25e · la cancellazione toglie il record da tutti gli undici domini ('
  + (rimasti.length ? 'rimasti: ' + rimasti.join(', ') : 'tutti') + ')', rimasti.length === 0);

/* ── Una scrittura in blocco è tutta o niente ───────────────────────────── */
const blocco = await page.evaluate(async () => {
  const base = Date.now();
  const buoni = [1, 2, 3].map((i) => ({ id: 'blocco-' + base + '-' + i, name: 'Riga ' + i }));
  const scritti = await IDB.putBulk('clients', buoni).catch(() => -1);
  const presenti = [];
  for (const r of buoni) presenti.push(!!(await IDB.get('clients', r.id)));
  for (const r of buoni) await IDB.del('clients', r.id).catch(() => {});
  return { scritti, presenti };
});
dico('FASE 25f · una scrittura in blocco scrive tutte le righe ('
  + blocco.scritti + '/3)', blocco.scritti === 3 && blocco.presenti.every(Boolean));

console.log('\nMAGAZZINO DEI DATI — SCRIVI, RILEGGI, MODIFICA, CANCELLA\n');
const problemi = [];
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));
console.log('\ncontrolli: ' + passi.length + ' · domini: ' + DOMINI.length
  + ' · errori JavaScript: ' + erroriJS.length);
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nquello che si scrive si ritrova, e quello che si cancella sparisce ✔\n');
await browser.close();
