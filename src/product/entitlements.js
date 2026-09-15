/* ═══════════════════════════════════════════════════════════════════════════
   ENTITLEMENT — chi può fare cosa, e perché
   ═══════════════════════════════════════════════════════════════════════════

   Nella versione precedente il diritto di accesso stava dentro la sessione,
   in `localStorage`, come una lista di moduli: `modules:['*']`. Chiunque
   aprisse la console e scrivesse quella riga aveva tutto. Non era una
   vulnerabilità sottile — era il modello.

   Qui il diritto **non si memorizza mai**. Si calcola, ogni volta, da:

       abbonamento → stato → piano → funzioni del piano

   Se l'abbonamento è scaduto non serve cancellare niente: la funzione smette
   di rispondere `true` perché il conto torna a dirlo. È la stessa ragione per
   cui `scaduto` non è un campo ma una data confrontata con oggi.

   ── Il confine con il server ────────────────────────────────────────────

   Questo modulo decide che cosa **mostrare**. Non è, e non può essere,
   l'ultima parola: un client non può difendersi da sé stesso. Quando i dati
   staranno su Supabase la parola definitiva sarà delle policy RLS, e questo
   strato resterà a decidere l'interfaccia. Le due cose devono dire lo stesso,
   e per questo leggono lo stesso catalogo.

   Il commento serve a chi verrà: **non spostare qui una decisione di
   sicurezza che il server deve prendere.**
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  function C() { return global.InglyPiani; }
  function A() { return global.InglyAbbonamento; }

  /* Le funzioni che restano accessibili anche a abbonamento finito: quelle
     senza le quali non si può nemmeno riabbonarsi, o rileggere il proprio
     lavoro. Chiudere fuori un cliente dai suoi dati non è una leva
     commerciale, è un danno. */
  var SEMPRE = ['dashboard', 'backup', 'documents'];

  var _contesto = { abbonamento: null, ruolo: 'owner', tenant_id: null, utilizzo: {} };

  /** Il contesto lo stabilisce chi ha letto l'abbonamento dall'archivio.
      Questo modulo non legge niente da sé: è ciò che lo rende provabile. */
  function usaContesto(c) {
    _contesto = {
      abbonamento: (c && c.abbonamento) || null,
      ruolo: (c && c.ruolo) || 'owner',
      tenant_id: (c && c.tenant_id) || null,
      utilizzo: (c && c.utilizzo) || {},
    };
    return _contesto;
  }
  function contesto() { return _contesto; }

  function _stato(c) {
    var a = A();
    var sub = (c && c.abbonamento) || _contesto.abbonamento;
    return a ? a.stato(sub) : { stato: 'expired', accesso: false, piano: null };
  }

  /** Il piano in vigore adesso — non quello scritto da qualche parte. */
  function getPlan(c) {
    var s = _stato(c);
    var cat = C();
    if (!s.accesso) return null;
    return cat ? cat.piano(s.piano) : null;
  }

  function getSubscription(c) { return _stato(c); }

  /**
   * Può usare questa funzione?
   * @returns { ok, motivo, funzione, pianoRichiesto, stato }
   */
  function can(f, c) {
    var cat = C();
    var s = _stato(c);
    var id = String(f || '');
    if (!cat) return { ok: false, motivo: 'catalogo piani non disponibile', funzione: id };

    var descr = cat.funzione(id);
    if (!descr) {
      /* Una funzione che il catalogo non conosce non si concede per errore. */
      return { ok: false, motivo: 'funzione non dichiarata nel catalogo', funzione: id,
        stato: s.stato };
    }

    if (SEMPRE.indexOf(id) >= 0) {
      return { ok: true, funzione: id, motivo: null, stato: s.stato, sempre: true };
    }

    if (!s.accesso) {
      return { ok: false, funzione: id, stato: s.stato,
        motivo: s.motivo || 'abbonamento non attivo',
        pianoRichiesto: cat.pianoMinimoPer(id) };
    }

    if (cat.include(s.piano, id)) {
      return { ok: true, funzione: id, motivo: null, stato: s.stato, piano: s.piano };
    }

    var minimo = cat.pianoMinimoPer(id);
    return {
      ok: false, funzione: id, stato: s.stato, piano: s.piano,
      motivo: minimo
        ? (descr.label + ' fa parte del piano ' + minimo.nome)
        : (descr.label + ' non è disponibile in nessun piano'),
      pianoRichiesto: minimo,
    };
  }

  /**
   * Come `can`, ma da mettere davanti a un'azione: restituisce l'esito e non
   * solleva. Chi chiama deve fermarsi se `ok` è falso — è il punto in cui una
   * funzione protetta non deve partire nemmeno se qualcuno ha tolto il
   * pulsante dalla schermata.
   */
  function require(f, c) {
    var e = can(f, c);
    if (!e.ok) e.bloccato = true;
    return e;
  }

  /* ── Limiti ───────────────────────────────────────────────────────────── */

  /**
   * @returns { chiave, limite, usato, rimanente, illimitato, entro, pct }
   */
  function limit(chiave, c) {
    var cat = C();
    var s = _stato(c);
    var uso = ((c && c.utilizzo) || _contesto.utilizzo || {});
    var k = String(chiave || '');
    var usato = uso[k] != null ? Number(uso[k]) : 0;

    if (!cat || !s.accesso) {
      return { chiave: k, limite: 0, usato: usato, rimanente: 0,
        illimitato: false, entro: false, pct: 100,
        motivo: s.motivo || 'abbonamento non attivo' };
    }
    var lim = cat.limite(s.piano, k);
    if (lim === null) {
      return { chiave: k, limite: null, usato: usato, rimanente: null,
        illimitato: true, entro: true, pct: null, motivo: null };
    }
    var rimanente = Math.max(0, lim - usato);
    return {
      chiave: k, limite: lim, usato: usato, rimanente: rimanente,
      illimitato: false,
      /* «Entro» significa che ne sta uno in più. Al limite esatto non ci si
         sta: 100 ordini su 100 vuol dire che il 101° non passa. */
      entro: usato < lim,
      pct: lim > 0 ? Math.round((usato / lim) * 100) : 100,
      motivo: usato < lim ? null : 'limite raggiunto',
    };
  }

  function getUsage(c) { return Object.assign({}, (c && c.utilizzo) || _contesto.utilizzo || {}); }
  function getRemaining(chiave, c) { return limit(chiave, c).rimanente; }

  /** Tutte le funzioni, con il loro esito: serve alla schermata abbonamento. */
  function tutte(c) {
    var cat = C();
    if (!cat) return [];
    return cat.FUNZIONI.map(function (f) {
      var e = can(f.id, c);
      return { id: f.id, label: f.label, ok: e.ok,
        pianoRichiesto: e.pianoRichiesto ? e.pianoRichiesto.id : null };
    });
  }

  global.InglyEntitlements = {
    VERSIONE: VERSIONE,
    SEMPRE: SEMPRE,
    usaContesto: usaContesto,
    contesto: contesto,
    can: can,
    require: require,
    limit: limit,
    getPlan: getPlan,
    getSubscription: getSubscription,
    getUsage: getUsage,
    getRemaining: getRemaining,
    tutte: tutte,
  };
})(typeof window !== 'undefined' ? window : globalThis);
