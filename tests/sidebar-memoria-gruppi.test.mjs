/**
 * La memoria dei gruppi della sidebar: quel che si scrive si deve rileggere.
 *
 * `writeSet` serializzava con `[].slice.call(set)`. Un `Set` non ha `length`, e
 * `Array.prototype.slice` su un oggetto senza `length` restituisce un array
 * vuoto: la scrittura riusciva, il JSON era valido, e il contenuto era sempre
 * `[]`. Nessun gruppo compresso a mano è mai sopravvissuto a un ricaricamento.
 *
 * Il controllo esercita le due funzioni vere, estratte dal sorgente, invece di
 * fidarsi di una rilettura del codice.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sorgente = fs.readFileSync('src/app-shell/sidebar.js', 'utf8');

function estrai(nome) {
  const inizio = sorgente.indexOf(`  function ${nome}(`);
  assert.notEqual(inizio, -1, `${nome} non esiste più nel sorgente`);
  const fine = sorgente.indexOf('\n  }\n', inizio);
  assert.notEqual(fine, -1, `${nome} non si chiude come previsto`);
  return sorgente.slice(inizio, fine + 4);
}

function ambiente() {
  const archivio = new Map();
  const contesto = vm.createContext({
    localStorage: {
      getItem: (k) => (archivio.has(k) ? archivio.get(k) : null),
      setItem: (k, v) => archivio.set(k, String(v)),
      removeItem: (k) => archivio.delete(k),
    },
    JSON,
    Set,
    Array,
    String,
  });
  vm.runInContext(estrai('readSet') + '\n' + estrai('writeSet'), contesto);
  return { contesto, archivio };
}

test('un insieme scritto si rilegge identico', () => {
  const { contesto } = ambiente();
  vm.runInContext(
    "writeSet('k', new Set(['workspace', 'lab'])); globalThis.riletto = [...readSet('k')];",
    contesto,
  );
  assert.equal(contesto.riletto.join(','), 'workspace,lab');
});

test('non si scrive un array vuoto al posto dei gruppi chiusi', () => {
  const { contesto, archivio } = ambiente();
  vm.runInContext("writeSet('k', new Set(['production']));", contesto);
  assert.equal(archivio.get('k'), '["production"]');
});

test('un insieme vuoto resta vuoto', () => {
  const { contesto, archivio } = ambiente();
  vm.runInContext("writeSet('k', new Set());", contesto);
  assert.equal(archivio.get('k'), '[]');
  vm.runInContext("globalThis.n = readSet('k').size;", contesto);
  assert.equal(contesto.n, 0);
});

test('una chiave assente o illeggibile non fa cadere la lettura', () => {
  const { contesto, archivio } = ambiente();
  vm.runInContext("globalThis.a = readSet('mai-scritta').size;", contesto);
  assert.equal(contesto.a, 0);
  archivio.set('rotta', '{non json');
  vm.runInContext("globalThis.b = readSet('rotta').size;", contesto);
  assert.equal(contesto.b, 0);
});
