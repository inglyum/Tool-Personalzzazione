/**
 * produzione.test.mjs — PROD-001…010
 *
 * La vista Produzione elencava gli ordini con la data che qualcuno aveva
 * scritto a mano. Niente diceva se quella data fosse raggiungibile.
 *
 * La domanda di questi test è una sola: **il modulo produce un numero quando
 * non ha i dati per produrlo?** Un utilizzo dell'80% calcolato ignorando gli
 * ordini di cui non si sa la durata è peggio di nessun numero: sembra una
 * misura.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({
  Math, JSON, Object, Array, Date, Number, String, parseFloat, isFinite, isNaN, Infinity,
});
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), contesto);
vm.runInContext(fs.readFileSync('src/product/order-snapshot.js', 'utf8'), contesto);
vm.runInContext(fs.readFileSync('src/product/order-fields.js', 'utf8'), contesto);
vm.runInContext(fs.readFileSync('src/product/production-capacity.js', 'utf8'), contesto);
const P = contesto.InglyProduzione;

/* Lunedì 1 giugno 2026, così i conti sui giorni lavorativi sono leggibili. */
const LUN = '2026-06-01T08:00:00.000Z';

const macchina = (id, extra) => Object.assign({ id, name: 'M' + id }, extra || {});
const ordine = (id, extra) => Object.assign(
  { id, stage: 'produzione', machineId: 'm1', machineName: 'M m1' }, extra || {});

/* ── PROD-001 · capacità ────────────────────────────────────────────────── */

test('PROD-001 · le ore al giorno dichiarate vengono usate così come sono', () => {
  const c = P.capacitaMacchina(macchina('m1', { hoursPerDay: 6 }));
  assert.equal(c.oreGiorno, 6);
  assert.equal(c.fonte, 'dichiarata');
});

test('PROD-001b · il monte ore annuo si converte in media, e lo dichiara', () => {
  const c = P.capacitaMacchina(macchina('m1', { expectedAnnualHours: 1250 }));
  assert.equal(c.oreGiorno, 5);
  assert.equal(c.fonte, 'derivata');
  assert.ok(/250/.test(c.nota));
});

test('PROD-001c · senza nessuno dei due la capacità non si inventa', () => {
  const c = P.capacitaMacchina(macchina('m1'));
  assert.equal(c.oreGiorno, null);
  assert.equal(c.fonte, 'assente');
});

test('PROD-001d · le ore dichiarate vincono sul monte ore annuo', () => {
  const c = P.capacitaMacchina(macchina('m1', { hoursPerDay: 4, expectedAnnualHours: 2000 }));
  assert.equal(c.oreGiorno, 4);
});

/* ── PROD-002 · carico ──────────────────────────────────────────────────── */

test('PROD-002 · le ore di un ordine si leggono da estimatedHours', () => {
  const r = P.oreOrdine(ordine(1, { estimatedHours: 3.5 }));
  assert.equal(r.ore, 3.5);
  assert.equal(r.fonte, 'dichiarate');
});

test('PROD-002b · i minuti dichiarati valgono quanto le ore', () => {
  assert.equal(P.oreOrdine(ordine(1, { estimatedMinutes: 90 })).ore, 1.5);
});

test('PROD-002c · in mancanza si usa il tempo davvero registrato', () => {
  const r = P.oreOrdine(ordine(1), { timelogs: [
    { orderId: 1, minutes: 45 }, { orderId: 1, minutes: 75 }, { orderId: 2, minutes: 600 },
  ] });
  assert.equal(r.ore, 2);
  assert.equal(r.fonte, 'consuntivo');
});

test('PROD-002d · un ordine senza tempo vale «non lo so», non zero', () => {
  const r = P.oreOrdine(ordine(1));
  assert.equal(r.ore, null);
  assert.equal(r.fonte, 'assente');
});

/* ── PROD-003/004 · residua e sovraccarico ──────────────────────────────── */

const analisi = (macchine, ordini, opz) => P.analizza(Object.assign({
  macchine, ordini, timelogs: [], finestraGiorni: 7, oggi: LUN,
}, opz || {}));

test('PROD-003 · capacità disponibile − carico = residua', () => {
  const a = analisi(
    [macchina('m1', { hoursPerDay: 8 })],
    [ordine(1, { estimatedHours: 10 }), ordine(2, { estimatedHours: 6 })],
  );
  const r = a.righe[0];
  /* 7 giorni di calendario da lunedì: 5 giorni lavorativi. */
  assert.equal(r.giorniUtili, 5);
  assert.equal(r.disponibile, 40);
  assert.equal(r.carico, 16);
  assert.equal(r.residua, 24);
  assert.equal(Math.round(r.utilizzo), 40);
  assert.equal(r.sovraccarico, false);
  assert.equal(r.completo, true);
});

test('PROD-004 · il sovraccarico si dichiara', () => {
  const a = analisi(
    [macchina('m1', { hoursPerDay: 4 })],
    [ordine(1, { estimatedHours: 30 })],
  );
  const r = a.righe[0];
  assert.equal(r.disponibile, 20);
  assert.equal(r.sovraccarico, true);
  assert.ok(r.residua < 0);
  assert.equal(Math.round(r.utilizzo), 150);
});

test('PROD-004b · gli ordini completati non occupano più la macchina', () => {
  const a = analisi(
    [macchina('m1', { hoursPerDay: 8 })],
    [ordine(1, { estimatedHours: 10, stage: 'completato' }), ordine(2, { estimatedHours: 4 })],
  );
  assert.equal(a.righe[0].carico, 4);
  assert.equal(a.righe[0].ordini, 1);
});

/* ── PROD-010 · dati insufficienti ──────────────────────────────────────── */

test('PROD-010 · un ordine senza ore rende l analisi incompleta, non ottimista', () => {
  const a = analisi(
    [macchina('m1', { hoursPerDay: 8 })],
    [ordine(1, { estimatedHours: 10 }), ordine(2)],
  );
  const r = a.righe[0];
  assert.equal(r.carico, 10, 'l ordine senza ore non conta zero: non conta');
  assert.equal(r.ordiniSenzaOre, 1);
  assert.equal(r.completo, false);
  assert.ok(/senza tempo/.test(r.motivoIncompleto));
});

test('PROD-010b · una macchina senza capacità non ha una percentuale di utilizzo', () => {
  const a = analisi([macchina('m1')], [ordine(1, { estimatedHours: 10 })]);
  const r = a.righe[0];
  assert.equal(r.disponibile, null);
  assert.equal(r.utilizzo, null);
  assert.equal(r.residua, null);
  assert.equal(r.completo, false);
});

test('PROD-010c · gli ordini senza macchina non spariscono dal conto', () => {
  const a = analisi(
    [macchina('m1', { hoursPerDay: 8 })],
    [ordine(1, { estimatedHours: 10 }), { id: 2, stage: 'produzione', estimatedHours: 5 }],
  );
  assert.equal(a.nonAssegnati.ordini, 1);
  assert.equal(a.nonAssegnati.ore, 5);
  assert.equal(a.totali.carico, 15, 'il totale comprende il lavoro non ancora assegnato');
});

test('PROD-007 · una macchina nominata ma non nel parco compare lo stesso', () => {
  const a = analisi(
    [macchina('m1', { hoursPerDay: 8 })],
    [ordine(1, { estimatedHours: 4 }), ordine(2, { machineId: 'mX', machineName: 'Fresa', estimatedHours: 3 })],
  );
  const fuori = a.righe.filter((r) => r.nome === 'Fresa')[0];
  assert.ok(fuori, 'la macchina fuori parco ha la sua riga');
  assert.equal(fuori.carico, 3);
  assert.equal(fuori.disponibile, null);
  assert.ok(/non registrata/.test(fuori.motivoIncompleto));
});

test('PROD-008 · più ordini sulla stessa macchina sommano le ore', () => {
  const a = analisi(
    [macchina('m1', { hoursPerDay: 8 })],
    [ordine(1, { estimatedHours: 2 }), ordine(2, { estimatedHours: 3 }), ordine(3, { estimatedHours: 1.5 })],
  );
  assert.equal(a.righe[0].carico, 6.5);
  assert.equal(a.righe[0].ordini, 3);
});

/* ── PROD-005/006 · scadenze ────────────────────────────────────────────── */

const ctx = (macchine, ordini) => ({ macchine, ordini, timelogs: [], oggi: LUN });

test('PROD-005 · la data stimata è oggi più le ore convertite in giorni lavorativi', () => {
  const o = ordine(1, { estimatedHours: 16, dueDate: '2026-06-30' });
  const s = P.scadenza(o, ctx([macchina('m1', { hoursPerDay: 8 })], [o]));
  assert.equal(s.stimabile, true);
  assert.equal(s.giorniStimati, 2);
  /* Lunedì + 2 giorni lavorativi = mercoledì 3 giugno. */
  assert.equal(s.dataStimata.toISOString().slice(0, 10), '2026-06-03');
  assert.equal(s.semaforo.id, 'verde');
});

test('PROD-005b · la coda davanti sposta la data', () => {
  const primo = ordine(1, { estimatedHours: 16, dueDate: '2026-06-05' });
  const secondo = ordine(2, { estimatedHours: 8, dueDate: '2026-06-30' });
  const s = P.scadenza(secondo, ctx([macchina('m1', { hoursPerDay: 8 })], [primo, secondo]));
  assert.equal(s.ordiniInCoda, 1);
  assert.equal(s.oreCoda, 16);
  assert.equal(s.giorniStimati, 3, '16 h davanti + 8 h proprie su 8 h/giorno');
});

test('PROD-005c · il fine settimana non produce', () => {
  /* Venerdì: 8 h di lavoro finiscono lunedì, non sabato. */
  const o = ordine(1, { estimatedHours: 8, dueDate: '2026-06-30' });
  const s = P.scadenza(o, { macchine: [macchina('m1', { hoursPerDay: 8 })], ordini: [o],
    oggi: '2026-06-05T08:00:00.000Z' });
  assert.equal(s.dataStimata.getDay(), 1, 'lunedì');
  assert.equal(s.dataStimata.toISOString().slice(0, 10), '2026-06-08');
});

test('PROD-006 · una data non raggiungibile è rossa', () => {
  const o = ordine(1, { estimatedHours: 80, dueDate: '2026-06-03' });
  const s = P.scadenza(o, ctx([macchina('m1', { hoursPerDay: 8 })], [o]));
  assert.equal(s.semaforo.id, 'rosso');
  assert.ok(s.margineGiorni < 0);
});

test('PROD-006b · una data appena raggiungibile è gialla', () => {
  const o = ordine(1, { estimatedHours: 16, dueDate: '2026-06-04' });
  const s = P.scadenza(o, ctx([macchina('m1', { hoursPerDay: 8 })], [o]));
  assert.equal(s.semaforo.id, 'giallo');
  assert.equal(s.margineGiorni, 1);
});

test('PROD-006c · senza ore o senza capacità la stima non si fa', () => {
  const senzOre = ordine(1, { dueDate: '2026-06-30' });
  const a = P.scadenza(senzOre, ctx([macchina('m1', { hoursPerDay: 8 })], [senzOre]));
  assert.equal(a.stimabile, false);
  assert.equal(a.dataStimata, null);
  assert.equal(a.semaforo.id, 'ignoto');
  assert.ok(/non dichiarato/.test(a.motivo));

  const senzaCap = ordine(2, { estimatedHours: 4, dueDate: '2026-06-30' });
  const b = P.scadenza(senzaCap, ctx([macchina('m1')], [senzaCap]));
  assert.equal(b.stimabile, false);
  assert.equal(b.semaforo.id, 'ignoto');
});

test('PROD-006d · una coda con ordini senza ore dà una stima dichiarata incompleta', () => {
  const primo = ordine(1, { dueDate: '2026-06-05' });
  const secondo = ordine(2, { estimatedHours: 8, dueDate: '2026-06-30' });
  const s = P.scadenza(secondo, ctx([macchina('m1', { hoursPerDay: 8 })], [primo, secondo]));
  assert.equal(s.stimabile, true);
  assert.equal(s.incompleta, true);
  assert.equal(s.codaSenzaOre, 1);
  assert.ok(/slittare/.test(s.motivo));
});

/* ── PROD-009 · stabilità ───────────────────────────────────────────────── */

test('PROD-009 · analizzare due volte gli stessi dati dà lo stesso risultato', () => {
  const macchine = [macchina('m1', { hoursPerDay: 8 })];
  const ordini = [ordine(1, { estimatedHours: 4 }), ordine(2, { estimatedHours: 3 })];
  const a = JSON.stringify(analisi(macchine, ordini));
  const b = JSON.stringify(analisi(macchine, ordini));
  assert.equal(a, b);
});

test('PROD-009b · e non modifica gli ordini né le macchine', () => {
  const macchine = [macchina('m1', { hoursPerDay: 8 })];
  const ordini = [ordine(1, { estimatedHours: 4 })];
  const prima = JSON.stringify([macchine, ordini]);
  analisi(macchine, ordini);
  P.scadenza(ordini[0], ctx(macchine, ordini));
  assert.equal(JSON.stringify([macchine, ordini]), prima);
});

test('PROD-009c · nessun dato non fa cadere niente', () => {
  assert.doesNotThrow(() => P.analizza({}));
  assert.doesNotThrow(() => P.scadenza(null, {}));
  const a = P.analizza({});
  assert.equal(a.righe.length, 0);
  assert.equal(a.totali.completo, false, 'senza macchine non si dichiara un conto completo');
});
