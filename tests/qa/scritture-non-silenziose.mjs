#!/usr/bin/env node
/**
 * scritture-non-silenziose.mjs — un salvataggio che fallisce si sente.
 *
 * Misurato sul codice storico: 517 blocchi `catch {}` vuoti, di cui 200
 * avvolgono una scrittura. Ognuno di quei duecento è un salvataggio che può
 * non avvenire senza che nessuno lo dica.
 *
 * Riscrivere duecento punti di 9 MB di codice che funziona è il modo di
 * romperne uno per correggerne un altro. Si intercetta il canale, come già
 * fatto con `console.error`: il comportamento non cambia — l'eccezione viene
 * rilanciata, la promessa resta rifiutata, chi ha un `catch {}` continua a
 * ingoiarla — ma prima l'errore è nel registro e l'utente è avvisato.
 *
 * Questo collaudo verifica esattamente quelle due proprietà: **si sente** e
 * **non cambia niente**.
 *
 *   node tests/qa/scritture-non-silenziose.mjs [file]
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

/* La sorveglianza è installata su entrambi i canali. */
const installata = await page.evaluate(() => ({
  registro: !!(window.Ingly && window.Ingly.Errors),
  localStorage: !!(localStorage.setItem && localStorage.setItem.__inglySpia),
  idbPut: !!(window.IDB && window.IDB.put && window.IDB.put.__inglySpia),
  idbBulk: !!(window.IDB && window.IDB.putBulk && window.IDB.putBulk.__inglySpia),
}));
dico('il registro degli errori c è', installata.registro);
dico('localStorage.setItem è sorvegliato', installata.localStorage);
dico('IDB.put è sorvegliato', installata.idbPut);
dico('e anche IDB.putBulk', installata.idbBulk);

/* Un `catch {}` attorno a una scrittura fallita: l'utente lo deve sapere.

   Il guasto si simula sostituendo la funzione **sotto** la spia e
   reinstallando la sorveglianza, che è esattamente ciò che succede quando il
   browser esaurisce la quota: la scrittura vera fallisce e chi la chiama ha un
   `catch` vuoto. */
const ingoiato = await page.evaluate(async () => {
  const avvisi = [];
  const toastOriginale = window.toast;
  window.toast = function (m, t) { avvisi.push({ m: String(m), t: t }); };
  Ingly.Errors.pulisci();

  const spiaCorrente = localStorage.setItem;
  const guasto = function () {
    const err = new Error('spazio esaurito (simulato)');
    err.name = 'QuotaExceededError';
    throw err;
  };
  localStorage.setItem = guasto;      // sotto la spia
  Ingly.sorvegliaScritture();         // la spia si rimette sopra

  let rilanciata = false;
  /* La forma che il codice storico usa duecento volte. */
  try { localStorage.setItem('__prova__', 'x'); } catch (e) { rilanciata = true; }

  await new Promise((s) => setTimeout(s, 300));
  const errori = Ingly.Errors.elenco();
  localStorage.setItem = spiaCorrente;
  window.toast = toastOriginale;
  return {
    rilanciata,
    registrato: errori.some((e) => /spazio esaurito/.test(e.messaggio)),
    avvisato: avvisi.some((a) => /salvataggio non è riuscito/i.test(a.m)),
  };
});
dico('l eccezione viene comunque rilanciata: il comportamento non cambia', ingoiato.rilanciata === true);
dico('ma finisce nel registro', ingoiato.registrato === true);
dico('e l utente viene avvisato', ingoiato.avvisato === true);

/* Lo stesso per il database, con la forma `.catch(()=>{})`. */
const ingoiatoIDB = await page.evaluate(async () => {
  const avvisi = [];
  const toastOriginale = window.toast;
  window.toast = function (m, t) { avvisi.push({ m: String(m), t: t }); };
  Ingly.Errors.pulisci();
  /* L'avviso è limitato a uno ogni dieci secondi: si aspetta perché la prova
     precedente non copra questa. */
  await new Promise((s) => setTimeout(s, 10500));

  const spiaCorrente = IDB.put;
  IDB.put = function () { return Promise.reject(new Error('scrittura respinta (simulato)')); };
  Ingly.sorvegliaScritture();

  let ingoiataDalChiamante = false;
  /* La forma esatta del codice storico: la promessa viene ingoiata. */
  await IDB.put('clients', { id: 992001 }).catch(() => { ingoiataDalChiamante = true; });

  await new Promise((s) => setTimeout(s, 400));
  const errori = Ingly.Errors.elenco();
  IDB.put = spiaCorrente;
  window.toast = toastOriginale;
  return {
    ingoiataDalChiamante,
    registrato: errori.some((e) => /scrittura respinta/.test(e.messaggio)),
    avvisato: avvisi.some((a) => /salvataggio non è riuscito/i.test(a.m)),
  };
});
dico('la promessa resta rifiutata: chi ha un catch continua a ingoiarla',
  ingoiatoIDB.ingoiataDalChiamante === true);
dico('ma il fallimento è nel registro', ingoiatoIDB.registrato === true);
dico('e l utente lo sa', ingoiatoIDB.avvisato === true);

/* E in condizioni normali non disturba nessuno. */
const normale = await page.evaluate(async () => {
  const avvisi = [];
  const toastOriginale = window.toast;
  window.toast = function (m, t) { avvisi.push({ m: String(m), t: t }); };
  Ingly.Errors.pulisci();
  await IDB.put('clients', { id: 991001, name: 'Prova silenzio' });
  localStorage.setItem('__prova_ok__', '1');
  await new Promise((s) => setTimeout(s, 400));
  const salvato = await IDB.get('clients', 991001);
  const errori = Ingly.Errors.conta();
  window.toast = toastOriginale;
  return { salvato: !!salvato, errori, avvisi: avvisi.length, letto: localStorage.getItem('__prova_ok__') };
});
dico('una scrittura riuscita resta riuscita', normale.salvato === true && normale.letto === '1');
dico('e non produce né errori né avvisi (' + normale.errori + ' · ' + normale.avvisi + ')',
  normale.errori === 0 && normale.avvisi === 0);

/* Navigare l applicazione non deve generare avvisi. */
const giro = await page.evaluate(async () => {
  const avvisi = [];
  const toastOriginale = window.toast;
  window.toast = function (m, t) { if (t === 'error') avvisi.push(String(m)); };
  Ingly.Errors.pulisci();
  for (const s of ['dashboard', 'clienti', 'quoter', 'gestione_ordini', 'items', 'catalog', 'settings']) {
    App.navigate(s);
    await new Promise((r) => setTimeout(r, 1200));
  }
  window.toast = toastOriginale;
  return { avvisi: avvisi.length, errori: Ingly.Errors.conta(), esempi: avvisi.slice(0, 3) };
});
dico('un giro di sette sezioni non genera avvisi (' + giro.avvisi + ') né errori (' + giro.errori + ')',
  giro.avvisi === 0 && giro.errori === 0);

console.log('\nSCRITTURE — UN SALVATAGGIO CHE FALLISCE SI SENTE\n');
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
console.log('\nnessuna scrittura fallisce in silenzio ✔\n');
await browser.close();
