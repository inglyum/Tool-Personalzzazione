/**
 * quoter3d-view.test.mjs — la vista non calcola prezzi.
 *
 * Il difetto misurato nella vista precedente: `PRICES = {p1: costo × 3.5}`.
 * Lo slider «margine» andava dal 10 all'80%, ed era usato solo per un avviso.
 * Chi impostava il 40% otteneva un margine del 71,4% — su un costo di 18,68 €,
 * 65,38 € invece di 31,13 €. Il 110% in più di quanto avesse chiesto.
 *
 * Da qui in poi la vista legge, il motore calcola, la vista disegna.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, String, Number, Date, parseFloat, isFinite, console });
for (const f of ['cost-engine.js', 'quoter3d-view.js']) {
  vm.runInContext(fs.readFileSync('src/product/' + f, 'utf8'), contesto);
}
const E = contesto.InglyCostEngine;
const V = contesto.InglyQuoter3DView;

const CASO = {
  tecnologia: 'print3d', grams: 290, hours: 9.95, qty: 1,
  materialPricePerKg: 24, watt: 150, kwhPrice: 0.28, dutyCycle: 0.6,
  machinePrice: 400, machineLifeHours: 2000, maintenancePerHour: 0.12,
  failureRate: 7, laborPerHour: 18, setupMin: 15, finishMin: 10,
};
const vicino = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) < t, a + ' ≉ ' + b);

/* ═══════════════════════════════════════════════════════════════════════════
   1. IL PREZZO ARRIVA DAL MOTORE
   ═══════════════════════════════════════════════════════════════════════════ */
test('chi chiede il 40% ottiene il 40%', async (t) => {
  const r = V.calcola(CASO, { modalita: 'completo', marginePct: 40 });

  await t.test('il margine ottenuto è quello chiesto', () => {
    vicino(r.marginePct, 40, 0.0001);
  });

  await t.test('e il prezzo è costo / (1 − 0,40)', () => {
    vicino(r.prezzo, r.costo / 0.6, 0.0001);
  });

  await t.test('non è costo × 3,5, che era il difetto', () => {
    const vecchio = r.costo * 3.5;
    assert.ok(vecchio > r.prezzo * 2, 'il vecchio prezzo era ' + (vecchio / r.prezzo).toFixed(1) + '× il giusto');
    const margineVecchio = (vecchio - r.costo) / vecchio * 100;
    vicino(margineVecchio, 71.43, 0.01);
  });

  await t.test('ogni margine chiesto è il margine ottenuto', () => {
    for (const m of [10, 25, 40, 55, 70, 80]) {
      vicino(V.calcola(CASO, { modalita: 'completo', marginePct: m }).marginePct, m, 0.0001);
    }
  });

  await t.test('la vista non contiene una sola moltiplicazione di prezzo', () => {
    /* Il presidio che impedisce al difetto di tornare: se un giorno qualcuno
       riscrive `costo * moltiplicatore` in questo file, il test lo dice. */
    const sorgente = fs.readFileSync('src/product/quoter3d-view.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const vietato of [/costo\s*\*\s*[\d.]/, /\*\s*\(\s*1\s*\+/, /\/\s*\(\s*1\s*-/, /markup/i, /moltiplicatore\s*[*=]/]) {
      assert.ok(!vietato.test(sorgente), 'la vista contiene matematica di prezzo: ' + vietato);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   2. LE TRE MODALITÀ
   ═══════════════════════════════════════════════════════════════════════════ */
test('le tre modalità rispondono a tre domande', async (t) => {
  const c = (m) => V.calcola(CASO, { modalita: m, marginePct: 40 });

  await t.test('Hobby è il costo di stampa', () => {
    const r = c('stampa');
    vicino(r.costo, 7.21);
    assert.equal(r.modalitaLabel, 'Hobby');
  });

  await t.test('Maker aggiunge macchina, manutenzione e scarto', () => vicino(c('macchina').costo, 11.18));
  await t.test('Business aggiunge il tuo tempo', () => vicino(c('completo').costo, 18.68));

  await t.test('il costo di stampa si vede sempre, accanto a quello scelto', () => {
    /* È tutta la risposta alla domanda «perché non torna con Bambu»: i due
       numeri stanno uno accanto all'altro, e la domanda smette di porsi. */
    for (const m of ['stampa', 'macchina', 'completo']) {
      vicino(c(m).costoStampa, 7.21);
    }
  });

  await t.test('e ogni modalità dice cosa ha lasciato fuori', () => {
    const r = c('stampa');
    assert.ok(r.escluse.length >= 3);
    assert.ok(r.esclusoTotale > 10);
    assert.equal(c('completo').escluse.length, 0);
  });

  await t.test('una modalità sconosciuta ricade su Business, non esplode', () => {
    vicino(V.calcola(CASO, { modalita: 'astrologia', marginePct: 40 }).costo, 18.68);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   3. LE QUATTRO OFFERTE
   ═══════════════════════════════════════════════════════════════════════════ */
test('le cinque posizioni di prezzo puntano a un margine', async (t) => {
  const r = V.calcola(CASO, { modalita: 'macchina', marginePct: 40 });

  await t.test('ce ne sono quattro, e una è consigliata', () => {
    /* Competitivo, B2B, Standard, Premium, Luxury: cinque posizioni
       commerciali, non cinque moltiplicatori. */
    assert.equal(r.strategie.length, Object.keys(E.POLITICHE).length);
    assert.ok(r.strategie.some((s) => s.id === 'b2b'), 'il B2B è una posizione, non uno sconto');
    assert.equal(r.strategie.filter((s) => s.raccomandata).length, 1);
    assert.equal(r.strategie.find((s) => s.raccomandata).id, 'standard');
  });

  await t.test('ognuna ottiene il margine che dichiara', () => {
    r.strategie.forEach((s) => vicino(s.marginePct, s.marginTarget, 0.0001));
  });

  await t.test('i prezzi crescono con il margine obiettivo', () => {
    const ordinate = r.strategie.slice().sort((a, b) => a.marginTarget - b.marginTarget);
    for (let i = 1; i < ordinate.length; i++) {
      assert.ok(ordinate[i].prezzo > ordinate[i - 1].prezzo,
        ordinate[i].label + ' non costa più di ' + ordinate[i - 1].label);
    }
  });

  await t.test('margine e ricarico sono due numeri distinti', () => {
    r.strategie.forEach((s) => {
      assert.notEqual(s.marginePct.toFixed(2), s.ricaricoPct.toFixed(2),
        s.label + ': margine e ricarico non possono coincidere');
      assert.ok(s.ricaricoPct > s.marginePct, 'il ricarico è sempre maggiore del margine');
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   4. LE QUANTITÀ
   ═══════════════════════════════════════════════════════════════════════════ */
test('gli scaglioni, e le tre domande diverse', async (t) => {
  const r = V.calcola({ ...CASO, setupMin: 60 }, { modalita: 'completo', marginePct: 40,
    quantita: [1, 5, 10, 25, 50, 100, 250, 500, 1000] });

  await t.test('nove scaglioni calcolati', () => assert.equal(r.scaglioni.length, 9));

  await t.test('il costo unitario scende con la quantità', () => {
    for (let i = 1; i < r.scaglioni.length; i++) {
      assert.ok(r.scaglioni[i].costoPezzo <= r.scaglioni[i - 1].costoPezzo);
    }
  });

  await t.test('perché l\'avviamento si divide, non perché si sconta', () => {
    const uno = r.scaglioni[0], mille = r.scaglioni[r.scaglioni.length - 1];
    /* 60 min a 18 €/h = 18 € su un pezzo, 0,018 € su mille. */
    vicino(uno.costoPezzo - mille.costoPezzo, 18 - 0.018, 0.05);
    r.scaglioni.forEach((s) => vicino(s.marginePct, 40, 0.0001));
  });

  await t.test('le tre evidenziazioni rispondono a tre domande', () => {
    assert.ok(r.miglioriScaglioni.unitario);
    assert.ok(r.miglioriScaglioni.profitto);
    assert.ok(r.miglioriScaglioni.cliente);
    assert.equal(r.miglioriScaglioni.unitario, 1000, 'il costo unitario più basso è alla quantità più alta');
    assert.equal(r.miglioriScaglioni.profitto, 1000, 'con margine costante, il profitto totale cresce con la quantità');
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   5. NIENTE NUMERI INVENTATI
   ═══════════════════════════════════════════════════════════════════════════ */
test('quando non si può calcolare', async (t) => {
  await t.test('senza peso né ore lo dice, invece di mostrare zero', () => {
    const r = V.calcola({ tecnologia: 'print3d', qty: 1 }, { modalita: 'completo', marginePct: 40 });
    assert.equal(r.indisponibile, true);
    assert.match(r.motivo, /peso|ore/i);
  });

  await t.test('senza motore non indovina un prezzo', () => {
    const isolato = vm.createContext({ Math, JSON, Object, Array, String, Number, Date, parseFloat, isFinite, console });
    vm.runInContext(fs.readFileSync('src/product/quoter3d-view.js', 'utf8'), isolato);
    const r = isolato.InglyQuoter3DView.calcola(CASO, { marginePct: 40 });
    assert.equal(r.indisponibile, true);
    assert.match(r.motivo, /motore/i);
  });

  await t.test('e la vista lo dice a schermo, senza numeri', () => {
    const html = V.hero({ indisponibile: true, motivo: 'Inserisci peso e ore di stampa' });
    assert.match(html, /Inserisci peso e ore/);
    assert.ok(!/€\s*0[.,]00/.test(html), 'nessuno zero travestito da costo');
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   6. OGNI NUMERO DICE DA DOVE VIENE
   ═══════════════════════════════════════════════════════════════════════════ */
test('le fonti', async (t) => {
  const r = V.calcola(CASO, { modalita: 'completo', marginePct: 40,
    fonti: { materiale: 'resolver', energia: 'macchina' } });

  await t.test('ogni voce porta una fonte', () => {
    r.voci.forEach((v) => assert.ok(v.fonte, v.id + ' senza fonte'));
  });

  await t.test('le fonti dichiarate sopravvivono', () => {
    assert.equal(r.voci.find((v) => v.id === 'materiale').fonte, 'resolver');
    assert.equal(r.voci.find((v) => v.id === 'energia').fonte, 'macchina');
  });

  await t.test('quelle non dichiarate sono «predefinito», non inventate', () => {
    assert.equal(r.voci.find((v) => v.id === 'macchina').fonte, 'predefinito');
  });

  await t.test('e il badge le mostra', () => {
    assert.match(V.badgeFonte('resolver'), /registro/);
    assert.match(V.badgeFonte('predefinito'), /predefinito/);
    assert.match(V.badgeFonte('cosa-inventata'), /predefinito/);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   7. LA CALIBRAZIONE A SCHERMO
   ═══════════════════════════════════════════════════════════════════════════ */
test('il pannello di calibrazione', async (t) => {
  const k = E.calibra(CASO, { costo: 4.50, sistema: 'Bambu Studio' });
  const html = V.calibrazione(k);

  await t.test('mostra tutti e tre i livelli', () => {
    assert.match(html, /Costo di stampa/);
    assert.match(html, /Costo di produzione/);
    assert.match(html, /Costo aziendale pieno/);
  });

  await t.test('indica quale risponde alla stessa domanda', () => {
    assert.match(html, /stessa domanda/);
  });

  await t.test('e spiega la differenza, senza aggiustarla', () => {
    assert.match(html, /Perché sono diversi/);
    assert.match(html, /15[.,]52/);
    assert.ok(!/fudge|fattore|correttiv/i.test(html));
  });

  await t.test('senza riferimento invita a inserirlo', () => {
    assert.match(V.calibrazione({ confrontabile: false }), /riferimento/i);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   8. IL DISEGNO NON ROMPE NIENTE
   ═══════════════════════════════════════════════════════════════════════════ */
test('le sezioni si disegnano', async (t) => {
  const r = V.calcola(CASO, { modalita: 'completo', marginePct: 40, quantita: [1, 10, 100] });

  for (const [nome, fn] of [['hero', V.hero], ['dettaglio', V.dettaglio], ['strategie', V.strategie], ['quantità', V.quantita]]) {
    await t.test(nome + ' produce HTML', () => {
      const h = fn(r);
      assert.ok(typeof h === 'string' && h.length > 50, nome + ' vuoto');
      assert.ok(!/undefined|NaN|\[object/.test(h), nome + ' contiene un valore non calcolato');
    });
  }

  await t.test('e con un risultato indisponibile non esplodono', () => {
    const vuoto = { indisponibile: true, motivo: 'niente' };
    [V.hero, V.dettaglio, V.strategie, V.quantita].forEach((fn) => {
      assert.equal(typeof fn(vuoto), 'string');
    });
  });

  await t.test('il testo che viene dai dati passa da esc()', () => {
    const cattivo = V.calcola(CASO, { modalita: 'completo', marginePct: 40 });
    cattivo.modalitaSotto = '<img src=x onerror=alert(1)>';
    assert.ok(!/<img/.test(V.hero(cattivo)), 'HTML non sfuggito nella vista');
  });
});
