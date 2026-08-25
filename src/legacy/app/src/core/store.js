
// === /src/core/store.js ===
const RenderQueue = {
  _q: new Map(),
  _raf: null,
  schedule(id, fn) {
    this._q.set(id, fn);
    if (!this._raf) this._raf = requestAnimationFrame(() => this._flush());
  },
  _flush() {
    this._raf = null;
    this._q.forEach((fn, id) => { try { fn(); } catch(e) { console.warn('RQ', id, e); } });
    this._q.clear();
  }
};




// ══════════════════════════════════════════════════════════════════════
// APP STORE  v79 — Single Source of Truth for all read-heavy stores
// Replaces: DataLayer + BDW dual cache pattern
const INGLY_DEV = false; // set true for debug logs
// Usage:    const sales = await AppStore.get('sales');
//           AppStore.invalidate('sales');  // after writes
//           AppStore.on('sales', fn);      // reactive subscription
// ══════════════════════════════════════════════════════════════════════
const AppStore = {
  _cache:  {},      // store → { data, ts }
  _subs:   {},      // store → [fn, ...]
  TTL:     90000,
  STORE_TTL: { pipeline:30000, orders:30000, sales:30000, clients:60000, catalog:300000, fixed_costs:300000, materials:300000, equipment:300000 },
  PRELOAD_STORES: ['pipeline','orders','clients','sales','catalog','fixed_costs'],  // v4.0: preload on boot

  // ── Get (returns from cache or fetches fresh) ─────────────────────────
  async get(storeName, force=false) {
    const now = Date.now();
    const entry = this._cache[storeName];
    const ttl = this.STORE_TTL?.[storeName] ?? this.TTL;
    if (!force && entry && (now - entry.ts) < ttl) {
      return entry.data;
    }
    try {
      const data = await IDB.getAll(storeName);
      this._cache[storeName] = { data, ts: now };
      return data;
    } catch (e) {
      return entry?.data || [];
    }
  },

  // ── Get many stores in parallel ───────────────────────────────────────
  async getMany(storeNames) {
    const results = await Promise.all(storeNames.map(n => this.get(n)));
    return Object.fromEntries(storeNames.map((n, i) => [n, results[i]]));
  },

  // ── Invalidate (mark stale, notify subscribers) ───────────────────────
  invalidate(storeName) {
    delete this._cache[storeName]; // FIX: full delete, not just ts=0
    // Notify via Bus too
    Bus.emit('store:updated', { store: storeName });
    // Call direct subscribers
    (this._subs[storeName] || []).forEach(fn => {
      try { fn(storeName); } catch (e) {}
    });
  },
  invalidateBatch(stores) {
    if (!Array.isArray(stores)) stores = [stores];
    stores.forEach(s => this.invalidate(s));
  },



  // ── Reactive subscription ─────────────────────────────────────────────
  on(storeName, fn) {
    if (!this._subs[storeName]) this._subs[storeName] = [];
    this._subs[storeName].push(fn);
  },
  off(storeName, fn) {
    this._subs[storeName] = (this._subs[storeName] || []).filter(f => f !== fn);
  },

  // ── Write-through: put + invalidate ──────────────────────────────────
  async put(storeName, record) {
    const id = await IDB.put(storeName, record).catch(()=>{});
    this.invalidate(storeName);
    return id;
  },

  // ── Prefetch all critical stores (call at startup) ────────────────────
  async prefetch() {
    const critical = ['sales','clients','quotes','orders','items','materials','cashflow','catalog'];
    await Promise.all(critical.map(s => this.get(s).catch(() => [])));
    Bus.emit('store:prefetched');
  },

  // ── Dashboard reactive refresh ────────────────────────────────────────
  _dashboardStores: new Set(['sales','quotes','clients','orders','cashflow']),
  _dashboardDebounce: null,
  _initDashboardReactive() {
    Bus.on('store:updated', ({ store }) => {
      if (!this._dashboardStores.has(store)) return;
      clearTimeout(this._dashboardDebounce);
      this._dashboardDebounce = setTimeout(() => {
        // Only refresh if dashboard is currently visible
        if (typeof App !== 'undefined' && App.curr === 'dashboard') {
          if(typeof KPIEngine!=='undefined'&&typeof KPIEngine.run==='function'){const _kp=KPIEngine.run();if(_kp&&typeof _kp.then==='function')_kp.then((k)=>Dashboard?.updateKPIs?.(k));}
        }
        // Always invalidate BDW so next load is fresh
        if (typeof BDW !== 'undefined') {
          BDW._ts = 0; BDW._cache = null;
        }
      }, 400);
    });
  },
};
// Wire up reactive dashboard on load
document.addEventListener('DOMContentLoaded', () => {
  AppStore._initDashboardReactive();
  // v4.0: preload key stores in background for faster first navigation
  if (AppStore.PRELOAD_STORES) {
    setTimeout(function(){
      AppStore.PRELOAD_STORES.forEach(function(s){
        AppStore.get(s).catch(function(){});
      });
    }, 500);
  }
});


// ===== UTILS =====
window.RenderQueue = RenderQueue;
window.AppStore = AppStore;

// ════════════════════════════════════════════════════════════════════════
// v17 SSOT INTERCEPTOR: AppStore.get('pipeline') → legge da 'orders'
// Garantisce che tutte le sezioni usino la stessa fonte dati
// ════════════════════════════════════════════════════════════════════════
(function installSSOTInterceptor(){
  const _origGet = AppStore.get.bind(AppStore);
  AppStore.get = async function(store, opts) {
    // Reindirizza pipeline reads su orders
    if(store === 'pipeline') {
      try {
        const orders = await _origGet('orders', opts);
        // Normalizza gli ordini per compatibilità con pipeline consumer
        return (orders||[]).map(o => ({
          ...o,
          _source: 'orders',
          _sourceId: o.id,
          stage: o.stage || o.status || 'draft',
          status: o.stage || o.status || 'draft',
        }));
      } catch(e) { return _origGet(store, opts); }
    }
    return _origGet(store, opts);
  };
  // Invalida entrambi quando cambia uno
  const _origInvalidate = AppStore.invalidate.bind(AppStore);
  AppStore.invalidate = function(store) {
    _origInvalidate(store);
    if(store === 'orders') _origInvalidate('pipeline');
    if(store === 'pipeline') _origInvalidate('orders');
  };
  console.log('[SSOTInterceptor] AppStore pipeline→orders installed ✅');
})();


