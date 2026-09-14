#!/usr/bin/env node
/**
 * materiali-predefiniti.mjs — i predefiniti non tornano sopra il tuo magazzino.
 *
 * `Materials.seed()` tiene memoria di quali predefiniti ha già proposto, in
 * `ingly_materiali_proposti_v1`. La regola dichiarata nel modulo è che se un
 * materiale è stato proposto e adesso non c'è, non c'è **perché qualcuno l'ha
 * tolto**, e non si rimette.
 *
 * La memoria però poteva mancare del tutto, con il magazzino pieno. In quel
 * caso `seed()` trattava ogni predefinito come «mai proposto» e ne riversava
 * 172 sopra i materiali di chi lavora. Due casi veri lo producono:
 *
 *   · un'installazione più vecchia della memoria stessa;
 *   · un ripristino da backup in cui la marcatura non è arrivata — ed è la
 *     forma esatta del guasto visto in `import-export` (3 record importati,
 *     175 in archivio: 172 + 3).
 *
 * Questa suite non aspetta che l'intermittenza si ripresenti: costruisce la
 * condizione a mano — magazzino pieno, memoria cancellata — e ricarica.
 *
 *   node tests/qa/materiali-predefiniti.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const CHIAVE = 'ingly_materiali_proposti_v1';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
page.on('dialog', (d) => d.accept().catch(() => {}));

await page.addInitScript(() => {
  ['ingly_wizard_done_v2', 'ingly_tour_done_v1', '_wizard_done_v37', '_v37sidebar_done']
    .forEach((k) => localStorage.setItem(k, '1'));
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });
const stato = () => page.evaluate((K) => ({
  materiali: 0,
  _: 0,
}), CHIAVE);
const conta = () => page.evaluate((K) => Promise.resolve()
  .then(() => IDB.getAll('materials'))
  .then((m) => ({
    materiali: m.length,
    proposti: (() => { try { return (JSON.parse(localStorage.getItem(K) || 'null') || []).length; } catch (e) { return -1; } })(),
    nomi: m.slice(0, 3).map((x) => x.name),
  }))
  .catch(() => ({ materiali: -1, proposti: -1, nomi: [] })), CHIAVE);

/* ── FASE A · il primo avvio propone il corredo ─────────────────────────── */
const avvio = await conta();
dico('FASE A · al primo avvio il corredo predefinito arriva (' + avvio.materiali + ')', avvio.materiali > 10);
dico('FASE A2 · e resta memoria di averlo proposto (' + avvio.proposti + ')', avvio.proposti > 10);

/* ── FASE B · il magazzino di chi lavora ────────────────────────────────
   Si costruisce la condizione esatta del guasto: l'utente ha il suo
   magazzino, e la memoria dei predefiniti non c'è. È quello che resta dopo
   un ripristino in cui la marcatura non è arrivata. */
await page.evaluate(async (K) => {
  await IDB.clearStore('materials');
  for (const m of [
    { id: 930001, name: 'Mio materiale 1', unit: 'pz', costPer: 1 },
    { id: 930002, name: 'Mio materiale 2', unit: 'pz', costPer: 2 },
    { id: 930003, name: 'Mio materiale 3', unit: 'pz', costPer: 3 },
  ]) await IDB.put('materials', m);
  localStorage.removeItem(K);
  try { Object.keys(AppStore._cache || {}).forEach((x) => AppStore.invalidate(x)); } catch (e) {}
}, CHIAVE);
const preparato = await conta();
dico('FASE B · si parte da tre materiali e nessuna memoria ('
  + preparato.materiali + ' materiali, memoria ' + preparato.proposti + ')',
  preparato.materiali === 3 && preparato.proposti <= 0);

/* ── FASE C · il ricaricamento non deve riversarci sopra i predefiniti ──── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);
const dopo = await conta();
dico('FASE C · dopo il ricaricamento il magazzino è ancora il tuo ('
  + dopo.materiali + ', non ' + avvio.materiali + ')', dopo.materiali === 3);
dico('FASE C2 · e sono i materiali giusti (' + dopo.nomi.join(', ') + ')',
  dopo.nomi.every((n) => /^Mio materiale/.test(n)));
dico('FASE C3 · la memoria si è ricostruita, così non ricapita ('
  + dopo.proposti + ')', dopo.proposti > 10);

/* ── FASE D · ma un magazzino davvero vuoto riceve il corredo ───────────
   Il difetto opposto sarebbe un'installazione nuova che parte senza niente. */
await page.evaluate(async (K) => {
  await IDB.clearStore('materials');
  localStorage.removeItem(K);
  try { Object.keys(AppStore._cache || {}).forEach((x) => AppStore.invalidate(x)); } catch (e) {}
}, CHIAVE);
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);
const vuoto = await conta();
dico('FASE D · un magazzino vuoto senza memoria riceve il corredo (' + vuoto.materiali + ')',
  vuoto.materiali > 10);

console.log('\nMATERIALI PREDEFINITI — NON TORNANO SOPRA IL TUO MAGAZZINO\n');
console.log('  primo avvio      : ' + avvio.materiali + ' materiali');
console.log('  tuo magazzino    : ' + preparato.materiali + ' materiali, memoria cancellata');
console.log('  dopo il riavvio  : ' + dopo.materiali + ' materiali');
console.log('  archivio vuoto   : ' + vuoto.materiali + ' materiali\n');

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
console.log('\nil magazzino è la decisione di chi lavora ✔\n');
await browser.close();
