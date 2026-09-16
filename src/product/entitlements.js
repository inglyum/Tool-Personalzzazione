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

  /* ── Dalle sezioni dell'applicazione alle funzioni del listino ────────── */

  /**
   * La barra laterale ragiona per famiglie (`core`, `ai`, `market`, `laser`…);
   * il listino ragiona per funzioni vendute. Sono due vocabolari diversi, ed è
   * giusto che lo siano: uno descrive com'è fatta l'applicazione, l'altro che
   * cosa si paga. Questa tabella è il punto — l'unico — in cui si toccano.
   *
   * `null` vuol dire «non è una funzione che si vende a parte»: dashboard,
   * clienti, ordini, impostazioni. Bloccarle non venderebbe un piano, renderebbe
   * il prodotto inutilizzabile.
   */
  var FAMIGLIE = {
    core: null,
    quotes: 'quotes',
    laser: 'smart_quoter',
    print3d: 'smart_quoter',
    dtf: 'smart_quoter',
    ai: 'ai',
    market: 'analytics_advanced',
    analytics: 'analytics_advanced',
    multiuser: 'advanced_roles',
  };

  /* Le sezioni che il listino vende esplicitamente, e che nella barra
     laterale vivono sotto `core`. Senza questa lista, comprare Premium non
     darebbe niente di visibile. */
  var SEZIONI = {
    production: 'production', mes: 'production', produzione: 'production',
    work_center: 'operations', operations: 'operations',
    equipment: 'machines', machines: 'machines',
    items: 'inventory', materials: 'inventory', magazzino: 'inventory',
    components: 'inventory', paints: 'inventory', gadgets: 'inventory',
    stockalert: 'inventory', barcode: 'inventory',
    consuntivo: 'actual_costs', scostamento: 'actual_costs',
    redditivita: 'profitability', profitscope: 'profitability',
    payment_schedule: 'payments', recurring: 'payments', incassi: 'payments',
    team: 'advanced_roles', bu: 'advanced_roles',

    /* Le sezioni che vivono sotto una famiglia a pagamento. Sono scritte per
       esteso perché la barra laterale non è disponibile a chi fa la domanda:
       `funzioneDiSezione('ai')` riceve una stringa, non l'oggetto del nav-map.
       `tests/saas-piani.test.mjs` verifica che questa lista resti allineata a
       quella vera — se qualcuno aggiunge una sezione AI e si dimentica di
       metterla qui, il test lo dice. */
    lasercalc: 'smart_quoter', laser_b2b: 'smart_quoter', laserresources: 'smart_quoter',
    print3d: 'smart_quoter', apparel: 'smart_quoter',

    product_builder: 'quotes', quoter: 'quotes', quoteintel: 'quotes',

    ai: 'ai', aicoach: 'ai', bizai: 'ai', decision: 'ai', strategy: 'ai', clientintel: 'ai',
    leadscorer: 'ai', clv: 'ai', growthengine: 'ai', smartnotif: 'ai', replyai: 'ai',
    photostudio: 'ai',

    intel: 'analytics_advanced', marketintel: 'analytics_advanced',
    market_agent: 'analytics_advanced', live_intel: 'analytics_advanced',
    product_hunter: 'analytics_advanced', trendscanner: 'analytics_advanced',
    price_radar: 'analytics_advanced', dynamicprice: 'analytics_advanced',
    competitors: 'analytics_advanced', competitormon: 'analytics_advanced',
    supplierintel: 'analytics_advanced', demand_map: 'analytics_advanced',
    opportunity: 'analytics_advanced', forecaster: 'analytics_advanced',
    contentperf: 'analytics_advanced', etsyai: 'analytics_advanced',
    etsy_pulse: 'analytics_advanced', etsy_seo_wizard: 'analytics_advanced',
    analytics: 'analytics_advanced', profitscope: 'analytics_advanced',
  };

  /**
   * Quale funzione del listino serve per questa sezione. `null` = nessuna.
   * @param sezione id della sezione, oppure `{ id, feature }` del nav-map
   */
  function funzioneDiSezione(sezione) {
    var id = (sezione && sezione.id) || String(sezione || '');
    if (!id) return null;
    if (Object.prototype.hasOwnProperty.call(SEZIONI, id)) return SEZIONI[id];
    var fam = sezione && sezione.feature;
    if (fam && Object.prototype.hasOwnProperty.call(FAMIGLIE, fam)) return FAMIGLIE[fam];
    /* Sezione che il listino non ha mai dichiarato di vendere: resta aperta.
       È una scelta, non una dimenticanza — i diritti sono un confine
       commerciale, non di sicurezza, e bloccare una sezione che nessuno ha
       messo a listino romperebbe l'ERP senza vendere niente. */
    return null;
  }

  /** La domanda che fa la barra laterale a ogni voce. */
  function puoSezione(sezione, c) {
    var f = funzioneDiSezione(sezione);
    if (!f) return { ok: true, funzione: null, motivo: null };
    var e = can(f, c);
    return { ok: e.ok, funzione: f, motivo: e.motivo,
      pianoRichiesto: e.pianoRichiesto || null };
  }

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
    FAMIGLIE: FAMIGLIE,
    SEZIONI: SEZIONI,
    funzioneDiSezione: funzioneDiSezione,
    puoSezione: puoSezione,
  };
})(typeof window !== 'undefined' ? window : globalThis);
