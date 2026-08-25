
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v10 — PIPELINE LAVORI PRO PATCH
// Fix: overdue logic · archivio automatico · workflow fluido · tab archivio
// ════════════════════════════════════════════════════════════════════════

(function patchPipelinePro(){
  const ARCHIVE_DAYS = 3;   // auto-archive after N days from delivered/sold/invoiced

  // ── TERMINAL STAGES: these are DONE — never "overdue" ─────────────
  const DONE_STAGES = new Set([
    'paid','delivered','sold','invoiced','completed','rejected','lost',
    'cancelled','archived','done','closed'
  ]);

  // ── ARCHIVE KEY ────────────────────────────────────────────────────
  const ARCHIVE_SK = 'ingly_pipeline_archive_v1';
  const getArchive  = () => { try{return JSON.parse(localStorage.getItem(ARCHIVE_SK)||'[]');}catch{return[];} };
  const saveArchive = (a) => { try{localStorage.setItem(ARCHIVE_SK,JSON.stringify(a));}catch{} };

  window.PipelineArchive = {
    get: getArchive,
    add(order) {
      const a = getArchive();
      if(!a.find(o=>String(o.id)===String(order.id))) {
        a.unshift({...order, _archivedAt: new Date().toISOString()});
        saveArchive(a.slice(0,500));
      }
    },
    remove(id){ saveArchive(getArchive().filter(o=>String(o.id)!==String(id))); },
    clear(){ localStorage.removeItem(ARCHIVE_SK); },
  };

  // ── AUTO-ARCHIVE: move done orders to archive ──────────────────────
  async function autoArchive() {
    try {
      const orders = await IDB.getAll('orders').catch(()=>[]);
      const now = Date.now();
      const toArchive = orders.filter(o => {
        if(!DONE_STAGES.has(o.stage||o.status||'')) return false;
        // Check age: only archive if > ARCHIVE_DAYS since last update
        const lastUpdate = new Date(o.soldAt||o.invoicedAt||o.deliveredAt||o.updatedAt||o.paidAt||0).getTime();
        return lastUpdate > 0 && (now - lastUpdate) > ARCHIVE_DAYS * 86400000;
      });
      for(const o of toArchive) {
        PipelineArchive.add(o);
        // Mark as archived in IDB (keep record but flag it)
        o._archived = true;
        o._archivedAt = new Date().toISOString();
        await IDB.put('orders', o);
      }
      if(toArchive.length > 0) {
        AppStore.invalidate('orders');
        AppStore.invalidate('pipeline');
        console.log(`[Pipeline] Auto-archived ${toArchive.length} completed orders`);
      }
      return toArchive.length;
    } catch(ex) { console.warn('[autoArchive]', ex); return 0; }
  }
  window.autoArchive = autoArchive;

  // ── FILTER ORDERS for active view (exclude archived + done) ───────
  function filterActiveOrders(orders) {
    return (orders||[]).filter(o => {
      if(o._archived) return false;
      const stage = o.stage||o.status||'backlog';
      if(DONE_STAGES.has(stage)) return false;
      return true;
    });
  }

  // ── OVERDUE: only count orders that are actually ACTIVE ────────────
  function getOverdue(orders) {
    const now = new Date();
    return filterActiveOrders(orders).filter(o =>
      o.dueDate && new Date(o.dueDate) < now
    );
  }

  // ── PATCH PipelineOS when it's available ───────────────────────────
  const tryPatch = () => {
    if(typeof PipelineOS === 'undefined') return setTimeout(tryPatch, 600);

    // 1. Patch _renderKPIs to use correct overdue logic
    const origKPIs = PipelineOS._renderKPIs.bind(PipelineOS);
    PipelineOS._renderKPIs = function(orders, sales) {
      // Filter out archived+done BEFORE computing KPIs
      const activeOrders = filterActiveOrders(orders||[]);
      const now = new Date();
      const inProd    = activeOrders.filter(o=>['production','working','in_lavorazione'].includes(o.stage||o.status||''));
      const overdue   = activeOrders.filter(o=>o.dueDate&&new Date(o.dueDate)<now);
      const toDeliver = activeOrders.filter(o=>['ready','completed','delivery','pronto'].includes(o.stage||o.status||''));

      const el = eid('pos-kpis');
      if(!el) return;
      const toPayVal  = activeOrders.filter(o=>['to_pay','deposit'].includes(o.stage||''))
        .reduce((a,o)=>a+(+o.total||+o.value||0),0)
        + (sales||[]).filter(s=>s.status==='da_pagare').reduce((a,s)=>a+(+s.amount||0),0);
      const paidM = (orders||[]).filter(o=>{
        const stage=o.stage||o.status||'';
        if(!['paid','sold','invoiced'].includes(stage)) return false;
        const d=new Date(o.paidAt||o.soldAt||o.updatedAt||0), n=new Date();
        return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();
      }).reduce((a,o)=>a+(+o.total||+o.value||0),0);

      const badge = eid('pos-order-badge');
      if(badge) badge.textContent = activeOrders.length + ' attivi';

      const kpis = [
        {ico:'fa-fire',       label:'Lavori Attivi',   val:activeOrders.length, sub:inProd.length+' in produzione',   color:'var(--primary)',  bg:'var(--primary-dim)'},
        {ico:'fa-clock',      label:'In Ritardo',      val:overdue.length,      sub:overdue.length?'⚠️ richiede azione':'tutto ok', color:overdue.length?'var(--red)':'var(--green)', bg:overdue.length?'#ef444415':'#22c55e15'},
        {ico:'fa-shipping-fast',label:'Da Consegnare', val:toDeliver.length,    sub:'pronti: '+toDeliver.length+' in consegna', color:'#6366f1', bg:'#6366f115'},
        {ico:'fa-euro-sign',  label:'Da Incassare',    val:fmtCur?fmtCur(Math.max(0,toPayVal)):('€'+Math.max(0,toPayVal).toFixed(0)), sub:'fatture + acconti', color:'var(--orange)', bg:'#f9731615'},
        {ico:'fa-check-circle',label:'Incassato Mese', val:fmtCur?fmtCur(paidM):('€'+paidM.toFixed(0)), sub:new Date().toLocaleDateString('it-IT',{month:'long'}), color:'var(--green)', bg:'#22c55e15'},
        ...(overdue.length>0?[{ico:'fa-exclamation-triangle',label:'Scaduti',val:overdue.length,sub:'richiedono attenzione',color:'#b91c1c',bg:'#ef444415'}]:[]),
      ];

      el.innerHTML = kpis.map(k=>`<div class="kpi-card" style="border-left:3px solid ${k.color};cursor:default">
        <i class="fas ${k.ico}" style="font-size:16px;color:${k.color};margin-bottom:4px"></i>
        <div class="kpi-value" style="color:${k.color}">${k.val}</div>
        <div class="kpi-label">${k.label}</div>
        <div style="font-size:9px;color:var(--text-dim);margin-top:2px">${k.sub}</div>
      </div>`).join('');
    };

    // 2. Patch _renderCoda to exclude archived/done orders
    const origCoda = PipelineOS._renderCoda?.bind(PipelineOS);
    if(origCoda) {
      PipelineOS._renderCoda = function(orders) {
        return origCoda(filterActiveOrders(orders||[]));
      };
    }

    // 3. Patch _renderCalendar to exclude archived/done orders AND fix overdue coloring
    const origCal = PipelineOS._renderCalendar?.bind(PipelineOS);
    if(origCal) {
      PipelineOS._renderCalendar = async function(orders) {
        return origCal(filterActiveOrders(orders||[]));
      };
    }

    // 4. Patch _renderProduzione to exclude archived/done
    const origProd = PipelineOS._renderProduzione?.bind(PipelineOS);
    if(origProd) {
      PipelineOS._renderProduzione = function(orders) {
        return origProd(filterActiveOrders(orders||[]));
      };
    }

    // 5. Patch render() to include archive tab and inject it
    const origRender = PipelineOS.render.bind(PipelineOS);
    PipelineOS.render = async function() {
      await origRender();
      // Inject archive tab if not present
      setTimeout(()=> PipelineArchivePatch.injectTab(), 200);
    };

    // Run auto-archive on load
    setTimeout(()=> autoArchive().then(n=>{ if(n>0&&typeof PipelineOS!=='undefined') (async()=>{try{if(typeof PipelineOS!=='undefined')await PipelineOS.render();}catch(e){}}) (); }), 2500);

    console.log('[PipelinePro] Patched ✅');
  };
  setTimeout(tryPatch, 1200);

  // ── PATCH checkDeadlines to exclude done/archived orders ────────────
  const patchDeadlineBanner = () => {
    // Override the setInterval that calls checkDeadlines
    // We need to redefine checkDeadlines after it's already set
    // The actual fix: catch the banner creation and filter
    const origBodyAppend = document.body.appendChild?.bind(document.body);
    // Instead, patch at the AppStore level to filter orders
  };
  // The real fix for deadline banner: it reads from AppStore which will
  // now return filtered orders through the AppStore.get patch
  const origAppStoreGet = AppStore?.get?.bind(AppStore);
  if(origAppStoreGet && AppStore) {
    const _origGet = AppStore.get.bind(AppStore);
    AppStore.get = async function(key) {
      const result = await _origGet(key);
      // For orders store: filter out archived items
      if(key === 'orders' && Array.isArray(result)) {
        return result.filter(o => !o._archived);
      }
      return result;
    };
  }
})();


// ════════════════════════════════════════════════════════════════════════
// PIPELINE ARCHIVE TAB — UI for the archive section
// ════════════════════════════════════════════════════════════════════════
const PipelineArchivePatch = {

  _injected: false,

  injectTab() {
    // Archive tab is now in HTML directly — no injection needed
    // Just ensure the panel container is styled correctly
    const archPanel = document.getElementById('pos-tab-archive');
    if(archPanel && !this._injected) {
      this._injected = true;
    }
    return;
    // LEGACY: kept for safety (never runs)
    if(this._injected) return;
    const tabBar = document.querySelector('#pos-tabs') ||
                   document.querySelector('[id*="pos-tab-btn"]')?.parentElement;
    if(!tabBar) return;

    // Add archive tab button
    if(!document.getElementById('pos-tab-btn-archive')) {
      const btn = document.createElement('button');
      btn.id = 'pos-tab-btn-archive';
      btn.style.cssText = 'padding:10px 14px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:600;color:var(--text-muted);border-bottom:2px solid transparent;transition:.15s;white-space:nowrap';
      btn.innerHTML = '📦 Archivio';
      btn.onclick = () => this.showArchive();
      btn.onmouseover = () => { btn.style.color='var(--text)'; };
      btn.onmouseout  = () => { if(!btn.classList.contains('active')) btn.style.color='var(--text-muted)'; };
      tabBar.appendChild(btn);
    }

    // Add archive container
    if(!document.getElementById('pos-tab-archive')) {
      const container = document.querySelector('#pos-tab-overview')?.parentElement ||
                        document.querySelector('[id^="pos-tab-"]')?.parentElement;
      if(container) {
        const div = document.createElement('div');
        div.id = 'pos-tab-archive';
        div.style.display = 'none';
        container.appendChild(div);
      }
    }

    this._injected = true;
  },

  showArchive() {
    // Hide all other tabs
    document.querySelectorAll('[id^="pos-tab-"]:not([id$="-btn"]):not([id$="-archive"])').forEach(el=>{
      el.style.display='none';
    });
    document.querySelectorAll('[id^="pos-tab-btn-"]').forEach(btn=>{
      btn.style.color='var(--text-muted)';
      btn.style.borderBottomColor='transparent';
      btn.classList.remove('active');
    });

    const archivePanel = document.getElementById('pos-tab-archive');
    if(archivePanel) archivePanel.style.display='';

    const archBtn = document.getElementById('pos-tab-btn-archive');
    if(archBtn) { archBtn.style.color='var(--primary)'; archBtn.style.borderBottomColor='var(--primary)'; archBtn.classList.add('active'); }

    this.renderArchive(archivePanel);
  },

  renderArchive(el) {
    if(!el) return;
    const archive = PipelineArchive.get();

    // Auto-archive button: manually trigger
    el.innerHTML = `
      <div style="padding:16px 20px;max-width:1200px">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--border)">
          <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#6b7280,#4b5563);display:flex;align-items:center;justify-content:center;font-size:20px">📦</div>
          <div style="flex:1">
            <div style="font-size:18px;font-weight:800">Archivio Ordini</div>
            <div style="font-size:11px;color:var(--text-muted)">${archive.length} ordini archiviati · Auto-archiviazione dopo ${window.ARCHIVE_DAYS||3} giorni dalla consegna</div>
          </div>
          <div style="display:flex;gap:6px">
            <button onclick="autoArchive().then(n=>{toast(n>0?n+' ordini archiviati!':'Nessun ordine da archiviare','info');PipelineArchivePatch.renderArchive(document.getElementById('pos-tab-archive'))})"
              style="padding:6px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;color:var(--text)">🔄 Archivia ora</button>
            <select id="arch-filter" onchange="PipelineArchivePatch.renderArchive(document.getElementById('pos-tab-archive'))"
              style="padding:6px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;font-size:11px;color:var(--text)">
              <option value="all">Tutti i periodi</option>
              <option value="7">Ultimi 7 giorni</option>
              <option value="30">Ultimo mese</option>
              <option value="90">Ultimi 3 mesi</option>
              <option value="365">Ultimo anno</option>
            </select>
          </div>
        </div>

        ${archive.length===0?`
          <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
            <div style="font-size:48px;margin-bottom:14px">📭</div>
            <div style="font-size:14px;font-weight:700;margin-bottom:6px">Nessun ordine archiviato</div>
            <div style="font-size:12px;color:var(--text-dim)">Gli ordini completati vengono archiviati automaticamente dopo ${window.ARCHIVE_DAYS||3} giorni.</div>
          </div>
        `:`
        <!-- Stats bar -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
          ${[
            {em:'📦',label:'Archiviati',val:archive.length,col:'#6b7280'},
            {em:'💰',label:'Valore totale',val:'€'+(archive.reduce((a,o)=>a+(+o.total||+o.value||0),0)).toFixed(0),col:'#22c55e'},
            {em:'✅',label:'Consegnati',val:archive.filter(o=>['delivered','sold','invoiced','paid'].includes(o.stage||'')).length,col:'#3b82f6'},
            {em:'📅',label:'Ultimo mese',val:archive.filter(o=>{const d=new Date(o._archivedAt||0),n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();}).length,col:'#a855f7'},
          ].map(k=>`<div style="padding:12px;background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);text-align:center">
            <div style="font-size:18px;margin-bottom:3px">${k.em}</div>
            <div style="font-size:18px;font-weight:800;color:${k.col}">${k.val}</div>
            <div style="font-size:10px;color:var(--text-dim)">${k.label}</div>
          </div>`).join('')}
        </div>

        <!-- Archive list -->
        <div style="background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);overflow:hidden">
          <div style="display:grid;grid-template-columns:1fr 140px 100px 90px 80px 80px;gap:0;padding:8px 16px;border-bottom:1px solid var(--border);background:var(--bg-card)">
            <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase">Ordine / Cliente</div>
            <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase">Archiviato</div>
            <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase">Stato</div>
            <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;text-align:right">Valore</div>
            <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;text-align:center">Azioni</div>
          </div>
          ${archive.slice(0,50).map(o=>{
            const stageColors={paid:'#22c55e',delivered:'#3b82f6',sold:'#22c55e',invoiced:'#a855f7',completed:'#10b981'};
            const col=stageColors[o.stage||'']||'#6b7280';
            const archDate=o._archivedAt?new Date(o._archivedAt).toLocaleDateString('it-IT'):'—';
            return `<div style="display:grid;grid-template-columns:1fr 140px 100px 90px 80px 80px;gap:0;padding:10px 16px;border-bottom:1px solid var(--border);transition:.1s" onmouseover="this.style.background='var(--bg-card)'" onmouseout="this.style.background=''">
              <div>
                <div style="font-size:12px;font-weight:700">${o.name||'Ordine #'+o.id}</div>
                <div style="font-size:10px;color:var(--text-muted)">${o.clientName||'—'}</div>
              </div>
              <div style="font-size:11px;color:var(--text-muted);align-self:center">${archDate}</div>
              <div style="align-self:center"><span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px;background:${col}20;color:${col};border:1px solid ${col}40;text-transform:capitalize">${o.stage||'—'}</span></div>
              <div style="font-size:12px;font-weight:700;color:#22c55e;text-align:right;align-self:center">€${(+o.total||+o.value||0).toFixed(0)}</div>
              <div style="display:flex;gap:4px;align-self:center;justify-content:center">
                <button onclick="PipelineArchivePatch.restore('${o.id}')" title="Ripristina nel workflow" style="padding:3px 7px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:5px;color:var(--primary);cursor:pointer;font-size:9px;font-weight:700">↩ Ripristina</button>
                <button onclick="PipelineArchivePatch.deleteForever('${o.id}')" title="Elimina definitivamente" style="padding:3px 7px;background:#ef444408;border:1px solid #ef444430;border-radius:5px;color:#ef4444;cursor:pointer;font-size:9px">🗑</button>
              </div>
            </div>`;
          }).join('')}
          ${archive.length>50?`<div style="padding:12px 16px;text-align:center;font-size:11px;color:var(--text-muted)">Mostrando i primi 50 di ${archive.length} ordini archiviati</div>`:''}
        </div>`}
      </div>`;
  },

  async restore(id) {
    if(!confirm('Ripristinare questo ordine nel workflow attivo?')) return;
    try {
      const arch = PipelineArchive.get();
      const order = arch.find(o=>String(o.id)===String(id));
      if(!order) { toast('Ordine non trovato','warning'); return; }
      // Remove archive flags
      delete order._archived;
      delete order._archivedAt;
      order.stage = 'working'; // Reset to working
      await IDB.put('orders', order);
      PipelineArchive.remove(id);
      AppStore.invalidate('orders');
      AppStore.invalidate('pipeline');
      toast('↩ Ordine ripristinato nel workflow!','success');
      this.renderArchive(document.getElementById('pos-tab-archive'));
    } catch(ex) { toast('Errore ripristino','error'); console.error(ex); }
  },

  async deleteForever(id) {
    if(!confirm('Eliminare definitivamente? Questa azione non può essere annullata.')) return;
    PipelineArchive.remove(id);
    await await IDB.del('orders', +id||id).catch(()=>{});
    AppStore.invalidate('orders');
    toast('Ordine eliminato definitivamente','info');
    this.renderArchive(document.getElementById('pos-tab-archive'));
  },

  // Settings panel for archive config
  openSettings() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:#000b;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick = e=>{ if(e.target===modal) modal.remove(); };
    modal.innerHTML = `<div style="background:var(--bg-card);border-radius:14px;padding:22px;width:min(440px,96vw);border:1px solid var(--border2);box-shadow:0 24px 64px #000c">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-size:15px;font-weight:800">⚙️ Impostazioni Archivio</div>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--text-muted)">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">Giorni prima dell'archiviazione automatica</label>
          <div style="display:flex;align-items:center;gap:10px">
            <input type="range" min="1" max="30" value="${window.ARCHIVE_DAYS||3}" oninput="document.getElementById('arch-days-val').textContent=this.value;window.ARCHIVE_DAYS=+this.value" style="flex:1;accent-color:var(--primary)">
            <span id="arch-days-val" style="font-size:14px;font-weight:700;color:var(--primary);min-width:30px">${window.ARCHIVE_DAYS||3}</span>
            <span style="font-size:11px;color:var(--text-dim)">giorni</span>
          </div>
        </div>
        <div style="padding:10px 12px;background:var(--bg-card2);border-radius:8px;font-size:11px;color:var(--text-muted)">
          <strong style="color:var(--text)">Ordini completati</strong> vengono archiviati automaticamente dopo il numero di giorni impostato dalla data di consegna/pagamento.
        </div>
        <button onclick="autoArchive().then(n=>toast(n>0?n+' ordini archiviati adesso!':'Nessun ordine da archiviare oggi','info'));this.closest('[style*=fixed]').remove()" style="width:100%;padding:10px;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;border:none;border-radius:9px;font-weight:700;cursor:pointer">
          🔄 Archivia ora manualmente
        </button>
      </div>
    </div>`;
    document.body.appendChild(modal);
  }
};
window.PipelineArchivePatch = PipelineArchivePatch;

// Global ARCHIVE_DAYS (configurable)
window.ARCHIVE_DAYS = 3;

// ── PATCH checkDeadlines to exclude done stages and archived orders ─────
(function patchDeadlineBanner(){
  const tryPatch = () => {
    if(typeof AppStore === 'undefined') return setTimeout(tryPatch, 500);
    // The checkDeadlines function reads from AppStore.get('orders')
    // We already patched AppStore.get above to filter archived items
    // Now we also need to ensure delivered/sold/invoiced are excluded
    // This is already done in the checkDeadlines function (it checks stage)
    // The remaining issue: 'completed', 'sold', 'invoiced' not in its exclusion list

    // Find and patch the deadline check IIFE
    // Since we can't directly access it, we patch at the setTimeout level
    // by overriding the banner creation
    const origCreateElement = document.createElement.bind(document);
    // Not safe to override createElement globally
    // Instead, use a MutationObserver to fix banners when they appear
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if(node.id === 'deadline-banner') {
            // Check if the overdue count is actually 0 after proper filtering
            const banner = node;
            const countEl = banner.querySelector('[style*="#ef4444"]');
            // This is too fragile — instead just re-check and remove banner if no real overdues
            setTimeout(async()=>{
              const orders = await IDB.getAll('orders').catch(()=>[]);
              const now = new Date();
              const realOverdue = orders.filter(o=>{
                if(!o.dueDate) return false;
                if(o._archived) return false;
                const stage = o.stage||o.status||'';
                if(new Set(['paid','delivered','sold','invoiced','completed','rejected','lost','cancelled']).has(stage)) return false;
                return new Date(o.dueDate) < now;
              });
              if(realOverdue.length===0) {
                banner.remove();
              } else {
                // Update the count display
                const countDisplay = banner.querySelector('[style*="font-weight:800;color:#ef4444"]');
                if(countDisplay) countDisplay.textContent = `${realOverdue.length} ordini SCADUTI!`;
              }
            }, 100);
          }
        });
      });
    });
    observer.observe(document.body, {childList:true});
    console.log('[DeadlineBannerPatch] Installed ✅');
  };
  setTimeout(tryPatch, 1000);
})();

