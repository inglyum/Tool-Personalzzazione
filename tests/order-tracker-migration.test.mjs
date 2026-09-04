/**
 * order-tracker-migration.test.mjs — il terzo cassetto degli ordini.
 *
 * `OrderTracker` teneva i suoi ordini in localStorage, con stati propri, e
 * `orders` non li vedeva. La strada che pesa non è l'import CSV: è la conferma
 * di un preventivo Laser B2B, che creava l'ordine lì e scriveva `orderId` sul
 * preventivo. L'ordine esisteva, aveva un numero, e non compariva in Ordini.
 *
 * La domanda di questi test è quella della migrazione precedente — **può un
 * ordine sparire?** — più una che qui è nuova: **può un preventivo generare
 * due ordini?**
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, Date, parseFloat, isFinite, isNaN, String });
vm.runInContext(fs.readFileSync('src/core/migrations/orders-pro-to-orders.js', 'utf8'), contesto);
const M = contesto.InglyMigrazioneOrderTracker;

const legacy = (id, extra = {}) => ({ id, client: 'Cliente ' + id, description: 'Lavoro ' + id, total: 100, status: 'confirmed', created: '2026-01-10T09:00:00.000Z', ...extra });
const ordine = (id, extra = {}) => ({ id, clientName: 'Cliente ' + id, total: 100, stage: 'produzione', ...extra });

/* ── Traduzione degli stati ──────────────────────────────────────────────── */

test('gli stati di OrderTracker diventano quelli di GestioneOrdini', () => {
  assert.equal(M.normalizzaStato('draft'), 'preventivo');
  assert.equal(M.normalizzaStato('confirmed'), 'accettato');
  assert.equal(M.normalizzaStato('in_progress'), 'produzione');
  assert.equal(M.normalizzaStato('delivered'), 'completato');
  assert.equal(M.normalizzaStato('paid'), 'venduto');
  assert.equal(M.normalizzaStato('cancelled'), 'annullato');
});

test('uno stato sconosciuto non inventa una fase: torna a preventivo', () => {
  assert.equal(M.normalizzaStato('qualcosa_che_non_esiste'), 'preventivo');
  assert.equal(M.normalizzaStato(''), 'preventivo');
  assert.equal(M.normalizzaStato(null), 'preventivo');
});

test('lo stato è normalizzato allo stesso modo in stage e status', () => {
  const r = M.normalizza(legacy(1, { status: 'in_progress' }), 50);
  assert.equal(r.stage, 'produzione');
  assert.equal(r.status, 'produzione');
});

/* ── Forma del record ────────────────────────────────────────────────────── */

test('i campi di OrderTracker arrivano dove Ordini li cerca', () => {
  const r = M.normalizza({ id: 7, client: 'Rossi', description: 'Targa', product: 'Targa incisa', total: 240, quoteId: 'q9', phone: '333', notes: 'urgente', created: '2026-02-01T00:00:00.000Z' }, 50);
  assert.equal(r.clientName, 'Rossi');
  assert.equal(r.name, 'Targa incisa');
  assert.equal(r.description, 'Targa');
  assert.equal(r.total, 240);
  assert.equal(r.value, 240);
  assert.equal(r.quoteId, 'q9');
  assert.equal(r.phone, '333');
  assert.equal(r.notes, 'urgente');
  assert.equal(r.source, 'order_tracker');
});

test('senza prodotto il titolo è la descrizione, non una stringa vuota', () => {
  assert.equal(M.normalizza({ id: 1, description: 'Incisione' }, 9).name, 'Incisione');
  assert.equal(M.normalizza({ id: 1 }, 9).name, 'Ordine');
});

test('una scadenza che il record non aveva non viene inventata', () => {
  assert.equal(M.normalizza(legacy(1), 9).dueDate, '');
});

test('la provenienza resta scritta nel record migrato', () => {
  const r = M.normalizza(legacy(3), 50);
  assert.equal(r._migratoDa.store, 'ingly_orders_pro_v1');
  assert.equal(r._migratoDa.id, 3);
  assert.equal(r._migratoDa.versione, M.VERSIONE);
});

test('lo storico registra da dove arriva, senza inventare passaggi', () => {
  const r = M.normalizza(legacy(3, { status: 'paid' }), 50);
  assert.equal(r._history.length, 1);
  assert.equal(r._history[0].from, null);
  assert.equal(r._history[0].to, 'venduto');
});

/* ── Un preventivo, un ordine ────────────────────────────────────────────── */

test('un preventivo già collegato a un ordine non ne genera un secondo', () => {
  const piano = M.pianifica([legacy(1, { quoteId: 'q1' })], [ordine(10, { quoteId: 'q1' })]);
  assert.equal(piano.daScrivere.length, 0);
  assert.equal(piano.conteggi.stessoPreventivo, 1);
});

test('due record legacy con lo stesso preventivo producono un solo ordine', () => {
  const piano = M.pianifica([legacy(1, { quoteId: 'q1' }), legacy(2, { quoteId: 'q1' })], []);
  assert.equal(piano.daScrivere.length, 1);
  assert.equal(piano.conteggi.stessoPreventivo, 1);
});

test('un record senza preventivo non viene scambiato per un altro senza preventivo', () => {
  const piano = M.pianifica([legacy(1), legacy(2)], [ordine(10)]);
  assert.equal(piano.daScrivere.length, 2);
});

/* ── Ripetibilità e id ───────────────────────────────────────────────────── */

test('eseguire due volte non duplica nulla', () => {
  const primo = M.pianifica([legacy(1), legacy(2)], []);
  const secondo = M.pianifica([legacy(1), legacy(2)], primo.daScrivere);
  assert.equal(secondo.daScrivere.length, 0);
  assert.equal(secondo.conteggi.giaMigrati, 2);
});

test('gli id non collidono con quelli già occupati in orders', () => {
  const piano = M.pianifica([legacy(1), legacy(2)], [ordine(1), ordine(2), ordine(3)]);
  const nuovi = Array.from(piano.daScrivere, r => r.id);
  assert.equal(nuovi.filter(id => [1, 2, 3].includes(id)).length, 0);
  assert.equal(new Set(nuovi).size, nuovi.length);
});

test('due record legacy con lo stesso id ricevono due id distinti', () => {
  const piano = M.pianifica([legacy(5), legacy(5, { client: 'Altro' })], []);
  assert.equal(piano.daScrivere.length, 2);
  assert.notEqual(piano.daScrivere[0].id, piano.daScrivere[1].id);
});

/* ── Record rotti ────────────────────────────────────────────────────────── */

test('un record illeggibile viene contato, non fatto passare in silenzio', () => {
  const piano = M.pianifica([null, 'stringa', legacy(1)], []);
  assert.equal(piano.conteggi.illeggibili, 2);
  assert.equal(piano.daScrivere.length, 1);
  assert.equal(piano.saltati.filter(s => s.motivo === 'record illeggibile').length, 2);
});

test('una sorgente assente non è un errore: non c\'è niente da migrare', () => {
  assert.equal(M.pianifica(null, null).daScrivere.length, 0);
  assert.equal(M.pianifica(undefined, []).conteggi.legacy, 0);
});

/* ── La verifica deve saper fallire ──────────────────────────────────────── */

test('la verifica passa quando i conti tornano', () => {
  const piano = M.pianifica([legacy(1), legacy(2)], [ordine(9)]);
  const dopo = [ordine(9)].concat(piano.daScrivere);
  assert.equal(M.verifica(piano, dopo).ok, true);
});

test('la verifica fallisce se un record migrato non è arrivato', () => {
  const piano = M.pianifica([legacy(1), legacy(2)], []);
  const v = M.verifica(piano, piano.daScrivere.slice(0, 1));
  assert.equal(v.ok, false);
  assert.ok(v.problemi.some(p => p.includes('non trovato')));
});

test('la verifica fallisce su un id duplicato', () => {
  const piano = M.pianifica([legacy(1)], []);
  const doppio = piano.daScrivere.concat(piano.daScrivere);
  const v = M.verifica(piano, doppio);
  assert.equal(v.ok, false);
  assert.ok(v.problemi.some(p => p.includes('duplicati')));
});

/* ── Il caso reale ───────────────────────────────────────────────────────── */

test('cento record misti: il conteggio torna esatto', () => {
  const daMigrare = [];
  const ordini = [];
  for (let i = 1; i <= 40; i += 1) daMigrare.push(legacy(i));                        // nuovi
  for (let i = 41; i <= 70; i += 1) {                                                 // già migrati
    daMigrare.push(legacy(i));
    ordini.push(ordine(1000 + i, { _migratoDa: { store: 'ingly_orders_pro_v1', id: i, versione: M.VERSIONE } }));
  }
  for (let i = 71; i <= 100; i += 1) {                                                // preventivo già collegato
    daMigrare.push(legacy(i, { quoteId: 'q' + i }));
    ordini.push(ordine(2000 + i, { quoteId: 'q' + i }));
  }

  const piano = M.pianifica(daMigrare, ordini);
  assert.equal(piano.conteggi.legacy, 100);
  assert.equal(piano.conteggi.migrati, 40);
  assert.equal(piano.conteggi.giaMigrati, 30);
  assert.equal(piano.conteggi.stessoPreventivo, 30);
  assert.equal(piano.daScrivere.length, 40);
  assert.equal(piano.conteggi.ordiniDopo, 60 + 40);
  assert.equal(M.verifica(piano, ordini.concat(piano.daScrivere)).ok, true);
});

test('nessun ordine legacy resta senza destino: migrato o motivato', () => {
  const daMigrare = [legacy(1), legacy(2, { quoteId: 'q1' }), null, legacy(4)];
  const piano = M.pianifica(daMigrare, [ordine(9, { quoteId: 'q1' })]);
  assert.equal(piano.daScrivere.length + piano.saltati.length, daMigrare.length);
});
