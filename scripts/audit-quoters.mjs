#!/usr/bin/env node
/**
 * audit-quoters.mjs — chi calcola un prezzo, e con quali numeri.
 *
 * Fase 1 del piano: **misurare prima di correggere**. Questo script non
 * cambia niente. Legge i sorgenti e risponde a quattro domande che finora
 * sono state risposte a memoria:
 *
 *   1. quanti moduli producono un prezzo, e attraverso quale funzione;
 *   2. quali di essi lo producono con una moltiplicazione propria invece di
 *      chiedere al motore — cioè quante matematiche parallele esistono;
 *   3. quali valori economici sono scritti nel codice, e di che natura sono;
 *   4. quali dati macchina sono consumi misurati e quali potenze di targa
 *      usate come se fossero consumi.
 *
 * La classificazione dei valori segue le sei categorie del piano:
 *
 *   A dato reale dal magazzino      D default tecnico
 *   B dato reale dalla macchina     E stima
 *   C impostazione aziendale        F hardcoded da eliminare
 *
 * Uno script non può leggere l'intenzione: assegna la categoria che il
 * **contesto sintattico** giustifica e lascia in `F` tutto ciò che non sa
 * spiegare. Un falso `F` costa una riga di verifica; un falso `A` nasconde un
 * numero inventato, ed è il motivo per cui il default è il sospetto.
 *
 *   node scripts/audit-quoters.mjs
 *   node scripts/audit-quoters.mjs --json
 */
import fs from 'node:fs';
import path from 'node:path';

const RADICE = 'src';
const file = [];
(function raccogli(dir) {
  for (const v of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, v.name);
    if (v.isDirectory()) { if (v.name !== 'vendor') raccogli(p); }
    else if (/\.(js|mjs)$/.test(v.name)) file.push(p);
  }
})(RADICE);

/** Un commento che nomina una formula non la esegue. */
function soloCodice(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n').map((r) => (/^\s*(\/\/|\*)/.test(r) ? '' : r)).join('\n');
}

const sorgenti = file.map((f) => ({ f, t: soloCodice(fs.readFileSync(f, 'utf8')) }));

/* ── 1 · chi produce un prezzo ─────────────────────────────────────────────
   Il segno non è il nome del modulo — «Quoter» sta anche in un titolo — ma la
   presenza di almeno una scrittura su un campo di prezzo. */
const SEGNI_PREZZO = [
  /\bprice\s*[:=]/i, /\bprezzo\s*[:=]/i, /\bsalePrice\s*[:=]/i,
  /\bunitPrice\s*[:=]/i, /\bppz\s*[:=]/, /\bPRICES\s*=/,
];
const SEGNI_COSTO = [
  /\bcostoPezzo\b/, /\btotalCost\b/, /\bunitCost\b/, /\bcostPrice\b/, /\bcpz\b/,
];

/* ── 2 · matematica di prezzo propria ──────────────────────────────────────
   Due forme, e la differenza fra loro è tutto il piano:

     costo × k        ricarico travestito da margine
     costo ÷ (1 − m)  margine vero

   La prima non è sbagliata in sé: è sbagliata quando è **l'unica** e quando
   l'etichetta accanto dice «margine». */
const MOLTIPLICA = /\b(cost|costo|costPrice|unitCost|totalCost|cpz|base|totalCostPz)[A-Za-z]*\s*\*\s*(\d+(?:\.\d+)?|markup|molt|mult|m[123]\b)/gi;
const DIVIDE = /\/\s*\(\s*1\s*-\s*/g;
const CHIAMA_MOTORE = /\bInglyCostEngine\b|\bInglyPrint3D\b|\bInglyQuoter3DView\b|\bMOT\.prezzo\b/;

/* ── 3 · valori economici scritti nel codice ───────────────────────────────
   Si cerca il numero **insieme alla sua unità**: un 24 solo non dice niente,
   `€/kg` accanto a un 24 sì. */
const UNITA = [
  { id: 'eur_kg', re: /(\d+(?:\.\d+)?)\s*(?:€\s*\/\s*kg|eur\/kg)/gi, che: '€/kg' },
  { id: 'eur_l', re: /(\d+(?:\.\d+)?)\s*(?:€\s*\/\s*l\b|eur\/l\b)/gi, che: '€/L' },
  { id: 'eur_kwh', re: /kwh[A-Za-z]*\s*[:=]\s*(\d+(?:\.\d+)?)/gi, che: '€/kWh' },
  /* `w:` da solo pesca ogni `width` e ogni tabella macchine indifferentemente:
     si nomina la potenza per esteso. */
  { id: 'watt', re: /\b(?:watt|powerW|ratedPower|wattaggio)\s*[:=]\s*(\d+(?:\.\d+)?)/gi, che: 'W' },
  { id: 'vita', re: /\b(?:machineLifeHours|usefulLifeHours|lifeHours|lh)\s*[:=]\s*(\d+(?:\.\d+)?)/gi, che: 'ore di vita' },
  { id: 'manut', re: /\b(?:maintenancePerHour|maintenance|mnt)\s*[:=]\s*(\d+(?:\.\d+)?)/gi, che: '€/h manutenzione' },
  { id: 'scarto', re: /\b(?:failureRate|failRate|scarto|fail)\s*[:=]\s*(\d+(?:\.\d+)?)/gi, che: '% scarto' },
  { id: 'markup', re: /\b(?:markup|molt|mult)\s*[:=]\s*(\d+(?:\.\d+)?)/gi, che: 'moltiplicatore' },
  /* `margin:` senza suffisso è CSS: 274 delle 487 occorrenze erano bordi di
     riquadri. Il margine economico si scrive per esteso. */
  { id: 'margine', re: /\b(?:margine|marginePct|marginPct|targetMargin|marginTarget|minMargin)\s*[:=]\s*(\d+(?:\.\d+)?)/gi, che: '% margine' },
  { id: 'iva', re: /\b(?:iva|ivaPct|vatRate|vatPct)\s*[:=]\s*(\d+(?:\.\d+)?)/gi, che: '% IVA' },
  /* L'aliquota scritta dentro un'espressione, che è il modo in cui il 22% si
     è moltiplicato in quattro punti senza mai comparire come impostazione. */
  { id: 'iva_lett', re: /\*\s*(0\.22|1\.22)\b/g, che: '% IVA nel codice' },
  { id: 'labor', re: /\b(?:laborPerHour|laborCost|laborRate|lr)\s*[:=]\s*(\d+(?:\.\d+)?)/gi, che: '€/h manodopera' },
  { id: 'overhead', re: /\b(?:overhead|overheadPerHour|speseGenerali)\s*[:=]\s*(\d+(?:\.\d+)?)/gi, che: 'overhead' },
];

/* La categoria si deduce dal contesto della riga, non dal numero. */
function categoria(riga, file) {
  const r = riga.toLowerCase();
  if (/inventor|magazzino|warehouse|\bitems\b|stock|fornitore|supplier/.test(r)) return 'A';
  if (/\bmach\b|machine|stampante|printer|laser[a-z]*\s*[:=]|purchaseprice|ratedpower/.test(r)) return 'B';
  if (/setting|impostazion|config|profil|azienda|company/.test(r) || /settings/.test(file)) return 'C';
  if (/default|predefinit|fallback|\|\||\?\?|\bDEF_/.test(riga)) return 'D';
  if (/stima|estimat|circa|approx|indicativ/.test(r)) return 'E';
  return 'F';
}

/* ── 4 · energia: targa o consumo? ─────────────────────────────────────────
   La distinzione che il piano chiede a voce alta: 150 W × 0,6 è una stima del
   consumo, non un consumo. Un modulo che conosce solo `watt` non ha modo di
   sapere di stare stimando, e quindi non ha modo di dirlo. */
const ENERGIA = {
  misurato: /\bmeasured(Power|Energy)|kwhMisurat|energiaMisurata|measuredKwh/i,
  medio: /\baveragePowerW\b|\bconsumoMedio\b|\bavgPower/i,
  targa: /\bratedPowerW\b|\bwatt\b|\bpowerW\b|\bnominal/i,
  modo: /\benergyMode\b/,
};

const moduli = [];
const valori = [];
let motoriParalleli = 0;

for (const { f, t } of sorgenti) {
  const righe = t.split('\n');
  /* Gli offset di inizio riga, calcolati una volta: cercare la riga di ogni
     occorrenza ricostruendo il testo è quadratico, e su 9 MB non finisce. */
  const inizi = [];
  { let o = 0; for (const r of righe) { inizi.push(o); o += r.length + 1; } }
  const rigaDi = (i) => {
    let a = 0, b = inizi.length - 1;
    while (a < b) { const c = (a + b + 1) >> 1; if (inizi[c] <= i) a = c; else b = c - 1; }
    return a;
  };
  const scrivePrezzo = SEGNI_PREZZO.some((re) => re.test(t));
  const calcolaCosto = SEGNI_COSTO.some((re) => re.test(t));
  if (!scrivePrezzo && !calcolaCosto) continue;

  /* `costo * 100` è una percentuale e `costo * 0,6` una quota: nessuna delle
     due è un prezzo. Restano i fattori di ricarico veri — fra 1 e 20 — e
     quelli simbolici, che è esattamente ciò che il piano vuole contare. */
  const molt = [...t.matchAll(MOLTIPLICA)].filter((m) => {
    const k = parseFloat(m[2]);
    return Number.isNaN(k) ? true : (k > 1 && k <= 20);
  });
  const div = (t.match(DIVIDE) || []).length;
  const motore = CHIAMA_MOTORE.test(t);
  /* Un modulo con moltiplicazioni proprie e nessuna chiamata al motore è una
     matematica parallela: è la cosa che il piano vuole contare. */
  const parallelo = molt.length > 0 && !motore;
  if (parallelo) motoriParalleli++;

  const en = {};
  for (const [k, re] of Object.entries(ENERGIA)) en[k] = re.test(t);

  moduli.push({
    file: f, scrivePrezzo, calcolaCosto, motore, parallelo,
    moltiplicazioni: molt.length, divisioniMargine: div,
    esempiMolt: molt.slice(0, 3).map((m) => m[0].trim()),
    energia: en,
  });

  for (const u of UNITA) {
    u.re.lastIndex = 0;
    let m;
    while ((m = u.re.exec(t))) {
      const n = rigaDi(m.index);
      const riga = righe[n] ?? '';
      valori.push({ file: f, riga: n + 1, tipo: u.che, valore: parseFloat(m[1]),
        categoria: categoria(riga, f) });
    }
  }
}

moduli.sort((a, b) => b.moltiplicazioni - a.moltiplicazioni);

const perCategoria = {};
for (const v of valori) perCategoria[v.categoria] = (perCategoria[v.categoria] || 0) + 1;
const perTipo = {};
for (const v of valori) perTipo[v.tipo] = (perTipo[v.tipo] || 0) + 1;

const conMisura = moduli.filter((m) => m.energia.misurato).length;
const conMedio = moduli.filter((m) => m.energia.medio).length;
const soloTarga = moduli.filter((m) => m.energia.targa && !m.energia.medio && !m.energia.misurato).length;
const conModo = moduli.filter((m) => m.energia.modo).length;

const esito = {
  moduli: moduli.length,
  sulMotore: moduli.filter((m) => m.motore).length,
  matematicheParallele: motoriParalleli,
  valoriEconomici: valori.length,
  perCategoria, perTipo,
  energia: { conMisura, conMedio, soloTarga, conModo },
  dettaglio: moduli, valori,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(esito, null, 2));
} else {
  const p = (s) => console.log(s);
  p('\nAUDIT PREVENTIVATORI — chi calcola un prezzo, e con quali numeri\n');
  p('  moduli che producono costo o prezzo : ' + esito.moduli);
  p('  di questi, sul motore unico         : ' + esito.sulMotore);
  p('  con matematica di prezzo propria    : ' + esito.matematicheParallele);
  p('\n  valori economici scritti nel codice : ' + esito.valoriEconomici);
  for (const [k, n] of Object.entries(perCategoria).sort())
    p('    ' + k + ' · ' + ({ A: 'dal magazzino', B: 'dalla macchina', C: 'impostazione',
      D: 'default tecnico', E: 'stima dichiarata', F: 'hardcoded senza fonte' })[k] + ': ' + n);
  p('\n  per tipo di valore');
  for (const [k, n] of Object.entries(perTipo).sort((a, b) => b[1] - a[1]))
    p('    ' + k.padEnd(20) + n);
  p('\n  energia');
  p('    moduli con consumo misurato       : ' + conMisura);
  p('    moduli con consumo medio          : ' + conMedio);
  p('    moduli con la sola potenza di targa: ' + soloTarga);
  p('    moduli che dichiarano quale usano : ' + conModo);
  p('\n  i dieci moduli con più moltiplicazioni di prezzo proprie\n');
  for (const m of moduli.filter((x) => x.moltiplicazioni).slice(0, 10)) {
    p('    ' + (m.motore ? '·' : '⚠') + ' ' + m.file.replace('src/legacy/', ''));
    p('        ×' + m.moltiplicazioni + '  ÷(1−m) ' + m.divisioniMargine
      + '  ' + (m.motore ? 'chiama il motore' : 'NON chiama il motore')
      + (m.esempiMolt.length ? '  es. ' + m.esempiMolt.join(' · ') : ''));
  }
  p('');
}
