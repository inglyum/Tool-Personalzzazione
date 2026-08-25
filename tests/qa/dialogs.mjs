#!/usr/bin/env node
/**
 * dialogs.mjs — alert/confirm/prompt migrati.
 *
 * Non basta che appaia un dialogo bello: deve fare la stessa cosa di prima.
 * Quindi si verifica il caso che conta davvero — annullare NON deve cancellare —
 * su dati veri seminati negli store.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { SEED, seedScript } from './seed.mjs';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const outDir = 'tests/__screenshots__/dialogs';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error' && !/net::/.test(m.text())) errors.push(m.text().slice(0, 200)); });

const native = [];

await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
});

await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(6000);
await page.evaluate(seedScript(SEED));
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(8000);

/* Il conteggio delle finestre native parte dopo l'avvio: durante il reload
   l'unico dialogo è il `beforeunload`, e intercettarlo annullerebbe la
   navigazione invece di misurare qualcosa. */
page.on('dialog', async (d) => {
  native.push(d.type() + ': ' + d.message().slice(0, 60));
  await d.dismiss();
});

/* Le grandi sovrapposizioni fisse (login, wizard) coprirebbero gli screenshot. */
await page.evaluate(() => {
  [...document.querySelectorAll('body > div')].forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' && el.getBoundingClientRect().width > window.innerWidth * 0.7) el.remove();
  });
});

const out = {};

/* ── 0. Le notifiche di scadenza non si impilano più ──────────────────────
   Erano fino a sei schede identiche sopra la topbar: lo stesso promemoria
   mostrato dalla creazione, dal timer e dal riavvio. */
out.promemoria = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('[id^="reminder-toast-"]')];
  const testi = cards.map((c) => c.textContent.replace(/\s+/g, ' ').trim().slice(0, 40));
  return { schede: cards.length, duplicati: testi.length - new Set(testi).size };
});
await page.screenshot({ path: path.join(outDir, '00-promemoria.png'), clip: { x: 900, y: 0, width: 540, height: 500 } });

// ── 1. alert() non apre più una finestra del browser ────────────────────────
out.alertBreve = await page.evaluate(async () => {
  alert('Inserisci un nome!');
  await new Promise((r) => setTimeout(r, 300));
  const toasts = [...document.querySelectorAll('#toast-container .toast, .ds-toast')];
  return { toast: toasts.some((t) => /Inserisci un nome/.test(t.textContent)), quanti: toasts.length };
});

// Un messaggio lungo è un contenuto: dialogo, non toast che sparisce.
out.alertLungo = await page.evaluate(async () => {
  alert('Riepilogo backup\n\nSono stati scaricati 4 file.\nCrea una cartella e mettili dentro, poi conservala '
    + 'in un secondo dispositivo perché un backup su una sola macchina non è un backup.');
  await new Promise((r) => setTimeout(r, 400));
  const d = document.querySelector('.dlg__pre');
  return { dialogo: !!d, righeConservate: !!d && d.textContent.includes('\n') };
});
await page.screenshot({ path: path.join(outDir, '01-alert-lungo.png') });
await page.evaluate(() => document.querySelector('[data-ds-action]')?.click());
await page.waitForTimeout(300);

// ── 2. askConfirm: annullare NON cancella ───────────────────────────────────
const idProdotto = SEED.catalog[0].id;

out.annullaNonCancella = await page.evaluate(async (id) => {
  const prima = (await IDB.getAll('catalog')).length;
  Catalog.del(id);                                  // non si attende: apre il dialogo
  await new Promise((r) => setTimeout(r, 400));
  const overlay = document.querySelector('.modal-overlay.is-open');
  const testo = overlay ? overlay.textContent : '';
  // "Annulla" è la prima azione del dialogo di conferma.
  overlay?.querySelector('[data-ds-action="0"]')?.click();
  await new Promise((r) => setTimeout(r, 500));
  const dopo = (await IDB.getAll('catalog')).length;
  return { dialogoMostrato: !!overlay, chiedeConferma: /Eliminare questo prodotto/.test(testo), prima, dopo };
}, idProdotto);

// ── 3. askConfirm: confermare cancella davvero ──────────────────────────────
out.confermaCancella = await page.evaluate(async (id) => {
  const prima = (await IDB.getAll('catalog')).length;
  Catalog.del(id);
  await new Promise((r) => setTimeout(r, 400));
  const overlay = document.querySelector('.modal-overlay.is-open');
  overlay?.querySelector('[data-ds-action="1"]')?.click();
  await new Promise((r) => setTimeout(r, 700));
  const dopo = (await IDB.getAll('catalog')).length;
  const resta = (await IDB.getAll('catalog')).some((p) => p.id === id);
  return { prima, dopo, eliminato: !resta };
}, idProdotto);

// ── 4. askForm: quattro prompt sono diventati un modulo solo ────────────────
out.moduloVoceOrdine = await page.evaluate(async () => {
  const ordine = (await IDB.getAll('orders'))[0];
  if (!ordine) return { saltato: 'nessun ordine' };
  window.OrderFlow._addItemToOrder(ordine.id);
  await new Promise((r) => setTimeout(r, 400));
  const d = document.querySelector('.modal-overlay.is-open');
  if (!d) return { modulo: false };
  const campi = [...d.querySelectorAll('[data-af]')].map((i) => i.getAttribute('data-af'));
  return { modulo: true, campi, unaSolaFinestra: document.querySelectorAll('.modal-overlay.is-open').length === 1 };
});
await page.screenshot({ path: path.join(outDir, '02-modulo-voce.png') });

out.finestreNative = native;
out.erroriJS = errors;

console.log(JSON.stringify(out, null, 2));
await browser.close();

const ok = out.alertBreve.toast && out.alertLungo.dialogo
  && out.annullaNonCancella.dialogoMostrato
  && out.annullaNonCancella.prima === out.annullaNonCancella.dopo
  && out.confermaCancella.eliminato
  && native.length === 0
  && out.promemoria.duplicati === 0
  && out.promemoria.schede <= 4;
process.exit(ok ? 0 : 1);
