#!/usr/bin/env node
/**
 * duplicate-action-icons.mjs — un'azione, un'icona, un nodo.
 *
 * Il difetto che presidia è già stato misurato in questo progetto: due sistemi
 * di preferiti disegnavano ognuno la propria stella su tutte e 98 le voci di
 * menu, su due memorie diverse. Aggiungere ai preferiti in uno non si vedeva
 * nell'altro, e nessun test se ne accorgeva perché entrambi funzionavano —
 * separatamente.
 *
 * Qui si guarda il DOM del file consegnato e si conta: se lo stesso componente
 * offre due volte la stessa azione, il test diventa rosso.
 *
 * Ha un controllo negativo: un doppione costruito apposta deve essere visto,
 * altrimenti il verde non significa niente.
 */
import path from 'node:path';
import { chromium } from 'playwright';
import { SEED, seedScript } from './seed.mjs';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';

/* Le azioni che devono avere un solo comando per contenitore. Ognuna elencata
   con i modi in cui è stata scritta nel tempo: la duplicazione nasce proprio
   dal fatto che due autori hanno scelto due parole per la stessa cosa. */
const AZIONI = [
  { id: 'preferito', label: 'Preferito', segni: ['fa-star', '☆', '⭐', 'nav-pin', 'data-fav'] },
  { id: 'nascondi', label: 'Nascondi', segni: ['fa-eye-slash', 'nav-hide', 'data-hide'] },
  { id: 'modifica', label: 'Modifica', segni: ['fa-pen', 'fa-pencil', 'fa-edit'] },
  { id: 'elimina', label: 'Elimina', segni: ['fa-trash', 'fa-times-circle'] },
  { id: 'impostazioni', label: 'Impostazioni', segni: ['fa-gear', 'fa-cog'] },
];

const CONTENITORI = ['#sidebar-nav .nav-item', '#core-nav .nav-item', '#topbar .tb__slot'];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

async function apri() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => problemi.push('errore JS: ' + e.message));
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
  await page.waitForTimeout(11000);
  return page;
}

const problemi = [];
const page = await apri();

/* Percorrere le sezioni è parte della prova: le stelle e i pulsanti di
   nascondi vengono aggiunti alle voci dopo la prima navigazione, ed è lì che
   la duplicazione compariva. */
for (const sez of ['dashboard', 'catalog', 'product_builder', 'quoter', 'items', 'gestione_ordini', 'clienti', 'settings']) {
  await page.evaluate((s) => window.App && window.App.navigate(s), sez);
  await page.waitForTimeout(350);
}

const esito = await page.evaluate(({ AZIONI, CONTENITORI }) => {
  const doppioni = [];
  /* Si contano solo i **comandi**, non le decorazioni. La voce «Lead Scorer»
     ha `fa-star` come icona della sezione e un `<button>☆` per i preferiti:
     sono due cose diverse, e confonderle produceva un falso positivo. Un
     rilevatore che grida al lupo è peggio di nessun rilevatore — la volta che
     ha ragione non gli si crede. */
  const conta = (nodo, segni) => {
    let n = 0;
    for (const el of nodo.querySelectorAll('button, [role="button"], a[data-action], [data-fav], [data-hide]')) {
      const firma = (el.className || '') + ' ' + (el.getAttribute('data-action') || '') +
        ' ' + (el.getAttribute('title') || '') +
        ' ' + (el.children.length === 0 ? el.textContent.trim() : '') +
        ' ' + [...el.querySelectorAll('i')].map((x) => x.className).join(' ');
      if (segni.some((s) => firma.includes(s))) n += 1;
    }
    return n;
  };

  for (const sel of CONTENITORI) {
    const nodi = [...document.querySelectorAll(sel)];
    for (const nodo of nodi) {
      for (const a of AZIONI) {
        const n = conta(nodo, a.segni);
        if (n > 1) {
          doppioni.push({
            contenitore: sel,
            azione: a.label,
            volte: n,
            testo: nodo.textContent.replace(/\s+/g, ' ').trim().slice(0, 34),
          });
        }
      }
    }
  }

  /* Id duplicati: due nodi con lo stesso id sono sempre un difetto, e il
     secondo è invisibile a `getElementById`. */
  const visti = Object.create(null);
  const idDoppi = [];
  for (const el of document.querySelectorAll('[id]')) {
    if (visti[el.id]) idDoppi.push(el.id); else visti[el.id] = true;
  }

  /* Un solo gestore globale per la palette dei comandi. */
  const palette = document.querySelectorAll('#command-palette, .command-palette, [data-command-palette]').length;

  return {
    doppioni,
    idDoppi: [...new Set(idDoppi)],
    palette,
    vociEsaminate: CONTENITORI.reduce((t, s) => t + document.querySelectorAll(s).length, 0),
  };
}, { AZIONI, CONTENITORI });

console.log('ICONE DUPLICATE PER AZIONE');
console.log('  voci esaminate        : ' + esito.vociEsaminate);
console.log('  azioni duplicate      : ' + esito.doppioni.length);
esito.doppioni.slice(0, 8).forEach((d) => console.log('      ' + d.azione + ' ×' + d.volte + '  «' + d.testo + '»'));
console.log('  id duplicati nel DOM  : ' + esito.idDoppi.length);
esito.idDoppi.slice(0, 8).forEach((i) => console.log('      #' + i));
console.log('  palette dei comandi   : ' + esito.palette);

if (esito.doppioni.length) problemi.push(esito.doppioni.length + ' azioni offerte due volte nello stesso componente');
if (esito.idDoppi.length) problemi.push(esito.idDoppi.length + ' id duplicati nel DOM: ' + esito.idDoppi.slice(0, 5).join(', '));
if (esito.palette > 1) problemi.push(esito.palette + ' palette dei comandi contemporaneamente presenti');

/* ── Controllo negativo ────────────────────────────────────────────────────
   Un rilevatore che non è mai diventato rosso non è un rilevatore. */
const sabotaggio = await page.evaluate(({ AZIONI }) => {
  const voce = document.querySelector('#sidebar-nav .nav-item');
  if (!voce) return -1;
  /* Due comandi veri, non due icone decorative: il sabotaggio deve somigliare
     al difetto che si vuole intercettare. */
  for (let k = 0; k < 2; k += 1) {
    const finto = document.createElement('button');
    finto.setAttribute('data-fav', '1');
    finto.textContent = '☆';
    voce.appendChild(finto);
  }

  let n = 0;
  for (const el of voce.querySelectorAll('button, [role="button"], a[data-action], [data-fav], [data-hide]')) {
    const firma = (el.className || '') + ' ' + (el.getAttribute('data-action') || '') +
      ' ' + (el.getAttribute('title') || '') + ' ' + (el.children.length === 0 ? el.textContent.trim() : '');
    if (AZIONI[0].segni.some((s) => firma.includes(s))) n += 1;
  }
  return n;
}, { AZIONI });

console.log('  controllo negativo    : ' + (sabotaggio > 1 ? 'doppione rilevato (' + sabotaggio + ')' : 'NON RILEVATO'));
if (sabotaggio <= 1) problemi.push('controllo negativo: il doppione costruito non è stato visto');

await page.close();
await browser.close();

if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  process.exit(1);
}
console.log('\nun\'azione, un\'icona, un nodo ✔');
