
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v81 — SIDEBAR unificata (fix flicker + icone doppie, preferiti in cima)
   Sostituisce i layer v78/v79. Un solo controllore:
   • Preferiti (voci reali) in cima, sopra le non-preferite, senza doppioni.
   • Icone Preferito/Nascondi in SVG coerenti e FUNZIONALI (click preservati).
   • NIENTE flicker: reorder idempotente, observer in pausa durante le scritture,
     animazioni opacity/max-height di NavPrefs neutralizzate.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__navUnified) return; window.__navUnified=true;
  var NS='http://www.w3.org/2000/svg';

  var css=`
  .nav-pin{ display:none !important; }
  #nav-favorites-bar{ display:none !important; }
  #nav-favs-group{ display:none !important; }
  #sidebar-nav .nav-item[data-fav-dup="1"]{ display:flex !important; }
  /* stop flicker/ondeggiamento: nessuna animazione opacity/max-height sulle voci */
  #sidebar-nav .nav-item{ max-height:none !important; opacity:1 !important; transition:background .14s ease,color .14s ease !important; }
  #nav-fav-top{ padding:2px 0 6px; margin-bottom:4px; border-bottom:1px solid var(--border,#333); }
  #nav-fav-top-lbl{ display:flex; align-items:center; gap:6px; padding:4px 8px 6px; }
  .nav-item .nav-ctrl{ display:inline-flex !important; align-items:center; gap:4px; margin-left:auto; flex-shrink:0; }
  .nav-item .nav-ctrl button{ opacity:1 !important; width:24px; height:24px; min-width:24px; display:inline-flex;
    align-items:center; justify-content:center; padding:0 !important; border-radius:7px !important; background:none;
    border:none; cursor:pointer; color:var(--text-dim,#6b7280); transition:background .12s ease,color .12s ease,transform .12s ease; }
  .nav-item .nav-ctrl button:hover{ transform:scale(1.12); }
  .nav-item .nav-ctrl button:focus-visible{ outline:2px solid var(--primary,#fbbf24); outline-offset:1px; }
  .nav-ctrl .nx-star.on{ color:#fbbf24; }
  .nav-ctrl .nx-star:hover{ color:#fbbf24; background:color-mix(in srgb,#fbbf24 15%,transparent); }
  .nav-ctrl .nx-hide{ opacity:0 !important; transition:opacity .12s ease, background .12s ease, color .12s ease; }
  .nav-item:hover .nav-ctrl .nx-hide{ opacity:.75 !important; }
  .nav-ctrl .nx-hide:hover{ opacity:1 !important; color:#ef4444; background:color-mix(in srgb,#ef4444 15%,transparent); }
  @media (prefers-reduced-motion: reduce){ .nav-item .nav-ctrl button{ transition:none; } }
  `;
  var st=document.createElement('style'); st.id='v81-nav-css'; st.textContent=css;
  (document.head||document.documentElement).appendChild(st);

  function $(id){ return document.getElementById(id); }
  function slice(n){ return Array.prototype.slice.call(n); }
  function esc(s){ return String(s).replace(/["\\\]]/g,'\\$&'); }
  function NP(){ try{ if(typeof NavPrefs!=='undefined') return NavPrefs; }catch(e){} return window.NavPrefs||null; }
  function favList(){ try{ var n=NP(); return (n&&n._prefs&&n._prefs.favorites)||[]; }catch(e){ return []; } }
  function isFav(sec){ return favList().indexOf(sec)>=0; }

  function svg(paths, fill){
    var s=document.createElementNS(NS,'svg'); s.setAttribute('viewBox','0 0 24 24');
    s.setAttribute('width','15'); s.setAttribute('height','15'); s.setAttribute('fill', fill||'none');
    s.setAttribute('stroke','currentColor'); s.setAttribute('stroke-width','1.8');
    s.setAttribute('stroke-linecap','round'); s.setAttribute('stroke-linejoin','round'); s.setAttribute('aria-hidden','true');
    (Array.isArray(paths)?paths:[paths]).forEach(function(d){ var p=document.createElementNS(NS,'path'); p.setAttribute('d',d); s.appendChild(p); });
    return s;
  }
  var STAR='M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z';
  var EYEOFF=['M9.9 5.1A9.6 9.6 0 0112 5c5 0 9 4 10 7-.4 1.2-1.3 2.6-2.6 3.8M6.3 6.3C3.9 7.7 2.4 9.9 2 12c1 3 5 7 10 7 1.9 0 3.6-.5 5-1.3','M3 3l18 18','M9.9 9.9a3 3 0 004.2 4.2'];

  // ── Icone SVG coerenti (idempotenti) ─────────────────────────────────────
  function restyleControls(){
    slice(document.querySelectorAll('#sidebar-nav .nav-item[data-section] .nav-ctrl')).forEach(function(ctrl){
      var item=ctrl.closest('.nav-item'); if(!item) return;
      var sec=item.getAttribute('data-section');
      var btns=ctrl.querySelectorAll('button'); if(btns.length<2) return;
      var star=btns[0], hide=btns[1], on=isFav(sec);
      if(!star.classList.contains('nx-star') || star.dataset.on!==String(on)){
        star.className='nx-star'+(on?' on':''); star.innerHTML=''; star.appendChild(svg(STAR, on?'#fbbf24':'none'));
        star.dataset.on=String(on); star.title=on?'Rimuovi dai preferiti':'Aggiungi ai preferiti';
        star.setAttribute('aria-label', star.title);
      }
      if(!hide.classList.contains('nx-hide')){
        hide.className='nx-hide'; hide.innerHTML=''; hide.appendChild(svg(EYEOFF,'none'));
        hide.title='Nascondi dal menu'; hide.setAttribute('aria-label','Nascondi dal menu');
      }
    });
  }

  // ── Preferiti in cima (idempotente, senza flicker) ───────────────────────
  var mo=null, nav=null;
  function paused(fn){ try{ if(mo&&nav) mo.disconnect(); fn(); } finally { if(mo&&nav) mo.observe(nav,{childList:true,subtree:true}); } }

  function ensureTop(){
    var top=$('nav-fav-top');
    if(!top){ top=document.createElement('div'); top.id='nav-fav-top';
      var lbl=document.createElement('div'); lbl.id='nav-fav-top-lbl'; lbl.className='nav-group-title';
      lbl.innerHTML='<span style="color:var(--primary,#fbbf24);font-weight:800;font-size:10px;letter-spacing:.06em;text-transform:uppercase">⭐ Preferiti</span>';
      top.appendChild(lbl); nav.insertBefore(top, nav.firstChild);
    } else if(nav.firstElementChild!==top){ nav.insertBefore(top, nav.firstChild); }
    return top;
  }
  function findReal(sec){
    var all=document.querySelectorAll('#sidebar-nav .nav-item[data-section="'+esc(sec)+'"]');
    for(var i=0;i<all.length;i++){ if(all[i].closest('#nav-favs-list')) continue; return all[i]; }
    return null;
  }
  function pin(el, top){ if(el.parentNode===top) return;
    if(!el.__ph){ var ph=document.createComment('fav'); el.parentNode.insertBefore(ph, el); el.__ph=ph; }
    top.appendChild(el);
  }
  function restore(el){ var ph=el.__ph; if(ph&&ph.parentNode){ ph.parentNode.insertBefore(el, ph); ph.parentNode.removeChild(ph); } el.__ph=null; }

  function reorder(){
    if(!nav) nav=$('sidebar-nav'); if(!nav) return;
    var favs=favList();
    paused(function(){
      var top=ensureTop();
      // 1. togli dalla cima ciò che non è più preferito
      slice(top.querySelectorAll('.nav-item[data-section]')).forEach(function(el){
        if(favs.indexOf(el.getAttribute('data-section'))<0) restore(el);
      });
      // 2. porta in cima i preferiti mancanti
      favs.forEach(function(sec){ var el=findReal(sec); if(el && el.parentNode!==top) pin(el, top); });
      // 3. riordina SOLO se l'ordine è diverso (idempotente → niente flicker)
      var cur=slice(top.querySelectorAll('.nav-item[data-section]')).map(function(e){ return e.getAttribute('data-section'); });
      var desired=favs.filter(function(s){ return top.querySelector('.nav-item[data-section="'+esc(s)+'"]'); });
      if(cur.join(',')!==desired.join(',')){
        desired.forEach(function(sec){ var el=top.querySelector('.nav-item[data-section="'+esc(sec)+'"]'); if(el) top.appendChild(el); });
      }
      var lbl=$('nav-fav-top-lbl'); if(lbl) lbl.style.display=favs.length?'flex':'none';
    });
    restyleControls();
  }

  function boot(){
    nav=$('sidebar-nav'); if(!nav){ return setTimeout(boot,600); }
    // esegui dopo NavPrefs.apply
    try{ var n=NP(); if(n&&n.apply&&!n.apply.__uniWrap){ var _a=n.apply.bind(n);
      n.apply=function(){ var r=_a.apply(this,arguments); setTimeout(reorder,50); return r; }; n.apply.__uniWrap=true; } }catch(e){}
    // observer con auto-pausa durante le nostre scritture
    if(window.MutationObserver){ mo=new MutationObserver(function(){ clearTimeout(boot._t); boot._t=setTimeout(reorder,180); });
      mo.observe(nav,{childList:true,subtree:true}); }
    reorder();
    // pochi ripassi iniziali (poi solo observer/apply → nessun loop)
    setTimeout(reorder,800); setTimeout(reorder,2000);
  }
  if(document.readyState!=='loading') setTimeout(boot,1500); else document.addEventListener('DOMContentLoaded',function(){ setTimeout(boot,1500); });
})();
