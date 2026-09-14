/**
 * redditivita.test.mjs — quale lavoro rende davvero.
 *
 * «Profit Scope» prometteva questa risposta da una voce di menù che chiamava
 * `ProfitLeakDetector`, un modulo che non esiste in nessun file. La domanda
 * però è la più utile che un laboratorio possa farsi — mi conviene più il
 * laser o la stampa 3D? — e da quando l'ordine porta `economic` il programma
 * ha i dati per rispondere.
 *
 * Quello che si verifica qui è soprattutto **quando il modulo si rifiuta di
 * rispondere**: un gruppo con due ordini su dieci coperti dal costo non è un
 * gruppo su cui decidere, e la riga deve dirlo invece di mostrare un margine
 * che racconta un quinto della storia.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('src/product/order-snapshot.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('src/product/order-fields.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('src/product/order-economics.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('src/product/redditivita.js', 'utf8'), sandbox);
const R = sandbox.window.InglyRedditivita;

/** Un ordine con tecnologia, ricavo, costo e — se dichiarate — ore. */
const o = (tech, ricavo, costo, ore) => {
  const r = { technology: tech, amount: ricavo };
  if (costo != null) r.economic = { revenueNet: ricavo, costTotal: costo };
  if (ore != null) (r.economic = r.economic || {}).hours = ore;
  return r;
};

test('il modulo si espone', () => {
  assert.ok(R);
  assert.equal(typeof R.per, 'function');
  assert.equal(typeof R.confronto, 'function');
  assert.ok(R.DIMENSIONI.includes('tecnologia'));
  assert.ok(R.DIMENSIONI.includes('cliente'));
});

/* ── Il conto base ────────────────────────────────────────────────────────
   Prima ancora di chiedersi cosa conviene, il gruppo deve sommare bene. */

test('raggruppa per tecnologia e somma ricavo, costo e margine', () => {
  const e = R.per([
    o('laser', 100, 60), o('laser', 200, 100),
    o('print3d', 50, 20),
  ], 'tecnologia');
  const laser = e.righe.find((r) => r.id === 'laser');
  const p3d = e.righe.find((r) => r.id === 'print3d');
  assert.equal(laser.ordini, 2);
  assert.equal(laser.ricavo, 300);
  assert.equal(laser.costo, 160);
  assert.equal(laser.margine, 140);
  assert.equal(p3d.margine, 30);
});

test('legge la tecnologia dal lettore canonico, non da un campo solo', () => {
  /* `stampa3d` e `fdm` sono alias che `order-fields` conosce: due ordini
     scritti in due modi diversi devono finire nello stesso gruppo, altrimenti
     la classifica divide una tecnologia in tre righe da un terzo ciascuna. */
  const e = R.per([
    { technology: 'stampa3d', amount: 100, economic: { costTotal: 40 } },
    { tech: 'fdm', amount: 100, economic: { costTotal: 40 } },
    { tecnologia: 'print3d', amount: 100, economic: { costTotal: 40 } },
  ], 'tecnologia');
  assert.equal(e.righe.length, 1);
  assert.equal(e.righe[0].id, 'print3d');
  assert.equal(e.righe[0].ordini, 3);
});

test('gli ordini senza dimensione si contano, non si nascondono', () => {
  const e = R.per([o('laser', 100, 60), { amount: 90, economic: { costTotal: 10 } }], 'tecnologia');
  assert.equal(e.senzaDimensione, 1);
  assert.equal(e.totali.ordini, 2);
});

/* ── La regola del costo mancante ────────────────────────────────────────
   È la regola che separa questo modulo da una somma qualunque. */

test('un ordine senza costo non entra nel margine come zero', () => {
  /* Zero vorrebbe dire «prodotto gratis» e gonfierebbe la redditività del
     gruppo esattamente in proporzione ai dati che mancano. */
  const e = R.per([o('laser', 100, 60), o('laser', 900, null)], 'tecnologia');
  const laser = e.righe[0];
  assert.equal(laser.ricavo, 1000, 'il ricavo si vede tutto');
  assert.equal(laser.margine, 40, 'il margine solo dove il costo è dichiarato');
  assert.equal(laser.copertura.ordiniConCosto, 1);
  assert.equal(laser.copertura.ordiniSenzaCosto, 1);
});

test('la percentuale di margine si calcola sul ricavo coperto', () => {
  /* Usare il ricavo totale la abbasserebbe in proporzione agli ordini
     scoperti: chi ha meno dati sembrerebbe meno redditizio. */
  const e = R.per([o('laser', 100, 60), o('laser', 100, 40), o('laser', 800, null)], 'tecnologia');
  assert.equal(e.righe[0].marginePct, 50);
});

test('sotto la copertura minima il gruppo si dichiara non confrontabile', () => {
  const ordini = [o('laser', 100, 60)];
  for (let i = 0; i < 9; i += 1) ordini.push(o('laser', 100, null));
  const e = R.per(ordini, 'tecnologia');
  const laser = e.righe[0];
  assert.equal(laser.copertura.sufficiente, false);
  assert.equal(laser.marginePct, null, 'niente percentuale su un decimo della storia');
  assert.match(laser.copertura.motivo, /1 ordini su 10/);
});

test('senza nessun costo dichiarato lo dice apertamente', () => {
  const e = R.per([o('laser', 100, null), o('laser', 200, null)], 'tecnologia');
  const laser = e.righe[0];
  assert.equal(laser.copertura.ordiniConCosto, 0);
  assert.equal(laser.marginePerOrdine, null);
  assert.match(laser.copertura.motivo, /nessun ordine con costo dichiarato/);
});

test('i gruppi confrontabili stanno sopra a quelli scoperti', () => {
  /* Ordinare per margine e basta metterebbe primo il gruppo che ha più dati
     mancanti, perché il suo margine parziale può essere più alto per caso. */
  const scoperti = [];
  for (let i = 0; i < 9; i += 1) scoperti.push(o('laser', 1000, null));
  scoperti.push(o('laser', 1000, 100));
  const e = R.per(scoperti.concat([o('print3d', 100, 40)]), 'tecnologia');
  assert.equal(e.righe[0].id, 'print3d');
  assert.equal(e.righe[0].copertura.sufficiente, true);
  assert.equal(e.righe[1].copertura.sufficiente, false);
});

test('la quota di margine si calcola solo fra i confrontabili', () => {
  const e = R.per([
    o('laser', 100, 25), o('print3d', 100, 50),
  ], 'tecnologia');
  const laser = e.righe.find((r) => r.id === 'laser');
  const p3d = e.righe.find((r) => r.id === 'print3d');
  assert.equal(Math.round(laser.quotaMarginePct), 60);
  assert.equal(Math.round(p3d.quotaMarginePct), 40);
});

/* ── Il margine per ora ──────────────────────────────────────────────────
   L'unico numero che risponde a «cosa conviene fare», e l'unico che il
   modulo si rifiuta di produrre quando non ha i dati. */

test('il margine per ora si calcola solo dove le ore sono dichiarate', () => {
  const e = R.per([o('laser', 100, 60, 2), o('laser', 200, 100, 2)], 'tecnologia');
  assert.equal(e.righe[0].ore, 4);
  assert.equal(e.righe[0].marginePerOra, 35);
});

test('e non si stima mai dal prezzo', () => {
  const e = R.per([o('laser', 1000, 100)], 'tecnologia');
  assert.equal(e.righe[0].marginePerOra, null, 'nessuna ora dichiarata, nessun numero');
  assert.equal(e.righe[0].ore, 0);
});

test('le ore di un ordine senza costo non entrano nel denominatore', () => {
  /* Altrimenti il margine per ora avrebbe al numeratore un margine e al
     denominatore ore che non gli appartengono: un numero più basso del vero
     in proporzione ai dati mancanti. */
  const e = R.per([o('laser', 100, 60, 2), o('laser', 500, null, 10)], 'tecnologia');
  assert.equal(e.righe[0].ore, 2);
  assert.equal(e.righe[0].marginePerOra, 20);
});

test('i minuti valgono quanto le ore', () => {
  const e = R.per([{ technology: 'laser', amount: 100, economic: { costTotal: 40, minutes: 30 } }], 'tecnologia');
  assert.equal(e.righe[0].ore, 0.5);
  assert.equal(e.righe[0].marginePerOra, 120);
});

/* ── Il confronto ────────────────────────────────────────────────────────
   Nomina il migliore e il peggiore. Non dà consigli che non può fondare. */

test('nomina migliore e peggiore per margine orario', () => {
  const e = R.per([o('laser', 100, 60, 4), o('print3d', 100, 60, 1)], 'tecnologia');
  const c = R.confronto(e);
  assert.equal(c.disponibile, true);
  assert.equal(c.migliore.id, 'print3d', "l'ora di stampa 3D rende 40, quella di laser 10");
  assert.equal(c.peggiore.id, 'laser');
  assert.equal(c.rapporto, 4);
});

test('il confronto ignora il fatturato', () => {
  /* Il laser fattura dieci volte tanto e lascia meno per ogni ora occupata:
     è esattamente il caso che una classifica per fatturato sbaglia. */
  const e = R.per([o('laser', 1000, 900, 10), o('print3d', 100, 50, 1)], 'tecnologia');
  const c = R.confronto(e);
  assert.equal(c.migliore.id, 'print3d');
});

test('con un solo gruppo misurabile dice che non c\'è confronto', () => {
  const e = R.per([o('laser', 100, 60, 4), o('print3d', 100, 60)], 'tecnologia');
  const c = R.confronto(e);
  assert.equal(c.disponibile, false);
  assert.match(c.motivo, /un gruppo solo/);
});

test('senza ore da nessuna parte dice perché non risponde', () => {
  const e = R.per([o('laser', 100, 60), o('print3d', 100, 60)], 'tecnologia');
  const c = R.confronto(e);
  assert.equal(c.disponibile, false);
  assert.match(c.motivo, /ore/);
});

test('un gruppo non confrontabile resta fuori dal confronto', () => {
  const ordini = [o('print3d', 100, 60, 1)];
  ordini.push(o('laser', 100, 10, 1));
  for (let i = 0; i < 9; i += 1) ordini.push(o('laser', 100, null));
  const e = R.per(ordini, 'tecnologia');
  const c = R.confronto(e);
  assert.equal(c.disponibile, false, 'il laser ha un margine orario altissimo su un ordine su dieci');
});

/* ── Le altre dimensioni ─────────────────────────────────────────────── */

test('per cliente raggruppa su id, non sul nome', () => {
  const e = R.per([
    { clientId: 7, clientName: 'Rossi', amount: 100, economic: { costTotal: 40 } },
    { clientId: 7, clientName: 'Rossi S.r.l.', amount: 100, economic: { costTotal: 40 } },
  ], 'cliente');
  assert.equal(e.righe.length, 1);
  assert.equal(e.righe[0].ordini, 2);
});

test('per macchina e per canale', () => {
  const m = R.per([{ machineId: 'L1', machineName: 'Laser 1', amount: 100, economic: { costTotal: 40 } }], 'macchina');
  assert.equal(m.righe[0].label, 'Laser 1');
  const c = R.per([{ channel: 'Etsy', amount: 100, economic: { costTotal: 40 } }], 'canale');
  assert.equal(c.righe[0].label, 'Etsy');
  assert.equal(c.label, 'Canale');
});

test('una dimensione sconosciuta ricade sulla tecnologia invece di rompersi', () => {
  const e = R.per([o('laser', 100, 60)], 'colore-del-camion');
  assert.equal(e.dimensione, 'tecnologia');
  assert.equal(e.righe[0].id, 'laser');
});

/* ── Le fonti del dato ───────────────────────────────────────────────── */

test('legge i totali congelati quando l\'ordine porta solo lo snapshot', () => {
  const e = R.per([{
    technology: 'laser',
    economicSnapshot: { stato: 'SNAPSHOT', totals: { totalNet: 300, totalCost: 120 } },
  }], 'tecnologia');
  assert.equal(e.righe[0].ricavo, 300);
  assert.equal(e.righe[0].margine, 180);
});

test('uno snapshot non congelato non conta come costo dichiarato', () => {
  const e = R.per([{
    technology: 'laser', amount: 300,
    economicSnapshot: { stato: 'PENDING', totals: { totalNet: 300, totalCost: 120 } },
  }], 'tecnologia');
  assert.equal(e.righe[0].copertura.ordiniConCosto, 0);
});

/* ── I bordi ─────────────────────────────────────────────────────────── */

test('una lista vuota non produce numeri, produce zero gruppi', () => {
  const e = R.per([], 'tecnologia');
  assert.equal(e.righe.length, 0);
  assert.equal(e.totali.gruppi, 0);
  assert.equal(e.totali.coperturaPct, 0);
  assert.equal(R.confronto(e).disponibile, false);
});

test('niente al posto degli ordini non lancia', () => {
  assert.equal(R.per(null, 'tecnologia').righe.length, 0);
  assert.equal(R.per(undefined, 'cliente').righe.length, 0);
  assert.equal(R.confronto(null).disponibile, false);
});

test('un ordine in perdita resta in perdita, non si arrotonda a zero', () => {
  const e = R.per([o('laser', 100, 150)], 'tecnologia');
  assert.equal(e.righe[0].margine, -50);
  assert.equal(e.righe[0].marginePct, -50);
});

test('i totali sommano solo i gruppi confrontabili nel margine', () => {
  const ordini = [o('print3d', 100, 40)];
  ordini.push(o('laser', 1000, 900));
  for (let i = 0; i < 9; i += 1) ordini.push(o('laser', 1000, null));
  const e = R.per(ordini, 'tecnologia');
  assert.equal(e.totali.margine, 60, 'il laser non è confrontabile: il suo margine parziale resta fuori');
  assert.equal(e.totali.ricavo, 10100, 'il ricavo invece si vede tutto');
  assert.equal(e.totali.gruppiConfrontabili, 1);
  assert.equal(e.totali.gruppi, 2);
});

/* ── L'ordinamento è dichiarato ──────────────────────────────────────────
   Il primo collaudo a schermo ha trovato le due metà della pagina che si
   contraddicevano: il verdetto in alto nominava il migliore per ora, la
   tabella sotto ordinava per margine totale. Da qui l'ordinamento è un
   parametro, e l'esito dice quale ha usato. */

test('l\'esito dichiara su cosa ha ordinato', () => {
  const e = R.per([o('laser', 100, 60)], 'tecnologia');
  assert.equal(e.ordine, 'margine');
  assert.equal(e.ordineLabel, 'Margine totale');
  assert.ok(R.ORDINI.marginePerOra);
});

test('per margine totale vince chi ne lascia di più in tutto', () => {
  const e = R.per([o('laser', 1000, 800, 10), o('print3d', 100, 50, 1)], 'tecnologia', { ordine: 'margine' });
  assert.equal(e.righe[0].id, 'laser', '200 contro 50');
});

test('per margine orario vince chi ne lascia di più per ora', () => {
  /* Stessi ordini, classifica opposta: è il punto di avere due numeri. */
  const e = R.per([o('laser', 1000, 800, 10), o('print3d', 100, 50, 1)], 'tecnologia', { ordine: 'marginePerOra' });
  assert.equal(e.righe[0].id, 'print3d', '50/h contro 20/h');
});

test('per margine per ordine', () => {
  const e = R.per([
    o('laser', 1000, 800), o('laser', 1000, 800),
    o('print3d', 500, 100),
  ], 'tecnologia', { ordine: 'marginePerOrdine' });
  assert.equal(e.righe[0].id, 'print3d', '400 per ordine contro 200');
});

test('chi non ha il numero scelto finisce in fondo, non a zero', () => {
  /* Un gruppo senza ore dichiarate non vale zero euro all'ora: non lo sa. */
  const e = R.per([o('laser', 100, 60), o('print3d', 100, 90, 1)], 'tecnologia', { ordine: 'marginePerOra' });
  assert.equal(e.righe[0].id, 'print3d');
  assert.equal(e.righe[1].id, 'laser');
  assert.equal(e.righe[1].marginePerOra, null);
});

test('ma la copertura viene prima di qualsiasi ordinamento', () => {
  const ordini = [o('print3d', 100, 90, 1)];
  ordini.push(o('laser', 100, 1, 0.01));
  for (let i = 0; i < 9; i += 1) ordini.push(o('laser', 100, null));
  const e = R.per(ordini, 'tecnologia', { ordine: 'marginePerOra' });
  assert.equal(e.righe[0].id, 'print3d', 'il laser ha 9900/h su un ordine su dieci');
});

test('un ordinamento sconosciuto ricade sul margine invece di rompersi', () => {
  const e = R.per([o('laser', 100, 60)], 'tecnologia', { ordine: 'simpatia' });
  assert.equal(e.ordine, 'margine');
});
