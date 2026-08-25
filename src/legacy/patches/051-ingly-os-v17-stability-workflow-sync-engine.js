
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v17 — STABILITY & WORKFLOW SYNC ENGINE
// ════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 1. ORDERSDB — Single Source of Truth
// ═══════════════════════════════════════════════════════════════════════
const OrdersDB = {
  // Standard states across ALL sections
  STATES: {
    preventivo:  { label:'Preventivo',  color:'#6366f1', next:'attesa'      },
    attesa:      { label:'In Attesa',   color:'#f59e0b', next:'confermato'  },
    confermato:  { label:'Confermato',  color:'#3b82f6', next:'produzione'  },
    produzione:  { label:'Produzione',  color:'#8b5cf6', next:'completato'  },
    completato:  { label:'Completato',  color:'#10b981', next:'venduto'     },
    venduto:     { label:'Venduto',     color:'#22c55e', next:null          },
    annullato:   { label:'Annullato',   color:'#ef4444', next:null          },
  },

  // State transition rules
  TRANSITIONS: {
    preventivo: ['attesa','annullato'],
    attesa:     ['confermato','annullato'],
    confermato: ['produzione','annullato'],
    produzione: ['completato','annullato'],
    completato: ['venduto'],
    venduto:    [],
    annullato:  [],
  },

  _cache: null,
  _cacheTs: 0,
  CACHE_TTL: 5000, // 5 seconds

  async getAll(forceRefresh=false) {
    const now = Date.now();
    if(!forceRefresh && this._cache && (now - this._cacheTs) < this.CACHE_TTL) {
      return this._cache;
    }
    try {
      const orders = await IDB.getAll('orders').catch(()=>[]);
      this._cache  = orders;
      this._cacheTs = now;
      return orders;
    } catch(e) { return this._cache || []; }
  },

  invalidate() {
    this._cache = null;
    this._cacheTs = 0;
  },

  async transition(orderId, newState) {
    if(!this.STATES[newState]) {
      console.warn('[OrdersDB] Invalid state:', newState);
      return null;
    }
    try {
      const order = await IDB.get('orders', +orderId||orderId).catch(()=>null);
      if(!order) return null;
      const oldState = order.stage || order.status || 'preventivo';
      order.stage  = newState;
      order.status = newState;
      order._lastTransition = { from: oldState, to: newState, ts: Date.now() };
      await IDB.put('orders', order);
      this.invalidate();

      // Emit unified event
      document.dispatchEvent(new CustomEvent('orderUpdated', {
        detail: { id: orderId, oldState, newState, order }
      }));
      Bus.emit && Bus.emit('order:stageChanged', { id: orderId, stage: newState, order });

      // Auto-create sale when venduto
      if(newState === 'venduto' && typeof WorkflowSync !== 'undefined') {
        if(typeof WorkflowSync!=='undefined') await WorkflowSync.transition(+orderId||orderId,'delivered').catch(()=>{});
      }
      return order;
    } catch(e) {
      console.warn('[OrdersDB.transition]', e.message);
      return null;
    }
  },

  async getStats() {
    const orders = await this.getAll();
    const DONE = new Set(['venduto','annullato','paid','delivered','completed']);
    const stats = { total:0, active:0, overdue:0, byState:{}, totalValue:0 };
    const now   = new Date();
    orders.forEach(o => {
      const state = o.stage||o.status||'attesa';
      stats.total++;
      stats.byState[state] = (stats.byState[state]||0) + 1;
      const val = +(o.total||o.value||o.grossPrice||0);
      if(!DONE.has(state) && !o._archived) {
        stats.active++;
        stats.totalValue += val;
        if(o.dueDate && new Date(o.dueDate) < now) stats.overdue++;
      }
    });
    return stats;
  }
};
window.OrdersDB = OrdersDB;


// ═══════════════════════════════════════════════════════════════════════
// 2. EVENT BUS — Central event coordinator
// ═══════════════════════════════════════════════════════════════════════
const EventCoordinator = {
  _handlers: {},

  on(event, handler, id) {
    if(!this._handlers[event]) this._handlers[event] = [];
    // Prevent duplicate registrations by id
    if(id) {
      const exists = this._handlers[event].find(h=>h.id===id);
      if(exists) return;
    }
    this._handlers[event].push({ fn: handler, id: id||null });
  },

  emit(event, data) {
    (this._handlers[event]||[]).forEach(h => {
      try { h.fn(data); } catch(e) { console.warn('[EventCoordinator]', event, e.message); }
    });
    // Also dispatch DOM event for cross-module compatibility
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  },

  off(event, id) {
    if(!id) { this._handlers[event] = []; return; }
    this._handlers[event] = (this._handlers[event]||[]).filter(h=>h.id!==id);
  }
};
window.EventCoordinator = EventCoordinator;

// Wire orderUpdated events to refresh all visible sections
document.addEventListener('orderUpdated', (e) => {
  const active = App?.currentSection;
  if(!active) return;
  // Refresh relevant sections automatically
  const refreshMap = {
    orders:    ()=>typeof Orders!=='undefined' && Orders.render?.(),
    pipeline:  ()=>typeof PipelineOS!=='undefined' && PipelineOS.render?.(),
    sales:     ()=>typeof Sales!=='undefined' && Sales.render?.(),
    dashboard: ()=>typeof HealthScore!=='undefined' && HealthScore.startAutoRefresh?.(),
  };
  if(refreshMap[active]) {
    setTimeout(refreshMap[active], 100);
  }
  // Always update sidebar badges and quick stats
  setTimeout(()=>{ SidebarBadges?.update(); QuickStats?.update(); }, 200);
});


// ═══════════════════════════════════════════════════════════════════════
// 3. PERFORMANCE: Cancel redundant setTimeouts via AbortableTimer
// ═══════════════════════════════════════════════════════════════════════
const AbortableTimer = {
  _timers: {},
  set(key, fn, delay) {
    if(this._timers[key]) clearTimeout(this._timers[key]);
    this._timers[key] = setTimeout(()=>{ delete this._timers[key]; fn(); }, delay);
  },
  cancel(key) {
    if(this._timers[key]) { clearTimeout(this._timers[key]); delete this._timers[key]; }
  }
};
window.AbortableTimer = AbortableTimer;


// ═══════════════════════════════════════════════════════════════════════
// 4. UI STABILITY — Safe render + DOM guards
// ═══════════════════════════════════════════════════════════════════════
const UIGuard = {
  // Safe innerHTML setter — catches errors silently
  set(elOrId, html) {
    try {
      const el = typeof elOrId==='string' ? document.getElementById(elOrId) : elOrId;
      if(el) el.innerHTML = html;
    } catch(e) { console.warn('[UIGuard.set]', e.message); }
  },

  // Safe element getter with fallback
  get(id) {
    try { return document.getElementById(id)||null; } catch(e) { return null; }
  },

  // Safe show/hide
  show(id) { const el=this.get(id); if(el) el.style.display=''; },
  hide(id) { const el=this.get(id); if(el) el.style.display='none'; },

  // Center a modal element on screen
  centerModal(el) {
    if(!el) return;
    el.style.position = 'fixed';
    el.style.top      = '50%';
    el.style.left     = '50%';
    el.style.transform= 'translate(-50%,-50%)';
    el.style.maxHeight= '90vh';
    el.style.overflowY= 'auto';
    el.style.zIndex   = '9999';
  },

  // Ensure element is within viewport
  ensureVisible(el) {
    if(!el) return;
    const rect = el.getBoundingClientRect();
    if(rect.right > window.innerWidth)  el.style.right = '0';
    if(rect.bottom > window.innerHeight) el.style.bottom = '0';
    if(rect.top < 0)  el.style.top = '0';
    if(rect.left < 0) el.style.left = '0';
  }
};
window.UIGuard = UIGuard;


// ═══════════════════════════════════════════════════════════════════════
// 5. WORKFLOW BRIDGE — Quoter → Orders → Pipeline → Sales
// ═══════════════════════════════════════════════════════════════════════
const WorkflowBridge = {
  // Quoter sends → creates order in 'attesa' state
  async fromQuoter(quoteData) {
    try {
      const order = {
        id:         Date.now(),
        name:       quoteData.name || 'Ordine da preventivo',
        clientName: quoteData.clientName || '',
        clientId:   quoteData.clientId || null,
        stage:      'attesa',
        status:     'attesa',
        total:      quoteData.total || 0,
        quoteId:    quoteData.id || null,
        notes:      quoteData.notes || '',
        createdAt:  new Date().toISOString(),
        dueDate:    quoteData.deadline || null,
        source:     'quoter',
      };
      await IDB.put('orders', order);
      OrdersDB.invalidate();
      document.dispatchEvent(new CustomEvent('orderUpdated', {detail:{id:order.id, newState:'attesa', order}}));
      toast('✅ Ordine creato in Pipeline!', 'success');
      return order;
    } catch(e) {
      toast('Errore creazione ordine: '+e.message, 'error');
      return null;
    }
  },

  // Move order to production
  async toProduction(orderId) {
    return OrdersDB.transition(orderId, 'produzione');
  },

  // Mark as completed → auto-create sale
  async complete(orderId) {
    const order = await OrdersDB.transition(orderId, 'completato');
    if(!order) return null;
    // Auto-suggest sale creation
    const fmt = v => '€'+Math.round(v||0).toLocaleString('it-IT');
    setTimeout(()=>{
      toast(
        `✅ Ordine completato! ${fmt(order.total||0)} — <span onclick="WorkflowBridge.createSale(${orderId})" style="cursor:pointer;text-decoration:underline;font-weight:800">Registra vendita →</span>`,
        'success', 5000
      );
    }, 300);
    return order;
  },

  // Create sale from completed order
  async createSale(orderId) {
    try {
      const order = await IDB.get('orders', +orderId||orderId).catch(()=>null);
      if(!order) return;
      const sale = {
        id:         Date.now(),
        clientName: order.clientName || '',
        desc:       order.name || 'Vendita',
        amount:     order.total || order.value || 0,
        date:       new Date().toISOString().slice(0,10),
        status:     'da_pagare',
        channel:    order.channel || 'Diretto',
        orderId:    orderId,
      };
      await IDB.put('sales', sale);
      order.stage = 'venduto'; order.status = 'venduto'; order.linkedSaleId = sale.id;
      await IDB.put('orders', order);
      OrdersDB.invalidate();
      AppStore?.invalidate?.('sales');
      AppStore?.invalidate?.('orders');
      toast('💰 Vendita registrata!', 'success');
      document.dispatchEvent(new CustomEvent('orderUpdated', {detail:{id:orderId, newState:'venduto'}}));
      if(App?.currentSection==='sales') setTimeout(()=>Sales?.render?.(), 200);
      return sale;
    } catch(e) {
      toast('Errore: '+e.message, 'error');
    }
  }
};
window.WorkflowBridge = WorkflowBridge;


// ═══════════════════════════════════════════════════════════════════════
// 6. RUNTIME STABILITY — Guard all module renders against DOM errors
// ═══════════════════════════════════════════════════════════════════════
(function installRuntimeGuards() {
  // Wrap every window.(typeof Module!=='undefined'&&Module.render()) with a try/catch
  const GUARDED = new Set();
  const guardModule = (name) => {
    const mod = window[name];
    if(!mod || !mod.render || GUARDED.has(name)) return;
    GUARDED.add(name);
    const orig = mod.render.bind(mod);
    mod.render = function(...args) {
      try {
        return orig(...args);
      } catch(e) {
        console.warn(`[${name}.render] Error:`, e.message);
        const viewEl = document.getElementById('view-'+name.toLowerCase());
        if(viewEl && !viewEl.querySelector('.render-error')) {
          viewEl.innerHTML += `<div class="render-error" style="padding:20px;color:#f87171;font-size:12px;background:#1c0505;border-radius:8px;margin:12px">⚠️ Errore rendering ${name}: ${e.message}</div>`;
        }
      }
    };
  };

  // Guard all known modules
  const TO_GUARD = ['Dashboard','Sales','Orders','PipelineOS','Quoter','Catalog',
    'Clients','Materials','Equipment','LabSetup','LaserResources','EtsyPulse',
    'CompTrack','SupplierIntel','ReplyAI','PhotoStudio','FieraAI'];
  TO_GUARD.forEach(guardModule);

  // Re-run after all modules are definitely loaded
  setTimeout(()=>TO_GUARD.forEach(guardModule), 3000);
  console.log('[RuntimeGuards] Installed ✅');
})();


// ═══════════════════════════════════════════════════════════════════════
// 7. INIT — Wire everything together
// ═══════════════════════════════════════════════════════════════════════
(function initStabilityLayer(){
  const ready = () => {
    if(typeof App==='undefined'||typeof IDB==='undefined') return setTimeout(ready, 500);

    // Patch Quoter.sendToWorkflow to use WorkflowBridge
    if(typeof Quoter!=='undefined' && !Quoter.__bridgePatched) {
      Quoter.__bridgePatched = true;
      const origSend = Quoter.sendToWorkflow?.bind(Quoter);
      if(origSend) {
        Quoter.sendToWorkflow = async function() {
          // First save the quote
          if(typeof this.saveQuote==='function') await this.saveQuote().catch(()=>{});
          // Build order data from current state
          const clientEl   = document.getElementById('q-client');
          const clientName = clientEl?.selectedIndex>0 ? clientEl.options[clientEl.selectedIndex].text : '';
          const markup     = parseFloat(document.getElementById('qr-markup')?.value||100)/100;
          const total      = (this.lines||[]).reduce((a,l)=>a+l.subtotal*(1+markup),0);
          await WorkflowBridge.fromQuoter({
            name:       document.getElementById('q-name')?.value||'Preventivo',
            clientName,
            total:      parseFloat(total.toFixed(2)),
            notes:      document.getElementById('q-notes')?.value||'',
            deadline:   document.getElementById('q-deadline')?.value||null,
          });
          App.navigate('pipeline');
        };
      }
    }

    // Listen for orderUpdated to keep all UIs in sync
    document.addEventListener('orderUpdated', () => {
      AbortableTimer.set('refresh-badges', ()=>{ SidebarBadges?.update(); QuickStats?.update(); }, 300);
    });

    console.log('[StabilityLayer v17] Ready ✅');
  };
  setTimeout(ready, 2000);
})();

