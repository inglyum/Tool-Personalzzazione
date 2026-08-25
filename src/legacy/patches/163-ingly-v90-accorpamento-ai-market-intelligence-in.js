
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v90 — Accorpamento AI / Market Intelligence in 3 hub
   Riduce le 15+ sezioni AI/market sfumate a 3 hub chiari, ognuno con barra
   "Viste" che combina le funzioni (restano navigabili). Rimozione stabile via
   CSS + rinomina della voce hub. Idempotente/stabile (observer). Reversibile.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__aiConsolidation) return; window.__aiConsolidation=true;

  var GROUPS=[
    { hub:'marketintel', name:'Market & Trend',
      remove:['trendscanner','price_radar','demand_map','product_hunter','etsy_pulse','live_intel','market_agent','etsy_seo_wizard','contentperf'],
      views:[{sec:'trendscanner',label:'🔍 Trend Hunter'},{sec:'price_radar',label:'📡 Price Radar'},{sec:'demand_map',label:'🗺️ Demand Map'},{sec:'product_hunter',label:'🎯 Product Hunter'},{sec:'etsy_pulse',label:'🔥 Etsy Pulse'},{sec:'live_intel',label:'📡 Live Intel'},{sec:'market_agent',label:'🤖 Market Agent'},{sec:'etsy_seo_wizard',label:'✨ Etsy SEO'},{sec:'contentperf',label:'📱 Content Perf'}] },
    { hub:'growthengine', name:'Previsioni & Crescita',
      remove:['forecasting','forecaster','revsim','ai-predictor'],
      views:[{sec:'forecasting',label:'🔮 AI Previsioni'},{sec:'forecaster',label:'📈 Financial Forecaster'},{sec:'revsim',label:'📊 Revenue Simulator'},{sec:'ai-predictor',label:'🔮 Previsioni Vendite'}] },
    { hub:'decision', name:'Decision & Opportunità',
      remove:['opportunity','leadscorer'],
      views:[{sec:'opportunity',label:'🟡 Opportunity Scanner'},{sec:'leadscorer',label:'⭐ Lead Scorer'}] }
  ];

  // Come la v88: questa patch nascondeva le voci con `display:none !important`
  // e rinominava gli hub nel menu tramite un MutationObserver sulla sidebar.
  // La gerarchia ora sta in src/app-shell/nav-map.js. Resta la barra "Viste"
  // dentro le sezioni hub, che è la parte che aggiunge qualcosa.

  function slice(n){ return Array.prototype.slice.call(n); }

  function injectBar(g){
    var view=document.getElementById('view-'+g.hub); if(!view) return;
    var id='vc-ai-'+g.hub; if(view.querySelector('#'+id)) return;
    var bar=document.createElement('div'); bar.id=id;
    bar.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 4px;';
    var lbl=document.createElement('span'); lbl.textContent='Viste:'; lbl.style.cssText='font-size:12px;color:var(--text-muted,#9ca3af);font-weight:600;margin-right:2px';
    bar.appendChild(lbl);
    g.views.forEach(function(v){
      var bt=document.createElement('button'); bt.type='button'; bt.className='ds-btn ds-btn--sm';
      bt.style.cssText='padding:6px 12px;border-radius:8px;border:1px solid var(--border,#333);background:var(--bg-card2,#20232e);color:var(--text,#eee);cursor:pointer;font:600 12px inherit;transition:.14s';
      bt.textContent=v.label;
      bt.onmouseover=function(){ bt.style.background='var(--primary,#fbbf24)'; bt.style.color='#111'; };
      bt.onmouseout=function(){ bt.style.background='var(--bg-card2,#20232e)'; bt.style.color='var(--text,#eee)'; };
      bt.onclick=function(){ try{ if(window.App&&App.navigate) App.navigate(v.sec); }catch(e){} };
      bar.appendChild(bt);
    });
    var hdr=view.querySelector('.module-header');
    if(hdr && hdr.nextSibling) hdr.parentNode.insertBefore(bar, hdr.nextSibling);
    else view.insertBefore(bar, view.firstChild);
  }

  function run(){ GROUPS.forEach(injectBar); }

  function boot(){
    var content=document.getElementById('content-inner')||document.getElementById('content');
    if(!content) return setTimeout(boot,600);
    run();
    if(window.MutationObserver){
      var mo=new MutationObserver(function(){ clearTimeout(boot._c); boot._c=setTimeout(run,260); });
      mo.observe(content,{childList:true,subtree:true});
    }
    try{ if(window.Bus&&Bus.on) Bus.on('nav',function(){ setTimeout(run,300); }); }catch(e){}
  }
  if(document.readyState!=='loading') setTimeout(boot,2400); else document.addEventListener('DOMContentLoaded',function(){ setTimeout(boot,2400); });
})();
