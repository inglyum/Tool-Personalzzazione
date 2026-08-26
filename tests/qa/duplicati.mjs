#!/usr/bin/env node
/**
 * duplicati.mjs — nessun componente deve esistere in due esemplari.
 *
 * È il presidio contro la classe di difetto che ha prodotto due stelle su ogni
 * voce di menu: due moduli che disegnavano lo stesso controllo, ognuno
 * idempotente per conto proprio e quindi innocente all'esame singolo.
 *
 * Si misura in tre momenti — all'avvio, dopo aver invocato più volte i render,
 * e dopo cinque cicli di navigazione con ricerca e preferiti — perché una
 * duplicazione può nascere in ognuno dei tre.
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push('pageerror · ' + String(e).slice(0, 140)));
page.on('console', (m) => { if (m.type() === 'error' && !/net::/.test(m.text())) erroriJS.push('console · ' + m.text().slice(0, 140)); });

await page.addInitScript(() => {
  ['ingly_wizard_done_v2', 'ingly_tour_done_v1', '_wizard_done_v37', 'ingly_first_run_v1']
    .forEach((k) => localStorage.setItem(k, '1'));
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(12000);

/** Conta gli esemplari di ogni componente che deve essere unico. */
const censimento = () => page.evaluate(() => {
  const sb = document.getElementById('sidebar') || document.body;
  const voci = [...sb.querySelectorAll('.nav-item[data-section]')];

  /* Un marcatore-stella è qualunque foglia che mostri ☆ o ★: conta l'effetto
     sullo schermo, non la classe con cui è stato scritto. */
  const stelleDi = (v) => [...v.querySelectorAll('*')]
    .filter((e) => e.children.length === 0 && /[☆★]/.test(e.textContent)).length;
  const nascondiDi = (v) => v.querySelectorAll('.nav-ctrl button:nth-child(2), [title*="ascondi"]').length;

  return {
    sidebarNav: document.querySelectorAll('#sidebar-nav').length,
    coreNav: document.querySelectorAll('#core-nav').length,
    proxNavGroup: document.querySelectorAll('#prox-nav-group').length,
    searchDropdown: document.querySelectorAll('#search-dropdown').length,
    campiRicercaSidebar: sb.querySelectorAll('input[type=text], input:not([type]):not([type=hidden])').length,
    barraPreferiti: document.querySelectorAll('#nav-favorites-bar').length,
    vociTotali: voci.length,
    vociConPiuDiUnaStella: voci.filter((v) => stelleDi(v) > 1).length,
    vociConPiuDiUnNascondi: voci.filter((v) => nascondiDi(v) > 1).length,
    sezioniRipetute: (() => {
      const c = {}; voci.forEach((v) => { c[v.dataset.section] = (c[v.dataset.section] || 0) + 1; });
      return Object.entries(c).filter(([, n]) => n > 1).length;
    })(),
  };
});

const problemi = [];
function esamina(momento, c) {
  const unici = { sidebarNav: 1, coreNav: 1, proxNavGroup: 1, searchDropdown: 1, barraPreferiti: 1 };
  for (const [k, atteso] of Object.entries(unici)) {
    if (c[k] > atteso) problemi.push(`${momento}: ${c[k]} esemplari di ${k} (atteso ${atteso})`);
  }
  if (c.campiRicercaSidebar > 1) problemi.push(`${momento}: ${c.campiRicercaSidebar} campi di ricerca nella sidebar`);
  if (c.vociConPiuDiUnaStella > 0) problemi.push(`${momento}: ${c.vociConPiuDiUnaStella} voci con più di una stella`);
  if (c.vociConPiuDiUnNascondi > 0) problemi.push(`${momento}: ${c.vociConPiuDiUnNascondi} voci con più di un «nascondi»`);
  if (c.sezioniRipetute > 0) problemi.push(`${momento}: ${c.sezioniRipetute} sezioni presenti due volte nel menu`);
  console.log(momento.padEnd(28) + '│ ' + JSON.stringify(c));
}

esamina("all'avvio", await censimento());

/* I render invocati più volte devono lasciare il DOM identico. */
await page.evaluate(async () => {
  for (let i = 0; i < 3; i++) {
    if (window.NavPrefs) { NavPrefs.apply(); NavPrefs._addNavControls(); }
    if (window.Favs && Favs.render) Favs.render();
    if (window.InglySidebar && InglySidebar.render) InglySidebar.render();
    await new Promise((r) => setTimeout(r, 120));
  }
});
await page.waitForTimeout(600);
esamina('dopo 3 render ripetuti', await censimento());

/* Cinque cicli completi, come chiede il collaudo di navigazione. */
for (let ciclo = 1; ciclo <= 5; ciclo++) {
  for (const s of ['dashboard', 'catalog', 'items', 'print3d', 'quoter', 'clienti', 'gestione_ordini', 'equipment', 'dashboard']) {
    await page.evaluate((x) => window.App && App.navigate(x), s);
    await page.waitForTimeout(110);
  }
  await page.evaluate(() => {
    const n = document.getElementById('nav-search');
    if (n) { n.value = 'a'; ['input', 'keyup'].forEach((t) => n.dispatchEvent(new Event(t, { bubbles: true }))); }
  });
  await page.waitForTimeout(350);
  await page.evaluate(() => {
    const n = document.getElementById('nav-search');
    if (n) { n.value = ''; ['input', 'keyup'].forEach((t) => n.dispatchEvent(new Event(t, { bubbles: true }))); }
  });
  await page.evaluate(() => window.NavPrefs && NavPrefs.toggleFavorite('items'));
  await page.waitForTimeout(200);
  await page.evaluate(() => window.NavPrefs && NavPrefs.toggleFavorite('items'));
  await page.waitForTimeout(200);
}
esamina('dopo 5 cicli completi', await censimento());

await browser.close();

if (erroriJS.length) problemi.push(`${erroriJS.length} errori JavaScript: ${erroriJS.slice(0, 3).join(' | ')}`);

console.log('\nerrori JavaScript: ' + erroriJS.length);
if (problemi.length) {
  console.log('\nDUPLICAZIONI TROVATE:');
  problemi.forEach((p) => console.log('  ' + p));
  process.exitCode = 1;
} else {
  console.log('nessuna duplicazione ✔');
}
