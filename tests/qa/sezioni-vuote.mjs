#!/usr/bin/env node
/**
 * sezioni-vuote.mjs — nessuna voce di menù porta a una pagina bianca.
 *
 * Misurato aprendo l'applicazione una sezione per volta, prima di questo
 * lavoro. Tre cause diverse dietro allo stesso sintomo:
 *
 *   weeklyreport   0 caratteri. Il modulo è completo e produce 1617 caratteri
 *                  se lo si chiama a mano. Non veniva chiamato: era un `const`
 *                  mai esportato, e la rotta rinviava il disegno a
 *                  `requestIdleCallback` senza scadenza — «quando capita», che
 *                  in una pagina da centoquarantotto script può voler dire mai.
 *   pdfmonth,      stessa rotta rinviata senza scadenza.
 *   kpi, intel,
 *   forecasting,
 *   contentcalendar
 *   revsim         0 caratteri. `RevSim` non è definito in nessun sorgente:
 *                  la funzione non è mai stata scritta.
 *   bu, team       una griglia vuota sotto l'intestazione. Qui la prima
 *                  diagnosi era sbagliata: sembravano moduli mancanti, sono
 *                  moduli completi con l'archivio vuoto. Il difetto non era
 *                  l'assenza del modulo ma l'assenza di una parola che
 *                  spiegasse il vuoto — chi apre la sezione la prima volta
 *                  vedeva lo stesso schermo di chi ha un guasto.
 *
 * Qui si apre ognuna e si guarda cosa c'è. Non si legge il codice.
 *
 *   node tests/qa/sezioni-vuote.mjs [file]
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

/* ── FASE A · le sei rotte rinviate disegnano davvero ─────────────────────── */

/* Erano rinviate a `requestIdleCallback` senza scadenza. La soglia è bassa di
   proposito: qui non si giudica la ricchezza della schermata, si distingue
   «ha disegnato» da «è rimasta bianca». */
const RINVIATE = ['weeklyreport', 'pdfmonth', 'kpi', 'intel', 'forecasting', 'contentcalendar'];
const misure = {};
for (const s of RINVIATE) {
  misure[s] = await page.evaluate(async (sez) => {
    await window.App.navigate(sez);
    await new Promise((r) => setTimeout(r, 2200));
    const v = document.getElementById('view-' + sez);
    return v ? v.textContent.trim().length : -1;
  }, s);
  dico('FASE A · «' + s + '» disegna (' + misure[s] + ' caratteri)', misure[s] > 100);
}

/* ── FASE B · le tre sezioni senza modulo dicono la verità ────────────────── */

const SENZA_MODULO = {
  revsim: { titolo: /Revenue Simulator/i, altrove: /Financial Forecaster/i },
};

for (const [s, atteso] of Object.entries(SENZA_MODULO)) {
  const r = await page.evaluate(async (sez) => {
    await window.App.navigate(sez);
    await new Promise((r) => setTimeout(r, 1800));
    const v = document.getElementById('view-' + sez);
    if (!v) return null;
    return {
      testo: v.textContent.trim(),
      chars: v.textContent.trim().length,
      /* I comandi che non comandano niente: un onclick verso un modulo che non
         esiste. Sono il pezzo peggiore della sezione vuota. */
      morti: [...v.querySelectorAll('[onclick]')]
        .map((b) => b.getAttribute('onclick') || '')
        .filter((a) => /\b(RevSim|BU|Team)\./.test(a)),
      vivi: [...v.querySelectorAll('[onclick]')].length,
    };
  }, s);

  dico('FASE B · «' + s + '» non è più bianca (' + (r ? r.chars : '—') + ' caratteri)',
    r && r.chars > 200);
  dico('FASE B2 · «' + s + '» dice di cosa si tratta', r && atteso.titolo.test(r.testo));
  dico('FASE B3 · «' + s + '» dichiara che non c\'è ancora',
    r && /non ancora disponibile/i.test(r.testo));
  dico('FASE B4 · «' + s + '» indica cosa usare adesso', r && atteso.altrove.test(r.testo));
  dico('FASE B5 · «' + s + '» non ha più pulsanti che non fanno niente ('
    + (r ? r.morti.length : '—') + ')', r && r.morti.length === 0);
  dico('FASE B6 · e i pulsanti che restano portano da qualche parte ('
    + (r ? r.vivi : '—') + ')', r && r.vivi >= 2);
}

/* ── FASE B7 · l'archivio vuoto si spiega, non si subisce ─────────────────── */

/* `BU` e `Team` sono due moduli completi: disegnavano una griglia vuota perché
   non c'era ancora nessun record. Il vuoto adesso parla, e il pulsante che lo
   riempie è lì dentro. */
for (const [s, atteso] of Object.entries({
  bu: { dice: /nessuna business unit/i, apre: 'BU.openModal' },
  team: { dice: /nessuna persona/i, apre: 'Team.openModal' },
})) {
  const r = await page.evaluate(async (sez) => {
    await window.App.navigate(sez);
    await new Promise((r) => setTimeout(r, 2000));
    const v = document.getElementById('view-' + sez);
    return v ? {
      testo: v.textContent.trim(), chars: v.textContent.trim().length,
      azioni: [...v.querySelectorAll('[onclick]')].map((b) => b.getAttribute('onclick') || ''),
    } : null;
  }, s);
  dico('FASE B7 · «' + s + '» spiega perché è vuota (' + (r ? r.chars : '—') + ' caratteri)',
    r && atteso.dice.test(r.testo));
  dico('FASE B8 · «' + s + '» non dice «non disponibile»: il modulo c\'è',
    r && !/non ancora disponibile/i.test(r.testo));
  dico('FASE B9 · «' + s + '» offre il comando per riempirla',
    r && r.azioni.some((a) => a.indexOf(atteso.apre) >= 0));
}

/* ── FASE C · le alternative funzionano davvero ───────────────────────────── */

/* Un pannello che rimanda a una sezione rotta sposta il problema di una
   schermata. Si preme il primo consiglio e si guarda dove si finisce. */
const seguito = await page.evaluate(async () => {
  await window.App.navigate('revsim');
  await new Promise((r) => setTimeout(r, 1600));
  const b = document.querySelector('#view-revsim [onclick*="navigate"]');
  if (!b) return null;
  b.click();
  await new Promise((r) => setTimeout(r, 2200));
  const attiva = document.querySelector('.section-view.active');
  return { sezione: attiva ? attiva.id : '(nessuna)', chars: attiva ? attiva.textContent.trim().length : 0 };
});
dico('FASE C · il consiglio porta a una sezione che esiste ('
  + (seguito ? seguito.sezione : '—') + ')', seguito && seguito.sezione !== '(nessuna)');
dico('FASE C2 · e quella sezione ha contenuto (' + (seguito ? seguito.chars : '—') + ')',
  seguito && seguito.chars > 200);

/* ── FASE D · il modulo vero, se ci fosse, vincerebbe ─────────────────────── */

const precedenza = await page.evaluate(async () => {
  window.__revsimChiamato = false;
  window.RevSim = { render() {
    window.__revsimChiamato = true;
    document.getElementById('view-revsim').innerHTML = '<p>modulo vero</p>';
  } };
  await window.App.navigate('dashboard');
  await new Promise((r) => setTimeout(r, 900));
  await window.App.navigate('revsim');
  await new Promise((r) => setTimeout(r, 1800));
  const v = document.getElementById('view-revsim');
  const esito = { chiamato: window.__revsimChiamato, testo: v.textContent.trim() };
  delete window.RevSim;
  return esito;
});
dico('FASE D · con un modulo vero la rotta chiama quello', precedenza.chiamato);
dico('FASE D2 · e il pannello non gli si sovrappone',
  /modulo vero/.test(precedenza.testo) && !/non ancora disponibile/i.test(precedenza.testo));

/* ── FASE E · nessuna sezione dell'applicazione resta bianca ──────────────── */

/* Il controllo d'insieme: si gira tutto il menù e si contano le sezioni che
   dopo la navigazione non hanno disegnato niente. */
const bianche = await page.evaluate(async () => {
  const voci = [...document.querySelectorAll('.nav-item[data-section]')]
    .map((v) => v.getAttribute('data-section'));
  const uniche = [...new Set(voci)];
  const vuote = [];
  /* Si aspetta che disegni, non un istante fisso: `etsy_pulse` impiega circa un
     secondo e con un'attesa secca risultava bianca senza esserlo. Chi non ha
     disegnato niente dopo due secondi, però, per l'utente è bianca. */
  const SCADENZA = 2000, PASSO = 150;
  for (const s of uniche) {
    try { await window.App.navigate(s); } catch (e) { continue; }
    let chars = 0;
    for (let atteso = 0; atteso < SCADENZA; atteso += PASSO) {
      await new Promise((r) => setTimeout(r, PASSO));
      const v = document.getElementById('view-' + s);
      if (!v || !v.classList.contains('active')) { chars = -1; break; }
      chars = v.textContent.trim().length;
      if (chars > 0) break;
    }
    if (chars === 0) vuote.push(s);
  }
  return { esaminate: uniche.length, vuote };
});
dico('FASE E · girate ' + bianche.esaminate + ' voci di menù, sezioni bianche: '
  + (bianche.vuote.length ? bianche.vuote.join(' · ') : 'nessuna'),
  bianche.vuote.length === 0);

console.log('\nSEZIONI VUOTE — UNA VOCE DI MENÙ DEVE PORTARE DA QUALCHE PARTE\n');
for (const s of RINVIATE) console.log('  ' + s.padEnd(18) + misure[s] + ' caratteri');
console.log('');

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
console.log('\nnessuna pagina bianca ✔\n');
await browser.close();
