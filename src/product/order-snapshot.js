/* ═══════════════════════════════════════════════════════════════════════════
   ORDER LINE SNAPSHOT · lo storico economico non si ricalcola
   ═══════════════════════════════════════════════════════════════════════════

   Quando un preventivo viene confermato, l'ordine che ne nasce conserva oggi
   due numeri: `value` (il lordo) e `materialCost`. Tutto il resto — le righe,
   il dettaglio dei costi, il margine, lo sconto concesso, la politica di
   prezzo usata — si perde nel passaggio.

   La conseguenza si vede mesi dopo. Il costo del materiale sale del 15%, e il
   margine dell'ordine di marzo cambia sotto gli occhi di chi lo rilegge: non
   perché fosse sbagliato allora, ma perché nessuno aveva congelato *allora*.
   Un report di redditività costruito così misura i costi di oggi applicati
   alle vendite di ieri, e non c'è modo di accorgersene guardandolo.

   Questo modulo congela. Prende il risultato del motore nel momento della
   conferma e ne fa un oggetto immutabile — `Object.freeze` in profondità, non
   una convenzione — che porta con sé anche la versione del motore che l'ha
   prodotto, perché uno storico va potuto rileggere anche dopo che la
   matematica è cambiata.

   Due regole non negoziabili:

   1. **Non si ricalcola mai uno storico.** Chi disegna un ordine confermato
      legge lo snapshot; il motore serve solo per una nuova quotazione o per un
      ricalcolo che l'utente ha chiesto esplicitamente.

   2. **Non si inventa uno storico che non c'è.** Gli ordini precedenti a
      questo modulo restano marcati `LEGACY_NO_SNAPSHOT`, e l'interfaccia lo
      dice invece di mostrare numeri ricostruiti che sembrerebbero veri.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /** La versione dello schema: uno storico letto fra due anni deve sapere
      con quale forma è stato scritto. */
  var SCHEMA = 1;

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };
  var pos = function (v, d) { return Math.max(0, num(v, d)); };

  function ora() { try { return new Date().toISOString(); } catch (e) { return ''; } }

  /* Quanto ha pesato lo sconto, in euro: il netto pieno si ricava da quello
     **applicato** — il pavimento di margine può aver ridotto quello chiesto. */
  function scontoInValore(netto, appliedPct) {
    if (!(netto > 0) || !(appliedPct > 0)) return 0;
    var f = 1 - Math.min(99, appliedPct) / 100;
    return Math.max(0, netto / f - netto);
  }

  /* Congelare in superficie non basta: `snapshot.costBreakdown.materiale = 0`
     passerebbe senza rumore. Si scende in profondità. */
  function congela(o) {
    if (!o || typeof o !== 'object') return o;
    Object.keys(o).forEach(function (k) { congela(o[k]); });
    return Object.freeze(o);
  }

  /* ── Cosa è stato venduto ──────────────────────────────────────────────────
     Il prodotto può cambiare nome, materiale, macchina e prezzo dopo l'ordine.
     Se ne conserva quanto basta a ricostruire cosa il cliente ha ricevuto,
     senza duplicare l'anagrafica: l'id resta, per chi vuole risalire. */
  function itemSnapshot(riga, extra) {
    var r = riga || {};
    var e = extra || {};
    return {
      itemId: r.itemId != null ? r.itemId : (r.id != null ? r.id : null),
      sku: e.sku || r.sku || null,
      name: r.label || r.name || r.desc || 'Voce',
      description: r.detail || e.description || '',
      category: e.category || r.catLabel || null,
      unit: r.unit || 'pz',
      technology: e.technology || null,
      /* Materiale e macchina: nome oltre all'id, perché fra due anni l'id
         potrebbe puntare a un record rinominato o archiviato. */
      material: e.material ? { id: e.material.id || null, name: e.material.name || null, unit: e.material.unit || null } : null,
      machine: e.machine ? { id: e.machine.id || null, name: e.machine.name || null } : null,
    };
  }

  /**
   * Una riga d'ordine congelata.
   *
   * @param {Object} riga     la riga come l'ha calcolata l'adapter
   * @param {Object} prezzo   il risultato di `InglyCostEngine.prezzo`
   * @param {Object} contesto versioni, politica, extra
   */
  function rigaSnapshot(riga, prezzo, contesto) {
    var r = riga || {};
    var p = prezzo || {};
    var c = contesto || {};
    var qty = Math.max(1, num(r.qty, 1));
    var costoUnitario = num(r.unitCost, num(r.cost) / qty);
    var prezzoUnitario = num(r.unitPrice, num(r.price) / qty);

    return {
      itemSnapshot: itemSnapshot(r, c.extra),
      quantity: qty,

      unitCostSnapshot: costoUnitario,
      unitPriceSnapshot: prezzoUnitario,
      subtotalSnapshot: num(r.price, prezzoUnitario * qty),
      totalCostSnapshot: num(r.cost, costoUnitario * qty),

      /* Il margine si congela come **numero**, non come regola: ricostruirlo
         domani dalle formule di domani darebbe un altro risultato. */
      marginSnapshot: r.marginPct != null ? num(r.marginPct) : null,
      markupSnapshot: costoUnitario > 0 ? ((prezzoUnitario - costoUnitario) / costoUnitario) * 100 : null,

      capturedAt: c.quando || ora(),
    };
  }

  /* ── Il dettaglio dei costi ────────────────────────────────────────────────
     Undici voci, ognuna con importo e provenienza. Congelare solo il totale
     renderebbe impossibile la domanda che si fa davvero a distanza di tempo:
     «dove se n'è andato il margine». */
  var VOCI = ['materiale', 'energia', 'macchina', 'manutenzione', 'manodopera',
    'setup', 'scarto', 'overhead', 'packaging', 'commissioni', 'spedizione'];

  function costBreakdownSnapshot(costo, prezzo, spiegazione) {
    var c = costo || {};
    var p = prezzo || {};
    var voci = {};

    var daMotore = (c.perPezzo && c.perPezzo.voci) || [];
    var fonti = {};
    if (spiegazione && spiegazione.lines) {
      spiegazione.lines.forEach(function (l) { fonti[l.id] = { source: l.fonte || null, formula: l.formula || null }; });
    }

    daMotore.forEach(function (v) {
      voci[v.id] = {
        amount: num(v.value),
        detail: v.detail || null,
        source: (fonti[v.id] || {}).source || null,
        formula: (fonti[v.id] || {}).formula || null,
      };
    });

    if (c.unaTantum && c.unaTantum.totale > 0) {
      voci.setup = { amount: num(c.unaTantum.perPezzo), detail: 'una tantum ' + c.unaTantum.totale.toFixed(2) + ' € diviso per ' + c.qty, source: 'calcolato', formula: 'una tantum ÷ quantità' };
    }
    if (c.overhead > 0) voci.overhead = { amount: num(c.overhead), detail: c.overheadModo || null, source: 'configurato', formula: null };
    if (p.commissioni > 0) voci.commissioni = { amount: num(p.commissioni), detail: null, source: 'configurato', formula: null };
    if (p.spedizioneCosto > 0) voci.spedizione = { amount: num(p.spedizioneCosto), detail: null, source: 'configurato', formula: null };

    /* Le voci che il profilo non ha prodotto restano assenti, non a zero:
       «non pertinente» e «costa zero» non sono la stessa informazione. */
    return { voci: voci, vociPreviste: VOCI.slice() };
  }

  /**
   * Costruisce lo snapshot economico completo di un ordine.
   *
   * @param {Object} calcolo  `QuoteCalculationResult` dell'adapter
   * @param {Object} opzioni  { policy, extra, spiegazione, user, motivo }
   */
  function costruisci(calcolo, opzioni) {
    var o = opzioni || {};
    var quando = o.quando || ora();

    if (!calcolo || calcolo.indisponibile) {
      /* Nessuno snapshot inventato: si dichiara che non si è potuto fare. */
      return congela({
        schemaVersion: SCHEMA,
        stato: 'NO_SNAPSHOT',
        motivo: o.motivo || (calcolo && calcolo.motivo) || 'nessun calcolo disponibile',
        capturedAt: quando,
        lines: [],
      });
    }

    var c = calcolo._costo || {};
    var p = calcolo._prezzo || {};
    var motore = global.InglyCostEngine;

    var righe = (calcolo.lines || []).map(function (r) {
      return rigaSnapshot(r, p, { quando: quando, extra: (o.extra || {})[r.id] });
    });

    return congela({
      schemaVersion: SCHEMA,
      stato: 'SNAPSHOT',

      /* Le versioni: uno storico va potuto rileggere anche dopo che la
         matematica è cambiata, e sapere con quale matematica è nato. */
      costEngineVersion: (motore && motore.version) || calcolo.versione || 'sconosciuta',
      pricingPolicyVersion: o.policyVersion || SCHEMA,
      pricingPolicySnapshot: o.policy
        ? { id: o.policy.id || o.policy, label: o.policy.label || null, marginTarget: o.policy.marginTarget != null ? o.policy.marginTarget : null }
        : null,

      lines: righe,

      totals: {
        subtotalCost: num(calcolo.subtotalCost),
        setupCost: num(calcolo.setupCost),
        overhead: num(calcolo.overhead),
        totalCost: num(calcolo.totalCost),
        subtotalNet: num(calcolo.subtotalNet),
        totalGross: num(calcolo.totalGross),
        grossProfit: num(calcolo.grossProfit),
        operatingProfit: num(calcolo.operatingProfit),
        marginPct: num(calcolo.marginPct),
        markupPct: num(calcolo.markupPct),
      },

      /* Sconto congelato in tutte e quattro le sue facce: ricostruirlo domani
         dalle regole di domani darebbe un numero diverso. */
      discountSnapshot: {
        requestedPct: num(calcolo.discountRequestedPct),
        appliedPct: num(calcolo.discountAppliedPct),
        amount: scontoInValore(num(calcolo.subtotalNet), num(calcolo.discountAppliedPct)),
        type: num(calcolo.discountRequestedPct) > 0 ? 'percentuale' : 'nessuno',
        floorTriggered: !!(calcolo.floorProtection && calcolo.floorProtection.triggered),
        floorMarginPct: (calcolo.floorProtection && calcolo.floorProtection.floorMarginPct) != null ? calcolo.floorProtection.floorMarginPct : null,
      },

      /* L'aliquota si congela: rileggere quella corrente per ricostruire un
         documento di due anni fa produrrebbe un totale che non è mai esistito. */
      taxSnapshot: {
        ratePct: num(calcolo.vatPct),
        amount: num(calcolo.vat),
        taxableBase: num(calcolo.subtotalNet),
      },

      shippingSnapshot: {
        cost: num((calcolo.shipping || {}).cost),
        charged: num((calcolo.shipping || {}).charged),
        margin: num((calcolo.shipping || {}).margin),
      },

      commissionSnapshot: {
        total: num(calcolo.commissionsTotal),
        paymentPct: num((calcolo.commissions || {}).pagamentoPct),
        paymentFixed: num((calcolo.commissions || {}).pagamentoFissa),
        marketplace: num((calcolo.commissions || {}).marketplace),
      },

      costBreakdownSnapshot: costBreakdownSnapshot(c, p, o.spiegazione),

      capturedAt: quando,
    });
  }

  /* ── Prezzo forzato a mano ─────────────────────────────────────────────────
     Chi vende decide, e va bene. Ma il numero del motore non si cancella: si
     affianca. Senza, un margine anomalo in un report resta senza spiegazione,
     e nessuno può sapere se è un errore o una scelta. */
  function conOverride(snapshot, override) {
    var o = override || {};
    if (!snapshot || snapshot.stato !== 'SNAPSHOT') return snapshot;
    var manuale = pos(o.manualPrice);
    var sistema = num(snapshot.totals.subtotalNet);
    var costo = num(snapshot.totals.totalCost);

    var copia = JSON.parse(JSON.stringify(snapshot));
    copia.priceOverride = {
      systemPrice: sistema,
      manualPrice: manuale,
      reason: o.reason || null,
      user: o.user || null,
      at: o.quando || ora(),
    };
    /* Il margine vero è quello sul prezzo **effettivamente venduto**. */
    copia.totals.subtotalNet = manuale;
    copia.totals.grossProfit = manuale - costo;
    copia.totals.marginPct = manuale > 0 ? ((manuale - costo) / manuale) * 100 : 0;
    copia.totals.markupPct = costo > 0 ? ((manuale - costo) / costo) * 100 : 0;
    return congela(copia);
  }

  /* ── Ordini nati prima di questo modulo ────────────────────────────────────
     Non si ricostruisce niente. Un margine dedotto dai costi di oggi sembra un
     dato e non lo è, ed è peggio di una casella vuota — perché una casella
     vuota si vede. */
  function classifica(ordine) {
    var o = ordine || {};
    if (o.economicSnapshot && o.economicSnapshot.stato === 'SNAPSHOT') return 'SNAPSHOT';
    if (o.economicSnapshot && o.economicSnapshot.stato === 'NO_SNAPSHOT') return 'NO_SNAPSHOT';
    return 'LEGACY_NO_SNAPSHOT';
  }

  /** Cosa si può dire onestamente di un ordine, snapshot o no. */
  function leggi(ordine) {
    var stato = classifica(ordine);
    if (stato === 'SNAPSHOT') {
      /* Ricongelare alla lettura non è ridondante: il giro nel database
         restituisce una copia sciolta, e da lì in poi qualunque vista
         potrebbe «aggiustare» un totale senza che nessuno se ne accorga. */
      return { stato: stato, disponibile: true, snapshot: congela(ordine.economicSnapshot) };
    }
    return {
      stato: stato,
      disponibile: false,
      snapshot: null,
      messaggio: stato === 'LEGACY_NO_SNAPSHOT'
        ? 'Dati economici storici non disponibili: questo ordine è precedente allo snapshot economico.'
        : 'Snapshot non acquisito: ' + ((ordine.economicSnapshot || {}).motivo || 'motivo non registrato'),
      /* I due numeri che il vecchio ordine conservava si mostrano per quello
         che sono: un totale, non un conto. */
      totaleStorico: ordine && ordine.value != null ? num(ordine.value) : null,
    };
  }

  /* ── Delta ─────────────────────────────────────────────────────────────────
     Per il ricalcolo esplicito: mai sostituire, sempre mostrare la differenza
     e lasciare decidere. */
  function confronta(snapshot, calcoloAttuale) {
    if (!snapshot || snapshot.stato !== 'SNAPSHOT' || !calcoloAttuale || calcoloAttuale.indisponibile) {
      return { confrontabile: false, motivo: 'manca uno dei due termini' };
    }
    var s = snapshot.totals;
    var a = calcoloAttuale;
    var riga = function (etichetta, prima, dopo, percentuale) {
      return {
        voce: etichetta, storico: prima, attuale: dopo,
        delta: dopo - prima,
        deltaPct: prima !== 0 ? ((dopo - prima) / Math.abs(prima)) * 100 : null,
        unita: percentuale ? '%' : '€',
      };
    };
    return {
      confrontabile: true,
      capturedAt: snapshot.capturedAt,
      righe: [
        riga('Costo', s.totalCost, num(a.totalCost)),
        riga('Prezzo netto', s.subtotalNet, num(a.subtotalNet)),
        riga('Prezzo cliente', s.totalGross, num(a.totalGross)),
        riga('Profitto lordo', s.grossProfit, num(a.grossProfit)),
        riga('Margine', s.marginPct, num(a.marginPct), true),
      ],
    };
  }

  /* ── Registro delle modifiche economiche ───────────────────────────────────
     Il minimo robusto: quando, chi, cosa, prima, dopo, perché. Vive nel record
     dell'ordine, non in un archivio a parte — così non può divergere da ciò
     che descrive. */
  var EVENTI = ['ORDER_CREATED', 'ORDER_CONFIRMED', 'ORDER_RECALCULATED',
    'ORDER_DISCOUNT_CHANGED', 'ORDER_PRICE_OVERRIDE', 'ORDER_CANCELLED'];

  function registra(ordine, evento, dettaglio) {
    var o = ordine || {};
    var d = dettaglio || {};
    if (EVENTI.indexOf(evento) < 0) return o;
    if (!Array.isArray(o.economicLog)) o.economicLog = [];
    o.economicLog.push({
      at: d.quando || ora(),
      user: d.user || null,
      action: evento,
      before: d.before != null ? d.before : null,
      after: d.after != null ? d.after : null,
      reason: d.reason || null,
    });
    /* Un registro che cresce senza limite diventa il record più pesante del
       database: si conservano gli ultimi cento eventi economici. */
    if (o.economicLog.length > 100) o.economicLog.splice(0, o.economicLog.length - 100);
    return o;
  }

  /* ── Duplicazione ──────────────────────────────────────────────────────────
     Un ordine duplicato è un ordine **nuovo**: copiarne lo snapshot
     significherebbe attribuirgli costi che nessuno ha sostenuto in quel
     momento. Si copia cosa vendere, non a quanto costava. */
  function perDuplicazione(ordine) {
    var o = ordine || {};
    var snap = o.economicSnapshot;
    return {
      duplicatedFromOrderId: o.id != null ? o.id : null,
      /* Cosa vendere: le voci e le quantità. */
      lines: (snap && snap.lines ? snap.lines : []).map(function (l) {
        return {
          itemId: l.itemSnapshot.itemId,
          name: l.itemSnapshot.name,
          qty: l.quantity,
          unit: l.itemSnapshot.unit,
        };
      }),
      /* Nessuno snapshot: lo costruirà la conferma del nuovo ordine, con i
         valori di allora. */
      economicSnapshot: null,
    };
  }

  global.InglyOrderSnapshot = {
    SCHEMA: SCHEMA,
    EVENTI: EVENTI,
    VOCI: VOCI,
    costruisci: costruisci,
    conOverride: conOverride,
    classifica: classifica,
    leggi: leggi,
    confronta: confronta,
    registra: registra,
    perDuplicazione: perDuplicazione,
  };
})(typeof window !== 'undefined' ? window : globalThis);
