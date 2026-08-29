/* ═══════════════════════════════════════════════════════════════════════════
   ECONOMIA DELL'ORDINE · la vista che legge lo storico e non lo ricalcola
   ═══════════════════════════════════════════════════════════════════════════

   Il dettaglio di un ordine mostrava un campo «Valore €» e nient'altro: un
   totale senza un conto. Da qui in poi mostra il conto — ma solo quello che
   era stato congelato alla conferma, mai una ricostruzione con i dati di
   oggi.

   La distinzione non è formale. Un pannello che rilegge il listino corrente
   per disegnare un ordine di marzo scrive un margine che sembra storico e non
   lo è, e nessuno può accorgersene guardandolo. Per questo qui non compare
   nessuna chiamata a `InglyCostEngine` o `InglyQuoteAdapter` sul percorso di
   disegno: la sola strada verso il motore passa da «Ricalcola», che l'utente
   preme di proposito e che mostra una differenza invece di sostituire.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var esc = function (s) {
    return (global.InglyUI && global.InglyUI.esc)
      ? global.InglyUI.esc(s)
      : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
  };

  var num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : 0; };
  var eu = function (n) { return '€ ' + (Math.round(num(n) * 100) / 100).toFixed(2); };
  var pc = function (n) { return n == null ? '—' : num(n).toFixed(1) + '%'; };

  var ETICHETTE = {
    materiale: 'Materiale', energia: 'Energia', macchina: 'Ammortamento macchina',
    manutenzione: 'Manutenzione', manodopera: 'Manodopera', setup: 'Avviamento',
    scarto: 'Scarto previsto', overhead: 'Spese generali', packaging: 'Confezione',
    commissioni: 'Commissioni', spedizione: 'Spedizione', extra: 'Extra',
    /* Le chiavi della scomposizione di riga, che hanno nomi propri. */
    materialCost: 'Materiale', laborCost: 'Manodopera', energyCost: 'Energia',
    machineCost: 'Macchina', maintenanceCost: 'Manutenzione', packagingCost: 'Confezione',
    setupCost: 'Avviamento', wasteCost: 'Scarto', overheadCost: 'Spese generali',
    directCost: 'Costo diretto',
  };

  function riga(etichetta, valore, forte, nota) {
    return '<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;'
      + (forte ? 'border-top:1px solid var(--border);font-weight:800' : '') + '">'
      + '<span style="color:var(--text-muted);font-size:12px">' + esc(etichetta)
      + (nota ? '<br><small style="color:var(--text-dim);font-size:10px">' + esc(nota) + '</small>' : '')
      + '</span>'
      + '<span style="font-size:12px;white-space:nowrap">' + esc(valore) + '</span></div>';
  }

  function intestazione(titolo, badge) {
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
      + '<div style="font-size:13px;font-weight:800;color:var(--text)">' + esc(titolo) + '</div>'
      + (badge || '') + '</div>';
  }

  /** Il contrassegno «questo è uno storico», che è l'informazione principale. */
  function badgeStorico(quando) {
    return '<span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;'
      + 'background:var(--bg-card2);border:1px solid var(--border);color:var(--text-muted)">'
      + '🔒 Aperto come storico' + (quando ? ' · ' + esc(String(quando).slice(0, 10)) : '') + '</span>';
  }

  /* ── Ordini senza storico ──────────────────────────────────────────────────
     Nessun numero ricostruito. Il totale che il vecchio record conservava si
     mostra come totale, con detto a chiare lettere che il conto non c'è. */
  function pannelloAssente(letto) {
    return '<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:14px">'
      + intestazione('Economia dell\'ordine')
      + '<div style="font-size:12px;color:var(--text-muted);line-height:1.5">' + esc(letto.messaggio) + '</div>'
      + (letto.totaleStorico != null
        ? '<div style="margin-top:10px">' + riga('Totale registrato allora', eu(letto.totaleStorico), true,
          'un totale, non un conto: costi, margine e sconto non erano stati conservati') + '</div>'
        : '')
      + '</div>';
  }

  /** Il pannello completo, letto **solo** dallo snapshot. */
  function pannello(ordine) {
    var S = global.InglyOrderSnapshot;
    if (!S) return '';
    var letto = S.leggi(ordine);
    if (!letto.disponibile) return pannelloAssente(letto);

    var s = letto.snapshot;
    var t = s.totals;

    /* Ogni riga apre il proprio conto. La domanda che si fa davanti a un
       ordine vecchio non è «quanto», è «perché»: senza la scomposizione, il
       pannello risponde alla domanda facile. */
    var righeVoci = (s.lines || []).map(function (l) {
      var voci = l.costBreakdown || {};
      var dettaglio = Object.keys(voci).map(function (k) {
        var v = voci[k];
        return '<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0 3px 12px">'
          + '<span style="font-size:11px;color:var(--text-muted)">' + esc(ETICHETTE[k] || k)
          + ' <small style="color:var(--text-dim);font-size:9px">' + esc(v.source === 'ripartito' ? 'ripartito · ' + (v.basis || '') : 'misurato') + '</small></span>'
          + '<span style="font-size:11px;white-space:nowrap">' + esc(eu(v.amount)) + '</span></div>';
      }).join('');

      return '<details style="border-bottom:1px dashed var(--border)">'
        + '<summary style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;cursor:pointer;list-style:none">'
        + '<span style="font-size:12px">' + esc(l.itemSnapshot.name)
        + (l.itemSnapshot.sku ? ' <small style="color:var(--text-dim);font-size:10px">' + esc(l.itemSnapshot.sku) + '</small>' : '')
        + '<br><small style="color:var(--text-dim);font-size:10px">'
        + esc(l.quantity + ' ' + (l.itemSnapshot.unit || 'pz') + ' × ' + eu(l.unitPriceSnapshot) + ' · costo unitario ' + eu(l.unitCostSnapshot))
        + '</small></span>'
        + '<span style="font-size:12px;text-align:right;white-space:nowrap">' + esc(eu(l.subtotalSnapshot))
        + '<br><small style="color:var(--text-dim);font-size:10px">margine ' + esc(pc(l.marginSnapshot)) + '</small></span>'
        + '</summary>'
        + '<div style="padding:4px 0 8px">' + dettaglio
        + '<div style="display:flex;justify-content:space-between;gap:10px;padding:4px 0 0 12px;border-top:1px solid var(--border);font-weight:700">'
        + '<span style="font-size:11px">Costo attribuito</span>'
        + '<span style="font-size:11px">' + esc(eu(l.costTotal)) + '</span></div>'
        + (Math.abs(num(l.costBreakdownResidual)) > 0.005
          ? '<div style="font-size:10px;color:var(--amber,#f59e0b);padding-left:12px">residuo non attribuito ' + esc(eu(l.costBreakdownResidual)) + '</div>'
          : '')
        + '<div style="font-size:9px;color:var(--text-dim);padding-left:12px;margin-top:4px">'
        + esc([l.pricingPolicy ? 'politica ' + l.pricingPolicy : null,
          l.pricingProfile ? 'profilo ' + l.pricingProfile : null,
          l.calculationVersion ? 'calcolo ' + l.calculationVersion : null].filter(Boolean).join(' · '))
        + '</div></div></details>';
    }).join('');

    var voci = (s.costBreakdownSnapshot && s.costBreakdownSnapshot.voci) || {};
    var righeCosto = Object.keys(voci).map(function (k) {
      var v = voci[k];
      return riga(ETICHETTE[k] || k, eu(v.amount), false,
        [v.detail, v.formula].filter(Boolean).join(' · ') || null);
    }).join('');

    var sconto = s.discountSnapshot || {};
    var tasse = s.taxSnapshot || {};
    var sped = s.shippingSnapshot || {};
    var comm = s.commissionSnapshot || {};

    return '<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:14px">'

      + '<div>' + intestazione('Economia dell\'ordine', badgeStorico(s.capturedAt))
      + '<div style="font-size:10px;color:var(--text-dim);margin-bottom:8px">'
      + 'motore ' + esc(s.costEngineVersion) + ' · schema ' + esc(s.schemaVersion)
      + (s.pricingProfile ? ' · profilo ' + esc(s.pricingProfile) : '')
      + (s.pricingStrategy ? ' · strategia ' + esc(s.pricingStrategy) : '')
      + (s.pricingPolicySnapshot ? ' · politica ' + esc(s.pricingPolicySnapshot.label || s.pricingPolicySnapshot.id) : '')
      + '</div>'
      + riga('Costo reale', eu(t.totalCost))
      + riga('Prezzo netto', eu(t.subtotalNet))
      + (sconto.requestedPct > 0
        ? riga('Sconto', pc(sconto.appliedPct) + ' · ' + eu(sconto.amount),
          false, sconto.floorTriggered ? 'richiesto ' + pc(sconto.requestedPct) + ', ridotto per proteggere il margine minimo' : null)
        : '')
      + riga('IVA ' + pc(tasse.ratePct), eu(tasse.amount))
      + (sped.charged > 0 || sped.cost > 0
        ? riga('Spedizione', eu(sped.charged), false, 'costo ' + eu(sped.cost) + (sped.margin < 0 ? ' · in perdita di ' + eu(-sped.margin) : ''))
        : '')
      + (comm.total > 0 ? riga('Commissioni', eu(comm.total)) : '')
      + riga('Prezzo cliente', eu(t.totalGross), true)
      + riga('Profitto lordo', eu(t.grossProfit))
      + riga('Profitto operativo', eu(t.operatingProfit))
      + riga('Margine', pc(t.marginPct), true)
      + '</div>'

      + (s.priceOverride
        ? '<div style="border-left:3px solid var(--amber, #f59e0b);padding-left:10px">'
        + intestazione('Prezzo deciso a mano')
        + riga('Calcolato dal sistema', eu(s.priceOverride.systemPrice))
        + riga('Venduto a', eu(s.priceOverride.manualPrice), true, s.priceOverride.reason || null)
        + '</div>' : '')

      + (righeVoci ? '<div>' + intestazione('Righe congelate') + righeVoci + '</div>' : '')

      + (righeCosto ? '<details><summary style="cursor:pointer;font-size:13px;font-weight:800;color:var(--text)">Cost Audit · da dove viene il costo</summary>'
        + '<div style="margin-top:8px">' + righeCosto
        + '<div style="font-size:10px;color:var(--text-dim);margin-top:8px">'
        + 'Questi importi sono quelli di allora. Non vengono riletti dal listino corrente.</div></div></details>' : '')

      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
      + '<button onclick="InglyOrderEconomics.chiediRicalcolo(' + esc(String(ordine.id)) + ')" '
      + 'style="padding:8px 14px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-muted);border-radius:8px;cursor:pointer;font-size:12px;font-weight:600">'
      + '🔄 Ricalcola con i dati di oggi</button>'
      + '<span style="font-size:10px;color:var(--text-dim);flex:1;min-width:180px">Mostra la differenza. Non sostituisce niente senza conferma.</span>'
      + '</div>'

      + '</div>';
  }

  /* ── Il ricalcolo esplicito ────────────────────────────────────────────────
     L'unica strada che riporta al motore, e la percorre l'utente. Mostra un
     confronto e chiede; se si conferma, la sostituzione viene registrata nel
     log economico e il valore precedente resta leggibile.

     Un limite dichiarato invece che nascosto: le righe del preventivo storico
     non hanno un riferimento all'articolo di magazzino — sono descrizioni con
     un costo digitato — quindi il ricalcolo applica il motore e le politiche
     di oggi ai **costi dichiarati allora**. Un rincaro del materiale non entra
     in questo confronto, e dirlo è meglio che mostrare un delta che sembra
     completo e non lo è. */
  function statoDaPreventivo(q) {
    var A = global.InglyQuoteAdapter;
    if (!q || !A) return null;
    return {
      lines: q.lines || [],
      strategia: 'ricarico',
      markup: 1 + A.markupPctDi(q) / 100,
      discountPct: num(q.discount),
      vatPct: q.ivaMode !== false ? 22 : 0,
      setupCost: 0,
    };
  }

  async function chiediRicalcolo(orderId) {
    var UI = global.InglyUI;
    var S = global.InglyOrderSnapshot;
    var A = global.InglyQuoteAdapter;
    var avviso = function (m, t) { if (global.toast) global.toast(m, t || 'warning'); };
    if (!S || !A || typeof global.IDB === 'undefined') return avviso('Ricalcolo non disponibile');

    var ordini = await global.IDB.getAll('orders').catch(function () { return []; });
    var o = (ordini || []).filter(function (x) { return String(x.id) === String(orderId); })[0];
    if (!o) return avviso('Ordine non trovato');
    if (S.classifica(o) !== 'SNAPSHOT') return avviso('Questo ordine non ha uno storico economico da confrontare');

    var q = o.originQuote != null ? await global.IDB.get('quotes', o.originQuote).catch(function () { return null; }) : null;
    if (!q) return avviso('Il preventivo di origine non è più disponibile: non c\'è nulla da ricalcolare');

    var attuale = A.calculateQuote(statoDaPreventivo(q));
    var delta = S.confronta(o.economicSnapshot, attuale);
    if (!delta.confrontabile) return avviso('Confronto non possibile: ' + (delta.motivo || ''));

    var corpo = delta.righe.map(function (r) {
      var segno = r.delta > 0 ? '+' : '';
      var colore = Math.abs(r.delta) < 0.005 ? 'var(--text-muted)' : (r.delta > 0 ? 'var(--green, #22c55e)' : 'var(--red, #ef4444)');
      var v = function (n) { return r.unita === '%' ? pc(n) : eu(n); };
      return '<tr><td style="padding:5px 8px;font-size:12px">' + esc(r.voce) + '</td>'
        + '<td style="padding:5px 8px;font-size:12px;text-align:right">' + esc(v(r.storico)) + '</td>'
        + '<td style="padding:5px 8px;font-size:12px;text-align:right">' + esc(v(r.attuale)) + '</td>'
        + '<td style="padding:5px 8px;font-size:12px;text-align:right;color:' + colore + ';font-weight:700">'
        + esc(segno + v(r.delta)) + '</td></tr>';
    }).join('');

    var html = '<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">'
      + 'Storico congelato il ' + esc(String(delta.capturedAt).slice(0, 10))
      + '. Il confronto applica il motore e le politiche di oggi ai costi dichiarati allora: '
      + 'le righe del preventivo non hanno un riferimento all\'articolo di magazzino, quindi un rincaro '
      + 'del materiale non compare in questa differenza.</div>'
      + '<table style="width:100%;border-collapse:collapse">'
      + '<tr><th style="text-align:left;padding:5px 8px;font-size:10px;color:var(--text-dim)">Voce</th>'
      + '<th style="text-align:right;padding:5px 8px;font-size:10px;color:var(--text-dim)">Storico</th>'
      + '<th style="text-align:right;padding:5px 8px;font-size:10px;color:var(--text-dim)">Oggi</th>'
      + '<th style="text-align:right;padding:5px 8px;font-size:10px;color:var(--text-dim)">Differenza</th></tr>'
      + corpo + '</table>';

    /* `InglyUI.confirm` esce di scena qui: fa `esc()` sul messaggio, ed è
       giusto che lo faccia. Una tabella di differenze vuole `openDialog`, che
       riceve un corpo già composto — e composto da questo file, con `esc()`
       su ogni valore che viene dai dati. */
    if (!UI || !UI.openDialog) return avviso('Interfaccia non disponibile');
    var conferma = await UI.openDialog({
      title: 'Ricalcolo dell\'ordine',
      size: 'lg',
      body: html,
      actions: [
        { label: 'Chiudi senza toccare niente', variant: 'secondary', value: false },
        { label: 'Sostituisci lo storico', variant: 'danger', value: true },
      ],
    }).promise;
    if (conferma !== true) return;

    /* La sostituzione lascia traccia: il totale di prima resta leggibile nel
       registro, altrimenti il ricalcolo sarebbe una cancellazione. */
    var prima = o.economicSnapshot.totals.totalGross;
    o.economicSnapshot = S.costruisci(attuale, { motivo: null });
    o.value = o.economicSnapshot.totals.totalGross;
    S.registra(o, 'ORDER_RECALCULATED', {
      before: prima, after: o.economicSnapshot.totals.totalGross,
      reason: 'ricalcolo richiesto dall\'utente sul dettaglio ordine',
    });
    o.updatedAt = new Date().toISOString();
    await global.IDB.put('orders', o);
    if (global.toast) global.toast('Storico sostituito e registrato nel log economico', 'success');
    if (global.Orders && global.Orders.render) await global.Orders.render();
  }

  global.InglyOrderEconomics = {
    pannello: pannello,
    statoDaPreventivo: statoDaPreventivo,
    chiediRicalcolo: chiediRicalcolo,
  };
})(typeof window !== 'undefined' ? window : globalThis);
