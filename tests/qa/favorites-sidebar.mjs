#!/usr/bin/env node
/**
 * favorites-sidebar.mjs — una sola categoria ⭐ PREFERITI, e funziona.
 *
 * Il difetto misurato prima della correzione: il sistema dei preferiti
 * esisteva, salvava, migrava — e non si vedeva. Quattro rappresentazioni
 * visive e quattro memorie, di cui tre nascoste da `display:none !important`
 * in tre fogli diversi. La quarta, l'unica visibile, spostava fisicamente le
 * voci in cima invece di disegnare scorciatoie: una sezione insieme preferita
 * e nascosta veniva spostata e poi nascosta, cioè spariva del tutto.
 *
 *   node tests/qa/favorites-sidebar.mjs [file]
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
  /* Due preferiti nel vecchio sistema: devono essere assorbiti, non persi. */
  localStorage.setItem('ingly_favs3', JSON.stringify(['magazzino', 'clienti']));
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(13000);

const esito = await page.evaluate(async () => {
  const out = { passi: [], errori: [] };
  const dico = (k, v) => out.passi.push({ passo: k, esito: v });
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  if (typeof NavPrefs === 'undefined') { out.errori.push('NavPrefs assente'); return out; }

  const gruppo = () => document.getElementById('nav-favs-group');
  const righe = () => [...document.querySelectorAll('#nav-favs-list .nav-item[data-section]')];
  const visibile = (el) => !!el && getComputedStyle(el).display !== 'none';
  const sez = () => righe().map((r) => r.dataset.section);

  const azzera = async () => {
    NavPrefs._prefs.favorites = [];
    NavPrefs._prefs.hidden = [];
    await NavPrefs.save();
    NavPrefs.apply();
    await a(400);
  };

  /* ── 11 · MIGRAZIONE ────────────────────────────────────────────────── */
  dico('i preferiti del vecchio sistema sono stati assorbiti',
    NavPrefs._prefs.favorites.includes('magazzino') && NavPrefs._prefs.favorites.includes('clienti'));
  dico('e non duplicati', NavPrefs._prefs.favorites.filter((s) => s === 'magazzino').length === 1);
  dico('il vecchio ingly_favs3 resta dov\'è, per compatibilità',
    !!localStorage.getItem('ingly_favs3'));

  /* ── 12 · UNA SOLA MEMORIA, UNA SOLA RAPPRESENTAZIONE ───────────────── */
  dico('nessuna barra orizzontale dei preferiti in pagina', !document.getElementById('nav-favorites-bar'));
  dico('nessun gruppo preferiti dell\'app shell', !document.getElementById('ng-favourites'));
  dico('nessun gruppo che sposta le voci vere', !document.getElementById('nav-fav-top'));
  dico('la quick bar storica non è in pagina', !visibile(document.getElementById('favs-quickbar')));
  const gruppiPreferiti = [...document.querySelectorAll('#sidebar-nav [id]')]
    .filter((e) => /fav/i.test(e.id) && /group|bar|top/i.test(e.id));
  dico('una sola sezione preferiti nel DOM (' + gruppiPreferiti.map((e) => e.id).join(', ') + ')',
    gruppiPreferiti.length === 1 && gruppiPreferiti[0].id === 'nav-favs-group');
  dico('e la memoria è una sola: NavPrefs su IndexedDB',
    typeof NavPrefs._prefs === 'object' && !window.ingly_favorites_new && !window.favorites_v2);

  /* ── 1 · NESSUN PREFERITO ───────────────────────────────────────────── */
  await azzera();
  dico('senza preferiti il gruppo è nascosto', !visibile(gruppo()));

  /* ── 2 · UN PREFERITO ───────────────────────────────────────────────── */
  await NavPrefs.toggleFavorite('print3d'); await a(500);
  dico('con un preferito il gruppo compare', visibile(gruppo()));
  dico('e contiene una riga sola', righe().length === 1);
  dico('il contatore dice 1', /\b1\b/.test(document.getElementById('nav-favs-count')?.textContent || ''));

  /* ── 24 · IDENTITÀ ──────────────────────────────────────────────────── */
  const r0 = righe()[0];
  dico('la riga punta alla stessa data-section della voce originale',
    r0.dataset.section === 'print3d');
  const originale = [...document.querySelectorAll('#sidebar-nav .nav-item[data-section="print3d"]')]
    .find((e) => !e.closest('#nav-favs-group'));
  dico('e la voce originale è ancora al suo posto', !!originale);
  dico('cioè il preferito è una scorciatoia, non un trasloco',
    !!originale && !originale.closest('#nav-favs-group'));

  /* ── 8 · ICONA ED ETICHETTA DALLA VOCE ORIGINALE ────────────────────── */
  const etichettaOrig = originale ? originale.textContent.replace(/[⭐☆★▲▼\s]+/g, ' ').trim() : '';
  const etichettaFav = r0.textContent.replace(/[⭐☆★▲▼\s]+/g, ' ').trim();
  dico('la scorciatoia porta l\'etichetta della voce originale ("' + etichettaFav + '")',
    etichettaFav.length > 2 && etichettaOrig.toLowerCase().includes(etichettaFav.toLowerCase().slice(0, 8)));
  dico('e la sua icona', !!r0.querySelector('i, img'));

  /* ── 3 · CINQUE PREFERITI, IN ORDINE ────────────────────────────────── */
  for (const s of ['laser_b2b', 'catalog', 'magazzino', 'clienti']) { await NavPrefs.toggleFavorite(s); }
  await a(600);
  dico('cinque preferiti, cinque righe', righe().length === 5);
  dico('il contatore dice 5', /\b5\b/.test(document.getElementById('nav-favs-count')?.textContent || ''));
  dico('l\'ordine a schermo è quello salvato',
    sez().join(',') === NavPrefs.favorites().join(','));

  /* ── 3 · PRIORITÀ VISIVA ────────────────────────────────────────────── */
  const nav = document.getElementById('sidebar-nav');
  const primi = [...nav.children].filter((c) => c.offsetHeight > 0);
  const idxFav = primi.indexOf(gruppo());
  const gruppiNormali = primi.filter((c) => c.classList.contains('nav-group') && c !== gruppo());
  dico('la categoria sta sopra le categorie normali',
    idxFav >= 0 && (!gruppiNormali.length || idxFav < primi.indexOf(gruppiNormali[0])));

  /* ── 7 · NAVIGAZIONE ────────────────────────────────────────────────── */
  const vero = App.navigate;
  let chiamata = null;
  App.navigate = function (s) { chiamata = s; return vero.apply(this, arguments); };
  /* La sezione si legge **prima** del clic: navigare ridisegna la sidebar, e
     `sez()[0]` dopo potrebbe essere un'altra riga. */
  const attesa = sez()[0];
  righe()[0].click(); await a(700);
  App.navigate = vero;
  /* `App.navigate` è un accessor con setter vuoto (patch 111): non si può
     spiare sostituendolo. Si guarda l'effetto — la sezione aperta — che è
     comunque la cosa che conta: il preferito apre la sezione originale. */
  const arrivato = chiamata || App.currentSection;
  dico('cliccando un preferito si apre la sua sezione (' + arrivato + ' vs ' + attesa + ')',
    arrivato === attesa);
  dico('e il comando è quello canonico, non una copia',
    /App\.navigate\(/.test(righe()[0].getAttribute('onclick') || ''));

  /* ── 27 · ACCESSIBILITÀ ─────────────────────────────────────────────── */
  const acc = righe()[0];
  dico('ogni preferito ha aria-label', !!acc.getAttribute('aria-label'));
  dico('e title', !!acc.getAttribute('title'));
  dico('ed è raggiungibile da tastiera', acc.getAttribute('tabindex') === '0');
  dico('i comandi d\'ordine hanno un nome leggibile',
    [...acc.querySelectorAll('.fav-ord')].every((b) => !!b.getAttribute('aria-label')));

  /* ── 10 · RIORDINO ──────────────────────────────────────────────────── */
  const prima = sez().slice();
  await NavPrefs.moveFavorite(prima[4], -1); await a(400);
  const dopo = sez();
  dico('«sposta su» scambia con quello sopra',
    dopo[3] === prima[4] && dopo[4] === prima[3]);
  await NavPrefs.favoriteToTop(prima[2]); await a(400);
  dico('«metti in cima» porta al primo posto', sez()[0] === prima[2]);
  dico('e l\'elenco resta della stessa lunghezza', sez().length === 5);
  dico('il primo non può salire',
    righe()[0].querySelectorAll('.fav-ord[disabled]').length >= 1);
  dico('l\'ultimo non può scendere',
    righe()[4].querySelectorAll('.fav-ord[disabled]').length >= 1);

  /* ── 18 · NASCOSTO + PREFERITO ──────────────────────────────────────── */
  const daNascondere = sez()[0];
  await NavPrefs.toggleHide(daNascondere); await a(700);
  dico('una sezione nascosta resta nei Preferiti', sez().includes(daNascondere));
  const rigaNascosta = righe().find((r) => r.dataset.section === daNascondere);
  dico('e la sua scorciatoia è visibile', visibile(rigaNascosta));
  const origNascosta = [...document.querySelectorAll('#sidebar-nav .nav-item[data-section="' + daNascondere + '"]')]
    .find((e) => !e.closest('#nav-favs-group'));
  dico('mentre la voce nel menu normale è nascosta', !origNascosta || !visibile(origNascosta));
  await NavPrefs.toggleHide(daNascondere); await a(500);

  /* ── 5-6 · AGGIUNGI E TOGLI ─────────────────────────────────────────── */
  const quanti = righe().length;
  await NavPrefs.toggleFavorite('dashboard'); await a(500);
  dico('aggiungere aggiorna la sidebar subito, senza ricaricare', righe().length === quanti + 1);
  await NavPrefs.toggleFavorite('dashboard'); await a(500);
  dico('togliere anche', righe().length === quanti);
  dico('e la voce originale non si è mossa',
    !!document.querySelector('#sidebar-nav .nav-item[data-section="dashboard"]:not([data-fav-shortcut])'));

  /* ── 12 · NIENTE DOPPIONI ───────────────────────────────────────────── */
  await NavPrefs.toggleFavorite('catalog'); await a(300);   // già presente → toglie
  await NavPrefs.toggleFavorite('catalog'); await a(300);   // rimette
  await NavPrefs.toggleFavorite('catalog'); await a(500);   // toglie
  dico('accendere e spegnere non lascia doppioni',
    new Set(sez()).size === sez().length);

  /* ── 25 · RENDER MULTIPLO ───────────────────────────────────────────── */
  const primaCento = sez().join(',');
  for (let i = 0; i < 100; i++) NavPrefs.apply();
  await a(900);
  dico('cento apply() lasciano una sola categoria',
    document.querySelectorAll('#nav-favs-group').length === 1);
  dico('e le stesse righe, nello stesso ordine', sez().join(',') === primaCento);
  dico('e nessun pulsante d\'ordine duplicato',
    righe().every((r) => r.querySelectorAll('.fav-ord').length === 3));
  dico('e una sola stella per voce di menu',
    [...document.querySelectorAll('#sidebar-nav .nav-item[data-section]')]
      .filter((e) => !e.closest('#nav-favs-group'))
      .every((e) => e.querySelectorAll('.nav-ctrl').length <= 1));

  /* ── 26 · STALENESS ─────────────────────────────────────────────────── */
  /* Si scrive direttamente nello stato, senza passare da `toggleFavorite`: la
     UI deve seguire lo stato, non una propria copia. */
  NavPrefs._prefs.favorites = ['magazzino'];
  NavPrefs.apply(); await a(500);
  dico('cambiando lo stato la UI lo segue', sez().join(',') === 'magazzino');

  /* ── 15 · RICERCA ───────────────────────────────────────────────────── */
  NavPrefs._prefs.favorites = ['print3d', 'magazzino'];
  /* `apply()` disegna ma non salva: per provare la persistenza bisogna
     salvare, come fa `toggleFavorite`. Confonderli farebbe fallire il test di
     ricaricamento per un motivo che non è del prodotto. */
  await NavPrefs.save();
  NavPrefs.apply(); await a(500);
  App.filterNav('magazz'); await a(300);
  const trovate = righe().filter((r) => visibile(r)).map((r) => r.dataset.section);
  dico('la ricerca trova anche i preferiti', trovate.includes('magazzino'));
  dico('e nasconde quelli che non corrispondono', !trovate.includes('print3d'));
  App.filterNav(''); await a(400);
  dico('svuotando la ricerca tornano tutti', righe().filter((r) => visibile(r)).length === 2);

  /* ── 17 · PREFERITI ≠ RECENTI ───────────────────────────────────────── */
  dico('preferiti e recenti restano due gruppi distinti',
    !!document.getElementById('nav-favs-group') && !!document.getElementById('nav-recent-group'));

  /* ── 19 · NON È UN MODULO ───────────────────────────────────────────── */
  dico('non esiste una sezione «favorites» da navigare',
    !document.getElementById('view-favorites') && !document.getElementById('view-preferiti'));

  return out;
});

/* ── 6-7 · PERSISTENZA VERA: si ricarica la pagina ───────────────────────── */
const attesi = await page.evaluate(() => NavPrefs.favorites().join(','));
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(13000);
const dopoRicarica = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  await a(500);
  return {
    salvati: (typeof NavPrefs !== 'undefined') ? NavPrefs.favorites().join(',') : '',
    schermo: [...document.querySelectorAll('#nav-favs-list .nav-item[data-section]')]
      .map((r) => r.dataset.section).join(','),
    visibile: getComputedStyle(document.getElementById('nav-favs-group')).display !== 'none',
  };
});
esito.passi.push({ passo: 'dopo il ricaricamento i preferiti sono gli stessi ("' + dopoRicarica.salvati + '")',
  esito: dopoRicarica.salvati === attesi });
esito.passi.push({ passo: 'e nello stesso ordine a schermo', esito: dopoRicarica.schermo === attesi });
esito.passi.push({ passo: 'e la categoria è visibile', esito: dopoRicarica.visibile });

/* ── 13 · SIDEBAR COMPRESSA ─────────────────────────────────────────────── */
await page.setViewportSize({ width: 1000, height: 900 });
await page.waitForTimeout(900);
const stretta = await page.evaluate(() => {
  const g = document.getElementById('nav-favs-group');
  const righe = [...document.querySelectorAll('#nav-favs-list .nav-item[data-section]')];
  return {
    gruppoVisibile: !!g && getComputedStyle(g).display !== 'none',
    righeVisibili: righe.filter((r) => getComputedStyle(r).display !== 'none').length,
    conTitle: righe.every((r) => !!r.getAttribute('title')),
    conIcona: righe.every((r) => !!r.querySelector('i, img')),
  };
});
esito.passi.push({ passo: 'in sidebar stretta i preferiti restano raggiungibili', esito: stretta.gruppoVisibile && stretta.righeVisibili > 0 });
esito.passi.push({ passo: 'con icona e suggerimento', esito: stretta.conTitle && stretta.conIcona });

/* ── 14 · TEMA ──────────────────────────────────────────────────────────── */
await page.setViewportSize({ width: 1600, height: 1000 });
await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light'); });
await page.waitForTimeout(600);
const tema = await page.evaluate(() => {
  const righe = [...document.querySelectorAll('#nav-favs-list .nav-item[data-section]')];
  return { n: righe.length, visibile: getComputedStyle(document.getElementById('nav-favs-group')).display !== 'none' };
});
esito.passi.push({ passo: 'cambiando tema i preferiti restano', esito: tema.visibile && tema.n > 0 });

console.log('\nPREFERITI — UNA CATEGORIA SOLA, IN CIMA\n');
const problemi = [];
for (const p of esito.passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
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
console.log('\nuna categoria sola, e si vede ✔\n');
await browser.close();
