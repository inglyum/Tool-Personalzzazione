#!/usr/bin/env node
/**
 * dashboard-qualita-attenzione.mjs — le non conformità aperte compaiono
 * nella sezione «Richiede attenzione» della dashboard.
 *
 * `InglyQualityNCR.riepilogo()` esisteva da tempo, testato a unità, ma
 * senza un consumatore fuori dal pannello Produzione del singolo ordine —
 * la dashboard non mostrava mai nessun segnale di qualità, come
 * documentato in `docs/QUALITY.md`: «collegarlo alla dashboard è
 * un'estensione dell'esistente, non un blocco — rimandato». Qui si
 * verifica quel collegamento (`InglyData.attention()`, nuovo gruppo
 * `quality`): una non conformità aperta compare nella card, con
 * l'ordine giusto; una chiusa non la fa più contare.
 *
 *   node tests/qa/dashboard-qualita-attenzione.mjs [file]
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
await page.waitForTimeout(13000);

await page.evaluate(async () => {
  if (!document.getElementById('su-submit')) return;
  document.getElementById('su-lab').value = 'Laboratorio Test Dashboard Qualita';
  document.getElementById('su-nome').value = 'Tester';
  document.getElementById('su-email').value = 'tester-dash-qualita@prova.it';
  document.getElementById('su-pass').value = 'Laboratorio2026';
  document.getElementById('su-conf').value = 'Laboratorio2026';
  await window.InglyPrimoAvvio.invia();
});
await page.waitForTimeout(500);

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

const ORDER_ID = 995101;
const NCR_APERTA = 'ncr-dash-1';
const NCR_CHIUSA = 'ncr-dash-2';

/* ── senza nessuna non conformità aperta, la dashboard non la mostra ─────── */
await page.evaluate(async (id) => {
  await IDB.put('orders', { id, clientName: 'Cliente Dashboard Qualità', technology: 'laser', total: 100, stage: 'backlog', status: 'backlog' });
}, ORDER_ID);
await page.evaluate(() => App.navigate('dashboard'));
await page.waitForTimeout(1200);
const prima = await page.evaluate(() => document.getElementById('ingly-operating-center')?.innerText || '');
dico('senza non conformità, la dashboard non mostra la card qualità', !prima.includes('Non conformità aperte'));

/* ── una non conformità aperta, collegata all'ordine, compare in dashboard ── */
await page.evaluate(async (a) => {
  await IDB.put('quality_ncr', {
    id: a.ncrId, orderId: String(a.orderId), operationId: 'op-1', technology: 'laser',
    createdAt: new Date().toISOString(), quantity: 3, reason: 'Bordo bruciato', disposition: null,
    status: 'aperta', closedAt: null, closedBy: null, resolutionNote: null, fonte: 'manuale',
  });
}, { ncrId: NCR_APERTA, orderId: ORDER_ID });
await page.evaluate(() => App.navigate('dashboard'));
await page.waitForTimeout(1200);
const dopo = await page.evaluate(() => document.getElementById('ingly-operating-center')?.innerText || '');
dico('con una non conformità aperta, la dashboard mostra la card «Non conformità aperte»', dopo.includes('Non conformità aperte'), dopo.slice(0, 400));
dico('la card nomina il motivo dichiarato', dopo.includes('Bordo bruciato'));
dico('la card nomina il cliente dell\'ordine collegato', dopo.includes('Cliente Dashboard Qualità'));
const contoUno = await page.evaluate(() => {
  const card = [...document.querySelectorAll('.att-card')].find((c) => c.textContent.includes('Non conformità aperte'));
  return card ? card.querySelector('.att-card__count')?.textContent.trim() : null;
});
dico('il contatore della card è 1, non un numero inventato', contoUno === '1', contoUno);

/* ── una seconda non conformità, già chiusa, non si somma alle aperte ────── */
await page.evaluate(async (a) => {
  await IDB.put('quality_ncr', {
    id: a.ncrId, orderId: String(a.orderId), operationId: 'op-2', technology: 'laser',
    createdAt: new Date().toISOString(), quantity: 1, reason: 'Sbavatura', disposition: 'rilavorazione',
    status: 'chiusa', closedAt: new Date().toISOString(), closedBy: 'test', resolutionNote: 'rifatto', fonte: 'manuale',
  });
}, { ncrId: NCR_CHIUSA, orderId: ORDER_ID });
await page.evaluate(() => App.navigate('dashboard'));
await page.waitForTimeout(1200);
const contoConChiusa = await page.evaluate(() => {
  const card = [...document.querySelectorAll('.att-card')].find((c) => c.textContent.includes('Non conformità aperte'));
  return card ? card.querySelector('.att-card__count')?.textContent.trim() : null;
});
dico('una non conformità chiusa non si somma alle aperte (resta 1, non 2)', contoConChiusa === '1', contoConChiusa);

/* ── il pulsante «Apri» della card è presente e collegato a una sezione reale ── */
const pulsanteApri = await page.evaluate(() => {
  const card = [...document.querySelectorAll('.att-card')].find((c) => c.textContent.includes('Non conformità aperte'));
  const b = card ? card.querySelector('button[data-nav]') : null;
  return b ? b.getAttribute('data-nav') : null;
});
dico('la card ha un pulsante «Apri» verso una sezione reale', !!pulsanteApri, pulsanteApri);

/* ── persistenza dopo un ricaricamento vero ──────────────────────────────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(13000);
await page.evaluate(() => App.navigate('dashboard'));
await page.waitForTimeout(1200);
const dopoReload = await page.evaluate(() => {
  const testo = document.getElementById('ingly-operating-center')?.innerText || '';
  const card = [...document.querySelectorAll('.att-card')].find((c) => c.textContent.includes('Non conformità aperte'));
  return { haCard: /Non conformità aperte/.test(testo), conteggio: card ? card.querySelector('.att-card__count')?.textContent.trim() : null };
});
dico('dopo un ricaricamento vero, la card resta e conta ancora 1 aperta', dopoReload.haCard && dopoReload.conteggio === '1', dopoReload);

/* ── esito ─────────────────────────────────────────────────────────────── */
const fallite = passi.filter((p) => !p.esito);
console.log('DASHBOARD · NON CONFORMITÀ APERTE IN "RICHIEDE ATTENZIONE" →', JSON.stringify({ totale: passi.length, falliti: fallite.length, erroriJS: erroriJS.length }, null, 2));
passi.forEach((p) => console.log(`  ${p.esito ? '✅' : '❌'} ${p.passo}${p.dettaglio != null ? ' — ' + JSON.stringify(p.dettaglio) : ''}`));
if (erroriJS.length) console.log('ERRORI JS:', erroriJS);

await browser.close();
if (fallite.length || erroriJS.length) process.exit(1);
