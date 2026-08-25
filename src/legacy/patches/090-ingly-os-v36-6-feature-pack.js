
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v36 — 6 Feature Pack
// 1. PDF fix  2. Auto P.IVA  3. Google Drive  4. Google Contacts
// 5. Dashboard "Oggi"  6. Firma Digitale WA
// ═══════════════════════════════════════════════════════════════════

// ─── 1. PDF MULTI-RIGA FIX ──────────────────────────────────────
// Override genPDF in QuoteGeneratorV2 popup to always show 1 row per line
(function _fixGenPDF(){
  function _p(){
    if(typeof QuoteGeneratorV2==='undefined'){setTimeout(_p,600);return;}
    if(QuoteGeneratorV2._v36pdf) return; QuoteGeneratorV2._v36pdf=true;
    var _origOpen=QuoteGeneratorV2.open.bind(QuoteGeneratorV2);
    QuoteGeneratorV2.open=function(opts){
      _origOpen(opts);
      // After popup opens, patch genPDF inside popup window
      setTimeout(function(){
        var wins=Array.from({length:20}).map(function(_,i){return window['_qgwin_'+i];}).filter(Boolean);
        // Try to find last opened window via the current approach
      },500);
    };
    // Patch the _qgv2PopupInit logic: replace genPDF with fixed version
    var oldInit=window._qgv2PopupInit;
    if(typeof oldInit==='function'){
      var initStr=oldInit.toString();
      // We override by patching the parent function
      window._qgv2PopupInit_v36=function(){
        // Call original
        oldInit.call(this);
        // Now re-override genPDF in the popup context
        window.genPDF=function(){
          var cn=getClientName(); if(!cn||!lines.length){alert('Inserisci cliente e prodotti!');return;}
          var subtotal=lines.reduce(function(a,l){return a+(l.total||0);},0);
          var ivaRate=window._inglyIVARate!=null?window._inglyIVARate:22;
          var iva=subtotal*ivaRate/100;
          var brand=window._inglyBrand||{name:'Ingly Laser',tagline:'Personalizzazione Laser',logoEmoji:'⚡',primaryColor:'#6366f1',vatNum:'',phone:'',email:'',footer:''};
          var qn='PR-'+Date.now().toString().slice(-6);
          var pw=window.open('','_blank','width=850,height=700'); if(!pw) return;
          pw._d={cn:cn,lines:lines,subtotal:subtotal,iva:iva,ivaRate:ivaRate,qn:qn,
            notes:document.getElementById('notes').value,brand:brand};
          var sc=pw.document.createElement('script');
          sc.textContent=[
            'var d=window._d;',
            'var b=d.brand;',
            'var pc=b.primaryColor||"#6366f1";',
            // Each line → 1 row (no deduplication)
            'var rows=d.lines.map(function(l){',
            '  return "<tr><td style=padding:9px 12px>"+l.img+" "+l.desc+"</td>",',
            '    +"<td style=text-align:center;padding:9px 12px>"+l.qty+"</td>",',
            '    +"<td style=text-align:right;padding:9px 12px>€"+(l.unitPrice||0).toFixed(2)+"</td>",',
            '    +"<td style=text-align:right;font-weight:700;padding:9px 12px>€"+(l.total||0).toFixed(2)+"</td>",',
            '    +(l.note?"<td style=font-size:10px;color:#64748b;padding:9px 12px>"+l.note+"</td>":"<td></td>"),',
            '    +"</tr>";',
            '}).join("");',
            'document.getElementById("rows").innerHTML=rows;',
            'document.getElementById("sub").textContent="€"+d.subtotal.toFixed(2);',
            'document.getElementById("iva-lbl").textContent="IVA "+d.ivaRate+"%";',
            'document.getElementById("iva-val").textContent="€"+d.iva.toFixed(2);',
            'document.getElementById("tot").textContent="€"+(d.subtotal+d.iva).toFixed(2);',
            'document.getElementById("qn").textContent=d.qn;',
            'document.getElementById("cn-name").textContent=d.cn;',
            'document.getElementById("dt").textContent=new Date().toLocaleDateString("it");',
            'document.getElementById("pc-hdr").style.borderBottomColor=pc;',
            'document.getElementById("brand-name").textContent=b.logoEmoji+" "+b.name;',
            'document.getElementById("brand-tag").textContent=b.tagline;',
            'if(b.vatNum){document.getElementById("brand-vat").textContent="P.IVA "+b.vatNum;document.getElementById("brand-vat").style.display="";}',
            'if(b.phone){document.getElementById("brand-contact").textContent=(b.phone||"")+(b.email?" · "+b.email:"");document.getElementById("brand-contact").style.display="";}',
            'if(d.notes){document.getElementById("notes-box").textContent=d.notes;document.getElementById("notes-row").style.display="";}',
            'd.lines.forEach(function(l){if(l.tech){var badges=document.querySelectorAll(".tech-badge-"+l.lid);badges.forEach(function(b2){b2.style.display="";});}});',
          ].join('\n');
          pw.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preventivo</title>'
            +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:40px;font-size:13px;color:#1e293b}'
            +'.hdr{display:flex;justify-content:space-between;padding-bottom:20px;margin-bottom:28px}#pc-hdr{border-bottom:3px solid #6366f1}'
            +'.brand-name{font-size:22px;font-weight:900;color:#6366f1}'
            +'table{width:100%;border-collapse:collapse;margin-bottom:20px}'
            +'th{background:#6366f1;color:#fff;padding:9px 12px;text-align:left;font-size:11px}'
            +'td{border-bottom:1px solid #e2e8f0}'
            +'.tb{background:#f1f5ff;padding:16px;border-radius:8px;text-align:right;margin-bottom:16px}'
            +'.tf{display:flex;justify-content:space-between;font-size:16px;font-weight:900;border-top:2px solid #c7d2fe;padding-top:8px;margin-top:8px}'
            +'.row-n{display:flex;justify-content:space-between;padding:3px 0;font-size:12px}'
            +'@media print{.np{display:none}}</style></head><body>'
            +'<div class="hdr" id="pc-hdr"><div>'
            +'<div class="brand-name" id="brand-name"></div>'
            +'<div id="brand-tag" style="font-size:11px;color:#64748b"></div>'
            +'<div id="brand-vat" style="font-size:10px;color:#94a3b8;display:none"></div>'
            +'<div id="brand-contact" style="font-size:10px;color:#94a3b8;display:none"></div>'
            +'</div><div style="text-align:right">'
            +'<div id="qn" style="font-size:16px;font-weight:900"></div>'
            +'<div id="dt" style="font-size:11px;color:#64748b"></div>'
            +'<div style="font-size:9px;color:#94a3b8">Valido 7 giorni</div>'
            +'</div></div>'
            +'<div style="background:#f8fafc;padding:12px 16px;border-radius:8px;margin-bottom:20px">'
            +'<div id="cn-name" style="font-size:14px;font-weight:700"></div></div>'
            +'<table><thead><tr>'
            +'<th style="width:42%">Prodotto / Descrizione</th>'
            +'<th style="text-align:center">Qty</th>'
            +'<th style="text-align:right">Prezzo/pz</th>'
            +'<th style="text-align:right">Totale</th>'
            +'<th>Note</th>'
            +'</tr></thead><tbody id="rows"></tbody></table>'
            +'<div class="tb">'
            +'<div class="row-n"><span>Imponibile</span><span id="sub"></span></div>'
            +'<div class="row-n"><span id="iva-lbl">IVA 22%</span><span id="iva-val"></span></div>'
            +'<div class="tf"><span>TOTALE IVA INCLUSA</span><span id="tot" style="color:#6366f1"></span></div>'
            +'</div>'
            +'<div id="notes-row" style="display:none;padding:12px 16px;background:#f8fafc;border-radius:8px;font-size:12px;color:#64748b;margin-bottom:16px">'
            +'<strong>Note:</strong> <span id="notes-box"></span></div>'
            +'<div class="np" style="text-align:center;margin-top:24px">'
            +'<button onclick="print()" style="padding:11px 24px;background:#6366f1;color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:14px;font-weight:700">🖨️ Stampa / PDF</button> '
            +'<button onclick="close()" style="padding:11px 18px;background:#f1f5f9;border:none;border-radius:9px;cursor:pointer">Chiudi</button>'
            +'</div></body></html>');
          pw.document.close();
          pw.document.head.appendChild(sc);
        };
      };
      // Replace the init function
      window._qgv2PopupInit=window._qgv2PopupInit_v36;
    }
    console.log('[PDF v36] Multi-line PDF fix applied');
  }
  setTimeout(_p,800);
})();

// ─── 2. AUTO-FILL P.IVA IN FATTURAI PA ──────────────────────────
(function _fixFatturaPAVat(){
  function _p(){
    if(typeof XMLSDIModule==='undefined'){setTimeout(_p,700);return;}
    if(XMLSDIModule._v36vat) return; XMLSDIModule._v36vat=true;
    var _origRender=XMLSDIModule.render.bind(XMLSDIModule);
    XMLSDIModule.render=function(){
      _origRender();
      // Auto-fill P.IVA from BrandConfig
      setTimeout(function(){
        var brand=typeof BrandConfig!=='undefined'?BrandConfig.load():{};
        if(!brand.vatNum) return;
        // Common field IDs in the SDI form
        var vatFields=['sdi-vat','piva-cedente','partita-iva','vat-number','f-vat','cedente-vat'];
        vatFields.forEach(function(id){
          var el=document.getElementById(id);
          if(el&&!el.value) el.value=brand.vatNum;
        });
        // Also fill name/business fields
        var nameFields=['sdi-name','denominazione','nome-ditta','f-name','cedente-nome'];
        nameFields.forEach(function(id){
          var el=document.getElementById(id);
          if(el&&!el.value&&brand.name) el.value=brand.name;
        });
        if(typeof toast!=='undefined' && brand.vatNum) toast('🏢 Dati azienda auto-compilati da Brand Config','info');
      },300);
    };
    // Also patch the generateXML function to include P.IVA
    var _origGen=XMLSDIModule.generateXML?.bind(XMLSDIModule)||XMLSDIModule._generateXML?.bind(XMLSDIModule);
    if(_origGen){
      var _key=XMLSDIModule.generateXML?'generateXML':'_generateXML';
      XMLSDIModule[_key]=function(){
        var brand=typeof BrandConfig!=='undefined'?BrandConfig.load():{};
        // Inject brand data before generation
        if(brand.vatNum&&!document.getElementById('sdi-vat')?.value){
          var vatEl=document.getElementById('sdi-vat')||document.getElementById('partita-iva');
          if(vatEl) vatEl.value=brand.vatNum;
        }
        return _origGen.apply(this,arguments);
      };
    }
    console.log('[FatturaPA v36] Auto-fill P.IVA applied');
  }
  setTimeout(_p,1500);
})();

// ─── 3. GOOGLE DRIVE SYNC ───────────────────────────────────────
window.GoogleDriveSync = (function(){
  var SK_CFG='ingly_gdrive_cfg';
  var FILE_NAME='ingly_backup.json';
  var SCOPES='https://www.googleapis.com/auth/drive.file';
  var DISCOVERY_URL='https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

  function loadCfg(){try{return JSON.parse(localStorage.getItem(SK_CFG)||'{}');}catch(e){return{};}}
  function saveCfg(d){try{localStorage.setItem(SK_CFG,JSON.stringify(d));}catch(e){}}

  var _token=null; var _tokenExpiry=0;

  function _isAuthenticated(){
    return _token&&Date.now()<_tokenExpiry;
  }

  function _authenticate(clientId){
    return new Promise(function(resolve,reject){
      if(_isAuthenticated()){resolve(_token);return;}
      var redirect=window.location.href.split('?')[0];
      var authUrl='https://accounts.google.com/o/oauth2/auth'
        +'?client_id='+encodeURIComponent(clientId)
        +'&redirect_uri='+encodeURIComponent(redirect)
        +'&scope='+encodeURIComponent(SCOPES)
        +'&response_type=token'
        +'&prompt=select_account';
      var w=window.open(authUrl,'_blank','width=600,height=600,menubar=no,toolbar=no');
      if(!w){reject(new Error('Popup bloccato — abilita i popup'));return;}
      var check=setInterval(function(){
        try{
          if(!w||w.closed){clearInterval(check);reject(new Error('Finestra chiusa'));return;}
          var hash=w.location.hash;
          if(hash&&hash.includes('access_token')){
            var params=new URLSearchParams(hash.slice(1));
            _token=params.get('access_token');
            _tokenExpiry=Date.now()+(parseInt(params.get('expires_in')||3600)-60)*1000;
            clearInterval(check);
            w.close();
            resolve(_token);
          }
        }catch(e){ /* cross-origin, keep waiting */ }
      },500);
      setTimeout(function(){clearInterval(check);reject(new Error('Timeout autenticazione (2 min)'));},120000);
    });
  }

  async function _findFile(token, fileName){
    var r=await fetch('https://www.googleapis.com/drive/v3/files?q=name%3D"'+encodeURIComponent(fileName)+'"&fields=files(id,name,modifiedTime)',{headers:{Authorization:'Bearer '+token}});
    if(!r.ok) throw new Error('Drive API: '+r.status+' '+r.statusText);
    var d=await r.json();
    return d.files&&d.files.length?d.files[0]:null;
  }

  async function _uploadFile(token, content, fileId){
    var meta={name:FILE_NAME,mimeType:'application/json'};
    var boundary='ingly_boundary_'+Date.now();
    var body='--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+content+'\r\n--'+boundary+'--';
    var url=fileId
      ?'https://www.googleapis.com/upload/drive/v3/files/'+fileId+'?uploadType=multipart'
      :'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    var method=fileId?'PATCH':'POST';
    var r=await fetch(url,{method:method,headers:{'Authorization':'Bearer '+token,'Content-Type':'multipart/related; boundary='+boundary},body:body});
    if(!r.ok) throw new Error('Upload fallito: '+r.status+' '+r.statusText);
    return await r.json();
  }

  async function _downloadFile(token, fileId){
    var r=await fetch('https://www.googleapis.com/drive/v3/files/'+fileId+'?alt=media',{headers:{Authorization:'Bearer '+token}});
    if(!r.ok) throw new Error('Download fallito: '+r.status+' '+r.statusText);
    return await r.text();
  }

  function _collectAllData(){
    var keys=['ingly_crm_v1','lb2b_quotes_v1','ingly_orders_pro_v1','ingly_magazzino_v34','ingly_pipeline_v1','ingly_comm_v1','lb2b_catalog_v33','lb2b_machines_v32','ingly_iva_cfg','ingly_brand_v1','ingly_listino_v1','ingly_note_interne_v1','ingly_wa_templates_v1','ingly_cloud_sync_v1'];
    var data={_version:'v36',_exported:new Date().toISOString(),stores:{}};
    keys.forEach(function(k){try{var v=localStorage.getItem(k);if(v) data.stores[k]=JSON.parse(v);}catch(e){}}); 
    return JSON.stringify(data,null,2);
  }

  function _restoreAllData(json){
    var data=JSON.parse(json);
    var count=0;
    if(data.stores){
      Object.entries(data.stores).forEach(function(kv){
        try{localStorage.setItem(kv[0],JSON.stringify(kv[1]));count++;}catch(e){}
      });
    }
    return count;
  }

  return {
    render: function(){
      var el=document.getElementById('view-cloud_updater');
      if(!el) return;
      var cfg=loadCfg();
      var isAuth=_isAuthenticated();
      el.innerHTML='<div style="padding:16px 20px;max-width:900px;margin:0 auto">'
        // Header
        +'<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">'
        +'<span style="font-size:28px">☁️</span>'
        +'<div style="flex:1">'
        +'<div style="font-size:20px;font-weight:900;color:var(--text)">Google Drive Sync</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">Backup sicuro su Google Drive · Zero server · I tuoi dati restano tuoi</div>'
        +'</div>'
        +'<div style="padding:7px 14px;background:'+(isAuth?'rgba(34,197,94,.1)':'rgba(245,158,11,.1)')+';border:1px solid '+(isAuth?'rgba(34,197,94,.3)':'rgba(245,158,11,.3)')+';border-radius:20px;font-size:11px;font-weight:700;color:'+(isAuth?'#22c55e':'#f59e0b')+'">'
        +(isAuth?'🟢 Autenticato':'🟡 Non autenticato')
        +'</div></div>'

        // Two big action buttons
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">'
        +'<button onclick="GoogleDriveSync.push()" style="padding:18px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:14px;cursor:pointer;font-size:15px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:10px;transition:.15s" onmouseover="this.style.transform=\'scale(1.02)\'" onmouseout="this.style.transform=\'\'">'
        +'<span style="font-size:24px">☁️</span><div style="text-align:left"><div>Carica su Google Drive</div><div style="font-size:10px;font-weight:400;opacity:.9">Salva tutti i dati come backup</div></div></button>'
        +'<button onclick="GoogleDriveSync.pull()" style="padding:18px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;border-radius:14px;cursor:pointer;font-size:15px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:10px;transition:.15s" onmouseover="this.style.transform=\'scale(1.02)\'" onmouseout="this.style.transform=\'\'">'
        +'<span style="font-size:24px">📥</span><div style="text-align:left"><div>Scarica da Google Drive</div><div style="font-size:10px;font-weight:400;opacity:.9">Ripristina dati da backup</div></div></button>'
        +'</div>'

        // Config
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:16px">'
        +'<div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:12px">⚙️ Configurazione OAuth</div>'
        +'<div style="margin-bottom:10px"><label style="font-size:10px;color:var(--text-muted);font-weight:700;display:block;margin-bottom:3px">Google Client ID</label>'
        +'<input id="gd-clientid" value="'+(cfg.clientId||'')+'" placeholder="1234567890-abc...apps.googleusercontent.com" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:11px"></div>'
        +'<button onclick="GoogleDriveSync.saveConfig()" style="width:100%;padding:9px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700;color:var(--text);margin-bottom:8px">💾 Salva Client ID</button>'
        +'<button onclick="GoogleDriveSync.authenticate()" style="width:100%;padding:9px;background:rgba(59,130,246,.15);color:#3b82f6;border:1px solid rgba(59,130,246,.3);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">🔐 Autenticati con Google</button>'
        +'</div>'
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:16px">'
        +'<div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:12px">📋 Come configurare</div>'
        +'<div style="font-size:11px;color:var(--text-muted);line-height:1.8">'
        +'<div>1. Vai su <a href="https://console.cloud.google.com" target="_blank" style="color:var(--primary)">console.cloud.google.com</a></div>'
        +'<div>2. Crea progetto → API & Services → Credentials</div>'
        +'<div>3. Create OAuth Client ID → <strong>Web Application</strong></div>'
        +'<div>4. In "Authorized JavaScript origins" aggiungi il tuo dominio</div>'
        +'<div>5. Copia il Client ID e incollalo qui sopra</div>'
        +'<div>6. Abilita Google Drive API nelle API & Services</div>'
        +'</div></div></div>'
        +'<div id="gdrive-status" style="margin-top:12px;font-size:12px"></div>'
        +'</div>';
    },

    saveConfig: function(){
      var id=document.getElementById('gd-clientid')?.value?.trim();
      if(!id){if(typeof toast!=='undefined') toast('Inserisci il Client ID!','error');return;}
      saveCfg({clientId:id});
      if(typeof toast!=='undefined') toast('✅ Client ID salvato','success');
    },

    authenticate: async function(){
      var cfg=loadCfg();
      if(!cfg.clientId){
        if(typeof toast!=='undefined') toast('Prima inserisci il Google Client ID','error');
        return;
      }
      try{
        var status=document.getElementById('gdrive-status');
        if(status) status.innerHTML='<span style="color:#f59e0b">🔄 Apertura finestra Google...</span>';
        await _authenticate(cfg.clientId);
        if(typeof toast!=='undefined') toast('✅ Autenticato con Google Drive!','success');
        this.render();
      }catch(e){
        if(typeof toast!=='undefined') toast('❌ Auth fallita: '+e.message,'error');
        console.error('[GDrive Auth]',e);
      }
    },

    push: async function(){
      var cfg=loadCfg();
      if(!cfg.clientId){
        // Fallback: export JSON locally
        this._exportLocal();
        return;
      }
      try{
        if(!_isAuthenticated()) await _authenticate(cfg.clientId);
        var status=document.getElementById('gdrive-status');
        if(status) status.innerHTML='<span style="color:#f59e0b">🔄 Upload in corso...</span>';
        var content=_collectAllData();
        var existing=await _findFile(_token,FILE_NAME);
        var result=await _uploadFile(_token,content,existing?.id);
        var info='File ID: '+result.id;
        saveCfg(Object.assign(loadCfg(),{lastSync:new Date().toISOString(),fileId:result.id}));
        if(status) status.innerHTML='<span style="color:#22c55e">✅ Caricato su Google Drive · '+new Date().toLocaleTimeString('it')+'</span>';
        if(typeof toast!=='undefined') toast('☁️ Backup su Google Drive completato!','success');
        this.render();
      }catch(e){
        if(typeof toast!=='undefined') toast('❌ Upload fallito: '+e.message,'error');
        // Fallback to local export
        this._exportLocal();
      }
    },

    pull: async function(){
      var cfg=loadCfg();
      if(!cfg.clientId){this._importLocal();return;}
      try{
        if(!_isAuthenticated()) await _authenticate(cfg.clientId);
        var status=document.getElementById('gdrive-status');
        if(status) status.innerHTML='<span style="color:#f59e0b">🔄 Download in corso...</span>';
        var file=await _findFile(_token,FILE_NAME);
        if(!file){if(typeof toast!=='undefined') toast('Nessun backup trovato su Drive. Esegui prima un upload.','error');return;}
        var content=await _downloadFile(_token,file.id);
        var count=_restoreAllData(content);
        if(status) status.innerHTML='<span style="color:#22c55e">✅ Ripristinati '+count+' store · '+new Date().toLocaleTimeString('it')+'</span>';
        if(typeof toast!=='undefined') toast('📥 '+count+' store ripristinati da Google Drive!','success');
        this.render();
      }catch(e){
        if(typeof toast!=='undefined') toast('❌ Download fallito: '+e.message,'error');
      }
    },

    _exportLocal: function(){
      var content=_collectAllData();
      var a=document.createElement('a');
      a.href='data:application/json;charset=utf-8,'+encodeURIComponent(content);
      a.download='ingly_backup_'+new Date().toISOString().slice(0,10)+'.json'; a.click();
      if(typeof toast!=='undefined') toast('💾 Backup JSON scaricato localmente (configura Client ID per Drive)','info');
    },

    _importLocal: function(){
      var inp=document.createElement('input'); inp.type='file'; inp.accept='.json';
      inp.onchange=async function(){
        var file=inp.files[0]; if(!file) return;
        try{
          var text=await file.text();
          var count=_restoreAllData(text);
          if(typeof toast!=='undefined') toast('📥 '+count+' store ripristinati da file locale!','success');
        }catch(e){if(typeof toast!=='undefined') toast('Errore importazione: '+e.message,'error');}
      };
      inp.click();
    },
  };
})();

// Replace old InglyCloudSync render with Google Drive
(function _replaceCloudSync(){
  function _p(){
    if(typeof InglyCloudSync==='undefined'){setTimeout(_p,700);return;}
    if(InglyCloudSync._v36gd) return; InglyCloudSync._v36gd=true;
    // Patch renderSection to use GoogleDriveSync.render when navigating to cloud_updater
    var _oRS=App?.renderSection?.bind(App);
    if(_oRS&&typeof App!=='undefined'&&!App._v36cloud){
      App._v36cloud=true;
      var _orig=App.renderSection.bind(App);
      App.renderSection=async function(s){
        if(s==='cloud_updater'||s==='cloud'){
          document.querySelectorAll('.section-view.active').forEach(function(v){v.classList.remove('active');});
          var el=document.getElementById('view-cloud_updater');
          if(el){el.classList.add('active'); GoogleDriveSync.render(); return;}
        }
        return _orig(s);
      };
    }
    // Patch push/pull to delegate to GoogleDriveSync
    InglyCloudSync.push=function(){GoogleDriveSync.push();};
    InglyCloudSync.pull=function(){GoogleDriveSync.pull();};
  }
  setTimeout(_p,1200);
})();

// ─── 4. GOOGLE CONTACTS EXPORT ──────────────────────────────────
window.GoogleContacts = (function(){
  var SK_CFG='ingly_gcontacts_cfg';
  var SCOPES='https://www.googleapis.com/auth/contacts';
  var _token=null; var _tokenExpiry=0;

  function loadCfg(){try{return JSON.parse(localStorage.getItem(SK_CFG)||'{}');}catch(e){return{};}}
  function saveCfg(d){try{localStorage.setItem(SK_CFG,JSON.stringify(d));}catch(e){}}
  function isAuth(){return _token&&Date.now()<_tokenExpiry;}

  function _auth(clientId){
    return new Promise(function(resolve,reject){
      if(isAuth()){resolve(_token);return;}
      // Share token with Drive if same client ID
      if(window._gdrive_token&&Date.now()<window._gdrive_token_expiry){
        _token=window._gdrive_token; _tokenExpiry=window._gdrive_token_expiry;
        resolve(_token); return;
      }
      var redirect=window.location.href.split('?')[0];
      var authUrl='https://accounts.google.com/o/oauth2/auth'
        +'?client_id='+encodeURIComponent(clientId)
        +'&redirect_uri='+encodeURIComponent(redirect)
        +'&scope='+encodeURIComponent(SCOPES+' https://www.googleapis.com/auth/drive.file')
        +'&response_type=token&prompt=select_account';
      var w=window.open(authUrl,'_blank','width=600,height=600,menubar=no,toolbar=no');
      if(!w){reject(new Error('Popup bloccato'));return;}
      var check=setInterval(function(){
        try{
          if(!w||w.closed){clearInterval(check);reject(new Error('Chiuso'));return;}
          var hash=w.location.hash;
          if(hash&&hash.includes('access_token')){
            var params=new URLSearchParams(hash.slice(1));
            _token=params.get('access_token');
            _tokenExpiry=Date.now()+(parseInt(params.get('expires_in')||3600)-60)*1000;
            window._gdrive_token=_token; window._gdrive_token_expiry=_tokenExpiry;
            clearInterval(check); w.close(); resolve(_token);
          }
        }catch(e){}
      },500);
      setTimeout(function(){clearInterval(check);reject(new Error('Timeout'));},120000);
    });
  }

  function _buildContact(c){
    var names=(c.name||'').split(' ');
    var firstName=names[0]||''; var lastName=names.slice(1).join(' ')||'';
    var contact={names:[{givenName:firstName,familyName:lastName}]};
    if(c.phone) contact.phoneNumbers=[{value:c.phone,type:'mobile'}];
    if(c.email) contact.emailAddresses=[{value:c.email,type:'work'}];
    if(c.company) contact.organizations=[{name:c.company,type:'work'}];
    var noteText=(c.notes||'')+(c.tags?' [Tags: '+c.tags+']':'');
    if(noteText.trim()) contact.biographies=[{value:noteText.trim(),contentType:'TEXT_PLAIN'}];
    return contact;
  }

  async function _batchCreate(token, contacts){
    // Max 200 per batch
    var results=[]; var batches=[];
    for(var i=0;i<contacts.length;i+=10) batches.push(contacts.slice(i,i+10));
    for(var b=0;b<batches.length;b++){
      var batch=batches[b];
      var r=await fetch('https://people.googleapis.com/v1/people:batchCreateContacts',{
        method:'POST',
        headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({contacts:batch.map(function(c){return{contactPerson:_buildContact(c)};}),readMask:'names,phoneNumbers,emailAddresses'})
      });
      if(!r.ok){var err=await r.text();console.warn('[Contacts] Batch error:',err);}
      else{var d=await r.json();results.push.apply(results,d.createdPeople||[]);}
      // Small delay between batches
      if(b<batches.length-1) await new Promise(function(r){setTimeout(r,300);});
    }
    return results;
  }

  return {
    openPanel: function(){
      var cfg=loadCfg(); var driveCfg={}; try{driveCfg=JSON.parse(localStorage.getItem('ingly_gdrive_cfg')||'{}');}catch(e){}
      var sharedClientId=cfg.clientId||driveCfg.clientId||'';
      var clients=[]; try{clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');}catch(e){}

      var old=document.getElementById('gcontacts-modal'); if(old) old.remove();
      var modal=document.createElement('div'); modal.id='gcontacts-modal';
      modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
      modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:520px;max-width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.6)">'
        +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">'
        +'<span style="font-size:24px">👥</span>'
        +'<div><div style="font-size:16px;font-weight:900;color:var(--text)">Esporta su Google Contacts</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">'+clients.length+' clienti nel CRM</div></div>'
        +'<button onclick="document.getElementById(\'gcontacts-modal\').remove()" style="margin-left:auto;background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:20px">✕</button>'
        +'</div>'
        // Status
        +'<div style="padding:10px 14px;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.15);border-radius:10px;margin-bottom:16px;font-size:11px;color:var(--text-muted)">'
        +'<strong>Come funziona:</strong> I contatti vengono creati nella tua rubrica Google. Se già esistono, vengono aggiunti senza duplicare (puoi usare Google Merge Duplicates dopo). Usa lo stesso Client ID di Google Drive.'
        +'</div>'
        // Client ID
        +'<div style="margin-bottom:14px"><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">Google Client ID</label>'
        +'<input id="gc-clientid" value="'+sharedClientId+'" placeholder="Come Google Drive..." style="width:100%;padding:10px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px"></div>'
        // Filter
        +'<div style="margin-bottom:14px"><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">Filtro esportazione</label>'
        +'<select id="gc-filter" style="width:100%;padding:10px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px">'
        +'<option value="all">Tutti i '+clients.length+' clienti</option>'
        +'<option value="phone">Solo con telefono ('+clients.filter(function(c){return c.phone;}).length+')</option>'
        +'<option value="email">Solo con email ('+clients.filter(function(c){return c.email;}).length+')</option>'
        +'<option value="recent">Aggiunti negli ultimi 30 giorni ('+clients.filter(function(c){return c.added&&Date.now()-new Date(c.added).getTime()<30*864e5;}).length+')</option>'
        +'</select></div>'
        // Label / Group
        +'<div style="margin-bottom:16px"><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">Etichetta gruppo (opzionale)</label>'
        +'<input id="gc-label" value="Ingly Clienti" placeholder="Es. Ingly Clienti 2025" style="width:100%;padding:10px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'<div id="gc-status" style="margin-bottom:10px;font-size:11px;min-height:20px"></div>'
        +'<div style="display:flex;gap:8px">'
        +'<button onclick="GoogleContacts.exportSelected()" style="flex:1;padding:11px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">📤 Esporta su Google Contacts</button>'
        +'<button onclick="GoogleContacts._exportVCF()" style="padding:11px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:12px;font-weight:700;color:var(--text-muted)">📱 VCF locale</button>'
        +'<button onclick="document.getElementById(\'gcontacts-modal\').remove()" style="padding:11px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;color:var(--text-muted)">✕</button>'
        +'</div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
    },

    exportSelected: async function(){
      var clientId=document.getElementById('gc-clientid')?.value?.trim();
      if(!clientId){if(typeof toast!=='undefined') toast('Inserisci il Client ID','error');return;}
      // Save client ID
      saveCfg({clientId:clientId});
      var cfg2={}; try{cfg2=JSON.parse(localStorage.getItem('ingly_gdrive_cfg')||'{}');}catch(e){}
      if(!cfg2.clientId) try{localStorage.setItem('ingly_gdrive_cfg',JSON.stringify(Object.assign(cfg2,{clientId:clientId})));}catch(e){}

      var status=document.getElementById('gc-status');
      var filter=document.getElementById('gc-filter')?.value||'all';
      var allClients=[]; try{allClients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');}catch(e){}
      var clients=allClients;
      if(filter==='phone') clients=clients.filter(function(c){return c.phone;});
      else if(filter==='email') clients=clients.filter(function(c){return c.email;});
      else if(filter==='recent') clients=clients.filter(function(c){return c.added&&Date.now()-new Date(c.added).getTime()<30*864e5;});

      if(!clients.length){if(typeof toast!=='undefined') toast('Nessun contatto da esportare','error');return;}
      if(status) status.innerHTML='<span style="color:#f59e0b">🔄 Autenticazione Google...</span>';

      try{
        await _auth(clientId);
        if(status) status.innerHTML='<span style="color:#f59e0b">🔄 Esportazione '+clients.length+' contatti...</span>';
        var results=await _batchCreate(_token,clients);
        var created=results.length;
        if(status) status.innerHTML='<span style="color:#22c55e">✅ Creati '+created+'/'+clients.length+' contatti su Google Contacts!</span>';
        if(typeof toast!=='undefined') toast('✅ '+created+' contatti esportati su Google Contacts!','success');
      }catch(e){
        if(status) status.innerHTML='<span style="color:#ef4444">❌ '+e.message+'</span>';
        if(typeof toast!=='undefined') toast('Errore: '+e.message+' — uso VCF locale','error');
        this._exportVCF();
      }
    },

    _exportVCF: function(){
      var filter=document.getElementById('gc-filter')?.value||'all';
      var allClients=[]; try{allClients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');}catch(e){}
      var clients=filter==='phone'?allClients.filter(function(c){return c.phone;}):allClients;
      var vcf=clients.map(function(c){
        var lines=['BEGIN:VCARD','VERSION:3.0','FN:'+c.name];
        var parts=(c.name||'').split(' ');
        lines.push('N:'+(parts.length>1?parts[parts.length-1]:'')+';'+parts.slice(0,-1).join(' ')+';;;');
        if(c.phone) lines.push('TEL;TYPE=CELL:'+c.phone);
        if(c.email) lines.push('EMAIL:'+c.email);
        if(c.company) lines.push('ORG:'+c.company);
        if(c.notes||c.tags) lines.push('NOTE:'+( c.tags?'['+c.tags+'] ':'')+( c.notes||''));
        lines.push('END:VCARD');
        return lines.join('\r\n');
      }).join('\r\n\r\n');
      var a=document.createElement('a'); a.href='data:text/vcard;charset=utf-8,'+encodeURIComponent(vcf);
      a.download='ingly_contatti_'+new Date().toISOString().slice(0,10)+'.vcf'; a.click();
      if(typeof toast!=='undefined') toast('📱 VCF scaricato ('+clients.length+' contatti)','success');
    },
  };
})();

// Add Google Contacts button to CRM
(function _addGContactsBtn(){
  function _p(){
    if(typeof CRMSmart==='undefined'||!CRMSmart._v26){setTimeout(_p,600);return;}
    if(CRMSmart._v36gcontacts) return; CRMSmart._v36gcontacts=true;
    var _origBuild=CRMSmart._buildHTML?.bind(CRMSmart);
    if(_origBuild){
      CRMSmart._buildHTML=function(data){
        var h=_origBuild(data);
        // Inject Google Contacts button near the import button
        return h.replace(
          /(<button[^>]*onclick="CRMSmart\._importFile[^"]*"[^>]*>)/,
          '<button onclick="GoogleContacts.openPanel()" style="padding:8px 14px;background:rgba(16,185,129,.1);color:#10b981;border:1.5px solid rgba(16,185,129,.3);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">📤 Google Contacts</button>$1'
        );
      };
    }
  }
  setTimeout(_p,2000);
})();

// ─── 5. DASHBOARD "COSA FARE OGGI" ──────────────────────────────
window.TodayWidget = {
  render: function(){
    var el=document.getElementById('today-widget');
    if(!el) return;
    var orders=[]; try{orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');}catch(e){}
    var quotes=[]; try{quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');}catch(e){}
    var items=[]; try{items=JSON.parse(localStorage.getItem('ingly_magazzino_v34')||'[]');}catch(e){}
    var now=Date.now();

    var tasks=[];
    // Orders due/delayed
    orders.forEach(function(o){
      if(['draft','confirmed','in_progress'].indexOf(o.status)<0) return;
      var age=(now-new Date(o.created||o.date||0).getTime())/864e5;
      var thresh=o.status==='in_progress'?7:14;
      if(age>thresh) tasks.push({type:'order',icon:'🔴',text:'Ordine in ritardo ('+Math.round(age)+'gg): '+o.client,link:"App.navigate('order_tracker')",urgent:true});
      else if(age>thresh*0.7) tasks.push({type:'order',icon:'🟡',text:'Ordine da completare: '+o.client,link:"App.navigate('order_tracker')",urgent:false});
    });
    // Expiring quotes
    quotes.filter(function(q){return q.status==='draft';}).forEach(function(q){
      var age=(now-new Date(q.date||0).getTime())/864e5;
      if(age>25) tasks.push({type:'quote',icon:'⏰',text:'Preventivo in scadenza: '+q.client+' €'+(q.total||0).toFixed(0),link:"PreventivoArchivio.openForClient()",urgent:age>28});
    });
    // Reorder needed
    items.filter(function(it){return (it.qty||0)<=0&&it.cat!=='consumabili';}).slice(0,3).forEach(function(it){
      tasks.push({type:'stock',icon:'🚨',text:'Esaurito: '+it.name.slice(0,30),link:"App.navigate('magazzino')",urgent:true});
    });
    // Inactive clients (check top 3)
    try{
      var clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');
      var inactive=clients.filter(function(c){
        var lastQ=quotes.filter(function(q){return q.client===c.name;}).sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
        return !lastQ.length||(now-new Date(lastQ[0].date||0).getTime())>30*864e5;
      }).slice(0,2);
      inactive.forEach(function(c){tasks.push({type:'client',icon:'😴',text:'Cliente inattivo >30gg: '+c.name,link:"CRMSmart&&CRMSmart.render()",urgent:false});});
    }catch(e){}

    if(!tasks.length){
      el.innerHTML='<div style="padding:14px 16px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);border-radius:12px;display:flex;align-items:center;gap:10px">'
        +'<span style="font-size:22px">✅</span>'
        +'<div><div style="font-size:13px;font-weight:700;color:#22c55e">Tutto in ordine oggi!</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">Nessuna azione urgente richiesta</div></div>'
        +'</div>';
      return;
    }

    el.innerHTML='<div style="font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">📋 Cosa fare oggi ('+tasks.length+')</div>'
      +tasks.slice(0,6).map(function(t){
        return '<div onclick="try{'+t.link+'}catch(e){}" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg-card);border:1px solid '+(t.urgent?'rgba(239,68,68,.25)':'var(--border)')+';border-radius:9px;cursor:pointer;margin-bottom:5px;transition:.1s" '
          +'onmouseover="this.style.borderColor=\'var(--primary)\'" onmouseout="this.style.borderColor=\''+(t.urgent?'rgba(239,68,68,.25)':'var(--border)')+'\'"><span style="font-size:14px">'+t.icon+'</span>'
          +'<span style="font-size:11px;font-weight:600;color:var(--text);flex:1">'+t.text+'</span>'
          +'<span style="font-size:10px;color:var(--text-dim)">→</span></div>';
      }).join('');
  },
};

// Inject Today widget into Dashboard
(function _injectTodayWidget(){
  function _p(){
    if(typeof DashboardPro==='undefined'){setTimeout(_p,700);return;}
    if(DashboardPro._v36today) return; DashboardPro._v36today=true;
    var _orig=DashboardPro.render.bind(DashboardPro);
    DashboardPro.render=function(){
      _orig();
      setTimeout(function(){
        var dash=document.getElementById('view-dashboard')||document.getElementById('view-kpi');
        if(!dash||document.getElementById('today-widget')) return;
        var quickActions=dash.querySelector('.section-view > div > div:last-child');
        var widgetDiv=document.createElement('div');
        widgetDiv.id='today-widget';
        widgetDiv.style.cssText='background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:12px';
        if(quickActions) quickActions.insertAdjacentElement('beforebegin',widgetDiv);
        else { var di=document.getElementById('view-dashboard')||document.getElementById('view-kpi'); if(di) di.querySelector('div').appendChild(widgetDiv); }
        TodayWidget.render();
        setInterval(function(){TodayWidget.render();},300000); // refresh every 5min
      },500);
    };
    console.log('[TodayWidget v36] injected');
  }
  setTimeout(_p,2200);
})();

// ─── 6. FIRMA DIGITALE VIA WHATSAPP ─────────────────────────────
(function _upgradeFirmaDigitale(){
  function _p(){
    if(typeof DigitalSignature==='undefined'){setTimeout(_p,600);return;}
    if(DigitalSignature._v36wa) return; DigitalSignature._v36wa=true;

    // Enhanced showRequest with WA deep link
    DigitalSignature.showRequest=function(quoteData){
      var req=this.createRequest(quoteData.id||Date.now(),quoteData.client,quoteData.total);
      var code=req.token.slice(0,8).toUpperCase();
      var phone=(quoteData.phone||'').replace(/\D/g,'');
      var waMsg='✍️ *Conferma Preventivo*\n\n'
        +'Caro '+( quoteData.client?.split(' ')[0]||'Cliente')+',\n\n'
        +'Il tuo preventivo è pronto!\n\n'
        +'💶 *Totale: €'+(quoteData.total||0).toFixed(2)+'*\n\n'
        +'Per confermare, rispondi con il codice:\n'
        +'*🔑 '+code+'*\n\n'
        +'_Oppure digita il codice direttamente nell\'app Ingly OS_\n\n'
        +'_Ingly Laser ⚡_';

      var old=document.getElementById('sig-modal'); if(old) old.remove();
      var modal=document.createElement('div'); modal.id='sig-modal';
      modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
      modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:480px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6)">'
        +'<div style="text-align:center;margin-bottom:20px">'
        +'<div style="font-size:38px;margin-bottom:8px">✍️</div>'
        +'<div style="font-size:18px;font-weight:900;color:var(--text)">Firma Digitale Preventivo</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">'+quoteData.client+' — €'+(quoteData.total||0).toFixed(2)+'</div>'
        +'</div>'
        // Code display
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;text-align:center">'
        +'<div style="font-size:10px;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;font-weight:700">Codice Conferma</div>'
        +'<div style="font-size:28px;font-weight:900;color:var(--primary);letter-spacing:6px">'+code+'</div>'
        +'<div style="font-size:10px;color:var(--text-dim);margin-top:6px">Condividi questo codice col cliente · Scade in 7 giorni</div>'
        +'</div>'
        // WA button
        +'<div style="display:grid;gap:8px">'
        +(phone?'<button onclick="window.open(\'https://wa.me/'+phone+'?text=\'+encodeURIComponent(\''+waMsg.replace(/'/g,"\\'").replace(/\n/g,'\\n')+'\')" style="padding:12px;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px"><span style=\'font-size:18px\'>💬</span> Invia codice via WhatsApp</button>':'')
        +'<button onclick="navigator.clipboard?.writeText(\''+code+'\')" style="padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:12px;color:var(--text)">📋 Copia codice '+code+'</button>'
        +'<div style="border-top:1px solid var(--border);padding-top:10px">'
        +'<div style="font-size:10px;color:var(--text-muted);margin-bottom:6px">Il cliente ti ha inviato il codice? Inseriscilo qui:</div>'
        +'<div style="display:flex;gap:6px">'
        +'<input id="sig-inp" placeholder="Codice..." style="flex:1;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:14px;letter-spacing:3px;text-transform:uppercase">'
        +'<button onclick="DigitalSignature.confirm(document.getElementById(\'sig-inp\').value)" style="padding:9px 16px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">✅ Conferma</button>'
        +'</div></div>'
        +'<button onclick="document.getElementById(\'sig-modal\').remove()" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted);width:100%">Chiudi</button>'
        +'</div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
    };

    // Add firma button to QuoteGeneratorV2 footer
    console.log('[DigitalSignature v36] WA enhanced');
  }
  setTimeout(_p,1500);
})();

// Patch renderSection for cloud_updater
setTimeout(function(){
  if(typeof App!=='undefined'&&App.renderSection&&!App._v36cloudRouted){
    App._v36cloudRouted=true;
    var _oRS=App.renderSection.bind(App);
    App.renderSection=async function(s){
      if(s==='cloud_updater'||s==='cloud'){
        document.querySelectorAll('.section-view.active').forEach(function(v){v.classList.remove('active');});
        var el=document.getElementById('view-cloud_updater');
        if(el){el.classList.add('active');GoogleDriveSync.render();return;}
      }
      return _oRS(s);
    };
  }
},1300);

console.log('[INGLY v36] PDF fix · P.IVA · Google Drive · Google Contacts · Today Widget · Firma WA loaded');

