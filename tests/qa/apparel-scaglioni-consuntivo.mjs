#!/usr/bin/env node
/**
 * apparel-scaglioni-consuntivo.mjs — il tessile smette di essere cieco a valle.
 *
 * Due difetti misurati prima della correzione:
 *
 *   · gli scaglioni c'erano e i conti erano giusti, ma ogni riquadro mostrava
 *     **solo il totale**. Costo/pz, prezzo/pz e margine `calcQuote` li
 *     calcolava e li buttava via — e nessuno diceva quale scaglione conviene,
 *     che è la domanda di chi sta al telefono;
 *   · il consuntivo non esisteva. Il preventivo diceva quanto dovrebbe costare
 *     e nessuno tornava mai a dire quanto è costato. Sul tessile, dove lo
 *     scarto è la voce grossa, «è andata come previsto» e «non lo so» sono due
 *     cose diverse, e confonderle è il modo in cui un laboratorio resta
 *     convinto di guadagnare.
 *
 *   node tests/qa/apparel-scaglioni-consuntivo.mjs [file]
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
  ['ingly_wizard_done_v2', 'ingly_tour_done_v1', '_wizard_done_v37'].forEach((k) => localStorage.setItem(k, '1'));
  localStorage.setItem('ingly_color_scheme', 'dark');
  /* Un consuntivo nel vecchio archivio del 3D: deve essere assorbito, non perso. */
  localStorage.setItem('p3d_consuntivo_v1', JSON.stringify({ 77: { costo: 4.5 } }));
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(14000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* ── 1 · UN REGISTRO SOLO ───────────────────────────────────────────────── */
const reg = await page.evaluate(() => {
  if (typeof InglyConsuntivo === 'undefined') return { assente: true };
  const C = InglyConsuntivo;
  C.salva('apparel', 1, { capi: 10 });
  C.salva('3d', 1, { costo: 99 });
  return {
    tessile: C.leggi('apparel', 1),
    tridi: C.leggi('3d', 1),
    migrato: C.leggi('3d', 77),
    legacyIntatto: !!localStorage.getItem('p3d_consuntivo_v1'),
    chiavi: Object.keys(JSON.parse(localStorage.getItem('ingly_consuntivo_v1') || '{}')),
  };
});
dico('il registro dei consuntivi esiste', !reg.assente);
dico('il consuntivo del vecchio archivio 3D è stato assorbito', reg.migrato && reg.migrato.costo === 4.5);
dico('e il vecchio archivio non è stato svuotato', reg.legacyIntatto);
dico('la riga 1 del tessile e la riga 1 del 3D non si pestano i piedi',
  reg.tessile.capi === 10 && reg.tridi.costo === 99);
dico('le chiavi portano il modulo davanti (' + (reg.chiavi || []).slice(0, 3).join(', ') + ')',
  (reg.chiavi || []).every((k) => /^(3d|apparel)\//.test(k)));

/* Un solo archivio di consuntivi in localStorage, non due che divergono. */
const archivi = await page.evaluate(() =>
  Object.keys(localStorage).filter((k) => /consuntiv/i.test(k)));
dico('nessun archivio consuntivo parallelo (' + archivi.join(', ') + ')',
  archivi.filter((k) => k !== 'p3d_consuntivo_v1' && !/migrato/.test(k)).length === 1);

/* ── 2 · SCAGLIONI COERENTI ─────────────────────────────────────────────── */
await page.evaluate(() => App.navigate('apparel'));
await page.waitForTimeout(2500);
await page.evaluate(async () => {
  ApparelQuoter.newQuote();
  await new Promise((r) => setTimeout(r, 900));
  ApparelQuoter.addLine();
  await new Promise((r) => setTimeout(r, 900));
});
const testoEditor = await page.evaluate(() => (document.getElementById('view-apparel') || {}).textContent || '');
dico('l editor del preventivo si apre', testoEditor.length > 200);
dico('il riquadro delle quantità è in pagina', /Quanti ne fa/.test(testoEditor));
dico('mostra il costo per pezzo, non solo il totale', /Costo\/pz/.test(testoEditor));
dico('mostra il prezzo per pezzo', /Prezzo\/pz/.test(testoEditor));
dico('mostra il margine per scaglione', /Marg\./.test(testoEditor));
dico('il riquadro del consuntivo è in pagina', /Consuntivo/.test(testoEditor));
dico('e dichiara che manca invece di dare zero', /Registra i costi sostenuti|nessun costo reale/i.test(testoEditor));

/* I numeri devono reggere: costo/pz non può crescere con la quantità, perché
   l'avviamento si spalma. */
const monot = await page.evaluate(() => {
  /* Si interroga la funzione vera, con un preventivo costruito qui: è il modo
     di verificare i numeri e non il disegno. */
  const q = { id: 'qa-mono', lines: [{ tech: 'dtf', qty: 1, buyPrice: 4, printCost: 1.2, margin: 40, setupCost: 20 }] };
  const s = { techCosts: {}, qtyDiscounts: {}, energyKwh: 0.25, energyWatts: 800, laborHourly: 15,
    machineHourly: 5, packPerPiece: 0.2, vatPct: 22, failureRate: 0, marginePavimentoPct: 10 };
  const r = ApparelQuoter.scaglioni(q, s);
  const v = r.voci.filter((x) => !x.indisponibile);
  return {
    n: v.length,
    costi: v.map((x) => +x.costoPezzo.toFixed(4)),
    prezzi: v.map((x) => +x.prezzoPezzo.toFixed(4)),
    totali: v.map((x) => +x.totale.toFixed(2)),
    migliori: r.migliori,
  };
});
dico('gli scaglioni sono ' + monot.n, monot.n === 11);
dico('il costo per pezzo non cresce con la quantità',
  monot.costi.every((c, i) => i === 0 || c <= monot.costi[i - 1] + 1e-9));
dico('il totale cresce con la quantità',
  monot.totali.every((t, i) => i === 0 || t >= monot.totali[i - 1] - 1e-9));
dico('il miglior costo unitario è la quantità più alta (l avviamento si spalma)',
  monot.migliori.unitario === 200);
dico('il migliore per il cliente è indicato', monot.migliori.cliente != null);
dico('il profitto totale più alto è indicato', monot.migliori.profitto != null);

/* ── 3 · IL CONSUNTIVO NON MENTE ────────────────────────────────────────── */
const conf = await page.evaluate(() => {
  const q = { id: 'qa-cons', lines: [{ tech: 'dtf', qty: 10, buyPrice: 4, printCost: 1.2, margin: 40 }] };
  const s = { techCosts: {}, qtyDiscounts: {}, energyKwh: 0.25, energyWatts: 800, laborHourly: 15,
    machineHourly: 5, packPerPiece: 0.2, vatPct: 22, failureRate: 0, marginePavimentoPct: 10 };

  InglyConsuntivo.cancella('apparel', 'qa-cons');
  const senza = ApparelQuoter.scostamentoDi(q, s);

  const prev = ApparelQuoter.previstoDi(q, s);
  const con = (fattore) => {
    InglyConsuntivo.salva('apparel', 'qa-cons', { capi: prev.costoTotale * fattore });
    return ApparelQuoter.scostamentoDi(q, s);
  };

  const sopra25 = con(1.25);   // oltre il 20%: sforato
  const confine = con(1.20);   // esattamente il 20%: «oltre» non è, quindi sopra
  const sopra10 = con(1.10);   // sopra ma entro
  const centrato = con(1.02);  // in linea
  const sotto = con(0.80);

  return {
    senzaDisponibile: senza.disponibile,
    senzaMotivo: senza.motivo || '',
    senzaHaPreventivato: !!(senza.preventivato && senza.preventivato.costo > 0),
    sopraCosto: sopra25.scostamento.costo,
    sopraCostoPct: sopra25.scostamento.costoPct,
    sforato: sopra25.verdetto.id,
    confine: confine.verdetto.id,
    sopra: sopra10.verdetto.id,
    centrato: centrato.verdetto.id,
    sottoVerdetto: sotto.verdetto.id,
    prevCosto: prev.costoTotale,
  };
});
dico('senza consuntivo dichiara che manca, non «zero scostamento»', conf.senzaDisponibile === false);
dico('e lo dice con parole, non col silenzio', conf.senzaMotivo.length > 0);
dico('ma il preventivato lo mostra lo stesso', conf.senzaHaPreventivato);
dico('un costo sopra il preventivo dà scostamento positivo', conf.sopraCosto > 0);
dico('e la percentuale è coerente (' + (conf.sopraCostoPct || 0).toFixed(1) + '%)',
  Math.abs((conf.sopraCostoPct || 0) - 25) < 0.5);
dico('+25% è «sforato»', conf.sforato === 'sforato');
/* Il confine conta: l'etichetta dice «oltre il 20%», e 20% esatto non è oltre.
   Il primo tentativo di questo test provava 1,20 aspettandosi «sforato» — era
   il test a essere impreciso, non la soglia. */
dico('+20% esatto non è «oltre il 20%»: resta «sopra»', conf.confine === 'sopra');
dico('+10% è «sopra», non ancora sforato', conf.sopra === 'sopra');
dico('+2% è «in linea»', conf.centrato === 'centrato');
dico('−20% dà verdetto «sotto»', conf.sottoVerdetto === 'sotto');

/* ── 4 · PERSISTENZA ────────────────────────────────────────────────────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(14000);
const dopo = await page.evaluate(() => ({
  tessile: InglyConsuntivo.leggi('apparel', 1).capi,
  tridi: InglyConsuntivo.leggi('3d', 1).costo,
  migrato: InglyConsuntivo.leggi('3d', 77).costo,
  /* Se un consuntivo manca si vuole vedere che cosa c'è davvero
     nell'archivio, non solo che manca. */
  archivio: localStorage.getItem('ingly_consuntivo_v1'),
}));
dico('dopo la ricarica il consuntivo tessile c è ancora', dopo.tessile === 10);
dico('e quello 3D pure', dopo.tridi === 99);
dico('e il migrato non è stato duplicato né perso', dopo.migrato === 4.5);
if (dopo.tessile !== 10 || dopo.tridi !== 99) {
  console.error('  archivio dopo il ricaricamento: ' + dopo.archivio);
}

console.log('\nAPPAREL — SCAGLIONI E CONSUNTIVO\n');
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
console.log('\nil tessile sa come è andata ✔\n');
await browser.close();
