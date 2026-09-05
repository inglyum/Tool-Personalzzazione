#!/usr/bin/env node
/**
 * quoter3d-parco.mjs — il preventivatore 3D usa le macchine registrate.
 *
 * Il difetto: `MACH` è un elenco di modelli commerciali noti — un listino, non
 * un inventario — e il preventivatore leggeva solo quello. Il parco vero sta
 * in `equipment`, con il prezzo pagato davvero, le ore di vita dichiarate e la
 * manutenzione di quella macchina. Due registri per la stessa stampante, e
 * vinceva sempre il listino.
 *
 * È l'ultimo punto rimasto aperto in docs/COST-PARAMETERS-AUDIT.md.
 *
 *   node tests/qa/quoter3d-parco.mjs [file]
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

/* Una macchina registrata con numeri che NON somigliano a nessun preset:
   se i campi si riempiono con questi, vengono da lì e non dal listino. */
const preparato = await page.evaluate(async () => {
  await IDB.put('equipment', {
    id: 3301, name: 'La mia stampante', brand: 'OFFICINA', model: 'X9',
    tech: 'print3d', purchasePrice: 777, usefulLifeHours: 7000,
    averagePowerW: 111, maintenancePerHour: 0.33,
  });
  /* E una registrata a metà: deve comparire, dichiarata incompleta, senza
     riempire i campi di zeri. */
  await IDB.put('equipment', {
    id: 3302, name: 'Comprata usata', brand: 'IGNOTA', model: 'Z1', tech: 'print3d',
  });
  App.navigate('print3d');
  await new Promise((s) => setTimeout(s, 4000));
  const sel = document.getElementById('p3d-mach');
  return {
    tendina: !!sel,
    gruppi: sel ? [...sel.querySelectorAll('optgroup')].map((g) => g.label) : [],
    mie: sel ? [...sel.querySelectorAll('optgroup[label="Le tue macchine"] option')].map((o) => o.textContent) : [],
    noti: sel ? sel.querySelectorAll('optgroup[label="Modelli noti"] option').length : 0,
  };
});
dico('la tendina delle macchine esiste', preparato.tendina);
dico('le macchine registrate hanno il loro gruppo, prima dei modelli noti ('
  + preparato.gruppi.join(' | ') + ')',
  preparato.gruppi[0] === 'Le tue macchine' && preparato.gruppi[1] === 'Modelli noti');
dico('ci sono entrambe le macchine registrate (' + preparato.mie.join(' · ') + ')', preparato.mie.length === 2);
dico('quella incompleta è dichiarata tale', preparato.mie.some((t) => /da completare/.test(t)));
dico('i modelli noti restano disponibili (' + preparato.noti + ')', preparato.noti >= 10);

/* Scegliendola, i campi devono venire dal record, manutenzione compresa. */
const scelta = await page.evaluate(async () => {
  const v = (id) => { const e = document.getElementById(id); return e ? e.value : null; };
  const prima = { watt: v('p3d-watt'), costo: v('p3d-mc'), vita: v('p3d-lh'), manut: v('p3d-mnt') };
  Print3DQuoter.pickMach('parco:3301');
  await new Promise((s) => setTimeout(s, 900));
  const dopo = { watt: v('p3d-watt'), costo: v('p3d-mc'), vita: v('p3d-lh'), manut: v('p3d-mnt') };
  const hint = (document.getElementById('p3d-mach-hint') || {}).textContent || '';
  return { prima, dopo, hint };
});
dico('il costo della macchina viene dal record (' + scelta.prima.costo + ' → ' + scelta.dopo.costo + ')',
  String(scelta.dopo.costo) === '777');
dico('e le ore di vita (' + scelta.dopo.vita + ')', String(scelta.dopo.vita) === '7000');
dico('e la potenza (' + scelta.dopo.watt + ')', String(scelta.dopo.watt) === '111');
dico('la MANUTENZIONE viene dalla macchina, non dal valore iniziale del modulo ('
  + scelta.prima.manut + ' → ' + scelta.dopo.manut + ')',
  String(scelta.prima.manut) === '0.12' && String(scelta.dopo.manut) === '0.33');
dico('il suggerimento mostra il costo orario di quella macchina', /\/h/.test(scelta.hint));

/* La macchina incompleta non deve scrivere zeri nei campi. */
const incompleta = await page.evaluate(async () => {
  const v = (id) => { const e = document.getElementById(id); return e ? e.value : null; };
  Print3DQuoter.pickMach('parco:3302');
  await new Promise((s) => setTimeout(s, 900));
  return { costo: v('p3d-mc'), vita: v('p3d-lh'), watt: v('p3d-watt') };
});
dico('una macchina registrata a metà non azzera i campi ('
  + [incompleta.costo, incompleta.vita, incompleta.watt].join(' · ') + ')',
  Number(incompleta.costo) > 0 && Number(incompleta.vita) > 0 && Number(incompleta.watt) > 0);

/* E il costo calcolato deve seguire i numeri della macchina scelta. */
const conto = await page.evaluate(async () => {
  const MK = window.InglyMachineCost;
  const mia = MK.daCatalogo({ id: 3301, name: 'OFFICINA X9', price: 777, life_h: 7000,
    w: 111, maint: 0.33 }, { kwhPrice: 0.28 });
  const preset = MK.daCatalogo({ id: 'custom', name: 'Personalizzata', price: 420, life_h: 3000,
    w: 150, maint: 0.12 }, { kwhPrice: 0.28 });
  return {
    mia: Math.round(mia.machineCostPerHour * 1000) / 1000,
    preset: Math.round(preset.machineCostPerHour * 1000) / 1000,
    manutMia: Math.round(mia.maintenanceCostPerHour * 1000) / 1000,
  };
});
dico('il costo orario della macchina registrata è diverso da quello del preset ('
  + conto.mia + ' vs ' + conto.preset + ')', conto.mia !== conto.preset);
dico('e la sua manutenzione è la sua (' + conto.manutMia + ')', conto.manutMia === 0.33);

/* Dopo il ricaricamento la macchina è ancora nel parco. */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);
const dopoReload = await page.evaluate(async () => {
  App.navigate('print3d');
  await new Promise((s) => setTimeout(s, 4000));
  const sel = document.getElementById('p3d-mach');
  return {
    mie: sel ? sel.querySelectorAll('optgroup[label="Le tue macchine"] option').length : 0,
    record: !!(await IDB.get('equipment', 3301).catch(() => null)),
  };
});
dico('dopo il ricaricamento le macchine registrate sono ancora nella tendina (' + dopoReload.mie + ')',
  dopoReload.mie === 2 && dopoReload.record === true);

console.log('\nSMART QUOTER 3D — LE MACCHINE SONO QUELLE DEL LABORATORIO\n');
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
console.log('\nil preventivatore usa il parco vero ✔\n');
await browser.close();
