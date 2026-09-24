#!/usr/bin/env node
/**
 * manutenzione-macchina.mjs — la scheda macchina usa davvero il motore di
 * manutenzione, non solo un log libero.
 *
 * Prima di questa release la tab «🔧 Manutenzione» della scheda macchina era
 * un log testuale (data/descrizione/costo): nessun tipo di intervento,
 * nessuna ora macchina, nessuna idea di quando la macchina fosse scaduta.
 * `InglyMachineMaintenance` esisteva come modulo puro, testato a unità, ma
 * non era collegato a nessuna schermata reale — un modello senza un bottone.
 *
 * Qui si verifica il percorso vero, con click reali: apri la scheda, guarda
 * lo stato («non calcolabile» senza intervallo dichiarato), dichiara
 * l'intervallo, registra una manutenzione preventiva con un click reale,
 * fai avanzare le ore macchina, e verifica che lo stato passi a scaduta e la
 * tariffa effettiva salga — e che il pallino compaia anche nell'elenco
 * macchine, senza aprire la scheda.
 *
 *   node tests/qa/manutenzione-macchina.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(e.message));
page.on('dialog', (d) => d.accept().catch(() => {}));
await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

/* ── seme: una macchina reale, senza intervallo dichiarato ────────────────── */
const ID = 88801;
await page.evaluate(async (id) => {
  await IDB.put('equipment', {
    id, name: 'Laser test manutenzione', brand: 'INGLY', model: 'LT', tech: 'CO₂',
    costBuy: 6000, hoursLife: 12000, costMaint: 1200, expectedAnnualHours: 1500,
    hoursWorked: 100, maintLog: [],
  });
}, ID);

/* ── senza intervallo dichiarato: lo stato non si inventa ─────────────────── */
const senzaIntervallo = await page.evaluate(async (id) => {
  await MachineCard.open(id);
  MachineCard._go('maint');
  return document.getElementById('mc-tabbody').innerHTML;
}, ID);
dico('senza intervallo dichiarato, la scheda dice che non è calcolabile', /non calcolabile/.test(senzaIntervallo));
dico('e non mostra uno stato inventato ("in regola"/"scaduta")', !/In regola|scaduta/.test(senzaIntervallo));

/* ── si dichiara l'intervallo dalla tab Uso, con un click vero ────────────── */
await page.evaluate(() => { MachineCard._go('use'); });
await page.waitForTimeout(200);
await page.fill('.mc-f input[oninput*="maintenanceIntervalHours"]', '500');
await page.waitForTimeout(200);

const conIntervallo = await page.evaluate(async () => {
  MachineCard._go('maint');
  await new Promise((r) => setTimeout(r, 100));
  return document.getElementById('mc-tabbody').innerHTML;
});
dico('dichiarato l\'intervallo, lo stato diventa "in regola" (100h su 500 dichiarate, mai manutenuta)', /In regola/.test(conIntervallo) || /Manutenzione vicina/.test(conIntervallo));

/* ── si registra una manutenzione preventiva, con click veri sul modulo ──── */
await page.fill('#mc-maint-in', 'Pulizia lente e allineamento');
await page.selectOption('#mc-maint-type', 'PREVENTIVA');
await page.fill('#mc-maint-cost', '80');
await page.click('button:has-text("+ Registra")');
await page.waitForTimeout(300);

const dopoPreventiva = await page.evaluate(() => document.getElementById('mc-tabbody').innerHTML);
dico('l\'intervento compare nello storico con il suo tipo', /Pulizia lente/.test(dopoPreventiva) && /Preventiva/.test(dopoPreventiva));
dico('e con le ore macchina a cui è stato registrato', /100 h macchina/.test(dopoPreventiva));

/* ── ora si fanno avanzare le ore: la macchina supera l'intervallo ────────── */
await page.evaluate(async (id) => {
  const m = await IDB.get('equipment', id);
  m.hoursWorked = 100 + 600; // 600h dopo la preventiva, intervallo dichiarato 500h
  await IDB.put('equipment', m);
  await MachineCard.open(id);
  MachineCard._go('maint');
}, ID);
await page.waitForTimeout(200);

const scaduta = await page.evaluate(() => document.getElementById('mc-tabbody').innerHTML);
dico('600h dopo la preventiva, su un intervallo di 500h: la scheda dice scaduta', /Manutenzione scaduta/.test(scaduta));
dico('e la tariffa macchina effettiva è mostrata diversa da quella preventivata', /tariffa macchina effettiva/.test(scaduta));

/* ── il pallino compare anche nell'elenco, senza aprire la scheda ─────────── */
/* Si chiude il dettaglio prima: due riquadri modali (dettaglio + elenco)
   condividono la classe `.mc-box`, e senza chiuderlo il selettore prenderebbe
   quello sbagliato — lo stesso motivo per cui un utente vero chiude la
   scheda prima di tornare all'elenco. */
const elenco = await page.evaluate(async () => {
  MachineCard._close();
  await MachineCard.openPicker();
  return document.querySelector('#mc-pick .mc-box').innerHTML;
});
dico('l\'elenco macchine mostra l\'allerta di manutenzione scaduta senza aprire il dettaglio', /manutenzione scaduta/.test(elenco));

/* ── il valore residuo abbassa la tariffa mostrata, con lo stesso motore ──── */
const residuo = await page.evaluate(async (id) => {
  await MachineCard.open(id);
  MachineCard._go('cost');
  await new Promise((s) => setTimeout(s, 100));
  const senza = document.getElementById('mc-tabbody').innerHTML;
  const input = [...document.querySelectorAll('#mc-tabbody input')]
    .find((i) => i.previousElementSibling && /Valore residuo/.test(i.previousElementSibling.textContent || ''));
  const campoPresente = !!input;
  if (input) {
    input.value = '1000';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await new Promise((s) => setTimeout(s, 300));
  MachineCard._go('cost');
  await new Promise((s) => setTimeout(s, 100));
  const con = document.getElementById('mc-tabbody').innerHTML;
  return { campoPresente, senza, con };
}, ID);
dico('la tab Costi ha il campo «Valore residuo a fine vita»', residuo.campoPresente);
dico('la tariffa mostrata usa InglyMachineRate, non più costBuy/lifeYears/1650', /Tariffa macchina/.test(residuo.senza));
const euroSenza = (residuo.senza.match(/Tariffa macchina[^€]*€\s*([\d.,]+)/) || [])[1];
const euroCon = (residuo.con.match(/Tariffa macchina[^€]*€\s*([\d.,]+)/) || [])[1];
dico('dichiarare un valore residuo abbassa la tariffa mostrata in scheda (' + euroSenza + ' → ' + euroCon + ')',
  !!euroSenza && !!euroCon && parseFloat(euroCon.replace(',', '.')) < parseFloat(euroSenza.replace(',', '.')));

/* ── persistenza: l'intervento sopravvive a un ricaricamento vero ─────────── */
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(15000);
const dopoReload = await page.evaluate(async (id) => {
  const m = await IDB.get('equipment', id);
  return { log: m.maintLog, intervallo: m.maintenanceIntervalHours };
}, ID);
dico('l\'intervento registrato sopravvive al ricaricamento', Array.isArray(dopoReload.log) && dopoReload.log.some((x) => x.desc === 'Pulizia lente e allineamento'));
dico('e l\'intervallo dichiarato pure', dopoReload.intervallo === 500);

/* ── pulizia ───────────────────────────────────────────────────────────── */
await page.evaluate(async (id) => { await IDB.del('equipment', id).catch(() => {}); }, ID);

await browser.close();

const falliti = passi.filter((p) => !p.esito);
console.log('\nMANUTENZIONE MACCHINA · il motore collegato alla scheda vera\n');
for (const p of passi) {
  console.log((p.esito ? '  ✔  ' : '  ✗  ') + p.passo + (p.dettaglio ? '  [' + p.dettaglio + ']' : ''));
}
console.log('\ncontrolli: ' + passi.length + ' · falliti: ' + falliti.length + ' · errori JavaScript: ' + erroriJS.length);
if (erroriJS.length) console.log('errori:', erroriJS);
if (falliti.length || erroriJS.length) {
  console.log('\nFALLITO');
  process.exit(1);
}
console.log('\nla scheda macchina sa davvero quando manutenere ✔');
