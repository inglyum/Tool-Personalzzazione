
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY — PIANO SOCIAL 30 GIORNI (1 click → mese pianificato)
   Genera dai tuoi prodotti (store 'catalog') 30 post pronti: tipo, tema, caption,
   hashtag e prompt immagine. Offline, nessuna API. Copia tutto / per giorno.
   Launcher iniettato nella sezione Social Studio.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  var TYPES=[
    {t:'Foto prodotto',        emo:'📸', ang:'mostra il prodotto con luce naturale, dettaglio incisione'},
    {t:'Prodotto in uso',      emo:'🎁', ang:'il prodotto nel suo contesto (tavolo matrimonio, scrivania, vetrina)'},
    {t:'Dietro le quinte',     emo:'🔧', ang:'il laser che incide, la lavorazione, le mani al lavoro'},
    {t:'Recensione cliente',   emo:'⭐', ang:'screenshot/citazione di una recensione + foto consegna'},
    {t:'Tutorial / Come si fa', emo:'🎬', ang:'reel veloce: dal file al prodotto finito in 15s'},
    {t:'Offerta / Promo',      emo:'🔥', ang:'promo a tempo o bundle, con call to action chiara'},
    {t:'Engagement / Domanda', emo:'💬', ang:'sondaggio o domanda (quale colore preferisci? A o B)'},
    {t:'Nuovo arrivo',         emo:'✨', ang:'lancio di un nuovo prodotto/idea, senso di novità'},
    {t:'Idea regalo',          emo:'💝', ang:'posizionalo come regalo perfetto per un\'occasione'},
    {t:'UGC / Repost',         emo:'🔁', ang:'ripubblica foto di un cliente (con permesso) + ringrazia'},
  ];
  var TAGS_BASE=['#personalizzato','#fattoamano','#madeinitaly','#lasercut','#incisionelaser','#regalopersonalizzato','#artigianato','#handmade','#inglydesign','#sicilia'];
  function esc(s){ return String(s||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function fmtDate(d){ return d.toLocaleDateString('it-IT',{weekday:'short',day:'2-digit',month:'short'}); }

  async function loadProducts(){
    try{ var c=await IDB.getAll('catalog'); if(c&&c.length) return c; }catch(e){}
    return [];
  }
  function tagFor(name){ var t=(name||'').toLowerCase().replace(/[^a-z0-9]+/g,''); return t?('#'+t.slice(0,24)):''; }

  function captionFor(type, prod, tone){
    var n=prod?prod.name||prod.nome||'questo prodotto':'un nostro prodotto';
    var warm={
      'Foto prodotto':'Ogni dettaglio conta. '+n+' inciso a laser, pensato per durare. ✨',
      'Prodotto in uso':n+' trova il suo posto perfetto. Immagina il tuo. 🎁',
      'Dietro le quinte':'Dal file al laser: così nasce '+n+'. La cura è nei dettagli. 🔧',
      'Recensione cliente':'«Meglio di come lo immaginavo» — grazie! ❤️ '+n+' consegnato con amore.',
      'Tutorial / Come si fa':'15 secondi: come realizziamo '+n+'. Salva il reel! 🎬',
      'Offerta / Promo':'Solo per pochi giorni: '+n+' con un piccolo regalo. Scrivici in DM! 🔥',
      'Engagement / Domanda':n+': lo preferisci in legno o plexi? Vota nei commenti 👇',
      'Nuovo arrivo':'Novità in bottega ✨ '+n+' è arrivato. Chi lo vuole per primo?',
      'Idea regalo':'Cerchi un regalo che nessun altro ha? '+n+' personalizzato con il nome. 💝',
      'UGC / Repost':'Repost 🔁 grazie per aver scelto '+n+'! Taggaci nelle tue foto.'
    };
    return warm[type]||(n+' — realizzato a laser, personalizzabile.');
  }

  function generate(days, tone){
    var box=document.getElementById('sp30-list'); if(!box) return;
    box.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-muted)">Generazione…</div>';
    loadProducts().then(function(prods){
      var start=new Date(); var rows=[];
      for(var i=0;i<days;i++){
        var d=new Date(start.getTime()+i*86400000);
        var type=TYPES[i%TYPES.length];
        var prod=prods.length?prods[i%prods.length]:null;
        var pTag=prod?tagFor(prod.name||prod.nome):'';
        var tags=TAGS_BASE.slice(0,7).concat(pTag?[pTag]:[]).join(' ');
        var cap=captionFor(type.t, prod, tone);
        var imgPrompt='Foto prodotto professionale, '+type.ang+'. Soggetto: '+((prod&&(prod.name||prod.nome))||'prodotto laser personalizzato')+', materiale legno/plexiglass, luce morbida naturale, sfondo neutro elegante, stile premium artigianale, mood caldo. 4:5.';
        rows.push({d:d,type:type,prod:prod,cap:cap,tags:tags,img:imgPrompt});
      }
      window.__sp30=rows;
      box.innerHTML=rows.map(function(r,idx){
        return '<div class="sp30-card">'
          +'<div class="sp30-day"><span class="sp30-num">'+(idx+1)+'</span>'+esc(fmtDate(r.d))+'</div>'
          +'<div class="sp30-body">'
            +'<div class="sp30-type">'+r.type.emo+' '+esc(r.type.t)+(r.prod?(' · '+esc(r.prod.name||r.prod.nome||'')):'')+'</div>'
            +'<div class="sp30-cap">'+esc(r.cap)+'</div>'
            +'<div class="sp30-tags">'+esc(r.tags)+'</div>'
            +'<details class="sp30-det"><summary>Prompt immagine</summary><div class="sp30-img">'+esc(r.img)+'</div></details>'
          +'</div>'
          +'<button class="sp30-copy" onclick="SocialPlanner30.copyDay('+idx+')" title="Copia questo post">📋</button>'
        +'</div>';
      }).join('');
    });
  }

  function planText(){
    var rows=window.__sp30||[]; return rows.map(function(r,i){
      return 'GIORNO '+(i+1)+' — '+fmtDate(r.d)+' · '+r.type.t+(r.prod?(' ('+(r.prod.name||r.prod.nome||'')+')'):'')
        +'\nCaption: '+r.cap+'\nHashtag: '+r.tags+'\nPrompt immagine: '+r.img+'\n';
    }).join('\n');
  }

  window.SocialPlanner30={
    open:function(){
      if(document.getElementById('sp30-modal')) return;
      var m=document.createElement('div'); m.id='sp30-modal'; m.className='sp30-overlay';
      m.addEventListener('click',function(e){ if(e.target===m) m.remove(); });
      m.innerHTML=
        '<div class="sp30-box">'
        +'<div class="sp30-head"><div class="sp30-logo">📅</div>'
          +'<div style="flex:1"><div class="sp30-title">Piano Social — 30 giorni</div>'
          +'<div class="sp30-sub">Un mese di post pronti dai tuoi prodotti: tipo, caption, hashtag e prompt immagine.</div></div>'
          +'<button class="sp30-x" onclick="document.getElementById(\'sp30-modal\').remove()">✕</button></div>'
        +'<div class="sp30-cfg">'
          +'<select id="sp30-tone"><option>Caldo e personale</option><option>Professionale ed elegante</option><option>Divertente e creativo</option></select>'
          +'<select id="sp30-days"><option value="30">30 giorni</option><option value="14">14 giorni</option><option value="7">7 giorni</option></select>'
          +'<button class="sp30-gen" onclick="SocialPlanner30.gen()"><i class="fas fa-wand-magic-sparkles"></i> Genera piano</button>'
          +'<button class="sp30-btn" onclick="SocialPlanner30.copyAll()"><i class="fas fa-copy"></i> Copia tutto</button>'
        +'</div>'
        +'<div id="sp30-list" class="sp30-list"><div style="padding:30px;text-align:center;color:var(--text-muted)">Premi <b>Genera piano</b> per creare 30 giorni di contenuti.</div></div>'
        +'</div>'+css();
      document.body.appendChild(m);
    },
    gen:function(){ var d=parseInt(document.getElementById('sp30-days').value)||30; var t=document.getElementById('sp30-tone').value; generate(d,t); },
    copyDay:function(i){ var r=(window.__sp30||[])[i]; if(!r) return; var txt='GIORNO '+(i+1)+' — '+r.type.t+'\nCaption: '+r.cap+'\nHashtag: '+r.tags+'\nPrompt immagine: '+r.img; navigator.clipboard&&navigator.clipboard.writeText(txt).then(function(){ if(window.toast) toast('📋 Post copiato','success'); }); },
    copyAll:function(){ var t=planText(); if(!t){ if(window.toast) toast('Genera prima il piano','warning'); return; } navigator.clipboard&&navigator.clipboard.writeText(t).then(function(){ if(window.toast) toast('📋 Piano copiato ('+(window.__sp30||[]).length+' giorni)','success'); }); }
  };

  function css(){ return '<style>'
    +'.sp30-overlay{position:fixed;inset:0;z-index:99990;background:#000b;display:flex;align-items:center;justify-content:center;padding:16px;font-family:var(--font-body,system-ui)}'
    +'.sp30-box{background:var(--bg-card,#111);border:1px solid var(--border2,#333);border-radius:18px;width:min(720px,100%);max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px #000a}'
    +'.sp30-head{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--border,#222)}'
    +'.sp30-logo{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#a855f7,#6366f1);display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;flex-shrink:0}'
    +'.sp30-title{font-size:17px;font-weight:800;color:var(--text,#eee)}'
    +'.sp30-sub{font-size:11.5px;color:var(--text-muted,#999);margin-top:2px}'
    +'.sp30-x{margin-left:auto;background:var(--bg-card2,#222);border:1px solid var(--border,#333);color:var(--text-muted);width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px}'
    +'.sp30-cfg{display:flex;gap:8px;flex-wrap:wrap;padding:14px 20px;border-bottom:1px solid var(--border,#222)}'
    +'.sp30-cfg select{height:40px;border-radius:9px;border:1px solid var(--border2,#333);background:var(--bg-card2,#1a1a1a);color:var(--text,#eee);padding:0 10px;font-size:13px}'
    +'.sp30-gen{height:40px;padding:0 18px;border:none;border-radius:9px;background:linear-gradient(135deg,#a855f7,#6366f1);color:#fff;font-weight:800;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:7px}'
    +'.sp30-btn{height:40px;padding:0 14px;border:1px solid var(--border2,#333);border-radius:9px;background:var(--bg-card2,#1a1a1a);color:var(--text,#eee);font-weight:700;font-size:13px;cursor:pointer}'
    +'.sp30-list{overflow-y:auto;padding:14px 20px;display:flex;flex-direction:column;gap:10px}'
    +'.sp30-card{display:flex;gap:12px;align-items:flex-start;background:var(--bg-card2,#1a1a1a);border:1px solid var(--border,#2a2a2a);border-radius:12px;padding:12px 14px}'
    +'.sp30-day{width:96px;flex-shrink:0;font-size:11px;color:var(--text-muted,#999);font-weight:700;display:flex;align-items:center;gap:6px;text-transform:capitalize}'
    +'.sp30-num{width:22px;height:22px;border-radius:6px;background:var(--primary-dim,#a855f733);color:var(--primary,#a855f7);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800}'
    +'.sp30-body{flex:1;min-width:0}'
    +'.sp30-type{font-size:12.5px;font-weight:800;color:var(--text,#eee);margin-bottom:4px}'
    +'.sp30-cap{font-size:12.5px;color:var(--text,#ddd);line-height:1.45;margin-bottom:5px}'
    +'.sp30-tags{font-size:11px;color:#7c9df0;margin-bottom:5px;word-break:break-word}'
    +'.sp30-det summary{font-size:11px;color:var(--text-muted,#999);cursor:pointer}'
    +'.sp30-img{font-size:11px;color:var(--text-muted,#999);margin-top:5px;line-height:1.4;font-family:ui-monospace,Menlo,monospace}'
    +'.sp30-copy{background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:15px;flex-shrink:0}'
    +'</style>';
  }

  // Launcher nella sezione Social Studio
  function injectLauncher(){
    var v=document.getElementById('view-socialstudio');
    if(!v || !v.classList.contains('active')) return;
    if(v.querySelector('#sp30-launch')) return;
    var b=document.createElement('button'); b.id='sp30-launch';
    b.innerHTML='📅 Piano Social 30 giorni (1 click)';
    b.style.cssText='margin:12px 0;padding:12px 18px;border:none;border-radius:12px;background:linear-gradient(135deg,#a855f7,#6366f1);color:#fff;font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 8px 22px #6366f144';
    b.onclick=function(){ SocialPlanner30.open(); };
    v.insertBefore(b, v.firstChild);
  }
  setInterval(injectLauncher, 700);
})();
