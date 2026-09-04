/**
 * consuntivo.test.mjs — un registro solo per «com'è andata davvero».
 *
 * Il preventivatore 3D teneva i consuntivi in `p3d_consuntivo_v1`. Dare al
 * tessile un archivio suo sarebbe stato il quinto archivio doppio di questo
 * progetto: due posti per lo stesso concetto, che divergono in silenzio.
 *
 * Le domande di questi test: **si può perdere un consuntivo?** e **due moduli
 * possono pestarsi i piedi?**
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sorgente = fs.readFileSync('src/product/consuntivo.js', 'utf8');

/** Un localStorage finto, così ogni test parte pulito. */
function nuovo(iniziale = {}) {
  const dati = { ...iniziale };
  const contesto = vm.createContext({
    Math, JSON, Object, Array, Date, parseFloat, isFinite, isNaN, String,
    localStorage: {
      getItem: (k) => (k in dati ? dati[k] : null),
      setItem: (k, v) => { dati[k] = String(v); },
      removeItem: (k) => { delete dati[k]; },
    },
  });
  vm.runInContext(sorgente, contesto);
  return { C: contesto.InglyConsuntivo, dati };
}

/* ── Registrare e rileggere ─────────────────────────────────────────────── */

test('quel che si salva si rilegge', () => {
  const { C } = nuovo();
  C.salva('apparel', 7, { costo: 12.5, ore: 1.5 });
  assert.equal(C.leggi('apparel', 7).costo, 12.5);
  assert.equal(C.leggi('apparel', 7).ore, 1.5);
});

test('una commessa mai registrata torna vuota, non inventata', () => {
  const { C } = nuovo();
  assert.equal(Object.keys(C.leggi('apparel', 99)).length, 0);
  assert.equal(C.registrato('apparel', 99), false);
});

test('registrare un campo non cancella quelli di ieri', () => {
  const { C } = nuovo();
  C.salva('apparel', 7, { costo: 12.5, ore: 1.5 });
  C.salva('apparel', 7, { extra: 3 });
  const c = C.leggi('apparel', 7);
  assert.equal(c.costo, 12.5);
  assert.equal(c.ore, 1.5);
  assert.equal(c.extra, 3);
});

test('un campo messo a null si toglie: è come si corregge un errore', () => {
  const { C } = nuovo();
  C.salva('apparel', 7, { costo: 12.5, ore: 1.5 });
  C.salva('apparel', 7, { ore: null });
  const c = C.leggi('apparel', 7);
  assert.equal(c.costo, 12.5);
  assert.ok(!('ore' in c));
});

test('ogni salvataggio lascia quando è stato fatto', () => {
  const { C } = nuovo();
  const c = C.salva('apparel', 7, { costo: 1 });
  assert.ok(c.quando && !isNaN(new Date(c.quando).getTime()));
});

/* ── Due moduli, un registro ────────────────────────────────────────────── */

test('la riga 12 del 3D e la riga 12 del tessile non sono la stessa cosa', () => {
  const { C } = nuovo();
  C.salva('3d', 12, { costo: 5 });
  C.salva('apparel', 12, { costo: 40 });
  assert.equal(C.leggi('3d', 12).costo, 5);
  assert.equal(C.leggi('apparel', 12).costo, 40);
});

test('perModulo restituisce solo il suo modulo', () => {
  const { C } = nuovo();
  C.salva('3d', 1, { costo: 5 });
  C.salva('apparel', 2, { costo: 40 });
  assert.equal(Object.keys(C.perModulo('3d')).join(), '1');
  assert.equal(Object.keys(C.perModulo('apparel')).join(), '2');
});

test('e li restituisce indicizzati per id, senza il prefisso', () => {
  const { C } = nuovo();
  C.salva('apparel', 42, { costo: 9 });
  assert.equal(C.perModulo('apparel')['42'].costo, 9);
});

test('un modulo senza consuntivi non è un errore', () => {
  const { C } = nuovo();
  assert.equal(Object.keys(C.perModulo('laser')).length, 0);
});

/* ── «Registrato» distingue il nulla dallo zero ─────────────────────────── */

test('un consuntivo aperto e chiuso senza scrivere niente non è registrato', () => {
  const { C } = nuovo();
  C.salva('apparel', 7, {});
  assert.equal(C.registrato('apparel', 7), false, 'solo `quando`: non è un consuntivo');
});

test('un costo reale di zero è un dato, non un vuoto', () => {
  const { C } = nuovo();
  C.salva('apparel', 7, { costo: 0 });
  assert.equal(C.registrato('apparel', 7), true);
});

test('una stringa vuota non conta come registrata', () => {
  const { C } = nuovo();
  C.salva('apparel', 7, { costo: '' });
  assert.equal(C.registrato('apparel', 7), false);
});

/* ── Migrazione dal 3D ──────────────────────────────────────────────────── */

test('i consuntivi del vecchio archivio 3D vengono assorbiti', () => {
  const { C } = nuovo({ p3d_consuntivo_v1: JSON.stringify({ 3: { costo: 7 }, 9: { costo: 11 } }) });
  assert.equal(C.leggi('3d', 3).costo, 7);
  assert.equal(C.leggi('3d', 9).costo, 11);
});

test('e non finiscono sotto il modulo sbagliato', () => {
  const { C } = nuovo({ p3d_consuntivo_v1: JSON.stringify({ 3: { costo: 7 } }) });
  assert.equal(Object.keys(C.perModulo('apparel')).length, 0);
});

test('il vecchio archivio non viene svuotato', () => {
  const { C, dati } = nuovo({ p3d_consuntivo_v1: JSON.stringify({ 3: { costo: 7 } }) });
  C.leggi('3d', 3);
  assert.ok(dati.p3d_consuntivo_v1.includes('"costo":7'));
});

test('la migrazione non gira due volte: un consuntivo cancellato resta cancellato', () => {
  const { C } = nuovo({ p3d_consuntivo_v1: JSON.stringify({ 3: { costo: 7 } }) });
  assert.equal(C.leggi('3d', 3).costo, 7);
  C.cancella('3d', 3);
  assert.equal(C.registrato('3d', 3), false, 'tornerebbe se la migrazione ripartisse');
});

test('se la scrittura fallisce la migrazione non si segna fatta', () => {
  /* Se si segnasse fatta comunque, i consuntivi resterebbero nel vecchio
     archivio per sempre: non si riproverebbe mai più. */
  const dati = { p3d_consuntivo_v1: JSON.stringify({ 3: { costo: 7 } }) };
  const contesto = vm.createContext({
    Math, JSON, Object, Array, Date, parseFloat, isFinite, isNaN, String,
    localStorage: {
      getItem: (k) => (k in dati ? dati[k] : null),
      setItem: (k, v) => {
        if (k === 'ingly_consuntivo_v1') throw new Error('QuotaExceededError');
        dati[k] = String(v);
      },
      removeItem: (k) => { delete dati[k]; },
    },
  });
  vm.runInContext(sorgente, contesto);
  const C = contesto.InglyConsuntivo;
  C.migra();
  assert.equal(dati.ingly_consuntivo_migrato_p3d, undefined, 'segnata fatta senza aver scritto niente');
});

test('la migrazione non sovrascrive un consuntivo più recente', () => {
  const { C } = nuovo({ p3d_consuntivo_v1: JSON.stringify({ 3: { costo: 7 } }) });
  C.salva('3d', 3, { costo: 99 });
  C.migra();
  assert.equal(C.leggi('3d', 3).costo, 99);
});

/* ── Dati rotti ─────────────────────────────────────────────────────────── */

test('un archivio illeggibile non fa crollare niente', () => {
  const { C } = nuovo({ ingly_consuntivo_v1: '{rotto', p3d_consuntivo_v1: 'nemmeno questo' });
  assert.equal(Object.keys(C.perModulo('3d')).length, 0);
  C.salva('3d', 1, { costo: 4 });
  assert.equal(C.leggi('3d', 1).costo, 4);
});

test('un archivio che contiene un array invece di un oggetto viene ignorato', () => {
  const { C } = nuovo({ ingly_consuntivo_v1: '[1,2,3]' });
  assert.equal(Object.keys(C.perModulo('3d')).length, 0);
});

test('cancellare una commessa che non esiste non è un errore', () => {
  const { C } = nuovo();
  C.cancella('apparel', 404);
  assert.equal(Object.keys(C.perModulo('apparel')).length, 0);
});

test('id numerico e id stringa sono la stessa commessa', () => {
  const { C } = nuovo();
  C.salva('apparel', 7, { costo: 3 });
  assert.equal(C.leggi('apparel', '7').costo, 3);
});
