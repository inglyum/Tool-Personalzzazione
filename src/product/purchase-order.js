/* ═══════════════════════════════════════════════════════════════════════════
   ORDINE D'ACQUISTO · dal suggerimento di riordino alla giacenza che cresce
   ═══════════════════════════════════════════════════════════════════════════

   `InglyRiordino` dice «ordina 40 pezzi di questo materiale» (Fase 57). Fino a
   qui, quel numero finiva in una nota a mano o in un modulo che aggiornava
   solo il totale speso di un fornitore — mai un ordine vero, mai la giacenza.
   Il registro di magazzino (Fase 31) riserva da tempo un tipo di riferimento
   `PURCHASE_ORDER` e un campo `supplierId` sul movimento: questo modulo è la
   parte che mancava fra le due cose.

   Tre principi, gli stessi del registro e della manutenzione:

   1. **Un ordine non si riscrive: avanza.** Ricevere non modifica le righe
      dell'ordine, aggiunge quanto è arrivato. Le righe originali restano la
      prova di cosa era stato chiesto.
   2. **Ricevere è l'unico modo di far crescere la giacenza da un acquisto.**
      Questo modulo non tocca IndexedDB: `ricevi()` restituisce i movimenti da
      passare a `InglyInventory.registra`/`.acquista`, che è l'unico scrittore
      di giacenza in tutto il progetto (Fase 31). Un secondo modo di
      aggiornarla sarebbe il quinto magazzino che questo progetto ha già
      imparato a non costruire.
   3. **Un punteggio fornitore viene solo da ordini ricevuti davvero.** Senza
      almeno due ricevimenti reali il punteggio è «dati insufficienti», non un
      voto a metà — la stessa disciplina N/D del resto del motore economico.

   Puro: nessun IDB, nessun DOM. La persistenza (store `supplier_orders`, già
   dichiarato e da anni vuoto) è il passo successivo.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };
  var pos = function (v, d) { return Math.max(0, num(v, d)); };
  function ora() { try { return new Date().toISOString(); } catch (e) { return ''; } }
  function oggiISO(quando) { try { return new Date(quando || Date.now()).toISOString().slice(0, 10); } catch (e) { return ''; } }

  function congela(o) {
    if (!o || typeof o !== 'object') return o;
    Object.keys(o).forEach(function (k) { congela(o[k]); });
    return Object.freeze(o);
  }

  /* ── Gli stati ────────────────────────────────────────────────────────────
     Quattro. `attesa` è lo stesso valore stringa che `SuppliersManager`
     leggeva già (KPI «Ordini in Attesa» / «In Ritardo», dichiarate anni fa e
     mai valorizzate perché nessuno scriveva in `supplier_orders`): usarlo qui
     non è un caso, è il modo per cui quelle due card diventano vere senza
     toccare una riga della vista che le disegna. */
  var STATI = {
    attesa:            { label: 'In attesa di consegna',    aperto: true },
    ricevuto_parziale: { label: 'Ricevuto parzialmente',    aperto: true },
    ricevuto:          { label: 'Ricevuto',                 aperto: false },
    annullato:         { label: 'Annullato',                aperto: false },
  };

  function valida(ordine, contesto) {
    var c = contesto || {};
    var o = ordine || {};
    var errori = [];

    if (o.supplierId == null || o.supplierId === '') errori.push('ordine senza fornitore');
    if (c.fornitoriNoti && o.supplierId != null && c.fornitoriNoti.indexOf(String(o.supplierId)) < 0) {
      errori.push('fornitore inesistente: ' + o.supplierId);
    }
    var righe = Array.isArray(o.righe) ? o.righe : [];
    if (!righe.length) errori.push('ordine senza righe');
    righe.forEach(function (r, i) {
      if (!r || r.itemId == null || r.itemId === '') errori.push('riga ' + i + ' senza articolo');
      var q = parseFloat(r && r.quantity);
      if (r && (r.quantity == null || r.quantity === '' || !isFinite(q) || q <= 0)) {
        errori.push('riga ' + i + ' senza quantità valida');
      }
    });
    if (c.idEsistenti && o.id != null && c.idEsistenti.indexOf(String(o.id)) >= 0) {
      errori.push('id già presente nel registro ordini: ' + o.id);
    }

    return { valido: errori.length === 0, errori: errori };
  }

  function rigaOrdine(r) {
    var q = pos(r && r.quantity);
    var costo = r && r.unitCost != null ? pos(r.unitCost) : null;
    return {
      itemId: String(r.itemId),
      itemName: r.itemName || null,
      store: r.store || 'items',
      unit: r.unit || null,
      quantity: q,
      unitCost: costo,
      lineTotal: costo != null ? costo * q : null,
      received: 0,
    };
  }

  /** Un ordine, congelato alla nascita — le righe non si correggono dopo: si
      riceve, o si annulla, ma non si riscrive cosa era stato chiesto. */
  function crea(ordine) {
    var o = ordine || {};
    var v = valida(o);
    if (!v.valido) return null;

    var righe = o.righe.map(rigaOrdine);
    var totaleNoto = righe.every(function (r) { return r.lineTotal != null; });
    var totale = righe.reduce(function (a, r) { return a + (r.lineTotal || 0); }, 0);

    return congela({
      id: o.id != null ? String(o.id) : ('po' + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36)),
      supplierId: String(o.supplierId),
      supplierName: o.supplierName || null,
      createdAt: o.createdAt || ora(),
      expectedDate: o.expectedDate || null,
      status: 'attesa',
      righe: righe,
      totale: totale,
      totaleNoto: totaleNoto,
      note: o.note || null,
      sourceSuggestion: o.sourceSuggestion || null,
      warehouseId: o.warehouseId || 'default',
      userId: o.userId != null ? String(o.userId) : null,
    });
  }

  /**
   * Dal suggerimento di riordino (`InglyRiordino.analizza`/`.elenco`) a una
   * riga d'ordine proposta. Non produce un ordine — manca il fornitore, che
   * il motore di riordino non conosce — produce la riga che l'utente conferma
   * scegliendo a chi ordinarla.
   *
   * Solo le righe misurabili e con un `daOrdinare` reale diventano una
   * proposta: un suggerimento «sconosciuto» non genera un numero a caso.
   */
  function daSuggerimento(righeRiordino, opzioni) {
    var o = opzioni || {};
    var arrotonda = o.arrotonda !== false;
    return (righeRiordino || [])
      .filter(function (r) { return r && r.misurabile && r.daOrdinare > 0; })
      .map(function (r) {
        var q = arrotonda ? Math.ceil(r.daOrdinare) : r.daOrdinare;
        return {
          itemId: r.itemId,
          itemName: r.nome || null,
          unit: r.unita || null,
          quantity: q,
          motivo: 'proposto dal riordino: giacenza ' + r.giacenza + ', punto di riordino ' + Math.round(r.suggerito || 0),
        };
      });
  }

  /** Un ordine è scaduto quando è ancora aperto e la consegna attesa è
      passata. Senza `expectedDate` dichiarata non si inventa una scadenza. */
  function scaduto(ordine, oggi) {
    var o = ordine || {};
    var s = STATI[o.status];
    if (!s || !s.aperto || !o.expectedDate) return false;
    return o.expectedDate < oggiISO(oggi);
  }

  function quantitaResidua(riga) {
    return Math.max(0, pos(riga.quantity) - pos(riga.received));
  }

  /**
   * Registra un ricevimento, totale o parziale. Non riscrive le righe
   * dell'ordine: le fa avanzare, e non oltre quanto era stato ordinato — un
   * tentativo di ricevere più del residuo si taglia al residuo e lo dichiara,
   * non lo nasconde sommandolo silenziosamente.
   *
   * Restituisce l'ordine aggiornato (nuovo record congelato, l'originale non
   * si tocca) **e** i movimenti da passare a `InglyInventory.registra` — è la
   * sola via per far crescere la giacenza, e questo modulo non la percorre da
   * solo perché non conosce IndexedDB.
   */
  function ricevi(ordine, ricevimento) {
    var o = ordine || {};
    var r = ricevimento || {};
    var quando = r.quando || ora();
    var righeRicevute = Array.isArray(r.righe) ? r.righe : [];
    var avvisi = [];

    var righeAggiornate = o.righe.map(function (riga) {
      var match = righeRicevute.filter(function (x) { return String(x.itemId) === riga.itemId; })[0];
      if (!match) return riga;

      var residuo = quantitaResidua(riga);
      var richiesta = pos(match.quantity);
      var accettata = Math.min(richiesta, residuo);
      if (richiesta > residuo) {
        avvisi.push('ricevuti ' + richiesta + ' ' + (riga.unit || '') + ' di ' + riga.itemId +
          ' ma il residuo era ' + residuo + ': registrati solo ' + accettata);
      }
      return Object.assign({}, riga, { received: pos(riga.received) + accettata });
    });

    var tutteComplete = righeAggiornate.every(function (riga) { return quantitaResidua(riga) <= 0.0000001; });
    var qualcheArrivo = righeAggiornate.some(function (riga) { return riga.received > 0; });
    var nuovoStato = tutteComplete ? 'ricevuto' : (qualcheArrivo ? 'ricevuto_parziale' : o.status);

    var ordineAggiornato = congela(Object.assign({}, o, {
      righe: righeAggiornate,
      status: nuovoStato,
      receivedAt: tutteComplete ? quando : (o.receivedAt || null),
      lastReceiptAt: qualcheArrivo ? quando : (o.lastReceiptAt || null),
    }));

    /* I movimenti: uno per riga davvero arrivata, con il costo del *questo*
       ricevimento — non quello a listino dell'articolo, per la stessa
       ragione per cui il registro non rilegge mai il costo da fuori. */
    var movimenti = [];
    righeRicevute.forEach(function (match) {
      var rigaOriginale = o.righe.filter(function (x) { return x.itemId === String(match.itemId); })[0];
      if (!rigaOriginale) { avvisi.push('riga ricevuta per un articolo non presente nell\'ordine: ' + match.itemId); return; }
      var residuo = quantitaResidua(rigaOriginale);
      var quantitaAccettata = Math.min(pos(match.quantity), residuo);
      if (quantitaAccettata <= 0) return;
      movimenti.push({
        type: 'PURCHASE',
        store: rigaOriginale.store,
        itemId: rigaOriginale.itemId,
        itemName: rigaOriginale.itemName,
        quantity: quantitaAccettata,
        unitCost: match.unitCost != null ? pos(match.unitCost) : rigaOriginale.unitCost,
        warehouseId: r.warehouseId || o.warehouseId || 'default',
        referenceType: 'PURCHASE_ORDER',
        referenceId: o.id,
        supplierId: o.supplierId,
        timestamp: quando,
        note: 'ricevimento ordine ' + o.id + (r.note ? ' — ' + r.note : ''),
      });
    });

    return { ordine: ordineAggiornato, movimenti: movimenti, avvisi: avvisi };
  }

  /**
   * Il punteggio di un fornitore, da ciò che è stato osservato per davvero:
   * niente prezzi di mercato, niente recensioni — solo gli ordini che questo
   * laboratorio gli ha fatto e come sono andati a finire. Con meno di due
   * ricevimenti non c'è una tendenza, solo un punto: si dichiara «dati
   * insufficienti» invece di far sembrare un caso singolo un giudizio.
   */
  var ORDINI_MINIMI_PUNTEGGIO = 2;

  function punteggioFornitore(ordiniDelFornitore) {
    var tutti = ordiniDelFornitore || [];
    var ricevuti = tutti.filter(function (o) { return o.status === 'ricevuto' || o.status === 'ricevuto_parziale'; });

    if (ricevuti.length < ORDINI_MINIMI_PUNTEGGIO) {
      return {
        calcolabile: false,
        motivo: ricevuti.length === 0
          ? 'nessun ordine ricevuto da questo fornitore'
          : 'un solo ordine ricevuto: non basta per una tendenza (minimo ' + ORDINI_MINIMI_PUNTEGGIO + ')',
        numeroOrdiniRicevuti: ricevuti.length,
        numeroOrdiniTotali: tutti.length,
      };
    }

    var conScadenza = ricevuti.filter(function (o) { return !!o.expectedDate && !!o.receivedAt; });
    var puntuali = conScadenza.filter(function (o) { return oggiISO(o.receivedAt) <= o.expectedDate; });

    var conTempo = ricevuti.filter(function (o) { return !!o.receivedAt; });
    var giorniConsegna = conTempo.map(function (o) {
      var d = (new Date(o.receivedAt).getTime() - new Date(o.createdAt).getTime()) / 86400000;
      return d >= 0 ? d : null;
    }).filter(function (d) { return d != null; });
    var tempoMedioGiorni = giorniConsegna.length
      ? giorniConsegna.reduce(function (a, b) { return a + b; }, 0) / giorniConsegna.length
      : null;

    var spesaTotale = ricevuti.reduce(function (a, o) { return a + pos(o.totale); }, 0);
    var ultimo = ricevuti.slice().sort(function (a, b) {
      return String(a.receivedAt || a.createdAt || '').localeCompare(String(b.receivedAt || b.createdAt || ''));
    }).pop();

    return {
      calcolabile: true,
      numeroOrdiniRicevuti: ricevuti.length,
      numeroOrdiniTotali: tutti.length,
      spesaTotale: spesaTotale,
      puntualita: conScadenza.length ? (puntuali.length / conScadenza.length) : null,
      puntualitaSuOrdini: conScadenza.length,
      motivoPuntualita: conScadenza.length ? null : 'nessun ordine ricevuto aveva una data di consegna attesa dichiarata',
      tempoConsegnaMedioGiorni: tempoMedioGiorni,
      ultimoOrdine: ultimo ? (ultimo.receivedAt || ultimo.createdAt) : null,
    };
  }

  /**
   * Il confronto fra fornitori per uno stesso articolo (o in generale): non
   * un listino prezzi — non esiste una storia prezzi multi-fornitore in
   * questo progetto — ma la sola cosa che si può dire onestamente da ciò che
   * è stato comprato davvero: chi ha consegnato puntuale, chi più in fretta,
   * chi non ha ancora abbastanza storia per un giudizio.
   */
  function confronta(fornitori, ordiniPerFornitore) {
    var opf = ordiniPerFornitore || {};
    var righe = (fornitori || []).map(function (f) {
      var punteggio = punteggioFornitore(opf[String(f.id)] || []);
      return { fornitoreId: f.id, fornitoreName: f.name || null, punteggio: punteggio };
    });

    righe.sort(function (a, b) {
      if (a.punteggio.calcolabile !== b.punteggio.calcolabile) return a.punteggio.calcolabile ? -1 : 1;
      if (!a.punteggio.calcolabile) return 0;
      var pa = a.punteggio.puntualita != null ? a.punteggio.puntualita : -1;
      var pb = b.punteggio.puntualita != null ? b.punteggio.puntualita : -1;
      if (pa !== pb) return pb - pa;
      return (a.punteggio.tempoConsegnaMedioGiorni || Infinity) - (b.punteggio.tempoConsegnaMedioGiorni || Infinity);
    });

    return {
      righe: righe,
      confrontabili: righe.filter(function (r) { return r.punteggio.calcolabile; }).length,
      dataInsufficienti: righe.filter(function (r) { return !r.punteggio.calcolabile; }).length,
    };
  }

  global.InglyPurchaseOrder = {
    VERSIONE: VERSIONE,
    STATI: STATI,
    ORDINI_MINIMI_PUNTEGGIO: ORDINI_MINIMI_PUNTEGGIO,
    valida: valida,
    crea: crea,
    daSuggerimento: daSuggerimento,
    scaduto: scaduto,
    quantitaResidua: quantitaResidua,
    ricevi: ricevi,
    punteggioFornitore: punteggioFornitore,
    confronta: confronta,
  };
})(typeof window !== 'undefined' ? window : globalThis);
