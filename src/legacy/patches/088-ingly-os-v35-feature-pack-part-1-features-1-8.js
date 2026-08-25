
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v35 — Feature Pack Part 1 (Features 1-8)
// 1. Magazzino→LaserB2B Sync  2. Storico Fornitori  3. Riordino Alert
// 4. FatturaPA  5. PWA  6. WA Business  7. Stats Vendite  8. Calendar
// ═══════════════════════════════════════════════════════════════════

// ─── 1. SINCRONIZZAZIONE MAGAZZINO → LaserB2B ────────────────────
window.MagazzinoSync = {
  SK_MAG: 'ingly_magazzino_v34',
  SK_HIST: 'ingly_supplier_history_v1',
  SK_LISTINO: 'ingly_listino_v1',

  // Sync magazzino prezzi → LaserB2B costSup
  syncToLaserB2B: function(){
    if(typeof LaserB2B==='undefined') return 0;
    var items=[]; try{items=JSON.parse(localStorage.getItem(this.SK_MAG)||'[]');}catch(e){}
    if(!items.length) return 0;
    var prods=LaserB2B._PRODUCTS||[]; var updated=0;
    prods.forEach(function(p){
      // Match by name similarity (first 15 chars)
      var pname=(p.name||'').toLowerCase().slice(0,18);
      var match=items.find(function(it){
        return it.tech===p.tech && it.name.toLowerCase().slice(0,18)===pname;
      });
      if(match){
        var best=match.fornitori?match.fornitori.reduce(function(a,b){return b.p<a.p?b:a;},match.fornitori[0]):null;
        if(best&&best.p>0){
          var old=p.costSup||p.cost||0;
          p.costSup=best.p; p.cost=best.p;
          if(old!==best.p) updated++;
        }
      }
    });
    LaserB2B._PRODUCTS=prods;
    if(updated&&typeof toast!=='undefined') toast('🔄 '+updated+' prezzi sincronizzati Magazzino→Quoter','success');
    return updated;
  },

  // ─── 2. STORICO ORDINI FORNITORE ─────────────────────────────
  logPurchase: function(supplier, items, totalSpent){
    var h={}; try{h=JSON.parse(localStorage.getItem(this.SK_HIST)||'{}');}catch(e){}
    var ym=new Date().toISOString().slice(0,7);
    if(!h[supplier]) h[supplier]={name:supplier,purchases:[]};
    h[supplier].purchases.push({date:new Date().toISOString(),items:items,total:totalSpent,month:ym});
    h[supplier].purchases=h[supplier].purchases.slice(-100);
    try{localStorage.setItem(this.SK_HIST,JSON.stringify(h));}catch(e){}
  },

  showSupplierHistory: function(){
    var h={}; try{h=JSON.parse(localStorage.getItem(this.SK_HIST)||'{}');}catch(e){}
    var entries=Object.entries(h);
    var items=[]; try{items=JSON.parse(localStorage.getItem(this.SK_MAG)||'[]');}catch(e){}
    // Calculate spend by supplier from warehouse
    var spendBySup={};
    items.forEach(function(it){
      (it.fornitori||[]).forEach(function(f){
        if(!spendBySup[f.s]) spendBySup[f.s]={name:f.s,totalPcs:0,totalVal:0,products:[]};
        spendBySup[f.s].totalPcs+=(it.qty||0);
        spendBySup[f.s].totalVal+=(it.qty||0)*f.p;
        spendBySup[f.s].products.push(it.name.slice(0,25));
      });
    });
    var FORN=window.MagazzinoGadget?{}:{}; try{FORN=JSON.parse(JSON.stringify(window.FORNITORI||{}));}catch(e){}
    var w=window.open('','_blank','width=900,height=600');
    if(!w){if(typeof toast!=='undefined')toast('Abilita popup','info');return;}
    var rows=Object.entries(spendBySup).sort(function(a,b){return b[1].totalVal-a[1].totalVal;}).map(function(kv){
      var k=kv[0]; var s=kv[1];
      var fi=FORN[k]||{name:k,url:'#',country:'',spediz:''};
      return '<tr style="border-bottom:1px solid #1e293b">'
        +'<td style="padding:9px 12px;font-weight:700">'+( fi.country||'🌐')+' <a href="'+( fi.url||'#')+'" target="_blank" style="color:#818cf8">'+s.name+'</a></td>'
        +'<td style="padding:9px 12px;text-align:center">'+s.products.length+'</td>'
        +'<td style="padding:9px 12px;text-align:right;font-weight:800;color:#10b981">€'+s.totalVal.toFixed(0)+'</td>'
        +'<td style="padding:9px 12px;font-size:10px;color:#64748b;max-width:200px">'+s.products.slice(0,3).join(', ')+'</td></tr>';
    }).join('');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Storico Fornitori</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;font-size:13px}'
      +'table{width:100%;border-collapse:collapse}th{background:#1e293b;padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase}'
      +'</style></head><body>'
      +'<h2 style="font-size:18px;font-weight:900;margin-bottom:4px">🏪 Storico Fornitori</h2>'
      +'<p style="font-size:11px;color:#64748b;margin-bottom:16px">Basato sul valore stock attuale per fornitore</p>'
      +'<table><thead><tr><th>Fornitore</th><th style="text-align:center">Prodotti</th><th style="text-align:right">Valore Stock</th><th>Prodotti principali</th></tr></thead>'
      +'<tbody>'+(rows||'<tr><td colspan="4" style="text-align:center;padding:30px;color:#64748b">Aggiorna prima le quantità in magazzino</td></tr>')+'</tbody></table>'
      +'<button onclick="close()" style="margin-top:16px;padding:9px 18px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:8px;cursor:pointer">Chiudi</button>'
      +'</body></html>');
    w.document.close();
  },

  // ─── 3. ALERT RIORDINO AUTOMATICO ────────────────────────────
  checkReorderAlerts: function(){
    var items=[]; try{items=JSON.parse(localStorage.getItem(this.SK_MAG)||'[]');}catch(e){}
    var alerts=items.filter(function(it){return (it.qty||0)<=(it.minQty||0)&&it.cat!=='consumabili';});
    if(!alerts.length) return;
    // Show reorder panel on Dashboard
    var existing=document.getElementById('reorder-alert-bar');
    if(existing) existing.remove();
    var bar=document.createElement('div'); bar.id='reorder-alert-bar';
    bar.style.cssText='position:fixed;bottom:16px;right:16px;z-index:9999;max-width:360px;background:var(--bg-card);border:1.5px solid #ef444450;border-radius:14px;padding:14px;box-shadow:0 8px 30px rgba(0,0,0,.4)';
    bar.innerHTML='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
      +'<span style="font-size:18px">🚨</span>'
      +'<div style="flex:1"><div style="font-size:12px;font-weight:800;color:#ef4444">Riordino necessario ('+alerts.length+')</div>'
      +'<div style="font-size:10px;color:var(--text-muted)">Articoli sotto scorta minima</div></div>'
      +'<button onclick="this.closest(\'#reorder-alert-bar\').remove()" style="background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:16px">✕</button>'
      +'</div>'
      +alerts.slice(0,5).map(function(it){
        var best=it.fornitori?it.fornitori.filter(function(s){return s.s!=='alil';}).reduce(function(a,b){return b.p<a.p?b:a;},it.fornitori[0]):null;
        var qtyNeeded=Math.max((it.minQty||10)*2-(it.qty||0),it.minQty||10);
        return '<div style="padding:7px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">'
          +'<span style="font-size:14px">'+it.emoji+'</span>'
          +'<div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+it.name.slice(0,28)+'</div>'
          +'<div style="font-size:9px;color:#ef4444">Stock: '+(it.qty||0)+' · Min: '+(it.minQty||0)+'</div></div>'
          +(best?'<a href="'+( window.FORNITORI?.[best.s]?.url||'#')+'" target="_blank" style="padding:3px 8px;background:rgba(99,102,241,.15);color:#818cf8;border-radius:6px;text-decoration:none;font-size:9px;font-weight:700;white-space:nowrap">🛒 Ordina</a>':'')
          +'</div>';
      }).join('')
      +'<button onclick="App&&App.navigate(\'magazzino\')" style="width:100%;margin-top:8px;padding:7px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.25);border-radius:8px;cursor:pointer;font-size:11px;font-weight:700">Vai al Magazzino</button>';
    document.body.appendChild(bar);
  },
};
// Auto-check on startup
setTimeout(function(){MagazzinoSync.checkReorderAlerts();},5000);
// Auto-sync on startup
setTimeout(function(){MagazzinoSync.syncToLaserB2B();},3000);
// Check reorder every 30 min
setInterval(function(){MagazzinoSync.checkReorderAlerts();},1800000);

// ─── 4. FATTURA PA MIGLIORATA ─────────────────────────────────
(function _enhanceFattura(){
  function _p(){
    if(typeof XMLSDIModule==='undefined'){setTimeout(_p,800);return;}
    if(XMLSDIModule._v35enhanced) return; XMLSDIModule._v35enhanced=true;
    // Add IVA config integration
    XMLSDIModule._getIVARate=function(){
      var cfg={}; try{cfg=JSON.parse(localStorage.getItem('ingly_iva_cfg')||'{}');}catch(e){}
      if(cfg.regime==='forfettario') return 0;
      if(cfg.rate) return cfg.rate;
      return 22;
    };
    // Patch render to show IVA regime info
    var _oR=XMLSDIModule.render.bind(XMLSDIModule);
    XMLSDIModule.render=function(){
      _oR();
      var el=document.getElementById('view-xmlsdi');
      if(!el) return;
      var cfg={}; try{cfg=JSON.parse(localStorage.getItem('ingly_iva_cfg')||'{}');}catch(e){}
      var regime=cfg.regime||'ordinario';
      var infoDiv=document.createElement('div');
      infoDiv.style.cssText='padding:8px 14px;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:8px;font-size:11px;margin-top:10px;display:flex;align-items:center;gap:8px';
      infoDiv.innerHTML='<span style="font-size:14px">'+(regime==='forfettario'?'📋':'📊')+'</span>'
        +'<span>Regime fiscale: <strong>'+(regime==='forfettario'?'Forfettario (IVA 0%)':'Ordinario IVA '+( cfg.rate||22)+'%')+'</strong></span>'
        +'<button onclick="IVAConfig.openSettings()" style="margin-left:auto;padding:4px 9px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:10px;color:var(--text-muted)">⚙️ Configura</button>';
      el.insertBefore(infoDiv,el.firstChild);
    };
    console.log('[FatturaPAv35] IVA integration enhanced');
  }
  setTimeout(_p,1500);
})();

// ─── 5. PWA — Progressive Web App ────────────────────────────
(function _pwa(){
  if(document.getElementById('pwa-manifest')) return;
  var manifestData={
    name:'Ingly OS',short_name:'Ingly',start_url:'./',display:'standalone',
    background_color:'#0f172a',theme_color:'#6366f1',
    description:'Laser Business Management System',
    icons:[{src:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%236366f1" rx="20"/><text y=".9em" font-size="80" x="10">⚡</text></svg>',sizes:'any',type:'image/svg+xml'}]
  };
  var manifestBlob=new Blob([JSON.stringify(manifestData)],{type:'application/manifest+json'});
  var manifestUrl=URL.createObjectURL(manifestBlob);
  var link=document.createElement('link'); link.id='pwa-manifest'; link.rel='manifest'; link.href=manifestUrl;
  document.head.appendChild(link);
  // Theme color
  var meta=document.createElement('meta'); meta.name='theme-color'; meta.content='#6366f1';
  document.head.appendChild(meta);
  // Viewport
  if(!document.querySelector('meta[name=viewport]')){
    var vp=document.createElement('meta'); vp.name='viewport'; vp.content='width=device-width,initial-scale=1,maximum-scale=1';
    document.head.appendChild(vp);
  }
  // Apple PWA tags
  var apple=document.createElement('meta'); apple.name='apple-mobile-web-app-capable'; apple.content='yes';
  document.head.appendChild(apple);
  var appleStatus=document.createElement('meta'); appleStatus.name='apple-mobile-web-app-status-bar-style'; appleStatus.content='black-translucent';
  document.head.appendChild(appleStatus);
  // Service Worker for offline
  if('serviceWorker' in navigator){
    var swCode='var CACHE="ingly-v35";self.addEventListener("install",function(e){e.waitUntil(caches.open(CACHE))});self.addEventListener("fetch",function(e){e.respondWith(caches.match(e.request).then(function(r){return r||fetch(e.request).then(function(res){return caches.open(CACHE).then(function(c){c.put(e.request,res.clone());return res;})})}))});';
    var swBlob=new Blob([swCode],{type:'application/javascript'});
    var swUrl=URL.createObjectURL(swBlob);
    navigator.serviceWorker.register(swUrl).catch(function(){});
  }
  // Install button
  var deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',function(e){
    e.preventDefault(); deferredPrompt=e;
    var btn=document.createElement('button'); btn.id='pwa-install-btn';
    btn.style.cssText='position:fixed;bottom:20px;left:20px;z-index:9998;padding:10px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:12px;cursor:pointer;font-size:12px;font-weight:700;box-shadow:0 4px 20px rgba(99,102,241,.4);display:flex;align-items:center;gap:6px';
    btn.innerHTML='📱 Installa App';
    btn.onclick=function(){if(deferredPrompt){deferredPrompt.prompt();deferredPrompt.userChoice.then(function(){btn.remove();});}};
    document.body.appendChild(btn);
    setTimeout(function(){if(document.getElementById('pwa-install-btn')){btn.style.opacity='0.7';}},30000);
  });
  console.log('[PWA] Manifest + Service Worker registered');
})();

// ─── 6. WHATSAPP BUSINESS ENHANCED ───────────────────────────
window.WABusiness = {
  _SK: 'ingly_wa_templates_v1',
  TEMPLATES: {
    preventivo:  '🎨 *Preventivo #{num}*\nCaro {cliente},\n\nHo preparato il tuo preventivo:\n\n{voci}\n\n💶 *Totale: €{totale}*\n_Valido 7 giorni_\n\nRispondimi per confermare ✅',
    conferma:    '✅ *Ordine Confermato*\nCaro {cliente}, il tuo ordine #{num} è confermato!\n\n📦 *{descrizione}*\n💶 €{totale}\n⏱ Consegna: {giorni} giorni lavorativi\n\nTi aggiornerò appena pronto! 🚀',
    lavorazione: '⚙️ *Ordine in Lavorazione*\nCaro {cliente}, il tuo ordine #{num} è entrato in produzione!\n\n📦 {descrizione}\n\n_Aggiornamento stimato: {data}_',
    pronto:      '🎉 *Ordine Pronto!*\nCaro {cliente}, il tuo ordine #{num} è PRONTO!\n\n📦 {descrizione}\n💶 €{totale}\n\n📍 Disponibile per ritiro o spedizione.\nCome preferisci procedere?',
    followup:    '😊 *Come stai con il tuo ordine?*\nCaro {cliente}, volevo assicurarmi che tutto sia di tuo gradimento!\n\nSe hai bisogno di qualcosa o vuoi fare un nuovo ordine, sono qui 😊\n\n_Ingly Laser_ ⚡',
    reminder_prev: '⏰ *Promemoria Preventivo*\nCaro {cliente}, il preventivo #{num} (€{totale}) scadrà tra pochi giorni.\n\nVuoi procedere? Rispondimi ✅',
  },
  loadTemplates: function(){ try{var s=localStorage.getItem(this._SK);return s?Object.assign({},this.TEMPLATES,JSON.parse(s)):this.TEMPLATES;}catch(e){return this.TEMPLATES;} },

  fill: function(tpl,data){
    return (this.loadTemplates()[tpl]||tpl)
      .replace(/{num}/g,data.num||'')
      .replace(/{cliente}/g,data.cliente?.split(' ')[0]||'')
      .replace(/{voci}/g,(data.voci||[]).map(function(v){return '• '+v.qty+'x '+v.name+' — €'+(v.total||0).toFixed(2);}).join('\n'))
      .replace(/{totale}/g,(data.totale||0).toFixed(2))
      .replace(/{descrizione}/g,data.descrizione||'')
      .replace(/{giorni}/g,data.giorni||'5-7')
      .replace(/{data}/g,data.data||new Date(Date.now()+5*864e5).toLocaleDateString('it'));
  },

  sendWithTemplate: function(phone, tplKey, data){
    var msg=this.fill(tplKey,data);
    var clean=(phone||'').replace(/\D/g,'');
    if(!clean){ if(typeof toast!=='undefined') toast('Numero telefono mancante','error'); return; }
    window.open('https://wa.me/'+clean+'?text='+encodeURIComponent(msg),'_blank');
  },

  openTemplateEditor: function(){
    var w=window.open('','_blank','width=800,height=600');
    if(!w){if(typeof toast!=='undefined') toast('Abilita popup','info');return;}
    var templates=this.loadTemplates();
    var tplNames={preventivo:'📄 Preventivo',conferma:'✅ Conferma ordine',lavorazione:'⚙️ In lavorazione',pronto:'🎉 Ordine pronto',followup:'😊 Follow-up',reminder_prev:'⏰ Promemoria prev.'};
    function _logic(){
      var templates=window._tpls||{};
      window.saveTpl=function(){
        Object.keys(templates).forEach(function(k){
          var ta=document.getElementById('ta-'+k);
          if(ta) templates[k]=ta.value;
        });
        localStorage.setItem('ingly_wa_templates_v1',JSON.stringify(templates));
        alert('✅ Template salvati!');
      };
    }
    w._tpls=templates;
    var rows=Object.entries(tplNames).map(function(kv){
      var k=kv[0]; var l=kv[1];
      return '<div style="margin-bottom:14px"><label style="font-size:10px;color:#64748b;font-weight:700;display:block;margin-bottom:4px">'+l+' <span style="color:#334155;font-weight:400">({cliente},{num},{totale},{voci},{descrizione},{giorni})</span></label>'
        +'<textarea id="ta-'+k+'" style="width:100%;padding:9px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#f1f5f9;font-size:11px;height:80px;resize:vertical;font-family:monospace">'+( templates[k]||'')+'</textarea></div>';
    }).join('');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Template WA</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;font-size:13px}'
      +'h2{font-size:16px;font-weight:900;margin-bottom:4px}.sb{padding:9px 18px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700}'
      +'</style></head><body>'
      +'<h2>💬 Template WhatsApp Business</h2>'
      +'<p style="font-size:11px;color:#64748b;margin-bottom:16px">Personalizza i messaggi automatici per ogni fase del lavoro</p>'
      +rows
      +'<div style="display:flex;gap:8px"><button class="sb" style="background:#25D366;color:#fff" onclick="saveTpl()">💾 Salva Template</button><button class="sb" style="background:#1e293b;color:#94a3b8;border:1px solid #334155" onclick="close()">Chiudi</button></div>'
      +'</body></html>');
    w.document.close();
    var sc=w.document.createElement('script'); sc.textContent='('+_logic.toString()+')()'; w.document.head.appendChild(sc);
  },
};

// Add WA send button to OrderTracker rows
(function _patchOrdersWA(){
  function _p(){
    if(typeof OrderTracker==='undefined'){setTimeout(_p,700);return;}
    if(OrderTracker._v35wa) return; OrderTracker._v35wa=true;
    var _orig=OrderTracker.render.bind(OrderTracker);
    OrderTracker.render=function(){
      _orig();
      // Inject WA Business buttons using template system
      var orders=[]; try{orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');}catch(e){}
      orders.forEach(function(o,i){
        var row=document.querySelector('#view-order_tracker tbody tr:nth-child('+(i+1)+')');
        if(!row||!o.phone) return;
        var cell=row.querySelector('td:last-child div');
        if(!cell||cell.querySelector('.wa-biz-btn')) return;
        var btn=document.createElement('button');
        btn.className='wa-biz-btn';
        btn.title='Invia WA con template';
        btn.style.cssText='padding:3px 7px;background:rgba(37,211,102,.12);color:#25D366;border:1px solid rgba(37,211,102,.3);border-radius:5px;cursor:pointer;font-size:11px';
        btn.innerHTML='💬';
        btn.onclick=(function(ord){return function(){
          var tplMap={draft:'preventivo',confirmed:'conferma',in_progress:'lavorazione',delivered:'pronto',paid:'followup'};
          var tpl=tplMap[ord.status]||'preventivo';
          WABusiness.sendWithTemplate(ord.phone,tpl,{
            num:ord.id.toString().slice(-4),cliente:ord.client,
            totale:ord.total||0,descrizione:ord.description||''
          });
        };})(o);
        cell.insertBefore(btn,cell.firstChild);
      });
    };
  }
  setTimeout(_p,2000);
})();

// ─── 7. STATISTICHE VENDITE AVANZATE ─────────────────────────
window.SalesStats = {
  render: function(){
    var quotes=[]; try{quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');}catch(e){}
    var orders=[]; try{orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');}catch(e){}
    var clients=[]; try{clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');}catch(e){}
    var now=new Date(); var ym=now.toISOString().slice(0,7);
    var lm=new Date(now.getFullYear(),now.getMonth()-1,1).toISOString().slice(0,7);

    // Monthly revenue
    function isMo(d,m){return d&&d.slice(0,7)===m;}
    var revTM=quotes.filter(function(q){return isMo(q.date,ym)&&q.status!=='draft';}).reduce(function(a,q){return a+(q.total||0);},0);
    var revLM=quotes.filter(function(q){return isMo(q.date,lm)&&q.status!=='draft';}).reduce(function(a,q){return a+(q.total||0);},0);

    // Last 12 months
    var months12=[]; for(var i=11;i>=0;i--){var d=new Date(now.getFullYear(),now.getMonth()-i,1);months12.push({ym:d.toISOString().slice(0,7),l:d.toLocaleDateString('it',{month:'short',year:'2-digit'})});}
    var rev12=months12.map(function(m){return quotes.filter(function(q){return isMo(q.date,m.ym);}).reduce(function(a,q){return a+(q.total||0);},0);});
    var maxRev=Math.max.apply(null,rev12)||1;

    // Top products
    var prodCnt={};
    quotes.forEach(function(q){var p=q.product||q.products?.map(function(x){return x.name;}).join(',')||'';if(p) prodCnt[p]=(prodCnt[p]||0)+(q.qty||1);});
    var topProds=Object.entries(prodCnt).sort(function(a,b){return b[1]-a[1];}).slice(0,8);

    // Top clients
    var cliRev={};
    quotes.forEach(function(q){if(q.client) cliRev[q.client]=(cliRev[q.client]||0)+(q.total||0);});
    var topCli=Object.entries(cliRev).sort(function(a,b){return b[1]-a[1];}).slice(0,8);

    // Inactive clients (no order > 30 days)
    var inactive=clients.filter(function(c){
      var lastQ=quotes.filter(function(q){return q.client===c.name;}).sort(function(a,b){return b.date?.localeCompare(a.date||'');});
      if(!lastQ.length) return true;
      return Date.now()-new Date(lastQ[0].date||0).getTime()>30*864e5;
    }).slice(0,5);

    var w=window.open('','_blank','width=1000,height=700');
    if(!w){if(typeof toast!=='undefined')toast('Abilita popup','info');return;}
    var delta=revLM>0?Math.round((revTM-revLM)/revLM*100):0;
    var monthBars=rev12.map(function(v,i){
      var h=Math.max(4,Math.round(v/maxRev*80));
      var isCur=i===11;
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">'
        +'<div style="font-size:8px;color:'+(isCur?'#6366f1':'#64748b')+';font-weight:'+(isCur?'800':'400')+'">€'+( v>0?Math.round(v):'')+'</div>'
        +'<div style="width:100%;height:'+h+'px;background:'+(isCur?'#6366f1':'#6366f120')+';border-radius:3px 3px 0 0"></div>'
        +'<div style="font-size:7px;color:#64748b">'+months12[i].l+'</div></div>';
    }).join('');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>📊 Statistiche Vendite</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;font-size:13px}'
      +'h2{font-size:18px;font-weight:900;margin-bottom:4px}'
      +'.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}'
      +'.kpi{background:#1e293b;border-radius:12px;padding:14px;text-align:center}'
      +'.kv{font-size:22px;font-weight:900;margin:4px 0}'
      +'.kl{font-size:9px;color:#64748b;text-transform:uppercase;font-weight:700}'
      +'.grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:14px;margin-bottom:14px}'
      +'.card{background:#1e293b;border-radius:12px;padding:14px}'
      +'.ct{font-size:12px;font-weight:800;margin-bottom:10px}'
      +'</style></head><body>'
      +'<h2>📊 Statistiche Vendite Avanzate</h2>'
      +'<p style="font-size:11px;color:#64748b">Basato su '+quotes.length+' preventivi · '+orders.length+' ordini · '+clients.length+' clienti</p>'
      +'<div class="kpis">'
      +'<div class="kpi"><div class="kl">Entrate Mese</div><div class="kv" style="color:#6366f1">€'+revTM.toFixed(0)+'</div>'
      +'<div style="font-size:10px;color:'+(delta>=0?'#22c55e':'#ef4444')+'">'+(delta>=0?'▲':'▼')+Math.abs(delta)+'% vs mese sc.</div></div>'
      +'<div class="kpi"><div class="kl">Entrate Mese Sc.</div><div class="kv" style="color:#94a3b8">€'+revLM.toFixed(0)+'</div></div>'
      +'<div class="kpi"><div class="kl">Clienti Inattivi >30gg</div><div class="kv" style="color:#f59e0b">'+inactive.length+'</div></div>'
      +'<div class="kpi"><div class="kl">Preventivi Totali</div><div class="kv" style="color:#10b981">'+quotes.length+'</div></div>'
      +'</div>'
      +'<div class="grid">'
      +'<div class="card"><div class="ct">📈 Entrate Ultimi 12 Mesi</div>'
      +'<div style="display:flex;align-items:flex-end;gap:4px;height:90px;border-bottom:1px solid #334155">'+monthBars+'</div></div>'
      +'<div class="card"><div class="ct">🏆 Top Prodotti</div>'
      +(topProds.length?topProds.map(function(p,i){var maxV=topProds[0][1]||1;return '<div style="margin-bottom:5px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:1px"><span>'+(i+1)+'. '+p[0].slice(0,20)+'</span><span style="color:#64748b">'+p[1]+'</span></div><div style="height:4px;background:#1e293b;border-radius:2px"><div style="height:4px;background:#6366f1;width:'+Math.round(p[1]/maxV*100)+'%;border-radius:2px"></div></div></div>';}).join(''):'<div style="color:#64748b;font-size:11px">Nessun dato</div>')
      +'</div>'
      +'<div class="card"><div class="ct">👥 Top Clienti</div>'
      +(topCli.length?topCli.map(function(c,i){var maxV=topCli[0][1]||1;return '<div style="margin-bottom:5px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:1px"><span>'+(i+1)+'. '+c[0].slice(0,18)+'</span><span style="color:#10b981">€'+c[1].toFixed(0)+'</span></div><div style="height:4px;background:#1e293b;border-radius:2px"><div style="height:4px;background:#10b981;width:'+Math.round(c[1]/maxV*100)+'%;border-radius:2px"></div></div></div>';}).join(''):'<div style="color:#64748b;font-size:11px">Nessun dato</div>')
      +'</div></div>'
      +(inactive.length?'<div class="card" style="margin-bottom:14px"><div class="ct">⚠️ Clienti da Ricontattare (inattivi >30gg)</div><div style="display:flex;gap:8px;flex-wrap:wrap">'+inactive.map(function(c){return '<div style="padding:6px 10px;background:#f59e0b15;border:1px solid #f59e0b30;border-radius:8px;font-size:11px;display:flex;align-items:center;gap:6px"><span>👤 '+c.name+'</span>'+(c.phone?'<a href="https://wa.me/'+c.phone.replace(/\D/g,'')+'" target="_blank" style="color:#25D366;font-size:12px">💬</a>':'')+'</div>';}).join('')+'</div></div>':'')
      +'<button onclick="close()" style="padding:9px 18px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:8px;cursor:pointer">Chiudi</button>'
      +'</body></html>');
    w.document.close();
  }
};

// ─── 8. GOOGLE CALENDAR — Enhanced ICS Export ────────────────
(function _enhanceCalendar(){
  function _p(){
    if(typeof CalendarExport==='undefined'){setTimeout(_p,600);return;}
    if(CalendarExport._v35) return; CalendarExport._v35=true;
    CalendarExport.exportAll=function(){
      var orders=[]; try{orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');}catch(e){}
      var quotes=[]; try{quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');}catch(e){}
      var ics='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Ingly Laser//ICAL//IT\r\nCALSCALE:GREGORIAN\r\nX-WR-CALNAME:Ingly Ordini\r\nX-WR-TIMEZONE:Europe/Rome\r\n';
      function fmt(d){return d.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';}
      orders.filter(function(o){return ['confirmed','in_progress'].indexOf(o.status)>-1;}).forEach(function(o){
        var created=new Date(o.created||o.date||Date.now());
        var deadline=new Date(created.getTime()+7*864e5);
        ics+='BEGIN:VEVENT\r\nUID:order-'+o.id+'@ingly\r\nDTSTART:'+fmt(created)+'\r\nDTEND:'+fmt(deadline)+'\r\n';
        ics+='SUMMARY:📦 '+o.client+' – €'+(o.total||0).toFixed(0)+'\r\n';
        ics+='DESCRIPTION:'+( o.description||'').replace(/\n/g,'\\n')+'\r\nSTATUS:CONFIRMED\r\n';
        ics+='CATEGORIES:Ordine\r\nCOLOR:LIME\r\nEND:VEVENT\r\n';
      });
      // Add expiring quotes (30 days from creation)
      quotes.filter(function(q){return q.status==='draft';}).forEach(function(q){
        var qDate=new Date(q.date||Date.now());
        var expiry=new Date(qDate.getTime()+30*864e5);
        if(expiry>new Date()){
          ics+='BEGIN:VEVENT\r\nUID:quote-'+q.id+'@ingly\r\nDTSTART;VALUE=DATE:'+expiry.toISOString().slice(0,10).replace(/-/g,'')+'\r\nDTEND;VALUE=DATE:'+expiry.toISOString().slice(0,10).replace(/-/g,'')+'\r\n';
          ics+='SUMMARY:⏰ Scadenza preventivo – '+q.client+' €'+(q.total||0).toFixed(0)+'\r\nCATEGORIES:Preventivo\r\nCOLOR:YELLOW\r\nEND:VEVENT\r\n';
        }
      });
      ics+='END:VCALENDAR';
      var blob=new Blob([ics],{type:'text/calendar;charset=utf-8'});
      var a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download='ingly_calendario_'+new Date().toISOString().slice(0,10)+'.ics'; a.click();
      if(typeof toast!=='undefined') toast('📅 Calendario esportato (ordini + scadenze preventivi)','success');
    };
  }
  setTimeout(_p,1500);
})();

console.log('[v35-P1] Magazzino Sync · Supplier History · Reorder Alert · FatturaPAv · PWA · WA Business · Stats · Calendar loaded');

