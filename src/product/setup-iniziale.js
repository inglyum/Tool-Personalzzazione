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
  function A() { return global.InglyAbbonamento; }
  function P() { return global.InglyPiani; }

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
    var i = I(); var a = A();
    if (!i) return { ok: false, motivo: 'modulo identità non disponibile' };

    var stato = serve();
    if (!stato.serve) return { ok: false, motivo: stato.motivo };

    var email = i.normalizzaEmail(d.email);
    if (!i.emailValida(email)) return { ok: false, motivo: 'Indirizzo email non valido', campo: 'email' };

    var forza = i.robustezza(d.password);
    if (!forza.ok) {
      return { ok: false, motivo: 'La password deve avere: ' + forza.problemi.join(', '),
        campo: 'password' };
    }
    if (d.conferma != null && d.password !== d.conferma) {
      return { ok: false, motivo: 'Le due password non coincidono', campo: 'conferma' };
    }

    var nomeLab = String(d.laboratorio || '').trim();
    if (!nomeLab) return { ok: false, motivo: 'Dai un nome al tuo laboratorio', campo: 'laboratorio' };

    var hash;
    try { hash = await i.cifra(d.password); }
    catch (e) { return { ok: false, motivo: 'Non è stato possibile proteggere la password: ' + (e && e.message) }; }

    var adesso = new Date().toISOString();
    var idUtente = 'usr_' + Date.now().toString(36);
    var idTenant = 'ws_' + Date.now().toString(36);

    /* Il proprietario dell'installazione non e' in prova. */
    var abbonamento = a
      ? Object.assign(a.creaAttivo(d.piano || 'business', 'yearly', { tenant_id: idTenant }), {
        provider: null, provider_subscription_id: null, note: 'installazione locale',
      })
      : null;

    var utente = {
      id: idUtente, user_id: idUtente,
      email: email,
      nome: String(d.nome || '').trim() || nomeLab,
      labName: nomeLab,
      status: 'active', active: true,
      tenant_id: idTenant,
      ruolo: 'owner',
      password_hash: hash,
      created_at: adesso,
      _proprietario: true,
    };

    var db = leggiDB() || {};
    db.users = [utente];
    db.tenants = [{ id: idTenant, nome: nomeLab, owner_id: idUtente, created_at: adesso }];
    db.subscriptions = abbonamento ? [abbonamento] : [];

    try { global.localStorage.setItem(CHIAVE_DB, JSON.stringify(db)); }
    catch (e) { return { ok: false, motivo: 'Non è stato possibile salvare: ' + (e && e.message) }; }

    return { ok: true, utente: utente, tenant: db.tenants[0], abbonamento: abbonamento };
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

  async function invia() {
    var err = document.getElementById('su-err');
    var btn = document.getElementById('su-submit');
    if (err) err.style.display = 'none';
    if (btn) { btn.disabled = true; btn.textContent = 'Creazione in corso…'; }

    var esito = await crea({
      laboratorio: _val('su-lab'),
      nome: _val('su-nome'),
      email: _val('su-email'),
      password: _val('su-pass'),
      conferma: _val('su-conf'),
    });

    if (!esito.ok) {
      if (btn) { btn.disabled = false; btn.textContent = 'Crea l’account e entra'; }
      if (err) { err.textContent = esito.motivo; err.style.display = 'block'; }
      var campo = esito.campo && document.getElementById('su-' + (
        esito.campo === 'laboratorio' ? 'lab' : esito.campo === 'conferma' ? 'conf' : esito.campo));
      if (campo) { campo.setAttribute('aria-invalid', 'true'); campo.focus(); }
      return esito;
    }

    /* Account creato: si entra subito, passando dal percorso di accesso
       normale — cosi' la sessione nasce come tutte le altre. */
    var G = global.SaaSGate;
    if (G && typeof G.showLogin === 'function') {
      G.showLogin();
      var u = document.getElementById('gate-user');
      var p = document.getElementById('gate-pass');
      if (u) u.value = esito.utente.email;
      if (p) p.value = _val('su-pass');
      if (typeof G.login === 'function') await G.login();
    }
    return esito;
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
