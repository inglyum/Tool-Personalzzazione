/**
 * 3d-realistic-pricing.test.mjs — la curva delle stampe lunghe.
 *
 * La segnalazione era: «nove ore di stampa producono un prezzo molto superiore
 * al mercato, il costo macchina esplode». Misurato sul file consegnato, con i
 * parametri predefiniti (stampante 420 €, 3000 ore di vita):
 *
 *     materiale € 6,96 · energia € 0,23 · macchina € 1,26 · manutenzione € 1,08
 *     finitura € 1,50 · scarto € 0,72 · avviamento € 4,50
 *     costo € 16,24 · prezzo € 27,07
 *
 * **Il costo macchina non era il problema**: € 1,26 per nove ore, 0,14 €/h.
 * A pesare erano l'avviamento (15 minuti pieni su un pezzo solo) e il prezzo
 * predefinito del materiale, 24 €/kg contro i 15,50 reali.
 *
 * Ma il costo macchina *può* esplodere, e quando lo fa niente lo segnala: una
 * macchina da 5000 € dichiarata a 500 ore dà 10 €/h, e nove ore portano 90 €
 * di sola macchina. Questi test presidiano entrambe le cose — che la curva
 * resti plausibile, e che un dato assurdo venga dichiarato invece che pagato.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/product/machine-rate.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), sandbox);
const M = sandbox.window.InglyMachineRate;
const E = sandbox.window.InglyCostEngine;

/* Il caso reale, con i prezzi che il laboratorio paga davvero. */
const CASO = {
  tecnologia: 'print3d',
  grams: 290,
  materialPricePerKg: 15.50,
  machinePrice: 420, machineLifeHours: 3000,
  ratedPowerW: 150, kwhPrice: 0.28, dutyCycle: 0.6,
  maintenancePerHour: 0.12,
  laborPerHour: 18, setupMin: 15, finishMin: 5,
  failureRate: 7,
  qty: 1,
};
const con = (extra) => E.calcola(Object.assign({}, CASO, extra));
const voce = (r, id) => (r.perPezzo.voci.find((v) => v.id === id) || { value: 0 }).value;

/* ── La curva ───────────────────────────────────────────────────────────── */

const ORE = [1, 3, 5, 9, 15, 24];
const curva = ORE.map((h) => {
  const r = con({ hours: h });
  return { h, costo: r.costoPezzo, macchina: voce(r, 'macchina'), materiale: voce(r, 'materiale') };
});

test('la curva cresce con le ore, sempre', () => {
  for (let i = 1; i < curva.length; i++) {
    assert.ok(curva[i].costo > curva[i - 1].costo,
      `${curva[i].h} h costa ${curva[i].costo} e ${curva[i - 1].h} h costa ${curva[i - 1].costo}`);
  }
});

test('e cresce in modo progressivo, non esponenziale', () => {
  /* Da 1 a 24 ore le ore si moltiplicano per 24. Il costo no, e non deve:
     il materiale non cambia, l'avviamento nemmeno. Se il costo crescesse
     quanto le ore vorrebbe dire che qualcosa scala con il tempo e non
     dovrebbe. */
  const rapporto = curva[curva.length - 1].costo / curva[0].costo;
  assert.ok(rapporto < 3, `da 1 a 24 ore il costo si moltiplica per ${rapporto.toFixed(2)}`);
  assert.ok(rapporto > 1.2, 'e non può nemmeno restare fermo: le ore costano');
});

test('il caso delle nove ore ha un costo macchina plausibile', () => {
  const r = con({ hours: 9 });
  const macchina = voce(r, 'macchina');
  /* 420 € su 3000 ore fa 0,14 €/h: nove ore fanno € 1,26. */
  assert.ok(Math.abs(macchina - 1.26) < 0.02, `costo macchina € ${macchina}`);
  assert.ok(macchina / r.costoPezzo < 0.15,
    `la macchina è il ${Math.round(macchina / r.costoPezzo * 100)}% del costo: troppo`);
});

test('nove ore: il materiale segue il prezzo reale, non un predefinito', () => {
  const r = con({ hours: 9 });
  /* 290 g × 15,50 €/kg = € 4,495. Il predefinito del preventivatore era 24
     €/kg, che sullo stesso pezzo faceva € 6,96 — due euro e mezzo di
     differenza su un preventivo da quindici. */
  assert.ok(Math.abs(voce(r, 'materiale') - 4.495) < 0.01);
});

test('nove ore: il costo interno resta nell ordine di grandezza giusto', () => {
  const r = con({ hours: 9 });
  assert.ok(r.costoPezzo > 8 && r.costoPezzo < 20,
    `costo interno € ${r.costoPezzo}: fuori da ogni ordine di grandezza plausibile`);
});

test('l avviamento è la voce che pesa su un pezzo solo, e si divide su molti', () => {
  const uno = con({ hours: 9, qty: 1 });
  const dieci = con({ hours: 9, qty: 10 });
  assert.ok(uno.unaTantum.perPezzo > 4, 'quindici minuti a 18 €/h sono € 4,50');
  assert.ok(Math.abs(dieci.unaTantum.perPezzo - uno.unaTantum.perPezzo / 10) < 0.01);
  assert.ok(dieci.costoPezzo < uno.costoPezzo * 0.8,
    'su dieci pezzi il costo unitario deve scendere in modo visibile');
});

/* ── La macchina che esplode ────────────────────────────────────────────── */

test('una macchina da 5000 € dichiarata a 500 ore verrebbe a 10 €/h', () => {
  const t = M.tariffa({ purchasePrice: 5000, expectedLifeHours: 500,
    machineRateMode: 'ammortamento', categoria: 'print3d' });
  assert.equal(t.euroOraGrezza, 10, 'è il conto che la formula faceva, e faceva bene');
  assert.equal(t.tettoScattato, true, 'ma nessuno lo segnalava');
  assert.equal(t.euroOra, 3, 'ora si applica la soglia della categoria');
  assert.match(t.avvisi.join(' '), /fuori scala/);
  assert.match(t.avvisi.join(' '), /ore di vita utile/i);
});

test('e nel motore quella macchina non porta 90 € di sole ore', () => {
  const r = con({ hours: 9, machinePrice: 5000, machineLifeHours: 500 });
  const macchina = voce(r, 'macchina');
  assert.ok(macchina <= 27.01, `€ ${macchina} per nove ore di macchina`);
  assert.ok(macchina < 90, 'senza la soglia sarebbero stati € 90');
});

test('la soglia non tocca le macchine normali', () => {
  for (const [prezzo, vita] of [[420, 3000], [1500, 3000], [2500, 6000], [900, 2000]]) {
    const t = M.tariffa({ purchasePrice: prezzo, expectedLifeHours: vita,
      machineRateMode: 'ammortamento', categoria: 'print3d' });
    assert.equal(t.tettoScattato, false,
      `${prezzo} € su ${vita} ore fa ${t.euroOra} €/h e non deve far scattare niente`);
  }
});

test('la soglia si può alzare, dichiarandolo', () => {
  const t = M.tariffa({ purchasePrice: 5000, expectedLifeHours: 500,
    machineRateMode: 'ammortamento', categoria: 'print3d', maxRagionevole: 15 });
  assert.equal(t.tettoScattato, false);
  assert.equal(t.euroOra, 10, 'una macchina industriale costa quello che costa');
});

/* ── Le tre modalità ────────────────────────────────────────────────────── */

test('modalità «dichiarata»: la tariffa è quella scritta, e nient altro', () => {
  const t = M.tariffa({ machineRateMode: 'manuale', machineHourlyRate: 2.5,
    purchasePrice: 5000, expectedLifeHours: 500 });
  assert.equal(t.euroOra, 2.5);
  assert.equal(t.componenti.ammortamento, 0, 'in modalità dichiarata non si ricalcola niente');
  assert.equal(t.confidence, 'declared');
});

test('modalità «dichiarata» senza tariffa non inventa un numero', () => {
  const t = M.tariffa({ machineRateMode: 'manuale', purchasePrice: 1000, expectedLifeHours: 2000 });
  assert.equal(t.euroOra, 0);
  assert.equal(t.confidence, 'missing');
  assert.match(t.avvisi.join(' '), /senza tariffa/);
});

test('modalità «ammortamento»: solo il recupero dell investimento', () => {
  const t = M.tariffa({ machineRateMode: 'ammortamento', purchasePrice: 1200,
    expectedLifeHours: 3000, annualMaintenance: 300, expectedAnnualHours: 1000 });
  assert.equal(t.euroOra, 0.4);
  assert.equal(t.componenti.manutenzione, 0, 'la manutenzione è esclusa per scelta');
});

test('modalità «ibrida»: ammortamento più manutenzione ripartita', () => {
  const t = M.tariffa({ machineRateMode: 'ibrido', purchasePrice: 1200,
    expectedLifeHours: 3000, annualMaintenance: 300, expectedAnnualHours: 1000 });
  assert.equal(t.componenti.ammortamento, 0.4);
  assert.equal(t.componenti.manutenzione, 0.3, '300 € su 1000 ore');
  assert.equal(t.euroOra, 0.7);
});

test('ibrida è il predefinito: una macchina costa anche quando non si rompe', () => {
  assert.equal(M.MODO_PREDEFINITO, 'ibrido');
  const senzaModo = M.tariffa({ purchasePrice: 1200, expectedLifeHours: 3000,
    annualMaintenance: 300, expectedAnnualHours: 1000 });
  assert.equal(senzaModo.modo, 'ibrido');
});

test('il valore residuo si sottrae: non si ammortizza quello che si rivende', () => {
  const t = M.tariffa({ machineRateMode: 'ammortamento', purchasePrice: 1200,
    residualValue: 300, expectedLifeHours: 3000 });
  assert.equal(t.euroOra, 0.3, '900 € su 3000 ore');
});

/* ── Quello che manca si dichiara ───────────────────────────────────────── */

test('senza ore di vita utile non si inventa un ammortamento', () => {
  const t = M.tariffa({ purchasePrice: 1200 });
  assert.equal(t.euroOra, 0);
  assert.equal(t.confidence, 'missing');
  assert.match(t.avvisi.join(' '), /vita utile/i);
});

test('senza prezzo d acquisto nemmeno', () => {
  const t = M.tariffa({ expectedLifeHours: 3000 });
  assert.equal(t.euroOra, 0);
  assert.match(t.avvisi.join(' '), /Prezzo d'acquisto/);
});

test('manutenzione annua senza ore annue non è ripartibile, e lo dice', () => {
  const t = M.tariffa({ machineRateMode: 'ibrido', purchasePrice: 1200,
    expectedLifeHours: 3000, annualMaintenance: 300 });
  assert.equal(t.componenti.manutenzione, 0);
  assert.match(t.avvisi.join(' '), /Ore lavorate all'anno/);
});

test('la manutenzione non si conta due volte fra tariffa e voce di costo', () => {
  /* Il motore ha già una voce «manutenzione» per pezzo: la tariffa non deve
     portarla dentro anche lei. */
  const r = con({ hours: 9, maintenancePerHour: 0.12 });
  const macchina = voce(r, 'macchina');
  const manut = voce(r, 'manutenzione');
  assert.ok(Math.abs(macchina - 1.26) < 0.02, 'la macchina è solo ammortamento');
  assert.ok(Math.abs(manut - 1.08) < 0.02, 'e la manutenzione è la sua voce');
});

/* ── Le soglie per categoria ────────────────────────────────────────────── */

test('ogni tecnologia ha la sua soglia, perché non hanno lo stesso ordine di grandezza', () => {
  assert.ok(M.tettoDi('print3d') < M.tettoDi('laser'));
  assert.ok(M.tettoDi('laser') < M.tettoDi('uv'));
  assert.equal(M.tettoDi('sconosciuta'), M.TETTO_PREDEFINITO);
});

test('il costo di un lavoro è la tariffa per le ore, e le due cose restano distinte', () => {
  const c = M.costoLavoro({ purchasePrice: 1200, expectedLifeHours: 3000,
    machineRateMode: 'ammortamento' }, 9);
  assert.equal(c.euroOra, 0.4);
  assert.equal(c.ore, 9);
  assert.equal(c.costo, 3.6);
});
