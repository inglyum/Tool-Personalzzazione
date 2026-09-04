
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v37b — Task Force FINAL · Remaining 24 Items
// Part 1: LaserB2B Storico · Template Lavori · Confronto Macchine
//         Preventivo→Ordine · Checklist Produzione · Gantt
// ═══════════════════════════════════════════════════════════════════

// ─── LASER B2B: STORICO CALCOLI ──────────────────────────────────
window.LaserCalcHistory = {
  _SK: 'ingly_calc_history_v1',
  load: function(){ try{return JSON.parse(localStorage.getItem(this._SK)||'[]');}catch(e){return[];} },
  save: function(d){ try{localStorage.setItem(this._SK,JSON.stringify(d.slice(0,50)));}catch(e){} },
  add: function(calc){
    var d=this.load();
    d.unshift({
      id:Date.now(),date:new Date().toISOString(),
      product:calc.p?.name||'',machine:calc.m?.label||'',
      qty:calc.qty,sides:calc.sides,markup:calc.markup,
      cp:+(calc.cp||0).toFixed(4),fp:+(calc.fp||0).toFixed(4),
      mg:calc.mg,total:+(calc.total||0).toFixed(2)
    });
    this.save(d);
  },
  show: function(){
    var d=this.load();
    var w=window.open('','_blank','width=820,height=520');
    if(!w){if(typeof toast!=='undefined')toast('Abilita popup','info');return;}
    var rows=d.map(function(c){
      var dt=new Date(c.date||Date.now()).toLocaleDateString('it',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
      var mgc=c.mg>=60?'#22c55e':c.mg>=35?'#f59e0b':'#ef4444';
      return '<tr style="border-bottom:1px solid #1e293b">'
        +'<td style="padding:7px 10px;font-size:10px;color:#64748b">'+dt+'</td>'
        +'<td style="padding:7px 10px;font-size:11px;color:#f1f5f9">'+( c.product||'').slice(0,28)+'</td>'
        +'<td style="padding:7px 10px;font-size:10px;color:#94a3b8">'+( c.machine||'').slice(0,18)+'</td>'
        +'<td style="padding:7px 10px;text-align:center">'+c.qty+'</td>'
        +'<td style="padding:7px 10px;text-align:center;font-size:10px">'+( c.sides==='both'?'F+R':c.sides==='back'?'Retro':'Fronte')+'</td>'
        +'<td style="padding:7px 10px;text-align:right;color:#6366f1">×'+( c.markup||2).toFixed(1)+'</td>'
        +'<td style="padding:7px 10px;text-align:right;color:#94a3b8">€'+(c.cp||0).toFixed(2)+'</td>'
        +'<td style="padding:7px 10px;text-align:right;font-weight:700;color:#f1f5f9">€'+(c.fp||0).toFixed(2)+'</td>'
        +'<td style="padding:7px 10px;text-align:right;font-weight:800;color:#10b981">€'+(c.total||0).toFixed(0)+'</td>'
        +'<td style="padding:7px 10px;text-align:center"><span style="color:'+mgc+';font-weight:700">'+c.mg+'%</span></td>'
        +'<td style="padding:7px 10px"><button onclick="LaserCalcHistory._reuse('+c.id+')" style="padding:3px 8px;background:rgba(99,102,241,.12);color:#818cf8;border:1px solid rgba(99,102,241,.25);border-radius:5px;cursor:pointer;font-size:9px">↩ Riusa</button></td>'
        +'</tr>';
    }).join('');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>⏱ Storico Calcoli Laser</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;font-size:13px}'
      +'table{width:100%;border-collapse:collapse}th{background:#1e293b;padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;white-space:nowrap}'
      +'</style></head><body>'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
      +'<div><h2 style="font-size:17px;font-weight:900">⏱ Storico Calcoli Laser</h2>'
      +'<p style="font-size:11px;color:#64748b">'+d.length+' calcoli salvati · ultimi 50</p></div>'
      +'<button onclick="if(confirm(\'Svuotare lo storico?\'))localStorage.removeItem(\'ingly_calc_history_v1\');close()" style="padding:7px 14px;background:#ef444420;color:#ef4444;border:1px solid #ef444430;border-radius:7px;cursor:pointer;font-size:11px">🗑 Svuota</button>'
      +'</div>'
      +'<table><thead><tr><th>Data</th><th>Prodotto</th><th>Macchina</th><th>Qty</th><th>Lati</th><th>Markup</th><th>Costo/pz</th><th>Prezzo/pz</th><th>Totale</th><th>Mg%</th><th></th></tr></thead>'
      +'<tbody>'+(rows||'<tr><td colspan="11" style="text-align:center;padding:30px;color:#64748b">Nessun calcolo ancora</td></tr>')+'</tbody></table>'
      +'<button onclick="close()" style="margin-top:14px;padding:8px 16px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:7px;cursor:pointer">Chiudi</button>'
      +'</body></html>');
    w.document.close();
  },
  _reuse: function(id){
    var d=this.load(); var c=d.find(function(x){return x.id===id;});
    if(!c) return;
    alert('Per riusare: seleziona "'+c.product+'" dal catalogo e imposta qty='+c.qty+', markup=×'+c.markup);
  }
};
// Auto-save on LaserB2B calc
(function _hookCalcHistory(){
  function _p(){
    if(typeof LaserB2B==='undefined'||!LaserB2B._v32pro){setTimeout(_p,600);return;}
    if(LaserB2B._v37bhist) return; LaserB2B._v37bhist=true;
    var _orig=LaserB2B.saveQuote?.bind(LaserB2B);
    if(_orig){ LaserB2B.saveQuote=function(){
      var d=this._calcV32&&this._calcV32(); if(d) LaserCalcHistory.add(Object.assign({},d,{markup:this._cfgV32?.markup||2}));
      return _orig.apply(this,arguments);
    };}
    // Add history button to LaserB2B view
    var _origRender=LaserB2B.render.bind(LaserB2B);
    LaserB2B.render=function(){
      _origRender();
      setTimeout(function(){
        var el=document.getElementById('view-laser_b2b');
        if(!el||el.querySelector('.hist-btn-lb')) return;
        var hdrBtns=el.querySelector('[onclick*="_openMachineManager32"]')?.parentElement;
        if(hdrBtns){
          var btn=document.createElement('button'); btn.className='hist-btn-lb btn-v37 btn-ghost';
          btn.style.cssText='padding:7px 12px;background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:11px;font-weight:700';
          btn.innerHTML='⏱ Storico';
          btn.onclick=function(){LaserCalcHistory.show();};
          hdrBtns.appendChild(btn);
        }
      },400);
    };
  }
  setTimeout(_p,1500);
})();

// ─── LASER B2B: TEMPLATE LAVORI ──────────────────────────────────
window.LaserTemplates = {
  _SK: 'ingly_laser_templates_v1',
  DEFAULTS: [
    {id:'t_pk_bambu_100',name:'Portachiavi Bambù ×100',icon:'🎋',machine:'xtool_f2',sides:'front',markup:2.0,labor:18,pack:0.3,channel:'b2b',note:'Standard B2B · Consegna 3gg'},
    {id:'t_tazza_12',name:'Tazze Sub ×12',icon:'☕',machine:'epson_et2865',sides:'front',markup:3.5,labor:18,pack:0.5,channel:'retail',note:'Sub coating · 30min totali'},
    {id:'t_targa_inox_50',name:'Targhe Inox ×50',icon:'⬜',machine:'xtool_f2',sides:'front',markup:3.0,labor:18,pack:0.8,channel:'b2b',note:'IR 5W · 2min/pz'},
    {id:'t_tagliere_10',name:'Taglieri Bambù ×10',icon:'🔪',machine:'xtool_p3_co2_80w',sides:'front',markup:2.5,labor:18,pack:1.2,channel:'retail',note:'Alta qualità · Bomboniera'},
  ],
  load: function(){try{var s=JSON.parse(localStorage.getItem(this._SK)||'null');return s||this.DEFAULTS;}catch(e){return this.DEFAULTS;}},
  save: function(d){try{localStorage.setItem(this._SK,JSON.stringify(d));}catch(e){}},
  applyTemplate: function(tpl){
    if(typeof LaserB2B==='undefined') return;
    var cfg=LaserB2B._cfgV32||{};
    if(tpl.machine) cfg.machine=tpl.machine;
    if(tpl.sides) cfg.sides=tpl.sides;
    if(tpl.markup) cfg.markup=parseFloat(tpl.markup);
    if(tpl.labor) cfg.labor=parseFloat(tpl.labor);
    if(tpl.pack) cfg.pack=parseFloat(tpl.pack);
    if(tpl.channel) cfg.channel=tpl.channel;
    LaserB2B._cfgV32=cfg;
    if(LaserB2B.render) LaserB2B.render();
    if(typeof toast!=='undefined') toast('📋 Template "'+tpl.name+'" applicato','success');
  },
  openManager: function(){
    var templates=this.load(); var self=this;
    var w=window.open('','_blank','width=750,height=500');
    if(!w){if(typeof toast!=='undefined')toast('Abilita popup','info');return;}
    function _logic(){
      var tpls=window._tpls||[];
      window.applyTpl=function(i){
        var t=tpls[i]; if(!t) return;
        window.opener&&window.opener.LaserTemplates&&window.opener.LaserTemplates.applyTemplate(t);
        close();
      };
      window.delTpl=function(i){
        if(!confirm('Eliminare template?')) return;
        tpls.splice(i,1); localStorage.setItem('ingly_laser_templates_v1',JSON.stringify(tpls));
        document.getElementById('tpl-list').innerHTML=buildRows();
      };
      function buildRows(){
        return tpls.map(function(t,i){
          return '<tr style="border-bottom:1px solid #1e293b">'
            +'<td style="padding:8px 10px;font-size:18px">'+t.icon+'</td>'
            +'<td style="padding:8px 10px;font-weight:700;color:#f1f5f9">'+t.name+'</td>'
            +'<td style="padding:8px 10px;font-size:10px;color:#94a3b8">'+t.machine+'</td>'
            +'<td style="padding:8px 10px;font-size:10px;color:#94a3b8">'+( t.sides==='both'?'F+R':'Fronte')+'</td>'
            +'<td style="padding:8px 10px;font-weight:700;color:#6366f1">×'+t.markup+'</td>'
            +'<td style="padding:8px 10px;font-size:10px;color:#64748b">'+( t.note||'')+'</td>'
            +'<td style="padding:8px 10px"><button onclick="applyTpl('+i+')" style="padding:4px 9px;background:#22c55e20;color:#22c55e;border:1px solid #22c55e30;border-radius:5px;cursor:pointer;font-size:10px;font-weight:700">▶ Applica</button>'
            +' <button onclick="delTpl('+i+')" style="padding:4px 7px;background:#ef444415;color:#ef4444;border:1px solid #ef444430;border-radius:5px;cursor:pointer;font-size:10px">✕</button></td>'
            +'</tr>';
        }).join('');
      }
      document.getElementById('tpl-list').innerHTML=buildRows();
    }
    w._tpls=templates;
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>📋 Template Lavori</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;font-size:13px}table{width:100%;border-collapse:collapse}th{background:#1e293b;padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase}</style></head><body>'
      +'<h2 style="font-size:17px;font-weight:900;margin-bottom:4px">📋 Template Lavori Laser</h2>'
      +'<p style="font-size:11px;color:#64748b;margin-bottom:14px">Configurazioni predefinite per lavori ripetuti · click Applica per caricare in LaserB2B</p>'
      +'<table><thead><tr><th></th><th>Template</th><th>Macchina</th><th>Lati</th><th>Markup</th><th>Note</th><th>Azioni</th></tr></thead><tbody id="tpl-list"></tbody></table>'
      +'<button onclick="close()" style="margin-top:14px;padding:8px 16px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:7px;cursor:pointer">Chiudi</button>'
      +'</body></html>');
    w.document.close();
    var sc=w.document.createElement('script'); sc.textContent='('+_logic.toString()+')()'; w.document.head.appendChild(sc);
  }
};

// ─── LASER B2B: CONFRONTO MACCHINE ───────────────────────────────
window.MachineCompare = {
  show: function(productId, qty){
    if(typeof LaserB2B==='undefined') return;
    var p=(LaserB2B._PRODUCTS||[]).find(function(x){return x.id===productId||!productId;});
    if(!p){if(typeof toast!=='undefined')toast('Seleziona prima un prodotto','info');return;}
    qty=qty||1;
    var machines=LaserB2B._MACHINES||{};
    var cfg=LaserB2B._cfgV32||{};
    var results=Object.entries(machines).map(function(kv){
      var mk=kv[0]; var m=kv[1];
      var sd=qty>=50?.20:qty>=25?.15:qty>=10?.10:0;
      var mc=(p.costSup||p.cost||0)*(1-sd);
      var tm=((p.timeMin||1.5)*(cfg.sides==='both'?2:1));
      var mhc=(m.hourly+(m.energyH||m.energyHourly||0))/60*tm;
      var lc=(cfg.labor||18)/60*tm;
      var cp=mc+mhc+lc+(cfg.pack||0.3);
      var fp=Math.max(15,cp*(cfg.markup||2));
      var mg=fp>0?Math.round((fp-cp)/fp*100):0;
      return {mk:mk,m:m,cp:cp,fp:fp,mg:mg,tm:tm};
    }).sort(function(a,b){return a.fp-b.fp});
    var cheapest=results[0]?.mk;
    var w=window.open('','_blank','width=760,height=420');
    if(!w) return;
    var rows=results.map(function(r){
      var mgc=r.mg>=60?'#22c55e':r.mg>=35?'#f59e0b':'#ef4444';
      var isBest=r.mk===cheapest;
      return '<tr style="border-bottom:1px solid #1e293b;'+(isBest?'background:rgba(34,197,94,.04)':'')+'">'
        +'<td style="padding:8px 10px;font-size:16px">'+r.m.icon+'</td>'
        +'<td style="padding:8px 10px;font-weight:'+(isBest?'800':'600')+';color:'+(isBest?'#22c55e':'#f1f5f9')+'">'+r.m.label+'</td>'
        +'<td style="padding:8px 10px;text-align:right;color:#94a3b8">'+r.tm.toFixed(1)+'min</td>'
        +'<td style="padding:8px 10px;text-align:right;color:#64748b">€'+r.cp.toFixed(4)+'</td>'
        +'<td style="padding:8px 10px;text-align:right;font-weight:800;color:#6366f1">€'+r.fp.toFixed(2)+'</td>'
        +'<td style="padding:8px 10px;text-align:right;font-weight:700;color:#10b981">€'+(r.fp*qty).toFixed(2)+'</td>'
        +'<td style="padding:8px 10px;text-align:center"><span style="color:'+mgc+';font-weight:700">'+r.mg+'%</span></td>'
        +(isBest?'<td style="padding:8px 10px"><span style="background:#22c55e20;color:#22c55e;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700">✅ MIGLIORE</span></td>':'<td></td>')
        +'</tr>';
    }).join('');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>🔀 Confronto Macchine</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;font-size:13px}table{width:100%;border-collapse:collapse}th{background:#1e293b;padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase}</style></head><body>'
      +'<h2 style="font-size:17px;font-weight:900;margin-bottom:4px">🔀 Confronto Macchine</h2>'
      +'<p style="font-size:11px;color:#64748b;margin-bottom:14px"><strong>'+p.name+'</strong> · Qty: '+qty+' · Markup ×'+(cfg.markup||2).toFixed(1)+'</p>'
      +'<table><thead><tr><th></th><th>Macchina</th><th>Tempo/pz</th><th>Costo/pz</th><th>Prezzo/pz</th><th>Totale '+qty+'pz</th><th>Margine</th><th></th></tr></thead>'
      +'<tbody>'+rows+'</tbody></table>'
      +'<button onclick="close()" style="margin-top:14px;padding:8px 16px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:7px;cursor:pointer">Chiudi</button>'
      +'</body></html>');
    w.document.close();
  }
};

// Add Template + Compare + History buttons to LaserB2B calc panel
(function _injectLaserExtras(){
  function _p(){
    if(typeof LaserB2B==='undefined'||!LaserB2B._v32pro){setTimeout(_p,700);return;}
    if(LaserB2B._v37bextras) return; LaserB2B._v37bextras=true;
    var _origCalc=LaserB2B._renderCalc32?.bind(LaserB2B);
    if(!_origCalc) return;
    LaserB2B._renderCalc32=function(){
      _origCalc();
      setTimeout(function(){ if(typeof LaserB2B._loadClients32==='function') LaserB2B._loadClients32(); },50);
      setTimeout(function(){
        var calc=document.getElementById('lb2b-calc32'); if(!calc) return;
        if(calc.querySelector('.lb2b-extras-v37b')) return;
        var div=document.createElement('div'); div.className='lb2b-extras-v37b';
        div.style.cssText='display:flex;gap:6px;margin-top:8px;flex-wrap:wrap';
        div.innerHTML=[
          {label:'📋 Template',action:"LaserTemplates.openManager()"},
          {label:'🔀 Confronta Macchine',action:"MachineCompare.show(LaserB2B._selProduct?.id,LaserB2B._selQty||1)"},
          {label:'⏱ Storico',action:"LaserCalcHistory.show()"},
        ].map(function(b){
          return '<button onclick="'+b.action+'" style="padding:7px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted);font-weight:600">'+b.label+'</button>';
        }).join('');
        var actionBtns=calc.querySelector('[style*="action buttons"], div:last-child');
        if(actionBtns) calc.insertBefore(div,actionBtns);
        else calc.appendChild(div);
      },200);
    };
  }
  setTimeout(_p,2000);
})();

// ─── PREVENTIVO → ORDINE DIRETTO ─────────────────────────────────
window.PreventivToOrder = {
  convert: function(quoteId){
    var quotes=[]; try{quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');}catch(e){}
    var q=quotes.find(function(x){return String(x.id)===String(quoteId);});
    if(!q){if(typeof toast!=='undefined')toast('Preventivo non trovato','error');return;}
    var description=q.products?q.products.map(function(p){return p.qty+'x '+p.desc;}).join(', '):(q.product||'');
    var newOrder={
      id:Date.now(),created:new Date().toISOString(),
      client:q.client,phone:q.phone||'',
      description:description.slice(0,120),
      product:q.product||'',
      total:parseFloat(q.total||0),
      status:'confirmed',
      channel:q.channel||'b2b',
      quoteId:q.id, // Link back to quote
      notes:'Creato da preventivo #'+String(q.id).slice(-4)
    };
    /* L'ordine nasceva in `ingly_orders_pro_v1`: esisteva, aveva un numero,
       e Ordini non lo vedeva. Ora nasce nello store canonico. La traduzione
       degli stati non è ricopiata qui — la possiede la migrazione, che è
       l'unico posto in cui quella tabella vive. */
    if(window.InglyMigrazioneOrderTracker && window.IDB){
      window.InglyMigrazioneOrderTracker.aggiungi(window.IDB, newOrder)
        .then(function(r){
          if(!r.creato && typeof toast!=='undefined') toast('Questo preventivo aveva già un ordine: #'+r.ordine.id,'info');
        })
        .catch(function(e){
          if(window.Ingly&&window.Ingly.Errors) window.Ingly.Errors.log('preventivo → ordine', e);
          if(typeof toast!=='undefined') toast('Ordine non salvato: '+((e&&e.message)||e),'error');
        });
    }
    // Mark quote as confirmed
    q.status='confirmed'; q.orderId=newOrder.id;
    try{localStorage.setItem('lb2b_quotes_v1',JSON.stringify(quotes));}catch(e){}
    if(typeof toast!=='undefined') toast('📦 Ordine #'+String(newOrder.id).slice(-4)+' creato da preventivo · '+q.client+' · €'+q.total,'success');
    CommHistory&&CommHistory.add(q.client,'order','Ordine da preventivo · €'+q.total,q.total);
    if(typeof window._inglyLastSave==='function') window._inglyLastSave('Ordine creato');
    return newOrder;
  }
};

// Inject "Converti in Ordine" in PreventivoArchivio
(function _patchArchivioConvert(){
  function _p(){
    if(typeof PreventivoArchivio==='undefined'){setTimeout(_p,700);return;}
    if(PreventivoArchivio._v37bconv) return; PreventivoArchivio._v37bconv=true;
    var _orig=PreventivoArchivio.openForClient.bind(PreventivoArchivio);
    PreventivoArchivio.openForClient=function(clientName){
      _orig(clientName);
      // After window opens, the rows have a _del button — we add convert button too
      // But since it's a popup, we patch it via the HTML string approach
    };
    // Override _del to also show in the open window
    var _origOpen=PreventivoArchivio.openForClient.bind(PreventivoArchivio);
    PreventivoArchivio.openForClient=function(clientName){
      var quotes=[]; try{quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');}catch(e){}
      var cliQuotes=clientName?quotes.filter(function(q){return q.client===clientName;}):quotes;
      cliQuotes.sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});
      var w=window.open('','_blank','width=860,height=600');
      if(!w){if(typeof toast!=='undefined')toast('Abilita popup','info');return;}
      var rows=cliQuotes.map(function(q){
        var dt=new Date(q.date||Date.now()).toLocaleDateString('it',{day:'2-digit',month:'2-digit',year:'2-digit'});
        var sc={draft:'#64748b',confirmed:'#3b82f6',paid:'#22c55e',cancelled:'#ef4444'};
        var sc2=sc[q.status||'draft']||'#64748b';
        var prods=(q.products&&Array.isArray(q.products))?q.products.map(function(p){return p.desc||p.name;}).join(', '):(q.product||'');
        var hasOrder=!!q.orderId;
        return '<tr style="border-bottom:1px solid #1e293b">'
          +'<td style="padding:8px 10px;font-size:10px;color:#64748b">'+dt+'</td>'
          +'<td style="padding:8px 10px;font-weight:700">'+q.client+'</td>'
          +'<td style="padding:8px 10px;font-size:10px;color:#94a3b8;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+prods.slice(0,50)+'</td>'
          +'<td style="padding:8px 10px;font-weight:800;color:#6366f1">€'+(q.total||0).toFixed(2)+'</td>'
          +'<td style="padding:8px 10px"><span style="background:'+sc2+'20;color:'+sc2+';padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700">'+(q.status||'draft')+'</span>'
          +(hasOrder?'<span style="background:#10b98120;color:#10b981;padding:2px 7px;border-radius:10px;font-size:9px;margin-left:4px">📦 Ordine</span>':'')
          +'</td>'
          +'<td style="padding:8px 10px;white-space:nowrap">'
          +(hasOrder?'':'<button onclick="window.opener&&window.opener.PreventivToOrder&&window.opener.PreventivToOrder.convert('+q.id+')" style="padding:3px 8px;background:rgba(16,185,129,.12);color:#10b981;border:1px solid rgba(16,185,129,.25);border-radius:5px;cursor:pointer;font-size:9px;font-weight:700;margin-right:4px">📦 → Ordine</button>')
          +'<button data-qi="'+qi+'" class="reuse-btn" style="padding:3px 8px;background:rgba(99,102,241,.12);color:#818cf8;border:1px solid rgba(99,102,241,.25);border-radius:5px;cursor:pointer;font-size:9px;font-weight:700;margin-right:4px">&#9851; Riusa</button>'
          +'<button onclick="document.getElementById(\'del_'+q.id+'\').style.display=\'inline\'" style="padding:3px 6px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:5px;cursor:pointer;font-size:10px">🗑</button>'
          +'<button id="del_'+q.id+'" onclick="window.opener&&window.opener.PreventivoArchivio&&window.opener.PreventivoArchivio._del('+q.id+')" style="display:none;padding:3px 6px;background:#ef4444;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:9px;margin-left:3px;font-weight:700">Conferma</button>'
          +'</td></tr>';
      }).join('');
      w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>📂 Archivio Preventivi</title>'
        +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;font-size:13px}table{width:100%;border-collapse:collapse}th{background:#1e293b;padding:9px 12px;text-align:left;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase}</style></head><body>'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
        +'<div><h2 style="font-size:16px;font-weight:900">📂 Archivio Preventivi'+(clientName?' — '+clientName:'')+'</h2>'
        +'<p style="font-size:11px;color:#64748b">'+cliQuotes.length+' preventivi · "→ Ordine" converte il preventivo in ordine confermato</p></div></div>'
        +'<table><thead><tr><th>Data</th><th>Cliente</th><th>Prodotti</th><th>Totale</th><th>Status</th><th>Azioni</th></tr></thead>'
        +'<tbody>'+(rows||'<tr><td colspan="6" style="text-align:center;padding:30px;color:#64748b">Nessun preventivo trovato</td></tr>')+'</tbody></table>'
        +'<button onclick="close()" style="margin-top:14px;padding:9px 18px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:8px;cursor:pointer">Chiudi</button>'
        +'</body></html>');
      w.document.close();
    };
  }
  setTimeout(_p,2000);
})();

// ─── ORDINI: CHECKLIST PRODUZIONE ────────────────────────────────
window.OrderChecklist = {
  _SK: 'ingly_order_checklists_v1',
  TEMPLATES: {
    default: ['✏️ Ricevi file grafica','🎨 Approvazione cliente','⚙️ Setup macchina','🖨️ Test di prova','📦 Produzione serie','🔍 Controllo qualità','📬 Imballaggio','✅ Consegnato / Spedito'],
    laser:   ['📐 Misure verificate','🗂️ File vettoriale ok (SVG/DXF)','🖥️ Import LightBurn','⚡ Potenza/velocità calibrata','🎋 Materiale preparato','🧪 Test su scarto','🏭 Produzione','🔍 QC visivo','📦 Imballaggio'],
    sub:     ['🎨 File stampa 300dpi','🖨️ Stampa sublimazione','♨️ Pressa 200°C/60sec','🔍 Controllo colori','📦 Imballaggio singolo'],
    dtf:     ['🎨 File DTF preparato','🖨️ Stampa film','🌡️ Polvere hot-melt','♨️ Pressa 160°C/25sec','🧲 Test lavaggio','📦 Confezionamento'],
  },
  get: function(orderId){ try{var d=JSON.parse(localStorage.getItem(this._SK)||'{}'); return d[String(orderId)]||null;}catch(e){return null;} },
  set: function(orderId, items){ try{var d=JSON.parse(localStorage.getItem(this._SK)||'{}'); d[String(orderId)]=items; localStorage.setItem(this._SK,JSON.stringify(d));}catch(e){} },
  open: function(orderId, orderClient, orderDesc){
    var existing=this.get(orderId);
    var items=existing||this.TEMPLATES.default.map(function(label){return {label:label,done:false};});
    var w=window.open('','_blank','width=520,height=560');
    if(!w){if(typeof toast!=='undefined')toast('Abilita popup','info');return;}
    w._items=items; w._orderId=orderId;
    function _logic(){
      var items=window._items||[]; var oid=window._orderId;
      function render(){
        var done=items.filter(function(i){return i.done;}).length;
        var pct=items.length?Math.round(done/items.length*100):0;
        document.getElementById('progress-bar').style.width=pct+'%';
        document.getElementById('progress-txt').textContent=done+'/'+items.length+' ('+pct+'%)';
        document.getElementById('checklist-items').innerHTML=items.map(function(it,i){
          return '<div style="display:flex;align-items:center;gap:10px;padding:9px;background:'+(it.done?'rgba(34,197,94,.06)':'#1e293b')+';border-radius:8px;margin-bottom:4px;cursor:pointer" onclick="toggle('+i+')">'
            +'<div style="width:20px;height:20px;border-radius:50%;border:2px solid '+(it.done?'#22c55e':'#334155')+';background:'+(it.done?'#22c55e':'transparent')+';display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0">'+(it.done?'✓':'')+'</div>'
            +'<span style="font-size:12px;color:'+(it.done?'#22c55e':'#f1f5f9')+';'+(it.done?'text-decoration:line-through':'')+'">'+it.label+'</span>'
            +'</div>';
        }).join('');
      }
      window.toggle=function(i){items[i].done=!items[i].done; render(); save();};
      window.save=function(){localStorage.setItem('ingly_order_checklists_v1',JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('ingly_order_checklists_v1')||'{}'),{[String(oid)]:items})));};
      render();
    }
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>✅ Checklist Produzione</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;font-size:13px}</style></head><body>'
      +'<h2 style="font-size:16px;font-weight:900;margin-bottom:2px">✅ Checklist Produzione</h2>'
      +'<p style="font-size:11px;color:#64748b;margin-bottom:12px">'+(orderClient||'')+(orderDesc?' · '+(orderDesc||'').slice(0,40):'')+'</p>'
      +'<div style="background:#1e293b;border-radius:8px;height:8px;margin-bottom:6px"><div id="progress-bar" style="background:linear-gradient(90deg,#22c55e,#10b981);height:8px;border-radius:8px;width:0%;transition:.3s"></div></div>'
      +'<div id="progress-txt" style="font-size:10px;color:#64748b;margin-bottom:12px">0/0</div>'
      +'<div id="checklist-items"></div>'
      +'<button onclick="close()" style="margin-top:14px;padding:9px 18px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:7px;cursor:pointer;width:100%">Chiudi</button>'
      +'</body></html>');
    w.document.close();
    var sc=w.document.createElement('script'); sc.textContent='('+_logic.toString()+')()'; w.document.head.appendChild(sc);
  }
};

// Inject checklist button into OrderTracker rows
(function _injectChecklist(){
  function _p(){
    if(typeof OrderTracker==='undefined'){setTimeout(_p,700);return;}
    if(OrderTracker._v37checklist) return; OrderTracker._v37checklist=true;
    var _orig=OrderTracker.render.bind(OrderTracker);
    OrderTracker.render=function(){
      _orig();
      setTimeout(function(){
        var orders=[]; try{orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');}catch(e){}
        orders.forEach(function(o,i){
          var row=document.querySelector('#view-order_tracker tbody tr:nth-child('+(i+1)+')');
          if(!row||row.querySelector('.chk-btn')) return;
          var cell=row.querySelector('td:last-child div,td:last-child');
          if(!cell) return;
          var existing=OrderChecklist.get(o.id);
          var done=existing?existing.filter(function(x){return x.done;}).length:0;
          var total=existing?existing.length:0;
          var btn=document.createElement('button'); btn.className='chk-btn';
          btn.style.cssText='padding:3px 8px;background:rgba(20,184,166,.1);color:#14b8a6;border:1px solid rgba(20,184,166,.25);border-radius:5px;cursor:pointer;font-size:10px;margin-right:2px;font-weight:700';
          btn.innerHTML='✅'+(total?done+'/'+total:'');
          btn.title='Checklist produzione';
          btn.onclick=(function(ord){return function(e){e.stopPropagation();OrderChecklist.open(ord.id,ord.client,ord.description||ord.product);};})(o);
          if(cell.insertBefore&&cell.firstChild) cell.insertBefore(btn,cell.firstChild);
          else if(cell.appendChild) cell.appendChild(btn);
        });
      },300);
    };
  }
  setTimeout(_p,2000);
})();

console.log('[v37b-P1] Storico calcoli · Template lavori · Confronto macchine · Preventivo→Ordine · Checklist ✅');

