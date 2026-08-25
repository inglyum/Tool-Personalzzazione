
/* ═══════════════════════════════════════════════════════════════════
   INGLY ENTERPRISE V2 — Finance Command Center
   Finance Pro · Cashflow 90gg · Costi Fissi · Break-even · AI Advisor
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window._inglyEV2) return;
  window._inglyEV2 = true;

  /* ── Storage ── */
  var ST = {
    get: function (k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (_) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  };

  /* ── Utils ── */
  function $id(id) { return document.getElementById(id); }
  function ce(tag, cls, html) { var el = document.createElement(tag); if (cls) el.className = cls; if (html != null) el.innerHTML = html; return el; }
  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(n, d) { d = d == null ? 0 : d; return '€' + (+n || 0).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function fmtPct(n) { return (Math.round(+n || 0)) + '%'; }
  function dtIT(d) { try { var x = new Date(d); return isNaN(x) ? '—' : x.toLocaleDateString('it-IT'); } catch (_) { return '—'; } }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ── Data ── */
  function getOrders()  { return ST.get('ingly_orders', []); }
  function getSales()   { return ST.get('ingly_sales', []); }
  function getCosts()   { return ST.get('ev2_fixed_costs', []); }
  function saveCosts(v) { ST.set('ev2_fixed_costs', v); }
  function getBank()    { return ST.get('ev2_bank_balance', 0); }
  function saveBank(v)  { ST.set('ev2_bank_balance', v); }
  function oAmt(o)      { return +(o.total || o.totalPrice || o.amount || o.totale || 0); }
  function oDate(o)     { return o.date || o.createdAt || o.data || ''; }
  function oDeadline(o) { return o.deadline || o.dataConsegna || o.dueDate || ''; }
  function oStatus(o) {
    var s = (o.status || o.stato || '').toLowerCase();
    if (s.includes('produz') || s.includes('lavoraz') || s.includes('in corso')) return 'produzione';
    if (s.includes('consegn') || s.includes('completat')) return 'completato';
    if (s.includes('pagat') || s.includes('paid')) return 'pagato';
    if (s.includes('annull') || s.includes('cancel')) return 'annullato';
    return 'attesa';
  }
  function oClient(o) { return o.client || o.clientName || o.cliente || o.name || 'Cliente'; }

  /* ── Monthly revenue from orders ── */
  function monthlyRevenue(offsetMonths) {
    var orders = getOrders(); var sales = getSales();
    var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - offsetMonths);
    var mStart = new Date(d); var mEnd = new Date(d); mEnd.setMonth(mEnd.getMonth() + 1);
    var fromOrders = orders.filter(function (o) { var dt = new Date(oDate(o)); return dt >= mStart && dt < mEnd; })
      .reduce(function (s, o) { return s + oAmt(o); }, 0);
    var fromSales  = sales.filter(function (s) { var dt = new Date(s.date || s.data || ''); return dt >= mStart && dt < mEnd; })
      .reduce(function (s2, s) { return s2 + +(s.amount || s.importo || 0); }, 0);
    return Math.max(fromOrders, fromSales);
  }

  /* ── Monthly fixed costs total ── */
  function monthlyFixedCosts() {
    return getCosts().filter(function (c) { return c.active !== false; })
      .reduce(function (s, c) { return s + +(c.amount || 0); }, 0);
  }

  /* ── CSS ── */
  function injectCSS() {
    if ($id('ev2-css')) return;
    var s = document.createElement('style');
    s.id = 'ev2-css';
    s.textContent = `

/* ══ Finance KPI grid ══ */
.ev2-fin-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; margin-bottom: 24px; }
@media(max-width:1100px) { .ev2-fin-grid { grid-template-columns: repeat(3,1fr); } }
@media(max-width:700px)  { .ev2-fin-grid { grid-template-columns: repeat(2,1fr); } }

/* ══ Section card ══ */
.ev2-card {
  background: var(--bg-card); border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px; padding: 20px; margin-bottom: 20px;
}
.ev2-card-title {
  font-size: 13px; font-weight: 700; color: #fff;
  margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
}
.ev2-card-sub { font-size: 11px; color: #71717a; margin-left: auto; font-weight: 400; }

/* ══ P&L table ══ */
.ev2-pl-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.ev2-pl-table th {
  background: rgba(255,255,255,.03); padding: 9px 14px;
  text-align: left; font-size: 10px; color: #52525b;
  text-transform: uppercase; letter-spacing: .6px; font-weight: 700;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.ev2-pl-table td { padding: 10px 14px; border-top: 1px solid rgba(255,255,255,.04); vertical-align: middle; }
.ev2-pl-table .ev2-pl-total td { background: rgba(251,191,36,.05); font-weight: 700; border-top: 2px solid rgba(251,191,36,.2); }
.ev2-pl-table .row-costs td { color: #ef4444; }
.ev2-pl-table .row-margin td { color: #22c55e; font-weight: 700; }
.ev2-pl-table tr:hover td { background: rgba(255,255,255,.02); }

/* ══ Cashflow chart ══ */
.ev2-cf-chart { display: grid; gap: 0; border: 1px solid rgba(255,255,255,.07); border-radius: 12px; overflow: hidden; }
.ev2-cf-row {
  display: grid; grid-template-columns: 100px 1fr 90px 90px 100px;
  padding: 10px 14px; align-items: center; gap: 12px;
  border-bottom: 1px solid rgba(255,255,255,.04); font-size: 12px;
}
.ev2-cf-row:last-child { border-bottom: none; }
.ev2-cf-row:hover { background: rgba(255,255,255,.02); }
.ev2-cf-row.header {
  background: rgba(255,255,255,.03); font-size: 10px; font-weight: 700;
  color: #52525b; text-transform: uppercase; letter-spacing: .6px;
}
.ev2-cf-bar-wrap { position: relative; height: 8px; background: rgba(255,255,255,.06); border-radius: 99px; overflow: hidden; }
.ev2-cf-bar-in  { position: absolute; top:0; left:0; height: 100%; background: #22c55e; border-radius: 99px; }
.ev2-cf-bar-out { position: absolute; top:0; left:0; height: 100%; background: #ef4444; border-radius: 99px; }
.ev2-cf-saldo { font-weight: 700; }
.ev2-cf-saldo.pos { color: #22c55e; }
.ev2-cf-saldo.neg { color: #ef4444; }

/* ══ Break-even gauge ══ */
.ev2-gauge-wrap {
  display: flex; align-items: center; gap: 20px; padding: 16px;
  background: rgba(255,255,255,.03); border-radius: 12px; margin-bottom: 16px;
}
.ev2-gauge-ring { position: relative; width: 80px; height: 80px; flex-shrink: 0; }
.ev2-gauge-ring svg { transform: rotate(-90deg); }
.ev2-gauge-pct { position: absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; color:#fff; }
.ev2-gauge-text { flex: 1; }
.ev2-gauge-title { font-size:14px; font-weight:700; color:#fff; margin-bottom:4px; }
.ev2-gauge-sub { font-size:12px; color:#71717a; line-height:1.5; }

/* ══ Cost category chip ══ */
.ev2-cost-cat {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: 99px; font-size: 11px; font-weight: 600;
}
.ev2-cost-cat.affitto    { background:rgba(239,68,68,.1); color:#ef4444; }
.ev2-cost-cat.utenze     { background:rgba(251,191,36,.1); color:#fbbf24; }
.ev2-cost-cat.macchinari { background:rgba(59,130,246,.1); color:#60a5fa; }
.ev2-cost-cat.abbonamenti { background:rgba(168,85,247,.1); color:#c084fc; }
.ev2-cost-cat.marketing  { background:rgba(34,197,94,.1); color:#22c55e; }
.ev2-cost-cat.personale  { background:rgba(251,146,60,.1); color:#fb923c; }
.ev2-cost-cat.altro      { background:rgba(255,255,255,.06); color:#71717a; }

/* ══ Toggle switch ══ */
.ev2-toggle { position:relative; display:inline-block; width:36px; height:20px; }
.ev2-toggle input { opacity:0; width:0; height:0; }
.ev2-toggle-slider {
  position:absolute; inset:0; border-radius:99px;
  background:rgba(255,255,255,.1); cursor:pointer; transition:.2s;
}
.ev2-toggle input:checked + .ev2-toggle-slider { background:#22c55e; }
.ev2-toggle-slider:before {
  content:''; position:absolute; height:14px; width:14px;
  left:3px; top:3px; background:#fff; border-radius:50%; transition:.2s;
}
.ev2-toggle input:checked + .ev2-toggle-slider:before { transform:translateX(16px); }

/* ══ AI box (reuse ev1 if loaded, else define) ══ */
.ev2-ai-box {
  background: rgba(251,191,36,.05); border: 1px solid rgba(251,191,36,.15);
  border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;
}
.ev2-ai-header { font-size:12px; font-weight:700; color:#fbbf24; margin-bottom:8px; display:flex; align-items:center; gap:6px; }
.ev2-ai-line { font-size:12px; color:#a1a1aa; padding:5px 0; border-bottom:1px solid rgba(255,255,255,.04); line-height:1.6; }
.ev2-ai-line:last-child { border-bottom:none; }
.ev2-ai-line strong { color:#e5e5e5; }

/* ══ Two-col layout ══ */
.ev2-two-col { display:grid; grid-template-columns:1fr 320px; gap:18px; }
@media(max-width:1000px) { .ev2-two-col { grid-template-columns:1fr; } }

/* ══ Category donut ══ */
.ev2-donut-wrap { display:flex; align-items:center; gap:20px; }
.ev2-donut-legend { display:flex; flex-direction:column; gap:8px; }
.ev2-donut-row { display:flex; align-items:center; gap:8px; font-size:12px; color:#a1a1aa; }
.ev2-donut-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }

/* ══ Number big ══ */
.ev2-big-num { font-size:28px; font-weight:800; color:#fff; line-height:1; }
.ev2-big-label { font-size:11px; color:#71717a; margin-top:4px; }

/* ══ Progress bar ══ */
.ev2-prog { background:rgba(255,255,255,.06); border-radius:99px; height:6px; overflow:hidden; }
.ev2-prog-fill { height:100%; border-radius:99px; transition:width .6s; }
`;
    document.head.appendChild(s);
  }

  /* ── Toast (reuse ev1 if present, else define) ── */
  function toast(msg, type) {
    if (window._ev1Toast) { window._ev1Toast(msg, type); return; }
    var c = $id('ev1-toast') || $id('ev2-toast');
    if (!c) { c = ce('div'); c.id = 'ev2-toast'; c.style.cssText = 'position:fixed;bottom:80px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px'; document.body.appendChild(c); }
    var item = ce('div');
    item.style.cssText = 'background:#18181b;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:11px 16px;font-size:13px;color:#e5e5e5;box-shadow:0 8px 30px rgba(0,0,0,.6);min-width:240px;border-left:3px solid ' + (type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#fbbf24');
    item.textContent = (type === 'success' ? '✓ ' : type === 'error' ? '✗ ' : '◆ ') + msg;
    c.appendChild(item);
    setTimeout(function () { item.style.opacity = '0'; item.style.transition = '.3s'; setTimeout(function () { item.remove(); }, 300); }, 2500);
  }

  /* ── KPI card helper (reuse ev1 if present) ── */
  function kpiCard(icon, label, val, trend, pct) {
    var trendHTML = trend ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:' + (trend === 'up' ? 'rgba(34,197,94,.15)' : trend === 'down' ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.06)') + ';color:' + (trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#71717a') + '">' + (trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—') + '</span>' : '';
    return '<div class="ev1-kpi" style="background:var(--bg-card);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:16px 18px">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px"><span style="font-size:18px;opacity:.5">' + icon + '</span>' + trendHTML + '</div>' +
      '<div style="font-size:24px;font-weight:800;color:#fff;line-height:1;margin-bottom:4px">' + val + '</div>' +
      '<div style="font-size:11px;color:#71717a">' + label + '</div>' +
      (pct != null ? '<div style="background:rgba(255,255,255,.06);border-radius:99px;height:3px;overflow:hidden;margin-top:12px"><div style="height:100%;border-radius:99px;background:#fbbf24;width:' + Math.max(0, Math.min(100, pct)) + '%"></div></div>' : '') +
    '</div>';
  }

  /* ── Modal (reuse ev1 closeModal if loaded) ── */
  function openModal(id, title, bodyHTML, onSave) {
    var ex = $id(id); if (ex) ex.remove();
    var overlay = document.createElement('div');
    overlay.id = id;
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(id); });
    var modal = document.createElement('div');
    modal.style.cssText = 'background:#111113;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:600px;max-height:90vh;overflow-y:auto;box-shadow:0 30px 100px rgba(0,0,0,.8)';
    modal.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.07)">' +
        '<div style="font-size:16px;font-weight:700;color:#fff">' + title + '</div>' +
        '<button onclick="(window.closeModal||function(i){var e=document.getElementById(i);if(e)e.remove()})(\'' + id + '\')" style="background:none;border:none;color:#71717a;cursor:pointer;font-size:20px;padding:2px 6px">&times;</button>' +
      '</div>' +
      '<div style="padding:20px">' + bodyHTML + '</div>' +
      '<div style="padding:14px 20px;border-top:1px solid rgba(255,255,255,.07);display:flex;justify-content:flex-end;gap:8px">' +
        '<button onclick="(window.closeModal||function(i){var e=document.getElementById(i);if(e)e.remove()})(\'' + id + '\')" style="padding:7px 16px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#a1a1aa;cursor:pointer;font-size:12px;font-weight:600">Annulla</button>' +
        '<button id="' + id + '-save" style="padding:7px 16px;border-radius:8px;border:none;background:#fbbf24;color:#000;cursor:pointer;font-size:12px;font-weight:700">Salva</button>' +
      '</div>';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    $id(id + '-save').addEventListener('click', function () { onSave(); });
  }

  function closeModal(id) {
    if (window.closeModal && window.closeModal !== closeModal) { window.closeModal(id); return; }
    var el = $id(id); if (el) { el.style.opacity = '0'; setTimeout(function () { el && el.remove(); }, 200); }
  }

  /* ── input helper ── */
  function inp(id) { var el = $id(id); return el ? el.value.trim() : ''; }

  /* ═══════════════════════════════════════════════════
     1. FINANCE COMMAND CENTER  →  view-finance
  ═══════════════════════════════════════════════════ */
  function buildFinance() {
    var section = $id('view-finance');
    if (!section || section._ev2FinanceBuilt) return;
    section._ev2FinanceBuilt = true;
    renderFinance();
  }

  function renderFinance() {
    var section = $id('view-finance');
    if (!section) return;

    /* Build 6-month P&L */
    var MONTHS = 6;
    var plData = [];
    var labels = [];
    for (var i = MONTHS - 1; i >= 0; i--) {
      var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      var rev = monthlyRevenue(i);
      var fixedC = monthlyFixedCosts();
      var variableEst = rev * 0.35; // estimated COGS 35%
      var grossMargin = rev - variableEst;
      var netMargin = grossMargin - fixedC;
      plData.push({ rev: rev, variable: variableEst, gross: grossMargin, fixed: fixedC, net: netMargin });
      labels.push(d.toLocaleDateString('it-IT', { month: 'short' }));
    }

    var totRev      = plData.reduce(function (s, m) { return s + m.rev; }, 0);
    var totVariable = plData.reduce(function (s, m) { return s + m.variable; }, 0);
    var totGross    = plData.reduce(function (s, m) { return s + m.gross; }, 0);
    var totFixed    = plData.reduce(function (s, m) { return s + m.fixed; }, 0);
    var totNet      = plData.reduce(function (s, m) { return s + m.net; }, 0);
    var netPct      = totRev > 0 ? Math.round(totNet / totRev * 100) : 0;
    var grossPct    = totRev > 0 ? Math.round(totGross / totRev * 100) : 0;

    /* Revenue breakdown by category from orders */
    var orders = getOrders();
    var cats = { 'Laser': 0, 'DTF': 0, 'Sublimazione': 0, 'B2B': 0, 'Altro': 0 };
    orders.forEach(function (o) {
      var d = (o.description || o.desc || o.tipo || o.category || '').toLowerCase();
      var amt = oAmt(o);
      if (d.includes('laser'))       cats['Laser'] += amt;
      else if (d.includes('dtf'))    cats['DTF'] += amt;
      else if (d.includes('sub'))    cats['Sublimazione'] += amt;
      else if (d.includes('b2b') || d.includes('azien')) cats['B2B'] += amt;
      else                           cats['Altro'] += amt;
    });
    var totCat = Object.values(cats).reduce(function (s, v) { return s + v; }, 0) || 1;
    var CAT_COLORS = { 'Laser': '#fbbf24', 'DTF': '#60a5fa', 'Sublimazione': '#c084fc', 'B2B': '#22c55e', 'Altro': '#71717a' };

    /* AI insights */
    var insights = [];
    if (netPct < 0)       insights.push('<strong>🔴 Margine netto negativo (' + netPct + '%)</strong> — copertura costi fissi insufficiente. Rivedere pricing o ridurre spese fisse.');
    else if (netPct < 15) insights.push('<strong>⚠️ Margine netto basso (' + netPct + '%)</strong> — target sano: 20-30%. Valutare aumento prezzi medi o riduzione COGS.');
    else                  insights.push('<strong>✅ Margine netto ' + netPct + '%</strong> — performance finanziaria nella fascia sana (target: >20%).');
    if (totFixed > totRev * 0.3)    insights.push('<strong>💸 Costi fissi elevati</strong> — rappresentano il ' + Math.round(totFixed/totRev*100) + '% del fatturato. Analizzare abbonamenti e utenze.');
    var topCat = Object.entries(cats).sort(function (a, b) { return b[1] - a[1]; })[0];
    if (topCat && topCat[1] > 0) insights.push('<strong>📊 Categoria top: ' + topCat[0] + '</strong> — genera ' + fmt(topCat[1]) + ' (' + Math.round(topCat[1]/totCat*100) + '% del fatturato).');
    var thisMonth = plData[5]; var lastMonth = plData[4];
    if (lastMonth.rev > 0) {
      var mo_delta = Math.round((thisMonth.rev - lastMonth.rev) / lastMonth.rev * 100);
      insights.push('<strong>' + (mo_delta >= 0 ? '▲' : '▼') + Math.abs(mo_delta) + '% vs mese scorso</strong> — da ' + fmt(lastMonth.rev) + ' a ' + fmt(thisMonth.rev) + '.');
    }

    /* P&L table rows */
    var plRows = plData.map(function (m, i) {
      var netColor = m.net >= 0 ? '#22c55e' : '#ef4444';
      var netPctM  = m.rev > 0 ? Math.round(m.net / m.rev * 100) : 0;
      return '<tr>' +
        '<td><strong>' + labels[i] + '</strong></td>' +
        '<td style="color:#22c55e;font-weight:700">' + fmt(m.rev) + '</td>' +
        '<td style="color:#a1a1aa">' + fmt(m.variable) + '</td>' +
        '<td style="color:#e5e5e5">' + fmt(m.gross) + '</td>' +
        '<td style="color:#ef4444">' + fmt(m.fixed) + '</td>' +
        '<td style="color:' + netColor + ';font-weight:700">' + fmt(m.net) + '</td>' +
        '<td><span style="color:' + (netPctM >= 20 ? '#22c55e' : netPctM >= 5 ? '#fbbf24' : '#ef4444') + ';font-weight:700">' + netPctM + '%</span></td>' +
      '</tr>';
    }).join('');

    /* Donut SVG for categories */
    var donutR = 40; var circumf = 2 * Math.PI * donutR;
    var catEntries = Object.entries(cats).filter(function (e) { return e[1] > 0; });
    var offset = 0;
    var donutSegs = catEntries.map(function (e) {
      var pct = e[1] / totCat; var dash = pct * circumf; var gap = circumf - dash;
      var seg = '<circle cx="50" cy="50" r="' + donutR + '" fill="none" stroke="' + CAT_COLORS[e[0]] + '" stroke-width="10" stroke-dasharray="' + dash.toFixed(1) + ' ' + gap.toFixed(1) + '" stroke-dashoffset="' + (-offset).toFixed(1) + '" transform="rotate(-90,50,50)"/>';
      offset += dash;
      return seg;
    }).join('');
    var donutSVG = '<svg width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="10"/>' + donutSegs + '</svg>';
    var donutLegend = catEntries.map(function (e) {
      return '<div class="ev2-donut-row"><div class="ev2-donut-dot" style="background:' + CAT_COLORS[e[0]] + '"></div><span>' + e[0] + '</span><span style="margin-left:auto;font-weight:700;color:#e5e5e5">' + Math.round(e[1]/totCat*100) + '%</span></div>';
    }).join('');

    /* Chart bars */
    var maxRev = Math.max.apply(null, plData.map(function(m){return m.rev;})) || 1;
    var chartBars = plData.map(function (m, i) {
      var hRev = Math.round(m.rev / maxRev * 100);
      var hNet = m.net > 0 ? Math.round(m.net / maxRev * 100) : 0;
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">' +
        '<div style="font-size:9px;color:#52525b">' + (m.rev > 0 ? fmt(m.rev) : '') + '</div>' +
        '<div style="flex:1;display:flex;align-items:flex-end;width:100%;gap:2px">' +
          '<div style="flex:1;background:rgba(251,191,36,.35);border-radius:4px 4px 0 0;height:' + Math.max(hRev, 2) + '%" title="Fatturato ' + fmt(m.rev) + '"></div>' +
          '<div style="flex:1;background:' + (hNet > 0 ? 'rgba(34,197,94,.5)' : 'rgba(239,68,68,.4)') + ';border-radius:4px 4px 0 0;height:' + Math.max(hNet, 1) + '%" title="Margine ' + fmt(m.net) + '"></div>' +
        '</div>' +
        '<div style="font-size:9px;color:#52525b">' + labels[i] + '</div>' +
      '</div>';
    }).join('');

    section.innerHTML =
      '<div class="ev1-section-header" style="margin-bottom:20px">' +
        '<div><div class="ev1-section-title">💼 Finance Command Center</div><div class="ev1-section-sub">P&L · Margini · Breakdown categoria · AI Financial Advisor</div></div>' +
        '<div class="ev1-section-actions">' +
          '<button class="ev1-btn ev1-btn-secondary" onclick="ev2ExportFinance()">📥 Export P&L CSV</button>' +
        '</div>' +
      '</div>' +

      /* KPI strip */
      '<div class="ev2-fin-grid">' +
        kpiCard('📈', 'Fatturato 6m', fmt(totRev), totRev > 0 ? 'up' : 'flat', 80) +
        kpiCard('🏭', 'Margine Lordo', fmt(totGross), grossPct >= 50 ? 'up' : 'flat', grossPct) +
        kpiCard('💸', 'Costi Fissi 6m', fmt(totFixed), totFixed > totRev * 0.3 ? 'down' : 'flat', Math.min(totFixed/Math.max(totRev,1)*100,100)) +
        kpiCard('🏆', 'Margine Netto', fmt(totNet), totNet >= 0 ? 'up' : 'down', Math.max(netPct, 0)) +
        kpiCard('📊', 'Margine %', netPct + '%', netPct >= 20 ? 'up' : netPct >= 5 ? 'flat' : 'down', Math.max(netPct, 0)) +
      '</div>' +

      /* AI insights */
      '<div class="ev2-ai-box">' +
        '<div class="ev2-ai-header">🤖 AI Financial Advisor</div>' +
        insights.map(function (i) { return '<div class="ev2-ai-line">' + i + '</div>'; }).join('') +
      '</div>' +

      /* Chart + Donut */
      '<div class="ev2-two-col" style="margin-bottom:20px">' +
        '<div class="ev2-card" style="margin-bottom:0">' +
          '<div class="ev2-card-title">📊 Andamento 6 Mesi <span class="ev2-card-sub">🟡 Fatturato &nbsp; 🟢 Margine</span></div>' +
          '<div style="display:flex;align-items:flex-end;gap:6px;height:120px;padding:0 4px">' + chartBars + '</div>' +
        '</div>' +
        '<div class="ev2-card" style="margin-bottom:0">' +
          '<div class="ev2-card-title">🏷 Breakdown Categoria</div>' +
          (catEntries.length
            ? '<div class="ev2-donut-wrap"><div>' + donutSVG + '</div><div class="ev2-donut-legend">' + donutLegend + '</div></div>'
            : '<div style="text-align:center;padding:20px;color:#52525b;font-size:12px">Nessun dato — aggiungi ordini con descrizione</div>'
          ) +
        '</div>' +
      '</div>' +

      /* P&L table */
      '<div class="ev2-card">' +
        '<div class="ev2-card-title">📋 Conto Economico Mensile</div>' +
        '<div style="overflow-x:auto"><table class="ev2-pl-table">' +
          '<thead><tr><th>Mese</th><th style="color:#22c55e">Ricavi</th><th>Costi Var. (est.)</th><th>Margine Lordo</th><th style="color:#ef4444">Costi Fissi</th><th>Margine Netto</th><th>%</th></tr></thead>' +
          '<tbody>' + plRows + '</tbody>' +
          '<tfoot><tr class="ev2-pl-total"><td>TOTALE 6m</td><td style="color:#22c55e">' + fmt(totRev) + '</td><td>' + fmt(totVariable) + '</td><td>' + fmt(totGross) + '</td><td style="color:#ef4444">' + fmt(totFixed) + '</td><td style="color:' + (totNet >= 0 ? '#22c55e' : '#ef4444') + '">' + fmt(totNet) + '</td><td>' + netPct + '%</td></tr></tfoot>' +
        '</table></div>' +
      '</div>';
  }

  window.ev2ExportFinance = function () {
    var MONTHS = 6;
    var rows = [['Mese','Ricavi','Costi Variabili','Margine Lordo','Costi Fissi','Margine Netto','%']];
    for (var i = MONTHS - 1; i >= 0; i--) {
      var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      var rev = monthlyRevenue(i); var fixed = monthlyFixedCosts(); var varC = rev * 0.35;
      var gross = rev - varC; var net = gross - fixed; var pct = rev > 0 ? Math.round(net/rev*100) : 0;
      var label = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
      rows.push([label, rev.toFixed(2), varC.toFixed(2), gross.toFixed(2), fixed.toFixed(2), net.toFixed(2), pct + '%']);
    }
    var csv = rows.map(function(r){return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
    var a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,﻿' + encodeURIComponent(csv);
    a.download = 'ingly-finance-' + new Date().toISOString().slice(0,7) + '.csv'; a.click();
    toast('Export Finance completato', 'success');
  };

  /* ═══════════════════════════════════════════════════
     2. CASHFLOW 90 GIORNI  →  view-cashflow
  ═══════════════════════════════════════════════════ */
  function buildCashflow() {
    var section = $id('view-cashflow');
    if (!section || section._ev2CashBuilt) return;
    section._ev2CashBuilt = true;
    renderCashflow();
  }

  function renderCashflow() {
    var section = $id('view-cashflow');
    if (!section) return;

    var bankBal = getBank();
    var orders  = getOrders();
    var fixedC  = monthlyFixedCosts();

    /* Build 90-day weekly projection */
    var WEEKS = 13;
    var rows = [];
    var runningBal = bankBal;
    var now = new Date();

    for (var w = 0; w < WEEKS; w++) {
      var wStart = new Date(now.getTime() + w * 7 * 86400000);
      var wEnd   = new Date(wStart.getTime() + 7 * 86400000);
      var label  = wStart.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });

      /* Expected inflows: orders with deadline in this week */
      var inflow = orders.filter(function (o) {
        var dl = new Date(oDeadline(o) || oDate(o));
        var s = oStatus(o);
        return dl >= wStart && dl < wEnd && s !== 'annullato' && s !== 'pagato';
      }).reduce(function (s, o) { return s + oAmt(o); }, 0);

      /* Weekly share of monthly fixed costs */
      var outflow = fixedC / 4.33;

      runningBal = runningBal + inflow - outflow;
      rows.push({ label: label, inflow: inflow, outflow: outflow, bal: runningBal, week: w + 1 });
    }

    /* Alerts */
    var negWeeks = rows.filter(function (r) { return r.bal < 0; });
    var minBal   = Math.min.apply(null, rows.map(function (r) { return r.bal; }));
    var maxBal   = Math.max.apply(null, rows.map(function (r) { return r.bal; }));

    /* AI insights */
    var insights = [];
    if (negWeeks.length) insights.push('<strong>🔴 ALERT: Saldo negativo in ' + negWeeks.length + ' settimane</strong> — prima settimana critica: ' + negWeeks[0].label + '. Accelerare incassi o ridurre uscite.');
    else insights.push('<strong>✅ Cashflow positivo</strong> per tutte le 13 settimane di proiezione.');
    if (fixedC > 0) insights.push('<strong>📅 Costi fissi mensili: ' + fmt(fixedC) + '</strong> — pari a ' + fmt(fixedC / 4.33) + '/settimana di uscita ricorrente.');
    var totalInflow = rows.reduce(function (s, r) { return s + r.inflow; }, 0);
    if (totalInflow > 0) insights.push('<strong>💰 Incassi attesi 90gg: ' + fmt(totalInflow) + '</strong> — da ordini in produzione/attesa.');
    else insights.push('<strong>⚠️ Nessun incasso programmato</strong> — assegnare scadenze agli ordini aperti per proiezione accurata.');

    /* Max for bar scaling */
    var maxFlow = Math.max(maxBal, 1);

    var rowsHTML = rows.map(function (r) {
      var balColor = r.bal >= 0 ? '#22c55e' : '#ef4444';
      var balW = Math.min(Math.abs(r.bal) / maxFlow * 100, 100);
      return '<div class="ev2-cf-row">' +
        '<div style="font-size:12px;color:#a1a1aa">Sett. ' + r.week + '<br><span style="font-size:10px;color:#52525b">' + r.label + '</span></div>' +
        '<div>' +
          '<div class="ev2-cf-bar-wrap"><div class="ev2-cf-bar-in" style="width:' + Math.min(r.inflow / Math.max(maxFlow, 1) * 100, 100) + '%"></div></div>' +
          '<div class="ev2-cf-bar-wrap" style="margin-top:3px"><div class="ev2-cf-bar-out" style="width:' + Math.min(r.outflow / Math.max(maxFlow, 1) * 100, 100) + '%"></div></div>' +
        '</div>' +
        '<div style="font-size:12px;color:#22c55e;text-align:right">' + (r.inflow > 0 ? '+' + fmt(r.inflow) : '—') + '</div>' +
        '<div style="font-size:12px;color:#ef4444;text-align:right">-' + fmt(r.outflow) + '</div>' +
        '<div class="ev2-cf-saldo ' + (r.bal >= 0 ? 'pos' : 'neg') + '" style="text-align:right">' + fmt(r.bal) + '</div>' +
      '</div>';
    }).join('');

    section.innerHTML =
      '<div class="ev1-section-header" style="margin-bottom:20px">' +
        '<div><div class="ev1-section-title">💧 Cashflow 90 Giorni</div><div class="ev1-section-sub">Proiezione settimanale · Saldo attuale: ' + fmt(bankBal) + '</div></div>' +
        '<div class="ev1-section-actions">' +
          '<button class="ev1-btn ev1-btn-secondary" onclick="ev2SetBank()">💳 Aggiorna Saldo</button>' +
        '</div>' +
      '</div>' +

      /* AI box */
      '<div class="ev2-ai-box">' +
        '<div class="ev2-ai-header">🤖 AI Cashflow Sentinel</div>' +
        insights.map(function (i) { return '<div class="ev2-ai-line">' + i + '</div>'; }).join('') +
      '</div>' +

      /* Summary KPIs */
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">' +
        kpiCard('🏦', 'Saldo Attuale', fmt(bankBal), bankBal >= 0 ? 'up' : 'down', null) +
        kpiCard('💰', 'Incassi Attesi 90gg', fmt(rows.reduce(function(s,r){return s+r.inflow;},0)), 'up', null) +
        kpiCard('💸', 'Uscite Previste 90gg', fmt(rows.reduce(function(s,r){return s+r.outflow;},0)), 'flat', null) +
        kpiCard('📉', 'Saldo Min. Previsto', fmt(minBal), minBal >= 0 ? 'up' : 'down', null) +
      '</div>' +

      /* Chart */
      '<div class="ev2-card">' +
        '<div class="ev2-card-title">📅 Proiezione Settimanale — 13 Settimane <span class="ev2-card-sub">🟢 Entrate &nbsp; 🔴 Uscite</span></div>' +
        '<div class="ev2-cf-chart">' +
          '<div class="ev2-cf-row header"><div>Settimana</div><div>Flusso</div><div style="text-align:right">Entrate</div><div style="text-align:right">Uscite</div><div style="text-align:right">Saldo</div></div>' +
          rowsHTML +
        '</div>' +
      '</div>';
  }

  window.ev2SetBank = function () {
    var current = getBank();
    openModal('ev2-bank-modal', '💳 Aggiorna Saldo Bancario',
      '<div style="margin-bottom:16px;color:#a1a1aa;font-size:13px">Inserisci il saldo attuale del tuo conto corrente. Verrà usato come punto di partenza per la proiezione cashflow.</div>' +
      '<div><label class="ev1-label">Saldo attuale €</label><input id="ev2-bank-inp" class="ev1-input" type="number" step="0.01" value="' + current + '" placeholder="Es: 5000"></div>',
      function () {
        var v = parseFloat(inp('ev2-bank-inp'));
        if (isNaN(v)) { toast('Inserisci un importo valido', 'error'); return; }
        saveBank(v);
        closeModal('ev2-bank-modal');
        var s = $id('view-cashflow'); if (s) s._ev2CashBuilt = false;
        renderCashflow();
        toast('Saldo aggiornato: ' + fmt(v), 'success');
      }
    );
  };

  /* ═══════════════════════════════════════════════════
     3. COSTI FISSI  →  view-fixed_costs
  ═══════════════════════════════════════════════════ */
  var COST_CATS = ['Affitto', 'Utenze', 'Macchinari', 'Abbonamenti', 'Marketing', 'Personale', 'Altro'];
  var COST_CAT_ICONS = { 'Affitto':'🏠','Utenze':'⚡','Macchinari':'⚙️','Abbonamenti':'📱','Marketing':'📣','Personale':'👤','Altro':'📦' };

  /* Pre-populate defaults if empty */
  function ensureDefaultCosts() {
    if (getCosts().length > 0) return;
    var defaults = [
      { id: uid(), name: 'Affitto/Capannone',       category: 'Affitto',      amount: 800,  active: true },
      { id: uid(), name: 'Energia elettrica',        category: 'Utenze',       amount: 250,  active: true },
      { id: uid(), name: 'Connessione internet',     category: 'Utenze',       amount: 35,   active: true },
      { id: uid(), name: 'Leasing laser CO2',        category: 'Macchinari',   amount: 300,  active: true },
      { id: uid(), name: 'Software gestionale',      category: 'Abbonamenti',  amount: 50,   active: true },
      { id: uid(), name: 'Adobe Creative Cloud',     category: 'Abbonamenti',  amount: 55,   active: true },
      { id: uid(), name: 'Marketing social/Google',  category: 'Marketing',    amount: 150,  active: true },
      { id: uid(), name: 'Assicurazione artigianale',category: 'Altro',        amount: 80,   active: true },
      { id: uid(), name: 'Commercialista',           category: 'Altro',        amount: 100,  active: true },
    ];
    saveCosts(defaults);
  }

  function buildFixedCosts() {
    var section = $id('view-fixed_costs');
    if (!section || section._ev2CostsBuilt) return;
    section._ev2CostsBuilt = true;
    ensureDefaultCosts();
    renderFixedCosts();
  }

  function renderFixedCosts() {
    var section = $id('view-fixed_costs');
    if (!section) return;

    var costs = getCosts();
    var active = costs.filter(function (c) { return c.active !== false; });
    var totalM  = active.reduce(function (s, c) { return s + +(c.amount || 0); }, 0);
    var totalY  = totalM * 12;

    /* Break-even calc */
    var avgRev = (function () {
      var sum = 0; var cnt = 0;
      for (var i = 0; i < 3; i++) { var r = monthlyRevenue(i); if (r > 0) { sum += r; cnt++; } }
      return cnt > 0 ? sum / cnt : 0;
    })();
    var variableRatio = 0.35;
    var contribution = avgRev * (1 - variableRatio);
    var beNeeded = totalM / (1 - variableRatio);
    var beCoverage = avgRev > 0 ? Math.min(Math.round(avgRev / beNeeded * 100), 100) : 0;

    /* By category */
    var byCat = {};
    COST_CATS.forEach(function (c) { byCat[c] = 0; });
    active.forEach(function (c) { byCat[c.category] = (byCat[c.category] || 0) + +(c.amount || 0); });
    var catBars = COST_CATS.filter(function (c) { return byCat[c] > 0; }).map(function (c) {
      var pct = totalM > 0 ? Math.round(byCat[c] / totalM * 100) : 0;
      return '<div style="margin-bottom:10px">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:4px">' +
          '<span style="font-size:12px;color:#a1a1aa">' + COST_CAT_ICONS[c] + ' ' + c + '</span>' +
          '<span style="font-size:12px;font-weight:700;color:#e5e5e5">' + fmt(byCat[c]) + ' <span style="color:#52525b;font-weight:400">(' + pct + '%)</span></span>' +
        '</div>' +
        '<div class="ev2-prog"><div class="ev2-prog-fill" style="width:' + pct + '%;background:' + catColor(c) + '"></div></div>' +
      '</div>';
    }).join('');

    /* Cost rows */
    var costRows = costs.map(function (c) {
      var cat = c.category || 'Altro';
      var isActive = c.active !== false;
      return '<tr style="opacity:' + (isActive ? '1' : '.4') + '">' +
        '<td>' +
          '<label class="ev2-toggle"><input type="checkbox" ' + (isActive ? 'checked' : '') + ' onchange="ev2ToggleCost(\'' + c.id + '\',this.checked)"><span class="ev2-toggle-slider"></span></label>' +
        '</td>' +
        '<td><strong style="color:#e5e5e5">' + esc(c.name) + '</strong></td>' +
        '<td><span class="ev2-cost-cat ' + cat.toLowerCase() + '">' + COST_CAT_ICONS[cat] + ' ' + cat + '</span></td>' +
        '<td style="font-weight:700;color:#ef4444">' + fmt(+(c.amount || 0)) + '</td>' +
        '<td style="color:#71717a">' + fmt(+(c.amount || 0) * 12) + '/anno</td>' +
        '<td><div style="display:flex;gap:4px">' +
          '<button class="ev1-btn-icon" onclick="ev2EditCost(\'' + c.id + '\')">✏️</button>' +
          '<button class="ev1-btn-icon" onclick="ev2DeleteCost(\'' + c.id + '\')">🗑</button>' +
        '</div></td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="6" style="text-align:center;padding:30px;color:#52525b">Nessun costo inserito</td></tr>';

    /* Gauge SVG */
    var gaugeCircumf = 2 * Math.PI * 36;
    var gaugeDash = beCoverage / 100 * gaugeCircumf;
    var gaugeColor = beCoverage >= 100 ? '#22c55e' : beCoverage >= 70 ? '#fbbf24' : '#ef4444';

    section.innerHTML =
      '<div class="ev1-section-header" style="margin-bottom:20px">' +
        '<div><div class="ev1-section-title">💸 Costi Fissi Mensili</div><div class="ev1-section-sub">Gestione spese ricorrenti · Break-even analysis</div></div>' +
        '<div class="ev1-section-actions">' +
          '<button class="ev1-btn ev1-btn-primary" onclick="ev2AddCost()">+ Aggiungi Costo</button>' +
        '</div>' +
      '</div>' +

      /* KPI row */
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">' +
        kpiCard('💸', 'Costi Fissi/Mese', fmt(totalM), 'flat', null) +
        kpiCard('📅', 'Costi Fissi/Anno', fmt(totalY), 'flat', null) +
        kpiCard('📊', 'Break-even Mensile', fmt(beNeeded), 'flat', null) +
        kpiCard('🎯', 'Copertura Break-even', beCoverage + '%', beCoverage >= 100 ? 'up' : 'down', beCoverage) +
      '</div>' +

      /* Break-even gauge */
      '<div class="ev2-card" style="margin-bottom:20px">' +
        '<div class="ev2-gauge-wrap">' +
          '<div class="ev2-gauge-ring">' +
            '<svg width="80" height="80" viewBox="0 0 80 80">' +
              '<circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="8"/>' +
              '<circle cx="40" cy="40" r="36" fill="none" stroke="' + gaugeColor + '" stroke-width="8" stroke-dasharray="' + gaugeDash.toFixed(1) + ' ' + (gaugeCircumf - gaugeDash).toFixed(1) + '" stroke-dashoffset="' + (gaugeCircumf / 4).toFixed(1) + '" transform="rotate(-90,40,40)" stroke-linecap="round"/>' +
            '</svg>' +
            '<div class="ev2-gauge-pct" style="color:' + gaugeColor + '">' + beCoverage + '%</div>' +
          '</div>' +
          '<div class="ev2-gauge-text">' +
            '<div class="ev2-gauge-title">Copertura Break-even</div>' +
            '<div class="ev2-gauge-sub">' +
              'Fatturato medio 3m: <strong style="color:#e5e5e5">' + fmt(avgRev) + '</strong><br>' +
              'Break-even mensile: <strong style="color:#e5e5e5">' + fmt(beNeeded) + '</strong><br>' +
              (beCoverage >= 100
                ? '<span style="color:#22c55e">✅ Stai coprendo i costi fissi</span>'
                : '<span style="color:#ef4444">⚠️ Mancano ' + fmt(beNeeded - avgRev) + '/mese al break-even</span>') +
            '</div>' +
          '</div>' +
          '<div style="flex:1">' + catBars + '</div>' +
        '</div>' +
      '</div>' +

      /* Cost table */
      '<div class="ev2-card">' +
        '<div class="ev2-card-title">📋 Dettaglio Costi Ricorrenti <span class="ev2-card-sub">Tot. attivi: ' + fmt(totalM) + '/mese</span></div>' +
        '<div style="overflow-x:auto"><table class="ev2-pl-table"><thead><tr><th>Attivo</th><th>Voce di Costo</th><th>Categoria</th><th>Mensile</th><th>Annuale</th><th></th></tr></thead><tbody>' + costRows + '</tbody></table></div>' +
      '</div>';
  }

  function catColor(cat) {
    var map = { 'Affitto':'#ef4444','Utenze':'#fbbf24','Macchinari':'#60a5fa','Abbonamenti':'#c084fc','Marketing':'#22c55e','Personale':'#fb923c','Altro':'#71717a' };
    return map[cat] || '#71717a';
  }

  window.ev2ToggleCost = function (id, val) {
    var costs = getCosts(); var c = costs.find(function (x) { return x.id === id; });
    if (c) { c.active = val; saveCosts(costs); renderFixedCosts(); }
  };

  window.ev2DeleteCost = function (id) {
    saveCosts(getCosts().filter(function (x) { return x.id !== id; }));
    renderFixedCosts();
    toast('Costo rimosso', 'success');
  };

  function openCostModal(c) {
    var isNew = !c;
    if (!c) c = { id: uid(), active: true };
    var catOpts = COST_CATS.map(function (cat) {
      return '<option value="' + cat + '"' + (c.category === cat ? ' selected' : '') + '>' + COST_CAT_ICONS[cat] + ' ' + cat + '</option>';
    }).join('');
    openModal('ev2-cost-modal', isNew ? '+ Aggiungi Costo Fisso' : 'Modifica Costo',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<div style="grid-column:1/-1"><label class="ev1-label">Nome voce *</label><input id="ev2-cost-name" class="ev1-input" value="' + esc(c.name || '') + '" placeholder="Es: Affitto capannone"></div>' +
        '<div><label class="ev1-label">Categoria</label><select id="ev2-cost-cat" class="ev1-input">' + catOpts + '</select></div>' +
        '<div><label class="ev1-label">Importo mensile €</label><input id="ev2-cost-amt" class="ev1-input" type="number" step="0.01" min="0" value="' + (c.amount || '') + '" placeholder="0"></div>' +
      '</div>',
      function () {
        var costs = getCosts();
        var updated = { id: c.id, active: c.active !== false, name: inp('ev2-cost-name'), category: $id('ev2-cost-cat').value, amount: parseFloat(inp('ev2-cost-amt')) || 0 };
        if (!updated.name) { toast('Inserisci il nome', 'error'); return; }
        if (isNew) costs.push(updated);
        else { var idx = costs.findIndex(function(x){return x.id===c.id;}); if(idx>=0) costs[idx]=updated; else costs.push(updated); }
        saveCosts(costs);
        closeModal('ev2-cost-modal');
        renderFixedCosts();
        toast(isNew ? 'Costo aggiunto' : 'Costo aggiornato', 'success');
      }
    );
  }

  window.ev2AddCost  = function () { openCostModal(null); };
  window.ev2EditCost = function (id) { openCostModal(getCosts().find(function (x) { return x.id === id; })); };

  /* ═══════════════════════════════════════════════════
     4. VENDITE & FATTURE enhancement  →  view-sales
     (already exists in base HTML — add AI + scadenziario panel)
  ═══════════════════════════════════════════════════ */
  function buildSalesAI() {
    var section = $id('view-sales');
    if (!section || section._ev2SalesBuilt) return;
    section._ev2SalesBuilt = true;

    /* Inject AI panel before existing content */
    var orders = getOrders();
    var sales   = ST.get('ingly_sales', []);
    var thisM   = monthlyRevenue(0);
    var lastM   = monthlyRevenue(1);
    var delta   = lastM > 0 ? Math.round((thisM - lastM) / lastM * 100) : 0;
    var toPay   = orders.filter(function (o) { var s = oStatus(o); return s !== 'annullato' && s !== 'pagato'; });
    var toPayAmt = toPay.reduce(function (s, o) { return s + oAmt(o); }, 0);
    var overdue  = toPay.filter(function (o) { var dl = oDeadline(o); return dl && new Date(dl) < new Date(); });

    var insights = [];
    if (overdue.length) insights.push('<strong>🔴 ' + overdue.length + ' fatture scadute</strong> — importo totale: ' + fmt(overdue.reduce(function(s,o){return s+oAmt(o);},0)) + '. Azione: sollecito immediato.');
    if (toPayAmt > 0)  insights.push('<strong>⏳ ' + fmt(toPayAmt) + ' da incassare</strong> da ' + toPay.length + ' ordini aperti.');
    insights.push('<strong>' + (delta >= 0 ? '▲' : '▼') + Math.abs(delta) + '% vs mese scorso</strong> — ' + fmt(lastM) + ' → ' + fmt(thisM) + '.');

    var panel = document.createElement('div');
    panel.style.cssText = 'margin-bottom:16px';
    panel.innerHTML = '<div class="ev2-ai-box"><div class="ev2-ai-header">🤖 AI Vendite Insights</div>' +
      insights.map(function (i) { return '<div class="ev2-ai-line">' + i + '</div>'; }).join('') + '</div>';

    section.insertBefore(panel, section.firstChild);
  }

  /* ═══════════════════════════════════════════════════
     NAV HOOK + BOOT
  ═══════════════════════════════════════════════════ */
  function dispatch(id) {
    if (id === 'finance')      buildFinance();
    if (id === 'cashflow')     buildCashflow();
    if (id === 'fixed_costs')  buildFixedCosts();
    if (id === 'sales')        buildSalesAI();
  }

  function hookNav() {
    if (window._proxEV2NavHooked) return;
    if (typeof App === 'undefined' || !App.navigate) return;
    var _orig = App.navigate;
    App.navigate = function (section) {
      var r = _orig.apply(this, arguments);
      setTimeout(function () { dispatch(section); }, 80);
      return r;
    };
    window._proxEV2NavHooked = true;
  }

  function boot() {
    injectCSS();
    function init() {
      hookNav();
      ensureDefaultCosts();
      /* Pre-build all finance sections */
      setTimeout(function () {
        buildFinance();
        buildCashflow();
        buildFixedCosts();
        buildSalesAI();
      }, 800);
      /* Build active section */
      var active = document.querySelector('.section-view.active');
      if (active) { var id = active.id.replace('view-', ''); setTimeout(function () { dispatch(id); }, 200); }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 300); });
    } else {
      setTimeout(init, 300);
    }
  }

  setTimeout(boot, 5600);

})();

