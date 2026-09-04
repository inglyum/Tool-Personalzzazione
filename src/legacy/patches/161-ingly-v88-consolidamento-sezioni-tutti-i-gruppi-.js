
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
    /* Ordini esce da qui. I suoi quattro bottoni erano uscite dalla sezione —
       chiamavano App.navigate() e portavano altrove — mentre le viste di
       Ordini (Lista, Kanban, Produzione, Calendario, Timeline, Analytics)
       sono selettori dello stesso dataset, disegnati dalla sezione stessa.
       Due barre di viste nella stessa pagina, di cui una che porta via, sono
       una duplicazione visiva: resta quella vera. */
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

  // Questa patch nascondeva le voci ridondanti dal menu iniettando
  // `display:none !important` e ripuliva i doppioni con un MutationObserver
  // sulla sidebar. Era un rimedio al sintomo: le voci venivano ricreate da
  // altre patch e questa le rinascondeva. La gerarchia ora la definisce
  // src/app-shell/nav-map.js, che le colloca invece di occultarle.
  // Della patch resta ciò che vale: la barra "Viste" dentro le sezioni hub.

  function slice(n){ return Array.prototype.slice.call(n); }

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

  function run(){ GROUPS.forEach(injectBar); }

  function boot(){
    var content=document.getElementById('content-inner')||document.getElementById('content');
    if(!content) return setTimeout(boot,600);
    run();
    // Le sezioni che si ri-renderizzano cancellano la barra "Viste": va
    // reinserita. Si osserva solo l'area contenuti — la sidebar non viene
    // più toccata da questa patch.
    if(window.MutationObserver){
      var mo=new MutationObserver(function(){ clearTimeout(boot._c); boot._c=setTimeout(run,250); });
      mo.observe(content,{childList:true,subtree:true});
    }
    try{ if(window.Bus&&Bus.on){ Bus.on('nav',function(){ setTimeout(run,300); }); } }catch(e){}
  }
  if(document.readyState!=='loading') setTimeout(boot,2200); else document.addEventListener('DOMContentLoaded',function(){ setTimeout(boot,2200); });
})();
