#!/usr/bin/env node
/**
 * crm-paginazione.mjs — la prova del difetto CRM-02, riproducibile.
 *
 * ⚠️ QUESTO SCRIPT È ROSSO OGGI, DI PROPOSITO. Non è ancora in `npm run qa`:
 *    il difetto che misura non è stato corretto (è CRM-02 in
 *    docs/CRM-AUDIT-BEFORE.md). Va aggiunto alla suite nello stesso commit che
 *    lo corregge — un presidio che nasce verde non ha mai provato niente.
 *
 * Il sintomo riferito: si preme «pagina successiva» e si vedono gli stessi
 * clienti. Qui si riproduce con 137 clienti nella memoria che la vista legge
 * davvero, e si misurano tre cose: quante righe la tabella disegna, quali sono
 * le prime tre, e cosa dice l'etichetta della paginazione.
 *
 *   node tests/qa/crm-paginazione.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const QUANTI = 137;
const PER_PAGINA = 30;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(e.message));

await page.addInitScript((n) => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
  /* `ingly_crm_v1`: la memoria che la vista «Clienti» legge davvero — non
     l'archivio `clients` di IndexedDB, che è di un'altra lista. */
  const c = [];
  for (let i = 1; i <= n; i++) c.push({ name: 'Cliente ' + String(i).padStart(3, '0'), phone: '+39000' + i, email: 'c' + i + '@t.it' });
  localStorage.setItem('ingly_crm_v1', JSON.stringify(c));
}, QUANTI);

await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(11000);

const m = await page.evaluate(async () => {
  await App.navigate('clienti');
  await new Promise((s) => setTimeout(s, 3000));
  const nomi = () => [...document.querySelectorAll('#crm-tbody tr')]
    .map((t) => (t.textContent.match(/Cliente \d{3}/) || [''])[0]).filter(Boolean);
  const etichetta = () => [...document.querySelectorAll('#view-clienti span')]
    .map((s) => s.textContent).find((t) => /pagine/.test(t)) || null;

  const prima = { righe: nomi().length, primi: nomi().slice(0, 3), etichetta: etichetta() };
  const succ = [...document.querySelectorAll('#view-clienti button')].find((b) => b.textContent.trim() === '→');
  if (succ) { succ.click(); await new Promise((s) => setTimeout(s, 2500)); }
  const dopo = { righe: nomi().length, primi: nomi().slice(0, 3), etichetta: etichetta(),
    pagina: window.CRMSmart && window.CRMSmart._v37page };
  return { prima, dopo, pulsante: !!succ };
});

console.log('\nPAGINAZIONE CRM — ' + QUANTI + ' clienti, ' + PER_PAGINA + ' per pagina\n');
console.log('  prima del click : ' + m.prima.righe + ' righe · ' + m.prima.primi.join(', ') + ' · «' + m.prima.etichetta + '»');
console.log('  dopo il click   : ' + m.dopo.righe + ' righe · ' + m.dopo.primi.join(', ') + ' · «' + m.dopo.etichetta + '»');
console.log('  CRMSmart._v37page = ' + m.dopo.pagina);

const problemi = [];
if (!m.pulsante) problemi.push('il pulsante «→» non esiste: la prova non ha potuto girare');
if (m.prima.righe !== PER_PAGINA) problemi.push('la prima pagina disegna ' + m.prima.righe + ' righe invece di ' + PER_PAGINA + ': la tabella non è paginata');
if (JSON.stringify(m.prima.primi) === JSON.stringify(m.dopo.primi)) problemi.push('dopo «pagina successiva» i clienti sono gli stessi: ' + m.dopo.primi.join(', '));
if (m.prima.etichetta === m.dopo.etichetta) problemi.push('nemmeno l\'etichetta è cambiata');
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));

if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.error('\ncausa già individuata: patch 092 calcola `slice` e poi chiama `_origRender`,');
  console.error('che ridisegna l\'elenco intero. La variabile paginata non viene mai usata.');
  console.error('Vedi docs/CRM-AUDIT-BEFORE.md · CRM-02.\n');
  await browser.close();
  process.exit(1);
}
console.log('\nla paginazione dei clienti pagina davvero ✔\n');
await browser.close();
