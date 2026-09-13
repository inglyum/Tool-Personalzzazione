/**
 * clv.test.mjs — quanto vale un cliente, in margine e non in fatturato.
 *
 * Tre schermate calcolavano già il «valore cliente» — `clientintel`, `clv`,
 * `ai-clv` — e tutte e tre sommavano il **fatturato**. Tre copie di un numero
 * che è quello sbagliato: il fatturato dice quanto un cliente ti ha fatto
 * incassare, non quanto ti ha fatto guadagnare, e nel lavoro su commissione i
 * due si scollano parecchio.
 *
 * Questo modulo esiste perché il programma sa la differenza: da quando
 * l'ordine porta `economic`, il costo di produzione è dichiarato.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/product/order-economics.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('src/product/clv.js', 'utf8'), sandbox);
const C = sandbox.window.InglyCLV;

const GIORNO = 86400000;
const OGGI = Date.parse('2026-06-01T00:00:00Z');
const giorniFa = (n) => new Date(OGGI - n * GIORNO).toISOString();

/** Una vendita con costo dichiarato. */
const v = (cliente, ricavo, costo, giorni) => ({
  clientId: cliente, clientName: 'Cliente ' + cliente,
  amount: ricavo, date: giorniFa(giorni),
  economic: costo == null ? undefined : { revenueNet: ricavo, costTotal: costo },
});

test('il modulo si espone', () => {
  assert.ok(C);
  assert.equal(typeof C.calcola, 'function');
  assert.equal(typeof C.totali, 'function');
});

/* ── Il valore storico: un fatto, si somma ───────────────────────────────── */

test('somma ricavo e margine di ogni cliente', () => {
  const r = C.calcola([
    v('a', 100, 60, 300), v('a', 200, 100, 100),
    v('b', 500, 450, 200),
  ], [], { adesso: OGGI });
  const a = r.find((x) => x.id === 'a');
  const b = r.find((x) => x.id === 'b');
  assert.equal(a.storico.ricavo, 300);
  assert.equal(a.storico.margine, 140);
  assert.equal(b.storico.ricavo, 500);
  assert.equal(b.storico.margine, 50);
});

test('e ordina per valore, non per fatturato', () => {
  /* È il punto di tutto il file: «b» fattura di più e guadagna di meno. Una
     classifica per fatturato lo metterebbe primo, e chi la legge coltiverebbe
     il cliente sbagliato. */
  const r = C.calcola([
    v('a', 100, 40, 400), v('a', 100, 40, 200), v('a', 100, 40, 30),
    v('b', 900, 850, 300), v('b', 900, 850, 60),
  ], [], { adesso: OGGI });
  assert.equal(r[0].id, 'a', 'in cima c\'è chi fattura di più invece di chi rende di più');
  assert.ok(r[0].previsto.margine > r[1].previsto.margine);
});

test('il margine percentuale si calcola solo se il costo è noto su tutto', () => {
  const misto = C.calcola([v('a', 100, 60, 200), v('a', 100, null, 100)], [], { adesso: OGGI })[0];
  assert.equal(misto.storico.margineNoto, false);
  assert.equal(misto.storico.margineParziale, true);
  assert.equal(misto.storico.marginePct, null, 'una percentuale su dati parziali sarebbe falsa');
  assert.equal(misto.storico.ordiniConCosto, 1);
});

test('senza nessun costo dichiarato il margine non si inventa', () => {
  const c = C.calcola([v('a', 100, null, 200), v('a', 100, null, 100)], [], { adesso: OGGI })[0];
  assert.equal(c.storico.margineNoto, false);
  assert.equal(c.storico.margine, 0);
  assert.equal(c.medie.marginePerOrdine, null);
  assert.equal(c.previsto.margine, null);
  assert.ok(/nessun costo dichiarato/.test(c.previsto.motivo));
  assert.ok(c.previsto.ricavo > 0, 'il fatturato però si può proiettare, e si deve');
});

/* ── Il valore previsto: una proiezione, e va detto ──────────────────────── */

test('un cliente con un acquisto solo non ha una previsione', () => {
  /* Dividere per un intervallo che non esiste produce un numero enorme e
     falso, ed è il modo classico in cui una dashboard CLV mente. */
  const c = C.calcola([v('a', 100, 50, 30)], [], { adesso: OGGI })[0];
  assert.equal(c.previsto.margine, null);
  assert.equal(c.medie.ordiniAnno, null);
  assert.ok(/un acquisto solo/.test(c.previsto.motivo));
});

test('né chi ha comprato tutto nello stesso giorno', () => {
  const c = C.calcola([v('a', 100, 50, 40), v('a', 100, 50, 40)], [], { adesso: OGGI })[0];
  assert.equal(c.previsto.margine, null);
  assert.ok(/stesso giorno/.test(c.previsto.motivo));
});

test('la frequenza si misura sugli intervalli, non sugli acquisti', () => {
  /* Due acquisti a 365 giorni di distanza fanno **un** intervallo all'anno,
     non due: dividere per gli ordini gonfierebbe del doppio. */
  const c = C.calcola([v('a', 100, 50, 365), v('a', 100, 50, 0)], [], { adesso: OGGI })[0];
  assert.ok(Math.abs(c.medie.ordiniAnno - 1) < 0.001, 'ordiniAnno = ' + c.medie.ordiniAnno);
});

test('e la proiezione è margine medio × frequenza × orizzonte', () => {
  const c = C.calcola([v('a', 100, 50, 365), v('a', 100, 50, 0)], [], { adesso: OGGI })[0];
  /* 50 € di margine medio × 1 ordine/anno × 12 mesi = 50 €. */
  assert.ok(Math.abs(c.previsto.margine - 50) < 0.01, c.previsto.margine);
  assert.equal(c.previsto.orizzonteMesi, 12);
});

test('l\'orizzonte si dichiara e cambia la proiezione', () => {
  const righe = [v('a', 100, 50, 365), v('a', 100, 50, 0)];
  const a12 = C.calcola(righe, [], { adesso: OGGI })[0];
  const a24 = C.calcola(righe, [], { adesso: OGGI, orizzonteMesi: 24 })[0];
  assert.ok(Math.abs(a24.previsto.margine - a12.previsto.margine * 2) < 0.01);
  assert.equal(a24.previsto.orizzonteMesi, 24);
});

test('chi compra spesso vale più di chi compra raramente, a parità di margine', () => {
  const r = C.calcola([
    v('spesso', 100, 50, 90), v('spesso', 100, 50, 60), v('spesso', 100, 50, 30),
    v('raro', 100, 50, 700), v('raro', 100, 50, 0),
  ], [], { adesso: OGGI });
  const s = r.find((x) => x.id === 'spesso');
  const q = r.find((x) => x.id === 'raro');
  assert.ok(s.previsto.margine > q.previsto.margine,
    'spesso ' + s.previsto.margine + ' contro raro ' + q.previsto.margine);
});

/* ── I clienti in anagrafica ─────────────────────────────────────────────── */

test('chi non ha ancora comprato compare comunque, a zero', () => {
  /* Nasconderlo fa credere che non esista, ed è il momento in cui servirebbe
     ricordarsene. */
  const r = C.calcola([v('a', 100, 50, 100)], [{ id: 'z', name: 'Mai comprato' }], { adesso: OGGI });
  const z = r.find((x) => x.id === 'z');
  assert.ok(z, 'il cliente senza acquisti è sparito');
  assert.equal(z.storico.ordini, 0);
  assert.equal(z.previsto.margine, null);
  assert.ok(/nessun acquisto/.test(z.previsto.motivo));
});

test('l\'anagrafica dà il nome a chi compra con un id', () => {
  const r = C.calcola([v('a', 100, 50, 100)], [{ id: 'a', name: 'Rosticceria Bianca' }], { adesso: OGGI });
  assert.equal(r[0].nome, 'Rosticceria Bianca');
});

test('un cliente senza id si raggruppa per nome', () => {
  const r = C.calcola([
    { clientName: 'Bar Centrale', amount: 100, date: giorniFa(200), economic: { costTotal: 40 } },
    { clientName: 'bar centrale', amount: 100, date: giorniFa(100), economic: { costTotal: 40 } },
  ], [], { adesso: OGGI });
  assert.equal(r.length, 1, 'lo stesso cliente conta come due');
  assert.equal(r[0].storico.ordini, 2);
});

test('una riga senza cliente non finisce in un gruppo inventato', () => {
  const r = C.calcola([{ amount: 100, date: giorniFa(10) }], [], { adesso: OGGI });
  assert.equal(r.length, 0);
});

/* ── I totali ────────────────────────────────────────────────────────────── */

test('i totali dicono su quanti clienti il margine è noto', () => {
  const r = C.calcola([
    v('a', 100, 60, 300), v('a', 100, 60, 100),
    v('b', 200, null, 200),
  ], [{ id: 'z', name: 'Mai comprato' }], { adesso: OGGI });
  const t = C.totali(r);
  assert.equal(t.clienti, 3);
  assert.equal(t.conAcquisti, 2);
  assert.equal(t.senzaAcquisti, 1);
  assert.equal(t.clientiConMargineNoto, 1);
  assert.equal(t.coperturaPct, 50, 'la copertura dice quanto fidarsi del resto');
});

test('il margine totale somma solo i clienti di cui si sa il costo', () => {
  const r = C.calcola([v('a', 100, 60, 300), v('a', 100, 60, 100), v('b', 900, null, 200)],
    [], { adesso: OGGI });
  const t = C.totali(r);
  assert.equal(t.margine, 80, 'ha sommato come zero un costo che non si sa');
  assert.equal(t.ricavo, 1100, 'il fatturato invece si sa tutto');
});

/* ── La purezza ──────────────────────────────────────────────────────────── */

test('il modulo non legge il mondo: la data si passa', () => {
  const t = fs.readFileSync('src/product/clv.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((r) => (/^\s*(\/\/|\*)/.test(r) ? '' : r)).join('\n');
  for (const vietato of ['document.', 'localStorage', 'Date.now()', 'Math.random']) {
    assert.ok(!t.includes(vietato), 'il modulo usa ' + vietato + ': lo stesso insieme di vendite darebbe due risultati');
  }
});

test('lo stesso insieme dà lo stesso risultato due volte', () => {
  const righe = [v('a', 100, 50, 200), v('a', 150, 70, 40), v('b', 300, 120, 90)];
  const uno = JSON.stringify(C.calcola(righe, [], { adesso: OGGI }));
  const due = JSON.stringify(C.calcola(righe, [], { adesso: OGGI }));
  assert.equal(uno, due);
});

test('usa le letture canoniche di ricavo e costo, non le sue', () => {
  const t = fs.readFileSync('src/product/clv.js', 'utf8');
  assert.ok(/InglyOrderEconomics/.test(t), 'si è scritto i suoi lettori');
  assert.ok(/ricavoNettoOrdine/.test(t) && /costoOrdine/.test(t));
});

test('il modulo entra nella build', () => {
  assert.ok(/'clv\.js'/.test(fs.readFileSync('src/product/index.mjs', 'utf8')));
});
