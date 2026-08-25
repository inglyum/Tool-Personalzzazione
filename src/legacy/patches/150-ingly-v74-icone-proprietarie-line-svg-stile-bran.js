
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v74 — ICONE PROPRIETARIE (line SVG, stile brand)
   Set di icone vettoriali coerenti (tratto uniforme, currentColor) — niente
   librerie esterne (design-system). window.InglyIcons.get(name,size) → <svg>.
   Applicate alle superfici PREMIUM (command bar, menu ⋯) sostituendo le emoji
   in modo mirato e reversibile. Non tocca il resto dell'app.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.InglyIcons) return;
  var NS='http://www.w3.org/2000/svg';
  // path data (24×24, stroke). Stile: outline, tratto 1.8, linecap round.
  var P={
    bolt:'M13 2 4 14h7l-1 8 9-12h-7z',
    user:'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1',
    list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    radio:'M12 12m-2 0a2 2 0 104 0 2 2 0 10-4 0M7.8 7.8a6 6 0 000 8.4M16.2 16.2a6 6 0 000-8.4M5 5a9 9 0 000 14M19 19a9 9 0 000-14',
    chart:'M4 20V10M10 20V4M16 20v-6M22 20H2',
    receipt:'M5 3v18l2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1zM8 8h8M8 12h8M8 16h5',
    gear:'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7.7 2 2 0 11-3.8 0 1.6 1.6 0 00-2.7-.7l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00-1.3-2.7 2 2 0 010-3.8 1.6 1.6 0 001.3-2.7l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 002.7-.7 2 2 0 013.8 0 1.6 1.6 0 002.7.7l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 001.3 2.7 2 2 0 010 3.8 1.6 1.6 0 00-1.3 1z',
    grid:'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
    cpu:'M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M6 6h12v12H6zM10 10h4v4h-4z',
    box:'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
    palette:'M12 3a9 9 0 100 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 004-4c0-4-3.6-7-9-7zM7.5 12a1 1 0 100-2 1 1 0 000 2zM12 8a1 1 0 100-2 1 1 0 000 2zM16.5 12a1 1 0 100-2 1 1 0 000 2z',
    search:'M11 11m-7 0a7 7 0 1014 0 7 7 0 10-14 0M21 21l-4.3-4.3',
    plus:'M12 5v14M5 12h14',
    pin:'M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
    hash:'M4 9h16M4 15h16M10 3 8 21M16 3l-2 18',
    globe:'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9z',
    dots:'M5 12h.01M12 12h.01M19 12h.01'
  };
  function make(name,size){ size=size||18; var svg=document.createElementNS(NS,'svg');
    svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('width',size); svg.setAttribute('height',size);
    svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor');
    svg.setAttribute('stroke-width','1.8'); svg.setAttribute('stroke-linecap','round'); svg.setAttribute('stroke-linejoin','round');
    svg.setAttribute('aria-hidden','true'); svg.style.flexShrink='0';
    var d=P[name]||P.dots; var path=document.createElementNS(NS,'path'); path.setAttribute('d',d); svg.appendChild(path);
    return svg;
  }
  window.InglyIcons={ get:make, has:function(n){ return !!P[n]; }, names:Object.keys(P) };

  // Mappa emoji → icona proprietaria (per le superfici premium)
  var MAP={ '⚡':'bolt','👥':'user','📋':'list','🛰️':'radio','📈':'chart','🧾':'receipt',
    '⚙️':'gear','📊':'grid','🤖':'cpu','🏭':'box','📦':'box','🎨':'palette','🔎':'search',
    '➕':'plus','📍':'pin','#⃣':'hash','🌐':'globe','⋯':'dots' };

  function swapIn(container, iconSize){
    if(!container) return;
    // sostituisci gli span che contengono SOLO un'emoji mappata
    container.querySelectorAll('span,i').forEach(function(el){
      if(el.dataset.iconized) return;
      var t=(el.textContent||'').trim();
      if(MAP[t]){ el.textContent=''; el.appendChild(make(MAP[t], iconSize||18)); el.dataset.iconized='1'; el.style.display='inline-flex'; }
    });
  }

  function apply(){
    swapIn(document.getElementById('erp-command-bar'), 20);
    swapIn(document.getElementById('tb-more-menu'), 16);
  }
  // applica quando gli elementi compaiono
  function boot(){ apply();
    try{ if(window.Bus&&Bus.on) Bus.on('nav:dashboard', function(){ setTimeout(apply,600); }); }catch(e){}
    var n=0, iv=setInterval(function(){ apply(); if(++n>8) clearInterval(iv); }, 1500);
  }
  if(document.readyState!=='loading') setTimeout(boot,2600); else document.addEventListener('DOMContentLoaded',function(){ setTimeout(boot,2600); });
})();
