#!/usr/bin/env node
/**
 * nomi-e-preferiti.mjs — le sezioni si trovano col nome che l'utente conosce.
 *
 * Il difetto misurato: 52 sezioni su 95 avevano due nomi — quello del menu e
 * quello con cui la sezione si presenta e la ricerca la restituisce. Il filtro
 * del menu confrontava solo l'etichetta mostrata, quindi «Bank» non trovava
 * «Banca & fondi» e «Ispirazione» non trovava «Idee & prototipi». Entrambe
 * erano lì, a due centimetri, sotto un altro nome.
 *
 * Più: con 67 voci su 95 nascoste sotto «Altro», scegliere i preferiti a mano
 * vuol dire ricordarsi che esistono.
 *
 *   node tests/qa/nomi-e-preferiti.mjs [file]
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
await page.waitForTimeout(14000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* ── 1 · I DUE NOMI CHE L'UTENTE CERCAVA ────────────────────────────────── */
for (const [testo, sezione] of [
  ['Bank', 'bank_funds'], ['Funds', 'bank_funds'], ['Banca', 'bank_funds'],
  ['Ispirazione', 'ideas'], ['Idee', 'ideas'], ['prototipi', 'ideas'],
]) {
  const trovata = await page.evaluate(async ([testo, sezione]) => {
    const input = document.getElementById('nav-filter');
    if (!input) return null;
    input.value = testo;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((s) => setTimeout(s, 250));
    const el = document.querySelector(`#sidebar-nav .nav-item[data-section="${sezione}"]`);
    return !!el && !el.hidden;
  }, [testo, sezione]);
  dico(`cercando «${testo}» compare ${sezione}`, trovata);
}

/* Il filtro non deve diventare un colabrodo: una parola che non c'entra
   nulla non deve far comparire mezza sidebar. */
const rumore = await page.evaluate(async () => {
  const input = document.getElementById('nav-filter');
  input.value = 'zqxwv';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((s) => setTimeout(s, 250));
  return [...document.querySelectorAll('#sidebar-nav .nav-item[data-section]')].filter((e) => !e.hidden).length;
});
dico('una parola inesistente non fa comparire nulla (' + rumore + ' voci)', rumore === 0);

await page.evaluate(async () => {
  const input = document.getElementById('nav-filter');
  input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((s) => setTimeout(s, 250));
});

/* ── 2 · UN SOLO NOME MOSTRATO ──────────────────────────────────────────── */
const nomi = await page.evaluate(() => {
  const menu = {};
  document.querySelectorAll('#sidebar-nav .nav-item[data-section]').forEach((el) => {
    const s = el.dataset.section;
    if (!menu[s]) menu[s] = el.textContent.replace(/[▲▼★☆\d]/g, '').trim();
  });
  const idx = {};
  try { (window.InglySearch?._index ?? []).forEach((i) => { idx[i.s] = i.n; }); } catch (e) {}
  const nav = {};
  (window.InglyNav?.allItems() ?? []).forEach((i) => { nav[i.id] = i.label; });
  return { menu, nav, idxKeys: Object.keys(idx).length };
});
dico('il menu chiama la sezione «Bank & Funds»', /Bank & Funds/.test(nomi.menu.bank_funds || ''));
dico('il menu chiama la sezione «Idee & Ispirazione»', /Idee & Ispirazione/.test(nomi.menu.ideas || ''));
dico('la tassonomia e il menu concordano su bank_funds', nomi.nav.bank_funds === 'Bank & Funds');
dico('la tassonomia e il menu concordano su ideas', nomi.nav.ideas === 'Idee & Ispirazione');

/* ── 3 · PREFERITI: SUGGERIMENTO DALL'USO REALE ─────────────────────────── */
const sugg = await page.evaluate(async () => {
  if (typeof NavPrefs === 'undefined') return { errore: 'NavPrefs assente' };
  NavPrefs._prefs.favorites = [];
  NavPrefs._prefs.usi = {};
  await NavPrefs.save();

  const senza = NavPrefs.daProporre().length;

  /* Si «apre» sei volte la stessa sezione: sotto soglia non deve proporre
     niente, sopra soglia deve proporre quella. */
  for (let i = 0; i < 2; i += 1) NavPrefs.segnaUso('catalog');
  const sottoSoglia = NavPrefs.daProporre().length;
  for (let i = 0; i < 4; i += 1) NavPrefs.segnaUso('catalog');
  const sopraSoglia = NavPrefs.daProporre();

  /* Una sezione già preferita non si propone: sarebbe un consiglio di fare
     ciò che è già fatto. */
  await NavPrefs.toggleFavorite('catalog');
  const dopoStellata = NavPrefs.daProporre();

  return { senza, sottoSoglia, sopraSoglia, dopoStellata, preferiti: NavPrefs.favorites() };
});
dico('senza dati d uso non propone nulla', sugg.senza === 0);
dico('sotto soglia non propone ancora', sugg.sottoSoglia === 0);
dico('sopra soglia propone la sezione usata', (sugg.sopraSoglia || []).includes('catalog'));
dico('una sezione già preferita non viene riproposta', !(sugg.dopoStellata || []).includes('catalog'));

/* ── 4 · LA RIGA DI SUGGERIMENTO SI VEDE ────────────────────────────────── */
const riga = await page.evaluate(async () => {
  NavPrefs._prefs.favorites = [];
  NavPrefs._prefs.usi = { items: 9 };
  await NavPrefs.save();
  Favs.render();
  await new Promise((s) => setTimeout(s, 350));
  const sg = document.getElementById('nav-fav-suggerito');
  const gruppo = document.getElementById('nav-favs-group');
  return {
    visibile: !!sg && getComputedStyle(sg).display !== 'none' && sg.innerHTML.trim().length > 0,
    testo: sg ? sg.textContent.trim() : '',
    gruppoVisibile: !!gruppo && getComputedStyle(gruppo).display !== 'none',
  };
});
dico('la riga «aggiungi ai preferiti» compare', riga.visibile);
dico('e nomina la sezione (' + riga.testo.slice(0, 40) + ')', /Magazzino|items/i.test(riga.testo));
dico('il gruppo ⭐ si apre anche solo per il suggerimento', riga.gruppoVisibile);

const dopoClic = await page.evaluate(async () => {
  const b = document.querySelector('#nav-fav-suggerito button');
  if (!b) return { errore: 'bottone assente' };
  b.click();
  await new Promise((s) => setTimeout(s, 500));
  const sg = document.getElementById('nav-fav-suggerito');
  return {
    preferiti: NavPrefs.favorites(),
    suggerimentoSparito: !sg || getComputedStyle(sg).display === 'none',
    righe: [...document.querySelectorAll('#nav-favs-list .nav-item[data-section]')].map((r) => r.dataset.section),
  };
});
dico('il clic sul suggerimento aggiunge davvero il preferito', (dopoClic.preferiti || []).includes('items'));
dico('e il suggerimento sparisce, invece di riproporsi', dopoClic.suggerimentoSparito);
dico('la sezione compare fra le righe dei preferiti', (dopoClic.righe || []).includes('items'));

/* ── 5 · SCORCIATOIE Alt+1…9 ────────────────────────────────────────────── */
const prep = await page.evaluate(async () => {
  NavPrefs._prefs.favorites = ['catalog', 'items', 'clienti'];
  await NavPrefs.save();
  Favs.render();
  await new Promise((s) => setTimeout(s, 350));
  return {
    numeri: [...document.querySelectorAll('#nav-favs-list kbd')].map((k) => k.textContent),
    primo: NavPrefs.preferitoN(1), secondo: NavPrefs.preferitoN(2),
    oltre: NavPrefs.preferitoN(9),
  };
});
dico('i numeri di scorciatoia sono scritti accanto ai preferiti', (prep.numeri || []).join(',') === '1,2,3');
dico('preferitoN(1) è il primo', prep.primo === 'catalog');
dico('preferitoN oltre l elenco non inventa nulla', prep.oltre === null);

await page.keyboard.press('Alt+2');
await page.waitForTimeout(900);
const dopoAlt = await page.evaluate(() => App.currentSection);
dico('Alt+2 apre il secondo preferito (' + dopoAlt + ')', dopoAlt === 'items');

/* Con Alt premuto la cifra non viene digitata: la scorciatoia resta valida
   anche col fuoco dentro un campo, che è il caso più frequente. */
await page.evaluate(() => { document.getElementById('nav-filter').focus(); });
await page.keyboard.press('Alt+1');
await page.waitForTimeout(900);
dico('Alt+1 funziona anche col fuoco in un campo', (await page.evaluate(() => App.currentSection)) === 'catalog');
await page.evaluate(() => { const i = document.getElementById('nav-filter'); i.value=''; i.blur(); });

/* AltGr (Ctrl+Alt) scrive @ e # sopra le cifre: non deve navigare. */
await page.keyboard.down('Control'); await page.keyboard.down('Alt');
await page.keyboard.press('Digit3');
await page.keyboard.up('Alt'); await page.keyboard.up('Control');
await page.waitForTimeout(700);
dico('AltGr+3 non naviga: serve a scrivere #', (await page.evaluate(() => App.currentSection)) === 'catalog');

/* Il nome del preferito non deve portarsi dentro la stella né pescare un
   secondo nome dal DOM. */
const nomeFav = await page.evaluate(() => { Favs._buildCat(); return (Favs._cat.items || {}).label; });
dico('il nome del preferito viene dalla tassonomia («' + nomeFav + '»)', nomeFav === 'Magazzino');

console.log('\nNOMI DELLE SEZIONI E SCELTE PREFERITI\n');
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
console.log('\nsi trovano col nome che conosci ✔\n');
await browser.close();
