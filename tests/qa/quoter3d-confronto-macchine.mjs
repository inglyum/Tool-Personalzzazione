#!/usr/bin/env node
/**
 * quoter3d-confronto-macchine.mjs — §21 del mandato: la stessa stampa,
 * confrontata su una seconda macchina.
 *
 * `InglyMachineCost.confronta()` esisteva già — confrontava macchine per
 * costo orario — ma nessuna vista dello Smart Quoter 3D lo chiamava mai.
 * Non era la domanda del mandato comunque: "Printer A vs B ... output
 * cost/time/price/profit/margin" chiede il confronto di un LAVORO intero
 * (costo, prezzo, profitto, margine), non solo la tariffa oraria della
 * macchina. Qui si verifica il percorso vero: si registrano due macchine
 * reali, si sceglie la prima come macchina attiva, la seconda come
 * confronto, e si legge la tabella che ne esce — non il motore interrogato
 * a parte.
 *
 *   node tests/qa/quoter3d-confronto-macchine.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(e.message));
page.on('dialog', (d) => d.accept());
await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* Due macchine reali, deliberatamente diverse: una più cara con manutenzione
   più bassa, l'altra più economica ma con manutenzione più alta — così il
   confronto non è ovvio a occhio e serve davvero il calcolo. */
await page.evaluate(async () => {
  await IDB.put('equipment', {
    id: 88801, name: 'Bambu X1C', brand: 'Bambu Lab', model: 'X1 Carbon', tech: 'print3d',
    purchasePrice: 1200, usefulLifeHours: 6000, residualValue: 100, averagePowerW: 350, maintenancePerHour: 0.08,
  });
  await IDB.put('equipment', {
    id: 88802, name: 'Ender 3', brand: 'Creality', model: 'Ender-3', tech: 'print3d',
    purchasePrice: 200, usefulLifeHours: 3000, residualValue: 0, averagePowerW: 220, maintenancePerHour: 0.15,
  });
  App.navigate('print3d');
  await new Promise((s) => setTimeout(s, 3000));
  const sv = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  sv('p3d-g', 290); sv('p3d-h', 9.95); sv('p3d-mkg', 24); sv('p3d-mu', 1000);
  sv('p3d-fail', 7); sv('p3d-lr', 18);
  Print3DQuoter.pickMach('parco:88801');
  await new Promise((s) => setTimeout(s, 800));
});

const senzaConfronto = await page.evaluate(() => (document.getElementById('p3d-confronto-esito') || {}).innerHTML || '');
dico('senza confronto scelto, la tabella non compare', senzaConfronto.trim() === '');

const selettore = await page.evaluate(() => {
  const s = document.getElementById('p3d-confronto');
  return s ? [...s.options].map((o) => o.textContent) : null;
});
dico('il selettore di confronto esiste', Array.isArray(selettore));
dico('le due macchine registrate sono fra le opzioni', selettore
  && selettore.some((t) => /Bambu Lab X1 Carbon/.test(t)) && selettore.some((t) => /Creality Ender-3/.test(t)));

await page.selectOption('#p3d-confronto', 'parco:88802');
await page.waitForTimeout(800);

const esito = await page.evaluate(() => {
  const html = (document.getElementById('p3d-confronto-esito') || {}).innerHTML || '';
  const leggi = (s) => parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
  const righe = [...html.matchAll(/<td[^>]*>([^<]+)<\/td>/g)].map((m) => m[1]);
  return { html, righe, leggi: righe.map(leggi) };
});
dico('la tabella di confronto compare dopo aver scelto la macchina B', esito.html.length > 100);
dico('i nomi di entrambe le macchine sono nella tabella (non «Nessun confronto»)',
  /Bambu Lab X1 Carbon/.test(esito.html) && /Creality Ender-3/.test(esito.html) && !/Nessun confronto/.test(esito.html));
dico('la tabella elenca Costo, Prezzo, Profitto, Margine',
  /Costo/.test(esito.html) && /Prezzo/.test(esito.html) && /Profitto/.test(esito.html) && /Margine/.test(esito.html));

/* Il conto vero: le due macchine devono dare numeri diversi, non lo stesso
   prezzo duplicato in due colonne — sarebbe il segno che R2 non si è
   ricalcolato davvero. */
const numeriDiversi = await page.evaluate(() => {
  const html = (document.getElementById('p3d-confronto-esito') || {}).innerHTML || '';
  const celle = [...html.matchAll(/font-weight:700">([^<]+)</g)].map((m) => m[1]);
  // due celle per riga (colonna A e B) prima della cella diff, quattro righe
  return celle;
});
dico('le celle numeriche esistono', numeriDiversi.length >= 8);
dico('macchina A e macchina B non mostrano esattamente lo stesso costo (calcolo reale, non duplicato)',
  numeriDiversi[0] !== numeriDiversi[1]);

/* Tornando a "nessun confronto", la tabella sparisce di nuovo. */
await page.selectOption('#p3d-confronto', '');
await page.waitForTimeout(500);
const dopoReset = await page.evaluate(() => (document.getElementById('p3d-confronto-esito') || {}).innerHTML || '');
dico('tornando a "nessun confronto" la tabella sparisce', dopoReset.trim() === '');

console.log('\nSMART QUOTER 3D — CONFRONTO MACCHINE (§21)\n');
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
console.log('\nla stessa stampa, su due macchine, un solo motore ✔\n');
await browser.close();
