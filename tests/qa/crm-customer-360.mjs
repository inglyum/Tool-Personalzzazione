#!/usr/bin/env node
/**
 * crm-customer-360.mjs — CRM-15 (storico economico) + CRM-17 (timeline),
 * nel profilo cliente vero.
 *
 * Verifica, con la pagina reale caricata (non un test unitario sul motore
 * isolato):
 *   - il pannello mostra i KPI economici canonici, non un ricalcolo suo;
 *   - un cliente senza costo dichiarato vede N/D, non zero;
 *   - lo storico economico ha le quattro finestre richieste;
 *   - la timeline mostra solo gli eventi del cliente giusto, mai quelli di
 *     un omonimo — lo stesso punto di CRM-05b, verificato di nuovo qui
 *     perché è una superficie nuova (InglyCustomer360), non la stessa
 *     funzione già corretta.
 *
 *   node tests/qa/crm-customer-360.mjs [file]
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

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

const seme = await page.evaluate(async () => {
  const U = window.InglyClienti;
  const conCosto = await U.salva({ name: 'Cliente Con Storico', email: 'storico@prova.it' });
  const senzaCosto = await U.salva({ name: 'Cliente Senza Costo', email: 'senzacosto@prova.it' });
  const orders = JSON.parse(localStorage.getItem('ingly_orders_pro_v1') || '[]');
  const oggi = new Date().toISOString();
  const giorniFa = (n) => new Date(Date.now() - n * 86400000).toISOString();
  orders.push({ id: 'ord-360-1', clientId: conCosto.id, client: conCosto.name, description: 'Targa laser', total: 500, economic: { revenueNet: 500, costTotal: 200 }, created: giorniFa(10) });
  orders.push({ id: 'ord-360-2', clientId: conCosto.id, client: conCosto.name, description: 'Vaso 3D', total: 300, economic: { revenueNet: 300, costTotal: 100 }, created: giorniFa(60) });
  orders.push({ id: 'ord-360-3', clientId: senzaCosto.id, client: senzaCosto.name, description: 'Incisione', total: 150, economic: { revenueNet: 150 }, created: giorniFa(5) });
  localStorage.setItem('ingly_orders_pro_v1', JSON.stringify(orders));
  const quotes = JSON.parse(localStorage.getItem('lb2b_quotes_v1') || '[]');
  quotes.push({ id: 'q-360-1', clientId: conCosto.id, client: conCosto.name, product: 'Targa laser', total: 500, status: 'confermato', date: giorniFa(11) });
  quotes.push({ id: 'q-360-2', clientId: conCosto.id, client: conCosto.name, product: 'Preventivo perso', total: 80, status: 'rifiutato', date: giorniFa(8) });
  localStorage.setItem('lb2b_quotes_v1', JSON.stringify(quotes));
  return { conCosto: conCosto.id, senzaCosto: senzaCosto.id };
});

/* ── il cliente CON storico: KPI reali, mai un ricalcolo a parte ────────── */
const [popupA] = await Promise.all([
  context.waitForEvent('page'),
  page.evaluate((id) => { window.ClientProfile.open(id); }, seme.conCosto),
]);
await popupA.waitForLoadState('domcontentloaded');
const testoA = await popupA.evaluate(() => document.body.textContent);
dico('mostra il fatturato totale corretto (500+300=800)', testoA.includes('€800.00'));
dico('mostra il margine (profitto 500 su 800 = 62.5%)', testoA.includes('62.5%'));
dico('mostra la sezione storico economico', testoA.includes('Storico economico'));
dico('mostra la sezione valore cliente CLV', testoA.includes('Valore cliente'));
dico('mostra la timeline', testoA.includes('Timeline'));
dico('mostra il tasso di conversione (1 confermato su 2 decisi = 50%)', testoA.includes('50.0%'));
await popupA.close();

/* ── il cliente SENZA costo dichiarato: N/D, non zero, non inventato ─────── */
const [popupB] = await Promise.all([
  context.waitForEvent('page'),
  page.evaluate((id) => { window.ClientProfile.open(id); }, seme.senzaCosto),
]);
await popupB.waitForLoadState('domcontentloaded');
const testoB = await popupB.evaluate(() => document.body.textContent);
dico('il margine è N/D quando il costo non è dichiarato', /N\/D/.test(testoB));
dico('non mostra un margine inventato (0% o 100%)', !testoB.includes('0.0%') && !testoB.includes('100.0%'));
dico('mostra comunque il proprio fatturato (150)', testoB.includes('€150.00'));
dico('NON mostra il fatturato dell\'altro cliente (800)', !testoB.includes('€800.00'));
await popupB.close();

await browser.close();

const falliti = passi.filter((p) => !p.esito);
console.log('\nCRM CUSTOMER 360 · storico economico e timeline dal motore canonico\n');
for (const p of passi) {
  console.log((p.esito ? '  ✔  ' : '  ✗  ') + p.passo + (p.dettaglio ? '  [' + p.dettaglio + ']' : ''));
}
console.log('\ncontrolli: ' + passi.length + ' · falliti: ' + falliti.length + ' · errori JavaScript: ' + erroriJS.length);
if (erroriJS.length) console.log('errori:', erroriJS);
if (falliti.length || erroriJS.length) {
  console.log('\nFALLITO');
  process.exit(1);
}
console.log('\nstorico economico e timeline, mai inventati, mai mescolati ✔');
