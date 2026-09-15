/* ═══════════════════════════════════════════════════════════════════════════
   ABBONAMENTO — una macchina a stati, non una collezione di booleani
   ═══════════════════════════════════════════════════════════════════════════

   Uno stato di abbonamento scritto come `attivo:true` più `scaduto:false` più
   `trial:true` è tre campi che possono contraddirsi, e prima o poi si
   contraddicono. Qui lo stato è uno, e si calcola.

   ── Sei stati ───────────────────────────────────────────────────────────

     trial        prova in corso, funzioni del piano di prova
     active       pagante
     past_due     pagamento non riuscito, accesso ancora aperto per la tolleranza
     cancelled    disdetto, accesso fino alla fine del periodo già pagato
     expired      finito: restano solo le funzioni minime
     suspended    sospeso dall'amministratore: nessun accesso

   `trial`, `expired` e la fine di `cancelled` **si calcolano dalle date**, non
   si memorizzano. Uno stato scritto in archivio diventa falso da solo col
   passare dei giorni, e il giorno in cui diventa falso nessuno è lì a
   correggerlo.

   ── Quello che non fa ────────────────────────────────────────────────────

   Non decide quali funzioni siano accessibili: quello è compito degli
   entitlement, che leggono di qui. Tenere le due cose separate è ciò che
   permette di cambiare il listino senza toccare la macchina a stati.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';
  var GIORNO = 86400000;

  /* Quanto si resta accessibili dopo un pagamento fallito. Non è generosità:
     è il tempo che serve a una carta rifiutata per essere sostituita. */
  var GIORNI_TOLLERANZA = 7;
  /* Da quando avvisare che la prova sta per finire. */
  var GIORNI_PREAVVISO = 3;

  var STATI = [
    { id: 'trial', label: 'In prova', colore: '#3b82f6', accesso: true },
    { id: 'active', label: 'Attivo', colore: '#22c55e', accesso: true },
    { id: 'past_due', label: 'Pagamento sospeso', colore: '#f59e0b', accesso: true },
    { id: 'cancelled', label: 'Disdetto', colore: '#a78bfa', accesso: true },
    { id: 'expired', label: 'Scaduto', colore: '#ef4444', accesso: false },
    { id: 'suspended', label: 'Sospeso', colore: '#6b7280', accesso: false },
  ];

  function infoStato(id) {
    for (var i = 0; i < STATI.length; i++) if (STATI[i].id === id) return STATI[i];
    return STATI[4];
  }

  function _t(v) {
    if (v == null) return null;
    var n = typeof v === 'number' ? v : Date.parse(String(v));
    return isFinite(n) ? n : null;
  }
  function _giorni(da, a) { return Math.ceil((da - a) / GIORNO); }

  /* ── Creazione ────────────────────────────────────────────────────────── */

  /**
   * L'abbonamento di prova che nasce con il workspace.
   * Il piano e la durata li dice il catalogo, non questo file: se un giorno la
   * prova diventasse di 30 giorni, si cambia là.
   */
  function creaTrial(opzioni) {
    var o = opzioni || {};
    var C = global.InglyPiani;
    var giorni = o.giorni != null ? o.giorni : (C ? C.GIORNI_TRIAL : 14);
    var inizio = _t(o.adesso) || Date.now();
    return {
      id: o.id || ('sub_' + inizio),
      tenant_id: o.tenant_id || null,
      plan_id: o.plan_id || (C ? C.PIANO_TRIAL : 'premium'),
      billing_interval: null,
      price_id: null,
      status: 'trial',
      trial_start: new Date(inizio).toISOString(),
      trial_end: new Date(inizio + giorni * GIORNO).toISOString(),
      current_period_start: new Date(inizio).toISOString(),
      current_period_end: new Date(inizio + giorni * GIORNO).toISOString(),
      cancel_at_period_end: false,
      cancelled_at: null,
      suspended_at: null,
      past_due_since: null,
      provider: null,
      provider_subscription_id: null,
      created_at: new Date(inizio).toISOString(),
      updated_at: new Date(inizio).toISOString(),
    };
  }

  function creaAttivo(planId, intervallo, opzioni) {
    var o = opzioni || {};
    var C = global.InglyPiani;
    var p = C ? C.prezzo(planId, intervallo) : null;
    var inizio = _t(o.adesso) || Date.now();
    var durata = intervallo === 'yearly' ? 365 : 30;
    return Object.assign(creaTrial({ adesso: inizio, tenant_id: o.tenant_id, id: o.id }), {
      plan_id: planId,
      billing_interval: intervallo,
      price_id: p ? p.id : null,
      status: 'active',
      trial_start: null,
      trial_end: null,
      current_period_start: new Date(inizio).toISOString(),
      current_period_end: new Date(inizio + durata * GIORNO).toISOString(),
      provider: o.provider || null,
      provider_subscription_id: o.provider_subscription_id || null,
    });
  }

  /* ── Lo stato, calcolato ──────────────────────────────────────────────── */

  /**
   * @returns {
   *   stato, info, accesso, piano, scadenza, giorniRimasti,
   *   inScadenza, motivo, memorizzato
   * }
   */
  function stato(sub, quando) {
    var s = sub || null;
    var ora = _t(quando) || Date.now();
    if (!s) {
      return { stato: 'expired', info: infoStato('expired'), accesso: false,
        piano: null, scadenza: null, giorniRimasti: null, inScadenza: false,
        motivo: 'nessun abbonamento', memorizzato: null };
    }

    var memorizzato = String(s.status || '');

    /* La sospensione viene prima di tutto: è una decisione amministrativa e
       non scade da sola. */
    if (memorizzato === 'suspended') {
      return { stato: 'suspended', info: infoStato('suspended'), accesso: false,
        piano: s.plan_id, scadenza: null, giorniRimasti: null, inScadenza: false,
        motivo: 'abbonamento sospeso', memorizzato: memorizzato };
    }

    var fineTrial = _t(s.trial_end);
    var finePeriodo = _t(s.current_period_end);

    /* Prova in corso. */
    if (memorizzato === 'trial' && fineTrial != null) {
      if (ora < fineTrial) {
        var rimasti = _giorni(fineTrial, ora);
        return { stato: 'trial', info: infoStato('trial'), accesso: true,
          piano: s.plan_id, scadenza: s.trial_end, giorniRimasti: rimasti,
          inScadenza: rimasti <= GIORNI_PREAVVISO, motivo: null,
          memorizzato: memorizzato };
      }
      return { stato: 'expired', info: infoStato('expired'), accesso: false,
        piano: s.plan_id, scadenza: s.trial_end, giorniRimasti: 0, inScadenza: false,
        motivo: 'la prova è terminata', memorizzato: memorizzato };
    }

    /* Disdetto: l'accesso resta fino alla fine del periodo già pagato. Toglierlo
       il giorno della disdetta sarebbe far pagare un mese e darne venti giorni. */
    if (memorizzato === 'cancelled') {
      if (finePeriodo != null && ora < finePeriodo) {
        var r2 = _giorni(finePeriodo, ora);
        return { stato: 'cancelled', info: infoStato('cancelled'), accesso: true,
          piano: s.plan_id, scadenza: s.current_period_end, giorniRimasti: r2,
          inScadenza: r2 <= GIORNI_PREAVVISO,
          motivo: 'disdetto: attivo fino alla fine del periodo pagato',
          memorizzato: memorizzato };
      }
      return { stato: 'expired', info: infoStato('expired'), accesso: false,
        piano: s.plan_id, scadenza: s.current_period_end, giorniRimasti: 0,
        inScadenza: false, motivo: 'abbonamento disdetto e periodo concluso',
        memorizzato: memorizzato };
    }

    /* Pagamento non riuscito: tolleranza, poi scade. */
    if (memorizzato === 'past_due') {
      var da = _t(s.past_due_since) || finePeriodo || ora;
      var limite = da + GIORNI_TOLLERANZA * GIORNO;
      if (ora < limite) {
        return { stato: 'past_due', info: infoStato('past_due'), accesso: true,
          piano: s.plan_id, scadenza: new Date(limite).toISOString(),
          giorniRimasti: _giorni(limite, ora), inScadenza: true,
          motivo: 'pagamento non riuscito: aggiorna il metodo di pagamento',
          memorizzato: memorizzato };
      }
      return { stato: 'expired', info: infoStato('expired'), accesso: false,
        piano: s.plan_id, scadenza: new Date(limite).toISOString(), giorniRimasti: 0,
        inScadenza: false, motivo: 'pagamento non riuscito e tolleranza esaurita',
        memorizzato: memorizzato };
    }

    /* Attivo. */
    if (memorizzato === 'active') {
      if (finePeriodo == null || ora < finePeriodo) {
        var r3 = finePeriodo != null ? _giorni(finePeriodo, ora) : null;
        return { stato: 'active', info: infoStato('active'), accesso: true,
          piano: s.plan_id, scadenza: s.current_period_end, giorniRimasti: r3,
          inScadenza: false, motivo: null, memorizzato: memorizzato };
      }
      /* Periodo finito senza rinnovo registrato: non si presume pagato. */
      return { stato: 'expired', info: infoStato('expired'), accesso: false,
        piano: s.plan_id, scadenza: s.current_period_end, giorniRimasti: 0,
        inScadenza: false, motivo: 'periodo concluso senza rinnovo',
        memorizzato: memorizzato };
    }

    return { stato: 'expired', info: infoStato('expired'), accesso: false,
      piano: s.plan_id, scadenza: null, giorniRimasti: null, inScadenza: false,
      motivo: 'stato non riconosciuto: ' + (memorizzato || '(vuoto)'),
      memorizzato: memorizzato };
  }

  /* ── Transizioni ──────────────────────────────────────────────────────── */

  var TRANSIZIONI = {
    trial: ['active', 'cancelled', 'expired', 'suspended'],
    active: ['past_due', 'cancelled', 'suspended', 'active'],
    past_due: ['active', 'cancelled', 'expired', 'suspended'],
    cancelled: ['active', 'expired', 'suspended'],
    expired: ['active', 'suspended'],
    suspended: ['active', 'trial', 'expired'],
  };

  function transizioneValida(da, a) {
    var d = String(da || '');
    var v = String(a || '');
    var ammesse = TRANSIZIONI[d] || [];
    if (ammesse.indexOf(v) >= 0) return { ok: true, ammesse: ammesse };
    return { ok: false, ammesse: ammesse,
      motivo: 'da «' + infoStato(d).label + '» non si passa a «' + infoStato(v).label + '»' };
  }

  /** Sottoscrive un piano: dalla prova, o dopo una scadenza. */
  function attiva(sub, planId, intervallo, opzioni) {
    var o = opzioni || {};
    var corrente = stato(sub, o.adesso);
    var v = transizioneValida(corrente.memorizzato || 'expired', 'active');
    if (!v.ok) return { ok: false, motivo: v.motivo, abbonamento: sub };
    var C = global.InglyPiani;
    if (C && !C.piano(planId)) {
      return { ok: false, motivo: 'piano sconosciuto: ' + planId, abbonamento: sub };
    }
    var nuovo = creaAttivo(planId, intervallo, {
      adesso: o.adesso, tenant_id: (sub && sub.tenant_id) || o.tenant_id,
      id: (sub && sub.id) || o.id, provider: o.provider,
      provider_subscription_id: o.provider_subscription_id,
    });
    nuovo.created_at = (sub && sub.created_at) || nuovo.created_at;
    return { ok: true, abbonamento: nuovo };
  }

  /** Disdetta: non toglie l'accesso, lo fa finire alla scadenza. */
  function disdici(sub, opzioni) {
    var o = opzioni || {};
    if (!sub) return { ok: false, motivo: 'nessun abbonamento' };
    var v = transizioneValida(sub.status, 'cancelled');
    if (!v.ok) return { ok: false, motivo: v.motivo, abbonamento: sub };
    var quando = _t(o.adesso) || Date.now();
    var nuovo = Object.assign({}, sub, {
      status: 'cancelled',
      cancel_at_period_end: true,
      cancelled_at: new Date(quando).toISOString(),
      updated_at: new Date(quando).toISOString(),
    });
    /* Una prova disdetta finisce quando finiva la prova, non un mese dopo. */
    if (sub.status === 'trial' && sub.trial_end) nuovo.current_period_end = sub.trial_end;
    return { ok: true, abbonamento: nuovo };
  }

  function segnaNonPagato(sub, opzioni) {
    var o = opzioni || {};
    if (!sub) return { ok: false, motivo: 'nessun abbonamento' };
    var v = transizioneValida(sub.status, 'past_due');
    if (!v.ok) return { ok: false, motivo: v.motivo, abbonamento: sub };
    var quando = _t(o.adesso) || Date.now();
    return { ok: true, abbonamento: Object.assign({}, sub, {
      status: 'past_due',
      past_due_since: new Date(quando).toISOString(),
      updated_at: new Date(quando).toISOString(),
    }) };
  }

  function sospendi(sub, opzioni) {
    var o = opzioni || {};
    if (!sub) return { ok: false, motivo: 'nessun abbonamento' };
    var quando = _t(o.adesso) || Date.now();
    return { ok: true, abbonamento: Object.assign({}, sub, {
      status: 'suspended',
      suspended_at: new Date(quando).toISOString(),
      updated_at: new Date(quando).toISOString(),
      motivo_sospensione: o.motivo || null,
    }) };
  }

  /** Il rinnovo sposta il periodo in avanti: non ne apre uno nuovo. */
  function rinnova(sub, opzioni) {
    var o = opzioni || {};
    if (!sub) return { ok: false, motivo: 'nessun abbonamento' };
    var durata = sub.billing_interval === 'yearly' ? 365 : 30;
    var base = _t(sub.current_period_end) || _t(o.adesso) || Date.now();
    return { ok: true, abbonamento: Object.assign({}, sub, {
      status: 'active',
      past_due_since: null,
      current_period_start: new Date(base).toISOString(),
      current_period_end: new Date(base + durata * GIORNO).toISOString(),
      updated_at: new Date(_t(o.adesso) || Date.now()).toISOString(),
    }) };
  }

  global.InglyAbbonamento = {
    VERSIONE: VERSIONE,
    STATI: STATI,
    TRANSIZIONI: TRANSIZIONI,
    GIORNI_TOLLERANZA: GIORNI_TOLLERANZA,
    GIORNI_PREAVVISO: GIORNI_PREAVVISO,
    infoStato: infoStato,
    creaTrial: creaTrial,
    creaAttivo: creaAttivo,
    stato: stato,
    transizioneValida: transizioneValida,
    attiva: attiva,
    disdici: disdici,
    segnaNonPagato: segnaNonPagato,
    sospendi: sospendi,
    rinnova: rinnova,
  };
})(typeof window !== 'undefined' ? window : globalThis);
