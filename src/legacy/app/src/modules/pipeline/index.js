
// === /src/modules/pipeline/index.js ===
// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE ORDINI v88 — Centro Operativo Completo
// Preventivo rapido · Kanban · Coda produzione · Pagamenti IVA
// ═══════════════════════════════════════════════════════════════════════════

const PipelineOS = {

  _search: '',
  _filter: 'all',
  _tab: 'overview',   // 'overview' | 'produzione' | 'kanban' | 'pagamenti'
  _codaFilter: 'all',
  _qrLines: [],
  _discount: 0,
  _catalog: [],
  _clients: [],
  _orders: [],
  _sales: [],
  _quotes: [],

  STAGES: [
    { id:'draft',      label:'📝 Bozza',            color:'#6366f1', group:'quote'  },
    { id:'sent',       label:'✉️ Inviato',            color:'#3b82f6', group:'quote'  },
    { id:'accepted',   label:'✅ Confermato',         color:'#10b981', group:'quote'  },
    { id:'production', label:'⚙️ In Produzione',      color:'#f59e0b', group:'prod'   },
    { id:'working',    label:'🔧 In Lavorazione',     color:'#fb923c', group:'prod'   },
    { id:'completed',  label:'🏁 Completato',         color:'#22c55e', group:'prod'   },
    { id:'delivery',   label:'📦 Da Consegnare',      color:'#0ea5e9', group:'prod'   },
    { id:'delivered',  label:'🚚 Consegnato',         color:'#64748b', group:'pay'    },
    { id:'deposit',    label:'💳 Acconto',            color:'#f97316', group:'pay'    },
    { id:'to_pay',     label:'💶 Da Pagare',          color:'#ef4444', group:'pay'    },
    { id:'paid',       label:'💰 Pagato',             color:'#16a34a', group:'pay'    },
    { id:'rejected',   label:'❌ Annullato',          color:'#dc2626', group:'other'  },
  ],
  IVA: [
    { id:'22', label:'IVA 22%', rate:0.22 },
    { id:'10', label:'IVA 10%', rate:0.10 },
    { id:'4',  label:'IVA  4%', rate:0.04 },
    { id:'0',  label:'Esente / Forfettario', rate:0 },
  ],

  stageById(id) { return this.STAGES.find(s=>s.id===id) || {id,label:id,color:'#6366f1',group:'other'}; },

  // ── Main render ──────────────────────────────────────────────────────────
  async render() {
    try {
      // v3.3: read from unified pipeline store (with safe fallback to orders/sales)
      const [pipelineRaw, ordersRaw, salesRaw, quotesRaw] = await Promise.all([
        AppStore.get('pipeline').catch(()=>[]),
        AppStore.get('orders').catch(()=>[]),
        AppStore.get('sales').catch(()=>[]),
        AppStore.get('quotes').catch(()=>[]),
      ]);

      // Use pipeline store if populated, else fall back to orders (zero-risk)
      const usePipeline = pipelineRaw && pipelineRaw.length > 0;
      const orders = usePipeline ? pipelineRaw : ordersRaw;
      const sales  = usePipeline
        ? pipelineRaw.filter(r => r._source === 'sales' || r.stage === 'paid')
        : salesRaw;

      this._orders   = orders;
      this._sales    = sales;
      this._quotes   = usePipeline ? pipelineRaw.filter(r => r._source === 'quotes') : quotesRaw;
      this._usePipeline = usePipeline;

      this._renderKPIs(orders, sales);
      this._renderCoda(orders);
      await this._renderKanban(orders);
      this._renderProduzione(orders);
      this._renderTimeline(orders);
      this._renderPagamenti(orders, sales);
      this._renderPaySummary(orders, sales);
      setTimeout(async()=>{
      this.switchTab(this._loadTab());
      if(this._loadTab()==='calendar') await this._renderCalendar(this._orders);
    }, 50);
    } catch(e) { console.error('[PipelineOS]', e); }
  },

  setTab() { this.render(); },
  _saveTab(tab){ this._tab=tab; try{localStorage.setItem('ingly_pipeline_tab',tab);}catch(e){} },
  _loadTab(){ try{return localStorage.getItem('ingly_pipeline_tab')||'overview';}catch(e){return 'overview';} },
  refresh() { this.render(); },
  search(q) {
    this._search = q.toLowerCase();
    try { OrderFlow.search(q); } catch(e) {}
    this._renderCoda(this._orders);
  },

  // ── Tab switching ────────────────────────────────────────────────────────
  switchTab(tab) {
    this._saveTab(tab);
    const tabs = ['overview','produzione','kanban','pagamenti','calendar'];
    tabs.forEach(t => {
      const panel = document.getElementById(`pos-tab-${t}`);
      const btn   = document.getElementById(`pos-tab-btn-${t}`);
      if (panel) panel.style.display = t === tab ? '' : 'none';
      if (btn) {
        const on = t === tab;
        // Underline tab style (professional)
        btn.style.borderBottomColor = on ? 'var(--primary)' : 'transparent';
        btn.style.color             = on ? 'var(--primary)' : 'var(--text-muted)';
        btn.style.fontWeight        = on ? '800' : '600';
      }
    });
  },

  filterCoda(stage) {
    this._codaFilter = stage;
    // Update chip styles
    ['all','production','working','accepted'].forEach(s => {
      const el = document.getElementById(`coda-chip-${s}`);
      if (!el) return;
      const on = s === stage;
      el.style.background  = on ? 'var(--primary)' : 'transparent';
      el.style.color       = on ? '#000' : 'var(--text-muted)';
      el.style.borderColor = on ? 'var(--primary)' : 'var(--border)';
      el.style.fontWeight  = on ? '700' : '500';
    });
    this._renderCoda(this._orders);
  },

  // ── KPI Bar ─────────────────────────────────────────────────────────────
  _renderKPIs(orders, sales) {
    const el = eid('pos-kpis');
    if (!el) return;
    const now = new Date();
    const TERMINAL = new Set(['paid','delivered','sold','invoiced','completed','rejected','lost','cancelled','archived']);
    const active    = orders.filter(o=>!TERMINAL.has(o.stage||o.status||'') && !o._archived);
    const inProd    = active.filter(o=>['production','working'].includes(o.stage));
    const overdue   = active.filter(o=>o.dueDate&&new Date(o.dueDate)<now);
    const toDeliver = active.filter(o=>['completed','delivery'].includes(o.stage));
    const toPayVal  = active.filter(o=>['to_pay','deposit','delivered'].includes(o.stage))
                       .reduce((a,o)=>a+(+o.total||+o.value||0),0)
                    + sales.filter(s=>s.status==='da_pagare').reduce((a,s)=>a+(+s.amount||0),0);
    const paidM = orders.filter(o=>{
      if(o.stage!=='paid') return false;
      const d=new Date(o.updatedAt||o.paidAt||0);
      return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    }).reduce((a,o)=>a+(+o.total||+o.value||0),0);

    const badge = eid('pos-order-badge');
    if(badge) badge.textContent = active.length + ' attivi';

    const kpis = [
      {ico:'fa-fire',       label:'Lavori Attivi',   val:active.length,        sub:inProd.length+' in produzione',    color:'var(--primary)',  bg:'var(--primary-dim)'},
      {ico:'fa-clock',      label:'In Ritardo',      val:overdue.length,       sub:overdue.length?'⚠️ richiede azione':'tutto ok', color:overdue.length?'var(--red)':'var(--green)', bg:overdue.length?'#ef444415':'#22c55e15'},
      {ico:'fa-shipping-fast',label:'Da Consegnare', val:toDeliver.length,     sub:'pronti o in consegna',            color:'#0ea5e9',         bg:'#0ea5e915'},
      {ico:'fa-euro-sign',  label:'Da Incassare',    val:fmtCur(toPayVal),     sub:'fatture + acconti',               color:'var(--orange)',   bg:'#f97316 15'},
      {ico:'fa-check-double',label:'Incassato mese', val:fmtCur(paidM),        sub:new Date().toLocaleString('it-IT',{month:'long'}), color:'var(--green)', bg:'#22c55e15'},
    ];

    el.innerHTML = kpis.map(k=>`
      <div class="kpi-card" style="position:relative;overflow:hidden;padding:14px 16px">
        <div style="position:absolute;top:12px;right:12px;width:30px;height:30px;background:${k.bg};border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fas ${k.ico}" style="font-size:13px;color:${k.color}"></i>
        </div>
        <div style="font-size:20px;font-weight:900;color:${k.color};line-height:1;margin-bottom:3px">${k.val}</div>
        <div style="font-size:11px;font-weight:700;color:var(--text-muted)">${k.label}</div>
        <div style="font-size:10px;color:var(--text-dim);margin-top:2px">${k.sub}</div>
      </div>`).join('');
  },

  // ── Coda Produzione (left panel) ─────────────────────────────────────────
  _renderCoda(orders) {
    const el = document.getElementById('pos-coda');
    if (!el) return;

    const cf = this._codaFilter;
    const stagesInCoda = cf === 'all'
      ? ['accepted','production','working','paused','completed','delivery']
      : [cf];

    let q = (orders||[]).filter(o => stagesInCoda.includes(o.stage));
    if (this._search) {
      const s = this._search;
      q = q.filter(o=>(o.clientName||'').toLowerCase().includes(s)||(o.name||'').toLowerCase().includes(s));
    }
    q.sort((a,b)=>{
      const ao = a.dueDate&&new Date(a.dueDate)<new Date()?-1:0;
      const bo = b.dueDate&&new Date(b.dueDate)<new Date()?-1:0;
      if(ao!==bo) return ao-bo;
      if(a.dueDate&&b.dueDate) return new Date(a.dueDate)-new Date(b.dueDate);
      return new Date(a.createdAt||0)-new Date(b.createdAt||0);
    });

    const badge = document.getElementById('pos-coda-badge');
    if (badge) badge.textContent = q.length;

    if (!q.length) {
      el.innerHTML = `<div style="text-align:center;padding:24px 16px;color:var(--text-muted)">
        <i class="fas fa-check-circle" style="font-size:24px;opacity:.3;margin-bottom:8px;display:block"></i>
        <div style="font-size:12px">Nessun ordine in coda</div>
        <button onclick="PipelineOS.openCreate()" style="margin-top:10px;padding:6px 14px;background:var(--primary);border:none;border-radius:7px;color:#000;font-size:11px;font-weight:700;cursor:pointer">+ Nuovo Ordine</button>
      </div>`;
      return;
    }

    el.innerHTML = q.map(o => {
      const st = this.stageById(o.stage);
      const now = new Date();
      const isOverdue = o.dueDate && new Date(o.dueDate) < now;
      const daysLeft  = o.dueDate ? Math.ceil((new Date(o.dueDate)-now)/86400000) : null;
      const val = o.total || o.value || 0;
      const items = (o.items||[]);
      const nextStage = this._getNextStage(o.stage);

      const dueHtml = o.dueDate ? (() => {
        const col = isOverdue ? '#ef4444' : daysLeft<=2 ? '#f59e0b' : 'var(--text-dim)';
        const lbl = isOverdue ? `⚠️ Scaduto ${Math.abs(daysLeft)}g` : daysLeft===0 ? '⚡ Oggi' : daysLeft===1 ? '↑ Domani' : `${daysLeft}g`;
        return `<span style="font-size:10px;color:${col};font-weight:${isOverdue?'700':'500'}">${lbl}</span>`;
      })() : '';

      return `
        <div onclick="try{window.OrderFlow&&window.OrderFlow.openDetail(${o.id})}catch(_e){console.warn('[detail]',_e)}"
          style="padding:12px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:.12s;border-left:3px solid ${isOverdue?'#ef4444':st.color}"
          onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background='transparent'">

          <!-- Row 1: client + value -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:3px">
            <div style="font-size:12px;font-weight:700;color:var(--text);line-height:1.3;flex:1">${o.clientName||o.name||'Senza nome'}</div>
            ${val ? `<div style="font-size:12px;font-weight:800;color:var(--green);flex-shrink:0">${fmtCur(val)}</div>` : ''}
          </div>

          <!-- Row 2: job name if different -->
          ${o.name&&o.clientName&&o.name!==o.clientName ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">${o.name.slice(0,40)}</div>` : ''}

          <!-- Row 3: stage badge + due -->
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:6px">
            <span style="font-size:11px;padding:3px 10px;border-radius:99px;background:${st.color}20;color:${st.color};font-weight:700;white-space:nowrap">${st.label}</span>
            ${dueHtml}
          </div>

          <!-- Row 4: items preview -->
          ${items.length ? `<div style="font-size:10px;color:var(--text-dim);margin-top:5px;line-height:1.4">${items.slice(0,2).map(i=>i.desc||i.name||'').join(' · ').slice(0,55)}${items.length>2?' +'+( items.length-2):''}</div>` : ''}

          <!-- Row 5: next stage button -->
          ${nextStage ? `<div style="margin-top:8px" onclick="event.stopPropagation()">
            <button onclick="try{window.OrderFlow&&window.OrderFlow.moveStage(${o.id},'${nextStage.id}')}catch(_e){console.warn('[adv]',_e)}"
              style="padding:3px 10px;background:${nextStage.color}18;color:${nextStage.color};border:1px solid ${nextStage.color}40;border-radius:6px;cursor:pointer;font-size:10px;font-weight:700;transition:.15s"
              onmouseover="this.style.background='${nextStage.color}35'" onmouseout="this.style.background='${nextStage.color}18'">
              → ${nextStage.label}
            </button>
          </div>` : ''}
        </div>`;
    }).join('');
  },

  _getNextStage(currentStage) {
    const flow = {
      'accepted': {id:'production',label:'⚙️ Produzione',color:'#f59e0b'},
      'production':{id:'working',  label:'🔧 Lavorazione',color:'#fb923c'},
      'working':   {id:'completed',label:'🏁 Completato',color:'#22c55e'},
      'completed': {id:'delivery', label:'📦 Consegna',  color:'#0ea5e9'},
      'delivery':  {id:'delivered',label:'🚚 Consegnato',color:'#64748b'},
      'delivered': {id:'to_pay',   label:'💶 Da Pagare',color:'#ef4444'},
      'to_pay':    {id:'paid',     label:'💰 Pagato',    color:'#16a34a'},
    };
    return flow[currentStage] || null;
  },

  async _advanceStage(orderId, newStage) {
    try {
      await OrderFlow.moveStage(orderId, newStage);
    } catch(e) {
      const o = await IDB.get('orders', orderId).catch(()=>null);
      if (!o) return;
      o.stage = newStage; o.updatedAt = new Date().toISOString();
      await IDB.put('orders', o);
      toast(`✅ → ${newStage}`);
      await this.render();
    }
  },

  // ── Kanban (via OrderFlow) ───────────────────────────────────────────────
  async _renderKanban(orders) {
    // v3.3: delegate to full board render (replaces old (typeof OrderFlow!=='undefined'&&OrderFlow.render()) call)
    const full    = eid('ofe-board-full');
    const compact = eid('ofe-board-compact');
    if (!full && !compact) {
      // Fallback: try legacy OrderFlow if available
      if (typeof OrderFlow !== 'undefined') {
        try { await (typeof OrderFlow!=='undefined'&&OrderFlow.render()); } catch(e) { console.warn('[PipelineOS] OrderFlow fallback:', e); }
      }
      return;
    }
    // Delegate to the full implementation
    await this._renderKanbanFull(orders);
  },

  // ── Produzione view (detailed 4-column) ─────────────────────────────────
  _renderProduzione(orders) {
    const stages = ['accepted','working','completed','paused'];
    const labels = {
      accepted:'⚙️ Da Avviare',working:'🔧 In Lavorazione',
      completed:'🏁 Completati',paused:'⏸️ In Pausa / ⚡ Urgenti'
    };

    stages.forEach(stage => {
      const el = document.getElementById(`prod-list-${stage}`);
      const badge = document.getElementById(`prod-badge-${stage}`);
      if (!el) return;

      let list = orders.filter(o => {
        if (stage === 'paused') return o.stage === 'paused' || (o.dueDate && new Date(o.dueDate) < new Date() && ['production','working'].includes(o.stage));
        return o.stage === stage;
      });
      list.sort((a,b)=>new Date(a.dueDate||'9999')-new Date(b.dueDate||'9999'));
      if (badge) badge.textContent = list.length;

      if (!list.length) {
        el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:11px">
          Nessun ordine</div>`;
        return;
      }

      const st = this.stageById(stage);
      el.innerHTML = list.map(o => {
        const isOverdue = o.dueDate && new Date(o.dueDate) < new Date();
        const items = (o.items||[]).slice(0,3);
        return `<div onclick="try{OrderFlow.openDetail(${o.id})}catch(e){}"
          style="background:var(--bg-card);border:1px solid var(--border);border-radius:9px;padding:10px 12px;margin-bottom:6px;cursor:pointer;${isOverdue?'border-color:#ef444460':''}transition:.12s"
          onmouseover="this.style.borderColor='var(--primary-border)'" onmouseout="this.style.borderColor='${isOverdue?'#ef444460':'var(--border)'}'"
          >
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
            <div style="font-size:12px;font-weight:700;color:var(--text);flex:1">${isOverdue?'⚠️ ':''}${o.clientName||o.name||'—'}</div>
            <div style="font-size:12px;font-weight:900;color:${st.color};flex-shrink:0">${fmtCur(o.total||o.value||0)}</div>
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:6px">${o.name||o.orderNum||'—'}</div>
          ${items.length?`<div style="display:flex;flex-direction:column;gap:2px;margin-bottom:6px">
            ${items.map(i=>`<div style="font-size:10px;color:var(--text-muted);display:flex;gap:4px"><span style="color:var(--text)">•</span>${i.desc||i.name||'—'} × ${i.qty||1}</div>`).join('')}
          </div>`:''}
          <div style="display:flex;justify-content:space-between;align-items:center">
            ${o.dueDate?`<span style="font-size:10px;color:${isOverdue?'#ef4444':'var(--text-muted)'}">📅 ${new Date(o.dueDate).toLocaleDateString('it-IT')}</span>`:'<span></span>'}
            <div style="display:flex;gap:4px">
              ${this._getNextStage(o.stage)?`<button onclick="event.stopPropagation();PipelineOS._advanceStage(${o.id},'${this._getNextStage(o.stage)?.id}')"
                style="font-size:10px;padding:3px 8px;background:${this._getNextStage(o.stage)?.color}20;border:1px solid ${this._getNextStage(o.stage)?.color}40;border-radius:5px;color:${this._getNextStage(o.stage)?.color};cursor:pointer">→ Avanza</button>`:''}
            </div>
          </div>
        </div>`;
      }).join('');
    });

    // Timeline scadenze
    const tlEl = document.getElementById('prod-timeline');
    if (tlEl) {
      const active = orders.filter(o=>o.dueDate&&!['paid','rejected'].includes(o.stage));
      const sorted = active.sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate));
      const next30 = sorted.filter(o=>new Date(o.dueDate)<=new Date(Date.now()+30*86400000));
      if (!next30.length) {
        tlEl.innerHTML = `<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:16px">Nessuna scadenza nei prossimi 30 giorni</div>`;
      } else {
        tlEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:6px">
          ${next30.map(o=>{
            const st = this.stageById(o.stage);
            const d = new Date(o.dueDate);
            const diff = Math.ceil((d-new Date())/86400000);
            const isOverdue = diff < 0;
            return `<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;background:var(--bg-card);border-radius:8px;border-left:3px solid ${isOverdue?'#ef4444':st.color}">
              <div style="width:42px;text-align:center;flex-shrink:0">
                <div style="font-size:14px;font-weight:900;color:${isOverdue?'#ef4444':st.color}">${isOverdue?'⚠️':diff}</div>
                <div style="font-size:9px;color:var(--text-muted)">${isOverdue?'giorni':'giorni'}</div>
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:700;color:var(--text)">${o.clientName||o.name||'—'}</div>
                <div style="font-size:10px;color:var(--text-muted)">${d.toLocaleDateString('it-IT')} · ${o.name||o.orderNum||''}</div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-size:11px;font-weight:800;color:${st.color}">${fmtCur(o.total||o.value||0)}</div>
                <span style="font-size:9px;background:${st.color}20;color:${st.color};border-radius:4px;padding:1px 5px">${st.label}</span>
              </div>
            </div>`;
          }).join('')}
        </div>`;
      }
    }
  },

  filterStage(f) {
    this._filter = f;
    this._stageFilter = f;
    this._filterStageUI(f);
    try { OrderFlow.filterByStage(f === 'all' ? 'all' : f); } catch(e) {}
  },

  _filterStageUI(f) {
    document.querySelectorAll('.pos-chip').forEach(c => {
      const on = c.dataset.f === f;
      Object.assign(c.style, {
        background:  on ? 'var(--primary)' : 'transparent',
        borderColor: on ? 'var(--primary)' : 'var(--border)',
        color:       on ? '#000'           : 'var(--text-muted)',
        fontWeight:  on ? '700'            : '500',
      });
    });
  },

  // ── Pagamenti ────────────────────────────────────────────────────────────
  _renderPagamenti(orders, sales) {
    const el = document.getElementById('pos-pagamenti');
    if (!el) return;

    const toPay   = orders.filter(o=>o.stage==='to_pay');
    const deposit = orders.filter(o=>o.stage==='deposit');
    const paid    = orders.filter(o=>o.stage==='paid');
    const pendInv = sales.filter(s=>s.status==='da_pagare');

    const calcIVA = (items, getAmount) => {
      const tot = items.reduce((a,x)=>a+getAmount(x),0);
      return { tot, tax: items.reduce((a,x)=>a+(+x.tax||+x.vatAmount||tot*0.22),0), net: tot };
    };

    const toPayTot  = calcIVA(toPay, o=>+o.total||+o.value||0);
    const depTot    = calcIVA(deposit, o=>+o.total||+o.value||0);
    const pendInvTot= pendInv.reduce((a,s)=>a+(+s.amount||0),0);
    const paidTot   = paid.reduce((a,o)=>a+(+o.total||+o.value||0),0);
    const totalDa   = toPayTot.tot + depTot.tot + pendInvTot;

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <div style="font-size:14px;font-weight:800;color:var(--text)">💰 Riepilogo Pagamenti</div>
        <div style="background:#ef444420;border:1px solid #ef444440;border-radius:10px;padding:8px 16px;text-align:center">
          <div style="font-size:10px;color:#ef4444;font-weight:700;text-transform:uppercase">Da Riscuotere Totale</div>
          <div style="font-size:24px;font-weight:900;color:#ef4444">${fmtCur(totalDa)}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-bottom:20px">
        ${[
          {label:'💶 Da Pagare (Ordini)', items:toPay, color:'#ef4444', fn:o=>+o.total||+o.value||0},
          {label:'💳 Acconti Ricevuti',  items:deposit,color:'#f97316', fn:o=>+o.total||+o.value||0},
          {label:'📄 Fatture Pending',    items:pendInv,color:'#6366f1', fn:s=>+s.amount||0},
        ].map(sec => {
          const tot = sec.items.reduce((a,x)=>a+sec.fn(x),0);
          return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;border-top:3px solid ${sec.color};padding:14px">
            <div style="font-size:11px;font-weight:700;color:${sec.color};margin-bottom:10px">${sec.label}</div>
            <div style="font-size:20px;font-weight:900;color:var(--text);margin-bottom:10px">${fmtCur(tot)}</div>
            ${sec.items.slice(0,5).map(x => `<div onclick="try{OrderFlow.openDetail(${x.id})}catch(e){}"
              style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border2,var(--border));cursor:pointer;font-size:11px">
              <span style="color:var(--text)">${x.clientName||x.name||'—'}</span>
              <span style="font-weight:700;color:${sec.color}">${fmtCur(sec.fn(x))}</span>
            </div>`).join('')}
            ${sec.items.length>5?`<div style="font-size:10px;color:var(--text-muted);margin-top:6px">+${sec.items.length-5} altri</div>`:''}
          </div>`;
        }).join('')}
      </div>

      ${paid.length?`
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;border-top:3px solid #22c55e;padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:#22c55e">✅ Pagati (${paid.length})</div>
          <div style="font-size:16px;font-weight:900;color:#22c55e">${fmtCur(paidTot)}</div>
        </div>
        ${paid.slice(0,5).map(o=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border2,var(--border));font-size:11px">
          <span style="color:var(--text-muted)">${o.clientName||'—'} <span style="color:var(--text-dim)">${new Date(o.updatedAt||o.paidAt||0).toLocaleDateString('it-IT')}</span></span>
          <span style="font-weight:700;color:#22c55e">${fmtCur(o.total||o.value||0)}</span>
        </div>`).join('')}
      </div>`:''}`
  },

  // ── Timeline scadenze 7gg ────────────────────────────────────────────────
  _renderTimeline(orders) {
    const el = eid('pos-timeline');
    if (!el) return;
    const now = new Date();
    const in7 = new Date(now.getTime() + 7*86400000);
    const upcoming = orders
      .filter(o => o.dueDate && !['paid','rejected'].includes(o.stage))
      .map(o => ({ ...o, _due: new Date(o.dueDate) }))
      .filter(o => o._due <= in7)
      .sort((a,b) => a._due - b._due);

    if (!upcoming.length) {
      el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-dim);font-size:12px"><i class="fas fa-calendar-check" style="font-size:18px;display:block;margin-bottom:6px;opacity:.3"></i>Nessuna scadenza nei prossimi 7 giorni</div>';
      return;
    }
    el.innerHTML = upcoming.map(o => {
      const isOv = o._due < now;
      const days = Math.ceil((o._due - now) / 86400000);
      const col  = isOv ? '#ef4444' : days <= 2 ? '#f59e0b' : '#22c55e';
      const lbl  = isOv ? `Scaduto da ${Math.abs(days)}g` : days === 0 ? 'Oggi!' : days === 1 ? 'Domani' : `${days}g`;
      const st   = this.stageById(o.stage);
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:var(--bg-card2);border-left:3px solid ${col};margin-bottom:5px;cursor:pointer"
        onclick="try{OrderFlow.openDetail(${o.id})}catch(e){}">
        <div style="font-size:11px;font-weight:800;color:${col};min-width:60px">${lbl}</div>
        <div style="flex:1;font-size:12px;font-weight:600;color:var(--text)">${o.clientName||o.name||'Ordine #'+o.id}</div>
        <div style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:${st.color}20;color:${st.color}">${st.label}</div>
        <div style="font-size:12px;font-weight:700;color:var(--green)">${fmtCur(o.total||o.value||0)}</div>
      </div>`;
    }).join('');
  },

  // ── Kanban board (full + compact) ─────────────────────────────────────────
  async _renderKanbanFull(orders) {
    const full    = eid('ofe-board-full');
    const compact = eid('ofe-board-compact');
    if (!full && !compact) return;

    const filter = this._stageFilter || 'all';
    const stageGroups = {
      pre_prod:   ['draft','sent','accepted'],
      production: ['production','working','completed','delivery'],
      payments:   ['delivered','deposit','to_pay','paid'],
    };
    const visibleStages = filter === 'all'
      ? this.STAGES.map(s => s.id)
      : (stageGroups[filter] || this.STAGES.map(s => s.id));

    const renderBoard = (el, stages, compact) => {
      if (!el) return;
      el.innerHTML = stages.map(sid => {
        const st      = this.stageById(sid);
        const colOrds = orders.filter(o => (o.stage||'draft') === sid);
        const w       = compact ? '160px' : '200px';
        const cardH   = compact ? '80px' : 'auto';
        return `<div style="flex-shrink:0;width:${w}">
          <div style="background:${st.color}18;border:1.5px solid ${st.color}35;border-radius:10px 10px 0 0;padding:8px 10px;border-bottom:2px solid ${st.color}50">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div style="font-size:11px;font-weight:800;color:${st.color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${st.label}</div>
              <span style="background:${st.color}30;color:${st.color};border-radius:99px;padding:1px 7px;font-size:10px;font-weight:700;flex-shrink:0;margin-left:4px">${colOrds.length}</span>
            </div>
          </div>
          <div style="background:var(--bg-card);border:1.5px solid ${st.color}20;border-top:none;border-radius:0 0 10px 10px;padding:6px;min-height:100px;display:flex;flex-direction:column;gap:5px">
            ${colOrds.slice(0, compact ? 3 : 99).map(o => {
              const isOv = o.dueDate && new Date(o.dueDate) < new Date() && sid !== 'paid';
              return `<div onclick="try{OrderFlow.openDetail(${o.id})}catch(e){}"
                style="background:var(--bg-card2);border-radius:7px;padding:${compact?'6px 8px':'8px 10px'};cursor:pointer;border-left:2.5px solid ${isOv?'#ef4444':st.color};transition:.12s"
                onmouseover="this.style.background='var(--bg-card3)'" onmouseout="this.style.background='var(--bg-card2)'">
                <div style="font-size:${compact?'10':'11'}px;font-weight:700;color:var(--text);line-height:1.2;margin-bottom:${compact?'0':'3'}px">${(o.clientName||o.name||'#'+o.id).slice(0,compact?18:22)}</div>
                ${!compact&&(o.total||o.value)?'<div style="font-size:10px;color:var(--green);font-weight:700">'+fmtCur(o.total||o.value)+'</div>':''}
                ${isOv?'<div style="font-size:9px;color:#ef4444;font-weight:700">⚠️ Scaduto</div>':''}
              </div>`;
            }).join('')}
            ${colOrds.length > 3 && compact ? `<div style="text-align:center;font-size:10px;color:var(--text-dim);padding:3px">+${colOrds.length-3} altri</div>` : ''}
            ${!colOrds.length ? '<div style="text-align:center;padding:12px 6px;color:var(--text-dim);font-size:10px;opacity:.6">vuoto</div>' : ''}
          </div>
        </div>`;
      }).join('');
    };

    renderBoard(full, visibleStages, false);
    renderBoard(compact, ['draft','sent','accepted','production','working','completed','delivery','to_pay','paid'], true);
  },

  // ── Pay summary cards ─────────────────────────────────────────────────────
  _renderPaySummary(orders, sales) {
    const el = eid('pos-pay-summary');
    if (!el) return;
    const toPay   = orders.filter(o=>o.stage==='to_pay').reduce((a,o)=>a+(+o.total||+o.value||0),0);
    const deposit = orders.filter(o=>o.stage==='deposit').reduce((a,o)=>a+(+o.total||+o.value||0),0);
    const pendInv = sales.filter(s=>s.status==='da_pagare').reduce((a,s)=>a+(+s.amount||0),0);
    const now = new Date();
    const paidM = orders.filter(o=>{
      if(o.stage!=='paid') return false;
      const d = new Date(o.updatedAt||o.paidAt||0);
      return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    }).reduce((a,o)=>a+(+o.total||+o.value||0),0);

    el.innerHTML = [
      {ico:'fa-hourglass-half', label:'Da Incassare',  val:fmtCur(toPay),   color:'#ef4444', bg:'#ef444415'},
      {ico:'fa-hand-holding-usd',label:'Acconti att.',  val:fmtCur(deposit), color:'#f97316', bg:'#f9731615'},
      {ico:'fa-file-invoice',   label:'Fatture pend.', val:fmtCur(pendInv), color:'#f59e0b', bg:'#f59e0b15'},
      {ico:'fa-check-double',   label:'Incassato/mese',val:fmtCur(paidM),   color:'#22c55e', bg:'#22c55e15'},
    ].map(k=>`<div class="kpi-card" style="padding:14px 16px;position:relative;overflow:hidden">
      <div style="position:absolute;top:12px;right:12px;width:28px;height:28px;background:${k.bg};border-radius:7px;display:flex;align-items:center;justify-content:center">
        <i class="fas ${k.ico}" style="font-size:12px;color:${k.color}"></i>
      </div>
      <div style="font-size:18px;font-weight:900;color:${k.color};line-height:1;margin-bottom:3px">${k.val}</div>
      <div style="font-size:11px;color:var(--text-muted)">${k.label}</div>
    </div>`).join('');
  },


  // ════════════════════════════════════════════════════════════════════════
  // openCreate — NUOVO ORDINE / PREVENTIVO RAPIDO con multi-catalogo
  // ════════════════════════════════════════════════════════════════════════

  async _renderCalendar(orders) {
    const el = document.getElementById('pos-calendar-content');
    if(!el) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const monthName = now.toLocaleDateString('it-IT', {month:'long', year:'numeric'});

    // Build events map: date → orders
    const events = {};
    (orders||[]).forEach(o => {
      if(!o.dueDate) return;
      const d = o.dueDate.slice(0,10);
      if(!events[d]) events[d] = [];
      events[d].push(o);
    });

    const todayStr = now.toISOString().slice(0,10);

    // Build calendar grid
    let cells = '';
    const dayNames = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
    // ISO: week starts Monday (adjust firstDay: 0=Sun→6, 1=Mon→0, ...)
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    for(let d=1; d<=daysInMonth; d++){
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = dateStr === todayStr;
      const dayEvents = events[dateStr] || [];
      const overdueCount = dayEvents.filter(o=>!new Set(['paid','delivered','sold','invoiced','completed','rejected','cancelled','archived']).has(o.stage||'') && !o._archived).length;

      cells += `<div style="
        min-height:72px;padding:6px 8px;border-radius:8px;cursor:default;
        background:${isToday?'var(--primary-dim)':'var(--bg-card2)'};
        border:1.5px solid ${isToday?'var(--primary)':'var(--border)'};
        position:relative;
        ${d===1?`grid-column:${offset+1}`:''}">
        <div style="font-size:12px;font-weight:${isToday?'900':'700'};color:${isToday?'var(--primary)':'var(--text)'};">${d}</div>
        ${dayEvents.slice(0,3).map(o=>{
          const st = this.stageById(o.stage);
          return `<div onclick="try{window.OrderFlow&&window.OrderFlow.openDetail(${o.id})}catch(_e){}"
            style="font-size:9px;padding:2px 5px;margin-top:2px;border-radius:4px;
            background:${st?.color||'#6366f1'}22;color:${st?.color||'#6366f1'};
            font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer"
            title="${o.name||'Ordine'} — ${o.clientName||''}">${o.name?.slice(0,18)||'Ordine #'+o.id}</div>`;
        }).join('')}
        ${dayEvents.length>3?`<div style="font-size:9px;color:var(--text-muted);margin-top:2px">+${dayEvents.length-3} altri</div>`:''}
      </div>`;
    }

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="font-size:18px;font-weight:800;color:var(--text);text-transform:capitalize">${monthName}</div>
        <div style="display:flex;gap:6px;font-size:11px">
          <span style="padding:3px 10px;background:var(--primary-dim);color:var(--primary);border-radius:99px;font-weight:700">${Object.values(events).flat().length} scadenze</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px">
        ${dayNames.map(d=>`<div style="text-align:center;font-size:10px;font-weight:700;color:var(--text-muted);padding:4px">${d}</div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
        ${cells}
      </div>
      <div style="margin-top:14px;font-size:11px;color:var(--text-muted)">
        Clicca su un lavoro per aprire il dettaglio.
      </div>`;
  },

  async openCreate() {
    const [clients, catalog] = await Promise.all([
      IDB.getAll('clients').catch(()=>[]),
      IDB.getAll('catalog').catch(()=>[]),
    ]);

    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
    document.body.appendChild(ov);

    ov.innerHTML = `
    <div style="background:var(--bg-card);border-radius:16px;width:760px;max-width:98vw;max-height:95vh;display:flex;flex-direction:column;overflow:hidden">

      <!-- HEADER -->
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;flex-shrink:0">
        <div style="width:38px;height:38px;background:#6366f120;border-radius:10px;display:flex;align-items:center;justify-content:center">
          <i class="fas fa-file-invoice-dollar" style="color:#a5b4fc;font-size:16px"></i>
        </div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:800;color:var(--text)">Nuovo Ordine / Preventivo</div>
          <div style="font-size:11px;color:var(--text-muted)">Aggiungi uno o più prodotti dal catalogo o manualmente</div>
        </div>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:var(--bg-card2);border:1px solid var(--border);color:var(--text);border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:16px">✕</button>
      </div>

      <!-- BODY -->
      <div style="overflow-y:auto;padding:18px 22px;flex:1;display:grid;gap:14px">

        <!-- Cliente + Titolo + Scadenza -->
        <div style="display:grid;grid-template-columns:1fr 1fr 160px;gap:10px">
          <div>
            <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">CLIENTE</label>
            <div style="display:flex;gap:6px">
              <input id="qr-client-name" class="form-control" placeholder="Seleziona o digita..." readonly style="flex:1;font-size:13px;cursor:pointer">
              <input type="hidden" id="qr-client-id">
              <button onclick="PipelineOS.openClientPicker(c=>{ document.getElementById('qr-client-name').value=c.name; document.getElementById('qr-client-id').value=c.id; })"
                style="padding:7px 10px;background:#6366f115;border:1px solid #6366f130;border-radius:7px;color:#a5b4fc;cursor:pointer;font-size:11px">👤</button>
            </div>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">TITOLO LAVORO *</label>
            <input id="qr-title" class="form-control" placeholder="Es: Targa personalizzata" style="font-size:13px">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">SCADENZA</label>
            <input id="qr-due" type="date" class="form-control" style="font-size:13px">
          </div>
        </div>

        <!-- IVA + Priorità + Note -->
        <div style="display:grid;grid-template-columns:160px 160px 1fr;gap:10px">
          <div>
            <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">REGIME IVA</label>
            <select id="qr-iva-2" class="form-control" onchange="PipelineOS._recalc()" style="font-size:13px">
              <option value="22">IVA 22%</option>
              <option value="10">IVA 10%</option>
              <option value="4">IVA 4%</option>
              <option value="0">Esente / Forfettario</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">PRIORITÀ</label>
            <select id="qr-priority" class="form-control" style="font-size:13px">
              <option value="alta">🔴 Alta</option>
              <option value="media" selected>🟡 Media</option>
              <option value="bassa">🟢 Bassa</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">NOTE</label>
            <input id="qr-notes" class="form-control" placeholder="Note per il cliente..." style="font-size:13px">
          </div>
        </div>

        <!-- PRODOTTI / VOCI -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Prodotti & Voci</label>
            <div style="display:flex;gap:6px">
              <button onclick="PipelineOS._openCatalogPicker()"
                style="padding:6px 12px;background:#6366f120;border:1px solid #6366f140;border-radius:7px;color:#a5b4fc;cursor:pointer;font-size:11px;font-weight:700">
                <i class="fas fa-store"></i> + Da Catalogo
              </button>
              <button onclick="PipelineOS._addLine()"
                style="padding:6px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text-muted);cursor:pointer;font-size:11px">
                + Voce Manuale
              </button>
            </div>
          </div>

          <!-- Header colonne -->
          <div style="display:grid;grid-template-columns:1fr 80px 90px 50px 65px 72px 28px;gap:5px;margin-bottom:5px;padding:0 4px">
            ${['Descrizione','Costo Acq.','Prezzo Vend.','Qtà','IVA','Totale',''].map(h=>`<div style="font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">${h}</div>`).join('')}
          </div>

          <div id="qr-lines" style="display:grid;gap:4px;min-height:44px"></div>
          <div id="qr-lines-empty" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;border:1px dashed var(--border);border-radius:8px;margin-top:4px">
            ↑ Aggiungi prodotti dal <strong>Catalogo</strong> o voci manuali
          </div>
        </div>

        <!-- TOTALI -->
        <div id="qr-totali" style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:14px">
          <div style="font-size:12px;color:var(--text-muted);text-align:center">Aggiungi voci per vedere il totale</div>
        </div>
      </div>

      <!-- FOOTER -->
      <div style="padding:14px 22px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
        <div style="display:flex;gap:6px">
          <button onclick="PipelineOS.openTemplatePicker()" style="padding:9px 14px;background:#6366f115;border:1px solid #6366f130;border-radius:8px;color:#a5b4fc;cursor:pointer;font-size:11px">📋 Template</button>
          <button onclick="App.navigate('quoter')" style="padding:9px 14px;background:transparent;border:1px solid var(--border);border-radius:8px;color:var(--text-muted);cursor:pointer;font-size:11px">🧮 Smart Quoter</button>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="this.closest('[style*=fixed]').remove()" style="padding:9px 18px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;font-size:13px">Annulla</button>
          <button onclick="PipelineOS._saveQuick(this,'draft')" style="padding:9px 18px;background:#6366f120;border:1px solid #6366f140;border-radius:8px;color:#a5b4fc;cursor:pointer;font-size:13px;font-weight:700">Salva Preventivo</button>
          <button onclick="PipelineOS._saveQuick(this,'production')" style="padding:9px 24px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:800">⚙️ Manda in Produzione</button>
        </div>
      </div>
    </div>`;

    this._qrLines = [];
    this._discount = 0;
    this._catalog = catalog;
    this._clients = clients;
    this._updateLinesUI();
    setTimeout(()=>document.getElementById('qr-title')?.focus(), 100);
  },

  // ── Salva ordine/preventivo dalla finestra openCreate ────────────────────
  async _saveQuick(btn, mode) {
    try {
      const title = document.getElementById('qr-title')?.value?.trim();
      if (!title) { toast('\u26a0\ufe0f Inserisci un titolo per il lavoro', 'warning'); document.getElementById('qr-title')?.focus(); return; }
      if (!this._qrLines || !this._qrLines.length) { toast('\u26a0\ufe0f Aggiungi almeno una voce', 'warning'); return; }

      if (btn) { btn.disabled = true; btn.textContent = '\u23f3 Salvataggio...'; }

      const clientName = document.getElementById('qr-client-name')?.value?.trim() || '';
      const clientId   = +document.getElementById('qr-client-id')?.value || null;
      const dueDate    = document.getElementById('qr-due')?.value || '';
      const notes      = document.getElementById('qr-notes')?.value?.trim() || '';
      const ivaPct     = +(document.getElementById('qr-iva-2')?.value ?? 22);
      const priority   = document.getElementById('qr-priority')?.value || 'media';

      const imponibile = this._qrLines.reduce((a,l)=>a+(+l.price||0)*(+l.qty||1), 0);
      const ivaAmt     = this._qrLines.reduce((a,l)=>a+(+l.price||0)*(+l.qty||1)*(l.vatRate!=null?l.vatRate:ivaPct/100), 0);
      const subtotal   = +(imponibile + ivaAmt).toFixed(2);
      const disc       = this._discount || 0;
      const total      = +(subtotal * (1 - disc/100)).toFixed(2);

      const stage = mode === 'production' ? 'production' : 'draft';
      const now   = new Date().toISOString();
      const id    = Date.now();

      const order = {
        id,
        name:        title,
        clientId,
        client:      clientName,
        clientName,
        dueDate,
        priority,
        value:       total,
        total,
        imponibile,
        iva:         ivaAmt,
        discount:    disc,
        desc:        notes,
        items:       this._qrLines.map(l=>({
          desc:    l.desc,
          qty:     l.qty||1,
          price:   l.price||0,
          cost:    l.cost||0,
          vatRate: l.vatRate!=null?l.vatRate:0.22,
          total:   (l.price||0)*(l.qty||1),
          emoji:   l.emoji||'',
        })),
        status:      stage,
        stage,
        createdAt:   now,
        updatedAt:   now,
      };

      await IDB.put('orders', order).catch(e=>{ throw new Error('Errore IDB orders: '+e.message); });
      AppStore.invalidate('orders');

      // Sync pipeline store
      const plId = id + 1;
      await IDB.put('pipeline', { ...order, _source:'orders', _sourceId:id, id:plId }).catch(()=>{});
      AppStore.invalidate('pipeline');

      if(typeof logAction !== 'undefined') await logAction('order', id, 'created_quick', { total, stage }).catch(()=>{});
      if(typeof Bus !== 'undefined') Bus.emit('order:created', { id });

      // Close overlay — search up the DOM tree from button
      let _ov = btn ? btn.closest('[style*="position:fixed"]') : null;
      if (!_ov) _ov = document.querySelector('[style*="z-index: 10000"], [style*="z-index:10000"]');
      if (_ov) { _ov.style.opacity='0'; setTimeout(()=>_ov.remove(), 150); }

      this._qrLines  = [];
      this._discount = 0;

      const label = mode === 'production' ? '⚙️ Ordine mandato in produzione!' : '📝 Preventivo salvato!';
      toast(label, 'success');

      AppStore.invalidate('orders');
      AppStore.invalidate('pipeline');
      if (typeof BDW !== 'undefined') BDW.touch('orders');
      await this.render();

    } catch(err) {
      console.error('[PipelineOS._saveQuick]', err);
      toast('\u274c Errore salvataggio: ' + (err.message||err), 'error');
      if (btn) { btn.disabled = false; btn.textContent = mode==='production' ? '\u2699\ufe0f Manda in Produzione' : 'Salva Preventivo'; }
    }
  },

  // ── Multi-select Catalog Picker ──────────────────────────────────────────
  _openCatalogPicker() {
    const catalog = this._catalog || [];
    if (!catalog.length) { toast('Catalogo vuoto — aggiungi prodotti prima','warning'); return; }

    const pick = document.createElement('div');
    pick.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px';
    pick.id = 'catalog-picker-overlay';
    document.body.appendChild(pick);

    // Track selections: { id: {product, qty} }
    const sel = {};

    const render = () => {
      const search = document.getElementById('cp-search')?.value?.toLowerCase()||'';
      const filtered = catalog.filter(p => !search ||
        (p.name||'').toLowerCase().includes(search) ||
        (p.category||'').toLowerCase().includes(search));
      const cartCount = Object.values(sel).reduce((a,x)=>a+x.qty,0);
      const cartTotal = Object.values(sel).reduce((a,x)=>a+(x.product.salePrice||x.product.costPrice||0)*x.qty,0);

      document.getElementById('cp-grid').innerHTML = filtered.map(p => {
        const s = sel[p.id];
        const selected = !!s;
        return `<div data-id="${p.id}"
          style="background:var(--bg-card);border:1.5px solid ${selected?'var(--primary)':'var(--border)'};border-radius:10px;padding:10px;cursor:pointer;transition:.12s;position:relative"
          onclick="PipelineOS._cpToggle(${p.id})"
          onmouseover="this.style.borderColor='var(--primary-border)'"
          onmouseout="this.style.borderColor='${selected?'var(--primary)':'var(--border)'}'">
          ${selected?`<div style="position:absolute;top:6px;right:6px;width:18px;height:18px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#000">${s.qty}</div>`:''}
          <div style="font-size:22px;margin-bottom:6px">${p.emoji||'📦'}</div>
          <div style="font-size:11px;font-weight:700;color:var(--text);line-height:1.3;margin-bottom:3px">${p.name||'—'}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">${p.category||''}</div>
          <div style="font-size:12px;font-weight:800;color:var(--primary)">${fmtCur(p.salePrice||p.costPrice||0)}</div>
          ${p.costPrice&&p.salePrice?`<div style="font-size:9px;color:var(--text-dim)">costo ${fmtCur(costPrice_)}</div>`:''}
        </div>`;
      }).join('');

      const confirmBtn = document.getElementById('cp-confirm');
      if (confirmBtn) {
        confirmBtn.textContent = cartCount > 0 ? `✅ Aggiungi ${cartCount} prodott${cartCount===1?'o':'i'} (${fmtCur(cartTotal)})` : 'Seleziona prodotti';
        confirmBtn.disabled = cartCount === 0;
        confirmBtn.style.opacity = cartCount > 0 ? '1' : '0.5';
      }

      const cartEl = document.getElementById('cp-cart-summary');
      if (cartEl && cartCount > 0) {
        cartEl.style.display = '';
        cartEl.innerHTML = Object.values(sel).map(({product:p,qty}) =>
          `<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:var(--bg-card2);border-radius:6px;font-size:11px">
            <span>${p.emoji||'📦'}</span>
            <span style="flex:1;color:var(--text)">${p.name}</span>
            <div style="display:flex;align-items:center;gap:4px">
              <button onclick="PipelineOS._cpQty(${p.id},-1)" style="width:18px;height:18px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:11px;color:var(--text)">−</button>
              <span style="font-weight:700;min-width:16px;text-align:center">${qty}</span>
              <button onclick="PipelineOS._cpQty(${p.id},1)" style="width:18px;height:18px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:11px;color:var(--text)">+</button>
            </div>
            <span style="color:var(--primary);font-weight:700">${fmtCur((p.salePrice||p.costPrice||0)*qty)}</span>
          </div>`
        ).join('');
      } else if (cartEl) {
        cartEl.style.display = 'none';
      }
    };

    // Expose helpers to window for inline events
    window._cpSel = sel;
    window._cpRender = render;
    PipelineOS._cpSel = sel;
    PipelineOS._cpRender = render;

    pick.innerHTML = `
      <div style="background:var(--bg-card);border-radius:16px;width:680px;max-width:98vw;max-height:90vh;display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center;flex-shrink:0">
          <div style="font-size:15px;font-weight:800;color:var(--text);flex:1">🏪 Seleziona Prodotti dal Catalogo</div>
          <input id="cp-search" class="form-control" placeholder="🔍 Cerca..." style="width:180px;font-size:12px"
            oninput="PipelineOS._cpRender()">
          <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px">✕</button>
        </div>
        <!-- Cart summary -->
        <div id="cp-cart-summary" style="display:none;padding:8px 14px;background:#6366f108;border-bottom:1px solid #6366f120;display:flex;flex-direction:column;gap:4px"></div>
        <!-- Grid -->
        <div id="cp-grid" style="overflow-y:auto;padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;flex:1"></div>
        <div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;flex-shrink:0">
          <button onclick="document.getElementById('catalog-picker-overlay').remove()" style="padding:9px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--text);font-size:12px">Annulla</button>
          <button id="cp-confirm" onclick="PipelineOS._cpConfirm()" disabled
            style="padding:9px 20px;background:var(--primary);border:none;border-radius:8px;cursor:pointer;color:#000;font-size:12px;font-weight:800">Seleziona prodotti</button>
        </div>
      </div>`;

    render();
  },

  _cpToggle(productId) {
    const sel = this._cpSel;
    if (!sel) return;
    const p = this._catalog.find(x=>x.id==productId);
    if (!p) return;
    if (sel[productId]) {
      delete sel[productId];
    } else {
      sel[productId] = { product: p, qty: 1 };
    }
    if (this._cpRender) this._cpRender();
  },

  _cpQty(productId, delta) {
    const sel = this._cpSel;
    if (!sel || !sel[productId]) return;
    sel[productId].qty = Math.max(1, sel[productId].qty + delta);
    if (this._cpRender) this._cpRender();
  },

  _cpConfirm() {
    const sel = this._cpSel;
    if (!sel) return;
    Object.values(sel).forEach(({product:p, qty}) => {
      this._addLine({
        desc:     p.name,
        cost:     p.costPrice || 0,
        price:    p.salePrice || p.costPrice || 0,
        qty,
        vatRate:  p.vatRate !== undefined ? p.vatRate : 0.22,
        catalogId: p.id,
        emoji:    p.emoji || '📦',
      });
    });
    document.getElementById('catalog-picker-overlay')?.remove();
    this._cpSel = {};
  },

  // ── Line management ──────────────────────────────────────────────────────
  _addLine(data={}) {
    this._qrLines.push({
      id:      Date.now() + Math.random(),
      desc:    data.desc    || data.name     || '',
      cost:    data.cost    || data.costPrice || 0,
      price:   data.price   || data.salePrice || data.costPrice || 0,
      qty:     data.qty     || 1,
      vatRate: data.vatRate !== undefined ? data.vatRate : 0.22,
      emoji:   data.emoji   || '',
    });
    this._updateLinesUI();
  },

  _removeLine(id) {
    this._qrLines = this._qrLines.filter(l => l.id !== id);
    this._updateLinesUI();
  },

  _lineChange(id, field, val) {
    const l = this._qrLines.find(x=>x.id===id);
    if (!l) return;
    l[field] = field==='desc' ? val : parseFloat(val)||0;
    this._updateLinesUI();
  },

  _updateLinesUI() {
    const wrap  = document.getElementById('qr-lines');
    const empty = document.getElementById('qr-lines-empty');
    if (!wrap) return;
    if (!this._qrLines.length) {
      wrap.innerHTML = '';
      if (empty) empty.style.display='';
      this._recalc();
      return;
    }
    if (empty) empty.style.display='none';
    wrap.innerHTML = this._qrLines.map(l => {
      const tot    = (l.price||0) * (l.qty||1);
      const vatPct = Math.round((l.vatRate||0)*100);
      const vatOpts = [
        {v:0.22, lbl:'22%'}, {v:0.10, lbl:'10%'},
        {v:0.04, lbl:'4%'},  {v:0,    lbl:'Esente'},
      ].map(opt=>`<option value="${opt.v}" ${vatPct===Math.round(opt.v*100)?'selected':''}>${opt.lbl}</option>`).join('');
      return `
        <div style="display:grid;grid-template-columns:1fr 80px 90px 50px 65px 72px 28px;gap:5px;align-items:center;background:var(--bg-card2);border-radius:7px;padding:5px 6px">
          <div style="display:flex;align-items:center;gap:5px">
            ${l.emoji?`<span style="font-size:14px">${l.emoji}</span>`:''}
            <input value="${(l.desc||'').replace(/"/g,'&quot;')}" onchange="PipelineOS._lineChange(${l.id},'desc',this.value)"
              placeholder="Descrizione..." class="form-control" style="font-size:12px;padding:5px 7px">
          </div>
          <input value="${l.cost||''}" type="number" step="0.01" min="0" onchange="PipelineOS._lineChange(${l.id},'cost',this.value)"
            placeholder="Costo" class="form-control" style="font-size:11px;padding:5px 5px;text-align:right" title="Costo acquisto">
          <input value="${l.price||''}" type="number" step="0.01" min="0" onchange="PipelineOS._lineChange(${l.id},'price',this.value)"
            placeholder="Prezzo" class="form-control" style="font-size:11px;padding:5px 5px;text-align:right;border-color:var(--primary-border)" title="Prezzo vendita">
          <input value="${l.qty||1}" type="number" step="1" min="1" onchange="PipelineOS._lineChange(${l.id},'qty',this.value)"
            class="form-control" style="font-size:11px;padding:5px 4px;text-align:center" title="Quantità">
          <select onchange="PipelineOS._lineChange(${l.id},'vatRate',+this.value)" title="IVA per questa voce"
            style="padding:5px 3px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:11px">${vatOpts}</select>
          <div style="font-size:12px;font-weight:800;color:var(--primary);text-align:right;padding-right:2px" title="Totale riga">${fmtCur(tot)}</div>
          <button onclick="PipelineOS._removeLine(${l.id})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px;padding:0;line-height:1">✕</button>
        </div>`;
    }).join('');
    this._recalc();
  },

  _recalc() {
    const totEl = document.getElementById('qr-totali');
    if (!totEl || !this._qrLines) return;
    const lines = this._qrLines;
    if (!lines.length) {
      totEl.innerHTML = `<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px">Aggiungi voci per il totale</div>`;
      return;
    }
    const imponibile = lines.reduce((a,l)=>a+(+l.price||0)*(+l.qty||1), 0);
    const ivaPerLine = lines.reduce((a,l)=>a+(+l.price||0)*(+l.qty||1)*(+l.vatRate||0), 0);
    const costoTot   = lines.reduce((a,l)=>a+(+l.cost||0)*(+l.qty||1), 0);
    const totale     = +(imponibile + ivaPerLine).toFixed(2);
    const margine    = imponibile - costoTot;
    const margPct    = costoTot>0 ? Math.round(margine/costoTot*100) : 0;

    totEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px">
        <div style="text-align:center">
          <div style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px">Imponibile</div>
          <div style="font-size:18px;font-weight:900;color:var(--text)">${fmtCur(imponibile)}</div>
        </div>
        <div style="text-align:center;border-left:1px solid var(--border)">
          <div style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px">IVA</div>
          <div style="font-size:18px;font-weight:900;color:${ivaPerLine>0?'var(--text)':'#22c55e'}">${ivaPerLine>0?fmtCur(ivaPerLine):'Esente'}</div>
        </div>
        <div style="text-align:center;border-left:1px solid var(--border)">
          <div style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px">Margine</div>
          <div style="font-size:18px;font-weight:900;color:${margine>0?'#22c55e':'#ef4444'}">${fmtCur(margine)} ${costoTot>0?`<span style="font-size:11px">(${margPct}%)</span>`:''}</div>
        </div>
        <div style="text-align:center;border-left:1px solid var(--border)">
          <div style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px">Totale</div>
          <div style="font-size:22px;font-weight:900;color:var(--primary)">${fmtCur(totale)}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
        <span style="font-size:11px;color:var(--text-muted);font-weight:700">Sconto %</span>
        <input type="number" id="qr-line-discount" min="0" max="100" step="1" value="${PipelineOS._discount||0}"
          oninput="PipelineOS._discount=+this.value;PipelineOS._recalc()"
          style="width:65px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--text);font-size:12px;text-align:center">
        <span style="font-size:11px;color:var(--text-muted)">Totale con sconto:</span>
        <span style="font-size:14px;font-weight:900;color:var(--primary)">${fmtCur(+(totale*(1-(PipelineOS._discount||0)/100)).toFixed(2))}</span>
        ${(PipelineOS._discount||0)>0?`<span style="font-size:10px;color:#ef4444;font-weight:700">-${fmtCur(+(totale*(PipelineOS._discount||0)/100).toFixed(2))}</span>`:''}
      </div>`;
  },

  async openTemplatePicker() {
    const templates = await IDB.getAll('quote_templates').catch(()=>[]);
    if (!templates.length) { toast('Nessun template salvato','warning'); return; }
    const pick = document.createElement('div');
    pick.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px';
    pick.addEventListener('click', e=>{ if(e.target===pick) pick.remove(); });
    document.body.appendChild(pick);
    pick.innerHTML = `
      <div style="background:var(--bg-card);border-radius:14px;width:420px;max-width:96vw;max-height:70vh;display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border);font-weight:800">📋 Scegli Template</div>
        <div style="overflow-y:auto;padding:10px">
          ${templates.map(t=>`<div onclick="PipelineOS._applyTemplate(${JSON.stringify(t).replace(/"/g,'&quot;')});this.closest('[style*=fixed]').remove()"
            style="padding:10px 12px;border-radius:8px;cursor:pointer;border:1px solid var(--border);margin-bottom:6px"
            onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background=''">
            <div style="font-size:12px;font-weight:700">${t.name||'Template'}</div>
            <div style="font-size:10px;color:var(--text-muted)">${(t.lines||[]).length} voci</div>
          </div>`).join('')}
        </div>
      </div>`;
  },

  _applyTemplate(t) {
    (t.lines||[]).forEach(l => this._addLine(l));
  },

  // ── Client form stubs ────────────────────────────────────
  _loadTemplate() { this.openTemplatePicker(); },
  _openNewClientForm() {
    if(typeof Clients!=='undefined') Clients.openModal();
    else toast('Apri sezione CRM Clienti','info');
  },
  _pickClient(cb) { toast('Seleziona cliente dal CRM','info'); },
  _saveNewClient() { if(typeof Clients!=='undefined') Clients.save(); }
};


window.PipelineOS = PipelineOS;


// ═══════════════════════════════════════════════════════════════════════════
// CLIENT PICKER — finestra a scala con tutti i clienti registrati
// ═══════════════════════════════════════════════════════════════════════════
PipelineOS.openClientPicker = async function(onSelect) {
  const clients = await AppStore.get('clients').catch(()=>[]);
  this._clients = clients;
  this._clientPickerCb = onSelect;

  const ov = document.createElement('div');
  ov.id = 'qr-client-picker';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:10500;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px)';
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
  document.body.appendChild(ov);

  const renderList = (filter='') => {
    const q = filter.toLowerCase();
    const list = q ? clients.filter(c=>(c.name||'').toLowerCase().includes(q)||(c.email||'').toLowerCase().includes(q)||(c.phone||c.tel||'').includes(q)) : clients;
    return list.length ? list.map(c=>`
      <div onclick="PipelineOS._pickClient(${c.id})"
        style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;border:1px solid var(--border);background:var(--bg-card);cursor:pointer;transition:all .12s;margin-bottom:6px"
        onmouseover="this.style.borderColor='var(--primary-border)';this.style.background='var(--bg-card2)'"
        onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--bg-card)'">
        <div style="width:38px;height:38px;border-radius:50%;background:${['#6366f1','#f59e0b','#22c55e','#ef4444','#3b82f6'][c.id%5]}20;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;font-weight:700;color:${['#a5b4fc','#fbbf24','#4ade80','#f87171','#60a5fa'][c.id%5]}">
          ${(c.name||'?')[0].toUpperCase()}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:var(--text)">${c.name||'—'}</div>
          <div style="font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${[c.email,c.phone||c.tel,c.city].filter(Boolean).join(' · ')}</div>
        </div>
        <div style="font-size:11px;color:var(--primary);font-weight:600;flex-shrink:0">Seleziona →</div>
      </div>`).join('')
      : `<div style="text-align:center;padding:32px;color:var(--text-muted)">
          <i class="fas fa-search" style="font-size:24px;opacity:.3;display:block;margin-bottom:10px"></i>
          ${q ? 'Nessun cliente trovato' : 'Nessun cliente registrato'}
          <br><button onclick="PipelineOS._openNewClientForm()" class="btn btn-primary btn-sm" style="margin-top:14px"><i class="fas fa-plus"></i> Aggiungi Cliente</button>
        </div>`;
  };

  ov.innerHTML = `
    <div style="background:var(--bg-card);border-radius:16px;width:520px;max-width:96vw;max-height:90vh;display:flex;flex-direction:column;border:1.5px solid var(--border2);overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,.6)">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;background:var(--bg-card2)">
        <i class="fas fa-users" style="color:var(--primary);font-size:16px"></i>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:800;color:var(--text)">Seleziona Cliente</div>
          <div style="font-size:11px;color:var(--text-muted)">${clients.length} clienti registrati</div>
        </div>
        <button onclick="PipelineOS._openNewClientForm()" style="padding:6px 12px;background:#22c55e15;border:1px solid #22c55e40;border-radius:8px;color:#4ade80;font-size:11px;font-weight:700;cursor:pointer"><i class="fas fa-plus"></i> Nuovo</button>
        <button onclick="document.getElementById('qr-client-picker').remove()" style="background:var(--bg-card3);border:none;border-radius:8px;width:28px;height:28px;color:var(--text-muted);cursor:pointer;font-size:14px">✕</button>
      </div>
      <div style="padding:12px 16px;border-bottom:1px solid var(--border)">
        <input id="qr-cp-search" placeholder="🔍 Cerca per nome, email, telefono..." class="form-control" style="font-size:13px"
          oninput="document.getElementById('qr-cp-list').innerHTML = PipelineOS._cpClientRender(this.value)">
      </div>
      <div id="qr-cp-list" style="overflow-y:auto;padding:14px 16px;flex:1">${renderList()}</div>
    </div>`;

  this._cpClientRender = renderList;
  setTimeout(()=>document.getElementById('qr-cp-search')?.focus(), 80);
};

PipelineOS._pickClient = function(id) {
  const c = (this._clients||[]).find(x=>x.id===id);
  if (!c) return;
  // Update form fields if open
  const nameEl = document.getElementById('qr-client-name');
  const idEl   = document.getElementById('qr-client-id');
  if (nameEl) nameEl.value = c.name||'';
  if (idEl)   idEl.value   = c.id;
  if (this._clientPickerCb) this._clientPickerCb(c);
  document.getElementById('qr-client-picker')?.remove();
};

PipelineOS._openNewClientForm = function() {
  const pick = document.getElementById('qr-client-picker');
  if (pick) pick.remove();
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10600;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px)';
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
  document.body.appendChild(ov);
  ov.innerHTML = `
    <div style="background:var(--bg-card);border-radius:14px;width:440px;max-width:96vw;border:1px solid var(--border2);overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,.5)">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:800;color:var(--text)"><i class="fas fa-user-plus" style="color:#22c55e;margin-right:8px"></i>Nuovo Cliente</div>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px">✕</button>
      </div>
      <div style="padding:18px 20px;display:grid;gap:10px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">NOME *</label><input id="nc-name" class="form-control" placeholder="Es: Mario Rossi" style="font-size:13px"></div>
          <div><label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">AZIENDA</label><input id="nc-company" class="form-control" placeholder="Es: Rossi Srl" style="font-size:13px"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">EMAIL</label><input id="nc-email" type="email" class="form-control" placeholder="mario@email.it" style="font-size:13px"></div>
          <div><label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">TELEFONO</label><input id="nc-phone" class="form-control" placeholder="+39 333 ..." style="font-size:13px"></div>
        </div>
        <div><label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">CITTÀ</label><input id="nc-city" class="form-control" placeholder="Es: Milano" style="font-size:13px"></div>
        <div><label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">NOTE</label><textarea id="nc-notes" class="form-control" rows="2" placeholder="Note sul cliente..." style="font-size:13px;resize:vertical"></textarea></div>
      </div>
      <div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;background:var(--bg-card2)">
        <button onclick="this.closest('[style*=fixed]').remove()" style="padding:8px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);font-size:12px;cursor:pointer">Annulla</button>
        <button onclick="PipelineOS._saveNewClient(this)" style="padding:8px 20px;background:#22c55e;color:#000;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer"><i class="fas fa-save"></i> Salva e Seleziona</button>
      </div>
    </div>`;
  setTimeout(()=>document.getElementById('nc-name')?.focus(), 80);
};

PipelineOS._saveNewClient = async function(btn) {
  const name = document.getElementById('nc-name')?.value?.trim();
  if (!name) { toast('Nome cliente obbligatorio','warning'); return; }
  btn.disabled=true; btn.textContent='Salvataggio...';
  const client = {
    id: Date.now(),
    name, company: document.getElementById('nc-company')?.value||'',
    email: document.getElementById('nc-email')?.value||'',
    phone: document.getElementById('nc-phone')?.value||'',
    city: document.getElementById('nc-city')?.value||'',
    notes: document.getElementById('nc-notes')?.value||'',
    createdAt: new Date().toISOString(),
  };
  await IDB.put('clients', client);
  this._clients = await AppStore.get('clients').catch(()=>[]);
  btn.closest('[style*=fixed]').remove();
  this._pickClient(client.id);
  toast(`✅ Cliente "${name}" aggiunto`);
};

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE PICKER — finestra a scala con template del quoter
// ═══════════════════════════════════════════════════════════════════════════
PipelineOS.openTemplatePicker = async function() {
  const templates = (await IDB.getAll('quote_templates').catch(()=>[])).sort((a,b)=>b.ts-a.ts);
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:10500;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px)';
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
  document.body.appendChild(ov);

  const cards = templates.length ? templates.map(t => {
    const net = t.lines.reduce((a,l)=>a+(+l.price||0)*(+l.qty||1),0);
    const tot = +(net * (1 + (t.markup||0)/100) * (1 - (t.discount||0)/100)).toFixed(2);
    const lines = t.lines.slice(0,4).map(l=>`<div style="font-size:11px;color:var(--text-muted);padding:2px 0;border-bottom:1px solid var(--border)">· ${l.name||l.desc||'Voce'} ×${l.qty||1} — ${fmtCur((+l.price||0)*(+l.qty||1))}</div>`).join('');
    return `
      <div style="background:var(--bg-card);border:1.5px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;transition:all .15s"
        onmouseover="this.style.borderColor='var(--primary-border)';this.style.background='var(--bg-card2)'"
        onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--bg-card)'">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div>
            <div style="font-size:13px;font-weight:800;color:var(--text)">${t.name||'Template'}</div>
            ${t.desc?`<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${t.desc}</div>`:''}
            <div style="font-size:10px;color:var(--text-dim);margin-top:4px">${new Date(t.ts).toLocaleDateString('it-IT')} · ${t.lines.length} voci</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:16px;font-weight:900;color:var(--primary)">${fmtCur(tot)}</div>
            <div style="font-size:10px;color:var(--text-muted)">imponibile</div>
          </div>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:8px">${lines}${t.lines.length>4?`<div style="font-size:10px;color:var(--text-dim);margin-top:3px">+ altri ${t.lines.length-4} voci</div>`:''}</div>
        <div style="display:flex;gap:6px">
          <button onclick="PipelineOS._loadTemplate(${t.id})" style="flex:1;padding:7px 12px;background:var(--primary);color:#000;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer"><i class="fas fa-upload"></i> Usa questo</button>
          <button onclick="if(confirm('Eliminare il template?')){IDB.del('quote_templates',${t.id}).then(()=>PipelineOS.openTemplatePicker());this.closest('[style*=fixed]').remove()}" style="padding:7px 10px;background:#ef444418;border:1px solid #ef444430;border-radius:8px;color:#f87171;font-size:11px;cursor:pointer"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
  }).join('') : `<div style="text-align:center;padding:40px;color:var(--text-muted)">
    <i class="fas fa-layer-group" style="font-size:32px;opacity:.3;display:block;margin-bottom:12px"></i>
    <div style="font-size:14px;font-weight:700">Nessun template salvato</div>
    <div style="font-size:12px;margin-top:6px">Crea un preventivo nello Smart Quoter e salvalo come template</div>
    <button onclick="document.querySelector('[style*=fixed][style*=10500]').remove();App.navigate('quoter')" class="btn btn-primary btn-sm" style="margin-top:14px"><i class="fas fa-magic"></i> Vai allo Smart Quoter</button>
  </div>`;

  ov.innerHTML = `
    <div style="background:var(--bg-card);border-radius:16px;width:600px;max-width:96vw;max-height:90vh;display:flex;flex-direction:column;border:1.5px solid var(--border2);overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,.6)">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;background:var(--bg-card2)">
        <i class="fas fa-layer-group" style="color:var(--primary);font-size:16px"></i>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:800;color:var(--text)">Template Preventivi</div>
          <div style="font-size:11px;color:var(--text-muted)">${templates.length} template salvati · seleziona per caricare le voci</div>
        </div>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:var(--bg-card3);border:none;border-radius:8px;width:28px;height:28px;color:var(--text-muted);cursor:pointer">✕</button>
      </div>
      <div style="overflow-y:auto;padding:16px;display:grid;gap:12px;flex:1">${cards}</div>
    </div>`;
};

PipelineOS._loadTemplate = async function(id) {
  const tpl = await IDB.get('quote_templates', id).catch(()=>null);
  if (!tpl) return toast('Template non trovato','warning');
  this._qrLines = tpl.lines.map(l=>({
    id: Date.now() + Math.random(),
    desc:  l.name||l.desc||'',
    cost:  l.cost||l.costPrice||0,
    price: l.price||l.subtotal/Math.max(l.qty||1,1)||0,
    qty:   l.qty||1,
  }));
  document.querySelector('[style*="z-index:10500"]')?.remove();
  this._updateLinesUI();
  toast(`📋 Template "${tpl.name}" caricato`);
};

