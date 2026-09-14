/**
 * order-sales-service.test.mjs — un solo percorso, e nessuna vendita a zero.
 *
 * L'audit ha misurato cinque percorsi Order→Sale con quattro formule diverse.
 * Lo stesso ordine — netto 150, lordo 183, costo 60 — diventava una vendita da
 * 0 su quattro percorsi su cinque, perché l'ordine nato dal flusso canonico
 * non ha `value`: ha `total`, `totalNet`, `totalGross`, `totalCost`.
 *
 * Il test che conta: quell'ordine, qui, vale 150 netti e 183 lordi.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['cost-engine.js', 'order-snapshot.js', 'order-fields.js',
                 'order-economics.js', 'production-model.js', 'order-sales-service.js']) {
  vm.runInContext(fs.readFileSync('src/product/' + f, 'utf8'), sandbox);
}
const S = sandbox.window.InglyOrderSales;
const uguali = (a, b, m) => assert.equal(Array.from(a || []).join('|'), b.join('|'), m);

/** L'ordine come lo scrive `InglyQuoteToOrder.invia()`. */
const CANONICO = {
  id: 5001, quoteId: 5001, name: 'Targhe laser', clientId: 77, clientName: 'Rossi',
  total: 150, totalNet: 150, totalGross: 183, totalCost: 60,
  economic: { revenueNet: 150, revenueGross: 183, costTotal: 60 },
  production: { primaryTechnology: 'laser', technologies: ['laser', 'uv'], isMixed: true, operations: [] },
};

test('il servizio esiste con entrambi i nomi', () => {
  assert.ok(S);
  assert.equal(sandbox.window.OrderSalesService, S, 'un solo sistema, due nomi');
  ['createSaleFromOrder', 'syncSaleFromOrder', 'getOrderRevenue', 'getSaleRevenue',
   'getProductionClassification'].forEach((f) => assert.equal(typeof S[f], 'function', f + ' manca'));
});

/* ── IL TEST OBBLIGATORIO DEL MANDATO ───────────────────────────────────── */

test('ordine net 150 / gross 183 / cost 60 → vendita coerente', () => {
  const e = S.createSaleFromOrder(CANONICO);
  assert.equal(e.ok, true, e.motivo || '');
  assert.equal(e.vendita.netAmount, 150, 'netto');
  assert.equal(e.vendita.grossAmount, 183, 'lordo');
  assert.equal(e.vendita.totalCost, 60, 'costo di produzione');
  assert.equal(e.vendita.margine, 90, 'profitto');
  assert.equal(Math.round(e.vendita.marginePct), 60, 'margine %');
});

test('e `amount` resta il netto, perché è quello che le schermate leggono', () => {
  assert.equal(S.createSaleFromOrder(CANONICO).vendita.amount, 150);
});

test('netto e lordo non si confondono mai', () => {
  const v = S.createSaleFromOrder(CANONICO).vendita;
  assert.notEqual(v.netAmount, v.grossAmount);
});

/* ── La regola: nessuna vendita a zero ──────────────────────────────────── */

test('un ordine senza ricavo leggibile NON genera una vendita a zero', () => {
  /* Uno zero scritto qui diventa un buco nel fatturato che nessuno ritrova. */
  const e = S.createSaleFromOrder({ id: 9, name: 'Ordine muto' });
  assert.equal(e.ok, false);
  assert.equal(e.vendita, null);
  assert.match(e.motivo, /non dichiara un ricavo leggibile/);
});

test('e nemmeno un ordine a importo zero', () => {
  const e = S.createSaleFromOrder({ id: 9, total: 0, totalNet: 0 });
  assert.equal(e.ok, false);
  assert.match(e.motivo, /nasconderebbe il problema/);
});

test('un ordine senza id non genera niente', () => {
  assert.equal(S.createSaleFromOrder({ total: 150 }).ok, false);
  assert.equal(S.createSaleFromOrder(null).ok, false);
});

/* ── I legacy continuano a funzionare ───────────────────────────────────── */

test('un ordine legacy con `value` genera comunque una vendita', () => {
  const e = S.createSaleFromOrder({ id: 6001, value: 183, grossPrice: 183, total: 150, totalCost: 60 });
  assert.equal(e.ok, true);
  assert.equal(e.vendita.netAmount, 150, '`total` è il netto');
  assert.equal(e.vendita.grossAmount, 183);
});

test('un ordine con solo `value` funziona, e la vendita lo dichiara', () => {
  const e = S.createSaleFromOrder({ id: 6002, value: 200 });
  assert.equal(e.ok, true);
  assert.equal(e.vendita.netAmount, 200);
  assert.ok(e.avvisi.some((a) => /non dice se è netto o lordo/.test(a)),
    'un campo ambiguo va dichiarato: ' + e.avvisi.join(' · '));
});

test('senza costo la vendita non porta un margine inventato', () => {
  const e = S.createSaleFromOrder({ id: 6003, totalNet: 150 });
  assert.equal(e.ok, true);
  assert.equal(e.vendita.totalCost, null);
  assert.equal(e.vendita.margine, null);
  assert.ok(e.avvisi.some((a) => /costo di produzione non dichiarato/.test(a)));
});

test('senza lordo dichiarato la vendita lo dice, invece di inventare l IVA', () => {
  const e = S.createSaleFromOrder({ id: 6004, totalNet: 150, totalCost: 60, economic: { costTotal: 60 } });
  assert.equal(e.vendita.grossAmount, 150);
  assert.ok(e.avvisi.some((a) => /lordo non è dichiarato/.test(a)));
});

/* ── La tecnologia si eredita, non si richiede ──────────────────────────── */

test('la vendita eredita la tecnologia dell ordine', () => {
  const v = S.createSaleFromOrder(CANONICO).vendita;
  assert.equal(v.productionTechnology, 'laser');
  uguali(v.productionTechnologies, ['laser', 'uv']);
  assert.equal(v.isMixedProduction, true);
});

test('anche da un ordine legacy che la dichiara in un campo storico', () => {
  const v = S.createSaleFromOrder({ id: 6005, totalNet: 100, technology: 'print3d' }).vendita;
  assert.equal(v.productionTechnology, '3d');
  assert.equal(v.isMixedProduction, false);
});

test('e un ordine che non la dice non se la inventa', () => {
  const v = S.createSaleFromOrder({ id: 6006, totalNet: 100 }).vendita;
  assert.equal(v.productionTechnology, null);
  assert.equal(v.production, null);
});

/* ── La distinta economica arriva fino in fondo ─────────────────────────── */

test('snapshot e distinta viaggiano con la vendita', () => {
  const v = S.createSaleFromOrder(Object.assign({}, CANONICO, {
    economicSnapshot: { stato: 'SNAPSHOT', totals: { totalNet: 150 } },
    costBreakdown: { voci: [{ n: 'Materiale', v: 20 }] },
    pricingSnapshot: { voci: [] },
  })).vendita;
  assert.ok(v.economicSnapshot, 'snapshot perso');
  assert.ok(v.costBreakdown, 'distinta persa');
  assert.ok(v.pricingSnapshot, 'preventivato perso');
});

test('i legami con ordine e preventivo restano', () => {
  const v = S.createSaleFromOrder(CANONICO).vendita;
  assert.equal(v.orderId, 5001);
  assert.equal(v.fromOrderId, 5001);
  assert.equal(v.quoteId, 5001);
});

/* ── Il consuntivo sostituisce il costo, mai il prezzo ──────────────────── */

test('il consuntivo cambia il costo e non il ricavo', () => {
  const v = S.createSaleFromOrder(CANONICO, { consuntivo: { costoTotale: 72, margine: 78 } }).vendita;
  assert.equal(v.netAmount, 150, 'il prezzo promesso al cliente non si tocca mai');
  assert.equal(v.totalCost, 72);
  assert.equal(v.margine, 78);
  assert.equal(v.costoConsuntivo, true);
});

/* ── Il riallineamento non distrugge quello che è della vendita ─────────── */

test('sincronizzare non cancella un incasso', () => {
  const esistente = { id: 4242, status: 'pagato', paidAt: '2026-03-01', date: '2026-02-01',
    channel: 'Etsy', invoiceNumber: 'F-12' };
  const e = S.syncSaleFromOrder(CANONICO, esistente);
  assert.equal(e.ok, true);
  assert.equal(e.vendita.id, 4242, 'la vendita resta la stessa');
  assert.equal(e.vendita.status, 'pagato', 'un ordine che cambia non può cancellare un pagamento');
  assert.equal(e.vendita.paidAt, '2026-03-01');
  assert.equal(e.vendita.invoiceNumber, 'F-12');
  assert.equal(e.vendita.channel, 'Etsy');
  assert.equal(e.vendita.netAmount, 150, 'gli importi invece si riallineano');
});

/* ── Le letture ─────────────────────────────────────────────────────────── */

test('getOrderRevenue dice netto, lordo e provenienza', () => {
  const r = S.getOrderRevenue(CANONICO);
  assert.equal(r.netto, 150);
  assert.equal(r.lordo, 183);
  assert.equal(r.noto, true);
  assert.equal(r.fonteNetto, 'economic.revenueNet');
});

test('getSaleRevenue legge la vendita con la stessa semantica', () => {
  const v = S.createSaleFromOrder(CANONICO).vendita;
  const r = S.getSaleRevenue(v);
  assert.equal(r.netto, 150);
  assert.equal(r.lordo, 183);
  assert.equal(r.noto, true);
});

test('e una vendita vecchia con solo `amount` resta leggibile', () => {
  const r = S.getSaleRevenue({ amount: 99 });
  assert.equal(r.netto, 99);
  assert.equal(r.lordoDichiarato, false);
});

test('getProductionClassification non chiede niente a nessuno', () => {
  const c = S.getProductionClassification(CANONICO);
  assert.equal(c.isMixed, true);
  assert.match(c.etichetta, /Laser/);
  assert.match(c.etichetta, /UV/);
});
