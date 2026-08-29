/**
 * errors.test.mjs — il registro degli errori e l'archiviazione che non mente.
 *
 * Si esegue il file spedito, non una copia: `logger.js` viene valutato dentro
 * un finto `window`. Un test che gira su una riscrittura del codice non
 * dimostra nulla sul codice che l'utente riceve.
 *
 * La domanda a cui questi test rispondono è una sola: **può ancora capitare
 * che il software dica «salvato» quando il dato non c'è?**
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SORGENTE = fs.readFileSync('src/core/errors/logger.js', 'utf8');

/** Un localStorage finto di cui si può decidere il comportamento. */
function fintoArchivio(opzioni = {}) {
  const dati = new Map();
  return {
    dati,
    get length() { return dati.size; },
    key(i) { return [...dati.keys()][i]; },
    getItem(k) {
      if (opzioni.letturaRotta) throw new Error('lettura non disponibile');
      /* Il caso peggiore: la scrittura riesce e il dato non resta. */
      if (opzioni.scritturaFinta) return null;
      return dati.has(k) ? dati.get(k) : null;
    },
    setItem(k, v) {
      if (opzioni.quotaPiena) {
        const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e;
      }
      if (opzioni.scritturaFinta) return;   // accetta e non conserva
      dati.set(k, String(v));
    },
    removeItem(k) {
      if (opzioni.rimozioneRotta) throw new Error('non rimuovibile');
      dati.delete(k);
    },
  };
}

/** Valuta il modulo spedito in un contesto isolato e restituisce `Ingly`. */
function carica(opzioni = {}) {
  const ascoltatori = {};
  const toastRicevuti = [];
  const consoleErrori = [];
  const finestra = {
    localStorage: opzioni.senzaArchivio ? undefined : fintoArchivio(opzioni),
    addEventListener(tipo, fn) { (ascoltatori[tipo] = ascoltatori[tipo] || []).push(fn); },
    console: {
      error: (...a) => consoleErrori.push(a.join(' ')),
      log() {}, warn() {},
    },
    toast: opzioni.senzaToast ? undefined : ((m, t) => toastRicevuti.push({ m, t })),
    Promise,
    JSON,
    Date,
    Array,
    String,
  };
  finestra.window = finestra;
  finestra.globalThis = finestra;
  const contesto = vm.createContext(finestra);
  vm.runInContext(SORGENTE, contesto);
  return { Ingly: finestra.Ingly, ascoltatori, toastRicevuti, consoleErrori, finestra };
}

test('archiviazione che non mente', async (t) => {
  await t.test('una scrittura riuscita dichiara ok', () => {
    const { Ingly } = carica();
    const esito = Ingly.Storage.set('prova', { a: 1 });
    assert.equal(esito.ok, true);
    assert.equal(Ingly.Storage.get('prova').a, 1);
  });

  await t.test('spazio esaurito: NON dichiara salvato', () => {
    const { Ingly } = carica({ quotaPiena: true });
    const esito = Ingly.Storage.set('ordini', [1, 2, 3]);
    assert.equal(esito.ok, false, 'una scrittura fallita non può restituire ok');
    assert.equal(esito.motivo, 'spazio esaurito');
  });

  await t.test('spazio esaurito: registra e avvisa con un\'azione', () => {
    const { Ingly, toastRicevuti } = carica({ quotaPiena: true });
    Ingly.Storage.set('ordini', [1, 2, 3]);
    assert.ok(Ingly.Errors.conta() > 0, 'il fallimento dev\'essere registrato');
    assert.equal(toastRicevuti.length, 1);
    assert.match(toastRicevuti[0].m, /non è stato salvato/);
    assert.match(toastRicevuti[0].m, /libera spazio|backup/, 'l\'avviso deve dire cosa fare');
    assert.equal(toastRicevuti[0].t, 'error');
  });

  await t.test('scrittura accettata ma non conservata: la rilettura smaschera', () => {
    /* Il caso della navigazione privata: `setItem` non lancia e il dato non c'è.
       È il difetto che nessun try/catch potrebbe mai intercettare. */
    const { Ingly } = carica({ scritturaFinta: true });
    const esito = Ingly.Storage.set('ordini', [1]);
    assert.equal(esito.ok, false);
    assert.equal(esito.motivo, 'scritto ma non rileggibile');
  });

  await t.test('archiviazione assente: nessuna eccezione, nessuna bugia', () => {
    const { Ingly } = carica({ senzaArchivio: true });
    const esito = Ingly.Storage.set('x', 1);
    assert.equal(esito.ok, false);
    assert.equal(esito.motivo, 'archiviazione non disponibile');
    assert.equal(Ingly.Storage.get('x', 'ripiego'), 'ripiego');
  });

  await t.test('un dato non convertibile non passa per salvato', () => {
    const { Ingly } = carica();
    const ciclico = {}; ciclico.se = ciclico;
    const esito = Ingly.Storage.set('c', ciclico);
    assert.equal(esito.ok, false);
    assert.equal(esito.motivo, 'dato non convertibile');
  });

  await t.test('set non lancia mai — è ciò che rende inutile il catch vuoto', () => {
    for (const opz of [{}, { quotaPiena: true }, { senzaArchivio: true }, { scritturaFinta: true }]) {
      const { Ingly } = carica(opz);
      assert.doesNotThrow(() => Ingly.Storage.set('k', { v: 1 }));
    }
  });

  await t.test('get restituisce il ripiego se la lettura è rotta, e lo registra', () => {
    const { Ingly } = carica({ letturaRotta: true });
    assert.equal(Ingly.Storage.get('k', 'def'), 'def');
    assert.ok(Ingly.Errors.conta() > 0);
  });

  await t.test('una chiave storica con testo semplice non è un errore', () => {
    const { Ingly } = carica();
    Ingly.Storage.set('tema', 'dark');
    assert.equal(Ingly.Storage.get('tema'), 'dark');
    assert.equal(Ingly.Errors.conta(), 0, 'il testo non-JSON non deve sporcare il registro');
  });
});

test('registro degli errori', async (t) => {
  await t.test('conserva origine, messaggio e momento', () => {
    const { Ingly } = carica();
    const v = Ingly.Errors.log('prova', new Error('rotto'), { id: 7 });
    assert.equal(v.origine, 'prova');
    assert.equal(v.messaggio, 'rotto');
    assert.equal(v.dettaglio.id, 7);
    assert.ok(v.quando);
  });

  await t.test('non cresce senza limite', () => {
    const { Ingly } = carica();
    for (let i = 0; i < 500; i += 1) Ingly.Errors.log('ciclo', 'errore ' + i);
    assert.equal(Ingly.Errors.conta(), 200, 'il registro ha un tetto');
    const ultimi = Ingly.Errors.elenco();
    assert.match(ultimi[ultimi.length - 1].messaggio, /errore 499/, 'si conservano i più recenti');
  });

  await t.test('cattura gli errori non gestiti della finestra', () => {
    const { Ingly, ascoltatori } = carica();
    ascoltatori.error[0]({ error: new Error('esploso'), filename: 'a.js', lineno: 12 });
    const v = Ingly.Errors.elenco().pop();
    assert.equal(v.origine, 'window.onerror');
    assert.equal(v.messaggio, 'esploso');
    assert.equal(v.dettaglio.riga, 12);
  });

  await t.test('cattura i rifiuti di promise non gestiti', () => {
    const { Ingly, ascoltatori } = carica();
    ascoltatori.unhandledrejection[0]({ reason: new Error('nessuno mi ascolta') });
    assert.equal(Ingly.Errors.elenco().pop().origine, 'promise');
  });

  await t.test('cattura console.error senza sopprimerlo', () => {
    const { Ingly, consoleErrori, finestra } = carica();
    finestra.console.error('qualcosa è andato storto');
    assert.equal(consoleErrori.length, 1, 'la console deve continuare a ricevere');
    assert.equal(Ingly.Errors.elenco().pop().origine, 'console');
  });

  await t.test('lo stack si conserva ma non finisce mai nell\'avviso all\'utente', () => {
    const { Ingly, toastRicevuti } = carica();
    Ingly.Errors.log('x', new Error('interno'));
    assert.ok(Ingly.Errors.elenco().pop().stack, 'lo stack serve a chi sviluppa');
    Ingly.Errors.avvisa('Non è stato possibile salvare', 'riprova fra poco');
    assert.equal(toastRicevuti.length, 1);
    assert.doesNotMatch(toastRicevuti[0].m, /at |\.js:/, 'nessuno stack all\'utente');
  });

  await t.test('l\'esportazione è testo leggibile', () => {
    const { Ingly } = carica();
    Ingly.Errors.log('modulo', 'guasto');
    assert.match(Ingly.Errors.esporta(), /\[modulo\]\s+guasto/);
  });

  await t.test('installarsi due volte non raddoppia nulla', () => {
    const { Ingly, finestra, ascoltatori } = carica();
    Ingly.Errors.log('prima', 'x');
    vm.runInContext(SORGENTE, vm.createContext(finestra));
    assert.equal(finestra.Ingly.Errors.conta(), 1, 'il registro non si azzera né si duplica');
    assert.equal(ascoltatori.error.length, 1, 'nessun secondo ascoltatore');
  });
});

test('safeAsync', async (t) => {
  await t.test('un successo arriva come ok con il valore', async () => {
    const { Ingly } = carica();
    const f = Ingly.safeAsync('carica', async () => 42);
    /* Confronto campo per campo: l'oggetto nasce dentro il contesto isolato e
       ha un prototipo diverso, che `deepEqual` conta come differenza. */
    const esito = await f();
    assert.equal(esito.ok, true);
    assert.equal(esito.valore, 42);
  });

  await t.test('un rifiuto non resta muto e non si propaga', async () => {
    const { Ingly } = carica();
    const f = Ingly.safeAsync('carica', async () => { throw new Error('rete assente'); });
    const esito = await f();
    assert.equal(esito.ok, false);
    assert.equal(esito.motivo, 'rete assente');
    assert.equal(Ingly.Errors.elenco().pop().origine, 'carica');
  });

  await t.test('anche un lancio sincrono viene assorbito', async () => {
    const { Ingly } = carica();
    const f = Ingly.safeAsync('sync', () => { throw new Error('subito'); });
    assert.equal((await f()).ok, false);
  });
});

test('il codice spedito contiene il registro', () => {
  const dist = fs.readFileSync('dist/INGLY-OS.html', 'utf8');
  assert.ok(dist.includes('Ingly.Errors = Errors'), 'il registro deve essere nel file consegnato');
  assert.ok(
    dist.indexOf('Ingly.Errors = Errors') < dist.indexOf('__inglyGuard'),
    'il registro deve precedere la guardia sullo spazio, che gli riferisce i fallimenti'
  );
});
