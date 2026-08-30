/**
 * machine-cost.test.mjs — un'ora di macchina, voce per voce.
 *
 * Il difetto che questo modulo esiste per chiudere è misurato in Fase 1: zero
 * moduli su sessantatré distinguevano un consumo misurato da una potenza di
 * targa, e sette usavano la targa come se fosse consumo senza dirlo. Il costo
 * orario usciva da una sola cifra, e nessuno poteva sapere quale delle quattro
 * componenti la stesse facendo crescere.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, String });
ctx.window = ctx; ctx.globalThis = ctx;
vm.runInContext(fs.readFileSync('src/product/machine-cost.js', 'utf8'), ctx);
const M = ctx.InglyMachineCost;
const vicino = (a, b, t = 0.0001) => Math.abs(a - b) < t;

/* ── L'energia ──────────────────────────────────────────────────────────── */

test('la priorità è misurato → medio → targa, e la fonte viaggia col numero', () => {
  const tutti = { measuredPowerW: 95, averagePowerW: 90, ratedPowerW: 250 };
  assert.equal(M.potenza(tutti).fonte, 'misurato');
  assert.equal(M.potenza(tutti).confidence, 'measured');
  const senzaMisura = { averagePowerW: 90, ratedPowerW: 250 };
  assert.equal(M.potenza(senzaMisura).fonte, 'medio dichiarato');
  assert.equal(M.potenza(senzaMisura).confidence, 'verified');
  const soloTarga = { ratedPowerW: 250 };
  assert.equal(M.potenza(soloTarga).fonte, 'targa');
  assert.equal(M.potenza(soloTarga).confidence, 'estimated');
  assert.match(M.potenza(soloTarga).nota, /misura reale consigliata/);
});

test('senza alcun dato di assorbimento non si stima un consumo', () => {
  const p = M.potenza({});
  assert.equal(p.w, 0);
  assert.equal(p.confidence, 'missing');
});

test('la potenza ottica del laser non è il suo assorbimento', () => {
  /* Nel catalogo convivono `power_w` (20 W di diodo) e `kw` (0,080 kW = 80 W
     assorbiti). Sono a un fattore quattro di distanza: confonderli sbaglia la
     bolletta di quattro volte. */
  const m = M.normalizza({ id: 'xt-f2', power_w: 20, kw: 0.080, price: 999, life_h: 3000 });
  assert.equal(m.averagePowerW, 80, 'kw è l\'assorbimento, in kilowatt');
  assert.equal(m.laserPowerW, 20, 'power_w resta, con il suo nome');
  assert.notEqual(m.averagePowerW, m.laserPowerW);
});

/* ── L'investimento ─────────────────────────────────────────────────────── */

test('spedizione e installazione fanno parte della macchina', () => {
  /* Senza, l'ammortamento esce basso e la macchina sembra più economica di
     quanto sia stata pagata. */
  const i = M.investimento({ purchasePrice: 1000, shipping: 120, installation: 80 });
  assert.ok(vicino(i.totale, 1200));
  assert.ok(vicino(i.extra, 200));
});

test('un prezzo IVA compresa si scorpora, e lo dichiara', () => {
  const i = M.investimento({ purchasePrice: 1220, VATIncluded: true, ivaPct: 22 });
  assert.ok(vicino(i.totale, 1000, 0.01));
  assert.equal(i.ivaScorporata, true);
});

/* ── Il costo orario ────────────────────────────────────────────────────── */

const P2 = { id: 'xt-p2', brand: 'xTool', model: 'P2', price: 2499, life_h: 6000,
  kw: 0.120, maint: 0.06 };

test('le quattro voci si sommano e nessuna include le altre', () => {
  const c = M.daCatalogo(P2, { kwhPrice: 0.28 });
  assert.ok(vicino(c.energyCostPerHour, 0.120 * 0.28), 'energia: 120 W × €0,28');
  assert.ok(vicino(c.depreciationCostPerHour, 2499 / 6000), 'ammortamento: prezzo ÷ vita');
  assert.ok(vicino(c.maintenanceCostPerHour, 0.06));
  assert.ok(vicino(c.machineCostPerHour,
    c.energyCostPerHour + c.depreciationCostPerHour + c.maintenanceCostPerHour + c.consumablesCostPerHour));
});

test('la manodopera non entra nel costo macchina', () => {
  /* Una stampante che lavora di notte costa corrente e ammortamento, non lo
     stipendio di nessuno. */
  const a = M.daCatalogo(P2, { kwhPrice: 0.28 });
  const b = M.daCatalogo({ ...P2, laborPerHour: 25, operatorCost: 25 }, { kwhPrice: 0.28 });
  assert.ok(vicino(a.machineCostPerHour, b.machineCostPerHour),
    'nessun campo di manodopera deve poter entrare nel costo orario macchina');
});

test("l'overhead resta fuori dal costo macchina e dentro quello pieno", () => {
  const c = M.daCatalogo({ ...P2, overheadPerHour: 4 }, { kwhPrice: 0.28 });
  assert.ok(vicino(c.fullMachineCostPerHour - c.machineCostPerHour, 4),
    'le spese generali sono un costo dell\'azienda, non della macchina');
});

test('il valore residuo si sottrae: si ammortizza ciò che si perde', () => {
  const senza = M.daCatalogo(P2, { kwhPrice: 0.28 }).depreciationCostPerHour;
  const con = M.daCatalogo({ ...P2, residualValue: 900 }, { kwhPrice: 0.28 }).depreciationCostPerHour;
  assert.ok(vicino(con, (2499 - 900) / 6000));
  assert.ok(con < senza);
});

test('la manutenzione annuale si ripartisce solo se si sa su quante ore', () => {
  const senzaOre = M.daCatalogo({ ...P2, maint: 0, maintenanceAnnual: 600 }, { kwhPrice: 0.28 });
  assert.equal(senzaOre.maintenanceCostPerHour, 0);
  assert.ok(senzaOre.avvisi.some((a) => /ore annue/.test(a)));
  const conOre = M.daCatalogo({ ...P2, maint: 0, maintenanceAnnual: 600, expectedAnnualHours: 1200 },
    { kwhPrice: 0.28 });
  assert.ok(vicino(conOre.maintenanceCostPerHour, 0.5));
});

test('ogni consumabile ha il proprio intervallo, e uno senza non entra', () => {
  const c = M.daCatalogo({ ...P2, consumables: [
    { name: 'Lente', cost: 60, everyHours: 600 },
    { name: 'Filtro', cost: 120, everyHours: 2000 },
    { name: 'Ugello', cost: 8 },
  ] }, { kwhPrice: 0.28 });
  assert.ok(vicino(c.consumablesCostPerHour, 60 / 600 + 120 / 2000), `€${c.consumablesCostPerHour}`);
  assert.ok(c.avvisi.some((a) => /senza intervallo/.test(a)),
    'un consumabile senza intervallo non si stima: si segnala');
});

/* ── Quello che manca si dice ───────────────────────────────────────────── */

test('una macchina senza vita utile non riceve un ammortamento inventato', () => {
  const c = M.daCatalogo({ price: 2000 }, { kwhPrice: 0.28 });
  assert.equal(c.depreciationCostPerHour, 0);
  assert.ok(c.avvisi.some((a) => /vita utile/.test(a)));
  assert.equal(c.confidence, 'missing');
});

test('senza prezzo dell\'energia si avvisa invece di usare una media nazionale', () => {
  const c = M.daCatalogo(P2, {});
  assert.equal(c.energyCostPerHour, 0);
  assert.ok(c.avvisi.some((a) => /bolletta/.test(a)));
});

test('la confidenza complessiva è la peggiore delle sue parti', () => {
  const completa = M.daCatalogo({ ...P2, measuredPowerW: 118, residualValue: 300 }, { kwhPrice: 0.28 });
  assert.equal(completa.confidence, 'declared', 'la vita utile resta dichiarata, non misurata');
  const stimata = M.daCatalogo({ ...P2, kw: 0, w: 250 }, { kwhPrice: 0.28 });
  assert.equal(stimata.confidence, 'estimated', 'con la sola targa il conto è al più stimato');
});

/* ── Il confronto ───────────────────────────────────────────────────────── */

test('il costo orario ribalta il confronto fatto sul prezzo di listino', () => {
  /* Una fibra da 1 699 € con 50 000 ore costa meno all'ora di un diodo da
     499 € con 2 000: è il conto che nessuno fa guardando il listino. */
  const fibra = { id: 'f1u', model: 'F1 Ultra', price: 1699, life_h: 50000, kw: 0.070, maint: 0.02 };
  const diodo = { id: 'd1pro', model: 'D1 Pro', price: 499, life_h: 2000, kw: 0.050, maint: 0.03 };
  const ordine = M.confronta([diodo, fibra], { kwhPrice: 0.28 });
  assert.equal(ordine[0].id, 'f1u', 'la più cara da comprare è la più economica da usare');
  assert.ok(ordine[0].machineCostPerHour < ordine[1].machineCostPerHour);
  assert.ok(ordine[0].acquisto > ordine[1].acquisto);
});

test('la composizione dice quale voce domina', () => {
  const c = M.daCatalogo(P2, { kwhPrice: 0.28 });
  const somma = Object.values(c.composizione).reduce((a, b) => a + b, 0);
  assert.ok(vicino(somma, 100, 0.01));
  assert.ok(c.composizione.ammortamento > c.composizione.energia,
    'su una macchina da 2 499 € e 6 000 ore l\'ammortamento domina la corrente');
});
