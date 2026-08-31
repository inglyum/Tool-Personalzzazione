#!/usr/bin/env node
/**
 * quoter-3d-benchmark.mjs — le voci del benchmark, sulla pagina vera.
 *
 * Un preventivatore solo: `Print3DQuoter`. Un motore solo:
 * `InglyCostEngine`. Qui si verifica che le funzioni aggiunte siano davvero
 * in pagina e davvero collegate al motore — non che esistano nel sorgente.
 *
 *   node tests/qa/quoter-3d-benchmark.mjs [file]
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
  const out = { passi: [], errori: [] };
  const dico = (k, v) => out.passi.push({ passo: k, esito: v });
  const vicino = (a, b, t = 0.02) => Math.abs(a - b) < t;
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  const E = window.InglyCostEngine;
  if (!E) { out.errori.push('InglyCostEngine assente'); return out; }
  if (typeof Print3DQuoter === 'undefined') { out.errori.push('Print3DQuoter assente'); return out; }

  for (const sez of ['print3d_quoter', 'quoter_3d', 'print3d', 'quoter3d']) {
    try { await App.navigate(sez); } catch (e) { /* si prova il successivo */ }
    await a(800);
    if (document.getElementById('p3d-g')) break;
  }
  if (!document.getElementById('p3d-g')) { out.errori.push('la vista non si apre'); return out; }

  const sv = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  const vista = () => document.getElementById('view-print3d')?.textContent || '';
  const testo = (id) => document.getElementById(id)?.textContent || '';
  const leggiEuro = (s) => parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.')) || 0;

  /* ═══ 0 · Nessun preventivatore parallelo ═════════════════════════════ */
  const paralleli = ['Print3DQuoterV2', 'New3DQuoter', 'Advanced3DQuoter', 'Pro3DQuoter', 'V2Quoter'];
  dico('non è nato nessun preventivatore parallelo', paralleli.every((n) => typeof window[n] === 'undefined'));
  /* Un secondo motore sarebbe un oggetto che sa calcolare un costo di
     preventivo. `InglyActualCost` (già `RealCostEngine`) non lo è: registra i
     costi realmente sostenuti su una commessa. Il nome è stato corretto
     proprio perché mentiva. */
  /* I segnaposto di caricamento (`__stub`) rispondono `function` a qualunque
     proprietà: contarli come motori sarebbe contare sei fantasmi. */
  const altriMotori = Object.keys(window).filter((k) => {
    if (k === 'InglyCostEngine') return false;
    const o = window[k];
    if (!o || typeof o !== 'object' || o.__stub) return false;
    return typeof o.calcola === 'function' && typeof o.prezzo === 'function';
  });
  dico('e nessun secondo motore che calcoli un costo di preventivo (' + (altriMotori.join(', ') || 'nessuno') + ')',
    altriMotori.length === 0);
  dico('il registro dei costi consuntivi non si chiama più «motore»',
    typeof window.InglyActualCost === 'object' && window.RealCostEngine === window.InglyActualCost);

  /* Il caso di calibrazione. */
  Print3DQuoter.setModalita('professionale'); await a(400);
  Print3DQuoter.svuotaSlicer(); await a(200);
  sv('p3d-g', 290); sv('p3d-mkg', 24); sv('p3d-mu', 1000);
  Print3DQuoter.tempoDaDecimale(9.95);
  sv('p3d-watt', 150); sv('p3d-kwh', 0.28); sv('p3d-duty', 0.6);
  sv('p3d-mc', 400); sv('p3d-lh', 2000); sv('p3d-mnt', 0.12);
  sv('p3d-fail', 0); sv('p3d-lr', 18); sv('p3d-qty', 1);
  for (const f of ['prep', 'rimoz', 'post', 'qc', 'pack', 'altro']) Print3DQuoter.setFase(f, 0);
  Print3DQuoter.setFase('setup', 15);
  Print3DQuoter.calc(); await a(500);

  /* ═══ 1 · PROGETTO ════════════════════════════════════════════════════ */
  dico('la sezione progetto è in pagina', !!document.getElementById('p3d-prj') && !!document.getElementById('p3d-prj-d'));
  Print3DQuoter.setProgetto('nome', 'Supporto telefono');
  dico('il nome del progetto viene registrato',
    Print3DQuoter._state().progetto?.nome === 'Supporto telefono');
  dico('e la tecnologia sta con il progetto, non solo nei pulsanti',
    ['fdm', 'resin'].includes(Print3DQuoter._state().progetto?.tecnologia));

  /* ═══ 2 · LE DUE MODALITÀ ═════════════════════════════════════════════ */
  const costoPro = Print3DQuoter._state().cost;
  Print3DQuoter.setModalita('rapida'); await a(600);
  dico('in modalità rapida le card avanzate spariscono',
    !/COMPONENTI/.test(vista()) && !/SPESE GENERALI/.test(vista()));
  dico('ma il costo non cambia: meno campi, non meno calcolo',
    vicino(Print3DQuoter._state().cost, costoPro, 0.01));
  Print3DQuoter.setModalita('professionale'); await a(600);
  dico('tornando in professionale le card riappaiono',
    /COMPONENTI/.test(vista()) && /SPESE GENERALI/.test(vista()) && /PIÙ MATERIALI/.test(vista()));

  /* ═══ 3 · SPESE GENERALI ══════════════════════════════════════════════ */
  const senza = Print3DQuoter._state().cost;
  Print3DQuoter.setOverheadModo('lavoro'); await a(300);
  Print3DQuoter.setOverheadValore(5); await a(400);
  dico('«per lavoro» aggiunge esattamente l\'importo dichiarato',
    vicino(Print3DQuoter._state().cost, senza + 5, 0.02));
  sv('p3d-qty', 10); Print3DQuoter.calc(); await a(400);
  dico('e su dieci pezzi pesa un decimo',
    vicino(Print3DQuoter._ingresso().overheadPerJob, 5, 0.001));
  sv('p3d-qty', 1); Print3DQuoter.calc(); await a(300);

  Print3DQuoter.setOverheadModo('percento'); await a(300);
  Print3DQuoter.setOverheadValore(10); await a(400);
  const conPct = Print3DQuoter._state().cost;
  dico('«percentuale» dà un numero diverso da «per lavoro»', !vicino(conPct, senza + 5, 0.02));
  dico('e non li somma: un modo solo per volta',
    Print3DQuoter._ingresso().overheadPerJob === 0);
  Print3DQuoter.setOverheadModo('nessuna'); await a(400);
  dico('«nessuna» torna al costo di prima', vicino(Print3DQuoter._state().cost, senza, 0.02));

  /* ═══ 4 · PIÙ MATERIALI ═══════════════════════════════════════════════ */
  const soloUno = Print3DQuoter._state().cost;
  Print3DQuoter.addMat2(); await a(400);
  Print3DQuoter.upMat2(0, 'tipo', 'PLA Rosso');
  Print3DQuoter.upMat2(0, 'grammi', 200);
  Print3DQuoter.upMat2(0, 'prezzoKg', 24); await a(300);
  Print3DQuoter.addMat2(); await a(400);
  Print3DQuoter.upMat2(1, 'tipo', 'PLA Nero');
  Print3DQuoter.upMat2(1, 'grammi', 90);
  Print3DQuoter.upMat2(1, 'prezzoKg', 40); await a(500);

  const ingMulti = Print3DQuoter._ingresso();
  dico('i due materiali arrivano al motore', (ingMulti.materials || []).length === 2);
  const attesoMat = (200 / 1000) * 24 + (90 / 1000) * 40;
  const rMulti = E.calcola(ingMulti);
  const voceMat = (rMulti.perPezzo.voci.find((v) => v.id === 'materiale') || {}).value;
  dico(`il materiale costa la somma dei due (${voceMat?.toFixed(3)} vs ${attesoMat.toFixed(3)})`, vicino(voceMat, attesoMat, 0.005));
  dico('e il costo totale è cambiato rispetto al materiale singolo',
    !vicino(Print3DQuoter._state().cost, soloUno, 0.005));
  Print3DQuoter.rmMat2(1); await a(300); Print3DQuoter.rmMat2(0); await a(500);
  dico('tolte le righe si torna al materiale singolo', vicino(Print3DQuoter._state().cost, soloUno, 0.02));

  /* ═══ 5 · POLITICA DI COSTO DEL MATERIALE ═════════════════════════════ */
  dico('le quattro politiche di costo sono dichiarate',
    !!window.InglyMaterialCost && (window.InglyMaterialCost.POLITICHE || []).length === 4);
  dico('e sono FIFO, media, ultimo e manuale',
    (window.InglyMaterialCost.POLITICHE || []).map((p) => p.id).join(',') === 'fifo,media,ultimo,manuale');
  dico('il menu della politica è in pagina', /COSTO DEL MATERIALE/.test(vista()));
  Print3DQuoter.setPoliticaMat('fifo'); await a(500);
  dico('sceglierla non rompe il calcolo', Print3DQuoter._state().cost > 0);
  Print3DQuoter.setPoliticaMat('media'); await a(400);

  /* ═══ 6 · DISTINTA BASE ═══════════════════════════════════════════════ */
  Print3DQuoter.addHw(); await a(300);
  Print3DQuoter.upHw(0, 'n', 'Magnete'); Print3DQuoter.upHw(0, 'q', 2); Print3DQuoter.upHw(0, 'c', 0.15); await a(500);
  const b = Print3DQuoter._bom();
  dico('la distinta elenca materiale e componenti', b.righe.length >= 2);
  dico('e il magnete c\'è con la sua quantità',
    b.righe.some((r) => r.n === 'Magnete' && vicino(r.costo, 0.30, 0.001)));
  dico('la distinta è a schermo', /DISTINTA BASE/.test(vista()) && /Magnete/.test(testo('p3d-bom')));

  /* ═══ 7 · POSIZIONI DI PREZZO ═════════════════════════════════════════ */
  const pol = testo('p3d-politiche');
  dico('le card delle posizioni sono in pagina', pol.length > 60);
  for (const nome of ['Ingrosso', 'Competitivo', 'B2B', 'Standard', 'Premium', 'Luxury']) {
    dico('la card «' + nome + '» c\'è', pol.includes(nome));
  }
  dico('ogni card porta profitto, margine e ricarico',
    /Profitto/.test(pol) && /Margine/.test(pol) && /Ricarico/.test(pol));
  dico('e con IVA accesa anche IVA e lordo', /IVA/.test(pol) && /Lordo/.test(pol));

  /* ═══ 8 · SCAGLIONI FINO A MILLE ══════════════════════════════════════ */
  const sc = testo('p3d-scaglioni');
  for (const q of ['250', '500', '1000']) dico('lo scaglione da ' + q + ' pezzi c\'è', sc.includes(q));
  dico('e la tabella dice qual è il migliore', /miglior/i.test(sc) || /BEST/i.test(sc) || /conviene/i.test(sc));

  /* ═══ 9 · LETTORE DI FILE, LOCALE ═════════════════════════════════════ */
  dico('il lettore di file slicer è nel bundle', !!window.InglySlicerImport);
  dico('e il pulsante è in pagina', !!document.getElementById('p3d-file'));
  const letto = window.InglySlicerImport.daGcode(
    '; total filament used [g] = 48.90\n; support filament used [g] = 5.15\n'
    + '; estimated printing time (normal mode) = 3h 42m 18s\n; filament_type = PETG\n');
  dico('legge un G-code senza uscire dalla pagina',
    letto.ok && vicino(letto.grammiTotali, 48.90, 0.01) && vicino(letto.ore, 3.705, 0.01));
  dico('e sottrae i supporti invece di sommarli', vicino(letto.grammiModello, 43.75, 0.01));

  /* ═══ 10 · IL COSTO DELLA RIGA È QUELLO CANONICO ══════════════════════ */
  Print3DQuoter.clearLines(); await a(300);
  Print3DQuoter.addLine(); await a(500);
  const riga = Print3DQuoter._state().lines[0];
  const canonico = E.calcola(Print3DQuoter._ingresso()).costoPezzo;
  dico(`il costo della riga è il costo canonico (${riga?.cpz?.toFixed(4)} vs ${canonico.toFixed(4)})`,
    !!riga && vicino(riga.cpz, canonico, 0.005));
  /* `voci` è una mappa id → valore: la somma deve chiudere sul costo, o lo
     snapshot racconterebbe un conto diverso da quello che ha prodotto. */
  const somma = Object.values(riga?.snapshot?.voci || {}).reduce((s, v) => s + (+v || 0), 0);
  dico(`e lo snapshot porta le voci che lo compongono (${somma.toFixed(4)} vs ${riga?.cpz?.toFixed(4)})`,
    Object.keys(riga?.snapshot?.voci || {}).length > 0 && vicino(somma, riga.cpz, 0.02));
  dico('e nessun moltiplicatore nascosto fra costo e prezzo',
    !!riga && vicino(riga.ppz, riga.cpz / (1 - riga.marg / 100), 0.01));

  /* Schermo, PDF e WhatsApp: gli stessi totali. */
  const T = Print3DQuoter._totali();
  dico('i totali sono una funzione sola', T && T.netto > 0 && vicino(T.lordo, T.netto + T.iva, 0.01));

  Print3DQuoter.rmHw(0); await a(200);
  Print3DQuoter.clearLines(); await a(200);
  return out;
});

console.log('\nQUOTER 3D — LE VOCI DEL BENCHMARK, SULLA PAGINA VERA\n');
const problemi = [];
for (const p of esito.passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
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
console.log('\nun preventivatore solo, e sa fare tutto ✔\n');
await browser.close();
