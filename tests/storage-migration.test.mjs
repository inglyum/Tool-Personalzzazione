import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/**
 * Il consolidamento dello storage è il punto in cui si perdono i dati di un
 * laboratorio. La versione precedente lo faceva davvero: prometteva un'unione
 * e ne sceglieva una sola, scartando in silenzio i record presenti solo nella
 * versione più vecchia.
 *
 * Questi test eseguono **il codice che viene spedito**, estratto dalla patch e
 * fatto girare su un `localStorage` finto. Riscrivere qui la stessa logica
 * proverebbe solo che so copiare.
 */

const PATCH = 'src/legacy/patches/093-ingly-os-v37-task-force-best-version.js';

function sorgenteMigrazione() {
  const s = fs.readFileSync(PATCH, 'utf8');
  const i = s.indexOf('(function _storageConsolidate(){');
  assert.ok(i !== -1, 'la migrazione non si trova più in ' + PATCH);
  const fine = s.indexOf('\n})();', i);
  assert.ok(fine !== -1, 'fine della migrazione non trovata');
  return s.slice(i, fine + '\n})();'.length);
}

/** localStorage minimo: quel che serve alla migrazione, niente di più. */
function magazzinoFinto(iniziale = {}) {
  const m = new Map(Object.entries(iniziale).map(([k, v]) => [k, String(v)]));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    get _mappa() { return m; },
  };
}

const silenzio = { log() {}, warn() {}, error() {} };

function esegui(stato) {
  const ls = magazzinoFinto(stato);
  new Function('localStorage', 'console', sorgenteMigrazione())(ls, silenzio);
  return ls;
}

const leggi = (ls, k) => JSON.parse(ls.getItem(k) || 'null');

test('unisce invece di scegliere: un record presente solo nella versione vecchia sopravvive', () => {
  const ls = esegui({
    lb2b_catalog_v1: JSON.stringify([{ id: 'a', n: 'solo in v1' }, { id: 'c', n: 'vecchio' }]),
    lb2b_catalog_v23: JSON.stringify([{ id: 'b', n: 'solo in v23' }, { id: 'c', n: 'nuovo' }]),
  });
  const ids = leggi(ls, 'lb2b_catalog_v33').map((x) => x.id).sort();
  assert.deepEqual(ids, ['a', 'b', 'c']);
});

test('sulla stessa chiave vince la versione più recente', () => {
  const ls = esegui({
    lb2b_catalog_v1: JSON.stringify([{ id: 'c', n: 'vecchio' }]),
    lb2b_catalog_v23: JSON.stringify([{ id: 'c', n: 'nuovo' }]),
  });
  assert.equal(leggi(ls, 'lb2b_catalog_v33').find((x) => x.id === 'c').n, 'nuovo');
});

test('recupera ciò che la migrazione precedente aveva già scartato', () => {
  // Stato lasciato dalla v37: v33 esiste ma il record di sola-v1 non c'è più.
  const ls = esegui({
    lb2b_catalog_v1: JSON.stringify([{ id: 'perduto', n: 'scartato dalla v37' }]),
    lb2b_catalog_v23: JSON.stringify([{ id: 'b' }]),
    lb2b_catalog_v33: JSON.stringify([{ id: 'b' }]),
    _storage_migrated_v37: '1',
  });
  const ids = leggi(ls, 'lb2b_catalog_v33').map((x) => x.id);
  assert.ok(ids.includes('perduto'), 'il record perso non è stato recuperato');
});

test('prima di riscrivere lascia una copia di sicurezza', () => {
  const ls = esegui({
    lb2b_catalog_v1: JSON.stringify([{ id: 'a' }]),
    lb2b_catalog_v33: JSON.stringify([{ id: 'b' }]),
  });
  assert.deepEqual(leggi(ls, '_ckpt_lb2b_catalog_v33'), [{ id: 'b' }]);
});

test('un record senza chiave non viene scartato', () => {
  const ls = esegui({
    lb2b_catalog_v1: JSON.stringify([{ n: 'senza id' }]),
    lb2b_catalog_v23: JSON.stringify([{ id: 'b' }]),
  });
  assert.equal(leggi(ls, 'lb2b_catalog_v33').length, 2);
});

test('non riduce mai la destinazione', () => {
  // Origine più povera della destinazione: l'unione non deve impoverirla.
  const ls = esegui({
    lb2b_catalog_v33: JSON.stringify([{ id: 'a' }, { id: 'b' }, { id: 'c' }]),
    lb2b_catalog_v1: JSON.stringify([{ id: 'a' }]),
  });
  assert.equal(leggi(ls, 'lb2b_catalog_v33').length, 3);
});

test('è idempotente: rieseguirla non cambia nulla', () => {
  const stato = {
    lb2b_catalog_v1: JSON.stringify([{ id: 'a' }]),
    lb2b_catalog_v23: JSON.stringify([{ id: 'b' }]),
  };
  const primo = esegui(stato);
  const dopoUno = primo.getItem('lb2b_catalog_v33');

  // Si riparte dallo stato risultante, contrassegno compreso.
  const stato2 = Object.fromEntries(primo._mappa);
  const secondo = esegui(stato2);
  assert.equal(secondo.getItem('lb2b_catalog_v33'), dopoUno);
});

test('copre tutte e tre le famiglie con schema drift', () => {
  const ls = esegui({
    lb2b_machines_v1: JSON.stringify([{ id: 'm1' }]),
    lb2b_machines_v32: JSON.stringify([{ id: 'm2' }]),
    ingly_warehouse_v1: JSON.stringify([{ id: 'w1' }]),
    ingly_magazzino_v34: JSON.stringify([{ id: 'w2' }]),
  });
  assert.deepEqual(leggi(ls, 'lb2b_machines_v32').map((x) => x.id).sort(), ['m1', 'm2']);
  assert.deepEqual(leggi(ls, 'ingly_magazzino_v34').map((x) => x.id).sort(), ['w1', 'w2']);
});

test('le chiavi di origine non vengono cancellate: patch 076 legge ancora lb2b_catalog_v1', () => {
  const ls = esegui({
    lb2b_catalog_v1: JSON.stringify([{ id: 'a' }]),
    lb2b_catalog_v23: JSON.stringify([{ id: 'b' }]),
  });
  assert.notEqual(ls.getItem('lb2b_catalog_v1'), null);
});

/* ── La guardia sullo spazio ────────────────────────────────────────────── */

test('la guardia intercetta lo spazio esaurito e rilancia comunque', () => {
  const src = fs.readFileSync('src/core/storage/guard.js', 'utf8');

  // Storage finto che si satura dopo tre scritture.
  const dati = new Map();
  function Storage() {}
  Storage.prototype.setItem = function (k, v) {
    if (dati.size >= 3 && !dati.has(k)) {
      const e = new Error('pieno'); e.name = 'QuotaExceededError'; e.code = 22; throw e;
    }
    dati.set(k, String(v));
  };
  Storage.prototype.getItem = (k) => (dati.has(k) ? dati.get(k) : null);
  Storage.prototype.key = (i) => [...dati.keys()][i];
  Storage.prototype.removeItem = (k) => dati.delete(k);
  const ls = new Storage();
  Object.defineProperty(ls, 'length', { get: () => dati.size });

  const errori = [];
  const finestra = {
    Storage, localStorage: ls,
    console: { error: (m) => errori.push(String(m)), warn() {}, log() {} },
    document: null,
  };
  new Function('window', 'console', '(function(){' + src.replace('})(window);', '})(window);') + '})()')
    .call(null, finestra, finestra.console);

  ls.setItem('a', '1'); ls.setItem('b', '2'); ls.setItem('c', '3');

  let lanciata = null;
  try { ls.setItem('ordine', 'importante'); } catch (e) { lanciata = e.name; }

  assert.equal(lanciata, 'QuotaExceededError', 'la semantica deve restare: l\'errore si rilancia');
  assert.equal(ls.getItem('ordine'), null, 'il dato non c\'è, ed è proprio il punto');
  assert.ok(errori.some((m) => /Spazio esaurito/.test(m)), 'il fallimento non è stato segnalato');
  assert.ok(errori.some((m) => /ordine/.test(m)), 'il messaggio deve dire quale scrittura è fallita');
});

test('la guardia si installa una sola volta', () => {
  const src = fs.readFileSync('src/core/storage/guard.js', 'utf8');
  function Storage() {}
  Storage.prototype.setItem = function () {};
  const primo = Storage.prototype.setItem;
  const finestra = { Storage, localStorage: { length: 0 }, console: { error() {}, warn() {}, log() {} }, document: null };
  const esegui = () => new Function('window', '(function(){' + src + '})()').call(null, finestra);
  esegui();
  const dopoUno = Storage.prototype.setItem;
  esegui();
  assert.notEqual(dopoUno, primo, 'la prima installazione deve sostituire setItem');
  assert.equal(Storage.prototype.setItem, dopoUno, 'la seconda non deve incapsulare di nuovo');
});
