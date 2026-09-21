/* ═══════════════════════════════════════════════════════════════════════════
   SICUREZZA — la password e le postazioni, viste da chi le possiede
   ═══════════════════════════════════════════════════════════════════════════

   Fino a ieri un utente non aveva nessun modo di cambiare la propria
   password: l'unica strada era chiederlo a un amministratore, che gliene
   assegnava una e gliela comunicava. È il contrario di quello che serve —
   una password che passa per le mani di qualcun altro non è più un segreto.

   Qui ci sono le tre cose che riguardano solo chi è connesso:

     · cambiare la propria password (serve quella attuale);
     · vedere da dove il proprio account è aperto, e chiudere una postazione;
     · vedere che cosa è successo al proprio account.

   ── Sul recupero password ───────────────────────────────────────────────

   Questa installazione non ha un servizio di posta. Dirlo apertamente è
   l'unica cosa onesta: una schermata «ti abbiamo inviato un'email» che non
   invia niente è peggio di nessuna schermata, perché fa aspettare. Chi ha
   perso la password la fa reimpostare dall'amministratore del workspace.
   Quando ci sarà un servizio di posta, il percorso a token sostituirà questa
   nota — e non prima.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  function C() { return global.InglyAccount; }
  function D() { return global.InglyDispositivi; }
  function I() { return global.InglyIdentita; }
  function L() { return global.InglyLancio; }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function sessione() {
    if (global.SaaSGate && global.SaaSGate._session) return global.SaaSGate._session;
    try { return JSON.parse(global.sessionStorage.getItem('ingly_saas_session') || 'null'); }
    catch (e) { return null; }
  }

  function quando(iso) {
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

  var ETICHETTE = {
    'account.created': 'Account creato',
    'account.status_changed': 'Stato dell’account cambiato',
    'account.password_changed': 'Password cambiata',
    'account.password_reset': 'Password reimpostata da un amministratore',
    'device.registered': 'Accesso da una nuova postazione',
    'device.revoked': 'Postazione chiusa',
    'device.revoked_others': 'Subentro da un altro dispositivo',
    'device.revoked_all': 'Tutte le postazioni chiuse',
  };

  /* ── La schermata ─────────────────────────────────────────────────────── */

  function render(host) {
    if (!host) return false;
    var l = L(); if (l && l.stile) l.stile();
    var s = sessione();
    if (!s) {
      host.innerHTML = '<div class="ly ly-wrap"><p class="ly-note" style="background:var(--red,#ef4444)1a;'
        + 'color:var(--red-300,#fca5a5)">Sessione non attiva.</p></div>';
      return true;
    }

    var d = D();
    var mie = d ? d.tutte(s.user_id).slice().reverse().slice(0, 12) : [];
    var righeDisp = mie.map(function (x) {
      var viva = x.active !== false && !x.revoked_at;
      return '<tr' + (viva ? '' : ' style="opacity:.55"') + '>'
        + '<td style="padding:10px 12px">' + esc(x.etichetta || x.device_id)
        + (x.corrente ? ' <small style="color:var(--text-muted,#9ca3af)">· stai usando questo</small>' : '')
        + '</td>'
        + '<td style="padding:10px 12px;font-size:13px;color:var(--text-muted,#9ca3af)">'
        + esc(quando(x.last_seen)) + '</td>'
        + '<td style="padding:10px 12px;font-size:13px;color:'
        + (viva ? 'var(--green,#22c55e)' : 'var(--text-muted,#9ca3af)') + '">'
        + (viva ? 'Aperta' : 'Chiusa') + '</td>'
        + '<td style="padding:10px 12px;text-align:right">'
        + (viva && !x.corrente
          ? '<button class="ly-btn ghost" style="height:32px;padding:0 12px;font-size:13px" '
            + 'onclick="InglySicurezza.chiudi(\'' + esc(x.device_id) + '\')">Chiudi</button>'
          : '')
        + '</td></tr>';
    }).join('');

    var c = C();
    var voci = c ? c.audit({ target: s.user_id }).slice().reverse().slice(0, 10) : [];
    var righeAudit = voci.map(function (v) {
      return '<tr><td style="padding:9px 12px;font-size:13px;color:var(--text-muted,#9ca3af);'
        + 'white-space:nowrap">' + esc(quando(v.at)) + '</td>'
        + '<td style="padding:9px 12px">' + esc(ETICHETTE[v.action] || v.action) + '</td></tr>';
    }).join('');

    host.innerHTML = '<div class="ly ly-wrap">'
      + '<h3 style="font:700 15px var(--font-sans,system-ui);color:var(--text,#f3f4f6);margin:0 0 6px">'
      + 'Cambia la tua password</h3>'
      + '<p style="font:400 13px/1.6 var(--font-sans,system-ui);color:var(--text-muted,#9ca3af);margin:0 0 14px">'
      + 'Serve quella attuale. Cambiandola chiudi le altre postazioni aperte: '
      + 'è il motivo per cui di solito si cambia una password.</p>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;max-width:760px">'
      + '<div class="ly-field"><label class="ly-label" for="sic-attuale">Password attuale</label>'
      + '<div class="ly-inputwrap"><input id="sic-attuale" type="password" autocomplete="current-password"></div></div>'
      + '<div class="ly-field"><label class="ly-label" for="sic-nuova">Nuova password</label>'
      + '<div class="ly-inputwrap"><input id="sic-nuova" type="password" autocomplete="new-password" '
      + 'oninput="InglySicurezza.forza(this.value)"></div>'
      + '<div id="sic-forza" class="ly-price-note" aria-live="polite"></div></div>'
      + '<div class="ly-field"><label class="ly-label" for="sic-conferma">Ripeti la nuova password</label>'
      + '<div class="ly-inputwrap"><input id="sic-conferma" type="password" autocomplete="new-password" '
      + 'onkeydown="if(event.key===\'Enter\')InglySicurezza.cambia()"></div></div>'
      + '</div>'
      + '<button class="ly-btn" id="sic-submit" style="margin-top:6px" '
      + 'onclick="InglySicurezza.cambia()">Cambia password</button>'
      + '<div class="ly-err" id="sic-err" role="alert" aria-live="polite"></div>'

      + '<h3 style="font:700 15px var(--font-sans,system-ui);color:var(--text,#f3f4f6);margin:28px 0 6px">'
      + 'Dove sei connesso</h3>'
      + '<p style="font:400 13px/1.6 var(--font-sans,system-ui);color:var(--text-muted,#9ca3af);margin:0 0 12px">'
      + 'Il tuo abbonamento vale per una postazione alla volta. Entrando da un altro '
      + 'dispositivo chiudi questa.</p>'
      + '<div style="overflow-x:auto;border:1px solid var(--border,#374151);border-radius:14px;margin-bottom:24px">'
      + '<table style="width:100%;border-collapse:collapse;font-size:14px">'
      + '<thead><tr style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;'
      + 'color:var(--text-muted,#6b7280);text-align:left">'
      + '<th style="padding:10px 12px">Dispositivo</th><th style="padding:10px 12px">Vista</th>'
      + '<th style="padding:10px 12px">Stato</th><th></th></tr></thead>'
      + '<tbody>' + (righeDisp || '<tr><td colspan="4" style="padding:16px;'
        + 'color:var(--text-muted,#9ca3af)">Nessuna postazione registrata.</td></tr>')
      + '</tbody></table></div>'

      + '<h3 style="font:700 15px var(--font-sans,system-ui);color:var(--text,#f3f4f6);margin:0 0 12px">'
      + 'Che cosa è successo al tuo account</h3>'
      + '<div style="overflow-x:auto;border:1px solid var(--border,#374151);border-radius:14px;margin-bottom:24px">'
      + '<table style="width:100%;border-collapse:collapse;font-size:14px"><tbody>'
      + (righeAudit || '<tr><td style="padding:16px;color:var(--text-muted,#9ca3af)">'
        + 'Ancora niente da mostrare.</td></tr>')
      + '</tbody></table></div>'

      + '<p class="ly-legal" style="text-align:left;max-width:620px">'
      + 'Password dimenticata: questa installazione non ha un servizio di posta, quindi '
      + 'non esiste un recupero via email — e una schermata che dicesse di averla inviata '
      + 'farebbe solo aspettare. Chiedi al proprietario del workspace di reimpostarla '
      + 'dalla sezione Amministrazione, poi cambiala da qui.'
      + '</p></div>';
    return true;
  }

  /* ── Azioni ───────────────────────────────────────────────────────────── */

  function _v(id) { var e = document.getElementById(id); return e ? e.value : ''; }
  function _avvisa(msg, tipo) {
    if (typeof global.toast === 'function') global.toast(msg, tipo || 'info', 6000);
  }
  function _errore(msg) {
    var e = document.getElementById('sic-err');
    if (e) { e.textContent = msg; e.style.display = msg ? 'block' : 'none'; }
  }
  function _ridisegna() {
    var h = document.getElementById('view-sicurezza')
      || document.querySelector('[data-sezione="sicurezza"]');
    if (h) render(h);
  }

  function forza(v) {
    var el = document.getElementById('sic-forza');
    var i = I();
    if (!el || !i) return;
    if (!v) { el.textContent = ''; return; }
    var r = i.robustezza(v);
    el.textContent = r.ok ? ('Password ' + r.livello) : ('Serve: ' + r.problemi.join(', '));
    el.style.color = r.ok ? 'var(--green,#22c55e)' : 'var(--text-muted,#9ca3af)';
  }

  /**
   * Il pulsante torna sempre a uno stato utilizzabile: il `finally` è la
   * differenza fra «non è andata» e «non si sa se sia andata».
   */
  async function cambia() {
    var btn = document.getElementById('sic-submit');
    var s = sessione();
    _errore('');
    if (!s) { _errore('Sessione non attiva'); return { ok: false }; }
    if (btn && btn.disabled) return { ok: false, inCorso: true };

    var attuale = _v('sic-attuale');
    var nuova = _v('sic-nuova');
    var conferma = _v('sic-conferma');
    if (!attuale || !nuova) { _errore('Compila tutti i campi'); return { ok: false }; }
    if (nuova !== conferma) { _errore('Le due password non coincidono'); return { ok: false }; }

    if (btn) { btn.disabled = true; btn.textContent = 'Cambio in corso…'; }
    try {
      var c = C();
      if (!c) { _errore('Servizio non disponibile'); return { ok: false }; }
      var d = D();
      var e = await c.cambiaPassword(s.user_id, attuale, nuova, {
        deviceCorrente: d ? d.corrente() : null,
      });
      if (!e.ok) { _errore(e.motivo); return e; }
      _avvisa('Password cambiata. Le altre postazioni sono state chiuse.', 'success');
      _ridisegna();
      return e;
    } catch (err) {
      _errore('Cambio non riuscito: ' + (err && err.message));
      return { ok: false, motivo: String(err && err.message) };
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Cambia password'; }
    }
  }

  function chiudi(deviceId) {
    var d = D();
    var s = sessione();
    if (!d || !s) return { ok: false, motivo: 'servizio non disponibile' };
    if (deviceId === d.corrente()) {
      /* Chiudere la propria postazione da qui sarebbe un logout travestito:
         se è quello che si vuole, si esce. */
      return { ok: false, motivo: 'Per chiudere questa postazione esci dall’applicazione' };
    }
    var e = d.revoca(deviceId, 'chiusa dall’utente', { attore: s.user_id });
    _avvisa(e.ok ? 'Postazione chiusa' : e.motivo, e.ok ? 'success' : 'error');
    _ridisegna();
    return e;
  }

  global.InglySicurezza = {
    VERSIONE: VERSIONE,
    render: render,
    forza: forza,
    cambia: cambia,
    chiudi: chiudi,
  };
})(typeof window !== 'undefined' ? window : globalThis);
