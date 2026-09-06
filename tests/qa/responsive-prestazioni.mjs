#!/usr/bin/env node
/**
 * responsive-prestazioni.mjs — FASI 30-31 del collaudo funzionale.
 *
 * Due domande che si misurano e non si giudicano a occhio:
 *
 *   FASE 30  a cinque larghezze, nessun modulo principale sborda in
 *            orizzontale e nessuno resta senza contenuto
 *   FASE 31  quanto ci mette ogni modulo ad apparire, e quanto pesa il
 *            documento che ne esce
 *
 * Sulla soglia delle prestazioni: non c'è un numero «giusto» in astratto. Si
 * dichiara qui quello che questo prodotto deve rispettare — un modulo entro
 * 2,5 s su una macchina da collaudo — e si riporta il tempo misurato, così la
 * soglia si può discutere guardando i numeri invece che le impressioni.
 *
 *   node tests/qa/responsive-prestazioni.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';

/* Le cinque larghezze: telefono, telefono grande, tablet, portatile, scrivania. */
const LARGHEZZE = [
  { w: 390, h: 844, nome: 'telefono' },
  { w: 430, h: 932, nome: 'telefono grande' },
  { w: 768, h: 1024, nome: 'tablet' },
  { w: 1366, h: 768, nome: 'portatile' },
  { w: 1920, h: 1080, nome: 'scrivania' },
];

const PRINCIPALI = ['dashboard', 'gestione_ordini', 'catalog', 'clients', 'items',
  'quoter', 'print3d', 'laser_b2b', 'equipment', 'settings'];

const SOGLIA_MS = 2500;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const erroriJS = [];
const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

async function apri(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => erroriJS.push(w + 'px · ' + String(e.message).slice(0, 120)));
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  await page.addInitScript(() => {
    ['ingly_wizard_done_v2', 'ingly_tour_done_v1', '_wizard_done_v37', '_v37sidebar_done']
      .forEach((k) => localStorage.setItem(k, '1'));
    localStorage.setItem('ingly_color_scheme', 'dark');
  });
  await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(14000);
  return page;
}

/* ── FASE 30 · le cinque larghezze ──────────────────────────────────────── */
const misure = [];
for (const L of LARGHEZZE) {
  const page = await apri(L.w, L.h);
  const r = await page.evaluate(async (sezioni) => {
    const a = (ms) => new Promise((s) => setTimeout(s, ms));
    const out = [];
    for (const s of sezioni) {
      window.App.navigate(s);
      await a(900);
      const vista = [...document.querySelectorAll('.section-view.active')][0];
      /* Sborda chi è più largo della finestra: si misura sul documento, che è
         quello che produce la barra di scorrimento orizzontale. */
      const sbordo = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
      out.push({
        sez: s,
        testo: vista ? (vista.innerText || '').trim().length : 0,
        sbordo,
      });
    }
    return out;
  }, PRINCIPALI);
  misure.push({ L, r });
  await page.close();
}

for (const m of misure) {
  const sbordanti = m.r.filter((x) => x.sbordo > 4);
  const vuoti = m.r.filter((x) => x.testo < 120);
  dico('FASE 30 · ' + m.L.nome + ' (' + m.L.w + 'px): nessun modulo sborda in orizzontale'
    + (sbordanti.length ? ' — ' + sbordanti.map((x) => x.sez + ' +' + x.sbordo + 'px').join(', ') : ''),
    sbordanti.length === 0);
  dico('FASE 30b · ' + m.L.nome + ' (' + m.L.w + 'px): tutti i moduli mostrano contenuto'
    + (vuoti.length ? ' — ' + vuoti.map((x) => x.sez).join(', ') : ''),
    vuoti.length === 0);
}

/* ── FASE 31 · quanto ci mette, e quanto pesa ───────────────────────────── */
const page = await apri(1440, 900);
const prestazioni = await page.evaluate(async (dati) => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const tempi = [];
  for (const s of dati.sezioni) {
    /* Si va prima altrove, così ogni misura parte da un modulo diverso. */
    window.App.navigate('dashboard');
    await a(500);
    const t0 = performance.now();
    window.App.navigate(s);
    /* «Apparso» = la vista è attiva e ha del testo: si attende quello, non un
       tempo fisso, altrimenti si misurerebbe il `setTimeout` del collaudo. */
    let pronto = 0;
    for (let i = 0; i < 120; i += 1) {
      const v = [...document.querySelectorAll('.section-view.active')][0];
      if (v && (v.innerText || '').trim().length > 120) { pronto = performance.now() - t0; break; }
      await a(25);
    }
    tempi.push({ sez: s, ms: pronto ? Math.round(pronto) : null });
  }
  const nav = performance.getEntriesByType('navigation')[0] || {};
  return {
    tempi,
    caricamento: Math.round(nav.domContentLoadedEventEnd || 0),
    nodi: document.querySelectorAll('*').length,
  };
}, { sezioni: PRINCIPALI });
await page.close();

const lenti = prestazioni.tempi.filter((t) => t.ms === null || t.ms > 2500);
dico('FASE 31 · ogni modulo principale appare entro ' + SOGLIA_MS + ' ms ('
  + prestazioni.tempi.map((t) => t.sez + ' ' + (t.ms === null ? '—' : t.ms)).join(' · ') + ')',
  lenti.length === 0);
dico('FASE 31b · il documento non supera i 20.000 nodi (' + prestazioni.nodi + ')',
  prestazioni.nodi > 0 && prestazioni.nodi < 20000);
dico('FASE 31c · il DOM iniziale è pronto entro 15 s (' + prestazioni.caricamento + ' ms)',
  prestazioni.caricamento > 0 && prestazioni.caricamento < 15000);

console.log('\nCINQUE LARGHEZZE, DIECI MODULI, E IL TEMPO CHE CI METTONO\n');
console.log('  larghezza        │ sbordo massimo │ moduli vuoti');
for (const m of misure) {
  const max = Math.max(...m.r.map((x) => x.sbordo));
  console.log('  ' + (m.L.nome + ' (' + m.L.w + ')').padEnd(17) + '│ '
    + String(max + 'px').padStart(14) + ' │ ' + m.r.filter((x) => x.testo < 120).length);
}
console.log('\n  modulo               │ tempo di apparizione');
for (const t of prestazioni.tempi) {
  console.log('  ' + t.sez.padEnd(21) + '│ ' + (t.ms === null ? 'non apparso' : t.ms + ' ms'));
}
console.log('');

const problemi = [];
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
console.log('\ncontrolli: ' + passi.length + ' · errori JavaScript: ' + erroriJS.length);
if (erroriJS.length) [...new Set(erroriJS)].slice(0, 8).forEach((e) => console.log('  · ' + e));
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nl applicazione sta nello schermo e risponde in tempo ✔\n');
await browser.close();
