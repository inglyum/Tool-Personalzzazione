/**
 * cost-audit.test.mjs — un vocabolario solo per «da dove viene questo numero».
 *
 * Misurato prima di scrivere: la stessa domanda aveva **tre risposte diverse**
 * nell'applicazione.
 *
 *   il motore        `fonte`: inventory, configurato, inserito, default,
 *                    stima, calcolato, mancante
 *   Product Builder  una tabella privata che traduceva `fonte` in italiano
 *   Smart Quoter 3D  una seconda tabella privata che traduceva `confidence`
 *                    — un'altra scala — in un terzo insieme di parole
 *
 * Tre tabelle divergono. Lo stesso valore era «Stimato» in una schermata e
 * «stimato» in un'altra, su scale che non coincidevano, e nessuna delle due
 * era in torto. Adesso la traduzione sta in un posto solo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('src/product/cost-audit.js', 'utf8'), sandbox);
const E = sandbox.window.InglyCostEngine;
const A = sandbox.window.InglyCostAudit;

test('il modulo si espone', () => {
  assert.ok(A);
  ['fonte', 'confidenza', 'righe', 'riepilogo', 'pannello'].forEach((f) => {
    assert.equal(typeof A[f], 'function', 'manca ' + f);
  });
});

/* ── Le due lingue del motore, una sola in uscita ────────────────────────── */

test('ogni fonte che il motore scrive nel codice ha una traduzione', () => {
  /* Non un elenco scritto a mano: i nomi si leggono dal motore. Un elenco a
     mano invecchia in silenzio — è così che «scelta commerciale» e
     «normativa» sono rimaste senza traduzione fino a comparire in schermo
     come «Non dichiarata» accanto ai due numeri che invece si sanno con
     certezza: il margine scelto e l'aliquota di legge. */
  const motore = fs.readFileSync('src/product/cost-engine.js', 'utf8');
  const nomi = new Set();
  for (const m of motore.matchAll(/fonte:\s*'([^']+)'/g)) nomi.add(m[1]);
  assert.ok(nomi.size >= 4, 'il motore non dichiara fonti riconoscibili: ' + [...nomi]);
  for (const f of nomi) {
    assert.notEqual(A.fonte(f).etichetta, 'Non dichiarata', 'la fonte «' + f + '» non è tradotta');
  }
});

test('e le fonti storiche restano tradotte', () => {
  for (const f of ['inventory', 'configurato', 'inserito', 'default', 'stima', 'calcolato', 'mancante']) {
    const t = A.fonte(f);
    assert.notEqual(t.etichetta, 'Non dichiarata', 'la fonte «' + f + '» non è tradotta');
    assert.ok(A.LIVELLI[t.livello], 'la fonte «' + f + '» ha un livello sconosciuto');
  }
});

test('ogni confidenza del motore ha una traduzione', () => {
  for (const c of ['verified', 'declared', 'estimated', 'missing']) {
    const t = A.confidenza(c);
    assert.notEqual(t.etichetta, 'Non dichiarata', 'la confidenza «' + c + '» non è tradotta');
    assert.ok(A.LIVELLI[t.livello]);
  }
});

test('le due lingue finiscono sulla stessa scala', () => {
  /* È il punto di tutto il file: `fonte` e `confidence` sono due domande
     diverse, ma la risposta che l'utente legge deve stare su una scala sola. */
  const livelli = Object.keys(A.LIVELLI);
  Object.values(A.FONTI).forEach((f) => assert.ok(livelli.includes(f.livello), f.etichetta));
  Object.values(A.CONFIDENZE).forEach((c) => assert.ok(livelli.includes(c.livello), c.etichetta));
});

test('una fonte sconosciuta si dichiara tale, non si indovina', () => {
  const t = A.fonte('qualcosa_di_nuovo');
  assert.equal(t.etichetta, 'Non dichiarata');
  assert.equal(t.livello, 'mancante');
  /* «Manuale» su un numero di cui non si sa niente sarebbe una bugia comoda. */
  assert.ok(/non ha detto/.test(t.spiega));
});

test('ogni livello ha un colore e un nome', () => {
  Object.entries(A.LIVELLI).forEach(([id, l]) => {
    assert.ok(/^#|var\(/.test(l.colore), id + ': colore mancante');
    assert.ok(l.label && l.label.length > 3, id + ': nome mancante');
    assert.equal(typeof l.peso, 'number');
  });
});

test('i pesi ordinano dal più affidabile al meno', () => {
  const L = A.LIVELLI;
  assert.ok(L.reale.peso < L.calcolato.peso);
  assert.ok(L.calcolato.peso < L.manuale.peso);
  assert.ok(L.manuale.peso < L.stima.peso);
  assert.ok(L.stima.peso < L.mancante.peso);
});

/* ── Le righe di explain() ───────────────────────────────────────────────── */

const INGRESSO = {
  tecnologia: 'print3d', qty: 1, grams: 250, hours: 9.95,
  materialPricePerKg: 24, watt: 150, kwhPrice: 0.28,
  machinePrice: 420, machineLifeHours: 4000, laborPerHour: 18, setupMin: 15,
};
const X = E.explain(INGRESSO, { marginePct: 40, ivaPct: 22 });

test('explain produce righe traducibili', () => {
  const r = A.righe(X);
  assert.ok(r.length > 5, 'poche righe: ' + r.length);
  r.forEach((v) => {
    assert.ok(v.fonte && v.fonte.etichetta, 'riga senza fonte: ' + v.id);
    assert.equal(typeof v.valore, 'number');
  });
});

test('soloCosto tiene fuori prezzo e profitto', () => {
  /* La «provenienza» di un margine è una decisione, non un dato: metterla
     accanto a quella del costo del materiale confonde due cose diverse. */
  const tutte = A.righe(X);
  const costi = A.righe(X, { soloCosto: true });
  assert.ok(costi.length < tutte.length);
  costi.forEach((v) => {
    assert.ok(['una tantum', 'per pezzo', 'costo'].includes(v.gruppo), v.gruppo);
  });
});

/* ── Il conteggio, che è la domanda vera ─────────────────────────────────── */

test('il riepilogo conta quante voci non poggiano su un dato dichiarato', () => {
  const r = A.riepilogo(X);
  assert.ok(r.voci > 0);
  assert.equal(typeof r.daVerificare, 'number');
  assert.ok(r.frase.length > 20);
  assert.equal(r.daVerificare, r.perLivello.stima + r.perLivello.mancante);
});

test('un costo tutto dichiarato lo dice, e non inventa un giudizio', () => {
  const r = A.riepilogo(X);
  if (r.daVerificare === 0) {
    assert.ok(/Tutte le \d+ voci/.test(r.frase), r.frase);
  } else {
    assert.ok(/\d+ voci su \d+/.test(r.frase), r.frase);
  }
  /* Nessun «va bene» o «attenzione»: la frase dice i numeri, il colore dice
     il resto, e il giudizio lo dà chi legge. */
  assert.ok(!/ottimo|buono|attenzione|male/i.test(r.frase), r.frase);
});

test('un preventivo con valori stimati alza il conteggio', () => {
  /* Senza il prezzo del materiale il motore non può che stimare o dichiarare
     mancante: il conteggio deve accorgersene. */
  const povero = E.explain({ tecnologia: 'print3d', qty: 1, grams: 250, hours: 9.95 },
    { marginePct: 40 });
  const a = A.riepilogo(X);
  const b = A.riepilogo(povero);
  assert.ok(b.daVerificare >= a.daVerificare,
    'un preventivo con meno dati non risulta meno affidabile: ' + b.frase);
});

test('un explain vuoto non fa esplodere niente', () => {
  /* `.length` e non `deepEqual`: il modulo gira in una realm `vm` e i suoi
     array hanno un prototipo diverso da quelli di qui. */
  assert.equal(A.righe(null).length, 0);
  assert.equal(A.righe({ vuoto: true }).length, 0);
  const r = A.riepilogo(null);
  assert.equal(r.voci, 0);
  assert.ok(/Nessuna voce/.test(r.frase));
});

/* ── Il disegno ──────────────────────────────────────────────────────────── */

test('la pastiglia passa da esc()', () => {
  const html = A.pastiglia(A.fonte('inventory'));
  assert.ok(/Magazzino/.test(html));
  assert.ok(!/<script/.test(A.pastiglia({ etichetta: '<script>x</script>', colore: '#fff', spiega: '' })));
});

test('il pannello disegna le righe con la loro provenienza', () => {
  const html = A.pannello(X);
  assert.ok(html.length > 200);
  assert.ok(/voci/.test(html), 'manca il riepilogo');
});

test('il pannello di un calcolo vuoto lo dice', () => {
  assert.ok(/Nessun dettaglio/.test(A.pannello(null)));
});

/* ── Le due viste hanno smesso di avere una tabella propria ──────────────── */

test('il Product Builder non traduce più le fonti da sé', () => {
  const t = fs.readFileSync('src/product/product-builder.js', 'utf8');
  assert.ok(!/const FONTI = \{/.test(t), 'la tabella privata è ancora lì');
  assert.ok(/InglyCostAudit/.test(t), 'non usa il modulo condiviso');
});

test('il Quoter 3D non traduce più la fiducia da sé', () => {
  const t = fs.readFileSync('src/legacy/patches/108-var-print3dquoter-function.js', 'utf8');
  assert.ok(!/var CONF_ETICHETTA=\{/.test(t), 'la tabella privata è ancora lì');
  assert.ok(/InglyCostAudit/.test(t), 'non usa il modulo condiviso');
});

test('e il Quoter 3D mostra il conteggio delle voci da verificare', () => {
  const t = fs.readFileSync('src/legacy/patches/108-var-print3dquoter-function.js', 'utf8');
  assert.ok(/riepilogo\(x\)/.test(t), 'il pannello non chiede il conteggio');
  assert.ok(/rigaRiepilogo/.test(t), 'il conteggio non viene disegnato');
});

test('il modulo entra nella build', () => {
  const idx = fs.readFileSync('src/product/index.mjs', 'utf8');
  assert.ok(/'cost-audit\.js'/.test(idx));
});
