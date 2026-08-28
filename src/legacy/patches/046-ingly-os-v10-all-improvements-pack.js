
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v10 — ALL IMPROVEMENTS PACK
// Dashboard · QuickStats · Sidebar Badges · Sales Sparkline ·
// Client Tags/Notes/Birthday · Orders List View · Lab Amazon Links ·
// Pipeline Week Filter · Lab Export HTML
// ════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 1. QUICK STATS TOPBAR — Live KPIs always visible
// ═══════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════
// v17 IDB SSOT INTERCEPTOR — IDB.getAll('pipeline') reads from 'orders'
// ════════════════════════════════════════════════════════════════════════
(function installIDBInterceptor(){
  const _origGetAll = IDB.getAll.bind(IDB);
  IDB.getAll = async function(store) {
    if(store === 'pipeline') {
      try {
        const orders = await _origGetAll('orders');
        return (orders||[]).map(o=>({
          ...o, _source:'orders', _sourceId:o.id,
          stage: o.stage||o.status||'draft',
          status: o.stage||o.status||'draft',
        }));
      } catch(e) { return _origGetAll(store); }
    }
    return _origGetAll(store);
  };
  // Intercept IDB.put('pipeline') → redirect to orders
  const _origPut = IDB.put.bind(IDB);
  IDB.put = async function(store, data, key) {
    if(store === 'pipeline' && data && (data._sourceId || data.id)) {
      // Write to orders instead, preserving the original id
      const orderId = data._sourceId || data.id;
      try {
        const existing = await IDB.get('orders', orderId).catch(()=>null);
        if(existing) {
          const merged = { ...existing, ...data, id: orderId, _source: undefined };
          return _origPut('orders', merged);
        }
      } catch(e) {}
      // Fallback: write to pipeline legacy
      return _origPut(store, data, key);
    }
    return _origPut(store, data, key);
  };
  console.log('[IDB SSOT] pipeline→orders interceptor installed ✅');
})();

const QuickStats = {
  _interval: null,

  async update() {
    try {
      const [orders, sales] = await Promise.all([
        IDB.getAll('orders').catch(()=>[]),
        IDB.getAll('sales').catch(()=>[]),
      ]);
      const DONE = new Set(['paid','delivered','sold','invoiced','completed','rejected','cancelled','archived']);
      const active  = orders.filter(o=>!DONE.has(o.stage||o.status||'') && !o._archived);
      const overdue = active.filter(o=>o.dueDate && new Date(o.dueDate)<new Date());
      const pending = sales.filter(s=>s.status==='da_pagare').reduce((a,s)=>a+(+s.amount||0),0);

      const bar = document.getElementById('qs-bar');
      if(!bar) return;

      const fmtK = v => v>=1000 ? '€'+(v/1000).toFixed(1)+'k' : '€'+Math.round(v);
      bar.innerHTML = `
        <span class="qs-stat" onclick="App.navigate('orders')" title="Ordini attivi — clicca per aprire"
          style="cursor:pointer;display:flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;background:var(--bg-card2);border:1px solid var(--border);transition:.15s"
          onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
          <i class="fas fa-layer-group" style="font-size:9px;color:var(--primary)"></i>
          <span style="font-size:11px;font-weight:700;color:var(--text)">${active.length}</span>
          <span style="font-size:9px;color:var(--text-dim)">attivi</span>
        </span>
        ${overdue.length ? `<span class="qs-stat" onclick="App.navigate('pipeline')" title="${overdue.length} ordini in ritardo"
          style="cursor:pointer;display:flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;background:#ef444415;border:1px solid #ef444440;animation:pulse 2s infinite"
          onmouseover="this.style.background='#ef444425'" onmouseout="this.style.background='#ef444415'">
          <i class="fas fa-exclamation-triangle" style="font-size:9px;color:#ef4444"></i>
          <span style="font-size:11px;font-weight:800;color:#ef4444">${overdue.length}</span>
          <span style="font-size:9px;color:#ef4444">ritardo</span>
        </span>` : ''}
        <span class="qs-stat" onclick="App.navigate('sales')" title="Da incassare — clicca per aprire vendite"
          style="cursor:pointer;display:flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;background:${pending>0?'#f9731615':'var(--bg-card2)'};border:1px solid ${pending>0?'#f9731640':'var(--border)'};transition:.15s"
          onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
          <i class="fas fa-clock" style="font-size:9px;color:${pending>0?'#f97316':'var(--text-dim)'}"></i>
          <span style="font-size:11px;font-weight:700;color:${pending>0?'#f97316':'var(--text-muted)'}">${fmtK(pending)}</span>
          <span style="font-size:9px;color:var(--text-dim)">da pagare</span>
        </span>`;
    } catch(ex) { console.warn('[QuickStats]', ex); }
  },

  init() {
    // Inject bar into topbar
    const topbar = document.getElementById('topbar');
    if(!topbar || document.getElementById('qs-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'qs-bar';
    bar.style.cssText = 'display:flex;align-items:center;gap:5px;margin-left:8px';
    // Insert after logo
    const logo = topbar.querySelector('.logo');
    if(logo && logo.nextSibling) topbar.insertBefore(bar, logo.nextSibling);
    else topbar.appendChild(bar);

    this.update();
    this._interval = setInterval(()=>this.update(), 30000); // refresh every 30s
    // Also refresh on navigation
    Bus.on('order:stageChanged', ()=>this.update());
    if(!window.__salePaidRegistered){window.__salePaidRegistered=true;Bus.on('sale:paid', ()=>this.update());}
    Bus.on('sale:created', ()=>this.update());
  }
};
window.QuickStats = QuickStats;


// ═══════════════════════════════════════════════════════════════════════
// 2. SIDEBAR BADGES — Live counters on nav items
// ═══════════════════════════════════════════════════════════════════════
const SidebarBadges = {
  async update() {
    try {
      const [orders, sales] = await Promise.all([
        IDB.getAll('orders').catch(()=>[]),
        IDB.getAll('sales').catch(()=>[]),
      ]);
      const DONE = new Set(['paid','delivered','sold','invoiced','completed','rejected','cancelled','archived']);
      const overdue  = orders.filter(o=>!DONE.has(o.stage||o.status||'')&&!o._archived&&o.dueDate&&new Date(o.dueDate)<new Date()).length;
      const pending  = sales.filter(s=>s.status==='da_pagare').length;
      const ready    = orders.filter(o=>(o.stage||'')===('ready')).length;

      this._setBadge('orders',  overdue,  '#ef4444', 'In ritardo');
      this._setBadge('pipeline',ready,    '#10b981', 'Pronti');
      this._setBadge('sales',   pending,  '#f97316', 'Da pagare');
    }catch(ex) {}
  },

  _setBadge(section, count, color, title) {
    const navItems = document.querySelectorAll(`.nav-item[data-section="${section}"]`);
    navItems.forEach(item => {
      let badge = item.querySelector('.nav-badge');
      if(!count) { badge?.remove(); return; }
      if(!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-badge';
        badge.style.cssText = `display:inline-flex;align-items:center;justify-content:center;min-width:17px;height:17px;border-radius:99px;font-size:9px;font-weight:800;padding:0 4px;margin-left:auto;flex-shrink:0;color:#fff;background:${color}`;
        // Stessa ragione di renderSectionActions: `display` in linea rende la
        // voce non nascondibile da nessuna regola. Il foglio di stile la
        // dichiara già flex.
        item.style.alignItems = 'center';
        item.appendChild(badge);
      }
      badge.textContent = count > 99 ? '99+' : count;
      badge.title = `${count} ${title}`;
      badge.style.background = color;
    });
  },

  init() {
    this.update();
    setInterval(()=>this.update(), 60000);
    if(!window.__stageChangedRegistered){
      window.__stageChangedRegistered=true;
      if(typeof Bus!=='undefined') Bus.on('order:stageChanged', ()=>this.update());
    }
    if(!window.__salePaidRegistered){
      window.__salePaidRegistered=true;
      if(typeof Bus!=='undefined') Bus.on('sale:paid', ()=>this.update());
    }
  }
};
window.SidebarBadges = SidebarBadges;


// ═══════════════════════════════════════════════════════════════════════
// 3. SALES SPARKLINE — Mini chart last 6 months above table
// ═══════════════════════════════════════════════════════════════════════
const SalesSparkline = {
  async render() {
    const container = document.getElementById('sales-sparkline-container');
    if(!container) return;
    const sales = await IDB.getAll('sales').catch(()=>[]);
    const now = new Date();
    const months = [];
    for(let i=5; i>=0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = d.toLocaleDateString('it-IT',{month:'short'});
      const paid    = sales.filter(s=>s.status==='pagato'&&(s.date||'').startsWith(key)).reduce((a,s)=>a+(+s.amount||0),0);
      const pending = sales.filter(s=>s.status==='da_pagare'&&(s.date||'').startsWith(key)).reduce((a,s)=>a+(+s.amount||0),0);
      months.push({key,label,paid,pending});
    }    const maxVal = Math.max(...months.map(m=>m.paid+m.pending), 1);
    const total6 = months.reduce((a,m)=>a+m.paid,0);
    const avg    = total6/6;
    const thisM  = months[5].paid;
    const prevM  = months[4].paid;
    const trend  = prevM > 0 ? ((thisM-prevM)/prevM*100).toFixed(0) : 0;
    const trendCol = trend >= 0 ? '#22c55e' : '#ef4444';

    container.innerHTML = `
      <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;gap:16px">
        <div>
          <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:2px">Ultimi 6 mesi</div>
          <div style="font-size:16px;font-weight:800">€${Math.round(total6).toLocaleString('it-IT')}</div>
          <div style="font-size:10px;color:${trendCol};font-weight:700">${trend >= 0 ? '▲' : '▼'} ${Math.abs(trend)}% vs mese prec.</div>
        </div>
        <div style="flex:1;display:flex;align-items:flex-end;gap:4px;height:44px">
          ${months.map((m,i) => {
            const h = Math.round((m.paid+m.pending)/maxVal*40) || 2;
            const hP = Math.round(m.paid/maxVal*40) || 0;
            const isThis = i===5;
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px" title="${m.label}: €${Math.round(m.paid)} incassato">
              <div style="width:100%;background:${isThis?'var(--primary)':'var(--border2)'};height:${h}px;border-radius:3px 3px 0 0;position:relative;min-height:2px">
                ${hP > 0 ? `<div style="position:absolute;bottom:0;left:0;right:0;height:${hP}px;background:${isThis?'#22c55e':'#22c55e50'};border-radius:0 0 3px 3px"></div>` : ''}
              </div>
              <div style="font-size:8px;color:${isThis?'var(--primary)':'var(--text-dim)'};font-weight:${isThis?'800':'400'}">${m.label}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;color:var(--text-dim)">Media mensile</div>
          <div style="font-size:13px;font-weight:700">€${Math.round(avg).toLocaleString('it-IT')}</div>
          <div style="font-size:10px;color:var(--text-dim);margin-top:4px">
            <span style="color:#22c55e">■</span> incassato &nbsp;
            <span style="color:var(--primary)">■</span> totale
          </div>
        </div>
      </div>`;
  },

  init() {
    // Inject container before table
    const tableWrap = document.getElementById('sales-table-wrap');
    if(!tableWrap || document.getElementById('sales-sparkline-container')) return;
    const div = document.createElement('div');
    div.id = 'sales-sparkline-container';
    tableWrap.parentNode.insertBefore(div, tableWrap);
    this.render();
  }
};
window.SalesSparkline = SalesSparkline;


// ═══════════════════════════════════════════════════════════════════════
// 4. ORDERS LIST VIEW — Table alternative to Kanban
// ═══════════════════════════════════════════════════════════════════════
const OrdersListView = {
  _SK: 'ingly_orders_view',
  _viewMode: 'kanban', // 'kanban' | 'list'

  getMode(){ return localStorage.getItem(this._SK)||'kanban'; },
  setMode(m){ localStorage.setItem(this._SK,m); this._viewMode=m; },

  async renderList(container) {
    if(!container) return;
    const DONE = new Set(['paid','delivered','sold','invoiced','completed','rejected','cancelled','archived']);
    const all = await IDB.getAll('orders').catch(()=>[]);
    const orders = all.filter(o=>!o._archived);

    const stageColors = {backlog:'#6366f1',working:'#f59e0b',ready:'#10b981',delivered:'#3b82f6',sold:'#22c55e',invoiced:'#a78bfa',paused:'#6b7280',paid:'#22c55e',rejected:'#ef4444'};

    container.innerHTML = `
      <div style="margin-bottom:10px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <div style="flex:1;min-width:180px;position:relative">
          <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-dim);font-size:11px"></i>
          <input id="olv-search" class="form-control" style="padding-left:32px;height:34px;font-size:12px" placeholder="Cerca cliente, prodotto…" oninput="OrdersListView._filter()">
        </div>
        <select id="olv-stage" class="form-control" style="height:34px;font-size:12px;width:auto" onchange="OrdersListView._filter()">
          <option value="">Tutti gli stati</option>
          ${['backlog','working','ready','delivered','sold','invoiced','paused'].map(s=>`<option value="${s}">${s}</option>`).join('')}
        </select>
        <select id="olv-sort" class="form-control" style="height:34px;font-size:12px;width:auto" onchange="OrdersListView._filter()">
          <option value="date_desc">📅 Più recente</option>
          <option value="date_asc">📅 Più vecchio</option>
          <option value="amount_desc">💶 Importo alto</option>
          <option value="amount_asc">💶 Importo basso</option>
          <option value="client_asc">👤 Cliente A→Z</option>
          <option value="due_asc">⏰ Scadenza prima</option>
        </select>
        <span id="olv-count" style="font-size:11px;color:var(--text-muted)"></span>
      </div>
      <div id="olv-table-wrap" style="border-radius:10px;border:1px solid var(--border);overflow:hidden;max-height:calc(100vh - 320px);overflow-y:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:var(--bg-card2);position:sticky;top:0;z-index:5">
              <th style="padding:9px 14px;text-align:left;border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Cliente</th>
              <th style="padding:9px 14px;border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Prodotto</th>
              <th style="padding:9px 14px;border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Scadenza</th>
              <th style="padding:9px 14px;border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;text-align:right">Importo</th>
              <th style="padding:9px 14px;border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Stato</th>
              <th style="padding:9px 14px;border-bottom:1px solid var(--border);text-align:right"></th>
            </tr>
          </thead>
          <tbody id="olv-tbody"></tbody>
        </table>
      </div>`;
    this._allOrders = orders;
    this._filter();
  },

  _filter() {
    const q   = (document.getElementById('olv-search')?.value||'').toLowerCase();
    const st  = document.getElementById('olv-stage')?.value||'';
    const srt = document.getElementById('olv-sort')?.value||'date_desc';
    const stageColors = {backlog:'#6366f1',working:'#f59e0b',ready:'#10b981',delivered:'#3b82f6',sold:'#22c55e',invoiced:'#a78bfa',paused:'#6b7280',paid:'#22c55e',rejected:'#ef4444'};

    let data = (this._allOrders||[]).filter(o=>{
      if(st && (o.stage||o.status||'backlog')!==st) return false;
      if(q && !((o.clientName||'').toLowerCase().includes(q)||(o.name||'').toLowerCase().includes(q))) return false;
      return true;
    });
    data.sort((a,b)=>{
      if(srt==='date_desc')   return new Date(b.createdAt||0)-new Date(a.createdAt||0);
      if(srt==='date_asc')    return new Date(a.createdAt||0)-new Date(b.createdAt||0);
      if(srt==='amount_desc') return (+(b.total||b.value||b.grossPrice||0))-(+(a.total||a.value||a.grossPrice||0));
      if(srt==='amount_asc')  return (+(a.total||a.value||a.grossPrice||0))-(+(b.total||b.value||b.grossPrice||0));
      if(srt==='client_asc')  return (a.clientName||'').localeCompare(b.clientName||'');
      if(srt==='due_asc')     return new Date(a.dueDate||'9999')-new Date(b.dueDate||'9999');
      return 0;
    });

    const cnt = document.getElementById('olv-count');
    if(cnt) cnt.textContent = `${data.length} ordini`;

    const tbody = document.getElementById('olv-tbody');
    if(!tbody) return;
    if(!data.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-dim)">Nessun ordine trovato</td></tr>';
      return;
    }
    const now = new Date();
    tbody.innerHTML = data.map(o=>{
      const stage = o.stage||o.status||'backlog';
      const col = stageColors[stage]||'#6b7280';
      const amount = +(o.total||o.value||o.grossPrice||0);
      const isOver = o.dueDate && new Date(o.dueDate)<now && !new Set(['paid','delivered','sold','invoiced']).has(stage);
      const dueStr = o.dueDate ? new Date(o.dueDate).toLocaleDateString('it-IT') : '—';
      return `<tr style="border-bottom:1px solid var(--border);border-left:3px solid ${col};cursor:pointer;transition:.12s"
        onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background=''"
        onclick="typeof OrderFlow!=='undefined'?OrderFlow.openDetail(${o.id}):typeof Orders!=='undefined'&&Orders.openDetail&&Orders.openDetail(${o.id})">
        <td style="padding:9px 14px">
          <div style="font-weight:700">${o.clientName||'—'}</div>
        </td>
        <td style="padding:9px 14px;color:var(--text-muted)">${o.name||o.desc||'—'}</td>
        <td style="padding:9px 14px;color:${isOver?'#ef4444':'var(--text-muted)'};font-weight:${isOver?'700':'400'}">
          ${isOver?'⚠️ ':''} ${dueStr}
        </td>
        <td style="padding:9px 14px;text-align:right;font-weight:800">€${amount.toFixed(0)}</td>
        <td style="padding:9px 14px">
          <span style="font-size:10px;padding:2px 8px;border-radius:99px;background:${col}20;color:${col};font-weight:700">${stage}</span>
        </td>
        <td style="padding:9px 14px;text-align:right">
          <button onclick="event.stopPropagation();typeof OrderFlow!=='undefined'?OrderFlow.openDetail(${o.id}):void 0" style="padding:3px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:10px;color:var(--text-muted)">✏️</button>
        </td>
      </tr>`;
    }).join('');
  },

  toggleViewButton() {
    const btn = document.getElementById('orders-view-toggle');
    if(!btn) return;
    const mode = this.getMode();
    btn.innerHTML = mode==='kanban' ? '<i class="fas fa-list"></i> Vista Lista' : '<i class="fas fa-columns"></i> Vista Kanban';
  }
};
window.OrdersListView = OrdersListView;


// ═══════════════════════════════════════════════════════════════════════
// 5. CLIENT NOTES + TAGS + BIRTHDAY
// ═══════════════════════════════════════════════════════════════════════
const ClientEnhancements = {
  _SK_NOTES: 'ingly_client_notes_v1',
  _SK_TAGS:  'ingly_client_tags_v1',

  PRESET_TAGS: ['matrimonio','B2B','premium','local','etsy','fiera','vip','ricorrente','nuovo'],

  getNotes(clientId){ try{return JSON.parse(localStorage.getItem(this._SK_NOTES+clientId)||'');}catch{return '';} },
  setNotes(clientId,n){ try{localStorage.setItem(this._SK_NOTES+clientId,JSON.stringify(n));}catch{} },
  getTags(clientId){ try{return JSON.parse(localStorage.getItem(this._SK_TAGS+clientId)||'[]');}catch{return[];} },
  setTags(clientId,t){ try{localStorage.setItem(this._SK_TAGS+clientId,JSON.stringify(t));}catch{} },

  openPanel(clientId, clientName) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:#000b;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick = e=>{ if(e.target===modal) modal.remove(); };
    const notes = this.getNotes(clientId)||'';
    const tags  = this.getTags(clientId)||[];

    modal.innerHTML = `<div style="background:var(--bg-card);border-radius:16px;width:min(520px,96vw);border:1px solid var(--border2);box-shadow:0 24px 64px #000c;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#a855f7);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#000">${(clientName||'?')[0]}</div>
        <div>
          <div style="font-size:15px;font-weight:800">${clientName||'Cliente'}</div>
          <div style="font-size:10px;color:var(--text-muted)">Note, tag e promemoria</div>
        </div>
        <button onclick="this.closest('[style*=fixed]').remove()" style="margin-left:auto;background:none;border:none;font-size:18px;cursor:pointer;color:var(--text-muted)">✕</button>
      </div>
      <div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">
        <!-- Tags -->
        <div>
          <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">🏷️ Tag</label>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px" id="ce-tags-${clientId}">
            ${this.PRESET_TAGS.map(tag=>`<button onclick="ClientEnhancements.toggleTag('${clientId}','${tag}',this)"
              style="padding:3px 10px;border-radius:99px;border:1px solid ${tags.includes(tag)?'var(--primary)':'var(--border)'};background:${tags.includes(tag)?'var(--primary-dim)':'transparent'};color:${tags.includes(tag)?'var(--primary)':'var(--text-muted)'};cursor:pointer;font-size:11px;font-weight:600;transition:.15s">
              ${tag}
            </button>`).join('')}
          </div>
          <div style="display:flex;gap:6px">
            <input id="ce-custom-tag-${clientId}" class="form-control" placeholder="Tag personalizzato…" style="font-size:12px;height:30px" onkeydown="if(event.key==='Enter')ClientEnhancements.addCustomTag('${clientId}')">
            <button onclick="ClientEnhancements.addCustomTag('${clientId}')" style="padding:0 10px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:7px;color:var(--primary);cursor:pointer;font-size:11px;font-weight:700">+ Tag</button>
          </div>
        </div>
        <!-- Birthday -->
        <div>
          <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px">🎂 Data di nascita / anniversario</label>
          <input id="ce-bday-${clientId}" type="date" class="form-control" style="font-size:12px;height:34px" value="${this._getBday(clientId)||''}">
        </div>
        <!-- Notes -->
        <div>
          <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px">📝 Note interne</label>
          <textarea id="ce-notes-${clientId}" class="form-control" rows="3" style="font-size:12px;resize:vertical">${notes}</textarea>
        </div>
        <button onclick="ClientEnhancements.save('${clientId}')" style="width:100%;padding:10px;background:linear-gradient(135deg,var(--primary),#a855f7);color:#000;border:none;border-radius:9px;font-weight:800;cursor:pointer">💾 Salva</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
  },

  toggleTag(clientId, tag, btn) {
    const tags = this.getTags(clientId);
    const idx = tags.indexOf(tag);
    if(idx>=0) tags.splice(idx,1); else tags.push(tag);
    this.setTags(clientId, tags);
    const active = tags.includes(tag);
    btn.style.borderColor = active ? 'var(--primary)' : 'var(--border)';
    btn.style.background  = active ? 'var(--primary-dim)' : 'transparent';
    btn.style.color       = active ? 'var(--primary)' : 'var(--text-muted)';
  },

  addCustomTag(clientId) {
    const inp = document.getElementById(`ce-custom-tag-${clientId}`);
    const tag = inp?.value?.trim().toLowerCase();
    if(!tag) return;
    const tags = this.getTags(clientId);
    if(!tags.includes(tag)) { tags.push(tag); this.setTags(clientId,tags); }
    inp.value = '';
    const container = document.getElementById(`ce-tags-${clientId}`);
    if(container) {
      const btn = document.createElement('button');
      btn.style.cssText = 'padding:3px 10px;border-radius:99px;border:1px solid var(--primary);background:var(--primary-dim);color:var(--primary);cursor:pointer;font-size:11px;font-weight:600';
      btn.textContent = tag;
      btn.onclick = ()=>this.toggleTag(clientId,tag,btn);
      container.appendChild(btn);
    }
    toast(`🏷️ Tag "${tag}" aggiunto!`,'success');
  },

  _getBday(clientId){ try{const d=JSON.parse(localStorage.getItem('ingly_client_bday_'+clientId)||'null'); return d||'';}catch{return '';} },
  _setBday(clientId,d){ try{localStorage.setItem('ingly_client_bday_'+clientId,JSON.stringify(d));}catch{} },

  save(clientId) {
    const notes = document.getElementById(`ce-notes-${clientId}`)?.value||'';
    const bday  = document.getElementById(`ce-bday-${clientId}`)?.value||'';
    this.setNotes(clientId, notes);
    this._setBday(clientId, bday);
    document.querySelector('[style*="position:fixed"][style*="z-index:9999"]')?.remove();
    toast('✅ Salvato!','success');
  },

  // Check birthdays every day
  checkBirthdays() {
    try {
      const today = new Date();
      const mm = String(today.getMonth()+1).padStart(2,'0');
      const dd = String(today.getDate()).padStart(2,'0');
      // Find clients with birthday today
      const upcoming = [];
      for(const key of Object.keys(localStorage)) {
        if(!key.startsWith('ingly_client_bday_')) continue;
        const bday = JSON.parse(localStorage.getItem(key)||'null');
        if(!bday) continue;
        const bdayMM = bday.slice(5,7), bdayDD = bday.slice(8,10);
        const clientId = key.replace('ingly_client_bday_','');
        const daysUntil = this._daysUntilBirthday(bdayMM+'-'+bdayDD);
        if(daysUntil <= 7) upcoming.push({clientId, bday, daysUntil});
      }
      return upcoming;
    } catch(ex){ return []; }
  },

  _daysUntilBirthday(mmdd) {
    const now = new Date();
    const year = now.getFullYear();
    const bday = new Date(`${year}-${mmdd}`);
    if(bday < now) bday.setFullYear(year+1);
    return Math.ceil((bday-now)/86400000);
  }
};
window.ClientEnhancements = ClientEnhancements;


// ═══════════════════════════════════════════════════════════════════════
// 6. PIPELINE CALENDAR — Week view + month selector
// ═══════════════════════════════════════════════════════════════════════
(function patchPipelineCalendar(){
  const tryPatch = () => {
    if(typeof PipelineOS==='undefined') return setTimeout(tryPatch,800);

    // Add week view toggle to calendar header (inject via MutationObserver)
    const observer = new MutationObserver(()=>{
      const calContent = document.getElementById('pos-calendar-content');
      const calHeader  = calContent?.previousElementSibling;
      if(calHeader && !calHeader.querySelector('#cal-week-btn')) {
        const weekBtn = document.createElement('button');
        weekBtn.id = 'cal-week-btn';
        weekBtn.innerHTML = '🗓 Settimana';
        weekBtn.style.cssText = 'padding:5px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;color:var(--text-muted)';
        weekBtn.onclick = () => PipelineCalendarPro.renderWeek();
        weekBtn.onmouseover = () => { weekBtn.style.borderColor='var(--primary)'; weekBtn.style.color='var(--primary)'; };
        weekBtn.onmouseout  = () => { weekBtn.style.borderColor='var(--border)'; weekBtn.style.color='var(--text-muted)'; };

        const todayBtn = calHeader.querySelector('button');
        if(todayBtn) calHeader.insertBefore(weekBtn, todayBtn);
        else calHeader.appendChild(weekBtn);
      }
    });
    observer.observe(document.body, {childList:true, subtree:true});
    (console.info||console.log)('[PipelineCalendarPro] Installed ✅');
  };
  setTimeout(tryPatch, 1500);
})();

const PipelineCalendarPro = {
  async renderWeek() {
    const el = document.getElementById('pos-calendar-content');
    if(!el) return;
    const orders = (typeof PipelineOS!=='undefined' ? PipelineOS._orders : null)||await IDB.getAll('orders').catch(()=>[]);
    const DONE = new Set(['paid','delivered','sold','invoiced','completed','rejected']);
    const active = orders.filter(o=>!DONE.has(o.stage||'')&&!o._archived&&o.dueDate);

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay()+6)%7)); // Monday
    const days = [];
    for(let i=0;i<7;i++){
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate()+i);
      const dateStr = d.toISOString().slice(0,10);
      const dayOrders = active.filter(o=>o.dueDate===dateStr);
      const isToday = dateStr === now.toISOString().slice(0,10);
      days.push({d,dateStr,dayOrders,isToday});
    }

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:0 4px">
        <div style="font-size:13px;font-weight:700">Settimana del ${startOfWeek.toLocaleDateString('it-IT',{day:'numeric',month:'long'})}</div>
        <button onclick="PipelineOS._renderCalendar(PipelineOS._orders||[])" style="padding:4px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;font-size:11px;cursor:pointer;color:var(--text-muted)">← Mese</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">
        ${days.map(({d,dateStr,dayOrders,isToday})=>`
          <div style="min-height:90px;padding:6px 8px;border-radius:8px;border:1.5px solid ${isToday?'var(--primary)':'var(--border)'};background:${isToday?'var(--primary-dim)':'var(--bg-card2)'}">
            <div style="font-size:10px;font-weight:700;color:${isToday?'var(--primary)':'var(--text-muted)'};margin-bottom:5px">
              ${['Lun','Mar','Mer','Gio','Ven','Sab','Dom'][d.getDay()===0?6:d.getDay()-1]} ${d.getDate()}
            </div>
            ${dayOrders.map(o=>`<div style="font-size:9px;padding:3px 5px;border-radius:4px;background:${o.dueDate<now.toISOString().slice(0,10)?'#ef444420':'var(--primary-dim)'};color:${o.dueDate<now.toISOString().slice(0,10)?'#ef4444':'var(--primary)'};margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600" title="${o.clientName||''}: ${o.name||''}">${o.clientName||o.name||'#'+o.id}</div>`).join('')}
          </div>`).join('')}
      </div>`;
  }
};
window.PipelineCalendarPro = PipelineCalendarPro;


// ═══════════════════════════════════════════════════════════════════════
// 7. LABSETUP — Add direct Amazon links to AI dashboard suggestions
// ═══════════════════════════════════════════════════════════════════════
(function patchLabSetupSuggestions(){
  const tryPatch = () => {
    if(typeof LabSetup==='undefined') return setTimeout(tryPatch,800);

    const origDash = LabSetup._renderDashboard?.bind(LabSetup);
    if(!origDash) return;
    LabSetup._renderDashboard = function(cont, opts) {
      origDash(cont, opts);
      // After render, add Amazon buttons to suggestion items
      setTimeout(()=>{
        cont.querySelectorAll('[onclick*="_quickAdd"]').forEach(item=>{
          if(item.querySelector('.lab-amz-btn')) return;
          const nameMatch = item.getAttribute('onclick')?.match(/_quickAdd\('([^']+)'/);
          if(!nameMatch) return;
          const name = nameMatch[1];
          const amzBtn = document.createElement('a');
          amzBtn.className = 'lab-amz-btn';
          amzBtn.href = `https://www.amazon.it/s?k=${encodeURIComponent(name)}&tag=inglydesign`;
          amzBtn.target = '_blank';
          amzBtn.style.cssText = 'display:block;margin-top:4px;padding:2px 8px;background:#f59e0b15;border:1px solid #f59e0b40;border-radius:5px;color:#f59e0b;font-size:9px;font-weight:700;text-decoration:none;text-align:center';
          amzBtn.innerHTML = '🛒 Amazon →';
          amzBtn.onclick = e => e.stopPropagation();
          item.appendChild(amzBtn);
        });
      }, 200);
    };
    (console.info||console.log)('[LabSetup Amazon Links] Patched ✅');
  };
  setTimeout(tryPatch, 1500);
})();


// ═══════════════════════════════════════════════════════════════════════
// 8. LAB EXPORT — HTML with clickable Amazon links
// ═══════════════════════════════════════════════════════════════════════
(function patchLabExport(){
  const tryPatch = () => {
    if(typeof LabSetup==='undefined') return setTimeout(tryPatch, 800);

    LabSetup._exportShoppingList = function(){
      const {suggestions, outOfStock} = this._tabState||{};
      const dm = this.AI_ENGINE.decisionMatrix;
      const all = [
        ...(outOfStock||[]).map(p=>({...p, reason:'Stock esaurito'})),
        ...(suggestions||[]).filter(s=>!(outOfStock||[]).find(p=>p.name.toLowerCase().includes(s.name.toLowerCase().slice(0,8)))),
      ].sort((a,b)=>(dm[a.priority]?.order||9)-(dm[b.priority]?.order||9));

      const date = new Date().toLocaleDateString('it-IT');
      const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<title>Lista Acquisti Lab — Ingly Design — ${date}</title>
<style>body{font-family:system-ui;max-width:800px;margin:40px auto;padding:20px;color:#1e293b;background:#f8fafc}
h1{color:#f59e0b;font-size:22px}h2{font-size:14px;color:#64748b;margin:20px 0 8px}
.item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:8px;margin-bottom:6px;border-left:4px solid #ddd}
.item.CRITICAL{border-left-color:#ef4444;background:#fef2f2}
.item.HIGH{border-left-color:#f97316;background:#fff7ed}
.item.MEDIUM{border-left-color:#f59e0b;background:#fffbeb}
.item.LOW{border-left-color:#22c55e;background:#f0fdf4}
.item a{padding:5px 12px;background:#f59e0b;color:#fff;border-radius:5px;text-decoration:none;font-size:11px;font-weight:700;white-space:nowrap}
.badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;margin-right:8px}
.price{font-weight:700;color:#22c55e;min-width:60px;text-align:right}
</style></head><body>
<h1>🧪 Lista Acquisti — Ingly Design</h1>
<p style="color:#64748b;font-size:13px">${date} · ${all.length} prodotti · €${all.reduce((a,i)=>a+(i.cost||0),0).toFixed(0)} totale stimato</p>
${['CRITICAL','HIGH','MEDIUM','LOW'].filter(p=>all.some(i=>i.priority===p)).map(pri=>{
  const items = all.filter(i=>i.priority===pri);
  const labels = {CRITICAL:'🔴 CRITICO',HIGH:'🟠 ALTO',MEDIUM:'🟡 MEDIO',LOW:'🟢 BASSO'};
  return `<h2>${labels[pri]} — ${items.length} articoli (€${items.reduce((a,i)=>a+(i.cost||0),0).toFixed(0)})</h2>
  ${items.map(item=>`<div class="item ${item.priority}">
    <div>
      <span class="badge" style="background:${item.priority==='CRITICAL'?'#ef4444':item.priority==='HIGH'?'#f97316':item.priority==='MEDIUM'?'#f59e0b':'#22c55e'};color:#fff">${item.priority}</span>
      <strong>${item.name}</strong>
      ${item.reason?`<div style="font-size:11px;color:#64748b;margin-top:2px">${item.reason}</div>`:''}
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      <span class="price">${item.cost?'€'+item.cost.toFixed(2):''}</span>
      ${item.link?`<a href="${item.link}" target="_blank">🛒 Acquista</a>`:`<a href="https://www.amazon.it/s?k=${encodeURIComponent(item.name)}" target="_blank">🛒 Amazon</a>`}
    </div>
  </div>`).join('')}`;
}).join('')}
<hr style="margin:20px 0;border-color:#e2e8f0">
<p style="font-size:11px;color:#94a3b8">Generato da Ingly OS v10.0 · Ingly Design</p>
</body></html>`;

      // Create downloadable HTML file
      const blob = new Blob([html], {type:'text/html;charset=utf-8'});
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href=url; a.download=`Lista-Acquisti-Lab-${date.replace(/\//g,'-')}.html`;
      a.click(); URL.revokeObjectURL(url);
      toast('📥 Lista HTML scaricata con link Amazon!','success');
    };
    (console.info||console.log)('[Lab Export HTML] Patched ✅');
  };
  setTimeout(tryPatch, 1200);
})();


// ═══════════════════════════════════════════════════════════════════════
// 9. ORDERS LIST VIEW TOGGLE BUTTON — inject in Orders header
// ═══════════════════════════════════════════════════════════════════════
(function injectOrdersViewToggle(){
  const tryInject = () => {
    if(document.getElementById('orders-view-toggle')) return;
    const header = document.querySelector('#view-orders .page-actions') ||
                   document.querySelector('#view-orders .page-header .page-actions');
    if(!header) return setTimeout(tryInject, 800);
    const btn = document.createElement('button');
    btn.id = 'orders-view-toggle';
    btn.className = 'btn btn-secondary btn-sm';
    btn.innerHTML = '<i class="fas fa-list"></i> Vista Lista';
    btn.onclick = async () => {
      const mode = OrdersListView.getMode();
      const newMode = mode==='kanban'?'list':'kanban';
      OrdersListView.setMode(newMode);
      btn.innerHTML = newMode==='kanban' ? '<i class="fas fa-list"></i> Vista Lista' : '<i class="fas fa-columns"></i> Vista Kanban';
      if(newMode==='list'){
        const board = document.querySelector('#view-orders .ofe-board-wrap') ||
                      document.querySelector('#view-orders [id*="board"]') ||
                      document.getElementById('ofe-board');
        if(board){
          board.style.display='none';
          let listContainer = document.getElementById('orders-list-container');
          if(!listContainer){
            listContainer = document.createElement('div');
            listContainer.id='orders-list-container';
            listContainer.style.padding='0 0 20px';
            board.parentNode.insertBefore(listContainer, board.nextSibling);
          }
          listContainer.style.display='';
          await OrdersListView.renderList(listContainer);
        }
      } else {
        document.getElementById('orders-list-container')?.remove();
        const board = document.querySelector('#view-orders .ofe-board-wrap')||document.getElementById('ofe-board');
        if(board) board.style.display='';
        if(typeof Orders!=='undefined') (typeof Orders!=='undefined'&&Orders.render());
        else if(typeof OrderFlow!=='undefined') OrderFlow.render?.();
      }
    };
    header.insertBefore(btn, header.firstChild);
    (console.info||console.log)('[OrdersViewToggle] Injected ✅');
  };
  setTimeout(tryInject, 2000);
})();


// ═══════════════════════════════════════════════════════════════════════
// 10. MORNING BRIEFING — Add today's deliveries
// ═══════════════════════════════════════════════════════════════════════
(function patchMorningBriefing(){
  const tryPatch = () => {
    if(typeof MorningBriefing==='undefined') return setTimeout(tryPatch, 600);
    const orig = MorningBriefing.showV2?.bind(MorningBriefing);
    if(!orig) return;
    MorningBriefing.showV2 = async function(){
      await orig();
      // After briefing is shown, inject today's deliveries section
      setTimeout(async()=>{
        const briefing = document.getElementById('morning-briefing-overlay-2');
        if(!briefing) return;
        const orders = await IDB.getAll('orders').catch(()=>[]);
        const today  = new Date().toISOString().slice(0,10);
        const todayDeliveries = orders.filter(o=>o.dueDate===today&&!new Set(['paid','delivered','sold','invoiced','completed']).has(o.stage||''));
        const overdue = orders.filter(o=>!o._archived&&o.dueDate<today&&!new Set(['paid','delivered','sold','invoiced','completed','rejected']).has(o.stage||''));

        if(!todayDeliveries.length && !overdue.length) return;
        const urgencyBox = briefing.querySelector('[id*="mb-urgency"]') || briefing.querySelector('[style*="background:var(--bg-card2"]');
        if(!urgencyBox) return;

        const div = document.createElement('div');
        div.style.cssText = 'background:#ef444410;border:1px solid #ef444430;border-radius:9px;padding:10px 12px;margin-top:8px';
        div.innerHTML = `
          ${todayDeliveries.length?`<div style="font-size:12px;font-weight:700;color:#ef4444;margin-bottom:6px">📦 Oggi da consegnare: ${todayDeliveries.length}</div>
          ${todayDeliveries.slice(0,3).map(o=>`<div style="font-size:11px;color:var(--text-muted);padding:2px 0">• ${o.clientName||'—'}: ${o.name||'Ordine'}</div>`).join('')}`:''}
          ${overdue.length?`<div style="font-size:12px;font-weight:700;color:#f97316;margin-top:${todayDeliveries.length?6:0}px">⚠️ In ritardo: ${overdue.length} ordini</div>`:''}`;
        urgencyBox.appendChild(div);
      }, 500);
    };
    (console.info||console.log)('[MorningBriefing+ deliveries] Patched ✅');
  };
  setTimeout(tryPatch, 800);
})();


// ═══════════════════════════════════════════════════════════════════════
// 11. INIT ALL IMPROVEMENTS
// ═══════════════════════════════════════════════════════════════════════
(function initImprovements(){
  const init = () => {
    if(typeof Bus==='undefined' || typeof App==='undefined') return setTimeout(init, 600);

    // QuickStats
    QuickStats.init();
    // SidebarBadges
    SidebarBadges.init();

    // Sales sparkline — inject when sales section is opened
    Bus.on && Bus.on('navigate', ({section})=>{
      if(section==='sales') setTimeout(()=>SalesSparkline.init(), 300);
    });
    // Intercept App.navigate for improvements (only if not already patched)
    if(!App.__improvementsPatchApplied) {
      App.__improvementsPatchApplied = true;
      const origNav = App.navigate?.bind(App);
      if(origNav) {
        App.navigate = function(section){
          origNav(section);
          if(section==='sales') setTimeout(()=>SalesSparkline.init(), 400);
          if(section==='sales') setTimeout(()=>{ if(Sales._all?.length){ Sales._renderFooterRow?.(); Sales._updatePillCountsEnhanced?.(); } }, 600);
          setTimeout(()=>QuickStats.update(), 500);
        };
      }
    }

    // Birthday check
    const birthdays = ClientEnhancements.checkBirthdays();
    if(birthdays.length) {
      const today = birthdays.filter(b=>b.daysUntil===0);
      const soon  = birthdays.filter(b=>b.daysUntil>0&&b.daysUntil<=3);
      if(today.length) toast(`🎂 ${today.length} compleanno/anniversario cliente oggi!`,'info');
      else if(soon.length) toast(`🎂 ${soon.length} compleanno/anniversario nei prossimi 3 giorni`,'info');
    }

    // Theme toggle icon sync
    const themeBtn = document.getElementById('theme-toggle-btn');
    if(themeBtn) {
      const updateIcon = ()=>{ themeBtn.innerHTML = document.documentElement.classList.contains('light') ? '🌙' : '☀️'; };
      updateIcon();
      document.addEventListener('themechange', updateIcon);
    }

    (console.info||console.log)('[Improvements v10] All initialized ✅');
  };
  setTimeout(init, 1800);
})();

