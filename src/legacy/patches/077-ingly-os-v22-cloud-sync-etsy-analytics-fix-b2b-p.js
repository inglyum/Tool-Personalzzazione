
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v22 — Cloud Sync + Etsy Analytics Fix + B2B Products
// ═══════════════════════════════════════════════════════════════════

// ─── 1. CLOUD SYNC — JSONBin.io based cross-device sync ──────────
window.InglyCloudSync = (function(){
  var SK_CFG  = 'ingly_cloud_sync_v1';
  var SK_SNAP = 'ingly_cloud_snap_v1';
  var API_BASE = 'https://api.jsonbin.io/v3';

  // Data stores to sync
  var SYNC_STORES = [
    'lb2b_stock_v1','lb2b_quotes_v1','lb2b_catalog_v1',
    'ingly_bank_funds_v1','ingly_crm_v1','ingly_price_alerts_v1',
    'ingly_sdi_v1','ingly_settings_v1','ingly_cloud_sync_v1',
  ];

  function loadCfg(){
    try{ return JSON.parse(localStorage.getItem(SK_CFG)||'{}'); }catch(e){ return {}; }
  }
  function saveCfg(d){
    try{ localStorage.setItem(SK_CFG,JSON.stringify(d)); }catch(e){}
  }

  function collectAllData(){
    var snap = { ts: new Date().toISOString(), v: '22', stores: {} };
    SYNC_STORES.forEach(function(k){
      try{ snap.stores[k] = localStorage.getItem(k)||null; }catch(e){}
    });
    // Also include IDB critical stores via AppStore cache if available
    return snap;
  }

  function applySnap(snap){
    if(!snap||!snap.stores) return 0;
    var count=0;
    Object.entries(snap.stores).forEach(function(kv){
      var key=kv[0], val=kv[1];
      try{
        if(val!==null){ localStorage.setItem(key,val); count++; }
      }catch(e){}
    });
    return count;
  }

  var _module = {
    _interval: null,

    render(){
      var el = document.getElementById('view-cloud_updater');
      if(!el) return;
      var cfg = loadCfg();
      var lastSync = cfg.lastSync ? new Date(cfg.lastSync).toLocaleString('it') : 'Mai';
      var hasBin = !!cfg.binId;

      el.innerHTML = '<div style="padding:16px 20px;max-width:900px;margin:0 auto">'
        +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">'
        +'<span style="font-size:28px">☁️</span>'
        +'<div><div style="font-size:20px;font-weight:900;color:var(--text)">Cloud Sync</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">Sincronizza i dati tra dispositivi in tempo reale via JSONBin.io (gratuito)</div></div>'
        +(hasBin?'<div style="margin-left:auto;display:flex;align-items:center;gap:6px"><div style="width:8px;height:8px;background:#22c55e;border-radius:50%"></div><span style="font-size:11px;color:#22c55e">Configurato</span></div>':
          '<div style="margin-left:auto;display:flex;align-items:center;gap:6px"><div style="width:8px;height:8px;background:#f59e0b;border-radius:50%"></div><span style="font-size:11px;color:#f59e0b">Non configurato</span></div>')
        +'</div>'

        // Status cards
        +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">'
        +'<div style="background:var(--bg-card2);border:1px solid #22c55e30;border-radius:12px;padding:14px;text-align:center">'
        +'<div style="font-size:10px;color:#22c55e;font-weight:700;text-transform:uppercase;margin-bottom:4px">Ultimo Sync</div>'
        +'<div style="font-size:12px;font-weight:800;color:var(--text)">'+lastSync+'</div></div>'
        +'<div style="background:var(--bg-card2);border:1px solid #3b82f630;border-radius:12px;padding:14px;text-align:center">'
        +'<div style="font-size:10px;color:#3b82f6;font-weight:700;text-transform:uppercase;margin-bottom:4px">Bin ID</div>'
        +'<div style="font-size:11px;font-weight:700;color:var(--text);word-break:break-all">'+(cfg.binId?cfg.binId.slice(-8)+'...':'—')+'</div></div>'
        +'<div style="background:var(--bg-card2);border:1px solid #f59e0b30;border-radius:12px;padding:14px;text-align:center">'
        +'<div style="font-size:10px;color:#f59e0b;font-weight:700;text-transform:uppercase;margin-bottom:4px">Auto-Sync</div>'
        +'<div style="font-size:12px;font-weight:800;color:var(--text)">'+(cfg.autoSync?'Attivo ('+cfg.interval+'min)':'Disattivo')+'</div></div>'
        +'<div style="background:var(--bg-card2);border:1px solid #8b5cf630;border-radius:12px;padding:14px;text-align:center">'
        +'<div style="font-size:10px;color:#8b5cf6;font-weight:700;text-transform:uppercase;margin-bottom:4px">Store Sincronizzati</div>'
        +'<div style="font-size:18px;font-weight:900;color:#8b5cf6">'+SYNC_STORES.length+'</div></div>'
        +'</div>'

        // Config Panel
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">'
        // Setup
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:18px">'
        +'<div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:14px">🔧 Configurazione Sync</div>'
        +'<div style="margin-bottom:10px"><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:3px">API Key JSONBin.io (opzionale per bin privati)</label>'
        +'<input id="cs-apikey" value="'+(cfg.apiKey||'')+'" placeholder="$2a$10$..." style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px"></div>'
        +'<div style="margin-bottom:10px"><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:3px">Bin ID (Sync Code — condividi tra dispositivi)</label>'
        +'<input id="cs-binid" value="'+(cfg.binId||'')+'" placeholder="Lascia vuoto per creare automaticamente" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px"></div>'
        +'<div style="margin-bottom:12px;display:flex;align-items:center;gap:8px">'
        +'<input type="checkbox" id="cs-auto" '+(cfg.autoSync?'checked':'')+' style="width:16px;height:16px">'
        +'<label for="cs-auto" style="font-size:12px;color:var(--text)">Auto-sync ogni</label>'
        +'<select id="cs-interval" style="padding:5px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px">'
        +'<option value="5" '+(cfg.interval===5?'selected':'')+'>5 min</option>'
        +'<option value="15" '+(cfg.interval===15||!cfg.interval?'selected':'')+'>15 min</option>'
        +'<option value="30" '+(cfg.interval===30?'selected':'')+'>30 min</option>'
        +'<option value="60" '+(cfg.interval===60?'selected':'')+'>60 min</option>'
        +'</select>'
        +'</div>'
        +'<button onclick="InglyCloudSync.saveConfig()" style="width:100%;padding:9px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">💾 Salva Configurazione</button>'
        +'</div>'
        // Actions
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:18px">'
        +'<div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:14px">🔄 Operazioni Sync</div>'
        +'<div style="display:grid;gap:8px">'
        +'<button onclick="InglyCloudSync.push()" style="padding:10px 16px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800;display:flex;align-items:center;gap:8px;justify-content:center">☁️ Carica su Cloud (Push)</button>'
        +'<button onclick="InglyCloudSync.pull()" style="padding:10px 16px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800;display:flex;align-items:center;gap:8px;justify-content:center">📥 Scarica da Cloud (Pull)</button>'
        +'<div style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px">'
        +'<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Backup locale (senza cloud)</div>'
        +'<div style="display:flex;gap:6px">'
        +'<button onclick="InglyCloudSync.exportJSON()" style="flex:1;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text)">📤 Esporta JSON</button>'
        +'<button onclick="InglyCloudSync.importJSON()" style="flex:1;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text)">📂 Importa JSON</button>'
        +'</div></div>'
        +'</div></div></div>'

        // How to guide
        +'<div style="background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.2);border-radius:14px;padding:16px">'
        +'<div style="font-size:12px;font-weight:800;color:#3b82f6;margin-bottom:10px">📖 Come usare Cloud Sync tra dispositivi</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">'
        +['<div><div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:4px">1️⃣ Primo dispositivo</div><div style="font-size:11px;color:var(--text-muted)">Premi <strong>Carica su Cloud</strong>. Il sistema crea automaticamente un Bin ID univoco. Copia il Bin ID.</div></div>',
          '<div><div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:4px">2️⃣ Altri dispositivi</div><div style="font-size:11px;color:var(--text-muted)">Incolla il <strong>Bin ID</strong> nel campo apposito, poi premi <strong>Scarica da Cloud</strong>. Tutti i dati vengono sincronizzati.</div></div>',
          '<div><div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:4px">3️⃣ Auto-sync</div><div style="font-size:11px;color:var(--text-muted)">Attiva l\'auto-sync per mantenere i dati aggiornati in background ogni N minuti su tutti i dispositivi.</div></div>'
         ].join('')
        +'</div></div>'
        +'<div id="cs-status" style="margin-top:12px"></div>'
        +'</div>';
    },

    saveConfig(){
      var cfg = loadCfg();
      cfg.apiKey   = document.getElementById('cs-apikey')?.value?.trim()||'';
      cfg.binId    = document.getElementById('cs-binid')?.value?.trim()||cfg.binId||'';
      cfg.autoSync = document.getElementById('cs-auto')?.checked||false;
      cfg.interval = parseInt(document.getElementById('cs-interval')?.value)||15;
      saveCfg(cfg);
      this._setupAutoSync(cfg);
      if(typeof toast!=='undefined') toast('💾 Configurazione cloud salvata','success');
      this.render();
    },

    _setupAutoSync(cfg){
      if(this._interval){ clearInterval(this._interval); this._interval=null; }
      if(cfg.autoSync && cfg.binId){
        this._interval = setInterval(function(){
          InglyCloudSync.push(true); // silent push
        }, (cfg.interval||15)*60*1000);
      }
    },

    async push(silent){
      var cfg = loadCfg();
      var snap = collectAllData();
      var snapStr = JSON.stringify(snap);
      this._setStatus('⏳ Caricamento su cloud...','#f59e0b');

      try{
        var headers = {'Content-Type':'application/json'};
        if(cfg.apiKey) headers['X-Master-Key'] = cfg.apiKey;
        headers['X-Bin-Private'] = cfg.apiKey?'true':'false';

        var method='POST', url=API_BASE+'/b';
        if(cfg.binId){
          method='PUT';
          url = API_BASE+'/b/'+cfg.binId;
        }

        var res = await fetch(url,{method,headers,body:snapStr});
        var data = await res.json();

        if(!res.ok) throw new Error(data.message||'Errore API: '+res.status);

        if(!cfg.binId && data.metadata?.id){
          cfg.binId = data.metadata.id;
          document.getElementById('cs-binid') && (document.getElementById('cs-binid').value=cfg.binId);
        }
        cfg.lastSync = new Date().toISOString();
        saveCfg(cfg);
        localStorage.setItem(SK_SNAP, snapStr);

        if(!silent){
          this._setStatus('✅ Dati caricati sul cloud! Bin ID: '+cfg.binId,'#22c55e');
          if(typeof toast!=='undefined') toast('☁️ Sync completato! Bin ID: '+cfg.binId.slice(-8)+'...','success');
          this.render();
        }
      }catch(e){
        this._setStatus('❌ Errore push: '+e.message,'#ef4444');
        if(!silent && typeof toast!=='undefined') toast('Errore sync: '+e.message,'error');
        console.warn('[CloudSync] push error:',e);
      }
    },

    async pull(){
      var cfg = loadCfg();
      if(!cfg.binId){ alert('Inserisci prima un Bin ID da sincronizzare!'); return; }
      this._setStatus('⏳ Download dati dal cloud...','#3b82f6');
      try{
        var headers = {};
        if(cfg.apiKey) headers['X-Master-Key'] = cfg.apiKey;

        var res = await fetch(API_BASE+'/b/'+cfg.binId+'/latest',{headers});
        var data = await res.json();
        if(!res.ok) throw new Error(data.message||'Errore API: '+res.status);

        var snap = data.record||data;
        var count = applySnap(snap);
        cfg.lastSync = new Date().toISOString();
        saveCfg(cfg);

        this._setStatus('✅ Sincronizzati '+count+' store dal cloud','#22c55e');
        if(typeof toast!=='undefined') toast('📥 Sync completato: '+count+' store aggiornati. Ricarica la pagina.','success');
        // Offer page reload
        setTimeout(function(){
          if(confirm('Dati sincronizzati! Ricaricare la pagina per applicare le modifiche?')){
            window.location.reload();
          }
        },1500);
      }catch(e){
        this._setStatus('❌ Errore pull: '+e.message,'#ef4444');
        if(typeof toast!=='undefined') toast('Errore sync: '+e.message,'error');
        console.warn('[CloudSync] pull error:',e);
      }
    },

    exportJSON(){
      var snap = collectAllData();
      var blob = new Blob([JSON.stringify(snap,null,2)],{type:'application/json'});
      var a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download='ingly_backup_'+new Date().toISOString().slice(0,10)+'.json'; a.click();
      if(typeof toast!=='undefined') toast('📤 Backup JSON esportato!','success');
    },

    importJSON(){
      var inp=document.createElement('input'); inp.type='file'; inp.accept='.json';
      inp.onchange=async function(){
        var file=inp.files[0]; if(!file) return;
        try{
          var text=await file.text();
          var snap=JSON.parse(text);
          var count=applySnap(snap);
          if(typeof toast!=='undefined') toast('📂 Importati '+count+' store. Ricarica la pagina.','success');
          setTimeout(function(){ if(confirm('Importazione completata! Ricaricare?')) window.location.reload(); },1000);
        }catch(e){ alert('Errore importazione: '+e.message); }
      };
      inp.click();
    },

    _setStatus(msg,col){
      var el=document.getElementById('cs-status');
      if(el) el.innerHTML='<div style="padding:10px 14px;background:'+col+'15;border:1px solid '+col+'40;border-radius:8px;font-size:12px;color:'+col+'">'+msg+'</div>';
    },

    init(){
      var cfg=loadCfg();
      this._setupAutoSync(cfg);
    }
  };

  // Patch renderSection for cloud_updater
  (function _patchCloud(){
    function _p(){
      if(typeof App==='undefined'||!App.renderSection){ setTimeout(_p,700); return; }
      if(App._cloudSyncPatch) return;
      App._cloudSyncPatch=true;
      var _o=App.renderSection.bind(App);
      App.renderSection=async function(s){
        if(s==='cloud_updater'){
          document.querySelectorAll('.section-view.active').forEach(function(v){v.classList.remove('active');});
          var el=document.getElementById('view-cloud_updater');
          if(el){ el.classList.add('active'); InglyCloudSync.render(); return; }
        }
        return _o(s);
      };
    }
    setTimeout(_p,1200);
    setTimeout(function(){ InglyCloudSync.init(); },2000);
  })();

  return _module;
})();

// ─── 2. Fix Etsy Analytics ────────────────────────────────────────
(function _fixEtsyAnalytics(){
  function _p(){
    if(typeof App==='undefined'||!App.renderSection){ setTimeout(_p,700); return; }
    if(App._eaPatch) return;
    App._eaPatch=true;
    var _o=App.renderSection.bind(App);
    App.renderSection=async function(s){
      if(s==='etsy_analytics'||s==='etsyai'||s==='etsy-analytics'){
        document.querySelectorAll('.section-view.active').forEach(function(v){v.classList.remove('active');});
        var el=document.getElementById('view-etsy_analytics')||document.getElementById('view-etsyai');
        if(!el){
          el=document.createElement('div'); el.id='view-etsy_analytics'; el.className='section-view';
          var ci=document.getElementById('content-inner'); if(ci) ci.appendChild(el);
        }
        el.classList.add('active');
        try{
          if(typeof EtsyAnalytics!=='undefined') await EtsyAnalytics.render();
          else {
            el.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-muted)"><div style="font-size:40px;margin-bottom:12px">📊</div><div style="font-size:15px;font-weight:700;margin-bottom:6px">Etsy Analytics</div><div style="font-size:12px">Aggiungi vendite con canale "etsy" o "shop" per visualizzare le statistiche.</div></div>';
          }
        }catch(e){ console.warn('[EtsyAnalytics] render error:', e); }
        return;
      }
      return _o(s);
    };
  }
  setTimeout(_p,1500);
})();

// ─── 3. LaserB2B — Catalogo completo da gadget365.it e fornitori IT ─
(function _populateB2BCatalog(){
  function _p(){
    if(typeof LaserB2B==='undefined'){ setTimeout(_p,800); return; }
    if(LaserB2B._catalogPopulated) return;
    LaserB2B._catalogPopulated=true;

    // Check if user has custom catalog — if yes, keep it
    var customCatalog=localStorage.getItem('lb2b_catalog_v1');
    if(customCatalog){
      try{ LaserB2B._PRODUCTS=JSON.parse(customCatalog); return; }catch(e){}
    }

    // Full product catalog from gadget365.it, higift.it, bsigadget.com, sublimet.com
    var FULL_CATALOG = [
      // ── PORTACHIAVI BAMBÙ (gadget365.it) ──────────────────────────
      {id:'pk_bambu_rot40',  img:'🎋',cat:'Bambù',    name:'Portachiavi Bambù Rotondo 40mm',           cost:0.38, timeMin:1.5, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_bambu_ret',    img:'🎋',cat:'Bambù',    name:'Portachiavi Bambù Rettangolare 55x30mm',   cost:0.42, timeMin:1.5, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_bambu_cuore',  img:'❤️',cat:'Bambù',    name:'Portachiavi Bambù Cuore',                  cost:0.88, timeMin:2.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_bambu_casa',   img:'🏠',cat:'Bambù',    name:'Portachiavi Bambù Forma Casa',             cost:0.85, timeMin:2.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_bambu_stella', img:'⭐',cat:'Bambù',    name:'Portachiavi Bambù Stella',                 cost:0.92, timeMin:2.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_bambu_auto',   img:'🚗',cat:'Bambù',    name:'Portachiavi Bambù Forma Auto',             cost:0.95, timeMin:2.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_bambu_mela',   img:'🍎',cat:'Bambù',    name:'Portachiavi Bambù Mela (Teacher)',         cost:0.95, timeMin:2.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_bambu_farfalla',img:'🦋',cat:'Bambù',   name:'Portachiavi Bambù Farfalla',               cost:0.90, timeMin:2.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_bambu_ancora', img:'⚓',cat:'Bambù',    name:'Portachiavi Bambù Ancora Nautical',        cost:0.88, timeMin:2.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_bambu_mandala',img:'🌸',cat:'Bambù',    name:'Portachiavi Bambù Mandala Rotondo 50mm',   cost:0.95, timeMin:2.5, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      // ── PORTACHIAVI LEGNO (gadget365.it) ─────────────────────────
      {id:'pk_faggio_rot',   img:'🪵',cat:'Legno',    name:'Portachiavi Faggio Rotondo 40mm',          cost:0.52, timeMin:1.5, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_faggio_ret',   img:'🪵',cat:'Legno',    name:'Portachiavi Faggio Rettangolare 60x25mm',  cost:0.58, timeMin:1.5, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_mdf_ret',      img:'🟫',cat:'Legno',    name:'Portachiavi MDF Rettangolare 50x25mm',     cost:0.30, timeMin:1.2, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_mdf_circ',     img:'🟫',cat:'Legno',    name:'Portachiavi MDF Circolare 40mm',           cost:0.28, timeMin:1.2, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_noce',         img:'🌰',cat:'Legno',    name:'Portachiavi Noce Premium 45mm',            cost:1.20, timeMin:1.8, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      // ── PORTACHIAVI ACCIAIO INOX (higift.it + gadget365.it) ──────
      {id:'pk_inox_rot',     img:'⚙️',cat:'Metallo',  name:'Portachiavi Inox Rotondo 30mm Lucidato',   cost:1.20, timeMin:2.5, sup:'higift.it',     url:'https://www.higift.it'},
      {id:'pk_inox_ret',     img:'⚙️',cat:'Metallo',  name:'Portachiavi Inox Rettangolare 55x25mm',   cost:1.35, timeMin:2.5, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_inox_bicolore',img:'✨',cat:'Metallo',  name:'Portachiavi Inox Bicolore 50x30mm',        cost:0.76, timeMin:2.0, sup:'higift.it',     url:'https://www.higift.it'},
      {id:'pk_inox_tag',     img:'🏷️',cat:'Metallo',  name:'Portachiavi Tag Inox Laser-Ready 50x20mm', cost:0.65, timeMin:2.0, sup:'higift.it',     url:'https://www.higift.it'},
      {id:'pk_inox_ovale',   img:'⭕',cat:'Metallo',  name:'Portachiavi Inox Ovale 45x30mm',           cost:1.10, timeMin:2.5, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_allum_col',    img:'🎨',cat:'Metallo',  name:'Portachiavi Alluminio Colorato 60x30mm',   cost:0.83, timeMin:2.0, sup:'higift.it',     url:'https://www.higift.it'},
      {id:'pk_allum_ant',    img:'🔲',cat:'Metallo',  name:'Portachiavi Alluminio Anodizzato Nero',    cost:0.92, timeMin:2.0, sup:'higift.it',     url:'https://www.higift.it'},
      // ── PORTACHIAVI PLEXIGLASS (Artistico.it / Temaplex) ──────────
      {id:'pk_plexi_tr',     img:'💎',cat:'Plexiglass',name:'Portachiavi Plexiglass Trasparente 50mm',  cost:0.80, timeMin:2.0, sup:'temaplex-shop.com',url:'https://temaplex-shop.com'},
      {id:'pk_plexi_oro',    img:'💛',cat:'Plexiglass',name:'Portachiavi Plexiglass Specchiato Oro',   cost:1.50, timeMin:2.0, sup:'temaplex-shop.com',url:'https://temaplex-shop.com'},
      {id:'pk_plexi_silver', img:'🪙',cat:'Plexiglass',name:'Portachiavi Plexiglass Specchiato Silver', cost:1.40, timeMin:2.0, sup:'temaplex-shop.com',url:'https://temaplex-shop.com'},
      {id:'pk_plexi_rosa',   img:'🌸',cat:'Plexiglass',name:'Portachiavi Plexiglass Rosa Fluorescente', cost:1.20, timeMin:2.0, sup:'temaplex-shop.com',url:'https://temaplex-shop.com'},
      {id:'pk_plexi_custom', img:'✂️',cat:'Plexiglass',name:'Portachiavi Plexiglass Forma Custom 3mm',  cost:0.60, timeMin:2.5, sup:'temaplex-shop.com',url:'https://temaplex-shop.com'},
      // ── ALTRI MATERIALI ───────────────────────────────────────────
      {id:'pk_sughero',      img:'🌿',cat:'Sughero',  name:'Portachiavi Sughero Rotondo FSC 40mm',     cost:0.75, timeMin:1.5, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_pelle_nat',    img:'🐄',cat:'Pelle',    name:'Portachiavi Pelle Naturale Tag 50x25mm',   cost:2.50, timeMin:3.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'pk_pelle_grana',  img:'🐄',cat:'Pelle',    name:'Portachiavi Pelle Grana Rotondo 45mm',     cost:2.80, timeMin:3.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      // ── TARGHE E PLACCHE ─────────────────────────────────────────
      {id:'tg_bamboo_s',     img:'🏷️',cat:'Targhe',  name:'Targhetta Bambù 60x30mm con foro',         cost:0.30, timeMin:1.5, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'tg_bamboo_m',     img:'🏷️',cat:'Targhe',  name:'Targhetta Bambù 90x50mm da tavolo',        cost:0.65, timeMin:2.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'tg_inox_s',       img:'🔩',cat:'Targhe',  name:'Placca Inox 80x50mm con bordo lucido',     cost:0.60, timeMin:3.0, sup:'higift.it',     url:'https://www.higift.it'},
      {id:'tg_inox_m',       img:'🔩',cat:'Targhe',  name:'Placca Inox 120x80mm professionale',       cost:1.20, timeMin:4.0, sup:'higift.it',     url:'https://www.higift.it'},
      {id:'tg_allum_adesiva',img:'🔖',cat:'Targhe',  name:'Targa Alluminio Adesiva 100x50mm',         cost:0.50, timeMin:2.5, sup:'higift.it',     url:'https://www.higift.it'},
      {id:'tg_legno_uff',    img:'🗒️',cat:'Targhe',  name:'Targhetta Legno Ufficio 120x50mm',         cost:1.50, timeMin:2.5, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      // ── GADGET E PREMI ────────────────────────────────────────────
      {id:'medaglia_30',     img:'🏅',cat:'Premi',   name:'Medaglia Alluminio Ø50mm con nastrino',    cost:1.50, timeMin:3.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'medaglia_50',     img:'🏅',cat:'Premi',   name:'Medaglia Alluminio Ø70mm trofeo',          cost:2.20, timeMin:3.5, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'trofeo_legno',    img:'🏆',cat:'Premi',   name:'Trofeo Legno MDF 150x80mm con base',       cost:2.80, timeMin:5.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'penna_met',       img:'🖊️',cat:'Gadget',  name:'Penna Metallo Laser-Engravable Argento',   cost:1.80, timeMin:3.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'penna_bambu',     img:'✏️',cat:'Gadget',  name:'Penna Bambù Naturale Bio-Friendly',        cost:0.95, timeMin:2.5, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'usb_legno',       img:'💾',cat:'Gadget',  name:'Chiavetta USB 16GB Bambu/Legno 50x20mm',   cost:4.50, timeMin:3.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'calamita_tonda',  img:'🧲',cat:'Gadget',  name:'Calamita Rotonda Ø55mm Sub/Laser',         cost:0.45, timeMin:1.5, sup:'sublimet.com',  url:'https://www.sublimet.com'},
      {id:'calamita_bambu',  img:'🧲',cat:'Gadget',  name:'Calamita Bambù Rettangolare 70x40mm',      cost:0.55, timeMin:1.8, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'spilla_metallo',  img:'📌',cat:'Gadget',  name:'Spilla Metallo Ø30mm Laser Engravable',    cost:0.80, timeMin:2.0, sup:'higift.it',     url:'https://www.higift.it'},
      {id:'bracciale_bambu', img:'💚',cat:'Gadget',  name:'Braccialetto Bambù piatto 180x15mm',       cost:0.65, timeMin:2.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      // ── ARTICOLI DA TAVOLA / CUCINA ─────────────────────────────
      {id:'tagliere_bambu_s',img:'🍽️',cat:'Casa/Cucina',name:'Tagliere Bambù S 20x15cm incidibile',   cost:2.50, timeMin:5.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'tagliere_bambu_m',img:'🍽️',cat:'Casa/Cucina',name:'Tagliere Bambù M 30x20cm premium',     cost:3.80, timeMin:6.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'tagliere_cuore',  img:'❤️',cat:'Casa/Cucina',name:'Tagliere Bambù Cuore 25x22cm regalo',  cost:4.20, timeMin:6.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'sottobicchiere',  img:'☕',cat:'Casa/Cucina',name:'Sottobicchiere Bambù Rotondo Ø10cm',    cost:0.48, timeMin:1.5, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      {id:'portapenne_bambu',img:'✏️',cat:'Casa/Cucina',name:'Portapenne Bambù Cilindrico incidibile',cost:1.80, timeMin:4.0, sup:'gadget365.it',  url:'https://www.gadget365.it'},
      // ── SUBLIMAZIONE (sublimet.com) ──────────────────────────────
      {id:'tazza_sub_bl',    img:'☕',cat:'Sublimazione',name:'Tazza Ceramica Bianca 11oz Sub-Ready',  cost:1.47, timeMin:0.5, sup:'sublimet.com',  url:'https://www.sublimet.com'},
      {id:'tazza_sub_col',   img:'🌈',cat:'Sublimazione',name:'Tazza Ceramica Colorata Interno 11oz', cost:1.75, timeMin:0.5, sup:'sublimet.com',  url:'https://www.sublimet.com'},
      {id:'cuscino_sub',     img:'🛋️',cat:'Sublimazione',name:'Cuscino Poliestere 40x40cm Sub',       cost:2.10, timeMin:0.5, sup:'sublimet.com',  url:'https://www.sublimet.com'},
      {id:'puzzle_sub',      img:'🧩',cat:'Sublimazione',name:'Puzzle 30x42cm 120 pz Sub',            cost:2.90, timeMin:0.5, sup:'sublimet.com',  url:'https://www.sublimet.com'},
      {id:'pannello_mdf_sub',img:'🖼️',cat:'Sublimazione',name:'Pannello MDF Bianco A4 Sub/Laser',     cost:1.20, timeMin:0.5, sup:'sublimet.com',  url:'https://www.sublimet.com'},
      {id:'bottiglia_sub',   img:'🍶',cat:'Sublimazione',name:'Borraccia Alluminio 500ml Sub',         cost:2.80, timeMin:0.5, sup:'sublimet.com',  url:'https://www.sublimet.com'},
    ];

    LaserB2B._PRODUCTS = FULL_CATALOG;
    // Save as custom catalog so it persists
    try{ localStorage.setItem('lb2b_catalog_v1', JSON.stringify(FULL_CATALOG)); }catch(e){}
    console.log('[LaserB2B] Catalog populated: '+FULL_CATALOG.length+' products');
  }
  setTimeout(_p, 2500);
})();

console.log('[INGLY v22] Patches loaded: CloudSync ✅ EtsyAnalytics ✅ B2BCatalog ✅');

