#!/usr/bin/env node
/**
 * audit-historical-pricing.mjs — il motore non entra dove si legge il passato.
 *
 * Il difetto che presidia non è un errore di calcolo: è un calcolo **giusto**
 * fatto nel momento sbagliato. Una vista che rilegge il listino corrente per
 * disegnare un ordine di marzo produce un margine che sembra storico e non lo
 * è, e nessuno può accorgersene guardandolo — i numeri sono plausibili, la
 * pagina non dà segno di aver ricalcolato nulla.
 *
 * Qui si misura una regola sola: nelle funzioni che **disegnano** un ordine o
 * una vendita già avvenuta non deve comparire alcuna chiamata a un motore di
 * prezzo né alcuna lettura di un listino corrente.
 *
 * Le eccezioni sono nominate una per una, non dedotte: il ricalcolo esplicito
 * — quello che l'utente chiede premendo un pulsante e che mostra una
 * differenza invece di sostituire — è legittimo e deve poter chiamare il
 * motore. Un'eccezione senza nome sarebbe un buco.
 *
 *   node scripts/audit-historical-pricing.mjs
 *   node scripts/audit-historical-pricing.mjs --json
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

/** Il codice senza commenti: un commento che nomina il motore non lo chiama. */
function soloCodice(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n').map((r) => (/^\s*(\/\/|\*)/.test(r) ? '' : r)).join('\n');
}

/* Chi disegna un ordine o una vendita già avvenuti. I nomi sono quelli reali
   del prodotto: un elenco esplicito è più onesto di un'euristica, perché
   quando qualcuno aggiunge una vista nuova il fallimento è «non presidiata»,
   non un silenzio. */
const VISTE_STORICHE = [
  /^openDetail$/, /^_drawerTab\w*$/, /^pannello$/, /^pannelloAssente$/,
  /^renderOrderCard$/, /^_orderCard$/, /^saleRow$/, /^_renderSale\w*$/,
];

/* Le funzioni a cui il motore serve davvero, e perché. Ognuna è un ricalcolo
   che l'utente ha chiesto, non un disegno. */
const CONSENTITE = {
  chiediRicalcolo: 'ricalcolo esplicito: mostra la differenza e chiede conferma',
  statoDaPreventivo: 'compone gli ingressi per il ricalcolo esplicito',
};

/* Cosa non deve comparire: motori di prezzo e letture di listino corrente. */
const VIETATI = [
  { re: /InglyCostEngine\s*\.\s*(calcola|prezzo|preventiva|scaglioni)\b/, cosa: 'chiamata al motore di costo' },
  { re: /InglyQuoteAdapter\s*\.\s*(calculateQuote|explainQuote)\b/, cosa: 'chiamata all\'adapter del preventivo' },
  { re: /PricingEngine\s*\.\s*suggest\b/, cosa: 'prezzo suggerito dal listino corrente' },
  { re: /\bProduct\s*\.\s*currentPrice\b/, cosa: 'prezzo corrente del prodotto' },
  { re: /\bcurrentPrice\b/, cosa: 'prezzo corrente' },
  { re: /InglyPrint3D\s*\.\s*cost\b/, cosa: 'calcolatore 3D' },
];

/** Il corpo di una funzione, per bilanciamento di graffe. */
function corpo(testo, inizio) {
  const apre = testo.indexOf('{', inizio);
  if (apre < 0) return '';
  let n = 0;
  for (let i = apre; i < testo.length; i++) {
    if (testo[i] === '{') n++;
    else if (testo[i] === '}') { n--; if (!n) return testo.slice(apre, i + 1); }
  }
  return testo.slice(apre);
}

const trovate = [];
const violazioni = [];

/* `nome(...) {`, `nome: function (...) {`, `function nome(...) {`,
   `async nome(...) {` — le quattro forme che il prodotto usa davvero. */
const DICHIARAZIONE = /(?:^|\n)\s*(?:async\s+)?(?:function\s+)?([A-Za-z_$][\w$]*)\s*(?::\s*(?:async\s+)?function\s*)?\s*\([^)]*\)\s*(?:=>\s*)?\{/g;

for (const f of file) {
  const testo = soloCodice(fs.readFileSync(f, 'utf8'));
  DICHIARAZIONE.lastIndex = 0;
  let m;
  while ((m = DICHIARAZIONE.exec(testo)) !== null) {
    const nome = m[1];
    if (!VISTE_STORICHE.some((r) => r.test(nome))) continue;
    if (CONSENTITE[nome]) continue;
    const b = corpo(testo, m.index);
    trovate.push({ file: f, nome, righe: b.split('\n').length });
    for (const v of VIETATI) {
      const trovato = b.match(v.re);
      if (!trovato) continue;
      const riga = testo.slice(0, m.index + b.indexOf(trovato[0])).split('\n').length;
      violazioni.push({ file: f, funzione: nome, riga, cosa: v.cosa, testo: trovato[0] });
    }
  }
}

const esito = { fileAnalizzati: file.length, vistePresidiate: trovate.length, violazioni };

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(esito, null, 2));
} else {
  const breve = (f) => f.replace('src/legacy/', '').replace('app/src/modules/', 'mod:');
  console.log('\nIL MOTORE NON ENTRA DOVE SI LEGGE IL PASSATO — ' + file.length + ' file\n');
  console.log('  viste storiche presidiate : ' + trovate.length);
  trovate.forEach((t) => console.log('      ' + breve(t.file) + ' · ' + t.nome + '()  ' + t.righe + ' righe'));
  console.log('\n  eccezioni dichiarate      : ' + Object.keys(CONSENTITE).length);
  Object.entries(CONSENTITE).forEach(([k, v]) => console.log('      ' + k + '() — ' + v));

  if (violazioni.length) {
    console.error('\nVIOLAZIONI');
    violazioni.forEach((v) => console.error('  · ' + breve(v.file) + ':' + v.riga + '  ' + v.funzione + '() — ' + v.cosa + ' · ' + v.testo));
    console.log('');
    process.exit(1);
  }
  console.log('\nnessuna vista storica chiama un motore di prezzo ✔\n');
}
