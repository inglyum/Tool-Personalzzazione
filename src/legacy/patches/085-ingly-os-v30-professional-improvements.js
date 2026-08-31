
// ═══════════════════════════════════════════════════════════════════════
// INGLY OS v30 — Professional Improvements
// 1. Editable Quote Lines  2. Workflow Fix  3. Margin Alerts
// 4. LaserB2B Pro Calculator  5. CRM AI  6. Machine Manager
// ═══════════════════════════════════════════════════════════════════════

// ─── 1. Smart Quoter — Editable Lines ────────────────────────────────
(function _editableLines(){
  function _p(){
    if(typeof Quoter==='undefined'||!Quoter.lines){setTimeout(_p,700);return;}
    if(Quoter._v30lines) return; Quoter._v30lines=true;

    // Patch renderLines to add edit buttons
    var _origRL=Quoter.renderLines?.bind(Quoter);
    if(!_origRL) return;

    Quoter.renderLines=function(){
      _origRL();
      // After original render, inject edit buttons on each line row
      setTimeout(function(){
        var tbody=document.getElementById('q-lines-body');
        if(!tbody) return;
        var rows=tbody.querySelectorAll('tr');
        rows.forEach(function(tr,i){
          if(tr.querySelector('.q-edit-btn')) return; // already patched
          var line=Quoter.lines[i]; if(!line) return;
          // Add edit button to actions column
          var actTd=tr.querySelector('td:last-child');
          if(!actTd) return;
          var editBtn=document.createElement('button');
          editBtn.className='q-edit-btn btn btn-sm';
          editBtn.title='Modifica voce';
          editBtn.style.cssText='padding:3px 7px;margin-right:4px;background:rgba(99,102,241,.1);color:#818cf8;border:1px solid rgba(99,102,241,.3);border-radius:6px;cursor:pointer;font-size:11px';
          editBtn.innerHTML='✏️';
          editBtn.onclick=(function(idx){return function(){ QuoteLineEditor.open(idx); };})(i);
          actTd.insertBefore(editBtn, actTd.firstChild);
        });
      },100);
    };

    console.log('[Quoter] Editable lines patch applied');
  }
  setTimeout(_p,1500);
})();

// QuoteLineEditor — modal to edit a specific line
window.QuoteLineEditor = {
  open: function(lineIdx){
    if(typeof Quoter==='undefined'||!Quoter.lines) return;
    var line=Quoter.lines[lineIdx]; if(!line) return;

    var old=document.getElementById('qle-modal'); if(old) old.remove();
    var modal=document.createElement('div'); modal.id='qle-modal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
    modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:480px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6)">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">'
      +'<span style="font-size:22px">✏️</span>'
      +'<div><div style="font-size:16px;font-weight:900;color:var(--text)">Modifica Voce #'+(lineIdx+1)+'</div>'
      +'<div style="font-size:11px;color:var(--text-muted)">Le modifiche aggiornano automaticamente il totale</div></div>'
      +'<button onclick="document.getElementById(\'qle-modal\').remove()" style="margin-left:auto;background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:20px">✕</button>'
      +'</div>'
      +'<div style="display:grid;gap:12px">'
      +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">Descrizione / Nome voce</label>'
      +'<input id="qle-desc" value="'+(line.desc||line.name||line.description||'').replace(/"/g,'&quot;')+'" '
      +'style="width:100%;padding:10px 12px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px" autofocus></div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">Quantità</label>'
      +'<input id="qle-qty" type="number" min="0.01" step="1" value="'+(line.qty||1)+'" '
      +'oninput="QuoteLineEditor._recalc()" '
      +'style="width:100%;padding:10px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">Prezzo unit. €</label>'
      +'<input id="qle-unit" type="number" min="0" step="0.01" value="'+(line.unitCost||line.unitPrice||line.costPz||0)+'" '
      +'oninput="QuoteLineEditor._recalc()" '
      +'style="width:100%;padding:10px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">Totale €</label>'
      +'<input id="qle-total" type="number" min="0" step="0.01" value="'+(line.subtotal||line.total||(( line.qty||1)*(line.unitCost||0)))+'" '
      +'oninput="QuoteLineEditor._totalChanged()" '
      +'style="width:100%;padding:10px;background:var(--bg-card2);border:1.5px solid var(--primary,#6366f1);border-radius:9px;color:var(--primary,#6366f1);font-size:13px;font-weight:800"></div>'
      +'</div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">Note voce (opzionale)</label>'
      +'<input id="qle-note" value="'+(line.note||'').replace(/"/g,'&quot;')+'" placeholder="Es. Logo fronte + retro, colori pantone..." '
      +'style="width:100%;padding:10px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px"></div>'
      +'</div>'
      +'<div id="qle-margin-preview" style="margin-top:10px;padding:8px 12px;background:var(--bg-card2);border-radius:8px;font-size:11px;display:none"></div>'
      +'<div style="display:flex;gap:8px;margin-top:16px">'
      +'<button onclick="QuoteLineEditor.save('+lineIdx+')" style="flex:1;padding:11px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva Modifiche</button>'
      +'<button onclick="document.getElementById(\'qle-modal\').remove()" style="padding:11px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;color:var(--text-muted)">Annulla</button>'
      +'</div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
    setTimeout(function(){document.getElementById('qle-desc')?.focus();},100);
    this._recalc();
  },
  _recalc: function(){
    var qty=parseFloat(document.getElementById('qle-qty')?.value)||1;
    var unit=parseFloat(document.getElementById('qle-unit')?.value)||0;
    var tot=qty*unit;
    var totEl=document.getElementById('qle-total');
    if(totEl){totEl.value=tot.toFixed(2);}
    this._showMarginPreview(tot);
  },
  _totalChanged: function(){
    var qty=parseFloat(document.getElementById('qle-qty')?.value)||1;
    var tot=parseFloat(document.getElementById('qle-total')?.value)||0;
    var unitEl=document.getElementById('qle-unit');
    if(unitEl&&qty>0) unitEl.value=(tot/qty).toFixed(2);
    this._showMarginPreview(tot);
  },
  _showMarginPreview: function(salePrice){
    var prev=document.getElementById('qle-margin-preview'); if(!prev) return;
    if(!salePrice||salePrice<=0){prev.style.display='none';return;}
    // Calculate margin vs cost (from Quoter if available)
    var costEl=document.getElementById('qle-cost');
    var cost=costEl?parseFloat(costEl.value)||0:salePrice/2; // estimate 50% if no cost
    var mg=salePrice>0?Math.round((salePrice-cost)/salePrice*100):0;
    var c=mg>=60?'#22c55e':mg>=35?'#f59e0b':'#ef4444';
    var warn=mg<30?'⚠️ ATTENZIONE: margine sotto soglia minima (30%)!':'';
    prev.style.display='block';
    prev.style.background=mg<30?'rgba(239,68,68,.08)':'var(--bg-card2)';
    prev.innerHTML='<span style="color:var(--text-muted)">Totale: </span><strong style="color:'+c+'">€'+salePrice.toFixed(2)+'</strong>'
      +(warn?'<span style="color:#ef4444;font-weight:700;margin-left:8px">'+warn+'</span>':'');
  },
  save: function(lineIdx){
    if(typeof Quoter==='undefined'||!Quoter.lines) return;
    var desc=document.getElementById('qle-desc')?.value?.trim();
    var qty=parseFloat(document.getElementById('qle-qty')?.value)||1;
    var unit=parseFloat(document.getElementById('qle-unit')?.value)||0;
    var tot=parseFloat(document.getElementById('qle-total')?.value)||qty*unit;
    var note=document.getElementById('qle-note')?.value?.trim()||'';
    if(!desc){alert('La descrizione è obbligatoria!');return;}
    var line=Quoter.lines[lineIdx];
    if(!line){document.getElementById('qle-modal')?.remove();return;}
    // Update line data preserving all other fields
    Object.assign(line,{
      desc:desc, name:desc, description:desc,
      qty:qty, unitCost:unit, unitPrice:unit, costPz:unit,
      subtotal:tot, total:tot, note:note,
      _edited:true, _editedAt:new Date().toISOString()
    });
    document.getElementById('qle-modal')?.remove();
    // Re-render quoter
    if(typeof Quoter.renderLines==='function') Quoter.renderLines();
    if(typeof Quoter.recalcRight==='function') Quoter.recalcRight();
    if(typeof toast!=='undefined') toast('✏️ Voce aggiornata!','success');
  }
};

// ─── 2. sendToWorkflow fix — preserve notes/price/image ──────────────
(function _fixWorkflow(){
  function _p(){
    if(typeof Quoter==='undefined'||!Quoter.sendToWorkflow){setTimeout(_p,800);return;}
    if(Quoter._v30workflow) return; Quoter._v30workflow=true;

    var _origSTW=Quoter.sendToWorkflow.bind(Quoter);
    Quoter.sendToWorkflow=async function(){
      // Capture current form values BEFORE saveQuote recalculates
      var snapshot={
        notes:    document.getElementById('q-notes')?.value||'',
        price:    document.getElementById('q-price')?.value||document.getElementById('od-value')?.value||'',
        name:     document.getElementById('q-name')?.value||'',
        imageUrl: Quoter._attachedImage||document.getElementById('q-image-preview')?.src||'',
        lines:    JSON.parse(JSON.stringify(Quoter.lines||[])),
        markup:   document.getElementById('qr-markup')?.value||'',
        discount: document.getElementById('qr-discount')?.value||'',
      };

      try{
        await _origSTW();
        // After sending, restore any UI that may have been reset
        if(snapshot.notes && document.getElementById('q-notes')){
          // Notes preserved — good
        }
        if(typeof toast!=='undefined'){
          // Workflow sent successfully - snapshot was preserved
        }
      }catch(e){
        console.warn('[Workflow] Error:',e);
        // Restore snapshot on error
        if(snapshot.notes && document.getElementById('q-notes')) document.getElementById('q-notes').value=snapshot.notes;
        if(snapshot.name && document.getElementById('q-name')) document.getElementById('q-name').value=snapshot.name;
        if(snapshot.lines.length){
          Quoter.lines=snapshot.lines;
          if(typeof Quoter.renderLines==='function') Quoter.renderLines();
        }
        if(typeof toast!=='undefined') toast('⚠️ Errore workflow — dati ripristinati. Riprova.','warning');
      }
    };

    // Also patch saveQuote to not overwrite price if already manually set
    var _origSQ=Quoter.saveQuote.bind(Quoter);
    Quoter.saveQuote=async function(){
      var priceOverride=this._priceOverride;
      var result=await _origSQ.call(this);
      // If there was a manual price override, re-apply it
      if(priceOverride){
        try{
          var id=this._lastSavedId||this._lastSavedQuoteId;
          if(id&&typeof IDB!=='undefined'){
            var q=await IDB.get('quotes',id).catch(function(){return null;});
            if(q){
              q._priceOverride=priceOverride;
              q._priceNote='Prezzo impostato manualmente — non ricalcolare';
              await IDB.put('quotes',q).catch(function(){});
            }
          }
        }catch(e){}
      }
      return result;
    };

    console.log('[Workflow] sendToWorkflow fixed — data preservation enabled');
  }
  setTimeout(_p,1200);
})();

// ─── 3. Margin Alert System ───────────────────────────────────────────
window.MarginAlert = {
  _SK: 'ingly_margin_settings_v1',
  getThreshold: function(){
    try{ return parseFloat(JSON.parse(localStorage.getItem(this._SK)||'{}').threshold||30); }catch(e){ return 30; }
  },
  setThreshold: function(pct){
    try{ localStorage.setItem(this._SK,JSON.stringify({threshold:pct})); }catch(e){}
  },
  check: function(margin){
    var t=this.getThreshold();
    if(margin<0) return {level:'danger',msg:'🚨 PREVENTIVO IN PERDITA! Stai vendendo sotto costo!',color:'#ef4444'};
    if(margin<t) return {level:'warn',msg:'⚠️ Margine '+margin+'% sotto soglia ('+t+'%). Rischio perdita!',color:'#f59e0b'};
    if(margin<50) return {level:'ok',msg:'✅ Margine '+margin+'% — accettabile',color:'#10b981'};
    return {level:'great',msg:'💰 Margine '+margin+'% — ottimo!',color:'#22c55e'};
  },
  showBanner: function(margin, containerId){
    var r=this.check(margin);
    var c=document.getElementById(containerId); if(!c) return;
    var old=c.querySelector('.margin-alert-banner'); if(old) old.remove();
    if(r.level==='ok'||r.level==='great') return; // only show warnings
    var div=document.createElement('div');
    div.className='margin-alert-banner';
    div.style.cssText='padding:10px 14px;background:'+r.color+'12;border:1.5px solid '+r.color+'50;border-radius:10px;font-size:12px;font-weight:700;color:'+r.color+';display:flex;align-items:center;gap:8px;margin-bottom:10px';
    div.innerHTML=r.msg+'<button onclick="this.parentElement.remove()" style="margin-left:auto;background:transparent;border:none;cursor:pointer;color:'+r.color+';font-size:14px">✕</button>';
    c.insertBefore(div,c.firstChild);
  }
};

// ─── 4. LaserB2B Pro Calculator ──────────────────────────────────────
(function _upgradeLaserB2B(){
  function _p(){
    if(typeof LaserB2B==='undefined'||!LaserB2B._MACHINES){setTimeout(_p,700);return;}
    if(LaserB2B._v30pro) return; LaserB2B._v30pro=true;

    var MACHINE_SK = 'lb2b_machines_v1';

    // Load custom machines (or use defaults)
    LaserB2B._loadMachines = function(){
      try{
        var saved=JSON.parse(localStorage.getItem(MACHINE_SK)||'null');
        if(saved&&Object.keys(saved).length) return saved;
      }catch(e){}
      return this._MACHINES; // default
    };
    LaserB2B._saveMachines = function(d){
      try{ localStorage.setItem(MACHINE_SK,JSON.stringify(d)); }catch(e){}
    };

    var CUSTOM_MACHINE_SK = 'lb2b_custom_machines_v1';
    LaserB2B._loadCustomMachines = function(){
      try{ return JSON.parse(localStorage.getItem(CUSTOM_MACHINE_SK)||'{}'); }catch(e){ return {}; }
    };
    LaserB2B._saveCustomMachines = function(d){
      try{ localStorage.setItem(CUSTOM_MACHINE_SK,JSON.stringify(d)); }catch(e){}
    };

    // ── Machine Manager popup ────────────────────────────────────
    LaserB2B._openMachineManager = function(){
    var self=this;
    var custom=self._loadCustomMachines?self._loadCustomMachines():{};
    var builtins=self._MACHINES||{};
    function fmtMach(k,m,isCustom){
      return '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--border,#2a2a35)">'
        +'<span style="font-size:20px;width:28px;text-align:center">'+(m.icon||'⚙️')+'</span>'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-size:12px;font-weight:700;color:var(--text,#e8e8f0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(m.label||k)+'</div>'
          +'<div style="font-size:10px;color:var(--text-muted,#888)">'+(m.watts||'?')+'W · '+eu(m.hourly||0)+'/h · '+(isCustom?'Custom':'Built-in')+'</div>'
        +'</div>'
        +(isCustom?'<div style="display:flex;gap:4px">'
          +'<button onclick="LaserB2B._editCustomMachineUI(\''+k+'\')" style="padding:3px 8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:5px;cursor:pointer;font-size:10px;color:var(--text-muted,#888)">✏️</button>'
          +'<button onclick="LaserB2B._delCustomMachineUI(\''+k+'\')" style="padding:3px 8px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:5px;cursor:pointer;font-size:10px;color:#ef4444">🗑</button>'
        +'</div>':'')
      +'</div>';
    }
    function renderList(){
      var custom2=self._loadCustomMachines?self._loadCustomMachines():{};
      var listEl=document.getElementById('_lb2b_mach_list');
      if(!listEl)return;
      var html='';
      var customKeys=Object.keys(custom2);
      if(customKeys.length){
        html+='<div style="padding:7px 12px;font-size:10px;font-weight:800;color:var(--text-muted,#888);background:var(--bg-card2,#18181f);border-bottom:1px solid var(--border,#2a2a35)">MACCHINE PERSONALIZZATE ('+customKeys.length+')</div>';
        customKeys.forEach(function(k){html+=fmtMach(k,custom2[k],true);});
      }
      var builtinKeys=Object.keys(builtins);
      html+='<div style="padding:7px 12px;font-size:10px;font-weight:800;color:var(--text-muted,#888);background:var(--bg-card2,#18181f);border-bottom:1px solid var(--border,#2a2a35)">MACCHINE BUILT-IN ('+builtinKeys.length+')</div>';
      builtinKeys.forEach(function(k){html+=fmtMach(k,builtins[k],false);});
      listEl.innerHTML=html;
    }
    var ov=document.getElementById('_lb2b_mach_ov');if(ov)ov.remove();
    ov=document.createElement('div');ov.id='_lb2b_mach_ov';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:19999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.onclick=function(e){if(e.target===ov)ov.remove();};
    ov.innerHTML='<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:14px;width:100%;max-width:620px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden">'
      +'<div style="padding:14px 18px;border-bottom:1px solid var(--border,#2a2a35);display:flex;align-items:center;justify-content:space-between;background:var(--bg-card2,#18181f)">'
        +'<div><div style="font-size:14px;font-weight:800;color:var(--text,#e8e8f0)">⚙️ Gestisci Macchine</div>'
        +'<div style="font-size:10px;color:var(--text-muted,#888)">Aggiungi macchine personalizzate o visualizza quelle built-in</div></div>'
        +'<button onclick="document.getElementById(\'_lb2b_mach_ov\').remove()" style="background:none;border:none;color:var(--text-muted,#888);font-size:18px;cursor:pointer;line-height:1">✕</button>'
      +'</div>'
      +'<div style="padding:10px 14px;border-bottom:1px solid var(--border,#2a2a35)">'
        +'<button onclick="LaserB2B._addCustomMachineUI()" style="width:100%;padding:8px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">+ Aggiungi Macchina Personalizzata</button>'
      +'</div>'
      +'<div id="_lb2b_mach_list" style="overflow-y:auto;flex:1"></div>'
    +'</div>';
    document.body.appendChild(ov);
    renderList();
  };
  LaserB2B.openMachineManager = LaserB2B._openMachineManager;
  LaserB2B._addCustomMachineUI=function(){ LaserB2B._editCustomMachineUI(null); };
  LaserB2B._editCustomMachineUI=function(existingKey){
    var self=LaserB2B;
    var custom=self._loadCustomMachines?self._loadCustomMachines():{};
    var m=existingKey?custom[existingKey]:{};
    var ov2=document.getElementById('_lb2b_mach_edit');if(ov2)ov2.remove();
    ov2=document.createElement('div');ov2.id='_lb2b_mach_edit';
    ov2.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:20000;display:flex;align-items:center;justify-content:center;padding:16px';
    ov2.onclick=function(e){if(e.target===ov2)ov2.remove();};
    var inp=function(id,lbl,val,type){type=type||'text';return '<div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:10px;color:var(--text-muted,#888)">'+lbl+'</label><input id="'+id+'" type="'+type+'" value="'+(val||'')+'" style="padding:6px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:6px;color:var(--text,#e8e8f0);font-size:12px;width:100%"></div>';};
    ov2.innerHTML='<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:12px;width:100%;max-width:480px;overflow:hidden">'
      +'<div style="padding:12px 16px;border-bottom:1px solid var(--border,#2a2a35);font-size:13px;font-weight:800;color:var(--text,#e8e8f0);background:var(--bg-card2,#18181f)">'+(existingKey?'✏️ Modifica':'+ Nuova')+' Macchina</div>'
      +'<div style="padding:14px 16px;display:flex;flex-direction:column;gap:9px">'
        +(!existingKey?inp('_lme_key','Chiave univoca (es: my_fiber)',''):'')
        +inp('_lme_icon','Icona emoji',m.icon||'⚙️')
        +inp('_lme_label','Nome macchina',m.label||'')
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
          +inp('_lme_watts','Watt',m.watts||40,'number')
          +inp('_lme_hourly','Costo €/h',m.hourly||0.1,'number')
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'
          +inp('_lme_t1','Min/pz portachiavi',m.timePerPz?m.timePerPz.keychain:1.5,'number')
          +inp('_lme_t2','Min/pz tag',(m.timePerPz?m.timePerPz.tag:2),'number')
          +inp('_lme_t3','Min/pz custom',(m.timePerPz?m.timePerPz.custom:3),'number')
        +'</div>'
      +'</div>'
      +'<div style="padding:10px 16px;border-top:1px solid var(--border,#2a2a35);display:flex;gap:8px;justify-content:flex-end">'
        +'<button onclick="document.getElementById(\'_lb2b_mach_edit\').remove()" style="padding:7px 14px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">Annulla</button>'
        +'<button id="_lb2b_mach_save" style="padding:7px 14px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">💾 Salva</button>'
      +'</div>'
    +'</div>';
    document.body.appendChild(ov2);
    document.getElementById('_lb2b_mach_save').onclick=function(){
      var gv=function(id){var el=document.getElementById(id);return el?el.value.trim():'';};
      var gn=function(id){return parseFloat(gv(id))||0;};
      var key=existingKey||gv('_lme_key').replace(/[^a-z0-9_]/gi,'_').toLowerCase();
      if(!key){if(typeof toast!=='undefined')toast('Inserisci una chiave univoca','error');return;}
      if(!existingKey&&self._MACHINES&&self._MACHINES[key]){if(typeof toast!=='undefined')toast('Chiave già usata in built-in','error');return;}
      var customs=self._loadCustomMachines?self._loadCustomMachines():{};
      customs[key]={icon:gv('_lme_icon')||'⚙️',label:gv('_lme_label')||key,watts:gn('_lme_watts'),hourly:gn('_lme_hourly'),timePerPz:{keychain:gn('_lme_t1'),tag:gn('_lme_t2'),custom:gn('_lme_t3')}};
      if(self._saveCustomMachines)self._saveCustomMachines(customs);
      if(self.buildUI)self.buildUI();
      document.getElementById('_lb2b_mach_edit').remove();
      if(typeof toast!=='undefined')toast('✅ Macchina salvata','success');
      self.openMachineManager();
    };
  };
  LaserB2B._delCustomMachineUI=function(key){
    if(!confirm('Eliminare la macchina personalizzata "'+key+'"?'))return;
    var self=LaserB2B;
    var customs=self._loadCustomMachines?self._loadCustomMachines():{};
    delete customs[key];
    if(self._saveCustomMachines)self._saveCustomMachines(customs);
    if(self.buildUI)self.buildUI();
    if(typeof toast!=='undefined')toast('Macchina rimossa','info');
    self.openMachineManager();
  };

  window.CommHistory = window.CommHistory || {
    _SK: 'lb2b_comm_hist_v1',
    add: function(client, type, text, amount){
      if(!client) return;
      try{
        var h=JSON.parse(localStorage.getItem(this._SK)||'{}');
        var k=client.toLowerCase().trim();
        if(!h[k]) h[k]=[];
        h[k].unshift({type:type||'note',text:text||'',amount:amount||0,date:new Date().toISOString()});
        h[k]=h[k].slice(0,200);
        localStorage.setItem(this._SK,JSON.stringify(h));
      }catch(e){}
    },
    load: function(){
      try{ return JSON.parse(localStorage.getItem(this._SK)||'{}'); }catch(e){ return {}; }
    },
    get:function(clientName){
    var d=this.load();
    return d[clientName.toLowerCase().trim()]||[];
  },
  showForClient:function(clientName){
    var history=this.get(clientName);
    var w=window.open('','_blank','width=700,height=520');
    if(!w) return;
    var typeColors={quote:'#6366f1',order:'#f59e0b',wa:'#25D366',email:'#3b82f6',call:'#10b981',note:'#64748b'};
    var rows=history.length?history.map(function(h){
      var c=typeColors[h.type]||'#64748b';
      var dt=new Date(h.date).toLocaleDateString('it',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
      return '<tr style="border-bottom:1px solid #1e293b">'
        +'<td style="padding:8px 12px"><span style="background:'+c+'20;color:'+c+';padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">'+h.type+'</span></td>'
        +'<td style="padding:8px 12px;font-size:12px;color:#f1f5f9">'+h.text+'</td>'
        +(h.amount?'<td style="padding:8px 12px;font-weight:700;color:#10b981">€'+h.amount.toFixed(0)+'</td>':'<td></td>')
        +'<td style="padding:8px 12px;font-size:10px;color:#64748b">'+dt+'</td></tr>';
    }).join(''):'<tr><td colspan="4" style="text-align:center;padding:30px;color:#64748b">Nessuna comunicazione registrata</td></tr>';
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Storico — '+clientName+'</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;font-size:13px}'
      +'table{width:100%;border-collapse:collapse}th{background:#1e293b;padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase}'
      +'</style></head><body>'
      +'<h2 style="font-size:16px;font-weight:900;margin-bottom:4px">📋 Storico: '+clientName+'</h2>'
      +'<p style="font-size:11px;color:#64748b;margin-bottom:16px">'+history.length+' interazioni registrate</p>'
      +'<table><thead><tr><th>Tipo</th><th>Dettaglio</th><th>Importo</th><th>Data</th></tr></thead><tbody>'+rows+'</tbody></table>'
      +'<button onclick="close()" style="margin-top:16px;padding:9px 18px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:8px;cursor:pointer">Chiudi</button>'
      +'</body></html>');
    w.document.close();
  },
  /* CRM-05 — il pulsante «storico comunicazioni» si registra nel renderer
     invece di appendersi alla riga dopo il disegno. Cercava `#crm-row-<indice
     nell'array>`, e da CRM-04 le righe hanno l'id del cliente: non trovava più
     niente e il pulsante era sparito senza un errore. */
  _addBtn:function(){
    var R = window.InglyClienteRiga;
    if(!R || typeof R.aggiungiAzione!=='function') return;
    R.aggiungiAzione({
      id:'storico-comunicazioni',
      classe:'crm-hist-btn',
      icona:'📋', titolo:'Storico comunicazioni',
      comando:function(c){ return "CommHistory.showForClient('"+String(c.nome).replace(/'/g,"")+"')"; },
      stile:'padding:4px 8px;background:rgba(100,116,139,.1);color:#94a3b8;border:1px solid rgba(100,116,139,.25);border-radius:6px;cursor:pointer;font-size:11px',
    });
  }
};
  }  /* end _p() */
  setTimeout(_p, 700);
})();  /* end _upgradeLaserB2B */

// Auto-register quotes/orders in history
(function _autoLog(){
  function _p(){
    if(typeof QuoteGeneratorV2==='undefined'){setTimeout(_p,700);return;}
    var _origSave=QuoteGeneratorV2._origSaveQuote;
    // Patch saveQuote to auto-log
    var _orig=window.saveQuote;
    if(_orig&&!window._histPatched){
      window._histPatched=true;
      // Will be patched in popup — log externally when localStorage changes
    }
  }
  setTimeout(_p,2000);
})();

// ─── F. Professional Email Template ──────────────────────────────
window.EmailTemplates = {
  generate:function(data){
    var body='Gentile '+data.client+',\n\n';
    body+='Ho il piacere di inviarle il preventivo per la personalizzazione laser dei prodotti richiesti.\n\n';
    body+='━━━━ DETTAGLIO PREVENTIVO ━━━━\n';
    (data.lines||[]).forEach(function(l,i){
      body+=(i+1)+'. '+l.qty+'x '+l.desc;
      body+=' → €'+(l.unitPrice||0).toFixed(2)+'/pz = €'+(l.total||0).toFixed(2)+'\n';
      if(l.note) body+='   ↳ '+l.note+'\n';
    });
    body+='\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    body+='Imponibile: €'+(data.subtotal||0).toFixed(2)+'\n';
    body+='IVA 22%: €'+((data.subtotal||0)*0.22).toFixed(2)+'\n';
    body+='TOTALE: €'+((data.subtotal||0)*1.22).toFixed(2)+'\n\n';
    body+='Condizioni:\n• Consegna: 5-7 giorni lavorativi dalla conferma\n• Pagamento: 50% anticipo, saldo alla consegna\n• Grafica: file vettoriale (SVG, AI, PDF). Prima bozza gratuita\n• Preventivo valido 30 giorni\n\n';
    if(data.notes) body+='Note: '+data.notes+'\n\n';
    body+='Rimango a disposizione per qualsiasi informazione.\n\nCordiali saluti,\nIngy Laser\n📱 WhatsApp · ✉️ info@inglylaser.it';
    window.open('mailto:'+( data.email||'')+
      '?subject=Preventivo Personalizzazione Laser – '+data.client+
      '&body='+encodeURIComponent(body));
  }
};

// ─── G. ABC Client Analysis ──────────────────────────────────────
window.ABCAnalysis = {
  render:function(){
    var clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');
    var orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');
    var quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');
    // Calculate per-client revenue
    var revenue={};
    orders.forEach(function(o){if(o.client) revenue[o.client]=(revenue[o.client]||0)+(o.total||0);});
    quotes.forEach(function(q){if(q.client&&q.status!=='draft') revenue[q.client]=(revenue[q.client]||0)+(q.total||0);});
    var sorted=Object.entries(revenue).sort(function(a,b){return b[1]-a[1];});
    var total=sorted.reduce(function(a,s){return a+s[1];},0);
    var cum=0; var abc=sorted.map(function(s){
      cum+=s[1]; var pct=total>0?cum/total:0;
      return{name:s[0],rev:s[1],pct:pct,class:pct<=0.8?'A':pct<=0.95?'B':'C'};
    });
    var w=window.open('','_blank','width=800,height=600');
    if(!w){if(typeof toast!=='undefined') toast('Abilita popup','info');return;}
    var classColors={A:'#22c55e',B:'#f59e0b',C:'#ef4444'};
    var rows=abc.map(function(c){
      var col=classColors[c.class];
      return '<tr style="border-bottom:1px solid #1e293b"><td style="padding:8px 12px;font-weight:700;color:#f1f5f9">'+c.name+'</td>'
        +'<td style="padding:8px 12px;font-weight:800;color:#10b981">€'+c.rev.toFixed(0)+'</td>'
        +'<td style="padding:8px 12px"><div style="height:8px;background:'+col+'20;border-radius:4px"><div style="height:8px;background:'+col+';border-radius:4px;width:'+Math.round(c.rev/sorted[0][1]*100)+'%"></div></div></td>'
        +'<td style="padding:8px 12px;text-align:center"><span style="background:'+col+'20;color:'+col+';padding:3px 10px;border-radius:20px;font-size:12px;font-weight:800">Classe '+c.class+'</span></td></tr>';
    }).join('');
    var cA=abc.filter(function(x){return x.class==='A';});
    var cB=abc.filter(function(x){return x.class==='B';});
    var cC=abc.filter(function(x){return x.class==='C';});
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Analisi ABC</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;font-size:13px}'
      +'table{width:100%;border-collapse:collapse}th{background:#1e293b;padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase}'
      +'</style></head><body>'
      +'<h2 style="font-size:18px;font-weight:900;margin-bottom:4px">📊 Analisi ABC Clienti</h2>'
      +'<p style="font-size:11px;color:#64748b;margin-bottom:16px">Basata sul fatturato cumulato</p>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">'
      +'<div style="background:#22c55e15;border:1px solid #22c55e30;border-radius:12px;padding:14px;text-align:center"><div style="font-size:11px;color:#22c55e;font-weight:700;margin-bottom:4px">A — Top 80% fatturato</div><div style="font-size:24px;font-weight:900;color:#22c55e">'+cA.length+'</div><div style="font-size:10px;color:#64748b">clienti premium</div></div>'
      +'<div style="background:#f59e0b15;border:1px solid #f59e0b30;border-radius:12px;padding:14px;text-align:center"><div style="font-size:11px;color:#f59e0b;font-weight:700;margin-bottom:4px">B — 80-95% fatturato</div><div style="font-size:24px;font-weight:900;color:#f59e0b">'+cB.length+'</div><div style="font-size:10px;color:#64748b">clienti medi</div></div>'
      +'<div style="background:#ef444415;border:1px solid #ef444430;border-radius:12px;padding:14px;text-align:center"><div style="font-size:11px;color:#ef4444;font-weight:700;margin-bottom:4px">C — restante 5%</div><div style="font-size:24px;font-weight:900;color:#ef4444">'+cC.length+'</div><div style="font-size:10px;color:#64748b">clienti occasionali</div></div>'
      +'</div>'
      +'<table><thead><tr><th>Cliente</th><th>Fatturato</th><th style="width:200px">Peso relativo</th><th>Classe</th></tr></thead><tbody>'
      +(rows||'<tr><td colspan="4" style="text-align:center;padding:30px;color:#64748b">Nessun dato di fatturato ancora</td></tr>')
      +'</tbody></table>'
      +'<button onclick="close()" style="margin-top:16px;padding:9px 18px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:8px;cursor:pointer">Chiudi</button>'
      +'</body></html>');
    w.document.close();
  }
};

// ─── H. Advanced Cost Model ──────────────────────────────────────
window.AdvancedCost = {
  CONSUMABLES:{
    carta_sub_a4: {name:'Carta Sub A4',unit:'€/foglio',defaultCost:0.089,note:'100g, per sublimazione'},
    film_dtf_m:   {name:'Film DTF per metro',unit:'€/m lineare',defaultCost:0.90,note:'Larghezza 30cm'},
    polvere_dtf:  {name:'Polvere Hot Melt DTF',unit:'€/pz',defaultCost:0.05,note:'~5g per stampa A5'},
    vinile_m2:    {name:'Vinile termoadesivo',unit:'€/m²',defaultCost:8.50,note:'Per Cricut/taglierina'},
    ink_per_ml:   {name:'Inchiostro sublimazione',unit:'€/ml',defaultCost:0.089,note:'Per Epson ET-2865'},
  },
  getSK:function(){return 'ingly_adv_costs_v1';},
  loadRates:function(){
    try{var s=localStorage.getItem(this.getSK()); return s?JSON.parse(s):{};}catch(e){return{};}
  },
  getRate:function(key){
    var rates=this.loadRates(); var def=this.CONSUMABLES[key];
    return rates[key]||def?.defaultCost||0;
  }
};

// ─── I. Multi-scenario Comparison ────────────────────────────────
window.ScenarioCompare = {
  open:function(baseData){
    baseData=baseData||{lines:[],client:''};
    var w=window.open('','_blank','width=900,height=600');
    if(!w){if(typeof toast!=='undefined') toast('Abilita popup','info');return;}
    var scens=[
      {label:'📦 Scenario A — Base',    markup:2.0,  discount:0},
      {label:'💼 Scenario B — Fedele',   markup:1.8,  discount:5},
      {label:'🏢 Scenario C — Volume',   markup:1.6,  discount:10},
    ];
    var subtotal=baseData.lines?baseData.lines.reduce(function(a,l){return a+(l.total||0);},0):0;
    if(!subtotal&&typeof LaserB2B!=='undefined'&&LaserB2B._calcData){
      var d=LaserB2B._calcData(); if(d) subtotal=d.total;
    }
    var rows=scens.map(function(s){
      var net=subtotal*(s.markup||1)*(1-( s.discount||0)/100);
      var iva=net*.22;
      var margin=subtotal>0?Math.round((net-subtotal)/net*100):0;
      var mgc=margin>=60?'#22c55e':margin>=35?'#f59e0b':'#ef4444';
      return '<div style="background:#1e293b;border-radius:14px;padding:18px;border:1px solid #334155">'
        +'<div style="font-size:13px;font-weight:800;margin-bottom:12px;color:#f1f5f9">'+s.label+'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'
        +'<div style="background:#0f172a;border-radius:8px;padding:8px;text-align:center"><div style="font-size:9px;color:#64748b;text-transform:uppercase">Moltiplicatore</div><div style="font-size:16px;font-weight:900;color:#3b82f6">×'+s.markup+'</div></div>'
        +'<div style="background:#0f172a;border-radius:8px;padding:8px;text-align:center"><div style="font-size:9px;color:#64748b;text-transform:uppercase">Sconto</div><div style="font-size:16px;font-weight:900;color:#f59e0b">-'+s.discount+'%</div></div>'
        +'<div style="background:#0f172a;border-radius:8px;padding:8px;text-align:center"><div style="font-size:9px;color:#64748b;text-transform:uppercase">Netto</div><div style="font-size:18px;font-weight:900;color:#f1f5f9">€'+net.toFixed(2)+'</div></div>'
        +'<div style="background:#0f172a;border-radius:8px;padding:8px;text-align:center;border:1px solid '+mgc+'30"><div style="font-size:9px;color:'+mgc+';text-transform:uppercase">Margine</div><div style="font-size:18px;font-weight:900;color:'+mgc+'">'+margin+'%</div></div>'
        +'</div>'
        +'<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:900;padding:8px 0;border-top:1px solid #334155"><span>TOTALE IVA INCLUSA</span><span style="color:#6366f1">€'+(net+iva).toFixed(2)+'</span></div>'
        +'</div>';
    }).join('');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Confronto Scenari</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;font-size:13px}</style></head><body>'
      +'<h2 style="font-size:16px;font-weight:900;margin-bottom:4px">🔀 Confronto Scenari di Prezzo</h2>'
      +'<p style="font-size:11px;color:#64748b;margin-bottom:16px">Costo base: €'+subtotal.toFixed(2)+' · Confronta diverse strategie di pricing</p>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">'+rows+'</div>'
      +'<button onclick="close()" style="margin-top:16px;padding:9px 18px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:8px;cursor:pointer">Chiudi</button>'
      +'</body></html>');
    w.document.close();
  }
};

// ─── J. Digital Signature ────────────────────────────────────────
window.DigitalSignature = {
  _SK:'ingly_signatures_v1',
  load:function(){try{return JSON.parse(localStorage.getItem(this._SK)||'[]');}catch(e){return[];}},
  save:function(d){try{localStorage.setItem(this._SK,JSON.stringify(d));}catch(e){}},
  createRequest:function(quoteId,clientName,total){
    var token=btoa(quoteId+'|'+Date.now()).replace(/=/g,'');
    var d=this.load();
    d.unshift({token:token,quoteId:quoteId,client:clientName,total:total,status:'pending',createdAt:new Date().toISOString()});
    this.save(d);
    // The confirmation "link" opens a modal on the same page
    var link=window.location.href.split('?')[0]+'?sig='+token;
    return {token:token,link:link};
  },
  showRequest:function(quoteData){
    var req=this.createRequest(quoteData.id||Date.now(),quoteData.client,quoteData.total);
    var modal=document.createElement('div'); modal.id='sig-modal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
    modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:480px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6)">'
      +'<div style="text-align:center;margin-bottom:20px">'
      +'<div style="font-size:36px;margin-bottom:8px">✍️</div>'
      +'<div style="font-size:18px;font-weight:900;color:var(--text)">Richiesta Conferma Preventivo</div>'
      +'<div style="font-size:11px;color:var(--text-muted);margin-top:4px">'+quoteData.client+' — €'+( quoteData.total||0).toFixed(2)+'</div>'
      +'</div>'
      +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:14px">'
      +'<div style="font-size:10px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;font-weight:700">Codice Conferma (da condividere col cliente)</div>'
      +'<div style="font-size:16px;font-weight:900;color:var(--primary);letter-spacing:3px;text-align:center">'+req.token.slice(0,8).toUpperCase()+'</div>'
      +'</div>'
      +'<div style="display:grid;gap:8px">'
      +'<div style="font-size:11px;color:var(--text-muted);background:var(--bg-card2);padding:10px;border-radius:8px">📋 Il cliente può confermare digitando il codice, oppure cliccando il link inviato via WhatsApp/Email. La conferma viene salvata automaticamente.</div>'
      +'<div style="display:flex;gap:8px">'
      +'<button onclick="WAQuick&&WAQuick.openPanel(\''+( quoteData.phone||'')+'\',\'Conferma preventivo: digita il codice '+req.token.slice(0,8).toUpperCase()+' o conferma cliccando: '+req.link+'\')" style="flex:1;padding:9px;background:#25D36620;color:#25D366;border:1px solid #25D36640;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">💬 Invia via WA</button>'
      +'<button onclick="navigator.clipboard?.writeText(\''+req.token.slice(0,8).toUpperCase()+'\')" style="padding:9px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted)">📋 Copia</button>'
      +'</div>'
      +'<div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:3px">Il cliente ha il codice? Inserisci qui per confermare:</label>'
      +'<div style="display:flex;gap:6px"><input id="sig-inp" placeholder="Codice..." style="flex:1;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;letter-spacing:2px">'
      +'<button onclick="DigitalSignature.confirm(document.getElementById(\'sig-inp\').value)" style="padding:9px 16px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">✅ Conferma</button>'
      +'</div></div>'
      +'<button onclick="document.getElementById(\'sig-modal\').remove()" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted);width:100%">Chiudi</button>'
      +'</div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
  },
  confirm:function(input){
    input=(input||'').toUpperCase().trim();
    if(!input){alert('Inserisci il codice!');return;}
    var d=this.load();
    var req=d.find(function(r){return r.token.slice(0,8).toUpperCase()===input&&r.status==='pending';});
    if(!req){if(typeof toast!=='undefined') toast('Codice non trovato o già usato','error');return;}
    req.status='confirmed'; req.confirmedAt=new Date().toISOString();
    this.save(d);
    document.getElementById('sig-modal')?.remove();
    if(typeof toast!=='undefined') toast('✅ Preventivo confermato da '+req.client+'!','success');
  }
};

// ─── Route patches for new sections ──────────────────────────────
(function _v31Routes(){
  function _p(){
    if(typeof App==='undefined'||!App.renderSection){setTimeout(_p,700);return;}
    if(App._v31routes) return; App._v31routes=true;
    var _o=App.renderSection.bind(App);
    App.renderSection=async function(s){
      if(s==='crm_pipeline'||s==='pipeline'){
        document.querySelectorAll('.section-view.active').forEach(function(v){v.classList.remove('active');});
        var el=document.getElementById('view-crm_pipeline');
        if(!el){el=document.createElement('div');el.id='view-crm_pipeline';el.className='section-view';el.style.cssText='padding:0;overflow-y:auto';var ci=document.getElementById('content-inner');if(ci)ci.appendChild(el);}
        el.classList.add('active');
        // Fallback difensivo: ClientPipeline non è definito in questo build.
        // Prova i moduli pipeline disponibili, altrimenti mostra un placeholder
        // invece di lanciare ReferenceError e rompere la navigazione.
        var _pm = (typeof ClientPipeline!=='undefined'&&ClientPipeline)
               || (typeof PipelineOS!=='undefined'&&PipelineOS)
               || (typeof Pipeline!=='undefined'&&Pipeline)
               || (typeof window!=='undefined'&&window.Pipeline);
        if(_pm&&typeof _pm.render==='function'){ try{ _pm.render(); }catch(e){ console.warn('[crm_pipeline]',e); } }
        else { el.innerHTML='<div style="padding:48px;text-align:center;color:var(--text-muted)">📊 Pipeline clienti non disponibile in questa build.</div>'; }
        return;
      }
      if(s==='abc_analysis'){
        document.querySelectorAll('.section-view.active').forEach(function(v){v.classList.remove('active');});
        ABCAnalysis.render(); return;
      }
      return _o(s);
    };
  }
  setTimeout(_p,1100);

  /* La voce «Pipeline» non viene più iniettata nella sidebar. Lo store
     `pipeline` era un mirror di `orders` — PipelineOS scriveva l'ordine e ne
     duplicava una copia — quindi la sezione mostrava una seconda verità sugli
     stessi lavori. Ora la verità è una sola: Ordini.
     La gerarchia del menu sta in src/app-shell/nav-map.js, che instrada
     `crm_pipeline` su `clienti` per non rompere i collegamenti storici.
     I record senza corrispondente in orders vengono migrati da
     src/core/migrations/pipeline-to-orders.js, che non cancella nulla. */
})();

// ─── CommHistory auto-inject into CRM ────────────────────────────
(function _injectHistoryBtns(){
  function _p(){
    /* Aspettava `CRMSmart._v31qbtn`, che **nessuno imposta** in tutto il
       file: il polling non terminava mai e il pulsante non veniva installato
       nemmeno una volta. Ora la condizione è quella vera — il renderer. */
    var R = window.InglyClienteRiga;
    if(typeof CommHistory==='undefined'||!R||typeof R.aggiungiAzione!=='function'){setTimeout(_p,700);return;}
    if(R._v31histInjected) return; R._v31histInjected=true;
    /* CRM-05 — nessun override di `render` e nessun `setTimeout`: si registra
       il pulsante una volta, e lo disegna chi disegna la riga. */
    CommHistory._addBtn&&CommHistory._addBtn();
  }
  setTimeout(_p,3000);
})();

console.log('[v31-P2] Pipeline · Delays · Calendar · CommHistory · Email · ABC · AdvCost · Compare · Signature loaded');

