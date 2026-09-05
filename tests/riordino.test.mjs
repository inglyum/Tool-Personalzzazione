/**
 * riordino.test.mjs — quando ricomprare, calcolato invece che indovinato.
 *
 * `minStock` è un numero scritto a mano una volta e mai più toccato, che
 * ignora le due cose che decidono quando ricomprare: quanto se ne consuma, e
 * quanto ci mette ad arrivare.
 *
 * La domanda di questi test è una sola: **il modulo inventa un numero quando
 * non ha i dati?** Perché un suggerimento inventato è peggio della soglia
 * scritta a mano — sembra calcolato.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, Date, Number, String, parseFloat, isFinite, isNaN, Infinity });
vm.runInContext(fs.readFileSync('src/product/inventory-riordino.js', 'utf8'), contesto);
const R = contesto.InglyRiordino;

const ORA = new Date('2026-06-01T00:00:00.000Z').getTime();
const GIORNO = 24 * 60 * 60 * 1000;
const giorniFa = (n) => new Date(ORA - n * GIORNO).toISOString();

const uscita = (itemId, q, giorni, type = 'CONSUMPTION') =>
  ({ itemId, type, quantity: q, at: giorniFa(giorni) });
const entrata = (itemId, q, giorni) =>
  ({ itemId, type: 'PURCHASE', quantity: q, at: giorniFa(giorni) });

const opz = { ora: ORA };

/* ── Senza dati non si inventa ──────────────────────────────────────────── */

test('senza uscite il consumo non è misurabile, e non è zero', () => {
  const c = R.consumo([], 'a1', opz);
  assert.equal(c.misurabile, false);
  assert.ok(c.motivo.length > 0);
  assert.ok(c.cosaFare.length > 0, 'un «non lo so» senza rimedio è solo un no');
});

test('solo entrate non fanno un consumo', () => {
  const c = R.consumo([entrata('a1', 100, 10), entrata('a1', 50, 5)], 'a1', opz);
  assert.equal(c.misurabile, false);
});

test('senza consumo non si propone una soglia', () => {
  const a = R.analizza([], { id: 'a1', name: 'PLA', stock: 5, minStock: 2 }, opz);
  assert.equal(a.misurabile, false);
  assert.equal(a.suggerito, undefined, 'un numero inventato sembra calcolato');
  assert.equal(a.urgenza, 'sconosciuta');
});

test('ma se è a zero lo dice comunque: non serve il consumo per vedere il vuoto', () => {
  const a = R.analizza([], { id: 'a1', stock: 0 }, opz);
  assert.equal(a.urgenza, 'esaurito');
});

/* ── Il consumo si misura sui giorni veri ───────────────────────────────── */

test('il consumo giornaliero è il totale sui giorni osservati', () => {
  /* 60 pezzi in 30 giorni = 2 al giorno. */
  const mov = [uscita('a1', 30, 30), uscita('a1', 30, 1)];
  const c = R.consumo(mov, 'a1', opz);
  assert.equal(c.totale, 60);
  assert.equal(c.giorniOsservati, 30);
  assert.ok(Math.abs(c.alGiorno - 2) < 0.001);
});

test('i giorni osservati partono dalla prima uscita, non dalla finestra', () => {
  /* Un materiale comprato la settimana scorsa: dividere per novanta darebbe
     un consumo dieci volte più basso del vero. */
  const c = R.consumo([uscita('a1', 70, 7), uscita('a1', 0.0001, 1)], 'a1', opz);
  assert.equal(c.giorniOsservati, 7);
  assert.ok(c.alGiorno > 9, 'consumo schiacciato dalla finestra: ' + c.alGiorno);
});

test('le uscite fuori finestra non contano', () => {
  const c = R.consumo([uscita('a1', 100, 200), uscita('a1', 10, 10)], 'a1', { ora: ORA, finestraGiorni: 90 });
  assert.equal(c.totale, 10);
});

test('le uscite di un altro articolo non contano', () => {
  const c = R.consumo([uscita('a1', 10, 10), uscita('a2', 999, 10)], 'a1', opz);
  assert.equal(c.totale, 10);
});

test('lo scarto conta nel consumo, perché toglie pezzi dallo scaffale', () => {
  const c = R.consumo([uscita('a1', 10, 20, 'CONSUMPTION'), uscita('a1', 10, 10, 'WASTE')], 'a1', opz);
  assert.equal(c.totale, 20);
  assert.equal(c.scarto, 10);
  assert.equal(c.scartoPct, 50);
});

test('la quantità si prende in valore assoluto: il segno lo dà il tipo', () => {
  const c = R.consumo([uscita('a1', -10, 10)], 'a1', opz);
  assert.equal(c.totale, 10);
});

test('un deposito diverso si può escludere', () => {
  const mov = [
    { itemId: 'a1', type: 'CONSUMPTION', quantity: 10, at: giorniFa(10), warehouseId: 'w1' },
    { itemId: 'a1', type: 'CONSUMPTION', quantity: 90, at: giorniFa(10), warehouseId: 'w2' },
  ];
  assert.equal(R.consumo(mov, 'a1', { ora: ORA, warehouseId: 'w1' }).totale, 10);
  assert.equal(R.consumo(mov, 'a1', opz).totale, 100);
});

/* ── Quando la stima è debole lo dice ───────────────────────────────────── */

test('due uscite in tre mesi danno una media, ma con riserva', () => {
  const c = R.consumo([uscita('a1', 5, 80), uscita('a1', 5, 20)], 'a1', opz);
  assert.equal(c.misurabile, true);
  assert.equal(c.affidabile, false);
  assert.ok(c.riserve.some((r) => /uscite/.test(r)));
});

test('uno storico di pochi giorni è dichiarato debole', () => {
  const c = R.consumo([uscita('a1', 3, 5), uscita('a1', 3, 3), uscita('a1', 3, 1)], 'a1', opz);
  assert.equal(c.affidabile, false);
  assert.ok(c.riserve.some((r) => /storico/.test(r)));
});

test('con abbastanza movimenti e abbastanza giorni la stima è affidabile', () => {
  const mov = [];
  for (let g = 60; g >= 1; g -= 5) mov.push(uscita('a1', 5, g));
  const c = R.consumo(mov, 'a1', opz);
  assert.equal(c.affidabile, true);
  assert.equal(c.riserve.length, 0, 'riserve inattese: ' + c.riserve.join(' · '));
});

/* ── La formula ─────────────────────────────────────────────────────────── */

test('il punto di riordino copre la consegna più il margine', () => {
  const p = R.puntoRiordino(2, { giorniConsegna: 10, giorniSicurezza: 5 });
  assert.equal(p.copertura, 20);
  assert.equal(p.margine, 10);
  assert.equal(p.punto, 30);
});

test('le due parti restano leggibili separatamente', () => {
  const p = R.puntoRiordino(1, { giorniConsegna: 7, giorniSicurezza: 7 });
  assert.equal(p.copertura + p.margine, p.punto);
  assert.equal(p.giorniConsegna, 7);
});

test('un consumo nullo non produce una soglia negativa', () => {
  const p = R.puntoRiordino(0, { giorniConsegna: 10, giorniSicurezza: 5 });
  assert.equal(p.punto, 0);
});

test('giorni negativi non abbassano la soglia sotto zero', () => {
  const p = R.puntoRiordino(2, { giorniConsegna: -5, giorniSicurezza: -5 });
  assert.equal(p.punto, 0);
});

/* ── L'analisi ──────────────────────────────────────────────────────────── */

const storico = (() => { const m = []; for (let g = 60; g >= 1; g -= 2) m.push(uscita('a1', 2, g)); return m; })();
/* 30 uscite da 2 in 60 giorni = 1 al giorno. */

test('un articolo sotto il punto di riordino va ordinato adesso', () => {
  const a = R.analizza(storico, { id: 'a1', name: 'PLA', stock: 5, leadTime: 7 }, opz);
  assert.equal(a.misurabile, true);
  assert.ok(Math.abs(a.consumo.alGiorno - 1) < 0.05, 'consumo: ' + a.consumo.alGiorno);
  assert.equal(a.urgenza, 'ordinare');
});

test('un articolo con scorta abbondante non allarma', () => {
  const a = R.analizza(storico, { id: 'a1', stock: 500, leadTime: 7 }, opz);
  assert.equal(a.urgenza, 'sufficiente');
});

test('e i giorni residui sono la giacenza divisa per il consumo', () => {
  const a = R.analizza(storico, { id: 'a1', stock: 30, leadTime: 7 }, opz);
  assert.ok(Math.abs(a.giorniResidui - 30) < 2, 'residui: ' + a.giorniResidui);
});

test('il tempo di consegna dell articolo batte quello predefinito', () => {
  const corto = R.analizza(storico, { id: 'a1', stock: 100, leadTime: 2 }, opz);
  const lungo = R.analizza(storico, { id: 'a1', stock: 100, leadTime: 30 }, opz);
  assert.ok(lungo.suggerito > corto.suggerito, 'consegne lunghe alzano la soglia');
});

test('quanto ordinare copre i giorni chiesti più il punto di riordino', () => {
  const a = R.analizza(storico, { id: 'a1', stock: 0, leadTime: 7 }, { ora: ORA, giorniDaCoprire: 30 });
  /* 1/giorno × 30 giorni + punto di riordino (7+7 = 14), meno giacenza 0. */
  assert.ok(Math.abs(a.daOrdinare - 44) < 3, 'da ordinare: ' + a.daOrdinare);
});

test('se la giacenza basta già non si ordina niente', () => {
  const a = R.analizza(storico, { id: 'a1', stock: 1000, leadTime: 7 }, opz);
  assert.equal(a.daOrdinare, 0);
});

test('lo scostamento dalla soglia scritta a mano si vede', () => {
  const a = R.analizza(storico, { id: 'a1', stock: 50, minStock: 3, leadTime: 7 }, opz);
  assert.ok(a.scostamentoSoglia > 0, 'la soglia scritta era troppo bassa e non si vede');
});

test('senza soglia scritta non si inventa uno scostamento', () => {
  const a = R.analizza(storico, { id: 'a1', stock: 50, leadTime: 7 }, opz);
  assert.equal(a.scostamentoSoglia, null);
});

test('il modulo non tocca minStock: propone e basta', () => {
  const item = { id: 'a1', stock: 5, minStock: 3, leadTime: 7 };
  R.analizza(storico, item, opz);
  assert.equal(item.minStock, 3, 'la soglia dell utente è stata sovrascritta');
});

/* ── L'elenco ───────────────────────────────────────────────────────────── */

test('l elenco mette per primo quel che è esaurito', () => {
  const items = [
    { id: 'a1', name: 'Abbondante', stock: 1000, leadTime: 7 },
    { id: 'a1', name: 'Esaurito', stock: 0, leadTime: 7 },
  ];
  const e = R.elenco(storico, items, opz);
  assert.equal(e.righe[0].nome, 'Esaurito');
});

test('gli articoli senza consumo misurabile non spariscono: vanno in fondo', () => {
  const items = [
    { id: 'sconosciuto', name: 'Mai usato', stock: 10 },
    { id: 'a1', name: 'Da ordinare', stock: 2, leadTime: 7 },
  ];
  const e = R.elenco(storico, items, opz);
  assert.equal(e.righe[0].nome, 'Da ordinare');
  assert.equal(e.righe[1].nome, 'Mai usato');
  assert.equal(e.nonMisurabili, 1);
});

test('l elenco conta le urgenze', () => {
  const items = [
    { id: 'a1', name: 'Uno', stock: 0, leadTime: 7 },
    { id: 'a1', name: 'Due', stock: 5, leadTime: 7 },
    { id: 'a1', name: 'Tre', stock: 1000, leadTime: 7 },
  ];
  const e = R.elenco(storico, items, opz);
  assert.equal(e.conta.esaurito, 1);
  assert.equal(e.conta.ordinare, 1);
  assert.equal(e.conta.sufficiente, 1);
  assert.equal(e.daOrdinare.length, 2);
});

test('un elenco vuoto non è un errore', () => {
  const e = R.elenco([], [], opz);
  assert.equal(e.righe.length, 0);
  assert.equal(e.daOrdinare.length, 0);
});

test('un articolo senza id non entra nell elenco', () => {
  const e = R.elenco(storico, [{ name: 'Senza id', stock: 1 }, null], opz);
  assert.equal(e.righe.length, 0);
});

/* ── Dati rotti ─────────────────────────────────────────────────────────── */

test('un movimento senza data non fa crollare il conto', () => {
  const c = R.consumo([{ itemId: 'a1', type: 'CONSUMPTION', quantity: 5 }, uscita('a1', 10, 10)], 'a1', opz);
  assert.equal(c.totale, 10, 'un movimento senza data non è collocabile nel tempo');
});

test('un registro nullo non lancia', () => {
  assert.equal(R.consumo(null, 'a1', opz).misurabile, false);
  assert.equal(R.elenco(null, null, opz).righe.length, 0);
});

test('il modulo non conosce archivi: riceve i movimenti, non li va a prendere', () => {
  const src = fs.readFileSync('src/product/inventory-riordino.js', 'utf8');
  assert.ok(!/localStorage|IDB\.|AppStore/.test(src));
});
