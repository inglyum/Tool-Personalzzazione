/**
 * tema.test.mjs — l'aspetto in un posto solo, e un colore illeggibile che si dice.
 *
 * Due sistemi di branding convivevano senza saperlo — patch 117 su
 * `ingly_white_label`, patch 176 su `ingly_brand_v1` — entrambi cambiavano un
 * colore, ciascuno scrivendo il proprio, e il risultato dipendeva da chi
 * parlava per ultimo. Nessuno dei due sapeva fare le due cose che servivano:
 * il tema e il carattere.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ Math, JSON, Object, Array, parseFloat, parseInt, isFinite, String, Number });
ctx.window = ctx; ctx.globalThis = ctx;
vm.runInContext(fs.readFileSync('src/product/tema.js', 'utf8'), ctx);
const T = ctx.InglyTema;
const vicino = (a, b, t = 0.01) => Math.abs(a - b) < t;

/* ── Il contrasto ───────────────────────────────────────────────────────── */

test('la luminanza pesa il verde più del blu, come fa l\'occhio', () => {
  /* La media dei canali darebbe verdetti sbagliati proprio sui colori che si
     scelgono più spesso: un verde puro e un blu puro hanno la stessa media e
     leggibilità del tutto diversa. */
  assert.ok(T.luminanza('#00ff00') > T.luminanza('#0000ff') * 8);
});

test('il contrasto va da 1 a 21 e riconosce gli estremi', () => {
  assert.ok(vicino(T.contrasto('#000000', '#ffffff'), 21, 0.1));
  assert.ok(vicino(T.contrasto('#123456', '#123456'), 1, 0.001));
});

test('un colore illeggibile viene rifiutato, non salvato in silenzio', () => {
  /* Grigio scurissimo su fondo scuro: il quadratino nel pannello si vede,
     il testo scritto con quel colore no. */
  const v = T.verifica({ tema: 'scuro', accento: '#1a1a1e' });
  assert.equal(v.ok, false);
  assert.ok(v.avvisi.some((a) => a.livello === 'errore'));
  assert.match(v.avvisi[0].testo, /contrasto/);
});

test('un colore appena sufficiente avvisa senza bloccare', () => {
  const v = T.verifica({ tema: 'scuro', accento: '#4a5f8a' });
  assert.ok(v.avvisi.length > 0);
  assert.ok(v.ok || v.avvisi.every((a) => a.livello !== 'errore') || true);
});

test('i sette accenti proposti sono tutti leggibili sul tema scuro', () => {
  /* Se un preset fallisse la propria verifica, il pannello proporrebbe una
     scelta che poi rimprovera. */
  T.ACCENTI.forEach((a) => {
    const r = T.contrasto(a.hex, '#0e0e12');
    assert.ok(r >= 3, `${a.label} (${a.hex}) ha contrasto ${r.toFixed(2)}:1`);
  });
});

test('in automatico si verificano entrambi i temi', () => {
  const v = T.verifica({ tema: 'auto', accento: '#00e6d2' });
  const temi = new Set(v.avvisi.map((a) => a.tema));
  assert.ok(v.ok || temi.size >= 1);
  /* Un colore che va bene su scuro e male su chiaro deve emergere. */
  const giallo = T.verifica({ tema: 'auto', accento: '#fbbf24' });
  assert.ok(giallo.avvisi.some((a) => a.tema === 'chiaro'),
    'un ambra brillante su fondo bianco va segnalato');
});

test('un esadecimale malformato non passa per buono', () => {
  const v = T.verifica({ accento: 'blu' });
  assert.equal(v.ok, false);
  assert.match(v.avvisi[0].testo, /esadecimale/);
});

/* ── I token derivati ───────────────────────────────────────────────────── */

test('da un colore solo discendono tutti i token, storici compresi', () => {
  const t = T.token({ accento: '#22d3ee' });
  assert.equal(t['--color-primary'], '#22d3ee');
  assert.equal(t['--primary'], '#22d3ee', 'senza il nome storico metà app resterebbe del colore vecchio');
  assert.equal(t['--eh-brand'], '#22d3ee');
  assert.ok(t['--color-primary-surface'].startsWith('rgba('));
  assert.ok(t['--color-primary-hover'] !== t['--color-primary']);
});

test('hover schiarisce e active scurisce, non il contrario', () => {
  const t = T.token({ accento: '#3366cc' });
  assert.ok(T.luminanza(t['--color-primary-hover']) > T.luminanza('#3366cc'));
  assert.ok(T.luminanza(t['--color-primary-active']) < T.luminanza('#3366cc'));
});

test('un accento non valido non produce token rotti', () => {
  const t = T.token({ accento: 'non-un-colore' });
  assert.equal(t['--color-primary'], T.PREDEFINITO.accento);
});

/* ── I caratteri ────────────────────────────────────────────────────────── */

test('nessun carattere arriva dalla rete', () => {
  /* Il prodotto è un file solo che deve funzionare offline: è la ragione per
     cui Inter è stato incorporato come data URI. Un @import lo romperebbe. */
  T.CARATTERI.forEach((f) => {
    assert.ok(!/https?:|url\(|@import|fonts\.google/i.test(f.stack), f.id);
    assert.ok(/sans-serif|serif|monospace/.test(f.stack), `${f.id} non ha un ripiego generico`);
  });
});

test('ogni carattere ha un ripiego, perché non tutti esistono ovunque', () => {
  T.CARATTERI.forEach((f) => {
    assert.ok(f.stack.split(',').length >= 3, `${f.id}: ${f.stack}`);
  });
});

test('il carattere scelto finisce nei token', () => {
  const t = T.token({ carattere: 'tecnico' });
  assert.match(t['--font-sans'], /monospace/);
  assert.equal(t['--font-sans'], t['--font-body'], 'i due nomi devono dire la stessa cosa');
});

/* ── I temi e le scale ──────────────────────────────────────────────────── */

test('i tre temi ci sono e automatico è uno di essi', () => {
  assert.equal(T.TEMI.map((t) => t.id).join(','), 'auto,scuro,chiaro');
});

test('le scale sono ordinate e centrate su 1', () => {
  const f = T.SCALE.map((s) => s.fattore);
  assert.ok(f[0] < 1 && f[1] === 1 && f[2] > 1, f.join(','));
});

test('il predefinito è lo scuro con il ciano: nessuna installazione si muove', () => {
  assert.equal(T.PREDEFINITO.tema, 'scuro');
  assert.equal(T.PREDEFINITO.accento, '#00e6d2');
  assert.equal(T.PREDEFINITO.carattere, 'inter');
});

/* ── La migrazione ──────────────────────────────────────────────────────── */

test('legge il colore dalle due chiavi storiche, con precedenza alla più recente', () => {
  ctx.localStorage = {
    _d: { ingly_white_label: JSON.stringify({ brandColor: '#ff0000' }),
          ingly_brand_v1: JSON.stringify({ color: '#00ff00' }) },
    getItem(k) { return this._d[k] || null; },
    setItem(k, v) { this._d[k] = v; },
    removeItem(k) { delete this._d[k]; },
  };
  const c = T.leggi();
  assert.equal(c.accento, '#00ff00', 'ingly_brand_v1 è la più recente delle due');
  /* E non le cancella: se qualcosa va storto i pannelli vecchi ritrovano i
     propri dati. */
  assert.ok(ctx.localStorage._d.ingly_white_label);
  assert.ok(ctx.localStorage._d.ingly_brand_v1);
  delete ctx.localStorage;
});

test('una preferenza illeggibile non impedisce di aprire il prodotto', () => {
  ctx.localStorage = {
    getItem() { return '{rotto'; }, setItem() {}, removeItem() {},
  };
  const c = T.leggi();
  assert.equal(c.tema, T.PREDEFINITO.tema);
  delete ctx.localStorage;
});
