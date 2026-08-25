
/* ═══════════════════════════════════════════════════════════════
   INGLY OS v36 — SYNC ENGINE
   Obiettivi di Crescita ↔ Bank & Funds ↔ Vendite
   
   FLUSSO COMPLETO:
   1. Vendi / segni ordine come PAGATO
      → Bus.emit('sale:created', {amount, ...})
      → SyncEngine.onSale(amount) calcola profitto
      → Per ogni obiettivo attivo con auto_pct/auto_fixed:
         ✦ accantona % o € fisso in InvestPlanner (capital++)
         ✦ detrae la stessa quota da BankFunds (banca o contanti)
         ✦ aggiorna BankFunds vista in tempo reale
   
   2. BankFunds "+€" ad un obiettivo (manuale)
      → detrae da banca/contanti scelti
      → aggiorna InvestPlanner capital per quel goal
   
   3. Obiettivi di Crescita UNIFICATI con BankFunds
      → Sono GLI STESSI dati (ingly_goals_v1)
      → BankFunds non ha obiettivi propri: legge da InvestPlanner
      → Il pulsante "+ Aggiungi Obiettivo" in BankFunds apre 
        InvestPlanner.openNew() 
   ═══════════════════════════════════════════════════════════════ */
;(function SYNC_ENGINE(){
  'use strict';
  if(window._v36sync) return;
  window._v36sync = true;

  /* ── utils ──────────────────────────────────────────────── */
  function eu(n){ return '€'+Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function lsG(k,d){ try{var v=localStorage.getItem(k);return v!=null?JSON.parse(v):d;}catch(e){return d;} }
  function lsS(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} }
  function tt(m,t){ if(typeof toast!=='undefined') toast(m,t||'info'); }

  var GOALS_KEY = 'ingly_goals_v1';
  var BF_KEY    = 'ingly_bank_funds_v1';
  var BF_HIST   = 'ingly_bf_hist_v2';
  var BF_CFG    = 'ingly_bf_cfg_v2';

  function getGoals(){ return lsG(GOALS_KEY,[]); }
  function saveGoals(g){ lsS(GOALS_KEY,g); }
  function getBF(){ return lsG(BF_KEY,{cash:0,bank:0}); }
  function saveBF(d){ lsS(BF_KEY,d); }
  function getBFCfg(){ return lsG(BF_CFG,{reserve:500,reserve_label:'Fondo emergenza',split_mode:'priority',deduct_source:'bank'}); }
  function addBFHist(type,amt,note){
    var h=lsG(BF_HIST,[]);
    h.unshift({id:'h'+Date.now().toString(36),type,amount:amt,note:note||'',date:new Date().toISOString()});
    lsS(BF_HIST,h.slice(0,500));
  }

  /* ── CORE SYNC: deduct from bank/cash when accruing ───── */
  function deductFromBank(amount, note){
    if(amount<=0) return;
    var d=getBF(), cfg=getBFCfg();
    var src=cfg.deduct_source||'bank';
    if(src==='bank'){
      var deducted=Math.min(d.bank||0, amount);
      d.bank=Math.max(0,(d.bank||0)-deducted);
      if(deducted<amount){
        var fromCash=amount-deducted;
        d.cash=Math.max(0,(d.cash||0)-fromCash);
      }
    } else {
      var deductedCash=Math.min(d.cash||0, amount);
      d.cash=Math.max(0,(d.cash||0)-deductedCash);
      if(deductedCash<amount){
        d.bank=Math.max(0,(d.bank||0)-(amount-deductedCash));
      }
    }
    saveBF(d);
    addBFHist('accantonamento_auto',-amount, note||'Accantonamento automatico');
  }

  /* ── MAIN: process sale → accrue to goals ─────────────── */
  function onSale(saleData){
    var amount  = parseFloat(saleData.amount||saleData.total||0);
    if(amount<=0) return;
    var cost    = parseFloat(saleData.supplierCost||saleData.cost||saleData.costoMateriale||0);
    var markup  = parseFloat(saleData.markup||0);
    if(cost===0&&markup>0) cost=+(amount/(1+markup/100)).toFixed(2);
    if(cost===0) cost=+(amount*0.55).toFixed(2); /* fallback 45% margin */
    var profit  = Math.max(0,+(amount-cost).toFixed(2));
    if(profit<=0) return;

    var goals   = getGoals();
    var active  = goals.filter(function(g){return g.stato==='attivo'&&((g.auto_pct||0)>0||(g.auto_fixed||0)>0);});
    if(!active.length) return;

    var totalAccrued = 0;
    var accruals = [];

    active.forEach(function(g){
      var pct   = parseFloat(g.auto_pct)||0;
      var fixed = parseFloat(g.auto_fixed)||0;
      var amt   = (pct>0?profit*pct/100:0)+(fixed>0?fixed:0);
      amt = Math.max(0,+amt.toFixed(2));
      if(amt<=0) return;
      /* Cap at remaining target */
      var remaining = Math.max(0,(parseFloat(g.total_cost)||0)-(parseFloat(g.capital)||0));
      if(remaining>0) amt=Math.min(amt,remaining);
      g.capital=(parseFloat(g.capital)||0)+amt;
      totalAccrued+=amt;
      accruals.push({name:g.name,icon:g.icon||'🎯',amt,pct,fixed,id:g.id});
    });

    if(totalAccrued>0){
      saveGoals(goals);
      deductFromBank(totalAccrued, 'Ordine '+eu(amount)+' → '+accruals.map(function(a){return a.icon+' '+eu(a.amt);}).join(', '));
      /* Refresh BankFundsV2 if visible */
      setTimeout(function(){
        if(typeof BankFundsV2!=='undefined'){
          var el=document.getElementById('view-bank_funds');
          if(el&&el.classList.contains('active')) BankFundsV2.render();
        }
        /* Refresh InvestPlanner if visible */
        if(typeof InvestPlanner!=='undefined'&&typeof InvestPlanner.render==='function'){
          var el2=document.getElementById('view-goals');
          if(el2&&el2.classList.contains('active')) InvestPlanner.render();
        }
      },200);
      /* Show summary toast */
      if(accruals.length===1){
        tt('💰 '+eu(totalAccrued)+' accantonato → '+accruals[0].icon+' '+accruals[0].name,'success');
      } else {
        tt('💰 '+eu(totalAccrued)+' distribuiti su '+accruals.length+' obiettivi','success');
      }
    }
  }

  /* ── Hook into Bus.emit sale:created ──────────────────── */
  ;(function hookBus(){
    var t=0,iv=setInterval(function(){
      t++;if(t>120){clearInterval(iv);return;}
      if(typeof Bus==='undefined'||!Bus.on) return;
      clearInterval(iv);
      Bus.on('sale:created', function(sale){ onSale(sale); });
      /* Also hook Kanban move to 'pagato' */
      Bus.on('kanban:pagato', function(data){ if(data&&data.value>0) onSale({amount:data.value,supplierCost:0}); });
      console.log('[SyncEngine] Bus hooks: sale:created + kanban:pagato ✅');
    },300);
  })();

  /* ── Expose for manual deduction ─────────────────────── */
  window.SyncEngine = {
    onSale: onSale,
    deductFromBank: deductFromBank,

    /* Called from BankFundsV2 when user manually adds funds to a goal */
    manualAccrue: function(goalId, amount, deductFrom){
      if(amount<=0) return;
      var goals=getGoals();
      var g=goals.find(function(x){return x.id===goalId;});
      if(!g){tt('Obiettivo non trovato','error');return;}
      g.capital=(parseFloat(g.capital)||0)+amount;
      saveGoals(goals);
      /* Deduct from bank/cash */
      var d=getBF();
      if(deductFrom==='bank') d.bank=Math.max(0,(d.bank||0)-amount);
      else if(deductFrom==='cash') d.cash=Math.max(0,(d.cash||0)-amount);
      saveBF(d);
      addBFHist('versamento_manuale',-amount,'Versamento → '+g.name);
      tt('✅ '+eu(amount)+' versato in '+g.name,'success');
      /* Refresh both */
      setTimeout(function(){
        if(typeof BankFundsV2!=='undefined'){var el=document.getElementById('view-bank_funds');if(el&&el.classList.contains('active'))BankFundsV2.render();}
        if(typeof InvestPlanner!=='undefined'&&typeof InvestPlanner.render==='function'){var el2=document.getElementById('view-goals');if(el2&&el2.classList.contains('active'))InvestPlanner.render();}
      },100);
    },

    /* Get combined state */
    getState: function(){
      var goals=getGoals().filter(function(g){return g.stato==='attivo';});
      var bf=getBF(), cfg=getBFCfg();
      var total=(bf.cash||0)+(bf.bank||0);
      var reserve=cfg.reserve||0;
      var available=Math.max(0,total-reserve);
      var accTotal=goals.reduce(function(s,g){return s+(parseFloat(g.capital)||0);},0);
      var accTarget=goals.reduce(function(s,g){return s+(parseFloat(g.total_cost)||0);},0);
      return {goals,bf,cfg,total,reserve,available,accTotal,accTarget};
    },
  };

  console.log('[INGLY v36] SyncEngine: Vendite↔Obiettivi↔BankFunds ✅');
})();

