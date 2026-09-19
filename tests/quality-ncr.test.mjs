/**
 * quality-ncr.test.mjs — uno scarto non è solo un numero, è una decisione.
 *
 * `InglyOperazioni` conta da tempo buoni/scarti/rifacimenti su un'operazione
 * (`qualita()`, `riepilogo()`) ma non conservava la decisione presa su un
 * pezzo non conforme — chi l'ha vista, quando, e cosa ne è stato deciso.
 * Questi test provano il motore puro: una non conformità nasce aperta, si
 * chiude una volta sola con una disposizione valida, e non inventa mai una
 * proposta da un'operazione senza scarto o senza un motivo dichiarato.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, Date });
vm.runInContext(fs.readFileSync('src/product/operations-model.js', 'utf8'), contesto);
vm.runInContext(fs.readFileSync('src/product/quality-ncr.js', 'utf8'), contesto);
const OP = contesto.InglyOperazioni;
const N = contesto.InglyQualityNCR;

function ncrBase(extra) {
  return Object.assign({ orderId: 'o1', operationId: 'op-1', technology: 'laser', quantity: 4, reason: 'bruciatura' }, extra || {});
}

test('validazione', async (t) => {
  await t.test('senza ordine non è valida', () => {
    assert.equal(N.valida({ quantity: 1, reason: 'x' }).valido, false);
  });
  await t.test('senza quantità valida non è valida', () => {
    assert.equal(N.valida({ orderId: 'o1', reason: 'x' }).valido, false);
    assert.equal(N.valida({ orderId: 'o1', quantity: 0, reason: 'x' }).valido, false);
  });
  await t.test('senza un motivo non è valida', () => {
    assert.equal(N.valida({ orderId: 'o1', quantity: 1 }).valido, false);
  });
  await t.test('una disposizione sconosciuta non è valida', () => {
    assert.equal(N.valida(ncrBase({ disposition: 'boh' })).valido, false);
  });
  await t.test('completa è valida', () => {
    assert.equal(N.valida(ncrBase()).valido, true);
  });
});

test('la nascita di una non conformità', async (t) => {
  await t.test('si congela: non si modifica dopo', () => {
    const n = N.crea(ncrBase());
    assert.throws(() => { n.quantity = 999; });
  });
  await t.test('nasce sempre aperta, anche se una disposizione era dichiarata subito', () => {
    const n = N.crea(ncrBase({ disposition: 'scarto' }));
    assert.equal(n.status, 'aperta');
  });
  await t.test('un input non valido non produce un record', () => {
    assert.equal(N.crea({ quantity: 1 }), null);
  });
});

test('chiusura', async (t) => {
  await t.test('richiede una disposizione valida', () => {
    const n = N.crea(ncrBase());
    const esito = N.chiudi(n, {});
    assert.equal(esito.ok, false);
  });
  await t.test('chiude con una disposizione e registra chi e quando', () => {
    const n = N.crea(ncrBase());
    const esito = N.chiudi(n, { disposition: 'rilavorazione', approvatoDa: 'usr1', quando: '2026-01-05T00:00:00.000Z' });
    assert.equal(esito.ok, true);
    assert.equal(esito.ncr.status, 'chiusa');
    assert.equal(esito.ncr.disposition, 'rilavorazione');
    assert.equal(esito.ncr.closedBy, 'usr1');
    assert.equal(esito.ncr.closedAt, '2026-01-05T00:00:00.000Z');
  });
  await t.test('non si chiude due volte', () => {
    const n = N.crea(ncrBase());
    const prima = N.chiudi(n, { disposition: 'scarto' }).ncr;
    const seconda = N.chiudi(prima, { disposition: 'scarto' });
    assert.equal(seconda.ok, false);
  });
  await t.test('la non conformità originale non si modifica: chiudi restituisce un nuovo record', () => {
    const n = N.crea(ncrBase());
    N.chiudi(n, { disposition: 'scarto' });
    assert.equal(n.status, 'aperta');
  });
});

test('proposta da un\'operazione — nessun numero inventato', async (t) => {
  await t.test('un\'operazione senza scarto né rifacimento non propone niente', () => {
    const op = OP.normalizza({ technology: 'laser', quantity: 10, goodQuantity: 10, wasteQuantity: 0 });
    assert.equal(N.daOperazione(op), null);
  });
  await t.test('scarto senza un motivo dichiarato: non proponibile, non inventato', () => {
    const op = OP.normalizza({ technology: 'laser', quantity: 10, wasteQuantity: 2 });
    const p = N.daOperazione(op);
    assert.equal(p.proponibile, false);
  });
  await t.test('scarto con motivo: propone scarto come disposizione suggerita', () => {
    const op = OP.normalizza({ id: 'op-9', technology: 'laser', quantity: 10, wasteQuantity: 2, wasteReason: 'bruciatura' });
    const p = N.daOperazione(op, { orderId: 'o1' });
    assert.equal(p.proponibile, true);
    assert.equal(p.quantity, 2);
    assert.equal(p.reason, 'bruciatura');
    assert.equal(p.suggerimento, 'scarto');
    assert.equal(p.operationId, 'op-9');
  });
  await t.test('rifacimento con motivo: propone rilavorazione, porta il costo di rifacimento', () => {
    const op = OP.normalizza({ technology: 'uv', quantity: 10, reworkQuantity: 1, reworkCost: 4.5, wasteReason: 'macchia' });
    const p = N.daOperazione(op, { orderId: 'o1' });
    assert.equal(p.suggerimento, 'rilavorazione');
    assert.equal(p.reworkCost, 4.5);
  });
  await t.test('scarto e rifacimento insieme: quantità sommata, nessun suggerimento a priori', () => {
    const op = OP.normalizza({ technology: 'laser', quantity: 10, wasteQuantity: 1, reworkQuantity: 1, wasteReason: 'x' });
    const p = N.daOperazione(op);
    assert.equal(p.quantity, 2);
    assert.equal(p.suggerimento, null);
  });
});

test('riepilogo — mai un secondo modo di contare scarti', async (t) => {
  await t.test('conta aperte e chiuse separatamente', () => {
    const a = N.crea(ncrBase({ id: 'a' }));
    const b = N.chiudi(N.crea(ncrBase({ id: 'b' })), { disposition: 'scarto' }).ncr;
    const r = N.riepilogo([a, b]);
    assert.equal(r.totale, 2);
    assert.equal(r.aperte, 1);
    assert.equal(r.chiuse, 1);
    assert.equal(r.perDisposizione.scarto, 1);
  });
  await t.test('un archivio vuoto non inventa un totale', () => {
    const r = N.riepilogo([]);
    assert.equal(r.totale, 0);
    assert.equal(r.quantitaTotale, 0);
  });
});
