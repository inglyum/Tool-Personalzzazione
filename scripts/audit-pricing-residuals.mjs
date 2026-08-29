#!/usr/bin/env node
/**
 * audit-pricing-residuals.mjs — ogni occorrenza, classificata.
 *
 * Il classificatore precedente lavorava per file: diceva «questo file ha
 * matematica di prezzo». Utile per decidere da dove cominciare, inutile per
 * decidere cosa fare — dentro lo stesso file convivono un ricarico da migrare
 * e una conversione di unità che va lasciata dov'è.
 *
 * Qui si classifica **ogni singola occorrenza**, con la riga e il perché.
 *
 *   CORE_COST            costo diretto (materiale, macchina, energia, lavoro)
 *   PRICING              prezzo, margine, ricarico, sconto, IVA
 *   COMMERCIAL_POLICY    una decisione commerciale scritta come costante
 *   UI_FORMAT            arrotondamenti e percentuali per la vista
 *   BUSINESS_ARITHMETIC  statistiche, medie, conversioni, tempi
 *   THIRD_PARTY          libreria di terzi
 *   LEGACY               forma storica riconosciuta, da ritirare
 *
 * Nessuna occorrenza viene toccata: si classifica e si conta.
 *
 *   node scripts/audit-pricing-residuals.mjs
 *   node scripts/audit-pricing-residuals.mjs --class PRICING
 *   node scripts/audit-pricing-residuals.mjs --json
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

/** Il codice senza commenti: un commento che nomina una formula non la esegue. */
function soloCodice(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n').map((r) => (/^\s*(\/\/|\*)/.test(r) ? '' : r)).join('\n');
}

/* Le regole, in ordine: la prima che riconosce vince. L'ordine è la
   classificazione — una riga con `* 1.22` è IVA prima che aritmetica. */
const REGOLE = [
  // ── PRICING ────────────────────────────────────────────────────────────
  { cls: 'PRICING', id: 'margine', re: /\/\s*\(\s*1\s*-\s*[\w.]*(?:margin|margine)/i, cosa: 'prezzo da margine' },
  { cls: 'PRICING', id: 'ricarico', re: /\*\s*\(\s*1\s*\+\s*[\w.]*(?:markup|ricarico|margin)/i, cosa: 'prezzo da ricarico' },
  { cls: 'PRICING', id: 'sconto', re: /\*\s*\(\s*1\s*-\s*[\w.]*(?:disc|sconto)/i, cosa: 'sconto sul prezzo' },
  { cls: 'PRICING', id: 'iva', re: /\*\s*1\.22\b|\*\s*0\.22\b/, cosa: 'IVA a moltiplicatore' },
  { cls: 'PRICING', id: 'ivaPct', re: /\*\s*(?:vat|iva)\w*\s*\/\s*100/i, cosa: 'IVA in percentuale' },
  { cls: 'PRICING', id: 'commissione', re: /(?:fee|commission|commissione)\w*\s*[/*]\s*100/i, cosa: 'commissione di canale' },
  { cls: 'PRICING', id: 'margineDa', re: /\(\s*[\w.]+\s*-\s*[\w.]*cost\w*\s*\)\s*\/\s*[\w.]+\s*\*\s*100/i, cosa: 'margine da prezzo e costo' },

  // ── COMMERCIAL_POLICY ──────────────────────────────────────────────────
  { cls: 'COMMERCIAL_POLICY', id: 'scaglione', re: /qty\s*>=?\s*\d+\s*\?\s*[\d.]+\s*:/i, cosa: 'scaglione di sconto per quantità' },
  { cls: 'COMMERCIAL_POLICY', id: 'minimo', re: /Math\.max\(\s*\d{2,}\s*,\s*[\w.]/, cosa: 'prezzo minimo' },
  { cls: 'COMMERCIAL_POLICY', id: 'urgenza', re: /(?:express|rush|urgen)\w*\s*\?\s*[\d.]+/i, cosa: 'maggiorazione urgenza' },
  { cls: 'COMMERCIAL_POLICY', id: 'rivenditore', re: /(?:reseller|rivenditore|wholesale)\w*\s*[*/]\s*[\d.]/i, cosa: 'quota rivenditore' },

  // ── CORE_COST ──────────────────────────────────────────────────────────
  { cls: 'CORE_COST', id: 'ammortamento', re: /\(\s*[\w.]*(?:machinePrice|purchase|acquisto)[\w.]*\s*-\s*[\w.]*(?:residual|residuo)/i, cosa: 'ammortamento macchina' },
  { cls: 'CORE_COST', id: 'energia', re: /[\w.]*watt\w*\s*\/\s*1000\s*\*|kwh\w*\s*\*/i, cosa: 'costo energia' },
  { cls: 'CORE_COST', id: 'manodopera', re: /(?:labor|manodopera)\w*\s*[*/]\s*60|\/\s*60\s*\*\s*[\w.]*(?:labor|manodopera)/i, cosa: 'costo manodopera' },
  { cls: 'CORE_COST', id: 'scarto', re: /(?:failure|scarto)\w*\s*\/\s*\(\s*1\s*-/i, cosa: 'riserva di scarto' },
  { cls: 'CORE_COST', id: 'materiale', re: /\/\s*1000\s*\)?\s*\*\s*[\w.]*(?:price|prezzo|cost)/i, cosa: 'conversione materiale in costo' },

  // ── BUSINESS_ARITHMETIC ────────────────────────────────────────────────
  { cls: 'BUSINESS_ARITHMETIC', id: 'conversione', re: /\/\s*(?:60|1000|10000|1000000)\b/, cosa: 'conversione di unità' },
  { cls: 'BUSINESS_ARITHMETIC', id: 'media', re: /reduce\([^)]*\)\s*\/\s*[\w.]+\.length/, cosa: 'media' },
  { cls: 'BUSINESS_ARITHMETIC', id: 'percentualeBarra', re: /Math\.min\(\s*100\s*,|Math\.max\(\s*0\s*,\s*Math\.min\(\s*100/, cosa: 'percentuale di avanzamento' },

  // ── UI_FORMAT ──────────────────────────────────────────────────────────
  { cls: 'UI_FORMAT', id: 'arrotonda', re: /toFixed\(\s*[0-2]\s*\)/, cosa: 'arrotondamento per la vista' },
  { cls: 'UI_FORMAT', id: 'round', re: /Math\.round\([^)]*\*\s*100\s*\)\s*\/\s*100/, cosa: 'arrotondamento a due decimali' },
];

const CLASSI = ['CORE_COST', 'PRICING', 'COMMERCIAL_POLICY', 'UI_FORMAT', 'BUSINESS_ARITHMETIC', 'THIRD_PARTY', 'LEGACY'];

/* Le forme storiche riconosciute che sono già state ritirate altrove: se
   ricompaiono, sono LEGACY e non semplicemente PRICING. */
const FORME_LEGACY = [
  { re: /\*\s*\(\s*1\s*\+\s*markup\s*\)\s*\*\s*\(\s*1\s*-\s*discount\s*\)/, cosa: 'la formula del preventivo storico' },
];

const occorrenze = [];

for (const f of file) {
  const grezzo = fs.readFileSync(f, 'utf8');
  const terzi = /\/vendor\//.test(f);
  const testo = soloCodice(grezzo);
  const righe = testo.split('\n');
  const usaMotore = /InglyCostEngine|InglyQuoteAdapter/.test(testo);

  righe.forEach((riga, n) => {
    if (!riga.trim()) return;

    if (terzi) {
      if (REGOLE.some((r) => r.cls === 'PRICING' && r.re.test(riga))) {
        occorrenze.push({ file: f, riga: n + 1, classe: 'THIRD_PARTY', cosa: 'libreria di terzi', usaMotore, testo: riga.trim().slice(0, 110) });
      }
      return;
    }

    const legacy = FORME_LEGACY.find((l) => l.re.test(riga));
    if (legacy) {
      occorrenze.push({ file: f, riga: n + 1, classe: 'LEGACY', cosa: legacy.cosa, usaMotore, testo: riga.trim().slice(0, 110) });
      return;
    }

    for (const r of REGOLE) {
      if (r.re.test(riga)) {
        occorrenze.push({ file: f, riga: n + 1, classe: r.cls, id: r.id, cosa: r.cosa, usaMotore, testo: riga.trim().slice(0, 110) });
        return;   // la prima regola che riconosce vince
      }
    }
  });
}

const perClasse = Object.fromEntries(CLASSI.map((c) => [c, occorrenze.filter((o) => o.classe === c)]));

/* Il numero che conta: prezzo e politiche **fuori** dal motore. Il resto è
   aritmetica che vive legittimamente dove si trova. */
const daMigrare = occorrenze.filter((o) => (o.classe === 'PRICING' || o.classe === 'LEGACY') && !o.usaMotore);
const politicheSparse = occorrenze.filter((o) => o.classe === 'COMMERCIAL_POLICY');
const costoFuori = occorrenze.filter((o) => o.classe === 'CORE_COST' && !o.usaMotore);

const riassunto = {
  fileAnalizzati: file.length,
  occorrenze: occorrenze.length,
  perClasse: Object.fromEntries(CLASSI.map((c) => [c, perClasse[c].length])),
  daMigrare: daMigrare.length,
  politicheSparse: politicheSparse.length,
  costoFuoriDalMotore: costoFuori.length,
  fileDaMigrare: [...new Set(daMigrare.map((o) => o.file))].length,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ riassunto, occorrenze }, null, 2));
} else {
  const i = process.argv.indexOf('--class');
  const scelta = i >= 0 ? process.argv[i + 1] : null;
  const breve = (f) => f.replace('src/legacy/', '').replace('app/src/modules/', 'mod:').replace('patches/', 'p:').slice(0, 50);

  console.log('\nRESIDUI DI PREZZO, CLASSIFICATI PER OCCORRENZA — ' + file.length + ' file\n');
  for (const c of CLASSI) {
    const n = perClasse[c].length;
    const fuori = perClasse[c].filter((o) => !o.usaMotore).length;
    console.log('  ' + c.padEnd(22) + String(n).padStart(5) +
      (n ? '   di cui ' + fuori + ' fuori dal motore' : ''));
  }
  console.log('\n  DA MIGRARE (prezzo e forme storiche fuori dal motore) : ' + riassunto.daMigrare +
    '  in ' + riassunto.fileDaMigrare + ' file');
  console.log('  POLITICHE COMMERCIALI SPARSE                          : ' + riassunto.politicheSparse);
  console.log('  COSTO DIRETTO CALCOLATO FUORI DAL MOTORE              : ' + riassunto.costoFuoriDalMotore);

  const mostra = scelta ? occorrenze.filter((o) => o.classe === scelta) : daMigrare;
  if (mostra.length) {
    console.log('\n── ' + (scelta || 'DA MIGRARE') + ' ──');
    const perFile = {};
    for (const o of mostra) (perFile[o.file] = perFile[o.file] || []).push(o);
    for (const [f, lista] of Object.entries(perFile).sort((a, b) => b[1].length - a[1].length)) {
      console.log('\n  ' + breve(f) + '   (' + lista.length + ')' + (lista[0].usaMotore ? '  [usa già il motore]' : ''));
      lista.slice(0, 6).forEach((o) => console.log('    ' + String(o.riga).padStart(5) + '  ' + (o.cosa || o.classe) + ' · ' + o.testo));
      if (lista.length > 6) console.log('          … e altre ' + (lista.length - 6));
    }
  }
  console.log('');
}
