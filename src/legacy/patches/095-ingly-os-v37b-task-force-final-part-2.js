
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v37b — Task Force FINAL · Part 2
// CRM: Merge Duplicati · Segmentazione · Campi custom
// Magazzino: Fabbisogno · Storico movimenti
// Cloud: Auto-sync · Brand logo upload
// Pipeline: Valore € · Export commercialista · WA scheduling
// ═══════════════════════════════════════════════════════════════════

// ─── CRM: MERGE DUPLICATI ────────────────────────────────────────
window.CRMMerge = {
  findDuplicates: function(){
    var clients=[]; try{clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');}catch(e){}
    var groups=[]; var used=new Set();
    clients.forEach(function(c,i){
      if(used.has(i)) return;
      var matches=[i];
      var nameA=(c.name||'').toLowerCase().replace(/\s+/g,' ').trim();
      var phoneA=(c.phone||'').replace(/\D/g,'').slice(-9);
      clients.forEach(function(d,j){
        if(i===j||used.has(j)) return;
        var nameB=(d.name||'').toLowerCase().replace(/\s+/g,' ').trim();
        var phoneB=(d.phone||'').replace(/\D/g,'').slice(-9);
        var nameSim=nameA&&nameB&&(nameA===nameB||nameA.includes(nameB)||nameB.includes(nameA));
        var phoneSim=phoneA&&phoneB&&phoneA===phoneB;
        if(nameSim||phoneSim){ matches.push(j); used.add(j); }
      });
      if(matches.length>1){ groups.push(matches.map(function(idx){return Object.assign({},clients[idx],{_idx:idx});})); }
    });
    return groups;
  },
  mergeGroup: function(keepIdx, deleteIdxs){
    var clients=[]; try{clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');}catch(e){}
    var keep=clients[keepIdx];
    deleteIdxs.forEach(function(di){
      var del2=clients[di];
      // Merge tags
      if(del2.tags&&del2.tags.trim()) keep.tags=(keep.tags?keep.tags+',':'')+del2.tags;
      // Merge notes
      if(del2.notes&&del2.notes.trim()) keep.notes=(keep.notes?keep.notes+'\n':'')+del2.notes;
      // Fill missing fields
      if(!keep.phone&&del2.phone) keep.phone=del2.phone;
      if(!keep.email&&del2.email) keep.email=del2.email;
      if(!keep.company&&del2.company) keep.company=del2.company;
    });
    // Remove duplicates (highest index first)
    deleteIdxs.sort(function(a,b){return b-a;});
    deleteIdxs.forEach(function(di){clients.splice(di,1);});
    clients[keepIdx]=keep;
    try{localStorage.setItem('ingly_crm_v1',JSON.stringify(clients));}catch(e){}
    return clients;
  },
  openManager: function(){
    var dups=this.findDuplicates();
    if(!dups.length){if(typeof toast!=='undefined')toast('✅ Nessun duplicato trovato nel CRM!','success');return;}
    var w=window.open('','_blank','width=700,height=500');
    if(!w){if(typeof toast!=='undefined')toast('Abilita popup','info');return;}
    w._dups=dups; w._opener=window;
    function _logic(){
      var dups=window._dups||[];
      window.mergeGroup=function(gi){
        var g=dups[gi]; if(!g||g.length<2) return;
        var keepIdx=g[0]._idx;
        var delIdxs=g.slice(1).map(function(c){return c._idx;});
        window._opener.CRMMerge.mergeGroup(keepIdx,delIdxs);
        dups.splice(gi,1);
        var row=document.getElementById('dup-g-'+gi);
        if(row){row.style.opacity='0.3';row.innerHTML+='<td colspan="4" style="color:#22c55e;font-weight:700;padding:6px">✅ Uniti!</td>';}
        document.getElementById('dup-count').textContent=dups.filter(function(d){return d;}).length+' gruppi duplicati';
      };
      window.skipGroup=function(gi){
        var row=document.getElementById('dup-g-'+gi);
        if(row) row.style.display='none';
      };
    }
    var rows=dups.map(function(g,gi){
      return g.map(function(c,ci){
        return '<tr id="dup-g-'+gi+'" style="border-bottom:1px solid #0f172a;background:'+(ci===0?'rgba(34,197,94,.05)':'rgba(239,68,68,.03)')+'">'
          +'<td style="padding:7px 10px;color:'+(ci===0?'#22c55e':'#ef4444')+';font-size:10px;font-weight:700">'+(ci===0?'✅ Tieni':'❌ Duplicato')+'</td>'
          +'<td style="padding:7px 10px;font-weight:700;color:#f1f5f9">'+c.name+'</td>'
          +'<td style="padding:7px 10px;font-size:10px;color:#94a3b8">'+( c.phone||'—')+'</td>'
          +'<td style="padding:7px 10px;font-size:10px;color:#94a3b8">'+( c.email||'—')+'</td>'
          +(ci===0?'<td rowspan="'+g.length+'" style="padding:7px 10px;vertical-align:middle"><button onclick="mergeGroup('+gi+')" style="padding:5px 10px;background:#22c55e20;color:#22c55e;border:1px solid #22c55e30;border-radius:6px;cursor:pointer;font-size:10px;font-weight:700;margin-right:4px">🔀 Unisci</button><button onclick="skipGroup('+gi+')" style="padding:5px 8px;background:#1e293b;color:#64748b;border:1px solid #334155;border-radius:6px;cursor:pointer;font-size:10px">Skip</button></td>':'')
          +'</tr>';
      }).join('');
    }).join('');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>🔀 Merge Duplicati</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;font-size:13px}table{width:100%;border-collapse:collapse}th{background:#1e293b;padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase}</style></head><body>'
      +'<h2 style="font-size:17px;font-weight:900;margin-bottom:4px">🔀 Gestione Duplicati CRM</h2>'
      +'<p id="dup-count" style="font-size:11px;color:#64748b;margin-bottom:14px">'+dups.length+' gruppi duplicati trovati</p>'
      +'<table><thead><tr><th></th><th>Nome</th><th>Telefono</th><th>Email</th><th>Azioni</th></tr></thead><tbody>'+rows+'</tbody></table>'
      +'<button onclick="close()" style="margin-top:14px;padding:9px 18px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:8px;cursor:pointer">Chiudi</button>'
      +'</body></html>');
    w.document.close();
    var sc=w.document.createElement('script'); sc.textContent='('+_logic.toString()+')()'; w.document.head.appendChild(sc);
  }
};

// Add merge btn to CRM header
(function _addMergeBtn(){
  function _p(){
    if(typeof CRMSmart==='undefined'||!CRMSmart._v26){setTimeout(_p,700);return;}
    if(CRMSmart._v37bmerge) return; CRMSmart._v37bmerge=true;
    var _orig=CRMSmart.render.bind(CRMSmart);
    CRMSmart.render=function(){
      _orig();
      setTimeout(function(){
        var el=document.getElementById('view-clienti');
        if(!el||el.querySelector('.merge-btn-crm')) return;
        var importBtn=el.querySelector('[onclick*="_importFile"],[onclick*="importCSV"]');
        if(!importBtn) return;
        var btn=document.createElement('button'); btn.className='merge-btn-crm btn-v37 btn-ghost';
        btn.style.cssText='padding:7px 12px;background:var(--bg-card2);color:#f59e0b;border:1px solid rgba(245,158,11,.3);border-radius:9px;cursor:pointer;font-size:11px;font-weight:700';
        btn.innerHTML='🔀 Merge Duplicati';
        btn.onclick=function(){CRMMerge.openManager();};
        importBtn.insertAdjacentElement('beforebegin',btn);
      },400);
    };
  }
  setTimeout(_p,3500);
})();

// ─── CRM: SEGMENTAZIONE AUTOMATICA ───────────────────────────────
window.CRMSegmentation = {
  segment: function(){
    var clients=[]; try{clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');}catch(e){}
    var quotes=[]; try{quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');}catch(e){}
    var orders=[]; try{orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');}catch(e){}
    var now=Date.now();
    var updated=0;
    clients.forEach(function(c){
      var cq=quotes.filter(function(q){return q.client===c.name;});
      var co=orders.filter(function(o){return o.client===c.name;});
      var rev=co.reduce(function(a,o){return a+(parseFloat(o.total||0));},0);
      var lastQ=cq.length?new Date(cq[0].date||0).getTime():0;
      var daysSince=(now-lastQ)/864e5;
      var newSeg='';
      if(rev>=500||co.length>=10) newSeg='cliente_fisso';
      else if(rev>=200||co.length>=5) newSeg='attivo';
      else if(daysSince>60) newSeg='inattivo';
      else if(cq.length>0) newSeg='potenziale';
      else newSeg='nuovo';
      if(newSeg&&c._segment!==newSeg){c._segment=newSeg;updated++;}
    });
    try{localStorage.setItem('ingly_crm_v1',JSON.stringify(clients));}catch(e){}
    if(typeof toast!=='undefined') toast('🏷️ '+updated+' clienti riclassificati ('+clients.length+' totali)','success');
    return updated;
  }
};
setTimeout(function(){CRMSegmentation.segment();},10000); // Run once on load

// ─── MAGAZZINO: STORICO MOVIMENTI ────────────────────────────────
window.MagazzinoMovimenti = {
  _SK:'ingly_stock_movimenti_v1',
  load:function(){try{return JSON.parse(localStorage.getItem(this._SK)||'{}');}catch(e){return{};}},
  save:function(d){try{localStorage.setItem(this._SK,JSON.stringify(d));}catch(e){}},
  addMove:function(productId,productName,qty,tipo,note){
    var d=this.load();
    if(!d[productId]) d[productId]=[];
    d[productId].unshift({date:new Date().toISOString(),qty:qty,tipo:tipo||'entrata',note:note||''});
    d[productId]=d[productId].slice(0,100);
    this.save(d);
  },
  show:function(productId,productName){
    var d=this.load(); var moves=d[productId]||[];
    var w=window.open('','_blank','width=600,height=420');
    if(!w) return;
    var rows=moves.map(function(m){
      var dt=new Date(m.date||Date.now()).toLocaleDateString('it',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
      var c=m.tipo==='entrata'?'#22c55e':'#f59e0b';
      return '<tr style="border-bottom:1px solid #1e293b"><td style="padding:7px 10px;font-size:10px;color:#64748b">'+dt+'</td>'
        +'<td style="padding:7px 10px;font-weight:800;color:'+c+'">'+( m.tipo==='entrata'?'+':'-')+m.qty+'</td>'
        +'<td style="padding:7px 10px"><span style="background:'+c+'20;color:'+c+';padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700">'+m.tipo+'</span></td>'
        +'<td style="padding:7px 10px;font-size:10px;color:#94a3b8">'+( m.note||'—')+'</td></tr>';
    }).join('');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>📊 Movimenti '+productName+'</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;font-size:13px}table{width:100%;border-collapse:collapse}th{background:#1e293b;padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase}</style></head><body>'
      +'<h2 style="font-size:16px;font-weight:900;margin-bottom:4px">📊 Storico Movimenti</h2>'
      +'<p style="font-size:11px;color:#64748b;margin-bottom:12px"><strong>'+productName+'</strong> · '+moves.length+' movimenti</p>'
      +'<div style="display:flex;gap:8px;margin-bottom:12px">'
      +'<button onclick="addMove(\'entrataBtn\')" style="padding:7px 12px;background:#22c55e20;color:#22c55e;border:1px solid #22c55e30;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">+ Carico</button>'
      +'<button onclick="addMove(\'uscitaBtn\')" style="padding:7px 12px;background:#f59e0b20;color:#f59e0b;border:1px solid #f59e0b30;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">- Scarico</button>'
      +'</div>'
      +'<table><thead><tr><th>Data/Ora</th><th>Qty</th><th>Tipo</th><th>Note</th></tr></thead>'
      +'<tbody>'+(rows||'<tr><td colspan="4" style="text-align:center;padding:20px;color:#64748b">Nessun movimento registrato</td></tr>')+'</tbody></table>'
      +'<button onclick="close()" style="margin-top:12px;padding:9px 18px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:7px;cursor:pointer">Chiudi</button>'
      +'</body></html>');
    var sc=w.document.createElement('script');
    sc.textContent='window._pid=\''+productId+'\';window._pname=\''+productName.replace(/'/g,'').slice(0,30)+'\';'
      +'function addMove(btn){'
      +'var tipo=btn===\'entrataBtn\'?\'entrata\':\'uscita\';'
      +'var qty=parseFloat(prompt(\'Quantità (\'+(tipo===\'entrata\'?\'carico\':\'scarico\')+\'):\'));'
      +'if(!qty||qty<=0) return;'
      +'var note=prompt(\'Note (opzionale):\');'
      +'var d={};try{d=JSON.parse(localStorage.getItem(\'ingly_stock_movimenti_v1\')||\'{}\')}catch(e){}'
      +'if(!d[window._pid])d[window._pid]=[];'
      +'d[window._pid].unshift({date:new Date().toISOString(),qty:qty,tipo:tipo,note:note||\'\'});'
      +'localStorage.setItem(\'ingly_stock_movimenti_v1\',JSON.stringify(d));'
      +'location.reload();}';
    w.document.close();
    w.document.head.appendChild(sc);
  }
};

// Patch MagazzinoGadget to log qty changes as movements
(function _patchMagazMovimenti(){
  function _p(){
    if(typeof MagazzinoGadget==='undefined'){setTimeout(_p,700);return;}
    if(MagazzinoGadget._v37bmov) return; MagazzinoGadget._v37bmov=true;
    var _origAdj=MagazzinoGadget.adjQty.bind(MagazzinoGadget);
    MagazzinoGadget.adjQty=function(idx,delta){
      var items=JSON.parse(localStorage.getItem('ingly_magazzino_v34')||'[]');
      var it=items[idx]; if(it&&delta!==0){
        MagazzinoMovimenti.addMove(it.id||('item_'+idx),it.name,Math.abs(delta),delta>0?'entrata':'uscita','Aggiust. manuale');
      }
      return _origAdj(idx,delta);
    };
  }
  setTimeout(_p,2500);
})();

// ─── MAGAZZINO: CALCOLO FABBISOGNO DA ORDINI ─────────────────────
window.MagazzinoFabbisogno = {
  calculate: function(){
    var orders=[]; try{orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');}catch(e){}
    var items=[]; try{items=JSON.parse(localStorage.getItem('ingly_magazzino_v34')||'[]');}catch(e){}
    var activeOrders=orders.filter(function(o){return ['confirmed','in_progress'].indexOf(o.status)>-1;});
    // Build required quantities from order descriptions
    var required={};
    activeOrders.forEach(function(o){
      var desc=(o.description||o.product||'').toLowerCase();
      items.forEach(function(it){
        if(desc.includes(it.name.toLowerCase().slice(0,12))){
          required[it.id]=(required[it.id]||0)+1; // Estimate 1 pz per mention
        }
      });
    });
    var needs=[];
    items.forEach(function(it){
      var req=required[it.id]||0; var avail=it.qty||0;
      if(req>avail) needs.push({name:it.name,emoji:it.emoji||'📦',required:req,available:avail,shortage:req-avail,unit:it.unit||'pz'});
    });
    if(!needs.length){if(typeof toast!=='undefined')toast('✅ Stock sufficiente per tutti gli ordini attivi','success');return;}
    var w=window.open('','_blank','width=620,height=380');
    if(!w) return;
    var rows=needs.map(function(n){
      return '<tr style="border-bottom:1px solid #1e293b">'
        +'<td style="padding:8px 10px;font-size:18px">'+n.emoji+'</td>'
        +'<td style="padding:8px 10px;font-weight:700;color:#f1f5f9">'+n.name.slice(0,35)+'</td>'
        +'<td style="padding:8px 10px;text-align:center;color:#f59e0b">'+n.required+'</td>'
        +'<td style="padding:8px 10px;text-align:center;color:#64748b">'+n.available+'</td>'
        +'<td style="padding:8px 10px;text-align:center;font-weight:800;color:#ef4444">-'+n.shortage+' '+n.unit+'</td>'
        +'</tr>';
    }).join('');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>📋 Fabbisogno Magazzino</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;font-size:13px}table{width:100%;border-collapse:collapse}th{background:#1e293b;padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase}</style></head><body>'
      +'<h2 style="font-size:17px;font-weight:900;margin-bottom:4px">📋 Fabbisogno da Ordini Attivi</h2>'
      +'<p style="font-size:11px;color:#64748b;margin-bottom:14px">'+activeOrders.length+' ordini attivi · '+needs.length+' prodotti in carenza</p>'
      +'<table><thead><tr><th></th><th>Prodotto</th><th style="text-align:center">Necessario</th><th style="text-align:center">Disponibile</th><th style="text-align:center">Carenza</th></tr></thead>'
      +'<tbody>'+rows+'</tbody></table>'
      +'<button onclick="close()" style="margin-top:14px;padding:9px 18px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:8px;cursor:pointer">Chiudi</button>'
      +'</body></html>');
    w.document.close();
  }
};

// ─── EXPORT COMMERCIALISTA ────────────────────────────────────────
window.ExportCommercialista = {
  export: function(){
    var orders=[]; try{orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');}catch(e){}
    var fatture=[]; try{fatture=JSON.parse(localStorage.getItem('ingly_sdi_v1')||'[]');}catch(e){}
    var prima=[]; try{prima=JSON.parse(localStorage.getItem('ingly_prima_nota_v1')||'[]');}catch(e){}
    var brand={}; try{brand=JSON.parse(localStorage.getItem('ingly_brand_v1')||'{}');}catch(e){}
    var ivaCfg={}; try{ivaCfg=JSON.parse(localStorage.getItem('ingly_iva_cfg')||'{}');}catch(e){}
    var ivaRate=ivaCfg.regime==='forfettario'?0:(parseFloat(ivaCfg.rate)||22);
    var now=new Date();
    var year=now.getFullYear();
    var header=['Data','Cliente','Descrizione','Imponibile','IVA '+ivaRate+'%','Totale','Stato','Fattura N.'];
    var rows=[header.join(',')];
    // Paid orders
    orders.filter(function(o){return o.status==='paid';}).forEach(function(o){
      var ym=new Date(o.created||o.date||Date.now()).getFullYear();
      if(ym!==year) return;
      var imp=parseFloat(o.total||0)/(1+ivaRate/100);
      var iva=imp*(ivaRate/100);
      var f=fatture.find(function(ft){return ft.ordineId===o.id;});
      rows.push([
        new Date(o.created||o.date||Date.now()).toLocaleDateString('it'),
        '"'+(o.client||'').replace(/"/g,'')+'\"',
        '"'+(o.description||o.product||'').replace(/"/g,'').slice(0,60)+'"',
        imp.toFixed(2),iva.toFixed(2),parseFloat(o.total||0).toFixed(2),
        o.status,f?f.qn:''
      ].join(','));
    });
    // Summary row
    var totalImp=0,totalIva=0,totalAll=0;
    orders.filter(function(o){return o.status==='paid'&&new Date(o.created||o.date||0).getFullYear()===year;}).forEach(function(o){
      var imp=parseFloat(o.total||0)/(1+ivaRate/100);
      totalImp+=imp; totalIva+=imp*(ivaRate/100); totalAll+=parseFloat(o.total||0);
    });
    rows.push(['','','TOTALE '+year,totalImp.toFixed(2),totalIva.toFixed(2),totalAll.toFixed(2),'',''].join(','));
    rows.push(['','','P.IVA: '+(brand.vatNum||''), 'Regime: '+(ivaCfg.regime||'ordinario'),'','','',''].join(','));
    var csv=rows.join('\n');
    var a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
    a.download='registro_vendite_'+year+'_'+( brand.name||'ingly').replace(/\s/g,'_')+'.csv';
    a.click();
    if(typeof toast!=='undefined') toast('📊 Export commercialista scaricato ('+rows.length+' righe · anno '+year+')','success');
  }
};

// ─── CLOUD: AUTO-SYNC SCHEDULATO ─────────────────────────────────
window.AutoCloudSync = {
  _INTERVAL: 60*60*1000, // 1 ora
  _timer: null,
  _SK: 'ingly_auto_cloud_v1',
  getConfig: function(){try{return JSON.parse(localStorage.getItem(this._SK)||'{}');}catch(e){return{};}},
  setConfig: function(d){try{localStorage.setItem(this._SK,JSON.stringify(d));}catch(e){}},
  start: function(){
    var cfg=this.getConfig(); if(!cfg.enabled) return;
    clearInterval(this._timer);
    this._timer=setInterval(function(){
      if(typeof GoogleDriveSync!=='undefined'){
        GoogleDriveSync.push().catch(function(){});
        AutoCloudSync.setConfig(Object.assign(AutoCloudSync.getConfig(),{lastSync:new Date().toISOString()}));
      }
    },this._INTERVAL);
    console.log('[AutoCloudSync] Started — every 1h');
  },
  toggle: function(){
    var cfg=this.getConfig(); cfg.enabled=!cfg.enabled; this.setConfig(cfg);
    if(cfg.enabled){this.start();if(typeof toast!=='undefined')toast('☁️ Auto-sync attivato (ogni ora)','success');}
    else{clearInterval(this._timer);if(typeof toast!=='undefined')toast('☁️ Auto-sync disattivato','info');}
    return cfg.enabled;
  },
  getStatus: function(){ return this.getConfig().enabled; }
};
AutoCloudSync.start(); // Try to start if was enabled

// ─── BRAND: UPLOAD LOGO IMMAGINE REALE ───────────────────────────
(function _enhanceBrandLogo(){
  function _p(){
    if(typeof BrandConfig==='undefined'){setTimeout(_p,700);return;}
    if(BrandConfig._v37blog) return; BrandConfig._v37blog=true;
    var _origSettings=BrandConfig.openSettings.bind(BrandConfig);
    BrandConfig.openSettings=function(){
      _origSettings();
      // After modal opens, inject logo upload field
      setTimeout(function(){
        var modal=document.getElementById('brand-modal');
        if(!modal) return;
        // Find emoji input
        var emojiInp=document.getElementById('br-logo'); if(!emojiInp) return;
        if(emojiInp.parentElement.querySelector('.logo-upload-v37b')) return;
        var logoWrap=document.createElement('div'); logoWrap.className='logo-upload-v37b';
        logoWrap.style.cssText='margin-top:8px;padding:10px;background:var(--bg-card2);border-radius:9px;border:1px solid var(--border)';
        var savedLogo=localStorage.getItem('ingly_logo_img_v1');
        logoWrap.innerHTML='<div style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:6px">Logo Immagine (opzionale · sovrascrive emoji)</div>'
          +'<div style="display:flex;align-items:center;gap:8px">'
          +(savedLogo?'<img id="logo-preview" src="'+savedLogo+'" style="width:40px;height:40px;border-radius:7px;object-fit:contain;background:var(--bg-card);border:1px solid var(--border)">':'<div id="logo-preview" style="width:40px;height:40px;border-radius:7px;background:var(--bg-card);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:20px">'+( BrandConfig.load().logoEmoji||'⚡')+'</div>')
          +'<div><button onclick="document.getElementById(\'logo-file-inp\').click()" style="padding:6px 12px;background:rgba(99,102,241,.15);color:#818cf8;border:1px solid rgba(99,102,241,.3);border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">📷 Carica</button>'
          +(savedLogo?'<button onclick="localStorage.removeItem(\'ingly_logo_img_v1\');this.parentElement.parentElement.parentElement.remove()" style="padding:6px 8px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:7px;cursor:pointer;font-size:11px;margin-left:5px">✕</button>':'')
          +'</div></div>'
          +'<input id="logo-file-inp" type="file" accept="image/*" style="display:none">';
        var fileInp=logoWrap.querySelector('#logo-file-inp');
        fileInp.onchange=function(){
          var file=this.files[0]; if(!file) return;
          var reader=new FileReader();
          reader.onload=function(ev){
            var data=ev.target.result;
            localStorage.setItem('ingly_logo_img_v1',data);
            var preview=document.getElementById('logo-preview');
            if(preview){preview.src?preview.src=data:(preview.style.backgroundImage='url('+data+')');}
            if(typeof toast!=='undefined') toast('🖼️ Logo caricato — apparirà sui PDF','success');
          };
          reader.readAsDataURL(file);
        };
        emojiInp.parentElement.insertAdjacentElement('afterend',logoWrap);
      },300);
    };
  }
  setTimeout(_p,1500);
})();

// ─── PIPELINE: VALORE € PER STAGE ────────────────────────────────
(function _pipelineValue(){
  function _p(){
    if(typeof ClientPipeline==='undefined'){setTimeout(_p,700);return;}
    if(ClientPipeline._v37bval) return; ClientPipeline._v37bval=true;
    var _orig=ClientPipeline.render.bind(ClientPipeline);
    ClientPipeline.render=function(){
      _orig();
      setTimeout(function(){
        // Add value calculation to each stage column
        var quotes=[]; try{quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');}catch(e){}
        var pipeline=[]; try{pipeline=JSON.parse(localStorage.getItem('ingly_pipeline_v1')||'[]');}catch(e){}
        var stageValues={};
        pipeline.forEach(function(c){
          var cq=quotes.filter(function(q){return q.client===c.name;});
          var rev=cq.reduce(function(a,q){return a+(q.total||0);},0);
          stageValues[c.stage]=(stageValues[c.stage]||0)+rev;
        });
        Object.entries(stageValues).forEach(function(kv){
          var stage=kv[0]; var val=kv[1];
          var headers=document.querySelectorAll('#view-crm_pipeline [style*="color:"]');
          headers.forEach(function(h){
            if(h.textContent&&h.closest('[style*="border"]')){
              var col=h.closest('[style*="border"]');
              if(!col||col.querySelector('.stage-val')) return;
              var badge=document.createElement('div'); badge.className='stage-val';
              badge.style.cssText='font-size:10px;font-weight:700;color:#10b981;margin-top:2px';
              badge.textContent=val>0?('€'+val.toFixed(0)+' potenziale'):'';
              h.insertAdjacentElement('afterend',badge);
            }
          });
        });
      },400);
    };
  }
  setTimeout(_p,2500);
})();

// ─── WA: TEMPLATE SCHEDULING ─────────────────────────────────────
window.WAScheduler = {
  _SK: 'ingly_wa_scheduled_v1',
  load: function(){try{return JSON.parse(localStorage.getItem(this._SK)||'[]');}catch(e){return[];}},
  save: function(d){try{localStorage.setItem(this._SK,JSON.stringify(d));}catch(e){}},
  schedule: function(phone, message, sendAt){
    var d=this.load();
    d.push({id:Date.now(),phone:phone,message:message,sendAt:sendAt,status:'pending'});
    this.save(d);
    if(typeof toast!=='undefined') toast('⏰ Messaggio WA programmato per '+new Date(sendAt).toLocaleDateString('it'),'success');
  },
  checkDue: function(){
    var d=this.load(); var now=Date.now(); var sent=0;
    d.forEach(function(m){
      if(m.status==='pending'&&new Date(m.sendAt).getTime()<=now){
        // Auto-open WA link
        var phone=(m.phone||'').replace(/\D/g,'');
        if(phone) window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(m.message),'_blank');
        m.status='sent'; m.sentAt=new Date().toISOString(); sent++;
      }
    });
    if(sent>0){ this.save(d); if(typeof toast!=='undefined') toast('💬 '+sent+' messaggio WA in scadenza pronto','info'); }
  },
  openScheduler: function(phone, message){
    var d=prompt('Invia il messaggio WA alle (YYYY-MM-DD HH:MM):\n\nCliente: '+(phone||''),'');
    if(!d) return;
    var dt=new Date(d); if(isNaN(dt.getTime())){alert('Data non valida. Usa formato YYYY-MM-DD HH:MM');return;}
    this.schedule(phone||'',message||'Messaggio programmato',dt.toISOString());
  }
};
setInterval(function(){WAScheduler.checkDue();},60000); // Check every minute
WAScheduler.checkDue(); // Check on startup

// ─── DASHBOARD: KPI CONFIGURABILI ────────────────────────────────
window.KPIConfig = {
  _SK:'ingly_kpi_cfg_v1',
  AVAILABLE:[
    {id:'revenue_month',label:'Entrate mese',unit:'€'},
    {id:'orders_active',label:'Ordini attivi',unit:''},
    {id:'clients_total',label:'Clienti totali',unit:''},
    {id:'quotes_pending',label:'Preventivi aperti',unit:''},
    {id:'margin_avg',label:'Margine medio',unit:'%'},
    {id:'stock_alerts',label:'Alert stock',unit:''},
    {id:'invoices_due',label:'Fatture in scadenza',unit:''},
  ],
  load:function(){try{return JSON.parse(localStorage.getItem(this._SK)||'null')||['revenue_month','orders_active','clients_total','quotes_pending'];}catch(e){return['revenue_month','orders_active','clients_total','quotes_pending'];}},
  save:function(d){try{localStorage.setItem(this._SK,JSON.stringify(d));}catch(e){}},
  calculate:function(id){
    try{
      var orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');
      var clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');
      var quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');
      var items=JSON.parse(localStorage.getItem('ingly_magazzino_v34')||'[]');
      var now=new Date().toISOString().slice(0,7);
      switch(id){
        case 'revenue_month': return '€'+quotes.filter(function(q){return q.date&&q.date.slice(0,7)===now;}).reduce(function(a,q){return a+(q.total||0);},0).toFixed(0);
        case 'orders_active': return orders.filter(function(o){return ['confirmed','in_progress'].indexOf(o.status)>-1;}).length;
        case 'clients_total': return clients.length;
        case 'quotes_pending': return quotes.filter(function(q){return q.status==='draft';}).length;
        case 'margin_avg': {var mg=0,n=0; quotes.forEach(function(q){if(q.marginPct){mg+=q.marginPct;n++;}}); return n?(mg/n).toFixed(0)+'%':'—';}
        case 'stock_alerts': return items.filter(function(i){return (i.qty||0)<(i.minQty||1);}).length;
        default: return '—';
      }
    }catch(e){return '—';}
  }
};

// ─── DASHBOARD: KPI EXPORT PDF ────────────────────────────────────
window.DashboardPDFExport = {
  export: function(){
    var brand={}; try{brand=JSON.parse(localStorage.getItem('ingly_brand_v1')||'{}');}catch(e){}
    var pn=window.PrimaNota&&window.PrimaNota.getMonthlySummary?window.PrimaNota.getMonthlySummary():{thisMon:0,lastMon:0,total:0,count:0};
    var orders=[]; try{orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');}catch(e){}
    var clients=[]; try{clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');}catch(e){}
    var quotes=[]; try{quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');}catch(e){}
    var activeOrders=orders.filter(function(o){return ['confirmed','in_progress'].indexOf(o.status)>-1;});
    var w=window.open('','_blank','width=800,height=600');
    if(!w) return;
    var color=brand.primaryColor||'#6366f1';
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dashboard Report</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:40px;font-size:13px;color:#1e293b}'
      +'.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}'
      +'.kpi{background:#f8fafc;border-radius:10px;padding:14px;text-align:center}'
      +'.kv{font-size:22px;font-weight:900;color:'+color+'}.kl{font-size:10px;color:#64748b;text-transform:uppercase;margin-bottom:4px}'
      +'@media print{button{display:none}}</style></head><body>'
      +'<div style="display:flex;justify-content:space-between;padding-bottom:16px;border-bottom:3px solid '+color+';margin-bottom:24px">'
      +'<div><div style="font-size:22px;font-weight:900;color:'+color+'">'+(brand.logoEmoji||'⚡')+' '+(brand.name||'Ingly Laser')+'</div>'
      +'<div style="font-size:11px;color:#64748b">'+(brand.tagline||'')+'</div></div>'
      +'<div style="text-align:right"><div style="font-size:16px;font-weight:900">DASHBOARD REPORT</div>'
      +'<div style="font-size:11px;color:#64748b">'+new Date().toLocaleDateString('it',{day:'2-digit',month:'long',year:'numeric'})+'</div></div>'
      +'</div>'
      +'<div class="kpis">'
      +[
        {l:'Entrate Mese',v:'€'+pn.thisMon.toFixed(0)},
        {l:'Ordini Attivi',v:activeOrders.length},
        {l:'Clienti Totali',v:clients.length},
        {l:'Preventivi Aperti',v:quotes.filter(function(q){return q.status==='draft';}).length},
      ].map(function(k){return '<div class="kpi"><div class="kl">'+k.l+'</div><div class="kv">'+k.v+'</div></div>';}).join('')
      +'</div>'
      +'<h3 style="font-size:14px;font-weight:700;margin-bottom:10px">Ordini Attivi</h3>'
      +'<table style="width:100%;border-collapse:collapse;margin-bottom:20px">'
      +'<thead><tr style="background:#f1f5ff"><th style="padding:8px;text-align:left;font-size:10px;color:#64748b">Cliente</th><th style="padding:8px;text-align:left;font-size:10px;color:#64748b">Descrizione</th><th style="padding:8px;text-align:right;font-size:10px;color:#64748b">Totale</th><th style="padding:8px;text-align:center;font-size:10px;color:#64748b">Stato</th></tr></thead>'
      +'<tbody>'+activeOrders.slice(0,15).map(function(o){return '<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:7px 8px">'+o.client+'</td><td style="padding:7px 8px;font-size:11px;color:#64748b">'+(o.description||o.product||'').slice(0,40)+'</td><td style="padding:7px 8px;text-align:right;font-weight:700">€'+(o.total||0).toFixed(2)+'</td><td style="padding:7px 8px;text-align:center;font-size:10px">'+o.status+'</td></tr>';}).join('')+'</tbody></table>'
      +'<button onclick="print()" style="padding:10px 20px;background:'+color+';color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px">🖨️ Stampa / PDF</button>'
      +'</body></html>');
    w.document.close();
    if(typeof toast!=='undefined') toast('📄 Report dashboard generato','success');
  }
};

console.log('[v37b-P2] CRM merge · Segmentazione · Movimenti magazzino · Fabbisogno · Export commercialista · Auto-sync · Brand logo · Pipeline valore · WA scheduling · KPI configurabili · Dashboard PDF ✅');

