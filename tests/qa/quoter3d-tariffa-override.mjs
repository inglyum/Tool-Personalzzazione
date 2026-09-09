#!/usr/bin/env node
/**
 * quoter3d-tariffa-override.mjs — chi decide quanto costa un'ora.
 *
 * Il numero 18 stava scritto in quattro punti del preventivatore 3D: nel
 * markup del campo, nel ripiego di `aggiornaLavoro`, in quello di `ingresso()`
 * e nel predefinito salvato. Quattro copie dello stesso numero, e nessuna
 * diceva da dove venisse.
 *
 * Ora decide una funzione sola, con tre livelli dichiarati:
 *   1. quello scritto per questo preventivo, se qualcuno l'ha scritto;
 *   2. il profilo economico del laboratorio;
 *   3. un ripiego, che sta in una costante sola.
 *
 * Questa suite verifica i tre livelli, che l'override locale non tocchi il
 * profilo globale, e che nessuna delle dodici operazioni del preventivatore
 * perda il valore.
 *
 *   node tests/qa/quoter3d-tariffa-override.mjs [file]
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

const apri = () => page.evaluate(async () => {
  App.navigate('print3d');
  await new Promise((s) => setTimeout(s, 2600));
  const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  set('p3d-g', '250'); set('p3d-h', '9.95'); set('p3d-qty', '1');
  Print3DQuoter.calc();
  await new Promise((s) => setTimeout(s, 900));
});

const stato = () => page.evaluate(() => {
  const i = Print3DQuoter._ingresso();
  const campo = document.getElementById('p3d-lr');
  return {
    campo: campo ? parseFloat(campo.value) : null,
    tariffa: Print3DQuoter.tariffaOraria(),
    fonte: Print3DQuoter.fonteTariffa(),
    laborPerHour: i.laborPerHour,
    laborRate: i.laborRate,
    laborRateSource: i.laborRateSource,
    laborRateOverride: i.laborRateOverride,
    laborRateProfile: i.laborRateProfile,
    costo: Math.round((Print3DQuoter._calcolo() || {}).costo * 1000) / 1000,
  };
});

/* ── Livello 3 · nessuno ha deciso: il predefinito, dichiarato come tale ───
   «Il laboratorio ha scelto 18» e «nessuno ha scelto, e 18 è quello che il
   programma propone» sono lo stesso numero e due cose diverse. */
await apri();
const ripiego = await stato();
dico('FASE A · senza profilo compilato la tariffa è il predefinito, e lo dichiara ('
  + ripiego.tariffa + ' €/h, fonte «' + ripiego.fonte + '»)',
  ripiego.tariffa === 18 && ripiego.fonte === 'predefinito');
dico('FASE A2 · e il campo mostra lo stesso numero che usa il motore ('
  + ripiego.campo + ' = ' + ripiego.laborPerHour + ')',
  ripiego.campo === ripiego.laborPerHour);
dico('FASE A3 · l ingresso porta anche la provenienza, non solo il numero ('
  + ripiego.laborRateSource + ', override ' + ripiego.laborRateOverride + ')',
  ripiego.laborRateSource === 'predefinito' && ripiego.laborRateOverride === false);

/* ── Livello 2 · il profilo del laboratorio ──────────────────────────────── */
await page.evaluate(async () => {
  await InglyCostProfilesStore.salvaManodopera([
    { id: 'stampa3d', label: 'Operatore stampa 3D', costoOrarioInterno: 22, tariffaCliente: 44 },
    { id: 'operatore', label: 'Operatore', costoOrarioInterno: 22, tariffaCliente: 44 },
  ]);
  await InglyCostProfilesStore.ingresso({});
  await new Promise((s) => setTimeout(s, 400));
});
await apri();
const daProfilo = await stato();
dico('FASE B · con il profilo configurato la tariffa lo segue ('
  + ripiego.tariffa + ' → ' + daProfilo.tariffa + ' €/h)',
  daProfilo.tariffa === 22 && daProfilo.fonte === 'profilo');
dico('FASE B2 · il campo si allinea da solo, senza che nessuno lo tocchi ('
  + daProfilo.campo + ')', daProfilo.campo === 22);
dico('FASE B3 · e il costo cambia di conseguenza (€ ' + ripiego.costo
  + ' → € ' + daProfilo.costo + ')', daProfilo.costo > ripiego.costo);

/* ── Livello 1 · l'override di questo preventivo ─────────────────────────── */
const override = await page.evaluate(async () => {
  const e = document.getElementById('p3d-lr');
  e.value = '35';
  e.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((s) => setTimeout(s, 900));
  const i = Print3DQuoter._ingresso();
  /* Il profilo globale non deve essersi mosso. */
  const globale = await InglyCostProfilesStore.ingresso({ ruolo: 'stampa3d' });
  return {
    tariffa: Print3DQuoter.tariffaOraria(),
    fonte: Print3DQuoter.fonteTariffa(),
    override: i.laborRateOverride,
    profiloNellIngresso: i.laborRateProfile,
    profiloGlobale: globale.laborPerHour,
    costo: Math.round((Print3DQuoter._calcolo() || {}).costo * 1000) / 1000,
  };
});
dico('FASE C · scritto a mano, comanda il preventivo (' + override.tariffa
  + ' €/h, fonte «' + override.fonte + '»)',
  override.tariffa === 35 && override.fonte === 'preventivo');
dico('FASE C2 · ed è dichiarato come override', override.override === true);
dico('FASE C3 · il profilo globale non si è mosso (' + override.profiloGlobale + ' €/h)',
  override.profiloGlobale === 22);
dico('FASE C4 · e l ingresso ricorda tutti e due i numeri (profilo '
  + override.profiloNellIngresso + ', usato ' + override.tariffa + ')',
  override.profiloNellIngresso === 22);
dico('FASE C5 · il costo segue la tariffa scritta (€ ' + daProfilo.costo
  + ' → € ' + override.costo + ')', override.costo > daProfilo.costo);

/* ── Dodici operazioni, e il valore non si perde ─────────────────────────── */
const dodici = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  const leggi = () => {
    const c = document.getElementById('p3d-lr');
    return { campo: c ? parseFloat(c.value) : null, tariffa: Print3DQuoter.tariffaOraria() };
  };
  const passi = [];
  const fai = async (nome, fn) => { try { await fn(); } catch (e) {} await a(420); passi.push(Object.assign({ nome }, leggi())); };

  await fai('peso', () => set('p3d-g', '400'));
  await fai('tempo', () => set('p3d-h', '6'));
  await fai('IVA', () => Print3DQuoter.setIva && Print3DQuoter.setIva(false));
  await fai('IVA on', () => Print3DQuoter.setIva && Print3DQuoter.setIva(true));
  await fai('strategia', () => Print3DQuoter.setStrategia && Print3DQuoter.setStrategia('premium'));
  await fai('sconto', () => Print3DQuoter.setDisc && Print3DQuoter.setDisc(10));
  await fai('resina', () => Print3DQuoter.setType && Print3DQuoter.setType('resin'));
  await fai('FDM', () => Print3DQuoter.setType && Print3DQuoter.setType('fdm'));
  await fai('quantità', () => set('p3d-qty', '10'));
  await fai('macchina', () => { const s = document.getElementById('p3d-mach'); if (s && s.options.length > 1) { s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); } });
  await fai('materiale', () => { const s = document.getElementById('p3d-mat'); if (s && s.options.length > 1) { s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); } });
  await fai('ridisegno', () => Print3DQuoter.render());
  return passi;
});
const perse = dodici.filter((p) => p.tariffa !== 35 || p.campo !== 35);
dico('FASE D · dodici operazioni e la tariffa scritta resta 35 €/h'
  + (perse.length ? ' — persa dopo: ' + perse.map((p) => p.nome + '=' + p.campo).join(', ') : ''),
  perse.length === 0);

/* ── Il reset la riporta a seguire il laboratorio ────────────────────────── */
const dopoReset = await page.evaluate(async () => {
  Print3DQuoter.reset();
  await new Promise((s) => setTimeout(s, 1200));
  const c = document.getElementById('p3d-lr');
  return { campo: c ? parseFloat(c.value) : null, fonte: Print3DQuoter.fonteTariffa() };
});
dico('FASE E · il reset riporta la tariffa al profilo (' + dopoReset.campo
  + ' €/h, fonte «' + dopoReset.fonte + '»)',
  dopoReset.campo === 22 && dopoReset.fonte === 'profilo');

/* ── Nessun 18 nascosto ──────────────────────────────────────────────────── */
const nascosti = await page.evaluate(() => {
  /* Se un 18 vivesse ancora in un ripiego, cambiare il profilo a 30 e non
     toccare niente lascerebbe uno dei conti indietro. */
  const src = [String(Print3DQuoter.calc), String(Print3DQuoter.render)].join('\n');
  return { conta: (src.match(/\b18\b/g) || []).length };
});
const coerenza = await page.evaluate(async () => {
  await InglyCostProfilesStore.salvaManodopera([{ id: 'stampa3d', costoOrarioInterno: 30, tariffaCliente: 60 }]);
  await InglyCostProfilesStore.ingresso({});
  await new Promise((s) => setTimeout(s, 500));
  App.navigate('print3d');
  await new Promise((s) => setTimeout(s, 2600));
  const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  set('p3d-g', '250'); set('p3d-h', '9.95'); set('p3d-qty', '1');
  Print3DQuoter.calc();
  await new Promise((s) => setTimeout(s, 900));
  const i = Print3DQuoter._ingresso();
  const c = document.getElementById('p3d-lr');
  const tot = document.getElementById('p3d-lavoro-tot');
  return {
    campo: c ? parseFloat(c.value) : null,
    motore: i.laborPerHour,
    riepilogo: tot ? tot.textContent : '',
  };
});
dico('FASE F · cambiando il profilo a 30 €/h tutto lo segue: campo '
  + coerenza.campo + ', motore ' + coerenza.motore,
  coerenza.campo === 30 && coerenza.motore === 30);
dico('FASE F2 · compreso il riepilogo dei minuti umani, che aveva un 18 suo ('
  + coerenza.riepilogo.replace(/\s+/g, ' ').slice(0, 48) + ')',
  /min/.test(coerenza.riepilogo) && !/€\s*0[,.]00\/pz/.test(coerenza.riepilogo));

console.log('\nQUANTO COSTA UN ORA, E CHI L HA DECISO\n');
console.log('  senza profilo   : ' + ripiego.tariffa + ' €/h (' + ripiego.fonte + ')');
console.log('  con il profilo  : ' + daProfilo.tariffa + ' €/h (' + daProfilo.fonte + ')');
console.log('  scritto a mano  : ' + override.tariffa + ' €/h (' + override.fonte
  + '), profilo globale intatto a ' + override.profiloGlobale + ' €/h\n');

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
console.log('\nun numero, una fonte, e nessun 18 nascosto ✔\n');
await browser.close();
