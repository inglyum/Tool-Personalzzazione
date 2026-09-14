/**
 * economia-canonica.test.mjs — una semantica sola per «quanto vale».
 *
 * L'audit ha misurato sedici nomi per lo stesso concetto, e la conseguenza:
 * lo stesso ordine — netto 150, lordo 183, costo 60 — diventava una vendita da
 * 0, 150 o 183 a seconda del pulsante premuto. Quattro percorsi su cinque
 * leggevano `value` per primo, e l'ordine nato dal percorso canonico `value`
 * non ce l'ha: ha `total`, `totalNet`, `totalGross`, `totalCost`.
 *
 * Qui si fissa la semantica: ogni funzione dice **da dove** ha preso il numero,
 * e quando non può dirlo lo dichiara invece di indovinare.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('src/product/order-snapshot.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('src/product/order-economics.js', 'utf8'), sandbox);
const E = sandbox.window.InglyOrderEconomics;

/** L'ordine come lo scrive `InglyQuoteToOrder.invia()`: quello che l'audit ha
    trovato valere zero su quattro percorsi su cinque. */
const CANONICO = {
  id: 1, quoteId: 1, name: 'Ordine canonico',
  total: 150, totalNet: 150, totalGross: 183, totalCost: 60,
  economic: { revenueNet: 150, revenueGross: 183, costTotal: 60 },
};

/** L'ordine come lo scrive `orders/index.js`: `value` = lordo. */
const LEGACY = { id: 2, name: 'Ordine legacy', value: 183, grossPrice: 183, total: 150, totalCost: 60 };

test('le sei funzioni canoniche esistono', () => {
  ['getOrderRevenue', 'getOrderRevenueNet', 'getOrderRevenueGross',
   'getOrderProductionCost', 'getOrderProfit', 'getOrderMargin']
    .forEach((f) => assert.equal(typeof E[f], 'function', f + ' manca'));
});

/* ── Il caso che era rotto ───────────────────────────────────────────────── */

test("l'ordine canonico non vale più zero", () => {
  const r = E.getOrderRevenueNet(CANONICO);
  assert.equal(r.noto, true, r.motivo || '');
  assert.equal(r.valore, 150);
});

test('e il suo lordo è il lordo, non il netto', () => {
  assert.equal(E.getOrderRevenueGross(CANONICO).valore, 183);
});

test('netto e lordo non si confondono mai', () => {
  assert.notEqual(E.getOrderRevenueNet(CANONICO).valore, E.getOrderRevenueGross(CANONICO).valore);
});

test('il ricavo senza aggettivi è il netto', () => {
  assert.equal(E.getOrderRevenue(CANONICO).valore, E.getOrderRevenueNet(CANONICO).valore);
});

/* ── La provenienza si dichiara sempre ──────────────────────────────────── */

test('ogni numero dice da dove viene', () => {
  assert.equal(E.getOrderRevenueNet(CANONICO).fonte, 'economic.revenueNet');
  assert.equal(E.getOrderRevenueGross(CANONICO).fonte, 'economic.revenueGross');
  assert.equal(E.getOrderProductionCost(CANONICO).fonte, 'economic.costTotal');
});

test('la precedenza è economic → campi → snapshot', () => {
  assert.equal(E.getOrderRevenueNet({ totalNet: 99 }).fonte, 'totalNet');
  assert.equal(E.getOrderRevenueNet({
    economicSnapshot: { stato: 'SNAPSHOT', totals: { totalNet: 77 } },
  }).fonte, 'snapshot.totalNet');
});

test('uno snapshot non congelato non conta', () => {
  const r = E.getOrderRevenueNet({ economicSnapshot: { stato: 'PENDING', totals: { totalNet: 77 } } });
  assert.equal(r.noto, false);
});

/* ── `value`: ambiguo, e dichiarato tale ────────────────────────────────── */

test('`value` si legge, ma si dichiara ambiguo', () => {
  /* Misurato nel codice che lo scriveva: in un punto è `grossPrice || total`,
     in un altro un prezzo netto. Non è recuperabile quale dei due sia. */
  const r = E.getOrderRevenueNet({ value: 183 });
  assert.equal(r.valore, 183);
  assert.equal(r.ambiguo, true);
  assert.equal(r.fonte, 'value');
});

test("e non si inventa un'IVA da togliergli", () => {
  assert.equal(E.getOrderRevenueNet({ value: 183 }).valore, 183, 'nessuno scorporo indovinato');
});

test('un ordine legacy resta leggibile', () => {
  assert.equal(E.getOrderRevenueNet(LEGACY).valore, 150, 'total è il netto');
  assert.equal(E.getOrderRevenueGross(LEGACY).valore, 183, 'grossPrice è il lordo');
  assert.equal(E.getOrderProductionCost(LEGACY).valore, 60);
});

test('il lordo mancante non si ricostruisce dal netto', () => {
  const g = E.getOrderRevenueGross({ totalNet: 150 });
  assert.equal(g.noto, false, 'un lordo ricostruito è un numero mai esistito');
  assert.equal(g.valore, 150, 'si mostra il netto');
  assert.match(g.motivo, /IVA non si ricostruisce/);
});

/* ── Profitto e margine ─────────────────────────────────────────────────── */

test('profitto = ricavo netto − costo', () => {
  const p = E.getOrderProfit(CANONICO);
  assert.equal(p.noto, true);
  assert.equal(p.valore, 90);
});

test('e il margine è sul netto', () => {
  const m = E.getOrderMargin(CANONICO);
  assert.equal(m.noto, true);
  assert.equal(Math.round(m.valore), 60);
});

test('senza costo non esiste profitto', () => {
  /* Un profitto calcolato su un costo mancante è il ricavo travestito: è il
     modo in cui un laboratorio crede di guadagnare. */
  const p = E.getOrderProfit({ totalNet: 150 });
  assert.equal(p.noto, false);
  assert.equal(p.valore, null);
  assert.match(p.motivo, /costo di produzione non dichiarato/);
});

test('senza ricavo nemmeno', () => {
  const p = E.getOrderProfit({ totalCost: 60 });
  assert.equal(p.noto, false);
  assert.match(p.motivo, /ricavo non dichiarato/);
});

test('un margine su ricavo zero non è definito', () => {
  const m = E.getOrderMargin({ totalNet: 0, totalCost: 0 });
  assert.equal(m.noto, false);
});

test('un ordine in perdita resta in perdita', () => {
  const p = E.getOrderProfit({ totalNet: 100, totalCost: 150, economic: { costTotal: 150 } });
  assert.equal(p.valore, -50);
  assert.equal(Math.round(E.getOrderMargin({ totalNet: 100, economic: { costTotal: 150 } }).valore), -50);
});

/* ── I bordi ────────────────────────────────────────────────────────────── */

test('un ordine vuoto non lancia e non inventa', () => {
  assert.equal(E.getOrderRevenueNet({}).noto, false);
  assert.equal(E.getOrderProductionCost({}).noto, false);
  assert.equal(E.getOrderProfit({}).valore, null);
  assert.equal(E.getOrderMargin({}).valore, null);
});

test('niente al posto dell ordine nemmeno', () => {
  assert.equal(E.getOrderRevenueNet(null).noto, false);
  assert.equal(E.getOrderRevenueGross(undefined).noto, false);
  assert.equal(E.getOrderProfit(null).noto, false);
});

test('le funzioni storiche continuano a rispondere', () => {
  assert.equal(typeof E.ricavoNettoOrdine, 'function');
  assert.equal(typeof E.costoOrdine, 'function');
  assert.equal(E.ricavoNettoOrdine(CANONICO), 150);
});
