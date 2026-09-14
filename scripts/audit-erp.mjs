#!/usr/bin/env node
/**
 * audit-erp.mjs — la mappa tecnica del modello dati, misurata.
 * Non corregge niente: conta, elenca e confronta.
 */
import fs from 'node:fs';
import path from 'node:path';

const RADICI = ['src/legacy/app/src', 'src/legacy/patches', 'src/product', 'src/app-shell'];
const file = [];
for (const r of RADICI) {
  const cammina = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) cammina(p);
      else if (/\.(js|mjs)$/.test(e.name)) file.push(p);
    }
  };
  if (fs.existsSync(r)) cammina(r);
}
const sorgenti = file.map((f) => ({ f, t: fs.readFileSync(f, 'utf8') }));
const breve = (f) => f.replace('src/legacy/app/src/modules/', 'mod:').replace('src/legacy/patches/', 'p:')
  .replace('src/legacy/app/src/', 'core:').replace('src/product/', 'prod:').replace('src/app-shell/', 'shell:');

const conta = (re) => {
  const out = new Map();
  for (const { f, t } of sorgenti) {
    const m = t.match(re);
    if (m) out.set(breve(f), m.length);
  }
  return out;
};
const totale = (m) => [...m.values()].reduce((a, b) => a + b, 0);
const cima = (m, n = 6) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
  .map(([k, v]) => k + '(' + v + ')').join(' ');

console.log('\n═══ 1 · IL VOCABOLARIO ECONOMICO ═══\n');
console.log('Quanti nomi diversi per «quanto vale questo record», e dove.\n');
const CAMPI = ['value', 'total', 'totalNet', 'totalGross', 'grossPrice', 'netPrice', 'amount',
  'totalCost', 'cost', 'costTotal', 'unitCost', 'price', 'finalPrice', 'salePrice', 'revenueNet', 'revenueGross'];
const righeCampi = [];
for (const c of CAMPI) {
  const letture = conta(new RegExp('\\.' + c + '\\b', 'g'));
  righeCampi.push({ campo: c, n: totale(letture), dove: cima(letture, 4) });
}
righeCampi.sort((a, b) => b.n - a.n);
for (const r of righeCampi) console.log(('  ' + r.campo).padEnd(16) + String(r.n).padStart(5) + '  ' + r.dove);

console.log('\n═══ 2 · STATO: status vs stage ═══\n');
for (const c of ['status', 'stage', 'paymentStatus', 'migrationStatus']) {
  const m = conta(new RegExp('\\.' + c + '\\b', 'g'));
  console.log(('  ' + c).padEnd(18) + String(totale(m)).padStart(5) + ' occorrenze in ' + m.size + ' file');
}
const valoriStato = new Map();
for (const { t } of sorgenti) {
  for (const m of t.matchAll(/\.(?:status|stage)\s*===?\s*['"]([a-z_]+)['"]/g)) {
    valoriStato.set(m[1], (valoriStato.get(m[1]) || 0) + 1);
  }
}
console.log('\n  valori confrontati nel codice:');
console.log('   ' + [...valoriStato.entries()].sort((a, b) => b[1] - a[1])
  .map(([k, v]) => k + '×' + v).join('  '));

console.log('\n═══ 3 · I PERCORSI ═══\n');
const percorso = (nome, re) => {
  const m = conta(re);
  console.log('  ' + nome.padEnd(22) + String(totale(m)).padStart(3) + ' punti · ' + cima(m, 5));
};
percorso('scrive un ordine', /IDB\.put\('orders'|putBulk\('orders'|safePut\('orders'/g);
percorso('scrive una vendita', /IDB\.put\('sales'|putBulk\('sales'|safePut\('sales'/g);
percorso('scrive un preventivo', /IDB\.put\('quotes'|putBulk\('quotes'|safePut\('quotes'/g);
percorso('quote→order', /_fromQuoteId|originQuote|quoteId\s*:/g);
percorso('order→sale', /originOrder|orderId\s*:|fromOrder/g);

console.log('\n═══ 4 · TECNOLOGIA DI PRODUZIONE ═══\n');
for (const c of ['technology', 'tecnologia', 'tech', 'production', 'primaryTechnology', 'technologies', 'operations', 'machineId', 'category']) {
  const m = conta(new RegExp('\\b' + c + '\\b', 'g'));
  console.log(('  ' + c).padEnd(20) + String(totale(m)).padStart(5) + '  ' + cima(m, 3));
}

console.log('\n═══ 5 · SNAPSHOT ═══\n');
for (const c of ['economicSnapshot', 'economic', 'economic.lines', 'calculationVersion', 'snapshot']) {
  const m = conta(new RegExp(c.replace('.', '\\.') + '\\b', 'g'));
  console.log(('  ' + c).padEnd(22) + String(totale(m)).padStart(5) + '  ' + cima(m, 3));
}
console.log('');
