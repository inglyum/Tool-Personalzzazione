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

  /* ── La politica del singolo prodotto ────────────────────────────────────
     Fino a qui il ricalcolo applicava **un margine solo a tutti**: un
     portachiavi da tre euro e un pezzo su commissione uscivano con la stessa
     percentuale, e chi voleva distinguerli doveva lanciare il ricalcolo due
     volte filtrando a mano. Le sette politiche esistevano già nel motore;
     mancava il modo per un prodotto di dire quale è la sua.

     Il campo si chiama `pricingPolicyId`. `cost_profile_id` è accettato come
     sinonimo perché è il nome con cui la richiesta è arrivata, e un dato già
     scritto con quel nome non deve diventare invisibile per una questione di
     etichetta. */
  var CAMPI_POLITICA = ['pricingPolicyId', 'cost_profile_id', 'costProfileId', 'politicaPrezzo'];

  function politicaDi(prodotto) {
    var p = prodotto || {};
    for (var i = 0; i < CAMPI_POLITICA.length; i++) {
      var v = p[CAMPI_POLITICA[i]];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    return null;
  }

  /** Il margine da applicare a una riga, e da dove viene.
      `politiche` arriva da chi chiama: questo file non legge `localStorage`,
      come il motore che interroga. */
  function margineDi(prodotto, pctPredefinita, politiche) {
    var id = politicaDi(prodotto);
    if (!id) return { pct: pctPredefinita, politica: null, fonte: 'generale' };
    var l = Array.isArray(politiche) ? politiche : [];
    for (var i = 0; i < l.length; i++) {
      if (l[i] && l[i].id === id) {
        return { pct: num(l[i].marginTarget, pctPredefinita), politica: l[i].label || id, fonte: 'prodotto' };
      }
    }
    /* Una politica dichiarata e non trovata non si sostituisce in silenzio con
       quella generale: si applica il generale, ma la riga lo dice. */
    return { pct: pctPredefinita, politica: id, fonte: 'sconosciuta' };
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
      var m = margineDi(p, pct, opz.politiche);
      var base = {
        id: p.id,
        nome: p.name || p.sku || String(p.id),
        costo: costo,
        prezzoAttuale: attuale,
        marginePctAttuale: marginePct(attuale, costo),
        marginePctUsata: m.pct,
        politica: m.politica,
        fontePolitica: m.fonte,
      };

      if (!(costo > 0)) {
        return Object.assign(base, {
          calcolabile: false, cambia: false,
          prezzoNuovo: null, deltaValore: null, deltaPct: null, marginePctNuovo: null,
          motivo: 'nessun costo di produzione: il margine non esiste e il prezzo non si consiglia',
        });
      }

      var grezzo = prezzoDaMargine(costo, m.pct);
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
    CAMPI_POLITICA: CAMPI_POLITICA,
    marginePct: marginePct,
    politicaDi: politicaDi,
    margineDi: margineDi,
    prezzoDaMargine: prezzoDaMargine,
    proposta: proposta,
    daScrivere: daScrivere,
  };
})(typeof window !== 'undefined' ? window : globalThis);
