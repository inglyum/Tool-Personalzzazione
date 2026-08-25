
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v89 — Icone precise, niente doppioni
   Molte etichette della sidebar contengono già un'emoji ("⚡ …", "🔮 …") che,
   sommata all'icona SVG (v85), crea un DOPPIONE. Qui rimuoviamo le emoji dal
   TESTO delle etichette (non dai controlli ⭐/👁), lasciando UNA sola icona SVG
   ben definita per voce. Idempotente, stabile, reversibile.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__labelClean) return; window.__labelClean=true;

  // Emoji / simboli decorativi (NON tocca lettere, numeri, €, punteggiatura).
  var EMOJI=/[\u{1F000}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{FE0F}\u{200D}]/gu;

  function inControl(node){
    var el=node.parentElement;
    // NON toccare i controlli reali (stella/occhio SVG); .nav-pin legacy è nascosta,
    // ma la ripuliamo lo stesso per evitare ☆ residui nel testo.
    return !!(el && el.closest('.nav-ctrl,.nav-badge,.nav-svg-ico'));
  }
  function cleanItem(item){
    if(!item) return;
    var walker=document.createTreeWalker(item, NodeFilter.SHOW_TEXT, null);
    var nodes=[], n;
    while((n=walker.nextNode())) nodes.push(n);
    nodes.forEach(function(t){
      if(inControl(t)) return;
      var v=t.textContent;
      var nv=v.replace(EMOJI,'').replace(/\s{2,}/g,' ');   // replace globale: nessun bug di lastIndex
      if(nv!==v && (nv.trim().length>0 || v.trim().length===0)) t.textContent=nv;
    });
  }
  function run(){
    // rimuovi le stelle legacy .nav-pin (nascoste e inutili: lasciavano un ☆ nel testo)
    document.querySelectorAll('#sidebar-nav .nav-pin').forEach(function(el){ el.remove(); });
    document.querySelectorAll('#sidebar-nav .nav-item[data-section]').forEach(cleanItem);
  }

  function boot(){
    var nav=document.getElementById('sidebar-nav'); if(!nav) return setTimeout(boot,600);
    run();
    if(window.MutationObserver){ var mo=new MutationObserver(function(){
      clearTimeout(boot._t); boot._t=setTimeout(run,200);
    }); mo.observe(nav,{childList:true,subtree:true}); }
    try{ if(window.Bus&&Bus.on) Bus.on('nav',function(){ setTimeout(run,220); }); }catch(e){}
    var i=0, iv=setInterval(function(){ run(); if(++i>8) clearInterval(iv); }, 1300);
  }
  if(document.readyState!=='loading') setTimeout(boot,1900); else document.addEventListener('DOMContentLoaded',function(){ setTimeout(boot,1900); });
})();
