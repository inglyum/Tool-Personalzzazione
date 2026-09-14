#!/usr/bin/env node
/**
 * redditivita.mjs — ProfitScope risponde alla domanda che prometteva.
 *
 * La sezione era rotta in due modi. Non veniva **mai disegnata**: la rotta
 * chiamava `ProfitLeakDetector`, che non è definito in nessun file del
 * progetto, mentre `ProfitScope` esisteva ed era esportato su `window` senza
 * che lo chiamasse nessuno. E quando finalmente la si guardava, rispondeva
 * con soglie inventate («€8/ora è sotto il minimo vitale»), attribuiva le ore
 * ai prodotti per sottostringa del nome, e chiamava «costo» il solo materiale.
 *
 * Qui si scrivono ordini veri in archivio, si apre la sezione e si guarda
 * cosa mostra. Il caso costruito apposta è quello che una classifica per
 * fatturato sbaglia: **il laser fattura dieci volte tanto e lascia meno per
 * ogni ora occupata**.
 *
 *   node tests/qa/redditivita.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
page.on('dialog', (d) => d.accept().catch(() => {}));

await page.addInitScript(() => {
  ['ingly_wizard_done_v2', 'ingly_tour_done_v1', '_wizard_done_v37', '_v37sidebar_done']
    .forEach((k) => localStorage.setItem(k, '1'));
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* ── FASE A · il modulo morto è sparito, quello vivo è raggiungibile ─────── */

const moduli = await page.evaluate(() => ({
  redditivita: !!window.InglyRedditivita,
  profitscope: typeof window.ProfitScope !== 'undefined' && typeof window.ProfitScope.render === 'function',
  /* Il modulo fantasma: non deve esistere, e infatti non è mai esistito. */
  leakDetector: typeof window.ProfitLeakDetector !== 'undefined',
}));
dico('FASE A · il modulo di redditività è nel file consegnato', moduli.redditivita);
dico('FASE A2 · ProfitScope sa disegnarsi', moduli.profitscope);
dico('FASE A3 · ProfitLeakDetector continua a non esistere (era la rotta rotta)', !moduli.leakDetector);

/* ── FASE B · il calcolo: le ore, non il fatturato ───────────────────────── */

const puro = await page.evaluate(() => {
  const R = window.InglyRedditivita;
  if (!R) return null;
  const o = (t, ric, cos, ore) => ({ technology: t, amount: ric, economic: { costTotal: cos, hours: ore } });
  const e = R.per([
    /* Il laser fattura dieci volte tanto e occupa dieci volte le ore. */
    o('laser', 1000, 900, 10),
    o('print3d', 100, 50, 1),
  ], 'tecnologia');
  const c = R.confronto(e);
  const laser = e.righe.find((r) => r.id === 'laser');
  return {
    migliore: c.migliore && c.migliore.id,
    ricavoLaser: laser.ricavo,
    oraLaser: laser.marginePerOra,
    ora3d: e.righe.find((r) => r.id === 'print3d').marginePerOra,
  };
});
dico('FASE B · il confronto sceglie chi rende per ora, non chi fattura ('
  + (puro ? puro.migliore : '—') + ')', puro && puro.migliore === 'print3d');
dico('FASE B2 · e infatti il laser fattura dieci volte tanto (' + (puro ? puro.ricavoLaser : '—') + ')',
  puro && puro.ricavoLaser === 1000);
dico('FASE B3 · ma la sua ora lascia meno (' + (puro ? puro.oraLaser + ' contro ' + puro.ora3d : '—') + ')',
  puro && puro.oraLaser < puro.ora3d);

/* ── FASE C · i rifiuti: quando il modulo non risponde ───────────────────── */

const rifiuti = await page.evaluate(() => {
  const R = window.InglyRedditivita;
  const senzaOre = R.per([{ technology: 'laser', amount: 1000, economic: { costTotal: 100 } }], 'tecnologia');
  const scoperto = R.per(
    [{ technology: 'laser', amount: 100, economic: { costTotal: 60 } }]
      .concat(Array.from({ length: 9 }, () => ({ technology: 'laser', amount: 100 }))),
    'tecnologia');
  const senzaCosto = R.per([{ technology: 'uv', amount: 500 }], 'tecnologia');
  return {
    oraSenzaOre: senzaOre.righe[0].marginePerOra,
    ricavoSenzaOre: senzaOre.righe[0].ricavo,
    sufficiente: scoperto.righe[0].copertura.sufficiente,
    pctScoperto: scoperto.righe[0].marginePct,
    motivoScoperto: scoperto.righe[0].copertura.motivo || '',
    margineSenzaCosto: senzaCosto.righe[0].marginePerOrdine,
    ricavoSenzaCosto: senzaCosto.righe[0].ricavo,
  };
});
dico('FASE C · senza ore dichiarate il margine orario non si stima dal prezzo',
  rifiuti.oraSenzaOre === null && rifiuti.ricavoSenzaOre === 1000);
dico('FASE C2 · un gruppo coperto per un decimo si dichiara non confrontabile',
  rifiuti.sufficiente === false && rifiuti.pctScoperto === null);
dico('FASE C3 · e scrive il motivo invece di mostrare un numero ('
  + rifiuti.motivoScoperto.slice(0, 40) + '…)', /1 ordini su 10/.test(rifiuti.motivoScoperto));
dico('FASE C4 · senza costo non c\'è margine, ma il ricavo si vede lo stesso',
  rifiuti.margineSenzaCosto === null && rifiuti.ricavoSenzaCosto === 500);

/* ── FASE D · la schermata disegna quello che il modulo calcola ──────────── */

const schermata = await page.evaluate(async () => {
  const g = (n) => new Date(Date.now() - n * 86400000).toISOString();
  const ordini = [
    /* Laser: fattura tanto, occupa tanto, lascia poco per ora. */
    { id: 960001, stage: 'invoiced', technology: 'laser', clientName: 'Collaudo A', amount: 1000, invoicedAt: g(40), economic: { revenueNet: 1000, costTotal: 900, hours: 10 } },
    { id: 960002, stage: 'sold', technology: 'laser', clientName: 'Collaudo A', amount: 1000, soldAt: g(20), economic: { revenueNet: 1000, costTotal: 900, hours: 10 } },
    /* Stampa 3D: fattura poco e lascia molto per ora. */
    { id: 960003, stage: 'invoiced', technology: 'print3d', clientName: 'Collaudo B', amount: 100, invoicedAt: g(30), economic: { revenueNet: 100, costTotal: 50, hours: 1 } },
    { id: 960004, stage: 'delivered', technology: 'print3d', clientName: 'Collaudo B', amount: 100, deliveredAt: g(10), economic: { revenueNet: 100, costTotal: 50, hours: 1 } },
    /* UV: nessun costo dichiarato su nessun ordine. Non deve entrare in classifica. */
    { id: 960005, stage: 'sold', technology: 'uv', clientName: 'Collaudo C', amount: 700, soldAt: g(15) },
    { id: 960006, stage: 'sold', technology: 'uv', clientName: 'Collaudo C', amount: 700, soldAt: g(5) },
    /* Ancora in lavorazione: non è finito, non si conta. */
    { id: 960007, stage: 'working', technology: 'print3d', clientName: 'Collaudo D', amount: 99999, date: g(3), economic: { revenueNet: 99999, costTotal: 1, hours: 0.1 } },
  ];
  for (const o of ordini) await window.IDB.put('orders', o);

  window.ProfitScope._period = 'all';
  window.ProfitScope._dimensione = 'tecnologia';
  await window.App.navigate('profitscope');
  await new Promise((r) => setTimeout(r, 2500));

  const vista = document.getElementById('view-profitscope');
  const t = vista ? vista.innerText : '';
  const righe = Array.from(vista ? vista.querySelectorAll('tbody tr') : [])
    .map((tr) => tr.innerText.replace(/\s+/g, ' ').trim());
  return {
    chars: t.trim().length,
    attiva: !!vista && vista.classList.contains('active'),
    /* Le soglie inventate della vecchia versione. */
    nienteMinimoVitale: !/minimo vitale/i.test(t),
    nienteMediaArtigiani: !/media per artigiani/i.test(t),
    nienteSegnaposto: !/Profit Leak Detector/i.test(t),
    diceCopertura: /Costo dichiarato su/.test(t),
    dicePerOra: /ora di laboratorio/i.test(t),
    nonConfrontabili: /Non confrontabili/i.test(t),
    righe: righe,
    /* Il totale a schermo del gruppo senza costo: 1400 di ricavo, 0 di margine. */
    uvInClassifica: righe.filter((r) => /1\.400|1400/.test(r)).length,
    inLavorazione: /99\.999|99999/.test(t),
  };
});
dico('FASE D · la sezione si disegna davvero (' + schermata.chars + ' caratteri)', schermata.chars > 600);
dico('FASE D2 · e il segnaposto «Profit Leak Detector» è sparito', schermata.nienteSegnaposto);
dico('FASE D3 · niente «minimo vitale»: era una soglia senza fonte', schermata.nienteMinimoVitale);
dico('FASE D4 · niente «media per artigiani»: idem', schermata.nienteMediaArtigiani);
dico('FASE D5 · dichiara su quanti ordini il costo è noto', schermata.diceCopertura);
dico('FASE D6 · e nomina il margine per ora di laboratorio', schermata.dicePerOra);
dico('FASE D7 · in classifica la stampa 3D sta sopra al laser ('
  + schermata.righe.slice(0, 2).map((r) => r.split(' ')[1] || '?').join(' → ') + ')',
  schermata.righe.findIndex((r) => /Stampa 3D|print3d/i.test(r)) >= 0
  && schermata.righe.findIndex((r) => /Stampa 3D|print3d/i.test(r))
     < schermata.righe.findIndex((r) => /Laser/i.test(r)));
dico('FASE D8 · il gruppo senza costo sta sotto, nella sezione dei non confrontabili',
  schermata.nonConfrontabili && schermata.uvInClassifica >= 1);
dico('FASE D9 · l\'ordine ancora in lavorazione non entra nei conti', !schermata.inLavorazione);

/* ── FASE E · le altre dimensioni disegnano ──────────────────────────────── */

const dimensioni = await page.evaluate(async () => {
  const esiti = {};
  for (const d of ['cliente', 'canale', 'macchina', 'tecnologia']) {
    window.ProfitScope._dimensione = d;
    await window.ProfitScope._load();
    await new Promise((r) => setTimeout(r, 400));
    const el = document.getElementById('ps-content');
    esiti[d] = el ? el.innerText.trim().length : 0;
  }
  return esiti;
});
dico('FASE E · per cliente disegna (' + dimensioni.cliente + ')', dimensioni.cliente > 300);
dico('FASE E2 · per canale disegna anche quando nessun ordine dichiara il canale ('
  + dimensioni.canale + ')', dimensioni.canale > 200);
dico('FASE E3 · per macchina idem (' + dimensioni.macchina + ')', dimensioni.macchina > 200);
dico('FASE E4 · e si torna alla tecnologia (' + dimensioni.tecnologia + ')', dimensioni.tecnologia > 300);

/* ── FASE F · il periodo filtra ──────────────────────────────────────────── */

const periodo = await page.evaluate(async () => {
  window.ProfitScope._dimensione = 'tecnologia';
  window.ProfitScope._period = 'month';
  await window.ProfitScope._load();
  await new Promise((r) => setTimeout(r, 400));
  const mese = document.getElementById('ps-content').innerText;
  window.ProfitScope._period = 'all';
  await window.ProfitScope._load();
  await new Promise((r) => setTimeout(r, 400));
  const tutto = document.getElementById('ps-content').innerText;
  return { mese: mese.length, tutto: tutto.length, meseDiverso: mese !== tutto };
});
dico('FASE F · il periodo cambia quello che si vede', periodo.meseDiverso);
dico('FASE F2 · e nessuno dei due periodi lascia la sezione bianca',
  periodo.mese > 200 && periodo.tutto > 200);

console.log('\nPROFITSCOPE — QUALE LAVORO RENDE DAVVERO\n');
if (puro) {
  console.log('  laser    : € ' + puro.ricavoLaser + ' fatturati · € ' + puro.oraLaser + '/ora');
  console.log('  stampa 3D: € 100 fatturati · € ' + puro.ora3d + '/ora');
  console.log('  vince    : ' + puro.migliore + '\n');
}
schermata.righe.slice(0, 5).forEach((r) => console.log('  · ' + r.slice(0, 90)));
console.log('');

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
console.log('\nconviene quello che lascia di più per ora, non quello che fattura di più ✔\n');
await browser.close();
