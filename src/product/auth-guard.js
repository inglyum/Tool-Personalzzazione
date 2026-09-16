/* ═══════════════════════════════════════════════════════════════════════════
   GUARDIA — una domanda sola, fatta nei momenti giusti
   ═══════════════════════════════════════════════════════════════════════════

   «Questa persona può stare qui?» è una domanda che l'applicazione si è
   sempre fatta in otto punti diversi, ognuno con la sua idea di risposta. Da
   qui in avanti la fa una volta sola, e la risposta è un oggetto: che cosa
   fare (`azione`), perché (`causa`), e che cosa dire a chi sta davanti allo
   schermo (`messaggio`).

   ── Quando ──────────────────────────────────────────────────────────────

     avvio      l'applicazione si apre con una sessione già in memoria
     accesso    subito dopo il login, prima di mostrare qualunque cosa
     ritorno    la scheda torna in primo piano (può essere passato un mese)
     periodico  ogni PERIODO_MS, perché una sospensione non aspetta un clic
     rotta      a ogni cambio di sezione

   ── Tre esiti, non due ──────────────────────────────────────────────────

     entra      si va avanti
     esci       la sessione non vale più: si torna alla schermata di accesso
     blocco     l'identità è valida ma i diritti no: non si butta fuori
                nessuno, si spiega e si offre la via d'uscita (rinnovo,
                assistenza). Buttare fuori chi ha solo l'abbonamento scaduto
                significa impedirgli di rinnovarlo.

   ── La regola che conta ─────────────────────────────────────────────────

   **Chi non sa, non apre.** Un archivio illeggibile, un modulo assente, un
   dato mancante: nessuno di questi è un sì. Il difetto storico di questo
   codice era l'opposto — una sessione senza scadenza non scadeva mai, un
   utente senza `modules` poteva tutto — e non deve tornare da questa porta.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';
  var CHIAVE_SESSIONE = 'ingly_saas_session';
  /* Ogni due minuti: abbastanza spesso perché una sospensione si veda quasi
     subito, abbastanza raro da non pesare. */
  var PERIODO_MS = 120000;

  function I() { return global.InglyIdentita; }
  function C() { return global.InglyAccount; }
  function D() { return global.InglyDispositivi; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── La decisione ─────────────────────────────────────────────────────── */

  function _esito(azione, causa, messaggio, extra) {
    return Object.assign({
      ok: azione === 'entra', azione: azione, causa: causa,
      messaggio: messaggio || null,
    }, extra || {});
  }

  /**
   * Pura: non tocca il DOM, non scrive niente, non fa uscire nessuno.
   * Serve a poterla misurare, e a poterla chiamare spesso senza effetti.
   *
   * @param sessione la sessione corrente (o null)
   * @param opzioni  { quando, momento }
   */
  function controlla(sessione, opzioni) {
    var o = opzioni || {};
    var i = I();
    var c = C();

    /* 1 · C'è una sessione, ed è una sessione. */
    if (!sessione) return _esito('esci', 'sessione', 'Accedi per continuare');
    if (i) {
      var v = i.sessioneValida(sessione, o.quando);
      if (!v.ok) {
        return _esito('esci', 'sessione',
          v.manomessa ? 'La sessione non è valida. Accedi di nuovo.'
            : (v.scaduta ? 'La sessione è scaduta. Accedi di nuovo.' : 'Accedi per continuare'),
          { manomessa: !!v.manomessa, scaduta: !!v.scaduta });
      }
    }

    /* 2 · L'account esiste ancora ed è nello stato che credeva. */
    if (!c) {
      /* Il modulo che sa rispondere non c'è: non è un sì. */
      return _esito('esci', 'sistema', 'Servizio di verifica non disponibile');
    }
    var utente = c.perId(sessione.user_id);
    if (!utente) {
      return _esito('esci', 'account', 'Questo account non esiste più');
    }
    var st = c.stato(utente);
    if (!st.ok) {
      /* Sospeso, bandito, cancellato: fuori. Scaduto: si resta, e si spiega —
         perché chi deve rinnovare ha bisogno di poterlo fare. */
      if (st.causa === 'abbonamento') {
        return _esito('blocco', 'abbonamento', st.motivo || 'Abbonamento non attivo',
          { abbonamento: st.abbonamento, utente: utente });
      }
      return _esito('blocco', 'account', st.motivo || 'Questo account non è attivo',
        { account: st.account, utente: utente, esciSubito: true });
    }

    /* 3 · La postazione è ancora la mia. */
    var d = D();
    if (d) {
      var dv = d.verifica(sessione.user_id, sessione.device_id, o.quando);
      if (!dv.ok) {
        return _esito('esci', 'dispositivo', dv.motivo || 'Sessione chiusa da un altro dispositivo',
          { revocata: !!dv.revocata, ignoto: !!dv.ignoto });
      }
    }

    return _esito('entra', null, null, { utente: utente, stato: st });
  }

  /* ── La schermata del blocco ──────────────────────────────────────────── */

  /**
   * Il blocco non è un errore: è una pagina che dice che cosa è successo e
   * che cosa si può fare adesso. Senza un'uscita, un blocco è solo un muro.
   */
  function schermata(esito) {
    var e = esito || {};
    var L = global.InglyLancio;
    if (L && L.stile) L.stile();
    var abbonamento = e.causa === 'abbonamento';
    var titolo = abbonamento ? 'Il tuo abbonamento non è attivo' : 'Accesso sospeso';
    var azione = abbonamento
      ? '<button class="ly-cta" id="guardia-azione" onclick="InglyGuardia.vaiAiPrezzi()">Riattiva l’abbonamento</button>'
      : '';
    return '<div role="alert">'
      + '<h2 class="ly-h1">' + esc(titolo) + '</h2>'
      + '<p class="ly-h2">' + esc(e.messaggio || 'Non è possibile continuare.') + '</p>'
      + azione
      + '<div class="ly-switch"><button type="button" class="ly-link" id="guardia-esci" '
      + 'onclick="InglyGuardia.esci()">Esci e accedi con un altro account</button></div>'
      + '<p class="ly-legal">I tuoi dati restano dove sono. '
      + (abbonamento
        ? 'Riattivando l’abbonamento ritrovi tutto com’era.'
        : 'Se pensi che sia un errore, scrivi all’assistenza.')
      + '</p></div>';
  }

  function vaiAiPrezzi() {
    var L = global.InglyLancio;
    if (L && typeof L.vaiAiPrezzi === 'function') return L.vaiAiPrezzi();
    return false;
  }

  /* ── Gli effetti ──────────────────────────────────────────────────────── */

  function sessioneCorrente() {
    var G = global.SaaSGate;
    if (G && G._session) return G._session;
    try {
      var g = global.sessionStorage && global.sessionStorage.getItem(CHIAVE_SESSIONE);
      return g ? JSON.parse(g) : null;
    } catch (e) { return null; }
  }

  function esci(messaggio) {
    var G = global.SaaSGate;
    _ultimo = null;
    if (G && typeof G.logout === 'function') {
      G.logout();
      if (messaggio && typeof document !== 'undefined') {
        var e = document.getElementById('gate-err');
        if (e) { e.textContent = messaggio; e.style.display = 'block'; }
      }
      return { ok: true, uscito: true };
    }
    return { ok: false, motivo: 'nessuna porta da cui uscire' };
  }

  var _ultimo = null;

  /** Mostra il blocco senza distruggere la sessione: si può ancora rinnovare. */
  function mostraBlocco(esito) {
    if (typeof document === 'undefined') return false;
    var gate = document.getElementById('saas-gate');
    var login = document.getElementById('gate-login');
    var reg = document.getElementById('gate-register');
    if (!gate || !login) return false;
    if (reg) reg.style.display = 'none';
    login.innerHTML = schermata(esito);
    login.style.display = 'block';
    gate.style.display = 'flex';
    global._SAAS_GATE_BLOCKING = true;
    return true;
  }

  /**
   * Decide e agisce. Restituisce sempre l'esito, anche quando non fa niente:
   * una guardia che non dice che cosa ha deciso è una guardia che non si può
   * controllare.
   */
  function applica(opzioni) {
    var o = opzioni || {};
    var esito = controlla(o.sessione !== undefined ? o.sessione : sessioneCorrente(), o);
    _ultimo = esito;
    if (esito.azione === 'entra') {
      /* Presenza: tiene viva la postazione mentre si lavora davvero. */
      var d = D();
      var s = o.sessione !== undefined ? o.sessione : sessioneCorrente();
      if (d && s && s.user_id) { try { d.battito(s.user_id, s.device_id); } catch (e) {} }
      return esito;
    }
    if (o.agisci === false) return esito;
    if (esito.azione === 'blocco') { mostraBlocco(esito); return esito; }
    esci(esito.messaggio);
    return esito;
  }

  function ultimo() { return _ultimo; }

  /* ── Il ciclo ─────────────────────────────────────────────────────────── */

  var _timer = null;
  var _ascoltatori = [];

  function avvia(opzioni) {
    var o = opzioni || {};
    if (_timer) return { ok: true, gia: true };
    if (typeof document === 'undefined') return { ok: false, motivo: 'nessun documento' };

    _timer = global.setInterval(function () { applica({}); }, o.periodo || PERIODO_MS);

    /* Al ritorno in primo piano: la scheda può essere rimasta aperta una
       notte intera, e nel frattempo l'abbonamento può essere finito. */
    var alRitorno = function () { if (!document.hidden) applica({}); };
    document.addEventListener('visibilitychange', alRitorno);
    _ascoltatori.push(['visibilitychange', alRitorno]);

    applica({});
    return { ok: true, periodo: o.periodo || PERIODO_MS };
  }

  function ferma() {
    if (_timer) { global.clearInterval(_timer); _timer = null; }
    _ascoltatori.forEach(function (a) {
      try { document.removeEventListener(a[0], a[1]); } catch (e) {}
    });
    _ascoltatori = [];
    return { ok: true };
  }

  function attiva() { return !!_timer; }

  global.InglyGuardia = {
    VERSIONE: VERSIONE,
    PERIODO_MS: PERIODO_MS,
    controlla: controlla,
    schermata: schermata,
    sessioneCorrente: sessioneCorrente,
    mostraBlocco: mostraBlocco,
    applica: applica,
    ultimo: ultimo,
    esci: esci,
    vaiAiPrezzi: vaiAiPrezzi,
    avvia: avvia,
    ferma: ferma,
    attiva: attiva,
  };
})(typeof window !== 'undefined' ? window : globalThis);
