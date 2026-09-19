/* ═══════════════════════════════════════════════════════════════════════════
   NON CONFORMITÀ · uno scarto non è solo un numero, è una decisione
   ═══════════════════════════════════════════════════════════════════════════

   `InglyOperazioni` (il routing di produzione) sa contare da tempo i pezzi
   buoni, gli scarti e i rifacimenti di un'operazione — `qualita()` e
   `riepilogo()` esistono, sono testati, e il costo dei rifacimenti entra già
   nel costo reale. Quello che mancava non era il conto: era la **decisione**.

   Registrato uno scarto, qualcuno deve decidere cosa succede a quel pezzo —
   si rifà, si butta, si accetta con una deroga, si rispedisce al fornitore —
   e quella decisione, con chi l'ha presa e quando, è la parte che nessuna
   riga di `operations-model.js` conservava. Questo modulo aggiunge quella
   registrazione: una non conformità, legata a un ordine e a un'operazione,
   con una disposizione e — quando serve — una chiusura.

   Tre principi, gli stessi del registro di magazzino e della manutenzione:

   1. **Una non conformità non si riscrive: si chiude.** I fatti che l'hanno
      aperta restano quelli scritti alla nascita; `chiudi()` aggiunge un
      esito, non li corregge.
   2. **Non duplica `InglyOperazioni`.** Quantità, scarto e costo di
      rifacimento restano lì; questo modulo legge quei numeri per proporre
      una non conformità (`daOperazione`), non li ricalcola.
   3. **Nessuna disposizione automatica.** Uno scarto genera una proposta,
      mai una decisione presa da sola: la disposizione la sceglie chi guarda
      il pezzo, e finché non lo fa la non conformità resta aperta.

   Puro: nessun IDB, nessun DOM. La persistenza (store `quality_ncr`) è il
   passo successivo.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d != null ? d : null); };
  var pos = function (v, d) { var n = num(v, d); return n == null ? null : Math.max(0, n); };
  function ora() { try { return new Date().toISOString(); } catch (e) { return ''; } }

  function congela(o) {
    if (!o || typeof o !== 'object') return o;
    Object.keys(o).forEach(function (k) { congela(o[k]); });
    return Object.freeze(o);
  }

  /* ── Le disposizioni ──────────────────────────────────────────────────────
     Quattro, non di più — le stesse che un laboratorio reale usa davanti a
     un pezzo non conforme. `rilavorazione` è l'unica che riapre un lavoro;
     le altre tre chiudono la sorte del pezzo. */
  var DISPOSIZIONI = {
    rilavorazione:        { label: 'Rilavorazione', chiude: false },
    scarto:                { label: 'Scarto', chiude: true },
    accettato_con_deroga:  { label: 'Accettato con deroga', chiude: true },
    reso_fornitore:        { label: 'Reso al fornitore', chiude: true },
  };

  var STATI = {
    aperta: { label: 'Aperta', aperto: true },
    chiusa: { label: 'Chiusa', aperto: false },
  };

  function valida(ncr, contesto) {
    var c = contesto || {};
    var n = ncr || {};
    var errori = [];

    if (n.orderId == null || n.orderId === '') errori.push('non conformità senza ordine');
    if (c.ordiniNoti && n.orderId != null && c.ordiniNoti.indexOf(String(n.orderId)) < 0) {
      errori.push('ordine inesistente: ' + n.orderId);
    }
    var q = parseFloat(n.quantity);
    if (n.quantity == null || n.quantity === '' || !isFinite(q) || q <= 0) {
      errori.push('non conformità senza una quantità valida');
    }
    if (!n.reason) errori.push('non conformità senza un motivo dichiarato');
    if (n.disposition != null && !DISPOSIZIONI[n.disposition]) {
      errori.push('disposizione sconosciuta: ' + n.disposition);
    }
    if (c.idEsistenti && n.id != null && c.idEsistenti.indexOf(String(n.id)) >= 0) {
      errori.push('id già presente nel registro non conformità: ' + n.id);
    }

    return { valido: errori.length === 0, errori: errori };
  }

  /** Una non conformità, congelata alla nascita. Nasce aperta: la
      disposizione, se dichiarata subito, è una proposta — resta aperta
      finché non viene chiusa esplicitamente, anche se la disposizione
      dichiarata sarebbe di per sé definitiva (`scarto`, non «rilavorare»). */
  function crea(ncr) {
    var v = valida(ncr);
    if (!v.valido) return null;
    var n = ncr;

    return congela({
      id: n.id != null ? String(n.id) : ('ncr' + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36)),
      orderId: String(n.orderId),
      operationId: n.operationId != null ? String(n.operationId) : null,
      technology: n.technology || null,
      createdAt: n.createdAt || ora(),
      quantity: pos(n.quantity),
      reason: String(n.reason),
      disposition: n.disposition || null,
      reworkCost: n.reworkCost != null ? pos(n.reworkCost) : null,
      status: 'aperta',
      closedAt: null,
      closedBy: null,
      resolutionNote: null,
      userId: n.userId != null ? String(n.userId) : null,
      fonte: n.fonte || 'manuale',
    });
  }

  /** Chiude una non conformità già aperta con una disposizione definitiva.
      Non modifica i fatti che l'hanno aperta — nasce un nuovo record, non si
      riscrive quello vecchio. */
  function chiudi(ncr, esito) {
    var n = ncr || {};
    var e = esito || {};
    var stato = STATI[n.status];
    if (!stato || !stato.aperto) return { ok: false, motivo: 'non conformità già ' + (stato ? stato.label.toLowerCase() : n.status) };
    if (!e.disposition || !DISPOSIZIONI[e.disposition]) {
      return { ok: false, motivo: 'una chiusura richiede una disposizione valida' };
    }
    return {
      ok: true,
      ncr: congela(Object.assign({}, n, {
        status: 'chiusa',
        disposition: e.disposition,
        closedAt: e.quando || ora(),
        closedBy: e.approvatoDa != null ? String(e.approvatoDa) : null,
        resolutionNote: e.note || null,
      })),
    };
  }

  /**
   * Da un'operazione (nella forma che `InglyOperazioni.normalizza` produce) a
   * una proposta di non conformità: solo se c'è davvero uno scarto o un
   * rifacimento contato, e solo una proposta — non si apre una non
   * conformità da sola, la crea chi la conferma passando questo a `crea()`.
   */
  function daOperazione(operazione, opzioni) {
    var o = operazione || {};
    var opz = opzioni || {};
    var scarto = pos(o.wasteQuantity, 0) || 0;
    var rifatti = pos(o.reworkQuantity, 0) || 0;
    var quantita = scarto + rifatti;
    if (!(quantita > 0)) return null;
    if (!o.wasteReason) return { proponibile: false, motivo: 'nessun motivo di scarto dichiarato sull\'operazione' };

    return {
      proponibile: true,
      orderId: opz.orderId != null ? opz.orderId : null,
      operationId: o.id != null ? o.id : null,
      technology: o.technology || null,
      quantity: quantita,
      reason: o.wasteReason,
      reworkCost: rifatti > 0 ? o.reworkCost : null,
      suggerimento: rifatti > 0 && scarto === 0 ? 'rilavorazione'
        : (scarto > 0 && rifatti === 0 ? 'scarto' : null),
      fonte: 'operazione',
    };
  }

  /** Le non conformità di un ordine, più recenti prima. */
  function diOrdine(ncrs, orderId) {
    return (ncrs || []).filter(function (n) { return String(n.orderId) === String(orderId); })
      .slice().sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
  }

  /**
   * Il quadro di qualità: aperte, chiuse, per disposizione, per motivo — la
   * base di un pannello Qualità senza inventare un secondo modo di contare
   * scarti e rifacimenti (quello resta a `InglyOperazioni.riepilogo`).
   */
  function riepilogo(ncrs) {
    var lista = ncrs || [];
    var aperte = lista.filter(function (n) { return n.status === 'aperta'; });
    var chiuse = lista.filter(function (n) { return n.status === 'chiusa'; });

    var perDisposizione = {};
    Object.keys(DISPOSIZIONI).forEach(function (k) { perDisposizione[k] = 0; });
    chiuse.forEach(function (n) { if (n.disposition && perDisposizione[n.disposition] != null) perDisposizione[n.disposition]++; });

    var perMotivo = {};
    lista.forEach(function (n) {
      var k = n.reason || 'non dichiarato';
      perMotivo[k] = (perMotivo[k] || 0) + 1;
    });

    return {
      totale: lista.length,
      aperte: aperte.length,
      chiuse: chiuse.length,
      perDisposizione: perDisposizione,
      perMotivo: perMotivo,
      quantitaTotale: lista.reduce(function (a, n) { return a + (n.quantity || 0); }, 0),
    };
  }

  global.InglyQualityNCR = {
    VERSIONE: VERSIONE,
    DISPOSIZIONI: DISPOSIZIONI,
    STATI: STATI,
    valida: valida,
    crea: crea,
    chiudi: chiudi,
    daOperazione: daOperazione,
    diOrdine: diOrdine,
    riepilogo: riepilogo,
  };
})(typeof window !== 'undefined' ? window : globalThis);
