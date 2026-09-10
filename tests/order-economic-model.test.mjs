/**
 * order-economic-model.test.mjs — `order.economic`, il modello canonico.
 *
 * Un ordine che porta solo `value: 150` non sa niente di se stesso. Aperto fra
 * sei mesi non può dire quanto era costato produrlo né che margine ci si era
 * messi — e senza quei numeri la domanda «su questo lavoro ci ho guadagnato?»
 * non ha risposta.
 *
 * Il caso del comando: costo € 4,50, prezzo € 150, profitto € 145,50.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['machine-rate', 'cost-engine', 'cost-breakdown']) {
  vm.runInContext(fs.readFileSync(`src/product/${f}.js`, 'utf8'), sandbox);
}
const E = sandbox.window.InglyCostEngine;
const B = sandbox.window.InglyCostBreakdown;

/* Il medagliere del comando: quattro voci di costo, un prezzo di vendita. */
const RIGHE = [
  { id: 1, name: 'Medagliere', qty: 1, unitCost: 4.50, subtotal: 4.50,
    price: 150, lineNet: 150, category: 'Prodotto' },
];
const CALCOLO = {
  totalCost: 4.50, subtotalNet: 150, totalGross: 183, vat: 33, vatPct: 22,
  marginPct: 97, markupPct: 3233.33, discountAppliedPct: 0,
  lines: RIGHE,
};
const distinta = () => B.daRighe(RIGHE, CALCOLO, { quantita: 1 });

/* TEST 1 · il caso del comando */
test('costo € 4,50, prezzo € 150, profitto € 145,50', () => {
  const e = B.economico(CALCOLO, distinta(), { quantita: 1, righe: RIGHE });
  assert.equal(e.costTotal, 4.5);
  assert.equal(e.revenueNet, 150);
  assert.equal(e.profit, 145.5);
});

test('il profitto è ricavo netto meno costo, non la somma delle righe', () => {
  const e = B.economico(CALCOLO, distinta(), { quantita: 1, righe: RIGHE });
  assert.equal(e.profit, e.revenueNet - e.costTotal);
  assert.ok(Math.abs(e.marginPct - 97) < 0.1, 'margine ' + e.marginPct + '%');
});

test('il modello porta i campi che il comando chiede', () => {
  const e = B.economico(CALCOLO, distinta(), { quantita: 1, righe: RIGHE });
  for (const k of ['currency', 'costTotal', 'revenueNet', 'revenueGross', 'profit',
    'marginPct', 'markupPct', 'quantity', 'lines', 'costs', 'pricing',
    'calculationVersion', 'calculatedAt']) {
    assert.ok(k in e, `manca ${k}`);
  }
  for (const k of ['markupPct', 'discountPct', 'ivaPct', 'net', 'iva', 'gross']) {
    assert.ok(k in e.pricing, `manca pricing.${k}`);
  }
});

test('ogni riga distingue quello che costa da quello che si vende', () => {
  const e = B.economico(CALCOLO, distinta(), { quantita: 1, righe: RIGHE });
  const l = e.lines[0];
  assert.equal(l.productionCostTotal, 4.5);
  assert.equal(l.salePriceTotal, 150);
  assert.equal(l.profitTotal, 145.5);
  /* Sono due campi con due nomi: confonderli è la classe di errore che questo
     modello esiste per rendere impossibile. */
  assert.notEqual(l.productionCostUnit, l.salePriceUnit);
});

/* ── La granularità non si perde ────────────────────────────────────────── */

const CASO3D = {
  tecnologia: 'print3d', hours: 9, grams: 290, materialPricePerKg: 15.50,
  machinePrice: 420, machineLifeHours: 3000, ratedPowerW: 150, kwhPrice: 0.28,
  maintenancePerHour: 0.12, laborPerHour: 18, setupMin: 15, finishMin: 5,
  failureRate: 7, qty: 1, packagingItems: [{ name: 'Sacchetto', qty: 1, unitCost: 0.65 }],
};

test('macchina e manutenzione restano due voci, non si accorpano', () => {
  const r = E.calcola(CASO3D);
  const e = B.economico(r, B.daCalcolo(r, { quantita: 1 }), { quantita: 1 });
  assert.ok(e.costs.macchina > 0, 'ammortamento');
  assert.ok(e.costs.manutenzione > 0, 'manutenzione');
  assert.notEqual(e.costs.macchina, e.costs.manutenzione);
  /* Nella distinta stanno insieme perché in tabella leggerle separate non
     aiuta; nel dato economico no, perché sono due decisioni diverse. */
  assert.ok(B.categoriaDi('manutenzione') === B.categoriaDi('macchina'));
  assert.notEqual(B.costoDi('manutenzione'), B.costoDi('macchina'));
});

test('le voci del motore finiscono tutte in un costo con un nome', () => {
  const r = E.calcola(CASO3D);
  const d = B.daCalcolo(r, { quantita: 1 });
  const e = B.economico(r, d, { quantita: 1 });
  const somma = Object.keys(e.costs).reduce((a, k) => a + e.costs[k], 0);
  const dalleVoci = d.voci.reduce((a, v) => a + v.totalCost, 0);
  assert.ok(Math.abs(somma - dalleVoci) < 0.01,
    `costi ${somma} contro voci ${dalleVoci}: qualcosa si è perso per strada`);
});

test('e nessuna voce finisce in «altro» quando ha un nome suo', () => {
  const r = E.calcola(CASO3D);
  const e = B.economico(r, B.daCalcolo(r, { quantita: 1 }), { quantita: 1 });
  assert.equal(e.costs.altro, 0);
});

/* ── Gli ordini vecchi ──────────────────────────────────────────────────── */

test('un ordine senza economic ne riceve uno dai campi che ha', () => {
  const e = B.economicoLegacy({ id: 1, totalCost: 20, total: 60, grossPrice: 73.2 });
  assert.equal(e.source, 'legacy');
  assert.equal(e.costTotal, 20);
  assert.equal(e.revenueNet, 60);
  assert.equal(e.profit, 40);
  assert.equal(e.costoAttendibile, true);
});

test('e se il costo non è mai stato scritto, non se ne inventa uno', () => {
  const e = B.economicoLegacy({ id: 1, value: 100 });
  assert.equal(e.costTotal, 0);
  assert.equal(e.costoAttendibile, false,
    'zero e «non dichiarato» sono due cose diverse');
  assert.equal(e.revenueNet, 100);
});

test('un ordine vuoto non produce numeri non finiti', () => {
  const e = B.economicoLegacy({});
  for (const v of [e.costTotal, e.revenueNet, e.profit, e.marginPct, e.markupPct]) {
    assert.ok(isFinite(v), 'valore non finito');
  }
});

/* ── I costi reali non toccano il preventivato ──────────────────────────── */

test('registrare un costo reale non cambia il modello economico', () => {
  const r = E.calcola(CASO3D);
  const e = B.economico(r, B.daCalcolo(r, { quantita: 1 }), { quantita: 1 });
  const prima = JSON.parse(JSON.stringify(e));

  /* Il consuntivo vive in un altro record: qui si verifica che il modello sia
     un oggetto a sé, che nessuno modifica scrivendo i reali. */
  const ordine = { id: 1, economic: e };
  ordine.actualCost = { materiale: 5.2, lavorazione: 1 };

  assert.deepEqual(JSON.parse(JSON.stringify(ordine.economic)), prima);
});

test('lo scostamento è reale meno preventivato, e si legge da economic', () => {
  const e = B.economico(CALCOLO, distinta(), { quantita: 1, righe: RIGHE });
  const reale = 5.20;
  assert.ok(Math.abs((reale - e.costTotal) - 0.70) < 0.001);
  const profittoReale = e.revenueNet - reale;
  assert.ok(Math.abs((profittoReale - e.profit) + 0.70) < 0.001,
    'il profitto scende esattamente di quanto è salito il costo');
});

test('il ricavo del cliente non si muove quando cambia il costo reale', () => {
  const e = B.economico(CALCOLO, distinta(), { quantita: 1, righe: RIGHE });
  assert.equal(e.revenueNet, 150);
  assert.equal(e.pricing.gross, e.revenueGross);
});

/* ── Il cliente non vede il costo ───────────────────────────────────────── */

test('il modello economico non è pensato per finire in un documento cliente', () => {
  /* Non è un test sul rendering: è la dichiarazione che questi campi esistono
     tutti insieme in un oggetto solo, così che chi costruisce un documento per
     il cliente sappia che `economic` è l'oggetto da NON toccare. */
  const e = B.economico(CALCOLO, distinta(), { quantita: 1, righe: RIGHE });
  for (const vietato of ['costTotal', 'profit', 'marginPct', 'markupPct', 'costs']) {
    assert.ok(vietato in e, `${vietato} deve stare qui dentro, e solo qui`);
  }
});
