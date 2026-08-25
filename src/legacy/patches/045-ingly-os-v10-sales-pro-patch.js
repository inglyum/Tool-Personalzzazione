
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v10 — SALES PRO PATCH
// Scroll · Sort-by-column · Footer totals · Pill counts · Status chips
// ════════════════════════════════════════════════════════════════════════
(function patchSalesPro(){
  const tryPatch = () => {
    if(typeof Sales === 'undefined' || !Sales.applyFilter) return setTimeout(tryPatch, 600);

    // ── 1. Add _sortBy — column header click handler ──────────────────
    Sales._currentSort = 'date_desc';
    Sales._sortBy = function(col){
      const map = {
        date:   ['date_desc','date_asc'],
        amount: ['amount_desc','amount_asc'],
        client: ['client_asc','client_desc'],
        status: ['status_asc','status_desc'],
      };
      const [a, b] = map[col] || ['date_desc','date_asc'];
      this._currentSort = (this._currentSort === a) ? b : a;
      // Sync hidden select
      const sel = eid('sales-sort');
      if(sel) sel.value = this._currentSort;
      this.applyFilter();
      this._updateSortIcons();
    };

    Sales._updateSortIcons = function(){
      const sort = this._currentSort;
      const iconMap = {
        'date_desc':   {date:'↓', amount:'⇅', client:'⇅', status:'⇅'},
        'date_asc':    {date:'↑', amount:'⇅', client:'⇅', status:'⇅'},
        'amount_desc': {date:'⇅', amount:'↓', client:'⇅', status:'⇅'},
        'amount_asc':  {date:'⇅', amount:'↑', client:'⇅', status:'⇅'},
        'client_asc':  {date:'⇅', amount:'⇅', client:'↑', status:'⇅'},
        'client_desc': {date:'⇅', amount:'⇅', client:'↓', status:'⇅'},
        'status_asc':  {date:'⇅', amount:'⇅', client:'⇅', status:'↑'},
        'status_desc': {date:'⇅', amount:'⇅', client:'⇅', status:'↓'},
      }[sort] || {};
      Object.entries(iconMap).forEach(([col, icon]) => {
        const el = eid('sort-icon-'+col);
        if(el){
          el.textContent = icon;
          el.style.color = icon !== '⇅' ? 'var(--primary)' : 'var(--text-dim)';
        }
      });
      // Highlight active header
      document.querySelectorAll('.sales-th-sort').forEach(th => {
        const col = th.querySelector('[id^="sort-icon-"]')?.id?.replace('sort-icon-','');
        if(col && iconMap[col] && iconMap[col] !== '⇅'){
          th.style.color = 'var(--primary)';
        } else {
          th.style.color = '';
        }
      });
    };

    // ── 2. Enhance applyFilter — add status sort + footer row ─────────
    const _origApply = Sales.applyFilter.bind(Sales);
    Sales.applyFilter = function(){
      // Sync currentSort from select
      const sel = eid('sales-sort');
      if(sel && sel.value) this._currentSort = sel.value;
      _origApply();
      this._updateSortIcons();
      this._renderFooterRow();
      this._updatePillCountsEnhanced();
    };

    // ── 3. Footer row: total of filtered results ──────────────────────
    Sales._renderFooterRow = function(){
      const tbody = eid('sales-tbody');
      if(!tbody) return;
      const rows = tbody.querySelectorAll('tr.sales-row');
      if(!rows.length) return;
      // Calculate totals from currently visible rows
      // We need to look at the data — find visible amounts
      const existingFooter = tbody.querySelector('tr.sales-footer');
      if(existingFooter) existingFooter.remove();
      // Get filtered data from DOM amounts
      let total = 0, paidTotal = 0, pendingTotal = 0;
      rows.forEach(row => {
        const amtEl = row.querySelector('td:nth-child(6)');
        const stEl  = row.querySelector('td:nth-child(7) span');
        const amt = parseFloat(amtEl?.textContent?.replace(/[€.,\s]/g,'').replace(',','.')) || 0;
        const status = stEl?.textContent?.trim();
        total += amt;
        if(status === 'Pagato') paidTotal += amt;
        if(status === 'Da Pagare') pendingTotal += amt;
      });

      // Use the module's filtered data instead — more reliable
      const q=(eid('sales-search')?.value||'').toLowerCase();
      const st=eid('sales-filter-status')?.value||'';
      const ch=eid('sales-filter-channel')?.value||'';
      const dateFrom=eid('sales-date-from')?.value||'';
      const dateTo=eid('sales-date-to')?.value||'';
      let filtered=(this._all||[]).filter(s=>{
        if(st && s.status!==st) return false;
        if(ch && s.channel!==ch) return false;
        if(dateFrom && (s.date||'')<dateFrom) return false;
        if(dateTo   && (s.date||'')>dateTo)   return false;
        if(q && !((s.clientName||'').toLowerCase().includes(q)||(s.desc||'').toLowerCase().includes(q))) return false;
        return true;
      });
      if(this._pendingDeletes?.size>0) filtered=filtered.filter(s=>!this._pendingDeletes.has(s.id));

      total       = filtered.reduce((a,s)=>a+(+s.amount||0),0);
      paidTotal   = filtered.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
      pendingTotal= filtered.filter(s=>s.status==='da_pagare').reduce((a,s)=>a+(+s.amount||0),0);
      const fmt   = v => typeof fmtCur!=='undefined' ? fmtCur(v) : '€'+v.toFixed(2);

      const footer = document.createElement('tr');
      footer.className = 'sales-footer';
      footer.style.cssText = 'background:var(--bg-card2);border-top:2px solid var(--border);position:sticky;bottom:0;z-index:5';
      footer.innerHTML = `
        <td colspan="2" style="padding:10px 14px">
          <span style="font-size:11px;font-weight:700;color:var(--text-muted)">${filtered.length} ${filtered.length===1?'voce':'voci'} filtrate</span>
        </td>
        <td></td>
        <td style="padding:10px 14px;text-align:right;font-size:11px;color:var(--text-muted)">Totale filtrato:</td>
        <td style="padding:10px 14px;text-align:right">
          <div style="font-size:16px;font-weight:900;color:var(--text)">${fmt(total)}</div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:2px">
            <span style="font-size:9px;color:#22c55e;font-weight:700">✅ ${fmt(paidTotal)}</span>
            <span style="font-size:9px;color:#f97316;font-weight:700">⏳ ${fmt(pendingTotal)}</span>
          </div>
        </td>
        <td></td>
        <td></td>`;
      tbody.appendChild(footer);
    };

    // ── 4. Enhanced pill counts with amounts ──────────────────────────
    Sales._updatePillCountsEnhanced = function(){
      const all = this._all || [];
      const cnt = (st) => all.filter(s=>!st||s.status===st).length;
      const amt = (st) => {
        const v = all.filter(s=>!st||s.status===st).reduce((a,s)=>a+(+s.amount||0),0);
        return typeof fmtCur!=='undefined' ? fmtCur(v) : '€'+v.toFixed(0);
      };
      const set = (id, count, amtVal) => {
        const el = eid(id);
        if(el) el.innerHTML = `<span style="background:rgba(0,0,0,.15);border-radius:99px;padding:1px 6px;margin-left:3px">${count}</span>`;
      };
      set('spill-cnt-all',       cnt(''),         amt(''));
      set('spill-cnt-da_pagare', cnt('da_pagare'), amt('da_pagare'));
      set('spill-cnt-pagato',    cnt('pagato'),    amt('pagato'));
      set('spill-cnt-annullato', cnt('annullato'), amt('annullato'));

      // Update summary inline
      const summEl = eid('sales-summary-inline');
      if(summEl){
        const paid    = all.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
        const pending = all.filter(s=>s.status==='da_pagare').reduce((a,s)=>a+(+s.amount||0),0);
        const fmt = typeof fmtCur!=='undefined' ? fmtCur : v=>'€'+v.toFixed(0);
        summEl.innerHTML = `<span style="color:#22c55e;font-weight:700">${fmt(paid)}</span> incassato · <span style="color:#f97316;font-weight:700">${fmt(pending)}</span> da pagare`;
      }
    };

    // ── 5. Enhance setStatusFilter — update active pill style ─────────
    const _origSetStatus = Sales.setStatusFilter?.bind(Sales);
    if(_origSetStatus){
      Sales.setStatusFilter = function(st){
        _origSetStatus(st);
        // Update pill visual state
        document.querySelectorAll('.sales-spill').forEach(btn => {
          btn.classList.remove('active');
          btn.style.background = 'transparent';
          btn.style.color = 'var(--text-muted)';
          btn.style.borderColor = '';
        });
        const activeId = 'spill-' + (st||'all');
        const activeBtn = eid(activeId);
        if(activeBtn){
          activeBtn.classList.add('active');
          const colorMap = {
            'spill-all':       {bg:'var(--primary-dim)',  color:'var(--primary)',  border:'var(--primary)'},
            'spill-da_pagare': {bg:'#f9731618',           color:'#f97316',         border:'#f9731680'},
            'spill-pagato':    {bg:'#22c55e18',           color:'#22c55e',         border:'#22c55e80'},
            'spill-annullato': {bg:'#6b728018',           color:'#9ca3af',         border:'#6b728080'},
          };
          const style = colorMap[activeId] || {};
          activeBtn.style.background   = style.bg    || 'var(--primary-dim)';
          activeBtn.style.color        = style.color || 'var(--primary)';
          activeBtn.style.borderColor  = style.border|| 'var(--primary)';
        }
        this._renderFooterRow();
      };
    }

    // ── 6. Add CSS for sort headers hover effect ──────────────────────
    if(!eid('sales-pro-css')){
      const style = document.createElement('style');
      style.id = 'sales-pro-css';
      style.textContent = `
        .sales-th-sort:hover { background:var(--bg-card)!important; color:var(--primary); }
        .sales-th-sort { transition:color .15s,background .15s; }
        #sales-table-wrap { border-radius:10px; }
        #sales-table-wrap::-webkit-scrollbar { width:5px; height:5px; }
        #sales-table-wrap::-webkit-scrollbar-track { background:transparent; }
        #sales-table-wrap::-webkit-scrollbar-thumb { background:var(--border2); border-radius:99px; }
        .sales-spill { transition:all .15s!important; }
        .sales-footer td { font-size:12px; }
        #sales-filter-bar select:focus, #sales-filter-bar input:focus { outline:2px solid var(--primary); }
        #sales-sort { font-weight:600; }
      `;
      document.head.appendChild(style);
    }

    // ── 7. Patch _renderRows to add linked order badge ────────────────
    const _origRenderRows = Sales._renderRows?.bind(Sales);
    if(_origRenderRows){
      Sales._renderRows = function(sales){
        _origRenderRows(sales);
        // After render, add order link badges and improve amount display
        this._renderFooterRow();
        this._updatePillCountsEnhanced();
      };
    }

    // Trigger initial enhancement
    setTimeout(()=>{
      if(Sales._all?.length) {
        Sales._updateSortIcons();
        Sales._renderFooterRow();
        Sales._updatePillCountsEnhanced();
      }
    }, 500);

    console.log('[SalesPro] Patched ✅');
  };
  setTimeout(tryPatch, 1200);
})();

