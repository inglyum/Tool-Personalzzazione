#!/usr/bin/env node
/**
 * product-builder-confezione.mjs — la confezione contata una volta sola.
 *
 * Il difetto: `recompute()` sommava `packaging` e `extra` dentro
 * `materialCost` **e** li passava a `Data.price` come voci proprie. Ogni euro
 * di confezione entrava due volte nel costo, e quindi nel prezzo. La
 * scomposizione mostrata a schermo invece li contava una volta sola: prezzo e
 * spiegazione non tornavano, e nessuno dei due avvisava.
 *
 *   node tests/qa/product-builder-confezione.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(e.message));
page.on('dialog', (d) => d.accept());

await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* Il conto si verifica sul motore, che è dove il prezzo si forma davvero:
   due chiamate identiche tranne la confezione devono differire esattamente
   del valore della confezione. */
const conto = await page.evaluate(async () => {
  const D = window.InglyData || window.Data;
  const chiama = (packaging) => D.price({
    materialCost: 10, machineMin: 0, laborMin: 0, category: '', qty: 1,
    packaging, other: 0,
  });
  const senza = await chiama(0);
  const con = await chiama(3);
  return {
    disponibile: !!D && !senza.empty,
    senza: senza.cost != null ? senza.cost : (senza.totalCost != null ? senza.totalCost : null),
    con: con.cost != null ? con.cost : (con.totalCost != null ? con.totalCost : null),
    chiavi: Object.keys(senza).join(','),
  };
});
dico('il motore di pricing risponde (' + conto.chiavi.slice(0, 80) + ')', conto.disponibile);
if (conto.senza != null && conto.con != null) {
  dico('3 € di confezione aggiungono 3 € al costo, non 6 ('
    + conto.senza.toFixed(2) + ' → ' + conto.con.toFixed(2) + ')',
    Math.abs((conto.con - conto.senza) - 3) < 0.01);
}

/* E nella vista: il costo mostrato deve coincidere con quello del motore. */
const vista = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  App.navigate('product_builder');
  await a(2500);
  /* La confezione sta al passo 6, «Costi». */
  const vai = (i) => {
    const t = document.querySelector('[data-pb-step="' + i + '"]');
    if (t) t.click();
  };
  vai(4); await a(600);
  const min = document.querySelector('[data-pb="laborMin"]');
  if (min) { min.value = '10'; min.dispatchEvent(new Event('input', { bubbles: true })); }
  await a(900);
  vai(5); await a(900);
  const campo = document.querySelector('[data-pb="packaging"]');
  if (!campo) return { campo: false, html: (document.getElementById('view-product_builder') || {}).innerText };
  const leggi = () => {
    const tot = document.querySelector('.pb__cost-list li.is-total span:last-child');
    if (!tot) return null;
    return parseFloat(tot.textContent.replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  };
  const righeConfezione = () => [...document.querySelectorAll('.pb__cost-list li')]
    .filter((li) => /packaging|confezion/i.test(li.textContent)).length;
  campo.value = '0'; campo.dispatchEvent(new Event('input', { bubbles: true }));
  await a(1200);
  const senza = leggi();
  campo.value = '3'; campo.dispatchEvent(new Event('input', { bubbles: true }));
  await a(1200);
  const con = leggi();
  const testo = document.body.innerText;
  return { campo: true, senza, con, righe: righeConfezione(),
    mostraConfezione: /Packaging|Confezion/i.test(testo) };
});
dico('il campo confezione esiste al passo Costi', vista.campo === true);
dico('e la scomposizione la nomina', vista.mostraConfezione !== false);
dico('il costo totale è leggibile in entrambe le prove (' + vista.senza + ' → ' + vista.con + ')',
  typeof vista.senza === 'number' && isFinite(vista.senza)
  && typeof vista.con === 'number' && isFinite(vista.con));
dico('nella vista 3 € di confezione aggiungono 3 € (' + vista.senza + ' → ' + vista.con + ')',
  typeof vista.senza === 'number' && typeof vista.con === 'number'
  && Math.abs((vista.con - vista.senza) - 3) < 0.02);
dico('e la confezione compare una volta sola nella scomposizione (' + vista.righe + ')', vista.righe === 1);
dico('nessun errore JavaScript durante la prova', erroriJS.length === 0);

console.log('\nPRODUCT BUILDER — LA CONFEZIONE SI CONTA UNA VOLTA\n');
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
console.log('\nla confezione si conta una volta ✔\n');
await browser.close();
