/**
 * order-fields.test.mjs — ORD-001…012
 *
 * La lista ordini mostrava cinque colonne e filtrava per due criteri. Il
 * resto («chi ci lavora», «su quale macchina», «quanto ci guadagno») era nei
 * dati e non aveva un posto sullo schermo — o, peggio, aveva quattro posti
 * diversi da cui leggerlo.
 *
 * La domanda di questi test è una sola: **il modulo ricalcola qualcosa che
 * dovrebbe leggere?** Un margine ricalcolato con i costi di oggi su un ordine
 * di marzo è un numero che non è mai esistito, e sembra vero.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({
  Math, JSON, Object, Array, Date, Number, String, parseFloat, isFinite, isNaN,
});
/* Il registro delle tecnologie è quello vero: il modulo non deve avere un suo
   elenco, e il modo di dimostrarlo è dargli il motore che il prodotto usa. */
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), contesto);
vm.runInContext(fs.readFileSync('src/product/order-snapshot.js', 'utf8'), contesto);
vm.runInContext(fs.readFileSync('src/product/order-fields.js', 'utf8'), contesto);
const F = contesto.InglyOrderFields;

const snapshot = (extra) => Object.assign({
  stato: 'SNAPSHOT',
  lines: [],
  totals: { subtotalCost: 60, setupCost: 0, overhead: 0, totalCost: 60,
    subtotalNet: 100, totalGross: 122, grossProfit: 40, operatingProfit: 40,
    marginPct: 40, markupPct: 66.7 },
}, extra || {});

/* ── ORD-001/002 · immagine ─────────────────────────────────────────────── */

test('ORD-001 · l immagine dell ordine viene dall ordine, non dal catalogo', () => {
  const o = { id: 1, image: 'data:image/png;base64,AAA' };
  const r = F.immagine(o, { catalogo: { image: 'data:image/png;base64,ZZZ' } });
  assert.equal(r.src, 'data:image/png;base64,AAA');
  assert.equal(r.fonte, 'ordine');
  assert.equal(r.storica, true);
});

test('ORD-001b · in mancanza la prende dalla riga congelata dello snapshot', () => {
  const o = { id: 2, economicSnapshot: snapshot({ lines: [{ image: '/img/riga.png' }] }) };
  const r = F.immagine(o, {});
  assert.equal(r.src, '/img/riga.png');
  assert.equal(r.storica, true);
});

test('ORD-001c · poi dalle specifiche tecniche storiche', () => {
  const r = F.immagine({ id: 3 }, { specs: { image: 'data:image/webp;base64,BBB' } });
  assert.equal(r.fonte, 'specifiche');
  assert.equal(r.storica, true);
});

test('ORD-001d · il catalogo è l ultima sorgente e si dichiara non storica', () => {
  const r = F.immagine({ id: 4 }, { catalogo: { images: ['data:image/png;base64,CCC'] } });
  assert.equal(r.fonte, 'catalogo');
  assert.equal(r.storica, false);
});

test('ORD-002 · senza immagine restituisce null, mai una stringa vuota', () => {
  assert.equal(F.immagine({ id: 5 }, {}), null);
  assert.equal(F.immagine({ id: 6, image: '' }, {}), null);
  assert.equal(F.immagine({ id: 7, image: '   ' }, {}), null);
});

test('ORD-002b · un src che non è un immagine non diventa un img rotto', () => {
  assert.equal(F.immagine({ id: 8, image: 'undefined' }, {}), null);
  assert.equal(F.immagine({ id: 9, image: '[object Object]' }, {}), null);
  assert.equal(F.immagine({ id: 10, image: {} }, {}), null);
});

/* ── ORD-003/004 · margine ──────────────────────────────────────────────── */

test('ORD-003 · il margine viene dallo snapshot economico', () => {
  const m = F.margine({ id: 11, economicSnapshot: snapshot() });
  assert.equal(m.disponibile, true);
  assert.equal(m.valore, 40);
  assert.equal(m.percentuale, 40);
  assert.equal(m.fonte, 'snapshot');
});

test('ORD-004 · i costi di oggi non sovrascrivono lo storico', () => {
  /* Stesso ordine, costi correnti raddoppiati sul record: il margine non si
     muove, perché non viene da lì. */
  const o = { id: 12, economicSnapshot: snapshot(), cost: 999, total: 999, value: 999 };
  const m = F.margine(o);
  assert.equal(m.valore, 40);
  assert.equal(m.percentuale, 40);
});

test('ORD-004b · senza snapshot il margine non si inventa', () => {
  const m = F.margine({ id: 13, total: 500, cost: 100 });
  assert.equal(m.disponibile, false);
  assert.equal(m.valore, null);
  assert.equal(m.percentuale, null);
  assert.equal(m.fonte, 'assente');
  assert.ok(m.motivo.length > 0);
});

test('ORD-004c · gli ordini pre-snapshot sommano il margine delle righe congelate', () => {
  const o = { id: 14, lines: [
    { marginValue: 12, finalPrice: 40 },
    { marginValue: 8, finalPrice: 60 },
  ] };
  const m = F.margine(o);
  assert.equal(m.disponibile, true);
  assert.equal(m.valore, 20);
  assert.equal(Math.round(m.percentuale), 20);
  assert.equal(m.fonte, 'righe');
});

/* ── ORD-005/006 · assegnatario ─────────────────────────────────────────── */

test('ORD-005 · l assegnatario si legge dal campo canonico', () => {
  assert.equal(F.assegnatario({ assignedTo: 'Marco' }), 'Marco');
});

test('ORD-005b · e dai nomi storici, che si leggono ma non si scrivono più', () => {
  assert.equal(F.assegnatario({ assignee: 'Luca' }), 'Luca');
  assert.equal(F.assegnatario({ operator: 'Sara' }), 'Sara');
  assert.equal(F.assegnatario({ operatore: 'Anna' }), 'Anna');
  assert.equal(F.assegnatario({ assignedTo: { id: 'u1', name: 'Giulia' } }), 'Giulia');
});

test('ORD-006 · nessun assegnatario è null, non stringa vuota', () => {
  assert.equal(F.assegnatario({}), null);
  assert.equal(F.assegnatario({ assignedTo: '  ' }), null);
});

/* ── ORD-007/008/009 · filtri ───────────────────────────────────────────── */

const flotta = [
  { id: 1, machineId: 'm1', machineName: 'Laser CO2', assignedTo: 'Marco', technology: 'laser' },
  { id: 2, machineId: 'm2', machineName: 'Bambu X1', assignedTo: 'Sara', technology: 'print3d' },
  { id: 3, machineId: 'm1', machineName: 'Laser CO2', assignedTo: 'Sara', technology: 'laser' },
  { id: 4 },
];

test('ORD-007 · il filtro macchina filtra davvero', () => {
  assert.equal(F.filtra(flotta, { macchina: 'm1' }).map((o) => o.id).join(','), '1,3');
  assert.equal(F.filtra(flotta, { macchina: 'm2' }).length, 1);
  assert.equal(F.filtra(flotta, { macchina: 'all' }).length, 4);
});

test('ORD-007b · la macchina si legge anche dalla riga dello snapshot', () => {
  const o = { id: 20, economicSnapshot: snapshot({ lines: [{ machine: { id: 'm9', name: 'UV Flatbed' } }] }) };
  const m = F.macchina(o);
  assert.equal(m.id, 'm9');
  assert.equal(m.nome, 'UV Flatbed');
  assert.equal(m.fonte, 'riga');
});

test('ORD-008 · il filtro operatore filtra davvero', () => {
  assert.equal(F.filtra(flotta, { operatore: 'Sara' }).map((o) => o.id).join(','), '2,3');
  assert.equal(F.filtra(flotta, { operatore: 'Nessuno' }).length, 0);
});

test('ORD-009 · il filtro tecnologia usa il registro del motore, non un elenco locale', () => {
  const registro = F.tecnologie().map((t) => t.id).sort().join(',');
  const motore = contesto.InglyCostEngine.tecnologie().slice().sort().join(',');
  assert.equal(registro, motore);
  assert.ok(registro.includes('laser') && registro.includes('print3d'));
});

test('ORD-009b · e riconosce i nomi storici della stessa tecnologia', () => {
  assert.equal(F.normalizzaTecnologia('3D'), 'print3d');
  assert.equal(F.normalizzaTecnologia('sublimazione'), 'sublimation');
  assert.equal(F.normalizzaTecnologia('Stampa UV'), 'uv', 'l etichetta del motore è uno dei nomi storici');
  assert.equal(F.normalizzaTecnologia('ricamo'), null, 'una tecnologia che il motore non conosce non si inventa');
  assert.equal(F.normalizzaTecnologia(''), null);
});

test('ORD-009c · il filtro tecnologia filtra davvero', () => {
  assert.equal(F.filtra(flotta, { tecnologia: 'laser' }).map((o) => o.id).join(','), '1,3');
  assert.equal(F.filtra(flotta, { tecnologia: 'print3d' }).length, 1);
});

test('ORD-010 · i tre filtri si combinano', () => {
  assert.equal(F.filtra(flotta, { macchina: 'm1', operatore: 'Sara', tecnologia: 'laser' }).map((o) => o.id).join(','), '3');
  assert.equal(F.filtra(flotta, { macchina: 'm1', operatore: 'Marco', tecnologia: 'print3d' }).length, 0);
  assert.equal(F.filtra(flotta, F.FILTRI_VUOTI).length, 4);
});

test('ORD-010b · le opzioni si costruiscono dagli ordini presenti, non inventate', () => {
  const o = F.opzioni(flotta);
  assert.equal(o.macchine.map((m) => m.label).join(','), 'Bambu X1,Laser CO2');
  assert.equal(o.operatori.map((m) => m.id).join(','), 'Marco,Sara');
  assert.equal(o.tecnologie.map((m) => m.id).sort().join(','), 'laser,print3d');
});

test('ORD-010c · un ordine senza dati non sparisce dai filtri neutri', () => {
  assert.ok(F.passa({ id: 99 }, F.FILTRI_VUOTI));
  assert.ok(!F.passa({ id: 99 }, { macchina: 'm1' }));
});

/* ── ORD-011/012 · lettura stabile ──────────────────────────────────────── */

test('ORD-011 · leggere due volte lo stesso ordine dà lo stesso risultato', () => {
  const o = { id: 30, economicSnapshot: snapshot({ lines: [{ image: '/a.png', machine: { id: 'm3', name: 'DTF' } }] }),
    assignedTo: 'Marco', technology: 'dtf' };
  const a = JSON.stringify([F.immagine(o, {}), F.margine(o), F.macchina(o), F.tecnologia(o), F.assegnatario(o)]);
  const b = JSON.stringify([F.immagine(o, {}), F.margine(o), F.macchina(o), F.tecnologia(o), F.assegnatario(o)]);
  assert.equal(a, b);
});

test('ORD-011b · e non modifica l ordine che legge', () => {
  const o = { id: 31, economicSnapshot: snapshot(), assignedTo: 'Marco' };
  const prima = JSON.stringify(o);
  F.immagine(o, {}); F.margine(o); F.macchina(o); F.tecnologia(o); F.assegnatario(o); F.opzioni([o]);
  assert.equal(JSON.stringify(o), prima);
});

test('ORD-012 · un ordine storico senza niente non fa cadere nessuna lettura', () => {
  const vuoti = [{}, { id: null }, { lines: null }, { economicSnapshot: { stato: 'NO_SNAPSHOT', motivo: 'x' } }];
  for (const o of vuoti) {
    assert.doesNotThrow(() => {
      F.immagine(o, {}); F.margine(o); F.macchina(o); F.tecnologia(o); F.assegnatario(o);
    });
    assert.equal(F.margine(o).disponibile, false);
  }
});

test('ORD-012b · senza motore delle tecnologie non si inventa un elenco', () => {
  const isolato = vm.createContext({ Math, JSON, Object, Array, Date, Number, String, parseFloat, isFinite, isNaN });
  vm.runInContext(fs.readFileSync('src/product/order-fields.js', 'utf8'), isolato);
  assert.equal(isolato.InglyOrderFields.tecnologie().length, 0);
});
