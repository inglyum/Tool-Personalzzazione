#!/usr/bin/env node
/**
 * quoter3d-materiali-slicer.mjs — FASI 10-12 del collaudo funzionale.
 *
 * Tre domande, una per fase:
 *
 *   FASE 10  la macchina scelta comanda i parametri, e non li azzera
 *   FASE 11  il materiale ha una fonte sola per volta, e la dichiara
 *   FASE 12  i grammi dello slicer non si contano due volte
 *
 * La terza è quella che ha già prodotto un difetto misurato — il campo che
 * mostrava 290 g mentre il motore ne usava 2 — e qui si verifica che le tre
 * sorgenti dichiarate (`MODEL_ONLY`, `COMPLETE_SLICER_TOTAL`,
 * `MANUAL_BREAKDOWN`) arrivino davvero al motore, una per volta.
 *
 *   node tests/qa/quoter3d-materiali-slicer.mjs [file]
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
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

await page.evaluate(async () => {
  window.__q = {
    a: (ms) => new Promise((s) => setTimeout(s, ms)),
    set: (id, val) => {
      const e = document.getElementById(id);
      if (!e) return false;
      e.value = val;
      e.dispatchEvent(new Event('input', { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    get: (id) => { const e = document.getElementById(id); return e ? e.value : null; },
    ing: () => Print3DQuoter._ingresso(),
    vivo: () => Print3DQuoter._calcolo() || {},
  };
  App.navigate('print3d');
  await new Promise((s) => setTimeout(s, 3500));
});

/* ── FASE 10 · le macchine ──────────────────────────────────────────────── */
const macchine = await page.evaluate(async () => {
  const { a, set, get } = window.__q;
  Print3DQuoter.setType('fdm');
  await a(700);
  const partenza = { watt: get('p3d-watt'), mc: get('p3d-mc'), lh: get('p3d-lh') };

  const sel = document.getElementById('p3d-mach');
  const modelli = [...sel.querySelectorAll('option')].map((o) => o.value).filter(Boolean);
  /* Due modelli diversi del listino: se i campi si muovono per entrambi e in
     modo diverso, la scelta comanda davvero. */
  const scelte = [];
  for (const id of modelli.slice(0, 3)) {
    Print3DQuoter.pickMach(id);
    await a(450);
    scelte.push({ id, watt: get('p3d-watt'), mc: get('p3d-mc'), lh: get('p3d-lh'),
      suggerimento: (document.getElementById('p3d-mach-hint') || {}).textContent || '' });
  }
  /* «— Seleziona macchina —»: nessun id, nessuna macchina, nessun crollo. */
  let eccezioneVuoto = null;
  const primaDelVuoto = { watt: get('p3d-watt'), mc: get('p3d-mc') };
  try { Print3DQuoter.pickMach(''); } catch (e) { eccezioneVuoto = String(e); }
  await a(400);
  const dopoVuoto = { watt: get('p3d-watt'), mc: get('p3d-mc') };

  return { partenza, modelli: modelli.length, scelte, eccezioneVuoto, primaDelVuoto, dopoVuoto };
});
dico('FASE 10 · senza scegliere niente i parametri sono quelli della tecnologia ('
  + macchine.partenza.watt + 'W · ' + macchine.partenza.mc + '€ · ' + macchine.partenza.lh + 'h)',
  macchine.partenza.watt === '150' && macchine.partenza.mc === '420' && macchine.partenza.lh === '3000');
dico('FASE 10b · la tendina elenca dei modelli (' + macchine.modelli + ')', macchine.modelli >= 5);
dico('FASE 10c · sceglierne uno riempie i tre campi ('
  + macchine.scelte.map((s) => s.watt + 'W/' + s.mc + '€/' + s.lh + 'h').join(' · ') + ')',
  macchine.scelte.every((s) => Number(s.watt) > 0 && Number(s.mc) > 0 && Number(s.lh) > 0));
dico('FASE 10d · e macchine diverse portano numeri diversi',
  new Set(macchine.scelte.map((s) => s.watt + '/' + s.mc + '/' + s.lh)).size >= 2);
dico('FASE 10e · il suggerimento dichiara il costo orario di quella macchina',
  macchine.scelte.every((s) => /\/h/.test(s.suggerimento)));
dico('FASE 10f · scegliere la voce vuota non lancia eccezioni ('
  + (macchine.eccezioneVuoto || 'nessuna') + ')', macchine.eccezioneVuoto === null);
dico('FASE 10g · e non azzera i campi già compilati ('
  + macchine.dopoVuoto.watt + 'W · ' + macchine.dopoVuoto.mc + '€)',
  macchine.dopoVuoto.watt === macchine.primaDelVuoto.watt
  && macchine.dopoVuoto.mc === macchine.primaDelVuoto.mc);

/* ── FASE 11 · i materiali ──────────────────────────────────────────────── */
const materiali = await page.evaluate(async () => {
  const { a, set, get } = window.__q;
  const sel = document.getElementById('p3d-mat');
  const opzioni = [...sel.querySelectorAll('option')]
    .map((o) => ({ id: o.value, testo: o.textContent })).filter((o) => o.id);
  const prove = [];
  for (const o of opzioni.slice(0, 3)) {
    Print3DQuoter.pickMat(o.id);
    await a(450);
    prove.push({
      id: o.id, testo: o.testo,
      prezzo: get('p3d-mkg'), unita: get('p3d-mu'),
      /* La provenienza dichiarata dal motore, non dedotta dal menu. */
      fonte: ((window.__q.vivo()._costo || {}).provenienza || [])
        .filter((x) => x.id === 'materiale').map((x) => x.source)[0] || null,
    });
  }
  /* Un prezzo scritto a mano resta di chi lo ha scritto. */
  set('p3d-mkg', '99');
  Print3DQuoter.setPrezzoMat('99');
  await a(450);
  const aMano = {
    prezzo: get('p3d-mkg'),
    fonte: ((window.__q.vivo()._costo || {}).provenienza || [])
      .filter((x) => x.id === 'materiale').map((x) => x.source)[0] || null,
  };
  return { quanti: opzioni.length, prove, aMano,
    nonAMagazzino: opzioni.filter((o) => /non a magazzino/.test(o.testo)).length };
});
dico('FASE 11 · il menu materiali non è vuoto (' + materiali.quanti + ')', materiali.quanti >= 1);
dico('FASE 11b · sceglierne uno porta il suo prezzo e la sua unità ('
  + materiali.prove.map((p) => p.prezzo + '/' + p.unita).join(' · ') + ')',
  materiali.prove.every((p) => Number(p.prezzo) > 0 && Number(p.unita) > 0));
dico('FASE 11c · i materiali che non stanno a magazzino lo dichiarano ('
  + materiali.nonAMagazzino + ' su ' + materiali.quanti + ')',
  materiali.nonAMagazzino >= 1);
dico('FASE 11d · e la loro provenienza non è «inventario» ('
  + materiali.prove.map((p) => p.fonte).join(' · ') + ')',
  materiali.prove.every((p) => p.fonte !== 'inventory'));
dico('FASE 11e · un prezzo scritto a mano resta scritto a mano ('
  + materiali.aMano.prezzo + ' · ' + materiali.aMano.fonte + ')',
  materiali.aMano.prezzo === '99' && materiali.aMano.fonte !== 'inventory');

/* ── FASE 12 · lo slicer, e il doppio conteggio ─────────────────────────── */
const slicer = await page.evaluate(async () => {
  const { a, set, ing } = window.__q;
  Print3DQuoter.svuotaSlicer();
  await a(400);
  set('p3d-g', '100');
  set('p3d-sup', '20');
  set('p3d-h', '2');
  Print3DQuoter.calc();
  await a(450);
  const manuale = ing();

  /* Totale che comprende già supporti e spurgo: non si somma altro. */
  Print3DQuoter.setSlicer('pesoTotale', 300);
  Print3DQuoter.setSlicer('supporti', 40);
  Print3DQuoter.setSlicer('purge', 10);
  Print3DQuoter.setSlicer('includeTutto', true);
  await a(600);
  const compreso = ing();

  /* Le stesse voci, dichiarate separate: adesso si sommano. */
  Print3DQuoter.setSlicer('includeTutto', false);
  await a(600);
  const separato = ing();

  /* Il guardiano: supporti compilati con il peso del modello. */
  Print3DQuoter.setSlicer('includeTutto', true);
  Print3DQuoter.setSlicer('supporti', 290);
  Print3DQuoter.setSlicer('purge', 0);
  await a(600);
  const sospetto = {
    ing: ing(),
    avviso: (document.getElementById('view-print3d') || document.body).innerText,
  };

  Print3DQuoter.svuotaSlicer();
  await a(600);
  const svuotato = ing();
  return { manuale, compreso, separato, sospetto: { ing: sospetto.ing,
    avvisa: /supporti|sospett|verifica/i.test(sospetto.avviso) }, svuotato };
});
dico('FASE 12 · senza slicer comandano i campi ('
  + slicer.manuale.filamentWeightSource + ' · ' + slicer.manuale.totalFilamentGrams + ' g)',
  slicer.manuale.filamentWeightSource === 'MODEL_ONLY'
  && Math.abs(slicer.manuale.totalFilamentGrams - 120) < 0.01);
dico('FASE 12b · un totale che comprende tutto non si somma due volte ('
  + slicer.compreso.filamentWeightSource + ' · ' + slicer.compreso.totalFilamentGrams + ' g)',
  slicer.compreso.filamentWeightSource === 'COMPLETE_SLICER_TOTAL'
  && Math.abs(slicer.compreso.totalFilamentGrams - 300) < 0.01);
dico('FASE 12c · e il modello è il totale meno supporti e spurgo ('
  + slicer.compreso.grams + ' g)', Math.abs(slicer.compreso.grams - 250) < 0.01);
dico('FASE 12d · dichiarate separate, le voci si sommano ('
  + slicer.separato.filamentWeightSource + ' · ' + slicer.separato.totalFilamentGrams + ' g)',
  slicer.separato.filamentWeightSource === 'MANUAL_BREAKDOWN'
  && Math.abs(slicer.separato.totalFilamentGrams - 350) < 0.01);
dico('FASE 12e · un modello che pesa meno di un quinto del totale è dichiarato sospetto ('
  + slicer.sospetto.ing.grams + ' g su 300)', slicer.sospetto.avvisa === true);
dico('FASE 12f · svuotando lo slicer tornano a comandare i campi ('
  + slicer.svuotato.filamentWeightSource + ' · ' + slicer.svuotato.totalFilamentGrams + ' g)',
  slicer.svuotato.filamentWeightSource === 'MODEL_ONLY'
  && Math.abs(slicer.svuotato.totalFilamentGrams - 120) < 0.01);
dico('FASE 12g · nessuna delle cinque letture produce un numero non finito',
  [slicer.manuale, slicer.compreso, slicer.separato, slicer.sospetto.ing, slicer.svuotato]
    .every((i) => isFinite(i.grams) && isFinite(i.totalFilamentGrams) && i.grams >= 0));

/* ── FASE 19 · «→ Quoter», fino in fondo ────────────────────────────────── */
/* Il collaudo esistente sostituisce `addLineFromCalc` con una spia: prova che
   la chiamata parte. Qui non si sostituisce niente — si guarda se la riga
   arriva davvero nello Smart Quoter, con il costo e non solo con il nome. */
const consegna = await page.evaluate(async () => {
  const { a, set } = window.__q;
  App.navigate('print3d');
  await a(2500);
  Print3DQuoter.clearLines();
  await a(400);

  /* Senza voci non si consegna niente, e non si cambia pagina. */
  const primaVuoto = (window.Quoter && window.Quoter.lines ? window.Quoter.lines.length : 0);
  Print3DQuoter.sendQ();
  await a(600);
  const vuoto = {
    righeQuoter: (window.Quoter && window.Quoter.lines ? window.Quoter.lines.length : 0),
    vista: (document.querySelector('.section-view.active') || {}).id || null,
  };

  App.navigate('print3d');
  await a(2000);
  set('p3d-g', '100'); set('p3d-h', '2'); set('p3d-qty', '3');
  set('p3d-name', 'Staffa collaudo');
  Print3DQuoter.calc();
  await a(500);
  const costoPezzo = (Print3DQuoter._calcolo() || {}).costo;
  Print3DQuoter.addLine();
  await a(600);
  Print3DQuoter.sendQ();
  await a(2500);
  const righe = (window.Quoter && window.Quoter.lines) ? window.Quoter.lines : [];
  return {
    primaVuoto, vuoto, costoPezzo,
    dopo: righe.length,
    ultima: righe.length ? righe[righe.length - 1] : null,
    vista: (document.querySelector('.section-view.active') || {}).id || null,
  };
});
dico('FASE 19 · un preventivo vuoto non consegna niente ('
  + consegna.vuoto.righeQuoter + ' righe)', consegna.vuoto.righeQuoter === consegna.primaVuoto);
dico('FASE 19b · e non porta l utente altrove (' + consegna.vuoto.vista + ')',
  consegna.vuoto.vista === 'view-print3d');
dico('FASE 19c · con una voce, la riga arriva davvero nello Smart Quoter ('
  + consegna.dopo + ')', consegna.dopo === consegna.primaVuoto + 1);
dico('FASE 19d · con il suo nome e la sua quantità ('
  + (consegna.ultima ? consegna.ultima.name + ' ×' + consegna.ultima.qty : '—') + ')',
  !!consegna.ultima && consegna.ultima.name === 'Staffa collaudo' && consegna.ultima.qty === 3);
dico('FASE 19e · e con il costo, non solo con il prezzo ('
  + (consegna.ultima ? consegna.ultima.unitCost : '—') + ' vs '
  + (consegna.costoPezzo != null ? consegna.costoPezzo.toFixed(3) : '—') + ')',
  !!consegna.ultima && consegna.costoPezzo > 0
  && Math.abs(consegna.ultima.unitCost - consegna.costoPezzo) < 0.05);
dico('FASE 19f · e la consegna porta allo Smart Quoter (' + consegna.vista + ')',
  consegna.vista === 'view-quoter');

console.log('\nSMART QUOTER 3D — MACCHINA, MATERIALE, SLICER\n');
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
console.log('\nmacchina, materiale e slicer dicono da dove viene ogni grammo ✔\n');
await browser.close();
