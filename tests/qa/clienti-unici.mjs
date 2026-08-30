#!/usr/bin/env node
/**
 * clienti-unici.mjs — la rubrica e l'archivio vedono gli stessi clienti.
 *
 * Il difetto misurato prima della correzione, con questo stesso metodo:
 * scrivendo un cliente su IndexedDB e un altro su `ingly_crm_v1`,
 * `CRMSmart._load()` restituiva solo il secondo e `IDB.getAll('clients')` solo
 * il primo. Due liste disgiunte — e siccome ordini, preventivi e vendite
 * riferiscono l'archivio IndexedDB, un cliente creato dalla rubrica non
 * compariva mai nel menu di un preventivo.
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(e.message));
page.on('dialog', (d) => d.accept());
await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(11000);

const esito = await page.evaluate(async () => {
  const out = { passi: [], errori: [] };
  const dico = (k, v) => out.passi.push({ passo: k, esito: !!v });
  const U = window.InglyClienti;
  if (!U) { out.errori.push('InglyClienti assente'); return out; }
  if (typeof IDB === 'undefined') { out.errori.push('IDB assente'); return out; }
  dico('il modulo dei clienti unificati è nel bundle', !!U);

  const A = 870001, B = 870002;
  const pulisci = async () => {
    for (const id of [A, B]) await IDB.del('clients', id).catch(() => {});
    try {
      const d = JSON.parse(localStorage.getItem('ingly_crm_v1') || '[]');
      localStorage.setItem('ingly_crm_v1', JSON.stringify(d.filter((c) => c && c.id !== A && c.id !== B)));
    } catch (e) {}
  };
  await pulisci();

  /* Il caso esatto che era rotto. */
  await IDB.put('clients', { id: A, name: 'Nato in archivio', email: 'a@prova.it' });
  const d = JSON.parse(localStorage.getItem('ingly_crm_v1') || '[]');
  d.push({ id: B, name: 'Nato in rubrica', email: 'b@prova.it' });
  localStorage.setItem('ingly_crm_v1', JSON.stringify(d));

  await U.carica();
  await new Promise((r) => setTimeout(r, 300));

  const nomi = U.elenco().map((c) => c.name);
  dico('la lista unica vede il cliente nato in archivio', nomi.includes('Nato in archivio'));
  dico('e anche quello nato in rubrica', nomi.includes('Nato in rubrica'));

  /* E la rubrica vera, quella che l'utente guarda. */
  if (typeof CRMSmart !== 'undefined' && typeof CRMSmart._load === 'function') {
    const visti = (CRMSmart._load() || []).map((c) => c.name);
    dico('la rubrica mostra entrambi',
      visti.includes('Nato in archivio') && visti.includes('Nato in rubrica'));
  }

  /* Il percorso che era rotto per davvero: un cliente creato nella rubrica
     deve diventare selezionabile in un preventivo, cioè finire in IndexedDB. */
  await U.migra();
  await new Promise((r) => setTimeout(r, 400));
  const inArchivio = await IDB.get('clients', B).catch(() => null);
  dico('un cliente creato nella rubrica arriva nell\'archivio che i preventivi leggono', !!inArchivio);
  dico('e non ha perso il nome', !!inArchivio && inArchivio.name === 'Nato in rubrica');

  /* Salvare passa dallo scrittore unico e mantiene entrambe le parti. */
  const nuovo = await U.salva({ name: 'Salvato dal modulo', email: 'c@prova.it' });
  const inIdb = await IDB.get('clients', nuovo.id).catch(() => null);
  const inLs = JSON.parse(localStorage.getItem('ingly_crm_v1') || '[]').some((c) => c && c.id === nuovo.id);
  dico('salvare scrive il canonico', !!inIdb);
  dico('e mantiene lo specchio della rubrica', inLs);
  /* Si elimina dallo scrittore unico: cancellare solo dall'archivio lascia il
     cliente nello specchio, ed è il difetto che questo collaudo ha trovato. */
  await U.elimina(nuovo.id, { forza: true });

  /* Nessun campo di servizio finisce nei dati salvati. */
  const salvati = await IDB.getAll('clients').catch(() => []);
  dico('i campi di servizio dell\'unione non finiscono nell\'archivio',
    salvati.every((c) => !c || (c._fonti === undefined && c._conflitti === undefined)));

  /* Rieseguire la migrazione non duplica. */
  const prima = (await IDB.getAll('clients').catch(() => [])).length;
  await U.migra();
  const dopo = (await IDB.getAll('clients').catch(() => [])).length;
  dico(`rieseguire la migrazione non duplica (${prima} → ${dopo})`, prima === dopo);

  await pulisci();
  return out;
});

console.log('\nCLIENTI — rubrica e archivio vedono la stessa lista\n');
const problemi = [];
for (const p of esito.passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
esito.errori.forEach((e) => problemi.push(e));
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));
console.log('\nerrori JavaScript: ' + erroriJS.length);
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nuna lista sola ✔\n');
await browser.close();
