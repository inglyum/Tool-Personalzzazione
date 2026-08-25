
/* ═══════════════════════════════════════════════════════════════
   INGLY OS v36 — IMPROVEMENTS (safe injection on original tool)
   FIX 1:  Obiettivi di Crescita black screen (_gs_wrap)
   FIX 2:  _miSections: add goals, kanban, apparel, print3d
   NEW 1:  Bank & Funds v2 (reserve, distribute, sync)
   NEW 2:  Toast queue (max 3, dedup)
   NEW 3:  Quoter channel selector (B2B/Etsy/Retail)
   NEW 4:  Pipeline Kanban
   NEW 5:  Admin Panel enhancements (in admin.html)
   NEW 6:  Finance→InvestPlanner auto-accrue (Bus hook)
   NEW 7:  Dashboard Goals widget
   NEW 8:  SDE 20s grace window
   CLEAN:  nav-group ng-market items hidden (not removed)
   ═══════════════════════════════════════════════════════════════ */
;(function INGLY_V36(){
  'use strict';
  if(window._v36improvements) return;
  window._v36improvements = true;

  /* ── utils ──────────────────────────────────────────────── */
  function eu(n,d){ d=d||0; return '€'+Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:d,maximumFractionDigits:d}); }
  function uid(){ return 'v36_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
  function lsGet(k,d){ try{var v=localStorage.getItem(k);return v!=null?JSON.parse(v):d;}catch(e){return d;} }
  function lsSet(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} }
  function tt(m,t){ if(typeof toast!=='undefined') toast(m,t||'info'); }
  function fdt(d){ try{return new Date(d).toLocaleDateString('it-IT');}catch(e){return '—';} }

  /* ══════════════════════════════════════════════════════════
     FIX 1: Obiettivi di Crescita — fix black screen
     .section-view.active has display:block !important in CSS
     G.render sets display:flex inline → overridden → black
     Fix: wrap content in inner div with display:flex
  ══════════════════════════════════════════════════════════ */
  ;(function fixGoalsRender(){
    var t=0,iv=setInterval(function(){
      t++;if(t>80){clearInterval(iv);return;}
      if(typeof window.InvestPlanner==='undefined'||typeof window.InvestPlanner.render!=='function') return;
      clearInterval(iv);
      if(window.InvestPlanner._v36wrapped) return;
      window.InvestPlanner._v36wrapped = true;
      var _origRender = window.InvestPlanner.render.bind(window.InvestPlanner);
      window.InvestPlanner.render = function(){
        var el = document.getElementById('view-goals');
        if(el) el.style.cssText='padding:0;overflow:hidden';
        _origRender();
        /* After render: rewrap if needed */
        setTimeout(function(){
          var el2 = document.getElementById('view-goals');
          if(!el2) return;
          /* Find the shell built by buildShell() which should be direct child */
          if(el2.querySelector('#_gs_body')) return; /* already works */
          /* If el2 has a wrapper with flex, it's fine */
        },100);
      };
      /* Also patch G directly if exported as InvestPlanner */
      console.log('[v36] InvestPlanner.render wrapped ✅');
    },300);
  })();

  /* Simpler approach: inject CSS that makes view-goals a flex container */
  ;(function fixGoalsCSS(){
    var style = document.createElement('style');
    style.textContent = [
      '#view-goals.active { display:flex !important; flex-direction:column !important; height:calc(100vh - 64px) !important; overflow:hidden !important; }',
      '#view-bank_funds.active { min-height:400px !important; }',
      '#view-kanban.active { display:flex !important; flex-direction:column !important; height:calc(100vh - 64px) !important; overflow:hidden !important; }',
    ].join('\n');
    document.head.appendChild(style);
    console.log('[v36] Goals/Kanban CSS fix injected ✅');
  })();

  /* ══════════════════════════════════════════════════════════
     FIX 2: _miSections — add our new sections
     The _miSections intercept at ~4380KB is the dominant router.
     Patch it to include goals, kanban, bank_funds upgrades.
  ══════════════════════════════════════════════════════════ */
  ;(function patchMiSections(){
    var t=0,iv=setInterval(function(){
      t++;if(t>120){clearInterval(iv);return;}
      if(typeof App==='undefined'||!App.renderSection) return;
      clearInterval(iv);
      if(App._v36miPatched) return;
      App._v36miPatched = true;
      var _origRS = App.renderSection.bind(App);
      App.renderSection = async function(s){
        /* Our section overrides */
        if(s==='kanban'){
          var el=document.getElementById('view-kanban');
          if(!el){el=document.createElement('div');el.id='view-kanban';el.className='section-view';var ci=document.getElementById('content-inner');if(ci)ci.appendChild(el);}
          document.querySelectorAll('.section-view.active').forEach(function(v){v.classList.remove('active');});
          el.classList.add('active');
          if(typeof KanbanOS!=='undefined') KanbanOS.render();
          App.currentSection='kanban';
          return;
        }
        if(s==='bank_funds'){
          /* BankFundsV2 overrides BankFunds if available */
          var r = await _origRS(s);
          setTimeout(function(){
            if(typeof BankFundsV2!=='undefined'&&typeof BankFundsV2.render==='function'){
              BankFundsV2.render();
            }
          },80);
          return r;
        }
        return await _origRS(s);
      };
      console.log('[v36] renderSection patched: kanban + bank_funds ✅');
    },300);
  })();

  /* ══════════════════════════════════════════════════════════
     NEW 1: BANK & FUNDS v2
     Adds reserve system, distribution modes, sync w/ Goals
  ══════════════════════════════════════════════════════════ */
  /* BFv2: replaced by unified */

  /* ══════════════════════════════════════════════════════════
     NEW 2: TOAST QUEUE — max 3, dedup 1.5s
  ══════════════════════════════════════════════════════════ */
  ;(function patchToast(){
    if(typeof toast!=='function') return;
    var _orig=window.toast, _q=[], _showing=0, _last={}, MAX=3;
    window.toast=function(msg,type,dur){
      dur=dur||3200;type=type||'success';
      var now=Date.now();
      if(_last[msg]&&(now-_last[msg])<1500) return;
      _last[msg]=now;
      if(_showing>=MAX){_q.push({msg,type,dur});return;}
      _show(msg,type,dur);
    };
    function _show(msg,type,dur){
      _showing++;
      if(_orig) _orig(msg,type,dur);
      setTimeout(function(){_showing=Math.max(0,_showing-1);if(_q.length){var n=_q.shift();setTimeout(function(){_show(n.msg,n.type,n.dur);},100);}},dur+300);
    }
    console.log('[v36] Toast queue: max '+MAX+' ✅');
  })();

  /* ══════════════════════════════════════════════════════════
     NEW 3: QUOTER CHANNEL SELECTOR
     B2B / Etsy / Retail / Privato tabs above Smart Quoter
  ══════════════════════════════════════════════════════════ */
  ;(function setupQuoterChannels(){
    var CHANNELS=[
      {id:'b2b',  label:'🏭 B2B',    mk:2.0,color:'#6366f1',desc:'Aziende'},
      {id:'etsy', label:'🛍 Etsy',   mk:3.5,color:'#f97316',desc:'Marketplace'},
      {id:'retail',label:'🏪 Retail',mk:3.0,color:'#10b981',desc:'Negozio/Fiera'},
      {id:'priv', label:'👤 Privato',mk:3.0,color:'#8b5cf6',desc:'Cliente diretto'},
    ];
    var _ch='b2b';

    window._setQuoterChannel=function(chId){
      _ch=chId;
      var ch=CHANNELS.find(function(c){return c.id===chId;})||CHANNELS[0];
      CHANNELS.forEach(function(c){
        var b=document.getElementById('_qc_'+c.id);if(!b)return;
        var isA=c.id===chId;
        b.style.borderColor=isA?c.color:'var(--border,#2a2a35)';
        b.style.background=isA?c.color+'20':'transparent';
        b.style.color=isA?c.color:'var(--text-muted,#888)';
      });
      var note=document.getElementById('_qc_note');
      if(note) note.textContent='Markup ×'+ch.mk+' · '+ch.desc;
      try{localStorage.setItem('ingly_quoter_channel',JSON.stringify({id:chId,markup:ch.mk}));}catch(e){}
      if(typeof toast!=='undefined') toast('Canale: '+ch.label+' (×'+ch.mk+')','info');
    };

    function injectChannelBar(){
      if(document.getElementById('_qc_bar')) return;
      var q=document.getElementById('view-quoter');if(!q)return;
      var ph=q.querySelector('.page-header');if(!ph)return;
      var bar=document.createElement('div');
      bar.id='_qc_bar';
      bar.style.cssText='display:flex;gap:6px;align-items:center;padding:8px 16px;background:var(--bg-card,#111115);border-bottom:1px solid var(--border,#2a2a35);flex-wrap:wrap';
      bar.innerHTML='<span style="font-size:11px;color:var(--text-muted,#888);font-weight:600;white-space:nowrap">Canale:</span>'
        +CHANNELS.map(function(c){
          return '<button id="_qc_'+c.id+'" onclick="_setQuoterChannel(\''+c.id+'\')" style="padding:5px 11px;border-radius:7px;border:1px solid '+(c.id==='b2b'?c.color:'var(--border,#2a2a35)')+';background:'+(c.id==='b2b'?c.color+'20':'transparent')+';color:'+(c.id==='b2b'?c.color:'var(--text-muted,#888)')+';cursor:pointer;font-size:11px;font-weight:700;font-family:inherit" title="'+c.desc+'">'+c.label+' (×'+c.mk+')</button>';
        }).join('')
        +'<span id="_qc_note" style="font-size:10px;color:var(--text-muted,#888);margin-left:4px">Markup ×2.0 · Aziende</span>'
        +'<a onclick="App&&App.navigate(\'laser_b2b\')" style="margin-left:auto;padding:5px 10px;border-radius:7px;border:1px solid #fbbf2440;background:#fbbf2410;color:#fbbf24;cursor:pointer;font-size:10px;font-weight:700">💼 Laser B2B →</a>';
      ph.insertAdjacentElement('afterend',bar);
    }

    var t=0,iv=setInterval(function(){
      t++;if(t>120){clearInterval(iv);return;}
      if(typeof NavBus==='undefined'||!NavBus.on) return;
      clearInterval(iv);
      NavBus.on('quoter',function(){setTimeout(injectChannelBar,300);});
      if(typeof App!=='undefined'&&App.currentSection==='quoter') setTimeout(injectChannelBar,500);
    },300);
  })();

  /* ══════════════════════════════════════════════════════════
     NEW 4: PIPELINE KANBAN
     Simple drag & drop order tracking
  ══════════════════════════════════════════════════════════ */
  window.KanbanOS = (function(){
    var DB='ingly_kanban_v1';
    var COLS=[
      {id:'preventivo', label:'📋 Preventivo',color:'#6366f1'},
      {id:'lavoro',     label:'⚙️ In Lavoro',  color:'#f59e0b'},
      {id:'pronto',     label:'✅ Pronto',      color:'#10b981'},
      {id:'pagato',     label:'💰 Pagato',      color:'#22c55e'},
    ];
    function load(){return lsGet(DB,[]);}
    function save(d){lsSet(DB,d);}
    var _drag=null;

    function render(){
      var el=document.getElementById('view-kanban');
      if(!el){el=document.createElement('div');el.id='view-kanban';el.className='section-view';var ci=document.getElementById('content-inner');if(ci)ci.appendChild(el);}
      var cards=load();
      var paidVal=cards.filter(function(c){return c.colId==='pagato';}).reduce(function(s,c){return s+(c.value||0);},0);

      el.innerHTML='<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">'
        +'<div style="padding:12px 16px;background:var(--bg-card,#111115);border-bottom:1px solid var(--border,#2a2a35);display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
          +'<span style="font-size:18px">🗂️</span>'
          +'<div style="font-size:15px;font-weight:900;color:var(--text,#e8e8f0)">Pipeline Ordini</div>'
          +'<span style="font-size:11px;color:var(--text-muted,#888)">'+cards.filter(function(c){return c.colId!=='pagato';}).length+' attivi · incassato '+eu(paidVal)+'</span>'
          +'<button onclick="KanbanOS.addCard()" style="margin-left:auto;padding:7px 13px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700">+ Nuovo</button>'
        +'</div>'
        +'<div style="flex:1;overflow-x:auto;display:flex;gap:0;padding:12px">'
          +COLS.map(function(col){
            var cc=cards.filter(function(c){return c.colId===col.id;});
            var cv=cc.reduce(function(s,c){return s+(c.value||0);},0);
            return '<div id="kc_'+col.id+'" data-col="'+col.id+'" ondragover="event.preventDefault();this.style.background=\''+col.color+'10\'" ondragleave="this.style.background=\'\'" ondrop="KanbanOS._drop(event,\''+col.id+'\')" style="min-width:220px;max-width:260px;display:flex;flex-direction:column;margin:0 5px;background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:10px;overflow:hidden">'
              +'<div style="padding:9px 11px;background:'+col.color+'15;border-bottom:1px solid '+col.color+'30;display:flex;justify-content:space-between;align-items:center">'
                +'<span style="font-size:12px;font-weight:800;color:'+col.color+'">'+col.label+'</span>'
                +'<span style="font-size:10px;color:var(--text-muted,#888)">'+cc.length+(cv?' · '+eu(cv):'')+'</span>'
              +'</div>'
              +'<div style="flex:1;overflow-y:auto;padding:7px">'
                +cc.map(function(c){
                  return '<div id="kcard_'+c.id+'" draggable="true" ondragstart="KanbanOS._drag(event,\''+c.id+'\')" style="background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:8px;padding:9px;margin-bottom:6px;cursor:grab">'
                    +'<div style="font-size:12px;font-weight:700;color:var(--text,#e8e8f0);margin-bottom:3px">'+(c.name||'Ordine')+'</div>'
                    +(c.client?'<div style="font-size:10px;color:var(--text-muted,#888)">👤 '+c.client+'</div>':'')
                    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">'
                      +'<span style="font-size:13px;font-weight:700;color:'+col.color+'">'+(c.value?eu(c.value):'—')+'</span>'
                      +'<span style="font-size:9px;color:var(--text-muted,#888)">'+fdt(c.date)+'</span>'
                    +'</div>'
                    +'<div style="display:flex;gap:3px;margin-top:7px">'
                      +COLS.filter(function(nc){return nc.id!==col.id;}).slice(0,3).map(function(nc){
                        return '<button onclick="KanbanOS._move(\''+c.id+'\',\''+nc.id+'\')" style="flex:1;padding:3px;background:'+nc.color+'12;border:1px solid '+nc.color+'25;border-radius:5px;cursor:pointer;font-size:9px;color:'+nc.color+';font-weight:700;font-family:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">→'+nc.label.split(' ')[0]+'</button>';
                      }).join('')
                      +'<button onclick="KanbanOS._del(\''+c.id+'\')" style="padding:3px 6px;background:#ef444410;border:1px solid #ef444428;border-radius:5px;cursor:pointer;font-size:10px;color:#ef4444">🗑</button>'
                    +'</div>'
                    +'</div>';
                }).join('')
                +'<button onclick="KanbanOS.addCard(\''+col.id+'\')" style="width:100%;padding:6px;background:transparent;border:1px dashed var(--border,#2a2a35);border-radius:7px;color:var(--text-muted,#888);cursor:pointer;font-size:11px;margin-top:3px">+ Aggiungi</button>'
              +'</div>'
              +'</div>';
          }).join('')
        +'</div>'
        +'</div>';
    }

    function _cardModal(card,onSave){
      var isEdit=!!(card&&card.id);
      var ov=document.createElement('div');
      ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:16px';
      ov.innerHTML='<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:14px;padding:20px;width:380px;max-width:100%">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
          +'<span style="font-size:14px;font-weight:700;color:var(--text,#e8e8f0)">'+(isEdit?'✏️ Modifica':'📋 Nuovo')+'</span>'
          +'<button id="_km_x" style="background:none;border:none;cursor:pointer;color:var(--text-muted,#888);font-size:20px">×</button>'
        +'</div>'
        +'<div style="display:flex;flex-direction:column;gap:8px">'
          +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">Nome *</label><input id="_km_n" value="'+(card.name||'')+'" placeholder="es: Targhe B&B Roma" style="width:100%;box-sizing:border-box;padding:7px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px;outline:none"></div>'
          +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">Cliente</label><input id="_km_c" value="'+(card.client||'')+'" placeholder="Nome cliente" style="width:100%;box-sizing:border-box;padding:7px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px;outline:none"></div>'
          +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
            +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">Valore €</label><input id="_km_v" type="number" value="'+(card.value||0)+'" style="width:100%;box-sizing:border-box;padding:7px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px;outline:none"></div>'
            +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">Colonna</label><select id="_km_col" style="width:100%;padding:7px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px">'+COLS.map(function(c){return '<option value="'+c.id+'"'+(c.id===(card.colId||'preventivo')?' selected':'')+'>'+c.label+'</option>';}).join('')+'</select></div>'
          +'</div>'
        +'</div>'
        +'<div style="display:flex;gap:8px;margin-top:12px">'
          +'<button id="_km_cancel" style="flex:1;padding:8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:8px;cursor:pointer;color:var(--text-muted,#888);font-family:inherit">Annulla</button>'
          +'<button id="_km_save" style="flex:1;padding:8px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit">💾 Salva</button>'
        +'</div></div>';
      document.body.appendChild(ov);
      ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
      document.getElementById('_km_x').onclick=function(){ov.remove();};
      document.getElementById('_km_cancel').onclick=function(){ov.remove();};
      document.getElementById('_km_save').onclick=function(){
        var name=document.getElementById('_km_n').value.trim();
        if(!name){if(typeof toast!=='undefined')toast('Inserisci nome','error');return;}
        onSave(Object.assign({},card,{name,client:document.getElementById('_km_c').value||'',value:parseFloat(document.getElementById('_km_v').value)||0,colId:document.getElementById('_km_col').value||'preventivo'}));
        ov.remove();
      };
    }

    return {
      render,
      addCard:function(colId){_cardModal({colId:colId||'preventivo',date:new Date().toISOString()},function(c){c.id=uid();var d=load();d.unshift(c);save(d);render();if(typeof toast!=='undefined')toast('✅ '+c.name,'success');});},
      _drag:function(e,id){_drag=id;},
      _drop:function(e,colId){e.preventDefault();if(_drag){KanbanOS._move(_drag,colId);_drag=null;}document.querySelectorAll('[id^="kc_"]').forEach(function(el){el.style.background='';});},
      _move:function(id,colId){var d=load();var c=d.find(function(x){return x.id===id;});if(!c)return;c.colId=colId;save(d);render();var col=COLS.find(function(x){return x.id===colId;});if(typeof toast!=='undefined')toast((c.name||'Ordine')+' → '+(col?col.label:colId),'success');if(colId==='pagato'&&typeof InvestPlanner!=='undefined'&&InvestPlanner.processOrder)InvestPlanner.processOrder(id,c.value||0);},
      _del:function(id){if(!window.confirm('Eliminare?'))return;var d=load().filter(function(x){return x.id!==id;});save(d);render();},
    };
  })();

  /* ══════════════════════════════════════════════════════════
     NEW 5: Finance → InvestPlanner auto-accrue
  ══════════════════════════════════════════════════════════ */
    /* Finance hook: replaced by SyncEngine */
  /* ══════════════════════════════════════════════════════════
     NEW 6: Dashboard Goals widget
  ══════════════════════════════════════════════════════════ */
  ;(function hookDashboard(){
    var t=0,iv=setInterval(function(){
      t++;if(t>120){clearInterval(iv);return;}
      if(typeof Dashboard==='undefined') return;
      clearInterval(iv);
      if(typeof NavBus!=='undefined'&&NavBus.on){
        NavBus.on('dashboard',function(){setTimeout(_injectGoalsWidget,600);});
      }
      setTimeout(_injectGoalsWidget,1500);
    },300);

    function _injectGoalsWidget(){
      var dashEl=document.getElementById('view-dashboard');
      if(!dashEl||!dashEl.classList.contains('active')) return;
      if(document.getElementById('_v36_gw')) return;
      var kpisEl=document.getElementById('dashboard-kpis');
      if(!kpisEl) return;
      var goals=lsGet('ingly_goals_v1',[]).filter(function(g){return g.stato==='attivo'&&(g.total_cost||0)>0;});
      if(!goals.length) return;
      var sorted=goals.slice().sort(function(a,b){return ((b.capital||0)/(b.total_cost||1))-((a.capital||0)/(a.total_cost||1));}).slice(0,4);
      var w=document.createElement('div');w.id='_v36_gw';w.style.marginBottom='14px';
      w.innerHTML='<div class="card" style="padding:13px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px"><div style="font-size:13px;font-weight:800;color:var(--text)">🚀 Obiettivi di Crescita</div><button onclick="App&&App.navigate(\'goals\')" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--primary,#818cf8)">Tutti →</button></div>'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">'
        +sorted.map(function(g){
          var pct=g.total_cost>0?Math.min(100,Math.round((g.capital||0)/g.total_cost*100)):0;
          var miss=Math.max(0,(g.total_cost||0)-(g.capital||0));
          var bc=g.color||'#6366f1';
          return '<div style="background:var(--bg-card2);border-radius:8px;padding:9px;border:1px solid var(--border)">'
            +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">'
              +'<span style="font-size:15px">'+(g.icon||'🎯')+'</span>'
              +'<div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(g.name||'Obiettivo')+'</div></div>'
              +'<span style="font-size:12px;font-weight:700;color:'+(pct>=100?'#10b981':bc)+'">'+pct+'%</span>'
            +'</div>'
            +'<div style="height:4px;background:var(--border);border-radius:99px;overflow:hidden;margin-bottom:4px"><div style="height:100%;width:'+pct+'%;background:'+(pct>=100?'#10b981':bc)+';border-radius:99px;transition:.4s"></div></div>'
            +'<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-muted)"><span style="color:'+bc+'">'+eu(g.capital||0)+'</span>'+(miss>0?'<span>manca '+eu(miss)+'</span>':'<span style="color:#10b981">✅</span>')+'</div>'
            +'</div>';
        }).join('')+'</div></div>';
      kpisEl.insertAdjacentElement('afterend',w);
    }
  })();

  /* ══════════════════════════════════════════════════════════
     NEW 7: SDE 20s grace window
  ══════════════════════════════════════════════════════════ */
  ;(function sdeHarden(){
    var LOAD_TIME=Date.now(), GRACE=20000;
    new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.addedNodes.forEach(function(node){
          if(node.id!=='_sde_modal') return;
          if(Date.now()-LOAD_TIME<GRACE){
            console.log('[v36 SDE] False positive dismissed');
            setTimeout(function(){
              var modal=document.getElementById('_sde_modal');if(!modal)return;
              var btn=document.getElementById('_sde_takeover')||modal.querySelector('button');
              if(btn)btn.click();else modal.remove();
            },500);
          }
        });
      });
    }).observe(document.body,{childList:true,subtree:false});
  })();

  /* ══════════════════════════════════════════════════════════
     ADD KANBAN NAV ITEM & VIEW DIV
  ══════════════════════════════════════════════════════════ */
  ;(function addKanbanNav(){
    /* Add view-kanban div if missing */
    if(!document.getElementById('view-kanban')){
      var vg=document.getElementById('view-goals');
      if(vg){var kv=document.createElement('div');kv.id='view-kanban';kv.className='section-view';vg.insertAdjacentElement('afterend',kv);}
    }
    /* Add nav item */
    var t=0,iv=setInterval(function(){
      t++;if(t>60){clearInterval(iv);return;}
      var ng=document.getElementById('ng-pipeline');if(!ng)return;
      clearInterval(iv);
      if(document.querySelector('[data-section="kanban"]')) return;
      var items=ng.querySelector('.nav-group-items');if(!items)return;
      var kbItem=document.createElement('div');
      kbItem.className='nav-item';kbItem.setAttribute('data-section','kanban');
      kbItem.onclick=function(){if(typeof App!=='undefined')App.navigate('kanban');};
      kbItem.style.cssText='color:#22c55e;font-weight:700';
      kbItem.innerHTML='<i class="fas fa-columns"></i> 🗂️ Pipeline Kanban';
      items.insertBefore(kbItem,items.firstChild);
    },300);
  })();

  console.log('[INGLY v36] Improvements: BankFundsV2 · Toast · Quoter · Kanban · Finance · Dashboard · SDE ✅');

  /* ══ SPRINT 2 — Workspace Gestione Sezioni ════════════════════════════ */
  /* Registers 'workspace' as a navigable section that renders ModMgr inline */
  (function(){
    /* Wire into App section router */
    var _origRender = typeof renderSection === 'function' ? renderSection : null;
    /* Patch App.navigate to intercept 'workspace' */
    var _origNav = App.navigate.bind(App);
    App.navigate = function(sec){
      _origNav(sec);
      if(sec === 'workspace'){ setTimeout(WorkspaceManager.render.bind(WorkspaceManager), 80); }
    };

    window.WorkspaceManager = {
      render: function(){
        var el = document.getElementById('view-workspace');
        if(!el) return;
        var hidden  = (function(){ try{ return JSON.parse(localStorage.getItem('ingly_hidden_groups_v2')||'[]'); }catch{ return []; }})();
        var removed = (function(){ try{ return JSON.parse(localStorage.getItem('ingly_removed_sections_v1')||'[]'); }catch{ return []; }})();
        var custom  = (function(){ try{ return JSON.parse(localStorage.getItem('ingly_custom_sections_v1')||'[]'); }catch{ return []; }})();

        var groups = (typeof ModMgr !== 'undefined') ? ModMgr.GROUPS : [];
        var totalSecs = document.querySelectorAll('#sidebar-nav .nav-item[data-section]').length;
        var hiddenCount = hidden.length;
        var removedCount = removed.length;
        var customCount = custom.length;

        var groupRows = groups.map(function(g){
          var isHidden = hidden.indexOf(g.id) >= 0;
          var secEls = document.querySelectorAll('#'+g.id+' .nav-item[data-section]');
          var count = secEls.length;
          return '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;margin-bottom:8px;transition:.15s" onmouseover="this.style.borderColor=\'var(--border2)\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
            + '<span style="font-size:20px;flex-shrink:0">'+g.icon+'</span>'
            + '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:var(--text)">'+g.label+'</div>'
            + '<div style="font-size:11px;color:var(--text-dim);margin-top:2px">'+count+' sezioni</div></div>'
            + '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex-shrink:0">'
            + '<input type="checkbox" '+(isHidden?'':'checked')+' onchange="WorkspaceManager.toggleGroup(\''+g.id+'\',this.checked)" style="display:none">'
            + '<span style="display:inline-block;width:38px;height:21px;background:'+(isHidden?'var(--border2)':'var(--primary)')+';border-radius:99px;position:relative;transition:.2s" onclick="WorkspaceManager.toggleGroup(\''+g.id+'\','+isHidden+')">'
            + '<span style="position:absolute;top:2.5px;'+(isHidden?'left:2px':'left:19px')+';width:16px;height:16px;background:#fff;border-radius:50%;transition:.2s"></span></span>'
            + '<span style="font-size:11px;color:var(--text-muted)">'+(isHidden?'Nascosto':'Visibile')+'</span>'
            + '</label>'
            + '</div>';
        }).join('');

        var customRows = custom.length ? custom.map(function(s){
          return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;margin-bottom:6px">'
            + '<i class="'+(s.icon||'fas fa-circle')+'" style="color:'+(s.color||'var(--primary)')+'"></i>'
            + '<div style="flex:1;font-size:13px;font-weight:600;color:var(--text)">'+s.label+'</div>'
            + '<button onclick="App.navigate(\''+s.id+'\')" style="padding:4px 9px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:6px;color:var(--primary);font-size:10px;cursor:pointer;font-weight:700">Apri</button>'
            + '<button onclick="ModMgr.deleteCustom(\''+s.id+'\')" style="padding:4px 9px;background:#ef444415;border:1px solid #ef444430;border-radius:6px;color:var(--red);font-size:10px;cursor:pointer">Elimina</button>'
            + '</div>';
        }).join('') : '<div style="font-size:12px;color:var(--text-dim);padding:8px 0">Nessuna sezione custom. Creane una qui sotto.</div>';

        el.innerHTML = '<div style="padding:24px;max-width:900px">'
          /* Header */
          + '<div style="display:flex;align-items:center;gap:14px;margin-bottom:22px;flex-wrap:wrap">'
          + '<div style="width:46px;height:46px;border-radius:12px;background:var(--primary-dim);border:1px solid var(--primary-border);display:flex;align-items:center;justify-content:center;font-size:22px">⚙️</div>'
          + '<div style="flex:1"><div style="font-size:20px;font-weight:800;color:var(--text)">Gestione Sezioni</div>'
          + '<div style="font-size:12px;color:var(--text-muted);margin-top:2px">Attiva, nascondi, riordina e crea sezioni personalizzate</div></div>'
          + '<button onclick="ModMgr.open()" style="padding:8px 16px;background:var(--bg-card2);border:1px solid var(--border2);border-radius:9px;color:var(--text-muted);font-size:12px;cursor:pointer;font-weight:700;transition:.15s" onmouseover="this.style.borderColor=\'var(--primary)\'">🔧 Avanzato</button>'
          + '</div>'
          /* Stats */
          + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px">'
          + ['<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center"><div style="font-size:22px;font-weight:800;color:var(--text)">'+totalSecs+'</div><div style="font-size:11px;color:var(--text-muted)">Totale sezioni</div></div>',
             '<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center"><div style="font-size:22px;font-weight:800;color:var(--green)">'+(groups.length-hiddenCount)+'</div><div style="font-size:11px;color:var(--text-muted)">Gruppi attivi</div></div>',
             '<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center"><div style="font-size:22px;font-weight:800;color:var(--red)">'+hiddenCount+'</div><div style="font-size:11px;color:var(--text-muted)">Gruppi nascosti</div></div>',
             '<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center"><div style="font-size:22px;font-weight:800;color:var(--primary)">'+customCount+'</div><div style="font-size:11px;color:var(--text-muted)">Sezioni custom</div></div>'].join('')
          + '</div>'
          /* Groups */
          + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-dim);margin-bottom:10px">Gruppi Sidebar</div>'
          + groupRows
          /* Divider */
          + '<div style="height:1px;background:var(--border);margin:20px 0"></div>'
          /* Custom sections */
          + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-dim);margin-bottom:10px">Sezioni Personalizzate</div>'
          + customRows
          /* Add new */
          + '<div style="margin-top:16px;background:var(--bg-card2);border:1px solid var(--primary-border);border-radius:12px;padding:16px">'
          + '<div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:12px">+ Nuova Sezione Custom</div>'
          + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
          + '<input id="ws-new-label" placeholder="Nome sezione" class="form-control" style="font-size:12px">'
          + '<input id="ws-new-icon" placeholder="Icona (es. fas fa-star)" class="form-control" style="font-size:12px">'
          + '</div>'
          + '<button onclick="WorkspaceManager.addSection()" style="padding:8px 20px;background:var(--primary);border:none;border-radius:8px;color:#000;font-size:12px;font-weight:800;cursor:pointer">✅ Aggiungi</button>'
          + '</div>'
          /* Restore all */
          + '<div style="margin-top:14px;display:flex;gap:8px">'
          + '<button onclick="WorkspaceManager.showAll()" style="padding:7px 14px;background:var(--bg-card2);border:1px solid var(--border2);border-radius:8px;color:var(--text-muted);font-size:11px;cursor:pointer;transition:.15s">👁️ Mostra tutti i gruppi</button>'
          + '<button onclick="WorkspaceManager.hideAll()" style="padding:7px 14px;background:var(--bg-card2);border:1px solid var(--border2);border-radius:8px;color:var(--text-muted);font-size:11px;cursor:pointer;transition:.15s">🙈 Nascondi tutti</button>'
          + '</div>'
          + '</div>';
      },

      toggleGroup: function(groupId, makeVisible){
        if(typeof ModMgr === 'undefined') return;
        var h = ModMgr.getHidden();
        var idx = h.indexOf(groupId);
        if(makeVisible){ if(idx>=0) h.splice(idx,1); }
        else { if(idx<0) h.push(groupId); }
        ModMgr.setHidden(h);
        ModMgr._apply();
        this.render();
        toast(makeVisible ? 'Gruppo visibile' : 'Gruppo nascosto', 'info');
      },

      showAll: function(){
        if(typeof ModMgr === 'undefined') return;
        ModMgr.setHidden([]);
        ModMgr._apply();
        this.render();
        toast('Tutti i gruppi visibili', 'success');
      },

      hideAll: function(){
        if(typeof ModMgr === 'undefined') return;
        var allIds = ModMgr.GROUPS.map(function(g){ return g.id; });
        ModMgr.setHidden(allIds);
        ModMgr._apply();
        this.render();
        toast('Tutti i gruppi nascosti', 'info');
      },

      addSection: function(){
        var label = (document.getElementById('ws-new-label')||{}).value||'';
        var icon  = (document.getElementById('ws-new-icon')||{}).value||'fas fa-circle';
        if(!label.trim()){ toast('Inserisci un nome','warning'); return; }
        if(typeof ModMgr === 'undefined'){ toast('ModMgr non disponibile','error'); return; }
        var id = 'custom_'+Date.now();
        var customs = ModMgr.getCustom();
        customs.push({id:id, label:label.trim(), icon:icon.trim()||'fas fa-circle', group:'ng-ops'});
        ModMgr.setCustom(customs);
        ModMgr._apply();
        this.render();
        toast('✅ Sezione "'+label+'" aggiunta!', 'success');
      }
    };

    console.log('[SPRINT 2] WorkspaceManager: Gestione Sezioni workspace ✅');
  })();
})();

