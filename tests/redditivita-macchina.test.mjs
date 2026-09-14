/* Il fatturato di un ordine che passa da due macchine vale una volta sola.
   È la stessa regola della redditività per tecnologia, e va verificata qui
   perché la ripartizione è diversa: non per dichiarazione, ma per tempo. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const leggi = (f) => fs.readFileSync(new URL('../src/product/' + f, import.meta.url), 'utf8');
const ctx = { console };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
['production-model.js', 'operations-model.js', 'machine-cost.js', 'order-economics.js',
  'redditivita-macchina.js'].forEach((f) => vm.runInContext(leggi(f), ctx));
const R = ctx.InglyRedditivitaMacchina;

const misto = () => ({
  id: 1,
  economic: { revenueNet: 150, productionCost: 60 },
  production: { operations: [
    { technology: 'laser', machineId: 'xtool', machineName: 'xTool', estimatedTime: 20, actualTime: 24 },
    { technology: 'uv', machineId: 'uvp', machineName: 'UV Printer', estimatedTime: 12, actualTime: 15 }] },
});

test('quota · la somma delle righe è l\'importo di partenza', () => {
  const q = R.quotaPerMacchina(misto(), 150);
  const somma = q.righe.reduce((a, r) => a + r.importo, 0);
  assert.equal(Math.round(somma * 100) / 100, 150);
  assert.equal(q.criterio, 'tempo reale');
});

test('quota · si riparte sul tempo reale quando c\'è', () => {
  const q = R.quotaPerMacchina(misto(), 39);
  const x = q.righe.find((r) => r.machineId === 'xtool');
  assert.equal(x.tempo, 24);
  assert.equal(x.importo, 24, '24 su 39 minuti → 24 euro su 39');
});

test('quota · sul previsto quando il reale non c\'è', () => {
  const o = misto();
  o.production.operations.forEach((x) => { delete x.actualTime; });
  const q = R.quotaPerMacchina(o, 32);
  assert.equal(q.criterio, 'tempo previsto');
  assert.equal(q.righe.find((r) => r.machineId === 'xtool').importo, 20);
});

test('quota · senza tempi il ricavo non si spalma a caso', () => {
  const q = R.quotaPerMacchina({ production: { operations: [
    { technology: 'laser', machineId: 'a' }, { technology: 'uv', machineId: 'b' }] } }, 100);
  assert.equal(q.righe.length, 1);
  assert.equal(q.righe[0].machineId, R.NON_ATTRIBUIBILE);
  assert.equal(q.righe[0].importo, 100);
});

test('quota · senza operazioni, una riga sola non attribuibile', () => {
  const q = R.quotaPerMacchina({ id: 9 }, 80);
  assert.equal(q.righe.length, 1);
  assert.equal(q.righe[0].importo, 80);
  assert.match(q.criterio, /nessuna operazione/);
});

test('per · due macchine, un fatturato solo', () => {
  const r = R.per([misto()]);
  assert.equal(r.totali.ricavo, 150, 'non 300');
  assert.equal(r.totali.ordini, 1);
  assert.equal(r.doppioConteggio, false);
  assert.equal(r.righe.length, 2);
});

test('per · anche il costo si riparte con la stessa quota', () => {
  const r = R.per([misto()]);
  const somma = r.righe.reduce((a, x) => a + x.costo, 0);
  assert.equal(Math.round(somma * 100) / 100, 60);
});

test('per · le ore misurate arrivano nella riga, e con esse gli euro/ora', () => {
  const r = R.per([misto()]);
  const x = r.righe.find((g) => String(g.machineId) === 'xtool');
  assert.equal(x.oreMisurate, 24);
  assert.ok(x.ricavoOrario > 0);
});

test('per · il nome viene dal parco, che è l\'anagrafica', () => {
  const r = R.per([misto()], [{ id: 'xtool', name: 'xTool P2 20W' }]);
  assert.equal(r.righe.find((g) => String(g.machineId) === 'xtool').label, 'xTool P2 20W');
});

test('per · senza parco e senza ordini si dichiara vuoto, non zero', () => {
  const r = R.per([]);
  assert.equal(r.vuoto, true);
  assert.equal(r.parcoVuoto, true);
  assert.equal(r.righe.length, 0);
});

test('per · un ordine senza ricavo leggibile non entra nell\'aggregato', () => {
  const r = R.per([{ id: 5, clientName: 'Rossi' }]);
  assert.equal(r.totali.ordini, 0);
});

test('per · senza costo il margine non si inventa', () => {
  const r = R.per([{ id: 6, economic: { revenueNet: 100 },
    production: { operations: [{ technology: 'laser', machineId: 'z', actualTime: 5 }] } }]);
  const g = r.righe[0];
  assert.equal(g.ricavo, 100);
  assert.equal(g.costo, null);
  assert.equal(g.profitto, null);
  assert.equal(g.marginePct, null);
});

test('per · tre ordini su una macchina sola sommano senza perdere centesimi', () => {
  const uno = (n) => ({ id: n, economic: { revenueNet: 33.33 },
    production: { operations: [{ technology: 'laser', machineId: 'q', actualTime: 1 }] } });
  const r = R.per([uno(1), uno(2), uno(3)]);
  assert.equal(r.totali.ricavo, 99.99);
  assert.equal(r.righe[0].oreMisurate, 3);
});
