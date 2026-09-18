#!/usr/bin/env node
/**
 * profilo-cliente-per-id.mjs — due clienti con lo stesso nome, mai lo stesso
 * profilo.
 *
 * `ClientProfile.open` (patch 092, «Profilo cliente completo») risolveva il
 * cliente per NOME e poi filtrava preventivi e ordini per lo STESSO nome
 * (`q.client===c.name`). Un laboratorio con "Mario Rossi" padre e "Mario
 * Rossi" figlio — due clienti diversi, nomi identici — vedeva il fatturato,
 * gli ordini, i preventivi e le note interne dell'uno nel profilo dell'altro.
 * CRM-04 aveva già dato a ogni cliente un id stabile proprio per questo:
 * questo collaudo verifica che il profilo lo usi davvero.
 *
 *   node tests/qa/profilo-cliente-per-id.mjs
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
await page.waitForTimeout(11000);

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

/* ── seme: due clienti omonimi con id stabili, e uno storico legacy ──────── */
const seme = await page.evaluate(async () => {
  const U = window.InglyClienti;
  if (!U) return { errore: 'InglyClienti assente' };

  const a = await U.salva({ name: 'Mario Rossi', email: 'padre@rossi-test.it' });
  const b = await U.salva({ name: 'Mario Rossi', email: 'figlio@rossi-test.it' });
  const c = await U.salva({ name: 'Cliente Storico Unico', email: 'storico@prova.it' });

  const quotes = JSON.parse(localStorage.getItem('lb2b_quotes_v1') || '[]');
  quotes.push({ id: 'q-test-a', clientId: a.id, client: a.name, product: 'Targa laser PADRE', total: 111, date: '2026-01-01', status: 'confirmed' });
  quotes.push({ id: 'q-test-b', clientId: b.id, client: b.name, product: 'Vaso 3D FIGLIO', total: 222, date: '2026-01-02', status: 'draft' });
  /* Preventivo anteriore a CRM-04: nessun clientId, solo il nome. Deve
     restare visibile — non è il difetto da correggere, è lo storico vero di
     chi usa il prodotto da prima che l'id esistesse. */
  quotes.push({ id: 'q-test-legacy', client: c.name, product: 'Incisione LEGACY', total: 50, date: '2025-06-01', status: 'paid' });
  localStorage.setItem('lb2b_quotes_v1', JSON.stringify(quotes));

  const orders = JSON.parse(localStorage.getItem('ingly_orders_pro_v1') || '[]');
  orders.push({ id: 'o-test-a', clientId: a.id, client: a.name, description: 'Ordine PADRE', total: 300, created: '2026-01-03', status: 'delivered' });
  orders.push({ id: 'o-test-b', clientId: b.id, client: b.name, description: 'Ordine FIGLIO', total: 700, created: '2026-01-04', status: 'confirmed' });
  localStorage.setItem('ingly_orders_pro_v1', JSON.stringify(orders));

  return { a: a.id, b: b.id, c: c.id };
});
if (seme.errore) { console.error(seme.errore); await browser.close(); process.exit(1); }

/* ── apre il profilo del PADRE, verifica che non veda niente del FIGLIO ──── */
const [popupA] = await Promise.all([
  context.waitForEvent('page'),
  page.evaluate((id) => { window.ClientProfile.open(id); }, seme.a),
]);
await popupA.waitForLoadState('domcontentloaded');
const testoA = await popupA.evaluate(() => document.body.textContent);
dico('il profilo del padre mostra il proprio ordine', testoA.includes('Ordine PADRE'));
dico('il profilo del padre mostra il proprio preventivo', testoA.includes('Targa laser PADRE'));
dico('il profilo del padre NON mostra l\'ordine del figlio', !testoA.includes('Ordine FIGLIO'));
dico('il profilo del padre NON mostra il preventivo del figlio', !testoA.includes('Vaso 3D FIGLIO'));
dico('il fatturato mostrato è quello del solo padre (300), non la somma dei due', testoA.includes('€300'), testoA.match(/€[\d.,]+/g));
await popupA.close();

/* ── apre il profilo del FIGLIO, verifica il simmetrico ──────────────────── */
const [popupB] = await Promise.all([
  context.waitForEvent('page'),
  page.evaluate((id) => { window.ClientProfile.open(id); }, seme.b),
]);
await popupB.waitForLoadState('domcontentloaded');
const testoB = await popupB.evaluate(() => document.body.textContent);
dico('il profilo del figlio mostra il proprio ordine', testoB.includes('Ordine FIGLIO'));
dico('il profilo del figlio mostra il proprio preventivo', testoB.includes('Vaso 3D FIGLIO'));
dico('il profilo del figlio NON mostra l\'ordine del padre', !testoB.includes('Ordine PADRE'));
dico('il profilo del figlio NON mostra il preventivo del padre', !testoB.includes('Targa laser PADRE'));
dico('il fatturato mostrato è quello del solo figlio (700)', testoB.includes('€700'));
await popupB.close();

/* ── lo storico precedente a CRM-04 (senza clientId) non sparisce ────────── */
const [popupC] = await Promise.all([
  context.waitForEvent('page'),
  page.evaluate((id) => { window.ClientProfile.open(id); }, seme.c),
]);
await popupC.waitForLoadState('domcontentloaded');
const testoC = await popupC.evaluate(() => document.body.textContent);
dico('un preventivo scritto prima di CRM-04 (senza clientId) resta visibile per il suo cliente', testoC.includes('Incisione LEGACY'));
await popupC.close();

/* ── pulizia ───────────────────────────────────────────────────────────── */
await page.evaluate(async (ids) => {
  const U = window.InglyClienti;
  for (const id of ids) await U.elimina(id, { forza: true }).catch(() => {});
  const filtra = (chiave, campo) => {
    try {
      const d = JSON.parse(localStorage.getItem(chiave) || '[]');
      localStorage.setItem(chiave, JSON.stringify(d.filter((x) => !String(x.id || '').startsWith('q-test') && !String(x.id || '').startsWith('o-test'))));
    } catch (e) {}
  };
  filtra('lb2b_quotes_v1');
  filtra('ingly_orders_pro_v1');
}, [seme.a, seme.b, seme.c]);

await browser.close();

const falliti = passi.filter((p) => !p.esito);
console.log('\nPROFILO CLIENTE · id, non nome\n');
for (const p of passi) {
  console.log((p.esito ? '  ✔  ' : '  ✗  ') + p.passo + (p.dettaglio ? '  [' + JSON.stringify(p.dettaglio) + ']' : ''));
}
console.log('\ncontrolli: ' + passi.length + ' · falliti: ' + falliti.length + ' · errori JavaScript: ' + erroriJS.length);
if (erroriJS.length) console.log('errori:', erroriJS);
if (falliti.length || erroriJS.length) {
  console.log('\nFALLITO');
  process.exit(1);
}
console.log('\ndue clienti omonimi, mai lo stesso profilo ✔');
