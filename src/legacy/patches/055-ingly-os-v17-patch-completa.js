
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v17 — PATCH COMPLETA
// Edit ordine in-place · Elimina · Archivio Vendite · Logo upload · PDF logo
// ════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 1. GESTIONE ORDINI — Override metodi per edit/delete/archive
// ═══════════════════════════════════════════════════════════════════════
(function patchGestioneOrdiniEdit(){
  const tryPatch = () => {
    if(typeof GestioneOrdini==='undefined') return setTimeout(tryPatch,600);

  // ── _openDetail v17: modal EDITABILE completo ─────────────────────
  GestioneOrdini._openDetail = async function(id) {
    const o = await IDB.get('orders', +id||id).catch(()=>null);
    if(!o) return;
    const norm  = this._normalizeState(o.stage||o.status||'preventivo');
    const st    = this.STATES[norm];
    const val   = +(o.total||o.value||o.grossPrice||0);
    const isDone= st.done;

    const modal = document.createElement('div');
    modal.id = 'go-detail-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:#000c;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick = e=>{ if(e.target===modal) modal.remove(); };

    modal.innerHTML = `
    <div style="background:var(--bg-card);border-radius:14px;width:min(620px,96vw);max-height:92vh;overflow-y:auto;border:1px solid var(--border2);box-shadow:0 24px 64px #000d">
      <!-- Header -->
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);background:${st.color}12;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:5;backdrop-filter:blur(8px)">
        <span style="font-size:18px">${st.emoji}</span>
        <div style="flex:1">
          <div id="go-det-title" style="font-size:14px;font-weight:800">${o.clientName||'—'} · ${o.name||'Ordine'}</div>
          <div style="font-size:10px;color:var(--text-muted)"><span style="color:${st.color};font-weight:700">${st.label}</span> · ID #${o.id}</div>
        </div>
        <span style="font-size:16px;font-weight:900;color:${st.color}">€${val.toFixed(0)}</span>
        <button onclick="document.getElementById('go-detail-modal')?.remove()" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">✕</button>
      </div>
      <div style="padding:16px 18px;display:flex;flex-direction:column;gap:12px">
        <!-- FORM EDITABILE -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="grid-column:1/-1">
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px">👤 Cliente</label>
            <input id="go-ed-client" class="form-control" value="${o.clientName||''}" placeholder="Nome cliente" style="font-size:12px">
          </div>
          <div style="grid-column:1/-1">
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px">📝 Nome ordine / Descrizione</label>
            <input id="go-ed-name" class="form-control" value="${(o.name||'').replace(/"/g,'&quot;')}" placeholder="Descrizione ordine" style="font-size:12px">
          </div>
          <div>
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px">💶 Importo €</label>
            <input id="go-ed-total" type="number" step="0.01" class="form-control" value="${val||''}" placeholder="0.00" style="font-size:12px">
          </div>
          <div>
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px">⏰ Scadenza</label>
            <input id="go-ed-due" type="date" class="form-control" value="${o.dueDate||''}" style="font-size:12px">
          </div>
          <div>
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px">🏷️ Priorità</label>
            <select id="go-ed-prio" class="form-control" style="font-size:12px">
              <option value="normal" ${(o.priority||'normal')==='normal'?'selected':''}>⚪ Normale</option>
              <option value="high" ${o.priority==='high'?'selected':''}>🟠 Alta</option>
              <option value="urgent" ${o.priority==='urgent'?'selected':''}>🔴 Urgente</option>
            </select>
          </div>
          <div>
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px">📡 Canale</label>
            <select id="go-ed-channel" class="form-control" style="font-size:12px">
              ${['Diretto','WhatsApp','Instagram','Etsy','Fiera','Passaparola','Sito Web','Email'].map(ch=>`<option value="${ch}" ${(o.channel||'Diretto')===ch?'selected':''}>${ch}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px">🔗 Fonte</label>
            <select id="go-ed-source" class="form-control" style="font-size:12px">
              ${['manuale','quoter','etsy','instagram','fiera','passaparola','sito'].map(s=>`<option value="${s}" ${(o.source||'manuale')===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px">📦 Stato</label>
            <select id="go-ed-state" class="form-control" style="font-size:12px">
              ${Object.entries(this.STATES).map(([k,s])=>`<option value="${k}" ${norm===k?'selected':''}>${s.emoji} ${s.label}</option>`).join('')}
            </select>
          </div>
          <div style="grid-column:1/-1">
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px">📝 Note interne</label>
            <textarea id="go-ed-notes" class="form-control" rows="2" style="font-size:12px;resize:vertical">${o.notes||''}</textarea>
          </div>
        </div>

        <!-- Cambio stato rapido -->
        <div>
          <div style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">⚡ Avanzamento rapido</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${Object.entries(this.STATES).map(([k,s])=>`
            <button onclick="GestioneOrdini._quickTransition(${o.id},'${k}')"
              style="padding:4px 9px;border-radius:5px;border:1.5px solid ${norm===k?s.color:s.color+'40'};background:${norm===k?s.color:s.color+'12'};color:${norm===k?'#fff':s.color};cursor:pointer;font-size:10px;font-weight:700">
              ${s.emoji} ${s.label}
            </button>`).join('')}
          </div>
        </div>

        <!-- Storico -->
        ${(o._history||[]).length ? `<details>
          <summary style="font-size:10px;font-weight:700;color:var(--text-muted);cursor:pointer;padding:4px 0">📜 Storico (${(o._history||[]).length})</summary>
          <div style="margin-top:5px;max-height:100px;overflow-y:auto;display:flex;flex-direction:column;gap:2px">
            ${[...(o._history||[])].reverse().map(h=>`<div style="display:flex;gap:6px;font-size:9px;color:var(--text-dim);padding:2px 0;border-bottom:1px solid var(--border)">
              <span style="color:${(this.STATES[h.from]||{}).color||'#888'}">${h.from||'—'}</span>→
              <span style="color:${(this.STATES[h.to]||{}).color||'#888'};font-weight:700">${h.to}</span>
              <span style="margin-left:auto;white-space:nowrap">${new Date(h.ts).toLocaleDateString('it-IT',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
            </div>`).join('')}
          </div>
        </details>` : ''}

        <!-- Preventivato · Reale · Scostamento -->
        <div id="go-consuntivo"></div>

        <!-- Azioni -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:6px;border-top:1px solid var(--border)">
          <button onclick="GestioneOrdini._saveEdit(${o.id})" style="flex:1;min-width:100px;padding:9px;background:var(--primary);color:#000;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-size:12px">💾 Salva modifiche</button>
          <button onclick="typeof WAQuick!=='undefined'&&WAQuick.sendOrderReady({clientName:document.getElementById('go-ed-client')?.value||'',name:document.getElementById('go-ed-name')?.value||'',status:'pronto'})" style="padding:9px 11px;background:#25D36615;border:1px solid #25D36640;border-radius:8px;cursor:pointer;font-size:11px;color:#25D366">💬</button>
          <button onclick="typeof OrderQuickNote!=='undefined'&&OrderQuickNote.open(${o.id},'${(o.name||'').replace(/'/g,'')}')" style="padding:9px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)">📝</button>
          ${(norm==='completato'||norm==='venduto') ? `<button onclick="GestioneOrdini._archiveToSales(${o.id})" style="padding:9px 11px;background:#22c55e15;border:1px solid #22c55e40;border-radius:8px;cursor:pointer;font-size:11px;color:#22c55e;font-weight:700">📦 → Archivio</button>` : ''}
          <button onclick="GestioneOrdini._confirmDelete(${o.id},'${(o.clientName||'').replace(/'/g,'')}')" style="padding:9px 11px;background:#ef444415;border:1px solid #ef444440;border-radius:8px;cursor:pointer;font-size:11px;color:#ef4444;font-weight:700">🗑 Elimina</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('go-ed-client')?.focus();
    /* Il consuntivo si legge da due archivi: si riempie dopo, così il dettaglio
       si apre subito invece di aspettare due letture. Il metodo vive su
       GestioneOrdini (patch 052) ed è di questa versione del dettaglio che ha
       bisogno: quella del file 052 non viene mai eseguita, perché è questa
       funzione a sostituirla. */
    if (typeof this._riempiConsuntivo === 'function') this._riempiConsuntivo(o);
  };

  // ── _saveEdit: salva tutte le modifiche ───────────────────────────
  GestioneOrdini._saveEdit = async function(id) {
    try {
      const o = await IDB.get('orders', +id||id).catch(()=>null);
      if(!o) return;
      const newState = document.getElementById('go-ed-state')?.value || o.stage;
      const oldState = this._normalizeState(o.stage||o.status||'preventivo');
      
      o.clientName = document.getElementById('go-ed-client')?.value?.trim() || o.clientName;
      o.name       = document.getElementById('go-ed-name')?.value?.trim()   || o.name;
      o.total      = parseFloat(document.getElementById('go-ed-total')?.value||o.total)||o.total||0;
      o.value      = o.total;
      o.dueDate    = document.getElementById('go-ed-due')?.value    || o.dueDate;
      o.priority   = document.getElementById('go-ed-prio')?.value   || o.priority;
      o.channel    = document.getElementById('go-ed-channel')?.value|| o.channel;
      o.source     = document.getElementById('go-ed-source')?.value || o.source;
      o.notes      = document.getElementById('go-ed-notes')?.value  || '';
      o.updatedAt  = new Date().toISOString();

      // Se lo stato è cambiato, aggiorna tramite SSOT
      if(newState !== oldState) {
        if(!o._history) o._history = [];
        o._history.push({ from: oldState, to: newState, ts: new Date().toISOString(), note: 'modifica manuale' });
        o.stage = newState; o.status = newState;
      }
      
      await IDB.put('orders', o);
      if(typeof AppStore!=='undefined') AppStore.invalidate('orders');
      document.getElementById('go-detail-modal')?.remove();
      document.dispatchEvent(new CustomEvent('orderUpdated', { detail: { id: o.id, order: o } }));
      await this.render();
      toast('✅ Ordine aggiornato!', 'success');
    } catch(e) { toast('Errore: '+e.message, 'error'); }
  };

  // ── _quickTransition: cambia stato dal modal senza chiudere ───────
  GestioneOrdini._quickTransition = async function(id, newState) {
    const result = await window.updateOrderStatus(id, newState);
    if(result) {
      // Aggiorna il select stato nel modal
      const sel = document.getElementById('go-ed-state');
      if(sel) sel.value = newState;
      toast(this.STATES[newState]?.emoji + ' → ' + this.STATES[newState]?.label, 'success');
      await this.render();
    }
  };

  // ── _confirmDelete: elimina con conferma ──────────────────────────
  GestioneOrdini._confirmDelete = function(id, clientName) {
    const confirm_div = document.createElement('div');
    confirm_div.style.cssText = 'position:fixed;inset:0;background:#000d;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
    confirm_div.innerHTML = `
    <div style="background:var(--bg-card);border-radius:12px;width:min(380px,96vw);border:2px solid #ef444440;box-shadow:0 20px 60px #000c;padding:20px">
      <div style="font-size:32px;text-align:center;margin-bottom:10px">🗑️</div>
      <div style="font-size:15px;font-weight:800;text-align:center;margin-bottom:6px">Elimina ordine?</div>
      <div style="font-size:12px;color:var(--text-muted);text-align:center;margin-bottom:16px">
        <strong>${clientName||'Ordine'}</strong> — questa azione non può essere annullata.
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="this.closest('[style*=fixed]').remove()" style="flex:1;padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">Annulla</button>
        <button onclick="GestioneOrdini._deleteOrder(${id});this.closest('[style*=fixed]').remove()" style="flex:1;padding:10px;background:#ef4444;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">🗑 Elimina</button>
      </div>
    </div>`;
    document.body.appendChild(confirm_div);
  };

  // ── _deleteOrder: elimina dall'IDB ────────────────────────────────
  GestioneOrdini._deleteOrder = async function(id) {
    try {
      await IDB.del('orders', +id||id).catch(()=>{});
      // Prova anche delete dal pipeline store se esiste
      try { await IDB.del('pipeline', +id||id); } catch(e) {}
      if(typeof AppStore!=='undefined') { AppStore.invalidate('orders'); AppStore.invalidate('pipeline'); }
      document.getElementById('go-detail-modal')?.remove();
      document.dispatchEvent(new CustomEvent('orderUpdated', { detail: { id: id, deleted: true } }));
      await this.render();
      toast('🗑 Ordine eliminato', 'info');
    } catch(e) { toast('Errore eliminazione: '+e.message, 'error'); }
  };

  // ── _archiveToSales: sposta in archivio vendite ───────────────────
  GestioneOrdini._archiveToSales = async function(id) {
    try {
      const o = await IDB.get('orders', +id||id).catch(()=>null);
      if(!o) return;
      
      // Crea vendita se non esiste
      if(!o.linkedSaleId) {
        const sale = {
          id: Date.now(), clientName: o.clientName||'',
          desc: o.name||'Vendita da ordine',
          amount: +(o.total||o.value||o.grossPrice||0),
          date: new Date().toISOString().slice(0,10),
          status: 'da_pagare', channel: o.channel||'Diretto',
          orderId: o.id, archivedFrom: 'ordini_workflow',
          archivedAt: new Date().toISOString(),
        };
        await IDB.put('sales', sale);
        if(typeof AppStore!=='undefined') AppStore.invalidate('sales');
        o.linkedSaleId = sale.id;
      }
      
      // Marca ordine come archiviato (rimosso dalla vista attiva)
      o._archived   = true;
      o._archivedAt = new Date().toISOString();
      o.stage       = 'venduto';
      o.status      = 'venduto';
      if(!o._history) o._history = [];
      o._history.push({ from: o.stage||'completato', to: 'archiviato', ts: new Date().toISOString(), note: 'archiviato in vendite' });
      await IDB.put('orders', o);
      if(typeof AppStore!=='undefined') { AppStore.invalidate('orders'); AppStore.invalidate('sales'); }
      document.getElementById('go-detail-modal')?.remove();
      document.dispatchEvent(new CustomEvent('orderUpdated', { detail: { id: o.id, archived: true } }));
      await this.render();
      toast('📦 Archiviato in Vendite!', 'success');
    } catch(e) { toast('Errore archivio: '+e.message, 'error'); }
  };

  // ── Patcha getOrders per escludere archiviati ─────────────────────
  const _origGetOrders = GestioneOrdini.getOrders.bind(GestioneOrdini);
  GestioneOrdini.getOrders = async function() {
    const raw = await _origGetOrders();
    // Escludi archiviati dalla vista attiva
    return raw.filter(o => !o._archived);
  };

  console.log('[GestioneOrdini v17] Edit/Delete/Archive patched ✅');
  };
  tryPatch();
})();


// ═══════════════════════════════════════════════════════════════════════
// 2. LOGO UPLOAD — Base64 via FileReader (no URL richiesto)
// ═══════════════════════════════════════════════════════════════════════
(function patchLogoUpload(){
  const tryPatch = () => {
    if(typeof TemplateEditor === 'undefined') return setTimeout(tryPatch, 800);

    const _origBuildFields = TemplateEditor._buildEditorFields.bind(TemplateEditor);
    TemplateEditor._buildEditorFields = function(t) {
      const original = _origBuildFields(t);
      // Replace the URL Logo field with a proper upload+URL field
      const oldLogoField = `<div>
        <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">🖼 URL Logo</label>
        <input class="form-control" id="tpl-logo-${t.id}" value="${t.logo||''}" placeholder="https://... (vuoto = nome azienda)"
          oninput="TemplateEditor._onField('${t.id}','logo',this.value)" style="font-size:11px;height:30px">
      </div>`;
      
      const newLogoField = `<div>
        <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">🖼 Logo aziendale</label>
        <div style="display:flex;flex-direction:column;gap:5px">
          ${t.logo ? `<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--bg-card);border-radius:6px;border:1px solid var(--border)">
            <img src="${t.logo}" style="height:28px;max-width:80px;object-fit:contain;border-radius:3px" onerror="this.style.display='none'">
            <span style="font-size:9px;color:var(--text-muted);flex:1">Logo caricato</span>
            <button onclick="TemplateEditor._onField('${t.id}','logo','');TemplateEditor._selectTpl('${t.id}')" style="padding:2px 6px;background:#ef444415;border:1px solid #ef444440;border-radius:4px;color:#ef4444;font-size:9px;cursor:pointer">✕</button>
          </div>` : ''}
          <div style="display:flex;gap:5px">
            <label style="flex:1;padding:5px 8px;background:var(--bg-card2);border:1.5px dashed var(--border);border-radius:6px;cursor:pointer;font-size:10px;color:var(--text-muted);text-align:center;display:flex;align-items:center;justify-content:center;gap:4px">
              <i class="fas fa-upload" style="font-size:10px"></i> Carica immagine
              <input type="file" accept="image/*" style="display:none" onchange="TemplateEditor._onLogoUpload('${t.id}',this)">
            </label>
            <input class="form-control" id="tpl-logo-${t.id}" value="${t.logo&&!t.logo.startsWith('data:')?(t.logo):'URL opzionale'}"
              placeholder="oppure URL" style="font-size:10px;height:32px;flex:1"
              oninput="TemplateEditor._onField('${t.id}','logo',this.value)">
          </div>
        </div>
      </div>`;
      
      return original.replace(oldLogoField, newLogoField);
    };

    TemplateEditor._onLogoUpload = function(templateId, input) {
      const file = input.files[0];
      if(!file) return;
      if(file.size > 500*1024) { toast('Logo troppo grande (max 500KB)','warning'); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        this._onField(templateId, 'logo', base64);
        // Trigger re-render of editor
        setTimeout(()=>this._selectTpl(templateId), 100);
        toast('✅ Logo caricato!', 'success');
      };
      reader.readAsDataURL(file);
    };

    console.log('[LogoUpload] Patched ✅');
  };
  setTimeout(tryPatch, 1200);
})();


// ═══════════════════════════════════════════════════════════════════════
// 3. PDF LOGO — Mostra logo nel preventivo PDF
// ═══════════════════════════════════════════════════════════════════════
// PDF Logo patch → handled by new generatePDFQuote engine



// ═══════════════════════════════════════════════════════════════════════
// 4. ARCHIVIO VENDITE — Sezione dedicata con ordini archiviati
// ═══════════════════════════════════════════════════════════════════════
const SalesArchive = {
  async render() {
    const el = document.getElementById('view-sales_archive');
    if(!el) return;
    
    // Prendi ordini archiviati
    const orders = await IDB.getAll('orders').catch(()=>[]);
    const archived = orders.filter(o=>o._archived).sort((a,b)=>new Date(b._archivedAt||0)-new Date(a._archivedAt||0));
    
    // Prendi vendite collegate
    const sales = await IDB.getAll('sales').catch(()=>[]);
    const linkedSales = sales.filter(s=>s.archivedFrom==='ordini_workflow');

    const totalArchived = archived.reduce((a,o)=>a+(+(o.total||o.value||0)),0);
    const totalPaid = linkedSales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+(s.amount||0)),0);

    el.innerHTML = `
    <div style="padding:16px 20px;max-width:1200px;margin:0 auto">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:2px solid var(--border)">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#22c55e,#059669);display:flex;align-items:center;justify-content:center;font-size:22px">📦</div>
        <div style="flex:1">
          <h2 style="margin:0 0 3px;font-size:19px;font-weight:900">Archivio Vendite</h2>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">${archived.length} ordini archiviati · €${Math.round(totalArchived).toLocaleString('it-IT')} totale · €${Math.round(totalPaid).toLocaleString('it-IT')} incassato</p>
        </div>
        <button onclick="App.navigate('gestione_ordini')" style="padding:7px 13px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text)">← Torna agli ordini</button>
      </div>
      
      ${archived.length ? `
      <div style="border-radius:10px;border:1px solid var(--border);overflow:hidden;max-height:calc(100vh - 200px);overflow-y:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead style="position:sticky;top:0;z-index:5;background:var(--bg-card2)">
            <tr>
              <th style="padding:9px 14px;text-align:left;border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Cliente · Ordine</th>
              <th style="padding:9px 14px;border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Archiviato il</th>
              <th style="padding:9px 14px;text-align:right;border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Importo</th>
              <th style="padding:9px 14px;border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Stato vendita</th>
              <th style="padding:9px 14px;border-bottom:1px solid var(--border)"></th>
            </tr>
          </thead>
          <tbody>
            ${archived.map(o=>{
              const linkedSale = sales.find(s=>s.id===o.linkedSaleId||+s.id===+o.linkedSaleId);
              const val = +(o.total||o.value||0);
              return `<tr style="border-bottom:1px solid var(--border);border-left:3px solid #22c55e;transition:.12s"
                onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background=''">
                <td style="padding:9px 14px">
                  <div style="font-weight:700">${o.clientName||'—'}</div>
                  <div style="font-size:10px;color:var(--text-muted)">${o.name||'—'}</div>
                </td>
                <td style="padding:9px 14px;font-size:11px;color:var(--text-muted)">${o._archivedAt?new Date(o._archivedAt).toLocaleDateString('it-IT'):'—'}</td>
                <td style="padding:9px 14px;text-align:right;font-weight:800">€${val.toFixed(0)}</td>
                <td style="padding:9px 14px">
                  ${linkedSale ? `<span style="font-size:10px;padding:2px 8px;border-radius:99px;background:${linkedSale.status==='pagato'?'#22c55e18':'#f9731618'};color:${linkedSale.status==='pagato'?'#22c55e':'#f97316'};font-weight:700">${linkedSale.status==='pagato'?'✅ Pagato':'⏳ Da pagare'}</span>`
                  : '<span style="font-size:10px;color:var(--text-dim)">—</span>'}
                </td>
                <td style="padding:9px 14px">
                  <div style="display:flex;gap:4px">
                    <button onclick="SalesArchive._restore(${o.id})" style="padding:3px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:10px;color:var(--text-muted);font-weight:700" title="Ripristina in Ordini">↩ Ripristina</button>
                    <button onclick="SalesArchive._deleteArchived(${o.id})" style="padding:3px 6px;background:#ef444415;border:1px solid #ef444430;border-radius:5px;cursor:pointer;font-size:10px;color:#ef4444" title="Elimina definitivamente">🗑</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot style="position:sticky;bottom:0;background:var(--bg-card2)">
            <tr>
              <td colspan="2" style="padding:9px 14px;font-size:11px;color:var(--text-muted)">${archived.length} ordini archiviati</td>
              <td style="padding:9px 14px;text-align:right;font-size:14px;font-weight:800;color:var(--primary)">€${totalArchived.toFixed(0)}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>` : `
      <div style="text-align:center;padding:60px;color:var(--text-dim)">
        <div style="font-size:48px;margin-bottom:12px;opacity:.3">📦</div>
        <div style="font-size:16px;font-weight:700;color:var(--text-muted)">Archivio vuoto</div>
        <div style="font-size:12px;margin-top:6px">Gli ordini completati/venduti appariranno qui dopo l'archiviazione</div>
      </div>`}
    </div>`;
  },

  async _restore(id) {
    try {
      const o = await IDB.get('orders', +id||id).catch(()=>null);
      if(!o) return;
      o._archived = false;
      delete o._archivedAt;
      o.stage = 'completato'; o.status = 'completato';
      await IDB.put('orders', o);
      if(typeof AppStore!=='undefined') AppStore.invalidate('orders');
      await this.render();
      toast('↩ Ordine ripristinato in Completato','info');
    } catch(e) { toast('Errore: '+e.message,'error'); }
  },

  async _deleteArchived(id) {
    if(!confirm('Eliminare definitivamente questo ordine archiviato?')) return;
    await IDB.del('orders', +id||id).catch(()=>{});
    if(typeof AppStore!=='undefined') AppStore.invalidate('orders');
    await this.render();
    toast('🗑 Eliminato definitivamente','info');
  },
};
window.SalesArchive = SalesArchive;


// ═══════════════════════════════════════════════════════════════════════
// 5. INSTALLAZIONE ARCHIVIO VENDITE — view + nav + renderSection
// ═══════════════════════════════════════════════════════════════════════
(function installSalesArchive(){
  const tryInstall = () => {
    // Inietta il view container
    if(!document.getElementById('view-sales_archive')) {
      const salesView = document.getElementById('view-sales');
      if(salesView) {
        const div = document.createElement('div');
        div.className = 'section-view';
        div.id = 'view-sales_archive';
        salesView.parentNode.insertBefore(div, salesView.nextSibling);
      }
    }
    
    // Inietta nav item accanto a Vendite
    const salesNav = document.querySelector('[data-section="sales"]');
    if(salesNav && !document.querySelector('[data-section="sales_archive"]')) {
      const archiveNav = document.createElement('div');
      archiveNav.className = 'nav-item';
      archiveNav.setAttribute('data-section', 'sales_archive');
      archiveNav.onclick = () => App.navigate('sales_archive');
      archiveNav.style.cssText = 'color:var(--text-muted);font-size:11px;padding-left:28px';
      archiveNav.innerHTML = '<i class="fas fa-archive" style="color:#22c55e"></i> Archivio Vendite';
      salesNav.parentNode.insertBefore(archiveNav, salesNav.nextSibling);
    }

    // Wire renderSection
    const _origNav = App.navigate?.bind(App);
    if(_origNav && !App.__archivePatch) {
      App.__archivePatch = true;
      const _origRS = App.renderSection?.bind(App);
      if(_origRS) {
        App.renderSection = function(s) {
          if(s === 'sales_archive') { SalesArchive.render(); return; }
          _origRS(s);
        };
      }
    }

    // Aggiungi bottone archivio nella navbar produzione di GestioneOrdini
    console.log('[SalesArchive] Installed ✅');
  };
  if(document.readyState === 'complete') tryInstall();
  else window.addEventListener('load', ()=>setTimeout(tryInstall, 2000));
  setTimeout(tryInstall, 2500);
})();

// ═══════════════════════════════════════════════════════════════════════
// 6. QUICK ARCHIVE BUTTON — Bottone in GestioneOrdini nella vista
// ═══════════════════════════════════════════════════════════════════════
(function addArchiveButton(){
  const tryAdd = () => {
    if(typeof GestioneOrdini === 'undefined') return setTimeout(tryAdd, 800);
    // Intercept render to add archive button in header
    const _origRender = GestioneOrdini.render.bind(GestioneOrdini);
    GestioneOrdini.render = async function() {
      await _origRender();
      // Add archive button if not present
      const actionsDiv = document.querySelector('#view-gestione_ordini .page-actions') ||
        document.querySelector('#view-gestione_ordini [style*="display:flex;gap:5px"]');
      if(actionsDiv && !actionsDiv.querySelector('.go-archive-btn')) {
        const btn = document.createElement('button');
        btn.className = 'go-archive-btn';
        btn.style.cssText = 'padding:7px 10px;background:#22c55e15;border:1px solid #22c55e40;border-radius:7px;cursor:pointer;font-size:10px;color:#22c55e;font-weight:700';
        btn.innerHTML = '📦 Archivio';
        btn.onclick = () => App.navigate('sales_archive');
        actionsDiv.appendChild(btn);
      }
    };
    console.log('[ArchiveButton] Installed ✅');
  };
  setTimeout(tryAdd, 3000);
})();

