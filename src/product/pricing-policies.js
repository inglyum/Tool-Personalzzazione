/* ═══════════════════════════════════════════════════════════════════════════
   PRICING-POLICIES — dove vivono i margini configurati
   ═══════════════════════════════════════════════════════════════════════════

   `InglyCostEngine` sa calcolare un prezzo da un margine, e non deve sapere
   altro: `tests/cost-engine.test.mjs` verifica che quel file non nomini
   `localStorage`, `Date` o `document`, perché un motore che legge lo stato del
   browser smette di essere riproducibile — e con lui smettono di esserlo i
   preventivi che ha prodotto.

   La configurazione però da qualche parte deve stare. Sta qui, e questo è
   l'unico posto che la legge e la scrive. Prima ogni vista aveva i propri
   numeri scritti nel markup: è il modo in cui «Premium» finisce per valere 55
   in una schermata e 60 in un'altra, e nessuna delle due è in torto.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var CHIAVE = 'ingly_pricing_policies_v1';
  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };

  function E() { return global.InglyCostEngine; }

  function magazzino() {
    try { return global.localStorage || null; } catch (e) { return null; }
  }

  /** Le sole modifiche registrate, non le politiche intere: conservare i
      valori predefiniti insieme a quelli scelti renderebbe impossibile
      aggiornare i primi senza sovrascrivere i secondi. */
  function override() {
    var m = magazzino();
    if (!m) return {};
    try {
      var raw = m.getItem(CHIAVE);
      var o = raw ? JSON.parse(raw) : {};
      return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
    } catch (e) { return {}; }
  }

  /** Le politiche come vanno mostrate e usate: predefinite + modifiche. */
  function elenco() {
    var e = E();
    return e && typeof e.politiche === 'function' ? e.politiche(override()) : [];
  }

  function perId(id) {
    var l = elenco();
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }

  /** Cambia il margine di una politica. Il pavimento lo impone il motore:
      qui non si duplica quella regola, la si lascia dove sta. */
  function imposta(id, valori) {
    var m = magazzino();
    if (!m || !id) return false;
    var o = override();
    var v = typeof valori === 'number' ? { marginTarget: num(valori) } : (valori || {});
    o[id] = Object.assign({}, o[id], v);
    try { m.setItem(CHIAVE, JSON.stringify(o)); return true; } catch (e) { return false; }
  }

  /** Torna ai valori dichiarati nel motore. Non cancella una politica: la
      riporta al suo predefinito, che è quello che «ripristina» vuol dire. */
  function ripristina(id) {
    var m = magazzino();
    if (!m) return false;
    var o = override();
    if (id == null) o = {}; else delete o[id];
    try { m.setItem(CHIAVE, JSON.stringify(o)); return true; } catch (e) { return false; }
  }

  function personalizzate() {
    return Object.keys(override());
  }

  /* ── Gli scaglioni per quantità ────────────────────────────────────────
     Il setup di una lavorazione si paga una volta e si spalma su tutti i
     pezzi: trenta pezzi non costano trenta volte un pezzo. Questa scala
     dice quanta parte del setup resta, a ogni quantità.

     Stava scritta dentro una vista del catalogo, in una riga sola:
     `calcQty>=100?0.35:calcQty>=30?0.55:calcQty>=10?0.75:1.0`. Una politica
     commerciale nascosta in mezzo a un calcolo, che nessuno poteva trovare
     per cambiarla e che nessun'altra schermata poteva riusare. Qui sta
     dichiarata, con i suoi scaglioni leggibili, e da qui si legge.

     I numeri sono quelli che c'erano: questa è un'estrazione, non una
     ritaratura. Cambiarli è una decisione commerciale, e va presa guardando
     i propri consuntivi — non qui dentro. */
  var SETUP_PER_QUANTITA = [
    { da: 100, quota: 0.35, nota: 'il setup incide poco: si ammortizza su cento pezzi' },
    { da: 30, quota: 0.55, nota: 'lotto medio' },
    { da: 10, quota: 0.75, nota: 'lotto piccolo' },
    { da: 1, quota: 1.00, nota: 'pezzo singolo: il setup si paga tutto' },
  ];

  /**
   * Quanta parte del setup resta a una data quantità.
   * @param {number} quantita
   * @returns {{quota:number, da:number, nota:string}}
   */
  function setupPerQuantita(quantita) {
    var q = num(quantita, 1);
    for (var i = 0; i < SETUP_PER_QUANTITA.length; i++) {
      if (q >= SETUP_PER_QUANTITA[i].da) return SETUP_PER_QUANTITA[i];
    }
    return SETUP_PER_QUANTITA[SETUP_PER_QUANTITA.length - 1];
  }

  global.InglyPricingPolicies = {
    VERSIONE: '1.1.0',
    SETUP_PER_QUANTITA: SETUP_PER_QUANTITA,
    setupPerQuantita: setupPerQuantita,
    CHIAVE: CHIAVE,
    elenco: elenco,
    perId: perId,
    override: override,
    imposta: imposta,
    ripristina: ripristina,
    personalizzate: personalizzate,
  };
})(typeof window !== 'undefined' ? window : globalThis);
