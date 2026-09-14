#!/usr/bin/env node
/**
 * previsioni.mjs — una previsione sola, e dichiara quanto vale.
 *
 * Il programma prometteva le previsioni in tre punti: `forecaster`, che le fa
 * davvero; `forecasting`, 54 righe sotto un'intestazione che annunciava
 * «Scenario planning · Break-even · Cash runway» — cioè quello che fa l'altro;
 * e `revsim`, il cui modulo `RevSim` non è definito in nessun file.
 *
 * E la previsione che usciva da quell'unica implementazione vera era una
 * regressione su **dodici mesi fissi**, con zero nei mesi in cui il
 * laboratorio non esisteva ancora, più il mese corrente incompleto dentro il
 * calcolo. Da lì uscivano tre cifre in euro precise all'unità.
 *
 * Qui si scrivono vendite vere in archivio e si guarda cosa mostra la
 * schermata, nei due casi che contano: quando la storia non basta e quando
 * basta.
 *
 *   node tests/qa/previsioni.mjs [file]
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
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* ── FASE A · una previsione sola ────────────────────────────────────────── */

const moduli = await page.evaluate(() => ({
  previsioni: !!window.InglyPrevisioni,
  forecaster: typeof window.FinancialForecaster !== 'undefined',
  /* Il modulo fantasma: non è mai esistito e continua a non esistere. */
  revsim: typeof window.RevSim !== 'undefined',
  vistaForecasting: !!document.getElementById('view-forecasting'),
  vistaRevsim: !!document.getElementById('view-revsim'),
  vistaForecaster: !!document.getElementById('view-forecaster'),
  /* Il pannello che spiegava l'assenza: ritirato insieme alla sezione. */
  pannelloVuoti: !!window.InglySezioneIncompleta,
}));
dico('FASE A · il modulo delle previsioni è nel file consegnato', moduli.previsioni);
dico('FASE A2 · la sezione vera c\'è', moduli.forecaster && moduli.vistaForecaster);
dico('FASE A3 · le due sezioni doppie non ci sono più',
  !moduli.vistaForecasting && !moduli.vistaRevsim);
dico('FASE A4 · RevSim continua a non esistere', !moduli.revsim);
dico('FASE A5 · e il pannello che ne spiegava l\'assenza è stato ritirato con lei',
  !moduli.pannelloVuoti);

/* ── FASE B · i due nomi storici aprono la sezione vera ─────────────────── */

const rotte = await page.evaluate(async () => {
  const esiti = {};
  for (const nome of ['forecasting', 'revsim']) {
    await window.App.navigate(nome);
    await new Promise((r) => setTimeout(r, 2500));
    const v = document.getElementById('view-forecaster');
    esiti[nome] = {
      attiva: !!v && v.classList.contains('active'),
      chars: v ? v.innerText.trim().length : 0,
    };
  }
  return esiti;
});
dico('FASE B · «forecasting» apre la sezione vera (' + rotte.forecasting.chars + ' caratteri)',
  rotte.forecasting.attiva && rotte.forecasting.chars > 200);
dico('FASE B2 · «revsim» pure (' + rotte.revsim.chars + ' caratteri)',
  rotte.revsim.attiva && rotte.revsim.chars > 200);

/* ── FASE C · il calcolo puro rifiuta quando deve ───────────────────────── */

const puro = await page.evaluate(() => {
  const P = window.InglyPrevisioni;
  if (!P) return null;
  const v = (m, a) => ({ date: m + '-10', amount: a });
  const adesso = Date.parse('2026-09-15T00:00:00Z');
  /* Tre mesi veri in crescita. Il vecchio calcolo ci metteva davanti nove
     zeri e ne leggeva una crescita ripidissima. */
  const corto = P.daRighe([v('2026-06', 1000), v('2026-07', 1100), v('2026-08', 1200)], { adesso });
  const lungo = P.daRighe([
    v('2026-02', 1000), v('2026-03', 1100), v('2026-04', 1200),
    v('2026-05', 1300), v('2026-06', 1400), v('2026-07', 1500), v('2026-08', 1600),
  ], { adesso });
  const ballerino = P.daRighe([
    v('2026-02', 100), v('2026-03', 3000), v('2026-04', 200),
    v('2026-05', 2800), v('2026-06', 150), v('2026-07', 3100), v('2026-08', 120),
  ], { adesso });
  return {
    cortoDisponibile: corto.disponibile,
    cortoMesi: corto.mesiReali,
    cortoMotivo: corto.motivo || '',
    lungoDisponibile: lungo.disponibile,
    lungoMesi: lungo.mesiReali,
    lungoPrimo: lungo.previsione[0].valore,
    lungoLivello: lungo.affidabilita.id,
    lungoFrase: P.frase(lungo),
    ballerinoLivello: ballerino.affidabilita.id,
    intervalloCresce: ballerino.previsione[2].intervallo > ballerino.previsione[0].intervallo,
  };
});
dico('FASE C · con tre mesi di storia non si prevede niente ('
  + (puro ? puro.cortoMesi + ' mesi' : '—') + ')',
  puro && puro.cortoDisponibile === false && puro.cortoMesi === 3);
dico('FASE C2 · e si dice perché (' + (puro ? puro.cortoMotivo.slice(0, 45) : '—') + '…)',
  puro && /almeno 4 mesi/.test(puro.cortoMotivo));
dico('FASE C3 · con sette mesi la previsione c\'è (' + (puro ? '€' + puro.lungoPrimo : '—') + ')',
  puro && puro.lungoDisponibile && puro.lungoPrimo > 1600);
dico('FASE C4 · una serie ordinata ha attendibilità buona (' + (puro ? puro.lungoLivello : '—') + ')',
  puro && puro.lungoLivello === 'buona');
dico('FASE C5 · una serie che salta ha attendibilità debole (' + (puro ? puro.ballerinoLivello : '—') + ')',
  puro && puro.ballerinoLivello === 'debole');
dico('FASE C6 · e l\'incertezza cresce andando avanti nel tempo', puro && puro.intervalloCresce);

/* ── FASE D · la schermata senza abbastanza storia ─────────────────────── */

const scarsa = await page.evaluate(async () => {
  const g = (m) => m + '-10';
  const oggi = new Date();
  const mese = (indietro) => {
    const d = new Date(oggi.getFullYear(), oggi.getMonth() - indietro, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  };
  await window.IDB.clearStore('sales').catch(() => {});
  for (let i = 0; i < 2; i++) {
    await window.IDB.put('sales', {
      id: 970001 + i, clientName: 'Collaudo', amount: 1000,
      status: 'pagato', date: g(mese(i + 1)),
    });
  }
  if (window.BDW) window.BDW._loaded = false;
  await window.App.navigate('forecaster');
  await new Promise((r) => setTimeout(r, 3500));
  const v = document.getElementById('view-forecaster');
  return { testo: v ? v.innerText : '', chars: v ? v.innerText.trim().length : 0 };
});
dico('FASE D · la sezione si disegna anche senza storia (' + scarsa.chars + ' caratteri)',
  scarsa.chars > 200);
dico('FASE D2 · e dichiara che la previsione non c\'è, invece di mostrare €0',
  /non disponibile|—/.test(scarsa.testo) && !/Forecast \+1 mese\s*€\s*0(?!\d)/.test(scarsa.testo));
dico('FASE D3 · dicendo che servono più mesi conclusi', /mesi conclusi/.test(scarsa.testo));

/* ── FASE E · la schermata con abbastanza storia ───────────────────────── */

const ricca = await page.evaluate(async () => {
  const oggi = new Date();
  const mese = (indietro) => {
    const d = new Date(oggi.getFullYear(), oggi.getMonth() - indietro, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  };
  await window.IDB.clearStore('sales').catch(() => {});
  for (let i = 1; i <= 7; i++) {
    await window.IDB.put('sales', {
      id: 971000 + i, clientName: 'Collaudo', amount: 1000 + (7 - i) * 100,
      status: 'pagato', date: mese(i) + '-10',
    });
  }
  if (window.BDW) window.BDW._loaded = false;
  await window.App.navigate('dashboard');
  await new Promise((r) => setTimeout(r, 800));
  await window.App.navigate('forecaster');
  await new Promise((r) => setTimeout(r, 4000));
  const v = document.getElementById('view-forecaster');
  return { testo: v ? v.innerText : '', chars: v ? v.innerText.trim().length : 0 };
});
dico('FASE E · con sette mesi la sezione mostra la previsione (' + ricca.chars + ' caratteri)',
  ricca.chars > 300);
dico('FASE E2 · e dichiara su quanti mesi si basa', /mesi conclusi/.test(ricca.testo));
dico('FASE E3 · con l\'attendibilità accanto', /attendibilità/i.test(ricca.testo));

console.log('\nPREVISIONI — UNA SOLA, E DICHIARA QUANTO VALE\n');
if (puro) {
  console.log('  3 mesi di storia : ' + (puro.cortoDisponibile ? 'previsione' : 'nessuna previsione'));
  console.log('  7 mesi di storia : € ' + puro.lungoPrimo + ' · ' + puro.lungoLivello);
  console.log('  ' + puro.lungoFrase + '\n');
}

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
console.log('\nuna previsione che dice su quanto si basa ✔\n');
await browser.close();
