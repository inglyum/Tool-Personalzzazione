
// ingly-prox.js — INGLY OS PRO X · v2
// Aggiunge: Command Center, CRM Pro, Production Scheduler, Stock AI,
//           Preventivi AI, Analytics Pro, Marketing Hub, AI Agents, Automazioni
// Tecnica sicura: .section-view standard, onclick App.navigate, nessun wrap
(function () {
  'use strict';
  if (window._inglyProX) return;
  window._inglyProX = true;

  /* ═══════════════════════════════════════════════════════════
     1. CSS
  ═══════════════════════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('ingly-prox-css')) return;
    var s = document.createElement('style');
    s.id = 'ingly-prox-css';
    s.textContent = `
/* ── Layout full-width fix ── */
html,body{width:100%!important;max-width:100%!important;margin:0!important}
#main-layout{display:flex!important;width:100%!important;max-width:100%!important}
#content{flex:1 1 0%!important;min-width:0!important;max-width:none!important;margin:0!important}
#content-inner{flex:1!important;overflow-y:auto!important;padding:24px!important}

/* ── PRO X nav group ── */
.prox-nav-group{border-top:1px solid var(--border);margin-top:8px;padding-top:4px}
.prox-nav-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--primary);padding:8px 16px 4px;font-weight:700;opacity:.9}
.prox-nav-item{display:flex;align-items:center;gap:9px;padding:7px 10px;border-radius:var(--radius-sm);cursor:pointer;color:var(--text-muted);font-size:13px;transition:.15s;user-select:none}
.prox-nav-item:hover{background:var(--bg-card2);color:var(--text)}
.prox-nav-item.active{background:var(--primary-dim);color:var(--primary);font-weight:600}

/* ── Section base ── */
.prox-section{padding:24px;display:flex;flex-direction:column;gap:20px}
.prox-ph{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.prox-title{font-size:20px;font-weight:700;color:#fff;display:flex;align-items:center;gap:10px}
.prox-subtitle{font-size:12px;color:var(--text-muted);margin-top:3px}
.prox-actions{display:flex;gap:8px;flex-wrap:wrap}

/* ── Cards ── */
.px-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px}
.px-card-title{font-size:11px;text-transform:uppercase;letter-spacing:.7px;color:var(--text-dim);font-weight:700;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.px-card:hover{border-color:var(--border2)}

/* ── Grid ── */
.px-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.px-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.px-grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
@media(max-width:1200px){.px-grid-4{grid-template-columns:repeat(2,1fr)}}
@media(max-width:900px){.px-grid-3{grid-template-columns:repeat(2,1fr)}.px-grid-2{grid-template-columns:1fr}}
@media(max-width:600px){.px-grid-4,.px-grid-3{grid-template-columns:1fr}}

/* ── KPI cards ── */
.px-kpi{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:18px;position:relative;overflow:hidden;transition:.2s}
.px-kpi:hover{border-color:var(--primary-border);transform:translateY(-1px)}
.px-kpi-value{font-size:clamp(26px,3vw,36px);font-weight:800;color:#fff;line-height:1;margin-bottom:4px}
.px-kpi-label{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}
.px-kpi-trend{font-size:11px;margin-top:8px;font-weight:600}
.px-kpi-trend.up{color:var(--green)}.px-kpi-trend.down{color:var(--red)}
.px-kpi::before{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:var(--primary);opacity:.4}
.px-kpi-icon{position:absolute;top:14px;right:14px;font-size:22px;opacity:.3}

/* ── Health score ── */
.hs-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700}
.hs-vip{background:#fbbf2420;color:#fbbf24;border:1px solid #fbbf2440}
.hs-attivo{background:#22c55e20;color:#22c55e;border:1px solid #22c55e40}
.hs-neutro{background:#f9731620;color:#f97316;border:1px solid #f9731640}
.hs-rischio{background:#ef444420;color:#ef4444;border:1px solid #ef444440}

/* ── Buttons ── */
.px-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:var(--radius-sm);border:none;cursor:pointer;font-size:13px;font-weight:600;transition:.18s}
.px-btn-primary{background:var(--primary);color:#000}
.px-btn-primary:hover{filter:brightness(1.1)}
.px-btn-secondary{background:var(--bg-card2);color:var(--text);border:1px solid var(--border2)}
.px-btn-secondary:hover{border-color:var(--primary-border)}
.px-btn-sm{padding:4px 10px;font-size:12px}
.px-btn-danger{background:#ef444420;color:var(--red);border:1px solid #ef444430}
.px-btn[disabled]{opacity:.4;cursor:not-allowed}

/* ── Tables ── */
.px-table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius)}
.px-table{width:100%;border-collapse:collapse;font-size:13px}
.px-table th{background:var(--bg-card2);padding:9px 14px;text-align:left;font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;font-weight:700;white-space:nowrap}
.px-table td{padding:10px 14px;border-top:1px solid var(--border);vertical-align:middle}
.px-table tr:hover td{background:var(--bg-card2)}

/* ── Form ── */
.px-input{width:100%;background:var(--bg-card2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:8px 12px;color:var(--text);font-size:13px;outline:none;font-family:inherit;box-sizing:border-box}
.px-input:focus{border-color:var(--primary-border);box-shadow:0 0 0 3px var(--primary-dim)}
.px-label{font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;display:block}
.px-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:28px}
textarea.px-input{resize:vertical;min-height:90px}

/* ── Tabs ── */
.px-tabs{display:flex;gap:2px;background:var(--bg-card2);padding:3px;border-radius:var(--radius-sm);width:fit-content;margin-bottom:18px}
.px-tab{padding:5px 14px;border-radius:6px;border:none;background:transparent;color:var(--text-muted);cursor:pointer;font-size:12px;font-weight:600;transition:.15s}
.px-tab.active{background:var(--bg-card);color:var(--primary)}

/* ── Chat bubbles (AI Agents) ── */
.px-chat{display:flex;flex-direction:column;gap:10px;max-height:420px;overflow-y:auto;padding:4px 0}
.px-msg{display:flex;gap:10px;align-items:flex-start}
.px-msg.user{flex-direction:row-reverse}
.px-msg-bubble{max-width:80%;padding:10px 14px;border-radius:10px;font-size:13px;line-height:1.5;white-space:pre-wrap}
.px-msg.agent .px-msg-bubble{background:var(--bg-card2);color:var(--text);border:1px solid var(--border)}
.px-msg.user .px-msg-bubble{background:var(--primary-dim);color:var(--primary);border:1px solid var(--primary-border)}
.px-typing{display:flex;gap:4px;padding:10px 14px;background:var(--bg-card2);border-radius:10px;width:fit-content}
.px-typing span{width:6px;height:6px;border-radius:50%;background:var(--text-dim);animation:pxDot .8s infinite}
.px-typing span:nth-child(2){animation-delay:.15s}
.px-typing span:nth-child(3){animation-delay:.3s}
@keyframes pxDot{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-4px)}}

/* ── Priority row ── */
.px-priority-row{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-card);transition:.15s;margin-bottom:6px}
.px-priority-row:hover{border-color:var(--border2)}
.px-priority-row.urgent{border-left:3px solid var(--red)!important}
.px-priority-row.today{border-left:3px solid var(--orange)!important}
.px-priority-row.upcoming{border-left:3px solid var(--green)!important}

/* ── Alert rows ── */
.px-alert{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:var(--radius-sm);margin-bottom:6px;font-size:13px}
.px-alert.red{background:#ef444410;border:1px solid #ef444430;color:var(--red)}
.px-alert.orange{background:#f9731610;border:1px solid #f9731630;color:#f97316}
.px-alert.yellow{background:#fbbf2410;border:1px solid #fbbf2430;color:var(--primary)}

/* ── Kanban ── */
.px-kanban{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;align-items:start}
.px-kanban-col{background:var(--bg-card2);border-radius:var(--radius);padding:10px;min-height:150px}
.px-kanban-col-hdr{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;color:var(--text-dim)}
.px-kanban-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 12px;margin-bottom:6px;font-size:12px;cursor:pointer;transition:.15s}
.px-kanban-card:hover{border-color:var(--primary-border)}
@media(max-width:1100px){.px-kanban{grid-template-columns:repeat(3,1fr)}}
@media(max-width:700px){.px-kanban{grid-template-columns:1fr 1fr}}

/* ── SVG chart ── */
.px-chart-wrap{width:100%;overflow:hidden;border-radius:var(--radius-sm)}
.px-chart-tooltip{position:fixed;background:var(--bg-card);border:1px solid var(--border2);border-radius:6px;padding:6px 10px;font-size:11px;color:var(--text);pointer-events:none;z-index:9999;display:none}

/* ── Automation card ── */
.px-auto-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;display:flex;align-items:flex-start;gap:14px}
.px-auto-toggle{position:relative;width:38px;height:22px;flex-shrink:0;margin-top:2px}
.px-auto-toggle input{opacity:0;width:0;height:0}
.px-auto-slider{position:absolute;inset:0;background:var(--border2);border-radius:99px;cursor:pointer;transition:.2s}
.px-auto-toggle input:checked+.px-auto-slider{background:var(--green)}
.px-auto-slider::before{content:'';position:absolute;width:16px;height:16px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s}
.px-auto-toggle input:checked+.px-auto-slider::before{transform:translateX(16px)}

/* ── Stock bar ── */
.px-stock-bar{height:6px;background:var(--bg-card2);border-radius:99px;overflow:hidden;margin-top:6px}
.px-stock-fill{height:100%;border-radius:99px;transition:.5s}

/* ── Margin indicator ── */
.px-margin-cell{font-size:11px;font-weight:700;padding:2px 7px;border-radius:99px;display:inline-block}
.px-margin-cell.high{background:#22c55e20;color:#22c55e}
.px-margin-cell.mid{background:#fbbf2420;color:#fbbf24}
.px-margin-cell.low{background:#ef444420;color:#ef4444}

/* ── Agent card ── */
.px-agent-card{background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;cursor:pointer;transition:.15s;display:flex;align-items:center;gap:10px}
.px-agent-card:hover,.px-agent-card.active{border-color:var(--primary-border);background:var(--primary-dim)}
.px-agent-dot{width:7px;height:7px;border-radius:50%;background:var(--green);flex-shrink:0}

/* ── Insight card ── */
.px-insight{background:var(--bg-card2);border-left:3px solid var(--primary);border-radius:0 var(--radius-sm) var(--radius-sm) 0;padding:12px 14px;margin-bottom:8px;font-size:13px;color:var(--text)}

/* ── Loading ── */
.px-loading{display:flex;align-items:center;gap:8px;color:var(--text-dim);font-size:13px;padding:12px}
.px-spinner{width:16px;height:16px;border:2px solid var(--border2);border-top-color:var(--primary);border-radius:50%;animation:pxSpin .6s linear infinite;flex-shrink:0}
@keyframes pxSpin{to{transform:rotate(360deg)}}

/* Misc */
.px-divider{height:1px;background:var(--border);border:none;margin:16px 0}
.px-empty{text-align:center;padding:40px;color:var(--text-dim);font-size:13px}
.px-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}
.px-badge.green{background:#22c55e20;color:#22c55e}
.px-badge.red{background:#ef444420;color:#ef4444}
.px-badge.yellow{background:#fbbf2420;color:#fbbf24}
.px-badge.blue{background:#3b82f620;color:#3b82f6}
.px-badge.gray{background:#88888820;color:var(--text-muted)}
`;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════════════════════
     2. UTILITIES
  ═══════════════════════════════════════════════════════════ */
  var STORE = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    arr: function (k) { return STORE.get(k) || []; }
  };

  function fmtEur(n) { return '€' + (+(n || 0)).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function fmtDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('it-IT'); } catch (e) { return d; } }
  function daysDiff(d) { if (!d) return 999; return Math.round((new Date(d) - new Date()) / 86400000); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function callAI(prompt, systemMsg, onChunk, onDone) {
    var key = localStorage.getItem('ingly_backend_api_key') || localStorage.getItem('ingly_api_key') || '';
    if (!key) { onDone && onDone('⚠️ Configura la chiave API nelle Impostazioni.'); return; }
    fetch('/api/ai/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        provider: 'anthropic',
        payload: {
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: systemMsg || 'Sei un assistente ERP per artigiani italiani. Rispondi in italiano, in modo conciso e pratico.',
          messages: [{ role: 'user', content: prompt }]
        }
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      var text = (data.content && data.content[0] && data.content[0].text) ||
        (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
        JSON.stringify(data);
      if (onChunk) onChunk(text);
      if (onDone) onDone(text);
    }).catch(function (e) {
      var msg = '❌ Errore AI: ' + e.message;
      if (onChunk) onChunk(msg);
      if (onDone) onDone(msg);
    });
  }

  function healthScore(client) {
    var orders = STORE.arr('ingly_orders').filter(function (o) {
      return o.client === client.id || o.clientName === client.name;
    });
    var score = 0;
    var lastOrder = orders.sort(function (a, b) { return new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0); })[0];
    if (lastOrder) {
      var days = daysDiff(lastOrder.createdAt || lastOrder.date);
      if (days > 0) days = -days;
      if (days > -30) score += 40;
      else if (days > -60) score += 20;
      else if (days > -90) score += 10;
    }
    score += Math.min(30, orders.length * 3);
    var total = orders.reduce(function (s, o) { return s + (+(o.total || o.price || 0)); }, 0);
    if (total > 1000) score += 30;
    else if (total > 500) score += 20;
    else if (total > 100) score += 10;
    score = Math.min(100, score);
    var label = score >= 80 ? 'VIP' : score >= 61 ? 'Attivo' : score >= 31 ? 'Neutro' : 'A rischio';
    var cls = score >= 80 ? 'hs-vip' : score >= 61 ? 'hs-attivo' : score >= 31 ? 'hs-neutro' : 'hs-rischio';
    return { score: score, label: label, cls: cls };
  }

  /* ═══════════════════════════════════════════════════════════
     3. SECTIONS HTML
  ═══════════════════════════════════════════════════════════ */
  function buildSections() {
    var ci = document.getElementById('content-inner');
    if (!ci) return;

    var defs = [
      { id: 'prox-command', build: buildCommandCenter },
      { id: 'prox-crm', build: buildCRMPro },
      { id: 'prox-production', build: buildProductionScheduler },
      { id: 'prox-stock', build: buildStockAI },
      { id: 'prox-quotes', build: buildPreventiviAI },
      { id: 'prox-analytics', build: buildAnalyticsPro },
      { id: 'prox-marketing', build: buildMarketingHub },
      { id: 'prox-agents', build: buildAIAgents },
      { id: 'prox-automations', build: buildAutomazioni }
    ];

    defs.forEach(function (d) {
      if (document.getElementById(d.id)) return;
      var div = document.createElement('div');
      div.id = d.id;
      div.className = 'section-view';
      try { div.innerHTML = d.build(); } catch (e) { div.innerHTML = '<div class="prox-section"><p style="color:var(--red)">Errore caricamento sezione: ' + e.message + '</p></div>'; }
      ci.appendChild(div);
    });

    // Bind dynamic events after all sections are in DOM
    bindCommandCenterEvents();
    bindCRMEvents();
    bindProductionEvents();
    bindStockEvents();
    bindQuotesEvents();
    bindAnalyticsEvents();
    bindMarketingEvents();
    bindAgentsEvents();
    bindAutomationsEvents();
  }

  /* ── COMMAND CENTER ── */
  function buildCommandCenter() {
    var orders = STORE.arr('ingly_orders');
    var active = orders.filter(function (o) { return o.status !== 'completed' && o.status !== 'paid' && o.status !== 'consegnato'; });
    active.sort(function (a, b) { return new Date(a.deadline || '2099') - new Date(b.deadline || '2099'); });
    var top5 = active.slice(0, 5);

    var quotes = STORE.arr('ingly_quotes');
    var staleQuotes = quotes.filter(function (q) {
      var d = daysDiff(q.createdAt);
      return (q.status === 'sent' || q.status === 'open' || !q.status) && d < -7;
    });
    var products = STORE.arr('ingly_products');
    var lowStock = products.filter(function (p) { return (p.qty || 0) < (p.minQty || 5); });

    var priorityRows = top5.map(function (o) {
      var d = daysDiff(o.deadline);
      var cls = d < 0 ? 'urgent' : d === 0 ? 'today' : 'upcoming';
      var label = d < 0 ? '🔴 ' + Math.abs(d) + 'gg scaduto' : d === 0 ? '🟠 Oggi' : '🟢 ' + d + 'gg';
      return '<div class="px-priority-row ' + cls + '">' +
        '<div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text)">' + esc(o.title || o.name || 'Ordine') + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted)">' + esc(o.clientName || o.client || '') + '</div></div>' +
        '<span style="font-size:11px;white-space:nowrap">' + label + '</span>' +
        '<button class="px-btn px-btn-sm px-btn-secondary" onclick="App.navigate(\'orders\')" style="flex-shrink:0">Vedi →</button></div>';
    }).join('') || '<div class="px-empty">Nessun ordine attivo 🎉</div>';

    var alerts = '';
    if (active.filter(function (o) { return daysDiff(o.deadline) < 0; }).length > 0) {
      alerts += '<div class="px-alert red">⚠️ <strong>' + active.filter(function (o) { return daysDiff(o.deadline) < 0; }).length + ' ordini</strong> in ritardo sulla scadenza</div>';
    }
    if (lowStock.length > 0) {
      alerts += '<div class="px-alert orange">📦 <strong>' + lowStock.length + ' materiali</strong> sotto la soglia minima di stock</div>';
    }
    if (staleQuotes.length > 0) {
      alerts += '<div class="px-alert yellow">📄 <strong>' + staleQuotes.length + ' preventivi</strong> aperti da più di 7 giorni senza risposta</div>';
    }
    if (!alerts) alerts = '<div style="color:var(--text-dim);font-size:13px">✅ Nessun alert attivo</div>';

    // Revenue spark data
    var now = new Date();
    var monthRevenue = orders.filter(function (o) {
      var d = new Date(o.completedAt || o.createdAt || o.date || 0);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() &&
        (o.status === 'completed' || o.status === 'paid');
    }).reduce(function (s, o) { return s + (+(o.total || o.price || 0)); }, 0);

    var prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var prevRevenue = orders.filter(function (o) {
      var d = new Date(o.completedAt || o.createdAt || o.date || 0);
      return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear() &&
        (o.status === 'completed' || o.status === 'paid');
    }).reduce(function (s, o) { return s + (+(o.total || o.price || 0)); }, 0);

    var pct = prevRevenue > 0 ? Math.round((monthRevenue - prevRevenue) / prevRevenue * 100) : 0;
    var pctStr = (pct >= 0 ? '+' : '') + pct + '%';
    var pctCls = pct >= 0 ? 'up' : 'down';

    var goal = parseFloat(localStorage.getItem('prox_monthly_goal') || '0');
    var goalPct = goal > 0 ? Math.min(100, Math.round(monthRevenue / goal * 100)) : 0;
    var goalBar = goal > 0 ?
      '<div style="margin-top:8px"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim);margin-bottom:4px"><span>Obiettivo: ' + fmtEur(goal) + '</span><span>' + goalPct + '%</span></div>' +
      '<div class="px-stock-bar"><div class="px-stock-fill" style="width:' + goalPct + '%;background:' + (goalPct >= 100 ? 'var(--green)' : goalPct >= 60 ? 'var(--primary)' : 'var(--red)') + '"></div></div></div>' : '';

    return '<div class="prox-section">' +
      '<div class="prox-ph"><div><div class="prox-title">🧠 Command Center</div><div class="prox-subtitle">Panoramica operativa · ' + new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) + '</div></div>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
      '<input class="px-input" id="prox-goal-input" type="number" placeholder="Obiettivo €/mese" style="width:160px" value="' + (goal || '') + '">' +
      '<button class="px-btn px-btn-primary" id="prox-brief-btn">✨ Morning Brief</button></div></div>' +

      '<div id="prox-brief-card" class="px-card" style="display:none">' +
      '<div class="px-card-title">🤖 Morning Intelligence Brief <span style="display:flex;gap:6px"><button class="px-btn px-btn-sm px-btn-secondary" id="prox-brief-refresh">↻ Rigenera</button><button class="px-btn px-btn-sm px-btn-secondary" onclick="document.getElementById(\'prox-brief-card\').style.display=\'none\'">✕</button></span></div>' +
      '<div id="prox-brief-output" class="px-loading"><div class="px-spinner"></div> Analisi in corso...</div></div>' +

      '<div class="px-grid-4">' +
      '<div class="px-kpi"><div class="px-kpi-icon">📦</div><div class="px-kpi-label">Ordini Attivi</div><div class="px-kpi-value">' + active.length + '</div></div>' +
      '<div class="px-kpi"><div class="px-kpi-icon">💰</div><div class="px-kpi-label">Revenue Mese</div><div class="px-kpi-value">' + fmtEur(monthRevenue) + '</div><div class="px-kpi-trend ' + pctCls + '">' + pctStr + ' vs mese scorso</div>' + goalBar + '</div>' +
      '<div class="px-kpi"><div class="px-kpi-icon">📄</div><div class="px-kpi-label">Preventivi Aperti</div><div class="px-kpi-value">' + quotes.filter(function (q) { return q.status !== 'accepted' && q.status !== 'rejected'; }).length + '</div></div>' +
      '<div class="px-kpi"><div class="px-kpi-icon">⚠️</div><div class="px-kpi-label">Alert Attivi</div><div class="px-kpi-value" style="color:var(--red)">' + (active.filter(function (o) { return daysDiff(o.deadline) < 0; }).length + lowStock.length + staleQuotes.length) + '</div></div>' +
      '</div>' +

      '<div class="px-grid-2">' +
      '<div class="px-card"><div class="px-card-title">🚨 Coda Priorità</div>' + priorityRows + '</div>' +
      '<div class="px-card"><div class="px-card-title">⚡ Alert Stack</div>' + alerts + '<hr class="px-divider"><div style="font-size:11px;color:var(--text-dim)">Aggiornato: ' + new Date().toLocaleTimeString('it-IT') + '</div></div>' +
      '</div>' +

      '<div class="px-card"><div class="px-card-title">⚡ Azioni Rapide</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<button class="px-btn px-btn-primary" onclick="App.navigate(\'prox-quotes\')">💡 Nuovo Preventivo AI</button>' +
      '<button class="px-btn px-btn-secondary" onclick="App.navigate(\'orders\')">📦 Gestisci Ordini</button>' +
      '<button class="px-btn px-btn-secondary" onclick="App.navigate(\'prox-crm\')">👥 CRM Pro</button>' +
      '<button class="px-btn px-btn-secondary" onclick="App.navigate(\'prox-agents\')">🤖 AI Agents</button>' +
      '<button class="px-btn px-btn-secondary" onclick="App.navigate(\'prox-production\')">🏭 Production</button>' +
      '</div></div></div>';
  }

  /* ── CRM PRO ── */
  function buildCRMPro() {
    var clients = STORE.arr('ingly_clients');
    var clientCards = clients.length === 0 ?
      '<div class="px-empty">Nessun cliente trovato. Aggiungi clienti nella sezione CRM.</div>' :
      clients.slice(0, 50).map(function (c) {
        var hs = healthScore(c);
        var orders = STORE.arr('ingly_orders').filter(function (o) { return o.client === c.id || o.clientName === c.name; });
        var total = orders.reduce(function (s, o) { return s + (+(o.total || o.price || 0)); }, 0);
        var last = orders.sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); })[0];
        var initials = (c.name || '?').split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
        return '<div class="px-card" style="padding:14px 16px">' +
          '<div style="display:flex;align-items:flex-start;gap:12px">' +
          '<div style="width:38px;height:38px;border-radius:50%;background:var(--primary-dim);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--primary);flex-shrink:0">' + initials + '</div>' +
          '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(c.name || '') + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted)">' + esc(c.email || c.phone || '') + '</div></div>' +
          '<span class="hs-badge ' + hs.cls + '">' + hs.score + ' ' + hs.label + '</span></div>' +
          (function() {
            var lastDays = last ? -daysDiff(last.createdAt || last.date) : 999;
            var lastColor = lastDays < 30 ? 'var(--green)' : lastDays < 90 ? 'var(--orange,#f97316)' : 'var(--red)';
            return '<div style="display:flex;justify-content:space-between;margin-top:10px;font-size:11px;color:var(--text-dim)">' +
              '<span>' + orders.length + ' ordini</span><span>' + fmtEur(total) + '</span>' +
              '<span style="color:' + lastColor + '">' + (last ? fmtDate(last.createdAt || last.date) : 'Mai') + '</span></div>';
          })()+
          '<button class="px-btn px-btn-sm px-btn-secondary prox-nba-btn" data-name="' + esc(c.name) + '" data-total="' + total + '" data-orders="' + orders.length + '" style="margin-top:10px;width:100%">🤖 Prossima Azione AI</button></div>';
      }).join('');

    // Kanban
    var kanbanCols = ['Lead', 'Prospect', 'Attivo', 'VIP', 'Dormiente'];
    var kanbanCards = { Lead: [], Prospect: [], Attivo: [], VIP: [], Dormiente: [] };
    clients.forEach(function (c) {
      var hs = healthScore(c);
      var stage = hs.label === 'VIP' ? 'VIP' : hs.label === 'Attivo' ? 'Attivo' : hs.label === 'Neutro' ? 'Prospect' : 'Dormiente';
      if (!c.hasOrders) stage = 'Lead';
      (kanbanCards[stage] = kanbanCards[stage] || []).push(c);
    });

    var kanban = '<div class="px-kanban">' + kanbanCols.map(function (col) {
      return '<div class="px-kanban-col"><div class="px-kanban-col-hdr">' + col + ' <span style="opacity:.5">(' + (kanbanCards[col] || []).length + ')</span></div>' +
        (kanbanCards[col] || []).slice(0, 8).map(function (c) {
          var hs = healthScore(c);
          return '<div class="px-kanban-card"><div style="font-size:12px;font-weight:600">' + esc(c.name || '') + '</div>' +
            '<div style="margin-top:4px"><span class="hs-badge ' + hs.cls + '" style="font-size:10px">' + hs.score + '</span></div></div>';
        }).join('') + '</div>';
    }).join('') + '</div>';

    // CRM KPIs
    var allOrders = STORE.arr('ingly_orders');
    var totalRevCRM = allOrders.reduce(function (s, o) { return s + (+(o.total || o.price || 0)); }, 0);
    var atRisk = clients.filter(function (c) { var h = healthScore(c); return h.label === 'A rischio'; }).length;

    return '<div class="prox-section">' +
      '<div class="prox-ph"><div><div class="prox-title">👥 CRM Pro</div><div class="prox-subtitle">Health Score · Lifecycle · AI Next Best Action</div></div>' +
      '<div class="prox-actions"><button class="px-btn px-btn-secondary" onclick="App.navigate(\'crm\')">← CRM Standard</button></div></div>' +

      '<div class="px-grid-3" style="margin-bottom:4px">' +
      '<div class="px-kpi"><div class="px-kpi-icon">👥</div><div class="px-kpi-label">Clienti Totali</div><div class="px-kpi-value">' + clients.length + '</div></div>' +
      '<div class="px-kpi"><div class="px-kpi-icon">💰</div><div class="px-kpi-label">Fatturato Totale</div><div class="px-kpi-value">' + fmtEur(totalRevCRM) + '</div></div>' +
      '<div class="px-kpi"><div class="px-kpi-icon">⚠️</div><div class="px-kpi-label">A Rischio</div><div class="px-kpi-value" style="color:var(--red)">' + atRisk + '</div></div></div>' +

      '<input class="px-input" id="prox-crm-search" placeholder="🔍 Cerca cliente..." style="margin-bottom:12px">' +

      '<div class="px-tabs" id="prox-crm-tabs">' +
      '<button class="px-tab active" data-tab="cards">Clienti</button>' +
      '<button class="px-tab" data-tab="kanban">Lifecycle Kanban</button></div>' +
      '<div id="prox-crm-cards"><div class="px-grid-3" style="align-items:start">' + clientCards + '</div></div>' +
      '<div id="prox-crm-kanban" style="display:none">' + kanban + '</div>' +
      '<div id="prox-nba-result" class="px-card" style="display:none;margin-top:0">' +
      '<div class="px-card-title">🤖 AI Next Best Action <button class="px-btn px-btn-sm px-btn-secondary" onclick="document.getElementById(\'prox-nba-result\').style.display=\'none\'">✕</button></div>' +
      '<div id="prox-nba-text" class="px-loading"><div class="px-spinner"></div></div></div></div>';
  }

  /* ── PRODUCTION SCHEDULER ── */
  function buildProductionScheduler() {
    var orders = STORE.arr('ingly_orders').filter(function (o) {
      return o.status !== 'completed' && o.status !== 'paid';
    }).sort(function (a, b) { return new Date(a.deadline || '2099') - new Date(b.deadline || '2099'); });

    var rows = orders.slice(0, 20).map(function (o, i) {
      var d = daysDiff(o.deadline);
      var color = d < 0 ? 'var(--red)' : d === 0 ? 'var(--orange)' : 'var(--text)';
      var rowStyle = d < 0 ? 'background:rgba(239,68,68,.05)' : '';
      return '<tr style="' + rowStyle + '">' +
        '<td style="color:var(--text-muted);font-size:12px">' + (i + 1) + '</td>' +
        '<td><div style="font-weight:600;color:var(--text)">' + esc(o.title || o.name || 'Ordine') + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted)">' + esc(o.clientName || '') + '</div></td>' +
        '<td><span class="px-badge ' + (o.technique === 'laser' ? 'blue' : o.technique === 'dtf' ? 'yellow' : 'gray') + '">' + esc(o.technique || 'N/D') + '</span></td>' +
        '<td style="color:' + color + '">' + fmtDate(o.deadline) + '</td>' +
        '<td><span class="px-badge ' + (d < 0 ? 'red' : d === 0 ? 'yellow' : 'green') + '">' + (d < 0 ? 'Scaduto' : d === 0 ? 'Oggi' : 'In corso') + '</span></td>' +
        '<td><input class="px-input" style="width:80px;padding:4px 8px;font-size:12px" placeholder="ore" ' +
        'value="' + (STORE.get('prox_timer_' + o.id) || '') + '" ' +
        'onchange="STORE&&STORE.set&&(function(v){try{var s=JSON.parse(localStorage.getItem(\'prox_timers\')||\'[]\');localStorage.setItem(\'prox_timers\',JSON.stringify(s));} catch(e){}})&&undefined" /></td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="6" class="px-empty">Nessun ordine attivo</td></tr>';

    // Gantt simple (this week)
    var today = new Date();
    var weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay() + 1);
    var days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven'];
    var ganttCols = days.map(function (d) {
      return '<div style="flex:1;min-width:0"><div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;text-align:center;margin-bottom:6px">' + d + '</div>' +
        '<div style="background:var(--bg-card2);border-radius:6px;min-height:60px;padding:4px"></div></div>';
    }).join('');

    return '<div class="prox-section">' +
      '<div class="prox-ph"><div><div class="prox-title">🏭 Production Scheduler</div><div class="prox-subtitle">Coda produzione · Batch · Ottimizzazione AI</div></div>' +
      '<button class="px-btn px-btn-primary" id="prox-prod-ai-btn">🤖 Ottimizza con AI</button></div>' +

      '<div id="prox-prod-ai-result" class="px-card" style="display:none">' +
      '<div class="px-card-title">🤖 Piano Produzione AI <button class="px-btn px-btn-sm px-btn-secondary" onclick="this.closest(\'.px-card\').style.display=\'none\'">✕</button></div>' +
      '<div id="prox-prod-ai-text" class="px-loading"><div class="px-spinner"></div></div></div>' +

      '<div class="px-card"><div class="px-card-title">📋 Coda Ordini (' + orders.length + ' attivi)</div>' +
      '<div class="px-table-wrap"><table class="px-table"><thead><tr>' +
      '<th>#</th><th>Ordine</th><th>Tecnica</th><th>Scadenza</th><th>Stato</th><th>Stima ore</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></div>' +

      '<div class="px-card"><div class="px-card-title">📅 Gantt Settimana Corrente</div>' +
      '<div style="display:flex;gap:8px">' + ganttCols + '</div></div></div>';
  }

  /* ── STOCK AI ── */
  function buildStockAI() {
    var products = STORE.arr('ingly_products');
    var stockCards = products.length === 0 ?
      '<div class="px-empty">Nessun prodotto trovato in magazzino.</div>' :
      products.sort(function (a, b) {
        var pctA = (a.qty || 0) / (a.minQty || 10);
        var pctB = (b.qty || 0) / (b.minQty || 10);
        return pctA - pctB;
      }).map(function (p) {
        var pct = Math.min(100, Math.round((p.qty || 0) / (p.minQty || 10) * 100));
        var fillColor = pct < 20 ? 'var(--red)' : pct < 50 ? 'var(--orange)' : 'var(--green)';
        return '<div class="px-card" style="padding:14px 16px">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
          '<div><div style="font-size:13px;font-weight:600;color:var(--text)">' + esc(p.name || '') + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted)">' + esc(p.supplier || '') + '</div></div>' +
          '<span class="px-badge ' + (pct < 20 ? 'red' : pct < 50 ? 'yellow' : 'green') + '">' + (p.qty || 0) + ' ' + (p.unit || 'pz') + '</span></div>' +
          '<div class="px-stock-bar"><div class="px-stock-fill" style="width:' + pct + '%;background:' + fillColor + '"></div></div>' +
          '<div style="font-size:11px;color:var(--text-dim);margin-top:5px">Min: ' + (p.minQty || 0) + ' · ' + pct + '% scorte' +
          (pct < 20 ? ' · <span style="color:var(--red)">⚠️ Riordina!</span>' : '') + '</div></div>';
      }).join('');

    var lowStock = products.filter(function (p) { return (p.qty || 0) < (p.minQty || 5); });

    return '<div class="prox-section">' +
      '<div class="prox-ph"><div><div class="prox-title">📦 Stock AI</div><div class="prox-subtitle">Magazzino predittivo · Reorder automatico</div></div>' +
      '<div class="prox-actions">' +
      (lowStock.length > 0 ? '<button class="px-btn px-btn-danger" id="prox-stock-reorder-btn">⚠️ Riordina ' + lowStock.length + ' materiali</button>' : '') +
      '<button class="px-btn px-btn-primary" id="prox-stock-ai-btn">🤖 Analisi AI</button></div></div>' +

      (lowStock.length > 0 ? '<div class="px-alert red">⚠️ ' + lowStock.length + ' materiali sotto la soglia minima: ' +
        lowStock.slice(0, 3).map(function (p) { return '<strong>' + esc(p.name) + '</strong>'; }).join(', ') +
        (lowStock.length > 3 ? ' e altri ' + (lowStock.length - 3) : '') + '</div>' : '') +

      '<div id="prox-stock-ai-result" class="px-card" style="display:none">' +
      '<div class="px-card-title">🤖 Analisi Stock AI <button class="px-btn px-btn-sm px-btn-secondary" onclick="this.closest(\'.px-card\').style.display=\'none\'">✕</button></div>' +
      '<div id="prox-stock-ai-text" class="px-loading"><div class="px-spinner"></div></div></div>' +

      '<div class="px-grid-4" style="align-items:start">' + stockCards + '</div></div>';
  }

  /* ── PREVENTIVI AI ── */
  function buildPreventiviAI() {
    var templates = [
      { name: 'Laser CO2 su legno', items: [{ desc: 'Incisione laser CO2 su legno', qty: 1, unit: 'pz', price: 25 }, { desc: 'Materiale MDF 3mm', qty: 1, unit: 'pz', price: 5 }] },
      { name: 'DTF T-Shirt', items: [{ desc: 'Stampa DTF su t-shirt', qty: 10, unit: 'pz', price: 8 }, { desc: 'T-shirt bianca 180g', qty: 10, unit: 'pz', price: 5 }] },
      { name: 'Sublimazione tazza', items: [{ desc: 'Sublimazione tazza personalizzata', qty: 20, unit: 'pz', price: 4.5 }, { desc: 'Tazza bianca 11oz', qty: 20, unit: 'pz', price: 2 }] },
      { name: 'Regalo aziendale', items: [{ desc: 'Incisione logo su prodotto', qty: 50, unit: 'pz', price: 6 }, { desc: 'Packaging personalizzato', qty: 50, unit: 'pz', price: 1.5 }] },
      { name: 'Laser su metallo', items: [{ desc: 'Marcatura laser fibra su acciaio', qty: 5, unit: 'pz', price: 35 }] },
      { name: 'Pack evento', items: [{ desc: 'Gadget personalizzati evento', qty: 100, unit: 'pz', price: 3.5 }, { desc: 'Sacchetto personalizzato', qty: 100, unit: 'pz', price: 0.8 }] }
    ];

    var tmplHtml = templates.map(function (t, i) {
      return '<div class="px-card" style="cursor:pointer;padding:12px 14px" onclick="window._proxLoadTemplate(' + i + ')">' +
        '<div style="font-size:13px;font-weight:600;color:var(--text)">' + t.name + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">' + t.items.length + ' voci</div></div>';
    }).join('');

    window._proxTemplates = templates;

    return '<div class="prox-section">' +
      '<div class="prox-ph"><div><div class="prox-title">💡 Preventivi AI</div><div class="prox-subtitle">Genera preventivi in 30 secondi con AI</div></div>' +
      '<button class="px-btn px-btn-secondary" onclick="App.navigate(\'quotes\')">← Preventivi Standard</button></div>' +

      '<div class="px-tabs" id="prox-q-tabs"><button class="px-tab active" data-tab="generator">AI Generator</button>' +
      '<button class="px-tab" data-tab="templates">Template</button>' +
      '<button class="px-tab" data-tab="lista">📋 Lista</button>' +
      '<button class="px-tab" data-tab="followup">Follow-up</button></div>' +

      '<div id="prox-q-generator">' +
      '<div class="px-card"><div class="px-card-title">🤖 Descrivi il lavoro → Preventivo istantaneo</div>' +
      '<textarea class="px-input" id="prox-q-desc" placeholder="Es: incisione laser CO2 su 50 taglieri in legno con logo aziendale, consegna in 5 giorni..." style="min-height:80px;margin-bottom:10px"></textarea>' +
      '<button class="px-btn px-btn-primary" id="prox-q-ai-btn">✨ Genera Preventivo AI</button>' +
      '<div id="prox-q-ai-result" style="margin-top:12px"></div></div>' +

      '<div class="px-card" id="prox-q-editor" style="margin-top:0"><div class="px-card-title">📝 Editor Preventivo</div>' +
      '<div class="px-grid-2" style="margin-bottom:12px">' +
      '<div><label class="px-label">Cliente</label><input class="px-input" id="prox-q-client" placeholder="Nome cliente"></div>' +
      '<div><label class="px-label">Titolo</label><input class="px-input" id="prox-q-title" placeholder="Titolo preventivo"></div></div>' +
      '<table class="px-table" style="margin-bottom:8px" id="prox-q-items-table"><thead><tr>' +
      '<th>Descrizione</th><th>Qtà</th><th>U.M.</th><th>Prezzo</th><th>Totale</th><th>Margine</th><th></th>' +
      '</tr></thead><tbody id="prox-q-items-body"></tbody></table>' +
      '<button class="px-btn px-btn-sm px-btn-secondary" id="prox-q-add-row" style="margin-bottom:14px">+ Aggiungi voce</button>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px">' +
      '<div style="display:flex;flex-direction:column;gap:6px">' +
      '<div style="display:flex;align-items:center;gap:8px"><label class="px-label" style="margin:0;white-space:nowrap">Sconto %</label>' +
      '<input class="px-input" id="prox-q-discount" type="number" min="0" max="100" value="0" style="width:70px" onchange="window._proxUpdateQuote&&window._proxUpdateQuote()"></div>' +
      '<div style="display:flex;align-items:center;gap:8px"><label class="px-label" style="margin:0;white-space:nowrap">Validità gg</label>' +
      '<input class="px-input" id="prox-q-validity" type="number" value="30" style="width:70px"></div>' +
      '<label style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px">' +
      '<input type="checkbox" id="prox-q-iva" checked> IVA 22%</label></div>' +
      '<div style="text-align:right">' +
      '<div style="font-size:13px;color:var(--text-muted)">Subtotale: <strong id="prox-q-subtotal">€0</strong></div>' +
      '<div id="prox-q-discount-line" style="font-size:12px;color:var(--red);display:none">Sconto: -<span id="prox-q-discount-val">€0</span></div>' +
      '<div style="font-size:16px;font-weight:700;margin-top:4px">Totale: <strong id="prox-q-total" style="color:var(--primary)">€0</strong></div></div></div>' +
      '<div><label class="px-label" style="margin-top:10px">Note / Condizioni</label>' +
      '<textarea class="px-input" id="prox-q-notes" placeholder="Tempi di consegna, condizioni di pagamento, ecc..." style="min-height:60px;margin-top:4px"></textarea></div>' +
      '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
      '<button class="px-btn px-btn-primary" id="prox-q-save">💾 Salva</button>' +
      '<button class="px-btn px-btn-secondary" id="prox-q-pdf">🖨️ PDF</button>' +
      '<button class="px-btn px-btn-secondary" id="prox-q-email">📧 Email</button></div></div></div>' +

      '<div id="prox-q-templates" style="display:none"><div class="px-grid-3">' + tmplHtml + '</div></div>' +

      '<div id="prox-q-lista" style="display:none"><div class="px-card"><div class="px-card-title">📋 Tutti i Preventivi <button class="px-btn px-btn-sm px-btn-secondary" id="prox-q-lista-refresh">↻ Aggiorna</button></div>' +
      '<div id="prox-q-lista-content"></div></div></div>' +

      '<div id="prox-q-followup" style="display:none"><div class="px-card"><div class="px-card-title">📧 Preventivi senza risposta da &gt;3 giorni</div>' +
      '<div id="prox-q-stale-list"></div></div></div></div>';
  }

  /* ── ANALYTICS PRO ── */
  function buildAnalyticsPro() {
    return '<div class="prox-section">' +
      '<div class="prox-ph"><div><div class="prox-title">📊 Analytics Pro</div><div class="prox-subtitle">Business Intelligence · Forecasting · AI Insights</div></div>' +
      '<select class="px-input px-select" id="prox-analytics-period" style="width:180px">' +
      '<option value="30">Ultimi 30 giorni</option><option value="90" selected>Ultimi 90 giorni</option>' +
      '<option value="180">6 mesi</option><option value="365">Anno</option></select></div>' +

      '<div class="px-grid-4" id="prox-analytics-kpis"></div>' +

      '<div class="px-grid-2">' +
      '<div class="px-card"><div class="px-card-title">📈 Revenue Trend <button class="px-btn px-btn-sm px-btn-secondary" id="prox-analytics-insights-btn" style="font-size:11px">🤖 AI Insights</button></div>' +
      '<div class="px-chart-wrap" id="prox-revenue-chart" style="height:200px"></div></div>' +
      '<div class="px-card"><div class="px-card-title">🎯 Per Tecnica</div>' +
      '<div id="prox-technique-chart"></div></div></div>' +

      '<div class="px-grid-2">' +
      '<div class="px-card"><div class="px-card-title">🔮 Forecasting — Prossimi 3 Mesi</div>' +
      '<div id="prox-forecast-table"></div></div>' +
      '<div class="px-card"><div class="px-card-title">🏆 Top 5 Clienti</div>' +
      '<div id="prox-top-clients"></div></div></div>' +

      '<div id="prox-insights-container" style="display:none"><div class="px-card"><div class="px-card-title">🤖 AI Business Insights</div>' +
      '<div id="prox-insights-content" class="px-loading"><div class="px-spinner"></div></div></div></div></div>';
  }

  /* ── MARKETING HUB ── */
  function buildMarketingHub() {
    var platforms = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok'];
    var tones = ['Professionale', 'Friendly', 'Urgente', 'Ispirazionale'];
    var emailTemplates = ['Promo stagionale', 'Rinnovo cliente', 'Nuovo prodotto', 'Offerta VIP', 'Follow-up ordine', 'Auguri'];

    return '<div class="prox-section">' +
      '<div class="prox-ph"><div><div class="prox-title">🚀 Marketing Hub</div><div class="prox-subtitle">Email · Social AI · Campagne</div></div></div>' +

      '<div class="px-tabs" id="prox-mkt-tabs">' +
      '<button class="px-tab active" data-tab="social">Social AI</button>' +
      '<button class="px-tab" data-tab="email">Email Campaigns</button></div>' +

      '<div id="prox-mkt-social">' +
      '<div class="px-card"><div class="px-card-title">📱 Social Content Generator</div>' +
      '<div class="px-grid-2" style="margin-bottom:12px">' +
      '<div><label class="px-label">Piattaforma</label><select class="px-input px-select" id="prox-soc-platform">' +
      platforms.map(function (p) { return '<option>' + p + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="px-label">Tono</label><select class="px-input px-select" id="prox-soc-tone">' +
      tones.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></div></div>' +
      '<label class="px-label">Cosa vuoi promuovere?</label>' +
      '<textarea class="px-input" id="prox-soc-brief" placeholder="Es: nuovo servizio di incisione su gioielli, prezzi a partire da €15..." style="margin-bottom:10px"></textarea>' +
      '<button class="px-btn px-btn-primary" id="prox-soc-gen-btn">✨ Genera Post</button>' +
      '<div id="prox-soc-result" style="margin-top:12px"></div></div></div>' +

      '<div id="prox-mkt-email" style="display:none">' +
      '<div class="px-card"><div class="px-card-title">📧 Email Campaign Builder</div>' +
      '<div class="px-grid-3" style="margin-bottom:14px">' +
      emailTemplates.map(function (t) {
        return '<div class="px-card" style="cursor:pointer;padding:10px 12px" onclick="document.getElementById(\'prox-email-template-name\').value=\'' + t + '\';document.getElementById(\'prox-email-brief\').value=\'Campagna: ' + t + '\';">' +
          '<div style="font-size:12px;font-weight:600">' + t + '</div></div>';
      }).join('') + '</div>' +
      '<label class="px-label">Oggetto email</label>' +
      '<input class="px-input" id="prox-email-template-name" placeholder="Oggetto della campagna" style="margin-bottom:10px">' +
      '<label class="px-label">Brief contenuto</label>' +
      '<textarea class="px-input" id="prox-email-brief" placeholder="Descrivi il messaggio della campagna..." style="margin-bottom:10px"></textarea>' +
      '<div style="margin-bottom:10px"><label class="px-label">Destinatari</label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">' +
      ['Tutti i clienti', 'Solo VIP', 'Inattivi 60gg', 'Solo B2B'].map(function (seg) {
        return '<label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);cursor:pointer">' +
          '<input type="checkbox" value="' + seg + '"> ' + seg + '</label>';
      }).join('') + '</div></div>' +
      '<button class="px-btn px-btn-primary" id="prox-email-gen-btn">✨ Genera con AI</button>' +
      '<div id="prox-email-result" style="margin-top:12px"></div></div></div></div>';
  }

  /* ── AI AGENTS ── */
  function buildAIAgents() {
    var agents = [
      { id: 'quote', icon: '🧾', name: 'Quote Agent', desc: 'Preventivi laser/DTF/sublimazione', system: 'Sei Ingly Quote Agent, specialista in preventivi per laboratorio laser CO2/Fiber, DTF, sublimazione, incisione. Conosci i prezzi di mercato italiani (laser CO2 su legno 0.5-2€/cm², DTF 3-8€/pz). Genera preventivi dettagliati con voci, prezzi, margini. Rispondi in italiano.' },
      { id: 'crm', icon: '👥', name: 'CRM Agent', desc: 'Analisi clienti e retention', system: 'Sei Ingly CRM Agent, esperto di customer relationship management per PMI artigianali italiane. Analizza dati cliente, suggerisci azioni concrete per aumentare retention, valore cliente, upsell. Rispondi in italiano.' },
      { id: 'market', icon: '📈', name: 'Market Agent', desc: 'Trend di mercato e opportunità', system: 'Sei Ingly Market Agent, analista di mercato per il settore personalizzazione/laser/DTF italiano ed europeo. Monitora trend 2025-2026, prezzi materiali, opportunità. Dati chiave: UV DTF +180%, Snow Globe +350%, sublimazione tazze stabile. Rispondi in italiano.' },
      { id: 'finance', icon: '💰', name: 'Finance Agent', desc: 'Cash flow e previsioni', system: 'Sei Ingly Finance Agent, consulente finanziario per laboratori artigianali italiani. Analizza cash flow, fatturato, costi. Suggerisci ottimizzazioni concrete. Rispondi in italiano con numeri precisi.' },
      { id: 'content', icon: '✍️', name: 'Content Agent', desc: 'Copywriting e comunicazione', system: 'Sei Ingly Content Agent, copywriter per artigiani creativi italiani. Scrivi email professionali, post social, descrizioni prodotti, newsletter. Stile professionale ma caldo, italiano corretto con emoji pertinenti.' }
    ];

    window._proxAgentHistory = window._proxAgentHistory || {};
    window._proxAgents = agents;

    return '<div class="prox-section">' +
      '<div class="prox-ph"><div><div class="prox-title">🤖 AI Agents</div><div class="prox-subtitle">5 agenti specializzati · Conversazioni dedicate</div></div></div>' +
      '<div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">' +
      '<div style="display:flex;flex-direction:column;gap:6px;width:200px;flex-shrink:0">' +
      agents.map(function (a) {
        return '<div class="px-agent-card' + (a.id === 'quote' ? ' active' : '') + '" id="prox-agent-card-' + a.id + '" onclick="window._proxSelectAgent(\'' + a.id + '\')">' +
          '<div class="px-agent-dot"></div><div><div style="font-size:13px;font-weight:600;color:var(--text)">' + a.icon + ' ' + a.name + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted)">' + a.desc + '</div></div></div>';
      }).join('') + '</div>' +
      '<div style="flex:1;min-width:0">' +
      '<div class="px-card" style="height:520px;display:flex;flex-direction:column">' +
      '<div class="px-card-title" id="prox-agent-title">🧾 Quote Agent' +
      '<button class="px-btn px-btn-sm px-btn-secondary" id="prox-agent-clear">🗑 Nuova chat</button></div>' +
      '<div class="px-chat" id="prox-agent-chat" style="flex:1"></div>' +
      '<div style="display:flex;gap:8px;margin-top:10px">' +
      '<input class="px-input" id="prox-agent-input" placeholder="Scrivi al tuo agente AI..." style="flex:1">' +
      '<button class="px-btn px-btn-primary" id="prox-agent-send">Invia ↵</button></div></div></div>' +
      '</div></div>';
  }

  /* ── AUTOMAZIONI ── */
  function buildAutomazioni() {
    var autos = [
      { id: 'lead2cash', name: '🔄 Lead to Cash', desc: 'Nuovo lead → Preventivo → Firma → Ordine → Fattura', detail: 'Automatizza il percorso completo dalla richiesta al pagamento.' },
      { id: 'stock', name: '📦 Stock Intelligence', desc: 'Controllo scorte giornaliero alle 7:00', detail: 'Se materiale < soglia minima → genera ordine fornitore automatico.' },
      { id: 'retention', name: '👥 Customer Retention', desc: 'Clienti inattivi da 30/60/90 giorni', detail: 'AI genera email di re-engagement personalizzata per ogni cliente dormiente.' },
      { id: 'production', name: '🏭 Production Daily', desc: 'Ottimizzazione coda produzione ogni mattina', detail: 'AI riordina gli ordini per massimizzare efficienza e rispettare scadenze.' }
    ];

    var savedStates = STORE.get('prox_automations') || {};

    var autoCards = autos.map(function (a) {
      var active = savedStates[a.id] !== false;
      return '<div class="px-auto-card">' +
        '<label class="px-auto-toggle"><input type="checkbox" ' + (active ? 'checked' : '') + ' onchange="window._proxToggleAuto(\'' + a.id + '\',this.checked)"><span class="px-auto-slider"></span></label>' +
        '<div style="flex:1"><div style="font-size:14px;font-weight:600;color:var(--text)">' + a.name + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin-top:2px">' + a.desc + '</div>' +
        '<div style="font-size:11px;color:var(--text-dim);margin-top:4px">' + a.detail + '</div></div>' +
        '<button class="px-btn px-btn-sm px-btn-secondary prox-auto-run-btn" data-id="' + a.id + '">▶ Esegui ora</button></div>';
    }).join('');

    var log = STORE.arr('prox_automation_log').slice(0, 10);
    var logRows = log.length === 0 ? '<div class="px-empty">Nessuna automazione eseguita</div>' :
      log.map(function (l) {
        return '<tr><td>' + fmtDate(l.ts) + '</td><td>' + esc(l.name) + '</td><td>' +
          '<span class="px-badge ' + (l.ok ? 'green' : 'red') + '">' + (l.ok ? 'OK' : 'Errore') + '</span></td>' +
          '<td style="font-size:11px;color:var(--text-muted)">' + esc(l.msg || '') + '</td></tr>';
      }).join('');

    return '<div class="prox-section">' +
      '<div class="prox-ph"><div><div class="prox-title">⚡ Automazioni</div><div class="prox-subtitle">4 workflow intelligenti · Attiva/Disattiva</div></div></div>' +
      '<div id="prox-auto-result" class="px-card" style="display:none">' +
      '<div class="px-card-title">▶ Risultato Automazione <button class="px-btn px-btn-sm px-btn-secondary" onclick="this.closest(\'.px-card\').style.display=\'none\'">✕</button></div>' +
      '<div id="prox-auto-result-text" class="px-loading"><div class="px-spinner"></div></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:10px">' + autoCards + '</div>' +
      '<div class="px-card"><div class="px-card-title">📋 Log Automazioni</div>' +
      '<div class="px-table-wrap"><table class="px-table"><thead><tr><th>Data</th><th>Automazione</th><th>Stato</th><th>Risultato</th></tr></thead>' +
      '<tbody id="prox-auto-log-body">' + logRows + '</tbody></table></div></div></div>';
  }

  /* ═══════════════════════════════════════════════════════════
     4. EVENT BINDINGS
  ═══════════════════════════════════════════════════════════ */
  function _renderBrief(text) {
    // Format numbered lines as bold, rest as normal
    var html = text.split('\n').filter(Boolean).map(function (line) {
      var m = line.match(/^(\d+[\.\)])\s+(.+)/);
      if (m) return '<div style="margin-bottom:8px"><strong style="color:var(--primary)">' + m[1] + '</strong> ' + esc(m[2]) + '</div>';
      if (line.startsWith('**') || line.startsWith('##')) return '<div style="margin-bottom:6px;font-weight:700;color:var(--text)">' + esc(line.replace(/[*#]+/g,'').trim()) + '</div>';
      return '<div style="margin-bottom:4px;color:var(--text-muted);font-size:12px">' + esc(line) + '</div>';
    }).join('');
    return html;
  }

  function _runBrief() {
    var card = document.getElementById('prox-brief-card');
    var out = document.getElementById('prox-brief-output');
    card.style.display = '';
    out.innerHTML = '<div class="px-loading"><div class="px-spinner"></div> Analisi in corso...</div>';
    var orders = STORE.arr('ingly_orders');
    var active = orders.filter(function (o) { return o.status !== 'completed' && o.status !== 'paid'; });
    var overdue = active.filter(function (o) { return daysDiff(o.deadline) < 0; }).length;
    var goal = parseFloat(localStorage.getItem('prox_monthly_goal') || '0');
    var now = new Date();
    var monthRevenue = orders.filter(function (o) {
      var d = new Date(o.completedAt || o.createdAt || 0);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && (o.status === 'completed' || o.status === 'paid');
    }).reduce(function (s, o) { return s + (+(o.total || 0)); }, 0);
    var prompt = 'Morning Brief ' + new Date().toLocaleDateString('it-IT') + '.\n' +
      'Dati ERP: ordini attivi ' + active.length + ' (in ritardo: ' + overdue + '), clienti ' + STORE.arr('ingly_clients').length + ', preventivi aperti ' + STORE.arr('ingly_quotes').filter(function (q) { return q.status !== 'accepted' && q.status !== 'rejected'; }).length + ', fatturato mese €' + monthRevenue.toFixed(0) + (goal > 0 ? ' su obiettivo €' + goal : '') + '.\n' +
      'Genera Morning Brief strutturato in 5 punti numerati: 1) Situazione generale 2) Priorità del giorno 3) Tre azioni concrete 4) Opportunità 5) Rischi da monitorare. Rispondi in italiano, tono professionale ma diretto.';
    callAI(prompt, 'Sei il business assistant di un laboratorio artigianale italiano. Dai risposte pratiche e concrete.', null, function (text) {
      out.innerHTML = _renderBrief(text);
    });
  }

  function bindCommandCenterEvents() {
    var btn = document.getElementById('prox-brief-btn');
    if (btn) btn.addEventListener('click', _runBrief);

    var refresh = document.getElementById('prox-brief-refresh');
    if (refresh) refresh.addEventListener('click', _runBrief);

    var goalInput = document.getElementById('prox-goal-input');
    if (goalInput) goalInput.addEventListener('change', function () {
      localStorage.setItem('prox_monthly_goal', this.value || '0');
      window.toast && window.toast('Obiettivo salvato: ' + fmtEur(parseFloat(this.value||0)), 'success');
    });
  }

  function bindCRMEvents() {
    var searchEl = document.getElementById('prox-crm-search');
    if (searchEl) searchEl.addEventListener('input', function () {
      var q = this.value.toLowerCase();
      var cards = document.querySelectorAll('#prox-crm-cards .px-card');
      cards.forEach(function (card) {
        var txt = card.textContent.toLowerCase();
        card.style.display = q === '' || txt.indexOf(q) !== -1 ? '' : 'none';
      });
    });

    var tabs = document.getElementById('prox-crm-tabs');
    if (tabs) tabs.addEventListener('click', function (e) {
      var tab = e.target.closest('.px-tab');
      if (!tab) return;
      tabs.querySelectorAll('.px-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var which = tab.dataset.tab;
      document.getElementById('prox-crm-cards').style.display = which === 'cards' ? '' : 'none';
      document.getElementById('prox-crm-kanban').style.display = which === 'kanban' ? '' : 'none';
    });

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.prox-nba-btn');
      if (!btn) return;
      var name = btn.dataset.name;
      var result = document.getElementById('prox-nba-result');
      var text = document.getElementById('prox-nba-text');
      result.style.display = '';
      text.innerHTML = '<div class="px-loading"><div class="px-spinner"></div> Analisi cliente...</div>';
      var prompt = 'Cliente: ' + name + '. Ordini totali: ' + btn.dataset.orders + '. Valore totale: €' + btn.dataset.total + '. Suggerisci la prossima azione commerciale più efficace in 2-3 frasi pratiche.';
      callAI(prompt, null, null, function (t) {
        text.innerHTML = '<div style="font-size:13px;color:var(--text)">' + esc(t) + '</div>';
      });
    });
  }

  function bindProductionEvents() {
    var btn = document.getElementById('prox-prod-ai-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var res = document.getElementById('prox-prod-ai-result');
      var txt = document.getElementById('prox-prod-ai-text');
      res.style.display = '';
      txt.innerHTML = '<div class="px-loading"><div class="px-spinner"></div></div>';
      var orders = STORE.arr('ingly_orders').filter(function (o) {
        return o.status !== 'completed' && o.status !== 'paid';
      }).slice(0, 10);
      var prompt = 'Scheduler produzione. Ordini: ' + orders.map(function (o) {
        return o.title + ' (' + (o.technique || 'laser') + ', scadenza: ' + fmtDate(o.deadline) + ')';
      }).join('; ') + '. Ottimizza la sequenza per: 1) scadenze 2) stesso materiale/tecnica 3) efficienza. Lista numerata con stima ore.';
      callAI(prompt, 'Sei un production scheduler per laboratorio artigianale italiano. Rispondi in italiano.', null, function (t) {
        txt.innerHTML = '<div style="white-space:pre-wrap;font-size:13px;line-height:1.5">' + esc(t) + '</div>';
      });
    });
  }

  function bindStockEvents() {
    var btn = document.getElementById('prox-stock-ai-btn');
    if (btn) btn.addEventListener('click', function () {
      var res = document.getElementById('prox-stock-ai-result');
      var txt = document.getElementById('prox-stock-ai-text');
      res.style.display = '';
      txt.innerHTML = '<div class="px-loading"><div class="px-spinner"></div></div>';
      var products = STORE.arr('ingly_products');
      var prompt = 'Analisi magazzino. Prodotti: ' + products.slice(0, 15).map(function (p) {
        return p.name + ': ' + (p.qty || 0) + '/' + (p.minQty || 5) + ' ' + (p.unit || 'pz');
      }).join(', ') + '. Identifica materiali critici, previsione consumi 2 settimane, suggerimenti riordino prioritari.';
      callAI(prompt, 'Sei un esperto di gestione magazzino per laboratorio artigianale. Rispondi in italiano.', null, function (t) {
        txt.innerHTML = '<div style="white-space:pre-wrap;font-size:13px;line-height:1.5">' + esc(t) + '</div>';
      });
    });

    var reorderBtn = document.getElementById('prox-stock-reorder-btn');
    if (reorderBtn) reorderBtn.addEventListener('click', function () {
      var lowStock = STORE.arr('ingly_products').filter(function (p) { return (p.qty || 0) < (p.minQty || 5); });
      var text = 'Gentile Fornitore,\n\nSi prega di fornire i seguenti materiali:\n\n' +
        lowStock.map(function (p) { return '• ' + p.name + ': ' + (p.minQty * 3 || 15) + ' ' + (p.unit || 'pz'); }).join('\n') +
        '\n\nCordiali saluti,\nINGLY Design';
      var w = window.open('', '_blank');
      if (w) {
        w.document.write('<pre style="font-family:sans-serif;padding:20px">' + text + '</pre>');
        w.document.title = 'Ordine Fornitore';
      }
    });
  }

  function bindQuotesEvents() {
    function renderQuoteLista() {
      var el = document.getElementById('prox-q-lista-content');
      if (!el) return;
      var quotes = STORE.arr('ingly_quotes').sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
      if (!quotes.length) { el.innerHTML = '<div class="px-empty">Nessun preventivo salvato</div>'; return; }
      var statusColors = { open: 'blue', sent: 'yellow', accepted: 'green', rejected: 'red' };
      var statusLabels = { open: 'Aperto', sent: 'Inviato', accepted: 'Accettato', rejected: 'Rifiutato' };
      el.innerHTML = '<div class="px-table-wrap"><table class="px-table"><thead><tr><th>Data</th><th>Cliente</th><th>Titolo</th><th>Totale</th><th>Stato</th><th></th></tr></thead><tbody>' +
        quotes.map(function (q) {
          var st = q.status || 'open';
          return '<tr>' +
            '<td style="font-size:11px;color:var(--text-muted)">' + fmtDate(q.createdAt) + '</td>' +
            '<td><strong>' + esc(q.clientName || '—') + '</strong></td>' +
            '<td>' + esc(q.title || 'Preventivo') + '</td>' +
            '<td style="font-weight:700;color:var(--primary)">' + fmtEur(q.total || 0) + '</td>' +
            '<td><select class="px-input px-select" style="padding:3px 8px;font-size:11px;width:110px" onchange="(function(v){var qs=JSON.parse(localStorage.getItem(\'ingly_quotes\')||\'[]\');var idx=qs.findIndex(function(x){return x.id===\'' + q.id + '\'});if(idx>-1){qs[idx].status=v;localStorage.setItem(\'ingly_quotes\',JSON.stringify(qs));}toast&&toast(\'Stato aggiornato\',\'success\')})(this.value)">' +
            ['open','sent','accepted','rejected'].map(function(s){ return '<option value="'+s+'"'+(st===s?' selected':'')+'>'+statusLabels[s]+'</option>'; }).join('') + '</select></td>' +
            '<td><button class="px-btn px-btn-sm px-btn-danger" onclick="(function(){var qs=JSON.parse(localStorage.getItem(\'ingly_quotes\')||\'[]\');localStorage.setItem(\'ingly_quotes\',JSON.stringify(qs.filter(function(x){return x.id!==\'' + q.id + '\';})));window._proxRenderQuoteLista&&window._proxRenderQuoteLista()})()">✕</button></td>' +
            '</tr>';
        }).join('') + '</tbody></table></div>';
    }
    window._proxRenderQuoteLista = renderQuoteLista;

    // Tab switching
    var qtabs = document.getElementById('prox-q-tabs');
    if (qtabs) qtabs.addEventListener('click', function (e) {
      var tab = e.target.closest('.px-tab');
      if (!tab) return;
      qtabs.querySelectorAll('.px-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var which = tab.dataset.tab;
      document.getElementById('prox-q-generator').style.display = which === 'generator' ? '' : 'none';
      document.getElementById('prox-q-templates').style.display = which === 'templates' ? '' : 'none';
      document.getElementById('prox-q-lista').style.display = which === 'lista' ? '' : 'none';
      document.getElementById('prox-q-followup').style.display = which === 'followup' ? '' : 'none';
      if (which === 'followup') renderStaleQuotes();
      if (which === 'lista') renderQuoteLista();
    });

    var listaRefresh = document.getElementById('prox-q-lista-refresh');
    if (listaRefresh) listaRefresh.addEventListener('click', renderQuoteLista);

    // AI generator
    var aiBtn = document.getElementById('prox-q-ai-btn');
    if (aiBtn) aiBtn.addEventListener('click', function () {
      var desc = (document.getElementById('prox-q-desc') || {}).value || '';
      if (!desc.trim()) { toast && toast('Inserisci una descrizione del lavoro', 'warning'); return; }
      var res = document.getElementById('prox-q-ai-result');
      res.innerHTML = '<div class="px-loading"><div class="px-spinner"></div> Generazione preventivo...</div>';
      var prompt = 'Genera un preventivo per: ' + desc + '. Rispondi SOLO con JSON valido: {"title":"...","items":[{"desc":"...","qty":1,"unit":"pz","price":10}],"notes":"..."}';
      callAI(prompt, 'Sei un preventivista esperto per laboratorio laser/DTF/sublimazione italiano. Prezzi realistici di mercato IT. Rispondi SOLO JSON valido.', null, function (text) {
        try {
          var m = text.match(/\{[\s\S]*\}/);
          var data = JSON.parse(m ? m[0] : text);
          if (document.getElementById('prox-q-title')) document.getElementById('prox-q-title').value = data.title || '';
          if (data.items) {
            data.items.forEach(function (item) { addQuoteRow(item.desc, item.qty, item.unit, item.price); });
          }
          updateQuoteTotals();
          res.innerHTML = '<div class="px-alert yellow">✅ Preventivo generato! Rivedi e modifica le voci nell\'editor.</div>';
        } catch (e) {
          res.innerHTML = '<div class="px-alert red">⚠️ Risposta AI: <pre style="font-size:11px;margin-top:6px;white-space:pre-wrap">' + esc(text.slice(0, 500)) + '</pre></div>';
        }
      });
    });

    // Add row
    var addRowBtn = document.getElementById('prox-q-add-row');
    if (addRowBtn) addRowBtn.addEventListener('click', function () { addQuoteRow('', 1, 'pz', 0); });

    // IVA
    var ivaCheck = document.getElementById('prox-q-iva');
    if (ivaCheck) ivaCheck.addEventListener('change', updateQuoteTotals);

    // Save
    var saveBtn = document.getElementById('prox-q-save');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      var quotes = STORE.arr('ingly_quotes');
      var items = getQuoteItems();
      var subtotal = items.reduce(function (s, i) { return s + i.qty * i.price; }, 0);
      var discPct = parseFloat((document.getElementById('prox-q-discount') || {}).value || '0');
      var discAmt = subtotal * discPct / 100;
      var afterDisc = subtotal - discAmt;
      var iva = (document.getElementById('prox-q-iva') || {}).checked ? afterDisc * 0.22 : 0;
      var q = {
        id: uid(), createdAt: new Date().toISOString(),
        clientName: (document.getElementById('prox-q-client') || {}).value || '',
        title: (document.getElementById('prox-q-title') || {}).value || 'Preventivo',
        notes: (document.getElementById('prox-q-notes') || {}).value || '',
        validity: (document.getElementById('prox-q-validity') || {}).value || '30',
        discount: discPct,
        items: items, subtotal: subtotal, discountAmt: discAmt, iva: iva, total: afterDisc + iva, status: 'open'
      };
      quotes.push(q);
      STORE.set('ingly_quotes', quotes);
      window.toast && window.toast('Preventivo salvato ✅', 'success');
    });

    // PDF
    var pdfBtn = document.getElementById('prox-q-pdf');
    if (pdfBtn) pdfBtn.addEventListener('click', function () {
      var items = getQuoteItems();
      var subtotal = items.reduce(function (s, i) { return s + i.qty * i.price; }, 0);
      var discPct = parseFloat((document.getElementById('prox-q-discount') || {}).value || '0');
      var discAmt = subtotal * discPct / 100;
      var afterDisc = subtotal - discAmt;
      var iva = (document.getElementById('prox-q-iva') || {}).checked ? afterDisc * 0.22 : 0;
      var validity = (document.getElementById('prox-q-validity') || {}).value || '30';
      var notes = esc((document.getElementById('prox-q-notes') || {}).value || '');
      var client = esc((document.getElementById('prox-q-client') || {}).value || '');
      var title = esc((document.getElementById('prox-q-title') || {}).value || 'Preventivo');
      var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preventivo — ' + title + '</title>' +
        '<style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;padding:40px;max-width:820px;margin:0 auto;color:#1a1a2e}' +
        '.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #fbbf24}' +
        '.logo{font-size:22px;font-weight:800;color:#1a1a2e}.logo span{color:#fbbf24}' +
        '.meta{text-align:right;font-size:13px;color:#666}' +
        'table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#f8f7f4;padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#666}' +
        'td{padding:10px 14px;border-bottom:1px solid #eee;font-size:13px}' +
        '.totals{margin-left:auto;width:280px;margin-top:16px}' +
        '.total-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#666}' +
        '.total-final{display:flex;justify-content:space-between;padding:10px 0;font-size:18px;font-weight:800;border-top:2px solid #1a1a2e;color:#1a1a2e}' +
        '.footer{margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:11px;color:#999;display:flex;justify-content:space-between}' +
        '.signature{margin-top:50px;display:flex;gap:60px}.sig-box{flex:1;border-top:1px solid #333;padding-top:8px;font-size:12px;color:#666}' +
        '</style></head><body>' +
        '<div class="header"><div><div class="logo">INGLY<span>Design</span></div><div style="font-size:12px;color:#666;margin-top:4px">Laboratorio di Personalizzazione</div></div>' +
        '<div class="meta"><div><strong>PREVENTIVO N°</strong> ' + Date.now().toString().slice(-6) + '</div><div>Data: ' + new Date().toLocaleDateString('it-IT') + '</div><div>Validità: ' + validity + ' giorni</div></div></div>' +
        '<p><strong>Cliente:</strong> ' + client + '</p><p><strong>Oggetto:</strong> ' + title + '</p>' +
        '<table><thead><tr><th>Descrizione</th><th>Qtà</th><th>U.M.</th><th>P.Unit.</th><th>Totale</th></tr></thead><tbody>' +
        items.map(function (i) { return '<tr><td>' + esc(i.desc) + '</td><td>' + i.qty + '</td><td>' + esc(i.unit) + '</td><td>€' + i.price.toFixed(2) + '</td><td>€' + (i.qty * i.price).toFixed(2) + '</td></tr>'; }).join('') +
        '</tbody></table>' +
        '<div class="totals">' +
        '<div class="total-row"><span>Subtotale</span><span>€' + subtotal.toFixed(2) + '</span></div>' +
        (discPct > 0 ? '<div class="total-row" style="color:#ef4444"><span>Sconto ' + discPct + '%</span><span>-€' + discAmt.toFixed(2) + '</span></div>' : '') +
        ((document.getElementById('prox-q-iva') || {}).checked ? '<div class="total-row"><span>IVA 22%</span><span>€' + iva.toFixed(2) + '</span></div>' : '') +
        '<div class="total-final"><span>TOTALE</span><span>€' + (afterDisc + iva).toFixed(2) + '</span></div></div>' +
        (notes ? '<p style="margin-top:20px;font-size:12px;color:#666;background:#f8f7f4;padding:12px;border-radius:4px"><strong>Note:</strong> ' + notes + '</p>' : '') +
        '<p style="font-size:12px;color:#666">Pagamento: 30 giorni dalla data di accettazione</p>' +
        '<div class="signature"><div class="sig-box">Per accettazione<br>Cliente: __________________</div><div class="sig-box">INGLY Design<br>Firma: __________________</div></div>' +
        '<div class="footer"><span>INGLY Design — Laboratorio di Personalizzazione</span><span>Preventivo valido fino al: ' + new Date(Date.now() + parseInt(validity) * 86400000).toLocaleDateString('it-IT') + '</span></div>' +
        '</body></html>';
      var w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); w.print(); }
    });

    // Email button
    var emailBtn2 = document.getElementById('prox-q-email');
    if (emailBtn2) emailBtn2.addEventListener('click', function () {
      var items = getQuoteItems();
      var subtotal = items.reduce(function (s, i) { return s + i.qty * i.price; }, 0);
      var discPct = parseFloat((document.getElementById('prox-q-discount') || {}).value || '0');
      var afterDisc = subtotal * (1 - discPct / 100);
      var iva = (document.getElementById('prox-q-iva') || {}).checked ? afterDisc * 0.22 : 0;
      var client = (document.getElementById('prox-q-client') || {}).value || '';
      var title = (document.getElementById('prox-q-title') || {}).value || 'Preventivo';
      var validity = (document.getElementById('prox-q-validity') || {}).value || '30';
      var subject = encodeURIComponent('Preventivo: ' + title);
      var body = encodeURIComponent(
        'Gentile ' + client + ',\n\n' +
        'Le inviamo in allegato il preventivo per: ' + title + '\n\n' +
        'Importo: €' + (afterDisc + iva).toFixed(2) + ' (IVA inclusa)\n' +
        'Validità offerta: ' + validity + ' giorni\n\n' +
        'Siamo a sua disposizione per qualsiasi chiarimento.\n\n' +
        'Cordiali saluti,\nINGLY Design'
      );
      window.location.href = 'mailto:?subject=' + subject + '&body=' + body;
    });

    // Template loader
    window._proxLoadTemplate = function (idx) {
      var t = window._proxTemplates[idx];
      if (!t) return;
      var tbody = document.getElementById('prox-q-items-body');
      if (tbody) tbody.innerHTML = '';
      if (document.getElementById('prox-q-title')) document.getElementById('prox-q-title').value = t.name;
      t.items.forEach(function (item) { addQuoteRow(item.desc, item.qty || 1, item.unit || 'pz', item.price || 0); });
      updateQuoteTotals();
      // Switch to generator tab
      var tabs = document.querySelectorAll('#prox-q-tabs .px-tab');
      tabs.forEach(function (tab) { tab.classList.remove('active'); });
      if (tabs[0]) tabs[0].classList.add('active');
      ['prox-q-generator', 'prox-q-templates', 'prox-q-followup'].forEach(function (id, i) {
        var el = document.getElementById(id);
        if (el) el.style.display = i === 0 ? '' : 'none';
      });
    };
  }

  function addQuoteRow(desc, qty, unit, price) {
    var tbody = document.getElementById('prox-q-items-body');
    if (!tbody) return;
    var rid = 'qrow_' + uid();
    var margin = price > 0 ? Math.round((price - price * 0.6) / price * 100) : 0;
    var mCls = margin > 40 ? 'high' : margin > 20 ? 'mid' : 'low';
    var tr = document.createElement('tr');
    tr.id = rid;
    tr.innerHTML = '<td><input class="px-input" style="padding:5px 8px" value="' + esc(desc) + '" onchange="window._proxUpdateQuote()"></td>' +
      '<td><input class="px-input" style="padding:5px 8px;width:60px" type="number" value="' + (qty || 1) + '" onchange="window._proxUpdateQuote()"></td>' +
      '<td><select class="px-input px-select" style="padding:5px 8px;width:70px" onchange="window._proxUpdateQuote()"><option ' + (unit === 'pz' ? 'selected' : '') + '>pz</option><option ' + (unit === 'mq' ? 'selected' : '') + '>mq</option><option ' + (unit === 'ml' ? 'selected' : '') + '>ml</option><option ' + (unit === 'h' ? 'selected' : '') + '>h</option></select></td>' +
      '<td><input class="px-input" style="padding:5px 8px;width:80px" type="number" step="0.01" value="' + (price || 0) + '" onchange="window._proxUpdateQuote()"></td>' +
      '<td class="qtotal" style="font-weight:600">€' + ((qty || 1) * (price || 0)).toFixed(2) + '</td>' +
      '<td><span class="px-margin-cell ' + mCls + '">' + margin + '%</span></td>' +
      '<td><button class="px-btn px-btn-sm px-btn-danger" onclick="document.getElementById(\'' + rid + '\')&&document.getElementById(\'' + rid + '\').remove();window._proxUpdateQuote&&window._proxUpdateQuote()">✕</button></td>';
    tbody.appendChild(tr);
    window._proxUpdateQuote = updateQuoteTotals;
  }

  function getQuoteItems() {
    var tbody = document.getElementById('prox-q-items-body');
    if (!tbody) return [];
    return Array.from(tbody.querySelectorAll('tr')).map(function (tr) {
      var inputs = tr.querySelectorAll('input, select');
      var price = parseFloat((inputs[3] || {}).value) || 0;
      var qty = parseFloat((inputs[1] || {}).value) || 1;
      return { desc: (inputs[0] || {}).value || '', qty: qty, unit: (inputs[2] || {}).value || 'pz', price: price };
    }).filter(function (i) { return i.desc; });
  }

  function updateQuoteTotals() {
    var items = getQuoteItems();
    // Update row totals and margins
    var tbody = document.getElementById('prox-q-items-body');
    if (tbody) tbody.querySelectorAll('tr').forEach(function (tr) {
      var inputs = tr.querySelectorAll('input');
      var qty = parseFloat((inputs[1] || {}).value) || 1;
      var price = parseFloat((inputs[3] || {}).value) || 0;
      var total = qty * price;
      var tcell = tr.querySelector('.qtotal');
      if (tcell) tcell.textContent = '€' + total.toFixed(2);
      var mcell = tr.querySelector('.px-margin-cell');
      if (mcell && price > 0) {
        var margin = Math.round((price - price * 0.6) / price * 100);
        var mCls = margin > 40 ? 'high' : margin > 20 ? 'mid' : 'low';
        mcell.className = 'px-margin-cell ' + mCls;
        mcell.textContent = margin + '%';
      }
    });
    var subtotal = items.reduce(function (s, i) { return s + i.qty * i.price; }, 0);
    var discPct = parseFloat((document.getElementById('prox-q-discount') || {}).value || '0');
    var discAmt = subtotal * discPct / 100;
    var afterDisc = subtotal - discAmt;
    var iva = (document.getElementById('prox-q-iva') || {}).checked ? afterDisc * 0.22 : 0;
    var sub = document.getElementById('prox-q-subtotal');
    var tot = document.getElementById('prox-q-total');
    var discLine = document.getElementById('prox-q-discount-line');
    var discVal = document.getElementById('prox-q-discount-val');
    if (sub) sub.textContent = '€' + subtotal.toFixed(2);
    if (tot) tot.textContent = '€' + (afterDisc + iva).toFixed(2);
    if (discLine) discLine.style.display = discPct > 0 ? '' : 'none';
    if (discVal) discVal.textContent = '€' + discAmt.toFixed(2);
  }

  function renderStaleQuotes() {
    var container = document.getElementById('prox-q-stale-list');
    if (!container) return;
    var quotes = STORE.arr('ingly_quotes').filter(function (q) {
      var d = daysDiff(q.createdAt);
      return (q.status === 'sent' || q.status === 'open' || !q.status) && d < -3;
    });
    if (!quotes.length) { container.innerHTML = '<div class="px-empty">Nessun preventivo in attesa di risposta</div>'; return; }
    container.innerHTML = quotes.map(function (q) {
      return '<div class="px-priority-row">' +
        '<div style="flex:1"><div style="font-weight:600">' + esc(q.title || 'Preventivo') + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted)">' + esc(q.clientName || '') + ' · ' + fmtDate(q.createdAt) + ' · ' + fmtEur(q.total || 0) + '</div></div>' +
        '<button class="px-btn px-btn-sm px-btn-secondary prox-followup-btn" data-qid="' + q.id + '" data-client="' + esc(q.clientName) + '" data-title="' + esc(q.title) + '" data-total="' + (q.total || 0) + '">📧 Follow-up AI</button></div>';
    }).join('');
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.prox-followup-btn');
    if (!btn) return;
    var prompt = 'Scrivi una email di follow-up professionale in italiano per il preventivo "' + btn.dataset.title + '" inviato a ' + btn.dataset.client + ' di €' + btn.dataset.total + '. Email breve, cordiale, con call to action.';
    callAI(prompt, null, null, function (text) {
      var w = window.open('', '_blank');
      if (w) { w.document.write('<pre style="font-family:Arial;padding:20px;max-width:700px;margin:0 auto;white-space:pre-wrap">' + text + '</pre>'); w.document.close(); }
    });
  });

  function bindAnalyticsEvents() {
    var period = document.getElementById('prox-analytics-period');
    if (!period) return;
    renderAnalytics(90);
    period.addEventListener('change', function () { renderAnalytics(parseInt(this.value)); });

    var insightsBtn = document.getElementById('prox-analytics-insights-btn');
    if (insightsBtn) insightsBtn.addEventListener('click', function () {
      var container = document.getElementById('prox-insights-container');
      var content = document.getElementById('prox-insights-content');
      container.style.display = '';
      content.innerHTML = '<div class="px-loading"><div class="px-spinner"></div></div>';
      var orders = STORE.arr('ingly_orders');
      var total = orders.reduce(function (s, o) { return s + (+(o.total || 0)); }, 0);
      var prompt = 'Analisi business ultimi 90 giorni. Totale ordini: ' + orders.length + ', fatturato: €' + total.toFixed(0) + '. Fornisci 5 insight pratici e actionable per crescere.';
      callAI(prompt, 'Sei un business analyst per PMI artigianale italiana. Rispondi con 5 insight numerati, concreti.', null, function (t) {
        content.innerHTML = t.split('\n').filter(Boolean).map(function (line) {
          return '<div class="px-insight">' + esc(line) + '</div>';
        }).join('');
      });
    });
  }

  function renderAnalytics(days) {
    var orders = STORE.arr('ingly_orders');
    var cutoff = new Date(Date.now() - days * 86400000);
    var filtered = orders.filter(function (o) { return new Date(o.createdAt || o.date || 0) >= cutoff; });

    // KPIs
    var kpiEl = document.getElementById('prox-analytics-kpis');
    if (kpiEl) {
      var total = filtered.reduce(function (s, o) { return s + (+(o.total || o.price || 0)); }, 0);
      var completed = filtered.filter(function (o) { return o.status === 'completed' || o.status === 'paid'; });
      var avgOrder = filtered.length > 0 ? total / filtered.length : 0;
      kpiEl.innerHTML =
        '<div class="px-kpi"><div class="px-kpi-icon">📦</div><div class="px-kpi-label">Ordini</div><div class="px-kpi-value">' + filtered.length + '</div></div>' +
        '<div class="px-kpi"><div class="px-kpi-icon">💰</div><div class="px-kpi-label">Fatturato</div><div class="px-kpi-value">' + fmtEur(total) + '</div></div>' +
        '<div class="px-kpi"><div class="px-kpi-icon">✅</div><div class="px-kpi-label">Completati</div><div class="px-kpi-value">' + completed.length + '</div></div>' +
        '<div class="px-kpi"><div class="px-kpi-icon">📊</div><div class="px-kpi-label">Valore Medio</div><div class="px-kpi-value">' + fmtEur(avgOrder) + '</div></div>';
    }

    // Revenue chart (SVG)
    var chartEl = document.getElementById('prox-revenue-chart');
    if (chartEl) {
      var buckets = {};
      filtered.forEach(function (o) {
        var d = new Date(o.createdAt || o.date || 0);
        var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        buckets[key] = (buckets[key] || 0) + (+(o.total || o.price || 0));
      });
      var keys = Object.keys(buckets).sort();
      var vals = keys.map(function (k) { return buckets[k]; });
      var maxVal = Math.max.apply(null, vals.concat([1]));
      var W = 500, H = 160, pad = 30;
      if (!keys.length) { chartEl.innerHTML = '<div class="px-empty">Nessun dato nel periodo</div>'; return; }
      var pts = keys.map(function (k, i) {
        var x = pad + i * (W - pad * 2) / Math.max(keys.length - 1, 1);
        var y = H - pad - (buckets[k] / maxVal) * (H - pad * 2);
        return { x: x, y: y, k: k };
      });
      var linePoints = pts.map(function (p) { return p.x + ',' + p.y; }).join(' ');
      // Area polygon: line pts + bottom corners
      var areaPoints = linePoints + ' ' + pts[pts.length - 1].x + ',' + (H - pad) + ' ' + pts[0].x + ',' + (H - pad);
      chartEl.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:' + H + 'px">' +
        '<defs><linearGradient id="prox-rev-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fbbf24" stop-opacity="0.18"/><stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/></linearGradient></defs>' +
        '<polygon fill="url(#prox-rev-grad)" points="' + areaPoints + '"/>' +
        '<polyline fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linejoin="round" points="' + linePoints + '"/>' +
        pts.map(function (p) {
          return '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="#fbbf24"/>' +
            '<text x="' + p.x + '" y="' + (H - 5) + '" text-anchor="middle" font-size="9" fill="#555">' + p.k.slice(5) + '</text>' +
            '<text x="' + p.x + '" y="' + (p.y - 8) + '" text-anchor="middle" font-size="8" fill="#fbbf24">€' + Math.round(buckets[p.k]).toLocaleString('it-IT') + '</text>';
        }).join('') + '</svg>';
    }

    // Technique chart
    var techEl = document.getElementById('prox-technique-chart');
    if (techEl) {
      var techs = {};
      filtered.forEach(function (o) {
        var t = o.technique || 'Altro';
        techs[t] = (techs[t] || 0) + (+(o.total || o.price || 0));
      });
      var maxT = Math.max.apply(null, Object.values(techs).concat([1]));
      techEl.innerHTML = Object.entries(techs).map(function (e) {
        var pct = Math.round(e[1] / maxT * 100);
        return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>' + esc(e[0]) + '</span><span>' + fmtEur(e[1]) + '</span></div>' +
          '<div class="px-stock-bar"><div class="px-stock-fill" style="width:' + pct + '%;background:var(--primary)"></div></div></div>';
      }).join('') || '<div class="px-empty">Nessun dato</div>';
    }

    // Forecast
    var fcastEl = document.getElementById('prox-forecast-table');
    if (fcastEl && keys.length >= 2) {
      var n = vals.length;
      var sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      vals.forEach(function (v, i) { sumX += i; sumY += v; sumXY += i * v; sumXX += i * i; });
      var slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
      var intercept = (sumY - slope * sumX) / n;
      var months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
      var now = new Date();
      var rows = [1, 2, 3].map(function (offset) {
        var d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        var base = Math.max(0, intercept + slope * (n + offset - 1));
        return '<tr><td>' + months[d.getMonth()] + ' ' + d.getFullYear() + '</td>' +
          '<td style="color:var(--red)">' + fmtEur(base * 0.8) + '</td>' +
          '<td style="color:var(--primary)">' + fmtEur(base) + '</td>' +
          '<td style="color:var(--green)">' + fmtEur(base * 1.2) + '</td></tr>';
      }).join('');
      fcastEl.innerHTML = '<div class="px-table-wrap"><table class="px-table"><thead><tr><th>Mese</th><th>Pessimista</th><th>Base</th><th>Ottimista</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    } else if (fcastEl) {
      fcastEl.innerHTML = '<div class="px-empty">Inserisci almeno 2 mesi di dati per il forecasting</div>';
    }

    // Top 5 clients
    var topEl = document.getElementById('prox-top-clients');
    if (topEl) {
      var clientMap = {};
      filtered.forEach(function (o) {
        var name = o.clientName || o.client || 'Sconosciuto';
        clientMap[name] = (clientMap[name] || 0) + (+(o.total || o.price || 0));
      });
      var sorted = Object.entries(clientMap).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
      var maxC = sorted.length > 0 ? sorted[0][1] : 1;
      if (!sorted.length) { topEl.innerHTML = '<div class="px-empty">Nessun dato</div>'; }
      else {
        topEl.innerHTML = sorted.map(function (e, i) {
          var pct = Math.round(e[1] / maxC * 100);
          return '<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">' +
            '<span><strong style="color:var(--primary)">#' + (i+1) + '</strong> ' + esc(e[0]) + '</span>' +
            '<span style="font-weight:700">' + fmtEur(e[1]) + '</span></div>' +
            '<div class="px-stock-bar"><div class="px-stock-fill" style="width:' + pct + '%;background:var(--primary)"></div></div></div>';
        }).join('');
      }
    }
  }

  function bindMarketingEvents() {
    var mtabs = document.getElementById('prox-mkt-tabs');
    if (mtabs) mtabs.addEventListener('click', function (e) {
      var tab = e.target.closest('.px-tab');
      if (!tab) return;
      mtabs.querySelectorAll('.px-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var which = tab.dataset.tab;
      document.getElementById('prox-mkt-social').style.display = which === 'social' ? '' : 'none';
      document.getElementById('prox-mkt-email').style.display = which === 'email' ? '' : 'none';
    });

    var socBtn = document.getElementById('prox-soc-gen-btn');
    if (socBtn) socBtn.addEventListener('click', function () {
      var brief = (document.getElementById('prox-soc-brief') || {}).value || '';
      var platform = (document.getElementById('prox-soc-platform') || {}).value || 'Instagram';
      var tone = (document.getElementById('prox-soc-tone') || {}).value || 'Professionale';
      if (!brief.trim()) { toast && toast('Inserisci un brief', 'warning'); return; }
      var res = document.getElementById('prox-soc-result');
      res.innerHTML = '<div class="px-loading"><div class="px-spinner"></div></div>';
      var prompt = 'Scrivi un post per ' + platform + ' per un laboratorio artigianale di personalizzazione/laser/DTF. Tono: ' + tone + '. Tema: ' + brief + '. Includi emoji pertinenti e hashtag italiani rilevanti. Max 280 caratteri per Twitter, altrimenti max 500.';
      callAI(prompt, 'Sei un social media manager per artigiani creativi italiani.', null, function (t) {
        res.innerHTML = '<div class="px-card" style="padding:12px 14px;background:var(--bg-card2)">' +
          '<div style="white-space:pre-wrap;font-size:13px;line-height:1.6">' + esc(t) + '</div>' +
          '<button class="px-btn px-btn-sm px-btn-secondary" style="margin-top:8px" onclick="navigator.clipboard&&navigator.clipboard.writeText(' + JSON.stringify(t) + ').then(()=>toast&&toast(\'Copiato!\',\'success\'))">📋 Copia</button></div>';
      });
    });

    var emailBtn = document.getElementById('prox-email-gen-btn');
    if (emailBtn) emailBtn.addEventListener('click', function () {
      var subject = (document.getElementById('prox-email-template-name') || {}).value || '';
      var brief = (document.getElementById('prox-email-brief') || {}).value || '';
      var res = document.getElementById('prox-email-result');
      res.innerHTML = '<div class="px-loading"><div class="px-spinner"></div></div>';
      var clients = STORE.arr('ingly_clients');
      var prompt = 'Scrivi una email marketing professionale in italiano. Oggetto: "' + subject + '". Brief: ' + brief + '. Mittente: laboratorio artigianale di personalizzazione/laser/DTF. Clienti destinatari: ' + clients.length + '. Email coinvolgente con call-to-action chiara.';
      callAI(prompt, null, null, function (t) {
        res.innerHTML = '<div class="px-card" style="padding:12px 14px;background:var(--bg-card2)">' +
          '<div style="white-space:pre-wrap;font-size:13px;line-height:1.6">' + esc(t) + '</div>' +
          '<button class="px-btn px-btn-sm px-btn-secondary" style="margin-top:8px" onclick="navigator.clipboard&&navigator.clipboard.writeText(' + JSON.stringify(t) + ').then(()=>toast&&toast(\'Copiato!\',\'success\'))">📋 Copia</button></div>';
      });
    });
  }

  function bindAgentsEvents() {
    var currentAgent = (window._proxAgents || [])[0];

    window._proxSelectAgent = function (id) {
      var agents = window._proxAgents || [];
      currentAgent = agents.find(function (a) { return a.id === id; }) || agents[0];
      agents.forEach(function (a) {
        var card = document.getElementById('prox-agent-card-' + a.id);
        if (card) card.classList.toggle('active', a.id === id);
      });
      var title = document.getElementById('prox-agent-title');
      if (title && currentAgent) title.childNodes[0].textContent = currentAgent.icon + ' ' + currentAgent.name + ' ';
      renderAgentChat(id);
    };

    function renderAgentChat(id) {
      var chat = document.getElementById('prox-agent-chat');
      if (!chat) return;
      var history = (window._proxAgentHistory || {})[id] || [];
      chat.innerHTML = history.length === 0 ?
        '<div class="px-empty" style="padding:20px">Avvia una conversazione con questo agente specializzato.</div>' :
        history.map(function (m) {
          return '<div class="px-msg ' + m.role + '"><div class="px-msg-bubble">' + esc(m.content) + '</div></div>';
        }).join('');
      chat.scrollTop = chat.scrollHeight;
    }

    var sendBtn = document.getElementById('prox-agent-send');
    var input = document.getElementById('prox-agent-input');

    function sendMessage() {
      if (!input || !currentAgent) return;
      var msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      if (!window._proxAgentHistory) window._proxAgentHistory = {};
      if (!window._proxAgentHistory[currentAgent.id]) window._proxAgentHistory[currentAgent.id] = [];
      window._proxAgentHistory[currentAgent.id].push({ role: 'user', content: msg });
      renderAgentChat(currentAgent.id);

      // Show typing
      var chat = document.getElementById('prox-agent-chat');
      var typingEl = document.createElement('div');
      typingEl.className = 'px-msg agent';
      typingEl.innerHTML = '<div class="px-typing"><span></span><span></span><span></span></div>';
      chat.appendChild(typingEl);
      chat.scrollTop = chat.scrollHeight;

      // Build context from real data
      var orders = STORE.arr('ingly_orders');
      var avgVal = orders.length > 0 ? (orders.reduce(function(s,o){return s+(+(o.total||0));},0)/orders.length).toFixed(0) : 0;
      var topTech = (function(){var t={};orders.forEach(function(o){var k=o.technique||'Altro';t[k]=(t[k]||0)+1;});return Object.entries(t).sort(function(a,b){return b[1]-a[1];})[0];})();
      var dataCtx = '\n\n[DATI ERP REALI: clienti=' + STORE.arr('ingly_clients').length + ', ordini_attivi=' + orders.filter(function(o){return o.status!=='completed'&&o.status!=='paid';}).length + ', preventivi_aperti=' + STORE.arr('ingly_quotes').filter(function(q){return q.status!=='accepted'&&q.status!=='rejected';}).length + ', valore_medio_ordine=€' + avgVal + (topTech ? ', tecnica_prevalente=' + topTech[0] : '') + ']';
      callAI(msg, currentAgent.system + dataCtx, null, function (text) {
        typingEl.remove();
        window._proxAgentHistory[currentAgent.id].push({ role: 'agent', content: text });
        renderAgentChat(currentAgent.id);
      });
    }

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

    var clearBtn = document.getElementById('prox-agent-clear');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      if (currentAgent) window._proxAgentHistory[currentAgent.id] = [];
      renderAgentChat(currentAgent ? currentAgent.id : '');
    });
  }

  function bindAutomationsEvents() {
    window._proxToggleAuto = function (id, val) {
      var states = STORE.get('prox_automations') || {};
      states[id] = val;
      STORE.set('prox_automations', states);
      toast && toast('Automazione ' + (val ? 'attivata ✅' : 'disattivata') + ': ' + id, val ? 'success' : 'info');
    };

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.prox-auto-run-btn');
      if (!btn) return;
      var id = btn.dataset.id;
      var res = document.getElementById('prox-auto-result');
      var txt = document.getElementById('prox-auto-result-text');
      res.style.display = '';
      txt.innerHTML = '<div class="px-loading"><div class="px-spinner"></div> Esecuzione automazione...</div>';

      var prompts = {
        lead2cash: 'Simula il workflow Lead-to-Cash. Ho ' + STORE.arr('ingly_quotes').length + ' preventivi. Descrivi lo stato attuale del funnel e 3 azioni per ottimizzare il tasso di conversione.',
        stock: 'Analisi stock. Materiali sotto soglia: ' + STORE.arr('ingly_products').filter(function (p) { return (p.qty || 0) < (p.minQty || 5); }).length + '. Genera lista ordini fornitore prioritari.',
        retention: 'Ho ' + STORE.arr('ingly_clients').length + ' clienti. Genera 3 strategie di retention per clienti inattivi da 60+ giorni, con email di esempio.',
        production: 'Piano produzione. Ho ' + STORE.arr('ingly_orders').filter(function (o) { return o.status !== 'completed'; }).length + ' ordini attivi. Suggerisci sequenza ottimale e batch per efficienza.'
      };

      var name = { lead2cash: 'Lead to Cash', stock: 'Stock Intelligence', retention: 'Customer Retention', production: 'Production Daily' }[id];

      callAI(prompts[id] || 'Analisi automazione ' + id, 'Sei un consulente ERP per artigiani italiani. Risposte pratiche e brevi.', null, function (text) {
        txt.innerHTML = '<div style="white-space:pre-wrap;font-size:13px;line-height:1.5">' + esc(text) + '</div>';
        var log = STORE.arr('prox_automation_log');
        log.unshift({ ts: new Date().toISOString(), name: name, ok: true, msg: text.slice(0, 80) + '...' });
        STORE.set('prox_automation_log', log.slice(0, 20));
        var tbody = document.getElementById('prox-auto-log-body');
        if (tbody) {
          var tr = document.createElement('tr');
          tr.innerHTML = '<td>' + fmtDate(new Date().toISOString()) + '</td><td>' + esc(name) + '</td>' +
            '<td><span class="px-badge green">OK</span></td><td style="font-size:11px;color:var(--text-muted)">' + esc(text.slice(0, 60)) + '...</td>';
          tbody.insertBefore(tr, tbody.firstChild);
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════
     5. NAV INJECTION
  ═══════════════════════════════════════════════════════════ */
  function buildNav() {
    var sidebarNav = document.getElementById('sidebar-nav');
    if (!sidebarNav || document.getElementById('prox-nav-group')) return;

    var items = [
      { id: 'prox-command', icon: '🧠', label: 'Command Center' },
      { id: 'prox-crm', icon: '👥', label: 'CRM Pro' },
      { id: 'prox-production', icon: '🏭', label: 'Production' },
      { id: 'prox-stock', icon: '📦', label: 'Stock AI' },
      { id: 'prox-quotes', icon: '💡', label: 'Preventivi AI' },
      { id: 'prox-analytics', icon: '📊', label: 'Analytics Pro' },
      { id: 'prox-marketing', icon: '🚀', label: 'Marketing' },
      { id: 'prox-agents', icon: '🤖', label: 'AI Agents' },
      { id: 'prox-automations', icon: '⚡', label: 'Automazioni' }
    ];

    var group = document.createElement('div');
    group.id = 'prox-nav-group';
    group.className = 'prox-nav-group';
    group.innerHTML = '<div class="prox-nav-label">✦ PRO X</div>' +
      items.map(function (item) {
        return '<div class="prox-nav-item nav-item" data-section="' + item.id + '" onclick="App.navigate(\'' + item.id + '\')">' +
          '<span style="font-size:15px">' + item.icon + '</span>' +
          '<span>' + item.label + '</span></div>';
      }).join('');

    sidebarNav.appendChild(group);
  }

  /* ═══════════════════════════════════════════════════════════
     6. NAVIGATE HOOK (safe — no wrapping)
  ═══════════════════════════════════════════════════════════ */
  function hookNavigate() {
    var proxIds = ['prox-command','prox-crm','prox-production','prox-stock','prox-quotes','prox-analytics','prox-marketing','prox-agents','prox-automations'];

    // Intercept via Bus if available
    try {
      if (typeof Bus !== 'undefined' && Bus.on) {
        Bus.on('app:section', handleNav);
        Bus.on('app:navigate', handleNav);
      }
    } catch (e) {}

    // Also patch App.navigate once, cleanly
    if (!window._proxNavHooked && typeof App !== 'undefined' && App.navigate) {
      var _orig = App.navigate;
      App.navigate = function (section) {
        handleNav(section);
        return _orig.call(this, section);
      };
      window._proxNavHooked = true;
    }

    function handleNav(section) {
      if (!section) return;
      var isProx = proxIds.indexOf(section) !== -1;
      // Hide/show prox sections
      proxIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('active', id === section);
      });
      // Update nav active state
      document.querySelectorAll('.prox-nav-item').forEach(function (item) {
        item.classList.toggle('active', item.getAttribute('data-section') === section);
      });
      // If going to a prox section, hide original sections
      if (isProx) {
        document.querySelectorAll('.section-view').forEach(function (el) {
          if (proxIds.indexOf(el.id) === -1) el.classList.remove('active');
        });
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     7. BOOT
  ═══════════════════════════════════════════════════════════ */
  var _tries = 0;
  function boot() {
    _tries++;
    if (_tries > 40) { console.warn('[prox] App not ready after 20s'); return; }
    if (typeof App === 'undefined' || !document.getElementById('content-inner')) {
      setTimeout(boot, 500); return;
    }
    try { injectCSS(); } catch (e) {}
    try { buildSections(); } catch (e) { console.error('[prox] sections', e); }
    try { buildNav(); } catch (e) { console.error('[prox] nav', e); }
    try { hookNavigate(); } catch (e) { console.error('[prox] navigate', e); }
    console.log('[prox] INGLY OS PRO X loaded ✅ — 9 moduli attivi');
    try { toast && toast('INGLY OS PRO X attivo ✨', 'success', 3000); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 1000); });
  } else {
    setTimeout(boot, 1000);
  }

})();

