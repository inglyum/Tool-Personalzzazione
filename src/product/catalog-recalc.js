/* ═══════════════════════════════════════════════════════════════════════════
   RICALCOLO DEL CATALOGO · si vede prima, si applica dopo
   ═══════════════════════════════════════════════════════════════════════════

   Il catalogo aveva una «correzione rapida dei margini»: elencava i prodotti
   sotto il 30% e offriva due pulsanti per riscriverne il prezzo. Premuto uno,
   il prezzo era già cambiato. Nessuna anteprima dell'insieme, nessun totale,
   nessun modo di tornare indietro. E «Applica 45% a tutti» faceva esattamente
   quello che dice, su tutti, senza mostrare prima cosa sarebbe successo.

   Cambiare i prezzi di un catalogo è una decisione commerciale. Questo modulo
   la prepara e non la prende: calcola cosa succederebbe, riga per riga e in
   totale, e restituisce una proposta. Scrivere è compito di chi conferma.

   ── Una sola matematica ────────────────────────────────────────────────────
   Il prezzo da margine si calcola in `InglyCostEngine.prezzo()` e in nessun
   altro posto. Qui c'era `p.costPrice / (1 - 0.45)` scritto a mano — due
   volte, con due margini diversi — accanto a un `_prezzoConsigliato` che
   chiamava già il motore. Tre strade per lo stesso numero sono tre numeri che
   prima o poi divergono.

   ── Cosa NON fa ────────────────────────────────────────────────────────────
   Non tocca i prodotti che non hanno un costo: senza costo non esiste un
   margine, e un prezzo «consigliato» calcolato su zero è un numero inventato.
   Quelli restano nella proposta, marcati come non calcolabili, perché
   sparissero sarebbe peggio: chi guarda crederebbe che il catalogo sia tutto
   a posto.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d == null ? 0 : d); };

  var ARROTONDAMENTI = {
    nessuno: { id: 'nessuno', label: 'Nessuno', applica: function (v) { return Math.round(v * 100) / 100; } },
    intero: { id: 'intero', label: 'Euro interi', applica: function (v) { return Math.ceil(v); } },
    novantanove: { id: 'novantanove', label: 'Finale ,99', applica: function (v) { return Math.max(0, Math.ceil(v) - 0.01); } },
  };

  var PREDEFINITI = {
    marginePct: 45,
    arrotondamento: 'intero',
    /* Sotto questa differenza non si propone niente: riscrivere un prezzo per
       un centesimo è rumore, e in un elenco di duecento prodotti nasconde le
       righe che contano davvero. */
    sogliaMinima: 0.01,
  };

  function marginePct(prezzo, costo) {
    var p = num(prezzo);
    if (!(p > 0)) return null;
    return ((p - num(costo)) / p) * 100;
  }

  /** Il prezzo consigliato per un costo. Dal motore, sempre. */
  function prezzoDaMargine(costo, pct) {
    var M = global.InglyCostEngine;
    var c = num(costo);
    if (!M || typeof M.prezzo !== 'function' || !(c > 0)) return null;
    var r = M.prezzo(c, { strategia: 'margine', marginePct: num(pct, PREDEFINITI.marginePct), ivaPct: 0 });
    return r && isFinite(r.netto) ? r.netto : null;
  }

  /**
   * La proposta: cosa succederebbe, riga per riga. Non scrive niente.
   *
   * @param {Array} prodotti  i record di catalogo così come sono
   * @param {object} [opzioni] `{ marginePct, arrotondamento, sogliaMinima }`
   */
  function proposta(prodotti, opzioni) {
    var opz = opzioni || {};
    var pct = num(opz.marginePct, PREDEFINITI.marginePct);
    var arr = ARROTONDAMENTI[opz.arrotondamento] || ARROTONDAMENTI[PREDEFINITI.arrotondamento];
    var soglia = num(opz.sogliaMinima, PREDEFINITI.sogliaMinima);

    var righe = (Array.isArray(prodotti) ? prodotti : []).map(function (p) {
      var costo = num(p.costPrice);
      var attuale = num(p.salePrice);
      var base = {
        id: p.id,
        nome: p.name || p.sku || String(p.id),
        costo: costo,
        prezzoAttuale: attuale,
        marginePctAttuale: marginePct(attuale, costo),
      };

      if (!(costo > 0)) {
        return Object.assign(base, {
          calcolabile: false, cambia: false,
          prezzoNuovo: null, deltaValore: null, deltaPct: null, marginePctNuovo: null,
          motivo: 'nessun costo di produzione: il margine non esiste e il prezzo non si consiglia',
        });
      }

      var grezzo = prezzoDaMargine(costo, pct);
      if (grezzo == null) {
        return Object.assign(base, {
          calcolabile: false, cambia: false,
          prezzoNuovo: null, deltaValore: null, deltaPct: null, marginePctNuovo: null,
          motivo: 'motore dei prezzi non disponibile',
        });
      }

      var nuovo = arr.applica(grezzo);
      var delta = nuovo - attuale;
      return Object.assign(base, {
        calcolabile: true,
        prezzoNuovo: nuovo,
        deltaValore: delta,
        deltaPct: attuale > 0 ? (delta / attuale) * 100 : null,
        marginePctNuovo: marginePct(nuovo, costo),
        cambia: Math.abs(delta) >= soglia,
        motivo: Math.abs(delta) < soglia ? 'il prezzo è già quello consigliato' : null,
      });
    });

    var cambiano = righe.filter(function (r) { return r.cambia; });
    var totali = {
      prodotti: righe.length,
      calcolabili: righe.filter(function (r) { return r.calcolabile; }).length,
      nonCalcolabili: righe.filter(function (r) { return !r.calcolabile; }).length,
      daCambiare: cambiano.length,
      ricavoAttuale: cambiano.reduce(function (a, r) { return a + r.prezzoAttuale; }, 0),
      ricavoNuovo: cambiano.reduce(function (a, r) { return a + r.prezzoNuovo; }, 0),
      aumenti: cambiano.filter(function (r) { return r.deltaValore > 0; }).length,
      ribassi: cambiano.filter(function (r) { return r.deltaValore < 0; }).length,
    };
    totali.deltaValore = totali.ricavoNuovo - totali.ricavoAttuale;
    totali.deltaPct = totali.ricavoAttuale > 0 ? (totali.deltaValore / totali.ricavoAttuale) * 100 : null;

    return {
      marginePct: pct,
      arrotondamento: arr.id,
      righe: righe,
      totali: totali,
    };
  }

  /**
   * I record da scrivere, a partire dalla proposta e dagli id scelti.
   * Restituisce **copie**: la proposta e i prodotti originali non si toccano,
   * così annullare non richiede di disfare niente — semplicemente non si
   * scrive.
   */
  function daScrivere(prodotti, prop, idScelti) {
    var scelti = idScelti == null
      ? null
      : (function () { var m = {}; (idScelti || []).forEach(function (i) { m[String(i)] = 1; }); return m; })();
    var perId = {};
    (Array.isArray(prodotti) ? prodotti : []).forEach(function (p) { perId[String(p.id)] = p; });

    return (prop && prop.righe ? prop.righe : []).filter(function (r) {
      if (!r.cambia) return false;
      return scelti == null || scelti[String(r.id)] === 1;
    }).map(function (r) {
      var originale = perId[String(r.id)] || {};
      var copia = {};
      Object.keys(originale).forEach(function (k) { copia[k] = originale[k]; });
      copia.salePrice = r.prezzoNuovo;
      /* Perché quel prezzo è quello: fra sei mesi la differenza fra «l'ho
         deciso io» e «l'ha proposto il ricalcolo al 45%» conta. */
      copia._ricalcolo = {
        quando: new Date().toISOString(),
        marginePct: prop.marginePct,
        arrotondamento: prop.arrotondamento,
        prezzoPrecedente: r.prezzoAttuale,
      };
      return copia;
    });
  }

  global.InglyCatalogRicalcolo = {
    VERSIONE: '1.0.0',
    PREDEFINITI: PREDEFINITI,
    ARROTONDAMENTI: ARROTONDAMENTI,
    marginePct: marginePct,
    prezzoDaMargine: prezzoDaMargine,
    proposta: proposta,
    daScrivere: daScrivere,
  };
})(typeof window !== 'undefined' ? window : globalThis);
