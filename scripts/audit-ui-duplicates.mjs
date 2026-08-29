#!/usr/bin/env node
/**
 * audit-ui-duplicates.mjs — quante volte il prodotto offre la stessa cosa.
 *
 * Guarda il **sorgente**, non il DOM: `tests/qa/duplicate-action-icons.mjs`
 * misura ciò che finisce a schermo, qui si misura ciò che il codice registra.
 * Servono entrambi, perché falliscono in modi diversi — un secondo gestore di
 * Ctrl+K non produce nessun nodo in più, e nessun conteggio del DOM lo vedrà.
 *
 * Il difetto che presidia è quello che questo progetto ha misurato più volte:
 * due sistemi che possiedono lo stesso concetto, ognuno corretto per conto suo
 * e sbagliato in coppia.
 *
 *   node scripts/audit-ui-duplicates.mjs
 *   node scripts/audit-ui-duplicates.mjs --json
 */
import fs from 'node:fs';
import path from 'node:path';

const RADICE = 'src';
const file = [];
(function raccogli(dir) {
  for (const v of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, v.name);
    if (v.isDirectory()) { if (v.name !== 'vendor') raccogli(p); }
    else if (/\.(js|mjs|html)$/.test(v.name)) file.push(p);
  }
})(RADICE);

function soloCodice(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n').map((r) => (/^\s*(\/\/|\*)/.test(r) ? '' : r)).join('\n');
}

/** Accumula chiave → file, per sapere non solo quanti ma dove. */
function indice() {
  const m = new Map();
  return {
    add(k, f, riga) {
      if (!m.has(k)) m.set(k, []);
      m.get(k).push({ file: f, riga });
    },
    multipli(soglia = 1) {
      return [...m.entries()]
        .filter(([, v]) => v.length > soglia)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([k, v]) => ({ chiave: k, volte: v.length, dove: v.slice(0, 4) }));
    },
    dimensione() { return m.size; },
  };
}

const R = {
  idHtml: indice(),
  scorciatoie: indice(),
  gestoriTasti: indice(),
  modali: indice(),
  cassetti: indice(),
  barreRicerca: indice(),
  palette: indice(),
};

/* Le scorciatoie globali: una sola registrazione per combinazione. Un secondo
   gestore non rompe niente in modo visibile — apre due pannelli, o ne apre uno
   e ne chiude un altro — ed è per questo che sopravvive. */
const SCORCIATOIE = [
  { id: 'Cmd/Ctrl+K', re: /key\s*===?\s*['"]k['"]|key\.toLowerCase\(\)\s*===?\s*['"]k['"]/i, richiede: /metaKey|ctrlKey/ },
  { id: 'Cmd/Ctrl+P', re: /key\s*===?\s*['"]p['"]/i, richiede: /metaKey|ctrlKey/ },
  { id: 'Cmd/Ctrl+N', re: /key\s*===?\s*['"]n['"]/i, richiede: /metaKey|ctrlKey/ },
  { id: 'Escape', re: /key\s*===?\s*['"]Escape['"]/, richiede: null },
];

for (const f of file) {
  const grezzo = fs.readFileSync(f, 'utf8');
  const testo = soloCodice(grezzo);
  const righe = testo.split('\n');

  if (/\.html$/.test(f)) {
    /* Un id è unico **dentro un documento**, non nell'universo. INGLY OS e
       INGLY Cloud Admin sono due applicazioni separate e hanno entrambe la
       propria `#topbar`: contarle insieme produceva tre falsi positivi, e un
       rilevatore che grida al lupo fa ignorare anche le volte che ha ragione. */
    const documento = f.startsWith('src/admin/') ? 'admin' : 'os';
    for (const m of grezzo.matchAll(/\bid="([\w-]+)"/g)) {
      const riga = grezzo.slice(0, m.index).split('\n').length;
      R.idHtml.add(documento + '::' + m[1], f, riga);
    }
    continue;
  }

  righe.forEach((riga, n) => {
    const numero = n + 1;

    /* Un contesto ampio quanto la riga più le due successive: le condizioni
       sui tasti si scrivono spesso spezzate su più righe. */
    const contesto = righe.slice(n, n + 3).join(' ');
    for (const s of SCORCIATOIE) {
      if (!s.re.test(riga)) continue;
      if (s.richiede && !s.richiede.test(contesto)) continue;
      R.scorciatoie.add(s.id, f, numero);
    }

    if (/addEventListener\s*\(\s*['"]key(down|up|press)['"]/.test(riga)) {
      R.gestoriTasti.add('keydown globale', f, numero);
    }

    /* Modali e cassetti: si contano le **classi** con cui vengono creati, non
       le aperture. Due componenti che disegnano la propria modale sono due
       sistemi; due chiamate allo stesso componente non lo sono. */
    for (const m of riga.matchAll(/class(?:Name)?\s*=\s*['"]([\w\s-]*\b(?:modal|modale)[\w-]*)/gi)) {
      if (/modal-overlay|modal-backdrop/.test(m[1])) R.modali.add(m[1].trim().split(/\s+/)[0], f, numero);
    }
    for (const m of riga.matchAll(/class(?:Name)?\s*=\s*['"]([\w\s-]*\b(?:drawer|cassetto)[\w-]*)/gi)) {
      R.cassetti.add(m[1].trim().split(/\s+/)[0], f, numero);
    }

    /* Barre di ricerca: un campo con placeholder di ricerca o un id parlante. */
    if (/id\s*=\s*['"][\w-]*search[\w-]*['"]|placeholder\s*=\s*['"][^'"]*[Cc]erca/.test(riga)) {
      const m = riga.match(/id\s*=\s*['"]([\w-]+)['"]/);
      R.barreRicerca.add(m ? m[1] : 'campo senza id', f, numero);
    }

    if (/CmdPalette|CommandPalette|command-palette/.test(riga)) {
      R.palette.add('palette dei comandi', f, numero);
    }
  });
}

/* Le scorciatoie e i gestori vivono legittimamente in più file finché ognuno
   registra una cosa diversa. Il difetto è la **stessa** combinazione
   registrata due volte, e per quella serve un occhio umano sul dettaglio:
   qui si riporta il dato, non un verdetto automatico. */
const esito = {
  fileAnalizzati: file.length,
  idHtmlDuplicati: R.idHtml.multipli(),
  scorciatoie: R.scorciatoie.multipli(0),
  gestoriTastiGlobali: R.gestoriTasti.multipli(0),
  modali: R.modali.multipli(0),
  cassetti: R.cassetti.multipli(0),
  barreRicerca: R.barreRicerca.multipli(1),
  palette: R.palette.multipli(0),
};

const problemi = [];
if (esito.idHtmlDuplicati.length) {
  problemi.push(esito.idHtmlDuplicati.length + ' id duplicati nel markup');
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(esito, null, 2));
} else {
  const breve = (f) => f.replace('src/legacy/', '').replace('app/src/modules/', 'mod:').replace('patches/', 'p:').slice(0, 46);

  console.log('\nDUPLICAZIONI NELL\'INTERFACCIA — ' + file.length + ' file\n');
  console.log('  id duplicati nel markup    : ' + esito.idHtmlDuplicati.length);
  esito.idHtmlDuplicati.slice(0, 6).forEach((d) => console.log('      #' + d.chiave.split('::')[1] + ' ×' + d.volte + '  (' + d.chiave.split('::')[0] + ')'));

  console.log('\n  SCORCIATOIE GLOBALI');
  if (!esito.scorciatoie.length) console.log('      nessuna registrazione trovata');
  esito.scorciatoie.forEach((s) => {
    console.log('      ' + s.chiave.padEnd(12) + ' registrata ' + s.volte + (s.volte > 1 ? ' volte' : ' volta'));
    if (s.volte > 1) s.dove.forEach((d) => console.log('          ' + breve(d.file) + ':' + d.riga));
  });

  console.log('\n  ALTRI COMPONENTI');
  console.log('      gestori keydown globali : ' + (esito.gestoriTastiGlobali[0] ? esito.gestoriTastiGlobali[0].volte : 0));
  console.log('      classi di modale        : ' + esito.modali.length);
  console.log('      classi di cassetto      : ' + esito.cassetti.length);
  console.log('      barre di ricerca ripetute: ' + esito.barreRicerca.length);
  esito.barreRicerca.slice(0, 5).forEach((b) => console.log('          #' + b.chiave + ' ×' + b.volte));
  console.log('      riferimenti alla palette : ' + (esito.palette[0] ? esito.palette[0].volte : 0));

  if (problemi.length) {
    console.error('\nPROBLEMI');
    problemi.forEach((p) => console.error('  · ' + p));
    console.log('');
    process.exit(1);
  }
  console.log('\nnessun id duplicato nel markup ✔\n');
}
