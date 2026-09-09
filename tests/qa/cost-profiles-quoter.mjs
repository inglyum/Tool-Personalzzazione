#!/usr/bin/env node
/**
 * cost-profiles-quoter.mjs — i profili del laboratorio arrivano al preventivo.
 *
 * Il caso obbligatorio del comando: **250 g di PLA in 9 h 57**, un pezzo.
 *
 * Misurato prima di questo lavoro, sul file consegnato:
 *
 *     overhead 0 · imballo assente · manodopera 18 €/h presa dal markup
 *     costo pieno € 15,50 · prezzo € 25,84
 *
 * Ogni riga era aritmeticamente giusta. Il costo era basso perché tre voci non
 * c'erano: le spese generali del laboratorio, l'imballo e una tariffa oraria
 * decisa da qualcuno invece che scritta in un campo.
 *
 * Questa suite verifica le due metà del problema:
 *   · senza profili il preventivo esce lo stesso, dichiarando cosa manca;
 *   · con i profili configurati le tre voci entrano, e i conti tornano.
 *
 *   node tests/qa/cost-profiles-quoter.mjs [file]
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

/* ── I moduli esistono ──────────────────────────────────────────────────── */
const moduli = await page.evaluate(() => ({
  puro: typeof window.InglyCostProfiles,
  archivio: typeof window.InglyCostProfilesStore,
  store: ['labor_profiles', 'overhead_profiles', 'packaging_items'],
}));
dico('i profili economici sono raggiungibili (' + moduli.puro + ' / ' + moduli.archivio + ')',
  moduli.puro === 'object' && moduli.archivio === 'object');

const schema = await page.evaluate(async (nomi) => {
  const out = {};
  for (const n of nomi) {
    try { await IDB.getAll(n); out[n] = true; } catch (e) { out[n] = false; }
  }
  return out;
}, moduli.store);
dico('i tre store nuovi esistono nel database ('
  + Object.entries(schema).map(([k, v]) => k + (v ? '✓' : '✗')).join(' ') + ')',
  Object.values(schema).every(Boolean));

/* ── Il caso, prima e dopo ──────────────────────────────────────────────── */
const caso = () => page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const set = (id, v) => {
    const e = document.getElementById(id);
    if (!e) return;
    e.value = v;
    e.dispatchEvent(new Event('input', { bubbles: true }));
  };
  App.navigate('print3d');
  await a(2600);
  set('p3d-g', '250'); set('p3d-h', '9.95'); set('p3d-qty', '1');
  Print3DQuoter.calc();
  await a(1200);
  const R = Print3DQuoter._calcolo() || {};
  const i = Print3DQuoter._ingresso();
  const voci = ((R._costo && R._costo.perPezzo && R._costo.perPezzo.voci) || [])
    .reduce((acc, v) => { acc[v.id] = Math.round(v.value * 1000) / 1000; return acc; }, {});
  return {
    laborPerHour: i.laborPerHour,
    overheadPerHour: Math.round((+i.overheadPerHour || 0) * 1000) / 1000,
    imballo: (i.packagingItems || []).length,
    voci,
    overhead: Math.round((+(R._costo && R._costo.overhead) || 0) * 1000) / 1000,
    unaTantum: Math.round((+(R._costo && R._costo.unaTantum && R._costo.unaTantum.perPezzo) || 0) * 1000) / 1000,
    costo: Math.round(+R.costo * 1000) / 1000,
    prezzo: Math.round(+R.prezzo * 1000) / 1000,
    marginePct: R.marginePct,
  };
});

const prima = await caso();
dico('FASE A · senza profili il preventivo esce comunque (costo € ' + prima.costo + ')',
  prima.costo > 0 && isFinite(prima.costo));
dico('FASE A2 · e il materiale è 250 g × €/kg, non altro (€ ' + prima.voci.materiale + ')',
  Math.abs(prima.voci.materiale - 6) < 0.001);
dico('FASE A3 · senza profilo le spese generali sono zero, non inventate (€ ' + prima.overhead + ')',
  prima.overhead === 0);
dico('FASE A4 · e nessun imballo entra nel conto (' + prima.imballo + ' voci)',
  prima.imballo === 0);

/* Si configurano i profili, come farebbe il laboratorio. */
await page.evaluate(async () => {
  await InglyCostProfilesStore.salvaManodopera([
    { id: 'stampa3d', label: 'Operatore stampa 3D', costoOrarioInterno: 20, tariffaCliente: 40 },
    { id: 'operatore', label: 'Operatore', costoOrarioInterno: 20, tariffaCliente: 40 },
  ]);
  await InglyCostProfilesStore.salvaOverhead({
    modo: 'ora', oreProduttiveAnnue: 1200,
    voci: [{ id: 'affitto', label: 'Affitto', mensile: 350 },
      { id: 'software', label: 'Software', mensile: 50 }],
  });
  await InglyCostProfilesStore.salvaImballo([
    { id: 'sacchetto', label: 'Sacchetto', per: 'pezzo', costo: 0.05 },
    { id: 'scatola', label: 'Scatola', per: 'ordine', costo: 0.60 },
  ]);
  await InglyCostProfilesStore.ingresso({});
  await new Promise((s) => setTimeout(s, 400));
});

const dopo = await caso();

dico('FASE B · la manodopera arriva dal profilo, non dal markup ('
  + prima.laborPerHour + ' → ' + dopo.laborPerHour + ' €/h)',
  prima.laborPerHour === 18 && dopo.laborPerHour === 20);
dico('FASE B2 · le spese generali entrano nel costo (€ ' + dopo.overhead + ')',
  dopo.overhead > 0);
dico('FASE B3 · e sono € 4/h — € 4800 annui su 1200 ore produttive ('
  + dopo.overheadPerHour + ' €/h)',
  Math.abs(dopo.overheadPerHour - 4) < 0.001);
dico('FASE B4 · l imballo entra come voce di costo (€ ' + (dopo.voci.packaging || 0) + ')',
  Math.abs((dopo.voci.packaging || 0) - 0.65) < 0.001);
dico('FASE B5 · la finitura segue la nuova tariffa (5 min × 20 €/h = € 1,667: '
  + dopo.voci.finitura + ')', Math.abs(dopo.voci.finitura - 1.667) < 0.002);
dico('FASE B6 · il costo pieno sale di conseguenza (€ ' + prima.costo + ' → € ' + dopo.costo + ')',
  dopo.costo > prima.costo);

/* ── Il prezzo resta il margine, non un ricarico ────────────────────────── */
const atteso = Math.round((dopo.costo / (1 - dopo.marginePct / 100)) * 1000) / 1000;
dico('FASE C · prezzo = costo ÷ (1 − margine): € ' + dopo.prezzo + ' atteso € ' + atteso,
  Math.abs(dopo.prezzo - atteso) < 0.01);
dico('FASE C2 · e il margine è quello configurato (' + dopo.marginePct + '%)',
  dopo.marginePct > 0 && dopo.marginePct < 100);

/* ── Le voci che il comando §23 chiede di vedere separate ───────────────── */
const richieste = ['materiale', 'energia', 'macchina', 'manutenzione', 'packaging', 'scarto'];
const mancanti = richieste.filter((v) => !(v in dopo.voci));
dico('FASE D · il dettaglio separa le voci richieste ('
  + Object.keys(dopo.voci).join(' · ') + ')' + (mancanti.length ? ' — mancano: ' + mancanti.join(', ') : ''),
  mancanti.length === 0);
dico('FASE D2 · l avviamento resta una tantum, non per pezzo (€ ' + dopo.unaTantum + ')',
  dopo.unaTantum > 0);
dico('FASE D3 · nessuna voce è NaN o infinita',
  Object.values(dopo.voci).every((v) => isFinite(v) && v >= 0)
  && isFinite(dopo.costo) && isFinite(dopo.prezzo));

/* ── L'avviamento si divide per la quantità, non si moltiplica ──────────── */
const scaglioni = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const set = (id, v) => {
    const e = document.getElementById(id);
    if (!e) return;
    e.value = v; e.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const out = [];
  for (const q of [1, 10, 100]) {
    set('p3d-g', '250'); set('p3d-h', '9.95'); set('p3d-qty', String(q));
    Print3DQuoter.calc();
    await a(700);
    const R = Print3DQuoter._calcolo() || {};
    out.push({ q, costo: Math.round(+R.costo * 1000) / 1000,
      unaTantum: Math.round((+(R._costo && R._costo.unaTantum && R._costo.unaTantum.perPezzo) || 0) * 1000) / 1000 });
  }
  return out;
});
const [u1, u10, u100] = scaglioni;
dico('FASE E · l avviamento per pezzo cala con la quantità ('
  + scaglioni.map((s) => s.q + '→€' + s.unaTantum).join(' · ') + ')',
  u1.unaTantum > u10.unaTantum && u10.unaTantum > u100.unaTantum);
dico('FASE E2 · e cala in proporzione: su 10 pezzi è un decimo ('
  + u1.unaTantum + ' ÷ 10 = ' + (u1.unaTantum / 10).toFixed(3) + ' vs ' + u10.unaTantum + ')',
  Math.abs(u10.unaTantum - u1.unaTantum / 10) < 0.01);
dico('FASE E3 · il costo unitario scende con la quantità ('
  + scaglioni.map((s) => '€' + s.costo).join(' → ') + ')',
  u1.costo > u10.costo && u10.costo > u100.costo);

console.log('\nPROFILI ECONOMICI — LE VOCI CHE VALEVANO ZERO\n');
console.log('  250 g PLA · 9,95 h · 1 pezzo');
console.log('  senza profili : costo € ' + prima.costo + ' · prezzo € ' + prima.prezzo);
console.log('  con i profili : costo € ' + dopo.costo + ' · prezzo € ' + dopo.prezzo);
console.log('  voci aggiunte : spese generali € ' + dopo.overhead
  + ' · imballo € ' + (dopo.voci.packaging || 0)
  + ' · manodopera ' + prima.laborPerHour + '→' + dopo.laborPerHour + ' €/h\n');

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
console.log('\nil laboratorio entra nel preventivo ✔\n');
await browser.close();
