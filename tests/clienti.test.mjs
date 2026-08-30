/**
 * clienti.test.mjs — due liste disgiunte diventano una.
 *
 * Misurato nel browser, non dedotto: scrivendo un cliente su IndexedDB e un
 * altro su `ingly_crm_v1`, `CRMSmart._load()` vedeva solo il secondo e
 * `IDB.getAll('clients')` solo il primo. Siccome ordini, preventivi e vendite
 * riferiscono l'archivio IndexedDB, un cliente creato dalla rubrica non
 * compariva mai nel menu di un preventivo — e chi lo cercava concludeva che il
 * prodotto avesse perso i dati, mentre erano dall'altra parte.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, String, Date, Promise });
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = {
  _d: {}, getItem(k) { return this._d[k] ?? null; },
  setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; },
};
for (const f of ['cliente-integrita.js', 'clienti.js']) {
  vm.runInContext(fs.readFileSync('src/product/' + f, 'utf8'), ctx);
}
const U = ctx.InglyClienti;

const dbFinto = (righe) => {
  const store = new Map(righe.map((r) => [String(r.id), r]));
  return {
    _store: store,
    getAll: async () => [...store.values()],
    put: async (s, r) => { store.set(String(r.id), r); },
    get: async (s, id) => store.get(String(id)) || null,
    del: async (s, id) => { store.delete(String(id)); },
  };
};
const specchio = (righe) => ctx.localStorage.setItem('ingly_crm_v1', JSON.stringify(righe));

/* ── L'unione ───────────────────────────────────────────────────────────── */

test('un cliente che sta solo da una parte sopravvive', () => {
  const u = U.unisci([{ id: 1, name: 'Solo archivio' }], [{ id: 2, name: 'Solo rubrica' }]);
  assert.equal(u.length, 2);
  assert.equal(u.map((c) => c.name).sort().join(','), 'Solo archivio,Solo rubrica');
});

test('lo stesso id da entrambe le parti dà un cliente solo', () => {
  const u = U.unisci([{ id: 1, name: 'Rossi' }], [{ id: 1, name: 'Rossi', phone: '333' }]);
  assert.equal(u.length, 1);
  assert.equal(u[0].phone, '333', 'il campo che c\'era solo da una parte non si perde');
});

test('la stessa email senza id conta come lo stesso cliente', () => {
  const u = U.unisci([{ id: 1, name: 'Rossi', email: 'A@Prova.it' }],
    [{ name: 'Rossi Mario', email: 'a@prova.it', phone: '333' }]);
  assert.equal(u.length, 1, 'l\'email è l\'unico campo che chi importa compila sempre');
  assert.equal(u[0].phone, '333');
});

test('lo stesso nome NON basta a fondere due schede', () => {
  /* «Rossi» e «Rossi» sono spesso due clienti diversi: fonderli
     perderebbe schede che devono restare separate, ed è un danno che non si
     annulla. */
  const u = U.unisci([{ id: 1, name: 'Rossi' }], [{ id: 2, name: 'Rossi' }]);
  assert.equal(u.length, 2);
});

test('un\'email malformata non fonde niente', () => {
  const u = U.unisci([{ id: 1, email: 'non-una-email' }], [{ id: 2, email: 'non-una-email' }]);
  assert.equal(u.length, 2);
});

test('unire non sceglie fra due versioni: le fonde, e registra i conflitti', () => {
  const u = U.unisci([{ id: 1, name: 'Rossi', phone: '111' }],
    [{ id: 1, name: 'Rossi', phone: '222', email: 'r@prova.it' }]);
  assert.equal(u.length, 1);
  assert.equal(u[0].phone, '111', 'su conflitto vince il canonico');
  assert.equal(u[0].email, 'r@prova.it', 'ma ciò che mancava arriva');
  assert.equal(u[0]._conflitti.phone.scartato, '222',
    'un dato scartato in silenzio è un dato perso');
});

test('ogni cliente dichiara da dove viene', () => {
  const u = U.unisci([{ id: 1, name: 'A' }], [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]);
  const a = u.find((c) => c.id === 1), b = u.find((c) => c.id === 2);
  assert.equal(a._fonti.length, 2);
  assert.equal(b._fonti.join(','), 'rubrica');
});

/* ── La migrazione ──────────────────────────────────────────────────────── */

test('la migrazione porta ogni cliente da entrambe le parti', async () => {
  const db = dbFinto([{ id: 1, name: 'Solo archivio' }]);
  specchio([{ id: 2, name: 'Solo rubrica' }]);
  const r = await U.migra({ db });
  assert.equal(r.totale, 2);
  assert.equal(r.soloArchivio, 1);
  assert.equal(r.soloRubrica, 1);
  assert.equal((await db.getAll()).length, 2, 'anche quello della rubrica è finito nell\'archivio');
  assert.equal(JSON.parse(ctx.localStorage.getItem('ingly_crm_v1')).length, 2);
});

test('la migrazione non cancella e si può rieseguire', async () => {
  const db = dbFinto([{ id: 1, name: 'A' }]);
  specchio([{ id: 2, name: 'B' }]);
  await U.migra({ db });
  const dopo1 = (await db.getAll()).length;
  const r2 = await U.migra({ db });
  assert.equal((await db.getAll()).length, dopo1, 'la seconda volta non duplica');
  assert.equal(r2.totale, 2);
});

test('i campi di servizio non finiscono nell\'archivio', async () => {
  /* `_fonti` descrive da dove è arrivato un record, non il cliente:
     salvarlo lo trasformerebbe in un dato. */
  const db = dbFinto([{ id: 1, name: 'A' }]);
  specchio([{ id: 1, name: 'A', phone: '1' }]);
  await U.migra({ db });
  const salvato = await db.get('clients', 1);
  assert.equal(salvato._fonti, undefined);
  assert.equal(salvato._conflitti, undefined);
});

/* ── La scrittura ───────────────────────────────────────────────────────── */

test('salvare scrive il canonico e mantiene lo specchio', async () => {
  const db = dbFinto([]);
  specchio([]);
  await U.carica({ db });
  const c = await U.salva({ name: 'Nuovo', email: 'n@prova.it' }, { db });
  assert.ok(c.id, 'un cliente senza id ne riceve uno');
  assert.ok(await db.get('clients', c.id), 'canonico scritto');
  const mirror = JSON.parse(ctx.localStorage.getItem('ingly_crm_v1'));
  assert.equal(mirror.length, 1, 'specchio mantenuto');
  assert.equal(mirror[0].id, c.id);
});

test('salvare due volte aggiorna, non duplica', async () => {
  const db = dbFinto([]);
  specchio([]);
  await U.carica({ db });
  const c = await U.salva({ id: 'x1', name: 'Rossi' }, { db });
  await U.salva({ id: 'x1', name: 'Rossi Mario' }, { db });
  assert.equal((await db.getAll()).length, 1);
  assert.equal(JSON.parse(ctx.localStorage.getItem('ingly_crm_v1')).length, 1);
  assert.equal((await db.get('clients', 'x1')).name, 'Rossi Mario');
});

test('il cliente appena salvato si vede subito, senza rileggere', async () => {
  /* Aspettare una rilettura lo farebbe sparire per un istante dalla rubrica. */
  const db = dbFinto([]);
  specchio([]);
  await U.carica({ db });
  const prima = U.elenco().length;
  await U.salva({ name: 'Immediato' }, { db });
  assert.equal(U.elenco().length, prima + 1);
});

/* ── La lettura ─────────────────────────────────────────────────────────── */

test('prima che la cache sia pronta si mostra la rubrica, non il vuoto', () => {
  /* Un elenco vuoto farebbe lampeggiare «nessun cliente» a chi ne ha
     trecento. */
  ctx.InglyClienti.migra; // no-op: si forza solo lo stato non pronto
  specchio([{ id: 9, name: 'Storico' }]);
  const nuovo = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, String, Date, Promise });
  nuovo.window = nuovo; nuovo.globalThis = nuovo;
  nuovo.localStorage = ctx.localStorage;
  vm.runInContext(fs.readFileSync('src/product/clienti.js', 'utf8'), nuovo);
  assert.equal(nuovo.InglyClienti.stato().pronta, false);
  assert.equal(nuovo.InglyClienti.elenco().length, 1);
});

test('gli archiviati non compaiono fra gli attivi', async () => {
  const db = dbFinto([{ id: 1, name: 'Attivo' }, { id: 2, name: 'Archiviato', status: 'ARCHIVED' }]);
  specchio([]);
  await U.carica({ db });
  assert.equal(U.elenco().length, 2);
  assert.equal(U.attivi().length, 1);
  assert.equal(U.attivi()[0].name, 'Attivo');
});

test('perId trova il cliente indipendentemente dal tipo dell\'id', async () => {
  const db = dbFinto([{ id: 7, name: 'Sette' }]);
  specchio([]);
  await U.carica({ db });
  assert.equal(U.perId(7)?.name, 'Sette');
  assert.equal(U.perId('7')?.name, 'Sette');
});

/* ── Eliminare ──────────────────────────────────────────────────────────── */

test('un cliente eliminato non risorge alla migrazione successiva', async () => {
  /* Trovato dal collaudo nel browser, non previsto qui: cancellare
     dall'archivio senza togliere dallo specchio faceva ritrovare il cliente
     alla migrazione, che lo riscriveva. Un record che torna dopo essere stato
     cancellato è peggio di uno che non si cancella: nessuno va a
     ricontrollare. */
  const db = dbFinto([]);
  specchio([]);
  await U.carica({ db });
  const c = await U.salva({ name: 'Da eliminare' }, { db });
  assert.equal(JSON.parse(ctx.localStorage.getItem('ingly_crm_v1')).length, 1);

  await U.elimina(c.id, { db, forza: true });
  assert.equal((await db.getAll()).length, 0, 'tolto dall\'archivio');
  assert.equal(JSON.parse(ctx.localStorage.getItem('ingly_crm_v1')).length, 0, 'e dallo specchio');

  await U.migra({ db });
  assert.equal((await db.getAll()).length, 0, 'e non torna');
  assert.equal(U.elenco().length, 0);
});

test('eliminare un cliente con documenti viene rifiutato anche da qui', async () => {
  /* Il presidio si ricontrolla: un secondo chiamante potrebbe
     dimenticarsene, e questo è il punto in cui il dato sparisce davvero. */
  const db = dbFinto([{ id: 5, name: 'Con ordini' }]);
  db.getAll = async (s) => (s === 'orders' ? [{ id: 1, clientId: 5 }] : [{ id: 5, name: 'Con ordini' }]);
  specchio([]);
  const r = await U.elimina(5, { db });
  assert.equal(r.ok, false);
  assert.equal(r.azione, 'archivia');
  assert.match(r.motivo, /ordin/i);
});

test('con forza si elimina comunque, perché chi ha già archiviato lo sa', async () => {
  const db = dbFinto([{ id: 5, name: 'X' }]);
  specchio([]);
  await U.carica({ db });
  const r = await U.elimina(5, { db, forza: true });
  assert.equal(r.ok, true);
});

test('senza un archivio che sa cancellare non si dichiara di aver cancellato', async () => {
  /* Togliere solo dallo specchio farebbe sparire il cliente dalla rubrica
     lasciandolo nell'archivio: il difetto delle due liste, al contrario. */
  const db = { getAll: async () => [{ id: 5, name: 'X' }], put: async () => {} };
  const r = await U.elimina(5, { db, forza: true });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /non eseguita/);
});

test('gli id assegnati si salvano: due letture danno gli stessi id', () => {
  /* Assegnarli su una copia temporanea ne generava di nuovi a ogni lettura:
     la riga disegnata portava un id e la lettura successiva un altro, quindi
     «modifica» ed «elimina» non trovavano più il contatto. È il difetto di
     identità che CRM-03 aveva chiuso, e che l'unione stava riaprendo dal lato
     opposto. */
  specchio([{ name: 'Senza id 1', email: 'a@x.it' }, { name: 'Senza id 2', email: 'b@x.it' }]);
  const primi = U.elenco().map((c) => c.id);
  const secondi = U.elenco().map((c) => c.id);
  assert.equal(primi.join(','), secondi.join(','));
  assert.ok(primi.every(Boolean));
  const salvati = JSON.parse(ctx.localStorage.getItem('ingly_crm_v1')).map((c) => c.id);
  assert.equal(salvati.join(','), primi.join(','), 'gli id devono finire nello specchio');
});

test('sostituire un elenco toglie davvero chi non c\'è più', async () => {
  /* `_save(elenco)` vuol dire «questo è l'elenco adesso»: la rubrica lo usa
     per cancellare. Trattarlo come un semplice inserimento toglieva la
     cancellazione senza che niente protestasse. */
  const db = dbFinto([]);
  specchio([]);
  await U.carica({ db });
  await U.salva({ id: 'a', name: 'A' }, { db });
  await U.salva({ id: 'b', name: 'B' }, { db });
  assert.equal(U.elenco().length, 2);

  await U.sostituisci([{ id: 'a', name: 'A' }], { db });
  assert.equal(U.elenco().map((c) => c.id).join(','), 'a');
  assert.equal((await db.getAll()).length, 1);
  assert.equal(JSON.parse(ctx.localStorage.getItem('ingly_crm_v1')).length, 1);
});

test('chi sparisce dall\'elenco ma ha documenti viene archiviato, non perso', async () => {
  const righe = [{ id: 'a', name: 'A' }, { id: 'b', name: 'Con ordini' }];
  const store = new Map(righe.map((r) => [String(r.id), r]));
  const db = {
    getAll: async (s) => (s === 'orders' ? [{ id: 1, clientId: 'b' }] : [...store.values()]),
    put: async (s, r) => { store.set(String(r.id), r); },
    get: async (s, id) => store.get(String(id)) || null,
    del: async (s, id) => { store.delete(String(id)); },
  };
  specchio([]);
  await U.carica({ db });
  const r = await U.sostituisci([{ id: 'a', name: 'A' }], { db });
  assert.equal(r.archiviati, 1);
  assert.equal(r.eliminati, 0);
  const b = await db.get('clients', 'b');
  assert.ok(b, 'il cliente con ordini è ancora lì');
  assert.equal(b.status, 'ARCHIVED');
});
