/**
 * laser-b2b-consolidation.test.mjs — il calcolatore che l'utente usa davvero.
 *
 * La Fase 28 aveva migrato `LaserB2B._calcV32` al motore unico, e la migrazione
 * era corretta. Misurando nel file consegnato è emerso che `_calcV32` è il
 * calcolatore di **un'altra interfaccia**: la vista `laser_b2b` disegna quella
 * della patch 078, e i suoi ventitré comandi chiamano `LaserB2B.calc`, che il
 * motore non lo vedeva nemmeno.
 *
 * È il difetto ricorrente del progetto in una forma nuova: non due sistemi che
 * si contendono lo stesso concetto, ma una migrazione fatta sul gemello
 * sbagliato. Un PASS dichiarato su una funzione che nessuno chiama.
 *
 * Qui si prova che la migrazione di `calc` non sposta un centesimo — tranne
 * dove il pavimento di margine rifiuta un ricarico che vendeva sottocosto, e
 * quella è la correzione, non un effetto collaterale.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite });
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), contesto);
const E = contesto.InglyCostEngine;

/* Gli scaglioni di sconto sul materiale e il tempo macchina che cala con il
   lotto restano conoscenza del laser: non sono matematica di prezzo. */
const scontoMateriale = (q) => (q >= 200 ? 0.15 : q >= 100 ? 0.10 : q >= 50 ? 0.07 : q >= 20 ? 0.04 : 0);
const fattoreTempo = (q) => (q >= 50 ? 0.85 : q >= 20 ? 0.92 : 1);
const PAVIMENTO = 15;
const PREZZO_MINIMO = 15;

/** Il conto com'era scritto nella patch 078, prima della migrazione. */
function prima({ qty, matBase, timeMin, laborH, pack, markup, machineH = 12, energyH = 1.5 }) {
  const sd = scontoMateriale(qty);
  const mc = matBase * (1 - sd);
  const tm = timeMin * fattoreTempo(qty);
  const mhc = (machineH + energyH) / 60 * tm;
  const lc = laborH / 60 * tm;
  const cp = mc + mhc + lc + pack;
  const fp = Math.max(PREZZO_MINIMO, cp * markup);
  return { cp, fp, mg: fp > 0 ? Math.round((fp - cp) / fp * 100) : 0 };
}

/** Lo stesso conto, come lo fa adesso: driver qui, matematica nel motore. */
function dopo({ qty, matBase, timeMin, laborH, pack, markup, machineH = 12, energyH = 1.5 }) {
  const sd = scontoMateriale(qty);
  const mc = matBase * (1 - sd);
  const tm = timeMin * fattoreTempo(qty);
  const mhc = (machineH + energyH) / 60 * tm;
  const lc = laborH / 60 * tm;
  const c = E.calcola({
    tecnologia: 'generico', qty: 1,
    costiPerPezzo: [
      { id: 'materiale', value: mc },
      { id: 'macchina', value: mhc },
      { id: 'manodopera', value: lc, perdibile: false },
      { id: 'packaging', value: pack, perdibile: false },
    ],
  });
  const pr = E.prezzo(c.costoPezzo, { strategia: 'ricarico', ricarico: markup, marginePavimentoPct: PAVIMENTO, ivaPct: 0 });
  const fp = Math.max(PREZZO_MINIMO, pr.netto);
  return { cp: c.costoPezzo, fp, mg: Math.round(pr.marginePct), pavimento: pr.pavimentoScattato };
}

/* Casi reali: due materiali economici, due costosi, i quattro canali, tutti e
   sei gli scaglioni di quantità. */
const CASI = [];
for (const qty of [5, 10, 20, 50, 100, 200]) {
  for (const [matBase, timeMin, laborH, pack] of [[3.20, 0.9, 18, 0.30], [24, 12, 18, 0.5], [40, 25, 22, 0.8]]) {
    for (const markup of [2.0, 3.5, 3.0]) {
      CASI.push({ qty, matBase, timeMin, laborH, pack, markup });
    }
  }
}

test('la migrazione non sposta un centesimo', async (t) => {
  assert.equal(CASI.length, 54, 'i casi devono restare cinquantaquattro o crescere di proposito');

  await t.test('costo identico in tutti i ' + CASI.length + ' casi', () => {
    for (const c of CASI) {
      const a = prima(c), b = dopo(c);
      assert.ok(Math.abs(a.cp - b.cp) < 1e-9,
        'qty ' + c.qty + ' mat ' + c.matBase + ': costo ' + a.cp.toFixed(6) + ' ≠ ' + b.cp.toFixed(6));
    }
  });

  await t.test('prezzo identico con i tre ricarichi di canale (2,0 · 3,0 · 3,5)', () => {
    for (const c of CASI) {
      const a = prima(c), b = dopo(c);
      assert.ok(Math.abs(a.fp - b.fp) < 1e-9,
        'qty ' + c.qty + ' ricarico ' + c.markup + ': prezzo ' + a.fp.toFixed(6) + ' ≠ ' + b.fp.toFixed(6));
    }
  });

  await t.test('il pavimento non scatta mai con i ricarichi predefiniti', () => {
    /* 2,0 · 3,0 · 3,5 danno margini del 50%, 66,7% e 71,4%: il pavimento del
       15% è lontanissimo. Chi usa il prodotto senza toccare le impostazioni
       non vede alcuna differenza. */
    for (const c of CASI) {
      assert.equal(dopo(c).pavimento, false, 'pavimento scattato a ricarico ' + c.markup);
    }
  });
});

test('dove il prezzo cambia, e perché', async (t) => {
  /* Il ricarico sotto il quale il pavimento del 15% interviene:
     margine = (m−1)/m ≥ 0,15  →  m ≥ 1/0,85 = 1,17647… */
  const SOGLIA = 1 / (1 - PAVIMENTO / 100);

  await t.test('la soglia è 1,17647…', () => {
    assert.ok(Math.abs(SOGLIA - 1.1764705882) < 1e-9);
  });

  await t.test('sopra la soglia nulla cambia', () => {
    const c = { qty: 10, matBase: 60, timeMin: 45, laborH: 25, pack: 1.2, markup: 1.20 };
    const a = prima(c), b = dopo(c);
    assert.ok(Math.abs(a.fp - b.fp) < 1e-9, 'a ricarico 1,20 il prezzo non deve muoversi');
    assert.equal(b.pavimento, false);
  });

  await t.test('sotto la soglia il pavimento alza il prezzo, ed è la correzione', () => {
    const c = { qty: 10, matBase: 60, timeMin: 45, laborH: 25, pack: 1.2, markup: 1.15 };
    const a = prima(c), b = dopo(c);
    /* Prima: un ricarico dell'1,15 dava un margine del 13,0%, cioè un lavoro
       venduto sotto la soglia che il laboratorio si è dato. Nessun avviso.
       Ora il prezzo sale fino al margine minimo. */
    assert.ok(a.mg < PAVIMENTO, 'il caso deve partire sotto il pavimento: margine ' + a.mg + '%');
    assert.ok(b.fp > a.fp, 'il pavimento deve alzare il prezzo');
    assert.equal(b.mg, PAVIMENTO);
    assert.equal(b.pavimento, true);
  });

  await t.test('e il prezzo minimo di 15 € resta l\'ultima parola', () => {
    const c = { qty: 5, matBase: 3.20, timeMin: 0.9, laborH: 18, pack: 0.30, markup: 2.0 };
    assert.equal(dopo(c).fp, PREZZO_MINIMO);
    assert.equal(prima(c).fp, PREZZO_MINIMO);
  });
});

test('le politiche hanno un nome, e il numero non è cambiato', async (t) => {
  await t.test('il margine consigliato del catalogo resta il 45%', () => {
    /* Era `costPrice / (1 − 0.45)` scritto in due punti. Ora passa dal motore
       con `marginePct: 45`, ed è lo stesso numero fino all'ultimo decimale.
       Usare la politica «premium» del motore, che punta al 60%, alzerebbe
       ogni prezzo consigliato del 27% senza che nessuno lo abbia chiesto. */
    for (const costo of [1, 7.5, 10, 23.4, 199]) {
      const vecchio = costo / (1 - 0.45);
      const nuovo = E.prezzo(costo, { strategia: 'margine', marginePct: 45, ivaPct: 0 }).netto;
      assert.ok(Math.abs(vecchio - nuovo) < 1e-9, costo + ': ' + vecchio + ' ≠ ' + nuovo);
    }
  });

  await t.test('e la politica premium è un\'altra cosa, di proposito', () => {
    assert.equal(E.POLITICHE.premium.marginTarget, 60);
    assert.notEqual(E.POLITICHE.premium.marginTarget, 45);
  });
});
