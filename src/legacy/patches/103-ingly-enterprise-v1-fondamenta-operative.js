
/* ═══════════════════════════════════════════════════════════════════
   INGLY ENTERPRISE V1 — Fondamenta Operative
   Dashboard · Ordini · CRM · Fiscal · Sidebar CSS
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window._inglyEV1) return;
  window._inglyEV1 = true;

  /* ── Storage ── */
  var ST = {
    get: function (k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (_) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  };

  /* ── Utils ── */
  function $id(id) { return document.getElementById(id); }
  function ce(tag, cls, html) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  }
  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(n, d) { d = d == null ? 0 : d; return '€' + (+n || 0).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function dtIT(d) { try { var x = new Date(d); return isNaN(x) ? '—' : x.toLocaleDateString('it-IT'); } catch (_) { return '—'; } }
  function daysSince(d) { return d ? Math.round((Date.now() - new Date(d).getTime()) / 86400000) : 999; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ── Data helpers ── */
  function getOrders() { return ST.get('ingly_orders', []); }
  function saveOrders(v) { ST.set('ingly_orders', v); }
  function getClients() {
    return [].concat(ST.get('ingly_clients', []), ST.get('ingly_crm_v1', []))
      .filter(function (c, i, a) { return c && c.id && a.findIndex(function (x) { return x && x.id === c.id; }) === i; });
  }
  function getSales() { return ST.get('ingly_sales', []); }
  function saveSales(v) { ST.set('ingly_sales', v); }
  function oAmt(o) { return +(o.total || o.totalPrice || o.amount || o.totale || 0); }
  function oStatus(o) {
    var s = (o.status || o.stato || '').toLowerCase();
    if (s.includes('produz') || s.includes('lavoraz') || s.includes('in corso')) return 'produzione';
    if (s.includes('consegn') || s.includes('spediz') || s.includes('completat')) return 'completato';
    if (s.includes('pagat') || s.includes('paid')) return 'pagato';
    if (s.includes('annull') || s.includes('cancel')) return 'annullato';
    if (s.includes('attesa') || s.includes('pending') || s.includes('nuovo') || s === '') return 'attesa';
    return 'attesa';
  }
  function oClient(o) { return o.client || o.clientName || o.cliente || o.name || 'Cliente'; }
  function oDate(o) { return o.date || o.createdAt || o.data || ''; }
  function oDeadline(o) { return o.deadline || o.dataConsegna || o.dueDate || ''; }

  /* ─────────────────────────────────────────────────
     CSS — SIDEBAR POLISH + ENTERPRISE COMPONENTS
  ───────────────────────────────────────────────── */
  function injectCSS() {
    if ($id('ev1-css')) return;
    var s = document.createElement('style');
    s.id = 'ev1-css';
    s.textContent = `

/* ═══ SIDEBAR POLISH ═══ */
#sidebar { background: #0b0b0d !important; border-right: 1px solid rgba(255,255,255,.05) !important; }
#sidebar-inner { background: #0b0b0d !important; }
#sidebar-search { padding: 10px 10px 8px !important; border-bottom: 1px solid rgba(255,255,255,.05) !important; }
#sidebar-search input {
  background: rgba(255,255,255,.04) !important;
  border: 1px solid rgba(255,255,255,.07) !important;
  border-radius: 9px !important; font-size: 12px !important;
  color: #d4d4d8 !important;
}
#sidebar-search input:focus { border-color: rgba(251,191,36,.35) !important; }

#sidebar-nav {
  padding: 4px 6px 80px !important;
  scrollbar-width: thin !important;
  scrollbar-color: rgba(255,255,255,.06) transparent !important;
}

/* Group headers */
.nav-group-title {
  font-size: 9px !important; letter-spacing: 1.2px !important;
  color: #3f3f46 !important; padding: 12px 8px 4px !important;
  border-top: none !important; margin-top: 2px !important;
  text-transform: uppercase !important; font-weight: 700 !important;
  background: none !important;
}
.nav-group-title:hover { color: #52525b !important; background: none !important; }
.ng-chevron { opacity: .3 !important; }

/* Nav items */
.nav-item {
  border-radius: 8px !important; padding: 7px 9px !important;
  font-size: 12.5px !important; color: #71717a !important;
  font-weight: 400 !important; transition: all .12s !important;
  margin-bottom: 1px !important; gap: 8px !important;
}
.nav-item:hover { background: rgba(255,255,255,.05) !important; color: #a1a1aa !important; }
.nav-item.active {
  background: rgba(251,191,36,.1) !important;
  color: #fbbf24 !important; font-weight: 600 !important;
  box-shadow: inset 3px 0 0 #fbbf24 !important;
}
.nav-item i { color: inherit !important; opacity: .7; width: 15px !important; font-size: 12px !important; }
.nav-item.active i { opacity: 1 !important; }

/* Accesso Rapido: reso visibile (era nascosto per errore come "legacy") */
#core-nav { display: block !important; }
#prox-nav-group .prox-nav-label { display: none !important; }
#prox-nav-group {
  background: rgba(251,191,36,.04) !important;
  border: 1px solid rgba(251,191,36,.1) !important;
  border-radius: 10px !important; padding: 6px !important;
  margin: 6px 0 !important;
}
#prox-nav-group .prox-nav-item {
  font-size: 11px !important; padding: 5px 8px !important;
  border-radius: 6px !important; margin-bottom: 1px !important;
  color: #71717a !important;
}
#prox-nav-group .prox-nav-item:hover { background: rgba(251,191,36,.08) !important; color: #fbbf24 !important; }

/* ═══ ENTERPRISE COMPONENTS ═══ */

/* Urgency strip */
.ev1-urgency {
  display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;
  padding: 12px 16px; background: rgba(239,68,68,.06);
  border: 1px solid rgba(239,68,68,.15); border-radius: 12px;
}
.ev1-urgency-item {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; color: #ef4444;
  cursor: pointer; transition: .15s;
}
.ev1-urgency-item:hover { color: #f87171; }
.ev1-urgency-item.warn { color: #f59e0b; }
.ev1-urgency-item.ok { color: #22c55e; }

/* KPI row */
.ev1-kpi-row { display: grid; gap: 14px; margin-bottom: 20px; }
.ev1-kpi-row.cols-4 { grid-template-columns: repeat(4,1fr); }
.ev1-kpi-row.cols-3 { grid-template-columns: repeat(3,1fr); }
@media(max-width:900px) { .ev1-kpi-row.cols-4 { grid-template-columns: repeat(2,1fr); } }
.ev1-kpi {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 12px; padding: 16px 18px;
  position: relative; overflow: hidden; transition: .2s;
}
.ev1-kpi:hover { border-color: rgba(251,191,36,.3); }
.ev1-kpi-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
.ev1-kpi-icon { font-size: 18px; opacity: .5; }
.ev1-kpi-trend { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; }
.ev1-kpi-trend.up { background: rgba(34,197,94,.15); color: #22c55e; }
.ev1-kpi-trend.down { background: rgba(239,68,68,.15); color: #ef4444; }
.ev1-kpi-trend.flat { background: rgba(255,255,255,.06); color: #71717a; }
.ev1-kpi-val { font-size: 24px; font-weight: 800; color: #fff; line-height: 1; margin-bottom: 4px; }
.ev1-kpi-lbl { font-size: 11px; color: #71717a; }
.ev1-kpi-bar { height: 2px; background: rgba(255,255,255,.06); border-radius: 99px; margin-top: 12px; overflow: hidden; }
.ev1-kpi-bar-fill { height: 100%; border-radius: 99px; background: #fbbf24; }

/* Section tabs */
.ev1-tabs { display: flex; gap: 3px; background: rgba(255,255,255,.04); padding: 3px; border-radius: 10px; width: fit-content; margin-bottom: 18px; }
.ev1-tab {
  padding: 7px 18px; border-radius: 8px; border: none; cursor: pointer;
  font-size: 12px; font-weight: 600; color: #71717a; background: none;
  transition: .15s;
}
.ev1-tab.active { background: var(--bg-card); color: #fbbf24; }
.ev1-tab:hover:not(.active) { color: #a1a1aa; }

/* Table */
.ev1-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }
.ev1-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.ev1-table th {
  background: rgba(255,255,255,.03); padding: 10px 14px;
  text-align: left; font-size: 10px; color: #52525b;
  text-transform: uppercase; letter-spacing: .6px; font-weight: 700;
  white-space: nowrap; border-bottom: 1px solid var(--border);
}
.ev1-table td { padding: 10px 14px; border-top: 1px solid rgba(255,255,255,.04); vertical-align: middle; }
.ev1-table tr:hover td { background: rgba(255,255,255,.02); }
.ev1-table .td-actions { display: flex; gap: 4px; }

/* Status badges */
.ev1-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: 99px; font-size: 11px; font-weight: 600;
  white-space: nowrap;
}
.ev1-badge.attesa    { background: rgba(251,191,36,.12); color: #fbbf24; border: 1px solid rgba(251,191,36,.25); }
.ev1-badge.produzione { background: rgba(59,130,246,.12); color: #60a5fa; border: 1px solid rgba(59,130,246,.25); }
.ev1-badge.completato { background: rgba(34,197,94,.12); color: #22c55e; border: 1px solid rgba(34,197,94,.25); }
.ev1-badge.pagato    { background: rgba(34,197,94,.18); color: #4ade80; border: 1px solid rgba(34,197,94,.35); }
.ev1-badge.annullato { background: rgba(255,255,255,.06); color: #71717a; border: 1px solid rgba(255,255,255,.1); }
.ev1-badge.da_pagare { background: rgba(239,68,68,.12); color: #ef4444; border: 1px solid rgba(239,68,68,.25); }
.ev1-badge.high      { background: rgba(239,68,68,.12); color: #ef4444; border: 1px solid rgba(239,68,68,.2); }
.ev1-badge.medium    { background: rgba(251,191,36,.12); color: #fbbf24; border: 1px solid rgba(251,191,36,.2); }
.ev1-badge.low       { background: rgba(34,197,94,.12); color: #22c55e; border: 1px solid rgba(34,197,94,.2); }

/* Icon button */
.ev1-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer;
  font-size: 12px; font-weight: 600; transition: .15s;
}
.ev1-btn-primary { background: #fbbf24; color: #000; }
.ev1-btn-primary:hover { background: #f59e0b; }
.ev1-btn-secondary {
  background: rgba(255,255,255,.06); color: #a1a1aa;
  border: 1px solid rgba(255,255,255,.1);
}
.ev1-btn-secondary:hover { border-color: rgba(251,191,36,.3); color: #fbbf24; }
.ev1-btn-icon {
  width: 30px; height: 30px; padding: 0; border-radius: 7px;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  color: #71717a; cursor: pointer; display: inline-flex;
  align-items: center; justify-content: center; font-size: 13px; transition: .15s;
}
.ev1-btn-icon:hover { border-color: rgba(251,191,36,.3); color: #fbbf24; }
.ev1-btn-danger { background: rgba(239,68,68,.1); color: #ef4444; border: 1px solid rgba(239,68,68,.2); }
.ev1-btn-danger:hover { background: rgba(239,68,68,.2); }

/* Modal */
.ev1-modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 10000;
  display: flex; align-items: center; justify-content: center; padding: 20px;
  backdrop-filter: blur(4px);
}
.ev1-modal {
  background: #111113; border: 1px solid rgba(255,255,255,.1);
  border-radius: 16px; width: 100%; max-width: 640px; max-height: 90vh;
  overflow-y: auto; box-shadow: 0 30px 100px rgba(0,0,0,.8);
  animation: ev1ModalIn .2s cubic-bezier(.4,0,.2,1);
}
@keyframes ev1ModalIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.ev1-modal-lg { max-width: 800px; }
.ev1-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,.07);
}
.ev1-modal-title { font-size: 16px; font-weight: 700; color: #fff; }
.ev1-modal-close {
  background: none; border: none; color: #71717a; cursor: pointer;
  font-size: 20px; padding: 2px 6px; border-radius: 6px; line-height: 1; transition: .15s;
}
.ev1-modal-close:hover { color: #fff; background: rgba(255,255,255,.08); }
.ev1-modal-body { padding: 20px; }
.ev1-modal-footer {
  padding: 14px 20px; border-top: 1px solid rgba(255,255,255,.07);
  display: flex; justify-content: flex-end; gap: 8px;
}

/* Form */
.ev1-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ev1-form-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
.ev1-form-full { grid-column: 1/-1; }
.ev1-label { display: block; font-size: 11px; color: #71717a; font-weight: 600; margin-bottom: 5px; text-transform: uppercase; letter-spacing: .5px; }
.ev1-input {
  width: 100%; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px; padding: 9px 12px; color: #e5e5e5; font-size: 13px;
  outline: none; transition: .15s; font-family: inherit;
}
.ev1-input:focus { border-color: rgba(251,191,36,.4); background: rgba(251,191,36,.04); }
.ev1-input::placeholder { color: #3f3f46; }

/* Kanban */
.ev1-kanban { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
@media(max-width:1100px) { .ev1-kanban { grid-template-columns: repeat(2,1fr); } }
@media(max-width:700px) { .ev1-kanban { grid-template-columns: 1fr; } }
.ev1-kanban-col {
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07);
  border-radius: 12px; padding: 12px; min-height: 200px;
}
.ev1-kanban-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px; padding-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.ev1-kanban-title { font-size: 12px; font-weight: 700; }
.ev1-kanban-count {
  font-size: 11px; font-weight: 700; padding: 2px 8px;
  border-radius: 99px; background: rgba(255,255,255,.08); color: #71717a;
}
.ev1-kanban-card {
  background: var(--bg-card); border: 1px solid rgba(255,255,255,.07);
  border-radius: 10px; padding: 12px; margin-bottom: 8px;
  cursor: pointer; transition: .15s;
}
.ev1-kanban-card:hover { border-color: rgba(251,191,36,.25); transform: translateY(-1px); }
.ev1-kanban-card-title { font-size: 12.5px; font-weight: 600; color: #e5e5e5; margin-bottom: 6px; }
.ev1-kanban-card-meta { font-size: 11px; color: #71717a; display: flex; justify-content: space-between; align-items: center; }
.ev1-kanban-card-amount { font-size: 13px; font-weight: 700; color: #fbbf24; }

/* Deadline indicator */
.ev1-deadline { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 600; }
.ev1-deadline.urgent { color: #ef4444; }
.ev1-deadline.soon   { color: #f59e0b; }
.ev1-deadline.ok     { color: #22c55e; }

/* RFM score */
.ev1-rfm { display: inline-flex; gap: 2px; }
.ev1-rfm-dot { width: 8px; height: 8px; border-radius: 50%; }

/* AI insight box */
.ev1-ai-box {
  background: rgba(251,191,36,.05); border: 1px solid rgba(251,191,36,.15);
  border-radius: 12px; padding: 14px 16px; margin-bottom: 18px;
}
.ev1-ai-box-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px; font-weight: 700; color: #fbbf24; }
.ev1-ai-insight { font-size: 12px; color: #a1a1aa; line-height: 1.6; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,.04); }
.ev1-ai-insight:last-child { border-bottom: none; }
.ev1-ai-insight strong { color: #e5e5e5; }

/* Progress bar inline */
.ev1-prog { background: rgba(255,255,255,.06); border-radius: 99px; height: 4px; overflow: hidden; margin-top: 4px; }
.ev1-prog-fill { height: 100%; border-radius: 99px; background: #fbbf24; transition: width .6s; }

/* Section header */
.ev1-section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
}
.ev1-section-title { font-size: 20px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 10px; }
.ev1-section-sub { font-size: 12px; color: #71717a; margin-top: 3px; }
.ev1-section-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

/* Empty state */
.ev1-empty {
  text-align: center; padding: 60px 20px; color: #3f3f46;
}
.ev1-empty-icon { font-size: 40px; margin-bottom: 12px; opacity: .3; }
.ev1-empty-text { font-size: 14px; color: #52525b; margin-bottom: 16px; }

/* Whatsapp button */
.ev1-wa-btn {
  background: rgba(34,197,94,.12); border: 1px solid rgba(34,197,94,.25);
  color: #22c55e; border-radius: 7px; padding: 5px 9px;
  cursor: pointer; font-size: 12px; font-weight: 600;
  display: inline-flex; align-items: center; gap: 4px; transition: .15s;
}
.ev1-wa-btn:hover { background: rgba(34,197,94,.22); }

/* Chart bar */
.ev1-chart-wrap { display: flex; align-items: flex-end; gap: 6px; height: 120px; padding: 0 4px; }
.ev1-chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.ev1-chart-bar-wrap { flex: 1; display: flex; align-items: flex-end; width: 100%; }
.ev1-chart-bar {
  width: 100%; border-radius: 5px 5px 0 0;
  background: rgba(251,191,36,.4); transition: height .6s cubic-bezier(.4,0,.2,1);
  min-height: 3px; cursor: pointer;
}
.ev1-chart-bar:hover { background: #fbbf24; }
.ev1-chart-lbl { font-size: 9px; color: #52525b; }
.ev1-chart-val { font-size: 9px; color: #71717a; white-space: nowrap; }

/* Scrollbar */
.ev1-scroll::-webkit-scrollbar { width: 4px; }
.ev1-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 99px; }

/* Toast */
#ev1-toast {
  position: fixed; bottom: 80px; right: 20px; z-index: 99999;
  display: flex; flex-direction: column; gap: 8px; pointer-events: none;
}
.ev1-toast-item {
  background: #18181b; border: 1px solid rgba(255,255,255,.12);
  border-radius: 10px; padding: 11px 16px; font-size: 13px; color: #e5e5e5;
  box-shadow: 0 8px 30px rgba(0,0,0,.6); animation: ev1ToastIn .3s ease;
  display: flex; align-items: center; gap: 8px; min-width: 240px;
  pointer-events: all;
}
.ev1-toast-item.success { border-left: 3px solid #22c55e; }
.ev1-toast-item.error   { border-left: 3px solid #ef4444; }
.ev1-toast-item.info    { border-left: 3px solid #fbbf24; }
@keyframes ev1ToastIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

/* ═══ OVERRIDES for prox-nav-group ═══ */
.prox-nav-item { transition: all .12s !important; }
`;
    document.head.appendChild(s);
  }

  /* ── Toast ── */
  function toast(msg, type, ms) {
    var container = $id('ev1-toast');
    if (!container) { container = ce('div'); container.id = 'ev1-toast'; document.body.appendChild(container); }
    var item = ce('div', 'ev1-toast-item ' + (type || 'info'), (type === 'success' ? '✓ ' : type === 'error' ? '✗ ' : '◆ ') + esc(msg));
    container.appendChild(item);
    setTimeout(function () { item.style.opacity = '0'; item.style.transform = 'translateX(20px)'; item.style.transition = '.3s'; setTimeout(function () { item.remove(); }, 300); }, ms || 2500);
  }

  /* ─────────────────────────────────────────────────
     1. EXECUTIVE DASHBOARD
  ───────────────────────────────────────────────── */
  function buildDashboard() {
    var section = $id('view-dashboard');
    if (!section || section._ev1DashBuilt) return;

    var orders = getOrders();
    var clients = getClients();
    var sales = getSales();

    /* KPIs */
    var now = Date.now();
    var m0 = new Date(); m0.setDate(1); m0.setHours(0,0,0,0);
    var ordersThisMonth = orders.filter(function (o) { return new Date(oDate(o)) >= m0; });
    var revenue = ordersThisMonth.reduce(function (s, o) { return s + oAmt(o); }, 0);
    var pending = orders.filter(function (o) { var s = oStatus(o); return s === 'attesa' || s === 'produzione'; });
    var overdue = orders.filter(function (o) {
      var dl = oDeadline(o);
      return dl && new Date(dl) < new Date() && oStatus(o) !== 'completato' && oStatus(o) !== 'annullato';
    });
    var allRevenue = orders.reduce(function (s, o) { return s + oAmt(o); }, 0);
    var avgOrder = orders.length ? allRevenue / orders.length : 0;

    /* 6-month chart data */
    var months = []; var monthLabels = [];
    for (var i = 5; i >= 0; i--) {
      var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      var mStart = new Date(d); var mEnd = new Date(d); mEnd.setMonth(mEnd.getMonth() + 1);
      var mRev = orders.filter(function (o) { var dt = new Date(oDate(o)); return dt >= mStart && dt < mEnd; })
        .reduce(function (s, o) { return s + oAmt(o); }, 0);
      months.push(mRev);
      monthLabels.push(d.toLocaleDateString('it-IT', { month: 'short' }));
    }
    var maxM = Math.max.apply(null, months) || 1;

    /* AI insights */
    var insights = [];
    if (overdue.length) insights.push('<strong>⚠️ ' + overdue.length + ' ordini in ritardo</strong> — verificare priorità produzione');
    if (pending.length) insights.push('<strong>' + pending.length + ' ordini in lavorazione</strong> — valore: ' + fmt(pending.reduce(function(s,o){return s+oAmt(o);},0)));
    var dormant = clients.filter(function (c) { return daysSince(c.lastContact || c.updatedAt) > 60; });
    if (dormant.length) insights.push('<strong>' + dormant.length + ' clienti dormienti</strong> (>60 giorni senza contatto) — azione raccomandata: follow-up');
    if (revenue > 0) {
      var prevM = new Date(); prevM.setMonth(prevM.getMonth() - 1); prevM.setDate(1);
      var prevRev = months[4];
      if (prevRev > 0) {
        var delta = Math.round((months[5] - prevRev) / prevRev * 100);
        insights.push('<strong>' + (delta >= 0 ? '▲' : '▼') + Math.abs(delta) + '% vs mese scorso</strong> — fatturato corrente ' + fmt(revenue));
      }
    }
    if (!insights.length) insights.push('<strong>Nessun dato critico</strong> — tutto in ordine');

    /* Urgency items */
    var urgItems = [];
    if (overdue.length) urgItems.push('<span class="ev1-urgency-item"><span>⚠️</span><span>' + overdue.length + ' in ritardo</span></span>');
    if (pending.length) urgItems.push('<span class="ev1-urgency-item warn" onclick="App.navigate(\'gestione_ordini\')"><span>🔄</span><span>' + pending.length + ' in produzione</span></span>');
    urgItems.push('<span class="ev1-urgency-item ok"><span>👥</span><span>' + clients.length + ' clienti attivi</span></span>');

    /* Chart bars */
    var bars = months.map(function (v, i) {
      var h = Math.round((v / maxM) * 100);
      return '<div class="ev1-chart-col">' +
        '<div class="ev1-chart-val">' + (v > 0 ? fmt(v) : '') + '</div>' +
        '<div class="ev1-chart-bar-wrap"><div class="ev1-chart-bar" style="height:' + Math.max(h,2) + '%" title="' + fmt(v) + '"></div></div>' +
        '<div class="ev1-chart-lbl">' + monthLabels[i] + '</div></div>';
    }).join('');

    /* Recent orders table rows */
    var recentOrders = orders.slice().sort(function (a, b) { return new Date(oDate(b)) - new Date(oDate(a)); }).slice(0, 6);
    var orderRows = recentOrders.map(function (o) {
      var st = oStatus(o);
      var dl = oDeadline(o);
      var dlDays = dl ? Math.round((new Date(dl) - Date.now()) / 86400000) : null;
      var dlHTML = dlDays !== null
        ? '<span class="ev1-deadline ' + (dlDays < 0 ? 'urgent' : dlDays < 3 ? 'soon' : 'ok') + '">' + (dlDays < 0 ? '⚠️ ' + Math.abs(dlDays) + 'g scaduto' : dlDays + 'g') + '</span>'
        : '—';
      return '<tr onclick="App.navigate(\'gestione_ordini\')" style="cursor:pointer">' +
        '<td><strong>' + esc(oClient(o)) + '</strong></td>' +
        '<td>' + esc(o.description || o.desc || o.tipo || '—') + '</td>' +
        '<td><span class="ev1-kpi-val" style="font-size:13px">' + fmt(oAmt(o)) + '</span></td>' +
        '<td><span class="ev1-badge ' + st + '">' + st + '</span></td>' +
        '<td>' + dlHTML + '</td></tr>';
    }).join('');

    var html = '<div style="padding-bottom:8px">' +
      /* Urgency strip */
      (urgItems.length ? '<div class="ev1-urgency">' + urgItems.join('') + '</div>' : '') +
      /* KPI row */
      '<div class="ev1-kpi-row cols-4">' +
        kpiCard('💰', 'Fatturato Mese', fmt(revenue), months[5] > months[4] ? 'up' : 'down', '', months[5] > 0 ? Math.round(months[5]/maxM*100) : 0) +
        kpiCard('📋', 'Ordini Aperti', pending.length, pending.length > 5 ? 'down' : 'up', '', Math.min(pending.length * 10, 100)) +
        kpiCard('👥', 'Clienti Totali', clients.length, 'flat', '', Math.min(clients.length * 5, 100)) +
        kpiCard('📊', 'Ticket Medio', fmt(avgOrder), 'flat', '', 50) +
      '</div>' +
      /* Two column */
      '<div style="display:grid;grid-template-columns:1fr 340px;gap:18px;margin-bottom:20px">' +
        /* Chart */
        '<div class="ev1-kpi" style="padding:18px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
            '<div><div style="font-size:14px;font-weight:700;color:#fff">Andamento 6 Mesi</div><div style="font-size:11px;color:#71717a">fatturato mensile</div></div>' +
            '<div style="font-size:20px;font-weight:800;color:#fbbf24">' + fmt(allRevenue) + '</div>' +
          '</div>' +
          '<div class="ev1-chart-wrap">' + bars + '</div>' +
        '</div>' +
        /* AI panel */
        '<div class="ev1-ai-box" style="margin-bottom:0">' +
          '<div class="ev1-ai-box-header">🤖 AI Business Advisor</div>' +
          insights.map(function (i) { return '<div class="ev1-ai-insight">' + i + '</div>'; }).join('') +
        '</div>' +
      '</div>' +
      /* Recent orders */
      '<div style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">' +
        '<div style="font-size:14px;font-weight:700;color:#fff">Ordini Recenti</div>' +
        '<button class="ev1-btn ev1-btn-secondary" onclick="App.navigate(\'gestione_ordini\')" style="font-size:11px">Tutti gli ordini →</button>' +
      '</div>' +
      '<div class="ev1-table-wrap">' +
        '<table class="ev1-table"><thead><tr><th>Cliente</th><th>Descrizione</th><th>Importo</th><th>Stato</th><th>Scadenza</th></tr></thead>' +
        '<tbody>' + (orderRows || '<tr><td colspan="5"><div class="ev1-empty"><div class="ev1-empty-icon">📋</div><div class="ev1-empty-text">Nessun ordine ancora</div><button class="ev1-btn ev1-btn-primary" onclick="App.navigate(\'gestione_ordini\')">+ Nuovo Ordine</button></div></td></tr>') + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>';

    section._ev1DashBuilt = true;
    section.innerHTML = html;
  }

  function kpiCard(icon, label, val, trend, sub, pct) {
    return '<div class="ev1-kpi">' +
      '<div class="ev1-kpi-top">' +
        '<span class="ev1-kpi-icon">' + icon + '</span>' +
        (trend ? '<span class="ev1-kpi-trend ' + trend + '">' + (trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—') + '</span>' : '') +
      '</div>' +
      '<div class="ev1-kpi-val">' + val + '</div>' +
      '<div class="ev1-kpi-lbl">' + label + '</div>' +
      (pct ? '<div class="ev1-prog"><div class="ev1-prog-fill" style="width:' + pct + '%"></div></div>' : '') +
    '</div>';
  }

  /* ─────────────────────────────────────────────────
     2. ORDINI & WORKFLOW — Full ERP
  ───────────────────────────────────────────────── */
  var ordersView = 'kanban'; // 'kanban' | 'table'
  var ordersFilter = '';

  function buildOrdini() {
    var section = $id('view-gestione_ordini');
    if (!section || section._ev1OrdiniBuilt) return;
    section._ev1OrdiniBuilt = true;
    renderOrdini();
  }

  function renderOrdini() {
    var section = $id('view-gestione_ordini');
    if (!section) return;

    var orders = getOrders();
    var filtered = ordersFilter
      ? orders.filter(function (o) { return oStatus(o) === ordersFilter; })
      : orders;
    filtered = filtered.slice().sort(function (a, b) { return new Date(oDate(b)) - new Date(oDate(a)); });

    var totalVal = filtered.reduce(function (s, o) { return s + oAmt(o); }, 0);
    var overdue = filtered.filter(function (o) {
      var dl = oDeadline(o); return dl && new Date(dl) < new Date() && oStatus(o) !== 'completato' && oStatus(o) !== 'annullato';
    }).length;

    /* kanban columns */
    var COLS = [
      { key: 'attesa',    label: '⏳ In Attesa',     color: '#fbbf24' },
      { key: 'produzione',label: '🔄 Produzione',    color: '#60a5fa' },
      { key: 'completato',label: '✅ Completato',    color: '#22c55e' },
      { key: 'annullato', label: '❌ Annullato',     color: '#71717a' }
    ];

    var kanbanCols = COLS.map(function (col) {
      var colOrders = (ordersFilter ? filtered : orders).filter(function (o) { return oStatus(o) === col.key; });
      var cards = colOrders.slice(0, 20).map(function (o) {
        var dl = oDeadline(o);
        var dlDays = dl ? Math.round((new Date(dl) - Date.now()) / 86400000) : null;
        var urgent = dlDays !== null && dlDays < 0;
        return '<div class="ev1-kanban-card" style="' + (urgent ? 'border-color:rgba(239,68,68,.35)' : '') + '" onclick="ev1OrderModal(\'' + o.id + '\')">' +
          '<div class="ev1-kanban-card-title">' + esc(oClient(o)) + '</div>' +
          '<div style="font-size:11px;color:#71717a;margin-bottom:8px">' + esc(o.description || o.desc || o.tipo || '—').slice(0,50) + '</div>' +
          '<div class="ev1-kanban-card-meta">' +
            '<span class="ev1-kanban-card-amount">' + fmt(oAmt(o)) + '</span>' +
            (dl ? '<span class="ev1-deadline ' + (dlDays < 0 ? 'urgent' : dlDays < 3 ? 'soon' : 'ok') + '">' + (dlDays < 0 ? '⚠️ ' + Math.abs(dlDays) + 'g' : dlDays + 'g') + '</span>' : '<span></span>') +
          '</div>' +
        '</div>';
      }).join('') || '<div style="text-align:center;padding:30px 0;color:#3f3f46;font-size:12px">Nessun ordine</div>';

      return '<div class="ev1-kanban-col">' +
        '<div class="ev1-kanban-header">' +
          '<span class="ev1-kanban-title" style="color:' + col.color + '">' + col.label + '</span>' +
          '<span class="ev1-kanban-count">' + colOrders.length + '</span>' +
        '</div>' + cards +
      '</div>';
    }).join('');

    /* table rows */
    var tableRows = filtered.map(function (o) {
      var st = oStatus(o);
      var dl = oDeadline(o);
      var dlDays = dl ? Math.round((new Date(dl) - Date.now()) / 86400000) : null;
      return '<tr>' +
        '<td><strong style="color:#e5e5e5">' + esc(oClient(o)) + '</strong><br><span style="font-size:10px;color:#52525b">' + dtIT(oDate(o)) + '</span></td>' +
        '<td>' + esc((o.description || o.desc || o.tipo || '—').slice(0,60)) + '</td>' +
        '<td><strong>' + fmt(oAmt(o)) + '</strong></td>' +
        '<td><span class="ev1-badge ' + st + '">' + st + '</span></td>' +
        '<td>' + (dl ? '<span class="ev1-deadline ' + (dlDays < 0 ? 'urgent' : dlDays < 3 ? 'soon' : 'ok') + '">' + dtIT(dl) + '</span>' : '—') + '</td>' +
        '<td><div class="td-actions">' +
          '<button class="ev1-btn-icon" title="Modifica" onclick="ev1OrderModal(\'' + o.id + '\')">✏️</button>' +
          '<button class="ev1-wa-btn" title="WhatsApp" onclick="ev1WAOrder(\'' + o.id + '\')">📱</button>' +
          '<button class="ev1-btn-icon" title="Elimina" onclick="ev1DeleteOrder(\'' + o.id + '\')">🗑</button>' +
        '</div></td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="6"><div class="ev1-empty"><div class="ev1-empty-icon">📋</div><div class="ev1-empty-text">Nessun ordine</div></div></td></tr>';

    var filterBtns = [
      { v: '', l: 'Tutti' },
      { v: 'attesa', l: '⏳ Attesa' },
      { v: 'produzione', l: '🔄 Produzione' },
      { v: 'completato', l: '✅ Completato' },
      { v: 'annullato', l: '❌ Annullato' },
    ].map(function (f) {
      var cnt = orders.filter(function (o) { return !f.v || oStatus(o) === f.v; }).length;
      return '<button class="ev1-tab' + (ordersFilter === f.v ? ' active' : '') + '" onclick="ev1OrdFilter(\'' + f.v + '\')">' + f.l + ' <span style="opacity:.5;font-size:10px">(' + cnt + ')</span></button>';
    }).join('');

    section.innerHTML =
      '<div class="ev1-section-header">' +
        '<div><div class="ev1-section-title">📋 Ordini & Workflow</div><div class="ev1-section-sub">Pipeline completa ordini — ' + fmt(totalVal) + ' totale' + (overdue ? ' · <span style="color:#ef4444">⚠️ ' + overdue + ' in ritardo</span>' : '') + '</div></div>' +
        '<div class="ev1-section-actions">' +
          '<button class="ev1-btn ev1-btn-secondary" onclick="ev1OrdView(\'kanban\')" style="' + (ordersView==='kanban'?'border-color:rgba(251,191,36,.4);color:#fbbf24':'') + '">⊞ Kanban</button>' +
          '<button class="ev1-btn ev1-btn-secondary" onclick="ev1OrdView(\'table\')" style="' + (ordersView==='table'?'border-color:rgba(251,191,36,.4);color:#fbbf24':'') + '">☰ Lista</button>' +
          '<button class="ev1-btn ev1-btn-primary" onclick="ev1OrderModal(null)">+ Nuovo Ordine</button>' +
        '</div>' +
      '</div>' +
      '<div class="ev1-tabs">' + filterBtns + '</div>' +
      (ordersView === 'kanban'
        ? '<div class="ev1-kanban">' + kanbanCols + '</div>'
        : '<div class="ev1-table-wrap"><table class="ev1-table"><thead><tr><th>Cliente</th><th>Descrizione</th><th>Importo</th><th>Stato</th><th>Scadenza</th><th></th></tr></thead><tbody>' + tableRows + '</tbody></table></div>'
      );
  }

  window.ev1OrdView = function (v) { ordersView = v; renderOrdini(); };
  window.ev1OrdFilter = function (f) { ordersFilter = f; renderOrdini(); };

  window.ev1WAOrder = function (id) {
    var orders = getOrders();
    var o = orders.find(function (x) { return x.id === id; });
    if (!o) return;
    var msg = '✅ *Aggiornamento ordine INGLY*\n\nCliente: ' + oClient(o) + '\nDescrizione: ' + (o.description || o.tipo || '—') + '\nStato: ' + oStatus(o).toUpperCase() + '\nImporto: ' + fmt(oAmt(o)) + '\n\nGrazie per aver scelto Ingly Design! 🎨';
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  window.ev1DeleteOrder = function (ordId) {
    var orders = getOrders();
    var o = orders.find(function (x) { return x.id === ordId; });
    if (!o) return;
    openSimpleConfirm('Eliminare l\'ordine di ' + esc(oClient(o)) + '?', function () {
      saveOrders(getOrders().filter(function (x) { return x.id !== ordId; }));
      renderOrdini();
      toast('Ordine eliminato', 'success');
    });
  };

  window.ev1OrderModal = function (id) {
    var orders = getOrders();
    var o = id ? orders.find(function (x) { return x.id === id; }) : null;
    var isNew = !o;
    if (!o) o = { id: uid(), status: 'attesa' };

    var STATUS_OPTS = ['attesa','produzione','completato','annullato'].map(function (s) {
      return '<option value="' + s + '"' + (o.status === s || oStatus(o) === s ? ' selected' : '') + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>';
    }).join('');

    openModal('ev1-order-modal',
      (isNew ? '+ Nuovo Ordine' : 'Modifica Ordine — ' + esc(oClient(o))),
      '<div class="ev1-form-grid">' +
        '<div><label class="ev1-label">Cliente *</label><input id="ev1-ord-client" class="ev1-input" value="' + esc(o.client || o.clientName || o.cliente || '') + '" placeholder="Nome cliente"></div>' +
        '<div><label class="ev1-label">Importo €</label><input id="ev1-ord-amount" class="ev1-input" type="number" value="' + (oAmt(o) || '') + '" placeholder="0"></div>' +
        '<div class="ev1-form-full"><label class="ev1-label">Descrizione</label><input id="ev1-ord-desc" class="ev1-input" value="' + esc(o.description || o.desc || o.tipo || '') + '" placeholder="Descrizione lavoro"></div>' +
        '<div><label class="ev1-label">Data Ordine</label><input id="ev1-ord-date" class="ev1-input" type="date" value="' + (oDate(o) || new Date().toISOString().split('T')[0]) + '"></div>' +
        '<div><label class="ev1-label">Scadenza Consegna</label><input id="ev1-ord-deadline" class="ev1-input" type="date" value="' + (oDeadline(o) || '') + '"></div>' +
        '<div><label class="ev1-label">Stato</label><select id="ev1-ord-status" class="ev1-input">' + STATUS_OPTS + '</select></div>' +
        '<div><label class="ev1-label">Telefono cliente</label><input id="ev1-ord-phone" class="ev1-input" value="' + esc(o.phone || o.tel || '') + '" placeholder="+39..."></div>' +
        '<div class="ev1-form-full"><label class="ev1-label">Note</label><textarea id="ev1-ord-notes" class="ev1-input" rows="3" placeholder="Note interne...">' + esc(o.notes || '') + '</textarea></div>' +
      '</div>',
      function () {
        var orders2 = getOrders();
        var updated = {
          id: o.id,
          client: $id('ev1-ord-client').value.trim(),
          description: $id('ev1-ord-desc').value.trim(),
          total: parseFloat($id('ev1-ord-amount').value) || 0,
          date: $id('ev1-ord-date').value,
          deadline: $id('ev1-ord-deadline').value,
          status: $id('ev1-ord-status').value,
          phone: $id('ev1-ord-phone').value.trim(),
          notes: $id('ev1-ord-notes').value.trim(),
        };
        if (!updated.client) { toast('Inserisci il nome del cliente', 'error'); return false; }
        if (isNew) orders2.push(updated);
        else { var idx = orders2.findIndex(function(x){return x.id===id;}); if(idx>=0) orders2[idx]=updated; else orders2.push(updated); }
        saveOrders(orders2);
        closeModal('ev1-order-modal');
        renderOrdini();
        toast(isNew ? 'Ordine creato' : 'Ordine aggiornato', 'success');
      }
    );
  };

  /* ─────────────────────────────────────────────────
     3. CRM — RFM Scoring + LTV
  ───────────────────────────────────────────────── */
  function buildCRM() {
    var section = $id('view-clients');
    if (!section || section._ev1CRMBuilt) return;
    section._ev1CRMBuilt = true;
    renderCRM();
  }

  function renderCRM() {
    var section = $id('view-clients');
    if (!section) return;

    var clients = getClients();
    var orders = getOrders();

    /* RFM scoring */
    var scored = clients.map(function (c) {
      var cOrders = orders.filter(function (o) { return oClient(o).toLowerCase() === (c.name||c.nome||'').toLowerCase() || o.clientId === c.id; });
      var ltv = cOrders.reduce(function (s, o) { return s + oAmt(o); }, 0);
      var freq = cOrders.length;
      var lastOrder = cOrders.sort(function (a, b) { return new Date(oDate(b)) - new Date(oDate(a)); })[0];
      var recency = lastOrder ? daysSince(oDate(lastOrder)) : 999;
      var r = recency < 14 ? 5 : recency < 30 ? 4 : recency < 60 ? 3 : recency < 120 ? 2 : 1;
      var f = freq >= 10 ? 5 : freq >= 5 ? 4 : freq >= 3 ? 3 : freq >= 1 ? 2 : 1;
      var m = ltv >= 2000 ? 5 : ltv >= 1000 ? 4 : ltv >= 500 ? 3 : ltv >= 100 ? 2 : 1;
      var rfm = r + f + m;
      var tier = rfm >= 13 ? 'VIP' : rfm >= 10 ? 'Gold' : rfm >= 7 ? 'Silver' : 'Base';
      var tierColor = rfm >= 13 ? '#a78bfa' : rfm >= 10 ? '#fbbf24' : rfm >= 7 ? '#a1a1aa' : '#71717a';
      return Object.assign({}, c, { _ltv: ltv, _freq: freq, _recency: recency, _rfm: rfm, _tier: tier, _tierColor: tierColor });
    }).sort(function (a, b) { return b._rfm - a._rfm; });

    var dormant = scored.filter(function (c) { return c._recency > 60 && c._freq > 0; });
    var topClients = scored.slice(0, 3);

    /* AI insights */
    var insights = [];
    if (dormant.length) insights.push('<strong>💤 ' + dormant.length + ' clienti dormienti</strong> — ultimo contatto >60 giorni. Lancia campagna riattivazione WhatsApp.');
    if (topClients[0]) insights.push('<strong>⭐ Top cliente: ' + esc(topClients[0].name || topClients[0].nome || '—') + '</strong> — LTV ' + fmt(topClients[0]._ltv) + ', ' + topClients[0]._freq + ' ordini totali.');
    var totalLTV = scored.reduce(function(s,c){return s+c._ltv;},0);
    if (totalLTV) insights.push('<strong>💰 LTV cumulato clienti: ' + fmt(totalLTV) + '</strong> — valore storico totale generato.');

    /* Table rows */
    var rows = scored.map(function (c) {
      var name = c.name || c.nome || c.firstName || '—';
      var phone = c.phone || c.tel || c.whatsapp || '';
      var email = c.email || '';
      var rfmDots = [c._rfm >= 4?'#a78bfa':'#27272a',c._rfm >= 8?'#fbbf24':'#27272a',c._rfm >= 12?'#22c55e':'#27272a'].map(function(col){return '<div class="ev1-rfm-dot" style="background:'+col+'"></div>';}).join('');
      return '<tr>' +
        '<td><strong style="color:#e5e5e5">' + esc(name) + '</strong>' + (email ? '<br><span style="font-size:10px;color:#52525b">' + esc(email) + '</span>' : '') + '</td>' +
        '<td><span style="color:' + c._tierColor + ';font-weight:700;font-size:12px">' + c._tier + '</span><br><div class="ev1-rfm">' + rfmDots + '<span style="font-size:10px;color:#52525b;margin-left:3px">' + c._rfm + '/15</span></div></td>' +
        '<td><strong style="color:#fbbf24">' + fmt(c._ltv) + '</strong></td>' +
        '<td>' + c._freq + ' ordini</td>' +
        '<td>' + (c._recency < 999 ? (c._recency > 60 ? '<span style="color:#ef4444">' + c._recency + 'g fa</span>' : c._recency + 'g fa') : '—') + '</td>' +
        '<td><div class="td-actions">' +
          (phone ? '<a class="ev1-wa-btn" href="https://wa.me/' + phone.replace(/\D/g,'') + '" target="_blank">📱 WA</a>' : '') +
          '<button class="ev1-btn-icon" onclick="ev1EditClient(\'' + c.id + '\')">✏️</button>' +
        '</div></td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="6"><div class="ev1-empty"><div class="ev1-empty-icon">👥</div><div class="ev1-empty-text">Nessun cliente ancora</div></div></td></tr>';

    section.innerHTML =
      '<div class="ev1-section-header">' +
        '<div><div class="ev1-section-title">👥 CRM Clienti</div><div class="ev1-section-sub">' + clients.length + ' clienti · scoring RFM automatico · LTV tracking</div></div>' +
        '<div class="ev1-section-actions">' +
          '<button class="ev1-btn ev1-btn-primary" onclick="ev1NewClient()">+ Nuovo Cliente</button>' +
        '</div>' +
      '</div>' +
      (insights.length ? '<div class="ev1-ai-box"><div class="ev1-ai-box-header">🤖 AI CRM Insights</div>' + insights.map(function(i){return '<div class="ev1-ai-insight">'+i+'</div>';}).join('') + '</div>' : '') +
      /* Tier summary */
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">' +
        [['VIP','#a78bfa'],['Gold','#fbbf24'],['Silver','#a1a1aa'],['Base','#71717a']].map(function(t){
          var cnt = scored.filter(function(c){return c._tier===t[0];}).length;
          return '<div class="ev1-kpi" style="padding:14px;text-align:center">' +
            '<div style="font-size:20px;font-weight:800;color:'+t[1]+'">' + cnt + '</div>' +
            '<div style="font-size:11px;color:#71717a">' + t[0] + '</div></div>';
        }).join('') +
      '</div>' +
      '<div class="ev1-table-wrap"><table class="ev1-table"><thead><tr><th>Cliente</th><th>Tier / RFM</th><th>LTV</th><th>Frequenza</th><th>Ultimo ordine</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  window.ev1NewClient = function () { ev1ClientModal(null); };
  window.ev1EditClient = function (id) { ev1ClientModal(id); };

  window.ev1ClientModal = function (id) {
    var clients_store = ST.get('ingly_clients', []);
    var crm_store = ST.get('ingly_crm_v1', []);
    var all = [].concat(clients_store, crm_store);
    var c = id ? all.find(function (x) { return x.id === id; }) : null;
    var isNew = !c;
    if (!c) c = { id: uid() };

    openModal('ev1-client-modal', isNew ? '+ Nuovo Cliente' : 'Modifica Cliente',
      '<div class="ev1-form-grid">' +
        '<div><label class="ev1-label">Nome *</label><input id="ev1-cl-name" class="ev1-input" value="' + esc(c.name||c.nome||'') + '"></div>' +
        '<div><label class="ev1-label">Azienda</label><input id="ev1-cl-company" class="ev1-input" value="' + esc(c.company||c.azienda||'') + '"></div>' +
        '<div><label class="ev1-label">Telefono / WhatsApp</label><input id="ev1-cl-phone" class="ev1-input" value="' + esc(c.phone||c.tel||'') + '" placeholder="+39..."></div>' +
        '<div><label class="ev1-label">Email</label><input id="ev1-cl-email" class="ev1-input" type="email" value="' + esc(c.email||'') + '"></div>' +
        '<div><label class="ev1-label">Città</label><input id="ev1-cl-city" class="ev1-input" value="' + esc(c.city||c.citta||'') + '"></div>' +
        '<div><label class="ev1-label">Categoria</label><select id="ev1-cl-cat" class="ev1-input"><option>Retail</option><option>B2B</option><option>Wholesale</option><option>E-commerce</option></select></div>' +
        '<div class="ev1-form-full"><label class="ev1-label">Note</label><textarea id="ev1-cl-notes" class="ev1-input" rows="2">' + esc(c.notes||'') + '</textarea></div>' +
      '</div>',
      function () {
        var updated = {
          id: c.id, name: $id('ev1-cl-name').value.trim(),
          company: $id('ev1-cl-company').value.trim(),
          phone: $id('ev1-cl-phone').value.trim(),
          email: $id('ev1-cl-email').value.trim(),
          city: $id('ev1-cl-city').value.trim(),
          category: $id('ev1-cl-cat').value,
          notes: $id('ev1-cl-notes').value.trim(),
          updatedAt: new Date().toISOString(),
        };
        if (!updated.name) { toast('Inserisci il nome', 'error'); return false; }
        var store = ST.get('ingly_clients', []);
        if (isNew) store.push(updated);
        else { var idx = store.findIndex(function(x){return x.id===id;}); if(idx>=0) store[idx]=updated; else store.push(updated); }
        ST.set('ingly_clients', store);
        closeModal('ev1-client-modal');
        renderCRM();
        toast(isNew ? 'Cliente aggiunto' : 'Cliente aggiornato', 'success');
      }
    );
  };

  /* ─────────────────────────────────────────────────
     4. FISCAL — P&L + Scadenziario
  ───────────────────────────────────────────────── */
  function buildFiscal() {
    var section = $id('view-fiscal');
    if (!section || section._ev1FiscalBuilt) return;
    section._ev1FiscalBuilt = true;
    renderFiscal();
  }

  function renderFiscal() {
    var section = $id('view-fiscal');
    if (!section) return;

    var sales = getSales();
    var orders = getOrders();
    var costs = ST.get('ingly_fixed_costs', []);

    /* Monthly aggregates — last 4 months */
    var months = []; var monthData = [];
    for (var i = 3; i >= 0; i--) {
      var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      var mStart = new Date(d); var mEnd = new Date(d); mEnd.setMonth(mEnd.getMonth() + 1);
      var mLabel = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
      var mRev = orders.filter(function (o) { var dt = new Date(oDate(o)); return dt >= mStart && dt < mEnd; })
        .reduce(function (s, o) { return s + oAmt(o); }, 0);
      var mSales = sales.filter(function (s) { var dt = new Date(s.date||s.data||''); return dt >= mStart && dt < mEnd; })
        .reduce(function (s2, s) { return s2 + +(s.amount||s.importo||0); }, 0);
      var mCosts = costs.filter(function (c) { var dt = new Date(c.date||c.data||''); return dt >= mStart && dt < mEnd; })
        .reduce(function (s, c) { return s + +(c.amount||c.importo||0); }, 0);
      var revenue = Math.max(mRev, mSales);
      var margin = revenue - mCosts;
      months.push(mLabel);
      monthData.push({ rev: revenue, costs: mCosts, margin: margin });
    }

    /* Totals */
    var totRev = monthData.reduce(function(s,m){return s+m.rev;},0);
    var totCosts = monthData.reduce(function(s,m){return s+m.costs;},0);
    var totMargin = totRev - totCosts;
    var marginPct = totRev > 0 ? Math.round(totMargin / totRev * 100) : 0;

    /* P&L table */
    var plRows = monthData.map(function (m, i) {
      var marginPctM = m.rev > 0 ? Math.round(m.margin / m.rev * 100) : 0;
      return '<tr>' +
        '<td><strong>' + months[i] + '</strong></td>' +
        '<td style="color:#22c55e;font-weight:700">' + fmt(m.rev) + '</td>' +
        '<td style="color:#ef4444">' + fmt(m.costs) + '</td>' +
        '<td style="color:' + (m.margin >= 0 ? '#22c55e' : '#ef4444') + ';font-weight:700">' + fmt(m.margin) + '</td>' +
        '<td><span style="color:' + (marginPctM >= 30 ? '#22c55e' : marginPctM >= 10 ? '#fbbf24' : '#ef4444') + ';font-weight:700">' + marginPctM + '%</span></td>' +
      '</tr>';
    }).join('');

    /* Payments due (from orders not paid) */
    var toPay = orders.filter(function (o) { var s = oStatus(o); return s !== 'annullato' && s !== 'pagato'; })
      .sort(function (a, b) { return new Date(oDeadline(a)||oDate(a)) - new Date(oDeadline(b)||oDate(b)); })
      .slice(0, 15);
    var toPayRows = toPay.map(function (o) {
      var dl = oDeadline(o) || oDate(o);
      var dlDays = dl ? Math.round((new Date(dl) - Date.now()) / 86400000) : null;
      return '<tr>' +
        '<td><strong>' + esc(oClient(o)) + '</strong></td>' +
        '<td>' + esc((o.description||o.tipo||'—').slice(0,40)) + '</td>' +
        '<td><strong style="color:#fbbf24">' + fmt(oAmt(o)) + '</strong></td>' +
        '<td>' + (dl ? '<span class="ev1-deadline ' + (dlDays < 0 ? 'urgent' : dlDays < 7 ? 'soon' : 'ok') + '">' + dtIT(dl) + '</span>' : '—') + '</td>' +
        '<td><span class="ev1-badge ' + oStatus(o) + '">' + oStatus(o) + '</span></td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="5" style="text-align:center;padding:30px;color:#52525b">Nessun incasso in sospeso</td></tr>';

    section.innerHTML =
      '<div class="ev1-section-header">' +
        '<div><div class="ev1-section-title">💰 Finance & Fiscal</div><div class="ev1-section-sub">P&L · Scadenziario · Margini</div></div>' +
        '<div class="ev1-section-actions">' +
          '<button class="ev1-btn ev1-btn-secondary" onclick="ev1ExportPL()">📥 Export P&L</button>' +
        '</div>' +
      '</div>' +
      /* KPI strip */
      '<div class="ev1-kpi-row cols-4" style="margin-bottom:20px">' +
        kpiCard('📈', 'Fatturato 4 mesi', fmt(totRev), totRev > 0 ? 'up' : 'flat', '', 80) +
        kpiCard('💸', 'Costi 4 mesi', fmt(totCosts), totCosts > totRev*0.6 ? 'down' : 'flat', '', Math.min(totCosts/Math.max(totRev,1)*100,100)) +
        kpiCard('🏆', 'Margine Netto', fmt(totMargin), totMargin >= 0 ? 'up' : 'down', '', Math.max(marginPct,0)) +
        kpiCard('📊', 'Margine %', marginPct + '%', marginPct >= 30 ? 'up' : marginPct >= 10 ? 'flat' : 'down', '', Math.max(marginPct,0)) +
      '</div>' +
      /* P&L */
      '<div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:12px">📊 Conto Economico</div>' +
      '<div class="ev1-table-wrap" style="margin-bottom:24px">' +
        '<table class="ev1-table"><thead><tr><th>Mese</th><th style="color:#22c55e">Ricavi</th><th style="color:#ef4444">Costi</th><th>Margine</th><th>%</th></tr></thead>' +
        '<tbody>' + plRows + '</tbody>' +
        '<tfoot style="background:rgba(251,191,36,.05)"><tr>' +
          '<td><strong>TOTALE</strong></td>' +
          '<td style="color:#22c55e;font-weight:800">' + fmt(totRev) + '</td>' +
          '<td style="color:#ef4444;font-weight:700">' + fmt(totCosts) + '</td>' +
          '<td style="color:' + (totMargin>=0?'#22c55e':'#ef4444') + ';font-weight:800">' + fmt(totMargin) + '</td>' +
          '<td style="font-weight:800">' + marginPct + '%</td>' +
        '</tr></tfoot>' +
        '</table>' +
      '</div>' +
      /* Scadenziario */
      '<div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:12px">⏳ Incassi in Sospeso</div>' +
      '<div class="ev1-table-wrap">' +
        '<table class="ev1-table"><thead><tr><th>Cliente</th><th>Lavoro</th><th>Importo</th><th>Scadenza</th><th>Stato</th></tr></thead>' +
        '<tbody>' + toPayRows + '</tbody></table>' +
      '</div>';
  }

  window.ev1ExportPL = function () {
    var orders = getOrders();
    var rows = [['Cliente','Data','Importo','Stato']];
    orders.forEach(function (o) { rows.push([oClient(o), oDate(o), oAmt(o), oStatus(o)]); });
    var csv = rows.map(function(r){return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
    var a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,﻿' + encodeURIComponent(csv);
    a.download = 'ingly-pl-' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    toast('Export P&L completato', 'success');
  };

  /* ─────────────────────────────────────────────────
     MODAL HELPERS
  ───────────────────────────────────────────────── */
  function openModal(id, title, bodyHTML, onSave) {
    var existing = $id(id);
    if (existing) existing.remove();

    var overlay = ce('div', 'ev1-modal-overlay');
    overlay.id = id;
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(id); });

    var modal = ce('div', 'ev1-modal');
    modal.innerHTML =
      '<div class="ev1-modal-header">' +
        '<div class="ev1-modal-title">' + title + '</div>' +
        '<button class="ev1-modal-close" onclick="closeModal(\'' + id + '\')">&times;</button>' +
      '</div>' +
      '<div class="ev1-modal-body">' + bodyHTML + '</div>' +
      '<div class="ev1-modal-footer">' +
        '<button class="ev1-btn ev1-btn-secondary" onclick="closeModal(\'' + id + '\')">Annulla</button>' +
        '<button class="ev1-btn ev1-btn-primary" id="' + id + '-save">Salva</button>' +
      '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    $id(id + '-save').addEventListener('click', function () {
      var result = onSave();
      if (result !== false) { /* modal closes inside onSave */ }
    });

    requestAnimationFrame(function () { overlay.style.opacity = '1'; });
  }

  window.closeModal = function (id) {
    var el = $id(id);
    if (el) { el.style.opacity = '0'; setTimeout(function () { el && el.remove(); }, 200); }
  };

  function openSimpleConfirm(msg, onYes) {
    openModal('ev1-confirm-modal', '⚠️ Conferma',
      '<p style="color:#a1a1aa;font-size:14px;line-height:1.6">' + msg + '</p>',
      function () {
        closeModal('ev1-confirm-modal');
        onYes && onYes();
      }
    );
  }

  /* ─────────────────────────────────────────────────
     NAV HOOK — trigger builds on navigate
  ───────────────────────────────────────────────── */
  function hookNav() {
    if (window._proxEV1NavHooked) return;
    if (typeof App === 'undefined' || !App.navigate) return;
    var _orig = App.navigate;
    App.navigate = function (section) {
      var r = _orig.apply(this, arguments);
      setTimeout(function () { dispatch(section); }, 80);
      return r;
    };
    window._proxEV1NavHooked = true;
  }

  function dispatch(id) {
    if (id === 'dashboard')         buildDashboard();
    if (id === 'gestione_ordini')   buildOrdini();
    if (id === 'clients')           buildCRM();
    if (id === 'fiscal')            buildFiscal();
  }

  /* ─────────────────────────────────────────────────
     BOOT
  ───────────────────────────────────────────────── */
  function boot() {
    injectCSS();

    function init() {
      hookNav();
      /* Build active section */
      var active = document.querySelector('.section-view.active');
      if (active) {
        var id = active.id.replace('view-', '');
        setTimeout(function () { dispatch(id); }, 200);
      }
      /* Pre-build all critical sections */
      setTimeout(function () { buildDashboard(); buildOrdini(); buildCRM(); buildFiscal(); }, 600);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 300); });
    } else {
      setTimeout(init, 300);
    }
  }

  setTimeout(boot, 5200);

})();

