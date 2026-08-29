/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · REGISTRO DEGLI ERRORI E ARCHIVIAZIONE CHE NON MENTE
   ═══════════════════════════════════════════════════════════════════════════

   L'audit ha contato **532 blocchi `catch {}` vuoti in 126 file**. Non è
   trascuratezza: è una scorciatoia difensiva, presa per non far crollare la
   pagina su un dato imperfetto. Il costo però è preciso e grave: quando una
   scrittura fallisce, la funzione chiamante prosegue e l'interfaccia annuncia
   «salvato». Il laboratorio se ne accorge il giorno in cui cerca un ordine.

   Correggere 532 punti a mano non è la risposta — sono in 126 file e alcuni
   sono generati come stringhe. La risposta è dare a chi scrive codice una via
   che è **più comoda** di `catch{}` e che non può mentire:

     Ingly.Storage.set(chiave, valore)   → { ok: true } | { ok: false, motivo }

   Non lancia mai, quindi nessuno ha bisogno di avvolgerla in un try. E non
   restituisce mai `ok: true` se il dato non è stato scritto davvero — la
   verifica è una rilettura, non una speranza.

   Il registro è in memoria per costruzione. Un errore scritto in un archivio
   che potrebbe essere pieno è un errore che si perde proprio quando serve.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  if (global.Ingly && global.Ingly.Errors) return;   // idempotente: una sola installazione

  var Ingly = global.Ingly = global.Ingly || {};

  var TETTO = 200;          // quanti errori si conservano
  var registro = [];
  var dentro = false;       // sentinella anti-ricorsione su console.error

  function ora() { try { return new Date().toISOString(); } catch (e) { return ''; } }

  /** Riduce qualunque cosa sia stata lanciata a una descrizione leggibile. */
  function descrivi(e) {
    if (e == null) return 'errore senza dettaglio';
    if (typeof e === 'string') return e;
    if (e.message) return String(e.message);
    try { return JSON.stringify(e).slice(0, 300); } catch (x) { return String(e); }
  }

  var Errors = {
    /** Registra e restituisce la voce, così il chiamante può citarne l'id. */
    log: function (origine, errore, dettaglio) {
      var voce = {
        id: registro.length + 1,
        quando: ora(),
        origine: String(origine || 'sconosciuta'),
        messaggio: descrivi(errore),
        /* Lo stack si conserva per chi sviluppa, non si mostra mai all'utente. */
        stack: (errore && errore.stack) ? String(errore.stack).split('\n').slice(0, 6).join('\n') : '',
        dettaglio: dettaglio || null,
      };
      registro.push(voce);
      if (registro.length > TETTO) registro.splice(0, registro.length - TETTO);
      return voce;
    },

    elenco: function () { return registro.slice(); },
    conta: function () { return registro.length; },
    pulisci: function () { registro.length = 0; },

    /** Il registro come testo, per allegarlo a una segnalazione. */
    esporta: function () {
      return registro.map(function (v) {
        return v.quando + '  [' + v.origine + ']  ' + v.messaggio +
          (v.dettaglio ? '  ' + JSON.stringify(v.dettaglio) : '');
      }).join('\n');
    },

    /* ── Messaggio all'utente ───────────────────────────────────────────────
       Chiaro, breve, con l'azione suggerita. Mai lo stack: a chi lavora non
       serve sapere in quale funzione è successo, serve sapere cosa fare. */
    avvisa: function (messaggio, azione) {
      var testo = messaggio + (azione ? ' — ' + azione : '');
      try {
        if (typeof global.toast === 'function') { global.toast(testo, 'error', 6000); return; }
      } catch (e) { /* il toast storico non deve poter impedire l'avviso */ }
      try { console.error('[INGLY] ' + testo); } catch (e) { /* niente console: si tace */ }
    },
  };

  /* ── Gestione centrale ─────────────────────────────────────────────────────
     Si osserva, non si interferisce: `onerror` non restituisce true e il
     rifiuto non viene annullato, quindi il comportamento del browser resta
     quello di prima. L'unica differenza è che adesso qualcuno se ne accorge. */
  try {
    global.addEventListener('error', function (ev) {
      Errors.log('window.onerror', ev.error || ev.message, {
        file: ev.filename || '', riga: ev.lineno || 0,
      });
    });

    global.addEventListener('unhandledrejection', function (ev) {
      Errors.log('promise', ev.reason);
    });
  } catch (e) { /* ambiente senza window: il registro resta comunque usabile */ }

  /* `console.error` è il canale che il codice storico usa davvero: intercettarlo
     recupera 532 punti senza toccarne nessuno. La sentinella evita che un
     errore dentro il registro richiami il registro. */
  try {
    var originale = console.error;
    console.error = function () {
      if (!dentro) {
        dentro = true;
        try {
          Errors.log('console', Array.prototype.map.call(arguments, descrivi).join(' '));
        } catch (e) { /* il registro non deve poter rompere la console */ }
        dentro = false;
      }
      return originale.apply(console, arguments);
    };
  } catch (e) { /* console non sostituibile: si prosegue senza */ }

  /* ── Archiviazione che non mente ───────────────────────────────────────────
     Tre garanzie: non lancia mai, dice sempre la verità sull'esito, e quando
     l'esito è negativo lo registra e lo spiega. */
  var MOTIVI = {
    quota: 'spazio esaurito',
    assente: 'archiviazione non disponibile',
    serializzazione: 'dato non convertibile',
    verifica: 'scritto ma non rileggibile',
  };

  function eQuota(e) {
    if (!e) return false;
    return e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22 || e.code === 1014;
  }

  var Archivio = {
    disponibile: function () {
      try { return !!global.localStorage; } catch (e) { return false; }
    },

    /**
     * Scrive e **verifica rileggendo**. Un `setItem` che non lancia non
     * dimostra che il dato ci sia: in navigazione privata alcuni browser
     * accettano la scrittura e non conservano nulla.
     */
    set: function (chiave, valore) {
      if (!Archivio.disponibile()) {
        Errors.log('Storage.set', 'localStorage assente', { chiave: chiave });
        return { ok: false, motivo: MOTIVI.assente };
      }
      var testo;
      try {
        testo = typeof valore === 'string' ? valore : JSON.stringify(valore);
      } catch (e) {
        Errors.log('Storage.set', e, { chiave: chiave });
        return { ok: false, motivo: MOTIVI.serializzazione };
      }
      try {
        global.localStorage.setItem(chiave, testo);
      } catch (e) {
        Errors.log('Storage.set', e, { chiave: chiave, byte: testo.length });
        if (eQuota(e)) {
          Errors.avvisa('«' + chiave + '» non è stato salvato: spazio esaurito',
            'libera spazio dalle impostazioni o esporta un backup');
          return { ok: false, motivo: MOTIVI.quota };
        }
        return { ok: false, motivo: descrivi(e) };
      }
      var riletto;
      try { riletto = global.localStorage.getItem(chiave); } catch (e) { riletto = null; }
      if (riletto !== testo) {
        Errors.log('Storage.set', 'verifica fallita', { chiave: chiave });
        return { ok: false, motivo: MOTIVI.verifica };
      }
      return { ok: true };
    },

    /** Restituisce il valore, o `def` — senza mai lanciare e senza tacere. */
    get: function (chiave, def) {
      if (!Archivio.disponibile()) return def;
      var grezzo;
      try { grezzo = global.localStorage.getItem(chiave); } catch (e) {
        Errors.log('Storage.get', e, { chiave: chiave });
        return def;
      }
      if (grezzo == null) return def;
      try { return JSON.parse(grezzo); } catch (e) {
        /* Non è un errore: molte chiavi storiche contengono testo semplice. */
        return grezzo;
      }
    },

    remove: function (chiave) {
      try { global.localStorage.removeItem(chiave); return { ok: true }; }
      catch (e) { Errors.log('Storage.remove', e, { chiave: chiave }); return { ok: false, motivo: descrivi(e) }; }
    },
  };

  /**
   * Avvolge una funzione asincrona perché un rifiuto non resti muto.
   * Restituisce sempre `{ ok, valore | motivo }`: chi chiama non ha bisogno
   * di un try, quindi non ha la tentazione di scriverne uno vuoto.
   */
  function safeAsync(origine, fn) {
    return function () {
      var args = arguments;
      try {
        return Promise.resolve(fn.apply(this, args))
          .then(function (v) { return { ok: true, valore: v }; })
          .catch(function (e) {
            Errors.log(origine, e);
            return { ok: false, motivo: descrivi(e) };
          });
      } catch (e) {
        Errors.log(origine, e);
        return Promise.resolve({ ok: false, motivo: descrivi(e) });
      }
    };
  }

  Ingly.Errors = Errors;
  Ingly.Storage = Archivio;
  Ingly.safeAsync = safeAsync;

  /* Nomi storici già usati altrove nel prodotto: si offrono come alias perché
     nessuno debba scegliere fra la via sicura e la via che conosce. */
  if (!global.InglyErrors) global.InglyErrors = Errors;
})(typeof window !== 'undefined' ? window : globalThis);
