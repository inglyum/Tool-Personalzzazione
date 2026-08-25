
// === /src/modules/orders/index.js ===
// Orders Module - INGLY OS v88
const Workflow={
  async render(){
    const el=eid('workflow-kanban');if(!el)return;
    const quotes=await AppStore.get('quotes');
    const cols=[
      {id:'bozza',label:'📝 Bozza',color:'var(--text-muted)'},
      {id:'in_attesa',label:'⏳ In Attesa',color:'var(--primary)'},
      {id:'produzione',label:'⚙️ Produzione',color:'var(--blue)'},
      {id:'confermato',label:'✅ Confermato',color:'var(--green)'},
    ];
    el.innerHTML=cols.map(col=>{
      const items=quotes.filter(q=>q.status===col.id);
      return`<div class="kanban-col">
        <div class="kanban-col-header" style="display:flex;align-items:center;justify-content:space-between">
          <span style="color:${col.color};font-weight:700">${col.label}</span>
          <div style="display:flex;align-items:center;gap:5px">
            <span class="badge badge-gray">${items.length}</span>
            ${items.length?`<span style="font-size:10px;color:var(--text-dim);font-weight:600">€${items.reduce((a,q)=>a+(+q.grossPrice||+q.total||0),0).toFixed(0)}</span>`:''}
          </div>
        </div>
        ${items.length===0?`<div style="text-align:center;padding:24px 12px;color:var(--text-dim);font-size:12px"><i class="fas fa-inbox" style="display:block;font-size:20px;margin-bottom:6px;opacity:.3"></i>Nessun preventivo</div>`:''}
        ${items.map(q=>`<div class="kanban-card">
          <div class="flex-between mb-12">
            <div class="kanban-card-title" style="flex:1;margin-right:8px">${q.name}</div>
            ${badgeStatus(q.status)}
          </div>
          <div class="kanban-card-meta">
            <span><i class="fas fa-user" style="margin-right:3px;opacity:.5"></i>${q.clientName||'—'}</span>
            <span style="color:var(--primary);font-weight:700">${fmtCur(q.grossPrice||0)}</span>
          </div>
          <div style="font-size:11px;color:var(--text-dim);margin:6px 0">${fmtDate(q.date)}</div>
          <div style="margin-bottom:8px">
            <select class="form-control" style="padding:5px 8px;font-size:11px" onchange="Workflow.setStatus(${q.id},this.value)">
              ${cols.map(c=>`<option value="${c.id}" ${q.status===c.id?'selected':''}>${c.label.replace(/[^\x20-\x7E]/g,'').trim()||c.label}</option>`).join('')}
            </select>
          </div>
          <div${q.status!=='confermato'?`<button class="act-btn act-confirm" onclick="QuoterBridge.convert(${q.id})"><i class="fas fa-check"></i> Conferma</button>`:''}
            <button class="act-btn act-edit" onclick="Workflow.editQuote(${q.id})"><i class="fas fa-edit"></i> Modifica</button>
            <button class="act-btn act-del" onclick="Workflow.delQuote(${q.id})"><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('')}
      </div>`;
    }).join('');
  },
  async setStatus(id,status){
        const o=await IDB.get('orders',id).catch(()=>null);if(!o)return;
        o.status=status;await IDB.put('orders',o).catch(()=>{});
        const q=await IDB.get('quotes',id);if(!q)return;
    await snapshotRecord('quotes',id);
    q.status=status;await IDB.put('quotes',q);
    await logAction('quote',id,'status_changed',{status});
    // ── v61: Sync to Kanban ─────────────────────────────────────────
    try {
      const orders=await AppStore.get('orders').catch(()=>[]);
      const linked=orders.filter(o=>String(o.originQuote)===String(id));
      const kanbanMap={produzione:'backlog',confermato:'working',consegnato:'delivered'};
      const kStatus=kanbanMap[status];
      if(linked.length&&kStatus){
        for(const o of linked){o.status=kStatus;o.updatedAt=new Date().toISOString();await IDB.put('orders',o);}
        if(App.currentSection==='orders')(typeof Orders!=='undefined'&&Orders.render());
        toast('📋 Kanban aggiornato → '+kStatus,'info');
      } else if(!linked.length&&(status==='produzione'||status==='confermato')){
        // Auto-create Kanban card
        await IDB.put('orders',{
          id:Date.now(),name:q.name||'Ordine #'+id,
          client:q.clientName||'',value:q.grossPrice||q.total||0,
          status:status==='confermato'?'working':'backlog',
          priority:'normal',originQuote:id,
          createdAt:new Date().toISOString()
        });
        if(App.currentSection==='orders')(typeof Orders!=='undefined'&&Orders.render());
        toast('🗂️ Card Kanban creata','success');
      }
    } catch(e){console.warn('[v61 wf→kanban]',e);}
    // ───────────────────────────────────────────────────────────────
    toast('Stato aggiornato','info');
    await this.render();
  },
  async editQuote(id){
    const q=await IDB.get('quotes',id);if(!q)return;
    App.navigate('quoter');
    await new Promise(r=>setTimeout(r,100));
    Quoter.editId=id;
    if(q.lines&&q.lines.length){Quoter.lines=[...q.lines];}
    if(eid('q-name'))eid('q-name').value=q.name||'';
    if(eid('q-notes'))eid('q-notes').value=q.notes||'';
    if(eid('qr-markup'))eid('qr-markup').value=q.markup||100;
    if(eid('qr-discount'))eid('qr-discount').value=q.discount||0;
    await App.populateClientSelects();
    if(eid('q-client')&&q.clientId)eid('q-client').value=q.clientId;
    Quoter.renderLines();Quoter.recalcRight();
    toast('Preventivo caricato in modifica','info');
  },
  async delQuote(id){
    if(!confirm('Eliminare questo preventivo?'))return;
    await IDB.del('quotes',id).catch(e=>console.warn('[IDB.del]',e));
    await logAction('quote',id,'deleted');
    AppStore.invalidate('quotes');
    AppStore.invalidate('pipeline');
    toast('Preventivo eliminato','warning');
    await this.render();
  }
};

// ===== SALES =====
const TimeTracker = {
  _timer: null,
  _start: null,
  _elapsed: 0,
  _currentOrder: null,
  _KEY: 'ingly_timetracker_state',
  _logPage: 0,
  _logPageSize: 15,

  async render() {
    const el = eid('view-timetracker'); if (!el) return;
    const orders = await AppStore.get('orders').catch(() => []);
    const logs = await IDB.getAll('timelogs').catch(() => []);
    const activeOrders = orders.filter(o => o.status !== 'delivered');

    // Restore state
    try {
      const saved = JSON.parse(localStorage.getItem(this._KEY)||'{}');
      if (saved.running && saved.startTs) {
        this._start = new Date(saved.startTs);
        this._elapsed = saved.baseElapsed || 0;
        this._currentOrder = saved.orderId || null;
        this._resume();
      }
    } catch(_){}

    // Total hours per order from logs
    const hoursPerOrder = {};
    logs.forEach(l => {
      const k = l.orderId || 'free';
      hoursPerOrder[k] = (hoursPerOrder[k]||0) + (+l.minutes||0);
    });

    el.innerHTML = `<div style="padding:20px;max-width:1000px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <h2 style="color:#06b6d4;margin:0;font-size:22px">⏱ Time Tracker</h2>
        <span style="font-size:11px;background:#06b6d415;color:#06b6d4;padding:3px 10px;border-radius:99px;border:1px solid #06b6d430;font-weight:700">PER ORDINE</span>
      </div>
      <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px">Cronometra il tempo di produzione per ogni ordine — scopri il tuo €/ora reale</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">

        <!-- TIMER CARD -->
        <div style="background:var(--bg-card);border-radius:14px;padding:24px;border:1px solid var(--border)">
          <div style="font-weight:700;color:#06b6d4;font-size:13px;margin-bottom:16px;text-transform:uppercase">⏱ Cronometro</div>

          <div id="tt-display" style="font-size:56px;font-weight:900;color:var(--text);font-variant-numeric:tabular-nums;text-align:center;margin-bottom:20px;font-family:monospace">00:00:00</div>

          <div class="form-group" style="margin-bottom:14px">
            <label class="form-label">Ordine / Attività</label>
            <select class="form-control" id="tt-order">
              <option value="">— Seleziona ordine —</option>
              <option value="free">⚡ Lavoro generico</option>
              ${activeOrders.map(o=>`<option value="${o.id}" ${this._currentOrder==o.id?'selected':''}>${o.title||o.clientName||'Ordine #'+o.id}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Note attività (opzionale)</label>
            <input class="form-control" id="tt-note" placeholder="Es: incisione laser, assemblaggio, finitura...">
          </div>

          <div style="display:flex;gap:10px">
            <button id="tt-btn-start" onclick="if(typeof TimeTracker!==typeof undefined){TimeTracker.startStop()}" style="flex:1;padding:14px;background:#06b6d4;color:#000;border:none;border-radius:10px;font-weight:800;cursor:pointer;font-size:15px">
              <i class="fas fa-play" id="tt-btn-icon"></i> <span id="tt-btn-label">Avvia</span>
            </button>
            <button onclick="if(typeof TimeTracker!==typeof undefined){TimeTracker.reset()}" style="padding:14px 18px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;color:var(--text-muted);cursor:pointer;font-size:14px" title="Reset">
              <i class="fas fa-undo"></i>
            </button>
            <button onclick="if(typeof TimeTracker!==typeof undefined){TimeTracker.saveLog()}" style="padding:14px 18px;background:#22c55e20;border:1.5px solid #22c55e40;border-radius:10px;color:#22c55e;cursor:pointer;font-size:14px;font-weight:700" title="Salva sessione">
              <i class="fas fa-save"></i>
            </button>
          </div>
        </div>

        <!-- STATS CARD -->
        <div style="background:var(--bg-card);border-radius:14px;padding:24px;border:1px solid var(--border)">
          <div style="font-weight:700;color:#06b6d4;font-size:13px;margin-bottom:16px;text-transform:uppercase">📊 Statistiche Tempo</div>
          ${Object.keys(hoursPerOrder).length === 0 ? `<div style="text-align:center;padding:40px 20px;color:var(--text-muted)"><div style="font-size:40px;margin-bottom:10px">⏱</div>Nessun log ancora.<br>Avvia il cronometro e salva le sessioni.</div>` :
          `<div style="display:flex;flex-direction:column;gap:8px">
            ${Object.entries(hoursPerOrder).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([oid,min])=>{
              const ord = orders.find(o=>o.id==oid);
              const label = oid==='free'?'Lavoro generico':ord?(ord.title||ord.clientName||'Ordine #'+oid):'Ordine #'+oid;
              const h = Math.floor(min/60), m = min%60;
              return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg-card2);border-radius:8px">
                <div style="flex:1;font-size:13px;color:var(--text)">${label}</div>
                <div style="font-size:13px;font-weight:700;color:#06b6d4;font-family:monospace">${h}h ${m}m</div>
              </div>`;
            }).join('')}
          </div>`}
        </div>
      </div>

      <!-- LOG HISTORY -->
      <div style="background:var(--bg-card);border-radius:12px;border:1px solid var(--border);overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700;color:var(--text);font-size:14px">📋 Sessioni Registrate</div>
          <div style="font-size:12px;color:var(--text-muted)">${logs.length} sessioni totali</div>
        </div>
        ${logs.length === 0 ? `<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">Nessuna sessione ancora registrata</div>` :
        (() => {
          const sortedLogs = [...logs].reverse();
          const lps = this._logPageSize || 15;
          const lpg = this._logPage || 0;
          const lTotalPages = Math.max(1, Math.ceil(sortedLogs.length / lps));
          if (lpg >= lTotalPages) this._logPage = Math.max(0, lTotalPages - 1);
          const pageLogs = sortedLogs.slice((this._logPage||0) * lps, (this._logPage||0) * lps + lps);
          const bs = 'padding:4px 10px;border-radius:5px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-muted);cursor:pointer;font-size:11px;';
          const bas = 'padding:4px 10px;border-radius:5px;border:1px solid #06b6d4;background:#06b6d415;color:#06b6d4;cursor:pointer;font-size:11px;font-weight:700;';
          return `<div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:var(--bg-card2)">
              ${['Data','Ordine','Note','Durata','Azioni'].map(h=>`<th style="padding:9px 12px;text-align:left;font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase">${h}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${pageLogs.map(l=>{
                const ord = orders.find(o=>o.id==l.orderId);
                const h=Math.floor(l.minutes/60),m=Math.round(l.minutes%60);
                return `<tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:9px 12px;font-size:12px;color:var(--text-muted)">${l.date?new Date(l.date).toLocaleDateString('it-IT'):''}</td>
                  <td style="padding:9px 12px;font-size:13px;color:var(--text)">${l.orderId==='free'?'Generico':ord?(ord.title||'Ordine #'+l.orderId):'#'+l.orderId}</td>
                  <td style="padding:9px 12px;font-size:12px;color:var(--text-muted)">${l.note||'—'}</td>
                  <td style="padding:9px 12px;font-weight:700;color:#06b6d4;font-family:monospace">${h}h ${m}m</td>
                  <td style="padding:9px 12px">
                    <button onclick="if(typeof TimeTracker!==typeof undefined)TimeTracker.deleteLog(${l.id})" style="padding:3px 7px;background:var(--bg-card);border:1px solid #ef444440;border-radius:5px;color:#ef4444;cursor:pointer;font-size:11px"><i class="fas fa-trash"></i></button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table></div>
          ${lTotalPages > 1 ? `<div style="display:flex;align-items:center;justify-content:center;gap:6px;padding:12px 0;border-top:1px solid var(--border)">
            <span style="font-size:11px;color:var(--text-muted);margin-right:4px">Pag. ${(this._logPage||0)+1}/${lTotalPages} · ${sortedLogs.length} sessioni</span>
            <button onclick="TimeTracker._logPage=Math.max(0,(TimeTracker._logPage||0)-1);TimeTracker.render()" style="${bs}" ${(this._logPage||0)===0?'disabled':''}>‹</button>
            ${Array.from({length:Math.min(5,lTotalPages)},(_,i)=>{const p=Math.max(0,(this._logPage||0)-2)+i;return p<lTotalPages?`<button onclick="TimeTracker._logPage=${p};TimeTracker.render()" style="${p===(this._logPage||0)?bas:bs}">${p+1}</button>`:''}).join('')}
            <button onclick="TimeTracker._logPage=Math.min(${lTotalPages-1},(TimeTracker._logPage||0)+1);TimeTracker.render()" style="${bs}" ${(this._logPage||0)>=lTotalPages-1?'disabled':''}>›</button>
          </div>` : ''}`;
        })()}
      </div>
    </div>`;

    this._updateDisplay();
    if (this._timer) this._updateDisplay();
  },

  startStop() {
    if (this._timer) {
      // STOP
      clearInterval(this._timer);
      this._timer = null;
      this._elapsed += (new Date() - this._start) / 1000;
      this._start = null;
      localStorage.removeItem(this._KEY);
      const btn = eid('tt-btn-icon'); if(btn) btn.className='fas fa-play';
      const lbl = eid('tt-btn-label'); if(lbl) lbl.textContent='Avvia';
    } else {
      // START
      const orderId = eid('tt-order')?.value || '';
      this._currentOrder = orderId;
      this._start = new Date();
      this._timer = setInterval(() => this._updateDisplay(), 1000);
      localStorage.setItem(this._KEY, JSON.stringify({ running:true, startTs:this._start.toISOString(), baseElapsed:this._elapsed, orderId }));
      const btn = eid('tt-btn-icon'); if(btn) btn.className='fas fa-pause';
      const lbl = eid('tt-btn-label'); if(lbl) lbl.textContent='Pausa';
    }
  },

  _resume() {
    this._timer = setInterval(() => this._updateDisplay(), 1000);
  },

  _updateDisplay() {
    const el = eid('tt-display'); if (!el) return;
    let total = this._elapsed + (this._start ? (new Date() - this._start)/1000 : 0);
    const h = Math.floor(total/3600);
    const m = Math.floor((total%3600)/60);
    const s = Math.floor(total%60);
    el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (this._timer) el.style.color = '#06b6d4';
  },

  reset() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this._elapsed = 0; this._start = null;
    localStorage.removeItem(this._KEY);
    const el = eid('tt-display'); if(el) { el.textContent='00:00:00'; el.style.color='var(--text)'; }
    const btn = eid('tt-btn-icon'); if(btn) btn.className='fas fa-play';
    const lbl = eid('tt-btn-label'); if(lbl) lbl.textContent='Avvia';
  },

  async saveLog() {
    const total = this._elapsed + (this._start ? (new Date()-this._start)/1000 : 0);
    const minutes = Math.round(total/60);
    if (minutes < 1) { toast('Avvia il timer prima di salvare','warning'); return; }
    const orderId = eid('tt-order')?.value || 'free';
    const note = eid('tt-note')?.value || '';
    await IDB.put('timelogs', { orderId, note, minutes, date: new Date().toISOString(), saved: true });
    toast(`Sessione salvata: ${Math.floor(minutes/60)}h ${minutes%60}m`, '✅');
    this._logPage = 0;
    this.reset();
    await this.render();
  },

  async deleteLog(id) {
    await IDB.del('timelogs', id).catch(e=>console.warn('[IDB.del]',e));
    await this.render();
    toast('Sessione eliminata','success');
  }
};

// ═══════════════════════════════════════════════════════════════════
// SMART NOTIF — Notifiche intelligenti configurabili
// ═══════════════════════════════════════════════════════════════════
const Orders={

  // ── Column definitions — label is computed fresh on every access ──────────
  _COLS:[
    {id:'backlog',   label:'📋 Backlog',        color:'#6366f1', icon:'fa-inbox'},
    {id:'working',   label:'🔧 In Lavorazione', color:'#f59e0b', icon:'fa-tools'},
    {id:'ready',     label:'✅ Pronto',          color:'#10b981', icon:'fa-check-circle'},
    {id:'delivered', label:'📦 Consegnato',      color:'#3b82f6', icon:'fa-shipping-fast'},
    {id:'sold',      label:'💰 Venduto',         color:'#22c55e', icon:'fa-euro-sign'},
    {id:'invoiced',  label:'🧾 Fatturato',       color:'#a78bfa', icon:'fa-file-invoice'},
    {id:'paused',    label:'⏸️ In Pausa',        color:'#6b7280', icon:'fa-pause-circle'},
  ],
  _searchFilter: '',
  _priorityFilter: '',

  // Always call this.cols — never this._COLS — outside the getter itself
  get cols(){ return this._COLS; },


  // ── Render Kanban board ───────────────────────────────────────────────────
  filterSearch(v){ this._searchFilter=v; this.render(); },
  filterPriority(v){ this._priorityFilter=v; this.render(); },
    async render(){
    const board = eid('kanban-board');
    if(!board) return;
    // v3.3: prefer pipeline store, fallback to orders
    const pipeRaw = await AppStore.get('pipeline').catch(()=>[]);
    let orders = (pipeRaw && pipeRaw.length > 0)
      ? pipeRaw.filter(r => { const s=r.stage||r.status||'backlog'; return !['paid','draft','sent','rejected','lost'].includes(s); })
      : await AppStore.get('orders').catch(()=>[]);

    // Apply filters
    if(this._searchFilter){
      const s = this._searchFilter.toLowerCase();
      orders = orders.filter(o=>(o.name||'').toLowerCase().includes(s)||(o.client||'').toLowerCase().includes(s)||(o.clientName||'').toLowerCase().includes(s));
    }
    if(this._priorityFilter){
      orders = orders.filter(o=>(o.priority||'')=== this._priorityFilter);
    }

    const cols = this.cols;
    const now = new Date();

    // KPIs
    const active   = orders.filter(o=>!['delivered','paused'].includes(o.status||o.stage||'backlog'));
    const working  = orders.filter(o=>(o.status||o.stage)==='working');
    const overdue  = orders.filter(o=>o.dueDate&&(o.status||o.stage)!=='delivered'&&new Date(o.dueDate)<now);
    const totalVal = active.reduce((a,o)=>a+(+o.value||o.total||0),0);
    const kpiEl = eid('orders-kpis');
    if(kpiEl) kpiEl.innerHTML=[
      {ico:'fa-fire',      l:'Attivi',        v:active.length,          c:'var(--primary)',  bg:'var(--primary-dim)'},
      {ico:'fa-tools',     l:'In Lavorazione',v:working.length,         c:'var(--orange)',   bg:'#f59e0b15'},
      {ico:'fa-clock',     l:'In Ritardo',    v:overdue.length,         c:overdue.length?'var(--red)':'var(--green)', bg:overdue.length?'#ef444415':'#22c55e15'},
      {ico:'fa-euro-sign', l:'Valore Totale', v:fmtCur(totalVal),       c:'var(--green)',    bg:'#22c55e15'},
      {ico:'fa-check',     l:'Completati oggi',v:orders.filter(o=>(o.status||o.stage)==='ready').length, c:'#10b981', bg:'#10b98115'},
    ].map(k=>`<div class="kpi-card" style="position:relative;overflow:hidden">
      <div style="position:absolute;top:14px;right:14px;width:32px;height:32px;background:${k.bg};border-radius:8px;display:flex;align-items:center;justify-content:center">
        <i class="fas ${k.ico}" style="font-size:14px;color:${k.c}"></i>
      </div>
      <div class="kpi-value" style="color:${k.c};font-size:22px">${k.v}</div>
      <div class="kpi-label">${k.l}</div>
    </div>`).join('');

    // Update badge
    const badge = eid('kanban-total-badge');
    if(badge) badge.textContent = orders.length + ' ordini';

    // Build 5 kanban columns
    board.innerHTML = cols.map(col=>{
      const stage = col.id;
      const colOrds = orders
        .filter(o=>(o.stage||o.status||'backlog')===stage)
        .sort((a,b)=>{
          // Overdue first, then by due date
          const ao = a.dueDate&&new Date(a.dueDate)<now?1:0;
          const bo = b.dueDate&&new Date(b.dueDate)<now?1:0;
          if(ao!==bo) return bo-ao;
          if(a.dueDate&&b.dueDate) return new Date(a.dueDate)-new Date(b.dueDate);
          const pri = {alta:0,media:1,bassa:2};
          return (pri[a.priority]??1)-(pri[b.priority]??1);
        });
      const colVal = colOrds.reduce((a,o)=>a+(+o.value||o.total||0),0);
      const overdueInCol = colOrds.filter(o=>o.dueDate&&new Date(o.dueDate)<now).length;

      return `<div style="display:flex;flex-direction:column;min-height:200px">
        <!-- Column header -->
        <div style="background:${col.color}18;border:1.5px solid ${col.color}35;border-radius:12px 12px 0 0;padding:10px 12px;border-bottom:2px solid ${col.color}60">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <div style="font-size:12px;font-weight:800;color:${col.color};display:flex;align-items:center;gap:6px">
              <i class="fas ${col.icon}" style="font-size:11px"></i>
              ${col.label}
            </div>
            <div style="display:flex;align-items:center;gap:5px">
              ${overdueInCol>0?'<span style="background:#ef444430;color:#ef4444;border-radius:99px;padding:1px 6px;font-size:9px;font-weight:700">⚠️'+overdueInCol+'</span>':''}
              <span style="background:${col.color}30;color:${col.color};border-radius:99px;padding:2px 8px;font-size:10px;font-weight:700">${colOrds.length}</span>
            </div>
          </div>
          ${colVal>0?'<div style="font-size:10px;color:'+col.color+';opacity:.7">'+fmtCur(colVal)+'</div>':''}
        </div>

        <!-- Cards -->
        <div style="background:var(--bg-card);border:1.5px solid ${col.color}25;border-top:none;border-radius:0 0 12px 12px;padding:8px;display:flex;flex-direction:column;gap:7px;flex:1;min-height:120px">
          ${colOrds.length?colOrds.map(o=>this._card(o,col,cols)).join('')
            :'<div style="text-align:center;padding:20px 12px;color:var(--text-dim);font-size:11px"><i class=\"fas fa-inbox\" style=\"opacity:.3;font-size:20px;display:block;margin-bottom:6px\"></i>Nessun lavoro</div>'}
          <button onclick="Orders.openCreate('${stage}')" style="margin-top:4px;padding:7px;background:transparent;border:1.5px dashed ${col.color}40;border-radius:8px;color:${col.color};opacity:.6;cursor:pointer;font-size:11px;font-weight:600;transition:.2s"
            onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='.6'">
            + Aggiungi
          </button>
        </div>
      </div>`;
    }).join('');
  },

  // ── Order card ────────────────────────────────────────────────────────────
  _card(o, col, cols){
    if(!cols) cols = this.cols;
    const stage = o.status||o.stage||'backlog';
    const now = new Date();
    const isOverdue = o.dueDate && new Date(o.dueDate)<now && stage!=='delivered';
    const daysLeft  = o.dueDate ? Math.ceil((new Date(o.dueDate)-now)/(1000*86400)) : null;
    const priColor  = {alta:'#ef4444',media:'#f59e0b',bassa:'#22c55e'}[o.priority]||'transparent';
    const priLabel  = {alta:'🔴 ALTA',media:'🟡 MEDIA',bassa:'🟢 BASSA'}[o.priority]||'';
    const val = o.value||o.total||0;

    // Due date display
    let dateHtml = '';
    if(o.dueDate){
      const dColor = isOverdue?'#ef4444':daysLeft<=2?'#f59e0b':daysLeft<=7?'var(--orange)':'var(--text-dim)';
      const dText  = isOverdue?`⚠️ Scaduto da ${Math.abs(daysLeft)}g`:daysLeft===0?'⚡ Oggi!':daysLeft===1?'Domani':`${daysLeft}g rimasti`;
      dateHtml = `<div style="font-size:10px;color:${dColor};font-weight:${isOverdue||daysLeft<=1?'700':'500'}">${dText}</div>`;
    }

    // Items preview
    const items = (o.items||[]);
    const itemsHtml = items.length
      ? `<div style="font-size:10px;color:var(--text-dim);margin:5px 0;padding:5px 7px;background:var(--bg-card3);border-radius:5px;line-height:1.4">
           ${items.slice(0,2).map(i=>`<div>• ${(i.desc||i.name||'').slice(0,35)}</div>`).join('')}
           ${items.length>2?`<div style="color:var(--text-dim)">+${items.length-2} altri</div>`:''}
         </div>` : '';

    // Status move buttons — only adjacent stages
    const allCols = cols||this._COLS;
    const currIdx = allCols.findIndex(c=>c.id===col.id);
    const adjacent = allCols.filter((_,i)=>Math.abs(i-currIdx)===1);
    const moveBtns = adjacent.map(nc=>`<button
        onclick="event.stopPropagation();Orders.move(${o.id},'${nc.id}')"
        title="Sposta in ${nc.label}"
        style="padding:3px 8px;background:${nc.color}18;color:${nc.color};border:1px solid ${nc.color}40;border-radius:5px;cursor:pointer;font-size:10px;font-weight:700;white-space:nowrap;transition:.15s"
        onmouseover="this.style.background='${nc.color}35'" onmouseout="this.style.background='${nc.color}18'">
        <i class="fas ${nc.icon}" style="font-size:9px"></i> ${nc.label.split(' ').slice(0,2).join(' ')}
      </button>`).join('');

    const toSaleBtn = (stage==='ready'||stage==='delivered')
      ? `<button onclick="event.stopPropagation();Orders.toSale(${o.id})"
           style="padding:3px 8px;background:#22c55e18;color:#22c55e;border:1px solid #22c55e40;border-radius:5px;cursor:pointer;font-size:10px;font-weight:700"
           title="Registra vendita">💰 Vendita</button>` : '';

    return `<div onclick="Orders.openDetail(${o.id})"
      style="background:var(--bg-card2);border-radius:9px;padding:11px 12px;cursor:pointer;
             border-left:3px solid ${isOverdue?'#ef4444':col.color};
             border-top:1px solid var(--border);border-right:1px solid var(--border);border-bottom:1px solid var(--border);
             transition:.15s;position:relative"
      onmouseover="this.style.borderTopColor='${col.color}60';this.style.borderRightColor='${col.color}60';this.style.borderBottomColor='${col.color}60';this.style.background='var(--bg-card3)'"
      onmouseout="this.style.borderTopColor='var(--border)';this.style.borderRightColor='var(--border)';this.style.borderBottomColor='var(--border)';this.style.background='var(--bg-card2)'">

      <!-- Top row: name + value -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px">
        <div style="font-size:12px;font-weight:700;color:var(--text);line-height:1.3;flex:1">${o.name||'Ordine #'+o.id}</div>
        ${val?`<div style="font-size:12px;font-weight:800;color:var(--green);flex-shrink:0;min-width:60px;text-align:right">${fmtCur(val)}</div>`:''}
      </div>

      <!-- Client -->
      ${(o.client||o.clientName)?`<div style="font-size:11px;color:var(--primary);font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:4px">
        <i class="fas fa-user" style="font-size:9px;opacity:.6"></i>${o.client||o.clientName}
      </div>`:''}

      <!-- Items preview -->
      ${itemsHtml}

      <!-- Meta row: due date + priority -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:5px;margin-bottom:7px">
        ${dateHtml||'<div></div>'}
        ${priLabel?`<div style="font-size:9px;padding:1px 6px;border-radius:3px;background:${priColor}20;color:${priColor};font-weight:700">${priLabel}</div>`:''}
      </div>

      <!-- Actions row -->
      <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center" onclick="event.stopPropagation()">
        ${moveBtns}
        ${toSaleBtn}
        <button onclick="event.stopPropagation();Orders.showQR(${o.id},'${(o.name||'Ordine').replace(/'/g,'').slice(0,25)}')"
          style="padding:3px 7px;background:var(--bg-card);border:1px solid var(--border2);border-radius:5px;cursor:pointer;font-size:10px;color:var(--text-dim)"
          title="QR ordine">QR</button>
      </div>
    </div>`;
  },

  // ── Open create modal ─────────────────────────────────────────────────────
  async openCreate(idOrStage=null){
    // If passed a stage string (from column button), pre-select that stage
    let id = null, defaultStage = 'backlog';
    if(idOrStage && typeof idOrStage === 'string' && !isNaN(+idOrStage)){
      id = +idOrStage; // numeric string → edit mode
    } else if(idOrStage && typeof idOrStage === 'string'){
      defaultStage = idOrStage; // stage name → create in that column
    } else if(typeof idOrStage === 'number'){
      id = idOrStage;
    }
    this._editId = id||null;
    this._defaultStage = defaultStage;
    const titleEl = eid('modal-orders-title');
    if(titleEl) titleEl.textContent = id ? 'Modifica Ordine' : 'Nuovo Ordine';
    if(id){
      const o = await IDB.get('orders',id).catch(()=>null);
      if(o){
        if(eid('ord-title')) eid('ord-title').value = o.name||'';
        if(eid('ord-deadline')) eid('ord-deadline').value = o.dueDate||'';
        if(eid('ord-priority')) eid('ord-priority').value = o.priority||'normal';
        if(eid('ord-value')) eid('ord-value').value = o.value||0;
        if(eid('ord-estimated')) eid('ord-estimated').value = o.estimatedTime||'';
        if(eid('ord-notes')) eid('ord-notes').value = o.desc||'';
      }
    } else {
      ['ord-title','ord-notes'].forEach(x=>{ if(eid(x)) eid(x).value=''; });
      ['ord-value','ord-estimated'].forEach(x=>{ if(eid(x)) eid(x).value=''; });
      if(eid('ord-priority')) eid('ord-priority').value = 'normal';
    }
    // Populate client select
    try {
      const clients = await AppStore.get('clients').catch(()=>[]);
      const sel = eid('ord-client');
      if(sel){
        sel.innerHTML = '<option value="">— Seleziona cliente —</option>' +
          clients.map(c=>`<option value="${c.id}">${c.name||c.id}</option>`).join('');
        if(id){ const o=await IDB.get('orders',id).catch(()=>null); if(o&&o.clientId) sel.value=o.clientId; }
      }
    } catch {}
    if(typeof App!=='undefined') await App.populateClientSelects();
    openModal('orders');
  },

  // ── Create sale from completed order ─────────────────────────────────────
  async toSale(id){
    // v3.6: cerca in orders poi in pipeline
    let o = await IDB.get('orders',id).catch(()=>null);
    if(!o){
      const pl = await IDB.getAll('pipeline').catch(()=>[]);
      o = pl.find(x=>x.id===id || x._sourceId===id)||null;
    }
    if(!o){ toast('Ordine non trovato','error'); return; }
    if(!confirm(`Creare vendita da ordine "${o.name||o.id}"?\n€${o.value||0} — verrà aggiunta in Vendite & Fatture`)) return;
    const sale = {
      id: Date.now(),
      clientId: o.clientId||null,
      clientName: o.clientName||'',
      date: today(),
      desc: o.name||o.desc||'Ordine #'+o.id,
      amount: +o.value||0,
      status: 'da_pagare',
      channel: 'Diretto',
      fromOrderId: o.id,
    };
    const saleId = await IDB.put('sales', sale);
    await logAction('sale', saleId, 'created_from_order', {orderId: o.id});
    Bus.emit('sale:created', {id: saleId});
    // v3.4: sync pipeline stage to paid
    try {
      const plRecs = await IDB.getAll('pipeline').catch(()=>[]);
      const plEntry = plRecs.find(r => r._sourceId === o.id || r.id === o.id);
      if (plEntry) {
        plEntry.stage = 'paid';
        plEntry.updatedAt = new Date().toISOString();
        await IDB.put('pipeline', plEntry);
        AppStore.invalidate('pipeline');
      }
    } catch(ex) { console.warn('[toSale pipeline sync]', ex); }
    toast('✅ Vendita creata! Vai in Vendite & Fatture', 'success');
    setTimeout(()=> App.navigate('sales'), 1200);
  },

  // ── Move order to column ──────────────────────────────────────────────────
  async move(id, newStatus){
    // FIX v5.0: aggiorna ENTRAMBI gli store (orders + pipeline)
    // prima era solo 'orders' → render() leggeva pipeline invariata → card non si spostava
    const [ordersAll, pipelineAll] = await Promise.all([
      AppStore.get('orders').catch(()=>[]),
      AppStore.get('pipeline').catch(()=>[]),
    ]);
    let o = ordersAll.find(x=>x.id===id);
    let p = pipelineAll.find(x=>x.id===id || x._sourceId===id);

    const ts = new Date().toISOString();

    // Update orders record
    if(o){
      o.status    = newStatus;
      o.stage     = newStatus;
      o.updatedAt = ts;
      await IDB.put('orders', o).catch(e=>console.warn('[move orders]',e));
    }

    // Update pipeline record (this is what render() reads first)
    if(p){
      p.stage     = newStatus;
      p.status    = newStatus;
      p.updatedAt = ts;
      await IDB.put('pipeline', p).catch(e=>console.warn('[move pipeline]',e));
    } else if(o) {
      // Pipeline record missing — create it from order
      const newPl = { ...o, stage:newStatus, status:newStatus, _sourceId:o.id, updatedAt:ts };
      if(!newPl.id) newPl.id = Date.now();
      await IDB.put('pipeline', newPl).catch(()=>{});
    }

    if(!o && !p){ toast('Ordine non trovato','warning'); return; }

    AppStore.invalidate('orders');
    AppStore.invalidate('pipeline');
    if(typeof BDW!=='undefined') BDW.touch('orders');
    await this.render();
    const col = this.cols.find(c=>c.id===newStatus);
    toast(`Spostato → ${col?.label||newStatus}`,'success');
    // ── v61: Sync back to Workflow ─────────────────────────────────
    if(o.originQuote){
      try{
        const q=await IDB.get('quotes',o.originQuote).catch(()=>null);
        if(q){
          const wfMap={backlog:'produzione',working:'produzione',ready:'produzione',delivered:'consegnato'};
          const newQStatus=wfMap[newStatus];
          if(newQStatus&&q.status!==newQStatus&&q.status!=='annullato'){
            q.status=newQStatus;q.updatedAt=new Date().toISOString();
            await IDB.put('quotes',q);
            if(App.currentSection==='workflow')(typeof Workflow!=='undefined'&&Workflow.render());
          }
        }
      }catch(e){console.warn('[v61 kanban→wf]',e);}
    }
    // ──────────────────────────────────────────────────────────────
  },

  // ── Open order detail modal ───────────────────────────────────────────────
  async openDetail(id){
    // v3.6: cerca in orders store, se non trovato usa pipeline._sourceId
    let orders = await AppStore.get('orders').catch(()=>[]);
    let o = orders.find(x=>x.id===id);
    if(!o){
      // Fallback: search pipeline by id or _sourceId
      const pl = await AppStore.get('pipeline').catch(()=>[]);
      const plEntry = pl.find(x=>x.id===id || x._sourceId===id);
      if(plEntry){
        // Try the original orders store using _sourceId
        o = orders.find(x=>x.id===plEntry._sourceId) || plEntry;
      }
    }
    if(!o){ toast('Ordine non trovato — potrebbe essere in pipeline','warning'); return; }

    const cols    = this.cols;  // ← resolved once, used throughout
    const curStat = o.status||'backlog';

    // Status buttons — built from cols (has .label)
    const statusButtons = cols.map(c=>`
      <button
        onclick="document.querySelectorAll('.od-status-btn').forEach(b=>{b.style.opacity='0.4';b.dataset.sel='0';});this.style.opacity='1';this.dataset.sel='1';window._odStatus='${c.id}'"
        class="od-status-btn"
        data-sel="${curStat===c.id?'1':'0'}"
        style="padding:8px 14px;background:${c.color}20;color:${c.color};border:1.5px solid ${c.color}${curStat===c.id?'':'50'};border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;opacity:${curStat===c.id?'1':'0.45'};transition:opacity .15s"
      >${c.label}</button>`).join('');

    const html = `
      <div style="display:flex;flex-direction:column;gap:16px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">📝 Nome Ordine</label>
            <input class="form-control" id="od-name" value="${(o.name||'').replace(/"/g,'&quot;')}" placeholder="Es. Targa incisa personalizzata">
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">👤 Cliente</label>
            <input class="form-control" id="od-client" value="${(o.client||'').replace(/"/g,'&quot;')}" placeholder="Nome cliente">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div>
            <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">💶 Valore €</label>
            <input class="form-control" id="od-value" type="number" step="0.01" value="${o.value||''}" placeholder="0.00">
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">📅 Scadenza</label>
            <input class="form-control" id="od-due" type="date" value="${o.dueDate||''}">
          </div>
          <div>
            <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">⚡ Priorità</label>
            <select class="form-control" id="od-priority">
              <option value="" ${!o.priority?'selected':''}>— Nessuna —</option>
              <option value="alta"  ${o.priority==='alta' ?'selected':''}>🔴 Alta</option>
              <option value="media" ${o.priority==='media'?'selected':''}>🟡 Media</option>
              <option value="bassa" ${o.priority==='bassa'?'selected':''}>🟢 Bassa</option>
            </select>
          </div>
        </div>
        <div>
          <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">📋 Descrizione / Note</label>
          <textarea class="form-control" id="od-desc" rows="3" placeholder="Dettagli produzione, materiali, misure...">${o.desc||''}</textarea>
        </div>
        <div>
          <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:8px">🏷️ Stato</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">${statusButtons}</div>
        </div>
      </div>`;

    window._odStatus = curStat;

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.innerHTML = `
      <div style="background:var(--bg-card);border-radius:16px;padding:24px;max-width:580px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border);box-shadow:0 20px 60px rgba(0,0,0,.5)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div>
            <div style="font-size:16px;font-weight:800;color:var(--text)">📋 Dettaglio Ordine</div>
            <div style="font-size:10px;color:var(--text-dim);margin-top:2px">ID: ${o.id}</div>
          </div>
          <button onclick="this.closest('[style*=fixed]').remove()"
            style="background:var(--bg-card2);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;font-size:18px;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center">✕</button>
        </div>
        ${html}
        <div style="display:flex;gap:10px;margin-top:20px;justify-content:space-between">
          <button onclick="Orders.deleteOrder(${o.id},this.closest('[style*=fixed]'))"
            style="padding:10px 16px;background:var(--bg-card2);border:1px solid var(--border);color:#ef4444;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">
            🗑️ Elimina
          </button>
          <div style="display:flex;gap:10px">
            <button onclick="this.closest('[style*=fixed]').remove()"
              style="padding:10px 16px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text-muted);border-radius:8px;cursor:pointer;font-size:13px">
              Annulla
            </button>
            <button onclick="Orders.saveDetail(${o.id},this.closest('[style*=fixed]'))"
              style="padding:10px 24px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:800">
              💾 Salva
            </button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);
    modal.addEventListener('click', e=>{ if(e.target===modal) modal.remove(); });
  },

  // ── Save order from modal ─────────────────────────────────────────────────
  async saveDetail(id, modalEl){
    const orders = await AppStore.get('orders').catch(()=>[]);
    const o = orders.find(x=>x.id===id) || {id};
    o.name     = eid('od-name')?.value.trim()  || o.name  || '';
    o.client   = eid('od-client')?.value.trim()|| o.client|| '';
    var _vR=eid('od-value')?.value; o.value=(_vR!==undefined&&_vR!=='')?(parseFloat(_vR)||0):(o.value||0);
    o.dueDate  = eid('od-due')?.value          || o.dueDate  || '';
    o.priority = eid('od-priority')?.value     || o.priority || '';
    o.desc     = eid('od-desc')?.value         || o.desc     || '';
    o.status   = window._odStatus              || o.status   || 'backlog';
    o.updatedAt = new Date().toISOString();
    await IDB.put('orders',o);
    if(modalEl) modalEl.remove();
    await this.render();
    if(typeof Bus!=='undefined') Bus.emit('order:saved',{id});
    toast('Ordine salvato ✅','success');
  },

  // ── Delete order ──────────────────────────────────────────────────────────
  async deleteOrder(id, modalEl){
    if(!confirm('Eliminare questo ordine definitivamente?')) return;
    // v3.9: delete from BOTH orders AND pipeline
    await IDB.del('orders', id);
    try {
      const pl = await IDB.getAll('pipeline').catch(()=>[]);
      for (const r of pl) {
        if (r.id === id || r._sourceId === id) {
          await IDB.del('pipeline', r.id);
        }
      }
    } catch(e) { console.warn('[Orders.deleteOrder pipeline]', e); }
    AppStore.invalidate('orders');
    AppStore.invalidate('pipeline');
    if(modalEl) modalEl.remove();
    await this.render();
    if(typeof PipelineOS!=='undefined') (typeof PipelineOS!=='undefined'&&PipelineOS.render());
    if(typeof OrderFlow!=='undefined') (typeof OrderFlow!=='undefined'&&OrderFlow.render());
    toast('Ordine eliminato','success');
  },

  // ── Create new blank order then open it ───────────────────────────────────
  async save(){
    const clientEl = eid('ord-client');
    const clientId = clientEl?.value ? +clientEl.value : null;
    const clientName = clientId && clientEl.selectedIndex>=0 ? clientEl.options[clientEl.selectedIndex]?.text||'' : '';
    const order = {
      name:          eid('ord-title')?.value?.trim()||'Nuovo Ordine',
      clientId,
      client:        clientName,
      clientName,
      dueDate:       eid('ord-deadline')?.value||'',
      priority:      eid('ord-priority')?.value||'normal',
      value:         +eid('ord-value')?.value||0,
      estimatedTime: +eid('ord-estimated')?.value||0,
      desc:          eid('ord-notes')?.value||'',
      status:        this._defaultStage||'backlog',
      stage:         this._defaultStage||'backlog',
      updatedAt:     new Date().toISOString(),
    };
    if(this._editId){
      order.id = this._editId;
    } else {
      order.id = Date.now();
      order.createdAt = new Date().toISOString();
    }
    await IDB.put('orders', order).catch(e=>toast('Errore salvataggio: '+e.message,'error'));
    AppStore.invalidate('orders');
    // v3.5: sync to pipeline store
    try {
      const plRecs = await IDB.getAll('pipeline').catch(()=>[]);
      const existing = plRecs.find(r => r._sourceId===order.id || r.id===order.id);
      if (existing) {
        existing.stage  = order.status || order.stage || 'backlog';
        existing.status = order.status || 'backlog';
        existing.total = order.total||order.value||0;
        existing.clientName = order.clientName||order.client||'';
        existing.updatedAt = new Date().toISOString();
        await IDB.put('pipeline', existing);
      } else {
        await IDB.put('pipeline', {
          ...order,
          _source:   'orders',
          _sourceId: order.id,
          id:        Date.now() + Math.floor(Math.random()*9999) + 3,
          stage:     order.status || order.stage || 'backlog',
          status:    order.status || 'backlog',
          total:     order.total  || order.value  || 0,
          clientName:order.clientName || order.client || '',
          updatedAt: new Date().toISOString(),
        })
      }
      AppStore.invalidate('pipeline');
    } catch(ex) { console.warn('[v3.5 Orders.save pipeline]', ex); }
    toast(this._editId?'Ordine aggiornato!':'Ordine creato!','success');
    closeModal('orders');
    this._editId=null;
    await this.render();
  },

  newOrder(){
    const o = {
      id:        Date.now(),
      name:      '',
      client:    '',
      status:    'backlog',
      priority:  'media',
      dueDate:   '',
      value:     0,
      desc:      '',
      createdAt: new Date().toISOString(),
    };
    IDB.put('orders',o).then(()=>this.openDetail(o.id)).catch(e=>toast('Errore creazione ordine: '+e.message,'warning'));
  },

  // ── QR code modal ─────────────────────────────────────────────────────────
  showQR(id, label){
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`INGLY:ORDER:${id}:${label}`)}`;
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:28px;text-align:center;max-width:300px;width:100%">
        <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:12px">📦 QR Ordine #${id}</div>
        <img src="${qrUrl}" style="width:220px;height:220px;border-radius:8px;display:block;margin:0 auto 12px">
        <div style="font-size:12px;color:#64748b;margin-bottom:14px">${label}</div>
        <div style="display:flex;gap:8px;justify-content:center">
          <a href="${qrUrl}" download="QR_Ordine_${id}.png"
            style="padding:8px 14px;background:#0f172a;color:#fff;border-radius:8px;text-decoration:none;font-size:12px;font-weight:700">⬇️ PNG</a>
          <button onclick="window.print()"
            style="padding:8px 14px;background:#f1f5f9;color:#0f172a;border:none;border-radius:8px;cursor:pointer;font-size:12px">🖨️ Stampa</button>
          <button onclick="this.closest('[style*=fixed]').remove()"
            style="padding:8px 14px;background:#f1f5f9;color:#64748b;border:none;border-radius:8px;cursor:pointer;font-size:12px">Chiudi</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e=>{ if(e.target===modal) modal.remove(); });
  },
};

// ===== ④ BOOKING APPUNTAMENTI =====
const Produzione = {
  _suppliers: [],
  _shipments: [],

  async load() {
    try {
      this._suppliers = await IDB.getAll('suppliers').catch(()=>[]);
      this._shipments = await IDB.getAll('shipments').catch(()=>[]);
    } catch { this._suppliers = []; this._shipments = []; }
    await this.renderPickingList();
    this.renderSuppliers();
    this.renderShipments();
    await this._loadOrdersSelect();
  },

  async _loadOrdersSelect() {
    try {
      const orders = await AppStore.get('orders').catch(()=>[]);
      const sel = eid('ship-order-select');
      if (sel) {
        const inProd = (orders||[]).filter(o => o.status === 'in_produzione' || o.status === 'backlog');
        sel.innerHTML = '<option value="">— seleziona ordine —</option>' +
          inProd.map(o=>`<option value="${o.id}">${o.name||o.id} — ${o.client||''}</option>`).join('');
      }
    } catch {}
  },

  async renderPickingList() {
    const el = eid('picking-list');
    if (!el) return;
    try {
      const orders = await AppStore.get('orders').catch(()=>[]);
      const inProd = (orders||[]).filter(o => ['in_produzione','backlog','lavorazione'].includes(o.status));
      if (!inProd.length) { el.innerHTML='<div style="text-align:center;color:var(--text-dim);padding:20px;font-size:12px">Nessun ordine in produzione</div>'; return; }
      el.innerHTML = inProd.map(o=>`
        <div style="background:var(--bg-card2);border-radius:8px;padding:10px;margin-bottom:8px;border-left:3px solid var(--primary)">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-weight:700;font-size:12px">${o.name||o.id}</span>
            <span style="font-size:10px;color:var(--primary)">${o.priority||'media'}</span>
          </div>
          <div style="font-size:11px;color:var(--text-muted)">👤 ${o.client||'N/A'} · €${o.value||0}</div>
          ${o.desc?`<div style="font-size:10px;color:var(--text-dim);margin-top:4px">${o.desc.slice(0,80)}</div>`:''}
        </div>`).join('');
    } catch { el.innerHTML='<div style="color:var(--text-dim);font-size:12px;padding:10px">Errore caricamento ordini</div>'; }
  },

  async printPickingList() {
    try {
      const orders = await AppStore.get('orders').catch(()=>[]);
      const inProd = (orders||[]).filter(o => ['in_produzione','backlog','lavorazione'].includes(o.status));
      const w = window.open('','_blank');
      w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Lista Picking — ${new Date().toLocaleDateString('it-IT')}</title>
      <style>body{font-family:system-ui;padding:20px;color:#000}h1{font-size:18px;margin-bottom:16px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;font-size:12px;text-align:left}th{background:#f0f0f0;font-weight:700}.check{width:30px}@media print{button{display:none}}</style></head><body>
      <h1>📋 Lista Picking — ${new Date().toLocaleDateString('it-IT')}</h1>
      <p style="font-size:11px;color:#666;margin-bottom:12px">${inProd.length} ordini in produzione</p>
      <table><tr><th class="check">✓</th><th>Ordine</th><th>Cliente</th><th>Descrizione</th><th>Priorità</th><th>Valore</th></tr>
      ${inProd.map(o=>`<tr><td></td><td><strong>${o.name||o.id}</strong></td><td>${o.client||''}</td><td style="font-size:11px">${(o.desc||'').slice(0,80)}</td><td>${o.priority||'media'}</td><td>€${o.value||0}</td></tr>`).join('')}
      </table><button onclick="window.print()" style="margin-top:16px;padding:8px 16px;background:#000;color:#fff;border:none;cursor:pointer;border-radius:4px">🖨️ Stampa</button>
      </body></html>`);
    } catch { toast('Errerazione lista','warning'); }
  },

  addSupplier() {
    const name = prompt('Nome fornitore:');
    if (!name) return;
    const contact = prompt('Contatto (email o telefono):');
    const material = prompt('Materiale fornito:');
    const supplier = { id: Date.now().toString(), name, contact: contact||'', material: material||'', createdAt: new Date().toISOString() };
    IDB.put('suppliers', supplier).catch(()=>{});
    this._suppliers.push(supplier);
    this.renderSuppliers();
    toast('Fornitore aggiunto!','success');
  },

  renderSuppliers() {
    const el = eid('suppliers-list');
    if (!el) return;
    if (!this._suppliers.length) { el.innerHTML='<div style="text-align:center;color:var(--text-dim);padding:16px;font-size:12px">Nessun fornitore</div>'; return; }
    el.innerHTML = this._suppliers.map(s=>`
      <div style="background:var(--bg-card2);border-radius:8px;padding:10px;margin-bottom:8px">
        <div style="font-weight:700;font-size:12px">${s.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${s.material||''}</div>
        <div style="font-size:11px;color:var(--text-dim)">${s.contact||''}</div>
      </div>`).join('');
  },

  createShipment() {
    const orderId = eid('ship-order-select')?.value;
    const carrier = eid('ship-carrier')?.value || 'gls';
    const weight = eid('ship-weight')?.value || '0.5';
    if (!orderId) { toast('Seleziona un ordine','warning'); return; }
    const tracking = carrier.toUpperCase() + Date.now().toString().slice(-8);
    const ship = { id: Date.now().toString(), orderId, carrier, weight, tracking, status: 'creata', createdAt: new Date().toISOString() };
    IDB.put('shipments', ship).catch(()=>{});
    this._shipments.push(ship);
    this.renderShipments();
    const links = {
      poste: `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${tracking}`,
      gls: `https://gls-group.eu/IT/it/seguire-spedizione?match=${tracking}`,
      brt: `https://vas.brt.it/vas/sped_det_show.hsm?refSped=${tracking}`,
    };
    toast(`📦 Spedizione creata! Tracking: ${tracking}`,'success');
    if (links[carrier]) window.open(links[carrier],'_blank');
  },

  trackShipment() {
    const tracking = eid('ship-tracking')?.value?.trim();
    const carrier = eid('ship-track-carrier')?.value || 'gls';
    if (!tracking) { toast('Inserisci numero tracking','warning'); return; }
    const links = {
      poste: `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${tracking}`,
      gls: `https://gls-group.eu/IT/it/seguire-spedizione?match=${tracking}`,
      brt: `https://vas.brt.it/vas/sped_det_show.hsm?refSped=${tracking}`,
    };
    const el = eid('ship-track-result');
    if (el) el.innerHTML = `<a href="${links[carrier]||'#'}" target="_blank" style="color:var(--primary)">🔗 Apri tracking ${carrier.toUpperCase()}: ${tracking}</a>`;
    if (links[carrier]) window.open(links[carrier],'_blank');
  },

  renderShipments() {
    const el = eid('shipments-list');
    if (!el) return;
    if (!this._shipments.length) { el.innerHTML='<div style="color:var(--text-dim);font-size:11px;padding:8px">Nessuna spedizione</div>'; return; }
    el.innerHTML = this._shipments.slice(-10).reverse().map(s=>`
      <div style="background:var(--bg-card2);border-radius:6px;padding:8px;margin-bottom:6px">
        <div style="font-size:11px;font-weight:700">${s.tracking}</div>
        <div style="font-size:10px;color:var(--text-muted)">${s.carrier?.toUpperCase()} · ${new Date(s.createdAt).toLocaleDateString('it-IT')}</div>
      </div>`).join('');
  },
};

// ══════════════════════════════════════════════════════════════════
// DESIGN STUDIO — Temi, colori, logo
// ══════════════════════════════════════════════════════════════════
const Pipeline = {

  // ── Stato ufficiale del ciclo di vita ────────────────────────────────────────
  QUOTE_STATES: {
    bozza:      { label: '📝 Bozza',      color: '#64748b', next: ['in_attesa', 'annullato'] },
    in_attesa:  { label: '⏳ In Attesa',  color: '#6366f1', next: ['produzione', 'annullato'] },
    produzione: { label: '⚙️ Produzione', color: '#3b82f6', next: ['confermato', 'annullato'] },
    confermato: { label: '✅ Confermato', color: '#22c55e', next: ['annullato'] },
    annullato:  { label: '❌ Annullato',  color: '#ef4444', next: [] },
  },

  // ── Main entry: Workflow preme "Conferma Ordine" ─────────────────────────────
  async confirm(quoteId) {
    const q = await IDB.get('quotes', quoteId);
    if (!q) return toast('Preventivo non trovato', 'warning');
    if (!confirm(`Confermare "${q.name}" e mettere in lavorazione?\n\nQuesta azione:\n• Sposta il preventivo su "Confermato"\n• Crea/aggiorna l'ordine nel Kanban (In Lavorazione)\n• Registra la vendita "da pagare"`)) return;

    await snapshotRecord('quotes', quoteId);

    // 1. Aggiorna quote
    q.status = 'confermato';
    q.confirmedAt = new Date().toISOString();
    await IDB.put('quotes', q);

    // 2. Crea o aggiorna ordine Kanban
    let orderId = q.orderId;
    const existingOrders = await AppStore.get('orders').catch(() => []);
    const existingOrder = existingOrders.find(o => o.originQuote === quoteId);

    if (existingOrder) {
      existingOrder.status = 'working';
      existingOrder.updatedAt = new Date().toISOString();
      await IDB.put('orders', existingOrder);
      orderId = existingOrder.id;
    } else {
      orderId = Date.now();
      await IDB.put('orders', {
        id: orderId,
        name: q.name || 'Ordine da preventivo',
        client: q.clientName || '',
        clientId: q.clientId || null,
        status: 'working',
        priority: 'alta',
        dueDate: q.deadline || '',
        value: q.grossPrice || 0,
        desc: q.notes || '',
        originQuote: quoteId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // 3. Crea o aggiorna Sale "da_pagare"
    const existingSales = await AppStore.get('sales').catch(() => []);
    const existingSale = existingSales.find(s => s.originQuote === quoteId);
    let saleId;

    if (!existingSale) {
      saleId = Date.now() + 1;
      await IDB.put('sales', {
        id: saleId,
        clientId: q.clientId || null,
        clientName: q.clientName || '',
        date: new Date().toISOString().slice(0, 10),
        description: q.name || '',
        amount: q.grossPrice || 0,
        materialCost: q.totalCost || 0,
        status: 'da_pagare',
        channel: 'Diretto',
        originQuote: quoteId,
        originOrder: orderId,
      });
    } else {
      saleId = existingSale.id;
    }

    // 4. Collega i ref
    q.orderId = orderId;
    q.saleId = saleId;
    await IDB.put('quotes', q);

    // 5. Bus events → aggiorna tutto
    Bus.emit('pipeline:confirmed', { quoteId, orderId, saleId });
    Bus.emit('sale:created', { saleId, quoteId });

    toast(`✅ Confermato! Ordine in Kanban + Vendita registrata`, 'success');

    // 6. Ricarica sezioni attive
    await (async()=>{try{if(typeof Workflow!=='undefined')await Workflow.render();}catch(e){}}) ();
    if (typeof Orders !== 'undefined') await (async()=>{try{if(typeof Orders!=='undefined')await Orders.render();}catch(e){}}) ();

    return { quoteId, orderId, saleId };
  },

  // ── Quando uno stato quote cambia (da Workflow dropdown) ─────────────────────
  async onQuoteStatus(quoteId, newStatus) {
    if (newStatus === 'confermato') {
      return this.confirm(quoteId);
    }
    if (newStatus === 'produzione') {
      // Crea ordine Kanban "backlog" se non esiste
      const q = await IDB.get('quotes', quoteId);
      if (!q) return;
      const existing = (await AppStore.get('orders').catch(() => [])).find(o => o.originQuote === quoteId);
      if (!existing) {
        await IDB.put('orders', {
          id: Date.now(),
          name: q.name || 'Ordine bozza',
          client: q.clientName || '',
          clientId: q.clientId || null,
          status: 'backlog',
          priority: 'media',
          dueDate: q.deadline || '',
          value: q.grossPrice || 0,
          desc: q.notes || '',
          originQuote: quoteId,
          createdAt: new Date().toISOString(),
        });
        toast('📋 Ordine aggiunto al Kanban in "Da Fare"', 'success');
        if (typeof Orders !== 'undefined') (async()=>{try{if(typeof Orders!=='undefined')await Orders.render();}catch(e){}}) ();
      }
    }
    if (newStatus === 'annullato') {
      // Annulla la sale da_pagare collegata
      const existingSales = await AppStore.get('sales').catch(() => []);
      const s = existingSales.find(x => x.originQuote === quoteId && x.status === 'da_pagare');
      if (s) {
        s.status = 'annullato';
        await IDB.put('sales', s);
        toast('Vendita collegata annullata', 'success');
      }
    }
    // v17: emit global event for UI sync
    document.dispatchEvent(new CustomEvent('orderUpdated', {
      detail: { quoteId: quoteId, newStatus: newStatus }
    }));
    if(typeof AppStore!=='undefined') { AppStore.invalidate('orders'); AppStore.invalidate('pipeline'); }
  
  },

  // ── Quando una card Kanban cambia stato ────────────────────────────────────
  async onKanbanStatus(orderId, newStatus) {
    // v17 SSOT: delegate to updateOrderStatus
    return await window.updateOrderStatus(orderId, newStatus);
  },

  // ── Kanban → Ordine diretto da fornitore (Flusso C) ──────────────────────
  async newDirectOrder(data) {
    // data: { name, client, cost, markup, dueDate, desc, priority }
    const markup = parseFloat(data.markup) || 0;
    const cost = parseFloat(data.cost) || 0;
    const salePrice = cost * (1 + markup / 100);
    const orderId = Date.now();
    await IDB.put('orders', {
      id: orderId,
      name: data.name || 'Ordine Fornitore',
      client: data.client || '',
      status: 'backlog',
      priority: data.priority || 'media',
      dueDate: data.dueDate || '',
      value: +salePrice.toFixed(2),
      supplierCost: +cost.toFixed(2),
      markup: +markup.toFixed(1),
      desc: data.desc || '',
      isDirect: true,
      createdAt: new Date().toISOString(),
    });
    Bus.emit('pipeline:direct_order', { orderId });
    toast(`📦 Ordine fornitore creato. Prezzo vendita: ${fmtCur(salePrice)}`, '✅');
    if (typeof Orders !== 'undefined') (async()=>{try{if(typeof Orders!=='undefined')await Orders.render();}catch(e){}}) ();
    return orderId;
  },

  // ── Sync: riconcilia record orfani all'avvio ─────────────────────────────
  async sync() {
    try {
      const [quotes, orders, sales] = await Promise.all([
        IDB.getAll('quotes').catch(() => []),
        IDB.getAll('orders').catch(() => []),
        IDB.getAll('sales').catch(() => []),
      ]);
      let fixed = 0;
      // Quote "confermato" senza ordine collegato → crea backlog
      for (const q of quotes.filter(q => q.status === 'confermato' || q.status === 'produzione')) {
        const hasOrder = orders.some(o => o.originQuote === q.id);
        if (!hasOrder && q.status === 'confermato') {
          await IDB.put('orders', {
            id: Date.now() + Math.random() * 1000 | 0,
            name: q.name || 'Ordine recuperato',
            client: q.clientName || '',
            clientId: q.clientId || null,
            status: 'working',
            priority: 'media',
            dueDate: q.deadline || '',
            value: q.grossPrice || 0,
            desc: q.notes || '',
            originQuote: q.id,
            createdAt: q.createdAt || new Date().toISOString(),
            synced: true,
          });
          fixed++;
        }
      }
      if (fixed > 0) {
        console.log(`[Pipeline.sync] Riconciliati ${fixed} ordini orfani`);
        Bus.emit('pipeline:synced', { fixed });
      }
    } catch (e) {
      console.warn('[Pipeline.sync] Error:', e);
    }
  },
};

// ── Auto-sync on app load ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(async function(){
    try{ var _qs=await IDB.getAll('quotes').catch(()=>[]); if(_qs.length>0) Pipeline.sync(); }
    catch(e){ Pipeline.sync(); }
  }, 2000);
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH Workflow.setStatus — chiama Pipeline quando necessario
// Sostituisce il comportamento di default solo per gli stati critici
// ══════════════════════════════════════════════════════════════════════════════
(function patchWorkflow() {
  const _origSet = Workflow?.setStatus?.bind(Workflow);
  if (!_origSet) { setTimeout(patchWorkflow, 400); return; }

  Workflow.setStatus = async function(id, status) {
    // Per "confermato" → usa Pipeline (fa tutto)
    if (status === 'confermato') {
      return Pipeline.onQuoteStatus(id, 'confermato');
    }
    // Per gli altri stati → comportamento standard + Pipeline side effects
    const q = await IDB.get('quotes', id);
    if (!q) return;
    await snapshotRecord('quotes', id);
    q.status = status;
    await IDB.put('quotes', q);
    await logAction('quote', id, 'status_changed', { status });
    toast('Stato aggiornato', 'info');
    await this.render();
    // Side effects Pipeline (non bloccanti)
    Pipeline.onQuoteStatus(id, status).catch(() => {});
  };

  // Sostituisce anche il bottone "Conferma" → "✅ Conferma Ordine"
  const _origRender = Workflow.render?.bind(Workflow);
  if (_origRender) {
    Workflow.render = async function() {
      await _origRender();
      // Post-render: sostituisce testo bottone e aggiunge nuovo stato
      const el = eid('workflow-kanban');
      if (!el) return;
      // Add "Annullato" column if not present
      const cols = el.querySelectorAll('.kanban-col');
      if (cols.length === 4) {
        const annullatoCol = document.createElement('div');
        annullatoCol.className = 'kanban-col';
        annullatoCol.innerHTML = `
          <div class="kanban-col-header">
            <span style="color:#ef4444">❌ Annullato</span>
            <span class="badge badge-gray" id="wf-annullato-cnt">0</span>
          </div>
          <div id="wf-annullato-items"><div style="text-align:center;padding:24px 12px;color:var(--text-dim);font-size:12px"><i class="fas fa-ban" style="display:block;font-size:20px;margin-bottom:6px;opacity:.3"></i>Nessuno</div></div>`;
        el.appendChild(annullatoCol);
        // Populate annullato
        const quotes = await AppStore.get('quotes').catch(() => []);
        const ann = quotes.filter(q => q.status === 'annullato');
        const cnt = eid('wf-annullato-cnt');
        const items = eid('wf-annullato-items');
        if (cnt) cnt.textContent = ann.length;
        if (items && ann.length) {
          items.innerHTML = ann.map(q => `
            <div class="kanban-card" style="opacity:.6;border-left:3px solid #ef4444">
              <div class="kanban-card-title" style="font-size:11px">${q.name || '—'}</div>
              <div class="kanban-card-meta" style="margin-top:4px">
                <span>${q.clientName || '—'}</span>
                <span style="color:var(--primary)">${fmtCur(q.grossPrice || 0)}</span>
              </div>
              <button onclick="Workflow.delQuote(${q.id})" style="margin-top:6px;padding:3px 8px;background:#ef444420;color:#ef4444;border:1px solid #ef444440;border-radius:4px;cursor:pointer;font-size:10px">🗑️ Rimuovi</button>
            </div>`).join('');
        }
      }
      // Replace all "Conferma" buttons with "✅ Conferma Ordine"
      el.querySelectorAll('.act-confirm').forEach(btn => {
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Conferma Ordine';
        // Extract id from onclick
        const m = btn.getAttribute('onclick')?.match(/(\d+)/);
        if (m) {
          btn.setAttribute('onclick', `Pipeline.onQuoteStatus(${m[1]},'confermato')`);
        }
      });
    };
  }
})();

// ── Patch Orders.move() to call Pipeline ─────────────────────────────────────
(function patchOrdersMove() {
  const _waitForOrders = () => {
    if (typeof Orders === 'undefined' || !Orders.move) { setTimeout(_waitForOrders, 500); return; }
    const _origMove = Orders.move.bind(Orders);
    Orders.move = async function(id, newStatus) {
      await _origMove(id, newStatus);
      Pipeline.onKanbanStatus(id, newStatus).catch(() => {});
    };
  };
  setTimeout(_waitForOrders, 800);
})();

// ══════════════════════════════════════════════════════════════════════════════
// VERNICI & BOMBOLETTE MODULE v55
// Store IDB: paints — con RAL lookup table, colore visuale, stock, fornitori
// ══════════════════════════════════════════════════════════════════════════════
const OrderFlow = {

  // ── Stage definitions — 3 macro groups ────────────────────────────────
  DEFAULT_STAGES: [
    // PRE-VENDITA
    { id:'draft',      label:'📝 Bozza',           color:'#94a3b8', group:'pre',  next:'sent'       },
    { id:'sent',       label:'✉️ Inviato',           color:'#3b82f6', group:'pre',  next:'negotiating' },
    { id:'negotiating',label:'💬 In Trattativa',    color:'#f97316', group:'pre',  next:'accepted'   },
    { id:'accepted',   label:'✅ Accettato',         color:'#22c55e', group:'pre',  next:'production' },
    { id:'lost',       label:'❌ Perso',             color:'#6b7280', group:'pre',  next:null         },
    // PRODUZIONE
    { id:'production', label:'⚙️ Da Produrre',      color:'#f59e0b', group:'prod', next:'working'    },
    { id:'working',    label:'🔧 In Lavorazione',   color:'#fb923c', group:'prod', next:'completed'  },
    { id:'paused',     label:'⏸️ In Pausa',          color:'#6b7280', group:'prod', next:'working'    },
    { id:'completed',  label:'🏁 Completato',        color:'#10b981', group:'prod', next:'delivery'   },
    // LOGISTICA & PAGAMENTO
    { id:'delivery',   label:'📦 Pronto Sped.',      color:'#6366f1', group:'post', next:'delivered'  },
    { id:'delivered',  label:'🚚 Consegnato',        color:'#0ea5e9', group:'post', next:'to_pay'     },
    { id:'to_pay',     label:'💶 Da Pagare',         color:'#ef4444', group:'post', next:'paid'       },
    { id:'deposit',    label:'💳 Acconto Ricevuto',  color:'#f97316', group:'post', next:'paid'       },
    { id:'paid',       label:'💰 Pagato',            color:'#16a34a', group:'post', next:null         },
    { id:'rejected',   label:'🚫 Annullato',         color:'#dc2626', group:'post', next:null         },
  ],

  // Backward compat: map old stage IDs
  _stageAlias: { 'ready':'sent', 'in_attesa':'sent', 'bozza':'draft',
                  'produzione':'production', 'confermato':'accepted' },

  _stages: null,
  _filter: 'all',
  _searchQuery: '',
  _dragging: null,
  _orders: [],
  _stagesCache: [],

  async stages() {
    if (this._stages) return this._stages;
    try {
      const custom = await IDB.getAll('workflow_steps').catch(()=>[]);
      if (custom && custom.length >= 3) {
        this._stages = custom.sort((a,b)=>a.order-b.order);
      } else {
        this._stages = this.DEFAULT_STAGES;
        for (let i=0; i<this._stages.length; i++)
          await IDB.put('workflow_steps', {...this._stages[i], order:i}).catch(()=>{});
      }
    } catch(e) { this._stages = this.DEFAULT_STAGES; }
    return this._stages;
  },

  _resolveStage(order, stages) {
    const id = this._stageAlias[order.stage] || order.stage || 'draft';
    return stages.find(s=>s.id===id) || stages[0];
  },

  setFilter(f) { this._filter = f; this._stages = null; },
  search(q)    { this._searchQuery = (q||'').toLowerCase().trim(); this._renderBoard(); },
  filterByStage(f) { this._filter = f; this._renderBoard(); },

  // ── Main render ─────────────────────────────────────────────────────────
  async render() {
    const board = eid('ofe-board');
    if (!board) return;
    const stages = await this.stages();
    const orders = await AppStore.get('orders').catch(()=>[]);
    this._orders = orders;
    this._stagesCache = stages;
    this._renderKPIs(orders, stages);
    this._renderBoard();
    const badge = eid('pos-order-badge');
    if (badge) badge.textContent = `${orders.filter(o=>!['paid','rejected','lost'].includes(o.stage)).length} attivi`;
  },

  // ── KPI strip ───────────────────────────────────────────────────────────
  _renderKPIs(orders, stages) {
    const el = eid('ofe-kpis');
    if (!el) return;
    const toCollect = orders.filter(o=>['to_pay','deposit'].includes(o.stage))
      .reduce((a,o)=>a+(o.total||0)-(o.depositAmount||0)-(o.paidAmount||0), 0);
    const paidMonth = orders.filter(o=>{
      if(o.stage!=='paid') return false;
      const d=new Date(o.updatedAt||o.createdAt||0), n=new Date();
      return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();
    }).reduce((a,o)=>a+(+o.total||+o.value||0),0);
    const overdue = orders.filter(o=>o.dueDate&&new Date(o.dueDate)<new Date()&&!['paid','rejected','lost','delivered'].includes(o.stage)).length;

    el.innerHTML = [
      {l:'Preventivi',     v:orders.filter(o=>['draft','sent','negotiating'].includes(o.stage)).length, c:'#94a3b8', icon:'📋'},
      {l:'In Produzione',  v:orders.filter(o=>['production','working'].includes(o.stage)).length,        c:'#f59e0b', icon:'⚙️'},
      {l:'Da Consegnare',  v:orders.filter(o=>['delivery','delivered'].includes(o.stage)).length,         c:'#6366f1', icon:'📦'},
      {l:'Da Riscuotere',  v:fmtCur(Math.max(0,toCollect)),                                              c:'#ef4444', icon:'💶'},
      {l:'Incassato Mese', v:fmtCur(paidMonth),                                                          c:'#22c55e', icon:'💰'},
      ...(overdue>0?[{l:'Scaduti',      v:overdue,                                                       c:'#b91c1c', icon:'⚠️'}]:[]),
    ].map(k=>`<div class="kpi-card" style="border-left:3px solid ${k.c};cursor:default">
      <div style="font-size:18px;margin-bottom:4px">${k.icon}</div>
      <div class="kpi-value" style="color:${k.c}">${k.v}</div>
      <div class="kpi-label">${k.l}</div>
    </div>`).join('');
  },

  // ── Render board — 3 MACRO GROUPS ──────────────────────────────────────
  _renderBoard() {
    const el = eid('ofe-board');
    if (!el) return;
    const stages = this._stagesCache || this.DEFAULT_STAGES;
    let orders = this._orders || [];

    // Apply search filter
    if (this._searchQuery) {
      const q = this._searchQuery;
      orders = orders.filter(o=>
        (o.clientName||'').toLowerCase().includes(q)||
        (o.name||'').toLowerCase().includes(q)||
        (o.orderNum||'').toLowerCase().includes(q)
      );
    }

    // Apply macro-group filter
    let groupsToShow = ['pre','prod','post'];
    if (this._filter==='pre_prod')   groupsToShow=['pre'];
    if (this._filter==='production') groupsToShow=['prod'];
    if (this._filter==='payments')   groupsToShow=['post'];

    const groups = [
      { id:'pre',  label:'📋 Pre-Vendita',           color:'#3b82f6' },
      { id:'prod', label:'⚙️ Produzione',             color:'#f59e0b' },
      { id:'post', label:'📦 Logistica & Pagamento',  color:'#6366f1' },
    ].filter(g=>groupsToShow.includes(g.id));

    el.innerHTML = `<div style="display:flex;gap:16px;align-items:flex-start;min-height:300px">
      ${groups.map(group=>{
        const groupStages = stages.filter(s=>s.group===group.id&&s.id!=='rejected');
        const groupOrders = orders.filter(o=>{
          const stg = this._stageAlias[o.stage]||o.stage||'draft';
          return groupStages.some(s=>s.id===stg);
        });
        const groupTotal = groupOrders.reduce((a,o)=>a+(+o.total||+o.value||0),0);

        return `<div style="flex:1;min-width:0;background:var(--bg-card);border-radius:14px;border:1.5px solid ${group.color}30;overflow:hidden;display:flex;flex-direction:column">
          <!-- Macro-group header -->
          <div style="background:${group.color}15;padding:10px 14px;border-bottom:1px solid ${group.color}25;display:flex;align-items:center;gap:8px">
            <div style="font-size:13px;font-weight:800;color:${group.color};flex:1">${group.label}</div>
            <div style="background:${group.color};color:#fff;border-radius:10px;padding:2px 9px;font-size:11px;font-weight:800">${groupOrders.length}</div>
            ${groupTotal>0?`<div style="font-size:10px;color:${group.color};font-weight:700">${fmtCur(groupTotal)}</div>`:''}
          </div>
          <!-- Stage sub-sections -->
          <div style="padding:10px;display:flex;flex-direction:column;gap:8px;min-height:120px;overflow-y:auto;max-height:calc(100vh - 280px)">
            ${groupStages.map(stage=>{
              const stageOrders = orders.filter(o=>(this._stageAlias[o.stage]||o.stage||'draft')===stage.id)
                .sort((a,b)=>{
                  // Sort: overdue first, then by dueDate, then by createdAt
                  const aOver = a.dueDate&&new Date(a.dueDate)<new Date()?1:0;
                  const bOver = b.dueDate&&new Date(b.dueDate)<new Date()?1:0;
                  if(aOver!==bOver) return bOver-aOver;
                  if(a.dueDate&&b.dueDate) return new Date(a.dueDate)-new Date(b.dueDate);
                  return new Date(b.createdAt||0)-new Date(a.createdAt||0);
                });
              if(!stageOrders.length&&groupOrders.length>0) return ''; // hide empty sub-stages when group has orders
              return `<div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
                  <div style="width:8px;height:8px;border-radius:50%;background:${stage.color};flex-shrink:0"></div>
                  <div style="font-size:10px;font-weight:700;color:${stage.color};flex:1">${stage.label}</div>
                  ${stageOrders.length?`<span style="font-size:10px;background:${stage.color}25;color:${stage.color};border-radius:8px;padding:1px 6px;font-weight:700">${stageOrders.length}</span>`:''}
                  ${stageOrders.length?`<span style="font-size:9px;color:var(--text-dim);font-weight:600">€${stageOrders.reduce((a,o)=>a+(+o.total||+o.value||+o.grossPrice||0),0).toFixed(0)}</span>`:''}
                </div>
                <div style="display:flex;flex-direction:column;gap:5px"
                  ondragover="event.preventDefault()" ondrop="OrderFlow._onDrop(event,'${stage.id}')">
                  ${stageOrders.map(o=>this._card(o,stage,stages)).join('')}
                  ${!stageOrders.length?`<div style="text-align:center;padding:12px 8px;color:var(--text-dim);font-size:10px;border:1px dashed var(--border);border-radius:7px">Nessun ordine</div>`:''}
                </div>
              </div>`;
            }).filter(Boolean).join('')}
            ${groupStages.every(s=>!orders.some(o=>(this._stageAlias[o.stage]||o.stage||'draft')===s.id))?
              `<div style="text-align:center;padding:20px 8px;color:var(--text-dim);font-size:11px;opacity:.5">
                <i class="fas fa-inbox" style="display:block;font-size:20px;margin-bottom:6px;opacity:.4"></i>
                Nessun ordine in questa fase
              </div>`:''}
          </div>
          ${group.id==='pre'?`<div style="padding:6px 10px;border-top:1px solid var(--border)">
            <button onclick="PipelineOS.openCreate()" style="width:100%;padding:7px;background:var(--bg-card2);border:1px dashed var(--border);border-radius:7px;color:var(--text-muted);cursor:pointer;font-size:11px">
              <i class="fas fa-plus"></i> Nuovo Preventivo
            </button>
          </div>`:''}
        </div>`;
      }).join('')}
    </div>`;
  },

  // ── Order card ──────────────────────────────────────────────────────────
  _card(o, stage, stages) {
    const isOverdue = o.dueDate && new Date(o.dueDate)<new Date() && !['paid','delivered','rejected','lost'].includes(o.stage);
    const priorityColors = { bassa:'#6b7280', media:'#f59e0b', alta:'#ef4444', urgente:'#b91c1c' };
    const pc = priorityColors[o.priority||'media'];
    const payBadge = {
      deposit: '<span style="background:#f97316;color:#fff;font-size:9px;padding:1px 6px;border-radius:4px;font-weight:700">ACCONTO</span>',
      partial:  '<span style="background:#fbbf24;color:#000;font-size:9px;padding:1px 6px;border-radius:4px;font-weight:700">PARZIALE</span>',
      paid:     '<span style="background:#22c55e;color:#fff;font-size:9px;padding:1px 6px;border-radius:4px;font-weight:700">PAGATO</span>',
    }[o.paymentStatus||''] || '';
    // v10: sale status badge
    const saleBadge = o.linkedSaleId ? '<span style="background:#22c55e22;color:#22c55e;font-size:9px;padding:1px 6px;border-radius:4px;font-weight:700;border:1px solid #22c55e40">💰 VENDITA</span>' :
      (o.stage==='sold'||o.soldAt) ? '<span style="background:#22c55e;color:#fff;font-size:9px;padding:1px 6px;border-radius:4px;font-weight:700">💰 VENDUTO</span>' :
      (o.stage==='invoiced'||o.invoicedAt) ? '<span style="background:#a78bfa;color:#fff;font-size:9px;padding:1px 6px;border-radius:4px;font-weight:700">🧾 FATTURATO</span>' :
      (o.stage==='delivered') ? '<span style="background:#3b82f622;color:#3b82f6;font-size:9px;padding:1px 6px;border-radius:4px;font-weight:700;border:1px solid #3b82f640">📦 CONSEGNATO</span>' : '';
    const nextStage = stages.find(s=>s.id===stage.next);

    return `<div class="ofe-card" data-id="${o.id}"
      draggable="true"
      ondragstart="OrderFlow._onDragStart(event,${o.id})"
      onclick="OrderFlow.openDetail(${o.id})"
      style="background:var(--bg-card2);border:1px solid ${isOverdue?'#ef4444':stage.color+'35'};border-radius:9px;padding:10px 12px;cursor:pointer;transition:all .15s;${isOverdue?'border-left:3px solid #ef4444':''}"
      onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 14px rgba(0,0,0,.25)'"
      onmouseout="this.style.transform='';this.style.boxShadow=''">
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px">
        <div style="width:30px;height:30px;border-radius:50%;background:${(()=>{const n=o.clientName||'';let h=0;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))%360;return 'hsl('+h+',55%,42%)'})()};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff;flex-shrink:0;letter-spacing:0;text-shadow:0 1px 2px rgba(0,0,0,.3)">
          ${(o.clientName||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?'}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px">${o.name||'Ordine #'+o.id}</div>
          <div style="font-size:11px;color:var(--primary);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px">${o.clientName||'—'}</div>
        </div>
        ${isOverdue?`<div style="font-size:10px;color:#ef4444;font-weight:700;flex-shrink:0">⚠️</div>`:''}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
        <div style="font-size:13px;font-weight:800;color:${stage.color}">${fmtCur(o.total||o.value||0)}</div>
        <div style="display:flex;gap:4px;align-items:center">
          ${payBadge}${saleBadge}
          ${o.priority&&o.priority!=='media'?`<span style="font-size:9px;background:${pc}20;color:${pc};border-radius:4px;padding:1px 5px;font-weight:700">${(o.priority||'').toUpperCase()}</span>`:''}
        </div>
      </div>
      ${o.dueDate?`<div style="font-size:10px;color:${isOverdue?'#ef4444':'var(--text-muted)'};margin-top:4px">📅 ${new Date(o.dueDate).toLocaleDateString('it-IT')}</div>`:''}
      <div style="display:flex;gap:4px;margin-top:7px;flex-wrap:wrap" onclick="event.stopPropagation()">
        ${nextStage?`<button onclick="window.OrderFlow&&window.OrderFlow.moveStage(${o.id},'${nextStage.id}')" style="flex:1;padding:4px 8px;background:${stage.color};border:none;border-radius:5px;color:#fff;cursor:pointer;font-size:10px;font-weight:700">→ ${nextStage.label.replace(/[^\x20-\x7E]/g,'').trim().split(' ').slice(0,2).join(' ')}</button>`:''}
        <button onclick="OrderFlow.openDetail(${o.id})" title="Dettaglio" style="padding:4px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:5px;color:var(--text-muted);cursor:pointer;font-size:10px">📋</button>
        <button onclick="event.stopPropagation();OrderQuickNote.open(${o.id},(o.name||String(o.id)))" title="Nota rapida" style="padding:4px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:5px;color:var(--text-muted);cursor:pointer;font-size:10px">📝</button>
        ${(["sold","invoiced","delivered","paid"].includes(o.stage||o.status||""))?`<button onclick="event.stopPropagation();window._archiveOrder&&window._archiveOrder(${o.id})" title="Archivia questo ordine completato" style="padding:4px 8px;background:#6b728015;border:1px solid #6b728030;border-radius:5px;color:#9ca3af;cursor:pointer;font-size:10px">📦</button>`:""}
      </div>
    </div>`;
  },

  // ── Drag & Drop ─────────────────────────────────────────────────────────
  _onDragStart(e, id) { this._dragging = id; e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',id); },
  async _onDrop(e, stageId) {
    e.preventDefault();
    const id = parseInt(this._dragging||e.dataTransfer.getData('text/plain'));
    if (!id) return;
    await this.moveStage(id, stageId);
  },

  // ── Move order ──────────────────────────────────────────────────────────
  async moveStage(id, stageId) {
    id = typeof id === 'string' ? (+id || id) : id;
    const result = await window.updateOrderStatus(id, stageId);
    if(!result) return;
    // Re-render sezione attiva
    const sec = App?.currentSection;
    if(sec==='orders'||sec==='gestione_ordini') {
      setTimeout(()=>{try{this.render();}catch(_e){}}, 150);
    }
    toast(stageId === 'venduto' ? '💰 Ordine venduto!' : '✅ Stato aggiornato: '+stageId, 'success');
    return result;
  },

  // ── Open order detail drawer — TABBED ──────────────────────────────────
  async openDetail(id) {
    // FIX: coerce id to number (onclick attr passes string)
    id = typeof id === 'string' ? +id || id : id;
    let drawer = eid('ofe-drawer');
    let body   = eid('ofe-drawer-body');
    if (!drawer||!body) return;
    // v5.2: Ensure drawer is at body level for correct z-index stacking
    if (drawer.parentElement !== document.body) {
      document.body.appendChild(drawer);
    }
    // v3.6: cerca in orders, poi in pipeline per _sourceId
    let o = await IDB.get('orders', id).catch(()=>null);
    if (!o) {
      const pl = await IDB.getAll('pipeline').catch(()=>[]);
      const plEntry = pl.find(x=>x.id===id || x._sourceId===id);
      if (plEntry) o = await IDB.get('orders', plEntry._sourceId).catch(()=>null) || plEntry;
    }
    if (!o) return;
    const stages = await this.stages();
    const stage  = this._resolveStage(o, stages);
    body.dataset.orderId = id;
    body.dataset.activeTab = body.dataset.activeTab || 'overview';

    const renderTab = (tab) => {
      switch(tab) {
        case 'overview': return this._drawerTabOverview(o, stage, stages);
        case 'items':    return this._drawerTabItems(o);
        case 'payments': return this._drawerTabPayments(o);
        case 'timeline': return this._drawerTabTimeline(id);
        default:         return this._drawerTabOverview(o, stage, stages);
      }
    };

    const activeTab = body.dataset.activeTab || 'overview';
    const tabs = [
      {id:'overview', label:'📋 Dettaglio'},
      {id:'items',    label:'📦 Voci'},
      {id:'payments', label:'💰 Pagamenti'},
      {id:'timeline', label:'📅 Timeline'},
    ];

    body.innerHTML = `
      <!-- Header -->
      <div id="drawer-save-status" style="font-size:9px;color:#22c55e;text-align:right;padding:3px 0;min-height:14px;opacity:0;transition:opacity 1s"></div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)">
        <div style="width:38px;height:38px;border-radius:50%;background:${stage.color}20;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:${stage.color};flex-shrink:0">
          ${(o.clientName||'?')[0].toUpperCase()}
        </div>
        <div style="flex:1;min-width:0">
          <input type="text" value="${(o.name||'Ordine #'+o.id).replace(/"/g,'&quot;')}"
            onblur="window.OrderFlow&&window.OrderFlow.updateField(${o.id},'name',this.value)"
            onkeydown="if(event.key==='Enter')this.blur()"
            style="font-size:15px;font-weight:800;color:var(--text);background:transparent;border:none;border-bottom:1px solid transparent;outline:none;width:100%;padding:0 0 1px 0;transition:border-color .15s"
            onfocus="this.style.borderBottomColor='var(--primary)'"
            onblur2="this.style.borderBottomColor='transparent'"
            title="Clicca per modificare il nome ordine">
          <div style="font-size:11px;color:var(--text-muted)">${o.ingCode||o.orderNum||'#'+o.id} · ${o.clientName||'—'}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px">
          <button onclick="window.OrderFlow&&window.OrderFlow.downloadPDF(${o.id})" title="📄 Scarica PDF ordine"
            style="padding:5px 10px;background:#fbbf2415;border:1px solid #6366f140;border-radius:7px;color:#a5b4fc;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap">
            <i class="fas fa-file-pdf"></i> PDF
          </button>
          <button onclick="window.OrderFlow&&window.OrderFlow.convertToSale(${o.id})"
            title="Segna come vendita incassata"
            style="padding:5px 10px;background:#22c55e18;border:1px solid #22c55e40;border-radius:7px;color:#22c55e;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap">
            💶 → Vendita
          </button>
          <button onclick="window.OrderFlow&&window.OrderFlow.deleteOrder(${o.id})"
            style="padding:4px 10px;background:#ef444418;border:1px solid #ef444440;border-radius:7px;color:#ef4444;cursor:pointer;font-size:11px;font-weight:700">
            🗑 Elimina
          </button>
          <button onclick="const dr=eid('ofe-drawer');if(dr)dr.style.display='none';const bd=document.getElementById('ofe-backdrop');if(bd)bd.remove();(typeof OrderFlow!=='undefined'&&OrderFlow.render())"
            style="padding:4px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text-muted);cursor:pointer;font-size:11px">
            Chiudi ✕
          </button>
        </div>
      </div>

      <!-- Stage badge + quick move -->
      <div style="display:inline-flex;align-items:center;gap:8px;background:${stage.color}18;border:1px solid ${stage.color}40;border-radius:8px;padding:5px 12px;margin-bottom:10px">
        <div style="width:8px;height:8px;border-radius:50%;background:${stage.color}"></div>
        <span style="font-size:12px;font-weight:700;color:${stage.color}">${stage.label}</span>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:3px;background:var(--bg-card2);padding:3px;border-radius:8px;margin-bottom:14px" id="ofe-tabs">
        ${tabs.map(t=>`<button
          onclick="window.OrderFlow&&window.OrderFlow._switchTab('${t.id}',${id})"
          id="tab-btn-${t.id}"
          style="flex:1;padding:5px 6px;border-radius:6px;border:none;cursor:pointer;font-size:10px;font-weight:600;transition:.15s;${activeTab===t.id?'background:var(--bg-card);color:var(--primary)':'background:transparent;color:var(--text-muted)'}">
          ${t.label}
        </button>`).join('')}
      </div>

      <!-- Tab content -->
      <div id="ofe-tab-content">${renderTab(activeTab)}</div>
    `;

    drawer.style.display = 'block';
    // v4.6: backdrop per click-outside
    let _bd = document.getElementById('ofe-backdrop');
    if(!_bd){ _bd = document.createElement('div'); _bd.id='ofe-backdrop';
      _bd.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9400';
      _bd.onclick=(e)=>{ 
        // Only close if click was ON the backdrop, not on the drawer
        const dr = document.getElementById('ofe-drawer');
        if (dr && dr.contains(e.target)) return;
        drawer.style.display='none'; _bd.remove(); 
        if(typeof OrderFlow!=='undefined') (typeof OrderFlow!=='undefined'&&OrderFlow.render());
        if(typeof PipelineOS!=='undefined') (typeof PipelineOS!=='undefined'&&PipelineOS.render());
      };
      document.body.appendChild(_bd); }
  },

  async _switchTab(tab, id) {
    const body = eid('ofe-drawer-body');
    if (!body) return;
    body.dataset.activeTab = tab;
    // Update tab button styles
    ['overview','items','payments','timeline'].forEach(t=>{
      const btn = document.getElementById(`tab-btn-${t}`);
      if (btn) { btn.style.background = t===tab?'var(--bg-card)':'transparent'; btn.style.color = t===tab?'var(--primary)':'var(--text-muted)'; }
    });
    const o = await IDB.get('orders', id).catch(()=>null);
    if (!o) return;
    const stages = await this.stages();
    const stage  = this._resolveStage(o, stages);
    const content = eid('ofe-tab-content');
    if (!content) return;
    switch(tab) {
      case 'overview':  content.innerHTML = this._drawerTabOverview(o, stage, stages); break;
      case 'items':     content.innerHTML = this._drawerTabItems(o); break;
      case 'payments':  content.innerHTML = this._drawerTabPayments(o); break;
      case 'timeline':  content.innerHTML = await this._drawerTabTimelineAsync(id); break;
    }
  },

  // ── TAB: Overview ────────────────────────────────────────────────────────
  _drawerTabOverview(o, stage, stages) {
    const priorityColors = { bassa:'#6b7280', media:'#f59e0b', alta:'#ef4444', urgente:'#b91c1c' };
    return `
      <!-- Move to stage -->
      <div style="margin-bottom:14px">
        <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">↕ Sposta a fase</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${stages.filter(s=>s.id!==o.stage&&s.id!=='rejected'&&s.id!=='lost').map(s=>`
            <button onclick="window.OrderFlow&&window.OrderFlow.moveStage(${o.id},'${s.id}')"
              style="padding:4px 9px;background:${s.color}18;border:1px solid ${s.color}40;border-radius:6px;color:${s.color};cursor:pointer;font-size:10px;font-weight:700">${s.label}</button>`).join('')}
          <button onclick="window.OrderFlow&&window.OrderFlow.moveStage(${o.id},'rejected')"
            style="padding:4px 9px;background:#ef444420;border:1px solid #ef444440;border-radius:6px;color:#ef4444;cursor:pointer;font-size:10px;font-weight:700">🚫 Annulla</button>
        </div>
      </div>

      <!-- Info grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div style="background:var(--bg-card2);border-radius:9px;padding:10px">
          <div style="font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">CLIENTE</div>
          <div style="font-size:13px;font-weight:700;color:var(--text)">${o.clientName||'—'}</div>
        </div>
        <div style="background:var(--bg-card2);border-radius:9px;padding:10px;border:1px solid #10b98140">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <div style="font-size:9px;font-weight:700;color:#10b981;text-transform:uppercase">💶 TOTALE</div>
            <button onclick="window.OrderFlow&&window.OrderFlow._updateTotal(${o.id},+document.getElementById('ov-total-${o.id}').value)" style="padding:2px 8px;background:#10b98120;border:1px solid #10b98150;border-radius:5px;cursor:pointer;font-size:9px;font-weight:700;color:#10b981">💾 Salva</button>
          </div>
          <div style="display:flex;align-items:center;gap:4px">
            <span style="font-size:13px;color:var(--text-muted);font-weight:700">€</span>
            <input type="number" step="0.01" min="0"
              id="ov-total-${o.id}"
              value="${(+(o.total||o.value||0)).toFixed(2)}"
              onblur="window.OrderFlow&&window.OrderFlow._updateTotal(${o.id},+this.value)"
              onkeydown="if(event.key==='Enter'){this.blur();}"
              style="background:transparent;border:none;border-bottom:2px solid #10b98180;font-size:16px;font-weight:900;color:#10b981;cursor:text;width:100%;outline:none;padding:2px 0"
              onfocus="this.style.borderBottomColor='#10b981';this.select()"
              title="Modifica il totale — premi Invio o clicca 'Salva'">
          </div>
        </div>
        </div>
        <div style="background:var(--bg-card2);border-radius:9px;padding:10px">
          <div style="font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">PRIORITÀ</div>
          <select onchange="window.OrderFlow&&window.OrderFlow.updateField(${o.id},'priority',this.value);this.style.color=document.getElementById('pr-color-${o.id}')?.textContent"
            style="background:transparent;border:none;font-size:12px;font-weight:700;color:${priorityColors[o.priority||'media']||'#f59e0b'};cursor:pointer;width:100%;outline:none">
            ${['bassa','media','alta','urgente'].map(p=>`<option value="${p}" ${o.priority===p?'selected':''} style="color:${priorityColors[p]}">${p.charAt(0).toUpperCase()+p.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div style="background:var(--bg-card2);border-radius:9px;padding:10px">
          <div style="font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">SCADENZA</div>
          <input type="date" value="${o.dueDate||''}" onchange="window.OrderFlow&&window.OrderFlow.updateField(${o.id},'dueDate',this.value)"
            style="background:transparent;border:none;font-size:12px;color:var(--text);cursor:pointer;width:100%;outline:none">
        </div>
      </div>

      <!-- Note -->
      <div style="margin-bottom:12px">
        <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:5px">📝 Note di produzione</div>
        <textarea rows="3" onblur="window.OrderFlow&&window.OrderFlow.updateField(${o.id},'notes',this.value)"
          style="width:100%;padding:8px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;resize:vertical;font-family:inherit"
          placeholder="Note interne, istruzioni di produzione...">${o.notes||''}</textarea>
      </div>

      <!-- Imponibile / IVA summary -->
      <!-- IVA Rate Selector -->
      <div style="margin-bottom:10px">
        <div style="font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">🧾 ALIQUOTA IVA</div>
        <select onchange="window.OrderFlow&&window.OrderFlow.updateField(${o.id},'vatRate',+this.value/100)"
          style="background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;padding:5px 10px;color:var(--text);font-size:12px;font-weight:700;width:100%;cursor:pointer">
          <option value="0"   ${(!o.vatRate||o.vatRate===0)?'selected':''}>0% — Esente / Forfettario</option>
          <option value="4"   ${(o.vatRate===0.04)?'selected':''}>4% — Ridotta</option>
          <option value="10"  ${(o.vatRate===0.10)?'selected':''}>10% — Ridotta</option>
          <option value="22"  ${(!o.vatRate||o.vatRate===0.22)?'selected':''}>22% — Ordinaria</option>
        </select>
      </div>
      ${(o.subtotal||o.tax)?`<div style="background:var(--bg-card2);border-radius:9px;padding:10px;border:1px solid var(--border)">
        <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">💶 Dettaglio Fiscale</div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--text-muted)">Imponibile</span>
          <span style="font-weight:700">${fmtCur(o.subtotal||0)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--text-muted)">IVA ${o.vatRate?Math.round(o.vatRate*100)+'%':''}</span>
          <span style="font-weight:700">${fmtCur(o.tax||0)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:5px 0;font-weight:800">
          <span>Totale</span>
          <span style="color:#10b981">${fmtCur(o.total||0)}</span>
        </div>
      </div>`:''}
    `;
  },

  // ── TAB: Items ───────────────────────────────────────────────────────────
  _drawerTabItems(o) {
    const items = o.items||[];
    const oid   = o.id;

    if (!items.length) return `
      <div style="text-align:center;padding:30px;color:var(--text-muted)">
        <i class="fas fa-box" style="font-size:28px;opacity:.3;display:block;margin-bottom:10px"></i>
        Nessuna voce
      </div>
      <button onclick="window.OrderFlow&&window.OrderFlow._addItemToOrder(${oid})"
        style="width:100%;padding:8px;background:var(--primary-dim);border:1px dashed var(--primary);border-radius:8px;cursor:pointer;font-size:12px;color:var(--primary);font-weight:700;margin-top:8px">
        <i class="fas fa-plus"></i> Aggiungi Voce
      </button>`;

    return `
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <span>VOCI ORDINE (modificabili)</span>
        <button onclick="window.OrderFlow&&window.OrderFlow._addItemToOrder(${oid})"
          style="padding:3px 10px;background:var(--primary);color:#000;border:none;border-radius:5px;cursor:pointer;font-size:10px;font-weight:700">
          <i class="fas fa-plus"></i> Aggiungi
        </button>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${items.map((it,idx)=>{
          const itTotal = +(((it.price||0)*(it.qty||1))*(1+(it.vatRate||0))).toFixed(2);
          const itCost  = (it.costPrice||it.cost||0)*(it.qty||1);
          const margin  = itTotal - itCost;
          return `<div style="background:var(--bg-card2);border-radius:9px;padding:10px 12px;border:1px solid var(--border)">
            <!-- Row 1: description editable -->
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:7px">
              <input type="text" value="${(it.desc||it.name||'Voce '+(idx+1)).replace(/"/g,'&quot;')}"
                onchange="window.OrderFlow&&window.OrderFlow._updateItemField(${oid},${idx},'desc',this.value)"
                style="flex:1;background:transparent;border:none;border-bottom:1px solid var(--border);font-size:12px;font-weight:700;color:var(--text);padding:2px 0;outline:none"
                title="Clicca per modificare la descrizione">
              <button onclick="window.OrderFlow&&window.OrderFlow._removeItemFromOrder(${oid},${idx})"
                style="padding:2px 7px;background:#ef444415;border:1px solid #ef444440;border-radius:5px;cursor:pointer;font-size:10px;color:#ef4444">✕</button>
            </div>
            <!-- Row 2: qty + prezzo + costo editabili -->
            <div style="display:grid;grid-template-columns:60px 1fr 1fr 1fr;gap:6px;align-items:center">
              <div>
                <div style="font-size:9px;color:var(--text-muted);font-weight:700;margin-bottom:2px">QTÀ</div>
                <input type="number" min="0.01" step="0.01" value="${it.qty||1}"
                  onchange="window.OrderFlow&&window.OrderFlow._updateItemField(${oid},${idx},'qty',+this.value)"
                  style="width:100%;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:4px 6px;font-size:12px;font-weight:700;color:var(--text);text-align:center">
              </div>
              <div>
                <div style="font-size:9px;color:var(--primary);font-weight:700;margin-bottom:2px">PREZZO €</div>
                <input type="number" min="0" step="0.01" value="${(it.price||0).toFixed(2)}"
                  onchange="window.OrderFlow&&window.OrderFlow._updateItemField(${oid},${idx},'price',+this.value)"
                  style="width:100%;background:var(--bg-card);border:1px solid var(--primary-border);border-radius:6px;padding:4px 6px;font-size:12px;font-weight:800;color:var(--primary);text-align:right"
                  title="Prezzo di vendita unitario">
              </div>
              <div>
                <div style="font-size:9px;color:var(--text-muted);font-weight:700;margin-bottom:2px">COSTO €</div>
                <input type="number" min="0" step="0.01" value="${(it.costPrice||it.cost||0).toFixed(2)}"
                  onchange="window.OrderFlow&&window.OrderFlow._updateItemField(${oid},${idx},'costPrice',+this.value)"
                  style="width:100%;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:4px 6px;font-size:11px;color:var(--text-muted);text-align:right">
              </div>
              <div style="text-align:right">
                <div style="font-size:9px;color:var(--text-muted);font-weight:700;margin-bottom:2px">TOTALE</div>
                <div style="font-size:14px;font-weight:900;color:#10b981">${fmtCur(itTotal)}</div>
                ${itCost?`<div style="font-size:9px;color:${margin>0?'#22c55e':'#ef4444'}">mgn: ${fmtCur(margin)}</div>`:''}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <!-- Totale dinamico -->
      <div id="items-footer-${oid}" style="background:var(--bg-card);border-radius:9px;padding:11px 14px;border:1px solid var(--primary-border);margin-top:10px">
        ${OrderFlow._itemsFooter(items)}
      </div>`;
  },

  // Helper: calcola footer totale voci
  _itemsFooter(items) {
    const impon  = items.reduce((a,i)=>a+(i.price||0)*(i.qty||1),0);
    const ivaAmt = items.reduce((a,i)=>a+(i.price||0)*(i.qty||1)*(i.vatRate||0),0);
    const total  = impon + ivaAmt;
    const cost   = items.reduce((a,i)=>a+((i.costPrice||i.cost||0)*(i.qty||1)),0);
    const margin = total - cost;
    return `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
      <span style="color:var(--text-muted)">Imponibile</span><span style="font-weight:700">${fmtCur(impon)}</span>
    </div>
    ${ivaAmt>0?`<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
      <span style="color:var(--text-muted)">IVA</span><span style="font-weight:700">${fmtCur(ivaAmt)}</span>
    </div>`:''}
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;border-top:1px solid var(--border);padding-top:6px;margin-top:2px">
      <span>Totale</span><span style="color:#10b981">${fmtCur(total)}</span>
    </div>
    ${cost?`<div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px">
      <span style="color:var(--text-muted)">Margine stimato</span>
      <span style="font-weight:700;color:${margin>0?'#22c55e':'#ef4444'}">${fmtCur(margin)} (${impon>0?Math.round(margin/impon*100):0}%)</span>
    </div>`:''}`;
  },

  // ── TAB: Payments ────────────────────────────────────────────────────────
  _drawerTabPayments(o) {
    const remaining = Math.max(0, (+(o.total||o.value)||0) - (o.depositAmount||0) - (o.paidAmount||0));
    const _oTot = +(o.total||o.value)||0; const paidPct = _oTot>0 ? Math.round(((o.depositAmount||0)+(o.paidAmount||0))/_oTot*100) : 0;
    return `
      <div style="display:flex;flex-direction:column;gap:10px">
        <!-- Summary bar -->
        <div style="background:var(--bg-card2);border-radius:10px;padding:14px;border:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:11px;color:var(--text-muted)">Incassato</span>
            <span style="font-size:12px;font-weight:700;color:#22c55e">${paidPct}%</span>
          </div>
          <div style="height:8px;background:var(--bg-card3);border-radius:99px;overflow:hidden;margin-bottom:10px">
            <div style="height:100%;background:linear-gradient(90deg,#22c55e,#10b981);border-radius:99px;width:${paidPct}%;transition:width .5s"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
            <div>
              <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Totale</div>
              <div style="display:flex;align-items:center;gap:3px">
                <span style="font-size:11px;color:var(--text-muted)">€</span>
                <input type="number" step="0.01" min="0"
                  value="${(+(o.total||o.value||0)).toFixed(2)}"
                  onchange="window.OrderFlow&&window.OrderFlow._updateTotal(${o.id},+this.value)"
                  style="background:transparent;border:none;border-bottom:1px solid var(--border);font-size:14px;font-weight:800;color:var(--text);width:80px;outline:none;padding:0"
                  title="Clicca per modificare">
              </div>
            </div><div style="font-size:14px;font-weight:800;color:var(--text)">${fmtCur(o.total||o.value||0)}</div></div>
            <div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Incassato</div><div style="font-size:14px;font-weight:800;color:#22c55e">${fmtCur((o.depositAmount||0)+(o.paidAmount||0))}</div></div>
            <div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Residuo</div><div style="font-size:14px;font-weight:800;color:${remaining>0?'#ef4444':'#22c55e'}">${fmtCur(remaining)}</div></div>
          </div>
        </div>

        <!-- Payment form -->
        <div style="background:var(--bg-card2);border-radius:10px;padding:14px;border:1px solid var(--border)">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:10px">Aggiorna Pagamento</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
            <div>
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">Stato pagamento</div>
              <select id="pay-status-${o.id}"
                style="width:100%;padding:7px 9px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px">
                <option value="none"    ${(o.paymentStatus||'none')==='none'   ?'selected':''}>💳 Nessuno</option>
                <option value="deposit" ${o.paymentStatus==='deposit'          ?'selected':''}>💳 Acconto</option>
                <option value="partial" ${o.paymentStatus==='partial'          ?'selected':''}>💳 Parziale</option>
                <option value="paid"    ${o.paymentStatus==='paid'             ?'selected':''}>✅ Pagato</option>
              </select>
            </div>
            <div>
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">Acconto (€)</div>
              <input id="pay-dep-${o.id}" type="number" step="0.01" min="0" value="${o.depositAmount||0}"
                style="width:100%;padding:7px 9px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px">
            </div>
            <div>
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">Pagato (€)</div>
              <input id="pay-paid-${o.id}" type="number" step="0.01" min="0" value="${o.paidAmount||0}"
                style="width:100%;padding:7px 9px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px">
            </div>
            <div>
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">Data pagamento</div>
              <input id="pay-date-${o.id}" type="date" value="${o.paymentDate||''}"
                style="width:100%;padding:7px 9px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px">
            </div>
          </div>
          ${(o.paymentStatus!=="paid"&&!["paid","rejected"].includes(o.stage))?`
          <button onclick="window.OrderFlow&&window.OrderFlow.moveStage(${o.id},'to_pay');OrderFlow._savePayment(${o.id})"
            style="width:100%;padding:10px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;margin-bottom:8px">
            💶 Segna Da Pagare
          </button>`:""}
          <button onclick="window.OrderFlow&&window.OrderFlow._savePayment(${o.id})"
            style="width:100%;padding:10px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer">
            💾 Salva Pagamento
          </button>
        </div>
      </div>`;
  },

  // ── TAB: Timeline ────────────────────────────────────────────────────────
  _drawerTabTimeline(id) {
    return `<div id="timeline-async" style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px">
      <i class="fas fa-spinner fa-spin"></i> Caricamento...
    </div>`;
    // Load async
    setTimeout(()=>this._drawerTabTimelineAsync(id).then(html=>{ const el=eid('timeline-async'); if(el)el.outerHTML=html; }), 0);
  },

  async _drawerTabTimelineAsync(id) {
    const events = (await IDB.getAll('order_events').catch(()=>[])).filter(e=>e.orderId===id).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
    if (!events.length) return `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px">Nessun evento registrato</div>`;
    return `<div style="display:flex;flex-direction:column;gap:0">
      ${events.map((ev,i)=>`<div style="display:flex;gap:10px;padding:8px 0;${i<events.length-1?'border-bottom:1px solid var(--border)':''}">
        <div style="width:8px;height:8px;border-radius:50%;background:var(--primary);margin-top:4px;flex-shrink:0"></div>
        <div style="flex:1">
          <div style="font-size:12px;color:var(--text)">${ev.event||ev.stage||'—'}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${new Date(ev.ts).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>`).join('')}
    </div>`;
  },

  // ── Save payment from drawer ─────────────────────────────────────────────
  async _savePayment(id) {
    id = typeof id === 'string' ? +id || id : id;
    const o = await IDB.get('orders', id).catch(()=>null);
    if (!o) return;
    o.paymentStatus  = document.getElementById(`pay-status-${id}`)?.value || o.paymentStatus;
    o.depositAmount  = parseFloat(document.getElementById(`pay-dep-${id}`)?.value) || 0;
    o.paidAmount     = parseFloat(document.getElementById(`pay-paid-${id}`)?.value) || 0;
    o.paymentDate    = document.getElementById(`pay-date-${id}`)?.value || '';
    o.updatedAt      = new Date().toISOString();
    // Auto-mark paid if full amount received
    const oTotal = +o.total||+o.value||0;
    if (oTotal > 0 && o.depositAmount + o.paidAmount >= oTotal) {
      o.paymentStatus = 'paid';
      o.stage = 'paid';
    } else if (oTotal === 0 && (o.depositAmount > 0 || o.paidAmount > 0)) {
      // Total not set — update it from what was paid
      o.total = o.value = o.depositAmount + o.paidAmount;
    }
    await IDB.put('orders', o);
    await IDB.put('order_events', {id:Date.now(), orderId:id, event:`Pagamento aggiornato: ${o.paymentStatus} — acconto ${fmtCur(o.depositAmount)} / pagato ${fmtCur(o.paidAmount)}`, stage:o.stage, ts:new Date().toISOString()}).catch(()=>{});
    AppStore.invalidate('orders');AppStore.invalidate('pipeline');
    if(typeof PipelineOS!=='undefined'){const _o=await IDB.get('orders',id).catch(()=>null);if(_o){const _idx=(PipelineOS._orders||[]).findIndex(x=>x.id===id);if(_idx>=0)PipelineOS._orders[_idx]={...PipelineOS._orders[_idx],..._o};PipelineOS._renderCoda(PipelineOS._orders);PipelineOS._renderProduzione(PipelineOS._orders);PipelineOS._renderKPIs(PipelineOS._orders,PipelineOS._sales||[]);}}
    toast('✅ Pagamento salvato');
    await this.openDetail(id); // refresh drawer
    this.render();
  },

  // ── PDF generation from order ────────────────────────────────────────────
  async downloadPDF(id) {
    const o = await IDB.get('orders', id).catch(()=>null);
    if (!o) return toast && toast('Ordine non trovato','error');
    const cfg = await IDB.get('settings','main').catch(()=>({}));
    const biz = cfg?.businessInfo || cfg || {};

    // Fetch linked quote if any
    let quote = null;
    if (o.quoteId) quote = await IDB.get('quotes', o.quoteId).catch(()=>null);

    // Product image: order.photo > linked quote image > null
    const productImg = o.photo || o.image || (quote?.productImage) || null;

    // Status labels
    const stageLabels = {
      backlog:'In lista',lead:'Lead',preventivo:'Preventivo',
      confermato:'Confermato',produzione:'In produzione',
      spedizione:'Spedizione',consegnato:'Consegnato',
      venduto:'Venduto ✓',annullato:'Annullato'
    };
    const stageColors = {
      backlog:'#64748b',lead:'#3b82f6',preventivo:'#8b5cf6',
      confermato:'#10b981',produzione:'#f59e0b',spedizione:'#6366f1',
      consegnato:'#22c55e',venduto:'#10b981',annullato:'#ef4444'
    };

    // Build inline HTML preview (iframe approach — no jsPDF needed, works on all devices)
    const ingCode = o.ingCode || o.orderNum || ('ING-'+String(o.id).slice(-4).padStart(4,'0'));
    const dateStr = new Date(o.createdAt||Date.now()).toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'});
    const stageLabel = stageLabels[o.stage||o.status] || (o.stage||o.status||'—');
    const stageColor = stageColors[o.stage||o.status] || '#64748b';

    const companyName = biz.name||biz.company||'INGLY LASER';
    const companyPiva = biz.piva||'';
    const companyEmail = biz.email||'';
    const companyPhone = biz.phone||'';
    const companyIban = biz.iban||'';

    // Items rows
    const items = o.items||[];
    const rowsHTML = items.length ? items.map((it,i)=>{
      const tot = it.total||it.subtotal||(+(it.price||0))*(+(it.qty||1));
      const disc = it.discount||o.discount||0;
      const origPrice = disc>0 ? `<div style="font-size:10px;color:#94a3b8;text-decoration:line-through">€${(tot/(1-disc/100)).toFixed(2)}</div>` : '';
      const discBadge = disc>0 ? `<span style="background:#f0fdf4;color:#16a34a;font-size:9px;padding:1px 5px;border-radius:99px;font-weight:700">-${disc}%</span>` : '';
      return `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
        <td style="padding:10px 14px;font-size:12px;color:#1e293b;font-weight:500">
          ${it.desc||it.name||'—'}
          ${it.catLabel?`<div style="font-size:10px;color:#94a3b8">${it.catLabel}</div>`:''}
        </td>
        <td style="padding:10px 8px;text-align:center;font-size:12px;color:#64748b">${it.qty||1}</td>
        <td style="padding:10px 8px;text-align:center;font-size:11px;color:#94a3b8">${it.unit||'pz'}</td>
        <td style="padding:10px 14px;text-align:right;font-size:12px;color:#64748b">€${(+(it.price||0)).toFixed(2)}</td>
        <td style="padding:10px 14px;text-align:right">
          ${origPrice}
          <span style="font-size:13px;font-weight:700;color:#1e293b">€${tot.toFixed(2)}</span>${discBadge}
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8;font-style:italic">Nessuna voce dettagliata — importo totale: €${(+(o.total||o.value||0)).toFixed(2)}</td></tr>`;

    const total = +(o.total||o.value||0);
    const subtotal = +(o.subtotal||total);
    const tax = +(o.tax||0);
    const paidAmt = +(o.paidAmount||0);
    const remaining = Math.max(0, total-paidAmt);

    const html = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8">
<title>Ordine ${ingCode} — ${o.clientName||o.client||''}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#f1f5f9;print-color-adjust:exact;-webkit-print-color-adjust:exact}
.page{max-width:860px;margin:0 auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.1)}
@page{size:A4;margin:10mm}
@media print{body{background:#fff}.no-print{display:none!important}.page{box-shadow:none}}
</style></head><body>
<div class="page">
  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,#0d0d14 60%,#1a0a1a);padding:28px 34px;border-bottom:3px solid #fbbf24">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px">
      <div>
        <div style="font-size:24px;font-weight:900;color:#fbbf24;letter-spacing:-.5px">${companyName}</div>
        ${biz.tagline||biz.slogan?`<div style="font-size:11px;color:rgba(251,191,36,.6);margin-top:4px;font-style:italic">${biz.tagline||biz.slogan}</div>`:''}
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:3px">
          ${companyPiva?`<div style="font-size:10px;color:rgba(255,255,255,.5)">P.IVA: ${companyPiva}</div>`:''}
          ${companyEmail?`<div style="font-size:10px;color:rgba(255,255,255,.5)">Email: ${companyEmail}</div>`:''}
          ${companyPhone?`<div style="font-size:10px;color:rgba(255,255,255,.5)">Tel: ${companyPhone}</div>`:''}
          ${companyIban?`<div style="font-size:10px;color:rgba(255,255,255,.5)">IBAN: ${companyIban}</div>`:''}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="background:rgba(251,191,36,.12);border:2px solid rgba(251,191,36,.4);border-radius:12px;padding:14px 20px;display:inline-block;min-width:160px">
          <div style="font-size:9px;color:rgba(251,191,36,.5);text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">Ordine di Lavoro</div>
          <div style="font-size:28px;font-weight:900;color:#fbbf24;line-height:1">${ingCode}</div>
          <div style="font-size:10px;color:rgba(251,191,36,.5);margin-top:8px;padding-top:6px;border-top:1px solid rgba(251,191,36,.2)">${dateStr}</div>
        </div>
        <div style="margin-top:8px">
          <span style="padding:4px 14px;background:${stageColor}20;color:${stageColor};border:1.5px solid ${stageColor}50;border-radius:99px;font-size:11px;font-weight:700">${stageLabel}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- BODY -->
  <div style="padding:24px 34px">

    <!-- CLIENT + PRODUCT INFO -->
    <div style="display:flex;gap:20px;margin-bottom:20px">
      <div style="flex:1;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:14px 16px">
        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Cliente</div>
        <div style="font-size:16px;font-weight:800;color:#0f172a">${o.clientName||o.client||'—'}</div>
        ${o.clientEmail?`<div style="font-size:11px;color:#64748b;margin-top:3px">${o.clientEmail}${o.clientPhone?' · '+o.clientPhone:''}</div>`:''}
        <div style="margin-top:8px;font-size:13px;font-weight:600;color:#1e293b">${o.name||'Lavoro personalizzato'}</div>
        ${o.dueDate||o.deadline?`<div style="font-size:11px;color:#f59e0b;margin-top:3px">📅 Consegna: ${new Date(o.dueDate||o.deadline).toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'})}</div>`:''}
      </div>
      ${productImg ? `
      <div style="flex-shrink:0;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center;min-width:160px">
        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">📷 Prodotto / Riferimento</div>
        <img src="${productImg}" style="max-width:150px;max-height:150px;object-fit:contain;border-radius:8px;border:1px solid #e2e8f0;background:#fff;padding:4px" alt="Foto prodotto">
        ${o.material||o.materialName?`<div style="font-size:10px;color:#64748b;margin-top:5px">🪵 ${o.material||o.materialName}</div>`:''}
        ${o.dimensions?`<div style="font-size:10px;color:#64748b;margin-top:2px">📐 ${o.dimensions}</div>`:''}
      </div>` : ''}
    </div>

    <!-- ITEMS TABLE -->
    <div style="font-size:10px;font-weight:700;color:#fbbf24;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid rgba(251,191,36,.25)">
      Dettaglio voci ${quote?`· collegato a Preventivo ${quote.number||quote.id||''}`:''} 
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
      <thead>
        <tr style="background:linear-gradient(135deg,#0d0d14,#1a0a1a)">
          <th style="padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#fbbf24;text-transform:uppercase;letter-spacing:.5px">Descrizione</th>
          <th style="padding:9px 8px;text-align:center;font-size:10px;font-weight:700;color:#fbbf24;text-transform:uppercase">Qtà</th>
          <th style="padding:9px 8px;text-align:center;font-size:10px;font-weight:700;color:#fbbf24;text-transform:uppercase">U.M.</th>
          <th style="padding:9px 14px;text-align:right;font-size:10px;font-weight:700;color:#fbbf24;text-transform:uppercase">Prezzo/u</th>
          <th style="padding:9px 14px;text-align:right;font-size:10px;font-weight:700;color:#fbbf24;text-transform:uppercase">Totale</th>
        </tr>
      </thead>
      <tbody>${rowsHTML}</tbody>
    </table>

    <!-- TOTALS -->
    ${(o.total||o.value)?`
    <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
      <div style="min-width:280px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
        ${subtotal&&subtotal!==total?`<div style="display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b"><span>Subtotale</span><span>€${subtotal.toFixed(2)}</span></div>`:''}
        ${tax?`<div style="display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b"><span>IVA</span><span>€${tax.toFixed(2)}</span></div>`:''}
        ${paidAmt>0?`<div style="display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#16a34a;font-weight:600"><span>✅ Acconto ricevuto</span><span>€${paidAmt.toFixed(2)}</span></div>`:''}
        <div style="display:flex;justify-content:space-between;padding:12px 16px;background:linear-gradient(135deg,#0d0d14,#1a0a1a)">
          <span style="font-size:14px;font-weight:700;color:#fff">TOTALE</span>
          <span style="font-size:20px;font-weight:900;color:#fbbf24">€${total.toFixed(2)}</span>
        </div>
        ${paidAmt>0&&remaining>0?`<div style="display:flex;justify-content:space-between;padding:8px 14px;background:#fef2f2;font-size:12px;color:#ef4444;font-weight:700"><span>💳 Saldo da pagare</span><span>€${remaining.toFixed(2)}</span></div>`:''}
      </div>
    </div>`:''}

    <!-- PAYMENT + NOTES -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div>
        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Pagamento</div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;font-size:12px;color:#475569">
          ${({none:'⏳ Da pagare',deposit:'💰 Acconto ricevuto',partial:'🔄 Pagamento parziale',paid:'✅ Pagato'})[o.paymentStatus||'none']||'⏳ Da pagare'}
          ${companyIban?`<div style="font-size:10px;color:#94a3b8;margin-top:4px">IBAN: ${companyIban}</div>`:''}
        </div>
      </div>
      ${o.notes?`<div>
        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Note</div>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;font-size:11px;color:#92400e;line-height:1.6">${o.notes}</div>
      </div>`:
      `<div>
        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Canale / Fonte</div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;font-size:12px;color:#475569">${o.channel||o.source||'—'}</div>
      </div>`}
    </div>
  </div>

  <!-- FOOTER -->
  <div style="background:linear-gradient(135deg,#0d0d14,#1a0a1a);padding:12px 34px;border-top:2px solid rgba(251,191,36,.25);display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,.35)">
    <span>${companyName} · ${ingCode}</span>
    <span>INGLY OS v16</span>
    <span>${dateStr}</span>
  </div>
</div>
</body></html>`;

    // Show preview modal
    const existing = document.getElementById('_order-pdf-preview'); if(existing) existing.remove();
    const ov = document.createElement('div');
    ov.id = '_order-pdf-preview';
    ov.style.cssText='position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.85);display:flex;flex-direction:column;overflow:hidden';
    const tb = document.createElement('div');
    tb.style.cssText='width:100%;background:#1a1a2e;border-bottom:1px solid rgba(255,255,255,.1);padding:10px 18px;display:flex;align-items:center;gap:12px;flex-shrink:0';
    tb.innerHTML=`<span style="font-size:16px">📄</span>`
      +`<span style="font-size:14px;font-weight:800;color:#fff;flex:1">Ordine ${ingCode} — ${o.clientName||o.client||''}</span>`
      +`<button id="_opdf-print" style="padding:8px 20px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1a1200;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">🖨️ Stampa / Salva PDF</button>`
      +`<button id="_opdf-dl" style="padding:8px 14px;background:rgba(96,165,250,.12);color:#60a5fa;border:1.5px solid rgba(96,165,250,.25);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">⬇️ HTML</button>`
      +`<button onclick="document.getElementById('_order-pdf-preview').remove()" style="padding:8px 14px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.15);border-radius:9px;cursor:pointer">✕</button>`;
    ov.appendChild(tb);
    const hint=document.createElement('div');
    hint.style.cssText='width:100%;background:rgba(251,191,36,.08);border-bottom:1px solid rgba(251,191,36,.15);padding:6px 18px;font-size:11px;color:#fbbf24;text-align:center;flex-shrink:0';
    hint.textContent='💡 Clicca "Stampa / Salva PDF" → Destinazione: "Salva come PDF"';
    ov.appendChild(hint);
    const fw=document.createElement('div');
    fw.style.cssText='flex:1;overflow-y:auto;background:#525659;display:flex;justify-content:center;padding:18px';
    const iframe=document.createElement('iframe');
    iframe.style.cssText='width:900px;min-height:900px;border:none;border-radius:4px;box-shadow:0 8px 32px rgba(0,0,0,.5);background:#fff';
    fw.appendChild(iframe); ov.appendChild(fw); document.body.appendChild(ov);
    try {
      const doc=iframe.contentDocument||iframe.contentWindow.document;
      doc.open(); doc.write(html); doc.close();
    } catch(e) {
      const b=new Blob([html],{type:'text/html'});
      iframe.src=URL.createObjectURL(b);
    }
    document.getElementById('_opdf-print').onclick=()=>{try{iframe.contentWindow.focus();iframe.contentWindow.print();}catch(e){const w=window.open('','_blank');if(w){w.document.write(html);w.document.close();w.print();}}};
    document.getElementById('_opdf-dl').onclick=()=>{
      const a=document.createElement('a');
      a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));
      a.download='Ordine-'+ingCode+'-'+(o.clientName||'Cliente').replace(/[^a-zA-Z0-9]/g,'_')+'.html';
      a.click();
    };
    document.addEventListener('keydown', function esc(e){
      if(e.key==='Escape'){const p=document.getElementById('_order-pdf-preview');if(p)p.remove();document.removeEventListener('keydown',esc);}
    });
  },

  // ── Update field ─────────────────────────────────────────────────────────
  // ── Update total (and value for backward compat) ────────────────────────────
  async _updateTotal(id, newTotal) {
    id = typeof id === 'string' ? +id || id : id;
    const o = await IDB.get('orders', id).catch(()=>null);
    if (!o) return;
    newTotal = Math.max(0, +newTotal||0);
    // Store total as entered — user has agreed on this price
    // IVA breakdown only if vatRate is explicitly set
    const vat = o.vatRate || 0;
    o.total    = newTotal;
    o.value    = newTotal; // backward compat
    // Recalculate subtotal/tax only if we know items or vatRate
    if (vat > 0 && o.items && o.items.length > 0) {
      // Items-based: recalculate from items
      const impon   = o.items.reduce((a,x)=>(+a)+(+x.price||0)*(+x.qty||1), 0);
      const ivaAmt  = o.items.reduce((a,x)=>(+a)+(+x.price||0)*(+x.qty||1)*(+x.vatRate||vat), 0);
      const ratio   = impon > 0 ? newTotal / (impon + ivaAmt) : 1;
      o.subtotal = +((impon * ratio)).toFixed(2);
      o.tax      = +(newTotal - o.subtotal).toFixed(2);
    } else if (vat > 0) {
      // No items: split by vatRate
      o.subtotal = +(newTotal/(1+vat)).toFixed(2);
      o.tax      = +(newTotal - o.subtotal).toFixed(2);
    } else {
      // No IVA: total = subtotal, tax = 0
      o.subtotal = newTotal;
      o.tax      = 0;
    }
    o.updatedAt = new Date().toISOString();
    await IDB.put('orders', o);
    // Also update pipeline store (source of truth for refreshPipelineViews)
    try { const pl = await IDB.getAll('pipeline').catch(()=>[]); const pe = pl.find(r=>r.id===o.id||r._sourceId===o.id); if(pe){pe.total=o.total;pe.value=o.value;pe.subtotal=o.subtotal;pe.tax=o.tax;pe.updatedAt=o.updatedAt;await IDB.put('pipeline',pe);} } catch(e){}
    // FIX: invalidate cache immediately
    AppStore.invalidate('orders');
    AppStore.invalidate('pipeline');
    // Refresh summary row in the drawer
    const fiscDiv = document.getElementById('ov-fiscal-'+id);
    if (fiscDiv) fiscDiv.outerHTML = OrderFlow._fiscalSummary(o);
    // Update in-memory list and re-render Coda + Produzione
    if (typeof PipelineOS !== 'undefined') {
      const idx = (PipelineOS._orders||[]).findIndex(x=>x.id===id||x._sourceId===id);
      if (idx >= 0) PipelineOS._orders[idx] = {...PipelineOS._orders[idx], ...o};
      PipelineOS._renderCoda(PipelineOS._orders);
      PipelineOS._renderProduzione(PipelineOS._orders);
      PipelineOS._renderKPIs(PipelineOS._orders, PipelineOS._sales||[]);
      PipelineOS._renderPaySummary(PipelineOS._orders, PipelineOS._sales||[]);
    }
    toast('💶 Totale aggiornato: ' + fmtCur(newTotal));
    // Visual confirmation in drawer
    const dss = document.getElementById('drawer-save-status');
    if(dss){ dss.textContent='✅ Salvato ' + new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}); dss.style.opacity='1'; setTimeout(()=>dss.style.opacity='0',3000); }
  },

  async updateField(id, field, value) {
    id = typeof id === 'string' ? +id || id : id;
    const o = await IDB.get('orders', id).catch(()=>null);
    if (!o) { console.warn('[updateField] not found:', id); return; }
    o[field] = value;
    o.updatedAt = new Date().toISOString();
    await IDB.put('orders', o);
    // Also update pipeline store
    try { const pl = await IDB.getAll('pipeline').catch(()=>[]); const pe = pl.find(r=>r.id===o.id||r._sourceId===o.id); if(pe){Object.assign(pe,{[field]:value,updatedAt:o.updatedAt});await IDB.put('pipeline',pe);} } catch(e){}
    // FIX: invalidate cache so Coda/Produzione see fresh data
    AppStore.invalidate('orders');
    AppStore.invalidate('pipeline');
    toast('✅ Salvato');
    const dss2 = document.getElementById('drawer-save-status');
    if(dss2){ dss2.textContent='✅ Salvato ' + new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}); dss2.style.opacity='1'; setTimeout(()=>dss2.style.opacity='0',3000); }
    // Soft refresh: update the in-memory orders list and re-render Coda + Produzione
    if (typeof PipelineOS !== 'undefined') {
      const idx = (PipelineOS._orders||[]).findIndex(x=>x.id===id||x._sourceId===id);
      if (idx >= 0) PipelineOS._orders[idx] = {...PipelineOS._orders[idx], ...o};
      else PipelineOS._orders = [...(PipelineOS._orders||[]), o];
      PipelineOS._renderCoda(PipelineOS._orders);
      PipelineOS._renderProduzione(PipelineOS._orders);
      PipelineOS._renderKPIs(PipelineOS._orders, PipelineOS._sales||[]);
    }
    // If board is visible, update it
    const stage = this._stagesCache?.find(s=>s.id===o.stage);
    if (stage) {
      const card = document.querySelector(`.ofe-card[data-id="${id}"]`);
      if (card) {
        const newCard = document.createElement('div');
        newCard.innerHTML = this._card(o, stage, this._stagesCache||this.DEFAULT_STAGES);
        card.replaceWith(newCard.firstElementChild);
      }
    }
  },

  async updatePayment(id, status) {
    await this.updateField(id, 'paymentStatus', status);
    if (status==='paid') await this.moveStage(id,'paid');
  },

  // ── Delete order ─────────────────────────────────────────────────────────
  async convertToSale(id) {
    id = typeof id === 'string' ? +id || id : id;
    const o = await IDB.get('orders', id).catch(()=>null);
    if (!o) { toast('Ordine non trovato','warning'); return; }
    const total = +(o.total||o.value)||0;
    if (!total) { toast('Imposta il totale prima di convertire','warning'); return; }
    if (!confirm(`Convertire "${o.name||'Ordine #'+id}" in vendita da ${fmtCur(total)}?`)) return;
    // Create sale record
    const sale = {
      id: Date.now(),
      clientId:    o.clientId||null,
      clientName:  o.clientName||o.client||'',
      date:        new Date().toISOString().split('T')[0],
      desc:        o.name||o.desc||'',
      amount:      total,
      status:      'pagato',
      channel:     o.channel||'Diretto',
      originOrder: id,
      createdAt:   new Date().toISOString(),
    };
    await IDB.put('sales', sale).catch(e=>{ toast('Errore: '+e.message,'error'); return; });
    // Move order to paid stage
    o.stage = 'paid'; o.updatedAt = new Date().toISOString();
    await IDB.put('orders', o).catch(()=>{});
    AppStore.invalidate('orders');
    AppStore.invalidate('pipeline');
    if(typeof PipelineOS!=='undefined'){PipelineOS._orders=(PipelineOS._orders||[]).map(x=>x.id===id?{...x,...o}:x);PipelineOS._renderCoda(PipelineOS._orders);PipelineOS._renderProduzione(PipelineOS._orders);PipelineOS._renderKPIs(PipelineOS._orders,PipelineOS._sales||[]);}
    AppStore.invalidate('sales');
    AppStore.invalidate('orders');
    AppStore.invalidate('pipeline');
    // Close drawer
    const dr = eid('ofe-drawer'); if(dr) dr.style.display='none';
    const bd = document.getElementById('ofe-backdrop'); if(bd) bd.remove();
    // Refresh
    if(typeof PipelineOS!=='undefined') (typeof PipelineOS!=='undefined'&&PipelineOS.render());
    if(typeof KPIEngine!=='undefined') KPIEngine.run();
    toast('✅ Vendita registrata: '+fmtCur(total),'success',4000);
  },

  async deleteOrder(id) {
    id = typeof id === 'string' ? +id || id : id;
    if (!confirm('Eliminare questo ordine definitivamente?')) return;
    await IDB.del('orders', id);
    // Also delete any pipeline entry that references this order
    try {
      const pl = await IDB.getAll('pipeline').catch(()=>[]);
      for (const r of pl) {
        if (r.id === id || r._sourceId === id) {
          await IDB.del('pipeline', r.id);
        }
      }
    } catch(e) { console.warn('[deleteOrder pipeline]', e); }
    AppStore.invalidate('orders');
    AppStore.invalidate('pipeline');
    const drawer = eid('ofe-drawer');
    if (drawer) drawer.style.display = 'none';
    await this.render();
    if(typeof PipelineOS!=='undefined') (typeof PipelineOS!=='undefined'&&PipelineOS.render());
    if(typeof Orders!=='undefined') (typeof Orders!=='undefined'&&Orders.render());
    toast('🗑 Ordine eliminato definitivamente');
  },

  // ── Create from quote ──────────────────────────────────────────────────
  async createFromQuote(quote) {
    const orderNum = 'ORD-' + Date.now().toString().slice(-6);
    const now = new Date().toISOString();
    const order = {
      id: Date.now(), orderNum, quoteId: quote.id,
      name: quote.name||'Preventivo', clientId: quote.clientId||0,
      clientName: quote.clientName||'—',
      items: (quote.lines||[]).map(l=>({
        desc:l.desc||l.name, name:l.desc||l.name,
        qty:l.qty||1, unit:l.unit||'pz',
        costPrice:l.cost||l.costPrice||0,
        price:l.price||0,
        vatRate:l.vatRate||quote.vatRate||0.22,
        total:(l.price||0)*(l.qty||1),
      })),
      subtotal: quote.netPrice||0, tax: quote.vatAmount||0,
      vatRate: quote.vatRate||0.22, total: quote.grossPrice||quote.total||0,
      stage:'draft', status:'active', paymentStatus:'none',
      depositAmount:0, paidAmount:0, priority:'media',
      notes: quote.notes||'', dueDate: quote.deadline||'',
      createdAt:now, updatedAt:now,
    };
    await IDB.put('orders', order);
    await IDB.put('order_events', {id:Date.now()+1, orderId:order.id, event:'Ordine creato da preventivo', stage:'draft', ts:now}).catch(()=>{});
    // v3.5: also write to unified pipeline store
    try {
      await IDB.put('pipeline', {
        ...order, _source:'orders', _sourceId:order.id, id: Date.now() + Math.floor(Math.random()*9999),
        stage: order.stage||'draft', total: order.total||0,
        clientName: order.clientName||'', createdAt: now,
      });
      AppStore.invalidate('pipeline');
    } catch(ex) { console.warn('[v3.5 pipeline write]', ex); }
    if (Bus) Bus.emit('orders:created', {orderId:order.id});
    return order;
  },

  // ── Pipeline editor ──────────────────────────────────────────────────────
  async showPipelineEditor() {
    const stages = await this.stages();
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(8px)';
    ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
    document.body.appendChild(ov);
    ov.innerHTML = `
    <div style="background:var(--bg-card);border-radius:16px;width:560px;max-width:96vw;max-height:90vh;display:flex;flex-direction:column;border:1.5px solid var(--border2);overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center">
        <div style="flex:1;font-size:15px;font-weight:800">⚙️ Personalizza Pipeline</div>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:rgba(255,255,255,.1);border:none;border-radius:8px;width:28px;height:28px;cursor:pointer;color:var(--text-muted)">✕</button>
      </div>
      <div style="overflow-y:auto;padding:16px 20px;flex:1">
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Modifica etichette, colori e raggruppamenti delle fasi del workflow.</p>
        <div id="stage-editor-list">
          ${stages.map((s,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-card2);border-radius:8px;margin-bottom:6px;border:1px solid ${s.color}40">
            <div style="width:10px;height:10px;border-radius:50%;background:${s.color};flex-shrink:0"></div>
            <input value="${s.label}" onchange="OrderFlow._updateStageLabel(${JSON.stringify(s.id)},this.value)"
              style="flex:1;padding:5px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px">
            <input type="color" value="${s.color}" onchange="OrderFlow._updateStageColor(${JSON.stringify(s.id)},this.value)"
              style="width:28px;height:28px;border:none;border-radius:4px;cursor:pointer;padding:2px">
            <select onchange="OrderFlow._updateStageGroup(${JSON.stringify(s.id)},this.value)"
              style="padding:4px 6px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:10px">
              <option value="pre"  ${s.group==='pre' ?'selected':''}>Pre-Vendita</option>
              <option value="prod" ${s.group==='prod'?'selected':''}>Produzione</option>
              <option value="post" ${s.group==='post'?'selected':''}>Post-Vendita</option>
            </select>
          </div>`).join('')}
        </div>
      </div>
      <div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">
        <button onclick="OrderFlow._resetStages();this.closest('[style*=fixed]').remove()" style="padding:9px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;color:var(--text-muted)">↺ Reset Default</button>
        <button onclick="this.closest('[style*=fixed]').remove();OrderFlow._stages=null;(typeof OrderFlow!=='undefined'&&OrderFlow.render())" style="padding:9px 20px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">✅ Salva & Applica</button>
      </div>
    </div>`;
  },

      // ── Modifica singola voce in un ordine esistente ──────────────────────
  async _updateItemField(orderId, itemIdx, field, value) {
    orderId = typeof orderId==='string' ? +orderId||orderId : orderId;
    const o = await IDB.get('orders', orderId).catch(()=>null);
    if (!o) return;
    const items = o.items||[];
    if (itemIdx < 0 || itemIdx >= items.length) return;

    // Update the field
    items[itemIdx][field] = value;

    // Recalculate item total
    const it = items[itemIdx];
    it.total    = +((it.price||0) * (it.qty||1) * (1+(it.vatRate||0))).toFixed(2);
    it.subtotal = +((it.price||0) * (it.qty||1)).toFixed(2);

    // Recalculate order totals from all items
    const impon   = items.reduce((a,x)=>a+(x.price||0)*(x.qty||1), 0);
    const ivaAmt  = items.reduce((a,x)=>a+(x.price||0)*(x.qty||1)*(x.vatRate||0), 0);
    const costTot = items.reduce((a,x)=>a+((x.costPrice||x.cost||0)*(x.qty||1)), 0);
    o.items      = items;
    o.subtotal   = +impon.toFixed(2);
    o.tax        = +ivaAmt.toFixed(2);
    o.total      = +(impon + ivaAmt).toFixed(2);
    o.value      = o.total;
    o.costTotal  = +costTot.toFixed(2);
    o.updatedAt  = new Date().toISOString();

    await IDB.put('orders', o);

    // Sync pipeline entry
    try {
      const pl = await IDB.getAll('pipeline').catch(()=>[]);
      const entry = pl.find(r=>r._sourceId===orderId||r.id===orderId);
      if (entry) {
        entry.total      = o.total;
        entry.updatedAt  = o.updatedAt;
        await IDB.put('pipeline', entry);
        AppStore.invalidate('pipeline');
      }
    } catch(e) {}

    AppStore.invalidate('orders');

    // Live-update footer without closing drawer
    const footer = document.getElementById('items-footer-'+orderId);
    if (footer) footer.innerHTML = OrderFlow._itemsFooter(o.items);

    // Live-update total field in Overview tab
    const totalInput = document.getElementById('ov-total-'+orderId);
    if (totalInput) totalInput.value = o.total.toFixed(2);

    // Refresh Coda + Produzione + KPIs
    if (typeof PipelineOS !== 'undefined') {
      const idx = (PipelineOS._orders||[]).findIndex(x=>x.id===orderId||x._sourceId===orderId);
      if (idx>=0) PipelineOS._orders[idx] = {...PipelineOS._orders[idx], ...o};
      PipelineOS._renderCoda(PipelineOS._orders);
      PipelineOS._renderProduzione(PipelineOS._orders);
      PipelineOS._renderKPIs(PipelineOS._orders, PipelineOS._sales||[]);
      PipelineOS._renderPaySummary(PipelineOS._orders, PipelineOS._sales||[]);
    }
  },

  // ── Aggiunge nuova voce a un ordine esistente ─────────────────────────
  async _addItemToOrder(orderId) {
    orderId = typeof orderId==='string' ? +orderId||orderId : orderId;
    const desc     = prompt('Descrizione voce:', 'Lavorazione laser');
    if (!desc) return;
    const priceRaw = prompt('Prezzo unitario (€):', '0');
    const qtyRaw   = prompt('Quantità:', '1');
    const costRaw  = prompt('Costo acquisto (€, opz):', '0');

    const price = +priceRaw||0;
    const qty   = +qtyRaw||1;
    const cost  = +costRaw||0;

    const o = await IDB.get('orders', orderId).catch(()=>null);
    if (!o) return;
    if (!o.items) o.items = [];

    o.items.push({
      desc, name:desc, qty, unit:'pz',
      price, costPrice:cost, cost,
      vatRate: o.vatRate||0.22,
      total: +(price*qty*(1+(o.vatRate||0.22))).toFixed(2)
    });

    // Recalc totals
    const impon  = o.items.reduce((a,x)=>a+(x.price||0)*(x.qty||1),0);
    const ivaAmt = o.items.reduce((a,x)=>a+(x.price||0)*(x.qty||1)*(x.vatRate||0),0);
    o.subtotal   = +impon.toFixed(2);
    o.tax        = +ivaAmt.toFixed(2);
    o.total      = +(impon+ivaAmt).toFixed(2);
    o.value      = o.total;
    o.costTotal  = +o.items.reduce((a,x)=>a+(x.costPrice||0)*(x.qty||1),0).toFixed(2);
    o.updatedAt  = new Date().toISOString();

    await IDB.put('orders', o);
    AppStore.invalidate('orders');
    AppStore.invalidate('pipeline');

    if (typeof PipelineOS !== 'undefined') {
      const idx=(PipelineOS._orders||[]).findIndex(x=>x.id===orderId||x._sourceId===orderId);
      if(idx>=0) PipelineOS._orders[idx]={...PipelineOS._orders[idx],...o};
      PipelineOS._renderCoda(PipelineOS._orders);
      PipelineOS._renderProduzione(PipelineOS._orders);
      PipelineOS._renderKPIs(PipelineOS._orders, PipelineOS._sales||[]);
    }

    toast('✅ Voce aggiunta!', 'success');
    // Refresh drawer items tab
    const drawerBody = document.getElementById('ofe-drawer-body');
    if (drawerBody && +drawerBody.dataset.orderId===orderId) {
      const tabContent = drawerBody.querySelector('[data-tab-content="items"]');
      if (tabContent) tabContent.innerHTML = OrderFlow._drawerTabItems(o);
      else await OrderFlow.openDetail(orderId);
    }
  },

  // ── Rimuove una voce da un ordine esistente ───────────────────────────
  async _removeItemFromOrder(orderId, itemIdx) {
    if (!confirm('Rimuovere questa voce?')) return;
    orderId = typeof orderId==='string' ? +orderId||orderId : orderId;
    const o = await IDB.get('orders', orderId).catch(()=>null);
    if (!o) return;
    o.items = (o.items||[]).filter((_,i)=>i!==itemIdx);

    const impon  = o.items.reduce((a,x)=>a+(x.price||0)*(x.qty||1),0);
    const ivaAmt = o.items.reduce((a,x)=>a+(x.price||0)*(x.qty||1)*(x.vatRate||0),0);
    o.subtotal   = +impon.toFixed(2);
    o.tax        = +ivaAmt.toFixed(2);
    o.total      = +(impon+ivaAmt).toFixed(2);
    o.value      = o.total;
    o.costTotal  = +o.items.reduce((a,x)=>a+(x.costPrice||0)*(x.qty||1),0).toFixed(2);
    o.updatedAt  = new Date().toISOString();

    await IDB.put('orders', o);
    AppStore.invalidate('orders');
    AppStore.invalidate('pipeline');

    if (typeof PipelineOS !== 'undefined') {
      const idx=(PipelineOS._orders||[]).findIndex(x=>x.id===orderId||x._sourceId===orderId);
      if(idx>=0) PipelineOS._orders[idx]={...PipelineOS._orders[idx],...o};
      PipelineOS._renderCoda(PipelineOS._orders);
      PipelineOS._renderProduzione(PipelineOS._orders);
      PipelineOS._renderKPIs(PipelineOS._orders, PipelineOS._sales||[]);
    }

    toast('Voce rimossa', 'warning');
    const drawerBody = document.getElementById('ofe-drawer-body');
    if (drawerBody && +drawerBody.dataset.orderId===orderId) {
      await OrderFlow.openDetail(orderId);
    }
  },

  async _updateStageLabel(id, label) { const s=await IDB.get('workflow_steps',id).catch(()=>null); if(s){s.label=label;await IDB.put('workflow_steps',s);this._stages=null;} },
  async _updateStageColor(id, color) { const s=await IDB.get('workflow_steps',id).catch(()=>null); if(s){s.color=color;await IDB.put('workflow_steps',s);this._stages=null;} },
  async _updateStageGroup(id, group) { const s=await IDB.get('workflow_steps',id).catch(()=>null); if(s){s.group=group;await IDB.put('workflow_steps',s);this._stages=null;} },
  async _addStage() { const ex=await IDB.getAll('workflow_steps').catch(()=>[]); const n={id:'stage_'+Date.now(),label:'🔹 Nuova Fase',color:'#6366f1',group:'prod',order:ex.length}; await IDB.put('workflow_steps',n); this._stages=null; this.showPipelineEditor(); },
  async _resetStages() { const all=await IDB.getAll('workflow_steps').catch(()=>[]); for(const s of all) await IDB.del('workflow_steps',s.id); this._stages=null; toast('Pipeline reimpostata'); },
};


// ── SMART QUOTER: Upgrade "Invia a Workflow" button ────────────────────────
// Override sendToWorkflow to use OrderFlow
Quoter.sendToWorkflow = async function() {
  if (!this.lines||!this.lines.length) { toast('Aggiungi voci al preventivo prima','warning'); return; }
  const saved = await this.saveQuote().catch(e=>{ toast('Errore salvataggio: '+e.message,'danger'); return null; });
  if (!saved && !this._lastSavedQuoteId) { toast('Salva il preventivo prima','warning'); return; }
  const quoteId = this._lastSavedId || this._lastSavedQuoteId || saved;
  const q = await IDB.get('quotes', quoteId).catch(()=>null);
  if (!q) { toast('Preventivo non trovato','danger'); return; }

  // Check if order already exists for this quote
  const existing = await AppStore.get('orders').catch(()=>[]);
  const linked = existing.find(o=>String(o.quoteId)===String(quoteId));
  if (linked) {
    toast('ℹ️ Ordine già presente nel pipeline — apro la pipeline','info');
    App.navigate('workflow');
    return;
  }

  const order = await OrderFlow.createFromQuote(q);
  toast(`✅ "${q.name}" → Pipeline Ordini (Bozza) | ORD: ${order.orderNum}`,'🔄');
  App.navigate('workflow');
};

// ── LEGACY: Redirect (typeof Workflow!=='undefined'&&Workflow.render()) → (typeof OrderFlow!=='undefined'&&OrderFlow.render()) ───────────────
if (typeof Workflow !== 'undefined') {
  Workflow._legacyRender = Workflow.render;
  Workflow.render = async function() { await (typeof OrderFlow!=='undefined'&&OrderFlow.render()); };
  Workflow.setStatus = async function(id, status) {
    const stageMap = {bozza:'draft',in_attesa:'ready',produzione:'production',confermato:'accepted'};
    await OrderFlow.moveStage(id, stageMap[status]||status);
  };
}

// ── QuoterBridge.convert: now moves to 'accepted' stage ───────────────────
QuoterBridge.convert = async function(quoteId) {
  const q = await IDB.get('quotes', quoteId).catch(()=>null);
  if (!q) return;
  if (!confirm(`Confermare preventivo "${q.name}"?\nIl cliente accetta → entra in PRODUZIONE`)) return;
  q.status = 'confermato';
  await IDB.put('quotes', q);
  // Find linked order
  const orders = await AppStore.get('orders').catch(()=>[]);
  const linked = orders.find(o=>String(o.quoteId)===String(quoteId));
  if (linked) {
    await OrderFlow.moveStage(linked.id, 'production');
  } else {
    // Create it
    const order = await OrderFlow.createFromQuote(q);
    await OrderFlow.moveStage(order.id, 'production');
  }
  toast(`🚀 "${q.name}" → Produzione!`,'success');
  App.navigate('workflow');
};


// Run store unification after DB is ready
setTimeout(async()=>{
  try { await StoreUnification.run(); } catch(e) {}
}, 2000);

// ── BDW: hook Bus to touch() instead of full invalidate on minor changes ──
Bus.on('data:updated', (payload) => {
  const store = payload?.store || '';
  if (store) BDW.touch(store);
  else BDW.invalidate();
});




// ═══════════════════════════════════════════════════
// STORE COMPATIBILITY SHIM v88 — bridges v87 AI modules to v86 AppStore
// ═══════════════════════════════════════════════════
window.Workflow = Workflow;
window.TimeTracker = TimeTracker;
window.Orders = typeof Orders !== 'undefined' ? Orders : {};
window.Produzione = Produzione;
window.Pipeline = Pipeline;
window.OrderFlow = OrderFlow;

