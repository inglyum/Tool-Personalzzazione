/**
 * benchmark-3d.test.mjs — le voci che il benchmark chiedeva, provate una a una.
 *
 * Multi-materiale, spese generali nei tre modi, politiche di prezzo, FIFO,
 * e la distinzione fra margine e ricarico — che è la cosa che si sbaglia più
 * spesso e la più cara da sbagliare.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, console });
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), contesto);
const E = contesto.InglyCostEngine;

const BASE = {
  tecnologia: 'print3d', grams: 290, hours: 9.95, qty: 1,
  spoolPrice: 24, spoolGrams: 1000, kwhPrice: 0.28, watt: 150, dutyCycle: 0.6,
  machinePrice: 400, machineLifeHours: 2000, maintenancePerHour: 0.12,
  laborPerHour: 18, setupMin: 15, finishMin: 10, failureRate: 0,
};
const vicino = (a, b, t = 0.001) => assert.ok(Math.abs(a - b) < t, `${a} ≠ ${b}`);
const voce = (r, id) => (r.perPezzo.voci.find((v) => v.id === id) || { value: 0 }).value;

/* ═══ 1 · MARGINE E RICARICO ═══════════════════════════════════════════════ */

test('markup 40% su €10 fa €14, margine 40% fa €16,6667', () => {
  /* La verifica che la direttiva chiede alla lettera. Confonderli su un
     costo di 10 € costa 2,67 € a pezzo — e su mille pezzi è uno stipendio. */
  vicino(E.prezzo(10, { strategia: 'ricarico', ricarico: 1.4, ivaPct: 0 }).netto, 14);
  vicino(E.prezzo(10, { strategia: 'margine', marginePct: 40, ivaPct: 0 }).netto, 16.666667, 0.0001);
});

test('ogni prezzo dichiara entrambe le letture, così nessuno le confonde', () => {
  const p = E.prezzo(10, { strategia: 'margine', marginePct: 40, ivaPct: 0 });
  vicino(p.marginePct, 40, 0.0001);
  vicino(p.ricaricoPct, 66.6667, 0.001);
});

/* ═══ 2 · LE POSIZIONI COMMERCIALI ═════════════════════════════════════════ */

test('le posizioni chieste esistono, con i margini dichiarati', () => {
  const p = Object.fromEntries(E.politiche({}).map((x) => [x.id, x.marginTarget]));
  assert.equal(p.competitive, 25);
  assert.equal(p.standard, 40);
  assert.equal(p.premium, 60);
  assert.equal(p.luxury, 80);
  assert.ok(p.b2b > 0 && p.wholesale > 0 && p.custom > 0);
});

test('i margini si riconfigurano, e il pavimento non si può scavalcare', () => {
  const p = E.politiche({ standard: 55 });
  assert.equal(p.find((x) => x.id === 'standard').marginTarget, 55);
  const sotto = E.politiche({ standard: -100 });
  assert.ok(sotto.find((x) => x.id === 'standard').marginTarget >= E.MARGINE_MINIMO_POLITICA);
});

test('ogni posizione produce il margine che dichiara', () => {
  const c = E.calcola(BASE).costoPezzo;
  E.politiche({}).forEach((pol) => {
    const p = E.prezzo(c, { strategia: 'margine', marginePct: pol.marginTarget, ivaPct: 0 });
    vicino(p.marginePct, pol.marginTarget, 0.0001);
  });
});

/* ═══ 3 · PIÙ MATERIALI ════════════════════════════════════════════════════ */

test('due materiali costano la somma dei due, non il totale al prezzo di uno', () => {
  const r = E.calcola({ ...BASE, materials: [
    { name: 'PLA Rosso', grams: 200, pricePerKg: 24 },
    { name: 'PLA Nero', grams: 90, pricePerKg: 40 },
  ] });
  vicino(voce(r, 'materiale'), (200 / 1000) * 24 + (90 / 1000) * 40);
});

test('con più materiali il prezzo singolo si fa da parte, non si somma', () => {
  const solo = E.calcola({ ...BASE, grams: 290 });
  const multi = E.calcola({ ...BASE, grams: 290, materials: [{ name: 'A', grams: 290, pricePerKg: 24 }] });
  vicino(voce(multi, 'materiale'), voce(solo, 'materiale'));
});

test('una riga senza grammi non entra nel conto', () => {
  const r = E.calcola({ ...BASE, materials: [
    { name: 'A', grams: 290, pricePerKg: 24 }, { name: 'vuota', grams: 0, pricePerKg: 99 },
  ] });
  vicino(voce(r, 'materiale'), (290 / 1000) * 24);
});

test('lo spreco percentuale vale anche sui materiali multipli', () => {
  const senza = E.calcola({ ...BASE, materials: [{ name: 'A', grams: 100, pricePerKg: 20 }] });
  const con = E.calcola({ ...BASE, materialWasteRate: 10, materials: [{ name: 'A', grams: 100, pricePerKg: 20 }] });
  vicino(voce(con, 'materiale'), voce(senza, 'materiale') * 1.1);
});

/* ═══ 4 · LE SPESE GENERALI ════════════════════════════════════════════════ */

test('i tre modi danno tre numeri, e non si sommano mai fra loro', () => {
  const base = E.calcola({ ...BASE, livelloCosto: 'completo' });
  const perOra = E.calcola({ ...BASE, livelloCosto: 'completo', overheadPerHour: 4 });
  const perCento = E.calcola({ ...BASE, livelloCosto: 'completo', overheadPct: 10 });
  const perLavoro = E.calcola({ ...BASE, livelloCosto: 'completo', overheadPerJob: 5 });

  assert.equal(base.overhead, 0);
  assert.ok(perOra.overhead > 0 && perCento.overhead > 0 && perLavoro.overhead > 0);
  vicino(perLavoro.overhead, 5);
  vicino(perCento.overhead, base.costoPezzo * 0.10, 0.01);

  /* Dichiararli tutti e tre non li somma: ne vale uno, e il modo lo dice. */
  const tutti = E.calcola({ ...BASE, livelloCosto: 'completo', overheadPerHour: 4, overheadPct: 10, overheadPerJob: 5 });
  assert.ok(tutti.overhead < perOra.overhead + perCento.overhead + perLavoro.overhead);
  vicino(tutti.overhead, perOra.overhead);
});

test('«per lavoro» si divide per la quantità, come l\'avviamento', () => {
  const uno = E.calcola({ ...BASE, qty: 1, livelloCosto: 'completo', overheadPerJob: 100 });
  const cento = E.calcola({ ...BASE, qty: 100, livelloCosto: 'completo', overheadPerJob: 100 });
  vicino(uno.overhead, 100);
  vicino(cento.overhead, 1);
});

test('il modo è dichiarato, non dedotto dal numero', () => {
  assert.equal(E.calcola({ ...BASE, livelloCosto: 'completo', overheadPerJob: 5 }).overheadModo, 'per lavoro');
  assert.equal(E.calcola({ ...BASE, livelloCosto: 'completo', overheadPct: 5 }).overheadModo, 'percentuale');
  assert.equal(E.calcola({ ...BASE, livelloCosto: 'completo' }).overheadModo, 'nessuno');
});

test('le spese generali non entrano nei livelli che le escludono', () => {
  for (const livello of ['materiale', 'stampa', 'macchina']) {
    const r = E.calcola({ ...BASE, livelloCosto: livello, overheadPerJob: 50 });
    assert.equal(r.overhead, 0, livello + ' ha incassato le spese generali');
  }
});

/* ═══ 5 · I CASI DELLA DIRETTIVA ═══════════════════════════════════════════ */

test('i tre casi di prova danno costi crescenti e nessun numero assurdo', () => {
  const casi = [
    { grams: 290, hours: 9.95 },
    { grams: 100, hours: 2 },
    { grams: 500, hours: 20 },
  ];
  const costi = casi.map((c) => E.calcola({ ...BASE, ...c }).costoPezzo);
  costi.forEach((c) => assert.ok(c > 0 && isFinite(c)));
  assert.ok(costi[1] < costi[0], '100 g / 2 h deve costare meno di 290 g / 9,95 h');
  assert.ok(costi[2] > costi[0], '500 g / 20 h deve costare più di 290 g / 9,95 h');
});

test('tre prezzi al chilo diversi cambiano solo la voce materiale', () => {
  const r = [15.99, 20, 25].map((p) => E.calcola({ ...BASE, spoolPrice: p }));
  const altre = (x) => x.costoPezzo - voce(x, 'materiale');
  vicino(altre(r[0]), altre(r[1]));
  vicino(altre(r[1]), altre(r[2]));
  assert.ok(voce(r[0], 'materiale') < voce(r[1], 'materiale'));
});

test('lo scarto al 10% costa più che a zero, e non il doppio dello spreco', () => {
  const zero = E.calcola({ ...BASE, failureRate: 0 }).costoPezzo;
  const dieci = E.calcola({ ...BASE, failureRate: 10 }).costoPezzo;
  assert.ok(dieci > zero);
  /* `perdibile × t/(1−t)`: al 10% è un nono in più del perdibile, non il 10%
     del totale — e mai il 10% sommato allo spreco di materiale. */
  assert.ok(dieci < zero * 1.15);
});

test('quattro quantità: l\'avviamento si spalma, il materiale no', () => {
  const perPezzo = [1, 5, 10, 100].map((qty) => E.calcola({ ...BASE, qty }).costoPezzo);
  for (let i = 1; i < perPezzo.length; i++) {
    assert.ok(perPezzo[i] < perPezzo[i - 1], 'il costo per pezzo deve scendere con la quantità');
  }
  /* Ma non scende sotto il costo del materiale: quello non si divide. */
  const materiale = voce(E.calcola({ ...BASE, qty: 100 }), 'materiale');
  assert.ok(perPezzo[3] > materiale);
});

/* ═══ 6 · L'IVA ════════════════════════════════════════════════════════════ */

test('l\'IVA sta fuori dal costo e si calcola sul netto', () => {
  const p = E.prezzo(100, { strategia: 'margine', marginePct: 40, ivaPct: 22 });
  vicino(p.netto, 166.666667, 0.0001);
  vicino(p.iva, p.netto * 0.22, 0.0001);
  vicino(p.lordo, p.netto * 1.22, 0.0001);
  /* Il costo non si muove di un centesimo al cambiare dell'aliquota. */
  const senza = E.prezzo(100, { strategia: 'margine', marginePct: 40, ivaPct: 0 });
  vicino(p.netto, senza.netto, 0.0001);
});
