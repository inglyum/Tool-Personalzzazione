import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/* Il motore è una funzione pura proprio per poter essere provata così: senza
   browser, senza DOM, con numeri che si possono verificare a mano. */
const finestra = {};
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
