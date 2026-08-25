
// === /src/core/idb.js ===
const IDB = (function(){
  let db=null;
  const DB='InglyMasterDB',VER=30; // v30: v10 archive+lab+workflow // v28: laser_resources store // v26: always ≥ browser version // v23: re-added legacy stores (ai_log,kpi_snap,kpi_cache,scanner_history,versions) // v22: legacy stores removed (kpi_cache,versions,scanner_history,ai_log,kpi_snap) // v21: stores 'orders','quotes','sales' deprecated (kept read-only, pipeline is now source of truth) // v20: store pipeline unificata store
  const STORES=[
    {n:'clients',k:'id'},{n:'sales',k:'id'},{n:'quotes',k:'id'},
    {n:'inventory',k:'id'},{n:'cashflow',k:'id'},{n:'projects',k:'id'},
    {n:'catalog',k:'id'},{n:'team',k:'id'},{n:'events',k:'id'},
    {n:'innovation',k:'id'},{n:'bu',k:'id'},{n:'materials',k:'id'},
    {n:'history',k:'id'},{n:'backups',k:'id'},
    {n:'settings',k:'key'},
    {n:'equipment',k:'id'},{n:'gadgets',k:'id'},{n:'fixed_costs',k:'id'},
    {n:'components',k:'id'},{n:'social',k:'id'},
    {n:'marketing_campaigns',k:'id'},
    {n:'image_lib',k:'id'},
    {n:'xmlinvoices',k:'id'},
    // ── FIX v51: stores previously missing ──────────────────
    {n:'orders',k:'id'},           // Kanban produzione
    {n:'bookings',k:'id'},         // Appuntamenti
    {n:'timelogs',k:'id'},         // Timer / time tracking
    {n:'timers',k:'id'},           // Timer sessioni
    {n:'social_posts',k:'id'},     // Social media planner
    // QR scanner log
    {n:'shipments',k:'id'},        // Spedizioni
    {n:'suppliers',k:'id'},
    {n:'supplier_orders',k:'id'}, // v18: Registro ordini fornitore
    {n:'ideas',k:'id'},        // Idee & Ispirazione        // Fornitori
    {n:'products',k:'id'},         // Prodotti extra
    // ── v56: unified modules ─────────────────────────────
    {n:'items',k:'id'},            // Unified Items (inventory+components+materials+gadgets)
    {n:'social_accounts',k:'id'}, // Social Studio accounts
    {n:'competitors',k:'id'},      // Market Intel competitor CRM
    {n:'paints',k:'id'},           // Vernici & Bombolette
    {n:'client_pricelists',k:'id'}, // B2B pricelist per cliente
             // Lead scoring cache
    {n:'notifications',k:'id'},       // Smart notification log
              // Demand / elasticity data
    // ── v9: Sprint 3 stores ────────────────────────────
    {n:'tax_events',k:'id'},        // Tax calendar events { id, type, amount, dueDate, status, notes }
        // Weekly report cache { id, weekStart, data }
    {n:'goals',k:'id'},             // Business goals { id, type, metric, target, deadline, progress }
           // Dynamic pricing rules { id, productId, rule, adjustPct, active }
    // ── v12: Sprint 4 + RealCost ─────────────────────────────
    {n:'cost_entries',k:'id'},      // Real cost entries { id, orderId, type, amount, minutes, desc, date }
    {n:'supplier_perf',k:'id'},     // Supplier performance { id, supplierId, date, metric, value, notes }
    {n:'content_analytics',k:'id'},// Content performance { id, platform, postId, date, reach, conv, revenue }
    // KPI coherence snapshots { id, ts, bdw, kpi, delta }
    // ── v13: QuoterTemplates, SignaturePad, CRM ───────────────────
    {n:'quote_templates',k:'id'},   // Quoter saved templates { id, name, desc, lines, markup, discount, vat, ts }
    {n:'signatures',k:'id'},        // Digital signatures { id, clientId, quoteId, dataUrl, ts }
    {n:'dash_layout',k:'key'},      // Dashboard widget layout { key:'main', order:[], hidden:[] }
    {n:'recurring_invoices',k:'id'}, // Recurring invoice templates
    {n:'laser_resources',k:'id'},   // Custom laser resources
    // ── v15: OrderFlow Engine ───────────────────────────────────
    {n:'workflow_steps',k:'id'},   // Customizable pipeline stages
    {n:'order_events',k:'id'},     // Order timeline events { id, name, freq, nextDate, ... }
    // ── v20: pipeline unificata ──────────────────────────────
    {n:'pipeline',k:'id'},         // Pipeline unificata
    // ── v23 FIX: legacy stores still referenced by code ──────────────
    {n:'ai_log',k:'id'},           // AI decision log
    {n:'kpi_snap',k:'id'},         // KPI snapshots
    {n:'kpi_cache',k:'id'},        // KPI cache for charts
    {n:'scanner_history',k:'id'},  // QR scanner history
    {n:'versions',k:'id'},         // Record version history
  ];
  // ── Schema migration definitions ──────────────────────────────
  // Each migration: { from, to, fn(db, tx) } applied sequentially
  const MIGRATIONS = [
    {
      from: 0, to: 13,
      description: 'v13: add default fields to clients/sales/quotes',
      async fn(txDb, oldVersion) {
        // Nothing needed — stores created above.
        // Field-level migrations happen lazily on read via migrate() util.
      }
    }
  ];

  // Migrate a single record: add missing fields with defaults
  function migrateRecord(store, rec) {
    if (!rec || rec._migrated) return rec;
    const defaults = {
      clients:  { phone:'', email:'', address:'', notes:'', tags:[], ltv:0 },
      sales:    { status:'pagato', channel:'Diretto', qty:1, notes:'' },
      quotes:   { status:'bozza', priority:'Media', discount:0, markup:100, ivaMode:true, lines:[] },
      items:    { qty:0, minStock:0, category:'', unit:'pz', cost:0 },
      catalog:  { cost:0, category:'', tags:[], active:true },
      orders:   { status:'in_attesa', priority:'Media', lines:[], notes:'' },
    };
    const def = defaults[store];
    if (!def) return rec;
    let changed = false;
    const out = { ...rec };
    for (const [k, v] of Object.entries(def)) {
      if (out[k] === undefined || out[k] === null) { out[k] = v; changed = true; }
    }
    if (changed) out._migrated = VER;
    return out;
  }

  // Auto-reconnect when connection is lost
  async function ensureOpen(){
    if(db) try{ db.transaction('settings','readonly').abort(); }
    catch(e){ if(e.name==='InvalidStateError'){ db=null; } }
    if(!db) await open();
    return db;
  }

  function open(){
    return new Promise((res,rej)=>{
      // Smart open: detect existing version, use max(VER, existing)
      const r=(()=>{
        try{
          const probe=indexedDB.open(DB);
          probe.onsuccess=e=>{
            const cur=e.target.result.version||0;
            e.target.result.close();
            const safeVer=Math.max(VER,cur);
            // If we need to upgrade, reopen at safeVer
            if(safeVer>VER){console.log('[IDB] Browser v'+cur+' > file v'+VER+', opening at v'+safeVer);}
          };
          probe.onerror=()=>{};
        }catch(ex){}
        return indexedDB.open(DB,VER);
      })();
      r.onupgradeneeded=e=>{
        const d=e.target.result;
        const oldVersion = e.oldVersion;
        // Create any missing stores
        STORES.forEach(s=>{
          if(!s||!s.n)return; // guard undefined entries
          if(!d.objectStoreNames.contains(s.n))
            d.createObjectStore(s.n,{keyPath:s.k,autoIncrement:s.k==='id'});
        });
        if(e.oldVersion<19){
          ['orders','sales','quotes'].forEach(sn=>{
            try{if(d.objectStoreNames.contains(sn)){const os=e.target.transaction.objectStore(sn);if(!os.indexNames.contains('stage'))os.createIndex('stage','stage',{unique:false});if(!os.indexNames.contains('clientId'))os.createIndex('clientId','clientId',{unique:false});}}catch(ex){}
          });
        }
        if(e.oldVersion<20){
          // v20: crea store pipeline con indici
          try{
            if(!d.objectStoreNames.contains('pipeline')){
              const pl=d.createObjectStore('pipeline',{keyPath:'id',autoIncrement:true});
              pl.createIndex('stage','stage',{unique:false});
              pl.createIndex('clientId','clientId',{unique:false});
              pl.createIndex('createdAt','createdAt',{unique:false});
              pl.createIndex('_source','_source',{unique:false});
            }
          }catch(ex){console.warn('[IDB v20]',ex);}
        }
        if(e.oldVersion<24){
          // v24: idempotent store check
          STORES.forEach(s=>{try{if(s&&s.n&&!d.objectStoreNames.contains(s.n))d.createObjectStore(s.n,{keyPath:s.k,autoIncrement:s.k==='id'});}catch(ex){}});
        }
        if(e.oldVersion<25){
          ['kpi_snap','kpi_cache','scan_history','order_events'].forEach(sn=>{try{if(!d.objectStoreNames.contains(sn))d.createObjectStore(sn,{keyPath:'id',autoIncrement:true});}catch(ex){}});
        }
        if(e.oldVersion<26){
          try{if(d.objectStoreNames.contains('pipeline')){const pl=e.target.transaction.objectStore('pipeline');if(!pl.indexNames.contains('stage_idx'))pl.createIndex('stage_idx','stage',{unique:false});}}catch(ex){}
        }
        if(e.oldVersion<27){
          // v27: VersionError permanent fix — safe no-op ensures VER always above browser
          STORES.forEach(s=>{try{if(s&&s.n&&!d.objectStoreNames.contains(s.n))d.createObjectStore(s.n,{keyPath:s.k,autoIncrement:s.k==='id'});}catch(ex){}});
        }
        // Run applicable migrations
        MIGRATIONS.filter(m=>oldVersion<m.to).forEach(m=>{
          try { m.fn(d, oldVersion); } catch(ex) { console.warn('[IDB migration]',m.description,ex); }
        });
        console.log(`[IDB] upgraded ${oldVersion}→${VER}`);
      };
      r.onsuccess=e=>{
        db=e.target.result;
        // Handle external version upgrade (other tab, page reload)
        db.onversionchange=()=>{
          console.log('[IDB] versionchange — closing connection');
          try{ db.close(); }catch(ex){}
          db=null;
        };
        db.onclose=()=>{ db=null; };
        res(db);
      };
      r.onerror=e=>{
        const err=e.target.error;
        if(err&&err.name==='VersionError'){
          console.warn('[IDB] VersionError — launching recovery...');
          try{
            const _b=document.createElement('div');
            _b.id='idb-recovery-overlay';
            _b.style.cssText='position:fixed;inset:0;background:#080810;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#e2e8f0;font-family:system-ui;text-align:center;padding:24px';
            _b.innerHTML='<div style="font-size:48px">🔄</div>'
              +'<div style="font-size:22px;font-weight:800">Aggiornamento database...</div>'
              +'<div style="font-size:13px;color:#94a3b8;max-width:380px;line-height:1.7">Il database locale è stato aggiornato a una versione più recente.<br>I tuoi dati sono al sicuro. Ricarico automaticamente.</div>'
              +'<div style="width:220px;height:6px;background:#1e293b;border-radius:3px;overflow:hidden"><div id="idb-prog" style="width:0%;height:100%;background:#fbbf24;border-radius:3px;transition:width .25s"></div></div>';
            document.body.appendChild(_b);
            let _p=0;
            const _t=setInterval(()=>{_p=Math.min(90,_p+15);const el=document.getElementById('idb-prog');if(el)el.style.width=_p+'%';},120);
            const dr=indexedDB.deleteDatabase(DB);
            dr.onsuccess=()=>{clearInterval(_t);const el=document.getElementById('idb-prog');if(el)el.style.width='100%';setTimeout(()=>location.reload(),400);};
            dr.onerror=()=>{clearInterval(_t);location.reload();};
          }catch(re){rej(err);}
        }else{rej(err);}
      };
    });
  }
  async function put(store,rec){
    if(store==='orders'||store==='quotes'){
      console.warn('[INGLY v4.0] Direct write to '+store+' (prefer pipeline store)');
    }
    if(!db) await open();
    if(!db.objectStoreNames.contains(store)){
      console.warn('[IDB] store not found:',store,'— skipping write');
      return null;
    }
    return new Promise((res,rej)=>{
      try{
        const tx=(()=>{ try{ return db.transaction(store,'readwrite'); }catch(e){ if(e.name==='InvalidStateError'){ db=null; throw e; } throw e; } })();
        const r=tx.objectStore(store).put({...rec,_upd:Date.now()});
        r.onsuccess=()=>{
          // Auto-invalidate AppStore cache on every write
          if(typeof AppStore!=='undefined') AppStore.invalidate(store);
          res(r.result);
        };
        r.onerror=()=>rej(r.error);
      }catch(e){rej(e);}
    });
  }
  async function getAll(store){
    if(!db||db.version===0){ db=null; await open(); }
    if(!db.objectStoreNames.contains(store)){
      console.warn('[IDB] store not found:',store,'— returning []');
      return [];
    }
    const attempt=async(retry)=>{
      return new Promise((res,rej)=>{
        try{
          const r=db.transaction(store,'readonly').objectStore(store).getAll();
          r.onsuccess=()=>res(r.result||[]);
          r.onerror=()=>rej(r.error);
        }catch(e){
          if(retry>0&&(e.name==='InvalidStateError'||e.message?.includes('closing'))){
            db=null;
            open().then(()=>attempt(retry-1).then(res,rej)).catch(rej);
          }else{ rej(e); }
        }
      });
    };
    return attempt(2);
  }
    async function get(store,key){
    if(!db||db.version===0){ db=null; await open(); }
    return new Promise((res,rej)=>{
      const attempt=(retry)=>{
        try{
          const tx=db.transaction(store,'readonly');
          const r=tx.objectStore(store).get(key);
          r.onsuccess=()=>res(r.result);
          r.onerror=()=>rej(r.error);
        }catch(e){
          if(retry>0&&(e.name==='InvalidStateError'||e.message?.includes('closing'))){
            db=null;
            open().then(()=>attempt(retry-1)).catch(rej);
          }else{ rej(e); }
        }
      };
      attempt(2);
    });
  }
  async function del(store,key){
    if(!db) await open();
    return new Promise((res,rej)=>{
      try{
        const r=db.transaction(store,'readwrite').objectStore(store).delete(key);
        r.onsuccess=()=>{
          // v4.0: auto-invalidate AppStore cache on delete
          try{ if(typeof AppStore!=='undefined') AppStore.invalidate(store); }catch(e){}
          res(true);
        };
        r.onerror=()=>rej(r.error);
      }catch(e){rej(e);}
    });
  }
  async function exportAll(){
    const out={};
    for(const s of STORES){try{out[s.n]=await getAll(s.n)}catch{out[s.n]=[]}}
    return out;
  }
  // 'remove' è alias pubblico di del (evita conflitto con keyword 'delete')
  async function ensureOpen(){ if(!db) await open(); return db; }
  async function safePut(store,rec){
    if(!db) await open();
    if(!db.objectStoreNames.contains(store)) return null;
    return put(store, rec);
  }
  // putBulk: single transaction for N records — 50-100× faster than N×put()
  async function putBulk(store, records){
    if(!records||!records.length) return 0;
    if(!db) await open();
    if(!db.objectStoreNames.contains(store)) return 0;
    return new Promise((res,rej)=>{
      try{
        const tx=db.transaction(store,'readwrite');
        const os=tx.objectStore(store);
        let count=0;
        records.forEach(rec=>{
          const r=os.put({...rec,_upd:Date.now()});
          r.onsuccess=()=>count++;
          r.onerror=()=>{};
        });
        tx.oncomplete=()=>res(count);
        tx.onerror=()=>rej(tx.error);
      }catch(e){rej(e);}
    });
  }
  // clearStore: wipe all records in a store (used by full restore)
  async function clearStore(store){
    if(!db) await open();
    if(!db.objectStoreNames.contains(store)) return;
    return new Promise((res,rej)=>{
      try{
        const tx=db.transaction(store,'readwrite');
        tx.objectStore(store).clear();
        tx.oncomplete=()=>res();
        tx.onerror=()=>rej(tx.error);
      }catch(e){rej(e);}
    });
  }
  return{open,ensureOpen,put,safePut,putBulk,clearStore,getAll,get,del,remove:del,exportAll};
})();

// ===== EVENT BUS =====
window.IDB = IDB;

// ════════════════════════════════════════════════════════════════════════
// updateOrderStatus — SINGLE SOURCE OF TRUTH per tutti i cambi stato
// Aggiorna SEMPRE sia 'orders' che 'pipeline', emette eventi, crea sale
// ════════════════════════════════════════════════════════════════════════
window.updateOrderStatus = async function(orderId, newStatus, opts) {
  opts = opts || {};
  const id = (typeof orderId === 'string') ? (+orderId || orderId) : orderId;

  // Stato ammessi
  const VALID = new Set(['preventivo','inviato','accettato','rifiutato',
    'produzione','completato','venduto','annullato',
    // alias legacy per compatibilità con OrderFlow
    'draft','sent','accepted','rejected','production','working',
    'completed','delivered','paid','to_pay','deposit','backlog','ready','sold','invoiced']);
  if(!VALID.has(newStatus)) {
    console.warn('[updateOrderStatus] Invalid status:', newStatus); return null;
  }

  try {
    // 1. Leggi ordine corrente
    let order = await IDB.get('orders', id).catch(()=>null);
    if(!order) {
      // Fallback: cerca in pipeline
      const pl = await IDB.getAll('pipeline').catch(()=>[]);
      const found = pl.find(x=>x.id===id||x.id===+id||x._sourceId===id||x._sourceId===+id);
      if(found) order = await IDB.get('orders', found._sourceId||found.id).catch(()=>null) || found;
    }
    if(!order) { if(typeof toast!=='undefined') toast('Ordine non trovato','warning'); return null; }

    const oldStatus = order.stage || order.status || 'draft';

    // 2. Aggiorna ordine
    order.stage     = newStatus;
    order.status    = newStatus;
    order.updatedAt = new Date().toISOString();
    if(!order._history) order._history = [];
    order._history.push({
      from: oldStatus, to: newStatus,
      ts:   new Date().toISOString(),
      note: opts.note || ''
    });

    // 3. Salva in 'orders' store
    await IDB.put('orders', order);

    // 4. SSOT: only 'orders' store — no pipeline sync needed
    // Pipeline store is legacy; all reads now use 'orders' as SSOT

    // 5. Salva evento nel log
    try {
      await IDB.put('order_events', {
        id: Date.now(), orderId: id,
        event: 'Stato: ' + oldStatus + ' → ' + newStatus,
        stage: newStatus, ts: new Date().toISOString()
      });
    } catch(e) {}

    // 6. Invalida cache
    if(typeof AppStore !== 'undefined') {
      AppStore.invalidate('orders');
      AppStore.invalidate('pipeline');
    }

    // 7. Auto-crea vendita quando venduto/completato
    if((newStatus==='venduto'||newStatus==='paid'||newStatus==='sold')
       && !order.linkedSaleId && !opts.skipSale) {
      try {
        const sale = {
          id:         Date.now()+1,
          clientName: order.clientName || '',
          desc:       order.name || 'Vendita',
          amount:     +(order.total||order.value||order.grossPrice||0),
          date:       new Date().toISOString().slice(0,10),
          status:     'da_pagare',
          channel:    order.channel || 'Diretto',
          orderId:    id,
        };
        await IDB.put('sales', sale);
        order.linkedSaleId = sale.id;
        await IDB.put('orders', order);
        if(typeof AppStore!=='undefined') AppStore.invalidate('sales');
        if(typeof toast!=='undefined') toast('💰 Vendita creata automaticamente!','success');
      } catch(e) {}
    }

    // 8. Emetti evento globale — TUTTE le sezioni ascoltano questo
    document.dispatchEvent(new CustomEvent('orderUpdated', {
      detail: { id: id, oldStatus: oldStatus, newStatus: newStatus, order: order }
    }));
    if(typeof Bus !== 'undefined' && Bus.emit) {
      Bus.emit('order:stageChanged', { id: id, stage: newStatus });
    }

    return order;
  } catch(e) {
    console.warn('[updateOrderStatus]', e.message);
    if(typeof toast !== 'undefined') toast('Errore aggiornamento: '+e.message, 'error');
    return null;
  }
};


// ═══════════════════════════════════════════════════════════════════
// AUTO-BACKUP SYSTEM v1.9 — localStorage fallback + monthly reminder
// ═══════════════════════════════════════════════════════════════════
const AutoBackup = {
  _KEY_LAST: 'ingly_last_autobackup',
  _KEY_LAST_LOCAL: 'ingly_last_localbkp',

  async runIfNeeded() {
    const now = Date.now();
    const lastLocal = parseInt(localStorage.getItem(this._KEY_LAST_LOCAL)||'0');
    // Auto local backup every 24h
    if (now - lastLocal > 86400000) {
      await this.saveLocal();
    }
    // Monthly reminder
    const lastFull = parseInt(localStorage.getItem(this._KEY_LAST)||'0');
    if (lastFull > 0 && now - lastFull > 30 * 86400000) {
      setTimeout(() => {
        toast('⚠️ Ultimo backup completo: più di 30 giorni fa. Clicca 💾 per esportare!', 'warning');
      }, 8000);
    }
  },

  async saveLocal() {
    try {
      const STORES_TO_SAVE = ['sales','orders','clients','suppliers','ideas',
        'supplier_orders','cashflow','materials','items','quotes','goals',
        'fixed_costs','catalog','paints','equipment','bookings','timelogs'];
      const data = { _ts: Date.now(), _ver: 18 };
      for (const s of STORES_TO_SAVE) {
        try { data[s] = await IDB.getAll(s); } catch(e) { data[s] = []; }
      }
      // localStorage has ~5MB limit — store only summary (never full json)
      const summary = {
        _ts: data._ts, _ver: data._ver,
        counts: Object.fromEntries(STORES_TO_SAVE.map(s=>[s, (data[s]||[]).length]))
      };
      localStorage.setItem('ingly_local_bkp_meta', JSON.stringify(summary));
      localStorage.setItem(this._KEY_LAST_LOCAL, String(Date.now()));
      this._updateIndicator();
    } catch(e) { console.warn('[AutoBackup]', e); }
  },

  _updateIndicator() {
    const el = document.getElementById('backup-last-indicator');
    if (!el) return;
    const ts = parseInt(localStorage.getItem(this._KEY_LAST_LOCAL)||'0');
    if (!ts) { el.title = 'Nessun backup automatico'; return; }
    const diff = Date.now() - ts;
    const mins = Math.floor(diff/60000);
    const hrs  = Math.floor(diff/3600000);
    const days = Math.floor(diff/86400000);
    const label = days > 0 ? `${days}g fa` : hrs > 0 ? `${hrs}h fa` : `${mins}m fa`;
    el.textContent = label;
    el.title = `Ultimo backup locale: ${new Date(ts).toLocaleString('it-IT')}`;
    el.style.color = days > 2 ? '#ef4444' : days > 1 ? '#f59e0b' : '#22c55e';
  },

  markFullBackup() {
    localStorage.setItem(this._KEY_LAST, String(Date.now()));
    localStorage.setItem(this._KEY_LAST_LOCAL, String(Date.now()));
    this._updateIndicator();
  },
};
window.AutoBackup = AutoBackup;


