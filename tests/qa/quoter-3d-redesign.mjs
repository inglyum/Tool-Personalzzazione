#!/usr/bin/env node
/**
 * quoter-3d-redesign.mjs — la versione INGLY del calcolatore, verificata a schermo.
 *
 * Il punto che questa suite presidia più di ogni altro: **il ×3,5 non è più
 * il metodo predefinito**. Era l'origine del € 44,75 da un costo di € 12,78 —
 * un moltiplicatore ereditato dalle prime versioni, conservato perché nessun
 * prezzo si muovesse mentre si sistemava la matematica, e diventato la cosa
 * che rendeva il prezzo inspiegabile.
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
  const testo = () => document.querySelector('#view-print3d')?.textContent.replace(/\s+/g, ' ') || '';

  for (const s of ['print3d', 'print3d_quoter']) {
    try { await App.navigate(s); } catch (e) { /* si prova il successivo */ }
    await a(700);
    if (document.getElementById('p3d-g')) break;
  }
  if (!document.getElementById('p3d-g')) { out.errori.push('vista non raggiungibile'); return out; }

  const caso = () => {
    Print3DQuoter.svuotaSlicer();
    sv('p3d-g', 290); Print3DQuoter.tempoDaDecimale(9.95); sv('p3d-qty', 1);
    sv('p3d-mkg', 20); sv('p3d-mu', 1000);
    sv('p3d-watt', 256); sv('p3d-duty', 0.6); sv('p3d-kwh', 0.30);
    sv('p3d-mc', 400); sv('p3d-lh', 5000); sv('p3d-mnt', 0);
    sv('p3d-fail', 0); sv('p3d-waste', 0); sv('p3d-lr', 18);
    sv('p3d-avgw', ''); sv('p3d-kwhm', '');
    Print3DQuoter.setStrategia('standard');
    Print3DQuoter.setDisc(0); Print3DQuoter.setIva(true); Print3DQuoter.setModo('completo');
  };

  /* ═══ IL PUNTO 30 · il ×3,5 non è più il predefinito ══════════════════ */
  caso(); await a(400);
  const st = Print3DQuoter._state();
  const rapporto = st.price / st.cost;
  dico(`il rapporto prezzo/costo predefinito è 1,667 e non 3,5 (${rapporto.toFixed(3)})`,
    Math.abs(rapporto - 1 / 0.6) < 0.01);
  dico(`e il margine predefinito è 40% (${st.margine.toFixed(1)}%)`, Math.abs(st.margine - 40) < 0.01);
  dico('un costo di €12,78 non produce più €44,73',
    Math.abs(E.prezzo(12.78, { strategia: 'margine', marginePct: 40, ivaPct: 0 }).netto - 21.30) < 0.01);

  /* ═══ Le strategie sono scelte, non numeri nascosti ═══════════════════ */
  const t = testo();
  dico('le quattro strategie sono a schermo con il loro margine',
    /Competitivo/.test(t) && /Standard/.test(t) && /Premium/.test(t) && /Luxury/.test(t));
  dico('e il vecchio ×3,5 resta come «Storico», dichiarato per quello che è', /Storico/.test(t));

  for (const [id, m] of [['competitive', 25], ['premium', 55], ['luxury', 70]]) {
    Print3DQuoter.setStrategia(id); await a(300);
    const s2 = Print3DQuoter._state();
    dico(`la strategia ${id} applica davvero il suo margine (${s2.margine.toFixed(0)}%)`,
      Math.abs(s2.margine - m) < 0.5);
  }
  Print3DQuoter.setStrategia('storico'); await a(300);
  dico('scegliendo «Storico» la schermata dice che è un ricarico ereditato',
    /ricarico, non una decisione commerciale/.test(testo()));
  Print3DQuoter.setStrategia('standard'); await a(300);

  /* ═══ Il tempo: ore e minuti, senza arrotondare ═══════════════════════ */
  Print3DQuoter.tempoDaDecimale(9.95); await a(250);
  dico('9,95 h si scrive 9 h 57 m',
    document.getElementById('p3d-hh')?.value === '9' && document.getElementById('p3d-mm')?.value === '57');
  sv('p3d-hh', 9); sv('p3d-mm', 57); Print3DQuoter.setTempo(); await a(300);
  const oreMotore = Print3DQuoter._ingresso().hours;
  dico(`e 9 h 57 m tornano 9,95 al motore (${oreMotore.toFixed(4)})`, Math.abs(oreMotore - 9.95) < 0.0001);

  /* ═══ Le sette fasi di lavoro ═════════════════════════════════════════ */
  caso(); await a(350);
  dico('il lavoro è diviso in fasi, non un campo solo', /quanto tempo ci metti tu/.test(testo()));
  Print3DQuoter.setFase('setup', 15);
  Print3DQuoter.setFase('qc', 4);
  Print3DQuoter.setFase('pack', 3);
  await a(350);
  const ingF = Print3DQuoter._ingresso();
  dico(`l'avviamento resta per lavoro (${ingF.setupMin} min)`, ingF.setupMin === 15);
  dico(`e le altre fasi si sommano per pezzo (${ingF.finishMin} min)`, ingF.finishMin >= 7);

  /* ═══ I due sprechi, separati ═════════════════════════════════════════ */
  caso(); await a(300);
  const senza = E.calcola(Print3DQuoter._ingresso());
  const matSenza = senza.perPezzo.voci.find((v) => v.id === 'materiale').value;
  sv('p3d-waste', 10); await a(300);
  const conSpreco = E.calcola(Print3DQuoter._ingresso());
  const matCon = conSpreco.perPezzo.voci.find((v) => v.id === 'materiale').value;
  dico('lo spreco materiale aumenta i grammi, non il totale',
    Math.abs(matCon - matSenza * 1.1) < 0.001);
  sv('p3d-waste', 0); sv('p3d-fail', 10); await a(300);
  const conScarto = E.calcola(Print3DQuoter._ingresso());
  dico('lo scarto di produzione è una voce a parte',
    conScarto.perPezzo.voci.some((v) => v.id === 'scarto' && v.value > 0)
    && Math.abs(conScarto.perPezzo.voci.find((v) => v.id === 'materiale').value - matSenza) < 0.001);
  sv('p3d-fail', 0); await a(250);

  /* ═══ Componenti e confezione ═════════════════════════════════════════ */
  caso(); await a(300);
  Print3DQuoter.addHw(); await a(250);
  Print3DQuoter.upHw(0, 'n', 'magnete'); Print3DQuoter.upHw(0, 'q', 2); Print3DQuoter.upHw(0, 'c', 0.15);
  await a(300);
  const conHw = E.calcola(Print3DQuoter._ingresso());
  const hw = conHw.perPezzo.voci.find((v) => v.id === 'hardware');
  dico(`2 magneti a €0,15 fanno €0,30 (${hw ? hw.value.toFixed(2) : '—'})`, hw && Math.abs(hw.value - 0.30) < 0.001);
  dico('e la voce dice quali componenti', hw && /2× magnete/.test(hw.detail));
  Print3DQuoter.rmHw(0); await a(250);

  Print3DQuoter.addPk(); await a(250);
  Print3DQuoter.upPk(0, 'n', 'scatola'); Print3DQuoter.upPk(0, 'q', 1); Print3DQuoter.upPk(0, 'c', 0.45);
  await a(300);
  const pk = E.calcola(Print3DQuoter._ingresso()).perPezzo.voci.find((v) => v.id === 'packaging');
  dico(`la confezione entra nel conto (${pk ? pk.value.toFixed(2) : '—'})`, pk && Math.abs(pk.value - 0.45) < 0.001);
  Print3DQuoter.rmPk(0); await a(250);

  /* ═══ Il prezzo manuale e il verdetto ═════════════════════════════════ */
  caso(); await a(350);
  const costo = Print3DQuoter._state().cost;
  dico('la card del prezzo manuale è a schermo', /SE VOLESSI FAR PAGARE/.test(testo()));

  Print3DQuoter.setPrezzoManuale(costo * 0.8); await a(300);
  dico('un prezzo sotto costo viene chiamato perdita', /In perdita/.test(testo()));
  Print3DQuoter.setPrezzoManuale(costo / 0.9); await a(300);
  dico('un margine del 10% è sotto il minimo del 25%', /Sotto il minimo/.test(testo()));
  Print3DQuoter.setPrezzoManuale(costo / 0.5); await a(300);
  dico('un margine del 50% è profittevole', /Profittevole/.test(testo()));
  dico('e la schermata dice il prezzo minimo accettabile', /non conviene accettare/.test(testo()));
  Print3DQuoter.setPrezzoManuale(0); await a(250);

  /* ═══ I costi unitari ═════════════════════════════════════════════════ */
  caso(); await a(400);
  dico('i costi per grammo, ora macchina e minuto uomo sono a schermo',
    /COSTO PER/.test(testo()) && /Grammo/.test(testo()) && /Ora macchina/.test(testo()));
  const cp = E.calcola(Print3DQuoter._ingresso()).costoPer;
  dico('e discendono dal totale, non da un secondo calcolo',
    Math.abs(cp.grammo * 290 - cp.pezzo) < 0.01);

  /* ═══ Lo snapshot della riga ══════════════════════════════════════════ */
  caso(); await a(400);
  Print3DQuoter.clearLines(); await a(250);
  const canonico = E.calcola(Print3DQuoter._ingresso()).costoPezzo;
  Print3DQuoter.addLine(); await a(350);
  const riga = Print3DQuoter._state().lines[0];
  dico('la riga porta uno snapshot completo', !!riga.snapshot && riga.snapshot.schema === 1);
  if (riga.snapshot) {
    const sn = riga.snapshot;
    dico('con il costo canonico', Math.abs(sn.trueCost - canonico) < 0.0001);
    dico('e le voci che lo compongono', Object.keys(sn.voci).length >= 3);
    dico('e le voci sommano al costo',
      Math.abs(Object.values(sn.voci).reduce((x, y) => x + y, 0) - sn.trueCost) < 0.01);
    dico('con margine, ricarico e strategia dichiarati',
      sn.margine === 40 && sn.strategia === 'standard' && sn.ricaricoPct > 0);
    dico('e netto, IVA e lordo che chiudono',
      Math.abs(sn.netPrice + sn.iva - sn.lordo) < 0.001);
    dico("e l'IVA non è dentro il costo", sn.trueCost < sn.netPrice);
    dico('e la versione del motore che lo ha calcolato', !!sn.calcolatoDa);
  }

  /* ═══ Markup e margine restano due cose diverse ═══════════════════════ */
  const pm = E.prezzo(10, { strategia: 'margine', marginePct: 40, ivaPct: 0 });
  const pr = E.prezzo(10, { strategia: 'ricarico', ricarico: 1.4, ivaPct: 0 });
  dico('margine 40% su €10 fa €16,67 e ricarico 40% fa €14',
    Math.abs(pm.netto - 50 / 3) < 0.01 && Math.abs(pr.netto - 14) < 0.01);
  dico('e ogni prezzo sa dire entrambe le sue letture',
    Math.abs(pr.marginePct - 200 / 7) < 0.01 && Math.abs(pm.ricaricoPct - 200 / 3) < 0.01);

  Print3DQuoter.clearLines(); await a(200);
  return out;
});

console.log('\nSMART QUOTER 3D — la versione INGLY del calcolatore\n');
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
console.log('\nil prezzo parte dal costo vero ✔\n');
await browser.close();
