/* ═══════════════════════════════════════════════════════════════════════════
   FATTURAZIONE — il confine con chi incassa davvero
   ═══════════════════════════════════════════════════════════════════════════

   Questo modulo esiste per una regola sola, e vale la pena scriverla prima
   del codice: **niente in questo file può dichiarare pagato un abbonamento.**

   La tentazione, in un'applicazione che gira nel browser, è enorme: un
   pulsante «Attiva», una riga che scrive `status: 'active'`, e il prodotto
   sembra completo. Sembra. In realtà è un prodotto in cui chiunque apra la
   console si regala il piano Business, e in cui l'incasso è una finzione che
   nessuno ha mai verificato. Un pagamento finto non è un pagamento
   incompleto: è un buco, e ha l'aspetto di una funzione che c'è.

   Quindi qui dentro ci sono due sole strade verso «attivo»:

     1. `richiedi()` manda chi vuole pagare dal fornitore configurato. Se non
        è configurato nessun fornitore, lo dice — e propone il contatto
        diretto. Non attiva niente.
     2. `applica()` prende un evento **del fornitore** (con il suo id, il suo
        riferimento di abbonamento) e lo riporta sull'abbonamento. È l'unico
        punto che può muovere lo stato verso «pagato», e pretende un
        riferimento esterno che nessuno può inventarsi dal nulla.

   ── Idempotenza ─────────────────────────────────────────────────────────

   Gli eventi dei fornitori arrivano più di una volta: è normale, ed è
   documentato. Un rinnovo applicato due volte regala un mese; un pagamento
   fallito applicato due volte non fa danno ma sporca lo storico. Ogni evento
   si registra con il suo `id` e, se quell'`id` è già passato, la seconda
   volta non fa niente e lo dice.

   ── Che cosa non si fa qui ──────────────────────────────────────────────

   Disdetta e riattivazione **non** passano dal fornitore: sono decisioni che
   non muovono denaro, e farle dipendere da una rete che può non rispondere
   vorrebbe dire lasciare qualcuno abbonato contro la sua volontà.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';
  var CHIAVE_DB = 'ingly_saas_db';
  /* I link di pagamento li configura l'amministratore, uno per piano. */
  var CHIAVE_LINK = 'ingly_stripe_links';
  var CONTATTO = 'inglydesign@gmail.com';

  function A() { return global.InglyAbbonamento; }
  function P() { return global.InglyPiani; }

  function leggi() {
    try {
      var g = global.localStorage && global.localStorage.getItem(CHIAVE_DB);
      var d = g ? JSON.parse(g) : {};
      return (d && typeof d === 'object') ? d : null;
    } catch (e) { return null; }
  }

  function scrivi(db) {
    try { global.localStorage.setItem(CHIAVE_DB, JSON.stringify(db)); return { ok: true }; }
    catch (e) { return { ok: false, motivo: String(e && e.message) }; }
  }

  function _id(p) {
    var r = (global.crypto && global.crypto.getRandomValues)
      ? global.crypto.getRandomValues(new Uint32Array(2))
      : [Math.floor(Math.random() * 4294967296), Math.floor(Math.random() * 4294967296)];
    return p + '_' + r[0].toString(36) + r[1].toString(36);
  }

  /* ── Il fornitore ─────────────────────────────────────────────────────── */

  function _link() {
    try { return JSON.parse(global.localStorage.getItem(CHIAVE_LINK) || '{}') || {}; }
    catch (e) { return {}; }
  }

  /** Quale fornitore è configurato, o `null`. Nessun valore predefinito. */
  function fornitore() {
    var l = _link();
    return Object.keys(l).length ? 'stripe_payment_links' : null;
  }

  function configurato() { return fornitore() !== null; }

  /** Il link di pagamento per un piano, se c'è. Le chiavi sono `piano` o `piano_intervallo`. */
  function link(planId, intervallo) {
    var l = _link();
    return l[String(planId) + '_' + String(intervallo)] || l[String(planId)] || null;
  }

  /* ── Chiedere di pagare ───────────────────────────────────────────────── */

  /**
   * Avvia il pagamento di un piano. Non attiva niente e non promette niente:
   * restituisce dove si paga, o perché non si può pagare adesso.
   *
   * @returns { ok, via:'fornitore'|'contatto', url, motivo }
   */
  function richiedi(planId, intervallo, opzioni) {
    var o = opzioni || {};
    var c = P();
    var p = c ? c.piano(planId) : null;
    if (!p) return { ok: false, via: null, motivo: 'Piano sconosciuto: ' + planId };
    var prezzo = c ? c.prezzo(planId, intervallo) : null;
    if (!prezzo) return { ok: false, via: null, motivo: 'Nessun prezzo per questo piano e questa periodicità' };

    var u = link(planId, intervallo);
    if (u) {
      var richiesta = {
        id: _id('bil'), at: new Date().toISOString(),
        tenant_id: o.tenant_id || null, plan_id: planId, billing_interval: intervallo,
        price_id: prezzo.id, amount: prezzo.amount, currency: prezzo.currency,
        provider: fornitore(), stato: 'avviata',
      };
      var db = leggi();
      if (db) {
        db.billing_requests = (db.billing_requests || []).concat([richiesta]);
        scrivi(db);
      }
      if (o.apri !== false && typeof global.open === 'function') {
        try { global.open(u, '_blank', 'noopener'); } catch (e) {}
      }
      return { ok: true, via: 'fornitore', url: u, richiesta: richiesta,
        prezzo: prezzo, piano: p };
    }

    /* Nessun fornitore configurato. Si dice, e si dà una strada vera: il
       contatto diretto. Quello che NON si fa è attivare il piano per far
       sembrare che sia andata. */
    return {
      ok: false, via: 'contatto', contatto: CONTATTO, piano: p, prezzo: prezzo,
      motivo: 'Il pagamento online non è ancora configurato su questa installazione. '
        + 'Scrivi a ' + CONTATTO + ' indicando il piano ' + p.nome
        + ' (' + (intervallo === 'yearly' ? 'annuale' : 'mensile') + ').',
    };
  }

  /* ── Applicare un evento del fornitore ────────────────────────────────── */

  var TIPI = {
    'checkout.completed': 'attiva',
    'invoice.paid': 'rinnova',
    'invoice.payment_failed': 'non_pagato',
    'subscription.deleted': 'disdici',
  };

  function eventoGiaVisto(db, id) {
    return (db.billing_events || []).some(function (e) { return e && String(e.id) === String(id); });
  }

  /**
   * Riporta un evento del fornitore sull'abbonamento del tenant.
   *
   * L'evento deve portare: `id` (dell'evento presso il fornitore), `type`,
   * `tenant_id`, `provider`, `provider_subscription_id`. Senza queste cose
   * non è un evento del fornitore: è un'attivazione scritta a mano, e viene
   * rifiutata.
   */
  function applica(evento, opzioni) {
    var o = opzioni || {};
    var ev = evento || {};
    var a = A();
    if (!a) return { ok: false, motivo: 'modulo abbonamento non disponibile' };

    var mancanti = ['id', 'type', 'tenant_id', 'provider', 'provider_subscription_id']
      .filter(function (k) { return !ev[k]; });
    if (mancanti.length) {
      return { ok: false, motivo: 'Evento incompleto: manca ' + mancanti.join(', '),
        mancanti: mancanti };
    }
    var azione = TIPI[ev.type];
    if (!azione) return { ok: false, motivo: 'Tipo di evento non gestito: ' + ev.type };

    var db = leggi();
    if (!db) return { ok: false, motivo: 'Archivio non leggibile' };

    /* Idempotenza: lo stesso evento due volte non fa due cose. */
    if (eventoGiaVisto(db, ev.id)) {
      return { ok: true, ripetuto: true, motivo: 'Evento già applicato', evento_id: ev.id };
    }

    var i = -1;
    (db.subscriptions || []).forEach(function (s, k) {
      if (s && String(s.tenant_id || '') === String(ev.tenant_id)) i = k;
    });
    if (i < 0) return { ok: false, motivo: 'Nessun abbonamento per questo workspace' };
    var sub = db.subscriptions[i];

    var esito;
    if (azione === 'attiva') {
      esito = a.attiva(sub, ev.plan_id || sub.plan_id, ev.billing_interval || sub.billing_interval || 'monthly', {
        adesso: ev.at, provider: ev.provider, provider_subscription_id: ev.provider_subscription_id,
      });
    } else if (azione === 'rinnova') {
      esito = a.rinnova(sub, { adesso: ev.at });
    } else if (azione === 'non_pagato') {
      esito = a.segnaNonPagato(sub, { adesso: ev.at });
    } else {
      esito = a.disdici(sub, { adesso: ev.at });
    }
    if (!esito.ok) return { ok: false, motivo: esito.motivo, evento_id: ev.id };

    var aggiornato = Object.assign({}, esito.abbonamento, {
      provider: ev.provider,
      provider_subscription_id: ev.provider_subscription_id,
    });
    db.subscriptions[i] = aggiornato;
    db.billing_events = (db.billing_events || []).concat([{
      id: ev.id, type: ev.type, at: ev.at || new Date().toISOString(),
      tenant_id: ev.tenant_id, provider: ev.provider,
      provider_subscription_id: ev.provider_subscription_id,
      applicato: azione, esito: 'ok',
    }]);
    db.audit_log = (db.audit_log || []).concat([{
      id: _id('aud'), at: new Date().toISOString(), actor: o.attore || 'billing',
      tenant_id: ev.tenant_id, action: 'billing.' + azione, target: aggiornato.id,
      result: 'ok', metadata: { evento: ev.id, provider: ev.provider },
    }]);

    var w = scrivi(db);
    return w.ok
      ? { ok: true, azione: azione, abbonamento: aggiornato }
      : { ok: false, motivo: w.motivo };
  }

  function eventi(tenantId) {
    var db = leggi();
    if (!db) return [];
    return (db.billing_events || []).filter(function (e) {
      return !tenantId || String(e.tenant_id || '') === String(tenantId);
    });
  }

  function richieste(tenantId) {
    var db = leggi();
    if (!db) return [];
    return (db.billing_requests || []).filter(function (e) {
      return !tenantId || String(e.tenant_id || '') === String(tenantId);
    });
  }

  /* ── Decisioni che non muovono denaro ─────────────────────────────────── */

  function _conAbbonamento(tenantId, fn) {
    var db = leggi();
    if (!db) return { ok: false, motivo: 'Archivio non leggibile' };
    var i = -1;
    (db.subscriptions || []).forEach(function (s, k) {
      if (s && String(s.tenant_id || '') === String(tenantId || '')) i = k;
    });
    if (i < 0) return { ok: false, motivo: 'Nessun abbonamento per questo workspace' };
    var esito = fn(db.subscriptions[i]);
    if (!esito || !esito.ok) return { ok: false, motivo: (esito && esito.motivo) || 'Operazione non riuscita' };
    db.subscriptions[i] = esito.abbonamento;
    db.audit_log = (db.audit_log || []).concat([{
      id: _id('aud'), at: new Date().toISOString(), actor: esito.attore || 'utente',
      tenant_id: tenantId, action: esito.azione, target: esito.abbonamento.id,
      result: 'ok', metadata: esito.metadata || {},
    }]);
    var w = scrivi(db);
    return w.ok ? { ok: true, abbonamento: esito.abbonamento } : { ok: false, motivo: w.motivo };
  }

  /** Disdetta: l'accesso resta fino alla fine del periodo già pagato. */
  function disdici(tenantId, opzioni) {
    var o = opzioni || {};
    var a = A();
    if (!a) return { ok: false, motivo: 'modulo abbonamento non disponibile' };
    return _conAbbonamento(tenantId, function (sub) {
      var e = a.disdici(sub, { adesso: o.adesso });
      if (!e.ok) return e;
      return Object.assign(e, { azione: 'subscription.cancelled', attore: o.attore,
        metadata: { motivo: o.motivo || null } });
    });
  }

  /**
   * Ripensarci prima della scadenza: si torna dov'era. Non è un pagamento —
   * il periodo è già pagato — quindi non passa dal fornitore.
   */
  function riattiva(tenantId, opzioni) {
    var o = opzioni || {};
    var a = A();
    if (!a) return { ok: false, motivo: 'modulo abbonamento non disponibile' };
    return _conAbbonamento(tenantId, function (sub) {
      if (!sub || sub.status !== 'cancelled') {
        return { ok: false, motivo: 'Questo abbonamento non è disdetto' };
      }
      var st = a.stato(sub, o.adesso);
      if (!st.accesso) {
        /* Il periodo è finito: riattivare qui vorrebbe dire regalare un
           periodo. Chi è fuori periodo passa dal pagamento. */
        return { ok: false, motivo: 'Il periodo pagato è finito: serve un nuovo pagamento' };
      }
      var fuTrial = !!sub.trial_end && !sub.billing_interval;
      return { ok: true, azione: 'subscription.reactivated', attore: o.attore,
        abbonamento: Object.assign({}, sub, {
          status: fuTrial ? 'trial' : 'active',
          cancel_at_period_end: false,
          cancelled_at: null,
          updated_at: new Date(o.adesso || Date.now()).toISOString(),
        }) };
    });
  }

  /**
   * Cambio di piano.
   *
   * Verso un piano più basso non si muove denaro adesso: si registra
   * l'intenzione e si applica al rinnovo. Verso un piano più alto si paga, e
   * allora si passa da `richiedi()`: qui non si attiva niente.
   */
  function cambiaPiano(tenantId, planId, intervallo, opzioni) {
    var o = opzioni || {};
    var c = P();
    var a = A();
    if (!c || !a) return { ok: false, motivo: 'moduli non disponibili' };
    var nuovo = c.piano(planId);
    if (!nuovo) return { ok: false, motivo: 'Piano sconosciuto: ' + planId };

    var db = leggi();
    if (!db) return { ok: false, motivo: 'Archivio non leggibile' };
    var sub = (db.subscriptions || []).filter(function (s) {
      return s && String(s.tenant_id || '') === String(tenantId || '');
    })[0];
    if (!sub) return { ok: false, motivo: 'Nessun abbonamento per questo workspace' };

    var st = a.stato(sub, o.adesso);
    var attuale = c.piano(st.piano);
    var salita = !attuale || nuovo.livello > attuale.livello
      || (intervallo === 'yearly' && sub.billing_interval === 'monthly');

    if (salita || st.stato === 'trial' || !st.accesso) {
      var r = richiedi(planId, intervallo, Object.assign({ tenant_id: tenantId }, o));
      return Object.assign({ cambiato: false, servePagamento: true }, r);
    }

    /* Discesa: si registra e si applica al rinnovo. Applicarla subito
       toglierebbe funzioni già pagate fino alla scadenza. */
    return _conAbbonamento(tenantId, function (s) {
      return { ok: true, azione: 'subscription.plan_scheduled', attore: o.attore,
        metadata: { da: s.plan_id, a: planId, intervallo: intervallo },
        abbonamento: Object.assign({}, s, {
          pending_plan_id: planId,
          pending_billing_interval: intervallo || s.billing_interval,
          pending_from: s.current_period_end,
          updated_at: new Date(o.adesso || Date.now()).toISOString(),
        }) };
    });
  }

  global.InglyFatturazione = {
    VERSIONE: VERSIONE,
    CHIAVE_DB: CHIAVE_DB,
    CHIAVE_LINK: CHIAVE_LINK,
    CONTATTO: CONTATTO,
    TIPI: TIPI,
    fornitore: fornitore,
    configurato: configurato,
    link: link,
    richiedi: richiedi,
    applica: applica,
    eventi: eventi,
    richieste: richieste,
    disdici: disdici,
    riattiva: riattiva,
    cambiaPiano: cambiaPiano,
  };
})(typeof window !== 'undefined' ? window : globalThis);
