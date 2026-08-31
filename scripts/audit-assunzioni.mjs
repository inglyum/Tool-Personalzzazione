#!/usr/bin/env node
/**
 * audit-assunzioni.mjs — che cosa il preventivo dà per scontato.
 *
 * L'elenco non è scritto a mano: viene chiesto al motore, che è l'unico a
 * sapere da quale campo arriva ogni voce e quanto ci si può contare. Un
 * elenco scritto a mano invecchia al primo campo aggiunto e nessuno se ne
 * accorge — ed è proprio la classe di difetto che questo progetto continua a
 * trovare.
 *
 *   node scripts/audit-assunzioni.mjs
 */
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, console });
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), ctx);
const E = ctx.InglyCostEngine;

/* Il caso di riferimento, compilato come lo compila un utente al primo uso:
   i campi che la vista propone già riempiti, e nient'altro. */
const ORE = 9 + 57 / 60;
const CASO = {
  tecnologia: 'print3d', livelloCosto: 'completo',
  grams: 290, hours: ORE, qty: 1,
  spoolPrice: 24, spoolGrams: 1000,
  watt: 150, dutyCycle: 0.6, kwhPrice: 0.28,
  machinePrice: 400, machineLifeHours: 2000, maintenancePerHour: 0.12,
  failureRate: 7, laborPerHour: 18, setupMin: 15, finishMin: 10,
};

const r = E.calcola(CASO);
const ETICHETTA = {
  measured: 'MEASURED', verified: 'VERIFIED', declared: 'USER CONFIGURED',
  estimated: 'ESTIMATED', missing: 'MISSING',
};
const FONTE = {
  misurato: 'strumento', registro: 'FROM INVENTORY', inventario: 'FROM INVENTORY',
  resolver: 'FROM INVENTORY', macchina: 'FROM MACHINE PROFILE', fornitore: 'fornitore',
  impostazioni: 'FROM SETTINGS', utente: 'campo del preventivatore',
  inserito: 'campo del preventivatore', predefinito: 'valore predefinito',
  stimato: 'stima', mancante: 'nessuna',
};

console.log('\nASSUNZIONI DEL PREVENTIVO — caso 290 g · 9 h 57 m · 1 pz\n');
console.log('VOCE                       VALORE      FONTE                      CONFIDENZA');
console.log('─'.repeat(84));
for (const p of r.provenienza) {
  if (!(p.value > 0)) continue;
  console.log(
    p.label.padEnd(26)
    + ('€ ' + p.value.toFixed(4)).padStart(11) + '  '
    + String(FONTE[p.source] || p.source).padEnd(26)
    + (ETICHETTA[p.confidence] || p.confidence)
    + (p.confidenzaConsumo ? '  (consumo ' + ETICHETTA[p.confidenzaConsumo] + ')' : ''));
}
console.log('─'.repeat(84));
console.log('COMPLESSIVA'.padEnd(26) + ('€ ' + r.costoPezzo.toFixed(4)).padStart(11)
  + '  ' + 'la peggiore delle voci'.padEnd(26) + (ETICHETTA[r.confidenza] || r.confidenza));

console.log('\nIPOTESI DICHIARATE (cose vere date per scontate)\n');
for (const a of (r.assunzioni || [])) console.log('  · ' + a.testo);

console.log('\nAVVISI\n');
const avvisi = r.avvisi || [];
if (!avvisi.length) console.log('  nessuno');
for (const a of avvisi) console.log('  · [' + (a.livello || 'INFO') + '] ' + (a.messaggio || a.testo));

console.log('\nCAMPI NON COMPILATI IN QUESTO CASO (restano a zero, e il conto lo dice)\n');
const zero = r.provenienza.filter((p) => !(p.value > 0));
for (const p of zero) console.log('  · ' + p.label + ' — ' + (FONTE[p.source] || p.source));
console.log('');
