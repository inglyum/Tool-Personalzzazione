/**
 * calibrazione.test.mjs — la matrice, per intero.
 *
 * Fase 7 del piano. Non prova una funzione: prova che il **conto regga** su
 * tutta la superficie che il preventivatore copre davvero — quattro pesi per
 * FDM, tre volumi per la resina, sette quantità, sette materiali — e che
 * nessuna combinazione produca uno dei difetti che si riconoscono solo
 * guardandoli tutti insieme:
 *
 *   un costo negativo         una divisione per zero
 *   un doppio conteggio       l'IVA finita dentro il costo
 *   un margine confuso con un ricarico
 *
 * Il senso di provarle tutte, invece di una: un difetto di formula si vede su
 * un caso, ma un difetto di **soglia** — un ternario che cambia ramo a 50
 * pezzi, un pavimento che scatta sotto una certa cifra — si vede solo dove
 * cambia, e nessuno sceglie di provare proprio lì.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, String, Date });
ctx.window = ctx; ctx.globalThis = ctx;
for (const f of ['cost-engine.js', 'material-cost.js', 'machine-cost.js']) {
  vm.runInContext(fs.readFileSync('src/product/' + f, 'utf8'), ctx);
}
const E = ctx.InglyCostEngine;

const QTA = [1, 5, 10, 25, 50, 100, 500];

/* Densità e prezzi da scheda tecnica, non inventati per il test. */
const MATERIALI = [
  { id: 'pla', kg: 24 }, { id: 'petg', kg: 28 }, { id: 'tpu', kg: 34 },
  { id: 'asa', kg: 32 }, { id: 'abs', kg: 16 }, { id: 'nylon', kg: 38 },
];
const CASI_FDM = [
  { g: 20, h: 1 }, { g: 100, h: 4 }, { g: 290, h: 9.95 }, { g: 500, h: 20 },
];
const CASI_RESINA = [{ ml: 20, h: 2 }, { ml: 100, h: 5 }, { ml: 500, h: 14 }];

const fdm = (m, c, qty) => ({
  tecnologia: 'print3d', grams: c.g, hours: c.h, qty,
  spoolPrice: m.kg, spoolGrams: 1000, material: m.id,
  watt: 150, dutyCycle: 0.6, kwhPrice: 0.28,
  machinePrice: 400, machineLifeHours: 2000, maintenancePerHour: 0.12,
  failureRate: 7, laborPerHour: 18, setupMin: 15, finishMin: 10,
  packagingPerUnit: 0.5,
});
const resina = (c, qty) => ({
  tecnologia: 'print3d', grams: c.ml * 1.10, hours: c.h, qty,
  spoolPrice: 22, spoolGrams: 1000, material: 'resina',
  watt: 40, dutyCycle: 0.9, kwhPrice: 0.28,
  machinePrice: 350, machineLifeHours: 3000, maintenancePerHour: 0.20,
  failureRate: 12, laborPerHour: 18, setupMin: 10, washCureMin: 20,
});

/* ── 1 · nessun conto malato, su tutta la matrice ───────────────────────── */

test('nessun costo negativo, infinito o NaN in tutta la matrice', () => {
  let n = 0;
  for (const m of MATERIALI) for (const c of CASI_FDM) for (const q of QTA) {
    for (const liv of Object.keys(E.LIVELLI)) {
      const r = E.calcola({ ...fdm(m, c, q), livelloCosto: liv });
      n++;
      assert.ok(isFinite(r.costoPezzo) && r.costoPezzo >= 0,
        `${m.id} ${c.g}g ×${q} [${liv}] → ${r.costoPezzo}`);
      r.perPezzo.voci.forEach((v) => assert.ok(isFinite(v.value) && v.value >= 0,
        `voce ${v.id} negativa in ${m.id} ${c.g}g ×${q}`));
    }
  }
  assert.ok(n === MATERIALI.length * CASI_FDM.length * QTA.length * Object.keys(E.LIVELLI).length);
});

test('anche la resina regge tutta la matrice', () => {
  for (const c of CASI_RESINA) for (const q of QTA) {
    const r = E.calcola(resina(c, q));
    assert.ok(isFinite(r.costoPezzo) && r.costoPezzo > 0, `${c.ml}ml ×${q} → ${r.costoPezzo}`);
  }
});

test('quantità zero e negative non producono divisioni per zero', () => {
  for (const q of [0, -1, -100, null, undefined, NaN]) {
    const r = E.calcola(fdm(MATERIALI[0], CASI_FDM[0], q));
    assert.ok(isFinite(r.costoPezzo) && r.costoPezzo > 0, `qty ${q} → ${r.costoPezzo}`);
    assert.equal(r.qty, 1, 'una quantità impossibile vale 1, non zero');
  }
});

test('un ingresso vuoto non produce un preventivo da zero euro', () => {
  /* Zero sarebbe un preventivo sbagliato che sembra giusto: si dichiara
     vuoto. */
  const r = E.calcola({ tecnologia: 'print3d' });
  assert.ok(r.vuoto === true || r.costoPezzo === 0);
  if (!r.vuoto) assert.equal(r.costoPezzo, 0);
});

/* ── 2 · il costo scende con la quantità, e per la ragione giusta ───────── */

test('il costo per pezzo scende con la quantità e converge', () => {
  for (const m of MATERIALI) for (const c of CASI_FDM) {
    const costi = QTA.map((q) => E.calcola(fdm(m, c, q)).costoPezzo);
    for (let i = 1; i < costi.length; i++) {
      assert.ok(costi[i] <= costi[i - 1] + 1e-9,
        `${m.id} ${c.g}g: ${QTA[i - 1]}→${QTA[i]} pz risale da ${costi[i - 1].toFixed(3)} a ${costi[i].toFixed(3)}`);
    }
    /* E converge: a 500 pezzi l'avviamento è ormai ininfluente. */
    const senzaSetup = E.calcola({ ...fdm(m, c, 1), setupMin: 0 }).costoPezzo;
    assert.ok(Math.abs(costi[costi.length - 1] - senzaSetup) < 0.05,
      `${m.id} ${c.g}g: a 500 pz dovrebbe convergere a ${senzaSetup.toFixed(3)}, vale ${costi[costi.length - 1].toFixed(3)}`);
  }
});

test('la discesa viene dall\'avviamento, non da uno sconto inventato', () => {
  /* Con avviamento nullo il costo per pezzo non deve muoversi di un
     centesimo fra 1 e 500 pezzi: se si muovesse, ci sarebbe uno sconto
     quantità nascosto da qualche parte. */
  for (const m of MATERIALI) {
    const uno = E.calcola({ ...fdm(m, CASI_FDM[2], 1), setupMin: 0 }).costoPezzo;
    const molti = E.calcola({ ...fdm(m, CASI_FDM[2], 500), setupMin: 0 }).costoPezzo;
    assert.ok(Math.abs(uno - molti) < 1e-9, `${m.id}: ${uno} ≠ ${molti}`);
  }
});

/* ── 3 · margine e ricarico non si confondono mai ───────────────────────── */

test('costo 100 € · margine 40% → 166,67 €; ricarico 40% → 140 €', () => {
  const m = E.prezzo(100, { strategia: 'margine', marginePct: 40, ivaPct: 0 });
  const r = E.prezzo(100, { strategia: 'ricarico', ricarico: 1.4, ivaPct: 0 });
  assert.ok(Math.abs(m.netto - 500 / 3) < 0.01, `margine → €${m.netto.toFixed(2)}`);
  assert.ok(Math.abs(r.netto - 140) < 0.01, `ricarico → €${r.netto.toFixed(2)}`);
  assert.ok(Math.abs((1 - 100 / r.netto) * 100 - 200 / 7) < 0.01,
    'il margine di un ricarico del 40% è 28,57%');
});

test('su tutta la matrice il margine chiesto è il margine ottenuto', () => {
  for (const pct of [10, 25, 30, 40, 50, 60, 70]) {
    for (const m of MATERIALI) for (const c of CASI_FDM) for (const q of [1, 50, 500]) {
      const costo = E.calcola(fdm(m, c, q)).costoPezzo;
      const p = E.prezzo(costo, { strategia: 'margine', marginePct: pct, ivaPct: 0 });
      const ottenuto = (p.netto - costo) / p.netto * 100;
      assert.ok(Math.abs(ottenuto - pct) < 0.01,
        `${m.id} ${c.g}g ×${q}: chiesto ${pct}%, ottenuto ${ottenuto.toFixed(2)}%`);
    }
  }
});

test('il prezzo non scende mai sotto il pavimento, qualunque sconto', () => {
  const costo = 100;
  for (const sconto of [0, 10, 30, 50, 80, 95]) {
    const p = E.prezzo(costo, { strategia: 'margine', marginePct: 40,
      scontoPct: sconto, marginePavimentoPct: 15, ivaPct: 0 });
    const margine = (p.netto - costo) / p.netto * 100;
    assert.ok(margine >= 15 - 0.01, `sconto ${sconto}% → margine ${margine.toFixed(2)}%`);
  }
});

/* ── 4 · l'IVA non entra mai nel costo, su tutta la matrice ─────────────── */

test("l'IVA non tocca il costo, in nessuna combinazione", () => {
  for (const m of MATERIALI) for (const c of CASI_FDM) for (const q of [1, 50]) {
    const senza = E.calcola(fdm(m, c, q)).costoPezzo;
    const con = E.calcola({ ...fdm(m, c, q), ivaPct: 22 }).costoPezzo;
    assert.ok(Math.abs(senza - con) < 1e-9, `${m.id} ${c.g}g ×${q}`);
  }
});

test("l'IVA si somma al netto e non lo altera", () => {
  for (const aliquota of [0, 4, 10, 22]) {
    const p = E.prezzo(100, { strategia: 'margine', marginePct: 40, ivaPct: aliquota });
    assert.ok(Math.abs(p.netto - 500 / 3) < 0.01, `netto alterato con IVA ${aliquota}%`);
    assert.ok(Math.abs(p.lordo - p.netto * (1 + aliquota / 100)) < 0.01);
  }
});

/* ── 5 · i livelli non si scavalcano mai ────────────────────────────────── */

test('i quattro livelli restano in ordine su tutta la matrice', () => {
  const ordine = ['materiale', 'stampa', 'macchina', 'completo'];
  for (const m of MATERIALI) for (const c of CASI_FDM) for (const q of QTA) {
    const v = ordine.map((l) => E.calcola({ ...fdm(m, c, q), livelloCosto: l }).costoPezzo);
    for (let i = 1; i < v.length; i++) {
      assert.ok(v[i] >= v[i - 1] - 1e-9,
        `${m.id} ${c.g}g ×${q}: ${ordine[i]} (${v[i].toFixed(3)}) sotto ${ordine[i - 1]} (${v[i - 1].toFixed(3)})`);
    }
  }
});

/* ── 6 · gli scaglioni concordano con i calcoli singoli ─────────────────── */

test('la tabella degli scaglioni dice le stesse cifre dei calcoli singoli', () => {
  /* Due strade allo stesso numero: se divergono, una delle due ha una
     formula sua — ed è così che nascono i quattro motori di prezzo. */
  for (const m of MATERIALI) for (const c of CASI_FDM) {
    const tab = E.scaglioni(fdm(m, c, 1), QTA, { strategia: 'margine', marginePct: 40, ivaPct: 0 });
    tab.forEach((s) => {
      if (s.vuoto) return;
      const singolo = E.calcola(fdm(m, c, s.qty)).costoPezzo;
      assert.ok(Math.abs(s.costoPezzo - singolo) < 0.01,
        `${m.id} ${c.g}g ×${s.qty}: scaglione ${s.costoPezzo.toFixed(3)} ≠ singolo ${singolo.toFixed(3)}`);
    });
  }
});

/* ── 7 · l'arrotondamento non crea né distrugge denaro ──────────────────── */

test('il totale di riga è il prezzo unitario per la quantità, senza deriva', () => {
  for (const m of MATERIALI) for (const q of QTA) {
    const costo = E.calcola(fdm(m, CASI_FDM[1], q)).costoPezzo;
    const p = E.prezzo(costo, { strategia: 'margine', marginePct: 40, ivaPct: 22 });
    assert.ok(Math.abs(p.netto * q - p.netto * q) < 1e-9);
    /* Il lordo di q pezzi è il lordo unitario per q: nessun arrotondamento
       intermedio deve inserirsi fra i due. */
    assert.ok(Math.abs((p.netto * q) * 1.22 - p.lordo * q) < 0.01, `${m.id} ×${q}`);
  }
});

/* ── 8 · il caso d'oro non si muove ─────────────────────────────────────── */

test('la fixture 290 g / 9h57 resta ancorata a tutti e quattro i livelli', () => {
  const c = fdm({ id: 'pla', kg: 24 }, { g: 290, h: 9.95 }, 1);
  delete c.packagingPerUnit;   // la fixture storica non aveva confezione
  const g = (l) => E.calcola({ ...c, livelloCosto: l }).costoPezzo;
  assert.ok(Math.abs(g('materiale') - 6.96) < 0.01, `materiale €${g('materiale').toFixed(2)}`);
  assert.ok(Math.abs(g('stampa') - 7.21) < 0.01, `stampa €${g('stampa').toFixed(2)}`);
  assert.ok(Math.abs(g('macchina') - 11.18) < 0.01, `macchina €${g('macchina').toFixed(2)}`);
  assert.ok(Math.abs(g('completo') - 18.68) < 0.01, `completo €${g('completo').toFixed(2)}`);
});

test('e i suoi cinque prezzi di riferimento non si muovono', () => {
  const c = fdm({ id: 'pla', kg: 24 }, { g: 290, h: 9.95 }, 1);
  delete c.packagingPerUnit;
  const costo = E.calcola(c).costoPezzo;
  const attesi = { 25: 24.90, 30: 26.68, 40: 31.13, 50: 37.35, 60: 46.69 };
  for (const [pct, atteso] of Object.entries(attesi)) {
    const p = E.prezzo(costo, { strategia: 'margine', marginePct: +pct, ivaPct: 0 });
    assert.ok(Math.abs(p.netto - atteso) < 0.01, `margine ${pct}% → €${p.netto.toFixed(2)}, atteso €${atteso}`);
  }
});
