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
    const presenti = [...E.tecnologie()];
    for (const t of ['print3d', 'laser', 'uv', 'dtf', 'sublimation']) {
      assert.ok(presenti.includes(t), 'manca il profilo ' + t);
    }
  });

  await t.test('il profilo generico esiste come via di migrazione', () => {
    /* Serve alle lavorazioni i cui costi il chiamante ha già in mano —
       serigrafia, ricamo, transfer — e a chi migra da un calcolatore storico.
       Non è una scorciatoia: applica lo stesso modello a costi dichiarati. */
    assert.ok([...E.tecnologie()].includes('generico'));
    const c = E.calcola({
      tecnologia: 'generico', qty: 10,
      costiUnaTantum: [{ id: 'telaio', label: 'Telai serigrafici', value: 40 }],
      costiPerPezzo: [{ id: 'capo', label: 'Capo', value: 3.2 }, { id: 'stampa', label: 'Stampa', value: 0.35 }],
    });
    assert.ok(Math.abs(c.unaTantum.perPezzo - 4) < 0.0001, 'i 40 € di telai su 10 pezzi fanno 4 € a capo');
    assert.ok(Math.abs(c.costoPezzo - (3.2 + 0.35 + 4)) < 0.0001);
  });

  await t.test('generico: a 200 pezzi il telaio pesa 20 centesimi, non 4 euro', () => {
    const base = {
      tecnologia: 'generico',
      costiUnaTantum: [{ id: 'telaio', value: 40 }],
      costiPerPezzo: [{ id: 'capo', value: 3.2 }, { id: 'stampa', value: 0.35 }],
    };
    assert.ok(Math.abs(E.calcola({ ...base, qty: 200 }).unaTantum.perPezzo - 0.2) < 0.0001);
  });

  await t.test('generico: una voce dichiarata non perdibile resta fuori dallo scarto', () => {
    const c = E.calcola({
      tecnologia: 'generico', qty: 1, failureRate: 50,
      costiPerPezzo: [{ id: 'capo', value: 10 }, { id: 'consegna', value: 5, perdibile: false }],
    });
    const scarto = c.perPezzo.voci.find((v) => v.id === 'scarto').value;
    assert.ok(Math.abs(scarto - 10) < 0.0001, 'al 50% si raddoppia il capo, non la consegna');
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

/* ═══════════════════════════════════════════════════════════════════════════
   Un motore condiviso da sei moduli deve reggere garanzie che un calcolatore
   isolato non ha bisogno di dare: non toccare ciò che riceve, rispondere
   sempre allo stesso modo, e non produrre mai un numero che non ha senso —
   qualunque combinazione di ingressi arrivi da qualunque schermata.
   ═══════════════════════════════════════════════════════════════════════════ */

test('immutabilità — il motore non tocca ciò che riceve', async (t) => {
  await t.test('l\'input non viene modificato', () => {
    const input = { ...LASER, qty: 10, extras: [{ cost: 5 }] };
    const copia = JSON.parse(JSON.stringify(input));
    E.calcola(input);
    E.prezzo(10, { strategia: 'margine', marginePct: 40 });
    E.scaglioni(input, [1, 10], {});
    E.explain(input, {});
    assert.equal(JSON.stringify(input), JSON.stringify(copia), 'l\'input è stato modificato');
  });

  await t.test('un risultato non cambia se l\'input cambia dopo', () => {
    /* Il caso vero: una schermata calcola, poi l'utente digita in un campo e
       l'oggetto di stato viene aggiornato. Il preventivo già mostrato non deve
       cambiare da solo sotto gli occhi di chi lo sta leggendo. */
    const input = { ...TREDI, qty: 10 };
    const primo = E.calcola(input);
    const costoPrimo = primo.costoPezzo;
    const vociPrimo = primo.perPezzo.voci.length;

    input.grams = 5000;
    input.qty = 1;
    const secondo = E.calcola(input);

    assert.equal(primo.costoPezzo, costoPrimo, 'il primo risultato è cambiato');
    assert.equal(primo.perPezzo.voci.length, vociPrimo);
    assert.ok(secondo.costoPezzo !== costoPrimo, 'il secondo deve invece riflettere il nuovo input');
  });

  await t.test('modificare il risultato non altera i calcoli successivi', () => {
    const r = E.calcola({ ...TREDI, qty: 5 });
    r.perPezzo.voci.push({ id: 'inventata', value: 999 });
    r.costoPezzo = -1;
    const dopo = E.calcola({ ...TREDI, qty: 5 });
    assert.ok(dopo.costoPezzo > 0);
    assert.ok(!dopo.perPezzo.voci.some((v) => v.id === 'inventata'));
  });
});

test('determinismo — nessun orologio, nessun caso, nessuno stato', async (t) => {
  await t.test('cento chiamate identiche danno cento risultati identici', () => {
    const atteso = JSON.stringify(E.calcola({ ...LASER, qty: 7 }));
    for (let n = 0; n < 100; n += 1) {
      assert.equal(JSON.stringify(E.calcola({ ...LASER, qty: 7 })), atteso, 'variazione alla chiamata ' + n);
    }
  });

  await t.test('l\'ordine delle chiamate non cambia i risultati', () => {
    const a1 = E.calcola({ ...TREDI, qty: 1 }).costoPezzo;
    E.calcola({ ...LASER, qty: 500 });
    E.scaglioni(LASER, null, {});
    const a2 = E.calcola({ ...TREDI, qty: 1 }).costoPezzo;
    assert.equal(a1, a2);
  });

  await t.test('il sorgente non contiene sorgenti di non determinismo', () => {
    /* Non basta che i risultati coincidano oggi: il motore non deve poter
       leggere l'orologio, il caso, l'archivio o la pagina — nemmeno domani. */
    const sorgente = fs.readFileSync('src/product/cost-engine.js', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n').map((r) => (/^\s*\/\//.test(r) ? '' : r)).join('\n');
    for (const vietato of ['Math.random', 'new Date', 'Date.now', 'localStorage', 'document.', 'window.', 'fetch(', 'IDB']) {
      assert.ok(!sorgente.includes(vietato), 'il motore usa ' + vietato);
    }
  });
});

test('invarianti — nessuna combinazione produce un numero senza senso', async (t) => {
  /* Griglia deterministica su tutte le tecnologie: 5 profili × 8 quantità ×
     5 tassi di scarto × 4 tariffe. Non è casualità — è esaustività su una
     griglia scelta, che si può ripetere identica. */
  const BASI = {
    print3d: TREDI,
    laser: LASER,
    uv: { tecnologia: 'uv', printAreaMm2: 10000, inkMlPerM2: 12, inkPricePerMl: 0.35, blankPrice: 4, speedM2Hour: 3, handlingMin: 2 },
    dtf: { tecnologia: 'dtf', printAreaMm2: 40000, filmWidthMm: 600, graphicWidthMm: 200, graphicHeightMm: 250, filmPricePerM2: 8, inkMlPerM2: 14, inkPricePerMl: 0.3, powderGPerM2: 60, powderPricePerKg: 25, blankPrice: 3.2, pressSec: 25, handlingMin: 1 },
    sublimation: { tecnologia: 'sublimation', blankPrice: 5, sheets: 1, sheetPrice: 0.4, printAreaMm2: 60000, inkMlPerM2: 10, inkPricePerMl: 0.5, pressSec: 45, handlingMin: 1 },
    generico: { tecnologia: 'generico', costiPerPezzo: [{ id: 'capo', value: 3.2 }], costiUnaTantum: [{ id: 'telaio', value: 40 }] },
  };

  await t.test('costo mai negativo, mai NaN, mai infinito', () => {
    const rotti = [];
    for (const [tec, base] of Object.entries(BASI)) {
      for (const qty of [1, 2, 5, 10, 100, 1000]) {
        for (const failureRate of [0, 5, 10, 20, 50]) {
          for (const laborPerHour of [0, 18, 120]) {
            const c = E.calcola({ ...base, qty, failureRate, laborPerHour });
            if (!isFinite(c.costoPezzo) || c.costoPezzo < 0) rotti.push({ tec, qty, failureRate, laborPerHour, costo: c.costoPezzo });
            if (!isFinite(c.costoTotale) || c.costoTotale < 0) rotti.push({ tec, qty, nota: 'totale', costo: c.costoTotale });
          }
        }
      }
    }
    assert.equal(rotti.length, 0, JSON.stringify(rotti.slice(0, 3)));
  });

  await t.test('il costo unitario non risale mai al crescere della quantità', () => {
    const rotti = [];
    for (const [tec, base] of Object.entries(BASI)) {
      let prec = Infinity;
      for (const qty of [1, 2, 5, 10, 20, 50, 100, 250, 500, 1000]) {
        const c = E.calcola({ ...base, qty, setupMin: 30 }).costoPezzo;
        if (c > prec + 1e-9) rotti.push({ tec, qty, prec, c });
        prec = c;
      }
    }
    assert.equal(rotti.length, 0, JSON.stringify(rotti.slice(0, 3)));
  });

  await t.test('più scarto non può costare meno', () => {
    const rotti = [];
    for (const [tec, base] of Object.entries(BASI)) {
      let prec = -1;
      for (const failureRate of [0, 1, 5, 10, 20, 40, 60, 80]) {
        const c = E.calcola({ ...base, qty: 10, failureRate }).costoPezzo;
        if (c < prec - 1e-9) rotti.push({ tec, failureRate, prec, c });
        prec = c;
      }
    }
    assert.equal(rotti.length, 0, JSON.stringify(rotti.slice(0, 3)));
  });

  await t.test('una macchina più cara non può costare meno', () => {
    const rotti = [];
    for (const [tec, base] of Object.entries(BASI)) {
      let prec = -1;
      for (const machinePrice of [0, 500, 1200, 3000, 9000]) {
        const c = E.calcola({ ...base, qty: 10, machinePrice, machineLifeHours: 5000, hours: 2 }).costoPezzo;
        if (c < prec - 1e-9) rotti.push({ tec, machinePrice, prec, c });
        prec = c;
      }
    }
    assert.equal(rotti.length, 0, JSON.stringify(rotti.slice(0, 3)));
  });

  await t.test('una manodopera più cara non può costare meno', () => {
    const rotti = [];
    for (const [tec, base] of Object.entries(BASI)) {
      let prec = -1;
      for (const laborPerHour of [0, 10, 18, 35, 80]) {
        const c = E.calcola({ ...base, qty: 10, laborPerHour, setupMin: 20, finishMin: 5, handlingMin: 5 }).costoPezzo;
        if (c < prec - 1e-9) rotti.push({ tec, laborPerHour, prec, c });
        prec = c;
      }
    }
    assert.equal(rotti.length, 0, JSON.stringify(rotti.slice(0, 3)));
  });

  await t.test('margine sempre sotto il 100, ricarico mai sotto il −100', () => {
    const rotti = [];
    for (const costo of [0, 0.01, 1, 100, 10000]) {
      for (const strategia of ['margine', 'ricarico', 'fisso']) {
        for (const scontoPct of [0, 25, 50, 99]) {
          const p = E.prezzo(costo, { strategia, marginePct: 40, ricarico: 1.4, prezzoFisso: 50, scontoPct });
          if (p.marginePct > 100 + 1e-9) rotti.push({ costo, strategia, scontoPct, margine: p.marginePct });
          if (p.ricaricoPct < -100 - 1e-9) rotti.push({ costo, strategia, scontoPct, ricarico: p.ricaricoPct });
          if (!isFinite(p.netto) || !isFinite(p.profittoOperativo)) rotti.push({ costo, strategia, scontoPct, nota: 'non finito' });
        }
      }
    }
    assert.equal(rotti.length, 0, JSON.stringify(rotti.slice(0, 3)));
  });
});

test('profitto reale — l\'IVA non è mai profitto', async (t) => {
  await t.test('quattro livelli, ognuno più basso del precedente', () => {
    const p = E.prezzo(100, {
      strategia: 'margine', marginePct: 50, ivaPct: 22,
      commissionePct: 10, commissioneFissa: 0.35, spedizione: 6, altriCostiVariabili: 2,
    });
    assert.ok(p.profittoLordo > p.profittoDopoCommissioni);
    assert.ok(p.profittoDopoCommissioni > p.profittoDopoSpedizione);
    assert.ok(p.profittoDopoSpedizione > p.profittoOperativo);
    assert.equal(+(p.profittoLordo).toFixed(6), 100);
  });

  await t.test('la spedizione entra nel conto, non solo nella vista', () => {
    const senza = E.prezzo(100, { strategia: 'fisso', prezzoFisso: 200 });
    const con = E.prezzo(100, { strategia: 'fisso', prezzoFisso: 200, spedizione: 8 });
    assert.equal(con.profittoOperativo, senza.profittoOperativo - 8);
  });

  await t.test('la spedizione addebitata al cliente non è un costo', () => {
    const p = E.prezzo(100, { strategia: 'fisso', prezzoFisso: 200, spedizione: 8, spedizioneAddebitata: true });
    assert.equal(p.spedizione, 0);
    assert.equal(p.profittoOperativo, 100);
  });

  await t.test('l\'IVA non compare in nessuna riga di profitto', () => {
    const senzaIva = E.prezzo(100, { strategia: 'fisso', prezzoFisso: 200, ivaPct: 0 });
    const conIva = E.prezzo(100, { strategia: 'fisso', prezzoFisso: 200, ivaPct: 22 });
    assert.equal(senzaIva.profittoLordo, conIva.profittoLordo);
    assert.equal(senzaIva.profittoOperativo, conIva.profittoOperativo);
  });
});

test('validateInput — dice cosa manca prima di calcolare', async (t) => {
  await t.test('distingue un problema da un\'incompletezza', () => {
    const v = E.validateInput({ tecnologia: 'print3d', grams: 50 });
    assert.equal(v.ok, true, 'un input incompleto non è un errore');
    assert.ok(v.avvisi.some((a) => /materialPricePerKg/.test(a)));
  });

  await t.test('uno scarto impossibile è un problema, non un avviso', () => {
    const v = E.validateInput({ tecnologia: 'print3d', failureRate: 95 });
    assert.equal(v.ok, false);
    assert.ok(v.problemi.some((p) => /failureRate/.test(p)));
  });

  await t.test('un campo che nessun profilo legge viene segnalato', () => {
    /* Un numero scritto in un campo dal nome sbagliato non protesta da solo:
       resta lì, e il preventivo esce più basso senza che nessuno capisca. */
    const v = E.validateInput({ tecnologia: 'laser', costoMateriale: 12 });
    assert.ok(v.avvisi.some((a) => /costoMateriale.*ignorato/.test(a)));
  });

  await t.test('un valore negativo viene detto, non taciuto', () => {
    const v = E.validateInput({ tecnologia: 'print3d', grams: -50 });
    assert.ok(v.avvisi.some((a) => /negativo/.test(a)));
  });

  await t.test('una tecnologia sconosciuta è un problema', () => {
    assert.equal(E.validateInput({ tecnologia: 'magia' }).ok, false);
  });
});

test('explain — da dove arriva il prezzo', async (t) => {
  const spiegazione = E.explain({ ...TREDI, qty: 10, failureRate: 8, packagingPerUnit: 0.5, overheadPct: 10 },
    { strategia: 'margine', marginePct: 45, ivaPct: 22, commissionePct: 8, spedizione: 4 });

  await t.test('ogni riga porta etichetta, formula, ingressi e risultato', () => {
    assert.ok(spiegazione.voci.length > 8);
    for (const r of spiegazione.voci) {
      assert.ok(r.label, 'riga senza etichetta');
      assert.ok(r.formula, 'riga senza formula: ' + r.label);
      assert.ok(typeof r.result === 'number' && isFinite(r.result), 'risultato non numerico: ' + r.label);
      assert.ok(r.fonte, 'riga senza provenienza: ' + r.label);
    }
  });

  await t.test('copre tutto il tragitto: costo, prezzo, IVA, profitto', () => {
    const gruppi = new Set(spiegazione.voci.map((r) => r.gruppo));
    for (const g of ['una tantum', 'per pezzo', 'costo', 'prezzo', 'profitto']) {
      assert.ok(gruppi.has(g), 'manca il gruppo ' + g);
    }
    const ids = spiegazione.voci.map((r) => r.id);
    for (const id of ['costoPezzo', 'netto', 'iva', 'lordo', 'profittoLordo', 'operativo']) {
      assert.ok(ids.includes(id), 'manca la riga ' + id);
    }
  });

  await t.test('le somme del dettaglio tornano con il totale', () => {
    const costo = spiegazione.voci.find((r) => r.id === 'costoPezzo').result;
    assert.ok(Math.abs(costo - spiegazione.costo.costoPezzo) < 1e-9);
    const netto = spiegazione.voci.find((r) => r.id === 'netto').result;
    const iva = spiegazione.voci.find((r) => r.id === 'iva').result;
    const lordo = spiegazione.voci.find((r) => r.id === 'lordo').result;
    assert.ok(Math.abs(netto + iva - lordo) < 1e-9);
  });

  await t.test('la provenienza di un numero configurato viene riportata', () => {
    /* Il motore non può sapere da dove arriva un numero: lo dichiara chi lo
       chiama. Quello che sa dire da sé è se il campo c'era o no. */
    const s = E.explain({ ...TREDI, qty: 1, fonti: { kwhPrice: 'configurato', materialPricePerKg: 'magazzino' } }, {});
    assert.equal(s.voci.find((r) => r.id === 'energia').fonte, 'configurato');
    assert.equal(s.voci.find((r) => r.id === 'materiale').fonte, 'magazzino');
  });

  await t.test('un dato mancante si dichiara mancante, non si finge', () => {
    const s = E.explain({ tecnologia: 'print3d', grams: 10, materialPricePerKg: 20, failureRate: 5 }, {});
    assert.equal(s.voci.find((r) => r.id === 'scarto').fonte, 'inserito');
    const s2 = E.explain({ tecnologia: 'print3d', grams: 10, materialPricePerKg: 20 }, {});
    assert.ok(!s2.voci.some((r) => r.id === 'scarto'), 'senza tasso non si inventa uno scarto');
  });

  await t.test('quando il pavimento scatta, lo dice', () => {
    const s = E.explain({ ...TREDI, qty: 1 }, { strategia: 'ricarico', ricarico: 1.4, scontoPct: 35, marginePavimentoPct: 20 });
    assert.ok(s.voci.some((r) => r.id === 'pavimento'));
  });

  await t.test('porta con sé la validazione dell\'input', () => {
    assert.ok(spiegazione.validazione);
    assert.equal(typeof spiegazione.validazione.ok, 'boolean');
  });
});

test('API stabile', () => {
  for (const nome of ['version', 'calcola', 'prezzo', 'scaglioni', 'preventiva', 'validateInput', 'explain', 'tecnologie']) {
    assert.ok(E[nome] !== undefined, 'manca ' + nome);
  }
  assert.match(E.version, /^\d+\.\d+\.\d+$/);
});
