#!/usr/bin/env node
/**
 * incassi.mjs — «segna pagato» era scritto tre volte, e in tre modi diversi.
 *
 * Nell'applicazione vera si incassa la stessa vendita dai tre punti — il
 * pulsante della riga, la selezione multipla, il pannello Solleciti — e si
 * verifica che il risultato sia lo stesso: data di incasso, ordine collegato
 * che diventa venduto, traccia nel registro. Prima di questa fase soltanto il
 * primo percorso faceva tutte e tre le cose, e Solleciti non scriveva nemmeno
 * la data.
 *
 *   node tests/qa/incassi.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
page.on('dialog', (d) => d.accept().catch(() => {}));
await page.addInitScript(() => {
  ['ingly_wizard_done_v2', 'ingly_tour_done_v1', '_wizard_done_v37', '_v37sidebar_done']
    .forEach((k) => localStorage.setItem(k, '1'));
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

const modulo = await page.evaluate(() => ({
  esiste: !!window.InglyPagamenti,
  api: window.InglyPagamenti
    ? ['stato', 'piano', 'registra'].filter((k) => typeof window.InglyPagamenti[k] === 'function')
    : [],
  motore: !!(window.InglyDomain && window.InglyDomain.payments
    && typeof window.InglyDomain.payments.paymentPlan === 'function'),
}));
dico('il modulo incassi è nel file consegnato', modulo.esiste);
dico('e ha le tre funzioni (' + modulo.api.join(', ') + ')', modulo.api.length === 3);
dico('il motore pagamenti che esisteva già è ancora quello (nessun secondo sistema)', modulo.motore);

const piano = await page.evaluate(() => window.InglyPagamenti.piano(200, 100));
dico('il piano di pagamento viene dal motore esistente', piano.fonte === 'InglyDomain.payments.paymentPlan');
dico('acconto 100 su 200 → saldo 100, 50%', piano.acconto === 100 && piano.saldo === 100 && piano.accontoPct === 0.5);

/* ── I tre percorsi, sulla stessa forma di dati ──────────────────────────── */

const esiti = await page.evaluate(async () => {
  const fatto = {};
  const prepara = async (idV, idO) => {
    await window.IDB.put('orders', { id: idO, stage: 'produzione', clientName: 'Rossi', createdAt: Date.now() });
    await window.IDB.put('sales', {
      id: idV, clientName: 'Rossi', desc: 'Targa', amount: 150, netAmount: 150,
      grossAmount: 183, status: 'da_pagare', orderId: idO,
      date: new Date().toISOString().slice(0, 10),
    });
  };
  const leggi = async (idV, idO) => {
    const v = await window.IDB.get('sales', idV);
    const o = await window.IDB.get('orders', idO);
    return { stato: v && v.status, quando: !!(v && v.paidAt), ordine: o && o.stage };
  };

  await prepara(970001, 970101);
  await window.Sales.markPaid(970001).catch(() => {});
  fatto.riga = await leggi(970001, 970101);

  await prepara(970002, 970102);
  window.Sales._selected = new Set([970002]);
  await window.Sales.bulkMarkPaid().catch(() => {});
  fatto.blocco = await leggi(970002, 970102);

  await prepara(970003, 970103);
  if (window.Solleciti) await window.Solleciti.markPaid(970003).catch(() => {});
  fatto.solleciti = await leggi(970003, 970103);

  /* Due volte lo stesso incasso non deve raddoppiare niente. */
  const prima = await window.IDB.get('sales', 970001);
  await window.Sales.markPaid(970001).catch(() => {});
  const dopo = await window.IDB.get('sales', 970001);
  fatto.dueVolte = { uguale: prima.paidAt === dopo.paidAt };

  return fatto;
});

for (const [nome, e] of Object.entries(esiti)) {
  if (nome === 'dueVolte') continue;
  dico(nome + ' · la vendita risulta pagata', e.stato === 'pagato');
  dico(nome + ' · con la data di incasso', e.quando === true);
  dico(nome + ' · e l\'ordine collegato non è più in produzione (' + e.ordine + ')', e.ordine === 'sold');
}
dico('incassare due volte non riscrive la data', esiti.dueVolte.uguale);

console.log('\nINCASSI\n');
const problemi = [];
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));
console.log('\ncontrolli: ' + passi.length + ' · errori JavaScript: ' + erroriJS.length);
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\ntre pulsanti, un solo incasso ✔\n');
await browser.close();
