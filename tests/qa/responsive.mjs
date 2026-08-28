#!/usr/bin/env node
/**
 * responsive.mjs — verifica che a ogni larghezza il contenuto stia dentro lo
 * schermo. L'errore più comune in un gestionale denso non è il layout brutto:
 * è la tabella che spinge il documento fuori dal viewport e rende la pagina
 * scorrevole in orizzontale.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { SEED, seedScript } from './seed.mjs';
import { RILEVATORE } from './rilevatore.mjs';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const outDir = 'tests/__screenshots__/responsive';
fs.mkdirSync(outDir, { recursive: true });

/* Le cinque larghezze della fase 2. Non sono taglie di dispositivo ma i punti
   in cui il layout cambia davvero: due colonne che diventano una, la sidebar
   che si ritira, la tabella che comincia a scorrere per conto suo. */
const VIEWPORTS = [
  { name: '1440-desktop', width: 1440, height: 900 },
  { name: '1280-laptop', width: 1280, height: 800 },
  { name: '1024-piccolo', width: 1024, height: 768 },
  { name: '768-tablet', width: 768, height: 1024 },
  { name: '390-mobile', width: 390, height: 844 },
];
/* Le superfici della fase 2 più quelle dense di tabelle, dove l'overflow
   orizzontale si manifesta per primo. */
const SECTIONS = ['dashboard', 'product_builder', 'quoter', 'items', 'gestione_ordini', 'sales', 'equipment', 'finance'];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

const problems = [];
for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await page.addInitScript(() => {
    localStorage.setItem('ingly_wizard_done_v2', '1');
    localStorage.setItem('ingly_tour_done_v1', '1');
    localStorage.setItem('_wizard_done_v37', '1');
    localStorage.setItem('ingly_color_scheme', 'dark');
  });
  await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(6000);
  // Con gli store vuoti ogni griglia è un riquadro "nessun dato": si misurerebbe
  // il vuoto, non il layout.
  await page.evaluate(seedScript(SEED));
  await page.reload({ waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(8000);
  await page.evaluate(() => {
    [...document.querySelectorAll('body > div')].forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' && el.getBoundingClientRect().width > window.innerWidth * 0.8) el.remove();
    });
  });

  for (const s of SECTIONS) {
    await page.evaluate((sec) => window.App && window.App.navigate(sec), s);
    await page.waitForTimeout(700);
    const res = await page.evaluate(() => {
      const doc = document.documentElement;
      // Chi sfora davvero: si guardano gli elementi, non solo il totale.
      const offenders = [...document.querySelectorAll('.section-view.active *')]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 2)
        .slice(0, 3)
        .map((el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
      return { over: doc.scrollWidth - window.innerWidth, offenders };
    });
    if (res.over > 1) problems.push(`${vp.name} · ${s}: +${res.over}px  ${res.offenders.join(' ')}`);
  }

  /* Topbar e sidebar vivono fuori dalla vista attiva: un loro sforamento non
     comparirebbe nella misura qui sopra. */
  const shell = await page.evaluate(() => {
    const bad = [];
    const tb = document.querySelector('#topbar .tb');
    if (tb && tb.getBoundingClientRect().right > window.innerWidth + 2) bad.push('topbar');
    /* Sotto i 768px la sidebar è un pannello estraibile: è larga 264px ma
       tradotta fuori schermo. Misurarne la larghezza direbbe che occupa i due
       terzi del telefono, e sarebbe falso. Conta dove sta, non quanto misura:
       chiusa non deve rubare spazio, aperta deve starci dentro. */
    const sb = document.getElementById('sidebar');
    if (sb) {
      const r = sb.getBoundingClientRect();
      const fuoriCampo = r.right <= 1;                 // pannello ritratto
      if (!fuoriCampo && r.right > window.innerWidth + 2) bad.push('sidebar oltre il bordo');
      if (r.width > window.innerWidth) bad.push('sidebar più larga dello schermo');
    }
    return bad;
  });
  shell.forEach((b) => problems.push(`${vp.name} · shell: ${b}`));

  /* Le sovrapposizioni le definisce un solo posto in tutto il progetto:
     tests/qa/rilevatore.mjs. Prima ce n'erano due, con due idee diverse di
     cosa sia «visibile», e non erano d'accordo. */
  await page.addScriptTag({ content: RILEVATORE });
  const collisioni = await page.evaluate(() => {
    const sb = document.getElementById('sidebar');
    return sb ? sovrapposizioni(sb).length : 0;
  });
  if (collisioni > 0) problems.push(`${vp.name} · sidebar: ${collisioni} coppie di elementi sovrapposti`);

  /* Lo stesso, con i risultati della ricerca aperti: è la condizione in cui il
     pannello si disegnava sopra il menu invece di sostituirlo. */
  const conRicerca = await page.evaluate(async () => {
    const s = document.getElementById('nav-search');
    if (!s) return 0;
    document.querySelectorAll('#sidebar-nav .nav-group.collapsed').forEach((g) => g.classList.remove('collapsed'));
    s.value = 'a';
    ['input', 'keyup'].forEach((t) => s.dispatchEvent(new Event(t, { bubbles: true })));
    await new Promise((r) => setTimeout(r, 700));
    const sb = document.getElementById('sidebar');
    const vis = [...sb.querySelectorAll('*')].filter((e) => {
      const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
      if (r.width < 20 || r.height < 8 || !e.textContent.trim() || e.children.length > 3) return false;
      for (let a = e.parentElement; a && a !== sb; a = a.parentElement) {
        const ac = getComputedStyle(a);
        if (ac.maxHeight === '0px' || +ac.opacity === 0 || ac.display === 'none') return false;
      }
      // fuori dall'area visibile del contenitore che scorre: non è sullo schermo
      for (let a = e.parentElement; a; a = a.parentElement) {
        const ac = getComputedStyle(a);
        if (ac.overflow === 'auto' || ac.overflow === 'scroll' || ac.overflowY === 'auto' || ac.overflowY === 'scroll') {
          const ar = a.getBoundingClientRect();
          if (r.bottom <= ar.top + 1 || r.top >= ar.bottom - 1) return false;
        }
        if (a === sb) break;
      }
      return true;
    });
    let n = 0;
    for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
      const A = vis[i], B = vis[j];
      if (A.contains(B) || B.contains(A)) continue;
      const a = A.getBoundingClientRect(), c = B.getBoundingClientRect();
      if (Math.min(a.right, c.right) - Math.max(a.left, c.left) > 10 &&
          Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 10) n++;
    }
    s.value = ''; ['input', 'keyup'].forEach((t) => s.dispatchEvent(new Event(t, { bubbles: true })));
    return n;
  });
  if (conRicerca > 0) problems.push(`${vp.name} · sidebar con ricerca aperta: ${conRicerca} coppie sovrapposte`);

  /* Una modale che sfora è invisibile finché non la si apre. */
  const modale = await page.evaluate(async () => {
    if (!window.InglyUI) return null;
    InglyUI.openDialog({
      title: 'Verifica larghezza',
      body: '<p>Controllo che il dialogo stia dentro lo schermo.</p>',
      actions: [{ label: 'Chiudi', variant: 'primary', value: true }],
    });
    await new Promise((r) => setTimeout(r, 300));
    const d = document.querySelector('.modal-overlay.is-open .modal, .modal-overlay.is-open > div');
    const r = d ? d.getBoundingClientRect() : null;
    const over = r ? Math.max(0, Math.round(r.right - window.innerWidth), Math.round(-r.left)) : 0;
    document.querySelector('.modal-overlay.is-open [data-ds-action]')?.click();
    return over;
  });
  if (modale > 1) problems.push(`${vp.name} · modale: +${modale}px`);

  await page.evaluate(() => window.App && window.App.navigate('dashboard'));
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outDir, `${vp.name}.png`), fullPage: false });
  await page.close();
}

await browser.close();

console.log(`viewport verificati: ${VIEWPORTS.map((v) => v.name + ' ' + v.width).join(' · ')}`);
console.log(`sezioni per viewport: ${SECTIONS.length}`);
if (problems.length) {
  console.log(`\noverflow orizzontale in ${problems.length} combinazioni:`);
  for (const p of problems) console.log('  ' + p);
  process.exitCode = 1;
} else {
  console.log('\nnessun overflow orizzontale ✔');
}
