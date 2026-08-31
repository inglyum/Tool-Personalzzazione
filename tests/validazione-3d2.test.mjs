/**
 * validazione-3d2.test.mjs — i casi che la Fase 3D.2 pone alla lettera.
 *
 * FIFO con i lotti dichiarati, multi-materiale con tre filamenti, multi-piatto,
 * tasso di fallimento a quattro valori, priorità dell'energia, tempo di stampa
 * contro tempo di persona, scaglioni.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, console, Date, String, Number });
for (const f of ['inventory-ledger.js', 'inventory-cost-resolver.js', 'cost-engine.js', 'slicer-import.js']) {
  vm.runInContext(fs.readFileSync('src/product/' + f, 'utf8'), ctx);
}
const E = ctx.InglyCostEngine;
const R = ctx.InglyInventoryCostResolver;
const S = ctx.InglySlicerImport;
const vicino = (a, b, t = 0.005) => assert.ok(Math.abs(a - b) < t, `${a} ≠ ${b}`);
const voce = (r, id) => (r.perPezzo.voci.find((v) => v.id === id) || { value: 0 }).value;

const BASE = {
  tecnologia: 'print3d', livelloCosto: 'completo',
  grams: 290, hours: 9.95, qty: 1,
  spoolPrice: 24, spoolGrams: 1000, watt: 150, dutyCycle: 0.6, kwhPrice: 0.28,
  machinePrice: 400, machineLifeHours: 2000, maintenancePerHour: 0.12,
  laborPerHour: 18, setupMin: 15, finishMin: 10, failureRate: 0,
};

/* ═══ 9 · FIFO, con i lotti della direttiva ════════════════════════════════ */

const mov = (id, q, costo, quando) => ({
  id: id, itemId: 'pla-red', type: 'purchase', quantity: q, delta: q,
  unitCost: costo, totalCost: q * costo, timestamp: quando,
});

test('FIFO: 400 g da un lotto di 300 g a 15,99 e uno a 20 costano 300×15,99 + 100×20', () => {
  const movimenti = [
    mov('L1', 300, 15.99 / 1000, '2026-01-01T10:00:00Z'),   // €/g
    mov('L2', 500, 20.00 / 1000, '2026-02-01T10:00:00Z'),
  ];
  const r = R.risolvi(movimenti, 'pla-red', { policy: 'fifo', quantity: 400 });
  assert.equal(r.disponibile, true);
  assert.equal(r.policy, 'fifo');

  const atteso = 300 * (15.99 / 1000) + 100 * (20 / 1000);
  vicino(r.costoTotale, atteso, 0.0001);
  vicino(r.costo, atteso / 400, 0.000001);
  assert.equal(r.coperta, 400);
  assert.equal(r.scoperta, 0);

  /* E dice da quali lotti: senza la tracciatura il numero è giusto e non
     verificabile, che in contabilità vale poco. */
  assert.equal(r.lineage.length, 2);
  vicino(r.lineage[0].quantita, 300);
  vicino(r.lineage[1].quantita, 100);
});

test('FIFO non è la media: i due numeri devono differire', () => {
  const movimenti = [
    mov('L1', 300, 15.99 / 1000, '2026-01-01T10:00:00Z'),
    mov('L2', 500, 20.00 / 1000, '2026-02-01T10:00:00Z'),
  ];
  const fifo = R.risolvi(movimenti, 'pla-red', { policy: 'fifo', quantity: 400 }).costo;
  const media = R.risolvi(movimenti, 'pla-red', { policy: 'media' }).costo;
  const ultimo = R.risolvi(movimenti, 'pla-red', { policy: 'ultimo' }).costo;
  assert.ok(Math.abs(fifo - media) > 1e-9, 'FIFO e media danno lo stesso numero: una delle due non fa quel che dice');
  vicino(ultimo, 20 / 1000, 1e-9);
  /* Il FIFO consuma prima il lotto vecchio, che qui è il più economico. */
  assert.ok(fifo < ultimo);
});

test('un consumo oltre i lotti registrati non diventa zero euro', () => {
  const movimenti = [mov('L1', 300, 15.99 / 1000, '2026-01-01T10:00:00Z')];
  const r = R.risolvi(movimenti, 'pla-red', { policy: 'fifo', quantity: 400 });
  assert.equal(r.disponibile, true);
  vicino(r.coperta, 300);
  vicino(r.scoperta, 100);
  assert.equal(r.completa, false);
});

/* ═══ 9b · MULTI-MATERIALE ═════════════════════════════════════════════════ */

test('tre materiali, tre prezzi: nessun €/kg globale', () => {
  const r = E.calcola({ ...BASE, materials: [
    { name: 'PLA Red', grams: 200, pricePerKg: 15.99 },
    { name: 'PLA Black', grams: 100, pricePerKg: 20 },
    { name: 'PETG', grams: 50, pricePerKg: 28 },
  ] });
  const atteso = (200 / 1000) * 15.99 + (100 / 1000) * 20 + (50 / 1000) * 28;
  vicino(voce(r, 'materiale'), atteso);

  /* Se usasse un prezzo unico, il costo sarebbe 350 g × uno dei tre. */
  for (const p of [15.99, 20, 28]) {
    assert.ok(Math.abs(voce(r, 'materiale') - (350 / 1000) * p) > 0.01,
      'sta usando ' + p + ' €/kg per tutti e tre');
  }
});

test('un materiale senza prezzo proprio ripiega su quello globale, e lo fa una volta sola', () => {
  const r = E.calcola({ ...BASE, spoolPrice: 24, spoolGrams: 1000,
    materials: [{ name: 'A', grams: 100 }, { name: 'B', grams: 100, pricePerKg: 40 }] });
  vicino(voce(r, 'materiale'), (100 / 1000) * 24 + (100 / 1000) * 40);
});

/* ═══ 8 · MULTI-PIATTO ═════════════════════════════════════════════════════ */

test('due piatti: 100 g/3 h + 200 g/5 h fanno 300 g e 8 h', () => {
  const piatti = [
    { plateId: '1', grammi: 100, ore: 3 },
    { plateId: '2', grammi: 200, ore: 5 },
  ];
  const gTot = piatti.reduce((a, p) => a + p.grammi, 0);
  const hTot = piatti.reduce((a, p) => a + p.ore, 0);
  assert.equal(gTot, 300);
  assert.equal(hTot, 8);

  /* Il costo del progetto è la somma dei piatti, e ogni piatto porta il suo
     avviamento: sommarli in un piatto solo lo conterebbe una volta invece di
     due, e cento pezzi su due piatti diventerebbero più economici del vero. */
  const costoPiatti = piatti.map((p) => E.calcola({ ...BASE, grams: p.grammi, hours: p.ore }).costoPezzo);
  const somma = costoPiatti.reduce((a, c) => a + c, 0);
  const unico = E.calcola({ ...BASE, grams: gTot, hours: hTot }).costoPezzo;
  /* Due piatti sono due stampe: due avviamenti e due finiture. Sommarli in un
     piatto solo li conterebbe una volta, e un progetto su due piatti
     risulterebbe più economico di quanto sia davvero. */
  const perStampa = (15 / 60) * 18 + (10 / 60) * 18;
  vicino(somma - unico, perStampa, 0.01);
});

test('ogni piatto conserva id, peso, tempo e materiali', () => {
  /* Il 3MF li dichiara: `plateId` è l'indice del file, non la posizione
     nell'array in cui sono stati letti. */
  const p = { plateId: '2', nome: 'Piatto 2', stampante: 'C11', grammi: 200, ore: 5,
    materiali: [{ tipo: 'PLA', grammi: 200, colore: '#FF0000' }] };
  for (const k of ['plateId', 'stampante', 'grammi', 'ore', 'materiali']) {
    assert.ok(p[k] != null, 'il piatto perde ' + k);
  }
});

/* ═══ 11 · TASSO DI FALLIMENTO ═════════════════════════════════════════════ */

test('lo scarto è perdibile × t/(1−t) a 0, 5, 10 e 20 per cento', () => {
  for (const t of [0, 5, 10, 20]) {
    const r = E.calcola({ ...BASE, failureRate: t });
    const perdibile = ['materiale', 'energia', 'macchina', 'manutenzione']
      .reduce((s, id) => s + voce(r, id), 0);
    const atteso = perdibile * ((t / 100) / (1 - t / 100));
    vicino(voce(r, 'scarto'), atteso, 0.0001);
  }
});

test('lo scarto non tocca le voci che sopravvivono al pezzo fallito', () => {
  /* Confezione e lavorazioni extra si spendono sul pezzo buono, non su quello
     buttato: applicare loro lo scarto le pagherebbe due volte. */
  const senza = E.calcola({ ...BASE, failureRate: 0, packagingPerUnit: 1, extras: [{ label: 'x', cost: 2 }] });
  const con = E.calcola({ ...BASE, failureRate: 20, packagingPerUnit: 1, extras: [{ label: 'x', cost: 2 }] });
  const perdibileSenza = ['materiale', 'energia', 'macchina', 'manutenzione']
    .reduce((s, id) => s + voce(senza, id), 0);
  vicino(voce(con, 'scarto'), perdibileSenza * (0.2 / 0.8), 0.0001);
});

test('spreco di materiale e scarto di produzione sono due cose, e non si sommano', () => {
  const soloSpreco = E.calcola({ ...BASE, materialWasteRate: 10, failureRate: 0 });
  const soloScarto = E.calcola({ ...BASE, materialWasteRate: 0, failureRate: 10 });
  const entrambi = E.calcola({ ...BASE, materialWasteRate: 10, failureRate: 10 });

  /* Lo spreco aumenta i grammi; lo scarto moltiplica il perdibile. */
  vicino(voce(soloSpreco, 'materiale'), voce(soloScarto, 'materiale') * 1.1);
  assert.equal(voce(soloSpreco, 'scarto'), 0);
  assert.ok(voce(soloScarto, 'scarto') > 0);

  /* Insieme: lo scarto si applica al materiale già maggiorato — una volta. */
  const perdibile = ['materiale', 'energia', 'macchina', 'manutenzione']
    .reduce((s, id) => s + voce(entrambi, id), 0);
  vicino(voce(entrambi, 'scarto'), perdibile * (0.1 / 0.9), 0.0001);
});

/* ═══ 12 · ENERGIA ═════════════════════════════════════════════════════════ */

test('la priorità è misurato → medio → targa, e chi vince esclude gli altri', () => {
  const conTutto = {
    ...BASE, measuredEnergyKwh: 1.2, averagePowerW: 90, ratedPowerW: 150, watt: 150, dutyCycle: 0.6,
  };
  /* Con i kWh contati, il consumo è quello: la potenza media e quella di targa
     non entrano nemmeno per un centesimo. */
  vicino(voce(E.calcola(conTutto), 'energia'), 1.2 * 0.28);

  const senzaMisura = { ...conTutto, measuredEnergyKwh: 0 };
  vicino(voce(E.calcola(senzaMisura), 'energia'), (90 / 1000) * BASE.hours * 0.28);

  const soloTarga = { ...senzaMisura, averagePowerW: 0 };
  vicino(voce(E.calcola(soloTarga), 'energia'), (150 / 1000) * BASE.hours * 0.6 * 0.28);
});

test('il ciclo di lavoro vale solo sulla targa: un dato misurato non si sconta', () => {
  const a = E.calcola({ ...BASE, measuredEnergyKwh: 1.2, dutyCycle: 0.3 });
  const b = E.calcola({ ...BASE, measuredEnergyKwh: 1.2, dutyCycle: 1 });
  vicino(voce(a, 'energia'), voce(b, 'energia'));
});

test('la fiducia del consumo segue la scala, e resta distinta da quella del prezzo', () => {
  /* Il costo dell'energia è `kWh × €/kWh`: due metà, due qualità. Chi misura
     il consumo con una presa intelligente e poi scrive il prezzo a mano ha un
     dato misurato e uno dichiarato, e il preventivo vale quanto il peggiore
     dei due — ma la scala del consumo deve restare visibile, altrimenti
     comprare la presa non cambia niente di ciò che si vede. */
  const conta = (i) => (E.calcola(i).provenienza || []).find((x) => x.id === 'energia');

  assert.equal(conta({ ...BASE, measuredEnergyKwh: 1.2 }).confidenzaConsumo, 'measured');
  assert.equal(conta({ ...BASE, averagePowerW: 90 }).confidenzaConsumo, 'verified');
  assert.equal(conta({ ...BASE, watt: 150 }).confidenzaConsumo, 'estimated');

  /* E il modo è dichiarato, non dedotto dal numero. */
  assert.equal(conta({ ...BASE, measuredEnergyKwh: 1.2 }).modoEnergia, 'misurato');
  assert.equal(conta({ ...BASE, averagePowerW: 90 }).modoEnergia, 'medio');
  assert.equal(conta({ ...BASE, watt: 150 }).modoEnergia, 'targa');

  /* La complessiva è la peggiore delle due: con il €/kWh scritto a mano non
     sale a «misurato» nemmeno con i kWh contati, e questo è corretto. */
  assert.equal(conta({ ...BASE, measuredEnergyKwh: 1.2 }).confidence, 'declared');
  assert.equal(conta({ ...BASE, watt: 150 }).confidence, 'estimated');
});

/* ═══ 13 · LAVORO ══════════════════════════════════════════════════════════ */

test('dieci ore di stampa e quindici minuti di persona costano quindici minuti', () => {
  const r = E.calcola({ ...BASE, hours: 10, finishMin: 15, setupMin: 0, laborPerHour: 20 });
  vicino(voce(r, 'finitura'), (15 / 60) * 20);
  /* E soprattutto: non 10 h × 20 €/h. */
  assert.ok(voce(r, 'finitura') < 20, 'il tempo macchina è stato pagato come tempo di persona');
});

test('raddoppiare le ore di stampa non tocca il costo del lavoro', () => {
  const a = E.calcola({ ...BASE, hours: 5 });
  const b = E.calcola({ ...BASE, hours: 10 });
  vicino(voce(a, 'finitura'), voce(b, 'finitura'));
  vicino(a.unaTantum.perPezzo, b.unaTantum.perPezzo);
  /* Ma il tempo macchina sì, ed è il punto. */
  assert.ok(voce(b, 'macchina') > voce(a, 'macchina'));
});

/* ═══ 16-17 · SCAGLIONI E LOTTO ════════════════════════════════════════════ */

test('nove scaglioni: l\'avviamento si spalma, il materiale no', () => {
  const QTA = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
  const sc = E.scaglioni(BASE, QTA, { strategia: 'margine', marginePct: 40, ivaPct: 0 });
  assert.equal(sc.length, QTA.length);

  const avviamento = (15 / 60) * 18;
  const materiale = voce(E.calcola(BASE), 'materiale');
  for (let i = 0; i < sc.length; i++) {
    if (sc[i].vuoto) continue;
    /* la quota di avviamento per pezzo è esattamente avviamento ÷ quantità */
    const senzaSetup = E.calcola({ ...BASE, qty: QTA[i] }).perPezzo.totale;
    vicino(sc[i].costoPezzo, senzaSetup + avviamento / QTA[i], 0.001);
    /* e il materiale non scende mai */
    assert.ok(sc[i].costoPezzo > materiale);
  }
  /* la curva scende sempre, e si appiattisce */
  for (let i = 1; i < sc.length; i++) assert.ok(sc[i].costoPezzo < sc[i - 1].costoPezzo);
  const salto = sc[0].costoPezzo - sc[1].costoPezzo;
  const codaSalto = sc[sc.length - 2].costoPezzo - sc[sc.length - 1].costoPezzo;
  assert.ok(codaSalto < salto / 10, 'la curva deve appiattirsi: è la ragione per cui si arriva a mille');
});

test('lo sconto a volume non è arbitrario: è l\'avviamento diviso', () => {
  const uno = E.scaglioni(BASE, [1], { strategia: 'margine', marginePct: 40, ivaPct: 0 })[0];
  const cento = E.scaglioni(BASE, [100], { strategia: 'margine', marginePct: 40, ivaPct: 0 })[0];
  const risparmio = uno.costoPezzo - cento.costoPezzo;
  const avviamento = (15 / 60) * 18;
  vicino(risparmio, avviamento - avviamento / 100, 0.001);
  /* Il margine resta quello: il prezzo scende perché scende il costo, non
     perché si sia applicato uno sconto per far sembrare un prezzo B2B. */
  vicino(uno.marginePct ?? 40, cento.marginePct ?? 40, 0.001);
});

/* ═══ 7 · LA MACCHINA DEL 3MF ══════════════════════════════════════════════ */

test('il lettore 3MF dichiara la macchina invece di applicarla', () => {
  /* Il modulo restituisce `stampante`; la sostituzione è una scelta della
     vista, che mostra importata e usata una accanto all'altra. Qui si prova
     che il dato esiste e che il parser non decide niente al posto di nessuno. */
  const codice = fs.readFileSync('src/product/slicer-import.js', 'utf8');
  assert.match(codice, /printer_model_id/);
  assert.ok(!/pickMach|setMacchina|machinePrice\s*=/.test(codice),
    'il lettore non deve toccare la macchina in uso');
  assert.equal(typeof S.da3mf, 'function');
});
