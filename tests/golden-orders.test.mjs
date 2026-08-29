/**
 * golden-orders.test.mjs — cinquanta ordini che non si muovono più.
 *
 * I test della Fase 30 provano che *un* ordine resta fermo quando cambia
 * l'anagrafica. Questo prova una cosa più larga e più noiosa, che è il modo in
 * cui i difetti si trovano davvero: cinquanta ordini deterministici, diversi
 * fra loro per tecnologia, quantità, politica, sconto, IVA, scarto, spese
 * generali, commissioni e spedizione, congelati; poi si cambia **tutto** il
 * mondo intorno e si rilegge.
 *
 * Attesi e attuali si confrontano campo per campo. Zero differenze.
 *
 * Il controllo negativo è dentro ogni caso e non a lato: per ognuno dei
 * cinquanta si verifica anche che il ricalcolo con i parametri nuovi dia un
 * risultato **diverso**. Senza, il test proverebbe soltanto che il mondo non è
 * cambiato, e passerebbe per il motivo sbagliato.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({
  Math, JSON, Object, Array, String, Number, Date, parseFloat, isFinite, console,
});
for (const f of ['cost-engine.js', 'quote-adapter.js', 'order-snapshot.js']) {
  vm.runInContext(fs.readFileSync('src/product/' + f, 'utf8'), contesto);
}
const E = contesto.InglyCostEngine;
const A = contesto.InglyQuoteAdapter;
const S = contesto.InglyOrderSnapshot;

/* ── I cinquanta ordini ─────────────────────────────────────────────────────
   Deterministici: nessun numero casuale, nessuna data di sistema dentro i
   valori confrontati. Costruiti da tre assi che si incrociano, perché una
   variazione sola non trova gli errori che nascono dalle combinazioni. */

const RIGHE = [
  [{ id: 1, name: 'Targa incisa', cat: 'laser', catLabel: 'Laser', unit: 'pz', qty: 1, unitCost: 6.4, subtotal: 6.4 }],
  [{ id: 1, name: 'MDF 3mm', cat: 'materiale', catLabel: 'Materiale', unit: 'fogli', qty: 4, unitCost: 1.8, subtotal: 7.2 },
   { id: 2, name: 'Taglio laser', cat: 'laser', catLabel: 'Laser', unit: 'min', qty: 22, unitCost: 0.45, subtotal: 9.9 }],
  [{ id: 1, name: 'Acrilico 5mm', cat: 'materiale', catLabel: 'Materiale', unit: 'fogli', qty: 2, unitCost: 7.4, subtotal: 14.8 },
   { id: 2, name: 'Montaggio', cat: 'manodopera', catLabel: 'Manodopera', unit: 'min', qty: 40, unitCost: 0.3, subtotal: 12 },
   { id: 3, name: 'Imballo', cat: 'gadget', catLabel: 'Gadget/LED', unit: 'pz', qty: 1, unitCost: 3.5, subtotal: 3.5 }],
  [{ id: 1, name: 'PLA nero', cat: 'materiale', catLabel: 'Materiale', unit: 'kg', qty: 1, unitCost: 21, subtotal: 21 },
   { id: 2, name: 'Stampa 3D', cat: 'laser', catLabel: 'Laser', unit: 'h', qty: 9, unitCost: 1.15, subtotal: 10.35 },
   { id: 3, name: 'Post-processo', cat: 'manodopera', catLabel: 'Manodopera', unit: 'min', qty: 35, unitCost: 0.3, subtotal: 10.5 },
   { id: 4, name: 'Verniciatura', cat: 'verniciatura', catLabel: 'Verniciatura', unit: 'pz', qty: 12, unitCost: 0.85, subtotal: 10.2 }],
  [{ id: 1, name: 'Film DTF', cat: 'materiale', catLabel: 'Materiale', unit: 'm', qty: 18, unitCost: 0.9, subtotal: 16.2 },
   { id: 2, name: 'Stampa e pressa', cat: 'laser', catLabel: 'Laser', unit: 'min', qty: 90, unitCost: 0.22, subtotal: 19.8 }],
];

const PREZZI = [
  { id: 'ric140', strategia: 'ricarico', markup: 1.40 },
  { id: 'ric185', strategia: 'ricarico', markup: 1.85 },
  { id: 'mar35', strategia: 'margine', marginePct: 35 },
  { id: 'mar52', strategia: 'margine', marginePct: 52 },
  { id: 'fisso', strategia: 'fisso', fixedPrice: 240 },
];

const CONTORNI = [
  { id: 'base', setupCost: 0, discountPct: 0, vatPct: 22, failureRate: 0, overheadPerHour: 0, hours: 0 },
  { id: 'setup', setupCost: 35, discountPct: 0, vatPct: 22, failureRate: 0, overheadPerHour: 0, hours: 0 },
  { id: 'sconto', setupCost: 20, discountPct: 12, vatPct: 22, failureRate: 0, overheadPerHour: 0, hours: 0 },
  { id: 'scarto', setupCost: 20, discountPct: 5, vatPct: 22, failureRate: 8, overheadPerHour: 0, hours: 0 },
  { id: 'generali', setupCost: 20, discountPct: 5, vatPct: 22, failureRate: 8, overheadPerHour: 9, hours: 3 },
  { id: 'canale', setupCost: 20, discountPct: 5, vatPct: 22, failureRate: 8, overheadPerHour: 9, hours: 3,
    paymentFeePct: 2.2, paymentFeeFixed: 0.35, marketplaceFeePct: 11, shippingCost: 8.9, shippingCharged: 6 },
  { id: 'esente', setupCost: 20, discountPct: 5, vatPct: 0, failureRate: 8, overheadPerHour: 9, hours: 3 },
  { id: 'pavimento', setupCost: 20, discountPct: 45, vatPct: 22, failureRate: 8, overheadPerHour: 9, hours: 3,
    marginePavimentoPct: 32 },
  { id: 'estremo', setupCost: 180, discountPct: 30, vatPct: 10, failureRate: 25, overheadPerHour: 22, hours: 8,
    paymentFeePct: 3.4, marketplaceFeePct: 15, shippingCost: 24, shippingCharged: 0, otherVariableCosts: 6 },
  { id: 'minimo', setupCost: 1, discountPct: 1, vatPct: 4, failureRate: 1, overheadPerHour: 1, hours: 1 },
];

/** I cinquanta: cinque insiemi di righe × dieci contorni, prezzo a rotazione. */
const ORDINI = [];
for (let r = 0; r < RIGHE.length; r++) {
  for (let k = 0; k < CONTORNI.length; k++) {
    const prezzo = PREZZI[(r + k) % PREZZI.length];
    ORDINI.push({
      nome: 'O' + String(ORDINI.length + 1).padStart(2, '0') + ' · ' + CONTORNI[k].id + ' · ' + prezzo.id + ' · ' + (r + 1) + ' righe',
      stato: Object.assign({ lines: RIGHE[r] }, prezzo, CONTORNI[k]),
      politica: ['competitive', 'standard', 'premium', 'luxury'][k % 4],
    });
  }
}

/* ── Il mondo che cambia ────────────────────────────────────────────────────
   Non una modifica: tutte insieme, come succede davvero fra marzo e settembre. */
function mondoNuovo(stato) {
  return Object.assign({}, stato, {
    lines: stato.lines.map((l) => ({ ...l, unitCost: l.unitCost * 1.23, subtotal: l.subtotal * 1.23 })),
    markup: stato.markup != null ? stato.markup * 1.3 : undefined,
    marginePct: stato.marginePct != null ? stato.marginePct + 9 : undefined,
    fixedPrice: stato.fixedPrice != null ? stato.fixedPrice * 1.18 : undefined,
    setupCost: (stato.setupCost || 0) + 17,
    discountPct: (stato.discountPct || 0) + 6,
    vatPct: stato.vatPct === 0 ? 0 : (stato.vatPct || 22) + 2,
    failureRate: (stato.failureRate || 0) + 4,
    overheadPerHour: (stato.overheadPerHour || 0) + 5,
    hours: (stato.hours || 0) + 1.5,
    paymentFeePct: (stato.paymentFeePct || 0) + 0.8,
    shippingCost: (stato.shippingCost || 0) + 4,
    otherVariableCosts: (stato.otherVariableCosts || 0) + 2.5,
  });
}

/** L'impronta confrontabile: tutto tranne gli istanti di cattura. */
const impronta = (snap) => JSON.stringify(snap).replace(/"capturedAt":"[^"]*"/g, '');

test('cinquanta ordini deterministici, congelati e riletti', async (t) => {
  assert.equal(ORDINI.length, 50, 'i golden order devono essere cinquanta o crescere di proposito');

  for (const caso of ORDINI) {
    await t.test(caso.nome, () => {
      const politica = E.POLITICHE[caso.politica];
      const calcolo = A.calculateQuote(caso.stato);
      assert.equal(calcolo.indisponibile, false, 'il motore non ha calcolato');

      const ordine = { id: 1, economicSnapshot: S.costruisci(calcolo, { policy: politica }) };

      /* Gli attesi: presi una volta sola, e da qui in poi non si ripescano. */
      const atteso = {
        totalCost: ordine.economicSnapshot.totals.totalCost,
        subtotalNet: ordine.economicSnapshot.totals.subtotalNet,
        totalGross: ordine.economicSnapshot.totals.totalGross,
        marginPct: ordine.economicSnapshot.totals.marginPct,
        righe: ordine.economicSnapshot.lines.length,
        quantita: ordine.economicSnapshot.lines.map((l) => l.quantity),
        costiRiga: ordine.economicSnapshot.lines.map((l) => l.totalCostSnapshot),
        policy: ordine.economicSnapshot.pricingPolicySnapshot.id,
        versione: ordine.economicSnapshot.calculationVersion,
        testuale: JSON.stringify(ordine.economicSnapshot),
      };

      /* Il mondo cambia. */
      const dopo = A.calculateQuote(mondoNuovo(caso.stato));

      /* Controllo negativo, dentro il caso: senza, non proverebbe niente. */
      assert.notEqual(
        impronta(S.costruisci(dopo, { policy: E.POLITICHE.luxury })),
        impronta(ordine.economicSnapshot),
        'il mondo non è cambiato: questo caso non prova niente',
      );

      /* La rilettura. */
      const letto = S.leggi(ordine);
      assert.equal(letto.stato, 'SNAPSHOT');
      const s = letto.snapshot;

      assert.equal(s.totals.totalCost, atteso.totalCost, 'costo storico spostato');
      assert.equal(s.totals.subtotalNet, atteso.subtotalNet, 'prezzo netto storico spostato');
      assert.equal(s.totals.totalGross, atteso.totalGross, 'prezzo cliente storico spostato');
      assert.equal(s.totals.marginPct, atteso.marginPct, 'margine storico spostato');
      assert.equal(s.lines.length, atteso.righe, 'numero di righe cambiato');
      assert.equal(s.lines.map((l) => l.quantity).join(','), atteso.quantita.join(','), 'quantità cambiate');
      assert.equal(s.lines.map((l) => l.totalCostSnapshot).join(','), atteso.costiRiga.join(','), 'costi di riga cambiati');
      assert.equal(s.pricingPolicySnapshot.id, atteso.policy, 'politica cambiata');
      assert.equal(s.calculationVersion, atteso.versione, 'versione di calcolo cambiata');
      assert.equal(JSON.stringify(s), atteso.testuale, 'lo snapshot è cambiato in qualche campo');
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   La scomposizione del costo di riga, dove il modello la consente
   ═══════════════════════════════════════════════════════════════════════════ */
test('il costo di riga, scomposto per quanto il modello consente', async (t) => {
  const stato = {
    lines: RIGHE[3],
    strategia: 'ricarico', markup: 1.6,
    setupCost: 40, discountPct: 0, vatPct: 22, failureRate: 10,
    overheadPerHour: 8, hours: 4,
  };
  const snap = S.costruisci(A.calculateQuote(stato), { policy: E.POLITICHE.standard });

  await t.test('ogni riga porta la natura del proprio costo diretto', () => {
    const nature = snap.lines.map((l) => Object.keys(l.costBreakdown).filter((k) => l.costBreakdown[k].source === 'misurato' && k !== 'wasteCost')[0]);
    assert.deepEqual(nature, ['materialCost', 'machineCost', 'laborCost', 'materialCost']);
  });

  await t.test('le voci non dichiarate restano assenti, non a zero', () => {
    const riga = snap.lines.find((l) => l.costBreakdown.laborCost);
    assert.ok(riga, 'attesa una riga di manodopera');
    assert.equal(riga.costBreakdown.energyCost, undefined,
      'una riga di manodopera non deve dichiarare un costo energia pari a zero: non è mai stato misurato');
    assert.equal(riga.costBreakdown.materialCost, undefined);
  });

  await t.test('lo scarto è misurato per riga, non ripartito', () => {
    for (const l of snap.lines) {
      if (!l.costBreakdown.wasteCost) continue;
      assert.equal(l.costBreakdown.wasteCost.source, 'misurato');
      const atteso = l.totalCostSnapshot * (0.10 / 0.90);
      assert.ok(Math.abs(l.costBreakdown.wasteCost.amount - atteso) < 0.0001,
        'scarto ' + l.costBreakdown.wasteCost.amount + ' ≠ ' + atteso);
    }
  });

  await t.test('avviamento e spese generali sono marcati come ripartiti', () => {
    for (const l of snap.lines) {
      assert.equal(l.costBreakdown.setupCost.source, 'ripartito');
      assert.equal(l.costBreakdown.overheadCost.source, 'ripartito');
      assert.match(l.costBreakdown.setupCost.basis, /quota di costo/);
    }
  });

  await t.test('la somma degli avviamenti ripartiti fa l\'avviamento intero', () => {
    const somma = snap.lines.reduce((a, l) => a + l.costBreakdown.setupCost.amount, 0);
    assert.ok(Math.abs(somma - snap.totals.setupCost) < 0.0001,
      'ripartito ' + somma.toFixed(4) + ' ≠ totale ' + snap.totals.setupCost.toFixed(4));
  });

  await t.test('ogni riga sa con quale politica e versione è nata', () => {
    for (const l of snap.lines) {
      assert.equal(l.pricingPolicy, 'standard');
      assert.equal(l.calculationVersion, E.version);
      assert.equal(l.pricingProfile, 'generico');
    }
  });

  await t.test('costTotal e totalCostSnapshot sono due numeri diversi, di proposito', () => {
    for (const l of snap.lines) {
      assert.ok(l.costTotal > l.totalCostSnapshot,
        'costTotal deve comprendere scarto, avviamento e generali, totalCostSnapshot no');
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   Sicurezza dei riferimenti — preventivo e ordine sono due vite
   ═══════════════════════════════════════════════════════════════════════════ */
test('preventivo e ordine non condividono un solo riferimento', async (t) => {
  const stato = { lines: JSON.parse(JSON.stringify(RIGHE[2])), strategia: 'ricarico', markup: 1.5, setupCost: 30, discountPct: 10, vatPct: 22 };
  const calcolo = A.calculateQuote(stato);
  const preventivo = { id: 10, lines: stato.lines, economicSnapshot: S.costruisci(calcolo, { policy: E.POLITICHE.standard }) };
  const ordine = { id: 20, economicSnapshot: S.clona(preventivo.economicSnapshot) };

  await t.test('l\'oggetto non è lo stesso, a nessun livello', () => {
    assert.notEqual(ordine.economicSnapshot, preventivo.economicSnapshot);
    assert.notEqual(ordine.economicSnapshot.totals, preventivo.economicSnapshot.totals);
    assert.notEqual(ordine.economicSnapshot.lines, preventivo.economicSnapshot.lines);
    assert.notEqual(ordine.economicSnapshot.lines[0], preventivo.economicSnapshot.lines[0]);
    assert.notEqual(ordine.economicSnapshot.lines[0].itemSnapshot, preventivo.economicSnapshot.lines[0].itemSnapshot);
    assert.notEqual(ordine.economicSnapshot.lines[0].costBreakdown, preventivo.economicSnapshot.lines[0].costBreakdown);
  });

  await t.test('ma il contenuto è identico', () => {
    assert.equal(JSON.stringify(ordine.economicSnapshot), JSON.stringify(preventivo.economicSnapshot));
  });

  await t.test('la copia è congelata quanto l\'originale', () => {
    assert.ok(Object.isFrozen(ordine.economicSnapshot));
    assert.ok(Object.isFrozen(ordine.economicSnapshot.lines[0].costBreakdown.setupCost));
  });

  await t.test('cambiare le righe del preventivo non muove l\'ordine', () => {
    const prima = JSON.stringify(ordine.economicSnapshot);
    preventivo.lines[0].unitCost = 999;
    preventivo.lines[0].subtotal = 9999;
    preventivo.lines.push({ id: 99, name: 'aggiunta', qty: 1, unitCost: 50, subtotal: 50 });
    assert.equal(JSON.stringify(ordine.economicSnapshot), prima);
  });

  await t.test('sostituire lo snapshot del preventivo non muove l\'ordine', () => {
    const prima = JSON.stringify(ordine.economicSnapshot);
    preventivo.economicSnapshot = S.costruisci(A.calculateQuote({ ...stato, markup: 3 }), { policy: E.POLITICHE.luxury });
    assert.equal(JSON.stringify(ordine.economicSnapshot), prima);
    assert.notEqual(JSON.stringify(preventivo.economicSnapshot), prima, 'il nuovo snapshot doveva essere diverso');
  });

  await t.test('e sostituire quello dell\'ordine non muove il preventivo', () => {
    const prima = JSON.stringify(preventivo.economicSnapshot);
    ordine.economicSnapshot = S.costruisci(A.calculateQuote({ ...stato, markup: 4 }), { policy: E.POLITICHE.competitive });
    assert.equal(JSON.stringify(preventivo.economicSnapshot), prima);
  });

  await t.test('lo snapshot non condivide riferimenti con il calcolo che lo ha prodotto', () => {
    const c = A.calculateQuote(stato);
    const snap = S.costruisci(c, {});
    assert.notEqual(snap.lines[0], c.lines[0]);
    const prima = JSON.stringify(snap);
    c.lines[0].cost = 12345;
    c.totalCost = 99999;
    assert.equal(JSON.stringify(snap), prima);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   Prodotti spariti — un ordine storico resta leggibile
   ═══════════════════════════════════════════════════════════════════════════ */
test('un ordine resta leggibile quando il prodotto non c\'è più', async (t) => {
  const stato = { lines: RIGHE[2], strategia: 'ricarico', markup: 1.5, setupCost: 30, vatPct: 22 };
  const snap = S.costruisci(A.calculateQuote(stato), {
    policy: E.POLITICHE.standard,
    extra: {
      1: { sku: 'ACR-5', category: 'Plastica', material: { id: 'm7', name: 'Acrilico trasparente 5mm', unit: 'fogli' }, machine: { id: 'eq1', name: 'xTool P2S' } },
    },
  });
  const ordine = { id: 5, economicSnapshot: snap };

  await t.test('il nome del prodotto è nello snapshot, non solo l\'id', () => {
    for (const l of snap.lines) {
      assert.ok(l.itemSnapshot.name && l.itemSnapshot.name !== 'Voce', 'riga senza nome leggibile');
    }
  });

  await t.test('materiale e macchina portano il nome accanto all\'id', () => {
    const riga = snap.lines[0];
    assert.equal(riga.itemSnapshot.material.name, 'Acrilico trasparente 5mm');
    assert.equal(riga.itemSnapshot.machine.name, 'xTool P2S');
    assert.equal(riga.itemSnapshot.sku, 'ACR-5');
  });

  await t.test('cancellare l\'anagrafica non rende illeggibile l\'ordine', () => {
    /* Simula il caso reale: il catalogo non contiene più nulla di tutto ciò. */
    const catalogoVuoto = {};
    const letto = S.leggi(ordine);
    assert.equal(letto.disponibile, true);
    assert.equal(letto.snapshot.lines[0].itemSnapshot.name, 'Acrilico 5mm');
    assert.equal(Object.keys(catalogoVuoto).length, 0);
  });

  await t.test('una riga senza anagrafica extra non inventa materiale e macchina', () => {
    const riga = snap.lines[1];
    assert.equal(riga.itemSnapshot.material, null);
    assert.equal(riga.itemSnapshot.machine, null);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   Le somme tornano — il difetto misurato che ha prodotto questa correzione
   ═══════════════════════════════════════════════════════════════════════════
   Prima: le quote si prendevano sul costo del **pezzo**, che comprende
   avviamento, spese generali e scarto. I numeratori erano i costi diretti
   delle righe, il denominatore era più grande, e le somme non tornavano: su
   un preventivo da 170,93 € le righe ne sommavano 50,16.

   Nessuno se n'era accorto perché il totale a schermo arrivava da un'altra
   strada, e le righe da questa. Sono i cinquanta casi qui sopra a renderlo
   impossibile d'ora in poi, e questo blocco a dirlo esplicitamente. */
test('i prezzi di riga sommano al preventivo, sempre', async (t) => {
  for (const caso of ORDINI) {
    await t.test(caso.nome, () => {
      const c = A.calculateQuote(caso.stato);
      const sommaPrezzi = c.lines.reduce((a, l) => a + l.price, 0);
      const sommaCosti = c.lines.reduce((a, l) => a + l.costAllocated, 0);
      assert.ok(Math.abs(sommaPrezzi - c.subtotalNet) < 0.0001,
        'prezzi di riga ' + sommaPrezzi.toFixed(4) + ' ≠ netto ' + c.subtotalNet.toFixed(4));
      assert.ok(Math.abs(sommaCosti - c.totalCost) < 0.0001,
        'costi attribuiti ' + sommaCosti.toFixed(4) + ' ≠ costo totale ' + c.totalCost.toFixed(4));
    });
  }
});

test('anche nello snapshot congelato le somme tornano', async (t) => {
  for (const caso of ORDINI.slice(0, 12)) {
    await t.test(caso.nome, () => {
      const snap = S.costruisci(A.calculateQuote(caso.stato), { policy: E.POLITICHE.standard });
      const sommaSub = snap.lines.reduce((a, l) => a + l.subtotalSnapshot, 0);
      const sommaCosti = snap.lines.reduce((a, l) => a + l.costTotal, 0);
      const residui = snap.lines.reduce((a, l) => a + Math.abs(l.costBreakdownResidual), 0);
      assert.ok(Math.abs(sommaSub - snap.totals.subtotalNet) < 0.0001, 'righe ≠ netto');
      assert.ok(Math.abs(sommaCosti - snap.totals.totalCost) < 0.0001, 'costi di riga ≠ costo totale');
      assert.ok(residui < 0.0001, 'residuo di quadratura ' + residui.toFixed(6) + ': manca una voce nella scomposizione');
    });
  }
});

/* Il margine di riga non può discostarsi da quello dell'ordine quando la
   ripartizione è proporzionale: se lo fa, la ripartizione è cambiata e
   qualcuno se ne deve accorgere. */
test('il margine di riga coincide con quello dell\'ordine', async (t) => {
  for (const caso of ORDINI.slice(0, 15)) {
    await t.test(caso.nome, () => {
      const c = A.calculateQuote(caso.stato);
      for (const l of c.lines) {
        if (l.price <= 0) continue;
        assert.ok(Math.abs(l.marginPct - c.marginPct) < 0.0001,
          'riga ' + l.label + ': margine ' + l.marginPct.toFixed(4) + ' ≠ ordine ' + c.marginPct.toFixed(4));
      }
    });
  }
});
