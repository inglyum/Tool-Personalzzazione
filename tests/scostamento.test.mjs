/**
 * scostamento.test.mjs — preventivato contro reale.
 *
 * La regola che conta non è la sottrazione: è che «non lo so» non diventi
 * «è andata come previsto». Un laboratorio che legge scostamento zero dove
 * il consuntivo non è stato registrato resta convinto di guadagnare.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, console });
vm.runInContext(fs.readFileSync('src/product/scostamento.js', 'utf8'), ctx);
const S = ctx.InglyScostamento;
const vicino = (a, b, t = 0.001) => assert.ok(Math.abs(a - b) < t, `${a} ≠ ${b}`);

test('senza costo reale non dice «zero», dice «non lo so»', () => {
  const r = S.confronta({ costo: 10, prezzo: 20, quantita: 1 }, {});
  assert.equal(r.disponibile, false);
  assert.match(r.motivo, /nessun costo reale/);
  /* Il preventivato però lo dà comunque: è già noto. */
  vicino(r.preventivato.profitto, 10);
});

test('costato di più: lo scostamento è positivo e il verdetto lo dice', () => {
  const r = S.confronta({ costo: 10, prezzo: 20, quantita: 1 }, { costo: 13, prezzo: 20 });
  assert.equal(r.disponibile, true);
  vicino(r.scostamento.costo, 3);
  vicino(r.scostamento.costoPct, 30);
  vicino(r.scostamento.profitto, -3);
  assert.equal(r.verdetto.id, 'sforato');
});

test('costato meno: scostamento negativo, verdetto verde', () => {
  const r = S.confronta({ costo: 10, prezzo: 20, quantita: 1 }, { costo: 8, prezzo: 20 });
  vicino(r.scostamento.costo, -2);
  assert.equal(r.verdetto.id, 'sotto');
});

test('in linea entro il 5% non è né un successo né un allarme', () => {
  const r = S.confronta({ costo: 100, prezzo: 200, quantita: 1 }, { costo: 103, prezzo: 200 });
  assert.equal(r.verdetto.id, 'centrato');
});

test('la convenzione del segno è dichiarata, non lasciata intuire', () => {
  const r = S.confronta({ costo: 10, prezzo: 20 }, { costo: 12, prezzo: 20 });
  assert.match(r.scostamento.convenzione, /positivo = più del preventivato/);
});

test('un margine senza ricavo è nullo, non zero', () => {
  assert.equal(S.margine(0, 10), null);
  vicino(S.margine(100, 60), 40);
});

test('la quantità moltiplica entrambi i lati', () => {
  const r = S.confronta({ costo: 10, prezzo: 20, quantita: 10 }, { costo: 11, quantita: 10 });
  vicino(r.preventivato.costo, 100);
  vicino(r.reale.costo, 110);
  vicino(r.scostamento.costo, 10);
});

test('il preventivato viene dallo snapshot congelato, non ricalcolato', () => {
  const riga = { cpz: 99, ppz: 99, qty: 3, snapshot: { trueCost: 12.5, netPrice: 20.83 } };
  const p = S.daSnapshot(riga);
  vicino(p.costo, 12.5);
  vicino(p.prezzo, 20.83);
  assert.equal(p.quantita, 3);
});

test('senza snapshot ripiega sui campi della riga invece di dare zero', () => {
  const p = S.daSnapshot({ cpz: 7, ppz: 11, qty: 2 });
  vicino(p.costo, 7);
  vicino(p.prezzo, 11);
});

test('il totale di più righe somma solo quelle con consuntivo', () => {
  const a = S.confronta({ costo: 10, prezzo: 20 }, { costo: 12, prezzo: 20 });
  const b = S.confronta({ costo: 5, prezzo: 10 }, { costo: 4, prezzo: 10 });
  const senza = S.confronta({ costo: 100, prezzo: 200 }, {});
  const t = S.totale([a, b, senza]);
  assert.equal(t.righe, 2);
  vicino(t.preventivato.costo, 15);
  vicino(t.reale.costo, 16);
  vicino(t.scostamento.costo, 1);
});

test('un totale senza nessun consuntivo lo dichiara', () => {
  const t = S.totale([S.confronta({ costo: 10, prezzo: 20 }, {})]);
  assert.equal(t.disponibile, false);
});

test('un lavoro chiuso in perdita lo dice, qualunque sia lo scostamento', () => {
  const r = S.confronta({ costo: 10, prezzo: 11 }, { costo: 15, prezzo: 11 });
  assert.equal(r.verdetto.id, 'perdita');
});
