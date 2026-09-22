
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v86 — Consolidatore Strumenti (meno clutter)
   Raggruppa i pulsanti-strumento aggiunti nelle sezioni (Schede/Catalogo/ROI,
   Market Hub, Consumabili, Personalizza, Audit, Preventivo rapido, Fattura,
   Report BI, ecc.) in UN solo menu "🧰 Strumenti" per sezione (quando ≥2),
   lasciando i singoli. Sposta i pulsanti reali (onclick preservati). Idempotente.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__toolsConsolidator) return; window.__toolsConsolidator=true;

  var SEL='#mcat-open-btn,#mc-open-btn,#mi-open-btn,.dt-hub-btn,#audit-btn,.mh-open-btn,#consum-seed-btn,#qa-open-btn,#fa-open-btn,.bi-open-btn,#oa-kpi-btn,#oa-kpi-btn2,#ca-seg-btn';

  /* La CSS di `.ingly-tools*` non vive più qui: è nel design system
     (`src/design-system/components/overlays.css`), non più iniettata a
     runtime con un `<style>` non stratificato e pieno di `!important` per
     battere lo stile in linea che `styleItem()` cancellava un rigo sopra. */

  function slice(n){ return Array.prototype.slice.call(n); }
  function styleItem(b){ b.classList.add('ingly-tool-item'); b.style.cssText=''; return b; }

  function makeDropdown(){
    var d=document.createElement('div'); d.className='ingly-tools';
    var t=document.createElement('button'); t.className='ingly-tools-trigger'; t.type='button';
    t.innerHTML='<i class="fas fa-toolbox" aria-hidden="true"></i><span>Strumenti</span><i class="fas fa-chevron-down chev" aria-hidden="true"></i>';
    var m=document.createElement('div'); m.className='ingly-tools-menu';
    d.appendChild(t); d.appendChild(m);
    t.addEventListener('click', function(e){ e.stopPropagation(); d.classList.toggle('open'); });
    m.addEventListener('click', function(){ d.classList.remove('open'); });
    document.addEventListener('click', function(ev){ if(!d.contains(ev.target)) d.classList.remove('open'); });
    return d;
  }

  function consolidate(){
    var loose=slice(document.querySelectorAll(SEL)).filter(function(b){ return !b.closest('.ingly-tools-menu'); });
    var groups=new Map();
    loose.forEach(function(b){ var v=b.closest('.section-view'); if(!v) return; if(!groups.has(v)) groups.set(v,[]); groups.get(v).push(b); });
    groups.forEach(function(btns, view){
      var existing=view.querySelector('.ingly-tools');
      if(existing){ var menu=existing.querySelector('.ingly-tools-menu'); btns.forEach(function(b){ menu.appendChild(styleItem(b)); }); return; }
      if(btns.length<2) return; // un solo strumento non è clutter
      var host=btns[0].parentNode; // dove stavano i pulsanti
      var d=makeDropdown();
      host.insertBefore(d, btns[0]);
      var menu=d.querySelector('.ingly-tools-menu');
      btns.forEach(function(b){ menu.appendChild(styleItem(b)); });
    });
  }

  function boot(){
    consolidate();
    try{ if(window.Bus&&Bus.on) Bus.on('nav',function(){ setTimeout(consolidate,400); }); }catch(e){}
    var main=document.querySelector('.content-inner')||document.querySelector('#sidebar-nav')||document.body;
    if(window.MutationObserver){ var mo=new MutationObserver(function(){ clearTimeout(boot._t); boot._t=setTimeout(consolidate,350); });
      mo.observe(document.body,{childList:true,subtree:true}); }
    var n=0, iv=setInterval(function(){ consolidate(); if(++n>10) clearInterval(iv); }, 1500);
  }
  if(document.readyState!=='loading') setTimeout(boot,3200); else document.addEventListener('DOMContentLoaded',function(){ setTimeout(boot,3200); });
})();
