/* ═══════════════════════════════════════════════════════════════════════════
   ACCOUNT — la creazione è una cosa sola, o non è
   ═══════════════════════════════════════════════════════════════════════════

   Il difetto che ha fatto nascere questo file, misurato in un browser vero:

     premo «Crea l'account» → l'account viene creato → il pulsante resta su
     «Creazione in corso…», disabilitato → non succede più niente.

   La causa non era la creazione: era il **dopo**. Il codice, creato l'utente,
   chiamava `showLogin()` e poi riempiva i campi `gate-user` e `gate-pass`. Ma
   `showLogin()` cambia solo il `display` di un contenitore il cui contenuto
   era stato sostituito dal modulo di registrazione: quei due campi non
   esistevano più. `if (u) u.value = …` non falliva — **saltava**. Il login
   leggeva campi vuoti, usciva, e nessuno riabilitava il pulsante.

   Un `if` che salta in silenzio e una promessa che si risolve senza aver
   fatto niente: due cose che non danno errore e lasciano l'utente fermo.

   ── Come è fatto adesso ─────────────────────────────────────────────────

   Una funzione sola, `crea()`, esegue nove fasi in ordine e **restituisce
   quello che è successo**, fase per fase. Non tocca il DOM, non chiama
   `showLogin`, non dipende da quali campi ci siano a schermo. L'interfaccia
   chiama, guarda l'esito, e decide che cosa mostrare.

   ── Atomicità, per davvero ──────────────────────────────────────────────

   Senza transazioni, l'atomicità si ottiene in un modo solo: **si costruisce
   tutto in memoria e si scrive una volta sola**. Se qualcosa fallisce prima
   della scrittura, in archivio non è cambiato niente. Se fallisce la
   scrittura, non è cambiato niente lo stesso.

   Non è un dettaglio accademico: un account creato a metà — utente sì,
   abbonamento no — è un cliente che paga e non entra.

   ── Idempotenza ─────────────────────────────────────────────────────────

   Premere due volte non crea due account. `crea()` rifiuta un'email già
   presente, e `_inCorso` impedisce che due chiamate contemporanee scrivano
   entrambe.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';
  var CHIAVE_DB = 'ingly_saas_db';

  function I() { return global.InglyIdentita; }
  function A() { return global.InglyAbbonamento; }
  function D() { return global.InglyDispositivi; }

  /* ── Archivio ─────────────────────────────────────────────────────────── */

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

  function _id(prefisso) {
    return prefisso + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ── Stati dell'account ───────────────────────────────────────────────── */

  var STATI = ['active', 'pending_verification', 'suspended', 'banned', 'deleted'];
  var TRANSIZIONI = {
    active: ['suspended', 'banned', 'deleted'],
    pending_verification: ['active', 'suspended', 'banned', 'deleted'],
    suspended: ['active', 'banned', 'deleted'],
    banned: ['active', 'deleted'],
    deleted: [],
  };
  function transizioneValida(da, a) {
    var d = String(da || 'active');
    var v = String(a || '');
    if (STATI.indexOf(v) < 0) return { ok: false, motivo: 'stato sconosciuto: ' + v };
    if (d === v) return { ok: true, invariata: true };
    var ammesse = TRANSIZIONI[d] || [];
    if (ammesse.indexOf(v) >= 0) return { ok: true, ammesse: ammesse };
    return { ok: false, ammesse: ammesse,
      motivo: 'da «' + d + '» non si passa a «' + v + '»' };
  }

  /* ── Validazione ──────────────────────────────────────────────────────── */

  /**
   * Tutti gli errori in una volta, ognuno col suo campo: chi compila vede
   * che cosa correggere, invece di scoprirlo un pezzo per volta.
   */
  function valida(dati, opzioni) {
    var d = dati || {};
    var o = opzioni || {};
    var i = I();
    var errori = [];
    var agg = function (campo, messaggio) { errori.push({ campo: campo, messaggio: messaggio }); };

    if (!String(d.nome || '').trim()) agg('nome', 'Indica il tuo nome');
    if (!String(d.laboratorio || '').trim()) agg('laboratorio', 'Dai un nome al tuo laboratorio');

    var email = i ? i.normalizzaEmail(d.email) : String(d.email || '').trim().toLowerCase();
    if (!email) agg('email', 'Indica la tua email');
    else if (i && !i.emailValida(email)) agg('email', 'Indirizzo email non valido');

    if (!d.password) agg('password', 'Scegli una password');
    else if (i) {
      var f = i.robustezza(d.password);
      if (!f.ok) agg('password', 'La password deve avere: ' + f.problemi.join(', '));
    }
    if (d.conferma != null && d.password !== d.conferma) {
      agg('conferma', 'Le due password non coincidono');
    }
    /* L'accettazione dei termini si richiede solo dove è dichiarata: il primo
       avvio di un'installazione propria non è una sottoscrizione. */
    if (o.richiediTermini && !d.termini) agg('termini', 'Devi accettare le condizioni per continuare');

    return { ok: errori.length === 0, errori: errori, email: email };
  }

  /* ── Creazione ────────────────────────────────────────────────────────── */

  var _inCorso = false;

  /**
   * @param dati    { nome, laboratorio, email, password, conferma, termini }
   * @param opzioni { ruolo, piano, intervallo, prova, dispositivo, richiediTermini }
   * @returns { ok, motivo, campo, errori[], fasi[], utente, tenant, abbonamento, sessione }
   */
  async function crea(dati, opzioni) {
    var o = opzioni || {};
    var fasi = [];
    var fase = function (nome, esito, dettaglio) {
      fasi.push({ fase: nome, ok: esito !== false, dettaglio: dettaglio || null });
    };

    /* Doppio clic: la seconda chiamata non scrive niente. */
    if (_inCorso) {
      return { ok: false, motivo: 'Creazione già in corso', inCorso: true, fasi: fasi };
    }
    _inCorso = true;
    try {
      var i = I();
      if (!i) { fase('moduli', false); return { ok: false, motivo: 'Servizio di registrazione non disponibile', fasi: fasi }; }
      fase('moduli');

      /* 1 · Validazione */
      var v = valida(dati, o);
      if (!v.ok) {
        fase('validazione', false, v.errori.length + ' errori');
        return { ok: false, motivo: v.errori[0].messaggio, campo: v.errori[0].campo,
          errori: v.errori, fasi: fasi };
      }
      fase('validazione');

      /* 2 · Unicità — prima di costruire qualunque cosa */
      var db = leggi();
      if (db === null) {
        fase('archivio', false);
        return { ok: false, motivo: 'Archivio non leggibile: non creo un account sopra dati illeggibili', fasi: fasi };
      }
      db.users = db.users || [];
      if (db.users.some(function (u) { return i.normalizzaEmail(u.email) === v.email; })) {
        fase('unicita', false);
        return { ok: false, motivo: 'Esiste già un account con questa email', campo: 'email', fasi: fasi };
      }
      /* Lo username esiste perché l'accesso storico lo accetta al posto
         dell'email. Finché quel percorso c'è, due account non possono
         averlo uguale: sarebbero due persone dietro la stessa chiave. */
      var username = String(dati.username || '').trim() || null;
      if (username && db.users.some(function (u) {
        return String(u.username || '').toLowerCase() === username.toLowerCase();
      })) {
        fase('unicita', false);
        return { ok: false, motivo: 'Questo nome utente è già in uso', campo: 'username', fasi: fasi };
      }
      fase('unicita');

      /* 3 · Identità — la password diventa un hash, e basta */
      var hash;
      try { hash = await i.cifra(dati.password); }
      catch (e) {
        fase('identita', false, e && e.message);
        return { ok: false, motivo: 'Non è stato possibile proteggere la password. Riprova.', fasi: fasi };
      }
      fase('identita');

      var adesso = new Date().toISOString();
      var idUtente = _id('usr');
      var idTenant = _id('ws');

      /* 4 · Profilo */
      var utente = {
        id: idUtente, user_id: idUtente,
        email: v.email,
        username: username,
        nome: String(dati.nome || '').trim(),
        labName: String(dati.laboratorio || '').trim(),
        status: o.stato || 'active',
        active: true,
        tenant_id: idTenant,
        ruolo: o.ruolo || 'owner',
        password_hash: hash,
        created_at: adesso,
        terms_accepted_at: dati.termini ? adesso : null,
      };
      fase('profilo');

      /* 5 · Workspace */
      var tenant = {
        id: idTenant, nome: utente.labName, owner_id: idUtente,
        settore: dati.settore || null, paese: dati.paese || 'IT', valuta: dati.valuta || 'EUR',
        created_at: adesso,
      };
      fase('workspace');

      /* 6 · Appartenenza e ruolo */
      var membership = {
        id: _id('mb'), user_id: idUtente, tenant_id: idTenant,
        ruolo: utente.ruolo, created_at: adesso,
      };
      fase('appartenenza');

      /* 7 · Abbonamento — prova o attivo, secondo chi sta creando */
      var a = A();
      var abbonamento = null;
      if (a) {
        abbonamento = (o.prova === false)
          ? a.creaAttivo(o.piano || 'business', o.intervallo || 'yearly', { tenant_id: idTenant })
          : a.creaTrial({ tenant_id: idTenant });
      }
      fase('abbonamento', !!abbonamento, abbonamento ? abbonamento.status : 'modulo assente');

      /* 8 · Sessione di dispositivo, se la policy è attiva */
      var dispositivo = null;
      var dd = D();
      if (dd && o.dispositivo !== false) {
        dispositivo = dd.creaSessione({ user_id: idUtente, tenant_id: idTenant });
        fase('dispositivo', !!dispositivo, dispositivo ? dispositivo.device_id : 'non registrato');
      } else {
        /* Policy non attiva: non è un fallimento, ed è importante che non si
           travesta da tale — una fase «non riuscita» su un passaggio che non
           doveva avvenire renderebbe illeggibile il resoconto. */
        fase('dispositivo', true, 'policy non attiva');
      }

      /* 9 · Scrittura — **una sola**, alla fine. Fin qui in archivio non è
         cambiato niente, quindi un errore prima di questa riga non lascia
         account a metà. */
      db.users.push(utente);
      db.tenants = (db.tenants || []).concat([tenant]);
      db.memberships = (db.memberships || []).concat([membership]);
      if (abbonamento) db.subscriptions = (db.subscriptions || []).concat([abbonamento]);
      if (dispositivo) db.device_sessions = (db.device_sessions || []).concat([dispositivo]);
      db.audit_log = (db.audit_log || []).concat([{
        id: _id('aud'), at: adesso, actor: idUtente, tenant_id: idTenant,
        action: 'account.created', target: idUtente, result: 'ok',
        metadata: { ruolo: utente.ruolo, piano: abbonamento ? abbonamento.plan_id : null },
      }]);

      var w = scrivi(db);
      if (!w.ok) {
        fase('scrittura', false, w.motivo);
        return { ok: false, motivo: 'Non è stato possibile salvare l\'account: ' + w.motivo, fasi: fasi };
      }
      fase('scrittura');

      /* 10 · Sessione applicativa — nessun diritto dentro */
      var sessione = i.creaSessione(utente, { modalita: 'locale' });
      sessione.labName = utente.labName;
      if (dispositivo) sessione.device_id = dispositivo.device_id;
      fase('sessione');

      return { ok: true, motivo: null, fasi: fasi,
        utente: utente, tenant: tenant, membership: membership,
        abbonamento: abbonamento, dispositivo: dispositivo, sessione: sessione };
    } catch (e) {
      /* Qualunque cosa sia andata storta, l'archivio non è stato toccato:
         la scrittura è una sola e sta in fondo. */
      fase('imprevisto', false, e && e.message);
      return { ok: false, motivo: 'Creazione non riuscita: ' + (e && e.message), fasi: fasi };
    } finally {
      /* Sempre. È la riga che rende impossibile restare «in corso» per
         sempre — il difetto da cui questo file è nato. */
      _inCorso = false;
    }
  }

  function inCorso() { return _inCorso; }

  /* ── Lettura ──────────────────────────────────────────────────────────── */

  function conta() {
    var db = leggi();
    return db ? (db.users || []).length : null;
  }

  function perEmail(email) {
    var i = I();
    var db = leggi();
    if (!db) return null;
    var e = i ? i.normalizzaEmail(email) : String(email || '').toLowerCase();
    return (db.users || []).filter(function (u) {
      return (i ? i.normalizzaEmail(u.email) : String(u.email || '').toLowerCase()) === e;
    })[0] || null;
  }

  function perId(id) {
    var db = leggi();
    if (!db) return null;
    return (db.users || []).filter(function (u) { return String(u.id) === String(id); })[0] || null;
  }

  function abbonamentoDi(tenantId) {
    var db = leggi();
    if (!db) return null;
    return (db.subscriptions || []).filter(function (s) {
      return String(s.tenant_id || '') === String(tenantId || '');
    })[0] || null;
  }

  /**
   * Lo stato complessivo: account più abbonamento. È la domanda che si fa la
   * guardia a ogni avvio, e la risposta deve essere una sola.
   */
  function stato(utente) {
    var i = I();
    var a = A();
    var u = utente || null;
    if (!u) return { ok: false, motivo: 'account non trovato', account: null, abbonamento: null };

    var acc = i ? i.statoAccount(u) : { stato: 'active', puoAccedere: true, messaggio: null };
    var sub = a ? a.stato(abbonamentoDi(u.tenant_id)) : null;

    var puo = acc.puoAccedere && (!sub || sub.accesso);
    var motivo = !acc.puoAccedere ? acc.messaggio
      : (sub && !sub.accesso ? sub.motivo : null);

    return {
      ok: puo,
      motivo: motivo,
      account: acc,
      abbonamento: sub,
      /* Perché non può entrare: serve a scegliere quale schermata mostrare. */
      causa: !acc.puoAccedere ? 'account' : (sub && !sub.accesso ? 'abbonamento' : null),
    };
  }

  /* ── Modifiche ────────────────────────────────────────────────────────── */

  /* La forma di una sessione di dispositivo revocata la decide
     `InglyDispositivi`: scriverne una seconda qui significherebbe avere due
     idee di «revocata» e scoprire la differenza il giorno in cui una delle
     due non viene letta. Questa funzione esiste perché la scrittura di
     `InglyAccount` resta una sola, quindi non può delegare al modulo che
     scrive per conto proprio — ma il record che produce è identico. */
  function _revocaDispositivi(db, userId, motivo, adesso) {
    var n = 0;
    (db.device_sessions || []).forEach(function (d) {
      if (!d || String(d.user_id || '') !== String(userId)) return;
      if (d.active === false || d.revoked_at) return;
      d.active = false;
      d.revoked_at = adesso;
      d.revoked_reason = motivo;
      n++;
    });
    return n;
  }

  function _registra(db, voce) {
    db.audit_log = (db.audit_log || []).concat([Object.assign({
      id: _id('aud'), at: new Date().toISOString(), result: 'ok',
    }, voce)]);
  }

  /** Cambia lo stato di un account, rispettando le transizioni. */
  function cambiaStato(userId, nuovo, contesto) {
    var c = contesto || {};
    var db = leggi();
    if (!db) return { ok: false, motivo: 'Archivio non leggibile' };
    var u = (db.users || []).filter(function (x) { return String(x.id) === String(userId); })[0];
    if (!u) return { ok: false, motivo: 'Account non trovato' };

    var t = transizioneValida(u.status || 'active', nuovo);
    if (!t.ok) return { ok: false, motivo: t.motivo, ammesse: t.ammesse };
    if (t.invariata) return { ok: true, invariata: true, utente: u };

    var prima = u.status || 'active';
    u.status = nuovo;
    u.active = nuovo === 'active';
    u.updated_at = new Date().toISOString();

    /* Un account che non può più entrare non deve restare connesso altrove:
       le sue sessioni di dispositivo si revocano. */
    if (nuovo !== 'active') {
      _revocaDispositivi(db, userId, 'account ' + nuovo, u.updated_at);
    }

    _registra(db, {
      actor: c.actor || 'system', tenant_id: u.tenant_id,
      action: 'account.status_changed', target: userId,
      metadata: { prima: prima, dopo: nuovo, motivo: c.motivo || null },
    });
    var w = scrivi(db);
    return w.ok ? { ok: true, utente: u, prima: prima, dopo: nuovo }
      : { ok: false, motivo: w.motivo };
  }

  /** Cambio password: serve quella attuale. */
  async function cambiaPassword(userId, attuale, nuova) {
    var i = I();
    if (!i) return { ok: false, motivo: 'Servizio non disponibile' };
    var db = leggi();
    if (!db) return { ok: false, motivo: 'Archivio non leggibile' };
    var u = (db.users || []).filter(function (x) { return String(x.id) === String(userId); })[0];
    if (!u) return { ok: false, motivo: 'Account non trovato' };

    var e = await i.verifica(attuale, u.password_hash || '');
    if (!e.ok) return { ok: false, motivo: 'La password attuale non è corretta', campo: 'attuale' };

    var f = i.robustezza(nuova);
    if (!f.ok) return { ok: false, motivo: 'La nuova password deve avere: ' + f.problemi.join(', '), campo: 'nuova' };
    if (attuale === nuova) return { ok: false, motivo: 'La nuova password deve essere diversa', campo: 'nuova' };

    u.password_hash = await i.cifra(nuova);
    u.password_changed_at = new Date().toISOString();
    u.updated_at = u.password_changed_at;

    /* Cambiare password chiude le altre sessioni: è il motivo per cui la si
       cambia quando si teme che qualcuno la conosca. */
    _revocaDispositivi(db, userId, 'password cambiata', u.password_changed_at);

    _registra(db, { actor: userId, tenant_id: u.tenant_id,
      action: 'account.password_changed', target: userId, metadata: {} });
    var w = scrivi(db);
    return w.ok ? { ok: true, sessioniRevocate: true } : { ok: false, motivo: w.motivo };
  }

  /** Reimpostazione da parte di un amministratore. */
  async function reimpostaPassword(userId, nuova, contesto) {
    var c = contesto || {};
    var i = I();
    if (!i) return { ok: false, motivo: 'Servizio non disponibile' };
    var f = i.robustezza(nuova);
    if (!f.ok) return { ok: false, motivo: 'La password deve avere: ' + f.problemi.join(', ') };
    var db = leggi();
    if (!db) return { ok: false, motivo: 'Archivio non leggibile' };
    var u = (db.users || []).filter(function (x) { return String(x.id) === String(userId); })[0];
    if (!u) return { ok: false, motivo: 'Account non trovato' };
    u.password_hash = await i.cifra(nuova);
    u.password_changed_at = new Date().toISOString();
    _revocaDispositivi(db, userId, 'password reimpostata', u.password_changed_at);
    _registra(db, { actor: c.actor || 'admin', tenant_id: u.tenant_id,
      action: 'account.password_reset', target: userId, metadata: {} });
    var w = scrivi(db);
    return w.ok ? { ok: true } : { ok: false, motivo: w.motivo };
  }

  function audit(filtro) {
    var db = leggi();
    if (!db) return [];
    var f = filtro || {};
    return (db.audit_log || []).filter(function (v) {
      if (f.tenant_id && String(v.tenant_id) !== String(f.tenant_id)) return false;
      if (f.action && v.action !== f.action) return false;
      if (f.target && String(v.target) !== String(f.target)) return false;
      return true;
    });
  }

  global.InglyAccount = {
    VERSIONE: VERSIONE,
    CHIAVE_DB: CHIAVE_DB,
    STATI: STATI,
    TRANSIZIONI: TRANSIZIONI,
    transizioneValida: transizioneValida,
    valida: valida,
    crea: crea,
    inCorso: inCorso,
    conta: conta,
    perEmail: perEmail,
    perId: perId,
    abbonamentoDi: abbonamentoDi,
    stato: stato,
    cambiaStato: cambiaStato,
    cambiaPassword: cambiaPassword,
    reimpostaPassword: reimpostaPassword,
    audit: audit,
    _leggi: leggi,
    _scrivi: scrivi,
  };
})(typeof window !== 'undefined' ? window : globalThis);
