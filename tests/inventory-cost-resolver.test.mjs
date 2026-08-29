/**
 * inventory-cost-resolver.test.mjs — quanto costa davvero, e come si fa a saperlo.
 *
 * Prima di questo modulo la risposta arrivava da `item.costPrice`: un numero
 * digitato una volta, che nessuno aggiorna, e che è il prezzo che il fornitore
 * faceva quando l'articolo è stato creato. Il registro sa quanto è stato
 * pagato davvero, quando e in quali lotti; qui si trasforma in un costo.
 *
 * I casi golden sono quelli della specifica, con i numeri scritti a mano.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, String, Number, Date, parseFloat, isFinite, console });
for (const f of ['inventory-ledger.js', 'inventory-cost-resolver.js']) {
  vm.runInContext(fs.readFileSync('src/product/' + f, 'utf8'), contesto);
}
const L = contesto.InglyInventoryLedger;
const R = contesto.InglyInventoryCostResolver;

const CHIAVE = 'items:7';
let seq = 0;
function catena(passi, chiave = CHIAVE) {
  let q = 0;
  return passi.map((p, n) => {
    const m = L.crea({ itemId: chiave, warehouseId: 'w1', unit: 'pz', id: 'mv' + (++seq),
      timestamp: new Date(Date.UTC(2026, 0, 1, 10) + n * 86400000).toISOString(), ...p }, q);
    q = m.resultingQuantity;
    return m;
  });
}
const vicino = (a, b, tol = 0.000001) => assert.ok(Math.abs(a - b) < tol, a + ' ≉ ' + b);

/* ═══════════════════════════════════════════════════════════════════════════
   I CASI GOLDEN DELLA SPECIFICA
   ═══════════════════════════════════════════════════════════════════════════ */
test('golden · caso A — un solo acquisto', async (t) => {
  const mov = catena([{ type: 'PURCHASE', quantity: 100, unitCost: 1 }]);

  await t.test('ultimo = 1', () => vicino(R.getLastCost(mov, CHIAVE).costo, 1));
  await t.test('media = 1', () => vicino(R.getWeightedAverageCost(mov, CHIAVE).costo, 1));
  await t.test('fifo = 1', () => vicino(R.getFifoCost(mov, CHIAVE).costo, 1));
});

test('golden · caso B — due acquisti a prezzi diversi', async (t) => {
  const mov = catena([
    { type: 'PURCHASE', quantity: 100, unitCost: 1 },
    { type: 'PURCHASE', quantity: 50, unitCost: 2 },
  ]);

  await t.test('ultimo = 2 — l\'ultima entrata', () => vicino(R.getLastCost(mov, CHIAVE).costo, 2));

  await t.test('media = 1,333… — (100×1 + 50×2) / 150', () => {
    const r = R.getWeightedAverageCost(mov, CHIAVE);
    vicino(r.costo, 200 / 150);
    vicino(r.costo, 1.3333333333);
  });

  await t.test('fifo = 1 — il primo lotto è ancora aperto', () => {
    /* La specifica dice 1, e ha ragione per una ragione precisa: senza un
       consumo il lotto da 100 a 1 € è intatto e il FIFO preleva da lì. */
    vicino(R.getFifoCost(mov, CHIAVE, { quantity: 1 }).costo, 1);
  });

  await t.test('e il residuo valorizzato è la media dei due lotti aperti', () => {
    /* Domanda diversa: «quanto vale quello che ho», non «quanto mi costa
       prelevarne uno». Due domande, due numeri, entrambi giusti. */
    vicino(R.getFifoCost(mov, CHIAVE).costo, 200 / 150);
  });
});

test('golden · caso C — consumo di 120 su due lotti', async (t) => {
  const mov = catena([
    { type: 'PURCHASE', quantity: 100, unitCost: 1 },
    { type: 'PURCHASE', quantity: 50, unitCost: 2 },
  ]);
  const r = R.getFifoCost(mov, CHIAVE, { quantity: 120 });

  await t.test('100 @ 1 + 20 @ 2 = 140 €', () => vicino(r.costoTotale, 140));
  await t.test('il costo unitario è 140 / 120', () => vicino(r.costo, 140 / 120));
  await t.test('la copertura è completa', () => {
    assert.equal(r.coperta, 120);
    assert.equal(r.scoperta, 0);
    assert.equal(r.completa, true);
  });
  await t.test('e dice quali lotti ha usato', () => {
    assert.equal(r.lineage.length, 2);
    assert.equal(r.lineage.map((l) => l.quantita).join(','), '100,20');
    assert.equal(r.lineage.map((l) => l.costoUnitario).join(','), '1,2');
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   IL COSTO STORICO — la regola della Fase 30, applicata al magazzino
   ═══════════════════════════════════════════════════════════════════════════ */
test('il listino di oggi non tocca i costi di ieri', async (t) => {
  const catalogo = { costPrice: 1.20 };
  const mov = catena([{ type: 'PURCHASE', quantity: 100, unitCost: catalogo.costPrice }]);

  await t.test('risolto a 1,20', () => vicino(R.risolvi(mov, CHIAVE).costo, 1.20));

  await t.test('il listino sale a 1,70 e il resolver non si muove', () => {
    catalogo.costPrice = 1.70;
    vicino(R.risolvi(mov, CHIAVE).costo, 1.20);
    vicino(R.getLastCost(mov, CHIAVE).costo, 1.20);
    vicino(R.getFifoCost(mov, CHIAVE, { quantity: 10 }).costo, 1.20);
  });

  await t.test('il resolver non legge nessun listino: non ne conosce l\'esistenza', () => {
    const sorgente = fs.readFileSync('src/product/inventory-cost-resolver.js', 'utf8');
    for (const vietato of ['costPrice', 'salePrice', 'catalog', 'listino']) {
      assert.ok(!new RegExp('\\b' + vietato + '\\b').test(sorgente.replace(/\/\*[\s\S]*?\*\//g, '')),
        'il resolver nomina «' + vietato + '» nel codice: deve leggere solo il registro');
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   DA 0 A 1000 MOVIMENTI
   ═══════════════════════════════════════════════════════════════════════════ */
test('il resolver regge qualunque numero di movimenti', async (t) => {
  for (const n of [0, 1, 2, 10, 100, 1000]) {
    await t.test(n + ' movimenti', () => {
      const passi = [];
      for (let i = 0; i < n; i++) {
        passi.push(i % 2 === 0
          ? { type: 'PURCHASE', quantity: 10, unitCost: 1 + (i % 5) * 0.1 }
          : { type: 'CONSUMPTION', quantity: 4, unitCost: 1 });
      }
      const mov = catena(passi, 'items:' + n);
      const r = R.risolvi(mov, 'items:' + n);

      if (n === 0) {
        assert.equal(r.disponibile, false);
        assert.equal(r.motivo, R.MOTIVI.NESSUN_REGISTRO);
        return;
      }
      assert.equal(r.disponibile, true, r.motivo);
      /* La media resta dentro l'intervallo dei prezzi pagati: se ne esce,
         qualcosa sta pesando quantità che non ha comprato. */
      assert.ok(r.costo >= 1 && r.costo <= 1.4, 'media fuori intervallo: ' + r.costo);
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   NIENTE COSTI INVENTATI
   ═══════════════════════════════════════════════════════════════════════════ */
test('quello che il resolver non fa mai', async (t) => {
  await t.test('un articolo senza registro non vale zero euro', () => {
    const r = R.risolvi([], 'items:99');
    assert.equal(r.disponibile, false);
    assert.equal(r.costo, null, 'null significa «non lo so»; 0 significherebbe «è gratis»');
    assert.equal(r.motivo, R.MOTIVI.NESSUN_REGISTRO);
  });

  await t.test('movimenti senza costo non producono un costo', () => {
    const mov = catena([{ type: 'PURCHASE', quantity: 10 }, { type: 'CONSUMPTION', quantity: 3 }], 'items:80');
    const r = R.risolvi(mov, 'items:80');
    assert.equal(r.disponibile, false);
    assert.equal(r.motivo, R.MOTIVI.NESSUNA_ENTRATA);
    assert.equal(r.costo, null);
  });

  await t.test('una riga non collegata al magazzino lo dichiara', () => {
    const r = R.risolviRiga([], { label: 'Manodopera', unitCost: 18, qty: 2 });
    assert.equal(r.disponibile, false);
    assert.equal(r.motivo, R.MOTIVI.NESSUN_ARTICOLO);
    assert.equal(r.dichiarato, 18, 'il costo digitato resta leggibile: è quello che il preventivo userà');
  });

  await t.test('senza registro caricato, il resolver non indovina', () => {
    const isolato = vm.createContext({ Math, JSON, Object, Array, String, Number, Date, parseFloat, isFinite, console });
    vm.runInContext(fs.readFileSync('src/product/inventory-cost-resolver.js', 'utf8'), isolato);
    const r2 = isolato.InglyInventoryCostResolver.risolvi([], 'items:1');
    assert.equal(r2.disponibile, false);
    assert.equal(r2.motivo, isolato.InglyInventoryCostResolver.MOTIVI.REGISTRO_ASSENTE);
  });

  await t.test('una politica inventata ricade sulla predefinita, non su un errore', () => {
    const mov = catena([{ type: 'PURCHASE', quantity: 10, unitCost: 3 }], 'items:81');
    const r = R.risolvi(mov, 'items:81', { policy: 'oroscopo' });
    assert.equal(r.policy, R.PREDEFINITA);
    assert.equal(r.disponibile, true);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   COPERTURA PARZIALE — la quantità scoperta non diventa zero euro
   ═══════════════════════════════════════════════════════════════════════════ */
test('quando il registro non copre tutta la richiesta', async (t) => {
  const mov = catena([{ type: 'PURCHASE', quantity: 30, unitCost: 2 }], 'items:82');
  const r = R.getFifoCost(mov, 'items:82', { quantity: 100 });

  await t.test('risponde, ma dichiara quanto ha coperto', () => {
    assert.equal(r.disponibile, true);
    assert.equal(r.coperta, 30);
    assert.equal(r.scoperta, 70);
    assert.equal(r.completa, false);
  });

  await t.test('il costo vale per la parte coperta, non è diluito con degli zeri', () => {
    vicino(r.costo, 2, 0.0001);
    vicino(r.costoTotale, 60);
  });

  await t.test('se nessun lotto ha un costo, non risponde affatto', () => {
    const senza = catena([{ type: 'PURCHASE', quantity: 30 }], 'items:83');
    const r2 = R.getFifoCost(senza, 'items:83', { quantity: 10 });
    assert.equal(r2.disponibile, false);
    assert.equal(r2.motivo, R.MOTIVI.LOTTI_SENZA_COSTO);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   PROVENIENZA — «da dove arriva questo € 1,47»
   ═══════════════════════════════════════════════════════════════════════════ */
test('ogni costo sa da dove viene', async (t) => {
  const mov = catena([
    { type: 'PURCHASE', quantity: 100, unitCost: 1.20, referenceType: 'PURCHASE_ORDER', referenceId: 'ODF-14', supplierId: 'legnami-sud' },
    { type: 'PURCHASE', quantity: 50, unitCost: 2.00, referenceType: 'PURCHASE_ORDER', referenceId: 'ODF-31', supplierId: 'plexisicilia' },
  ], 'items:90');
  const r = R.getWeightedAverageCost(mov, 'items:90');

  await t.test('la provenienza elenca le entrate che l\'hanno prodotto', () => {
    assert.equal(r.lineage.length, 2);
    assert.equal(r.lineage.map((l) => l.costoUnitario).join(','), '1.2,2');
    assert.equal(r.lineage.map((l) => l.documento).join(' | '), 'PURCHASE_ORDER ODF-14 | PURCHASE_ORDER ODF-31');
    assert.equal(r.lineage.map((l) => l.fornitore).join(','), 'legnami-sud,plexisicilia');
  });

  await t.test('la spiegazione è leggibile da chi non ha scritto il codice', () => {
    const s = R.spiega(r);
    assert.equal(s.disponibile, true);
    assert.equal(s.metodo, 'Media ponderata');
    assert.match(s.base, /2 entrate/);
    assert.equal(s.righe.length, 2);
    assert.equal(s.righe[0].cosa, 'Acquisto');
    assert.equal(s.righe[0].quando, '2026-01-01');
  });

  await t.test('e quando non c\'è un costo, la spiegazione dice perché', () => {
    const s = R.spiega(R.risolvi([], 'items:404'));
    assert.equal(s.disponibile, false);
    assert.match(s.motivo, /Nessun movimento/);
    assert.equal(s.righe.length, 0);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   IL CONGELAMENTO PER LO SNAPSHOT — la Fase 30 e la Fase 31 si incontrano
   ═══════════════════════════════════════════════════════════════════════════ */
test('il costo risolto entra nello storico con la sua provenienza', async (t) => {
  const mov = catena([
    { type: 'PURCHASE', quantity: 100, unitCost: 1.20 },
    { type: 'PURCHASE', quantity: 50, unitCost: 2.00 },
  ], 'items:91');
  const esito = R.risolviRiga(mov, { itemKey: 'items:91', label: 'MDF 3mm', unitCost: 1.5, qty: 10 });
  const gelo = R.congelaPerSnapshot(esito);

  await t.test('congela politica, costo, base e movimenti', () => {
    assert.equal(gelo.costingPolicy, 'media');
    assert.equal(gelo.costingPolicyLabel, 'Media ponderata');
    vicino(gelo.unitCost, 220 / 150);   // (100×1,20 + 50×2,00) / 150
    assert.match(gelo.costBasis, /entrate/);
    assert.equal(gelo.transactionRefs.length, 2);
    assert.equal(gelo.available, true);
  });

  await t.test('conserva anche il costo dichiarato sulla riga', () => {
    assert.equal(gelo.declaredCost, 1.5);
  });

  await t.test('e la versione del resolver, per rileggere fra due anni', () => {
    assert.equal(gelo.resolverVersion, R.version);
    assert.ok(gelo.resolvedAt);
  });

  await t.test('lo scostamento fra digitato e pagato è calcolato', () => {
    /* 1,467 contro 1,50 dichiarato: chi legge il preventivo deve poterlo
       vedere, perché è la differenza fra credere di guadagnare e guadagnare. */
    assert.ok(esito.scostamentoPct < 0);
    vicino(esito.scostamentoPct, ((220 / 150) - 1.5) / 1.5 * 100, 0.0001);
  });

  await t.test('un costo non disponibile si congela come non disponibile', () => {
    const g2 = R.congelaPerSnapshot(R.risolviRiga([], { label: 'x', unitCost: 9 }));
    assert.equal(g2.available, false);
    assert.equal(g2.unitCost, null);
    assert.equal(g2.declaredCost, 9);
    assert.match(g2.reason, /non collegato/);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   PRESTAZIONI — misurate, non ipotizzate
   ═══════════════════════════════════════════════════════════════════════════ */
test('prestazioni', async (t) => {
  for (const n of [100, 1000, 10000, 100000]) {
    await t.test(n + ' movimenti', () => {
      const passi = [];
      for (let i = 0; i < n; i++) {
        passi.push(i % 2 === 0
          ? { type: 'PURCHASE', quantity: 10, unitCost: 1.5 }
          : { type: 'CONSUMPTION', quantity: 4, unitCost: 1.5 });
      }
      const chiave = 'perf:' + n;
      const mov = catena(passi, chiave);

      const t0 = Date.now();
      const ultimo = R.getLastCost(mov, chiave);
      const t1 = Date.now();
      const media = R.getWeightedAverageCost(mov, chiave);
      const t2 = Date.now();
      const f = R.getFifoCost(mov, chiave, { quantity: 50 });
      const t3 = Date.now();

      assert.equal(ultimo.disponibile, true);
      assert.equal(media.disponibile, true);
      assert.equal(f.disponibile, true);

      /* Le soglie sono larghe di proposito: servono a intercettare una
         regressione di ordine di grandezza, non a inseguire i millisecondi.
         Un cricchetto stretto su un tempo di esecuzione fallisce sul portatile
         di qualcun altro e viene disattivato, che è il peggiore dei mondi. */
      const soglia = n <= 1000 ? 100 : n <= 10000 ? 500 : 4000;
      for (const [nome, ms] of [['ultimo', t1 - t0], ['media', t2 - t1], ['fifo', t3 - t2]]) {
        assert.ok(ms < soglia, nome + ' su ' + n + ' movimenti: ' + ms + ' ms (soglia ' + soglia + ')');
      }
    });
  }
});
