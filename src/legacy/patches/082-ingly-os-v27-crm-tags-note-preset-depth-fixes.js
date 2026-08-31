
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v27 — CRM Tags + Note preset + Depth fixes
// ═══════════════════════════════════════════════════════════════════

// ─── CRM Tag + Note preset system ────────────────────────────────
(function _crmTagsPatch(){
  function _p(){
    if(typeof CRMSmart==='undefined'||!CRMSmart._v26){ setTimeout(_p,600); return; }
    if(CRMSmart._v27) return; CRMSmart._v27=true;

    // Pre-set tags with colors
    CRMSmart.PRESET_TAGS=[
      {label:'B2B',         color:'#6366f1'},
      {label:'B2C',         color:'#8b5cf6'},
      {label:'Hotel',       color:'#0ea5e9'},
      {label:'Ristorante',  color:'#f59e0b'},
      {label:'Negozio',     color:'#10b981'},
      {label:'Azienda',     color:'#3b82f6'},
      {label:'VIP',         color:'#f97316'},
      {label:'Privato',     color:'#ec4899'},
      {label:'Wedding',     color:'#e879f9'},
      {label:'Sport',       color:'#22c55e'},
      {label:'Scuola',      color:'#84cc16'},
      {label:'Comune/PA',   color:'#64748b'},
      {label:'Fornitore',   color:'#ef4444'},
      {label:'Lead',        color:'#fbbf24'},
      {label:'Cliente Fisso',color:'#10b981'},
    ];

    // Pre-set note preferences
    CRMSmart.PRESET_NOTES=[
      'Portachiavi personalizzati',
      'Tazze sublimazione',
      'T-shirt DTF',
      'Targhette aziendali',
      'Bomboniere',
      'Gadget aziendali',
      'Medaglie / Trofei',
      'Taglieri bambù',
      'Penne personalizzate',
      'Budget alto',
      'Budget medio',
      'Ordini ricorrenti',
      'Spedizione necessaria',
      'Ritiro in loco',
      'Pagamento anticipato',
      'Pagamento 30gg',
    ];

    // Build the tag chips HTML
    CRMSmart._buildTagChips = function(selectedTags){
      var selected = selectedTags ? selectedTags.split(',').map(function(t){ return t.trim(); }) : [];
      return this.PRESET_TAGS.map(function(t){
        var isOn = selected.indexOf(t.label)>-1;
        return '<button type="button" class="crm-tag-chip" data-tag="'+t.label+'" '
          +'onclick="CRMSmart._toggleTagChip(this,\''+t.label+'\')" '
          +'style="padding:4px 10px;border-radius:20px;cursor:pointer;font-size:11px;font-weight:700;transition:.15s;'
          +'background:'+(isOn?t.color+'25':' var(--bg-card)')+';'
          +'color:'+(isOn?t.color:'var(--text-muted)')+';'
          +'border:1.5px solid '+(isOn?t.color:' var(--border)')+'">'
          +t.label+'</button>';
      }).join('')
      +'<input id="crm-tag-custom" placeholder="+ Aggiungi tag..." '
      +'onkeydown="if(event.key===\'Enter\'||event.key===\',\'){event.preventDefault();CRMSmart._addCustomTag(this.value);this.value=\'\'}" '
      +'style="padding:4px 10px;border:1.5px dashed var(--border);border-radius:20px;background:transparent;color:var(--text);font-size:11px;width:120px;outline:none">';
    };

    CRMSmart._toggleTagChip = function(btn, tag){
      var selected = CRMSmart._getSelectedTags();
      var idx = selected.indexOf(tag);
      if(idx>-1) selected.splice(idx,1);
      else selected.push(tag);
      CRMSmart._setSelectedTags(selected);
      // Update button style
      var preset = CRMSmart.PRESET_TAGS.find(function(t){ return t.label===tag; });
      var color = preset?preset.color:'#6366f1';
      var isOn = idx<0;
      btn.style.background = isOn?color+'25':'var(--bg-card)';
      btn.style.color = isOn?color:'var(--text-muted)';
      btn.style.borderColor = isOn?color:'var(--border)';
      // Update hidden input
      var hidden = document.getElementById('crm-tags-value');
      if(hidden) hidden.value = selected.join(', ');
    };

    CRMSmart._addCustomTag = function(val){
      val = val.trim().replace(/,/g,'');
      if(!val) return;
      var selected = CRMSmart._getSelectedTags();
      if(selected.indexOf(val)<0){
        selected.push(val);
        CRMSmart._setSelectedTags(selected);
        // Add chip dynamically
        var container = document.getElementById('crm-tags-container');
        if(container){
          var btn = document.createElement('button');
          btn.type='button'; btn.className='crm-tag-chip'; btn.setAttribute('data-tag',val);
          btn.style.cssText='padding:4px 10px;border-radius:20px;cursor:pointer;font-size:11px;font-weight:700;transition:.15s;background:#6366f125;color:#818cf8;border:1.5px solid #6366f1';
          btn.textContent=val;
          btn.onclick=function(){ CRMSmart._toggleTagChip(btn,val); };
          var inp = document.getElementById('crm-tag-custom');
          if(inp) container.insertBefore(btn, inp);
        }
        var hidden = document.getElementById('crm-tags-value');
        if(hidden) hidden.value = selected.join(', ');
      }
    };

    CRMSmart._getSelectedTags = function(){
      var hidden = document.getElementById('crm-tags-value');
      if(!hidden||!hidden.value.trim()) return [];
      return hidden.value.split(',').map(function(t){ return t.trim(); }).filter(Boolean);
    };
    CRMSmart._setSelectedTags = function(arr){
      var hidden = document.getElementById('crm-tags-value');
      if(hidden) hidden.value = arr.join(', ');
    };

    // Build note chips
    CRMSmart._buildNoteChips = function(currentNotes){
      return '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">'
        +CRMSmart.PRESET_NOTES.map(function(n){
          var isOn = currentNotes && currentNotes.includes(n);
          return '<button type="button" onclick="CRMSmart._toggleNoteChip(this,\''+n+'\')" '
            +'style="padding:3px 9px;border-radius:15px;cursor:pointer;font-size:10px;transition:.15s;'
            +'background:'+(isOn?'rgba(16,185,129,.2)':'var(--bg-card)')+';'
            +'color:'+(isOn?'#10b981':'var(--text-muted)')+';'
            +'border:1px solid '+(isOn?'#10b981':'var(--border)')+'">'
            +n+'</button>';
        }).join('')
        +'</div>';
    };

    CRMSmart._toggleNoteChip = function(btn, note){
      var ta = document.getElementById('crm-f-notes');
      if(!ta) return;
      var notes = ta.value;
      if(notes.includes(note)){
        ta.value = notes.replace(note+' · ','').replace(' · '+note,'').replace(note,'').trim();
        btn.style.background='var(--bg-card)'; btn.style.color='var(--text-muted)'; btn.style.borderColor='var(--border)';
      } else {
        ta.value = (notes.trim()?(notes.trim()+' · '):'')+note;
        btn.style.background='rgba(16,185,129,.2)'; btn.style.color='#10b981'; btn.style.borderColor='#10b981';
      }
    };

    // ── Override _addClient with tags + note chips ────────────────
    CRMSmart._addClient = function(){
      var old = document.getElementById('crm-add-modal'); if(old) old.remove();
      var modal = document.createElement('div');
      modal.id='crm-add-modal';
      modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)';

      var tagChips = this._buildTagChips('');
      var noteChips = this._buildNoteChips('');

      modal.innerHTML=
        '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:520px;max-width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.5)">'
        +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">'
        +'<span style="font-size:24px">👤</span>'
        +'<div><div style="font-size:16px;font-weight:900;color:var(--text)">Aggiungi Cliente</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">Inserisci dati e categorizza il contatto</div></div>'
        +'<button onclick="document.getElementById(\'crm-add-modal\').remove()" style="margin-left:auto;background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:20px;line-height:1">✕</button>'
        +'</div>'
        +'<div style="display:grid;gap:14px">'
        // Row 1: Nome + Azienda
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">Nome *</label>'
        +'<input id="crm-f-name" placeholder="Mario Rossi" autofocus style="width:100%;padding:10px 12px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">Azienda</label>'
        +'<input id="crm-f-company" placeholder="Ristorante Belvedere" style="width:100%;padding:10px 12px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'</div>'
        // Row 2: Tel + Email
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">📱 Telefono</label>'
        +'<input id="crm-f-phone" placeholder="+39 333 000 0000" type="tel" style="width:100%;padding:10px 12px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">✉️ Email</label>'
        +'<input id="crm-f-email" placeholder="mario@email.com" type="email" style="width:100%;padding:10px 12px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'</div>'
        // Tags
        +'<div>'
        +'<label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:6px">🏷️ Tag / Categoria <span style="color:#64748b;text-transform:none;font-weight:400">(clicca per selezionare)</span></label>'
        +'<input type="hidden" id="crm-tags-value">'
        +'<div id="crm-tags-container" style="display:flex;gap:5px;flex-wrap:wrap;padding:10px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:10px;min-height:40px">'
        +tagChips
        +'</div></div>'
        // Note chips + textarea
        +'<div>'
        +'<label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:6px">📝 Note / Preferenze <span style="color:#64748b;text-transform:none;font-weight:400">(clicca per aggiungere)</span></label>'
        +noteChips
        +'<textarea id="crm-f-notes" placeholder="Note libere o clicca i suggerimenti sopra..." '
        +'style="width:100%;padding:10px 12px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;height:64px;resize:vertical"></textarea>'
        +'</div>'
        +'</div>'
        // Buttons
        +'<div style="display:flex;gap:8px;margin-top:16px">'
        +'<button onclick="CRMSmart._saveNewClientModal()" style="flex:1;padding:11px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">✅ Salva Cliente</button>'
        +'<button onclick="document.getElementById(\'crm-add-modal\').remove()" style="padding:11px 18px;background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px">Annulla</button>'
        +'</div>'
        +'<div id="crm-save-err" style="font-size:11px;color:#ef4444;min-height:14px;margin-top:6px"></div>'
        +'</div>';
      document.body.appendChild(modal);
      modal.addEventListener('click',function(e){ if(e.target===modal) modal.remove(); });
      setTimeout(function(){ document.getElementById('crm-f-name')?.focus(); },100);
      modal.addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.shiftKey&&e.target.tagName!=='TEXTAREA'&&e.target.tagName!=='INPUT'||e.target.id==='crm-f-email') CRMSmart._saveNewClientModal(); });
    };

    // ── Patch _saveNewClientModal to include tags ─────────────────
    CRMSmart._saveNewClientModal = function(){
      var name = document.getElementById('crm-f-name')?.value?.trim();
      if(!name){ var err=document.getElementById('crm-save-err'); if(err) err.textContent='⚠️ Il nome è obbligatorio.'; document.getElementById('crm-f-name')?.focus(); return; }
      var tags = document.getElementById('crm-tags-value')?.value?.trim()||'';
      var notes = document.getElementById('crm-f-notes')?.value?.trim()||'';
      // Merge tags into notes prefix if tags exist
      var fullNotes = tags ? ('['+tags+']'+(notes?' · '+notes:'')) : notes;
      var data = this._load();
      data.push({
        name,
        company: document.getElementById('crm-f-company')?.value?.trim()||'',
        phone:   document.getElementById('crm-f-phone')?.value?.trim()||'',
        email:   document.getElementById('crm-f-email')?.value?.trim()||'',
        tags:    tags,
        notes:   notes,
        _notes_display: fullNotes,
        added:   new Date().toISOString()
      });
      this._save(data);
      document.getElementById('crm-add-modal')?.remove();
      this.render();
      if(typeof toast!=='undefined') toast('✅ '+name+' aggiunto!','success');
    };

    // ── Patch _editClient to include tags + note chips ────────────
    var _origEdit = CRMSmart._editClient.bind(CRMSmart);
    CRMSmart._editClient = function(i){
      var data = this._load(); var client = data[i]; if(!client) return;
      var old = document.getElementById('crm-add-modal'); if(old) old.remove();
      var existingTags = client.tags||'';
      var existingNotes = client.notes||client._notes_display||'';
      // Strip [tags] prefix from notes if stored that way
      var notesClean = existingNotes.replace(/^\[[^\]]*\]\s*·?\s*/,'');
      var tagChips = this._buildTagChips(existingTags);
      var noteChips = this._buildNoteChips(notesClean);

      var modal = document.createElement('div');
      modal.id='crm-add-modal';
      modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)';
      modal.innerHTML=
        '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:520px;max-width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.5)">'
        +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">'
        +'<span style="font-size:22px">✏️</span>'
        +'<div><div style="font-size:16px;font-weight:900;color:var(--text)">Modifica Cliente</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">'+client.name+'</div></div>'
        +'<button onclick="document.getElementById(\'crm-add-modal\').remove()" style="margin-left:auto;background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:20px">✕</button>'
        +'</div>'
        +'<div style="display:grid;gap:12px">'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">Nome *</label>'
        +'<input id="crm-f-name" value="'+client.name+'" style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">Azienda</label>'
        +'<input id="crm-f-company" value="'+(client.company||'')+'" style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">📱 Telefono</label>'
        +'<input id="crm-f-phone" value="'+(client.phone||'')+'" type="tel" style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">✉️ Email</label>'
        +'<input id="crm-f-email" value="'+(client.email||'')+'" type="email" style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'</div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:6px">🏷️ Tag / Categoria</label>'
        +'<input type="hidden" id="crm-tags-value" value="'+existingTags+'">'
        +'<div id="crm-tags-container" style="display:flex;gap:5px;flex-wrap:wrap;padding:10px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:10px;min-height:40px">'+tagChips+'</div></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:6px">📝 Note / Preferenze</label>'
        +noteChips
        +'<textarea id="crm-f-notes" style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;height:64px;resize:vertical">'+notesClean+'</textarea></div>'
        +'</div>'
        +'<div style="display:flex;gap:8px;margin-top:14px">'
        +'<button onclick="CRMSmart._saveEditModal('+i+')" style="flex:1;padding:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva</button>'
        +'<button onclick="document.getElementById(\'crm-add-modal\').remove()" style="padding:10px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:13px;color:var(--text-muted)">Annulla</button>'
        +'</div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click',function(e){ if(e.target===modal) modal.remove(); });
      setTimeout(function(){ document.getElementById('crm-f-name')?.focus(); },100);
    };

    CRMSmart._saveEditModal = function(i){
      var name = document.getElementById('crm-f-name')?.value?.trim();
      if(!name){ alert('Il nome è obbligatorio!'); return; }
      var data = this._load(); var old = data[i]||{};
      var tags  = document.getElementById('crm-tags-value')?.value?.trim()||'';
      var notes = document.getElementById('crm-f-notes')?.value?.trim()||'';
      data[i] = Object.assign({},old,{name, company:document.getElementById('crm-f-company')?.value?.trim()||'', phone:document.getElementById('crm-f-phone')?.value?.trim()||'', email:document.getElementById('crm-f-email')?.value?.trim()||'', tags, notes});
      this._save(data); document.getElementById('crm-add-modal')?.remove(); this.render();
      if(typeof toast!=='undefined') toast('✅ '+name+' aggiornato','success');
    };

    /* CRM-05 — ritirati i due innesti sui tag.
       Qui c'erano un `_buildHTML` che chiamava l'originale e ne restituiva il
       risultato senza toccarlo (una copia inutile, ma pur sempre un secondo
       proprietario del markup) e un `render` che 200 ms dopo cercava
       `#crm-row-<indice>` per appendere i chip nella cella del nome.
       Da CRM-04 le righe hanno `id="crm-row-<id del cliente>"`: il selettore
       non trovava più niente e i tag avevano semplicemente smesso di
       comparire — senza errori, senza avvisi. È il difetto tipico di due
       funzioni che disegnano la stessa riga: una cambia identificatore e
       l'altra non lo sa.
       Adesso i tag li disegna `InglyClienteRiga`, dentro la cella del nome,
       nella stessa chiamata che costruisce la riga. I preset dei colori
       restano qui, dove sono definiti, e vengono passati al renderer. */

    console.log('[CRM v27] Tag chips + Note presets attivati');
  }
  setTimeout(_p,1800);
})();

console.log('[INGLY v27] CRM tags + ZIP fix loaded');

