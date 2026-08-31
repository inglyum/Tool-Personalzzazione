/**
 * cost-engine-provenienza.test.mjs — ogni numero dice da dove viene.
 *
 * Prima di questa fase il motore restituiva costi corretti e muti. Un €/kg
 * inserito una volta e un €/kg letto dal magazzino uscivano identici, e un
 * consumo stimato dalla potenza di targa aveva lo stesso aspetto di uno letto
 * da un contatore. Il difetto non era nei numeri: era che non c'era modo di
 * chiedere loro conto, e quindi nessuna ragione di migliorarli.
 *
 * Qui si prova che la domanda ha una risposta.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite });
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), contesto);
const E = contesto.InglyCostEngine;

const BASE = {
  tecnologia: 'print3d', grams: 290, hours: 9.95, qty: 1,
  spoolPrice: 24, spoolGrams: 1000, kwhPrice: 0.28,
  machinePrice: 400, machineLifeHours: 2000, maintenancePerHour: 0.12,
  laborPerHour: 18, setupMin: 15, finishMin: 10,
};
const vicino = (a, b, t = 0.001) => Math.abs(a - b) < t;

/* ── L'energia ──────────────────────────────────────────────────────────── */

test('la priorità dell\'energia è misurato → medio → targa', () => {
  const tutti = { ...BASE, watt: 150, dutyCycle: 0.6, averagePowerW: 90, measuredEnergyKwh: 1.2 };
  assert.equal(E.calcola(tutti).energia.modo, 'misurato');
  const senzaMisura = { ...tutti }; delete senzaMisura.measuredEnergyKwh;
  assert.equal(E.calcola(senzaMisura).energia.modo, 'medio');
  const soloTarga = { ...senzaMisura }; delete soloTarga.averagePowerW;
  assert.equal(E.calcola(soloTarga).energia.modo, 'targa');
});

test('il ciclo di lavoro si applica alla targa e non al misurato', () => {
  /* Un contatore ha già contato le pause: applicargli il ciclo lo
     abbasserebbe due volte. */
  const m = E.calcola({ ...BASE, measuredEnergyKwh: 1, dutyCycle: 0.5 });
  assert.ok(vicino(m.energia.kwh, 1), `kWh misurati alterati: ${m.energia.kwh}`);
  const t = E.calcola({ ...BASE, watt: 200, dutyCycle: 0.5 });
  assert.ok(vicino(t.energia.kwh, (200 / 1000) * 9.95 * 0.5));
});

test('150 W di targa al 60% e 90 W medi danno lo stesso consumo, con confidenze diverse', () => {
  const t = E.calcola({ ...BASE, watt: 150, dutyCycle: 0.6 });
  const m = E.calcola({ ...BASE, averagePowerW: 90 });
  assert.ok(vicino(t.energia.kwh, m.energia.kwh), 'il consumo è lo stesso');
  assert.equal(t.energia.confidence, 'estimated');
  assert.equal(m.energia.confidence, 'verified');
});

test('il dettaglio dice quale dato sta usando', () => {
  /* Il difetto misurato in Fase 1: a schermo compariva «150 W × 9.95 h», e il
     coefficiente 0,6 che divideva quel numero non compariva da nessuna parte.
     Chi legge non poteva sapere di guardare una stima. */
  const t = E.calcola({ ...BASE, watt: 150, dutyCycle: 0.6 });
  assert.match(t.energia.detail, /targa/);
  assert.match(t.energia.detail, /ciclo/);
  assert.match(E.calcola({ ...BASE, measuredEnergyKwh: 1.2 }).energia.detail, /misurat/);
});

test('senza dato di consumo l\'energia è zero e lo dichiara', () => {
  const r = E.calcola({ ...BASE });
  assert.equal(r.energia.modo, 'assente');
  assert.equal(r.energia.kwh, 0);
  assert.ok(r.assunzioni.some((a) => a.id === 'energia'));
});

/* ── La provenienza ─────────────────────────────────────────────────────── */

test('una fonte dichiarata sopravvive fino al risultato', () => {
  const r = E.calcola({ ...BASE, watt: 150, fonti: { materiale: 'inventario' } });
  const m = r.provenienza.find((p) => p.id === 'materiale');
  assert.equal(m.source, 'inventario');
  assert.equal(m.confidence, 'verified');
});

test('un valore soltanto inserito resta «declared», non diventa verificato', () => {
  const r = E.calcola({ ...BASE, watt: 150 });
  assert.equal(r.provenienza.find((p) => p.id === 'macchina').confidence, 'declared');
});

test('la confidenza complessiva è la peggiore delle sue parti', () => {
  /* Un preventivo non è più solido della sua voce più incerta: fare la media
     sarebbe un modo elegante di nascondere il punto debole. */
  const stimato = E.calcola({ ...BASE, watt: 150, dutyCycle: 0.6,
    fonti: { materiale: 'inventario', macchina: 'macchina', manutenzione: 'macchina',
             finitura: 'impostazioni', setup: 'impostazioni' } });
  assert.equal(E.explain(stimato.vuoto ? {} : { ...BASE, watt: 150, dutyCycle: 0.6,
    fonti: { materiale: 'inventario' } }).confidence, 'estimated',
  'con l\'energia stimata dalla targa, tutto il preventivo è al più «estimated»');

  const misurato = E.explain({ ...BASE, measuredEnergyKwh: 1.2,
    fonti: { materiale: 'inventario', macchina: 'macchina', manutenzione: 'macchina',
             finitura: 'impostazioni', setup: 'impostazioni', energia: 'misurato' } });
  assert.ok(['measured', 'verified', 'declared'].includes(misurato.confidence),
    `con tutte le fonti dichiarate non deve restare «estimated», è «${misurato.confidence}»`);
});

/* ── Le ipotesi ─────────────────────────────────────────────────────────── */

test('uno scarto a zero è un\'ipotesi dichiarata, non un silenzio', () => {
  const r = E.calcola({ ...BASE, watt: 150 });
  assert.ok(r.assunzioni.some((a) => a.id === 'scarto'),
    'nessuno scarto configurato deve comparire fra le ipotesi');
  const conScarto = E.calcola({ ...BASE, watt: 150, failureRate: 7 });
  assert.ok(!conScarto.assunzioni.some((a) => a.id === 'scarto'));
});

test('con più pezzi si dichiara che l\'avviamento si divide', () => {
  const r = E.calcola({ ...BASE, watt: 150, qty: 10 });
  assert.ok(r.assunzioni.some((a) => a.id === 'setup' && /10 pezzi/.test(a.testo)));
});

/* ── Il livello materiale ───────────────────────────────────────────────── */

test('il livello materiale conta il filamento e nient\'altro', () => {
  const r = E.calcola({ ...BASE, watt: 150, dutyCycle: 0.6, failureRate: 7, livelloCosto: 'materiale' });
  assert.ok(vicino(r.costoPezzo, 0.290 * 24, 0.001), `€${r.costoPezzo.toFixed(3)}`);
});

test('i livelli crescono, non si sovrappongono', () => {
  const c = { ...BASE, watt: 150, dutyCycle: 0.6, failureRate: 7 };
  const v = ['materiale', 'stampa', 'macchina', 'completo']
    .map((l) => E.calcola({ ...c, livelloCosto: l }).costoPezzo);
  for (let n = 1; n < v.length; n++) {
    assert.ok(v[n] >= v[n - 1] - 1e-9, `il livello ${n} (€${v[n].toFixed(2)}) è sotto il precedente (€${v[n - 1].toFixed(2)})`);
  }
});

test('il livello predefinito non è cambiato', () => {
  /* Cambiarlo sposterebbe in silenzio il prezzo di ogni preventivo esistente.
     Il livello materiale si **aggiunge**, non prende il posto di nessuno. */
  const c = { ...BASE, watt: 150, dutyCycle: 0.6, failureRate: 7 };
  assert.ok(vicino(E.calcola(c).costoPezzo, E.calcola({ ...c, livelloCosto: 'completo' }).costoPezzo, 1e-9));
});

/* ── Le tre posizioni di prezzo ─────────────────────────────────────────── */

test('minimo, consigliato e premium sono tre margini, non tre moltiplicatori', () => {
  const p = E.prezziConsigliati(100, { marginePct: 40, ivaPct: 0 });
  const per = (id) => p.find((x) => x.id === id);
  assert.ok(vicino(per('minimo').netto, 100 / 0.9, 0.01), 'minimo al 10%');
  assert.ok(vicino(per('consigliato').netto, 500 / 3, 0.01), 'consigliato al 40% = 166,67');
  assert.ok(vicino(per('premium').netto, 100 / 0.4, 0.01), 'premium al 60% = 250');
});

test('le tre posizioni sono ordinate e configurabili', () => {
  const p = E.prezziConsigliati(100, { margineMinimoPct: 15, marginePct: 35, marginePremiumPct: 55, ivaPct: 0 });
  /* Gli array che escono dal vm sono di un altro realm: si confrontano i
     valori, non i prototipi. */
  assert.equal(p.map((x) => x.marginePct).join(','), '15,35,55');
  assert.ok(p[0].netto < p[1].netto && p[1].netto < p[2].netto);
});

test('lo sconto non entra nelle posizioni consigliate', () => {
  /* Sono posizioni, non offerte: uno sconto le renderebbe irriconoscibili. */
  const senza = E.prezziConsigliati(100, { marginePct: 40, ivaPct: 0 });
  const con = E.prezziConsigliati(100, { marginePct: 40, ivaPct: 0, scontoPct: 20 });
  assert.ok(vicino(senza[1].netto, con[1].netto));
});

/* ── L'output completo ──────────────────────────────────────────────────── */

test('explain restituisce tutti i livelli, le fonti e il confronto con lo slicer', () => {
  const x = E.explain({ ...BASE, watt: 150, dutyCycle: 0.6, failureRate: 7,
    slicerMaterialCost: 4.50 }, { marginePct: 40, ivaPct: 22 });
  assert.equal(x.costLevels.length, Object.keys(E.LIVELLI).length);
  assert.equal(x.costLevel, 'completo');
  assert.ok(x.sources.length > 0);
  assert.ok(x.energyMode && x.energyMode.modo === 'targa');
  assert.equal(x.recommendedPrices.length, 3);
  assert.ok(x.comparisonWithSlicer && x.comparisonWithSlicer.confrontabile);
  assert.equal(x.comparisonWithSlicer.causa.tipo, 'prezzo materiale');
});

test('senza un riferimento slicer il confronto è nullo, non inventato', () => {
  const x = E.explain({ ...BASE, watt: 150 }, { marginePct: 40 });
  assert.equal(x.comparisonWithSlicer, null);
});

/* ── Le cinque posizioni commerciali ────────────────────────────────────── */

test('le posizioni commerciali sono ordinate per margine', () => {
  /* Sette, dopo il benchmark: ingrosso e «su misura» si sono aggiunte alle
     cinque. La scala deve salire — una scala che non sale confonde — e «su
     misura» ne sta fuori di proposito, perché non ha un margine proprio:
     prende quello impostato dall'utente. */
  const p = E.politiche();
  assert.equal(p.map((x) => x.id).join(','), 'wholesale,competitive,b2b,standard,premium,luxury,custom');
  const scala = p.filter((x) => !x.apertaAllUtente).map((x) => x.marginTarget);
  for (let i = 1; i < scala.length; i++) assert.ok(scala[i] > scala[i - 1], `${scala[i - 1]} → ${scala[i]}`);
  assert.equal(p.filter((x) => x.recommended).length, 1);
  assert.equal(p.find((x) => x.recommended).id, 'standard');
});

test('il B2B è un margine, non uno sconto', () => {
  /* Uno sconto percentuale nasconde il punto in cui il volume smette di
     compensare il margine più basso; un margine lo tiene sotto gli occhi. */
  const b = E.politiche().find((x) => x.id === 'b2b');
  assert.ok(b.marginTarget > 0 && b.marginTarget < 40);
  assert.ok(b.floorMargin >= E.MARGINE_MINIMO);
});

test('i margini sono riconfigurabili e il pavimento resta', () => {
  const p = E.politiche({ standard: 55, b2b: { marginTarget: 22, label: 'Rivenditori' } });
  assert.equal(p.find((x) => x.id === 'standard').marginTarget, 55);
  assert.equal(p.find((x) => x.id === 'b2b').label, 'Rivenditori');
  /* Nessuna configurazione può portare una politica sotto il minimo. */
  const sotto = E.politiche({ competitive: 2 });
  assert.equal(sotto.find((x) => x.id === 'competitive').marginTarget, E.MARGINE_MINIMO);
});

test('una configurazione parziale non azzera le altre', () => {
  const p = E.politiche({ luxury: 80 });
  assert.equal(p.find((x) => x.id === 'standard').marginTarget, E.POLITICHE.standard.marginTarget);
  assert.equal(p.find((x) => x.id === 'luxury').marginTarget, 80);
});
