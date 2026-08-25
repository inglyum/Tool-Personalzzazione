
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v10 — FINAL FEATURES PACK
// OrderQuickNote · Sales Line Items · Catalog Margin · Archive settings
// ════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 1. ORDER QUICK NOTE — click 📝 on card for inline note
// ═══════════════════════════════════════════════════════════════════════
const OrderQuickNote = {
  _SK: 'ingly_order_notes_v1',
  get(id){ try{return JSON.parse(localStorage.getItem(this._SK)||'{}')[id]||'';}catch{return '';} },
  set(id,note){ try{const d=JSON.parse(localStorage.getItem(this._SK)||'{}');d[id]=note;localStorage.setItem(this._SK,JSON.stringify(d));}catch{} },

  open(orderId, orderName) {
    const existing = document.getElementById('oqn-popup');
    if(existing) existing.remove();
    const note = this.get(orderId)||'';

    const popup = document.createElement('div');
    popup.id = 'oqn-popup';
    popup.style.cssText = 'position:fixed;inset:0;background:#000a;z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px';
    popup.onclick = e=>{ if(e.target===popup) popup.remove(); };
    popup.innerHTML = `
      <div style="background:var(--bg-card);border-radius:14px;width:min(440px,96vw);border:1px solid var(--border2);box-shadow:0 20px 60px #000c">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
          <span style="font-size:16px">📝</span>
          <div>
            <div style="font-size:13px;font-weight:800">Nota rapida</div>
            <div style="font-size:10px;color:var(--text-muted)">${orderName||'Ordine'} · visibile solo a te</div>
          </div>
          <button onclick="document.getElementById('oqn-popup').remove()" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">✕</button>
        </div>
        <div style="padding:14px 18px">
          <textarea id="oqn-text" class="form-control" rows="4" placeholder="Nota interna, memo, istruzione specifica…" style="resize:vertical;font-size:13px;line-height:1.6">${note}</textarea>
          <div style="display:flex;gap:6px;margin-top:10px">
            <button onclick="OrderQuickNote._save(${orderId})" style="flex:1;padding:9px;background:var(--primary);color:#000;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-size:12px">💾 Salva nota</button>
            ${note?`<button onclick="OrderQuickNote.set(${orderId},'');document.getElementById('oqn-popup').remove();toast('Nota eliminata','info')" style="padding:9px 14px;background:#ef444415;border:1px solid #ef444430;border-radius:8px;color:#ef4444;cursor:pointer;font-size:12px;font-weight:700">🗑</button>`:''}
          </div>
          ${note?`<div style="margin-top:8px;font-size:10px;color:var(--text-dim)">Nota salvata · Click fuori per chiudere</div>`:''}
        </div>
      </div>`;
    document.body.appendChild(popup);
    setTimeout(()=>{
      const ta = document.getElementById('oqn-text');
      if(ta){ ta.focus(); ta.selectionStart=ta.value.length; }
    }, 50);
  },

  _save(orderId) {
    const text = document.getElementById('oqn-text')?.value?.trim()||'';
    this.set(orderId, text);
    document.getElementById('oqn-popup')?.remove();
    toast('📝 Nota salvata!','success');
  },

  // Show note indicator on cards that have notes
  refreshIndicators() {
    try{
      const notes = JSON.parse(localStorage.getItem(this._SK)||'{}');
      document.querySelectorAll('.ofe-card[data-id]').forEach(card=>{
        const id = card.getAttribute('data-id');
        const hasNote = !!(notes[id]||notes[+id]);
        let dot = card.querySelector('.oqn-dot');
        if(hasNote && !dot){
          dot = document.createElement('div');
          dot.className = 'oqn-dot';
          dot.style.cssText = 'position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:50%;background:var(--primary);opacity:.8';
          dot.title = 'Ha nota interna';
          card.style.position = 'relative';
          card.appendChild(dot);
        } else if(!hasNote && dot){
          dot.remove();
        }
      });
    }catch(ex){}
  }
};
window.OrderQuickNote = OrderQuickNote;

// Refresh note indicators when orders render
(function(){
  const observer = new MutationObserver(()=>{
    if(document.querySelectorAll('.ofe-card').length>0)
      setTimeout(()=>OrderQuickNote.refreshIndicators(), 300);
  });
  observer.observe(document.body, {childList:true, subtree:true});
})();


// ═══════════════════════════════════════════════════════════════════════
// 2. SALES LINE ITEMS — multi-product in one sale
// ═══════════════════════════════════════════════════════════════════════
(function patchSalesLineItems(){
  const tryPatch = () => {
    if(typeof Sales==='undefined'||!Sales.openModal) return setTimeout(tryPatch, 800);

    // Override openModal to add line items support
    const _orig = Sales.openModal.bind(Sales);
    Sales.openModal = async function(editId){
      // First call original to get the modal open
      await _orig(editId);
      // Then inject line items section
      setTimeout(()=>{
        const modal = document.getElementById('sales-modal') || document.querySelector('[id*="sales"][id*="modal"]');
        const amountInput = document.getElementById('sale-amount');
        if(!amountInput || document.getElementById('sale-lineitems')) return;

        // Inject toggle above amount
        const amtGroup = amountInput.closest('.form-group') || amountInput.parentElement;
        if(!amtGroup) return;

        const toggle = document.createElement('div');
        toggle.style.cssText = 'margin-bottom:10px';
        toggle.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <label style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">💶 Importo</label>
          <button type="button" onclick="SalesLineItems.toggle()" style="font-size:10px;color:var(--primary);background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:5px;padding:2px 8px;cursor:pointer;font-weight:700" id="li-toggle-btn">+ Line items</button>
        </div>
        <div id="sale-lineitems" style="display:none;margin-bottom:8px">
          <div id="li-rows" style="display:flex;flex-direction:column;gap:5px;margin-bottom:6px"></div>
          <button type="button" onclick="SalesLineItems.addRow()" style="width:100%;padding:5px;background:var(--bg-card2);border:1px dashed var(--border);border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:11px">+ Aggiungi prodotto</button>
          <div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--bg-card2);border-radius:6px;margin-top:5px">
            <span style="font-size:11px;color:var(--text-muted)">Totale calcolato:</span>
            <span id="li-total" style="font-size:14px;font-weight:800;color:var(--primary)">€0.00</span>
          </div>
        </div>`;
        amtGroup.insertBefore(toggle, amtGroup.firstChild);

        // Pre-populate with existing line items if editing
        if(editId) {
          const existing = Sales._all?.find(s=>s.id===editId||+s.id===+editId);
          if(existing?.lineItems?.length) {
            SalesLineItems.toggle(true);
            existing.lineItems.forEach(li=>SalesLineItems.addRow(li.name, li.qty, li.price));
          }
        }
      }, 200);
    };

    // Patch save to include line items
    const _origSave = Sales.save?.bind(Sales);
    if(_origSave) {
      Sales.save = async function(){
        // If line items are active, set amount from total
        const liPanel = document.getElementById('sale-lineitems');
        if(liPanel && liPanel.style.display!=='none'){
          const total = SalesLineItems.getTotal();
          const amtEl = document.getElementById('sale-amount');
          if(amtEl) amtEl.value = total.toFixed(2);
          // Also collect line items data
          const rows = liPanel.querySelectorAll('.li-row');
          const items = [];
          rows.forEach(row=>{
            const name  = row.querySelector('.li-name')?.value?.trim();
            const qty   = parseFloat(row.querySelector('.li-qty')?.value)||1;
            const price = parseFloat(row.querySelector('.li-price')?.value)||0;
            if(name||price) items.push({name:name||'Prodotto',qty,price});
          });
          Sales._pendingLineItems = items;
        }
        await _origSave();
        // Attach line items to saved record
        if(Sales._pendingLineItems) {
          try{
            const all = await IDB.getAll('sales');
            const last = all[all.length-1];
            if(last){ last.lineItems=Sales._pendingLineItems; await IDB.put('sales',last); }
          }catch(ex){}
          delete Sales._pendingLineItems;
        }
      };
    }
    (console.info||console.log)('[SalesLineItems] Patched ✅');
  };
  setTimeout(tryPatch, 1200);
})();

const SalesLineItems = {
  _rows: 0,
  toggle(forceOpen){
    const panel = document.getElementById('sale-lineitems');
    const btn   = document.getElementById('li-toggle-btn');
    if(!panel) return;
    const open = forceOpen || panel.style.display==='none';
    panel.style.display = open ? '' : 'none';
    if(btn) btn.textContent = open ? '− Line items' : '+ Line items';
    if(open && !panel.querySelector('.li-row')) this.addRow();
  },
  addRow(name='', qty=1, price=0){
    const rows = document.getElementById('li-rows');
    if(!rows) return;
    const id = ++this._rows;
    const div = document.createElement('div');
    div.className = 'li-row';
    div.style.cssText = 'display:grid;grid-template-columns:1fr 55px 80px 28px;gap:4px;align-items:center';
    div.innerHTML = `
      <input class="form-control li-name" placeholder="Prodotto/servizio" value="${name}" style="font-size:12px;height:30px" oninput="SalesLineItems.updateTotal()">
      <input type="number" class="form-control li-qty" value="${qty}" min="0.01" step="0.01" placeholder="Qty" style="font-size:12px;height:30px;text-align:center" oninput="SalesLineItems.updateTotal()">
      <input type="number" class="form-control li-price" value="${price||''}" min="0" step="0.01" placeholder="€" style="font-size:12px;height:30px;text-align:right" oninput="SalesLineItems.updateTotal()">
      <button type="button" onclick="this.parentElement.remove();SalesLineItems.updateTotal()" style="width:28px;height:30px;background:#ef444415;border:1px solid #ef444430;border-radius:5px;color:#ef4444;cursor:pointer;font-size:12px">×</button>`;
    rows.appendChild(div);
    this.updateTotal();
    div.querySelector('.li-name').focus();
  },
  getTotal(){
    let total = 0;
    document.querySelectorAll('.li-row').forEach(row=>{
      const qty   = parseFloat(row.querySelector('.li-qty')?.value)||1;
      const price = parseFloat(row.querySelector('.li-price')?.value)||0;
      total += qty * price;
    });
    return total;
  },
  updateTotal(){
    const totalEl = document.getElementById('li-total');
    if(totalEl) totalEl.textContent = '€'+this.getTotal().toFixed(2);
  }
};
window.SalesLineItems = SalesLineItems;


// ═══════════════════════════════════════════════════════════════════════
// 3. CATALOG MARGIN % — show margin on catalog items
// ═══════════════════════════════════════════════════════════════════════
(function patchCatalogMargin(){
  const tryPatch = () => {
    if(typeof Catalog==='undefined') return setTimeout(tryPatch, 1000);

    const origRender = Catalog.render?.bind(Catalog)||Catalog.renderList?.bind(Catalog);
    if(!origRender) return;

    // After catalog renders, inject margin badges
    const addMargins = () => {
      document.querySelectorAll('[data-cat-id]').forEach(card=>{
        if(card.querySelector('.cat-margin-badge')) return;
        const priceEl  = card.querySelector('[data-cat-price]') || card.querySelector('.cat-price');
        const costEl   = card.querySelector('[data-cat-cost]')  || card.querySelector('.cat-cost');
        if(!priceEl) return;
        const price = parseFloat(priceEl.dataset?.catPrice || priceEl.textContent?.replace(/[€,\s]/g,'')) || 0;
        const cost  = parseFloat(costEl?.dataset?.catCost  || costEl?.textContent?.replace(/[€,\s]/g,'')) || 0;
        if(!price) return;
        const margin = cost > 0 ? ((price-cost)/price*100).toFixed(0) : null;
        const badge  = document.createElement('span');
        badge.className = 'cat-margin-badge';
        badge.style.cssText = `display:inline-block;font-size:9px;font-weight:800;padding:1px 6px;border-radius:99px;background:${margin>=60?'#22c55e20':margin>=40?'#f59e0b20':'#ef444420'};color:${margin>=60?'#22c55e':margin>=40?'#f59e0b':'#ef4444'};border:1px solid ${margin>=60?'#22c55e40':margin>=40?'#f59e0b40':'#ef444440'};margin-left:4px`;
        badge.textContent = margin ? `${margin}% marg.` : 'no costo';
        badge.title = `Prezzo: €${price} · Costo: €${cost} · Margine: ${margin||'?'}%`;
        priceEl.parentNode?.appendChild(badge);
      });
    };

    const observer = new MutationObserver(()=>{
      if(document.querySelector('[data-cat-id]')) setTimeout(addMargins, 200);
    });
    observer.observe(document.body, {childList:true, subtree:true});

    (console.info||console.log)('[CatalogMargin] Installed ✅');
  };
  setTimeout(tryPatch, 1500);
})();


// ═══════════════════════════════════════════════════════════════════════
// 4. PIPELINE ARCHIVE SETTINGS — configure archive days in settings
// ═══════════════════════════════════════════════════════════════════════
(function wireArchiveSettings(){
  // Add archive config to Settings view when it's ready
  const tryWire = () => {
    const settingsView = document.getElementById('view-settings');
    if(!settingsView || document.getElementById('archive-days-setting')) return setTimeout(tryWire, 1000);

    // Find a good injection point in settings
    const sections = settingsView.querySelectorAll('.card, .settings-section');
    if(!sections.length) return setTimeout(tryWire, 1000);

    const archiveCard = document.createElement('div');
    archiveCard.className = 'card';
    archiveCard.style.cssText = 'margin-top:14px';
    archiveCard.innerHTML = `
      <div class="card-title"><i class="fas fa-archive" style="color:var(--primary);margin-right:8px"></i>Archivio Pipeline</div>
      <div class="form-group" id="archive-days-setting">
        <label class="form-label">Auto-archivio ordini completati dopo (giorni)</label>
        <div style="display:flex;align-items:center;gap:10px">
          <input type="range" id="set-archive-days" min="1" max="30" value="${window.ARCHIVE_DAYS||3}"
            oninput="window.ARCHIVE_DAYS=+this.value;document.getElementById('set-arch-days-val').textContent=this.value"
            style="flex:1;accent-color:var(--primary)">
          <span id="set-arch-days-val" style="font-size:14px;font-weight:800;color:var(--primary);min-width:28px">${window.ARCHIVE_DAYS||3}</span>
          <span style="font-size:11px;color:var(--text-dim)">giorni</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:5px">
          Gli ordini con stato <em>venduto/fatturato/consegnato</em> vengono archiviati automaticamente dopo questi giorni.
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button onclick="autoArchive&&autoArchive().then(n=>toast(n>0?n+' ordini archiviati!':'Nessun ordine da archiviare','info'))" style="padding:6px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;color:var(--text)">🔄 Archivia ora</button>
        <button onclick="App.navigate('pipeline');setTimeout(()=>PipelineArchivePatch?.showArchive(),400)" style="padding:6px 14px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;color:var(--primary)">📦 Vedi archivio</button>
      </div>`;

    const lastSection = sections[sections.length-1];
    lastSection.parentNode?.insertBefore(archiveCard, lastSection.nextSibling);
    (console.info||console.log)('[ArchiveSettings] Wired ✅');
  };
  setTimeout(tryWire, 2500);
})();


// ═══════════════════════════════════════════════════════════════════════
// 5. GLOBAL KEYBOARD SHORTCUT HELP (? key)
// ═══════════════════════════════════════════════════════════════════════
// shortcuts-help-modal handled above

