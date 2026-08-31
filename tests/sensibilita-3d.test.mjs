/**
 * sensibilita-3d.test.mjs — muovere una leva alla volta.
 *
 * Un motore di costo si giudica da come reagisce, non da quanto vale su un
 * caso. Qui si cambia **una** grandezza per volta e si verifica che si muova
 * solo quello che dipende da lei: è il modo per accorgersi che una voce è
 * legata al numero sbagliato — un costo di manodopera agganciato alle ore di
 * stampa, per esempio, che su una stampa notturna da dieci ore è un errore
 * da centinaia di euro e su una prova da venti minuti non si vede.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, console });
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), ctx);
const E = ctx.InglyCostEngine;

const ORE = 9 + 57 / 60;
const BASE = {
  tecnologia: 'print3d', livelloCosto: 'completo',
  grams: 290, hours: ORE, qty: 1,
  spoolPrice: 15.99, spoolGrams: 1000,
  watt: 150, dutyCycle: 0.6, kwhPrice: 0.28,
  machinePrice: 400, machineLifeHours: 2000, residualValue: 0, maintenancePerHour: 0.12,
  failureRate: 7, laborPerHour: 18, setupMin: 15, finishMin: 10, washCureMin: 0,
};
const vicino = (a, b, t = 0.0005) => assert.ok(Math.abs(a - b) < t, `${a} ≠ ${b}`);
const v = (r, id) => (r.perPezzo.voci.find((x) => x.id === id) || { value: 0 }).value;
const lavoro = (r) => v(r, 'finitura') + v(r, 'postProcesso') + r.unaTantum.perPezzo;

/* ═══ 7a · SOLO IL PREZZO DEL MATERIALE ════════════════════════════════════ */

test('cambiare il €/kg muove il materiale, e con lui solo lo scarto che lo contiene', () => {
  const r = [15.99, 20, 24].map((p) => E.calcola({ ...BASE, spoolPrice: p }));

  for (const id of ['energia', 'macchina', 'manutenzione', 'finitura', 'postProcesso']) {
    vicino(v(r[0], id), v(r[1], id));
    vicino(v(r[1], id), v(r[2], id));
  }
  vicino(r[0].unaTantum.perPezzo, r[2].unaTantum.perPezzo);

  /* Il delta del materiale è esattamente grammi × differenza di prezzo. */
  vicino(v(r[1], 'materiale') - v(r[0], 'materiale'), (290 / 1000) * (20 - 15.99));
  vicino(v(r[2], 'materiale') - v(r[1], 'materiale'), (290 / 1000) * (24 - 20));

  /* Il delta del costo totale è il delta materiale, maggiorato dello scarto:
     il pezzo che va rifatto butta anche il materiale, e a filamento più caro
     buttarlo costa di più. Non è un secondo aumento, è lo stesso. */
  const t = 0.07;
  vicino(r[2].costoPezzo - r[0].costoPezzo,
    ((290 / 1000) * (24 - 15.99)) * (1 + t / (1 - t)));
});

/* ═══ 7b · SOLO IL TEMPO ═══════════════════════════════════════════════════ */

test('cambiare le ore muove energia, ammortamento e manutenzione — e nient\'altro', () => {
  const r = [5, 10, 20].map((h) => E.calcola({ ...BASE, hours: h }));

  /* Il materiale non dipende dal tempo: stampare più lentamente non consuma
     più filamento. */
  vicino(v(r[0], 'materiale'), v(r[2], 'materiale'));

  /* La manodopera nemmeno, finché i minuti dichiarati restano gli stessi. È
     la distinzione che questo progetto ha dovuto imparare a colpi di test. */
  vicino(lavoro(r[0]), lavoro(r[1]));
  vicino(lavoro(r[1]), lavoro(r[2]));

  /* Le tre voci a tempo sono lineari nelle ore. */
  for (const id of ['energia', 'macchina', 'manutenzione']) {
    vicino(v(r[1], id), v(r[0], id) * 2);
    vicino(v(r[2], id), v(r[0], id) * 4);
  }
});

test('venti ore di stampa non fanno venti ore di manodopera', () => {
  const r = E.calcola({ ...BASE, hours: 20, finishMin: 15, setupMin: 0 });
  vicino(v(r, 'finitura'), (15 / 60) * 18);
  assert.ok(v(r, 'finitura') < 18, 'il tempo macchina è stato pagato come tempo di persona');
});

/* ═══ 7c · SOLO IL LAVORO ══════════════════════════════════════════════════ */

test('cambiare i minuti di persona muove solo la manodopera', () => {
  const r = [15, 30, 60].map((m) => E.calcola({ ...BASE, finishMin: m, setupMin: 0 }));

  for (const id of ['materiale', 'energia', 'macchina', 'manutenzione']) {
    vicino(v(r[0], id), v(r[2], id));
  }
  vicino(v(r[0], 'finitura'), (15 / 60) * 18);
  vicino(v(r[1], 'finitura'), (30 / 60) * 18);
  vicino(v(r[2], 'finitura'), (60 / 60) * 18);
  /* e il doppio dei minuti fa il doppio del costo, senza soglie nascoste */
  vicino(v(r[1], 'finitura'), v(r[0], 'finitura') * 2);
});

test('l\'avviamento è per lavoro, la finitura per pezzo: due leve, non una', () => {
  const setup = E.calcola({ ...BASE, setupMin: 60, finishMin: 0, qty: 10 });
  const finitura = E.calcola({ ...BASE, setupMin: 0, finishMin: 60, qty: 10 });
  vicino(setup.unaTantum.perPezzo, ((60 / 60) * 18) / 10);
  vicino(v(finitura, 'finitura'), (60 / 60) * 18);
  assert.ok(v(finitura, 'finitura') > setup.unaTantum.perPezzo * 9);
});

/* ═══ 7d · SOLO LA QUANTITÀ ════════════════════════════════════════════════ */

test('la quantità divide l\'avviamento e non tocca il resto', () => {
  const r = [1, 10, 100].map((q) => E.calcola({ ...BASE, qty: q }));
  const avviamento = (15 / 60) * 18;

  for (const id of ['materiale', 'energia', 'macchina', 'manutenzione', 'finitura', 'scarto']) {
    vicino(v(r[0], id), v(r[1], id), 0.0001);
    vicino(v(r[1], id), v(r[2], id), 0.0001);
  }
  vicino(r[0].unaTantum.perPezzo, avviamento);
  vicino(r[1].unaTantum.perPezzo, avviamento / 10);
  vicino(r[2].unaTantum.perPezzo, avviamento / 100);

  /* Nessuna voce per pezzo viene moltiplicata per la quantità dentro il
     costo unitario: è l'errore speculare, e produce cento volte il prezzo. */
  vicino(r[2].costoPezzo, r[2].perPezzo.totale + avviamento / 100);
});

test('il costo del lavoro intero cresce con la quantità, quello unitario scende', () => {
  const r = [1, 10, 100].map((q) => E.calcola({ ...BASE, qty: q }));
  const totale = (x, q) => x.costoPezzo * q;
  assert.ok(totale(r[1], 10) > totale(r[0], 1));
  assert.ok(totale(r[2], 100) > totale(r[1], 10));
  assert.ok(r[1].costoPezzo < r[0].costoPezzo);
  assert.ok(r[2].costoPezzo < r[1].costoPezzo);
});

/* ═══ 8 · MONOTONICITÀ ═════════════════════════════════════════════════════ */

test('il costo non scende mai quando sale un ingresso che lo alimenta', () => {
  const scale = {
    spoolPrice: [10, 15.99, 20, 24, 40, 80],
    hours: [0.5, 1, 5, ORE, 10, 20, 48],
    maintenancePerHour: [0, 0.05, 0.12, 0.5, 2],
    laborPerHour: [10, 18, 30, 60],
    finishMin: [0, 5, 10, 30, 60],
    setupMin: [0, 15, 45, 120],
    failureRate: [0, 5, 7, 10, 20, 40],
    materialWasteRate: [0, 5, 12, 30],
    grams: [10, 100, 290, 500, 2000],
    kwhPrice: [0.1, 0.28, 0.55, 1],
    machinePrice: [100, 400, 1200, 5000],
  };
  for (const [campo, valori] of Object.entries(scale)) {
    let prima = -Infinity;
    for (const x of valori) {
      const c = E.calcola({ ...BASE, [campo]: x }).costoPezzo;
      assert.ok(c >= prima - 1e-9, `${campo}=${x}: il costo è sceso (${prima} → ${c})`);
      prima = c;
    }
  }
});

test('più vita utile significa meno ammortamento: l\'unica leva che scende, e per costruzione', () => {
  let prima = Infinity;
  for (const h of [500, 1000, 2000, 5000, 20000]) {
    const c = E.calcola({ ...BASE, machineLifeHours: h }).costoPezzo;
    assert.ok(c <= prima + 1e-9, `vita utile ${h}: il costo è salito`);
    prima = c;
  }
});

test('più margine, più prezzo — e più ricarico, più prezzo', () => {
  const costo = E.calcola(BASE).costoPezzo;
  let m = -Infinity;
  for (const x of [10, 25, 40, 60, 80, 90]) {
    const p = E.prezzo(costo, { strategia: 'margine', marginePct: x, ivaPct: 0 }).netto;
    assert.ok(p > m, `margine ${x}%: il prezzo non è salito`);
    m = p;
  }
  let k = -Infinity;
  for (const x of [1.1, 1.4, 2, 3, 5]) {
    const p = E.prezzo(costo, { strategia: 'ricarico', ricarico: x, ivaPct: 0 }).netto;
    assert.ok(p > k, `ricarico ×${x}: il prezzo non è salito`);
    k = p;
  }
});

/* ═══ 18 · I QUATTRO MARGINI SU UN COSTO DI € 10 ═══════════════════════════ */

test('su € 10 i quattro margini fanno 13,33 · 16,67 · 25,00 · 50,00', () => {
  const atteso = { 25: 13.3333, 40: 16.6667, 60: 25, 80: 50 };
  for (const [m, x] of Object.entries(atteso)) {
    const p = E.prezzo(10, { strategia: 'margine', marginePct: +m, ivaPct: 0 });
    vicino(p.netto, x, 0.0002);
    /* e non i numeri del ricarico, che sono altri */
    assert.ok(Math.abs(p.netto - 10 * (1 + +m / 100)) > 0.01 || +m === 0);
  }
  /* Il ricarico del 40% è € 14, e non va confuso con il margine del 40%. */
  vicino(E.prezzo(10, { strategia: 'ricarico', ricarico: 1.4, ivaPct: 0 }).netto, 14);
  vicino(E.prezzo(10, { strategia: 'margine', marginePct: 40, ivaPct: 0 }).netto, 16.6667, 0.0002);
});

/* ═══ 19 · IL LOTTO ════════════════════════════════════════════════════════ */

test('lo sconto a volume è avviamento diviso, non uno sconto commerciale', () => {
  const q = [1, 10, 100];
  const sc = E.scaglioni(BASE, q, { strategia: 'margine', marginePct: 40, ivaPct: 0 });
  const avviamento = (15 / 60) * 18;

  for (let i = 0; i < q.length; i++) {
    /* Il costo unitario è per-pezzo + avviamento/quantità. Nient'altro. */
    vicino(sc[i].costoPezzo, E.calcola({ ...BASE, qty: q[i] }).perPezzo.totale + avviamento / q[i], 0.001);
    /* E il margine non si muove: il prezzo scende perché scende il costo. */
    vicino(sc[i].prezzoPezzo, sc[i].costoPezzo / 0.6, 0.001);
  }
  /* Il risparmio da 1 a 100 è esattamente l'avviamento non più pagato. */
  vicino(sc[0].costoPezzo - sc[2].costoPezzo, avviamento - avviamento / 100, 0.001);
});

test('senza avviamento non c\'è nessuno sconto a volume, e va bene così', () => {
  const senza = { ...BASE, setupMin: 0 };
  const sc = E.scaglioni(senza, [1, 100], { strategia: 'margine', marginePct: 40, ivaPct: 0 });
  vicino(sc[0].costoPezzo, sc[1].costoPezzo, 0.0005);
});

/* ═══ 20 · PRESTAZIONI ═════════════════════════════════════════════════════ */

test('mille calcoli in meno di un secondo', () => {
  const t0 = Date.now();
  for (let i = 0; i < 1000; i++) E.calcola({ ...BASE, grams: 100 + i, hours: 1 + i / 100 });
  const ms = Date.now() - t0;
  assert.ok(ms < 1000, 'mille calcoli in ' + ms + ' ms');
});

test('mille materiali su un pezzo non fanno esplodere il conto', () => {
  const materials = [];
  for (let i = 0; i < 1000; i++) materials.push({ name: 'M' + i, grams: 1, pricePerKg: 10 + (i % 30) });
  const t0 = Date.now();
  const r = E.calcola({ ...BASE, materials });
  const ms = Date.now() - t0;
  assert.ok(ms < 200, 'mille materiali in ' + ms + ' ms');
  const atteso = materials.reduce((s, m) => s + (m.grams / 1000) * m.pricePerKg, 0);
  vicino(v(r, 'materiale'), atteso, 0.0001);
});

test('nove scaglioni fino a mille restano istantanei', () => {
  const t0 = Date.now();
  for (let i = 0; i < 100; i++) E.scaglioni(BASE, [1, 5, 10, 25, 50, 100, 250, 500, 1000], { strategia: 'margine', marginePct: 40, ivaPct: 22 });
  assert.ok(Date.now() - t0 < 1000);
});
