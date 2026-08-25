
/* ═══════════════════════════════════════════════════════════════
   INGLY OS — 🚀 OBIETTIVI DI CRESCITA LABORATORIO v1.0
   Investment Planner · Accantonamento automatico · CRUD completo
   Sincronizzazione ordini · AI suggerimenti · Dashboard grafica
   ═══════════════════════════════════════════════════════════════ */
;(function InvestmentPlanner(){
  'use strict';
  if(window._inglyGoalsV1) return;
  window._inglyGoalsV1 = true;

  /* ── LocalStorage helpers ─────────────────────────────── */
  var DB_KEY   = 'ingly_goals_v1';
  var HIST_KEY = 'ingly_goals_history_v1';
  var CFG_KEY  = 'ingly_goals_config_v1';

  function getGoals(){  try{ return JSON.parse(localStorage.getItem(DB_KEY)||'[]'); }catch(e){return[];} }
  function saveGoals(a){ try{ localStorage.setItem(DB_KEY,JSON.stringify(a)); }catch(e){} }
  function getHist(){   try{ return JSON.parse(localStorage.getItem(HIST_KEY)||'[]'); }catch(e){return[];} }
  function saveHist(a){ try{ localStorage.setItem(HIST_KEY,JSON.stringify(a)); }catch(e){} }
  function getCfg(){    try{ return JSON.parse(localStorage.getItem(CFG_KEY)||'{}'); }catch(e){return {};} }
  function saveCfg(c){  try{ localStorage.setItem(CFG_KEY,JSON.stringify(c)); }catch(e){} }

  function eu(n){ return '€'+parseFloat(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function uid(){ return 'gl-'+Date.now()+'-'+Math.random().toString(36).slice(2,5); }
  function tt(m,t){ if(typeof toast!=='undefined') toast(m,t||'info'); }
  function today(){ return new Date().toISOString().slice(0,10); }
  function fdate(d){ if(!d) return '—'; try{ return new Date(d).toLocaleDateString('it-IT'); }catch(e){return d;} }

  /* ── Categories ──────────────────────────────────────── */
  var CATS = [
    {id:'laser',      label:'Laser',         icon:'⚡'},
    {id:'stampanti',  label:'Stampanti',      icon:'🖨️'},
    {id:'cnc',        label:'CNC',           icon:'🔩'},
    {id:'utensili',   label:'Utensili',       icon:'🔧'},
    {id:'arredamento',label:'Arredamento',    icon:'🪑'},
    {id:'computer',   label:'Computer',       icon:'💻'},
    {id:'software',   label:'Software',       icon:'💿'},
    {id:'magazzino',  label:'Magazzino',      icon:'📦'},
    {id:'veicoli',    label:'Veicoli',        icon:'🚐'},
    {id:'marketing',  label:'Marketing',      icon:'📣'},
    {id:'formazione', label:'Formazione',     icon:'🎓'},
    {id:'sicurezza',  label:'Sicurezza',      icon:'🦺'},
    {id:'altro',      label:'Altro',          icon:'📌'},
  ];

  var PRIORITIES = [
    {id:'alta',   label:'Alta',   color:'#ef4444'},
    {id:'media',  label:'Media',  color:'#f59e0b'},
    {id:'bassa',  label:'Bassa',  color:'#10b981'},
  ];

  var STATI = [
    {id:'attivo',    label:'Attivo',    color:'#6366f1'},
    {id:'in_pausa',  label:'In pausa',  color:'#64748b'},
    {id:'completato',label:'Completato',color:'#10b981'},
    {id:'archiviato',label:'Archiviato',color:'#374151'},
  ];

  /* ── Pull profit from orders in DB ──────────────────── */
  function getTotalProfitFromOrders(){
    try{
      var db = JSON.parse(localStorage.getItem('ingly_saas_db')||'{}');
      var orders = db.orders||[];
      var sum=0;
      orders.forEach(function(o){
        if(['completato','consegnato','pagato'].indexOf((o.stato||o.status||'').toLowerCase())>-1){
          sum += parseFloat(o.profitto||o.profit||o.margine||o.margin||0);
        }
      });
      // Also check ingly_orders
      var o2 = JSON.parse(localStorage.getItem('ingly_orders')||'[]');
      o2.forEach(function(o){
        if(['completato','consegnato','pagato','done','completed'].indexOf((o.stato||o.status||'').toLowerCase())>-1){
          sum += parseFloat(o.profitto||o.profit||o.margin||0);
        }
      });
      return sum;
    }catch(e){return 0;}
  }

  function getOrdersCount(){
    try{
      var db=JSON.parse(localStorage.getItem('ingly_saas_db')||'{}');
      var o2=JSON.parse(localStorage.getItem('ingly_orders')||'[]');
      return (db.orders||[]).length + o2.length;
    }catch(e){return 0;}
  }

  /* ── Compute goal progress ───────────────────────────── */
  function goalProgress(g){
    var accumulato = g.capital_accumulated||0;
    var target     = g.total_cost||g.price||0;
    var pct        = target>0 ? Math.min(100,Math.round(accumulato/target*100)) : 0;
    var mancante   = Math.max(0,target-accumulato);
    var cfg        = getCfg();
    var monthly    = cfg.avg_monthly_saving||0;
    var months_left= monthly>0 ? Math.ceil(mancante/monthly) : null;
    var eta        = null;
    if(months_left!=null){
      var d=new Date(); d.setMonth(d.getMonth()+months_left);
      eta = d.toISOString().slice(0,10);
    }
    return {accumulato,target,pct,mancante,eta,months_left};
  }

  /* ── Add history entry ───────────────────────────────── */
  function addHistoryEntry(goalId,type,amount,note,orderId){
    var h=getHist();
    h.unshift({
      id:'h-'+Date.now(), goalId, type, amount:parseFloat(amount)||0,
      note:note||'', orderId:orderId||null,
      date:new Date().toISOString(), user:'owner'
    });
    saveHist(h.slice(0,2000));
  }

  /* ── Process an order: auto-accrue capital ───────────── */
  function processOrderProfit(orderId, profit){
    profit = parseFloat(profit)||0;
    if(profit<=0) return;
    var goals = getGoals().filter(function(g){return g.stato==='attivo';});
    if(!goals.length) return;

    var cfg = getCfg();
    var mode= cfg.split_mode||'priority'; // 'priority' | 'percentage'
    var totalPct = 0;

    goals.forEach(function(g){
      var pct = parseFloat(g.auto_pct)||0;
      var fixed= parseFloat(g.auto_fixed)||0;
      var amount=0;
      if(pct>0)   amount += profit * pct/100;
      if(fixed>0) amount += fixed;
      if(amount<=0) return;

      g.capital_accumulated = (g.capital_accumulated||0) + amount;
      addHistoryEntry(g.id,'auto_order',amount,'Accantonamento automatico ordine #'+orderId,orderId);

      var pr = goalProgress(g);
      // Notify milestones
      var oldPct = pr.pct - Math.round(amount/g.total_cost*100);
      [25,50,75,90,100].forEach(function(milestone){
        if(oldPct<milestone && pr.pct>=milestone){
          tt('🎯 '+g.name+' ha raggiunto il '+milestone+'%!','success');
        }
      });
    });

    saveGoals(goals.concat(getGoals().filter(function(g){return g.stato!=='attivo';})));
  }

  /* ── Dashboard stats ─────────────────────────────────── */
  function getDashboardStats(){
    var goals = getGoals();
    var active    = goals.filter(function(g){return g.stato==='attivo';});
    var completed = goals.filter(function(g){return g.stato==='completato';});
    var totalTarget   = goals.reduce(function(s,g){return s+(g.total_cost||0);},0);
    var totalAccum    = goals.reduce(function(s,g){return s+(g.capital_accumulated||0);},0);
    var totalPct      = totalTarget>0?Math.round(totalAccum/totalTarget*100):0;

    var now=new Date(), y=now.getFullYear(), m=now.getMonth();
    var h=getHist();
    var thisMonth = h.filter(function(e){
      var d=new Date(e.date); return d.getFullYear()===y && d.getMonth()===m;
    }).reduce(function(s,e){return s+e.amount;},0);
    var thisYear = h.filter(function(e){
      return new Date(e.date).getFullYear()===y;
    }).reduce(function(s,e){return s+e.amount;},0);

    return {active:active.length,completed:completed.length,total:goals.length,
            totalTarget,totalAccum,totalPct,thisMonth,thisYear};
  }

  /* ── MAIN RENDER ──────────────────────────────────────── */
  var _view      = 'dashboard'; // 'dashboard' | 'list' | 'detail'
  var _selGoalId = null;
  var _filterCat = 'all';
  var _filterStat= 'all';
  var _searchQ   = '';

  function render(){
    var el=document.getElementById('view-goals');
    if(!el)return;
    el.innerHTML='';
    el.style.padding='0';

    // Full layout
    var wrap=document.createElement('div');
    wrap.style.cssText='display:flex;flex-direction:column;height:calc(100vh - 64px);overflow:hidden;background:var(--bg-main,#0d0d14)';
    wrap.innerHTML=renderHeader()+renderToolbar()+'<div id="_gls_body" style="flex:1;overflow-y:auto;padding:16px 18px"></div>';
    el.appendChild(wrap);
    renderBody();
  }

  function renderHeader(){
    var cfg=getCfg();
    return `<div style="padding:12px 18px;border-bottom:1px solid var(--border,#2a2a35);display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:var(--bg-card,#111115)">
      <div style="font-size:18px;font-weight:900;color:var(--text,#e8e8f0)">${cfg.module_name||'🚀 Obiettivi di Crescita'}</div>
      <div id="_gls_stats_mini" style="display:flex;gap:12px;margin-left:auto;flex-wrap:wrap"></div>
    </div>`;
  }

  function renderToolbar(){
    return `<div style="padding:8px 18px;border-bottom:1px solid var(--border,#2a2a35);display:flex;align-items:center;gap:6px;flex-wrap:wrap;background:var(--bg-card,#111115)">
      <button class="_gls_tv" data-v="dashboard" onclick="Goals._tv(this,'dashboard')" style="padding:5px 12px;border-radius:7px;border:1px solid var(--primary,#6366f1);background:var(--primary,#6366f1);color:#fff;cursor:pointer;font-size:11px;font-family:inherit">📊 Dashboard</button>
      <button class="_gls_tv" data-v="list" onclick="Goals._tv(this,'list')" style="padding:5px 12px;border-radius:7px;border:1px solid var(--border,#2a2a35);background:transparent;color:var(--text-muted,#888);cursor:pointer;font-size:11px;font-family:inherit">📋 Lista Obiettivi</button>
      <div style="flex:1"></div>
      <input id="_gls_search" placeholder="🔍 Cerca obiettivo..." oninput="Goals._search(this.value)" style="padding:6px 10px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:11px;width:180px">
      <select id="_gls_fcat" onchange="Goals._fcat(this.value)" style="padding:6px 8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:11px">
        <option value="all">Tutte categorie</option>
        ${CATS.map(function(c){return '<option value="'+c.id+'">'+c.icon+' '+c.label+'</option>';}).join('')}
      </select>
      <select id="_gls_fstat" onchange="Goals._fstat(this.value)" style="padding:6px 8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:11px">
        <option value="all">Tutti gli stati</option>
        ${STATI.map(function(s){return '<option value="'+s.id+'">'+s.label+'</option>';}).join('')}
      </select>
      <button onclick="Goals._new()" style="padding:6px 14px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit">+ Nuovo Obiettivo</button>
      <button onclick="Goals._cfg()" style="padding:6px 10px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text-muted,#888);cursor:pointer;font-size:11px">⚙️</button>
      <button onclick="Goals._export()" style="padding:6px 10px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text-muted,#888);cursor:pointer;font-size:11px">📤</button>
      <button onclick="Goals._import()" style="padding:6px 10px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text-muted,#888);cursor:pointer;font-size:11px">📥</button>
    </div>`;
  }

  function renderBody(){
    var body=document.getElementById('_gls_body');
    if(!body)return;
    if(_view==='dashboard')      body.innerHTML=renderDashboard();
    else if(_view==='list')      body.innerHTML=renderList();
    else if(_view==='detail')    body.innerHTML=renderDetail(_selGoalId);
    updateMiniStats();
  }

  /* ── DASHBOARD ────────────────────────────────────────── */
  function renderDashboard(){
    var s=getDashboardStats();
    var goals=getGoals().filter(function(g){return g.stato!=='archiviato';});
    var cfg=getCfg();
    var totalProfit=getTotalProfitFromOrders();

    var html='';

    // KPI row
    html+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:16px">
      ${statCard('🎯 Obiettivi attivi',s.active,'','var(--primary,#6366f1)')}
      ${statCard('✅ Completati',s.completed,'','#10b981')}
      ${statCard('💰 Accumulato tot.',eu(s.totalAccum),'','#fbbf24')}
      ${statCard('📅 Questo mese',eu(s.thisMonth),'','#06b6d4')}
      ${statCard('📆 Quest\'anno',eu(s.thisYear),'','#8b5cf6')}
      ${statCard('📊 Avanzamento',s.totalPct+'%','su '+eu(s.totalTarget),'#f59e0b')}
    </div>`;

    // Progress overview bar
    if(s.total>0){
      html+=`<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:14px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:12px;font-weight:700;color:var(--text,#e8e8f0)">Avanzamento Totale Portfolio</div>
          <div style="font-size:12px;color:var(--text-muted,#888)">${eu(s.totalAccum)} / ${eu(s.totalTarget)}</div>
        </div>
        <div style="height:10px;background:var(--border,#2a2a35);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${s.totalPct}%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:99px;transition:.5s"></div>
        </div>
        <div style="font-size:10px;color:var(--text-muted,#888);margin-top:4px">${s.totalPct}% completato · Profitto ordini disponibile: ${eu(totalProfit)}</div>
      </div>`;
    }

    // Goals cards grid
    if(!goals.length){
      html+=`<div style="text-align:center;padding:60px;color:var(--text-muted,#888)">
        <div style="font-size:48px;margin-bottom:16px">🚀</div>
        <div style="font-size:16px;font-weight:700;color:var(--text,#e8e8f0);margin-bottom:8px">Nessun obiettivo attivo</div>
        <div style="font-size:13px;margin-bottom:20px">Crea il tuo primo obiettivo di crescita per iniziare ad accantonare profitti</div>
        <button onclick="Goals._new()" style="padding:10px 24px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:700">+ Crea Primo Obiettivo</button>
      </div>`;
    } else {
      html+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-bottom:16px">`;
      goals.forEach(function(g){
        var p=goalProgress(g);
        var cat=CATS.find(function(c){return c.id===g.category;})||CATS[CATS.length-1];
        var stato=STATI.find(function(s){return s.id===g.stato;})||STATI[0];
        var pri=PRIORITIES.find(function(x){return x.id===g.priority;})||PRIORITIES[1];
        html+=`<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:12px;overflow:hidden;transition:.15s" onmouseenter="this.style.borderColor='var(--primary,#6366f1)44'" onmouseleave="this.style.borderColor='var(--border,#2a2a35)'">
          <div style="height:8px;background:${p.target>0?'linear-gradient(90deg,#6366f1,#8b5cf6)':'var(--border,#2a2a35)'};width:${p.pct}%;transition:.5s"></div>
          <div style="height:8px;background:var(--border2,#1a1a25);margin-top:-8px"></div>
          <div style="padding:14px">
            <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
              <div style="width:42px;height:42px;border-radius:10px;background:${g.color||'#6366f1'}20;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${g.icon||cat.icon}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:700;color:var(--text,#e8e8f0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.name||'Obiettivo'}</div>
                <div style="font-size:10px;color:var(--text-muted,#888)">${cat.label} · <span style="color:${stato.color}">${stato.label}</span></div>
              </div>
              ${g.priority==='alta'?'<span style="font-size:10px;background:#ef444420;color:#ef4444;padding:2px 6px;border-radius:5px;flex-shrink:0">Alta</span>':''}
            </div>
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted,#888);margin-bottom:4px">
                <span>Accumulato</span><span style="color:var(--text,#e8e8f0);font-weight:700">${eu(p.accumulato)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted,#888);margin-bottom:4px">
                <span>Mancante</span><span style="color:#ef4444">${eu(p.mancante)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted,#888)">
                <span>Obiettivo</span><span style="color:var(--text,#e8e8f0);font-weight:700">${eu(p.target)}</span>
              </div>
            </div>
            <div style="height:6px;background:var(--border,#2a2a35);border-radius:99px;overflow:hidden;margin-bottom:6px">
              <div style="height:100%;width:${p.pct}%;background:${p.pct>=100?'#10b981':p.pct>=75?'#6366f1':p.pct>=50?'#f59e0b':'#64748b'};border-radius:99px;transition:.5s"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--text-muted,#888);margin-bottom:12px">
              <span style="font-weight:700;color:${p.pct>=100?'#10b981':'var(--text,#e8e8f0)'}">${p.pct}%</span>
              <span>${p.eta?'ETA: '+fdate(p.eta):'—'}</span>
            </div>
            <div style="display:flex;gap:5px">
              <button onclick="Goals._detail('${g.id}')" style="flex:1;padding:7px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">Dettagli</button>
              <button onclick="Goals._manualAdd('${g.id}')" style="padding:7px 10px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:#10b981">+ €</button>
              <button onclick="Goals._edit('${g.id}')" style="padding:7px 10px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">✏️</button>
            </div>
          </div>
        </div>`;
      });
      html+='</div>';
    }

    // AI suggestions
    html+=renderAISuggestions();
    return html;
  }

  /* ── LIST VIEW ────────────────────────────────────────── */
  function renderList(){
    var goals=getGoals().filter(function(g){
      if(_filterCat!=='all' && g.category!==_filterCat) return false;
      if(_filterStat!=='all' && g.stato!==_filterStat) return false;
      if(_searchQ && !(g.name||'').toLowerCase().includes(_searchQ.toLowerCase())) return false;
      return true;
    });

    if(!goals.length) return '<div style="padding:40px;text-align:center;color:var(--text-muted,#888)">Nessun obiettivo trovato</div>';

    var html='<div style="display:flex;flex-direction:column;gap:8px">';
    goals.forEach(function(g){
      var p=goalProgress(g);
      var cat=CATS.find(function(c){return c.id===g.category;})||CATS[CATS.length-1];
      var stato=STATI.find(function(s){return s.id===g.stato;})||STATI[0];
      html+=`<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:8px;background:${g.color||'#6366f1'}20;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${g.icon||cat.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:var(--text,#e8e8f0)">${g.name}</div>
          <div style="font-size:10px;color:var(--text-muted,#888)">${cat.label} · <span style="color:${stato.color}">${stato.label}</span> · ${g.brand||''} ${g.model||''}</div>
        </div>
        <div style="text-align:center;min-width:80px">
          <div style="font-size:14px;font-weight:700;color:var(--text,#e8e8f0)">${p.pct}%</div>
          <div style="height:4px;background:var(--border,#2a2a35);border-radius:99px;overflow:hidden;margin-top:3px"><div style="height:100%;width:${p.pct}%;background:var(--primary,#6366f1)"></div></div>
        </div>
        <div style="text-align:right;min-width:120px">
          <div style="font-size:13px;font-weight:700;color:var(--text,#e8e8f0)">${eu(p.accumulato)}</div>
          <div style="font-size:10px;color:var(--text-muted,#888)">di ${eu(p.target)}</div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button onclick="Goals._detail('${g.id}')" style="padding:5px 10px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:10px">Apri</button>
          <button onclick="Goals._edit('${g.id}')" style="padding:5px 8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">✏️</button>
          <button onclick="Goals._dup('${g.id}')" style="padding:5px 8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">⧉</button>
          <button onclick="Goals._del('${g.id}')" style="padding:5px 8px;background:#ef444420;border:1px solid #ef444440;border-radius:6px;cursor:pointer;font-size:11px;color:#ef4444">🗑️</button>
        </div>
      </div>`;
    });
    return html+'</div>';
  }

  /* ── DETAIL VIEW ──────────────────────────────────────── */
  function renderDetail(gId){
    var g=getGoals().find(function(x){return x.id===gId;});
    if(!g) return '<div style="padding:20px;color:var(--text-muted,#888)">Obiettivo non trovato</div>';
    var p=goalProgress(g);
    var cat=CATS.find(function(c){return c.id===g.category;})||CATS[CATS.length-1];
    var stato=STATI.find(function(s){return s.id===g.stato;})||STATI[0];
    var hist=getHist().filter(function(h){return h.goalId===gId;}).slice(0,30);

    return `<div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">
        <button onclick="Goals._tv(null,'dashboard')" style="padding:6px 12px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">← Dashboard</button>
        <div style="font-size:16px;font-weight:900;color:var(--text,#e8e8f0)">${g.icon||cat.icon} ${g.name}</div>
        <span style="padding:3px 9px;border-radius:99px;font-size:10px;background:${stato.color}20;color:${stato.color}">${stato.label}</span>
        <div style="margin-left:auto;display:flex;gap:5px">
          <button onclick="Goals._edit('${g.id}')" style="padding:6px 12px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">✏️ Modifica</button>
          <button onclick="Goals._manualAdd('${g.id}')" style="padding:6px 12px;background:#10b98120;border:1px solid #10b98140;border-radius:7px;cursor:pointer;font-size:11px;color:#10b981;font-weight:700">+ Versamento</button>
          <button onclick="Goals._archive('${g.id}')" style="padding:6px 10px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">📦</button>
          <button onclick="Goals._del('${g.id}')" style="padding:6px 10px;background:#ef444420;border:1px solid #ef444440;border-radius:7px;cursor:pointer;font-size:11px;color:#ef4444">🗑️</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <!-- Progress card -->
        <div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:16px">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted,#888);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Avanzamento</div>
          <div style="font-size:36px;font-weight:900;color:${p.pct>=100?'#10b981':'var(--primary,#6366f1)'};margin-bottom:4px">${p.pct}%</div>
          <div style="height:10px;background:var(--border,#2a2a35);border-radius:99px;overflow:hidden;margin-bottom:10px">
            <div style="height:100%;width:${p.pct}%;background:${p.pct>=100?'#10b981':'linear-gradient(90deg,#6366f1,#8b5cf6)'};border-radius:99px;transition:.5s"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
            <div><div style="font-size:13px;font-weight:700;color:#10b981">${eu(p.accumulato)}</div><div style="font-size:9px;color:var(--text-muted,#888)">Accumulato</div></div>
            <div><div style="font-size:13px;font-weight:700;color:#ef4444">${eu(p.mancante)}</div><div style="font-size:9px;color:var(--text-muted,#888)">Mancante</div></div>
            <div><div style="font-size:13px;font-weight:700;color:var(--text,#e8e8f0)">${eu(p.target)}</div><div style="font-size:9px;color:var(--text-muted,#888)">Obiettivo</div></div>
          </div>
          ${p.eta?`<div style="margin-top:10px;padding:7px;background:var(--primary,#6366f1)10;border-radius:7px;font-size:11px;color:var(--text-muted,#888);text-align:center">📅 ETA stimata: <strong style="color:var(--primary,#818cf8)">${fdate(p.eta)}</strong>${p.months_left?' ('+p.months_left+' mesi)':''}</div>`:''}
        </div>

        <!-- Details card -->
        <div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:16px">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted,#888);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Dettagli</div>
          ${detailRow('Categoria',cat.icon+' '+cat.label)}
          ${detailRow('Marca / Modello',(g.brand||'—')+' '+(g.model||''))}
          ${detailRow('Prezzo netto',eu(g.price||0))}
          ${detailRow('IVA',g.iva_pct>0?g.iva_pct+'% ('+eu((g.price||0)*g.iva_pct/100)+')':'Esente')}
          ${detailRow('Spedizione',eu(g.shipping||0))}
          ${detailRow('Installazione',eu(g.installation||0))}
          ${detailRow('<strong>Costo totale</strong>','<strong>'+eu(g.total_cost||0)+'</strong>')}
          ${detailRow('Data obiettivo',fdate(g.target_date))}
          ${g.link_shop?'<a href="'+g.link_shop+'" target="_blank" style="display:block;margin-top:6px;font-size:11px;color:var(--primary,#818cf8)">🛒 Apri negozio ↗</a>':''}
        </div>
      </div>

      <!-- Auto-saving config -->
      <div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:14px;margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted,#888);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">⚙️ Accantonamento Automatico</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          <label style="font-size:12px;color:var(--text-muted,#888)">% profitto per ordine:</label>
          <input id="_gls_auto_pct" type="number" step="1" min="0" max="100" value="${g.auto_pct||0}" style="width:70px;padding:5px 8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:6px;color:var(--text,#e8e8f0);font-size:12px">
          <span style="font-size:12px;color:var(--text-muted,#888)">%</span>
          <label style="font-size:12px;color:var(--text-muted,#888);margin-left:12px">€ fisso per ordine:</label>
          <input id="_gls_auto_fixed" type="number" step="1" min="0" value="${g.auto_fixed||0}" style="width:80px;padding:5px 8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:6px;color:var(--text,#e8e8f0);font-size:12px">
          <span style="font-size:12px;color:var(--text-muted,#888)">€</span>
          <button onclick="Goals._saveAutoSaving('${g.id}')" style="padding:5px 12px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">💾 Salva</button>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--text-muted,#888)">
          ℹ️ Ad ogni ordine completato, il sistema accantona automaticamente questa quota verso questo obiettivo.
        </div>
      </div>

      <!-- Note -->
      ${g.notes?`<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:14px;margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:var(--text-muted,#888);margin-bottom:6px">📝 Note</div><div style="font-size:12px;color:var(--text,#e8e8f0);line-height:1.6">${g.notes}</div></div>`:''}

      <!-- History -->
      <div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted,#888);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">📜 Storico Movimenti (${hist.length})</div>
        ${hist.length?hist.map(function(h){
          var typeLabel={'auto_order':'🤖 Auto-ordine','manual_add':'➕ Versamento','manual_sub':'➖ Prelievo','bonus':'🎁 Bonus','correction':'🔧 Correzione'}[h.type]||h.type;
          return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border,#2a2a35);font-size:11px">
            <span style="color:var(--text-muted,#888);min-width:80px">${fdate(h.date)}</span>
            <span style="flex:1;color:var(--text,#e8e8f0)">${typeLabel}${h.note?' — '+h.note:''}</span>
            <span style="font-weight:700;color:${h.amount>=0?'#10b981':'#ef4444'}">${h.amount>=0?'+':''}${eu(h.amount)}</span>
          </div>`;
        }).join(''):'<div style="color:var(--text-muted,#888);font-size:12px">Nessun movimento registrato</div>'}
      </div>
    </div>`;
  }

  function detailRow(label,value){
    return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border,#2a2a35);font-size:11px"><span style="color:var(--text-muted,#888)">${label}</span><span style="color:var(--text,#e8e8f0)">${value}</span></div>`;
  }

  function statCard(label,value,sub,color){
    return `<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:12px">
      <div style="font-size:10px;color:var(--text-muted,#888);margin-bottom:4px">${label}</div>
      <div style="font-size:20px;font-weight:700;color:${color||'var(--text,#e8e8f0)'}">${value}</div>
      ${sub?`<div style="font-size:10px;color:var(--text-muted,#888);margin-top:2px">${sub}</div>`:''}
    </div>`;
  }

  /* ── AI Suggestions ──────────────────────────────────── */
  function renderAISuggestions(){
    var goals=getGoals().filter(function(g){return g.stato==='attivo';});
    if(!goals.length) return '';
    var sorted=goals.slice().sort(function(a,b){return goalProgress(b).pct-goalProgress(a).pct;});
    var top=sorted[0];
    var p=top?goalProgress(top):null;
    var totalProfit=getTotalProfitFromOrders();
    var ordersN=getOrdersCount();

    var tips=[];
    if(top&&p) tips.push('🎯 Obiettivo più vicino: <strong>'+top.name+'</strong> al <strong>'+p.pct+'%</strong>'+( p.months_left?' — ETA '+p.months_left+' mesi':'')+'. Aumenta l\'accantonamento automatico per accelerare.');
    if(totalProfit>0&&goals.length>0){
      var maxPct=Math.max.apply(null,goals.map(function(g){return g.auto_pct||0;}));
      if(maxPct<10) tips.push('💡 Stai accantonando meno del 10% dei profitti. Considera di aumentare la percentuale automatica — anche il 15-20% per ordine fa una grande differenza nel tempo.');
    }
    if(goals.length>3) tips.push('📊 Hai '+goals.length+' obiettivi attivi. Considera di mettere in pausa quelli meno urgenti e concentrare il capitale sull\'acquisto prioritario.');
    if(ordersN>0&&totalProfit===0) tips.push('⚠️ Hai ordini registrati ma nessun profitto tracciato. Aggiorna i margini degli ordini per far funzionare l\'accantonamento automatico.');

    if(!tips.length) return '';
    return `<div style="background:var(--bg-card,#111115);border:1px solid var(--primary,#6366f1)25;border-radius:10px;padding:14px;margin-top:4px">
      <div style="font-size:11px;font-weight:700;color:var(--primary,#818cf8);margin-bottom:10px">🤖 Suggerimenti AI</div>
      ${tips.map(function(t){return '<div style="font-size:12px;color:var(--text-muted,#888);margin-bottom:7px;line-height:1.5;padding-left:8px;border-left:2px solid var(--primary,#6366f1)40">'+t+'</div>';}).join('')}
    </div>`;
  }

  function updateMiniStats(){
    var el=document.getElementById('_gls_stats_mini'); if(!el)return;
    var s=getDashboardStats();
    el.innerHTML=`<span style="font-size:11px;color:var(--text-muted,#888)">🎯 ${s.active} attivi · ✅ ${s.completed} completati · 💰 ${eu(s.totalAccum)} accumulato</span>`;
  }

  /* ── MODALS ───────────────────────────────────────────── */
  function _openModal(html){
    if(typeof openModal!=='undefined') openModal(html);
    else {
      var ov=document.createElement('div');
      ov.id='_gls_modal_ov';
      ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center';
      ov.innerHTML='<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:14px;max-width:540px;width:94%;max-height:88vh;overflow-y:auto">'+html+'</div>';
      ov.onclick=function(e){if(e.target===ov)ov.remove();};
      document.body.appendChild(ov);
    }
  }
  function _closeModal(){
    if(typeof closeModal!=='undefined') closeModal();
    var ov=document.getElementById('_gls_modal_ov'); if(ov)ov.remove();
  }

  /* ── New / Edit Goal Modal ───────────────────────────── */
  Goals._new = function(){ _openGoalModal(null); };
  Goals._edit= function(id){ _openGoalModal(getGoals().find(function(g){return g.id===id;})||null); };

  function _openGoalModal(existing){
    var isEdit=!!(existing&&existing.id);
    var g=existing||{brand:'',model:'',name:'',category:'laser',priority:'media',stato:'attivo',auto_pct:10,auto_fixed:0,price:0,iva_pct:22,shipping:0,installation:0,total_cost:0,color:'#6366f1',icon:'⚡',notes:'',link_shop:'',link_mfr:'',target_date:''};

    var catOpts=CATS.map(function(c){return '<option value="'+c.id+'"'+(g.category===c.id?' selected':'')+'>'+c.icon+' '+c.label+'</option>';}).join('');
    var priOpts=PRIORITIES.map(function(p){return '<option value="'+p.id+'"'+(g.priority===p.id?' selected':'')+'>'+p.label+'</option>';}).join('');
    var staOpts=STATI.map(function(s){return '<option value="'+s.id+'"'+(g.stato===s.id?' selected':'')+'>'+s.label+'</option>';}).join('');

    _openModal(
      '<div style="padding:18px 20px">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
        +'<div style="font-size:15px;font-weight:700;color:var(--text,#e8e8f0)">'+(isEdit?'✏️ Modifica':'➕ Nuovo')+' Obiettivo</div>'
        +'<button onclick="Goals._closeM()" style="background:none;border:none;cursor:pointer;color:var(--text-muted,#888);font-size:18px">×</button>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +mField('Nome *','_gm_name','text',g.name,'es: xTool P3 CO₂')
        +mField('Marca','_gm_brand','text',g.brand,'es: xTool')
        +mField('Modello','_gm_model','text',g.model,'es: P3')
        +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">Categoria</label><select id="_gm_cat" style="width:100%;padding:7px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px">'+catOpts+'</select></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">Priorità</label><select id="_gm_pri" style="width:100%;padding:7px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px">'+priOpts+'</select></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">Stato</label><select id="_gm_stato" style="width:100%;padding:7px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px">'+staOpts+'</select></div>'
        +mField('Prezzo netto €','_gm_price','number',g.price||0)
        +mField('IVA %','_gm_iva','number',g.iva_pct||22)
        +mField('Spedizione €','_gm_ship','number',g.shipping||0)
        +mField('Installazione €','_gm_inst','number',g.installation||0)
        +mField('Accessori €','_gm_acc','number',g.accessories||0)
        +mField('Data obiettivo','_gm_date','date',g.target_date)
        +mField('Accantonamento % / ordine','_gm_apct','number',g.auto_pct||10)
        +mField('Accantonamento € fisso / ordine','_gm_afixed','number',g.auto_fixed||0)
        +mField('Icona (emoji)','_gm_icon','text',g.icon||'⚡','⚡')
        +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">Colore</label><input id="_gm_color" type="color" value="'+(g.color||'#6366f1')+'" style="width:100%;height:34px;padding:2px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer"></div>'
        +'<div style="grid-column:span 2">'+mField('Link negozio','_gm_shop','url',g.link_shop||'','https://...')+'</div>'
        +'<div style="grid-column:span 2"><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">Note</label><textarea id="_gm_notes" rows="2" placeholder="Descrizione, motivazione, note..." style="width:100%;box-sizing:border-box;padding:7px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px;resize:vertical">'+(g.notes||'')+'</textarea></div>'
      +'</div>'
      +'<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">'
        +'<button onclick="Goals._closeM()" style="padding:8px 16px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:8px;cursor:pointer;color:var(--text-muted,#888);font-family:inherit">Annulla</button>'
        +'<button id="_gm_save" data-id="'+(existing?existing.id:'')+'" style="padding:8px 18px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit">💾 '+(isEdit?'Salva modifiche':'Crea Obiettivo')+'</button>'
      +'</div>'
      +'</div>'
    );

    setTimeout(function(){
      var btn=document.getElementById('_gm_save'); if(!btn)return;
      // Auto-calc total
      ['_gm_price','_gm_iva','_gm_ship','_gm_inst','_gm_acc'].forEach(function(id){
        var el=document.getElementById(id); if(!el)return;
        el.addEventListener('input',function(){
          var price=parseFloat(document.getElementById('_gm_price').value)||0;
          var iva=parseFloat(document.getElementById('_gm_iva').value)||0;
          var ship=parseFloat(document.getElementById('_gm_ship').value)||0;
          var inst=parseFloat(document.getElementById('_gm_inst').value)||0;
          var acc=parseFloat(document.getElementById('_gm_acc').value)||0;
          var total=price*(1+iva/100)+ship+inst+acc;
          // show somewhere
        });
      });
      btn.addEventListener('click',function(){
        var name=(document.getElementById('_gm_name')||{}).value.trim();
        if(!name){tt('Inserisci il nome dell\'obiettivo','error');return;}
        var price=parseFloat((document.getElementById('_gm_price')||{}).value)||0;
        var iva=parseFloat((document.getElementById('_gm_iva')||{}).value)||22;
        var ship=parseFloat((document.getElementById('_gm_ship')||{}).value)||0;
        var inst=parseFloat((document.getElementById('_gm_inst')||{}).value)||0;
        var acc=parseFloat((document.getElementById('_gm_acc')||{}).value)||0;
        var total=price*(1+iva/100)+ship+inst+acc;
        var newG=Object.assign({},g,{
          name,
          brand:(document.getElementById('_gm_brand')||{}).value||'',
          model:(document.getElementById('_gm_model')||{}).value||'',
          category:(document.getElementById('_gm_cat')||{value:'altro'}).value,
          priority:(document.getElementById('_gm_pri')||{value:'media'}).value,
          stato:(document.getElementById('_gm_stato')||{value:'attivo'}).value,
          price,iva_pct:iva,shipping:ship,installation:inst,accessories:acc,total_cost:total,
          auto_pct:parseFloat((document.getElementById('_gm_apct')||{}).value)||0,
          auto_fixed:parseFloat((document.getElementById('_gm_afixed')||{}).value)||0,
          icon:(document.getElementById('_gm_icon')||{}).value||'⚡',
          color:(document.getElementById('_gm_color')||{value:'#6366f1'}).value,
          link_shop:(document.getElementById('_gm_shop')||{}).value||'',
          notes:(document.getElementById('_gm_notes')||{}).value||'',
          target_date:(document.getElementById('_gm_date')||{}).value||'',
          updated_at:new Date().toISOString(),
        });
        if(!newG.id){ newG.id=uid(); newG.created_at=new Date().toISOString(); newG.capital_accumulated=0; }
        var goals=getGoals().filter(function(x){return x.id!==newG.id;});
        goals.unshift(newG);
        saveGoals(goals);
        _closeModal();
        tt((isEdit?'✅ Obiettivo aggiornato':'✅ Obiettivo creato')+': '+name,'success');
        render();
      });
    },60);
  }

  function mField(label,id,type,value,placeholder){
    return '<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">'+label+'</label>'
      +'<input id="'+id+'" type="'+(type||'text')+'" value="'+(value!=null?value:'')+'" placeholder="'+(placeholder||'')+'" style="width:100%;box-sizing:border-box;padding:7px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px"></div>';
  }

  /* ── Manual add/subtract ──────────────────────────────── */
  Goals._manualAdd = function(gId){
    _openModal(
      '<div style="padding:18px 20px">'
      +'<div style="font-size:14px;font-weight:700;color:var(--text,#e8e8f0);margin-bottom:14px">💰 Aggiungi Versamento</div>'
      +'<div style="display:flex;flex-direction:column;gap:10px">'
        +mField('Importo €','_ma_amount','number',0)
        +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">Tipo</label><select id="_ma_type" style="width:100%;padding:7px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px"><option value="manual_add">➕ Versamento</option><option value="manual_sub">➖ Prelievo</option><option value="bonus">🎁 Bonus</option><option value="correction">🔧 Correzione</option><option value="external">💼 Investimento esterno</option><option value="loan">🏦 Finanziamento</option></select></div>'
        +mField('Nota','_ma_note','text','','es: Ordine extra, regalo...') 
      +'</div>'
      +'<div style="display:flex;gap:8px;margin-top:14px">'
        +'<button onclick="Goals._closeM()" style="flex:1;padding:8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:8px;cursor:pointer;color:var(--text-muted,#888);font-family:inherit">Annulla</button>'
        +'<button id="_ma_save" data-gid="'+gId+'" style="flex:1;padding:8px;background:#10b981;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit">💾 Conferma</button>'
      +'</div>'
      +'</div>'
    );
    setTimeout(function(){
      var btn=document.getElementById('_ma_save'); if(!btn) return;
      btn.addEventListener('click',function(){
        var amount=parseFloat((document.getElementById('_ma_amount')||{}).value)||0;
        var type=(document.getElementById('_ma_type')||{value:'manual_add'}).value;
        var note=(document.getElementById('_ma_note')||{}).value;
        if(!amount){tt('Inserisci un importo','error');return;}
        var finalAmt = ['manual_sub'].indexOf(type)>-1 ? -Math.abs(amount) : Math.abs(amount);
        var goals=getGoals();
        var g=goals.find(function(x){return x.id===gId;});
        if(!g){tt('Obiettivo non trovato','error');return;}
        g.capital_accumulated=(g.capital_accumulated||0)+finalAmt;
        if(g.capital_accumulated<0) g.capital_accumulated=0;
        saveGoals(goals);
        addHistoryEntry(gId,type,finalAmt,note,null);
        _closeModal();
        tt((finalAmt>=0?'➕ Aggiunto ':'➖ Sottratto ')+eu(Math.abs(finalAmt)),'success');
        render();
      });
    },60);
  };

  /* ── Save auto-saving config from detail view ─────────── */
  Goals._saveAutoSaving = function(gId){
    var pct  = parseFloat((document.getElementById('_gls_auto_pct')||{}).value)||0;
    var fixed= parseFloat((document.getElementById('_gls_auto_fixed')||{}).value)||0;
    var goals=getGoals();
    var g=goals.find(function(x){return x.id===gId;});
    if(!g)return;
    g.auto_pct=pct; g.auto_fixed=fixed;
    saveGoals(goals);
    tt('✅ Accantonamento salvato: '+pct+'% + €'+fixed+'/ordine','success');
  };

  /* ── Other actions ───────────────────────────────────── */
  Goals._del = function(id){
    var g=getGoals().find(function(x){return x.id===id;});
    if(!g||!window.confirm('Eliminare "'+g.name+'"? I versamenti saranno persi.')) return;
    saveGoals(getGoals().filter(function(x){return x.id!==id;}));
    if(_selGoalId===id){_selGoalId=null;_view='dashboard';}
    render(); tt('🗑️ Obiettivo eliminato','warn');
  };
  Goals._dup = function(id){
    var g=getGoals().find(function(x){return x.id===id;});
    if(!g)return;
    var clone=Object.assign({},g,{id:uid(),name:g.name+' (copia)',capital_accumulated:0,created_at:new Date().toISOString()});
    saveGoals([clone].concat(getGoals()));
    render(); tt('⧉ Duplicato: '+clone.name,'success');
  };
  Goals._archive = function(id){
    var goals=getGoals();
    var g=goals.find(function(x){return x.id===id;});
    if(!g||!window.confirm('Archiviare "'+g.name+'"?')) return;
    g.stato='archiviato';
    saveGoals(goals);
    _view='dashboard';_selGoalId=null;
    render(); tt('📦 Archiviato','info');
  };
  Goals._detail = function(id){_selGoalId=id;_view='detail';renderBody();};
  Goals._tv = function(btn,v){
    _view=v;
    if(btn){
      document.querySelectorAll('._gls_tv').forEach(function(b){
        b.style.background='transparent';b.style.color='var(--text-muted,#888)';
        b.style.borderColor='var(--border,#2a2a35)';
      });
      btn.style.background='var(--primary,#6366f1)';btn.style.color='#fff';btn.style.borderColor='var(--primary,#6366f1)';
    }
    renderBody();
  };
  Goals._search = function(q){_searchQ=q;renderBody();};
  Goals._fcat   = function(v){_filterCat=v;renderBody();};
  Goals._fstat  = function(v){_filterStat=v;renderBody();};
  Goals._closeM = function(){_closeModal();};

  /* ── Export / Import ────────────────────────────────── */
  Goals._export = function(){
    var data={goals:getGoals(),history:getHist(),config:getCfg(),exported_at:new Date().toISOString()};
    var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='ingly_obiettivi_'+new Date().toISOString().slice(0,10)+'.json';
    a.click(); tt('📤 Export completato','success');
  };
  Goals._import = function(){
    var fi=document.createElement('input');fi.type='file';fi.accept='.json';
    fi.onchange=function(e){
      var f=e.target.files[0];if(!f)return;
      var r=new FileReader();
      r.onload=function(ev){
        try{
          var d=JSON.parse(ev.target.result);
          if(d.goals&&Array.isArray(d.goals)){
            var existing=getGoals();
            var existingIds=existing.map(function(g){return g.id;});
            d.goals.forEach(function(g){if(!existingIds.includes(g.id))existing.push(g);});
            saveGoals(existing);
            if(d.history) saveHist(d.history.concat(getHist()).slice(0,2000));
            render(); tt('📥 '+d.goals.length+' obiettivi importati','success');
          }
        }catch(ex){tt('File non valido','error');}
      };
      r.readAsText(f);
    };
    fi.click();
  };

  /* ── Config modal ────────────────────────────────────── */
  Goals._cfg = function(){
    var cfg=getCfg();
    _openModal(
      '<div style="padding:18px 20px">'
      +'<div style="font-size:14px;font-weight:700;color:var(--text,#e8e8f0);margin-bottom:14px">⚙️ Configurazione Modulo</div>'
      +'<div style="display:flex;flex-direction:column;gap:10px">'
        +mField('Nome modulo','_cfg_name','text',cfg.module_name||'🚀 Obiettivi di Crescita')
        +mField('Risparmio mensile stimato €','_cfg_monthly','number',cfg.avg_monthly_saving||0,'es: 500')
        +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">Modalità ripartizione automatica</label>'
          +'<select id="_cfg_split" style="width:100%;padding:7px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px">'
            +'<option value="priority"'+(cfg.split_mode==='priority'?' selected':'')+'>Priorità (tutto al più urgente)</option>'
            +'<option value="percentage"'+(cfg.split_mode==='percentage'?' selected':'')+'>Percentuale personalizzata per obiettivo</option>'
          +'</select></div>'
      +'</div>'
      +'<div style="display:flex;gap:8px;margin-top:14px">'
        +'<button onclick="Goals._closeM()" style="flex:1;padding:8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:8px;cursor:pointer;color:var(--text-muted,#888);font-family:inherit">Annulla</button>'
        +'<button id="_cfg_save" style="flex:1;padding:8px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit">💾 Salva</button>'
      +'</div>'
      +'</div>'
    );
    setTimeout(function(){
      var btn=document.getElementById('_cfg_save');if(!btn)return;
      btn.addEventListener('click',function(){
        saveCfg({
          module_name:(document.getElementById('_cfg_name')||{}).value||'🚀 Obiettivi di Crescita',
          avg_monthly_saving:parseFloat((document.getElementById('_cfg_monthly')||{}).value)||0,
          split_mode:(document.getElementById('_cfg_split')||{value:'priority'}).value,
        });
        _closeModal(); render(); tt('✅ Configurazione salvata','success');
      });
    },60);
  };

  /* ── Public API for order integration ────────────────── */
  window.Goals = window.Goals || {};
  window.Goals.processOrder = processOrderProfit;
  window.Goals.render = render;

  /* ── Hook into App navigation ────────────────────────── */
  ;(function hookNav(){
    var tries=0, iv=setInterval(function(){
      tries++; if(tries>80){clearInterval(iv);return;}
      if(typeof App==='undefined'||!App.renderSection)return;
      clearInterval(iv);
      if(App._goalsHooked)return;
      App._goalsHooked=true;
      var _orig=App.renderSection.bind(App);
      App.renderSection=async function(s){
        var r=await _orig(s);
        if(s==='goals'){setTimeout(function(){
          var el=document.getElementById('view-goals');
          if(el&&!el.querySelector('._gls_tv')) render();
        },100);}
        return r;
      };
      // Hook into order completion to auto-accrue
      var _origMarkDone=App.markOrderDone||null;
      if(_origMarkDone){
        App.markOrderDone=function(orderId,profit){
          var r=_origMarkDone.call(App,orderId,profit);
          processOrderProfit(orderId,profit);
          return r;
        };
      }
    },300);
  })();

  // Init on page load if already on goals section
  setTimeout(function(){
    var el=document.getElementById('view-goals');
    if(el&&el.classList.contains('active')&&!el.querySelector('._gls_tv')) render();
  },700);

  console.log('[Obiettivi Crescita v1.0] Investment Planner loaded ✅');
})();

