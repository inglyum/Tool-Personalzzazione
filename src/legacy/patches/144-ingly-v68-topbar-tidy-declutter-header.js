
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v68 — TOPBAR TIDY (declutter header)
   Il #topbar è flex senza wrap: 16+ bottoni-icona si accavallano. La sidebar
   ha già tutta la navigazione, quindi le icone secondarie del topbar sono
   ridondanti. Le raccogliamo in UN solo menu "⋯ App" e togliamo la ricerca
   duplicata. Additivo: sposta i bottoni esistenti (onclick preservati),
   non li ricrea. Reversibile, offline, CSP-safe.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__topbarTidy) return; window.__topbarTidy=true;

  // stili del menu overflow + spaziatura pulita
  var css=`
  #topbar{ gap:6px !important; }
  #tb-more-wrap{ position:relative; }
  #tb-more-btn{ background:var(--bg-card2,#20232e); border:1px solid var(--border2,#333); color:var(--text,#eee);
    cursor:pointer; padding:6px 10px; border-radius:9px; font-size:14px; display:flex; align-items:center; gap:6px; transition:.15s; }
  #tb-more-btn:hover{ background:var(--primary,#fbbf24); color:#111; }
  #tb-more-menu{ position:absolute; top:calc(100% + 8px); right:0; min-width:210px; z-index:1200;
    background:var(--bg-card,#161616); border:1px solid var(--border,#333); border-radius:12px;
    box-shadow:0 16px 48px rgba(0,0,0,.5); padding:6px; display:none; }
  #tb-more-menu.open{ display:block; animation:tbfade .16s ease; }
  @keyframes tbfade{ from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
  .tb-more-item{ display:flex; align-items:center; gap:10px; width:100%; text-align:left;
    padding:9px 11px; border:none; background:none; color:var(--text,#eee); cursor:pointer;
    border-radius:8px; font-size:13px; transition:.12s; }
  .tb-more-item:hover{ background:color-mix(in srgb, var(--primary,#fbbf24) 14%, transparent); color:var(--primary,#fbbf24); }
  .tb-more-item i{ width:18px; text-align:center; opacity:.85; }
  #topbar button.topbar-btn.tb-collapsed{ display:none !important; }
  `;
  var st=document.createElement('style'); st.id='tb-tidy-css'; st.textContent=css;
  (document.head||document.documentElement).appendChild(st);

  // Bottoni secondari da spostare nel menu: match per target onclick
  var COLLAPSE=[
    {re:/navigate\('studio_ai'\)/,  label:'AI Studio',   icon:'fa-magic'},
    {re:/navigate\('social'\)/,     label:'Social',      icon:'fa-hashtag'},
    {re:/navigate\('web_presence'\)/,label:'Web Presence',icon:'fa-globe'},
    {re:/navigate\('produzione'\)/, label:'Produzione',  icon:'fa-boxes'},
    {re:/navigate\('design_studio'\)/,label:'Design Studio',icon:'fa-palette'}
  ];

  function tidy(){
    var bar=document.getElementById('topbar'); if(!bar) return setTimeout(tidy,600);
    if(document.getElementById('tb-more-wrap')) return;
    var btns=Array.prototype.slice.call(bar.querySelectorAll('button.topbar-btn'));

    // 1) rimuovi la ricerca DUPLICATA: tieni la prima fa-search (GlobalSearch), rimuovi eventuali altre topbar-btn fa-search
    var searchBtns=btns.filter(function(b){ var oc=b.getAttribute('onclick')||''; return /GlobalSearch/.test(oc); });
    searchBtns.slice(1).forEach(function(b){ b.style.display='none'; });

    // 2) costruisci il menu overflow
    var wrap=document.createElement('div'); wrap.id='tb-more-wrap';
    var more=document.createElement('button'); more.id='tb-more-btn'; more.title='Altre sezioni';
    more.innerHTML='<i class="fas fa-ellipsis-h"></i>';
    var menu=document.createElement('div'); menu.id='tb-more-menu';
    wrap.appendChild(more); wrap.appendChild(menu);

    var moved=0;
    COLLAPSE.forEach(function(spec){
      var btn=btns.find(function(b){ return spec.re.test(b.getAttribute('onclick')||''); });
      if(!btn) return;
      var item=document.createElement('button'); item.className='tb-more-item';
      item.innerHTML='<i class="fas '+spec.icon+'"></i><span>'+spec.label+'</span>';
      var oc=btn.getAttribute('onclick')||'';
      item.addEventListener('click', function(){ try{ (new Function(oc)).call(btn); }catch(e){}
        menu.classList.remove('open'); });
      menu.appendChild(item);
      btn.classList.add('tb-collapsed'); moved++;
    });
    if(!moved) return; // niente da spostare

    // Duplicati dell'header viola (Enterprise Header): la barra viola offre già
    // Ricerca e Impostazioni, quindi qui li nascondiamo per evitare doppioni.
    // NB: Notifiche e Tema restano (sono sistemi diversi, non duplicati).
    var DUP_HIDE=[/GlobalSearch/, /navigate\('settings'\)/];
    // Ri-nasconde scorciatoie e duplicati anche se il topbar viene ri-renderizzato.
    function hideShortcuts(){
      var bb=document.getElementById('topbar'); if(!bb) return;
      Array.prototype.slice.call(bb.querySelectorAll('button.topbar-btn')).forEach(function(b){
        var oc=b.getAttribute('onclick')||'';
        if(COLLAPSE.some(function(s){ return s.re.test(oc); })) b.classList.add('tb-collapsed');
        if(DUP_HIDE.some(function(re){ return re.test(oc); })) b.classList.add('tb-collapsed');
      });
    }
    hideShortcuts();
    setInterval(hideShortcuts, 1500);

    // inserisci il menu vicino ai toggle tema/lingua (in coda alla barra)
    var themeBtn=document.getElementById('theme-toggle-btn');
    if(themeBtn&&themeBtn.parentNode===bar) bar.insertBefore(wrap, themeBtn);
    else bar.appendChild(wrap);

    more.addEventListener('click', function(e){ e.stopPropagation(); menu.classList.toggle('open'); });
    document.addEventListener('click', function(e){ if(!wrap.contains(e.target)) menu.classList.remove('open'); });
  }

  if(document.readyState!=='loading') setTimeout(tidy,1600); else document.addEventListener('DOMContentLoaded',function(){ setTimeout(tidy,1600); });
})();
