
/* ═══════════════════════════════════════════════════════════════
   INGLY OS — 🚀 OBIETTIVI DI CRESCITA v2.0  (BUG-FREE)
   Fix: window.Goals esposto SUBITO, _fcat/_fstat su window.Goals,
   tutti i bottoni funzionanti, UI professionale.
   ═══════════════════════════════════════════════════════════════ */
;(function(){
  'use strict';
  if(window._investPlannerV2) return;
  window._investPlannerV2 = true;

  /* ── EXPOSE window.Goals FIRST so onclick handlers work ── */
  window.InvestPlanner = window.InvestPlanner || {};
  var G = window.InvestPlanner; /* G === window.Goals always */

  /* ── Storage ──────────────────────────────────────────── */
  var DB  = 'ingly_goals_v1';
  var HDB = 'ingly_goals_hist_v1';
  var CFG = 'ingly_goals_cfg_v1';
  function lsGet(k,d){ try{var v=localStorage.getItem(k);return v!=null?JSON.parse(v):d;}catch(e){return d;} }
  function lsSet(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} }

  function getGoals()   { return lsGet(DB,[]); }
  function saveGoals(a) { lsSet(DB,a); }
  function getHist()    { return lsGet(HDB,[]); }
  function saveHist(a)  { lsSet(HDB,a.slice(0,3000)); }
  function getCfg()     { return lsGet(CFG,{}); }
  function saveCfg(c)   { lsSet(CFG,c); }

  function eu(n){ return '€'+parseFloat(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function uid(){ return 'g'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
  function fdt(d){ if(!d)return '—'; try{return new Date(d).toLocaleDateString('it-IT');}catch(e){return d;} }
  function tt(m,t){ if(typeof toast!=='undefined') toast(m,t||'info'); }

  /* ── Lookup tables ────────────────────────────────────── */
  var CATS = [
    {id:'laser',     lbl:'Laser',         ico:'⚡'},
    {id:'stampanti', lbl:'Stampanti',      ico:'🖨️'},
    {id:'cnc',       lbl:'CNC',           ico:'🔩'},
    {id:'utensili',  lbl:'Utensili',       ico:'🔧'},
    {id:'computer',  lbl:'Computer',       ico:'💻'},
    {id:'software',  lbl:'Software',       ico:'💿'},
    {id:'arredo',    lbl:'Arredamento',    ico:'🪑'},
    {id:'magazzino', lbl:'Magazzino',      ico:'📦'},
    {id:'veicoli',   lbl:'Veicoli',        ico:'🚐'},
    {id:'marketing', lbl:'Marketing',      ico:'📣'},
    {id:'formazione',lbl:'Formazione',     ico:'🎓'},
    {id:'sicurezza', lbl:'Sicurezza',      ico:'🦺'},
    {id:'altro',     lbl:'Altro',          ico:'📌'},
  ];
  var PRIS = [{id:'alta',lbl:'Alta',col:'#ef4444'},{id:'media',lbl:'Media',col:'#f59e0b'},{id:'bassa',lbl:'Bassa',col:'#10b981'}];
  var STATI= [{id:'attivo',lbl:'Attivo',col:'#6366f1'},{id:'pausa',lbl:'In pausa',col:'#64748b'},{id:'completato',lbl:'Completato',col:'#10b981'},{id:'archiviato',lbl:'Archiviato',col:'#374151'}];

  function catOf(id) { return CATS.find(function(c){return c.id===id;})||CATS[CATS.length-1]; }
  function priOf(id) { return PRIS.find(function(p){return p.id===id;})||PRIS[1]; }
  function staOf(id) { return STATI.find(function(s){return s.id===id;})||STATI[0]; }

  /* ── Progress calc ────────────────────────────────────── */
  function progress(g){
    var acc = parseFloat(g.capital||0);
    var tgt = parseFloat(g.total_cost||g.price||0);
    var pct = tgt>0 ? Math.min(100,Math.round(acc/tgt*100)) : 0;
    var missing = Math.max(0,tgt-acc);
    var cfg = getCfg();
    var monthly = parseFloat(cfg.monthly_saving||0);
    var months = monthly>0 ? Math.ceil(missing/monthly) : null;
    var eta = null;
    if(months!=null){ var d=new Date(); d.setMonth(d.getMonth()+months); eta=d.toISOString().slice(0,10); }
    return {acc,tgt,pct,missing,eta,months};
  }

  /* ── History ──────────────────────────────────────────── */
  function addHist(gId,type,amount,note,orderId){
    var h = getHist();
    h.unshift({id:'h'+Date.now(),gId,type,amount:parseFloat(amount)||0,note:note||'',orderId:orderId||null,date:new Date().toISOString()});
    saveHist(h);
  }

  /* ── Auto-accrue from order ───────────────────────────── */
  G.processOrder = function(orderId, profit){
    profit = parseFloat(profit)||0;
    if(profit<=0) return;
    var goals = getGoals();
    var active = goals.filter(function(g){return g.stato==='attivo';});
    if(!active.length) return;
    active.forEach(function(g){
      var pct   = parseFloat(g.auto_pct)||0;
      var fixed = parseFloat(g.auto_fixed)||0;
      var amt   = (pct>0 ? profit*pct/100 : 0) + (fixed>0 ? fixed : 0);
      if(amt<=0) return;
      g.capital = (parseFloat(g.capital)||0) + amt;
      addHist(g.id,'auto',amt,'Ordine #'+orderId,orderId);
      var p = progress(g);
      [25,50,75,90,100].forEach(function(m){
        if(p.pct>=m && (p.pct-Math.round(amt/g.total_cost*100))<m)
          tt('🎯 '+g.name+' → '+m+'%!','success');
      });
    });
    saveGoals(goals);
  };

  /* ── Stats ────────────────────────────────────────────── */
  function stats(){
    var all   = getGoals();
    var act   = all.filter(function(g){return g.stato==='attivo';});
    var done  = all.filter(function(g){return g.stato==='completato';});
    var tAcc  = all.reduce(function(s,g){return s+(parseFloat(g.capital)||0);},0);
    var tTgt  = all.reduce(function(s,g){return s+(parseFloat(g.total_cost)||0);},0);
    var now=new Date(),y=now.getFullYear(),m=now.getMonth();
    var h=getHist();
    var mAcc = h.filter(function(e){var d=new Date(e.date);return d.getFullYear()===y&&d.getMonth()===m;})
               .reduce(function(s,e){return s+e.amount;},0);
    var yAcc = h.filter(function(e){return new Date(e.date).getFullYear()===y;})
               .reduce(function(s,e){return s+e.amount;},0);
    return {active:act.length,done:done.length,total:all.length,tAcc,tTgt,
            tPct:tTgt>0?Math.round(tAcc/tTgt*100):0,mAcc,yAcc};
  }

  /* ══════════════════════════════════════════════════════
     STATE
  ══════════════════════════════════════════════════════ */
  var _view   = 'dash';
  var _selId  = null;
  var _fcat   = 'all';
  var _fstat  = 'all';
  var _q      = '';

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  G.render = function(){
    var el = document.getElementById('view-goals');
    if(!el) return;
    el.style.cssText='padding:0;overflow:hidden';
    el.innerHTML='<div id="_gs_wrap" style="display:flex;flex-direction:column;height:calc(100vh-64px);overflow:hidden;background:var(--bg-main,#0d0d14)">'+ buildShell()+'</div>';
    paint();
  };

  function buildShell(){
    var catOpts='<option value="all">Tutte categorie</option>'
      +CATS.map(function(c){return '<option value="'+c.id+'">'+c.ico+' '+c.lbl+'</option>';}).join('');
    var staOpts='<option value="all">Tutti gli stati</option>'
      +STATI.map(function(s){return '<option value="'+s.id+'">'+s.lbl+'</option>';}).join('');
    return(
      /* Header */
      '<div style="padding:12px 16px;border-bottom:1px solid var(--border,#2a2a35);background:var(--bg-card,#111115);display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-size:17px;font-weight:800;color:var(--text,#e8e8f0)">🚀 Obiettivi di Crescita</div>'
          +'<div id="_gs_kpi" style="font-size:11px;color:var(--text-muted,#888);margin-top:2px"></div>'
        +'</div>'
        +'<button onclick="InvestPlanner.openNew()" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#000;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800;box-shadow:0 2px 12px #fbbf2440;transition:.15s;font-family:inherit" onmouseover="this.style.opacity=\'.88\'" onmouseout="this.style.opacity=\'1\'">＋ Nuovo Obiettivo</button>'
      +'</div>'
      /* Toolbar */
      +'<div style="padding:8px 16px;border-bottom:1px solid var(--border,#2a2a35);background:var(--bg-card,#111115);display:flex;align-items:center;gap:6px;flex-wrap:wrap">'
        +'<button id="_gs_btn_dash" onclick="InvestPlanner.setView(\'dash\')" style="padding:5px 12px;border-radius:7px;border:1px solid var(--primary,#6366f1);background:var(--primary,#6366f1);color:#fff;cursor:pointer;font-size:11px;font-family:inherit">📊 Dashboard</button>'
        +'<button id="_gs_btn_list" onclick="InvestPlanner.setView(\'list\')" style="padding:5px 12px;border-radius:7px;border:1px solid var(--border,#2a2a35);background:transparent;color:var(--text-muted,#888);cursor:pointer;font-size:11px;font-family:inherit">📋 Lista</button>'
        +'<div style="flex:1;min-width:8px"></div>'
        +'<input placeholder="🔍 Cerca..." oninput="InvestPlanner.setQ(this.value)" style="padding:5px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:11px;width:150px">'
        +'<select onchange="InvestPlanner.setFcat(this.value)" style="padding:5px 8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:11px">'+catOpts+'</select>'
        +'<select onchange="InvestPlanner.setFstat(this.value)" style="padding:5px 8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:11px">'+staOpts+'</select>'
        +'<button onclick="InvestPlanner.openCfg()" title="Impostazioni" style="padding:5px 8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">⚙️</button>'
        +'<button onclick="InvestPlanner.doExport()" title="Esporta" style="padding:5px 8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">📤</button>'
        +'<button onclick="InvestPlanner.doImport()" title="Importa" style="padding:5px 8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">📥</button>'
      +'</div>'
      /* Body */
      +'<div id="_gs_body" style="flex:1;overflow-y:auto;padding:14px 16px"></div>'
    );
  }

  function paint(){
    var body = document.getElementById('_gs_body');
    if(!body) return;
    if(_view==='dash')   body.innerHTML = buildDash();
    else if(_view==='list')  body.innerHTML = buildList();
    else if(_view==='detail') body.innerHTML = buildDetail(_selId);
    updateKpi();
    updateTabBtns();
  }

  function updateKpi(){
    var el=document.getElementById('_gs_kpi'); if(!el) return;
    var s=stats();
    el.textContent=s.active+' attivi · '+eu(s.tAcc)+' accumulato · '+s.tPct+'% completato';
  }

  function updateTabBtns(){
    var d=document.getElementById('_gs_btn_dash');
    var l=document.getElementById('_gs_btn_list');
    if(!d||!l) return;
    var act='padding:5px 12px;border-radius:7px;border:1px solid var(--primary,#6366f1);background:var(--primary,#6366f1);color:#fff;cursor:pointer;font-size:11px;font-family:inherit';
    var inact='padding:5px 12px;border-radius:7px;border:1px solid var(--border,#2a2a35);background:transparent;color:var(--text-muted,#888);cursor:pointer;font-size:11px;font-family:inherit';
    d.style.cssText=(_view==='dash')?act:inact;
    l.style.cssText=(_view==='list')?act:inact;
  }

  /* ── DASHBOARD ──────────────────────────────────────── */
  function buildDash(){
    var s  = stats();
    var all= getGoals().filter(function(g){return g.stato!=='archiviato';});
    var cfg= getCfg();

    /* KPI row */
    var out='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:16px">'
      +kpi('🎯 Attivi',s.active,'','#6366f1')
      +kpi('✅ Completati',s.done,'','#10b981')
      +kpi('💰 Accumulato',eu(s.tAcc),'totale','#fbbf24')
      +kpi('📅 Questo mese',eu(s.mAcc),'','#06b6d4')
      +kpi('📆 Quest\'anno',eu(s.yAcc),'','#8b5cf6')
      +kpi('📊 Avanzamento',s.tPct+'%','su '+eu(s.tTgt),'#f59e0b')
      +'</div>';

    /* Portfolio bar */
    if(s.total>0){
      out+='<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:12px;margin-bottom:14px">'
        +'<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted,#888);margin-bottom:6px"><span style="font-weight:700;color:var(--text,#e8e8f0)">Portfolio investimenti</span><span>'+eu(s.tAcc)+' / '+eu(s.tTgt)+'</span></div>'
        +'<div style="height:8px;background:var(--border,#2a2a35);border-radius:99px;overflow:hidden">'
          +'<div style="height:100%;width:'+s.tPct+'%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:99px;transition:.4s"></div>'
        +'</div>'
        +'<div style="font-size:10px;color:var(--text-muted,#888);margin-top:4px">'+s.tPct+'% del totale · profitto da ordini: '+(typeof G.processOrder==='function'?eu(0):'—')+'</div>'
        +'</div>';
    }

    /* Goals grid */
    if(!all.length){
      out+='<div style="text-align:center;padding:48px;color:var(--text-muted,#888)">'
        +'<div style="font-size:48px;margin-bottom:14px">🚀</div>'
        +'<div style="font-size:15px;font-weight:700;color:var(--text,#e8e8f0);margin-bottom:8px">Nessun obiettivo creato</div>'
        +'<div style="font-size:13px;margin-bottom:20px">Crea il tuo primo obiettivo per iniziare ad accantonare profitti automaticamente</div>'
        +'<button onclick="InvestPlanner.openNew()" style="padding:10px 22px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:700">+ Crea Primo Obiettivo</button>'
        +'</div>';
    } else {
      out+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px;margin-bottom:14px">';
      all.forEach(function(g){
        var p   = progress(g);
        var cat = catOf(g.category);
        var sta = staOf(g.stato);
        var barColor = p.pct>=100?'#10b981':p.pct>=75?'#6366f1':p.pct>=50?'#f59e0b':'#64748b';
        out+='<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:12px;overflow:hidden">'
          /* Progress stripe top */
          +'<div style="height:4px;background:var(--border2,#1a1a25)">'
            +'<div style="height:100%;width:'+p.pct+'%;background:'+barColor+';transition:.4s"></div>'
          +'</div>'
          +'<div style="padding:12px">'
            /* Header */
            +'<div style="display:flex;align-items:flex-start;gap:9px;margin-bottom:10px">'
              +'<div style="width:38px;height:38px;border-radius:9px;background:'+(g.color||'#6366f1')+'20;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">'+(g.icon||cat.ico)+'</div>'
              +'<div style="flex:1;min-width:0">'
                +'<div style="font-size:13px;font-weight:700;color:var(--text,#e8e8f0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(g.name||'Obiettivo')+'</div>'
                +'<div style="font-size:10px;color:var(--text-muted,#888)">'+(g.brand||cat.lbl)+(g.model?' '+g.model:'')+' · <span style="color:'+sta.col+'">'+sta.lbl+'</span></div>'
              +'</div>'
              +(g.priority==='alta'?'<span style="font-size:9px;background:#ef444420;color:#ef4444;padding:2px 6px;border-radius:5px;flex-shrink:0;margin-top:2px">ALTA</span>':'')
            +'</div>'
            /* Numbers */
            +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:8px;text-align:center">'
              +'<div><div style="font-size:13px;font-weight:700;color:#10b981">'+eu(p.acc)+'</div><div style="font-size:9px;color:var(--text-muted,#888)">Accumulato</div></div>'
              +'<div><div style="font-size:13px;font-weight:700;color:#ef4444">'+eu(p.missing)+'</div><div style="font-size:9px;color:var(--text-muted,#888)">Mancante</div></div>'
              +'<div><div style="font-size:13px;font-weight:700;color:var(--text,#e8e8f0)">'+eu(p.tgt)+'</div><div style="font-size:9px;color:var(--text-muted,#888)">Obiettivo</div></div>'
            +'</div>'
            /* Bar */
            +'<div style="height:6px;background:var(--border,#2a2a35);border-radius:99px;overflow:hidden;margin-bottom:5px">'
              +'<div style="height:100%;width:'+p.pct+'%;background:'+barColor+';border-radius:99px;transition:.4s"></div>'
            +'</div>'
            +'<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted,#888);margin-bottom:10px">'
              +'<span style="font-weight:700;color:'+barColor+'">'+p.pct+'%</span>'
              +(p.eta?'<span>ETA: '+fdt(p.eta)+(p.months?' ('+p.months+'m)':'')+'</span>':'<span>—</span>')
            +'</div>'
            /* Buttons */
            +'<div style="display:flex;gap:5px">'
              +'<button onclick="InvestPlanner.openDetail(\''+g.id+'\')" style="flex:1;padding:7px 6px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">Dettagli</button>'
              +'<button onclick="InvestPlanner.openAddMoney(\''+g.id+'\')" style="padding:7px 10px;background:#10b98120;border:1px solid #10b98140;border-radius:7px;cursor:pointer;font-size:11px;color:#10b981;font-weight:700">+€</button>'
              +'<button onclick="InvestPlanner.openEdit(\''+g.id+'\')" style="padding:7px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:12px;color:var(--text-muted,#888)">✏️</button>'
              +'<button onclick="InvestPlanner.doDelete(\''+g.id+'\')" style="padding:7px 9px;background:#ef444415;border:1px solid #ef444430;border-radius:7px;cursor:pointer;font-size:12px;color:#ef4444">🗑️</button>'
            +'</div>'
          +'</div>'
          +'</div>';
      });
      out+='</div>';
    }

    /* AI tips */
    out += buildAI();
    return out;
  }

  function kpi(label,value,sub,color){
    return '<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:12px">'
      +'<div style="font-size:10px;color:var(--text-muted,#888);margin-bottom:3px">'+label+'</div>'
      +'<div style="font-size:20px;font-weight:700;color:'+(color||'var(--text,#e8e8f0)')+'">'+value+'</div>'
      +(sub?'<div style="font-size:10px;color:var(--text-muted,#888);margin-top:2px">'+sub+'</div>':'')
      +'</div>';
  }

  /* ── LIST VIEW ──────────────────────────────────────── */
  function buildList(){
    var all=getGoals().filter(function(g){
      if(_fcat!=='all' && g.category!==_fcat) return false;
      if(_fstat!=='all' && g.stato!==_fstat)  return false;
      if(_q&&!(g.name||'').toLowerCase().includes(_q.toLowerCase())) return false;
      return true;
    });
    if(!all.length) return '<div style="padding:40px;text-align:center;color:var(--text-muted,#888)">Nessun obiettivo trovato</div>';
    return '<div style="display:flex;flex-direction:column;gap:7px">'
      +all.map(function(g){
        var p=progress(g),cat=catOf(g.category),sta=staOf(g.stato);
        return '<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:9px;padding:11px 13px;display:flex;align-items:center;gap:11px">'
          +'<div style="width:34px;height:34px;border-radius:8px;background:'+(g.color||'#6366f1')+'20;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">'+(g.icon||cat.ico)+'</div>'
          +'<div style="flex:1;min-width:0">'
            +'<div style="font-size:13px;font-weight:700;color:var(--text,#e8e8f0)">'+(g.name||'Obiettivo')+'</div>'
            +'<div style="font-size:10px;color:var(--text-muted,#888)">'+cat.lbl+(g.brand?' · '+g.brand:'')+' · <span style="color:'+sta.col+'">'+sta.lbl+'</span></div>'
          +'</div>'
          +'<div style="text-align:center;min-width:70px">'
            +'<div style="font-size:14px;font-weight:700;color:var(--text,#e8e8f0)">'+p.pct+'%</div>'
            +'<div style="height:4px;background:var(--border,#2a2a35);border-radius:99px;overflow:hidden;margin-top:2px"><div style="height:100%;width:'+p.pct+'%;background:var(--primary,#6366f1)"></div></div>'
          +'</div>'
          +'<div style="text-align:right;min-width:110px">'
            +'<div style="font-size:13px;font-weight:700;color:var(--text,#e8e8f0)">'+eu(p.acc)+'</div>'
            +'<div style="font-size:10px;color:var(--text-muted,#888)">di '+eu(p.tgt)+'</div>'
          +'</div>'
          +'<div style="display:flex;gap:4px;flex-shrink:0">'
            +'<button onclick="InvestPlanner.openDetail(\''+g.id+'\')" style="padding:5px 9px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:10px">Apri</button>'
            +'<button onclick="InvestPlanner.openEdit(\''+g.id+'\')" style="padding:5px 7px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">✏️</button>'
            +'<button onclick="InvestPlanner.doDuplicate(\''+g.id+'\')" style="padding:5px 7px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">⧉</button>'
            +'<button onclick="InvestPlanner.doDelete(\''+g.id+'\')" style="padding:5px 7px;background:#ef444415;border:1px solid #ef444430;border-radius:6px;cursor:pointer;font-size:11px;color:#ef4444">🗑️</button>'
          +'</div>'
          +'</div>';
      }).join('')+'</div>';
  }

  /* ── DETAIL VIEW ────────────────────────────────────── */
  function buildDetail(gId){
    var g=getGoals().find(function(x){return x.id===gId;});
    if(!g) return '<div style="padding:20px;color:var(--text-muted,#888)">Obiettivo non trovato. <button onclick="InvestPlanner.setView(\'dash\')" style="background:none;border:none;color:var(--primary,#818cf8);cursor:pointer">← Torna alla dashboard</button></div>';
    var p=progress(g), cat=catOf(g.category), sta=staOf(g.stato);
    var hist=getHist().filter(function(h){return h.gId===gId;}).slice(0,40);
    var barColor=p.pct>=100?'#10b981':p.pct>=75?'#6366f1':p.pct>=50?'#f59e0b':'#64748b';

    return '<div>'
      /* Back + actions */
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">'
        +'<button onclick="InvestPlanner.setView(\'dash\')" style="padding:6px 11px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">← Dashboard</button>'
        +'<span style="font-size:15px;font-weight:800;color:var(--text,#e8e8f0)">'+(g.icon||cat.ico)+' '+(g.name||'Obiettivo')+'</span>'
        +'<span style="padding:3px 9px;border-radius:99px;font-size:10px;background:'+sta.col+'20;color:'+sta.col+'">'+sta.lbl+'</span>'
        +'<div style="margin-left:auto;display:flex;gap:5px">'
          +'<button onclick="InvestPlanner.openAddMoney(\''+g.id+'\')" style="padding:6px 12px;background:#10b98118;border:1px solid #10b98140;border-radius:7px;cursor:pointer;font-size:11px;color:#10b981;font-weight:700">+ Versamento</button>'
          +'<button onclick="InvestPlanner.openEdit(\''+g.id+'\')" style="padding:6px 10px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">✏️</button>'
          +'<button onclick="InvestPlanner.doArchive(\''+g.id+'\')" style="padding:6px 10px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">📦</button>'
          +'<button onclick="InvestPlanner.doDelete(\''+g.id+'\')" style="padding:6px 10px;background:#ef444415;border:1px solid #ef444430;border-radius:7px;cursor:pointer;font-size:11px;color:#ef4444">🗑️</button>'
        +'</div>'
      +'</div>'
      /* Progress + Details row */
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">'
        /* Progress card */
        +'<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:14px">'
          +'<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted,#888);margin-bottom:10px">Avanzamento</div>'
          +'<div style="font-size:38px;font-weight:900;color:'+barColor+';margin-bottom:4px">'+p.pct+'%</div>'
          +'<div style="height:10px;background:var(--border,#2a2a35);border-radius:99px;overflow:hidden;margin-bottom:10px">'
            +'<div style="height:100%;width:'+p.pct+'%;background:'+barColor+';border-radius:99px;transition:.4s"></div>'
          +'</div>'
          +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center;margin-bottom:10px">'
            +'<div><div style="font-size:14px;font-weight:700;color:#10b981">'+eu(p.acc)+'</div><div style="font-size:9px;color:var(--text-muted,#888)">Accumulato</div></div>'
            +'<div><div style="font-size:14px;font-weight:700;color:#ef4444">'+eu(p.missing)+'</div><div style="font-size:9px;color:var(--text-muted,#888)">Mancante</div></div>'
            +'<div><div style="font-size:14px;font-weight:700;color:var(--text,#e8e8f0)">'+eu(p.tgt)+'</div><div style="font-size:9px;color:var(--text-muted,#888)">Totale</div></div>'
          +'</div>'
          +(p.eta?'<div style="padding:7px;background:var(--primary,#6366f1)10;border-radius:7px;font-size:11px;color:var(--text-muted,#888);text-align:center">📅 ETA: <strong style="color:var(--primary,#818cf8)">'+fdt(p.eta)+(p.months?' (~'+p.months+' mesi)':'')+'</strong></div>':'')
        +'</div>'
        /* Details card */
        +'<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:14px">'
          +'<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted,#888);margin-bottom:10px">Dettagli</div>'
          +dRow('Categoria',cat.ico+' '+cat.lbl)
          +dRow('Marca / Modello',(g.brand||'—')+(g.model?' '+g.model:''))
          +dRow('Prezzo netto',eu(g.price||0))
          +dRow('IVA',(g.iva_pct>0?g.iva_pct+'% ('+eu((g.price||0)*g.iva_pct/100)+')'  :'Esente'))
          +dRow('Spedizione',eu(g.shipping||0))
          +dRow('Installazione',eu(g.install||0))
          +'<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px;border-top:1px solid var(--border,#2a2a35);margin-top:3px"><strong style="color:var(--text,#e8e8f0)">Costo totale</strong><strong style="color:var(--text,#e8e8f0)">'+eu(g.total_cost||0)+'</strong></div>'
          +dRow('Data obiettivo',fdt(g.target_date))
          +(g.link_shop?'<a href="'+g.link_shop+'" target="_blank" rel="noopener" style="display:block;margin-top:8px;font-size:11px;color:var(--primary,#818cf8);text-decoration:none">🛒 Apri negozio ↗</a>':'')
          +(g.link_mfr?'<a href="'+g.link_mfr+'" target="_blank" rel="noopener" style="display:block;margin-top:4px;font-size:11px;color:var(--primary,#818cf8);text-decoration:none">🏭 Sito produttore ↗</a>':'')
        +'</div>'
      +'</div>'
      /* Auto-saving */
      +'<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:14px;margin-bottom:12px">'
        +'<div style="font-size:11px;font-weight:700;color:var(--text-muted,#888);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">⚙️ Accantonamento Automatico per Ordine</div>'
        +'<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">'
          +'<div style="display:flex;align-items:center;gap:6px">'
            +'<label style="font-size:12px;color:var(--text-muted,#888)">% del profitto:</label>'
            +'<input id="_gs_apct" type="number" step="1" min="0" max="100" value="'+(g.auto_pct||0)+'" style="width:65px;padding:5px 7px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:6px;color:var(--text,#e8e8f0);font-size:12px">'
            +'<span style="font-size:12px;color:var(--text-muted,#888)">%</span>'
          +'</div>'
          +'<div style="display:flex;align-items:center;gap:6px">'
            +'<label style="font-size:12px;color:var(--text-muted,#888)">€ fisso:</label>'
            +'<input id="_gs_afixed" type="number" step="1" min="0" value="'+(g.auto_fixed||0)+'" style="width:75px;padding:5px 7px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:6px;color:var(--text,#e8e8f0);font-size:12px">'
            +'<span style="font-size:12px;color:var(--text-muted,#888)">€</span>'
          +'</div>'
          +'<button onclick="InvestPlanner.saveAutoSaving(\''+g.id+'\')" style="padding:5px 12px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">💾 Salva</button>'
        +'</div>'
        +'<div style="margin-top:7px;font-size:11px;color:var(--text-muted,#888)">ℹ️ Ad ogni ordine completato il sistema accantona automaticamente questa quota.</div>'
      +'</div>'
      /* Notes */
      +(g.notes?'<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:12px;margin-bottom:12px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted,#888);margin-bottom:7px">Note</div><div style="font-size:12px;color:var(--text,#e8e8f0);line-height:1.6">'+g.notes+'</div></div>':'')
      /* History */
      +'<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:14px">'
        +'<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted,#888);margin-bottom:10px">Storico Movimenti ('+hist.length+')</div>'
        +(hist.length?hist.map(function(h){
          var typeLabels={'auto':'🤖 Auto-ordine','manual_add':'➕ Versamento','manual_sub':'➖ Prelievo','bonus':'🎁 Bonus','correction':'🔧 Correzione','external':'💼 Esterno','loan':'🏦 Finanziamento'};
          var tl=typeLabels[h.type]||h.type;
          return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border2,#1a1a25);font-size:11px">'
            +'<span style="color:var(--text-muted,#888);min-width:78px;flex-shrink:0">'+fdt(h.date)+'</span>'
            +'<span style="flex:1;color:var(--text,#e8e8f0)">'+tl+(h.note?' — '+h.note:'')+'</span>'
            +'<span style="font-weight:700;color:'+(h.amount>=0?'#10b981':'#ef4444')+';">'+(h.amount>=0?'+':'')+eu(h.amount)+'</span>'
            +'</div>';
        }).join(''):'<div style="color:var(--text-muted,#888);font-size:12px;padding:6px 0">Nessun movimento registrato</div>')
      +'</div>'
      +'</div>';
  }

  function dRow(label,value){
    return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border2,#1a1a25);font-size:11px">'
      +'<span style="color:var(--text-muted,#888)">'+label+'</span><span style="color:var(--text,#e8e8f0)">'+value+'</span></div>';
  }

  /* ── AI ─────────────────────────────────────────────── */
  function buildAI(){
    var goals=getGoals().filter(function(g){return g.stato==='attivo';});
    if(!goals.length) return '';
    var sorted=goals.slice().sort(function(a,b){return progress(b).pct-progress(a).pct;});
    var top=sorted[0], p=top?progress(top):null;
    var tips=[];
    if(top&&p) tips.push('🎯 Più vicino al traguardo: <strong>'+top.name+'</strong> al <strong>'+p.pct+'%</strong>'+(p.months?' — ETA ~'+p.months+' mesi':'')+'. Aumenta l\'accantonamento automatico per accelerare.');
    var maxPct=Math.max.apply(null,goals.map(function(g){return parseFloat(g.auto_pct)||0;}));
    if(maxPct<10) tips.push('💡 Accantonamento basso (max '+maxPct+'%). Anche il 15–20% per ordine fa una grande differenza nel tempo.');
    if(goals.length>3) tips.push('📊 '+goals.length+' obiettivi attivi. Considera di mettere in pausa quelli meno urgenti per concentrare il capitale.');
    if(!tips.length) return '';
    return '<div style="background:var(--bg-card,#111115);border:1px solid var(--primary,#6366f1)20;border-radius:10px;padding:12px;margin-top:4px">'
      +'<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--primary,#818cf8);margin-bottom:8px">🤖 Suggerimenti AI</div>'
      +tips.map(function(t){return '<div style="font-size:12px;color:var(--text-muted,#888);margin-bottom:6px;line-height:1.5;padding-left:8px;border-left:2px solid var(--primary,#6366f1)40">'+t+'</div>';}).join('')
      +'</div>';
  }

  /* ══════════════════════════════════════════════════════
     MODALS
  ══════════════════════════════════════════════════════ */
  function _modal(content){
    var ov = document.createElement('div');
    ov.id  = '_gs_ov';
    ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML='<div id="_gs_box" style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:14px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto">'+content+'</div>';
    ov.addEventListener('click',function(e){ if(e.target===ov) G.closeModal(); });
    document.getElementById('_gs_ov') && document.getElementById('_gs_ov').remove();
    document.body.appendChild(ov);
  }

  G.closeModal = function(){
    var ov=document.getElementById('_gs_ov');
    if(ov) ov.remove();
    if(typeof closeModal!=='undefined') try{closeModal();}catch(e){}
  };

  /* ── Input field helper ─────────────────────────────── */
  function inp(id,label,type,value,placeholder,extra){
    var pStr=placeholder?'placeholder="'+placeholder+'"':'';
    var vStr=(value!=null&&value!==undefined)?'value="'+value+'"':'';
    return '<div'+(extra?' style="'+extra+'"':'')+'>'
      +'<label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">'+label+'</label>'
      +'<input id="'+id+'" type="'+(type||'text')+'" '+vStr+' '+pStr+' style="width:100%;box-sizing:border-box;padding:7px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px;outline:none">'
      +'</div>';
  }
  function sel(id,label,opts,selected){
    return '<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">'+label+'</label>'
      +'<select id="'+id+'" style="width:100%;padding:7px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px">'
      +opts.map(function(o){return '<option value="'+o.v+'"'+(o.v===selected?' selected':'')+'>'+o.l+'</option>';}).join('')
      +'</select></div>';
  }
  function gv(id){var el=document.getElementById(id);return el?el.value:'';}
  function gn(id,def){return parseFloat(gv(id))||def||0;}

  /* ── New/Edit Goal ──────────────────────────────────── */
  G.openNew  = function(){ _showGoalForm(null); };
  G.openEdit = function(id){
    var g=getGoals().find(function(x){return x.id===id;});
    if(!g){ tt('Obiettivo non trovato','error'); return; }
    _showGoalForm(g);
  };

  function _showGoalForm(existing){
    var isEdit=!!(existing&&existing.id);
    var g=existing||{brand:'',model:'',name:'',category:'laser',priority:'media',stato:'attivo',auto_pct:10,auto_fixed:0,price:0,iva_pct:22,shipping:0,install:0,total_cost:0,color:'#6366f1',icon:'⚡',notes:'',link_shop:'',link_mfr:'',target_date:''};

    var catOpts = CATS.map(function(c){return {v:c.id,l:c.ico+' '+c.lbl};});
    var priOpts = PRIS.map(function(p){return {v:p.id,l:p.lbl};});
    var staOpts = STATI.map(function(s){return {v:s.id,l:s.lbl};});

    _modal(
      '<div style="padding:18px 20px">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
        +'<span style="font-size:15px;font-weight:700;color:var(--text,#e8e8f0)">'+(isEdit?'✏️ Modifica':'➕ Nuovo')+' Obiettivo</span>'
        +'<button onclick="InvestPlanner.closeModal()" style="background:none;border:none;cursor:pointer;color:var(--text-muted,#888);font-size:20px;line-height:1">×</button>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +inp('_gf_name','Nome *','text',g.name,'es: xTool P3 CO₂')
        +inp('_gf_brand','Marca','text',g.brand,'es: xTool')
        +inp('_gf_model','Modello','text',g.model,'es: P3')
        +sel('_gf_cat','Categoria',catOpts,g.category)
        +sel('_gf_pri','Priorità',priOpts,g.priority)
        +sel('_gf_sta','Stato',staOpts,g.stato)
        +inp('_gf_price','Prezzo netto €','number',g.price)
        +inp('_gf_iva','IVA %','number',g.iva_pct||22)
        +inp('_gf_ship','Spedizione €','number',g.shipping||0)
        +inp('_gf_inst','Installazione €','number',g.install||0)
        +inp('_gf_date','Data obiettivo','date',g.target_date)
        +inp('_gf_apct','Accanton. % / ordine','number',g.auto_pct||10)
        +inp('_gf_afixed','Accanton. € fisso / ordine','number',g.auto_fixed||0)
        +inp('_gf_icon','Icona (emoji)','text',g.icon||'⚡','⚡')
        +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">Colore</label><input id="_gf_color" type="color" value="'+(g.color||'#6366f1')+'" style="width:100%;height:34px;padding:2px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer"></div>'
        +'<div style="grid-column:span 2">'+inp('_gf_shop','Link negozio','url',g.link_shop||'','https://...')+'</div>'
        +'<div style="grid-column:span 2">'+inp('_gf_mfr','Link produttore','url',g.link_mfr||'','https://...')+'</div>'
        +'<div style="grid-column:span 2"><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">Note</label><textarea id="_gf_notes" rows="2" style="width:100%;box-sizing:border-box;padding:7px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px;resize:vertical">'+(g.notes||'')+'</textarea></div>'
      +'</div>'
      +'<div id="_gf_total_preview" style="margin-top:10px;padding:8px 10px;background:var(--primary,#6366f1)10;border-radius:7px;font-size:12px;color:var(--primary,#818cf8);text-align:center">Costo totale: calcolato automaticamente</div>'
      +'<div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">'
        +'<button onclick="InvestPlanner.closeModal()" style="padding:8px 16px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:8px;cursor:pointer;color:var(--text-muted,#888);font-family:inherit">Annulla</button>'
        +'<button id="_gf_save_btn" style="padding:8px 18px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit">💾 '+(isEdit?'Salva':'Crea')+'</button>'
      +'</div>'
      +'</div>'
    );

    /* Bind total preview */
    setTimeout(function(){
      ['_gf_price','_gf_iva','_gf_ship','_gf_inst'].forEach(function(fid){
        var el=document.getElementById(fid); if(!el) return;
        el.addEventListener('input',_updatePreview);
      });
      _updatePreview();
      function _updatePreview(){
        var price=gn('_gf_price'), iva=gn('_gf_iva'), ship=gn('_gf_ship'), inst=gn('_gf_inst');
        var tot=price*(1+iva/100)+ship+inst;
        var prev=document.getElementById('_gf_total_preview');
        if(prev) prev.textContent='Costo totale: '+eu(tot)+(iva>0?' (IVA '+iva+'% incl.)':'');
      }

      var saveBtn=document.getElementById('_gf_save_btn');
      if(!saveBtn) return;
      saveBtn.addEventListener('click',function(){
        var name=gv('_gf_name').trim();
        if(!name){tt('Inserisci il nome','error');return;}
        var price=gn('_gf_price'), iva=gn('_gf_iva'), ship=gn('_gf_ship'), inst=gn('_gf_inst');
        var total=price*(1+iva/100)+ship+inst;
        var newG=Object.assign({},g,{
          name, brand:gv('_gf_brand'), model:gv('_gf_model'),
          category:gv('_gf_cat'), priority:gv('_gf_pri'), stato:gv('_gf_sta'),
          price, iva_pct:iva, shipping:ship, install:inst, total_cost:total,
          auto_pct:gn('_gf_apct'), auto_fixed:gn('_gf_afixed'),
          icon:gv('_gf_icon')||'⚡', color:gv('_gf_color')||'#6366f1',
          link_shop:gv('_gf_shop'), link_mfr:gv('_gf_mfr'),
          notes:(document.getElementById('_gf_notes')||{}).value||'',
          target_date:gv('_gf_date'), updated_at:new Date().toISOString(),
        });
        if(!newG.id){ newG.id=uid(); newG.created_at=new Date().toISOString(); newG.capital=0; }
        var all=getGoals().filter(function(x){return x.id!==newG.id;});
        all.unshift(newG);
        saveGoals(all);
        G.closeModal();
        tt((isEdit?'✅ Modificato':'✅ Creato')+': '+name,'success');
        G.render();
      });
    },50);
  }

  /* ── Add money modal ────────────────────────────────── */
  G.openAddMoney = function(gId){
    _modal(
      '<div style="padding:18px 20px">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
        +'<span style="font-size:14px;font-weight:700;color:var(--text,#e8e8f0)">💰 Movimento Manuale</span>'
        +'<button onclick="InvestPlanner.closeModal()" style="background:none;border:none;cursor:pointer;color:var(--text-muted,#888);font-size:20px;line-height:1">×</button>'
      +'</div>'
      +'<div style="display:flex;flex-direction:column;gap:10px">'
        +inp('_am_amount','Importo €','number',0)
        +sel('_am_type','Tipo movimento',[
          {v:'manual_add',l:'➕ Versamento'},{v:'manual_sub',l:'➖ Prelievo'},
          {v:'bonus',l:'🎁 Bonus'},{v:'correction',l:'🔧 Correzione'},
          {v:'external',l:'💼 Investimento esterno'},{v:'loan',l:'🏦 Finanziamento'}
        ],'manual_add')
        +inp('_am_note','Nota (opzionale)','text','','es: vendita extra, regalo...')
      +'</div>'
      +'<div style="display:flex;gap:8px;margin-top:14px">'
        +'<button onclick="InvestPlanner.closeModal()" style="flex:1;padding:8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:8px;cursor:pointer;color:var(--text-muted,#888);font-family:inherit">Annulla</button>'
        +'<button id="_am_save" style="flex:1;padding:8px;background:#10b981;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit">💾 Conferma</button>'
      +'</div>'
      +'</div>'
    );
    setTimeout(function(){
      var btn=document.getElementById('_am_save');
      if(!btn) return;
      btn.addEventListener('click',function(){
        var amount=gn('_am_amount');
        if(!amount){tt('Inserisci un importo','error');return;}
        var type=gv('_am_type'), note=gv('_am_note');
        var sign=type==='manual_sub'?-1:1;
        var amt=sign*Math.abs(amount);
        var all=getGoals();
        var g=all.find(function(x){return x.id===gId;});
        if(!g){tt('Obiettivo non trovato','error');return;}
        g.capital=Math.max(0,(parseFloat(g.capital)||0)+amt);
        saveGoals(all);
        addHist(gId,type,amt,note,null);
        G.closeModal();
        tt((amt>=0?'➕ '+eu(amt):' ➖ '+eu(Math.abs(amt)))+' registrato','success');
        if(_view==='detail') paint(); else G.render();
      });
    },50);
  };

  /* ── Save auto-saving from detail ──────────────────── */
  G.saveAutoSaving = function(gId){
    var pct=gn('_gs_apct'), fixed=gn('_gs_afixed');
    var all=getGoals(), g=all.find(function(x){return x.id===gId;});
    if(!g) return;
    g.auto_pct=pct; g.auto_fixed=fixed;
    saveGoals(all);
    tt('✅ '+pct+'% + €'+fixed+' per ordine','success');
  };

  /* ── Config modal ───────────────────────────────────── */
  G.openCfg = function(){
    var cfg=getCfg();
    _modal(
      '<div style="padding:18px 20px">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
        +'<span style="font-size:14px;font-weight:700;color:var(--text,#e8e8f0)">⚙️ Configurazione</span>'
        +'<button onclick="InvestPlanner.closeModal()" style="background:none;border:none;cursor:pointer;color:var(--text-muted,#888);font-size:20px;line-height:1">×</button>'
      +'</div>'
      +'<div style="display:flex;flex-direction:column;gap:10px">'
        +inp('_cfg_name','Nome modulo','text',cfg.module_name||'🚀 Obiettivi di Crescita')
        +inp('_cfg_monthly','Risparmio mensile stimato €','number',cfg.monthly_saving||0,'es: 500')
        +sel('_cfg_split','Ripartizione automatica',[
          {v:'priority',l:'Priorità (tutto all\'obiettivo più urgente)'},
          {v:'equal',l:'Equa (dividi tra tutti gli obiettivi attivi)'},
          {v:'custom',l:'Personalizzata (usa % per-obiettivo)'}
        ],cfg.split_mode||'custom')
      +'</div>'
      +'<div style="display:flex;gap:8px;margin-top:14px">'
        +'<button onclick="InvestPlanner.closeModal()" style="flex:1;padding:8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:8px;cursor:pointer;color:var(--text-muted,#888);font-family:inherit">Annulla</button>'
        +'<button id="_cfg_save" style="flex:1;padding:8px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit">💾 Salva</button>'
      +'</div>'
      +'</div>'
    );
    setTimeout(function(){
      var btn=document.getElementById('_cfg_save');
      if(!btn) return;
      btn.addEventListener('click',function(){
        saveCfg({module_name:gv('_cfg_name'),monthly_saving:gn('_cfg_monthly'),split_mode:gv('_cfg_split')});
        G.closeModal(); G.render(); tt('✅ Configurazione salvata','success');
      });
    },50);
  };

  /* ── CRUD actions ───────────────────────────────────── */
  G.doDelete = function(id){
    var g=getGoals().find(function(x){return x.id===id;});
    if(!g||!window.confirm('Eliminare "'+g.name+'"? Il capitale accumulato andrà perso.')) return;
    saveGoals(getGoals().filter(function(x){return x.id!==id;}));
    if(_selId===id){_selId=null;_view='dash';}
    G.render(); tt('🗑️ Eliminato','warn');
  };
  G.doDuplicate = function(id){
    var g=getGoals().find(function(x){return x.id===id;});
    if(!g) return;
    var c=Object.assign({},g,{id:uid(),name:g.name+' (copia)',capital:0,created_at:new Date().toISOString()});
    saveGoals([c].concat(getGoals()));
    G.render(); tt('⧉ Duplicato: '+c.name,'success');
  };
  G.doArchive = function(id){
    if(!window.confirm('Archiviare questo obiettivo?')) return;
    var all=getGoals(), g=all.find(function(x){return x.id===id;});
    if(!g) return;
    g.stato='archiviato';
    saveGoals(all);
    _view='dash';_selId=null;
    G.render(); tt('📦 Archiviato','info');
  };
  G.openDetail = function(id){ _selId=id; _view='detail'; paint(); };

  /* ── View / filter setters ──────────────────────────── */
  G.setView  = function(v){ _view=v; paint(); };
  G.setQ     = function(q){ _q=q; paint(); };
  G.setFcat  = function(v){ _fcat=v; paint(); };
  G.setFstat = function(v){ _fstat=v; paint(); };

  /* ── Export / Import ────────────────────────────────── */
  G.doExport = function(){
    var d={goals:getGoals(),history:getHist(),config:getCfg(),exported_at:new Date().toISOString()};
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));
    a.download='ingly_obiettivi_'+new Date().toISOString().slice(0,10)+'.json';
    a.click(); tt('📤 Export OK','success');
  };
  G.doImport = function(){
    var fi=document.createElement('input');fi.type='file';fi.accept='.json';
    fi.onchange=function(e){
      var f=e.target.files[0];if(!f)return;
      var r=new FileReader();
      r.onload=function(ev){
        try{
          var d=JSON.parse(ev.target.result);
          if(Array.isArray(d.goals)){
            var ex=getGoals(), ids=ex.map(function(g){return g.id;});
            d.goals.forEach(function(g){if(!ids.includes(g.id))ex.push(g);});
            saveGoals(ex);
            if(Array.isArray(d.history)) saveHist(d.history.concat(getHist()));
            G.render(); tt('📥 '+d.goals.length+' obiettivi importati','success');
          }
        }catch(ex){tt('File non valido','error');}
      };
      r.readAsText(f);
    };
    fi.click();
  };

  /* ── Nav hook ───────────────────────────────────────── */
  ;(function hookNav(){
    var t=0,iv=setInterval(function(){
      t++;if(t>80){clearInterval(iv);return;}
      if(typeof App==='undefined'||!App.renderSection)return;
      clearInterval(iv);
      if(App._investPlannerHooked)return;
      App._investPlannerHooked=true;
      var _o=App.renderSection.bind(App);
      App.renderSection=async function(s){
        var r=await _o(s);
        if(s==='goals'){setTimeout(function(){
          var el=document.getElementById('view-goals');
          if(el&&!el.querySelector('#_gs_body')) G.render();
        },100);}
        return r;
      };
    },300);
  })();

  /* Boot if already on goals */
  setTimeout(function(){
    var el=document.getElementById('view-goals');
    if(el&&el.classList.contains('active')&&!el.querySelector('#_gs_body')) G.render();
  },600);

  console.log('[InvestPlanner v2.0] Investment Planner — all buttons wired ✅');
})();

