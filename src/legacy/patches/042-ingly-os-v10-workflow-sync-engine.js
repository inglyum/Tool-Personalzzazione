
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v10 — WORKFLOW SYNC ENGINE
// Stato perfetto bidirezionale: Orders ↔ Sales ↔ Pipeline
// ════════════════════════════════════════════════════════════════════════

const WorkflowSync = {

  // ── Status definitions (single source of truth) ────────────────────────
  ORDER_STATES: {
    backlog:   { label:'📋 Backlog',        color:'#6366f1', saleStatus:null,        next:'working' },
    working:   { label:'🔧 In Lavorazione', color:'#f59e0b', saleStatus:null,        next:'ready' },
    ready:     { label:'✅ Pronto',          color:'#10b981', saleStatus:null,        next:'delivered' },
    delivered: { label:'📦 Consegnato',      color:'#3b82f6', saleStatus:'da_pagare', next:'sold' },
    sold:      { label:'💰 Venduto',         color:'#22c55e', saleStatus:'pagato',    next:'invoiced' },
    invoiced:  { label:'🧾 Fatturato',       color:'#a78bfa', saleStatus:'pagato',    next:null },
    paused:    { label:'⏸️ In Pausa',        color:'#6b7280', saleStatus:null,        next:'working' },
  },

  SALE_STATES: {
    da_pagare: { label:'⏳ Da Pagare',   color:'#f97316', orderStage:'delivered' },
    pagato:    { label:'✅ Pagato',      color:'#22c55e', orderStage:'sold' },
  },

  // ── The main transition function ──────────────────────────────────────
  async transition(orderId, newStage, opts={}) {
    try {
      const id = typeof orderId==='string' ? (+orderId||orderId) : orderId;

      // 1. Load order (try orders store first, then pipeline)
      let order = await IDB.get('orders', id).catch(()=>null);
      if(!order) {
        const pl = await IDB.getAll('pipeline').catch(()=>[]);
        order = pl.find(r=>r.id===id||r._sourceId===id||r.id===+id||r._sourceId===+id)||null;
      }
      if(!order) { console.warn('[WorkflowSync] Order not found:', id); return false; }

      const oldStage = order.stage||order.status||'backlog';
      const stateConfig = this.ORDER_STATES[newStage];
      if(!stateConfig) { console.warn('[WorkflowSync] Unknown stage:', newStage); return false; }

      // 2. Update order
      order.stage = newStage;
      order.status = newStage;
      order.updatedAt = new Date().toISOString();
      if(newStage==='delivered') order.deliveredAt = new Date().toISOString();
      if(newStage==='sold')      order.soldAt = new Date().toISOString();
      if(newStage==='invoiced')  order.invoicedAt = new Date().toISOString();

      /* ── Il routing di produzione ────────────────────────────────────
         Un ordine che entra in produzione riceve una operazione per ogni
         tecnologia che dichiara: è il momento in cui smette di essere un
         prezzo e diventa un lavoro da fare.

         Se l'ordine ha una sola riga collegata a un prodotto del catalogo
         che ha una distinta base (Multi-Tech BOM), il routing viene dalla
         distinta — una operazione per riga di lavorazione dichiarata, con
         l'anatomia avviamento/tempo-per-pezzo già espansa sulla quantità
         ordinata — non dedotto dalla singola tecnologia del prodotto.
         Altrimenti resta la deduzione esistente, invariata.

         Non si inventa niente — nessun tempo, nessuna macchina: quelli li
         misura chi produce. E se il routing c'è già non si ricostruisce, o
         i tempi reali già registrati sparirebbero. */
      const _INPROD = ['produzione','production','working','in_produzione','lavorazione'];
      if(_INPROD.indexOf(String(newStage))>=0 && typeof window!=='undefined' && window.InglyOperazioni){
        try {
          let _r = null;
          if(!window.InglyOperazioni.leggi(order).length && window.InglyProductBOMStore){
            _r = await window.InglyProductBOMStore.routingDaOrdine(order).catch(()=>null);
          }
          if(!_r) _r = window.InglyOperazioni.costruisciDaOrdine(order);
          if(_r.create && _r.operations.length){
            order.production = Object.assign({}, order.production, { operations: _r.operations });
            if(!order.operations) order.operations = _r.operations;
          }
        } catch(ex){ console.warn('[WorkflowSync routing]', ex); }
      }

      await IDB.put('orders', order);
      AppStore.invalidate('orders');

      // 3. Log the event
      await IDB.put('order_events', {
        id: Date.now(), orderId: id,
        event: `${oldStage} → ${newStage}`,
        stage: newStage, ts: new Date().toISOString(),
        source: opts.source||'workflow'
      });

      // 4. Sync pipeline entry
      try {
        const pl = await IDB.getAll('pipeline').catch(()=>[]);
        const plEntry = pl.find(r=>r._sourceId===+id||r._sourceId===id||r.id===+id);
        if(plEntry) {
          plEntry.stage = ['sold','invoiced','delivered'].includes(newStage)?'paid':newStage;
          plEntry.updatedAt = new Date().toISOString();
          await IDB.put('pipeline', plEntry);
          AppStore.invalidate('pipeline');
        }
      } catch(ex) { console.warn('[WorkflowSync pipeline]', ex); }

      // 5. Sale sync based on new stage
      const saleTargetStatus = stateConfig.saleStatus;
      if(saleTargetStatus) {
        const allSales = await IDB.getAll('sales').catch(()=>[]);
        const linked = allSales.find(s =>
          String(s.fromOrderId)===String(id)||
          String(s.originOrder)===String(id)||
          String(s.orderId)===String(id)
        );

        if(linked) {
          // Update existing sale
          if(linked.status !== saleTargetStatus) {
            linked.status = saleTargetStatus;
            if(saleTargetStatus==='pagato') linked.paidAt = new Date().toISOString();
            await IDB.put('sales', linked);
            AppStore.invalidate('sales');
            order.linkedSaleId = linked.id;
            await IDB.put('orders', order);
          }
        } else if(newStage==='delivered' || newStage==='sold') {
          // Auto-create sale
          /* ── Dal servizio, non da una catena di ripieghi ─────────────────
             Qui c'era `order.value||order.price||order.grossPrice||order.amount||0`:
             quattro campi in fila e uno zero in fondo. Misurato: un ordine nato
             dal percorso canonico non ha nessuno dei quattro, quindi questa
             riga creava una vendita da **zero euro** ogni volta che un ordine
             passava a «consegnato». In automatico, senza che nessuno premesse
             niente. */
          const _OSS = typeof window !== 'undefined' && window.InglyOrderSales;
          const _e = _OSS ? _OSS.createSaleFromOrder(order, {
            status: saleTargetStatus,
            channel: order.channel || 'Diretto',
          }) : { ok:false, motivo:'servizio vendite non caricato' };
          if(!_e.ok){
            /* Non si crea una vendita a zero: si lascia l'ordine senza vendita
               e lo si dice. Un buco visibile si ripara; uno zero scritto in
               archivio no.

               Ma **non si esce dalla funzione**: lo spostamento di stato è già
               avvenuto, e saltare l'evento di fine funzione lascerebbe la
               schermata ferma su uno stato vecchio. Fallisce la vendita, non
               la transizione. */
            console.warn('[workflow] vendita automatica non creata per ordine', id, '—', _e.motivo);
            if(typeof toast==='function') toast('Ordine spostato, ma la vendita non è stata creata: '+_e.motivo,'warning',9000);
          } else {
            const sale = _e.vendita;
            const saleId = sale.id;
            sale.originOrder = id;
            sale.createdFrom = 'workflow_auto';
            if(saleTargetStatus==='pagato') sale.paidAt = new Date().toISOString();
            await IDB.put('sales', sale);
            AppStore.invalidate('sales');
            order.linkedSaleId = saleId;
            await IDB.put('orders', order);
            Bus.emit('sale:created', {id:saleId, orderId:id, auto:true});
          }
        }
      }

      // 6. Emit event for UI refresh
      Bus.emit('order:stageChanged', {orderId:id, oldStage, newStage});
      if(typeof BDW!=='undefined') BDW.touch('orders');
      if(typeof BDW!=='undefined'&&saleTargetStatus) BDW.touch('sales');

      return true;
    } catch(err) {
      console.error('[WorkflowSync.transition]', err);
      return false;
    }
  },

  // ── Reverse sync: when a sale is marked paid, move order → sold ────────
  async onSalePaid(saleId) {
    try {
      const sale = await IDB.get('sales', saleId).catch(()=>null);
      if(!sale) return;
      const orderId = sale.fromOrderId||sale.originOrder||sale.orderId;
      if(!orderId) return;
      const order = await IDB.get('orders', +orderId||orderId).catch(()=>null);
      if(!order) return;
      if(['sold','invoiced'].includes(order.stage||order.status)) return; // already terminal
      await this.transition(orderId, 'sold', {source:'sale_paid'});
    } catch(ex) { console.warn('[WorkflowSync.onSalePaid]', ex); }
  },

  // ── Repair: scan for broken links and fix them ─────────────────────────
  async repair() {
    let fixed=0;
    try {
      const orders = await IDB.getAll('orders').catch(()=>[]);
      const sales  = await IDB.getAll('sales').catch(()=>[]);
      const saleMap = {};
      sales.forEach(s=>{
        if(s.fromOrderId) saleMap[String(s.fromOrderId)]=s;
        if(s.originOrder) saleMap[String(s.originOrder)]=s;
      });

      for(const order of orders) {
        const sid = String(order.id);
        const linked = saleMap[sid];
        const stage = order.stage||order.status||'backlog';

        // Fix 1: order is delivered/sold but has no linked sale
        if(['delivered','sold','invoiced'].includes(stage) && !linked && !order.linkedSaleId) {
          /* La riparazione automatica leggeva `order.value||0` — un campo
             solo, e quello che il percorso canonico non scrive. Riparava gli
             ordini creando vendite da zero euro. */
          const _OSS2 = typeof window !== 'undefined' && window.InglyOrderSales;
          const _e2 = _OSS2 ? _OSS2.createSaleFromOrder(order, {
            id: Date.now()+fixed,
            status: stage==='delivered' ? 'da_pagare' : 'pagato',
            date: (order.deliveredAt||order.updatedAt||new Date().toISOString()).split('T')[0],
          }) : { ok:false, motivo:'servizio vendite non caricato' };
          if(!_e2.ok){
            console.warn('[workflow] riparazione saltata per ordine', order.id, '—', _e2.motivo);
            continue;
          }
          const saleId = _e2.vendita.id;
          _e2.vendita.originOrder = order.id;
          _e2.vendita.createdFrom = 'repair';
          await IDB.put('sales', _e2.vendita);
          order.linkedSaleId=saleId;
          await IDB.put('orders',order);
          fixed++;
        }

        // Fix 2: linked sale exists but order stage is 'ready' or 'working' → update to delivered
        if(linked && ['backlog','working','ready'].includes(stage) && linked.status==='pagato') {
          order.stage='sold'; order.status='sold';
          order.linkedSaleId=linked.id;
          await IDB.put('orders',order);
          fixed++;
        }

        // Fix 3: order stage is 'sold' but linked sale is still 'da_pagare'
        if(linked && stage==='sold' && linked.status==='da_pagare') {
          linked.status='pagato'; linked.paidAt=new Date().toISOString();
          await IDB.put('sales',linked);
          fixed++;
        }
      }

      AppStore.invalidate('orders');
      AppStore.invalidate('sales');
      AppStore.invalidate('pipeline');
      return fixed;
    } catch(ex) { console.error('[WorkflowSync.repair]', ex); return 0; }
  },

  // ── Dashboard: get workflow KPIs ───────────────────────────────────────
  async getKPIs() {
    const [orders, sales] = await Promise.all([
      IDB.getAll('orders').catch(()=>[]),
      IDB.getAll('sales').catch(()=>[]),
    ]);
    return {
      backlog:   orders.filter(o=>['backlog'].includes(o.stage||'backlog')).length,
      working:   orders.filter(o=>(o.stage||'backlog')==='working').length,
      ready:     orders.filter(o=>(o.stage||'backlog')==='ready').length,
      delivered: orders.filter(o=>(o.stage||'backlog')==='delivered').length,
      sold:      orders.filter(o=>['sold','invoiced'].includes(o.stage||'backlog')).length,
      toCollect: sales.filter(s=>s.status==='da_pagare').reduce((a,s)=>a+(+s.amount||0),0),
      collected: sales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0),
    };
  }
};
window.WorkflowSync = WorkflowSync;


// ════════════════════════════════════════════════════════════════════════
// WORKFLOW DASHBOARD WIDGET — sezione /view-workflow_dashboard
// Panoramica completa del ciclo ordine → vendita → fatturato
// ════════════════════════════════════════════════════════════════════════
const WorkflowDashboard = {
  async render() {
    const el = document.getElementById('view-workflow_dashboard') ||
               document.getElementById('view-pipeline') ||
               document.getElementById('view-orders');
    // Only inject if there's a dedicated container
    const container = document.getElementById('view-workflow_dashboard');
    if(!container) return;

    container.innerHTML = `<div style="padding:16px 20px;max-width:1300px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">
        <div style="width:48px;height:48px;border-radius:13px;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center;font-size:22px">⚡</div>
        <div style="flex:1">
          <h2 style="margin:0 0 2px;font-size:20px;font-weight:800;background:linear-gradient(135deg,#6366f1,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Workflow Overview</h2>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">Pipeline ordini · Sync vendite · Stato ciclo completo · Repair automatico</p>
        </div>
        <button onclick="WorkflowDashboard.repair(this)" style="padding:7px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;color:var(--text-muted);transition:.15s" onmouseover="this.style.borderColor='#22c55e';this.style.color='#22c55e'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">🔧 Repair Sync</button>
      </div>
      <div id="wfd-body"><div style="text-align:center;padding:30px;color:var(--text-muted)">⏳ Caricamento…</div></div>
    </div>`;

    await this._loadBody();
  },

  async repair(btn) {
    if(btn) { btn.disabled=true; btn.textContent='🔄 Repair…'; }
    const fixed = await WorkflowSync.repair();
    if(btn) { btn.disabled=false; btn.textContent='🔧 Repair Sync'; }
    toast(`🔧 Repair completato: ${fixed} fix applicati`, fixed>0?'success':'info');
    await this._loadBody();
  },

  async _loadBody() {
    const body = document.getElementById('wfd-body');
    if(!body) return;

    const kpis = await WorkflowSync.getKPIs().catch(()=>({}));
    const orders = await IDB.getAll('orders').catch(()=>[]);
    const sales  = await IDB.getAll('sales').catch(()=>[]);

    // Group orders by stage
    const byStage = {};
    for(const s of Object.keys(WorkflowSync.ORDER_STATES)) byStage[s]=[];
    orders.forEach(o=>{ const s=o.stage||o.status||'backlog'; if(byStage[s]) byStage[s].push(o); });

    const saleMap = {};
    sales.forEach(s=>{ if(s.fromOrderId) saleMap[String(s.fromOrderId)]=s; if(s.originOrder) saleMap[String(s.originOrder)]=s; });

    // Detect problems
    const problems = orders.filter(o=>{
      const s=o.stage||'backlog';
      const linked=saleMap[String(o.id)];
      return (['delivered','sold','invoiced'].includes(s)&&!linked&&!o.linkedSaleId) ||
             (linked&&['backlog','working','ready'].includes(s)&&linked.status==='pagato');
    });

    body.innerHTML = `
      <!-- FLOW DIAGRAM -->
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:20px;overflow-x:auto;padding:4px">
        ${Object.entries(WorkflowSync.ORDER_STATES).filter(([k])=>k!=='paused').map(([stageId, cfg],i,arr)=>{
          const count = (byStage[stageId]||[]).length;
          const value = (byStage[stageId]||[]).reduce((a,o)=>a+(+o.value||0),0);
          return `<div style="text-align:center;flex:1;min-width:90px">
            <div style="padding:10px 6px;border-radius:10px;border:2px solid ${cfg.color}30;background:${cfg.color}10;position:relative">
              <div style="font-size:20px;font-weight:800;color:${cfg.color}">${count}</div>
              <div style="font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">${cfg.label.replace(/[^\x20-\x7E]/g,'').trim()||stageId}</div>
              ${value>0?`<div style="font-size:9px;color:${cfg.color};font-weight:700">€${value.toFixed(0)}</div>`:''}
            </div>
            ${i<arr.length-1?`<div style="position:relative;margin-top:2px;text-align:center;color:var(--text-dim);font-size:14px">→</div>`:''}
          </div>`;
        }).join('')}
      </div>

      <!-- KPI ROW -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
        ${[
          {em:'⏳',label:'Da Incassare',val:'€'+(kpis.toCollect||0).toFixed(0),col:'#f97316'},
          {em:'💰',label:'Incassato',   val:'€'+(kpis.collected||0).toFixed(0),col:'#22c55e'},
          {em:'✅',label:'Pronti',      val:kpis.ready||0,col:'#10b981'},
          {em:'⚠️',label:'Problemi',   val:problems.length,col:problems.length?'#ef4444':'#6b7280'},
        ].map(k=>`<div style="padding:12px;background:var(--bg-card);border-radius:10px;border:1px solid var(--border);text-align:center;${k.em==='⚠️'&&problems.length?'border-color:#ef444440;background:#ef444408':''}">
          <div style="font-size:20px;margin-bottom:3px">${k.em}</div>
          <div style="font-size:18px;font-weight:800;color:${k.col}">${k.val}</div>
          <div style="font-size:10px;color:var(--text-dim)">${k.label}</div>
        </div>`).join('')}
      </div>

      ${problems.length?`
      <div style="padding:12px 14px;background:#ef444410;border-radius:10px;border:1px solid #ef444430;margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:#ef4444;margin-bottom:8px">⚠️ ${problems.length} ordini con sync mancante</div>
        ${problems.slice(0,5).map(o=>`<div style="font-size:11px;color:var(--text-muted);padding:3px 0">
          • ${o.name||'#'+o.id} — stage: ${o.stage||'backlog'} — ${saleMap[String(o.id)]?'vendita non aggiornata':'nessuna vendita collegata'}
        </div>`).join('')}
        <button onclick="WorkflowDashboard.repair(this)" style="margin-top:8px;padding:5px 14px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">🔧 Fix automatico</button>
      </div>`:''}

      <!-- ORDERS BY STAGE LIST -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <!-- Pending delivery -->
        <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
          <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📦 Consegnati — Da Pagare</div>
          ${(byStage.delivered||[]).length===0?'<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:16px">Nessuno</div>':
            (byStage.delivered||[]).slice(0,6).map(o=>{
              const sale=saleMap[String(o.id)];
              return `<div style="padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card2);margin-bottom:5px;display:flex;align-items:center;gap:8px">
                <div style="flex:1;min-width:0">
                  <div style="font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.name||'#'+o.id}</div>
                  <div style="font-size:10px;color:var(--text-muted)">${o.clientName||'—'} · €${+(o.value||0).toFixed(0)}</div>
                </div>
                ${sale?`<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#f9731620;color:#f97316;font-weight:700;border:1px solid #f9731640">${sale.status==='pagato'?'✅ PAGATO':'⏳ DA PAGARE'}</span>`:
                `<button onclick="WorkflowSync.transition(${o.id},'sold',{source:'dashboard'}).then(()=>WorkflowDashboard._loadBody())" style="padding:3px 8px;background:#22c55e;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:9px;font-weight:700">+ Vendita</button>`}
              </div>`;
            }).join('')}
        </div>

        <!-- Ready queue -->
        <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
          <div style="font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">✅ Pronti — Da Consegnare</div>
          ${(byStage.ready||[]).length===0?'<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:16px">Nessuno</div>':
            (byStage.ready||[]).slice(0,6).map(o=>`<div style="padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card2);margin-bottom:5px;display:flex;align-items:center;gap:8px">
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.name||'#'+o.id}</div>
                <div style="font-size:10px;color:var(--text-muted)">${o.clientName||'—'} · €${+(o.value||0).toFixed(0)}</div>
              </div>
              <button onclick="WorkflowSync.transition(${o.id},'delivered',{source:'dashboard'}).then(()=>WorkflowDashboard._loadBody());toast('📦 Segnato consegnato!','success')" style="padding:3px 8px;background:#3b82f6;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:9px;font-weight:700">📦 Consegna</button>
            </div>`).join('')}
        </div>
      </div>

      <!-- Quick actions -->
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="App.navigate('orders')" style="padding:7px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;color:var(--text);transition:.15s" onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='var(--border)'"><i class="fas fa-columns"></i> Kanban Ordini</button>
        <button onclick="App.navigate('sales')"  style="padding:7px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;color:var(--text);transition:.15s" onmouseover="this.style.borderColor='#22c55e'" onmouseout="this.style.borderColor='var(--border)'"><i class="fas fa-euro-sign"></i> Vendite & Fatture</button>
        <button onclick="App.navigate('pipeline')" style="padding:7px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;color:var(--text);transition:.15s" onmouseover="this.style.borderColor='#f59e0b'" onmouseout="this.style.borderColor='var(--border)'"><i class="fas fa-project-diagram"></i> Pipeline</button>
      </div>`;
  }
};
window.WorkflowDashboard = WorkflowDashboard;


// ════════════════════════════════════════════════════════════════════════
// PATCH: Wire WorkflowSync into the existing setters & Bus events
// ════════════════════════════════════════════════════════════════════════
(function patchWorkflowSync(){
  const tryPatch = () => {
    // A. Patch Orders.moveStage to use WorkflowSync.transition
    if(typeof Orders==='undefined'||!Orders.moveStage) return setTimeout(tryPatch,600);

    const _origMoveStage = Orders.moveStage.bind(Orders);
    Orders.moveStage = async function(id, stageId) {
      // For the new synced stages, use WorkflowSync
      if(['delivered','sold','invoiced'].includes(stageId)) {
        const ok = await WorkflowSync.transition(id, stageId, {source:'orders_kanban'});
        if(ok) {
          toast(({delivered:'📦 Consegnato!',sold:'💰 Venduto!',invoiced:'🧾 Fatturato!'}[stageId]||'Aggiornato'),'success');
          await (async()=>{try{if(typeof Orders!=='undefined')await Orders.render();}catch(e){}}) ();
          return;
        }
      }
      // For other stages, use original
      return _origMoveStage(id, stageId);
    };

    // B. Listen to sale:paid → sync order to sold
    Bus.on('sale:paid', ({id})=>{
      WorkflowSync.onSalePaid(id).catch(()=>{});
    });

    // C. Add "sold" and "invoiced" to orders that are already delivered but not linked
    // Run repair once on startup (non-blocking)
    setTimeout(()=>{
      WorkflowSync.repair().then(n=>{
        if(n>0) console.log(`[WorkflowSync] Startup repair: ${n} records fixed`);
      }).catch(()=>{});
    }, 3000);

    // D. Patch Sales.markPaid to emit proper Bus event
    if(typeof Sales!=='undefined' && Sales.markPaid) {
      const _origMarkPaid = Sales.markPaid.bind(Sales);
      Sales.markPaid = async function(id) {
        await _origMarkPaid(id);
        // Ensure bus event fires (original already emits sale:paid, but we add order sync)
        await WorkflowSync.onSalePaid(id).catch(()=>{});
      };
    }

    // E. Inject "Workflow" button in Orders header (one-time)
    setTimeout(()=>{
      const header = document.querySelector('#view-orders .page-header');
      if(header && !header.querySelector('.wf-dash-btn')) {
        const btn = document.createElement('button');
        btn.className='btn btn-secondary btn-sm wf-dash-btn';
        btn.innerHTML='⚡ Workflow Overview';
        btn.onclick=()=>App.navigate('workflow_dashboard');
        header.appendChild(btn);
      }
    }, 2000);

    console.log('[WorkflowSync] Patched ✅');
  };
  setTimeout(tryPatch, 1500);
})();

