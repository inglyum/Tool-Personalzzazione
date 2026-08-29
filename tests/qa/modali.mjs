#!/usr/bin/env node
/**
 * modali.mjs — una finestra che non si apre non è una funzione.
 *
 * Sette finestre nascevano con `style="display:none"` in linea. `openModal()`
 * le apre aggiungendo la classe `.open`, che agisce su `opacity` e
 * `pointer-events` — non su `display` — e uno stile in linea batte qualunque
 * regola d'autore.
 *
 * Non era un difetto di logica: «Salva Template» salvava davvero il template
 * e «Template» costruiva davvero l'elenco. Semplicemente nessuno dei due
 * poteva mostrarlo. È lo stesso schema del difetto delle sovrapposizioni nella
 * navigazione — uno stile che nessuna regola può contraddire — e per questo
 * merita un presidio suo.
 *
 * Qui si aprono **tutte** le finestre del prodotto, una per una, e si verifica
 * che diventino davvero visibili.
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
await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(11000);

const esito = await page.evaluate(async () => {
  const out = { finestre: [], inLinea: [], errori: [] };
  if (typeof openModal !== 'function') { out.errori.push('openModal assente'); return out; }

  const overlay = [...document.querySelectorAll('.modal-overlay[id^="modal-"]')];
  out.totale = overlay.length;

  /* Nessuna finestra deve dichiarare `display` in linea: è l'unico modo di
     renderla inapribile senza che nessun test se ne accorga. */
  overlay.forEach((el) => {
    if (el.style && el.style.display) out.inLinea.push(el.id + ' → display:' + el.style.display);
  });

  const visibile = (el) => {
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity) > 0.5 && s.pointerEvents !== 'none';
  };

  for (const el of overlay) {
    const id = el.id.replace(/^modal-/, '');
    let apre = false, chiude = false;
    try {
      openModal(id);
      await new Promise((s) => setTimeout(s, 60));
      apre = visibile(el);
      closeModal(id);
      await new Promise((s) => setTimeout(s, 60));
      chiude = !visibile(el);
    } catch (e) { out.errori.push(id + ': ' + e.message); }
    out.finestre.push({ id, apre, chiude });
  }
  return out;
});

console.log('\nFINESTRE — si aprono davvero, e si richiudono\n');
const problemi = [];
if (esito.inLinea.length) {
  console.log('  stili display in linea: ' + esito.inLinea.length);
  esito.inLinea.forEach((x) => { console.log('      ✘ ' + x); problemi.push('stile in linea: ' + x); });
} else {
  console.log('  nessuna finestra dichiara display in linea ✔');
}

const rotte = esito.finestre.filter((f) => !f.apre || !f.chiude);
console.log('\n  finestre provate : ' + (esito.totale || 0));
console.log('  si aprono        : ' + esito.finestre.filter((f) => f.apre).length);
console.log('  si richiudono    : ' + esito.finestre.filter((f) => f.chiude).length);
rotte.forEach((f) => {
  console.log('      ✘ ' + f.id + (f.apre ? '' : ' — non si apre') + (f.chiude ? '' : ' — non si richiude'));
  problemi.push(f.id + (f.apre ? ' non si richiude' : ' non si apre'));
});
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
console.log('\nogni finestra si apre e si richiude ✔\n');
await browser.close();
