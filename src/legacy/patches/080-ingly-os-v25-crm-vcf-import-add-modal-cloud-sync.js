
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v25 — CRM VCF Import + Add Modal + Cloud Sync improved
// ═══════════════════════════════════════════════════════════════════

// ─── Override CRMSmart with full VCF + Modal support ─────────────
(function _upgradeCRM(){
  function _p(){
    if(typeof CRMSmart==='undefined'){ setTimeout(_p,600); return; }
    if(CRMSmart._v25) return;
    CRMSmart._v25=true;

    // ── VCF Parser ────────────────────────────────────────────────
    CRMSmart._parseVCF = function(text){
      var vcards = text.split(/BEGIN:VCARD/i).filter(function(v){ return v.trim(); });
      var imported = [];
      vcards.forEach(function(raw){
        var lines = raw.split(/\r?\n/);
        var entry = {name:'',phone:'',email:'',company:'',notes:'',_imported:true,added:new Date().toISOString()};
        lines.forEach(function(line){
          line = line.trim();
          // Remove folded lines (lines starting with space are continuations)
          if(!line || line.startsWith(' ')) return;
          var lower = line.toLowerCase();
          // FN — full display name
          if(/^fn:/i.test(line)){
            var fn = line.replace(/^fn:/i,'').trim();
            if(fn && fn.length>1 && !fn.includes('BASE64')) entry.name=fn;
          }
          // TEL — phone (skip if contains non-phone chars)
          else if(/^tel/i.test(line)){
            var phone = line.replace(/^tel[^:]*:/i,'').trim().replace(/\s+/g,'');
            if(!entry.phone && phone && phone.length>5 && !/^[a-zA-Z]/.test(phone)){
              entry.phone = phone;
            }
          }
          // EMAIL
          else if(/^email/i.test(line)){
            var email = line.replace(/^email[^:]*:/i,'').trim();
            if(!entry.email && email && email.includes('@')) entry.email=email;
          }
          // ORG — company
          else if(/^org:/i.test(line)){
            var org = line.replace(/^org:/i,'').trim().replace(/;/g,' ').trim();
            if(!entry.company && org) entry.company=org;
          }
        });
        // Only include if has name or phone
        if((entry.name && entry.name.length>1) || entry.phone){
          imported.push(entry);
        }
      });
      return imported;
    };

    // ── Override _processFile to support VCF ─────────────────────
    CRMSmart._processFile = async function(inp){
      var file = inp.files[0]; if(!file) return;
      var ext = file.name.split('.').pop().toLowerCase();
      var self = this;
      this._showImportProgress('📂 Analisi file in corso...', 0);
      try{
        var text = await file.text();
        var imported = [];
        if(ext==='vcf' || ext==='vcard'){
          imported = self._parseVCF(text);
        } else if(ext==='csv'||ext==='txt'){
          imported = self._parseCSV(text);
        } else if(ext==='xlsx'||ext==='xls'){
          var buf = await file.arrayBuffer();
          imported = self._parseXLSX(buf);
        } else {
          // Try as VCF first (many phones save as .vcf without extension)
          if(text.includes('BEGIN:VCARD')){
            imported = self._parseVCF(text);
          } else {
            imported = self._parseCSV(text);
          }
        }
        this._showImportProgress('✅ Trovati '+imported.length+' contatti...', 50);
        this._mergeImported(imported);
      }catch(e){
        if(typeof toast!=='undefined') toast('Errore importazione: '+e.message,'error');
        console.error('[CRM Import]', e);
      }
      inp.value='';
    };

    // ── Progress indicator ────────────────────────────────────────
    CRMSmart._showImportProgress = function(msg, pct){
      var el = document.getElementById('crm-import-progress');
      if(!el){
        el = document.createElement('div');
        el.id = 'crm-import-progress';
        el.style.cssText='padding:10px 14px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.25);border-radius:9px;font-size:12px;color:var(--primary);margin-top:8px';
        var actions = document.querySelector('[id^="crm"]')?.closest('[style*="max-width"]');
        if(actions) actions.appendChild(el);
      }
      el.innerHTML = msg;
      if(pct>=100 || msg.includes('✅')&&pct===0) setTimeout(function(){ if(el) el.remove(); }, 3000);
    };

    // ── Override _addClient with proper modal ─────────────────────
    CRMSmart._addClient = function(){
      var self = this;
      // Remove existing modal if any
      var old = document.getElementById('crm-add-modal');
      if(old) old.remove();

      var modal = document.createElement('div');
      modal.id = 'crm-add-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)';

      modal.innerHTML =
        '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:460px;max-width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.5)">'
        +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">'
        +'<span style="font-size:24px">👤</span>'
        +'<div><div style="font-size:16px;font-weight:900;color:var(--text)">Aggiungi Cliente</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">Inserisci i dati del nuovo contatto</div></div>'
        +'<button onclick="document.getElementById(\'crm-add-modal\').remove()" '
        +'style="margin-left:auto;background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:20px;padding:4px;border-radius:6px">✕</button>'
        +'</div>'
        // Form
        +'<div style="display:grid;gap:12px">'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">Nome *</label>'
        +'<input id="crm-f-name" placeholder="Es. Mario Rossi" autofocus '
        +'style="width:100%;padding:10px 12px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;transition:.2s" '
        +'onfocus="this.style.borderColor=\'var(--primary)\'" onblur="this.style.borderColor=\'var(--border)\'"></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">Azienda</label>'
        +'<input id="crm-f-company" placeholder="Es. Ristorante Belvedere" '
        +'style="width:100%;padding:10px 12px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;transition:.2s" '
        +'onfocus="this.style.borderColor=\'var(--primary)\'" onblur="this.style.borderColor=\'var(--border)\'"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">📱 Telefono</label>'
        +'<input id="crm-f-phone" placeholder="+39 333 000 0000" type="tel" '
        +'style="width:100%;padding:10px 12px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;transition:.2s" '
        +'onfocus="this.style.borderColor=\'#25D366\'" onblur="this.style.borderColor=\'var(--border)\'"></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">✉️ Email</label>'
        +'<input id="crm-f-email" placeholder="mario@email.com" type="email" '
        +'style="width:100%;padding:10px 12px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;transition:.2s" '
        +'onfocus="this.style.borderColor=\'var(--primary)\'" onblur="this.style.borderColor=\'var(--border)\'"></div>'
        +'</div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">🏷️ Tag / Categoria</label>'
        +'<input id="crm-f-tag" placeholder="Es. B2B · Hotel · Privato · VIP" '
        +'style="width:100%;padding:10px 12px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;transition:.2s" '
        +'onfocus="this.style.borderColor=\'var(--primary)\'" onblur="this.style.borderColor=\'var(--border)\'"></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">📝 Note</label>'
        +'<textarea id="crm-f-notes" placeholder="Informazioni utili: prodotti preferiti, occasioni speciali, storico ordini..." '
        +'style="width:100%;padding:10px 12px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;height:70px;resize:vertical;transition:.2s" '
        +'onfocus="this.style.borderColor=\'var(--primary)\'" onblur="this.style.borderColor=\'var(--border)\'"></textarea></div>'
        +'</div>'
        +'<div style="display:flex;gap:8px;margin-top:4px">'
        +'<button id="crm-save-btn" onclick="CRMSmart._saveNewClientModal()" '
        +'style="flex:1;padding:11px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800;transition:.15s" '
        +'onmouseover="this.style.opacity=\'.9\'" onmouseout="this.style.opacity=\'1\'">✅ Salva Cliente</button>'
        +'<button onclick="document.getElementById(\'crm-add-modal\').remove()" '
        +'style="padding:11px 20px;background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px">Annulla</button>'
        +'</div>'
        +'<div id="crm-save-err" style="font-size:11px;color:#ef4444;min-height:16px"></div>'
        +'</div>';

      document.body.appendChild(modal);
      modal.addEventListener('click', function(e){ if(e.target===modal) modal.remove(); });
      // Focus name field
      setTimeout(function(){ document.getElementById('crm-f-name')?.focus(); }, 100);
      // Enter key to save
      modal.addEventListener('keydown', function(e){ if(e.key==='Enter'&&!e.shiftKey) CRMSmart._saveNewClientModal(); });
    };

    CRMSmart._saveNewClientModal = function(){
      var name = document.getElementById('crm-f-name')?.value?.trim();
      var company = document.getElementById('crm-f-company')?.value?.trim()||'';
      var phone = document.getElementById('crm-f-phone')?.value?.trim()||'';
      var email = document.getElementById('crm-f-email')?.value?.trim()||'';
      var tag = document.getElementById('crm-f-tag')?.value?.trim()||'';
      var notes = document.getElementById('crm-f-notes')?.value?.trim()||'';

      if(!name){
        var err = document.getElementById('crm-save-err');
        if(err) err.textContent='⚠️ Il nome è obbligatorio.';
        document.getElementById('crm-f-name')?.focus();
        return;
      }
      var data = this._load();
      data.push({
        name, company, phone, email,
        notes: (tag?(tag+' — '):'') + notes,
        added: new Date().toISOString()
      });
      this._save(data);
      document.getElementById('crm-add-modal')?.remove();
      this.render();
      if(typeof toast!=='undefined') toast('✅ '+name+' aggiunto al CRM!','success');
    };

    // ── Better render with tag display ───────────────────────────
    var _origRender = CRMSmart.render.bind(CRMSmart);
    CRMSmart.render = function(){
      _origRender();
      // Also update import button to show VCF support
      var importBtn = document.querySelector('[onclick*="crm-file-inp"]');
      if(importBtn && !importBtn._patched){
        importBtn._patched=true;
        importBtn.textContent='📂 Importa Contatti (VCF · CSV · Excel)';
        var fileInp = document.getElementById('crm-file-inp');
        if(fileInp) fileInp.setAttribute('accept','.vcf,.vcard,.csv,.xlsx,.xls,.txt');
      }
    };

    console.log('[CRM v25] VCF import + modal upgrade applied');
  }
  setTimeout(_p, 1000);
})();

// ─── Cloud Sync Upgrade ───────────────────────────────────────────
(function _upgradeCloudSync(){
  function _p(){
    if(typeof InglyCloudSync==='undefined'){ setTimeout(_p,800); return; }
    if(InglyCloudSync._v25) return;
    InglyCloudSync._v25=true;

    // Patch render to show better UI with status indicator
    var _origRender = InglyCloudSync.render.bind(InglyCloudSync);
    InglyCloudSync.render = function(){
      var el = document.getElementById('view-cloud_updater');
      if(!el) return;

      var cfg = JSON.parse(localStorage.getItem('ingly_cloud_sync_v1')||'{}');
      var isConfigured = !!(cfg.binId);
      var lastSync = cfg.lastSync ? new Date(cfg.lastSync).toLocaleString('it') : 'Mai';
      var autoOn = cfg.autoSync;

      el.innerHTML = '<div style="padding:16px 20px;max-width:900px;margin:0 auto">'
        +'<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">'
        +'<span style="font-size:28px">☁️</span>'
        +'<div style="flex:1">'
        +'<div style="font-size:20px;font-weight:900;color:var(--text)">Cloud Sync</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">Sincronizza tutti i dati tra dispositivi in tempo reale — Gratuito · No server</div>'
        +'</div>'
        +'<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:'+(isConfigured?'rgba(34,197,94,.1)':'rgba(245,158,11,.1)')+';border:1px solid '+(isConfigured?'rgba(34,197,94,.3)':'rgba(245,158,11,.3)')+';border-radius:20px">'
        +'<div style="width:8px;height:8px;border-radius:50%;background:'+(isConfigured?'#22c55e':'#f59e0b')+';'+(autoOn?'animation:pulse 2s infinite':'')+'"></div>'
        +'<span style="font-size:11px;font-weight:700;color:'+(isConfigured?'#22c55e':'#f59e0b')+'">'+(isConfigured?(autoOn?'Sync attivo':'Configurato'):'Non configurato')+'</span>'
        +'</div></div>'

        // KPI bar
        +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">'
        +'<div style="background:var(--bg-card2);border:1px solid #22c55e25;border-radius:12px;padding:14px;text-align:center">'
        +'<div style="font-size:9px;color:#22c55e;font-weight:700;text-transform:uppercase;margin-bottom:4px">Ultimo Sync</div>'
        +'<div style="font-size:11px;font-weight:800;color:var(--text)">'+lastSync+'</div></div>'
        +'<div style="background:var(--bg-card2);border:1px solid #3b82f625;border-radius:12px;padding:14px;text-align:center">'
        +'<div style="font-size:9px;color:#3b82f6;font-weight:700;text-transform:uppercase;margin-bottom:4px">Bin ID</div>'
        +'<div style="font-size:10px;font-weight:700;color:var(--text);word-break:break-all">'+(cfg.binId?'...'+cfg.binId.slice(-10):'Non impostato')+'</div></div>'
        +'<div style="background:var(--bg-card2);border:1px solid #f59e0b25;border-radius:12px;padding:14px;text-align:center">'
        +'<div style="font-size:9px;color:#f59e0b;font-weight:700;text-transform:uppercase;margin-bottom:4px">Auto-sync</div>'
        +'<div style="font-size:12px;font-weight:800;color:var(--text)">'+(autoOn?'✅ '+cfg.interval+'min':'❌ Off')+'</div></div>'
        +'<div style="background:var(--bg-card2);border:1px solid #8b5cf625;border-radius:12px;padding:14px;text-align:center">'
        +'<div style="font-size:9px;color:#8b5cf6;font-weight:700;text-transform:uppercase;margin-bottom:4px">Store</div>'
        +'<div style="font-size:22px;font-weight:900;color:#8b5cf6">9</div></div>'
        +'</div>'

        // Big action buttons
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">'
        +'<button onclick="InglyCloudSync.push()" style="padding:18px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:14px;cursor:pointer;font-size:15px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:10px;transition:.15s" onmouseover="this.style.transform=\'scale(1.02)\'" onmouseout="this.style.transform=\'\'"><span style="font-size:24px">☁️</span><div style="text-align:left"><div>Carica su Cloud</div><div style="font-size:10px;font-weight:400;opacity:.9">Push — Invia tutti i dati</div></div></button>'
        +'<button onclick="InglyCloudSync.pull()" style="padding:18px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;border-radius:14px;cursor:pointer;font-size:15px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:10px;transition:.15s" onmouseover="this.style.transform=\'scale(1.02)\'" onmouseout="this.style.transform=\'\'"><span style="font-size:24px">📥</span><div style="text-align:left"><div>Scarica da Cloud</div><div style="font-size:10px;font-weight:400;opacity:.9">Pull — Ricevi aggiornamenti</div></div></button>'
        +'</div>'

        // Config Panel
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">'
        // Settings
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:18px">'
        +'<div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:14px">⚙️ Configurazione</div>'
        +'<div style="margin-bottom:10px"><label style="font-size:10px;color:var(--text-muted);font-weight:700;display:block;margin-bottom:3px">Sync Code (Bin ID)</label>'
        +'<div style="display:flex;gap:6px">'
        +'<input id="cs-binid" value="'+(cfg.binId||'')+'" placeholder="Vuoto = crea automaticamente" '
        +'style="flex:1;padding:8px 10px;background:var(--bg-card);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:11px">'
        +'<button onclick="navigator.clipboard?.writeText(document.getElementById(\'cs-binid\').value).then(function(){if(typeof toast!==\'undefined\')toast(\'Copiato!\',\'success\')})" '
        +'style="padding:8px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px" title="Copia Sync Code">📋</button>'
        +'</div></div>'
        +'<div style="margin-bottom:10px"><label style="font-size:10px;color:var(--text-muted);font-weight:700;display:block;margin-bottom:3px">API Key JSONBin.io (opzionale)</label>'
        +'<input id="cs-apikey" value="'+(cfg.apiKey||'')+'" type="password" placeholder="Per bin privati — opzionale" '
        +'style="width:100%;padding:8px 10px;background:var(--bg-card);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px"></div>'
        +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">'
        +'<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text)">'
        +'<input type="checkbox" id="cs-auto" '+(autoOn?'checked':'')+' style="width:16px;height:16px;cursor:pointer"> Auto-sync ogni</label>'
        +'<select id="cs-interval" style="padding:4px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:11px">'
        +'<option value="5" '+(cfg.interval===5?'selected':'')+'>5 min</option>'
        +'<option value="15" '+(cfg.interval===15||!cfg.interval?'selected':'')+'>15 min</option>'
        +'<option value="30" '+(cfg.interval===30?'selected':'')+'>30 min</option>'
        +'<option value="60" '+(cfg.interval===60?'selected':'')+'>1 ora</option>'
        +'</select>'
        +'</div>'
        +'<button onclick="InglyCloudSync.saveConfig()" style="width:100%;padding:9px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700;color:var(--text)">💾 Salva Configurazione</button>'
        +'</div>'
        // Backup
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:18px">'
        +'<div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:14px">💾 Backup Locale</div>'
        +'<div style="display:grid;gap:8px">'
        +'<button onclick="InglyCloudSync.exportJSON()" style="padding:10px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text);display:flex;align-items:center;gap:8px"><span>📤</span><div style="text-align:left"><div style="font-weight:700">Esporta Backup JSON</div><div style="font-size:10px;color:var(--text-muted)">Salva tutti i dati in locale</div></div></button>'
        +'<button onclick="InglyCloudSync.importJSON()" style="padding:10px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text);display:flex;align-items:center;gap:8px"><span>📂</span><div style="text-align:left"><div style="font-weight:700">Importa da File JSON</div><div style="font-size:10px;color:var(--text-muted)">Ripristina da backup</div></div></button>'
        +'<div style="padding:10px;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.15);border-radius:9px;font-size:11px;color:var(--text-muted)">'
        +'💡 <strong>Come sincronizzare su altro dispositivo:</strong><br>'
        +'1. Premi ☁️ Carica → ottieni il Sync Code<br>'
        +'2. Sul secondo dispositivo: incolla il Sync Code → Scarica'
        +'</div>'
        +'</div></div></div>'
        +'<div id="cs-status" style="margin-top:12px"></div>'
        +'</div>';
    };

    console.log('[CloudSync v25] UI upgraded');
  }
  setTimeout(_p, 1200);
})();

console.log('[INGLY v25] CRM VCF + Cloud Sync upgraded');

