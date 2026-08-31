#!/usr/bin/env node
/**
 * quoter-3d-coerenza.mjs — un solo costo canonico, ovunque.
 *
 * Nasce da un'incoerenza reale segnalata dall'utente: riga preventivo
 * € 14,60 e prezzo € 51,09, mentre il breakdown mostrava costo € 7,17 e
 * materiale 2 g.
 *
 * La diagnosi (docs/QUOTER-3D-DISCREPANZA.md) ha trovato **una sola formula**
 * applicata a **tre stati diversi degli ingressi**: la card slicer
 * sovrascriveva il campo peso in silenzio — il campo mostrava 290, il motore
 * usava 2 — e la riga a preventivo è congelata mentre il breakdown è vivo.
 *
 * Questi controlli falliscono se una di quelle catene torna a divergere.
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
page.on('dialog', (d) => d.accept());
await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(11000);

const esito = await page.evaluate(async () => {
  const out = { passi: [], errori: [] };
  const dico = (k, v) => out.passi.push({ passo: k, esito: !!v });
  const sv = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
  const a = (ms) => new Promise((r) => setTimeout(r, ms));
  const E = window.InglyCostEngine;
  if (!E) { out.errori.push('InglyCostEngine assente'); return out; }

  for (const s of ['print3d', 'print3d_quoter']) {
    try { await App.navigate(s); } catch (e) { /* si prova il successivo */ }
    await a(700);
    if (document.getElementById('p3d-g')) break;
  }
  if (!document.getElementById('p3d-g')) { out.errori.push('vista non raggiungibile'); return out; }

  const base = () => {
    Print3DQuoter.svuotaSlicer();
    sv('p3d-h', 9.95); sv('p3d-qty', 1); sv('p3d-mkg', 24); sv('p3d-mu', 1000);
    sv('p3d-watt', 256); sv('p3d-duty', 0.6); sv('p3d-kwh', 0.28);
    sv('p3d-mc', 299); sv('p3d-lh', 2000); sv('p3d-mnt', 0.12);
    sv('p3d-fail', 7); sv('p3d-lr', 15);
    /* I minuti umani si impostano dalle fasi: è l'unico posto che li possiede. */
    for (const f of ['prep', 'rimoz', 'post', 'qc', 'pack', 'altro']) Print3DQuoter.setFase(f, 0);
    Print3DQuoter.setFase('setup', 15);
    sv('p3d-sup', 0); sv('p3d-avgw', ''); sv('p3d-kwhm', '');
    Print3DQuoter.setDisc(0); Print3DQuoter.setIva(true); Print3DQuoter.setModo('completo');
  };

  /* ═══ 1 · il peso della UI è il peso del motore ═══════════════════════ */
  base(); sv('p3d-g', 290); Print3DQuoter.calc(); await a(350);
  const ing290 = Print3DQuoter._ingresso();
  dico(`290 g nel campo → 290 g al motore (${ing290.grams})`, ing290.grams === 290);
  dico('e la fonte è dichiarata MODEL_ONLY', ing290.filamentWeightSource === 'MODEL_ONLY');

  for (const g of [100, 500, 1]) {
    sv('p3d-g', g); Print3DQuoter.calc(); await a(250);
    const i = Print3DQuoter._ingresso();
    dico(`${g} g nel campo → ${i.grams} g al motore`, i.grams === g);
  }

  /* ═══ 2 · il tempo non si arrotonda ═══════════════════════════════════ */
  base(); sv('p3d-g', 290); sv('p3d-h', 9.95); Print3DQuoter.calc(); await a(300);
  dico('9h57 resta 9,95 h, non diventa 10', Print3DQuoter._ingresso().hours === 9.95);

  /* ═══ 3 · il materiale è grammi ÷ 1000 × €/kg, senza moltiplicatori ═══ */
  const rm = E.calcola(Print3DQuoter._ingresso());
  const mat = rm.perPezzo.voci.find((v) => v.id === 'materiale').value;
  dico(`290 g a €24/kg fanno €6,96 (${mat.toFixed(3)})`, Math.abs(mat - 6.96) < 0.001);
  sv('p3d-mkg', 15.99); Print3DQuoter.calc(); await a(250);
  const mat2 = E.calcola(Print3DQuoter._ingresso()).perPezzo.voci.find((v) => v.id === 'materiale').value;
  dico(`e a €15,99/kg fanno €4,6371 (${mat2.toFixed(4)})`, Math.abs(mat2 - 4.6371) < 0.001);
  sv('p3d-mkg', 24); Print3DQuoter.calc(); await a(200);

  /* ═══ 4 · la card slicer non sovrascrive più in silenzio ══════════════ */
  base(); sv('p3d-g', 290); await a(250);
  Print3DQuoter.setSlicer('pesoTotale', 2); await a(350);
  const iSlicer = Print3DQuoter._ingresso();
  dico('con la card compilata comanda la card', iSlicer.grams === 2);
  dico('e la fonte lo dichiara', iSlicer.filamentWeightSource === 'COMPLETE_SLICER_TOTAL');
  const nota = document.getElementById('p3d-g-fonte')?.textContent || '';
  dico('la schermata dice che il campo non viene usato',
    /non viene usato|Comanda la card/.test(nota));
  dico('e nomina il valore che comanda davvero', /2 g/.test(nota));

  /* ═══ 5 · il guardiano sul peso modello ═══════════════════════════════ */
  Print3DQuoter.svuotaSlicer(); base(); sv('p3d-g', 290); await a(200);
  Print3DQuoter.setSlicer('pesoTotale', 290);
  Print3DQuoter.setSlicer('supporti', 288);
  Print3DQuoter.setSlicer('includeTutto', true);
  await a(350);
  const p = Print3DQuoter._ingresso();
  dico('il caso che produsse i 2 g è ancora aritmeticamente questo', p.grams === 2);
  const vista = document.querySelector('#view-print3d')?.textContent || '';
  dico('ma adesso la schermata lo segnala prima di preventivare',
    /meno di un quinto del totale|peso del pezzo/.test(vista));
  Print3DQuoter.svuotaSlicer(); await a(250);

  /* ═══ 6 · una sola catena: riga = motore, prezzo = costo ÷ (1−margine) ═ */
  base(); sv('p3d-g', 290); Print3DQuoter.setMargine(40); await a(350);
  const ing = Print3DQuoter._ingresso();
  const canonico = E.calcola(ing).costoPezzo;
  const stato = Print3DQuoter._state();
  dico(`il costo a schermo è il costo canonico (${stato.cost.toFixed(4)} vs ${canonico.toFixed(4)})`,
    Math.abs(stato.cost - canonico) < 0.0001);
  dico('e il prezzo è costo ÷ (1 − margine), non costo × (1 + margine)',
    Math.abs(stato.price - canonico / 0.6) < 0.01);

  Print3DQuoter.clearLines(); await a(250);
  Print3DQuoter.addLine(); await a(350);
  const riga = Print3DQuoter._state().lines[0];
  dico('la riga a preventivo porta lo stesso costo canonico',
    Math.abs(riga.cpz - canonico) < 0.0001);
  dico('e lo stesso prezzo', Math.abs(riga.ppz - stato.price) < 0.0001);

  const tot = Print3DQuoter._totali();
  dico('il Costo Vivo è la somma delle righe canoniche',
    Math.abs(tot.costo - canonico * riga.qty) < 0.0001);
  dico('il netto è la somma dei prezzi', Math.abs(tot.netto - riga.ppz * riga.qty) < 0.0001);
  dico('il margine mostrato è quello matematico',
    Math.abs(tot.margine - (tot.netto - tot.costo) / tot.netto * 100) < 0.001);

  /* ═══ 7 · PDF e WhatsApp leggono la stessa funzione ═══════════════════ */
  dico('il PDF usa la funzione unica dei totali', /totali\(\)/.test(String(Print3DQuoter.doPdf)));
  dico('WhatsApp usa la funzione unica dei totali', /totali\(\)/.test(String(Print3DQuoter.doWa)));
  dico("e nessuno dei due ricalcola l'IVA per conto suo",
    !/0\.22|1\.22/.test(String(Print3DQuoter.doPdf)) && !/0\.22|1\.22/.test(String(Print3DQuoter.doWa)));

  /* ═══ 8 · la divergenza congelato/vivo viene dichiarata ═══════════════ */
  sv('p3d-g', 150); Print3DQuoter.calc(); await a(400);
  const dopo = document.querySelector('#view-print3d')?.textContent || '';
  dico('cambiando gli ingressi dopo aver aggiunto la riga, la schermata lo dice',
    /Hai cambiato qualcosa dopo averla aggiunta/.test(dopo));
  dico('e la voce a preventivo resta quella di quando è stata aggiunta',
    Math.abs(Print3DQuoter._state().lines[0].cpz - canonico) < 0.0001);

  /* ═══ 9 · IVA sempre dopo il netto ════════════════════════════════════ */
  const t2 = Print3DQuoter._totali();
  dico("l'IVA si calcola sul netto e non entra nel costo",
    Math.abs(t2.lordo - t2.netto - t2.iva) < 0.001 && t2.costo < t2.netto);

  /* ═══ 10 · l'avviamento si divide per la quantità ═════════════════════ */
  Print3DQuoter.clearLines(); base(); sv('p3d-g', 290); sv('p3d-qty', 10); Print3DQuoter.calc(); await a(350);
  const c10 = E.calcola(Print3DQuoter._ingresso());
  sv('p3d-qty', 1); Print3DQuoter.calc(); await a(300);
  const c1 = E.calcola(Print3DQuoter._ingresso());
  dico('a 10 pezzi l\'avviamento pesa un decimo',
    Math.abs(c1.unaTantum.perPezzo / 10 - c10.unaTantum.perPezzo) < 0.001);
  dico('e il costo per pezzo scende di conseguenza', c10.costoPezzo < c1.costoPezzo);

  Print3DQuoter.clearLines(); await a(200);
  return out;
});

console.log('\nSMART QUOTER 3D — un solo costo canonico\n');
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
console.log('\nuna sola matematica ✔\n');
await browser.close();
