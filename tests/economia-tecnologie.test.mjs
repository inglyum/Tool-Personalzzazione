/**
 * economia-tecnologie.test.mjs — i profili del laboratorio valgono per tutte
 * e quattro le tecnologie, non solo per la stampa 3D.
 *
 * `cost-profiles.js` è stato scritto lavorando sul preventivatore 3D, ed è lì
 * che è stato misurato. Questo file verifica la cosa che un test scritto sul
 * caso 3D non può verificare: che la stessa manodopera, le stesse spese
 * generali e lo stesso imballo entrino anche nel laser, nell'UV e nel DTF, e
 * che entrino con lo stesso significato.
 *
 * Le tre regole del §61 che qui si possono rompere una tecnologia alla volta:
 *   · tempo macchina e tempo uomo restano due numeri;
 *   · le spese generali non si contano due volte;
 *   · l'imballo per ordine si divide, non si moltiplica.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('src/product/cost-profiles.js', 'utf8'), sandbox);
const E = sandbox.window.InglyCostEngine;
const P = sandbox.window.InglyCostProfiles;

/* Un laboratorio dichiarato una volta, usato da tutti i casi: 4800 € annui di
   spese generali su 1200 ore produttive fanno 4 €/h, e sono numeri di prova,
   non un dato di mercato. */
const LABORATORIO = {
  manodopera: [{ id: 'operatore', costoOrarioInterno: 20, tariffaCliente: 40 },
    { id: 'laser', costoOrarioInterno: 20, tariffaCliente: 40 },
    { id: 'uv', costoOrarioInterno: 20, tariffaCliente: 40 },
    { id: 'dtf', costoOrarioInterno: 20, tariffaCliente: 40 },
    { id: 'stampa3d', costoOrarioInterno: 20, tariffaCliente: 40 }],
  overhead: { modo: 'ora', oreProduttiveAnnue: 1200,
    voci: [{ id: 'affitto', mensile: 350 }, { id: 'software', mensile: 50 }] },
  imballo: [{ id: 'sacchetto', per: 'pezzo', costo: 0.05 },
    { id: 'scatola', per: 'ordine', costo: 0.60 }],
};

/* Un caso minimo per ciascuna tecnologia: quel tanto che basta a produrre un
   costo diverso da zero e a far comparire ore macchina e ore uomo distinte. */
const CASI = {
  print3d: { tecnologia: 'print3d', hours: 4, grams: 200, materialPricePerKg: 24,
    ratedPowerW: 200, kwhPrice: 0.28, machinePrice: 500, machineLifeHours: 3000,
    setupMin: 10, finishMin: 5, qty: 1 },
  laser: { tecnologia: 'laser', hours: 1.5, ratedPowerW: 900, kwhPrice: 0.28,
    machinePrice: 2500, machineLifeHours: 6000, sheetCost: 3, sheetsUsed: 1,
    setupMin: 8, finishMin: 4, qty: 1 },
  uv: { tecnologia: 'uv', hours: 0.5, ratedPowerW: 600, kwhPrice: 0.28,
    machinePrice: 9000, machineLifeHours: 5000, printAreaMm2: 40000,
    inkMlPerM2: 12, inkPricePerMl: 0.09, setupMin: 12, handlingMin: 3, qty: 1 },
  dtf: { tecnologia: 'dtf', hours: 0.4, ratedPowerW: 700, kwhPrice: 0.28,
    machinePrice: 6000, machineLifeHours: 5000, printAreaMm2: 30000,
    filmPricePerM2: 2.4, inkMlPerM2: 14, inkPricePerMl: 0.08,
    setupMin: 6, handlingMin: 3, qty: 1 },
};
const TECNOLOGIE = Object.keys(CASI);

/* Ogni tecnologia chiama diversamente i minuti di lavoro umano — la finitura di
   un laser e la manipolazione di una stampa UV non sono lo stesso passaggio —
   e il test che verifica «più tempo uomo costa di più» deve sapere quale campo
   toccare, altrimenti misura il nulla e passa lo stesso. */
const MINUTI_UOMO = { print3d: 'finishMin', laser: 'finishMin', uv: 'handlingMin', dtf: 'handlingMin' };

const conProfili = (base, opzioni) => {
  const i = P.ingresso(LABORATORIO, opzioni || {});
  return Object.assign({}, base, {
    laborPerHour: i.laborPerHour,
    overheadPerHour: i.overheadPerHour,
    overheadPerJob: i.overheadPerJob,
    overheadPct: i.overheadPct,
    packagingItems: i.packagingItems,
  });
};

test('le quattro tecnologie del comando esistono nel motore', () => {
  for (const t of TECNOLOGIE) {
    assert.ok(E.PROFILI[t], `manca il profilo ${t}`);
  }
});

for (const tec of TECNOLOGIE) {
  test(`${tec}: senza profili il preventivo esce, e le spese generali sono zero`, () => {
    const r = E.calcola(CASI[tec]);
    assert.ok(r.costoPezzo > 0, 'un costo a zero non è un preventivo');
    assert.equal(r.overhead, 0, 'senza spese dichiarate non se ne inventano');
  });

  test(`${tec}: con i profili le spese generali entrano nel costo`, () => {
    const senza = E.calcola(CASI[tec]);
    const con = E.calcola(conProfili(CASI[tec], { ruolo: tec, quantita: 1 }));
    assert.ok(con.overhead > 0, 'le spese dichiarate devono comparire');
    assert.ok(con.costoPezzo > senza.costoPezzo, 'il costo pieno deve salire');
  });

  test(`${tec}: la manodopera del profilo è quella usata, non un predefinito`, () => {
    const i = conProfili(CASI[tec], { ruolo: tec });
    assert.equal(i.laborPerHour, 20);
    const r = E.calcola(i);
    /* Se la tariffa non arrivasse al conto, raddoppiarla non cambierebbe nulla. */
    const doppia = E.calcola(Object.assign({}, i, { laborPerHour: 40 }));
    assert.ok(doppia.costoPezzo > r.costoPezzo, 'la tariffa oraria non arriva al costo');
  });

  test(`${tec}: l imballo per ordine si divide per la quantità`, () => {
    const uno = E.calcola(conProfili(Object.assign({}, CASI[tec], { qty: 1 }),
      { ruolo: tec, quantita: 1 }));
    const dieci = E.calcola(conProfili(Object.assign({}, CASI[tec], { qty: 10 }),
      { ruolo: tec, quantita: 10 }));
    const v = (r) => (r.perPezzo.voci.find((x) => x.id === 'packaging') || { value: 0 }).value;
    /* 5 cent a pezzo più 60 cent d'ordine: 65 su un pezzo, 11 su dieci. */
    assert.ok(Math.abs(v(uno) - 0.65) < 0.001, `${tec}: imballo su un pezzo € ${v(uno)}`);
    assert.ok(Math.abs(v(dieci) - 0.11) < 0.001, `${tec}: imballo su dieci pezzi € ${v(dieci)}`);
  });

  test(`${tec}: tempo macchina e tempo uomo restano due numeri diversi`, () => {
    const base = conProfili(CASI[tec], { ruolo: tec });
    const piuMacchina = E.calcola(Object.assign({}, base, { hours: base.hours * 2 }));
    const campo = MINUTI_UOMO[tec];
    const piuUomo = E.calcola(Object.assign({}, base, { [campo]: (base[campo] || 0) + 60 }));
    const r = E.calcola(base);
    assert.ok(piuMacchina.costoPezzo > r.costoPezzo, 'più ore macchina devono costare di più');
    assert.ok(piuUomo.costoPezzo > r.costoPezzo, 'più minuti di lavoro umano (' + campo + ') devono costare di più');
    assert.notEqual(Math.round((piuMacchina.costoPezzo - r.costoPezzo) * 100),
      Math.round((piuUomo.costoPezzo - r.costoPezzo) * 100),
      'raddoppiare le ore macchina e aggiungere un ora di lavoro umano non possono costare uguale');
  });

  test(`${tec}: le spese generali non si contano due volte`, () => {
    const i = conProfili(CASI[tec], { ruolo: tec });
    const valorizzati = [i.overheadPerHour, i.overheadPerJob, i.overheadPct].filter((v) => v > 0);
    assert.equal(valorizzati.length, 1,
      'il profilo consegna una modalità sola: due sarebbero lo stesso affitto pagato due volte');
  });

  test(`${tec}: il prezzo è il margine, non il ricarico`, () => {
    const r = E.calcola(conProfili(CASI[tec], { ruolo: tec }));
    const p = E.prezzo(r.costoPezzo, { strategia: 'margine', marginePct: 40 });
    assert.ok(Math.abs(p.netto - r.costoPezzo / 0.6) < 0.001,
      'margine 40% significa dividere per 0,6, non moltiplicare per 1,4');
    assert.ok(Math.abs(p.marginePct - 40) < 0.001);
    assert.ok(p.ricaricoPct > p.marginePct, 'il ricarico è sempre maggiore del margine');
  });

  test(`${tec}: nessuna voce del conto è NaN o negativa`, () => {
    const r = E.calcola(conProfili(CASI[tec], { ruolo: tec, quantita: 3 }));
    for (const v of r.perPezzo.voci) {
      assert.ok(isFinite(v.value) && v.value >= 0, `${tec}: voce ${v.id} vale ${v.value}`);
    }
    assert.ok(isFinite(r.costoPezzo) && r.costoPezzo > 0);
  });
}

test('la potenza di targa non viene spacciata per consumo misurato', () => {
  /* Il §61 lo vieta: dichiararlo è la differenza fra una stima e una bugia. */
  for (const tec of TECNOLOGIE) {
    const r = E.calcola(conProfili(CASI[tec], { ruolo: tec }));
    const e = r.energia;
    if (e && e.modo) {
      assert.notEqual(e.modo, 'misurato',
        `${tec}: senza kWh misurati il modo non può essere «misurato»`);
    }
  }
});

test('il pavimento di margine non si può scavalcare con uno sconto', () => {
  for (const tec of TECNOLOGIE) {
    const r = E.calcola(conProfili(CASI[tec], { ruolo: tec }));
    const p = E.prezzo(r.costoPezzo, { strategia: 'ricarico', ricarico: 1.05,
      scontoPct: 60, marginePavimentoPct: 20 });
    assert.ok(p.netto >= r.costoPezzo / 0.8 - 0.001,
      `${tec}: € ${p.netto} è sotto il pavimento del 20% su un costo di € ${r.costoPezzo}`);
    assert.equal(p.pavimentoScattato, true);
  }
});
