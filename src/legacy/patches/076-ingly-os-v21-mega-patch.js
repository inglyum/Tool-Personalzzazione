
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v21 — Mega Patch
// Fixes: PriceAlertMon, WAQuick, CRM smart import, SDI XML,
//        LaserB2B CRUD, Sistema route, Stock Manager nav
// ═══════════════════════════════════════════════════════════════════

// ─── 1. PriceAlertMon ─────────────────────────────────────────────
window.PriceAlertMon = {
  _SK: 'ingly_price_alerts_v1',
  _alerts: [],
  _load(){ try{ return JSON.parse(localStorage.getItem(this._SK)||'[]'); }catch(e){ return []; } },
  _save(d){ try{ localStorage.setItem(this._SK,JSON.stringify(d)); }catch(e){} },
  openPanel(){
    var self=this; var data=this._load();
    var w=window.open('','_blank','width=780,height=560,resizable=yes');
    if(!w){ if(typeof toast!=='undefined') toast('Abilita popup per Price Alert','info'); return; }
    var rows=data.length?data.map(function(a,i){
      var col=a.current<=a.target?'#22c55e':'#ef4444';
      return '<tr style="border-bottom:1px solid #334155">'
        +'<td style="padding:9px 12px;font-weight:700">'+a.product+'</td>'
        +'<td style="padding:9px 12px;color:#94a3b8">'+a.source+'</td>'
        +'<td style="padding:9px 12px;font-weight:800;color:'+col+'">€'+a.current.toFixed(2)+'</td>'
        +'<td style="padding:9px 12px;color:#94a3b8">€'+a.target.toFixed(2)+'</td>'
        +'<td style="padding:9px 12px;text-align:center"><span style="background:'+col+'20;color:'+col+';padding:2px 8px;border-radius:20px;font-size:10px">'+
          (a.current<=a.target?'✅ TARGET':'🔴 SOPRA')+'</span></td>'
        +'<td style="padding:9px 12px"><button onclick="delAlert('+i+')" style="background:#ef444420;color:#ef4444;border:1px solid #ef444440;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:11px">Rimuovi</button></td>'
        +'</tr>';
    }).join(''):'<tr><td colspan="6" style="text-align:center;padding:30px;color:#64748b">Nessun alert configurato. Aggiungi prodotti da monitorare.</td></tr>';
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Price Alert Monitor</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px}'
      +'h2{font-size:18px;font-weight:900;margin-bottom:16px}table{width:100%;border-collapse:collapse}'
      +'th{background:#1e293b;padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase}'
      +'.form{display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:8px;margin-bottom:16px;background:#1e293b;padding:14px;border-radius:10px}'
      +'input{padding:8px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#f1f5f9;font-size:12px}'
      +'button.add{padding:8px 14px;background:#6366f1;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700}'
      +'</style></head><body>'
      +'<h2>🔔 Price Alert Monitor</h2>'
      +'<div class="form"><input id="p" placeholder="Prodotto/URL"><input id="src" placeholder="Fonte (Etsy/Amazon)"><input id="cur" type="number" step="0.01" placeholder="Prezzo attuale €"><input id="tgt" type="number" step="0.01" placeholder="Target €"><button class="add" onclick="addAlert()">+ Aggiungi</button></div>'
      +'<table><thead><tr><th>Prodotto</th><th>Fonte</th><th>Prezzo</th><th>Target</th><th>Status</th><th></th></tr></thead>'
      +'<tbody id="tbody">'+rows+'</tbody></table>'
      +'<script>var SK="ingly_price_alerts_v1";'
      +'function load(){try{return JSON.parse(localStorage.getItem(SK)||"[]")}catch(e){return[]}}'
      +'function save(d){try{localStorage.setItem(SK,JSON.stringify(d))}catch(e){}}'
      +'function addAlert(){var p=document.getElementById("p").value,src=document.getElementById("src").value,cur=parseFloat(document.getElementById("cur").value),tgt=parseFloat(document.getElementById("tgt").value);if(!p||!cur||!tgt){alert("Compila tutti i campi");return;}var d=load();d.push({product:p,source:src||"—",current:cur,target:tgt,added:new Date().toISOString()});save(d);window.location.reload();}'
      +'function delAlert(i){var d=load();d.splice(i,1);save(d);window.location.reload();}'
      +'<\/script></body></html>');
    w.document.close();
  }
};

// ─── 2. WAQuick ───────────────────────────────────────────────────
window.WAQuick = {
  _templates: [
    {label:'Preventivo pronto',msg:'Ciao! Il tuo preventivo è pronto. Posso inviartelo?'},
    {label:'Conferma ordine',msg:'Ciao! Il tuo ordine è confermato. Tempi: 5-7gg lavorativi.'},
    {label:'Consegna pronta',msg:'Ciao! Il tuo ordine è pronto per la consegna/ritiro.'},
    {label:'Follow-up',msg:'Ciao! Volevo sapere se hai ricevuto tutto e sei soddisfatto.'},
    {label:'Promozione',msg:'Ciao! Abbiamo una promozione speciale su portachiavi personalizzati. Interessato?'},
  ],
  openPanel(phone, preText){
    var self=this;
    var div=document.createElement('div');
    div.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    var tplButtons=self._templates.map(function(t){
      return '<button onclick="document.getElementById(\'waq-msg\').value=\''+t.msg.replace(/'/g,"\\'")+'\"'
        +' style="padding:6px 12px;background:#25D36615;color:#25D366;border:1px solid #25D36630;border-radius:20px;cursor:pointer;font-size:11px;white-space:nowrap">'+t.label+'</button>';
    }).join('');
    div.innerHTML='<div style="background:#1e293b;border-radius:16px;padding:24px;width:460px;border:1px solid #334155">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">'
      +'<span style="font-size:26px">💬</span>'
      +'<div><div style="font-size:16px;font-weight:900;color:#f1f5f9">WhatsApp Quick Send</div>'
      +'<div style="font-size:11px;color:#64748b">Apre WhatsApp Web con messaggio pre-compilato</div></div>'
      +'<button onclick="this.closest(\'[style*=fixed]\').remove()" style="margin-left:auto;background:transparent;border:none;color:#64748b;cursor:pointer;font-size:18px">✕</button>'
      +'</div>'
      +'<div style="margin-bottom:10px"><label style="font-size:10px;color:#94a3b8;display:block;margin-bottom:3px">📱 Numero (con prefisso, es. 393381234567)</label>'
      +'<input id="waq-phone" value="'+(phone||'')+'" placeholder="393381234567" style="width:100%;padding:9px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#f1f5f9;font-size:13px"></div>'
      +'<div style="margin-bottom:10px"><label style="font-size:10px;color:#94a3b8;display:block;margin-bottom:3px">💬 Messaggio</label>'
      +'<textarea id="waq-msg" rows="3" style="width:100%;padding:9px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#f1f5f9;font-size:13px;resize:vertical">'+(preText||self._templates[0].msg)+'</textarea></div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">'+tplButtons+'</div>'
      +'<div style="display:flex;gap:8px">'
      +'<button onclick="WAQuick._send()" style="flex:1;padding:10px;background:#25D366;color:#fff;border:none;border-radius:9px;cursor:pointer;font-weight:800;font-size:14px">📤 Apri WhatsApp</button>'
      +'<button onclick="WAQuick._sendSMS()" style="padding:10px 16px;background:#334155;color:#94a3b8;border:none;border-radius:9px;cursor:pointer;font-size:12px">📱 SMS</button>'
      +'</div></div>';
    document.body.appendChild(div);
    div.addEventListener('click',function(e){if(e.target===div)div.remove();});
  },
  _send(){
    var phone=(document.getElementById('waq-phone')?.value||'').replace(/\D/g,'');
    var msg=document.getElementById('waq-msg')?.value||'';
    if(!phone){alert('Inserisci un numero di telefono');return;}
    window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(msg),'_blank');
  },
  _sendSMS(){
    var phone=(document.getElementById('waq-phone')?.value||'').replace(/\D/g,'');
    var msg=document.getElementById('waq-msg')?.value||'';
    window.open('sms:'+phone+'?body='+encodeURIComponent(msg));
  }
};

// ─── 3. Stock Manager nav fix ──────────────────────────────────────
(function _fixStockNav(){
  function _patch(){
    if(typeof App==='undefined'){ setTimeout(_patch,800); return; }
    // Fix any nav button that points to stockplanner
    document.querySelectorAll('[onclick*="stockplanner"],[onclick*="StockPlanner"],[data-section="stockplanner"]').forEach(function(el){
      el.setAttribute('onclick',"typeof LaserB2B!=='undefined'?LaserB2B.openStockManager():toast('Apri prima Laser B2B','info')");
    });
    // Add to App._sectionMap if it exists
    if(App._sectionMap){ App._sectionMap.stockplanner=()=>{ if(typeof LaserB2B!=='undefined') LaserB2B.openStockManager(); }; }
  }
  setTimeout(_patch,1000);
})();

// ─── 4. Sistema route + Settings alias ────────────────────────────
(function _fixSistemaRoute(){
  function _patch(){
    if(typeof App==='undefined'||!App.renderSection){ setTimeout(_patch,500); return; }
    if(App._sistemaPatch) return;
    App._sistemaPatch=true;
    var _orig=App.navigate.bind(App);
    // Patch navigate for missing routes
    var _aliases={
      sistema:   'settings',
      funzioni:  'settings',
      crm:       'clienti',
      'crm-clienti':'clienti',
    };
    App.navigate=function(section){
      if(_aliases[section]){ return _orig(_aliases[section]); }
      return _orig(section);
    };
  }
  setTimeout(_patch,1200);
})();

// ─── 5. CRM Smart Import & Visual Fix ─────────────────────────────
window.CRMSmart = {
  _SK: 'ingly_crm_v1',
  _clients: [],
  /* I contatti nascono senza `id` e si identificano per **posizione**
     nell'array. Finché la vista disegnava l'elenco intero in ordine di
     inserimento la cosa reggeva; con una paginazione che funziona, un
     ordinamento o un filtro, la posizione punta a un altro contatto e
     «modifica» modifica il cliente sbagliato.

     `_load` assegna un id a chi non ce l'ha e lo salva una volta sola. La
     chiave di memoria non cambia, nessun record si perde, e i contatti già
     salvati continuano a leggersi. */
  /* ── CRM-04 · una lista sola ─────────────────────────────────────────────
     Misurato nel browser: scrivendo un cliente su IndexedDB e un altro su
     `ingly_crm_v1`, questa funzione vedeva solo il secondo e
     `IDB.getAll('clients')` solo il primo. Due liste disgiunte — e siccome
     ordini, preventivi e vendite riferiscono l'archivio IndexedDB, un cliente
     creato qui non compariva mai nel menu di un preventivo. Chi lo cercava
     concludeva che il prodotto avesse perso i dati, mentre erano dall'altra
     parte.

     Adesso legge l'unione da `InglyClienti`. Lo specchio in localStorage resta
     — è quello che questa rubrica ha scritto per anni — ma smette di essere
     una seconda verità: lo mantiene un solo scrittore. */
  _load(){
    var U = window.InglyClienti;
    if(U){
      var e = U.elenco();
      /* Alla prima lettura la cache può non essere pronta: si chiede
         l'unione e si ridisegna quando arriva, invece di restare per sempre
         su metà elenco. */
      if(!U.stato().pronta && !this._unioneChiesta){
        this._unioneChiesta = true;
        U.carica().then(function(){ try{ CRMSmart.render(); }catch(err){} });
      }
      return e;
    }
    try{
      var d = JSON.parse(localStorage.getItem(this._SK)||'[]');
      if(!Array.isArray(d)) return [];
      var mancanti = 0;
      for(var i=0;i<d.length;i++){
        if(d[i] && d[i].id == null){
          d[i].id = 'c' + Date.now().toString(36) + i.toString(36) + Math.floor(Math.random()*1e6).toString(36);
          mancanti++;
        }
      }
      if(mancanti) this._save(d);
      return d;
    }catch(e){ return []; }
  },
  _save(d){
    /* `_save(elenco)` vuol dire «questo è l'elenco adesso»: la rubrica lo usa
       anche per cancellare, passando la lista senza il contatto eliminato.
       Trattarlo come un semplice inserimento toglieva la cancellazione senza
       che niente protestasse — il contatto restava e tornava al
       ricaricamento — ed è quello che il collaudo della rubrica ha
       scoperto. `sostituisci` fa la sostituzione vera, e chi sparisce passa
       dal presidio di integrità invece di essere cancellato al buio. */
    var U = window.InglyClienti;
    if(U && Array.isArray(d)){ U.sostituisci(d); return; }
    try{ localStorage.setItem(this._SK,JSON.stringify(d)); }catch(e){}
  },

  render(){
    var el=document.getElementById('view-clienti')||document.getElementById('view-crm');
    if(!el) return;
    var data=this._load();
    var totalClients=data.length;
    var withPhone=data.filter(function(c){return c.phone;}).length;
    el.innerHTML=this._buildHTML(data,totalClients,withPhone);
  },

  _buildHTML(data,total,withPhone){
    var rows=data.length?data.map(function(c,i){
      return '<tr style="border-bottom:1px solid var(--border)">'
        +'<td style="padding:10px 12px"><div style="font-size:13px;font-weight:700;color:var(--text)">'+c.name+'</div>'
        +(c.company?'<div style="font-size:10px;color:var(--text-muted)">'+c.company+'</div>':'')+'</td>'
        +'<td style="padding:10px 12px"><a href="tel:'+c.phone+'" style="color:var(--primary);text-decoration:none">'+c.phone+'</a></td>'
        +'<td style="padding:10px 12px;color:var(--text-muted);font-size:12px">'+c.email+'</td>'
        +'<td style="padding:10px 12px;font-size:11px;color:var(--text-muted)">'+c.notes+'</td>'
        +'<td style="padding:10px 12px;text-align:center">'
        +'<div style="display:flex;gap:4px;justify-content:center">'
        +'<button onclick="WAQuick&&WAQuick.openPanel(\''+c.phone.replace(/\D/g,'')+'\',\'Ciao '+c.name+'! \')" style="padding:4px 8px;background:#25D36615;color:#25D366;border:1px solid #25D36630;border-radius:6px;cursor:pointer;font-size:11px">💬</button>'
        +'<button onclick="CRMSmart._editClient('+i+')" style="padding:4px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:11px">✏️</button>'
        +'<button onclick="CRMSmart._deleteClient('+i+')" style="padding:4px 8px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:6px;cursor:pointer;font-size:11px">🗑</button>'
        +'</div></td>'
        +'</tr>';
    }).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-dim)">Nessun cliente ancora. Aggiungi manualmente o importa un file.</td></tr>';

    return '<div style="padding:16px 20px;max-width:1100px;margin:0 auto">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
      +'<div style="display:flex;align-items:center;gap:12px">'
      +'<span style="font-size:26px">👥</span>'
      +'<div><div style="font-size:20px;font-weight:900;color:var(--text)">CRM Clienti</div>'
      +'<div style="font-size:11px;color:var(--text-muted)">'+total+' clienti · '+withPhone+' con telefono</div></div>'
      +'</div>'
      +'<div style="display:flex;gap:8px">'
      +'<button onclick="CRMSmart._addClient()" style="padding:8px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">+ Aggiungi</button>'
      +'<button onclick="CRMSmart._importFile()" style="padding:8px 16px;background:var(--bg-card2);color:#10b981;border:1.5px solid rgba(16,185,129,.3);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">📂 Importa CSV/Excel</button>'
      +'<input id="crm-file-inp" type="file" accept=".csv,.xlsx,.xls,.txt" style="display:none" onchange="CRMSmart._processFile(this)">'
      +'</div></div>'
      // KPI bar
      +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">'
      +[{l:'Totale Clienti',v:total,c:'#6366f1'},{l:'Con Telefono',v:withPhone,c:'#10b981'},{l:'Via Importazione',v:data.filter(function(x){return x._imported;}).length,c:'#f59e0b'},{l:'Aggiunti oggi',v:data.filter(function(x){return x.added&&x.added.slice(0,10)===new Date().toISOString().slice(0,10);}).length,c:'#ec4899'}].map(function(k){
        return '<div style="background:var(--bg-card2);border:1px solid '+k.c+'30;border-radius:12px;padding:14px;text-align:center">'
          +'<div style="font-size:10px;color:'+k.c+';font-weight:700;text-transform:uppercase;margin-bottom:4px">'+k.l+'</div>'
          +'<div style="font-size:22px;font-weight:900;color:'+k.c+'">'+k.v+'</div></div>';
      }).join('')
      +'</div>'
      // Search
      +'<div style="margin-bottom:12px"><input oninput="CRMSmart._search(this.value)" placeholder="🔍 Cerca per nome, telefono, azienda..." style="width:100%;padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:13px"></div>'
      // Table
      +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;overflow:hidden">'
      +'<table style="width:100%;border-collapse:collapse">'
      +'<thead><tr style="background:var(--bg-card)">'
      +'<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Nome</th>'
      +'<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Telefono</th>'
      +'<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Email</th>'
      +'<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Note</th>'
      +'<th style="padding:9px 12px;text-align:center;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Azioni</th>'
      +'</tr></thead>'
      +'<tbody id="crm-tbody">'+rows+'</tbody>'
      +'</table></div></div>';
  },

  _search(q){
    q=q.toLowerCase();
    var data=this._load();
    var filtered=data.filter(function(c){
      return (c.name||'').toLowerCase().includes(q)||(c.phone||'').includes(q)||(c.company||'').toLowerCase().includes(q);
    });
    var tbody=document.getElementById('crm-tbody');
    if(!tbody) return;
    if(!q){ tbody.parentElement.parentElement.parentElement.outerHTML=this._buildHTML(data,data.length,data.filter(function(c){return c.phone;}).length); return; }
    // Re-render filtered
    tbody.innerHTML=filtered.map(function(c,i){var _s=typeof sanitize==='function'?sanitize:function(x){return String(x||'');};return '<tr style="border-bottom:1px solid var(--border)"><td style="padding:10px 12px;font-weight:700;color:var(--text)">'+_s(c.name)+'</td><td style="padding:10px 12px;color:var(--primary)">'+_s(c.phone)+'</td><td style="padding:10px 12px;color:var(--text-muted);font-size:12px">'+_s(c.email)+'</td><td style="padding:10px 12px;font-size:11px;color:var(--text-muted)">'+_s(c.notes)+'</td><td></td></tr>';}).join('');
  },

  _addClient(){
    var name=prompt('Nome cliente:');
    if(!name) return;
    var phone=prompt('Telefono (con prefisso):','+39');
    var email=prompt('Email (opzionale):','');
    var company=prompt('Azienda (opzionale):','');
    var data=this._load();
    data.push({name:name.trim(),phone:(phone||'').trim(),email:(email||'').trim(),company:(company||'').trim(),notes:'',added:new Date().toISOString()});
    this._save(data);
    this.render();
    if(typeof toast!=='undefined') toast('✅ Cliente aggiunto!','success');
  },

  _editClient(i){
    var data=this._load(); var c=data[i]; if(!c) return;
    var name=prompt('Nome:',c.name);
    if(!name) return;
    var phone=prompt('Telefono:',c.phone);
    var email=prompt('Email:',c.email);
    var notes=prompt('Note:',c.notes);
    data[i]={...c,name:name.trim(),phone:(phone||'').trim(),email:(email||'').trim(),notes:(notes||'').trim()};
    this._save(data);
    this.render();
  },

  _deleteClient(i){
    if(!confirm('Eliminare questo cliente?')) return;
    var data=this._load(); data.splice(i,1); this._save(data); this.render();
    if(typeof toast!=='undefined') toast('Cliente rimosso','info');
  },

  _importFile(){
    document.getElementById('crm-file-inp')?.click();
  },

  async _processFile(inp){
    var file=inp.files[0]; if(!file) return;
    var ext=file.name.split('.').pop().toLowerCase();
    var self=this;
    if(typeof toast!=='undefined') toast('📂 Analisi file in corso...','info');
    try{
      var text='';
      if(ext==='csv'||ext==='txt'){
        text=await file.text();
        self._parseCSV(text);
      } else if(ext==='xlsx'||ext==='xls'){
        var buf=await file.arrayBuffer();
        self._parseXLSX(buf);
      }
    }catch(e){
      if(typeof toast!=='undefined') toast('Errore importazione: '+e.message,'error');
    }
    inp.value='';
  },

  _parseCSV(text){
    var lines=text.split('\n').filter(function(l){return l.trim();});
    var imported=[];
    // Smart field detection
    var header=lines[0]?lines[0].toLowerCase():'';
    var hasHeader=header.includes('nome')||header.includes('name')||header.includes('telefon')||header.includes('phone')||header.includes('email');
    var startLine=hasHeader?1:0;
    var cols={name:-1,phone:-1,email:-1,company:-1};
    if(hasHeader){
      var hCols=lines[0].split(/[,;\t]/);
      hCols.forEach(function(h,i){
        var hl=h.toLowerCase().trim();
        if((hl.includes('nome')||hl.includes('name'))&&cols.name<0) cols.name=i;
        else if((hl.includes('tel')||hl.includes('phone')||hl.includes('cel'))&&cols.phone<0) cols.phone=i;
        else if(hl.includes('email')&&cols.email<0) cols.email=i;
        else if((hl.includes('aziend')||hl.includes('company'))&&cols.company<0) cols.company=i;
      });
    }
    for(var i=startLine;i<lines.length;i++){
      var parts=lines[i].split(/[,;\t]/);
      if(parts.length<1) continue;
      var entry=this._extractSmartFields(parts,cols);
      if(entry.name||entry.phone) imported.push({...entry,_imported:true,added:new Date().toISOString()});
    }
    this._mergeImported(imported);
  },

  _parseXLSX(buf){
    if(typeof XLSX==='undefined'){ if(typeof toast!=='undefined') toast('Libreria XLSX non disponibile','error'); return; }
    var wb=XLSX.read(buf,{type:'array'});
    var ws=wb.Sheets[wb.SheetNames[0]];
    var json=XLSX.utils.sheet_to_json(ws,{defval:''});
    var imported=[];
    json.forEach(function(row){
      var parts=Object.values(row).map(function(v){return String(v);});
      var cols={name:-1,phone:-1,email:-1,company:-1};
      var keys=Object.keys(row);
      keys.forEach(function(k,i){
        var kl=k.toLowerCase();
        if((kl.includes('nome')||kl.includes('name'))&&cols.name<0) cols.name=i;
        else if((kl.includes('tel')||kl.includes('phone')||kl.includes('cel'))&&cols.phone<0) cols.phone=i;
        else if(kl.includes('email')&&cols.email<0) cols.email=i;
        else if((kl.includes('aziend')||kl.includes('company'))&&cols.company<0) cols.company=i;
      });
      var entry=window.CRMSmart._extractSmartFields(parts,cols);
      if(entry.name||entry.phone) imported.push({...entry,_imported:true,added:new Date().toISOString()});
    });
    this._mergeImported(imported);
  },

  _extractSmartFields(parts,cols){
    var entry={name:'',phone:'',email:'',company:'',notes:''};
    // Use detected columns if available
    if(cols.name>=0 && parts[cols.name]) entry.name=parts[cols.name].replace(/"/g,'').trim();
    if(cols.phone>=0 && parts[cols.phone]) entry.phone=parts[cols.phone].replace(/"/g,'').trim();
    if(cols.email>=0 && parts[cols.email]) entry.email=parts[cols.email].replace(/"/g,'').trim();
    if(cols.company>=0 && parts[cols.company]) entry.company=parts[cols.company].replace(/"/g,'').trim();
    // Smart extraction from all fields using regex
    var fullText=parts.join(' ');
    if(!entry.phone){
      var phoneMatch=fullText.match(/(\+?3[90][\s\-]?[\d\s\-]{8,12}|0\d{2,3}[\s\-]?\d{6,8}|\d{10,13})/);
      if(phoneMatch) entry.phone=phoneMatch[1].replace(/[\s\-]/g,'');
    }
    if(!entry.email){
      var emailMatch=fullText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
      if(emailMatch) entry.email=emailMatch[0];
    }
    if(!entry.name && parts.length>0){
      // Try to find a name-like field (words without numbers)
      var namePart=parts.find(function(p){ return p.replace(/"/g,'').trim().match(/^[A-Za-zÀ-ÿ\s']+$/)&&p.trim().length>2; });
      if(namePart) entry.name=namePart.replace(/"/g,'').trim();
    }
    return entry;
  },

  _mergeImported(imported){
    var existing=this._load();
    var existingPhones=existing.map(function(c){return c.phone.replace(/\D/g,'');});
    var added=0, dupes=0;
    imported.forEach(function(c){
      var norm=c.phone.replace(/\D/g,'');
      if(norm && existingPhones.includes(norm)){ dupes++; return; }
      existing.push(c);
      if(norm) existingPhones.push(norm);
      added++;
    });
    this._save(existing);
    this.render();
    if(typeof toast!=='undefined') toast('📂 Importati: '+added+' nuovi, '+dupes+' duplicati saltati','success');
  },
};

// Patch clienti renderSection route
(function _patchCRMRoute(){
  function _patch(){
    if(typeof App==='undefined') { setTimeout(_patch, 600); return; }
    var _orig=App.renderSection.bind(App);
    if(App._crmPatch) return;
    App._crmPatch=true;
    App.renderSection=async function(s){
      if(s==='clienti'||s==='crm'||s==='clients'){
        document.querySelectorAll('.section-view.active').forEach(function(v){v.classList.remove('active');});
        var el=document.getElementById('view-clienti')||document.getElementById('view-crm')||document.getElementById('view-clients');
        if(el){ el.classList.add('active'); CRMSmart.render(); return; }
      }
      return _orig(s);
    };
  }
  setTimeout(_patch,1400);
})();

// ─── 6. Fattura XML SDI ────────────────────────────────────────────
window.XMLSDIModule = {
  _SK: 'ingly_sdi_v1',
  _load(){ try{ return JSON.parse(localStorage.getItem(this._SK)||'{}'); }catch(e){ return {}; } },
  _save(d){ try{ localStorage.setItem(this._SK,JSON.stringify(d)); }catch(e){} },

  render(){
    var el=document.getElementById('view-xmlsdi'); if(!el) return;
    var cfg=this._load();
    el.innerHTML=this._buildUI(cfg);
  },

  _buildUI(cfg){
    return '<div style="padding:16px 20px;max-width:900px;margin:0 auto">'
      +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">'
      +'<span style="font-size:26px">🧾</span>'
      +'<div><div style="font-size:20px;font-weight:900;color:var(--text)">Fattura XML SDI</div>'
      +'<div style="font-size:11px;color:var(--text-muted)">Generazione FatturaPA conforme Sistema di Interscambio</div></div>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">'
      // CEDENTE
      +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:18px">'
      +'<div style="font-size:12px;font-weight:800;color:#6366f1;margin-bottom:12px">🏭 Cedente/Prestatore (Tu)</div>'
      +'<div style="display:grid;gap:8px">'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px">Denominazione</label>'
      +'<input id="sdi-ced-nome" value="'+(cfg.cedNome||'')+'" placeholder="Es. Mario Rossi" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px"></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px">Partita IVA</label>'
      +'<input id="sdi-ced-piva" value="'+(cfg.cedPiva||'')+'" placeholder="IT12345678901" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px"></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px">Codice Fiscale</label>'
      +'<input id="sdi-ced-cf" value="'+(cfg.cedCF||'')+'" placeholder="RSSMRA80A01F205X" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px"></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px">Regime Fiscale</label>'
      +'<select id="sdi-ced-regime" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">'
      +'<option value="RF19"'+(cfg.cedRegime==='RF19'?' selected':'')+'> RF19 — Forfettario</option>'
      +'<option value="RF01"'+(cfg.cedRegime==='RF01'?' selected':'')+'> RF01 — Ordinario</option>'
      +'<option value="RF17"'+(cfg.cedRegime==='RF17'?' selected':'')+'> RF17 — Minimi/Vantaggio</option>'
      +'</select></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px">Indirizzo</label>'
      +'<input id="sdi-ced-ind" value="'+(cfg.cedInd||'')+'" placeholder="Via Roma, 1 — 90100 Palermo PA" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px"></div>'
      +'</div></div>'
      // CESSIONARIO
      +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:18px">'
      +'<div style="font-size:12px;font-weight:800;color:#10b981;margin-bottom:12px">🏢 Cessionario/Committente (Cliente)</div>'
      +'<div style="display:grid;gap:8px">'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px">Denominazione</label>'
      +'<input id="sdi-cess-nome" value="'+(cfg.cessNome||'')+'" placeholder="Es. Azienda Srl" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px"></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px">P.IVA / CF</label>'
      +'<input id="sdi-cess-piva" value="'+(cfg.cessPiva||'')+'" placeholder="IT98765432109" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px"></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px">Codice SDI / PEC</label>'
      +'<input id="sdi-cess-sdi" value="'+(cfg.cessSdi||'')+'" placeholder="XXXXXXX o PEC@email.it" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px"></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px">Indirizzo</label>'
      +'<input id="sdi-cess-ind" value="'+(cfg.cessInd||'')+'" placeholder="Via Milano, 5 — 20100 Milano MI" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px"></div>'
      +'</div></div>'
      +'</div>'
      // FATTURA DETAILS
      +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:16px">'
      +'<div style="font-size:12px;font-weight:800;color:#f59e0b;margin-bottom:12px">📋 Dati Fattura</div>'
      +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px">'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px">N° Fattura</label>'
      +'<input id="sdi-num" value="'+(cfg.num||'1')+'" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px"></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px">Data</label>'
      +'<input id="sdi-data" type="date" value="'+(cfg.data||new Date().toISOString().slice(0,10))+'" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px"></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px">Tipo Doc</label>'
      +'<select id="sdi-tipo" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">'
      +'<option value="TD01">TD01 — Fattura</option><option value="TD04">TD04 — Nota Credito</option><option value="TD06">TD06 — Parcella</option>'
      +'</select></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:2px">Valuta</label>'
      +'<input id="sdi-valuta" value="EUR" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px"></div>'
      +'</div>'
      // Righe
      +'<div id="sdi-lines"><div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:6px">Righe fattura</div>'
      +'<div id="sdi-lines-list">'
      +'<div style="display:grid;grid-template-columns:3fr 1fr 1fr 1fr auto;gap:8px;margin-bottom:6px">'
      +'<input id="sdi-desc-1" placeholder="Descrizione" style="padding:7px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">'
      +'<input id="sdi-qty-1" type="number" value="1" placeholder="Qty" style="padding:7px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">'
      +'<input id="sdi-punit-1" type="number" step="0.01" placeholder="€/pz" style="padding:7px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">'
      +'<input id="sdi-aliq-1" type="number" value="22" placeholder="IVA%" style="padding:7px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">'
      +'<span style="align-self:center;color:var(--text-muted);font-size:11px">—</span>'
      +'</div></div>'
      +'<button onclick="XMLSDIModule._addLine()" style="padding:6px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)">+ Aggiungi riga</button>'
      +'</div>'
      +'</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
      +'<button onclick="XMLSDIModule._saveAndGenerate()" style="padding:10px 20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">🧾 Genera XML SDI</button>'
      +'<button onclick="XMLSDIModule._saveCfg()" style="padding:10px 16px;background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:12px">💾 Salva Configurazione</button>'
      +'<button onclick="XMLSDIModule._preview()" style="padding:10px 16px;background:var(--bg-card2);color:#10b981;border:1px solid rgba(16,185,129,.3);border-radius:10px;cursor:pointer;font-size:12px">👁 Anteprima</button>'
      +'</div></div>';
  },

  _lineCount: 1,
  _addLine(){
    this._lineCount++;
    var n=this._lineCount;
    var list=document.getElementById('sdi-lines-list'); if(!list) return;
    var row=document.createElement('div');
    row.style.cssText='display:grid;grid-template-columns:3fr 1fr 1fr 1fr auto;gap:8px;margin-bottom:6px';
    row.innerHTML='<input id="sdi-desc-'+n+'" placeholder="Descrizione" style="padding:7px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">'
      +'<input id="sdi-qty-'+n+'" type="number" value="1" style="padding:7px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">'
      +'<input id="sdi-punit-'+n+'" type="number" step="0.01" style="padding:7px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">'
      +'<input id="sdi-aliq-'+n+'" type="number" value="22" style="padding:7px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">'
      +'<button onclick="this.parentElement.remove()" style="padding:4px 8px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:6px;cursor:pointer;font-size:11px">✕</button>';
    list.appendChild(row);
  },

  _collectLines(){
    var lines=[]; var i=1;
    while(document.getElementById('sdi-desc-'+i)||i<=1){
      var desc=document.getElementById('sdi-desc-'+i)?.value||'';
      var qty=parseFloat(document.getElementById('sdi-qty-'+i)?.value)||1;
      var pUnit=parseFloat(document.getElementById('sdi-punit-'+i)?.value)||0;
      var aliq=parseFloat(document.getElementById('sdi-aliq-'+i)?.value)||22;
      if(desc||pUnit) lines.push({n:i,desc,qty,pUnit,aliq,tot:qty*pUnit});
      i++; if(i>20) break;
    }
    return lines;
  },

  _collectData(){
    var d=this._load();
    return {
      cedNome: document.getElementById('sdi-ced-nome')?.value||d.cedNome||'',
      cedPiva: document.getElementById('sdi-ced-piva')?.value||d.cedPiva||'',
      cedCF:   document.getElementById('sdi-ced-cf')?.value||d.cedCF||'',
      cedRegime: document.getElementById('sdi-ced-regime')?.value||d.cedRegime||'RF19',
      cedInd:  document.getElementById('sdi-ced-ind')?.value||d.cedInd||'',
      cessNome:document.getElementById('sdi-cess-nome')?.value||d.cessNome||'',
      cessPiva:document.getElementById('sdi-cess-piva')?.value||d.cessPiva||'',
      cessSdi: document.getElementById('sdi-cess-sdi')?.value||d.cessSdi||'',
      cessInd: document.getElementById('sdi-cess-ind')?.value||d.cessInd||'',
      num:     document.getElementById('sdi-num')?.value||'1',
      data:    document.getElementById('sdi-data')?.value||new Date().toISOString().slice(0,10),
      tipo:    document.getElementById('sdi-tipo')?.value||'TD01',
      valuta:  document.getElementById('sdi-valuta')?.value||'EUR',
      lines:   this._collectLines(),
    };
  },

  _saveCfg(){
    this._save(this._collectData());
    if(typeof toast!=='undefined') toast('💾 Configurazione salvata','success');
  },

  _buildXML(d){
    var totImponibile=d.lines.reduce(function(s,l){return s+l.tot;},0);
    var totImposta=d.lines.reduce(function(s,l){return s+l.tot*(l.aliq/100);},0);
    var totDoc=totImponibile+totImposta;
    var fattDate=d.data||new Date().toISOString().slice(0,10);
    // Parse address
    var cedAddr=d.cedInd||'Via Roma 1'; var cedCap='90100'; var cedComune='Palermo'; var cedProv='PA';
    var m=cedAddr.match(/(\d{5})\s+([^-]+)(?:\s+([A-Z]{2}))?$/);
    if(m){cedCap=m[1];cedComune=m[2].trim();cedProv=m[3]||'PA';}
    var cessAddr=d.cessInd||'Via Milano 1'; var cessCap='20100'; var cessComune='Milano'; var cessProv='MI';
    var m2=cessAddr.match(/(\d{5})\s+([^-]+)(?:\s+([A-Z]{2}))?$/);
    if(m2){cessCap=m2[1];cessComune=m2[2].trim();cessProv=m2[3]||'MI';}

    var xml='<?xml version="1.0" encoding="UTF-8"?>\n';
    xml+='<p:FatturaElettronica xmlns:ds="http://www.w3.org/2000/09/xmldsig#"\n';
    xml+='  xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2"\n';
    xml+='  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n';
    xml+='  xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd"\n';
    xml+='  versione="FPR12">\n';
    xml+='  <FatturaElettronicaHeader>\n';
    xml+='    <DatiTrasmissione>\n';
    xml+='      <IdTrasmittente>\n';
    xml+='        <IdPaese>IT</IdPaese>\n';
    xml+='        <IdCodice>'+( d.cedPiva.replace('IT','')||'00000000000')+'</IdCodice>\n';
    xml+='      </IdTrasmittente>\n';
    xml+='      <ProgressivoInvio>'+d.num.padStart(5,'0')+'</ProgressivoInvio>\n';
    xml+='      <FormatoTrasmissione>FPR12</FormatoTrasmissione>\n';
    xml+='      <CodiceDestinatario>'+(d.cessSdi&&d.cessSdi.length<=7&&!d.cessSdi.includes('@')?d.cessSdi.padEnd(7,'0'):'0000000')+'</CodiceDestinatario>\n';
    if(d.cessSdi&&d.cessSdi.includes('@'))
      xml+='      <PECDestinatario>'+d.cessSdi+'</PECDestinatario>\n';
    xml+='    </DatiTrasmissione>\n';
    xml+='    <CedentePrestatore>\n';
    xml+='      <DatiAnagrafici>\n';
    xml+='        <IdFiscaleIVA>\n';
    xml+='          <IdPaese>IT</IdPaese>\n';
    xml+='          <IdCodice>'+d.cedPiva.replace('IT','').replace('it','').trim()+'</IdCodice>\n';
    xml+='        </IdFiscaleIVA>\n';
    xml+='        <CodiceFiscale>'+d.cedCF+'</CodiceFiscale>\n';
    xml+='        <Anagrafica><Denominazione>'+d.cedNome+'</Denominazione></Anagrafica>\n';
    xml+='        <RegimeFiscale>'+d.cedRegime+'</RegimeFiscale>\n';
    xml+='      </DatiAnagrafici>\n';
    xml+='      <Sede>\n';
    xml+='        <Indirizzo>'+cedAddr.split(/\d{5}/)[0].trim()+'</Indirizzo>\n';
    xml+='        <CAP>'+cedCap+'</CAP>\n';
    xml+='        <Comune>'+cedComune+'</Comune>\n';
    xml+='        <Provincia>'+cedProv+'</Provincia>\n';
    xml+='        <Nazione>IT</Nazione>\n';
    xml+='      </Sede>\n';
    xml+='    </CedentePrestatore>\n';
    xml+='    <CessionarioCommittente>\n';
    xml+='      <DatiAnagrafici>\n';
    xml+='        <IdFiscaleIVA>\n';
    xml+='          <IdPaese>IT</IdPaese>\n';
    xml+='          <IdCodice>'+d.cessPiva.replace('IT','').replace('it','').trim()+'</IdCodice>\n';
    xml+='        </IdFiscaleIVA>\n';
    xml+='        <Anagrafica><Denominazione>'+d.cessNome+'</Denominazione></Anagrafica>\n';
    xml+='      </DatiAnagrafici>\n';
    xml+='      <Sede>\n';
    xml+='        <Indirizzo>'+cessAddr.split(/\d{5}/)[0].trim()+'</Indirizzo>\n';
    xml+='        <CAP>'+cessCap+'</CAP>\n';
    xml+='        <Comune>'+cessComune+'</Comune>\n';
    xml+='        <Provincia>'+cessProv+'</Provincia>\n';
    xml+='        <Nazione>IT</Nazione>\n';
    xml+='      </Sede>\n';
    xml+='    </CessionarioCommittente>\n';
    xml+='  </FatturaElettronicaHeader>\n';
    xml+='  <FatturaElettronicaBody>\n';
    xml+='    <DatiGenerali>\n';
    xml+='      <DatiGeneraliDocumento>\n';
    xml+='        <TipoDocumento>'+d.tipo+'</TipoDocumento>\n';
    xml+='        <Divisa>'+d.valuta+'</Divisa>\n';
    xml+='        <Data>'+fattDate+'</Data>\n';
    xml+='        <Numero>'+d.num+'</Numero>\n';
    xml+='        <ImportoTotaleDocumento>'+totDoc.toFixed(2)+'</ImportoTotaleDocumento>\n';
    if(d.cedRegime==='RF19')
      xml+='        <Art73>SI</Art73>\n';
    xml+='      </DatiGeneraliDocumento>\n';
    xml+='    </DatiGenerali>\n';
    xml+='    <DatiBeniServizi>\n';
    d.lines.forEach(function(l){
      xml+='      <DettaglioLinee>\n';
      xml+='        <NumeroLinea>'+l.n+'</NumeroLinea>\n';
      xml+='        <Descrizione>'+l.desc+'</Descrizione>\n';
      xml+='        <Quantita>'+l.qty.toFixed(2)+'</Quantita>\n';
      xml+='        <PrezzoUnitario>'+l.pUnit.toFixed(2)+'</PrezzoUnitario>\n';
      xml+='        <PrezzoTotale>'+l.tot.toFixed(2)+'</PrezzoTotale>\n';
      xml+='        <AliquotaIVA>'+l.aliq.toFixed(2)+'</AliquotaIVA>\n';
      if(l.aliq===0) xml+='        <Natura>N1</Natura>\n';
      xml+='      </DettaglioLinee>\n';
    });
    xml+='      <DatiRiepilogo>\n';
    xml+='        <AliquotaIVA>22.00</AliquotaIVA>\n';
    xml+='        <ImponibileImporto>'+totImponibile.toFixed(2)+'</ImponibileImporto>\n';
    xml+='        <Imposta>'+totImposta.toFixed(2)+'</Imposta>\n';
    if(d.cedRegime==='RF19') xml+='        <EsigibilitaIVA>I</EsigibilitaIVA>\n';
    xml+='      </DatiRiepilogo>\n';
    xml+='    </DatiBeniServizi>\n';
    xml+='    <DatiPagamento>\n';
    xml+='      <CondizioniPagamento>TP02</CondizioniPagamento>\n';
    xml+='      <DettaglioPagamento>\n';
    xml+='        <ModalitaPagamento>MP05</ModalitaPagamento>\n';
    xml+='        <DataScadenzaPagamento>'+new Date(Date.now()+30*864e5).toISOString().slice(0,10)+'</DataScadenzaPagamento>\n';
    xml+='        <ImportoPagamento>'+totDoc.toFixed(2)+'</ImportoPagamento>\n';
    xml+='      </DettaglioPagamento>\n';
    xml+='    </DatiPagamento>\n';
    xml+='  </FatturaElettronicaBody>\n';
    xml+='</p:FatturaElettronica>';
    return xml;
  },

  _saveAndGenerate(){
    var d=this._collectData();
    if(!d.cedNome||!d.cedPiva){alert('Compila almeno Denominazione e P.IVA del Cedente!');return;}
    if(!d.cessNome){alert('Compila il Cessionario/Cliente!');return;}
    if(!d.lines.length){alert('Aggiungi almeno una riga di fattura!');return;}
    this._save(d);
    var xml=this._buildXML(d);
    var fname='IT'+d.cedPiva.replace('IT','')+'_FPR12_'+d.num.padStart(5,'0')+'.xml';
    var blob=new Blob([xml],{type:'text/xml;charset=utf-8'});
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fname; a.click();
    if(typeof toast!=='undefined') toast('🧾 XML SDI generato: '+fname,'success');
  },

  _preview(){
    var d=this._collectData();
    var xml=this._buildXML(d);
    var w=window.open('','_blank','width=700,height=600');
    if(!w) return;
    w.document.write('<pre style="background:#0f172a;color:#22c55e;padding:20px;font-size:11px;overflow:auto;min-height:100vh">'+xml.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</pre>');
    w.document.close();
  },
};

// Patch xmlsdi renderSection
(function _patchSDI(){
  function _p(){
    if(typeof App==='undefined') { setTimeout(_p, 700); return; }
    var _o=App.renderSection.bind(App);
    if(App._sdiPatch) return;
    App._sdiPatch=true;
    App.renderSection=async function(s){
      if(s==='xmlsdi'){ 
        document.querySelectorAll('.section-view.active').forEach(function(v){v.classList.remove('active');});
        var el=document.getElementById('view-xmlsdi');
        if(el){ el.classList.add('active'); XMLSDIModule.render(); return; }
      }
      return _o(s);
    };
  }
  setTimeout(_p,1500);
})();

// ─── 7. LaserB2B CRUD — Product Manager ───────────────────────────
window.LaserB2BCatalog = {
  _SK: 'lb2b_catalog_v1',
  _load(){
    try{ return JSON.parse(localStorage.getItem(this._SK)||'null'); }catch(e){ return null; }
  },
  _save(d){ try{ localStorage.setItem(this._SK,JSON.stringify(d)); }catch(e){} },
  _getProducts(){
    var custom = this._load();
    if(custom) return custom;
    // Return default products from LaserB2B
    if(typeof LaserB2B!=='undefined' && LaserB2B._PRODUCTS) return JSON.parse(JSON.stringify(LaserB2B._PRODUCTS));
    return [];
  },
  _saveProducts(prods){
    this._save(prods);
    // Sync to LaserB2B live
    if(typeof LaserB2B!=='undefined') LaserB2B._PRODUCTS = prods;
  },

  openManager(){
    var self = this;
    var existing = document.getElementById('lb2b-catalog-overlay');
    if(existing) { existing.remove(); return; }

    var prods = this._getProducts();
    var _editIdx = -1;

    function _rows(list){
      return list.map(function(p,i){
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;margin-bottom:6px">'
          +'<span style="font-size:20px;flex-shrink:0">'+p.img+'</span>'
          +'<div style="flex:1;min-width:0">'
          +'<div style="font-size:12px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+sanitize(p.name)+'</div>'
          +'<div style="font-size:10px;color:var(--text-muted)">'+sanitize(p.cat)+' · €'+p.cost.toFixed(2)+'/pz · '+p.timeMin+'min · '+sanitize(p.sup)+'</div>'
          +'</div>'
          +'<div style="display:flex;gap:6px;flex-shrink:0">'
          +'<button onclick="window._lb2bEdit('+i+')" style="padding:4px 9px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:6px;color:var(--primary);font-size:11px;cursor:pointer;font-weight:700">✏️</button>'
          +'<button onclick="window._lb2bDel('+i+')" style="padding:4px 9px;background:#ef444415;border:1px solid #ef444430;border-radius:6px;color:#ef4444;font-size:11px;cursor:pointer">🗑</button>'
          +'</div></div>';
      }).join('');
    }

    function _renderList(){
      var el = document.getElementById('lb2b-cat-list');
      if(el) el.innerHTML = _rows(prods) || '<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:12px">Nessun prodotto — aggiungine uno</div>';
    }

    var ov = document.createElement('div');
    ov.id = 'lb2b-catalog-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9900;display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow-y:auto';
    ov.onclick = function(e){ if(e.target===ov) ov.remove(); };

    ov.innerHTML = '<div style="background:var(--bg-card);border:1px solid var(--border2);border-radius:16px;width:min(680px,98vw);margin:auto">'
      +'<div style="display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--border)">'
      +'<span style="font-size:22px">📋</span>'
      +'<div style="flex:1"><div style="font-size:15px;font-weight:800;color:var(--text)">Gestisci Catalogo B2B</div>'
      +'<div style="font-size:11px;color:var(--text-muted)">Aggiungi, modifica o rimuovi prodotti dal catalogo</div></div>'
      +'<button onclick="window._lb2bOpenAdd()" style="padding:7px 14px;background:var(--primary);border:none;border-radius:8px;color:#000;font-size:12px;font-weight:800;cursor:pointer">+ Aggiungi</button>'
      +'<button onclick="document.getElementById(\'lb2b-catalog-overlay\').remove()" style="padding:7px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);cursor:pointer;font-size:14px;margin-left:4px">×</button>'
      +'</div>'
      +'<div style="padding:16px;max-height:60vh;overflow-y:auto"><div id="lb2b-cat-list"></div></div>'
      +'<div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px">'
      +'<button onclick="if(confirm(\'Ripristinare i prodotti predefiniti?\')){'
        +'localStorage.removeItem(\'lb2b_catalog_v1\');'
        +'if(typeof LaserB2B!==\'undefined\'){delete LaserB2B._catalogPatch;}'
        +'document.getElementById(\'lb2b-catalog-overlay\').remove();'
        +'if(typeof LaserB2B!==\'undefined\')LaserB2B.render();'
        +'if(typeof toast!==\'undefined\')toast(\'↺ Catalogo ripristinato\',\'info\');'
      +'}" style="padding:6px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text-muted);font-size:11px;cursor:pointer">↺ Reset Default</button>'
      +'<div style="flex:1"></div>'
      +'<button onclick="document.getElementById(\'lb2b-catalog-overlay\').remove();if(typeof LaserB2B!==\'undefined\')LaserB2B.render();" style="padding:6px 14px;background:var(--primary);border:none;border-radius:7px;color:#000;font-size:12px;font-weight:700;cursor:pointer">✅ Chiudi e Aggiorna</button>'
      +'</div>'
      +'</div>'
      // Nested edit form
      +'<div id="lb2b-cat-form-ov" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9950;align-items:center;justify-content:center">'
      +'<div style="background:var(--bg-card);border:1px solid var(--border2);border-radius:14px;padding:22px;width:min(480px,96vw)">'
      +'<div style="font-size:14px;font-weight:800;color:var(--text);margin-bottom:16px" id="lb2b-form-title">Nuovo Prodotto</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:3px">Icona (emoji)</label>'
      +'<input id="lb2b-f-img" placeholder="🎋" class="form-control"></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:3px">Categoria</label>'
      +'<input id="lb2b-f-cat" placeholder="es. Legno" class="form-control"></div>'
      +'</div>'
      +'<label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:3px">Nome Prodotto *</label>'
      +'<input id="lb2b-f-name" placeholder="Portachiavi Bambù Rotondo 40mm" class="form-control" style="margin-bottom:10px">'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:3px">Costo €/pz</label>'
      +'<input type="number" id="lb2b-f-cost" step="0.001" placeholder="0.400" class="form-control"></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:3px">Tempo (min)</label>'
      +'<input type="number" id="lb2b-f-time" step="0.5" placeholder="1.5" class="form-control"></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:3px">ID univoco</label>'
      +'<input id="lb2b-f-id" placeholder="pk_bambu" class="form-control"></div>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:3px">Fornitore</label>'
      +'<input id="lb2b-f-sup" placeholder="BSI Gadget" class="form-control"></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:3px">URL Fornitore</label>'
      +'<input id="lb2b-f-url" placeholder="https://..." class="form-control"></div>'
      +'</div>'
      +'<div style="display:flex;gap:8px">'
      +'<button onclick="window._lb2bSaveProd()" style="flex:1;padding:9px;background:var(--primary);border:none;border-radius:8px;color:#000;font-weight:800;cursor:pointer;font-size:13px">💾 Salva</button>'
      +'<button onclick="document.getElementById(\'lb2b-cat-form-ov\').style.display=\'none\'" style="padding:9px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);cursor:pointer">✕ Annulla</button>'
      +'</div></div></div>';

    document.body.appendChild(ov);
    _renderList();

    // Show form overlay for add
    window._lb2bOpenAdd = function(){
      _editIdx = -1;
      document.getElementById('lb2b-form-title').textContent = '+ Nuovo Prodotto';
      ['img','name','cat','cost','time','sup','url','id'].forEach(function(f){
        var el = document.getElementById('lb2b-f-'+f); if(el) el.value = '';
      });
      var formOv = document.getElementById('lb2b-cat-form-ov');
      if(formOv){ formOv.style.display='flex'; document.getElementById('lb2b-f-name').focus(); }
    };

    // Edit existing product
    window._lb2bEdit = function(i){
      _editIdx = i;
      var p = prods[i];
      document.getElementById('lb2b-form-title').textContent = '✏️ Modifica: ' + p.name;
      document.getElementById('lb2b-f-img').value  = p.img   || '';
      document.getElementById('lb2b-f-name').value = p.name  || '';
      document.getElementById('lb2b-f-cat').value  = p.cat   || '';
      document.getElementById('lb2b-f-cost').value = p.cost  || '';
      document.getElementById('lb2b-f-time').value = p.timeMin || '';
      document.getElementById('lb2b-f-sup').value  = p.sup   || '';
      document.getElementById('lb2b-f-url').value  = p.url   || '';
      document.getElementById('lb2b-f-id').value   = p.id    || '';
      var formOv = document.getElementById('lb2b-cat-form-ov');
      if(formOv) formOv.style.display = 'flex';
    };

    // Save from form
    window._lb2bSaveProd = function(){
      var name = (document.getElementById('lb2b-f-name').value || '').trim();
      if(!name){ if(typeof toast!=='undefined') toast('Inserisci un nome prodotto','warning'); return; }
      var prod = {
        id:      (document.getElementById('lb2b-f-id').value || '').trim() || name.toLowerCase().replace(/[^a-z0-9]/g,'_')+'_'+Date.now(),
        img:     (document.getElementById('lb2b-f-img').value || '').trim() || '🎁',
        name:    name,
        cat:     (document.getElementById('lb2b-f-cat').value || '').trim() || 'Custom',
        cost:    parseFloat(document.getElementById('lb2b-f-cost').value) || 0,
        timeMin: parseFloat(document.getElementById('lb2b-f-time').value) || 1.5,
        sup:     (document.getElementById('lb2b-f-sup').value || '').trim(),
        url:     (document.getElementById('lb2b-f-url').value || '').trim()
      };
      if(_editIdx >= 0) prods[_editIdx] = prod;
      else prods.push(prod);
      self._saveProducts(prods);
      _renderList();
      document.getElementById('lb2b-cat-form-ov').style.display = 'none';
      if(typeof toast!=='undefined') toast(_editIdx>=0 ? '✏️ Prodotto aggiornato' : '✅ Prodotto aggiunto', 'success');
    };

    // Delete product
    window._lb2bDel = function(i){
      if(!confirm('Eliminare "'+prods[i].name+'"?')) return;
      prods.splice(i,1);
      self._saveProducts(prods);
      _renderList();
      if(typeof toast!=='undefined') toast('🗑 Prodotto eliminato','info');
    };
  },
};

// Patch LaserB2B render to add "Gestisci Catalogo" button
(function _patchLB2BCatalog(){
  function _p(){
    if(typeof LaserB2B==='undefined') { setTimeout(_p, 800); return; }
    if(LaserB2B._catalogPatch) return;
    LaserB2B._catalogPatch=true;
    // Sync custom catalog if saved
    var saved=localStorage.getItem('lb2b_catalog_v1');
    if(saved){ try{ LaserB2B._PRODUCTS=JSON.parse(saved); }catch(e){} }
    // Add catalog button to admin panel
    var _origAdmin=LaserB2B._drawAdmin?.bind(LaserB2B);
    if(_origAdmin){
      LaserB2B._drawAdmin=function(){
        _origAdmin();
        var ap=document.getElementById('lb2b-ap');
        if(!ap) return;
        var existBtn=document.getElementById('lb2b-catalog-btn');
        if(existBtn) return;
        var btn=document.createElement('button');
        btn.id='lb2b-catalog-btn';
        btn.style.cssText='margin-top:10px;width:100%;padding:9px;background:rgba(99,102,241,.1);color:#818cf8;border:1.5px solid rgba(99,102,241,.25);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700';
        btn.textContent='📋 Gestisci Catalogo Prodotti (Aggiungi / Modifica / Rimuovi)';
        btn.onclick=function(){ LaserB2BCatalog.openManager(); };
        ap.appendChild(btn);
      };
    }
  }
  setTimeout(_p,2000);
})();

// ─── 8. Admin Margin Panel standalone route ─────────────────────────
window.AdminMarginPanel = {
  render(){
    var el=document.getElementById('view-laser_b2b'); if(!el) return;
    // Trigger LaserB2B to render (panel appears when product selected + calc called)
    if(typeof LaserB2B!=='undefined') LaserB2B.render();
    if(typeof toast!=='undefined') toast('💼 Laser B2B aperto — seleziona un prodotto per il pannello margini','info');
  }
};

console.log('[INGLY v21] All patches loaded: PriceAlertMon ✅ WAQuick ✅ CRM ✅ SDI ✅ Catalog ✅');

