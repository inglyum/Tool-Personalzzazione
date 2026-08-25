
/* ── Icone premium: rimuove le emoji decorative dalle voci di menu che hanno
   già un'icona FontAwesome → una sola icona pulita per voce (stile app). ── */
(function(){
  "use strict";
  if(window.__premiumIcons) return; window.__premiumIcons=true;
  var EMO=/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
  function clean(root){
    (root||document).querySelectorAll('.nav-item[data-section]').forEach(function(el){
      if(!el.querySelector('i,svg,img')) return; // solo se ha già un'icona (FA o SVG swappata da InglyIcons)
      el.childNodes.forEach(function(n){
        if(n.nodeType===3){
          var v=n.nodeValue, nv=v.replace(EMO,'').replace(/[ \t]{2,}/g,' ').replace(/[ \t]+$/,'');
          if(nv!==v) n.nodeValue=nv;
        }
      });
    });
  }
  function run(){ try{ clean(document); }catch(e){} }
  if(document.readyState!=='loading') setTimeout(run,1400);
  else document.addEventListener('DOMContentLoaded',function(){ setTimeout(run,1400); });
  setTimeout(function(){
    var nav=document.getElementById('sidebar-nav'); if(!nav) return;
    var mo=new MutationObserver(function(){ clearTimeout(window.__piT); window.__piT=setTimeout(run,300); });
    mo.observe(nav,{childList:true,subtree:true});
  },1600);
})();
