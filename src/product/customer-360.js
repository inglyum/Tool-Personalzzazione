/* ═══════════════════════════════════════════════════════════════════════════
   CUSTOMER 360 · CRM-15 (storico economico) + CRM-17 (timeline unificata)
   ═══════════════════════════════════════════════════════════════════════════

   Questo file non calcola niente che non sia già calcolato altrove. Ricavo,
   costo, profitto e margine di un ordine li possiede `InglyOrderEconomics`;
   il valore di un cliente lo possiede `InglyCLV`; lo stato di un preventivo e
   il suo legame con l'ordine li possiede `InglyQuoteStatus`. Un CRM che
   ricalcolasse questi numeri per conto suo sarebbe un secondo motore
   economico — esattamente il difetto che l'intero progetto ha già pagato più
   volte (`docs/COST-ENGINE-CONSOLIDATION.md`).

   Il contributo di questo file è uno solo: **isolare per cliente**, sempre
   per `clientId`, mai per nome. È lo stesso principio di CRM-04 applicato ai
   dati economici invece che all'anagrafica — e lo stesso difetto, quando non
   rispettato, è quello corretto in CRM-05b: due clienti con lo stesso nome
   che vedono il fatturato l'uno dell'altro.

   ── Quello che questo file NON aggrega, e perché ─────────────────────────

   Le note interne (`ingly_note_interne_v1`) e lo storico comunicazioni
   (`lb2b_comm_hist_v1`, scritto da `CommHistory.add`) sono indicizzati per
   nome cliente normalizzato, non per id — e a differenza del profilo
   cliente (CRM-05b), qui il lato che SCRIVE non ha quasi mai un `clientId`
   risolto a disposizione (il campo cliente del calcolatore Laser B2B è
   testo libero). Includerli nella timeline riaprirebbe lo stesso difetto di
   CRM-05b in una superficie nuova, con un lato scrittore che questa
   correzione non può chiudere senza toccare un flusso di preventivazione
   oggi verde. Restano fuori, dichiarati qui e in `docs/CRM-ROADMAP.md`, non
   dimenticati.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';
  var GIORNO = 86400000;

  var num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : 0; };

  function E() { return global.InglyOrderEconomics; }
  function QS() { return global.InglyQuoteStatus; }
  function CLVMod() { return global.InglyCLV; }

  function quando(v) {
    if (v == null || v === '') return 0;
    var t = (v instanceof Date) ? v.getTime() : new Date(v).getTime();
    return isFinite(t) ? t : 0;
  }

  /** La data di un ordine, comunque sia scritta — lo stesso schema di
      fallback che il resto del progetto usa per gli ordini. */
  function dataOrdine(o) {
    return o && (o.created || o.createdAt || o.date || o.updatedAt);
  }
  function dataPreventivo(q) {
    return q && (q.date || q.createdAt || q.created);
  }

  /* ── L'isolamento: sempre per clientId ────────────────────────────────────
     Un ordine o un preventivo senza clientId non appartiene a nessun cliente
     qui: non si ripiega sul nome, perché è esattamente il ripiego che ha
     mescolato i dati di due clienti omonimi in CRM-05b. Chi vuole includere
     anche lo storico pre-CRM-04 lo fa a monte, migrando quei record — non è
     compito di questo modulo indovinare a chi appartengono. */
  function ordiniDiCliente(clientId, ordini) {
    var k = String(clientId);
    return (Array.isArray(ordini) ? ordini : []).filter(function (o) {
      return o && o.clientId != null && String(o.clientId) === k;
    });
  }
  function preventiviDiCliente(clientId, preventivi) {
    var k = String(clientId);
    return (Array.isArray(preventivi) ? preventivi : []).filter(function (q) {
      return q && q.clientId != null && String(q.clientId) === k;
    });
  }

  /* ── CRM-15 · Statistiche cliente ─────────────────────────────────────────
     Ogni numero dice se è noto e da dove viene. Un KPI non calcolabile non
     diventa zero: torna null con un motivo, e la vista lo scrive N/D. */
  function statisticheCliente(clientId, dati) {
    var d = dati || {};
    var Eco = E(), Qs = QS();
    var ordini = ordiniDiCliente(clientId, d.ordini);
    var preventivi = preventiviDiCliente(clientId, d.preventivi);

    var ricaviNoti = [], costiNoti = [], profittiNoti = [];
    ordini.forEach(function (o) {
      if (!Eco) return;
      var r = Eco.getOrderRevenueNet(o);
      if (r.noto) ricaviNoti.push(r.valore);
      var c = Eco.getOrderProductionCost(o);
      if (c.noto) costiNoti.push(c.valore);
      var p = Eco.getOrderProfit(o);
      if (p.noto) profittiNoti.push(p.valore);
    });

    var fatturato = ricaviNoti.reduce(function (a, v) { return a + v; }, 0);
    var costo = costiNoti.reduce(function (a, v) { return a + v; }, 0);
    var profitto = profittiNoti.length ? profittiNoti.reduce(function (a, v) { return a + v; }, 0) : null;
    var margine = (profitto != null && fatturato > 0) ? (profitto / fatturato) * 100 : null;

    var dateOrdini = ordini.map(dataOrdine).map(quando).filter(Boolean).sort(function (a, b) { return a - b; });

    var pipeline = (Qs && preventivi.length) ? Qs.pipeline(preventivi, { orders: ordini }) : null;

    return {
      clientId: String(clientId),
      ordini: {
        numero: ordini.length,
        fatturatoNetto: { valore: ricaviNoti.length ? fatturato : null, noto: ricaviNoti.length > 0, coperti: ricaviNoti.length, totali: ordini.length,
          motivo: ricaviNoti.length ? null : (ordini.length ? 'nessun ordine porta un ricavo dichiarato' : 'nessun ordine per questo cliente') },
        costoTotale: { valore: costiNoti.length ? costo : null, noto: costiNoti.length > 0, coperti: costiNoti.length, totali: ordini.length,
          motivo: costiNoti.length ? null : 'nessun ordine porta un costo di produzione dichiarato' },
        profittoTotale: { valore: profitto, noto: profitto != null, coperti: profittiNoti.length, totali: ordini.length,
          motivo: profitto != null ? null : 'profitto calcolabile solo dove ricavo e costo sono entrambi noti' },
        marginePct: { valore: margine, noto: margine != null,
          motivo: margine != null ? null : (fatturato > 0 ? 'profitto non noto' : 'fatturato non noto o a zero') },
        valoreMedio: { valore: (ricaviNoti.length > 0) ? fatturato / ricaviNoti.length : null, noto: ricaviNoti.length > 0,
          motivo: ricaviNoti.length > 0 ? null : 'nessun ricavo dichiarato da cui fare una media' },
        primo: dateOrdini.length ? new Date(dateOrdini[0]).toISOString() : null,
        ultimo: dateOrdini.length ? new Date(dateOrdini[dateOrdini.length - 1]).toISOString() : null,
      },
      preventivi: {
        numero: preventivi.length,
        accettatiOConvertiti: pipeline ? (pipeline.conteggi.ACCEPTED + pipeline.conteggi.CONVERTED) : (preventivi.length ? 0 : null),
        tassoConversionePct: { valore: pipeline ? pipeline.conversionePct : null,
          noto: !!(pipeline && pipeline.conversionePct != null),
          motivo: !pipeline ? 'nessun preventivo per questo cliente'
            : (pipeline.conversionePct == null ? 'nessun preventivo ancora deciso (accettato, convertito, rifiutato o scaduto)' : null) },
        pipelineAperta: pipeline ? pipeline.valore : null,
      },
    };
  }

  /* ── CRM-15 · Storico economico per periodo ───────────────────────────────
     Quattro finestre, tutte sugli stessi ordini filtrati per clientId. Nessun
     grafico: numeri, con la copertura dichiarata quando è parziale. */
  var PERIODI = [
    { id: '30g', label: 'Ultimi 30 giorni', giorni: 30 },
    { id: '90g', label: 'Ultimi 90 giorni', giorni: 90 },
    { id: 'anno', label: 'Anno in corso', giorni: null, annoCorrente: true },
    { id: 'tutto', label: 'Tutto lo storico', giorni: null },
  ];

  function inPeriodo(tOrdine, periodo, adesso) {
    if (periodo.giorni != null) return tOrdine >= adesso - periodo.giorni * GIORNO;
    if (periodo.annoCorrente) return new Date(tOrdine).getFullYear() === new Date(adesso).getFullYear();
    return true; // 'tutto'
  }

  function storicoEconomico(clientId, ordini, opzioni) {
    var o = opzioni || {};
    var Eco = E();
    var adesso = quando(o.adesso) || Date.now();
    var tutti = ordiniDiCliente(clientId, ordini);

    return PERIODI.map(function (periodo) {
      var lista = tutti.filter(function (ord) {
        var t = quando(dataOrdine(ord));
        return t && inPeriodo(t, periodo, adesso);
      });

      var ricavi = [], costi = [], profitti = [];
      lista.forEach(function (ord) {
        if (!Eco) return;
        var r = Eco.getOrderRevenueNet(ord); if (r.noto) ricavi.push(r.valore);
        var c = Eco.getOrderProductionCost(ord); if (c.noto) costi.push(c.valore);
        var p = Eco.getOrderProfit(ord); if (p.noto) profitti.push(p.valore);
      });
      var sommaRicavi = ricavi.reduce(function (a, v) { return a + v; }, 0);
      var sommaCosti = costi.reduce(function (a, v) { return a + v; }, 0);
      var sommaProfitti = profitti.length ? profitti.reduce(function (a, v) { return a + v; }, 0) : null;
      var margine = (sommaProfitti != null && sommaRicavi > 0) ? (sommaProfitti / sommaRicavi) * 100 : null;

      return {
        id: periodo.id, label: periodo.label,
        ordini: lista.length,
        ricavi: ricavi.length ? sommaRicavi : null,
        ricaviNoti: ricavi.length, ricaviTotali: lista.length,
        costi: costi.length ? sommaCosti : null,
        profitto: sommaProfitti,
        marginePct: margine,
        ticketMedio: ricavi.length ? sommaRicavi / ricavi.length : null,
        coperturaCompleta: lista.length > 0 && ricavi.length === lista.length,
      };
    });
  }

  /* ── CRM-15 · CLV, senza riscriverne la formula ───────────────────────────
     `InglyCLV.calcola` lavora su tutti i clienti in un colpo; qui si estrae
     solo la riga di quello richiesto. Chi vuole ricalcolare tutta la
     classifica chiama `InglyCLV` direttamente — questo è un accessor, non
     un secondo percorso. */
  function clvCliente(clientId, ordini, clienti, opzioni) {
    var C = CLVMod();
    if (!C) return { disponibile: false, motivo: 'modulo CLV non caricato' };
    var righe = C.calcola(ordini, clienti, opzioniConDefault(opzioni));
    var k = String(clientId);
    var riga = righe.filter(function (r) { return r.id != null && String(r.id) === k; })[0];
    if (!riga) return { disponibile: false, motivo: 'nessun dato CLV per questo cliente (nessun ordine con questo clientId, e non presente in anagrafica)' };
    return { disponibile: true, riga: riga };
  }
  function opzioniConDefault(opzioni) { return opzioni || {}; }

  /* ── CRM-17 · Timeline unificata ───────────────────────────────────────────
     Solo eventi con una data vera nel record — mai una data indovinata per
     uno stato che non la porta. Il preventivo diventato ordine è un legame,
     non un secondo evento inventato: usa `InglyQuoteStatus.ordineDi/
     preventivoDi`, già corretti e testati, per unire le due righe. */
  function timelineCliente(clientId, dati) {
    var d = dati || {};
    var Qs = QS();
    var eventi = [];
    var push = function (data, tipo, etichetta, dettaglio, rif) {
      var t = quando(data);
      if (!t) return; // niente eventi senza una data reale
      eventi.push({ t: t, data: new Date(t).toISOString(), tipo: tipo, etichetta: etichetta, dettaglio: dettaglio || null, rif: rif || null });
    };

    if (d.cliente) {
      push(d.cliente.createdAt || d.cliente.added, 'CLIENTE_CREATO', 'Cliente aggiunto', null, { id: d.cliente.id });
      if (d.cliente.updatedAt && quando(d.cliente.updatedAt) - quando(d.cliente.createdAt || d.cliente.added) > 60000) {
        push(d.cliente.updatedAt, 'CLIENTE_MODIFICATO', 'Dati cliente aggiornati', null, { id: d.cliente.id });
      }
    }

    var ordini = ordiniDiCliente(clientId, d.ordini);
    var preventivi = preventiviDiCliente(clientId, d.preventivi);

    preventivi.forEach(function (q) {
      var stato = Qs ? Qs.statoDi(q, { orders: ordini }) : null;
      var ordineLegato = Qs ? Qs.ordineDi(q, ordini) : null;
      push(dataPreventivo(q), 'PREVENTIVO_CREATO', 'Preventivo creato',
        (q.product || q.description || null),
        { id: q.id, statoAttuale: stato ? stato.label : null, ordineId: ordineLegato ? ordineLegato.id : null });
      if (q.viewedAt || q.vistoIl) {
        push(q.viewedAt || q.vistoIl, 'PREVENTIVO_VISTO', 'Preventivo visualizzato dal cliente', null, { id: q.id });
      }
    });

    ordini.forEach(function (o) {
      var preventivoOrigine = Qs ? Qs.preventivoDi(o, preventivi) : null;
      push(dataOrdine(o), 'ORDINE_CREATO', 'Ordine creato',
        (o.description || o.product || null),
        { id: o.id, stato: o.status || null, daPreventivo: preventivoOrigine ? preventivoOrigine.id : null });
      if (o.updatedAt && quando(o.updatedAt) - quando(dataOrdine(o)) > 60000) {
        push(o.updatedAt, 'ORDINE_AGGIORNATO', 'Ordine aggiornato — stato: ' + (o.status || 'n/d'), null, { id: o.id });
      }
    });

    eventi.sort(function (a, b) { return b.t - a.t; }); // più recente prima
    return eventi;
  }

  global.InglyCustomer360 = {
    VERSIONE: VERSIONE,
    PERIODI: PERIODI,
    ordiniDiCliente: ordiniDiCliente,
    preventiviDiCliente: preventiviDiCliente,
    statisticheCliente: statisticheCliente,
    storicoEconomico: storicoEconomico,
    clvCliente: clvCliente,
    timelineCliente: timelineCliente,
  };
})(typeof window !== 'undefined' ? window : globalThis);
