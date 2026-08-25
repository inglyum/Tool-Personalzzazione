
// ════════════════════════════════════════════════════════════════════════
// INGLY OS — IMMAGINE PRODOTTO NEL QUOTER & GESTIONE ORDINI
// Aggiunge: upload foto + misure + materiale nel Quoter
// Mostra: immagine + specifiche tecniche nel modal ordine
// ════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 1. IMAGE + SPECS STORE — persistenza dati tecnici ordine/preventivo
// ═══════════════════════════════════════════════════════════════════════
const OrderSpecs = {
  _SK: 'ingly_order_specs_v2',

  get(orderId) {
    try {
      const all = JSON.parse(localStorage.getItem(this._SK) || '{}');
      return all[String(orderId)] || null;
    } catch { return null; }
  },

  save(orderId, specs) {
    try {
      const all = JSON.parse(localStorage.getItem(this._SK) || '{}');
      all[String(orderId)] = { ...specs, updatedAt: new Date().toISOString() };
      // Limit: 200 entries max
      const keys = Object.keys(all);
      if (keys.length > 200) {
        const oldest = keys.sort((a, b) => (all[a].updatedAt||'') < (all[b].updatedAt||'') ? -1 : 1).slice(0, keys.length - 150);
        oldest.forEach(k => delete all[k]);
      }
      localStorage.setItem(this._SK, JSON.stringify(all));
    } catch(e) {
      console.warn('[OrderSpecs] save error:', e.message);
    }
  },

  // Transfer specs when creating order from quoter
  transferFromQuoter(newOrderId) {
    const quoterSpecs = this.get('quoter_current');
    if (quoterSpecs) {
      this.save(newOrderId, quoterSpecs);
    }
  },

  clearQuoterCurrent() {
    try {
      const all = JSON.parse(localStorage.getItem(this._SK) || '{}');
      delete all['quoter_current'];
      localStorage.setItem(this._SK, JSON.stringify(all));
    } catch {}
  },
};
window.OrderSpecs = OrderSpecs;


// ═══════════════════════════════════════════════════════════════════════
// 2. QUOTER PANEL — panel immagine + specifiche nel smart quoter
// ═══════════════════════════════════════════════════════════════════════
const QuoterImagePanel = {

  inject() {
    if (document.getElementById('quoter-image-panel')) return;

    // Find the quoter right panel or q-notes area
    const notesArea = document.getElementById('q-notes')?.closest('.form-group') ||
                      document.getElementById('q-notes')?.parentElement;
    if (!notesArea) return;

    const panel = document.createElement('div');
    panel.id = 'quoter-image-panel';
    panel.style.cssText = 'margin-top:10px;border:1.5px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg-card2)';
    panel.innerHTML = `
    <div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;cursor:pointer"
      onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
      <span style="font-size:14px">📐</span>
      <div style="font-size:12px;font-weight:700">Foto & Specifiche Tecniche</div>
      <span style="margin-left:auto;font-size:9px;color:var(--text-dim)">misure · materiale · foto riferimento</span>
    </div>

    <div id="qip-body" style="padding:12px 14px;display:block">
      <!-- Image upload -->
      <div style="margin-bottom:10px">
        <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px">📷 Foto prodotto / riferimento</label>
        <div id="qip-img-preview" style="width:100%;height:160px;background:var(--bg-card);border-radius:8px;border:2px dashed var(--border);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;position:relative"
          onclick="document.getElementById('qip-file').click()"
          ondragover="event.preventDefault();this.style.borderColor='var(--primary)'"
          ondragleave="this.style.borderColor='var(--border)'"
          ondrop="event.preventDefault();QuoterImagePanel._handleFileDrop(event)">
          <span style="font-size:28px;opacity:.3" id="qip-placeholder">📷</span>
          <div style="font-size:11px;color:var(--text-dim);margin-top:4px" id="qip-placeholder-text">Clicca o trascina la foto</div>
          <img id="qip-preview-img" style="display:none;width:100%;height:100%;object-fit:cover;position:absolute;inset:0" alt="">
        </div>
        <input type="file" id="qip-file" accept="image/*" style="display:none" onchange="QuoterImagePanel._loadFile(this.files[0])">
        <div id="qip-img-actions" style="display:none;margin-top:4px;display:flex;gap:5px">
          <button onclick="QuoterImagePanel._clearImage()" style="padding:3px 8px;background:#ef444415;border:1px solid #ef444430;border-radius:5px;cursor:pointer;font-size:10px;color:#ef4444">🗑 Rimuovi</button>
          <button onclick="document.getElementById('qip-file').click()" style="padding:3px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:10px;color:var(--text-muted)">↺ Cambia</button>
        </div>
      </div>

      <!-- Technical specs grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">📏 Larghezza (mm)</label>
          <input id="qip-width" type="number" class="form-control" placeholder="es. 200" style="font-size:12px" min="0" step="1" oninput="QuoterImagePanel._autoSave()">
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">📏 Altezza (mm)</label>
          <input id="qip-height" type="number" class="form-control" placeholder="es. 150" style="font-size:12px" min="0" step="1" oninput="QuoterImagePanel._autoSave()">
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">🪵 Spessore (mm)</label>
          <input id="qip-thickness" type="number" class="form-control" placeholder="es. 3" style="font-size:12px" min="0" step="0.5" oninput="QuoterImagePanel._autoSave()">
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">🔢 Quantità</label>
          <input id="qip-qty-spec" type="number" class="form-control" placeholder="es. 1" style="font-size:12px" min="1" step="1" value="1" oninput="QuoterImagePanel._autoSave()">
        </div>
      </div>

      <div style="margin-bottom:6px">
        <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">🪵 Materiale</label>
        <select id="qip-material" class="form-control" style="font-size:12px" onchange="QuoterImagePanel._autoSave()">
          <option value="">— Seleziona materiale —</option>
          <optgroup label="Legno">
            <option>MDF 3mm</option><option>MDF 6mm</option><option>Betulla 3mm</option><option>Betulla 6mm</option>
            <option>Compensato 4mm</option><option>Noce 3mm</option><option>Balsa 2mm</option><option>Legno massello</option>
          </optgroup>
          <optgroup label="Acrilico">
            <option>Acrilico Trasparente 3mm</option><option>Acrilico Bianco 3mm</option>
            <option>Acrilico Colorato 3mm</option><option>Acrilico Specchio 3mm</option><option>Acrilico 6mm</option>
          </optgroup>
          <optgroup label="Altri">
            <option>Sughero 3mm</option><option>Sughero 6mm</option><option>Cartone 2mm</option>
            <option>Pelle</option><option>Tessuto</option><option>Ceramica</option><option>Pietra</option>
          </optgroup>
          <option value="custom">✏️ Altro (specificare)</option>
        </select>
      </div>

      <div id="qip-material-custom" style="display:none;margin-bottom:6px">
        <input id="qip-material-text" class="form-control" placeholder="Specifica materiale..." style="font-size:12px" oninput="QuoterImagePanel._autoSave()">
      </div>

      <div>
        <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">✏️ Note tecniche</label>
        <textarea id="qip-tech-notes" class="form-control" rows="2" placeholder="Es. incisione fronte/retro, fori ø8mm, bordi smussati..." style="font-size:11px;resize:none" oninput="QuoterImagePanel._autoSave()"></textarea>
      </div>
    </div>`;

    notesArea.parentNode.insertBefore(panel, notesArea.nextSibling);

    // Wire material custom input
    document.getElementById('qip-material')?.addEventListener('change', (e) => {
      const custom = document.getElementById('qip-material-custom');
      if (custom) custom.style.display = e.target.value === 'custom' ? 'block' : 'none';
      this._autoSave();
    });

    // Load any existing specs for current quoter session
    this._loadCurrent();
  },

  _handleFileDrop(e) {
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) this._loadFile(file);
  },

  _loadFile(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      if (typeof toast !== 'undefined') toast('⚠️ Immagine troppo grande (max 2MB)', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target.result;
      const img = document.getElementById('qip-preview-img');
      const ph  = document.getElementById('qip-placeholder');
      const pht = document.getElementById('qip-placeholder-text');
      const act = document.getElementById('qip-img-actions');
      if (img) { img.src = b64; img.style.display = 'block'; }
      if (ph)  ph.style.display = 'none';
      if (pht) pht.style.display = 'none';
      if (act) act.style.display = 'flex';
      this._currentImage = b64;
      this._autoSave();
      if (typeof toast !== 'undefined') toast('📷 Foto caricata!', 'success');
    };
    reader.readAsDataURL(file);
  },

  _clearImage() {
    this._currentImage = null;
    const img = document.getElementById('qip-preview-img');
    const ph  = document.getElementById('qip-placeholder');
    const pht = document.getElementById('qip-placeholder-text');
    const act = document.getElementById('qip-img-actions');
    if (img) { img.src = ''; img.style.display = 'none'; }
    if (ph)  ph.style.display = 'block';
    if (pht) pht.style.display = 'block';
    if (act) act.style.display = 'none';
    this._autoSave();
  },

  _currentImage: null,

  getSpecs() {
    const mat = document.getElementById('qip-material')?.value || '';
    const matText = document.getElementById('qip-material-text')?.value || '';
    return {
      image:     this._currentImage || null,
      width:     parseFloat(document.getElementById('qip-width')?.value || '0') || null,
      height:    parseFloat(document.getElementById('qip-height')?.value || '0') || null,
      thickness: parseFloat(document.getElementById('qip-thickness')?.value || '0') || null,
      qty:       parseInt(document.getElementById('qip-qty-spec')?.value || '1') || 1,
      material:  mat === 'custom' ? matText : mat,
      techNotes: document.getElementById('qip-tech-notes')?.value || '',
    };
  },

  _autoSave() {
    const specs = this.getSpecs();
    OrderSpecs.save('quoter_current', specs);
  },

  _loadCurrent() {
    const specs = OrderSpecs.get('quoter_current');
    if (!specs) return;
    if (specs.image) {
      this._currentImage = specs.image;
      const img = document.getElementById('qip-preview-img');
      const ph  = document.getElementById('qip-placeholder');
      const pht = document.getElementById('qip-placeholder-text');
      const act = document.getElementById('qip-img-actions');
      if (img) { img.src = specs.image; img.style.display = 'block'; }
      if (ph)  ph.style.display = 'none';
      if (pht) pht.style.display = 'none';
      if (act) act.style.display = 'flex';
    }
    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    setVal('qip-width', specs.width);
    setVal('qip-height', specs.height);
    setVal('qip-thickness', specs.thickness);
    setVal('qip-qty-spec', specs.qty);
    setVal('qip-tech-notes', specs.techNotes);
    if (specs.material) {
      const sel = document.getElementById('qip-material');
      if (sel) {
        // Try to find exact match in options
        const opts = Array.from(sel.options).map(o => o.value);
        if (opts.includes(specs.material)) {
          sel.value = specs.material;
        } else if (specs.material) {
          sel.value = 'custom';
          const custom = document.getElementById('qip-material-custom');
          const customInput = document.getElementById('qip-material-text');
          if (custom) custom.style.display = 'block';
          if (customInput) customInput.value = specs.material;
        }
      }
    }
  },

  clear() {
    this._currentImage = null;
    ['qip-width','qip-height','qip-thickness','qip-qty-spec','qip-tech-notes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = id === 'qip-qty-spec' ? '1' : '';
    });
    const sel = document.getElementById('qip-material');
    if (sel) sel.selectedIndex = 0;
    const act = document.getElementById('qip-img-actions');
    if (act) act.style.display = 'none';
    const img = document.getElementById('qip-preview-img');
    if (img) { img.src = ''; img.style.display = 'none'; }
    const ph  = document.getElementById('qip-placeholder');
    const pht = document.getElementById('qip-placeholder-text');
    if (ph)  ph.style.display = 'block';
    if (pht) pht.style.display = 'block';
    OrderSpecs.clearQuoterCurrent();
  },
};
window.QuoterImagePanel = QuoterImagePanel;


// ═══════════════════════════════════════════════════════════════════════
// 3. PATCH sendToWorkflow — porta specs all'ordine
// ═══════════════════════════════════════════════════════════════════════
(function patchSendToWorkflow() {
  const tryPatch = () => {
    if (typeof GestioneOrdini === 'undefined') return setTimeout(tryPatch, 600);
    if (GestioneOrdini.__specsPatch) return;
    GestioneOrdini.__specsPatch = true;

    const origSave = GestioneOrdini._saveOrderFromQuoter.bind(GestioneOrdini);
    GestioneOrdini._saveOrderFromQuoter = async function(data) {
      // Add specs from QuoterImagePanel
      if (typeof QuoterImagePanel !== 'undefined') {
        data.specs = QuoterImagePanel.getSpecs();
      }
      const order = await origSave(data);
      if (order && order.id && data.specs) {
        OrderSpecs.save(order.id, data.specs);
      }
      return order;
    };
    console.log('[OrderSpecs] sendToWorkflow patched ✅');
  };
  setTimeout(tryPatch, 1500);
})();


// ═══════════════════════════════════════════════════════════════════════
// 4. PATCH _openDetail — mostra immagine + specs nel modal ordine
// ═══════════════════════════════════════════════════════════════════════
(function patchOrderDetail() {
  const tryPatch = () => {
    if (typeof GestioneOrdini === 'undefined') return setTimeout(tryPatch, 600);
    if (GestioneOrdini.__imageDetailPatch) return;
    GestioneOrdini.__imageDetailPatch = true;

    const origDetail = GestioneOrdini._openDetail.bind(GestioneOrdini);
    GestioneOrdini._openDetail = async function(id) {
      await origDetail(id);
      // Inject specs panel into modal after it opens
      setTimeout(() => _injectSpecsInModal(id), 150);
    };
    console.log('[OrderSpecs] _openDetail patched ✅');
  };
  setTimeout(tryPatch, 1600);
})();

function _injectSpecsInModal(orderId) {
  const modal = document.getElementById('go-detail-modal');
  if (!modal || modal.querySelector('.order-specs-panel')) return;

  const specs = OrderSpecs.get(orderId);

  // Find insertion point — before the action buttons section
  const body = modal.querySelector('[style*="padding:14px 18px"]');
  if (!body) return;

  const panel = document.createElement('div');
  panel.className = 'order-specs-panel';
  panel.style.cssText = 'margin-bottom:10px;border-radius:10px;overflow:hidden;border:1px solid var(--border)';

  const hasSpecs = specs && (specs.image || specs.width || specs.material || specs.techNotes);

  panel.innerHTML = `
  <div style="background:var(--bg-card2);padding:0">
    <!-- Header toggle -->
    <div style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid var(--border);cursor:pointer"
      onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
      <span style="font-size:14px">📐</span>
      <div style="font-size:12px;font-weight:700">Specifiche Tecniche${hasSpecs ? ' <span style="color:#22c55e;font-size:10px">● Compilate</span>':''}</div>
      <span style="margin-left:auto;font-size:10px;color:var(--text-dim)">${hasSpecs ? 'Vedi dettagli' : 'Aggiungi'} ▼</span>
    </div>

    <div style="display:${hasSpecs ? 'block' : 'none'}">
      <!-- Image + specs side by side -->
      <div style="display:grid;grid-template-columns:${specs?.image ? '160px 1fr' : '1fr'};gap:0">
        ${specs?.image ? `
        <div style="border-right:1px solid var(--border)">
          <img src="${specs.image}" style="width:100%;height:160px;object-fit:cover;display:block" alt="Prodotto"
            onerror="this.parentElement.style.display='none'">
        </div>` : ''}

        <div style="padding:10px 12px">
          ${specs?.material ? `
          <div style="margin-bottom:7px">
            <div style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:2px">Materiale</div>
            <div style="font-size:12px;font-weight:700">🪵 ${specs.material}</div>
          </div>` : ''}

          ${specs?.width || specs?.height || specs?.thickness ? `
          <div style="margin-bottom:7px">
            <div style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:3px">Dimensioni</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${specs.width ? `<span style="padding:2px 8px;background:var(--bg-card);border-radius:4px;font-size:11px;font-weight:700">L ${specs.width}mm</span>` : ''}
              ${specs.height ? `<span style="padding:2px 8px;background:var(--bg-card);border-radius:4px;font-size:11px;font-weight:700">H ${specs.height}mm</span>` : ''}
              ${specs.thickness ? `<span style="padding:2px 8px;background:var(--bg-card);border-radius:4px;font-size:11px;font-weight:700">Sp ${specs.thickness}mm</span>` : ''}
              ${specs.qty && specs.qty > 1 ? `<span style="padding:2px 8px;background:var(--primary-dim);color:var(--primary);border-radius:4px;font-size:11px;font-weight:700">×${specs.qty} pz</span>` : ''}
            </div>
          </div>` : ''}

          ${specs?.techNotes ? `
          <div>
            <div style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:2px">Note tecniche</div>
            <div style="font-size:11px;color:var(--text-muted);line-height:1.5">${specs.techNotes}</div>
          </div>` : ''}

          ${!hasSpecs ? `<div style="font-size:11px;color:var(--text-dim);text-align:center;padding:16px">Nessuna specifica tecnica</div>` : ''}
        </div>
      </div>

      <!-- Edit specs button -->
      <div style="padding:8px 12px;border-top:1px solid var(--border);display:flex;gap:6px">
        <button onclick="_openSpecsEditor(${orderId})"
          style="flex:1;padding:6px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-muted)">
          ✏️ Modifica specifiche
        </button>
        ${specs?.image ? `
        <button onclick="window.open('${specs.image}','_blank')"
          style="padding:6px 10px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:6px;cursor:pointer;font-size:11px;color:var(--primary)">
          🔍 Ingrandisci
        </button>` : ''}
      </div>
    </div>
  </div>`;

  body.insertBefore(panel, body.firstChild);
}

// ═══════════════════════════════════════════════════════════════════════
// 5. SPECS EDITOR — modifica specifiche direttamente da un ordine
// ═══════════════════════════════════════════════════════════════════════
function _openSpecsEditor(orderId) {
  document.getElementById('specs-editor-modal')?.remove();
  const specs = OrderSpecs.get(orderId) || {};

  const modal = document.createElement('div');
  modal.id = 'specs-editor-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:#000c;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
  <div style="background:var(--bg-card);border-radius:14px;width:min(560px,96vw);max-height:90vh;overflow-y:auto;border:1px solid var(--border2);box-shadow:0 24px 64px #000d">
    <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;position:sticky;top:0;background:var(--bg-card);z-index:5">
      <span style="font-size:18px">📐</span>
      <div style="flex:1;font-size:14px;font-weight:800">Specifiche Tecniche Ordine</div>
      <button onclick="document.getElementById('specs-editor-modal').remove()" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">✕</button>
    </div>
    <div style="padding:16px 18px;display:flex;flex-direction:column;gap:10px">

      <!-- Image upload -->
      <div>
        <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:5px">📷 Foto prodotto / riferimento</label>
        <div id="se-img-wrap" style="width:100%;height:180px;background:var(--bg-card2);border-radius:8px;border:2px dashed var(--border);overflow:hidden;position:relative;cursor:pointer"
          onclick="document.getElementById('se-file').click()"
          ondragover="event.preventDefault()" ondrop="event.preventDefault();_seHandleDrop(event,${orderId})">
          ${specs.image
            ? `<img src="${specs.image}" style="width:100%;height:100%;object-fit:cover" id="se-img">`
            : `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px"><span style="font-size:32px;opacity:.25">📷</span><div style="font-size:11px;color:var(--text-dim)">Clicca o trascina immagine</div></div>`
          }
        </div>
        <input type="file" id="se-file" accept="image/*" style="display:none"
          onchange="_seLoadFile(this.files[0],${orderId})">
        <div style="display:flex;gap:5px;margin-top:5px">
          <button onclick="_seLoadFromURL(${orderId})" style="padding:4px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:10px;color:var(--text-muted)">🔗 Da URL</button>
          ${specs.image ? `<button onclick="_seClearImg(${orderId})" style="padding:4px 10px;background:#ef444415;border:1px solid #ef444430;border-radius:5px;cursor:pointer;font-size:10px;color:#ef4444">🗑 Rimuovi</button>` : ''}
        </div>
      </div>

      <!-- Specs grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">Larghezza (mm)</label>
          <input id="se-w" type="number" class="form-control" value="${specs.width||''}" placeholder="es. 200" style="font-size:12px">
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">Altezza (mm)</label>
          <input id="se-h" type="number" class="form-control" value="${specs.height||''}" placeholder="es. 150" style="font-size:12px">
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">Spessore (mm)</label>
          <input id="se-t" type="number" class="form-control" value="${specs.thickness||''}" placeholder="es. 3" style="font-size:12px">
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">Quantità</label>
          <input id="se-qty" type="number" class="form-control" value="${specs.qty||1}" min="1" style="font-size:12px">
        </div>
      </div>

      <div>
        <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">Materiale</label>
        <input id="se-mat" class="form-control" value="${specs.material||''}" placeholder="es. MDF 3mm, Betulla, Acrilico..." style="font-size:12px" list="se-mat-list">
        <datalist id="se-mat-list">
          ${['MDF 3mm','MDF 6mm','Betulla 3mm','Betulla 6mm','Compensato 4mm',
             'Acrilico Trasparente 3mm','Acrilico Bianco 3mm','Acrilico Colorato 3mm',
             'Acrilico Specchio 3mm','Sughero 3mm','Pelle','Ceramica'].map(m=>`<option value="${m}">`).join('')}
        </datalist>
      </div>

      <div>
        <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">Note tecniche</label>
        <textarea id="se-notes" class="form-control" rows="3" placeholder="Dettagli lavorazione, finitura richiesta, file di riferimento..." style="font-size:12px;resize:vertical">${specs.techNotes||''}</textarea>
      </div>

      <div style="display:flex;gap:8px;padding-top:4px">
        <button onclick="document.getElementById('specs-editor-modal').remove()" style="flex:1;padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px">Annulla</button>
        <button onclick="_seSave(${orderId})" style="flex:2;padding:9px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva specifiche</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

window._openSpecsEditor = _openSpecsEditor;

// Helper functions for specs editor
function _seLoadFile(file, orderId) {
  if (!file || !file.type.startsWith('image/')) return;
  if (file.size > 2*1024*1024) { if(typeof toast!=='undefined') toast('Max 2MB','warning'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const b64 = e.target.result;
    // Update preview
    const wrap = document.getElementById('se-img-wrap');
    if (wrap) wrap.innerHTML = `<img src="${b64}" style="width:100%;height:100%;object-fit:cover" id="se-img">`;
    // Store temp
    window._seCurrentImg = b64;
  };
  reader.readAsDataURL(file);
}
window._seLoadFile = _seLoadFile;

function _seHandleDrop(e, orderId) {
  const file = e.dataTransfer?.files[0];
  if (file) _seLoadFile(file, orderId);
}
window._seHandleDrop = _seHandleDrop;

function _seClearImg(orderId) {
  window._seCurrentImg = null;
  const wrap = document.getElementById('se-img-wrap');
  if (wrap) wrap.innerHTML = `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px"><span style="font-size:32px;opacity:.25">📷</span><div style="font-size:11px;color:var(--text-dim)">Clicca o trascina immagine</div></div>`;
}
window._seClearImg = _seClearImg;

function _seLoadFromURL(orderId) {
  const url = prompt('Incolla URL immagine:');
  if (!url || !url.startsWith('http')) return;
  const wrap = document.getElementById('se-img-wrap');
  if (wrap) wrap.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover" id="se-img" onerror="this.parentElement.innerHTML='<div style=&quot;padding:20px;color:#ef4444;text-align:center;font-size:11px&quot;>Immagine non caricabile</div>'">`;
  window._seCurrentImg = url;
}
window._seLoadFromURL = _seLoadFromURL;

function _seSave(orderId) {
  const img = window._seCurrentImg !== undefined
    ? window._seCurrentImg
    : (document.getElementById('se-img')?.src || null);

  const specs = {
    image:     img && img.length > 5 ? img : null,
    width:     parseFloat(document.getElementById('se-w')?.value) || null,
    height:    parseFloat(document.getElementById('se-h')?.value) || null,
    thickness: parseFloat(document.getElementById('se-t')?.value) || null,
    qty:       parseInt(document.getElementById('se-qty')?.value) || 1,
    material:  document.getElementById('se-mat')?.value || '',
    techNotes: document.getElementById('se-notes')?.value || '',
  };
  OrderSpecs.save(orderId, specs);
  window._seCurrentImg = undefined;
  document.getElementById('specs-editor-modal')?.remove();
  // Refresh the order detail modal specs panel
  document.querySelector('.order-specs-panel')?.remove();
  _injectSpecsInModal(orderId);
  if (typeof toast !== 'undefined') toast('✅ Specifiche salvate!', 'success');
}
window._seSave = _seSave;


// ═══════════════════════════════════════════════════════════════════════
// 6. PATCH PDF — includi immagine e specifiche nel PDF preventivo
// ═══════════════════════════════════════════════════════════════════════
(function patchPDFWithSpecs() {
  const orig = window._buildQuoteHTML;
  if (typeof orig !== 'function') return setTimeout(patchPDFWithSpecs, 1000);
  window._buildQuoteHTML = function(data, tplId, cfg) {
    let html = orig(data, tplId, cfg);
    const specs = OrderSpecs.get('quoter_current');
    if (!specs || (!specs.image && !specs.width && !specs.material)) return html;

    // Build specs section HTML
    const specsHTML = `
    <div style="margin:20px 40px;padding:14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;display:flex;gap:14px">
      ${specs.image ? `<img src="${specs.image}" style="width:120px;height:120px;object-fit:cover;border-radius:6px;flex-shrink:0" onerror="this.remove()">` : ''}
      <div style="flex:1">
        <div style="font-size:10px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📐 Specifiche Tecniche</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">
          ${specs.material ? `<span style="padding:3px 9px;background:#e0e7ff;color:#4338ca;border-radius:99px;font-size:11px;font-weight:700">🪵 ${specs.material}</span>` : ''}
          ${specs.width ? `<span style="padding:3px 9px;background:#f1f5f9;color:#475569;border-radius:99px;font-size:11px">L ${specs.width}mm</span>` : ''}
          ${specs.height ? `<span style="padding:3px 9px;background:#f1f5f9;color:#475569;border-radius:99px;font-size:11px">H ${specs.height}mm</span>` : ''}
          ${specs.thickness ? `<span style="padding:3px 9px;background:#f1f5f9;color:#475569;border-radius:99px;font-size:11px">Sp ${specs.thickness}mm</span>` : ''}
          ${specs.qty > 1 ? `<span style="padding:3px 9px;background:#dcfce7;color:#15803d;border-radius:99px;font-size:11px;font-weight:700">×${specs.qty} pz</span>` : ''}
        </div>
        ${specs.techNotes ? `<div style="font-size:11px;color:#64748b;line-height:1.5">${specs.techNotes}</div>` : ''}
      </div>
    </div>`;

    // Insert before totals section in the HTML
    html = html.replace('<div class="totals-box">', specsHTML + '<div class="totals-box">');
    return html;
  };
})();


// ═══════════════════════════════════════════════════════════════════════
// 7. INSTALL — inject panel when quoter loads
// ═══════════════════════════════════════════════════════════════════════
(function installOrderSpecs() {
  const tryInstall = () => {
    if (typeof App === 'undefined') return setTimeout(tryInstall, 800);
    if (App.__orderSpecsPatch) return;
    App.__orderSpecsPatch = true;

    // Patch renderSection to inject panel when quoter renders
    const origRS = App.renderSection?.bind(App);
    if (origRS) {
      App.renderSection = function(s) {
        origRS(s);
        if (s === 'quoter') {
          setTimeout(() => QuoterImagePanel.inject(), 400);
        }
      };
    }

    // If already on quoter, inject now
    if (App.currentSection === 'quoter') {
      setTimeout(() => QuoterImagePanel.inject(), 500);
    }

    console.log('[OrderSpecs] Installed ✅');
  };
  setTimeout(tryInstall, 2000);
})();

console.log('[INGLY OS] Order Image & Specs loaded ✅');

