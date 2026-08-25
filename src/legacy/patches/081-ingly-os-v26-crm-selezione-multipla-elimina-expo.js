
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v26 — CRM: Selezione multipla + Elimina + Export VCF/CSV
// ═══════════════════════════════════════════════════════════════════
;(function _crmSelectionPatch(){
  function _p(){
    if(typeof CRMSmart==='undefined'||!CRMSmart._v25){ setTimeout(_p,600); return; }
    if(CRMSmart._v26) return;
    CRMSmart._v26 = true;

    // ── State: set of selected indices ──────────────────────────
    CRMSmart._selected = new Set();

    // ── Override render + _buildHTML ────────────────────────────
    CRMSmart.render = function(){
      var el = document.getElementById('view-clienti')||document.getElementById('view-crm');
      if(!el) return;
      this._selected = new Set(); // reset selection on render
      var data = this._load();
      el.innerHTML = this._buildHTML(data);
      // Patch import button accept
      var fileInp = document.getElementById('crm-file-inp');
      if(fileInp) fileInp.setAttribute('accept','.vcf,.vcard,.csv,.xlsx,.xls,.txt');
    };

    CRMSmart._buildHTML = function(data){
      var total = data.length;
      var withPhone = data.filter(function(c){ return c.phone; }).length;

      var rows = data.length ? data.map(function(c,i){
        return '<tr id="crm-row-'+i+'" style="border-bottom:1px solid var(--border);transition:.12s">'
          +'<td style="padding:8px 10px;text-align:center;width:36px">'
          +'<input type="checkbox" id="crm-chk-'+i+'" data-idx="'+i+'" '
          +'onchange="CRMSmart._onCheck('+i+',this.checked)" '
          +'style="width:15px;height:15px;cursor:pointer;accent-color:var(--primary)"></td>'
          +'<td style="padding:8px 12px">'
          +'<div style="font-size:13px;font-weight:700;color:var(--text)">'+c.name+'</div>'
          +(c.company?'<div style="font-size:10px;color:var(--text-muted)">'+c.company+'</div>':'')
          +'</td>'
          +'<td style="padding:8px 12px">'
          +(c.phone?'<a href="tel:'+c.phone+'" style="color:var(--primary);text-decoration:none;font-size:13px">'+c.phone+'</a>':'<span style="color:var(--text-dim)">—</span>')
          +'</td>'
          +'<td style="padding:8px 12px;color:var(--text-muted);font-size:12px">'+(c.email||'—')+'</td>'
          +'<td style="padding:8px 12px;font-size:11px;color:var(--text-dim);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(c.notes||'—')+'</td>'
          +'<td style="padding:8px 10px;text-align:center">'
          +'<div style="display:flex;gap:4px;justify-content:center">'
          +(c.phone?'<button onclick="WAQuick&&WAQuick.openPanel(\''+c.phone.replace(/\D/g,'')+'\',\'Ciao '+c.name+'! \')" title="WhatsApp" style="padding:4px 8px;background:#25D36615;color:#25D366;border:1px solid #25D36630;border-radius:6px;cursor:pointer;font-size:11px">💬</button>':'')
          +'<button onclick="CRMSmart._editClient('+i+')" title="Modifica" style="padding:4px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:11px">✏️</button>'
          +'<button onclick="CRMSmart._deleteClient('+i+')" title="Elimina" style="padding:4px 8px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:6px;cursor:pointer;font-size:11px">🗑</button>'
          +'</div></td></tr>';
      }).join('') : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-dim)">Nessun cliente ancora. Aggiungi manualmente o importa un file VCF/CSV.</td></tr>';

      return '<div style="padding:16px 20px;max-width:1100px;margin:0 auto">'
        // Header
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">'
        +'<div style="display:flex;align-items:center;gap:12px">'
        +'<span style="font-size:26px">👥</span>'
        +'<div><div style="font-size:20px;font-weight:900;color:var(--text)">CRM Clienti</div>'
        +'<div style="font-size:11px;color:var(--text-muted)" id="crm-count-sub">'+total+' clienti · '+withPhone+' con telefono</div>'
        +'</div></div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
        +'<button onclick="CRMSmart._addClient()" style="padding:8px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">+ Aggiungi</button>'
        +'<button onclick="CRMSmart._importFile()" style="padding:8px 16px;background:var(--bg-card2);color:#10b981;border:1.5px solid rgba(16,185,129,.3);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">📂 Importa</button>'
        +'<input id="crm-file-inp" type="file" accept=".vcf,.vcard,.csv,.xlsx,.xls,.txt" style="display:none" onchange="CRMSmart._processFile(this)">'
        +'</div></div>'

        // KPI
        +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">'
        +[{l:'Totale',v:total,c:'#6366f1'},{l:'Con Telefono',v:withPhone,c:'#10b981'},{l:'Importati',v:data.filter(function(x){return x._imported;}).length,c:'#f59e0b'},{l:'Aggiunti oggi',v:data.filter(function(x){return x.added&&x.added.slice(0,10)===new Date().toISOString().slice(0,10);}).length,c:'#ec4899'}]
        .map(function(k){ return '<div style="background:var(--bg-card2);border:1px solid '+k.c+'30;border-radius:12px;padding:12px;text-align:center"><div style="font-size:9px;color:'+k.c+';font-weight:700;text-transform:uppercase;margin-bottom:3px">'+k.l+'</div><div style="font-size:20px;font-weight:900;color:'+k.c+'">'+k.v+'</div></div>'; }).join('')
        +'</div>'

        // Search
        +'<input oninput="CRMSmart._search(this.value)" placeholder="🔍 Cerca per nome, telefono, azienda, note..." '
        +'style="width:100%;padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:13px;margin-bottom:10px">'

        // Selection toolbar (initially hidden)
        +'<div id="crm-sel-bar" style="display:none;align-items:center;gap:8px;padding:10px 14px;background:rgba(99,102,241,.1);border:1.5px solid rgba(99,102,241,.3);border-radius:10px;margin-bottom:10px;flex-wrap:wrap">'
        +'<span id="crm-sel-count" style="font-size:12px;font-weight:800;color:var(--primary)">0 selezionati</span>'
        +'<button onclick="CRMSmart._selectAll()" style="padding:5px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text)">☑️ Seleziona tutti</button>'
        +'<button onclick="CRMSmart._deselectAll()" style="padding:5px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text)">⬜ Deseleziona</button>'
        +'<button onclick="CRMSmart._deleteSelected()" style="padding:5px 12px;background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.3);border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">🗑 Elimina selezionati</button>'
        +'<button onclick="CRMSmart._exportSelected(\'vcf\')" style="padding:5px 12px;background:rgba(16,185,129,.1);color:#10b981;border:1px solid rgba(16,185,129,.25);border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">📱 Esporta VCF</button>'
        +'<button onclick="CRMSmart._exportSelected(\'csv\')" style="padding:5px 12px;background:rgba(59,130,246,.1);color:#3b82f6;border:1px solid rgba(59,130,246,.25);border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">📊 Esporta CSV</button>'
        +'</div>'

        // Bulk action bar (always visible bottom)
        +'<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">'
        +'<button onclick="CRMSmart._toggleSelectMode()" id="crm-sel-toggle" style="padding:7px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted);font-weight:700">☐ Seleziona</button>'
        +'<button onclick="CRMSmart._exportAll(\'vcf\')" style="padding:7px 14px;background:var(--bg-card2);border:1px solid rgba(16,185,129,.3);border-radius:8px;cursor:pointer;font-size:11px;color:#10b981;font-weight:700">📱 Esporta tutto VCF</button>'
        +'<button onclick="CRMSmart._exportAll(\'csv\')" style="padding:7px 14px;background:var(--bg-card2);border:1px solid rgba(59,130,246,.3);border-radius:8px;cursor:pointer;font-size:11px;color:#3b82f6;font-weight:700">📊 Esporta tutto CSV</button>'
        +'<button onclick="CRMSmart._deleteAll()" style="padding:7px 14px;background:var(--bg-card2);border:1px solid rgba(239,68,68,.3);border-radius:8px;cursor:pointer;font-size:11px;color:#ef4444;font-weight:700">🗑 Elimina tutti</button>'
        +'</div>'

        // Table
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;overflow:hidden">'
        +'<table id="crm-table" style="width:100%;border-collapse:collapse">'
        +'<thead><tr style="background:var(--bg-card)">'
        +'<th style="padding:9px 10px;text-align:center;width:36px">'
        +'<input type="checkbox" id="crm-chk-all" onchange="CRMSmart._onCheckAll(this.checked)" '
        +'style="width:15px;height:15px;cursor:pointer;accent-color:var(--primary)" title="Seleziona/deseleziona tutti"></th>'
        +'<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Nome</th>'
        +'<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Telefono</th>'
        +'<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Email</th>'
        +'<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Note</th>'
        +'<th style="padding:9px 12px;text-align:center;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Azioni</th>'
        +'</tr></thead>'
        +'<tbody id="crm-tbody">'+rows+'</tbody>'
        +'</table></div>'
        +'</div>';
    };

    // ── Checkbox handlers ────────────────────────────────────────
    CRMSmart._selectMode = false;

    CRMSmart._toggleSelectMode = function(){
      this._selectMode = !this._selectMode;
      var btn = document.getElementById('crm-sel-toggle');
      if(btn) btn.textContent = this._selectMode ? '✅ Modalità Selezione ON' : '☐ Seleziona';
      // Show/hide checkbox column
      document.querySelectorAll('[id^="crm-chk-"]').forEach(function(el){
        el.closest('td').style.display = '';
      });
      var bar = document.getElementById('crm-sel-bar');
      if(!this._selectMode && bar){ bar.style.display='none'; this._deselectAll(); }
    };

    CRMSmart._onCheck = function(idx, checked){
      if(checked) this._selected.add(idx);
      else this._selected.delete(idx);
      this._updateSelBar();
    };

    CRMSmart._onCheckAll = function(checked){
      var data = this._load();
      if(checked){
        data.forEach(function(_,i){ CRMSmart._selected.add(i); });
        document.querySelectorAll('[id^="crm-chk-"]:not(#crm-chk-all)').forEach(function(el){ el.checked=true; });
      } else {
        this._deselectAll();
      }
      this._updateSelBar();
    };

    CRMSmart._selectAll = function(){
      var data = this._load();
      this._selected = new Set();
      data.forEach(function(_,i){ CRMSmart._selected.add(i); });
      document.querySelectorAll('[id^="crm-chk-"]:not(#crm-chk-all)').forEach(function(el){ el.checked=true; });
      var allChk = document.getElementById('crm-chk-all');
      if(allChk) allChk.checked=true;
      this._updateSelBar();
    };

    CRMSmart._deselectAll = function(){
      this._selected = new Set();
      document.querySelectorAll('[id^="crm-chk-"]').forEach(function(el){ el.checked=false; });
      this._updateSelBar();
    };

    CRMSmart._updateSelBar = function(){
      var n = this._selected.size;
      var bar = document.getElementById('crm-sel-bar');
      var cnt = document.getElementById('crm-sel-count');
      if(bar){ bar.style.display = n>0?'flex':'none'; }
      if(cnt){ cnt.textContent = n+' selezionati'; }
      // Highlight selected rows
      var data = this._load();
      data.forEach(function(_,i){
        var row = document.getElementById('crm-row-'+i);
        if(row) row.style.background = CRMSmart._selected.has(i)?'rgba(99,102,241,.06)':'';
      });
      var allChk = document.getElementById('crm-chk-all');
      if(allChk) allChk.indeterminate = n>0 && n<data.length;
      if(allChk) allChk.checked = n>0 && n===data.length;
    };

    // ── Delete operations ─────────────────────────────────────────
    CRMSmart._deleteSelected = function(){
      var n = this._selected.size;
      if(!n){ if(typeof toast!=='undefined') toast('Nessun contatto selezionato','info'); return; }
      if(!confirm('Eliminare '+n+' contatti selezionati?')) return;
      var data = this._load();
      var toDelete = Array.from(this._selected).sort(function(a,b){return b-a;});
      toDelete.forEach(function(i){ data.splice(i,1); });
      this._save(data);
      if(typeof toast!=='undefined') toast('🗑 Eliminati '+n+' contatti','success');
      this.render();
    };

    CRMSmart._deleteAll = function(){
      var n = this._load().length;
      if(!n){ if(typeof toast!=='undefined') toast('Rubrica già vuota','info'); return; }
      if(!confirm('⚠️ Eliminare TUTTI i '+n+' contatti dalla rubrica?\n\nQuesta operazione non può essere annullata.')) return;
      this._save([]);
      if(typeof toast!=='undefined') toast('🗑 Rubrica svuotata ('+n+' contatti eliminati)','info');
      this.render();
    };

    // ── Export operations ─────────────────────────────────────────
    CRMSmart._getExportData = function(onlySelected){
      var data = this._load();
      if(onlySelected && this._selected.size>0){
        return Array.from(this._selected).map(function(i){ return data[i]; }).filter(Boolean);
      }
      return data;
    };

    CRMSmart._exportToVCF = function(data){
      var vcf = data.map(function(c){
        var lines = ['BEGIN:VCARD','VERSION:3.0'];
        // FN
        lines.push('FN:'+(c.name||''));
        // N: split first/last if possible
        var parts = (c.name||'').split(' ');
        var last = parts.length>1?parts.pop():'';
        var first = parts.join(' ');
        lines.push('N:'+last+';'+first+';;;');
        // TEL
        if(c.phone) lines.push('TEL;TYPE=CELL:'+c.phone);
        // EMAIL
        if(c.email) lines.push('EMAIL:'+c.email);
        // ORG
        if(c.company) lines.push('ORG:'+c.company);
        // NOTE
        if(c.notes) lines.push('NOTE:'+c.notes.replace(/\n/g,'\\n'));
        lines.push('END:VCARD');
        return lines.join('\r\n');
      }).join('\r\n\r\n');
      return vcf;
    };

    CRMSmart._exportToCSV = function(data){
      var rows = [['Nome','Telefono','Email','Azienda','Note','Aggiunto']];
      data.forEach(function(c){
        rows.push([
          c.name||'', c.phone||'', c.email||'', c.company||'',
          (c.notes||'').replace(/,/g,';'),
          c.added?new Date(c.added).toLocaleDateString('it'):''
        ]);
      });
      return rows.map(function(r){
        return r.map(function(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }).join(',');
      }).join('\n');
    };

    CRMSmart._exportSelected = function(fmt){
      var data = this._getExportData(true);
      if(!data.length){ if(typeof toast!=='undefined') toast('Nessun contatto selezionato','info'); return; }
      this._downloadExport(data, fmt, 'contatti_selezionati');
    };

    CRMSmart._exportAll = function(fmt){
      var data = this._load();
      if(!data.length){ if(typeof toast!=='undefined') toast('Rubrica vuota','info'); return; }
      this._downloadExport(data, fmt, 'rubrica_ingly');
    };

    CRMSmart._downloadExport = function(data, fmt, baseName){
      var content, mimeType, ext;
      if(fmt==='vcf'){
        content = this._exportToVCF(data);
        mimeType = 'text/vcard;charset=utf-8';
        ext = 'vcf';
      } else {
        content = this._exportToCSV(data);
        mimeType = 'text/csv;charset=utf-8';
        ext = 'csv';
      }
      var fname = baseName+'_'+new Date().toISOString().slice(0,10)+'.'+ext;
      var blob = new Blob(['\uFEFF'+content], {type: mimeType});
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      a.click();
      if(typeof toast!=='undefined') toast('📥 '+data.length+' contatti esportati → '+fname,'success');
    };

    // ── Search ───────────────────────────────────────────────────
    CRMSmart._search = function(q){
      q = q.toLowerCase();
      var rows = document.querySelectorAll('#crm-tbody tr[id^="crm-row-"]');
      var visible = 0;
      rows.forEach(function(tr){
        var txt = tr.textContent.toLowerCase();
        var show = !q || txt.includes(q);
        tr.style.display = show?'':'none';
        if(show) visible++;
      });
      var sub = document.getElementById('crm-count-sub');
      if(sub && q) sub.textContent = visible+' risultati per "'+q+'"';
      else if(sub){ var data=CRMSmart._load(); sub.textContent=data.length+' clienti · '+data.filter(function(c){return c.phone;}).length+' con telefono'; }
    };

    // ── Edit (inline modal) ──────────────────────────────────────
    CRMSmart._editClient = function(i){
      var data = this._load(); var client = data[i]; if(!client) return;
      var self = this;
      var old = document.getElementById('crm-add-modal'); if(old) old.remove();
      var modal = document.createElement('div');
      modal.id='crm-add-modal';
      modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)';
      modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:460px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5)">'
        +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">'
        +'<span style="font-size:24px">✏️</span>'
        +'<div><div style="font-size:16px;font-weight:900;color:var(--text)">Modifica Cliente</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">'+client.name+'</div></div>'
        +'<button onclick="document.getElementById(\'crm-add-modal\').remove()" style="margin-left:auto;background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:20px">✕</button>'
        +'</div>'
        +'<div style="display:grid;gap:10px">'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Nome *</label><input id="crm-f-name" value="'+client.name+'" style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Azienda</label><input id="crm-f-company" value="'+( client.company||'')+'" style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">📱 Telefono</label><input id="crm-f-phone" value="'+(client.phone||'')+'" type="tel" style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">✉️ Email</label><input id="crm-f-email" value="'+(client.email||'')+'" type="email" style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'</div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">📝 Note</label>'
        +'<textarea id="crm-f-notes" style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;height:60px;resize:vertical">'+( client.notes||'')+'</textarea></div>'
        +'</div>'
        +'<div style="display:flex;gap:8px;margin-top:8px">'
        +'<button onclick="CRMSmart._saveEditModal('+i+')" style="flex:1;padding:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva Modifiche</button>'
        +'<button onclick="document.getElementById(\'crm-add-modal\').remove()" style="padding:10px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:13px;color:var(--text-muted)">Annulla</button>'
        +'</div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click',function(e){ if(e.target===modal) modal.remove(); });
      setTimeout(function(){ document.getElementById('crm-f-name')?.focus(); },100);
    };

    CRMSmart._saveEditModal = function(i){
      var name = document.getElementById('crm-f-name')?.value?.trim();
      if(!name){ alert('Il nome è obbligatorio!'); return; }
      var data = this._load();
      var old = data[i]||{};
      data[i] = Object.assign({}, old, {
        name, company: document.getElementById('crm-f-company')?.value?.trim()||'',
        phone: document.getElementById('crm-f-phone')?.value?.trim()||'',
        email: document.getElementById('crm-f-email')?.value?.trim()||'',
        notes: document.getElementById('crm-f-notes')?.value?.trim()||'',
      });
      this._save(data);
      document.getElementById('crm-add-modal')?.remove();
      this.render();
      if(typeof toast!=='undefined') toast('✅ '+name+' aggiornato','success');
    };

    console.log('[CRM v26] Selezione multipla + Export VCF/CSV attivato');
  }
  setTimeout(_p, 1500);
})();

