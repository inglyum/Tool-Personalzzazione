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
  function C() { return global.InglyAccount; }
  function D() { return global.InglyDispositivi; }

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

    /* Come si costruisce un account lo sa `InglyAccount`, e lo sa in un posto
       solo. Qui restano i permessi, l'isolamento del workspace e il limite del
       piano: le domande che solo l'amministrazione puo' porsi. */
    var C_ = C();
    if (!C_) return { ok: false, motivo: 'modulo account non disponibile' };
    var esito = await C_.crea({
      nome: d.nome, laboratorio: d.nome || email, email: email,
      password: d.password, conferma: d.password, termini: true,
    }, {
      ruolo: ruolo, tenant_id: s.tenant_id, dispositivo: false,
      attore: s.user_id || null, richiediTermini: false,
    });
    if (!esito.ok) return esito;
    return { ok: true, utente: esito.utente };
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
    /* Il cambio di stato lo esegue `InglyAccount`: e' lui a sapere che una
       sospensione chiude anche le postazioni aperte e va scritta in audit.
       Ripeterlo qui voleva dire avere due sospensioni diverse. */
    var C_ = C();
    if (!C_) return { ok: false, motivo: 'modulo account non disponibile' };
    return C_.cambiaStato(userId, stato, { actor: s.user_id || null, motivo: c.motivo || null });
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
    var C_ = C();
    if (!C_) return { ok: false, motivo: 'modulo account non disponibile' };
    /* Reimpostare una password chiude le sessioni aperte: e' il motivo per cui
       la si reimposta. Chi lo sa e' `InglyAccount`. */
    return C_.reimpostaPassword(userId, password, { actor: s.user_id || null });
  }

  /* ── Postazioni e attività ────────────────────────────────────────────── */

  /** Le postazioni aperte dalle persone di questo workspace. */
  function postazioni(tenantId) {
    var d = D();
    if (!d) return [];
    var miei = utenti(tenantId).map(function (u) { return String(u.id); });
    return d.tutte(null).filter(function (x) {
      return miei.indexOf(String(x.user_id || '')) >= 0;
    });
  }

  /** Che cosa è successo in questo workspace, dal più recente. */
  function attivita(tenantId, quante) {
    var c = C();
    if (!c) return [];
    return c.audit({ tenant_id: tenantId }).slice().reverse().slice(0, quante || 12);
  }

  var ETICHETTE_AZIONE = {
    'account.created': 'Account creato',
    'account.status_changed': 'Stato dell\u2019account cambiato',
    'account.password_changed': 'Password cambiata',
    'account.password_reset': 'Password reimpostata',
    'device.registered': 'Nuova postazione',
    'device.revoked': 'Postazione chiusa',
    'device.revoked_others': 'Subentro da un altro dispositivo',
    'device.revoked_all': 'Postazioni chiuse',
  };

  function _quando(iso) {
    var t = Date.parse(String(iso || ''));
    if (!isFinite(t)) return '—';
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'ora';
    if (m < 60) return m + ' min fa';
    var h = Math.round(m / 60);
    if (h < 24) return h + (h === 1 ? ' ora fa' : ' ore fa');
    var g = Math.round(h / 24);
    return g + (g === 1 ? ' giorno fa' : ' giorni fa');
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
        + '<td style="padding:10px 12px;text-align:right;white-space:nowrap">'
        + '<input id="ad-pwd-' + esc(u.id) + '" type="password" autocomplete="new-password" '
        + 'placeholder="Nuova password" aria-label="Nuova password per ' + esc(u.email) + '" '
        + 'style="width:150px;height:32px;background:var(--bg-card2,#1c2331);color:var(--text,#f3f4f6);'
        + 'border:1px solid var(--border,#374151);border-radius:8px;padding:0 9px;font-size:13px">'
        + ' <button class="ly-btn ghost" style="height:32px;padding:0 12px;font-size:13px" '
        + 'onclick="InglyAmministrazione.azionePassword(\'' + esc(u.id) + '\')">Reimposta</button>'
        + (u.ruolo === 'owner' || io ? ''
          : ' <button class="ly-btn ghost" style="height:32px;padding:0 12px;font-size:13px" '
            + 'onclick="InglyAmministrazione.azioneStato(\'' + esc(u.id) + '\',\''
            + (sospeso ? 'active' : 'suspended') + '\')">'
            + (sospeso ? 'Riattiva' : 'Sospendi') + '</button>')
        + '</td></tr>';
    }).join('');

    var nomeDi = function (id) {
      var u = elenco.filter(function (x) { return String(x.id) === String(id); })[0];
      return u ? (u.nome || u.email) : (id ? String(id) : '—');
    };

    var righePostazioni = postazioni(s.tenant_id).slice().reverse().slice(0, 20).map(function (d) {
      var viva = d.active !== false && !d.revoked_at;
      return '<tr' + (viva ? '' : ' style="opacity:.55"') + '>'
        + '<td style="padding:10px 12px">' + esc(nomeDi(d.user_id)) + '</td>'
        + '<td style="padding:10px 12px">' + esc(d.etichetta || d.device_id)
        + (d.corrente ? ' <small style="color:var(--text-muted,#9ca3af)">· questo</small>' : '') + '</td>'
        + '<td style="padding:10px 12px;font-size:13px;color:var(--text-muted,#9ca3af)">'
        + esc(_quando(d.last_seen)) + '</td>'
        + '<td style="padding:10px 12px;font-size:13px;color:'
        + (viva ? 'var(--green,#22c55e)' : 'var(--text-muted,#9ca3af)') + '">'
        + (viva ? 'Aperta' : 'Chiusa') + '</td>'
        + '<td style="padding:10px 12px;text-align:right">'
        + (viva ? '<button class="ly-btn ghost" style="height:32px;padding:0 12px;font-size:13px" '
          + 'onclick="InglyAmministrazione.azioneRevoca(\'' + esc(d.device_id) + '\')">Chiudi</button>' : '')
        + '</td></tr>';
    }).join('');

    var righeAttivita = attivita(s.tenant_id, 15).map(function (v) {
      return '<tr>'
        + '<td style="padding:10px 12px;font-size:13px;color:var(--text-muted,#9ca3af);white-space:nowrap">'
        + esc(_quando(v.at)) + '</td>'
        + '<td style="padding:10px 12px">' + esc(ETICHETTE_AZIONE[v.action] || v.action) + '</td>'
        + '<td style="padding:10px 12px;font-size:13px;color:var(--text-muted,#9ca3af)">'
        + esc(nomeDi(v.target)) + '</td></tr>';
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

      + '<h3 style="font:700 15px var(--font-sans,system-ui);color:var(--text,#f3f4f6);margin:26px 0 12px">Postazioni aperte</h3>'
      + '<p style="font:400 13px/1.6 var(--font-sans,system-ui);color:var(--text-muted,#9ca3af);margin:0 0 12px">'
      + 'Un abbonamento, una postazione per persona. Chiudere una postazione riporta '
      + 'quel dispositivo alla schermata di accesso.</p>'
      + '<div style="overflow-x:auto;border:1px solid var(--border,#374151);border-radius:14px;margin-bottom:24px">'
      + '<table style="width:100%;border-collapse:collapse;font-size:14px">'
      + '<thead><tr style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;'
      + 'color:var(--text-muted,#6b7280);text-align:left">'
      + '<th style="padding:10px 12px">Persona</th><th style="padding:10px 12px">Dispositivo</th>'
      + '<th style="padding:10px 12px">Vista</th><th style="padding:10px 12px">Stato</th><th></th></tr></thead>'
      + '<tbody>' + (righePostazioni || '<tr><td colspan="5" style="padding:16px;'
        + 'color:var(--text-muted,#9ca3af)">Nessuna postazione registrata.</td></tr>')
      + '</tbody></table></div>'

      + '<h3 style="font:700 15px var(--font-sans,system-ui);color:var(--text,#f3f4f6);margin:0 0 12px">Attività recente</h3>'
      + '<div style="overflow-x:auto;border:1px solid var(--border,#374151);border-radius:14px;margin-bottom:24px">'
      + '<table style="width:100%;border-collapse:collapse;font-size:14px">'
      + '<thead><tr style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;'
      + 'color:var(--text-muted,#6b7280);text-align:left">'
      + '<th style="padding:10px 12px">Quando</th><th style="padding:10px 12px">Cosa</th>'
      + '<th style="padding:10px 12px">Su chi</th></tr></thead>'
      + '<tbody>' + (righeAttivita || '<tr><td colspan="3" style="padding:16px;'
        + 'color:var(--text-muted,#9ca3af)">Ancora niente da mostrare.</td></tr>')
      + '</tbody></table></div>'

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
  /**
   * Reimposta la password di una persona. La nuova password NON si mostra in
   * un avviso e non si scrive in archivio in chiaro: si consegna a voce, e
   * chi la riceve la cambia. Mostrarla in un toast vorrebbe dire lasciarla
   * sullo schermo di chiunque passi.
   */
  async function azionePassword(id) {
    var campo = document.getElementById('ad-pwd-' + id);
    var nuova = campo ? campo.value : '';
    if (!nuova) { _avvisa('Scrivi la nuova password', 'error'); if (campo) campo.focus(); return; }
    var e = await reimpostaPassword(id, nuova);
    if (campo) campo.value = '';
    _avvisa(e.ok ? 'Password reimpostata. Le sessioni aperte sono state chiuse.' : e.motivo,
      e.ok ? 'success' : 'error');
    if (e.ok) _ridisegna();
    return e;
  }

  /** Chiude una postazione aperta. Chi la usava torna alla schermata di accesso. */
  function azioneRevoca(deviceId) {
    var d = D();
    if (!d) { _avvisa('Modulo dispositivi non disponibile', 'error'); return; }
    var s = sessione();
    if (!s || !puoAmministrare(s.ruolo)) { _avvisa('Non hai i permessi', 'error'); return; }
    var e = d.revoca(deviceId, 'chiusa dall\u2019amministratore', { attore: s.user_id });
    _avvisa(e.ok ? 'Postazione chiusa' : e.motivo, e.ok ? 'success' : 'error');
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
    azionePassword: azionePassword,
    azioneRevoca: azioneRevoca,
    postazioni: postazioni,
    attivita: attivita,
  };
})(typeof window !== 'undefined' ? window : globalThis);
