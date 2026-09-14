#!/usr/bin/env node
/**
 * mes-produzione.mjs — la matrice E2E per tecnologia, e il MES che la regge.
 *
 * Sei tecnologie (laser, 3D, UV, DTF, tessile, misto) attraversate per
 * preventivo → ordine → produzione → vendita → analisi, nell'applicazione
 * vera. Più le tre cose che questo ciclo ha aggiunto e che si rompono in
 * silenzio se nessuno le guarda:
 *
 *   · il routing di produzione esiste, e non inventa tempi né macchine;
 *   · lo scostamento preventivato/reale non scambia «non misurato» per zero;
 *   · il fatturato di un ordine che passa da due macchine vale una volta sola.
 *
 *   node tests/qa/mes-produzione.mjs [file]
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
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* ── I moduli nuovi sono nel file consegnato ────────────────────────────── */

const moduli = await page.evaluate(() => ({
  operazioni: !!window.InglyOperazioni,
  macchine: !!window.InglyRedditivitaMacchina,
  varianza: typeof (window.InglyCostBreakdown || {}).varianza === 'function',
  consuntivo: typeof (window.InglyCostBreakdown || {}).consuntivoEconomico === 'function',
}));
dico('il modello delle operazioni è nel file', moduli.operazioni);
dico('la redditività per macchina pure', moduli.macchine);
dico('e lo scostamento per driver', moduli.varianza && moduli.consuntivo);

/* ── FASE 4 · la classificazione canonica, con i nomi veri delle macchine ── */

const classifica = await page.evaluate(() => {
  const P = window.InglyProduction;
  const casi = {
    'laser': 'laser', 'Laser CO2': 'laser', 'xTool P2 Laser': 'laser',
    'Stampante 3D FDM': '3d', 'stampa 3d': '3d',
    'UV Printer': 'uv', 'Stampa UV': 'uv',
    'DTF transfer': 'dtf', 'sublimazione': 'tessile',
    'montaggio': 'manuale', 'verniciatura': 'finitura', 'generico': 'altro',
  };
  const sbagliati = Object.entries(casi).filter(([k, atteso]) => P.normalizza(k) !== atteso)
    .map(([k, a]) => k + ' → ' + P.normalizza(k) + ' (atteso ' + a + ')');
  return {
    sbagliati,
    tecnologie: P.elenco().map((t) => t.id).join(','),
    /* Una frase non è un campo tecnologia: non deve classificarsi. */
    frase: P.normalizza('targa in legno con finitura opaca e bordo inciso'),
  };
});
dico('le otto tecnologie canoniche ci sono (' + classifica.tecnologie + ')',
  classifica.tecnologie === 'laser,3d,uv,dtf,tessile,manuale,finitura,altro');
dico('ogni nome reale si classifica' + (classifica.sbagliati.length ? ': ' + classifica.sbagliati.join(' · ') : ''),
  classifica.sbagliati.length === 0);
dico('una frase descrittiva NON si classifica (era il rischio del riconoscimento per parola)',
  classifica.frase === null);

/* ── FASE 27 · la matrice, tecnologia per tecnologia ────────────────────── */

const matrice = await page.evaluate(async () => {
  const S = window.InglyOrderSales;
  const P = window.InglyProduction;
  const OP = window.InglyOperazioni;
  const casi = [
    { nome: 'LASER', tec: ['laser'] },
    { nome: '3D', tec: ['3d'] },
    { nome: 'UV', tec: ['uv'] },
    { nome: 'DTF', tec: ['dtf'] },
    { nome: 'TESSILE', tec: ['tessile'] },
    { nome: 'MISTO laser+uv', tec: ['laser', 'uv'] },
    { nome: 'MISTO laser+3d+uv', tec: ['laser', '3d', 'uv'] },
  ];
  return casi.map((c) => {
    const ordine = {
      id: 800000 + casi.indexOf(c),
      clientName: 'Cliente ' + c.nome,
      economic: { revenueNet: 150, revenueGross: 183, costTotal: 60 },
      production: P.costruisci(c.tec),
      stage: 'consegnato',
    };
    const vend = S.createSaleFromOrder(ordine, { channel: 'Diretto' });
    const rout = OP.costruisciDaOrdine(ordine);
    const letto = P.leggi(ordine);
    return {
      nome: c.nome,
      venditaOk: !!(vend && vend.ok),
      netto: vend && vend.vendita && vend.vendita.netAmount,
      lordo: vend && vend.vendita && vend.vendita.grossAmount,
      costo: vend && vend.vendita && vend.vendita.totalCost,
      tecEreditata: vend && vend.vendita && vend.vendita.productionTechnology,
      misto: !!(vend && vend.vendita && vend.vendita.isMixedProduction),
      attesoMisto: c.tec.length > 1,
      operazioni: rout.operations.length,
      attesoOperazioni: c.tec.length,
      tempiInventati: rout.operations.some((o) => o.estimatedTime != null || o.machineId != null),
      primaria: letto.primaryTechnology,
    };
  });
});

for (const m of matrice) {
  dico(m.nome + ' · la vendita nasce con il suo importo (netto ' + m.netto + ', lordo ' + m.lordo + ')',
    m.venditaOk && m.netto === 150 && m.lordo === 183 && m.costo === 60);
  dico(m.nome + ' · la tecnologia è ereditata (' + m.tecEreditata + ')', !!m.tecEreditata);
  dico(m.nome + ' · misto = ' + m.misto, m.misto === m.attesoMisto);
  dico(m.nome + ' · il routing ha ' + m.operazioni + ' operazioni', m.operazioni === m.attesoOperazioni);
  dico(m.nome + ' · e non inventa tempi né macchine', m.tempiInventati === false);
}

/* ── FASE 14 · il fatturato di un misto non si duplica, nemmeno per macchina ── */

const misto = await page.evaluate(() => {
  const RM = window.InglyRedditivitaMacchina;
  const RT = window.InglyRedditivitaTecnologia;
  const ordine = {
    id: 810001,
    economic: { revenueNet: 150, costTotal: 60 },
    production: { technologies: ['laser', 'uv'], operations: [
      { technology: 'laser', machineId: 'xtool', machineName: 'xTool', estimatedTime: 20, actualTime: 24 },
      { technology: 'uv', machineId: 'uvp', machineName: 'UV Printer', estimatedTime: 12, actualTime: 15 }] },
  };
  const m = RM.per([ordine], [{ id: 'xtool', name: 'xTool P2' }, { id: 'uvp', name: 'UV Printer' }]);
  const t = RT.per([ordine]);
  return {
    macchineRicavo: m.totali.ricavo,
    macchineRighe: m.righe.length,
    sommaRighe: Math.round(m.righe.reduce((a, r) => a + r.ricavo, 0) * 100) / 100,
    tecnologieRicavo: t.totali ? t.totali.ricavo : null,
    ore: m.righe.map((r) => r.oreMisurate).join('+'),
    orario: m.righe.every((r) => r.ricavoOrario > 0),
  };
});
dico('MISTO · due macchine, ricavo totale ' + misto.macchineRicavo + ' (non 300)', misto.macchineRicavo === 150);
dico('MISTO · e la somma delle righe fa esattamente lo stesso', misto.sommaRighe === 150);
dico('MISTO · le ore misurate arrivano nelle righe (' + misto.ore + ')', misto.ore === '24+15');
dico('MISTO · e con esse gli euro/ora', misto.orario);
dico('MISTO · anche l\'aggregato per tecnologia resta a ' + misto.tecnologieRicavo, misto.tecnologieRicavo === 150);

/* ── FASE 11 · preventivato, reale, scostamento ─────────────────────────── */

const varianza = await page.evaluate(() => {
  const B = window.InglyCostBreakdown;
  const completo = B.consuntivoEconomico(
    { revenueNet: 200, costs: { materiale: 40, macchina: 30, manodopera: 20 } },
    { materiale: 48, macchina: 27, manodopera: 25 });
  const parziale = B.consuntivoEconomico(
    { revenueNet: 200, costs: { materiale: 40, macchina: 30, manodopera: 20 } },
    { materiale: 48 });
  const vuoto = B.consuntivoEconomico(
    { revenueNet: 200, costs: { materiale: 40, macchina: 30, manodopera: 20 } }, {});
  return { completo, parziale, vuoto };
});
dico('CONSUNTIVO · costo reale 100 su 90 previsti, scostamento +10',
  varianza.completo.actualCost === 100 && varianza.completo.variance === 10);
dico('CONSUNTIVO · il ricavo non si muove (' + varianza.completo.revenueNet + ')',
  varianza.completo.revenueNet === 200);
dico('CONSUNTIVO · profitto reale 100, margine 50%',
  varianza.completo.actualProfit === 100 && varianza.completo.actualMarginPct === 50);
dico('CONSUNTIVO · un consuntivo a metà non inventa un risparmio (costo '
  + varianza.parziale.actualCost + ', non 48)', varianza.parziale.actualCost === 98);
dico('CONSUNTIVO · e si dichiara incompleto', varianza.parziale.completo === false);
dico('CONSUNTIVO · un consuntivo vuoto non trasforma il preventivo in profitto ('
  + varianza.vuoto.actualCost + ')', varianza.vuoto.actualCost === 90);

/* ── FASE 10 · l'ordine che entra in produzione riceve il routing ───────── */

const produzione = await page.evaluate(async () => {
  await window.IDB.put('orders', { id: 820001, clientName: 'Rossi', stage: 'confermato',
    production: { technologies: ['laser', 'uv'] },
    economic: { revenueNet: 150, costTotal: 60 } });
  const W = window.WorkflowSync;
  if (!W || typeof W.transition !== 'function') return { disponibile: false };
  /* Il motore di workflow parla inglese — `working` — mentre l'elenco ordini
     parla italiano — `produzione`. Sono due vocabolari di stato che convivono
     su dati storici diversi, e unificarli vorrebbe dire riscrivere ordini
     vecchi. Il routing risponde a entrambi; qui si usa quello che il motore
     accetta davvero, e si verifica che l'altro non venga inghiottito in
     silenzio. */
  const ignoto = await W.transition(820001, 'produzione').catch(() => false);
  await W.transition(820001, 'working').catch(() => {});
  const o = await window.IDB.get('orders', 820001);
  const ops = window.InglyOperazioni.leggi(o);
  /* Una seconda transizione non deve ricostruire il routing. */
  if (ops.length) { ops[0].actualTime = 42; o.production.operations = ops; await window.IDB.put('orders', o); }
  await W.transition(820001, 'working').catch(() => {});
  const o2 = await window.IDB.get('orders', 820001);
  const ops2 = window.InglyOperazioni.leggi(o2);
  return { disponibile: true, create: ops.length, tec: ops.map((x) => x.technology).join('+'),
    conservato: ops2.length && ops2[0].actualTime === 42, ignoto: ignoto };
});
if (produzione.disponibile) {
  dico('PRODUZIONE · entrando in produzione l\'ordine riceve ' + produzione.create + ' operazioni',
    produzione.create === 2);
  dico('PRODUZIONE · una per tecnologia, in ordine (' + produzione.tec + ')', produzione.tec === 'laser+uv');
  dico('PRODUZIONE · e un tempo già registrato non viene cancellato da un secondo passaggio',
    produzione.conservato === true);
  dico('PRODUZIONE · uno stato che il motore non conosce viene rifiutato, non ignorato',
    produzione.ignoto === false);
} else {
  dico('PRODUZIONE · il motore di workflow è raggiungibile', false);
}

console.log('\nMES · PRODUZIONE E MATRICE E2E\n');
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
console.log('\nsei tecnologie, un fatturato, nessun tempo inventato ✔\n');
await browser.close();
