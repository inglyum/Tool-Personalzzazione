/**
 * golden-pricing.test.mjs — cinquanta conti congelati.
 *
 * I test sul motore provano che le regole valgono. Questi provano una cosa
 * diversa e altrettanto importante: che il **risultato non cambia** quando
 * nessuno intendeva cambiarlo.
 *
 * Ogni caso porta il valore atteso scritto a mano, calcolato dalla formula
 * dichiarata nel commento. Se una modifica al motore sposta un numero, il test
 * dice quale caso e di quanto — e chi ha fatto la modifica decide se è la
 * correzione che voleva o un effetto collaterale che non aveva visto.
 *
 * Non sono una fotografia dell'output corrente: quella si aggiornerebbe da
 * sola al primo `--update`, e non proverebbe niente. Sono conti fatti a mano.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite });
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), contesto);
const E = contesto.InglyCostEngine;

const vicino = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) < tol, `${a} ≉ ${b} (scarto ${Math.abs(a - b).toFixed(6)})`);

/* ═══════════════════════════════════════════════════════════════════════════
   COSTO — i mattoni, uno per volta
   ═══════════════════════════════════════════════════════════════════════════ */
const CASI_COSTO = [
  // ── Materiale ──────────────────────────────────────────────────────────
  { n: 'G01 · 3D · 50 g a 24 €/kg', i: { tecnologia: 'print3d', grams: 50, materialPricePerKg: 24 }, costo: 1.2,
    perche: '50/1000 × 24' },
  { n: 'G02 · 3D · supporti si pagano come il pezzo', i: { tecnologia: 'print3d', grams: 50, supportGrams: 10, materialPricePerKg: 24 }, costo: 1.44,
    perche: '(50+10)/1000 × 24' },
  { n: 'G03 · 3D · spurgo multimateriale', i: { tecnologia: 'print3d', grams: 50, purgeGrams: 30, materialPricePerKg: 20 }, costo: 1.6,
    perche: '(50+30)/1000 × 20' },
  { n: 'G04 · 3D · volume e densità PLA', i: { tecnologia: 'print3d', volumeCm3: 100, material: 'pla', materialPricePerKg: 20 }, costo: 2.48,
    perche: '100 cm³ × 1,24 g/cm³ = 124 g → 0,124 × 20' },
  { n: 'G05 · 3D · prezzo bobina invece di €/kg', i: { tecnologia: 'print3d', grams: 250, spoolPrice: 22, spoolGrams: 1000 }, costo: 5.5,
    perche: '22 €/kg × 0,250' },

  // ── Energia ────────────────────────────────────────────────────────────
  { n: 'G06 · energia · 150 W × 4 h × 0,28', i: { tecnologia: 'print3d', watt: 150, hours: 4, kwhPrice: 0.28 }, costo: 0.168,
    perche: '0,150 kW × 4 h × 0,28' },
  { n: 'G07 · energia · ciclo di lavoro 40%', i: { tecnologia: 'print3d', watt: 350, hours: 10, kwhPrice: 0.3, dutyCycle: 0.4 }, costo: 0.42,
    perche: '0,350 × 10 × 0,30 × 0,40' },
  { n: 'G08 · energia · senza prezzo non si inventa', i: { tecnologia: 'print3d', watt: 500, hours: 5 }, costo: 0,
    perche: 'nessun €/kWh dichiarato' },

  // ── Ammortamento ───────────────────────────────────────────────────────
  { n: 'G09 · macchina · (3000−500)/5000 × 4 h', i: { tecnologia: 'print3d', machinePrice: 3000, residualValue: 500, machineLifeHours: 5000, hours: 4 }, costo: 2,
    perche: '0,50 €/h × 4' },
  { n: 'G10 · macchina · valore residuo zero', i: { tecnologia: 'print3d', machinePrice: 1000, machineLifeHours: 1000, hours: 3 }, costo: 3,
    perche: '1 €/h × 3' },
  { n: 'G11 · macchina · senza vita utile nessun ammortamento', i: { tecnologia: 'print3d', machinePrice: 5000, hours: 10 }, costo: 0,
    perche: 'vita utile non dichiarata' },
  { n: 'G12 · macchina · residuo maggiore del prezzo non è un guadagno', i: { tecnologia: 'print3d', machinePrice: 1000, residualValue: 4000, machineLifeHours: 1000, hours: 5 }, costo: 0,
    perche: 'la differenza si azzera, non diventa negativa' },

  // ── Manutenzione e manodopera ──────────────────────────────────────────
  { n: 'G13 · manutenzione · 0,20 €/h × 10', i: { tecnologia: 'print3d', maintenancePerHour: 0.2, hours: 10 }, costo: 2,
    perche: '0,20 × 10' },
  { n: 'G14 · finitura · 15 min a 24 €/h', i: { tecnologia: 'print3d', finishMin: 15, laborPerHour: 24 }, costo: 6,
    perche: '0,25 h × 24' },
  { n: 'G15 · post-processo resina · 20 min + consumabili', i: { tecnologia: 'print3d', washCureMin: 20, laborPerHour: 18, consumablesPerPrint: 1.5 }, costo: 7.5,
    perche: '(20/60 × 18) + 1,50' },

  // ── Setup, il cuore della fase ─────────────────────────────────────────
  { n: 'G16 · setup 30 € su 1 pezzo', i: { tecnologia: 'generico', qty: 1, costiUnaTantum: [{ value: 30 }] }, costo: 30,
    perche: '30 / 1' },
  { n: 'G17 · setup 30 € su 10 pezzi', i: { tecnologia: 'generico', qty: 10, costiUnaTantum: [{ value: 30 }] }, costo: 3,
    perche: '30 / 10' },
  { n: 'G18 · setup 30 € su 100 pezzi', i: { tecnologia: 'generico', qty: 100, costiUnaTantum: [{ value: 30 }] }, costo: 0.3,
    perche: '30 / 100' },
  { n: 'G19 · setup 30 € su 1000 pezzi', i: { tecnologia: 'generico', qty: 1000, costiUnaTantum: [{ value: 30 }] }, costo: 0.03,
    perche: '30 / 1000' },
  { n: 'G20 · setup da minuti · 20 min a 18 €/h su 10 pz', i: { tecnologia: 'generico', qty: 10, setupMin: 20, laborPerHour: 18 }, costo: 0.6,
    perche: '(20/60 × 18) / 10' },

  // ── Scarto ─────────────────────────────────────────────────────────────
  { n: 'G21 · scarto 0%', i: { tecnologia: 'generico', qty: 1, failureRate: 0, costiPerPezzo: [{ id: 'm', value: 10 }] }, costo: 10,
    perche: 'nessuna riserva' },
  { n: 'G22 · scarto 5% → +5,263%', i: { tecnologia: 'generico', qty: 1, failureRate: 5, costiPerPezzo: [{ id: 'm', value: 10 }] }, costo: 10.5263,
    perche: '10 × (1 + 0,05/0,95)' },
  { n: 'G23 · scarto 10% → +11,111%', i: { tecnologia: 'generico', qty: 1, failureRate: 10, costiPerPezzo: [{ id: 'm', value: 10 }] }, costo: 11.1111,
    perche: '10 × (1 + 0,10/0,90)' },
  { n: 'G24 · scarto 20% → +25%', i: { tecnologia: 'generico', qty: 1, failureRate: 20, costiPerPezzo: [{ id: 'm', value: 10 }] }, costo: 12.5,
    perche: '10 × (1 + 0,20/0,80)' },
  { n: 'G25 · scarto · la voce non perdibile resta fuori', i: { tecnologia: 'generico', qty: 1, failureRate: 50, costiPerPezzo: [{ id: 'm', value: 10 }, { id: 'sped', value: 5, perdibile: false }] }, costo: 25,
    perche: '10 raddoppia, 5 no → 20 + 5' },

  // ── Laser ──────────────────────────────────────────────────────────────
  { n: 'G26 · laser · 24 pezzi per foglio da 12 €', i: { tecnologia: 'laser', sheetPrice: 12, sheetAreaMm2: 240000, pieceAreaMm2: 8000, sheetUtilization: 0.8 }, costo: 0.5,
    perche: '240000 × 0,8 / 8000 = 24 → 12/24' },
  { n: 'G27 · laser · sfrido peggiore, costo maggiore', i: { tecnologia: 'laser', sheetPrice: 12, sheetAreaMm2: 240000, pieceAreaMm2: 8000, sheetUtilization: 0.5 }, costo: 0.8,
    perche: '240000 × 0,5 / 8000 = 15 → 12/15' },
  { n: 'G28 · laser · pezzi per foglio dichiarati', i: { tecnologia: 'laser', sheetPrice: 20, piecesPerSheet: 10 }, costo: 2,
    perche: '20/10' },
  { n: 'G29 · laser · tempo da taglio e incisione', i: { tecnologia: 'laser', cutLengthMm: 1200, cutSpeedMmMin: 600, engraveAreaMm2: 5000, engraveSpeedMm2Min: 5000, maintenancePerHour: 6 }, costo: 0.3,
    perche: '(2 + 1) min = 0,05 h × 6' },
  { n: 'G30 · laser · tre passate, triplo tempo', i: { tecnologia: 'laser', cutLengthMm: 600, cutSpeedMmMin: 600, passes: 3, maintenancePerHour: 12 }, costo: 0.6,
    perche: '3 min = 0,05 h × 12' },

  // ── DTF ────────────────────────────────────────────────────────────────
  { n: 'G31 · DTF · 6 grafiche affiancate su film da 60 cm', i: { tecnologia: 'dtf', filmWidthMm: 600, graphicWidthMm: 100, graphicHeightMm: 100, gapMm: 5, filmPricePerM2: 10 }, costo: 0.105,
    perche: '0,6 m × 0,105 m / 6 affiancate = 0,0105 m² × 10' },
  { n: 'G32 · DTF · grafica larga, il triplo di film', i: { tecnologia: 'dtf', filmWidthMm: 600, graphicWidthMm: 300, graphicHeightMm: 100, gapMm: 5, filmPricePerM2: 10 }, costo: 0.315,
    perche: '2 affiancate invece di 6' },
  { n: 'G33 · DTF · polvere a 60 g/m²', i: { tecnologia: 'dtf', printAreaMm2: 1000000, powderGPerM2: 60, powderPricePerKg: 25 }, costo: 1.5,
    perche: '1 m² × 60 g × 0,025 €/g' },
  { n: 'G34 · DTF · capo incluso nel costo', i: { tecnologia: 'dtf', blankPrice: 3.2 }, costo: 3.2, perche: 'solo il capo' },

  // ── UV e sublimazione ──────────────────────────────────────────────────
  { n: 'G35 · UV · inchiostro su 100 cm²', i: { tecnologia: 'uv', printAreaMm2: 10000, inkMlPerM2: 12, inkPricePerMl: 0.35 }, costo: 0.042,
    perche: '0,01 m² × 12 ml × 0,35' },
  { n: 'G36 · UV · il bianco è un costo in più', i: { tecnologia: 'uv', printAreaMm2: 10000, whiteMlPerM2: 20, whitePricePerMl: 0.4 }, costo: 0.08,
    perche: '0,01 × 20 × 0,40' },
  { n: 'G37 · UV · primer per pezzo', i: { tecnologia: 'uv', primerPerPiece: 0.25 }, costo: 0.25, perche: 'valore dichiarato' },
  { n: 'G38 · sublimazione · 3 fogli a 0,40', i: { tecnologia: 'sublimation', sheets: 3, sheetPrice: 0.4 }, costo: 1.2, perche: '3 × 0,40' },
  { n: 'G39 · sublimazione · supporto', i: { tecnologia: 'sublimation', blankPrice: 5.5, sheets: 0 }, costo: 5.5, perche: 'solo il supporto' },

  // ── Spese generali ─────────────────────────────────────────────────────
  { n: 'G40 · overhead 15% sul costo diretto', i: { tecnologia: 'generico', qty: 1, overheadPct: 15, costiPerPezzo: [{ id: 'm', value: 20 }] }, costo: 23,
    perche: '20 × 1,15' },
  { n: 'G41 · overhead 12 €/h su 30 min', i: { tecnologia: 'generico', qty: 1, hours: 0.5, overheadPerHour: 12, costiPerPezzo: [{ id: 'm', value: 20 }] }, costo: 26,
    perche: '20 + (12 × 0,5)' },
  { n: 'G42 · overhead orario prevale sulla percentuale', i: { tecnologia: 'generico', qty: 1, hours: 1, overheadPerHour: 5, overheadPct: 50, costiPerPezzo: [{ id: 'm', value: 20 }] }, costo: 25,
    perche: '20 + 5, non 20 × 1,5' },
];

test('golden · costo', async (t) => {
  for (const c of CASI_COSTO) {
    await t.test(c.n, () => {
      const r = E.calcola(c.i);
      vicino(r.costoPezzo, c.costo);
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   PREZZO — le strategie, e il pavimento
   ═══════════════════════════════════════════════════════════════════════════ */
const CASI_PREZZO = [
  { n: 'G43 · margine 40% su costo 100', costo: 100, o: { strategia: 'margine', marginePct: 40 }, netto: 166.6667, margine: 40,
    perche: '100 / (1 − 0,40)' },
  { n: 'G44 · margine 0% è il costo', costo: 100, o: { strategia: 'margine', marginePct: 0 }, netto: 100, margine: 0, perche: 'nessun margine' },
  { n: 'G45 · ricarico 40% su costo 100', costo: 100, o: { strategia: 'ricarico', ricarico: 1.4 }, netto: 140, margine: 28.5714,
    perche: '100 × 1,40 → margine (140−100)/140' },
  { n: 'G46 · prezzo fisso ignora il costo', costo: 37, o: { strategia: 'fisso', prezzoFisso: 99 }, netto: 99, margine: 62.6263,
    perche: '(99−37)/99' },
  { n: 'G47 · competitivo · 10% sotto mercato', costo: 50, o: { strategia: 'competitivo', prezzoMercato: 200, sottoMercatoPct: 10 }, netto: 180, margine: 72.2222,
    perche: '200 × 0,90' },
  { n: 'G48 · premium · 25% sopra mercato', costo: 50, o: { strategia: 'premium', prezzoMercato: 200, sopraMercatoPct: 25 }, netto: 250, margine: 80,
    perche: '200 × 1,25' },
  { n: 'G49 · sconto 20% su margine 50%', costo: 100, o: { strategia: 'margine', marginePct: 50, scontoPct: 20 }, netto: 160, margine: 37.5,
    perche: '200 × 0,80 → (160−100)/160' },
  { n: 'G50 · il pavimento ferma lo sconto', costo: 100, o: { strategia: 'ricarico', ricarico: 1.4, scontoPct: 32, marginePavimentoPct: 15 }, netto: 117.6471, margine: 15,
    perche: 'senza pavimento sarebbe 95,20 — sotto costo' },
];

test('golden · prezzo', async (t) => {
  for (const c of CASI_PREZZO) {
    await t.test(c.n, () => {
      const p = E.prezzo(c.costo, c.o);
      vicino(p.netto, c.netto);
      vicino(p.marginePct, c.margine, 0.01);
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   Dove il conto storico sbagliava: il delta è voluto e documentato
   ═══════════════════════════════════════════════════════════════════════════ */
test('golden · i delta dichiarati rispetto al conto storico', async (t) => {
  await t.test('D01 · apparel a 200 pezzi non esce più sotto costo', () => {
    /* Storico: costo × (1 + 0,40) × (1 − 0,32) = costo × 0,952 → margine −5,0%.
       Nuovo: il pavimento al 10% rifiuta di scendere sotto.
       Delta voluto: il preventivo smette di vendere in perdita. */
    const storico = 100 * 1.4 * 0.68;
    assert.ok(storico < 100, 'il conto storico usciva sotto costo: ' + storico.toFixed(2));

    const nuovo = E.prezzo(100, { strategia: 'ricarico', ricarico: 1.4, scontoPct: 32, marginePavimentoPct: 10 });
    assert.ok(nuovo.netto >= 100, 'il nuovo non scende sotto costo');
    vicino(nuovo.marginePct, 10, 0.01);
  });

  await t.test('D02 · «margine 40%» restituisce 40, non 28,6', () => {
    /* Storico: il campo si chiamava margine e si comportava da ricarico. */
    const storico = E.prezzo(100, { strategia: 'ricarico', ricarico: 1.4 });
    vicino(storico.marginePct, 28.5714, 0.01);
    const nuovo = E.prezzo(100, { strategia: 'margine', marginePct: 40 });
    vicino(nuovo.marginePct, 40, 0.01);
  });

  await t.test('D03 · l\'avviamento si divide invece di ripetersi', () => {
    /* Storico: un costo per pezzo fisso, uguale a 1 e a 200 pezzi. */
    const base = { tecnologia: 'generico', costiUnaTantum: [{ value: 40 }], costiPerPezzo: [{ id: 'c', value: 3.2 }] };
    vicino(E.calcola({ ...base, qty: 1 }).costoPezzo, 43.2);
    vicino(E.calcola({ ...base, qty: 200 }).costoPezzo, 3.4);
    /* Storico: 3,20 + 40 = 43,20 a ogni quantità. Delta a 200 pezzi: −39,80 €/pz. */
  });

  await t.test('D04 · la spedizione pagata dal laboratorio riduce il profitto', () => {
    /* Storico: la spedizione veniva mostrata e non sottratta. */
    const senza = E.prezzo(100, { strategia: 'fisso', prezzoFisso: 200 });
    const con = E.prezzo(100, { strategia: 'fisso', prezzoFisso: 200, spedizioneCosto: 9, spedizioneAddebitata: 6 });
    assert.equal(senza.profittoOperativo, 100);
    assert.equal(con.profittoOperativo, 97, 'chi addebita 6 e ne spende 9 perde 3');
    assert.equal(con.margineSpedizione, -3);
  });

  await t.test('D05 · l\'IVA non è mai entrata e non entra nel profitto', () => {
    const a = E.prezzo(100, { strategia: 'fisso', prezzoFisso: 200, ivaPct: 0 });
    const b = E.prezzo(100, { strategia: 'fisso', prezzoFisso: 200, ivaPct: 22 });
    assert.equal(a.profittoOperativo, b.profittoOperativo, 'delta atteso: 0');
  });
});

test('golden · il totale dei casi', () => {
  /* Il conteggio è esso stesso un presidio: se qualcuno cancella un caso
     invece di aggiornarlo, il numero se ne accorge. */
  assert.equal(CASI_COSTO.length + CASI_PREZZO.length, 50, 'i casi golden devono restare cinquanta o crescere di proposito');
});
