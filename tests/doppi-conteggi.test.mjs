/**
 * doppi-conteggi.test.mjs — le tredici domande che un preventivo deve reggere.
 *
 * L'audit di Fase 1 le ha poste una volta, come script, e tutte e tredici
 * hanno risposto bene. Un audit che passa una volta però non protegge niente:
 * il valore di queste domande è che restino poste a ogni commit, perché ognuna
 * è un errore che si può reintrodurre senza accorgersene e che nessuno vede
 * guardando il risultato — un costo con il materiale contato due volte è
 * plausibile, e un margine calcolato sul prezzo inventato è aritmeticamente
 * corretto.
 *
 * Le sonde sono differenziali: si cambia **un solo** ingresso e si misura di
 * quanto si muove il totale. È l'unico modo per distinguere «questa voce è
 * inclusa» da «questa voce è inclusa due volte».
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite });
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), contesto);
const E = contesto.InglyCostEngine;

/** Il caso di calibrazione dell'audit: 290 g, 9h57, PLA a €24/kg. */
const BASE = {
  tecnologia: 'print3d', grams: 290, hours: 9.95, qty: 1,
  spoolPrice: 24, spoolGrams: 1000,
  watt: 150, kwhPrice: 0.28, dutyCycle: 0.6,
  machinePrice: 400, machineLifeHours: 2000, maintenancePerHour: 0.12,
  failureRate: 0, laborPerHour: 18, setupMin: 0, finishMin: 0,
};

const con = (extra) => E.calcola({ ...BASE, ...extra });
const voce = (r, id) => { const v = r.perPezzo.voci.find((x) => x.id === id); return v ? v.value : 0; };
const vicino = (a, b, t = 0.001) => Math.abs(a - b) < t;

test('i supporti entrano nel materiale una volta sola', () => {
  const d = voce(con({ supportGrams: 50 }), 'materiale') - voce(con({}), 'materiale');
  assert.ok(vicino(d, 0.050 * 24), `50 g a €24/kg devono valere €1,20, valgono €${d.toFixed(3)}`);
});

test('il purge entra nel materiale una volta sola', () => {
  const d = voce(con({ purgeGrams: 30 }), 'materiale') - voce(con({}), 'materiale');
  assert.ok(vicino(d, 0.030 * 24), `30 g devono valere €0,72, valgono €${d.toFixed(3)}`);
});

test('supporti e purge insieme non si sommano fra loro', () => {
  const solo = voce(con({}), 'materiale');
  const s = voce(con({ supportGrams: 50 }), 'materiale') - solo;
  const p = voce(con({ purgeGrams: 30 }), 'materiale') - solo;
  const e = voce(con({ supportGrams: 50, purgeGrams: 30 }), 'materiale') - solo;
  assert.ok(vicino(e, s + p), 'i due incrementi devono essere additivi, non moltiplicativi');
});

test("l'energia non è già dentro l'ammortamento macchina", () => {
  /* Azzerare il prezzo della macchina non deve toccare l'energia: se la
     toccasse, l'energia sarebbe conteggiata anche lì. */
  assert.ok(vicino(voce(con({ machinePrice: 0 }), 'energia'), voce(con({}), 'energia'), 1e-9));
});

test("la manutenzione non è già dentro l'ammortamento macchina", () => {
  assert.ok(vicino(voce(con({ maintenancePerHour: 0 }), 'macchina'), voce(con({}), 'macchina'), 1e-9));
});

test('setup e post-processo non si sovrappongono', () => {
  const z = con({}).costoPezzo;
  const s = con({ setupMin: 60 }).costoPezzo - z;
  const f = con({ finishMin: 60 }).costoPezzo - z;
  const e = con({ setupMin: 60, finishMin: 60 }).costoPezzo - z;
  assert.ok(vicino(e, s + f), `sommati danno €${(s + f).toFixed(3)}, insieme danno €${e.toFixed(3)}`);
});

test('il setup è per job e si divide per la quantità', () => {
  const u = con({ setupMin: 60, qty: 1 }).unaTantum.perPezzo;
  const d = con({ setupMin: 60, qty: 10 }).unaTantum.perPezzo;
  assert.ok(vicino(u / 10, d), `1 pz €${u.toFixed(2)}, 10 pz devono fare €${(u / 10).toFixed(2)}, fanno €${d.toFixed(2)}`);
});

test('il packaging resta per pezzo a qualunque quantità', () => {
  assert.ok(vicino(voce(con({ packagingPerUnit: 2, qty: 1 }), 'packaging'),
    voce(con({ packagingPerUnit: 2, qty: 10 }), 'packaging'), 1e-9));
});

test('lo scarto si applica solo a ciò che si perde davvero', () => {
  /* Non a manodopera e packaging di un pezzo che non si è ancora fatto: la
     formula è perdibile × tasso/(1−tasso), non totale × tasso. */
  const z = con({});
  const perdibile = ['materiale', 'energia', 'macchina', 'manutenzione']
    .reduce((a, id) => a + voce(z, id), 0);
  const s = voce(con({ failureRate: 10 }), 'scarto');
  assert.ok(vicino(s, perdibile * 0.10 / 0.90, 0.01),
    `atteso €${(perdibile * 0.10 / 0.90).toFixed(3)}, ottenuto €${s.toFixed(3)}`);
});

test("l'IVA non entra mai nel costo", () => {
  assert.ok(vicino(con({ ivaPct: 22 }).costoPezzo, con({}).costoPezzo, 1e-9));
});

test('margine 40% su 100 € fa 166,67 €, non 140 €', () => {
  const p = E.prezzo(100, { strategia: 'margine', marginePct: 40, ivaPct: 0 });
  assert.ok(vicino(p.netto, 500 / 3, 0.01), `ottenuto €${p.netto.toFixed(2)}`);
});

test('ricarico 40% su 100 € fa 140 €, con margine 28,57%', () => {
  const p = E.prezzo(100, { strategia: 'ricarico', ricarico: 1.4, ivaPct: 0 });
  assert.ok(vicino(p.netto, 140, 0.01));
  assert.ok(vicino((1 - 100 / p.netto) * 100, 200 / 7, 0.01),
    'il margine di un ricarico del 40% è 28,57%, non 40%');
});

test('le commissioni si calcolano sul lordo incassato', () => {
  const p = E.prezzo(100, { strategia: 'margine', marginePct: 40, ivaPct: 22, commissionePagamentoPct: 3 });
  assert.ok(vicino(p.commissioni, p.lordo * 0.03, 0.01),
    'il 3% di un incasso si prende su quello che si incassa, non sul netto');
});

test("l'overhead di una macchina non presidiata segue le ore uomo", () => {
  /* Una stampante che lavora dieci ore da sola non occupa il capannone per
     dieci ore di spese generali: occupa i minuti di chi la avvia. */
  const senza = con({ overheadPerHour: 4 }).overhead;
  const conSetup = con({ overheadPerHour: 4, setupMin: 15 }).overhead;
  assert.ok(vicino(senza, 0, 1e-9), 'senza ore uomo non c\'è overhead');
  assert.ok(vicino(conSetup, 1, 0.01), `15 min a €4/h fanno €1,00, fanno €${conSetup.toFixed(2)}`);
  assert.ok(conSetup < 4 * BASE.hours / 10, 'non deve avvicinarsi alle ore macchina');
});

test('il caso di calibrazione resta agganciato ai suoi tre livelli', () => {
  /* La fixture d'oro dell'audit: se uno di questi tre numeri si muove, si è
     mosso il significato di un livello, e va detto prima di scoprirlo in un
     preventivo. */
  const c = { ...BASE, failureRate: 7, setupMin: 15, finishMin: 10 };
  const g = (l) => E.calcola({ ...c, livelloCosto: l }).costoPezzo;
  assert.ok(vicino(g('stampa'), 7.21, 0.01), `stampa €${g('stampa').toFixed(2)}`);
  assert.ok(vicino(g('macchina'), 11.18, 0.01), `macchina €${g('macchina').toFixed(2)}`);
  assert.ok(vicino(g('completo'), 18.68, 0.01), `completo €${g('completo').toFixed(2)}`);
});

test('il residuo verso lo slicer è materiale più energia, non una formula diversa', () => {
  /* €4,50 su 290 g vuol dire €15,52/kg. La differenza con i €24/kg impostati
     spiega il residuo al centesimo, e questo test lo tiene dimostrato. */
  const c = { ...BASE, failureRate: 7, setupMin: 15, finishMin: 10 };
  const k = E.calibra(c, { costo: 4.50, sistema: 'slicer' });
  assert.equal(k.corrispondente.id, 'materiale',
    'il livello che fa la stessa domanda dello slicer è il materiale puro');
  const materialeInGly = 0.290 * 24;
  assert.ok(vicino(k.residuo, materialeInGly - 4.50, 0.01),
    `residuo €${k.residuo.toFixed(2)} contro €${(materialeInGly - 4.50).toFixed(2)}`);
  /* E il motore lo dice a parole, non solo con un numero. */
  assert.equal(k.causa.tipo, 'prezzo materiale');
  assert.ok(vicino(k.causa.riferimentoPerKg, 4.50 / 0.290, 0.01));
});
