#!/usr/bin/env node
/**
 * crm-export-selezione.mjs — CRM-18: le esportazioni (VCF, CSV) rispettano
 * la selezione, non esportano sempre l'elenco intero.
 *
 * Il motore e i pulsanti esistevano già (`CRMSmart._exportSelected`/
 * `._exportAll`, patch 081) ma senza nessuna copertura in browser: zero
 * occorrenze in `tests/`, verificato con `grep`, prima di questo test — la
 * stessa classe di difetto già trovata più volte in questo progetto
 * (funzione dichiarata, mai verificata dal click vero). Qui si clicca
 * davvero: si selezionano due contatti su tre, si esporta, e si legge il
 * file scaricato — non la funzione chiamata direttamente.
 *
 *   node tests/qa/crm-export-selezione.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await context.newPage();
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
page.on('dialog', (d) => d.accept().catch(() => {}));

await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_crm_v1', JSON.stringify([
    { name: 'Contatto Alfa', phone: '3330001111', email: 'alfa@prova.it', notes: '' },
    { name: 'Contatto Beta', phone: '3330002222', email: 'beta@prova.it', notes: '' },
    { name: 'Contatto Gamma', phone: '3330003333', email: 'gamma@prova.it', notes: '' },
  ]));
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(13000);

await page.evaluate(async () => {
  if (!document.getElementById('su-submit')) return;
  document.getElementById('su-lab').value = 'Laboratorio Test CRM Export';
  document.getElementById('su-nome').value = 'Tester';
  document.getElementById('su-email').value = 'tester-crm-export@prova.it';
  document.getElementById('su-pass').value = 'Laboratorio2026';
  document.getElementById('su-conf').value = 'Laboratorio2026';
  await window.InglyPrimoAvvio.invia();
});
await page.waitForTimeout(500);

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

for (const sez of ['clienti', 'crm', 'crm_smart']) {
  try { await page.evaluate((s) => App.navigate(s), sez); } catch (e) { /* si prova il successivo */ }
  await page.waitForTimeout(500);
  if (await page.$('#crm-tbody')) break;
}
await page.evaluate(() => CRMSmart.render());
await page.waitForTimeout(700);

const idDei = await page.evaluate(() => [...document.querySelectorAll('#crm-tbody tr[id^="crm-row-"]')].map((r) => r.id.slice('crm-row-'.length)));
dico('i tre contatti seminati compaiono in tabella', idDei.length === 3, idDei);

/* ── entra in modalità selezione con un click vero ────────────────────────── */
await page.click('#crm-sel-toggle');
await page.waitForTimeout(150);

/* ── seleziona Alfa e Beta, non Gamma, con click veri sulle checkbox — la
   barra con «Esporta CSV/VCF» compare solo quando la selezione non è vuota
   (CRMSmart._updateSelBar: display 'flex' se n>0, 'none' altrimenti), non
   al click su «☐ Seleziona» ─────────────────────────────────────────────── */
await page.click('#crm-chk-' + idDei[0]);
await page.click('#crm-chk-' + idDei[1]);
await page.waitForTimeout(150);
const contatore = await page.evaluate(() => document.getElementById('crm-sel-count')?.textContent || '');
dico('il contatore selezione dice 2, non 3 né 0', /^2\s/.test(contatore), contatore);
const barraVisibile = await page.evaluate(() => getComputedStyle(document.getElementById('crm-sel-bar')).display !== 'none');
dico('con due contatti selezionati, la barra di esportazione selezione è visibile', barraVisibile);

/* ── esporta CSV della sola selezione: un download vero, non la funzione
   chiamata a mano ────────────────────────────────────────────────────────── */
const [downloadSel] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.click('#crm-sel-bar button:has-text("📊 Esporta CSV")'),
]);
const pathSel = await downloadSel.path();
const fs = await import('node:fs');
const csvSel = pathSel ? fs.readFileSync(pathSel, 'utf8') : '';
dico('il CSV della selezione nomina Alfa', csvSel.includes('Contatto Alfa'), csvSel.slice(0, 200));
dico('il CSV della selezione nomina Beta', csvSel.includes('Contatto Beta'));
dico('il CSV della selezione NON nomina Gamma (non è nella selezione)', !csvSel.includes('Contatto Gamma'), csvSel);

/* ── «Esporta tutto CSV» ignora la selezione e prende tutti e tre ────────── */
const [downloadAll] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.click('button:has-text("📊 Esporta tutto CSV")'),
]);
const pathAll = await downloadAll.path();
const csvAll = pathAll ? fs.readFileSync(pathAll, 'utf8') : '';
dico('«Esporta tutto» nomina tutti e tre, non solo i selezionati', csvAll.includes('Contatto Alfa') && csvAll.includes('Contatto Beta') && csvAll.includes('Contatto Gamma'), csvAll);

/* ── VCF della sola selezione: stesso principio, formato diverso ─────────── */
const [downloadVcf] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.click('#crm-sel-bar button:has-text("📱 Esporta VCF")'),
]);
const pathVcf = await downloadVcf.path();
const vcf = pathVcf ? fs.readFileSync(pathVcf, 'utf8') : '';
dico('il VCF della selezione è un vCard valido (BEGIN/END:VCARD)', /BEGIN:VCARD/.test(vcf) && /END:VCARD/.test(vcf));
dico('il VCF della selezione nomina Alfa e Beta, non Gamma', /FN:Contatto Alfa/.test(vcf) && /FN:Contatto Beta/.test(vcf) && !/FN:Contatto Gamma/.test(vcf), vcf);

/* ── deselezionando le due checkbox (non il pulsante «Deseleziona», che fa
   un render() completo e ripartirebbe da uno stato di pagina diverso), la
   barra torna a nascondersi da sola: la selezione vuota non ha un modo per
   restare visibile con un pulsante «Esporta» cliccabile ──────────────────── */
await page.click('#crm-chk-' + idDei[0]);
await page.click('#crm-chk-' + idDei[1]);
await page.waitForTimeout(150);
const barraSparita = await page.evaluate(() => getComputedStyle(document.getElementById('crm-sel-bar')).display === 'none');
dico('svuotata la selezione, la barra di esportazione selezione sparisce (nessun pulsante «esporta niente» resta cliccabile)', barraSparita);

/* ── il ramo difensivo di _exportSelected con selezione vuota (irraggiungibile
   dalla UI proprio perché la barra sparisce, ma presente nel codice) non
   scarica comunque niente se invocato direttamente ──────────────────────── */
let scaricatoSenzaSelezione = false;
page.once('download', () => { scaricatoSenzaSelezione = true; });
await page.evaluate(() => CRMSmart._exportSelected('csv'));
await page.waitForTimeout(500);
dico('con selezione vuota, _exportSelected non scarica niente (ramo difensivo verificato)', !scaricatoSenzaSelezione);

/* ── esito ─────────────────────────────────────────────────────────────── */
const fallite = passi.filter((p) => !p.esito);
console.log('CRM · ESPORTAZIONE RISPETTA LA SELEZIONE (CRM-18) →', JSON.stringify({ totale: passi.length, falliti: fallite.length, erroriJS: erroriJS.length }, null, 2));
passi.forEach((p) => console.log(`  ${p.esito ? '✅' : '❌'} ${p.passo}${p.dettaglio != null ? ' — ' + JSON.stringify(p.dettaglio) : ''}`));
if (erroriJS.length) console.log('ERRORI JS:', erroriJS);

await browser.close();
if (fallite.length || erroriJS.length) process.exit(1);
