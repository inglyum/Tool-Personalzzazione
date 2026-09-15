/* ═══════════════════════════════════════════════════════════════════════════
   AMMINISTRAZIONE — chi entra, con quale ruolo, e con quale abbonamento
   ═══════════════════════════════════════════════════════════════════════════

   Tre cose che chi possiede l'installazione deve poter fare senza aprire la
   console del browser: aggiungere una persona, cambiarle il ruolo, e vedere
   che cosa sta pagando il workspace.

   ── I ruoli non li inventa questo file ──────────────────────────────────

   Esistono già in `InglyDomain.auth`, con i loro permessi per risorsa e
   azione. Qui si usano, non se ne scrive una seconda serie: due tabelle di
   ruoli che dicono cose leggermente diverse sono il modo in cui qualcuno
   ottiene un permesso che nessuno gli ha dato.

   ── Chi può amministrare ────────────────────────────────────────────────

   Solo `owner` e `admin`. E il controllo non sta nel fatto che la voce di
   menu sia nascosta: `render()` rifiuta e lo dice. Nascondere un pulsante non
   è una misura di sicurezza — è una cortesia verso chi non ha bisogno di
   vederlo.

   ── Quello che questa schermata non fa ──────────────────────────────────

   Non cambia il piano dell'abbonamento. Il piano lo decide il pagamento, e
   una schermata che lo cambia con un clic è un abbonamento regalato. Qui si
   **vede**, e il cambio passa dal listino.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';
  var CHIAVE_DB = 'ingly_saas_db';

  function I() { return global.InglyIdentita; }
  function A() { return global.InglyAbbonamento; }
  function P() { return global.InglyPiani; }
  function L() { return global.InglyLancio; }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* I ruoli: etichetta e descrizione per l'interfaccia. I **permessi** li
     conosce `InglyDomain.auth`, che resta l'unica autorità. */
  var RUOLI = [
    { id: 'owner', label: 'Proprietario', desc: 'Tutto, compresa l’amministrazione e l’abbonamento.' },
    { id: 'admin', label: 'Amministratore', desc: 'Tutto, tranne la proprietà del workspace.' },
    { id: 'operator', label: 'Operatore', desc: 'Lavora su ordini, preventivi, clienti e produzione.' },
    { id: 'accountant', label: 'Contabile', desc: 'Fatture, pagamenti, incassi e report.' },
    { id: 'viewer', label: 'Sola lettura', desc: 'Vede, non modifica.' },
  ];

  function infoRuolo(id) {
    for (var i = 0; i < RUOLI.length; i++) if (RUOLI[i].id === id) return RUOLI[i];
    return RUOLI[4];
  }

  /** Chi amministra. Non basta che la voce di menu sia visibile. */
  function puoAmministrare(ruolo) {
    var r = String(ruolo || '');
    return r === 'owner' || r === 'admin';
  }

  /** I permessi veri, dal dominio che li possiede già. */
  function permessi(ruolo) {
    var D = global.InglyDomain;
    if (!D || !D.auth || typeof D.auth.permissionsOf !== 'function') return null;
    return D.auth.permissionsOf(String(ruolo || ''));
  }
  function puo(ruolo, risorsa, azione) {
    var D = global.InglyDomain;
    if (!D || !D.auth || typeof D.auth.can !== 'function') return false;
    return D.auth.can(String(ruolo || ''), risorsa, azione);
  }

  /* ── Archivio ─────────────────────────────────────────────────────────── */

  function leggiDB() {
    try {
      var d = JSON.parse(global.localStorage.getItem(CHIAVE_DB) || '{}');
      return (d && typeof d === 'object') ? d : null;
    } catch (e) { return null; }
  }
  function scriviDB(db) {
    try { global.localStorage.setItem(CHIAVE_DB, JSON.stringify(db)); return { ok: true }; }
    catch (e) { return { ok: false, motivo: String(e && e.message) }; }
  }

  function sessione() {
    try { return JSON.parse(global.sessionStorage.getItem('ingly_saas_session') || 'null'); }
    catch (e) { return null; }
  }

  /** Gli utenti del proprio workspace. Mai quelli di un altro. */
  function utenti(tenantId) {
    var db = leggiDB();
    if (!db) return [];
    return (db.users || []).filter(function (u) {
      return !tenantId || String(u.tenant_id || '') === String(tenantId);
    });
  }

  /* ── Operazioni ───────────────────────────────────────────────────────── */

  /**
   * Aggiunge una persona al workspace di chi la sta creando.
   * Il `tenant_id` **non si accetta come parametro**: si prende da chi è
   * connesso. Accettarlo vorrebbe dire permettere di creare un utente dentro
   * il workspace di qualcun altro.
   */
  async function creaUtente(dati, contesto) {
    var d = dati || {};
    var c = contesto || {};
    var s = c.sessione || sessione();
    var i = I();
    if (!i) return { ok: false, motivo: 'modulo identità non disponibile' };
    if (!s || !puoAmministrare(s.ruolo)) return { ok: false, motivo: 'Non hai i permessi per aggiungere utenti' };
    if (!s.tenant_id) return { ok: false, motivo: 'Sessione senza workspace' };

    var email = i.normalizzaEmail(d.email);
    if (!i.emailValida(email)) return { ok: false, motivo: 'Indirizzo email non valido', campo: 'email' };

    var ruolo = String(d.ruolo || 'operator');
    if (!RUOLI.some(function (r) { return r.id === ruolo; })) {
      return { ok: false, motivo: 'Ruolo sconosciuto: ' + ruolo, campo: 'ruolo' };
    }
    /* Un amministratore non crea un proprietario: il workspace ne ha uno. */
    if (ruolo === 'owner') return { ok: false, motivo: 'Il workspace ha già un proprietario', campo: 'ruolo' };

    var forza = i.robustezza(d.password);
    if (!forza.ok) return { ok: false, motivo: 'La password deve avere: ' + forza.problemi.join(', '), campo: 'password' };

    var db = leggiDB();
    if (!db) return { ok: false, motivo: 'Archivio non leggibile: non aggiungo utenti sopra dati illeggibili' };
    db.users = db.users || [];
    if (db.users.some(function (u) { return i.normalizzaEmail(u.email) === email; })) {
      return { ok: false, motivo: 'Esiste già un account con questa email', campo: 'email' };
    }

    /* Il limite di utenti del piano vale anche per chi amministra. */
    var E = global.InglyEntitlements;
    if (E) {
      var quanti = db.users.filter(function (u) { return String(u.tenant_id) === String(s.tenant_id); }).length;
      var lim = E.limit('users', { abbonamento: abbonamentoDi(s.tenant_id), utilizzo: { users: quanti } });
      if (!lim.illimitato && !lim.entro) {
        return { ok: false, motivo: 'Il piano attuale consente ' + lim.limite
          + (lim.limite === 1 ? ' utente' : ' utenti') + '. Passa a un piano superiore per aggiungerne altri.' };
      }
    }

    var hash;
    try { hash = await i.cifra(d.password); }
    catch (e) { return { ok: false, motivo: 'Non è stato possibile proteggere la password' }; }

    var id = 'usr_' + Date.now().toString(36);
    var nuovo = {
      id: id, user_id: id,
      email: email,
      nome: String(d.nome || '').trim() || email,
      status: 'active', active: true,
      tenant_id: s.tenant_id,
      ruolo: ruolo,
      password_hash: hash,
      created_at: new Date().toISOString(),
      created_by: s.user_id || null,
    };
    db.users.push(nuovo);
    var w = scriviDB(db);
    if (!w.ok) return { ok: false, motivo: 'Non è stato possibile salvare: ' + w.motivo };
    return { ok: true, utente: nuovo };
  }

  function abbonamentoDi(tenantId) {
    var db = leggiDB();
    if (!db) return null;
    return (db.subscriptions || []).filter(function (x) {
      return String(x.tenant_id || '') === String(tenantId || '');
    })[0] || null;
  }

  /** Cambia il ruolo di una persona del proprio workspace. */
  function cambiaRuolo(userId, ruolo, contesto) {
    var c = contesto || {};
    var s = c.sessione || sessione();
    if (!s || !puoAmministrare(s.ruolo)) return { ok: false, motivo: 'Non hai i permessi' };
    if (!RUOLI.some(function (r) { return r.id === ruolo; })) return { ok: false, motivo: 'Ruolo sconosciuto' };
    var db = leggiDB();
    if (!db) return { ok: false, motivo: 'Archivio non leggibile' };
    var u = (db.users || []).filter(function (x) { return String(x.id) === String(userId); })[0];
    if (!u) return { ok: false, motivo: 'Utente non trovato' };
    /* Isolamento: si tocca solo chi sta nel proprio workspace. */
    if (String(u.tenant_id || '') !== String(s.tenant_id || '')) {
      return { ok: false, motivo: 'Utente di un altro workspace' };
    }
    if (u.ruolo === 'owner') return { ok: false, motivo: 'Il ruolo del proprietario non si cambia da qui' };
    if (ruolo === 'owner') return { ok: false, motivo: 'Il workspace ha già un proprietario' };
    u.ruolo = ruolo;
    u.updated_at = new Date().toISOString();
    var w = scriviDB(db);
    return w.ok ? { ok: true, utente: u } : { ok: false, motivo: w.motivo };
  }

  /** Sospende o riattiva. Non cancella: un utente cancellato porta via il suo
      storico di chi ha fatto cosa. */
  function cambiaStato(userId, stato, contesto) {
    var c = contesto || {};
    var s = c.sessione || sessione();
    if (!s || !puoAmministrare(s.ruolo)) return { ok: false, motivo: 'Non hai i permessi' };
    var ammessi = ['active', 'suspended'];
    if (ammessi.indexOf(stato) < 0) return { ok: false, motivo: 'Stato non ammesso' };
    var db = leggiDB();
    if (!db) return { ok: false, motivo: 'Archivio non leggibile' };
    var u = (db.users || []).filter(function (x) { return String(x.id) === String(userId); })[0];
    if (!u) return { ok: false, motivo: 'Utente non trovato' };
    if (String(u.tenant_id || '') !== String(s.tenant_id || '')) {
      return { ok: false, motivo: 'Utente di un altro workspace' };
    }
    if (u.ruolo === 'owner') return { ok: false, motivo: 'Il proprietario non si può sospendere' };
    if (String(u.id) === String(s.user_id)) return { ok: false, motivo: 'Non puoi sospendere te stesso' };
    u.status = stato;
    u.active = stato === 'active';
    u.updated_at = new Date().toISOString();
    var w = scriviDB(db);
    return w.ok ? { ok: true, utente: u } : { ok: false, motivo: w.motivo };
  }

  /** Reimposta la password di una persona del workspace. */
  async function reimpostaPassword(userId, password, contesto) {
    var c = contesto || {};
    var s = c.sessione || sessione();
    var i = I();
    if (!i) return { ok: false, motivo: 'modulo identità non disponibile' };
    if (!s || !puoAmministrare(s.ruolo)) return { ok: false, motivo: 'Non hai i permessi' };
    var forza = i.robustezza(password);
    if (!forza.ok) return { ok: false, motivo: 'La password deve avere: ' + forza.problemi.join(', ') };
    var db = leggiDB();
    if (!db) return { ok: false, motivo: 'Archivio non leggibile' };
    var u = (db.users || []).filter(function (x) { return String(x.id) === String(userId); })[0];
    if (!u) return { ok: false, motivo: 'Utente non trovato' };
    if (String(u.tenant_id || '') !== String(s.tenant_id || '')) {
      return { ok: false, motivo: 'Utente di un altro workspace' };
    }
    u.password_hash = await i.cifra(password);
    u.updated_at = new Date().toISOString();
    var w = scriviDB(db);
    return w.ok ? { ok: true } : { ok: false, motivo: w.motivo };
  }

  /* ── La schermata ─────────────────────────────────────────────────────── */

  function render(host, contesto) {
    if (!host) return;
    var l = L(); if (l && l.stile) l.stile();
    var c = contesto || {};
    var s = c.sessione || sessione();

    if (!s) {
      host.innerHTML = '<div class="ly ly-wrap"><p class="ly-note" style="background:var(--red,#ef4444)1a;'
        + 'color:var(--red-300,#fca5a5)">Sessione non attiva.</p></div>';
      return;
    }
    /* Il controllo sta qui, non nella visibilità della voce di menu. */
    if (!puoAmministrare(s.ruolo)) {
      host.innerHTML = '<div class="ly ly-wrap"><div class="ly-lock">'
        + '<h3>Amministrazione</h3>'
        + '<p>Questa sezione è riservata al proprietario e agli amministratori del workspace. '
        + 'Il tuo ruolo è «' + esc(infoRuolo(s.ruolo).label) + '».</p></div></div>';
      return;
    }

    var elenco = utenti(s.tenant_id);
    var sub = abbonamentoDi(s.tenant_id);
    var a = A(); var p = P();
    var st = a ? a.stato(sub) : null;
    var piano = (st && st.accesso && p) ? p.piano(st.piano) : null;

    var E = global.InglyEntitlements;
    var limUtenti = E ? E.limit('users', { abbonamento: sub, utilizzo: { users: elenco.length } })
      : { limite: null, illimitato: true, entro: true };

    var righe = elenco.map(function (u) {
      var r = infoRuolo(u.ruolo);
      var sospeso = u.status === 'suspended';
      var io = String(u.id) === String(s.user_id);
      return '<tr' + (sospeso ? ' style="opacity:.55"' : '') + '>'
        + '<td style="padding:10px 12px">'
        + '<div style="font-weight:600;color:var(--text,#f3f4f6)">' + esc(u.nome || u.email) + '</div>'
        + '<div style="font-size:12px;color:var(--text-muted,#9ca3af)">' + esc(u.email) + '</div></td>'
        + '<td style="padding:10px 12px">'
        + (u.ruolo === 'owner' || io
          ? '<span style="font-size:13px">' + esc(r.label) + '</span>'
          : '<select aria-label="Ruolo di ' + esc(u.email) + '" '
            + 'onchange="InglyAmministrazione.azioneRuolo(\'' + esc(u.id) + '\',this.value)" '
            + 'style="background:var(--bg-card2,#1c2331);color:var(--text,#f3f4f6);'
            + 'border:1px solid var(--border,#374151);border-radius:8px;padding:5px 8px;font-size:13px">'
            + RUOLI.filter(function (x) { return x.id !== 'owner'; }).map(function (x) {
              return '<option value="' + x.id + '"' + (x.id === u.ruolo ? ' selected' : '') + '>'
                + esc(x.label) + '</option>';
            }).join('') + '</select>')
        + '</td>'
        + '<td style="padding:10px 12px;font-size:13px;color:'
        + (sospeso ? 'var(--amber-400,#fbbf24)' : 'var(--green,#22c55e)') + '">'
        + (sospeso ? 'Sospeso' : 'Attivo') + (io ? ' · tu' : '') + '</td>'
        + '<td style="padding:10px 12px;text-align:right">'
        + (u.ruolo === 'owner' || io ? ''
          : '<button class="ly-btn ghost" style="height:32px;padding:0 12px;font-size:13px" '
            + 'onclick="InglyAmministrazione.azioneStato(\'' + esc(u.id) + '\',\''
            + (sospeso ? 'active' : 'suspended') + '\')">'
            + (sospeso ? 'Riattiva' : 'Sospendi') + '</button>')
        + '</td></tr>';
    }).join('');

    host.innerHTML = '<div class="ly ly-wrap">'
      + '<dl class="ly-state">'
      + '<div class="ly-tile"><dt>Workspace</dt><dd style="font-size:15px">'
      + esc((leggiDB() && (leggiDB().tenants || []).filter(function (t) {
        return String(t.id) === String(s.tenant_id); })[0] || {}).nome || s.tenant_id) + '</dd></div>'
      + '<div class="ly-tile"><dt>Piano</dt><dd>' + esc(piano ? piano.nome : 'Nessuno') + '</dd>'
      + (st ? '<small style="color:' + esc(st.info.colore) + '">' + esc(st.info.label) + '</small>' : '')
      + '</div>'
      + '<div class="ly-tile"><dt>Persone</dt><dd>' + elenco.length
      + (limUtenti.illimitato ? '' : ' / ' + limUtenti.limite) + '</dd>'
      + (!limUtenti.illimitato && !limUtenti.entro
        ? '<small>Limite raggiunto</small>' : '') + '</div>'
      + '</dl>'

      + '<h3 style="font:700 15px var(--font-sans,system-ui);color:var(--text,#f3f4f6);margin:0 0 12px">Persone</h3>'
      + '<div style="overflow-x:auto;border:1px solid var(--border,#374151);border-radius:14px;margin-bottom:24px">'
      + '<table style="width:100%;border-collapse:collapse;font-size:14px">'
      + '<thead><tr style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;'
      + 'color:var(--text-muted,#6b7280);text-align:left">'
      + '<th style="padding:10px 12px">Persona</th><th style="padding:10px 12px">Ruolo</th>'
      + '<th style="padding:10px 12px">Stato</th><th></th></tr></thead>'
      + '<tbody>' + (righe || '<tr><td colspan="4" style="padding:16px;color:var(--text-muted,#9ca3af)">'
        + 'Nessuna persona oltre a te.</td></tr>') + '</tbody></table></div>'

      + '<h3 style="font:700 15px var(--font-sans,system-ui);color:var(--text,#f3f4f6);margin:0 0 12px">Aggiungi una persona</h3>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;max-width:820px">'
      + '<div class="ly-field"><label class="ly-label" for="ad-nome">Nome</label>'
      + '<div class="ly-inputwrap"><input id="ad-nome" type="text" placeholder="Nome e cognome"></div></div>'
      + '<div class="ly-field"><label class="ly-label" for="ad-email">Email</label>'
      + '<div class="ly-inputwrap"><input id="ad-email" type="email" inputmode="email" placeholder="nome@laboratorio.it"></div></div>'
      + '<div class="ly-field"><label class="ly-label" for="ad-pass">Password iniziale</label>'
      + '<div class="ly-inputwrap"><input id="ad-pass" type="password" autocomplete="new-password" placeholder="Almeno 8 caratteri"></div></div>'
      + '<div class="ly-field"><label class="ly-label" for="ad-ruolo">Ruolo</label>'
      + '<div class="ly-inputwrap"><select id="ad-ruolo" style="width:100%;height:46px;'
      + 'background:var(--bg-card,#151b26);color:var(--text,#f3f4f6);border:1px solid var(--border,#374151);'
      + 'border-radius:10px;padding:0 12px;font-size:15px">'
      + RUOLI.filter(function (x) { return x.id !== 'owner'; }).map(function (x) {
        return '<option value="' + x.id + '">' + esc(x.label) + '</option>';
      }).join('') + '</select></div></div>'
      + '</div>'
      + '<button class="ly-btn" style="margin-top:6px" onclick="InglyAmministrazione.azioneCrea()">Aggiungi</button>'
      + '<div class="ly-err" id="ad-err" role="alert" aria-live="polite"></div>'

      + '<h3 style="font:700 15px var(--font-sans,system-ui);color:var(--text,#f3f4f6);margin:26px 0 12px">Cosa può fare ogni ruolo</h3>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px">'
      + RUOLI.map(function (r) {
        var pm = permessi(r.id);
        return '<div class="ly-tile"><dt>' + esc(r.label) + '</dt>'
          + '<dd style="font-size:13px;font-weight:400;line-height:1.5;color:var(--text-muted,#9ca3af)">'
          + esc(r.desc) + '</dd>'
          + (pm ? '<small>' + (pm.indexOf('*') >= 0 ? 'accesso completo'
            : pm.length + ' permessi') + '</small>' : '') + '</div>';
      }).join('')
      + '</div></div>';
  }

  /* ── Azioni dell'interfaccia ──────────────────────────────────────────── */

  function _avvisa(msg, tipo) {
    if (typeof global.toast === 'function') global.toast(msg, tipo || 'info', 6000);
  }
  function _ridisegna() {
    var h = document.getElementById('view-amministrazione')
      || document.querySelector('[data-sezione="amministrazione"]');
    if (h) render(h);
  }

  async function azioneCrea() {
    var err = document.getElementById('ad-err');
    var v = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
    if (err) err.style.display = 'none';
    var e = await creaUtente({
      nome: v('ad-nome'), email: v('ad-email'),
      password: v('ad-pass'), ruolo: v('ad-ruolo'),
    });
    if (!e.ok) {
      if (err) { err.textContent = e.motivo; err.style.display = 'block'; }
      return e;
    }
    _avvisa('Persona aggiunta: ' + e.utente.email, 'success');
    _ridisegna();
    return e;
  }
  function azioneRuolo(id, ruolo) {
    var e = cambiaRuolo(id, ruolo);
    _avvisa(e.ok ? 'Ruolo aggiornato' : e.motivo, e.ok ? 'success' : 'error');
    _ridisegna();
    return e;
  }
  function azioneStato(id, stato) {
    var e = cambiaStato(id, stato);
    _avvisa(e.ok ? (stato === 'active' ? 'Utente riattivato' : 'Utente sospeso') : e.motivo,
      e.ok ? 'success' : 'error');
    _ridisegna();
    return e;
  }

  global.InglyAmministrazione = {
    VERSIONE: VERSIONE,
    RUOLI: RUOLI,
    infoRuolo: infoRuolo,
    puoAmministrare: puoAmministrare,
    permessi: permessi,
    puo: puo,
    utenti: utenti,
    abbonamentoDi: abbonamentoDi,
    creaUtente: creaUtente,
    cambiaRuolo: cambiaRuolo,
    cambiaStato: cambiaStato,
    reimpostaPassword: reimpostaPassword,
    render: render,
    azioneCrea: azioneCrea,
    azioneRuolo: azioneRuolo,
    azioneStato: azioneStato,
  };
})(typeof window !== 'undefined' ? window : globalThis);
