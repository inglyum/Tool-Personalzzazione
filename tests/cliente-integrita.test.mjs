/**
 * cliente-integrita.test.mjs — un cliente con una storia non si cancella.
 *
 * `Clients.del()` chiamava `IDB.del('clients', id)` senza chiedere se quel
 * cliente avesse ordini. Quando li aveva, i documenti restavano con un
 * `clientId` che non puntava più a niente: nella scheda dell'ordine compariva
 * uno spazio vuoto dove c'era un nome.
 *
 * Il danno non si vede il giorno in cui si cancella. Si vede sei mesi dopo,
 * quando qualcuno cerca gli ordini di un cliente e ne trova meno di quanti ne
 * ricordava, e non c'è modo di sapere quali mancano.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, String, Date, Promise });
ctx.window = ctx; ctx.globalThis = ctx;
vm.runInContext(fs.readFileSync('src/product/cliente-integrita.js', 'utf8'), ctx);
const G = ctx.InglyClienteIntegrita;

/** Un finto archivio: il modulo non deve sapere com'è fatto IndexedDB. */
const db = (dati) => ({ getAll: async (s) => (s in dati ? dati[s] : null) });

test('un cliente senza documenti si può eliminare', async () => {
  const v = await G.puoEliminare(7, { db: db({ orders: [], quotes: [], sales: [] }) });
  assert.equal(v.ok, true);
  assert.equal(v.azione, 'elimina');
});

test('un cliente con ordini non si elimina: si archivia', async () => {
  const v = await G.puoEliminare(7, {
    db: db({ orders: [{ id: 1, clientId: 7 }, { id: 2, clientId: 7 }], quotes: [], sales: [] }),
  });
  assert.equal(v.ok, false);
  assert.equal(v.azione, 'archivia');
  assert.equal(v.dipendenze.totale, 2);
  assert.match(v.spiega, /2 ordini/);
});

test('il conteggio guarda tutti gli archivi, non solo gli ordini', async () => {
  const v = await G.puoEliminare(7, {
    db: db({
      orders: [{ id: 1, clientId: 7 }],
      quotes: [{ id: 9, clientId: 7 }, { id: 10, clientId: 7 }],
      sales: [{ id: 3, clientId: 7 }],
      invoices: [{ id: 4, clientId: 7 }],
      payments: [{ id: 5, clientId: 7 }],
    }),
  });
  assert.equal(v.dipendenze.totale, 6);
  assert.equal(Object.keys(v.dipendenze.perArchivio).length, 5);
});

test("l'id si confronta per valore, non per tipo", async () => {
  /* Gli id passano da `value` di una `<select>` come stringhe e tornano dal
     database come numeri: confrontarli con `===` farebbe passare per «senza
     documenti» un cliente che ne ha. */
  const v = await G.puoEliminare(7, { db: db({ orders: [{ id: 1, clientId: '7' }] }) });
  assert.equal(v.ok, false, 'lo stesso cliente scritto come stringa deve contare');
});

test('riconosce i tre nomi che il campo ha nel prodotto', async () => {
  for (const campo of ['clientId', 'client_id', 'clienteId']) {
    const v = await G.puoEliminare(7, { db: db({ orders: [{ id: 1, [campo]: 7 }] }) });
    assert.equal(v.ok, false, `campo ${campo} ignorato`);
  }
});

test('un archivio che non esiste non conta come «nessun documento»', async () => {
  /* La differenza fra «ho guardato e non c'era niente» e «non ho potuto
     guardare» è tutta la fiducia che si può dare al verdetto. */
  const v = await G.puoEliminare(7, { db: db({ orders: [{ id: 1, clientId: 7 }] }) });
  assert.equal(v.dipendenze.perArchivio.quotes, undefined);
  assert.equal(v.ok, false);
});

test('senza database non si autorizza un\'eliminazione', async () => {
  const v = await G.puoEliminare(7, { db: null });
  assert.equal(v.dipendenze.totale, 0);
});

test('la spiegazione nomina i documenti e dice cosa succederebbe', async () => {
  const v = await G.puoEliminare(7, {
    db: db({ orders: [{ id: 1, clientId: 7, number: 'ORD-2026-014' }], quotes: [{ id: 2, clientId: 7 }] }),
  });
  assert.match(v.spiega, /senza intestatario/);
  assert.equal(v.dipendenze.dettaglio[0].esempi[0], 'ORD-2026-014',
    'un riferimento concreto si può andare a guardare, un numero no');
});

/* ── Archiviare ─────────────────────────────────────────────────────────── */

test('archiviare non cancella niente: aggiunge tre campi', () => {
  const c = { id: 7, name: 'Rossi', email: 'a@b.it', note: 'cliente storico' };
  const a = G.archivia(c, 'chiuso');
  assert.equal(a.status, 'ARCHIVED');
  assert.equal(a.archivedReason, 'chiuso');
  assert.ok(a.archivedAt);
  assert.equal(a.name, 'Rossi');
  assert.equal(a.note, 'cliente storico', 'nessun campo esistente si perde');
  assert.equal(c.status, undefined, 'e l\'originale non viene modificato');
});

test('archiviare è reversibile', () => {
  const a = G.archivia({ id: 7, name: 'Rossi' }, 'errore');
  const r = G.riattiva(a);
  assert.equal(r.status, 'ACTIVE');
  assert.equal(r.archivedAt, null);
  assert.ok(r.reactivatedAt);
  assert.equal(r.name, 'Rossi');
});

test('un cliente senza status è attivo, non archiviato', () => {
  /* È la condizione di ogni scheda creata prima di questa regola: trattarla
     come archiviata farebbe sparire l'intera rubrica al primo aggiornamento. */
  const elenco = [{ id: 1, name: 'A' }, { id: 2, name: 'B', status: 'ARCHIVED' }, { id: 3, name: 'C', status: 'ACTIVE' }];
  assert.equal(G.attivi(elenco).map((c) => c.name).join(','), 'A,C');
  assert.equal(G.archiviati(elenco).map((c) => c.name).join(','), 'B');
});

test('lo status si riconosce comunque sia scritto', () => {
  assert.equal(G.eArchiviato({ status: 'archived' }), true);
  assert.equal(G.eArchiviato({ status: 'Archived' }), true);
  assert.equal(G.eArchiviato({ status: 'ACTIVE' }), false);
  assert.equal(G.eArchiviato({}), false);
  assert.equal(G.eArchiviato(null), false);
});
