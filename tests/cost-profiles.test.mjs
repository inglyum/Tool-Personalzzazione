/**
 * cost-profiles.test.mjs — manodopera, spese generali, imballo.
 *
 * Tre regole che questo modulo esiste per rendere strutturali, e che si
 * verificano qui perché una regola che vive solo in un commento prima o poi
 * viene aggirata:
 *
 *   1. il costo interno di un'ora non è la tariffa che si fa pagare;
 *   2. le tre modalità di spese generali non si sommano mai fra loro;
 *   3. l'imballo per ordine si divide per la quantità prima di entrare nel
 *      costo del pezzo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/product/cost-profiles.js', 'utf8'), sandbox);
const P = sandbox.window.InglyCostProfiles;

test('il modulo si espone', () => {
  assert.ok(P, 'InglyCostProfiles non è definito');
  assert.equal(typeof P.ingresso, 'function');
});

/* ── MANODOPERA ─────────────────────────────────────────────────────────── */

test('manodopera: costo interno e tariffa cliente restano due numeri diversi', () => {
  const op = P.manodopera(null, 'operatore');
  assert.ok(op.costoOrarioInterno > 0);
  assert.ok(op.tariffaCliente > op.costoOrarioInterno,
    'la tariffa al cliente deve essere superiore al costo interno, altrimenti non c\'è margine sul lavoro');
});

test('manodopera: senza profilo i valori sono predefiniti e lo dichiarano', () => {
  const op = P.manodopera(null, 'operatore');
  assert.equal(op.predefinito, true);
  assert.equal(op.confidence, 'estimated');
});

test('manodopera: con un profilo dichiarato la confidenza sale', () => {
  const op = P.manodopera([{ id: 'operatore', label: 'Mio operatore', costoOrarioInterno: 22, tariffaCliente: 45 }], 'operatore');
  assert.equal(op.predefinito, false);
  assert.equal(op.confidence, 'declared');
  assert.equal(op.costoOrarioInterno, 22);
});

test('manodopera: gli oneri si sommano alla retribuzione', () => {
  const op = P.manodopera([{ id: 'operatore', costoOrarioInterno: 20, oneriPct: 30 }], 'operatore');
  assert.equal(op.costoOrarioInterno, 26, '20 € più il 30% di oneri fa 26 €');
});

test('manodopera: le ore non produttive alzano il costo dell\'ora prodotta', () => {
  /* Pagato per 1600 ore, ne produce 1200: ogni ora prodotta costa un terzo in
     più di quanto dice la busta paga. È il numero che serve al preventivo. */
  const op = P.manodopera([{ id: 'operatore', costoOrarioInterno: 18, oreAnnue: 1600, oreProduttive: 1200 }], 'operatore');
  assert.equal(op.costoOrarioInterno, 24);
  assert.equal(op.suOreProduttive, true);
});

test('manodopera: ore produttive maggiori delle annue non riducono il costo', () => {
  const op = P.manodopera([{ id: 'operatore', costoOrarioInterno: 18, oreAnnue: 1200, oreProduttive: 1600 }], 'operatore');
  assert.equal(op.costoOrarioInterno, 18, 'un dato incoerente non deve produrre uno sconto');
  assert.equal(op.suOreProduttive, false);
});

test('manodopera: un ruolo sconosciuto non lascia il preventivo senza costo', () => {
  const op = P.manodopera(null, 'ruolo-che-non-esiste');
  assert.ok(op && op.costoOrarioInterno > 0);
});

/* ── SPESE GENERALI ─────────────────────────────────────────────────────── */

test('overhead: senza spese dichiarate esce zero, e lo dice', () => {
  const o = P.overhead(null);
  assert.equal(o.overheadPerHour, 0);
  assert.equal(o.confidence, 'missing');
  assert.match(o.avvisi.join(' '), /non configurate/i);
});

test('overhead: a ora si ripartisce sulle ore produttive annue', () => {
  const o = P.overhead({
    modo: 'ora', oreProduttiveAnnue: 1200,
    voci: [{ id: 'affitto', mensile: 400 }, { id: 'software', mensile: 100 }],
  });
  assert.equal(o.mensile, 500);
  assert.equal(o.annuo, 6000);
  assert.equal(o.overheadPerHour, 5, '6000 € su 1200 ore fa 5 €/h');
});

test('overhead: le tre modalità non si sommano mai', () => {
  for (const modo of ['ora', 'lavoro', 'percento']) {
    const o = P.overhead({
      modo, oreProduttiveAnnue: 1200, lavoriAnnui: 300, percentuale: 15,
      voci: [{ id: 'affitto', mensile: 400 }],
    });
    const valorizzati = [o.overheadPerHour, o.overheadPerJob, o.overheadPct].filter((v) => v > 0);
    assert.equal(valorizzati.length, 1, `in modalità «${modo}» deve essere valorizzato un campo solo`);
  }
});

test('overhead: a lavoro si ripartisce sui lavori annui', () => {
  const o = P.overhead({ modo: 'lavoro', lavoriAnnui: 300, voci: [{ id: 'affitto', mensile: 500 }] });
  assert.equal(o.overheadPerJob, 20, '6000 € su 300 lavori fa 20 € a lavoro');
});

test('overhead: spese dichiarate senza il divisore non diventano un numero inventato', () => {
  const o = P.overhead({ modo: 'ora', voci: [{ id: 'affitto', mensile: 500 }] });
  assert.equal(o.overheadPerHour, 0);
  assert.equal(o.confidence, 'missing');
  assert.match(o.avvisi.join(' '), /non sono ripartibili/i);
});

test('overhead: la modalità «nessuno» azzera tutto senza avvisi di ripartizione', () => {
  const o = P.overhead({ modo: 'nessuno', voci: [{ id: 'affitto', mensile: 500 }] });
  assert.equal(o.overheadPerHour, 0);
  assert.equal(o.overheadPerJob, 0);
  assert.equal(o.overheadPct, 0);
});

/* ── IMBALLO ────────────────────────────────────────────────────────────── */

test('imballo: senza voci non inventa un costo', () => {
  const i = P.imballo(null, { quantita: 1 });
  /* `deepEqual` qui confronterebbe i prototipi: l'array nasce dentro la
     sandbox `vm` e non è lo stesso `Array` di questo file. Si guarda cosa
     contiene, che è la domanda vera. */
  assert.equal(i.packagingItems.length, 0);
  assert.equal(i.confidence, 'missing');
});

test('imballo: quello per pezzo si paga a ogni pezzo', () => {
  const i = P.imballo([{ id: 'sacchetto', label: 'Sacchetto', per: 'pezzo', costo: 0.05 }], { quantita: 10 });
  assert.equal(i.costoPerPezzo, 0.05);
  assert.equal(i.packagingItems[0].unitCost, 0.05);
});

test('imballo: quello per ordine si divide per la quantità', () => {
  const i = P.imballo([{ id: 'scatola', label: 'Scatola', per: 'ordine', costo: 0.60 }], { quantita: 10 });
  assert.equal(i.costoPerPezzo, 0.06, 'una scatola da 60 cent su 10 pezzi fa 6 cent a pezzo');
  assert.equal(i.packagingItems[0].unitCost, 0.06);
  assert.match(i.packagingItems[0].name, /÷ 10/, 'il nome deve dire come è stata ripartita');
});

test('imballo: su un pezzo solo, per ordine e per pezzo coincidono', () => {
  const i = P.imballo([{ id: 'scatola', per: 'ordine', costo: 0.60 }], { quantita: 1 });
  assert.equal(i.costoPerPezzo, 0.60);
});

test('imballo: le voci disattivate e quelle a costo zero restano fuori', () => {
  const i = P.imballo([
    { id: 'a', per: 'pezzo', costo: 0.05 },
    { id: 'b', per: 'pezzo', costo: 0.10, attivo: false },
    { id: 'c', per: 'pezzo', costo: 0 },
  ], { quantita: 1 });
  assert.equal(i.packagingItems.length, 1);
  assert.equal(i.packagingItems[0].id, 'a');
});

test('imballo: quantità zero o negativa non produce una divisione per zero', () => {
  for (const q of [0, -5, NaN, undefined]) {
    const i = P.imballo([{ id: 'scatola', per: 'ordine', costo: 0.60 }], { quantita: q });
    assert.ok(isFinite(i.costoPerPezzo), `quantità ${q} produce un numero non finito`);
    assert.equal(i.costoPerPezzo, 0.60);
  }
});

/* ── L'INGRESSO PER IL MOTORE ───────────────────────────────────────────── */

test('ingresso: restituisce i campi che il motore conosce', () => {
  const i = P.ingresso({}, {});
  for (const k of ['laborPerHour', 'overheadPerHour', 'overheadPerJob', 'overheadPct', 'packagingItems']) {
    assert.ok(k in i, `manca il campo ${k}`);
  }
});

test('ingresso: senza profili la manodopera ha un valore e le spese no', () => {
  const i = P.ingresso({}, {});
  assert.ok(i.laborPerHour > 0, 'un preventivo senza costo del lavoro sarebbe più falso di uno con un predefinito');
  assert.equal(i.overheadPerHour, 0);
  assert.equal(i._fonti.overhead, 'missing');
  assert.equal(i._predefiniti.manodopera, true);
});

test('ingresso: con i profili dichiarati arrivano i valori veri', () => {
  const i = P.ingresso({
    manodopera: [{ id: 'operatore', costoOrarioInterno: 22 }],
    overhead: { modo: 'ora', oreProduttiveAnnue: 1000, voci: [{ id: 'affitto', mensile: 500 }] },
    imballo: [{ id: 'sacchetto', per: 'pezzo', costo: 0.05 }],
  }, { quantita: 1 });
  assert.equal(i.laborPerHour, 22);
  assert.equal(i.overheadPerHour, 6, '6000 € annui su 1000 ore');
  assert.equal(i.packagingItems.length, 1);
  assert.equal(i._fonti.overhead, 'declared');
});

test('ingresso: mai due modalità di spese generali insieme', () => {
  const i = P.ingresso({
    overhead: { modo: 'percento', percentuale: 15, oreProduttiveAnnue: 1000, lavoriAnnui: 300,
      voci: [{ id: 'affitto', mensile: 500 }] },
  }, {});
  assert.equal(i.overheadPerHour, 0);
  assert.equal(i.overheadPerJob, 0);
  assert.equal(i.overheadPct, 15);
});

test('ingresso: il ruolo scelto cambia il costo del lavoro', () => {
  const base = P.ingresso({}, { ruolo: 'operatore' });
  const design = P.ingresso({}, { ruolo: 'design' });
  assert.ok(design.laborPerHour > base.laborPerHour,
    'un\'ora di progettazione non costa come un\'ora di confezionamento');
});

/* ── PUREZZA ────────────────────────────────────────────────────────────── */

test('il modulo non legge il browser: un preventivo deve poter essere rifatto identico', () => {
  const sorgente = fs.readFileSync('src/product/cost-profiles.js', 'utf8');
  const corpo = sorgente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const vietato of ['localStorage', 'document', 'IDB', 'Date.now', 'new Date']) {
    assert.ok(!corpo.includes(vietato), `il modulo puro non deve nominare ${vietato}`);
  }
});
