#!/usr/bin/env node
/**
 * statistiche-cliente-omonimi.mjs — il pannello «Statistiche Cliente» non
 * mischia due omonimi.
 *
 * `Clients.openModal(id)`, aprendo la scheda di modifica, calcola acquisti,
 * spesa totale e scontrino medio filtrando le vendite con
 * `s.clientId===id||(cl&&s.clientName===cl.name)`: il ripiego sul nome si
 * SOMMAVA al filtro per id invece di sostituirlo solo quando l'id manca, e
 * una vendita di un cliente omonimo (clientId diverso, stesso nome) entrava
 * comunque nel conteggio — stessa classe di difetto di CRM-05b, su una
 * superficie diversa dal profilo cliente completo (già coperto da
 * profilo-cliente-per-id.mjs).
 *
 *   node tests/qa/statistiche-cliente-omonimi.mjs [file]
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

const NOME = 'Giulia Bianchi';
const ID_A = 992001; // il cliente di cui apriamo la scheda
const ID_B = 992002; // l'omonimo — stesso nome, id diverso

const esito = await page.evaluate(async (args) => {
  await IDB.put('clients', { id: args.idA, name: args.nome, email: 'a@bianchi.it' });
  await IDB.put('clients', { id: args.idB, name: args.nome, email: 'b@bianchi.it' });

  const sales = (await IDB.getAll('sales').catch(() => [])).filter((s) => !String(s.id).startsWith('stat992'));
  sales.push({ id: 'stat992-a', clientId: args.idA, clientName: args.nome, desc: 'Vendita di A', amount: 100, date: '2026-01-10' });
  sales.push({ id: 'stat992-b', clientId: args.idB, clientName: args.nome, desc: 'Vendita di B (omonimo)', amount: 900, date: '2026-01-11' });
  for (const s of sales.filter((x) => String(x.id).startsWith('stat992'))) await IDB.put('sales', s);

  await Clients.openModal(args.idA);
  await new Promise((r) => setTimeout(r, 500));
  const testo = document.getElementById('client-stats-panel')?.innerText || '';
  return { testo };
}, { idA: ID_A, idB: ID_B, nome: NOME });

dico('il pannello mostra un solo acquisto (quello del cliente aperto)', /^1$/m.test(esito.testo) || esito.testo.includes('1\nAcquisti') || /\b1\b/.test(esito.testo));
dico('il totale speso è quello del solo cliente A (100€), non 100+900', esito.testo.includes('100') && !esito.testo.includes('1.000') && !esito.testo.includes('1000'));
dico('non mostra la vendita dell\'omonimo B nel dettaglio recente', !esito.testo.includes('Vendita di B'));
dico('mostra la propria vendita', esito.testo.includes('Vendita di A'));

await browser.close();

console.log('\nSTATISTICHE CLIENTE · due omonimi, mai lo stesso conto\n');
const falliti = passi.filter((p) => !p.esito);
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo + (p.dettaglio ? ' — ' + p.dettaglio : ''));
}
console.log('\ncontrolli: ' + passi.length + ' · falliti: ' + falliti.length + ' · errori JavaScript: ' + erroriJS.length);
if (falliti.length || erroriJS.length) {
  if (erroriJS.length) console.log('errori:', erroriJS);
  console.log('\nFALLITO');
  process.exit(1);
}
console.log('\ndue omonimi, mai lo stesso conto ✔');
