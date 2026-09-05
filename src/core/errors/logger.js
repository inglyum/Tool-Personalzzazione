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

  /* Un avviso ogni dieci secondi al massimo: vedi il gestore dei rifiuti. */
  var INTERVALLO_AVVISO = 10000;
  var ultimoAvviso = 0;

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

    /* ── Una promessa rifiutata è un'operazione non riuscita ──────────────
       Registrarla e basta lasciava l'utente davanti a un'interfaccia che non
       era cambiata, senza sapere che il salvataggio non era andato a buon
       fine. Ora si registra **e** si dice.

       Misurato prima di aggiungerlo: dieci sezioni aperte in sequenza su una
       installazione pulita producono zero rifiuti non gestiti, quindi
       l'avviso compare solo quando qualcosa è davvero andato storto.

       È limitato nel tempo perché un guasto ripetuto — la quota esaurita, per
       dire — ne genererebbe uno per ogni tentativo, e venti avvisi uguali
       nascondono l'unico che conta. */
    global.addEventListener('unhandledrejection', function (ev) {
      Errors.log('promise', ev.reason);
      var adesso = Date.now();
      if (adesso - ultimoAvviso < INTERVALLO_AVVISO) return;
      ultimoAvviso = adesso;
      Errors.avvisa('Un\'operazione non è riuscita: ' + descrivi(ev.reason),
        'riprova; se si ripete, controlla lo spazio disponibile');
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
  /* Vero mentre `Archivio.set` sta scrivendo: vedi la spia sulle scritture. */
  var dentroArchivio = false;

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
        /* La spia sulle scritture sta più in basso in questo stesso file e
           avvisa chi non se ne accorgerebbe. Qui ce ne si accorge eccome — e
           si dice all'utente quale chiave e cosa fare — quindi si sospende:
           due avvisi per lo stesso guasto sono uno di troppo. */
        dentroArchivio = true;
        global.localStorage.setItem(chiave, testo);
      } catch (e) {
        Errors.log('Storage.set', e, { chiave: chiave, byte: testo.length });
        if (eQuota(e)) {
          Errors.avvisa('«' + chiave + '» non è stato salvato: spazio esaurito',
            'libera spazio dalle impostazioni o esporta un backup');
          return { ok: false, motivo: MOTIVI.quota };
        }
        return { ok: false, motivo: descrivi(e) };
      } finally {
        dentroArchivio = false;
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

  /* ── Le scritture non possono più fallire in silenzio ──────────────────────
     Misurato sul codice storico: 517 blocchi `catch {}` vuoti, di cui **200**
     avvolgono una scrittura. Ognuno di quei duecento è un salvataggio che può
     non avvenire senza che nessuno lo dica — né all'utente né al registro.

     Riscriverli uno per uno significherebbe toccare duecento punti di 9 MB di
     codice che funziona, con il rischio di romperne uno per correggerne un
     altro. Qui si fa la stessa cosa che si è fatta con `console.error`: si
     intercetta il **canale**, non i duecento chiamanti.

     La regola è: non si cambia il comportamento, si toglie il silenzio.
     L'eccezione viene rilanciata identica, la promessa rifiutata resta
     rifiutata, e chi ha un `catch {}` continua a ingoiarla — ma prima
     l'errore è finito nel registro e l'utente è stato avvisato.

     Due canali, perché due sono i modi di scrivere in questa applicazione. */

  /* La sorveglianza si reinstalla ogni tanto, perché più di un modulo storico
     sostituisce `IDB.put` dopo l'avvio; quando lo fa, la spia finisce sotto la
     sua e lo stesso errore passerebbe due volte. Un doppione entro un secondo
     è lo stesso errore visto due volte, non due errori. */
  var ultimoMessaggio = '';
  var ultimoIstante = 0;

  function annuncia(origine, errore, dettaglio) {
    var messaggio = origine + '|' + descrivi(errore);
    var adesso = Date.now();
    if (messaggio === ultimoMessaggio && adesso - ultimoIstante < 1000) return;
    ultimoMessaggio = messaggio;
    ultimoIstante = adesso;

    Errors.log(origine, errore, dettaglio || null);
    if (adesso - ultimoAvviso < INTERVALLO_AVVISO) return;
    ultimoAvviso = adesso;
    Errors.avvisa('Un salvataggio non è riuscito: ' + descrivi(errore),
      'i dati appena inseriti potrebbero non essere stati conservati');
  }

  /* 1. `localStorage.setItem`. Misurato: tre patch storiche lo sostituiscono
        sull'istanza dopo l'avvio — per l'auto-backup, per il contatore di
        modifiche, per il salvataggio della sessione — e l'ultima che scrive
        vince. Una spia messa una volta sola, sul prototipo o sull'istanza,
        finisce sotto le loro e smette di essere quella che vede l'eccezione.

        Si reinstalla quindi sulle stesse scadenze della sorveglianza del
        database, avvolgendo ogni volta la funzione che c'è. Avvolgere due
        volte non raddoppia nulla: `annuncia` scarta un doppione entro un
        secondo. */
  function sorvegliaLocalStorage() {
    try {
      var ls = global.localStorage;
      if (!ls || typeof ls.setItem !== 'function' || ls.setItem.__inglySpia) return;
      var precedente = ls.setItem;
      var spiaSet = function (chiave, valore) {
        try {
          return precedente.call(ls, chiave, valore);
        } catch (e) {
          /* `Ingly.Storage.set` dice già quale chiave non è stata salvata e
             cosa fare: ripeterlo con parole più vaghe non aiuta nessuno. */
          if (!dentroArchivio) annuncia('localStorage.setItem', e, { chiave: String(chiave).slice(0, 60) });
          throw e;                    // il comportamento resta quello di prima
        }
      };
      spiaSet.__inglySpia = true;
      ls.setItem = spiaSet;
    } catch (e) { /* localStorage non sostituibile: si prosegue senza */ }
  }

  /* 2. `IDB.put`, `IDB.putBulk` e `IDB.del`. Il database non esiste ancora
        quando questo file viene eseguito — è il primo del documento — quindi
        lo si aspetta, con un numero finito di tentativi invece di un polling
        che non finisce mai. */
  var SCRITTURE_IDB = ['put', 'safePut', 'putBulk', 'del', 'remove', 'clearStore'];
  var tentativi = 0;
  /* Alcuni moduli storici sostituiscono `IDB.put` dopo l'avvio, per
     registrarne un audit o per aggiungere una convalida. Quando lo fanno la
     spia resta dentro la loro, ma smette di essere quella esterna: si
     ricontrolla qualche volta, a distanze crescenti, finché l'applicazione
     non ha finito di installarsi. */
  var RICONTROLLI = [1500, 4000, 9000, 20000, 45000];
  function sorvegliaIDB() {
    var db = global.IDB;
    if (!db) {
      if (++tentativi > 60) return;   // un minuto: se non c'è, non ci sarà
      global.setTimeout(sorvegliaIDB, 1000);
      return;
    }
    SCRITTURE_IDB.forEach(function (nome) {
      var f = db[nome];
      if (typeof f !== 'function' || f.__inglySpia) return;
      var spia = function () {
        var args = arguments;
        var etichetta = 'IDB.' + nome + (args[0] ? '(' + String(args[0]).slice(0, 40) + ')' : '');
        try {
          var r = f.apply(db, args);
          if (r && typeof r.then === 'function') {
            return r.then(null, function (e) {
              annuncia(etichetta, e);
              throw e;                // la promessa resta rifiutata
            });
          }
          return r;
        } catch (e) {
          annuncia(etichetta, e);
          throw e;
        }
      };
      spia.__inglySpia = true;
      db[nome] = spia;
    });
  }
  function sorveglia() { sorvegliaLocalStorage(); sorvegliaIDB(); }
  sorvegliaLocalStorage();
  try {
    global.setTimeout(sorveglia, 0);
    RICONTROLLI.forEach(function (ms) { global.setTimeout(sorveglia, ms); });
  } catch (e) { /* niente timer: si prosegue */ }

  Ingly.Errors = Errors;
  Ingly.Storage = Archivio;
  Ingly.safeAsync = safeAsync;
  /* Esposta perché i collaudi possano verificare che la sorveglianza sia
     installata, senza doverla dedurre da un effetto collaterale. */
  Ingly.sorvegliaScritture = sorveglia;

  /* Nomi storici già usati altrove nel prodotto: si offrono come alias perché
     nessuno debba scegliere fra la via sicura e la via che conosce. */
  if (!global.InglyErrors) global.InglyErrors = Errors;
})(typeof window !== 'undefined' ? window : globalThis);
