
// === /src/main.js ===
// ============================================================
// INGLY OS v88 — Modular Entry Point
// Loads all modules in dependency order
// ============================================================

// Core modules are loaded via script tags in index.html
// This file serves as documentation of the load order.
// All modules attach to `window.*` for global access.

console.log('%c✅ INGLY OS v10.0 PRODUCTION — Overlay Bug Fixed', 
  'color:#22c55e;font-weight:bold;font-size:14px');
console.log('%c🐛 FIX: Overlay persistente risolto (navigate() refactored)', 
  'color:#60a5fa;font-size:12px');
console.log('%c🏗️  NEW: ModalManager + NavigationGuard architettural patterns', 
  'color:#a78bfa;font-size:12px');
console.log('%c⚡ PERF: Zero view zombie, automatic cleanup on navigation', 
  'color:#fbbf24;font-size:12px');

// ============================================================
// SUPPLIERS MANAGER — Gestione Fornitori (v1.5)
// ============================================================

const FORNITORI_DB = {
  categories: [
    {id:'plexiglass', label:'🔵 Plexiglass/Acrilico', color:'#3b82f6'},
    {id:'mdf_legno',  label:'🟤 MDF / Legno',         color:'#a16207'},
    {id:'magneti',    label:'🔴 Magneti',              color:'#ef4444'},
    {id:'packaging',  label:'📦 Packaging',            color:'#8b5cf6'},
    {id:'accessori',  label:'✨ Accessori',            color:'#f59e0b'},
    {id:'foils',      label:'🌟 Foil / Transfer',      color:'#6366f1'},
    {id:'consumabili',label:'🔧 Consumabili Laser',    color:'#14b8a6'},
  ],
  suppliers: [
    {id:'ps01',cat:'plexiglass',name:'Plexishop.it',country:'IT',flag:'🇮🇹',
     website:'https://www.plexishop.it',materials:'Acrilico, PETG, Policarbonato',
     priceRange:'€€',quality:4,delivery:'2-4gg',minOrder:'1 foglio',
     strengths:['Prezzi competitivi','Spedizione rapida','Ampio catalogo'],
     description:'Leader italiano plexiglass. Ottimo rapporto qualità/prezzo, campioni disponibili.',
     materials_detail:{acrilico_3mm:'€18/mq',acrilico_4mm:'€22/mq',acrilico_opalino:'€24/mq'},
     tags:['laser','taglio','colori','acrilico']},
    {id:'ps02',cat:'plexiglass',name:'DesignTrasparente.com',country:'IT',flag:'🇮🇹',
     website:'https://www.designtrasparente.com',materials:'Acrilico laser-grade, Specchio acrilico',
     priceRange:'€€€',quality:5,delivery:'3-5gg',minOrder:'Nessun minimo',
     strengths:['Laser-grade certificato','Campioni gratis'],
     description:'Qualità premium per laser CO2. Campioni gratuiti su richiesta.',
     materials_detail:{acrilico_3mm:'€23/mq',acrilico_specchio:'€38/mq'},
     tags:['premium','laser','specchio']},
    {id:'ps03',cat:'plexiglass',name:'AliExpress Acrilici',country:'CN',flag:'🇨🇳',
     website:'https://www.aliexpress.com',materials:'Acrilico, Fluorescente, UV',
     priceRange:'€',quality:3,delivery:'15-30gg',minOrder:'5 fogli',
     strengths:['Prezzo bassissimo','Colori insoliti','Fluorescente'],
     description:'Per bulk e colori rari. Qualità variabile, testa sempre prima.',
     materials_detail:{acrilico_colorato:'€8-12/mq',fluorescente:'€11/mq'},
     tags:['economico','bulk','fluorescente','colori']},
    {id:'ps04',cat:'plexiglass',name:'Modulor.de',country:'DE',flag:'🇩🇪',
     website:'https://www.modulor.de',materials:'Acrilico, Policarbonato, Dibond, HIPS',
     priceRange:'€€€',quality:5,delivery:'5-7gg',minOrder:'Nessun minimo',
     strengths:['Catalogo enorme','Qualità costante','Materiali rari'],
     description:'Riferimento tedesco. 10.000+ prodotti, spedisce in tutta EU.',
     materials_detail:{acrilico_vari:'€20-45/mq',policarbonato:'€32/mq'},
     tags:['premium','EU','catalogo','rari']},
    {id:'mdf01',cat:'mdf_legno',name:'Lasertale.eu',country:'EU',flag:'🇪🇺',
     website:'https://www.lasertale.eu',materials:'MDF laser-grade, Compensato betulla, Quercia',
     priceRange:'€€',quality:5,delivery:'3-5gg',minOrder:'1 foglio',
     strengths:['Specifico per laser','MDF basse emissioni','Certificato CE'],
     description:'Il top per MDF laser: basse emissioni, risultato pulito garantito.',
     materials_detail:{mdf_3mm:'€7.5/foglio 60x30',mdf_6mm:'€11/foglio',betulla_3mm:'€10/foglio'},
     tags:['laser-grade','MDF','compensato','betulla']},
    {id:'mdf02',cat:'mdf_legno',name:'VectorCut.it',country:'IT',flag:'🇮🇹',
     website:'https://www.vectorcut.it',materials:'MDF, Compensato, Legno massello, Sughero',
     priceRange:'€€',quality:4,delivery:'2-4gg',minOrder:'Nessun minimo',
     strengths:['Taglio a misura','Consegna veloce','Formato custom'],
     description:'Taglio a misura su richiesta. Ideale per formati non standard.',
     materials_detail:{mdf_3mm:'€6.5/foglio',sughero_3mm:'€8/foglio'},
     tags:['taglio-misura','MDF','sughero','formato']},
    {id:'mdf03',cat:'mdf_legno',name:'Trotec Materials',country:'AT',flag:'🇦🇹',
     website:'https://www.trotec.com/materials',materials:'MDF, Acrilico, Gomma, Feltro',
     priceRange:'€€€',quality:5,delivery:'5-7gg',minOrder:'Foglio singolo',
     strengths:['Testati Trotec','Qualità garantita','Supporto tecnico'],
     description:'Materiali ufficiali Trotec. Qualità garantita per ogni laser.',
     materials_detail:{mdf_3mm:'€13/foglio',acrilico_4mm:'€38/mq'},
     tags:['trotec','certificato','premium','garantito']},
    {id:'mag01',cat:'magneti',name:'Supermagnete.it',country:'IT',flag:'🇮🇹',
     website:'https://www.supermagnete.it',materials:'Neodimio, Ferrite, Nastro magnetico',
     priceRange:'€€',quality:5,delivery:'1-3gg',minOrder:'Nessun minimo',
     strengths:['Qualità top','Spedizione 24h','Catalogo completo'],
     description:'Il riferimento italiano per magneti. Neodimio N35-N52, ferrite, nastri.',
     materials_detail:{neodimio_10x2:'€0.18/pz',nastro_mag_1m:'€2.8/mt'},
     tags:['neodimio','ferrite','nastro','magnete']},
    {id:'pkg01',cat:'packaging',name:'Unibox.it',country:'IT',flag:'🇮🇹',
     website:'https://www.unibox.it',materials:'Scatole cartone, Astucci, Portaconfetti',
     priceRange:'€€',quality:4,delivery:'3-5gg',minOrder:'25 pz',
     strengths:['Personalizzabili','Alta qualità','Vari formati'],
     description:'Packaging premium personalizzabile per prodotti laser. Matrimoni perfetti.',
     materials_detail:{scatola_magnetica_s:'€1.80/pz (min 25)'},
     tags:['packaging','scatola','matrimoni','personalizzabile']},
    {id:'pkg02',cat:'packaging',name:'Raja.it',country:'IT',flag:'🇮🇹',
     website:'https://www.raja.it',materials:'Scatole spedizione, Pluriball, Buste',
     priceRange:'€',quality:3,delivery:'1-2gg',minOrder:'Nessun minimo',
     strengths:['Next-day','Prezzi volume','Gamma completa'],
     description:'Leader packaging spedizione. Ideale per e-commerce. Next-day consegna.',
     materials_detail:{scatola_spedizione:'€0.35-0.70/pz bulk'},
     tags:['spedizione','bulk','rapido','ecommerce']},
    {id:'acc01',cat:'accessori',name:'Prismatica.it',country:'IT',flag:'🇮🇹',
     website:'https://www.prismatica.it',materials:'Portachiavi blank, Clip, Cordini, Anellini split',
     priceRange:'€€',quality:4,delivery:'2-4gg',minOrder:'50 pz',
     strengths:['Gamma accessori laser','Bundle convenienti'],
     description:'Specializzato in accessori per produzioni laser artigianali.',
     materials_detail:{anello_split_25:'€0.08/pz',cordino_nylon:'€0.12/pz'},
     tags:['portachiavi','cordini','accessori','laser']},
    {id:'foil01',cat:'foils',name:'ColoFoil.eu',country:'EU',flag:'🇪🇺',
     website:'https://www.colofoil.eu',materials:'Foil oro/argento, Olografico, Iron-on',
     priceRange:'€€',quality:4,delivery:'5-8gg',minOrder:'Foglio singolo',
     strengths:['Laser compatibile','Olografico','Colori metal'],
     description:'Foil per laser e presse a caldo. Effetto oro/argento eccellente su legno.',
     materials_detail:{foil_oro_a4:'€2.5/foglio',foil_olografico_a4:'€3.2/foglio'},
     tags:['foil','oro','olografico','transfer']},
    {id:'cons01',cat:'consumabili',name:'JJ-Laser.de',country:'DE',flag:'🇩🇪',
     website:'https://www.jj-laser.de',materials:'Tubi CO2 Reci, Ottiche, Lenti ZnSe, Specchi',
     priceRange:'€€',quality:4,delivery:'5-10gg',minOrder:'1 pz',
     strengths:['Compatibilità universale','Prezzi EU','Stock disponibile'],
     description:'Ricambi laser CO2. Tubi Reci, lenti, guide, cinghie. Tutto per CO2.',
     materials_detail:{tubo_reci_80w:'€280',lente_znse_18:'€35',specchio_25:'€8'},
     tags:['tubi','CO2','ottiche','lenti','ricambi']},
  ]
};
window.FORNITORI_DB = FORNITORI_DB;

const SuppliersManager = {
  _editId: null,
  _tab: 'mylist',
  _dbCat: '',
  _dbSearch: '',
  _filter: '',
  _catFilter: '',
  _sort: 'name',
  _page: 0,
  _pageSize: 20,

  async render() {
    const el = document.getElementById('view-suppliers');
    if (!el) return;
    if(this._tab==='scopri'){await this._renderScopri(el);return;}
    if(this._tab==='confronta'){await this._renderConfronta(el);return;}
    const suppliers = await IDB.getAll('suppliers').catch(() => []);
    const search = this._filter.toLowerCase();
    const cat = this._catFilter;
    let filtered = suppliers.filter(s => {
      const txt = ((s.name||'') + ' ' + (s.materials||'') + ' ' + (s.website||'') + ' ' + (s.notes||'')).toLowerCase();
      const matchSearch = !search || txt.includes(search);
      const matchCat = !cat || (s.materials||'').split(',').map(x=>x.trim()).some(m => m.toLowerCase()===cat.toLowerCase()) || (s.categories||[]).some(c=>c===cat);
      return matchSearch && matchCat;
    });
    // Sort
    if (this._sort === 'name') filtered.sort((a,b) => (a.name||'').localeCompare(b.name||''));
    else if (this._sort === 'rating') filtered.sort((a,b) => (b.rating||0)-(a.rating||0));
    else if (this._sort === 'lead') filtered.sort((a,b) => (a.leadTime||999)-(b.leadTime||999));
    else if (this._sort === 'date') filtered.sort((a,b) => new Date(b.createdAt||0)-new Date(a.createdAt||0));

    // Pagination — reset on filter change
    const _fkey = search+'|'+cat+'|'+this._sort;
    if (this._lastFKey !== _fkey) { this._page = 0; this._lastFKey = _fkey; }
    const ps = this._pageSize || 20;
    const pg = this._page || 0;
    const totalFiltered = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / ps));
    if (pg >= totalPages) this._page = Math.max(0, totalPages - 1);
    const pageItems = filtered.slice((this._page||0) * ps, (this._page||0) * ps + ps);

    // Categories from materials
    const allMats = [...new Set(suppliers.flatMap(s => (s.materials||'').split(',').map(x=>x.trim()).filter(Boolean)))].sort();

    const supplierOrders = await IDB.getAll('supplier_orders').catch(()=>[]);
    const today4kpi = new Date().toISOString().split('T')[0];
    const overdueOrders = supplierOrders.filter(o=>o.status==='attesa'&&o.expectedDate&&o.expectedDate<today4kpi).length;
    const pendingOrders = supplierOrders.filter(o=>o.status==='attesa').length;
    const kpiHtml = [
      {l:'Fornitori Totali', v:suppliers.length, c:'var(--primary)', i:'fa-truck'},
      {l:'Ordini in Attesa', v:pendingOrders, c:'var(--blue)', i:'fa-box'},
      {l:'⚠️ In Ritardo', v:overdueOrders, c:overdueOrders>0?'#ef4444':'var(--green)', i:'fa-exclamation-triangle'},
      {l:'Materiali Unici', v:allMats.length, c:'var(--orange)', i:'fa-tags'},
    ].map(k=>`<div class="kpi-card"><i class="fas ${k.i} kpi-icon" style="color:${k.c}"></i><div class="kpi-value">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');

    el.innerHTML = `
      <div class="module-header">
        <div class="module-header-left">
          <div class="module-title"><i class="fas fa-truck"></i> Gestione Fornitori</div>
          <div class="module-subtitle">Cataloga fornitori, materiali, lead time e contatti in un posto solo</div>
        </div>
        <div class="module-actions">
          <button class="btn btn-secondary btn-sm" onclick="SuppliersManager.importCSV()" style="color:#3b82f6;border-color:#3b82f6" title="Importa CSV fornitori">📥 Importa CSV</button>
          <button class="btn btn-secondary btn-sm" onclick="SuppliersManager.downloadCSVTemplate()" style="color:#8b5cf6;border-color:#8b5cf6" title="Scarica template CSV">📋 Template</button>
          <button class="btn btn-secondary btn-sm" onclick="SuppliersManager.openOrders()" style="color:#f59e0b;border-color:#f59e0b" title="Registro ordini fornitori">📦 Ordini</button>
          <button class="btn btn-secondary btn-sm" onclick="SuppliersManager.exportCSV()" style="color:#22c55e;border-color:#22c55e40"><i class="fas fa-file-csv"></i> Esporta CSV</button>
          <button class="btn btn-primary btn-sm" onclick="SuppliersManager.openModal()"><i class="fas fa-plus"></i> Nuovo Fornitore</button>
        </div>
      </div>
      <div class="grid-4 mb-16">${kpiHtml}</div>
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
        <div style="flex:1;min-width:200px;position:relative">
          <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-dim);font-size:12px"></i>
          <input class="form-control" style="padding-left:30px;height:34px;font-size:12px" placeholder="Cerca nome, materiale, note..." value="${this._filter}" oninput="SuppliersManager._filter=this.value;(typeof SuppliersManager!=='undefined'&&SuppliersManager.render())">
        </div>
        <select class="form-control" style="width:auto;height:34px;font-size:12px" onchange="SuppliersManager._catFilter=this.value;(typeof SuppliersManager!=='undefined'&&SuppliersManager.render())">
          <option value="">Tutti i materiali</option>
          ${allMats.map(m=>`<option value="${m}" ${cat===m?'selected':''}>${m}</option>`).join('')}
        </select>
        <select class="form-control" style="width:auto;height:34px;font-size:12px" onchange="SuppliersManager._sort=this.value;(typeof SuppliersManager!=='undefined'&&SuppliersManager.render())">
          <option value="name" ${this._sort==='name'?'selected':''}>A-Z Nome</option>
          <option value="rating" ${this._sort==='rating'?'selected':''}>⭐ Rating</option>
          <option value="lead" ${this._sort==='lead'?'selected':''}>⚡ Lead Time</option>
          <option value="date" ${this._sort==='date'?'selected':''}>🕐 Recenti</option>
        </select>
        ${(search||cat)?`<button class="btn btn-secondary btn-sm" onclick="SuppliersManager._filter='';SuppliersManager._catFilter='';(typeof SuppliersManager!=='undefined'&&SuppliersManager.render())" style="height:34px"><i class="fas fa-times"></i> Reset</button>`:''}
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${totalFiltered} fornitore${totalFiltered!==1?'i':''} trovato${totalFiltered!==1?'i':''}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
        ${pageItems.map(s => this._card(s)).join('')}
        ${!filtered.length ? `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-dim);background:var(--bg-card);border:1px solid var(--border);border-radius:12px">
          <i class="fas fa-truck fa-3x" style="opacity:0.15;display:block;margin-bottom:12px"></i>
          <div style="font-size:14px;margin-bottom:8px">Nessun fornitore trovato</div>
          <div style="font-size:12px">Clicca <strong>"+ Nuovo Fornitore"</strong> per iniziare a catalogare i tuoi fornitori</div>
        </div>` : ''}
      </div>
      ${totalPages > 1 ? (() => {
        const p = this._page||0;
        const bs = 'padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-muted);cursor:pointer;font-size:12px;';
        const bas = 'padding:5px 12px;border-radius:6px;border:1px solid var(--primary);background:var(--primary-dim);color:var(--primary);cursor:pointer;font-size:12px;font-weight:700;';
        let h = `<div style="display:flex;align-items:center;justify-content:center;gap:6px;padding:16px 0"><span style="font-size:11px;color:var(--text-muted);margin-right:4px">Pag. ${p+1} di ${totalPages} · ${totalFiltered} fornitori</span>`;
        h += `<button onclick="SuppliersManager._page=Math.max(0,(SuppliersManager._page||0)-1);SuppliersManager.render()" style="${bs}" ${p===0?'disabled':''}>‹</button>`;
        for (let i = Math.max(0,p-2); i < Math.min(totalPages, Math.max(0,p-2)+5); i++) h += `<button onclick="SuppliersManager._page=${i};SuppliersManager.render()" style="${i===p?bas:bs}">${i+1}</button>`;
        h += `<button onclick="SuppliersManager._page=Math.min(${totalPages-1},(SuppliersManager._page||0)+1);SuppliersManager.render()" style="${bs}" ${p>=totalPages-1?'disabled':''}>›</button></div>`;
        return h;
      })() : ''}`;
  },

  _card(s) {
    const stars = '⭐'.repeat(s.rating||0) + '☆'.repeat(5-(s.rating||0));
    const catColors = {materiali:'#0ea5e9',finitura:'#ec4899',sublimazione:'#f97316',studio:'#8b5cf6',generale:'#64748b'};
    const color = catColors[s.cat] || '#64748b';
    // ► Spending & reorder intelligence
    const totalSpent = s.totalSpent || 0;
    const orderCount = s.orderCount || 0;
    const lastOrderDays = s.lastOrder ? Math.floor((Date.now()-new Date(s.lastOrder).getTime())/(1000*60*60*24)) : null;
    const avgDaysBetween = s.avgDaysBetween || null;
    const reorderDue = avgDaysBetween && lastOrderDays && lastOrderDays >= avgDaysBetween * 0.85;
    return `
    <div style="background:var(--bg-card2);border-radius:10px;border:1.5px solid ${reorderDue?'#f59e0b':'var(--border)'};padding:14px 16px;border-left:3px solid ${color};transition:.15s"
      onmouseover="this.style.borderColor='${color}'" onmouseout="this.style.borderColor='${reorderDue?'#f59e0b':'var(--border)'}'">

      ${reorderDue?`<div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:7px;padding:5px 10px;margin-bottom:9px;font-size:11px;color:#f59e0b;font-weight:700">
        🔄 Probabilmente è ora di riordinare — ${lastOrderDays} giorni dall'ultimo ordine
      </div>`:''}

      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:800;color:var(--text)">${s.name}</div>
          <div style="font-size:10px;color:${color};font-weight:700;text-transform:uppercase;letter-spacing:.5px">${s.cat}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;letter-spacing:-1px">${stars}</div>
          ${totalSpent>0?`<div style="font-size:10px;color:#34d399;font-weight:700">€${Math.round(totalSpent)} speso</div>`:''}
        </div>
      </div>

      <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">📦 ${s.specialty||'—'}</div>
      ${s.notes?`<div style="font-size:10px;color:var(--text-dim);font-style:italic;padding:5px 8px;background:var(--bg-card);border-radius:6px;margin-bottom:8px">${s.notes}</div>`:''}

      <!-- Quick stats row -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:9px">
        ${orderCount>0?`<span style="font-size:10px;padding:2px 8px;background:rgba(96,165,250,.1);color:#60a5fa;border-radius:99px">🛒 ${orderCount} ordini</span>`:''}
        ${lastOrderDays!==null?`<span style="font-size:10px;padding:2px 8px;background:rgba(255,255,255,.05);color:var(--text-muted);border-radius:99px">⏱ ${lastOrderDays===0?'Oggi':lastOrderDays===1?'Ieri':lastOrderDays+'g fa'}</span>`:''}
        ${s.avgDeliveryDays?`<span style="font-size:10px;padding:2px 8px;background:rgba(34,197,94,.08);color:#34d399;border-radius:99px">🚚 ${s.avgDeliveryDays}gg consegna</span>`:''}
      </div>

      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        ${s.url?`<a href="${s.url}" target="_blank" rel="noopener" style="padding:4px 10px;background:var(--primary-dim);color:var(--primary);border:1px solid var(--primary-dim);border-radius:6px;font-size:11px;font-weight:700;text-decoration:none">🌐 Sito</a>`:''}
        <button onclick="SupplierIntelligence._openModal(${s.id})" style="padding:4px 8px;background:var(--bg-card);border:1px solid var(--border2);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-muted)">✏️ Modifica</button>
        <button onclick="SupplierIntelligence._contact(${s.id})" style="padding:4px 8px;background:#25D36615;border:1px solid #25D36630;border-radius:6px;cursor:pointer;font-size:11px;color:#25D366">💬 WA</button>
        <button onclick="SupplierIntelligence._recordOrder(${s.id})" style="padding:4px 8px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);border-radius:6px;cursor:pointer;font-size:11px;color:#f59e0b">🛒 Ordine</button>
      </div>
    </div>`;
  },

  // ► Log an order against a supplier (spending tracker)
  _recordOrder(id) {
    const modal = document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:#000c;z-index:9999;display:flex;align-items:center;justify-content:center';
    modal.onclick=e=>{if(e.target===modal)modal.remove();};
    modal.innerHTML=`
    <div style="background:var(--bg-card);border-radius:12px;width:min(360px,95vw);padding:20px;border:1px solid var(--border);box-shadow:0 24px 60px rgba(0,0,0,.5)">
      <div style="font-size:14px;font-weight:800;margin-bottom:14px">🛒 Registra Ordine Fornitore</div>
      <div style="margin-bottom:10px">
        <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">Importo speso (€)</label>
        <input id="so-amount" class="form-control" type="number" step="0.01" placeholder="0.00" style="font-size:13px">
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">Consegna attesa (giorni)</label>
        <input id="so-days" class="form-control" type="number" value="3" min="1" style="font-size:13px">
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">Note (opzionale)</label>
        <input id="so-notes" class="form-control" placeholder="Es. MDF 3mm x 20 fogli" style="font-size:12px">
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="this.closest('[style*=fixed]').remove()" style="flex:1;padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px">Annulla</button>
        <button onclick="SupplierIntelligence._saveOrder(${id})" style="flex:1;padding:9px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">✅ Salva</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('so-amount')?.focus();
  },

  _saveOrder(id) {
    const amount = parseFloat(document.getElementById('so-amount')?.value||0);
    const days   = parseInt(document.getElementById('so-days')?.value||3);
    if(!amount){ toast('Inserisci l\'importo','warning'); return; }
    const all = this.getAll();
    const idx = all.findIndex(s=>s.id===id);
    if(idx<0) return;
    all[idx].totalSpent   = (all[idx].totalSpent||0) + amount;
    all[idx].orderCount   = (all[idx].orderCount||0) + 1;
    all[idx].lastOrder    = new Date().toISOString();
    all[idx].avgDeliveryDays = days;
    // Compute avg days between orders
    if(all[idx].orderCount > 1) {
      // simple rolling: use a stored first-order date
      if(!all[idx]._firstOrder) all[idx]._firstOrder = new Date(Date.now()-30*24*60*60*1000).toISOString();
      const daysSinceFirst = Math.floor((Date.now()-new Date(all[idx]._firstOrder).getTime())/(1000*60*60*24));
      all[idx].avgDaysBetween = Math.round(daysSinceFirst / (all[idx].orderCount-1));
    }
    this.save(all);
    document.querySelector('[style*="fixed"][style*="align-items:center"]')?.remove();
    this.render();
    toast(`✅ Ordine di €${amount} registrato per ${all[idx].name}!`,'success');
  },


  _openModal(supplier){
    const modal=document.getElementById('si-modal');
    const body=document.getElementById('si-modal-body');
    if(!modal||!body) return;
    const s=supplier||{id:Date.now(),name:'',cat:'acrilico',country:'🇮🇹',url:'',materials:[],leadtime:3,reliability:90,lastPrice:0,unit:'foglio',notes:''};
    body.innerHTML=`
      <div style="padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
        <div style="font-size:15px;font-weight:800">${supplier?'✏️ Modifica':'➕ Nuovo'} Fornitore</div>
        <button onclick="document.getElementById('si-modal').style.display='none'" style="margin-left:auto;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px">✕</button>
      </div>
      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:10px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Nome *</label>
            <input id="si-f-name" class="form-control" value="${s.name}" style="font-size:13px"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Categoria</label>
            <select id="si-f-cat" class="form-control" style="font-size:12px">
              ${['acrilico','mdf','legno','ardesia','cuoio','altro'].map(c=>`<option value="${c}" ${s.cat===c?'selected':''}>${c}</option>`).join('')}
            </select></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">URL sito</label>
            <input id="si-f-url" class="form-control" value="${s.url}" placeholder="https://..." style="font-size:12px"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Paese</label>
            <select id="si-f-country" class="form-control" style="font-size:12px">
              ${['🇮🇹 Italia','🇩🇪 Germania','🇬🇧 UK','🇪🇺 Europa','🇺🇸 USA','🌍 Altro'].map(c=>`<option value="${c.split(' ')[0]}" ${s.country===c.split(' ')[0]?'selected':''}>${c}</option>`).join('')}
            </select></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Lead time (giorni)</label>
            <input id="si-f-lead" type="number" class="form-control" value="${s.leadtime}" style="font-size:13px"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Affidabilità (%)</label>
            <input id="si-f-rel" type="number" class="form-control" value="${s.reliability}" min="0" max="100" style="font-size:13px"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Ultimo prezzo (€)</label>
            <input id="si-f-price" type="number" step="0.01" class="form-control" value="${s.lastPrice}" style="font-size:13px"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Unità (es. foglio 60×90)</label>
            <input id="si-f-unit" class="form-control" value="${s.unit}" style="font-size:13px"></div>
        </div>
        <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Materiali (uno per riga)</label>
          <textarea id="si-f-mats" class="form-control" rows="3" style="font-size:12px;resize:none">${s.materials.join('\n')}</textarea></div>
        <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Note</label>
          <textarea id="si-f-notes" class="form-control" rows="2" style="font-size:12px;resize:none">${s.notes}</textarea></div>
        <div style="display:flex;gap:8px">
          <button onclick="(window.SupplierIntel||{_saveModal:()=>{}})._saveModal(${s.id},${!!supplier})" style="flex:1;padding:10px;background:linear-gradient(135deg,#22c55e,#059669);color:#fff;border:none;border-radius:9px;font-weight:800;cursor:pointer;font-size:13px">${supplier?'💾 Salva':'➕ Aggiungi'}</button>
          ${supplier?`<button onclick="(window.SupplierIntel||{_deleteSupplier:()=>{}})._deleteSupplier(${s.id})" style="padding:10px 16px;background:#ef444415;border:1px solid #ef444440;border-radius:9px;color:#ef4444;cursor:pointer;font-size:12px;font-weight:700">🗑 Elimina</button>`:''}
        </div>
      </div>`;
    modal.style.display='flex';
    modal.onclick=e=>{if(e.target===modal)modal.style.display='none';};
  },

  _saveModal(id,isEdit){
    const d=this.get();
    const item={
      id,
      name:document.getElementById('si-f-name')?.value?.trim()||'',
      cat:document.getElementById('si-f-cat')?.value||'altro',
      country:document.getElementById('si-f-country')?.value||'🇮🇹',
      url:document.getElementById('si-f-url')?.value?.trim()||'',
      materials:(document.getElementById('si-f-mats')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean),
      leadtime:parseInt(document.getElementById('si-f-lead')?.value)||3,
      reliability:parseInt(document.getElementById('si-f-rel')?.value)||90,
      lastPrice:parseFloat(document.getElementById('si-f-price')?.value)||0,
      unit:document.getElementById('si-f-unit')?.value||'foglio',
      notes:document.getElementById('si-f-notes')?.value?.trim()||'',
      lastOrder:'',nextOrder:''
    };
    if(!item.name){toast('Inserisci il nome','warning');return;}
    if(isEdit){const i=d.findIndex(s=>s.id===id);if(i>=0)d[i]=item;else d.push(item);}
    else d.push(item);
    this.save(d);
    document.getElementById('si-modal').style.display='none';
    toast(`✅ ${item.name} ${isEdit?'aggiornato':'aggiunto'}!`,'success');
    this.render();
  },

  _deleteSupplier(id){
    if(!confirm('Eliminare questo fornitore?')) return;
    this.save(this.get().filter(s=>s.id!==id));
    document.getElementById('si-modal').style.display='none';
    toast('Fornitore eliminato','info');
    this.render();
  },

  logOrder(id){
    const d=this.get(); const s=d.find(x=>x.id===id);
    if(!s) return;
    const qty=prompt(`Ordine ${s.name} — Quantità e importo (es: 10 fogli €185):`, '');
    if(!qty) return;
    s.lastOrder=new Date().toLocaleDateString('it-IT')+': '+qty;
    this.save(d); toast('📦 Ordine registrato!','success'); this.render();
  },

  async aiAnalyze(id){
    const s=this.get().find(x=>x.id===id);
    if(!s) return;
    try{
      const r=await AIStudio._callAI(`Analisi fornitore per un artigiano laser italiano:\nNome: ${s.name}\nCategoria: ${s.cat}\nLead time: ${s.leadtime} giorni\nAffidabilità: ${s.reliability}%\nUltimo prezzo: €${s.lastPrice}/${s.unit}\nNote: ${s.notes}\n\nFornisci: valutazione prestazioni, opportunità risparmio, rischi da monitorare, quando riordinare. Max 120 parole.`);
      alert(`🤖 Analisi ${s.name}:\n\n${r}`);
    }catch(e){toast('Configura API Key AI in Impostazioni','warning');}
  },

  async aiCompare(){
    const d=this.get();
    const out=document.getElementById('si-ai-output');
    if(out) out.innerHTML='<span style="color:var(--text-muted)">🤖 AI analizza tutti i fornitori…</span>';
    try{
      const summary=d.map(s=>`${s.name}(${s.cat},lead:${s.leadtime}gg,aff:${s.reliability}%,€${s.lastPrice}/${s.unit})`).join('; ');
      const r=await AIStudio._callAI(`Analisi ottimizzazione fornitori per artigiano laser italiano:\n${summary}\n\nFornisci: quale fornitore privilegiare per quale materiale, come ridurre lead time totale, dove rinegoziare prezzi, piano riordino ottimale. Max 200 parole.`);
      if(out) out.innerHTML=r.replace(/\*\*([^*]+)\*\*/g,'<strong style="color:#22c55e">$1</strong>').replace(/\n/g,'<br>');
    }catch(e){if(out) out.innerHTML='<span style="color:var(--text-muted)">Configura API Key AI in Impostazioni per analisi avanzata.</span>';}
  },

  // checkOverdueAlerts — called on app init
  async checkOverdueAlerts() {
    try {
      const suppliers = await IDB.getAll('suppliers').catch(()=>[]);
      const overdue = suppliers.filter(s => {
        if(!s.nextOrderDate) return false;
        return new Date(s.nextOrderDate) <= new Date();
      });
      if(overdue.length && typeof toast !== 'undefined') {
        toast(`🔄 ${overdue.length} fornitore/i con riordino in scadenza`, 'info');
      }
    } catch(e) { /* silent */ }
  },

  openModal(id){
    // Delegate to the correct supplier edit modal
    if(typeof SupplierIntel!=='undefined') SupplierIntel._openModal(id||null);
    else if(typeof SupplierIntelligence!=='undefined') SupplierIntelligence._openModal(id||null);
    else if(typeof toast!=='undefined') toast('Apri Fornitori per modificare','info');
  },

  openOrders(id){
    if(typeof toast!=='undefined') toast('Funzione ordini fornitore in arrivo','info');
  },

  exportCSV(){
    const all = typeof SupplierIntelligence!=='undefined' ? SupplierIntelligence.getAll() : [];
    if(!all.length){ if(typeof toast!=='undefined') toast('Nessun fornitore da esportare','warning'); return; }
    const csv = ['Nome,Categoria,URL,Specialità,Rating,Note,Spesa Totale',
      ...all.map(s=>[s.name||'',s.cat||'',s.url||'',s.specialty||'',s.rating||'',
        (s.notes||'').replace(/,/g,';'),(s.totalSpent||0)].join(','))].join('\n');
    const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download='fornitori_ingly.csv';a.click();
    if(typeof toast!=='undefined') toast('📤 CSV esportato!','success');
  },

  downloadCSVTemplate(){
    const csv='Nome,Categoria,URL,Specialità,Rating,Note\nEsempio Fornitore,materiali,https://...,MDF 3mm,5,Spedizione veloce';
    const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download='template_fornitori.csv';a.click();
  },

  importCSV(){
    const input=document.createElement('input');input.type='file';input.accept='.csv';
    input.onchange=async(e)=>{
      const file=e.target.files[0];if(!file)return;
      const text=await file.text();
      const lines=text.split('\n').filter(l=>l.trim());
      const hdrs=lines[0].toLowerCase().split(',');
      let imported=0;
      if(typeof SupplierIntelligence!=='undefined'){
        const existing=SupplierIntelligence.getAll();
        for(let i=1;i<lines.length;i++){
          const v=lines[i].split(',');
          const s={id:Date.now()+i,name:v[0]?.trim(),cat:v[1]?.trim()||'materiali',
            url:v[2]?.trim(),specialty:v[3]?.trim(),rating:+(v[4]||4),notes:v[5]?.trim()};
          if(s.name){existing.push(s);imported++;}
        }
        SupplierIntelligence.save(existing);
        if(typeof toast!=='undefined') toast('✅ '+imported+' fornitori importati!','success');
      }
    };input.click();
  },

  async _renderScopri(el) {
    const FORN = [
      {n:'Atomm.com',cat:'🇮🇹 IT',z:'IT',url:'https://www.atomm.com',mat:'Legni laser: betulla, tiglio, noce, mogano',min:'€5',del:'3-5gg',s:5,note:'MIGLIORE legni IT. Qualità costante.'},
      {n:'Artistico.it',cat:'🇮🇹 IT',z:'IT',url:'https://www.artistico.it',mat:'Plexiglass: trasparente, colorato, specchiato, fluorescente',min:'€10',del:'3-5gg',s:5,note:'Standard plexiglass laser IT.'},
      {n:'Lasertale EU',cat:'🇮🇹 IT',z:'IT',url:'https://www.lasertale.com',mat:'Plywood betulla/pioppo 3/4/6/8mm',min:'€15',del:'4-7gg',s:4,note:'Buona alternativa Atomm.'},
      {n:'Plexi.it',cat:'🇮🇹 IT',z:'IT',url:'https://www.plexi.it',mat:'Acrilico colato/estruso su misura',min:'€20',del:'5-7gg',s:4,note:'Fogli acrilico su misura B2B.'},
      {n:'Supermagnete.it',cat:'🇮🇹 IT',z:'IT',url:'https://www.supermagnete.it',mat:'Magneti neodimio, ferrite, gomma magnetica',min:'€1',del:'2-4gg',s:5,note:'Migliore per magneti Italia.'},
      {n:'RS Components IT',cat:'🇮🇹 IT',z:'IT',url:'https://it.rs-online.com',mat:'LED, driver, alimentatori, componenti',min:'€1',del:'1-2gg',s:5,note:'Standard componenti elettronici IT.'},
      {n:'Leroy Merlin',cat:'🇮🇹 IT',z:'IT',url:'https://www.leroymerlin.it',mat:'MDF 3/4/6mm, compensato, listelli',min:'€2',del:'Ritiro',s:3,note:'Economico MDF grezzo locale.'},
      {n:'Modulor.de',cat:'🇩🇪 EU',z:'EU',url:'https://www.modulor.de',mat:'MDF, plexiglass, legni, carta — ampia gamma',min:'€10',del:'5-8gg',s:5,note:'MIGLIORE EU per materiali creativi.'},
      {n:'Formulor.de',cat:'🇩🇪 EU',z:'EU',url:'https://www.formulor.de',mat:'Acrilico taglio su misura, MDF, plywood',min:'€5',del:'5-8gg',s:5,note:'Taglio acrilico su misura. Qualità eccellente.'},
      {n:'HobbyKing EU',cat:'🇪🇺 EU',z:'EU',url:'https://www.hobbyking.com',mat:'Balsa, plywood leggero modellismo',min:'€5',del:'5-10gg',s:3,note:'Materiali modellismo. Balsa laser.'},
      {n:'AliExpress',cat:'🇨🇳 Cina',z:'CN',url:'https://www.aliexpress.com',mat:'Plexiglass, legni, magneti, LED, gadget blank',min:'€0.5',del:'15-45gg',s:3,note:'Qualità variabile. Ottimo per stock massa.'},
      {n:'1688.com',cat:'🇨🇳 Cina B2B',z:'CN',url:'https://www.1688.com',mat:'Acrilico, legni, gadget blank — prezzi fabbrica',min:'MOQ',del:'20-40gg',s:4,note:'Prezzi fabbrica. Richiede agente.'},
      {n:'xTool Store',cat:'🇨🇳 Cina/IT',z:'CN',url:'https://www.xtool.com',mat:'Macchine laser xTool, accessori, materiali',min:'€20',del:'5-15gg',s:5,note:'Ufficiale xTool. Garanzia europea.'},
      {n:'Atomstack',cat:'🇨🇳 Cina',z:'CN',url:'https://www.atomstack.com',mat:'Macchine laser diodo A20/X20',min:'€50',del:'7-15gg',s:4,note:'Buon rapporto qualità/prezzo.'},
      {n:'OMTech Laser',cat:'🇨🇳 Cina/USA',z:'CN',url:'https://www.omtechlaserusa.com',mat:'Macchine CO2 40-150W, ricambi',min:'€200',del:'15-30gg',s:4,note:'Macchine CO2 qualità superiore.'},
      {n:'Gadget365.it',cat:'🇮🇹 IT Gadget',z:'IT',url:'https://www.gadget365.it',mat:'Portachiavi legno laser, gadget promo, tazze sub',min:'50pz',del:'5-10gg',s:5,note:'Leader gadget promo IT. Portachiavi legno da €0.55. 3000+ recensioni.'},
      {n:'BSI Gadget',cat:'🇮🇹 IT Gadget',z:'IT',url:'https://www.bsigadget.com',mat:'Portachiavi bambu/legno/metallo laser. Min 160pz.',min:'160pz',del:'7-10gg',s:4,note:'Prezzi competitivi grandi volumi. Bambu FSC.'},
      {n:'GiftCampaign.it',cat:'🇮🇹 IT Gadget',z:'IT',url:'https://www.giftcampaign.it',mat:'Portachiavi legno da €0.30, gadget economici',min:'50pz',del:'7gg',s:4,note:'PREZZI BASSI. Da €0.30 portachiavi. 7gg consegna gratis.'},
      {n:'HiGift.it',cat:'🇮🇹 IT Gadget',z:'IT',url:'https://www.higift.it',mat:'Portachiavi, tazze sub da €1.39, shopper, gadget B2B',min:'50pz',del:'7-10gg',s:4,note:'Campione disponibile. B2B professionale.'},
      {n:'Gadgetdiscount.it',cat:'🇮🇹 IT Sub',z:'IT',url:'https://www.gadgetdiscount.it',mat:'Tazze, cuscini, puzzle, pannelli MDF sublimazione',min:'€10',del:'3-5gg',s:5,note:'MIGLIORE oggettistica sub IT. Stock immediato. Made in Italy.'},
      {n:'Sublimet.com',cat:'🇪🇺 EU Sub',z:'EU',url:'https://www.sublimet.com/it',mat:'Tazze ceramica sub: AAA, B, magiche, vetro, 40oz',min:'€20',del:'5-8gg',s:5,note:'Ampia gamma tazze sub. Da €0.85/pz qualità B.'},
      {n:'ColorTarget.it',cat:'🇮🇹 IT Sub',z:'IT',url:'https://colortarget.it',mat:'Carta sublimazione A4/A3, nastro termico, teflon',min:'€10',del:'2-4gg',s:5,note:'Consumabili sublimazione qualita professionale IT.'},
      {n:'MyBay.it',cat:'🇮🇹 IT Sub',z:'IT',url:'https://www.mybay.it',mat:'Oggettistica sub: tazze, puzzle, cuscini, shopper',min:'€5',del:'3-5gg',s:4,note:'Stock variato prodotti sub. Prezzi retail.'},
      {n:'CPLFabbrika',cat:'🇮🇹 IT Sub',z:'IT',url:'https://www.cplfabbrika.com',mat:'Oggettistica neutra sub: tazze, cuscini, puzzle, portapenne',min:'€5',del:'3-5gg',s:4,note:'Catalogo completo sub. Qualita professionale.'},
      {n:'StampaSi.it',cat:'🇮🇹 IT Gadget',z:'IT',url:'https://www.stampasi.it',mat:'Portachiavi legno/bambu, configuratore online',min:'50pz',del:'7-10gg',s:5,note:'Leader IT. 25000+ clienti. Da €0.89. Configuratore online.'},
      {n:'BlueBag Italia',cat:'🇮🇹 IT Sub',z:'IT',url:'https://www.bluebagitalia.com',mat:'Tazze sub ceramica 350ml, gadget stock, ingrosso',min:'€10',del:'3-5gg',s:4,note:'Tazze sub ceramica a prezzi stock ingrosso.'},
      // ── ABBIGLIAMENTO INGROSSO ────────────────────────────────────────
      {n:'Wordans.it',cat:'🇮🇹 IT Abbigliamento',z:'IT',url:'https://www.wordans.it',mat:'Gildan, Fruit of Loom, B&C, Stanley/Stella, Sols, Next Level — ingrosso senza minimo',min:'1pz',del:'3-7gg',s:5,note:'MIGLIORE IT per abbigliamento neutro ingrosso. Nessun minimo. Gildan da €2.20/pz. 100+ brand.'},
      {n:'TeeFactory.it',cat:'🇮🇹 IT Abbigliamento',z:'IT',url:'https://teefactory.it/vendita-all-ingrosso',mat:'Fruit of Loom, Roly, JHK, Stanley/Stella, Kariban — B2B',min:'€50',del:'4-7gg',s:5,note:'Specializzato B2B abbigliamento neutro. Magazzino IT. Prezzi aggressivi su volumi.'},
      {n:'StampaSi.it (blank)',cat:'🇮🇹 IT Abbigliamento',z:'IT',url:'https://www.stampasi.it/brand/fruit-of-the-loom',mat:'Fruit of Loom blank + personalizzazione opzionale. Da €2.61/100pz.',min:'50pz',del:'5-10gg',s:4,note:'Possibilita: solo blank o con stampa già inclusa. OEKO-TEX certificato.'},
      {n:'HiGift Abbigliamento',cat:'🇮🇹 IT Abbigliamento',z:'IT',url:'https://www.higift.it/abbigliamento',mat:'Polo, t-shirt, felpe, gilet, abbigliamento lavoro B2B',min:'50pz',del:'7-10gg',s:4,note:'Vasto catalogo abbigliamento B2B. Campione disponibile. Qualita professionale.'},
      // ── PLEXIGLASS INGROSSO ────────────────────────────────────────────
      {n:'Temaplex Shop',cat:'🇮🇹 IT Plexiglass',z:'IT',url:'https://temaplex-shop.com/12-plexiglas-trasparente-incolore',mat:'Plexiglass XT trasparente 2-12mm. €32-146/mq. Taglio su misura.',min:'€20',del:'3-5gg',s:5,note:'Prezzi chiari: 3mm €42.94/mq, 4mm €57.10/mq, 5mm €72.10/mq. Taglio compreso.'},
      {n:'Materie-Plastiche.com',cat:'🇮🇹 IT Plexiglass',z:'IT',url:'https://www.materie-plastiche.com/catalogo/plexiglass/lastre-plexiglass-colorato-trasparente-alta-qualita-colato',mat:'Plexiglass colorato trasparente 3-5mm. Lastre 200x100cm da €76.40.',min:'€50',del:'3-7gg',s:5,note:'Colato alta qualita. 10+ colori. 200x100cm €76.40 IVA escl. Consegna tutta Italia.'},
      {n:'DesignTrasparente.com',cat:'🇮🇹 IT Plexiglass',z:'IT',url:'https://www.designtrasparente.com/it/140-lastre-plexiglass-pannelli-plex',mat:'Plexiglass trasparente, colorato, specchiato, opalino. Taglio su misura gratis.',min:'€15',del:'3-5gg',s:5,note:'Taglio su misura GRATIS. Perspex specchiato e fluorescente. Ottimo per laser.'},
      {n:'Pannelliplastica.it',cat:'🇮🇹 IT Plexiglass',z:'IT',url:'https://pannelliplastica.it/plexiglass/',mat:'Plexiglass trasparente, opalino, colorato, opaco su misura.',min:'€10',del:'2-5gg',s:4,note:'Configuratore su misura online. Ottimo per piccole quantita. Spedisce IT.'},
      {n:'SintPlast IT',cat:'🇮🇹 IT Plexiglass B2B',z:'IT',url:'https://www.sintplast.it',mat:'Acrilico distributor B2B. Lastre 200x300cm all ingrosso prezzi.',min:'€100',del:'5-10gg',s:4,note:'B2B prezzi netto all ingrosso. Per acquisti grandi quantita.'},
      // ── STAMPA DTF / UV ────────────────────────────────────────────────
      {n:'CPLFabbrika (DTF/UV)',cat:'🇮🇹 IT DTF/UV',z:'IT',url:'https://www.cplfabbrika.com/servizio-di-stampa-transfer-dtf.html',mat:'DTF da €13/metro · DTF UV da €23/metro · sublimazione 60cm',min:'€13',del:'2-5gg',s:5,note:'MIGLIORE per DTF e DTF UV IT. Qualita Made in Italy. DTF su tessuto e UV su oggetti rigidi.'},
      {n:'PrintDTF.it',cat:'🇮🇹 IT DTF',z:'IT',url:'https://printdtf.it',mat:'DTF transfer + sublimazione 60cm. Per tessuti e oggettistica.',min:'€20',del:'2-4gg',s:4,note:'Configuratore online. Sublimazione DTF 60cm luce. Nessun minimo trasferimento singolo.'},
      {n:'Weloco.it (DTF UV)',cat:'🇮🇹 IT DTF/UV',z:'IT',url:'https://weloco.it/it/configuratore/transfer-dtf-uv',mat:'DTF UV per oggetti. 58cm max luce. Configura e ordina online.',min:'€10',del:'3-5gg',s:4,note:'Configuratore DTF UV online. Adesivi ultra resistenti per plexiglass, legno, metallo.'},
      {n:'Realisaprint.it',cat:'🇮🇹 IT DTF',z:'IT',url:'https://www.realisaprint.it/dtf-metro-r2711.html',mat:'DTF metro 54cm larghezza. Produzione grandi volumi.',min:'€15',del:'3-5gg',s:4,note:'DTF al metro formato continuo. 54cm larghezza. Produzione su bobina alta efficienza.'},
    ];
    const zones = [{key:'IT',label:'🇮🇹 Italia',c:'#10b981'},{key:'EU',label:'🇪🇺 Europa',c:'#3b82f6'},{key:'CN',label:'🇨🇳 Cina/Asia',c:'#f59e0b'}];
    const byZ = {};
    FORN.forEach(function(f){ if(!byZ[f.z]) byZ[f.z]=[]; byZ[f.z].push(f); });
    let H='<div style="padding:14px 18px;max-width:1300px;margin:0 auto">';
    H+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">';
    H+='<div><div style="font-size:18px;font-weight:900;color:var(--text)">🌍 Scopri Fornitori Laser</div>';
    H+='<div style="font-size:11px;color:var(--text-muted)">Database Italia · Europa · Cina</div></div>';
    H+='<button onclick="SuppliersManager._tab=\'mylist\';SuppliersManager.render()" style="padding:7px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted)">← Lista mia</button>';
    H+='</div>';
    zones.forEach(function(zone){
      var items=byZ[zone.key]||[];
      H+='<div style="margin-bottom:18px">';
      H+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:9px;padding-bottom:5px;border-bottom:2px solid '+zone.c+'30">';
      H+='<div style="font-size:14px;font-weight:800;color:'+zone.c+'">'+zone.label+'</div>';
      H+='<span style="background:'+zone.c+'18;color:'+zone.c+';padding:2px 9px;border-radius:99px;font-size:10px;font-weight:700">'+items.length+' fornitori</span></div>';
      H+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:9px">';
      items.forEach(function(f){
        H+='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:11px;padding:11px 13px">';
        H+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">';
        H+='<div><div style="font-size:13px;font-weight:800;color:var(--text)">'+(f.url?'<a href="'+f.url+'" target="_blank" rel="noopener" style="color:var(--text);text-decoration:none">'+f.n+' 🌐</a>':f.n)+'</div>';
        H+='<div style="font-size:10px;color:var(--text-muted)">'+f.cat+'</div></div>';
        H+='<button onclick="SuppliersManager._addForn(this)" data-name="'+f.n+'" style="padding:3px 9px;background:rgba(167,139,250,.12);color:#a78bfa;border:1px solid rgba(167,139,250,.3);border-radius:7px;cursor:pointer;font-size:10px;font-weight:700;flex-shrink:0">+ Aggiungi</button></div>';
        H+='<div style="font-size:11px;color:var(--text-muted);margin-bottom:5px">'+f.mat+'</div>';
        H+='<div style="display:flex;gap:8px;font-size:10px;color:var(--text-dim)">'+(f.min?'<span>Min: '+f.min+'</span>':'')+(f.del?'<span>⏱️ '+f.del+'</span>':'')+'</div>';
        if(f.note) H+='<div style="font-size:9px;color:var(--text-dim);margin-top:4px;font-style:italic">'+f.note+'</div>';
        H+='</div>';
      });
      H+='</div></div>';
    });
    H+='</div>';
    el.innerHTML=H;
  },

  async _addForn(btn) {
    var name=(btn&&btn.dataset&&btn.dataset.name)||'Fornitore';
    var item={id:Date.now(),name:name,category:'Fornitore',zone:'IT',website:'',materials:'',notes:'Da DB Scopri Fornitori',rating:3,trusted:false,updatedAt:new Date().toISOString()};
    await IDB.put('suppliers',item).catch(function(){});
    if(typeof toast!=='undefined') toast('✅ '+name+' aggiunto!','success');
    btn.textContent='✅';btn.disabled=true;
  },
};
if(typeof SupplierIntel !== 'undefined') window.SupplierIntel = SupplierIntel;


// ═══════════════════════════════════════════════════════════════════════
// 💬 REPLY ASSISTANT — AI risponde a recensioni e messaggi Etsy
// ═══════════════════════════════════════════════════════════════════════
const ReplyAI = {
  _SK: 'ingly_reply_history_v1',

  _TEMPLATES: {
    review5: {label:'⭐⭐⭐⭐⭐ Recensione 5 stelle',prompt:'Scrivi una risposta calorosa e professionale a questa recensione 5 stelle di Etsy per un artigiano laser siciliano. Ringrazia, menziona il prodotto specifico se riportato, invita a tornare. 2-3 righe. In italiano.'},
    review3: {label:'⭐⭐⭐ Recensione 3 stelle',prompt:'Scrivi una risposta empatica e professionale a questa recensione 3 stelle di Etsy. Ringrazia il feedback, spiega le azioni che prendi per migliorare, mostra disponibilità. 3-4 righe. In italiano.'},
    review1: {label:'⭐ Recensione negativa',prompt:'Scrivi una risposta professionale, calma e costruttiva a questa recensione negativa di Etsy per un artigiano laser. Non essere difensivo, mostra empatia, offri soluzione concreta. 3-4 righe. In italiano.'},
    shipping: {label:'📦 Domanda spedizione',prompt:'Risposta professionale a questa domanda sulla spedizione Etsy. Rassicura sui tempi, dai info tracking se disponibile, mantieni tono cordiale. 2-3 righe. In italiano.'},
    custom: {label:'🎨 Richiesta personalizzazione',prompt:'Risposta entusiasta a questa richiesta di personalizzazione Etsy. Conferma disponibilità, chiedi le info necessarie (nome, data, colore, dimensione), dai tempi di produzione. 3-4 righe. In italiano.'},
    delay: {label:'⏰ Ritardo consegna',prompt:'Risposta empatica per informare il cliente di un ritardo nella spedizione. Spiega la causa brevemente, dai nuovo timing, scusa il disagio, offri aggiornamento. 3-4 righe. In italiano.'},
    quote: {label:'💰 Richiesta preventivo',prompt:'Risposta professionale a questa richiesta di preventivo. Chiedi i dettagli necessari per quotare (quantità, misure, personalizzazione), dai un range di prezzo orientativo se possibile. 3-4 righe. In italiano.'},
    english_review: {label:'🌍 Review in English',prompt:'Write a warm, professional response to this Etsy review for an Italian laser craftsman. Thank them, mention the product if referenced, invite them back. 2-3 lines. In English.'},
  },

  getHistory(){ try{return JSON.parse(localStorage.getItem(this._SK)||'[]')}catch{return[]} },
  saveHistory(h){ try{localStorage.setItem(this._SK,JSON.stringify(h.slice(0,50)))}catch{} },

  render(){
    const el=document.getElementById('view-replyai');
    if(!el) return;
    const history=this.getHistory();

    el.innerHTML=`
    <div style="padding:16px 20px;max-width:1100px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">
        <div style="width:48px;height:48px;border-radius:13px;background:linear-gradient(135deg,#60a5fa,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:24px">💬</div>
        <div>
          <h2 style="margin:0 0 2px;font-size:20px;font-weight:800;background:linear-gradient(135deg,#60a5fa,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Reply Assistant AI</h2>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">Rispondi a recensioni e messaggi Etsy in secondi · IT + EN · Tono professionale e caldo</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <!-- LEFT: Input -->
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border)">
            <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📋 Tipo di messaggio</div>
            <div style="display:flex;flex-direction:column;gap:5px">
              ${Object.entries(this._TEMPLATES).map(([k,t])=>`
                <button onclick="document.getElementById('ra-type').value='${k}';document.querySelectorAll('.ra-type-btn').forEach(b=>{b.style.background='var(--bg-card2)';b.style.borderColor='var(--border)';b.style.color='var(--text-muted)'});this.style.background='var(--primary-dim)';this.style.borderColor='var(--primary)';this.style.color='var(--primary)'"
                  class="ra-type-btn" style="padding:7px 12px;text-align:left;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);cursor:pointer;font-size:11px;font-weight:600;transition:.15s">
                  ${t.label}
                </button>`).join('')}
              <input id="ra-type" value="review5" type="hidden">
            </div>
          </div>
          <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
            <label style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">✍️ Testo ricevuto</label>
            <textarea id="ra-input" class="form-control" rows="5" placeholder="Incolla qui la recensione o il messaggio del cliente…" style="font-size:13px;resize:none"></textarea>
            <div style="display:flex;gap:6px;margin-top:8px">
              <button onclick="ReplyAI.generate()" style="flex:1;padding:10px;background:linear-gradient(135deg,#60a5fa,#3b82f6);color:#fff;border:none;border-radius:9px;font-weight:800;cursor:pointer;font-size:13px">🤖 Genera Risposta</button>
              <button onclick="ReplyAI.clear()" style="padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text-muted);cursor:pointer;font-size:12px">✕</button>
            </div>
          </div>
        </div>

        <!-- RIGHT: Output + History -->
        <div style="display:flex;flex-direction:column;gap:12px">
          <div id="ra-output" style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border);min-height:180px;display:flex;align-items:center;justify-content:center">
            <div style="text-align:center;color:var(--text-muted)">
              <div style="font-size:36px;margin-bottom:8px">💬</div>
              <div style="font-size:12px">Seleziona tipo, incolla il testo e genera</div>
            </div>
          </div>

          ${history.length?`
          <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
            <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">🕐 Ultime risposte generate</div>
            <div style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto">
              ${history.slice(0,6).map(h=>`
                <div style="padding:8px 10px;border-radius:8px;background:var(--bg-card2);border:1px solid var(--border);cursor:pointer;transition:.15s" onclick="document.getElementById('ra-output').innerHTML=this.dataset.content" data-content="${h.reply.replace(/"/g,'&quot;')}">
                  <div style="font-size:10px;font-weight:700;color:var(--primary)">${h.type}</div>
                  <div style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.reply.slice(0,60)}…</div>
                  <div style="font-size:9px;color:var(--text-dim);margin-top:2px">${h.ts}</div>
                </div>`).join('')}
            </div>
          </div>`:''}
        </div>
      </div>
    </div>`;
  },

  async generate(){
    const input=document.getElementById('ra-input')?.value?.trim();
    const typeKey=document.getElementById('ra-type')?.value||'review5';
    const out=document.getElementById('ra-output');
    if(!input){toast('Incolla il testo prima','warning');return;}
    if(!out) return;
    out.innerHTML='<div style="text-align:center;color:var(--text-muted);padding:20px">🤖 Generazione risposta…</div>';
    const tpl=this._TEMPLATES[typeKey];
    try{
      const r=await AIStudio._callAI(`${tpl.prompt}\n\nTesto ricevuto:\n"${input}"\n\nRispondi SOLO con il testo della risposta, nessun prefisso o spiegazione.`);
      out.innerHTML=`
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border)">
            <div style="font-size:12px;font-weight:700;color:#60a5fa">${tpl.label}</div>
            <div style="display:flex;gap:6px">
              <button onclick="navigator.clipboard.writeText(document.getElementById('ra-reply-text').innerText).then(()=>toast('📋 Copiato!','success'))" style="padding:4px 10px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:6px;color:var(--primary);cursor:pointer;font-size:10px;font-weight:700"><i class="fas fa-copy"></i> Copia</button>
              <button onclick="ReplyAI.regenerate()" style="padding:4px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:10px"><i class="fas fa-redo"></i></button>
            </div>
          </div>
          <div id="ra-reply-text" style="font-size:13px;line-height:1.8;color:var(--text);white-space:pre-wrap">${r}</div>
        </div>`;
      // Save to history
      const h=this.getHistory();
      h.unshift({type:tpl.label,reply:r,ts:new Date().toLocaleString('it-IT')});
      this.saveHistory(h);
    }catch(e){
      out.innerHTML='<div style="text-align:center;padding:20px"><div style="color:var(--text-muted);font-size:12px">Configura API Key AI in Impostazioni</div><button onclick="App.navigate(\'settings\')" class="btn btn-primary btn-sm" style="margin-top:8px">⚙️ Impostazioni</button></div>';
    }
  },

  async regenerate(){
    await this.generate();
  },

  clear(){
    const inp=document.getElementById('ra-input');
    const out=document.getElementById('ra-output');
    if(inp) inp.value='';
    if(out) out.innerHTML='<div style="text-align:center;color:var(--text-muted)"><div style="font-size:36px;margin-bottom:8px">💬</div><div style="font-size:12px">Seleziona tipo, incolla il testo e genera</div></div>';
  }
};
window.ReplyAI = ReplyAI;


// ═══════════════════════════════════════════════════════════════════════
// 📸 PHOTO STUDIO AI — Guida fotografia professionale prodotti laser
// ═══════════════════════════════════════════════════════════════════════
const PhotoStudio = {

  _SETUPS: [
    {id:'tabletop',em:'📦',name:'Flat Lay — Top Down',diff:'Facile',time:'15 min',
     equipment:['Sfondo neutro (bianco/legno)','Luce naturale finestra nord','Smartphone o mirrorless'],
     steps:['Posiziona prodotto su sfondo pulito a 60cm dalla finestra','Usa Canva o piastrelle bianche come sfondo','Scatta dall\'alto con griglia attivata','Aggiungi props: foglie, fiori, nastri','Modifica: +10 contrasto, +15 saturazione, rimuovi bg'],
     tip:'Per legno usa sfondo miele/marmo. Per acrilico usa sfondo nero o specchio.',
     best_for:'Portachiavi, coaster, targhe piccole, ornamenti'},
    {id:'lifestyle',em:'🏠',name:'Lifestyle — Ambientato',diff:'Media',time:'30 min',
     equipment:['Location: cucina, scrivania, tavolo legno','Luce naturale morbida','Riflettore bianco (foglio A3)'],
     steps:['Scegli location coerente con il prodotto','Prepara la scena con oggetti complementari','Usa riflettore per ridurre ombre dure','Scatta da 3 angoli: 45°, laterale, top','Seleziona la foto con più "vita"'],
     tip:'Il prodotto deve essere il protagonista. Props massimo 3 oggetti.',
     best_for:'Tazze, cornici, targhe famiglia, decorazioni casa'},
    {id:'white',em:'⬜',name:'Fondo Bianco — E-commerce',diff:'Facile',time:'20 min',
     equipment:['Lightbox o finestra + cartoncino bianco','2 fonti luce soft','Treppiede o appoggio stabile'],
     steps:['Costruisci mini lightbox con cartone e carta velina','Posiziona prodotto al centro','Illumina da 2 lati con luce diffusa','Scatta con ISO basso, apertura f/8','Remove.bg per sfondo perfetto in 1 click'],
     tip:'Per Etsy lo sfondo bianco puro aumenta CTR del 18-25%. Standardizzalo per tutto il catalogo.',
     best_for:'Tutto il catalogo. Obbligatorio come prima foto listing Etsy'},
    {id:'detail',em:'🔍',name:'Macro — Dettaglio Incisione',diff:'Media',time:'25 min',
     equipment:['Modalità macro smartphone','Luce radente (da lato, angolo basso)','Treppiede mini'],
     steps:['Luce radente a 10-15° per valorizzare profondità incisione','Metti a fuoco sul dettaglio più bello','Usa modalità ritratto per sfocatura controllata','Scatta 5-6 varianti, seleziona la più nitida','Applica sharpening leggero in post'],
     tip:'La luce radente è il segreto: esalta ogni solco e rende l\'artigianalità visibile.',
     best_for:'Secondarie foto listing. "Zoom" del dettaglio incisione'},
    {id:'packaging',em:'🎁',name:'Packaging & Unboxing',diff:'Media',time:'35 min',
     equipment:['Sfondo tessuto neutro','Packaging premium (box, nastro, tissue)','Luce soft bilaterale'],
     steps:['Disponi prodotto con packaging aperto intorno','Aggiungi biglietto grazie scritto a mano','Scatta con angolo 30° per profondità','Mostra il "viaggio" dal box al prodotto','Usa filtro caldo per atmosfera regalo'],
     tip:'Le foto packaging aumentano il valore percepito del 40%. Giustifica prezzi più alti.',
     best_for:'Foto 4-5 listing. Regalo di nozze, compleanno, premium'},
  ],

  _EDITING_TIPS: [
    {app:'Lightroom Mobile',price:'Gratis',tip:'Preset personalizzato: +20 clarity, +10 vibrance, -5 highlights. Salva e applica in 1 tap a tutte le foto.'},
    {app:'Snapseed',price:'Gratis',tip:'Strumento "Dettagli" per sharpening laser. Strumento "Selettivo" per correggere solo lo sfondo.'},
    {app:'Remove.bg',price:'Gratis 50/mese',tip:'Sfondo bianco perfetto in 5 secondi. Indispensabile per la prima foto Etsy.'},
    {app:'Canva Pro',price:'€13/mese',tip:'Crea mockup lifestyle in minuti. Template per cornici, muri, tavoli. Risparmia ore di setup.'},
    {app:'Adobe Firefly',price:'Gratis',tip:'Genera sfondi AI fotorealistici. Posiziona il tuo prodotto in ambienti impossibili da fotografare.'},
  ],

  render(){
    const el=document.getElementById('view-photostudio');
    if(!el) return;

    el.innerHTML=`
    <div style="padding:16px 20px;max-width:1200px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">
        <div style="width:48px;height:48px;border-radius:13px;background:linear-gradient(135deg,#f97316,#fbbf24);display:flex;align-items:center;justify-content:center;font-size:24px">📸</div>
        <div style="flex:1">
          <h2 style="margin:0 0 2px;font-size:20px;font-weight:800;background:linear-gradient(135deg,#f97316,#fbbf24);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Photo Studio AI</h2>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">Setup fotografici · Editing tips · App consigliate · AI foto prompt generator · Guida CTR Etsy</p>
        </div>
        <button onclick="PhotoStudio.generateAIPrompt()" style="padding:8px 14px;background:linear-gradient(135deg,#f97316,#fbbf24);color:#000;border:none;border-radius:9px;font-weight:700;cursor:pointer;font-size:12px">🤖 Genera AI Photo Prompt</button>
      </div>

      <!-- SETUPS GRID -->
      <div style="margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📋 Setup Fotografici — Istruzioni Step-by-Step</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
          ${this._SETUPS.map(s=>`
            <div style="background:var(--bg-card);border-radius:12px;border:1px solid var(--border);overflow:hidden;cursor:pointer;transition:.18s"
              onclick="PhotoStudio.openSetup('${s.id}')"
              onmouseover="this.style.borderColor='#f97316';this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px #0006'"
              onmouseout="this.style.borderColor='var(--border)';this.style.transform='';this.style.boxShadow=''">
              <div style="padding:12px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;background:#f9731610">
                <span style="font-size:24px">${s.em}</span>
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:800;color:#f97316">${s.name}</div>
                  <div style="font-size:10px;color:var(--text-muted)">${s.diff} · ⏱ ${s.time}</div>
                </div>
                <i class="fas fa-chevron-right" style="color:var(--text-dim);font-size:10px"></i>
              </div>
              <div style="padding:10px 14px">
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:6px">📷 Per: ${s.best_for}</div>
                <div style="font-size:10px;font-style:italic;color:var(--text-dim);line-height:1.4">💡 ${s.tip}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>

      <!-- EDITING APPS -->
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">✨ App di Editing Consigliate</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">
          ${this._EDITING_TIPS.map(a=>`
            <div style="padding:12px;background:var(--bg-card);border-radius:10px;border:1px solid var(--border)">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <div style="font-size:12px;font-weight:800;color:var(--text)">${a.app}</div>
                <span style="padding:2px 7px;border-radius:99px;font-size:9px;font-weight:700;background:var(--primary-dim);color:var(--primary);border:1px solid var(--primary-border)">${a.price}</span>
              </div>
              <div style="font-size:10px;color:var(--text-muted);line-height:1.5">${a.tip}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- AI PROMPT SECTION -->
      <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
        <div style="font-size:11px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🤖 AI Photo Prompt Generator — per Midjourney / DALL-E / Firefly</div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <input id="ps-product" class="form-control" placeholder="Descrivi il prodotto (es: portachiavi legno inciso con nome)" style="flex:2;font-size:12px">
          <select id="ps-style" class="form-control" style="flex:1;font-size:12px">
            <option>Lifestyle caldo</option>
            <option>Flat lay minimalista</option>
            <option>E-commerce bianco</option>
            <option>Dark moody</option>
            <option>Nordic hygge</option>
          </select>
          <button onclick="PhotoStudio.generateAIPrompt()" style="padding:8px 16px;background:linear-gradient(135deg,#f97316,#fbbf24);color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px">Genera →</button>
        </div>
        <div id="ps-prompt-output" style="font-size:12px;color:var(--text-muted)">Inserisci il prodotto e genera un prompt fotografico AI pronto per Midjourney, DALL-E o Adobe Firefly.</div>
      </div>

      <!-- SETUP DETAIL MODAL -->
      <div id="ps-modal" style="display:none;position:fixed;inset:0;background:#000b;z-index:9999;align-items:center;justify-content:center;padding:20px">
        <div id="ps-modal-body" style="background:var(--bg-card);border-radius:16px;width:min(580px,96vw);max-height:85vh;overflow-y:auto;border:1px solid var(--border2);box-shadow:0 24px 64px #000c"></div>
      </div>
    </div>`;
  },

  openSetup(id){
    const s=this._SETUPS.find(x=>x.id===id);
    if(!s) return;
    const modal=document.getElementById('ps-modal');
    const body=document.getElementById('ps-modal-body');
    if(!modal||!body) return;
    body.innerHTML=`
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
        <span style="font-size:24px">${s.em}</span>
        <div>
          <div style="font-size:15px;font-weight:800">${s.name}</div>
          <div style="font-size:10px;color:var(--text-muted)">${s.diff} · ${s.time} · Per: ${s.best_for}</div>
        </div>
        <button onclick="document.getElementById('ps-modal').style.display='none'" style="margin-left:auto;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px">✕</button>
      </div>
      <div style="padding:16px 20px">
        <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">🛠️ Attrezzatura necessaria</div>
        <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:14px">
          ${s.equipment.map(e=>`<div style="display:flex;gap:8px;align-items:center;padding:6px 8px;background:var(--bg-card2);border-radius:7px;font-size:12px"><span style="color:#f97316">✓</span>${e}</div>`).join('')}
        </div>
        <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">📋 Step-by-step</div>
        ${s.steps.map((step,i)=>`
          <div style="display:flex;gap:12px;padding:10px 12px;background:var(--bg-card2);border-radius:9px;margin-bottom:6px;border:1px solid var(--border)">
            <div style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#f97316,#fbbf24);display:flex;align-items:center;justify-content:center;color:#000;font-size:11px;font-weight:800;flex-shrink:0">${i+1}</div>
            <div style="font-size:12px;color:var(--text);line-height:1.5">${step}</div>
          </div>`).join('')}
        <div style="margin-top:12px;padding:10px 14px;background:#f9731615;border-radius:9px;border:1px solid #f9731630;font-size:12px;color:var(--text)">
          💡 <strong>Pro tip:</strong> ${s.tip}
        </div>
      </div>`;
    modal.style.display='flex';
    modal.onclick=e=>{if(e.target===modal)modal.style.display='none';};
  },

  async generateAIPrompt(){
    const product=document.getElementById('ps-product')?.value?.trim()||'prodotto laser artigianale';
    const style=document.getElementById('ps-style')?.value||'Lifestyle caldo';
    const out=document.getElementById('ps-prompt-output');
    if(out) out.innerHTML='<span style="color:var(--text-muted)">🤖 Generazione prompt fotografico…</span>';
    try{
      const r=await AIStudio._callAI(`Genera 2 prompt fotografici pronti per Midjourney/DALL-E per questo prodotto laser artigianale italiano:\nProdotto: ${product}\nStile richiesto: ${style}\n\nPer ogni prompt: scrivi il prompt in inglese (per AI image gen), poi spiega cosa renderà speciale la foto per Etsy.\nMax 200 parole totali.`);
      if(out) out.innerHTML=`<div style="font-size:12px;line-height:1.7">${r.replace(/\*\*([^*]+)\*\*/g,'<strong style="color:#f97316">$1</strong>').replace(/\n/g,'<br>')}</div>
        <button onclick="navigator.clipboard.writeText(document.getElementById('ps-prompt-raw').textContent).then(()=>toast('📋 Prompt copiato!','success'))" style="margin-top:8px;padding:5px 12px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:6px;color:var(--primary);cursor:pointer;font-size:11px;font-weight:700"><i class="fas fa-copy"></i> Copia prompt</button>
        <span id="ps-prompt-raw" style="display:none">${r}</span>`;
    }catch(e){
      if(out) out.innerHTML='<span style="color:var(--text-muted)">Configura API Key AI in Impostazioni per il prompt generator.</span>';
    }
  }
};
window.PhotoStudio = PhotoStudio;


// ═══════════════════════════════════════════════════════════════════════
// 🎪 FIERA ASSISTANT — Pianificatore fiere e mercatini laser
// ═══════════════════════════════════════════════════════════════════════
const FieraAI = {
  _SK: 'ingly_fiere_v1',

  _CHECKLIST: {
    prep:['📋 Modulo iscrizione completato e pagato','📦 Stock prodotti: almeno 3× previsto vendite','🏷️ Prezzi su tutti i prodotti','💳 POS / Satispay configurato','📄 Ricevuta/scontrino (se richiesto)','🧾 P.IVA / documento per tassa fiera','📸 Banner/insegna con nome e social','📱 QR code shop Etsy stampato'],
    stand:['🛖 Struttura stand (tavolo, espositori)','🔌 Prolunga elettrica 10m','💡 Luci LED per valorizzare prodotti','🪣 Contenitori espositivi per serie','📦 Box riserva sotto al tavolo','🎁 Packaging borse/sacchetti','✂️ Forbici, nastro, scotch','🖊️ Penna e blocco note ordini'],
    day:['⏰ Arrivo 2h prima apertura','📷 Foto stand allestito (content)','💬 Script accoglienza clienti pronto','🔋 Powerbank per telefono','💊 Acqua e snack per la giornata','📊 Foglio conta-vendite semplice'],
  },

  _ITALIAN_FAIRS: [
    {name:'L\'Artigiano in Fiera',city:'Milano (Rho)',month:'Dicembre',size:'★★★★★',url:'https://www.artigianoinfiera.it/',info:'La più grande fiera dell\'artigianato in Europa. 100k+ visitatori. Candidatura annuale.'},
    {name:'Fatto a mano (varie)',city:'Varie città IT',month:'Tutto anno',size:'★★★',url:'https://www.fattoamano.it/',info:'Rete mercatini artigianato italiani. Iscrizione per ogni evento.'},
    {name:'Etsy Made Local',city:'Milano, Roma, Firenze',month:'Novembre/Dicembre',size:'★★★★',url:'https://www.etsy.com/it/about/events/',info:'Evento ufficiale Etsy per seller italiani. Alta visibilità online.'},
    {name:'Mercatini Natale',city:'Bolzano, Trento, Torino',month:'Novembre-Dicembre',size:'★★★★',url:'https://www.mercatinodinatale.com/',info:'Turisti internazionali. Prodotti laser ottimi. Lista d\'attesa lunga, iscriviti in estate.'},
    {name:'Fiera del Levante',city:'Bari',month:'Settembre',size:'★★★★',url:'https://www.fieradellevante.it/',info:'La più importante del Sud Italia. Sezione artigianato attiva.'},
  ],

  getFiere(){ try{return JSON.parse(localStorage.getItem(this._SK)||'[]')}catch{return[]} },
  saveFiere(d){ try{localStorage.setItem(this._SK,JSON.stringify(d))}catch{} },

  render(){
    const el=document.getElementById('view-fiera');
    if(!el) return;
    const fiere=this.getFiere();

    el.innerHTML=`
    <div style="padding:16px 20px;max-width:1200px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">
        <div style="width:48px;height:48px;border-radius:13px;background:linear-gradient(135deg,#ec4899,#a855f7);display:flex;align-items:center;justify-content:center;font-size:24px">🎪</div>
        <div style="flex:1">
          <h2 style="margin:0 0 2px;font-size:20px;font-weight:800;background:linear-gradient(135deg,#ec4899,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Fiera Assistant</h2>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">Calendario fiere · Calcolo ROI · Checklist stand · Fiere italiane consigliati · Analisi AI</p>
        </div>
        <button onclick="FieraAI.openAddFiera()" style="padding:8px 14px;background:linear-gradient(135deg,#ec4899,#a855f7);color:#fff;border:none;border-radius:9px;font-weight:700;cursor:pointer;font-size:12px"><i class="fas fa-plus"></i> Aggiungi Fiera</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <!-- LEFT COL -->
        <div style="display:flex;flex-direction:column;gap:14px">

          <!-- My fiere -->
          <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
            <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📅 Le Mie Fiere</div>
            ${fiere.length?fiere.map(f=>{
              const roi=f.revenue&&f.costs?((f.revenue-f.costs)/f.costs*100).toFixed(0):null;
              return `<div style="padding:10px 12px;border-radius:9px;border:1px solid var(--border);background:var(--bg-card2);margin-bottom:6px">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                  <div style="font-size:13px;font-weight:700;color:var(--text)">${f.name}</div>
                  ${roi?`<span style="font-size:11px;font-weight:800;color:${parseFloat(roi)>0?'#22c55e':'#ef4444'}">ROI ${roi}%</span>`:''}
                </div>
                <div style="font-size:10px;color:var(--text-muted)">${f.city} · ${f.date} · Budget: €${f.costs||'—'} · Revenue: €${f.revenue||'—'}</div>
                <div style="display:flex;gap:5px;margin-top:6px">
                  <button onclick="FieraAI.openChecklist('${f.id}')" style="padding:3px 8px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:5px;color:var(--primary);cursor:pointer;font-size:9px;font-weight:700">✅ Checklist</button>
                  <button onclick="FieraAI.editFiera('${f.id}')" style="padding:3px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:5px;color:var(--text-muted);cursor:pointer;font-size:9px">✏️ Modifica</button>
                  <button onclick="FieraAI.aiTips('${f.id}')" style="padding:3px 8px;background:#ec489912;border:1px solid #ec489930;border-radius:5px;color:#ec4899;cursor:pointer;font-size:9px;font-weight:700">🤖 AI Tips</button>
                </div>
              </div>`;
            }).join(''):`<div style="text-align:center;padding:24px;color:var(--text-muted)"><div style="font-size:32px;margin-bottom:8px">🎪</div><div style="font-size:12px">Nessuna fiera pianificata.<br>Aggiungine una!</div></div>`}
          </div>

          <!-- ROI Calculator -->
          <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
            <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🧮 Calcolatore ROI Fiera</div>
            <div style="display:flex;flex-direction:column;gap:7px">
              ${[
                ['fa-ticket-alt','Costo iscrizione (€)','fa-roi-fee','120'],
                ['fa-road','Viaggio + vitto (€)','fa-roi-travel','50'],
                ['fa-box','Costo stock portato (€)','fa-roi-stock','300'],
                ['fa-tools','Allestimento stand (€)','fa-roi-stand','80'],
              ].map(([ico,label,id,def])=>`
                <div style="display:flex;align-items:center;gap:8px">
                  <i class="fas ${ico}" style="color:var(--text-dim);font-size:11px;width:14px"></i>
                  <label style="font-size:11px;color:var(--text-muted);flex:1">${label}</label>
                  <input id="${id}" type="number" value="${def}" oninput="FieraAI.calcROI()"
                    style="width:80px;padding:4px 8px;background:var(--bg-card2);border:1px solid var(--border2);border-radius:6px;color:var(--text);font-size:12px;text-align:right">
                </div>`).join('')}
              <div style="height:1px;background:var(--border);margin:4px 0"></div>
              <div style="display:flex;align-items:center;gap:8px">
                <i class="fas fa-euro-sign" style="color:#22c55e;font-size:11px;width:14px"></i>
                <label style="font-size:11px;color:var(--text);flex:1;font-weight:700">Revenue stimata (€)</label>
                <input id="fa-roi-rev" type="number" value="600" oninput="FieraAI.calcROI()"
                  style="width:80px;padding:4px 8px;background:var(--bg-card2);border:1px solid #22c55e50;border-radius:6px;color:#22c55e;font-size:12px;text-align:right;font-weight:700">
              </div>
              <div id="fa-roi-result" style="padding:10px 12px;background:var(--bg-card2);border-radius:8px;font-size:12px;margin-top:4px;text-align:center;font-weight:700">
                Inserisci i dati per calcolare
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COL -->
        <div style="display:flex;flex-direction:column;gap:14px">

          <!-- Italian Fairs Directory -->
          <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
            <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🇮🇹 Directory Fiere Italiane Consigliate</div>
            ${this._ITALIAN_FAIRS.map(f=>`
              <div style="padding:9px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card2);margin-bottom:6px">
                <div style="display:flex;align-items:flex-start;gap:8px">
                  <div style="flex:1">
                    <div style="font-size:12px;font-weight:800;color:var(--text)">${f.name}</div>
                    <div style="font-size:10px;color:var(--text-muted)">${f.city} · ${f.month} · ${f.size}</div>
                    <div style="font-size:10px;color:var(--text-dim);margin-top:3px;line-height:1.4">${f.info}</div>
                  </div>
                  <a href="${f.url}" target="_blank" style="padding:3px 8px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:5px;color:var(--primary);text-decoration:none;font-size:9px;font-weight:700;white-space:nowrap;flex-shrink:0">Sito →</a>
                </div>
              </div>`).join('')}
          </div>

          <!-- Checklist Preview -->
          <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">✅ Checklist Universale</div>
              <button onclick="FieraAI.openChecklist(null)" style="padding:4px 10px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:6px;color:var(--primary);cursor:pointer;font-size:10px;font-weight:700">Apri completa →</button>
            </div>
            <div style="font-size:11px;color:var(--text-muted)">
              ${Object.entries(this._CHECKLIST).slice(0,1).map(([group,items])=>`
                <div style="margin-bottom:4px;font-weight:700;color:var(--text);text-transform:capitalize">${group}</div>
                ${items.slice(0,4).map(i=>`<div style="padding:3px 0;border-bottom:1px solid var(--border)">${i}</div>`).join('')}
                <div style="color:var(--text-dim);font-size:10px;margin-top:4px">+${items.length-4} altri · ${Object.values(this._CHECKLIST).flat().length} totali</div>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Modals -->
      <div id="fa-modal" style="display:none;position:fixed;inset:0;background:#000b;z-index:9999;align-items:center;justify-content:center;padding:20px">
        <div id="fa-modal-body" style="background:var(--bg-card);border-radius:16px;width:min(560px,96vw);max-height:85vh;overflow-y:auto;border:1px solid var(--border2);box-shadow:0 24px 64px #000c"></div>
      </div>
    </div>`;

    // Initialize ROI calculator
    setTimeout(()=>this.calcROI(), 100);
  },

  calcROI(){
    const fee   =parseFloat(document.getElementById('fa-roi-fee')?.value)||0;
    const travel=parseFloat(document.getElementById('fa-roi-travel')?.value)||0;
    const stock =parseFloat(document.getElementById('fa-roi-stock')?.value)||0;
    const stand =parseFloat(document.getElementById('fa-roi-stand')?.value)||0;
    const rev   =parseFloat(document.getElementById('fa-roi-rev')?.value)||0;
    const costs=fee+travel+stock+stand;
    const profit=rev-costs;
    const roi=costs>0?((profit/costs)*100).toFixed(0):0;
    const el=document.getElementById('fa-roi-result');
    if(!el) return;
    const col=profit>0?'#22c55e':'#ef4444';
    el.innerHTML=`<span style="color:var(--text-dim)">Costi: €${costs.toFixed(0)} · Profitto: </span><span style="color:${col};font-size:14px">€${profit.toFixed(0)}</span><span style="color:var(--text-dim)"> · ROI: </span><span style="color:${col};font-size:14px">${roi}%</span>${parseFloat(roi)>100?'<span style="margin-left:8px">🔥</span>':parseFloat(roi)>50?'<span style="margin-left:8px">✅</span>':'<span style="margin-left:8px">⚠️</span>'}`;
  },

  openAddFiera(){
    const modal=document.getElementById('fa-modal');
    const body=document.getElementById('fa-modal-body');
    if(!modal||!body) return;
    body.innerHTML=`
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:15px;font-weight:800">➕ Nuova Fiera</div>
        <button onclick="document.getElementById('fa-modal').style.display='none'" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px">✕</button>
      </div>
      <div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Nome fiera *</label>
            <input id="fa-f-name" class="form-control" placeholder="es. Mercatino di Natale" style="font-size:13px"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Città</label>
            <input id="fa-f-city" class="form-control" placeholder="es. Palermo" style="font-size:13px"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Data</label>
            <input id="fa-f-date" type="date" class="form-control" style="font-size:12px"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Budget previsto (€)</label>
            <input id="fa-f-costs" type="number" class="form-control" placeholder="550" style="font-size:13px"></div>
        </div>
        <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Note</label>
          <textarea id="fa-f-notes" class="form-control" rows="2" style="font-size:12px;resize:none" placeholder="Dettagli stand, contatti, link iscrizione…"></textarea></div>
        <button onclick="FieraAI._saveFiera()" style="width:100%;padding:10px;background:linear-gradient(135deg,#ec4899,#a855f7);color:#fff;border:none;border-radius:9px;font-weight:800;cursor:pointer;font-size:13px">➕ Aggiungi Fiera</button>
      </div>`;
    modal.style.display='flex';
    modal.onclick=e=>{if(e.target===modal)modal.style.display='none';};
  },

  _saveFiera(){
    const name=document.getElementById('fa-f-name')?.value?.trim();
    if(!name){toast('Inserisci il nome','warning');return;}
    const d=this.getFiere();
    d.push({id:'f_'+Date.now(),name,city:document.getElementById('fa-f-city')?.value||'',date:document.getElementById('fa-f-date')?.value||'',costs:document.getElementById('fa-f-costs')?.value||0,revenue:0,notes:document.getElementById('fa-f-notes')?.value||''});
    this.saveFiere(d);
    document.getElementById('fa-modal').style.display='none';
    toast('✅ Fiera aggiunta!','success');
    this.render();
  },

  openChecklist(fieraId){
    const modal=document.getElementById('fa-modal');
    const body=document.getElementById('fa-modal-body');
    if(!modal||!body) return;
    const SK='ingly_checklist_'+(fieraId||'universal');
    const saved=JSON.parse(localStorage.getItem(SK)||'{}');
    body.innerHTML=`
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:15px;font-weight:800">✅ Checklist Fiera</div>
        <button onclick="document.getElementById('fa-modal').style.display='none'" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px">✕</button>
      </div>
      <div style="padding:16px 20px">
        ${Object.entries(this._CHECKLIST).map(([group,items])=>`
          <div style="margin-bottom:14px">
            <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border)">${group==='prep'?'🗓️ Preparazione':group==='stand'?'🛖 Stand & Materiali':'☀️ Giorno della fiera'}</div>
            ${items.map((item,i)=>{
              const key=group+'_'+i;
              const checked=saved[key]||false;
              return `<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:7px;cursor:pointer;transition:.15s;${checked?'opacity:.5;text-decoration:line-through':''}" onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background=''">
                <input type="checkbox" ${checked?'checked':''} onchange="(function(k,v,sk){const d=JSON.parse(localStorage.getItem(sk)||'{}');d[k]=v;localStorage.setItem(sk,JSON.stringify(d));this.parentElement.style.opacity=v?.5:1;this.parentElement.style.textDecoration=v?'line-through':'none'}).call(this,'${key}',this.checked,'${SK}')" style="accent-color:var(--primary);width:14px;height:14px">
                <span style="font-size:12px">${item}</span>
              </label>`;
            }).join('')}
          </div>`).join('')}
      </div>`;
    modal.style.display='flex';
    modal.onclick=e=>{if(e.target===modal)modal.style.display='none';};
  },

  editFiera(id){
    const f=this.getFiere().find(x=>x.id===id);
    if(!f) return;
    const rev=prompt(`Revenue finale fiera "${f.name}" (€):`,f.revenue||'0');
    if(rev===null) return;
    const d=this.getFiere();
    const i=d.findIndex(x=>x.id===id);
    if(i>=0) d[i].revenue=parseFloat(rev)||0;
    this.saveFiere(d);
    toast('💰 Revenue aggiornata!','success');
    this.render();
  },

  async aiTips(id){
    const f=this.getFiere().find(x=>x.id===id);
    if(!f) return;
    try{
      const r=await AIStudio._callAI(`Dammi 5 consigli pratici per massimizzare le vendite a questa fiera:\nNome: ${f.name}\nCittà: ${f.city||'Italia'}\nData: ${f.date||'prossimamente'}\nBudget: €${f.costs||'N/D'}\n\nConsigli su: prodotti da portare, prezzi, allestimento, marketing pre-fiera, come aumentare scontrino medio. Max 200 parole.`);
      alert(`🎪 AI Tips per ${f.name}:\n\n${r}`);
    }catch(e){toast('Configura API Key AI in Impostazioni','warning');}
  }
};
window.FieraAI = FieraAI;

