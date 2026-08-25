/* ═══════════════════════════════════════════════════════════════════════════
   INGLY CLOUD ADMIN · CREDENZIALI
   ═══════════════════════════════════════════════════════════════════════════

   Cosa c'era prima, e perché non poteva restare.

   1. Due credenziali master scritte nel sorgente — `superadmin/admin` e
      `admin/admin` — sotto il commento «EMERGENCY BYPASS: accesso garantito».
      Chiunque aprisse il file entrava come Super Admin. Il controllo
      anti-brute-force stava cinque righe sopra e veniva scavalcato.
   2. Il campo si chiamava `passwordHash` ma conteneva la password in chiaro,
      e il confronto era `adm.passwordHash === p`.
   3. Il bypass riscriveva la password dell'admin esistente (`passwordHash =
      'admin'`), riattivava l'account e azzerava `mustChangePassword`: una
      password forte scelta dall'utente veniva silenziosamente degradata.

   Qui le password si verificano contro un hash PBKDF2-SHA256 con salt per
   utente, calcolato da `crypto.subtle` — disponibile in ogni browser che
   questo pannello supporta, senza dipendenze.

   Formato del record:  pbkdf2$<iterazioni>$<salt base64>$<hash base64>

   Le password già salvate in chiaro continuano a funzionare al primo accesso e
   vengono riscritte come hash in quel momento: nessun utente resta chiuso
   fuori dalla propria console.

   ─── Limiti, dichiarati ───────────────────────────────────────────────────
   Questa è autenticazione lato client su un database locale. Protegge da un
   accesso occasionale alla stessa macchina, non da chi può modificare il file
   o leggere lo storage del browser. Una console amministrativa reale richiede
   verifica server-side. Vedi docs/SECURITY.md.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var ITERATIONS = 310000; // raccomandazione OWASP per PBKDF2-SHA256
  var KEY_BITS = 256;
  var PREFIX = 'pbkdf2$';

  var subtle = global.crypto && global.crypto.subtle;

  function toBase64(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function fromBase64(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }

  function derive(password, salt, iterations) {
    return subtle
      .importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
      .then(function (key) {
        return subtle.deriveBits(
          { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
          key,
          KEY_BITS,
        );
      })
      .then(function (bits) {
        return new Uint8Array(bits);
      });
  }

  /** Confronto a tempo costante: non deve rivelare quanti caratteri combaciano. */
  function equalBytes(a, b) {
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
    return diff === 0;
  }

  function isHashed(stored) {
    return typeof stored === 'string' && stored.indexOf(PREFIX) === 0;
  }

  /** @returns {Promise<string>} il record da salvare al posto della password. */
  function hash(password) {
    if (!subtle) return Promise.reject(new Error('crypto.subtle non disponibile'));
    var salt = global.crypto.getRandomValues(new Uint8Array(16));
    return derive(password, salt, ITERATIONS).then(function (bits) {
      return PREFIX + ITERATIONS + '$' + toBase64(salt) + '$' + toBase64(bits);
    });
  }

  /**
   * @returns {Promise<{ok: boolean, needsUpgrade: boolean}>}
   * `needsUpgrade` segnala una password ancora in chiaro: chi chiama deve
   * riscriverla come hash subito dopo l'accesso riuscito.
   */
  function verify(password, stored) {
    if (!stored) return Promise.resolve({ ok: false, needsUpgrade: false });

    if (!isHashed(stored)) {
      // Record storico in chiaro. Si accetta una volta e si migra.
      return Promise.resolve({ ok: stored === password, needsUpgrade: stored === password });
    }

    var parts = stored.split('$');
    if (parts.length !== 4) return Promise.resolve({ ok: false, needsUpgrade: false });
    var iterations = parseInt(parts[1], 10);
    var salt = fromBase64(parts[2]);
    var expected = fromBase64(parts[3]);
    if (!subtle) return Promise.resolve({ ok: false, needsUpgrade: false });

    return derive(password, salt, iterations)
      .then(function (bits) {
        return { ok: equalBytes(bits, expected), needsUpgrade: iterations < ITERATIONS };
      })
      .catch(function () {
        return { ok: false, needsUpgrade: false };
      });
  }

  /** Requisiti minimi, in un punto solo invece che ripetuti in ogni form. */
  function validate(password) {
    if (!password || password.length < 8) return 'La password deve avere almeno 8 caratteri';
    if (!/[0-9]/.test(password)) return 'Inserisci almeno un numero';
    if (!/[A-Z]/.test(password)) return 'Inserisci almeno una lettera maiuscola';
    if (!/[a-z]/.test(password)) return 'Inserisci almeno una lettera minuscola';
    return null;
  }

  global.InglyAdminAuth = {
    hash: hash,
    verify: verify,
    validate: validate,
    isHashed: isHashed,
    ITERATIONS: ITERATIONS,
  };
})(window);
