
/* ═══════════════════════════════════════════════════════════════
   INGLY OS v36 — BANK & FUNDS v2.1 UNIFICATO
   ↕ Stesso dato di Obiettivi di Crescita (ingly_goals_v1)
   ↕ Nessun obiettivo duplicato
   ↕ "+ Aggiungi Obiettivo" → InvestPlanner.openNew()
   ↕ "+€" → detra da banca/contanti + aggiorna capital InvestPlanner
   ═══════════════════════════════════════════════════════════════ */
;(function BFv2Unified(){
  'use strict';
  if(window._bfv2unified) return;
  window._bfv2unified = true;

  /* ── utils ──────────────────────────────────────────────── */
  function eu(n,d){ d=d??2; return '€'+Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:d,maximumFractionDigits:d}); }
  function lsG(k,df){ try{var v=localStorage.getItem(k);return v!=null?JSON.parse(v):df;}catch(e){return df;} }
  function lsS(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} }
  function tt(m,t){ if(typeof toast!=='undefined') toast(m,t||'info'); }
  function uid(){ return 'bf'+Date.now().toString(36); }
  function fdt(d){ try{return new Date(d).toLocaleDateString('it-IT');}catch(e){return '';} }

  /* ── Storage ─────────────────────────────────────────────── */
  var GOALS_KEY = 'ingly_goals_v1';    /* InvestPlanner goals — source of truth */
  var BF_KEY    = 'ingly_bank_funds_v1';
  var HIST_KEY  = 'ingly_bf_hist_v2';
  var CFG_KEY   = 'ingly_bf_cfg_v2';

  function getGoals(){ return lsG(GOALS_KEY,[]); }
  function saveGoals(g){ lsS(GOALS_KEY,g); }
  function getBF(){
    var d=lsG(BF_KEY,{cash:0,bank:0});
    if(!d.cash) d.cash=0;
    if(!d.bank) d.bank=0;
    return d;
  }
  function saveBF(d){ lsS(BF_KEY,d); }
  function getCfg(){ return lsG(CFG_KEY,{reserve:500,reserve_label:'Fondo emergenza',split_mode:'priority',deduct_source:'bank'}); }
  function saveCfg(c){ lsS(CFG_KEY,c); }
  function addHist(type,amt,note){
    var h=lsG(HIST_KEY,[]);
    h.unshift({id:uid(),type,amount:amt,note:note||'',date:new Date().toISOString()});
    lsS(HIST_KEY,h.slice(0,500));
  }

  /* ── Computed state ──────────────────────────────────────── */
  function computed(){
    var goals = getGoals().filter(function(g){return g.stato!=='archiviato';});
    var active = goals.filter(function(g){return g.stato==='attivo';});
    var d=getBF(), cfg=getCfg();
    var total=(d.cash||0)+(d.bank||0);
    var reserve=cfg.reserve||0;
    var available=Math.max(0,total-reserve);
    var accrued=active.reduce(function(s,g){return s+(parseFloat(g.capital)||0);},0);
    var target=active.reduce(function(s,g){return s+(parseFloat(g.total_cost)||0);},0);
    var alloc=active.reduce(function(s,g){return s+(parseFloat(g._alloc)||0);},0);
    var free=Math.max(0,available-accrued-alloc);
    return {d,cfg,total,reserve,available,accrued,target,alloc,free,goals,active};
  }

  /* ── Distribute available funds to goals ─────────────────── */
  function distribute(){
    var c=computed();
    if(c.free<=0){tt('Nessun fondo libero da distribuire','warn');return;}
    var goals=getGoals();
    var needFunding=goals.filter(function(g){
      return g.stato==='attivo'&&(parseFloat(g.total_cost)||0)>(parseFloat(g.capital)||0)+(parseFloat(g._alloc)||0);
    });
    if(!needFunding.length){tt('Tutti gli obiettivi sono già completati','info');return;}
    var cfg=c.cfg, rem=c.free, distributed=0;

    function needOf(g){ return Math.max(0,(parseFloat(g.total_cost)||0)-(parseFloat(g.capital)||0)-(parseFloat(g._alloc)||0)); }
    function round2(v){ return Math.round(v*100)/100; }

    if(cfg.split_mode==='equal'){
      /* Two-pass: first distribute equal share, then redistribute leftover */
      var remaining = needFunding.slice();
      var budget = rem;
      while(remaining.length > 0 && budget > 0.005){
        var share = round2(budget / remaining.length);
        var nextRound = [];
        remaining.forEach(function(g){
          var need = needOf(g);
          var give = round2(Math.min(share, need));
          if(give > 0){ g._alloc = round2((parseFloat(g._alloc)||0) + give); distributed = round2(distributed + give); budget = round2(budget - give); }
          if(needOf(g) > 0.005) nextRound.push(g);
        });
        if(nextRound.length === remaining.length) break; /* no progress, stop */
        remaining = nextRound;
      }
    } else if(cfg.split_mode==='custom'){
      needFunding.forEach(function(g){
        var pct=parseFloat(g._alloc_pct)||0; if(!pct)return;
        var give=round2(Math.min(rem*pct/100, needOf(g)));
        if(give>0){g._alloc=round2((parseFloat(g._alloc)||0)+give); distributed=round2(distributed+give);}
      });
    } else { /* priority — PROPORTIONAL distribution by weight (alta=3, media=2, bassa=1) */
      var priWeight={alta:3,media:2,bassa:1};
      /* Multi-pass: distribute proportionally, then redistribute remainders from capped goals */
      var remaining=needFunding.slice(); var budget=rem;
      var maxPasses=10;
      while(remaining.length>0&&budget>0.005&&maxPasses-->0){
        var totalW=remaining.reduce(function(s,g){return s+(priWeight[g.priority||'media']||1);},0);
        if(!totalW) break;
        var nextRound=[]; var budgetUsed=0;
        remaining.forEach(function(g){
          var w=priWeight[g.priority||'media']||1;
          var share=round2(budget*(w/totalW));
          var need=needOf(g);
          var give=round2(Math.min(share,need));
          if(give>0.005){g._alloc=round2((parseFloat(g._alloc)||0)+give); distributed=round2(distributed+give); budgetUsed=round2(budgetUsed+give);}
          if(needOf(g)>0.005) nextRound.push(g);
        });
        budget=round2(budget-budgetUsed);
        if(!budgetUsed) break;
        remaining=nextRound;
      }
    }
    /* Auto-confirm: move _alloc → capital, deduct from bank/cash immediately */
    var d2=getBF(), cfg2=getCfg();
    goals.forEach(function(g){
      if(!(parseFloat(g._alloc)>0)) return;
      g.capital=round2((parseFloat(g.capital)||0)+parseFloat(g._alloc));
      g._alloc=0;
    });
    saveGoals(goals);
    if(cfg2.deduct_source==='cash') d2.cash=Math.max(0,round2((d2.cash||0)-distributed));
    else d2.bank=Math.max(0,round2((d2.bank||0)-distributed));
    saveBF(d2);
    addHist('distribuzione',-distributed,'⚡ Distribuzione fondi prioritaria');
    if(typeof InvestPlanner!=='undefined'&&typeof InvestPlanner.render==='function'){
      var _el=document.getElementById('view-goals');if(_el&&_el.classList.contains('active'))InvestPlanner.render();
    }
    tt('⚡ '+eu(distributed)+' distribuiti e confermati','success');
    BankFundsV2.render();
  }

  function confirmAll(){
    var goals=getGoals(); var total=0;
    goals.forEach(function(g){if(g._alloc>0)total+=g._alloc;});
    if(!total){tt('Nessuna allocazione da confermare','info');return;}
    if(!window.confirm('Confermare tutte le allocazioni ('+eu(total)+')?')) return;
    goals.forEach(function(g){
      if(!(g._alloc>0)) return;
      g.capital=(parseFloat(g.capital)||0)+g._alloc;
      addHist('conferma',g._alloc,'Confermato per: '+g.name);
      g._alloc=0;
    });
    saveGoals(goals);
    /* Deduct from bank */
    var d=getBF(),cfg=getCfg();
    if(cfg.deduct_source==='cash') d.cash=Math.max(0,(d.cash||0)-total);
    else d.bank=Math.max(0,(d.bank||0)-total);
    saveBF(d);
    addHist('pagamento',-total,'Conferma allocazioni');
    /* Refresh InvestPlanner */
    if(typeof InvestPlanner!=='undefined'&&typeof InvestPlanner.render==='function'){
      var el=document.getElementById('view-goals');
      if(el&&el.classList.contains('active')) InvestPlanner.render();
    }
    tt('✅ Tutte le allocazioni confermate','success');
    BankFundsV2.render();
  }

  function clearAlloc(){
    var goals=getGoals();goals.forEach(function(g){g._alloc=0;});
    saveGoals(goals);tt('Allocazioni azzerate','info');BankFundsV2.render();
  }

  /* ── MODAL helpers ───────────────────────────────────────── */
  function modal(content){
    var old=document.getElementById('_bfu_modal'); if(old)old.remove();
    var ov=document.createElement('div');
    ov.id='_bfu_modal';
    ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.78);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML='<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:14px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;padding:0">'+content+'</div>';
    ov.addEventListener('click',function(e){if(e.target===ov)BankFundsV2.closeModal();});
    document.body.appendChild(ov);
  }
  function modalHdr(title){return '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border,#2a2a35)"><span style="font-size:14px;font-weight:800;color:var(--text,#e8e8f0)">'+title+'</span><button onclick="BankFundsV2.closeModal()" style="background:none;border:none;cursor:pointer;color:var(--text-muted,#888);font-size:22px;line-height:1">×</button></div>';}
  function inp(id,label,type,val,ph){return '<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">'+label+'</label><input id="'+id+'" type="'+(type||'text')+'" value="'+(val!=null?val:'')+'" placeholder="'+(ph||'')+'" style="width:100%;box-sizing:border-box;padding:7px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px;outline:none"></div>';}
  function sel(id,label,opts,val){return '<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">'+label+'</label><select id="'+id+'" style="width:100%;padding:7px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px">'+opts.map(function(o){return '<option value="'+o.v+'"'+(o.v===val?' selected':'')+'>'+o.l+'</option>';}).join('')+'</select></div>';}
  function gv(id){var e=document.getElementById(id);return e?e.value:'';}
  function gn(id,d){return parseFloat(gv(id))||d||0;}
  function footer(cancelFn,saveFn,saveLabel){return '<div style="display:flex;gap:8px;padding:14px 20px;border-top:1px solid var(--border,#2a2a35)"><button onclick="'+(cancelFn||'BankFundsV2.closeModal()')+'" style="flex:1;padding:8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:8px;cursor:pointer;color:var(--text-muted,#888);font-family:inherit">Annulla</button><button id="_bfu_save" style="flex:1;padding:8px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit">'+(saveLabel||'💾 Salva')+'</button></div>';}

  /* ── RENDER ──────────────────────────────────────────────── */
  function render(){
    var el=document.getElementById('view-bank_funds');
    if(!el) return;
    var c=computed();
    var h=lsG(HIST_KEY,[]).slice(0,12);
    var PCOLS={alta:'#ef4444',media:'#f59e0b',bassa:'#10b981'};
    var hasAlloc=c.goals.some(function(g){return (parseFloat(g._alloc)||0)>0;});
    var freeColor=c.free>=0?'#10b981':'#ef4444';
    var activeGoals=c.goals.filter(function(g){return g.stato==='attivo';});
    var doneGoals=c.goals.filter(function(g){return g.stato==='completato';});

    el.innerHTML=[
      /* ── HEADER */
      '<div style="padding:14px 18px;max-width:1100px;margin:0 auto">',
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">',
        '<div style="display:flex;align-items:center;gap:10px">',
          '<span style="font-size:22px">🏦</span>',
          '<div>',
            '<div style="font-size:16px;font-weight:900;color:var(--text,#e8e8f0)">Bank & Funds</div>',
            '<div style="font-size:11px;color:var(--text-muted,#888)">Liquidità · Riserva · Obiettivi di investimento</div>',
          '</div>',
        '</div>',
        '<div style="display:flex;gap:6px;flex-wrap:wrap">',
          '<button onclick="BankFundsV2.openEditFunds()" style="padding:7px 13px;background:#10b981;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700">✏️ Aggiorna Saldi</button>',
          '<button onclick="BankFundsV2.openCfg()" style="padding:7px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:8px;cursor:pointer;font-size:13px" title="Configurazione">⚙️</button>',
        '</div>',
      '</div>',

      /* ── KPI CARDS */
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-bottom:12px">',
        kpi('💵 Contanti',eu(c.d.cash),'var(--text)'),
        kpi('🏦 Banca',eu(c.d.bank),'#3b82f6'),
        kpi('💰 Totale',eu(c.total),'#a855f7'),
        kpi('🛡️ Riserva',eu(c.reserve),'#64748b',c.cfg.reserve_label||'Fondo emergenza'),
        kpi('✅ Disponibile',eu(c.available),'#10b981','Lordo (- riserva)'),
        kpi('💼 Investito',eu(c.accrued),'#6366f1','Nei goal attivi'),
        kpi('🆓 Libero',eu(c.free),freeColor,c.free<0?'⚠️ Deficit':'Non ancora allocato'),
      '</div>',

      /* ── COMPOSIZIONE BAR */
      '<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:12px;margin-bottom:12px">',
        '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:6px">',
          '<span style="font-weight:700;color:var(--text,#e8e8f0)">Composizione Liquidità</span>',
          '<span style="color:var(--text-muted,#888)">'+eu(c.total)+' totali</span>',
        '</div>',
        '<div style="height:9px;background:var(--border,#2a2a35);border-radius:99px;overflow:hidden;display:flex">',
          c.total>0?'<div style="height:100%;width:'+Math.min(100,Math.round(c.reserve/c.total*100))+'%;background:#64748b;transition:.4s" title="Riserva"></div>':'',
          c.total>0&&c.available>0?'<div style="height:100%;width:'+Math.min(100,Math.round(c.available/c.total*100))+'%;background:#10b981;transition:.4s" title="Disponibile"></div>':'',
        '</div>',
        '<div style="display:flex;gap:14px;margin-top:6px;flex-wrap:wrap">',
          leg('Riserva',eu(c.reserve),'#64748b'),
          leg('Disponibile',eu(c.available),'#10b981'),
          c.alloc>0?leg('Allocato',eu(c.alloc),'#6366f1'):'',
        '</div>',
      '</div>',

      /* ── DISTRIBUZIONE */
      '<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:12px;margin-bottom:12px">',
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px">',
          '<div style="font-size:12px;font-weight:700;color:var(--text,#e8e8f0)">⚡ Distribuzione Fondi</div>',
          '<div style="display:flex;gap:5px;flex-wrap:wrap">',
            c.free>0&&activeGoals.length?'<button onclick="BankFundsV2.distribute()" style="padding:6px 11px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">⚡ Distribuisci '+eu(c.free)+'</button>':'',
            hasAlloc?'<button onclick="BankFundsV2.confirmAll()" style="padding:6px 11px;background:#10b98118;border:1px solid #10b98140;border-radius:7px;cursor:pointer;font-size:11px;color:#10b981;font-weight:700">✅ Conferma tutto</button>':'',
            hasAlloc?'<button onclick="BankFundsV2.clearAlloc()" style="padding:6px 8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">↺ Azzera</button>':'',
          '</div>',
        '</div>',
        '<div style="font-size:11px;color:var(--text-muted,#888)">',
          'Modalità: <strong style="color:var(--text,#e8e8f0)">'+({priority:'Priorità',equal:'Uguale',custom:'Percentuale'}[c.cfg.split_mode||'priority'])+'</strong>',
          ' · Fonte detrazione: <strong style="color:var(--text,#e8e8f0)">'+(c.cfg.deduct_source==='cash'?'💵 Contanti':'🏦 Banca')+'</strong>',
          ' · Riserva bloccata: <strong style="color:#64748b">'+eu(c.reserve)+'</strong>',
          ' <button onclick="BankFundsV2.openCfg()" style="background:none;border:none;cursor:pointer;color:var(--primary,#818cf8);font-size:11px;padding:0;margin-left:4px">Modifica →</button>',
        '</div>',
      '</div>',

      /* ── OBIETTIVI HEADER */
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px">',
        '<div>',
          '<div style="font-size:13px;font-weight:800;color:var(--text,#e8e8f0)">🎯 Obiettivi di Investimento</div>',
          '<div style="font-size:10px;color:var(--text-muted,#888)">Sincronizzati con Obiettivi di Crescita · '+eu(c.accrued)+' accantonato / '+eu(c.target)+' totale</div>',
        '</div>',
        '<div style="display:flex;gap:5px">',
          /* "+ Nuovo" apre InvestPlanner.openNew() — unico sistema */
          '<button onclick="App&&App.navigate(\'goals\');setTimeout(function(){if(typeof InvestPlanner!==\'undefined\'&&InvestPlanner.openNew)InvestPlanner.openNew();},400)" style="padding:6px 11px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">+ Nuovo Obiettivo</button>',
          '<button onclick="App&&App.navigate(\'goals\')" style="padding:6px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--primary,#6366f1)30;border-radius:7px;cursor:pointer;font-size:11px;color:var(--primary,#818cf8)" title="Vai a Obiettivi di Crescita">🚀 Obiettivi</button>',
        '</div>',
      '</div>',

      /* ── GOALS LIST */
      activeGoals.length?
        '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">'+
        activeGoals.map(function(g){
          var capital=parseFloat(g.capital)||0;
          var alloc=parseFloat(g._alloc)||0;
          var target=parseFloat(g.total_cost)||0;
          var totalSaved=capital+alloc;
          var pct=target>0?Math.min(100,Math.round(totalSaved/target*100)):0;
          var capPct=target>0?Math.min(100,Math.round(capital/target*100)):0;
          var missing=Math.max(0,target-totalSaved);
          var priColor=PCOLS[g.priority||'media']||'#f59e0b';
          var bc=g.color||'#6366f1';
          var autoPct=parseFloat(g.auto_pct)||0;
          var autoFixed=parseFloat(g.auto_fixed)||0;
          return [
            '<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:12px">',
            /* Goal header */
            '<div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;flex-wrap:wrap">',
              '<div style="width:36px;height:36px;border-radius:9px;background:'+bc+'20;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0">'+(g.icon||'🎯')+'</div>',
              '<div style="flex:1;min-width:0">',
                '<div style="font-size:12px;font-weight:700;color:var(--text,#e8e8f0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(g.name||'Obiettivo')+'</div>',
                '<div style="font-size:10px;color:var(--text-muted,#888)">',
                  '<span style="color:'+priColor+'">'+(g.priority||'media')+'</span>',
                  (autoPct>0||autoFixed>0)?' · ⚙️ Auto: '+(autoPct>0?autoPct+'%':'')+(autoPct>0&&autoFixed>0?' + ':'')+( autoFixed>0?eu(autoFixed):''):'',
                  (g.target_date?' · 📅 '+fdt(g.target_date):''),
                '</div>',
              '</div>',
              '<div style="text-align:right;flex-shrink:0">',
                '<div style="font-size:14px;font-weight:700;color:'+bc+'">'+eu(totalSaved)+'</div>',
                '<div style="font-size:10px;color:var(--text-muted,#888)">di '+eu(target)+'</div>',
              '</div>',
              /* Action buttons */
              '<div style="display:flex;gap:4px;flex-shrink:0">',
                alloc>0?'<button onclick="BankFundsV2.confirmGoal(\''+g.id+'\')" style="padding:5px 7px;background:#10b98115;border:1px solid #10b98135;border-radius:6px;cursor:pointer;font-size:11px;color:#10b981;font-weight:700" title="Conferma allocazione">✅ '+eu(alloc)+'</button>':'',
                '<button onclick="BankFundsV2.openAddFunds(\''+g.id+'\')" style="padding:5px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-muted,#888);font-weight:700" title="Aggiungi fondi manualmente">+€</button>',
                '<button onclick="BankFundsV2.openEditCapital(\''+g.id+'\')" style="padding:5px 9px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.25);border-radius:6px;cursor:pointer;font-size:11px;color:#6366f1;font-weight:700" title="Modifica capitale investito">✏️</button>',
                capital>0?'<button onclick="BankFundsV2.resetGoalCapital(\''+g.id+'\')" style="padding:5px 7px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:6px;cursor:pointer;font-size:11px;color:#ef4444" title="Azzera capitale (rimborsa al saldo)">↩️</button>':'',
                '<button onclick="App&&App.navigate(\'goals\');setTimeout(function(){if(typeof InvestPlanner!==\'undefined\'&&InvestPlanner.openDetail)InvestPlanner.openDetail(\''+g.id+'\');},400)" style="padding:5px 7px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)" title="Dettaglio in Obiettivi">🚀</button>',
              '</div>',
            '</div>',
            /* Progress bar */
            '<div style="height:7px;background:var(--border,#2a2a35);border-radius:99px;overflow:hidden;margin-bottom:4px;display:flex">',
              '<div style="height:100%;width:'+capPct+'%;background:'+bc+';border-radius:99px;transition:.4s" title="Salvato: '+eu(capital)+'"></div>',
              alloc>0?'<div style="height:100%;width:'+Math.max(0,pct-capPct)+'%;background:'+bc+'55;border-radius:99px;transition:.4s" title="Allocato: '+eu(alloc)+'"></div>':'',
            '</div>',
            /* Progress footer */
            '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted,#888)">',
              '<span>'+eu(capital)+' salvato'+(alloc>0?' · <span style="color:'+bc+'55">+'+eu(alloc)+' allocato</span>':'')+'</span>',
              missing>0?'<span>manca '+eu(missing)+'</span>':'<span style="color:#10b981;font-weight:700">✅ Completato!</span>',
            '</div>',
            '</div>'
          ].join('');
        }).join('')+
        '</div>'
      :'<div style="text-align:center;padding:30px;color:var(--text-muted,#888);background:var(--bg-card,#111115);border:1px dashed var(--border,#2a2a35);border-radius:10px;margin-bottom:14px">Nessun obiettivo attivo · <button onclick="App&&App.navigate(\'goals\')" style="background:none;border:none;cursor:pointer;color:var(--primary,#818cf8);font-size:12px;padding:0;font-weight:700">Vai a Obiettivi di Crescita</button></div>',

      /* ── COMPLETATI (collapsed) */
      doneGoals.length?'<div style="font-size:11px;color:var(--text-muted,#888);margin-bottom:14px">✅ '+doneGoals.length+' obiettivi completati — <a onclick="App&&App.navigate(\'goals\')" style="color:var(--primary,#818cf8);cursor:pointer">Vedi in Obiettivi →</a></div>':'',

      /* ── STORICO MOVIMENTI */
      h.length?[
        '<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;padding:12px">',
          '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted,#888);margin-bottom:8px">📜 Ultimi movimenti</div>',
          h.map(function(e){
            var typeIcon={accantonamento_auto:'⚙️',conferma:'✅',pagamento:'💳',versamento_manuale:'➕',distribuzione:'⚡'};
            var ic=typeIcon[e.type]||'📌';
            var positive=e.amount>=0;
            return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border2,#1a1a25);font-size:11px">'+
              '<span style="color:var(--text-muted,#888);min-width:68px;flex-shrink:0">'+fdt(e.date)+'</span>'+
              '<span style="flex:1;color:var(--text,#e8e8f0)">'+ic+' '+(e.note||e.type)+'</span>'+
              '<span style="font-weight:700;color:'+(positive?'#10b981':'#ef4444')+'">'+(positive?'+':'')+eu(Math.abs(e.amount))+'</span>'+
            '</div>';
          }).join(''),
        '</div>',
      ].join(''):'',

      '</div>',
    ].join('');
  }

  function kpi(label,val,color,sub){
    return '<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:9px;padding:11px">'
      +'<div style="font-size:10px;color:var(--text-muted,#888);margin-bottom:2px">'+label+'</div>'
      +'<div style="font-size:16px;font-weight:700;color:'+(color||'var(--text,#e8e8f0)')+'">'+val+'</div>'
      +(sub?'<div style="font-size:10px;color:var(--text-muted,#888);margin-top:1px">'+sub+'</div>':'')
      +'</div>';
  }
  function leg(label,val,color){
    return '<span style="font-size:10px;color:var(--text-muted,#888);display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+color+';flex-shrink:0"></span>'+label+' '+val+'</span>';
  }

  /* ── MODALS ──────────────────────────────────────────────── */
  var BFu = window.BankFundsV2 = window.BankFundsV2||{};
  BFu.render = render;
  BFu.distribute = distribute;
  BFu.confirmAll = confirmAll;
  BFu.clearAlloc = clearAlloc;
  BFu.closeModal = function(){ var m=document.getElementById('_bfu_modal');if(m)m.remove(); };

  /* Edit capital invested in a goal (with bank adjustment) */
  BFu.openEditCapital = function(goalId){
    var goals=getGoals(); var g=goals.find(function(x){return x.id===goalId;});
    if(!g) return;
    var oldCap=parseFloat(g.capital)||0;
    modal(modalHdr('✏️ Modifica Capitale — '+(g.icon||'')+(g.name||''))
      +'<div style="padding:0 20px"><div style="display:flex;flex-direction:column;gap:9px;padding:14px 0">'
        +'<div style="font-size:11px;color:var(--text-muted,#888)">Capitale attuale: <strong style="color:#6366f1">'+eu(oldCap)+'</strong></div>'
        +inp('_bce_amt','Nuovo importo capitale €','number',oldCap,'0.00')
        +sel('_bce_adj','Aggiusta saldo banca/cassa di conseguenza',[{v:'yes',l:'✅ Sì (aggiusta differenza sul saldo)'},{v:'no',l:'⚠️ No (solo aggiorna goal, saldo invariato)'}],'yes')
        +inp('_bce_note','Nota','text','','es: correzione manuale')
      +'</div></div>'
      +footer('','','💾 Aggiorna'));
    setTimeout(function(){
      var b=document.getElementById('_bfu_save');if(!b)return;
      b.onclick=function(){
        var newCap=gn('_bce_amt');
        var adj=gv('_bce_adj')==='yes';
        var note=gv('_bce_note')||'Modifica capitale manuale';
        var diff=newCap-oldCap;
        var goals2=getGoals(); var g2=goals2.find(function(x){return x.id===goalId;});
        if(!g2)return;
        g2.capital=Math.max(0,newCap);
        saveGoals(goals2);
        if(adj&&diff!==0){
          var d=getBF(),cfg=getCfg();
          if(cfg.deduct_source==='cash') d.cash=Math.max(0,(d.cash||0)-diff);
          else d.bank=Math.max(0,(d.bank||0)-diff);
          saveBF(d);
          addHist('rettifica',diff>0?-diff:Math.abs(diff),note+' → '+(g2.name||''));
        }
        BFu.closeModal();render();
        tt('✅ Capitale aggiornato: '+eu(newCap),'success');
      };
    },50);
  };

  /* Reset goal capital to 0 and refund to bank balance */
  BFu.resetGoalCapital = function(goalId){
    var goals=getGoals(); var g=goals.find(function(x){return x.id===goalId;});
    if(!g) return;
    var cap=parseFloat(g.capital)||0;
    if(cap<=0){tt('Nessun capitale da azzerare','info');return;}
    if(!confirm('Azzerare '+eu(cap)+' da "'+g.name+'"?\nL\'importo verrà rimborsato al saldo disponibile.')) return;
    g.capital=0; g._alloc=0;
    saveGoals(goals);
    var d=getBF(),cfg=getCfg();
    if(cfg.deduct_source==='cash') d.cash=(d.cash||0)+cap;
    else d.bank=(d.bank||0)+cap;
    saveBF(d);
    addHist('rimborso',cap,'Reset capitale → '+(g.name||''));
    tt('↩️ '+eu(cap)+' rimborsati al saldo','success'); render();
  };

  BFu.confirmGoal = function(goalId){
    var goals=getGoals(); var g=goals.find(function(x){return x.id===goalId;});
    if(!g||!(parseFloat(g._alloc)>0)) return;
    var amt=parseFloat(g._alloc);
    g.capital=(parseFloat(g.capital)||0)+amt; g._alloc=0;
    saveGoals(goals);
    var d=getBF(),cfg=getCfg();
    if(cfg.deduct_source==='cash') d.cash=Math.max(0,(d.cash||0)-amt);
    else d.bank=Math.max(0,(d.bank||0)-amt);
    saveBF(d); addHist('conferma',-amt,'Confermato → '+g.name);
    if(typeof InvestPlanner!=='undefined'&&typeof InvestPlanner.render==='function'){
      var el=document.getElementById('view-goals');if(el&&el.classList.contains('active'))InvestPlanner.render();
    }
    tt('✅ '+eu(amt)+' confermati per '+g.name,'success'); render();
  };

  BFu.openEditFunds = function(){
    var d=getBF();
    modal(modalHdr('💰 Aggiorna Saldi')
      +'<div style="padding:0 20px"><div style="display:flex;flex-direction:column;gap:9px;padding:14px 0">'
        +inp('_bfe_cash','💵 Contanti €','number',d.cash||0)
        +inp('_bfe_bank','🏦 Banca €','number',d.bank||0)
        +inp('_bfe_note','Nota','text','','opzionale')
      +'</div></div>'
      +footer('','','💾 Salva'));
    setTimeout(function(){
      var b=document.getElementById('_bfu_save');if(!b)return;
      b.onclick=function(){
        var old=(getBF().cash||0)+(getBF().bank||0);
        var nd={cash:gn('_bfe_cash'),bank:gn('_bfe_bank')};
        saveBF(nd);
        addHist('aggiornamento',(nd.cash+nd.bank)-old, gv('_bfe_note')||'Aggiornamento saldi');
        BFu.closeModal();render();tt('💰 Saldo aggiornato: '+eu(nd.cash+nd.bank),'success');
      };
    },50);
  };

  BFu.openAddFunds = function(goalId){
    var goals=getGoals(); var g=goals.find(function(x){return x.id===goalId;});
    if(!g) return;
    modal(modalHdr('➕ Fondi per '+g.icon+' '+(g.name||'Obiettivo'))
      +'<div style="padding:0 20px"><div style="display:flex;flex-direction:column;gap:9px;padding:14px 0">'
        +inp('_bfa_amt','Importo €','number',0,'es: 200')
        +sel('_bfa_src','Fonte',[ {v:'bank',l:'🏦 Dalla banca'},{v:'cash',l:'💵 Da contanti'},{v:'ext',l:'💼 Esterno (nessuna detrazione)'}],'bank')
        +inp('_bfa_note','Nota','text','','es: vendita settimanale')
      +'</div></div>'
      +footer('','','✅ Aggiungi'));
    setTimeout(function(){
      var b=document.getElementById('_bfu_save');if(!b)return;
      b.onclick=function(){
        var amt=gn('_bfa_amt');if(!amt){tt('Inserisci un importo','error');return;}
        var src=gv('_bfa_src'),note=gv('_bfa_note');
        /* Use SyncEngine.manualAccrue if available */
        if(typeof SyncEngine!=='undefined'&&SyncEngine.manualAccrue){
          SyncEngine.manualAccrue(goalId,amt,src==='ext'?null:src);
        } else {
          var goals2=getGoals(); var g2=goals2.find(function(x){return x.id===goalId;});
          if(!g2)return;
          g2.capital=(parseFloat(g2.capital)||0)+amt;
          saveGoals(goals2);
          if(src!=='ext'){var d=getBF();if(src==='cash')d.cash=Math.max(0,(d.cash||0)-amt);else d.bank=Math.max(0,(d.bank||0)-amt);saveBF(d);}
          addHist('versamento_manuale',src!=='ext'?-amt:amt,(note||'Versamento')+' → '+g2.name);
          if(typeof InvestPlanner!=='undefined'&&typeof InvestPlanner.render==='function'){var el=document.getElementById('view-goals');if(el&&el.classList.contains('active'))InvestPlanner.render();}
          tt('✅ '+eu(amt)+' aggiunti a '+(g2.name||'obiettivo'),'success');
        }
        BFu.closeModal(); render();
      };
    },50);
  };

  BFu.openCfg = function(){
    var cfg=getCfg();
    modal(modalHdr('⚙️ Configurazione Bank & Funds')
      +'<div style="padding:0 20px"><div style="display:flex;flex-direction:column;gap:9px;padding:14px 0">'
        +inp('_bfc_reserve','🛡️ Importo riserva €','number',cfg.reserve||500)
        +inp('_bfc_label','Etichetta riserva','text',cfg.reserve_label||'Fondo emergenza','es: Buffer operativo')
        +sel('_bfc_mode','Modalità distribuzione automatica',[
          {v:'priority',l:'🔴 Priorità (Alta→Media→Bassa)'},
          {v:'equal',l:'⚖️ Uguale tra tutti gli obiettivi'},
          {v:'custom',l:'% Personalizzata per obiettivo'},
        ],cfg.split_mode||'priority')
        +sel('_bfc_src','Fonte detrazione automatica',[
          {v:'bank',l:'🏦 Banca (default)'},
          {v:'cash',l:'💵 Contanti'},
        ],cfg.deduct_source||'bank')
      +'</div></div>'
      +footer('','','💾 Salva Config'));
    setTimeout(function(){
      var b=document.getElementById('_bfu_save');if(!b)return;
      b.onclick=function(){
        saveCfg({reserve:gn('_bfc_reserve'),reserve_label:gv('_bfc_label')||'Fondo emergenza',split_mode:gv('_bfc_mode')||'priority',deduct_source:gv('_bfc_src')||'bank'});
        BFu.closeModal();render();tt('✅ Config salvata','success');
      };
    },50);
  };

  console.log('[v36] BankFunds Unificato con InvestPlanner ✅');
})();

