/* ═══════════════════════════════════════════════════════════════════════════
   IDENTITÀ — la password smette di stare in chiaro
   ═══════════════════════════════════════════════════════════════════════════

   Che cosa faceva la versione precedente, misurato:

     · `passwordHash: 'standalone'` — il campo si chiamava hash e conteneva la
       password. In chiaro, in `localStorage`, leggibile da chiunque apra la
       console;
     · `if (user.passwordHash !== password)` — confronto diretto, lato client;
     · un utente `owner / standalone` con `modules:['*']`, `plan:'enterprise'`,
       `status:'lifetime'` **riscritto a ogni avvio**;
     · la sessione portava `plan` e `modules` dentro di sé: modificare
       `localStorage` significava cambiare piano.

   Tre porte aperte, non una.

   ── Che cosa fa questo modulo ───────────────────────────────────────────

   PBKDF2-SHA256, 210 000 iterazioni, sale di 16 byte per utente, confronto a
   tempo costante. La verifica è asincrona perché la derivazione lo è, e
   perché una verifica di password che blocca il thread dell'interfaccia è un
   invito a misurarne la durata.

   ── Quello che questo modulo NON è ──────────────────────────────────────

   **Non è autenticazione sicura.** Un client non può autenticare sé stesso:
   chi controlla il browser controlla il confronto. Questo strato serve a due
   cose oneste:

     1. che l'archivio locale non contenga password leggibili;
     2. che il codice sia già nella forma giusta il giorno in cui Supabase Auth
        diventerà l'autorità — a quel punto `verifica()` chiama il server e il
        resto dell'applicazione non cambia.

   Il percorso locale resta per lo sviluppo e per l'uso offline, e lo dichiara:
   `modalita: 'locale'`. La release commerciale non deve avere credenziali
   scritte nel codice, e `SEED_SVILUPPO` esiste solo se qualcuno accende una
   bandiera esplicita.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';
  var ITERAZIONI = 210000;
  var ALGORITMO = 'PBKDF2-SHA256';
  var LUNGHEZZA_SALE = 16;
  var LUNGHEZZA_CHIAVE = 32;

  function _cripto() {
    var c = global.crypto || (typeof crypto !== 'undefined' ? crypto : null);
    return (c && c.subtle) ? c : null;
  }

  function _b64(buf) {
    var bytes = new Uint8Array(buf);
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return (global.btoa ? global.btoa(s) : Buffer.from(bytes).toString('base64'));
  }
  function _daB64(s) {
    var bin = global.atob ? global.atob(s) : Buffer.from(s, 'base64').toString('binary');
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function _deriva(password, sale, iterazioni) {
    var c = _cripto();
    if (!c) throw new Error('crypto.subtle non disponibile');
    var enc = new TextEncoder();
    var chiave = await c.subtle.importKey('raw', enc.encode(String(password)),
      { name: 'PBKDF2' }, false, ['deriveBits']);
    var bit = await c.subtle.deriveBits(
      { name: 'PBKDF2', salt: sale, iterations: iterazioni, hash: 'SHA-256' },
      chiave, LUNGHEZZA_CHIAVE * 8);
    return new Uint8Array(bit);
  }

  /** Confronto a tempo costante: uscire al primo byte diverso racconta quanto
      del segreto si è indovinato. */
  function _uguali(a, b) {
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }

  /**
   * @returns 'pbkdf2$<iterazioni>$<sale b64>$<chiave b64>'
   * Il formato porta con sé i propri parametri: il giorno in cui le iterazioni
   * saliranno, le password vecchie continueranno a verificarsi.
   */
  async function cifra(password, opzioni) {
    var o = opzioni || {};
    var c = _cripto();
    if (!c) throw new Error('crypto.subtle non disponibile');
    var iter = o.iterazioni || ITERAZIONI;
    var sale = o.sale ? _daB64(o.sale) : c.getRandomValues(new Uint8Array(LUNGHEZZA_SALE));
    var chiave = await _deriva(password, sale, iter);
    return 'pbkdf2$' + iter + '$' + _b64(sale) + '$' + _b64(chiave);
  }

  async function verifica(password, memorizzato) {
    var m = String(memorizzato || '');
    if (m.indexOf('pbkdf2$') !== 0) {
      /* Un valore che non è un hash è una password in chiaro rimasta da prima.
         Non la si accetta: accettarla terrebbe in vita esattamente il difetto
         che questo modulo chiude. Chi ha un account così deve reimpostare la
         password, e `daMigrare()` permette di dirglielo. */
      return { ok: false, motivo: 'formato non riconosciuto', daMigrare: true };
    }
    var parti = m.split('$');
    if (parti.length !== 4) return { ok: false, motivo: 'hash malformato' };
    var iter = parseInt(parti[1], 10) || ITERAZIONI;
    var sale = _daB64(parti[2]);
    var atteso = _daB64(parti[3]);
    var ottenuto = await _deriva(password, sale, iter);
    return { ok: _uguali(ottenuto, atteso), motivo: null,
      daAggiornare: iter < ITERAZIONI };
  }

  /** Un valore memorizzato è una password in chiaro? Serve all'audit, non al
      login. */
  function inChiaro(memorizzato) {
    var m = String(memorizzato || '');
    return m.length > 0 && m.indexOf('pbkdf2$') !== 0;
  }

  /* ── Robustezza della password ────────────────────────────────────────── */

  var COMUNI = ['password', 'password1', '12345678', 'qwertyui', 'inglyos1',
    'admin123', 'standalone', 'benvenuto', 'changeme'];

  /**
   * Otto caratteri è il minimo, non l'obiettivo. Il punteggio non blocca: i
   * criteri che bloccano sono dichiarati, così chi si iscrive sa che cosa
   * correggere invece di indovinare.
   */
  function robustezza(password) {
    var p = String(password || '');
    var problemi = [];
    if (p.length < 8) problemi.push('almeno 8 caratteri');
    if (!/[a-zA-Z]/.test(p)) problemi.push('almeno una lettera');
    if (!/[0-9]/.test(p)) problemi.push('almeno un numero');
    if (COMUNI.indexOf(p.toLowerCase()) >= 0) problemi.push('troppo comune');

    var punti = 0;
    if (p.length >= 8) punti++;
    if (p.length >= 12) punti++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) punti++;
    if (/[0-9]/.test(p)) punti++;
    if (/[^a-zA-Z0-9]/.test(p)) punti++;
    var livelli = ['molto debole', 'debole', 'accettabile', 'buona', 'forte', 'molto forte'];
    return {
      ok: problemi.length === 0,
      problemi: problemi,
      punteggio: punti,
      livello: livelli[Math.min(punti, 5)],
    };
  }

  /* ── Email ────────────────────────────────────────────────────────────── */

  function emailValida(v) {
    var e = String(v || '').trim();
    /* Deliberatamente permissiva: l'unico giudice vero di un indirizzo è il
       messaggio che arriva. Qui si escludono solo gli errori di battitura
       evidenti. */
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
  }
  function normalizzaEmail(v) { return String(v || '').trim().toLowerCase(); }

  /* ── Sessione ─────────────────────────────────────────────────────────── */

  var DURATA_SESSIONE = 12 * 3600 * 1000;
  var DURATA_RICORDAMI = 30 * 86400 * 1000;

  /**
   * La sessione porta **chi sei**, non **che cosa puoi fare**.
   * Nella versione precedente conteneva `plan` e `modules`: modificarla in
   * `localStorage` era un cambio di piano gratuito. I diritti si calcolano
   * ogni volta dall'abbonamento — vedi `InglyEntitlements`.
   */
  function creaSessione(utente, opzioni) {
    var o = opzioni || {};
    var adesso = o.adesso ? Date.parse(o.adesso) : Date.now();
    var durata = o.ricordami ? DURATA_RICORDAMI : DURATA_SESSIONE;
    return {
      user_id: utente && (utente.id || utente.user_id),
      email: normalizzaEmail(utente && utente.email),
      nome: (utente && utente.nome) || null,
      tenant_id: (utente && utente.tenant_id) || o.tenant_id || null,
      ruolo: (utente && utente.ruolo) || 'owner',
      emessa: new Date(adesso).toISOString(),
      scade: new Date(adesso + durata).toISOString(),
      modalita: o.modalita || 'locale',
      /* Nessun `plan`. Nessun `modules`. Nessun `expiresAt` di licenza. */
    };
  }

  function sessioneValida(s, quando) {
    var ora = quando ? Date.parse(quando) : Date.now();
    if (!s || !s.user_id) return { ok: false, motivo: 'sessione assente' };
    if (!s.tenant_id) return { ok: false, motivo: 'sessione senza workspace' };
    var scade = Date.parse(String(s.scade || ''));
    if (!isFinite(scade)) return { ok: false, motivo: 'sessione senza scadenza' };
    if (ora >= scade) return { ok: false, motivo: 'sessione scaduta', scaduta: true };
    /* Una sessione che porta diritti è una sessione manomessa o vecchia: in
       entrambi i casi non la si usa. */
    if ('plan' in s || 'modules' in s || 'entitlements' in s) {
      return { ok: false, motivo: 'sessione non valida: contiene diritti di accesso',
        manomessa: true };
    }
    return { ok: true, motivo: null, scadeFra: scade - ora };
  }

  /* ── Accessor canonici (SEC-009) ─────────────────────────────────────────
     Il difetto ricorrente non era in un punto solo: era ogni modulo che
     rileggeva la sessione con un nome di campo suo — `s.userId`, `s.id`,
     `session.username` — nessuno dei quali la sessione ha mai avuto
     (`creaSessione` sopra dichiara la forma vera). Force logout, i comandi
     dell'amministratore, il canale realtime e il polling di ripiego erano
     rotti allo stesso modo, in punti diversi del codice. Questi accessor
     non aggiungono niente alla sessione: dicono, in un solo posto, come si
     legge quello che c'è già. */
  function idUtente(s) { return (s && s.user_id) || null; }
  function emailSessione(s) { return (s && s.email) || null; }
  function tenantId(s) { return (s && s.tenant_id) || null; }
  function deviceId(s) { return (s && s.device_id) || null; }

  /* ── Stati dell'account ───────────────────────────────────────────────── */

  var STATI_ACCOUNT = ['active', 'pending_verification', 'suspended', 'banned', 'deleted'];

  function statoAccount(utente) {
    var s = String((utente && utente.status) || 'active');
    if (STATI_ACCOUNT.indexOf(s) < 0) s = 'active';
    var messaggi = {
      active: null,
      pending_verification: 'Conferma l\'indirizzo email per continuare.',
      suspended: 'Questo account è sospeso. Contatta l\'assistenza.',
      banned: 'Questo account non è più abilitato.',
      deleted: 'Questo account non esiste più.',
    };
    return {
      stato: s,
      puoAccedere: s === 'active',
      messaggio: messaggi[s],
    };
  }

  global.InglyIdentita = {
    VERSIONE: VERSIONE,
    ALGORITMO: ALGORITMO,
    ITERAZIONI: ITERAZIONI,
    STATI_ACCOUNT: STATI_ACCOUNT,
    DURATA_SESSIONE: DURATA_SESSIONE,
    DURATA_RICORDAMI: DURATA_RICORDAMI,
    cifra: cifra,
    verifica: verifica,
    inChiaro: inChiaro,
    robustezza: robustezza,
    emailValida: emailValida,
    normalizzaEmail: normalizzaEmail,
    creaSessione: creaSessione,
    sessioneValida: sessioneValida,
    statoAccount: statoAccount,
    idUtente: idUtente,
    emailSessione: emailSessione,
    tenantId: tenantId,
    deviceId: deviceId,
  };
})(typeof window !== 'undefined' ? window : globalThis);
