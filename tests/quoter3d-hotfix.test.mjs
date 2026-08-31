/**
 * quoter3d-hotfix.test.mjs — i cinque casi di calibrazione obbligatori.
 *
 * Punto 22 della direttiva. Ogni risultato deve essere spiegabile voce per
 * voce: un totale che «viene così» non si può difendere davanti a un cliente
 * né davanti a chi porta i libri.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, String, Date });
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), ctx);
const E = ctx.InglyCostEngine;

const voce = (r, id) => { const v = r.perPezzo.voci.find((x) => x.id === id); return v ? v.value : 0; };
const vicino = (a, b, t = 0.005) => Math.abs(a - b) < t;

/* Il caso base della direttiva. */
const CASO = {
  tecnologia: 'print3d', grams: 290, hours: 9.95, qty: 1,
  spoolPrice: 20, spoolGrams: 1000,
  kwhPrice: 0.30, watt: 256, dutyCycle: 0.6,
  machinePrice: 400, machineLifeHours: 5000,
  laborPerHour: 18, setupMin: 15,
  failureRate: 0, maintenancePerHour: 0,
};

test('caso 1 · PLA 290 g · 9h57 · €20/kg — ogni voce si spiega', () => {
  const r = E.calcola(CASO);

  /* materiale = 290/1000 × 20 */
  assert.ok(vicino(voce(r, 'materiale'), 5.80), `materiale €${voce(r, 'materiale').toFixed(4)}`);

  /* energia = 256 W × 0,6 ÷ 1000 × 9,95 h × €0,30 */
  const attesaEnergia = (256 * 0.6 / 1000) * 9.95 * 0.30;
  assert.ok(vicino(voce(r, 'energia'), attesaEnergia), `energia €${voce(r, 'energia').toFixed(4)}`);

  /* ammortamento = (400 − 0) ÷ 5000 × 9,95 */
  assert.ok(vicino(voce(r, 'macchina'), 400 / 5000 * 9.95), `macchina €${voce(r, 'macchina').toFixed(4)}`);

  /* avviamento = 15/60 × 18, per job, diviso 1 pezzo */
  assert.ok(vicino(r.unaTantum.perPezzo, 15 / 60 * 18), `avviamento €${r.unaTantum.perPezzo.toFixed(4)}`);

  /* e il totale è la somma, senza resti */
  const somma = r.perPezzo.voci.reduce((a, v) => a + v.value, 0) + r.unaTantum.perPezzo + r.overhead;
  assert.ok(vicino(r.costoPezzo, somma), `totale €${r.costoPezzo.toFixed(4)} vs somma €${somma.toFixed(4)}`);
});

test('caso 2 · lo stesso pezzo a €15,99/kg', () => {
  const r = E.calcola({ ...CASO, spoolPrice: 15.99 });
  assert.ok(vicino(voce(r, 'materiale'), 4.6371, 0.0005), `€${voce(r, 'materiale').toFixed(4)}`);
  /* Solo il materiale cambia: nient'altro dipende dal prezzo del filamento. */
  const base = E.calcola(CASO);
  assert.ok(vicino(voce(r, 'energia'), voce(base, 'energia')));
  assert.ok(vicino(voce(r, 'macchina'), voce(base, 'macchina')));
});

test('caso 3 · 100 g · 6 h · P1S con 105 W medi misurati', () => {
  const r = E.calcola({ ...CASO, grams: 100, hours: 6, averagePowerW: 105, watt: undefined });
  assert.ok(vicino(voce(r, 'materiale'), 2.00), `€${voce(r, 'materiale').toFixed(4)}`);
  assert.ok(vicino(voce(r, 'energia'), (105 / 1000) * 6 * 0.30), `€${voce(r, 'energia').toFixed(4)}`);
  assert.equal(r.energia.modo, 'medio');
  assert.equal(r.energia.confidence, 'verified',
    'una potenza media dichiarata vale più di una targa');
});

test('caso 4 · energia misurata: il ciclo di lavoro non si applica due volte', () => {
  /* Un contatore ha già contato le pause: applicargli il ciclo lo
     abbasserebbe una seconda volta. */
  const r = E.calcola({ ...CASO, measuredEnergyKwh: 1.53 });
  assert.ok(vicino(voce(r, 'energia'), 1.53 * 0.30), `€${voce(r, 'energia').toFixed(4)}`);
  assert.equal(r.energia.modo, 'misurato');
  assert.equal(r.energia.confidence, 'measured');
});

test('caso 5 · dieci pezzi: solo l\'avviamento si divide', () => {
  const uno = E.calcola(CASO);
  const dieci = E.calcola({ ...CASO, qty: 10 });

  assert.ok(vicino(dieci.unaTantum.perPezzo, uno.unaTantum.perPezzo / 10),
    'l\'avviamento è per lavoro, non per pezzo');
  /* Il materiale per pezzo non cambia: dieci pezzi consumano dieci volte il
     filamento, non uno sconto. */
  assert.ok(vicino(voce(dieci, 'materiale'), voce(uno, 'materiale')));
  assert.ok(vicino(voce(dieci, 'energia'), voce(uno, 'energia')));
  assert.ok(dieci.costoPezzo < uno.costoPezzo);
  assert.ok(vicino(uno.costoPezzo - dieci.costoPezzo,
    uno.unaTantum.perPezzo - dieci.unaTantum.perPezzo),
  'tutta la differenza deve venire dall\'avviamento ripartito, e da nient\'altro');
});

/* ── Margine e ricarico, l'esempio obbligatorio della direttiva ─────────── */

test('costo €10: ricarico 40% fa €14, margine 40% fa €16,6667', () => {
  const rica = E.prezzo(10, { strategia: 'ricarico', ricarico: 1.4, ivaPct: 0 });
  const marg = E.prezzo(10, { strategia: 'margine', marginePct: 40, ivaPct: 0 });
  assert.ok(vicino(rica.netto, 14), `ricarico → €${rica.netto.toFixed(4)}`);
  assert.ok(vicino(marg.netto, 50 / 3, 0.001), `margine → €${marg.netto.toFixed(4)}`);
  /* E la UI deve poter mostrare entrambe le letture dello stesso prezzo. */
  assert.ok(vicino(rica.marginePct, 200 / 7, 0.01), 'un ricarico del 40% è un margine del 28,57%');
  assert.ok(vicino(marg.ricaricoPct, 200 / 3, 0.01), 'un margine del 40% è un ricarico del 66,67%');
});

/* ── Lo scarto non si applica due volte ────────────────────────────────── */

test('lo scarto è una sola voce, non un fattore applicato al totale', () => {
  const senza = E.calcola({ ...CASO, failureRate: 0 });
  const con = E.calcola({ ...CASO, failureRate: 10 });
  const perdibile = ['materiale', 'energia', 'macchina', 'manutenzione']
    .reduce((a, id) => a + voce(senza, id), 0);
  assert.ok(vicino(voce(con, 'scarto'), perdibile * 0.10 / 0.90, 0.01),
    `scarto €${voce(con, 'scarto').toFixed(4)}`);
  /* E non si applica anche all'avviamento, che non si butta quando un pezzo
     fallisce: la macchina è già stata preparata. */
  assert.ok(vicino(con.unaTantum.perPezzo, senza.unaTantum.perPezzo));
});

test('un pezzo fallito non moltiplica il costo: lo aumenta di tasso/(1−tasso)', () => {
  /* €10 al 10% di scarto fanno €11,11, non €11: su cento pezzi ne servono
     111 per consegnarne cento, non 110. */
  const r = E.calcola({ ...CASO, failureRate: 10, setupMin: 0 });
  const senza = E.calcola({ ...CASO, failureRate: 0, setupMin: 0 });
  const rapporto = r.costoPezzo / senza.costoPezzo;
  assert.ok(vicino(rapporto, 1 / 0.9, 0.001), `rapporto ${rapporto.toFixed(4)}`);
});

/* ── L'IVA non entra mai nel costo ─────────────────────────────────────── */

test('l\'IVA arriva dopo il netto e non tocca nessun livello di costo', () => {
  const senza = E.calcola(CASO).costoPezzo;
  const con = E.calcola({ ...CASO, ivaPct: 22 }).costoPezzo;
  assert.ok(vicino(senza, con, 1e-9));
  const p = E.prezzo(senza, { strategia: 'margine', marginePct: 40, ivaPct: 22 });
  assert.ok(vicino(p.lordo, p.netto * 1.22, 0.001));
  assert.ok(p.netto > senza, 'il netto sta fra il costo e il lordo');
});

/* ── I tre livelli vengono dallo stesso calcolo ────────────────────────── */

test('costo stampa, produzione e aziendale sono lo stesso calcolo a tre profondità', () => {
  const c = { ...CASO, failureRate: 7, maintenancePerHour: 0.12, finishMin: 10 };
  const liv = (l) => E.calcola({ ...c, livelloCosto: l });
  const stampa = liv('stampa'), macchina = liv('macchina'), completo = liv('completo');

  /* Stampa = materiale + energia, e nient'altro. */
  assert.ok(vicino(stampa.costoPezzo, voce(stampa, 'materiale') + voce(stampa, 'energia')));
  /* E le voci comuni valgono lo stesso a ogni livello: è lo stesso calcolo. */
  assert.ok(vicino(voce(stampa, 'materiale'), voce(completo, 'materiale')));
  assert.ok(vicino(voce(macchina, 'macchina'), voce(completo, 'macchina')));
  assert.ok(stampa.costoPezzo < macchina.costoPezzo);
  assert.ok(macchina.costoPezzo < completo.costoPezzo);
});
