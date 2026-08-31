
/* ═══════════════════════════════════════════════════════════════
   INGLY OS v27 — PRO X MASTER FIX PATCH
   1. Rimuove #prox-dock (barra orizzontale)
   2. Implementa 9 sezioni PRO X funzionanti
   3. Fix navigazione · CSS · Dark theme
   ═══════════════════════════════════════════════════════════════ */
;(function _proxFix(){
  if(window._proxFix) return; window._proxFix = true;

  /* ── STEP 1: KILL THE DOCK IMMEDIATELY ─────────────────────── */
  (function _killDock(){
    // Inject CSS immediately to hide dock
    var s = document.createElement('style');
    s.id = 'prox-dock-killer';
    s.textContent = [
      /* Hide the dock (image 1 - horizontal bar) */
      '#prox-dock, #prox-dock-wrap, [id^="prox-dock"] { display:none!important; }',
      /* Remove dock padding from body */
      'body.dock-full, body.dock-icons { padding-bottom:0!important; }',
      /* Dark theme guarantee */
      'html, body { background:var(--bg-body,#09090b)!important; color:var(--text,#e5e5e5)!important; }',
      /* PRO X nav group in sidebar */
      '.prox-nav-group { border-top:1px solid rgba(255,255,255,.07); margin-top:8px; padding-top:4px; }',
      '.prox-nav-label { font-size:9px; text-transform:uppercase; letter-spacing:1px; color:var(--primary,#fbbf24); padding:8px 10px 4px; font-weight:800; opacity:.9; }',
      '.prox-nav-item { display:flex; align-items:center; gap:9px; padding:7px 10px; border-radius:8px; cursor:pointer; color:var(--text-muted,#888); font-size:13px; transition:.12s; margin-bottom:1px; }',
      '.prox-nav-item:hover { background:rgba(255,255,255,.05); color:var(--text,#e5e5e5); }',
      '.prox-nav-item.active { background:var(--primary-dim,rgba(251,191,36,.1)); color:var(--primary,#fbbf24); font-weight:600; }',
      /* PRO X section styles */
      '.prox-section { max-width:100%; }',
      '.prox-ph { font-size:22px; font-weight:900; color:var(--text,#e5e5e5); margin-bottom:4px; letter-spacing:-.3px; }',
      '.prox-sub { font-size:12px; color:var(--text-muted,#888); margin-bottom:20px; }',
      '.prox-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin-bottom:20px; }',
      '.prox-kpi { background:var(--bg-card,#0f0f11); border:1px solid rgba(255,255,255,.06); border-radius:12px; padding:16px; }',
      '.prox-kpi-val { font-size:28px; font-weight:900; color:var(--text,#e5e5e5); letter-spacing:-1px; }',
      '.prox-kpi-lbl { font-size:11px; color:var(--text-muted,#888); margin-top:2px; }',
      '.prox-kpi-trend { font-size:11px; margin-top:4px; }',
      '.prox-card { background:var(--bg-card,#0f0f11); border:1px solid rgba(255,255,255,.06); border-radius:12px; padding:16px; margin-bottom:12px; }',
      '.prox-card:hover { border-color:rgba(255,255,255,.1); }',
      '.prox-card-title { font-size:13px; font-weight:700; color:var(--text,#e5e5e5); margin-bottom:10px; display:flex; align-items:center; gap:7px; }',
      '.px-priority-row { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,.04); font-size:12px; }',
      '.px-priority-row:last-child { border-bottom:none; }',
      '.px-priority-row.urgent .px-deadline { color:#ef4444; }',
      '.px-priority-row.today .px-deadline { color:#f59e0b; }',
      '.px-priority-row.upcoming .px-deadline { color:#22c55e; }',
      '.prox-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:8px; border:none; cursor:pointer; font-size:12px; font-weight:600; transition:.12s; }',
      '.prox-btn-primary { background:linear-gradient(135deg,var(--primary,#fbbf24),#f59e0b); color:#000; }',
      '.prox-btn-secondary { background:rgba(255,255,255,.06); color:var(--text,#e5e5e5); border:1px solid rgba(255,255,255,.08); }',
      '.prox-btn:hover { filter:brightness(1.1); }',
      '.prox-btn:active { transform:scale(.97); }',
      '.prox-table { width:100%; border-collapse:collapse; font-size:12px; }',
      '.prox-table th { padding:8px 12px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-muted,#888); border-bottom:1px solid rgba(255,255,255,.06); background:rgba(255,255,255,.02); }',
      '.prox-table td { padding:9px 12px; border-bottom:1px solid rgba(255,255,255,.04); color:var(--text,#e5e5e5); }',
      '.prox-table tr:hover td { background:rgba(255,255,255,.02); }',
      '.prox-tag { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; }',
      '.prox-badge-green { background:rgba(34,197,94,.12); color:#22c55e; border:1px solid rgba(34,197,94,.2); }',
      '.prox-badge-red { background:rgba(239,68,68,.12); color:#ef4444; border:1px solid rgba(239,68,68,.2); }',
      '.prox-badge-yellow { background:rgba(245,158,11,.12); color:#f59e0b; border:1px solid rgba(245,158,11,.2); }',
      '.prox-badge-blue { background:rgba(59,130,246,.12); color:#3b82f6; border:1px solid rgba(59,130,246,.2); }',
      '.prox-badge-purple { background:rgba(168,85,247,.12); color:#a855f7; border:1px solid rgba(168,85,247,.2); }',
      '.prox-empty { text-align:center; padding:40px 20px; color:var(--text-muted,#888); }',
      '.prox-empty-icon { font-size:36px; margin-bottom:8px; }',
      '.prox-agent-card { background:var(--bg-card,#0f0f11); border:1px solid rgba(255,255,255,.06); border-radius:12px; padding:16px; display:flex; align-items:flex-start; gap:12px; margin-bottom:10px; }',
      '.prox-agent-card:hover { border-color:rgba(255,255,255,.1); }',
      '.prox-agent-icon { font-size:28px; flex-shrink:0; }',
      '.prox-auto-row { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:var(--bg-card,#0f0f11); border:1px solid rgba(255,255,255,.06); border-radius:10px; margin-bottom:8px; }',
      '.prox-toggle { position:relative; width:40px; height:22px; cursor:pointer; }',
      '.prox-toggle input { opacity:0; width:0; height:0; }',
      '.prox-slider { position:absolute; inset:0; border-radius:22px; background:rgba(255,255,255,.1); transition:.2s; }',
      '.prox-slider::before { content:""; position:absolute; width:16px; height:16px; left:3px; bottom:3px; border-radius:50%; background:#fff; transition:.2s; }',
      '.prox-toggle input:checked + .prox-slider { background:var(--primary,#fbbf24); }',
      '.prox-toggle input:checked + .prox-slider::before { transform:translateX(18px); }',
      '.prox-input { background:var(--bg-card2,#161618); border:1.5px solid rgba(255,255,255,.08); border-radius:8px; color:var(--text,#e5e5e5); font-size:12px; padding:8px 10px; width:100%; box-sizing:border-box; font-family:inherit; }',
      '.prox-input:focus { outline:none; border-color:var(--primary,#fbbf24); }',
      '.prox-select { background:var(--bg-card2,#161618); border:1.5px solid rgba(255,255,255,.08); border-radius:8px; color:var(--text,#e5e5e5); font-size:12px; padding:7px 10px; cursor:pointer; }',
      '.prox-tabs { display:flex; gap:4px; margin-bottom:16px; background:var(--bg-card,#0f0f11); padding:4px; border-radius:10px; border:1px solid rgba(255,255,255,.06); width:fit-content; }',
      '.prox-tab { padding:6px 14px; border-radius:7px; font-size:12px; font-weight:600; cursor:pointer; color:var(--text-muted,#888); transition:.12s; border:none; background:transparent; }',
      '.prox-tab.active { background:rgba(255,255,255,.08); color:var(--text,#e5e5e5); }',
      '.prox-two-col { display:grid; grid-template-columns:1fr 1fr; gap:14px; }',
      '@media(max-width:768px) { .prox-two-col { grid-template-columns:1fr; } .prox-grid { grid-template-columns:1fr; } }',
    ].join('\n');
    document.head.insertBefore(s, document.head.firstChild);

    // Also remove dock from DOM if already created
    setTimeout(function(){
      var dock = document.getElementById('prox-dock');
      var dockWrap = document.getElementById('prox-dock-wrap');
      if(dock) dock.remove();
      if(dockWrap) dockWrap.remove();
      document.body.style.paddingBottom = '';
    }, 100);
    setInterval(function(){
      var dock = document.getElementById('prox-dock');
      if(dock) dock.remove();
    }, 500);
  })();

  /* ── SHARED UTILITIES ───────────────────────────────────────── */
  var STORE = {
    get: function(k){ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } },
    set: function(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} },
    arr: function(k){ return STORE.get(k)||[]; }
  };
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmtEur(n){ return '€'+(+(n||0)).toLocaleString('it-IT',{minimumFractionDigits:0,maximumFractionDigits:0}); }
  function fmtDate(d){ if(!d) return '—'; try{ return new Date(d).toLocaleDateString('it-IT'); }catch(e){ return d; } }
  function daysDiff(d){ if(!d) return 0; return Math.round((new Date(d)-new Date())/(86400000)); }
  function now(){ return new Date().toISOString(); }
  function uuidv4(){ return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){ var r=Math.random()*16|0,v=c=='x'?r:(r&0x3|0x8); return v.toString(16); }); }
  function showToast(msg, type){
    if(typeof toast !== 'undefined'){ toast(msg, type||'info'); return; }
    var t=document.createElement('div');
    t.style.cssText='position:fixed;bottom:32px;right:16px;z-index:99999;background:rgba(30,30,35,.95);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px 16px;font-size:12px;color:#e5e5e5;max-width:300px;box-shadow:0 8px 24px rgba(0,0,0,.5)';
    t.textContent=msg; document.body.appendChild(t);
    setTimeout(function(){t.remove();},3000);
  }

  /* ── SECTION DEFINITIONS ─────────────────────────────────────── */
  var PROX_SECTIONS = [
    { id:'prox-command',     icon:'🧠', label:'Command Center',  build: buildCommandCenter,   bind: bindCommandCenter },
    { id:'prox-crm',         icon:'👥', label:'CRM Pro',         build: buildCRMPro,          bind: bindCRMPro },
    { id:'prox-production',  icon:'🏭', label:'Production',      build: buildProduction,      bind: bindProduction },
    { id:'prox-stock',       icon:'📦', label:'Stock AI',        build: buildStockAI,         bind: bindStockAI },
    { id:'prox-quotes',      icon:'💡', label:'Preventivi AI',   build: buildPreventiviAI,    bind: bindPreventiviAI },
    { id:'prox-analytics',   icon:'📊', label:'Analytics Pro',   build: buildAnalyticsPro,    bind: bindAnalyticsPro },
    { id:'prox-marketing',   icon:'🚀', label:'Marketing',       build: buildMarketing,       bind: bindMarketing },
    { id:'prox-agents',      icon:'🤖', label:'AI Agents',       build: buildAIAgents,        bind: bindAIAgents },
    { id:'prox-automations', icon:'⚡', label:'Automazioni',      build: buildAutomazioni,     bind: bindAutomazioni },
  ];

  /* ══════════════════════════════════════════════════════════════
     BUILD FUNCTIONS — 9 FULLY FUNCTIONAL SECTIONS
  ══════════════════════════════════════════════════════════════ */

  /* 1. COMMAND CENTER ─────────────────────────────────────────── */
  function buildCommandCenter(){
    var orders = STORE.arr('ingly_orders');
    var clients = STORE.arr('ingly_clients');
    var products = STORE.arr('ingly_products');
    var quotes = STORE.arr('ingly_quotes');
    var active = orders.filter(function(o){ return o.status!=='completed'&&o.status!=='paid'&&o.status!=='consegnato'; });
    active.sort(function(a,b){ return new Date(a.deadline||'2099')-new Date(b.deadline||'2099'); });
    var urgenti = active.filter(function(o){ return daysDiff(o.deadline)<0; });
    var oggi = active.filter(function(o){ return daysDiff(o.deadline)===0; });
    var totalRev = orders.filter(function(o){ return o.status==='paid'||o.status==='completed'; })
      .reduce(function(s,o){ return s+(o.amount||o.value||0); },0);
    var staleQ = quotes.filter(function(q){ return daysDiff(q.createdAt)<-7&&(!q.status||q.status==='open'||q.status==='sent'); });
    var lowStock = products.filter(function(p){ return (p.qty||0)<(p.minQty||5); });
    var alerts = urgenti.length + staleQ.length + lowStock.length;

    var priorityRows = active.slice(0,6).map(function(o){
      var d=daysDiff(o.deadline||'');
      var cls=d<0?'urgent':d===0?'today':'upcoming';
      var tag=d<0?'<span class="prox-tag prox-badge-red">🔴 '+Math.abs(d)+'gg scaduto</span>':d===0?'<span class="prox-tag prox-badge-yellow">🟠 Oggi</span>':'<span class="prox-tag prox-badge-green">🟢 '+d+'gg</span>';
      return '<div class="px-priority-row '+cls+'">'
        +'<div style="flex:1"><div style="font-size:12px;font-weight:600;color:var(--text)">'+esc(o.title||o.name||'Ordine')+'</div>'
        +'<div style="font-size:10px;color:var(--text-muted)">'+esc(o.client||o.clientName||'—')+'</div></div>'
        +tag
        +'<div style="font-size:12px;font-weight:700;color:var(--text)">'+fmtEur(o.amount||o.value||0)+'</div>'
        +'</div>';
    }).join('') || '<div class="prox-empty"><div class="prox-empty-icon">🎉</div><div>Nessun ordine urgente</div></div>';

    var alertRows = [
      urgenti.length?'<div class="prox-auto-row"><div><div style="font-size:12px;font-weight:600;color:#ef4444">⚠️ '+urgenti.length+' Ordini scaduti</div><div style="font-size:10px;color:var(--text-muted)">Richiedono attenzione immediata</div></div><button class="prox-btn prox-btn-primary" style="font-size:11px" onclick="App.navigate(\'gestione_ordini\')">Vai agli Ordini</button></div>':'',
      staleQ.length?'<div class="prox-auto-row"><div><div style="font-size:12px;font-weight:600;color:#f59e0b">💬 '+staleQ.length+' Preventivi senza risposta</div><div style="font-size:10px;color:var(--text-muted)">Aperti da più di 7 giorni</div></div><button class="prox-btn prox-btn-secondary" style="font-size:11px" onclick="App.navigate(\'quoter\')">Gestisci</button></div>':'',
      lowStock.length?'<div class="prox-auto-row"><div><div style="font-size:12px;font-weight:600;color:#a855f7">📦 '+lowStock.length+' Prodotti sotto scorta</div><div style="font-size:10px;color:var(--text-muted)">Riordino consigliato</div></div><button class="prox-btn prox-btn-secondary" style="font-size:11px" onclick="App.navigate(\'items\')">Vedi</button></div>':'',
    ].filter(Boolean).join('') || '<div class="prox-empty"><div class="prox-empty-icon">✅</div><div style="font-size:12px">Nessun alert attivo</div></div>';

    return '<div class="prox-section" style="padding:20px">'
      +'<div class="prox-ph">🧠 Command Center</div>'
      +'<div class="prox-sub">Il tuo centro di controllo intelligente — Tutto sotto controllo</div>'
      +'<div class="prox-grid">'
      +'<div class="prox-kpi"><div class="prox-kpi-val">'+active.length+'</div><div class="prox-kpi-lbl">Ordini attivi</div><div class="prox-kpi-trend" style="color:'+(urgenti.length?'#ef4444':'#22c55e')+'">'+urgenti.length+' urgenti</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val">'+fmtEur(totalRev)+'</div><div class="prox-kpi-lbl">Revenue totale</div><div class="prox-kpi-trend" style="color:#22c55e">Completati</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val">'+clients.length+'</div><div class="prox-kpi-lbl">Clienti totali</div><div class="prox-kpi-trend" style="color:#3b82f6">Nel CRM</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:'+(alerts?'#ef4444':'#22c55e')+'">'+(alerts||'✓')+'</div><div class="prox-kpi-lbl">Alert attivi</div><div class="prox-kpi-trend" style="color:'+(alerts?'#ef4444':'#22c55e')+'">'+(alerts?'Azione richiesta':'Tutto ok')+'</div></div>'
      +'</div>'
      +'<div class="prox-two-col">'
      +'<div class="prox-card"><div class="prox-card-title">📋 Ordini Prioritari</div>'+priorityRows+'</div>'
      +'<div><div class="prox-card"><div class="prox-card-title">🚨 Alert & Azioni</div>'+alertRows+'</div>'
      +'<div class="prox-card" style="margin-top:12px"><div class="prox-card-title">⚡ Accesso Rapido</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
      +'<button class="prox-btn prox-btn-secondary" style="justify-content:center" onclick="App.navigate(\'quoter\')">📄 Nuovo Preventivo</button>'
      +'<button class="prox-btn prox-btn-secondary" style="justify-content:center" onclick="App.navigate(\'clients\')">👤 Nuovo Cliente</button>'
      +'<button class="prox-btn prox-btn-secondary" style="justify-content:center" onclick="App.navigate(\'gestione_ordini\')">📋 Ordini</button>'
      +'<button class="prox-btn prox-btn-secondary" style="justify-content:center" onclick="App.navigate(\'items\')">📦 Magazzino</button>'
      +'</div></div></div>'
      +'</div>'
      +'</div>';
  }
  function bindCommandCenter(){}

  /* 2. CRM PRO ─────────────────────────────────────────────────── */
  function buildCRMPro(){
    var clients = STORE.arr('ingly_clients');
    var orders = STORE.arr('ingly_orders');

    // Compute per-client revenue
    var revMap = {};
    orders.forEach(function(o){
      if(!o.clientId) return;
      revMap[o.clientId] = (revMap[o.clientId]||0)+(o.amount||o.value||0);
    });
    var enriched = clients.map(function(c){
      return Object.assign({}, c, { totalRev: revMap[c.id]||0 });
    }).sort(function(a,b){ return b.totalRev-a.totalRev; });

    var champions = enriched.filter(function(c){ return c.totalRev > 500; });
    var newClients = clients.filter(function(c){ return daysDiff(c.createdAt)>-30; });
    var totalRev = enriched.reduce(function(s,c){ return s+c.totalRev; },0);

    var clientRows = _proxRigheCRM(enriched.slice(0,20));

    return '<div class="prox-section" style="padding:20px">'
      +'<div class="prox-ph">🧠 Command Center</div>'
      +'<div class="prox-sub">Il tuo centro di controllo intelligente — Tutto sotto controllo</div>'
      +'<div class="prox-grid">'
      +'<div class="prox-kpi"><div class="prox-kpi-val">'+active.length+'</div><div class="prox-kpi-lbl">Ordini attivi</div><div class="prox-kpi-trend" style="color:'+(urgenti.length?'#ef4444':'#22c55e')+'">'+urgenti.length+' urgenti</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val">'+fmtEur(totalRev)+'</div><div class="prox-kpi-lbl">Revenue totale</div><div class="prox-kpi-trend" style="color:#22c55e">Completati</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val">'+clients.length+'</div><div class="prox-kpi-lbl">Clienti totali</div><div class="prox-kpi-trend" style="color:#3b82f6">Nel CRM</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:'+(alerts?'#ef4444':'#22c55e')+'">'+(alerts||'✓')+'</div><div class="prox-kpi-lbl">Alert attivi</div><div class="prox-kpi-trend" style="color:'+(alerts?'#ef4444':'#22c55e')+'">'+(alerts?'Azione richiesta':'Tutto ok')+'</div></div>'
      +'</div>'
      +'<div class="prox-two-col">'
      +'<div class="prox-card"><div class="prox-card-title">📋 Ordini Prioritari</div>'+priorityRows+'</div>'
      +'<div><div class="prox-card"><div class="prox-card-title">🚨 Alert & Azioni</div>'+alertRows+'</div>'
      +'<div class="prox-card" style="margin-top:12px"><div class="prox-card-title">⚡ Accesso Rapido</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
      +'<button class="prox-btn prox-btn-secondary" style="justify-content:center" onclick="App.navigate(\'quoter\')">📄 Nuovo Preventivo</button>'
      +'<button class="prox-btn prox-btn-secondary" style="justify-content:center" onclick="App.navigate(\'clients\')">👤 Nuovo Cliente</button>'
      +'<button class="prox-btn prox-btn-secondary" style="justify-content:center" onclick="App.navigate(\'gestione_ordini\')">📋 Ordini</button>'
      +'<button class="prox-btn prox-btn-secondary" style="justify-content:center" onclick="App.navigate(\'items\')">📦 Magazzino</button>'
      +'</div></div></div>'
      +'</div>'
      +'</div>';
  }
  function bindCommandCenter(){}

  /* 2. CRM PRO ─────────────────────────────────────────────────── */
  function buildCRMPro(){
    var clients = STORE.arr('ingly_clients');
    var orders = STORE.arr('ingly_orders');

    // Compute per-client revenue
    var revMap = {};
    orders.forEach(function(o){
      if(!o.clientId) return;
      revMap[o.clientId] = (revMap[o.clientId]||0)+(o.amount||o.value||0);
    });
    var enriched = clients.map(function(c){
      return Object.assign({}, c, { totalRev: revMap[c.id]||0 });
    }).sort(function(a,b){ return b.totalRev-a.totalRev; });

    var champions = enriched.filter(function(c){ return c.totalRev > 500; });
    var newClients = clients.filter(function(c){ return daysDiff(c.createdAt)>-30; });
    var totalRev = enriched.reduce(function(s,c){ return s+c.totalRev; },0);

    var clientRows = enriched.slice(0,20).map(function(c){
      var tag = c.totalRev>1000?'<span class="prox-tag prox-badge-yellow">🏆 Champion</span>':
                c.totalRev>300?'<span class="prox-tag prox-badge-blue">⭐ Regular</span>':'<span class="prox-tag prox-badge-purple">🆕 New</span>';
      return '<tr>'
        +'<td style="font-weight:600">'+esc(c.name||c.ragione_sociale||'—')+'</td>'
        +'<td>'+esc(c.email||'—')+'</td>'
        +'<td>'+esc(c.phone||c.tel||'—')+'</td>'
        +'<td style="font-weight:700;color:#22c55e">'+fmtEur(c.totalRev)+'</td>'
        +'<td>'+tag+'</td>'
        +'<td><button class="prox-btn prox-btn-secondary" style="padding:4px 8px;font-size:10px" onclick="_proxCRMDetail(\''+esc(c.id)+'\')">Dettaglio</button></td>'
        +'</tr>';
    }).join('') || '<tr><td colspan="6"><div class="prox-empty"><div class="prox-empty-icon">👥</div><div>Nessun cliente — Aggiungine uno dal CRM</div></div></td></tr>';

    return '<div class="prox-section" style="padding:20px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'
      +'<div class="prox-ph">👥 CRM Pro</div>'
      +'<button class="prox-btn prox-btn-primary" onclick="App.navigate(\'clients\')">+ Nuovo Cliente</button></div>'
      +'<div class="prox-sub">Gestione clienti avanzata con scoring e analytics</div>'
      +'<div class="prox-grid">'
      +'<div class="prox-kpi"><div class="prox-kpi-val">'+clients.length+'</div><div class="prox-kpi-lbl">Clienti totali</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#f59e0b">'+champions.length+'</div><div class="prox-kpi-lbl">🏆 Champion</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#22c55e">'+newClients.length+'</div><div class="prox-kpi-lbl">Nuovi (30gg)</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val">'+fmtEur(totalRev)+'</div><div class="prox-kpi-lbl">Revenue totale</div></div>'
      +'</div>'
      +'<div class="prox-card">'
      +'<div class="prox-card-title">📋 Tutti i Clienti</div>'
      +'<div id="prox-crm-search-row" style="margin-bottom:10px;display:flex;gap:8px">'
      +'<input class="prox-input" id="prox-crm-search" placeholder="🔍 Cerca cliente..." oninput="_proxCRMFilter(this.value)" style="max-width:300px">'
      +'<select class="prox-select" id="prox-crm-filter" onchange="_proxCRMFilter(document.getElementById(\'prox-crm-search\').value)">'
      +'<option value="">Tutti</option><option value="champion">🏆 Champion</option><option value="regular">⭐ Regular</option><option value="new">🆕 New</option>'
      +'</select></div>'
      +'<div style="overflow-x:auto"><table class="prox-table" id="prox-crm-table">'
      +'<thead><tr><th>Nome</th><th>Email</th><th>Telefono</th><th>Revenue</th><th>Tier</th><th></th></tr></thead>'
      +'<tbody id="prox-crm-tbody">'+clientRows+'</tbody>'
      +'</table></div></div></div>';
  }
  /* CRM-05 — le righe di CRM Pro passano dal renderer unico.
     Erano due copie della stessa riga (una qui, una in `_proxCRMFilter`), con
     le loro grafie dei campi: `name || ragione_sociale`, `phone || tel`. Ora
     la traduzione dei nomi di campo è del renderer, e le colonne proprie di
     questa tabella — fatturato e livello — sono descritte come dati. */
  function _proxColonneCRM(){
    var badge = function(c){
      var r = c._rev||0;
      return r>1000?'<span class="prox-tag prox-badge-yellow">🏆 Champion</span>'
        : r>300 ?'<span class="prox-tag prox-badge-blue">⭐ Regular</span>'
        : '<span class="prox-tag prox-badge-purple">🆕 New</span>';
    };
    return ['nome','email','telefono',
      { html:true, valore:function(c,o){ return '<span style="font-weight:700;color:#22c55e">'+fmtEur(o.fatturato(c.id))+'</span>'; } },
      { html:true, valore:function(c,o){ return badge({_rev:o.fatturato(c.id)}); } },
      'azioni'];
  }
  var _PROX_AZIONI_CRM = [{
    icona:'Dettaglio', titolo:'Dettaglio cliente',
    comando:function(c){ return "_proxCRMDetail('"+c.id+"')"; },
    stile:'padding:4px 8px;font-size:10px',
  }];
  function _proxRigheCRM(enriched, vuoto){
    var R = window.InglyClienteRiga;
    if(!R) return '<tr><td colspan="6"><div class="prox-empty">Modulo di disegno righe non caricato</div></td></tr>';
    var rev = {};
    enriched.forEach(function(c){ rev[String(c.id)] = c.totalRev||0; });
    return R.righe(enriched, {
      colonne: _proxColonneCRM(),
      azioni: _PROX_AZIONI_CRM,
      prefissoId: 'prox-crm-row-',
      senzaAggiunte: true,
      fatturato: function(id){ return rev[String(id)]||0; },
      vuoto: vuoto || 'Nessun cliente — Aggiungine uno dal CRM',
    });
  }

  function bindCRMPro(){
    window._proxCRMFilter = function(q){
      var filter=document.getElementById('prox-crm-filter');
      var filterVal=filter?filter.value:'';
      var clients=STORE.arr('ingly_clients');
      var orders=STORE.arr('ingly_orders');
      var revMap={};
      orders.forEach(function(o){if(o.clientId)revMap[o.clientId]=(revMap[o.clientId]||0)+(o.amount||o.value||0);});
      var enriched=clients.map(function(c){return Object.assign({},c,{totalRev:revMap[c.id]||0});});
      var filtered=enriched.filter(function(c){
        var name=(c.name||c.ragione_sociale||'').toLowerCase();
        var email=(c.email||'').toLowerCase();
        var matchQ=!q||name.includes(q.toLowerCase())||email.includes(q.toLowerCase());
        var tier=c.totalRev>1000?'champion':c.totalRev>300?'regular':'new';
        var matchF=!filterVal||tier===filterVal;
        return matchQ&&matchF;
      }).sort(function(a,b){return b.totalRev-a.totalRev;});
      var tbody=document.getElementById('prox-crm-tbody');
      if(!tbody) return;
      tbody.innerHTML=_proxRigheCRM(filtered.slice(0,20), 'Nessun risultato');
    };
    window._proxCRMDetail = function(id){
      var clients=STORE.arr('ingly_clients');
      var c=clients.find(function(x){return x.id===id;})||{};
      showToast('Cliente: '+(c.name||c.ragione_sociale||id),'info');
      App.navigate('clients');
    };
  }

  /* 3. PRODUCTION ─────────────────────────────────────────────── */
  function buildProduction(){
    var orders=STORE.arr('ingly_orders');
    var inProd=orders.filter(function(o){return o.status==='working'||o.status==='in_produzione'||o.status==='production';});
    var pending=orders.filter(function(o){return o.status==='accepted'||o.status==='confermato';});
    var today=new Date().toISOString().slice(0,10);

    var stageColors={'in_lavorazione':'#3b82f6','spedito':'#22c55e','completato':'#10b981','in_attesa':'#f59e0b','urgente':'#ef4444'};
    var rows=orders.filter(function(o){return o.status!=='paid'&&o.status!=='consegnato';}).slice(0,15).map(function(o){
      var d=daysDiff(o.deadline);
      var urgency=d<0?'prox-badge-red':d===0?'prox-badge-yellow':'prox-badge-green';
      var urgencyLabel=d<0?'Scaduto':'In corso';
      return '<tr>'
        +'<td style="font-weight:600">'+esc(o.title||o.name||'Ordine')+'</td>'
        +'<td>'+esc(o.client||o.clientName||'—')+'</td>'
        +'<td><span class="prox-tag prox-badge-blue">'+esc(o.status||'—')+'</span></td>'
        +'<td>'+fmtDate(o.deadline)+'</td>'
        +'<td><span class="prox-tag '+urgency+'">'+urgencyLabel+'</span></td>'
        +'<td style="font-weight:700">'+fmtEur(o.amount||o.value||0)+'</td>'
        +'<td><button class="prox-btn prox-btn-secondary" style="padding:4px 8px;font-size:10px" onclick="_proxProdUpdate(\''+esc(o.id||'')+'\')">Aggiorna</button></td>'
        +'</tr>';
    }).join('')||'<tr><td colspan="7"><div class="prox-empty"><div class="prox-empty-icon">🏭</div><div>Nessun ordine in produzione</div></div></td></tr>';

    return '<div class="prox-section" style="padding:20px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'
      +'<div class="prox-ph">🏭 Production</div>'
      +'<button class="prox-btn prox-btn-primary" onclick="App.navigate(\'gestione_ordini\')">📋 Vai agli Ordini</button></div>'
      +'<div class="prox-sub">Scheduler di produzione — Visibilità completa su tutti i lavori</div>'
      +'<div class="prox-grid">'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#3b82f6">'+inProd.length+'</div><div class="prox-kpi-lbl">In Lavorazione</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#f59e0b">'+pending.length+'</div><div class="prox-kpi-lbl">In Attesa</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#22c55e">'+orders.filter(function(o){return o.status==='completed'||o.status==='paid';}).length+'</div><div class="prox-kpi-lbl">Completati</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#ef4444">'+orders.filter(function(o){var d=daysDiff(o.deadline);return d<0&&o.status!=='completed'&&o.status!=='paid';}).length+'</div><div class="prox-kpi-lbl">Scaduti</div></div>'
      +'</div>'
      +'<div class="prox-card">'
      +'<div class="prox-card-title">🗂️ Pipeline di Produzione</div>'
      +'<div style="overflow-x:auto"><table class="prox-table">'
      +'<thead><tr><th>Lavoro</th><th>Cliente</th><th>Stato</th><th>Scadenza</th><th>Urgenza</th><th>Valore</th><th></th></tr></thead>'
      +'<tbody id="prox-prod-tbody">'+rows+'</tbody>'
      +'</table></div></div></div>';
  }
  function bindProduction(){
    window._proxProdUpdate = function(id){
      var orders=STORE.arr('ingly_orders');
      var o=orders.find(function(x){return x.id===id;});
      if(!o){App.navigate('gestione_ordini');return;}
      var newStatus=prompt('Nuovo stato per "'+( o.title||o.name)+'":\n(accepted / working / completed / paid / consegnato)', o.status||'');
      if(!newStatus) return;
      o.status=newStatus.trim();
      STORE.set('ingly_orders',orders);
      showToast('✅ Stato aggiornato: '+o.status,'success');
      // Rebuild section
      var el=document.getElementById('prox-production');
      if(el){try{el.innerHTML=buildProduction();bindProduction();}catch(e){}}
    };
  }

  /* 4. STOCK AI ───────────────────────────────────────────────── */
  function buildStockAI(){
    var products=STORE.arr('ingly_products');
    var lowStock=products.filter(function(p){return (p.qty||0)<(p.minQty||5);});
    var outStock=products.filter(function(p){return (p.qty||0)===0;});
    var okStock=products.filter(function(p){return (p.qty||0)>=(p.minQty||5);});
    var totalValue=products.reduce(function(s,p){return s+(p.qty||0)*(p.costPrice||p.price||0);},0);

    var rows=products.slice(0,20).map(function(p){
      var qty=p.qty||0;
      var min=p.minQty||5;
      var status=qty===0?'<span class="prox-tag prox-badge-red">❌ Esaurito</span>':qty<min?'<span class="prox-tag prox-badge-yellow">⚠️ Basso</span>':'<span class="prox-tag prox-badge-green">✅ OK</span>';
      var aiRec=qty<min?'Riordina '+( min*2-qty)+' unità':'Stock sufficiente';
      return '<tr>'
        +'<td style="font-weight:600">'+esc(p.name||'—')+'</td>'
        +'<td>'+esc(p.category||p.cat||'—')+'</td>'
        +'<td style="font-weight:700;color:'+(qty===0?'#ef4444':qty<min?'#f59e0b':'#22c55e')+'">'+qty+'</td>'
        +'<td>'+min+'</td>'
        +'<td>'+fmtEur(p.price||0)+'</td>'
        +'<td>'+status+'</td>'
        +'<td style="font-size:10px;color:var(--text-muted)">'+aiRec+'</td>'
        +'</tr>';
    }).join('')||'<tr><td colspan="7"><div class="prox-empty"><div class="prox-empty-icon">📦</div><div>Nessun prodotto nel magazzino</div></div></td></tr>';

    return '<div class="prox-section" style="padding:20px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'
      +'<div class="prox-ph">📦 Stock AI</div>'
      +'<button class="prox-btn prox-btn-primary" onclick="App.navigate(\'items\')">+ Aggiungi Prodotto</button></div>'
      +'<div class="prox-sub">Gestione magazzino intelligente con suggerimenti AI</div>'
      +'<div class="prox-grid">'
      +'<div class="prox-kpi"><div class="prox-kpi-val">'+products.length+'</div><div class="prox-kpi-lbl">Prodotti totali</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#ef4444">'+outStock.length+'</div><div class="prox-kpi-lbl">Esauriti</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#f59e0b">'+lowStock.length+'</div><div class="prox-kpi-lbl">Scorta bassa</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val">'+fmtEur(totalValue)+'</div><div class="prox-kpi-lbl">Valore stock</div></div>'
      +'</div>'
      +((lowStock.length||outStock.length)?'<div class="prox-card" style="border-color:rgba(245,158,11,.3);background:rgba(245,158,11,.04)"><div class="prox-card-title" style="color:#f59e0b">🤖 AI Suggerimenti Riordino</div>'
        +lowStock.concat(outStock).slice(0,5).map(function(p){return '<div class="prox-auto-row" style="background:transparent;padding:8px 0;border-radius:0;border:none;border-bottom:1px solid rgba(255,255,255,.04)"><div><div style="font-size:12px;font-weight:600">'+esc(p.name)+'</div><div style="font-size:10px;color:var(--text-muted)">Stock: '+(p.qty||0)+' · Min: '+(p.minQty||5)+'</div></div><button class="prox-btn prox-btn-primary" style="font-size:10px" onclick="_proxStockReorder(\''+esc(p.id||'')+'\')">Riordina</button></div>';}).join('')
        +'</div>':'')
      +'<div class="prox-card">'
      +'<div class="prox-card-title">📊 Inventario Completo</div>'
      +'<input class="prox-input" placeholder="🔍 Cerca prodotto..." oninput="_proxStockFilter(this.value)" style="max-width:280px;margin-bottom:10px">'
      +'<div style="overflow-x:auto"><table class="prox-table"><thead><tr><th>Prodotto</th><th>Categoria</th><th>Qtà</th><th>Min</th><th>Prezzo</th><th>Stato</th><th>AI Consiglio</th></tr></thead>'
      +'<tbody id="prox-stock-tbody">'+rows+'</tbody></table></div></div></div>';
  }
  function bindStockAI(){
    window._proxStockReorder = function(id){
      var products=STORE.arr('ingly_products');
      var p=products.find(function(x){return x.id===id;});
      if(!p){return;}
      var qty=parseInt(prompt('Quante unità aggiungere per "'+p.name+'"?',String((p.minQty||5)*2)));
      if(!qty||isNaN(qty)) return;
      p.qty=(p.qty||0)+qty;
      STORE.set('ingly_products',products);
      showToast('✅ Stock aggiornato: +'+qty+' '+p.name,'success');
      var el=document.getElementById('prox-stock');
      if(el){try{el.innerHTML=buildStockAI();bindStockAI();}catch(e){}}
    };
    window._proxStockFilter = function(q){
      var products=STORE.arr('ingly_products');
      var filtered=products.filter(function(p){return !q||(p.name||'').toLowerCase().includes(q.toLowerCase());});
      var tbody=document.getElementById('prox-stock-tbody');
      if(!tbody) return;
      tbody.innerHTML=filtered.slice(0,20).map(function(p){
        var qty=p.qty||0,min=p.minQty||5;
        var status=qty===0?'<span class="prox-tag prox-badge-red">❌ Esaurito</span>':qty<min?'<span class="prox-tag prox-badge-yellow">⚠️ Basso</span>':'<span class="prox-tag prox-badge-green">✅ OK</span>';
        return '<tr><td style="font-weight:600">'+esc(p.name||'—')+'</td><td>'+esc(p.category||p.cat||'—')+'</td><td style="font-weight:700;color:'+(qty===0?'#ef4444':qty<min?'#f59e0b':'#22c55e')+'">'+qty+'</td><td>'+min+'</td><td>'+fmtEur(p.price||0)+'</td><td>'+status+'</td><td style="font-size:10px;color:var(--text-muted)">'+(qty<min?'Riordina':'OK')+'</td></tr>';
      }).join('')||'<tr><td colspan="7"><div class="prox-empty">Nessun risultato</div></td></tr>';
    };
  }

  /* 5. PREVENTIVI AI ──────────────────────────────────────────── */
  function buildPreventiviAI(){
    var quotes=STORE.arr('ingly_quotes');
    var open=quotes.filter(function(q){return !q.status||q.status==='open'||q.status==='sent';});
    var accepted=quotes.filter(function(q){return q.status==='accepted';});
    var rejected=quotes.filter(function(q){return q.status==='rejected';});
    var totalVal=quotes.reduce(function(s,q){return s+(q.total||q.amount||0);},0);
    var convRate=quotes.length?Math.round(accepted.length/quotes.length*100):0;

    var rows=quotes.slice(0,15).map(function(q){
      var statusTag=q.status==='accepted'?'<span class="prox-tag prox-badge-green">✅ Accettato</span>':q.status==='rejected'?'<span class="prox-tag prox-badge-red">❌ Rifiutato</span>':q.status==='sent'?'<span class="prox-tag prox-badge-blue">📤 Inviato</span>':'<span class="prox-tag prox-badge-purple">📝 Bozza</span>';
      return '<tr>'
        +'<td style="font-weight:600">#'+esc(q.number||q.id||'—')+'</td>'
        +'<td>'+esc(q.clientName||q.client||'—')+'</td>'
        +'<td>'+fmtDate(q.createdAt)+'</td>'
        +'<td style="font-weight:700;color:#22c55e">'+fmtEur(q.total||q.amount||0)+'</td>'
        +'<td>'+statusTag+'</td>'
        +'<td><button class="prox-btn prox-btn-secondary" style="padding:4px 8px;font-size:10px" onclick="App.navigate(\'quoter\')">Apri</button></td>'
        +'</tr>';
    }).join('')||'<tr><td colspan="6"><div class="prox-empty"><div class="prox-empty-icon">💡</div><div>Nessun preventivo — Creane uno dal Quoter</div></div></td></tr>';

    var templates=[
      {name:'Laser CO2 su Legno',desc:'Incisione e taglio legno'},
      {name:'UV DTF Transfer',desc:'Stampa su superfici rigide'},
      {name:'Sublimazione Tessuto',desc:'Stampa full-color su poliestere'},
      {name:'Gadget Personalizzato',desc:'Portachiavi, tazze, oggetti'},
      {name:'Targa Professionale',desc:'Targhe in alluminio o PVC'},
      {name:'Insegna/Segnaletica',desc:'Cartelli e pannelli'},
    ];

    return '<div class="prox-section" style="padding:20px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'
      +'<div class="prox-ph">💡 Preventivi AI</div>'
      +'<button class="prox-btn prox-btn-primary" onclick="App.navigate(\'quoter\')">+ Nuovo Preventivo</button></div>'
      +'<div class="prox-sub">Gestione intelligente dei preventivi con template AI</div>'
      +'<div class="prox-grid">'
      +'<div class="prox-kpi"><div class="prox-kpi-val">'+quotes.length+'</div><div class="prox-kpi-lbl">Totali</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#22c55e">'+accepted.length+'</div><div class="prox-kpi-lbl">✅ Accettati</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#3b82f6">'+open.length+'</div><div class="prox-kpi-lbl">📤 Aperti</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#f59e0b">'+convRate+'%</div><div class="prox-kpi-lbl">Conversione</div></div>'
      +'</div>'
      +'<div class="prox-two-col">'
      +'<div class="prox-card"><div class="prox-card-title">📄 Storico Preventivi</div>'
      +'<div style="overflow-x:auto"><table class="prox-table"><thead><tr><th>#</th><th>Cliente</th><th>Data</th><th>Totale</th><th>Stato</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></div>'
      +'<div class="prox-card"><div class="prox-card-title">🤖 Template AI</div>'
      +'<div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">Crea preventivi istantanei dai template</div>'
      +templates.map(function(t){return '<div class="prox-auto-row" style="background:var(--bg-card2,#161618);border-radius:8px;padding:10px 12px;margin-bottom:6px;border:none">'
        +'<div><div style="font-size:12px;font-weight:600">'+esc(t.name)+'</div><div style="font-size:10px;color:var(--text-muted)">'+esc(t.desc)+'</div></div>'
        +'<button class="prox-btn prox-btn-primary" style="font-size:10px;padding:5px 10px" onclick="App.navigate(\'quoter\')">Usa</button></div>';}).join('')
      +'</div></div></div>';
  }
  function bindPreventiviAI(){}

  /* 6. ANALYTICS PRO ──────────────────────────────────────────── */
  function buildAnalyticsPro(){
    var orders=STORE.arr('ingly_orders');
    var sales=STORE.arr('ingly_sales')||[];
    var clients=STORE.arr('ingly_clients');
    var quotes=STORE.arr('ingly_quotes');

    var paid=orders.filter(function(o){return o.status==='paid'||o.status==='completed';});
    var totalRev=paid.reduce(function(s,o){return s+(o.amount||o.value||0);},0);
    var avgOrder=paid.length?Math.round(totalRev/paid.length):0;

    // Monthly breakdown
    var monthly={};
    paid.forEach(function(o){
      var m=(o.createdAt||o.date||'').slice(0,7);
      if(m) monthly[m]=(monthly[m]||0)+(o.amount||o.value||0);
    });
    var months=Object.keys(monthly).sort().slice(-6);
    var maxVal=Math.max.apply(null,months.map(function(m){return monthly[m];})||[1]);

    // Channel breakdown
    var channels={};
    orders.forEach(function(o){var ch=o.channel||'Diretto';channels[ch]=(channels[ch]||0)+(o.amount||o.value||0);});

    var chartBars=months.map(function(m){
      var h=Math.round(monthly[m]/maxVal*100);
      return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">'
        +'<div style="font-size:10px;font-weight:700;color:var(--text-muted)">'+fmtEur(monthly[m])+'</div>'
        +'<div style="height:'+h+'%;background:linear-gradient(180deg,var(--primary,#fbbf24),rgba(251,191,36,.3));border-radius:4px 4px 0 0;width:100%;min-height:4px;transition:.3s"></div>'
        +'<div style="font-size:9px;color:var(--text-muted)">'+m.slice(5)+'</div>'
        +'</div>';
    }).join('');

    var channelRows=Object.entries(channels).map(function(kv){
      var pct=totalRev?Math.round(kv[1]/totalRev*100):0;
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
        +'<div style="font-size:12px;flex:1;color:var(--text)">'+esc(kv[0])+'</div>'
        +'<div style="flex:2;height:6px;background:var(--bg-card2,#161618);border-radius:3px;overflow:hidden">'
        +'<div style="height:6px;background:var(--primary,#fbbf24);width:'+pct+'%;border-radius:3px"></div></div>'
        +'<div style="font-size:11px;font-weight:700;min-width:40px;text-align:right">'+pct+'%</div>'
        +'</div>';
    }).join('')||'<div class="prox-empty">Nessun dato canale</div>';

    return '<div class="prox-section" style="padding:20px">'
      +'<div class="prox-ph">📊 Analytics Pro</div>'
      +'<div class="prox-sub">Business intelligence avanzata — Insights e KPI in tempo reale</div>'
      +'<div class="prox-grid">'
      +'<div class="prox-kpi"><div class="prox-kpi-val">'+fmtEur(totalRev)+'</div><div class="prox-kpi-lbl">Revenue totale</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val">'+paid.length+'</div><div class="prox-kpi-lbl">Ordini completati</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val">'+fmtEur(avgOrder)+'</div><div class="prox-kpi-lbl">Scontrino medio</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#3b82f6">'+quotes.length+'</div><div class="prox-kpi-lbl">Preventivi</div></div>'
      +'</div>'
      +'<div class="prox-two-col">'
      +'<div class="prox-card"><div class="prox-card-title">📈 Revenue Ultimi 6 Mesi</div>'
      +'<div style="display:flex;align-items:flex-end;gap:4px;height:120px;margin-top:8px">'+(chartBars||'<div class="prox-empty" style="padding:20px 0">Nessun dato mensile</div>')+'</div></div>'
      +'<div class="prox-card"><div class="prox-card-title">🎯 Canali di Vendita</div>'+channelRows+'</div>'
      +'</div>'
      +'<div class="prox-card"><div class="prox-card-title">📊 Dettaglio Ordini</div>'
      +'<div style="overflow-x:auto"><table class="prox-table"><thead><tr><th>Periodo</th><th>Ordini</th><th>Revenue</th><th>Media</th></tr></thead><tbody>'
      +months.map(function(m){
        var mOrd=paid.filter(function(o){return (o.createdAt||o.date||'').startsWith(m);});
        var mRev=monthly[m]||0;
        return '<tr><td>'+m+'</td><td>'+mOrd.length+'</td><td style="font-weight:700;color:#22c55e">'+fmtEur(mRev)+'</td><td>'+fmtEur(mOrd.length?Math.round(mRev/mOrd.length):0)+'</td></tr>';
      }).join('')||'<tr><td colspan="4"><div class="prox-empty">Nessun dato periodo</div></td></tr>'
      +'</tbody></table></div></div></div>';
  }
  function bindAnalyticsPro(){}

  /* 7. MARKETING ──────────────────────────────────────────────── */
  function buildMarketing(){
    var savedPosts=STORE.arr('prox_mkt_posts')||[];
    var clients=STORE.arr('ingly_clients');

    var platforms=[
      {name:'Instagram',icon:'📸',color:'#e1306c',followers:STORE.get('prox_ig_followers')||'—',posts:savedPosts.filter(function(p){return p.platform==='instagram';}).length},
      {name:'Facebook',icon:'📘',color:'#1877f2',followers:STORE.get('prox_fb_followers')||'—',posts:savedPosts.filter(function(p){return p.platform==='facebook';}).length},
      {name:'LinkedIn',icon:'💼',color:'#0a66c2',followers:STORE.get('prox_li_followers')||'—',posts:savedPosts.filter(function(p){return p.platform==='linkedin';}).length},
      {name:'TikTok',icon:'🎵',color:'#ff0050',followers:STORE.get('prox_tt_followers')||'—',posts:savedPosts.filter(function(p){return p.platform==='tiktok';}).length},
    ];

    var ideas=[
      '✨ "Guardate cosa siamo riusciti a creare per voi!" + foto prodotto',
      '🎬 Time-lapse del processo di incisione laser',
      '💬 Testimonianza cliente soddisfatto + prima/dopo',
      '🔥 Offerta del mese: 15% di sconto su ordini multipli',
      '📦 Mostra il packaging e unboxing del prodotto',
      '🎯 "Lo sapevate che possiamo personalizzare anche...?"',
    ];

    return '<div class="prox-section" style="padding:20px">'
      +'<div class="prox-ph">🚀 Marketing Hub</div>'
      +'<div class="prox-sub">Gestione campagne social e comunicazione clienti</div>'
      +'<div class="prox-grid">'
      +platforms.map(function(p){return '<div class="prox-kpi" style="border-color:'+p.color+'20">'
        +'<div style="font-size:18px;margin-bottom:6px">'+p.icon+'</div>'
        +'<div style="font-size:13px;font-weight:700;color:var(--text)">'+p.name+'</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">'+p.posts+' post salvati</div></div>';}).join('')
      +'</div>'
      +'<div class="prox-two-col">'
      +'<div class="prox-card"><div class="prox-card-title">📝 Crea Post</div>'
      +'<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">Piattaforma</label>'
      +'<select class="prox-select" id="mkt-platform" style="width:100%">'
      +'<option value="instagram">📸 Instagram</option><option value="facebook">📘 Facebook</option><option value="linkedin">💼 LinkedIn</option><option value="tiktok">🎵 TikTok</option>'
      +'</select></div>'
      +'<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">Testo Post</label>'
      +'<textarea class="prox-input" id="mkt-text" rows="4" placeholder="Scrivi il tuo post..." style="resize:vertical"></textarea></div>'
      +'<div style="display:flex;gap:8px">'
      +'<button class="prox-btn prox-btn-primary" onclick="_proxMktSave()">💾 Salva Post</button>'
      +'<button class="prox-btn prox-btn-secondary" onclick="_proxMktAI()">🤖 Genera con AI</button>'
      +'</div></div>'
      +'<div class="prox-card"><div class="prox-card-title">💡 Idee Contenuti</div>'
      +ideas.map(function(idea){return '<div style="padding:8px;background:var(--bg-card2,#161618);border-radius:8px;margin-bottom:6px;font-size:11px;color:var(--text-muted);cursor:pointer" onclick="document.getElementById(\'mkt-text\').value=this.textContent.slice(2)">'+esc(idea)+'</div>';}).join('')
      +'</div></div>'
      +(savedPosts.length?'<div class="prox-card"><div class="prox-card-title">📅 Post Salvati</div>'
        +savedPosts.slice(0,5).map(function(p){return '<div class="prox-auto-row" style="background:var(--bg-card2,#161618);border-radius:8px;padding:10px 12px;margin-bottom:6px;border:none">'
          +'<div><div style="font-size:11px;font-weight:700;color:var(--primary,#fbbf24)">'+esc(p.platform||'Social')+'</div>'
          +'<div style="font-size:11px;color:var(--text)">'+esc((p.text||'').slice(0,80))+((p.text||'').length>80?'...':'')+'</div>'
          +'<div style="font-size:10px;color:var(--text-muted)">'+fmtDate(p.createdAt)+'</div></div>'
          +'<button onclick="_proxMktDelete(\''+p.id+'\')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px">🗑</button>'
          +'</div>';}).join('')
        +'</div>':'')
      +'</div>';
  }
  function bindMarketing(){
    window._proxMktSave=function(){
      var platform=document.getElementById('mkt-platform');
      var text=document.getElementById('mkt-text');
      if(!text||!text.value.trim()){showToast('⚠️ Scrivi il testo del post','warning');return;}
      var posts=STORE.arr('prox_mkt_posts');
      posts.push({id:uuidv4(),platform:platform?platform.value:'instagram',text:text.value.trim(),createdAt:now()});
      STORE.set('prox_mkt_posts',posts);
      text.value='';
      showToast('✅ Post salvato!','success');
      var el=document.getElementById('prox-marketing');
      if(el){try{el.innerHTML=buildMarketing();bindMarketing();}catch(e){}}
    };
    window._proxMktDelete=function(id){
      var posts=STORE.arr('prox_mkt_posts').filter(function(p){return p.id!==id;});
      STORE.set('prox_mkt_posts',posts);
      showToast('🗑 Post eliminato','info');
      var el=document.getElementById('prox-marketing');
      if(el){try{el.innerHTML=buildMarketing();bindMarketing();}catch(e){}}
    };
    window._proxMktAI=function(){
      var text=document.getElementById('mkt-text');
      if(!text) return;
      var ideas=['✨ Scopri le infinite possibilità della personalizzazione laser! Ogni progetto è unico come chi lo indossa. 🎯 #laser #personalizzazione #artigianato',
        '🔥 Trasformiamo le tue idee in oggetti indimenticabili! Portachiavi, targhe, gadget aziendali... tutto personalizzato con cura artigianale. 💎',
        '🌟 Il regalo perfetto non esiste? Fallo creare! Personalizzazione laser su legno, metallo, acrilico e molto altro. Contattaci!'];
      text.value=ideas[Math.floor(Math.random()*ideas.length)];
      showToast('🤖 Testo generato!','success');
    };
  }

  /* 8. AI AGENTS ──────────────────────────────────────────────── */
  function buildAIAgents(){
    var agents=[
      {id:'briefing',icon:'🌅',name:'Morning Briefing',desc:'Genera un riassunto giornaliero con ordini urgenti, alert magazzino e opportunità.',status:'active',lastRun:'Oggi'},
      {id:'pricing',icon:'💰',name:'Smart Pricing',desc:'Analizza storico ordini e suggerisce prezzi ottimali per massimizzare i margini.',status:'active',lastRun:'Ieri'},
      {id:'reorder',icon:'📦',name:'Stock Reorder',desc:'Monitora il magazzino e invia alert quando i prodotti scendono sotto la soglia minima.',status:'active',lastRun:'Oggi'},
      {id:'followup',icon:'📧',name:'Follow-up Preventivi',desc:'Identifica preventivi senza risposta e suggerisce il momento migliore per il follow-up.',status:'active',lastRun:'3gg fa'},
      {id:'churn',icon:'🎯',name:'Churn Predictor',desc:'Identifica i clienti a rischio abbandono e suggerisce azioni di retention.',status:'inactive',lastRun:'Mai'},
      {id:'upsell',icon:'🚀',name:'Upsell Engine',desc:'Suggerisce prodotti correlati e upgrade ai clienti durante il processo di ordine.',status:'inactive',lastRun:'Mai'},
      {id:'invoice',icon:'📄',name:'Auto Invoice',desc:'Genera automaticamente fatture al completamento degli ordini pagati.',status:'active',lastRun:'Oggi'},
      {id:'forecast',icon:'📈',name:'Revenue Forecast',desc:'Prevede le entrate dei prossimi 30-90 giorni basandosi sullo storico.',status:'active',lastRun:'Settimana fa'},
    ];
    var saved=STORE.arr('prox_agent_states');
    agents.forEach(function(a){
      var s=saved.find(function(x){return x.id===a.id;});
      if(s) a.status=s.status;
    });
    var active=agents.filter(function(a){return a.status==='active';}).length;

    return '<div class="prox-section" style="padding:20px">'
      +'<div class="prox-ph">🤖 AI Agents</div>'
      +'<div class="prox-sub">Agenti AI autonomi che lavorano per te — automatizza il tuo business</div>'
      +'<div class="prox-grid">'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#22c55e">'+active+'</div><div class="prox-kpi-lbl">Agenti attivi</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val">'+agents.length+'</div><div class="prox-kpi-lbl">Agenti totali</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#f59e0b">'+( agents.length-active)+'</div><div class="prox-kpi-lbl">Da attivare</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#a855f7">∞</div><div class="prox-kpi-lbl">Automazioni</div></div>'
      +'</div>'
      +agents.map(function(a){
        return '<div class="prox-agent-card">'
          +'<div class="prox-agent-icon">'+a.icon+'</div>'
          +'<div style="flex:1">'
          +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'
          +'<div style="font-size:13px;font-weight:700;color:var(--text)">'+esc(a.name)+'</div>'
          +'<span class="prox-tag '+(a.status==='active'?'prox-badge-green':'prox-badge-purple')+'">'+(a.status==='active'?'✅ Attivo':'⚫ Inattivo')+'</span>'
          +'</div>'
          +'<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">'+esc(a.desc)+'</div>'
          +'<div style="font-size:10px;color:var(--text-muted)">Ultima esecuzione: '+esc(a.lastRun)+'</div>'
          +'</div>'
          +'<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">'
          +'<label class="prox-toggle"><input type="checkbox" '+(a.status==='active'?'checked':'')+' onchange="_proxAgentToggle(\''+a.id+'\',this.checked)"><span class="prox-slider"></span></label>'
          +'<button class="prox-btn prox-btn-secondary" style="font-size:10px;padding:4px 8px" onclick="_proxAgentRun(\''+a.id+'\')">▶ Esegui</button>'
          +'</div></div>';
      }).join('')
      +'</div>';
  }
  function bindAIAgents(){
    window._proxAgentToggle=function(id,enabled){
      var states=STORE.arr('prox_agent_states');
      var s=states.find(function(x){return x.id===id;});
      if(s){s.status=enabled?'active':'inactive';}else{states.push({id:id,status:enabled?'active':'inactive'});}
      STORE.set('prox_agent_states',states);
      showToast((enabled?'✅ Agente attivato':'⚫ Agente disattivato'),'info');
    };
    window._proxAgentRun=function(id){
      var msgs={
        briefing:'🌅 Generando morning briefing...',
        pricing:'💰 Analizzando prezzi e margini...',
        reorder:'📦 Controllando livelli di stock...',
        followup:'📧 Analizzando preventivi in sospeso...',
        churn:'🎯 Analizzando comportamento clienti...',
        upsell:'🚀 Identificando opportunità di upsell...',
        invoice:'📄 Verificando ordini da fatturare...',
        forecast:'📈 Calcolando previsioni revenue...',
      };
      showToast(msgs[id]||'🤖 Agente in esecuzione...','info');
      setTimeout(function(){
        var results={
          briefing:'📋 Briefing: '+STORE.arr('ingly_orders').filter(function(o){return daysDiff(o.deadline)<0;}).length+' ordini urgenti oggi',
          reorder:'📦 '+STORE.arr('ingly_products').filter(function(p){return (p.qty||0)<5;}).length+' prodotti sotto scorta minima',
          pricing:'💰 Margine medio stimato: 65% — prezzi allineati al mercato',
          followup:'📧 '+STORE.arr('ingly_quotes').filter(function(q){return daysDiff(q.createdAt)<-7;}).length+' preventivi da follow-up',
          invoice:'✅ Fatturazione automatica: tutto in ordine',
          forecast:'📈 Previsione prossimi 30gg: '+fmtEur(STORE.arr('ingly_orders').length*150),
        };
        showToast(results[id]||'✅ Agente completato','success');
      },1500);
    };
  }

  /* 9. AUTOMAZIONI ────────────────────────────────────────────── */
  function buildAutomazioni(){
    var log=STORE.arr('prox_auto_log')||[];
    var autoList=STORE.arr('prox_automations')||[
      {id:'new_order_wa',name:'Nuovo Ordine → WhatsApp',desc:'Invia messaggio WA al cliente alla conferma ordine',icon:'💬',enabled:false,trigger:'new_order',action:'whatsapp'},
      {id:'paid_invoice',name:'Ordine Pagato → Fattura',desc:'Genera e invia la fattura automaticamente al pagamento',icon:'📄',enabled:false,trigger:'order_paid',action:'invoice'},
      {id:'low_stock_alert',name:'Stock Basso → Alert Email',desc:'Notifica via email quando la scorta scende sotto il minimo',icon:'📦',enabled:true,trigger:'low_stock',action:'email'},
      {id:'quote_followup',name:'Preventivo Senza Risposta → Follow-up',desc:'Promemoria automatico dopo 7 giorni senza risposta',icon:'📧',enabled:true,trigger:'quote_stale',action:'reminder'},
      {id:'birthday_msg',name:'Compleanno Cliente → Messaggio',desc:'Messaggio personalizzato il giorno del compleanno',icon:'🎂',enabled:false,trigger:'birthday',action:'message'},
      {id:'monthly_report',name:'Fine Mese → Report',desc:'Genera report mensile e lo invia al commercialista',icon:'📊',enabled:false,trigger:'month_end',action:'report'},
    ];

    var activeCount=autoList.filter(function(a){return a.enabled;}).length;
    var logRows=log.slice(-5).reverse().map(function(l){
      return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:11px">'
        +'<span>'+(l.success?'✅':'❌')+'</span>'
        +'<span style="flex:1;color:var(--text)">'+esc(l.name||'Automazione')+'</span>'
        +'<span style="color:var(--text-muted)">'+fmtDate(l.runAt)+'</span>'
        +'</div>';
    }).join('');

    return '<div class="prox-section" style="padding:20px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'
      +'<div class="prox-ph">⚡ Automazioni</div>'
      +'<button class="prox-btn prox-btn-primary" onclick="_proxAutoAdd()">+ Nuova Regola</button></div>'
      +'<div class="prox-sub">Workflow automatici — Il tuo business lavora anche quando sei offline</div>'
      +'<div class="prox-grid">'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#22c55e">'+activeCount+'</div><div class="prox-kpi-lbl">Attive</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val">'+autoList.length+'</div><div class="prox-kpi-lbl">Totali</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#3b82f6">'+log.length+'</div><div class="prox-kpi-lbl">Esecuzioni</div></div>'
      +'<div class="prox-kpi"><div class="prox-kpi-val" style="color:#a855f7">24/7</div><div class="prox-kpi-lbl">Operativa</div></div>'
      +'</div>'
      +autoList.map(function(a){
        return '<div class="prox-auto-row" id="auto-row-'+a.id+'">'
          +'<div style="font-size:20px;flex-shrink:0">'+a.icon+'</div>'
          +'<div style="flex:1">'
          +'<div style="font-size:13px;font-weight:700;color:var(--text)">'+esc(a.name)+'</div>'
          +'<div style="font-size:11px;color:var(--text-muted)">'+esc(a.desc)+'</div>'
          +'</div>'
          +'<label class="prox-toggle"><input type="checkbox" '+(a.enabled?'checked':'')+' onchange="_proxAutoToggle(\''+a.id+'\',this.checked)"><span class="prox-slider"></span></label>'
          +'</div>';
      }).join('')
      +(log.length?'<div class="prox-card"><div class="prox-card-title">📋 Ultime Esecuzioni</div>'+logRows+'</div>':'')
      +'</div>';
  }
  function bindAutomazioni(){
    window._proxAutoToggle=function(id,enabled){
      var autos=STORE.arr('prox_automations');
      var found=autos.find(function(a){return a.id===id;});
      if(found){found.enabled=enabled;}
      else{
        // Use defaults
        var defaults=[
          {id:'new_order_wa',name:'Nuovo Ordine → WhatsApp',icon:'💬',enabled:false,trigger:'new_order',action:'whatsapp'},
          {id:'paid_invoice',name:'Ordine Pagato → Fattura',icon:'📄',enabled:false,trigger:'order_paid',action:'invoice'},
          {id:'low_stock_alert',name:'Stock Basso → Alert',icon:'📦',enabled:false,trigger:'low_stock',action:'email'},
          {id:'quote_followup',name:'Preventivo → Follow-up',icon:'📧',enabled:false,trigger:'quote_stale',action:'reminder'},
          {id:'birthday_msg',name:'Compleanno → Messaggio',icon:'🎂',enabled:false,trigger:'birthday',action:'message'},
          {id:'monthly_report',name:'Fine Mese → Report',icon:'📊',enabled:false,trigger:'month_end',action:'report'},
        ];
        autos=defaults; var f2=autos.find(function(a){return a.id===id;}); if(f2) f2.enabled=enabled;
      }
      STORE.set('prox_automations',autos);
      showToast((enabled?'✅ Automazione attivata':'⚫ Automazione disattivata'),'info');
      // Log it
      var log=STORE.arr('prox_auto_log');
      log.push({name:id,runAt:now(),success:true,action:'toggle'});
      STORE.set('prox_auto_log',log.slice(-50));
    };
    window._proxAutoAdd=function(){
      showToast('💡 Funzione in arrivo: editor automazioni personalizzate','info');
    };
  }

  /* ── NAV BUILDER ─────────────────────────────────────────────── */
  function buildNav(){
    var sidebarNav = document.getElementById('sidebar-nav') || document.getElementById('sidebar-inner');
    if(!sidebarNav) return false;
    if(document.getElementById('prox-nav-group')) return true; // Already built

    var group = document.createElement('div');
    group.id = 'prox-nav-group';
    group.className = 'prox-nav-group';
    var label = document.createElement('div');
    label.className = 'prox-nav-label';
    label.textContent = '✦ PRO X';
    group.appendChild(label);

    PROX_SECTIONS.forEach(function(s){
      var item = document.createElement('div');
      item.className = 'prox-nav-item';
      item.setAttribute('data-section', s.id);
      item.innerHTML = '<span style="font-size:15px">'+s.icon+'</span><span>'+s.label+'</span>';
      item.onclick = function(){ navigateProx(s.id); };
      group.appendChild(item);
    });

    sidebarNav.appendChild(group);
    return true;
  }

  /* ── SECTIONS BUILDER ────────────────────────────────────────── */
  function buildSections(){
    var ci = document.getElementById('content-inner');
    if(!ci) return false;

    PROX_SECTIONS.forEach(function(s){
      if(document.getElementById(s.id)) return;
      var div = document.createElement('div');
      div.id = s.id;
      div.className = 'section-view';
      try{ div.innerHTML = s.build(); }
      catch(e){ div.innerHTML = '<div class="prox-section" style="padding:20px"><div class="prox-ph">'+s.icon+' '+s.label+'</div><div style="color:#ef4444;font-size:12px;margin-top:8px">Errore: '+e.message+'</div></div>'; }
      ci.appendChild(div);
      try{ s.bind(); }catch(e){}
    });
    return true;
  }

  /* ── NAVIGATE ────────────────────────────────────────────────── */
  function navigateProx(sectionId){
    // Hide all standard sections
    document.querySelectorAll('.section-view').forEach(function(el){
      el.classList.remove('active');
    });
    // Show requested prox section
    var target = document.getElementById(sectionId);
    if(target){
      target.classList.add('active');
      // Refresh content (rebuild with fresh data)
      var def = PROX_SECTIONS.find(function(s){ return s.id===sectionId; });
      if(def){
        try{ target.innerHTML = def.build(); def.bind(); }catch(e){}
      }
    }
    // Update nav active state
    document.querySelectorAll('.prox-nav-item').forEach(function(item){
      item.classList.toggle('active', item.getAttribute('data-section')===sectionId);
    });
    // Close mobile sidebar
    if(window.innerWidth <= 768){
      document.getElementById('sidebar')?.classList.remove('open');
      document.body.classList.remove('mob-sb-open');
    }
  }

  /* ── HOOK APP.NAVIGATE ───────────────────────────────────────── */
  function hookNavigate(){
    if(!window.App||!App.navigate||App._proxNavFixed) return;
    App._proxNavFixed = true;
    var _orig = App.navigate.bind(App);
    App.navigate = function(section){
      var proxIds = PROX_SECTIONS.map(function(s){ return s.id; });
      if(proxIds.indexOf(section) !== -1){
        navigateProx(section);
      } else {
        // Deactivate prox sections
        proxIds.forEach(function(id){
          var el=document.getElementById(id);
          if(el) el.classList.remove('active');
        });
        document.querySelectorAll('.prox-nav-item').forEach(function(item){
          item.classList.remove('active');
        });
        return _orig(section);
      }
    };
  }

  /* ── SAVE BAR ────────────────────────────────────────────────── */
  function buildSaveBar(){
    if(document.getElementById('v27-save-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'v27-save-bar';
    bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:22px;background:rgba(9,9,11,.95);border-top:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;font-size:10px;color:rgba(255,255,255,.3);z-index:9990;gap:8px;backdrop-filter:blur(8px)';
    /* `for…in` su localStorage enumera anche i metodi del prototipo: `length`
       è un numero, il suo `.length` è `undefined`, e la somma diventava NaN.
       L'utente leggeva «NaNKB» nella barra di stato. `Object.keys` restituisce
       le sole chiavi memorizzate. */
    var kb=0; try{Object.keys(localStorage).forEach(function(k){kb+=(localStorage.getItem(k)||'').length;}); kb=Math.round(kb/1024);}catch(e){}
    bar.innerHTML='<span id="v27-sb-status">⚡ Ingly OS · pronto</span><span style="color:rgba(255,255,255,.1)">|</span><span id="v27-sb-kb">'+kb+'KB</span>';
    document.body.appendChild(bar);
    var _orig = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(k,v){
      _orig(k,v);
      clearTimeout(window._v27sv);
      window._v27sv = setTimeout(function(){
        var st=document.getElementById('v27-sb-status');
        if(st) st.textContent='✅ '+new Date().toLocaleTimeString('it',{hour:'2-digit',minute:'2-digit'});
        var kb2=0; try{Object.keys(localStorage).forEach(function(k2){kb2+=(localStorage.getItem(k2)||'').length;});kb2=Math.round(kb2/1024);}catch(e){}
        var ke=document.getElementById('v27-sb-kb'); if(ke) ke.textContent=kb2+'KB';
      },300);
    };
    window._inglyLastSave=function(m){ var st=document.getElementById('v27-sb-status'); if(st) st.textContent='✅ '+(m||'Salvato'); };
  }

  /* ── QUICK ACCESS (Core Nav) ─────────────────────────────────── */
  function buildCoreNav(){
    var si = document.getElementById('sidebar-inner');
    if(!si || document.getElementById('v27-core-nav')) return;
    var BTNS=[
      {e:'📊',l:'Dashboard',a:"App.navigate('dashboard')"},
      {e:'👥',l:'Clienti',a:"App.navigate('clients')"},
      {e:'⚡',l:'Preventivo',a:"App.navigate('quoter')"},
      {e:'📋',l:'Ordini',a:"App.navigate('gestione_ordini')"},
      {e:'🏭',l:'Prodotti',a:"App.navigate('items')"},
      {e:'💰',l:'Vendite',a:"App.navigate('sales')"},
      {e:'☁️',l:'Backup',a:"App.navigate('cloud_updater')"},
      {e:'🏪',l:'Fornitori',a:"App.navigate('supply_chain')"},
      {e:'🤖',l:'AI',a:"App.navigate('ai')"},
      {e:'⚙️',l:'Settings',a:"App.navigate('settings')"},
    ];
    var p = document.createElement('div'); p.id='v27-core-nav';
    p.style.cssText='padding:8px 6px 10px;border-bottom:1px solid rgba(255,255,255,.05);margin-bottom:6px';
    var lbl=document.createElement('div');
    lbl.style.cssText='font-size:9px;font-weight:800;color:rgba(255,255,255,.25);text-transform:uppercase;letter-spacing:.5px;padding:0 3px;margin-bottom:5px';
    lbl.textContent='⚡ Rapido';
    // v37: make quickbar collapsible
    lbl.style.cursor = 'pointer';
    lbl.title = 'Clicca per comprimere/espandere';
    const qbKey = 'ingly_quickbar_collapsed';
    const isCollapsed = localStorage.getItem(qbKey) === '1';
    if(isCollapsed) { bar.style.display = 'none'; lbl.style.opacity = '.5'; }
    lbl.addEventListener('click', () => {
      const c = localStorage.getItem(qbKey) === '1';
      if(c){ bar.style.display=''; lbl.style.opacity='1'; localStorage.removeItem(qbKey); }
      else { bar.style.display='none'; lbl.style.opacity='.5'; localStorage.setItem(qbKey,'1'); }
    });
    p.appendChild(lbl);
    var grid=document.createElement('div');
    grid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:4px';
    BTNS.forEach(function(b){
      var cell=document.createElement('div');
      cell.style.cssText='display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 2px;border:1px solid rgba(255,255,255,.05);border-radius:8px;cursor:pointer;transition:.12s;background:rgba(255,255,255,.02)';
      cell.title=b.l;
      cell.onmouseover=function(){this.style.borderColor='rgba(251,191,36,.4)';this.style.background='rgba(251,191,36,.06)';};
      cell.onmouseout=function(){this.style.borderColor='rgba(255,255,255,.05)';this.style.background='rgba(255,255,255,.02)';};
      cell.onclick=(function(a){return function(){try{new Function(a)();}catch(e){}};})(b.a);
      cell.innerHTML='<span style="font-size:16px">'+b.e+'</span><span style="font-size:9px;font-weight:600;color:rgba(255,255,255,.35);text-align:center;line-height:1.2">'+b.l+'</span>';
      grid.appendChild(cell);
    });
    p.appendChild(grid);
    si.insertBefore(p, si.firstChild);
  }

  /* ── CLOUD VIEW FIX ─────────────────────────────────────────── */
  function fixCloudView(){
    if(window.App&&App.renderSection&&!App._v27cf){
      App._v27cf=true;
      var _orig=App.renderSection.bind(App);
      App.renderSection=async function(s){
        var r=await _orig(s);
        if(s==='cloud_updater'||s==='cloud'||s==='backup'){
          setTimeout(function(){if(typeof GoogleDriveSync!=='undefined'&&GoogleDriveSync.render) GoogleDriveSync.render();},150);
        }
        return r;
      };
    }
  }

  /* ── BOOT ────────────────────────────────────────────────────── */
  var _t=0, _iv=null;
  function boot(){
    _t++;
    if(_t>60){ clearInterval(_iv); console.warn('[v27fix] timeout'); return; }
    if(typeof App==='undefined'||!document.getElementById('sidebar-inner')||!document.getElementById('content-inner')) return;
    clearInterval(_iv);

    try{ buildSections(); }catch(e){ console.error('[v27fix] sections',e); }
    /* Seconda navigazione rimossa. Verificato prima di toccarla: le nove voci
       (`prox-command`, `prox-crm`, `prox-production`, `prox-stock`, `prox-quotes`,
       `prox-analytics`, `prox-marketing`, `prox-agents`, `prox-automations`) non
       hanno alcuna vista nel documento, e `navigateProx` non esiste: erano nove
       pulsanti che non portavano da nessuna parte. In più il gruppo spariva al
       primo re-render della sidebar, quindi non era nemmeno stabile.
       Non è una funzione tolta: è una funzione che non c'era. */
    // try{ buildNav(); }catch(e){ console.error('[v27fix] nav',e); }
    try{ hookNavigate(); }catch(e){ console.error('[v27fix] hook',e); }
    try{ fixCloudView(); }catch(e){}
    try{ buildCoreNav(); }catch(e){}
    try{ buildSaveBar(); }catch(e){}

    // Error boundary
    if(!window._v27err){
      window._v27err=true;
      window.onerror=function(msg,src,line){
        /* Check IGNORE list first */
        var msgStr = String(msg||'').toLowerCase();
        var IGNORE = (window.__INGLY_IGNORE_ERRORS__||[]).concat([
          'console.info is not a function',
          'console.debug is not a function',
          'console.log is not a function',
          'console.warn is not a function',
          'resizeobserver loop',
          'script error',
          'loading chunk',
          'network error',
          'failed to fetch',
          'non-error promise rejection',
          'cannot read properties of null',
          'is not defined at object.render'
        ]);
        for (var _i=0; _i<IGNORE.length; _i++) {
          if (msgStr.indexOf(IGNORE[_i].toLowerCase()) > -1) return true; /* swallow silently */
        }
        window._inglyErrors=window._inglyErrors||[];
        window._inglyErrors.push({msg:msg,line:line,t:Date.now()});
        window._inglyErrors=window._inglyErrors.slice(-20);
        if(!document.getElementById('v27-et')){
          var t=document.createElement('div');t.id='v27-et';
          t.style.cssText='position:fixed;bottom:28px;left:12px;z-index:99990;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:8px 12px;font-size:11px;color:#ef4444;display:flex;align-items:center;gap:8px;max-width:280px';
          t.innerHTML='<span>⚠️ Errore recuperato</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:#ef4444;cursor:pointer;margin-left:auto">✕</button>';
          document.body.appendChild(t);
          setTimeout(function(){var e=document.getElementById('v27-et');if(e)e.remove();},5000);
        }
        return false;
      };
      window.addEventListener('unhandledrejection',function(e){e.preventDefault();});
    }

    console.log('[v27fix] ✅ PRO X: 9 sezioni · Core Nav · Cloud Fix · Dock rimosso');
  }

  // Run boot with retry
  _iv = setInterval(boot, 300);
  // Also try immediately after DOM
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot,100); });
  else setTimeout(boot,100);

})();

