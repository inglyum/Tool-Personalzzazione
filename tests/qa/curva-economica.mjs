#!/usr/bin/env node
/**
 * curva-economica.mjs — «verificare che nessun costo esploda».
 *
 * Una stampa da 24 ore non deve costare venti volte una da 1 ora se il
 * materiale è lo stesso: il materiale è fisso, il tempo aggiunge macchina,
 * energia e manutenzione, e basta. Un motore che sbaglia qui produce
 * preventivi che nessuno accetta, o che fanno perdere soldi, e l'errore non
 * si vede su un caso solo — si vede sulla curva.
 *
 * Qui la curva si misura: 1, 3, 5, 9, 15, 24 ore, più il caso reale
 * 9h57m / 250 g di PLA. Poi laser (taglio e incisione) e UV (supporto,
 * inchiostro, primer, tempo), con la stessa domanda: ogni ingrediente sposta
 * il costo nella direzione giusta, e nessuno lo fa esplodere.
 *
 *   node tests/qa/curva-economica.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
page.on('dialog', (d) => d.accept().catch(() => {}));
await page.addInitScript(() => {
  ['ingly_wizard_done_v2', 'ingly_tour_done_v1', '_wizard_done_v37', '_v37sidebar_done']
    .forEach((k) => localStorage.setItem(k, '1'));
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });
const eu = (v) => (v == null ? '—' : '€' + v.toFixed(2));

/* ── 3D · la curva del tempo ────────────────────────────────────────────── */

const tre = await page.evaluate(() => {
  const CE = window.InglyCostEngine;
  const base = { tecnologia: 'print3d', qty: 1, grams: 250, materialPricePerKg: 22,
    machinePrice: 800, machineLifeHours: 5000, averagePowerW: 120, kwhPrice: 0.28,
    laborPerHour: 18, setupMin: 10 };
  const ore = [1, 3, 5, 9, 15, 24];
  const punti = ore.map((h) => {
    const r = CE.calcola(Object.assign({}, base, { hours: h }));
    return { ore: h, costo: r.costoPezzo };
  });
  const reale = CE.calcola(Object.assign({}, base, { hours: 9.95 }));
  return { punti, reale: reale.costoPezzo, avvisiReale: (CE.avvisi(reale, null,
    Object.assign({}, base, { hours: 9.95 })) || []).length };
});

const curva = tre.punti.map((p) => p.ore + 'h ' + eu(p.costo)).join(' · ');
dico('3D · la curva esiste a tutte e sei le durate (' + curva + ')',
  tre.punti.every((p) => typeof p.costo === 'number' && p.costo > 0));
dico('3D · il costo cresce sempre, mai scende allungando la stampa',
  tre.punti.every((p, i) => i === 0 || p.costo > tre.punti[i - 1].costo));

/* Il costo marginale orario deve essere costante: macchina + energia +
   manutenzione non cambiano con la durata. Se varia, qualcosa moltiplica. */
const marginali = tre.punti.slice(1).map((p, i) =>
  (p.costo - tre.punti[i].costo) / (p.ore - tre.punti[i].ore));
const minM = Math.min(...marginali);
const maxM = Math.max(...marginali);
dico('3D · il costo marginale orario è costante fra ' + eu(minM) + ' e ' + eu(maxM) + '/h',
  maxM - minM < 0.02);
dico('3D · 24 ore non costano venti volte 1 ora (' + eu(tre.punti[0].costo) + ' → '
  + eu(tre.punti[5].costo) + ')', tre.punti[5].costo < tre.punti[0].costo * 2.5);
dico('3D · 250 g di materiale dominano il conto su una stampa breve',
  tre.punti[0].costo > 5.5 && tre.punti[0].costo < 12);
dico('3D · il caso reale 9h57m / 250 g sta fra 9 h e 15 h (' + eu(tre.reale) + ')',
  tre.reale > tre.punti[3].costo && tre.reale < tre.punti[4].costo);

/* ── Laser · taglio e incisione ─────────────────────────────────────────── */

const laser = await page.evaluate(() => {
  const CE = window.InglyCostEngine;
  const base = { tecnologia: 'laser', qty: 1, cutLengthMm: 2000, cutSpeedMmMin: 600,
    engraveAreaMm2: 0, engraveSpeedMm2Min: 3000, sheetPrice: 12, sheetAreaMm2: 240000,
    pieceAreaMm2: 20000, machinePrice: 1500, machineLifeHours: 5000,
    averagePowerW: 150, kwhPrice: 0.28, laborPerHour: 18, setupMin: 5 };
  const c = (x) => CE.calcola(Object.assign({}, base, x)).costoPezzo;
  return {
    soloTaglio: c({}),
    conIncisione: c({ engraveAreaMm2: 60000 }),
    taglioDoppio: c({ cutLengthMm: 4000 }),
    materialeCaro: c({ sheetPrice: 24 }),
    senzaMateriale: c({ sheetPrice: 0 }),
  };
});
dico('LASER · il solo taglio ha un costo (' + eu(laser.soloTaglio) + ')', laser.soloTaglio > 0);
dico('LASER · aggiungere incisione lo alza (' + eu(laser.conIncisione) + ')',
  laser.conIncisione > laser.soloTaglio);
dico('LASER · raddoppiare il taglio lo alza (' + eu(laser.taglioDoppio) + ')',
  laser.taglioDoppio > laser.soloTaglio);
dico('LASER · ma non lo raddoppia: il materiale non dipende dal percorso',
  laser.taglioDoppio < laser.soloTaglio * 2);
dico('LASER · un foglio che costa il doppio alza il pezzo (' + eu(laser.materialeCaro) + ')',
  laser.materialeCaro > laser.soloTaglio);
dico('LASER · senza materiale resta il costo di macchina e lavoro, non zero ('
  + eu(laser.senzaMateriale) + ')', laser.senzaMateriale > 0 && laser.senzaMateriale < laser.soloTaglio);

/* ── UV · supporto, inchiostro, primer, tempo ───────────────────────────── */

const uv = await page.evaluate(() => {
  const CE = window.InglyCostEngine;
  const base = { tecnologia: 'uv', qty: 1, printAreaMm2: 20000, passes: 1, speedM2Hour: 2.5,
    blankPrice: 3.2, inkMlPerM2: 12, inkPricePerMl: 0.9, whiteMlPerM2: 8, whitePricePerMl: 0.9,
    primerPerPiece: 0.25, handlingMin: 2, curingMin: 3, machinePrice: 9000,
    machineLifeHours: 6000, averagePowerW: 200, kwhPrice: 0.28, laborPerHour: 18, setupMin: 4 };
  const c = (x) => CE.calcola(Object.assign({}, base, x)).costoPezzo;
  return {
    pieno: c({}),
    senzaPrimer: c({ primerPerPiece: 0 }),
    areaDoppia: c({ printAreaMm2: 40000 }),
    supportoCaro: c({ blankPrice: 6.4 }),
    manoDoppia: c({ handlingMin: 4 }),
    duePassate: c({ passes: 2 }),
  };
});
dico('UV · il pezzo completo costa ' + eu(uv.pieno), uv.pieno > 0);
dico('UV · togliere il primer lo abbassa di esattamente il primer ('
  + eu(uv.pieno - uv.senzaPrimer) + ')', Math.abs((uv.pieno - uv.senzaPrimer) - 0.25) < 0.01);
dico('UV · raddoppiare l\'area alza l\'inchiostro, non tutto il pezzo ('
  + eu(uv.areaDoppia) + ')', uv.areaDoppia > uv.pieno && uv.areaDoppia < uv.pieno * 1.5);
dico('UV · un supporto che costa 3,20 in più alza il pezzo di 3,20 ('
  + eu(uv.supportoCaro - uv.pieno) + ')', Math.abs((uv.supportoCaro - uv.pieno) - 3.2) < 0.02);
dico('UV · più tempo di manipolazione alza il costo (' + eu(uv.manoDoppia) + ')',
  uv.manoDoppia > uv.pieno);
dico('UV · due passate costano più di una (' + eu(uv.duePassate) + ')', uv.duePassate > uv.pieno);

/* ── Il motore avvisa invece di tacere ──────────────────────────────────── */

const avvisi = await page.evaluate(() => {
  const CE = window.InglyCostEngine;
  /* Un campo che nessun profilo legge deve essere segnalato: è il modo in cui
     un preventivo esce plausibile e sbagliato. */
  const v = CE.validateInput({ tecnologia: 'uv', qty: 1, blankPrice: 3.2,
    inkMlPerPrint: 1.8, printMin: 6 });
  let crash = null;
  try { CE.avvisi({}, {}, {}); } catch (e) { crash = e.message; }
  let crashIgnota = null;
  try { CE.avvisi({}, {}, { tecnologia: 'pippo' }); } catch (e) { crashIgnota = e.message; }
  const senzaTec = CE.validateInput({});
  return {
    ignorati: (v.warnings || []).filter((w) => /ignorato/.test(w)).length,
    mancanti: (v.warnings || []).filter((w) => /manca/.test(w)).length,
    crash, crashIgnota,
    contratto: ['valid', 'errors', 'warnings', 'fields', 'ok', 'problemi', 'avvisi', 'mancanti']
      .every((k) => k in senzaTec),
  };
});
dico('MOTORE · un campo che nessun profilo legge viene segnalato (' + avvisi.ignorati + ')',
  avvisi.ignorati >= 2);
dico('MOTORE · e i campi essenziali mancanti pure (' + avvisi.mancanti + ')', avvisi.mancanti >= 2);
dico('MOTORE · `validateInput` restituisce lo stesso contratto anche senza tecnologia',
  avvisi.contratto === true);
dico('MOTORE · `avvisi()` non esplode se la tecnologia non è ancora scelta'
  + (avvisi.crash ? ' — ' + avvisi.crash : ''), avvisi.crash === null);
dico('MOTORE · né se è sconosciuta' + (avvisi.crashIgnota ? ' — ' + avvisi.crashIgnota : ''),
  avvisi.crashIgnota === null);

console.log('\nCURVA ECONOMICA · 3D · LASER · UV\n');
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
console.log('\nnessun costo esplode ✔\n');
await browser.close();
