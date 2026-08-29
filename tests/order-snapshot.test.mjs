/**
 * order-snapshot.test.mjs — lo storico economico non si muove più.
 *
 * Il difetto che questo file rende impossibile non si vede il giorno in cui
 * nasce. Nasce a marzo, quando l'ordine viene confermato conservando due soli
 * numeri — il lordo e il costo materiale — e si manifesta a settembre, quando
 * il filamento è rincarato del 15% e il margine di marzo, riletto, è
 * cambiato. Non perché fosse sbagliato allora: perché nessuno l'aveva
 * congelato allora.
 *
 * La prova centrale è sempre la stessa, ripetuta su ventisei modifiche
 * diverse dell'anagrafica:
 *
 *     crea ordine → congela → cambia i dati master → rileggi → invariato
 *
 * e il suo controllo negativo, senza il quale non proverebbe niente: lo
 * stesso preventivo **ricalcolato** con i dati nuovi deve dare un risultato
 * diverso. Se non cambiasse, la modifica non sarebbe entrata e il test
 * passerebbe per il motivo sbagliato.
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

/* Un preventivo realistico: tre righe, avviamento, sconto, IVA, commissioni e
   spedizione. Provare lo storico su un preventivo di una riga sola nasconde
   proprio i casi in cui si rompe. */
function preventivo(patch) {
  return Object.assign({
    lines: [
      { id: 1, name: 'Incisione laser targa', unit: 'pz', qty: 20, unitCost: 3.10, subtotal: 62 },
      { id: 2, name: 'Plexiglass 3 mm',       unit: 'pz', qty: 20, unitCost: 1.80, subtotal: 36 },
      { id: 3, name: 'Imballo e spedizione',  unit: 'pz', qty: 1,  unitCost: 8.00, subtotal: 8 },
    ],
    strategia: 'ricarico',
    markup: 1.45,
    setupCost: 25,
    discountPct: 8,
    vatPct: 22,
    failureRate: 5,
    overheadPerHour: 6,
    hours: 2.5,
    paymentFeePct: 1.9,
    paymentFeeFixed: 0.30,
    marketplaceFeePct: 0,
    shippingCost: 9.5,
    shippingCharged: 12,
    otherVariableCosts: 0,
  }, patch || {});
}

const calcolaOra = (patch) => A.calculateQuote(preventivo(patch));
const snapshotOra = (patch, opz) => S.costruisci(calcolaOra(patch), opz || {});

/* ═══════════════════════════════════════════════════════════════════════════
   1. IL CONTRATTO — cosa uno snapshot deve contenere per essere utile
   ═══════════════════════════════════════════════════════════════════════════ */
test('il contratto dello snapshot', async (t) => {
  const snap = snapshotOra();

  await t.test('dichiara lo stato e la versione dello schema', () => {
    assert.equal(snap.stato, 'SNAPSHOT');
    assert.equal(snap.schemaVersion, S.SCHEMA);
  });

  await t.test('porta con sé la versione del motore che l\'ha prodotto', () => {
    assert.equal(snap.costEngineVersion, E.version);
    assert.notEqual(snap.costEngineVersion, 'sconosciuta');
  });

  await t.test('una riga congelata per ogni riga del preventivo', () => {
    assert.equal(snap.lines.length, 3);
    assert.deepEqual(snap.lines.map((l) => l.itemSnapshot.name),
      ['Incisione laser targa', 'Plexiglass 3 mm', 'Imballo e spedizione']);
  });

  await t.test('ogni riga conserva costo, prezzo, quantità e margine', () => {
    for (const l of snap.lines) {
      for (const campo of ['unitCostSnapshot', 'unitPriceSnapshot', 'subtotalSnapshot',
        'totalCostSnapshot', 'quantity', 'capturedAt']) {
        assert.ok(l[campo] != null, campo + ' mancante');
      }
      assert.ok(isFinite(l.marginSnapshot), 'margine di riga non numerico');
    }
  });

  await t.test('la quantità di riga è quella del preventivo, non un totale', () => {
    assert.deepEqual(snap.lines.map((l) => l.quantity), [20, 20, 1]);
  });

  await t.test('i totali coincidono con il calcolo, al centesimo', () => {
    const c = calcolaOra();
    assert.equal(snap.totals.totalCost.toFixed(4), c.totalCost.toFixed(4));
    assert.equal(snap.totals.subtotalNet.toFixed(4), c.subtotalNet.toFixed(4));
    assert.equal(snap.totals.totalGross.toFixed(4), c.totalGross.toFixed(4));
    assert.equal(snap.totals.marginPct.toFixed(4), c.marginPct.toFixed(4));
  });

  await t.test('lo sconto è congelato in tutte le sue facce', () => {
    assert.equal(snap.discountSnapshot.requestedPct, 8);
    assert.ok(snap.discountSnapshot.appliedPct >= 0);
    assert.equal(typeof snap.discountSnapshot.floorTriggered, 'boolean');
    assert.ok(snap.discountSnapshot.amount > 0, 'uno sconto dell\'8% deve pesare in euro');
  });

  await t.test('l\'aliquota è congelata insieme all\'imposta', () => {
    assert.equal(snap.taxSnapshot.ratePct, 22);
    assert.ok(Math.abs(snap.taxSnapshot.amount - snap.taxSnapshot.taxableBase * 0.22) < 0.01);
  });

  await t.test('la spedizione ha due facce: costo e addebito', () => {
    assert.equal(snap.shippingSnapshot.cost, 9.5);
    assert.equal(snap.shippingSnapshot.charged, 12);
    assert.equal(snap.shippingSnapshot.margin.toFixed(2), '2.50');
  });

  await t.test('le commissioni restano scomposte, non aggregate', () => {
    assert.ok(snap.commissionSnapshot.total > 0);
    assert.ok(snap.commissionSnapshot.paymentPct > 0);
    assert.equal(snap.commissionSnapshot.paymentFixed, 0.30);
  });

  await t.test('il dettaglio dei costi arriva dal motore, voce per voce', () => {
    const voci = Object.keys(snap.costBreakdownSnapshot.voci);
    assert.ok(voci.length >= 3, 'atteso il dettaglio, trovato ' + voci.length);
    assert.ok(voci.includes('setup'), 'l\'avviamento deve comparire come voce');
    assert.ok(snap.costBreakdownSnapshot.voci.setup.amount > 0);
    assert.ok(snap.costBreakdownSnapshot.voci.setup.formula, 'una voce senza formula non spiega niente');
  });

  await t.test('l\'avviamento è diviso per la quantità, non moltiplicato', () => {
    /* Il preventivo è un totale (qty 1 per il motore): l'avviamento resta
       intero, ma la voce deve dire da dove viene. */
    assert.match(snap.costBreakdownSnapshot.voci.setup.detail, /una tantum/);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   2. L'IMMUTABILITÀ — non una convenzione, una proprietà verificata
   ═══════════════════════════════════════════════════════════════════════════ */
test('lo snapshot non si modifica', async (t) => {
  await t.test('un totale non si riscrive', () => {
    const snap = snapshotOra();
    const prima = snap.totals.totalGross;
    try { snap.totals.totalGross = 1; } catch (e) { /* strict mode: lancia */ }
    assert.equal(snap.totals.totalGross, prima);
  });

  await t.test('il congelamento scende in profondità, non si ferma alla superficie', () => {
    const snap = snapshotOra();
    const prima = snap.lines[0].itemSnapshot.name;
    try { snap.lines[0].itemSnapshot.name = 'altro'; } catch (e) { /* atteso */ }
    assert.equal(snap.lines[0].itemSnapshot.name, prima);
    assert.ok(Object.isFrozen(snap.costBreakdownSnapshot.voci));
  });

  await t.test('non si aggiungono righe a uno storico', () => {
    const snap = snapshotOra();
    try { snap.lines.push({}); } catch (e) { /* atteso */ }
    assert.equal(snap.lines.length, 3);
  });

  await t.test('nemmeno rileggendolo dal database si scongela', () => {
    /* Il giro nel database restituisce una copia sciolta: `leggi` la
       ricongela, altrimenti da lì in poi qualunque vista potrebbe
       «aggiustare» un totale senza lasciare traccia. */
    const dalDb = JSON.parse(JSON.stringify(snapshotOra()));
    const letto = S.leggi({ id: 1, economicSnapshot: dalDb });
    assert.ok(Object.isFrozen(letto.snapshot));
    assert.ok(Object.isFrozen(letto.snapshot.totals));
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   3. LA PROVA CENTRALE — ventisei modifiche dell'anagrafica, zero movimenti
   ═══════════════════════════════════════════════════════════════════════════ */

/* Ogni caso: cosa cambia nell'anagrafica dopo la conferma, e come. Il campo
   `cambia` deve produrre un ricalcolo **diverso**: è il controllo negativo. */
const MUTAZIONI = [
  ['il materiale rincara del 15%', (q) => ({ lines: q.lines.map((l) => ({ ...l, unitCost: l.unitCost * 1.15, subtotal: l.subtotal * 1.15 })) })],
  ['il materiale cala del 20%', (q) => ({ lines: q.lines.map((l) => ({ ...l, unitCost: l.unitCost * 0.8, subtotal: l.subtotal * 0.8 })) })],
  ['il listino cambia solo sulla prima riga', (q) => ({ lines: q.lines.map((l, i) => (i ? l : { ...l, unitCost: 4.2, subtotal: 84 })) })],
  ['una riga esce dal catalogo', (q) => ({ lines: q.lines.slice(0, 2) })],
  ['si aggiunge una lavorazione al listino', (q) => ({ lines: q.lines.concat([{ id: 9, name: 'Verniciatura', unit: 'pz', qty: 20, unitCost: 0.9, subtotal: 18 }]) })],
  ['la quantità di riga raddoppia', (q) => ({ lines: q.lines.map((l) => ({ ...l, qty: l.qty * 2, subtotal: l.subtotal * 2 })) })],
  ['il ricarico di listino sale da 1,45 a 1,80', () => ({ markup: 1.80 })],
  ['il ricarico di listino scende a 1,20', () => ({ markup: 1.20 })],
  ['si passa dalla strategia a ricarico a quella a margine', () => ({ strategia: 'margine', marginePct: 45 })],
  ['l\'avviamento passa da 25 a 60 euro', () => ({ setupCost: 60 })],
  ['l\'avviamento viene azzerato', () => ({ setupCost: 0 })],
  ['la politica di sconto passa dall\'8% al 18%', () => ({ discountPct: 18 })],
  ['lo sconto viene tolto del tutto', () => ({ discountPct: 0 })],
  ['l\'IVA passa dal 22% al 24%', () => ({ vatPct: 24 })],
  ['il preventivo diventa esente IVA', () => ({ vatPct: 0 })],
  ['il tasso di scarto sale dal 5% al 12%', () => ({ failureRate: 12 })],
  ['lo scarto viene azzerato', () => ({ failureRate: 0 })],
  ['le spese generali orarie salgono da 6 a 11 euro', () => ({ overheadPerHour: 11 })],
  ['le spese generali passano a percentuale', () => ({ overheadPerHour: 0, overheadPct: 18 })],
  ['le ore di lavoro passano da 2,5 a 4', () => ({ hours: 4 })],
  ['la commissione di pagamento sale all\'1,9% + 0,35', () => ({ paymentFeeFixed: 0.35 })],
  ['si vende su marketplace al 12%', () => ({ marketplaceFeePct: 12 })],
  ['il corriere aumenta da 9,50 a 14 euro', () => ({ shippingCost: 14 })],
  ['la spedizione diventa gratuita per il cliente', () => ({ shippingCharged: 0 })],
  ['compaiono altri costi variabili', () => ({ otherVariableCosts: 7.5 })],
  ['si introduce un pavimento di margine al 35%', () => ({ marginePavimentoPct: 35, discountPct: 40 })],
];

test('crea → congela → cambia i dati master → rileggi → invariato', async (t) => {
  for (const [nome, muta] of MUTAZIONI) {
    await t.test(nome, () => {
      const base = preventivo();
      const ordine = { id: 1, economicSnapshot: S.costruisci(A.calculateQuote(base)) };
      const testuale = JSON.stringify(ordine.economicSnapshot);
      /* L'impronta per il controllo negativo ignora l'istante di cattura, che
         cambia da solo: confrontarlo direbbe «diverso» anche senza mutazioni,
         e il controllo passerebbe sempre — cioè non controllerebbe niente. */
      const impronta = testuale.replace(/"capturedAt":"[^"]*"/g, '');

      /* Il mondo cambia. */
      const dopo = Object.assign({}, base, muta(base));

      /* Controllo negativo: senza questo, il test proverebbe solo che la
         modifica non è entrata. */
      const ricalcolo = A.calculateQuote(dopo);
      assert.notEqual(impronta, JSON.stringify(S.costruisci(ricalcolo)).replace(/"capturedAt":"[^"]*"/g, ''),
        'la mutazione non ha cambiato il calcolo: il caso non prova niente');

      /* La riapertura dell'ordine. */
      const letto = S.leggi(ordine);
      assert.equal(letto.stato, 'SNAPSHOT');
      assert.equal(JSON.stringify(letto.snapshot), testuale, 'lo storico si è mosso');
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   4. QUELLO CHE NON C'È — nessun numero ricostruito, mai
   ═══════════════════════════════════════════════════════════════════════════ */
test('gli ordini nati prima di questo modulo', async (t) => {
  await t.test('sono classificati, non ricostruiti', () => {
    assert.equal(S.classifica({ id: 1, value: 340 }), 'LEGACY_NO_SNAPSHOT');
  });

  await t.test('la lettura lo dice a parole, e non produce margini', () => {
    const letto = S.leggi({ id: 1, value: 340, materialCost: 120 });
    assert.equal(letto.disponibile, false);
    assert.equal(letto.snapshot, null);
    assert.match(letto.messaggio, /non disponibili/);
    assert.ok(!('marginPct' in letto), 'un margine dedotto oggi non è uno storico');
  });

  await t.test('il totale storico si mostra per quello che è: un totale', () => {
    assert.equal(S.leggi({ id: 1, value: 340 }).totaleStorico, 340);
    assert.equal(S.leggi({ id: 1 }).totaleStorico, null);
  });

  await t.test('un motore assente non produce uno snapshot verosimile', () => {
    const snap = S.costruisci({ indisponibile: true, motivo: 'motore di costo non disponibile' });
    assert.equal(snap.stato, 'NO_SNAPSHOT');
    assert.equal(snap.lines.length, 0);
    assert.ok(!snap.totals, 'nessun totale inventato');
    assert.match(snap.motivo, /motore/);
  });

  await t.test('e la lettura di quel caso è distinta dal legacy', () => {
    const letto = S.leggi({ id: 1, economicSnapshot: S.costruisci(null, { motivo: 'preventivo senza calcolo' }) });
    assert.equal(letto.stato, 'NO_SNAPSHOT');
    assert.match(letto.messaggio, /preventivo senza calcolo/);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   5. IL PREZZO FORZATO A MANO — si affianca, non cancella
   ═══════════════════════════════════════════════════════════════════════════ */
test('il prezzo deciso a mano', async (t) => {
  const snap = snapshotOra();
  const forzato = S.conOverride(snap, { manualPrice: 180, reason: 'cliente storico', user: 'giuseppe' });

  await t.test('conserva accanto il prezzo che il sistema aveva calcolato', () => {
    assert.equal(forzato.priceOverride.systemPrice.toFixed(4), snap.totals.subtotalNet.toFixed(4));
    assert.equal(forzato.priceOverride.manualPrice, 180);
    assert.equal(forzato.priceOverride.reason, 'cliente storico');
    assert.equal(forzato.priceOverride.user, 'giuseppe');
  });

  await t.test('il margine è quello sul prezzo davvero venduto', () => {
    const atteso = ((180 - snap.totals.totalCost) / 180) * 100;
    assert.equal(forzato.totals.marginPct.toFixed(4), atteso.toFixed(4));
  });

  await t.test('resta immutabile come l\'originale', () => {
    try { forzato.totals.marginPct = 99; } catch (e) { /* atteso */ }
    assert.notEqual(forzato.totals.marginPct, 99);
  });

  await t.test('lo snapshot di partenza non viene toccato', () => {
    assert.equal(snap.priceOverride, undefined);
  });

  await t.test('non si forza il prezzo su uno storico che non c\'è', () => {
    const vuoto = S.costruisci(null, { motivo: 'niente' });
    assert.equal(S.conOverride(vuoto, { manualPrice: 10 }).stato, 'NO_SNAPSHOT');
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   6. IL RICALCOLO ESPLICITO — mostra la differenza, non la applica
   ═══════════════════════════════════════════════════════════════════════════ */
test('il confronto con oggi', async (t) => {
  const snap = snapshotOra();
  const oggi = calcolaOra({ lines: preventivo().lines.map((l) => ({ ...l, unitCost: l.unitCost * 1.3, subtotal: l.subtotal * 1.3 })) });
  const delta = S.confronta(snap, oggi);

  await t.test('elenca le voci con storico, attuale e differenza', () => {
    assert.equal(delta.confrontabile, true);
    assert.equal(delta.righe.length, 5);
    const costo = delta.righe.find((r) => r.voce === 'Costo');
    assert.equal(costo.storico.toFixed(4), snap.totals.totalCost.toFixed(4));
    assert.ok(costo.delta > 0, 'il costo è salito del 30%: il delta deve essere positivo');
    assert.ok(costo.deltaPct > 20, 'atteso oltre il 20%, misurato ' + costo.deltaPct.toFixed(1) + '%');
  });

  await t.test('il confronto non modifica lo snapshot', () => {
    assert.equal(snap.totals.totalCost.toFixed(4), S.costruisci(A.calculateQuote(preventivo())).totals.totalCost.toFixed(4));
    assert.ok(Object.isFrozen(snap.totals));
  });

  await t.test('senza uno dei due termini non si confronta', () => {
    assert.equal(S.confronta(null, oggi).confrontabile, false);
    assert.equal(S.confronta(snap, { indisponibile: true }).confrontabile, false);
    assert.equal(S.confronta(S.costruisci(null, {}), oggi).confrontabile, false);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   7. IL REGISTRO — chi, quando, cosa, perché
   ═══════════════════════════════════════════════════════════════════════════ */
test('il registro delle modifiche economiche', async (t) => {
  await t.test('annota l\'evento con tutti i suoi campi', () => {
    const o = {};
    S.registra(o, 'ORDER_CONFIRMED', { user: 'giuseppe', before: 100, after: 120, reason: 'sconto tolto' });
    assert.equal(o.economicLog.length, 1);
    const e = o.economicLog[0];
    assert.equal(e.action, 'ORDER_CONFIRMED');
    assert.equal(e.user, 'giuseppe');
    assert.equal(e.before, 100);
    assert.equal(e.after, 120);
    assert.equal(e.reason, 'sconto tolto');
    assert.ok(e.at, 'un evento senza data non serve a niente');
  });

  await t.test('un evento sconosciuto non entra nel registro', () => {
    const o = {};
    S.registra(o, 'QUALCOSA_DI_INVENTATO', {});
    assert.equal(o.economicLog, undefined);
  });

  await t.test('tutti e sei gli eventi previsti sono accettati', () => {
    const o = {};
    S.EVENTI.forEach((ev) => S.registra(o, ev, {}));
    assert.equal(o.economicLog.length, S.EVENTI.length);
  });

  await t.test('il registro non cresce senza limite', () => {
    const o = {};
    for (let i = 0; i < 140; i++) S.registra(o, 'ORDER_RECALCULATED', { after: i });
    assert.equal(o.economicLog.length, 100);
    /* Si conservano gli ultimi, non i primi: la storia recente è quella che
       serve quando si indaga. */
    assert.equal(o.economicLog[99].after, 139);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   8. LA DUPLICAZIONE — un ordine nuovo non eredita i costi di ieri
   ═══════════════════════════════════════════════════════════════════════════ */
test('duplicare un ordine', async (t) => {
  const ordine = { id: 77, economicSnapshot: snapshotOra() };
  const copia = S.perDuplicazione(ordine);

  await t.test('copia cosa vendere: voci e quantità', () => {
    assert.equal(copia.lines.length, 3);
    assert.deepEqual(copia.lines.map((l) => l.qty), [20, 20, 1]);
  });

  await t.test('non copia a quanto costava', () => {
    assert.equal(copia.economicSnapshot, null);
    const campi = JSON.stringify(copia);
    assert.ok(!/unitCostSnapshot/.test(campi), 'lo snapshot economico non si eredita');
  });

  await t.test('lascia scritto da dove viene', () => {
    assert.equal(copia.duplicatedFromOrderId, 77);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   9. IL RICARICO CHE TORNAVA INDIETRO SBAGLIATO
   ═══════════════════════════════════════════════════════════════════════════
   Trovato mentre si cercava un modo di ricostruire lo storico dai campi
   salvati: `saveQuote` scrive `markup = percentuale / 100`, e le tre funzioni
   che ricaricano un preventivo rimettevano quel numero nel campo che si
   aspetta una percentuale. Un preventivo salvato al 100% si riapriva all'1%.
   È anche la ragione per cui lo snapshot si congela alla quotazione invece di
   essere ricostruito: gli ingredienti salvati non erano fedeli. */
test('il ricarico di un preventivo salvato', async (t) => {
  await t.test('un preventivo storico si rilegge alla percentuale giusta', () => {
    /* Come lo scrive saveQuote da sempre: campo 100 → salvato 1. */
    assert.equal(A.markupPctDi({ markup: 1 }), 100);
    assert.equal(A.markupPctDi({ markup: 1.4 }), 140);
    assert.equal(A.markupPctDi({ markup: 0.6 }), 60);
  });

  await t.test('il campo nuovo, quando c\'è, ha la precedenza', () => {
    assert.equal(A.markupPctDi({ markupPct: 140, markup: 1.4 }), 140);
    /* E vince anche se il vecchio è rimasto indietro: uno solo dei due può
       avere ragione, ed è quello che dice cosa significa. */
    assert.equal(A.markupPctDi({ markupPct: 85, markup: 1.4 }), 85);
  });

  await t.test('un preventivo senza ricarico non ne inventa uno', () => {
    assert.equal(A.markupPctDi({}), 100);
    assert.equal(A.markupPctDi(null), 100);
    assert.equal(A.markupPctDi({ markup: 'boh' }), 100);
  });

  await t.test('lo zero è un ricarico dichiarato, non un campo assente', () => {
    assert.equal(A.markupPctDi({ markupPct: 0 }), 0);
    assert.equal(A.markupPctDi({ markup: 0 }), 0);
  });

  await t.test('quanto costava il difetto, misurato', () => {
    const riga = [{ id: 1, name: 'x', qty: 1, unitCost: 100, subtotal: 100 }];
    const quota = (pct) => A.calculateQuote({ lines: riga, strategia: 'ricarico', markup: 1 + pct / 100, vatPct: 0 });

    /* Il preventivo com'era stato fatto: campo 100, cioè ricarico 2. */
    assert.equal(quota(A.markupPctDi({ markup: 1 })).subtotalNet.toFixed(2), '200.00');

    /* Come si riapriva prima della correzione: il fattore 1 finiva nel campo
       delle percentuali. Il prezzo chiesto sarebbe stato 101 €, ma il
       pavimento di margine lo rialza a 111,11 — il pavimento fa il suo
       lavoro e limita il danno, non lo annulla: 200 € diventavano 111,11 €,
       il 44% in meno, e nella schermata non compariva alcun avviso perché
       nulla sapeva che quel numero non era stato scelto da nessuno. */
    const rotto = quota(1);
    assert.equal(rotto.subtotalNet.toFixed(2), '111.11');
    assert.equal(rotto.floorProtection.triggered, true);
    assert.ok(rotto.subtotalNet / 200 < 0.6, 'il prezzo crollava a meno del 60%');
  });
});
