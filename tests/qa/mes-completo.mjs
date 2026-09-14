#!/usr/bin/env node
/**
 * mes-completo.mjs — il ciclo intero, dalla distinta al disponibile.
 *
 * Copre le tre cose che questo giro ha aggiunto e che nessun'altra suite
 * guarda:
 *
 *   · i sette stati MES, con lo storico che ci arriva tradotto e non riscritto;
 *   · qualità e scarti sull'operazione, col costo dei rifacimenti che entra
 *     nel costo reale;
 *   · il fabbisogno materiali: impegnato che NON tocca la giacenza, consumato
 *     che la muove, scarto tracciato a parte.
 *
 * Più la verifica che lo strato repository regga lo scambio di motore, che è
 * l'unica ragione per cui esiste.
 *
 *   node tests/qa/mes-completo.mjs [file]
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

/* ── Fase 1 · le distinzioni del modello ────────────────────────────────── */

const modello = await page.evaluate(() => ({
  ordine: !!window.InglyOrderEconomics,
  produzione: !!window.InglyProduction,
  operazioni: !!window.InglyOperazioni,
  macchina: !!window.InglyMachineCost,
  materiale: !!window.InglyFabbisogno,
  costoReale: typeof (window.InglyCostBreakdown || {}).consuntivoEconomico === 'function',
  repository: !!window.InglyRepository,
  vendite: window.OrderSalesService === window.InglyOrderSales,
}));
Object.entries({
  'ORDER · economia dell\'ordine': modello.ordine,
  'PRODUCTION JOB · modello produzione': modello.produzione,
  'OPERATION · routing': modello.operazioni,
  'MACHINE · anagrafica e costo orario': modello.macchina,
  'MATERIAL · fabbisogno': modello.materiale,
  'ACTUAL COST · consuntivo per driver': modello.costoReale,
  'STORAGE · repository sostituibile': modello.repository,
  'SALE · un solo servizio, non due': modello.vendite,
}).forEach(([k, v]) => dico(k, v));

/* ── Fase 2 · gli stati MES e lo storico ────────────────────────────────── */

const stati = await page.evaluate(() => {
  const O = window.InglyOperazioni;
  const storici = {
    /* i nomi di ieri di questo modulo */
    pianificata: 'da_fare', in_corso: 'in_produzione', sospesa: 'pausa',
    /* il motore di workflow */
    working: 'in_produzione', ready: 'in_coda', backlog: 'da_fare',
    /* l'elenco ordini */
    produzione: 'in_produzione', lavorazione: 'in_produzione',
    /* inglese generico */
    done: 'completata', queued: 'in_coda', qc: 'controllo_qualita',
    paused: 'pausa', cancelled: 'annullata',
  };
  const sbagliati = Object.entries(storici)
    .filter(([k, atteso]) => O.statoDi(k) !== atteso)
    .map(([k, a]) => k + ' → ' + O.statoDi(k) + ' (atteso ' + a + ')');
  return {
    elenco: O.STATI.map((s) => s.id).join('|'),
    sbagliati,
    ignoto: O.statoDi('qualcosa che non esiste'),
    attive: ['da_fare', 'in_coda', 'in_produzione', 'pausa', 'controllo_qualita', 'completata']
      .filter((s) => O.attiva({ status: s })).join('|'),
  };
});
dico('i sette stati MES (' + stati.elenco + ')',
  stati.elenco === 'da_fare|in_coda|in_produzione|pausa|controllo_qualita|completata|annullata');
dico('tredici nomi storici arrivano allo stato giusto'
  + (stati.sbagliati.length ? ': ' + stati.sbagliati.join(' · ') : ''), stati.sbagliati.length === 0);
dico('uno stato ignoto diventa «da fare», non sparisce', stati.ignoto === 'da_fare');
dico('solo chi occupa una macchina è «attivo» (' + stati.attive + ')',
  stati.attive === 'in_coda|in_produzione|pausa|controllo_qualita');

/* ── Fasi 3, 7, 8 · quantità, qualità, scarti, rifacimenti ──────────────── */

const qualita = await page.evaluate(() => {
  const O = window.InglyOperazioni;
  const ops = [
    { technology: 'laser', machineId: 'xtool', quantity: 100, goodQuantity: 96,
      wasteQuantity: 3, reworkQuantity: 1, reworkCost: 4.5, wasteReason: 'bruciatura',
      estimatedTime: 20, actualTime: 24, actualCost: 40, status: 'completata' },
    { technology: 'uv', machineId: 'uvp', quantity: 100, goodQuantity: 100,
      wasteQuantity: 0, estimatedTime: 12, actualTime: 15, actualCost: 22,
      status: 'controllo_qualita' },
  ];
  const r = O.riepilogo(ops);
  const q0 = O.qualita(ops[0]);
  return {
    resa: q0.resaPct, scarto: q0.scartoPct, motivo: q0.reason, coerente: q0.coerente,
    resaTotale: r.qualita.resaPct, contato: r.qualita.contato, incoerenti: r.qualita.incoerenti,
    costoReale: r.totali.actualCost, conRifacimenti: r.totali.actualCostConRifacimenti,
    nonContato: O.riepilogo([{ technology: 'laser', quantity: 10 }]).qualita.contato,
    incoerente: O.qualita({ quantity: 10, goodQuantity: 9, wasteQuantity: 5 }).coerente,
  };
});
dico('QUALITÀ · 96 buoni su 100 → resa 96%, scarto 3%',
  qualita.resa === 96 && qualita.scarto === 3);
dico('QUALITÀ · il motivo dello scarto sopravvive (' + qualita.motivo + ')',
  qualita.motivo === 'bruciatura');
dico('QUALITÀ · la resa complessiva è 98% sui due lotti', qualita.resaTotale === 98);
dico('SCARTI · il costo dei rifacimenti entra nel costo reale ('
  + qualita.costoReale + ' → ' + qualita.conRifacimenti + ')',
  qualita.costoReale === 62 && qualita.conRifacimenti === 66.5);
dico('QUALITÀ · senza conteggio non si deduce una resa del 100%', qualita.nonContato === false);
dico('QUALITÀ · buoni più scarti oltre il totale si dichiara incoerente',
  qualita.incoerente === false);

/* ── Fase 5 · fabbisogno, impegnato, consumato, scarto ──────────────────── */

const materiali = await page.evaluate(() => {
  const B = window.InglyCostBreakdown;
  const F = window.InglyFabbisogno;
  const distinta = B.daRighe([
    { id: 1, name: 'Compensato 4mm', qty: 2, unitCost: 3.5, subtotal: 7, unit: 'mq',
      itemKey: 'materials:12', itemStore: 'materials', itemId: 12, category: 'material' },
    { id: 2, name: 'Manodopera', qty: 1, unitCost: 9, subtotal: 9, category: 'labor' },
    { id: 3, name: 'Legno non collegato', qty: 1, unitCost: 2, subtotal: 2, category: 'material' },
  ], { totalCost: 18 });

  const aperto = { id: 1, stage: 'produzione', quantity: 3, costBreakdown: distinta };
  const chiuso = { id: 2, stage: 'consegnato', quantity: 5, costBreakdown: distinta };
  const f = F.daOrdine(aperto);
  const imp = F.impegnato([aperto, chiuso]);
  const q = F.quadro('materials:12', {
    giacenza: 20, impegnate: imp.righe,
    movimenti: [
      { itemKey: 'materials:12', type: 'CONSUMPTION', quantity: 4 },
      { itemKey: 'materials:12', type: 'WASTE', quantity: 0.5 }],
  });
  return {
    fabbisogno: f.righe.length, quantita: f.righe[0] && f.righe[0].quantity,
    nonCollegate: f.nonCollegate.length,
    itemKeyConservato: !!(distinta.voci.find((v) => v.label === 'Compensato 4mm') || {}).itemKey,
    impegnato: imp.righe[0] && imp.righe[0].quantita,
    ordiniContati: imp.ordiniContati,
    toccaGiacenza: imp.toccaLaGiacenza,
    giacenza: q.giacenza, disponibile: q.disponibile,
    consumato: q.consumato, scarto: q.scarto,
    senzaMovimenti: F.quadro('materials:12', { giacenza: 20, impegnate: [], movimenti: [] }).consumato,
    scoperto: F.disponibile('materials:12', 2, imp.righe).scoperto,
  };
});
dico('MATERIALI · la distinta conserva quale articolo serve, non solo quanto costa',
  materiali.itemKeyConservato);
dico('MATERIALI · il fabbisogno è 2 mq per pezzo × 3 pezzi = ' + materiali.quantita,
  materiali.quantita === 6);
dico('MATERIALI · una riga senza articolo collegato non genera fabbisogno ('
  + materiali.nonCollegate + ' segnalata)', materiali.nonCollegate === 1);
dico('MATERIALI · solo l\'ordine aperto impegna (' + materiali.ordiniContati + ' su 2)',
  materiali.ordiniContati === 1 && materiali.impegnato === 6);
dico('MATERIALI · impegnare NON tocca la giacenza (' + materiali.giacenza + ' resta)',
  materiali.toccaGiacenza === false && materiali.giacenza === 20);
dico('MATERIALI · ma abbassa il disponibile (' + materiali.disponibile + ')',
  materiali.disponibile === 14);
dico('MATERIALI · consumato e scarto restano separati ('
  + materiali.consumato + ' e ' + materiali.scarto + ')',
  materiali.consumato === 4 && materiali.scarto === 0.5);
dico('MATERIALI · nessun movimento non è «zero consumato»', materiali.senzaMovimenti === null);
dico('MATERIALI · impegnare più di quello che c\'è è uno scoperto dichiarato',
  materiali.scoperto === true);

/* ── Fase 21 · il repository regge lo scambio di motore ─────────────────── */

const repo = await page.evaluate(async () => {
  const R = window.InglyRepository;
  const predefinito = R.motore();
  await window.IDB.put('orders', { id: 880001, clientName: 'Repo', stage: 'produzione' });
  const veroIDB = await R.orders.get(880001);

  const memoria = new Map([[1, { id: 1, clientName: 'Da Supabase finto', stage: 'produzione' }]]);
  R.usaMotore({
    nome: 'Finto',
    async get(s, id) { return memoria.get(id) || null; },
    async getAll() { return [...memoria.values()]; },
    async put(s, r) { memoria.set(r.id, r); return r.id; },
    async del(s, id) { return memoria.delete(id); },
  });
  const nome = R.motore();
  const daFinto = await R.orders.get(1);
  const query = await R.orders.query({ stage: 'produzione' });
  R.usaMotore(null);
  const tornato = R.motore();

  R.usaMotore({ nome: 'rotto', async get() { throw new Error('disco pieno'); } });
  const errore = await R.orders.get(1);
  R.usaMotore(null);

  return {
    predefinito, veroOk: veroIDB.ok && veroIDB.dati && veroIDB.dati.clientName === 'Repo',
    nome, finto: daFinto.ok && daFinto.dati.clientName === 'Da Supabase finto',
    query: query.dati.length, tornato,
    erroreGestito: errore.ok === false && /disco pieno/.test(errore.errore || ''),
  };
});
dico('REPOSITORY · il motore predefinito è quello che c\'è (' + repo.predefinito + ')',
  repo.predefinito === 'IndexedDB');
dico('REPOSITORY · legge davvero dall\'archivio vero', repo.veroOk);
dico('REPOSITORY · lo stesso codice funziona con un altro motore (' + repo.nome + ')',
  repo.nome === 'Finto' && repo.finto && repo.query === 1);
dico('REPOSITORY · e si torna indietro (' + repo.tornato + ')', repo.tornato === 'IndexedDB');
dico('REPOSITORY · un motore che esplode non fa esplodere il chiamante', repo.erroreGestito);

/* ── Fase 24 · il giro completo non perde niente ────────────────────────── */

const integrita = await page.evaluate(async () => {
  const OP = window.InglyOperazioni;
  const ordine = {
    id: 890001, clientName: 'Integrità', stage: 'produzione',
    economic: { revenueNet: 300, revenueGross: 366, costTotal: 120 },
    production: { technologies: ['laser', 'uv'], operations: [
      { id: 'op-1', sequence: 1, technology: 'laser', machineId: 'xtool',
        estimatedTime: 20, actualTime: 24, quantity: 10, goodQuantity: 9,
        wasteQuantity: 1, status: 'completata' },
      { id: 'op-2', sequence: 2, technology: 'uv', machineId: 'uvp',
        estimatedTime: 12, status: 'in_produzione' }] },
  };
  await window.IDB.put('orders', 890001 && ordine);
  const riletto = await window.IDB.get('orders', 890001);
  const ops = OP.leggi(riletto);
  /* Una vendita da questo ordine, e il suo incasso. */
  const vend = window.InglyOrderSales.createSaleFromOrder(riletto, { channel: 'Diretto' });
  if (vend.ok) await window.IDB.put('sales', vend.vendita);
  const venduta = vend.ok ? await window.IDB.get('sales', vend.vendita.id) : null;
  return {
    operazioni: ops.length,
    tempoReale: ops[0] && ops[0].actualTime,
    buoni: ops[0] && ops[0].goodQuantity,
    stato2: ops[1] && ops[1].status,
    venditaOk: vend.ok,
    netto: venduta && venduta.netAmount,
    costo: venduta && venduta.totalCost,
    tecnologia: venduta && venduta.productionTechnology,
    misto: venduta && venduta.isMixedProduction,
  };
});
dico('DATI · un ordine con routing si rilegge con le sue ' + integrita.operazioni + ' operazioni',
  integrita.operazioni === 2);
dico('DATI · e i tempi e le quantità sopravvivono al salvataggio ('
  + integrita.tempoReale + ' min, ' + integrita.buoni + ' buoni)',
  integrita.tempoReale === 24 && integrita.buoni === 9);
dico('DATI · lo stato dell\'operazione in corso resta (' + integrita.stato2 + ')',
  integrita.stato2 === 'in_produzione');
dico('DATI · la vendita nasce con i suoi numeri (netto ' + integrita.netto
  + ', costo ' + integrita.costo + ')',
  integrita.venditaOk && integrita.netto === 300 && integrita.costo === 120);
dico('DATI · e con la tecnologia mista ereditata (' + integrita.tecnologia + ')',
  integrita.tecnologia === 'laser' && integrita.misto === true);

console.log('\nMES COMPLETO · STATI, QUALITÀ, MATERIALI, REPOSITORY\n');
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
console.log('\nimpegnato non è consumato ✔\n');
await browser.close();
