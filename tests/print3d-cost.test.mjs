import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/* `InglyPrint3D` non è più un motore: è l'adapter che porta l'input storico
   del calcolatore 3D a `InglyCostEngine`. Va quindi caricato dopo di lui —
   nello stesso ordine in cui il bundle li compone, cosa che
   tests/architecture-cost-engine.mjs verifica sul file consegnato.

   I numeri di questi test non sono cambiati di un centesimo nel passaggio:
   sono stati confrontati su 200 casi generati prima e dopo la migrazione. */
const finestra = {};
new Function('window', fs.readFileSync('src/product/cost-engine.js', 'utf8'))(finestra);
new Function('window', fs.readFileSync('src/product/print3d-cost.js', 'utf8'))(finestra);
const { cost } = finestra.InglyPrint3D;

const vicino = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) < tol, `${a} ≉ ${b}`);
const voce = (r, id) => (r.voci.find((v) => v.id === id) || {}).value || 0;

test('materiale: 50 g a 24 €/kg costano 1,20 €', () => {
  const r = cost({ grams: 50, materialPricePerKg: 24 });
  vicino(voce(r, 'materiale'), 1.2);
});

test('il prezzo della bobina si converte in €/kg', () => {
  // 24 € per 1000 g è lo stesso di 24 €/kg
  const a = cost({ grams: 50, spoolPrice: 24, spoolGrams: 1000 });
  const b = cost({ grams: 50, materialPricePerKg: 24 });
  vicino(a.costo, b.costo);
});

test('il volume dello slicer diventa grammi con la densità del materiale', () => {
  // 40 cm³ di PLA (1,24 g/cm³) = 49,6 g
  const r = cost({ volumeCm3: 40, material: 'pla', materialPricePerKg: 20 });
  vicino(r.grammi, 49.6);
  vicino(voce(r, 'materiale'), 0.992);
});

test('i supporti si pagano come il pezzo', () => {
  const senza = cost({ grams: 100, materialPricePerKg: 20 });
  const con = cost({ grams: 100, supportGrams: 25, materialPricePerKg: 20 });
  vicino(con.costo - senza.costo, 0.5);
});

test('energia: 150 W per 4 h a 0,28 €/kWh', () => {
  const r = cost({ hours: 4, watt: 150, kwhPrice: 0.28 });
  vicino(voce(r, 'energia'), 0.168);
});

test('il ciclo di lavoro riduce il consumo reale', () => {
  const pieno = cost({ hours: 4, watt: 150, kwhPrice: 0.28 });
  const reale = cost({ hours: 4, watt: 150, kwhPrice: 0.28, dutyCycle: 0.5 });
  vicino(reale.costo, pieno.costo / 2);
});

test('ammortamento: 400 € su 2000 h di vita, per 4 h di stampa', () => {
  const r = cost({ hours: 4, machinePrice: 400, machineLifeHours: 2000 });
  vicino(voce(r, 'ammortamento'), 0.8);
});

test('senza vita utile dichiarata non si inventa un ammortamento', () => {
  const r = cost({ hours: 4, machinePrice: 400 });
  assert.equal(voce(r, 'ammortamento'), 0);
});

test('il setup si divide per la quantità, la finitura no', () => {
  const uno = cost({ setupMin: 30, finishMin: 10, laborPerHour: 15, qty: 1 });
  const dieci = cost({ setupMin: 30, finishMin: 10, laborPerHour: 15, qty: 10 });
  vicino(voce(uno, 'manodopera'), 7.5 + 2.5);          // 30 min + 10 min
  vicino(voce(dieci, 'manodopera'), 0.75 + 2.5);       // 3 min + 10 min
});

test('lo scarto pesa solo su ciò che si perde davvero', () => {
  // La manodopera di finitura non è ancora stata spesa quando la stampa fallisce.
  const base = { grams: 100, materialPricePerKg: 20, hours: 4, watt: 150, kwhPrice: 0.28, finishMin: 60, laborPerHour: 15 };
  const senza = cost(base);
  const con = cost({ ...base, failureRate: 10 });
  const perdibile = voce(senza, 'materiale') + voce(senza, 'energia');
  vicino(voce(con, 'scarto'), perdibile * (0.1 / 0.9));
});

test('scarto zero non aggiunge nulla', () => {
  const r = cost({ grams: 100, materialPricePerKg: 20, failureRate: 0 });
  assert.equal(voce(r, 'scarto'), 0);
});

test('il margine non è il ricarico — è la differenza fra credere di guadagnare il 40% e guadagnare il 28,6%', () => {
  const r = cost({ grams: 100, materialPricePerKg: 10 });   // costo 1,00 €
  vicino(r.costo, 1);
  vicino(r.prezzoDaMargine(40), 1.6667);      // costo / (1 − 0,40)
  vicino(r.prezzoDaRicarico(1.4), 1.4);       // il ricarico dà un margine minore
  vicino(r.margineDi(1.4), 28.571);
  vicino(r.margineDi(r.prezzoDaMargine(40)), 40);
});

test('le voci a zero non compaiono nel dettaglio', () => {
  const r = cost({ grams: 50, materialPricePerKg: 24 });
  assert.deepEqual(r.voci.map((v) => v.id), ['materiale']);
});

test('senza dati il risultato si dichiara vuoto invece di mostrare zero', () => {
  const r = cost({});
  assert.equal(r.empty, true);
  assert.equal(r.costo, 0);
});

test('un preventivo completo somma tutte le voci', () => {
  const r = cost({
    grams: 120, supportGrams: 20, materialPricePerKg: 25,
    hours: 6, watt: 200, kwhPrice: 0.28, dutyCycle: 0.6,
    machinePrice: 600, machineLifeHours: 3000,
    maintenancePerHour: 0.15,
    washCureMin: 20, consumablesPerPrint: 0.4, laborPerHour: 18,
    setupMin: 15, finishMin: 10, qty: 4,
    failureRate: 8,
    extras: [{ label: 'Verniciatura', cost: 1.2 }],
  });
  const somma = r.voci.reduce((a, v) => a + v.value, 0);
  vicino(r.costo, somma);
  assert.ok(r.costo > 0);
  // Ogni voce attesa è presente
  assert.deepEqual(r.voci.map((v) => v.id).sort(),
    ['ammortamento','energia','extra','manodopera','manutenzione','materiale','postProcesso','scarto'].sort());
});

/* ── Ammortamento, packaging, IVA, strategie, lotti ─────────────────────── */

test('si ammortizza il prezzo meno il valore residuo, non il prezzo pieno', () => {
  // 600 € di macchina, 100 € di valore residuo, 2000 h di vita, 4 h di stampa
  const r = cost({ hours: 4, machinePrice: 600, residualValue: 100, machineLifeHours: 2000 });
  vicino(r.costoOrarioMacchina, 0.25);
  vicino(voce(r, 'ammortamento'), 1);
});

test('il valore residuo non può rendere negativo l\'ammortamento', () => {
  const r = cost({ hours: 4, machinePrice: 300, residualValue: 900, machineLifeHours: 2000 });
  assert.equal(voce(r, 'ammortamento'), 0);
});

test('il packaging è una voce per pezzo', () => {
  const r = cost({ grams: 10, materialPricePerKg: 20, packagingPerUnit: 0.35 });
  vicino(voce(r, 'packaging'), 0.35);
});

test('le quattro strategie salgono di prezzo e di margine', () => {
  const r = cost({ grams: 100, materialPricePerKg: 10 });   // costo 1,00 €
  const s = r.strategie;
  assert.deepEqual(s.map((x) => x.id), ['competitive', 'standard', 'premium', 'luxury']);
  for (let i = 1; i < s.length; i++) {
    assert.ok(s[i].netto > s[i - 1].netto, `${s[i].id} non costa più di ${s[i - 1].id}`);
    assert.ok(s[i].margine > s[i - 1].margine);
  }
});

test('ogni strategia sviluppa costo, netto, IVA, lordo, profitto e markup coerenti', () => {
  const r = cost({ grams: 100, materialPricePerKg: 10, vatRate: 22 });   // costo 1,00 €
  const std = r.strategie.find((x) => x.id === 'standard');              // margine 40%
  vicino(std.netto, 1.6667);
  vicino(std.iva, 1.6667 * 0.22);
  vicino(std.lordo, std.netto + std.iva);
  vicino(std.profitto, std.netto - 1);
  vicino(std.markup, 66.667);          // ×1,667 = +66,7% di ricarico
  vicino(r.margineDi(std.netto), 40);  // ma il margine è 40%
});

test('IVA a zero non aggiunge nulla al lordo', () => {
  const r = cost({ grams: 100, materialPricePerKg: 10, vatRate: 0 });
  const std = r.strategie[1];
  assert.equal(std.iva, 0);
  vicino(std.lordo, std.netto);
});

test('sul lotto si moltiplicano netto e profitto, non il costo unitario', () => {
  const r = cost({ grams: 100, materialPricePerKg: 10, qty: 25 });
  const std = r.strategie[1];
  vicino(std.nettoTotale, std.netto * 25);
  vicino(std.profittoTotale, std.profitto * 25);
  assert.equal(r.quantita, 25);
});

test('quantità zero o negativa vale uno, non divide per zero', () => {
  for (const q of [0, -5, null, undefined, 'x']) {
    const r = cost({ setupMin: 60, laborPerHour: 10, qty: q });
    vicino(voce(r, 'manodopera'), 10);   // 60 min interi, non NaN né Infinity
  }
});

test('i valori negativi vengono azzerati, non propagati', () => {
  // Un solo segno meno: senza vincolo darebbe un costo che si SOTTRAE agli altri.
  const r = cost({ grams: 100, materialPricePerKg: -20, hours: 4, watt: 150, kwhPrice: 0.28 });
  assert.equal(voce(r, 'materiale'), 0, 'un prezzo negativo non deve generare uno sconto');
  assert.ok(r.costo > 0);

  // Due segni meno: senza vincolo si moltiplicherebbero in un costo positivo falso.
  const due = cost({ grams: -100, materialPricePerKg: -20 });
  assert.equal(due.costo, 0);

  const tutti = cost({ grams: -100, materialPricePerKg: -20, hours: -4, watt: -150,
    machinePrice: -500, maintenancePerHour: -3, packagingPerUnit: -1 });
  assert.equal(tutti.costo, 0, 'nessun costo può nascere da valori negativi');
});

test('un ciclo di lavoro fuori scala viene riportato entro 0 e 1', () => {
  const sopra = cost({ hours: 4, watt: 200, kwhPrice: 0.3, dutyCycle: 5 });
  const pieno = cost({ hours: 4, watt: 200, kwhPrice: 0.3, dutyCycle: 1 });
  vicino(sopra.costo, pieno.costo);
});

test('ore a zero azzerano energia, ammortamento e manutenzione', () => {
  const r = cost({ grams: 100, materialPricePerKg: 20, hours: 0,
    watt: 200, kwhPrice: 0.3, machinePrice: 500, machineLifeHours: 1000, maintenancePerHour: 1 });
  assert.equal(voce(r, 'energia'), 0);
  assert.equal(voce(r, 'ammortamento'), 0);
  assert.equal(voce(r, 'manutenzione'), 0);
  vicino(r.costo, 2);   // resta il solo materiale
});

test('peso a zero: nessun costo di materiale', () => {
  const r = cost({ grams: 0, materialPricePerKg: 25, hours: 2, watt: 100, kwhPrice: 0.3 });
  assert.equal(voce(r, 'materiale'), 0);
  assert.ok(r.costo > 0);
});

test('macchina o materiale non indicati non fanno crollare il calcolo', () => {
  const soloMacchina = cost({ hours: 3, machinePrice: 400, machineLifeHours: 1500 });
  const soloMateriale = cost({ grams: 80, materialPricePerKg: 22 });
  assert.ok(soloMacchina.costo > 0 && isFinite(soloMacchina.costo));
  assert.ok(soloMateriale.costo > 0 && isFinite(soloMateriale.costo));
});

test('margine 0 significa vendere al costo; margine oltre 95 viene limitato', () => {
  const r = cost({ grams: 100, materialPricePerKg: 10 });
  vicino(r.prezzoDaMargine(0), 1);
  assert.ok(isFinite(r.prezzoDaMargine(100)), 'margine 100 non deve dare infinito');
  assert.equal(r.prezzoDaMargine(100), r.prezzoDaMargine(95));
  assert.equal(r.prezzoDaMargine(150), r.prezzoDaMargine(95));
});

test('un tasso di scarto assurdo viene limitato invece di esplodere', () => {
  const r = cost({ grams: 100, materialPricePerKg: 10, failureRate: 200 });
  assert.ok(isFinite(r.costo) && r.costo > 0, 'costo non finito: ' + r.costo);
});
