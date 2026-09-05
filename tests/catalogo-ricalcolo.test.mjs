/**
 * catalogo-ricalcolo.test.mjs — CAT-001…011
 *
 * Il catalogo riscriveva i prezzi al clic: premuto il pulsante, il prezzo era
 * già cambiato, senza anteprima dell'insieme e senza modo di tornare
 * indietro.
 *
 * La domanda di questi test è una sola: **il modulo scrive qualcosa?** Deve
 * preparare una proposta e restituirla. Se scrive, annullare è impossibile.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({
  Math, JSON, Object, Array, Date, Number, String, parseFloat, isFinite, isNaN,
});
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), contesto);
vm.runInContext(fs.readFileSync('src/product/catalog-recalc.js', 'utf8'), contesto);
const R = contesto.InglyCatalogRicalcolo;

const prodotti = [
  { id: 1, name: 'Targa piccola', costPrice: 10, salePrice: 12 },   // margine 16,7%
  { id: 2, name: 'Portachiavi', costPrice: 2, salePrice: 8 },       // margine 75%
  { id: 3, name: 'Senza costo', costPrice: 0, salePrice: 30 },
  { id: 4, name: 'Senza prezzo', costPrice: 5, salePrice: 0 },
];

/* ── CAT-001 · il ricalcolo calcola ─────────────────────────────────────── */

test('CAT-001 · il prezzo consigliato viene dal motore, non da una formula locale', () => {
  const dalMotore = contesto.InglyCostEngine.prezzo(10, { strategia: 'margine', marginePct: 45, ivaPct: 0 }).netto;
  assert.equal(R.prezzoDaMargine(10, 45), dalMotore);
});

test('CAT-001b · un margine del 45% su costo 10 dà circa 18,18 arrotondato a 19', () => {
  const p = R.proposta([prodotti[0]], { marginePct: 45, arrotondamento: 'intero' });
  assert.equal(p.righe[0].prezzoNuovo, 19);
  assert.ok(Math.abs(p.righe[0].marginePctNuovo - 47.4) < 0.2);
});

test('CAT-001c · l arrotondamento è una scelta, non una costante nascosta', () => {
  const intero = R.proposta([prodotti[0]], { arrotondamento: 'intero' }).righe[0].prezzoNuovo;
  const nessuno = R.proposta([prodotti[0]], { arrotondamento: 'nessuno' }).righe[0].prezzoNuovo;
  const nn = R.proposta([prodotti[0]], { arrotondamento: 'novantanove' }).righe[0].prezzoNuovo;
  assert.equal(intero, 19);
  assert.equal(nessuno, 18.18);
  assert.equal(nn, 18.99);
});

/* ── CAT-002 · la proposta è solo una proposta ──────────────────────────── */

test('CAT-002 · calcolare la proposta non modifica i prodotti', () => {
  const prima = JSON.stringify(prodotti);
  R.proposta(prodotti, { marginePct: 45 });
  assert.equal(JSON.stringify(prodotti), prima);
});

test('CAT-002b · nemmeno preparare i record da scrivere li modifica', () => {
  const prima = JSON.stringify(prodotti);
  const p = R.proposta(prodotti, { marginePct: 45 });
  const scritture = R.daScrivere(prodotti, p);
  assert.equal(JSON.stringify(prodotti), prima);
  assert.ok(scritture.length > 0);
  assert.notEqual(scritture[0], prodotti[0], 'sono copie, non gli originali');
});

/* ── CAT-003 · annullare ────────────────────────────────────────────────── */

test('CAT-003 · annullare è non chiamare niente: il modulo non ha effetti', () => {
  const chiavi = Object.keys(R);
  const scrittori = chiavi.filter((k) => /salva|scrivi|applica|commit/i.test(k) && k !== 'daScrivere');
  assert.deepEqual(scrittori, [], 'il modulo non espone nessuna funzione che scrive');
});

/* ── CAT-004 · confermare una selezione ─────────────────────────────────── */

test('CAT-004 · si può confermare solo una parte delle righe', () => {
  const p = R.proposta(prodotti, { marginePct: 45 });
  const tutte = R.daScrivere(prodotti, p);
  const solo1 = R.daScrivere(prodotti, p, [1]);
  assert.ok(tutte.length >= 2);
  assert.equal(solo1.length, 1);
  assert.equal(solo1[0].id, 1);
  assert.equal(solo1[0].salePrice, 19);
});

test('CAT-004b · il record scritto conserva perché quel prezzo è quello', () => {
  const p = R.proposta(prodotti, { marginePct: 45, arrotondamento: 'intero' });
  const r = R.daScrivere(prodotti, p, [1])[0];
  assert.equal(r._ricalcolo.marginePct, 45);
  assert.equal(r._ricalcolo.prezzoPrecedente, 12);
  assert.equal(r._ricalcolo.arrotondamento, 'intero');
  assert.equal(r.name, 'Targa piccola', 'gli altri campi restano');
});

/* ── CAT-005/006/007 · delta e margini ──────────────────────────────────── */

test('CAT-005 · ogni riga porta attuale, nuovo, delta € e delta %', () => {
  const r = R.proposta([prodotti[0]], { marginePct: 45 }).righe[0];
  assert.equal(r.prezzoAttuale, 12);
  assert.equal(r.prezzoNuovo, 19);
  assert.equal(r.deltaValore, 7);
  assert.ok(Math.abs(r.deltaPct - 58.33) < 0.1);
});

test('CAT-006 · il costo resta quello: il ricalcolo tocca il prezzo', () => {
  const p = R.proposta(prodotti, { marginePct: 45 });
  const r = R.daScrivere(prodotti, p, [1])[0];
  assert.equal(r.costPrice, 10);
});

test('CAT-007 · margine attuale e margine nuovo si vedono entrambi', () => {
  const r = R.proposta([prodotti[0]], { marginePct: 45 }).righe[0];
  assert.ok(Math.abs(r.marginePctAttuale - 16.67) < 0.1);
  assert.ok(Math.abs(r.marginePctNuovo - 47.37) < 0.1);
});

test('CAT-007b · un prezzo che scenderebbe si vede come ribasso', () => {
  const p = R.proposta([prodotti[1]], { marginePct: 45 });
  const r = p.righe[0];
  assert.ok(r.deltaValore < 0, 'da 8 € a 4 €: il margine del 75% scende al 45%');
  assert.equal(p.totali.ribassi, 1);
  assert.equal(p.totali.aumenti, 0);
});

/* ── CAT-008 · più prodotti ─────────────────────────────────────────────── */

test('CAT-008 · i totali sommano solo le righe che cambiano davvero', () => {
  const p = R.proposta(prodotti, { marginePct: 45 });
  assert.equal(p.totali.prodotti, 4);
  /* Ha un costo: la targa, il portachiavi e quello senza prezzo di vendita.
     Un prezzo mancante non impedisce il calcolo — anzi, è il caso in cui il
     consiglio serve di più. Senza **costo** invece non c'è margine. */
  assert.equal(p.totali.calcolabili, 3);
  assert.equal(p.totali.nonCalcolabili, 1, 'solo quello senza costo');
  assert.equal(p.totali.daCambiare, 3);
  assert.equal(Math.round(p.totali.deltaValore), 13, '+7 targa, −4 portachiavi, +10 senza prezzo');
});

test('CAT-008b · un prezzo già consigliato non si propone di riscriverlo', () => {
  const gia = [{ id: 9, name: 'Già a posto', costPrice: 10, salePrice: 19 }];
  const p = R.proposta(gia, { marginePct: 45, arrotondamento: 'intero' });
  assert.equal(p.righe[0].cambia, false);
  assert.ok(/già quello consigliato/.test(p.righe[0].motivo));
  assert.equal(R.daScrivere(gia, p).length, 0);
});

/* ── CAT-009 · quando il calcolo non si può fare ────────────────────────── */

test('CAT-009 · un prodotto senza costo resta in elenco, dichiarato', () => {
  const p = R.proposta(prodotti, { marginePct: 45 });
  const senzaCosto = p.righe.filter((r) => r.id === 3)[0];
  assert.equal(senzaCosto.calcolabile, false);
  assert.equal(senzaCosto.prezzoNuovo, null);
  assert.ok(/nessun costo/.test(senzaCosto.motivo));
  assert.equal(senzaCosto.cambia, false, 'e non viene scritto');
});

test('CAT-009b · senza motore dei prezzi non si inventa un prezzo', () => {
  const isolato = vm.createContext({ Math, JSON, Object, Array, Date, Number, String, parseFloat, isFinite, isNaN });
  vm.runInContext(fs.readFileSync('src/product/catalog-recalc.js', 'utf8'), isolato);
  const p = isolato.InglyCatalogRicalcolo.proposta(prodotti, { marginePct: 45 });
  assert.equal(p.totali.daCambiare, 0);
  assert.ok(p.righe.every((r) => r.prezzoNuovo === null));
});

test('CAT-009c · nessun prodotto non fa cadere niente', () => {
  assert.doesNotThrow(() => R.proposta(null));
  assert.doesNotThrow(() => R.daScrivere(null, null));
  assert.equal(R.proposta([]).totali.daCambiare, 0);
});

/* ── CAT-010/011 · ripetibilità e storia ────────────────────────────────── */

test('CAT-010 · la stessa proposta calcolata due volte è identica', () => {
  const senzaData = (p) => JSON.stringify(p);
  assert.equal(senzaData(R.proposta(prodotti, { marginePct: 45 })), senzaData(R.proposta(prodotti, { marginePct: 45 })));
});

test('CAT-011 · applicata la proposta, ricalcolarla non propone più niente', () => {
  const p1 = R.proposta(prodotti, { marginePct: 45, arrotondamento: 'intero' });
  const scritti = R.daScrivere(prodotti, p1);
  /* Lo stato dopo la conferma: i prodotti riscritti più quelli non toccati. */
  const dopo = prodotti.map((x) => scritti.filter((s) => s.id === x.id)[0] || x);
  const p2 = R.proposta(dopo, { marginePct: 45, arrotondamento: 'intero' });
  assert.equal(p2.totali.daCambiare, 0, 'il ricalcolo è stabile: non oscilla');
});
