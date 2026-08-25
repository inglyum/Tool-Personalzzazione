
/* === ADMIN DELETE & SUSPEND ENHANCEMENT v1.0 === */
(function AdminDeleteFix() {
  'use strict';

  /* ── confirmDeleteUserFull ─────────────────────────────────
     Modale di conferma eliminazione con doppia verifica
  ─────────────────────────────────────────────────────────── */
  window.confirmDeleteUserFull = function(id, name) {
    var safeId   = String(id).replace(/'/g,'').replace(/"/g,'');
    var safeName = String(name).replace(/</g,'&lt;').replace(/>/g,'&gt;');
    openModal(
      '<div class="modal modal-sm">' +
        '<div class="modal-header">' +
          '<div class="font-bold" style="color:var(--red,#f87171)">🗑 Elimina Account</div>' +
          '<button class="btn btn-ghost btn-xs" onclick="closeModal()">✕</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="alert-row alert-red"><i class="fas fa-exclamation-triangle"></i>' +
            'Eliminare <strong>' + safeName + '</strong>? Questa azione è <strong>irreversibile</strong>.' +
          '</div>' +
          '<div class="form-group mt-12">' +
            '<label style="font-size:12px;color:var(--text-muted,#888)">Scrivi <strong>ELIMINA</strong> per confermare</label>' +
            '<input id="_del_confirm_input" class="form-control" placeholder="ELIMINA" ' +
              'oninput="document.getElementById(\'_del_confirm_btn\').disabled=this.value!==\'ELIMINA\'">' +
          '</div>' +
          '<div class="alert-row" style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:10px;margin-top:8px;font-size:11px;color:var(--red,#f87171)">' +
            '⚠️ Verranno eliminati: account, sessioni, storico e dati da Supabase.' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-ghost btn-sm" onclick="closeModal()">Annulla</button>' +
          '<button id="_del_confirm_btn" class="btn btn-danger btn-sm" disabled ' +
            'data-uid="' + safeId + '" data-uname="' + safeName + '" ' +
            'onclick="doDeleteUserFull(this.dataset.uid,this.dataset.uname)">🗑 Elimina definitivamente</button>' +
        '</div>' +
      '</div>'
    );
  };

  /* ── doDeleteUserFull ────────────────────────────────────── */
  window.doDeleteUserFull = function(id, name) {
    /* 1. Remove from localStorage DB */
    if (typeof _db !== 'undefined') {
      _db.users     = (_db.users    ||[]).filter(function(x){ return x.id!==id; });
      _db.sessions  = (_db.sessions ||[]).filter(function(x){ return x.userId!==id; });
      _db.creations = (_db.creations||[]).filter(function(x){ return x.userId!==id; });
      if (typeof dbSave === 'function') dbSave(_db);
    }

    /* 2. Audit log */
    if (typeof addAuditLog === 'function') {
      addAuditLog('account_deleted', name + ' — eliminato definitivamente', id);
    }

    /* 3. Force logout via commands */
    if (typeof AdminCommandBus !== 'undefined' && AdminCommandBus.send) {
      AdminCommandBus.send('force_logout', { userId: id });
    }

    /* 4. Delete from Supabase */
    var sbUrl = localStorage.getItem('ingly_supabase_url') || '';
    var sbKey = localStorage.getItem('ingly_supabase_anon_key') || '';
    if (sbUrl && sbKey) {
      var base = sbUrl.replace(/\/$/, '');
      var hdrs = { 'apikey': sbKey, 'Authorization': 'Bearer ' + sbKey };
      /* Delete from ingly_users */
      fetch(base + '/rest/v1/ingly_users?id=eq.' + id, {
        method: 'DELETE', headers: hdrs
      }).catch(function(){});
      /* Revoke sessions */
      fetch(base + '/rest/v1/ingly_sessions?user_id=eq.' + id, {
        method: 'PATCH',
        headers: Object.assign({}, hdrs, { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }),
        body: JSON.stringify({ active: false, token: 'REVOKED', logged_out_at: new Date().toISOString() })
      }).catch(function(){});
    }

    closeModal();
    if (typeof toast === 'function') toast('🗑 Account eliminato: ' + name, 'warning');
    if (typeof renderUsers === 'function') renderUsers();
  };

  /* ── Enhance confirmSuspend to offer BOTH Suspend + Delete ─ */
  var _origConfirmSuspend = window.confirmSuspend;
  window.confirmSuspend = function(id, name) {
    var safeId   = String(id).replace(/'/g,'').replace(/"/g,'');
    var safeName = String(name).replace(/</g,'&lt;').replace(/>/g,'&gt;');
    openModal(
      '<div class="modal modal-sm">' +
        '<div class="modal-header">' +
          '<div class="font-bold" style="color:var(--orange,#f59e0b)">⚠️ Gestione Account</div>' +
          '<button class="btn btn-ghost btn-xs" onclick="closeModal()">✕</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="alert-row alert-yellow"><i class="fas fa-user"></i>' +
            'Account di <strong>' + safeName + '</strong>' +
          '</div>' +
          '<div class="form-group mt-12">' +
            '<label>Motivo</label>' +
            '<select id="suspend-reason" class="form-control">' +
              '<option>Pagamento non ricevuto</option>' +
              '<option>Violazione TOS</option>' +
              '<option>Attività sospetta</option>' +
              '<option>Richiesta utente</option>' +
              '<option>Altro</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer" style="flex-wrap:wrap;gap:6px">' +
          '<button class="btn btn-ghost btn-sm" onclick="closeModal()">Annulla</button>' +
          '<button class="btn btn-warning btn-sm" data-uid="' + safeId + '" onclick="doSuspend(this.dataset.uid)">⛔ Sospendi</button>' +
          '<button class="btn btn-danger btn-sm" data-uid="' + safeId + '" data-uname="' + safeName + '" ' +
            'onclick="closeModal();confirmDeleteUserFull(this.dataset.uid,this.dataset.uname)">🗑 Elimina</button>' +
        '</div>' +
      '</div>'
    );
  };

  /* ── Add delete button inside openUserDetail modal ────────── */
  var _origOpenUserDetail = window.openUserDetail;
  if (typeof _origOpenUserDetail === 'function') {
    window.openUserDetail = function(id) {
      _origOpenUserDetail(id);
      /* After modal opens, inject delete button */
      setTimeout(function() {
        var footer = document.querySelector('.modal-footer');
        if (!footer || footer.querySelector('._del_from_detail')) return;
        var u = (typeof _db !== 'undefined') ? (_db.users||[]).find(function(x){return x.id===id;}) : null;
        var name = u ? (u.nome + ' ' + u.cognome) : id;
        var btn = document.createElement('button');
        btn.className = 'btn btn-danger btn-sm _del_from_detail';
        btn.innerHTML = '🗑 Elimina Account';
        btn.setAttribute('data-uid', id);
        btn.setAttribute('data-uname', name);
        btn.onclick = function() {
          closeModal();
          setTimeout(function() { confirmDeleteUserFull(id, name); }, 100);
        };
        footer.insertBefore(btn, footer.firstChild);
      }, 100);
    };
  }

  console.log('[AdminDeleteFix v1] Delete & Suspend enhancement loaded');
})();

