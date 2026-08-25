
/* ═══════════════════════════════════════════════════════════════════
   INGLY ENTERPRISE V3 — Production Hub + Machine Intelligence
   Workflow · Scheduling · Machine Load · Maintenance · Projects
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window._inglyEV3) return;
  window._inglyEV3 = true;

  /* ── Storage ── */
  var ST = {
    get: function (k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (_) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  };

  /* ── Utils ── */
  function $id(id) { return document.getElementById(id); }
  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(n, d) { d = d == null ? 0 : d; return '€' + (+n || 0).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function dtIT(d) { try { var x = new Date(d); return isNaN(x) ? '—' : x.toLocaleDateString('it-IT'); } catch (_) { return '—'; } }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function daysSince(d) { return d ? Math.round((Date.now() - new Date(d).getTime()) / 86400000) : 999; }
  function daysUntil(d) { return d ? Math.round((new Date(d).getTime() - Date.now()) / 86400000) : null; }

  /* ── Data ── */
  function getOrders()   { return ST.get('ingly_orders', []); }
  function getMachines() { return ST.get('ev3_machines', []); }
  function saveMachines(v) { ST.set('ev3_machines', v); }
  function getMaintLogs() { return ST.get('ev3_maint_logs', []); }
  function saveMaintLogs(v) { ST.set('ev3_maint_logs', v); }
  function getProjects() { return ST.get('ev3_projects', []); }
  function saveProjects(v) { ST.set('ev3_projects', v); }

  function oAmt(o)      { return +(o.total || o.totalPrice || o.amount || o.totale || 0); }
  function oDate(o)     { return o.date || o.createdAt || o.data || ''; }
  function oDeadline(o) { return o.deadline || o.dataConsegna || o.dueDate || ''; }
  function oClient(o)   { return o.client || o.clientName || o.cliente || o.name || 'Cliente'; }
  function oStatus(o) {
    var s = (o.status || o.stato || '').toLowerCase();
    if (s.includes('produz') || s.includes('lavoraz') || s.includes('in corso')) return 'produzione';
    if (s.includes('consegn') || s.includes('completat')) return 'completato';
    if (s.includes('pagat') || s.includes('paid')) return 'pagato';
    if (s.includes('annull') || s.includes('cancel')) return 'annullato';
    return 'attesa';
  }

  /* ── Default machines ── */
  function ensureMachines() {
    if (getMachines().length > 0) return;
    saveMachines([
      { id: uid(), name: 'Laser CO2 80W', type: 'laser', status: 'online', dailyCap: 8, usedToday: 0, costH: 0.18, nextMaint: '', notes: 'P3 — taglio e incisione legno/acrilico' },
      { id: uid(), name: 'Stampante DTF A3', type: 'dtf', status: 'online', dailyCap: 6, usedToday: 0, costH: 0.30, nextMaint: '', notes: 'Transfer film per tessuti' },
      { id: uid(), name: 'Pressa Sublimazione 38×38', type: 'sub', status: 'online', dailyCap: 10, usedToday: 0, costH: 0.10, nextMaint: '', notes: 'Tazze, gadget, tessuti' },
      { id: uid(), name: 'Laser Fibra 20W', type: 'laser', status: 'online', dailyCap: 8, usedToday: 0, costH: 0.22, nextMaint: '', notes: 'Metalli, acciaio, alluminio' },
    ]);
  }

  /* ── Default projects ── */
  function ensureProjects() {
    if (getProjects().length > 0) return;
    saveProjects([
      { id: uid(), name: 'Campagna Natale 2025', client: 'Interno', status: 'inprogress', priority: 'high', budget: 500, spent: 120, progress: 35, deadline: '', desc: 'Preparazione catalogo e template social per periodo natalizio', createdAt: new Date().toISOString() },
      { id: uid(), name: 'Setup E-commerce Etsy', client: 'Interno', status: 'todo', priority: 'medium', budget: 200, spent: 0, progress: 10, deadline: '', desc: 'Apertura shop Etsy con primi 20 prodotti fotografati e listati', createdAt: new Date().toISOString() },
    ]);
  }

  /* ── CSS ── */
  function injectCSS() {
    if ($id('ev3-css')) return;
    var s = document.createElement('style');
    s.id = 'ev3-css';
    s.textContent = `

/* ══ Machine cards ══ */
.ev3-machine-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; margin-bottom: 24px; }
.ev3-machine-card {
  background: var(--bg-card); border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px; padding: 18px; position: relative; transition: .2s;
}
.ev3-machine-card:hover { border-color: rgba(251,191,36,.2); }
.ev3-machine-card.offline { opacity: .5; }
.ev3-machine-card.maintenance { border-color: rgba(251,191,36,.3); background: rgba(251,191,36,.03); }

.ev3-machine-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
.ev3-machine-name { font-size: 14px; font-weight: 700; color: #fff; }
.ev3-machine-type { font-size: 10px; color: #71717a; margin-top: 2px; text-transform: uppercase; letter-spacing: .5px; }

.ev3-status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
.ev3-status-dot.online      { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
.ev3-status-dot.offline     { background: #71717a; }
.ev3-status-dot.maintenance { background: #fbbf24; box-shadow: 0 0 6px #fbbf24; animation: ev3pulse 1.5s infinite; }
@keyframes ev3pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }

.ev3-load-wrap { margin-bottom: 10px; }
.ev3-load-label { display: flex; justify-content: space-between; font-size: 11px; color: #71717a; margin-bottom: 4px; }
.ev3-load-bar { height: 8px; background: rgba(255,255,255,.06); border-radius: 99px; overflow: hidden; }
.ev3-load-fill { height: 100%; border-radius: 99px; transition: width .6s; }

.ev3-machine-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
.ev3-machine-cost { font-size: 11px; color: #71717a; }
.ev3-machine-actions { display: flex; gap: 4px; }

/* ══ Production queue ══ */
.ev3-queue { display: flex; flex-direction: column; gap: 8px; }
.ev3-queue-item {
  display: grid; grid-template-columns: 28px 1fr auto auto auto auto;
  align-items: center; gap: 12px; padding: 12px 14px;
  background: var(--bg-card); border: 1px solid rgba(255,255,255,.07);
  border-radius: 10px; transition: .15s; cursor: pointer;
}
.ev3-queue-item:hover { border-color: rgba(251,191,36,.2); }
.ev3-queue-item.urgent { border-color: rgba(239,68,68,.3); background: rgba(239,68,68,.03); }
.ev3-queue-priority { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
.ev3-queue-priority.high   { background: rgba(239,68,68,.15); color: #ef4444; }
.ev3-queue-priority.medium { background: rgba(251,191,36,.15); color: #fbbf24; }
.ev3-queue-priority.low    { background: rgba(34,197,94,.15); color: #22c55e; }
.ev3-queue-info { overflow: hidden; }
.ev3-queue-client { font-size: 13px; font-weight: 600; color: #e5e5e5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ev3-queue-desc   { font-size: 11px; color: #71717a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ev3-queue-amount { font-size: 13px; font-weight: 700; color: #fbbf24; white-space: nowrap; }
.ev3-queue-deadline { font-size: 11px; font-weight: 600; white-space: nowrap; }
.ev3-queue-deadline.urgent { color: #ef4444; }
.ev3-queue-deadline.soon   { color: #fbbf24; }
.ev3-queue-deadline.ok     { color: #22c55e; }

/* ══ Status selector ══ */
.ev3-status-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.ev3-status-pill {
  padding: 5px 14px; border-radius: 99px; border: 1.5px solid;
  font-size: 11px; font-weight: 700; cursor: pointer; transition: .15s; background: transparent;
}

/* ══ Maintenance timeline ══ */
.ev3-maint-list { display: flex; flex-direction: column; gap: 8px; }
.ev3-maint-item {
  display: grid; grid-template-columns: 48px 1fr auto;
  align-items: center; gap: 12px; padding: 10px 14px;
  background: rgba(255,255,255,.03); border-radius: 10px;
  border: 1px solid rgba(255,255,255,.06);
}
.ev3-maint-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }

/* ══ Project cards ══ */
.ev3-proj-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.ev3-proj-card {
  background: var(--bg-card); border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px; padding: 18px; transition: .2s;
}
.ev3-proj-card:hover { border-color: rgba(251,191,36,.2); }
.ev3-proj-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.ev3-proj-name  { font-size: 14px; font-weight: 700; color: #fff; flex: 1; }
.ev3-proj-client { font-size: 11px; color: #71717a; margin-top: 3px; }
.ev3-proj-desc  { font-size: 12px; color: #71717a; margin-bottom: 14px; line-height: 1.5; }
.ev3-proj-meta  { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; }
.ev3-proj-prog  { margin-bottom: 12px; }
.ev3-proj-prog-label { display: flex; justify-content: space-between; font-size: 11px; color: #71717a; margin-bottom: 5px; }
.ev3-proj-prog-bar  { height: 6px; background: rgba(255,255,255,.06); border-radius: 99px; overflow: hidden; }
.ev3-proj-prog-fill { height: 100%; border-radius: 99px; transition: width .6s; }
.ev3-proj-footer { display: flex; justify-content: space-between; align-items: center; }
.ev3-proj-status { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 99px; }
.ev3-proj-status.inprogress { background: rgba(59,130,246,.12); color: #60a5fa; border: 1px solid rgba(59,130,246,.25); }
.ev3-proj-status.todo       { background: rgba(251,191,36,.12); color: #fbbf24; border: 1px solid rgba(251,191,36,.25); }
.ev3-proj-status.done       { background: rgba(34,197,94,.12); color: #22c55e; border: 1px solid rgba(34,197,94,.25); }
.ev3-proj-status.onhold     { background: rgba(255,255,255,.06); color: #71717a; border: 1px solid rgba(255,255,255,.12); }

/* ══ Picking list ══ */
.ev3-pick-list { display: flex; flex-direction: column; gap: 6px; }
.ev3-pick-item {
  display: grid; grid-template-columns: 20px 1fr auto auto auto;
  align-items: center; gap: 12px; padding: 10px 14px;
  background: rgba(255,255,255,.03); border-radius: 8px;
  border: 1px solid rgba(255,255,255,.06); font-size: 12px;
}
.ev3-pick-check { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid rgba(255,255,255,.2); cursor: pointer; transition: .15s; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.ev3-pick-check.done { background: #22c55e; border-color: #22c55e; }

/* ══ Two-col ══ */
.ev3-two-col { display: grid; grid-template-columns: 1fr 340px; gap: 18px; }
@media(max-width:1100px) { .ev3-two-col { grid-template-columns: 1fr; } }

/* ══ Section card ══ */
.ev3-card { background: var(--bg-card); border: 1px solid rgba(255,255,255,.07); border-radius: 14px; padding: 20px; margin-bottom: 20px; }
.ev3-card-title { font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.ev3-card-sub { font-size: 11px; color: #71717a; margin-left: auto; font-weight: 400; }

/* ══ AI box ══ */
.ev3-ai-box { background: rgba(251,191,36,.05); border: 1px solid rgba(251,191,36,.15); border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; }
.ev3-ai-header { font-size: 12px; font-weight: 700; color: #fbbf24; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.ev3-ai-line { font-size: 12px; color: #a1a1aa; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,.04); line-height: 1.6; }
.ev3-ai-line:last-child { border-bottom: none; }
.ev3-ai-line strong { color: #e5e5e5; }
`;
    document.head.appendChild(s);
  }

  /* ── Toast ── */
  function toast(msg, type) {
    var c = $id('ev1-toast') || $id('ev2-toast');
    if (!c) { c = document.createElement('div'); c.style.cssText = 'position:fixed;bottom:80px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px'; document.body.appendChild(c); }
    var item = document.createElement('div');
    item.style.cssText = 'background:#18181b;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:11px 16px;font-size:13px;color:#e5e5e5;box-shadow:0 8px 30px rgba(0,0,0,.6);min-width:240px;border-left:3px solid ' + (type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#fbbf24');
    item.textContent = (type === 'success' ? '✓ ' : type === 'error' ? '✗ ' : '◆ ') + msg;
    c.appendChild(item);
    setTimeout(function () { item.style.opacity = '0'; item.style.transition = '.3s'; setTimeout(function () { item.remove(); }, 300); }, 2600);
  }

  /* ── Modal ── */
  function openModal(id, title, bodyHTML, onSave) {
    var ex = $id(id); if (ex) ex.remove();
    var overlay = document.createElement('div');
    overlay.id = id;
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeEv3Modal(id); });
    var modal = document.createElement('div');
    modal.style.cssText = 'background:#111113;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:600px;max-height:90vh;overflow-y:auto;box-shadow:0 30px 100px rgba(0,0,0,.8)';
    modal.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.07)">' +
        '<div style="font-size:16px;font-weight:700;color:#fff">' + title + '</div>' +
        '<button onclick="ev3CloseModal(\'' + id + '\')" style="background:none;border:none;color:#71717a;cursor:pointer;font-size:20px;padding:2px 8px">&times;</button>' +
      '</div>' +
      '<div style="padding:20px">' + bodyHTML + '</div>' +
      '<div style="padding:14px 20px;border-top:1px solid rgba(255,255,255,.07);display:flex;justify-content:flex-end;gap:8px">' +
        '<button onclick="ev3CloseModal(\'' + id + '\')" style="padding:7px 16px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#a1a1aa;cursor:pointer;font-size:12px;font-weight:600">Annulla</button>' +
        '<button id="' + id + '-save" style="padding:7px 16px;border-radius:8px;border:none;background:#fbbf24;color:#000;cursor:pointer;font-size:12px;font-weight:700">Salva</button>' +
      '</div>';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    $id(id + '-save').addEventListener('click', onSave);
  }

  function closeEv3Modal(id) {
    var fn = window.closeModal || window.ev3CloseModal;
    if (fn && fn !== closeEv3Modal) { fn(id); return; }
    var el = $id(id); if (el) { el.style.opacity = '0'; setTimeout(function () { el && el.remove(); }, 200); }
  }
  window.ev3CloseModal = closeEv3Modal;

  function inp(id) { var el = $id(id); return el ? el.value.trim() : ''; }

  /* ═══════════════════════════════════════════════════
     1. PRODUCTION HUB  →  view-workflow_dashboard
  ═══════════════════════════════════════════════════ */
  var prodTab = 'queue'; // 'queue' | 'machines' | 'picking'

  function buildProductionHub() {
    var section = $id('view-workflow_dashboard');
    if (!section || section._ev3ProdBuilt) return;
    section._ev3ProdBuilt = true;
    ensureMachines();
    renderProductionHub();
  }

  function renderProductionHub() {
    var section = $id('view-workflow_dashboard');
    if (!section) return;

    var orders   = getOrders();
    var machines = getMachines();
    var logs     = getMaintLogs();

    /* Active jobs (attesa + produzione) sorted by urgency */
    var activeJobs = orders.filter(function (o) {
      var s = oStatus(o); return s === 'attesa' || s === 'produzione';
    }).map(function (o) {
      var dl    = oDeadline(o);
      var days  = daysUntil(dl);
      var urgency = days === null ? 50 : days < 0 ? 0 : days < 2 ? 1 : days < 7 ? 2 : 3;
      var priority = urgency <= 1 ? 'high' : urgency === 2 ? 'medium' : 'low';
      return Object.assign({}, o, { _days: days, _urgency: urgency, _priority: priority });
    }).sort(function (a, b) { return a._urgency - b._urgency; });

    /* Machine utilization */
    var totalCap  = machines.reduce(function (s, m) { return s + (m.dailyCap || 8); }, 0);
    var totalUsed = machines.reduce(function (s, m) { return s + Math.min(m.usedToday || 0, m.dailyCap || 8); }, 0);
    var overallLoad = totalCap > 0 ? Math.round(totalUsed / totalCap * 100) : 0;

    /* Maintenance due */
    var maintDue = machines.filter(function (m) {
      if (!m.nextMaint) return false;
      var days = daysUntil(m.nextMaint);
      return days !== null && days <= 7;
    });

    /* AI insights */
    var insights = [];
    var overdue = activeJobs.filter(function (o) { return o._days !== null && o._days < 0; });
    if (overdue.length)      insights.push('<strong>⚠️ ' + overdue.length + ' lavori in ritardo</strong> — riorganizzare sequenza produzione immediatamente.');
    var todayJobs = activeJobs.filter(function (o) { return o._days !== null && o._days <= 1; });
    if (todayJobs.length)    insights.push('<strong>🔥 ' + todayJobs.length + ' lavori da consegnare oggi/domani</strong> — priorità massima.');
    if (maintDue.length)     insights.push('<strong>🔧 ' + maintDue.length + ' macchine richiedono manutenzione</strong> entro 7 giorni — pianificare fermo.');
    if (overallLoad > 85)    insights.push('<strong>🏭 Carico produzione alto (' + overallLoad + '%)</strong> — valutare straordinari o sub-appalto.');
    else if (overallLoad < 30 && activeJobs.length > 0) insights.push('<strong>✅ Capacità disponibile (' + (100 - overallLoad) + '%)</strong> — possibile accettare nuovi ordini.');
    if (!insights.length)    insights.push('<strong>✅ Produzione nella norma</strong> — ' + activeJobs.length + ' lavori in pipeline.');

    /* Queue items */
    var queueHTML = activeJobs.length
      ? activeJobs.slice(0, 25).map(function (o, i) {
          var dl = oDeadline(o);
          var dlLabel = o._days === null ? '—' : o._days < 0 ? '⚠️ ' + Math.abs(o._days) + 'g scaduto' : o._days === 0 ? 'Oggi' : o._days + 'g';
          var dlClass = o._days === null ? '' : o._days < 0 ? 'urgent' : o._days < 3 ? 'soon' : 'ok';
          var pNum = i + 1;
          return '<div class="ev3-queue-item' + (o._days !== null && o._days < 0 ? ' urgent' : '') + '" onclick="ev3OrderStatus(\'' + o.id + '\')">' +
            '<div class="ev3-queue-priority ' + o._priority + '">' + pNum + '</div>' +
            '<div class="ev3-queue-info"><div class="ev3-queue-client">' + esc(oClient(o)) + '</div><div class="ev3-queue-desc">' + esc((o.description || o.desc || o.tipo || '—').slice(0, 55)) + '</div></div>' +
            '<span class="ev1-badge ' + oStatus(o) + '" style="font-size:10px">' + oStatus(o) + '</span>' +
            '<div class="ev3-queue-amount">' + fmt(oAmt(o)) + '</div>' +
            '<div class="ev3-queue-deadline ' + dlClass + '">' + dlLabel + '</div>' +
          '</div>';
        }).join('')
      : '<div style="text-align:center;padding:50px;color:#52525b"><div style="font-size:36px;margin-bottom:12px;opacity:.2">🎉</div><div>Nessun lavoro in coda — tutto completato!</div></div>';

    /* Machine cards */
    var machineCardsHTML = machines.map(function (m) {
      var load = m.dailyCap > 0 ? Math.round(Math.min(m.usedToday || 0, m.dailyCap) / m.dailyCap * 100) : 0;
      var loadColor = load >= 90 ? '#ef4444' : load >= 70 ? '#fbbf24' : '#22c55e';
      var typeIcon = { laser: '⚡', dtf: '🖨️', sub: '🎨' }[m.type] || '⚙️';
      var maintDays = m.nextMaint ? daysUntil(m.nextMaint) : null;
      return '<div class="ev3-machine-card ' + m.status + '">' +
        '<div class="ev3-machine-header">' +
          '<div><div class="ev3-machine-name">' + typeIcon + ' ' + esc(m.name) + '</div><div class="ev3-machine-type">' + (m.type || 'Macchina') + '</div></div>' +
          '<div style="display:flex;align-items:center;gap:6px">' +
            '<div class="ev3-status-dot ' + m.status + '"></div>' +
            '<span style="font-size:10px;color:#71717a">' + (m.status === 'online' ? 'Online' : m.status === 'maintenance' ? 'Manutenzione' : 'Offline') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="ev3-load-wrap">' +
          '<div class="ev3-load-label"><span>Carico giornaliero</span><span style="color:' + loadColor + ';font-weight:700">' + load + '%</span></div>' +
          '<div class="ev3-load-bar"><div class="ev3-load-fill" style="width:' + load + '%;background:' + loadColor + '"></div></div>' +
          '<div style="font-size:10px;color:#52525b;margin-top:3px">' + (m.usedToday || 0) + 'h / ' + m.dailyCap + 'h/giorno</div>' +
        '</div>' +
        (maintDays !== null ? '<div style="font-size:11px;color:' + (maintDays <= 0 ? '#ef4444' : maintDays <= 3 ? '#fbbf24' : '#71717a') + ';margin-bottom:10px">🔧 Manutenzione: ' + (maintDays <= 0 ? 'SCADUTA' : 'tra ' + maintDays + 'g') + '</div>' : '') +
        (m.notes ? '<div style="font-size:11px;color:#52525b;margin-bottom:10px">' + esc(m.notes) + '</div>' : '') +
        '<div class="ev3-machine-footer">' +
          '<div class="ev3-machine-cost">€' + (+m.costH || 0).toFixed(2) + '/h</div>' +
          '<div class="ev3-machine-actions">' +
            '<button style="padding:4px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#a1a1aa;cursor:pointer;font-size:11px" onclick="ev3LogMaint(\'' + m.id + '\')">🔧 Maint.</button>' +
            '<button style="padding:4px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#a1a1aa;cursor:pointer;font-size:11px" onclick="ev3EditMachine(\'' + m.id + '\')">✏️</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    /* Picking list — materials needed for active jobs */
    var MATERIALS_DB = ['MDF 3mm', 'MDF 6mm', 'Acrilico 3mm', 'Legno Betulla 4mm', 'T-shirt DTF', 'Tazza bianca', 'Ardesia 10×10', 'Vinile adesivo', 'Transfer Film DTF'];
    var pickItems = activeJobs.slice(0, 10).map(function (o, i) {
      var mat = MATERIALS_DB[i % MATERIALS_DB.length];
      return '<div class="ev3-pick-item">' +
        '<div class="ev3-pick-check" id="pick-' + o.id + '" onclick="ev3TogglePick(this)"></div>' +
        '<div><strong style="color:#e5e5e5">' + esc(oClient(o)) + '</strong> — <span style="color:#71717a">' + esc((o.description || o.tipo || mat).slice(0, 40)) + '</span></div>' +
        '<span style="font-size:11px;color:#71717a">' + dtIT(oDeadline(o) || oDate(o)) + '</span>' +
        '<span class="ev1-badge ' + oStatus(o) + '" style="font-size:10px">' + oStatus(o) + '</span>' +
        '<span style="font-size:13px;font-weight:700;color:#fbbf24">' + fmt(oAmt(o)) + '</span>' +
      '</div>';
    }).join('') || '<div style="text-align:center;padding:30px;color:#52525b">Nessun lavoro attivo</div>';

    /* Tabs content */
    var tabContents = {
      queue: '<div class="ev3-queue">' + queueHTML + '</div>',
      machines: '<div class="ev3-machine-grid">' + machineCardsHTML + '</div>' +
        '<div class="ev3-card"><div class="ev3-card-title">📋 Log Manutenzione Recenti <span class="ev3-card-sub"><button onclick="ev3AddMachine()" style="font-size:11px;padding:4px 12px;border-radius:7px;border:1px solid rgba(251,191,36,.3);background:rgba(251,191,36,.08);color:#fbbf24;cursor:pointer">+ Macchina</button></span></div>' +
          renderMaintLog() +
        '</div>',
      picking: '<div style="margin-bottom:12px;display:flex;align-items:center;gap:8px"><span style="font-size:13px;font-weight:700;color:#fff">📦 Lista Prelievo Materiali</span><span style="font-size:11px;color:#71717a">— ' + activeJobs.length + ' lavori attivi</span></div>' +
        '<div class="ev3-pick-list">' + pickItems + '</div>',
    };

    section.innerHTML =
      '<div class="ev1-section-header" style="margin-bottom:20px">' +
        '<div><div class="ev1-section-title">🏭 Production Hub</div><div class="ev1-section-sub">' + activeJobs.length + ' lavori attivi · Carico: ' + overallLoad + '% · ' + machines.length + ' macchine</div></div>' +
        '<div class="ev1-section-actions">' +
          '<button class="ev1-btn ev1-btn-primary" onclick="App.navigate(\'gestione_ordini\')">+ Nuovo Ordine</button>' +
        '</div>' +
      '</div>' +

      /* AI optimizer */
      '<div class="ev3-ai-box"><div class="ev3-ai-header">🤖 AI Workflow Optimizer</div>' +
      insights.map(function (i) { return '<div class="ev3-ai-line">' + i + '</div>'; }).join('') + '</div>' +

      /* KPI row */
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">' +
        ev3Kpi('🔄', 'Lavori Attivi', activeJobs.length, activeJobs.length > 10 ? 'down' : 'up') +
        ev3Kpi('⚠️', 'In Ritardo', overdue.length, overdue.length > 0 ? 'down' : 'up') +
        ev3Kpi('🏭', 'Carico Macchine', overallLoad + '%', overallLoad > 85 ? 'down' : 'up') +
        ev3Kpi('💰', 'Valore Pipeline', fmt(activeJobs.reduce(function(s,o){return s+oAmt(o);},0)), 'flat') +
      '</div>' +

      /* Tabs */
      '<div style="display:flex;gap:3px;background:rgba(255,255,255,.04);padding:3px;border-radius:10px;width:fit-content;margin-bottom:18px">' +
        [['queue','📋 Coda Lavori'],['machines','⚙️ Macchine'],['picking','📦 Picking']].map(function (t) {
          return '<button onclick="ev3ProdTab(\'' + t[0] + '\')" style="padding:7px 18px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:600;transition:.15s;' + (prodTab === t[0] ? 'background:var(--bg-card);color:#fbbf24' : 'background:none;color:#71717a') + '">' + t[1] + '</button>';
        }).join('') +
      '</div>' +
      '<div id="ev3-prod-tab-content">' + (tabContents[prodTab] || tabContents.queue) + '</div>';
  }

  function renderMaintLog() {
    var logs = getMaintLogs().slice(-10).reverse();
    var machines = getMachines();
    if (!logs.length) return '<div style="text-align:center;padding:20px;color:#52525b;font-size:12px">Nessuna manutenzione registrata</div>';
    return logs.map(function (log) {
      var machine = machines.find(function (m) { return m.id === log.machineId; });
      var typeColor = log.type === 'preventiva' ? '#22c55e' : log.type === 'correttiva' ? '#ef4444' : '#fbbf24';
      return '<div class="ev3-maint-item">' +
        '<div class="ev3-maint-icon" style="background:rgba(255,255,255,.04)">🔧</div>' +
        '<div><div style="font-size:12px;font-weight:600;color:#e5e5e5">' + esc(machine ? machine.name : 'Macchina') + '</div><div style="font-size:11px;color:#71717a">' + esc(log.note || '—') + '</div></div>' +
        '<div style="text-align:right"><div style="font-size:11px;font-weight:700;color:' + typeColor + '">' + esc(log.type || 'intervento') + '</div><div style="font-size:10px;color:#52525b">' + dtIT(log.date) + '</div><div style="font-size:11px;color:#fbbf24">' + fmt(log.cost || 0) + '</div></div>' +
      '</div>';
    }).join('');
  }

  function ev3Kpi(icon, label, val, trend) {
    var tColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#71717a';
    var tIcon  = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—';
    return '<div style="background:var(--bg-card);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:16px 18px">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-size:18px;opacity:.5">' + icon + '</span><span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:rgba(255,255,255,.06);color:' + tColor + '">' + tIcon + '</span></div>' +
      '<div style="font-size:24px;font-weight:800;color:#fff;line-height:1;margin-bottom:4px">' + val + '</div>' +
      '<div style="font-size:11px;color:#71717a">' + label + '</div>' +
    '</div>';
  }

  window.ev3ProdTab = function (tab) {
    prodTab = tab;
    var section = $id('view-workflow_dashboard');
    if (section) { section._ev3ProdBuilt = false; renderProductionHub(); }
  };

  window.ev3TogglePick = function (el) {
    el.classList.toggle('done');
    el.textContent = el.classList.contains('done') ? '✓' : '';
  };

  window.ev3OrderStatus = function (id) {
    var orders = getOrders();
    var o = orders.find(function (x) { return x.id === id; });
    if (!o) return;
    var STATUS = ['attesa', 'produzione', 'completato', 'annullato'];
    var opts = STATUS.map(function (s) {
      return '<option value="' + s + '"' + (oStatus(o) === s ? ' selected' : '') + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>';
    }).join('');
    openModal('ev3-status-modal', '🔄 Aggiorna Stato — ' + esc(oClient(o)),
      '<div style="margin-bottom:16px;color:#a1a1aa;font-size:13px"><strong>' + esc(o.description || o.tipo || '—') + '</strong><br>Importo: ' + fmt(oAmt(o)) + '</div>' +
      '<div><label style="display:block;font-size:11px;color:#71717a;font-weight:600;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px">Nuovo Stato</label><select id="ev3-new-status" style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:9px 12px;color:#e5e5e5;font-size:13px;outline:none">' + opts + '</select></div>',
      function () {
        var orders2 = getOrders();
        var idx = orders2.findIndex(function (x) { return x.id === id; });
        if (idx >= 0) { orders2[idx].status = $id('ev3-new-status').value; ST.set('ingly_orders', orders2); }
        closeEv3Modal('ev3-status-modal');
        var section = $id('view-workflow_dashboard');
        if (section) { section._ev3ProdBuilt = false; renderProductionHub(); }
        toast('Stato aggiornato', 'success');
      }
    );
  };

  /* ── Machine modal ── */
  function openMachineModal(m) {
    var isNew = !m;
    if (!m) m = { id: uid(), status: 'online', type: 'laser', dailyCap: 8 };
    var typeOpts = ['laser','dtf','sub','uv','altro'].map(function (t) {
      return '<option value="' + t + '"' + (m.type === t ? ' selected' : '') + '>' + t.toUpperCase() + '</option>';
    }).join('');
    var statusOpts = ['online','offline','maintenance'].map(function (s) {
      return '<option value="' + s + '"' + (m.status === s ? ' selected' : '') + '>' + s + '</option>';
    }).join('');
    openModal('ev3-machine-modal', isNew ? '+ Nuova Macchina' : 'Modifica — ' + esc(m.name || ''),
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<div style="grid-column:1/-1"><label class="ev1-label">Nome macchina *</label><input id="ev3-m-name" class="ev1-input" value="' + esc(m.name || '') + '" placeholder="Es: Laser CO2 80W P3"></div>' +
        '<div><label class="ev1-label">Tipo</label><select id="ev3-m-type" class="ev1-input">' + typeOpts + '</select></div>' +
        '<div><label class="ev1-label">Stato</label><select id="ev3-m-status" class="ev1-input">' + statusOpts + '</select></div>' +
        '<div><label class="ev1-label">Capacità ore/giorno</label><input id="ev3-m-cap" class="ev1-input" type="number" value="' + (m.dailyCap || 8) + '" min="1" max="24"></div>' +
        '<div><label class="ev1-label">Costo €/ora</label><input id="ev3-m-cost" class="ev1-input" type="number" step="0.01" value="' + (m.costH || 0.20) + '"></div>' +
        '<div><label class="ev1-label">Prossima manutenzione</label><input id="ev3-m-maint" class="ev1-input" type="date" value="' + (m.nextMaint || '') + '"></div>' +
        '<div><label class="ev1-label">Ore usate oggi</label><input id="ev3-m-used" class="ev1-input" type="number" step="0.5" value="' + (m.usedToday || 0) + '" min="0"></div>' +
        '<div style="grid-column:1/-1"><label class="ev1-label">Note</label><input id="ev3-m-notes" class="ev1-input" value="' + esc(m.notes || '') + '" placeholder="Materiali, parametri, ecc."></div>' +
      '</div>',
      function () {
        var machines = getMachines();
        var updated = { id: m.id, name: inp('ev3-m-name'), type: $id('ev3-m-type').value, status: $id('ev3-m-status').value, dailyCap: +inp('ev3-m-cap') || 8, costH: parseFloat(inp('ev3-m-cost')) || 0.20, nextMaint: inp('ev3-m-maint'), usedToday: parseFloat(inp('ev3-m-used')) || 0, notes: inp('ev3-m-notes') };
        if (!updated.name) { toast('Inserisci il nome', 'error'); return; }
        if (isNew) machines.push(updated);
        else { var idx = machines.findIndex(function(x){return x.id===m.id;}); if(idx>=0) machines[idx]=updated; else machines.push(updated); }
        saveMachines(machines);
        closeEv3Modal('ev3-machine-modal');
        var s = $id('view-workflow_dashboard'); if (s) { s._ev3ProdBuilt = false; renderProductionHub(); }
        toast(isNew ? 'Macchina aggiunta' : 'Macchina aggiornata', 'success');
      }
    );
  }

  window.ev3AddMachine  = function () { openMachineModal(null); };
  window.ev3EditMachine = function (id) { openMachineModal(getMachines().find(function(m){return m.id===id;})); };

  window.ev3LogMaint = function (machineId) {
    var machine = getMachines().find(function (m) { return m.id === machineId; });
    openModal('ev3-maint-log-modal', '🔧 Log Manutenzione — ' + esc(machine ? machine.name : ''),
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<div><label class="ev1-label">Tipo intervento</label><select id="ev3-log-type" class="ev1-input"><option value="preventiva">Preventiva</option><option value="correttiva">Correttiva</option><option value="pulizia">Pulizia</option><option value="calibrazione">Calibrazione</option></select></div>' +
        '<div><label class="ev1-label">Data</label><input id="ev3-log-date" class="ev1-input" type="date" value="' + new Date().toISOString().split('T')[0] + '"></div>' +
        '<div><label class="ev1-label">Costo €</label><input id="ev3-log-cost" class="ev1-input" type="number" step="0.01" value="0" min="0"></div>' +
        '<div><label class="ev1-label">Prossima revisione</label><input id="ev3-log-next" class="ev1-input" type="date" value=""></div>' +
        '<div style="grid-column:1/-1"><label class="ev1-label">Note intervento</label><textarea id="ev3-log-note" class="ev1-input" rows="2" placeholder="Descrivere l\'intervento..."></textarea></div>' +
      '</div>',
      function () {
        var log = { id: uid(), machineId: machineId, type: $id('ev3-log-type').value, date: inp('ev3-log-date'), cost: parseFloat(inp('ev3-log-cost')) || 0, note: inp('ev3-log-note') };
        var logs = getMaintLogs(); logs.push(log); saveMaintLogs(logs);
        /* Update machine nextMaint */
        var nextDate = inp('ev3-log-next');
        if (nextDate) {
          var machines = getMachines();
          var idx = machines.findIndex(function(m){return m.id===machineId;});
          if (idx >= 0) { machines[idx].nextMaint = nextDate; saveMachines(machines); }
        }
        closeEv3Modal('ev3-maint-log-modal');
        var s = $id('view-workflow_dashboard'); if (s) { s._ev3ProdBuilt = false; renderProductionHub(); }
        toast('Manutenzione registrata', 'success');
      }
    );
  };

  /* ═══════════════════════════════════════════════════
     2. PROJECTS  →  view-projects (rebuild)
  ═══════════════════════════════════════════════════ */
  var projFilter = 'all';

  function buildProjects() {
    var section = $id('view-projects');
    if (!section || section._ev3ProjBuilt) return;
    section._ev3ProjBuilt = true;
    ensureProjects();
    renderProjects();
  }

  function renderProjects() {
    var section = $id('view-projects');
    if (!section) return;

    var projects = getProjects();
    var filtered = projFilter === 'all' ? projects : projects.filter(function (p) { return p.status === projFilter; });
    var totalBudget = projects.reduce(function (s, p) { return s + +(p.budget || 0); }, 0);
    var totalSpent  = projects.reduce(function (s, p) { return s + +(p.spent || 0); }, 0);
    var active      = projects.filter(function (p) { return p.status === 'inprogress'; }).length;

    var STATUS_LABELS = { inprogress: '⚡ Attivo', todo: '📋 In Attesa', done: '✅ Completato', onhold: '⏸️ In Pausa' };
    var PRIORITY_COLORS = { high: '#ef4444', medium: '#fbbf24', low: '#22c55e' };

    var cards = filtered.map(function (p) {
      var prog = Math.min(+(p.progress || 0), 100);
      var progColor = prog >= 80 ? '#22c55e' : prog >= 40 ? '#fbbf24' : '#60a5fa';
      var budPct    = p.budget > 0 ? Math.min(Math.round(+(p.spent || 0) / p.budget * 100), 100) : 0;
      var dlDays    = p.deadline ? daysUntil(p.deadline) : null;
      return '<div class="ev3-proj-card">' +
        '<div class="ev3-proj-header">' +
          '<div><div class="ev3-proj-name">' + esc(p.name) + '</div><div class="ev3-proj-client">👤 ' + esc(p.client || 'Interno') + '</div></div>' +
          '<span class="ev3-proj-status ' + (p.status || 'todo') + '">' + (STATUS_LABELS[p.status] || p.status) + '</span>' +
        '</div>' +
        '<div class="ev3-proj-desc">' + esc((p.desc || p.description || '—').slice(0, 100)) + '</div>' +
        '<div class="ev3-proj-meta">' +
          '<span style="color:' + (PRIORITY_COLORS[p.priority] || '#71717a') + ';font-weight:700;font-size:11px">● ' + (p.priority || 'normal') + '</span>' +
          (dlDays !== null ? '<span style="font-size:11px;color:' + (dlDays < 0 ? '#ef4444' : dlDays < 7 ? '#fbbf24' : '#71717a') + '">' + (dlDays < 0 ? '⚠️ Scaduto ' + Math.abs(dlDays) + 'g' : '📅 ' + dlDays + 'g rimasti') + '</span>' : '<span style="font-size:11px;color:#52525b">Nessuna scadenza</span>') +
        '</div>' +
        '<div class="ev3-proj-prog">' +
          '<div class="ev3-proj-prog-label"><span>Avanzamento</span><span style="color:' + progColor + ';font-weight:700">' + prog + '%</span></div>' +
          '<div class="ev3-proj-prog-bar"><div class="ev3-proj-prog-fill" style="width:' + prog + '%;background:' + progColor + '"></div></div>' +
        '</div>' +
        '<div class="ev3-proj-prog">' +
          '<div class="ev3-proj-prog-label"><span>Budget</span><span>' + fmt(+(p.spent || 0)) + ' / ' + fmt(+(p.budget || 0)) + ' <span style="color:' + (budPct > 90 ? '#ef4444' : '#71717a') + '">(' + budPct + '%)</span></span></div>' +
          '<div class="ev3-proj-prog-bar"><div class="ev3-proj-prog-fill" style="width:' + budPct + '%;background:' + (budPct > 90 ? '#ef4444' : budPct > 70 ? '#fbbf24' : '#60a5fa') + '"></div></div>' +
        '</div>' +
        '<div class="ev3-proj-footer">' +
          '<div style="display:flex;gap:4px">' +
            '<button style="padding:5px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#a1a1aa;cursor:pointer;font-size:11px" onclick="ev3EditProject(\'' + p.id + '\')">✏️ Modifica</button>' +
            '<button style="padding:5px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#a1a1aa;cursor:pointer;font-size:11px" onclick="ev3UpdateProgress(\'' + p.id + '\')">📊 Progresso</button>' +
          '</div>' +
          '<button style="padding:5px;border-radius:7px;border:1px solid rgba(239,68,68,.2);background:rgba(239,68,68,.08);color:#ef4444;cursor:pointer;font-size:12px" onclick="ev3DeleteProject(\'' + p.id + '\')">🗑</button>' +
        '</div>' +
      '</div>';
    }).join('') || '<div style="text-align:center;padding:60px;color:#52525b"><div style="font-size:36px;margin-bottom:12px;opacity:.2">📁</div>Nessun progetto</div>';

    var tabBtns = [['all','🗂 Tutti'],['inprogress','⚡ Attivi'],['todo','📋 Attesa'],['done','✅ Completati'],['onhold','⏸️ Pausa']].map(function (t) {
      var cnt = (t[0] === 'all' ? projects : projects.filter(function(p){return p.status===t[0];})).length;
      return '<button onclick="ev3ProjFilter(\'' + t[0] + '\')" style="padding:7px 16px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:600;transition:.15s;' + (projFilter === t[0] ? 'background:var(--bg-card);color:#fbbf24' : 'background:none;color:#71717a') + '">' + t[1] + ' <span style="opacity:.5;font-size:10px">(' + cnt + ')</span></button>';
    }).join('');

    section.innerHTML =
      '<div class="ev1-section-header" style="margin-bottom:20px">' +
        '<div><div class="ev1-section-title">📁 Progetti</div><div class="ev1-section-sub">' + active + ' attivi · Budget totale ' + fmt(totalBudget) + ' · Speso ' + fmt(totalSpent) + '</div></div>' +
        '<div class="ev1-section-actions"><button class="ev1-btn ev1-btn-primary" onclick="ev3NewProject()">+ Nuovo Progetto</button></div>' +
      '</div>' +
      '<div style="display:flex;gap:3px;background:rgba(255,255,255,.04);padding:3px;border-radius:10px;width:fit-content;margin-bottom:20px">' + tabBtns + '</div>' +
      '<div class="ev3-proj-grid">' + cards + '</div>';
  }

  window.ev3ProjFilter = function (f) { projFilter = f; var s = $id('view-projects'); if (s) { s._ev3ProjBuilt = false; renderProjects(); } };

  function openProjectModal(p) {
    var isNew = !p; if (!p) p = { id: uid(), status: 'todo', priority: 'medium', progress: 0 };
    var statusOpts   = ['inprogress','todo','done','onhold'].map(function(s){return '<option value="'+s+'"'+(p.status===s?' selected':'')+'>'+s+'</option>';}).join('');
    var priorityOpts = ['high','medium','low'].map(function(s){return '<option value="'+s+'"'+(p.priority===s?' selected':'')+'>'+s+'</option>';}).join('');
    openModal('ev3-proj-modal', isNew ? '+ Nuovo Progetto' : 'Modifica — ' + esc(p.name || ''),
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<div style="grid-column:1/-1"><label class="ev1-label">Nome progetto *</label><input id="ev3-p-name" class="ev1-input" value="' + esc(p.name || '') + '" placeholder="Es: Campagna Natale 2025"></div>' +
        '<div><label class="ev1-label">Cliente / Committente</label><input id="ev3-p-client" class="ev1-input" value="' + esc(p.client || '') + '" placeholder="Interno / Nome cliente"></div>' +
        '<div><label class="ev1-label">Stato</label><select id="ev3-p-status" class="ev1-input">' + statusOpts + '</select></div>' +
        '<div><label class="ev1-label">Priorità</label><select id="ev3-p-priority" class="ev1-input">' + priorityOpts + '</select></div>' +
        '<div><label class="ev1-label">Budget €</label><input id="ev3-p-budget" class="ev1-input" type="number" value="' + (p.budget || '') + '" placeholder="0"></div>' +
        '<div><label class="ev1-label">Speso €</label><input id="ev3-p-spent" class="ev1-input" type="number" value="' + (p.spent || '') + '" placeholder="0"></div>' +
        '<div><label class="ev1-label">Scadenza</label><input id="ev3-p-deadline" class="ev1-input" type="date" value="' + (p.deadline || '') + '"></div>' +
        '<div><label class="ev1-label">Avanzamento %</label><input id="ev3-p-prog" class="ev1-input" type="number" min="0" max="100" value="' + (p.progress || 0) + '"></div>' +
        '<div style="grid-column:1/-1"><label class="ev1-label">Descrizione</label><textarea id="ev3-p-desc" class="ev1-input" rows="2">' + esc(p.desc || '') + '</textarea></div>' +
      '</div>',
      function () {
        var projects = getProjects();
        var updated = { id: p.id, name: inp('ev3-p-name'), client: inp('ev3-p-client'), status: $id('ev3-p-status').value, priority: $id('ev3-p-priority').value, budget: parseFloat(inp('ev3-p-budget')) || 0, spent: parseFloat(inp('ev3-p-spent')) || 0, deadline: inp('ev3-p-deadline'), progress: Math.min(parseInt(inp('ev3-p-prog')) || 0, 100), desc: inp('ev3-p-desc'), createdAt: p.createdAt || new Date().toISOString() };
        if (!updated.name) { toast('Inserisci il nome del progetto', 'error'); return; }
        if (isNew) projects.push(updated);
        else { var idx = projects.findIndex(function(x){return x.id===p.id;}); if(idx>=0) projects[idx]=updated; else projects.push(updated); }
        saveProjects(projects);
        closeEv3Modal('ev3-proj-modal');
        var s = $id('view-projects'); if (s) { s._ev3ProjBuilt = false; renderProjects(); }
        toast(isNew ? 'Progetto creato' : 'Progetto aggiornato', 'success');
      }
    );
  }

  window.ev3NewProject    = function ()   { openProjectModal(null); };
  window.ev3EditProject   = function (id) { openProjectModal(getProjects().find(function(p){return p.id===id;})); };
  window.ev3DeleteProject = function (id) {
    saveProjects(getProjects().filter(function(p){return p.id!==id;}));
    var s = $id('view-projects'); if (s) { s._ev3ProjBuilt = false; renderProjects(); }
    toast('Progetto eliminato', 'success');
  };

  window.ev3UpdateProgress = function (id) {
    var p = getProjects().find(function(x){return x.id===id;}); if (!p) return;
    openModal('ev3-prog-modal', '📊 Aggiorna Progresso — ' + esc(p.name),
      '<div style="margin-bottom:16px"><label class="ev1-label">Avanzamento % (' + p.progress + '% attuale)</label><input id="ev3-prog-val" class="ev1-input" type="range" min="0" max="100" value="' + p.progress + '" oninput="$id(\'ev3-prog-disp\').textContent=this.value+\'%\'"><div id="ev3-prog-disp" style="text-align:center;font-size:24px;font-weight:800;color:#fbbf24;margin-top:8px">' + p.progress + '%</div></div>' +
      '<div><label class="ev1-label">Note aggiornamento</label><input id="ev3-prog-note" class="ev1-input" placeholder="Es: Completata fase 1..."></div>',
      function () {
        var projects = getProjects();
        var idx = projects.findIndex(function(x){return x.id===id;});
        if (idx >= 0) { projects[idx].progress = parseInt($id('ev3-prog-val').value) || 0; if (projects[idx].progress >= 100) projects[idx].status = 'done'; saveProjects(projects); }
        closeEv3Modal('ev3-prog-modal');
        var s = $id('view-projects'); if (s) { s._ev3ProjBuilt = false; renderProjects(); }
        toast('Progresso aggiornato: ' + projects[idx].progress + '%', 'success');
      }
    );
  };

  /* ═══════════════════════════════════════════════════
     3. MACHINE INTELLIGENCE — inject into view-equipment
  ═══════════════════════════════════════════════════ */
  function buildMachineIntel() {
    var section = $id('view-equipment');
    if (!section || section._ev3MachineIntelBuilt) return;
    section._ev3MachineIntelBuilt = true;

    ensureMachines();
    var machines = getMachines();
    var logs     = getMaintLogs();

    /* Health score per machine */
    var healthItems = machines.map(function (m) {
      var maintDays  = m.nextMaint ? daysUntil(m.nextMaint) : null;
      var health     = m.status === 'offline' ? 0 : m.status === 'maintenance' ? 40 : maintDays !== null && maintDays < 0 ? 50 : maintDays !== null && maintDays < 7 ? 75 : 95;
      var healthColor = health >= 80 ? '#22c55e' : health >= 50 ? '#fbbf24' : '#ef4444';
      var lastLog    = logs.filter(function (l) { return l.machineId === m.id; }).slice(-1)[0];
      return '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.04)">' +
        '<div style="width:8px;height:8px;border-radius:50%;background:' + (m.status === 'online' ? '#22c55e' : m.status === 'maintenance' ? '#fbbf24' : '#71717a') + ';flex-shrink:0"></div>' +
        '<div style="flex:1"><div style="font-size:12px;font-weight:600;color:#e5e5e5">' + esc(m.name) + '</div><div style="font-size:10px;color:#52525b">' + (lastLog ? 'Ultima manutenzione: ' + dtIT(lastLog.date) : 'Nessuna manutenzione registrata') + '</div></div>' +
        '<div style="text-align:right">' +
          '<div style="font-size:14px;font-weight:800;color:' + healthColor + '">' + health + '%</div>' +
          '<div style="font-size:10px;color:#71717a">health score</div>' +
        '</div>' +
        '<div style="width:60px"><div style="background:rgba(255,255,255,.06);border-radius:99px;height:6px;overflow:hidden"><div style="height:100%;border-radius:99px;background:' + healthColor + ';width:' + health + '%"></div></div></div>' +
      '</div>';
    }).join('');

    var totalMaintCost = logs.reduce(function(s,l){return s+(+l.cost||0);},0);
    var panel = document.createElement('div');
    panel.id = 'ev3-machine-intel-panel';
    panel.innerHTML =
      '<div style="background:rgba(251,191,36,.05);border:1px solid rgba(251,191,36,.15);border-radius:14px;padding:18px;margin-bottom:20px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
          '<div style="font-size:14px;font-weight:700;color:#fbbf24;display:flex;align-items:center;gap:8px">🤖 AI Machine Intelligence</div>' +
          '<button onclick="App.navigate(\'workflow_dashboard\')" style="padding:5px 14px;border-radius:8px;border:1px solid rgba(251,191,36,.3);background:rgba(251,191,36,.08);color:#fbbf24;cursor:pointer;font-size:11px;font-weight:700">🏭 Production Hub →</button>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">' +
          '<div style="background:rgba(255,255,255,.04);border-radius:10px;padding:12px;text-align:center"><div style="font-size:20px;font-weight:800;color:#22c55e">' + machines.filter(function(m){return m.status==='online';}).length + '</div><div style="font-size:11px;color:#71717a">Online</div></div>' +
          '<div style="background:rgba(255,255,255,.04);border-radius:10px;padding:12px;text-align:center"><div style="font-size:20px;font-weight:800;color:#fbbf24">' + machines.filter(function(m){return m.status==='maintenance';}).length + '</div><div style="font-size:11px;color:#71717a">Manutenzione</div></div>' +
          '<div style="background:rgba(255,255,255,.04);border-radius:10px;padding:12px;text-align:center"><div style="font-size:20px;font-weight:800;color:#fbbf24">' + fmt(totalMaintCost) + '</div><div style="font-size:11px;color:#71717a">Costi Manutenzione</div></div>' +
        '</div>' +
        '<div style="background:rgba(255,255,255,.03);border-radius:10px;overflow:hidden">' + (healthItems || '<div style="padding:16px;text-align:center;color:#52525b">Nessuna macchina</div>') + '</div>' +
      '</div>';

    section.insertBefore(panel, section.firstChild);
  }

  /* ═══════════════════════════════════════════════════
     NAV HOOK + BOOT
  ═══════════════════════════════════════════════════ */
  function dispatch(id) {
    if (id === 'workflow_dashboard') buildProductionHub();
    if (id === 'projects')          buildProjects();
    if (id === 'equipment')         buildMachineIntel();
  }

  function hookNav() {
    if (window._proxEV3NavHooked) return;
    if (typeof App === 'undefined' || !App.navigate) return;
    var _orig = App.navigate;
    App.navigate = function (section) {
      var r = _orig.apply(this, arguments);
      setTimeout(function () { dispatch(section); }, 80);
      return r;
    };
    window._proxEV3NavHooked = true;
  }

  function boot() {
    injectCSS();
    function init() {
      hookNav();
      ensureMachines();
      ensureProjects();
      setTimeout(function () {
        buildProductionHub();
        buildProjects();
        buildMachineIntel();
      }, 900);
      var active = document.querySelector('.section-view.active');
      if (active) { var id = active.id.replace('view-', ''); setTimeout(function () { dispatch(id); }, 250); }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 300); });
    } else {
      setTimeout(init, 300);
    }
  }

  setTimeout(boot, 6000);

})();

