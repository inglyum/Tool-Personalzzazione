
// ingly-prox-v2.js — INGLY OS · V1 Fondamenta Operative + V2 Intelligenza Commerciale
// Roadmap V1: Kanban Ordini, CRM Segmentazione, Backup Auto, Finance Pipeline
// Roadmap V2: AI Business Advisor, Finance P&L, Smart Quoter Unificato, CRM LTV/Churn
(function () {
  'use strict';
  if (window._inglyProXV2) return;
  window._inglyProXV2 = true;

  /* ═══════════════════════════════════════════════════════════════════
     SHARED UTILITIES
  ═══════════════════════════════════════════════════════════════════ */
  var STORE = {
    get: function (key) {
      try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
    },
    set: function (key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
    },
    arr: function (key) {
      var v = this.get(key);
      if (Array.isArray(v)) return v;
      if (v && Array.isArray(v.items)) return v.items;
      if (v && Array.isArray(v.clients)) return v.clients;
      return [];
    }
  };

  function fmt(n, dec) {
    dec = dec === undefined ? 2 : dec;
    return '€' + (+n || 0).toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function fmtN(n) { return (+n || 0).toLocaleString('it-IT', { maximumFractionDigits: 0 }); }
  function dateIT(d) { try { return new Date(d).toLocaleDateString('it-IT'); } catch (e) { return d || '—'; } }
  function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function toastr(msg, type, ms) {
    if (typeof toast !== 'undefined') { toast(msg, type || 'info', ms || 2500); return; }
    console.log('[v2]', msg);
  }

  // Unified client reader
  function readClients() {
    var out = [], seen = {};
    ['ingly_clients', 'ingly_crm_v1'].forEach(function (k) {
      STORE.arr(k).forEach(function (c) {
        var id = c.id || c.name || c.nome || '';
        if (!seen[id]) { seen[id] = true; out.push(c); }
      });
    });
    return out;
  }

  // Unified order reader
  function readOrders() {
    var out = [], seen = {};
    ['ingly_orders', 'ingly_quotes', 'lb2b_quotes_v1'].forEach(function (k) {
      STORE.arr(k).forEach(function (o) {
        var id = o.id || o.orderId || '';
        if (!seen[id]) { seen[id] = true; out.push(o); }
      });
    });
    return out;
  }

  function clientName(c) { return c.name || c.nome || c.ragioneSociale || c.company || 'Cliente'; }
  function orderClient(o) { return o.client || o.clientName || o.cliente || o.name || ''; }
  function orderAmt(o) { return +(o.total || o.totalPrice || o.amount || o.totale || o.subtotal || 0); }
  function orderDate(o) { return o.date || o.createdAt || o.data || o.orderDate || ''; }
  function orderStatus(o) {
    var s = (o.status || o.stage || o.stato || '').toLowerCase();
    if (s.includes('produz') || s.includes('lavoraz') || s.includes('progress')) return 'produzione';
    if (s.includes('spediz') || s.includes('consegn') || s.includes('shipped')) return 'consegnato';
    if (s.includes('pagat') || s.includes('paid') || s.includes('completat') || s.includes('done')) return 'pagato';
    if (s.includes('annull') || s.includes('cancel')) return 'annullato';
    return 'attesa';
  }

  /* ═══════════════════════════════════════════════════════════════════
     GLOBAL CSS
  ═══════════════════════════════════════════════════════════════════ */
  function injectV2CSS() {
    if (document.getElementById('prox-v2-css')) return;
    var s = document.createElement('style');
    s.id = 'prox-v2-css';
    s.textContent = `
/* ── V2 shared ── */
.v2-card {
  background:var(--bg-card,#0f0f11);
  border:1px solid rgba(255,255,255,.08);
  border-radius:14px; padding:16px 18px; margin-bottom:14px;
}
.v2-title {
  font-size:11px; font-weight:700; color:#71717a;
  text-transform:uppercase; letter-spacing:.5px;
  display:flex; align-items:center; gap:8px; margin-bottom:14px;
}
.v2-title span { flex:1; }
.v2-kpis {
  display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr));
  gap:8px; margin-bottom:14px;
}
.v2-kpi {
  background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06);
  border-radius:10px; padding:12px 14px; text-align:center;
  transition:border-color .12s;
}
.v2-kpi:hover { border-color:rgba(255,255,255,.15); }
.v2-kpi-val { font-size:22px; font-weight:800; line-height:1; margin-bottom:4px; }
.v2-kpi-lbl { font-size:9px; color:#71717a; text-transform:uppercase; letter-spacing:.4px; }
.v2-btn {
  padding:8px 16px; border-radius:8px; border:none; cursor:pointer;
  font-size:12px; font-weight:600; transition:.12s; display:inline-flex;
  align-items:center; gap:6px;
}
.v2-btn-primary { background:#fbbf24; color:#09090b; }
.v2-btn-primary:hover { background:#f59e0b; }
.v2-btn-secondary { background:rgba(255,255,255,.06); color:#a1a1aa; border:1px solid rgba(255,255,255,.1); }
.v2-btn-secondary:hover { background:rgba(255,255,255,.1); color:#e5e5e5; }
.v2-btn-sm { padding:5px 11px; font-size:11px; border-radius:6px; }
.v2-search {
  padding:8px 12px 8px 34px; background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.1); border-radius:8px;
  color:#e5e5e5; font-size:12px; outline:none; transition:.12s; width:100%; box-sizing:border-box;
}
.v2-search:focus { border-color:rgba(251,191,36,.4); }
.v2-search-wrap { position:relative; }
.v2-search-wrap::before { content:'🔍'; position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:13px; pointer-events:none; }

/* ════════════════════════════════════
   KANBAN ORDERS
════════════════════════════════════ */
#prox-kanban {
  display:grid;
  grid-template-columns:repeat(5,minmax(180px,1fr));
  gap:10px; padding-bottom:8px;
  overflow-x:auto; align-items:start;
}
@media(max-width:900px){#prox-kanban{grid-template-columns:repeat(3,minmax(160px,1fr));}}
@media(max-width:600px){#prox-kanban{grid-template-columns:repeat(2,minmax(150px,1fr));}}

.kb-col {
  border-radius:12px; overflow:hidden;
  background:rgba(255,255,255,.025);
  border:1px solid rgba(255,255,255,.07);
  min-height:120px;
}
.kb-col-hdr {
  padding:10px 12px; font-size:10px; font-weight:700;
  text-transform:uppercase; letter-spacing:.4px;
  display:flex; align-items:center; justify-content:space-between;
  position:sticky; top:0; z-index:2;
}
.kb-col-body { padding:8px; min-height:80px; }
.kb-col.drag-over .kb-col-body { background:rgba(251,191,36,.06); border-radius:8px; }

.kb-card {
  background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
  border-radius:9px; padding:10px 11px; margin-bottom:6px;
  cursor:grab; user-select:none; transition:border-color .12s, box-shadow .12s;
  position:relative;
}
.kb-card:active { cursor:grabbing; }
.kb-card:hover { border-color:rgba(251,191,36,.3); box-shadow:0 4px 16px rgba(0,0,0,.4); }
.kb-card.dragging { opacity:.4; }
.kb-card-client { font-size:12px; font-weight:700; color:#e5e5e5; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.kb-card-id { font-size:9px; color:#52525b; font-family:monospace; margin-bottom:4px; }
.kb-card-amount { font-size:13px; font-weight:800; color:#fbbf24; }
.kb-card-date { font-size:9px; color:#52525b; }
.kb-card-actions { position:absolute; top:6px; right:6px; display:flex; gap:4px; opacity:0; transition:.12s; }
.kb-card:hover .kb-card-actions { opacity:1; }
.kb-card-btn { background:rgba(255,255,255,.08); border:none; border-radius:4px; cursor:pointer; color:#a1a1aa; font-size:10px; padding:2px 5px; }
.kb-card-btn:hover { background:rgba(251,191,36,.15); color:#fbbf24; }
.kb-col-empty { font-size:10px; color:#3f3f46; text-align:center; padding:16px 8px; }
.kb-add-card {
  width:100%; padding:7px; background:transparent;
  border:1px dashed rgba(255,255,255,.1); border-radius:8px;
  color:#52525b; font-size:11px; cursor:pointer; margin-top:4px; transition:.12s;
}
.kb-add-card:hover { border-color:rgba(251,191,36,.3); color:#fbbf24; }

/* New order quick modal */
#prox-order-modal-overlay {
  position:fixed; inset:0; z-index:18000; background:rgba(0,0,0,.8);
  backdrop-filter:blur(6px); display:none; align-items:center; justify-content:center;
}
#prox-order-modal-overlay.open { display:flex; }
#prox-order-modal {
  background:#0f0f11; border:1px solid rgba(255,255,255,.12); border-radius:16px;
  padding:24px; width:100%; max-width:480px; box-shadow:0 24px 60px rgba(0,0,0,.9);
}
#prox-order-modal h3 { margin:0 0 16px; font-size:16px; color:#e5e5e5; }

/* ════════════════════════════════════
   CRM ENHANCEMENT
════════════════════════════════════ */
#prox-crm-bar { margin-bottom:14px; }
.crm-seg-strip { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; }
.crm-seg-badge {
  padding:5px 12px; border-radius:20px; font-size:11px; font-weight:700;
  cursor:pointer; transition:.12s; border:1px solid transparent;
}
.crm-seg-A    { background:rgba(34,197,94,.12);   color:#22c55e; border-color:rgba(34,197,94,.2); }
.crm-seg-B    { background:rgba(251,191,36,.12);  color:#fbbf24; border-color:rgba(251,191,36,.2); }
.crm-seg-C    { background:rgba(100,116,139,.12); color:#94a3b8; border-color:rgba(100,116,139,.2); }
.crm-seg-dorm { background:rgba(239,68,68,.12);   color:#ef4444; border-color:rgba(239,68,68,.2); }
.crm-seg-badge.active { box-shadow:0 0 0 2px currentColor; }

.crm-client-list { display:flex; flex-direction:column; gap:4px; }
.crm-client-item {
  display:grid; grid-template-columns:36px 1fr auto auto auto;
  align-items:center; gap:8px 12px; padding:10px 12px;
  background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.06);
  border-radius:10px; cursor:pointer; transition:.12s;
}
.crm-client-item:hover { border-color:rgba(251,191,36,.25); background:rgba(255,255,255,.04); }
.crm-init {
  width:36px; height:36px; border-radius:50%; display:flex; align-items:center;
  justify-content:center; font-size:13px; font-weight:800; flex-shrink:0;
}
.crm-name { font-size:13px; font-weight:600; color:#e5e5e5; }
.crm-meta { font-size:10px; color:#52525b; margin-top:2px; }
.crm-ltv { font-size:13px; font-weight:700; color:#fbbf24; text-align:right; }
.crm-seg { font-size:9px; font-weight:700; padding:2px 6px; border-radius:10px; text-align:center; }
.crm-dormancy { font-size:9px; color:#71717a; text-align:right; white-space:nowrap; }
.crm-dormancy.alert { color:#ef4444; font-weight:600; }

.crm-detail-panel {
  position:fixed; top:0; right:0; bottom:0; z-index:15000; width:360px; max-width:95vw;
  background:#0a0a0c; border-left:1px solid rgba(255,255,255,.1);
  box-shadow:-8px 0 40px rgba(0,0,0,.8); display:none; flex-direction:column;
  overflow-y:auto; padding-bottom:80px;
}
.crm-detail-panel.open { display:flex; }
.cdp-header { padding:20px; border-bottom:1px solid rgba(255,255,255,.06); }
.cdp-header h3 { margin:0 0 4px; font-size:18px; color:#e5e5e5; }

/* ════════════════════════════════════
   BACKUP MANAGER
════════════════════════════════════ */
#prox-backup-bar { margin-bottom:14px; }
.bk-slot {
  display:flex; align-items:center; gap:10px; padding:10px 12px;
  background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.06);
  border-radius:9px; margin-bottom:4px;
}
.bk-slot-ts { font-size:11px; color:#a1a1aa; flex:1; }
.bk-slot-size { font-size:10px; color:#52525b; }
.bk-slot-badge { font-size:9px; padding:2px 8px; border-radius:10px; font-weight:700; }
.bk-auto { background:rgba(34,197,94,.15); color:#22c55e; }
.bk-manual { background:rgba(96,165,250,.15); color:#60a5fa; }

/* ════════════════════════════════════
   FINANCE SUITE (P&L)
════════════════════════════════════ */
#prox-finance-pl { margin-bottom:14px; }
.pl-month-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:6px; margin-bottom:12px; }
.pl-month-card {
  padding:10px 12px; border-radius:9px; border:1px solid rgba(255,255,255,.07);
  background:rgba(255,255,255,.025); cursor:pointer; transition:.12s;
}
.pl-month-card:hover { border-color:rgba(251,191,36,.3); }
.pl-month-card.active { border-color:rgba(251,191,36,.5); background:rgba(251,191,36,.06); }
.pl-month-name { font-size:10px; color:#71717a; font-weight:600; text-transform:uppercase; margin-bottom:4px; }
.pl-month-rev { font-size:14px; font-weight:800; color:#22c55e; }
.pl-month-exp { font-size:10px; color:#ef4444; margin-top:2px; }
.pl-table { width:100%; border-collapse:collapse; font-size:12px; }
.pl-table th { padding:6px 10px; font-size:9px; color:#52525b; text-transform:uppercase; letter-spacing:.4px; border-bottom:1px solid rgba(255,255,255,.06); }
.pl-table td { padding:8px 10px; border-bottom:1px solid rgba(255,255,255,.04); }
.pl-row-income td { color:#22c55e; }
.pl-row-expense td { color:#ef4444; }
.pl-row-net td { color:#fbbf24; font-weight:800; font-size:13px; border-top:1px solid rgba(255,255,255,.1); }

/* ════════════════════════════════════
   AI BUSINESS ADVISOR
════════════════════════════════════ */
#prox-advisor-widget {
  background:linear-gradient(135deg,rgba(251,191,36,.08),rgba(167,139,250,.06));
  border:1px solid rgba(251,191,36,.2); border-radius:14px;
  padding:16px 18px; margin-bottom:14px;
}
.adv-header { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
.adv-icon { font-size:24px; }
.adv-title { font-size:14px; font-weight:700; color:#e5e5e5; }
.adv-subtitle { font-size:10px; color:#71717a; }
.adv-kpis { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:8px; margin-bottom:14px; }
.adv-kpi { background:rgba(0,0,0,.3); border:1px solid rgba(255,255,255,.07); border-radius:9px; padding:10px 12px; }
.adv-kpi-val { font-size:18px; font-weight:800; color:#fbbf24; line-height:1; margin-bottom:3px; }
.adv-kpi-lbl { font-size:9px; color:#71717a; text-transform:uppercase; letter-spacing:.3px; }
.adv-alerts { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
.adv-alert {
  display:flex; align-items:flex-start; gap:8px; padding:8px 12px;
  border-radius:8px; font-size:11px;
}
.adv-alert-warn { background:rgba(245,158,11,.1); border:1px solid rgba(245,158,11,.2); color:#d97706; }
.adv-alert-ok   { background:rgba(34,197,94,.08); border:1px solid rgba(34,197,94,.15); color:#16a34a; }
.adv-alert-info { background:rgba(96,165,250,.08); border:1px solid rgba(96,165,250,.15); color:#3b82f6; }
.adv-weekly-brief {
  background:rgba(0,0,0,.3); border-radius:10px; padding:12px 14px;
  font-size:11px; color:#a1a1aa; line-height:1.6;
}
.adv-brief-line { margin-bottom:3px; }
.adv-brief-line strong { color:#e5e5e5; }

/* Cashflow chart */
.cf-bar-wrap { display:flex; gap:6px; align-items:flex-end; height:80px; }
.cf-bar-col { display:flex; flex-direction:column; align-items:center; gap:2px; flex:1; }
.cf-bar { border-radius:4px 4px 0 0; min-height:4px; width:100%; transition:.3s; }
.cf-bar-lbl { font-size:8px; color:#52525b; white-space:nowrap; }
`;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════════════════════════════
     V1 — KANBAN ORDINI (drag & drop)
  ═══════════════════════════════════════════════════════════════════ */
  var KANBAN_COLS = [
    { id:'attesa',     label:'📥 Da Gestire',   color:'#64748b', bg:'rgba(100,116,139,.12)' },
    { id:'produzione', label:'⚙️ In Produzione', color:'#f59e0b', bg:'rgba(245,158,11,.12)'  },
    { id:'consegnato', label:'🚚 Consegnato',    color:'#60a5fa', bg:'rgba(96,165,250,.12)'  },
    { id:'pagato',     label:'✅ Pagato',        color:'#22c55e', bg:'rgba(34,197,94,.12)'   },
    { id:'annullato',  label:'❌ Annullato',     color:'#ef4444', bg:'rgba(239,68,68,.12)'   },
  ];

  function buildKanban() {
    var section = document.getElementById('view-gestione_ordini');
    if (!section || section._kanbanBuilt) return;

    function _try(n) {
      n = n || 0; if (n > 40) return;
      if (!section.children.length) { setTimeout(function(){ _try(n+1); }, 400); return; }
      if (section._kanbanBuilt) return;
      section._kanbanBuilt = true;
      _doKanban(section);
    }
    _try();
  }

  function _doKanban(section) {
    /* Remove the old prox-ordini-bar from v15 if present (we supersede it) */
    var old = document.getElementById('prox-ordini-bar');
    if (old) old.remove();

    /* ── Wrapper ── */
    var wrap = document.createElement('div');
    wrap.id = 'prox-kanban-wrap';

    /* Top bar */
    var topBar = document.createElement('div');
    topBar.className = 'v2-card';
    topBar.style.cssText = 'margin-bottom:10px;';
    topBar.innerHTML =
      '<div class="v2-title"><span>📋 Ordini & Workflow</span>' +
      '<button class="v2-btn v2-btn-primary v2-btn-sm" id="kb-new-btn">＋ Nuovo Ordine</button>' +
      '<button class="v2-btn v2-btn-secondary v2-btn-sm" id="kb-refresh-btn" style="margin-left:6px">↺ Aggiorna</button>' +
      '</div>' +
      '<div class="v2-kpis" id="kb-kpis"></div>' +
      '<div class="v2-search-wrap" style="max-width:360px">' +
      '<input class="v2-search" id="kb-search" placeholder="Cerca cliente, ordine, importo...">' +
      '</div>';
    wrap.appendChild(topBar);

    /* Kanban grid */
    var grid = document.createElement('div');
    grid.id = 'prox-kanban';
    wrap.appendChild(grid);

    section.insertBefore(wrap, section.firstChild);

    /* ── State ── */
    var dragState = { card: null, fromCol: null };
    var searchQ = '';

    /* ── Helpers ── */
    function saveOrder(o) {
      var key = o._src || 'ingly_orders';
      var arr = STORE.arr(key);
      var idx = arr.findIndex(function(x){ return x.id === o.id; });
      var clean = Object.assign({}, o); delete clean._src;
      if (idx >= 0) arr[idx] = clean; else arr.push(clean);
      STORE.set(key, arr);
    }

    function getOrders() {
      return readOrders();
    }

    /* ── KPIs ── */
    function renderKPIs() {
      var orders = getOrders();
      var pagati  = orders.filter(function(o){ return orderStatus(o)==='pagato'; });
      var inProd  = orders.filter(function(o){ return orderStatus(o)==='produzione'; });
      var total   = orders.reduce(function(s,o){ return s+orderAmt(o); }, 0);
      var incass  = pagati.reduce(function(s,o){ return s+orderAmt(o); }, 0);
      var el = document.getElementById('kb-kpis');
      if (!el) return;
      el.innerHTML = [
        { val: orders.length,        lbl: 'Ordini totali',  color: '#e5e5e5' },
        { val: inProd.length,        lbl: 'In lavorazione', color: '#f59e0b' },
        { val: pagati.length,        lbl: 'Pagati',         color: '#22c55e' },
        { val: fmt(total, 0),        lbl: 'Valore totale',  color: '#fbbf24' },
        { val: fmt(incass, 0),       lbl: 'Incassato',      color: '#22c55e' },
        { val: readClients().length, lbl: 'Clienti CRM',    color: '#60a5fa' },
      ].map(function(k){
        return '<div class="v2-kpi"><div class="v2-kpi-val" style="color:'+k.color+'">'+k.val+'</div><div class="v2-kpi-lbl">'+k.lbl+'</div></div>';
      }).join('');
    }

    /* ── Kanban render ── */
    function renderKanban() {
      var orders = getOrders();
      var q = searchQ.toLowerCase().trim();
      if (q) orders = orders.filter(function(o){
        return (orderClient(o)||'').toLowerCase().includes(q) ||
               (o.id||'').toString().toLowerCase().includes(q) ||
               orderAmt(o).toString().includes(q);
      });

      /* Group by status */
      var groups = {};
      KANBAN_COLS.forEach(function(c){ groups[c.id]=[]; });
      orders.forEach(function(o){ var st=orderStatus(o); if(groups[st]) groups[st].push(o); else groups['attesa'].push(o); });

      grid.innerHTML = '';
      KANBAN_COLS.forEach(function(col){
        var cards = groups[col.id];
        var colEl = document.createElement('div');
        colEl.className = 'kb-col';
        colEl.dataset.col = col.id;

        colEl.innerHTML =
          '<div class="kb-col-hdr" style="background:'+col.bg+';color:'+col.color+'">'+
          '<span>'+col.label+'</span>'+
          '<span style="background:rgba(0,0,0,.3);border-radius:20px;padding:1px 8px;font-size:11px">'+cards.length+'</span>'+
          '</div>'+
          '<div class="kb-col-body" id="kb-body-'+col.id+'"></div>';

        grid.appendChild(colEl);

        var body = colEl.querySelector('.kb-col-body');

        if (!cards.length) {
          body.innerHTML = '<div class="kb-col-empty">Nessun ordine</div>';
        } else {
          cards.forEach(function(o){
            var card = document.createElement('div');
            card.className = 'kb-card';
            card.draggable = true;
            card.dataset.id = o.id || '';
            card.dataset.src = o._src || 'ingly_orders';
            var amt = orderAmt(o);
            var dt  = dateIT(orderDate(o));
            var nm  = orderClient(o) || 'Cliente';
            card.innerHTML =
              '<div class="kb-card-id">#'+(o.id||'—').toString().slice(-8)+'</div>'+
              '<div class="kb-card-client">'+esc(nm)+'</div>'+
              (amt ? '<div class="kb-card-amount">'+fmt(amt,0)+'</div>' : '')+
              '<div class="kb-card-date">'+dt+'</div>'+
              '<div class="kb-card-actions">'+
              KANBAN_COLS.filter(function(c){return c.id!==col.id;}).slice(0,3).map(function(c){
                return '<button class="kb-card-btn" data-move="'+c.id+'" title="Sposta in '+c.label+'">→'+c.label.split(' ')[1]+'</button>';
              }).join('')+
              '</div>';

            /* Drag events */
            card.addEventListener('dragstart', function(e){
              dragState.card = o;
              dragState.fromCol = col.id;
              card.classList.add('dragging');
              e.dataTransfer.effectAllowed = 'move';
            });
            card.addEventListener('dragend', function(){
              card.classList.remove('dragging');
            });

            /* Quick move buttons */
            card.addEventListener('click', function(e){
              var btn = e.target.closest('[data-move]');
              if (!btn) return;
              e.stopPropagation();
              o.status = btn.dataset.move;
              o.stage  = btn.dataset.move;
              saveOrder(o);
              renderKanban();
              renderKPIs();
              toastr('Ordine spostato in '+(btn.dataset.move), 'success', 1500);
            });

            body.appendChild(card);
          });
        }

        /* Add card button */
        var addBtn = document.createElement('button');
        addBtn.className = 'kb-add-card';
        addBtn.textContent = '＋ Aggiungi ordine';
        addBtn.addEventListener('click', function(){ openNewOrderModal(col.id); });
        body.appendChild(addBtn);

        /* Drop zone */
        colEl.addEventListener('dragover', function(e){
          e.preventDefault();
          colEl.classList.add('drag-over');
        });
        colEl.addEventListener('dragleave', function(){
          colEl.classList.remove('drag-over');
        });
        colEl.addEventListener('drop', function(e){
          e.preventDefault();
          colEl.classList.remove('drag-over');
          if (!dragState.card || dragState.fromCol === col.id) return;
          dragState.card.status = col.id;
          dragState.card.stage  = col.id;
          saveOrder(dragState.card);
          toastr('Spostato in '+col.label.split(' ').slice(1).join(' '), 'success', 1500);
          dragState.card = null; dragState.fromCol = null;
          renderKanban();
          renderKPIs();
        });
      });
    }

    renderKPIs();
    renderKanban();

    /* Search */
    document.getElementById('kb-search').addEventListener('input', function(){
      searchQ = this.value;
      renderKanban();
    });
    document.getElementById('kb-refresh-btn').addEventListener('click', function(){
      renderKPIs(); renderKanban();
    });

    /* New order btn */
    document.getElementById('kb-new-btn').addEventListener('click', function(){ openNewOrderModal('attesa'); });

    /* Storage sync */
    window.addEventListener('storage', function(e){
      if (['ingly_orders','ingly_quotes','lb2b_quotes_v1','ingly_clients','ingly_crm_v1'].includes(e.key)){
        renderKPIs(); renderKanban();
      }
    });

    /* ── New Order Modal ── */
    buildNewOrderModal();
    function openNewOrderModal(defaultStatus) {
      var ov = document.getElementById('prox-order-modal-overlay');
      if (!ov) return;
      document.getElementById('nom-status').value = defaultStatus || 'attesa';
      renderClientAC_nom('');
      ov.classList.add('open');
    }
  }

  function buildNewOrderModal() {
    if (document.getElementById('prox-order-modal-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'prox-order-modal-overlay';

    var modal = document.createElement('div');
    modal.id = 'prox-order-modal';

    modal.innerHTML =
      '<h3>➕ Nuovo Ordine</h3>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
      '<div style="grid-column:1/-1">'+
      '<label style="font-size:10px;color:#71717a;display:block;margin-bottom:4px">Cliente</label>'+
      '<div class="v2-search-wrap" style="position:relative">'+
      '<input class="v2-search" id="nom-client" placeholder="Cerca cliente CRM..." autocomplete="off">'+
      '<div id="nom-client-ac" style="position:absolute;top:100%;left:0;right:0;background:#161618;border:1px solid rgba(255,255,255,.12);border-radius:8px;z-index:100;max-height:140px;overflow-y:auto;display:none;box-shadow:0 8px 24px rgba(0,0,0,.7)"></div>'+
      '</div></div>'+
      '<div><label style="font-size:10px;color:#71717a;display:block;margin-bottom:4px">Descrizione ordine</label>'+
      '<input class="v2-search" id="nom-desc" placeholder="es. 50 targhette MDF" style="padding-left:12px"></div>'+
      '<div><label style="font-size:10px;color:#71717a;display:block;margin-bottom:4px">Importo (€)</label>'+
      '<input type="number" class="v2-search" id="nom-amount" placeholder="0.00" min="0" step="0.01" style="padding-left:12px"></div>'+
      '<div><label style="font-size:10px;color:#71717a;display:block;margin-bottom:4px">Stato</label>'+
      '<select class="v2-search" id="nom-status" style="padding-left:12px">'+
      KANBAN_COLS.map(function(c){ return '<option value="'+c.id+'">'+c.label+'</option>'; }).join('')+
      '</select></div>'+
      '<div><label style="font-size:10px;color:#71717a;display:block;margin-bottom:4px">Data consegna</label>'+
      '<input type="date" class="v2-search" id="nom-deadline" style="padding-left:12px"></div>'+
      '<div><label style="font-size:10px;color:#71717a;display:block;margin-bottom:4px">Tecnica</label>'+
      '<select class="v2-search" id="nom-technique" style="padding-left:12px">'+
      '<option value="">— Seleziona —</option>'+
      '<option value="laser">⚡ Laser</option><option value="dtf">🖨️ DTF</option>'+
      '<option value="sublimazione">🎨 Sublimazione</option><option value="uv">🌈 UV</option>'+
      '<option value="misto">🔀 Misto</option>'+
      '</select></div>'+
      '</div>'+
      '<div style="display:flex;gap:8px;margin-top:16px">'+
      '<button class="v2-btn v2-btn-primary" id="nom-save-btn">💾 Crea Ordine</button>'+
      '<button class="v2-btn v2-btn-secondary" id="nom-cancel-btn">Annulla</button>'+
      '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function renderClientAC_nom(q) {
      var ac = document.getElementById('nom-client-ac');
      if (!ac) return;
      q = q.toLowerCase().trim();
      var clients = readClients().filter(function(c){
        return !q || clientName(c).toLowerCase().includes(q);
      }).slice(0,8);
      if (!clients.length) { ac.style.display='none'; return; }
      ac.innerHTML = clients.map(function(c){
        var nm = clientName(c);
        return '<div style="padding:8px 12px;cursor:pointer;font-size:12px;color:#e5e5e5;border-bottom:1px solid rgba(255,255,255,.04)" data-name="'+esc(nm)+'" class="nom-ac-item">'+esc(nm)+'</div>';
      }).join('');
      ac.style.display = 'block';
      ac.querySelectorAll('.nom-ac-item').forEach(function(item){
        item.addEventListener('mousedown', function(e){
          e.preventDefault();
          document.getElementById('nom-client').value = item.dataset.name;
          ac.style.display = 'none';
        });
      });
    }
    window.renderClientAC_nom = renderClientAC_nom;

    document.getElementById('nom-client').addEventListener('input', function(){
      renderClientAC_nom(this.value);
    });
    document.getElementById('nom-client').addEventListener('blur', function(){
      setTimeout(function(){ var ac=document.getElementById('nom-client-ac'); if(ac) ac.style.display='none'; }, 200);
    });

    document.getElementById('nom-cancel-btn').addEventListener('click', function(){
      overlay.classList.remove('open');
    });
    overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.classList.remove('open'); });

    document.getElementById('nom-save-btn').addEventListener('click', function(){
      var client  = document.getElementById('nom-client').value.trim();
      var desc    = document.getElementById('nom-desc').value.trim();
      var amount  = parseFloat(document.getElementById('nom-amount').value) || 0;
      var status  = document.getElementById('nom-status').value;
      var dl      = document.getElementById('nom-deadline').value;
      var tech    = document.getElementById('nom-technique').value;
      if (!client) { document.getElementById('nom-client').focus(); return; }
      var order = {
        id:         'O' + Date.now(),
        clientName: client, client: client,
        description: desc,
        total:      amount, totalPrice: amount,
        status:     status, stage: status, stato: status,
        technique:  tech,
        deadline:   dl,
        date:       new Date().toISOString(),
        createdAt:  new Date().toISOString(),
      };
      var orders = STORE.arr('ingly_orders');
      orders.push(order);
      STORE.set('ingly_orders', orders);
      overlay.classList.remove('open');
      /* Reset */
      ['nom-client','nom-desc','nom-amount','nom-deadline'].forEach(function(id){
        var el=document.getElementById(id); if(el) el.value='';
      });
      toastr('✅ Ordine creato per '+client, 'success', 2500);
      /* Re-render kanban */
      var kb = document.getElementById('prox-kanban');
      if (kb) {
        var sec = document.getElementById('view-gestione_ordini');
        if (sec) { sec._kanbanBuilt=false; buildKanban(); }
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     V1 + V2 — CRM SEGMENTAZIONE
  ═══════════════════════════════════════════════════════════════════ */
  function buildCRMEnhancement() {
    var section = document.getElementById('view-clients');
    if (!section || section._crmEnhanced) return;

    function _try(n) {
      n = n||0; if(n>40) return;
      if(!section.children.length){ setTimeout(function(){ _try(n+1); }, 400); return; }
      if(section._crmEnhanced) return;
      section._crmEnhanced = true;
      _doCRM(section);
    }
    _try();
  }

  function _doCRM(section) {
    if (document.getElementById('prox-crm-bar')) return;

    /* ── Segment client ── */
    function segmentClient(c, orders) {
      var cOrds = orders.filter(function(o){
        return (orderClient(o)||'').toLowerCase() === clientName(c).toLowerCase() ||
               (c.id && (o.client===c.id || o.clientId===c.id));
      });
      var ltv = cOrds.reduce(function(s,o){ return s+orderAmt(o); }, 0);
      var lastDate = cOrds.length ? new Date(orderDate(cOrds.sort(function(a,b){
        return new Date(orderDate(b))-new Date(orderDate(a));
      })[0]) || Date.now()) : null;
      var daysSince = lastDate ? Math.floor((Date.now()-lastDate)/(1000*86400)) : 9999;
      var seg = ltv > 2000 ? 'A' : ltv > 500 ? 'B' : 'C';
      var dormant = daysSince > 60;
      return { ltv, seg, daysSince, dormant, orders: cOrds.length };
    }

    /* ── Build bar ── */
    var bar = document.createElement('div');
    bar.id = 'prox-crm-bar';
    bar.className = 'v2-card';
    bar.innerHTML =
      '<div class="v2-title"><span>👥 CRM Clienti — Intelligence</span>'+
      '<button class="v2-btn v2-btn-primary v2-btn-sm" id="crm-new-btn">＋ Nuovo Cliente</button>'+
      '</div>'+
      '<div class="v2-kpis" id="crm-kpis"></div>'+
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">'+
      '<div class="v2-search-wrap" style="flex:1;min-width:200px"><input class="v2-search" id="crm-search" placeholder="Cerca cliente per nome, email, telefono..."></div>'+
      '<div class="crm-seg-strip" id="crm-seg-filters">'+
      '<button class="crm-seg-badge active" data-seg="*" style="background:rgba(255,255,255,.06);color:#e5e5e5;border-color:rgba(255,255,255,.15)">Tutti</button>'+
      '<button class="crm-seg-badge crm-seg-A" data-seg="A">⭐ VIP (A)</button>'+
      '<button class="crm-seg-badge crm-seg-B" data-seg="B">👍 Attivi (B)</button>'+
      '<button class="crm-seg-badge crm-seg-C" data-seg="C">🆕 Nuovi (C)</button>'+
      '<button class="crm-seg-badge crm-seg-dorm" data-seg="dormant">😴 Dormienti</button>'+
      '</div>'+
      '</div>'+
      '<div class="crm-client-list" id="crm-client-list"></div>';

    section.insertBefore(bar, section.firstChild);

    /* ── Render KPIs ── */
    function renderCRMKPIs() {
      var clients = readClients();
      var orders  = readOrders();
      var segs    = clients.map(function(c){ return segmentClient(c,orders); });
      var totalLTV = segs.reduce(function(s,x){ return s+x.ltv; }, 0);
      var dormant  = segs.filter(function(x){ return x.dormant; }).length;
      var el = document.getElementById('crm-kpis');
      if (!el) return;
      el.innerHTML = [
        { val: clients.length,                              lbl:'Clienti totali', color:'#e5e5e5' },
        { val: segs.filter(function(x){return x.seg==='A';}).length, lbl:'VIP (A) > 2K€', color:'#22c55e' },
        { val: segs.filter(function(x){return x.seg==='B';}).length, lbl:'Attivi (B)',     color:'#fbbf24' },
        { val: dormant,                                     lbl:'Dormienti >60gg', color:'#ef4444' },
        { val: fmt(totalLTV,0),                             lbl:'LTV totale',      color:'#a78bfa' },
      ].map(function(k){
        return '<div class="v2-kpi"><div class="v2-kpi-val" style="color:'+k.color+'">'+k.val+'</div><div class="v2-kpi-lbl">'+k.lbl+'</div></div>';
      }).join('');
    }
    renderCRMKPIs();

    /* ── Render client list ── */
    var activeSeg = '*', searchQ = '';

    function renderCRMList() {
      var clients = readClients();
      var orders  = readOrders();
      var q = searchQ.toLowerCase().trim();

      var enriched = clients.map(function(c){
        return Object.assign({}, c, { _seg: segmentClient(c, orders) });
      });

      if (q) enriched = enriched.filter(function(c){
        var nm = clientName(c).toLowerCase();
        return nm.includes(q) || (c.email||'').toLowerCase().includes(q) || (c.phone||c.telefono||'').includes(q);
      });

      if (activeSeg === 'dormant') enriched = enriched.filter(function(c){ return c._seg.dormant; });
      else if (activeSeg !== '*')  enriched = enriched.filter(function(c){ return c._seg.seg === activeSeg; });

      /* Sort: A first, then by LTV desc */
      enriched.sort(function(a,b){ return b._seg.ltv - a._seg.ltv; });

      var list = document.getElementById('crm-client-list');
      if (!list) return;

      if (!enriched.length) {
        list.innerHTML = '<div style="text-align:center;padding:24px;color:#3f3f46;font-size:12px">'+
          (clients.length===0 ? '⚠️ Nessun cliente — aggiungi il primo cliente' : '🔍 Nessun risultato')+
          '</div>';
        return;
      }

      var SEG_COLORS = { A:'#22c55e', B:'#fbbf24', C:'#94a3b8' };
      var SEG_BG     = { A:'rgba(34,197,94,.12)', B:'rgba(251,191,36,.12)', C:'rgba(100,116,139,.1)' };

      list.innerHTML = enriched.slice(0,50).map(function(c){
        var nm   = clientName(c);
        var init = nm.split(' ').map(function(w){ return w[0]||''; }).join('').slice(0,2).toUpperCase();
        var seg  = c._seg;
        var dormStr = seg.daysSince < 9999
          ? (seg.daysSince === 0 ? 'Oggi' : seg.daysSince + 'gg fa')
          : 'Nessun ordine';
        var dormAlert = seg.dormant;
        return '<div class="crm-client-item" data-id="'+esc(c.id||nm)+'">'+
          '<div class="crm-init" style="background:'+SEG_BG[seg.seg]+';color:'+SEG_COLORS[seg.seg]+'">'+init+'</div>'+
          '<div><div class="crm-name">'+esc(nm)+'</div>'+
          '<div class="crm-meta">'+(c.email||c.phone||c.telefono||'—')+'&nbsp;·&nbsp;'+seg.orders+' ordini</div></div>'+
          '<div class="crm-ltv">'+fmt(seg.ltv,0)+'</div>'+
          '<div><span class="crm-seg" style="background:'+SEG_BG[seg.seg]+';color:'+SEG_COLORS[seg.seg]+'">'+seg.seg+'</span></div>'+
          '<div class="crm-dormancy'+(dormAlert?' alert':'')+'">'+dormStr+'</div>'+
          '</div>';
      }).join('');

      /* Alert dormienti banner */
      var dormCount = enriched.filter(function(c){ return c._seg.dormant; }).length;
      var existing = document.getElementById('crm-dormant-alert');
      if (existing) existing.remove();
      if (dormCount > 0 && activeSeg !== 'dormant') {
        var alert = document.createElement('div');
        alert.id = 'crm-dormant-alert';
        alert.className = 'adv-alert adv-alert-warn';
        alert.style.cssText = 'margin-bottom:10px;cursor:pointer;';
        alert.innerHTML = '😴 <strong>'+dormCount+' clienti dormienti</strong> (inattivi da >60 giorni) — Clicca per vederli';
        alert.addEventListener('click', function(){
          activeSeg = 'dormant';
          bar.querySelectorAll('[data-seg]').forEach(function(b){ b.classList.toggle('active', b.dataset.seg==='dormant'); });
          renderCRMList();
        });
        list.insertBefore(alert, list.firstChild);
      }
    }
    renderCRMList();

    /* ── Filters ── */
    document.getElementById('crm-seg-filters').addEventListener('click', function(e){
      var btn = e.target.closest('[data-seg]');
      if (!btn) return;
      activeSeg = btn.dataset.seg;
      bar.querySelectorAll('[data-seg]').forEach(function(b){ b.classList.toggle('active', b===btn); });
      renderCRMList();
    });
    document.getElementById('crm-search').addEventListener('input', function(){
      searchQ = this.value;
      renderCRMList();
    });

    /* ── New Client Modal ── */
    document.getElementById('crm-new-btn').addEventListener('click', function(){ openNewClientModal(); });

    function openNewClientModal() {
      var existing = document.getElementById('prox-new-client-modal-ov');
      if (existing) { existing.classList.add('open'); return; }

      var ov = document.createElement('div');
      ov.id = 'prox-new-client-modal-ov';
      ov.style.cssText = 'position:fixed;inset:0;z-index:18000;background:rgba(0,0,0,.8);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;';
      ov.classList.add('open');
      ov.style.display = 'flex';

      var m = document.createElement('div');
      m.style.cssText = 'background:#0f0f11;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:24px;width:100%;max-width:440px;box-shadow:0 24px 60px rgba(0,0,0,.9);';
      m.innerHTML =
        '<h3 style="margin:0 0 16px;font-size:16px;color:#e5e5e5">➕ Nuovo Cliente</h3>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
        ['Nome / Ragione Sociale|nom-nc-name|text|Inserisci nome...',
         'Email|nom-nc-email|email|email@esempio.it',
         'Telefono|nom-nc-phone|tel|+39 000 0000000',
         'Città|nom-nc-city|text|es. Milano',
         'P.IVA|nom-nc-piva|text|IT00000000000',
         'Note|nom-nc-notes|text|Note interne...'].map(function(f,i){
           var parts=f.split('|');
           return '<div'+(i===0?' style="grid-column:1/-1"':'')+'><label style="font-size:10px;color:#71717a;display:block;margin-bottom:4px">'+parts[0]+'</label>'+
             '<input type="'+parts[2]+'" id="'+parts[1]+'" class="v2-search" placeholder="'+parts[3]+'" style="padding-left:12px"></div>';
         }).join('')+
        '</div>'+
        '<div style="display:flex;gap:8px;margin-top:16px">'+
        '<button class="v2-btn v2-btn-primary" id="nc-save">💾 Salva Cliente</button>'+
        '<button class="v2-btn v2-btn-secondary" id="nc-cancel">Annulla</button>'+
        '</div>';

      ov.appendChild(m);
      document.body.appendChild(ov);

      ov.addEventListener('click', function(e){ if(e.target===ov) ov.classList.remove('open'); ov.style.display='none'; });
      document.getElementById('nc-cancel').addEventListener('click', function(){ ov.style.display='none'; });
      document.getElementById('nc-save').addEventListener('click', function(){
        var name = document.getElementById('nom-nc-name').value.trim();
        if (!name) { document.getElementById('nom-nc-name').focus(); return; }
        var client = {
          id: 'C'+Date.now(), name: name,
          email: document.getElementById('nom-nc-email').value.trim(),
          phone: document.getElementById('nom-nc-phone').value.trim(),
          city:  document.getElementById('nom-nc-city').value.trim(),
          piva:  document.getElementById('nom-nc-piva').value.trim(),
          notes: document.getElementById('nom-nc-notes').value.trim(),
          createdAt: new Date().toISOString(),
        };
        var clients = STORE.arr('ingly_clients');
        clients.push(client);
        STORE.set('ingly_clients', clients);
        ov.style.display = 'none';
        toastr('✅ Cliente "'+name+'" aggiunto!', 'success', 2500);
        section._crmEnhanced = false;
        renderCRMKPIs();
        renderCRMList();
        /* Notify other sections */
        window.dispatchEvent(new StorageEvent('storage', { key:'ingly_clients' }));
      });
    }

    /* Storage sync */
    window.addEventListener('storage', function(e){
      if (['ingly_clients','ingly_crm_v1','ingly_orders','ingly_quotes'].includes(e.key)){
        renderCRMKPIs(); renderCRMList();
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     V1 — BACKUP AUTOMATICO
  ═══════════════════════════════════════════════════════════════════ */
  var BACKUP_KEY = 'prox_backups_v1';
  var AUTO_BACKUP_INTERVAL = 30 * 60 * 1000; // 30 min

  function performBackup(type) {
    var data = {};
    var keys = ['ingly_clients','ingly_crm_v1','ingly_orders','ingly_quotes',
                'lb2b_quotes_v1','ingly_products','ingly_projects','ingly_fixed_costs',
                'prox_catalog','ingly_listino'];
    keys.forEach(function(k){
      var v = localStorage.getItem(k);
      if (v) data[k] = v;
    });
    var entry = {
      id: uid(), ts: new Date().toISOString(), type: type || 'auto',
      size: JSON.stringify(data).length, data: data
    };
    var bks = STORE.get(BACKUP_KEY) || [];
    bks.unshift(entry);
    if (bks.length > 20) bks = bks.slice(0, 20); // keep last 20
    STORE.set(BACKUP_KEY, bks);
    return entry;
  }

  function startAutoBackup() {
    /* Initial backup on load */
    setTimeout(function(){ performBackup('auto'); }, 5000);
    /* Periodic backup */
    setInterval(function(){ performBackup('auto'); }, AUTO_BACKUP_INTERVAL);
  }

  function buildBackupEnhancement() {
    var section = document.getElementById('view-backup');
    if (!section || section._backupEnhanced) return;

    function _try(n) {
      n=n||0; if(n>30) return;
      if(!section.children.length){ setTimeout(function(){ _try(n+1); }, 400); return; }
      if(section._backupEnhanced) return;
      section._backupEnhanced = true;
      _doBackup(section);
    }
    _try();
  }

  function _doBackup(section) {
    if (document.getElementById('prox-backup-bar')) return;

    var bar = document.createElement('div');
    bar.id = 'prox-backup-bar';
    bar.className = 'v2-card';
    bar.innerHTML =
      '<div class="v2-title"><span>☁️ Backup & Ripristino Dati</span></div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'+
      '<button class="v2-btn v2-btn-primary" id="bk-now-btn">💾 Backup Manuale Ora</button>'+
      '<button class="v2-btn v2-btn-secondary" id="bk-export-btn">📥 Esporta JSON</button>'+
      '<button class="v2-btn v2-btn-secondary" id="bk-import-btn">📤 Importa JSON</button>'+
      '<input type="file" id="bk-import-file" accept=".json" style="display:none">'+
      '</div>'+
      '<div style="font-size:10px;color:#52525b;margin-bottom:12px">Auto-backup ogni 30 minuti · Ultimi 20 backup conservati</div>'+
      '<div id="bk-slots"></div>';

    section.insertBefore(bar, section.firstChild);

    function renderBackups() {
      var bks = STORE.get(BACKUP_KEY) || [];
      var el = document.getElementById('bk-slots');
      if (!el) return;
      if (!bks.length) { el.innerHTML='<div style="color:#3f3f46;font-size:11px;padding:8px 0">Nessun backup ancora</div>'; return; }
      el.innerHTML = bks.slice(0,10).map(function(bk){
        var kb = (bk.size/1024).toFixed(1);
        var dt = new Date(bk.ts);
        var dtStr = dt.toLocaleDateString('it-IT')+ ' '+dt.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
        var keyCount = Object.keys(bk.data||{}).length;
        return '<div class="bk-slot">'+
          '<span class="bk-slot-badge '+(bk.type==='manual'?'bk-manual':'bk-auto')+'">'+
          (bk.type==='manual'?'Manuale':'Auto')+'</span>'+
          '<span class="bk-slot-ts">'+dtStr+' &nbsp;·&nbsp; '+keyCount+' sezioni</span>'+
          '<span class="bk-slot-size">'+kb+' KB</span>'+
          '<button class="v2-btn v2-btn-secondary v2-btn-sm" data-restore="'+bk.id+'">↩ Ripristina</button>'+
          '<button class="v2-btn v2-btn-secondary v2-btn-sm" data-dl="'+bk.id+'" style="margin-left:4px">⬇</button>'+
          '</div>';
      }).join('');
    }
    renderBackups();

    document.getElementById('bk-now-btn').addEventListener('click', function(){
      var entry = performBackup('manual');
      renderBackups();
      toastr('💾 Backup salvato — '+Object.keys(entry.data).length+' sezioni', 'success', 2500);
    });

    document.getElementById('bk-export-btn').addEventListener('click', function(){
      var entry = performBackup('manual');
      var json = JSON.stringify(entry.data, null, 2);
      var blob = new Blob([json], {type:'application/json'});
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ingly-backup-'+new Date().toISOString().slice(0,10)+'.json';
      a.click();
      renderBackups();
      toastr('📥 Backup esportato', 'success', 2000);
    });

    document.getElementById('bk-import-btn').addEventListener('click', function(){
      document.getElementById('bk-import-file').click();
    });

    document.getElementById('bk-import-file').addEventListener('change', function(e){
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev){
        try {
          var data = JSON.parse(ev.target.result);
          if (confirm('Ripristinare i dati dal file '+file.name+'? I dati attuali saranno sovrascritti.')) {
            Object.keys(data).forEach(function(k){ localStorage.setItem(k, data[k]); });
            toastr('✅ Dati ripristinati con successo', 'success', 3000);
            setTimeout(function(){ location.reload(); }, 1500);
          }
        } catch(err) { toastr('❌ File non valido: '+err.message, 'error', 4000); }
      };
      reader.readAsText(file);
      this.value = '';
    });

    document.getElementById('bk-slots').addEventListener('click', function(e){
      var restoreBtn = e.target.closest('[data-restore]');
      var dlBtn = e.target.closest('[data-dl]');
      var bks = STORE.get(BACKUP_KEY) || [];

      if (restoreBtn) {
        var bk = bks.find(function(b){ return b.id===restoreBtn.dataset.restore; });
        if (!bk) return;
        var dt = new Date(bk.ts).toLocaleString('it-IT');
        if (!confirm('Ripristinare backup del '+dt+'?\nI dati attuali saranno sovrascritti.')) return;
        Object.keys(bk.data).forEach(function(k){ localStorage.setItem(k, bk.data[k]); });
        toastr('✅ Backup ripristinato', 'success', 3000);
        setTimeout(function(){ location.reload(); }, 1500);
      }

      if (dlBtn) {
        var bk2 = bks.find(function(b){ return b.id===dlBtn.dataset.dl; });
        if (!bk2) return;
        var json = JSON.stringify(bk2.data, null, 2);
        var blob = new Blob([json],{type:'application/json'});
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'ingly-backup-'+bk2.ts.slice(0,16).replace('T','-')+'.json';
        a.click();
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     V2 — AI BUSINESS ADVISOR (Dashboard widget)
  ═══════════════════════════════════════════════════════════════════ */
  function buildAdvisorWidget() {
    var section = document.getElementById('view-dashboard');
    if (!section || section._advisorBuilt) return;

    function _try(n){
      n=n||0; if(n>30) return;
      if(!section.children.length){ setTimeout(function(){ _try(n+1); }, 400); return; }
      if(section._advisorBuilt) return;
      section._advisorBuilt = true;
      _doAdvisor(section);
    }
    _try();
  }

  function _doAdvisor(section) {
    if (document.getElementById('prox-advisor-widget')) return;

    var widget = document.createElement('div');
    widget.id = 'prox-advisor-widget';
    widget.innerHTML =
      '<div class="adv-header">'+
      '<div class="adv-icon">🧠</div>'+
      '<div><div class="adv-title">AI Business Advisor</div>'+
      '<div class="adv-subtitle">Analisi in tempo reale · Aggiornato: '+new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})+'</div></div>'+
      '<button class="v2-btn v2-btn-secondary v2-btn-sm" id="adv-refresh" style="margin-left:auto">↺ Aggiorna</button>'+
      '</div>'+
      '<div class="adv-kpis" id="adv-kpis"></div>'+
      '<div class="adv-alerts" id="adv-alerts"></div>'+
      '<div id="adv-cashflow-section" style="margin-bottom:12px"></div>'+
      '<div class="adv-weekly-brief" id="adv-brief"></div>';

    section.insertBefore(widget, section.firstChild);

    function renderAdvisor() {
      var orders  = readOrders();
      var clients = readClients();
      var now     = new Date();
      var thisMonth = orders.filter(function(o){
        var d=new Date(orderDate(o)||0);
        return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
      });
      var lastMonth = orders.filter(function(o){
        var d=new Date(orderDate(o)||0);
        var lm=new Date(now.getFullYear(),now.getMonth()-1,1);
        return d.getMonth()===lm.getMonth()&&d.getFullYear()===lm.getFullYear();
      });
      var rev      = thisMonth.reduce(function(s,o){ return s+orderAmt(o); },0);
      var revLast  = lastMonth.reduce(function(s,o){ return s+orderAmt(o); },0);
      var revDelta = revLast>0 ? Math.round((rev-revLast)/revLast*100) : 0;
      var inProd   = orders.filter(function(o){ return orderStatus(o)==='produzione'; });
      var pagati   = orders.filter(function(o){ return orderStatus(o)==='pagato'; });
      var incass   = pagati.filter(function(o){
        var d=new Date(orderDate(o)||0);
        return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
      }).reduce(function(s,o){ return s+orderAmt(o); },0);

      /* Dormant clients */
      var dormant = clients.filter(function(c){
        var cOrds = orders.filter(function(o){ return (orderClient(o)||'').toLowerCase()===clientName(c).toLowerCase(); });
        if (!cOrds.length) return true;
        var last = cOrds.sort(function(a,b){ return new Date(orderDate(b))-new Date(orderDate(a)); })[0];
        return (Date.now()-new Date(orderDate(last)))/(1000*86400) > 60;
      });

      /* KPIs */
      var kpiEl = document.getElementById('adv-kpis');
      if (kpiEl) kpiEl.innerHTML = [
        { val: fmt(rev,0),         lbl:'Fatturato mese',   color:'#22c55e' },
        { val: fmt(incass,0),      lbl:'Incassato mese',   color:'#fbbf24' },
        { val: thisMonth.length,   lbl:'Ordini mese',      color:'#60a5fa' },
        { val: inProd.length,      lbl:'In lavorazione',   color:'#f59e0b' },
        { val: clients.length,     lbl:'Clienti totali',   color:'#a78bfa' },
        { val: dormant.length,     lbl:'Dormienti >60gg',  color:'#ef4444' },
      ].map(function(k){
        return '<div class="adv-kpi"><div class="adv-kpi-val" style="color:'+k.color+'">'+k.val+'</div>'+
          '<div class="adv-kpi-lbl">'+k.lbl+'</div></div>';
      }).join('');

      /* Alerts */
      var alerts = [];
      if (dormant.length > 0) alerts.push({ type:'warn', msg:'😴 <strong>'+dormant.length+' clienti dormienti</strong> — non ordinano da oltre 60 giorni. Considera una campagna di ri-attivazione.' });
      if (inProd.length > 5)  alerts.push({ type:'warn', msg:'⚙️ <strong>'+inProd.length+' ordini in lavorazione</strong> — verifica che non ci siano ritardi nella produzione.' });
      if (revDelta > 0)       alerts.push({ type:'ok',   msg:'📈 <strong>Fatturato +'+revDelta+'%</strong> rispetto al mese scorso. Ottimo trend!' });
      if (revDelta < -10)     alerts.push({ type:'warn', msg:'📉 <strong>Fatturato -'+Math.abs(revDelta)+'%</strong> rispetto al mese scorso. Analizza le cause.' });
      if (!clients.length)    alerts.push({ type:'info', msg:'👥 <strong>Aggiungi i tuoi clienti</strong> alla sezione CRM per ottenere analisi e previsioni accurate.' });
      if (!orders.length)     alerts.push({ type:'info', msg:'📋 <strong>Nessun ordine registrato</strong> — inizia a creare ordini per attivare l\'analisi business.' });

      var alertEl = document.getElementById('adv-alerts');
      if (alertEl) alertEl.innerHTML = alerts.map(function(a){
        return '<div class="adv-alert adv-alert-'+a.type+'"><span>'+a.msg+'</span></div>';
      }).join('');

      /* Cashflow 6-month bar chart */
      var months = [];
      for (var i=5; i>=0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        var mOrds = orders.filter(function(o){
          var od=new Date(orderDate(o)||0);
          return od.getMonth()===d.getMonth()&&od.getFullYear()===d.getFullYear();
        });
        var mRev = mOrds.reduce(function(s,o){ return s+orderAmt(o); },0);
        months.push({ label: d.toLocaleString('it-IT',{month:'short'}), rev: mRev });
      }
      var maxRev = Math.max.apply(null, months.map(function(m){ return m.rev; })) || 1;
      var cfEl = document.getElementById('adv-cashflow-section');
      if (cfEl) {
        cfEl.innerHTML =
          '<div style="font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px;font-weight:700">📊 Fatturato ultimi 6 mesi</div>'+
          '<div class="cf-bar-wrap">'+
          months.map(function(m,i){
            var pct = Math.max(4, Math.round(m.rev/maxRev*72));
            var isCurrent = (i===5);
            var clr = isCurrent ? '#fbbf24' : '#374151';
            return '<div class="cf-bar-col">'+
              '<div style="font-size:9px;color:#52525b;margin-bottom:2px">'+
              (m.rev?fmt(m.rev,0):'')+'</div>'+
              '<div class="cf-bar" style="height:'+pct+'px;background:'+clr+'"></div>'+
              '<div class="cf-bar-lbl">'+m.label+'</div>'+
              '</div>';
          }).join('')+
          '</div>';
      }

      /* Weekly brief */
      var topClient = '';
      var clientAmt = {};
      orders.forEach(function(o){
        var cn = orderClient(o)||'';
        clientAmt[cn] = (clientAmt[cn]||0) + orderAmt(o);
      });
      var sorted = Object.keys(clientAmt).sort(function(a,b){ return clientAmt[b]-clientAmt[a]; });
      if (sorted.length) topClient = sorted[0];

      var briefEl = document.getElementById('adv-brief');
      if (briefEl) {
        var today = now.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'});
        briefEl.innerHTML =
          '<div style="font-size:9px;color:#52525b;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px;font-weight:700">📋 Brief del giorno — '+today+'</div>'+
          '<div class="adv-brief-line">📦 <strong>'+orders.length+'</strong> ordini totali registrati ('+thisMonth.length+' questo mese)</div>'+
          '<div class="adv-brief-line">💰 Fatturato mese: <strong>'+fmt(rev,0)+'</strong>'+(revDelta?(' · '+(revDelta>0?'▲+':'▼')+revDelta+'% vs mese scorso'):'')+'</div>'+
          (topClient?'<div class="adv-brief-line">⭐ Cliente top: <strong>'+esc(topClient)+'</strong> ('+fmt(clientAmt[topClient],0)+')</div>':'')+
          (inProd.length?'<div class="adv-brief-line">⚙️ <strong>'+inProd.length+'</strong> ordini in produzione oggi</div>':'')+
          (dormant.length?'<div class="adv-brief-line" style="color:#f59e0b">😴 <strong>'+dormant.length+'</strong> clienti non ordinano da >60 giorni</div>':'')+
          '<div class="adv-brief-line" style="margin-top:6px;color:#52525b">💡 Suggerimento: '+(
            dormant.length>2 ? 'Contatta i clienti dormienti con un\'offerta personalizzata.' :
            inProd.length>5  ? 'Coda di produzione alta — valuta di ottimizzare la schedulazione.' :
            rev < 500        ? 'Fatturato basso questo mese — aumenta le azioni commerciali.' :
                               'Ottima operatività! Concentrati sull\'acquisizione nuovi clienti.'
          )+'</div>';
      }
    }

    renderAdvisor();
    document.getElementById('adv-refresh').addEventListener('click', renderAdvisor);

    window.addEventListener('storage', function(e){
      if (['ingly_orders','ingly_quotes','ingly_clients','ingly_crm_v1'].includes(e.key)) renderAdvisor();
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     V2 — FINANCE SUITE (P&L mensile)
  ═══════════════════════════════════════════════════════════════════ */
  function buildFinanceSuite() {
    var section = document.getElementById('view-fiscal');
    if (!section || section._financeSuiteBuilt) return;

    function _try(n){
      n=n||0; if(n>30) return;
      if(!section.children.length){ setTimeout(function(){ _try(n+1); }, 500); return; }
      if(section._financeSuiteBuilt) return;
      section._financeSuiteBuilt = true;
      _doFinance(section);
    }
    _try();
  }

  function _doFinance(section) {
    if (document.getElementById('prox-finance-pl')) return;

    var card = document.createElement('div');
    card.id = 'prox-finance-pl';
    card.className = 'v2-card';
    card.innerHTML =
      '<div class="v2-title"><span>💰 Finance Suite — P&L & Cashflow</span>'+
      '<button class="v2-btn v2-btn-secondary v2-btn-sm" id="fin-export-btn">📥 Esporta CSV</button></div>'+
      '<div class="pl-month-grid" id="pl-months"></div>'+
      '<div id="pl-detail" style="margin-top:6px"></div>';

    /* Insert before existing fiscal content */
    var existing = document.getElementById('prox-fiscal-bar');
    if (existing) section.insertBefore(card, existing);
    else section.insertBefore(card, section.firstChild);

    var selectedMonth = new Date().getMonth();
    var selectedYear  = new Date().getFullYear();

    function getMonthOrders(m, y) {
      return readOrders().filter(function(o){
        var d = new Date(orderDate(o)||0);
        return d.getMonth()===m && d.getFullYear()===y;
      });
    }

    function renderMonths() {
      var now = new Date();
      var grid = document.getElementById('pl-months');
      if (!grid) return;
      var months = [];
      for (var i=11; i>=0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        months.push({ m: d.getMonth(), y: d.getFullYear(), label: d.toLocaleString('it-IT',{month:'short', year:'2-digit'}) });
      }
      grid.innerHTML = months.map(function(mo){
        var ords = getMonthOrders(mo.m, mo.y);
        var rev  = ords.reduce(function(s,o){ return s+orderAmt(o); },0);
        var active = (mo.m===selectedMonth && mo.y===selectedYear);
        return '<div class="pl-month-card'+(active?' active':'')+'" data-m="'+mo.m+'" data-y="'+mo.y+'">'+
          '<div class="pl-month-name">'+mo.label+'</div>'+
          '<div class="pl-month-rev">'+(rev?fmt(rev,0):'—')+'</div>'+
          '<div class="pl-month-exp">'+ords.length+' ord.</div>'+
          '</div>';
      }).join('');
    }
    renderMonths();

    function renderDetail(m, y) {
      var el = document.getElementById('pl-detail');
      if (!el) return;
      var ords = getMonthOrders(m, y);
      var fixed = STORE.get('ingly_fixed_costs') || {};
      var fixedTotal = Object.values(fixed).reduce(function(s,v){ return s+(+v||0); }, 0);

      /* Group by technique/source */
      var byTech = {};
      ords.forEach(function(o){
        var tech = o.technique || o.machine || 'altro';
        byTech[tech] = (byTech[tech]||0) + orderAmt(o);
      });

      var totalRev  = ords.reduce(function(s,o){ return s+orderAmt(o); },0);
      var totalCost = fixedTotal;
      var gross = totalRev - totalCost;
      var margin = totalRev>0 ? Math.round(gross/totalRev*100) : 0;

      var monthLabel = new Date(y,m,1).toLocaleString('it-IT',{month:'long',year:'numeric'});

      el.innerHTML =
        '<div style="font-size:12px;font-weight:700;color:#e5e5e5;margin-bottom:10px;text-transform:capitalize">'+monthLabel+'</div>'+
        '<table class="pl-table">'+
        '<thead><tr><th>Voce</th><th>Importo</th><th>%</th></tr></thead>'+
        '<tbody>'+
        /* Revenue lines */
        Object.keys(byTech).map(function(t){
          var v = byTech[t];
          var pct = totalRev>0 ? Math.round(v/totalRev*100) : 0;
          return '<tr class="pl-row-income"><td>📥 Ricavi '+t+'</td><td>'+fmt(v,0)+'</td><td>'+pct+'%</td></tr>';
        }).join('')+
        '<tr class="pl-row-income" style="font-weight:700"><td><strong>TOTALE RICAVI</strong></td><td><strong>'+fmt(totalRev,0)+'</strong></td><td>100%</td></tr>'+
        /* Cost lines */
        (fixedTotal>0?'<tr class="pl-row-expense"><td>📤 Costi fissi</td><td>'+fmt(fixedTotal,0)+'</td><td>'+(totalRev>0?Math.round(fixedTotal/totalRev*100):0)+'%</td></tr>':'')+''+
        '<tr class="pl-row-net"><td><strong>MARGINE LORDO</strong></td><td><strong>'+fmt(gross,0)+'</strong></td><td><strong>'+(margin>0?'+':'')+margin+'%</strong></td></tr>'+
        '</tbody></table>'+
        (ords.length===0?'<div style="text-align:center;color:#3f3f46;padding:16px;font-size:11px">Nessun ordine in questo mese</div>':'');
    }
    renderDetail(selectedMonth, selectedYear);

    document.getElementById('pl-months').addEventListener('click', function(e){
      var card = e.target.closest('.pl-month-card');
      if (!card) return;
      selectedMonth = +card.dataset.m;
      selectedYear  = +card.dataset.y;
      document.querySelectorAll('.pl-month-card').forEach(function(c){ c.classList.remove('active'); });
      card.classList.add('active');
      renderDetail(selectedMonth, selectedYear);
    });

    document.getElementById('fin-export-btn').addEventListener('click', function(){
      var ords = readOrders();
      var csv = 'ID,Cliente,Data,Importo,Stato,Tecnica\n';
      ords.forEach(function(o){
        csv += [o.id||'', orderClient(o), dateIT(orderDate(o)), orderAmt(o).toFixed(2),
                orderStatus(o), o.technique||''].map(function(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }).join(',')+'\n';
      });
      var blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
      var a = document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download='ingly-ordini-'+new Date().toISOString().slice(0,10)+'.csv';
      a.click();
      toastr('📥 CSV esportato ('+ords.length+' ordini)', 'success', 2000);
    });

    window.addEventListener('storage', function(e){
      if (['ingly_orders','ingly_quotes','ingly_fixed_costs'].includes(e.key)){
        renderMonths(); renderDetail(selectedMonth, selectedYear);
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     BOOT
  ═══════════════════════════════════════════════════════════════════ */
  var _bootTries = 0;
  function boot() {
    _bootTries++;
    if (_bootTries > 40) return;
    if (!document.getElementById('content-inner') || typeof App === 'undefined') {
      setTimeout(boot, 500); return;
    }

    injectV2CSS();
    startAutoBackup();

    buildKanban();
    buildCRMEnhancement();
    buildAdvisorWidget();
    buildFinanceSuite();
    buildBackupEnhancement();

    /* Nav hooks */
    if (!window._proxV2NavHooked && App.navigate) {
      var _origNav = App.navigate;
      App.navigate = function (section) {
        var r = _origNav.apply(this, arguments);
        setTimeout(function () {
          if (section === 'gestione_ordini') buildKanban();
          if (section === 'clients')         buildCRMEnhancement();
          if (section === 'dashboard')       buildAdvisorWidget();
          if (section === 'fiscal')          buildFinanceSuite();
          if (section === 'backup')          buildBackupEnhancement();
        }, 300);
        return r;
      };
      window._proxV2NavHooked = true;
    }

    console.log('[prox-v2] V1+V2 layer loaded ✅');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 2000); });
  } else {
    setTimeout(boot, 2000);
  }

})();

