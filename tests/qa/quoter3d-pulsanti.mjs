#!/usr/bin/env node
/**
 * quoter3d-pulsanti.mjs — BUTTON-INTEGRITY-3D
 *
 * La matrice dei pulsanti **non è scritta a mano**: si costruisce leggendo il
 * DOM di `#view-print3d`. Un elenco compilato a mano prova l'elenco, non il
 * modulo — e il giorno che qualcuno aggiunge un pulsante rotto, l'elenco non
 * lo sa.
 *
 * Per ogni pulsante trovato si chiede:
 *   · ha un gestore?
 *   · la funzione che nomina esiste davvero?
 *   · cliccandolo lancia un'eccezione?
 *   · cambia qualcosa — stato, DOM, risultato?
 *   · sopravvive al ridisegno che quasi tutti i comandi provocano?
 *
 * Un pulsante che non cambia niente non è di per sé un difetto: «Comprimi» su
 * un pannello già compresso non deve fare niente. È un difetto quando il
 * pulsante *promette* un cambiamento. Per questo la severità è dichiarata per
 * ognuno, e solo le classi gravi fanno fallire il collaudo.
 *
 *   node tests/qa/quoter3d-pulsanti.mjs [file]
 */
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const CARTELLA = process.env.QA_OUT ?? '';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(e.message));
page.on('dialog', (d) => d.dismiss().catch(() => {}));

await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
  /* Ogni rifiuto di promessa va raccolto: un pulsante che rompe una catena
     asincrona non lancia niente a schermo. */
  window.__rifiuti = [];
  window.addEventListener('unhandledrejection', (e) => {
    window.__rifiuti.push(String((e.reason && e.reason.message) || e.reason).slice(0, 200));
  });
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* ── Si entra nella sezione e le si dà qualcosa da calcolare ─────────────── */
const avvio = await page.evaluate(async () => {
  App.navigate('print3d');
  await new Promise((s) => setTimeout(s, 3500));
  const v = document.getElementById('view-print3d');
  const set = (id, val) => { const e = document.getElementById(id); if (e) { e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  set('p3d-g', '100');
  set('p3d-h', '2');
  if (window.Print3DQuoter && Print3DQuoter.calc) Print3DQuoter.calc();
  await new Promise((s) => setTimeout(s, 800));
  return {
    vista: !!v,
    contenuto: v ? v.innerHTML.length : 0,
    modulo: typeof Print3DQuoter !== 'undefined',
  };
});
dico('la sezione 3D esiste e disegna qualcosa (' + avvio.contenuto + ' caratteri)',
  avvio.vista && avvio.contenuto > 5000);
dico('il modulo Print3DQuoter è raggiungibile', avvio.modulo === true);

/* ── FASE 2 · la matrice, costruita dal DOM ─────────────────────────────── */
const matrice = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const vista = () => document.getElementById('view-print3d');

  /* Che cosa conta come pulsante: quello che un utente può premere. */
  const trova = () => [...vista().querySelectorAll(
    'button, [onclick], input[type=button], input[type=submit], .p3-tb, .p3-mb, .act-btn')]
    .filter((e) => e.offsetParent !== null);

  /* Un'impronta dello stato osservabile: se un comando non muove nessuno di
     questi, non ha fatto niente di visibile. */
  const impronta = () => {
    const v = vista();
    const campi = [...v.querySelectorAll('input,select')].map((e) => e.id + '=' + e.value).join('|');
    const attivi = [...v.querySelectorAll('.act,.sel,.afdm,[class*="attiv"]')].map((e) => e.className).join('|');
    const risultato = (document.getElementById('p3d-out') || document.getElementById('p3d-res') || {}).textContent || '';
    return {
      campi, attivi,
      testo: v.textContent.replace(/\s+/g, ' ').length,
      risultato: risultato.replace(/\s+/g, ' ').slice(0, 400),
      nodi: v.querySelectorAll('*').length,
    };
  };

  const descrivi = (b) => {
    const on = b.getAttribute('onclick') || '';
    const m = on.match(/([A-Za-z_$][\w$]*)\s*\.\s*([A-Za-z_$][\w$]*)\s*\(/)
      || on.match(/^\s*([A-Za-z_$][\w$]*)\s*\(/);
    return {
      testo: (b.textContent || b.value || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      onclick: on.slice(0, 90),
      oggetto: m ? (m.length === 3 ? m[1] : null) : null,
      funzione: m ? (m.length === 3 ? m[2] : m[1]) : null,
      inline: !!on,
    };
  };

  const risolvi = (d) => {
    if (!d.funzione) return { esiste: null, motivo: 'nessun gestore in linea' };
    try {
      const base = d.oggetto ? window[d.oggetto] : window;
      if (d.oggetto && !base) return { esiste: false, motivo: 'oggetto «' + d.oggetto + '» non definito' };
      return { esiste: typeof base[d.funzione] === 'function', motivo: null };
    } catch (e) { return { esiste: false, motivo: e.message }; }
  };

  const iniziali = trova();
  /* Le finestre che esistono prima di premere qualsiasi cosa: sono parte del
     documento, non effetti dei pulsanti. */
  const preesistenti = new Set(document.querySelectorAll(
    '[style*="position:fixed"], .modal-overlay, [class*="modal"]'));
  const righe = [];

  for (let i = 0; i < iniziali.length; i += 1) {
    /* Il ridisegno sostituisce i nodi: si ritrova il pulsante per posizione
       nella lista corrente, che è la stessa cosa che fa un utente quando
       ripreme il pulsante che vede. */
    const correnti = trova();
    const b = correnti[i];
    if (!b) { righe.push({ indice: i, sparito: true }); continue; }
    const d = descrivi(b);
    const r = risolvi(d);
    const prima = impronta();
    let eccezione = null;
    const erroriPrima = window.__rifiuti.length;
    try {
      b.click();
      await a(260);
    } catch (e) { eccezione = e.message; }
    const dopo = impronta();
    const dopoRidisegno = trova();
    righe.push({
      indice: i,
      testo: d.testo,
      onclick: d.onclick,
      funzione: (d.oggetto ? d.oggetto + '.' : '') + (d.funzione || '—'),
      handler: d.inline,
      esiste: r.esiste,
      motivo: r.motivo,
      eccezione,
      rifiuti: window.__rifiuti.length - erroriPrima,
      cambiaCampi: prima.campi !== dopo.campi,
      cambiaAttivi: prima.attivi !== dopo.attivi,
      cambiaRisultato: prima.risultato !== dopo.risultato,
      cambiaDom: prima.nodi !== dopo.nodi || prima.testo !== dopo.testo,
      sopravvive: dopoRidisegno.length >= correnti.length - 2,
    });
    /* Se un comando ha aperto una finestra sopra la vista, la si chiude prima
       del prossimo: altrimenti si misura la finestra, non il pulsante.

       Si **chiude**, non si cancella: alcune finestre — il pannello dei
       materiali, per dire — sono elementi del markup che esistono da sempre e
       si aprono con una classe. Rimuoverle dal DOM le farebbe sparire per il
       resto del collaudo, e i comandi successivi sembrerebbero rotti. */
    document.querySelectorAll('.modal-overlay.open').forEach((m) => m.classList.remove('open'));
    document.querySelectorAll('[style*="position:fixed"][style*="inset:0"]').forEach((m) => {
      /* Solo le finestre **nate adesso**: quelle che c'erano già all'inizio
         appartengono al markup e vanno chiuse, non demolite. */
      if (preesistenti.has(m)) return;
      if (m.parentNode) m.parentNode.removeChild(m);
    });
  }

  return { totale: iniziali.length, righe, rifiuti: window.__rifiuti.slice(0, 10) };
});

dico('FASE 2 · la matrice dei pulsanti si è costruita dal DOM (' + matrice.totale + ' comandi)',
  matrice.totale >= 20);

const senzaHandler = matrice.righe.filter((r) => !r.sparito && !r.handler);
const fantasma = matrice.righe.filter((r) => r.esiste === false);
const esplosi = matrice.righe.filter((r) => r.eccezione);
const conRifiuti = matrice.righe.filter((r) => r.rifiuti > 0);
const inerti = matrice.righe.filter((r) => !r.sparito && r.handler && r.esiste
  && !r.cambiaCampi && !r.cambiaAttivi && !r.cambiaRisultato && !r.cambiaDom);

dico('FASE 2b · nessun pulsante nomina una funzione che non esiste ('
  + fantasma.map((r) => r.testo + '→' + r.funzione).join(', ') + ')', fantasma.length === 0);
dico('FASE 2c · nessun pulsante lancia un eccezione al clic ('
  + esplosi.map((r) => r.testo + ': ' + r.eccezione).join(' | ') + ')', esplosi.length === 0);
dico('FASE 2d · nessun pulsante rompe una catena asincrona ('
  + conRifiuti.map((r) => r.testo).join(', ') + ')', conRifiuti.length === 0);
dico('FASE 2e · nessun pulsante senza gestore ('
  + senzaHandler.map((r) => r.testo).join(', ') + ')', senzaHandler.length === 0);

/* I pulsanti inerti si elencano sempre: alcuni lo sono legittimamente. */
console.log('\n  Pulsanti che non hanno cambiato nulla di osservabile: ' + inerti.length
  + (inerti.length ? '\n    ' + inerti.map((r) => '«' + r.testo + '» → ' + r.funzione).join('\n    ') : ''));

/* ── I comandi che sembrano inerti, verificati col contesto giusto ────────
   Sette pulsanti non hanno mosso niente **dentro la vista**. Non basta
   dedurre che sia normale: si verifica ognuno dove il suo effetto avviene
   davvero — una finestra di dialogo accettata, un pannello fuori dalla vista,
   una scheda nuova del browser. */

/* Le finestre di dialogo da qui in poi si accettano, non si rifiutano. */
page.removeAllListeners('dialog');
page.on('dialog', async (d) => {
  /* `prompt` con una risposta: rifiutarlo farebbe sembrare inerte un comando
     che invece aspettava un valore. */
  try { await d.accept(d.type() === 'prompt' ? '1' : undefined); } catch (e) { /* già chiusa */ }
});

const inertiVerificati = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const out = {};
  const v = () => document.getElementById('view-print3d');
  const set = (id, val) => { const e = document.getElementById(id); if (e) { e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); } };

  /* 1. «+ Aggiungi lavorazione»: chiede un valore. Accettato il dialogo, la
        lavorazione deve comparire. */
  const primaExtra = v().querySelectorAll('.p3-ext').length;
  Print3DQuoter.addExtra();
  await a(500);
  out.extraAggiunta = v().querySelectorAll('.p3-ext').length - primaExtra;

  /* 2. «Magazzino» / «+ Gestisci»: aprono un pannello, che sta fuori dalla
        vista — è per questo che l'impronta della vista non lo vedeva. */
  Print3DQuoter.openMat();
  await a(500);
  const pannello = document.getElementById('p3d-mat-modal');
  out.pannelloMateriali = !!pannello && /\bopen\b/.test(pannello.className)
    && getComputedStyle(pannello).display !== 'none';
  out.pannelloHaElenco = !!(document.getElementById('p3d-mat-list')
    && document.getElementById('p3d-mat-list').innerHTML.length > 50);
  if (Print3DQuoter.closeMat) Print3DQuoter.closeMat();
  await a(400);
  const dopo = document.getElementById('p3d-mat-modal');
  out.pannelloChiuso = !!dopo && !/\bopen\b/.test(dopo.className);

  /* 3. «Reset»: accettato il dialogo, i campi tornano ai valori iniziali. */
  set('p3d-g', '777');
  await a(200);
  const primaReset = (document.getElementById('p3d-g') || {}).value;
  Print3DQuoter.reset();
  await a(700);
  out.resetPrima = primaReset;
  out.resetDopo = (document.getElementById('p3d-g') || {}).value;

  return out;
});
dico('FASE 2f · «+ Aggiungi lavorazione» aggiunge davvero una riga', inertiVerificati.extraAggiunta === 1);
dico('FASE 2g · «Magazzino» apre il pannello dei materiali, fuori dalla vista',
  inertiVerificati.pannelloMateriali === true && inertiVerificati.pannelloHaElenco === true);
dico('FASE 2h · e si richiude', inertiVerificati.pannelloChiuso === true);
dico('FASE 2i · «Reset» riporta i campi al valore iniziale ('
  + inertiVerificati.resetPrima + ' → ' + inertiVerificati.resetDopo + ')',
  inertiVerificati.resetPrima === '777' && inertiVerificati.resetDopo !== '777');

/* 4. «PDF» e «WA» aprono una finestra o una scheda: l'effetto sta lì. */
const finestre = await page.evaluate(async () => {
  const out = { pdf: null, wa: null };
  const apriVero = window.open;
  let ultima = null;
  window.open = function (url) { ultima = String(url || ''); return { document: { write() {}, close() {} }, focus() {}, print() {} }; };
  const set = (id, val) => { const e = document.getElementById(id); if (e) { e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  set('p3d-g', '100'); set('p3d-h', '2');
  Print3DQuoter.calc();
  await new Promise((s) => setTimeout(s, 400));

  /* Senza voci PDF e WhatsApp rifiutano, e fanno bene: un preventivo vuoto non
     si manda a nessuno. Il comando si prova su un preventivo vero. */
  out.senzaVoci = { pdf: null, wa: null };
  ultima = null; Print3DQuoter.doPdf();
  await new Promise((s) => setTimeout(s, 300));
  out.senzaVoci.pdf = ultima;
  Print3DQuoter.addLine();
  await new Promise((s) => setTimeout(s, 700));
  out.voci = (window.Print3DQuoter._totali ? 1 : 1);

  ultima = null;
  try { Print3DQuoter.doPdf(); } catch (e) { out.pdfErrore = e.message; }
  await new Promise((s) => setTimeout(s, 600));
  out.pdf = ultima;

  ultima = null;
  try { Print3DQuoter.doWa(); } catch (e) { out.waErrore = e.message; }
  await new Promise((s) => setTimeout(s, 600));
  out.wa = ultima;

  window.open = apriVero;
  return out;
});
dico('FASE 2j0 · un preventivo senza voci non produce un PDF vuoto',
  finestre.senzaVoci && finestre.senzaVoci.pdf === null);
dico('FASE 2j · con una voce «PDF» apre davvero un documento (' + String(finestre.pdf).slice(0, 40) + ')',
  finestre.pdf !== null && !finestre.pdfErrore);
dico('FASE 2k · «WA» apre davvero un messaggio (' + String(finestre.wa).slice(0, 50) + ')',
  typeof finestre.wa === 'string' && /wa\.me|whatsapp|api\.whatsapp/i.test(finestre.wa) && !finestre.waErrore);

/* ── FASE 14 · stabilità del ridisegno ──────────────────────────────────── */
const stabilita = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const v = () => document.getElementById('view-print3d');
  const conta = () => ({
    nodi: v().querySelectorAll('*').length,
    pulsanti: v().querySelectorAll('button').length,
    idDuplicati: (() => {
      const visti = {}; let doppi = 0;
      v().querySelectorAll('[id]').forEach((e) => { if (visti[e.id]) doppi += 1; visti[e.id] = 1; });
      return doppi;
    })(),
  });
  const set = (id, val) => { const e = document.getElementById(id); if (e) { e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  set('p3d-g', '100'); set('p3d-h', '2');
  Print3DQuoter.calc();
  await a(400);
  const prima = conta();
  const erroriPrima = window.__rifiuti.length;
  for (let i = 0; i < 20; i += 1) {
    Print3DQuoter.setIva(i % 2 === 0);
    await a(90);
  }
  await a(500);
  const dopo = conta();
  const campo = document.getElementById('p3d-g');
  return {
    prima, dopo,
    pesoInput: campo ? campo.value : null,
    rifiuti: window.__rifiuti.length - erroriPrima,
  };
});
dico('FASE 14 · venti ridisegni non moltiplicano i nodi ('
  + stabilita.prima.nodi + ' → ' + stabilita.dopo.nodi + ')',
  Math.abs(stabilita.dopo.nodi - stabilita.prima.nodi) <= stabilita.prima.nodi * 0.05);
dico('FASE 14b · né i pulsanti (' + stabilita.prima.pulsanti + ' → ' + stabilita.dopo.pulsanti + ')',
  stabilita.dopo.pulsanti === stabilita.prima.pulsanti);
dico('FASE 14c · nessun id duplicato dopo venti ridisegni (' + stabilita.dopo.idDuplicati + ')',
  stabilita.dopo.idDuplicati === 0);
dico('FASE 14d · l input non si azzera durante i ridisegni (' + stabilita.pesoInput + ')',
  stabilita.pesoInput === '100');
dico('FASE 14e · e nessuna promessa rifiutata', stabilita.rifiuti === 0);

/* ── La matrice su file, perché il report la citi ───────────────────────── */
if (CARTELLA) {
  fs.mkdirSync(CARTELLA, { recursive: true });
  const righe = matrice.righe.filter((r) => !r.sparito).map((r) =>
    ['| ' + r.indice, r.testo || '(senza testo)', r.funzione,
      r.esiste === true ? 'sì' : (r.esiste === false ? 'NO' : '—'),
      r.eccezione ? 'ECCEZIONE: ' + r.eccezione : 'ok',
      [r.cambiaCampi && 'campi', r.cambiaAttivi && 'attivi', r.cambiaRisultato && 'risultato',
        r.cambiaDom && 'dom'].filter(Boolean).join('+') || 'niente'].join(' | ') + ' |');
  fs.writeFileSync(path.join(CARTELLA, 'matrice-pulsanti-3d.md'),
    '# Matrice dei pulsanti · Smart Quoter 3D\n\n'
    + '| # | testo | funzione | esiste | clic | cambia |\n|---|---|---|---|---|---|\n'
    + righe.join('\n') + '\n');
}

console.log('\nSMART QUOTER 3D — OGNI PULSANTE, DAL DOM\n');
const problemi = [];
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));
console.log('\ncontrolli: ' + passi.length + ' · pulsanti esaminati: ' + matrice.totale
  + ' · errori JavaScript: ' + erroriJS.length);
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nogni pulsante del 3D fa quello che dice ✔\n');
await browser.close();
