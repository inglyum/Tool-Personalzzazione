/* ═══════════════════════════════════════════════════════════════════════════
   PERFORMANCE PER TECNOLOGIA — e la regola che impedisce di raddoppiare
   ═══════════════════════════════════════════════════════════════════════════

   «Quanto rende il laser, quanto la stampa 3D» è la domanda per cui esiste il
   modello di produzione. Aggregarla è facile; aggregarla **senza mentire** un
   po' meno, e il modo di mentire è uno solo ma grosso:

       ordine laser + UV, 150 €
       → Laser 150 €
       → UV    150 €
       → totale a schermo: 300 €

   L'azienda ha fatturato 150. Il grafico dice 300. È il difetto che la Fase 12
   del mandato vieta esplicitamente, ed è facilissimo da introdurre — basta un
   `forEach` sulle tecnologie invece che sugli ordini.

   Qui non si può: si passa da `InglyProduction.quotaPerTecnologia()`, che
   restituisce **una riga sola** per ordine. Un misto finisce in «Misto» con
   il suo importo intero. Quando un giorno esisterà un'attribuzione economica
   per singola lavorazione, si cambierà quella funzione e questo file la
   seguirà senza accorgersene.

   ── Cosa aggrega ─────────────────────────────────────────────────────────

   Ordini, ricavo netto, costo di produzione, profitto, margine — e dove
   esiste un consuntivo, il costo reale e lo scostamento. Tutto dalla
   semantica canonica di `InglyOrderEconomics`: niente letture di campi a mano.

   Puro: niente DOM, niente archivio.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  function E() { return global.InglyOrderEconomics; }
  function P() { return global.InglyProduction; }

  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }

  /** Il costo reale registrato su un ordine, quando c'è. */
  function costoReale(ordine) {
    var o = ordine || {};
    var c = o.currentPricing && o.currentPricing.totals;
    if (c && c.costoTotale != null && num(c.costoTotale) > 0) {
      return { valore: num(c.costoTotale), noto: true };
    }
    if (o.actualCost != null && num(o.actualCost) > 0) return { valore: num(o.actualCost), noto: true };
    return { valore: 0, noto: false };
  }

  /**
   * L'aggregato per tecnologia.
   *
   * @param {Array} ordini
   * @returns {{righe:Array, totali:Object, doppioConteggio:boolean}}
   */
  function per(ordini) {
    var e = E(), p = P();
    var lista = Array.isArray(ordini) ? ordini : [];
    var gruppi = {};
    var ordiniContati = 0;

    function gruppo(id) {
      if (!gruppi[id]) {
        var info = (p && id !== 'misto' && id !== 'sconosciuta') ? p.info(id) : null;
        var etichetta = id === 'misto' ? (p ? p.MISTO : { label: 'Misto', emoji: '🔀', colore: '#8b5cf6' })
          : id === 'sconosciuta' ? (p ? p.IGNOTA : { label: 'Non dichiarata', emoji: '❔', colore: '#6b7280' })
            : info;
        gruppi[id] = {
          id: id,
          label: etichetta ? etichetta.label : id,
          emoji: etichetta ? etichetta.emoji : '',
          colore: etichetta ? etichetta.colore : '#6b7280',
          ordini: 0, ricavo: 0,
          ordiniConCosto: 0, costo: 0, profitto: 0,
          ordiniConReale: 0, costoReale: 0, scostamento: 0,
        };
      }
      return gruppi[id];
    }

    lista.forEach(function (o) {
      if (!e || !p) return;
      var ric = e.getOrderRevenueNet(o);
      if (!ric.noto) return;                 /* senza ricavo non si aggrega niente */

      /* ── La riga sola per ordine ───────────────────────────────────────
         `quotaPerTecnologia` restituisce sempre un elenco la cui somma è
         l'importo di partenza. È questa funzione a impedire il raddoppio,
         non la disciplina di chi scrive il ciclo. */
      var quote = p.quotaPerTecnologia(o, ric.valore).righe;
      ordiniContati += 1;

      var costo = e.getOrderProductionCost(o);
      var reale = costoReale(o);

      quote.forEach(function (q) {
        var g = gruppo(q.tecnologia);
        g.ordini += 1;
        g.ricavo += q.importo;
        if (costo.noto) {
          g.ordiniConCosto += 1;
          g.costo += costo.valore;
          g.profitto += (q.importo - costo.valore);
        }
        if (reale.noto && costo.noto) {
          g.ordiniConReale += 1;
          g.costoReale += reale.valore;
          /* Lo scostamento è quello che è costato davvero meno quello che si
             era detto: positivo vuol dire che è costato di più. */
          g.scostamento += (reale.valore - costo.valore);
        }
      });
    });

    var righe = Object.keys(gruppi).map(function (k) {
      var g = gruppi[k];
      return Object.assign({}, g, {
        marginePct: (g.ordiniConCosto > 0 && g.ricavo > 0) ? (g.profitto / g.ricavo) * 100 : null,
        copertura: {
          ordiniConCosto: g.ordiniConCosto,
          ordiniSenzaCosto: g.ordini - g.ordiniConCosto,
          pct: g.ordini > 0 ? (g.ordiniConCosto / g.ordini) * 100 : 0,
        },
        scostamentoNoto: g.ordiniConReale > 0,
      });
    });
    righe.sort(function (a, b) { return b.ricavo - a.ricavo; });

    var ricavoTotale = righe.reduce(function (a, r) { return a + r.ricavo; }, 0);

    return {
      righe: righe,
      totali: {
        tecnologie: righe.length,
        ordini: ordiniContati,
        ricavo: ricavoTotale,
        costo: righe.reduce(function (a, r) { return a + r.costo; }, 0),
        profitto: righe.reduce(function (a, r) { return a + r.profitto; }, 0),
        ordiniConCosto: righe.reduce(function (a, r) { return a + r.ordiniConCosto; }, 0),
      },
      /* Il controllo che rende visibile il difetto se un giorno rientrasse:
         la somma delle righe non può superare il ricavo degli ordini contati. */
      doppioConteggio: false,
      misti: (gruppi.misto && gruppi.misto.ordini) || 0,
    };
  }

  global.InglyRedditivitaTecnologia = { per: per };
})(typeof window !== 'undefined' ? window : globalThis);
