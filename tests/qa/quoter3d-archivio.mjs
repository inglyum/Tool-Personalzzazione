#!/usr/bin/env node
/**
 * quoter3d-archivio.mjs — salvare non deve poter cancellare.
 *
 * `persist()` scriveva l'archivio del preventivatore 3D leggendo lo stato in
 * memoria per intero: `{mats:MATS, saved:SAVED}`. Il modulo nasce con
 * `SAVED=[]` e si riempie soltanto dentro `render()`, quindi qualunque
 * percorso che chiamasse `persist()` prima dell'idratazione riscriveva
 * l'archivio **vuoto** — e in silenzio, perché il `catch` è vuoto. Chi aveva
 * salvato dieci preventivi se ne accorgeva al ricaricamento dopo.
 *
 * Il sospetto è nato da una caduta di `quoter3d-calcoli` sotto catena piena
 * (FASE 16b: «dopo il ricaricamento l'archivio c'è ancora (0)») che non si è
 * riprodotta da sola. Non ho una prova che fosse questo. Ho però trovato il
 * percorso che produce esattamente quella forma di guasto, e questa suite lo
 * chiude: l'archivio si unisce a quello su disco invece di sostituirlo, e
 * solo le cancellazioni dichiarate possono accorciarlo.
 *
 *   node tests/qa/quoter3d-archivio.mjs [file]
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
const archivio = () => page.evaluate(() => {
  try { return (JSON.parse(localStorage.getItem('p3dq_v4') || '{}').saved) || []; } catch (e) { return []; }
});

/* ── FASE A · un preventivo salvato davvero ──────────────────────────────── */

await page.evaluate(async () => {
  await App.navigate('print3d');
  await new Promise((r) => setTimeout(r, 2500));
  Print3DQuoter.clearLines();
  await new Promise((r) => setTimeout(r, 300));
  const n = document.getElementById('p3d-name');
  if (n) n.value = 'Archivio collaudo';
  Print3DQuoter.addLine();
  await new Promise((r) => setTimeout(r, 600));
  Print3DQuoter.doSave();
  await new Promise((r) => setTimeout(r, 900));
});
const dopoSalvataggio = await archivio();
dico('FASE A · il preventivo si salva (' + dopoSalvataggio.length + ')', dopoSalvataggio.length >= 1);

/* ── FASE B · il caso che cancellava tutto ───────────────────────────────
   Si riproduce lo stato che il difetto richiedeva: un modulo appena caricato,
   con l'elenco in memoria ancora vuoto, che salva i materiali. Prima questo
   bastava a portarsi via l'archivio. */

const dopoPersistCieco = await page.evaluate(async () => {
  /* Il percorso pubblico più vicino al difetto: una modifica ai materiali
     chiama `persist()` senza toccare l'elenco dei preventivi. Prima bastava
     questo, con l'elenco in memoria non ancora idratato, a riscrivere
     l'archivio vuoto. */
  if (typeof Print3DQuoter.rmMat === 'function') Print3DQuoter.rmMat('__inesistente__');
  await new Promise((r) => setTimeout(r, 500));
  return (JSON.parse(localStorage.getItem('p3dq_v4') || '{}').saved || []).length;
});
dico('FASE B · una modifica ai materiali non tocca i preventivi salvati ('
  + dopoPersistCieco + ')', dopoPersistCieco >= dopoSalvataggio.length);

/* ── FASE C · e sopravvive al ricaricamento ──────────────────────────────── */

await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);
const dopoRicarica = await archivio();
dico('FASE C · dopo il ricaricamento l archivio c è ancora (' + dopoRicarica.length + ')',
  dopoRicarica.length >= dopoSalvataggio.length);
dico('FASE C2 · con il nome che aveva',
  dopoRicarica.some((x) => x && x.n === 'Archivio collaudo'));

/* ── FASE D · aprire la sezione non lo accorcia ──────────────────────────── */

const dopoApertura = await page.evaluate(async () => {
  await App.navigate('print3d');
  await new Promise((r) => setTimeout(r, 3000));
  return (JSON.parse(localStorage.getItem('p3dq_v4') || '{}').saved || []).length;
});
dico('FASE D · aprire il preventivatore non accorcia l archivio (' + dopoApertura + ')',
  dopoApertura >= dopoRicarica.length);

/* ── FASE E · ma cancellare deve funzionare ──────────────────────────────
   Un archivio che non si può più svuotare sarebbe il difetto opposto. */

const dopoCancellazione = await page.evaluate(async () => {
  const saved = (JSON.parse(localStorage.getItem('p3dq_v4') || '{}').saved) || [];
  const quanti = saved.length;
  Print3DQuoter.delSaved(saved[0].id);
  await new Promise((r) => setTimeout(r, 800));
  const dopo = (JSON.parse(localStorage.getItem('p3dq_v4') || '{}').saved) || [];
  return { prima: quanti, dopo: dopo.length, restaQuelCheResta: !dopo.some((x) => x.id === saved[0].id) };
});
dico('FASE E · cancellare un preventivo lo toglie davvero ('
  + dopoCancellazione.prima + ' → ' + dopoCancellazione.dopo + ')',
  dopoCancellazione.dopo === dopoCancellazione.prima - 1 && dopoCancellazione.restaQuelCheResta);

const dopoSvuotamento = await page.evaluate(async () => {
  Print3DQuoter.clearSaved();
  await new Promise((r) => setTimeout(r, 800));
  return (JSON.parse(localStorage.getItem('p3dq_v4') || '{}').saved || []).length;
});
dico('FASE E2 · e svuotare l archivio lo svuota (' + dopoSvuotamento + ')', dopoSvuotamento === 0);

console.log('\nARCHIVIO DEL PREVENTIVATORE 3D — SALVARE NON CANCELLA\n');
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
console.log('\nl archivio si perde solo quando qualcuno lo cancella apposta ✔\n');
await browser.close();
