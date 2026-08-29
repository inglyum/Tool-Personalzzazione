#!/usr/bin/env node
/**
 * audit-cost-engines.mjs — dove vive ancora la matematica dei prezzi.
 *
 * Un solo motore ufficiale non si ottiene dichiarandolo: si ottiene togliendo
 * il conto da tutti i posti in cui è finito. Questo strumento li trova, e li
 * ritrova dopo ogni migrazione — così «adesso usa il CostEngine» è una misura,
 * non un'affermazione.
 *
 *   node scripts/audit-cost-engines.mjs
 *   node scripts/audit-cost-engines.mjs --json
 */
import fs from 'node:fs';
import path from 'node:path';

const RADICE = 'src';
const file = [];
(function raccogli(dir) {
  for (const v of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, v.name);
    /* Le librerie di terzi non sono matematica di prezzo di questo progetto:
       contarle gonfia il numero e nasconde il lavoro vero che resta. */
    if (v.isDirectory()) { if (v.name !== 'vendor') raccogli(p); }
    else if (/\.(js|mjs)$/.test(v.name)) file.push(p);
  }
})(RADICE);

/* I commenti descrivono il codice, non lo eseguono: contarli falserebbe ogni
   numero. Non è un parser — le sequenze dentro le stringhe restano. */
function soloCodice(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((r) => (/^\s*(\/\/|\*)/.test(r) ? '' : r)).join('\n');
}

/** I moltiplicatori di prezzo scritti nel codice: `* 2.5`, `*3`, `× 1.4`. */
const MOLTIPLICATORI = /[*]\s*(\d\.\d+|[2-9])\b(?!\s*\d)/g;

/* Le forme in cui la matematica di prezzo si nasconde. Ognuna è stata vista
   davvero in questo codice, non immaginata. */
const SEGNALI = [
  { id: 'calcFn', et: 'funzioni calc/calculate/price', re: /\b(?:function\s+)?(?:_?calc(?:ola|ulate)?[A-Z_]?\w*|_?price[A-Z_]?\w*|_?pricing\w*)\s*[=:(]/g },
  { id: 'dalDom', et: 'valori letti dal DOM per calcolare', re: /parse(?:Float|Int)\s*\(\s*(?:document\.getElementById|eid\(|[\w$]+\.value)/g },
  { id: 'margine', et: 'formule di margine/ricarico', re: /\/\s*\(\s*1\s*-\s*[\w.]*(?:margin|margine)|\*\s*\(\s*1\s*[+-]\s*[\w.]*(?:margin|margine|markup|ricarico)/gi },
  { id: 'iva', et: 'IVA calcolata a mano', re: /\*\s*(?:1\.22|0\.22)\b|\bvat\w*\s*\/\s*100|iva\w*\s*\/\s*100/gi },
  { id: 'sconto', et: 'sconti applicati al prezzo', re: /\*\s*\(\s*1\s*-\s*[\w.]*(?:disc|sconto)/gi },
];

const MOTORI = ['PricingEngine', 'InglyPrint3D', 'LaserCalcV2', 'Print3DQuoter', 'ApparelQuoter', 'LaserB2B', 'InglyCostEngine', 'LegacyPricingAdapter'];

const esito = { file: file.length, segnali: {}, moltiplicatori: [], motori: {}, usaMotore: [], nonUsaMotore: [] };
for (const s of SEGNALI) esito.segnali[s.id] = { etichetta: s.et, totale: 0, file: [] };
for (const m of MOTORI) esito.motori[m] = [];

/* I file che *contengono* matematica di prezzo: sono quelli che devono finire
   per usare il motore. Gli altri non c'entrano. */
const conMatematica = new Set();

for (const f of file) {
  const grezzo = fs.readFileSync(f, 'utf8');
  const testo = soloCodice(grezzo);

  for (const s of SEGNALI) {
    const n = (testo.match(s.re) || []).length;
    if (n) {
      esito.segnali[s.id].totale += n;
      esito.segnali[s.id].file.push({ file: f, n });
      if (s.id !== 'calcFn') conMatematica.add(f);
    }
  }

  const molt = testo.match(MOLTIPLICATORI) || [];
  if (molt.length) {
    const distinti = [...new Set(molt.map((x) => x.replace(/\s+/g, '')))];
    esito.moltiplicatori.push({ file: f, n: molt.length, valori: distinti.slice(0, 8) });
  }

  for (const m of MOTORI) if (new RegExp('\\b' + m + '\\b').test(testo)) esito.motori[m].push(f);
}

for (const f of conMatematica) {
  const t = soloCodice(fs.readFileSync(f, 'utf8'));
  if (/InglyCostEngine|LegacyPricingAdapter/.test(t)) esito.usaMotore.push(f);
  else esito.nonUsaMotore.push(f);
}
esito.usaMotore.sort();
esito.nonUsaMotore.sort();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(esito, null, 2));
} else {
  const breve = (f) => f.replace('src/legacy/', '').replace('app/src/modules/', 'mod:').replace('patches/', 'p:').slice(0, 56);
  console.log('\nDOVE VIVE LA MATEMATICA DEI PREZZI — ' + esito.file + ' file\n');

  for (const s of SEGNALI) {
    const d = esito.segnali[s.id];
    console.log('  ' + d.etichetta.padEnd(38) + String(d.totale).padStart(5) + '  in ' + d.file.length + ' file');
  }

  const nMolt = esito.moltiplicatori.reduce((t, x) => t + x.n, 0);
  console.log('  ' + 'moltiplicatori scritti nel codice'.padEnd(38) + String(nMolt).padStart(5) + '  in ' + esito.moltiplicatori.length + ' file');

  console.log('\nMOTORI PRESENTI');
  for (const m of MOTORI) {
    if (esito.motori[m].length) console.log('  ' + m.padEnd(22) + String(esito.motori[m].length).padStart(3) + ' file');
  }

  console.log('\nFILE CON MATEMATICA DI PREZZO');
  console.log('  usano il motore unico : ' + esito.usaMotore.length);
  esito.usaMotore.forEach((f) => console.log('      ✓ ' + breve(f)));
  console.log('  hanno ancora la propria: ' + esito.nonUsaMotore.length);
  esito.nonUsaMotore.slice(0, 14).forEach((f) => console.log('      · ' + breve(f)));
  if (esito.nonUsaMotore.length > 14) console.log('      … e altri ' + (esito.nonUsaMotore.length - 14));
  console.log('');
}
