
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v71 — NAV TIDY (sidebar ordinata + dedup Preferiti)
   • Le voci messe nei Preferiti vengono CLONATE in #nav-favs-list, ma l'originale
     resta nel suo gruppo → compare due volte. Qui nascondiamo l'originale quando
     è già tra i Preferiti (reversibile: togliendo il preferito ricompare).
   • Rifinitura visiva additiva della sidebar (ritmo, header gruppi, stato attivo).
   Solo display-toggle su nav-item + CSS. Nessuna modifica alla logica Favs.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__navTidy) return; window.__navTidy=true;

  var css=`
  /* ritmo e gerarchia sidebar */
  #sidebar-nav .nav-group{ margin-bottom:2px; }
  #sidebar-nav .nav-group-title{ font-size:10px; letter-spacing:.06em; text-transform:uppercase;
    opacity:.9; padding-top:6px; padding-bottom:4px; }
  #sidebar-nav .nav-item{ border-radius:9px; transition: background .14s ease, color .14s ease, transform .12s var(--ease-out,ease); }
  @media (prefers-reduced-motion: no-preference){
    #sidebar-nav .nav-item:hover{ transform: none; }
  }
  #sidebar-nav .nav-item.active, #sidebar-nav .nav-item[aria-current="page"]{
    background: color-mix(in srgb, var(--primary,#fbbf24) 14%, transparent);
    box-shadow: inset 3px 0 0 var(--primary,#fbbf24); }
  /* Le voci nei Preferiti RESTANO nella loro categoria, con una stella. */
  #sidebar-nav .nav-item[data-fav-dup="1"]{ display:flex !important; }
  #sidebar-nav .nav-group-items .nav-item[data-fav-dup="1"]::after{
    content:"★"; color:var(--primary,#fbbf24); font-size:10px; margin-left:auto; opacity:.85; flex-shrink:0; }
  `;
  var st=document.createElement('style'); st.id='v71-nav-tidy-css'; st.textContent=css;
  (document.head||document.documentElement).appendChild(st);

  function favSections(){
    var out={};
    document.querySelectorAll('#nav-favs-list .nav-item[data-section]').forEach(function(el){
      var s=el.getAttribute('data-section'); if(s) out[s]=1; });
    return out;
  }
  function reconcile(){
    var favs=favSections();
    // reset marcature precedenti
    document.querySelectorAll('#sidebar-nav .nav-item[data-fav-dup="1"]').forEach(function(el){
      if(!favs[el.getAttribute('data-section')]) el.removeAttribute('data-fav-dup'); });
    // nascondi gli originali (fuori da favs/recent) che sono già nei preferiti
    document.querySelectorAll('#sidebar-nav .nav-item[data-section]').forEach(function(el){
      if(el.closest('#nav-favs-list')||el.closest('#nav-recent-list')) return;
      var s=el.getAttribute('data-section');
      if(favs[s]) el.setAttribute('data-fav-dup','1'); else if(el.getAttribute('data-fav-dup')) el.removeAttribute('data-fav-dup');
    });
  }

  function boot(){
    var nav=document.getElementById('sidebar-nav'); if(!nav) return setTimeout(boot,800);
    reconcile();
    // ri-concilia quando i preferiti cambiano (osserva la lista favs)
    try{
      var favList=document.getElementById('nav-favs-list');
      if(favList && window.MutationObserver){
        var mo=new MutationObserver(function(){ clearTimeout(boot._t); boot._t=setTimeout(reconcile,120); });
        mo.observe(favList,{childList:true,subtree:true});
      }
    }catch(e){}
    // ri-concilia su navigazione (nuovi nav-item possono comparire)
    try{ if(window.Bus&&Bus.on) Bus.on('nav',function(){ setTimeout(reconcile,150); }); }catch(e){}
    // safety: ripasso periodico leggero i primi secondi
    var n=0, iv=setInterval(function(){ reconcile(); if(++n>6) clearInterval(iv); }, 1500);
  }
  if(document.readyState!=='loading') setTimeout(boot,1800); else document.addEventListener('DOMContentLoaded',function(){ setTimeout(boot,1800); });
})();
