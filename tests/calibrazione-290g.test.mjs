/**
 * calibrazione-290g.test.mjs — il caso di riferimento, per sempre.
 *
 * PLA · 290 g · 9 h 57 m · 1 pezzo, con tre prezzi al chilo. È il caso su cui
 * è nata tutta questa serie di correzioni: qui viene fissato voce per voce,
 * così che il giorno in cui un numero si muove si sappia **quale** e **di
 * quanto**, invece di scoprirlo da un preventivo sbagliato.
 *
 * I valori attesi non sono scritti a mano: sono ricalcolati dalle stesse
 * grandezze dichiarate qui sopra. Scriverli a mano avrebbe fissato il
 * risultato di oggi, non la formula — e un test che copia l'output non
 * accorge mai di un errore, lo certifica.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, console });
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), contesto);
const E = contesto.InglyCostEngine;

/* ── Il caso, dichiarato una volta ──────────────────────────────────────── */
const ORE = 9 + 57 / 60;          // 9 h 57 m — non «10», e non «9,95» arrotondato
const GRAMMI = 290;
const CASO = (prezzoKg) => ({
  tecnologia: 'print3d', livelloCosto: 'completo',
  grams: GRAMMI, hours: ORE, qty: 1,
  spoolPrice: prezzoKg, spoolGrams: 1000,
  watt: 150, dutyCycle: 0.6, kwhPrice: 0.28,
  machinePrice: 400, machineLifeHours: 2000, residualValue: 0,
  maintenancePerHour: 0.12,
  failureRate: 7,
  laborPerHour: 18, setupMin: 15, finishMin: 10, washCureMin: 0,
  materialWasteRate: 0,
  hardware: [], packagingItems: [],
});

const PREZZI = [15.99, 20, 24];
const vicino = (a, b, t = 0.005) => assert.ok(Math.abs(a - b) < t, `${a} ≠ ${b}`);
const voce = (r, id) => (r.perPezzo.voci.find((v) => v.id === id) || { value: 0 }).value;

/* ── Le voci, una per una, per i tre prezzi ─────────────────────────────── */

for (const p of PREZZI) {
  test(`290 g · 9 h 57 m · € ${p}/kg — ogni voce è quella che dichiara`, () => {
    const r = E.calcola(CASO(p));

    /* materiale = grammi/1000 × €/kg */
    vicino(voce(r, 'materiale'), (GRAMMI / 1000) * p);

    /* energia = W/1000 × ore × ciclo × €/kWh */
    vicino(voce(r, 'energia'), (150 / 1000) * ORE * 0.6 * 0.28);

    /* ammortamento = (prezzo − residuo)/vita × ore */
    vicino(voce(r, 'macchina'), ((400 - 0) / 2000) * ORE);

    /* manutenzione = €/h × ore */
    vicino(voce(r, 'manutenzione'), 0.12 * ORE);

    /* finitura = min/60 × €/h — e NON le ore di stampa */
    vicino(voce(r, 'finitura'), (10 / 60) * 18);

    /* avviamento: una tantum, diviso per la quantità */
    vicino(r.unaTantum.perPezzo, (15 / 60) * 18);

    /* scarto = perdibile × t/(1−t), non il 7% del totale */
    const perdibile = voce(r, 'materiale') + voce(r, 'energia') + voce(r, 'macchina') + voce(r, 'manutenzione');
    vicino(voce(r, 'scarto'), perdibile * (0.07 / 0.93));

    /* nessun consumabile, nessuna ferramenta, nessuna confezione dichiarati */
    vicino(voce(r, 'postProcesso'), 0);
    vicino(voce(r, 'hardware'), 0);
    vicino(voce(r, 'packaging'), 0);
    assert.equal(r.overhead, 0);

    /* il costo vero è la somma delle voci più la quota una tantum */
    const somma = r.perPezzo.voci.reduce((s, v) => s + v.value, 0) + r.unaTantum.perPezzo;
    vicino(r.costoPezzo, somma);
  });
}

test('cambiare il prezzo al chilo muove SOLO il materiale (e lo scarto che lo contiene)', () => {
  const a = E.calcola(CASO(15.99));
  const b = E.calcola(CASO(24));
  for (const id of ['energia', 'macchina', 'manutenzione', 'finitura']) {
    vicino(voce(a, id), voce(b, id));
  }
  vicino(a.unaTantum.perPezzo, b.unaTantum.perPezzo);
  vicino(voce(b, 'materiale') - voce(a, 'materiale'), (GRAMMI / 1000) * (24 - 15.99));
  assert.ok(voce(b, 'scarto') > voce(a, 'scarto'), 'lo scarto contiene il materiale, quindi si muove con lui');
});

test('9 h 57 m non è 10 h: la differenza è misurabile e voluta', () => {
  const preciso = E.calcola(CASO(24));
  const arrotondato = E.calcola({ ...CASO(24), hours: 10 });
  assert.ok(arrotondato.costoPezzo > preciso.costoPezzo);
  /* Su un pezzo sono centesimi; su cento pezzi è la ragione per cui il campo
     accetta ore e minuti separati. */
  vicino(arrotondato.costoPezzo - preciso.costoPezzo,
    ((10 - ORE) * ((400 / 2000) + 0.12 + (150 / 1000) * 0.6 * 0.28)) / 0.93, 0.01);
});

/* ── Le quattro posizioni commerciali ───────────────────────────────────── */

const POSIZIONI = [['competitive', 25], ['standard', 40], ['premium', 60], ['luxury', 80]];

for (const p of PREZZI) {
  test(`€ ${p}/kg — ogni posizione ottiene il margine che dichiara`, () => {
    const costo = E.calcola(CASO(p)).costoPezzo;
    for (const [id, m] of POSIZIONI) {
      const pol = E.politiche({}).find((x) => x.id === id);
      assert.equal(pol.marginTarget, m, `${id} deve puntare al ${m}%`);

      const pr = E.prezzo(costo, { strategia: 'margine', marginePct: m, ivaPct: 22 });

      /* netto = costo / (1 − m) */
      vicino(pr.netto, costo / (1 - m / 100));
      /* profitto = netto − costo */
      vicino(pr.profittoLordo, pr.netto - costo);
      /* margine = profitto / netto */
      vicino(pr.marginePct, m, 0.0001);
      /* ricarico = profitto / costo — l'altra lettura, mai confusa */
      vicino(pr.ricaricoPct, (pr.netto / costo - 1) * 100, 0.0001);
      /* IVA sul netto, lordo = netto + IVA */
      vicino(pr.iva, pr.netto * 0.22);
      vicino(pr.lordo, pr.netto + pr.iva);
      /* e l'IVA non entra mai nel costo */
      vicino(E.calcola(CASO(p)).costoPezzo, costo);
    }
  });
}

test('i prezzi crescono con il margine, per tutti e tre i prezzi al chilo', () => {
  for (const p of PREZZI) {
    const costo = E.calcola(CASO(p)).costoPezzo;
    const netti = POSIZIONI.map(([, m]) => E.prezzo(costo, { strategia: 'margine', marginePct: m, ivaPct: 0 }).netto);
    for (let i = 1; i < netti.length; i++) assert.ok(netti[i] > netti[i - 1]);
  }
});

/* ── Il conto con i numeri dentro ───────────────────────────────────────── */

test('ogni voce sa dire il proprio conto, con i numeri e non con i simboli', () => {
  const x = E.explain(CASO(15.99), { marginePct: 40, ivaPct: 22 });
  const mat = x.lines.find((r) => r.id === 'materiale');
  assert.ok(mat.conti, 'la voce materiale non dichiara il proprio conto');
  assert.match(mat.conti, /290 g/);
  assert.match(mat.conti, /15[.,]99/);
  assert.match(mat.conti, /= € 4[.,]64/);

  const ene = x.lines.find((r) => r.id === 'energia');
  assert.match(ene.conti, /kWh/);
  assert.match(ene.conti, /0[.,]28/);
});

test('il conto dichiarato coincide con il valore della voce', () => {
  /* Se il conto raccontasse un'altra moltiplicazione sarebbe peggio di non
     averlo: darebbe fiducia a un numero sbagliato. */
  const x = E.explain(CASO(20), { marginePct: 40, ivaPct: 0 });
  for (const r of x.lines) {
    if (!r.conti) continue;
    const m = r.conti.match(/= €\s*(-?[\d.]+)$/);
    if (!m) continue;
    vicino(parseFloat(m[1]), Math.round((r.value ?? r.result ?? 0) * 100) / 100, 0.011);
  }
});
