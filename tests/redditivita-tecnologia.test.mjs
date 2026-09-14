/**
 * redditivita-tecnologia.test.mjs — quanto rende ogni tecnologia, senza raddoppiare.
 *
 * Il difetto che questi test esistono per rendere impossibile: un ordine
 * laser+UV da 150 € contato in entrambe le tecnologie fa dire al grafico che
 * l'azienda ha fatturato 300. Basta un `forEach` sulle tecnologie invece che
 * sugli ordini, ed è fatta.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['cost-engine.js', 'order-snapshot.js', 'order-fields.js', 'order-economics.js',
                 'production-model.js', 'redditivita-tecnologia.js']) {
  vm.runInContext(fs.readFileSync('src/product/' + f, 'utf8'), sandbox);
}
const R = sandbox.window.InglyRedditivitaTecnologia;

const ordine = (id, tecnologie, netto, costo, reale) => {
  const o = { id, totalNet: netto, economic: { revenueNet: netto } };
  if (costo != null) o.economic.costTotal = costo;
  if (tecnologie) o.production = { primaryTechnology: tecnologie[0], technologies: tecnologie, isMixed: tecnologie.length > 1 };
  if (reale != null) o.currentPricing = { totals: { costoTotale: reale } };
  return o;
};

test('il modulo si espone', () => {
  assert.ok(R);
  assert.equal(typeof R.per, 'function');
});

/* ══ IL TEST CHE CONTA PIÙ DI TUTTI ═══════════════════════════════════════ */

test('un ordine misto da 150 non diventa 300', () => {
  const e = R.per([ordine(1, ['laser', 'uv'], 150, 60)]);
  assert.equal(e.totali.ricavo, 150, 'il ricavo aggregato deve restare 150');
  assert.equal(e.righe.length, 1, 'una riga sola, non due');
  assert.equal(e.righe[0].id, 'misto');
  assert.equal(e.righe[0].ricavo, 150);
});

test('e la somma delle righe è sempre il fatturato vero', () => {
  const ordini = [
    ordine(1, ['laser'], 100, 40),
    ordine(2, ['uv'], 200, 80),
    ordine(3, ['laser', 'uv'], 150, 60),
    ordine(4, ['laser', '3d', 'uv'], 300, 100),
    ordine(5, null, 50, 20),
  ];
  const e = R.per(ordini);
  const somma = e.righe.reduce((a, r) => a + r.ricavo, 0);
  assert.equal(somma, 800, 'somma righe');
  assert.equal(e.totali.ricavo, 800, '100+200+150+300+50 = 800');
});

test('i misti finiscono in una categoria loro, non spariscono', () => {
  const e = R.per([ordine(1, ['laser'], 100, 40), ordine(2, ['laser', 'uv'], 150, 60)]);
  const misto = e.righe.find((r) => r.id === 'misto');
  assert.ok(misto, 'i misti devono essere visibili, non nascosti');
  assert.equal(misto.ricavo, 150);
  assert.equal(e.misti, 1);
  const laser = e.righe.find((r) => r.id === 'laser');
  assert.equal(laser.ricavo, 100, 'il laser puro non eredita il misto');
});

/* ══ L'aggregazione ═══════════════════════════════════════════════════════ */

test('ordini, ricavo, costo, profitto e margine per tecnologia', () => {
  const e = R.per([ordine(1, ['laser'], 100, 40), ordine(2, ['laser'], 200, 60)]);
  const laser = e.righe[0];
  assert.equal(laser.ordini, 2);
  assert.equal(laser.ricavo, 300);
  assert.equal(laser.costo, 100);
  assert.equal(laser.profitto, 200);
  assert.equal(Math.round(laser.marginePct), 67);
});

test('le righe si ordinano per ricavo', () => {
  const e = R.per([ordine(1, ['laser'], 100, 40), ordine(2, ['uv'], 500, 200)]);
  assert.equal(e.righe[0].id, 'uv');
});

test('un ordine senza tecnologia va in «non dichiarata», non sparisce', () => {
  const e = R.per([ordine(1, null, 100, 40)]);
  assert.equal(e.righe[0].id, 'sconosciuta');
  assert.equal(e.righe[0].ricavo, 100);
});

test('un ordine legacy con la tecnologia in un campo storico si aggrega', () => {
  const e = R.per([{ id: 1, totalNet: 100, technology: 'print3d', economic: { revenueNet: 100, costTotal: 40 } }]);
  assert.equal(e.righe[0].id, '3d');
});

/* ══ Quello che il modulo si rifiuta di fare ══════════════════════════════ */

test('un ordine senza ricavo non entra proprio', () => {
  const e = R.per([{ id: 1, name: 'muto' }, ordine(2, ['laser'], 100, 40)]);
  assert.equal(e.totali.ordini, 1);
  assert.equal(e.totali.ricavo, 100);
});

test('un ordine senza costo entra nel ricavo ma non nel profitto', () => {
  const e = R.per([ordine(1, ['laser'], 100, 40), ordine(2, ['laser'], 200, null)]);
  const laser = e.righe[0];
  assert.equal(laser.ricavo, 300, 'il ricavo si vede tutto');
  assert.equal(laser.profitto, 60, 'il profitto solo dove il costo è dichiarato');
  assert.equal(laser.copertura.ordiniSenzaCosto, 1);
});

test('e il margine si dichiara solo dove c è un costo', () => {
  const e = R.per([ordine(1, ['laser'], 100, null)]);
  assert.equal(e.righe[0].marginePct, null);
});

/* ══ Il consuntivo e lo scostamento ═══════════════════════════════════════ */

test('il costo reale produce lo scostamento', () => {
  /* Preventivato 60, reale 72: è costato 12 in più. */
  const e = R.per([ordine(1, ['laser'], 150, 60, 72)]);
  const laser = e.righe[0];
  assert.equal(laser.costoReale, 72);
  assert.equal(laser.scostamento, 12);
  assert.equal(laser.scostamentoNoto, true);
});

test('e senza consuntivo lo scostamento non si inventa', () => {
  const e = R.per([ordine(1, ['laser'], 150, 60)]);
  assert.equal(e.righe[0].scostamentoNoto, false);
  assert.equal(e.righe[0].scostamento, 0);
});

test('il ricavo non cambia mai per via del consuntivo', () => {
  /* Il prezzo promesso al cliente non si tocca: cambia solo il costo. */
  const e = R.per([ordine(1, ['laser'], 150, 60, 300)]);
  assert.equal(e.righe[0].ricavo, 150);
  assert.equal(e.righe[0].scostamento, 240);
});

/* ══ I bordi ══════════════════════════════════════════════════════════════ */

test('un elenco vuoto non produce numeri', () => {
  const e = R.per([]);
  assert.equal(e.righe.length, 0);
  assert.equal(e.totali.ricavo, 0);
  assert.equal(e.totali.ordini, 0);
});

test('niente al posto degli ordini non lancia', () => {
  assert.equal(R.per(null).righe.length, 0);
  assert.equal(R.per(undefined).totali.ordini, 0);
});

test('un ordine in perdita resta in perdita', () => {
  const e = R.per([ordine(1, ['laser'], 100, 150)]);
  assert.equal(e.righe[0].profitto, -50);
  assert.equal(Math.round(e.righe[0].marginePct), -50);
});
