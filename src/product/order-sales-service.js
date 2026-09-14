/* ═══════════════════════════════════════════════════════════════════════════
   ORDER → SALE — un solo percorso, e nessuna vendita a zero
   ═══════════════════════════════════════════════════════════════════════════

   L'audit ha misurato cinque percorsi che creano vendite da un ordine, con
   quattro formule diverse per l'importo. Lo stesso ordine — netto 150, lordo
   183, costo 60 — diventava una vendita da:

       0     `orders/index.js`   → q.grossPrice || 0
       0     `quoter/index.js`   → o.value || o.amount || 0
       0     patch 042 r.101     → value || price || grossPrice || amount
       0     patch 042 r.166     → value || 0
     150     InglyOrderEconomics.ricavoNettoOrdine

   Zero su quattro percorsi, perché l'ordine nato dal flusso canonico
   `value` non ce l'ha: ha `total`, `totalNet`, `totalGross`, `totalCost`.
   E dove un importo usciva, usciva il **lordo** mentre il modello economico
   ragiona sul **netto**: 22% di divergenza sullo stesso ordine, cioè l'IVA.

   Questo modulo è l'unico posto autorizzato a trasformare un ordine in una
   vendita. Non perché sia più elegante: perché finché i posti erano cinque,
   il fatturato dell'azienda dipendeva da quale pulsante si premeva.

   ── Cosa porta con sé ────────────────────────────────────────────────────

   Tutto quello che l'ordine sa: netto, lordo, costo, profitto, margine, la
   distinta economica, lo snapshot congelato, e **la tecnologia di produzione**
   — che non si richiede all'utente una seconda volta, perché l'ordine la sa
   già.

   ── Cosa NON fa ──────────────────────────────────────────────────────────

   Non scrive nell'archivio. Costruisce il record e lo restituisce; chi
   chiama lo salva con i propri mezzi. È il motivo per cui questo file si può
   provare senza un browser, e per cui non ha bisogno di sapere se sotto c'è
   IndexedDB o altro.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  function E() { return global.InglyOrderEconomics; }
  function P() { return global.InglyProduction; }

  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function oggi() { return new Date().toISOString().slice(0, 10); }

  /* ── I ricavi, da una fonte sola ───────────────────────────────────────── */

  /** Il ricavo dell'ordine: netto, lordo e la loro provenienza. */
  function getOrderRevenue(ordine) {
    var e = E();
    if (!e || typeof e.getOrderRevenueNet !== 'function') {
      return { netto: 0, lordo: 0, noto: false, motivo: 'modello economico non caricato' };
    }
    var n = e.getOrderRevenueNet(ordine);
    var l = e.getOrderRevenueGross(ordine);
    return {
      netto: n.valore, lordo: l.valore,
      noto: n.noto,
      nettoAmbiguo: !!n.ambiguo,
      lordoDichiarato: l.noto,
      fonteNetto: n.fonte, fonteLordo: l.fonte,
      motivo: n.noto ? null : n.motivo,
    };
  }

  /** Il ricavo di una vendita già creata, con la stessa semantica. */
  function getSaleRevenue(vendita) {
    var v = vendita || {};
    var netto = num(v.netAmount) > 0 ? num(v.netAmount) : num(v.amount);
    var lordo = num(v.grossAmount) > 0 ? num(v.grossAmount) : null;
    return {
      netto: netto,
      lordo: lordo != null ? lordo : netto,
      noto: netto > 0,
      lordoDichiarato: lordo != null,
      fonteNetto: num(v.netAmount) > 0 ? 'netAmount' : (num(v.amount) > 0 ? 'amount' : null),
    };
  }

  /** La classificazione produttiva dell'ordine, pronta da ereditare. */
  function getProductionClassification(ordine) {
    var p = P();
    if (!p) return { primaryTechnology: null, technologies: [], isMixed: false, dedotta: false };
    var letto = p.leggi(ordine);
    return {
      primaryTechnology: letto.primaryTechnology,
      technologies: letto.technologies,
      isMixed: letto.isMixed,
      dedotta: letto.dedotta,
      etichetta: p.etichetta(ordine),
    };
  }

  /* ── La creazione ──────────────────────────────────────────────────────── */

  /**
   * Costruisce la vendita che nasce da un ordine.
   *
   * @param {Object} ordine
   * @param {Object} [opzioni]  `{ id, date, channel, status, consuntivo }`
   * @returns {{ok:boolean, vendita:?Object, motivo:?string, avvisi:Array}}
   */
  function createSaleFromOrder(ordine, opzioni) {
    var o = ordine || {};
    var opt = opzioni || {};
    var avvisi = [];

    if (!o || o.id == null) {
      return { ok: false, vendita: null, motivo: 'ordine senza id: non si può generare una vendita', avvisi: avvisi };
    }

    var ric = getOrderRevenue(o);
    /* La regola che il difetto trovato rende necessaria: **una vendita non
       nasce a zero da un ordine che vale qualcosa**. Se il ricavo non si
       trova, non si scrive zero e si va avanti: ci si ferma e si dice perché.
       Uno zero scritto qui diventa un buco nel fatturato che nessuno ritrova. */
    if (!ric.noto || !(ric.netto > 0)) {
      return {
        ok: false, vendita: null,
        motivo: 'l\'ordine non dichiara un ricavo leggibile: ' + (ric.motivo || 'importo a zero')
          + '. Una vendita a zero nasconderebbe il problema invece di mostrarlo.',
        avvisi: avvisi,
      };
    }
    if (ric.nettoAmbiguo) {
      avvisi.push('il ricavo viene da un campo che non dice se è netto o lordo (' + ric.fonteNetto + ')');
    }
    if (!ric.lordoDichiarato) {
      avvisi.push('il lordo non è dichiarato sull\'ordine: la vendita riporta il netto anche come lordo');
    }

    var e = E();
    var costo = e && e.getOrderProductionCost ? e.getOrderProductionCost(o) : { valore: 0, noto: false };
    var profitto = e && e.getOrderProfit ? e.getOrderProfit(o) : { valore: null, noto: false };
    var margine = e && e.getOrderMargin ? e.getOrderMargin(o) : { valore: null, noto: false };
    if (!costo.noto) avvisi.push('costo di produzione non dichiarato: la vendita non porta margine');

    var prod = getProductionClassification(o);

    var vendita = {
      id: opt.id != null ? opt.id : Date.now(),
      clientId: o.clientId != null ? o.clientId : null,
      clientName: o.clientName || o.client || '',
      date: opt.date || oggi(),
      desc: o.name || o.desc || ('Ordine #' + o.id),

      /* ── Gli importi, con il nome che dice cosa sono ──────────────────
         `amount` resta il netto perché è quello che tutte le schermate
         esistenti leggono, e cambiarlo romperebbe il fatturato storico.
         `netAmount` e `grossAmount` lo dicono senza ambiguità. */
      amount: ric.netto,
      netAmount: ric.netto,
      grossAmount: ric.lordo,
      revenueSource: ric.fonteNetto,

      totalCost: costo.noto ? costo.valore : null,
      margine: profitto.noto ? profitto.valore : null,
      marginePct: margine.noto ? margine.valore : null,

      status: opt.status || 'da_pagare',
      channel: opt.channel || o.channel || 'Diretto',

      /* ── I legami ────────────────────────────────────────────────────── */
      orderId: o.id,
      fromOrderId: o.id,
      quoteId: o.quoteId != null ? o.quoteId : null,

      /* ── La produzione, ereditata: non si richiede all'utente ─────────── */
      productionTechnology: prod.primaryTechnology,
      productionTechnologies: prod.technologies,
      isMixedProduction: prod.isMixed,
      production: prod.technologies.length ? {
        primaryTechnology: prod.primaryTechnology,
        technologies: prod.technologies.slice(),
        isMixed: prod.isMixed,
        operations: [],
      } : null,

      /* ── La distinta economica, fino in fondo ─────────────────────────
         Una vendita che conserva solo nome e totale non permette più di
         sapere che margine si è fatto davvero. */
      costBreakdown: o.currentPricing || o.costBreakdown || null,
      pricingSnapshot: o.pricingSnapshot || null,
      economicSnapshot: o.economicSnapshot || null,

      createdBy: 'OrderSalesService',
      createdAt: new Date().toISOString(),
    };

    /* Il consuntivo, quando il chiamante ne ha uno: sostituisce il costo
       preventivato, ma **non** il ricavo — il prezzo promesso al cliente non
       si tocca mai. */
    if (opt.consuntivo && opt.consuntivo.costoTotale != null) {
      vendita.totalCost = num(opt.consuntivo.costoTotale);
      vendita.costoConsuntivo = true;
      if (opt.consuntivo.margine != null) vendita.margine = num(opt.consuntivo.margine);
      if (opt.consuntivo.marginePct != null) vendita.marginePct = num(opt.consuntivo.marginePct);
    }

    return { ok: true, vendita: vendita, motivo: null, avvisi: avvisi };
  }

  /**
   * Riallinea una vendita esistente all'ordine, senza toccare quello che
   * appartiene alla vendita: lo stato di pagamento, la data, il canale, l'id.
   * Un ordine che cambia importo non deve poter cancellare un incasso.
   */
  function syncSaleFromOrder(ordine, vendita, opzioni) {
    var esito = createSaleFromOrder(ordine, Object.assign({}, opzioni || {}, {
      id: vendita && vendita.id,
      date: vendita && vendita.date,
      channel: vendita && vendita.channel,
      status: vendita && vendita.status,
    }));
    if (!esito.ok) return esito;
    var v = vendita || {};
    /* Quello che la vendita possiede e l'ordine non sa. */
    ['status', 'paymentStatus', 'paidAt', 'invoiceNumber', 'invoicedAt', 'note', 'notes']
      .forEach(function (k) { if (v[k] !== undefined) esito.vendita[k] = v[k]; });
    esito.vendita.updatedAt = new Date().toISOString();
    esito.aggiornata = true;
    return esito;
  }

  global.InglyOrderSales = {
    VERSIONE: VERSIONE,
    createSaleFromOrder: createSaleFromOrder,
    syncSaleFromOrder: syncSaleFromOrder,
    getOrderRevenue: getOrderRevenue,
    getSaleRevenue: getSaleRevenue,
    getProductionClassification: getProductionClassification,
  };
  /* Il nome chiesto dal mandato, senza inventarne un secondo sistema. */
  global.OrderSalesService = global.InglyOrderSales;
})(typeof window !== 'undefined' ? window : globalThis);
