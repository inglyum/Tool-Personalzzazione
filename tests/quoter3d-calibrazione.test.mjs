/**
 * quoter3d-calibrazione.test.mjs — perché il conto non torna con lo slicer.
 *
 * Segnalato: il preventivatore 3D produce costi molto più alti di quelli che
 * mostra Bambu Studio. Caso di riferimento: 290 g, 9h57, € 4,50.
 *
 * Misurato prima di toccare qualunque cosa:
 *
 *     solo materiale                € 6,96
 *     + energia                     € 7,21
 *     + macchina e manutenzione     € 10,39
 *     + scarto                      € 11,18
 *     + manodopera (setup+finitura) € 18,68
 *
 * Due cause, entrambe misurabili, nessuna delle quali è «le percentuali sono
 * troppo alte»:
 *
 * 1. **Si confrontano due domande diverse.** Lo slicer mostra il materiale;
 *    il preventivatore mostra il costo aziendale pieno. La sola manodopera di
 *    avviamento e finitura vale € 7,50, più del riferimento intero.
 *
 * 2. **Il prezzo del materiale è diverso.** Il riferimento implica 15,52 €/kg;
 *    il valore predefinito è 24,00 €/kg. Il 55% in più.
 *
 * La correzione non è abbassare un numero: è dichiarare a quale domanda si sta
 * rispondendo. Da qui in poi il livello si sceglie, e il risultato dice quale
 * sta usando.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, console });
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), contesto);
const E = contesto.InglyCostEngine;

/** Il caso di calibrazione, con i valori predefiniti del quoter FDM. */
const CALIBRAZIONE = {
  tecnologia: 'print3d', grams: 290, hours: 9.95, qty: 1,
  materialPricePerKg: 24, watt: 150, kwhPrice: 0.28, dutyCycle: 0.6,
  machinePrice: 400, machineLifeHours: 2000, maintenancePerHour: 0.12,
  failureRate: 7, laborPerHour: 18, setupMin: 15, finishMin: 10,
};
const RIFERIMENTO = 4.50;
const vicino = (a, b, t = 0.005) => assert.ok(Math.abs(a - b) < t, a + ' ≉ ' + b);

/* ═══════════════════════════════════════════════════════════════════════════
   1. I TRE LIVELLI
   ═══════════════════════════════════════════════════════════════════════════ */
test('la stessa stampa ha tre costi, tutti e tre veri', async (t) => {
  const c = (l) => E.calcola({ ...CALIBRAZIONE, livelloCosto: l });

  await t.test('costo di stampa: materiale ed energia', () => {
    const r = c('stampa');
    vicino(r.costoPezzo, 7.21, 0.01);
    assert.equal(r.perPezzo.voci.map((v) => v.id).sort().join(','), 'energia,materiale');
  });

  await t.test('costo di produzione: aggiunge macchina, manutenzione e scarto', () => {
    const r = c('macchina');
    vicino(r.costoPezzo, 11.18, 0.01);
    assert.ok(r.perPezzo.voci.some((v) => v.id === 'macchina'));
    assert.ok(r.perPezzo.voci.some((v) => v.id === 'scarto'));
    assert.ok(!r.perPezzo.voci.some((v) => v.id === 'finitura'), 'la finitura è tempo di una persona');
  });

  await t.test('costo aziendale pieno: aggiunge il tuo tempo', () => {
    const r = c('completo');
    vicino(r.costoPezzo, 18.68, 0.01);
    assert.ok(r.unaTantum.perPezzo > 0, 'l\'avviamento entra solo qui');
  });

  await t.test('ogni livello dice cosa ha lasciato fuori', () => {
    const r = c('stampa');
    assert.ok(r.escluse.length >= 3);
    /* Le escluse sono le voci che esistono e non entrano. Lo scarto non è fra
       loro: a questo livello non viene generato affatto, perché si calcola
       sulle voci ammesse. 7,21 + 10,68 + 0,78 di scarto = 18,68. */
    vicino(r.esclusoTotale, 10.684, 0.01);
    const pieno = E.calcola({ ...CALIBRAZIONE, livelloCosto: 'completo' });
    const scarto = pieno.perPezzo.voci.find((v) => v.id === 'scarto').value;
    vicino(r.costoPezzo + r.esclusoTotale + scarto, pieno.costoPezzo, 0.02);
    assert.equal(r.livelloLabel, 'Costo di stampa');
  });

  await t.test('il livello predefinito resta quello pieno', () => {
    /* Cambiarlo sposterebbe in silenzio il prezzo di ogni preventivo già
       costruito. Chi vuole un livello più stretto lo dichiara. */
    assert.equal(E.LIVELLO_PREDEFINITO, 'completo');
    vicino(E.calcola(CALIBRAZIONE).costoPezzo, c('completo').costoPezzo);
  });

  await t.test('un livello inventato non fa esplodere niente', () => {
    vicino(E.calcola({ ...CALIBRAZIONE, livelloCosto: 'astrologia' }).costoPezzo, c('completo').costoPezzo);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   2. LA CALIBRAZIONE SPIEGA, NON AGGIUSTA
   ═══════════════════════════════════════════════════════════════════════════ */
test('il confronto con lo slicer', async (t) => {
  const k = E.calibra(CALIBRAZIONE, { costo: RIFERIMENTO, sistema: 'Bambu Studio' });

  await t.test('confronta tutti e tre i livelli', () => {
    assert.equal(k.confrontabile, true);
    assert.equal(k.livelli.length, 3);
    k.livelli.forEach((l) => { assert.ok(l.delta != null && l.deltaPct != null); });
  });

  await t.test('individua il livello che risponde alla stessa domanda', () => {
    assert.equal(k.corrispondente.id, 'stampa',
      'il riferimento di uno slicer è un costo di stampa, non un costo aziendale');
  });

  await t.test('e il prezzo del materiale che il riferimento implica', () => {
    vicino(k.materialeImplicito, 4.50 / 0.290, 0.01);
    vicino(k.materialeImplicito, 15.517, 0.01);
  });

  await t.test('con quel prezzo del materiale, il conto torna', () => {
    /* La prova che la spiegazione è giusta: allineando l'unico ingresso che
       differisce, i due numeri coincidono a meno dell'energia. */
    const r = E.calcola({ ...CALIBRAZIONE, materialPricePerKg: k.materialeImplicito, livelloCosto: 'stampa' });
    const materiale = r.perPezzo.voci.find((v) => v.id === 'materiale').value;
    vicino(materiale, RIFERIMENTO, 0.01);
    const energia = r.perPezzo.voci.find((v) => v.id === 'energia').value;
    vicino(r.costoPezzo, RIFERIMENTO + energia, 0.01);
  });

  await t.test('nessun fattore di calibrazione, da nessuna parte', () => {
    /* Un numero inventato per far coincidere due conti nasconde la differenza
       invece di spiegarla. Il motore non ne contiene nessuno, e questo test
       esiste perché non ne compaia domani. */
    const sorgente = fs.readFileSync('src/product/cost-engine.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const vietato of [/fudge/i, /calibrationFactor/i, /fattoreCalibrazione/i, /\bfattoreCorrettivo\b/i]) {
      assert.ok(!vietato.test(sorgente), 'il motore contiene un fattore di calibrazione: ' + vietato);
    }
  });

  await t.test('senza riferimento non si confronta niente', () => {
    assert.equal(E.calibra(CALIBRAZIONE, {}).confrontabile, false);
    assert.equal(E.calibra(CALIBRAZIONE, { costo: 0 }).confrontabile, false);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   3. LE SPESE GENERALI NON SI SPALMANO SULLE ORE DELLA MACCHINA
   ═══════════════════════════════════════════════════════════════════════════ */
test('una stampante che lavora di notte non consuma affitto', async (t) => {
  const conGenerali = { ...CALIBRAZIONE, overheadPerHour: 4, livelloCosto: 'completo' };

  await t.test('le generali seguono le ore di una persona, non della macchina', () => {
    const r = E.calcola(conGenerali);
    /* 15 min di avviamento + 10 di finitura = 25 min = 0,4167 h × 4 €/h */
    vicino(r.overhead, (25 / 60) * 4, 0.01);
    assert.match(r.overheadModo, /ore di lavoro/);
  });

  await t.test('prima si spalmavano sulle 9,95 ore di stampa', () => {
    /* Il difetto misurato: 4 €/h × 9,95 h = 39,80 € di spese generali su un
       pezzo da 290 g, più del triplo del suo costo di produzione. */
    const sbagliato = 4 * 9.95;
    const giusto = E.calcola(conGenerali).overhead;
    assert.ok(sbagliato / giusto > 20, 'lo sbaglio valeva ' + (sbagliato / giusto).toFixed(0) + ' volte il giusto');
    vicino(sbagliato, 39.80, 0.01);
  });

  await t.test('su una macchina presidiata non cambia niente', () => {
    /* Il laser lavora con l'operatore davanti: le ore macchina e le ore di
       persona coincidono, e la correzione non deve spostare quel conto. */
    const laser = { tecnologia: 'laser', cutLengthMm: 1200, cutSpeedMmMin: 600, hours: 2,
      sheetPrice: 12, sheetAreaMm2: 240000, pieceAreaMm2: 8000, overheadPerHour: 4, qty: 1 };
    vicino(E.calcola(laser).overhead, 8, 0.01);
  });

  await t.test('e si può sempre dichiarare a mano', () => {
    vicino(E.calcola({ ...conGenerali, overheadHours: 3 }).overhead, 12, 0.01);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   4. I SEDICI CASI GOLDEN
   ═══════════════════════════════════════════════════════════════════════════ */
const B = { tecnologia: 'print3d', materialPricePerKg: 20, watt: 105, kwhPrice: 0.28, dutyCycle: 0.6,
  machinePrice: 400, machineLifeHours: 2000, maintenancePerHour: 0.12, laborPerHour: 18 };

test('sedici casi, e nessuno esplode', async (t) => {
  const casi = [
    ['C01 · 290 g · 9h57 · riferimento 4,50', { ...CALIBRAZIONE, livelloCosto: 'stampa' }, (r) => { vicino(r.costoPezzo, 7.21, 0.01); }],
    ['C02 · 100 g · 6h · PLA', { ...B, grams: 100, hours: 6, qty: 1 }, (r) => { assert.ok(r.costoPezzo > 2 && r.costoPezzo < 6); }],
    ['C03 · 20 g · 1h', { ...B, grams: 20, hours: 1, qty: 1 }, (r) => { assert.ok(r.costoPezzo > 0.4 && r.costoPezzo < 2); }],
    ['C04 · 1 kg · 20h', { ...B, grams: 1000, hours: 20, qty: 1 }, (r) => { assert.ok(r.costoPezzo > 20 && r.costoPezzo < 35); }],
    ['C05 · 1000 pezzi: l\'avviamento si divide', { ...B, grams: 20, hours: 1, qty: 1000, setupMin: 60 },
      (r) => { vicino(r.unaTantum.perPezzo, (60 / 60 * 18) / 1000, 0.0001); }],
    ['C06 · materiale senza prezzo', { ...B, grams: 100, hours: 3, qty: 1, materialPricePerKg: 0 },
      (r) => { assert.ok(!r.perPezzo.voci.some((v) => v.id === 'materiale'), 'una voce a zero non entra: non è un costo, è un dato che manca'); }],
    ['C07 · macchina non dichiarata', { ...B, grams: 100, hours: 3, qty: 1, machinePrice: 0, machineLifeHours: 0 },
      (r) => { assert.ok(!r.perPezzo.voci.some((v) => v.id === 'macchina')); assert.ok(r.costoPezzo > 0); }],
    ['C08 · peso zero', { ...B, grams: 0, hours: 2, qty: 1 }, (r) => { assert.ok(r.costoPezzo >= 0 && isFinite(r.costoPezzo)); }],
    ['C09 · peso negativo', { ...B, grams: -50, hours: 2, qty: 1 }, (r) => { assert.ok(r.costoPezzo >= 0, 'un peso negativo non produce un credito'); }],
    ['C10 · tempo negativo', { ...B, grams: 50, hours: -3, qty: 1 }, (r) => { assert.ok(r.costoPezzo >= 0 && isFinite(r.costoPezzo)); assert.equal(r.ore, 0); }],
    ['C11 · quantità zero diventa uno', { ...B, grams: 50, hours: 2, qty: 0 }, (r) => { assert.equal(r.qty, 1); }],
    ['C12 · scarto al 90%', { ...B, grams: 100, hours: 3, qty: 1, failureRate: 90 }, (r) => { assert.ok(isFinite(r.costoPezzo) && r.costoPezzo < 1000); }],
    ['C13 · scarto oltre il 90% resta al 90%', { ...B, grams: 100, hours: 3, qty: 1, failureRate: 300 },
      (r) => { const a = E.calcola({ ...B, grams: 100, hours: 3, qty: 1, failureRate: 90 }); vicino(r.costoPezzo, a.costoPezzo, 0.0001); }],
    ['C14 · multimateriale con spurgo', { ...B, grams: 200, supportGrams: 40, purgeGrams: 60, hours: 8, qty: 1 },
      (r) => { const m = r.perPezzo.voci.find((v) => v.id === 'materiale'); vicino(m.value, (300 / 1000) * 20, 0.001); }],
    ['C15 · FDM con bobina invece di €/kg', { ...B, grams: 250, hours: 5, qty: 1, materialPricePerKg: 0, spoolPrice: 22, spoolGrams: 1000 },
      (r) => { vicino(r.perPezzo.voci.find((v) => v.id === 'materiale').value, 5.5, 0.001); }],
    ['C16 · resina con lavaggio e cura', { ...B, grams: 80, hours: 4, qty: 1, washCureMin: 25, consumablesPerPrint: 0.9 },
      (r) => { assert.ok(r.perPezzo.voci.some((v) => v.id === 'postProcesso')); }],
  ];

  assert.equal(casi.length, 16, 'i casi golden devono restare sedici o crescere di proposito');

  for (const [nome, ingresso, verifica] of casi) {
    await t.test(nome, () => {
      const r = E.calcola(ingresso);
      assert.equal(r.vuoto, false, 'il motore non ha calcolato');
      assert.ok(isFinite(r.costoPezzo), 'costo non numerico');
      assert.ok(r.costoPezzo >= 0, 'costo negativo: ' + r.costoPezzo);
      verifica(r);
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   5. MARGINE E RICARICO — la formula della direttiva
   ═══════════════════════════════════════════════════════════════════════════ */
test('prezzo da margine, non da moltiplicatore', async (t) => {
  await t.test('margine 40% significa costo / (1 − 0,40)', () => {
    const p = E.prezzo(100, { strategia: 'margine', marginePct: 40, ivaPct: 0 });
    vicino(p.netto, 100 / 0.6, 0.0001);
    vicino(p.netto, 166.6667, 0.001);
    vicino(p.marginePct, 40, 0.0001);
  });

  await t.test('costo × 1,40 dà un margine del 28,6%, non del 40%', () => {
    const p = E.prezzo(100, { strategia: 'ricarico', ricarico: 1.4, ivaPct: 0 });
    vicino(p.netto, 140, 0.0001);
    vicino(p.marginePct, 28.5714, 0.001);
    assert.notEqual(Math.round(p.marginePct), 40);
  });

  await t.test('le quattro politiche puntano a un margine, non a un moltiplicatore', () => {
    for (const [id, pol] of Object.entries(E.POLITICHE)) {
      const p = E.prezzo(100, { strategia: 'margine', marginePct: pol.marginTarget, ivaPct: 0 });
      vicino(p.marginePct, pol.marginTarget, 0.0001, id);
    }
  });

  await t.test('l\'IVA non entra in nessun margine', () => {
    const senza = E.prezzo(100, { strategia: 'margine', marginePct: 40, ivaPct: 0 });
    const con = E.prezzo(100, { strategia: 'margine', marginePct: 40, ivaPct: 22 });
    vicino(senza.marginePct, con.marginePct, 0.0001);
    vicino(con.lordo, con.netto * 1.22, 0.0001);
  });
});
