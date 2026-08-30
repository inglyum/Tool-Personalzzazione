
/* ═══════════════════════════════════════════════════════════════════════════
   WHITE-LABEL BRANDING (additivo, reversibile, CSP-safe) — v96
   Cambia logo, nome attività e colore primario dal topbar. Salvato in
   localStorage (ingly_brand_v1) e riapplicato all'avvio. Il colore primario è
   impostato inline su :root (--primary/-dim/-border), così tiene su ogni tema.
   NB: NON tocca l'Accesso Rapido né i moduli.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__brand96) return; window.__brand96=true;
  var PENCIL='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
  var KEY='ingly_brand_v1';
  var SWATCHES=['#fbbf24','#6366f1','#22c55e','#ef4444','#a855f7','#0ea5e9','#f97316','#ec4899'];
  function get(){ try{ return JSON.parse(localStorage.getItem(KEY))||{}; }catch(e){ return {}; } }
  function set(b){ try{ localStorage.setItem(KEY, JSON.stringify(b)); }catch(e){} }
  function hexToRgba(hex,a){ var h=hex.replace('#',''); if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var n=parseInt(h,16); return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')'; }
  /* Il colore lo applica InglyTema, che ne deriva gli otto token — compresi
     quelli del design system, che questa funzione non conosceva — e ne misura
     il contrasto. Restava qui una seconda scrittura di `--primary`: con il
     pannello di patch 117 che ne scriveva un'altra, il colore dell'app
     dipendeva da quale dei due avesse parlato per ultimo. */
  function applyColor(c){ if(!c) return;
    if(window.InglyTema){ window.InglyTema.salva({ accento:c }); return; }
    var r=document.documentElement.style;
    r.setProperty('--primary', c);
    r.setProperty('--primary-dim', hexToRgba(c,.14));
    r.setProperty('--primary-border', hexToRgba(c,.30));
  }
  function apply(){
    var b=get();
    try{ if(b.logo){ var img=document.querySelector('#topbar .logo img'); if(img) img.src=b.logo; } }catch(e){}
    try{ if(b.name){ var nm=document.getElementById('topbar-biz-name'); if(nm) nm.textContent=b.name; } }catch(e){}
    if(b.color) applyColor(b.color);
  }
  function openModal(){
    var b=get();
    var m=document.getElementById('brand-modal');
    if(!m){ m=document.createElement('div'); m.id='brand-modal'; document.body.appendChild(m); }
    var curLogo=b.logo||(document.querySelector('#topbar .logo img')||{}).src||'';
    var curName=b.name||(document.getElementById('topbar-biz-name')||{}).textContent||'Ingly Design';
    var curColor=b.color||getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()||'#fbbf24';
    m.innerHTML='<div class="bm-box">'
      +'<div class="bm-head">'+PENCIL.replace("viewBox","style=\"width:18px;height:18px;stroke:var(--primary);stroke-width:2;fill:none\" viewBox")+' Personalizza brand'
      +'<button class="bm-x" onclick="document.getElementById(\'brand-modal\').classList.remove(\'open\')">✕</button></div>'
      +'<div class="bm-body">'
        +'<div><div class="bm-lbl">Logo</div><div class="bm-logo-row">'
          +'<img class="bm-logo-prev" id="bm-logo-prev" src="'+curLogo+'" alt="logo">'
          +'<button class="bm-btn" id="bm-logo-btn">Carica immagine…</button></div></div>'
        +'<div><div class="bm-lbl">Nome attività</div><input class="bm-name" id="bm-name" value="'+String(curName).replace(/"/g,'&quot;')+'" placeholder="Nome del tuo brand"></div>'
        +'<div><div class="bm-lbl">Colore primario</div><div class="bm-sw" id="bm-sw">'
          +SWATCHES.map(function(c){ return '<button data-c="'+c+'" style="background:'+c+'" class="'+(c.toLowerCase()===curColor.toLowerCase()?'on':'')+'"></button>'; }).join('')
          +'<input type="color" id="bm-color" value="'+(/^#([0-9a-f]{6})$/i.test(curColor)?curColor:'#fbbf24')+'" style="width:30px;height:30px;border:none;background:none;cursor:pointer;padding:0">'
        +'</div></div>'
      +'</div>'
      +'<div class="bm-foot"><button class="bm-btn" id="bm-reset">Ripristina default</button>'
        +'<button class="bm-btn primary" id="bm-save" style="margin-left:auto">Salva brand</button></div>'
      +'</div>';
    m.classList.add('open');
    var draft={ logo:b.logo||null, name:curName, color:curColor };
    m.querySelector('#bm-logo-btn').onclick=function(){
      var inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
      inp.onchange=function(){ var f=inp.files&&inp.files[0]; if(!f) return;
        if(f.size>1500000){ if(window.toast) toast('Immagine troppo grande (max ~1.5MB)','warning'); return; }
        var rd=new FileReader(); rd.onload=function(){ draft.logo=rd.result; var p=document.getElementById('bm-logo-prev'); if(p) p.src=rd.result; };
        rd.readAsDataURL(f);
      };
      inp.click();
    };
    m.querySelectorAll('#bm-sw button[data-c]').forEach(function(btn){
      btn.onclick=function(){ draft.color=btn.getAttribute('data-c');
        m.querySelectorAll('#bm-sw button[data-c]').forEach(function(x){ x.classList.remove('on'); }); btn.classList.add('on');
        applyColor(draft.color);
      };
    });
    var cp=m.querySelector('#bm-color'); if(cp) cp.oninput=function(){ draft.color=cp.value; applyColor(draft.color);
      m.querySelectorAll('#bm-sw button[data-c]').forEach(function(x){ x.classList.remove('on'); }); };
    m.querySelector('#bm-save').onclick=function(){
      draft.name=(document.getElementById('bm-name')||{}).value||draft.name;
      set({ logo:draft.logo, name:draft.name, color:draft.color });
      apply();
      m.classList.remove('open');
      if(window.toast) toast('✅ Brand aggiornato','success');
    };
    m.querySelector('#bm-reset').onclick=function(){
      try{ localStorage.removeItem(KEY); }catch(e){}
      var r=document.documentElement.style; r.removeProperty('--primary'); r.removeProperty('--primary-dim'); r.removeProperty('--primary-border');
      m.classList.remove('open');
      if(window.toast) toast('Brand ripristinato — ricarica per il logo/nome originali','info');
    };
    m.addEventListener('click',function(e){ if(e.target===m) m.classList.remove('open'); });
  }
  function mount(){
    var logo=document.querySelector('#topbar .logo'); if(!logo||logo.__be) return; logo.__be=true;
    var btn=document.createElement('button'); btn.className='logo-edit'; btn.title='Personalizza brand (logo, nome, colore)'; btn.innerHTML=PENCIL;
    btn.onclick=function(e){ e.stopPropagation(); openModal(); };
    logo.appendChild(btn);
  }
  var tries=0;
  var iv=setInterval(function(){ tries++; apply(); mount(); if(tries>30) clearInterval(iv); },500);
})();
