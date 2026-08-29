
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

  var css=`
  .ingly-tools{ position:relative; display:inline-block; margin:8px 6px; }
  .ingly-tools-trigger{ display:inline-flex; align-items:center; gap:7px; padding:7px 13px; border-radius:9px;
    border:1px solid var(--border,#333); background:var(--bg-card2,#20232e); color:var(--text,#eee);
    cursor:pointer; font:600 13px inherit; transition:background .14s ease,border-color .14s ease,transform .12s ease; }
  .ingly-tools-trigger:hover{ background:var(--primary,#fbbf24); color:#111; border-color:var(--primary,#fbbf24); transform:translateY(-1px); }
  .ingly-tools-trigger .chev{ font-size:10px; opacity:.7; }
  .ingly-tools-menu{ position:absolute; top:calc(100% + 6px); left:0; z-index:1400; min-width:220px;
    background:var(--bg-card,#161616); border:1px solid var(--border,#333); border-radius:12px;
    box-shadow:0 16px 44px rgba(0,0,0,.5); padding:6px; display:none; }
  .ingly-tools.open .ingly-tools-menu{ display:block; animation:itfade .15s ease; }
  @keyframes itfade{ from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:none} }
  .ingly-tools-menu > *{ display:flex !important; align-items:center; gap:9px; width:100%; text-align:left !important;
    margin:2px 0 !important; padding:9px 11px !important; border-radius:8px !important; border:none !important;
    background:none !important; color:var(--text,#eee) !important; cursor:pointer; font:500 13px inherit !important;
    box-shadow:none !important; transform:none !important; min-height:0 !important; }
  .ingly-tools-menu > *:hover{ background:color-mix(in srgb, var(--primary,#fbbf24) 14%, transparent) !important; color:var(--primary,#fbbf24) !important; }
  `;
  var st=document.createElement('style'); st.id='v86-tools-css'; st.textContent=css;
  (document.head||document.documentElement).appendChild(st);

  function slice(n){ return Array.prototype.slice.call(n); }
  function styleItem(b){ b.classList.add('ingly-tool-item'); b.style.cssText=''; return b; }

  function makeDropdown(){
    var d=document.createElement('div'); d.className='ingly-tools';
    var t=document.createElement('button'); t.className='ingly-tools-trigger'; t.type='button';
    t.innerHTML='<span aria-hidden="true">🧰</span><span>Strumenti</span><span class="chev">▾</span>';
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
