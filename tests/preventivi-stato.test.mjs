/**
 * preventivi-stato.test.mjs — CRM-001…010
 *
 * Il difetto, misurato: un preventivo nasce con `status: 'in_attesa'`, e la
 * striscia «Pipeline €» del CRM sommava i preventivi con stato `'inviato'` o
 * `'bozza'` — due valori che nessuna parte del programma scrive mai. Ogni
 * preventivo nasceva già fuori dal conto.
 *
 * La domanda di questi test è una sola: **un preventivo può sparire?** Da un
 * conto, da uno storico cliente, da un legame con l'ordine.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({
  Math, JSON, Object, Array, Date, Number, String, parseFloat, isFinite, isNaN,
});
vm.runInContext(fs.readFileSync('src/product/quote-status.js', 'utf8'), contesto);
const Q = contesto.InglyQuoteStatus;

const OGGI = '2026-06-15T10:00:00.000Z';
const opz = { oggi: OGGI };

/* ── CRM-002/003 · il preventivo appena creato ──────────────────────────── */

test('CRM-002 · un preventivo appena salvato è aperto, non fermo', () => {
  /* `in_attesa` è lo stato con cui il preventivatore li crea. */
  const s = Q.statoDi({ id: 1, status: 'in_attesa', grossPrice: 100 }, opz);
  assert.equal(s.id, 'DRAFT');
  assert.equal(s.aperto, true);
});

test('CRM-002b · e finisce nel valore di pipeline', () => {
  const p = Q.pipeline([{ id: 1, status: 'in_attesa', grossPrice: 100 }], opz);
  assert.equal(p.aperti, 1);
  assert.equal(p.valore, 100);
});

test('CRM-002c · i due valori che nessuno scriveva restano leggibili', () => {
  /* Se un import o un record vecchio li porta, devono valere ancora. */
  assert.equal(Q.normalizza('bozza'), 'DRAFT');
  assert.equal(Q.normalizza('inviato'), 'SENT');
});

test('CRM-003 · un preventivo senza stato non sparisce: è una bozza dichiarata', () => {
  const s = Q.statoDi({ id: 2, grossPrice: 50 }, opz);
  assert.equal(s.id, 'DRAFT');
  assert.equal(s.derivato, true);
  assert.ok(/stato assente/.test(s.motivo));
  assert.equal(Q.pipeline([{ id: 2, grossPrice: 50 }], opz).valore, 50);
});

/* ── CRM-010 · il vocabolario è uno ─────────────────────────────────────── */

test('CRM-010 · i tre vocabolari storici confluiscono in uno', () => {
  const coppie = [
    ['in_attesa', 'DRAFT'], ['draft', 'DRAFT'],
    ['inviato', 'SENT'], ['sent', 'SENT'],
    ['accettato', 'ACCEPTED'], ['accepted', 'ACCEPTED'],
    ['confermato', 'CONVERTED'], ['produzione', 'CONVERTED'], ['won', 'CONVERTED'],
    ['rifiutato', 'REJECTED'], ['lost', 'REJECTED'],
    ['scaduto', 'EXPIRED'], ['expired', 'EXPIRED'],
  ];
  for (const [storico, canonico] of coppie) {
    assert.equal(Q.normalizza(storico), canonico, storico + ' → ' + canonico);
  }
});

test('CRM-010b · gli stati canonici sono esattamente i sette richiesti', () => {
  assert.equal(Object.keys(Q.STATI).sort().join(','),
    'ACCEPTED,CONVERTED,DRAFT,EXPIRED,REJECTED,SENT,VIEWED');
});

test('CRM-010c · uno stato sconosciuto non diventa un ottavo stato', () => {
  assert.equal(Q.normalizza('pippo'), null);
  const s = Q.statoDi({ id: 3, status: 'pippo' }, opz);
  assert.equal(s.id, 'DRAFT', 'ricade sulla bozza, che è aperta: non si perde');
  assert.equal(s.aperto, true);
});

/* ── «Visto» e «scaduto»: uno si registra, l altro si deriva ────────────── */

test('CRM-010d · «visto» non si deduce dall invio: serve il dato', () => {
  assert.equal(Q.statoDi({ id: 4, status: 'inviato' }, opz).id, 'SENT');
  assert.equal(Q.statoDi({ id: 5, viewedAt: '2026-06-10' }, opz).id, 'VIEWED');
});

test('CRM-010e · «scaduto» si deriva dalla validità e si dichiara derivato', () => {
  const s = Q.statoDi({ id: 6, status: 'inviato', deadline: '2026-06-01' }, opz);
  assert.equal(s.id, 'EXPIRED');
  assert.equal(s.derivato, true);
  assert.equal(s.aperto, false);
  assert.ok(/validità scaduta/.test(s.motivo));
});

test('CRM-010f · una validità futura non scade', () => {
  assert.equal(Q.statoDi({ id: 7, status: 'inviato', deadline: '2026-07-01' }, opz).id, 'SENT');
});

test('CRM-010g · un preventivo già convertito non «scade»', () => {
  const s = Q.statoDi({ id: 8, status: 'confermato', deadline: '2026-01-01' }, opz);
  assert.equal(s.id, 'CONVERTED');
});

/* ── CRM-006/007/008 · i legami ─────────────────────────────────────────── */

test('CRM-006 · l ordine si trova comunque il preventivo sia nominato', () => {
  const q = { id: 100 };
  const nomi = ['originQuote', 'quoteId', '_fromQuoteId', 'fromQuote', 'sourceQuoteId'];
  for (const n of nomi) {
    const ordini = [{ id: 900, [n]: 100 }];
    assert.equal(Q.ordineDi(q, ordini).id, 900, n);
  }
});

test('CRM-007 · dall ordine si risale al preventivo', () => {
  const ordine = { id: 900, originQuote: 100 };
  const preventivi = [{ id: 99 }, { id: 100, name: 'Targhe' }];
  assert.equal(Q.preventivoDi(ordine, preventivi).name, 'Targhe');
});

test('CRM-008 · e il legame regge anche scritto solo dalla parte del preventivo', () => {
  const q = { id: 100, orderId: 900 };
  assert.equal(Q.ordineDi(q, [{ id: 900 }]).id, 900);
  assert.equal(Q.preventivoDi({ id: 900 }, [q]).id, 100);
});

test('CRM-006b · un ordine collegato vale più dello stato scritto nel record', () => {
  /* Il caso vero: l'ordine è stato creato ma nessuno ha aggiornato il
     preventivo. Contarlo ancora in pipeline gonfia il numero. */
  const q = { id: 100, status: 'in_attesa', grossPrice: 500 };
  const s = Q.statoDi(q, { oggi: OGGI, orders: [{ id: 900, quoteId: 100 }] });
  assert.equal(s.id, 'CONVERTED');
  assert.equal(s.aperto, false);
  assert.ok(/ordine collegato/.test(s.fonte));
});

test('CRM-009 · un preventivo senza ordine non viene dichiarato convertito', () => {
  const q = { id: 100, status: 'in_attesa' };
  assert.equal(Q.statoDi(q, { oggi: OGGI, orders: [{ id: 900, quoteId: 555 }] }).id, 'DRAFT');
});

/* ── CRM-001/005 · il cliente e il suo storico ──────────────────────────── */

test('CRM-001 · un preventivo appartiene al cliente per id', () => {
  const a = Q.appartieneA({ clientId: 7 }, { id: 7, name: 'Alfa' });
  assert.equal(a.collegato, true);
  assert.equal(a.per, 'id');
});

test('CRM-005 · i record vecchi si riconoscono per nome, e si dichiara', () => {
  const a = Q.appartieneA({ clientName: 'Alfa' }, { id: 7, name: 'alfa' });
  assert.equal(a.collegato, true);
  assert.equal(a.per, 'nome');
});

test('CRM-005b · lo storico del cliente raccoglie entrambi i modi', () => {
  const cliente = { id: 7, name: 'Alfa' };
  const preventivi = [
    { id: 1, clientId: 7 },
    { id: 2, clientName: 'Alfa' },
    { id: 3, clientId: 8 },
    { id: 4 },
  ];
  assert.equal(Q.preventiviDi(cliente, preventivi).map((q) => q.id).join(','), '1,2');
});

/* ── CRM-004 · i conti ──────────────────────────────────────────────────── */

test('CRM-004 · la pipeline conta per stato e somma solo gli aperti', () => {
  const preventivi = [
    { id: 1, status: 'in_attesa', grossPrice: 100 },
    { id: 2, status: 'inviato', grossPrice: 200 },
    { id: 3, status: 'confermato', grossPrice: 300 },
    { id: 4, status: 'rifiutato', grossPrice: 400 },
    { id: 5, status: 'inviato', grossPrice: 500, deadline: '2026-01-01' },
  ];
  const p = Q.pipeline(preventivi, opz);
  assert.equal(p.totale, 5);
  assert.equal(p.aperti, 2);
  assert.equal(p.valore, 300, 'solo i due aperti: lo scaduto non è più in gioco');
  assert.equal(p.conteggi.CONVERTED, 1);
  assert.equal(p.conteggi.EXPIRED, 1);
  assert.equal(p.scadutiDerivati, 1);
});

test('CRM-004b · la conversione si calcola sui preventivi decisi, non su tutti', () => {
  const p = Q.pipeline([
    { id: 1, status: 'in_attesa', grossPrice: 100 },
    { id: 2, status: 'confermato', grossPrice: 100 },
    { id: 3, status: 'rifiutato', grossPrice: 100 },
  ], opz);
  assert.equal(p.decisi, 2);
  assert.equal(p.conversionePct, 50);
});

test('CRM-004c · senza preventivi decisi la conversione è «non lo so», non zero', () => {
  const p = Q.pipeline([{ id: 1, status: 'in_attesa', grossPrice: 100 }], opz);
  assert.equal(p.conversionePct, null);
});

test('CRM-004d · nessun preventivo non fa cadere niente', () => {
  assert.doesNotThrow(() => Q.pipeline(null));
  assert.doesNotThrow(() => Q.statoDi(null, {}));
  assert.equal(Q.pipeline([]).valore, 0);
});
