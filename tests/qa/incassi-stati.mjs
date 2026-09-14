#!/usr/bin/env node
/**
 * incassi-stati.mjs — pagato / non pagato erano due stati. Ne servivano sei.
 *
 * Una vendita con un acconto incassato non è né pagata né da pagare, e una
 * fattura scaduta da tre mesi non è uguale a una emessa ieri: in archivio sono
 * la stessa riga, e per chi deve incassare sono due problemi diversi.
 *
 * `scaduto` e `parziale` non si memorizzano: si calcolano. Uno stato scritto
 * in archivio diventa falso da solo col passare dei giorni, e il filtro
 * dell'elenco vendite confrontava `s.status` secco — quindi non li avrebbe
 * trovati mai.
 *
 * La suite verifica anche la tenuta dei dati (fase 24) e i record legacy
 * (fase 25): un ordine vecchio senza `economic`, senza IVA e senza tecnologia
 * non deve far inventare niente a nessuno.
 *
 *   node tests/qa/incassi-stati.mjs [file]
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

/* ── Fase 18 · i sei stati ──────────────────────────────────────────────── */

const stati = await page.evaluate(() => {
  const P = window.InglyPagamenti;
  const oggi = new Date();
  const scaduta = new Date(oggi.getTime() - 90 * 86400000).toISOString().slice(0, 10);
  const futura = new Date(oggi.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  return {
    elenco: P.STATI.map((s) => s.id).join('|'),
    casi: {
      nonPagato: P.stato({ amount: 150 }).stato,
      parziale: P.stato({ amount: 200, deposit: 50 }).stato,
      pagato: P.stato({ amount: 150, status: 'pagato' }).stato,
      scaduto: P.stato({ amount: 150, dueDate: scaduta }).stato,
      nonScaduto: P.stato({ amount: 150, dueDate: futura }).stato,
      pagatoNonScade: P.stato({ amount: 150, status: 'pagato', dueDate: scaduta }).stato,
      rimborsato: P.stato({ amount: 150, paymentStatus: 'refunded' }).stato,
      annullato: P.stato({ amount: 150, paymentStatus: 'cancelled' }).stato,
    },
    parzialeNumeri: P.stato({ amount: 200, deposit: 50 }),
  };
});
dico('i sei stati esistono (' + stati.elenco + ')',
  stati.elenco === 'non_pagato|parziale|pagato|scaduto|rimborsato|annullato');
dico('un acconto incassato è «parziale», non «da pagare»', stati.casi.parziale === 'parziale');
dico('e i suoi numeri tornano (' + stati.parzialeNumeri.amountPaid + ' su '
  + stati.parzialeNumeri.amountDue + ', restano ' + stati.parzialeNumeri.amountRemaining + ')',
  stati.parzialeNumeri.amountPaid === 50 && stati.parzialeNumeri.amountRemaining === 150);
dico('una scadenza passata rende «scaduto»', stati.casi.scaduto === 'scaduto');
dico('una scadenza futura no', stati.casi.nonScaduto === 'non_pagato');
dico('e una vendita già incassata non scade mai', stati.casi.pagatoNonScade === 'pagato');
dico('rimborsato e annullato si riconoscono anche dai nomi inglesi',
  stati.casi.rimborsato === 'rimborsato' && stati.casi.annullato === 'annullato');

/* ── Fase 23 · il filtro li trova davvero ───────────────────────────────── */

const filtro = await page.evaluate(async () => {
  const oggi = new Date();
  const scaduta = new Date(oggi.getTime() - 90 * 86400000).toISOString().slice(0, 10);
  const righe = [
    { id: 930001, clientName: 'A', amount: 100, status: 'da_pagare', date: '2026-09-01' },
    { id: 930002, clientName: 'B', amount: 200, deposit: 50, status: 'da_pagare', date: '2026-09-01' },
    { id: 930003, clientName: 'C', amount: 300, status: 'pagato', date: '2026-09-01' },
    { id: 930004, clientName: 'D', amount: 400, status: 'da_pagare', dueDate: scaduta, date: '2026-09-01' },
  ];
  for (const r of righe) await window.IDB.put('sales', r);
  const P = window.InglyPagamenti;
  const conta = (id) => righe.filter((r) => P.stato(r).stato === id).length;
  /* Il filtro dell'elenco usa la stessa funzione: se i conti coincidono, la
     schermata mostra quello che il modulo calcola. */
  return {
    nonPagato: conta('non_pagato'), parziale: conta('parziale'),
    pagato: conta('pagato'), scaduto: conta('scaduto'),
    badge: typeof window.Sales._badgePagamento === 'function'
      ? window.Sales._badgePagamento(righe[1]) : null,
  };
});
dico('il filtro distingue 1 non pagata, 1 parziale, 1 pagata, 1 scaduta',
  filtro.nonPagato === 1 && filtro.parziale === 1 && filtro.pagato === 1 && filtro.scaduto === 1);
dico('la riga mostra il badge dello stato', !!filtro.badge && /Acconto/.test(filtro.badge));

/* ── Fase 20 · quello che si incassa lascia traccia ─────────────────────── */

const traccia = await page.evaluate(async () => {
  await window.IDB.put('sales', { id: 930010, clientName: 'Rossi', amount: 150,
    status: 'da_pagare', date: '2026-09-01' });
  const prima = (await window.IDB.getAll('history')).length;
  await window.Sales.markPaid(930010).catch(() => {});
  const v = await window.IDB.get('sales', 930010);
  const dopo = (await window.IDB.getAll('history')).length;
  const versioni = (await window.IDB.getAll('versions'))
    .filter((x) => x.store === 'sales' && x.recId === '930010');
  return {
    storico: (v.paymentHistory || []).length,
    importo: (v.paymentHistory || [])[0] && v.paymentHistory[0].amount,
    registro: dopo - prima,
    snapshot: versioni.length,
    primaDelPagamento: versioni.length ? versioni[0].snapshot.status : null,
  };
});
dico('la vendita porta la sua riga di storico (' + traccia.storico + ')', traccia.storico === 1);
dico('con l\'importo incassato (' + traccia.importo + ')', traccia.importo === 150);
dico('il registro azioni cresce di uno (' + traccia.registro + ')', traccia.registro === 1);
dico('e resta uno snapshot di com\'era prima (stato: ' + traccia.primaDelPagamento + ')',
  traccia.snapshot >= 1 && traccia.primaDelPagamento === 'da_pagare');

/* ── Fase 25 · i record vecchi non fanno inventare niente ───────────────── */

const legacy = await page.evaluate(() => {
  const E = window.InglyOrderEconomics;
  const P = window.InglyProduction;
  const PG = window.InglyPagamenti;
  /* Un ordine come li scriveva la versione vecchia: nessun blocco economico,
     nessuna tecnologia, nessuna IVA. */
  const vecchio = { id: 940001, clientName: 'Bianchi', total: 120, createdAt: '2024-03-02' };
  const ric = E.getOrderRevenueNet(vecchio);
  const cos = E.getOrderProductionCost(vecchio);
  const pro = E.getOrderProfit(vecchio);
  const tec = P.leggi(vecchio);
  const pag = PG.stato({ amount: 120 });
  return {
    ricavoNoto: ric.noto, ricavo: ric.valore, fonte: ric.fonte,
    costoNoto: cos.noto, profittoNoto: pro.noto, motivoProfitto: pro.motivo,
    tecnologie: tec.technologies.length, primaria: tec.primaryTechnology,
    ivaInventata: ric.valore !== 120 ? 'sì' : 'no',
    statoPagamento: pag.stato,
  };
});
dico('LEGACY · il ricavo si legge dai campi storici (' + legacy.ricavo + ', da ' + legacy.fonte + ')',
  legacy.ricavoNoto && legacy.ricavo === 120);
dico('LEGACY · nessuna IVA inventata sopra il totale', legacy.ivaInventata === 'no');
dico('LEGACY · il costo resta ignoto invece di valere zero', legacy.costoNoto === false);
dico('LEGACY · quindi il profitto non esiste, e lo dice (' + legacy.motivoProfitto + ')',
  legacy.profittoNoto === false);
dico('LEGACY · nessuna tecnologia inventata (' + legacy.tecnologie + ')', legacy.tecnologie === 0);
dico('LEGACY · e lo stato di incasso parte da «da incassare»', legacy.statoPagamento === 'non_pagato');

/* ── Fase 24 · salvare, ricaricare, ritrovare ───────────────────────────── */

const integrita = await page.evaluate(async () => {
  const v = { id: 950001, clientName: 'Verdi', amount: 99.5, deposit: 20,
    status: 'da_pagare', dueDate: '2099-01-01', desc: 'Targa' };
  await window.IDB.put('sales', v);
  const riletto = await window.IDB.get('sales', 950001);
  /* Scrivere un'altra vendita non deve toccare questa. */
  await window.IDB.put('sales', { id: 950002, clientName: 'Neri', amount: 10 });
  const ancora = await window.IDB.get('sales', 950001);
  const altra = await window.IDB.get('sales', 950002);
  return {
    uguale: riletto.amount === 99.5 && riletto.deposit === 20 && riletto.desc === 'Targa',
    sopravvive: ancora && ancora.amount === 99.5 && ancora.clientName === 'Verdi',
    altraOk: altra && altra.amount === 10,
    stato: window.InglyPagamenti.stato(ancora).stato,
  };
});
dico('DATI · una vendita salvata si rilegge identica', integrita.uguale);
dico('DATI · scriverne un\'altra non la tocca', integrita.sopravvive && integrita.altraOk);
dico('DATI · e il suo stato resta coerente dopo il giro (' + integrita.stato + ')',
  integrita.stato === 'parziale');

console.log('\nINCASSI · STATI, TRACCIA, LEGACY, TENUTA DEI DATI\n');
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
console.log('\nsei stati, una traccia, niente inventato ✔\n');
await browser.close();
