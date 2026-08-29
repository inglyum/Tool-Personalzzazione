#!/usr/bin/env node
/**
 * crm-paginazione.mjs — la paginazione dei clienti pagina davvero.
 *
 * Il difetto che presidia è stato misurato prima di essere corretto: la patch
 * 092 calcolava la pagina e poi chiamava il render originale, che ridisegnava
 * l'elenco intero. Con 137 contatti l'etichetta passava da «1 / 5» a «2 / 5» e
 * le righe restavano 137, le stesse. Due funzioni possedevano lo stesso
 * disegno, ognuna corretta per conto suo.
 *
 * Qui si prova la pipeline sola:
 *
 *     SOURCE → SEARCH → FILTER → SORT → PAGINATION → RENDER
 *
 * su nove dimensioni di rubrica, comprese quelle intorno ai bordi di pagina
 * dove gli errori di ±1 vivono.
 *
 *   node tests/qa/crm-paginazione.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const TAGLIE = [1, 25, 26, 49, 50, 51, 100, 245, 500];
const PER_PAGINA = 30;

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

const esito = await page.evaluate(async ({ TAGLIE, PER_PAGINA }) => {
  const out = { casi: [], errori: [] };
  if (!window.CRMSmart) { out.errori.push('CRMSmart assente'); return out; }

  /* Un dataset deterministico: nomi ordinabili, metà B2B, tutti con id
     assegnato dalla migrazione al primo caricamento. */
  const rubrica = (n) => {
    const c = [];
    for (let i = 1; i <= n; i++) {
      c.push({
        name: 'Cliente ' + String(i).padStart(4, '0'),
        email: 'c' + i + '@t.it',
        phone: i % 3 === 0 ? '' : '+3900' + i,
        company: i % 2 === 0 ? 'Azienda ' + i : '',
        vat: i % 2 === 0 ? 'IT' + (10000000000 + i) : '',
      });
    }
    return c;
  };

  const nomi = () => [...document.querySelectorAll('#crm-tbody tr')]
    .map((t) => (t.textContent.match(/Cliente \d{4}/) || [''])[0]).filter(Boolean);
  const bottone = (testo) => [...document.querySelectorAll('#view-clienti button')]
    .find((b) => b.textContent.trim() === testo);
  const info = () => (document.getElementById('crm-pag-info') || {}).textContent || '';

  const attendi = () => new Promise((s) => setTimeout(s, 120));

  for (const n of TAGLIE) {
    localStorage.setItem('ingly_crm_v1', JSON.stringify(rubrica(n)));
    CRMSmart._selected = new Set();
    CRMSmart._stato = { q: '', tipo: 'tutti', ordine: 'name_asc', pagina: 0, perPagina: PER_PAGINA };
    CRMSmart.render();
    await attendi();

    const pagineAttese = Math.max(1, Math.ceil(n / PER_PAGINA));
    const caso = { n, controlli: [] };
    const dice = (k, v) => caso.controlli.push({ k, v });

    /* Prima pagina */
    const p1 = nomi();
    dice('la prima pagina ha il numero giusto di righe', p1.length === Math.min(n, PER_PAGINA));
    dice('comincia dal primo contatto in ordine', p1[0] === 'Cliente 0001');
    dice('l\'informativa conta i contatti veri', info().includes('di ' + n));

    /* Tutte le pagine, una per una: nessun duplicato, nessun record perso */
    const visti = new Set(p1);
    let doppioni = 0;
    for (let p = 1; p < pagineAttese; p++) {
      CRMSmart.vaiAPagina(p);
      await attendi();
      const righe = nomi();
      if (righe.length === 0) { dice('pagina ' + (p + 1) + ' non vuota', false); break; }
      for (const r of righe) { if (visti.has(r)) doppioni++; visti.add(r); }
    }
    dice('nessun contatto compare in due pagine', doppioni === 0);
    dice('percorrendo le pagine si vedono tutti i ' + n + ' contatti', visti.size === n);

    /* first / previous / next / last, dai pulsanti veri */
    CRMSmart.vaiAPagina(0); await attendi();
    const primaPagina = nomi().join('|');
    const succ = bottone('Succ ›');
    dice('«Succ ›» è disabilitato solo quando serve', !!succ && (succ.disabled === (pagineAttese === 1)));
    if (pagineAttese > 1) {
      succ.click(); await attendi();
      dice('«Succ ›» cambia davvero i clienti', nomi().join('|') !== primaPagina);
      dice('«Succ ›» mostra righe piene', nomi().length === Math.min(PER_PAGINA, n - PER_PAGINA));
      bottone('‹ Prec').click(); await attendi();
      dice('«‹ Prec» torna alla pagina di prima', nomi().join('|') === primaPagina);
      bottone('Ultima »').click(); await attendi();
      dice('«Ultima »» va sull\'ultima pagina', info().includes('pagina ' + pagineAttese + ' di ' + pagineAttese));
      dice('l\'ultima pagina ha il resto giusto', nomi().length === (n % PER_PAGINA || PER_PAGINA));
      bottone('« Prima').click(); await attendi();
      dice('«« Prima» torna in cima', nomi().join('|') === primaPagina);
    }

    /* La dimensione di pagina */
    CRMSmart.setPerPagina(25); await attendi();
    dice('cambiando dimensione pagina cambiano le righe', nomi().length === Math.min(n, 25));
    dice('e si torna alla prima pagina', nomi()[0] === 'Cliente 0001');
    CRMSmart.setPerPagina(PER_PAGINA); await attendi();

    /* Il filtro si applica PRIMA della paginazione */
    CRMSmart.setTipo('b2b'); await attendi();
    const attesiB2B = Math.floor(n / 2);
    dice('il filtro conta i B2B veri (' + attesiB2B + ')', info().includes('di ' + attesiB2B) || (attesiB2B === 0 && info().includes('nessun')));
    dice('la pagina filtrata è piena quanto può', nomi().length === Math.min(attesiB2B, PER_PAGINA));
    CRMSmart.setTipo('tutti'); await attendi();

    /* La ricerca, anch'essa prima della paginazione */
    CRMSmart._stato.q = 'Cliente 0001'; CRMSmart._stato.pagina = 0; CRMSmart.render(); await attendi();
    dice('la ricerca trova un contatto solo', nomi().length === 1 && nomi()[0] === 'Cliente 0001');
    CRMSmart._stato.q = ''; CRMSmart.render(); await attendi();

    /* L'ordinamento inverso */
    CRMSmart.setOrdine('name_desc'); await attendi();
    dice('l\'ordine inverso comincia dall\'ultimo', nomi()[0] === 'Cliente ' + String(n).padStart(4, '0'));
    CRMSmart.setOrdine('name_asc'); await attendi();

    out.casi.push(caso);
  }

  /* ── L'identità non è la posizione ─────────────────────────────────────
     Il difetto che la paginazione, una volta funzionante, avrebbe reso
     attivo: modificare o cancellare il contatto in fondo a pagina 4. */
  localStorage.setItem('ingly_crm_v1', JSON.stringify(rubrica(137)));
  CRMSmart._selected = new Set();
  CRMSmart._stato = { q: '', tipo: 'tutti', ordine: 'name_asc', pagina: 0, perPagina: PER_PAGINA };
  CRMSmart.render(); await attendi();
  CRMSmart.vaiAPagina(3); await attendi();
  const identita = { controlli: [], n: 'identità' };
  const d2 = (k, v) => identita.controlli.push({ k, v });

  const inPagina = nomi();
  const bersaglio = inPagina[inPagina.length - 1];
  const riga = [...document.querySelectorAll('#crm-tbody tr')].find((t) => t.textContent.includes(bersaglio));
  const idBersaglio = riga.id.slice('crm-row-'.length);
  d2('la riga porta un id, non una posizione', !!idBersaglio && !/^\d+$/.test(idBersaglio));

  const prima = CRMSmart._load().length;
  CRMSmart._save(CRMSmart._load().filter((c) => String(c.id) !== idBersaglio));
  CRMSmart.render(); await attendi();
  const rimasti = CRMSmart._load();
  d2('cancellando per id sparisce quel contatto', !rimasti.some((c) => c.name === bersaglio));
  d2('e uno solo', rimasti.length === prima - 1);

  /* La selezione sopravvive al cambio pagina, perché è fatta di id. */
  CRMSmart._selected = new Set();
  CRMSmart.vaiAPagina(0); await attendi();
  const idPrimo = [...document.querySelectorAll('#crm-tbody tr')][0].id.slice('crm-row-'.length);
  CRMSmart._onCheck(idPrimo, true);
  CRMSmart.vaiAPagina(2); await attendi();
  d2('la selezione sopravvive al cambio pagina', CRMSmart._selected.has(String(idPrimo)));
  CRMSmart.vaiAPagina(0); await attendi();
  const chk = document.getElementById('crm-chk-' + idPrimo);
  d2('e tornando indietro la casella è ancora spuntata', !!chk && chk.checked);
  out.casi.push(identita);

  /* ── Prestazione: 5.000 contatti ───────────────────────────────────── */
  localStorage.setItem('ingly_crm_v1', JSON.stringify(rubrica(5000)));
  CRMSmart._selected = new Set();
  CRMSmart._stato = { q: '', tipo: 'tutti', ordine: 'name_asc', pagina: 0, perPagina: PER_PAGINA };
  const t0 = performance.now();
  CRMSmart.render();
  const ms = performance.now() - t0;
  await attendi();
  const perf = { n: 'prestazione', controlli: [
    { k: '5.000 contatti: disegna solo la pagina (' + nomi().length + ' righe)', v: nomi().length === PER_PAGINA },
    { k: '5.000 contatti: render in ' + Math.round(ms) + ' ms (soglia 1500)', v: ms < 1500 },
  ] };
  out.casi.push(perf);

  localStorage.removeItem('ingly_crm_v1');
  return out;
}, { TAGLIE, PER_PAGINA });

console.log('\nPAGINAZIONE CRM — SOURCE → SEARCH → FILTER → SORT → PAGINATION → RENDER\n');
const problemi = [];
for (const caso of esito.casi) {
  const rossi = caso.controlli.filter((c) => !c.v);
  console.log('  ' + (rossi.length ? '✘' : '✔') + '  ' + (typeof caso.n === 'number' ? String(caso.n).padStart(4) + ' contatti' : caso.n)
    + '  ' + (caso.controlli.length - rossi.length) + '/' + caso.controlli.length);
  rossi.forEach((c) => { console.log('        ✘ ' + c.k); problemi.push(caso.n + ': ' + c.k); });
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
console.log('\nla paginazione dei clienti pagina davvero ✔\n');
await browser.close();
