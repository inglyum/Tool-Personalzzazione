/**
 * marketplace-profiles.test.mjs — le commissioni di canale nello Smart
 * Quoter 3D.
 *
 * `InglyCostEngine.prezzo()` separava già commissione di marketplace,
 * commissione di pagamento e spedizione reale vs addebitata: nessuna vista
 * gliele passava. Questo file verifica che `InglyMarketplaces` fornisca le
 * tre chiavi giuste al motore, che l'override manuale vinca sempre sul
 * profilo, e che la vista (`InglyQuoter3DView`) le colleghi davvero — non
 * solo che esistano da qualche parte.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, String, Date, window: undefined });
ctx.window = ctx;
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('src/product/marketplace-profiles.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('src/product/quoter3d-view.js', 'utf8'), ctx);
const E = ctx.InglyCostEngine;
const MP = ctx.InglyMarketplaces;
const V = ctx.InglyQuoter3DView;

const vicino = (a, b, t = 0.01) => Math.abs(a - b) < t;

test('ogni profilo ha aliquote plausibili: non negative, non oltre il 100%', () => {
  for (const p of MP.elenco()) {
    assert.ok(p.commissioneMarketplacePct >= 0 && p.commissioneMarketplacePct < 100, p.id + ': marketplace ' + p.commissioneMarketplacePct);
    assert.ok(p.commissionePagamentoPct >= 0 && p.commissionePagamentoPct < 100, p.id + ': pagamento ' + p.commissionePagamentoPct);
    assert.ok(p.commissionePagamentoFissa >= 0, p.id + ': fissa ' + p.commissionePagamentoFissa);
    assert.ok(p.nota && p.nota.length > 20, p.id + ': nota assente o troppo vaga');
    assert.equal(p.fonte, 'dichiarata', p.id + ': nessun profilo deve dichiararsi "verificato" da solo');
  }
});

test('vendita diretta non ha commissione di canale, solo il gateway di pagamento', () => {
  const d = MP.profilo('diretto');
  assert.equal(d.commissioneMarketplacePct, 0);
  assert.ok(d.commissionePagamentoPct > 0, 'un gateway di pagamento costa comunque qualcosa');
});

test('un id sconosciuto ripiega su "diretto", non su un errore', () => {
  const r = MP.profilo('non-esiste');
  assert.equal(r.id, 'diretto');
});

test('opzioniPrezzo: senza override, restituisce esattamente il profilo', () => {
  const o = MP.opzioniPrezzo('etsy');
  const etsy = MP.profilo('etsy');
  assert.equal(o.commissioneMarketplacePct, etsy.commissioneMarketplacePct);
  assert.equal(o.commissionePagamentoPct, etsy.commissionePagamentoPct);
  assert.equal(o.commissionePagamentoFissa, etsy.commissionePagamentoFissa);
});

test('opzioniPrezzo: un override manuale vince sempre sul profilo, chiave per chiave', () => {
  const o = MP.opzioniPrezzo('etsy', { commissioneMarketplacePct: 3 });
  assert.equal(o.commissioneMarketplacePct, 3, 'la chiave sovrascritta cambia');
  assert.equal(o.commissionePagamentoPct, MP.profilo('etsy').commissionePagamentoPct, 'le altre restano quelle del profilo');
});

test('un venditore Etsy: le commissioni si calcolano sul lordo, non sul netto, e non toccano l\'IVA', () => {
  /* Prezzo netto 20 €, IVA 22% → lordo 24,40 €. Etsy: 6,5% marketplace +
     4% pagamento + 0,30 € fissi, tutti sul lordo. */
  const p = E.prezzo(10, Object.assign(
    { strategia: 'fisso', prezzoFisso: 20, ivaPct: 22 },
    MP.opzioniPrezzo('etsy'),
  ));
  assert.ok(vicino(p.lordo, 24.40), 'lordo €' + p.lordo.toFixed(4));
  const atteseCommissioni = 24.40 * 0.065 + 24.40 * 0.04 + 0.30;
  assert.ok(vicino(p.commissioni, atteseCommissioni), 'commissioni €' + p.commissioni.toFixed(4) + ' attese €' + atteseCommissioni.toFixed(4));
  assert.ok(vicino(p.commissioniDettaglio.marketplace, 24.40 * 0.065));
  assert.ok(vicino(p.commissioniDettaglio.pagamentoPct, 24.40 * 0.04));
  assert.ok(vicino(p.commissioniDettaglio.pagamentoFissa, 0.30));
  /* L'IVA resta 22% del netto: le commissioni di canale non la toccano. */
  assert.ok(vicino(p.iva, 20 * 0.22));
  /* Il profitto lordo (prima del canale) è netto − costo; l'operativo è
     quello che resta dopo aver pagato Etsy. */
  assert.ok(vicino(p.profittoLordo, 10));
  assert.ok(vicino(p.profittoOperativo, 10 - atteseCommissioni));
});

test('spedizione: chi addebita meno di quanto spende perde la differenza sul profitto operativo, non su quello lordo', () => {
  const p = E.prezzo(10, {
    strategia: 'fisso', prezzoFisso: 20, ivaPct: 0,
    spedizioneCosto: 9, spedizioneAddebitata: 6,
  });
  assert.ok(vicino(p.margineSpedizione, -3), 'margine spedizione €' + p.margineSpedizione.toFixed(4));
  assert.ok(vicino(p.profittoLordo, 10), 'la spedizione non deve toccare il profitto lordo');
  assert.ok(vicino(p.profittoOperativo, 10 - 3), 'ma deve togliere 3 € da quello operativo');
});

/* ── La vista: non basta che il motore sappia farlo, deve arrivarci ────── */

const INGRESSO = {
  tecnologia: 'print3d', grams: 290, hours: 9.95, qty: 1,
  spoolPrice: 20, spoolGrams: 1000,
  kwhPrice: 0.30, watt: 256, dutyCycle: 0.6,
  machinePrice: 400, machineLifeHours: 5000,
  laborPerHour: 18, setupMin: 15,
};

test('la vista: senza marketplace, il canale non compare (commissioni a zero)', () => {
  const r = V.calcola(INGRESSO, { modalita: 'completo', marginePct: 40 });
  assert.equal(r.indisponibile, false);
  assert.equal(r.commissioni, 0);
  assert.ok(vicino(r.profittoOperativo, r.profitto), 'senza commissioni operativo e lordo coincidono');
});

test('la vista: con marketplace "etsy", le commissioni arrivano fino al risultato', () => {
  const r = V.calcola(INGRESSO, { modalita: 'completo', marginePct: 40, marketplace: 'etsy' });
  assert.equal(r.indisponibile, false);
  assert.ok(r.commissioni > 0, 'le commissioni devono essere maggiori di zero');
  assert.equal(r.marketplaceLabel, 'Etsy');
  assert.ok(r.profittoOperativo < r.profitto, 'il profitto operativo deve essere più basso di quello lordo, mai più alto');
});

test('la vista: un override manuale passato dalla UI vince sul profilo Etsy', () => {
  const r = V.calcola(INGRESSO, {
    modalita: 'completo', marginePct: 40, marketplace: 'etsy',
    commissioneMarketplacePct: 1,
  });
  assert.equal(r.commissioniDettaglio.marketplace, r.prezzoLordo * 0.01);
});
