
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v35 — Feature Pack Part 2 (Features 9-15)
// 9. Listino Clienti  10. Barcode Scanner  11. Template Branded
// 12. Note Interne  13. Archivio Preventivi  14. Import Excel  15. IVA
// ═══════════════════════════════════════════════════════════════════

// ─── 9. SISTEMA LISTINO PREZZI CLIENTI ───────────────────────
window.ClientListino = {
  _SK: 'ingly_listino_v1',
  load: function(){ try{return JSON.parse(localStorage.getItem(this._SK)||'{}');}catch(e){return{};} },
  save: function(d){ try{localStorage.setItem(this._SK,JSON.stringify(d));}catch(e){} },

  getDiscount: function(clientName){
    var l=this.load(); var c=clientName.toLowerCase().trim();
    return l[c]?.discount||0;
  },
  getMarkup: function(clientName, baseMarkup){
    var disc=this.getDiscount(clientName);
    return baseMarkup*(1-disc/100);
  },

  openManager: function(){
    var clients=[]; try{clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');}catch(e){}
    var listino=this.load();
    var w=window.open('','_blank','width=750,height=580');
    if(!w){if(typeof toast!=='undefined')toast('Abilita popup','info');return;}

    function _logic(){
      var listino=window._listino||{}; var clients=window._clients||[];
      window.setDisc=function(el){var safeKey=el.getAttribute('data-key')||'';var val=el.value;var k=safeKey;var name='';
        var k=name.toLowerCase().trim();
        val=Math.max(0,Math.min(50,parseFloat(val)||0));
        if(val===0) delete listino[k];
        else listino[k]={discount:val,name:name};
        localStorage.setItem('ingly_listino_v1',JSON.stringify(listino));
        if(safeKey){var el2=document.getElementById('disc-'+safeKey);if(el2)el2.textContent=val+'%';}
      };
    }

    var rows=clients.map(function(c){
      var k=c.name.toLowerCase().trim();
      var d=listino[k]?.discount||0;
      var safeKey=btoa(unescape(encodeURIComponent(k))).replace(/[+/=]/g,'').slice(0,12);
      var tc=(c.tags||'').split(',')[0]?.trim()||'';
      return '<tr style="border-bottom:1px solid #1e293b">'
        +'<td style="padding:8px 12px;font-weight:700">'+c.name+'<div style="font-size:9px;color:#64748b">'+( c.company||'')+' '+( tc?'· '+tc:'')+'</div></td>'
        +'<td style="padding:8px 12px;text-align:center">'
        +'<div style="display:flex;align-items:center;gap:8px;justify-content:center">'
        +'<input type="range" min="0" max="40" step="1" value="'+d+'" oninput="setDisc(this)" data-key="'+safeKey+'" style="width:100px;accent-color:#6366f1">'
        +'<span id="disc-'+safeKey+'" style="font-size:13px;font-weight:800;color:'+(d>0?'#f59e0b':'#64748b')+';min-width:35px">'+d+'%</span>'
        +'</div></td>'
        +'<td style="padding:8px 12px;font-size:11px;color:#64748b">'+(d>0?'Markup ×2.0 → ×'+(2*(1-d/100)).toFixed(2):'Standard')+'</td>'
        +'</tr>';
    }).join('');

    w._listino=listino; w._clients=clients;
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>💰 Listino Prezzi Clienti</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;font-size:13px}'
      +'table{width:100%;border-collapse:collapse}th{background:#1e293b;padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase}'
      +'</style></head><body>'
      +'<h2 style="font-size:16px;font-weight:900;margin-bottom:4px">💰 Listino Prezzi Clienti</h2>'
      +'<p style="font-size:11px;color:#64748b;margin-bottom:14px">Imposta sconti personalizzati per ogni cliente (max 40%). Si applicano automaticamente nei preventivi.</p>'
      +'<table><thead><tr><th>Cliente</th><th style="text-align:center">Sconto Speciale</th><th>Effetto sul markup</th></tr></thead>'
      +'<tbody>'+rows+'</tbody></table>'
      +'<div style="margin-top:16px;display:flex;gap:8px">'
      +'<button onclick="close()" style="padding:9px 18px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">✅ Chiudi e Salva</button>'
      +'</div></body></html>');
    w.document.close();
    var sc=w.document.createElement('script'); sc.textContent='('+_logic.toString()+')()'; w.document.head.appendChild(sc);
  },
};
// Patch QuoteGeneratorV2 to apply client listino
(function _patchQGV2Listino(){
  function _p(){
    if(typeof QuoteGeneratorV2==='undefined'){setTimeout(_p,700);return;}
    if(QuoteGeneratorV2._v35listino) return; QuoteGeneratorV2._v35listino=true;
    var _origOpen=QuoteGeneratorV2.open.bind(QuoteGeneratorV2);
    QuoteGeneratorV2.open=function(opts){
      opts=opts||{};
      // Pass listino discount to popup via _preDiscount
      if(opts.clientName){
        var disc=ClientListino.getDiscount(opts.clientName);
        if(disc>0) opts._clientDiscount=disc;
      }
      _origOpen(opts);
    };
  }
  setTimeout(_p,1500);
})();

// ─── 10. BARCODE / QR SCANNER (Camera) ───────────────────────
window.BarcodeScanner = {
  _stream: null,
  open: function(onResult){
    if(!navigator.mediaDevices?.getUserMedia){
      if(typeof toast!=='undefined') toast('Camera non disponibile su questo browser','error'); return;
    }
    var old=document.getElementById('barcode-scanner-modal'); if(old) old.remove();
    var modal=document.createElement('div'); modal.id='barcode-scanner-modal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px';
    modal.innerHTML='<div style="font-size:16px;font-weight:800;color:#fff">📷 Scanner Barcode / QR</div>'
      +'<video id="bc-video" autoplay playsinline style="max-width:90vw;max-height:50vh;border:3px solid #6366f1;border-radius:12px"></video>'
      +'<canvas id="bc-canvas" style="display:none"></canvas>'
      +'<input id="bc-manual" placeholder="O digita EAN manualmente..." style="padding:10px 14px;background:#1e293b;border:1px solid #334155;border-radius:9px;color:#f1f5f9;font-size:14px;width:280px;text-align:center">'
      +'<div style="display:flex;gap:8px">'
      +'<button onclick="BarcodeScanner._capture()" style="padding:10px 20px;background:#6366f1;color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:700">📸 Scansiona</button>'
      +'<button onclick="BarcodeScanner._useManual()" style="padding:10px 20px;background:#10b981;color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:700">✅ Usa Codice</button>'
      +'<button onclick="BarcodeScanner.close()" style="padding:10px 20px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:9px;cursor:pointer;font-size:13px">✕ Chiudi</button>'
      +'</div>'
      +'<div style="font-size:10px;color:#64748b">Punta la camera al barcode/QR code del prodotto</div>';
    document.body.appendChild(modal);
    this._onResult=onResult;
    navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(function(stream){
      BarcodeScanner._stream=stream;
      var v=document.getElementById('bc-video'); if(v) v.srcObject=stream;
    }).catch(function(e){
      if(typeof toast!=='undefined') toast('Camera non accessibile: '+e.message,'error');
      BarcodeScanner.close();
    });
    // Try BarcodeDetector API
    if('BarcodeDetector' in window){
      this._barcodeDetector=new BarcodeDetector({formats:['ean_13','ean_8','qr_code','code_128','code_39']});
      this._scanInterval=setInterval(function(){BarcodeScanner._autoScan();},500);
    }
  },
  _autoScan: function(){
    var v=document.getElementById('bc-video'); if(!v) return;
    if(this._barcodeDetector&&v.readyState>=2){
      this._barcodeDetector.detect(v).then(function(codes){
        if(codes.length){BarcodeScanner._found(codes[0].rawValue);}
      }).catch(function(){});
    }
  },
  _capture: function(){
    var v=document.getElementById('bc-video'); var c=document.getElementById('bc-canvas');
    if(!v||!c) return;
    c.width=v.videoWidth; c.height=v.videoHeight;
    c.getContext('2d').drawImage(v,0,0);
    // Use result from auto-scan or manual
    if(typeof toast!=='undefined') toast('Scansione manuale — digita il codice o usa la lettura automatica','info');
  },
  _useManual: function(){
    var inp=document.getElementById('bc-manual'); if(!inp) return;
    var code=inp.value.trim(); if(!code){ alert('Inserisci un codice!'); return; }
    this._found(code);
  },
  _found: function(code){
    clearInterval(this._scanInterval);
    if(this._onResult) this._onResult(code);
    this.close();
    if(typeof toast!=='undefined') toast('📦 Codice rilevato: '+code,'success');
    // Try to find in magazzino and update qty
    var items=[]; try{items=JSON.parse(localStorage.getItem('ingly_magazzino_v34')||'[]');}catch(e){}
    var match=items.find(function(it){return it.barcode===code||it.ean===code;});
    if(match){
      if(typeof toast!=='undefined') toast('📦 Trovato in magazzino: '+match.name+' (qty: '+match.qty+')\nUsa +/- nella scheda per aggiornare','info');
    } else {
      if(typeof toast!=='undefined') toast('🔍 Codice '+code+' non trovato in magazzino — aggiungilo manualmente','info');
    }
  },
  close: function(){
    clearInterval(this._scanInterval);
    if(this._stream) this._stream.getTracks().forEach(function(t){t.stop();}); this._stream=null;
    document.getElementById('barcode-scanner-modal')?.remove();
  },
};
// Add scanner button to Magazzino header
(function _addScannerBtn(){
  function _p(){
    if(typeof MagazzinoGadget==='undefined'){setTimeout(_p,700);return;}
    if(MagazzinoGadget._v35scan) return; MagazzinoGadget._v35scan=true;
    var _origRender=MagazzinoGadget.render.bind(MagazzinoGadget);
    MagazzinoGadget.render=function(){
      _origRender();
      setTimeout(function(){
        var hdr=document.querySelector('#view-magazzino .hdr-btns, #view-magazzino button:first-of-type');
        var exportBtn=document.querySelector('#view-magazzino button[onclick*="exportCSV"]');
        if(exportBtn&&!document.getElementById('scan-btn-mag')){
          var scanBtn=document.createElement('button'); scanBtn.id='scan-btn-mag';
          scanBtn.style.cssText='padding:8px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted)';
          scanBtn.textContent='📷 Scanner';
          scanBtn.onclick=function(){BarcodeScanner.open(function(code){console.log('Scanned:',code);});};
          exportBtn.insertAdjacentElement('beforebegin',scanBtn);
        }
      },300);
    };
  }
  setTimeout(_p,2500);
})();

// ─── 11. TEMPLATE PREVENTIVI BRANDED ─────────────────────────
window.BrandConfig = {
  _SK: 'ingly_brand_v1',
  load: function(){ try{return JSON.parse(localStorage.getItem(this._SK)||'null')||{name:'Ingly Laser',tagline:'Personalizzazione Laser · Palermo',primaryColor:'#6366f1',vatNum:'',phone:'',email:'',website:'',logoEmoji:'⚡',footer:'Grazie per aver scelto i nostri servizi!'};}catch(e){return{};} },
  save: function(d){ try{localStorage.setItem(this._SK,JSON.stringify(d));}catch(e){} },
  openSettings: function(){
    var cfg=this.load(); var self=this;
    var old=document.getElementById('brand-modal'); if(old) old.remove();
    var modal=document.createElement('div'); modal.id='brand-modal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
    modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:480px;max-width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.6)">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">'
      +'<span style="font-size:22px">🎨</span>'
      +'<div><div style="font-size:16px;font-weight:900;color:var(--text)">Brand & Identità Aziendale</div>'
      +'<div style="font-size:11px;color:var(--text-muted)">Appare su tutti i PDF preventivi</div></div>'
      +'<button onclick="document.getElementById(\'brand-modal\').remove()" style="margin-left:auto;background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:22px">✕</button>'
      +'</div>'
      +'<div style="display:grid;gap:10px">'
      +[
        {l:'Nome Attività',id:'br-name',v:cfg.name,ph:'Es. Ingly Laser'},
        {l:'Tagline',id:'br-tag',v:cfg.tagline,ph:'Es. Personalizzazione Laser · Palermo'},
        {l:'P.IVA / CF',id:'br-vat',v:cfg.vatNum,ph:'IT01234567890'},
        {l:'Telefono',id:'br-phone',v:cfg.phone,ph:'+39 333 000 0000'},
        {l:'Email',id:'br-email',v:cfg.email,ph:'info@miaattivita.it'},
        {l:'Website',id:'br-web',v:cfg.website,ph:'www.miaattivita.it'},
        {l:'Logo Emoji',id:'br-logo',v:cfg.logoEmoji,ph:'⚡'},
        {l:'Note piè di pagina PDF',id:'br-footer',v:cfg.footer,ph:'Grazie per aver scelto...'},
      ].map(function(f){
        return '<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">'+f.l+'</label>'
          +'<input id="'+f.id+'" value="'+f.v.replace(/"/g,'&quot;')+'" placeholder="'+f.ph+'" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>';
      }).join('')
      +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Colore Primario PDF</label>'
      +'<input id="br-color" type="color" value="'+( cfg.primaryColor||'#6366f1')+'" style="width:100%;padding:5px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;height:42px;cursor:pointer"></div>'
      +'</div>'
      +'<div style="display:flex;gap:8px;margin-top:16px">'
      +'<button onclick="BrandConfig._saveBrand()" style="flex:1;padding:11px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva Brand</button>'
      +'<button onclick="document.getElementById(\'brand-modal\').remove()" style="padding:11px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;color:var(--text-muted)">Annulla</button>'
      +'</div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
  },
  _saveBrand: function(){
    var d={
      name:    document.getElementById('br-name')?.value||'',
      tagline: document.getElementById('br-tag')?.value||'',
      vatNum:  document.getElementById('br-vat')?.value||'',
      phone:   document.getElementById('br-phone')?.value||'',
      email:   document.getElementById('br-email')?.value||'',
      website: document.getElementById('br-web')?.value||'',
      logoEmoji:document.getElementById('br-logo')?.value||'⚡',
      footer:  document.getElementById('br-footer')?.value||'',
      primaryColor:document.getElementById('br-color')?.value||'#6366f1',
    };
    this.save(d); document.getElementById('brand-modal')?.remove();
    if(typeof toast!=='undefined') toast('🎨 Brand salvato! I PDF useranno questi dati','success');
  },
  getBrandedHeader: function(extra){
    var cfg=this.load();
    var c=cfg.primaryColor||'#6366f1';
    return '<div style="display:flex;justify-content:space-between;padding-bottom:20px;border-bottom:3px solid '+c+';margin-bottom:28px">'
      +'<div><div style="font-size:22px;font-weight:900;color:'+c+'">'+cfg.logoEmoji+' '+cfg.name+'</div>'
      +'<div style="font-size:11px;color:#64748b">'+cfg.tagline+'</div>'
      +(cfg.vatNum?'<div style="font-size:10px;color:#94a3b8">P.IVA '+cfg.vatNum+'</div>':'')
      +(cfg.phone||cfg.email?'<div style="font-size:10px;color:#94a3b8">'+(cfg.phone||'')+( cfg.phone&&cfg.email?' · ':'')+( cfg.email||'')+'</div>':'')
      +'</div>'
      +'<div style="text-align:right">'+(extra||'')+'</div></div>';
  },
};
// Add brand settings to Dashboard quick actions
(function _addBrandBtn(){
  setTimeout(function(){
    var da=document.querySelector('[onclick*="DashboardPro.render"]');
    if(da&&!document.getElementById('brand-cfg-btn')){
      var btn=document.createElement('button'); btn.id='brand-cfg-btn';
      btn.style.cssText='padding:8px 14px;background:rgba(139,92,246,.15);color:#8b5cf6;border:1px solid rgba(139,92,246,.3);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700';
      btn.textContent='🎨 Brand';
      btn.onclick=function(){BrandConfig.openSettings();};
      da.insertAdjacentElement('afterend',btn);
    }
  },3000);
})();

// ─── 12. NOTE INTERNE PER CLIENTE ────────────────────────────
window.ClienteNoteInterne = {
  _SK: 'ingly_note_interne_v1',
  load: function(){ try{return JSON.parse(localStorage.getItem(this._SK)||'{}');}catch(e){return{};} },
  save: function(d){ try{localStorage.setItem(this._SK,JSON.stringify(d));}catch(e){} },
  getKey: function(name){ return (name||'').toLowerCase().trim(); },
  get: function(clientName){ return this.load()[this.getKey(clientName)]||{notes:'',flag:'',lastUpdate:''}; },
  set: function(clientName,notes,flag){
    var d=this.load(); d[this.getKey(clientName)]={notes:notes,flag:flag||'',lastUpdate:new Date().toISOString()};
    this.save(d);
  },
  openModal: function(clientName){
    var existing=this.get(clientName);
    var old=document.getElementById('note-int-modal'); if(old) old.remove();
    var modal=document.createElement('div'); modal.id='note-int-modal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
    var FLAGS=[{v:'',l:'— Nessuno'},{v:'vip',l:'⭐ VIP'},{v:'lento',l:'🐌 Paga lento'},{v:'attenzione',l:'⚠️ Attenzione'},{v:'fido',l:'🤝 Fiducia'},{v:'volume',l:'📦 Volume alto'},{v:'sconto',l:'💰 Accordo sconto'}];
    modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:22px;width:440px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6)">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">'
      +'<span style="font-size:22px">🔒</span>'
      +'<div><div style="font-size:15px;font-weight:900;color:var(--text)">Note Interne</div>'
      +'<div style="font-size:11px;color:var(--text-muted)">'+clientName+' · Visibili solo a te</div></div>'
      +'<button onclick="document.getElementById(\'note-int-modal\').remove()" style="margin-left:auto;background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:20px">✕</button>'
      +'</div>'
      +'<div style="display:grid;gap:10px">'
      +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">🏷️ Flag</label>'
      +'<select id="ni-flag" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px">'
      +FLAGS.map(function(f){return '<option value="'+f.v+'"'+(f.v===existing.flag?' selected':'')+'>'+f.l+'</option>';}).join('')
      +'</select></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">📝 Note Private</label>'
      +'<textarea id="ni-notes" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;height:100px;resize:vertical" placeholder="Es. Paga sempre in ritardo, max 30gg · Vuole sempre spedizione espressa · Ordina solo nel weekend...">'+(existing.notes||'')+'</textarea></div>'
      +'</div>'
      +(existing.lastUpdate?'<div style="font-size:10px;color:var(--text-dim);margin-top:6px">Ultimo aggiornamento: '+new Date(existing.lastUpdate).toLocaleDateString('it')+'</div>':'')
      +'<div style="display:flex;gap:8px;margin-top:12px">'
      +'<button onclick="ClienteNoteInterne._save(\''+clientName.replace(/'/g,"'")+'\')" style="flex:1;padding:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva</button>'
      +'<button onclick="document.getElementById(\'note-int-modal\').remove()" style="padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:13px;color:var(--text-muted)">Annulla</button>'
      +'</div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
  },
  _save: function(clientName){
    var notes=document.getElementById('ni-notes')?.value||'';
    var flag=document.getElementById('ni-flag')?.value||'';
    this.set(clientName,notes,flag);
    document.getElementById('note-int-modal')?.remove();
    if(typeof toast!=='undefined') toast('🔒 Note salvate per '+clientName,'success');
    // Refresh CRM if visible
    if(typeof CRMSmart!=='undefined') setTimeout(function(){CRMSmart.render&&CRMSmart.render();},100);
  },
};
// Inject note interne button in CRM rows
(function _injectNoteBtn(){
  function _p(){
    if(typeof CRMSmart==='undefined'||!CRMSmart._v31qbtn){setTimeout(_p,700);return;}
    if(CRMSmart._v35noteBtn) return; CRMSmart._v35noteBtn=true;
    var _orig=CRMSmart.render.bind(CRMSmart);
    CRMSmart.render=function(){
      _orig();
      setTimeout(function(){
        var notes=ClienteNoteInterne.load();
        var data=CRMSmart._load();
        data.forEach(function(c,i){
          var row=document.getElementById('crm-row-'+i); if(!row) return;
          if(row.querySelector('.note-int-btn')) return;
          var cell=row.querySelector('td:last-child>div'); if(!cell) return;
          var key=(c.name||'').toLowerCase().trim();
          var hasNote=notes[key]?.notes;
          var flag=notes[key]?.flag;
          var btn=document.createElement('button'); btn.className='note-int-btn';
          btn.title='Note interne';
          btn.style.cssText='padding:4px 8px;background:rgba(99,102,241,.1);color:#818cf8;border:1px solid rgba(99,102,241,.25);border-radius:6px;cursor:pointer;font-size:11px'+(hasNote?';outline:2px solid rgba(245,158,11,.5)':'');
          btn.textContent=flag==='vip'?'⭐':flag==='lento'?'🐌':flag==='attenzione'?'⚠️':'🔒';
          btn.onclick=(function(name){return function(){ClienteNoteInterne.openModal(name);};})(c.name);
          cell.appendChild(btn);
        });
      },500);
    };
  }
  setTimeout(_p,3000);
})();

// ─── 13. ARCHIVIO PREVENTIVI PER CLIENTE ─────────────────────
window.PreventivoArchivio = {
  openForClient: function(clientName){
    var quotes=[]; try{quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');}catch(e){}
    var cliQuotes=clientName?quotes.filter(function(q){return q.client===clientName;}):quotes;
    cliQuotes.sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
    var w=window.open('','_blank','width=800,height=600');
    if(!w){if(typeof toast!=='undefined')toast('Abilita popup','info');return;}
    var rows=cliQuotes.map(function(q){
      var dt=new Date(q.date||Date.now()).toLocaleDateString('it',{day:'2-digit',month:'2-digit',year:'2-digit'});
      var statusColors={draft:'#64748b',confirmed:'#3b82f6',paid:'#22c55e',cancelled:'#ef4444'};
      var sc=statusColors[q.status||'draft']||'#64748b';
      var prods=(q.products&&Array.isArray(q.products))?q.products.map(function(p){return p.desc||p.name;}).join(', '):(q.product||'');
      return '<tr style="border-bottom:1px solid #1e293b">'
        +'<td style="padding:8px 12px;font-size:10px;color:#64748b">'+dt+'</td>'
        +'<td style="padding:8px 12px;font-weight:700">'+q.client+'</td>'
        +'<td style="padding:8px 12px;font-size:10px;color:#94a3b8;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+prods.slice(0,50)+'</td>'
        +'<td style="padding:8px 12px;font-weight:800;color:#6366f1">€'+(q.total||0).toFixed(2)+'</td>'
        +'<td style="padding:8px 12px"><span style="background:'+sc+'20;color:'+sc+';padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700">'+(q.status||'draft')+'</span></td>'
        +'<td style="padding:8px 12px;text-align:center">'
        +'<button onclick="PreventivoArchivio._reuse('+JSON.stringify(q).replace(/'/g,"'")+')" style="padding:3px 8px;background:rgba(99,102,241,.1);color:#818cf8;border:1px solid rgba(99,102,241,.25);border-radius:5px;cursor:pointer;font-size:10px">♻️ Riusa</button>'
        +'<button onclick="PreventivoArchivio._del(\''+q.id+'\')" style="padding:3px 6px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:5px;cursor:pointer;font-size:10px;margin-left:4px">🗑</button>'
        +'</td></tr>';
    }).join('');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Archivio Preventivi</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;font-size:13px}'
      +'table{width:100%;border-collapse:collapse}th{background:#1e293b;padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase}'
      +'</style></head><body>'
      +'<h2 style="font-size:16px;font-weight:900;margin-bottom:4px">📂 Archivio Preventivi'+(clientName?' — '+clientName:'')+'</h2>'
      +'<p style="font-size:11px;color:#64748b;margin-bottom:14px">'+cliQuotes.length+' preventivi trovati · Click "Riusa" per creare un nuovo preventivo basato sul vecchio</p>'
      +'<table><thead><tr><th>Data</th><th>Cliente</th><th>Prodotti</th><th>Totale</th><th>Status</th><th>Azioni</th></tr></thead>'
      +'<tbody>'+(rows||'<tr><td colspan="6" style="text-align:center;padding:30px;color:#64748b">Nessun preventivo trovato</td></tr>')+'</tbody></table>'
      +'<button onclick="close()" style="margin-top:16px;padding:9px 18px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:8px;cursor:pointer">Chiudi</button>'
      +'</body></html>');
    w.document.close();
  },
  _reuse: function(q){
    if(typeof QuoteGeneratorV2!=='undefined'){
      QuoteGeneratorV2.open({clientName:q.client,lines:q.products||[]});
    }
  },
  _del: function(id){
    if(!confirm('Eliminare questo preventivo?')) return;
    var quotes=[]; try{quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');}catch(e){}
    quotes=quotes.filter(function(q){return String(q.id)!==String(id);}); 
    try{localStorage.setItem('lb2b_quotes_v1',JSON.stringify(quotes));}catch(e){}
    if(typeof toast!=='undefined') toast('🗑 Preventivo eliminato','success');
  },
};
// Add archivio button to CRM rows
(function _injectArchivioBtn(){
  function _p(){
    if(typeof CRMSmart==='undefined'||!CRMSmart._v35noteBtn){setTimeout(_p,500);return;}
    if(CRMSmart._v35archBtn) return; CRMSmart._v35archBtn=true;
    var _orig=CRMSmart.render.bind(CRMSmart);
    CRMSmart.render=function(){
      _orig();
      setTimeout(function(){
        var data=CRMSmart._load();
        data.forEach(function(c,i){
          var row=document.getElementById('crm-row-'+i); if(!row) return;
          if(row.querySelector('.arch-btn')) return;
          var cell=row.querySelector('td:last-child>div'); if(!cell) return;
          var quotes=[]; try{quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');}catch(e){}
          var n=quotes.filter(function(q){return q.client===c.name;}).length;
          if(!n) return;
          var btn=document.createElement('button'); btn.className='arch-btn';
          btn.title='Archivio preventivi ('+n+')';
          btn.style.cssText='padding:4px 8px;background:rgba(16,185,129,.1);color:#10b981;border:1px solid rgba(16,185,129,.25);border-radius:6px;cursor:pointer;font-size:11px';
          btn.innerHTML='📂'+n;
          btn.onclick=(function(name){return function(){PreventivoArchivio.openForClient(name);};})(c.name);
          cell.appendChild(btn);
        });
      },600);
    };
  }
  setTimeout(_p,3500);
})();

// ─── 14. IMPORT MASSIVO EXCEL / CSV ──────────────────────────
window.MagazzinoImporter = {
  open: function(){
    var inp=document.createElement('input'); inp.type='file'; inp.accept='.xlsx,.xls,.csv';
    inp.onchange=function(){ var file=inp.files[0]; if(file) MagazzinoImporter._process(file); };
    inp.click();
  },
  _process: async function(file){
    try{
      var text=await file.text(); var items=[]; var ext=file.name.split('.').pop().toLowerCase();
      if(ext==='csv'||ext==='txt'){
        var lines=text.split('\n').filter(function(l){return l.trim();});
        var header=lines[0].split(/[,;\t]/).map(function(h){return h.trim().toLowerCase().replace(/"/g,'');});
        var idxName=Math.max(header.indexOf('nome'),header.indexOf('name'),header.indexOf('prodotto'),0);
        var idxCat=Math.max(header.indexOf('categoria'),header.indexOf('cat'),-1);
        var idxQty=Math.max(header.indexOf('quantita'),header.indexOf('qty'),header.indexOf('quantity'),-1);
        var idxPrice=Math.max(header.indexOf('prezzo'),header.indexOf('price'),header.indexOf('costo'),-1);
        var idxSup=Math.max(header.indexOf('fornitore'),header.indexOf('supplier'),-1);
        lines.slice(1).forEach(function(l){
          var cols=l.split(/[,;\t]/).map(function(v){return v.trim().replace(/"/g,'');});
          var name=cols[idxName]||''; if(!name) return;
          items.push({
            id:'imp_'+Date.now().toString().slice(-8)+Math.random().toString(36).slice(2,6),
            cat:'portachiavi',tech:'laser',
            name:name,emoji:'🎁',desc:'',
            qty:idxQty>=0?parseFloat(cols[idxQty])||0:0,
            minQty:10,unit:'pz',
            fornitori:[{s:'custom',p:idxPrice>=0?parseFloat(cols[idxPrice])||0:0,url:idxSup>=0?cols[idxSup]||'':'',min:1}]
          });
        });
      }
      if(!items.length){if(typeof toast!=='undefined')toast('Nessun prodotto trovato nel file','error');return;}
      var existing=[]; try{existing=JSON.parse(localStorage.getItem('ingly_magazzino_v34')||'[]');}catch(e){}
      var all=existing.concat(items);
      localStorage.setItem('ingly_magazzino_v34',JSON.stringify(all));
      if(typeof toast!=='undefined') toast('📥 Importati '+items.length+' prodotti da '+file.name,'success');
      if(typeof MagazzinoGadget!=='undefined') MagazzinoGadget.render();
    }catch(e){if(typeof toast!=='undefined')toast('Errore import: '+e.message,'error');}
  },
};

// ─── 15. GESTIONE IVA AUTOMATICA ─────────────────────────────
window.IVAConfig = {
  _SK: 'ingly_iva_cfg',
  load: function(){ try{return JSON.parse(localStorage.getItem(this._SK)||'{}');}catch(e){return{};} },
  save: function(d){ try{localStorage.setItem(this._SK,JSON.stringify(d));}catch(e){} },
  getRate: function(){
    var cfg=this.load();
    if(cfg.regime==='forfettario') return 0;
    return parseFloat(cfg.rate)||22;
  },
  openSettings: function(){
    var cfg=this.load();
    var old=document.getElementById('iva-modal'); if(old) old.remove();
    var modal=document.createElement('div'); modal.id='iva-modal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
    modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:420px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6)">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">'
      +'<span style="font-size:22px">📊</span>'
      +'<div><div style="font-size:16px;font-weight:900;color:var(--text)">Configurazione IVA</div>'
      +'<div style="font-size:11px;color:var(--text-muted)">Impostazione regime fiscale</div></div>'
      +'<button onclick="document.getElementById(\'iva-modal\').remove()" style="margin-left:auto;background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:20px">✕</button>'
      +'</div>'
      +'<div style="display:grid;gap:12px">'
      +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">Regime Fiscale</label>'
      +'<select id="iva-regime" onchange="IVAConfig._onRegimeChange(this.value)" style="width:100%;padding:10px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px">'
      +'<option value="ordinario"'+(cfg.regime==='ordinario'||!cfg.regime?' selected':'')+'>📊 Regime Ordinario</option>'
      +'<option value="forfettario"'+(cfg.regime==='forfettario'?' selected':'')+'>📋 Regime Forfettario (IVA 0%)</option>'
      +'</select></div>'
      +'<div id="iva-rate-row" style="display:'+(cfg.regime==='forfettario'?'none':'block')+'">'
      +'<label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">Aliquota IVA %</label>'
      +'<select id="iva-rate" style="width:100%;padding:10px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px">'
      +['4','5','10','22'].map(function(r){return '<option value="'+r+'"'+(String(cfg.rate||22)===r?' selected':'')+'>IVA '+r+'%</option>';}).join('')
      +'</select></div>'
      +'<div style="padding:12px;background:var(--bg-card2);border-radius:10px;font-size:11px;color:var(--text-muted)">'
      +'💡 Il regime scelto viene applicato automaticamente su tutti i preventivi PDF e le fatture generate.</div>'
      +'</div>'
      +'<div style="display:flex;gap:8px;margin-top:16px">'
      +'<button onclick="IVAConfig._save()" style="flex:1;padding:11px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva</button>'
      +'<button onclick="document.getElementById(\'iva-modal\').remove()" style="padding:11px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;color:var(--text-muted)">Annulla</button>'
      +'</div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
  },
  _onRegimeChange: function(v){
    var row=document.getElementById('iva-rate-row');
    if(row) row.style.display=v==='forfettario'?'none':'block';
  },
  _save: function(){
    var regime=document.getElementById('iva-regime')?.value||'ordinario';
    var rate=parseFloat(document.getElementById('iva-rate')?.value)||22;
    this.save({regime:regime,rate:rate});
    document.getElementById('iva-modal')?.remove();
    var label=regime==='forfettario'?'Regime Forfettario (0% IVA)':'Regime Ordinario IVA '+rate+'%';
    if(typeof toast!=='undefined') toast('📊 Configurazione IVA: '+label,'success');
  },
};

// Patch QuoteGeneratorV2 to use IVA config
(function _patchQGV2IVA(){
  function _p(){
    if(typeof QuoteGeneratorV2==='undefined'){setTimeout(_p,700);return;}
    if(QuoteGeneratorV2._v35iva) return; QuoteGeneratorV2._v35iva=true;
    // The popup already calculates IVA 22% - we patch the genPDF to use IVA config
    var _oOpen=QuoteGeneratorV2.open.bind(QuoteGeneratorV2);
    QuoteGeneratorV2.open=function(opts){
      // Pass IVA rate to popup
      window._inglyIVARate=IVAConfig.getRate();
      window._inglyBrand=BrandConfig.load();
      _oOpen(opts);
    };
  }
  setTimeout(_p,1500);
})();

// ─── DEPTH ANALYSIS — Error fixes ─────────────────────────────
(function _fixDepthErrors(){
  // Fix 1: Ensure DashboardPro has shortcut button
  function _addDashboardShortcuts(){
    if(typeof DashboardPro==='undefined') return;
    var _orig=DashboardPro.render.bind(DashboardPro);
    DashboardPro.render=function(){
      _orig();
      setTimeout(function(){
        var dash=document.getElementById('view-dashboard')||document.getElementById('view-kpi');
        if(!dash||dash.querySelector('.v35-shortcuts')) return;
        var row=dash.querySelector('.section-view > div > div:last-child');
        if(!row) return;
        var extra=document.createElement('div'); extra.className='v35-shortcuts';
        extra.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;padding:12px;background:var(--bg-card2);border-radius:12px;border:1px solid var(--border)';
        extra.innerHTML='<div style="font-size:11px;font-weight:800;color:var(--text-muted);width:100%;margin-bottom:4px;text-transform:uppercase">🔧 Strumenti</div>'
          +'<button onclick="IVAConfig.openSettings()" style="padding:7px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)">📊 Config IVA</button>'
          +'<button onclick="BrandConfig.openSettings()" style="padding:7px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)">🎨 Brand</button>'
          +'<button onclick="ClientListino.openManager()" style="padding:7px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)">💰 Listino</button>'
          +'<button onclick="SalesStats.render()" style="padding:7px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)">📊 Stats</button>'
          +'<button onclick="MagazzinoSync.showSupplierHistory()" style="padding:7px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)">🏪 Fornitori</button>'
          +'<button onclick="PreventivoArchivio.openForClient()" style="padding:7px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)">📂 Preventivi</button>'
          +'<button onclick="WABusiness.openTemplateEditor()" style="padding:7px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)">💬 Template WA</button>'
          +'<button onclick="CalendarExport&&CalendarExport.exportAll()" style="padding:7px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)">📅 Calendario</button>'
          +'<button onclick="MagazzinoImporter.open()" style="padding:7px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)">📥 Import Excel</button>';
        row.appendChild(extra);
      },400);
    };
  }
  setTimeout(_addDashboardShortcuts,2000);
})();

console.log('[v35-P2] Listino · Scanner · Brand · NoteInterne · Archivio · ImportExcel · IVA loaded');

