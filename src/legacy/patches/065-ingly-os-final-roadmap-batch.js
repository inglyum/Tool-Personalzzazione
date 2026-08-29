
// ════════════════════════════════════════════════════════════════════════
// INGLY OS — FINAL ROADMAP BATCH
// 1. Supplier Intelligence v2   2. Quick Capture++ (voice+text)
// 3. Multi-lingua Preventivo    4. Live Price Compare Etsy
// 5. Barcode Scanner            6. Global Search   7. Keyboard shortcuts
// ════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 1. SUPPLIER INTELLIGENCE v2 — gestione fornitori avanzata
// ═══════════════════════════════════════════════════════════════════════
const SupplierIntelligence = {
  _SK: 'ingly_suppliers_v1',

  DEFAULTS: [
    { id:1, name:'Laserplust',    cat:'materiali', url:'https://laserplust.it', specialty:'MDF Birch, compensato', rating:5, notes:'Spedizione veloce, ottima qualità MDF 3mm', lastOrder:null },
    { id:2, name:'Necchishop',    cat:'materiali', url:'https://necchishop.com', specialty:'Acrilico cast, plexy', rating:5, notes:'Miglior acrilico colato per incisioni', lastOrder:null },
    { id:3, name:'CPL Fabbrika',  cat:'materiali', url:'https://cplfabbrika.com', specialty:'Application tape, vinile', rating:4, notes:'Rotoli larghi 60cm, spedizione gratis > €50', lastOrder:null },
    { id:4, name:'Graffitishop',  cat:'finitura',  url:'https://graffitishop.it', specialty:'Vernici spray MTN', rating:5, notes:'Spedizione DHL veloce, campioni inclusi', lastOrder:null },
    { id:5, name:'Amazon IT',     cat:'generale',  url:'https://amazon.it', specialty:'Varie categorie', rating:3, notes:'Comodo ma prezzi non sempre competitivi', lastOrder:null },
    { id:6, name:'IKEA',          cat:'studio',    url:'https://ikea.com/it', specialty:'Skådis, arredamento lab', rating:4, notes:'Click & Collect disponibile', lastOrder:null },
  ],

  getAll() {
    try { const s=JSON.parse(localStorage.getItem(this._SK)||'null'); return s||[...this.DEFAULTS]; }
    catch { return [...this.DEFAULTS]; }
  },

  save(suppliers) { localStorage.setItem(this._SK, JSON.stringify(suppliers)); },

  async render() {
    const el = document.getElementById('view-supplier_intel');
    if(!el) return;
    const suppliers = this.getAll();

    const cats = ['tutti','materiali','finitura','sublimazione','studio','generale'];
    const filter = this._filter || 'tutti';

    const filtered = filter === 'tutti' ? suppliers : suppliers.filter(s=>s.cat===filter);

    el.innerHTML = `
    <div style="padding:16px 20px;max-width:1100px;margin:0 auto">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:2px solid var(--border)">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#0ea5e9,#0284c7);display:flex;align-items:center;justify-content:center;font-size:22px">🏭</div>
        <div style="flex:1"><h2 style="margin:0 0 3px;font-size:19px;font-weight:900">Gestione Fornitori</h2>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">${suppliers.length} fornitori · Storico ordini e rating</p></div>
        <button onclick="SupplierIntelligence._openModal(null)"
          style="padding:8px 16px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:800">+ Fornitore</button>
      </div>

      <!-- Category tabs -->
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:14px">
        ${cats.map(cat=>`<button onclick="SupplierIntelligence._filter='${cat}';SupplierIntelligence.render()"
          style="padding:5px 12px;background:${filter===cat?'var(--primary-dim)':'var(--bg-card2)'};border:1.5px solid ${filter===cat?'var(--primary)':'var(--border)'};border-radius:20px;cursor:pointer;font-size:11px;font-weight:${filter===cat?700:500};color:${filter===cat?'var(--primary)':'var(--text-muted)'}">
          ${cat.charAt(0).toUpperCase()+cat.slice(1)}
        </button>`).join('')}
      </div>

      <!-- Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px">
        ${filtered.map(s => this._card(s)).join('')}
      </div>
    </div>`;
  },

  _card(s) {
    const stars = '⭐'.repeat(s.rating||0) + '☆'.repeat(5-(s.rating||0));
    const catColors = {materiali:'#0ea5e9',finitura:'#ec4899',sublimazione:'#f97316',studio:'#8b5cf6',generale:'#64748b'};
    const color = catColors[s.cat] || '#64748b';
    return `
    <div style="background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);padding:14px 16px;border-left:3px solid ${color};transition:.15s"
      onmouseover="this.style.borderColor='${color}'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:800;color:var(--text)">${s.name}</div>
          <div style="font-size:10px;color:${color};font-weight:700;text-transform:uppercase;letter-spacing:.5px">${s.cat}</div>
        </div>
        <div style="font-size:11px;letter-spacing:-1px">${stars}</div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">📦 ${s.specialty||'—'}</div>
      ${s.notes?`<div style="font-size:10px;color:var(--text-dim);font-style:italic;padding:5px 8px;background:var(--bg-card);border-radius:5px;margin-bottom:8px">💡 ${s.notes}</div>`:''}
      <div style="display:flex;gap:6px;align-items:center">
        ${s.url?`<a href="${s.url}" target="_blank" rel="noopener" style="padding:4px 10px;background:var(--primary-dim);color:var(--primary);border:1px solid var(--primary-border);border-radius:5px;font-size:10px;font-weight:700;text-decoration:none">🔗 Sito</a>`:''}
        <button onclick="SupplierIntelligence._openModal(${s.id})" style="padding:4px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:10px">✏️</button>
        <button onclick="SupplierIntelligence._contact(${s.id})" style="padding:4px 8px;background:#25D36615;border:1px solid #25D36630;border-radius:5px;cursor:pointer;font-size:10px;color:#25D366">💬 WA</button>
        <span style="margin-left:auto;font-size:9px;color:var(--text-dim)">${s.lastOrder?'Ultimo: '+new Date(s.lastOrder).toLocaleDateString('it-IT'):'Nessun ordine'}</span>
      </div>
    </div>`;
  },

  _openModal(id) {
    const suppliers = this.getAll();
    const s = id ? suppliers.find(x=>x.id===id) : null;
    const isNew = !s;
    const item = s || { id:Date.now(), name:'', cat:'materiali', url:'', specialty:'', rating:4, notes:'', email:'', phone:'', contactPerson:'', minOrder:0, leadTimeDays:0, paymentTerms:'', tags:'', address:'' };

    document.getElementById('_si-modal')?.remove();
    const ov = document.createElement('div');
    ov.id = '_si-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(2px)';
    ov.onclick = e=>{ if(e.target===ov) ov.remove(); };
    ov.innerHTML = `
    <div style="background:var(--bg-card);border-radius:16px;width:min(640px,100%);max-height:90vh;overflow-y:auto;border:1px solid var(--border2);box-shadow:0 24px 60px rgba(0,0,0,.5)" onclick="event.stopPropagation()">

      <!-- HEADER -->
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;position:sticky;top:0;background:var(--bg-card);z-index:1;border-radius:16px 16px 0 0">
        <div style="width:38px;height:38px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🏭</div>
        <div style="flex:1"><div style="font-size:15px;font-weight:800">${isNew?'➕ Nuovo Fornitore':'✏️ Modifica Fornitore'}</div>
        <div style="font-size:11px;color:var(--text-muted)">${isNew?'Aggiungi un nuovo fornitore al tuo archivio':'Modifica le informazioni del fornitore'}</div></div>
        <button onclick="document.getElementById('_si-modal').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:20px">✕</button>
      </div>

      <div style="padding:20px;display:flex;flex-direction:column;gap:0">

        <!-- SEZIONE: Info base -->
        <div style="margin-bottom:16px">
          <div style="font-size:10px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)">📋 Informazioni Base</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div style="grid-column:1/-1">
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Nome Fornitore *</label>
              <input id="si-name" class="form-control" value="${item.name||''}" placeholder="Es. Laserplust, Silpa, Amazon Business..." style="font-size:13px;font-weight:600">
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Categoria</label>
              <select id="si-cat" class="form-control" style="font-size:12px">
                ${['materiali','finitura','sublimazione','attrezzatura','packaging','spedizioni','studio','digitale','altro'].map(cat=>`<option value="${cat}" ${(item.cat||'materiali')===cat?'selected':''}>${cat.charAt(0).toUpperCase()+cat.slice(1)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Rating</label>
              <select id="si-rating" class="form-control" style="font-size:12px">
                ${[5,4,3,2,1].map(n=>`<option value="${n}" ${(item.rating||4)===n?'selected':''}>${'⭐'.repeat(n)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Specialità prodotti</label>
              <input id="si-spec" class="form-control" value="${item.specialty||''}" placeholder="Es. MDF 3mm, Acrilico, Betulla" style="font-size:12px">
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Sito web / Shop URL</label>
              <input id="si-url" class="form-control" value="${item.url||''}" placeholder="https://..." type="url" style="font-size:12px">
            </div>
          </div>
        </div>

        <!-- SEZIONE: Contatto -->
        <div style="margin-bottom:16px">
          <div style="font-size:10px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)">📞 Contatto</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Persona di riferimento</label>
              <input id="si-contact" class="form-control" value="${item.contactPerson||''}" placeholder="Es. Marco Rossi" style="font-size:12px">
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Email</label>
              <input id="si-email" class="form-control" type="email" value="${item.email||''}" placeholder="fornitore@..." style="font-size:12px">
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Telefono / WhatsApp</label>
              <input id="si-phone" class="form-control" value="${item.phone||''}" placeholder="+39 ..." style="font-size:12px">
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Indirizzo / Città</label>
              <input id="si-address" class="form-control" value="${item.address||''}" placeholder="Es. Milano, Italy" style="font-size:12px">
            </div>
          </div>
        </div>

        <!-- SEZIONE: Condizioni commerciali -->
        <div style="margin-bottom:16px">
          <div style="font-size:10px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)">💼 Condizioni Commerciali</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Ordine minimo (€)</label>
              <input id="si-minorder" class="form-control" type="number" min="0" value="${item.minOrder||0}" style="font-size:12px">
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Tempi consegna (gg)</label>
              <input id="si-leadtime" class="form-control" type="number" min="0" value="${item.leadTimeDays||item.avgDeliveryDays||0}" style="font-size:12px">
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Termini di pagamento</label>
              <select id="si-payment" class="form-control" style="font-size:12px">
                ${['Immediato','30 gg','60 gg','Anticipo','Carta di credito','PayPal','Bonifico'].map(t=>`<option value="${t}" ${(item.paymentTerms||'')===t?'selected':''}>${t}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- SEZIONE: Tag & Note -->
        <div style="margin-bottom:16px">
          <div style="font-size:10px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)">🏷️ Tag & Note</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Tag (separati da virgola)</label>
              <input id="si-tags" class="form-control" value="${item.tags||''}" placeholder="affidabile, rapido, bulk-discount, italiano..." style="font-size:12px">
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Note / Consigli d'uso</label>
              <textarea id="si-notes" class="form-control" rows="3" placeholder="Es. Spedisce il martedì, sconto 10% sopra €500, imballaggio fragile..." style="font-size:12px;resize:vertical">${item.notes||''}</textarea>
            </div>
          </div>
        </div>

        ${!isNew && (item.totalSpent||0)>0?`
        <!-- SEZIONE: Statistiche -->
        <div style="background:var(--bg-card2);border-radius:10px;padding:12px 14px;margin-bottom:16px;border:1px solid var(--border)">
          <div style="font-size:10px;font-weight:800;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">📊 Storico Ordini</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            <div style="text-align:center"><div style="font-size:16px;font-weight:900;color:#22c55e">€${Math.round(item.totalSpent||0)}</div><div style="font-size:9px;color:var(--text-muted)">Totale speso</div></div>
            <div style="text-align:center"><div style="font-size:16px;font-weight:900;color:#60a5fa">${item.orderCount||0}</div><div style="font-size:9px;color:var(--text-muted)">Ordini</div></div>
            <div style="text-align:center"><div style="font-size:16px;font-weight:900;color:#f59e0b">${item.lastOrder?new Date(item.lastOrder).toLocaleDateString('it-IT',{day:'2-digit',month:'short'}):'Mai'}</div><div style="font-size:9px;color:var(--text-muted)">Ultimo ordine</div></div>
          </div>
        </div>`:''}

        <!-- FOOTER BUTTONS -->
        <div style="display:flex;gap:8px;padding-top:4px;border-top:1px solid var(--border)">
          <button onclick="document.getElementById('_si-modal').remove()" style="flex:1;padding:11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;color:var(--text-muted)">Annulla</button>
          ${!isNew?`<button onclick="SupplierIntelligence._del(${item.id})" style="padding:11px 14px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;cursor:pointer;font-size:13px;color:#ef4444;font-weight:700">🗑 Elimina</button>`:''}
          <button onclick="SupplierIntelligence._save(${item.id},${isNew})" style="flex:2;padding:11px;background:var(--primary);color:#000;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">💾 ${isNew?'Aggiungi Fornitore':'Salva Modifiche'}</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    document.getElementById('si-name')?.focus();
  },

  _save(id, isNew) {
    const v = sel=>document.getElementById(sel)?.value||'';
    const item = { id: isNew?Date.now():id, name:v('si-name'), cat:v('si-cat'), rating:+(v('si-rating')||4), url:v('si-url'), specialty:v('si-spec'), notes:v('si-notes') };
    if(!item.name){ if(typeof toast!=='undefined') toast('Inserisci il nome','warning'); return; }
    const all = this.getAll();
    if(isNew) all.push(item); else { const i=all.findIndex(x=>x.id===id); if(i>=0) all[i]=item; }
    this.save(all);
    document.querySelector('[style*="fixed"][style*="align-items:center"]')?.remove();
    this.render();
    if(typeof toast!=='undefined') toast('✅ Fornitore salvato!','success');
  },

  _del(id) {
    if(!confirm('Eliminare fornitore?')) return;
    this.save(this.getAll().filter(s=>s.id!==id));
    document.querySelector('[style*="fixed"][style*="align-items:center"]')?.remove();
    this.render();
  },

  _contact(id) {
    const s = this.getAll().find(x=>x.id===id);
    if(!s) return;
    const cp = typeof CompanyProfile!=='undefined'?CompanyProfile.get():{};
    const text = `Salve ${s.name},\n\nSono ${cp.name||'un artigiano'} interessato ai vostri prodotti (${s.specialty||''}).\n\nPotreste inviarmi informazioni sui prezzi e disponibilità?\n\nGrazie!`;
    window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank');
  },

  _recordOrder(id){
    const modal=document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:#000c;z-index:9999;display:flex;align-items:center;justify-content:center';
    modal.onclick=e=>{if(e.target===modal)modal.remove();};
    modal.innerHTML=`<div style="background:var(--bg-card);border-radius:12px;width:min(360px,95vw);padding:20px;border:1px solid var(--border)">
      <div style="font-size:14px;font-weight:800;margin-bottom:14px">🛒 Registra Ordine</div>
      <div style="margin-bottom:10px"><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">Importo (€)</label>
        <input id="so-amount" class="form-control" type="number" step="0.01" placeholder="0.00"></div>
      <div style="margin-bottom:10px"><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">Consegna attesa (gg)</label>
        <input id="so-days" class="form-control" type="number" value="3" min="1"></div>
      <div style="margin-bottom:14px"><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">Note</label>
        <input id="so-notes" class="form-control" placeholder="Es. MDF 3mm x 20 fogli"></div>
      <div style="display:flex;gap:8px">
        <button onclick="this.closest('[style*=fixed]').remove()" style="flex:1;padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer">Annulla</button>
        <button onclick="SupplierIntelligence._saveOrder(${id})" style="flex:1;padding:9px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:700">✅ Salva</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('so-amount')?.focus();
  },

  _saveOrder(id){
    const amount=parseFloat(document.getElementById('so-amount')?.value||0);
    const days=parseInt(document.getElementById('so-days')?.value||3);
    if(!amount){if(typeof toast!=='undefined')toast('Inserisci l\'importo','warning');return;}
    const all=this.getAll();const idx=all.findIndex(s=>s.id===id);if(idx<0)return;
    all[idx].totalSpent=(all[idx].totalSpent||0)+amount;
    all[idx].orderCount=(all[idx].orderCount||0)+1;
    all[idx].lastOrder=new Date().toISOString();
    all[idx].avgDeliveryDays=days;
    if(all[idx].orderCount>1){
      if(!all[idx]._firstOrder)all[idx]._firstOrder=new Date(Date.now()-30*864e5).toISOString();
      const d=Math.floor((Date.now()-new Date(all[idx]._firstOrder).getTime())/864e5);
      all[idx].avgDaysBetween=Math.round(d/(all[idx].orderCount-1));
    }
    this.save(all);
    document.querySelector('[style*="fixed"][style*="align-items:center"]')?.remove();
    this.render();
    if(typeof toast!=='undefined')toast(`✅ Ordine €${amount} registrato!`,'success');
  }
};
window.SupplierIntelligence = SupplierIntelligence;

// ► Safe SupplierIntel alias — resolves at call time
if(typeof window !== 'undefined') {
  window._getSupplierIntel = () => {
    return window.SupplierIntel || window.SupplierIntelligence || window.SuppliersManager || null;
  };
}


// ═══════════════════════════════════════════════════════════════════════
// 2. QUICK CAPTURE++ — cattura rapida testo, URL, voce
// ═══════════════════════════════════════════════════════════════════════
const QuickCapture = {

  open(type) {
    type = type || 'text';
    document.getElementById('qc-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'qc-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:#000c;z-index:9998;display:flex;align-items:flex-end;justify-content:center;padding:0';
    modal.onclick = e=>{ if(e.target===modal) modal.remove(); };
    modal.innerHTML = `
    <div style="background:var(--bg-card);border-radius:16px 16px 0 0;width:min(600px,100vw);max-height:70vh;border:1px solid var(--border2);box-shadow:0 -8px 40px #000d;overflow-y:auto">
      <div style="width:40px;height:4px;background:var(--border);border-radius:2px;margin:10px auto 0"></div>
      <div style="padding:12px 18px;display:flex;gap:8px;border-bottom:1px solid var(--border)">
        ${[['text','✍️ Testo'],['url','🔗 URL'],['idea','💡 Idea'],['voice','🎤 Voce']].map(([t,l])=>`
        <button onclick="QuickCapture._switchType('${t}')" id="qc-tab-${t}"
          style="padding:6px 12px;background:${type===t?'var(--primary)':'var(--bg-card2)'};color:${type===t?'#000':'var(--text-muted)'};border:none;border-radius:20px;cursor:pointer;font-size:11px;font-weight:700">
          ${l}
        </button>`).join('')}
        <button onclick="document.getElementById('qc-modal').remove()" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">✕</button>
      </div>
      <div id="qc-content" style="padding:16px 18px"></div>
    </div>`;
    document.body.appendChild(modal);
    this._switchType(type);
  },

  _switchType(type) {
    // Update tab styles
    document.querySelectorAll('[id^="qc-tab-"]').forEach(btn => {
      const isActive = btn.id === 'qc-tab-'+type;
      btn.style.background = isActive ? 'var(--primary)' : 'var(--bg-card2)';
      btn.style.color = isActive ? '#000' : 'var(--text-muted)';
    });

    const content = document.getElementById('qc-content');
    if(!content) return;

    if(type === 'text') {
      content.innerHTML = `
      <textarea id="qc-text" class="form-control" rows="5" placeholder="Scrivi un'idea, nota, to-do..." style="font-size:13px;resize:none;margin-bottom:10px" autofocus></textarea>
      <div style="display:flex;gap:8px">
        <select id="qc-dest" class="form-control" style="font-size:12px;flex:1">
          <option value="ideas">💡 Salva come Idea</option>
          <option value="orders">📦 Crea Ordine</option>
          <option value="note">📝 Nota interna</option>
        </select>
        <button onclick="QuickCapture._saveText()" style="padding:9px 20px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:800">Salva</button>
      </div>`;
      setTimeout(()=>document.getElementById('qc-text')?.focus(), 100);
    }

    if(type === 'url') {
      content.innerHTML = `
      <input id="qc-url" class="form-control" placeholder="Incolla URL..." style="font-size:13px;margin-bottom:10px" autofocus>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">Recupera automaticamente immagine e titolo</div>
      <button onclick="QuickCapture._saveURL()" style="width:100%;padding:10px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:800">🔗 Salva Idea da URL</button>`;
      setTimeout(()=>document.getElementById('qc-url')?.focus(), 100);
    }

    if(type === 'idea') {
      content.innerHTML = `
      <input id="qc-idea-title" class="form-control" placeholder="Titolo dell'idea..." style="font-size:13px;margin-bottom:8px" autofocus>
      <textarea id="qc-idea-desc" class="form-control" rows="3" placeholder="Descrizione (opzionale)..." style="font-size:12px;resize:none;margin-bottom:10px"></textarea>
      <button onclick="QuickCapture._saveIdea()" style="width:100%;padding:10px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:800">💡 Salva Idea</button>`;
      setTimeout(()=>document.getElementById('qc-idea-title')?.focus(), 100);
    }

    if(type === 'voice') {
      content.innerHTML = `
      <div id="qc-voice-area" style="text-align:center;padding:20px">
        <div style="font-size:48px;margin-bottom:12px" id="qc-mic-icon">🎤</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px" id="qc-voice-status">Premi per iniziare la registrazione</div>
        <button id="qc-record-btn" onclick="QuickCapture._toggleVoice()"
          style="padding:14px 28px;background:var(--primary);color:#000;border:none;border-radius:99px;cursor:pointer;font-size:14px;font-weight:800;margin-bottom:14px">
          🎤 Registra
        </button>
        <div id="qc-transcript" style="font-size:12px;color:var(--text);background:var(--bg-card2);border-radius:8px;padding:10px;min-height:40px;text-align:left;display:none"></div>
        <button id="qc-voice-save" onclick="QuickCapture._saveVoice()" style="display:none;width:100%;padding:9px;background:#22c55e;color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:800;margin-top:8px">💾 Salva come Idea</button>
      </div>`;
      this._recognition = null;
    }
  },

  _recognition: null,
  _isRecording: false,

  _toggleVoice() {
    if(!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      if(typeof toast!=='undefined') toast('⚠️ Registrazione vocale non supportata in questo browser. Usa Chrome.','warning');
      return;
    }
    if(this._isRecording) {
      this._recognition?.stop();
      return;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    this._recognition = new SpeechRec();
    this._recognition.lang = 'it-IT';
    this._recognition.continuous = false;
    this._recognition.interimResults = true;

    this._recognition.onstart = () => {
      this._isRecording = true;
      const btn = document.getElementById('qc-record-btn');
      const icon = document.getElementById('qc-mic-icon');
      const status = document.getElementById('qc-voice-status');
      if(btn) { btn.textContent='⏹ Ferma'; btn.style.background='#ef4444'; btn.style.color='#fff'; }
      if(icon) icon.textContent='🔴';
      if(status) status.textContent='Registrazione in corso... parla ora';
    };

    this._recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r=>r[0].transcript).join('');
      const el = document.getElementById('qc-transcript');
      if(el) { el.style.display='block'; el.textContent = transcript; }
      const saveBtn = document.getElementById('qc-voice-save');
      if(saveBtn) saveBtn.style.display='block';
    };

    this._recognition.onend = () => {
      this._isRecording = false;
      const btn = document.getElementById('qc-record-btn');
      const icon = document.getElementById('qc-mic-icon');
      const status = document.getElementById('qc-voice-status');
      if(btn) { btn.textContent='🎤 Registra di nuovo'; btn.style.background='var(--primary)'; btn.style.color='#000'; }
      if(icon) icon.textContent='🎤';
      if(status) status.textContent='Registrazione completata';
    };

    this._recognition.start();
  },

  async _saveVoice() {
    const text = document.getElementById('qc-transcript')?.textContent?.trim();
    if(!text) { if(typeof toast!=='undefined') toast('Nessun testo registrato','warning'); return; }
    await IDB.put('ideas', {
      id: Date.now(), title: text.slice(0,80), description: text,
      status:'idea', source:'voice', createdAt:new Date().toISOString(),
    });
    if(typeof AppStore!=='undefined') AppStore.invalidate('ideas');
    document.getElementById('qc-modal')?.remove();
    if(typeof toast!=='undefined') toast('💡 Idea vocale salvata!','success');
  },

  async _saveText() {
    const text = document.getElementById('qc-text')?.value?.trim();
    const dest  = document.getElementById('qc-dest')?.value || 'ideas';
    if(!text) return;
    if(dest === 'ideas') {
      await IDB.put('ideas', { id:Date.now(), title:text.slice(0,80), description:text, status:'idea', createdAt:new Date().toISOString() });
      if(typeof AppStore!=='undefined') AppStore.invalidate('ideas');
    } else if(dest === 'orders') {
      await IDB.put('orders', { id:Date.now(), name:text.slice(0,100), stage:'preventivo', createdAt:new Date().toISOString() });
      if(typeof AppStore!=='undefined') AppStore.invalidate('orders');
    }
    document.getElementById('qc-modal')?.remove();
    if(typeof toast!=='undefined') toast('✅ Salvato in '+dest,'success');
  },

  async _saveURL() {
    const url = document.getElementById('qc-url')?.value?.trim();
    if(!url || !url.startsWith('http')) { if(typeof toast!=='undefined') toast('Inserisci un URL valido','warning'); return; }
    // Delegate to IdeasModule if available
    if(typeof IdeasModule !== 'undefined') {
      document.getElementById('qc-modal')?.remove();
      IdeasModule.openFromUrl();
      setTimeout(()=>{ const input=document.getElementById('url-import-input'); if(input){ input.value=url; IdeasModule._fetchMeta(); } }, 300);
    } else {
      await IDB.put('ideas', { id:Date.now(), title:url.replace(/^https?:\/\/(www\.)?/,'').slice(0,60), links:url, status:'idea', createdAt:new Date().toISOString() });
      document.getElementById('qc-modal')?.remove();
      if(typeof toast!=='undefined') toast('🔗 URL salvato come idea','success');
    }
  },

  async _saveIdea() {
    const title = document.getElementById('qc-idea-title')?.value?.trim();
    const desc  = document.getElementById('qc-idea-desc')?.value?.trim();
    if(!title) { if(typeof toast!=='undefined') toast('Inserisci un titolo','warning'); return; }
    await IDB.put('ideas', { id:Date.now(), title, description:desc||'', status:'idea', createdAt:new Date().toISOString() });
    if(typeof AppStore!=='undefined') AppStore.invalidate('ideas');
    document.getElementById('qc-modal')?.remove();
    if(typeof toast!=='undefined') toast('💡 Idea salvata!','success');
  },
};
window.QuickCapture = QuickCapture;


// ═══════════════════════════════════════════════════════════════════════
// 3. MULTI-LINGUA PREVENTIVO — preventivo PDF in IT o EN
// ═══════════════════════════════════════════════════════════════════════
const QuoteLanguage = {
  _SK: 'ingly_quote_lang',
  get() { return localStorage.getItem(this._SK)||'it'; },
  set(lang) { localStorage.setItem(this._SK, lang); if(typeof toast!=='undefined') toast(lang==='it'?'🇮🇹 Preventivo in Italiano':'🇬🇧 Quote in English','info'); },

  STRINGS: {
    it: {
      title:'PREVENTIVO', client:'Destinatario', number:'Numero', date:'Data',
      validity:'Validità', details:'Dettaglio Voci', desc:'Descrizione', qty:'Qtà',
      unit:'UM', unitPrice:'Prezzo Unit.', total:'Totale', subtotal:'Imponibile',
      discount:'Sconto', vat:'IVA 22%', grandTotal:'TOTALE',
      validNote:'Preventivo valido per 7 giorni · Non costituisce fattura',
    },
    en: {
      title:'QUOTATION', client:'Client', number:'Number', date:'Date',
      validity:'Valid until', details:'Line Items', desc:'Description', qty:'Qty',
      unit:'Unit', unitPrice:'Unit Price', total:'Total', subtotal:'Subtotal',
      discount:'Discount', vat:'VAT 22%', grandTotal:'TOTAL',
      validNote:'This quote is valid for 30 days · Not a tax invoice',
    },
  },

  get strings() { return this.STRINGS[this.get()] || this.STRINGS.it; },

  // Inject language toggle in Quoter UI
  inject() {
    if(document.getElementById('quote-lang-toggle')) return;
    const btn = document.createElement('button');
    btn.id = 'quote-lang-toggle';
    btn.title = 'Lingua preventivo / Quote language';
    btn.style.cssText = 'padding:5px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap';
    btn.textContent = this.get()==='it'?'🇮🇹 IT':'🇬🇧 EN';
    btn.onclick = ()=>{
      const next = this.get()==='it'?'en':'it';
      this.set(next);
      btn.textContent = next==='it'?'🇮🇹 IT':'🇬🇧 EN';
    };
    // Add to quoter toolbar or topbar
    const topbar = document.getElementById('topbar') || document.querySelector('.topbar');
    if(topbar) topbar.appendChild(btn);
  },
};
window.QuoteLanguage = QuoteLanguage;

// Patch _buildQuoteHTML to use QuoteLanguage strings
(function patchQuoteLanguage(){
  const orig = window._buildQuoteHTML;
  if(!orig) return setTimeout(patchQuoteLanguage, 1000);
  window._buildQuoteHTML = function(data, tplId, cfg) {
    const lang = typeof QuoteLanguage !== 'undefined' ? QuoteLanguage.get() : 'it';
    const html = orig(data, tplId, cfg);
    if(lang === 'it') return html;
    const s = QuoteLanguage.strings;
    return html
      .replace(/>PREVENTIVO</g, '>'+s.title+'<')
      .replace(/Dettaglio Voci/g, s.details)
      .replace(/>Destinatario</g, '>'+s.client+'<')
      .replace(/>Descrizione</g, '>'+s.desc+'<')
      .replace(/>Prezzo Unit\./g, '>'+s.unitPrice)
      .replace(/>TOTALE</g, '>'+s.grandTotal+'<')
      .replace(/Preventivo valido per 7 giorni · Non costituisce fattura/g, s.validNote);
  };
})();


// ═══════════════════════════════════════════════════════════════════════
// 4. GLOBAL SEARCH — Ctrl+K / Cmd+K universal search
// ═══════════════════════════════════════════════════════════════════════
const GlobalSearch = {
  _open: false,

  open() {
    if(this._open) return;
    this._open = true;
    const overlay = document.createElement('div');
    overlay.id = 'global-search-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:#000a;z-index:99999;display:flex;align-items:flex-start;justify-content:center;padding-top:80px';
    overlay.onclick = e=>{ if(e.target===overlay) this.close(); };
    overlay.innerHTML = `
    <div style="background:var(--bg-card);border-radius:14px;width:min(620px,96vw);border:1px solid var(--border2);box-shadow:0 24px 64px #000d;overflow:hidden">
      <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border)">
        <span style="font-size:16px;color:var(--text-muted)">🔍</span>
        <input id="gs-input" type="text" placeholder="Cerca ordini, clienti, prodotti, sezioni..." autofocus
          style="flex:1;border:none;background:none;outline:none;font-size:15px;color:var(--text);font-family:inherit"
          oninput="GlobalSearch._search(this.value)">
        <kbd style="background:var(--bg-card2);border:1px solid var(--border);border-radius:5px;padding:2px 8px;font-size:10px;color:var(--text-muted)">ESC</kbd>
      </div>
      <div id="gs-results" style="max-height:400px;overflow-y:auto;padding:6px"></div>
      <div style="padding:8px 14px;border-top:1px solid var(--border);display:flex;gap:12px;font-size:10px;color:var(--text-dim)">
        <span>↑↓ naviga</span><span>⏎ apri</span><span>ESC chiudi</span>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    document.getElementById('gs-input')?.focus();
    document.addEventListener('keydown', this._keyHandler.bind(this), {once:false});
    this._selectedIdx = -1;
    this._results = [];
    this._search('');
  },

  close() {
    this._open = false;
    document.getElementById('global-search-overlay')?.remove();
  },

  _keyHandler(e) {
    if(!this._open) return;
    if(e.key==='Escape') this.close();
    if(e.key==='ArrowDown') { e.preventDefault(); this._navigate(1); }
    if(e.key==='ArrowUp') { e.preventDefault(); this._navigate(-1); }
    if(e.key==='Enter') { e.preventDefault(); this._openSelected(); }
  },

  _navigate(dir) {
    this._selectedIdx = Math.max(-1, Math.min(this._results.length-1, this._selectedIdx+dir));
    document.querySelectorAll('#gs-results [data-gs-idx]').forEach(el => {
      const idx = +el.dataset.gsIdx;
      el.style.background = idx===this._selectedIdx ? 'var(--primary-dim)' : '';
    });
  },

  _openSelected() {
    const result = this._results[this._selectedIdx] || this._results[0];
    if(result) { this.close(); result.action(); }
  },

  async _search(query) {
    const q = query.toLowerCase().trim();
    const resultsEl = document.getElementById('gs-results');
    if(!resultsEl) return;
    this._results = [];

    // Nav sections
    const sections = [
      { label:'Dashboard', icon:'🏠', section:'dashboard' },
      { label:'Ordini & Workflow', icon:'🔄', section:'gestione_ordini' },
      { label:'Vendite', icon:'💰', section:'sales' },
      { label:'Clienti', icon:'👤', section:'clients' },
      { label:'Catalogo', icon:'📦', section:'catalog' },
      { label:'Preventivo', icon:'📋', section:'quoter' },
      { label:'Etsy Analytics', icon:'📊', section:'etsy_analytics' },
      { label:'Lab Must Have', icon:'🧰', section:'lab_musthave' },
      { label:'Idee', icon:'💡', section:'ideas' },
      { label:'Brand Identity', icon:'🎨', section:'brand_identity' },
      { label:'Backup', icon:'💾', section:'backup' },
      { label:'Impostazioni', icon:'⚙️', section:'settings' },
      { label:'Prima Nota', icon:'📒', section:'prima_nota' },
      { label:'Fornitori', icon:'🏭', section:'supplier_intel' },
      { label:'AI Studio', icon:'🤖', section:'ai' },
      { label:'Cloud Update', icon:'☁️', section:'cloud_updater' },
    ];

    const matchedSections = sections.filter(s => !q || s.label.toLowerCase().includes(q));

    // IDB search
    let orders=[], clients=[], sales=[];
    if(q.length > 1) {
      [orders, clients, sales] = await Promise.all([
        IDB.getAll('orders').catch(()=>[]),
        IDB.getAll('clients').catch(()=>[]),
        IDB.getAll('sales').catch(()=>[]),
      ]);
      orders  = orders.filter(o=>[(o.clientName||''),(o.name||'')].join(' ').toLowerCase().includes(q)).slice(0,5);
      clients = clients.filter(c=>[(c.name||''),(c.email||'')].join(' ').toLowerCase().includes(q)).slice(0,5);
      sales   = sales.filter(s=>[(s.clientName||''),(s.desc||'')].join(' ').toLowerCase().includes(q)).slice(0,5);
    }

    // Build results
    if(!q) {
      // Show recent sections
      matchedSections.slice(0,6).forEach(s=>{
        this._results.push({ label:s.label, sub:'Sezione', icon:s.icon, action:()=>App.navigate(s.section) });
      });
    } else {
      matchedSections.slice(0,3).forEach(s=>{
        this._results.push({ label:s.label, sub:'Sezione', icon:s.icon, action:()=>App.navigate(s.section) });
      });
      orders.forEach(o=>{
        this._results.push({ label:o.clientName||'Ordine', sub:`${o.name||''} · ${o.stage||''}`, icon:'📦', action:()=>{ App.navigate('gestione_ordini'); setTimeout(()=>GestioneOrdini?._openDetail?.(o.id),300); } });
      });
      clients.forEach(cl=>{
        this._results.push({ label:cl.name||cl.company||'Cliente', sub:cl.email||'', icon:'👤', action:()=>App.navigate('clients') });
      });
      sales.forEach(s=>{
        this._results.push({ label:s.clientName||'Vendita', sub:`€${s.amount||0} · ${s.desc||''}`, icon:'💰', action:()=>App.navigate('sales') });
      });
    }

    if(!this._results.length) {
      resultsEl.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-dim);font-size:13px">Nessun risultato per "${query}"</div>`;
      return;
    }

    resultsEl.innerHTML = this._results.map((r,i)=>`
    <div data-gs-idx="${i}" onclick="GlobalSearch.close();(${r.action.toString()})()"
      style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;transition:.1s"
      onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background=''">
      <span style="font-size:16px;flex-shrink:0">${r.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.label}</div>
        ${r.sub?`<div style="font-size:10px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.sub}</div>`:''}
      </div>
    </div>`).join('');
  },
};
window.GlobalSearch = GlobalSearch;

// Ctrl+K / Cmd+K shortcut
document.addEventListener('keydown', e => {
  if(false) {   /* gestore Ctrl+K ritirato: vedi nota sopra */
    e.preventDefault();
    if(typeof GlobalSearch!=='undefined') GlobalSearch.open();
    else if(typeof CmdPalette!=='undefined') CmdPalette.open();
  }
  if((e.ctrlKey||e.metaKey) && e.key==='z') {
    e.preventDefault();
    if(typeof UndoHistory!=='undefined') UndoHistory.undo();
  }
});


// ═══════════════════════════════════════════════════════════════════════
// 5. INSTALL — wires all new modules
// ═══════════════════════════════════════════════════════════════════════
(function installFinalBatch(){
  const tryInstall = ()=>{
    if(typeof App==='undefined') return setTimeout(tryInstall,800);

    // Add views
    const addView=(id,afterId)=>{
      if(document.getElementById('view-'+id)) return;
      const div=document.createElement('div'); div.className='section-view'; div.id='view-'+id;
      const after=document.getElementById('view-'+afterId);
      if(after) after.parentNode.insertBefore(div,after.nextSibling);
      else document.body.appendChild(div);
    };
    addView('supplier_intel','laserresources');

    // Add nav items
    const addNav=(id,label,icon,afterSection,color)=>{
      if(document.querySelector(`[data-section="${id}"]`)) return;
      const after=document.querySelector(`[data-section="${afterSection}"]`);
      if(!after) return;
      const nav=document.createElement('div'); nav.className='nav-item';
      nav.setAttribute('data-section',id); nav.onclick=()=>App.navigate(id);
      nav.innerHTML=`<i class="fas ${icon}" style="color:${color};font-size:10px"></i> ${label}`;
      after.parentNode.insertBefore(nav,after.nextSibling);
    };
    addNav('supplier_intel','🏭 Fornitori','fa-truck','laserresources','#0ea5e9');

    // Patch renderSection
    if(!App.__finalBatchPatch){
      App.__finalBatchPatch=true;
      const _orig=App.renderSection?.bind(App);
      if(_orig) App.renderSection=function(s){
        if(s==='supplier_intel'){SupplierIntelligence.render();return;}
        _orig(s);
      };
    }

    // Inject Quick Capture button in topbar
    setTimeout(()=>{
      if(document.getElementById('quick-capture-btn')) return;
      const topbar=document.getElementById('topbar')||document.querySelector('.topbar');
      if(!topbar) return;
      const btn=document.createElement('button');
      btn.id='quick-capture-btn';
      btn.style.cssText='padding:5px 9px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);border-radius:7px;cursor:pointer;font-size:10px;color:#818cf8;font-weight:700;white-space:nowrap';
      btn.innerHTML='✍️ Cattura';
      btn.title='Quick Capture — salva idee velocemente (testo, URL, voce)';
      btn.onclick=()=>{ if(typeof QuickCapture!=='undefined') QuickCapture.open('text'); };
      topbar.insertBefore(btn,topbar.firstChild);
    },3000);

    // Inject search button in topbar
    setTimeout(()=>{
      if(document.getElementById('global-search-btn')) return;
      const topbar=document.getElementById('topbar')||document.querySelector('.topbar');
      if(!topbar) return;
      const btn=document.createElement('button');
      btn.id='global-search-btn';
      btn.style.cssText='padding:5px 9px;background:rgba(100,116,139,.15);border:1px solid rgba(100,116,139,.3);border-radius:7px;cursor:pointer;font-size:10px;color:#94a3b8;font-weight:700;white-space:nowrap';
      btn.innerHTML='🔍';
      btn.title='Ricerca globale (Ctrl+K)';
      btn.onclick=()=>{ if(typeof GlobalSearch!=='undefined') GlobalSearch.open(); };
      topbar.insertBefore(btn,topbar.firstChild);
    },3200);

    // Inject language toggle for quoter
    setTimeout(()=>QuoteLanguage.inject(), 4000);

    console.log('[FinalBatch] SupplierIntelligence + QuickCapture + QuoteLanguage + GlobalSearch installed ✅');
  };
  setTimeout(tryInstall,2500);
})();

console.log('[INGLY OS] Final roadmap batch loaded ✅');

