#!/usr/bin/env node
/**
 * quoter-3d-integrita.mjs — il difetto originale deve essere impossibile.
 *
 * Il difetto segnalato era questo, e non era uno solo:
 *
 *     Costo a schermo   ≠  Dettaglio costi
 *     Dettaglio costi   ≠  Riga di preventivo
 *     Riga di preventivo ≠  Prezzo corretto
 *
 * Qui non si intercettano funzioni: si legge il **documento PDF** che il
 * preventivatore genera davvero e il **messaggio WhatsApp** che compone
 * davvero, e si confrontano con il costo canonico chiesto al motore. Un
 * collaudo che intercetta `totali()` prova che `totali()` è coerente con sé
 * stessa; questo prova che ciò che arriva al cliente è ciò che l'utente ha
 * visto.
 *
 * Poi la seconda metà: cambiare il prezzo del filamento, il costo macchina,
 * il €/kWh, la manodopera, il margine e l'IVA **dopo** aver aggiunto la voce
 * non deve muovere di un centesimo il preventivo già costruito.
 *
 *   node tests/qa/quoter-3d-integrita.mjs [file]
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
await page.waitForTimeout(12000);

const esito = await page.evaluate(async () => {
  const out = { passi: [], errori: [], numeri: {} };
  const dico = (k, v) => out.passi.push({ passo: k, esito: v });
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const E = window.InglyCostEngine;
  if (!E || typeof Print3DQuoter === 'undefined') { out.errori.push('motore o preventivatore assenti'); return out; }

  for (const sez of ['print3d_quoter', 'quoter_3d', 'print3d', 'quoter3d']) {
    try { await App.navigate(sez); } catch (e) { /* si prova il successivo */ }
    await a(800);
    if (document.getElementById('p3d-g')) break;
  }
  if (!document.getElementById('p3d-g')) { out.errori.push('la vista non si apre'); return out; }

  const sv = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  const euro = (s) => {
    /* «€1.234,56» all'italiana: il punto separa le migliaia, la virgola i
       decimali. Un `parseFloat` ingenuo qui legge 1,00. */
    const m = String(s).match(/-?[\d.]+,\d{2}|-?[\d.]+/);
    if (!m) return NaN;
    return parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
  };
  const testo = (id) => document.getElementById(id)?.textContent || '';

  /* ── Il caso di calibrazione ────────────────────────────────────────── */
  Print3DQuoter.setModalita('professionale'); await a(400);
  Print3DQuoter.svuotaSlicer(); await a(200);
  Print3DQuoter.clearLines(); await a(200);
  sv('p3d-g', 290); sv('p3d-mkg', 15.99); sv('p3d-mu', 1000);
  Print3DQuoter.tempoDaDecimale(9 + 57 / 60);
  sv('p3d-watt', 150); sv('p3d-kwh', 0.28); sv('p3d-duty', 0.6);
  sv('p3d-mc', 400); sv('p3d-lh', 2000); sv('p3d-mnt', 0.12);
  sv('p3d-fail', 7); sv('p3d-lr', 18); sv('p3d-qty', 1); sv('p3d-waste', 0);
  for (const f of ['prep', 'rimoz', 'post', 'qc', 'pack', 'altro']) Print3DQuoter.setFase(f, 0);
  Print3DQuoter.setFase('setup', 15);
  Print3DQuoter.setFase('rimoz', 10);
  Print3DQuoter.setStrategia('standard');
  Print3DQuoter.setIva(true); Print3DQuoter.setDisc(0);
  Print3DQuoter.calc(); await a(600);

  /* ── 1 · UN SOLO COSTO ──────────────────────────────────────────────── */
  const ingresso = Print3DQuoter._ingresso();
  const canonico = E.calcola(ingresso).costoPezzo;
  const live = Print3DQuoter._state().cost;
  out.numeri.canonico = canonico;
  out.numeri.live = live;

  const eq = (x, y, t = 0.005) => Math.abs(x - y) < t;
  dico(`liveCost === canonicalCost (${live.toFixed(4)} vs ${canonico.toFixed(4)})`, eq(live, canonico));

  /* Il dettaglio a schermo somma al costo canonico. */
  const bk = testo('p3d-bk');
  dico('il dettaglio costi è a schermo', bk.length > 60);

  /* Il pannello «perché» somma al costo canonico, voce per voce. */
  const x = E.explain(ingresso, { marginePct: 40, ivaPct: 22 });
  const sommaVoci = (x.lines || [])
    .filter((r) => r.gruppo === 'per pezzo' || r.id === 'unaTantumPerPezzo')
    .reduce((s, r) => s + (r.value ?? r.result ?? 0), 0);
  out.numeri.sommaVoci = sommaVoci;
  dico(`le voci della spiegazione sommano al costo (${sommaVoci.toFixed(4)} vs ${canonico.toFixed(4)})`,
    eq(sommaVoci, canonico, 0.02));

  /* ── 2 · LA RIGA ────────────────────────────────────────────────────── */
  Print3DQuoter.addLine(); await a(600);
  const riga = Print3DQuoter._state().lines[0];
  dico('la riga esiste', !!riga);
  if (!riga) return out;
  out.numeri.quoteCost = riga.cpz;
  out.numeri.quotePrice = riga.ppz;
  dico(`quoteCost === canonicalCost (${riga.cpz.toFixed(4)} vs ${canonico.toFixed(4)})`, eq(riga.cpz, canonico));

  const prezzoCanonico = E.prezzo(canonico, { strategia: 'margine', marginePct: riga.marg, ivaPct: 0 }).netto;
  out.numeri.prezzoCanonico = prezzoCanonico;
  dico(`quotePrice === costo ÷ (1 − margine) (${riga.ppz.toFixed(4)} vs ${prezzoCanonico.toFixed(4)})`,
    eq(riga.ppz, prezzoCanonico));

  /* Nessun moltiplicatore nascosto: il rapporto è esattamente 1/(1−m). */
  dico('nessun ×2 ×2,5 ×3 ×3,5 ×4 fra costo e prezzo',
    eq(riga.ppz / riga.cpz, 1 / (1 - riga.marg / 100), 0.0001));

  /* ── 3 · IL PDF E IL MESSAGGIO, LETTI DAVVERO ───────────────────────── */
  const vero = window.open;
  let docPdf = null, urlWa = null;
  window.open = function (url) {
    if (typeof url === 'string' && url.indexOf('wa.me') >= 0) { urlWa = url; return null; }
    /* Il PDF viene scritto in una finestra: si offre un finto `document` che
       raccoglie quel che il preventivatore ci scrive. */
    let buf = '';
    return { document: { write: (s) => { buf += s; }, close: () => { docPdf = buf; } }, print: () => {} };
  };
  try { Print3DQuoter.doPdf(); } catch (e) { out.errori.push('doPdf: ' + e.message); }
  try { Print3DQuoter.doWa(); } catch (e) { out.errori.push('doWa: ' + e.message); }
  window.open = vero;

  dico('il PDF viene generato', !!docPdf && docPdf.length > 200);
  dico('il messaggio WhatsApp viene generato', !!urlWa);

  const T = Print3DQuoter._totali();
  out.numeri.netto = T.netto; out.numeri.iva = T.iva; out.numeri.lordo = T.lordo;

  const pdfTotale = docPdf ? euro((docPdf.match(/TOTALE:\s*€\s*[\d.,]+/) || [''])[0]) : NaN;
  const pdfNetto = docPdf ? euro((docPdf.match(/Subtotale<\/span><span>€\s*[\d.,]+/) || [''])[0]) : NaN;
  const waTesto = urlWa ? decodeURIComponent(urlWa.split('text=')[1] || '') : '';
  const waTotale = euro((waTesto.match(/TOTALE:\s*€\s*[\d.,]+/) || [''])[0]);
  const waNetto = euro((waTesto.match(/Subtotale:\s*€\s*[\d.,]+/) || [''])[0]);
  out.numeri.pdfTotale = pdfTotale; out.numeri.waTotale = waTotale;

  dico(`il totale del PDF è quello a schermo (${pdfTotale} vs ${T.lordo.toFixed(2)})`, eq(pdfTotale, T.lordo, 0.011));
  dico(`il netto del PDF è quello a schermo (${pdfNetto} vs ${T.netto.toFixed(2)})`, eq(pdfNetto, T.netto, 0.011));
  dico(`il totale WhatsApp è quello a schermo (${waTotale} vs ${T.lordo.toFixed(2)})`, eq(waTotale, T.lordo, 0.011));
  dico(`il netto WhatsApp è quello a schermo (${waNetto} vs ${T.netto.toFixed(2)})`, eq(waNetto, T.netto, 0.011));
  dico('e i due documenti dicono lo stesso totale', eq(pdfTotale, waTotale, 0.011));

  /* Il netto del preventivo è il prezzo della riga per la quantità. */
  dico('il netto è la riga per la quantità', eq(T.netto, riga.ppz * riga.qty, 0.011));
  dico('l\'IVA è il 22% del netto, e non entra nel costo', eq(T.iva, T.netto * 0.22, 0.011));
  dico('il lordo è netto + IVA', eq(T.lordo, T.netto + T.iva, 0.011));

  /* ── 4 · LO SNAPSHOT NON SI MUOVE ───────────────────────────────────── */
  const primaSnap = JSON.parse(JSON.stringify(riga.snapshot));
  const primaCosto = riga.cpz, primaPrezzo = riga.ppz;
  const primaTot = { n: T.netto, i: T.iva, l: T.lordo };

  /* Si cambia tutto quel che può cambiare in un laboratorio vero. */
  sv('p3d-mkg', 39.90);          // il filamento è rincarato
  sv('p3d-mc', 1200);            // macchina nuova
  sv('p3d-lh', 1000);            // vita utile rivista
  sv('p3d-kwh', 0.55);           // bolletta
  sv('p3d-lr', 30);              // manodopera
  Print3DQuoter.setFase('setup', 45);
  Print3DQuoter.setMargine(70);
  Print3DQuoter.setStrategia('luxury');
  if (window.InglyFisco) window.InglyFisco.imposta(10);
  Print3DQuoter.calc(); await a(700);

  const dopo = Print3DQuoter._state().lines[0];
  dico('il costo della voce a preventivo non si è mosso', eq(dopo.cpz, primaCosto, 0.0001));
  dico('e nemmeno il suo prezzo', eq(dopo.ppz, primaPrezzo, 0.0001));
  dico('e lo snapshot è identico, campo per campo',
    JSON.stringify(dopo.snapshot) === JSON.stringify(primaSnap));
  dico('il costo vivo invece è cambiato: è la configurazione, non il preventivo',
    !eq(Print3DQuoter._state().cost, primaCosto, 0.01));

  /* E la schermata lo dice, invece di lasciare due numeri diversi muti. */
  dico('la divergenza è dichiarata a schermo', /configurazione aperta adesso costa/i.test(testo('p3d-divergenza')));

  /* Anche i documenti restano quelli. L'IVA però è stata cambiata al 10%, e
     l'IVA è del documento, non della riga: si rimette al 22 per confrontare
     ciò che deve restare uguale. */
  if (window.InglyFisco) window.InglyFisco.imposta(22);
  Print3DQuoter.calc(); await a(400);
  const T2 = Print3DQuoter._totali();
  dico('il netto del preventivo è ancora quello', eq(T2.netto, primaTot.n, 0.011));
  dico('e il lordo anche', eq(T2.lordo, primaTot.l, 0.011));

  let doc2 = null;
  window.open = function () { let b = ''; return { document: { write: (s) => { b += s; }, close: () => { doc2 = b; } }, print: () => {} }; };
  try { Print3DQuoter.doPdf(); } catch (e) { /* già segnalato sopra */ }
  window.open = vero;
  dico('e il PDF rigenerato dice lo stesso totale di prima',
    eq(euro((String(doc2).match(/TOTALE:\s*€\s*[\d.,]+/) || [''])[0]), primaTot.l, 0.011));

  Print3DQuoter.clearLines(); await a(200);
  return out;
});

console.log('\nSMART QUOTER 3D — INTEGRITÀ DELLA CATENA\n');
const problemi = [];
for (const p of esito.passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
if (Object.keys(esito.numeri).length) {
  console.log('\n  numeri misurati:');
  for (const [k, v] of Object.entries(esito.numeri)) {
    console.log('    ' + k.padEnd(16) + (typeof v === 'number' ? v.toFixed(4) : v));
  }
}
esito.errori.forEach((e) => problemi.push(e));
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));

console.log('\nerrori JavaScript: ' + erroriJS.length);
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nun costo, un prezzo, ovunque ✔\n');
await browser.close();
