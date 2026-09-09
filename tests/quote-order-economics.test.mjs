/**
 * quote-order-economics.test.mjs — la distinta economica, e quello che deve
 * sopravvivere ai passaggi.
 *
 * Un preventivo salvato conservava tre numeri: costo, netto, lordo. Le voci
 * che li avevano prodotti restavano nel calcolo e non arrivavano da nessuna
 * parte. L'ordine che ne nasceva aveva un totale e nient'altro.
 *
 * Qui si verifica che la distinta si costruisca, sopravviva alla copia,
 * si possa modificare senza toccare l'originale, e che lo scostamento fra i
 * due dica la verità.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/product/machine-rate.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('src/product/cost-breakdown.js', 'utf8'), sandbox);
const E = sandbox.window.InglyCostEngine;
const B = sandbox.window.InglyCostBreakdown;

const CASO = {
  tecnologia: 'print3d', hours: 9, grams: 290, materialPricePerKg: 15.50,
  machinePrice: 420, machineLifeHours: 3000, ratedPowerW: 150, kwhPrice: 0.28,
  maintenancePerHour: 0.12, laborPerHour: 18, setupMin: 15, finishMin: 5,
  failureRate: 7, qty: 1,
  packagingItems: [{ name: 'Sacchetto', qty: 1, unitCost: 0.65 }],
};

test('la distinta si costruisce dal calcolo del motore', () => {
  const d = B.daCalcolo(E.calcola(CASO), { quantita: 1 });
  assert.equal(d.vuota, false);
  assert.ok(d.voci.length >= 5, `solo ${d.voci.length} voci`);
});

test('ogni voce porta i campi che il comando chiede', () => {
  const d = B.daCalcolo(E.calcola(CASO), { quantita: 1 });
  for (const v of d.voci) {
    for (const k of ['id', 'category', 'label', 'quantity', 'unit', 'unitCost',
      'totalCost', 'source', 'editable']) {
      assert.ok(k in v, `la voce ${v.id} non ha ${k}`);
    }
    assert.ok(isFinite(v.totalCost) && v.totalCost >= 0);
  }
});

test('le voci finiscono nella categoria giusta', () => {
  const d = B.daCalcolo(E.calcola(CASO), { quantita: 1 });
  assert.ok(d.categorie.material.length > 0, 'il materiale');
  assert.ok(d.categorie.machine.length > 0, 'la macchina');
  assert.ok(d.categorie.energy.length > 0, 'l\'energia');
  assert.ok(d.categorie.labor.length > 0, 'il lavoro');
  assert.ok(d.categorie.setup.length > 0, 'l\'avviamento');
  assert.ok(d.categorie.packaging.length > 0, 'l\'imballo');
});

test('non si inventano voci che non ci sono', () => {
  const senzaImballo = Object.assign({}, CASO, { packagingItems: [] });
  const d = B.daCalcolo(E.calcola(senzaImballo), { quantita: 1 });
  assert.equal(d.categorie.packaging.length, 0,
    'una riga imballo a zero direbbe che l\'imballo c\'è e costa niente');
  assert.equal(d.voci.filter((v) => v.totalCost === 0).length, 0,
    'nessuna riga a zero: sono rumore');
});

test('la somma delle voci è il costo del pezzo', () => {
  const r = E.calcola(CASO);
  const d = B.daCalcolo(r, { quantita: 1 });
  assert.ok(Math.abs(d.totals.costoVoci - r.costoPezzo) < 0.02,
    `voci € ${d.totals.costoVoci} contro costo € ${r.costoPezzo}`);
});

test('l avviamento porta il totale del lavoro e il costo per pezzo', () => {
  const d = B.daCalcolo(E.calcola(Object.assign({}, CASO, { qty: 10 })), { quantita: 10 });
  const setup = d.categorie.setup[0];
  assert.ok(setup, 'manca la riga avviamento');
  assert.equal(setup.quantity, 10);
  assert.ok(Math.abs(setup.unitCost - setup.totalCost / 10) < 0.001);
  assert.match(setup.description, /ripartito su 10/);
});

test('il costo unitario si calcola solo quando c è una quantità', () => {
  const d = B.daCalcolo(E.calcola(CASO), { quantita: 1 });
  for (const v of d.voci) {
    if (v.quantity == null) assert.equal(v.unitCost, null,
      `${v.id} ha un costo unitario senza quantità: sembra un prezzo e non lo è`);
  }
});

/* ── Modifica: l'originale non si tocca ─────────────────────────────────── */

test('modificare una voce non tocca la distinta di partenza', () => {
  const originale = B.daCalcolo(E.calcola(CASO), { quantita: 1 });
  const macchina = originale.categorie.machine[0];
  const prima = macchina.totalCost;

  const modificata = B.conVoce(originale, macchina.id, { totalCost: 10 });
  assert.equal(originale.categorie.machine[0].totalCost, prima,
    'lo snapshot del preventivo deve restare quello che era');
  assert.equal(modificata.categorie.machine[0].totalCost, 10);
  assert.equal(modificata.modificata, true);
});

test('cambiando la quantità il totale segue', () => {
  const d = B.daCalcolo(E.calcola(CASO), { quantita: 1 });
  const mat = d.categorie.material[0];
  const m = B.conVoce(d, mat.id, { quantity: 580 });
  const nuovo = m.voci.find((v) => v.id === mat.id);
  assert.ok(Math.abs(nuovo.totalCost - nuovo.unitCost * 580) < 0.01);
});

test('cambiando il totale è il costo unitario a seguirlo', () => {
  const d = B.daCalcolo(E.calcola(CASO), { quantita: 1 });
  const mat = d.categorie.material[0];
  assert.equal(mat.quantity, 290, 'il materiale sa di essere 290 grammi');
  const m = B.conVoce(d, mat.id, { totalCost: 10 });
  const nuovo = m.voci.find((v) => v.id === mat.id);
  assert.ok(Math.abs(nuovo.unitCost * nuovo.quantity - 10) < 0.01,
    'i tre numeri devono tornare fra loro');
});

test('una voce senza quantità non si inventa un costo unitario', () => {
  /* Lo scarto è una percentuale, non un pezzo: dargli quantità 1 farebbe
     sembrare il totale un prezzo unitario. */
  const d = B.daCalcolo(E.calcola(CASO), { quantita: 1 });
  const scarto = d.categorie.waste[0];
  assert.equal(scarto.quantity, null);
  assert.equal(scarto.unitCost, null);
  const m = B.conVoce(d, scarto.id, { totalCost: 2 });
  assert.equal(m.voci.find((v) => v.id === scarto.id).unitCost, null);
});

test('le quantità arrivano dagli ingressi del calcolo, non da un indovinello', () => {
  const d = B.daCalcolo(E.calcola(CASO), { quantita: 1 });
  const per = (id) => d.voci.find((v) => v.id === id);
  assert.deepEqual([per('materiale').quantity, per('materiale').unit], [290, 'g']);
  assert.deepEqual([per('macchina').quantity, per('macchina').unit], [9, 'h']);
  assert.deepEqual([per('finitura').quantity, per('finitura').unit], [5, 'min']);
});

test('una voce modificata dichiara di esserlo', () => {
  const d = B.daCalcolo(E.calcola(CASO), { quantita: 1 });
  const m = B.conVoce(d, d.voci[0].id, { totalCost: 5 });
  assert.equal(m.voci[0].source, 'modificato');
});

test('quando un costo sale, è il margine a scendere — non il cliente a pagare', () => {
  /* Riderivare il prezzo da un margine produce numeri che non sono mai
     esistiti: su un preventivo dello Smart Quoter, dove il prezzo nasce dai
     prezzi di riga e non da un margine sul costo, la prima versione di questa
     funzione faceva crollare il prezzo da € 385 a € 76. Il prezzo concordato
     resta; riprezzare è una decisione commerciale a parte. */
  const r = E.calcola(CASO);
  const d = B.daCalcolo(r, { quantita: 1 });
  d.totals.marginePct = 40;
  d.totals.netto = d.totals.costoPezzo / 0.6;
  const prezzoPrima = d.totals.netto;

  const m = B.conVoce(d, d.categorie.machine[0].id, { totalCost: 20 });
  assert.equal(m.totals.netto, prezzoPrima, 'il prezzo concordato non si muove da solo');
  assert.ok(m.totals.marginePct < 40, 'il margine scende, ed è quello che serve vedere');
  assert.ok(Math.abs(m.totals.margine - (m.totals.netto - m.totals.costoTotale)) < 0.01,
    'profitto = prezzo − costo, e questa aritmetica non ha alternative');
  assert.equal(m.totals.margineOriginalePct, 40, 'il margine di partenza resta leggibile');
});

test('si può aggiungere e togliere una voce', () => {
  const d = B.daCalcolo(E.calcola(CASO), { quantita: 1 });
  const quante = d.voci.length;
  const piu = B.conNuovaVoce(d, { label: 'Verniciatura', category: 'postProcess',
    quantity: 1, unit: 'pz', unitCost: 3.5 });
  assert.equal(piu.voci.length, quante + 1);
  assert.equal(piu.categorie.postProcess[piu.categorie.postProcess.length - 1].totalCost, 3.5);
  assert.ok(piu.totals.costoVoci > d.totals.costoVoci);

  const meno = B.senzaVoce(piu, piu.voci[piu.voci.length - 1].id);
  assert.equal(meno.voci.length, quante);
  assert.ok(Math.abs(meno.totals.costoVoci - d.totals.costoVoci) < 0.01);
});

/* ── Lo scostamento ─────────────────────────────────────────────────────── */

test('lo scostamento dice che cosa è cambiato, voce per voce', () => {
  const originale = B.daCalcolo(E.calcola(CASO), { quantita: 1 });
  originale.totals.marginePct = 40;
  originale.totals.netto = originale.totals.costoPezzo / 0.6;

  const corrente = B.conNuovaVoce(
    B.conVoce(originale, originale.categorie.machine[0].id, { totalCost: 5 }),
    { label: 'Imprevisto', category: 'other', quantity: 1, unitCost: 2 });

  const s = B.scostamento(originale, corrente);
  assert.equal(s.invariato, false);
  assert.ok(s.costo > 0, 'il costo è salito');
  assert.equal(s.voci.filter((v) => v.stato === 'modificata').length, 1);
  assert.equal(s.voci.filter((v) => v.stato === 'aggiunta').length, 1);
});

test('senza modifiche lo scostamento è zero, e lo dice', () => {
  const d = B.daCalcolo(E.calcola(CASO), { quantita: 1 });
  const s = B.scostamento(d, d);
  assert.equal(s.invariato, true);
  assert.equal(s.costo, 0);
});

test('una voce rimossa compare nello scostamento come rimossa', () => {
  const d = B.daCalcolo(E.calcola(CASO), { quantita: 1 });
  const senza = B.senzaVoce(d, d.categorie.machine[0].id);
  const s = B.scostamento(d, senza);
  assert.equal(s.voci.filter((v) => v.stato === 'rimossa').length, 1);
  assert.ok(s.costo < 0);
});

/* ── I record vecchi ────────────────────────────────────────────────────── */

test('un preventivo salvato prima della distinta non ne inventa una', () => {
  const v = B.daRecordVecchio({ id: 1, totalCost: 20, netPrice: 33, grossPrice: 40 });
  assert.equal(v.vuota, true);
  assert.equal(v.legacy, true);
  assert.match(v.motivo, /non sono ricostruibili/);
  assert.equal(v.totals.costoTotale, 20, 'i totali che aveva si conservano');
  assert.equal(v.totals.netto, 33);
});

test('e uno che ce l ha la restituisce', () => {
  const d = B.daCalcolo(E.calcola(CASO), { quantita: 1 });
  const letto = B.daRecordVecchio({ id: 1, costBreakdown: d });
  assert.equal(letto.voci.length, d.voci.length);
});

/* ── Le righe di un preventivo classico ─────────────────────────────────── */

test('la distinta si costruisce anche dalle righe dello Smart Quoter', () => {
  const righe = [
    { id: 1, name: 'Targa incisa', qty: 20, unitCost: 0.9, subtotal: 18, itemKey: 'items:5' },
    { id: 2, name: 'Verniciatura', qty: 20, unitCost: 0.2, subtotal: 4 },
  ];
  const d = B.daRighe(righe, { costoPezzo: 22, subtotalNet: 44, totalGross: 53.68, marginPct: 50 });
  assert.equal(d.voci.length, 2);
  assert.equal(d.voci[0].source, 'magazzino', 'una riga collegata al magazzino lo dichiara');
  assert.equal(d.voci[0].confidence, 'verified');
  assert.equal(d.voci[1].source, 'preventivo');
  assert.equal(d.totals.costoVoci, 22);
});

test('un calcolo indisponibile produce una distinta vuota che dice perché', () => {
  const d = B.daCalcolo({ indisponibile: true, motivo: 'motore assente' });
  assert.equal(d.vuota, true);
  assert.match(d.motivo, /motore assente/);
  assert.equal(d.voci.length, 0);
});
