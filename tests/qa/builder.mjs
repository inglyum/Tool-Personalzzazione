#!/usr/bin/env node
/**
 * builder.mjs — QA del Product Builder con il laboratorio popolato.
 * Percorre gli otto passi, compila un prodotto reale e verifica che il costo
 * venga da PricingEngine e non da un calcolo nostro.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { SEED, seedScript } from './seed.mjs';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const outDir = 'tests/__screenshots__/builder';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error' && !/net::/.test(m.text())) errors.push(m.text().slice(0, 200)); });

await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
});

await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(6000);
await page.evaluate(seedScript(SEED));
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(8000);
await page.evaluate(() => {
  [...document.querySelectorAll('body > div')].forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' && el.getBoundingClientRect().width > window.innerWidth * 0.7) el.remove();
  });
});

await page.evaluate(() => window.ProductBuilder.open());
await page.waitForTimeout(1200);

const out = {};
out.montato = await page.evaluate(() => !!document.querySelector('.pb'));
out.passi = await page.$$eval('.pb__rail-step', (e) => e.map((x) => x.innerText.trim()));

// Passo 1 — prodotto
await page.fill('[data-pb="name"]', 'Portachiavi personalizzato');
await page.fill('[data-pb="category"]', 'Gadget');
await page.waitForTimeout(500);
await page.click('[data-pb-next]');
await page.waitForTimeout(400);

// Passo 2 — tecnologia
out.tecnologie = await page.$$eval('.pb__card-label', (e) => e.map((x) => x.innerText.trim()));
await page.click('[data-pb-tech="laser"]');
await page.waitForTimeout(400);
out.macchineLaser = await page.evaluate(() => {
  document.querySelector('[data-pb-step="2"]').click();
  return null;
});
await page.waitForTimeout(500);
out.macchineProposte = await page.$$eval('.pb__row-title', (e) => e.map((x) => x.innerText.trim()));
await page.click('[data-pb-machine="eq1"]');
await page.waitForTimeout(400);

// Passo 4 — materiale
await page.click('[data-pb-step="3"]');
await page.waitForTimeout(400);
await page.selectOption('[data-pb="materialId"]', 'i1');
await page.waitForTimeout(500);
await page.fill('[data-pb="materialQty"]', '0.25');
await page.waitForTimeout(600);

// Passo 5 — produzione
await page.click('[data-pb-step="4"]');
await page.waitForTimeout(400);
await page.fill('[data-pb="machineMin"]', '6.8');
await page.fill('[data-pb="laborMin"]', '1.4');
await page.waitForTimeout(700);

// Passo 6 — costi
await page.click('[data-pb-step="5"]');
await page.waitForTimeout(600);
await page.fill('[data-pb="packaging"]', '0.25');
await page.waitForTimeout(800);
out.vociCosto = await page.$$eval('.pb__cost-list li', (e) => e.map((x) => x.innerText.replace(/\n/g, ' = ')));
await page.screenshot({ path: path.join(outDir, '01-costi.png'), fullPage: true });

// Passo 7 — prezzo
await page.click('[data-pb-step="6"]');
await page.waitForTimeout(700);
out.prezzi = await page.$$eval('.pb__price', (e) => e.map((x) => x.innerText.replace(/\n/g, ' ')));
await page.screenshot({ path: path.join(outDir, '02-prezzo.png'), fullPage: true });

// Passo 8 — varianti
await page.click('[data-pb-step="7"]');
await page.waitForTimeout(400);
await page.fill('[data-pb-variant="dimension"]', 'S, M, L');
await page.fill('[data-pb-variant="material"]', 'MDF, acrilico');
await page.waitForTimeout(700);
out.combinazioni = await page.evaluate(() => {
  const a = document.querySelector('.ds-alert--info');
  return a ? a.innerText.trim() : null;
});
out.scheda = await page.$$eval('.pb__summary-list > div', (e) => e.map((x) => x.innerText.replace(/\n/g, ' = ')));
out.guida = await page.$$eval('.pb__guide-list li', (e) => e.map((x) => x.innerText.trim()));
await page.screenshot({ path: path.join(outDir, '03-varianti.png'), fullPage: true });

// Verifica che il costo venga dal motore, non da noi
out.coerenteConMotore = await page.evaluate(async () => {
  const s = window.ProductBuilder.state;
  const engine = await window.PricingEngine.suggest({
    materialCost: 1.8 * 0.25 + 0.25, machineMin: 6.8, laborMin: 1.4, category: 'Gadget',
  });
  const shown = document.querySelector('.pb__summary-list')?.innerText || '';
  return { motore: engine, mostrato: shown.includes(engine.totalCost.toFixed(2).replace('.', ',')) };
});

await browser.close();
console.log(JSON.stringify(out, null, 1));
console.log(`\nerrori JS: ${errors.length}`);
for (const e of [...new Set(errors)].slice(0, 8)) console.log('  ' + e);
