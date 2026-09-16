/* ═══════════════════════════════════════════════════════════════════════════
   PRIMO AVVIO — l'account non si regala, si crea
   ═══════════════════════════════════════════════════════════════════════════

   Tolta la credenziale scritta nel codice, resta una domanda pratica: come
   entra la prima volta chi ha appena installato il prodotto?

   La risposta che danno i prodotti seri, e che qui si adotta: **se l'archivio
   non ha nessun utente, la schermata non chiede di accedere — chiede di
   creare l'account amministratore.** La password la sceglie chi installa, e
   non esiste da nessuna parte prima di quel momento.

   È l'opposto della porta di servizio: là la password era la stessa per tutti
   e nota a chiunque leggesse il file; qui non esiste finché qualcuno non la
   scrive, e vale solo per quella installazione.

   ── Perché non è una prova di 14 giorni ─────────────────────────────────

   Chi apre l'applicazione la prima volta su una copia propria non è un
   cliente in prova: è il proprietario dell'installazione. Riceve un
   abbonamento completo e il ruolo `owner`. La prova di 14 giorni resta il
   percorso di chi si registra per valutare il prodotto — sono due storie
   diverse e confonderle significherebbe far scadere il laboratorio di chi
   l'applicazione ce l'ha già.

   ── Una sola volta ──────────────────────────────────────────────────────

   La schermata compare **solo** con l'archivio vuoto. Appena esiste un
   utente, non si ripresenta: altrimenti sarebbe la porta di servizio di
   prima, con un passaggio in più.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';
  var CHIAVE_DB = 'ingly_saas_db';

  function I() { return global.InglyIdentita; }

  function leggiDB() {
    try {
      var g = global.localStorage && global.localStorage.getItem(CHIAVE_DB);
      var d = g ? JSON.parse(g) : {};
      return (d && typeof d === 'object') ? d : null;
    } catch (e) {
      /* Un archivio illeggibile non e' un archivio vuoto: sovrascriverlo
         cancellerebbe utenti che forse ci sono. */
      return null;
    }
  }

  /**
   * @returns { serve, motivo, utenti }
   * `serve` e' vero solo con un archivio leggibile e senza utenti.
   */
  function serve() {
    var db = leggiDB();
    if (db === null) {
      return { serve: false, utenti: null,
        motivo: 'archivio non leggibile: non si crea un account sopra dati esistenti' };
    }
    var utenti = Array.isArray(db.users) ? db.users : [];
    if (utenti.length) return { serve: false, utenti: utenti.length, motivo: 'esiste già un account' };
    return { serve: true, utenti: 0, motivo: null };
  }

  /**
   * Crea il proprietario dell'installazione: utente, workspace, abbonamento.
   * Non tocca niente se un utente esiste gia'.
   */
  async function crea(dati) {
    var d = dati || {};
    var C = global.InglyAccount;
    if (!C) return { ok: false, motivo: 'modulo account non disponibile' };

    /* L'unicità la ricontrolla `InglyAccount.crea`, ma qui serve la regola
       in più: questa schermata vale solo sull'archivio vuoto. */
    var stato = serve();
    if (!stato.serve) return { ok: false, motivo: stato.motivo };

    /* Il proprietario dell'installazione non è in prova: abbonamento pieno,
       ruolo `owner`. La prova di 14 giorni è il percorso di chi si registra
       per valutare il prodotto — sono due storie diverse. */
    return C.crea({
      nome: String(d.nome || '').trim() || String(d.laboratorio || '').trim(),
      laboratorio: d.laboratorio,
      email: d.email,
      password: d.password,
      conferma: d.conferma,
      termini: true,
    }, {
      ruolo: 'owner',
      prova: false,
      piano: d.piano || 'business',
      intervallo: 'yearly',
      richiediTermini: false,
      proprietario: true,
    });
  }

  /* ── La schermata ─────────────────────────────────────────────────────── */

  function markup() {
    var L = global.InglyLancio;
    var S = (L && L.SEGNI) || { occhio: '', spunta: '' };
    return '<h2 class="ly-h1">Benvenuto in INGLY OS</h2>'
      + '<p class="ly-h2">Crea l’account amministratore di questa installazione. '
      + 'La password la scegli tu e non esiste da nessun’altra parte.</p>'
      + '<div class="ly-field"><label class="ly-label" for="su-lab">Nome del laboratorio</label>'
      + '<div class="ly-inputwrap"><input id="su-lab" type="text" autocomplete="organization" '
      + 'placeholder="Es. INGLY Design"></div></div>'
      + '<div class="ly-field"><label class="ly-label" for="su-nome">Il tuo nome</label>'
      + '<div class="ly-inputwrap"><input id="su-nome" type="text" autocomplete="name" '
      + 'placeholder="Come ti chiami"></div></div>'
      + '<div class="ly-field"><label class="ly-label" for="su-email">Email</label>'
      + '<div class="ly-inputwrap"><input id="su-email" type="email" autocomplete="username" '
      + 'inputmode="email" placeholder="nome@laboratorio.it"></div></div>'
      + '<div class="ly-field"><label class="ly-label" for="su-pass">Password</label>'
      + '<div class="ly-inputwrap"><input id="su-pass" type="password" autocomplete="new-password" '
      + 'placeholder="Almeno 8 caratteri, con un numero" '
      + 'oninput="InglyPrimoAvvio.forza(this.value)">'
      + '<button type="button" class="ly-reveal" aria-label="Mostra la password" '
      + 'onclick="InglyLancio.mostraPassword(this,\'su-pass\')">' + S.occhio + '</button></div>'
      + '<div id="su-forza" class="ly-price-note" aria-live="polite"></div></div>'
      + '<div class="ly-field"><label class="ly-label" for="su-conf">Conferma la password</label>'
      + '<div class="ly-inputwrap"><input id="su-conf" type="password" autocomplete="new-password" '
      + 'placeholder="Scrivila di nuovo" '
      + 'onkeydown="if(event.key===\'Enter\')InglyPrimoAvvio.invia()"></div></div>'
      + '<button class="ly-cta" id="su-submit" onclick="InglyPrimoAvvio.invia()">Crea l’account e entra</button>'
      + '<div class="ly-err" id="su-err" role="alert" aria-live="polite"></div>'
      + '<p class="ly-legal">Questa schermata compare una volta sola, finché non esiste un account. '
      + 'Da qui in poi si accede con email e password.</p>';
  }

  /** Sostituisce il contenuto della schermata di accesso, se serve. */
  function disegna() {
    if (typeof document === 'undefined') return false;
    if (!serve().serve) return false;
    var L = global.InglyLancio;
    if (L && L.stile) L.stile();
    var login = document.getElementById('gate-login');
    var reg = document.getElementById('gate-register');
    if (!login) return false;
    if (reg) reg.style.display = 'none';
    login.innerHTML = markup();
    login.style.display = 'block';
    var primo = document.getElementById('su-lab');
    if (primo) setTimeout(function () { primo.focus(); }, 80);
    return true;
  }

  function forza(v) {
    var el = document.getElementById('su-forza');
    var i = I();
    if (!el || !i) return;
    if (!v) { el.textContent = ''; return; }
    var r = i.robustezza(v);
    el.textContent = r.ok ? ('Password ' + r.livello) : ('Serve: ' + r.problemi.join(', '));
    el.style.color = r.ok ? 'var(--green,#22c55e)' : 'var(--text-muted,#9ca3af)';
  }

  function _val(id) {
    var e = document.getElementById(id);
    return e ? e.value : '';
  }

  var ETICHETTA = 'Crea l\u2019account e entra';

  /**
   * Il pulsante attraversa tre stati e **torna sempre** a uno stabile:
   * il `finally` è la riga che impedisce il blocco su «Creazione in corso…».
   */
  async function invia() {
    var err = document.getElementById('su-err');
    var btn = document.getElementById('su-submit');
    if (err) { err.textContent = ''; err.style.display = 'none'; }
    /* Doppio clic: il secondo non fa niente. */
    if (btn && btn.disabled) return { ok: false, motivo: 'Creazione già in corso', inCorso: true };
    if (btn) { btn.disabled = true; btn.textContent = 'Creazione in corso…'; }

    ['su-lab', 'su-nome', 'su-email', 'su-pass', 'su-conf'].forEach(function (id) {
      var e = document.getElementById(id);
      if (e) e.removeAttribute('aria-invalid');
    });

    var esito;
    var entrato = false;
    try {
      esito = await crea({
        laboratorio: _val('su-lab'),
        nome: _val('su-nome'),
        email: _val('su-email'),
        password: _val('su-pass'),
        conferma: _val('su-conf'),
      });

      if (esito && esito.ok) {
        if (btn) btn.textContent = 'Account creato';
        /* La sessione esiste già: applicarla direttamente evita di tornare
           su un modulo di accesso che questa schermata ha sostituito. */
        var G = global.SaaSGate;
        if (G && typeof G.avviaSessione === 'function') {
          var a = G.avviaSessione(esito.sessione);
          entrato = !!(a && a.ok);
        }
        if (!entrato) {
          /* Nessuna scorciatoia silenziosa: l'account c'è, lo si dice. */
          esito.entrato = false;
          if (err) {
            err.textContent = 'Account creato. Ricarica la pagina per entrare.';
            err.style.display = 'block';
          }
        } else {
          esito.entrato = true;
        }
        return esito;
      }

      if (err) { err.textContent = (esito && esito.motivo) || 'Creazione non riuscita'; err.style.display = 'block'; }
      var campo = esito && esito.campo && document.getElementById('su-' + (
        esito.campo === 'laboratorio' ? 'lab' : esito.campo === 'conferma' ? 'conf' : esito.campo));
      if (campo) { campo.setAttribute('aria-invalid', 'true'); campo.focus(); }
      return esito;
    } catch (e) {
      if (err) { err.textContent = 'Creazione non riuscita: ' + (e && e.message); err.style.display = 'block'; }
      return { ok: false, motivo: String(e && e.message) };
    } finally {
      /* Se si è entrati la schermata non esiste più; altrimenti il pulsante
         deve tornare utilizzabile, sempre, qualunque cosa sia successa. */
      if (btn && !entrato) { btn.disabled = false; btn.textContent = ETICHETTA; }
    }
  }

  global.InglyPrimoAvvio = {
    VERSIONE: VERSIONE,
    CHIAVE_DB: CHIAVE_DB,
    serve: serve,
    crea: crea,
    markup: markup,
    disegna: disegna,
    forza: forza,
    invia: invia,
  };
})(typeof window !== 'undefined' ? window : globalThis);
