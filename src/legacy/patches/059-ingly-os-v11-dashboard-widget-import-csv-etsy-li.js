
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v11 — DASHBOARD WIDGET · IMPORT CSV ETSY · LINK PREVENTIVO
//                PUSH NOTIFICHE · EXPORT SHEETS · PRIMA NOTA
//                COSTO MATERIALI · WHITE LABEL · MULTI-LINGUA BASE
// ════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 1. DASHBOARD WIDGET PERSONALIZZABILI
// ═══════════════════════════════════════════════════════════════════════
const DashboardWidgets = {
  _SK: 'ingly_dash_widgets_v1',
  _editing: false,

  AVAILABLE: [
    { id:'kpi_revenue',  title:'💶 Fatturato',       size:'small',  icon:'fa-euro-sign' },
    { id:'kpi_orders',   title:'📦 Ordini attivi',    size:'small',  icon:'fa-layer-group' },
    { id:'kpi_overdue',  title:'⚠️ In ritardo',       size:'small',  icon:'fa-clock' },
    { id:'kpi_clients',  title:'👤 Clienti totali',   size:'small',  icon:'fa-users' },
    { id:'briefing',     title:'⚡ Azioni oggi',      size:'large',  icon:'fa-bolt' },
    { id:'recent_orders',title:'🔄 Ultimi ordini',    size:'large',  icon:'fa-stream' },
    { id:'revenue_chart',title:'📈 Grafico ricavi',   size:'large',  icon:'fa-chart-line' },
    { id:'seasonal',     title:'🎯 Alert stagionali', size:'medium', icon:'fa-calendar-star' },
    { id:'quick_actions',title:'🚀 Azioni rapide',    size:'medium', icon:'fa-rocket' },
    { id:'top_clients',  title:'👑 Top clienti',      size:'medium', icon:'fa-crown' },
    { id:'sales_sparkline', title:'📊 Mini-grafico',  size:'small',  icon:'fa-chart-bar' },
    { id:'timer_active', title:'⏱ Timer attivi',      size:'small',  icon:'fa-stopwatch' },
  ],

  getLayout() {
    try { return JSON.parse(localStorage.getItem(this._SK)||'null'); }
    catch { return null; }
  },

  saveLayout(layout) { localStorage.setItem(this._SK, JSON.stringify(layout)); },

  getDefault() {
    return ['kpi_revenue','kpi_orders','kpi_overdue','kpi_clients',
            'briefing','recent_orders','revenue_chart','seasonal','quick_actions'];
  },

  async render(containerId) {
    const el = document.getElementById(containerId || 'dash-widget-grid');
    if(!el) return;

    const layout  = this.getLayout() || this.getDefault();
    const editing = this._editing;

    el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;padding:16px">
      ${editing ? `
      <div style="grid-column:1/-1;display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--primary-dim);border-radius:8px;border:1px solid var(--primary-border);margin-bottom:4px">
        <span style="font-size:12px;font-weight:700;color:var(--primary)">🎛 Modalità modifica — trascina i widget per riordinare, clicca ✕ per rimuovere</span>
        <button onclick="DashboardWidgets._editing=false;DashboardWidgets.render()"
          style="margin-left:auto;padding:5px 12px;background:var(--primary);color:#000;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">✅ Fine</button>
      </div>` : ''}
      ${layout.map((wid,i)=>{
        const meta = this.AVAILABLE.find(a=>a.id===wid);
        if(!meta) return '';
        const colspan = meta.size==='large' ? 'grid-column:span 2' : '';
        return `<div data-widget="${wid}" style="${colspan};position:relative" ${editing?'draggable="true" ondragstart="DashboardWidgets._dragStart(event,'+i+')" ondragover="event.preventDefault()" ondrop="DashboardWidgets._drop(event,'+i+')"':''}>
          ${editing ? `<button onclick="DashboardWidgets._remove('${wid}')" style="position:absolute;top:4px;right:4px;z-index:10;background:#ef4444;color:#fff;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:10px;line-height:18px;text-align:center;padding:0">✕</button>` : ''}
          <div id="dw-${wid}" style="height:100%"></div>
        </div>`;
      }).join('')}
      ${editing ? `
      <div style="grid-column:1/-1;padding-top:8px;border-top:1px solid var(--border)">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px">Aggiungi widget</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${this.AVAILABLE.filter(a=>!layout.includes(a.id)).map(a=>`
          <button onclick="DashboardWidgets._add('${a.id}')"
            style="padding:5px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-muted)">
            + ${a.title}
          </button>`).join('')}
        </div>
      </div>` : `
      <div style="grid-column:1/-1;text-align:right">
        <button onclick="DashboardWidgets._editing=true;DashboardWidgets.render()"
          style="padding:5px 10px;background:none;border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:10px;color:var(--text-muted)">
          🎛 Personalizza dashboard
        </button>
      </div>`}
    </div>`;

    // Render each widget content
    for(const wid of layout) await this._renderWidget(wid);
  },

  async _renderWidget(wid) {
    const el = document.getElementById('dw-'+wid);
    if(!el) return;
    try {
      switch(wid) {
        case 'kpi_revenue':    await this._wKpiRevenue(el); break;
        case 'kpi_orders':     await this._wKpiOrders(el); break;
        case 'kpi_overdue':    await this._wKpiOverdue(el); break;
        case 'kpi_clients':    await this._wKpiClients(el); break;
        case 'briefing':       await this._wBriefing(el); break;
        case 'recent_orders':  await this._wRecentOrders(el); break;
        case 'revenue_chart':  await this._wRevenueChart(el); break;
        case 'seasonal':       await this._wSeasonal(el); break;
        case 'quick_actions':  await this._wQuickActions(el); break;
        case 'top_clients':    await this._wTopClients(el); break;
        case 'timer_active':   await this._wTimerActive(el); break;
        default:
          el.innerHTML = `<div style="padding:12px;background:var(--bg-card2);border-radius:10px;font-size:11px;color:var(--text-dim)">${wid}</div>`;
      }
    } catch(e) { el.innerHTML = `<div style="padding:12px;background:var(--bg-card2);border-radius:10px;font-size:10px;color:#ef4444">Errore: ${e.message}</div>`; }
  },

  _card(icon, label, value, sub, color) {
    color = color || 'var(--primary)';
    return `<div style="background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);padding:14px 16px;height:100%;min-height:80px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:18px">${icon}</span>
        <span style="font-size:11px;color:var(--text-muted);font-weight:600">${label}</span>
      </div>
      <div style="font-size:24px;font-weight:900;color:${color}">${value}</div>
      ${sub?`<div style="font-size:10px;color:var(--text-dim);margin-top:3px">${sub}</div>`:''}
    </div>`;
  },

  async _wKpiRevenue(el) {
    const now = new Date();
    const sales = await IDB.getAll('sales').catch(()=>[]);
    const mSales = sales.filter(s=>new Date(s.date||'').getMonth()===now.getMonth()&&new Date(s.date||'').getFullYear()===now.getFullYear());
    const rev = mSales.reduce((a,s)=>a+(+(s.amount||0)),0);
    el.innerHTML = this._card('💶','Fatturato mese','€'+Math.round(rev).toLocaleString('it-IT'),mSales.length+' vendite','#22c55e');
  },

  async _wKpiOrders(el) {
    const orders = await IDB.getAll('orders').catch(()=>[]);
    const active = orders.filter(o=>!['venduto','annullato','completato'].includes(o.stage||o.status||'')).filter(o=>!o._archived);
    el.innerHTML = this._card('📦','Ordini attivi',active.length,'in workflow','#6366f1');
  },

  async _wKpiOverdue(el) {
    const orders = await IDB.getAll('orders').catch(()=>[]);
    const now = new Date();
    const overdue = orders.filter(o=>o.dueDate&&new Date(o.dueDate)<now&&!['venduto','annullato','completato'].includes(o.stage||o.status||''));
    el.innerHTML = this._card('⚠️','In ritardo',overdue.length,overdue.length?'ordini scaduti':'tutto in ordine ✅', overdue.length?'#ef4444':'#22c55e');
  },

  async _wKpiClients(el) {
    const clients = await IDB.getAll('clients').catch(()=>[]);
    el.innerHTML = this._card('👤','Clienti totali',clients.length,'nel database','#3b82f6');
  },

  async _wBriefing(el) {
    el.innerHTML = `<div style="background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);overflow:hidden">
      <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:700">⚡ Azioni oggi</div>
      <div id="dw-briefing-inner" style="min-height:60px"></div>
    </div>`;
    const inner = document.getElementById('dw-briefing-inner');
    if(inner && typeof BriefingActions!=='undefined') {
      const actions = await BriefingActions.getActions();
      if(!actions.length) { inner.innerHTML = '<div style="padding:10px 14px;font-size:11px;color:var(--text-dim)">✅ Nessuna azione urgente</div>'; return; }
      inner.innerHTML = actions.slice(0,3).map(a=>`
      <div style="display:flex;align-items:center;gap:8px;padding:7px 14px;border-bottom:0.5px solid var(--border)">
        <span style="font-size:14px">${a.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;font-weight:700">${a.title}</div>
          <div style="font-size:9px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.desc}</div>
        </div>
        <button onclick="(${a.action.toString()})()" style="padding:3px 7px;background:var(--primary);color:#000;border:none;border-radius:4px;cursor:pointer;font-size:9px;font-weight:700;flex-shrink:0">${a.cta}</button>
      </div>`).join('');
    }
  },

  async _wRecentOrders(el) {
    const orders = (await IDB.getAll('orders').catch(()=>[])).filter(o=>!o._archived).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,5);
    el.innerHTML = `<div style="background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);overflow:hidden">
      <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:700">🔄 Ultimi ordini</div>
      ${orders.map(o=>{
        const st = (typeof GestioneOrdini!=='undefined') ? (GestioneOrdini.STATES[GestioneOrdini._normalizeState(o.stage||o.status||'preventivo')]||{}) : {};
        const val = +(o.total||o.value||0);
        return `<div onclick="typeof GestioneOrdini!=='undefined'&&GestioneOrdini._openDetail(${o.id})" style="display:flex;align-items:center;gap:8px;padding:7px 14px;border-bottom:0.5px solid var(--border);cursor:pointer" onmouseover="this.style.background='var(--bg-card)'" onmouseout="this.style.background=''">
          <span style="font-size:12px">${st.emoji||'📋'}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.clientName||'—'}</div>
            <div style="font-size:9px;color:var(--text-dim)">${o.name||'—'}</div>
          </div>
          ${val?`<div style="font-size:11px;font-weight:800;flex-shrink:0">€${Math.round(val)}</div>`:''}
        </div>`;
      }).join('')}
      <div style="padding:7px 14px;text-align:center"><button onclick="App.navigate('gestione_ordini')" style="font-size:10px;color:var(--primary);background:none;border:none;cursor:pointer">Vedi tutti →</button></div>
    </div>`;
  },

  async _wRevenueChart(el) {
    const sales = await IDB.getAll('sales').catch(()=>[]);
    const now = new Date();
    // Last 6 months
    const months = [];
    for(let i=5;i>=0;i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = d.toLocaleDateString('it-IT',{month:'short'});
      const val = sales.filter(s=>(s.date||'').startsWith(key)).reduce((a,s)=>a+(+(s.amount||0)),0);
      months.push({label,val});
    }
    const maxVal = Math.max(...months.map(m=>m.val),1);
    el.innerHTML = `<div style="background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);padding:14px">
      <div style="font-size:12px;font-weight:700;margin-bottom:10px">📈 Ricavi ultimi 6 mesi</div>
      <div style="display:flex;align-items:flex-end;gap:6px;height:80px">
        ${months.map(m=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
          <div style="width:100%;background:var(--primary);border-radius:3px 3px 0 0;transition:.3s" title="€${Math.round(m.val)}" style="height:${Math.max(4,m.val/maxVal*72)}px"></div>
          <div style="font-size:8px;color:var(--text-dim)">${m.label}</div>
        </div>`).join('')}
      </div>
    </div>`;
    // Fix heights after DOM insert
    requestAnimationFrame(()=>{
      const bars = el.querySelectorAll('[title^="€"]');
      bars.forEach((bar,i)=>{ bar.style.height = Math.max(4,months[i].val/maxVal*72)+'px'; });
    });
  },

  async _wSeasonal(el) {
    const alerts = typeof SeasonalGuard!=='undefined' ? SeasonalGuard._getActive() : [];
    el.innerHTML = `<div style="background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);overflow:hidden">
      <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:700">🎯 Alert stagionali</div>
      ${alerts.length ? alerts.slice(0,2).map(a=>`
      <div style="padding:8px 14px;border-bottom:0.5px solid var(--border)">
        <div style="font-size:11px;font-weight:700">${a.em} ${a.title}</div>
        <div style="font-size:9px;color:var(--text-dim);margin-top:2px">${a._daysLeft<=0?'Oggi':'Tra '+a._daysLeft+' giorni'} · ${a.msg.slice(0,60)}...</div>
      </div>`).join('') : '<div style="padding:10px 14px;font-size:11px;color:var(--text-dim)">Nessun alert imminente</div>'}
    </div>`;
  },

  async _wQuickActions(el) {
    el.innerHTML = `<div style="background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);padding:12px">
      <div style="font-size:12px;font-weight:700;margin-bottom:10px">🚀 Azioni rapide</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        ${[
          ['📋 Preventivo','quoter'], ['🔄 Nuovo ordine','gestione_ordini'],
          ['💰 Vendite','sales'],     ['👤 Clienti','clients'],
          ['🤖 AI Studio','ai'],      ['📊 Report','monthly_report'],
        ].map(([label,section])=>`<button onclick="App.navigate('${section}')"
          style="padding:8px 6px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px;font-weight:600;text-align:center;transition:.15s"
          onmouseover="this.style.background='var(--primary-dim)'" onmouseout="this.style.background='var(--bg-card)'">${label}</button>`).join('')}
      </div>
    </div>`;
  },

  async _wTopClients(el) {
    const sales = await IDB.getAll('sales').catch(()=>[]);
    const now = new Date();
    const mSales = sales.filter(s=>new Date(s.date||'').getFullYear()===now.getFullYear());
    const map = {};
    mSales.forEach(s=>{ const k=s.clientName||'—'; map[k]=(map[k]||0)+(+(s.amount||0)); });
    const top = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
    el.innerHTML = `<div style="background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);overflow:hidden">
      <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:700">👑 Top clienti (anno)</div>
      ${top.map(([name,val],i)=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 14px;border-bottom:0.5px solid var(--border)">
        <span style="font-size:11px;font-weight:800;color:var(--primary);width:16px">${i+1}</span>
        <div style="flex:1;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</div>
        <div style="font-size:12px;font-weight:800">€${Math.round(val).toLocaleString('it-IT')}</div>
      </div>`).join('')}
      ${!top.length?'<div style="padding:10px 14px;font-size:11px;color:var(--text-dim)">Nessun dato</div>':''}
    </div>`;
  },

  async _wTimerActive(el) {
    const timers = (typeof ProductionTimer!=='undefined') ? ProductionTimer._active : {};
    const count = Object.keys(timers).length;
    el.innerHTML = this._card('⏱','Timer attivi', count, count ? Object.keys(timers).slice(0,2).join(', ') : 'Nessun timer in corso', count?'#8b5cf6':'var(--text-muted)');
  },

  _dragging: null,
  _dragStart(e, idx) { this._dragging = idx; e.dataTransfer.effectAllowed='move'; },
  _drop(e, idx) {
    if(this._dragging===null) return;
    const layout = this.getLayout() || this.getDefault();
    const item = layout.splice(this._dragging,1)[0];
    layout.splice(idx,0,item);
    this.saveLayout(layout);
    this._dragging = null;
    this.render();
  },
  _remove(wid) {
    const layout = (this.getLayout()||this.getDefault()).filter(w=>w!==wid);
    this.saveLayout(layout);
    this.render();
  },
  _add(wid) {
    const layout = this.getLayout()||this.getDefault();
    if(!layout.includes(wid)) layout.push(wid);
    this.saveLayout(layout);
    this._editing = true;
    this.render();
  },
};
window.DashboardWidgets = DashboardWidgets;


// ═══════════════════════════════════════════════════════════════════════
// 2. IMPORT CSV ETSY ORDINI
// ═══════════════════════════════════════════════════════════════════════
const EtsyCSVImporter = {

  // Etsy CSV columns: Order ID, Email, Name, Date, Items, Quantity, Price, ...
  async importFile(file) {
    if(!file) return;
    const text = await file.text().catch(()=>'');
    if(!text) { toast('File non leggibile','error'); return; }
    const lines = text.split('\n').filter(l=>l.trim());
    if(lines.length < 2) { toast('CSV vuoto o non valido','warning'); return; }

    const headers = lines[0].split(',').map(h=>h.replace(/^"|"$/g,'').trim().toLowerCase());
    const rows    = lines.slice(1);
    const orders  = [];
    const existing = await IDB.getAll('orders').catch(()=>[]);
    const existingEtsyIds = new Set(existing.filter(o=>o._etsyOrderId).map(o=>o._etsyOrderId));
    let skipped = 0, imported = 0;

    for(const row of rows) {
      const cols = this._parseCSVRow(row);
      if(cols.length < 3) continue;

      const get = (name) => {
        const idx = headers.findIndex(h=>h.includes(name));
        return idx >= 0 ? (cols[idx]||'').replace(/^"|"$/g,'').trim() : '';
      };

      const etsyId = get('order id') || get('order number') || get('transaction id') || String(Date.now()+Math.random());
      if(existingEtsyIds.has(etsyId)) { skipped++; continue; }

      const dateStr  = get('sale date') || get('date') || get('order date') || '';
      const itemName = get('item title') || get('item name') || get('title') || get('listing title') || 'Ordine Etsy';
      const buyer    = get('buyer name') || get('ship name') || get('name') || '';
      const priceStr = get('item total') || get('price') || get('subtotal') || get('total') || '0';
      const price    = parseFloat(priceStr.replace(/[^0-9.,]/g,'').replace(',','.')) || 0;
      const qty      = parseInt(get('quantity')||'1') || 1;

      const order = {
        id:           Date.now() + imported,
        clientName:   buyer,
        name:         (qty>1?qty+'x ':'')+itemName.slice(0,80),
        total:        price,
        value:        price,
        stage:        'accettato',
        status:       'accettato',
        channel:      'Etsy',
        source:       'etsy_csv',
        createdAt:    dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
        _etsyOrderId: etsyId,
        _history:     [{ from:null, to:'accettato', ts:new Date().toISOString(), note:'Import Etsy CSV' }],
      };
      await IDB.put('orders', order);
      imported++;
    }

    if(typeof AppStore!=='undefined') AppStore.invalidate('orders');
    document.dispatchEvent(new CustomEvent('orderUpdated'));
    toast(`✅ Importati ${imported} ordini Etsy${skipped?' ('+skipped+' già presenti)':''}`, 'success');
    return { imported, skipped };
  },

  _parseCSVRow(row) {
    const result = []; let cur = ''; let inQ = false;
    for(let i=0;i<row.length;i++) {
      const ch = row[i];
      if(ch==='"') { inQ=!inQ; }
      else if(ch===',' && !inQ) { result.push(cur); cur=''; }
      else { cur+=ch; }
    }
    result.push(cur);
    return result;
  },

  // UI per import
  showImportModal() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:#000c;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick = e=>{ if(e.target===modal) modal.remove(); };
    modal.innerHTML = `
    <div style="background:var(--bg-card);border-radius:14px;width:min(500px,96vw);border:1px solid var(--border2);box-shadow:0 24px 64px #000d">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">🛍</span>
        <div style="flex:1"><div style="font-size:14px;font-weight:800">Import Ordini Etsy</div>
          <div style="font-size:10px;color:var(--text-muted)">Da file CSV — Etsy Shop Manager → Ordini → Esporta</div></div>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">✕</button>
      </div>
      <div style="padding:18px">
        <!-- Guide steps -->
        <div style="background:var(--bg-card2);border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:12px">
          <div style="font-weight:700;margin-bottom:6px;color:var(--text)">Come esportare da Etsy:</div>
          <div style="color:var(--text-muted);line-height:1.8">
            1. Vai su <strong>etsy.com/your/shops/me/orders</strong><br>
            2. Clicca <strong>"Scarica CSV"</strong> in alto a destra<br>
            3. Salva il file e caricalo qui sotto
          </div>
        </div>
        <!-- File upload -->
        <label style="display:block;border:2px dashed var(--border);border-radius:10px;padding:24px;text-align:center;cursor:pointer;transition:.2s"
          onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="font-size:32px;margin-bottom:8px">📄</div>
          <div style="font-size:13px;font-weight:700;color:var(--text)">Trascina il CSV qui o clicca</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Accetta file .csv da Etsy</div>
          <input type="file" accept=".csv,text/csv" style="display:none"
            onchange="EtsyCSVImporter.importFile(this.files[0]).then(()=>this.closest('[style*=fixed]').remove())">
        </label>
        <!-- Also support ClientCSV -->
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px">Oppure importa clienti da CSV:</div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 12px;background:var(--bg-card2);border-radius:7px;border:1px solid var(--border)">
            <span style="font-size:14px">👤</span>
            <span style="font-size:12px">Importa clienti (.csv)</span>
            <input type="file" accept=".csv" style="display:none" onchange="ClientCSVImporter.importFile(this.files[0]).then(()=>this.closest('[style*=fixed]').remove())">
          </label>
        </div>
      </div>
    </div>`;
    document.body.appendChild(modal);
  },
};
window.EtsyCSVImporter = EtsyCSVImporter;

// Importatore clienti CSV
const ClientCSVImporter = {
  async importFile(file) {
    if(!file) return;
    const text = await file.text().catch(()=>'');
    const lines = text.split('\n').filter(l=>l.trim());
    if(lines.length < 2) { toast('CSV vuoto','warning'); return; }
    const headers = lines[0].split(',').map(h=>h.replace(/^"|"$/g,'').trim().toLowerCase());
    const existing = await IDB.getAll('clients').catch(()=>[]);
    const existingNames = new Set(existing.map(c=>(c.name||c.company||'').toLowerCase()));
    let imported = 0, skipped = 0;
    for(const row of lines.slice(1)) {
      const cols = row.split(',').map(c=>c.replace(/^"|"$/g,'').trim());
      const get = (n) => { const i=headers.findIndex(h=>h.includes(n)); return i>=0?cols[i]||'':''; };
      const name = get('name') || get('nome') || get('company') || get('azienda') || '';
      if(!name) continue;
      if(existingNames.has(name.toLowerCase())) { skipped++; continue; }
      await IDB.put('clients',{ id:Date.now()+imported, name, email:get('email'), phone:get('phone')||get('telefono'), company:get('company')||get('azienda'), notes:get('note')||get('notes'), createdAt:new Date().toISOString() });
      imported++;
    }
    if(typeof AppStore!=='undefined') AppStore.invalidate('clients');
    toast(`✅ Importati ${imported} clienti${skipped?' ('+skipped+' saltati)':''}`, 'success');
    return { imported, skipped };
  },
};
window.ClientCSVImporter = ClientCSVImporter;


// ═══════════════════════════════════════════════════════════════════════
// 3. LINK PREVENTIVO CONDIVISIBILE (no server)
// ═══════════════════════════════════════════════════════════════════════
const ShareableQuoteLink = {

  generate(quoteId) {
    return new Promise(async (resolve) => {
      const q = await IDB.get('quotes', +quoteId||quoteId).catch(()=>null);
      if(!q) { toast('Preventivo non trovato','error'); resolve(null); return; }

      const cp = (typeof CompanyProfile!=='undefined') ? CompanyProfile.get() : {};
      const tpl = (typeof TemplateEditor!=='undefined') ? TemplateEditor.getAll()[TemplateManager?.getActive?.()||'amichevole'] : {};

      const data = {
        q,
        company: { name:cp.name, phone:cp.phone, email:cp.email, logo:cp.logo||'' },
        colors:  tpl.colors || { primary:'#6366f1', headerBg:'#1e1e2e', headerText:'#fff', bg:'#fff', text:'#1a1a2e', border:'#e2e8f0' },
        font:    tpl.font || 'system-ui',
        ts:      Date.now(),
      };

      // Encode in URL hash (no server)
      const json    = JSON.stringify(data);
      const encoded = btoa(unescape(encodeURIComponent(json)));
      const url     = location.href.split('#')[0] + '#quote=' + encoded;

      // Show share modal
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;inset:0;background:#000c;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
      modal.onclick = e=>{ if(e.target===modal) modal.remove(); };
      modal.innerHTML = `
      <div style="background:var(--bg-card);border-radius:14px;width:min(520px,96vw);border:1px solid var(--border2);box-shadow:0 24px 64px #000d;padding:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <span style="font-size:22px">🔗</span>
          <div><div style="font-size:15px;font-weight:800">Link preventivo condivisibile</div>
               <div style="font-size:11px;color:var(--text-muted)">Il cliente apre il link e vede il preventivo senza login</div></div>
          <button onclick="this.closest('[style*=fixed]').remove()" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">✕</button>
        </div>
        <div style="background:var(--bg-card2);border-radius:8px;padding:10px 12px;margin-bottom:12px;word-break:break-all;font-size:11px;color:var(--text-muted);font-family:monospace;max-height:80px;overflow:auto">${url}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button onclick="navigator.clipboard.writeText('${url.replace(/'/g,"\\'")}').then(()=>toast('✅ Link copiato!','success'))"
            style="flex:1;padding:9px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">📋 Copia link</button>
          <button onclick="window.open('https://wa.me/?text=${encodeURIComponent('Ciao! Ecco il tuo preventivo: ')}'+encodeURIComponent('${url.replace(/'/g,"\\'")}'),'_blank')"
            style="padding:9px 14px;background:#25D36615;border:1px solid #25D36640;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;color:#25D366">💬 WA</button>
          <button onclick="ShareableQuoteLink.openPreview('${quoteId}')"
            style="padding:9px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px">👁 Anteprima</button>
        </div>
        <div style="margin-top:10px;font-size:10px;color:var(--text-dim)">✅ Nessun server necessario — funziona completamente offline</div>
      </div>`;
      document.body.appendChild(modal);
      resolve(url);
    });
  },

  openPreview(quoteId) {
    // Re-generate and open in new tab
    this.generate(quoteId).then(url=>{ if(url) window.open(url,'_blank'); });
  },

  // Auto-render if URL has #quote= hash
  autoRender() {
    if(!location.hash.startsWith('#quote=')) return false;
    try {
      const encoded = location.hash.replace('#quote=','');
      const json    = decodeURIComponent(escape(atob(encoded)));
      const data    = JSON.parse(json);
      this._renderClientView(data);
      return true;
    } catch(e) { return false; }
  },

  _renderClientView(data) {
    const { q, company, colors, font } = data;
    const T = colors;
    const lines = q.lines || [];
    const total = lines.reduce((a,l)=>a+(l.subtotal||0),0);
    const markup = q.markup || 1;
    const discount = q.discount || 0;
    const finalTotal = total * markup * (1 - discount/100);

    document.body.innerHTML = `
    <div style="min-height:100vh;background:#f0f2f5;font-family:${font};padding:20px">
      <div style="max-width:700px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)">
        <!-- Header -->
        <div style="background:${T.headerBg};padding:24px 28px;color:${T.headerText}">
          ${company.logo?`<img src="${company.logo}" style="height:40px;margin-bottom:12px;display:block" onerror="this.remove()">`:''}
          <div style="font-size:20px;font-weight:900">${company.name||'Preventivo'}</div>
          <div style="font-size:13px;opacity:.8;margin-top:4px">Preventivo — ${q.name||''}</div>
        </div>
        <!-- Client info -->
        <div style="padding:18px 28px;background:#f8f9fa;border-bottom:1px solid ${T.border}">
          <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase">Destinatario</div>
          <div style="font-size:16px;font-weight:800;margin-top:4px">${q.clientName||'Cliente'}</div>
          <div style="font-size:12px;color:#666;margin-top:2px">Data: ${new Date(q.date||Date.now()).toLocaleDateString('it-IT')}</div>
        </div>
        <!-- Line items -->
        <div style="padding:18px 28px">
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
            <thead><tr style="background:${T.primary}">
              <th style="padding:9px 12px;text-align:left;color:#fff;border-radius:6px 0 0 6px">Voce</th>
              <th style="padding:9px 8px;text-align:center;color:#fff">Qtà</th>
              <th style="padding:9px 12px;text-align:right;color:#fff;border-radius:0 6px 6px 0">Totale</th>
            </tr></thead>
            <tbody>
              ${lines.map((l,i)=>`<tr style="background:${i%2?'#f8f9fa':'#fff'};border-bottom:1px solid ${T.border}">
                <td style="padding:9px 12px">${l.name||l.desc||'—'}</td>
                <td style="padding:9px 8px;text-align:center;color:#888">${l.qty||1}</td>
                <td style="padding:9px 12px;text-align:right;font-weight:700">€${(l.subtotal||0).toFixed(2)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
          <!-- Totals -->
          <div style="max-width:200px;margin-left:auto">
            ${markup !== 1 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#888;padding:4px 0;border-bottom:1px solid ${T.border}"><span>Imponibile</span><span>€${total.toFixed(2)}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:900;color:${T.primary};padding:8px 0;border-top:2px solid ${T.primary};margin-top:4px">
              <span>TOTALE</span><span>€${finalTotal.toFixed(2)}</span>
            </div>
          </div>
          ${q.notes?`<div style="margin-top:16px;padding:10px 14px;background:#f8f9fa;border-left:4px solid ${T.primary};border-radius:0 6px 6px 0;font-size:12px;color:#666">${q.notes}</div>`:''}
        </div>
        <!-- Footer -->
        <div style="padding:14px 28px;background:#f8f9fa;border-top:1px solid ${T.border};font-size:11px;color:#888;text-align:center">
          ${company.phone||''} ${company.email?'· '+company.email:''} · Preventivo generato con INGLY OS
        </div>
      </div>
      <div style="text-align:center;margin-top:12px">
        <button onclick="window.print()" style="padding:10px 20px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">🖨️ Stampa / Salva PDF</button>
      </div>
    </div>`;
  },
};
window.ShareableQuoteLink = ShareableQuoteLink;
// Auto-render client view if URL has hash
if(ShareableQuoteLink.autoRender()) { /* rendered */ }


// ═══════════════════════════════════════════════════════════════════════
// 4. PUSH NOTIFICATIONS BROWSER
// ═══════════════════════════════════════════════════════════════════════
const PushNotifications = {
  _SK: 'ingly_push_v1',

  async request() {
    if(!('Notification' in window)) { toast('Browser non supporta le notifiche','warning'); return false; }
    if(Notification.permission === 'granted') return true;
    const perm = await Notification.requestPermission();
    if(perm === 'granted') {
      localStorage.setItem(this._SK, '1');
      toast('🔔 Notifiche attivate!','success');
      return true;
    }
    toast('Notifiche non concesse','info');
    return false;
  },

  isGranted() { return Notification.permission === 'granted'; },

  send(title, body, opts) {
    if(!this.isGranted()) return;
    const n = new Notification('INGLY OS — '+title, {
      body:  body||'',
      icon:  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="%236366f1"/><text x="16" y="22" text-anchor="middle" font-size="18">🎨</text></svg>',
      tag:   opts?.tag || 'ingly-'+Date.now(),
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%236366f1"/></svg>',
    });
    if(opts?.onClick) n.onclick = opts.onClick;
    return n;
  },

  // Check and send due-date alerts
  async checkDueDates() {
    if(!this.isGranted()) return;
    const orders = await IDB.getAll('orders').catch(()=>[]);
    const now    = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate()+1);

    orders.filter(o=>{
      if(!o.dueDate || ['venduto','annullato','completato'].includes(o.stage||o.status||'')) return false;
      const d = new Date(o.dueDate);
      return d.toDateString() === tomorrow.toDateString();
    }).forEach(o=>{
      this.send(
        'Scadenza domani',
        `${o.clientName||'Ordine'} — ${o.name||''}`,
        { tag:'due-'+o.id, onClick:()=>{ if(typeof App!=='undefined') App.navigate('gestione_ordini'); } }
      );
    });
  },

  // Daily check at 9:00
  scheduleDailyCheck() {
    const check = () => {
      const h = new Date().getHours();
      if(h >= 9 && h < 10) this.checkDueDates();
      setTimeout(check, 3600000); // retry every hour
    };
    setTimeout(check, 5000);
  },

  // Pannello in Settings
  renderPanel() {
    const el = document.getElementById('push-notif-panel');
    if(!el) return;
    const granted = this.isGranted();
    el.innerHTML = `
    <div style="padding:10px 0">
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0">
        <span style="font-size:22px">${granted?'🔔':'🔕'}</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700">${granted?'Notifiche attive':'Notifiche disattivate'}</div>
          <div style="font-size:11px;color:var(--text-muted)">${granted?'Ricevi alert scadenze ordini anche col browser chiuso':'Attiva per ricevere avvisi di scadenza'}</div>
        </div>
        ${!granted?`<button onclick="PushNotifications.request().then(()=>PushNotifications.renderPanel())"
          style="padding:7px 14px;background:var(--primary);color:#000;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700">🔔 Attiva</button>`:'<span style="font-size:11px;color:#22c55e;font-weight:700">✅ Attive</span>'}
      </div>
    </div>`;
  },
};
window.PushNotifications = PushNotifications;
PushNotifications.scheduleDailyCheck();


// ═══════════════════════════════════════════════════════════════════════
// 5. PRIMA NOTA AUTOMATICA
// ═══════════════════════════════════════════════════════════════════════
const PrimaNota = {
  async getEntries() {
    const sales = await IDB.getAll('sales').catch(()=>[]);
    const entries = [];
    sales.filter(s=>s.status==='pagato').forEach(s=>{
      entries.push({
        id:     s.id,
        date:   s.paidAt || s.date || '',
        type:   'entrata',
        desc:   s.desc || s.clientName || 'Vendita',
        client: s.clientName || '',
        amount: +(s.amount||0),
        channel:s.channel||'Diretto',
        category:'Ricavo artigianato',
        saleId: s.id,
      });
    });
    return entries.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  },

  async render() {
    const el = document.getElementById('view-prima_nota');
    if(!el) return;
    const entries = await this.getEntries();
    const now = new Date();
    const year = now.getFullYear();
    const yEntries = entries.filter(e=>new Date(e.date||0).getFullYear()===year);
    const totalEntrate = yEntries.filter(e=>e.type==='entrata').reduce((a,e)=>a+(+e.amount),0);
    const fmt = v=>'€'+Math.round(v).toLocaleString('it-IT');

    el.innerHTML = `
    <div style="padding:16px 20px;max-width:1100px;margin:0 auto">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:2px solid var(--border)">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center;font-size:22px">📒</div>
        <div style="flex:1">
          <h2 style="margin:0 0 3px;font-size:19px;font-weight:900">Prima Nota</h2>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">${yEntries.length} movimenti ${year} · Entrate: ${fmt(totalEntrate)}</p>
        </div>
        <button onclick="PrimaNota.exportCSV()"
          style="padding:7px 13px;background:var(--primary);color:#000;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">📥 Export CSV</button>
      </div>
      <!-- Summary cards -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
        <div style="padding:12px;background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);border-left:3px solid #22c55e">
          <div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;font-weight:700">Entrate ${year}</div>
          <div style="font-size:20px;font-weight:900;color:#22c55e">${fmt(totalEntrate)}</div>
        </div>
        <div style="padding:12px;background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);border-left:3px solid #6366f1">
          <div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;font-weight:700">Movimenti</div>
          <div style="font-size:20px;font-weight:900;color:#6366f1">${yEntries.length}</div>
        </div>
        <div style="padding:12px;background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);border-left:3px solid #f97316">
          <div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;font-weight:700">Media mensile</div>
          <div style="font-size:20px;font-weight:900;color:#f97316">${fmt(totalEntrate/12)}</div>
        </div>
      </div>
      <!-- Table -->
      <div style="border-radius:10px;border:1px solid var(--border);overflow:hidden;max-height:calc(100vh-300px);overflow-y:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead style="position:sticky;top:0;z-index:5;background:var(--bg-card2)">
            <tr>
              <th style="padding:8px 12px;text-align:left;border-bottom:1px solid var(--border);font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Data</th>
              <th style="padding:8px 12px;border-bottom:1px solid var(--border);font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Descrizione</th>
              <th style="padding:8px 12px;border-bottom:1px solid var(--border);font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Cliente</th>
              <th style="padding:8px 12px;border-bottom:1px solid var(--border);font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Canale</th>
              <th style="padding:8px 12px;text-align:right;border-bottom:1px solid var(--border);font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Importo</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(e=>`<tr style="border-bottom:1px solid var(--border);border-left:3px solid #22c55e;transition:.12s" onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background=''">
              <td style="padding:8px 12px;font-size:11px;white-space:nowrap">${e.date?new Date(e.date).toLocaleDateString('it-IT'):'—'}</td>
              <td style="padding:8px 12px;font-weight:600">${e.desc}</td>
              <td style="padding:8px 12px;color:var(--text-muted)">${e.client||'—'}</td>
              <td style="padding:8px 12px"><span style="font-size:10px;padding:2px 6px;background:var(--primary-dim);color:var(--primary);border-radius:4px">${e.channel}</span></td>
              <td style="padding:8px 12px;text-align:right;font-weight:800;color:#22c55e">+${fmt(e.amount)}</td>
            </tr>`).join('')}
          </tbody>
          <tfoot style="position:sticky;bottom:0;background:var(--bg-card2)">
            <tr>
              <td colspan="4" style="padding:9px 12px;font-size:11px;font-weight:700">TOTALE ${entries.length} movimenti</td>
              <td style="padding:9px 12px;text-align:right;font-size:16px;font-weight:900;color:#22c55e">+${fmt(totalEntrate)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;
  },

  async exportCSV() {
    const entries = await this.getEntries();
    const rows = [['Data','Tipo','Descrizione','Cliente','Canale','Importo','Categoria']];
    entries.forEach(e=>rows.push([e.date,e.type,e.desc,e.client,e.channel,e.amount,e.category]));
    const csv = rows.map(r=>r.map(v=>'"'+String(v||'').replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'prima-nota-'+new Date().getFullYear()+'.csv'; a.click();
    URL.revokeObjectURL(a.href);
    toast('📥 Prima nota esportata per il commercialista','success');
  },
};
window.PrimaNota = PrimaNota;


// ═══════════════════════════════════════════════════════════════════════
// 6. COSTO MATERIALI PER ORDINE
// ═══════════════════════════════════════════════════════════════════════
const OrderMaterials = {

  async get(orderId) {
    const key = 'order_mats_'+orderId;
    try { return JSON.parse(localStorage.getItem(key)||'[]'); } catch { return []; }
  },

  async save(orderId, mats) {
    localStorage.setItem('order_mats_'+orderId, JSON.stringify(mats));
  },

  calcCost(mats) { return mats.reduce((a,m)=>a+(+(m.qty||1))*(+(m.unitCost||0)),0); },

  async renderPanel(orderId, container) {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if(!el) return;
    const mats    = await this.get(orderId);
    const order   = await IDB.get('orders',+orderId||orderId).catch(()=>null);
    const allMats = await IDB.getAll('materials').catch(()=>[]);
    const totalCost = this.calcCost(mats);
    const revenue   = +(order?.total||order?.value||0);
    const margin    = revenue > 0 ? ((revenue-totalCost)/revenue*100).toFixed(0) : null;

    el.innerHTML = `
    <div style="padding:10px 0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase">🧱 Materiali usati</div>
        ${totalCost > 0 ? `<div style="margin-left:auto;font-size:11px;font-weight:700;color:${+margin>=50?'#22c55e':+margin>=30?'#f97316':'#ef4444'}">Margine: ${margin}%</div>` : ''}
      </div>
      ${mats.map((m,i)=>`<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:0.5px solid var(--border)">
        <div style="flex:1;font-size:11px">${m.name}</div>
        <input type="number" value="${m.qty||1}" min="0.1" step="0.1" style="width:50px;font-size:10px;text-align:center" class="form-control"
          oninput="OrderMaterials._updateQty(${orderId},${i},this.value)">
        <div style="font-size:10px;color:var(--text-muted);min-width:50px;text-align:right">€${((+(m.qty||1))*(+(m.unitCost||0))).toFixed(2)}</div>
        <button onclick="OrderMaterials._removeMat(${orderId},${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:11px;padding:0 3px">✕</button>
      </div>`).join('')}
      <!-- Add material -->
      <div style="display:flex;gap:5px;margin-top:8px">
        <select id="om-select-${orderId}" class="form-control" style="flex:1;font-size:11px">
          <option value="">Aggiungi materiale...</option>
          ${allMats.map(m=>`<option value="${m.id||''}" data-cost="${m.costPrice||m.price||0}" data-name="${(m.name||'').replace(/"/g,'')}">${m.name} — €${m.costPrice||m.price||0}/u</option>`).join('')}
          <option value="custom">✏️ Materiale custom...</option>
        </select>
        <button onclick="OrderMaterials._addMat(${orderId})"
          style="padding:0 10px;background:var(--primary);color:#000;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap">+ Aggiungi</button>
      </div>
      <!-- Summary -->
      ${mats.length ? `<div style="margin-top:8px;padding:8px 10px;background:var(--bg-card2);border-radius:7px;display:flex;justify-content:space-between;font-size:11px">
        <span style="color:var(--text-muted)">Costo materiali</span>
        <strong style="color:#ef4444">-€${totalCost.toFixed(2)}</strong>
      </div>
      ${revenue ? `<div style="padding:4px 10px;display:flex;justify-content:space-between;font-size:12px;font-weight:800">
        <span>Profitto netto</span>
        <span style="color:${revenue-totalCost>=0?'#22c55e':'#ef4444'}">€${(revenue-totalCost).toFixed(2)}</span>
      </div>` : ''}` : ''}
    </div>`;
  },

  async _addMat(orderId) {
    const sel = document.getElementById('om-select-'+orderId);
    if(!sel || !sel.value) return;
    const mats = await this.get(orderId);
    if(sel.value === 'custom') {
      const name = prompt('Nome materiale custom:');
      const cost = parseFloat(prompt('Costo unitario €:'));
      if(name && !isNaN(cost)) {
        mats.push({ name, unitCost:cost, qty:1 });
        await this.save(orderId, mats);
        this.renderPanel(orderId, 'om-panel-'+orderId);
      }
    } else {
      const opt = sel.options[sel.selectedIndex];
      mats.push({ name:opt.dataset.name, unitCost:+(opt.dataset.cost||0), qty:1, matId:sel.value });
      await this.save(orderId, mats);
      this.renderPanel(orderId, 'om-panel-'+orderId);
    }
  },

  async _updateQty(orderId, idx, val) {
    const mats = await this.get(orderId);
    if(mats[idx]) { mats[idx].qty = parseFloat(val)||1; await this.save(orderId, mats); this.renderPanel(orderId,'om-panel-'+orderId); }
  },

  async _removeMat(orderId, idx) {
    const mats = await this.get(orderId);
    mats.splice(idx,1); await this.save(orderId, mats);
    this.renderPanel(orderId,'om-panel-'+orderId);
  },
};
window.OrderMaterials = OrderMaterials;


// ═══════════════════════════════════════════════════════════════════════
// 7. WHITE LABEL THEME
// ═══════════════════════════════════════════════════════════════════════
const WhiteLabel = {
  _SK: 'ingly_whitelabel_v1',

  get() { try{ return JSON.parse(localStorage.getItem(this._SK)||'null'); }catch{ return null; } },

  apply(cfg) {
    if(!cfg) return;
    const root = document.documentElement;
    if(cfg.primaryColor) {
      root.style.setProperty('--primary', cfg.primaryColor);
      root.style.setProperty('--primary-dim', cfg.primaryColor+'20');
      root.style.setProperty('--primary-border', cfg.primaryColor+'40');
    }
    if(cfg.accentColor) root.style.setProperty('--accent', cfg.accentColor);
    if(cfg.appName) {
      const titleEl = document.querySelector('title');
      if(titleEl) titleEl.textContent = cfg.appName;
      document.querySelectorAll('[data-app-name]').forEach(el=>el.textContent=cfg.appName);
    }
    if(cfg.fontFamily) root.style.setProperty('--font-base', cfg.fontFamily);
  },

  save(cfg) {
    localStorage.setItem(this._SK, JSON.stringify(cfg));
    this.apply(cfg);
    toast('🎨 Tema applicato!','success');
  },

  renderPanel() {
    const el = document.getElementById('whitelabel-panel');
    if(!el) return;
    const cfg = this.get() || {};
    el.innerHTML = `
    <div style="padding:12px 0;display:flex;flex-direction:column;gap:10px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:4px">Nome app / Studio</label>
          <input id="wl-name" class="form-control" value="${cfg.appName||'INGLY OS'}" style="font-size:12px">
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:4px">Colore primario</label>
          <div style="display:flex;gap:6px;align-items:center">
            <input type="color" id="wl-color" value="${cfg.primaryColor||'#6366f1'}" style="width:36px;height:30px;border:none;border-radius:6px;cursor:pointer">
            <input id="wl-color-hex" class="form-control" value="${cfg.primaryColor||'#6366f1'}" style="font-size:12px;flex:1" oninput="document.getElementById('wl-color').value=this.value">
          </div>
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:4px">Font</label>
          <select id="wl-font" class="form-control" style="font-size:12px">
            ${[['system-ui, sans-serif','System UI (default)'],["'Inter', sans-serif",'Inter'],["Georgia, serif",'Georgia'],["'Helvetica Neue', sans-serif",'Helvetica']].map(([v,l])=>`<option value="${v}" ${(cfg.fontFamily||'system-ui')===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:4px">Preview colore</label>
          <div id="wl-preview" style="height:30px;border-radius:7px;background:${cfg.primaryColor||'#6366f1'};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700">${cfg.appName||'INGLY OS'}</div>
        </div>
      </div>
      <button onclick="WhiteLabel._saveFromForm()"
        style="padding:9px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:800">🎨 Applica tema</button>
      <button onclick="WhiteLabel.save(null);localStorage.removeItem('${this._SK}');location.reload()"
        style="padding:7px;background:none;border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted)">↺ Ripristina default</button>
    </div>`;

    // Live preview on color change
    document.getElementById('wl-color')?.addEventListener('input', e=>{
      document.getElementById('wl-color-hex').value = e.target.value;
      document.getElementById('wl-preview').style.background = e.target.value;
    });
  },

  _saveFromForm() {
    this.save({
      appName:      document.getElementById('wl-name')?.value||'INGLY OS',
      primaryColor: document.getElementById('wl-color')?.value||'#6366f1',
      fontFamily:   document.getElementById('wl-font')?.value||'system-ui',
    });
  },
};
window.WhiteLabel = WhiteLabel;
// Auto-apply on boot
setTimeout(()=>WhiteLabel.apply(WhiteLabel.get()), 500);


// ═══════════════════════════════════════════════════════════════════════
// 8. INSTALL v11 — sezioni + nav + wiring
// ═══════════════════════════════════════════════════════════════════════
(function installV11(){
  const tryInstall = () => {
    if(typeof App==='undefined') return setTimeout(tryInstall, 800);

    // Add views
    const addView = (id, afterId) => {
      if(document.getElementById('view-'+id)) return;
      const after = document.getElementById('view-'+afterId);
      const div = document.createElement('div');
      div.className = 'section-view'; div.id = 'view-'+id;
      if(after) after.parentNode.insertBefore(div, after.nextSibling);
      else document.body.appendChild(div);
    };
    addView('prima_nota', 'payment_schedule');
    addView('dash_custom', 'dashboard');

    // Add nav items
    const addNav = (section, label, afterSection, color) => {
      if(document.querySelector(`[data-section="${section}"]`)) return;
      const after = document.querySelector(`[data-section="${afterSection}"]`);
      const div = document.createElement('div');
      div.className = 'nav-item';
      div.setAttribute('data-section', section);
      div.style.cssText = `color:var(--text-muted);font-size:11px;padding-left:28px`;
      div.innerHTML = `<i class="fas fa-circle" style="color:${color||'var(--primary)'};font-size:6px"></i> ${label}`;
      div.onclick = ()=>App.navigate(section);
      if(after) after.parentNode.insertBefore(div, after.nextSibling);
    };
    addNav('prima_nota', 'Prima Nota', 'payment_schedule', '#3b82f6');

    // Wire renderSection
    if(!App.__v11Patched) {
      App.__v11Patched = true;
      const _origRS = App.renderSection?.bind(App);
      if(_origRS) App.renderSection = function(s) {
        if(s==='prima_nota')  { PrimaNota.render(); return; }
        if(s==='dash_custom') { DashboardWidgets.render('dash-widget-grid'); return; }
        _origRS(s);
      };
    }

    // Inject dashboard widget grid into main dashboard
    setTimeout(()=>{
      const dashView = document.getElementById('view-dashboard');
      if(!dashView || document.getElementById('dash-widget-grid')) return;
      const grid = document.createElement('div');
      grid.id = 'dash-widget-grid';
      const content = dashView.querySelector('.page-content') || dashView;
      if(content.firstChild) content.insertBefore(grid, content.firstChild.nextSibling||content.firstChild);
      else content.appendChild(grid);
      // Render when dashboard is active
    }, 3000);

    // Inject Import CSV button into nav/quoter area
    setTimeout(()=>{
      if(document.getElementById('etsy-import-nav-btn')) return;
      const quoterNav = document.querySelector('[data-section="quoter"]');
      if(quoterNav) {
        const btn = document.createElement('div');
        btn.id = 'etsy-import-nav-btn';
        btn.className = 'nav-item';
        btn.style.cssText = 'color:var(--text-muted);font-size:11px;padding-left:28px';
        btn.innerHTML = '<i class="fas fa-file-import" style="color:#f97316;font-size:10px"></i> Import Etsy CSV';
        btn.onclick = ()=>EtsyCSVImporter.showImportModal();
        quoterNav.parentNode.insertBefore(btn, quoterNav.nextSibling);
      }
    }, 2500);

    // Inject Materials panel into order detail modal
    const _origDetail = GestioneOrdini?._openDetail?.bind(GestioneOrdini);
    if(_origDetail && !GestioneOrdini.__v11DetailPatched) {
      GestioneOrdini.__v11DetailPatched = true;
      GestioneOrdini._openDetail = async function(id) {
        await _origDetail(id);
        setTimeout(()=>{
          const modal = document.getElementById('go-detail-modal');
          if(!modal) return;
          // Add Materials panel before action buttons
          const actionsDiv = modal.querySelector('[style*="border-top:1px solid"]');
          if(actionsDiv && !modal.querySelector('.order-materials-panel')) {
            const panel = document.createElement('div');
            panel.className = 'order-materials-panel';
            panel.style.marginBottom = '8px';
            panel.innerHTML = `<details>
              <summary style="font-size:11px;font-weight:700;color:var(--text-muted);cursor:pointer;padding:6px 0">🧱 Costo materiali per questo ordine</summary>
              <div id="om-panel-${id}"></div>
            </details>`;
            actionsDiv.parentNode.insertBefore(panel, actionsDiv);
            OrderMaterials.renderPanel(id, `om-panel-${id}`);
          }
          // Add share link button
          const btnRow = actionsDiv?.querySelector('div');
          if(btnRow && !btnRow.querySelector('.share-btn')) {
            const shareBtn = document.createElement('button');
            shareBtn.className = 'share-btn';
            shareBtn.style.cssText = 'padding:9px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)';
            shareBtn.innerHTML = '🔗 Condividi';
            shareBtn.onclick = ()=>{ /* find quote ID from order */ };
            btnRow.appendChild(shareBtn);
          }
        }, 200);
      };
    }

    // Share link button in Quoter
    setTimeout(()=>{
      const sendBtn = document.querySelector('[onclick*="sendToWorkflow"]');
      if(sendBtn && !document.getElementById('quoter-share-btn')) {
        const shareBtn = document.createElement('button');
        shareBtn.id = 'quoter-share-btn';
        shareBtn.style.cssText = 'padding:8px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted);margin-left:5px';
        shareBtn.innerHTML = '🔗 Link cliente';
        shareBtn.onclick = async()=>{
          if(!Quoter?._lastSavedId) { await Quoter?.saveQuote?.().catch(()=>{}); }
          if(Quoter?._lastSavedId) ShareableQuoteLink.generate(Quoter._lastSavedId);
          else toast('Salva prima il preventivo','warning');
        };
        sendBtn.parentNode.insertBefore(shareBtn, sendBtn.nextSibling);
      }
    }, 3500);

    // Inject WhiteLabel + Push panels in settings
    const injectNewSettings = () => {
      const existing = document.getElementById('company-profile-panel');
      if(!existing || document.getElementById('whitelabel-panel')) return;
      const parentSection = existing.closest('[style*="padding:0 20px"]') || existing.parentElement;
      if(!parentSection) return;

      // White label
      const wlSection = document.createElement('div');
      wlSection.style.cssText = 'background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);margin-bottom:14px;overflow:hidden';
      wlSection.innerHTML = `<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        <span style="font-size:16px">🎨</span>
        <div style="flex:1"><div style="font-size:13px;font-weight:700">Tema & White Label</div><div style="font-size:11px;color:var(--text-muted)">Colori, nome app, font — personalizza l'aspetto</div></div>
        <span style="color:var(--text-muted)">▼</span></div>
        <div id="whitelabel-panel" style="padding:0 16px;display:none"></div>`;
      parentSection.appendChild(wlSection);

      // Push notifications
      const pushSection = document.createElement('div');
      pushSection.style.cssText = 'background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);margin-bottom:14px;overflow:hidden';
      pushSection.innerHTML = `<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        <span style="font-size:16px">🔔</span>
        <div style="flex:1"><div style="font-size:13px;font-weight:700">Notifiche Push</div><div style="font-size:11px;color:var(--text-muted)">Alert scadenze ordini nel browser</div></div>
        <span style="color:var(--text-muted)">▼</span></div>
        <div id="push-notif-panel" style="padding:0 16px;display:none"></div>`;
      parentSection.appendChild(pushSection);

      WhiteLabel.renderPanel();
      PushNotifications.renderPanel();

      // S5B: Auto-cashflow toggle card
      if(!document.getElementById('ingly-automazioni-card')){
        const autoCard = document.createElement('div');
        autoCard.id = 'ingly-automazioni-card';
        const s5bOn = localStorage.getItem('s5b_auto_cashflow')==='1';
        const devMode = localStorage.getItem('ingly_dev_mode')==='1';
        const kpiHide = localStorage.getItem('ingly_hide_kpi_coherence')==='1';
        const toggles = [
          {id:'s5b_auto_cashflow', icon:'💳', label:'Auto-cashflow su vendita pagata', desc:'Quando una vendita è segnata come pagata, aggiunge automaticamente una voce entrata nel Cashflow', on:s5bOn, cb:`localStorage.setItem('s5b_auto_cashflow',this.checked?'1':'0');document.getElementById('atl-s5b_auto_cashflow').textContent=this.checked?'ON':'OFF';toast(this.checked?'✅ Auto-cashflow attivato':'⏸️ Disattivato','info')`},
          {id:'ingly_dev_mode', icon:'🛠️', label:'Modalità sviluppatore', desc:'Mostra log avanzati in console e abilita tool di diagnosi interni', on:devMode, cb:`localStorage.setItem('ingly_dev_mode',this.checked?'1':'0');document.getElementById('atl-ingly_dev_mode').textContent=this.checked?'ON':'OFF';toast(this.checked?'🛠️ Dev mode ON':'Dev mode OFF','info')`},
          {id:'ingly_hide_kpi_coherence', icon:'📊', label:'Nascondi badge coerenza KPI', desc:'Nasconde il badge di discrepanza KPI dalla topbar durante la sincronizzazione', on:kpiHide, cb:`localStorage.setItem('ingly_hide_kpi_coherence',this.checked?'1':'0');document.getElementById('atl-ingly_hide_kpi_coherence').textContent=this.checked?'ON':'OFF';toast('Impostazione salvata','info')`},
        ];
        autoCard.innerHTML = `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-dim);margin-bottom:8px;margin-top:4px">⚡ Automazioni & Sincronizzazioni</div>`
          + `<div style="background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:14px">`
          + toggles.map((t,i)=>`<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;${i?'border-top:1px solid var(--border)':''}"><span style="font-size:18px;flex-shrink:0">${t.icon}</span><div style="flex:1"><div style="font-size:12px;font-weight:700;color:var(--text)">${t.label}</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px">${t.desc}</div></div><label style="display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;flex-shrink:0"><span id="atl-${t.id}" style="font-size:11px;font-weight:700;color:${t.on?'var(--primary)':'var(--text-dim)'}">${t.on?'ON':'OFF'}</span><input type="checkbox" ${t.on?'checked':''} style="width:16px;height:16px;cursor:pointer;accent-color:var(--primary)" onchange="${t.cb}"></label></div>`).join('')
          + `</div>`;
        parentSection.appendChild(autoCard);
      }
    };

    const _origRS2 = App.renderSection?.bind(App);
    if(_origRS2 && !App.__v11SettingsPatch) {
      App.__v11SettingsPatch = true;
      const _fn = App.renderSection;
      App.renderSection = function(s) {
        _fn.call(this, s);
        if(s==='settings') setTimeout(()=>{ injectNewSettings(); WhiteLabel.renderPanel(); PushNotifications.renderPanel(); },400);
        if(s==='dashboard') setTimeout(()=>DashboardWidgets.render('dash-widget-grid'),300);
      };
    }

    setTimeout(injectNewSettings, 4500);

    console.log('[INGLY OS v11] Dashboard Widgets + EtsyCSV + ShareableLink + Push + Prima Nota + OrderMaterials + WhiteLabel loaded ✅');
  };
  setTimeout(tryInstall, 2200);
})();

