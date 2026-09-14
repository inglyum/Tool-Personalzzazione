#!/usr/bin/env node
/**
 * cancellazione-recuperabile.mjs — cancellare non deve essere l'unica
 * operazione senza rete di sicurezza.
 *
 * Nel codice ci sono 56 punti che cancellano un record, e nessuno faceva prima
 * uno snapshot: una riga sbagliata in un elenco e il cliente spariva senza
 * lasciare traccia. Lo snapshot ora lo fa `IDB.del`, quindi vale per tutti e
 * 56 senza toccarne nessuno.
 *
 * La suite verifica anche il contrario: le cache e i log NON vengono
 * versionati, perché conservarne le copie farebbe crescere il database senza
 * rendere recuperabile niente.
 *
 *   node tests/qa/cancellazione-recuperabile.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
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

const esito = await page.evaluate(async () => {
  const versioniDi = async (store, id) => (await window.IDB.getAll('versions'))
    .filter((v) => v.store === store && v.recId === String(id));

  /* Un cliente che si cancella. */
  await window.IDB.put('clients', { id: 960001, name: 'Cliente Da Recuperare', email: 'x@y.z' });
  const primaC = (await versioniDi('clients', 960001)).length;
  await window.IDB.del('clients', 960001);
  const dopoC = await versioniDi('clients', 960001);
  const sparito = !(await window.IDB.get('clients', 960001));

  /* Una voce di cache, che non si versiona. */
  let cacheVersioni = null;
  try {
    await window.IDB.put('kpi_cache', { id: 960002, v: 1 });
    await window.IDB.del('kpi_cache', 960002);
    cacheVersioni = (await versioniDi('kpi_cache', 960002)).length;
  } catch (e) { cacheVersioni = 'non-disponibile'; }

  /* Una vendita, per confermare che vale su più archivi. */
  await window.IDB.put('sales', { id: 960003, amount: 150, clientName: 'Rossi' });
  await window.IDB.del('sales', 960003);
  const vendite = await versioniDi('sales', 960003);

  return {
    primaC, dopoC: dopoC.length,
    recuperato: dopoC.length ? dopoC[dopoC.length - 1].snapshot : null,
    sparito, cacheVersioni, vendite: vendite.length,
  };
});

dico('prima della cancellazione il cliente non aveva versioni', esito.primaC === 0);
dico('dopo la cancellazione ne ha una (' + esito.dopoC + ')', esito.dopoC === 1);
dico('il cliente è davvero sparito dal suo archivio', esito.sparito === true);
dico('ma la copia conserva il nome: "' + (esito.recuperato && esito.recuperato.name) + '"',
  esito.recuperato && esito.recuperato.name === 'Cliente Da Recuperare');
dico('anche l\'email, cioè il record intero', esito.recuperato && esito.recuperato.email === 'x@y.z');
dico('vale anche per le vendite (' + esito.vendite + ')', esito.vendite === 1);
dico('le cache NON vengono versionate (' + esito.cacheVersioni + ')',
  esito.cacheVersioni === 0 || esito.cacheVersioni === 'non-disponibile');

console.log('\nCANCELLAZIONE RECUPERABILE\n');
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
console.log('\nquello che si cancella si può ancora ritrovare ✔\n');
await browser.close();
