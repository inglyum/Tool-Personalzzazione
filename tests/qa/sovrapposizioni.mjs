#!/usr/bin/env node
/**
 * sovrapposizioni.mjs — la navigazione non deve mai disegnare due scritte
 * nello stesso posto, e ogni categoria deve aprirsi al primo clic.
 *
 * Il difetto che questo test sorveglia non è estetico: nasce da due sistemi
 * che possiedono lo stesso concetto (due nomi di classe per «chiuso», due
 * elenchi di voci) e si manifesta solo quando coesistono. Per questo si
 * misura il risultato disegnato, non il codice che lo produce.
 *
 * Il rilevatore ha un controllo negativo: se una sovrapposizione costruita
 * apposta non venisse vista, il verde di questo test non varrebbe nulla.
 */
import path from 'node:path';
import { chromium } from 'playwright';
import { SEED, seedScript } from './seed.mjs';
import { RILEVATORE } from './rilevatore.mjs';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';

/* Larghezze in cui la shell cambia davvero forma, non taglie di dispositivo. */
const LARGHEZZE = [1920, 1600, 1440, 1366, 1280, 1024, 768, 390];
/* Le categorie della tassonomia: nessuna può restare muta. */
const GRUPPI = ['ng-workspace', 'ng-production', 'ng-business', 'ng-lab',
  'ng-intelligence', 'ng-marketing', 'ng-finance', 'ng-system'];


const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

const problemi = [];
let erroriJs = [];

async function apri(width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('pageerror', (e) => erroriJs.push(`${width}px · ${e.message}`));
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
  await page.waitForTimeout(9000);
  await page.addScriptTag({ content: RILEVATORE });
  /* Sotto i 768px la sidebar è un pannello estraibile: va aperta, altrimenti
     si misurerebbe un elemento tradotto fuori schermo. */
  if (width < 768) {
    await page.evaluate(() => {
      const s = document.getElementById('sidebar');
      if (s) s.classList.add('open');
    });
    await page.waitForTimeout(300);
  }
  /* Le voci si spostano quando la sezione attiva cambia: la sovrapposizione
     rimasta nascosta più a lungo compariva solo dopo aver percorso le sezioni,
     perché è allora che i badge e le stelle vengono aggiunti alle voci. */
  for (const sez of ['dashboard', 'product_builder', 'quoter', 'items', 'gestione_ordini', 'sales', 'equipment', 'finance']) {
    await page.evaluate((x) => window.App && window.App.navigate(x), sez);
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => {
    [...document.querySelectorAll('body > div')].forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' && el.getBoundingClientRect().width > window.innerWidth * 0.8) el.remove();
    });
  });
  return page;
}

console.log('SOVRAPPOSIZIONI NELLA NAVIGAZIONE');
console.log('larghezza │ «Altro» chiuso │ «Altro» aperto');

let totale = 0;
for (const w of LARGHEZZE) {
  const page = await apri(w, w < 768 ? 844 : 900);
  const conteggi = [];
  for (const aperto of [false, true]) {
    await page.evaluate((ap) => {
      document.querySelectorAll('#sidebar-nav .nav-more').forEach((d) => { d.open = ap; });
    }, aperto);
    await page.waitForTimeout(250);
    /* Quattro posizioni di scorrimento: una sovrapposizione può nascere solo
       quando due elementi appiccicati scorrono uno sull'altro. */
    let peggio = [];
    for (const frazione of [0, 0.33, 0.66, 1]) {
      await page.evaluate((f) => {
        const n = document.getElementById('sidebar-nav');
        if (n) n.scrollTop = (n.scrollHeight - n.clientHeight) * f;
      }, frazione);
      await page.waitForTimeout(120);
      const trovate = await page.evaluate(() =>
        sovrapposizioni(document.getElementById('sidebar') || document.body));
      if (trovate.length > peggio.length) peggio = trovate;
    }
    conteggi.push(peggio.length);
    totale += peggio.length;
    if (peggio.length) {
      problemi.push(`${w}px · «Altro» ${aperto ? 'aperto' : 'chiuso'}: ${peggio.slice(0, 4).join(' | ')}`);
    }
  }
  console.log(`${String(w).padStart(9)} │ ${String(conteggi[0]).padStart(14)} │ ${String(conteggi[1]).padStart(14)}`);
  await page.close();
}

/* Controllo negativo: se il rilevatore non vedesse una sovrapposizione
   costruita apposta, lo zero qui sopra non significherebbe nulla. */
const provino = await apri(1440, 900);
const finte = await provino.evaluate(() => {
  const voci = [...document.querySelectorAll('#sidebar-nav .nav-item')].filter((e) => e.offsetParent);
  if (voci.length < 2) return -1;
  /* Si aggiunge un clone invece di spostare una voce vera: togliere un
     elemento dal flusso farebbe risalire tutte le altre di 32px, e la
     sovrapposizione costruita non si verificherebbe più. */
  const b = voci[1].getBoundingClientRect();
  const clone = voci[0].cloneNode(true);
  clone.style.cssText = 'position:fixed;left:' + b.left + 'px;top:' + b.top + 'px;width:' + b.width + 'px;height:' + b.height + 'px;z-index:99;display:flex';
  voci[1].parentElement.appendChild(clone);
  return sovrapposizioni(document.getElementById('sidebar-nav')).length;
});
if (finte <= 0) problemi.push(`controllo negativo: sabotaggio non rilevato (${finte})`);
console.log(`controllo negativo: ${finte > 0 ? 'sabotaggio rilevato' : 'NON RILEVATO'} (${finte})`);
await provino.close();

/* Guardia strutturale. Una voce con `display` scritto in linea non è più
   nascondibile da nessuna regola: né da un «Altro (n)» chiuso, né dal gestore
   dei moduli. È la forma che ha assunto due volte lo stesso difetto, quindi si
   presidia la forma, non solo il sintomo. */
const conDisplay = await (async () => {
  const pg = await apri(1440, 900);
  const r = await pg.evaluate(() => [...document.querySelectorAll('#sidebar .nav-item')]
    .filter((e) => e.style && e.style.display)
    .map((e) => e.textContent.trim().slice(0, 24) + ' → display:' + e.style.display));
  await pg.close();
  return r;
})();
console.log(`\nvoci con «display» in linea: ${conDisplay.length}`);
conDisplay.slice(0, 5).forEach((v) => console.log('  ' + v));
if (conDisplay.length) problemi.push(`${conDisplay.length} voci di menu dichiarano «display» in linea`);

/* Ogni categoria deve aprirsi e richiudersi al primo clic sull'intestazione. */
console.log('\nCATEGORIE');
const page = await apri(1440, 900);
await page.evaluate(() => {
  if (window.InglySidebar) window.InglySidebar.setGroup && null;
});
let rotte = 0;
for (const id of GRUPPI) {
  const r = await page.evaluate(async (gid) => {
    const g = document.getElementById(gid) || document.querySelector('[data-group="' + gid.replace(/^ng-/, '') + '"]');
    if (!g) return null;
    const corpo = g.querySelector('.nav-group-items');
    const h = () => (corpo ? corpo.getBoundingClientRect().height : -1);
    const testa = g.querySelector('.ng-header') || g.querySelector('summary') || g;
    const chiudi = async () => { if (h() > 4) { testa.click(); await new Promise((s) => setTimeout(s, 260)); } };
    await chiudi();
    const prima = h();
    testa.click(); await new Promise((s) => setTimeout(s, 300));
    const dopo = h();
    testa.click(); await new Promise((s) => setTimeout(s, 300));
    return { prima: Math.round(prima), dopo: Math.round(dopo), fine: Math.round(h()) };
  }, id);
  if (!r) { problemi.push(`categoria assente: ${id}`); rotte += 1; continue; }
  const ok = r.prima < 5 && r.dopo > 20 && r.fine < 5;
  if (!ok) { problemi.push(`categoria ${id}: ${r.prima} → ${r.dopo} → ${r.fine}`); rotte += 1; }
  console.log(`${id.padEnd(20)} ${String(r.prima).padStart(4)} → ${String(r.dopo).padStart(4)} → ${String(r.fine).padStart(4)}  ${ok ? 'apre e chiude' : 'NON FUNZIONA'}`);
}
console.log(`categorie che non funzionano: ${rotte} su ${GRUPPI.length}`);
await page.close();
await browser.close();

erroriJs = [...new Set(erroriJs)];
console.log(`\nsovrapposizioni totali: ${totale}`);
console.log(`errori JavaScript      : ${erroriJs.length}`);
erroriJs.slice(0, 6).forEach((e) => console.log('  ' + e));
if (erroriJs.length) problemi.push(`${erroriJs.length} errori JavaScript distinti`);

if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  process.exit(1);
}
console.log('\nnavigazione senza sovrapposizioni, categorie tutte funzionanti, console pulita');
