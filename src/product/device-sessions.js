/* ═══════════════════════════════════════════════════════════════════════════
   DISPOSITIVI — un abbonamento, una postazione
   ═══════════════════════════════════════════════════════════════════════════

   Un abbonamento mensile che gira su cinque computer contemporaneamente è un
   abbonamento venduto una volta e usato cinque. La regola qui è quella dei
   prodotti che si pagano: **una sessione attiva per account**, e chi entra da
   un'altra postazione sceglie consapevolmente di prendere il posto della
   precedente.

   ── Perché «subentrare» e non «rifiutare» ───────────────────────────────

   Rifiutare l'accesso al secondo dispositivo suona più sicuro, e nella pratica
   è la ricetta per il blocco: basta un browser chiuso male, un computer
   spento, una scheda dimenticata in ufficio, e il legittimo proprietario
   dell'abbonamento resta fuori casa propria. Quindi: si avvisa, si mostra da
   dove è aperta l'altra sessione, e si lascia decidere. La sessione
   precedente viene revocata — non ignorata — e alla prima verifica quel
   dispositivo scopre di essere stato sostituito e torna alla schermata di
   accesso.

   ── Il battito ──────────────────────────────────────────────────────────

   Una sessione senza notizie da più di `MINUTI_INATTIVITA` non è «attiva»: è
   una scheda che nessuno ha chiuso. Contarla come occupata significherebbe
   chiedere di subentrare a se stessi. Il battito la tiene viva finché
   qualcuno sta davvero lavorando.

   ── Che cosa questo NON è ───────────────────────────────────────────────

   L'identificativo del dispositivo nasce nel browser, quindi chi vuole può
   cambiarlo. Non è un DRM e non pretende di esserlo: è la misura che tiene
   onesta la stragrande maggioranza degli utilizzi e rende visibile l'abuso.
   L'applicazione della regola sul serio può esistere solo lato server, e
   quando ci sarà un server questo modulo diventerà il suo client: le stesse
   funzioni, la stessa forma dei dati.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';
  var CHIAVE_DB = 'ingly_saas_db';
  /* L'identificativo di questa installazione del browser: sopravvive al
     logout, perché è il dispositivo, non la persona. */
  var CHIAVE_DISPOSITIVO = 'ingly_device_id';

  /* Quante postazioni contemporanee. Uno è la regola commerciale; il campo
     esiste perché un piano multi-postazione possa alzarlo senza riscrivere
     niente. */
  var LIMITE_PREDEFINITO = 1;
  var MINUTI_INATTIVITA = 30;

  function LS() { return global.localStorage; }

  function leggi() {
    try {
      var g = LS() && LS().getItem(CHIAVE_DB);
      var d = g ? JSON.parse(g) : {};
      return (d && typeof d === 'object') ? d : null;
    } catch (e) {
      /* Illeggibile non è vuoto: chi legge male non deve scrivere. */
      return null;
    }
  }

  function scrivi(db) {
    try { LS().setItem(CHIAVE_DB, JSON.stringify(db)); return { ok: true }; }
    catch (e) { return { ok: false, motivo: String(e && e.message) }; }
  }

  function _id(p) {
    var r = (global.crypto && global.crypto.getRandomValues)
      ? global.crypto.getRandomValues(new Uint32Array(2))
      : [Math.floor(Math.random() * 4294967296), Math.floor(Math.random() * 4294967296)];
    return p + '_' + r[0].toString(36) + r[1].toString(36);
  }

  /* ── Identità del dispositivo ─────────────────────────────────────────── */

  /**
   * Un identificativo stabile per questo browser. Nasce a caso e resta:
   * dedurlo dall'user agent lo renderebbe uguale su due computer identici.
   */
  function corrente() {
    var ls = LS();
    if (!ls) return null;
    var v;
    try { v = ls.getItem(CHIAVE_DISPOSITIVO); } catch (e) { v = null; }
    if (v) return v;
    v = _id('dev');
    try { ls.setItem(CHIAVE_DISPOSITIVO, v); } catch (e) { return null; }
    return v;
  }

  /** Come si chiama questo dispositivo nell'elenco: leggibile, non tecnico. */
  function etichetta(ua, piattaforma) {
    var s = String(ua || (global.navigator && global.navigator.userAgent) || '');
    var p = String(piattaforma || (global.navigator && global.navigator.platform) || '');
    var so = /Windows/i.test(s) ? 'Windows'
      : /iPhone|iPad|iPod/i.test(s) ? 'iOS'
        : /Android/i.test(s) ? 'Android'
          : /Mac OS X|Macintosh/i.test(s) ? 'macOS'
            : /Linux/i.test(s) ? 'Linux'
              : (p || 'Dispositivo');
    var browser = /Edg\//i.test(s) ? 'Edge'
      : /OPR\/|Opera/i.test(s) ? 'Opera'
        : /Chrome\//i.test(s) ? 'Chrome'
          : /Firefox\//i.test(s) ? 'Firefox'
            : /Safari\//i.test(s) ? 'Safari'
              : 'Browser';
    return browser + ' su ' + so;
  }

  /* ── Il record ────────────────────────────────────────────────────────── */

  /**
   * Costruisce — non salva. Chi crea un account ha bisogno di mettere questo
   * record nella stessa scrittura di tutto il resto.
   */
  function creaSessione(dati) {
    var d = dati || {};
    var adesso = new Date(d.adesso || Date.now()).toISOString();
    var ua = d.user_agent || (global.navigator && global.navigator.userAgent) || null;
    return {
      id: _id('dvs'),
      device_id: d.device_id || corrente() || _id('dev'),
      user_id: d.user_id || null,
      tenant_id: d.tenant_id || null,
      etichetta: d.etichetta || etichetta(ua, d.piattaforma),
      user_agent: ua,
      created_at: adesso,
      last_seen: adesso,
      active: true,
      revoked_at: null,
      revoked_reason: null,
    };
  }

  /* ── Lettura ──────────────────────────────────────────────────────────── */

  function _scaduta(s, ora) {
    var t = Date.parse((s && (s.last_seen || s.created_at)) || '');
    if (!isFinite(t)) return true;
    return (ora - t) > MINUTI_INATTIVITA * 60000;
  }

  function _viva(s, userId, ora) {
    if (!s || s.active === false || s.revoked_at) return false;
    if (String(s.user_id || '') !== String(userId || '')) return false;
    return !_scaduta(s, ora);
  }

  /**
   * Le sessioni che occupano davvero una postazione: attive, non revocate e
   * con notizie recenti.
   */
  function attive(userId, quando) {
    var db = leggi();
    if (!db) return [];
    var ora = quando ? Date.parse(quando) : Date.now();
    return (db.device_sessions || []).filter(function (s) { return _viva(s, userId, ora); });
  }

  /** Tutte, anche quelle chiuse: l'elenco che vede l'utente e l'amministratore. */
  function tutte(userId) {
    var db = leggi();
    if (!db) return [];
    var q = String(userId || '');
    var qui = corrente();
    return (db.device_sessions || []).filter(function (s) {
      return s && (!q || String(s.user_id || '') === q);
    }).map(function (s) {
      return Object.assign({}, s, { corrente: s.device_id === qui });
    });
  }

  function limiteDi(piano) {
    var P = global.InglyPiani;
    if (P && typeof P.limite === 'function') {
      var n = P.limite(piano, 'dispositivi');
      if (typeof n === 'number' && n > 0) return n;
    }
    return LIMITE_PREDEFINITO;
  }

  /* ── Registrazione ────────────────────────────────────────────────────── */

  function _audit(db, voce) {
    db.audit_log = (db.audit_log || []).concat([Object.assign({
      id: _id('aud'), at: new Date().toISOString(), result: 'ok',
    }, voce)]);
  }

  /**
   * Chiede una postazione per questo dispositivo.
   *
   * @returns { ok, sessione, nuova } se c'è posto o se è già registrato
   *          { ok:false, conflitto:true, occupate:[…], limite } se serve una scelta
   *
   * Non revoca niente da sola: il conflitto lo risolve `subentra`, che è una
   * decisione dell'utente e va presa da chi la vede.
   */
  function registra(utente, opzioni) {
    var o = opzioni || {};
    var u = utente || {};
    var userId = u.id || u.user_id || o.user_id;
    if (!userId) return { ok: false, motivo: 'utente assente' };

    var db = leggi();
    if (!db) return { ok: false, motivo: 'Archivio non leggibile' };
    db.device_sessions = db.device_sessions || [];

    var dev = o.device_id || corrente();
    var ora = Date.now();
    var mie = db.device_sessions.filter(function (s) { return _viva(s, userId, ora); });

    /* Già registrato: si aggiorna il battito e basta. Rientrare dal proprio
       computer non deve mai chiedere di subentrare a se stessi. */
    var gia = mie.filter(function (s) { return s.device_id === dev; })[0];
    if (gia) {
      gia.last_seen = new Date(ora).toISOString();
      scrivi(db);
      return { ok: true, sessione: gia, nuova: false };
    }

    var limite = o.limite || limiteDi(o.piano);
    if (mie.length >= limite) {
      return {
        ok: false, conflitto: true, limite: limite,
        occupate: mie.map(function (s) {
          return { device_id: s.device_id, etichetta: s.etichetta, last_seen: s.last_seen };
        }),
        motivo: limite === 1
          ? 'Il tuo account è già aperto su un altro dispositivo'
          : 'Hai raggiunto il numero di dispositivi del tuo piano (' + limite + ')',
      };
    }

    var sessione = creaSessione({
      device_id: dev, user_id: userId, tenant_id: u.tenant_id || o.tenant_id || null,
    });
    db.device_sessions.push(sessione);
    _audit(db, {
      actor: userId, tenant_id: sessione.tenant_id,
      action: 'device.registered', target: sessione.device_id,
      metadata: { etichetta: sessione.etichetta },
    });
    var w = scrivi(db);
    if (!w.ok) return { ok: false, motivo: 'Non è stato possibile registrare il dispositivo: ' + w.motivo };
    return { ok: true, sessione: sessione, nuova: true };
  }

  /**
   * Prende il posto delle altre postazioni. È l'unica via che revoca sessioni
   * altrui, e passa sempre da una scelta esplicita dell'utente.
   */
  function subentra(utente, opzioni) {
    var o = opzioni || {};
    var u = utente || {};
    var userId = u.id || u.user_id || o.user_id;
    if (!userId) return { ok: false, motivo: 'utente assente' };

    var dev = o.device_id || corrente();
    var r = revocaAltre(userId, dev, 'subentro da un altro dispositivo');
    if (!r.ok) return r;
    var reg = registra(u, Object.assign({}, o, { device_id: dev }));
    if (!reg.ok) return reg;
    return { ok: true, sessione: reg.sessione, revocate: r.revocate };
  }

  /* ── Revoca ───────────────────────────────────────────────────────────── */

  function _chiudi(s, motivo, adesso) {
    s.active = false;
    s.revoked_at = adesso;
    s.revoked_reason = motivo || null;
  }

  function revoca(deviceId, motivo, contesto) {
    var c = contesto || {};
    var db = leggi();
    if (!db) return { ok: false, motivo: 'Archivio non leggibile' };
    var adesso = new Date().toISOString();
    var n = 0;
    (db.device_sessions || []).forEach(function (s) {
      if (s && s.device_id === deviceId && s.active !== false && !s.revoked_at) {
        _chiudi(s, motivo, adesso); n++;
      }
    });
    if (!n) return { ok: true, revocate: 0 };
    _audit(db, {
      actor: c.attore || null, action: 'device.revoked', target: deviceId,
      metadata: { motivo: motivo || null, quante: n },
    });
    var w = scrivi(db);
    return w.ok ? { ok: true, revocate: n } : { ok: false, motivo: w.motivo };
  }

  /**
   * Tutte tranne una. Passando `null` come `deviceId` si chiudono tutte: è
   * quello che serve quando un account viene sospeso o la password cambia.
   */
  function revocaAltre(userId, deviceId, motivo, contesto) {
    var c = contesto || {};
    var db = leggi();
    if (!db) return { ok: false, motivo: 'Archivio non leggibile' };
    var adesso = new Date().toISOString();
    var n = 0;
    (db.device_sessions || []).forEach(function (s) {
      if (!s || String(s.user_id || '') !== String(userId || '')) return;
      if (deviceId && s.device_id === deviceId) return;
      if (s.active === false || s.revoked_at) return;
      _chiudi(s, motivo, adesso); n++;
    });
    if (!n) return { ok: true, revocate: 0 };
    _audit(db, {
      actor: c.attore || userId, action: deviceId ? 'device.revoked_others' : 'device.revoked_all',
      target: deviceId || userId,
      metadata: { motivo: motivo || null, quante: n },
    });
    var w = scrivi(db);
    return w.ok ? { ok: true, revocate: n } : { ok: false, motivo: w.motivo };
  }

  function revocaTutte(userId, motivo, contesto) {
    return revocaAltre(userId, null, motivo || 'revoca totale', contesto);
  }

  /* ── Verifica e battito ───────────────────────────────────────────────── */

  /**
   * La domanda che fa la guardia: questo dispositivo è ancora il mio?
   * Un archivio illeggibile NON dice di sì: dice che non sa, e chi non sa
   * non apre.
   */
  function verifica(userId, deviceId, quando) {
    var dev = deviceId || corrente();
    var db = leggi();
    if (!db) return { ok: false, motivo: 'Archivio non leggibile', ignoto: true };
    var righe = (db.device_sessions || []).filter(function (s) {
      return s && String(s.user_id || '') === String(userId || '') && s.device_id === dev;
    });
    if (!righe.length) {
      /* Nessuna riga: o la policy non era attiva quando si è entrati, o è una
         sessione mai registrata. Non è una revoca, e non va raccontata come
         tale. */
      return { ok: true, registrato: false, motivo: null };
    }
    var viva = righe.filter(function (s) { return s.active !== false && !s.revoked_at; })[0];
    if (!viva) {
      var ultima = righe[righe.length - 1];
      return {
        ok: false, registrato: true, revocata: true,
        motivo: ultima.revoked_reason
          ? ('Questa sessione è stata chiusa: ' + ultima.revoked_reason)
          : 'Questa sessione è stata chiusa da un altro dispositivo',
      };
    }
    var ora = quando ? Date.parse(quando) : Date.now();
    if (_scaduta(viva, ora)) {
      return { ok: false, registrato: true, scaduta: true,
        motivo: 'Sessione scaduta per inattività' };
    }
    return { ok: true, registrato: true, sessione: viva, motivo: null };
  }

  /** Tiene viva la postazione. Scrive solo se è passato abbastanza tempo. */
  function battito(userId, deviceId) {
    var dev = deviceId || corrente();
    var db = leggi();
    if (!db) return { ok: false, motivo: 'Archivio non leggibile' };
    var s = (db.device_sessions || []).filter(function (x) {
      return x && x.device_id === dev && String(x.user_id || '') === String(userId || '')
        && x.active !== false && !x.revoked_at;
    })[0];
    if (!s) return { ok: false, motivo: 'sessione non trovata' };
    var ora = Date.now();
    var t = Date.parse(s.last_seen || s.created_at || '');
    /* Scrivere a ogni battito significherebbe scrivere di continuo su un
       archivio condiviso: si aggiorna solo quando l'informazione cambia. */
    if (isFinite(t) && (ora - t) < 60000) return { ok: true, saltato: true, sessione: s };
    s.last_seen = new Date(ora).toISOString();
    var w = scrivi(db);
    return w.ok ? { ok: true, sessione: s } : { ok: false, motivo: w.motivo };
  }

  global.InglyDispositivi = {
    VERSIONE: VERSIONE,
    CHIAVE_DB: CHIAVE_DB,
    CHIAVE_DISPOSITIVO: CHIAVE_DISPOSITIVO,
    LIMITE_PREDEFINITO: LIMITE_PREDEFINITO,
    MINUTI_INATTIVITA: MINUTI_INATTIVITA,
    corrente: corrente,
    etichetta: etichetta,
    creaSessione: creaSessione,
    attive: attive,
    tutte: tutte,
    limiteDi: limiteDi,
    registra: registra,
    subentra: subentra,
    revoca: revoca,
    revocaAltre: revocaAltre,
    revocaTutte: revocaTutte,
    verifica: verifica,
    battito: battito,
  };
})(typeof window !== 'undefined' ? window : globalThis);
