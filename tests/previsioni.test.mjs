/**
 * previsioni.test.mjs — una previsione che dichiara quanto vale.
 *
 * Il programma prometteva le previsioni in tre punti — `forecaster`,
 * `forecasting`, `revsim` — e ne aveva una sola vera. Quella una faceva una
 * regressione su **dodici mesi fissi**, con zero nei mesi in cui il
 * laboratorio non esisteva ancora, e ci includeva il **mese corrente
 * incompleto**. Da lì uscivano tre cifre in euro precise all'unità.
 *
 * Quasi tutto quello che si verifica qui è **quando il modulo si rifiuta di
 * dare un numero**, perché è la parte che mancava.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/product/previsioni.js', 'utf8'), sandbox);
const P = sandbox.window.InglyPrevisioni;

const ADESSO = Date.parse('2026-09-15T00:00:00Z');
const v = (mese, importo) => ({ date: mese + '-10', amount: importo });
const serie = (...valori) => valori.map((x, i) => ({ mese: '2026-0' + (i + 1), valore: x }));

test('il modulo si espone', () => {
  assert.ok(P);
  assert.equal(typeof P.da, 'function');
  assert.equal(typeof P.daRighe, 'function');
  assert.equal(P.MESI_MINIMI, 4);
});

/* ── Il rifiuto ───────────────────────────────────────────────────────── */

test('con meno mesi del minimo non si prevede niente', () => {
  const r = P.da(serie(100, 200, 300));
  assert.equal(r.disponibile, false);
  assert.equal(r.previsione, null);
  assert.match(r.motivo, /almeno 4 mesi/);
  assert.match(r.motivo, /ce ne sono 3/);
});

test('e senza nessun mese si dice così, non zero', () => {
  const r = P.da([]);
  assert.equal(r.disponibile, false);
  assert.equal(r.previsione, null);
  assert.match(r.motivo, /non ci sono ancora mesi conclusi/);
});

test('niente al posto della serie non lancia', () => {
  assert.equal(P.da(null).disponibile, false);
  assert.equal(P.da(undefined).previsione, null);
});

/* ── La finestra parte dal primo mese vero ───────────────────────────────
   È il difetto principale: nove zeri davanti non sono nove mesi andati male,
   sono nove mesi che non ci sono stati. */

test('i mesi prima della prima vendita non entrano nella serie', () => {
  const r = P.serieMensile([
    v('2026-06', 1000), v('2026-07', 1100), v('2026-08', 1200),
  ], { adesso: ADESSO });
  assert.equal(r.serie.length, 3, 'giugno, luglio, agosto — non dodici');
  assert.equal(r.serie[0].mese, '2026-06');
});

test('ma un mese a zero dentro la finestra resta zero', () => {
  /* Un mese senza vendite, dopo che il laboratorio è aperto, è un fatto. */
  const r = P.serieMensile([
    v('2026-05', 1000), v('2026-08', 1200),
  ], { adesso: ADESSO });
  assert.equal(r.serie.length, 4, 'maggio, giugno, luglio, agosto');
  assert.equal(r.serie[1].valore, 0);
  assert.equal(r.serie[2].valore, 0);
});

test('e la serie non inventa una tendenza dai mesi che non esistono', () => {
  /* Tre mesi in crescita vera. Con i nove zeri davanti il vecchio calcolo
     leggeva una crescita ripidissima; qui non c'è abbastanza storia e il
     modulo lo dice, invece di dare tre cifre. */
  const r = P.daRighe([
    v('2026-06', 1000), v('2026-07', 1100), v('2026-08', 1200),
  ], { adesso: ADESSO });
  assert.equal(r.disponibile, false);
  assert.equal(r.mesiReali, 3);
});

/* ── Il mese corrente resta fuori ─────────────────────────────────────── */

test('il mese in corso non entra nel calcolo', () => {
  const r = P.serieMensile([
    v('2026-05', 1000), v('2026-06', 1000), v('2026-07', 1000),
    v('2026-08', 1000), v('2026-09', 50),
  ], { adesso: ADESSO });
  assert.equal(r.serie.length, 4, 'maggio-agosto: settembre è in corso');
  assert.ok(r.serie.every((p) => p.mese !== '2026-09'));
});

test('ma si restituisce a parte, perché esiste', () => {
  const r = P.serieMensile([v('2026-05', 1000), v('2026-09', 50)], { adesso: ADESSO });
  assert.equal(r.parziale.mese, '2026-09');
  assert.equal(r.parziale.valore, 50);
});

test('il mese in corso incompleto non tira giù la previsione', () => {
  const pieni = [v('2026-04', 1000), v('2026-05', 1000), v('2026-06', 1000), v('2026-07', 1000), v('2026-08', 1000)];
  const senza = P.daRighe(pieni, { adesso: ADESSO });
  const con = P.daRighe(pieni.concat([v('2026-09', 30)]), { adesso: ADESSO });
  assert.equal(senza.previsione[0].valore, con.previsione[0].valore,
    'i 30 euro del giorno 15 non devono spostare niente');
});

/* ── Il calcolo, quando si può fare ──────────────────────────────────── */

test('una crescita costante si legge come crescita', () => {
  const r = P.da(serie(1000, 1100, 1200, 1300, 1400));
  assert.equal(r.disponibile, true);
  assert.ok(r.pendenza > 90 && r.pendenza < 110, 'circa +100 al mese, non ' + r.pendenza);
  assert.equal(r.previsione.length, 3);
  assert.ok(r.previsione[0].valore > 1400);
  assert.ok(r.previsione[2].valore > r.previsione[0].valore);
});

test('una serie piatta non produce crescita', () => {
  const r = P.da(serie(1000, 1000, 1000, 1000, 1000));
  assert.ok(Math.abs(r.pendenza) < 0.001);
  assert.equal(r.previsione[0].valore, 1000);
});

test('un calo si legge come calo, e non si arrotonda in su', () => {
  const r = P.da(serie(2000, 1700, 1400, 1100, 800));
  assert.ok(r.pendenza < 0);
  assert.ok(r.previsione[0].valore < 800);
});

test('quando la retta scenderebbe sotto zero lo dichiara', () => {
  const r = P.da(serie(1000, 700, 400, 100, 50));
  const sotto = r.previsione.filter((p) => p.sottoZero);
  assert.ok(sotto.length >= 1, 'la retta va sotto zero e va detto');
  assert.ok(sotto.every((p) => p.valore === 0), 'ma il valore mostrato non è negativo');
});

/* ── L'attendibilità ─────────────────────────────────────────────────── */

test('una serie ordinata ha attendibilità buona', () => {
  const r = P.da(serie(1000, 1100, 1200, 1300, 1400));
  assert.equal(r.affidabilita.id, 'buona');
  assert.ok(r.r2 > 0.9);
});

test('una serie che salta ha attendibilità debole', () => {
  const r = P.da(serie(100, 3000, 200, 2800, 150, 3100));
  assert.equal(r.affidabilita.id, 'debole');
  assert.ok(r.r2 < 0.3, 'R² ' + r.r2);
});

test("e l'attendibilità debole non impedisce il numero, lo accompagna", () => {
  /* Nascondere la previsione quando i dati ballano sarebbe l'eccesso
     opposto: chi guarda ha diritto al numero e al suo peso. */
  const r = P.da(serie(100, 3000, 200, 2800, 150, 3100));
  assert.equal(r.disponibile, true);
  assert.ok(r.previsione[0].valore >= 0);
  assert.equal(r.affidabilita.id, 'debole');
});

test("l'intervallo si allarga andando avanti nel tempo", () => {
  const r = P.da(serie(1000, 1400, 1100, 1600, 1300, 1800));
  assert.ok(r.previsione[2].intervallo > r.previsione[0].intervallo,
    'fra tre mesi è più incerto che fra uno');
});

test('una serie perfetta ha intervallo quasi nullo', () => {
  const r = P.da(serie(1000, 1100, 1200, 1300, 1400));
  assert.ok(r.previsione[0].intervallo < 20, 'intervallo ' + r.previsione[0].intervallo);
});

/* ── La frase che accompagna il numero ───────────────────────────────── */

test('la frase dice sempre su quanti mesi si basa', () => {
  const r = P.da(serie(1000, 1100, 1200, 1300, 1400));
  const f = P.frase(r);
  assert.match(f, /Su 5 mesi conclusi/);
  assert.match(f, /attendibilità buona/);
  assert.match(f, /R²/);
});

test('e quando non c\'è previsione dice perché', () => {
  const f = P.frase(P.da(serie(100, 200)));
  assert.match(f, /non disponibile/);
  assert.match(f, /almeno 4 mesi/);
});

/* ── I bordi ─────────────────────────────────────────────────────────── */

test('le date si leggono in più formati', () => {
  const r = P.serieMensile([
    { date: '2026-05-10', amount: 100 },
    { date: '2026-06-01T12:00:00Z', amount: 200 },
    { data: '2026-07-15', amount: 300 },
  ], { adesso: ADESSO });
  assert.equal(r.serie.length, 4);
  assert.equal(r.serie[0].valore, 100);
});

test('le righe senza data non entrano e non rompono', () => {
  const r = P.serieMensile([
    v('2026-05', 100), { amount: 9999 }, { date: null, amount: 5 },
  ], { adesso: ADESSO });
  assert.equal(r.serie.length, 4);
  assert.equal(r.serie.reduce((a, p) => a + p.valore, 0), 100);
});

test('un anno che cambia non rompe la successione dei mesi', () => {
  const r = P.serieMensile([{ date: '2025-11-10', amount: 100 }], { adesso: ADESSO });
  assert.equal(r.serie[0].mese, '2025-11');
  assert.equal(r.serie[1].mese, '2025-12');
  assert.equal(r.serie[2].mese, '2026-01');
  assert.equal(r.serie.length, 10, 'da novembre 2025 ad agosto 2026');
});

test('mesiAvanti si può chiedere diverso da tre', () => {
  const r = P.da(serie(1000, 1100, 1200, 1300, 1400), { mesiAvanti: 6 });
  assert.equal(r.previsione.length, 6);
  assert.equal(r.previsione[5].traMesi, 6);
});
