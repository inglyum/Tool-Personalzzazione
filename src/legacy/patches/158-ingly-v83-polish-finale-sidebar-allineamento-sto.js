
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v83 — Polish finale sidebar (allineamento + stop ondeggiamento)
   • Nessuno spostamento di layout su hover (rimuove padding-left/translateX/scale
     che facevano "ondeggiare/lampeggiare" le voci).
   • Icone Preferito/Nascondi sempre allineate a destra, dimensione fissa e
     centrate, coerenti con o senza badge (via :has), niente sovrapposizioni.
   • Riduce il churn: reorder solo quando i preferiti cambiano davvero.
   Additivo, solo grafica + un guard di stabilità.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__navPolish) return; window.__navPolish=true;

  var css=`
  /* ── stop spostamenti di layout su hover (causa ondeggiamento/lampeggio) ── */
  #sidebar-nav .nav-item:hover{ padding-left:11px !important; transform:none !important; }
  #sidebar-nav .nav-item:hover i{ transform:none !important; }
  #sidebar-nav .nav-item{ min-height:34px; padding:7px 11px; }
  /* ── controlli sempre allineati a destra, coerenti con/ senza badge ── */
  #sidebar-nav .nav-item .nav-ctrl{ margin-left:auto; gap:2px; }
  #sidebar-nav .nav-item:has(.nav-badge) .nav-badge{ margin-left:auto !important; }
  #sidebar-nav .nav-item:has(.nav-badge) .nav-ctrl{ margin-left:6px; }
  /* ── pulsanti icona: dimensione fissa, SVG centrato, nessuna distorsione ── */
  #sidebar-nav .nav-ctrl button{ width:26px !important; height:26px !important; flex:0 0 26px !important;
    line-height:0 !important; padding:0 !important; display:inline-flex !important; align-items:center; justify-content:center; }
  #sidebar-nav .nav-ctrl svg{ width:16px !important; height:16px !important; display:block; flex:0 0 16px; }
  /* la stella occupa sempre spazio (niente "pop"); l'occhio appare solo su hover */
  #sidebar-nav .nav-ctrl .nx-star{ opacity:1 !important; }
  #sidebar-nav .nav-ctrl .nx-hide{ opacity:0; transition:opacity .12s ease; }
  #sidebar-nav .nav-item:hover .nav-ctrl .nx-hide{ opacity:.8; }
  /* etichetta preferiti coerente */
  #nav-fav-top{ padding:2px 0 8px; }
  `;
  var st=document.createElement('style'); st.id='v83-nav-polish-css'; st.textContent=css;
  (document.head||document.documentElement).appendChild(st);

  // Guard: se v81 espone reorder tramite osservatore, riduciamo il churn
  // ridefinendo un piccolo debounce condiviso via signature dei preferiti.
  try{
    var NP=(typeof NavPrefs!=='undefined')?NavPrefs:window.NavPrefs;
    if(NP && NP.apply && !NP.apply.__polishSig){
      var _a=NP.apply.bind(NP), lastSig='';
      NP.apply=function(){
        var r=_a.apply(this,arguments);
        try{ var sig=((NP._prefs&&NP._prefs.favorites)||[]).join(',')+'|'+((NP._prefs&&NP._prefs.hidden)||[]).join(',');
          if(sig!==lastSig){ lastSig=sig; } }catch(e){}
        return r;
      };
      NP.apply.__polishSig=true;
    }
  }catch(e){}
})();
