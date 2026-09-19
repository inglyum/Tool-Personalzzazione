/* ═══════════════════════════════════════════════════════════════════════════
   PURCHASE ORDER STORE · l'ordine d'acquisto incontra il database
   ═══════════════════════════════════════════════════════════════════════════

   `purchase-order.js` è puro e non sa cosa sia IndexedDB. Questo file è la
   metà che lo sa: scrive in `supplier_orders` — uno store dichiarato da anni
   in `idb.js` (v18, «Registro ordini fornitore») e mai scritto da nessuno,
   che è la ragione per cui le card «Ordini in Attesa» / «⚠️ In Ritardo» della
   Gestione Fornitori sono sempre state a zero.

   Non aggiorna la giacenza da sola: passa i movimenti che `ricevi()`
   restituisce a `InglyInventory.registra`, l'unico scrittore di giacenza
   (Fase 31). Aggiorna anche le statistiche del fornitore (`totalSpent`,
   `orderCount`, `lastOrder`, `avgDeliveryDays`, `avgDaysBetween`) sullo
   stesso record IDB `suppliers` che la card del fornitore già legge — sono
   ricalcolate dagli ordini ricevuti, non incrementate a ogni chiamata, perché
   un ricevimento parziale seguito da uno finale non deve contare due ordini.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var STORE = 'supplier_orders';
  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };

  function PO() { return global.InglyPurchaseOrder; }
  function Inv() { return global.InglyInventory; }
  function db() { return global.IDB; }

  async function tutti() {
    if (!db()) return [];
    return await db().getAll(STORE).catch(function () { return []; });
  }

  async function delFornitore(supplierId) {
    var t = await tutti();
    return t.filter(function (o) { return String(o.supplierId) === String(supplierId); });
  }

  /** Crea e persiste un nuovo ordine. Unico punto di scrittura per un ordine
      nuovo — chi vuole registrare un acquisto passa da qui, non da un
      `IDB.put` diretto altrove. */
  async function crea(ordineInput) {
    var Motore = PO();
    if (!Motore || !db()) return { ok: false, motivo: 'motore ordini non disponibile' };

    var esistenti = await tutti();
    var idEsistenti = esistenti.map(function (o) { return o.id; });
    var v = Motore.valida(ordineInput, { idEsistenti: idEsistenti });
    if (!v.valido) return { ok: false, motivo: v.errori.join('; '), errori: v.errori };

    var ordine = Motore.crea(ordineInput);
    if (!ordine) return { ok: false, motivo: 'ordine non costruibile' };

    await db().put(STORE, JSON.parse(JSON.stringify(ordine)));
    return { ok: true, ordine: ordine };
  }

  /**
   * Registra un ricevimento (totale o parziale), scrive l'ordine aggiornato,
   * registra i movimenti di magazzino corrispondenti e ricalcola le
   * statistiche del fornitore. Le tre scritture avvengono in questo ordine
   * perché ognuna dipende dallo stato scritto dalla precedente.
   */
  async function ricevi(ordineId, ricevimento) {
    var Motore = PO();
    var Magazzino = Inv();
    if (!Motore || !Magazzino || !db()) return { ok: false, motivo: 'motore non disponibile' };

    var ordine = await db().get(STORE, ordineId).catch(function () { return null; });
    if (!ordine) return { ok: false, motivo: 'ordine inesistente: ' + ordineId };
    var statoAttuale = Motore.STATI[ordine.status];
    if (statoAttuale && !statoAttuale.aperto) {
      return { ok: false, motivo: 'ordine già ' + statoAttuale.label.toLowerCase() + ': non si riceve un ordine chiuso' };
    }

    var esito = Motore.ricevi(ordine, ricevimento);
    await db().put(STORE, JSON.parse(JSON.stringify(esito.ordine)));

    var movimentiRegistrati = [];
    for (var i = 0; i < esito.movimenti.length; i++) {
      movimentiRegistrati.push(await Magazzino.registra(esito.movimenti[i]));
    }

    await ricalcolaStatisticheFornitore(ordine.supplierId);

    return { ok: true, ordine: esito.ordine, movimenti: movimentiRegistrati, avvisi: esito.avvisi };
  }

  /** Annulla un ordine ancora aperto. Non lo cancella: un ordine annullato
      resta nel registro, come un movimento di magazzino non si cancella mai —
      dice che qualcosa è stato ordinato e poi non è più servito. */
  async function annulla(ordineId, motivo) {
    var Motore = PO();
    if (!Motore || !db()) return { ok: false, motivo: 'motore non disponibile' };
    var ordine = await db().get(STORE, ordineId).catch(function () { return null; });
    if (!ordine) return { ok: false, motivo: 'ordine inesistente: ' + ordineId };
    var stato = Motore.STATI[ordine.status];
    if (stato && !stato.aperto) return { ok: false, motivo: 'ordine già ' + stato.label.toLowerCase() };
    var aggiornato = Object.assign({}, ordine, { status: 'annullato', cancelledAt: new Date().toISOString(), cancelReason: motivo || null });
    await db().put(STORE, aggiornato);
    return { ok: true, ordine: aggiornato };
  }

  /**
   * Ricalcola le statistiche del fornitore dagli ordini realmente ricevuti —
   * non le incrementa: un ricevimento parziale seguito da uno finale sullo
   * stesso ordine deve contare come un ordine, non due, e ricalcolare da zero
   * è l'unico modo semplice per cui questo resta vero.
   */
  async function ricalcolaStatisticheFornitore(supplierId) {
    var Motore = PO();
    if (!Motore || !db()) return null;
    var ordini = await delFornitore(supplierId);
    var ricevuti = ordini.filter(function (o) { return o.status === 'ricevuto' || o.status === 'ricevuto_parziale'; });

    var chiave = isNaN(+supplierId) ? supplierId : +supplierId;
    var rec = await db().get('suppliers', chiave).catch(function () { return null; });
    if (!rec) return null;

    var totalSpent = ricevuti.reduce(function (a, o) { return a + num(o.totale); }, 0);
    var ordinatiPerData = ricevuti.slice().sort(function (a, b) {
      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });
    var ultimo = ordinatiPerData.length ? ordinatiPerData[ordinatiPerData.length - 1] : null;

    var gaps = [];
    for (var i = 1; i < ordinatiPerData.length; i++) {
      var g = (new Date(ordinatiPerData[i].createdAt).getTime() - new Date(ordinatiPerData[i - 1].createdAt).getTime()) / 86400000;
      if (isFinite(g) && g >= 0) gaps.push(g);
    }

    var punteggio = Motore.punteggioFornitore(ordini);

    rec.totalSpent = totalSpent;
    rec.orderCount = ricevuti.length;
    rec.lastOrder = ultimo ? (ultimo.receivedAt || ultimo.createdAt) : (rec.lastOrder || null);
    if (punteggio.calcolabile && punteggio.tempoConsegnaMedioGiorni != null) {
      rec.avgDeliveryDays = Math.round(punteggio.tempoConsegnaMedioGiorni);
    }
    if (gaps.length) {
      rec.avgDaysBetween = Math.round(gaps.reduce(function (a, b) { return a + b; }, 0) / gaps.length);
    }
    rec.updatedAt = new Date().toISOString();
    await db().put('suppliers', rec);
    return rec;
  }

  global.InglyPurchaseOrderStore = {
    STORE: STORE,
    tutti: tutti,
    delFornitore: delFornitore,
    crea: crea,
    ricevi: ricevi,
    annulla: annulla,
    ricalcolaStatisticheFornitore: ricalcolaStatisticheFornitore,
  };
})(typeof window !== 'undefined' ? window : globalThis);
