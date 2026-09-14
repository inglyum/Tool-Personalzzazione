/* ═══════════════════════════════════════════════════════════════════════════
   INCASSI — un solo modo di dire «pagato»
   ═══════════════════════════════════════════════════════════════════════════

   Nell'applicazione «segna pagato» era scritto tre volte, e le tre versioni
   non facevano le stesse cose:

                              markPaid   bulkMarkPaid   Solleciti.markPaid
     snapshot prima di scrivere   sì          no                no
     `paidAt`                     sì          sì             **no**
     voce di cashflow             sì          no                no
     ordine collegato → venduto   sì          no                no
     registro azioni              sì          no                no
     evento sul bus            sale:paid     nessuno      sale:created

   Cioè: incassare dal pannello Solleciti lasciava la vendita senza data di
   incasso, l'ordine fermo in produzione e nessuna traccia nel registro. Non
   era un errore di scrittura: era la stessa operazione implementata tre
   volte, e l'ultima scritta non sapeva delle altre.

   Qui l'operazione è una sola. I tre punti la chiamano.

   ── Il piano di pagamento non si ricalcola ──────────────────────────────

   Acconto e saldo li calcola `InglyDomain.payments.paymentPlan`, che esiste
   già ed è usato dall'anteprima fattura. Questo modulo lo chiama, non ne
   scrive una seconda versione. Se quel motore manca, il piano si dichiara
   non disponibile invece di inventare una percentuale.

   ── Gli effetti si possono iniettare ────────────────────────────────────

   `registra()` ha bisogno dell'archivio, del bus, del registro. Li prende dal
   contesto passato, e solo in mancanza di quello dai globali. È il motivo per
   cui si può provare senza un browser.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  function num(v) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : null;
  }

  /* ── Lo stato di incasso, letto dai campi che esistono già ────────────── */

  /**
   * Quanto vale, quanto è entrato, quanto manca.
   * Non inventa: se l'importo non è leggibile lo dichiara.
   */
  function stato(vendita) {
    var v = vendita || {};
    var totale = num(v.grossAmount);
    var fonteTot = 'grossAmount';
    if (totale == null) { totale = num(v.amount); fonteTot = 'amount'; }
    if (totale == null) { totale = num(v.netAmount); fonteTot = 'netAmount'; }
    if (totale == null) { totale = num(v.total); fonteTot = 'total'; }

    var acconto = num(v.deposit);
    var pagato = String(v.status || '').toLowerCase() === 'pagato';

    if (totale == null) {
      return {
        noto: false, motivo: 'importo della vendita non leggibile',
        totale: null, incassato: null, residuo: null,
        pagato: pagato, acconto: acconto, fonte: null,
      };
    }
    var incassato = pagato ? totale : (acconto != null ? acconto : 0);
    return {
      noto: true, motivo: null,
      totale: totale,
      incassato: incassato,
      residuo: Math.max(0, totale - incassato),
      pagato: pagato,
      acconto: acconto,
      accontoPagatoIl: v.depositPaidAt || null,
      saldoPagatoIl: v.paidAt || null,
      fonte: fonteTot,
    };
  }

  /**
   * Acconto e saldo. Il conto lo fa il motore che esiste; qui c'è solo la
   * traduzione e la dichiarazione di indisponibilità.
   */
  function piano(totale, acconto) {
    var t = num(totale);
    if (t == null) return { disponibile: false, motivo: 'totale non leggibile' };
    var D = global.InglyDomain;
    if (!D || !D.payments || typeof D.payments.paymentPlan !== 'function') {
      return { disponibile: false, motivo: 'motore pagamenti non disponibile' };
    }
    var p = D.payments.paymentPlan(t, num(acconto) || 0);
    return {
      disponibile: true,
      acconto: p.deposit,
      saldo: p.balance,
      accontoPct: p.depositPct,
      fonte: 'InglyDomain.payments.paymentPlan',
    };
  }

  /* ── L'incasso, con tutti i suoi effetti ──────────────────────────────── */

  function contesto(c) {
    c = c || {};
    return {
      idb: c.idb || global.IDB,
      bus: c.bus || global.Bus,
      store: c.store || global.AppStore,
      snapshot: c.snapshot || global.snapshotRecord,
      log: c.log || global.logAction,
      /* Il cashflow automatico ha un interruttore, ed era spento di default:
         non si accende di nascosto passando di qui. */
      cashflowAttivo: c.cashflowAttivo !== undefined ? c.cashflowAttivo : (function () {
        try { return global.localStorage && global.localStorage.getItem('s5b_auto_cashflow') === '1'; }
        catch (e) { return false; }
      }()),
      adesso: c.adesso || function () { return new Date().toISOString(); },
    };
  }

  /**
   * Segna una vendita come incassata, con tutto quello che ne consegue.
   * Restituisce { ok, vendita, effetti[], motivo }. Ogni effetto è annotato,
   * così chi chiama sa cosa è successo davvero e non cosa avrebbe dovuto.
   */
  async function registra(vendita, opzioni) {
    var C = contesto(opzioni);
    var effetti = [];
    var v = vendita;

    if (v == null) return { ok: false, motivo: 'vendita assente', effetti: effetti };
    /* Un id da solo basta: si rilegge. */
    if (typeof v !== 'object') {
      if (!C.idb || typeof C.idb.get !== 'function') {
        return { ok: false, motivo: 'archivio non disponibile', effetti: effetti };
      }
      v = await C.idb.get('sales', v);
      if (!v) return { ok: false, motivo: 'vendita non trovata', effetti: effetti };
    }

    var s = stato(v);
    if (s.pagato) return { ok: true, vendita: v, giaPagata: true, effetti: effetti };

    /* Prima di toccare: la copia di sicurezza. Era il passo che due percorsi
       su tre saltavano. */
    if (typeof C.snapshot === 'function') {
      try { await C.snapshot('sales', v.id); effetti.push('snapshot'); }
      catch (e) { effetti.push('snapshot-fallito:' + (e && e.message)); }
    }

    var quando = C.adesso();
    v.status = 'pagato';
    v.paidAt = quando;
    if (s.noto) v.incassato = s.totale;

    if (!C.idb || typeof C.idb.put !== 'function') {
      return { ok: false, motivo: 'archivio non disponibile', vendita: v, effetti: effetti };
    }
    await C.idb.put('sales', v);
    effetti.push('vendita-aggiornata');

    if (typeof C.log === 'function') {
      try { await C.log('sale', v.id, 'marked_paid'); effetti.push('registro'); }
      catch (e) { effetti.push('registro-fallito:' + (e && e.message)); }
    }
    if (C.bus && typeof C.bus.emit === 'function') {
      C.bus.emit('sale:paid', { id: v.id });
      effetti.push('evento');
    }
    if (C.store && typeof C.store.invalidate === 'function') C.store.invalidate('sales');

    /* Entrata di cassa — solo se l'interruttore è acceso. */
    if (C.cashflowAttivo && s.noto && s.totale > 0) {
      try {
        await C.idb.put('cashflow', {
          id: Date.now(),
          type: 'entrata',
          date: String(quando).split('T')[0],
          desc: '💰 Vendita pagata: ' + (v.product || v.desc || v.name || ('#' + v.id)),
          amount: s.totale,
          cat: 'vendita',
          _fromSaleId: v.id,
          _auto: true,
        });
        if (C.store && typeof C.store.invalidate === 'function') C.store.invalidate('cashflow');
        effetti.push('cashflow');
      } catch (e) { effetti.push('cashflow-fallito:' + (e && e.message)); }
    }

    /* L'ordine collegato non resta in produzione dopo essere stato pagato. */
    var idOrdine = v.fromOrderId || v.originOrder || v.orderId;
    if (idOrdine && typeof C.idb.get === 'function') {
      try {
        var ord = await C.idb.get('orders', (+idOrdine || idOrdine));
        if (ord && ['sold', 'invoiced'].indexOf(ord.stage) === -1) {
          ord.stage = 'sold';
          ord.soldAt = quando;
          ord.updatedAt = quando;
          await C.idb.put('orders', ord);
          if (C.store && typeof C.store.invalidate === 'function') {
            C.store.invalidate('orders'); C.store.invalidate('pipeline');
          }
          effetti.push('ordine-venduto');
        }
      } catch (e) { effetti.push('ordine-fallito:' + (e && e.message)); }
    }

    return { ok: true, vendita: v, effetti: effetti };
  }

  global.InglyPagamenti = {
    VERSIONE: VERSIONE,
    stato: stato,
    piano: piano,
    registra: registra,
  };
})(typeof window !== 'undefined' ? window : globalThis);
