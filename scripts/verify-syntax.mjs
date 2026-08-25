#!/usr/bin/env node
/**
 * verify-syntax.mjs — controlla che ogni sorgente JS sia parsabile.
 *
 * Il monolite ha accumulato blocchi da fonti diverse: un errore di sintassi in
 * uno di essi interrompe il caricamento di tutti quelli successivi, e nel file
 * unico il sintomo è "l'app non parte" senza indicare dove.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const roots = process.argv.slice(2);
const targets = roots.length ? roots : ['src/legacy', 'src/admin/legacy', 'src/app-shell', 'scripts'];

const walk = (dir, acc = []) => {
  if (!fs.existsSync(dir)) return acc;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith('.js') || p.endsWith('.mjs')) acc.push(p);
  }
  return acc;
};

let checked = 0;
const failures = [];
for (const t of targets) {
  for (const file of walk(t)) {
    const code = fs.readFileSync(file, 'utf8');
    checked += 1;
    try {
      // I sorgenti estratti sono script classici; i moduli ES (i tool e i
      // sorgenti di src/) hanno la propria sintassi e li verifica `node --check`.
      if (file.endsWith('.mjs') || /^\s*(import|export)\s/m.test(code)) continue;
      new vm.Script(code, { filename: file });
    } catch (e) {
      failures.push(`${file}: ${e.message}`);
    }
  }
}

if (failures.length) {
  console.error(`sintassi: ${failures.length} file non parsabili su ${checked}`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log(`sintassi: ${checked} file JS parsati senza errori ✔`);
