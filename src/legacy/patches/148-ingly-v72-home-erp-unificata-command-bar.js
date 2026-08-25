
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v72 — HOME ERP UNIFICATA: Command Bar
   Barra di azioni rapide in cima alla Dashboard (sopra il briefing Intelligence
   della Fase 7). Un solo punto di partenza per le operazioni più frequenti,
   in stile command-center. Additivo: usa App.navigate/funzioni esistenti + DS.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__cmdBar) return; window.__cmdBar=true;

  function nav(s){ try{ if(window.App&&App.navigate) App.navigate(s); }catch(e){} }
  var ACTIONS=[
    {icon:'⚡', label:'Nuovo preventivo', hint:'Preventivatore', run:function(){ nav('quoter'); }},
    {icon:'👥', label:'Nuovo cliente', hint:'CRM', run:function(){ nav('clients'); }},
    {icon:'📋', label:'Ordini', hint:'Gestione', run:function(){ nav('gestione_ordini'); }},
    {icon:'🛰️', label:'Market Hub', hint:'Fornitori & ricerca', run:function(){ try{ if(window.MarketHub) return MarketHub.open('dir'); }catch(e){} nav('supply_chain'); }},
    {icon:'📈', label:'ROI macchine', hint:'Investimenti', run:function(){ try{ if(window.MachineInvest) return MachineInvest.open(); }catch(e){} nav('equipment'); }},
    {icon:'🧾', label:'Checkpoint', hint:'Backup dati', run:function(){ try{ if(window.AuditLog) return AuditLog.panel(); }catch(e){} nav('backup'); }},
    {icon:'⚙️', label:'Personalizza', hint:'Dati & campi', run:function(){ try{ if(window.DataTools) return DataTools.hub(); }catch(e){} nav('settings'); }}
  ];

  function render(){
    var host=document.getElementById('view-dashboard'); if(!host) return;
    if(host.querySelector('#erp-command-bar')) return;
    var bar=document.createElement('div'); bar.id='erp-command-bar';
    bar.style.cssText='display:flex;flex-wrap:wrap;gap:10px;margin:0 0 16px;';
    ACTIONS.forEach(function(a){
      var c=document.createElement('button');
      c.type='button';
      c.style.cssText='flex:1 1 130px;min-width:120px;display:flex;flex-direction:column;align-items:flex-start;gap:6px;'+
        'padding:14px;border-radius:var(--radius,14px);border:1px solid var(--border,#333);'+
        'background:linear-gradient(150deg, color-mix(in srgb,var(--primary,#fbbf24) 6%, var(--bg-card,#161616)), var(--bg-card,#161616));'+
        'color:var(--text,#eee);cursor:pointer;transition:transform .14s var(--ease-out,ease),box-shadow .16s ease,border-color .16s ease;text-align:left;';
      c.onmouseover=function(){ c.style.transform='translateY(-2px)'; c.style.boxShadow='var(--shadow-md,0 8px 24px rgba(0,0,0,.28))'; c.style.borderColor='color-mix(in srgb,var(--primary,#fbbf24) 45%, transparent)'; };
      c.onmouseout=function(){ c.style.transform=''; c.style.boxShadow=''; c.style.borderColor='var(--border,#333)'; };
      c.onclick=a.run;
      var ic=document.createElement('span'); ic.textContent=a.icon; ic.style.cssText='font-size:20px;line-height:1'; ic.setAttribute('aria-hidden','true');
      var lb=document.createElement('span'); lb.textContent=a.label; lb.style.cssText='font:700 13px inherit;';
      var hn=document.createElement('span'); hn.textContent=a.hint; hn.style.cssText='font-size:11px;color:var(--text-dim,#6b7280);';
      c.appendChild(ic); c.appendChild(lb); c.appendChild(hn);
      c.setAttribute('aria-label', a.label+' — '+a.hint);
      bar.appendChild(c);
    });
    // inserisci come primissimo elemento del contenuto dashboard
    var hdr=host.querySelector('.module-header');
    if(hdr && hdr.nextSibling) hdr.parentNode.insertBefore(bar, hdr.nextSibling);
    else host.insertBefore(bar, host.firstChild);
  }

  function tryRender(){ var v=document.getElementById('view-dashboard');
    if(v && (v.classList.contains('active')||v.offsetParent!==null)) render(); }
  function hook(){
    try{ if(typeof Bus!=='undefined'&&Bus.on){ Bus.on('nav:dashboard', function(){ setTimeout(render,250); });
      Bus.on('nav', function(){ setTimeout(tryRender,250); }); } }catch(e){}
    // observer: renderizza appena la dashboard diventa attiva
    try{ var v=document.getElementById('view-dashboard');
      if(v && window.MutationObserver){ new MutationObserver(function(){ tryRender(); }).observe(v,{attributes:true,attributeFilter:['class','style']}); }
    }catch(e){}
    setTimeout(tryRender, 2800);
    // fallback: qualche ripasso nei primi secondi
    var n=0, iv=setInterval(function(){ tryRender(); if(++n>5) clearInterval(iv); }, 1600);
  }
  if(document.readyState!=='loading') hook(); else document.addEventListener('DOMContentLoaded', hook);
})();
