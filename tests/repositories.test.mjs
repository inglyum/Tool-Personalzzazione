/* Il punto di questo strato è uno solo: sostituire il motore senza toccare
   chi lo usa. Se questi test passano con un motore finto, passeranno con
   Supabase. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const leggi = (f) => fs.readFileSync(new URL('../src/product/' + f, import.meta.url), 'utf8');

function nuovo(dati = {}) {
  const ctx = { console };
  ctx.window = ctx; ctx.globalThis = ctx;
  const archivio = {};
  Object.entries(dati).forEach(([k, v]) => { archivio[k] = new Map(v.map((r) => [r.id, r])); });
  const chiamate = [];
  ctx.IDB = {
    async get(s, id) { chiamate.push(['get', s]); return (archivio[s] || new Map()).get(id) || null; },
    async getAll(s) { chiamate.push(['getAll', s]); return [...(archivio[s] || new Map()).values()]; },
    async put(s, r) { chiamate.push(['put', s]); (archivio[s] || (archivio[s] = new Map())).set(r.id, r); return r.id; },
    async del(s, id) { chiamate.push(['del', s]); return (archivio[s] || new Map()).delete(id); },
  };
  vm.createContext(ctx);
  ['production-model.js', 'operations-model.js', 'order-payments.js', 'repositories.js']
    .forEach((f) => vm.runInContext(leggi(f), ctx));
  return { R: ctx.InglyRepository, archivio, chiamate, ctx };
}

test('ogni repository ha la stessa forma', () => {
  const { R } = nuovo();
  ['orders', 'quotes', 'sales', 'inventory', 'clients', 'machines', 'ledger'].forEach((k) => {
    ['get', 'getAll', 'put', 'remove', 'query'].forEach((m) => {
      assert.equal(typeof R[k][m], 'function', k + '.' + m);
    });
  });
});

test('il motore predefinito è quello che c\'è già', () => {
  const { R } = nuovo();
  assert.equal(R.motore(), 'IndexedDB');
});

test('get · restituisce {ok, dati} invece di una promessa ambigua', async () => {
  const { R } = nuovo({ orders: [{ id: 1, clientName: 'Rossi' }] });
  const r = await R.orders.get(1);
  assert.equal(r.ok, true);
  assert.equal(r.dati.clientName, 'Rossi');
  assert.equal(r.errore, null);
});

test('get · un record assente non è un errore: è ok con dati null', async () => {
  const { R } = nuovo({ orders: [] });
  const r = await R.orders.get(99);
  assert.equal(r.ok, true);
  assert.equal(r.dati, null);
});

test('un motore che esplode non fa esplodere il chiamante', async () => {
  const { R } = nuovo();
  R.usaMotore({ nome: 'rotto', get() { throw new Error('disco pieno'); } });
  const r = await R.orders.get(1);
  assert.equal(r.ok, false);
  assert.match(r.errore, /disco pieno/);
  R.usaMotore(null);
});

test('put e remove passano dal motore', async () => {
  const { R, archivio } = nuovo({ orders: [] });
  await R.orders.put({ id: 5, clientName: 'Verdi' });
  assert.equal(archivio.orders.get(5).clientName, 'Verdi');
  await R.orders.remove(5);
  assert.equal(archivio.orders.has(5), false);
});

test('query · con un oggetto filtra per uguaglianza', async () => {
  const { R } = nuovo({ orders: [
    { id: 1, stage: 'produzione' }, { id: 2, stage: 'consegnato' }, { id: 3, stage: 'produzione' }] });
  const r = await R.orders.query({ stage: 'produzione' });
  assert.equal(r.dati.length, 2);
});

test('query · un array nel filtro vale «uno di questi»', async () => {
  const { R } = nuovo({ orders: [
    { id: 1, stage: 'produzione' }, { id: 2, stage: 'consegnato' }, { id: 3, stage: 'venduto' }] });
  const r = await R.orders.query({ stage: ['produzione', 'venduto'] });
  assert.equal(r.dati.length, 2);
});

test('query · con una funzione filtra come si vuole', async () => {
  const { R } = nuovo({ orders: [{ id: 1, total: 50 }, { id: 2, total: 200 }] });
  const r = await R.orders.query((o) => o.total > 100);
  assert.equal(r.dati.length, 1);
  assert.equal(r.dati[0].id, 2);
});

test('lo stesso codice funziona con un motore che non è IndexedDB', async () => {
  const { R } = nuovo();
  const memoria = new Map([[1, { id: 1, clientName: 'Da un altro motore' }]]);
  R.usaMotore({
    nome: 'Finto',
    async get(s, id) { return memoria.get(id) || null; },
    async getAll() { return [...memoria.values()]; },
    async put(s, r) { memoria.set(r.id, r); return r.id; },
    async del(s, id) { return memoria.delete(id); },
  });
  assert.equal(R.motore(), 'Finto');
  const r = await R.orders.get(1);
  assert.equal(r.dati.clientName, 'Da un altro motore');
  const q = await R.orders.query({ id: 1 });
  assert.equal(q.dati.length, 1);
  R.usaMotore(null);
});

test('production è una vista sugli ordini, non un archivio suo', async () => {
  const { R } = nuovo();
  assert.equal(R.production.store, 'orders');
  assert.equal(R.production.vista, true);
  assert.equal(R.payments.store, 'sales');
  assert.equal(R.payments.vista, true);
});

test('production.inProduzione · solo gli ordini con routing ancora aperto', async () => {
  const { R } = nuovo({ orders: [
    { id: 1, production: { operations: [{ technology: 'laser', status: 'in_produzione' }] } },
    { id: 2, production: { operations: [{ technology: 'uv', status: 'completata' }] } },
    { id: 3 }] });
  const r = await R.production.inProduzione();
  assert.equal(r.dati.length, 1);
  assert.equal(r.dati[0].id, 1);
});

test('payments.daIncassare · non pagate, parziali e scadute', async () => {
  const { R } = nuovo({ sales: [
    { id: 1, amount: 100 },
    { id: 2, amount: 100, status: 'pagato' },
    { id: 3, amount: 200, deposit: 50 },
    { id: 4, amount: 100, dueDate: '2020-01-01' }] });
  const r = await R.payments.daIncassare();
  assert.equal(r.dati.length, 3);
  assert.equal(r.dati.map((v) => v.id).join('|'), '1|3|4');
});

test('payments.perStato · uno stato preciso', async () => {
  const { R } = nuovo({ sales: [
    { id: 1, amount: 100 }, { id: 2, amount: 200, deposit: 50 }] });
  const r = await R.payments.perStato('parziale');
  assert.equal(r.dati.length, 1);
  assert.equal(r.dati[0].id, 2);
});
