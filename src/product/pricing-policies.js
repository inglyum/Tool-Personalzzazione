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

  global.InglyPricingPolicies = {
    VERSIONE: '1.0.0',
    CHIAVE: CHIAVE,
    elenco: elenco,
    perId: perId,
    override: override,
    imposta: imposta,
    ripristina: ripristina,
    personalizzate: personalizzate,
  };
})(typeof window !== 'undefined' ? window : globalThis);
