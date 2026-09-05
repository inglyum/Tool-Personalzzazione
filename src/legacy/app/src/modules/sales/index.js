
// === /src/modules/sales/index.js ===
// Sales Module - INGLY OS v88
const Sales={
  _pendingDeletes: new Set(), // FIX: pending undo-deletes
  editId:null,
  _all:[],
  _page: 0,
  _pageSize: 50,
  async render(){
    try {

    const el=eid('sales-tbody');if(!el)return;
    this._all=await AppStore.get('sales');
    const sales=this._all;
    const revenue=sales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
    const unpaid=sales.filter(s=>s.status==='da_pagare').reduce((a,s)=>a+(+s.amount||0),0);
    const kpis=eid('sales-kpis');
    if(kpis)kpis.innerHTML=[
      {l:'Totale Incassato',v:fmtCur(revenue),i:'fa-check-circle',c:'var(--green)'},
      {l:'Da Incassare',v:fmtCur(unpaid),i:'fa-clock',c:'var(--orange)'},
      {l:'Tot. Ordini',v:sales.length,i:'fa-shopping-cart',c:'var(--blue)'},
      {l:'Valore Medio',v:fmtCur(sales.length?revenue/sales.filter(s=>s.status==='pagato').length:0),i:'fa-calculator',c:'var(--primary)'},
    ].map(k=>`<div class="kpi-card"><i class="fas ${k.i} kpi-icon" style="color:${k.c}"></i><div class="kpi-value">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');
    sales.sort((a,b)=>new Date(b.date)-new Date(a.date));
    this._renderRows(sales);
    this.applyFilter();
    this._updatePillCounts();
    } catch(e){ console.error('[Sales.render]', e.message||e); }
  },
  _renderRows(sales){
    if(this._pendingDeletes&&this._pendingDeletes.size>0){sales=sales.filter(s=>!this._pendingDeletes.has(s.id)&&!this._pendingDeletes.has(+s.id)&&!this._pendingDeletes.has(String(s.id)));}
    const el=eid('sales-tbody');if(!el)return;
    const _s=typeof sanitize==='function'?sanitize:function(x){return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
    // S12: Pagination
    const totalS=sales.length;
    const ps=this._pageSize||50;
    const pg=Math.max(0,Math.min(this._page||0,Math.max(0,Math.ceil(totalS/ps)-1)));
    this._page=pg;
    const pageSales=sales.slice(pg*ps,(pg+1)*ps);
    const cl=eid('sales-count-label');if(cl)cl.textContent=totalS+' '+(totalS===1?'voce':'voci');
    // v4.1: Reset selection
    this._selected = this._selected || new Set();
    if(!sales.length){
      el.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:60px;color:var(--text-dim)">
        <div style="font-size:48px;margin-bottom:16px;opacity:.3">📊</div>
        <div style="font-size:16px;font-weight:700;color:var(--text-muted);margin-bottom:8px">Nessuna vendita ancora</div>
        <div style="font-size:13px;color:var(--text-dim);margin-bottom:20px">Inizia registrando la tua prima vendita</div>
        <button onclick="Sales.openModal()" style="padding:10px 24px;background:var(--primary);color:#000;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700">+ Aggiungi vendita</button>
      </td></tr>`;
      return;
    }
    // Status styles v4.1
    const statusStyle = {
      pagato:    {bg:'#22c55e',text:'#fff',label:'Pagato'},
      da_pagare: {bg:'#f97316',text:'#fff',label:'Da Pagare'},
      annullato: {bg:'#6b7280',text:'#fff',label:'Annullato'},
    };
    // Generate avatar color from name
    const avatarColor = (name) => {
      let h = 0;
      for(let i=0;i<(name||'').length;i++) h = (h*31+name.charCodeAt(i))%360;
      return `hsl(${h},55%,45%)`;
    };
    el.innerHTML=pageSales.map(s=>{
      const st = statusStyle[s.status] || {bg:'#94a3b8',text:'#fff',label:_s(s.status)||'—'};
      const initials = (_s(s.clientName)||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
      const aColor = avatarColor(s.clientName||'');
      const isSel = this._selected.has(s.id);
      const rowBorder = s.status==='pagato'?'#22c55e':s.status==='da_pagare'?'#f97316':'#6b7280';
      return `<tr class="sales-row" style="border-bottom:1px solid var(--border);transition:.12s;position:relative;border-left:3px solid ${rowBorder}"
        onmouseover="this.querySelector('.sales-actions').style.opacity='1';this.style.background='var(--bg-card2)'"
        onmouseout="this.querySelector('.sales-actions').style.opacity='0';this.style.background=''">
        <!-- Checkbox -->
        <td style="padding:10px 8px;width:36px">
          <input type="checkbox" class="bulk-cb" data-id="${s.id}" ${isSel?'checked':''} onclick="Sales.toggleSelect(${s.id})"
            style="width:16px;height:16px;cursor:pointer;accent-color:var(--primary)">
        </td>
        <!-- Cliente con avatar -->
        <td style="padding:10px 14px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:38px;height:38px;border-radius:8px;overflow:hidden;flex-shrink:0;border:1.5px solid var(--border)">
              ${s.photo ? `<img src="${_s(s.photo)}" style="width:100%;height:100%;object-fit:cover">` : `<div style="width:100%;height:100%;background:${aColor};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff">${initials}</div>`}
            </div>
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--text)">${_s(s.clientName)||'—'}</div>
              <div style="font-size:10px;color:var(--text-dim)">${_s(s.channel)}</div>
            </div>
          </div>
        </td>
        <!-- Data -->
        <td style="padding:10px 14px;color:var(--text-muted);font-size:12px;white-space:nowrap">${fmtDate(s.date)}</td>
        <!-- Descrizione -->
        <td style="padding:10px 14px;max-width:220px;font-size:12px;color:var(--text)">
          <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_s(s.desc)}">${_s(s.desc)||'—'}</div>
          ${s.invoiceNum?`<div style="font-size:9px;color:var(--text-dim);margin-top:1px">#${_s(s.invoiceNum)}</div>`:''}
          ${s.fromOrderId?`<div style="font-size:9px;color:var(--primary);margin-top:1px;cursor:pointer" onclick="App.navigate('orders')" title="Da ordine #${+s.fromOrderId}">↩ Ord. #${+s.fromOrderId}</div>`:''}
        </td>
        <!-- Importo -->
        <td style="padding:10px 14px;text-align:right">
          <div style="font-size:15px;font-weight:800;color:var(--text)">${fmtCur(s.amount)}</div>
        </td>
        <!-- Stato badge v4.1 — colore pieno -->
        <td style="padding:10px 14px;text-align:center">
          <span style="display:inline-flex;align-items:center;padding:4px 12px;border-radius:99px;font-size:11px;font-weight:700;background:${st.bg};color:${st.text};white-space:nowrap">
            ${st.label}
          </span>
        </td>
        <!-- Actions hover bar v4.1 -->
        <td style="padding:6px 12px;text-align:right;width:220px">
          <div class="sales-actions" style="display:flex;gap:5px;justify-content:flex-end;opacity:0;transition:opacity .15s">
            ${s.status==='da_pagare'?`<button onclick="Sales.markPaid(${s.id})" title="Segna pagato" style="padding:4px 10px;background:#22c55e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">✓ Paga</button>
              ${typeof WAAutoNotify!=='undefined'?`<button onclick="WAAutoNotify.openSender('payment_reminder','${s.id}')" title="Sollecito WhatsApp" style="padding:4px 8px;background:#25D36615;color:#25D366;border:1px solid #25D36630;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">💬</button>`:''}`:''}
            <button onclick="Sales.downloadPDF(${s.id})" title="PDF" style="padding:4px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-muted)"><i class="fas fa-file-pdf"></i></button>
            <button onclick="Sales.duplicate(${s.id})" title="Duplica" style="padding:4px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-muted)"><i class="fas fa-copy"></i></button>
            <button onclick="Sales.openModal(${s.id})" title="Modifica" style="padding:4px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-muted)"><i class="fas fa-edit"></i></button>
              <button onclick="Sales.invoicePDF(${s.id})" style="padding:5px 10px;background:#22c55e18;border:1px solid #22c55e40;border-radius:6px;color:#22c55e;cursor:pointer;font-size:11px;font-weight:700">🧾 Fattura</button>
            <button onclick="Sales.shareWhatsApp(${s.id})" title="Condividi su WhatsApp" style="padding:4px 8px;background:#25d36615;border:1px solid #25d36640;border-radius:6px;cursor:pointer;font-size:11px;color:#25d366"><i class="fab fa-whatsapp"></i></button>
            <button onclick="Sales.del(${s.id})" title="Elimina" style="padding:4px 8px;background:#ef444415;border:1px solid #ef444440;border-radius:6px;cursor:pointer;font-size:11px;color:#ef4444"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
    // S12: Render pagination controls
    let pgEl=document.getElementById('sales-pagination');
    if(!pgEl){
      pgEl=document.createElement('div');
      pgEl.id='sales-pagination';
      pgEl.style.cssText='display:flex;align-items:center;justify-content:center;gap:6px;padding:12px 0;font-size:12px;color:var(--text-muted)';
      el.closest('table')?.parentElement?.appendChild(pgEl);
    }
    const tp=Math.max(1,Math.ceil(totalS/ps));
    if(tp<=1){pgEl.innerHTML='';} else {
      const bs='padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);cursor:pointer;font-size:11px';
      const bas='padding:4px 10px;border-radius:6px;border:1px solid var(--primary);background:var(--primary-dim);color:var(--primary);cursor:default;font-size:11px;font-weight:700';
      let h=`<button onclick="Sales._page=Math.max(0,(Sales._page||0)-1);Sales.applyFilter(true)" style="${bs}" ${pg===0?'disabled':''}>‹ Prec</button>`;
      for(let i=0;i<tp;i++){
        if(tp>7&&i>1&&i<tp-2&&Math.abs(i-pg)>1){if(i===2)h+='<span>…</span>';continue;}
        h+=`<button onclick="Sales._page=${i};Sales.applyFilter(true)" style="${i===pg?bas:bs}">${i+1}</button>`;
      }
      h+=`<button onclick="Sales._page=Math.min(${tp-1},(Sales._page||0)+1);Sales.applyFilter(true)" style="${bs}" ${pg>=tp-1?'disabled':''}>Succ ›</button>`;
      h+=`<span style="color:var(--text-muted);font-size:11px">${pg*ps+1}–${Math.min((pg+1)*ps,totalS)} di ${totalS}</span>`;
      pgEl.innerHTML=h;
    }
  },
  applyFilter(keepPage=false){
    if(!keepPage) this._page=0;
    const q       = (eid('sales-search')?.value||'').toLowerCase().trim();
    const st      = eid('sales-filter-status')?.value || this._activeStatus || '';
    const ch      = eid('sales-filter-channel')?.value || '';
    const sortVal = eid('sales-sort')?.value || 'date_desc';
    const dateFrom= eid('sales-date-from')?.value || '';
    const dateTo  = eid('sales-date-to')?.value   || '';
    const minAmt  = parseFloat(eid('sales-min-amount')?.value||0) || 0;
    const maxAmt  = parseFloat(eid('sales-max-amount')?.value||0) || 0;

    let filtered = (this._all||[]).filter(s=>{
      if(st && s.status !== st)                                         return false;
      if(ch && s.channel !== ch)                                        return false;
      if(dateFrom && (s.date||'') < dateFrom)                          return false;
      if(dateTo   && (s.date||'') > dateTo)                            return false;
      if(minAmt > 0 && (+s.amount||0) < minAmt)                        return false;
      if(maxAmt > 0 && (+s.amount||0) > maxAmt)                        return false;
      if(q && ![(s.clientName||''),(s.desc||''),(s.channel||''),(s.amount||'').toString()]
               .join(' ').toLowerCase().includes(q))                    return false;
      return true;
    });

    // Quick period filter
    const period = eid('sales-period-filter')?.value || '';
    if(period){
      const now = new Date();
      const cutoff = new Date();
      if(period==='month')  cutoff.setDate(1);
      if(period==='3m')     cutoff.setMonth(now.getMonth()-3);
      if(period==='6m')     cutoff.setMonth(now.getMonth()-6);
      if(period==='year')   cutoff.setFullYear(now.getFullYear(),0,1);
      if(period==='last_month'){ cutoff.setDate(1); cutoff.setMonth(cutoff.getMonth()-1); const end=new Date(now.getFullYear(),now.getMonth(),0); filtered=filtered.filter(s=>s.date>=cutoff.toISOString().split('T')[0]&&s.date<=end.toISOString().split('T')[0]); }
      else if(period) filtered = filtered.filter(s=>(s.date||'')>=cutoff.toISOString().split('T')[0]);
    }

    // Sort
    const STATUS_ORDER = {pagato:0, da_pagare:1, annullato:2};
    filtered.sort((a,b)=>{
      switch(sortVal){
        case 'date_asc':    return new Date(a.date||0)-new Date(b.date||0);
        case 'amount_desc': return (+b.amount||0)-(+a.amount||0);
        case 'amount_asc':  return (+a.amount||0)-(+b.amount||0);
        case 'client_asc':  return (a.clientName||'').localeCompare(b.clientName||'');
        case 'client_desc': return (b.clientName||'').localeCompare(a.clientName||'');
        case 'status_asc':  return (STATUS_ORDER[a.status]??9)-(STATUS_ORDER[b.status]??9);
        case 'status_desc': return (STATUS_ORDER[b.status]??9)-(STATUS_ORDER[a.status]??9);
        default:            return new Date(b.date||0)-new Date(a.date||0);
      }
    });

    this._renderRows(filtered);
    this._updatePillCounts();
    // Update result count
    const cnt = eid('sales-count-label');
    if(cnt) cnt.textContent = filtered.length + (filtered.length===1?' voce':' voci') + (filtered.length<(this._all||[]).length ? ' (filtrate)':'');
  },

  setStatusFilter(val){
    this._activeStatus = val;
    const sel = eid('sales-filter-status');
    if(sel) sel.value = val;
    document.querySelectorAll('.sales-spill').forEach(btn=>{
      const isActive = btn.id===('spill-'+(val||'all'));
      btn.classList.toggle('active', isActive);
      btn.style.background = isActive ? 'var(--primary-dim)' : 'transparent';
      btn.style.color = isActive ? 'var(--primary)' : 'var(--text-muted)';
      btn.style.borderColor = isActive ? 'var(--primary)' : 'var(--border)';
      btn.style.fontWeight = isActive ? '700' : '500';
    });
    this.applyFilter();
  },

  clearAllFilters(){
    this._activeStatus = '';
    ['sales-filter-status','sales-filter-channel','sales-sort','sales-search','sales-date-from','sales-date-to','sales-period-filter','sales-min-amount','sales-max-amount']
      .forEach(id=>{ const el=eid(id); if(el) el.value=''; });
    document.querySelectorAll('.sales-spill').forEach((btn,i)=>{
      const isAll = btn.id==='spill-all';
      btn.classList.toggle('active',isAll);
      btn.style.background = isAll?'var(--primary-dim)':'transparent';
      btn.style.color = isAll?'var(--primary)':'var(--text-muted)';
      btn.style.borderColor = isAll?'var(--primary)':'var(--border)';
    });
    this.applyFilter();
    if(typeof toast!=='undefined') toast('Filtri rimossi','info');
  },
  setStatusFilter(val){
    const sel = eid('sales-filter-status');
    if(sel) sel.value = val;
    // Update pill active state
    document.querySelectorAll('.sales-spill').forEach(btn => {
      const isActive = btn.id === ('spill-' + (val||'all'));
      btn.classList.toggle('active', isActive);
      btn.style.outline = isActive ? '2px solid currentColor' : 'none';
      btn.style.outlineOffset = isActive ? '2px' : '0';
      btn.style.opacity = isActive ? '1' : '.75';
    });
    this.applyFilter();
  },

  _updatePillCounts(){
    const all = this._all || [];
    const counts = { pagato:0, da_pagare:0, annullato:0 };
    all.forEach(s => { if(counts[s.status] !== undefined) counts[s.status]++; });
    Object.entries(counts).forEach(([k,v]) => {
      const el = document.getElementById('spill-cnt-'+k);
      if(el) el.textContent = v ? '('+v+')' : '';
    });
    // Update inline summary
    const sumEl = document.getElementById('sales-summary-inline');
    if(sumEl){
      const paid = all.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
      const unpaid = all.filter(s=>s.status==='da_pagare').reduce((a,s)=>a+(+s.amount||0),0);
      const fmt = v => '€'+Math.round(v).toLocaleString('it-IT');
      sumEl.innerHTML = counts.da_pagare > 0
        ? '<span style="color:#f97316;font-weight:700">'+fmt(unpaid)+'</span> da incassare &nbsp;·&nbsp; '+fmt(paid)+' incassato'
        : fmt(paid)+' incassato';
    }
  },

  clearFilters(){
    const s=eid('sales-search');if(s)s.value='';
    const fs=eid('sales-filter-status');if(fs)fs.value='';
    const fc=eid('sales-filter-channel');if(fc)fc.value='';
    const fd=eid('sales-date-from');if(fd)fd.value='';
    const ft=eid('sales-date-to');if(ft)ft.value='';
    const fso=eid('sales-sort');if(fso)fso.value='date_desc';
    document.querySelectorAll('.sales-spill').forEach(b => {
      const isAll = b.id === 'spill-all';
      b.classList.toggle('active', isAll);
      b.style.outline = isAll ? '2px solid currentColor' : 'none';
      b.style.outlineOffset = isAll ? '2px' : '0';
      b.style.opacity = isAll ? '1' : '.75';
    });
    this._renderRows(this._all.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)));
  },
  _salePhoto: null,

  handleSalePhoto(input) {
    const file = input.files[0]; if(!file) return;
    const MAX=800, Q=0.75;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX/Math.max(img.width, img.height));
      const w = Math.round(img.width*scale), h = Math.round(img.height*scale);
      const cv = document.createElement('canvas'); cv.width=w; cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      const compressed = cv.toDataURL('image/jpeg', Q);
      this._salePhoto = compressed;
      const prev = document.getElementById('sale-photo-preview');
      if(prev) prev.innerHTML = `<img src="${compressed}" style="width:100%;height:100%;object-fit:cover">`;
      const clrBtn = document.getElementById('sale-photo-clear-btn');
      if(clrBtn) clrBtn.style.display = '';
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  },

  clearSalePhoto() {
    this._salePhoto = null;
    const prev = document.getElementById('sale-photo-preview');
    if(prev) prev.innerHTML = '📷';
    const clrBtn = document.getElementById('sale-photo-clear-btn');
    if(clrBtn) clrBtn.style.display = 'none';
    const inp = document.getElementById('sale-photo-input');
    if(inp) inp.value = '';
  },

  async openModal(id=null){
    this.editId=id;
    eid('modal-sales-title').textContent=id?'Modifica Vendita':'Nuova Vendita';
    // Reset photo
    this._salePhoto=null;
    {const p=document.getElementById('sale-photo-preview');if(p)p.innerHTML='📷';}
    {const b=document.getElementById('sale-photo-clear-btn');if(b)b.style.display='none';}
    if(id){
      const s=await IDB.get('sales',id);if(!s)return;
      // FIX: sale-client is a hidden input, not a select — set value directly
      const hiddenEl = eid('sale-client');
      if(hiddenEl) hiddenEl.value = s.clientId||'';
      const searchEl = document.getElementById('sale-client-search');
      if(searchEl) searchEl.value = s.clientName||'';
      eid('sale-date').value=s.date||today();
      eid('sale-desc').value=s.desc||s.description||'';
      eid('sale-amount').value=(+s.amount||0).toFixed(2);
      eid('sale-status').value=s.status||'da_pagare';
      eid('sale-channel').value=s.channel||'WhatsApp';
      if(s.photo){this._salePhoto=s.photo;const pv=document.getElementById('sale-photo-preview');if(pv)pv.innerHTML=`<img src="${s.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`;const cb=document.getElementById('sale-photo-clear-btn');if(cb)cb.style.display='';}
    }else{
      // FIX: reset hidden clientId and visible search field for new sale
      const _hEl=eid('sale-client'); if(_hEl) _hEl.value='';
      const _sEl=document.getElementById('sale-client-search'); if(_sEl) _sEl.value='';
      eid('sale-date').value=today();
      eid('sale-amount').value='';
      eid('sale-desc').value='';
      eid('sale-status').value='da_pagare';
      eid('sale-channel').value='WhatsApp';
    }
    // Reset catalog picker state
    this._clearCatPicker();
    this._catPickerAll=[];
    // Reset client search
    setTimeout(()=>{
      const cs=document.getElementById('sale-client-search');
      const ch=document.getElementById('sale-client');
      if(cs)cs.value='';
      if(ch)ch.value='';
      this._hideClientDrop();
    },50);
    openModal('sales');
  },
  async save(){
    const clientEl=eid('sale-client');
    const clientId=clientEl&&clientEl.value?+clientEl.value:null;
    // FIX: sale-client is a hidden input — read clientName from the visible search field
    let clientName = (document.getElementById('sale-client-search')?.value || '').trim();
    if(!clientName && this.editId){
      const existing=await IDB.get('sales',this.editId).catch(()=>null);
      if(existing) clientName=existing.clientName||'';
    }
    const rawAmount = parseFloat((eid('sale-amount').value||'0').replace(',','.')) || 0;
    const sale={
      clientId, clientName,
      date:    eid('sale-date').value    || today(),
      desc:    eid('sale-desc').value    || '',
      catalogProductId: this._selectedCatalogId||null,
      amount:  rawAmount,
      status:  eid('sale-status').value  || 'da_pagare',
      channel: eid('sale-channel').value || 'WhatsApp',
      updatedAt: new Date().toISOString(),
    };
    if(this.editId){await snapshotRecord('sales',this.editId);sale.id=this.editId;}else{sale.id=Date.now();}
    if(this._salePhoto) sale.photo=this._salePhoto;
    const id=await IDB.put('sales',sale).catch(e=>{toast('Errore salvataggio','error');console.error('[Sales.save]',e);});
    await logAction('sale',id,this.editId?'updated':'created',{amount:sale.amount});
    Bus.emit('sale:created',{id});
    // v10: if sale links to an order, push order stage → delivered if not already
    try {
      const freshSale = await IDB.get('sales', id).catch(()=>null);
      const linkedOrderId = freshSale?.fromOrderId||freshSale?.originOrder;
      if(linkedOrderId){
        const ord = await IDB.get('orders',+linkedOrderId||linkedOrderId).catch(()=>null);
        if(ord && ord.stage==='ready'){
          ord.stage='delivered';
          ord.linkedSaleId=id;
          ord.updatedAt=new Date().toISOString();
          await IDB.put('orders',ord);
          AppStore.invalidate('orders');
        }
      }
    } catch(ex){ console.warn('[save sale→order sync]',ex); }
    toast('Vendita salvata! ✅');closeModal('sales');this.editId=null;
    AppStore.invalidate('sales');
    if(typeof BDW!=='undefined') BDW.touch('sales');
    await this.render();
    // Refresh dashboard KPIs if visible
    if(typeof KPIEngine!=='undefined' && typeof App!=='undefined' && App.currentSection==='dashboard') KPIEngine.run().catch(()=>{});
  },
  async shareWhatsApp(id){
    const s = await IDB.get('sales', id).catch(()=>null);
    if(!s) return;
    const cfg = await IDB.get('settings','main').catch(()=>({}))||{};
    const company = cfg.company || 'INGLY';
    const status = s.status === 'pagato' ? '✅ Pagato' : s.status === 'da_pagare' ? '⏳ Da Pagare' : s.status;
    const msg = `📦 *Riepilogo Ordine — ${company}*

👤 Cliente: ${s.clientName||'—'}
📋 Lavoro: ${s.desc||'—'}
💰 Importo: €${(+s.amount||0).toFixed(2)}
📅 Data: ${s.date||'—'}
${status}

Grazie per aver scelto ${company}! 🙏`;
    const url = 'https://wa.me/?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
  },

  async markPaid(id){
    const s=await IDB.get('sales',id);if(!s)return;
    await snapshotRecord('sales',id);
    s.status='pagato';
    s.paidAt=new Date().toISOString();
    await IDB.put('sales',s);
    await logAction('sale',id,'marked_paid');
    Bus.emit('sale:paid',{id});
    AppStore.invalidate('sales');
    if(typeof BDW!=='undefined') BDW.touch('sales');
    // ── S5B: Auto-cashflow entry on sale paid (toggle OFF by default) ──
    try {
      const s5bEnabled = localStorage.getItem('s5b_auto_cashflow')==='1';
      if(s5bEnabled && s.amount>0){
        const cfEntry={
          id: Date.now(),
          type:'entrata',
          date: (s.paidAt||new Date().toISOString()).split('T')[0],
          desc: '💰 Vendita pagata: '+(s.product||s.desc||s.name||'#'+id),
          amount: +s.amount,
          cat: 'vendita',
          _fromSaleId: id,
          _auto: true
        };
        await IDB.put('cashflow', cfEntry);
        AppStore.invalidate('cashflow');
        toast('💰 Vendita pagata + entrata cashflow registrata ✓','success');
      } else {
        toast('💰 Vendita pagata! ✓','success');
      }
    } catch(ex){ console.warn('[S5B cashflow auto]',ex); toast('💰 Vendita pagata! ✓','success'); }
    // ── v10 REVERSE SYNC: update linked Order to 'sold' ──────────────
    try {
      const orderId = s.fromOrderId||s.originOrder||s.orderId;
      if(orderId){
        const ord = await IDB.get('orders', +orderId||orderId).catch(()=>null);
        if(ord && !['sold','invoiced'].includes(ord.stage)){
          ord.stage = 'sold';
          ord.updatedAt = new Date().toISOString();
          ord.soldAt = s.paidAt;
          await IDB.put('orders', ord);
          AppStore.invalidate('orders');
          AppStore.invalidate('pipeline');
          // Also update pipeline entry if exists
          const pl = await IDB.getAll('pipeline').catch(()=>[]);
          const plEntry = pl.find(r=>r._sourceId===+orderId||r.id===+orderId||String(r._sourceId)===String(orderId));
          if(plEntry){ plEntry.stage='paid'; await IDB.put('pipeline',plEntry); AppStore.invalidate('pipeline'); }
        }
      }
    } catch(ex){ console.warn('[markPaid reverse-sync]',ex); }
    await this.render();
    if(typeof KPIEngine!=='undefined'&&typeof App!=='undefined'&&App.currentSection==='dashboard') KPIEngine.run().catch(()=>{});
    if(typeof Orders!=='undefined'&&typeof App!=='undefined'&&App.currentSection==='orders') (async()=>{try{if(typeof Orders!=='undefined')await Orders.render();}catch(e){}}) ();
  },

  // v4.1: Bulk selection
  _selected: new Set(),

  toggleSelect(id) {
    id = +id||id;
    if (this._selected.has(id)) this._selected.delete(id);
    else this._selected.add(id);
    this._updateBulkBar();
  },

  selectAll() {
    const checkboxes = document.querySelectorAll('.cl-bulk-cb');
    const allChecked = this._selected.size === checkboxes.length && checkboxes.length > 0;
    this._selected.clear();
    if (!allChecked) checkboxes.forEach(cb => { this._selected.add(+cb.dataset.id||cb.dataset.id); cb.checked=true; });
    else checkboxes.forEach(cb => cb.checked=false);
    this._updateBulkBar();
  },

  _updateBulkBar() {
    const bar = document.getElementById('sales-bulk-bar');
    const countEl = document.getElementById('sales-bulk-count');
    if (!bar) return;
    if (this._selected.size > 0) {
      bar.style.display = 'flex';
      if (countEl) countEl.textContent = this._selected.size + ' vend' + (this._selected.size===1?'ita':'ite') + ' selezionat' + (this._selected.size===1?'a':'e');
    } else {
      bar.style.display = 'none';
    }
    // Sync checkboxes
    document.querySelectorAll('.bulk-cb').forEach(cb => {
      cb.checked = this._selected.has(+cb.dataset.id||cb.dataset.id);
    });
  },

  async bulkDelete() {
    const n = this._selected.size;
    if (!n) return;
    if (!confirm('Eliminare ' + n + ' vend' + (n===1?'ita':'ite') + ' selezionat' + (n===1?'a':'e') + '?')) return;
    const ids = [...this._selected];
    // Parallel delete — faster and atomic
    await Promise.all(ids.map(id => IDB.del('sales', id)));
    this._selected.clear();
    if (this._pendingDeletes) { ids.forEach(id => this._pendingDeletes.delete(id)); }
    AppStore.invalidate('sales');
    if(typeof BDW!=='undefined') BDW.touch('sales');
    await this.render();
    toast('🗑 ' + n + ' vend' + (n===1?'ita':'ite') + ' eliminate', 'warning');
  },
  clearSelection() {
    this._selected.clear();
    this._updateBulkBar();
    document.querySelectorAll('.cl-bulk-cb').forEach(cb=>{ cb.checked=false; });
    const selectAll = document.querySelector('#view-clients thead input[type=checkbox]');
    if(selectAll) selectAll.checked = false;
  },


  async duplicate(id) {
    const s = await IDB.get('sales', id).catch(()=>null);
    if (!s) return;
    const copy = {...s};
    delete copy.id;
    copy.date = today();
    copy.status = 'da_pagare';
    copy.desc = (copy.desc||'') + ' (copia)';
    await IDB.put('sales', copy);
    AppStore.invalidate('sales');
    await this.render();
    toast('✅ Vendita duplicata', 'success');
  },

  // v4.1: Import CSV vendite
  importCSV() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv,.txt';
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { toast('CSV vuoto o non valido', 'error'); return; }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g,''));
      // Map columns: cliente/client, data/date, descrizione/desc, importo/amount, stato/status
      const colMap = {
        client: headers.findIndex(h => ['cliente','client','nome','name','clientname'].includes(h)),
        date:   headers.findIndex(h => ['data','date','giorno'].includes(h)),
        desc:   headers.findIndex(h => ['descrizione','desc','description','articolo','item','prodotto'].includes(h)),
        amount: headers.findIndex(h => ['importo','amount','prezzo','price','totale','total','valore'].includes(h)),
        status: headers.findIndex(h => ['stato','status','pagamento'].includes(h)),
      };
      let imported = 0; let skipped = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g,''));
        const clientName = colMap.client >= 0 ? cols[colMap.client] : '';
        const amount = colMap.amount >= 0 ? parseFloat(cols[colMap.amount].replace(/[€$£,]/g,'').replace(',','.')) : 0;
if(isNaN(amount) || amount <= 0) { skipped++; continue; }
            await IDB.put('sales', rec).catch(()=>{});
        const rawStatus = colMap.status >= 0 ? (cols[colMap.status]||'').toLowerCase() : '';
        const status = ['pagato','paid','saldato','incassato'].includes(rawStatus) ? 'pagato' : 'da_pagare';
        const rec = {
          clientName: clientName || 'Importato',
          date:   colMap.date >= 0 && cols[colMap.date] ? cols[colMap.date] : today(),
          desc:   colMap.desc >= 0 ? cols[colMap.desc] : '',
          amount: isNaN(amount) ? 0 : amount,
          status, channel: 'CSV Import',
        };
        await IDB.put('sales', rec);
        imported++;
      }
      AppStore.invalidate('sales');
      await this.render();
      toast('Importate ' + imported + ' vendite' + (skipped?' ('+skipped+' saltate)':''), 'success');
    };
    input.click();
  },
  async importExcel() {
    // Full Excel import for sales — uses ExcelImport factory
    const file = await ExcelImport.openPicker();
    if (!file) return;
    try {
      const { rows, col } = await ExcelImport.parseFile(file);
      const iCliente = col('cliente','client','nome','name','acquirente','buyer','buyer_name','clientname');
      const iData    = col('data','date','giorno','sale_date','data_ordine','order_date','data_fattura');
      const iDesc    = col('descrizione','desc','description','articolo','item','prodotto','product','item_title');
      const iImporto = col('importo','amount','prezzo','price','totale','total','valore','order_total','grandtotal','net');
      const iStato   = col('stato','status','pagamento','payment');
      const iCanale  = col('canale','channel','source','piattaforma','platform');
      const iNote    = col('note','notes','memo');
      const fields   = [iCliente>=0&&'Cliente',iData>=0&&'Data',iImporto>=0&&'Importo',iStato>=0&&'Stato',iCanale>=0&&'Canale'].filter(Boolean);
      ExcelImport.showPreview(file, fields, rows.length, async () => {
        toast('📊 Importazione vendite...','info',3000);
        let imported=0,skipped=0,errors=0;
        const today_ = new Date().toISOString().split('T')[0];
        for(let i=1;i<rows.length;i++){
          const r=rows[i];
          try {
            const clientName=(iCliente>=0?String(r[iCliente]||''):'').trim();
            let rawAmt=iImporto>=0?String(r[iImporto]||'0'):'0';
            rawAmt=rawAmt.replace(/[€$£\s]/g,'').replace(/\.(?=\d{3})/g,'').replace(',','.');
            const amount=parseFloat(rawAmt)||0;
            if(!clientName&&amount===0){skipped++;continue;}
            let date=today_;
            if(iData>=0&&r[iData]){
              const dStr=String(r[iData]).trim();
              const parts=dStr.match(/(\d+)[/\-\.](\d+)[/\-\.]( \d+)/);
              if(parts){const[,a,b,yr]=parts;const y=yr.length===4?yr:'20'+yr;date=`${y}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;}
              else if(/^\d{4}-\d{2}-\d{2}$/.test(dStr))date=dStr;
            }
            const rawStatus=(iStato>=0?String(r[iStato]||''):'').toLowerCase();
            const status=['da pagare','pending','unpaid','open','da_pagare'].some(k=>rawStatus.includes(k))?'da_pagare':'pagato';
            const channel=iCanale>=0&&r[iCanale]?String(r[iCanale]).trim():'Excel Import';
            const clients=await AppStore.get('clients').catch(()=>[]);
            const match=clients.find(cl=>(cl.name||'').toLowerCase()===clientName.toLowerCase());
            await IDB.put('sales',{id:Date.now()+i,clientName:clientName||'Import',clientId:match?match.id:null,date,desc:iDesc>=0?String(r[iDesc]||'').trim():'',amount,status,channel,note:iNote>=0?String(r[iNote]||'').trim():'',_importedFrom:file.name}).catch(()=>{});
            imported++;
          } catch(rowErr){errors++;console.warn('[Sales Excel Import] row '+i,rowErr);}
        }
        AppStore.invalidate('sales');
        if(typeof KPIEngine!=='undefined')KPIEngine.run();
        await this.render();
        toast('✅ '+imported+' vendite importate'+(skipped?' · '+skipped+' saltate':'')+(errors?' · '+errors+' errori':''),'success',5000);
      });
    } catch(e){toast('Errore: '+e.message,'error',6000);}
  },




  // ── P2: Fattura PDF professionale ──────────────────────────────────
  async invoicePDF(id) {
    const sale = await IDB.get('sales', id).catch(()=>null);
    if(!sale) { toast('Vendita non trovata','warning'); return; }
    const clients = await AppStore.get('clients').catch(()=>[]);
    const client = clients.find(cl=>cl.id===sale.clientId)||{};
    const settings = await IDB.get('settings','main') || {};
    const biz = {
      name:    settings.company||settings.biz?.name||'',
      piva:    settings.piva||settings.biz?.piva||'',
      email:   settings.email||settings.biz?.email||'',
      phone:   settings.phone||settings.biz?.phone||'',
      address: settings.address||settings.biz?.address||'',
      city:    settings.city||settings.biz?.city||'',
      vatRate: +settings.vat||+settings.biz?.vatRate||22,
    };

    const num = String(id).slice(-6);
    const date = sale.date || new Date().toISOString().split('T')[0];
    const total = +sale.amount || 0;
    const vatRate = biz.vatRate || 22;
    const imponibile = vatRate > 0 ? +(total/(1+vatRate/100)).toFixed(2) : total;
    const iva = +(total - imponibile).toFixed(2);

    const photoBlock = sale.photo
      ? `<img src="${sale.photo}" style="max-width:160px;max-height:120px;object-fit:contain;border-radius:8px;margin:12px 0">`
      : '';

    const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<title>Fattura ${num} — ${biz.name||'Ingly'}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#111;font-size:13px;padding:40px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:20px;border-bottom:3px solid #000}
.biz-name{font-size:26px;font-weight:900;letter-spacing:-.5px}
.biz-meta{font-size:11px;color:#555;line-height:1.6;margin-top:6px}
.inv-box{text-align:right}
.inv-num{font-size:32px;font-weight:900;color:#f59e0b}
.inv-date{font-size:12px;color:#666;margin-top:4px}
.section{margin-bottom:28px}
.section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#888;margin-bottom:8px}
.client-box{background:#f8fafc;border-radius:10px;padding:14px 18px;border:1px solid #e2e8f0}
.client-name{font-size:16px;font-weight:800}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
th{background:#111;color:#fff;padding:10px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase}
td{padding:11px 14px;border-bottom:1px solid #f1f5f9;vertical-align:top}
tr:last-child td{border-bottom:none}
.total-row td{font-weight:800;font-size:15px;background:#f8fafc}
.iva-row td{font-size:12px;color:#666}
.amount{text-align:right;font-weight:700}
.total-amount{font-size:22px;font-weight:900;color:#059669}
.footer{margin-top:36px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#aaa;display:flex;justify-content:space-between}
@media print{body{padding:20px}.no-print{display:none!important}}
</style></head><body>
<div class="header">
  <div>
    <div class="biz-name">${biz.name||'Laboratorio Artigianale'}</div>
    <div class="biz-meta">
      ${biz.address||''}<br>
      ${[biz.city,biz.country].filter(Boolean).join(', ')}<br>
      ${biz.email?'✉ '+biz.email:''} ${biz.phone?'· 📞 '+biz.phone:''}<br>
      ${biz.piva?'P.IVA: '+biz.piva:''}
    </div>
  </div>
  <div class="inv-box">
    <div class="inv-num">FATTURA N° ${num}</div>
    <div class="inv-date">Data: ${new Date(date).toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'})}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Fatturato a</div>
  <div class="client-box">
    <div class="client-name">${sale.clientName||client.name||'Cliente'}</div>
    <div style="font-size:12px;color:#555;margin-top:4px">${client.email||''} ${client.phone?'· '+client.phone:''}</div>
    <div style="font-size:12px;color:#555">${client.city||''}</div>
  </div>
</div>

${photoBlock ? '<div class="section">'+photoBlock+'</div>' : ''}

<div class="section">
  <table>
    <thead><tr><th style="width:60%">Descrizione</th><th>Data</th><th style="text-align:right">Importo</th></tr></thead>
    <tbody>
      <tr>
        <td><strong>${sale.desc||'Servizio personalizzato'}</strong>${sale.channel?'<br><span style="font-size:11px;color:#888">Canale: '+sale.channel+'</span>':''}</td>
        <td>${new Date(date).toLocaleDateString('it-IT')}</td>
        <td class="amount">€ ${imponibile.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>
  
  <div style="display:flex;justify-content:flex-end">
    <div style="width:280px">
      ${vatRate>0?`<div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #e2e8f0;font-size:12px"><span>Imponibile</span><span>€ ${imponibile.toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:12px;color:#666"><span>IVA ${vatRate}%</span><span>€ ${iva.toFixed(2)}</span></div>`:''}
      <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid #111;margin-top:4px">
        <span style="font-weight:800;font-size:16px">TOTALE</span>
        <span class="total-amount">€ ${total.toFixed(2)}</span>
      </div>
    </div>
  </div>
</div>

<div style="margin-top:20px;padding:14px;background:${sale.status==='pagato'?'#f0fdf4':'#fffbeb'};border-radius:8px;border:1px solid ${sale.status==='pagato'?'#bbf7d0':'#fde68a'}">
  <strong>Stato pagamento:</strong> ${sale.status==='pagato'?'✅ PAGATO':'⏳ DA PAGARE'}
</div>

<div class="footer">
  <span>Generato con Ingly OS — ${new Date().toLocaleDateString('it-IT')}</span>
  <span>${biz.piva?'P.IVA: '+biz.piva:''}</span>
</div>

<div class="no-print" style="position:fixed;bottom:20px;right:20px;display:flex;gap:10px">
  <button onclick="window.print()" style="padding:12px 24px;background:#111;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700">🖨️ Stampa / Salva PDF</button>
  <button onclick="window.close()" style="padding:12px 16px;background:#eee;color:#333;border:none;border-radius:8px;cursor:pointer;font-size:14px">✕ Chiudi</button>
</div>
<\/body><\/html>`;

    const w = window.open('','_blank','width=820,height=900');
    if(!w){ toast('Abilita i popup per generare la fattura','warning'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  },

  async del(id){
    // FIX v5.0: _pendingDeletes — item hidden immediately from render
    // IDB.del executes after 3.5s undo grace period
    const record = await IDB.get('sales', id).catch(()=>null);
    if (!record) return;
    const name = (record.clientName||'') + ' - ' + fmtCur(record.amount||0);
    if(!this._pendingDeletes) this._pendingDeletes = new Set();
    this._pendingDeletes.add(id);this._pendingDeletes.add(+id);this._pendingDeletes.add(String(id)); // type-safe
    await this.render();
    await logAction('sale',id,'deleted');
    UndoStack.schedule('sales', record, async () => {
      this._pendingDeletes.delete(id);
      await IDB.del('sales', id);
      AppStore.invalidate('sales');
    }, 'Vendita ' + name, () => {
      this._pendingDeletes.delete(id);
      this.render();
    });
  },

  async bulkMarkPaid() {
    const n = this._selected.size;
    if (!n) { toast('Nessuna vendita selezionata', 'warning'); return; }
    if (!confirm('Segnare ' + n + ' vend' + (n===1?'ita':'ite') + ' come PAGATE?')) return;
    const ids = [...this._selected];
    let done = 0;
    for (const id of ids) {
      try {
        const s = await IDB.get('sales', +id||id).catch(()=>null);
        if (!s) continue;
        s.status = 'pagato';
        s.paidAt = new Date().toISOString();
        await IDB.put('sales', s);
        done++;
      } catch(e) { console.warn('[bulkMarkPaid]', e); }
    }
    this._selected.clear();
    this._updateBulkBar();
    AppStore.invalidate('sales');
    await this.render();
    toast('✅ ' + done + ' vendite segnate come pagate!', 'success', 4000);
    Bus.emit('sale:paid_bulk', { count: done });
  },

  async downloadPDF(id){
    const s=await IDB.get('sales',id);if(!s)return;
    const cfg=await IDB.get('settings','main')||{};
    const{jsPDF}=window.jspdf;
    const doc=new jsPDF();
    // ── Numerazione annuale auto ──────────────────────────────────
    const allSales=await AppStore.get('sales');
    const year=new Date(s.date||Date.now()).getFullYear();
    const yearSales=allSales.filter(x=>x.status!=='annullato'&&new Date(x.date||0).getFullYear()===year).sort((a,b)=>new Date(a.date)-new Date(b.date));
    const numInYear=(yearSales.findIndex(x=>x.id===id)+1)||1;
    const num=`${String(numInYear).padStart(3,'0')}/${year}`;
    // ── Marca da bollo €2 (>€77.47) ─────────────────────────────
    const needsBollo=(+s.amount||0)>77.47;
    const regime=cfg.regime||'forfettario';
    // Header band
    doc.setFillColor(251,191,36);doc.rect(0,0,210,28,'F');
    doc.setFontSize(20);doc.setTextColor(0,0,0);doc.setFont(undefined,'bold');
    doc.text(cfg.company||'INGLY LASER',14,13);
    doc.setFontSize(10);doc.setFont(undefined,'normal');
    doc.text('FATTURA / RICEVUTA',14,21);
    doc.setTextColor(50,50,50);
    doc.text(num,160,12);
    doc.text(new Date().toLocaleDateString('it-IT'),160,19);
    // Company info block
    doc.setFontSize(9);doc.setTextColor(80,80,80);
    let y=36;
    if(cfg.piva){doc.text('P.IVA: '+cfg.piva,14,y);y+=5;}
    if(cfg.email){doc.text('Email: '+cfg.email,14,y);y+=5;}
    if(cfg.phone){doc.text('Tel: '+cfg.phone,14,y);y+=5;}
    // Client info
    y+=5;
    doc.setFontSize(11);doc.setTextColor(0,0,0);doc.setFont(undefined,'bold');
    doc.text('FATTURATO A:',110,36);
    doc.setFont(undefined,'normal');doc.setFontSize(10);
    doc.text(s.clientName||'Cliente',110,43);
    // Items table
    y+=8;
    doc.autoTable({startY:y,head:[['N.','Descrizione','Canale','Importo']],
      body:[[`1`,s.desc||'Prodotto/Servizio',s.channel||'—',fmtCur(s.amount)]],
      theme:'grid',
      headStyles:{fillColor:[251,191,36],textColor:[0,0,0],fontStyle:'bold',fontSize:10},
      styles:{fontSize:10},
      columnStyles:{0:{cellWidth:10},3:{halign:'right',fontStyle:'bold'}}
    });
    const fy=doc.lastAutoTable.finalY+8;
    doc.setFontSize(10);doc.setTextColor(80,80,80);
    if(regime==='forfettario'){
      // Forfettario: no IVA, just total
      doc.setFontSize(14);doc.setFont(undefined,'bold');doc.setTextColor(251,130,0);
    } else {
      const vat=(+s.amount||0)/(1+0.22)*0.22;
      const net=(+s.amount||0)-vat;
      doc.text(`Imponibile: ${fmtCur(net)}`,120,fy);
      doc.text(`IVA 22%: ${fmtCur(vat)}`,120,fy+6);
      doc.setFontSize(14);doc.setFont(undefined,'bold');doc.setTextColor(251,130,0);
    }
    const bolloNote = needsBollo ? ' (+ €2,00 marca da bollo)' : '';
    doc.setFontSize(14);doc.setFont(undefined,'bold');doc.setTextColor(251,130,0);
    doc.text(`TOTALE: ${fmtCur(s.amount)}`,120,fy+16);
    // Forfettario legal note
    const legalY2 = fy + 28;
    doc.setFontSize(7.5);doc.setFont(undefined,'normal');doc.setTextColor(130,130,130);
    if(regime==='forfettario'){
      doc.text("Operazione effettuata ai sensi dell'art. 1, commi 54-89, L. 190/2014 — Regime forfettario.",14,legalY2);
      doc.text("Il compenso non è soggetto a ritenuta d'acconto (art. 1, c. 67, L. 190/2014).",14,legalY2+4);
      if(needsBollo) doc.text("Imposta di bollo assolta sull'originale — art. 6 Tab. All. B D.P.R. 642/1972.",14,legalY2+8);
    }
    doc.setFontSize(9);doc.setTextColor(80,80,80);
    // Status badge
    const badgeColor=s.status==='pagato'?[34,197,94]:s.status==='annullato'?[239,68,68]:[251,191,36];
    doc.setFillColor(...badgeColor);doc.roundedRect(14,fy+5,40,10,3,3,'F');
    doc.setFontSize(9);doc.setTextColor(0);doc.setFont(undefined,'bold');
    const statusLabels={pagato:'PAGATO',da_pagare:'DA PAGARE',annullato:'ANNULLATO'};
    doc.text(statusLabels[s.status]||s.status,18,fy+11.5);
    // Payment date
    if(s.date){doc.setFontSize(9);doc.setTextColor(100);doc.setFont(undefined,'normal');doc.text('Data: '+fmtDate(s.date),14,fy+22);}
    // Footer
    doc.setFontSize(8);doc.setTextColor(160);
    doc.text('Documento generato automaticamente da INGLY MASTER 79.0',14,283);
    doc.text(cfg.piva?'P.IVA '+cfg.piva:'',14,287);
    doc.save(`fattura_${num}_${today()}.pdf`);
    toast('Fattura PDF scaricata!','success');
  },

  // ═══════════════════════════════════════════════════
  // CATALOG PICKER — selezione prodotto da catalogo
  // ═══════════════════════════════════════════════════
  _catPickerAll: [],
  _selectedCatalogId: null,

  async _openCatalogPicker(){
    const drop = document.getElementById('sale-cat-drop');
    if(!drop) return;
    if(!this._catPickerAll.length){
      this._catPickerAll = await IDB.getAll('catalog').catch(()=>[]);
    }
    this._renderCatItems(this._catPickerAll);
    drop.style.display = 'block';
    // One-time outside-click handler (immediate, no setTimeout)
    const handler = (e)=>{
      const wrap = document.getElementById('sale-catalog-picker-wrap');
      if(wrap && !wrap.contains(e.target)){
        if(drop) drop.style.display='none';
        document.removeEventListener('mousedown', handler);
      }
    };
    // Use mousedown (fires before click) so it closes before product selection
    setTimeout(()=>document.addEventListener('mousedown', handler), 10);
  },

  _renderCatItems(items){
    const inner = document.getElementById('sale-cat-drop-inner');
    const emptyEl = document.getElementById('sale-cat-drop-empty');
    if(!inner) return;
    if(!items.length){
      inner.style.display='none';
      if(emptyEl) emptyEl.style.display='block';
      return;
    }
    if(emptyEl) emptyEl.style.display='none';
    inner.style.display='grid';
    inner.innerHTML = items.map(p=>{
      const mg = (p.salePrice&&p.costPrice) ? Math.round((p.salePrice-p.costPrice)/p.salePrice*100) : null;
      const mgColor = mg!==null ? (mg>50?'#22c55e':mg>30?'#f59e0b':'#ef4444') : '#888';
      const imgHtml = p.image
        ? `<img src="${p.image}" alt="" style="width:46px;height:46px;border-radius:7px;object-fit:cover;flex-shrink:0" onerror="this.style.display='none'">`
        : `<div style="width:46px;height:46px;border-radius:7px;background:var(--bg-card);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">📦</div>`;
      return `<div onclick="Sales._selectCatProduct(${p.id})"
        style="padding:10px 11px;background:var(--bg-card2);border-radius:9px;border:1.5px solid var(--border);cursor:pointer;transition:.12s;display:flex;gap:9px;align-items:center"
        onmouseover="this.style.borderColor='var(--primary)';this.style.background='var(--primary-dim)'"
        onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--bg-card2)'">
        ${imgHtml}
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)">${p.name||'—'}</div>
          ${p.sku?`<div style="font-size:10px;color:var(--text-muted);font-family:monospace">${p.sku}</div>`:''}
          ${p.category?`<span style="display:inline-flex;margin-top:3px;padding:1px 7px;background:var(--primary-dim);color:var(--primary);border-radius:99px;font-size:9px;font-weight:700">${p.category}</span>`:''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${p.salePrice?`<div style="font-size:14px;font-weight:800;color:#22c55e">€${p.salePrice}</div>`:''}
          ${mg!==null?`<div style="font-size:10px;font-weight:700;color:${mgColor}">${mg}% mg</div>`:''}
        </div>
      </div>`;
    }).join('');
  },

  _filterCatPicker(q){
    const drop = document.getElementById('sale-cat-drop');
    if(drop) drop.style.display='block';
    if(!q){ this._renderCatItems(this._catPickerAll); return; }
    const ql=q.toLowerCase();
    this._renderCatItems(this._catPickerAll.filter(p=>
      [p.name,p.sku,p.category,p.description].join(' ').toLowerCase().includes(ql)
    ));
  },

  async _selectCatProduct(id){
    const p = this._catPickerAll.find(x=>x.id===id) || await IDB.get('catalog',id).catch(()=>null);
    if(!p) return;
    // ✅ Close dropdown IMMEDIATELY (don't wait for anything)
    const drop=document.getElementById('sale-cat-drop');
    if(drop){ drop.style.display='none'; }
    // ✅ Update search text
    const si=document.getElementById('sale-cat-search');
    if(si) si.value=p.name||'';
    // ✅ Show selected badge
    this._showCatBadge(p);
    // ✅ Pre-fill Descrizione if empty
    const desc=document.getElementById('sale-desc');
    if(desc&&!desc.value.trim()) desc.value=p.name||'';
    // ✅ Pre-fill Importo if zero/empty
    const amt=document.getElementById('sale-amount');
    if(amt&&(!amt.value||parseFloat(amt.value)===0)) amt.value=p.salePrice||'';
    // ✅ Pre-fill photo from catalog
    if(p.image&&!this._salePhoto){
      const prev=document.getElementById('sale-photo-preview');
      if(prev){ prev.innerHTML=`<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.parentElement.innerHTML='📷'">`; }
      this._catalogPhotoUrl = p.image;
    }
    this._selectedCatalogId = id;
    // ✅ Scroll modal to show filled fields
    const badge = document.getElementById('sale-cat-selected');
    if(badge) badge.scrollIntoView({behavior:'smooth',block:'nearest'});
    if(typeof toast!=='undefined') toast(`📦 ${p.name}${p.salePrice?' — €'+p.salePrice:''} selezionato!`,'success');
  },

  _showCatBadge(p){
    const badge=document.getElementById('sale-cat-selected');
    if(!badge) return;
    badge.style.display='flex';
    const img=document.getElementById('sale-cat-sel-img');
    if(img){ img.src=p.image||''; img.style.display=p.image?'block':'none'; }
    const nm=document.getElementById('sale-cat-sel-name');
    if(nm) nm.textContent=p.name||'—';
    const meta=document.getElementById('sale-cat-sel-meta');
    if(meta){
      const parts=[];
      if(p.sku) parts.push('SKU: '+p.sku);
      if(p.category) parts.push(p.category);
      if(p.costPrice) parts.push('Costo: €'+p.costPrice);
      const mg=(p.salePrice&&p.costPrice)?Math.round((p.salePrice-p.costPrice)/p.salePrice*100):null;
      if(mg!==null) parts.push('Margine: '+mg+'%');
      meta.textContent=parts.join(' · ');
    }
    const pr=document.getElementById('sale-cat-sel-price');
    if(pr) pr.textContent=p.salePrice?'€'+p.salePrice:'';
  },

  _clearCatPicker(){
    const drop=document.getElementById('sale-cat-drop');
    const si=document.getElementById('sale-cat-search');
    const badge=document.getElementById('sale-cat-selected');
    if(drop) drop.style.display='none';
    if(si) si.value='';
    if(badge) badge.style.display='none';
    this._selectedCatalogId=null;
    this._catalogPhotoUrl=null;
  },

  // ─── CLIENT AUTOCOMPLETE ────────────────────────────
  _clientDropTimer: null,
  async _searchClient(q){
    clearTimeout(this._clientDropTimer);
    this._clientDropTimer = setTimeout(async ()=>{
      try {
      const drop = document.getElementById('sale-client-drop');
      if(!drop){ this._createClientDrop(); return this._searchClient(q); }
      if(!q||!q.trim()){ drop.style.display='none'; return; }
      const all = await IDB.getAll('clients').catch(()=>[]);
      const filtered = all.filter(cl=>
        (cl.name||cl.company||'').toLowerCase().includes(q.toLowerCase()) ||
        (cl.email||'').toLowerCase().includes(q.toLowerCase())
      ).slice(0,8);
      if(!filtered.length){ drop.style.display='none'; return; }
      drop.innerHTML = filtered.map(cl=>`
        <div onclick="Sales._pickClient(${cl.id},'${(cl.name||cl.company||'').replace(/'/g,"\\'")}',this)"
          style="padding:8px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px"
          onmouseover="this.style.background='var(--primary-dim)'" onmouseout="this.style.background=''"
        >
          <div style="width:28px;height:28px;border-radius:99px;background:var(--primary-dim);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--primary);flex-shrink:0">${(cl.name||'?')[0].toUpperCase()}</div>
          <div>
            <div style="font-weight:700">${cl.name||cl.company||'—'}</div>
            ${cl.email?`<div style="font-size:10px;color:var(--text-muted)">${cl.email}</div>`:''}
          </div>
        </div>`
      ).join('') + `<div onclick="Sales._pickClient(null,'${q.replace(/'/g,"\\'")}')"
        style="padding:8px 12px;cursor:pointer;font-size:11px;color:var(--text-muted);font-style:italic;border-top:1px solid var(--border)"
        onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background=''"
      >+ Usa "${q}" come nuovo cliente</div>`;
      drop.style.display='block';
      } catch(e){ console.warn('[Sales._searchClient]', e); }
    }, 180);
  },

  async _quickSaveClient(){
    const name = document.getElementById('qnc-name')?.value?.trim();
    if(!name){ toast('Inserisci almeno il nome','warning'); return; }
    const phone = document.getElementById('qnc-phone')?.value?.trim()||'';
    const email = document.getElementById('qnc-email')?.value?.trim()||'';
    const newClient = { id:'c'+Date.now(), name, phone, email, createdAt:new Date().toISOString(), tags:['nuovo'], source:'quoter' };
    try {
      const clients = await AppStore.get('clients').catch(()=>[]);
      clients.push(newClient);
      await AppStore.set('clients', clients);
      // Auto-select in quoter
      const inp = document.getElementById('q-client-search');
      if(inp){ inp.value = name; inp.dataset.clientId = newClient.id; }
      document.getElementById('q-quick-client-form').style.display='none';
      ['qnc-name','qnc-phone','qnc-email'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
      toast('✅ Cliente "'+name+'" aggiunto e selezionato!','success');
      Bus.emit('client:created', newClient);
    } catch(e){ toast('Errore salvataggio cliente','error'); }
  },

  _createClientDrop(){
    const searchEl = document.getElementById('sale-client-search');
    if(!searchEl) return;
    const drop = document.createElement('div');
    drop.id = 'sale-client-drop';
    drop.style.cssText = 'position:absolute;top:100%;left:0;right:0;z-index:9999;background:var(--bg-card);border:1px solid var(--border2);border-radius:0 0 10px 10px;box-shadow:0 8px 24px rgba(0,0,0,.35);max-height:260px;overflow-y:auto;display:none';
    searchEl.parentElement.style.position = 'relative';
    searchEl.parentElement.appendChild(drop);
  },

  _pickClient(id, name, el){
    const hiddenInput = document.getElementById('sale-client');
    const searchInput = document.getElementById('sale-client-search');
    if(hiddenInput) hiddenInput.value = id||'';
    if(searchInput) searchInput.value = name||'';
    this._hideClientDrop();
  },

  _hideClientDrop(){
    const drop = document.getElementById('sale-client-drop');
    if(drop) drop.style.display = 'none';
  },

  _sortBy(field){
    if(!this._sortField||this._sortField!==field){ this._sortField=field; this._sortDir=1; }
    else { this._sortDir = this._sortDir===1?-1:1; }
    this.render();
  },

  toggleRitenuta(){
    const el = document.getElementById('sale-ritenuta-wrap');
    if(el) el.style.display = el.style.display==='none'?'block':'none';
  }
};
if(typeof Sales!=="undefined")window.Sales=Sales; // immediate window export


// ===== CASHFLOW =====
const Cashflow={
  editId:null,
  _cfPage:0,
  _cfPageSize:50,
  async render(){
    try {
      const cf = await AppStore.get('cashflow');
      const now = new Date();

      // ── KPIs ──────────────────────────────────────────────────────
      const income   = cf.filter(x=>x.type==='entrata').reduce((a,x)=>a+(+x.amount||0),0);
      const expenses = cf.filter(x=>x.type==='uscita').reduce((a,x)=>a+(+x.amount||0),0);
      const net = income - expenses;

      // This month
      const mKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const mInc = cf.filter(x=>x.type==='entrata'&&(x.date||'').startsWith(mKey)).reduce((a,x)=>a+(+x.amount||0),0);
      const mExp = cf.filter(x=>x.type==='uscita'  &&(x.date||'').startsWith(mKey)).reduce((a,x)=>a+(+x.amount||0),0);

      // Category breakdown for expenses
      const cats = {};
      cf.filter(x=>x.type==='uscita').forEach(x=>{
        const cat = x.cat||x.category||'Altro';
        cats[cat]=(cats[cat]||0)+(+x.amount||0);
      });
      const topCats = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5);

      const kpis = document.getElementById('cashflow-kpis');
      if(kpis) kpis.innerHTML=[
        {l:'Entrate totali',v:fmtCur(income),c:'#22c55e',ico:'💶'},
        {l:'Uscite totali',v:fmtCur(expenses),c:'#ef4444',ico:'💸'},
        {l:'Flusso netto',v:fmtCur(net),c:net>=0?'#22c55e':'#ef4444',ico:net>=0?'📈':'📉'},
        {l:'Mese corrente',v:fmtCur(mInc-mExp),c:(mInc-mExp)>=0?'#22c55e':'#f59e0b',ico:'📅'},
      ].map(k=>`<div class="kpi-card"><div style="font-size:18px;margin-bottom:4px">${k.ico}</div><div class="kpi-value" style="color:${k.c};font-size:18px">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');

      // ── List with running balance ──────────────────────────────────
      const sorted = [...cf].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
      let runningBalance = net; // start from current total, subtract as we go back

      const el = document.getElementById('cashflow-list');
      if(!el) return;

      if(!sorted.length){
        el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--text-muted)">
          <div style="font-size:36px;margin-bottom:10px">💰</div>
          <div style="font-size:14px;font-weight:700;margin-bottom:6px">Nessun movimento registrato</div>
          <div style="font-size:12px;margin-bottom:14px">Aggiungi entrate e uscite per tracciare il flusso di cassa</div>
          <button onclick="Cashflow.openModal()" style="padding:8px 18px;background:var(--primary);color:#000;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">+ Aggiungi movimento</button>
        </div>`;
        return;
      }

      // Category expense bars (inline)
      let catBarsHtml = '';
      if(topCats.length){
        const maxCat = topCats[0][1];
        catBarsHtml = `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:14px">
          <div style="font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">💸 Uscite per categoria</div>
          ${topCats.map(([cat,amt])=>{
            const pct=Math.round(amt/maxCat*100);
            return `<div style="margin-bottom:7px">
              <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>${cat}</span><span style="font-weight:700;color:#ef4444">${fmtCur(amt)}</span></div>
              <div style="height:4px;background:var(--bg-card2);border-radius:99px"><div style="height:4px;width:${pct}%;background:#ef4444;border-radius:99px"></div></div>
            </div>`;
          }).join('')}
        </div>`;
      }

      el.innerHTML = catBarsHtml + `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:11px;font-weight:800;color:var(--text-muted);display:flex;justify-content:space-between">
          <span>Movimenti (${sorted.length})</span>
          <span style="font-size:10px">Saldo attuale: <strong style="color:${net>=0?'#22c55e':'#ef4444'}">${fmtCur(net)}</strong></span>
        </div>
        ${(()=>{ const pageSize=Cashflow._cfPageSize||50; const page=Cashflow._cfPage||0; const paginated=sorted.slice(page*pageSize,(page+1)*pageSize); const totalPages=Math.max(1,Math.ceil(sorted.length/pageSize));
        const rows=paginated.map((mv,i)=>{
          const isInc = mv.type==='entrata';
          const amt   = +mv.amount||0;
          const daysAgo = mv.date ? Math.floor((Date.now()-new Date(mv.date).getTime())/864e5) : null;
          return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--border);transition:.1s" onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background=''">
            <!-- Icon -->
            <div style="width:34px;height:34px;border-radius:9px;background:${isInc?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px">${isInc?'💶':'💸'}</div>
            <!-- Info -->
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${mv.desc||mv.description||'—'}</div>
              <div style="font-size:10px;color:var(--text-muted);display:flex;gap:8px;margin-top:1px">
                <span>📅 ${mv.date||'—'}</span>
                ${mv.cat||mv.category?`<span>🏷️ ${mv.cat||mv.category}</span>`:''}
                ${daysAgo!==null?`<span style="color:var(--text-dim)">${daysAgo===0?'oggi':daysAgo===1?'ieri':daysAgo+'gg fa'}</span>`:''}
              </div>
            </div>
            <!-- Amount -->
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:14px;font-weight:900;color:${isInc?'#22c55e':'#ef4444'}">${isInc?'+':'-'}${fmtCur(amt)}</div>
            </div>
            <!-- Actions -->
            <div style="display:flex;gap:4px;flex-shrink:0;opacity:0;transition:.15s" class="cf-actions">
              <button onclick="Cashflow.openModal(${mv.id})" style="padding:4px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-muted)" title="Modifica">✏️</button>
              <button onclick="Cashflow.del(${mv.id})" style="padding:4px 8px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:6px;cursor:pointer;font-size:11px;color:#ef4444" title="Elimina">🗑</button>
            </div>
          </div>`;
        });
        const nav=totalPages>1?`<div style="display:flex;align-items:center;justify-content:center;gap:10px;padding:10px 14px;border-top:1px solid var(--border)">
          <button onclick="Cashflow._cfPage=Math.max(0,(Cashflow._cfPage||0)-1);Cashflow.render()" ${page===0?'disabled':''} style="padding:5px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);cursor:pointer;font-size:11px">◀ Prec</button>
          <span style="font-size:11px;color:var(--text-muted)">Pag ${page+1} / ${totalPages} · ${sorted.length} mov.</span>
          <button onclick="Cashflow._cfPage=Math.min(totalPages-1,(Cashflow._cfPage||0)+1);Cashflow.render()" ${page>=totalPages-1?'disabled':''} style="padding:5px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);cursor:pointer;font-size:11px">Succ ▶</button>
        </div>`:'';
        return rows.join('')+nav; })()}
      </div>
      <style>#cashflow-list [class="cf-actions"] { opacity:0; } #cashflow-list > div > div:hover .cf-actions { opacity:1!important; }</style>`;
    } catch(e){ console.error('[Cashflow.render]',e); }
  },
  renderChart(cf){
    const months=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    const inc=new Array(12).fill(0),exp=new Array(12).fill(0);
    cf.forEach(c=>{const m=new Date(c.date).getMonth();if(c.type==='entrata')inc[m]+=(+c.amount||0);else exp[m]+=(+c.amount||0);});
    destroyChart('chart-cashflow');
    new Chart(eid('chart-cashflow'),{type:'line',data:{labels:months,datasets:[{label:'Entrate',data:inc,borderColor:'#22c55e',backgroundColor:'rgba(34,197,94,0.1)',fill:true,tension:.4},{label:'Uscite',data:exp,borderColor:'#ef4444',backgroundColor:'rgba(239,68,68,0.1)',fill:true,tension:.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#888'}}},scales:{y:{ticks:{color:'#888'},grid:{color:'#ffffff08'}},x:{ticks:{color:'#888'},grid:{display:false}}}}});
  },
  async openModal(id=null){
    this.editId=id;
    eid('cf-date').value=today();
    if(id){const c=await IDB.get('cashflow',id);if(c){eid('cf-type').value=c.type;eid('cf-date').value=c.date;eid('cf-desc').value=c.desc;eid('cf-amount').value=c.amount;eid('cf-cat').value=c.cat||'Altro';}}
    openModal('cashflow');
  },

  async importCashflowExcel() {
    const file = await ExcelImport.openPicker();
    if (!file) return;
    try {
      const { rows, col } = await ExcelImport.parseFile(file);
      const iTipo   = col('tipo','type','categoria','category','entrata_uscita');
      const iData   = col('data','date','giorno','data_movimento');
      const iDesc   = col('descrizione','desc','description','note','causale');
      const iImp    = col('importo','amount','valore','value','totale');
      const fields  = [iTipo>=0&&'Tipo',iData>=0&&'Data',iDesc>=0&&'Descrizione',iImp>=0&&'Importo'].filter(Boolean);
      ExcelImport.showPreview(file, fields, rows.length, async () => {
        toast('Importazione cashflow...','info',2500);
        let n=0;
        for(let i=0;i<rows.length;i++){
          const r=rows[i];
          const imp=iImp>=0?parseFloat(String(r[iImp]||'0').replace(/[€$,\s]/g,'').replace(',','.'))||0:0;
          if(!imp) continue;
          const rawTipo=(iTipo>=0?String(r[iTipo]||''):'entrata').toLowerCase();
          const tipo=rawTipo.includes('usc')||rawTipo.includes('spesa')||rawTipo.includes('cost')?'uscita':'entrata';
          await IDB.put('cashflow',{id:Date.now()+i,type:tipo,date:iData>=0?String(r[iData]||new Date().toISOString().split('T')[0]):new Date().toISOString().split('T')[0],desc:iDesc>=0?String(r[iDesc]||'').trim():'Importato',amount:imp,cat:'import'}).catch(()=>{});
          n++;
        }
        AppStore.invalidate('cashflow');
        await this.render();
        toast('✅ '+n+' movimenti importati','success',4000);
      });
    } catch(e){ toast('Errore: '+e.message,'error',6000); }
  },
  async save(){
    const rawCat = eid('cf-cat')?.value;
    const rawDesc = eid('cf-desc')?.value || '';
    // 🤖 Auto-categorize if category is empty
    const autoCat = (!rawCat && typeof AutoEngine!=='undefined') ? AutoEngine.autoCategorizeExpense(rawDesc) : rawCat;
    const mv={type:eid('cf-type').value,date:eid('cf-date').value,desc:rawDesc,amount:+eid('cf-amount').value||0,cat:autoCat||rawCat};
    if(this.editId){mv.id=this.editId;}else{mv.id=Date.now();}
    const id=await IDB.put('cashflow',mv).catch(e=>{toast('Errore salvataggio','error');console.error('[Cashflow.save]',e);});
    await logAction('cashflow',id,'saved',{type:mv.type,amount:mv.amount});
    AppStore.invalidate('cashflow');
    toast('Movimento salvato!');closeModal('cashflow');this.editId=null;
    await this.render();Bus.emit('cashflow:changed');
  },
  async del(id){
    if(!confirm('Eliminare questo movimento?'))return;
    await IDB.del('cashflow',id).catch(e=>console.warn('[IDB.del]',e));
    await logAction('cashflow',id,'deleted');
    AppStore.invalidate('cashflow');
    toast('Movimento eliminato','warning');
    await this.render();Bus.emit('cashflow:changed');
  }
};
if(typeof Cashflow!=="undefined")window.Cashflow=Cashflow; // immediate window export


// ===== INVENTORY =====
const Finance={
  async render(){await this.tab('overview',document.querySelector('#view-finance .tab-btn.active')||document.querySelector('#view-finance .tab-btn'));},
  async tab(t,btn){
    document.querySelectorAll('#view-finance .tab-btn').forEach(b=>b.classList.remove('active'));
    if(btn)btn.classList.add('active');
    const el=eid('finance-content');if(!el)return;
    // Route to specialized tab handlers
    if(t==='primanota')  { await this._tabPrimaNota(el); return; }
    if(t==='simulator')  { await this._tabSimulator(el); return; }
    if(t==='breakeven')  { await this._tabBreakeven(el); return; }
    if(t==='cac')        { await this._tabCAC(el); return; }
    if(t==='roi')        { await this._tabROI(el); return; }
    const [sales,cashflow,clients,fixedCosts,campaigns]=await Promise.all([
      IDB.getAll('sales'),IDB.getAll('cashflow'),IDB.getAll('clients'),
      IDB.getAll('fixed_costs').catch(()=>[]),IDB.getAll('marketing_campaigns').catch(()=>[])
    ]);
    const now=new Date();
    const mStart=new Date(now.getFullYear(),now.getMonth(),1).toISOString().split('T')[0];
    const mSales=sales.filter(s=>s.date>=mStart);
    const revenue=mSales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
    const mIncome=cashflow.filter(c=>c.type==='entrata'&&c.date>=mStart).reduce((a,c)=>a+(+c.amount||0),0);
    const mExp=cashflow.filter(c=>c.type==='uscita'&&c.date>=mStart).reduce((a,c)=>a+(+c.amount||0),0);
    const totalRev=sales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
    const totalExp=cashflow.filter(c=>c.type==='uscita').reduce((a,c)=>a+(+c.amount||0),0);
    const profit=totalRev-totalExp;
    const margin=totalRev>0?(profit/totalRev*100):0;
    // Fixed costs monthly total
    const fcMonthly=fixedCosts.reduce((a,f)=>{
      const m={mensile:1,trimestrale:1/3,semestrale:1/6,annuale:1/12}[f.freq]||1;
      return a+(+f.amount||0)*m;
    },0);
    // Avg order value
    const paidSales=sales.filter(s=>s.status==='pagato');
    const avgOrder=paidSales.length?totalRev/paidSales.length:0;
    // Variable cost per order (estimate)
    const varCostPct=0.35; // 35% of revenue
    const varCostPerOrder=avgOrder*varCostPct;
    // Break Even
    const marginContrib=avgOrder-varCostPerOrder;
    const bepUnits=marginContrib>0?Math.ceil(fcMonthly/marginContrib):0;
    const bepRev=bepUnits*avgOrder;
    // CAC
    const mktExp=cashflow.filter(c=>(c.cat||'').toLowerCase().includes('market')).reduce((a,c)=>a+(+c.amount||0),0);
    const newClients=clients.length;
    const cac=newClients>0?mktExp/newClients:0;
    // LTV
    const ordersPerClient=newClients>0?paidSales.length/newClients:0;
    const avgDuration=2; // 2 years avg
    const ltv=avgOrder*ordersPerClient*avgDuration;
    // ROAS per campaign
    const mktTotal=campaigns.reduce((a,c)=>a+(+c.budget||0),0)||mktExp||1;
    const campRevenue=campaigns.reduce((a,c)=>a+(+c.revenue||0),0)||revenue;
    const roas=mktTotal>0?campRevenue/mktTotal:0;
    // ROI
    const roi=mktTotal>0?((campRevenue-mktTotal)/mktTotal*100):0;
    if(t==='overview'){
      el.innerHTML=`
      <div class="grid-4 mb-16">
        ${[
          {l:'Fatturato Totale',v:fmtCur(totalRev),i:'fa-euro-sign',c:'var(--green)',sub:'tutte le vendite pagate'},
          {l:'Costi Totali',v:fmtCur(totalExp),i:'fa-money-bill-wave',c:'var(--red)',sub:'uscite registrate'},
          {l:'Utile Netto',v:fmtCur(profit),i:'fa-chart-line',c:profit>=0?'var(--green)':'var(--red)',sub:`Margine: ${margin.toFixed(1)}%`},
          {l:'Flusso di Cassa (Mese)',v:fmtCur(mIncome-mExp),i:'fa-water',c:(mIncome-mExp)>=0?'var(--green)':'var(--red)',sub:`+${fmtCur(mIncome)} / -${fmtCur(mExp)}`},
        ].map(k=>`<div class="kpi-card"><i class="fas ${k.i} kpi-icon" style="color:${k.c}"></i><div class="kpi-value" style="color:${k.c}">${k.v}</div><div class="kpi-label">${k.l}</div><div style="font-size:10px;color:var(--text-dim)">${k.sub}</div></div>`).join('')}
      </div>
      <div class="grid-4 mb-16">
        ${[
          {l:'Break Even (unità/mese)',v:bepUnits+' ordini',i:'fa-balance-scale',c:'var(--orange)',sub:`Min. fatturato: ${fmtCur(bepRev)}`},
          {l:'CAC',v:fmtCur(cac),i:'fa-user-plus',c:'var(--blue)',sub:'costo acquisiz. cliente'},
          {l:'LTV',v:fmtCur(ltv),i:'fa-user-clock',c:'var(--purple)',sub:`${ordersPerClient.toFixed(1)} ordini × ${avgDuration}y`},
          {l:'ROAS',v:roas.toFixed(2)+'x',i:'fa-ad',c:roas>=2?'var(--green)':'var(--orange)',sub:`ROI: ${roi.toFixed(0)}%`},
        ].map(k=>`<div class="kpi-card"><i class="fas ${k.i} kpi-icon" style="color:${k.c}"></i><div class="kpi-value" style="color:${k.c}">${k.v}</div><div class="kpi-label">${k.l}</div><div style="font-size:10px;color:var(--text-dim)">${k.sub}</div></div>`).join('')}
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title">📈 Ricavi & Utili — Sintesi</div>
          <div class="stat-row"><span>Ricavi Totali</span><span class="stat-val text-green">${fmtCur(totalRev)}</span></div>
          <div class="stat-row"><span>Costi Variabili (stima 35%)</span><span class="stat-val text-red">${fmtCur(totalRev*varCostPct)}</span></div>
          <div class="stat-row"><span>Costi Fissi Mensili</span><span class="stat-val text-red">${fmtCur(fcMonthly)}</span></div>
          <div class="stat-row"><span>Costi Totali Registrati</span><span class="stat-val text-red">${fmtCur(totalExp)}</span></div>
          <div class="stat-row" style="border-top:2px solid var(--primary);margin-top:8px;padding-top:8px"><span><strong>Utile Netto</strong></span><span class="stat-val" style="color:${profit>=0?'var(--green)':'var(--red)'};font-size:18px">${fmtCur(profit)}</span></div>
          <div class="stat-row"><span>Margine %</span><span class="stat-val" style="color:var(--primary)">${margin.toFixed(1)}%</span></div>
        </div>
        <div class="card">
          <div class="card-title">💧 Flusso di Cassa</div>
          <div class="chart-wrap" style="height:220px"><canvas id="chart-finance-cashflow"></canvas></div>
        </div>
      </div>`;
      // Draw cashflow chart
      setTimeout(()=>{
        const months=[];const incData=[];const expData=[];
        for(let i=5;i>=0;i--){
          const d=new Date(now.getFullYear(),now.getMonth()-i,1);
          const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          months.push(d.toLocaleDateString('it-IT',{month:'short',year:'2-digit'}));
          incData.push(cashflow.filter(c=>c.type==='entrata'&&(c.date||'').startsWith(key)).reduce((a,c)=>a+(+c.amount||0),0));
          expData.push(cashflow.filter(c=>c.type==='uscita'&&(c.date||'').startsWith(key)).reduce((a,c)=>a+(+c.amount||0),0));
        }
        destroyChart('chart-finance-cashflow');
        const ctx=eid('chart-finance-cashflow');if(!ctx)return;
        new Chart(ctx,{type:'bar',data:{labels:months,datasets:[
          {label:'Entrate',data:incData,backgroundColor:'rgba(34,197,94,.6)',borderColor:'var(--green)',borderWidth:1},
          {label:'Uscite',data:expData,backgroundColor:'rgba(239,68,68,.4)',borderColor:'var(--red)',borderWidth:1},
        ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#aaa'}}},scales:{x:{ticks:{color:'#888'}},y:{ticks:{color:'#888',callback:v=>'€'+v}}}}});
      },60);
    }
    else if(t==='breakeven'){
      el.innerHTML=`<div class="grid-2">
        <div class="card">
          <div class="card-title">⚖️ Break Even Point</div>
          <div style="text-align:center;padding:20px 0">
            <div style="font-size:48px;font-weight:800;color:var(--primary)">${bepUnits}</div>
            <div style="color:var(--text-muted);margin-top:4px">ordini minimi al mese</div>
            <div style="font-size:24px;font-weight:700;color:var(--green);margin-top:12px">${fmtCur(bepRev)}</div>
            <div style="color:var(--text-muted)">fatturato minimo mensile</div>
          </div>
          <div class="progress mt-16" style="height:12px;margin-bottom:8px">
            <div class="progress-bar green" style="width:${Math.min(100,paidSales.length>0?Math.round(paidSales.filter(s=>s.date>=mStart).length/bepUnits*100):0)}%"></div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);text-align:center">${paidSales.filter(s=>s.date>=mStart).length} ordini questo mese su ${bepUnits} necessari</div>
          <hr>
          <div class="stat-row"><span class="text-muted">Formula</span><span style="font-size:12px">CF / (Prezzo - Costo Variabile)</span></div>
          <div class="stat-row"><span class="text-muted">Costi Fissi/mese</span><span class="stat-val">${fmtCur(fcMonthly)}</span></div>
          <div class="stat-row"><span class="text-muted">Ordine Medio</span><span class="stat-val">${fmtCur(avgOrder)}</span></div>
          <div class="stat-row"><span class="text-muted">Costo Var. Stimato</span><span class="stat-val">${fmtCur(varCostPerOrder)}</span></div>
          <div class="stat-row"><span class="text-muted">Margine Contribuzione</span><span class="stat-val text-green">${fmtCur(marginContrib)}</span></div>
        </div>
        <div class="card">
          <div class="card-title">📊 Struttura Costi</div>
          <div class="chart-wrap" style="height:220px"><canvas id="chart-bep"></canvas></div>
          <hr>
          <div class="alert alert-info mt-12"><i class="fas fa-info-circle"></i> <strong>Come migliorare il BEP:</strong> Aumenta il valore medio ordine, riduci i costi fissi, ottimizza il costo variabile (materiali + tempo).</div>
        </div>
      </div>`;
      setTimeout(()=>{
        destroyChart('chart-bep');const ctx=eid('chart-bep');if(!ctx)return;
        new Chart(ctx,{type:'doughnut',data:{labels:['Costi Fissi','Costi Variabili','Margine'],datasets:[{data:[fcMonthly,totalRev*varCostPct,Math.max(0,profit)],backgroundColor:['rgba(239,68,68,.6)','rgba(251,191,36,.6)','rgba(34,197,94,.6)'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#aaa'}}}}});
      },60);
    }
    else if(t==='cac'){
      el.innerHTML=`<div class="grid-2">
        <div class="card">
          <div class="card-title">🎯 Customer Acquisition Cost (CAC)</div>
          <div style="text-align:center;padding:20px 0">
            <div style="font-size:48px;font-weight:800;color:var(--blue)">${fmtCur(cac)}</div>
            <div style="color:var(--text-muted)">per cliente acquisito</div>
          </div>
          <div class="stat-row"><span class="text-muted">Formula</span><span style="font-size:12px">Spesa Mktg / Clienti Acquisiti</span></div>
          <div class="stat-row"><span class="text-muted">Totale Spese Marketing</span><span class="stat-val text-red">${fmtCur(mktExp)}</span></div>
          <div class="stat-row"><span class="text-muted">Clienti Totali</span><span class="stat-val">${newClients}</span></div>
          <div class="stat-row"><span class="text-muted">CAC</span><span class="stat-val text-blue">${fmtCur(cac)}</span></div>
          <div class="alert alert-success mt-12"><i class="fas fa-check-circle"></i> Ratio LTV/CAC: <strong>${cac>0?(ltv/cac).toFixed(1):0}x</strong> — Target ideale >3x</div>
        </div>
        <div class="card">
          <div class="card-title">⏱️ LTV — Customer Lifetime Value</div>
          <div style="text-align:center;padding:20px 0">
            <div style="font-size:48px;font-weight:800;color:var(--purple)">${fmtCur(ltv)}</div>
            <div style="color:var(--text-muted)">valore medio cliente (2 anni)</div>
          </div>
          <div class="stat-row"><span class="text-muted">Formula</span><span style="font-size:12px">Ord.Medio × Freq. × Durata</span></div>
          <div class="stat-row"><span class="text-muted">Ordine Medio</span><span class="stat-val">${fmtCur(avgOrder)}</span></div>
          <div class="stat-row"><span class="text-muted">Ordini per Cliente</span><span class="stat-val">${ordersPerClient.toFixed(1)}</span></div>
          <div class="stat-row"><span class="text-muted">Durata Stimata</span><span class="stat-val">${avgDuration} anni</span></div>
          <div class="stat-row"><span class="text-muted">LTV</span><span class="stat-val" style="color:var(--purple)">${fmtCur(ltv)}</span></div>
        </div>
      </div>`;
    }
    else if(t==='roi'){
      el.innerHTML=`<div class="grid-2">
        <div class="card">
          <div class="card-title">💹 ROI — Return On Investment</div>
          <div style="text-align:center;padding:20px 0">
            <div style="font-size:48px;font-weight:800;color:${roi>=0?'var(--green)':'var(--red)'}">${roi.toFixed(0)}%</div>
            <div style="color:var(--text-muted)">sul marketing investito</div>
          </div>
          <div class="stat-row"><span class="text-muted">Formula</span><span style="font-size:12px">(Guadagno - Investim.) / Investim. × 100</span></div>
          <div class="stat-row"><span class="text-muted">Investimento Marketing</span><span class="stat-val text-red">${fmtCur(mktTotal)}</span></div>
          <div class="stat-row"><span class="text-muted">Ricavi Generati</span><span class="stat-val text-green">${fmtCur(campRevenue)}</span></div>
          <div class="stat-row"><span class="text-muted">ROI</span><span class="stat-val" style="color:${roi>=0?'var(--green)':'var(--red)'}">${roi.toFixed(0)}%</span></div>
          <div class="stat-row"><span class="text-muted">ROI Globale (profitto)</span><span class="stat-val" style="color:var(--primary)">${totalExp>0?((profit/totalExp)*100).toFixed(0):0}%</span></div>
        </div>
        <div class="card">
          <div class="card-title">📢 ROAS — Return On Ad Spend</div>
          <div style="text-align:center;padding:20px 0">
            <div style="font-size:48px;font-weight:800;color:${roas>=2?'var(--green)':'var(--orange)'}">${roas.toFixed(2)}x</div>
            <div style="color:var(--text-muted)">ricavi per €1 speso in ads</div>
          </div>
          <div class="stat-row"><span class="text-muted">Formula</span><span style="font-size:12px">Ricavi Campagna / Spesa Campagna</span></div>
          <div class="stat-row"><span class="text-muted">Totale Investito</span><span class="stat-val text-red">${fmtCur(mktTotal)}</span></div>
          <div class="stat-row"><span class="text-muted">Ricavi Campagna</span><span class="stat-val text-green">${fmtCur(campRevenue)}</span></div>
          <div class="stat-row"><span class="text-muted">ROAS</span><span class="stat-val" style="color:${roas>=2?'var(--green)':'var(--orange)'}">${roas.toFixed(2)}x</span></div>
          <div class="alert ${roas>=3?'alert-success':roas>=2?'alert-warning':'alert-danger'} mt-12"><i class="fas fa-${roas>=3?'star':roas>=2?'thumbs-up':'exclamation-triangle'}"></i> ROAS ${roas>=3?'Eccellente (>3x) ✅':roas>=2?'Buono (>2x) — ottimizzabile':'Basso (<2x) — rivedere campagne'}</div>
        </div>
      </div>`;
    }
    else if(t==='simulator'){
      el.innerHTML=`<div class="card">
        <div class="card-title">🔮 Simulatore Scenari</div>
        <div class="grid-3">
          <div>
            <div class="form-group"><label class="form-label">Prezzo Medio Ordine (€)</label><input class="form-control" id="sim-price" type="number" value="${avgOrder.toFixed(0)}" oninput="Finance.simulate()"></div>
            <div class="form-group"><label class="form-label">Ordini/Mese</label><input class="form-control" id="sim-orders" type="number" value="${paidSales.filter(s=>s.date>=mStart).length||10}" oninput="Finance.simulate()"></div>
            <div class="form-group"><label class="form-label">Costi Fissi/Mese (€)</label><input class="form-control" id="sim-fc" type="number" value="${fcMonthly.toFixed(0)}" oninput="Finance.simulate()"></div>
            <div class="form-group"><label class="form-label">Costo Variabile % (es. 35)</label><input class="form-control" id="sim-var" type="number" value="35" oninput="Finance.simulate()"></div>
          </div>
          <div id="sim-results" style="grid-column:span 2"></div>
        </div>
      </div>`;
      this.simulate();
    }
  },
  simulate(){
    const price=+eid('sim-price')?.value||0;
    const orders=+eid('sim-orders')?.value||0;
    const fc=+eid('sim-fc')?.value||0;
    const varPct=(+eid('sim-var')?.value||35)/100;
    const rev=price*orders;
    const varCosts=rev*varPct;
    const profitSim=rev-varCosts-fc;
    const marginSim=rev>0?(profitSim/rev*100):0;
    const varCostPer=price*varPct;
    const mc=price-varCostPer;
    const bepSim=mc>0?Math.ceil(fc/mc):0;
    const el=eid('sim-results');if(!el)return;
    el.innerHTML=`
      <div class="grid-2">
        <div class="card" style="background:var(--bg-card2)">
          <div class="card-title">📊 Risultati Simulazione</div>
          <div class="stat-row"><span>Fatturato Mensile</span><span class="stat-val text-green">${fmtCur(rev)}</span></div>
          <div class="stat-row"><span>Costi Variabili</span><span class="stat-val text-red">${fmtCur(varCosts)}</span></div>
          <div class="stat-row"><span>Costi Fissi</span><span class="stat-val text-red">${fmtCur(fc)}</span></div>
          <div class="stat-row" style="border-top:2px solid var(--primary);padding-top:8px"><span><strong>Utile Netto</strong></span><span class="stat-val" style="color:${profitSim>=0?'var(--green)':'var(--red)'}"><strong>${fmtCur(profitSim)}</strong></span></div>
          <div class="stat-row"><span>Margine</span><span class="stat-val">${marginSim.toFixed(1)}%</span></div>
        </div>
        <div class="card" style="background:var(--bg-card2)">
          <div class="card-title">⚖️ Break Even Simulato</div>
          <div style="text-align:center;padding:16px 0">
            <div style="font-size:36px;font-weight:800;color:var(--primary)">${bepSim}</div>
            <div class="text-muted">ordini/mese necessari</div>
            <div style="font-size:18px;font-weight:700;color:var(--green);margin-top:8px">${fmtCur(bepSim*price)}</div>
            <div class="text-muted">fatturato minimo</div>
          </div>
          <div class="${profitSim>=0?'alert-success':'alert-danger'} alert mt-12"><i class="fas fa-${profitSim>=0?'check':'times'}-circle"></i> ${profitSim>=0?`In utile con ${orders} ordini/mese!`:`Servono almeno ${bepSim} ordini/mese per coprire i costi`}</div>
        </div>
      </div>`;
  },

  // ═══ Monthly P&L + Smart Finance ═══
  _plMonths: 6,
  async renderPL(nMonths) {
    const el = document.getElementById('finance-pl-container');
    if(!el) return;
    if(nMonths) this._plMonths = nMonths;
    const N = this._plMonths || 6;
    const [sales, cashflow] = await Promise.all([
      IDB.getAll('sales').catch(()=>[]),
      IDB.getAll('cashflow').catch(()=>[]),
    ]);
    const now = new Date();
    // Build last N months P&L
    const months = [];
    for(let i=N-1;i>=0;i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      const label = d.toLocaleDateString('it-IT',{month:'short',year:'2-digit'});
      const mSales   = sales.filter(s=>s.date?.startsWith(key)&&s.status==='pagato');
      const mIncome  = cashflow.filter(c=>c.type==='entrata'&&c.date?.startsWith(key));
      const mExpense = cashflow.filter(c=>c.type==='uscita'&&c.date?.startsWith(key));
      const rev   = mSales.reduce((a,s)=>a+(+s.amount||0),0);
      const inc   = mIncome.reduce((a,c)=>a+(+c.amount||0),0);
      const exp   = mExpense.reduce((a,c)=>a+(+c.amount||0),0);
      const total = rev + inc;
      const profit = total - exp;
      months.push({key,label,rev,inc,exp,total,profit,margin:total>0?Math.round(profit/total*100):0});
    }
    const currentMonth = months[months.length-1];
    const prevMonth    = months[months.length-2];
    const revTrend = prevMonth?.total>0 ? Math.round((currentMonth.total-prevMonth.total)/prevMonth.total*100) : 0;

    // Totals row
    const totTotal  = months.reduce((a,m)=>a+m.total,0);
    const totExp    = months.reduce((a,m)=>a+m.exp,0);
    const totProfit = months.reduce((a,m)=>a+m.profit,0);
    const totMargin = totTotal>0 ? Math.round(totProfit/totTotal*100) : 0;

    // Expense breakdown by category
    const expCats = {};
    cashflow.filter(cf=>cf.type==='uscita').forEach(cf=>{
      const cat = cf.category||cf.type_detail||'Altro';
      expCats[cat] = (expCats[cat]||0) + (+cf.amount||0);
    });
    const sortedCats = Object.entries(expCats).sort((a,b)=>b[1]-a[1]).slice(0,6);

    const periodBtnStyle = (v)=>`padding:4px 12px;border-radius:99px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid ${N===v?'#6366f1':'var(--border)'};background:${N===v?'rgba(99,102,241,.12)':'var(--bg-card2)'};color:${N===v?'#818cf8':'var(--text-muted)'}`;

    el.innerHTML = `
    <!-- P&L period selector + table -->
    <div style="background:var(--bg-card);border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:14px">
      <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:800;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        📊 P&amp;L Mensile
        <div style="display:flex;gap:5px;margin-left:8px">
          <button onclick="Finance.renderPL(3)" style="${periodBtnStyle(3)}">3M</button>
          <button onclick="Finance.renderPL(6)" style="${periodBtnStyle(6)}">6M</button>
          <button onclick="Finance.renderPL(12)" style="${periodBtnStyle(12)}">12M</button>
        </div>
        <span style="margin-left:auto;font-size:11px;color:${revTrend>=0?'#22c55e':'#ef4444'};font-weight:700">${revTrend>=0?'↑':'↓'} ${Math.abs(revTrend)}% vs mese scorso</span>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:var(--bg-card2)">
              <th style="padding:8px 12px;text-align:left;color:var(--text-muted);font-weight:600">Mese</th>
              <th style="padding:8px 12px;text-align:right;color:var(--text-muted);font-weight:600">Entrate</th>
              <th style="padding:8px 12px;text-align:right;color:var(--text-muted);font-weight:600">Uscite</th>
              <th style="padding:8px 12px;text-align:right;color:var(--text-muted);font-weight:600">Utile</th>
              <th style="padding:8px 12px;text-align:right;color:var(--text-muted);font-weight:600">Margine</th>
            </tr>
          </thead>
          <tbody>
            ${months.map((m,i)=>`<tr style="border-top:1px solid var(--border);${i===months.length-1?'background:var(--bg-card2);font-weight:700':''}">
              <td style="padding:8px 12px;color:var(--text)">${m.label}</td>
              <td style="padding:8px 12px;text-align:right;color:#22c55e">${m.total>0?'€'+Math.round(m.total):'—'}</td>
              <td style="padding:8px 12px;text-align:right;color:#ef4444">${m.exp>0?'€'+Math.round(m.exp):'—'}</td>
              <td style="padding:8px 12px;text-align:right;color:${m.profit>=0?'#22c55e':'#ef4444'};font-weight:700">${m.total||m.exp?'€'+Math.round(m.profit):'—'}</td>
              <td style="padding:8px 12px;text-align:right">
                ${m.total>0?`<span style="background:${m.margin>=40?'rgba(34,197,94,.12)':m.margin>=20?'rgba(245,158,11,.12)':'rgba(239,68,68,.12)'};color:${m.margin>=40?'#22c55e':m.margin>=20?'#f59e0b':'#ef4444'};padding:2px 7px;border-radius:99px;font-size:10px;font-weight:700">${m.margin}%</span>`:'—'}
              </td>
            </tr>`).join('')}
            <!-- Totals row -->
            <tr style="border-top:2px solid var(--border);background:rgba(99,102,241,.06);font-weight:800;font-size:12px">
              <td style="padding:9px 12px;color:var(--text)">TOTALE ${N}M</td>
              <td style="padding:9px 12px;text-align:right;color:#22c55e">${totTotal>0?'€'+Math.round(totTotal):'—'}</td>
              <td style="padding:9px 12px;text-align:right;color:#ef4444">${totExp>0?'€'+Math.round(totExp):'—'}</td>
              <td style="padding:9px 12px;text-align:right;color:${totProfit>=0?'#22c55e':'#ef4444'}">${totTotal||totExp?'€'+Math.round(totProfit):'—'}</td>
              <td style="padding:9px 12px;text-align:right">
                ${totTotal>0?`<span style="background:${totMargin>=40?'rgba(34,197,94,.12)':totMargin>=20?'rgba(245,158,11,.12)':'rgba(239,68,68,.12)'};color:${totMargin>=40?'#22c55e':totMargin>=20?'#f59e0b':'#ef4444'};padding:2px 7px;border-radius:99px;font-size:10px;font-weight:700">${totMargin}%</span>`:'—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

`;

    // Expense breakdown — separate to avoid nested template issues
    if(sortedCats.length) {
      const totalExp = sortedCats.reduce((a,[,v])=>a+v,0);
      const expHtml = sortedCats.map(([cat,amt])=>{
        const maxAmt = sortedCats[0][1];
        const pct = Math.round(amt/maxAmt*100);
        const share = Math.round(amt/totalExp*100);
        return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>'+cat+'</span><span style="font-weight:700">&#x20AC;'+Math.round(amt)+' <span style="color:var(--text-dim)">('+share+'%)</span></span></div><div style="height:5px;background:var(--bg-card2);border-radius:99px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#ef4444,#f97316);border-radius:99px"></div></div></div>';
      }).join('');
      el.innerHTML += '<div style="background:var(--bg-card);border-radius:12px;border:1px solid var(--border);overflow:hidden"><div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:800">&#x1F4B8; Uscite per categoria</div><div style="padding:12px 14px">'+expHtml+'</div></div>';
    }
  },

  async exportFinanceCSV() {
    const [sales, cashflow] = await Promise.all([IDB.getAll('sales').catch(()=>[]), IDB.getAll('cashflow').catch(()=>[])]);
    const rows = [
      ['Data','Tipo','Descrizione','Categoria','Importo','Stato'],
      ...sales.map(s=>[(s.date||'').slice(0,10),'Vendita',s.desc||s.clientName||'',s.channel||'Vendita',s.amount||0,s.status]),
      ...cashflow.map(c=>[(c.date||'').slice(0,10),c.type==='entrata'?'Entrata':'Uscita',c.desc||c.description||'',c.category||'',c.amount||0,'registrato']),
    ];
    rows.sort((a,b)=>a[0]<b[0]?1:-1);
    const csv = rows.map(r=>r.map(v=>'"'+String(v||"").replace(/"/g,'""')+'"').join(",")).join("\n");
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'prima_nota_ingly_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    if(typeof toast!=='undefined') toast('📤 ' + (rows.length-1) + ' movimenti esportati!','success');
  },

  _pnPage: 0,
  _pnPageSize: 50,
  _pnFilter: '',

  // ── Prima Nota ────────────────────────────────────
  async _tabPrimaNota(el){
    const [sales,cashflow] = await Promise.all([IDB.getAll('sales').catch(()=>[]),IDB.getAll('cashflow').catch(()=>[])]);
    const all=[
      ...sales.map(s=>({date:s.date||s.created?.slice(0,10)||'',type:'Vendita',desc:s.desc||s.clientName||'',cat:s.channel||'Vendita',amount:+s.amount||0,sign:1})),
      ...cashflow.map(cf=>({date:cf.date||'',type:cf.type==='entrata'?'Entrata':'Uscita',desc:cf.desc||cf.description||'',cat:cf.cat||cf.category||'',amount:+cf.amount||0,sign:cf.type==='entrata'?1:-1})),
    ].sort((a,b)=>b.date.localeCompare(a.date));
    const totInc=all.filter(x=>x.sign>0).reduce((a,x)=>a+x.amount,0);
    const totExp=all.filter(x=>x.sign<0).reduce((a,x)=>a+x.amount,0);

    // Filter + pagination
    const srch = (this._pnFilter||'').toLowerCase();
    const filtered = srch ? all.filter(x=>(x.desc||'').toLowerCase().includes(srch)||(x.cat||'').toLowerCase().includes(srch)||(x.type||'').toLowerCase().includes(srch)) : all;
    const ps = this._pnPageSize||50;
    const totalPages = Math.max(1, Math.ceil(filtered.length/ps));
    if(this._pnPage>=totalPages) this._pnPage=totalPages-1;
    const pg = this._pnPage||0;
    const pageItems = filtered.slice(pg*ps, pg*ps+ps);
    const bs='padding:5px 10px;border:1px solid var(--border);border-radius:7px;background:var(--bg-card2);cursor:pointer;color:var(--text);font-size:11px';
    const bas='padding:5px 10px;border:1px solid #6366f1;border-radius:7px;background:rgba(99,102,241,.12);cursor:pointer;color:#818cf8;font-size:11px;font-weight:700';

    el.innerHTML=`<div style="margin-top:8px">
      <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
        <div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:9px;padding:10px 16px;flex:1;min-width:140px"><div style="font-size:18px;font-weight:900;color:#22c55e">${fmtCur(totInc)}</div><div style="font-size:11px;color:var(--text-muted)">Entrate totali</div></div>
        <div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:9px;padding:10px 16px;flex:1;min-width:140px"><div style="font-size:18px;font-weight:900;color:#ef4444">${fmtCur(totExp)}</div><div style="font-size:11px;color:var(--text-muted)">Uscite totali</div></div>
        <div style="background:${(totInc-totExp)>=0?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)'};border:1px solid ${(totInc-totExp)>=0?'rgba(34,197,94,.2)':'rgba(239,68,68,.2)'};border-radius:9px;padding:10px 16px;flex:1;min-width:140px"><div style="font-size:18px;font-weight:900;color:${(totInc-totExp)>=0?'#22c55e':'#ef4444'}">${fmtCur(totInc-totExp)}</div><div style="font-size:11px;color:var(--text-muted)">Saldo netto</div></div>
        <button onclick="Finance.exportFinanceCSV()" style="padding:10px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700;color:#22c55e;white-space:nowrap">📤 Esporta CSV</button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
        <input type="text" placeholder="🔍 Cerca descrizione, categoria..." value="${srch.replace(/"/g,'&quot;')}"
          oninput="Finance._pnFilter=this.value;Finance._pnPage=0;Finance._tabPrimaNota(document.getElementById('finance-content'))"
          style="flex:1;padding:7px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:12px">
        <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">${filtered.length} movimenti</span>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--bg-card2)">
            <th style="padding:9px 12px;text-align:left;color:var(--text-muted);font-weight:600">Data</th>
            <th style="padding:9px 12px;text-align:left;color:var(--text-muted);font-weight:600">Tipo</th>
            <th style="padding:9px 12px;text-align:left;color:var(--text-muted);font-weight:600">Descrizione</th>
            <th style="padding:9px 12px;text-align:left;color:var(--text-muted);font-weight:600">Categoria</th>
            <th style="padding:9px 12px;text-align:right;color:var(--text-muted);font-weight:600">Importo</th>
          </tr></thead>
          <tbody>${pageItems.map(x=>`<tr style="border-top:1px solid var(--border)">
            <td style="padding:7px 12px;color:var(--text-dim);font-size:11px">${x.date||'—'}</td>
            <td style="padding:7px 12px"><span style="font-size:10px;padding:2px 7px;border-radius:99px;background:${x.sign>0?'rgba(34,197,94,.1)':'rgba(239,68,68,.1)'};color:${x.sign>0?'#22c55e':'#ef4444'};font-weight:700">${x.type}</span></td>
            <td style="padding:7px 12px;font-size:12px">${x.desc}</td>
            <td style="padding:7px 12px;font-size:11px;color:var(--text-muted)">${x.cat}</td>
            <td style="padding:7px 12px;text-align:right;font-weight:700;color:${x.sign>0?'#22c55e':'#ef4444'}">${x.sign>0?'+':'-'}${fmtCur(x.amount)}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
      ${totalPages>1?`<div style="display:flex;justify-content:center;align-items:center;gap:5px;margin-top:12px">
        <button onclick="Finance._pnPage=Math.max(0,(Finance._pnPage||0)-1);Finance._tabPrimaNota(document.getElementById('finance-content'))" style="${bs}" ${pg===0?'disabled':''}>‹ Prec</button>
        ${Array.from({length:Math.min(7,totalPages)},(_,i)=>{const p=Math.max(0,pg-3)+i;return p<totalPages?`<button onclick="Finance._pnPage=${p};Finance._tabPrimaNota(document.getElementById('finance-content'))" style="${p===pg?bas:bs}">${p+1}</button>`:''}).join('')}
        <button onclick="Finance._pnPage=Math.min(${totalPages-1},(Finance._pnPage||0)+1);Finance._tabPrimaNota(document.getElementById('finance-content'))" style="${bs}" ${pg>=totalPages-1?'disabled':''}>Succ ›</button>
        <span style="font-size:11px;color:var(--text-muted)">Pag. ${pg+1}/${totalPages}</span>
      </div>`:''}
    </div>`;
  },

  // ── Simulatore ────────────────────────────────────
  async _tabSimulator(el){
    const sales = await IDB.getAll('sales').catch(()=>[]);
    const paid  = sales.filter(s=>s.status==='pagato');
    const avgRev = paid.length ? paid.reduce((a,s)=>a+(+s.amount||0),0)/paid.length : 0;
    const mRev   = paid.filter(s=>(s.date||'').startsWith(new Date().toISOString().slice(0,7))).reduce((a,s)=>a+(+s.amount||0),0);
    el.innerHTML=`<div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px">
        <div style="font-size:13px;font-weight:800;margin-bottom:14px">🔮 Simulatore What-If</div>
        <div style="display:flex;flex-direction:column;gap:10px" id="sim-inputs">
          ${[
            ['Vendite/mese (#)',Math.max(paid.length,1),'sim-n'],
            ['Prezzo medio (€)',Math.round(avgRev)||50,'sim-price'],
            ['Costo materiali (%)',30,'sim-cost'],
            ['Fee piattaforme (%)',6.5,'sim-fees'],
            ['Ore lavoro/mese',40,'sim-hours'],
            ['Tariffa oraria (€)',15,'sim-rate'],
          ].map(([l,v,id])=>`<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">${l}</label>
            <input id="${id}" class="form-control" type="number" value="${v}" oninput="Finance._runSim()"></div>`).join('')}
        </div>
      </div>
      <div id="sim-result" style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:16px">
        <div style="font-size:13px;font-weight:800;margin-bottom:14px">📊 Risultati simulazione</div>
        <div style="color:var(--text-muted);font-size:12px">Modifica i valori a sinistra per vedere i risultati...</div>
      </div>
    </div>`;
    this._runSim();
  },

  _runSim(){
    const n     = +(document.getElementById('sim-n')?.value||0);
    const price = +(document.getElementById('sim-price')?.value||0);
    const cost  = +(document.getElementById('sim-cost')?.value||30)/100;
    const fees  = +(document.getElementById('sim-fees')?.value||6.5)/100;
    const hours = +(document.getElementById('sim-hours')?.value||0);
    const rate  = +(document.getElementById('sim-rate')?.value||15);
    const rev   = n*price;
    const matCost  = rev*cost;
    const feeCost  = rev*fees;
    const labCost  = hours*rate;
    const totalCost= matCost+feeCost+labCost;
    const profit   = rev-totalCost;
    const margin   = rev>0?Math.round(profit/rev*100):0;
    const hourly   = hours>0?Math.round(profit/hours):0;
    const el = document.getElementById('sim-result');
    if(!el) return;
    el.innerHTML=`<div style="font-size:13px;font-weight:800;margin-bottom:14px">📊 Risultati simulazione</div>
      ${[
        ['Revenue mensile','€'+Math.round(rev),'#22c55e'],
        ['Costi materiali','-€'+Math.round(matCost),'#ef4444'],
        ['Fee piattaforme','-€'+Math.round(feeCost),'#f59e0b'],
        ['Costo lavoro','-€'+Math.round(labCost),'#f97316'],
        ['Utile netto','€'+Math.round(profit),profit>=0?'#22c55e':'#ef4444'],
        ['Margine netto',margin+'%',margin>=40?'#22c55e':margin>=20?'#f59e0b':'#ef4444'],
        ['Guadagno/ora','€'+hourly+'/h',hourly>=20?'#22c55e':hourly>=10?'#f59e0b':'#ef4444'],
      ].map(([l,v,col])=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:12px;color:var(--text-muted)">${l}</span>
        <span style="font-size:14px;font-weight:800;color:${col}">${v}</span>
      </div>`).join('')}
      <div style="margin-top:12px;padding:10px;background:${profit>=0?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)'};border:1px solid ${profit>=0?'rgba(34,197,94,.2)':'rgba(239,68,68,.2)'};border-radius:8px;font-size:12px;color:${profit>=0?'#22c55e':'#ef4444'};font-weight:700;text-align:center">
        ${profit>=0?'✅ Scenario profittevole':'⚠️ Scenario in perdita — rivedi i costi'}
      </div>`;
  },

  // ── Break-Even ────────────────────────────────────
  async _tabBreakeven(el){
    const [cashflow,fixedCosts] = await Promise.all([IDB.getAll('cashflow').catch(()=>[]),IDB.getAll('fixed_costs').catch(()=>[])]);
    const monthly = fixedCosts.reduce((a,fc)=>a+(+fc.amount||0),0) + cashflow.filter(x=>x.type==='uscita'&&x.cat==='Costi fissi').reduce((a,x)=>a+(+x.amount||0),0)/12;
    el.innerHTML=`<div style="margin-top:8px;max-width:600px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:14px">
        <div style="font-size:13px;font-weight:800;margin-bottom:12px">⚖️ Analisi Break-Even</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">Costi fissi mensili (€)</label>
            <input id="be-fixed" class="form-control" type="number" value="${Math.round(monthly)||500}" oninput="Finance._calcBE()"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">Prezzo medio vendita (€)</label>
            <input id="be-price" class="form-control" type="number" value="50" oninput="Finance._calcBE()"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">Costo variabile unitario (€)</label>
            <input id="be-var" class="form-control" type="number" value="15" oninput="Finance._calcBE()"></div>
          <div id="be-result" style="background:var(--bg-card2);border-radius:9px;padding:10px;display:flex;align-items:center;justify-content:center"><div style="color:var(--text-muted);font-size:12px">Calcolo...</div></div>
        </div>
      </div>
      ${monthly>0?`<div style="background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.2);border-radius:10px;padding:12px 14px;font-size:12px;color:#818cf8"><i class="fas fa-info-circle" style="margin-right:6px"></i>Costi fissi rilevati automaticamente dai tuoi dati: €${Math.round(monthly)}/mese</div>`:''}
    </div>`;
    this._calcBE();
  },

  _calcBE(){
    const fixed = +(document.getElementById('be-fixed')?.value||0);
    const price = +(document.getElementById('be-price')?.value||0);
    const varC  = +(document.getElementById('be-var')?.value||0);
    const el    = document.getElementById('be-result');
    if(!el||price<=varC){if(el)el.innerHTML='<div style="color:#ef4444;font-size:12px;font-weight:700">⚠️ Prezzo deve essere<br>maggiore del costo var.</div>';return;}
    const contrib = price-varC;
    const units   = Math.ceil(fixed/contrib);
    const revenue = units*price;
    el.innerHTML=`<div style="text-align:center">
      <div style="font-size:22px;font-weight:900;color:#818cf8">${units}</div>
      <div style="font-size:10px;color:var(--text-muted)">unità/mese per pareggio</div>
      <div style="font-size:12px;font-weight:700;color:#22c55e;margin-top:4px">€${Math.round(revenue)}</div>
      <div style="font-size:9px;color:var(--text-dim)">revenue break-even</div>
    </div>`;
  },

  // ── CAC / LTV ────────────────────────────────────
  async _tabCAC(el){
    const [sales,clients,cashflow] = await Promise.all([IDB.getAll('sales').catch(()=>[]),IDB.getAll('clients').catch(()=>[]),IDB.getAll('cashflow').catch(()=>[])]);
    const paid   = sales.filter(s=>s.status==='pagato');
    const mktExp = cashflow.filter(x=>x.type==='uscita'&&(x.cat||'').toLowerCase().includes('market')).reduce((a,x)=>a+(+x.amount||0),0);
    const activeClients = new Set(paid.map(s=>s.clientId||s.clientName)).size;
    const cac = activeClients>0?Math.round(mktExp/activeClients):0;
    const ltv = clients.length>0?Math.round(paid.reduce((a,s)=>a+(+s.amount||0),0)/clients.length):0;
    const ltvCacRatio = cac>0?(ltv/cac).toFixed(1):'—';
    el.innerHTML=`<div style="margin-top:8px">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
        ${[
          {l:'CAC',v:cac>0?'€'+cac:'—',sub:'Costo acquisizione cliente',c:'#f59e0b',desc:'Spesa marketing / clienti acquisiti'},
          {l:'LTV medio',v:ltv>0?'€'+ltv:'—',sub:'Lifetime value per cliente',c:'#22c55e',desc:'Revenue totale / n° clienti'},
          {l:'LTV/CAC ratio',v:ltvCacRatio,sub:ltvCacRatio>3?'✅ Ottimo':ltvCacRatio>1?'🟡 OK':'⚠️ Da migliorare',c:ltvCacRatio>3?'#22c55e':ltvCacRatio>1?'#f59e0b':'#ef4444',desc:'Obiettivo: >3'},
        ].map(k=>`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;text-align:center">
          <div style="font-size:22px;font-weight:900;color:${k.c}">${k.v}</div>
          <div style="font-size:11px;font-weight:700;margin-top:3px">${k.l}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${k.sub}</div>
          <div style="font-size:9px;color:var(--text-dim);margin-top:4px;font-style:italic">${k.desc}</div>
        </div>`).join('')}
      </div>
      <div style="background:var(--bg-card2);border-radius:10px;padding:12px 14px;font-size:12px;color:var(--text-muted)">
        💡 <strong>Come migliorare il LTV/CAC:</strong> Aumenta il valore medio degli ordini, attiva clienti inattivi con promozioni mirate, riduci i costi di acquisizione attraverso referral e social organici.
      </div>
    </div>`;
  },

  // ── ROI / ROAS ────────────────────────────────────
  async _tabROI(el){
    const [sales,cashflow] = await Promise.all([IDB.getAll('sales').catch(()=>[]),IDB.getAll('cashflow').catch(()=>[])]);
    const totalRev = sales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
    const mktSpend = cashflow.filter(x=>x.type==='uscita'&&(x.cat||'').toLowerCase().includes('market')).reduce((a,x)=>a+(+x.amount||0),0);
    const adsSpend = cashflow.filter(x=>x.type==='uscita'&&(x.cat||'').toLowerCase().includes('ads')).reduce((a,x)=>a+(+x.amount||0),0);
    const totalSpend = mktSpend+adsSpend||1;
    const roi  = Math.round(((totalRev-totalSpend)/totalSpend)*100);
    const roas = (totalRev/totalSpend).toFixed(2);
    el.innerHTML=`<div style="margin-top:8px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        ${[
          {l:'ROI complessivo',v:(roi>=0?'+':'')+roi+'%',sub:'Return on Investment',c:roi>=0?'#22c55e':'#ef4444'},
          {l:'ROAS',v:'€'+roas,sub:'Return on Ad Spend',c:+roas>=3?'#22c55e':+roas>=1?'#f59e0b':'#ef4444'},
          {l:'Spesa marketing',v:'€'+Math.round(mktSpend),sub:'Spese categoria Marketing',c:'#f59e0b'},
          {l:'Revenue totale',v:'€'+Math.round(totalRev),sub:'Da vendite pagate',c:'#22c55e'},
        ].map(k=>`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:20px;font-weight:900;color:${k.c}">${k.v}</div>
          <div style="font-size:11px;font-weight:700;margin-top:3px">${k.l}</div>
          <div style="font-size:10px;color:var(--text-muted)">${k.sub}</div>
        </div>`).join('')}
      </div>
      <div style="background:${roi>=0?'rgba(34,197,94,.06)':'rgba(239,68,68,.06)'};border:1px solid ${roi>=0?'rgba(34,197,94,.2)':'rgba(239,68,68,.2)'};border-radius:10px;padding:12px 14px;font-size:12px;color:${roi>=0?'#22c55e':'#ef4444'}">
        ${roi>=100?'🚀 Eccellente ROI! Stai triplicando l\'investimento.':roi>=50?'✅ ROI molto buono — continua così':roi>=0?'🟡 ROI positivo ma migliorabile — analizza i canali più efficaci':'⚠️ ROI negativo — rivedi la strategia di marketing'}
      </div>
    </div>`;
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'prima_nota_ingly_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    if(typeof toast!=='undefined') toast(`📤 ${rows.length-1} movimenti esportati!`,'success');
  }
};

// ===== SOCIAL HUB =====
// PrimaNota → moved to v11 block
;
(function(){
  const _orig=Finance.tab?.bind(Finance);
  if(_orig)Finance.tab=async function(t,btn){
    if(t==='primanota'){
      document.querySelectorAll('#view-finance .tab-btn').forEach(b=>b.classList.remove('active'));
      if(btn)btn.classList.add('active');
      await (typeof PrimaNota!=='undefined'&&PrimaNota.render());return;
    }
    return _orig(t,btn);
  };
})();

// ══════════════════════════════════════════════════════════════════
// STORICO ORDINI PER CLIENTE
// ══════════════════════════════════════════════════════════════════
Clients.showStorico=async function(clientId){
  const[clients,sales,quotes]=await Promise.all([
    IDB.getAll('clients').catch(()=>[]),
    IDB.getAll('sales').catch(()=>[]),
    IDB.getAll('quotes').catch(()=>[]),
  ]);
  const c=clients.find(x=>x.id===clientId);if(!c)return;
  const cSales=sales.filter(s=>s.clientId===clientId).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const cQuotes=quotes.filter(q=>q.clientId===clientId);
  const totSpent=cSales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
  const avgOrder=cSales.filter(s=>s.status==='pagato').length?totSpent/cSales.filter(s=>s.status==='pagato').length:0;
  const titleEl=document.getElementById('storico-title');
  if(titleEl)titleEl.textContent=`📋 ${c.name} — Storico`;
  const bodyEl=document.getElementById('storico-body');if(!bodyEl)return;
  bodyEl.innerHTML=`
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px">
  ${[{l:'Ordini',v:cSales.length,c:'var(--primary)'},{l:'Totale speso',v:fmtCur(totSpent),c:'var(--green)'},{l:'Media ordine',v:fmtCur(avgOrder),c:'var(--blue)'},{l:'Preventivi',v:cQuotes.length,c:'var(--orange)'}]
    .map(k=>`<div class="kpi-card" style="text-align:center"><div class="kpi-value" style="color:${k.c}">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('')}
</div>
<div style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:6px">💰 VENDITE (${cSales.length})</div>
${cSales.length?`<div style="overflow-x:auto;margin-bottom:18px"><table style="width:100%;border-collapse:collapse;font-size:12px">
  <thead><tr style="border-bottom:1px solid var(--border2)">
    <th style="padding:8px;text-align:left;font-size:10px;color:var(--text-muted)">Data</th>
    <th style="padding:8px;text-align:left;font-size:10px;color:var(--text-muted)">Descrizione</th>
    <th style="padding:8px;text-align:center;font-size:10px;color:var(--text-muted)">Stato</th>
    <th style="padding:8px;text-align:right;font-size:10px;color:var(--text-muted)">Importo</th>
    <th style="padding:8px;text-align:center;font-size:10px;color:var(--text-muted)">Canale</th>
  </tr></thead>
  <tbody>${cSales.map(s=>`<tr style="border-bottom:1px solid var(--border)">
    <td style="padding:8px;color:var(--text-muted);white-space:nowrap">${s.date||'—'}</td>
    <td style="padding:8px">${s.desc||'—'}</td>
    <td style="padding:8px;text-align:center"><span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:${s.status==='pagato'?'#10b98120':s.status==='da_pagare'?'#f59e0b20':'#ef444420'};color:${s.status==='pagato'?'#4ade80':s.status==='da_pagare'?'#fbbf24':'#f87171'}">${s.status}</span></td>
    <td style="padding:8px;text-align:right;font-weight:700;color:${s.status==='pagato'?'var(--green)':'var(--text)'}">${fmtCur(+s.amount||0)}</td>
    <td style="padding:8px;text-align:center;font-size:11px;color:var(--text-muted)">${s.channel||'—'}</td>
  </tr>`).join('')}</tbody>
</table></div>` : '<div style="color:var(--text-dim);font-size:12px;margin-bottom:16px;padding:12px;background:var(--bg-card2);border-radius:8px">Nessun ordine registrato per questo cliente.</div>'}
<div style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:6px">📄 PREVENTIVI (${cQuotes.length})</div>
${cQuotes.length?`<table style="width:100%;border-collapse:collapse;font-size:12px"><tbody>
${cQuotes.map(q=>`<tr style="border-bottom:1px solid var(--border)">
  <td style="padding:8px;color:var(--text-muted)">${q.date||q.createdAt||'—'}</td>
  <td style="padding:8px">${q.name||'Preventivo'}</td>
  <td style="padding:8px;text-align:right;font-weight:700">${q.total?fmtCur(q.total):'—'}</td>
  <td style="padding:8px;text-align:center"><span style="padding:2px 8px;border-radius:4px;font-size:10px;background:var(--bg-card2);color:var(--text-muted)">${q.status||'bozza'}</span></td>
</tr>`).join('')}</tbody></table>` : '<div style="color:var(--text-dim);font-size:12px;padding:12px;background:var(--bg-card2);border-radius:8px">Nessun preventivo.</div>'}`;
  openModal('storico-cliente');
};

// ══════════════════════════════════════════════════════════════════
// VOICE INPUT
// ══════════════════════════════════════════════════════════════════
const Solleciti = {
  async showPanel(){
    openModal('solleciti');
    const body = eid('solleciti-body'); if(!body) return;
    const sales = await AppStore.get('sales').catch(()=>[]);
    const clients = await AppStore.get('clients').catch(()=>[]);
    const now = new Date();

    const overdue = sales.filter(s=>{
      if(s.status !== 'da_pagare') return false;
      const days = Math.ceil((now - new Date(s.date||now)) / 86400000);
      return days > 0;
    }).map(s=>{
      const days = Math.ceil((now - new Date(s.date||now)) / 86400000);
      const client = clients.find(c=>c.id===s.clientId);
      return {...s, daysOverdue: days, clientEmail: client?.email||'', clientPhone: client?.phone||''};
    }).sort((a,b)=>b.daysOverdue-a.daysOverdue);

    if(!overdue.length){
      body.innerHTML=`<div style="text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:12px">🎉</div><div style="font-size:16px;font-weight:700;color:var(--green)">Nessun pagamento in sospeso!</div><div style="color:var(--text-muted);font-size:13px;margin-top:6px">Tutti i tuoi clienti sono in regola.</div></div>`;
      return;
    }

    const totalDebt = overdue.reduce((a,s)=>a+(+s.amount||0),0);

    body.innerHTML = `
      <div style="background:linear-gradient(135deg,#7c2d1210,#1e293b);border:1px solid #f9731640;border-radius:10px;padding:14px;margin-bottom:18px;display:flex;gap:16px">
        <div><div style="font-size:24px;font-weight:900;color:#fb923c">${overdue.length}</div><div style="font-size:11px;color:#94a3b8">Pagamenti scaduti</div></div>
        <div style="border-left:1px solid #334155;padding-left:16px"><div style="font-size:24px;font-weight:900;color:#ef4444">€${totalDebt.toFixed(2)}</div><div style="font-size:11px;color:#94a3b8">Totale da incassare</div></div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px">
        ${overdue.map(s=>{
          const urgency = s.daysOverdue > 60 ? {col:'#ef4444',label:'🔴 Critico'} : s.daysOverdue > 30 ? {col:'#f97316',label:'🟠 Urgente'} : {col:'#f59e0b',label:'🟡 Attenzione'};
          const waMsg = encodeURIComponent(`Gentile ${s.clientName||'cliente'},\n\nVolevo ricordarti il pagamento di €${(+s.amount).toFixed(2)} relativo a "${s.desc||'ordine'}" del ${s.date||''}.\n\nSe hai già provveduto, ti chiedo di ignorare questo messaggio.\n\nGrazie!\nIngle Design`);
          const mailSubj = encodeURIComponent(`Sollecito pagamento — €${(+s.amount).toFixed(2)}`);
          const mailBody = encodeURIComponent(`Gentile ${s.clientName||'cliente'},\n\nVolevo ricordarti il pagamento di €${(+s.amount).toFixed(2)} relativo a "${s.desc||'ordine'}" del ${s.date||''}.\n\nCordiali saluti,\nIngle Design`);
          return `<div style="background:var(--bg-card2);border-radius:10px;padding:14px;border-left:3px solid ${urgency.col}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
              <div>
                <div style="font-size:13px;font-weight:700;color:var(--text)">${s.clientName||'—'}</div>
                <div style="font-size:11px;color:var(--text-muted)">${s.desc||'—'} · ${s.date||'—'}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:16px;font-weight:900;color:${urgency.col}">€${(+s.amount).toFixed(2)}</div>
                <div style="font-size:10px;color:${urgency.col}">${urgency.label} · ${s.daysOverdue}gg</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
              ${s.clientPhone?`<a href="https://wa.me/${s.clientPhone.replace(/\D/g,'')}?text=${waMsg}" target="_blank" style="padding:6px 12px;background:#25d36620;color:#25d366;border:1px solid #25d36640;border-radius:6px;text-decoration:none;font-size:11px;font-weight:700">💬 WhatsApp</a>`:''}
              ${s.clientEmail?`<a href="mailto:${s.clientEmail}?subject=${mailSubj}&body=${mailBody}" style="padding:6px 12px;background:#6366f120;color:#a5b4fc;border:1px sus:6px;text-decoration:none;font-size:11px;font-weight:700">📧 Email</a>`:''}
              <button onclick="Solleciti.markPaid(${s.id})" style="padding:6px 12px;background:#10b98120;color:#4ade80;border:1px solid #10b98140;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">✅ Segna Pagato</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
  },

  async markPaid(saleId){
    const sales = await AppStore.get('sales').catch(()=>[]);
    const s = sales.find(x=>x.id===saleId);
    if(!s) return;
    s.status = 'pagato';
    await IDB.put('sales', s);
    toast(`✅ ${s.clientName||'Cliente'} — €${(+s.amount).toFixed(2)} segnato come pagato`, '💰');
    await this.showPanel();
    Bus.emit('sale:created');
  },
};

// ══════════════════════════════════════════════════════════════════
// AI GROQ SETUP GUIDE — wizard inline per configurare la key gratis
// ══════════════════════════════════════════════════════════════════
const ProfitScope = {

  _period: 'year',

  async render() {
    const el = eid('view-profitscope');
    if (!el) return;
    el.innerHTML = `<div style="padding:20px;max-width:1200px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <h2 style="color:#22c55e;margin:0;font-size:22px">💰 ProfitScope</h2>
        <span style="font-size:11px;background:#22c55e15;color:#22c55e;padding:3px 10px;border-radius:99px;border:1px solid #22c55e30;font-weight:700">VERITÀ DEI NUMERI</span>
      </div>
      <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px">Scopri esattamente quali prodotti guadagnano e quanto vale la tua ora di lavoro</p>
      <div id="ps-content"><div style="text-align:center;padding:40px"><div style="width:40px;height:40px;border:3px solid var(--border);border-top-color:#22c55e;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 12px"></div><div style="color:var(--text-muted)">Calcolo in corso…</div></div></div>
    </div>`;
    await this._load();
  },

  async _load() {
    const el = eid('ps-content');
    if (!el) return;
    try {
      const [sales, materials, fixedCosts, timers] = await Promise.all([
        IDB.getAll('sales'),
        IDB.getAll('materials').catch(() => []),
        IDB.getAll('fixed_costs').catch(() => []),
        IDB.getAll('timers').catch(() => [])
      ]);

      const now = new Date();
      const periods = {
        month: new Date(now.getFullYear(), now.getMonth(), 1),
        quarter: new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1),
        year: new Date(now.getFullYear(), 0, 1),
        all: new Date(0)
      };
      const p = this._period;
      const cutoff = periods[p].getTime();
      const filtered = sales.filter(s => s.status === 'pagato' && new Date(s.date||0).getTime() >= cutoff);

      // Total revenue & costs
      const totalRev = filtered.reduce((a, s) => a + (+s.amount || 0), 0);
      const totalCostMat = filtered.reduce((a, s) => a + (+s.materialCost || 0), 0);

      // Monthly fixed costs
      const monthlyFixed = fixedCosts.reduce((a, fc) => {
        const v = +fc.amount || 0;
        if (fc.frequency === 'monthly' || !fc.frequency) return a + v;
        if (fc.frequency === 'yearly') return a + v/12;
        if (fc.frequency === 'quarterly') return a + v/3;
        return a + v;
      }, 0);
      const periodMonths = { month:1, quarter:3, year:12, all: Math.max(1, Math.ceil((Date.now()-cutoff)/(30*24*3600*1000))) };
      const totalFixed = monthlyFixed * periodMonths[p];

      const totalCost = totalCostMat + totalFixed;
      const netProfit = totalRev - totalCost;
      const marginPct = totalRev > 0 ? (netProfit/totalRev*100) : 0;

      // Timer data → total hours worked
      const totalMinutes = timers.filter(t => t.completed).reduce((a,t) => a + (+t.elapsed||0)/60, 0);
      const eurPerHour = totalMinutes > 60 ? (netProfit / (totalMinutes/60)) : null;

      // Product breakdown
      const prodMap = {};
      filtered.forEach(s => {
        const k = (s.productName||s.description||'Prodotto generico').substring(0,40);
        if (!prodMap[k]) prodMap[k] = { name:k, revenue:0, cost:0, qty:0, minutes:0 };
        prodMap[k].revenue += (+s.amount||0);
        prodMap[k].cost += (+s.materialCost||0);
        prodMap[k].qty += (+s.quantity||1);
      });
      // Attach timer minutes per product
      timers.filter(t=>t.completed).forEach(t => {
        const k = Object.keys(prodMap).find(k => k.toLowerCase().includes((t.productName||'').toLowerCase().substring(0,10)));
        if(k) prodMap[k].minutes += (+t.elapsed||0)/60;
      });

      const products = Object.values(prodMap).sort((a,b) => (b.revenue-b.cost)-(a.revenue-a.cost));

      // --- RENDER ---
      const pLabel = { month:'Questo Mese', quarter:'Questo Trimestre', year:"Quest'Anno", all:'Tutto' };
      const fmt = v => `€${v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,',')}`;
      const fmtDec = v => `€${v.toFixed(2)}`;

      const alertHtml = () => {
        if (!eurPerHour) return '';
        if (eurPerHour < 8) return `<div style="background:#ef444420;border:1.5px solid #ef4444;border-radius:10px;padding:14px 18px;display:flex;gap:12px;align-items:center;margin-bottom:16px"><span style="font-size:24px">🚨</span><div><div style="color:#ef4444;font-weight:700;font-size:14px">Stai guadagnando €${eurPerHour.toFixed(2)}/ora — sotto il minimo vitale</div><div style="color:#fca5a5;font-size:12px;margin-top:3px">Devi alzare i prezzi o ridurre il tempo di produzione. Usa Price Intelligence nel Business AI Hub.</div></div></div>`;
        if (eurPerHour < 15) return `<div style="background:#f59e0b20;border:1.5px solid #f59e0b;border-radius:10px;padding:14px 18px;display:flex;gap:12px;align-items:center;margin-bottom:16px"><span style="font-size:24px">⚠️</span><div><div style="color:#f59e0b;font-weight:700;font-size:14px">€${eurPerHour.toFixed(2)}/ora — puoi fare meglio</div><div style="color:#fde68a;font-size:12px;margin-top:3px">Target consigliato: €20+/ora. Punta a ottimizzare i prodotti con margine più alto.</div></div></div>`;
        return `<div style="background:#22c55e20;border:1.5px solid #22c55e;border-radius:10px;padding:14px 18px;display:flex;gap:12px;align-items:center;margin-bottom:16px"><span style="font-size:24px">✅</span><div><div style="color:#22c55e;font-weight:700;font-size:14px">€${eurPerHour.toFixed(2)}/ora — ottimo risultato!</div><div style="color:#86efac;font-size:12px;margin-top:3px">Sei sopra la media per artigiani. Continua a puntare sui prodotti ad alto margine.</div></div></div>`;
      };

      const kpiCard = (icon, label, value, sub, color) => `
        <div style="background:var(--bg-card);border-radius:12px;padding:18px;border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;font-weight:600;text-transform:uppercase">${icon} ${label}</div>
          <div style="font-size:26px;font-weight:800;color:${color};margin-bottom:2px">${value}</div>
          <div style="font-size:11px;color:var(--text-muted)">${sub}</div>
        </div>`;

      const prodRow = (pr, rank) => {
        const gross = pr.revenue - pr.cost;
        const margin = pr.revenue > 0 ? (gross/pr.revenue*100) : 0;
        const eph = pr.minutes > 30 ? (gross/(pr.minutes/60)) : null;
        const barW = products[0].revenue > 0 ? Math.round(pr.revenue/products[0].revenue*100) : 0;
        const rankColor = rank===0?'#f59e0b':rank===1?'#9ca3af':rank===2?'#92400e':'#6b7280';
        const marginColor = margin>=50?'#22c55e':margin>=30?'#f59e0b':'#ef4444';
        return `<tr>
          <td style="padding:10px 12px;font-weight:700;color:${rankColor}">#${rank+1}</td>
          <td style="padding:10px 12px">
            <div style="font-weight:600;font-size:13px;color:var(--text)">${pr.name}</div>
            <div style="height:4px;background:var(--border);border-radius:2px;margin-top:5px;width:100%;max-width:200px">
              <div style="height:4px;background:#22c55e;border-radius:2px;width:${barW}%"></div>
            </div>
          </td>
          <td style="padding:10px 12px;text-align:right;font-weight:600;color:#22c55e">${fmt(pr.revenue)}</td>
          <td style="padding:10px 12px;text-align:right;color:var(--text-muted)">${fmt(pr.cost)}</td>
          <td style="padding:10px 12px;text-align:right;font-weight:700;color:${marginColor}">${margin.toFixed(0)}%</td>
          <td style="padding:10px 12px;text-align:center;color:var(--text)">${pr.qty}</td>
          <td style="padding:10px 12px;text-align:right;font-weight:700;color:${eph?eph>=15?'#22c55e':eph>=8?'#f59e0b':'#ef4444':'var(--text-muted)'}">${eph?`€${eph.toFixed(0)}/h`:'—'}</td>
        </tr>`;
      };

      el.innerHTML = `
        <!-- PERIOD TABS -->
        <div style="display:flex;gap:8px;margin-bottom:20px">
          ${['month','quarter','year','all'].map(k=>`<button onclick="ProfitScope._period='${k}';ProfitScope._load()" style="padding:8px 16px;border-radius:8px;border:1.5px solid ${p===k?'#22c55e':'var(--border)'};background:${p===k?'#22c55e20':'transparent'};color:${p===k?'#22c55e':'var(--text-muted)'};cursor:pointer;font-size:13px;font-weight:${p===k?'700':'500'}">${pLabel[k]}</button>`).join('')}
        </div>

        ${alertHtml()}

        <!-- KPI GRID -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px">
          ${kpiCard('💵','Revenue',''+fmt(totalRev),'Vendite incassate','#22c55e')}
          ${kpiCard('📦','Costo Materiali',''+fmt(totalCostMat),'Da tutte le vendite','#f97316')}
          ${kpiCard('🏗','Costi Fissi',''+fmt(totalFixed),`${periodMonths[p]} mese/i × €${monthlyFixed.toFixed(0)}/m`,'#a855f7')}
          ${kpiCard('🏆','Profitto Netto',''+fmt(netProfit),`Margine: ${marginPct.toFixed(0)}%`,netProfit>=0?'#22c55e':'#ef4444')}
          ${eurPerHour ? kpiCard('⏱','€ per Ora','€'+eurPerHour.toFixed(2),'Basato su timer ordini',eurPerHour>=15?'#22c55e':eurPerHour>=8?'#f59e0b':'#ef4444') : ''}
        </div>

        ${products.length === 0 ? `<div style="text-align:center;padding:40px;color:var(--text-muted);background:var(--bg-card);border-radius:12px;border:1px solid var(--border)"><div style="font-size:40px;margin-bottom:12px">📊</div>Nessuna vendita registrata nel periodo selezionato.<br>Aggiungi vendite in <button onclick="App.navigate('sales')" style="background:none;border:none;color:#22c55e;cursor:pointer;font-weight:700">Vendite & Fatture →</button></div>` : `
        <!-- PRODUCT TABLE -->
        <div style="background:var(--bg-card);border-radius:12px;border:1px solid var(--border);overflow:hidden">
          <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
            <div style="font-weight:700;color:var(--text);font-size:14px">📦 Prodotti per Redditività</div>
            <div style="font-size:11px;color:var(--text-muted)">Ordinati per profitto lordo</div>
          </div>
          <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:var(--bg-card2)">
                <th style="padding:10px 12px;text-align:left;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">#</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Prodotto</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Revenue</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Costi Mat.</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Margine</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Qty</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">€/Ora</th>
              </tr>
            </thead>
            <tbody>${products.map((pr,i) => prodRow(pr, i)).join('')}</tbody>
          </table>
          </div>
          <!-- INSIGHT FOOTER -->
          ${products.length >= 2 ? (() => {
            const best = products[0];
            const worst = products[products.length-1];
            const bestM = best.revenue>0?(best.revenue-best.cost)/best.revenue*100:0;
            const worstM = worst.revenue>0?(worst.revenue-worst.cost)/worst.revenue*100:0;
            return `<div style="padding:14px 20px;background:var(--bg-card2);border-top:1px solid var(--border);display:flex;gap:20px;flex-wrap:wrap">
              <div style="font-size:12px;color:#22c55e"><strong>🏆 Top:</strong> ${best.name} (${bestM.toFixed(0)}% margine)</div>
              <div style="font-size:12px;color:#ef4444"><strong>⚠️ Da rivedere:</strong> ${worst.name} (${worstM.toFixed(0)}% margine)</div>
              <div style="font-size:12px;color:var(--text-muted)">Concentra le energie sui top 3 → producono il miglior ROI del tuo tempo.</div>
            </div>`;
          })() : ''}
        </div>`}

        <!-- HOURS BREAKDOWN if no timer data -->
        ${!totalMinutes ? `<div style="background:#6366f115;border:1px solid #6366f130;border-radius:10px;padding:14px 18px;margin-top:16px;font-size:13px;color:#a5b4fc">
          💡 <strong>Attiva il timer ordini</strong> per vedere il tuo guadagno reale per ora. Vai in un ordine Kanban e usa il timer di produzione.
        </div>` : ''}
      `;
    } catch(e) {
      el.innerHTML = `<div style="color:#ef4444;padding:24px">Errore: ${e.message}</div>`;
    }
  }
};


// ═══════════════════════════════════════════════════════════════════
// FISCAL RADAR — Monitor Regime Forfettario + OSS Etsy
// ═══════════════════════════════════════════════════════════════════
const FiscalRadar = {

  SOGLIA_FORFETTARIO: 85000,
  SOGLIA_OSS: 10000,

  async render() {
    const el = eid('view-fiscal');
    if (!el) return;
    el.innerHTML = `<div style="padding:20px;max-width:1000px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <h2 style="color:#f97316;margin:0;font-size:22px">📊 Radar Fiscale</h2>
        <span style="font-size:11px;background:#f9731615;color:#f97316;padding:3px 10px;border-radius:99px;border:1px solid #f9731630;font-weight:700">REGIME FORFETTARIO</span>
      </div>
      <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px">Tieni sotto controllo i limiti del forfettario — sappi prima quando rischi di superarli</p>
      <div id="fr-content"><div style="text-align:center;padding:40px"><div style="width:40px;height:40px;border:3px solid var(--border);border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 12px"></div></div></div>
    </div>`;
    await this._load();
  },

  async _load() {
    const el = eid('fr-content');
    if (!el) return;
    try {
      const sales = await AppStore.get('sales');
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);

      // Only "pagato" sales count as incasso for forfettario
      const yearSales = sales.filter(s => s.status === 'pagato' && new Date(s.date||0) >= yearStart);
      const totalIncasso = yearSales.reduce((a,s) => a+(+s.amount||0), 0);

      // EU sales (for OSS threshold) — try to identify by client country field
      const euSales = yearSales.filter(s => {
        const country = (s.country||s.clientCountry||'').toLowerCase();
        return country && country !== 'it' && country !== 'italia' && country !== 'italy';
      });
      const totalEU = euSales.reduce((a,s) => a+(+s.amount||0), 0);

      // Projection: days elapsed this year
      const dayOfYear = Math.floor((now - yearStart) / (1000*60*60*24));
      const daysInYear = now.getFullYear() % 4 === 0 ? 366 : 365;
      const dailyRate = dayOfYear > 0 ? totalIncasso / dayOfYear : 0;
      const projected = dailyRate * daysInYear;

      // Days to limit
      const remaining = this.SOGLIA_FORFETTARIO - totalIncasso;
      const daysToLimit = dailyRate > 0 ? Math.floor(remaining / dailyRate) : null;
      const limitDate = daysToLimit !== null ? new Date(now.getTime() + daysToLimit*24*3600*1000) : null;

      // Forfettario %
      const pctForf = Math.min(100, (totalIncasso/this.SOGLIA_FORFETTARIO)*100);
      const pctOSS = Math.min(100, (totalEU/this.SOGLIA_OSS)*100);

      // Tax estimate (forfettario: imponibile 67% × aliquota 15% or 5% new biz)
      const cfg = await IDB.get('settings','main').catch(()=>({})) || {};
      const aliquota = cfg.forfettAliquota || 15;
      const imponibile = totalIncasso * 0.67;
      const imposte = imponibile * (aliquota/100);
      const inps = totalIncasso * 0.2664; // INPS artigiani 26.64%
      const inpsRidotto = inps * 0.65; // riduzione 35% per nuovi under 35 or prima iscrizione
      const nettoStimato = totalIncasso - imposte - inpsRidotto;

      const pctColor = pctForf >= 90 ? '#ef4444' : pctForf >= 70 ? '#f59e0b' : '#22c55e';
      const fmt = v => `€${Math.round(v).toLocaleString('it-IT')}`;

      // Month-by-month chart data
      const byMonth = {};
      for (let m=0; m<now.getMonth()+1; m++) byMonth[m] = 0;
      yearSales.forEach(s => {
        const m = new Date(s.date||0).getMonth();
        if (m >= 0) byMonth[m] = (byMonth[m]||0)+(+s.amount||0);
      });
      const monthNames = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
      const maxMonth = Math.max(...Object.values(byMonth), 1);

      el.innerHTML = `
        <!-- ALERT BANNER -->
        ${pctForf >= 90 ? `<div style="background:#ef444425;border:2px solid #ef4444;border-radius:12px;padding:16px 20px;display:flex;gap:14px;align-items:center;margin-bottom:20px">
          <span style="font-size:32px">🚨</span>
          <div>
            <div style="color:#ef4444;font-weight:800;font-size:15px">ATTENZIONE — Sei al ${pctForf.toFixed(0)}% del limite forfettario</div>
            <div style="color:#fca5a5;font-size:13px;margin-top:4px">${limitDate?`Proiezione superamento: <strong>${limitDate.toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})}</strong>. Parla SUBITO con il tuo commercialista.`:'Consulta il tuo commercialista immediatamente.'}</div>
          </div>
        </div>` : pctForf >= 70 ? `<div style="background:#f59e0b20;border:1.5px solid #f59e0b;border-radius:12px;padding:14px 18px;display:flex;gap:12px;align-items:center;margin-bottom:20px">
          <span style="font-size:28px">⚠️</span>
          <div>
            <div style="color:#f59e0b;font-weight:700;font-size:14px">Sei al ${pctForf.toFixed(0)}% — inizia a monitorare con attenzione</div>
            <div style="color:#fde68a;font-size:12px;margin-top:3px">${limitDate?`Proiezione: supereresti il limite il ${limitDate.toLocaleDateString('it-IT',{day:'numeric',month:'long'})}. Prepara documentazione.`:'Mantieni traccia precisa di ogni incasso.'}</div>
          </div>
        </div>` : `<div style="background:#22c55e15;border:1px solid #22c55e30;border-radius:12px;padding:14px 18px;display:flex;gap:12px;align-items:center;margin-bottom:20px">
          <span style="font-size:28px">✅</span>
          <div style="color:#86efac;font-size:13px">Sei al ${pctForf.toFixed(0)}% — sei nella zona sicura. ${projected > 0 ? `Proiezione fine anno: ${fmt(projected)}.` : ''}</div>
        </div>`}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">

          <!-- SOGLIA FORFETTARIO -->
          <div style="background:var(--bg-card);border-radius:14px;padding:22px;border:1px solid var(--border)">
            <div style="font-weight:700;color:#f97316;font-size:14px;margin-bottom:16px">🏛 Soglia Forfettario 2024</div>
            <div style="display:flex;justify-content:space-between;margin-bottom:10px">
              <div>
                <div style="font-size:28px;font-weight:800;color:${pctColor}">${fmt(totalIncasso)}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px">incassato ${now.getFullYear()}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:20px;font-weight:700;color:var(--text-muted)">${fmt(this.SOGLIA_FORFETTARIO)}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px">limite massimo</div>
              </div>
            </div>

            <!-- Progress bar -->
            <div style="background:var(--border);border-radius:99px;height:14px;margin-bottom:10px;overflow:hidden;position:relative">
              <div style="height:14px;border-radius:99px;background:${pctColor};width:${pctForf}%;transition:width .5s;position:relative">
                <div style="position:absolute;right:6px;top:0;height:14px;display:flex;align-items:center;font-size:9px;font-weight:700;color:#fff">${pctForf.toFixed(0)}%</div>
              </div>
              <!-- 70% marker -->
              <div style="position:absolute;left:70%;top:-4px;width:2px;height:22px;background:#f59e0b40"></div>
              <!-- 90% marker -->
              <div style="position:absolute;left:90%;top:-4px;width:2px;height:22px;background:#ef444460"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted)">
              <span>Rimangono: <strong style="color:${pctColor}">${fmt(Math.max(0,remaining))}</strong></span>
              <span>${pctForf.toFixed(1)}% utilizzato</span>
            </div>

            ${limitDate && remaining > 0 ? `<div style="margin-top:14px;padding:12px;background:${pctForf>=90?'#ef444420':'#f59e0b15'};border-radius:9px;font-size:12px">
              <div style="color:var(--text);font-weight:600;margin-bottom:4px">📅 Proiezione al ritmo attuale</div>
              <div style="color:var(--text-muted)">Rate: ${fmt(dailyRate)}/giorno · ${fmt(dailyRate*30)}/mese</div>
              <div style="color:${pctForf>=90?'#fca5a5':'#fde68a'};font-weight:700;margin-top:4px">${remaining>0?`Limite stimato: ${limitDate.toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})}`:'⚠️ Limite già superato!'}</div>
            </div>` : ''}
          </div>

          <!-- STIMA FISCALE -->
          <div style="background:var(--bg-card);border-radius:14px;padding:22px;border:1px solid var(--border)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
              <div style="font-weight:700;color:#a855f7;font-size:14px">🧾 Stima Tasse ${now.getFullYear()}</div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:11px;color:var(--text-muted)">Aliquota:</span>
                <select onchange="if(typeof FiscalRadar!==typeof undefined)FiscalRadar._saveAliq(this.value)" style="padding:4px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;cursor:pointer">
                  <option value="5" ${aliquota==5?'selected':''}>5% (nuovi regime)</option>
                  <option value="15" ${aliquota==15?'selected':''}>15% (standard)</option>
                </select>
              </div>
            </div>
            ${[
              ['💰 Incasso lordo', fmt(totalIncasso), '#22c55e'],
              ['📊 Imponibile (67%)', fmt(imponibile), '#a5b4fc'],
              [`💸 Imposte (${aliquota}%)`, `− ${fmt(imposte)}`, '#ef4444'],
              ['🏗 INPS stimato (ridotto)', `− ${fmt(inpsRidotto)}`, '#f97316'],
              ['✅ Netto stimato', fmt(nettoStimato), nettoStimato>0?'#22c55e':'#ef4444'],
            ].map(([l,v,c]) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:13px;color:var(--text-muted)">${l}</span>
              <span style="font-size:14px;font-weight:700;color:${c}">${v}</span>
            </div>`).join('')}
            <div style="margin-top:12px;font-size:11px;color:var(--text-muted);line-height:1.6">⚠️ Stima indicativa. INPS artigiani: 26.64% su reddito imponibile con riduzione 35%. Consulta sempre il tuo commercialista.</div>
          </div>
        </div>

        <!-- OSS / ETSY EU -->
        <div style="background:var(--bg-card);border-radius:14px;padding:20px;border:1px solid var(--border);margin-bottom:20px">
          <div style="font-weight:700;color:#06b6d4;font-size:14px;margin-bottom:12px">🇪🇺 Soglia OSS — Vendite EU (Etsy Estero)</div>
          <div style="display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center">
            <div>
              <div style="background:var(--border);border-radius:99px;height:10px;margin-bottom:8px;overflow:hidden">
                <div style="height:10px;border-radius:99px;background:${pctOSS>=80?'#ef4444':pctOSS>=50?'#f59e0b':'#06b6d4'};width:${pctOSS}%"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted)">
                <span>Vendite EU identificate: <strong style="color:#06b6d4">${fmt(totalEU)}</strong></span>
                <span>Soglia OSS: ${fmt(this.SOGLIA_OSS)}</span>
              </div>
            </div>
            <div style="text-align:center;padding:12px 20px;background:${pctOSS>=100?'#ef444420':'#06b6d415'};border-radius:10px;border:1px solid ${pctOSS>=100?'#ef4444':'#06b6d430'}">
              <div style="font-size:22px;font-weight:800;color:${pctOSS>=100?'#ef4444':'#06b6d4'}">${pctOSS.toFixed(0)}%</div>
              <div style="font-size:10px;color:var(--text-muted)">${pctOSS>=100?'REGISTRA OSS':'sotto soglia'}</div>
            </div>
          </div>
          <div style="margin-top:12px;font-size:12px;color:var(--text-muted);line-height:1.6">
            ${pctOSS>=100?'<strong style="color:#ef4444">⚠️ Hai superato €10.000 di vendite EU!</strong> Devi registrarti al regime OSS e applicare IVA del paese del cliente. Consulta il commercialista.' : totalEU<100?'Aggiungi il paese del cliente nelle vendite per tracciare la soglia OSS automaticamente.':'Sotto la soglia OSS. Monitoraggio attivo. Etsy gestisce già l\'IVA marketplace per te in molti paesi UE.'}
          </div>
        </div>

        <!-- MONTHLY CHART -->
        <div style="background:var(--bg-card);border-radius:14px;padding:20px;border:1px solid var(--border)">
          <div style="font-weight:700;color:var(--text);font-size:14px;margin-bottom:16px">📈 Incassi Mensili ${now.getFullYear()}</div>
          <div style="display:flex;align-items:flex-end;gap:8px;height:100px">
            ${Object.entries(byMonth).map(([m,v]) => {
              const h = Math.round((v/maxMonth)*90);
              const isCur = parseInt(m) === now.getMonth();
              return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
                <div style="font-size:9px;color:#22c55e;font-weight:700">${v>0?fmt(v):''}</div>
           await IDB.put('settings', cfg).catch(()=>{});ght:${h}px;background:${isCur?'#f97316':'#22c55e40'};border-radius:4px 4px 0 0;min-height:3px;transition:height .3s"></div>
                <div style="font-size:9px;color:var(--text-muted)">${monthNames[m]}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
    } catch(e) {
      el.innerHTML = `<div style="color:#ef4444;padding:24px">Errore: ${e.message}</div>`;
    }
  },

  async _exportAccountant() { await this.exportCSV?.() || toast('Export già disponibile con "Export CSV"','info'); },
  async _exportPaid() {
    const sales = await AppStore.get('sales').catch(()=>[]);
    const paid = sales.filter(s=>s.status==='pagato');
    if(!paid.length){toast('Nessuna vendita pagata','info');return;}
    const csv='Data,Cliente,Descrizione,Importo\n'+paid.map(s=>`"${s.date||''}","${s.clientName||''}","${s.description||s.desc||''}",${+s.amount||0}`).join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    const a=document.createElement('a');a.href=url;a.download=`vendite-pagate-${new Date().toISOString().slice(0,7)}.csv`;a.click();URL.revokeObjectURL(url);
    toast('Export vendite pagate scaricato!','success');
  },

  async _saveAliq(v) {
    try {
      const cfg = await IDB.get('settings','main') || {};
      cfg.key = 'main';
      cfg.forfettAliquota = parseInt(v);
      await IDB.put('settings', cfg);
      await this._load();
    } catch(_){}
  }
};


// ═══════════════════════════════════════════════════════════════════
// ETSY AI + SOCIAL — Ottimizza listing Etsy + genera social in 1 click
// ═══════════════════════════════════════════════════════════════════
const FinancialForecaster = {
  async render() {
    await BDW.init();
    const el = eid('ff-root'); if(!el) return;
    const m=BDW.metrics; const rev=m.revenue; const fin=m.finance;

    el.innerHTML=`
      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
        ${[
          {v:fmtCur(rev.forecast[0]),l:'Forecast +1 mese',c:'#38bdf8'},
          {v:fmtCur(rev.forecast[1]),l:'Forecast +2 mesi',c:'#6366f1'},
          {v:fmtCur(rev.forecast[2]),l:'Forecast +3 mesi',c:'#a855f7'},
          {v:fin.cashRunway+'m',     l:'Cash Runway',     c:fin.cashRunway>3?'#22c55e':'#ef4444'},
        ].map(k=>`<div class="card" style="text-align:center;border-top:3px solid ${k.c}">
          <div style="font-size:20px;font-weight:900;color:${k.c}">${k.v}</div>
          <div style="font-size:10px;font-weight:700;margin-top:4px">${k.l}</div>
        </div>`).join('')}
      </div>

      <!-- What-If Simulator -->
      <div class="card" style="margin-bottom:14px">
        <div class="card-title">🔮 Simulatore What-If</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div>
            <label class="form-label">Variazione Revenue mensile %</label>
            <input id="wif-rev" type="range" min="-50" max="100" value="0" oninput="FinancialForecaster.updateWhatIf()" style="width:100%">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted)"><span>-50%</span><span id="wif-rev-val" style="color:var(--primary);font-weight:700">0%</span><span>+100%</span></div>
          </div>
          <div>
            <label class="form-label">Nuovi costi fissi mensili €</label>
            <input id="wif-cost" type="number" class="form-control" value="0" placeholder="es. 500 (nuova macchina)" oninput="FinancialForecaster.updateWhatIf()">
          </div>
        </div>
        <div id="wif-result" style="background:var(--bg-card2);border-radius:8px;padding:14px;font-size:12px;line-height:1.8"></div>
      </div>

      <!-- Breakeven analysis -->
      <div class="card" style="margin-bottom:14px">
        <div class="card-title">💰 Analisi Breakeven</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
          <div style="text-align:center;padding:12px;background:var(--bg-card2);border-radius:8px">
            <div style="font-size:18px;font-weight:900;color:#f59e0b">${fmtCur(fin.breakEven)}</div>
            <div style="font-size:10px;color:var(--text-muted)">Breakeven mensile</div>
          </div>
          <div style="text-align:center;padding:12px;background:var(--bg-card2);border-radius:8px">
            <div style="font-size:18px;font-weight:900;color:${rev.mtd>=fin.breakEven?'#22c55e':'#ef4444'}">${fmtCur(rev.mtd)}</div>
            <div style="font-size:10px;color:var(--text-muted)">Revenue attuale MTD</div>
          </div>
          <div style="text-align:center;padding:12px;background:var(--bg-card2);border-radius:8px">
            <div style="font-size:18px;font-weight:900;color:${rev.mtd>=fin.breakEven?'#22c55e':'#ef4444'}">${rev.mtd>=fin.breakEven?'+'+fmtCur(rev.mtd-fin.breakEven):fmtCur(fin.breakEven-rev.mtd)+' mancanti'}</div>
            <div style="font-size:10px;color:var(--text-muted)">${rev.mtd>=fin.breakEven?'Sopra breakeven ✅':'Sotto breakeven ⚠️'}</div>
          </div>
        </div>
        <!-- Progress bar -->
        <div style="margin-top:12px">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:4px">
            <span>0</span><span>Breakeven ${fmtCur(fin.breakEven)}</span>
          </div>
          <div style="height:10px;background:var(--border);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${Math.min(100,(rev.mtd/Math.max(fin.breakEven,1))*100)}%;background:${rev.mtd>=fin.breakEven?'linear-gradient(90deg,#22c55e,#16a34a)':'linear-gradient(90deg,#ef4444,#f59e0b)'};border-radius:99px;transition:width .8s"></div>
          </div>
        </div>
      </div>

      <!-- AI Forecast -->
      <button onclick="FinancialForecaster.runAI()" class="btn btn-primary w-full" style="margin-bottom:14px"><i class="fas fa-brain"></i> AI Analisi Finanziaria Approfondita</button>
      <div id="ff-ai-result"></div>
    `;
    this.updateWhatIf();
  },

  updateWhatIf() {
    const rev=BDW.metrics?.revenue; const fin=BDW.metrics?.finance;
    if(!rev||!fin) return;
    const revChg=parseInt(eid('wif-rev')?.value)||0;
    const extraCost=parseFloat(eid('wif-cost')?.value)||0;
    const wifRevVal=eid('wif-rev-val');
    if(wifRevVal) wifRevVal.textContent=(revChg>=0?'+':'')+revChg+'%';
    const simRev=rev.mtd*(1+revChg/100);
    const simCosts=fin.mCosts+extraCost;
    const simProfit=simRev-simCosts;
    const simMargin=simRev>0?(simProfit/simRev)*100:0;
    const el=eid('wif-result');
    if(!el) return;
    const col=simProfit>=0?'#22c55e':'#ef4444';
    el.innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center">
        <div><div style="font-size:16px;font-weight:900;color:#38bdf8">${fmtCur(simRev)}</div><div style="font-size:10px;color:var(--text-muted)">Revenue simulata</div></div>
        <div><div style="font-size:16px;font-weight:900;color:#f59e0b">${fmtCur(simCosts)}</div><div style="font-size:10px;color:var(--text-muted)">Costi simulati</div></div>
        <div><div style="font-size:16px;font-weight:900;color:${col}">${fmtCur(simProfit)}</div><div style="font-size:10px;color:var(--text-muted)">Profitto simulato (${simMargin.toFixed(1)}%)</div></div>
      </div>
      <div style="margin-top:10px;padding:8px;background:${col}10;border-radius:6px;font-size:11px;color:${col};font-weight:600;text-align:center">
        ${simProfit>=0?`✅ Scenario positivo — profitto ${fmtCur(simProfit)} con margine ${simMargin.toFixed(1)}%`:`⚠️ Scenario in perdita — richiede azioni immediate`}
      </div>`;
  },

  async runAI() {
    const el=eid('ff-ai-result'); if(!el) return;
    await BDW.init(); const m=BDW.metrics;
    el.innerHTML=`<div class="card"><div style="text-align:center;padding:20px;color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> AI analisi finanziaria...</div></div>`;
    const prompt=`CFO advisor per artigiano laser italiano.
Revenue MTD: €${m.revenue.mtd.toFixed(0)} | Forecast: €${m.revenue.forecast.join(', €')}
Margine netto: ${m.finance.netMarginPct.toFixed(1)}% | Breakeven: €${m.finance.breakEven.toFixed(0)}
Cash balance: €${m.finance.cashBalance.toFixed(0)} | Cash runway: ${m.finance.cashRunway} mesi
Riserva fiscale da accantonare: €${m.finance.taxReserve.toFixed(0)}
Trend slope: €${m.revenue.slope.toFixed(0)}/mese

Analisi in 4 punti:
1. 🏦 Salute finanziaria attuale (1 riga)
2. 📊 Previsione cash flow 3 mesi
3. ⚠️ Rischio principale da monitorare
4. 💡 1 azione per migliorare la liquidità

In italiano, max 150 parole, concreto.`;
    try{
      const r=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:350,messages:[{role:'user',content:prompt}]})
      });
      const data=await r.json();
      const text=data.content?.find(b=>b.type==='text')?.text||'—';
      el.innerHTML=`<div class="card" style="border:1px solid #38bdf840;background:#38bdf808">
        <div style="font-size:11px;color:#38bdf8;font-weight:700;margin-bottom:8px">📊 AI Financial Analyst Brief</div>
        <div style="font-size:12px;line-height:1.7;white-space:pre-line">${text}</div>
      </div>`;
    }catch(e){el.innerHTML=`<div class="card" style="color:#ef4444;font-size:11px;padding:12px">AI non disponibile</div>`;}
  },
};

// ── PRODUCTION OPTIMIZER ─────────────────────────────────────────────────────
const TaxCalendar = {
  // Standard forfettario scadenze italiane
  _getBaseEvents(year, incasso, projected) {
    const soglia = 85000;
    const over = projected > soglia;
    const aliq = 0.15; // standard
    const imponibile = incasso * 0.67;
    const taxEstimate = imponibile * aliq;
    const inps = incasso * 0.2664;
    const fmt = v => `€${Math.round(v).toLocaleString('it-IT')}`;

    return [
      // Q1
      { month: 2, day: 28, type:'inps', title:'INPS Artigiani — I Acconto', amount: inps*0.5*0.4, notes:'Prima rata acconto INPS', status:'pending' },
      // Q2
      { month: 5, day: 16, type:'irpef', title:'Saldo IRPEF anno precedente', amount: taxEstimate, notes:'Saldo imposte anno precedente', status:'pending' },
      { month: 5, day: 16, type:'irpef', title:'I Acconto IRPEF', amount: taxEstimate*0.4, notes:'Primo acconto anno corrente (40%)', status:'pending' },
      { month: 5, day: 16, type:'inps', title:'INPS — Saldo anno precedente', amount: inps*0.4, notes:'Saldo contributi anno precedente', status:'pending' },
      // Q3
      { month: 7, day: 31, type:'inps', title:'INPS Artigiani — II Acconto', amount: inps*0.5*0.4, notes:'Seconda rata acconto INPS', status:'pending' },
      // Q4
      { month: 10, day: 30, type:'irpef', title:'II Acconto IRPEF', amount: taxEstimate*0.6, notes:'Secondo acconto anno corrente (60%)', status:'pending' },
      { month: 10, day: 30, type:'inps', title:'INPS — III Acconto', amount: inps*0.5*0.2, notes:'Terza rata acconto INPS', status:'pending' },
      // Dichiarazione
      { month: 9, day: 30, type:'dichiarazione', title:'Dichiarazione dei Redditi (Mod. 730)', amount: 0, notes:'Termine presentazione dichiarazione', status:'pending' },
      { month: 11, day: 20, type:'inps', title:'INPS — IV Acconto', amount: inps*0.5*0.4, notes:'Quarta rata acconto INPS', status:'pending' },
    ].map(e => ({ ...e, year, date: new Date(year, e.month, e.day) }));
  },

  async render() {
    const el = document.getElementById('view-taxcalendar');
    if (!el) return;
    el.innerHTML = `<div style="padding:20px;max-width:900px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <h2 style="color:#fbbf24;margin:0;font-size:22px">📅 Calendario Fiscale</h2>
        <span style="font-size:11px;background:#fbbf2418;color:#fbbf24;padding:3px 10px;border-radius:99px;border:1px solid #fbbf2430;font-weight:700">FORFETTARIO</span>
      </div>
      <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px">Scadenze fiscali, proiezioni IRPEF/INPS, alert automatici basati sul tuo incasso reale</p>
      <div id="tc-content"><div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto 12px"></div></div></div>
    </div>`;
    await this._load();
  },

  async _load() {
    const el = document.getElementById('tc-content');
    if (!el) return;
    try {
      const sales = await AppStore.get('sales');
      const taxEventsDB = await IDB.getAll('tax_events').catch(()=>[]);
      const now = new Date();
      const year = now.getFullYear();
      const yearStart = new Date(year, 0, 1);

      // Incasso YTD (forfettario = incassato)
      const yearSales = sales.filter(s => s.status === 'pagato' && new Date(s.date||0) >= yearStart);
      const incassoYTD = yearSales.reduce((a,s)=>a+(+s.amount||0), 0);

      // Projection
      const dayOfYear = Math.floor((now - yearStart) / (1000*60*60*24));
      const dailyRate = dayOfYear > 0 ? incassoYTD / dayOfYear : 0;
      const daysInYear = year % 4 === 0 ? 366 : 365;
      const projected = dailyRate * daysInYear;

      const baseEvents = this._getBaseEvents(year, projected, projected);
      const fmt = v => v > 0 ? `€${Math.round(v).toLocaleString('it-IT')}` : '—';

      // Merge with user-saved overrides
      const events = baseEvents.map(e => {
        const saved = taxEventsDB.find(t => t.month === e.month && t.day === e.day && t.year === year);
        return saved ? { ...e, ...saved } : e;
      }).sort((a,b) => a.date - b.date);

      // Group by quarter
      const quarters = [
        { label: 'Q1 — Gennaio / Marzo', events: events.filter(e => e.month < 3) },
        { label: 'Q2 — Aprile / Giugno', events: events.filter(e => e.month >= 3 && e.month < 6) },
        { label: 'Q3 — Luglio / Settembre', events: events.filter(e => e.month >= 6 && e.month < 9) },
        { label: 'Q4 — Ottobre / Dicembre', events: events.filter(e => e.month >= 9) },
      ];

      // Next upcoming event
      const nextEvent = events.find(e => e.date >= now && e.status !== 'paid');
      const daysToNext = nextEvent ? Math.round((nextEvent.date - now) / (1000*60*60*24)) : null;

      // Total tax estimate
      const totalTax = events.filter(e=>e.type==='irpef'||e.type==='inps').reduce((a,e)=>a+(+e.amount||0),0);

      // Fiscal year progress
      const pctForf = Math.min(100, incassoYTD / 85000 * 100);
      const pctColor = pctForf >= 90 ? '#ef4444' : pctForf >= 70 ? '#f59e0b' : '#22c55e';

      el.innerHTML = `
        <!-- Header stats -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:24px">
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
            <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Incasso YTD</div>
            <div style="font-size:22px;font-weight:800;color:${pctColor}">${fmt(incassoYTD)}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${pctForf.toFixed(0)}% del limite forfettario</div>
          </div>
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px">
            <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Proiezione Annua</div>
            <div style="font-size:22px;font-weight:800;color:var(--text)">${projected>0?fmt(projected):'—'}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${dailyRate>0?fmt(dailyRate)+'/giorno':' — aggiungi vendite'}</div>
          </div>
          <div style="background:var(--bg-card);border:1px solid #a855f730;border-radius:var(--radius);padding:16px">
            <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Tasse Stimate ${year}</div>
            <div style="font-size:22px;font-weight:800;color:#a855f7">${fmt(totalTax)}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px">IRPEF + INPS combinati</div>
          </div>
          ${nextEvent ? `<div style="background:${daysToNext<30?'#ef444415':'#f59e0b12'};border:1px solid ${daysToNext<30?'#ef444440':'#f59e0b40'};border-radius:var(--radius);padding:16px">
            <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Prossima Scadenza</div>
            <div style="font-size:14px;font-weight:700;color:${daysToNext<30?'#ef4444':'#f59e0b'}">${nextEvent.title.length>28?nextEvent.title.substring(0,28)+'…':nextEvent.title}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${nextEvent.date.toLocaleDateString('it-IT',{day:'numeric',month:'long'})} · tra ${daysToNext} giorni</div>
          </div>` : ''}
        </div>

        <!-- Forfettario progress bar -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-size:13px;font-weight:700;color:var(--text)">🏛 Progressione Limite Forfettario ${year}</div>
            <div style="font-size:13px;font-weight:700;color:${pctColor}">${pctForf.toFixed(1)}%</div>
          </div>
          <div style="height:12px;background:var(--bg-card3);border-radius:99px;overflow:hidden;position:relative;margin-bottom:8px">
            <div style="height:100%;width:${pctForf}%;background:${pctColor};border-radius:99px;transition:width 1s"></div>
            <div style="position:absolute;left:70%;top:0;width:2px;height:100%;background:#f59e0b60"></div>
            <div style="position:absolute;left:90%;top:0;width:2px;height:100%;background:#ef444460"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted)">
            <span>${fmt(incassoYTD)} incassati</span>
            <span style="color:#f59e0b">⚠️ Attenzione a €59.500</span>
            <span style="color:#ef4444">🚨 Limite a €85.000</span>
          </div>
        </div>

        <!-- Events by quarter -->
        ${quarters.map(q => q.events.length === 0 ? '' : `
          <div class="tc-month">
            <div class="tc-month-header">📆 ${q.label}</div>
            ${q.events.map(e => {
              const isPast = e.date < now;
              const daysLeft = Math.round((e.date - now) / (1000*60*60*24));
              const cls = e.status === 'paid' ? 'paid' : isPast ? 'past' : daysLeft <= 30 ? 'urgent' : 'upcoming';
              const icons = { irpef:'💸', inps:'🏦', dichiarazione:'📋', iva:'🔖' };
              const amtColor = { irpef:'#ef4444', inps:'#a855f7', dichiarazione:'var(--text-muted)', iva:'#f97316' };
              return `<div class="tc-event ${cls}" onclick="TaxCalendar._togglePaid(${e.month},${e.day},${year},'${cls}')" style="cursor:pointer">
                <div class="tc-event-icon">${icons[e.type]||'📌'}</div>
                <div class="tc-event-body">
                  <div class="tc-event-title">${e.title}</div>
                  <div class="tc-event-meta">${e.date.toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})} · ${e.notes}</div>
                  ${!isPast && e.status !== 'paid' ? `<div style="font-size:10px;margin-top:3px;color:${daysLeft<=30?'#ef4444':'#f59e0b'}">⏰ ${daysLeft > 0 ? `tra ${daysLeft} giorni` : 'Oggi!'}</div>` : ''}
                </div>
                <div>
                  <div class="tc-event-amount" style="color:${amtColor[e.type]||'var(--text)'}">${e.amount>0?fmt(e.amount):'—'}</div>
                  ${e.status === 'paid' ? '<div style="font-size:10px;color:#22c55e;font-weight:700;margin-top:3px">✓ Pagato</div>' : ''}
                </div>
              </div>`;
            }).join('')}
          </div>
        `).join('')}

        <div style="font-size:11px;color:var(--text-dim);text-align:center;padding:12px">
          ℹ️ Gli importi sono stime basate sul tuo incasso proiettato. Consulta sempre il tuo commercialista per i valori esatti. · Clicca su una scadenza per marcarla come pagata.
        </div>
      `;
    } catch(e) {
      document.getElementById('tc-content').innerHTML = `<div style="color:var(--text-muted);padding:30px;text-align:center">Errore: ${e.message}</div>`;
    }
  },

  async _togglePaid(month, day, year, currentCls) {
    if (currentCls === 'paid') return; // already paid, no toggle back
    try { const id=`te-${month}-${day}-${year}`;
      await IDB.put('cost_entries', {id,month,day,year,type:'tax',amount:0}).catch(()=>{});
      const id2 = `te_${year}_${month}_${day}`;
      await IDB.put('tax_events', { id, month, day, year, status:'paid', paidAt: new Date().toISOString() });
      this._load();
    } catch(e) { console.warn('[TaxCalendar] toggle error', e); }
  },
};

// ═══════════════════════════════════════════════════════
// v67 — SPRINT 3: WEEKLY REPORT
// ═══════════════════════════════════════════════════════
/* ── Non è un motore di costo ──────────────────────────────────────────────
   Il nome mentiva, ed è il tipo di bugia che costa caro in questo progetto:
   qui non si calcola il costo di un preventivo — quello lo fa
   `InglyCostEngine`, e uno solo. Qui si **registrano i costi realmente
   sostenuti** su una commessa e si confronta il margine reale con quello
   preventivato. È il lato «consuntivo» del conto, non un secondo motore.
   Il nome storico resta come alias perché è esposto su `window` e potrebbe
   essere usato da qualcosa di non censito. */
const InglyActualCost = {
  async logCost(orderId, type, amount, desc, minutes=0) {
    const entry = { id: Date.now(), orderId, type, amount: +amount, desc, minutes: +minutes, date: new Date().toISOString() };
    await IDB.put('cost_entries', entry);
    BDW.touch('cost_entries');
    toast(`✅ Costo registrato: ${fmtCur(amount)}`, '💰');
    return entry;
  },

  async getByOrder(orderId) {
    const all = await IDB.getAll('cost_entries').catch(()=>[]);
    return all.filter(e => String(e.orderId) === String(orderId));
  },

  /* ── Il costo reale di un ordine ────────────────────────────────────────
     Questa somma esisteva già, ma viveva dentro il costruttore del cruscotto
     (`BDW`, in settings): una definizione sepolta in un consumatore, che
     nessun'altra parte del programma poteva chiedere. Ordini aveva bisogno
     della stessa risposta e l'avrebbe ricalcolata a modo suo — due definizioni
     di «quanto è costato davvero», che è il modo in cui due schermate finiscono
     per mostrare due numeri diversi sullo stesso lavoro.

     Il proprietario è questo modulo, che la Fase 33 ha dichiarato essere
     l'ACTUAL. Il cruscotto ora la chiede qui.

     Il costo reale ha due sorgenti e non una: le ore registrate (che diventano
     manodopera e macchina ai costi impostati) e le spese annotate. Sommarne una
     sola sarebbe peggio che non sommarne nessuna, perché sembrerebbe completa. */
  _TARIFFE: null,
  async _tariffe() {
    if (this._TARIFFE) return this._TARIFFE;
    const s = await IDB.get('settings', 'main').catch(()=>null) || {};
    this._TARIFFE = {
      manodoperaAlMinuto: parseFloat(s.laborCost) || 0.25,
      macchinaAlMinuto: parseFloat(s.machineCost) || 0.08,
    };
    return this._TARIFFE;
  },

  /** La mappa `chiave → costo reale` per tutti gli ordini in una passata.
      La chiave è l'id dell'ordine, o `q<idPreventivo>` per il lavoro tracciato
      prima che l'ordine esistesse: è la convenzione già in uso, e cambiarla
      qui scollegherebbe i dati storici. */
  async mappaPerOrdine() {
    const [timelogs, costEntries, tariffe] = await Promise.all([
      IDB.getAll('timelogs').catch(()=>[]),
      IDB.getAll('cost_entries').catch(()=>[]),
      this._tariffe(),
    ]);

    const mappa = {};
    const dettaglio = {};
    const aggiungi = (chiave, quanto, tipo) => {
      if (!chiave || !isFinite(quanto)) return;
      mappa[chiave] = (mappa[chiave] || 0) + quanto;
      dettaglio[chiave] = dettaglio[chiave] || { manodopera: 0, macchina: 0, spese: 0, minuti: 0 };
      dettaglio[chiave][tipo] += quanto;
    };

    timelogs.forEach(t => {
      if (!t || (!t.orderId && !t.quoteId)) return;
      const chiave = t.orderId || ('q' + t.quoteId);
      const minuti = (+t.minutes || 0) + (+t.duration || 0) / 60;
      aggiungi(chiave, minuti * tariffe.manodoperaAlMinuto, 'manodopera');
      aggiungi(chiave, minuti * tariffe.macchinaAlMinuto * (+t.machineCount || 1), 'macchina');
      if (dettaglio[chiave]) dettaglio[chiave].minuti += minuti;
    });

    costEntries.forEach(e => {
      if (!e || !e.orderId) return;
      aggiungi(e.orderId, +e.amount || 0, 'spese');
    });

    return { costi: mappa, dettaglio: dettaglio };
  },

  /** Il costo reale di **un** ordine, con le sue voci.
      Se non è stato registrato niente lo dice: «non lo so» e «è costato zero»
      sono due cose diverse, e confonderle è il modo in cui un laboratorio
      resta convinto di guadagnare quanto aveva previsto. */
  async perOrdine(orderId, quoteId) {
    const { costi, dettaglio } = await this.mappaPerOrdine();
    const chiavi = [orderId, quoteId != null ? ('q' + quoteId) : null].filter(Boolean).map(String);
    const presenti = chiavi.filter(k => costi[k] != null);
    if (!presenti.length) {
      return { registrato: false, motivo: 'nessun costo reale registrato su questo ordine' };
    }
    const somma = presenti.reduce((a, k) => a + costi[k], 0);
    const voci = presenti.reduce((a, k) => {
      const d = dettaglio[k] || {};
      return {
        manodopera: a.manodopera + (d.manodopera || 0),
        macchina: a.macchina + (d.macchina || 0),
        spese: a.spese + (d.spese || 0),
        minuti: a.minuti + (d.minuti || 0),
      };
    }, { manodopera: 0, macchina: 0, spese: 0, minuti: 0 });
    return { registrato: true, costo: somma, voci: voci };
  },

  async getRealMarginForSale(sale) {
    await BDW.init();
    const rc = BDW._raw?.realCostByOrder;
    if (!rc) return null;
    const key = sale.orderId || ('q' + sale.quoteId);
    const realCost = rc[key];
    if (!realCost) return null;
    return { realCost, realMargin: sale.amount > 0 ? (sale.amount - realCost) / sale.amount * 100 : 0 };
  },

  async renderWidget(containerId) {
    const el = eid(containerId); if (!el) return;
    await BDW.init();
    const { realMarginAvg, totalLaborCost } = BDW.metrics.finance;
    const enriched = BDW._raw?.enrichedSales || [];
    const withRC = enriched.filter(s => s.realCost != null);
    if (!withRC.length) {
      el.innerHTML = `<div style="padding:16px;background:var(--bg-card2);border-radius:10px;border:1px solid var(--border)">
        <div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px 0">
          <i class="fas fa-info-circle" style="color:#60a5fa"></i> Nessun dato costo reale ancora.
          <br><span style="font-size:11px">Usa il Time Tracker o aggiungi Cost Entries per calcolare margini reali.</span>
        </div></div>`;
      return;
    }
    const semColor = realMarginAvg >= 40 ? '#22c55e' : realMarginAvg >= 20 ? '#f59e0b' : '#ef4444';
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">
        <div style="background:var(--bg-card2);border-radius:10px;padding:14px;border:1px solid var(--border);text-align:center">
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Margine Reale Medio</div>
          <div style="font-size:24px;font-weight:900;color:${semColor}">${realMarginAvg.toFixed(1)}%</div>
        </div>
        <div style="background:var(--bg-card2);border-radius:10px;padding:14px;border:1px solid var(--border);text-align:center">
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Lavori Tracciati</div>
          <div style="font-size:24px;font-weight:900;color:var(--primary)">${withRC.length}</div>
        </div>
        <div style="background:var(--bg-card2);border-radius:10px;padding:14px;border:1px solid var(--border);text-align:center">
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Costo Lavoro Tot.</div>
          <div style="font-size:24px;font-weight:900;color:#f59e0b">${fmtCur(totalLaborCost)}</div>
        </div>
      </div>
      <div style="background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);overflow:hidden">
        <div style="padding:10px 14px;background:var(--bg-card);border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Top lavori tracciati</div>
        ${withRC.slice(0,6).map(s=>{
          const mc = s.realMargin>=40?'#22c55e':s.realMargin>=20?'#f59e0b':'#ef4444';
          return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--border)">
            <div style="flex:1;font-size:12px;color:var(--text)">${s.description||s.productName||'—'}</div>
            <div style="font-size:12px;color:#fbbf24;font-weight:600">${fmtCur(s.realCost)}</div>
            <div style="font-size:12px;font-weight:800;color:${mc}">${s.realMargin.toFixed(1)}%</div>
          </div>`;
        }).join('')}
      </div>`;
  }
};

// ════════════════════════════════════════════════════════════════════════
// 💳 PAYMENT WIZARD v73
// Guided setup for Stripe and PayPal from the Quoter AZIONI bar
// ════════════════════════════════════════════════════════════════════════
const PaymentWizard = {
  _amount() {
    return Quoter.lines?.reduce((a,l)=>a+(l.subtotal*(1+(parseFloat(eid('qr-markup')?.value||100)/100))*(1-(parseFloat(eid('qr-discount')?.value||0)/100))),0)||0;
  },
  _name() { return eid('q-name')?.value||'Ordine Ingly'; },

  stripe() {
    const hasKey = !!(CloudSync.apiKey);
    if (hasKey) {
      // Already configured → proceed
      const amt = this._amount();
      if (!amt) { toast('Aggiungi almeno una voce al preventivo', 'warning'); return; }
      CloudSync.createStripeLink(Quoter._lastSavedId||0, amt, this._name(), '')
        .then(u=>{ if(u) window.open(u,'_blank'); })
        .catch(e=>toast('Stripe: '+e.message,'warning'));
      return;
    }
    // Wizard
    this._showWizard('stripe');
  },

  paypal() {
    const amt = this._amount();
    if (!amt) { toast('Aggiungi almeno una voce al preventivo', 'warning'); return; }
    this._showWizard('paypal', amt);
  },

  _showWizard(type, amt=0) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.innerHTML = type === 'stripe' ? `
      <div style="background:var(--bg-card);border:1px solid var(--border2);border-radius:16px;width:520px;max-width:96vw">
        <div style="padding:22px 24px 16px;border-bottom:1px solid var(--border)">
          <div style="font-size:17px;font-weight:800;color:#fff;display:flex;align-items:center;gap:10px">
            <span style="background:linear-gradient(135deg,#635bff,#0073e6);border-radius:8px;padding:6px 12px;font-size:13px">💳 Stripe</span>
            Setup rapido pagamenti
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:6px">Ricevi pagamenti direttamente dai preventivi. Configura una volta, usa sempre.</div>
        </div>
        <div style="padding:22px 24px">
          <div style="margin-bottom:16px">
            <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:6px">1. Stripe Secret Key (inizia con sk_live_ o sk_test_)</label>
            <input id="pwiz-sk" type="password" class="form-control" placeholder="sk_live_..." style="font-family:monospace">
          </div>
          <div style="background:#1e3a5f20;border:1px solid #3b82f640;border-radius:10px;padding:14px;margin-bottom:18px">
            <div style="font-size:11px;color:#60a5fa;font-weight:700;margin-bottom:6px">📋 Come ottenere la chiave Stripe:</div>
            <div style="font-size:11px;color:#94a3b8;line-height:1.6">
              1. Vai su <a href="https://dashboard.stripe.com/apikeys" target="_blank" style="color:#60a5fa">dashboard.stripe.com/apikeys</a><br>
              2. Copia la <strong style="color:#fff">Secret key</strong><br>
              3. Incollala qui sopra → potrai generare link pagamento direttamente dai preventivi
            </div>
          </div>
          <div style="display:flex;gap:10px">
            <button onclick="this.closest('[style*=fixed]').remove()" style="flex:1;padding:11px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text-muted);border-radius:8px;cursor:pointer">Annulla</button>
            <button onclick="PaymentWizard._saveStripe(eid('pwiz-sk').value,this)" style="flex:2;padding:11px;background:linear-gradient(135deg,#635bff,#0073e6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700">💳 Salva e genera link</button>
          </div>
          <div style="margin-top:12px;padding:10px;background:var(--bg-card2);border-radius:8px;border:1px solid var(--border)">
            <div style="font-size:11px;color:var(--text-muted);font-weight:700;margin-bottom:4px">🔗 Oppure: Link pagamento manuale PayPal.me / Satispay</div>
            <input id="pwiz-manual" type="url" class="form-control" placeholder="https://paypal.me/tuonome/..." style="font-size:12px;margin-bottom:8px">
            <button onclick="const u=eid('pwiz-manual').value;if(u){window.open(u,'_blank');this.closest('[style*=fixed]').remove();}" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);color:var(--text);border-radius:6px;cursor:pointer;font-size:12px">🔗 Apri link manuale</button>
          </div>
        </div>
      </div>` : `
      <div style="background:var(--bg-card);border:1px solid var(--border2);border-radius:16px;width:480px;max-width:96vw">
        <div style="padding:22px 24px 16px;border-bottom:1px solid var(--border)">
          <div style="font-size:17px;font-weight:800;color:#fff;display:flex;align-items:center;gap:10px">
            <span style="background:#003087;border-radius:8px;padding:6px 12px;font-size:13px;color:#ffc439">🅿️ PayPal</span>
            Link pagamento
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:6px">Genera un link PayPal.me per ${fmtCur(amt)}</div>
        </div>
        <div style="padding:22px 24px">
          <div style="margin-bottom:14px">
            <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:6px">Il tuo username PayPal.me</label>
            <div style="display:flex;gap:8px;align-items:center">
              <span style="font-size:13px;color:var(--text-muted);white-space:nowrap">paypal.me/</span>
              <input id="pwiz-pp" type="text" class="form-control" placeholder="tuonome" value="${localStorage.getItem('ingly_paypal_user')||''}">
            </div>
          </div>
          <div style="background:#003087'10;border:1px solid #003087'30;border-radius:10px;padding:12px;margin-bottom:16px;font-size:11px;color:#94a3b8;line-height:1.6">
            Il cliente riceverà un link diretto al tuo profilo PayPal.me con l'importo pre-compilato di <strong style="color:#ffc439">${fmtCur(amt)}</strong>
          </div>
          <div style="display:flex;gap:10px">
            <button onclick="this.closest('[style*=fixed]').remove()" style="flex:1;padding:11px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text-muted);border-radius:8px;cursor:pointer">Annulla</button>
            <button onclick="PaymentWizard._openPayPal(eid('pwiz-pp').value,${amt},this)" style="flex:2;padding:11px;backgrou;border-radius:8px;cursor:pointer;font-weight:700">🅿️ Apri link pagamento</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
  },

  async _saveStripe(key, btn) {
    if (!key || (!key.startsWith('sk_live_') && !key.startsWith('sk_test_'))) {
      toast('Chiave Stripe non valida (deve iniziare con sk_live_ o sk_test_)', 'warning');
      return;
    }
    CloudSync.apiKey = key;
    const settings = await IDB.get('settings','main').catch(()=>null)||{};
    settings.cloudSyncKey = key;
    if(!settings.key) settings.key='stripe_config';
    await IDB.put('settings', settings);
    toast('✅ Stripe configurato!', 'success');
    btn.closest('[style*=fixed]').remove();
    // Now generate the link
    this.stripe();
  },

  _openPayPal(user, amt, btn) {
    if (!user) { toast('Inserisci il tuo username PayPal.me', 'warning'); return; }
    localStorage.setItem('ingly_paypal_user', user);
    const amtStr = amt.toFixed(2);
    const url = `https://paypal.me/${user}/${amtStr}EUR`;
    window.open(url, '_blank');
    toast(`✅ Link PayPal aperto: ${fmtCur(amt)}`, '🅿️');
    btn.closest('[style*=fixed]').remove();
  }
};

// ════════════════════════════════════════════════════════════════════════
// 🚚 SUPPLIER INTELLIGENCE v73 — Sprint 4
// Analisi fornitori: score, dipendenza, lead time, performance trend
// ════════════════════════════════════════════════════════════════════════
window.Sales = Sales;
window.Cashflow = Cashflow;
window.Finance = Finance;
// PrimaNota exported in v11

window.Solleciti = Solleciti;
window.ProfitScope = ProfitScope;
window.FiscalRadar = FiscalRadar;
if(typeof RevSim!==typeof undefined) window.RevSim = RevSim;
window.FinancialForecaster = FinancialForecaster;
window.TaxCalendar = TaxCalendar;
window.InglyActualCost = InglyActualCost;
/* Alias storico: stesso oggetto, non una copia. Due oggetti con lo stesso
   contenuto sarebbero di nuovo due sistemi che possiedono un concetto. */
window.RealCostEngine = InglyActualCost;
window.PaymentWizard = PaymentWizard;

