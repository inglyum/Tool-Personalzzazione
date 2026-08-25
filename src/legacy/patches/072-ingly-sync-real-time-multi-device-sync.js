
// ═══════════════════════════════════════════════════════════════════════
// 🔄 INGLY SYNC — Real-time multi-device sync
// Supporta: Firebase Realtime DB | GitHub Gist | JSONBin.io
// ═══════════════════════════════════════════════════════════════════════
var InglySync = (function() {
  'use strict';

  var CFG_KEY = 'ingly_sync_config_v1';
  var LAST_KEY = 'ingly_sync_last_v1';
  var _cfg = null;
  var _status = 'offline'; // offline | connecting | synced | error | conflict
  var _lastSync = null;
  var _unsubscribe = null;
  var _debounceTimer = null;
  var _syncQueue = {};
  var STORES = ['items','equipment','quotes','customers','suppliers','competitors','calendar_events','apparel'];
  var _inboundSync = false; // prevent echo loop

  // ── Config ─────────────────────────────────────────────────────────
  function loadCfg() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY) || 'null'); } catch(e) { return null; }
  }
  function saveCfg(cfg) {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch(e) {}
  }

  // ── Status indicator ───────────────────────────────────────────────
  function setStatus(s, msg) {
    _status = s;
    var el = document.getElementById('sync-indicator');
    if (!el) return;
    var map = {
      offline:     { icon:'⚫', label:'Offline',     color:'#64748b', pulse:false },
      connecting:  { icon:'🟡', label:'Connessione', color:'#f59e0b', pulse:true  },
      synced:      { icon:'🟢', label:'Sincronizzato',color:'#22c55e', pulse:false },
      syncing:     { icon:'🔵', label:'Sync...',      color:'#3b82f6', pulse:true  },
      error:       { icon:'🔴', label:'Errore sync',  color:'#ef4444', pulse:false },
      conflict:    { icon:'🟠', label:'Conflitto',    color:'#f97316', pulse:false },
    };
    var st = map[s] || map.offline;
    var label = msg ? st.label+': '+msg.slice(0,20) : st.label;
    el.innerHTML = '<span style="font-size:10px;display:flex;align-items:center;gap:5px;cursor:pointer" onclick="InglySync.openSettings()" title="Clicca per impostazioni sync">'
      +'<span style="width:8px;height:8px;border-radius:50%;background:'+st.color+';flex-shrink:0'+(st.pulse?';animation:syncPulse 1.2s infinite':'')+'"></span>'
      +'<span style="color:'+st.color+';font-weight:600">'+label+'</span>'
      +(_lastSync?'<span style="color:var(--text-dim)">'+_fmtTime(_lastSync)+'</span>':'')
      +'</span>';
  }

  function _fmtTime(d) {
    if (!d) return '';
    var diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60) return diff+'s fa';
    if (diff < 3600) return Math.floor(diff/60)+'m fa';
    return Math.floor(diff/3600)+'h fa';
  }

  // ── Init ───────────────────────────────────────────────────────────
  async function init() {
    _cfg = loadCfg();
    _injectCSS();
    _injectIndicator();

    if (!_cfg || !_cfg.provider || !_cfg.enabled) {
      setStatus('offline');
      return;
    }

    setStatus('connecting');
    try {
      if (_cfg.provider === 'firebase') await _initFirebase();
      else if (_cfg.provider === 'gist') await _initGist();
      else if (_cfg.provider === 'jsonbin') await _initJsonBin();
    } catch(e) {
      console.error('[InglySync] Init error:', e);
      setStatus('error', e.message || 'Errore');
    }
  }

  // ── Firebase Provider ──────────────────────────────────────────────
  async function _initFirebase() {
    if (!_cfg.firebaseConfig) throw new Error('Firebase config mancante');

    // Load Firebase SDK dynamically
    if (!window.firebase) {
      await _loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
      await _loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js');
    }

    var app;
    try {
      app = firebase.app();
    } catch(e) {
      app = firebase.initializeApp(_cfg.firebaseConfig);
    }

    var db = firebase.database();
    var uid = _cfg.userId || 'default';
    var rootRef = db.ref('ingly/'+uid);

    // Push local data to Firebase on first connect (if newer)
    setStatus('syncing', 'Upload dati...');
    await _pushAllToFirebase(rootRef);

    // Listen for remote changes
    rootRef.on('value', async function(snap) {
      if (_inboundSync) return;
      var data = snap.val();
      if (!data) return;
      setStatus('syncing', 'Download...');
      _inboundSync = true;
      try {
        await _applyRemoteData(data);
        _lastSync = new Date().toISOString();
        localStorage.setItem(LAST_KEY, _lastSync);
        setStatus('synced');
        _refreshUI();
      } catch(e) {
        setStatus('error', e.message);
      }
      setTimeout(function() { _inboundSync = false; }, 500);
    });

    // Patch IDB.put to auto-sync
    _patchIDB(async function(store, item) {
      if (_inboundSync) return;
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(async function() {
        setStatus('syncing', store);
        try {
          var all = await IDB.getAll(store).catch(function(){return [];});
          await rootRef.child(store).set(_serializeStore(all));
          _lastSync = new Date().toISOString();
          localStorage.setItem(LAST_KEY, _lastSync);
          setStatus('synced');
        } catch(e) {
          setStatus('error', e.message);
        }
      }, 1500);
    });

    setStatus('synced');
    console.log('[InglySync] Firebase connected ✅');
  }

  async function _pushAllToFirebase(rootRef) {
    for (var i=0; i<STORES.length; i++) {
      var store = STORES[i];
      try {
        var all = await IDB.getAll(store).catch(function(){return [];});
        if (all && all.length > 0) {
          await rootRef.child(store).set(_serializeStore(all));
        }
      } catch(e) {
        // Store might not exist, skip
      }
    }
  }

  // ── GitHub Gist Provider ───────────────────────────────────────────
  async function _initGist() {
    if (!_cfg.gistToken || !_cfg.gistId) throw new Error('Gist token/ID mancante');
    setStatus('syncing', 'Carico...');

    // Pull from Gist
    var resp = await fetch('https://api.github.com/gists/'+_cfg.gistId, {
      headers: { 'Authorization': 'token '+_cfg.gistToken, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!resp.ok) throw new Error('Gist non raggiungibile: '+resp.status);
    var data = await resp.json();
    var content = data.files && data.files['ingly_sync.json'] ? JSON.parse(data.files['ingly_sync.json'].content) : null;
    if (content) await _applyRemoteData(content);

    // Patch IDB.put to push to Gist (debounced)
    _patchIDB(async function() {
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(async function() {
        setStatus('syncing', 'Upload...');
        try {
          var payload = {};
          for (var i=0; i<STORES.length; i++) {
            var all = await IDB.getAll(STORES[i]).catch(function(){return [];});
            if (all && all.length > 0) payload[STORES[i]] = all;
          }
          await fetch('https://api.github.com/gists/'+_cfg.gistId, {
            method: 'PATCH',
            headers: { 'Authorization': 'token '+_cfg.gistToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: { 'ingly_sync.json': { content: JSON.stringify(payload) } } })
          });
          _lastSync = new Date().toISOString();
          setStatus('synced');
        } catch(e) { setStatus('error', e.message); }
      }, 3000);
    });

    setStatus('synced');

    // Poll every 30s for changes from other devices
    setInterval(async function() {
      try {
        var r = await fetch('https://api.github.com/gists/'+_cfg.gistId, {
          headers: { 'Authorization': 'token '+_cfg.gistToken }
        });
        if (!r.ok) return;
        var d = await r.json();
        var updated = new Date(d.updated_at).getTime();
        var localLast = _lastSync ? new Date(_lastSync).getTime() : 0;
        if (updated > localLast + 5000) {
          var c2 = d.files && d.files['ingly_sync.json'] ? JSON.parse(d.files['ingly_sync.json'].content) : null;
          if (c2) { await _applyRemoteData(c2); _lastSync = new Date().toISOString(); setStatus('synced'); _refreshUI(); }
        }
      } catch(e) {}
    }, 30000);
  }

  // ── JSONBin Provider ───────────────────────────────────────────────
  async function _initJsonBin() {
    if (!_cfg.jsonbinKey || !_cfg.jsonbinId) throw new Error('JSONBin API key/ID mancante');
    setStatus('syncing', 'Carico...');

    var resp = await fetch('https://api.jsonbin.io/v3/b/'+_cfg.jsonbinId, {
      headers: { 'X-Master-Key': _cfg.jsonbinKey }
    });
    if (!resp.ok) throw new Error('JSONBin error: '+resp.status);
    var data = await resp.json();
    if (data.record) await _applyRemoteData(data.record);

    _patchIDB(async function() {
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(async function() {
        setStatus('syncing', 'Upload...');
        try {
          var payload = {};
          for (var i=0; i<STORES.length; i++) {
            var all = await IDB.getAll(STORES[i]).catch(function(){return [];});
            if (all && all.length > 0) payload[STORES[i]] = all;
          }
          payload._syncTime = new Date().toISOString();
          await fetch('https://api.jsonbin.io/v3/b/'+_cfg.jsonbinId, {
            method:'PUT', headers: { 'X-Master-Key':_cfg.jsonbinKey, 'Content-Type':'application/json' },
            body: JSON.stringify(payload)
          });
          _lastSync = payload._syncTime;
          setStatus('synced');
        } catch(e) { setStatus('error', e.message); }
      }, 3000);
    });

    setStatus('synced');

    // Poll every 30s
    setInterval(async function() {
      try {
        var r = await fetch('https://api.jsonbin.io/v3/b/'+_cfg.jsonbinId+'/latest', {
          headers:{'X-Master-Key':_cfg.jsonbinKey}
        });
        if (!r.ok) return;
        var d = await r.json();
        var remoteTime = d.metadata && d.metadata.createdAt ? new Date(d.metadata.createdAt).getTime() : 0;
        var localTime = _lastSync ? new Date(_lastSync).getTime() : 0;
        if (remoteTime > localTime + 5000) {
          await _applyRemoteData(d.record);
          _lastSync = new Date().toISOString();
          setStatus('synced');
          _refreshUI();
        }
      } catch(e) {}
    }, 30000);
  }

  // ── Data helpers ───────────────────────────────────────────────────
  function _serializeStore(arr) {
    // Convert to object keyed by id for Firebase
    var obj = {};
    arr.forEach(function(item) {
      var key = String(item.id||item.name||Date.now()).replace(/[.#$/\[\]]/g,'_');
      obj[key] = item;
    });
    return obj;
  }

  function _deserializeStore(obj) {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj;
    return Object.values(obj);
  }

  async function _applyRemoteData(data) {
    if (!data) return;
    for (var i=0; i<STORES.length; i++) {
      var store = STORES[i];
      if (!data[store]) continue;
      var items = _deserializeStore(data[store]);
      if (!items || !items.length) continue;
      try {
        // Merge: keep newer records (by id)
        var local = await IDB.getAll(store).catch(function(){return [];});
        var localMap = {};
        local.forEach(function(it) { localMap[it.id] = it; });
        var merged = items.filter(function(it) { return it && it.id; });
        merged.forEach(function(it) {
          if (!localMap[it.id]) localMap[it.id] = it; // new from remote
          // Could add timestamp-based conflict resolution here
        });
        // Write all remote items
        for (var j=0; j<items.length; j++) {
          if (items[j] && items[j].id) {
            await IDB.put(store, items[j]).catch(function(){});
          }
        }
      } catch(e) {
        console.warn('[InglySync] Apply error for', store, e);
      }
    }
  }

  function _patchIDB(onWrite) {
    if (!window.IDB || IDB._syncPatched) return;
    var origPut = IDB.put.bind(IDB);
    var origDel = IDB.delete ? IDB.delete.bind(IDB) : null;
    IDB.put = async function(store, item) {
      var result = await origPut(store, item);
      if (STORES.indexOf(store) >= 0) onWrite(store, item);
      return result;
    };
    if (origDel) {
      IDB.delete = async function(store, id) {
        var result = await origDel(store, id);
        if (STORES.indexOf(store) >= 0) onWrite(store, {id});
        return result;
      };
    }
    IDB._syncPatched = true;
  }

  function _loadScript(src) {
    return new Promise(function(resolve, reject) {
      if (document.querySelector('script[src="'+src+'"]')) { resolve(); return; }
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function _refreshUI() {
    try {
      if (window.App && App.currentSection) App.renderSection(App.currentSection);
    } catch(e) {}
  }

  // ── Manual sync ────────────────────────────────────────────────────
  async function syncNow() {
    if (!_cfg || !_cfg.enabled) { openSettings(); return; }
    setStatus('syncing', 'Manuale...');
    try {
      if (_cfg.provider === 'firebase' && window.firebase) {
        var db = firebase.database();
        var rootRef = db.ref('ingly/'+(_cfg.userId||'default'));
        await _pushAllToFirebase(rootRef);
      }
      _lastSync = new Date().toISOString();
      setStatus('synced');
      if (typeof toast !== 'undefined') toast('🔄 Sincronizzazione completata!', 'success');
    } catch(e) {
      setStatus('error', e.message);
      if (typeof toast !== 'undefined') toast('❌ Errore sync: '+e.message, 'error');
    }
  }

  // ── Settings Modal ─────────────────────────────────────────────────
  function openSettings() {
    var existing = document.getElementById('sync-settings-modal');
    if (existing) existing.remove();
    var cfg = loadCfg() || {};
    var ov = document.createElement('div');
    ov.id = 'sync-settings-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.onclick = function(e) { if(e.target===ov) ov.remove(); };

    ov.innerHTML = '<div style="background:var(--bg-card);border-radius:16px;width:min(560px,100%);max-height:92vh;overflow-y:auto;border:1px solid var(--border2)" onclick="event.stopPropagation()">'
      +'<div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;position:sticky;top:0;background:var(--bg-card);border-radius:16px 16px 0 0">'
      +'<span style="font-size:22px">🔄</span>'
      +'<div style="flex:1"><div style="font-size:15px;font-weight:800;color:var(--text)">Sincronizzazione Multi-Dispositivo</div>'
      +'<div style="font-size:11px;color:var(--text-muted)">Stato: <span id="sync-status-label" style="color:'+(cfg.enabled?'#22c55e':'#64748b')+'">'+(_status==='synced'?'✅ Sincronizzato':cfg.enabled?'⚡ Attivo':'⚫ Non configurato')+'</span></div></div>'
      +'<button onclick="document.getElementById(\'sync-settings-modal\').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:20px">✕</button>'
      +'</div>'

      // HOW IT WORKS
      +'<div style="padding:14px 18px;background:rgba(99,102,241,.04);border-bottom:1px solid var(--border)">'
      +'<div style="font-size:12px;font-weight:700;color:#818cf8;margin-bottom:8px">ℹ️ Come funziona</div>'
      +'<div style="font-size:11px;color:var(--text-muted);line-height:1.7">'
      +'I tuoi dati vengono salvati sul tuo account cloud personale. Puoi aprire questo file HTML su <strong style="color:var(--text)">qualsiasi dispositivo</strong> (PC, Mac, telefono, tablet) e i dati saranno sempre aggiornati in tempo reale. Scegli un servizio gratuito:</div></div>'

      // TABS
      +'<div id="sync-tabs" style="display:flex;gap:0;border-bottom:1px solid var(--border)">'
      +['firebase','gist','jsonbin'].map(function(p) {
        var labels = {firebase:'🔥 Firebase (consigliato)',gist:'🐙 GitHub Gist',jsonbin:'📦 JSONBin'};
        var isA = (cfg.provider||'firebase') === p;
        return '<button onclick="InglySync._switchTab(\''+p+'\')" id="sync-tab-'+p+'" style="flex:1;padding:9px 8px;background:'+(isA?'rgba(99,102,241,.12)':'transparent')+';border:none;border-bottom:2px solid '+(isA?'var(--prim)':'transparent')+';cursor:pointer;font-size:11px;font-weight:'+(isA?700:400)+';color:'+(isA?'var(--prim)':'var(--text-muted)')+'">'+labels[p]+'</button>';
      }).join('')
      +'</div>'

      +'<div style="padding:16px 18px" id="sync-tab-content">'
      +_tabContent(cfg.provider||'firebase', cfg)
      +'</div>'

      +'<div style="padding:12px 18px;border-top:1px solid var(--border);display:flex;gap:8px">'
      +'<button onclick="document.getElementById(\'sync-settings-modal\').remove()" style="flex:1;padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:12px;color:var(--text-muted)">Annulla</button>'
      +'<button onclick="InglySync.syncNow()" style="padding:10px 16px;background:rgba(16,185,129,.12);color:#10b981;border:1.5px solid rgba(16,185,129,.3);border-radius:10px;cursor:pointer;font-size:12px;font-weight:700">🔄 Sync ora</button>'
      +'<button onclick="InglySync._saveSettings()" style="flex:2;padding:10px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva e Connetti</button>'
      +'</div></div>';

    document.body.appendChild(ov);
  }

  function _tabContent(provider, cfg) {
    if (provider === 'firebase') {
      return '<div style="margin-bottom:12px;background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);border-radius:9px;padding:10px 14px;font-size:11px;color:var(--text-muted);line-height:1.7">'
        +'<strong style="color:#fbbf24">Setup (2 minuti):</strong> 1) Vai su <a href="https://console.firebase.google.com" target="_blank" style="color:#60a5fa">console.firebase.google.com</a> → Crea progetto → Database → Realtime Database → Crea database (modalità test) → Copia la configurazione da Impostazioni progetto → Incolla qui sotto.</div>'
        +'<div style="display:flex;flex-direction:column;gap:9px">'
        +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">Firebase Config (JSON dalla console)</label>'
        +'<textarea id="sync-firebase-cfg" rows="7" placeholder=\'{"apiKey":"AIza...","authDomain":"...","databaseURL":"https://...-default-rtdb.firebaseio.com","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}\' style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:11px;resize:vertical;font-family:monospace;box-sizing:border-box;outline:none">'+(cfg.firebaseConfig?JSON.stringify(cfg.firebaseConfig,null,2):'')+'</textarea></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">'
        +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">User ID (crea uno a tua scelta)</label>'
        +'<input id="sync-uid" value="'+(cfg.userId||'mio_laboratorio')+'" placeholder="es. laboratorio_mario" style="width:100%;padding:8px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;box-sizing:border-box;outline:none"></div>'
        +'<div style="display:flex;align-items:center;gap:8px;padding-top:18px"><label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text-muted)"><input type="checkbox" id="sync-enabled" '+(cfg.enabled?'checked':'')+' style="cursor:pointer"> Abilitato</label></div>'
        +'</div></div>';
    }
    if (provider === 'gist') {
      return '<div style="margin-bottom:12px;background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);border-radius:9px;padding:10px 14px;font-size:11px;color:var(--text-muted);line-height:1.7">'
        +'<strong style="color:#fbbf24">Setup:</strong> 1) Vai su <a href="https://github.com/settings/tokens/new?scopes=gist" target="_blank" style="color:#60a5fa">github.com/settings/tokens</a> → Crea token con scope "gist" → 2) Crea un <a href="https://gist.github.com" target="_blank" style="color:#60a5fa">Gist segreto</a> con file <code>ingly_sync.json</code> → copia ID dal URL</div>'
        +'<div style="display:flex;flex-direction:column;gap:9px">'
        +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">GitHub Personal Access Token</label>'
        +'<input id="sync-gist-token" type="password" value="'+(cfg.gistToken||'')+'" placeholder="ghp_xxxxxxxxxxxx" style="width:100%;padding:8px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;box-sizing:border-box;outline:none"></div>'
        +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">Gist ID (dal URL del gist)</label>'
        +'<input id="sync-gist-id" value="'+(cfg.gistId||'')+'" placeholder="abc123def456..." style="width:100%;padding:8px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;box-sizing:border-box;outline:none"></div>'
        +'<div style="display:flex;align-items:center;gap:8px"><label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text-muted)"><input type="checkbox" id="sync-enabled" '+(cfg.enabled?'checked':'')+' style="cursor:pointer"> Abilitato</label><span style="font-size:10px;color:var(--text-dim)">Sincronizzazione ogni 30 secondi (polling)</span></div>'
        +'</div>';
    }
    if (provider === 'jsonbin') {
      return '<div style="margin-bottom:12px;background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);border-radius:9px;padding:10px 14px;font-size:11px;color:var(--text-muted);line-height:1.7">'
        +'<strong style="color:#fbbf24">Setup:</strong> 1) Vai su <a href="https://jsonbin.io" target="_blank" style="color:#60a5fa">jsonbin.io</a> → Registrati gratis → Dashboard → API Keys → Copia master key → Crea un nuovo bin → copia ID</div>'
        +'<div style="display:flex;flex-direction:column;gap:9px">'
        +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">JSONBin Master Key</label>'
        +'<input id="sync-jsonbin-key" type="password" value="'+(cfg.jsonbinKey||'')+'" placeholder="$2b$10$..." style="width:100%;padding:8px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;box-sizing:border-box;outline:none"></div>'
        +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">Bin ID</label>'
        +'<input id="sync-jsonbin-id" value="'+(cfg.jsonbinId||'')+'" placeholder="65abc123def..." style="width:100%;padding:8px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;box-sizing:border-box;outline:none"></div>'
        +'<div style="display:flex;align-items:center;gap:8px"><label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text-muted)"><input type="checkbox" id="sync-enabled" '+(cfg.enabled?'checked':'')+' style="cursor:pointer"> Abilitato</label><span style="font-size:10px;color:var(--text-dim)">Limite: ~100KB gratuito. Polling 30s.</span></div>'
        +'</div>';
    }
    return '';
  }

  function _switchTab(p) {
    document.querySelectorAll('[id^="sync-tab-"]').forEach(function(btn) {
      var isA = btn.id === 'sync-tab-'+p;
      btn.style.background = isA ? 'rgba(99,102,241,.12)' : 'transparent';
      btn.style.borderBottom = '2px solid '+(isA ? 'var(--prim)' : 'transparent');
      btn.style.fontWeight = isA ? '700' : '400';
      btn.style.color = isA ? 'var(--prim)' : 'var(--text-muted)';
    });
    var cfg = loadCfg() || {};
    cfg.provider = p;
    document.getElementById('sync-tab-content').innerHTML = _tabContent(p, cfg);
  }

  function _saveSettings() {
    var cfg = loadCfg() || {};
    cfg.provider = cfg.provider || 'firebase';
    // detect active tab
    var tabs = ['firebase','gist','jsonbin'];
    tabs.forEach(function(p) {
      var btn = document.getElementById('sync-tab-'+p);
      if (btn && btn.style.fontWeight === '700') cfg.provider = p;
    });

    var enabled = document.getElementById('sync-enabled');
    cfg.enabled = enabled ? enabled.checked : false;

    if (cfg.provider === 'firebase') {
      try {
        var raw = (document.getElementById('sync-firebase-cfg').value||'').trim();
        cfg.firebaseConfig = JSON.parse(raw);
        cfg.userId = (document.getElementById('sync-uid').value||'').trim() || 'default';
      } catch(e) { alert('JSON Firebase non valido: '+e.message); return; }
    } else if (cfg.provider === 'gist') {
      cfg.gistToken = (document.getElementById('sync-gist-token').value||'').trim();
      cfg.gistId = (document.getElementById('sync-gist-id').value||'').trim();
    } else if (cfg.provider === 'jsonbin') {
      cfg.jsonbinKey = (document.getElementById('sync-jsonbin-key').value||'').trim();
      cfg.jsonbinId = (document.getElementById('sync-jsonbin-id').value||'').trim();
    }

    saveCfg(cfg);
    document.getElementById('sync-settings-modal').remove();
    _cfg = cfg;
    _unsubscribe && _unsubscribe();

    // Re-initialize
    if (cfg.enabled) {
      init();
      if (typeof toast !== 'undefined') toast('🔄 Sincronizzazione configurata!', 'success');
    } else {
      setStatus('offline');
      if (typeof toast !== 'undefined') toast('⚫ Sync disabilitato', 'info');
    }
  }

  // ── Inject UI ──────────────────────────────────────────────────────
  function _injectIndicator() {
    // Add sync indicator to header
    var headerActions = document.querySelector('.header-actions') || document.querySelector('.topbar-right');
    if (!headerActions) {
      // Create floating indicator
      var el = document.createElement('div');
      el.id = 'sync-indicator';
      el.style.cssText = 'position:fixed;bottom:14px;right:14px;z-index:9999;background:var(--bg-card2);border:1px solid var(--border);border-radius:99px;padding:5px 12px;box-shadow:0 2px 12px rgba(0,0,0,.25)';
      document.body.appendChild(el);
    } else {
      var el = document.createElement('div');
      el.id = 'sync-indicator';
      el.style.cssText = 'display:inline-flex;align-items:center';
      headerActions.prepend(el);
    }
    setStatus('offline');
  }

  function _injectCSS() {
    var style = document.createElement('style');
    style.textContent = '@keyframes syncPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}';
    document.head.appendChild(style);
  }

  // ── Public API ─────────────────────────────────────────────────────
  return { init, syncNow, openSettings, _switchTab, _saveSettings, _tabContent };
})();

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { setTimeout(InglySync.init, 2000); });
} else {
  setTimeout(InglySync.init, 2000);
}

