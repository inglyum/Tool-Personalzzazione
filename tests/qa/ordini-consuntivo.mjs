#!/usr/bin/env node
/**
 * ordini-consuntivo.mjs — un ordine ha tre numeri, non uno.
 *
 * Il difetto misurato: il gestionale mostrava quanto un ordine **dovrebbe**
 * costare. Quanto è costato davvero esisteva nei dati — ore registrate e spese
 * annotate — ma non arrivava mai sotto gli occhi di chi guarda l'ordine, e la
 * differenza fra i due non la calcolava nessuno.
 *
 * E la somma del costo reale viveva dentro il costruttore del cruscotto: una
 * definizione sepolta in un consumatore, che nessun'altra parte del programma
 * poteva chiedere. Ordini l'avrebbe ricalcolata a modo suo — due definizioni di
 * «quanto è costato», cioè due schermate con due numeri diversi sullo stesso
 * lavoro.
 *
 *   node tests/qa/ordini-consuntivo.mjs [file]
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
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* ── 1 · UN SOLO PROPRIETARIO DEL COSTO REALE ───────────────────────────── */
const base = await page.evaluate(async () => {
  const mancanti = ['InglyActualCost', 'InglyScostamento', 'InglyOrderEconomics']
    .filter((n) => typeof window[n] === 'undefined');
  if (mancanti.length) return { mancanti };
  return {
    mancanti: [],
    haMappa: typeof InglyActualCost.mappaPerOrdine === 'function',
    haPerOrdine: typeof InglyActualCost.perOrdine === 'function',
    haPannello: typeof InglyOrderEconomics.pannelloConsuntivo === 'function',
    haRegistra: typeof InglyOrderEconomics.registraVoce === 'function',
  };
});
dico('i tre motori sono in pagina (' + (base.mancanti || []).join(', ') + ')', (base.mancanti || []).length === 0);
dico('InglyActualCost possiede il costo reale per ordine', base.haMappa && base.haPerOrdine);
dico('il pannello Preventivato/Reale/Scostamento esiste', base.haPannello);

/* ── 2 · «NON LO SO» NON È «ZERO» ───────────────────────────────────────── */
const vuoto = await page.evaluate(async () => {
  const id = 970001;
  await IDB.put('orders', { id, clientName: 'Prova Vuoto', name: 'Lavoro', total: 200, cost: 120,
    stage: 'produzione', status: 'produzione', createdAt: new Date().toISOString() });
  const r = await InglyActualCost.perOrdine(id);
  return { registrato: r.registrato, motivo: r.motivo || '' };
});
dico('senza costi registrati dichiara che non lo sa', vuoto.registrato === false);
dico('e lo dice con parole', vuoto.motivo.length > 0);

/* ── 3 · IL COSTO REALE SOMMA LE DUE SORGENTI ───────────────────────────── */
const somma = await page.evaluate(async () => {
  const id = 970002;
  await IDB.put('orders', { id, clientName: 'Prova Somma', name: 'Lavoro', total: 300, cost: 150,
    stage: 'produzione', status: 'produzione', createdAt: new Date().toISOString() });
  /* Un'ora tracciata e una spesa annotata: il costo reale è la somma delle due,
     non una sola. */
  await IDB.put('timelogs', { id: 970902, orderId: id, minutes: 60, machineCount: 1 });
  await IDB.put('cost_entries', { id: 970903, orderId: id, type: 'materiale', amount: 40, minutes: 0, date: new Date().toISOString() });
  const r = await InglyActualCost.perOrdine(id);
  const tariffe = await InglyActualCost._tariffe();
  const atteso = 60 * tariffe.manodoperaAlMinuto + 60 * tariffe.macchinaAlMinuto + 40;
  return { registrato: r.registrato, costo: r.costo, voci: r.voci, atteso };
});
dico('con ore e spese il costo reale è registrato', somma.registrato === true);
dico('e vale la somma delle due sorgenti (' + (somma.costo || 0).toFixed(2) + ' = ' + (somma.atteso || 0).toFixed(2) + ')',
  Math.abs(somma.costo - somma.atteso) < 0.005);
dico('le ore diventano manodopera e macchina, non una sola voce',
  somma.voci && somma.voci.manodopera > 0 && somma.voci.macchina > 0);
dico('la spesa annotata resta separata dalle ore', somma.voci && Math.abs(somma.voci.spese - 40) < 0.005);

/* ── 4 · IL CRUSCOTTO NON HA PIÙ UNA SUA COPIA ──────────────────────────── */
const unaSola = await page.evaluate(() => {
  /* La somma del costo reale compariva anche nel costruttore del cruscotto.
     Se torna a esserci, due schermate mostreranno due numeri. */
  const html = document.documentElement.innerHTML;
  const occorrenze = (html.match(/realCostByOrder\[key\]\s*=\s*\(realCostByOrder/g) || []).length;
  return { occorrenze };
});
dico('nessuna seconda somma del costo reale nel cruscotto', unaSola.occorrenze === 0);

/* ── 5 · SCOSTAMENTO ────────────────────────────────────────────────────── */
const sco = await page.evaluate(async () => {
  const prev = { costo: 150, prezzo: 300, quantita: 1 };
  const sotto = InglyScostamento.confronta(prev, { costo: 120, prezzo: 300, quantita: 1 });
  const sopra = InglyScostamento.confronta(prev, { costo: 200, prezzo: 300, quantita: 1 });
  const assente = InglyScostamento.confronta(prev, {});
  return {
    sottoVerdetto: sotto.verdetto.id, sottoScarto: sotto.scostamento.costo,
    sopraVerdetto: sopra.verdetto.id, sopraScarto: sopra.scostamento.costo,
    assenteDisp: assente.disponibile,
    margineReale: sopra.reale.margine, marginePrev: sopra.preventivato.margine,
  };
});
dico('costare meno del preventivo dà scostamento negativo', sco.sottoScarto < 0);
dico('costare di più dà scostamento positivo', sco.sopraScarto > 0);
dico('e il verdetto è «sforato» oltre il 20%', sco.sopraVerdetto === 'sforato');
dico('il margine reale è più basso di quello preventivato', sco.margineReale < sco.marginePrev);
dico('senza costo reale lo scostamento non è disponibile', sco.assenteDisp === false);

/* ── 6 · IL PANNELLO NEL DETTAGLIO DELL'ORDINE ──────────────────────────── */
await page.evaluate(() => App.navigate('gestione_ordini'));
await page.waitForTimeout(2500);

const dett = await page.evaluate(async () => {
  await GestioneOrdini._openDetail(970002);
  await new Promise((r) => setTimeout(r, 1800));
  const n = document.getElementById('go-consuntivo');
  const modali = document.querySelectorAll('#go-detail-modal').length;
  return {
    presente: !!n,
    riempito: !!n && n.innerHTML.trim().length > 0,
    testo: n ? n.textContent : '',
    campi: n ? n.querySelectorAll('input[type=number]').length : 0,
    modali,
  };
});
dico('il pannello è nel dettaglio dell ordine', dett.presente);
dico('e viene riempito', dett.riempito);
dico('mostra le tre colonne', /Preventivato/.test(dett.testo) && /Reale/.test(dett.testo) && /Scostamento/.test(dett.testo));
dico('mostra le righe costo, ricavo e profitto',
  /Costo/.test(dett.testo) && /Ricavo/.test(dett.testo) && /Profitto/.test(dett.testo));
dico('ha i campi per registrare il consuntivo (' + dett.campi + ')', dett.campi === 5);
dico('dichiara che il preventivo non cambia', /non cambia/i.test(dett.testo));
dico('un solo dettaglio aperto alla volta', dett.modali === 1);

/* ── 7 · REGISTRARE UNA VOCE NON TOCCA IL PREVENTIVO ────────────────────── */
const reg = await page.evaluate(async () => {
  const prima = await IDB.get('orders', 970002);
  const costoPrima = prima.cost;
  const totalePrima = prima.total;

  await InglyOrderEconomics.registraVoce(970002, 'imballo', 12.5);
  await new Promise((r) => setTimeout(r, 700));
  const voci = await InglyOrderEconomics.vociRegistrate(970002);
  const dopo = await IDB.get('orders', 970002);
  const reale = await InglyActualCost.perOrdine(970002);

  /* Correggere una voce la sostituisce, non la somma: altrimenti ogni
     ripensamento gonfierebbe il costo. */
  await InglyOrderEconomics.registraVoce(970002, 'imballo', 5);
  await new Promise((r) => setTimeout(r, 700));
  const dopoCorrezione = await InglyOrderEconomics.vociRegistrate(970002);
  const entrate = (await InglyActualCost.getByOrder(970002)).filter((e) => e._consuntivo && e.type === 'imballo');

  /* Svuotare il campo toglie la voce. */
  await InglyOrderEconomics.registraVoce(970002, 'imballo', '');
  await new Promise((r) => setTimeout(r, 700));
  const dopoSvuoto = await InglyOrderEconomics.vociRegistrate(970002);

  return {
    costoPrima, costoDopo: dopo.cost, totalePrima, totaleDopo: dopo.total,
    registrata: voci.imballo, realeConVoce: reale.registrato,
    corretta: dopoCorrezione.imballo, righeDoppie: entrate.length,
    dopoSvuoto: dopoSvuoto.imballo,
  };
});
dico('registrare una voce non cambia il costo preventivato', reg.costoPrima === reg.costoDopo);
dico('né il prezzo promesso al cliente', reg.totalePrima === reg.totaleDopo);
dico('la voce viene registrata (€' + reg.registrata + ')', reg.registrata === 12.5);
dico('correggerla la sostituisce, non la somma', reg.corretta === 5);
dico('e non lascia due righe per la stessa voce', reg.righeDoppie === 1);
dico('svuotare il campo toglie la voce', reg.dopoSvuoto === undefined);

/* ── 8 · PERSISTENZA ────────────────────────────────────────────────────── */
await page.evaluate(async () => { await InglyOrderEconomics.registraVoce(970002, 'materiale', 33); });
await page.waitForTimeout(700);
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);
const dopoRicarica = await page.evaluate(async () => {
  const voci = await InglyOrderEconomics.vociRegistrate(970002);
  const reale = await InglyActualCost.perOrdine(970002);
  return { materiale: voci.materiale, costo: reale.costo, registrato: reale.registrato };
});
dico('dopo la ricarica la voce c è ancora', dopoRicarica.materiale === 33);
dico('e il costo reale la comprende', dopoRicarica.registrato && dopoRicarica.costo > 33);

console.log('\nORDINI — PREVENTIVATO · REALE · SCOSTAMENTO\n');
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
console.log('\ntre numeri, non uno ✔\n');
await browser.close();
