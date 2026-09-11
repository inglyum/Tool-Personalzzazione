/**
 * b2b-una-scala-sola.test.mjs — la scheda e la tabella non possono più dire
 * due prezzi per la stessa quantità.
 *
 * Misurato nel Laser Quoter B2B — la schermata viva, quella che l'utente apre:
 * la scheda riepilogo e la tabella degli scaglioni, che stanno a due
 * centimetri l'una dall'altra nella stessa pagina, applicavano **due scale di
 * sconto materiale diverse**.
 *
 *   quantità   scheda   tabella
 *         10     10%        0%
 *         20     10%        4%
 *         50     20%        7%
 *        100     20%       10%
 *        200     20%       15%
 *
 * Cinque quantità su sei divergevano. A cinquanta pezzi la scheda scontava il
 * materiale quasi tre volte più della tabella, quindi mostrava un costo più
 * basso e un prezzo più basso per lo stesso lavoro.
 *
 * Il motivo per cui è durato: la tabella aveva già la sua scala **dichiarata**
 * come politica, con tanto di commento che spiegava perché le politiche vanno
 * dichiarate. La scheda aveva la vecchia, scritta nella formula, e nessuno dei
 * due punti nominava l'altro.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const FILE = 'src/legacy/patches/078-ingly-os-v23-laser-b2b-pro-catalogo-completo-cru.js';
const sorgente = fs.readFileSync(FILE, 'utf8');
const codice = sorgente
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((r) => (/^\s*(\/\/|\*)/.test(r) ? '' : r)).join('\n');

test('la scala di sconto è dichiarata una volta sola', () => {
  const occorrenze = (codice.match(/scontoMateriale:\s*\[/g) || []).length;
  assert.equal(occorrenze, 1, 'la scala è dichiarata ' + occorrenze + ' volte');
});

test('e nessuna delle due viste ne tiene una propria', () => {
  /* La vecchia scala della scheda: 0.20 / 0.15 / 0.10 su 50 / 25 / 10. */
  assert.ok(!/qty>=50\?0\.20:qty>=25\?0\.15:qty>=10\?0\.10:0/.test(codice),
    'la scheda riepilogo ha ancora la sua scala');
});

test('entrambe passano dalla stessa funzione', () => {
  const usi = (codice.match(/_scontoMateriale\(/g) || []).length;
  assert.ok(usi >= 3, 'la funzione unica è usata ' + usi + ' volte: troppo poche per coprire scheda e tabella');
});

test('la resa del lotto è anch\'essa in un posto solo', () => {
  /* Non è una politica commerciale — è conoscenza di mestiere — ma due copie
     divergono lo stesso. */
  assert.equal((codice.match(/function _resaLotto/g) || []).length, 1);
  assert.ok(!/qty>=50\?0\.85:qty>=20\?0\.92:1\)/.test(codice.replace(/function _resaLotto[^\n]*\n/, '')),
    'la formula della resa è ancora ripetuta');
  assert.ok((codice.match(/_resaLotto\(/g) || []).length >= 3);
});

/* ── La scala, eseguita ──────────────────────────────────────────────────── */

/** La funzione così com'è nel file, senza il resto del modulo. */
function scontoDi(qty) {
  const scala = [{ qty: 200, sconto: 0.15 }, { qty: 100, sconto: 0.10 },
    { qty: 50, sconto: 0.07 }, { qty: 20, sconto: 0.04 }];
  for (const s of scala) if (qty >= s.qty) return s.sconto;
  return 0;
}

test('la scala dichiarata nel file è quella che il test si aspetta', () => {
  /* Se qualcuno cambia i numeri nel file, questo test lo dice invece di
     continuare a verificare una scala che non esiste più. */
  const m = codice.match(/scontoMateriale:\s*(\[[^\]]+\])/);
  assert.ok(m, 'scala non trovata');
  const scala = JSON.parse(m[1].replace(/(\w+):/g, '"$1":').replace(/:\./g, ':0.'));
  assert.deepEqual(scala.map((s) => [s.qty, s.sconto]),
    [[200, 0.15], [100, 0.10], [50, 0.07], [20, 0.04]]);
});

test('sale con la quantità e non scende mai', () => {
  let precedente = -1;
  for (const q of [1, 5, 10, 19, 20, 49, 50, 99, 100, 199, 200, 1000]) {
    const s = scontoDi(q);
    assert.ok(s >= precedente, 'a ' + q + ' pezzi lo sconto scende: ' + s + ' dopo ' + precedente);
    precedente = s;
  }
});

test('sotto la prima soglia non c\'è sconto', () => {
  assert.equal(scontoDi(1), 0);
  assert.equal(scontoDi(19), 0);
});

test('e non supera mai il massimo dichiarato', () => {
  /* Uno sconto sul materiale che passasse il 100% farebbe un costo negativo,
     e un costo negativo produce un prezzo che sembra valido. */
  for (const q of [200, 1000, 100000]) {
    assert.ok(scontoDi(q) < 1, 'sconto oltre il 100% a ' + q + ' pezzi');
    assert.equal(scontoDi(q), 0.15);
  }
});

/* ── Le politiche restano sovrascrivibili ────────────────────────────────── */

test('chi vuole la sua scala può ancora darla', () => {
  /* `LaserB2B._politiche` è il modo dichiarato per cambiarla: toglierlo
     avrebbe reso la politica unica e insieme immutabile. */
  assert.ok(/LaserB2B\._politiche/.test(codice), 'la sovrascrittura è sparita');
  assert.ok(/Object\.assign\(\{\}, POLITICHE_B2B, \(LaserB2B\._politiche\|\|\{\}\)\)/.test(codice),
    'la sovrascrittura non parte più dalla politica dichiarata');
});

test('il prezzo minimo e il pavimento stanno nella stessa dichiarazione', () => {
  const m = codice.match(/var POLITICHE_B2B = \{[\s\S]*?\n\};/);
  assert.ok(m, 'POLITICHE_B2B non trovata');
  assert.ok(/prezzoMinimo:/.test(m[0]));
  assert.ok(/marginePavimento:/.test(m[0]));
});
