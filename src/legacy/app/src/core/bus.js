
// === /src/core/bus.js ===
const Bus={
  _l:{},
  on(e,fn){(this._l[e]=this._l[e]||[]).push(fn)},
  emit(e,d){(this._l[e]||[]).forEach(fn=>{try{fn(d)}catch(ex){console.warn('Bus',e,ex)}})},
  off(e,fn){this._l[e]=(this._l[e]||[]).filter(f=>f!==fn)},
  once(e,fn){const w=(d)=>{fn(d);this.off(e,w)};this.on(e,w)},
  _bridges(){
    // v3.0: collega eventi emessi ma senza listener
    this.on('orders:created',(d)=>{this.emit('order:saved',d);if(typeof AppStore!=='undefined'){AppStore.invalidate('orders');AppStore.invalidate('pipeline');}});
    this.on('orders:updated',(d)=>{this.emit('order:updated',d);if(typeof AppStore!=='undefined'){AppStore.invalidate('orders');AppStore.invalidate('pipeline');}});
    this.on('pipeline:confirmed',(d)=>{this.emit('order:saved',d);if(typeof AppStore!=='undefined')AppStore.invalidate('orders')});
    this.on('pipeline:kanban_moved',(d)=>{this.emit('order:stage_changed',d)});
    this.on('sale:paid',(d)=>{if(typeof AppStore!=='undefined'){AppStore.invalidate('sales');AppStore.invalidate('orders');AppStore.invalidate('pipeline');}this.emit('cashflow:changed',d)});
    this.on('cashflow:changed',()=>{if(typeof AppStore!=='undefined')AppStore.invalidate('cashflow')});
    this.on('bdw:dirty',()=>{if(typeof AppStore!=='undefined')AppStore.invalidate('sales')});
    this.on('pipeline:synced',()=>{if(typeof AppStore!=='undefined'){AppStore.invalidate('orders');AppStore.invalidate('sales')}});
  }
};

// ════════════════════════════════════════════════════════
// RENDERQUEUE v85 — batch DOM updates via requestAnimationFrame
// ════════════════════════════════════════════════════════
window.Bus = Bus;

// ── Defensive guard: ensure Bus is always globally available ─────────
if(typeof window.Bus === 'undefined') {
  window.Bus = { _l:{}, on:function(){}, emit:function(){}, off:function(){}, once:function(){} };
  console.warn('[INGLY] Bus not initialized — using stub');
}

