/**
 * purchase-order.test.mjs — l'ordine d'acquisto, dal suggerimento alla
 * giacenza.
 *
 * Verticale Procurement: `InglyRiordino` (Fase 57) sa da tempo cosa
 * riordinare; niente trasformava quel numero in un ordine vero, e
 * `SupplierIntelligence._saveOrder` non scriveva mai nello store
 * `supplier_orders` dichiarato da anni in `idb.js`. Questi test provano il
 * motore puro: un ordine si crea, si riceve (anche in parte), fa nascere i
 * movimenti di magazzino giusti, e un punteggio fornitore non si inventa da
 * un solo ordine.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, Date, isNaN });
vm.runInContext(fs.readFileSync('src/product/inventory-riordino.js', 'utf8'), contesto);
vm.runInContext(fs.readFileSync('src/product/purchase-order.js', 'utf8'), contesto);
const R = contesto.InglyRiordino;
const P = contesto.InglyPurchaseOrder;

function ordineBase(extra) {
  return Object.assign({
    supplierId: 'f1',
    supplierName: 'Laserplust',
    righe: [{ itemId: 'mdf3', itemName: 'MDF 3mm', quantity: 40, unit: 'foglio', unitCost: 2.5 }],
  }, extra || {});
}

test('validazione', async (t) => {
  await t.test('un ordine senza fornitore non è valido', () => {
    assert.equal(P.valida({ righe: [{ itemId: 'x', quantity: 1 }] }).valido, false);
  });
  await t.test('un ordine senza righe non è valido', () => {
    assert.equal(P.valida({ supplierId: 'f1', righe: [] }).valido, false);
  });
  await t.test('una riga senza quantità non è valida', () => {
    assert.equal(P.valida({ supplierId: 'f1', righe: [{ itemId: 'x' }] }).valido, false);
  });
  await t.test('un ordine completo è valido', () => {
    assert.equal(P.valida(ordineBase()).valido, true);
  });
});

test('la nascita di un ordine', async (t) => {
  await t.test('si congela: non si modifica dopo', () => {
    const o = P.crea(ordineBase());
    assert.throws(() => { o.status = 'ricevuto'; });
  });
  await t.test('nasce in stato "attesa" — lo stesso valore che la KPI della Gestione Fornitori legge già', () => {
    const o = P.crea(ordineBase());
    assert.equal(o.status, 'attesa');
  });
  await t.test('il totale è la somma delle righe, quando il costo è noto', () => {
    const o = P.crea(ordineBase());
    assert.equal(o.totale, 100);
    assert.equal(o.totaleNoto, true);
  });
  await t.test('un ordine senza fornitore non produce un record', () => {
    assert.equal(P.crea({ righe: [{ itemId: 'x', quantity: 1 }] }), null);
  });
  await t.test('senza costo unitario il totale non è noto', () => {
    const o = P.crea(ordineBase({ righe: [{ itemId: 'mdf3', quantity: 10 }] }));
    assert.equal(o.totaleNoto, false);
    assert.equal(o.totale, 0);
  });
});

test('dal suggerimento di riordino alla riga proposta', async (t) => {
  await t.test('una riga misurabile con da ordinare > 0 diventa una proposta', () => {
    const righe = R.elenco([
      { type: 'CONSUMPTION', itemId: 'mdf3', quantity: 5, timestamp: new Date(Date.now() - 5 * 86400000).toISOString() },
      { type: 'CONSUMPTION', itemId: 'mdf3', quantity: 5, timestamp: new Date(Date.now() - 10 * 86400000).toISOString() },
      { type: 'CONSUMPTION', itemId: 'mdf3', quantity: 5, timestamp: new Date(Date.now() - 15 * 86400000).toISOString() },
    ], [{ id: 'mdf3', name: 'MDF 3mm', stock: 2, unit: 'foglio' }]).righe;
    const proposte = P.daSuggerimento(righe);
    assert.equal(proposte.length, 1);
    assert.equal(proposte[0].itemId, 'mdf3');
    assert.ok(proposte[0].quantity > 0);
    assert.ok(/proposto dal riordino/.test(proposte[0].motivo));
  });
  await t.test('una riga non misurabile non genera una proposta — nessun numero inventato', () => {
    const righe = R.elenco([], [{ id: 'x', name: 'Sconosciuto', stock: 0 }]).righe;
    assert.equal(P.daSuggerimento(righe).length, 0);
  });
});

test('scadenza', async (t) => {
  await t.test('senza expectedDate dichiarata non è mai scaduto', () => {
    const o = P.crea(ordineBase());
    assert.equal(P.scaduto(o, '2026-01-01'), false);
  });
  await t.test('scaduto se la data attesa è passata e l\'ordine è ancora aperto', () => {
    const o = P.crea(ordineBase({ expectedDate: '2026-01-01' }));
    assert.equal(P.scaduto(o, '2026-02-01'), true);
    assert.equal(P.scaduto(o, '2025-12-01'), false);
  });
  await t.test('un ordine ricevuto non è mai scaduto', () => {
    const o = P.crea(ordineBase({ expectedDate: '2026-01-01' }));
    const { ordine } = P.ricevi(o, { righe: [{ itemId: 'mdf3', quantity: 40 }], quando: '2026-03-01T00:00:00.000Z' });
    assert.equal(P.scaduto(ordine, '2026-04-01'), false);
  });
});

test('ricevimento', async (t) => {
  await t.test('un ricevimento totale chiude l\'ordine e produce un movimento PURCHASE', () => {
    const o = P.crea(ordineBase());
    const { ordine, movimenti, avvisi } = P.ricevi(o, { righe: [{ itemId: 'mdf3', quantity: 40 }] });
    assert.equal(ordine.status, 'ricevuto');
    assert.equal(movimenti.length, 1);
    assert.equal(movimenti[0].type, 'PURCHASE');
    assert.equal(movimenti[0].quantity, 40);
    assert.equal(movimenti[0].referenceType, 'PURCHASE_ORDER');
    assert.equal(movimenti[0].referenceId, o.id);
    assert.equal(movimenti[0].supplierId, 'f1');
    assert.equal(avvisi.length, 0);
  });
  await t.test('un ricevimento parziale lascia l\'ordine aperto', () => {
    const o = P.crea(ordineBase());
    const { ordine, movimenti } = P.ricevi(o, { righe: [{ itemId: 'mdf3', quantity: 15 }] });
    assert.equal(ordine.status, 'ricevuto_parziale');
    assert.equal(movimenti[0].quantity, 15);
    assert.equal(ordine.righe[0].received, 15);
  });
  await t.test('due ricevimenti parziali che completano l\'ordine lo chiudono', () => {
    const o = P.crea(ordineBase());
    const p1 = P.ricevi(o, { righe: [{ itemId: 'mdf3', quantity: 15 }] });
    const p2 = P.ricevi(p1.ordine, { righe: [{ itemId: 'mdf3', quantity: 25 }] });
    assert.equal(p2.ordine.status, 'ricevuto');
    assert.equal(p2.movimenti[0].quantity, 25);
  });
  await t.test('un tentativo di ricevere più del residuo si taglia al residuo e avvisa', () => {
    const o = P.crea(ordineBase());
    const { ordine, movimenti, avvisi } = P.ricevi(o, { righe: [{ itemId: 'mdf3', quantity: 999 }] });
    assert.equal(ordine.righe[0].received, 40);
    assert.equal(movimenti[0].quantity, 40);
    assert.equal(avvisi.length, 1);
  });
  await t.test('l\'ordine originale non si modifica: ricevi restituisce un nuovo record', () => {
    const o = P.crea(ordineBase());
    P.ricevi(o, { righe: [{ itemId: 'mdf3', quantity: 40 }] });
    assert.equal(o.status, 'attesa');
  });
  await t.test('il costo del ricevimento vince su quello dell\'ordine, se dichiarato', () => {
    const o = P.crea(ordineBase());
    const { movimenti } = P.ricevi(o, { righe: [{ itemId: 'mdf3', quantity: 40, unitCost: 2.8 }] });
    assert.equal(movimenti[0].unitCost, 2.8);
  });
});

test('punteggio fornitore — solo da ordini ricevuti davvero', async (t) => {
  await t.test('nessun ordine ricevuto: non calcolabile', () => {
    const esito = P.punteggioFornitore([]);
    assert.equal(esito.calcolabile, false);
  });
  await t.test('un solo ordine ricevuto non basta per una tendenza', () => {
    const o = P.crea(ordineBase());
    const { ordine } = P.ricevi(o, { righe: [{ itemId: 'mdf3', quantity: 40 }] });
    const esito = P.punteggioFornitore([ordine]);
    assert.equal(esito.calcolabile, false);
    assert.ok(/non basta/.test(esito.motivo));
  });
  await t.test('due ordini puntuali danno puntualità 100%', () => {
    const o1raw = P.crea(ordineBase({ id: 'po1', createdAt: '2026-01-01T00:00:00.000Z', expectedDate: '2026-01-10' }));
    const o1 = P.ricevi(o1raw, { righe: [{ itemId: 'mdf3', quantity: 40 }], quando: '2026-01-08T00:00:00.000Z' }).ordine;
    const o2raw = P.crea(ordineBase({ id: 'po2', createdAt: '2026-02-01T00:00:00.000Z', expectedDate: '2026-02-10' }));
    const o2 = P.ricevi(o2raw, { righe: [{ itemId: 'mdf3', quantity: 40 }], quando: '2026-02-09T00:00:00.000Z' }).ordine;
    const esito = P.punteggioFornitore([o1, o2]);
    assert.equal(esito.calcolabile, true);
    assert.equal(esito.puntualita, 1);
    assert.ok(esito.tempoConsegnaMedioGiorni > 0);
  });
  await t.test('senza date attese dichiarate la puntualità è N/D, non un numero inventato', () => {
    const o1raw = P.crea(ordineBase({ id: 'po1', createdAt: '2026-01-01T00:00:00.000Z' }));
    const o1 = P.ricevi(o1raw, { righe: [{ itemId: 'mdf3', quantity: 40 }], quando: '2026-01-05T00:00:00.000Z' }).ordine;
    const o2raw = P.crea(ordineBase({ id: 'po2', createdAt: '2026-02-01T00:00:00.000Z' }));
    const o2 = P.ricevi(o2raw, { righe: [{ itemId: 'mdf3', quantity: 40 }], quando: '2026-02-05T00:00:00.000Z' }).ordine;
    const esito = P.punteggioFornitore([o1, o2]);
    assert.equal(esito.puntualita, null);
    assert.ok(esito.motivoPuntualita);
  });
});

test('confronto fornitori', async (t) => {
  await t.test('un fornitore senza storia resta "dati insufficienti", non sparisce', () => {
    const esito = P.confronta([{ id: 'f1', name: 'Nuovo' }], {});
    assert.equal(esito.righe.length, 1);
    assert.equal(esito.righe[0].punteggio.calcolabile, false);
    assert.equal(esito.dataInsufficienti, 1);
  });
  await t.test('un fornitore con storia reale viene prima di uno senza', () => {
    const o1raw = P.crea(ordineBase({ id: 'po1', supplierId: 'f1', createdAt: '2026-01-01T00:00:00.000Z', expectedDate: '2026-01-10' }));
    const o1 = P.ricevi(o1raw, { righe: [{ itemId: 'mdf3', quantity: 40 }], quando: '2026-01-08T00:00:00.000Z' }).ordine;
    const o2raw = P.crea(ordineBase({ id: 'po2', supplierId: 'f1', createdAt: '2026-02-01T00:00:00.000Z', expectedDate: '2026-02-10' }));
    const o2 = P.ricevi(o2raw, { righe: [{ itemId: 'mdf3', quantity: 40 }], quando: '2026-02-09T00:00:00.000Z' }).ordine;
    const esito = P.confronta(
      [{ id: 'f1', name: 'Con storia' }, { id: 'f2', name: 'Senza storia' }],
      { f1: [o1, o2], f2: [] }
    );
    assert.equal(esito.righe[0].fornitoreId, 'f1');
    assert.equal(esito.confrontabili, 1);
    assert.equal(esito.dataInsufficienti, 1);
  });
});
