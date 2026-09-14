/* I tre «segna pagato» facevano cose diverse. Qui si verifica che il percorso
   unico faccia tutte quelle cose, e che le faccia una volta sola. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sorgente = fs.readFileSync(new URL('../src/product/order-payments.js', import.meta.url), 'utf8');

function nuovo(opzioni = {}) {
  const archivio = { sales: new Map(), orders: new Map(), cashflow: new Map() };
  const eventi = [];
  const registro = [];
  const snapshot = [];
  const invalidati = [];
  const ctx = {
    window: undefined,
    localStorage: {
      _m: new Map(Object.entries(opzioni.localStorage || {})),
      getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
    },
    InglyDomain: opzioni.senzaMotore ? undefined : {
      payments: {
        paymentPlan(t, d) {
          const dep = Math.min(d, t);
          return { deposit: dep, balance: Math.max(0, t - dep), depositPct: t > 0 ? dep / t : 0 };
        },
      },
    },
    IDB: {
      async get(store, id) { return archivio[store].get(+id) || archivio[store].get(id) || null; },
      async put(store, rec) { archivio[store].set(rec.id, rec); return rec.id; },
    },
    Bus: { emit(nome, dati) { eventi.push([nome, dati]); } },
    AppStore: { invalidate(s) { invalidati.push(s); } },
    snapshotRecord: async (store, id) => { snapshot.push([store, id]); },
    logAction: async (tipo, id, azione) => { registro.push([tipo, id, azione]); },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(sorgente, ctx);
  return { P: ctx.InglyPagamenti, archivio, eventi, registro, snapshot, invalidati, ctx };
}

test('stato · legge il totale dal lordo, poi da amount, poi dal netto', () => {
  const { P } = nuovo();
  assert.equal(P.stato({ grossAmount: 183, amount: 150 }).totale, 183);
  assert.equal(P.stato({ amount: 150 }).totale, 150);
  assert.equal(P.stato({ netAmount: 120 }).totale, 120);
  assert.equal(P.stato({ total: 99 }).fonte, 'total');
});

test('stato · un importo illeggibile si dichiara, non vale zero', () => {
  const { P } = nuovo();
  const s = P.stato({ clientName: 'Rossi' });
  assert.equal(s.noto, false);
  assert.equal(s.totale, null);
  assert.equal(s.incassato, null);
  assert.match(s.motivo, /non leggibile/);
});

test('stato · pagato significa incassato tutto, residuo zero', () => {
  const { P } = nuovo();
  const s = P.stato({ amount: 150, status: 'pagato' });
  assert.equal(s.incassato, 150);
  assert.equal(s.residuo, 0);
  assert.equal(s.pagato, true);
});

test('stato · con acconto e senza saldo, il residuo è il resto', () => {
  const { P } = nuovo();
  const s = P.stato({ amount: 200, deposit: 50 });
  assert.equal(s.incassato, 50);
  assert.equal(s.residuo, 150);
});

test('piano · delega al motore che esiste, non ne scrive un secondo', () => {
  const { P } = nuovo();
  const p = P.piano(200, 100);
  assert.equal(p.disponibile, true);
  assert.equal(p.acconto, 100);
  assert.equal(p.saldo, 100);
  assert.equal(p.accontoPct, 0.5);
  assert.equal(p.fonte, 'InglyDomain.payments.paymentPlan');
});

test('piano · senza motore si dichiara indisponibile, non inventa una percentuale', () => {
  const { P } = nuovo({ senzaMotore: true });
  const p = P.piano(200, 100);
  assert.equal(p.disponibile, false);
  assert.match(p.motivo, /motore pagamenti/);
});

test('registra · fa tutte le cose che i tre percorsi facevano a pezzi', async () => {
  const t = nuovo();
  t.archivio.sales.set(1, { id: 1, amount: 150, status: 'da_pagare', clientName: 'Rossi' });
  const e = await t.P.registra(1);
  assert.equal(e.ok, true);
  const v = t.archivio.sales.get(1);
  assert.equal(v.status, 'pagato');
  assert.ok(v.paidAt, 'la data di incasso c\'è — a Solleciti mancava');
  assert.deepEqual(t.snapshot, [['sales', 1]], 'lo snapshot c\'è — a bulk e Solleciti mancava');
  assert.deepEqual(t.registro, [['sale', 1, 'marked_paid']]);
  assert.equal(t.eventi[0][0], 'sale:paid');
  assert.ok(t.invalidati.includes('sales'));
});

test('registra · l\'ordine collegato smette di essere in produzione', async () => {
  const t = nuovo();
  t.archivio.orders.set(7, { id: 7, stage: 'produzione' });
  t.archivio.sales.set(2, { id: 2, amount: 150, orderId: 7 });
  const e = await t.P.registra(2);
  assert.ok(e.effetti.includes('ordine-venduto'));
  assert.equal(t.archivio.orders.get(7).stage, 'sold');
  assert.ok(t.archivio.orders.get(7).soldAt);
});

test('registra · un ordine già venduto non si tocca', async () => {
  const t = nuovo();
  t.archivio.orders.set(8, { id: 8, stage: 'invoiced' });
  t.archivio.sales.set(3, { id: 3, amount: 150, fromOrderId: 8 });
  const e = await t.P.registra(3);
  assert.equal(e.effetti.includes('ordine-venduto'), false);
  assert.equal(t.archivio.orders.get(8).stage, 'invoiced');
});

test('registra · il cashflow automatico resta spento se l\'interruttore è spento', async () => {
  const t = nuovo();
  t.archivio.sales.set(4, { id: 4, amount: 150 });
  const e = await t.P.registra(4);
  assert.equal(e.effetti.includes('cashflow'), false);
  assert.equal(t.archivio.cashflow.size, 0);
});

test('registra · e si accende solo con l\'interruttore acceso', async () => {
  const t = nuovo({ localStorage: { s5b_auto_cashflow: '1' } });
  t.archivio.sales.set(5, { id: 5, amount: 150, desc: 'Targa' });
  const e = await t.P.registra(5);
  assert.ok(e.effetti.includes('cashflow'));
  const voci = [...t.archivio.cashflow.values()];
  assert.equal(voci.length, 1);
  assert.equal(voci[0].amount, 150);
  assert.equal(voci[0].type, 'entrata');
  assert.equal(voci[0]._fromSaleId, 5);
});

test('registra · una vendita già pagata non si incassa due volte', async () => {
  const t = nuovo({ localStorage: { s5b_auto_cashflow: '1' } });
  t.archivio.sales.set(6, { id: 6, amount: 150, status: 'pagato', paidAt: '2026-01-01T00:00:00.000Z' });
  const e = await t.P.registra(6);
  assert.equal(e.ok, true);
  assert.equal(e.giaPagata, true);
  assert.equal(t.archivio.cashflow.size, 0, 'nessuna seconda entrata di cassa');
  assert.equal(t.archivio.sales.get(6).paidAt, '2026-01-01T00:00:00.000Z', 'la data non si riscrive');
  assert.deepEqual(t.snapshot, [], 'e non si fa nemmeno uno snapshot inutile');
});

test('registra · una vendita inesistente non finge di essere incassata', async () => {
  const t = nuovo();
  const e = await t.P.registra(999);
  assert.equal(e.ok, false);
  assert.match(e.motivo, /non trovata/);
});

test('registra · senza vendita si dichiara, non esplode', async () => {
  const t = nuovo();
  const e = await t.P.registra(null);
  assert.equal(e.ok, false);
  assert.match(e.motivo, /assente/);
});

test('registra · accetta anche l\'oggetto, non solo l\'id', async () => {
  const t = nuovo();
  const v = { id: 10, amount: 80 };
  t.archivio.sales.set(10, v);
  const e = await t.P.registra(v);
  assert.equal(e.ok, true);
  assert.equal(t.archivio.sales.get(10).status, 'pagato');
});

test('registra · un importo illeggibile non genera un cashflow da zero euro', async () => {
  const t = nuovo({ localStorage: { s5b_auto_cashflow: '1' } });
  t.archivio.sales.set(11, { id: 11, clientName: 'Rossi' });
  const e = await t.P.registra(11);
  assert.equal(e.ok, true);
  assert.equal(t.archivio.cashflow.size, 0);
});
