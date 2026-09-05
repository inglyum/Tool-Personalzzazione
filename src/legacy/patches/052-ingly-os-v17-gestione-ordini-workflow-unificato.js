
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v17 — GESTIONE ORDINI & WORKFLOW UNIFICATO
// Single Source of Truth · Kanban · Pipeline · Lista · Sincronizzazione
// ════════════════════════════════════════════════════════════════════════



// ════════════════════════════════════════════════════════════════════════
// GESTIONE ORDINI & WORKFLOW v2 — Sezione UNICA unificata
// Sostituisce: Pipeline Lavori + Coda Produzione + Workflow
// SSOT: IDB 'orders' — Single Source of Truth
// ════════════════════════════════════════════════════════════════════════

// ── SSOT: elimina accesso diretto a pipeline store ────────────────────
// updateOrderStatus è già installata come SSOT globale (window.updateOrderStatus)

const GestioneOrdini = {
  _view: localStorage.getItem('ingly_go_view_v1') || 'kanban',
  _search: '',
  _filterState: 'all',
  _filterPriority: 'all',
  _sortBy: 'date_desc',
  _selected: new Set(),

  // Stati standard - UNICA fonte di verità
  STATES: {
    preventivo: { label:'Preventivo',  color:'#6366f1', emoji:'📋', next:'inviato',    done:false },
    inviato:    { label:'Inviato',     color:'#f59e0b', emoji:'📤', next:'accettato',  done:false },
    accettato:  { label:'Accettato',   color:'#3b82f6', emoji:'✅', next:'produzione', done:false },
    rifiutato:  { label:'Rifiutato',   color:'#ef4444', emoji:'❌', next:null,         done:true  },
    produzione: { label:'Produzione',  color:'#8b5cf6', emoji:'⚙️', next:'completato', done:false },
    completato: { label:'Completato',  color:'#10b981', emoji:'📦', next:'venduto',    done:true  },
    venduto:    { label:'Venduto',     color:'#22c55e', emoji:'💰', next:null,         done:true  },
    annullato:  { label:'Annullato',   color:'#6b7280', emoji:'🚫', next:null,         done:true  },
  },

  // Mappa stati legacy → stati unificati
  _normalizeState(s) {
    const map = {
      draft:'preventivo', backlog:'preventivo', quote:'preventivo',
      sent:'inviato', waiting:'inviato', attesa:'inviato',
      confirmed:'accettato', confermato:'accettato', accepted:'accettato',
      rejected:'rifiutato', cancelled:'annullato',
      working:'produzione', production:'produzione', wip:'produzione', active:'produzione',
      ready:'completato', done:'completato', completed:'completato',
      delivered:'completato', paid:'venduto', sold:'venduto', invoiced:'venduto',
    };
    return map[s] || (this.STATES[s] ? s : 'preventivo');
  },

  // Transizione stato — delega a SSOT globale
  async transition(orderId, newState, opts) {
    const result = await window.updateOrderStatus(orderId, newState, opts||{});
    if(result && typeof QuickStats !== 'undefined') QuickStats.update();
    if(result && typeof SidebarBadges !== 'undefined') SidebarBadges.update();
    return result;
  },

  // Lettura SSOT
  async getOrders() {
    try {
      const raw = await IDB.getAll('orders').catch(()=>[]);
      return raw.map(o=>({
        ...o,
        _state: this._normalizeState(o.stage||o.status||'preventivo'),
      }));
    } catch(e) { return []; }
  },

  async _saveOrderFromQuoter(data) {
    try {
      const order = {
        id: Date.now(), clientName: data.clientName||'',
        name: data.name||'Ordine da preventivo', total: data.total||0,
        dueDate: data.dueDate||'', notes: data.notes||'',
        quoteId: data.quoteId||null, stage:'inviato', status:'inviato',
        source:'quoter', createdAt: new Date().toISOString(),
        priority: 'normal',
        _history:[{from:null,to:'inviato',ts:new Date().toISOString(),note:'Da preventivo'}],
      };
      await IDB.put('orders', order);
      if(typeof AppStore!=='undefined') AppStore.invalidate('orders');
      document.dispatchEvent(new CustomEvent('orderUpdated',{detail:{id:order.id,to:'inviato',order}}));
      toast('✅ Ordine creato in Gestione Workflow!','success');
      setTimeout(()=>App.navigate('gestione_ordini'),300);
      return order;
    } catch(e) { toast('Errore: '+e.message,'error'); }
  },

  // ══ RENDER PRINCIPALE ══════════════════════════════════════════════
  async render() {
    const el = document.getElementById('view-gestione_ordini');
    if(!el) return;

    const orders   = await this.getOrders();
    const view     = this._view;
    const q        = this._search.toLowerCase();
    const fltState = this._filterState;
    const fltPrio  = this._filterPriority;

    let filtered = orders.filter(o => {
      if(fltState !== 'all' && o._state !== fltState) return false;
      if(fltPrio !== 'all' && (o.priority||'normal') !== fltPrio) return false;
      if(q && !((o.clientName||'').toLowerCase().includes(q) ||
                (o.name||'').toLowerCase().includes(q) ||
                (o.notes||'').toLowerCase().includes(q))) return false;
      return true;
    });

    if(this._sortBy === 'date_desc')   filtered.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
    else if(this._sortBy === 'date_asc') filtered.sort((a,b)=>new Date(a.createdAt||0)-new Date(b.createdAt||0));
    else if(this._sortBy === 'amount_desc') filtered.sort((a,b)=>(+(b.total||b.value||0))-(+(a.total||a.value||0)));
    else if(this._sortBy === 'due_asc') filtered.sort((a,b)=>new Date(a.dueDate||'9999')-new Date(b.dueDate||'9999'));
    else if(this._sortBy === 'client_asc') filtered.sort((a,b)=>(a.clientName||'').localeCompare(b.clientName||''));

    const DONE     = new Set(['venduto','completato','rifiutato','annullato']);
    const active   = orders.filter(o=>!DONE.has(o._state));
    const overdue  = active.filter(o=>o.dueDate&&new Date(o.dueDate)<new Date());
    const totalVal = active.reduce((a,o)=>a+(+(o.total||o.value||0)),0);
    const fmt      = v=>'€'+Math.round(v).toLocaleString('it-IT');

    el.innerHTML = `
    <div style="padding:14px 18px 20px;max-width:1400px;margin:0 auto">
      <!-- ── HEADER ── -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <h1 style="margin:0 0 2px;font-size:19px;font-weight:900;display:flex;align-items:center;gap:8px">
            <span style="font-size:22px">🔄</span> Ordini & Workflow
            <span style="font-size:10px;font-weight:500;color:var(--text-muted);background:var(--bg-card2);padding:2px 8px;border-radius:99px;border:1px solid var(--border)">Unica sezione</span>
          </h1>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">${orders.length} ordini totali · ${active.length} attivi${overdue.length?` · <span style="color:#ef4444;font-weight:700">⚠️ ${overdue.length} in ritardo</span>`:''}</p>
        </div>
        <!-- KPI strip -->
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <div onclick="GestioneOrdini._setFilter('all')" style="padding:5px 10px;background:var(--bg-card2);border-radius:8px;border:1px solid var(--border);cursor:pointer;text-align:center;min-width:60px" title="Tutti">
            <div style="font-size:14px;font-weight:800">${active.length}</div><div style="font-size:8px;color:var(--text-dim)">Attivi</div>
          </div>
          ${overdue.length?`<div onclick="GestioneOrdini._setFilter('all')" style="padding:5px 10px;background:#ef444415;border-radius:8px;border:1px solid #ef444430;cursor:pointer;text-align:center" title="In ritardo">
            <div style="font-size:14px;font-weight:800;color:#ef4444">${overdue.length}</div><div style="font-size:8px;color:#ef4444">Ritardo</div>
          </div>`:''}
          <div style="padding:5px 10px;background:var(--primary-dim);border-radius:8px;border:1px solid var(--primary-border);text-align:center;min-width:70px">
            <div style="font-size:12px;font-weight:800;color:var(--primary)">${fmt(totalVal)}</div><div style="font-size:8px;color:var(--text-dim)">Valore</div>
          </div>
        </div>
        <!-- Azioni -->
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <button onclick="GestioneOrdini._openCreate()" style="padding:7px 13px;background:var(--primary);color:#000;border:none;border-radius:7px;font-weight:700;cursor:pointer;font-size:11px">+ Nuovo</button>
          <button onclick="App.navigate('quoter')" style="padding:7px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:10px;color:var(--text)">📋 Quoter</button>
          <button onclick="GestioneOrdini._exportOrders()" style="padding:7px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:10px;color:var(--text)">📥 Export</button>
        </div>
      </div>

      <!-- ── TOOLBAR ── -->
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;background:var(--bg-card2);padding:8px 10px;border-radius:10px;border:1px solid var(--border);margin-bottom:10px">
        <!-- View toggle -->
        <div style="display:flex;gap:2px;background:var(--bg-card);padding:2px;border-radius:7px;border:1px solid var(--border)">
          ${[['lista','fa-list','Lista'],['kanban','fa-columns','Kanban'],['produzione','fa-cogs','Produzione'],['calendario','fa-calendar','Calendario'],['timeline','fa-stream','Timeline'],['analytics','fa-chart-line','Analytics']].map(([v,ic,lb])=>`
          <button onclick="GestioneOrdini._setView('${v}')" style="padding:4px 9px;border:none;border-radius:5px;cursor:pointer;font-size:10px;font-weight:700;transition:.15s;background:${view===v?'var(--primary)':'transparent'};color:${view===v?'#000':'var(--text-muted)'}">
            <i class="fas ${ic}"></i> ${lb}
          </button>`).join('')}
        </div>
        <!-- Search -->
        <div style="flex:1;min-width:160px;position:relative">
          <i class="fas fa-search" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--text-dim);font-size:10px"></i>
          <input id="go-search" value="${this._search}" class="form-control" style="padding-left:26px;height:30px;font-size:11px" placeholder="Cerca cliente, ordine, note…" oninput="GestioneOrdini._onSearch(this.value)">
        </div>
        <!-- Filters -->
        <select id="go-filter" class="form-control" style="height:30px;font-size:10px;width:auto" onchange="GestioneOrdini._setFilter(this.value)">
          <option value="all" ${fltState==='all'?'selected':''}>🗂 Tutti (${orders.length})</option>
          ${Object.entries(this.STATES).map(([k,s])=>{
            const n=orders.filter(o=>o._state===k).length;
            return n?`<option value="${k}" ${fltState===k?'selected':''}>${s.emoji} ${s.label} (${n})</option>`:'';
          }).join('')}
        </select>
        <select class="form-control" style="height:30px;font-size:10px;width:auto" onchange="GestioneOrdini._setPriority(this.value)">
          <option value="all">🏷️ Priorità</option>
          <option value="urgent" ${fltPrio==='urgent'?'selected':''}>🔴 Urgente</option>
          <option value="high" ${fltPrio==='high'?'selected':''}>🟠 Alta</option>
          <option value="normal" ${fltPrio==='normal'?'selected':''}>⚪ Normale</option>
        </select>
        <select class="form-control" style="height:30px;font-size:10px;width:auto" onchange="GestioneOrdini._setSort(this.value)">
          <option value="date_desc" ${this._sortBy==='date_desc'?'selected':''}>📅 Più recente</option>
          <option value="date_asc" ${this._sortBy==='date_asc'?'selected':''}>📅 Più vecchio</option>
          <option value="amount_desc" ${this._sortBy==='amount_desc'?'selected':''}>💶 Importo ↓</option>
          <option value="due_asc" ${this._sortBy==='due_asc'?'selected':''}>⏰ Scadenza prima</option>
          <option value="client_asc" ${this._sortBy==='client_asc'?'selected':''}>👤 Cliente A→Z</option>
        </select>
        <span style="font-size:10px;color:var(--text-muted)">${filtered.length} ordini</span>
      </div>

      <!-- ── CONTENT ── -->
      <div id="go-content"></div>
    </div>`;

    this._renderContent(filtered, orders);
  },

  _renderContent(filtered, all) {
    const el = document.getElementById('go-content');
    if(!el) return;
    if(this._view === 'kanban')     this._renderKanban(el, filtered, all);
    else if(this._view === 'produzione') this._renderProduzione(el, filtered);
    else if(this._view === 'lista') this._renderLista(el, filtered);
    else if(this._view === 'calendario') this._renderCalendario(el, all);
    else if(this._view === 'timeline') this._renderTimeline(el, filtered);
    else if(this._view === 'analytics') this._renderAnalytics(el, all);
  },

  // ══ KANBAN ═════════════════════════════════════════════════════════
  _renderKanban(el, orders, all) {
    const mainCols = ['preventivo','inviato','accettato','produzione','completato','venduto'];
    const sideCols = ['rifiutato','annullato'];

    el.innerHTML = `
    <div style="overflow-x:auto;padding-bottom:8px">
      <div style="display:grid;grid-template-columns:repeat(${mainCols.length},minmax(185px,1fr));gap:7px;min-width:${mainCols.length*192}px">
        ${mainCols.map(stId=>{
          const st = this.STATES[stId];
          const cols = orders.filter(o=>o._state===stId);
          const val = cols.reduce((a,o)=>a+(+(o.total||o.value||0)),0);
          return `<div style="background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);overflow:hidden"
            ondragover="event.preventDefault();this.style.background='${st.color}18'"
            ondragleave="this.style.background='var(--bg-card2)'"
            ondrop="GestioneOrdini._onDrop(event,'${stId}');this.style.background='var(--bg-card2)'">
            <div style="padding:7px 10px;border-bottom:2px solid ${st.color};background:${st.color}12;display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:11px;font-weight:800;color:${st.color}">${st.emoji} ${st.label}</span>
              <div style="display:flex;align-items:center;gap:4px">
                <span style="font-size:9px;color:var(--text-dim);font-weight:700">${cols.length}${val?` · €${Math.round(val/1000).toFixed(1)}k`:''}</span>
              </div>
            </div>
            <div style="padding:5px;display:flex;flex-direction:column;gap:4px;min-height:60px;max-height:calc(100vh - 300px);overflow-y:auto">
              ${(()=>{const CAP=8;const visible=cols.slice(0,CAP);const rest=cols.length-CAP;return visible.map(o=>GestioneOrdini._card(o,st)).join('')+(rest>0?`<button onclick="this.previousSibling&&null;Array.from(this.parentElement.querySelectorAll('.go-card-hidden')).forEach(x=>{x.style.display='';});this.remove()" style="width:100%;padding:4px;background:var(--bg-card2);border:1px dashed var(--border);border-radius:5px;color:var(--text-muted);font-size:10px;cursor:pointer">+ ${rest} altri ordini</button>`+cols.slice(CAP).map(o=>`<div class="go-card-hidden" style="display:none">`+GestioneOrdini._card(o,st)+`</div>`).join(''):'')+(cols.length===0?`<div style="text-align:center;padding:14px 6px;color:var(--text-dim);font-size:9px;opacity:.5">nessun ordine</div>`:'');})()}
            </div>
          </div>`;
        }).join('')}
      </div>
      <!-- Done/cancelled mini row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px">
        ${sideCols.map(stId=>{
          const st = this.STATES[stId];
          const cols = orders.filter(o=>o._state===stId);
          return `<div style="background:var(--bg-card2);border-radius:8px;border:1px solid var(--border);overflow:hidden">
            <div style="padding:5px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:5px">
              <span style="font-size:10px;font-weight:700;color:${st.color}">${st.emoji} ${st.label}</span>
              <span style="font-size:9px;color:var(--text-dim)">(${cols.length})</span>
            </div>
            <div style="padding:4px;max-height:60px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:3px">
              ${cols.map(o=>`<span style="font-size:9px;padding:2px 6px;background:var(--bg-card);border-radius:4px;color:var(--text-muted);cursor:pointer" onclick="GestioneOrdini._openDetail(${o.id})">${o.clientName||'—'}</span>`).join('')}
              ${!cols.length?`<span style="font-size:9px;color:var(--text-dim);padding:4px">vuoto</span>`:''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  },

  _card(o, st) {
    const val      = +(o.total||o.value||o.grossPrice||0);
    const isOver   = o.dueDate && new Date(o.dueDate)<new Date() && !st.done;
    const nextSt   = st.next ? this.STATES[st.next] : null;
    const prioBorder = o.priority==='urgent'?'#ef4444':o.priority==='high'?'#f97316':st.color;
    const hasNote  = typeof OrderQuickNote!=='undefined' && !!OrderQuickNote.get(o.id);

    return `<div class="go-card" data-order-id="${o.id}" draggable="true"
      ondragstart="GestioneOrdini._onDragStart(event,${o.id})" ondragend="GestioneOrdini._dragging=null"
      style="background:var(--bg-card);border:1px solid ${isOver?'#ef444450':st.color+'30'};border-radius:7px;padding:7px 9px;cursor:default;border-left:3px solid ${prioBorder};transition:.12s"
      onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 3px 10px rgba(0,0,0,.2)'"
      onmouseout="this.style.transform='';this.style.boxShadow=''">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:4px">
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.clientName||'—'}</div>
          <div style="font-size:9px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.name||'Ordine'}</div>
        </div>
        ${val?`<div style="font-size:11px;font-weight:800;color:var(--text);white-space:nowrap;flex-shrink:0">€${val>=1000?(val/1000).toFixed(1)+'k':val.toFixed(0)}</div>`:''}
      </div>
      ${o.dueDate||o.priority==='urgent'?`<div style="display:flex;align-items:center;gap:4px;margin-top:4px">
        ${o.dueDate?`<span style="font-size:9px;color:${isOver?'#ef4444':'var(--text-dim)'}">${isOver?'⚠️ ':'📅 '}${new Date(o.dueDate).toLocaleDateString('it-IT',{day:'numeric',month:'short'})}</span>`:''}
        ${o.priority==='urgent'?'<span style="font-size:8px;color:#ef4444;font-weight:700;background:#ef444420;padding:0 4px;border-radius:3px">URGENTE</span>':''}
        ${o.priority==='high'?'<span style="font-size:8px;color:#f97316;font-weight:700;background:#f9731620;padding:0 4px;border-radius:3px">ALTA</span>':''}
        ${hasNote?'<span style="font-size:8px;color:var(--primary)" title="Ha nota">📝</span>':''}
      </div>`:''}
      <!-- Azioni card -->
      <div style="display:flex;gap:3px;margin-top:5px;flex-wrap:wrap">
        ${nextSt?`<button onclick="event.stopPropagation();GestioneOrdini.transition(${o.id},'${st.next}').then(()=>GestioneOrdini.render())"
          style="flex:1;padding:3px 5px;background:${st.next==='venduto'?'#22c55e':st.color}20;border:1px solid ${st.color}40;border-radius:4px;cursor:pointer;font-size:9px;font-weight:700;color:${st.next==='venduto'?'#22c55e':st.color}">→ ${nextSt.label}</button>`:''}
        <button onclick="event.stopPropagation();GestioneOrdini._openDetail(${o.id})" style="padding:3px 6px;background:var(--bg-card2);border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:9px;color:var(--text-muted)" title="Dettaglio">✏️</button>
        <button onclick="event.stopPropagation();typeof OrderQuickNote!=='undefined'&&OrderQuickNote.open(${o.id},'${(o.name||'').replace(/'/g,'')}')" style="padding:3px 6px;background:var(--bg-card2);border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:9px;color:var(--text-muted)" title="Nota">📝</button>
        <button onclick="event.stopPropagation();GestioneOrdini.openProductionPanel(${o.id})" style="padding:3px 6px;background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.3);border-radius:4px;cursor:pointer;font-size:9px;color:#a78bfa" title="Pannello Produzione">⚙️</button>
        ${typeof WAAutoNotify!=='undefined'&&(o.clientName||o.clientId)?`<button onclick="event.stopPropagation();WAAutoNotify.openSender('order_ready','${o.id}')" style="padding:3px 6px;background:rgba(37,211,102,.08);border:1px solid rgba(37,211,102,.25);border-radius:4px;cursor:pointer;font-size:9px;color:#25D366" title="WhatsApp">💬</button>`:''}
      </div>
    </div>`;
  },

  // ══ VISTA PRODUZIONE — focus su ordini in lavorazione ══════════════
  _renderProduzione(el, orders) {
    const prodOrders = orders.filter(o=>['accettato','produzione','completato'].includes(o._state));
    const now = new Date();

    el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);padding:4px 0">
        ⚙️ ${prodOrders.length} ordini in lavorazione
        <span style="float:right;font-size:10px">Trascina per cambiare stato · Click per dettaglio</span>
      </div>
      ${prodOrders.length ? `
      <div style="border-radius:10px;border:1px solid var(--border);overflow:hidden;max-height:calc(100vh - 260px);overflow-y:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead style="position:sticky;top:0;z-index:5;background:var(--bg-card2)">
            <tr>
              <th style="padding:8px 12px;text-align:left;border-bottom:1px solid var(--border);font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Cliente · Ordine</th>
              <th style="padding:8px 12px;border-bottom:1px solid var(--border);font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Stato</th>
              <th style="padding:8px 12px;border-bottom:1px solid var(--border);font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Scadenza</th>
              <th style="padding:8px 12px;text-align:right;border-bottom:1px solid var(--border);font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">€</th>
              <th style="padding:8px 12px;border-bottom:1px solid var(--border);font-size:9px;color:var(--text-muted)">Azione rapida</th>
            </tr>
          </thead>
          <tbody>
            ${prodOrders.map(o=>{
              const st = this.STATES[o._state];
              const val = +(o.total||o.value||0);
              const isOver = o.dueDate && new Date(o.dueDate) < now;
              const daysLeft = o.dueDate ? Math.ceil((new Date(o.dueDate)-now)/86400000) : null;
              const nextSt = st.next ? this.STATES[st.next] : null;
              return `<tr style="border-bottom:1px solid var(--border);border-left:3px solid ${st.color};cursor:pointer;transition:.12s"
                onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background=''"
                onclick="GestioneOrdini._openDetail(${o.id})">
                <td style="padding:9px 12px">
                  <div style="font-weight:700;font-size:12px">${o.clientName||'—'}</div>
                  <div style="font-size:10px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px">${o.name||'—'}</div>
                </td>
                <td style="padding:9px 12px">
                  <span style="font-size:10px;padding:2px 8px;border-radius:99px;background:${st.color}18;color:${st.color};font-weight:700">${st.emoji} ${st.label}</span>
                </td>
                <td style="padding:9px 12px;font-size:11px;color:${isOver?'#ef4444':'var(--text-muted)'};white-space:nowrap">
                  ${o.dueDate ? `${isOver?'⚠️ ':''}${new Date(o.dueDate).toLocaleDateString('it-IT')}${daysLeft!==null&&!isOver?` <span style="font-size:9px;color:var(--text-dim)">(${daysLeft}gg)</span>`:''}` : '—'}
                </td>
                <td style="padding:9px 12px;text-align:right;font-weight:800">${val?'€'+val.toFixed(0):'—'}</td>
                <td style="padding:9px 12px" onclick="event.stopPropagation()">
                  <div style="display:flex;gap:4px;align-items:center">
                    ${nextSt?`<button onclick="GestioneOrdini.transition(${o.id},'${st.next}').then(()=>GestioneOrdini.render())"
                      style="padding:3px 9px;background:${st.color}18;border:1px solid ${st.color}40;border-radius:5px;cursor:pointer;font-size:10px;font-weight:700;color:${st.color}">→ ${nextSt.emoji}</button>`:''}
                    <button onclick="typeof WAQuick!=='undefined'&&WAQuick.sendOrderReady({clientName:'${(o.clientName||'').replace(/'/g,'')}',name:'${(o.name||'').replace(/'/g,'')}',status:'pronto'})"
                      style="padding:3px 6px;background:#25D36615;border:1px solid #25D36630;border-radius:5px;cursor:pointer;font-size:10px;color:#25D366" title="WhatsApp">💬</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
          <!-- Footer totale produzione -->
          <tfoot style="position:sticky;bottom:0;background:var(--bg-card2)">
            <tr>
              <td colspan="3" style="padding:8px 12px;font-size:11px;color:var(--text-muted)">${prodOrders.length} ordini in lavorazione</td>
              <td style="padding:8px 12px;text-align:right;font-size:14px;font-weight:800;color:var(--primary)">€${prodOrders.reduce((a,o)=>a+(+(o.total||o.value||0)),0).toFixed(0)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>` : `<div style="text-align:center;padding:40px;color:var(--text-dim)">🎉 Nessun ordine in produzione</div>`}
    </div>`;
  },

  // ══ VISTA LISTA ════════════════════════════════════════════════════
  _renderLista(el, orders) {
    const _s = typeof sanitize==='function'?sanitize:function(x){return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
    // S15: Pagination for lista view
    const ps = 40;
    if(!this._listPage) this._listPage = 0;
    const totalO = orders.length;
    const tp = Math.max(1, Math.ceil(totalO/ps));
    this._listPage = Math.min(this._listPage, tp-1);
    const pageOrders = orders.slice(this._listPage*ps, (this._listPage+1)*ps);
    const pgCtrl = tp>1 ? `<div style="display:flex;align-items:center;gap:6px;padding:10px 12px;border-top:1px solid var(--border);background:var(--bg-card2)">
      <button onclick="GestioneOrdini._listPage=Math.max(0,(GestioneOrdini._listPage||0)-1);GestioneOrdini.render()" ${this._listPage===0?'disabled':''} style="padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);cursor:pointer;font-size:11px">‹</button>
      <span style="font-size:11px;color:var(--text-muted)">${this._listPage+1} / ${tp} · ${totalO} ordini</span>
      <button onclick="GestioneOrdini._listPage=Math.min(${tp-1},(GestioneOrdini._listPage||0)+1);GestioneOrdini.render()" ${this._listPage>=tp-1?'disabled':''} style="padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);cursor:pointer;font-size:11px">›</button>
    </div>` : '';
    el.innerHTML = `
    <div style="border-radius:10px;border:1px solid var(--border);overflow:hidden;max-height:calc(100vh - 260px);overflow-y:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead style="position:sticky;top:0;z-index:5;background:var(--bg-card2)">
          <tr>
            <th style="padding:8px 12px;text-align:left;border-bottom:1px solid var(--border);font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;cursor:pointer" onclick="GestioneOrdini._setSort('client_asc')">👤 Cliente</th>
            <th style="padding:8px 12px;border-bottom:1px solid var(--border);font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Ordine</th>
            <th style="padding:8px 12px;border-bottom:1px solid var(--border);font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Stato</th>
            <th style="padding:8px 12px;border-bottom:1px solid var(--border);font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;cursor:pointer" onclick="GestioneOrdini._setSort('due_asc')">⏰ Scadenza</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:1px solid var(--border);font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;cursor:pointer" onclick="GestioneOrdini._setSort('amount_desc')">💶 Importo</th>
            <th style="padding:8px 12px;border-bottom:1px solid var(--border)"></th>
          </tr>
        </thead>
        <tbody>
          ${pageOrders.map(o=>{
            const st = this.STATES[o._state];
            const val = +(o.total||o.value||o.grossPrice||0);
            const isOver = o.dueDate && new Date(o.dueDate)<new Date() && !st.done;
            const nextSt = st.next ? this.STATES[st.next] : null;
            return `<tr style="border-bottom:1px solid var(--border);border-left:3px solid ${st.color};cursor:pointer;transition:.12s"
              onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background=''"
              onclick="GestioneOrdini._openDetail(${o.id})">
              <td style="padding:8px 12px;font-weight:700">${_s(o.clientName)||'—'}</td>
              <td style="padding:8px 12px;color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_s(o.name)||'—'}</td>
              <td style="padding:8px 12px"><span style="font-size:10px;padding:2px 8px;border-radius:99px;background:${st.color}18;color:${st.color};font-weight:700">${st.emoji} ${st.label}</span></td>
              <td style="padding:8px 12px;font-size:11px;color:${isOver?'#ef4444':'var(--text-muted)'};white-space:nowrap">${o.dueDate?new Date(o.dueDate).toLocaleDateString('it-IT'):'—'}</td>
              <td style="padding:8px 12px;text-align:right;font-weight:800">${val?'€'+val.toFixed(0):'—'}</td>
              <td style="padding:8px 12px" onclick="event.stopPropagation()">
                <div style="display:flex;gap:3px">
                  ${nextSt?`<button onclick="GestioneOrdini.transition(${o.id},'${st.next}').then(()=>GestioneOrdini.render())"
                    style="padding:3px 8px;background:${st.color}18;border:1px solid ${st.color}40;border-radius:5px;cursor:pointer;font-size:10px;font-weight:700;color:${st.color}">→ ${nextSt.label}</button>`:''}
                  <button onclick="GestioneOrdini._openDetail(${o.id})" style="padding:3px 6px;background:var(--bg-card2);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:10px;color:var(--text-muted)">✏️</button>
                  ${o._state!=='preventivo'?`<button onclick="GestioneOrdini._fatturaPA(${o.id})" title="Genera FatturaPA XML SDI"
                    style="padding:3px 6px;background:var(--bg-card2);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:10px;color:var(--text-muted)">📄</button>`:''}
                </div>
              </td>
            </tr>`;
          }).join('')}
          ${!totalO?`<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-dim)">Nessun ordine trovato</td></tr>`:''}
        </tbody>
        ${totalO?`<tfoot style="position:sticky;bottom:0;background:var(--bg-card2)">
          <tr>
            <td colspan="4" style="padding:8px 12px;font-size:11px;color:var(--text-muted)">${totalO} ordini · pag. ${this._listPage+1}/${tp}</td>
            <td style="padding:8px 12px;text-align:right;font-size:14px;font-weight:800;color:var(--primary)">€${orders.reduce((a,o)=>a+(+(o.total||o.value||0)),0).toFixed(0)}</td>
            <td></td>
          </tr>
        </tfoot>`:''}
      </table>
      ${pgCtrl}
    </div>`;
  },

  // ══ VISTA CALENDARIO ═══════════════════════════════════════════════
  _renderCalendario(el, orders) {
    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const DONE = new Set(['venduto','completato','rifiutato','annullato']);
    const withDue = orders.filter(o=>o.dueDate&&!DONE.has(o._state));
    const monthStr = new Date(year,month,1).toLocaleDateString('it-IT',{month:'long',year:'numeric'});

    el.innerHTML = `
    <div style="max-width:900px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:15px;font-weight:800;text-transform:capitalize">${monthStr}</div>
        <div style="display:flex;gap:6px">
          <button style="padding:5px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:11px">◄</button>
          <button style="padding:5px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:11px">Oggi</button>
          <button style="padding:5px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:11px">►</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:6px">
        ${['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(d=>`<div style="text-align:center;font-size:9px;font-weight:700;color:var(--text-muted);padding:4px">${d}</div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">
        ${Array.from({length:(firstDay||7)-1+daysInMonth}, (_,i)=>{
          if(i < (firstDay||7)-1) return '<div></div>';
          const day = i - ((firstDay||7)-2);
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const dayOrders = withDue.filter(o=>o.dueDate===dateStr);
          const isToday = dateStr===now.toISOString().slice(0,10);
          const isPast = new Date(dateStr)<new Date(now.toISOString().slice(0,10));
          return `<div style="min-height:70px;padding:4px 5px;border-radius:7px;border:1px solid ${isToday?'var(--primary)':'var(--border)'};background:${isToday?'var(--primary-dim)':'var(--bg-card2)'};${isPast&&dayOrders.length?'border-color:#ef444440':''}">
            <div style="font-size:11px;font-weight:${isToday?'800':'400'};color:${isToday?'var(--primary)':'var(--text-muted)'};margin-bottom:3px">${day}</div>
            ${dayOrders.slice(0,3).map(o=>{
              const st=this.STATES[o._state];
              return `<div onclick="GestioneOrdini._openDetail(${o.id})"
                style="font-size:9px;padding:2px 5px;border-radius:3px;background:${st.color}20;color:${st.color};margin-bottom:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;font-weight:600"
                title="${o.clientName||''}">
                ${st.emoji} ${o.clientName||o.name||'#'+o.id}
              </div>`;
            }).join('')}
            ${dayOrders.length>3?`<div style="font-size:8px;color:var(--text-dim);text-align:center">+${dayOrders.length-3}</div>`:''}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  },

  // ══ TIMELINE ═══════════════════════════════════════════════════════
  /* Gli eventi non hanno un archivio proprio: stanno in `order_events`, dove
     `updateOrderStatus` li scrive da sempre. Questa vista li legge, non li
     produce. Un ordine senza eventi registrati mostra almeno la sua nascita,
     che è un fatto, non una ricostruzione. */
  _renderTimeline(el, orders) {
    el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12px">⏳ Carico gli eventi…</div>`;
    const token = (this._tlToken = (this._tlToken || 0) + 1);

    IDB.getAll('order_events').catch(()=>[]).then(eventi => {
      /* Una navigazione rapida può aver già cambiato vista: il risultato di
         una lettura vecchia non deve sovrascrivere quella nuova. */
      if(token !== this._tlToken || this._view !== 'timeline') return;

      const perOrdine = {};
      (eventi||[]).forEach(e => {
        if(!e || e.orderId == null) return;
        (perOrdine[e.orderId] = perOrdine[e.orderId] || []).push(e);
      });

      const righe = orders.slice(0, 40).map(o => {
        const st = this.STATES[o._state];
        const suoi = (perOrdine[o.id] || []).slice()
          .sort((a,b) => new Date(b.ts||0) - new Date(a.ts||0));
        const nascita = o.createdAt
          ? [{ event:'Ordine creato', stage:o._state, ts:o.createdAt, _sintetico:true }] : [];
        const tutti = suoi.length ? suoi : nascita;

        return `<div style="border:1px solid var(--border);border-radius:10px;background:var(--bg-card2);margin-bottom:8px;overflow:hidden">
          <div onclick="GestioneOrdini._openDetail(${o.id})" style="padding:9px 12px;display:flex;align-items:center;gap:9px;cursor:pointer;border-left:3px solid ${st.color}">
            <span style="font-size:13px">${st.emoji}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._esc(o.clientName||o.name||('#'+o.id))}</div>
              <div style="font-size:10px;color:var(--text-muted)">${this._esc(o.name||'')}</div>
            </div>
            <span style="font-size:10px;font-weight:800;color:${st.color}">${st.label}</span>
            <span style="font-size:11px;font-weight:700">€${(+(o.total||o.value||0)).toFixed(2)}</span>
          </div>
          <div style="padding:6px 12px 10px 26px;display:flex;flex-direction:column;gap:5px">
            ${tutti.length ? tutti.slice(0,8).map(e => `
              <div style="display:flex;gap:8px;align-items:baseline;font-size:10px">
                <span style="color:var(--text-dim);min-width:104px;font-variant-numeric:tabular-nums">${this._quando(e.ts)}</span>
                <span style="color:var(--text-muted)">${this._esc(e.event||'')}${e._sintetico?'':''}</span>
              </div>`).join('')
              : `<div style="font-size:10px;color:var(--text-dim)">Nessun evento registrato per questo ordine.</div>`}
            ${tutti.length>8?`<div style="font-size:9px;color:var(--text-dim)">+${tutti.length-8} eventi precedenti</div>`:''}
          </div>
        </div>`;
      }).join('');

      el.innerHTML = orders.length
        ? `<div style="max-width:900px">${righe}${orders.length>40?`<div style="text-align:center;padding:10px;font-size:10px;color:var(--text-dim)">Mostrati i 40 ordini più recenti di ${orders.length}.</div>`:''}</div>`
        : `<div style="padding:30px;text-align:center;color:var(--text-muted);font-size:12px">Nessun ordine da mostrare.</div>`;
    });
  },

  // ══ ANALYTICS ══════════════════════════════════════════════════════
  /* Qui vive ciò che «Workflow Overview» faceva da sezione a sé: il diagramma
     di flusso per fase, i KPI, gli ordini incoerenti e il Repair Sync. Le
     funzioni sono le stesse — WorkflowSync resta il loro proprietario, questa
     vista lo interroga. Cambia solo che non sono più una seconda sezione che
     mostra gli stessi ordini con un altro nome. */
  _renderAnalytics(el, orders) {
    const DONE = new Set(['venduto','completato','rifiutato','annullato']);
    const attivi = orders.filter(o => !DONE.has(o._state));
    const oggi = new Date().toISOString().slice(0,10);
    const scaduti = attivi.filter(o => o.dueDate && o.dueDate < oggi);
    const valoreAttivo = attivi.reduce((a,o) => a + (+(o.total||o.value||0)), 0);
    const venduto = orders.filter(o => o._state==='venduto')
      .reduce((a,o) => a + (+(o.total||o.value||0)), 0);

    const fasi = ['preventivo','inviato','accettato','produzione','completato','venduto'];
    const perFase = {};
    fasi.forEach(f => { perFase[f] = orders.filter(o => o._state===f); });

    /* Un ordine venduto senza vendita collegata è un buco nella catena, non
       una statistica: si mostra come da sistemare. */
    const incoerenti = orders.filter(o =>
      o._state==='venduto' && !o.linkedSaleId && !o.saleId);

    const kpi = (etichetta, valore, nota, colore) => `
      <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:11px 13px">
        <div style="font-size:19px;font-weight:800;color:${colore||'var(--text)'}">${valore}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${etichetta}</div>
        ${nota?`<div style="font-size:9px;color:var(--text-dim);margin-top:1px">${nota}</div>`:''}
      </div>`;

    el.innerHTML = `
    <div style="max-width:1100px">
      <!-- FLUSSO -->
      <div style="display:flex;align-items:stretch;gap:5px;overflow-x:auto;padding:2px 0 10px">
        ${fasi.map((f,i) => {
          const st = this.STATES[f];
          const n = perFase[f].length;
          const v = perFase[f].reduce((a,o) => a + (+(o.total||o.value||0)), 0);
          return `<div style="flex:1;min-width:104px;text-align:center">
            <div onclick="GestioneOrdini._setFilter('${f}')" title="Filtra gli ordini in ${st.label}"
                 style="cursor:pointer;padding:9px 6px;border-radius:9px;border:2px solid ${st.color}30;background:${st.color}10">
              <div style="font-size:19px;font-weight:800;color:${st.color}">${n}</div>
              <div style="font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">${st.label}</div>
              ${v>0?`<div style="font-size:9px;color:${st.color};font-weight:700">€${v.toFixed(0)}</div>`:''}
            </div>
            ${i<fasi.length-1?`<div style="margin-top:2px;color:var(--text-dim);font-size:13px">→</div>`:''}
          </div>`;
        }).join('')}
      </div>

      <!-- KPI -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:14px">
        ${kpi('Ordini aperti', attivi.length, valoreAttivo?`€${valoreAttivo.toFixed(0)} in gioco`:'')}
        ${kpi('In ritardo', scaduti.length, scaduti.length?'scadenza superata':'nessuno', scaduti.length?'#ef4444':'')}
        ${kpi('In produzione', perFase.produzione.length, '')}
        ${kpi('Venduto', `€${venduto.toFixed(0)}`, `${perFase.venduto.length} ordini`, '#22c55e')}
      </div>

      <!-- DA SISTEMARE -->
      <div style="border:1px solid var(--border);border-radius:10px;background:var(--bg-card2);overflow:hidden">
        <div style="padding:9px 12px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border)">
          <span style="font-size:12px;font-weight:800;flex:1">🔗 Coerenza ordini → vendite</span>
          <button onclick="GestioneOrdini._repairSync(this)"
                  style="padding:6px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:10px;font-weight:700;color:var(--text-muted)">
            🔧 Repair Sync
          </button>
        </div>
        <div style="padding:10px 12px">
          ${incoerenti.length ? incoerenti.slice(0,10).map(o => `
            <div onclick="GestioneOrdini._openDetail(${o.id})" style="display:flex;gap:9px;align-items:center;padding:5px 0;cursor:pointer;font-size:11px">
              <span style="color:#f59e0b">⚠</span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._esc(o.clientName||o.name||('#'+o.id))}</span>
              <span style="color:var(--text-dim);font-size:10px">venduto, nessuna vendita collegata</span>
            </div>`).join('')
            : `<div style="font-size:11px;color:var(--text-muted)">Ogni ordine venduto ha la sua vendita. Niente da sistemare.</div>`}
          ${incoerenti.length>10?`<div style="font-size:9px;color:var(--text-dim);margin-top:4px">+${incoerenti.length-10} altri</div>`:''}
        </div>
      </div>
    </div>`;
  },

  /* Il Repair non è reimplementato: è WorkflowSync.repair(), lo stesso che il
     bottone di Workflow Overview chiamava. Cambia il posto, non la funzione. */
  async _repairSync(btn) {
    if(typeof WorkflowSync === 'undefined' || typeof WorkflowSync.repair !== 'function') {
      toast('Sincronizzazione non disponibile', 'warning');
      return;
    }
    const testo = btn ? btn.innerHTML : '';
    if(btn) { btn.disabled = true; btn.innerHTML = '🔄 Repair…'; }
    try {
      const fix = await WorkflowSync.repair();
      toast(`🔧 Repair completato: ${fix} correzioni`, fix > 0 ? 'success' : 'info');
      await this.render();
    } catch(e) {
      if(window.Ingly && window.Ingly.Errors) window.Ingly.Errors.log('repair sync', e);
      toast('Repair non riuscito: ' + ((e && e.message) || e), 'error');
    } finally {
      if(btn) { btn.disabled = false; btn.innerHTML = testo; }
    }
  },

  /* La generazione della FatturaPA viveva su un bottone iniettato nelle righe
     di «Avanzamento ordini», e quella era la sua **unica** via d'accesso:
     ritirare quella sezione l'avrebbe resa irraggiungibile. Il generatore
     (`FatturaDaOrdine`) non è stato riscritto — cambia solo da dove lo si
     chiama e su quale record.

     Prima leggeva l'ordine da `ingly_orders_pro_v1` e ci scriveva sopra
     `status:'paid'`: segnava pagata una copia che nessun'altra vista leggeva.
     Ora l'ordine è quello canonico, e il passaggio a «venduto» lo fa la
     funzione SSOT, che aggiorna lo stato, lo storico e gli eventi. */
  async _fatturaPA(id) {
    if(typeof FatturaDaOrdine === 'undefined' || typeof FatturaDaOrdine.genera !== 'function') {
      toast('Generatore FatturaPA non disponibile', 'warning');
      return;
    }
    const o = await IDB.get('orders', id).catch(() => null);
    if(!o) { toast('Ordine non trovato', 'error'); return; }

    const totale = +(o.total || o.value || 0);
    const cliente = o.clientName || o.client || 'Cliente';
    const ok = await (typeof confirmDialog === 'function'
      ? confirmDialog(`Generare la FatturaPA per ${cliente} (€${totale.toFixed(2)})?`)
      : Promise.resolve(confirm(`Generare la FatturaPA per ${cliente} (€${totale.toFixed(2)})?`)));
    if(!ok) return;

    /* Il generatore si aspetta i nomi di campo del vecchio archivio: si
       adattano qui, in un punto solo, invece di rinominarli nel record. */
    FatturaDaOrdine.genera({
      id: o.id, total: totale, client: cliente,
      description: o.description || o.name || '',
      product: o.name || '',
    });

    if(this._normalizeState(o.stage || o.status) !== 'venduto') {
      await this.transition(o.id, 'venduto', { note: 'FatturaPA generata' });
      await this.render();
    }
  },

  _esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  },

  _quando(ts) {
    if(!ts) return '—';
    const d = new Date(ts);
    if(isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'2-digit'}) +
           ' ' + d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
  },

  // ══ DRAG & DROP ════════════════════════════════════════════════════
  _dragging: null,
  _onDragStart(e, id) { this._dragging=id; e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',String(id)); },
  async _onDrop(e, newState) {
    e.preventDefault();
    const id = this._dragging || e.dataTransfer.getData('text/plain');
    this._dragging = null;
    if(!id || !this.STATES[newState]) return;
    const result = await this.transition(id, newState);
    if(result) { await this.render(); toast(`${this.STATES[newState].emoji} → ${this.STATES[newState].label}`, 'success'); }
  },

  // ══ CONTROLLI ══════════════════════════════════════════════════════
  _setView(v){ this._view=v; localStorage.setItem('ingly_go_view_v1',v); this.render(); },
  _onSearch(q){ this._search=q; clearTimeout(this._st); this._st=setTimeout(()=>this.render(),250); },
  _setFilter(v){ this._filterState=v; this._listPage=0; this.render(); },
  _setPriority(v){ this._filterPriority=v; this._listPage=0; this.render(); },
  _setSort(v){ this._sortBy=v; this._listPage=0; this.render(); },

  // ══ EXPORT ═════════════════════════════════════════════════════════
  async _exportOrders() {
    const orders = await this.getOrders();
    const rows = [['ID','Cliente','Ordine','Stato','Importo','Scadenza','Creato']];
    orders.forEach(o => rows.push([o.id, o.clientName||'', o.name||'', o._state, +(o.total||o.value||0), o.dueDate||'', (o.createdAt||'').slice(0,10)]));
    const csv = rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href=url; a.download='ordini-'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('📥 Ordini esportati in CSV','success');
  },

  // ══ DETAIL MODAL ═══════════════════════════════════════════════════
  /* ── Il consuntivo dentro il dettaglio ──────────────────────────────────
     Un ordine ha tre numeri: quanto dovrebbe costare, quanto è costato e la
     differenza. Il gestionale ne mostrava uno. Il pannello lo disegna
     `InglyOrderEconomics`; il costo reale lo possiede `InglyActualCost`; il
     confronto `InglyScostamento`. Qui si mettono insieme, non si calcolano.

     Il metodo sta qui, sull'oggetto, e non dentro `_openDetail`: quella
     funzione la patch 055 la sostituisce per intero, quindi la versione di
     questo file non viene mai eseguita. Chi disegna il dettaglio chiama
     questo metodo, chiunque sia. */
  async _riempiConsuntivo(o) {
    const n = document.getElementById('go-consuntivo');
    if (!n) return;
    const E = window.InglyOrderEconomics;
    if (!E || !E.pannelloConsuntivo) { n.innerHTML = ''; return; }
    const A = window.InglyActualCost;
    try {
      const [reale, spese] = await Promise.all([
        A && A.perOrdine ? A.perOrdine(o.id, o.quoteId).catch(() => ({ registrato: false })) : Promise.resolve({ registrato: false }),
        E.vociRegistrate ? E.vociRegistrate(o.id).catch(() => ({})) : Promise.resolve({}),
      ]);
      /* Il nodo può essere sparito nel frattempo: chi chiude il modale mentre
         la lettura è in volo non deve vedere un errore in console. */
      const vivo = document.getElementById('go-consuntivo');
      if (vivo) vivo.innerHTML = E.pannelloConsuntivo(o, reale, spese);
    } catch (e) {
      if (window.Ingly && window.Ingly.Errors) window.Ingly.Errors.log('consuntivo ordine', e);
    }
  },

  async _openDetail(id) {
    const o = await IDB.get('orders', +id||id).catch(()=>null);
    if(!o) return;
    const st = this.STATES[this._normalizeState(o.stage||o.status||'preventivo')];
    const val = +(o.total||o.value||o.grossPrice||0);

    const modal = document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:#000b;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick=e=>{ if(e.target===modal) modal.remove(); };
    modal.innerHTML=`
    <div style="background:var(--bg-card);border-radius:14px;width:min(580px,96vw);max-height:92vh;overflow-y:auto;border:1px solid var(--border2);box-shadow:0 24px 64px #000c">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);background:${st.color}12;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:5">
        <span style="font-size:18px">${st.emoji}</span>
        <div style="flex:1"><div style="font-size:14px;font-weight:800">${o.clientName||'—'}</div>
          <div style="font-size:10px;color:var(--text-muted)">${o.name||'Ordine'} · <span style="color:${st.color};font-weight:700">${st.label}</span></div></div>
        ${val?`<div style="font-size:17px;font-weight:900;color:${st.color}">€${val.toFixed(0)}</div>`:''}
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">✕</button>
      </div>
      <div style="padding:14px 18px">
        <!-- Stato selector -->
        <div style="margin-bottom:12px">
          <div style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Cambia stato</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${Object.entries(this.STATES).map(([k,s])=>`<button onclick="GestioneOrdini.transition(${o.id},'${k}').then(r=>{if(r){this.closest('[style*=fixed]').remove();GestioneOrdini.render();}})"
              style="padding:4px 9px;border-radius:5px;border:1px solid ${this._normalizeState(o.stage||o.status)===k?s.color:s.color+'40'};background:${this._normalizeState(o.stage||o.status)===k?s.color:s.color+'12'};color:${this._normalizeState(o.stage||o.status)===k?'#fff':s.color};cursor:pointer;font-size:10px;font-weight:700">${s.emoji} ${s.label}</button>`).join('')}
          </div>
        </div>
        <!-- Info grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px">
          ${[['Cliente',o.clientName||'—'],['Importo',val?'€'+val.toFixed(2):'—'],['Scadenza',o.dueDate?new Date(o.dueDate).toLocaleDateString('it-IT'):'—'],['Priorità',(o.priority||'normal').toUpperCase()],['Canale',o.channel||'—'],['Fonte',o.source||'manuale']].map(([l,v])=>`
          <div style="padding:7px 10px;background:var(--bg-card2);border-radius:7px">
            <div style="font-size:8px;color:var(--text-dim);text-transform:uppercase;font-weight:700">${l}</div>
            <div style="font-size:12px;font-weight:700;color:var(--text);margin-top:2px">${v}</div>
          </div>`).join('')}
        </div>
        ${o.notes?`<div style="padding:9px 12px;background:var(--bg-card2);border-left:3px solid ${st.color};border-radius:0 6px 6px 0;margin-bottom:10px;font-size:11px;color:var(--text-muted);line-height:1.5">${o.notes}</div>`:''}
        <!-- History -->
        ${(o._history||[]).length?`<details style="margin-bottom:10px"><summary style="font-size:10px;font-weight:700;color:var(--text-muted);cursor:pointer">📜 Storico transizioni (${(o._history||[]).length})</summary>
          <div style="margin-top:5px;display:flex;flex-direction:column;gap:3px;max-height:120px;overflow-y:auto">
            ${[...(o._history||[])].reverse().map(h=>`<div style="display:flex;gap:6px;font-size:9px;color:var(--text-dim);padding:3px 0;border-bottom:1px solid var(--border)">
              <span style="color:${(this.STATES[h.from]||{}).color||'#888'}">${h.from||'—'}</span>→<span style="color:${(this.STATES[h.to]||{}).color||'#888'}">${h.to}</span>
              <span style="margin-left:auto">${new Date(h.ts).toLocaleDateString('it-IT')}</span>
            </div>`).join('')}
          </div></details>`:''}
        <!-- Azioni -->
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${st.next?`<button onclick="GestioneOrdini.transition(${o.id},'${st.next}').then(r=>{if(r){this.closest('[style*=fixed]').remove();GestioneOrdini.render();}})"
            style="flex:1;padding:9px;background:${st.color};color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px">
            ${this.STATES[st.next].emoji} → ${this.STATES[st.next].label}</button>`:''}
          <button onclick="typeof WAQuick!=='undefined'&&WAQuick.sendOrderReady({clientName:'${(o.clientName||'').replace(/'/g,'')}',name:'${(o.name||'').replace(/'/g,'')}',status:'pronto'})"
            style="padding:9px 12px;background:#25D36615;border:1px solid #25D36640;border-radius:8px;cursor:pointer;font-size:11px;color:#25D366">💬 WA</button>
          <button onclick="typeof OrderQuickNote!=='undefined'&&OrderQuickNote.open(${o.id},'${(o.name||'').replace(/'/g,'')}');this.closest('[style*=fixed]').remove()"
            style="padding:9px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)">📝 Nota</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(modal);
  },

  // ══ CREATE MODAL ═══════════════════════════════════════════════════
  async _openCreate() {
    const clients = await IDB.getAll('clients').catch(()=>[]);
    const modal = document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:#000b;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick=e=>{ if(e.target===modal) modal.remove(); };
    modal.innerHTML=`
    <div style="background:var(--bg-card);border-radius:14px;width:min(480px,96vw);border:1px solid var(--border2);box-shadow:0 24px 64px #000c;overflow:hidden">
      <div style="padding:13px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:800">+ Nuovo Ordine</div>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">✕</button>
      </div>
      <div style="padding:14px 18px;display:flex;flex-direction:column;gap:8px">
        <div><label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">CLIENTE</label>
          <select id="go-nc" class="form-control" style="font-size:11px">
            <option value="">Seleziona o scrivi sotto…</option>
            ${clients.map(cl=>`<option value="${cl.name||cl.company}">${cl.name||cl.company}</option>`).join('')}
          </select></div>
        <div><label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">NOME ORDINE *</label>
          <input id="go-nn" class="form-control" placeholder="Es. Segnaposto matrimonio Rossi" style="font-size:11px"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
          <div><label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">€</label>
            <input id="go-na" type="number" step="0.01" class="form-control" placeholder="0.00" style="font-size:11px"></div>
          <div><label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">SCADENZA</label>
            <input id="go-nd" type="date" class="form-control" style="font-size:11px"></div>
          <div><label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">PRIORITÀ</label>
            <select id="go-np" class="form-control" style="font-size:11px">
              <option value="normal">⚪ Normale</option>
              <option value="high">🟠 Alta</option>
              <option value="urgent">🔴 Urgente</option>
            </select></div>
        </div>
        <div><label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">STATO</label>
          <select id="go-ns" class="form-control" style="font-size:11px">
            ${Object.entries(this.STATES).filter(([k])=>!['venduto','annullato'].includes(k)).map(([k,s])=>`<option value="${k}">${s.emoji} ${s.label}</option>`).join('')}
          </select></div>
        <div><label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">NOTE</label>
          <textarea id="go-nnote" class="form-control" rows="2" style="font-size:11px;resize:none" placeholder="Note opzionali…"></textarea></div>
        <button id="go-save-btn" onclick="GestioneOrdini._saveNew(this)" style="padding:10px;background:var(--primary);color:#000;border:none;border-radius:9px;font-weight:800;cursor:pointer;font-size:13px">✅ Crea Ordine</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    setTimeout(()=>document.getElementById('go-nn')?.focus(),80);
  },

  async _saveNew(btn) {
    const name = document.getElementById('go-nn')?.value?.trim();
    if(!name){ toast('Inserisci il nome ordine','warning'); return; }
    btn.disabled=true; btn.textContent='⏳ Salvataggio…';
    const state = document.getElementById('go-ns')?.value||'preventivo';
    const order = {
      id:         Date.now(),
      clientName: document.getElementById('go-nc')?.value?.trim()||'',
      name,
      total:      parseFloat(document.getElementById('go-na')?.value||0)||0,
      dueDate:    document.getElementById('go-nd')?.value||'',
      notes:      document.getElementById('go-nnote')?.value||'',
      priority:   document.getElementById('go-np')?.value||'normal',
      stage: state, status: state,
      createdAt:  new Date().toISOString(),
      _history:   [{from:null,to:state,ts:new Date().toISOString()}],
    };
    try {
      await IDB.put('orders', order);
      if(typeof AppStore!=='undefined') AppStore.invalidate('orders');
      document.querySelector('[style*="position:fixed"][style*="z-index:9998"]')?.remove();
      toast('✅ Ordine creato!','success');
      document.dispatchEvent(new CustomEvent('orderUpdated',{detail:{id:order.id,to:state,order}}));
      await this.render();
    } catch(e){ toast('Errore: '+e.message,'error'); btn.disabled=false; btn.textContent='✅ Crea Ordine'; }
  },

  // ═══ Production Notes + Quick Actions ═══
  async openProductionPanel(orderId) {
    const order = await IDB.get('orders', +orderId||orderId).catch(()=>null);
    if(!order) return;
    const notes = JSON.parse(localStorage.getItem('ingly_prod_notes_' + orderId) || '[]');
    const timerKey = 'ingly_timer_' + orderId;
    const timerData = JSON.parse(localStorage.getItem(timerKey)||'{"total":0,"running":false,"start":null}');
    const totalMinutes = Math.floor(timerData.total/60);

    const ov = document.createElement('div');
    ov.id = '_prod-panel';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.onclick = e=>{ if(e.target===ov) ov.remove(); };
    ov.innerHTML = `
    <div style="background:var(--bg-card);border-radius:16px;width:min(580px,100%);max-height:90vh;overflow-y:auto;border:1px solid var(--border2)" onclick="event.stopPropagation()">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;position:sticky;top:0;background:var(--bg-card);z-index:1">
        <div style="flex:1">
          <div style="font-size:14px;font-weight:800">⚙️ ${order.name||'Ordine'}</div>
          <div style="font-size:11px;color:var(--text-muted)">${order.clientName||order.client||'Cliente'} · €${Math.round(order.total||0)}</div>
        </div>
        <button onclick="document.getElementById('_prod-panel').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:18px">✕</button>
      </div>
      <div style="padding:18px;display:flex;flex-direction:column;gap:14px">

        <!-- Deadline + priority -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div>
            <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">📅 Scadenza</label>
            <input type="date" id="pp-deadline" value="${order.dueDate||''}" class="form-control" style="font-size:13px">
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">🎯 Priorità</label>
            <select id="pp-priority" class="form-control" style="font-size:13px">
              ${['urgent','high','normal','low'].map(p=>`<option value="${p}" ${(order.priority||'normal')===p?'selected':''}>${{urgent:'🔴 Urgente',high:'🟠 Alta',normal:'🟡 Normale',low:'🟢 Bassa'}[p]}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Timer -->
        <div style="background:var(--bg-card2);border-radius:10px;padding:12px 14px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="font-size:12px;font-weight:700">⏱ Tempo lavorazione</div>
            <div id="pp-timer-display" style="font-size:18px;font-weight:900;font-family:monospace;color:var(--primary)">${String(Math.floor(totalMinutes/60)).padStart(2,'0')}:${String(totalMinutes%60).padStart(2,'0')}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button onclick="GestioneOrdini._timerToggle('${orderId}')"
              style="flex:1;padding:8px;background:${timerData.running?'rgba(239,68,68,.12)':'rgba(34,197,94,.12)'};color:${timerData.running?'#ef4444':'#22c55e'};border:1px solid ${timerData.running?'rgba(239,68,68,.3)':'rgba(34,197,94,.3)'};border-radius:8px;cursor:pointer;font-size:12px;font-weight:700" id="pp-timer-btn">
              ${timerData.running?'⏸ Pausa':'▶ Avvia timer'}
            </button>
            <button onclick="GestioneOrdini._timerReset('${orderId}')"
              style="padding:8px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;color:var(--text-muted)">↺</button>
          </div>
        </div>

        <!-- Production notes -->
        <div>
          <div style="font-size:12px;font-weight:700;margin-bottom:8px">📝 Note di lavorazione</div>
          <div id="pp-notes-list" style="display:flex;flex-direction:column;gap:5px;margin-bottom:8px">
            ${notes.length ? notes.slice().reverse().map(n=>`
            <div style="background:var(--bg-card2);border-radius:8px;padding:8px 10px;display:flex;gap:8px;align-items:flex-start">
              <div style="flex:1;font-size:12px;color:var(--text)">${n.text}</div>
              <div style="font-size:10px;color:var(--text-muted);flex-shrink:0">${new Date(n.ts).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
            </div>`).join('') : '<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:10px">Nessuna nota</div>'}
          </div>
          <div style="display:flex;gap:7px">
            <input id="pp-new-note" class="form-control" placeholder="Aggiungi nota (es: effettuato taglio 1° pezzo, verniciatura applicata...)" style="flex:1;font-size:12px"
              onkeydown="if(event.key==='Enter')GestioneOrdini._addNote('${orderId}')">
            <button onclick="GestioneOrdini._addNote('${orderId}')" style="padding:0 14px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:800">+</button>
          </div>
        </div>

        <div style="display:flex;gap:8px;padding-top:4px;border-top:1px solid var(--border)">
          <button onclick="document.getElementById('_prod-panel').remove()" style="flex:1;padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:13px">Chiudi</button>
          <button onclick="GestioneOrdini._savePanelChanges('${orderId}')" style="flex:2;padding:10px;background:var(--primary);color:#000;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva modifiche</button>
        </div>
      </div>
    </div>`;
    document.getElementById('_prod-panel')?.remove();
    document.body.appendChild(ov);

    // Start timer display update if running
    if(timerData.running) {
      this._timerInterval = setInterval(() => GestioneOrdini._updateTimerDisplay(orderId), 1000);
    }
  },

  _timerToggle(orderId) {
    const key = 'ingly_timer_' + orderId;
    const d = JSON.parse(localStorage.getItem(key)||'{"total":0,"running":false,"start":null}');
    if(d.running) {
      // Stop
      d.total += Math.floor((Date.now() - (d.start||Date.now()))/1000);
      d.running = false; d.start = null;
      clearInterval(this._timerInterval);
    } else {
      // Start
      d.running = true; d.start = Date.now();
      this._timerInterval = setInterval(() => this._updateTimerDisplay(orderId), 1000);
    }
    localStorage.setItem(key, JSON.stringify(d));
    const btn = document.getElementById('pp-timer-btn');
    if(btn) { btn.textContent = d.running ? '⏸ Pausa' : '▶ Avvia timer'; btn.style.color = d.running?'#ef4444':'#22c55e'; }
  },

  _timerReset(orderId) {
    if(!confirm('Azzerare il timer?')) return;
    localStorage.setItem('ingly_timer_' + orderId, JSON.stringify({total:0,running:false,start:null}));
    clearInterval(this._timerInterval);
    const disp = document.getElementById('pp-timer-display');
    if(disp) disp.textContent = '00:00';
    const btn = document.getElementById('pp-timer-btn');
    if(btn) { btn.textContent = '▶ Avvia timer'; btn.style.color = '#22c55e'; }
  },

  _updateTimerDisplay(orderId) {
    const key = 'ingly_timer_' + orderId;
    const d = JSON.parse(localStorage.getItem(key)||'{"total":0,"running":false,"start":null}');
    if(!d.running) return;
    const totalSec = d.total + Math.floor((Date.now() - (d.start||Date.now()))/1000);
    const m = Math.floor(totalSec/60), s = totalSec%60;
    const disp = document.getElementById('pp-timer-display');
    if(disp) disp.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  },

  _addNote(orderId) {
    const inp = document.getElementById('pp-new-note');
    const text = inp?.value?.trim();
    if(!text) return;
    const key = 'ingly_prod_notes_' + orderId;
    const notes = JSON.parse(localStorage.getItem(key)||'[]');
    notes.push({ ts: Date.now(), text });
    localStorage.setItem(key, JSON.stringify(notes));
    inp.value = '';
    const list = document.getElementById('pp-notes-list');
    if(list) {
      const div = document.createElement('div');
      div.style.cssText = 'background:var(--bg-card2);border-radius:8px;padding:8px 10px;display:flex;gap:8px;animation:fadeIn .2s ease';
      div.innerHTML = `<div style="flex:1;font-size:12px;color:var(--text)">${text}</div><div style="font-size:10px;color:var(--text-muted);flex-shrink:0">adesso</div>`;
      list.insertBefore(div, list.firstChild);
      if(list.children.length===1 || list.querySelector('[style*="Nessuna nota"]'))
        list.querySelector('[style*="text-align:center"]')?.remove();
    }
    if(typeof toast!=='undefined') toast('📝 Nota aggiunta','success');
  },

  async _savePanelChanges(orderId) {
    const deadline = document.getElementById('pp-deadline')?.value;
    const priority = document.getElementById('pp-priority')?.value;
    const order = await IDB.get('orders', +orderId||orderId).catch(()=>null);
    if(!order) return;
    if(deadline) order.dueDate = deadline;
    if(priority) order.priority = priority;
    order.updated = new Date().toISOString();
    await IDB.put('orders', order);
    document.getElementById('_prod-panel')?.remove();
    this.render();
    if(typeof toast!=='undefined') toast('💾 Ordine aggiornato!','success');
  },

  // Enhanced filter helpers
  clearFilters(){
    this._filterState = 'all';
    this._filterPriority = 'all';
    this._search = '';
    this._sortBy = 'date_desc';
    this.render();
    if(typeof toast!=='undefined') toast('Filtri rimossi','info');
  },

  filterOverdue(){
    this._filterState = 'overdue';
    this.render();
  },

  // Add overdue to filter pipeline
  _getFilteredOrders(orders){
    const now = new Date().toISOString().split('T')[0];
    const q = this._search.toLowerCase();
    const fltState = this._filterState;
    const fltPrio = this._filterPriority;
    return orders.filter(o=>{
      if(fltState==='overdue'){
        const active=['preventivo','inviato','accettato','produzione'].includes(o._state);
        if(!active||!o.dueDate||o.dueDate>=now) return false;
      } else if(fltState!=='all' && o._state!==fltState) return false;
      if(fltPrio!=='all'&&(o.priority||'normal')!==fltPrio) return false;
      if(q&&![(o.clientName||''),(o.name||''),(o.notes||'')].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
  }
};
window.GestioneOrdini = GestioneOrdini;

// Auto-refresh globale
document.addEventListener('orderUpdated', function() {
  if(App?.currentSection==='gestione_ordini'||App?.currentSection==='pipeline'||
     App?.currentSection==='orders'||App?.currentSection==='workflow'||App?.currentSection==='produzione') {
    if(typeof AbortableTimer!=='undefined') AbortableTimer.set('go-refresh', ()=>GestioneOrdini.render(), 200);
    else setTimeout(()=>GestioneOrdini.render(), 200);
  }
  setTimeout(()=>{ SidebarBadges?.update(); QuickStats?.update(); }, 300);
});

