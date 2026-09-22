/* ═══════════════════════════════════════════════════════════════════════════
   CATALOGO PIANI — un posto solo dove esiste il listino
   ═══════════════════════════════════════════════════════════════════════════

   La tentazione, in un SaaS, è scrivere `if (plan === 'pro')` dove serve. Il
   problema si vede al secondo anno: il giorno in cui una funzione passa da
   Premium a Standard bisogna trovarli tutti, e uno lo si dimentica sempre.
   Quello dimenticato non dà errore — dà accesso a chi non ha pagato, o lo
   nega a chi ha pagato.

   Qui i piani sono dati, non condizioni. Le funzioni si dichiarano per nome e
   ogni piano dice quali ha. Cambiare il listino vuol dire cambiare questo
   file, e nient'altro.

   ── I prezzi non stanno nella UI ────────────────────────────────────────

   Ogni prezzo è una riga con id, intervallo, importo, valuta e data di
   validità. Un prezzo scritto in una schermata è un prezzo che prima o poi
   diverge da quello che il cliente paga davvero — e nessuno se ne accorge
   finché non arriva la contestazione.

   L'annuale non è «il mensile per dieci»: è un prezzo suo. Il risparmio si
   **calcola** dai due prezzi veri, non si scrive a mano accanto al pulsante.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  /* ── Le funzioni, per nome ────────────────────────────────────────────── */

  var FUNZIONI = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'crm', label: 'CRM e clienti' },
    { id: 'quotes', label: 'Preventivi' },
    { id: 'smart_quoter', label: 'Smart Quoter' },
    { id: 'orders', label: 'Ordini' },
    { id: 'catalog', label: 'Catalogo' },
    { id: 'materials_basic', label: 'Materiali' },
    { id: 'sales', label: 'Vendite' },
    { id: 'documents', label: 'Documenti e PDF' },
    { id: 'backup', label: 'Backup' },
    { id: 'analytics_basic', label: 'Analisi di base' },

    { id: 'production', label: 'Produzione e MES' },
    { id: 'operations', label: 'Operazioni e routing' },
    { id: 'machines', label: 'Macchine' },
    { id: 'bom', label: 'Distinta base' },
    { id: 'material_requirements', label: 'Fabbisogno materiali' },
    { id: 'inventory', label: 'Magazzino e registro' },
    { id: 'actual_costs', label: 'Costi reali e scostamenti' },
    { id: 'profitability', label: 'Marginalità' },
    { id: 'payments', label: 'Pagamenti e scadenzario' },
    { id: 'analytics_advanced', label: 'Analisi avanzate' },
    { id: 'ai', label: 'Strumenti AI' },

    { id: 'api', label: 'API' },
    { id: 'multi_location', label: 'Più sedi' },
    { id: 'advanced_roles', label: 'Ruoli avanzati' },
    { id: 'advanced_audit', label: 'Audit avanzato' },
    { id: 'integrations', label: 'Integrazioni' },
    { id: 'priority_support', label: 'Supporto prioritario' },
  ];
  var ID_FUNZIONI = FUNZIONI.map(function (f) { return f.id; });

  function _set(elenco) {
    var m = {};
    elenco.forEach(function (id) { m[id] = true; });
    return m;
  }

  var STANDARD = ['dashboard', 'crm', 'quotes', 'smart_quoter', 'orders', 'catalog',
    'materials_basic', 'sales', 'documents', 'backup', 'analytics_basic'];
  var PREMIUM = STANDARD.concat(['production', 'operations', 'machines', 'bom',
    'material_requirements', 'inventory', 'actual_costs', 'profitability', 'payments',
    'analytics_advanced', 'ai']);
  var BUSINESS = PREMIUM.concat(['api', 'multi_location', 'advanced_roles',
    'advanced_audit', 'integrations', 'priority_support']);

  /* ── I piani ──────────────────────────────────────────────────────────── */

  var PIANI = [
    {
      id: 'standard',
      nome: 'Standard',
      livello: 1,
      target: 'Maker e piccolo laboratorio',
      sintesi: 'Preventivi, ordini e clienti in un posto solo.',
      funzioni: _set(STANDARD),
      /* `dispositivi` e `storage_gb` mancavano: `InglyDispositivi.limiteDi()`
         (src/product/device-sessions.js) già cercava `limite(piano,
         'dispositivi')` da prima che questa chiave esistesse qui, quindi
         ogni piano — Business incluso — riceveva sempre lo stesso limite
         di una sola postazione. `storage_gb` è dichiarato per lo stesso
         motivo per cui lo sono `orders_month`/`users`: un limite che vive
         solo nel catalogo dell'Admin (`PLANS_CFG`) non è un limite del
         prodotto, è un numero scritto in un pannello che nessun controllo
         applica davvero. Non ancora imposto da nessun controllo di
         quota — dichiararlo qui è il primo passo, non l'ultimo. */
      limiti: { orders_month: 100, users: 1, workspaces: 1, locations: 1, dispositivi: 1, storage_gb: 5 },
      badge: null,
    },
    {
      id: 'premium',
      nome: 'Premium',
      livello: 2,
      target: 'Laboratorio professionale',
      sintesi: 'Produzione, magazzino e costi reali: il laboratorio intero.',
      funzioni: _set(PREMIUM),
      limiti: { orders_month: 500, users: 3, workspaces: 1, locations: 1, dispositivi: 3, storage_gb: 25 },
      badge: 'Più scelto',
    },
    {
      id: 'business',
      nome: 'Business',
      livello: 3,
      target: 'Team e laboratorio strutturato',
      sintesi: 'Più sedi, più persone, API e integrazioni.',
      funzioni: _set(BUSINESS),
      /* `null` vuol dire senza limite. Non `Infinity`, che si trasforma in
         `null` appena passa da JSON e smette di volere dire la stessa cosa.
         `dispositivi` resta un numero finito anche qui, deliberatamente:
         il prodotto applica «un abbonamento, una postazione» come regola
         di sicurezza, non solo commerciale — un piano senza limite di
         dispositivi contraddirebbe quella regola invece di scalarla. */
      limiti: { orders_month: null, users: null, workspaces: null, locations: null, dispositivi: 10, storage_gb: 100 },
      badge: null,
    },
  ];

  /* ── I prezzi ─────────────────────────────────────────────────────────── */

  var PREZZI = [
    { id: 'standard_m', plan_id: 'standard', billing_interval: 'monthly', amount: 19,
      currency: 'EUR', active: true, effective_from: '2026-01-01', effective_to: null },
    { id: 'standard_y', plan_id: 'standard', billing_interval: 'yearly', amount: 190,
      currency: 'EUR', active: true, effective_from: '2026-01-01', effective_to: null },
    { id: 'premium_m', plan_id: 'premium', billing_interval: 'monthly', amount: 39,
      currency: 'EUR', active: true, effective_from: '2026-01-01', effective_to: null },
    { id: 'premium_y', plan_id: 'premium', billing_interval: 'yearly', amount: 390,
      currency: 'EUR', active: true, effective_from: '2026-01-01', effective_to: null },
    { id: 'business_m', plan_id: 'business', billing_interval: 'monthly', amount: 79,
      currency: 'EUR', active: true, effective_from: '2026-01-01', effective_to: null },
    { id: 'business_y', plan_id: 'business', billing_interval: 'yearly', amount: 790,
      currency: 'EUR', active: true, effective_from: '2026-01-01', effective_to: null },
  ];

  var PIANO_TRIAL = 'premium';
  var GIORNI_TRIAL = 14;

  /* ── Lettura ──────────────────────────────────────────────────────────── */

  function elenco() { return PIANI.map(function (p) { return piano(p.id); }); }

  function piano(id) {
    var p = null;
    for (var i = 0; i < PIANI.length; i++) if (PIANI[i].id === String(id || '')) p = PIANI[i];
    if (!p) return null;
    /* Copia: il catalogo non si modifica da fuori. Un piano mutato a runtime
       è un entitlement regalato. */
    return {
      id: p.id, nome: p.nome, livello: p.livello, target: p.target, sintesi: p.sintesi,
      badge: p.badge,
      funzioni: Object.keys(p.funzioni).slice(),
      limiti: Object.assign({}, p.limiti),
    };
  }

  /** La funzione `f` è inclusa nel piano `id`? Una funzione che non esiste nel
      catalogo è `false`: meglio negare una funzione mai dichiarata che
      concederla per una battitura. */
  function include(id, f) {
    for (var i = 0; i < PIANI.length; i++) {
      if (PIANI[i].id === String(id || '')) return PIANI[i].funzioni[String(f || '')] === true;
    }
    return false;
  }

  function limite(id, chiave) {
    for (var i = 0; i < PIANI.length; i++) {
      if (PIANI[i].id === String(id || '')) {
        var v = PIANI[i].limiti[String(chiave || '')];
        return v === undefined ? null : v;
      }
    }
    return 0;
  }

  /** Il prezzo in vigore per piano e intervallo, alla data indicata. */
  function prezzo(planId, intervallo, quando) {
    var t = quando ? Date.parse(quando) : Date.now();
    var trovati = PREZZI.filter(function (p) {
      if (p.plan_id !== String(planId || '') || p.billing_interval !== String(intervallo || '')) return false;
      if (!p.active) return false;
      if (p.effective_from && Date.parse(p.effective_from) > t) return false;
      if (p.effective_to && Date.parse(p.effective_to) < t) return false;
      return true;
    });
    return trovati.length ? Object.assign({}, trovati[trovati.length - 1]) : null;
  }

  function prezzi(planId) {
    return { monthly: prezzo(planId, 'monthly'), yearly: prezzo(planId, 'yearly') };
  }

  /**
   * Quanto si risparmia pagando a anno, calcolato dai due prezzi veri.
   * Se uno dei due manca non si inventa un risparmio.
   */
  function risparmioAnnuale(planId) {
    var m = prezzo(planId, 'monthly');
    var y = prezzo(planId, 'yearly');
    if (!m || !y || !(m.amount > 0)) return null;
    var pienoAnno = m.amount * 12;
    var risparmio = pienoAnno - y.amount;
    return {
      pienoAnno: pienoAnno,
      annuale: y.amount,
      risparmio: Math.round(risparmio * 100) / 100,
      risparmioPct: Math.round((risparmio / pienoAnno) * 1000) / 10,
      mesiRegalati: Math.round((risparmio / m.amount) * 10) / 10,
    };
  }

  /** Confronto per la tabella delle funzioni: una riga per funzione. */
  function confronto() {
    return FUNZIONI.map(function (f) {
      var riga = { id: f.id, label: f.label };
      PIANI.forEach(function (p) { riga[p.id] = p.funzioni[f.id] === true; });
      return riga;
    });
  }

  function funzione(id) {
    for (var i = 0; i < FUNZIONI.length; i++) if (FUNZIONI[i].id === String(id || '')) return FUNZIONI[i];
    return null;
  }

  /** Il piano minimo che include una funzione — serve al messaggio di upgrade. */
  function pianoMinimoPer(f) {
    for (var i = 0; i < PIANI.length; i++) {
      if (PIANI[i].funzioni[String(f || '')] === true) return piano(PIANI[i].id);
    }
    return null;
  }

  global.InglyPiani = {
    VERSIONE: VERSIONE,
    FUNZIONI: FUNZIONI,
    ID_FUNZIONI: ID_FUNZIONI,
    PIANO_TRIAL: PIANO_TRIAL,
    GIORNI_TRIAL: GIORNI_TRIAL,
    elenco: elenco,
    piano: piano,
    include: include,
    limite: limite,
    prezzo: prezzo,
    prezzi: prezzi,
    risparmioAnnuale: risparmioAnnuale,
    confronto: confronto,
    funzione: funzione,
    pianoMinimoPer: pianoMinimoPer,
  };
})(typeof window !== 'undefined' ? window : globalThis);
