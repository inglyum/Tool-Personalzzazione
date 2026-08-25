
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY — TREND & PRODUCT HUNTER (scouting mercato, 1 click, gratis)
   Keyword → ricerche pre-compilate su Etsy/Amazon/eBay/Google Trends/Pinterest/
   TikTok/Instagram (domanda reale, trend, social, scouting piccoli artigiani di
   qualità) + prompt esperto "cosa produrre". Nessuna API. Salva le ricerche.
   Renderizza in #view-trendscanner (nav "Trend Hunter Pro").
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  var SK='ingly_trend_hunts';
  var OCC=['Matrimonio','Battesimo & Comunione','Natale','San Valentino','Compleanno','Pet','Aziende / B2B','Casa & Arredo','Ristoranti & Bar','Nascita','Laurea','Souvenir Sicilia'];
  function enc(s){ return encodeURIComponent((s||'').trim()); }
  function tg(s){ return (s||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,''); }
  function esc(s){ return String(s||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function saved(){ try{ return JSON.parse(localStorage.getItem(SK)||'[]'); }catch(e){ return []; } }
  function save(list){ try{ localStorage.setItem(SK, JSON.stringify(list.slice(0,30))); }catch(e){} }

  function groups(q){
    var e=enc(q), t=tg(q);
    return [
      { key:'demand', title:'Domanda reale & Best seller', icon:'fa-fire', color:'#ef4444',
        note:'Cosa si vende DAVVERO (venduti eBay = domanda dimostrata).', items:[
        {n:'Etsy — risultati', u:'https://www.etsy.com/it/search?q='+e},
        {n:'Etsy — "bestseller"', u:'https://www.etsy.com/it/search?q='+enc(q+' bestseller')},
        {n:'eBay — VENDUTI (prezzi reali)', u:'https://www.ebay.it/sch/i.html?_nkw='+e+'&LH_Sold=1&LH_Complete=1'},
        {n:'Amazon Handmade', u:'https://www.amazon.it/s?k='+e+'&i=handmade'},
        {n:'Amazon — più recensiti', u:'https://www.amazon.it/s?k='+e+'&s=review-rank'},
        {n:'Google Shopping', u:'https://www.google.com/search?tbm=shop&q='+e},
      ]},
      { key:'trend', title:'Trend & Timing', icon:'fa-chart-line', color:'#6366f1',
        note:'In salita o in calo? Quando lanciare.', items:[
        {n:'Google Trends (IT, 12 mesi)', u:'https://trends.google.it/trends/explore?geo=IT&q='+e},
        {n:'Google Trends — in aumento', u:'https://trends.google.it/trends/explore?date=today%2012-m&geo=IT&q='+e},
        {n:'Pinterest — pin (idee visive)', u:'https://www.pinterest.com/search/pins/?q='+e},
        {n:'Pinterest — Trends', u:'https://trends.pinterest.com/'},
        {n:'Etsy — novità (rising)', u:'https://www.etsy.com/it/search?q='+e+'&order=date_desc'},
      ]},
      { key:'social', title:'Virale sui social', icon:'fa-hashtag', color:'#ec4899',
        note:'Cosa gira e converte su TikTok/Instagram.', items:[
        {n:'TikTok — ricerca', u:'https://www.tiktok.com/search?q='+e},
        {n:'TikTok — hashtag', u:'https://www.tiktok.com/tag/'+t},
        {n:'Instagram — hashtag', u:'https://www.instagram.com/explore/tags/'+t+'/'},
        {n:'Instagram — #'+t+'fattoamano', u:'https://www.instagram.com/explore/tags/'+t+'fattoamano/'},
      ]},
      { key:'scouting', title:'Scouting piccoli artigiani di qualità', icon:'fa-gem', color:'#f59e0b',
        note:'Trova micro-shop di qualità da studiare (non copiare): recensioni, foto, packaging, storytelling.', items:[
        {n:'Etsy — Star Seller (qualità)', u:'https://www.etsy.com/it/search?q='+e+'&is_star_seller=true'},
        {n:'Etsy — piccoli/nuovi shop', u:'https://www.etsy.com/it/search?q='+e+'&order=date_desc'},
        {n:'Etsy — handmade top', u:'https://www.etsy.com/it/search?q='+enc(q+' handmade')},
        {n:'Instagram — piccoli maker', u:'https://www.instagram.com/explore/tags/'+t+'handmade/'},
        {n:'Pinterest — creator', u:'https://www.pinterest.com/search/pins/?q='+enc(q+' handmade')},
      ]},
    ];
  }

  function buildPrompt(q){
    return 'Sei un esperto di product research/scouting per e-commerce artigianale (Etsy, Amazon Handmade) e di produzione con TAGLIO e INCISIONE LASER (CO2 e fibra/MOPA), stampa UV e DTF. Contesto: micro-impresa artigiana italiana (Sicilia); materiali legno, plexiglass/acrilico, acciaio, alluminio; prezzi con minimi psicologici (ordine minimo 15 EUR, portachiavi 6,90, cake topper da 24,90, targa A5 da 29,90); canali B2C/B2B/Etsy; obiettivo margine >= 60%.\n\n'
    +'KEYWORD / NICCHIA: "'+q+'".\n\n'
    +'Analizza la domanda reale e rispondi in italiano, concreto e numerico:\n'
    +'1) TOP 10 PRODOTTI ad alta domanda e concorrenza bassa/media, producibili a laser/UV/DTF per questa nicchia. Per ognuno: nome, perche vende (occasione/trigger emotivo), materiale consigliato, tempo di produzione stimato, prezzo di vendita consigliato (formula: (Materiale + Macchina + Lavoro 18 EUR/h + Design) x markup canale, arrotonda a ,90) e angolo differenziante vs competitor.\n'
    +'2) 5 VARIANTI/UPSELL per alzare lo scontrino medio.\n'
    +'3) 12 TAG SEO Etsy long-tail in italiano ottimizzati per questa nicchia.\n'
    +'4) 3 PICCOLI ARTIGIANI DI QUALITA da studiare (cosa cercare: recensioni, qualita foto, packaging, storytelling) e come differenziarmi senza copiare.\n'
    +'5) 3 PRODOTTI NUOVI/ORIGINALI non ancora saturi per questa nicchia.\n'
    +'6) STAGIONALITA & TIMING: quando produrre e lanciare.\n'
    +'Niente giri di parole: dammi una tabella sintetica dove possibile.';
  }

  function run(q){
    q=(q||'').trim();
    if(!q){ if(window.toast) toast('Scrivi una parola chiave o nicchia','warning'); return; }
    var box=document.getElementById('thp-results'); if(!box) return;
    // salva ricerca
    var list=saved().filter(function(x){ return x.q!==q; }); list.unshift({q:q, at:Date.now()}); save(list);
    var gs=groups(q);
    var cards=gs.map(function(g){
      var links=g.items.map(function(it){
        return '<a href="'+it.u+'" target="_blank" rel="noopener" class="thp-link">'
          +'<span>'+esc(it.n)+'</span><i class="fas fa-arrow-up-right-from-square"></i></a>';
      }).join('');
      return '<div class="thp-card" style="border-top:3px solid '+g.color+'">'
        +'<div class="thp-card-h"><i class="fas '+g.icon+'" style="color:'+g.color+'"></i> '+esc(g.title)+'</div>'
        +'<div class="thp-card-note">'+esc(g.note)+'</div>'
        +'<div class="thp-links">'+links+'</div>'
        +'<button class="thp-openall" onclick="TrendHunterPro.openAll(\''+g.key+'\',\''+esc(q).replace(/'/g,"\\'")+'\')">Apri tutti</button>'
        +'</div>';
    }).join('');
    var pr=buildPrompt(q);
    box.innerHTML=
      '<div class="thp-grid">'+cards+'</div>'
      +'<div class="thp-prompt">'
        +'<div class="thp-card-h"><i class="fas fa-wand-magic-sparkles" style="color:#a855f7"></i> Prompt esperto — "Cosa produrre" per: '+esc(q)+'</div>'
        +'<div class="thp-card-note">Copia e incolla in ChatGPT/Claude/Gemini (gratis). Ti da 10 prodotti, prezzi, tag SEO e artigiani da studiare.</div>'
        +'<textarea id="thp-prompt-text" readonly>'+esc(pr)+'</textarea>'
        +'<div class="thp-actions">'
          +'<button class="thp-btn thp-btn-primary" onclick="TrendHunterPro.copyPrompt()"><i class="fas fa-copy"></i> Copia prompt</button>'
          +'<a class="thp-btn" href="https://chat.openai.com/" target="_blank" rel="noopener">ChatGPT</a>'
          +'<a class="thp-btn" href="https://claude.ai/" target="_blank" rel="noopener">Claude</a>'
          +'<a class="thp-btn" href="https://gemini.google.com/" target="_blank" rel="noopener">Gemini</a>'
        +'</div>'
      +'</div>';
    box.style.display='block';
    window.__thpGroups=gs;
  }

  window.TrendHunterPro={
    render:function(){
      var el=document.getElementById('view-trendscanner'); if(!el) return;
      var chips=OCC.map(function(o){ return '<button class="thp-chip" onclick="TrendHunterPro.set(\''+esc(o).replace(/'/g,"\\'")+'\')">'+esc(o)+'</button>'; }).join('');
      var hist=saved().slice(0,8).map(function(h){ return '<button class="thp-chip thp-chip-hist" onclick="TrendHunterPro.set(\''+esc(h.q).replace(/'/g,"\\'")+'\',true)">'+esc(h.q)+'</button>'; }).join('');
      el.innerHTML=
        '<div class="thp-wrap" data-ai-rendered="trendscanner">'
        +'<div class="thp-head">'
          +'<div class="thp-logo"><i class="fas fa-binoculars"></i></div>'
          +'<div><div class="thp-title">Trend &amp; Product Hunter</div>'
          +'<div class="thp-sub">Scopri cosa produrre: domanda reale, trend, social e scouting di piccoli artigiani di qualità — in 1 click.</div></div>'
        +'</div>'
        +'<div class="thp-search">'
          +'<input id="thp-q" placeholder="Es. segnaposto matrimonio, portachiavi pet, targa ristorante…" onkeydown="if(event.key===\'Enter\')TrendHunterPro.go()">'
          +'<button class="thp-go" onclick="TrendHunterPro.go()"><i class="fas fa-magnifying-glass"></i> Caccia</button>'
        +'</div>'
        +'<div class="thp-chips-lbl">Nicchie rapide</div>'
        +'<div class="thp-chips">'+chips+'</div>'
        +(hist?('<div class="thp-chips-lbl">Ricerche recenti</div><div class="thp-chips">'+hist+'</div>'):'')
        +'<div id="thp-results" style="display:none;margin-top:18px"></div>'
        +'</div>'
        +thpCSS();
    },
    go:function(){ run(document.getElementById('thp-q').value); },
    set:function(q, immediate){ var i=document.getElementById('thp-q'); if(i){ i.value=q; } if(immediate) run(q); else run(q); },
    openAll:function(key,q){
      var gs=window.__thpGroups||groups(q);
      var g=gs.find(function(x){return x.key===key;}); if(!g) return;
      if(!confirm('Apro '+g.items.length+' schede ('+g.title+')?')) return;
      g.items.forEach(function(it,idx){ setTimeout(function(){ window.open(it.u,'_blank','noopener'); }, idx*250); });
    },
    copyPrompt:function(){
      var t=document.getElementById('thp-prompt-text'); if(!t) return;
      try{ navigator.clipboard.writeText(t.value).then(function(){ if(window.toast) toast('📋 Prompt copiato — incollalo in ChatGPT','success'); }); }
      catch(e){ t.select(); document.execCommand('copy'); if(window.toast) toast('📋 Copiato','success'); }
    }
  };

  // Watcher robusto: renderizza quando la sezione è attiva e non ancora pronta
  // (indipendente dal wiring di App.navigate).
  function ensureRendered(){
    var v=document.getElementById('view-trendscanner');
    if(v && v.classList.contains('active') && !v.querySelector('#thp-q')){
      try{ window.TrendHunterPro.render(); }catch(e){}
    }
  }
  setInterval(ensureRendered, 450);

  function thpCSS(){ return '<style>'
    +'.thp-wrap{max-width:1180px;margin:0 auto;padding:18px 20px}'
    +'.thp-head{display:flex;align-items:center;gap:14px;margin-bottom:18px}'
    +'.thp-logo{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#ec4899,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0;box-shadow:0 8px 24px #8b5cf655}'
    +'.thp-title{font-size:22px;font-weight:800;letter-spacing:-.02em;color:var(--text)}'
    +'.thp-sub{font-size:13px;color:var(--text-muted);margin-top:2px;max-width:70ch}'
    +'.thp-search{display:flex;gap:10px;margin-bottom:16px}'
    +'.thp-search input{flex:1;height:50px;border-radius:12px;border:1px solid var(--border2);background:var(--bg-card2);color:var(--text);padding:0 16px;font-size:15px;outline:none}'
    +'.thp-search input:focus{border-color:var(--primary)}'
    +'.thp-go{height:50px;padding:0 22px;border:none;border-radius:12px;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#fff;font-weight:800;font-size:15px;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 8px 22px #8b5cf644}'
    +'.thp-go:hover{opacity:.92}'
    +'.thp-chips-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-dim);margin:10px 0 6px;font-weight:700}'
    +'.thp-chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:6px}'
    +'.thp-chip{padding:7px 13px;border-radius:99px;border:1px solid var(--border2);background:var(--bg-card2);color:var(--text-muted);font-size:12.5px;font-weight:600;cursor:pointer;transition:.15s}'
    +'.thp-chip:hover{border-color:var(--primary);color:var(--primary)}'
    +'.thp-chip-hist{opacity:.85}'
    +'.thp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}'
    +'.thp-card{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.1),0 6px 20px rgba(0,0,0,.08)}'
    +'.thp-card-h{font-size:14px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:8px;margin-bottom:4px}'
    +'.thp-card-note{font-size:11.5px;color:var(--text-muted);line-height:1.45;margin-bottom:12px}'
    +'.thp-links{display:flex;flex-direction:column;gap:6px}'
    +'.thp-link{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;border-radius:9px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);font-size:12.5px;text-decoration:none;transition:.14s}'
    +'.thp-link:hover{border-color:var(--primary);transform:translateX(2px);color:var(--primary)}'
    +'.thp-link i{font-size:10px;opacity:.6}'
    +'.thp-openall{margin-top:11px;width:100%;padding:8px;border-radius:9px;border:1px dashed var(--border2);background:transparent;color:var(--text-muted);font-size:12px;font-weight:700;cursor:pointer}'
    +'.thp-openall:hover{color:var(--primary);border-color:var(--primary)}'
    +'.thp-prompt{margin-top:16px;background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px;box-shadow:0 6px 20px rgba(0,0,0,.08)}'
    +'.thp-prompt textarea{width:100%;min-height:150px;margin-top:10px;border-radius:10px;border:1px solid var(--border2);background:var(--bg-card2);color:var(--text);padding:12px 14px;font-size:12px;line-height:1.5;font-family:ui-monospace,Menlo,Consolas,monospace;resize:vertical;box-sizing:border-box}'
    +'.thp-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}'
    +'.thp-btn{padding:9px 16px;border-radius:9px;border:1px solid var(--border2);background:var(--bg-card2);color:var(--text);font-weight:700;font-size:12.5px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:7px}'
    +'.thp-btn:hover{border-color:var(--primary);color:var(--primary)}'
    +'.thp-btn-primary{background:linear-gradient(135deg,#a855f7,#6366f1);color:#fff;border:none}'
    +'.thp-btn-primary:hover{opacity:.9;color:#fff}'
    +'</style>';
  }
})();
