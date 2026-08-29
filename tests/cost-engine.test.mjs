/**
 * cost-engine.test.mjs — la matematica di tutti i quoter, provata senza browser.
 *
 * Il difetto che questo file esiste per rendere impossibile è misurato, non
 * ipotetico: nel modulo apparel un ordine da 200 pezzi usciva a margine −5,0%,
 * perché lo sconto quantità scritto a mano superava il ricarico. Nessun
 * collaudo lo aveva visto, perché la matematica viveva dentro la funzione che
 * disegnava la pagina e non si poteva eseguire da sola.
 *
 * Qui si esegue da sola.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite });
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), contesto);
const E = contesto.InglyCostEngine;

/** Un lavoro laser realistico, per non provare la matematica sul vuoto. */
const LASER = {
  tecnologia: 'laser',
  cutLengthMm: 1200, cutSpeedMmMin: 600,
  engraveAreaMm2: 2500, engraveSpeedMm2Min: 5000,
  sheetPrice: 12, sheetAreaMm2: 600 * 400, pieceAreaMm2: 100 * 80, sheetUtilization: 0.8,
  machinePrice: 2500, residualValue: 500, machineLifeHours: 8000,
  watt: 120, kwhPrice: 0.28, maintenancePerHour: 0.5,
  laborPerHour: 18, setupMin: 15, finishMin: 2, qcMin: 1,
};

const TREDI = {
  tecnologia: 'print3d',
  grams: 45, materialPricePerKg: 22, hours: 3.5,
  machinePrice: 1200, residualValue: 200, machineLifeHours: 6000,
  watt: 120, kwhPrice: 0.28, dutyCycle: 0.4, maintenancePerHour: 0.15,
  laborPerHour: 18, setupMin: 10, finishMin: 5,
};

test('anatomia comune: una tantum diviso, per pezzo no', async (t) => {
  await t.test('il costo per pezzo scende con la quantità', () => {
    const uno = E.calcola({ ...LASER, qty: 1 });
    const cento = E.calcola({ ...LASER, qty: 100 });
    assert.ok(cento.costoPezzo < uno.costoPezzo, 'a 100 pezzi il costo unitario deve scendere');
  });

  await t.test('scende esattamente di quanto si divide l\'avviamento', () => {
    const uno = E.calcola({ ...LASER, qty: 1 });
    const dieci = E.calcola({ ...LASER, qty: 10 });
    const attesa = uno.unaTantum.totale - uno.unaTantum.totale / 10;
    assert.ok(Math.abs((uno.costoPezzo - dieci.costoPezzo) - attesa) < 0.01,
      'la differenza è tutta e sola nell\'una tantum divisa');
  });

  await t.test('il costo per pezzo non scende mai sotto il costo variabile', () => {
    const enorme = E.calcola({ ...LASER, qty: 100000 });
    assert.ok(enorme.costoPezzo >= enorme.perPezzo.totale - 0.0001,
      'per quanto grande sia il lotto, il materiale si paga sempre');
  });

  await t.test('l\'avviamento compare come voce separata, non spalmato in silenzio', () => {
    const c = E.calcola({ ...LASER, qty: 10 });
    assert.ok(c.unaTantum.voci.some((v) => v.id === 'setup'));
    assert.ok(c.unaTantum.perPezzo > 0);
    assert.ok(!c.perPezzo.voci.some((v) => v.id === 'setup'), 'l\'avviamento non è un costo per pezzo');
  });
});

test('valori limite — nessuno può produrre un numero assurdo', async (t) => {
  await t.test('input vuoto: costo zero, nessuna eccezione', () => {
    for (const tec of E.tecnologie()) {
      const c = E.calcola({ tecnologia: tec });
      assert.equal(c.vuoto, false, tec);
      assert.equal(c.costoPezzo, 0, tec + ': senza dati il costo è zero, non un NaN');
      assert.ok(isFinite(c.costoTotale), tec);
    }
  });

  await t.test('valori negativi: si azzerano, non si sottraggono', () => {
    const c = E.calcola({ ...TREDI, grams: -500, materialPricePerKg: -30, setupMin: -60 });
    assert.ok(c.costoPezzo >= 0, 'un costo negativo sembrerebbe valido e non lo è');
    assert.ok(isFinite(c.costoPezzo));
  });

  await t.test('valori mancanti o non numerici non producono NaN', () => {
    const c = E.calcola({ tecnologia: 'dtf', printAreaMm2: 'abc', blankPrice: null, qty: undefined });
    assert.ok(isFinite(c.costoPezzo));
    assert.equal(c.qty, 1, 'senza quantità si assume un pezzo');
  });

  await t.test('quantità 0 o frazionaria diventa almeno 1', () => {
    assert.equal(E.calcola({ ...LASER, qty: 0 }).qty, 1);
    assert.equal(E.calcola({ ...LASER, qty: 0.4 }).qty, 1);
    assert.equal(E.calcola({ ...LASER, qty: -20 }).qty, 1);
  });

  await t.test('la scala 1 → 1000 resta monotona e finita', () => {
    let precedente = Infinity;
    for (const q of [1, 10, 100, 1000]) {
      const c = E.calcola({ ...LASER, qty: q });
      assert.ok(isFinite(c.costoPezzo) && c.costoPezzo > 0, 'qty ' + q);
      assert.ok(c.costoPezzo <= precedente + 0.0001, 'il costo unitario non può risalire a qty ' + q);
      precedente = c.costoPezzo;
    }
  });

  await t.test('una tecnologia sconosciuta lo dice, non finge un conto', () => {
    const c = E.calcola({ tecnologia: 'telepatia' });
    assert.equal(c.vuoto, true);
    assert.match(c.motivo, /sconosciuta/);
  });
});

test('scarto', async (t) => {
  await t.test('al 10% servono l\'11,1% di risorse in più, non il 10%', () => {
    const senza = E.calcola({ ...TREDI, qty: 1, failureRate: 0 });
    const con = E.calcola({ ...TREDI, qty: 1, failureRate: 10 });
    const perdibile = con.perPezzo.voci
      .filter((v) => ['materiale', 'energia', 'macchina', 'manutenzione'].includes(v.id))
      .reduce((a, v) => a + v.value, 0);
    const scarto = con.perPezzo.voci.find((v) => v.id === 'scarto');
    assert.ok(Math.abs(scarto.value - perdibile * (0.1 / 0.9)) < 0.0001,
      'per consegnare 100 pezzi buoni al 10% di scarto se ne producono 111,1');
    assert.ok(con.costoPezzo > senza.costoPezzo);
  });

  await t.test('lo scarto non tocca la finitura, che non è ancora stata fatta', () => {
    const c = E.calcola({ ...TREDI, qty: 1, failureRate: 50, finishMin: 60 });
    const scarto = c.perPezzo.voci.find((v) => v.id === 'scarto').value;
    const perdibile = c.perPezzo.voci
      .filter((v) => ['materiale', 'energia', 'macchina', 'manutenzione'].includes(v.id))
      .reduce((a, v) => a + v.value, 0);
    assert.ok(Math.abs(scarto - perdibile) < 0.0001, 'al 50% si raddoppia solo il perdibile');
  });

  await t.test('un tasso impossibile viene limitato invece di dividere per zero', () => {
    const c = E.calcola({ ...TREDI, failureRate: 100 });
    assert.ok(isFinite(c.costoPezzo), 'il 100% di scarto non deve produrre infinito');
  });
});

test('prezzo — margine e ricarico non sono la stessa cosa', async (t) => {
  await t.test('margine 40% su costo 100 dà 166,67 e margine reale 40%', () => {
    const p = E.prezzo(100, { strategia: 'margine', marginePct: 40, ivaPct: 22 });
    assert.ok(Math.abs(p.netto - 166.6667) < 0.001);
    assert.ok(Math.abs(p.marginePct - 40) < 0.001, 'quello che si chiede è quello che si ottiene');
  });

  await t.test('ricarico 40% dà 140 e margine 28,6% — la confusione che costava un terzo', () => {
    const p = E.prezzo(100, { strategia: 'ricarico', ricarico: 1.4 });
    assert.equal(p.netto, 140);
    assert.ok(Math.abs(p.marginePct - 28.571) < 0.01);
    assert.ok(Math.abs(p.ricaricoPct - 40) < 0.001);
  });

  await t.test('IVA e lordo sono separati dal netto', () => {
    const p = E.prezzo(100, { strategia: 'fisso', prezzoFisso: 200, ivaPct: 22 });
    assert.equal(p.netto, 200);
    assert.equal(p.iva, 44);
    assert.equal(p.lordo, 244);
  });

  await t.test('le commissioni si pagano sul lordo e riducono il profitto netto', () => {
    const p = E.prezzo(100, { strategia: 'fisso', prezzoFisso: 200, ivaPct: 22, commissionePct: 10, commissioneFissa: 0.35 });
    assert.ok(Math.abs(p.commissioni - (244 * 0.1 + 0.35)) < 0.001);
    assert.ok(p.profittoNetto < p.profitto);
  });

  await t.test('prezzo competitivo e premium partono dal mercato, non dal costo', () => {
    const comp = E.prezzo(100, { strategia: 'competitivo', prezzoMercato: 200, sottoMercatoPct: 10 });
    assert.equal(comp.netto, 180);
    const prem = E.prezzo(100, { strategia: 'premium', prezzoMercato: 200, sopraMercatoPct: 25 });
    assert.equal(prem.netto, 250);
  });

  await t.test('un margine del 100% non produce un prezzo infinito', () => {
    assert.ok(isFinite(E.prezzo(100, { strategia: 'margine', marginePct: 100 }).netto));
  });
});

test('il pavimento di margine — il difetto misurato non può più tornare', async (t) => {
  await t.test('senza pavimento, uno sconto forte porta sotto costo', () => {
    /* La riproduzione esatta del difetto apparel: ricarico 40%, sconto 32%. */
    const p = E.prezzo(100, { strategia: 'ricarico', ricarico: 1.4, scontoPct: 32 });
    assert.ok(p.netto < 100, 'è così che il quoter vendeva in perdita: ' + p.netto.toFixed(2));
    assert.equal(p.inPerdita, true);
  });

  await t.test('con il pavimento, lo stesso sconto non scende sotto la soglia', () => {
    const p = E.prezzo(100, { strategia: 'ricarico', ricarico: 1.4, scontoPct: 32, marginePavimentoPct: 15 });
    assert.equal(p.pavimentoScattato, true);
    assert.ok(p.netto >= 100, 'mai sotto costo');
    assert.ok(p.marginePct >= 14.999, 'il margine minimo dichiarato è rispettato');
    assert.equal(p.inPerdita, false);
  });

  await t.test('NESSUNA combinazione di sconto e quantità scende sotto il pavimento', () => {
    /* È il test che avrebbe intercettato il difetto il giorno in cui è nato:
       si prova tutta la griglia, non un caso scelto bene. */
    const fallimenti = [];
    for (const sconto of [0, 5, 10, 20, 32, 50, 80, 99]) {
      for (const qty of [1, 5, 10, 50, 100, 200, 500, 1000]) {
        for (const strategia of ['margine', 'ricarico']) {
          const c = E.calcola({ ...LASER, qty });
          const p = E.prezzo(c.costoPezzo, {
            strategia, marginePct: 40, ricarico: 1.4, scontoPct: sconto, marginePavimentoPct: 15,
          });
          if (p.marginePct < 14.99) fallimenti.push({ strategia, sconto, qty, margine: p.marginePct.toFixed(1) });
        }
      }
    }
    assert.equal(fallimenti.length, 0, 'combinazioni che sfondano il pavimento: ' + JSON.stringify(fallimenti));
  });

  await t.test('senza pavimento dichiarato il motore non lo inventa', () => {
    const p = E.prezzo(100, { strategia: 'ricarico', ricarico: 1.4, scontoPct: 50 });
    assert.equal(p.pavimentoScattato, false, 'chi non lo chiede resta libero — ma viene avvisato');
    assert.equal(p.inPerdita, true);
  });
});

test('scaglioni', async (t) => {
  await t.test('il prezzo unitario scende senza alcuna tabella di sconti', () => {
    const righe = E.scaglioni(LASER, [1, 10, 100], { strategia: 'margine', marginePct: 40 });
    assert.ok(righe[0].prezzoPezzo > righe[1].prezzoPezzo);
    assert.ok(righe[1].prezzoPezzo > righe[2].prezzoPezzo);
  });

  await t.test('il margine resta costante mentre il prezzo scende', () => {
    /* La prova che la discesa viene dal costo e non da uno sconto: se fosse
       uno sconto, il margine calerebbe con la quantità. */
    const righe = E.scaglioni(LASER, [1, 10, 100, 1000], { strategia: 'margine', marginePct: 40 });
    for (const r of righe) assert.ok(Math.abs(r.marginePct - 40) < 0.001, 'qty ' + r.qty);
  });

  await t.test('quantità ripetute non producono righe doppie', () => {
    assert.equal(E.scaglioni(LASER, [10, 10, 10], {}).length, 1);
  });

  await t.test('gli scaglioni predefiniti coprono dal pezzo singolo al lotto', () => {
    /* Confronto per valore: l'array nasce nel contesto isolato e ha un altro
       prototipo, che `deepEqual` conta come differenza. */
    assert.equal([...E.SCAGLIONI].join(','), '1,2,5,10,20,50,100,250,500');
  });
});

test('profili di tecnologia', async (t) => {
  await t.test('le cinque tecnologie richieste esistono', () => {
    assert.equal([...E.tecnologie()].sort().join(','), 'dtf,laser,print3d,sublimation,uv');
  });

  await t.test('laser: la resa del foglio decide il costo del materiale', () => {
    /* 600×400 all'80% = 192.000 mm² utili; un pezzo da 100×80 = 8.000 mm² → 24 pezzi. */
    const c = E.calcola({ ...LASER, qty: 1 });
    const materiale = c.perPezzo.voci.find((v) => v.id === 'materiale');
    assert.ok(Math.abs(materiale.value - 12 / 24) < 0.001, 'il pezzo costa un ventiquattresimo di foglio');
    assert.match(materiale.detail, /24 pezzi per foglio/);
  });

  await t.test('laser: uno sfrido maggiore alza il costo del pezzo', () => {
    const buono = E.calcola({ ...LASER, sheetUtilization: 0.9, qty: 1 });
    const scarso = E.calcola({ ...LASER, sheetUtilization: 0.5, qty: 1 });
    assert.ok(scarso.costoPezzo > buono.costoPezzo, 'nestare male costa');
  });

  await t.test('laser: il tempo esce da lunghezza, area e passate', () => {
    const una = E.calcola({ ...LASER, passes: 1 });
    const tre = E.calcola({ ...LASER, passes: 3 });
    assert.ok(Math.abs(tre.ore - una.ore * 3) < 0.0001, 'tre passate, triplo tempo');
  });

  await t.test('DTF: l\'impaginazione del film cambia davvero il costo', () => {
    /* È il calcolo che distingue un costo reale da una media: su un film da
       60 cm, una grafica da 10 cm ne ha 6 affiancate, una da 30 solo 2. */
    const base = {
      tecnologia: 'dtf', qty: 1, filmPricePerM2: 8, graphicHeightMm: 100, gapMm: 5, filmWidthMm: 600,
    };
    const stretta = E.calcola({ ...base, graphicWidthMm: 100 });
    const larga = E.calcola({ ...base, graphicWidthMm: 300 });
    const vFilm = (c) => c.perPezzo.voci.find((v) => v.id === 'film').value;
    assert.ok(vFilm(larga) > vFilm(stretta), 'una grafica larga consuma più film per pezzo');
    assert.ok(Math.abs(vFilm(larga) / vFilm(stretta) - 3) < 0.01, '6 affiancate contro 2: il triplo');
  });

  await t.test('DTF: senza impaginazione lo dichiara invece di fingere precisione', () => {
    const c = E.calcola({ tecnologia: 'dtf', printAreaMm2: 10000, filmPricePerM2: 8, qty: 1 });
    assert.match(c.perPezzo.voci.find((v) => v.id === 'film').detail, /senza impaginazione dichiarata/);
  });

  await t.test('UV: il bianco di fondo è un costo in più, non incluso', () => {
    const base = { tecnologia: 'uv', qty: 1, printAreaMm2: 100 * 100, inkMlPerM2: 12, inkPricePerMl: 0.35 };
    const senza = E.calcola(base);
    const con = E.calcola({ ...base, whiteMlPerM2: 20, whitePricePerMl: 0.4 });
    assert.ok(con.costoPezzo > senza.costoPezzo);
    assert.match(con.perPezzo.voci.find((v) => v.id === 'inchiostro').detail, /bianco di fondo/);
  });

  await t.test('sublimazione: la carta si conta a fogli', () => {
    const c = E.calcola({ tecnologia: 'sublimation', qty: 1, sheets: 3, sheetPrice: 0.4 });
    assert.ok(Math.abs(c.perPezzo.voci.find((v) => v.id === 'carta').value - 1.2) < 0.0001);
  });

  await t.test('3D: il volume dello slicer basta, la densità fa il resto', () => {
    const daGrammi = E.calcola({ tecnologia: 'print3d', grams: 124, materialPricePerKg: 20, qty: 1 });
    const daVolume = E.calcola({ tecnologia: 'print3d', volumeCm3: 100, material: 'pla', materialPricePerKg: 20, qty: 1 });
    assert.ok(Math.abs(daGrammi.costoPezzo - daVolume.costoPezzo) < 0.0001, '100 cm³ di PLA sono 124 g');
  });

  await t.test('3D: lo spurgo del multimateriale si paga', () => {
    const solo = E.calcola({ ...TREDI, qty: 1 });
    const multi = E.calcola({ ...TREDI, qty: 1, purgeGrams: 30 });
    assert.ok(multi.costoPezzo > solo.costoPezzo);
    assert.match(multi.perPezzo.voci.find((v) => v.id === 'materiale').detail, /spurgo 30 g/);
  });

  await t.test('la macchina si ammortizza sulla differenza, non sul prezzo pieno', () => {
    const c = E.calcola({ ...TREDI, machinePrice: 1200, residualValue: 200, machineLifeHours: 1000 });
    assert.ok(Math.abs(c.costoOrarioMacchina - 1) < 0.0001, '(1200−200)/1000 = 1 €/h');
  });

  await t.test('senza vita utile dichiarata non si inventa un ammortamento', () => {
    assert.equal(E.calcola({ ...TREDI, machineLifeHours: 0 }).costoOrarioMacchina, 0);
  });
});

test('spese generali', async (t) => {
  await t.test('si applicano al costo diretto, in percentuale dichiarata', () => {
    const senza = E.calcola({ ...LASER, qty: 10 });
    const con = E.calcola({ ...LASER, qty: 10, overheadPct: 15 });
    assert.ok(Math.abs(con.costoPezzo - senza.costoPezzo * 1.15) < 0.0001);
  });
});

test('preventiva — costo, prezzo e scaglioni in un colpo', () => {
  const r = E.preventiva(LASER, { strategia: 'margine', marginePct: 45, ivaPct: 22, marginePavimentoPct: 20 });
  assert.ok(r.costo.costoPezzo > 0);
  assert.ok(Math.abs(r.prezzo.marginePct - 45) < 0.001);
  assert.equal(r.scaglioni.length, E.SCAGLIONI.length);
  for (const s of r.scaglioni) assert.ok(s.marginePct >= 19.99, 'qty ' + s.qty);
});
