
/* === ADMIN SESSION ENHANCEMENT v2.0 === */
(function AdminSessionFix() {
  'use strict';
  var SB_URL = localStorage.getItem('ingly_supabase_url') || '';
  var SB_KEY = localStorage.getItem('ingly_supabase_anon_key') || '';
  var SESSION_TIMEOUT = 90 * 1000;
  function sbOk() { return !!(SB_URL && SB_KEY); }
  function sbH(x) { var h={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}; if(x)Object.assign(h,x); return h; }
  function sbBase() { return SB_URL.replace(/\/$/,''); }

  window.adminForceLogout = async function(userId, uname) {
    if (!confirm('Disconnettere ' + uname + '?')) return;
    if (!sbOk()) { if(typeof toast==='function') toast('Supabase non configurato','error'); return; }
    try {
      await fetch(sbBase()+'/rest/v1/ingly_sessions?user_id=eq.'+userId, {
        method:'PATCH', headers:sbH({'Content-Type':'application/json','Prefer':'return=minimal'}),
        body:JSON.stringify({active:false,token:'REVOKED',logged_out_at:new Date().toISOString()})
      });
      await fetch(sbBase()+'/rest/v1/ingly_commands', {
        method:'POST', headers:sbH({'Content-Type':'application/json','Prefer':'return=minimal'}),
        body:JSON.stringify({target_user_id:userId,command:'force_logout',created_at:new Date().toISOString()})
      });
      if(typeof toast==='function') toast('Utente disconnesso','success');
      setTimeout(window.renderRealSessions, 600);
    } catch(e) { if(typeof toast==='function') toast('Errore: '+e.message,'error'); }
  };

  window.adminCleanStaleSessions = async function() {
    if (!sbOk()) return;
    var cutoff = new Date(Date.now() - SESSION_TIMEOUT).toISOString();
    try {
      await fetch(sbBase()+'/rest/v1/ingly_sessions?last_seen=lt.'+cutoff+'&active=eq.true', {
        method:'PATCH', headers:sbH({'Content-Type':'application/json','Prefer':'return=minimal'}),
        body:JSON.stringify({active:false,logged_out_at:new Date().toISOString()})
      });
      if(typeof toast==='function') toast('Sessioni fantasma eliminate','success');
      setTimeout(window.renderRealSessions, 600);
    } catch(e) {}
  };

  window.renderRealSessions = async function() {
    var pg = document.getElementById('page-sessions');
    if (!pg) return;
    pg.innerHTML = '<div style="padding:20px;color:var(--text3,#888)">Caricamento sessioni live da Supabase...</div>';
    var sessions = [];
    if (sbOk()) {
      try {
        var r = await fetch(sbBase()+'/rest/v1/ingly_sessions?select=*&order=last_seen.desc', {headers:sbH()});
        if (r.ok) sessions = await r.json();
      } catch(e) {}
    }
    if (!sessions.length && typeof _db !== 'undefined') sessions = _db.sessions || [];
    var now = Date.now();
    sessions.forEach(function(s) {
      var age = s.last_seen ? now - new Date(s.last_seen).getTime() : Infinity;
      s._live  = s.active && age < SESSION_TIMEOUT;
      s._stale = s.active && age >= SESSION_TIMEOUT;
      s._age   = age;
    });
    var cntLive  = sessions.filter(function(s){return s._live;}).length;
    var cntStale = sessions.filter(function(s){return s._stale;}).length;
    var cntOff   = sessions.filter(function(s){return !s.active;}).length;

    function ageLabel(ms) {
      if (ms===Infinity) return 'Mai';
      var sec=Math.floor(ms/1000);
      if(sec<60) return sec+'s fa';
      if(sec<3600) return Math.floor(sec/60)+'m fa';
      if(sec<86400) return Math.floor(sec/3600)+'h fa';
      return Math.floor(sec/86400)+'gg fa';
    }

    var rows = sessions
      .sort(function(a,b){return (b._live?1:0)-(a._live?1:0)||a._age-b._age;})
      .map(function(s) {
        var uid = s.user_id || s.userId || '';
        var uname = s.username || uid || '—';
        if (typeof _db !== 'undefined') {
          var u = (_db.users||[]).find(function(x){return x.id===uid;});
          if (u) uname = u.nome || u.username || u.email || uname;
        }
        var color = s._live ? 'var(--green,#10b981)' : s._stale ? 'var(--yellow,#f59e0b)' : 'var(--text3,#888)';
        var badge = s._live
          ? '<span class="badge b-active">● Live</span>'
          : s._stale
          ? '<span class="badge" style="background:#f59e0b20;color:#f59e0b">👻 Fantasma</span>'
          : '<span class="badge b-expired">○ Offline</span>';
        /* Use data-attrs to avoid quote nesting */
        var forceBtn = '';
        if (uid && (s._live || s._stale)) {
          forceBtn = '<button class="btn btn-danger btn-icon" data-uid="'+uid+'" data-un="'+uname.replace(/"/g,'').replace(/'/g,'')+'" title="Force Logout" onclick="adminForceLogout(this.dataset.uid,this.dataset.un)"><i class="fas fa-times"></i></button>';
        }
        return '<tr>' +
          '<td class="font-bold text-sm">'+uname+'</td>' +
          '<td><div class="text-sm">'+(s.browser||'—')+'</div><div style="font-size:10px;color:var(--text3,#888)">'+(s.platform||s.os||'—')+'</div></td>' +
          '<td class="text-sm">'+(s.logged_in_at?new Date(s.logged_in_at).toLocaleString('it-IT'):'—')+'</td>' +
          '<td class="text-sm">'+(s.last_seen?new Date(s.last_seen).toLocaleString('it-IT'):'—')+'</td>' +
          '<td style="color:'+color+'">'+ageLabel(s._age)+'</td>' +
          '<td>'+badge+'</td>' +
          '<td>'+forceBtn+'</td>' +
        '</tr>';
      }).join('');

    var staleWarn = cntStale > 0
      ? '<div class="card mb-16" style="border-color:var(--yellow,#f59e0b)44">' +
          '<div style="font-size:13px;font-weight:700;color:var(--yellow,#f59e0b);margin-bottom:8px">' +
          '⚠️ '+cntStale+' sessioni fantasma — browser chiusi senza logout. Bloccano login.</div>' +
          '<button class="btn btn-warning btn-sm" onclick="adminCleanStaleSessions()">🧹 Pulisci tutte</button>' +
        '</div>'
      : '';

    pg.innerHTML =
      '<div class="page-header">' +
        '<div><div class="page-title">🔐 Sessioni Live</div>' +
          '<div class="page-sub">Heartbeat timeout: 90s · '+cntLive+' live · '+cntStale+' fantasma · '+cntOff+' offline</div></div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
          '<button class="btn btn-warning btn-sm" onclick="adminCleanStaleSessions()">🧹 Fantasmi ('+cntStale+')</button>' +
          '<button class="btn btn-danger btn-sm" onclick="killAllActiveSessions()"><i class="fas fa-sign-out-alt"></i> Kill All</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="renderRealSessions()"><i class="fas fa-sync"></i></button>' +
        '</div>' +
      '</div>' +
      staleWarn +
      '<div class="tbl-wrap"><table><thead><tr>' +
        '<th>Utente</th><th>Browser / OS</th><th>Login</th><th>Ultimo HB</th><th>Inattività</th><th>Stato</th><th>Force</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  };

  var _origRS = window.renderSessions;
  window.renderSessions = function() {
    if (sbOk()) window.renderRealSessions();
    else if (_origRS) _origRS();
  };

  console.log('[AdminSessionFix v2] Loaded');
})();

