
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
  /* ── Le tre righe che nascondevano i Preferiti ──────────────────────────
     Qui c'erano tre regole display:none !important — su .nav-pin, su
     #nav-favorites-bar e su #nav-favs-group.

     Le prime due sono corrette e restano. La stella .nav-pin è quella vecchia
     di Favs: quella buona la disegna NavPrefs.renderSectionActions, e due
     stelle per voce su 98 voci erano il difetto che la v81 stava chiudendo.
     #nav-favorites-bar e' la vecchia barra orizzontale di pastiglie, ritirata
     perche' era la seconda rappresentazione dello stesso elenco.

     La terza era l'errore: #nav-favs-group e' la CATEGORIA stella PREFERITI,
     quella che l'utente deve vedere. La v81 la nascondeva per sostituirla con
     #nav-fav-top, che invece di disegnare scorciatoie SPOSTAVA FISICAMENTE le
     voci vere in cima. Due conseguenze misurate: la sezione spariva dalla sua
     categoria d'origine, e una sezione insieme preferita e nascosta veniva
     spostata in cima e poi nascosta da NavPrefs.apply() — cioe' spariva del
     tutto, proprio nel caso in cui il preferito serve di piu'.

     Adesso la categoria e' una sola e la disegna Favs.render(). Qui resta
     quello che la v81 faceva bene: le icone SVG coerenti e la fine del
     tremolio. */
  .nav-pin{ display:none !important; }
  #nav-favs-group .nav-pin{ display:inline !important; }
  /* stop flicker/ondeggiamento: nessuna animazione opacity/max-height sulle voci */
  #sidebar-nav .nav-item{ max-height:none !important; opacity:1 !important; transition:background .14s ease,color .14s ease !important; }
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

  /* ── Il riordino che spostava le voci: ritirato ──────────────────────────
     `ensureTop()` creava `#nav-fav-top` e `pin()` ci **spostava dentro il nodo
     vero** della voce, lasciando un commento come segnaposto per rimetterlo a
     posto. Funzionava, ed era la cosa sbagliata: la sezione spariva dalla sua
     categoria, e un preferito anche nascosto veniva spostato in cima e poi
     nascosto — cioè perso.

     Un preferito è una **scorciatoia**, non un trasloco. Le scorciatoie le
     disegna `Favs.render()` dentro `#nav-favs-group`, dalla stessa sorgente
     (`NavPrefs._prefs.favorites`), e la voce originale non si muove.

     Qui resta solo il ripasso delle icone, che è quello che questo layer sa
     fare e nessun altro fa. */
  function reorder(){
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
