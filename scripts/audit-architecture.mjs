#!/usr/bin/env node
/**
 * audit-architecture.mjs — la fotografia strutturale del codice, misurata.
 *
 * La Fase 0 della specifica chiede diciassette censimenti. Farli a occhio su
 * 9,5 MB di codice storico produce numeri inventati: qui si contano davvero,
 * e il conteggio si può rifare dopo ogni consolidamento per vedere se la
 * complessità scende invece di spostarsi.
 *
 *   node scripts/audit-architecture.mjs            → riepilogo a schermo
 *   node scripts/audit-architecture.mjs --json     → dato grezzo
 */
import fs from 'node:fs';
import path from 'node:path';

const RADICE = 'src';
const sorgenti = [];

(function raccogli(dir) {
  for (const voce of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, voce.name);
    if (voce.isDirectory()) raccogli(p);
    else if (/\.(js|mjs|css)$/.test(voce.name)) sorgenti.push(p);
  }
})(RADICE);

const leggi = (p) => fs.readFileSync(p, 'utf8');

/* I conteggi di pattern vanno fatti sul codice, non sui commenti che lo
   descrivono. Senza questo passaggio lo strumento contava fra i difetti anche
   la propria documentazione: due `catch {}` citati per spiegare perché non si
   devono scrivere. Uno strumento di misura che misura sé stesso non serve.

   Non è un parser: le sequenze dentro le stringhe restano, e va bene così —
   il costo di sbagliare in eccesso è un numero leggermente alto, quello di
   usare un parser è una dipendenza per contare le graffe. */
function soloCodice(testo) {
  return testo
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((r) => (/^\s*(\/\/|\*)/.test(r) ? '' : r))
    .join('\n');
}
const js = sorgenti.filter((p) => /\.(js|mjs)$/.test(p));
const css = sorgenti.filter((p) => /\.css$/.test(p));

/* Un accumulatore che tiene traccia di dove ha visto ogni cosa: senza il
   file di provenienza un conteggio non è azionabile. */
function indice() {
  const m = new Map();
  return {
    aggiungi(chiave, file) {
      if (!m.has(chiave)) m.set(chiave, new Set());
      m.get(chiave).add(file);
    },
    /** Le chiavi viste in più di un file: è lì che vive la duplicazione. */
    multipli() {
      return [...m.entries()]
        .filter(([, f]) => f.size > 1)
        .sort((a, b) => b[1].size - a[1].size)
        .map(([k, f]) => ({ chiave: k, file: f.size, dove: [...f] }));
    },
    tutti() { return [...m.entries()].map(([k, f]) => ({ chiave: k, file: f.size, dove: [...f] })); },
    dimensione() { return m.size; },
  };
}

const R = {
  sezioni: indice(),
  globali: indice(),
  render: indice(),
  funzioni: indice(),
  storeLocal: indice(),
  storeIDB: indice(),
  selettoriCss: indice(),
};

const conteggi = {
  override: [],        // riassegnazioni di una funzione già definita altrove
  observer: [],
  timer: [],
  listener: 0,
  onclickInline: 0,
  emoji: [],
  catchVuoti: [],
  important: [],
  dalDom: [],          // calcoli che leggono valori dal DOM
};

/* Emoji nelle interfacce operative: si cercano nei letterali di stringa, non
   nei commenti, perché un commento con un'emoji non finisce sullo schermo. */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

for (const file of js) {
  const grezzo = leggi(file);
  const testo = soloCodice(grezzo);
  const righe = grezzo.split('\n');

  // ── API globali dichiarate ──────────────────────────────────────────────
  for (const m of testo.matchAll(/^(?:\s*)(?:window|global)\.([A-Z][\w$]*)\s*=/gm)) R.globali.aggiungi(m[1], file);
  for (const m of testo.matchAll(/^(?:var|const|let)\s+([A-Z][\w$]*)\s*=\s*\(?function|^(?:var|const|let)\s+([A-Z][\w$]*)\s*=\s*\{/gm)) {
    const n = m[1] || m[2];
    if (n) R.globali.aggiungi(n, file);
  }

  // ── Funzioni dichiarate (nome → file) ───────────────────────────────────
  for (const m of testo.matchAll(/^\s*function\s+([\w$]+)\s*\(/gm)) R.funzioni.aggiungi(m[1], file);

  // ── Funzioni di render ──────────────────────────────────────────────────
  for (const m of testo.matchAll(/(?:^|\.)\s*(_?render[\w$]*)\s*[:(=]/gm)) R.render.aggiungi(m[1], file);

  // ── Sezioni ─────────────────────────────────────────────────────────────
  for (const m of testo.matchAll(/['"`]view-([a-z0-9_]+)['"`]/g)) R.sezioni.aggiungi(m[1], file);

  // ── Store ───────────────────────────────────────────────────────────────
  for (const m of testo.matchAll(/localStorage\.(?:get|set|remove)Item\(\s*['"`]([^'"`]+)['"`]/g)) R.storeLocal.aggiungi(m[1], file);
  for (const m of testo.matchAll(/(?:objectStore|createObjectStore|transaction)\(\s*['"`]([^'"`]+)['"`]/g)) R.storeIDB.aggiungi(m[1], file);
  for (const m of testo.matchAll(/idbGet|idbSet|IDB\.(?:get|set)\(\s*['"`]([^'"`]+)['"`]/g)) { if (m[1]) R.storeIDB.aggiungi(m[1], file); }

  // ── Override: riassegnazione di una funzione/oggetto già esistente ──────
  for (const m of testo.matchAll(/^\s*(?:var\s+)?(?:_?(?:orig|old|prev|base)[\w$]*)\s*=\s*([\w$.]+)\s*;/gm)) {
    conteggi.override.push({ file, simbolo: m[1] });
  }
  for (const m of testo.matchAll(/^\s*([\w$]+)\.(prototype\.)?([\w$]+)\s*=\s*function/gm)) {
    if (/^(App|window|global)$/.test(m[1])) conteggi.override.push({ file, simbolo: m[1] + '.' + m[3] });
  }

  // ── Observer, timer, listener ───────────────────────────────────────────
  const nObs = (testo.match(/new MutationObserver/g) || []).length;
  if (nObs) conteggi.observer.push({ file, n: nObs });
  const nInt = (testo.match(/setInterval\s*\(/g) || []).length;
  if (nInt) conteggi.timer.push({ file, n: nInt });
  conteggi.listener += (testo.match(/addEventListener\s*\(/g) || []).length;
  conteggi.onclickInline += (testo.match(/onclick\s*=\s*["'\\]/g) || []).length;

  /* ── catch che non gestiscono ────────────────────────────────────────────
     Un commento non gestisce un errore, quindi `catch(e){ /* nota *\/ }`
     inghiotte quanto `catch(e){}`. Ma non sono la stessa cosa da correggere:
     il primo è una scelta spiegata, il secondo una distrazione. Si contano
     separati — nel totale che conta per l'utente finiscono entrambi. */
  const senzaIstruzioni = (testo.match(/catch\s*(?:\([\w$]*\))?\s*\{\s*\}/g) || []).length;
  const nudi = (grezzo.match(/catch\s*(?:\([\w$]*\))?\s*\{\s*\}/g) || []).length;
  if (senzaIstruzioni) {
    conteggi.catchVuoti.push({ file, n: senzaIstruzioni, nudi: nudi, documentati: Math.max(0, senzaIstruzioni - nudi) });
  }

  // ── Emoji nelle stringhe ────────────────────────────────────────────────
  let nEmoji = 0;
  for (const r of righe) {
    if (/^\s*(\/\/|\/\*|\*)/.test(r)) continue;
    for (const m of r.matchAll(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g)) if (EMOJI.test(m[0])) nEmoji += 1;
  }
  if (nEmoji) conteggi.emoji.push({ file, n: nEmoji });

  // ── Calcoli che leggono dal DOM ─────────────────────────────────────────
  const nDom = (testo.match(/parseFloat\s*\(\s*(?:document\.getElementById|[\w$]+\.value|eid\()/g) || []).length;
  if (nDom) conteggi.dalDom.push({ file, n: nDom });
}

for (const file of css) {
  const testo = leggi(file);
  const nImp = (testo.match(/!important/g) || []).length;
  if (nImp) conteggi.important.push({ file, n: nImp });
  for (const m of testo.matchAll(/^\s*([.#][\w-]+)[^{]*\{/gm)) R.selettoriCss.aggiungi(m[1], file);
}

/* I file js portano CSS dentro le stringhe: è la fonte di conflitto più
   difficile da vedere, quindi si conta anche quello. */
for (const file of js) {
  const testo = soloCodice(leggi(file));
  const nImp = (testo.match(/!important/g) || []).length;
  if (nImp) conteggi.important.push({ file, n: nImp, inStringa: true });
}

const somma = (a) => a.reduce((t, x) => t + x.n, 0);

const esito = {
  file: { totali: sorgenti.length, js: js.length, css: css.length },
  sezioni: R.sezioni.dimensione(),
  globali: { totali: R.globali.dimensione(), duplicati: R.globali.multipli().length },
  funzioniDuplicate: R.funzioni.multipli(),
  renderDuplicati: R.render.multipli(),
  storeLocal: { chiavi: R.storeLocal.dimensione(), scritteDaPiuFile: R.storeLocal.multipli().length },
  storeIDB: { store: R.storeIDB.dimensione(), scrittiDaPiuFile: R.storeIDB.multipli().length },
  selettoriCssDuplicati: R.selettoriCss.multipli().length,
  override: conteggi.override.length,
  observer: { file: conteggi.observer.length, totali: somma(conteggi.observer) },
  timer: { file: conteggi.timer.length, totali: somma(conteggi.timer) },
  listener: conteggi.listener,
  onclickInline: conteggi.onclickInline,
  emoji: { file: conteggi.emoji.length, totali: somma(conteggi.emoji) },
  catchVuoti: {
    file: conteggi.catchVuoti.length,
    totali: somma(conteggi.catchVuoti),
    nudi: conteggi.catchVuoti.reduce(function (t, x) { return t + (x.nudi || 0); }, 0),
    documentati: conteggi.catchVuoti.reduce(function (t, x) { return t + (x.documentati || 0); }, 0),
  },
  important: { file: conteggi.important.length, totali: somma(conteggi.important) },
  calcoliDalDom: { file: conteggi.dalDom.length, totali: somma(conteggi.dalDom) },
  dettaglio: {
    globaliDuplicati: R.globali.multipli().slice(0, 25),
    funzioniDuplicate: R.funzioni.multipli().slice(0, 30),
    renderDuplicati: R.render.multipli().slice(0, 20),
    storeLocalCondivisi: R.storeLocal.multipli().slice(0, 25),
    storeIDB: R.storeIDB.tutti().sort((a, b) => b.file - a.file).slice(0, 30),
    observer: conteggi.observer.sort((a, b) => b.n - a.n).slice(0, 15),
    timer: conteggi.timer.sort((a, b) => b.n - a.n).slice(0, 15),
    emoji: conteggi.emoji.sort((a, b) => b.n - a.n).slice(0, 15),
    catchVuoti: conteggi.catchVuoti.sort((a, b) => b.n - a.n).slice(0, 15),
    important: conteggi.important.sort((a, b) => b.n - a.n).slice(0, 15),
    calcoliDalDom: conteggi.dalDom.sort((a, b) => b.n - a.n).slice(0, 15),
  },
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(esito, null, 2));
} else {
  const riga = (etichetta, valore, nota) =>
    console.log('  ' + String(etichetta).padEnd(34) + String(valore).padStart(7) + (nota ? '   ' + nota : ''));

  console.log('\nAUDIT ARCHITETTURALE — ' + esito.file.totali + ' file sorgente\n');
  console.log('COMPLESSITÀ ACCIDENTALE');
  riga('override / monkey patch', esito.override, 'riassegnazioni di funzioni esistenti');
  riga('funzioni con lo stesso nome', esito.funzioniDuplicate.length, 'in più file');
  riga('render con lo stesso nome', esito.renderDuplicati.length, 'in più file');
  riga('API globali dichiarate', esito.globali.totali, esito.globali.duplicati + ' in più file');
  riga('MutationObserver', esito.observer.totali, 'in ' + esito.observer.file + ' file');
  riga('setInterval', esito.timer.totali, 'in ' + esito.timer.file + ' file');
  riga('addEventListener', esito.listener);
  riga('onclick in linea', esito.onclickInline);

  console.log('\nDATI');
  riga('sezioni (view-*)', esito.sezioni);
  riga('chiavi localStorage', esito.storeLocal.chiavi, esito.storeLocal.scritteDaPiuFile + ' scritte da più file');
  riga('store IndexedDB', esito.storeIDB.store, esito.storeIDB.scrittiDaPiuFile + ' scritti da più file');
  riga('catch che non gestiscono', esito.catchVuoti.totali,
    esito.catchVuoti.nudi + ' nudi · ' + esito.catchVuoti.documentati + ' con spiegazione · in ' + esito.catchVuoti.file + ' file');
  riga('calcoli letti dal DOM', esito.calcoliDalDom.totali, 'in ' + esito.calcoliDalDom.file + ' file');

  console.log('\nPRESENTAZIONE');
  riga('!important', esito.important.totali, 'in ' + esito.important.file + ' file');
  riga('selettori CSS in più fogli', esito.selettoriCssDuplicati);
  riga('emoji in stringhe di UI', esito.emoji.totali, 'in ' + esito.emoji.file + ' file');

  console.log('\n  --json per il dettaglio con i file di provenienza\n');
}
