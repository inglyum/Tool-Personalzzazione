
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v85 — Icone SVG proprietarie su TUTTA la sidebar (uniformità grafica)
   Ogni voce riceve un'icona SVG coerente (tratto uniforme, currentColor) al posto
   di emoji/FontAwesome, con matcher per parola chiave + fallback generico →
   copertura 100%, nessun mix. Idempotente, stabile (observer), reversibile.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__sectionIcons) return; window.__sectionIcons=true;
  var NS='http://www.w3.org/2000/svg';

  var css=`
  #sidebar-nav .nav-item > .nav-svg-ico{ width:17px;height:17px;flex:0 0 17px;display:inline-flex;
    align-items:center;justify-content:center;color:inherit;opacity:.92; }
  #sidebar-nav .nav-item > .nav-svg-ico svg{ width:17px;height:17px;display:block; }
  `;
  var st=document.createElement('style'); st.id='v85-section-icons-css'; st.textContent=css;
  (document.head||document.documentElement).appendChild(st);

  var P={
    dashboard:'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
    user:'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1',
    bolt:'M13 2 4 14h7l-1 8 9-12h-7z',
    list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    box:'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
    tag:'M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0l-7-7A2 2 0 013 12.2V5a2 2 0 012-2h7.2a2 2 0 011.4.6l7 7a2 2 0 010 2.8zM7.5 7.5h.01',
    euro:'M18 7a6 6 0 00-9 8M4 10h8M4 14h7M18 17a6 6 0 01-6-2',
    layers:'M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5',
    cpu:'M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M6 6h12v12H6zM10 10h4v4h-4z',
    truck:'M3 6h11v9H3zM14 9h4l3 3v3h-7zM7 18a2 2 0 100-4 2 2 0 000 4zM18 18a2 2 0 100-4 2 2 0 000 4z',
    factory:'M3 21V10l5 3V10l5 3V7l5 3v11zM7 21v-4M12 21v-4M17 21v-4',
    wallet:'M3 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2zM16 12h4M16 12a1.5 1.5 0 000 3h4v-3z',
    gear:'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8 2 2 0 11-2.8 2.8 1.6 1.6 0 00-2.7.7 2 2 0 11-3.8 0 1.6 1.6 0 00-2.7-.7 2 2 0 11-2.8-2.8 1.6 1.6 0 00-1.3-2.7 2 2 0 010-3.8 1.6 1.6 0 001.3-2.7 2 2 0 112.8-2.8 1.6 1.6 0 002.7-.7 2 2 0 013.8 0 1.6 1.6 0 002.7.7 2 2 0 112.8 2.8 1.6 1.6 0 001.3 2.7 2 2 0 010 3.8 1.6 1.6 0 00-1.3 1z',
    ai:'M12 3a4 4 0 014 4v1a3 3 0 013 3 3 3 0 01-1 5v1a4 4 0 01-8 0 4 4 0 01-1-9V7a4 4 0 012-4zM12 3v18',
    chart:'M4 20V10M10 20V4M16 20v-6M22 20H2',
    hash:'M4 9h16M4 15h16M10 3 8 21M16 3l-2 18',
    globe:'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9z',
    printer:'M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-3a2 2 0 012-2h16a2 2 0 012 2v3a2 2 0 01-2 2h-2M6 14h12v7H6z',
    palette:'M12 3a9 9 0 100 18c1.1 0 2-.9 2-2 0-1-.8-1.8-1.8-1.8H17a4 4 0 004-4c0-4-3.6-7-9-7zM7.5 12a1 1 0 100-2 1 1 0 000 2zM12 8a1 1 0 100-2 1 1 0 000 2zM16.5 12a1 1 0 100-2 1 1 0 000 2z',
    calendar:'M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z',
    bell:'M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.5 21a2 2 0 003 0',
    cloud:'M7 18a4 4 0 01-1-8 5 5 0 019-3 4 4 0 011 8z',
    bulb:'M9 18h6M10 21h4M12 3a6 6 0 00-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 00-4-10z',
    search:'M11 11m-7 0a7 7 0 1014 0 7 7 0 10-14 0M21 21l-4.3-4.3',
    star:'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
    doc:'M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h6',
    target:'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01',
    rocket:'M5 15c-1 1-1 4-1 4s3 0 4-1M12 3c3 1 6 4 6 9 0 2-1 4-2 5l-4 1-1-4c1-1 3-2 5-2M9 15l-3-3',
    flask:'M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3M8 15h8',
    dot:'M12 12m-2.5 0a2.5 2.5 0 105 0 2.5 2.5 0 10-5 0'
  };
  function makeSvg(name){ var s=document.createElementNS(NS,'svg'); s.setAttribute('viewBox','0 0 24 24');
    s.setAttribute('fill','none'); s.setAttribute('stroke','currentColor'); s.setAttribute('stroke-width','1.7');
    s.setAttribute('stroke-linecap','round'); s.setAttribute('stroke-linejoin','round'); s.setAttribute('aria-hidden','true');
    var p=document.createElementNS(NS,'path'); p.setAttribute('d', P[name]||P.dot); s.appendChild(p); return s; }

  // keyword → icona (ordine = priorità)
  var MAP=[
    [/dashboard|home|panoramica|riepilog/,'dashboard'],
    [/client|crm|contatt|lead/,'user'],
    [/preventiv|quot|smart quoter|calc/,'bolt'],
    [/ordin|workflow|pipeline|kanban/,'list'],
    [/prodott|item|catalog|articol/,'box'],
    [/listino|prezz|b2b/,'tag'],
    [/vendit|fattur|incass|cassa|ricav|revenue|profit|finan|budget/,'euro'],
    [/material|magazzin|stock|scort/,'layers'],
    [/macchin|attrezzatur|equipment|laser|stampante|device/,'cpu'],
    [/spediz|corrier|shipping|logist/,'truck'],
    [/forni|supplier|acquist|approvvig/,'factory'],
    [/portafogli|wallet|pagament|banca/,'wallet'],
    [/impostazion|setting|config|gestione sezion/,'gear'],
    [/\bai\b|intelligen|coach|decision|assistant|command center|briefing|morning/,'ai'],
    [/kpi|analytic|report|statistic|metric|roi/,'chart'],
    [/social|hashtag|instagram|tiktok/,'hash'],
    [/web|sito|vetrina|online|seo/,'globe'],
    [/stampa|produzione|print|3d/,'printer'],
    [/design|brand|grafic|artwork|color/,'palette'],
    [/calendar|agenda|scadenz|event/,'calendar'],
    [/notif|avvis|alert/,'bell'],
    [/backup|cloud|sync|drive|salvatagg/,'cloud'],
    [/idee|ispiraz|idea|brainstorm/,'bulb'],
    [/cerca|search|ricerca|market/,'search'],
    [/preferit|star/,'star'],
    [/document|legal|contratt|pdf/,'doc'],
    [/obiettiv|goal|target|crescita/,'target'],
    [/lancio|campagna|marketing|hunting/,'rocket'],
    [/lab|test|esperiment|chimic/,'flask']
  ];
  function iconFor(label){ var s=(label||'').toLowerCase();
    for(var i=0;i<MAP.length;i++){ if(MAP[i][0].test(s)) return MAP[i][1]; } return 'dot'; }

  function labelOf(el){
    var c=el.cloneNode(true);
    c.querySelectorAll('.nav-ctrl,.nav-badge,.nav-svg-ico,i,img,svg').forEach(function(x){ x.remove(); });
    return (c.textContent||'').trim();
  }

  function apply(){
    document.querySelectorAll('#sidebar-nav .nav-item[data-section]').forEach(function(el){
      if(el.__svgico) return;
      var lead=el.querySelector(':scope > i, :scope > img, :scope > .nav-icon');
      var name=iconFor(labelOf(el));
      var wrap=document.createElement('span'); wrap.className='nav-svg-ico'; wrap.appendChild(makeSvg(name));
      if(lead){ el.replaceChild(wrap, lead); }
      else {
        // se il primo nodo è un'emoji testuale, sostituiscila
        var first=el.firstChild;
        if(first && first.nodeType===3 && /[\u{1F000}-\u{1FAFF}☀-➿]/u.test(first.textContent)){
          first.textContent=first.textContent.replace(/^\s*[\u{1F000}-\u{1FAFF}☀-➿️]+\s*/u,'');
        }
        el.insertBefore(wrap, el.firstChild);
      }
      el.__svgico=true;
    });
  }

  function boot(){
    var nav=document.getElementById('sidebar-nav'); if(!nav) return setTimeout(boot,600);
    apply();
    if(window.MutationObserver){ var mo=new MutationObserver(function(){ clearTimeout(boot._t); boot._t=setTimeout(apply,200); });
      mo.observe(nav,{childList:true,subtree:true}); }
    try{ if(window.Bus&&Bus.on) Bus.on('nav',function(){ setTimeout(apply,200); }); }catch(e){}
    setTimeout(apply,1500); setTimeout(apply,3000);
  }
  if(document.readyState!=='loading') setTimeout(boot,1600); else document.addEventListener('DOMContentLoaded',function(){ setTimeout(boot,1600); });
})();
