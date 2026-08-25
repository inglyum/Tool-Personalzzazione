
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v88 — Consolidamento sezioni (tutti i gruppi ridondanti)
   Per ogni gruppo: UNA sola voce nel menu (hub) + barra "Viste" che combina le
   funzioni delle sezioni ridondanti (restano navigabili, un solo ingresso).
   Le voci ridondanti sono rimosse dal menu in modo STABILE (CSS, niente flicker).
   Sostituisce v87 (che copriva solo Ordini). Fix anche i doppioni con stesso id.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__sectionConsolidation) return; window.__sectionConsolidation=true;

  var GROUPS=[
    { hub:'gestione_ordini', views:[
      {sec:'kanban',label:'🗂️ Kanban'},{sec:'workflow_dashboard',label:'⚡ Panoramica'},
      {sec:'order_tracker',label:'📋 Tracker'},{sec:'payment_schedule',label:'📅 Scadenzario'} ],
      remove:['workflow_dashboard','order_tracker','kanban'] },
    { hub:'suppliers', views:[ {sec:'supplierintel',label:'🚚 Supplier Intelligence'} ],
      remove:['supplier_intel','supplierintel'] },
    { hub:'clv', views:[ {sec:'clientintel',label:'🧠 Client Intelligence'},{sec:'ai-clv',label:'👥 CLV & Segmentazione'} ],
      remove:['ai-clv','clientintel'] },
    { hub:'reports', views:[ {sec:'weeklyreport',label:'📰 Settimanale'},{sec:'pdfmonth',label:'📄 PDF Mese'},{sec:'monthly_report',label:'📊 Mensile'} ],
      remove:['weeklyreport','pdfmonth','monthly_report'] },
    { hub:'competitors', views:[ {sec:'competitormon',label:'🎯 Competitor Monitor'} ],
      remove:['competitormon'] },
    { hub:'items', views:[ {sec:'magazzino',label:'🏭 Magazzino'} ],
      remove:['magazzino'] }
  ];

  // ── rimozione STABILE dal menu (CSS vince anche sulle voci ricreate) ──
  var allRemove={};
  GROUPS.forEach(function(g){ g.remove.forEach(function(s){ allRemove[s]=1; }); });
  var sel=Object.keys(allRemove).map(function(s){ return '#sidebar-nav .nav-item[data-section="'+s+'"]'; }).join(',');
  var st=document.createElement('style'); st.id='v88-consolidation-css';
  st.textContent=sel+'{ display:none !important; }';
  (document.head||document.documentElement).appendChild(st);

  function slice(n){ return Array.prototype.slice.call(n); }

  function dedupeNav(){
    var nav=document.getElementById('sidebar-nav'); if(!nav) return;
    var seen={};
    slice(nav.querySelectorAll('.nav-item[data-section]')).forEach(function(el){
      if(el.closest('#nav-fav-top')) return;
      var s=el.getAttribute('data-section');
      if(seen[s]) el.remove(); else seen[s]=1;
    });
  }

  function injectBar(g){
    var view=document.getElementById('view-'+g.hub); if(!view) return;
    var id='vc-bar-'+g.hub;
    if(view.querySelector('#'+id)) return;
    var bar=document.createElement('div'); bar.id=id;
    bar.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 4px;';
    var lbl=document.createElement('span'); lbl.textContent='Viste:'; lbl.style.cssText='font-size:12px;color:var(--text-muted,#9ca3af);font-weight:600;margin-right:2px';
    bar.appendChild(lbl);
    g.views.forEach(function(v){
      var b=document.createElement('button'); b.type='button'; b.className='ds-btn ds-btn--sm';
      b.style.cssText='padding:6px 12px;border-radius:8px;border:1px solid var(--border,#333);background:var(--bg-card2,#20232e);color:var(--text,#eee);cursor:pointer;font:600 12px inherit;transition:.14s';
      b.textContent=v.label;
      b.onmouseover=function(){ b.style.background='var(--primary,#fbbf24)'; b.style.color='#111'; };
      b.onmouseout=function(){ b.style.background='var(--bg-card2,#20232e)'; b.style.color='var(--text,#eee)'; };
      b.onclick=function(){ try{ if(window.App&&App.navigate) App.navigate(v.sec); }catch(e){} };
      bar.appendChild(b);
    });
    var hdr=view.querySelector('.module-header');
    if(hdr && hdr.nextSibling) hdr.parentNode.insertBefore(bar, hdr.nextSibling);
    else view.insertBefore(bar, view.firstChild);
  }

  function run(){ dedupeNav(); GROUPS.forEach(injectBar); }

  function boot(){
    var nav=document.getElementById('sidebar-nav'); if(!nav) return setTimeout(boot,600);
    run();
    if(window.MutationObserver){
      var mo=new MutationObserver(function(){ clearTimeout(boot._t); boot._t=setTimeout(run,200); });
      mo.observe(nav,{childList:true,subtree:true});
      // osserva anche l'area contenuti: le sezioni che ri-renderizzano cancellano la barra Viste → re-inject
      var content=document.getElementById('content-inner')||document.getElementById('content');
      if(content){ var mo2=new MutationObserver(function(){ clearTimeout(boot._c); boot._c=setTimeout(function(){ GROUPS.forEach(injectBar); },250); });
        mo2.observe(content,{childList:true,subtree:true}); }
    }
    try{ if(window.Bus&&Bus.on){ Bus.on('nav',function(){ setTimeout(run,300); }); } }catch(e){}
    var n=0, iv=setInterval(function(){ run(); if(++n>8) clearInterval(iv); }, 1400);
  }
  if(document.readyState!=='loading') setTimeout(boot,2200); else document.addEventListener('DOMContentLoaded',function(){ setTimeout(boot,2200); });
})();
