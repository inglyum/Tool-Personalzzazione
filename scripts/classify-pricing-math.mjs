#!/usr/bin/env node
/**
 * classify-pricing-math.mjs — non tutta la matematica è matematica di prezzo.
 *
 * Il conteggio grezzo dice «55 file hanno formule». È un numero che spaventa e
 * non aiuta: dentro ci sono percentuali di completamento di una barra, medie
 * di vendita, conversioni di unità e librerie di terzi. Portarlo a zero
 * cancellando aritmetica innocua sarebbe lavoro sprecato che sembra progresso.
 *
 * L'obiettivo non è zero formule. È **zero motori di prezzo duplicati**.
 *
 * Sei categorie:
 *   A · motore        → il Cost Engine stesso                    MANTIENI
 *   B · formattazione → arrotondamenti e percentuali per la vista MANTIENI
 *   C · non-prezzo    → statistiche, tempi, conversioni           MANTIENI
 *   D · prezzo legacy → un secondo conto del prezzo               MIGRA
 *   E · regola fissa  → una politica commerciale nel codice       ESTRAI
 *   F · terze parti   → jspdf, sheetjs, chartjs                   IGNORA
 *
 *   node scripts/classify-pricing-math.mjs
 *   node scripts/classify-pricing-math.mjs --json
 *   node scripts/classify-pricing-math.mjs --category D
 */
import fs from 'node:fs';
import path from 'node:path';

const RADICE = 'src';
const file = [];
(function raccogli(dir) {
  for (const v of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, v.name);
    if (v.isDirectory()) raccogli(p);
    else if (/\.(js|mjs)$/.test(v.name)) file.push(p);
  }
})(RADICE);

function soloCodice(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((r) => (/^\s*(\/\/|\*)/.test(r) ? '' : r)).join('\n');
}

const CATEGORIE = {
  A: { id: 'A', label: 'motore di costo', azione: 'MANTIENI' },
  B: { id: 'B', label: 'formattazione per la vista', azione: 'MANTIENI' },
  C: { id: 'C', label: 'matematica non di prezzo', azione: 'MANTIENI' },
  D: { id: 'D', label: 'prezzo legacy', azione: 'MIGRA' },
  E: { id: 'E', label: 'regola commerciale nel codice', azione: 'ESTRAI IN POLITICA' },
  F: { id: 'F', label: 'libreria di terzi', azione: 'IGNORA' },
};

/* Le forme che indicano un secondo conto del prezzo. Sono strette di
   proposito: un falso positivo qui manda a riscrivere codice sano. */
const PREZZO = [
  { re: /\/\s*\(\s*1\s*-\s*[\w.]*(?:margin|margine)/i, cosa: 'prezzo da margine' },
  { re: /\*\s*\(\s*1\s*\+\s*[\w.]*(?:markup|ricarico|margin)/i, cosa: 'prezzo da ricarico' },
  { re: /\*\s*\(\s*1\s*-\s*[\w.]*(?:disc|sconto)/i, cosa: 'sconto sul prezzo' },
  { re: /\*\s*1\.22\b/, cosa: 'IVA a mano' },
  { re: /\bprice\s*=\s*[\w.]+\s*\*\s*\d/i, cosa: 'prezzo da moltiplicatore' },
];

/* Regole commerciali travestite da costanti: una soglia di quantità con uno
   sconto accanto, un prezzo minimo, una maggiorazione. */
const REGOLE = [
  { re: /qty\s*>=?\s*\d+\s*\?\s*[\d.]+\s*:/i, cosa: 'scaglione di sconto per quantità' },
  { re: /Math\.max\(\s*\d{2,}\s*,/, cosa: 'prezzo minimo' },
  { re: /express\s*\?\s*[\d.]+/i, cosa: 'maggiorazione urgenza' },
];

/* Aritmetica che non riguarda il prezzo: se un file ha solo queste, è sano. */
const NON_PREZZO = [
  /Math\.(min|max)\(\s*100\s*,/,            // percentuali di barra
  /\/\s*60\b/,                              // minuti → ore
  /\/\s*1000\b/,                            // grammi → kg, ms → s
  /toFixed\(/,                              // formattazione
];

const TERZE_PARTI = /\/vendor\//;

const esito = [];

for (const f of file) {
  const grezzo = fs.readFileSync(f, 'utf8');
  const testo = soloCodice(grezzo);
  const righe = testo.split('\n');

  if (TERZE_PARTI.test(f)) {
    if (PREZZO.some((p) => p.re.test(testo))) {
      esito.push({ file: f, categoria: 'F', occorrenze: [], nota: 'libreria di terzi' });
    }
    continue;
  }

  if (/InglyCostEngine\s*=\s*\{|INGLY COST ENGINE/.test(grezzo) && /global\.InglyCostEngine\s*=/.test(testo)) {
    esito.push({ file: f, categoria: 'A', occorrenze: [], nota: 'è il motore' });
    continue;
  }

  const trovate = [];
  righe.forEach((r, n) => {
    for (const p of PREZZO) {
      if (p.re.test(r)) trovate.push({ riga: n + 1, tipo: 'D', cosa: p.cosa, testo: r.trim().slice(0, 96) });
    }
    for (const p of REGOLE) {
      if (p.re.test(r)) trovate.push({ riga: n + 1, tipo: 'E', cosa: p.cosa, testo: r.trim().slice(0, 96) });
    }
  });

  if (!trovate.length) continue;

  const usaMotore = /InglyCostEngine|InglyQuoteAdapter/.test(testo);
  const soloD = trovate.filter((t) => t.tipo === 'D');
  const soloE = trovate.filter((t) => t.tipo === 'E');

  /* Un file che usa il motore e ha ancora una forma di prezzo è quasi sempre
     un ramo di ripiego o un residuo: si segnala, ma non è un motore parallelo. */
  let categoria;
  if (soloD.length && !usaMotore) categoria = 'D';
  else if (soloE.length && !soloD.length) categoria = 'E';
  else if (soloD.length && usaMotore) categoria = 'E';
  else categoria = 'C';

  /* Verifica di controllo: se le uniche forme trovate coincidono con
     aritmetica innocua, la classificazione scende a C. */
  if (categoria === 'D' && soloD.every((t) => NON_PREZZO.some((re) => re.test(t.testo)))) categoria = 'C';

  esito.push({
    file: f, categoria: categoria, usaMotore: usaMotore,
    occorrenze: trovate.slice(0, 6), totale: trovate.length,
  });
}

const perCategoria = {};
for (const k of Object.keys(CATEGORIE)) perCategoria[k] = esito.filter((e) => e.categoria === k);

const riassunto = {
  fileAnalizzati: file.length,
  perCategoria: Object.fromEntries(Object.keys(CATEGORIE).map((k) => [k, perCategoria[k].length])),
  /* Il numero che conta davvero. */
  motoriDuplicati: perCategoria.D.length,
  regoleDaEstrarre: perCategoria.E.length,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ riassunto, categorie: CATEGORIE, esito }, null, 2));
} else {
  const sceltaIdx = process.argv.indexOf('--category');
  const scelta = sceltaIdx >= 0 ? process.argv[sceltaIdx + 1] : null;
  const breve = (f) => f.replace('src/legacy/', '').replace('app/src/modules/', 'mod:').replace('patches/', 'p:').slice(0, 54);

  console.log('\nCLASSIFICAZIONE DELLA MATEMATICA DI PREZZO — ' + file.length + ' file\n');
  for (const k of Object.keys(CATEGORIE)) {
    const c = CATEGORIE[k];
    console.log('  ' + k + ' · ' + c.label.padEnd(32) + String(perCategoria[k].length).padStart(3) + ' file   ' + c.azione);
  }
  console.log('\n  MOTORI DI PREZZO DUPLICATI (categoria D): ' + riassunto.motoriDuplicati);
  console.log('  REGOLE COMMERCIALI DA ESTRARRE (categoria E): ' + riassunto.regoleDaEstrarre);

  for (const k of scelta ? [scelta] : ['D', 'E']) {
    if (!perCategoria[k] || !perCategoria[k].length) continue;
    console.log('\n── Categoria ' + k + ' · ' + CATEGORIE[k].label + ' ──');
    for (const e of perCategoria[k]) {
      console.log('\n  ' + breve(e.file) + (e.usaMotore ? '   [usa già il motore]' : ''));
      e.occorrenze.forEach((o) => console.log('    ' + String(o.riga).padStart(5) + '  ' + o.cosa + ' · ' + o.testo));
      if (e.totale > e.occorrenze.length) console.log('        … e altre ' + (e.totale - e.occorrenze.length));
    }
  }
  console.log('');
}
