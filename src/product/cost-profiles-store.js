/* ═══════════════════════════════════════════════════════════════════════════
   COST-PROFILES-STORE — dove stanno i profili economici, e chi li legge
   ═══════════════════════════════════════════════════════════════════════════

   `InglyCostProfiles` è puro: sa cosa fare con manodopera, spese generali e
   imballo, e non sa dove stiano. Questo file lo sa, ed è l'unico.

   La separazione non è formale. Un preventivo deve poter essere ricalcolato
   identico fra sei mesi: se il motore leggesse il database, il risultato
   dipenderebbe da quando lo si chiede.

   ── La cache, e perché ha una scadenza corta ─────────────────────────────

   Il preventivatore 3D ricalcola a ogni tasto premuto. Andare in IndexedDB a
   ogni battuta significa una lettura asincrona per carattere: il campo
   diventa lento e il numero arriva dopo. I profili si leggono una volta e si
   tengono per pochi secondi — abbastanza da coprire una raffica di battute,
   troppo poco perché una modifica ai profili resti invisibile.

   `ingressoSincrono()` è la funzione che i preventivatori chiamano: restituisce
   subito l'ultimo valore noto e, se è scaduto, ne chiede uno nuovo per la
   volta dopo. Un preventivatore non può aspettare, ma non deve nemmeno
   mentire: finché i profili non sono arrivati usa i predefiniti, e i
   predefiniti si dichiarano.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';
  var CHIAVE = 'main';
  var DURATA_CACHE = 5000;   // ms

  var cache = null;
  var scadenza = 0;
  var inCorso = false;

  function P() { return global.InglyCostProfiles; }
  function DB() { return global.IDB; }

  function leggi(store) {
    var db = DB();
    if (!db || typeof db.get !== 'function') return Promise.resolve(null);
    return Promise.resolve(db.get(store, CHIAVE)).catch(function () { return null; });
  }

  /** I tre profili, come stanno in archivio. Un profilo assente non è un
      errore: è un laboratorio che non l'ha ancora compilato, e il modulo puro
      sa già rispondere con i predefiniti dichiarati. */
  function carica() {
    return Promise.all([
      leggi('labor_profiles'),
      leggi('overhead_profiles'),
      leggi('packaging_items'),
    ]).then(function (r) {
      return {
        manodopera: (r[0] && r[0].voci) || null,
        overhead: r[1] || null,
        imballo: (r[2] && r[2].voci) || null,
      };
    });
  }

  function aggiorna() {
    if (inCorso) return Promise.resolve(cache);
    inCorso = true;
    return carica().then(function (p) {
      cache = p;
      scadenza = now() + DURATA_CACHE;
      inCorso = false;
      return p;
    }).catch(function () {
      inCorso = false;
      return cache;
    });
  }

  function now() {
    try { return Date.now(); } catch (e) { return 0; }
  }

  /** L'ingresso per il motore, subito. Se la cache è scaduta ne chiede una
      nuova senza aspettarla: il preventivo di adesso usa quella di un attimo
      fa, quello dopo userà la nuova. */
  function ingressoSincrono(opzioni) {
    if (!cache || now() > scadenza) aggiorna();
    var p = P();
    if (!p) return {};
    return p.ingresso(cache || {}, opzioni || {});
  }

  /** Quando si può aspettare — al salvataggio di un preventivo, in un test —
      questa è la versione che garantisce dati freschi. */
  function ingresso(opzioni) {
    return aggiorna().then(function () {
      var p = P();
      return p ? p.ingresso(cache || {}, opzioni || {}) : {};
    });
  }

  function scrivi(store, dati) {
    var db = DB();
    if (!db || typeof db.put !== 'function') return Promise.resolve(false);
    var rec = Object.assign({}, dati, { key: CHIAVE, _upd: now() });
    return Promise.resolve(db.put(store, rec)).then(function () {
      cache = null; scadenza = 0;   // la prossima lettura vede la modifica
      return true;
    }).catch(function (e) {
      if (global.Ingly && global.Ingly.Errors) global.Ingly.Errors.log('CostProfiles.scrivi', e, { store: store });
      return false;
    });
  }

  function salvaManodopera(voci) { return scrivi('labor_profiles', { voci: voci || [] }); }
  function salvaOverhead(profilo) { return scrivi('overhead_profiles', profilo || {}); }
  function salvaImballo(voci) { return scrivi('packaging_items', { voci: voci || [] }); }

  /** I profili con i predefiniti già applicati: è quello che una schermata di
      configurazione deve mostrare, perché l'utente parte da lì e modifica. */
  function perModifica() {
    var p = P();
    return carica().then(function (c) {
      if (!p) return null;
      return {
        manodopera: p.manodopera(c.manodopera),
        overhead: p.overhead(c.overhead),
        imballo: (c.imballo && c.imballo.length) ? c.imballo : p.IMBALLO_PREDEFINITO,
        configurati: {
          manodopera: !!(c.manodopera && c.manodopera.length),
          overhead: !!(c.overhead && c.overhead.voci && c.overhead.voci.length),
          imballo: !!(c.imballo && c.imballo.length),
        },
      };
    });
  }

  function invalida() { cache = null; scadenza = 0; }

  global.InglyCostProfilesStore = {
    VERSIONE: VERSIONE,
    CHIAVE: CHIAVE,
    carica: carica,
    ingresso: ingresso,
    ingressoSincrono: ingressoSincrono,
    perModifica: perModifica,
    salvaManodopera: salvaManodopera,
    salvaOverhead: salvaOverhead,
    salvaImballo: salvaImballo,
    invalida: invalida,
    _cache: function () { return cache; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
