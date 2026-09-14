/* Preventivato, reale, scostamento. Il punto delicato: un driver non rilevato
   non vale zero, o un consuntivo compilato a metà sembrerebbe un risparmio. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = { console };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../src/product/cost-breakdown.js', import.meta.url), 'utf8'), ctx);
const B = ctx.InglyCostBreakdown;

test('varianza · scostamento = reale − preventivato', () => {
  const v = B.varianza({ materiale: 10 }, { materiale: 13 });
  assert.equal(v.righe[0].variance, 3);
  assert.equal(v.righe[0].variancePct, 30);
});

test('varianza · un risparmio ha il segno negativo, e resta negativo', () => {
  const v = B.varianza({ macchina: 20 }, { macchina: 15 });
  assert.equal(v.righe[0].variance, -5);
  assert.equal(v.totali.variance, -5);
});

test('varianza · un driver non rilevato non vale zero', () => {
  const v = B.varianza({ materiale: 10, manodopera: 5 }, { materiale: 10 });
  const mano = v.righe.find((r) => r.id === 'manodopera');
  assert.equal(mano.actual, null);
  assert.equal(mano.rilevato, false);
  assert.equal(mano.variance, null);
  assert.equal(v.completo, false);
  assert.equal(v.driverMancanti.join('|'), 'manodopera');
});

test('varianza · tutto rilevato significa completo', () => {
  const v = B.varianza({ materiale: 10 }, { materiale: 11 });
  assert.equal(v.completo, true);
  assert.equal(v.driverMancanti.length, 0);
});

test('varianza · i driver che nessuno dei due nomina non appaiono', () => {
  const v = B.varianza({ materiale: 10 }, { materiale: 10 });
  assert.equal(v.righe.length, 1);
});

test('varianza · un costo comparso solo nel consuntivo si vede', () => {
  const v = B.varianza({ materiale: 10 }, { materiale: 10, scarto: 4 });
  const s = v.righe.find((r) => r.id === 'scarto');
  assert.equal(s.estimated, 0);
  assert.equal(s.actual, 4);
  assert.equal(s.variance, 4);
  assert.equal(s.variancePct, null, 'su base zero la percentuale non esiste');
});

test('varianza · accetta lo snapshot economico intero, non solo la mappa', () => {
  const v = B.varianza({ costs: { materiale: 10 } }, { costs: { materiale: 12 } });
  assert.equal(v.totali.variance, 2);
});

test('varianza · le etichette sono in italiano e leggibili', () => {
  const v = B.varianza({ overhead: 3 }, { overhead: 3 });
  assert.equal(v.righe[0].label, 'Spese generali');
});

test('consuntivo · il ricavo non si tocca', () => {
  const c = B.consuntivoEconomico({ revenueNet: 100, costs: { materiale: 40 } }, { materiale: 50 });
  assert.equal(c.revenueNet, 100);
  assert.equal(c.actualCost, 50);
  assert.equal(c.actualProfit, 50);
  assert.equal(c.actualMarginPct, 50);
  assert.equal(c.variance, 10);
});

test('consuntivo · un driver non rilevato si integra col preventivo, e si dichiara', () => {
  const c = B.consuntivoEconomico(
    { revenueNet: 100, costs: { materiale: 40, manodopera: 10 } }, { materiale: 45 });
  assert.equal(c.actualCost, 55, '45 rilevati + 10 non rilevati, non 45');
  assert.equal(c.integratoConPreventivo, 10);
  assert.equal(c.completo, false);
  assert.equal(c.actualProfit, 45);
});

test('consuntivo · senza ricavo il margine non si inventa', () => {
  const c = B.consuntivoEconomico({ costs: { materiale: 10 } }, { materiale: 10 });
  assert.equal(c.actualMarginPct, null);
});

test('consuntivo · un consuntivo vuoto non trasforma il preventivo in profitto', () => {
  const c = B.consuntivoEconomico({ revenueNet: 100, costs: { materiale: 60 } }, {});
  assert.equal(c.actualCost, 60, 'non 0');
  assert.equal(c.actualProfit, 40, 'non 100');
  assert.equal(c.completo, false);
});
