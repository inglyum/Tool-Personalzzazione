/**
 * material-cost.test.mjs — il costo che si difende davanti a una fattura.
 *
 * L'audit di Fase 1 ha misurato che la differenza fra INGLY e lo slicer sul
 * caso di calibrazione era € 2,46, e che quei € 2,46 erano interamente il
 * prezzo del filamento: € 24,00/kg contro € 15,52/kg. Quel 24 era il valore
 * predefinito di un campo, non un prezzo pagato da qualcuno.
 *
 * Questi test tengono ferme le tre regole che chiudono quel difetto: il costo
 * si calcola dalla fattura, non si inventa mai, e una volta preventivato non
 * cambia più.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, String, Date });
ctx.window = ctx; ctx.globalThis = ctx;
for (const f of ['inventory-ledger.js', 'inventory-cost-resolver.js', 'material-cost.js']) {
  vm.runInContext(fs.readFileSync('src/product/' + f, 'utf8'), ctx);
}
const M = ctx.InglyMaterialCost;
const L = ctx.InglyInventoryLedger;
const vicino = (a, b, t = 0.0001) => Math.abs(a - b) < t;

/* ── Il costo reale di un acquisto ──────────────────────────────────────── */

test('il costo reale comprende la spedizione, perché la spedizione non si recupera', () => {
  /* Una bobina da 1 kg pagata 20 € con 7 € di corriere non costa 20 €/kg. */
  const r = M.costoReale({ imponibile: 20, spedizione: 7, quantita: 1, unit: 'bobina' });
  assert.ok(r.disponibile);
  assert.ok(vicino(r.costoUnitario, 27), `€${r.costoUnitario}`);
  assert.equal(r.unita, 'kg');
  assert.ok(vicino(r.composizione.incidenzaSpedizionePct, 700 / 27, 0.01),
    'il trasporto pesa il 26% di questo acquisto e va visto');
});

test("l'IVA non entra nel costo, e uno scorporo si dichiara", () => {
  const netto = M.costoReale({ imponibile: 100, quantita: 5, unit: 'kg' });
  const lordo = M.costoReale({ lordo: 122, ivaPct: 22, quantita: 5, unit: 'kg' });
  assert.ok(vicino(netto.costoUnitario, lordo.costoUnitario, 0.0001),
    '122 € lordi al 22% sono gli stessi 100 € imponibili');
  assert.equal(lordo.ivaScorporata, true);
  assert.equal(netto.ivaScorporata, false);
  assert.ok(lordo.avvisi.some((a) => /aliquota/.test(a)));
  assert.equal(lordo.confidence, 'declared');
  assert.equal(netto.confidence, 'verified');
});

test('senza quantità non si restituisce zero: si dice che non si sa', () => {
  const r = M.costoReale({ imponibile: 50, quantita: 0 });
  assert.equal(r.disponibile, false);
  assert.equal(r.costoUnitario, null, 'zero sarebbe un preventivo sbagliato che sembra giusto');
});

test('senza importo non si inventa un prezzo', () => {
  const r = M.costoReale({ quantita: 3, unit: 'kg' });
  assert.equal(r.disponibile, false);
  assert.equal(r.costoUnitario, null);
});

test('il costo si esprime anche nell\'unità in cui si consuma', () => {
  /* La fattura parla di chili, il preventivo di grammi: la conversione sta
     qui una volta, non in ogni preventivatore con un 1000 scritto a mano. */
  const r = M.costoReale({ imponibile: 15.99, quantita: 1, unit: 'bobina' });
  assert.equal(r.unitaConsumo, 'g');
  assert.ok(vicino(r.costoConsumo, 0.01599));
  assert.ok(vicino(r.costoConsumo * 290, 4.6371, 0.0001),
    '290 g a €15,99/kg fanno €4,64 — il numero che lo slicer avrebbe dato');
});

test('resine, pannelli e pezzi hanno ciascuno la propria unità', () => {
  assert.equal(M.costoReale({ imponibile: 22, quantita: 1, unit: 'bottiglia' }).unitaConsumo, 'ml');
  assert.equal(M.costoReale({ imponibile: 3, quantita: 1, unit: 'foglio' }).unitaConsumo, 'cm²');
  assert.equal(M.costoReale({ imponibile: 0.15, quantita: 100, unit: 'pz' }).unitaConsumo, 'pz');
});

test("l'unità dichiarata batte quella dedotta", () => {
  const r = M.costoReale({ imponibile: 10, quantita: 1, unit: 'bobina', costUnit: 'pz' });
  assert.equal(r.unita, 'pz', 'chi dichiara l\'unità sa più della deduzione');
});

/* ── Lo storico ─────────────────────────────────────────────────────────── */

const acquisti = [
  L.crea({ type: 'PURCHASE', itemId: 'pla', itemName: 'PLA', unit: 'kg', quantity: 5, unitCost: 24,
    referenceType: 'PURCHASE_ORDER', referenceId: 'a1', timestamp: '2026-01-10T09:00:00.000Z' }, 0),
  L.crea({ type: 'PURCHASE', itemId: 'pla', itemName: 'PLA', unit: 'kg', quantity: 10, unitCost: 20,
    referenceType: 'PURCHASE_ORDER', referenceId: 'a2', timestamp: '2026-04-02T09:00:00.000Z' }, 5),
  L.crea({ type: 'PURCHASE', itemId: 'pla', itemName: 'PLA', unit: 'kg', quantity: 10, unitCost: 15.99,
    referenceType: 'PURCHASE_ORDER', referenceId: 'a3', timestamp: '2026-08-01T09:00:00.000Z' }, 15),
];
const CHIAVE = acquisti[0].itemId;   // il registro identifica per itemId

test('lo storico distingue ultimo, medio ponderato, minimo e massimo', () => {
  const s = M.storico(acquisti, CHIAVE);
  assert.ok(s.disponibile);
  assert.equal(s.acquisti, 3);
  assert.ok(vicino(s.ultimo, 15.99));
  assert.ok(vicino(s.minimo, 15.99));
  assert.ok(vicino(s.massimo, 24));
  /* (5×24 + 10×20 + 10×15,99) ÷ 25 = 19,196 — non la media dei tre prezzi. */
  assert.ok(vicino(s.medio, (5 * 24 + 10 * 20 + 10 * 15.99) / 25, 0.0001), `€${s.medio}`);
  assert.ok(Math.abs(s.medio - (24 + 20 + 15.99) / 3) > 0.5,
    'la media semplice darebbe €19,996: comprare quantità diverse non fa media semplice');
});

test('lo storico dice di quanto è cambiato il prezzo', () => {
  const s = M.storico(acquisti, CHIAVE);
  assert.ok(vicino(s.variazionePct, ((15.99 - 24) / 24) * 100, 0.01),
    'da €24 a €15,99 è un −33,4%: chi rifà un preventivo di gennaio deve saperlo');
});

test('senza acquisti lo storico è vuoto, non zero', () => {
  const s = M.storico([], 'items:mai-comprato');
  assert.equal(s.disponibile, false);
  assert.equal(s.medio, null);
});

/* ── Il costo per il preventivo ─────────────────────────────────────────── */

test('il preventivo prende il costo dal registro, con la politica dichiarata', () => {
  const r = M.perPreventivo({ movimenti: acquisti, itemKey: CHIAVE, politica: 'media',
    articolo: { unit: 'kg' } });
  assert.ok(r.disponibile);
  assert.equal(r.source, 'registro');
  assert.equal(r.confidence, 'verified');
  assert.ok(vicino(r.costoUnitario, (5 * 24 + 10 * 20 + 10 * 15.99) / 25, 0.01));
  assert.ok(vicino(r.costoConsumo * 290, r.costoUnitario * 0.290, 0.0001));
});

test('senza materiale selezionato si dice cosa fare, non si sceglie al posto dell\'utente', () => {
  const r = M.perPreventivo({ movimenti: acquisti });
  assert.equal(r.disponibile, false);
  assert.equal(r.costoUnitario, null);
  assert.equal(r.confidence, 'missing');
  assert.ok(/a mano/.test(r.cosaFare), 'deve indicare la via d\'uscita');
});

test('un materiale mai acquistato non eredita il costo di un altro', () => {
  const r = M.perPreventivo({ movimenti: acquisti, itemKey: 'petg' });
  assert.equal(r.disponibile, false);
  assert.equal(r.costoUnitario, null);
});

/* ── Il congelamento ────────────────────────────────────────────────────── */

test('un preventivo congela il costo e la sua spiegazione', () => {
  const r = M.perPreventivo({ movimenti: acquisti, itemKey: CHIAVE, articolo: { unit: 'kg' } });
  const f = M.congela(r, { quando: '2026-08-30T10:00:00.000Z' });
  assert.ok(vicino(f.materialCostAtQuote, r.costoUnitario));
  assert.equal(f.source, 'registro');
  assert.equal(f.confidence, 'verified');
  assert.equal(f.frozenAt, '2026-08-30T10:00:00.000Z');
  assert.throws(() => { f.materialCostAtQuote = 999; }, 'il blocco congelato non si riscrive');
});

test('anche un costo assente si congela: il preventivo ricorda di non averlo avuto', () => {
  const f = M.congela(M.perPreventivo({ movimenti: [], itemKey: 'items:x' }));
  assert.equal(f.materialCostAtQuote, null);
  assert.equal(f.confidence, 'missing');
  assert.ok(f.motivo, 'deve restare scritto perché mancava');
});

test('il confronto dice se il materiale è rincarato, senza correggere niente', () => {
  const vecchio = M.congela({ disponibile: true, costoUnitario: 24, unitaLabel: '€/kg',
    source: 'registro', confidence: 'verified', itemKey: CHIAVE });
  const adesso = M.perPreventivo({ movimenti: acquisti, itemKey: CHIAVE, politica: 'ultimo',
    articolo: { unit: 'kg' } });
  const c = M.confronta(vecchio, adesso);
  assert.ok(c.confrontabile);
  assert.equal(c.verso, 'ribassato');
  assert.ok(vicino(c.congelato, 24), 'il valore congelato non si tocca');
  assert.ok(vicino(c.corrente, 15.99, 0.01));
});

test('il caso di calibrazione: comprando a €15,99 il conto torna da solo', () => {
  /* La prova che il difetto misurato in Fase 1 era un prezzo e non una
     formula: con il costo reale del registro, il materiale di 290 g scende da
     €6,96 a €4,64 — e la differenza con lo slicer diventa nove centesimi. */
  const soloUltimo = M.perPreventivo({ movimenti: acquisti, itemKey: CHIAVE, politica: 'ultimo',
    articolo: { unit: 'kg' } });
  const materiale290 = soloUltimo.costoConsumo * 290;
  assert.ok(vicino(materiale290, 4.6371, 0.001), `€${materiale290.toFixed(4)}`);
  assert.ok(Math.abs(materiale290 - 4.50) < 0.15,
    'contro i €4,50 dello slicer restano 14 centesimi, non €2,46');
});
