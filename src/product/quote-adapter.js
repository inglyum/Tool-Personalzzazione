/* ═══════════════════════════════════════════════════════════════════════════
   QUOTE ADAPTER · fra le schermate del preventivo e il motore
   ═══════════════════════════════════════════════════════════════════════════

   Nel modulo `quoter` la matematica del prezzo viveva dentro le funzioni che
   disegnano: `l.subtotal * (1 + markup) * (1 - discount)`, ripetuta in sei
   punti diversi. Sei copie della stessa formula sono sei occasioni di
   divergere, e in questo progetto è già successo — la stessa riga produceva
   numeri diversi in schermate diverse a seconda di quale fosse stata
   aggiornata per ultima.

   Il contratto è semplice e va in una direzione sola:

       la UI raccoglie ingressi   →  buildQuoteInput()
       il motore calcola          →  calculateQuote()
       la UI mostra               →  renderQuoteResult() / explainQuote()

   Qui dentro non c'è aritmetica di prezzo. C'è la traduzione fra la forma in
   cui il preventivo vive nel modulo storico — righe con `subtotal`, un
   ricarico moltiplicativo, uno sconto in percentuale — e la forma che
   `InglyCostEngine` si aspetta. Il conto lo fa lui.

   Tutti i quoter producono lo stesso oggetto, `QuoteCalculationResult`, così
   una schermata scritta per uno funziona per gli altri.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };
  var pos = function (v, d) { return Math.max(0, num(v, d)); };

  function motore() { return global.InglyCostEngine; }

  /**
   * Raccoglie gli ingressi del preventivo in una forma che il motore capisce.
   * Non calcola: normalizza. È l'unico punto in cui si conosce la forma
   * storica delle righe del quoter.
   *
   * @param {Object} q  { lines, markup, discountPct, vatPct, shipping…, customer }
   */
  function buildQuoteInput(q) {
    var stato = q || {};
    var righe = (stato.lines || []).map(function (l, n) {
      /* `subtotal` è il costo della riga, non il prezzo: è la convenzione del
         modulo storico e va rispettata, non reinterpretata. */
      var costoRiga = num(l.subtotal, num(l.unitCost) * num(l.qty, 1));
      return {
        id: l.id != null ? l.id : 'riga' + n,
        label: l.name || l.desc || l.catLabel || 'Voce',
        qty: Math.max(1, num(l.qty, 1)),
        value: costoRiga,
        unitCost: num(l.unitCost, costoRiga / Math.max(1, num(l.qty, 1))),
        unit: l.unit || 'pz',
        /* La **natura** del costo, non una sua scomposizione: una riga di
           preventivo è già una voce sola — «Manodopera 40 min» — e non
           contiene dentro di sé materiale, energia e macchina da separare.
           Chi congela lo storico deve poterlo dire con precisione invece di
           inventare una ripartizione che nessuno ha dichiarato. */
        natura: l.cat || l.category || null,
        naturaLabel: l.catLabel || null,
        sku: l.sku || null,
        itemId: l.itemId != null ? l.itemId : (l.productId != null ? l.productId : null),
        descrizione: l.detail || l.desc || '',
        /* Confezione e spedizione non si buttano con un pezzo fallito. */
        perdibile: !/spediz|imball|packag/i.test(String(l.name || l.desc || '')),
      };
    });

    var costoRighe = righe.reduce(function (a, r) { return a + r.value; }, 0);

    return {
      tecnologia: 'generico',
      qty: 1,                                  // il preventivo è già un totale
      costiPerPezzo: righe.map(function (r) {
        return { id: r.id, label: r.label, value: r.value, perdibile: r.perdibile, detail: r.qty + ' ' + r.unit };
      }),
      costiUnaTantum: pos(stato.setupCost) > 0
        ? [{ id: 'avviamento', label: 'Avviamento del lavoro', value: pos(stato.setupCost) }]
        : [],
      failureRate: pos(stato.failureRate),
      overheadPct: pos(stato.overheadPct),
      overheadPerHour: pos(stato.overheadPerHour),
      hours: pos(stato.hours),
      fonti: stato.fonti || {},

      /* Metadati che il motore ignora e la vista usa. */
      _righe: righe,
      _costoRighe: costoRighe,
      _cliente: stato.customer || stato.clientName || '',
    };
  }

  /**
   * Il ricarico di un preventivo salvato, in percentuale.
   *
   * Serve un solo posto che sappia leggerlo, perché il campo storico è una
   * trappola misurata: `saveQuote` scrive `markup = percentuale / 100` (100
   * diventa 1), e le tre funzioni che ricaricano un preventivo rimettevano
   * quel numero dentro il campo che si aspetta una percentuale. Un preventivo
   * salvato al 100% si riapriva all'1%: su un costo di 100 €, 200 € diventano
   * 101 € — quasi metà del prezzo, senza un avviso.
   *
   * `markupPct` è il campo nuovo e dice quel che significa. Quando manca —
   * ogni preventivo salvato finora — il vecchio si converte, ed è una
   * conversione esatta, non una stima.
   */
  function markupPctDi(q) {
    var o = q || {};
    if (o.markupPct != null && isFinite(parseFloat(o.markupPct))) return num(o.markupPct);
    if (o.markup != null && isFinite(parseFloat(o.markup))) return num(o.markup) * 100;
    return 100;
  }

  /** Le opzioni di prezzo, nella forma del motore. */
  function buildPricingOptions(q) {
    var stato = q || {};
    /* Il quoter storico esprime il posizionamento come **ricarico
       moltiplicativo** (1.4 = +40%). Si conserva quella semantica: cambiarla
       in silenzio sposterebbe tutti i prezzi già salvati. */
    var opz = {
      strategia: stato.strategia || 'ricarico',
      ricarico: num(stato.markup, 1.4),
      marginePct: num(stato.marginePct, 40),
      prezzoFisso: pos(stato.fixedPrice),
      prezzoMercato: pos(stato.marketPrice),
      scontoPct: pos(stato.discountPct),
      ivaPct: num(stato.vatPct, 22),
      commissionePagamentoPct: pos(stato.paymentFeePct),
      commissionePagamentoFissa: pos(stato.paymentFeeFixed),
      commissioneMarketplacePct: pos(stato.marketplaceFeePct),
      spedizioneCosto: pos(stato.shippingCost),
      spedizioneAddebitata: pos(stato.shippingCharged),
      altriCostiVariabili: pos(stato.otherVariableCosts),
    };
    /* Il pavimento: dichiarato, o quello della politica scelta, o il minimo. */
    var M = motore();
    if (stato.marginePavimentoPct != null) opz.marginePavimentoPct = num(stato.marginePavimentoPct);
    else if (stato.policy && M && M.POLITICHE[stato.policy]) opz.marginePavimentoPct = M.POLITICHE[stato.policy].floorMargin;
    else if (M) opz.marginePavimentoPct = M.MARGINE_MINIMO;
    return opz;
  }

  /**
   * Il preventivo calcolato. Restituisce **sempre** la stessa forma —
   * `QuoteCalculationResult` — qualunque quoter l'abbia chiesto.
   */
  function calculateQuote(q) {
    var M = motore();
    if (!M) {
      /* Nessun prezzo indovinato: un preventivo sbagliato è peggio di uno
         mancante, ed è la regola che vale in tutto il prodotto. */
      return { indisponibile: true, motivo: 'motore di costo non disponibile', lines: [], warnings: [] };
    }

    var ingresso = buildQuoteInput(q);
    var opzioni = buildPricingOptions(q);

    var c = M.calcola(ingresso);
    var p = M.prezzo(c.costoPezzo, opzioni);

    /* ── Il prezzo di ogni riga ─────────────────────────────────────────────
       La quota si prende sul **costo diretto delle righe**, non sul costo del
       pezzo. Sembra un dettaglio e non lo è: il costo del pezzo comprende
       avviamento, spese generali e scarto, che non appartengono a nessuna riga
       in particolare, e dividere per un denominatore più grande dei numeratori
       fa somme che non tornano.

       Misurato prima della correzione, su un lavoro con 40 € di avviamento e
       32 € di spese generali: il preventivo diceva 170,93 € e le righe ne
       sommavano 50,16. Il 70,7% del preventivo non compariva in nessuna riga —
       e la schermata non aveva modo di accorgersene, perché il totale veniva
       da un'altra strada.

       Ora le quote sommano a uno per costruzione, quindi i prezzi di riga
       sommano al netto e i costi attribuiti sommano al costo. */
    var costoDiretto = ingresso._righe.reduce(function (a, r) { return a + r.value; }, 0);

    /* Lo scarto si **ripartisce**, non si ricalcola: il motore l'ha già
       misurato, qui se ne divide il totale fra le righe che lo generano. Una
       seconda formula dello scarto in questo file sarebbe un secondo motore. */
    var vociScarto = (c.perPezzo.voci || []).filter(function (v) { return v.id === 'scarto'; });
    var scartoTotale = vociScarto.reduce(function (a, v) { return a + v.value; }, 0);
    var perdibileTotale = ingresso._righe.reduce(function (a, r) { return a + (r.perdibile !== false ? r.value : 0); }, 0);

    var righe = ingresso._righe.map(function (r) {
      var quota = costoDiretto > 0 ? r.value / costoDiretto : 0;
      var prezzoRiga = p.netto * quota;
      var scartoRiga = (perdibileTotale > 0 && r.perdibile !== false)
        ? scartoTotale * (r.value / perdibileTotale) : 0;
      /* Il costo che la riga si porta davvero addosso: il suo diretto, il suo
         scarto, e la sua parte di avviamento e spese generali. È il numero con
         cui si giudica il margine di riga — il solo costo diretto lo
         gonfierebbe, ed è il modo classico di credere di guadagnare. */
      var costoAttribuito = r.value + scartoRiga + (c.unaTantum.totale + c.overhead) * quota;
      return {
        id: r.id, label: r.label, qty: r.qty, unit: r.unit,
        natura: r.natura, naturaLabel: r.naturaLabel,
        sku: r.sku, itemId: r.itemId, descrizione: r.descrizione,
        perdibile: r.perdibile,
        /* Quota del costo diretto: la base con cui l'avviamento e le spese
           generali si ripartiscono. Dichiararla serve a non far passare una
           ripartizione per una misura. */
        quotaCosto: quota,
        unitCost: r.unitCost,
        cost: r.value,
        wasteCost: scartoRiga,
        costAllocated: costoAttribuito,
        price: prezzoRiga,
        unitPrice: r.qty > 0 ? prezzoRiga / r.qty : prezzoRiga,
        profit: prezzoRiga - costoAttribuito,
        marginPct: prezzoRiga > 0 ? ((prezzoRiga - costoAttribuito) / prezzoRiga) * 100 : 0,
      };
    });

    return {
      indisponibile: false,
      versione: M.version,

      lines: righe,
      subtotalCost: c.perPezzo.totale,
      setupCost: c.unaTantum.totale,
      overhead: c.overhead,
      totalCost: c.costoPezzo,

      subtotalNet: p.netto,
      discountRequestedPct: opzioni.scontoPct,
      discountAppliedPct: p.netto > 0 && c.costoPezzo >= 0 ? scontoApplicato(p, opzioni) : 0,
      vat: p.iva,
      vatPct: p.ivaPct,
      shipping: { charged: p.spedizioneAddebitata, cost: p.spedizioneCosto, margin: p.margineSpedizione },
      commissions: p.commissioniDettaglio,
      commissionsTotal: p.commissioni,
      totalGross: p.lordo,

      grossProfit: p.profittoLordo,
      operatingProfit: p.profittoOperativo,
      netProfit: p.profittoOperativo,
      marginPct: p.marginePct,
      markupPct: p.ricaricoPct,

      quantityTiers: M.scaglioni(ingresso, q && q.tiers, opzioni),
      floorProtection: {
        active: opzioni.marginePavimentoPct != null,
        floorMarginPct: opzioni.marginePavimentoPct,
        triggered: p.pavimentoScattato,
        floorPrice: p.pavimento,
      },
      warnings: M.avvisi(c.costoPezzo, p, ingresso),
      recommendations: M.consigli(c.costoPezzo, opzioni),

      _costo: c, _prezzo: p, _ingresso: ingresso, _opzioni: opzioni,
    };
  }

  /** Quanto sconto è stato davvero concesso, dopo il pavimento. */
  function scontoApplicato(p, opzioni) {
    if (!p.pavimentoScattato) return opzioni.scontoPct;
    var pieno = p.netto / (1 - Math.min(0.99, opzioni.scontoPct / 100) || 1);
    return pieno > 0 ? Math.max(0, (1 - p.netto / pieno) * 100) : 0;
  }

  /** Il tragitto completo del prezzo, riga per riga, per la vista «come è nato». */
  function explainQuote(q) {
    var M = motore();
    if (!M) return { vuoto: true, motivo: 'motore di costo non disponibile', lines: [] };
    return M.explain(buildQuoteInput(q), buildPricingOptions(q));
  }

  /**
   * Il risultato in una forma pronta da mostrare: importi già formattati,
   * nessuna operazione lasciata alla vista. Chi disegna scrive testo, non
   * moltiplicazioni — ed è tutto il punto di questo file.
   */
  function renderQuoteResult(r, valuta) {
    if (!r || r.indisponibile) {
      return { indisponibile: true, motivo: (r && r.motivo) || 'preventivo non calcolabile', righe: [] };
    }
    var sim = valuta || '€';
    var eu = function (n) { return sim + ' ' + (Math.round(num(n) * 100) / 100).toFixed(2); };
    var pc = function (n) { return num(n).toFixed(1) + '%'; };

    var righe = [
      { id: 'subtotalCost', label: 'Costo delle voci', value: eu(r.subtotalCost) },
    ];
    if (r.setupCost > 0) righe.push({ id: 'setupCost', label: 'Avviamento', value: eu(r.setupCost) });
    if (r.overhead > 0) righe.push({ id: 'overhead', label: 'Spese generali', value: eu(r.overhead) });
    righe.push({ id: 'totalCost', label: 'Costo reale', value: eu(r.totalCost), forte: true });
    righe.push({ id: 'subtotalNet', label: 'Prezzo netto', value: eu(r.subtotalNet), forte: true });
    if (r.discountRequestedPct > 0) {
      righe.push({
        id: 'discount', label: 'Sconto',
        value: pc(r.discountAppliedPct),
        nota: r.floorProtection.triggered
          ? 'richiesto ' + pc(r.discountRequestedPct) + ', ridotto per proteggere il margine minimo'
          : null,
      });
    }
    righe.push({ id: 'vat', label: 'IVA ' + pc(r.vatPct), value: eu(r.vat) });
    if (r.shipping.charged > 0 || r.shipping.cost > 0) {
      righe.push({ id: 'shipping', label: 'Spedizione', value: eu(r.shipping.charged),
        nota: 'costo ' + eu(r.shipping.cost) + (r.shipping.margin < 0 ? ' · in perdita di ' + eu(-r.shipping.margin) : '') });
    }
    if (r.commissionsTotal > 0) {
      righe.push({ id: 'commissions', label: 'Commissioni', value: eu(r.commissionsTotal),
        nota: [
          r.commissions.pagamentoPct > 0 ? 'pagamento ' + eu(r.commissions.pagamentoPct) : null,
          r.commissions.pagamentoFissa > 0 ? 'fissa ' + eu(r.commissions.pagamentoFissa) : null,
          r.commissions.marketplace > 0 ? 'marketplace ' + eu(r.commissions.marketplace) : null,
        ].filter(Boolean).join(' · ') });
    }
    righe.push({ id: 'totalGross', label: 'Prezzo cliente', value: eu(r.totalGross), forte: true });
    righe.push({ id: 'grossProfit', label: 'Profitto lordo', value: eu(r.grossProfit) });
    righe.push({ id: 'operatingProfit', label: 'Profitto operativo', value: eu(r.operatingProfit), forte: true });
    righe.push({ id: 'marginPct', label: 'Margine', value: pc(r.marginPct) });
    righe.push({ id: 'markupPct', label: 'Ricarico', value: pc(r.markupPct) });

    return {
      indisponibile: false,
      righe: righe,
      /* Gli avvisi già ordinati per gravità: chi disegna non deve deciderlo. */
      avvisi: (r.warnings || []).slice().sort(function (a, b) {
        var ordine = { CRITICAL: 0, WARNING: 1, INFO: 2 };
        return ordine[a.livello] - ordine[b.livello];
      }),
      scaglioni: (r.quantityTiers || []).map(function (t) {
        return {
          qty: t.qty, costoPezzo: eu(t.costoPezzo), prezzoPezzo: eu(t.prezzoPezzo),
          totale: eu(t.totaleNetto), profitto: eu(t.profitto), margine: pc(t.marginePct),
          setupPezzo: eu(t.unaTantumPerPezzo),
          _qty: t.qty, _profitto: t.profitto, _margine: t.marginePct,
        };
      }),
      consigli: (r.recommendations || []).map(function (c) {
        return { id: c.id, label: c.label, recommended: c.recommended, price: eu(c.price),
          margin: pc(c.margin), markup: pc(c.markup), profit: eu(c.profit), reason: c.reason };
      }),
    };
  }

  global.InglyQuoteAdapter = {
    markupPctDi: markupPctDi,
    buildQuoteInput: buildQuoteInput,
    buildPricingOptions: buildPricingOptions,
    calculateQuote: calculateQuote,
    explainQuote: explainQuote,
    renderQuoteResult: renderQuoteResult,
  };
})(typeof window !== 'undefined' ? window : globalThis);
