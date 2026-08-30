
// === /src/modules/clients/index.js ===
// Clients Module - INGLY OS v88
const ClientIntelligenceEngine = {
  _segments: {},

  async render() {
    const el = document.getElementById('view-clientintel');
    if (!el) return;
    el.innerHTML = '<div style="padding:20px;max-width:1100px"><div style="color:var(--text-muted);text-align:center;padding:40px">⏳ Calcolo segmentazione clienti...</div></div>';

    const [sales, clients] = await Promise.all([
      AppStore.get('sales'),
      AppStore.get('clients'),
    ]);

    const paid = sales.filter(s => s.status === 'pagato');
    const now = Date.now();
    const msDay = 86400000;

    // Build client stats
    const clientMap = {};
    paid.forEach(s => {
      if (!s.clientId) return;
      const c = clientMap[s.clientId] || (clientMap[s.clientId] = { id: s.clientId, name: s.clientName || '—', rev: 0, n: 0, lastSale: 0 });
      c.rev += +s.amount || 0;
      c.n++;
      c.lastSale = Math.max(c.lastSale, new Date(s.date || 0).getTime());
    });

    const segments = { champions: [], loyal: [], atRisk: [], lost: [], new: [] };
    Object.values(clientMap).forEach(c => {
      const days = c.lastSale ? Math.floor((now - c.lastSale) / msDay) : 999;
      const R = days < 30 ? 5 : days < 60 ? 4 : days < 90 ? 3 : days < 180 ? 2 : 1;
      const F = c.n >= 10 ? 5 : c.n >= 5 ? 4 : c.n >= 3 ? 3 : c.n >= 2 ? 2 : 1;
      const M = c.rev >= 2000 ? 5 : c.rev >= 800 ? 4 : c.rev >= 300 ? 3 : c.rev >= 100 ? 2 : 1;
      c.rfm = { R, F, M, score: Math.round((R * 0.35 + F * 0.35 + M * 0.30) * 20) };
      c.days = days;
      c.ltv = c.rev;
      if (M >= 4 && F >= 4 && R >= 4) segments.champions.push(c);
      else if (F >= 3 && R >= 3) segments.loyal.push(c);
      else if (R <= 2 && F >= 3) segments.atRisk.push(c);
      else if (days > 180) segments.lost.push(c);
      else segments.new.push(c);
    });

    const totalRev = Object.values(clientMap).reduce((a, c) => a + c.rev, 0);

    const segConfig = [
      { key: 'champions', label: 'Champions', icon: '💎', color: '#a855f7', desc: 'Acquistano spesso, alto valore', action: 'Nurtura il rapporto — offerta VIP' },
      { key: 'loyal', label: 'Fedeli', icon: '⭐', color: '#22c55e', desc: 'Comprano regolarmente', action: 'Offri upsell o bundle esclusivi' },
      { key: 'atRisk', label: 'A rischio', icon: '⚠️', color: '#f59e0b', desc: 'Erano attivi, ora silenziosi', action: 'Invia offerta personalizzata entro 7gg' },
      { key: 'lost', label: 'Persi', icon: '😢', color: '#ef4444', desc: '>180gg inattivi', action: 'Campagna win-back con sconto 15%' },
      { key: 'new', label: 'Nuovi', icon: '🌱', color: '#3b82f6', desc: 'Primo/pochi acquisti', action: 'Onboarding — mostra gamma completa' },
    ];

    el.innerHTML = `<div style="padding:20px;max-width:1100px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
        <div>
          <div class="page-title"><i class="fas fa-users" style="color:#8b5cf6"></i> Client Intelligence</div>
          <div class="page-subtitle">Segmentazione RFM — ${Object.values(clientMap).length} clienti attivi · €${totalRev.toFixed(0)} LTV totale</div>
        </div>
        <button onclick="(typeof ClientIntelligenceEngine!=='undefined'&&ClientIntelligenceEngine.render())" class="btn btn-secondary btn-sm"><i class="fas fa-sync"></i> Aggiorna</button>
      </div>

      <!-- Segment grid -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px">
        ${segConfig.map(sc => {
          const seg = segments[sc.key] || [];
          const segRev = seg.reduce((a, c) => a + c.rev, 0);
          return `<div style="background:var(--bg-card);border-radius:14px;padding:14px;border:1.5px solid ${sc.color}30;cursor:pointer" onclick="ClientIntelligenceEngine._showSegment('${sc.key}')">
            <div style="font-size:22px;margin-bottom:6px">${sc.icon}</div>
            <div style="font-size:20px;font-weight:900;color:${sc.color}">${seg.length}</div>
            <div style="font-size:12px;font-weight:700;margin-top:2px">${sc.label}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:4px">${sc.desc}</div>
            ${seg.length > 0 ? `<div style="font-size:10px;color:${sc.color};margin-top:6px;font-weight:700">€${segRev.toFixed(0)} LTV</div>` : ''}
          </div>`;
        }).join('')}
      </div>

      <!-- Action suggestions -->
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
        <div style="font-size:12px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em">💡 AZIONI CONSIGLIATE</div>
        ${segConfig.filter(sc => (segments[sc.key] || []).length > 0).map(sc => `
          <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--bg-card);border-radius:10px;border:1px solid ${sc.color}25">
            <span style="font-size:18px">${sc.icon}</span>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:700">${sc.label} (${(segments[sc.key] || []).length})</div>
              <div style="font-size:12px;color:var(--text-muted)">${sc.action}</div>
            </div>
            <button onclick="App.navigate('clients')" style="padding:6px 12px;background:${sc.color}20;color:${sc.color};border:1px solid ${sc.color}40;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;flex-shrink:0">Vai →</button>
          </div>`).join('')}
      </div>

      <!-- Top clients table -->
      <div class="card">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px">🏆 Top 10 Clienti per LTV</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          <thead><tr style="border-bottom:2px solid var(--border)">
            <th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:700">#</th>
            <th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:700">Cliente</th>
            <th style="text-align:right;padding:6px 8px;color:var(--text-muted);font-weight:700">LTV</th>
            <th style="text-align:right;padding:6px 8px;color:var(--text-muted);font-weight:700">Ordini</th>
            <th style="text-align:right;padding:6px 8px;color:var(--text-muted);font-weight:700">Ultimo acquisto</th>
            <th style="text-align:center;padding:6px 8px;color:var(--text-muted);font-weight:700">Score</th>
            <th style="text-align:center;padding:6px 8px;color:var(--text-muted);font-weight:700">Segmento</th>
          </tr></thead>
          <tbody>
            ${Object.values(clientMap).sort((a, b) => b.ltv - a.ltv).slice(0, 10).map((c, i) => {
              const seg = segConfig.find(sc => (segments[sc.key] || []).some(x => x.id === c.id)) || { label: '—', color: '#6b7280', icon: '—' };
              const lastDate = c.lastSale ? new Date(c.lastSale).toLocaleDateString('it-IT') : '—';
              return `<tr style="border-bottom:1px solid var(--border);${i%2===0?'background:var(--bg-card2)':''}">
                <td style="padding:8px 8px;color:var(--text-muted)">${i+1}</td>
                <td style="padding:8px 8px;font-weight:600">${c.name}</td>
                <td style="padding:8px 8px;text-align:right;font-weight:700;color:#22c55e">€${c.ltv.toFixed(0)}</td>
                <td style="padding:8px 8px;text-align:right">${c.n}</td>
                <td style="padding:8px 8px;text-align:right;color:${c.days>90?'#ef4444':c.days>30?'#f59e0b':'#22c55e'}">${lastDate}</td>
                <td style="padding:8px 8px;text-align:center"><span style="font-weight:800;color:${c.rfm?.score>=75?'#22c55e':c.rfm?.score>=50?'#f59e0b':'#ef4444'}">${c.rfm?.score||'—'}</span></td>
                <td style="padding:8px 8px;text-align:center"><span style="background:${seg.color}20;color:${seg.color};padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700">${seg.icon} ${seg.label}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div id="ci-segment-detail"></div>
    </div>`;

    // Store segments for drill-down
    this._segments = segments;
    this._segConfig = segConfig;
    this._clientMap = clientMap;
  },

  _showSegment(key) {
    const el = document.getElementById('ci-segment-detail');
    if (!el) return;
    const seg = (this._segments || {})[key] || [];
    const sc = (this._segConfig || []).find(s => s.key === key);
    if (!sc || seg.length === 0) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="card" style="margin-top:16px">
      <div style="font-size:14px;font-weight:700;margin-bottom:12px">${sc.icon} ${sc.label} — ${seg.length} clienti</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${seg.sort((a,b)=>b.rev-a.rev).map(c=>`
          <div style="padding:8px 14px;background:${sc.color}15;border:1px solid ${sc.color}30;border-radius:10px;font-size:12px">
            <div style="font-weight:700">${c.name}</div>
            <div style="color:${sc.color};font-size:11px">€${c.rev.toFixed(0)} · ${c.n} ordini · ${c.days}gg fa</div>
          </div>`).join('')}
      </div>
    </div>`;
    el.scrollIntoView({ behavior: 'smooth' });
  },

  exportCSV(){ toast('Export CSV in preparazione','info'); },
  filterSeg(k){ this._segFilter=k; if(this.render) this.render(); },
  async runAI(){ toast('Analisi AI: aggiungi dati vendita per attivare','info'); }
};


// ===== DASHBOARD =====
const Clients={
  _pendingDeletes: new Set(),
  editId:null,

  async importExcel() {
    const file = await ExcelImport.openPicker();
    if (!file) return;
    try {
      const { rows, col } = await ExcelImport.parseFile(file);
      const iNome  = col('nome','name','cliente','client','ragione_sociale','intestatario','full_name','fullname');
      const iEmail = col('email','mail','e_mail');
      const iTel   = col('telefono','tel','phone','cellulare','mobile','cell');
      const iCitta = col('citta','city','localita','comune','town');
      const iNote  = col('note','notes','memo','descrizione','osservazioni');
      const iTag   = col('tag','tags','categoria','category','gruppo','group');

      // Build candidate list from all rows
      const existing = await IDB.getAll('clients').catch(()=>[]);
      const candidates = rows.map((r,i) => {
        const nome  = (iNome>=0?String(r[iNome]||''):'').trim();
        const email = (iEmail>=0?String(r[iEmail]||''):'').trim().toLowerCase();
        if (!nome && !email) return null;
        const isDup = existing.some(cl =>
          (nome  && (cl.name||'').toLowerCase() === nome.toLowerCase()) ||
          (email && (cl.email||'').toLowerCase() === email)
        );
        return { idx:i, nome, email,
          phone: iTel>=0?String(r[iTel]||'').trim():'',
          city:  iCitta>=0?String(r[iCitta]||'').trim():'',
          note:  iNote>=0?String(r[iNote]||'').trim():'',
          tags:  iTag>=0&&r[iTag]?String(r[iTag]).split(/[,;]/).map(t=>t.trim()).filter(Boolean):[],
          isDup };
      }).filter(Boolean);

      if (!candidates.length) { toast('Nessun contatto trovato nel file','warning'); return; }

      // ── SELECTION MODAL ──────────────────────────────────────────
      const ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9700;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(8px)';

      const newCount = candidates.filter(c=>!c.isDup).length;
      const dupCount = candidates.filter(c=>c.isDup).length;

      ov.innerHTML = `<div style="background:var(--bg-card);border-radius:20px;width:100%;max-width:680px;max-height:88vh;display:flex;flex-direction:column;border:1px solid var(--border2);box-shadow:0 32px 80px rgba(0,0,0,.8);overflow:hidden">

        <!-- Header -->
        <div style="padding:22px 24px 16px;border-bottom:1px solid var(--border);flex-shrink:0">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px">
            <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#22c55e20,#16a34a20);border:1px solid #22c55e40;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">📋</div>
            <div>
              <div style="font-size:17px;font-weight:800;color:var(--text)">Importa Rubrica</div>
              <div style="font-size:12px;color:var(--text-muted)">${file.name} · ${candidates.length} contatti trovati</div>
            </div>
            <button onclick="this.closest('[style*=fixed]').remove()" style="margin-left:auto;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);padding:6px 12px;cursor:pointer;font-size:13px">✕</button>
          </div>
          <!-- Stats row -->
          <div style="display:flex;gap:10px">
            <div style="padding:6px 12px;background:#22c55e15;border:1px solid #22c55e30;border-radius:8px;font-size:12px;font-weight:700;color:#22c55e">
              ✅ ${newCount} nuovi
            </div>
            ${dupCount?`<div style="padding:6px 12px;background:#f5973620;border:1px solid #f5973640;border-radius:8px;font-size:12px;font-weight:700;color:#f59736">⚠️ ${dupCount} già presenti</div>`:''}
          </div>
        </div>

        <!-- Toolbar -->
        <div style="padding:10px 24px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center;flex-shrink:0;background:var(--bg-card2)">
          <input id="cl-import-search" type="text" placeholder="🔍 Cerca nella rubrica..." style="flex:1;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:7px 12px;color:var(--text);font-size:12px;outline:none" oninput="window._clImportFilter(this.value)">
          <button onclick="window._clSelectAll(true)"  style="padding:6px 12px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">Tutti</button>
          <button onclick="window._clSelectAll(false)" style="padding:6px 12px;background:var(--bg-card3);color:var(--text-muted);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px">Nessuno</button>
          <button onclick="window._clSelectNew()"      style="padding:6px 12px;background:#22c55e20;color:#22c55e;border:1px solid #22c55e30;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">Solo nuovi</button>
        </div>

        <!-- Contact list -->
        <div id="cl-import-list" style="flex:1;overflow-y:auto;padding:10px 16px;min-height:0">
          ${candidates.map((cl,i) => `
            <label id="cl-row-${i}" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;transition:.1s;margin-bottom:4px;${cl.isDup?'opacity:.55;':''}background:var(--bg-card2);border:1px solid var(--border)">
              <input type="checkbox" class="cl-import-cb" data-idx="${i}" ${cl.isDup?'':'checked'}
                style="width:17px;height:17px;accent-color:var(--primary);cursor:pointer;flex-shrink:0">
              <div style="width:38px;height:38px;border-radius:50%;background:${cl.isDup?'var(--bg-card3)':'linear-gradient(135deg,#22c55e,#16a34a)'};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:${cl.isDup?'var(--text-muted)':'#fff'};flex-shrink:0">
                ${(cl.nome||cl.email||'?')[0].toUpperCase()}
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${cl.nome||'—'}</div>
                <div style="font-size:11px;color:var(--text-muted);display:flex;gap:8px;flex-wrap:wrap;margin-top:2px">
                  ${cl.email?`<span>✉ ${cl.email}</span>`:''}
                  ${cl.phone?`<span>📞 ${cl.phone}</span>`:''}
                  ${cl.city?`<span>📍 ${cl.city}</span>`:''}
                </div>
              </div>
              ${cl.isDup?'<span style="padding:2px 8px;background:#f5973620;color:#f59736;border-radius:99px;font-size:10px;font-weight:700;flex-shrink:0">già presente</span>':''}
            </label>`).join('')}
        </div>

        <!-- Footer -->
        <div style="padding:14px 24px;border-top:1px solid var(--border);display:flex;gap:10px;align-items:center;flex-shrink:0;background:var(--bg-card)">
          <span id="cl-import-count-label" style="font-size:13px;color:var(--text-muted);flex:1">${newCount} selezionati</span>
          <button onclick="this.closest('[style*=fixed]').remove()" style="padding:10px 18px;background:var(--bg-card3);color:var(--text-muted);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:13px">Annulla</button>
          <button id="cl-import-confirm" style="padding:10px 22px;background:var(--primary);color:#0a0a0a;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">📥 Importa selezionati</button>
        </div>
      </div>`;

      document.body.appendChild(ov);
      ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });

      // Update counter
      const updateCount = () => {
        const sel = ov.querySelectorAll('.cl-import-cb:checked').length;
        const lbl = ov.querySelector('#cl-import-count-label');
        if(lbl) lbl.textContent = sel + ' selezionati';
      };
      ov.querySelectorAll('.cl-import-cb').forEach(cb => cb.addEventListener('change', updateCount));

      // Filter function
      window._clImportFilter = (q) => {
        const qlow = q.toLowerCase();
        ov.querySelectorAll('[id^="cl-row-"]').forEach((row, i) => {
          const cl = candidates[i];
          const match = !q || (cl.nome+cl.email+cl.phone+cl.city).toLowerCase().includes(qlow);
          row.style.display = match ? '' : 'none';
        });
      };

      // Select all/none
      window._clSelectAll = (checked) => {
        ov.querySelectorAll('.cl-import-cb').forEach(cb => {
          const row = cb.closest('label');
          if (row.style.display !== 'none') cb.checked = checked;
        });
        updateCount();
      };

      // Select only new (not duplicates)
      window._clSelectNew = () => {
        ov.querySelectorAll('.cl-import-cb').forEach((cb,i) => {
          cb.checked = !candidates[i].isDup;
        });
        updateCount();
      };

      // Confirm import
      ov.querySelector('#cl-import-confirm').onclick = async () => {
        const selected = [];
        ov.querySelectorAll('.cl-import-cb:checked').forEach(cb => {
          selected.push(candidates[+cb.dataset.idx]);
        });
        if (!selected.length) { toast('Nessun contatto selezionato','warning'); return; }
        ov.remove();
        toast('Importazione in corso...','info',2500);
        let n = 0;
        for (const cl of selected) {
          await IDB.put('clients', {
            id: Date.now() + cl.idx,
            name: cl.nome, email: cl.email, phone: cl.phone,
            city: cl.city, note: cl.note, tags: cl.tags,
            source: 'Excel Import', createdAt: new Date().toISOString().split('T')[0]
          });
          n++;
        }
        AppStore.invalidate('clients');
        await this.render();
        toast('✅ '+n+' clienti importati con successo','success',5000);
      };

    } catch(e){ toast('Errore lettura file: '+e.message,'error',6000); }
  },
  _page: 0,
  _pageSize: 50,
  async render(){
    try {
    const el=eid('clients-tbody'); if(!el) return;

    // ── Use getFilteredClients() for consistent sort/filter logic ──
    const {filtered, all, totals} = await this.getFilteredClients();
    let clients = filtered;
    if(this._pendingDeletes&&this._pendingDeletes.size>0)
      clients=clients.filter(cl=>!this._pendingDeletes.has(cl.id)&&!this._pendingDeletes.has(+cl.id));

    const allSales = await AppStore.get('sales').catch(()=>[]);

    // ── KPIs (uses totals from enriched all-clients, not filtered) ──
    const kpis=eid('clients-kpis');
    if(kpis){
      const totalPaid = allSales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
      const returning = new Set(allSales.filter(s=>allSales.filter(x=>x.clientId===s.clientId).length>1).map(s=>s.clientId)).size;
      kpis.innerHTML=[
        {l:'Clienti Totali',    v:all.length,                                                   c:'var(--primary)'},
        {l:'Attivi (90gg)',     v:totals.active,                                                c:'var(--green)'},
        {l:'Valore Medio',      v:fmtCur(all.length?totalPaid/all.length:0),                   c:'var(--blue)'},
        {l:'Tasso Ritorno',     v:Math.round(returning/Math.max(1,all.length)*100)+'%',        c:'var(--purple)'},
      ].map(k=>`<div class="kpi-card"><div class="kpi-value" style="color:${k.c}">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');
    }

    // ── Update active filter button highlight (use CSS class) ──
    ['all','active','vip','at_risk','new','no_sales'].forEach(t=>{
      const btn=document.getElementById('cl-seg-'+t);
      if(!btn) return;
      btn.classList.toggle('active', (this._filterType||'all')===t);
      // clear any legacy inline styles
      btn.style.background=''; btn.style.color=''; btn.style.borderColor=''; btn.style.fontWeight='';
    });

    // ── Pagination ──
    const totalC=clients.length;
    const ps=this._pageSize||50;
    // Update count badge in filter bar
    const countInfo=eid('clients-count-info');
    if(countInfo){
      countInfo.textContent = totalC===all.length
        ? `${all.length} clienti`
        : `${totalC} di ${all.length} clienti`;
    }
    const totalPages=Math.max(1,Math.ceil(totalC/ps));
    if((this._page||0)>=totalPages) this._page=totalPages-1;
    const curPage=this._page||0;
    const pageItems=clients.slice(curPage*ps, curPage*ps+ps);

    // ── Pre-compute global avgSpent for scoring (uses ALL sales, ALL clients) ──
    const avgAll = all.length ? allSales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0) / Math.max(1,all.length) : 1;

    // ── Empty state ──
    if(pageItems.length===0){
      el.innerHTML=`<tr><td colspan="9" style="padding:50px 20px;text-align:center">
        <div style="font-size:36px;margin-bottom:10px">🔍</div>
        <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px">${all.length===0?'Nessun cliente ancora':'Nessun risultato'}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">${all.length===0?'Aggiungi il primo cliente con il bottone "Nuovo Cliente"':('Nessun cliente corrisponde ai filtri applicati. Totale database: '+all.length+' clienti.')}</div>
        ${all.length>0?`<button onclick="Clients.clearClientFilters()" style="padding:7px 16px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">✕ Rimuovi filtri</button>`:''}
      </td></tr>`;
      const pgEl2=eid('clients-pagination'); if(pgEl2) pgEl2.innerHTML='';
      const topPg2=eid('clients-pagination-top'); if(topPg2) topPg2.innerHTML='';
      return;
    }

    el.innerHTML=pageItems.map(c=>{
      const spent = c._spent||0;
      const orders = c._orders||0;
      const daysSince = c._daysSince!=null ? c._daysSince : 999;
      let score='D',scoreColor='#6b7280',scoreBg='#6b728020';
      if(spent>=avgAll*2&&orders>=3&&daysSince<90){score='A';scoreColor='#22c55e';scoreBg='#22c55e20';}
      else if(spent>=avgAll&&orders>=2&&daysSince<180){score='B';scoreColor='#3b82f6';scoreBg='#3b82f620';}
      else if(orders>=1&&daysSince<365){score='C';scoreColor='#f59e0b';scoreBg='#f59e0b20';}
      const lastStr = daysSince<999 ? (daysSince===0?'Oggi':daysSince+'gg fa') : '—';
      return`<tr>
        <td style="width:32px;padding:8px 4px">
          <input type="checkbox" class="cl-bulk-cb" data-id="${c.id}"
            onclick="event.stopPropagation();if(window.Clients&&window.Clients.toggleSelect)window.Clients.toggleSelect(${c.id})"
            style="width:15px;height:15px;cursor:pointer;accent-color:var(--primary)">
        </td>
        <td><code style="color:var(--text-muted);font-size:11px">#${c.id}</code></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:32px;height:32px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--primary);flex-shrink:0">${(c.name||'?').charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-weight:700;font-size:13px">${c.name||'—'}</div>
              ${c.company?`<div style="font-size:10px;color:var(--text-muted)">${c.company}</div>`:''}
            </div>
          </div>
        </td>
        <td style="padding:8px 10px;text-align:center">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;font-size:11px;font-weight:900;background:${scoreBg};color:${scoreColor};border:1.5px solid ${scoreColor}" title="Score: A=Top VIP B=Buono C=Occasionale D=Dormiente">${score}</span>
        </td>
        <td><a href="tel:${c.phone}" style="color:var(--text-muted);text-decoration:none;font-size:12px">${c.phone||'—'}</a></td>
        <td><a href="mailto:${c.email}" style="color:var(--blue);text-decoration:none;font-size:12px">${c.email||'—'}</a></td>
        <td style="font-size:11px;color:var(--text-muted)">${lastStr}</td>
        <td>
          <span class="badge badge-blue">${orders} ordini</span>
          <div style="font-size:11px;color:var(--primary);font-weight:700;margin-top:2px">${fmtCur(spent)}</div>
        </td>
        <td>
          <div class="act-group">
            <button class="act-btn" style="background:var(--primary-dim);color:var(--primary);border-color:var(--primary-border)" onclick="AIMarketing.openPersona(${c.id})" title="AI Persona"><i class="fas fa-brain"></i></button>
            <button class="act-btn" style="background:#0f172a;color:#60a5fa;border-color:#3b82f630" onclick="window.Clients&&window.Clients.showStorico(${c.id})" title="Storico acquisti"><i class="fas fa-history"></i></button>
            <button class="act-btn act-edit" onclick="window.Clients&&window.Clients.openModal(${c.id})" title="Modifica"><i class="fas fa-edit"></i></button>
            <button class="act-btn" onclick="Clients.renderClientPanel(${c.id})" style="background:#8b5cf615;color:#a78bfa;border-color:#8b5cf630" title="Pannello CRM completo"><i class="fas fa-user-circle"></i></button>
            ${c.phone?`<button class="act-btn" onclick="Clients.quickWhatsApp(${c.id})" style="background:#25D36610;color:#25D366;border-color:#25D36630" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>`:''}
            <button class="act-btn act-del" onclick="window.Clients&&window.Clients.del(${c.id})" title="Elimina"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');

    // ── Pagination controls (shared builder) ──
    // _goPage: async IIFE — awaits render() so DOM is ready BEFORE scrolling
    const _goPage = (p) => `(async()=>{Clients._page=${p};await Clients.render();const ci=document.getElementById('content-inner');if(ci)ci.scrollTop=0;})()`;
    const _pgHTML = (totalC, curPage, totalPages, ps) => {
      if(totalPages<=1) return '';
      const bs='padding:5px 11px;border-radius:7px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);cursor:pointer;font-size:12px;transition:.15s';
      const abs='padding:5px 11px;border-radius:7px;border:1px solid var(--primary);background:var(--primary-dim);color:var(--primary);cursor:default;font-size:12px;font-weight:700';
      const prevPage = Math.max(0, curPage-1);
      const nextPage = Math.min(totalPages-1, curPage+1);
      let h=`<button onclick="${_goPage(prevPage)}" style="${bs}" ${curPage===0?'disabled':''}>‹ Prec</button>`;
      for(let p=0;p<totalPages;p++){
        if(totalPages>8&&p>1&&p<totalPages-2&&Math.abs(p-curPage)>2){if(p===2||p===totalPages-3)h+='<span style="padding:0 4px;color:var(--text-dim)">…</span>';continue;}
        h+=`<button onclick="${_goPage(p)}" style="${p===curPage?abs:bs}">${p+1}</button>`;
      }
      h+=`<button onclick="${_goPage(nextPage)}" style="${bs}" ${curPage>=totalPages-1?'disabled':''}>Succ ›</button>`;
      h+=`<span style="color:var(--text-muted);font-size:11px;margin-left:6px">${curPage*ps+1}–${Math.min((curPage+1)*ps,totalC)} di ${totalC} clienti</span>`;
      return `<div style="display:flex;align-items:center;justify-content:center;gap:5px;padding:10px 0;flex-wrap:wrap">${h}</div>`;
    };

    const pgEl=eid('clients-pagination');
    if(pgEl) pgEl.innerHTML=_pgHTML(totalC,curPage,totalPages,ps);

    // ── Also inject top-pagination ──
    let topPg=eid('clients-pagination-top');
    if(!topPg){
      topPg=document.createElement('div');
      topPg.id='clients-pagination-top';
      topPg.style.cssText='margin-bottom:8px';
      const tw=el.closest('.table-wrap');
      if(tw) tw.parentElement.insertBefore(topPg, tw);
    }
    topPg.innerHTML = totalPages>1 ? _pgHTML(totalC,curPage,totalPages,ps) : '';

    } catch(e){ console.error('[Clients.render]', e.message||e); }
  },
  filter(v){
    // Legacy: update search state and re-render properly
    this._search = v || '';
    this._page = 0;
    this.render();
  },
  async openModal(id=null){
    this.editId=id;
    eid('modal-client-title').textContent=id?'Modifica Cliente':'Nuovo Cliente';
    if(id){const c=await IDB.get('clients',id);if(c){eid('cli-name').value=c.name;eid('cli-phone').value=c.phone||'';eid('cli-email').value=c.email||'';eid('cli-address').value=c.address||'';eid('cli-notes').value=c.notes||'';}}
    else{['cli-name','cli-phone','cli-email','cli-address','cli-notes'].forEach(f=>{const el=eid(f);if(el)el.value=''});}

    // P7: Show customer stats if editing
    if(id) {
      setTimeout(async()=>{
        const el = document.getElementById('client-stats-panel');
        if(!el) return;
        const [sales, orders] = await Promise.all([
          AppStore.get('sales').catch(()=>[]),
          AppStore.get('orders').catch(()=>[]),
        ]);
        const cl = await IDB.get('clients',id).catch(()=>null);
        const cSales = sales.filter(s=>s.clientId===id||(cl&&s.clientName===cl.name));
        const cOrders = orders.filter(o=>o.clientId===id);
        const totalSpent = cSales.reduce((a,s)=>a+(+s.amount||0),0);
        const lastSale = cSales.sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];
        const avgOrder = cSales.length ? totalSpent/cSales.length : 0;
        el.innerHTML = `
          <div style="margin-top:14px;padding:12px;background:var(--bg-card2);border-radius:10px;border:1px solid var(--border)">
            <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">📊 Statistiche Cliente</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
              <div><div style="font-size:18px;font-weight:800;color:var(--primary)">${cSales.length}</div><div style="font-size:10px;color:var(--text-muted)">Acquisti</div></div>
              <div><div style="font-size:18px;font-weight:800;color:var(--green)">${fmtCur(totalSpent)}</div><div style="font-size:10px;color:var(--text-muted)">Totale Speso</div></div>
              <div><div style="font-size:18px;font-weight:800;color:var(--orange)">${fmtCur(avgOrder)}</div><div style="font-size:10px;color:var(--text-muted)">Scontrino Medio</div></div>
            </div>
            ${lastSale?`<div style="margin-top:8px;font-size:11px;color:var(--text-muted)">Ultimo acquisto: <b style="color:var(--text)">${lastSale.desc?.slice(0,40)||'Vendita'}</b> — ${lastSale.date||''}</div>`:''}
            ${cSales.slice(0,3).map(s=>`<div style="font-size:11px;padding:4px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between"><span>${s.desc?.slice(0,30)||'Vendita'}</span><span style="font-weight:700;color:var(--green)">${fmtCur(s.amount||0)}</span></div>`).join('')}
          </div>`;
        el.style.display = '';
      }, 200);
    }
    
    openModal('client');
  },
  async save(){
    const client={name:eid('cli-name').value,phone:eid('cli-phone').value,email:eid('cli-email').value,address:eid('cli-address').value,notes:eid('cli-notes').value,_createdAt:Date.now()};
    if(this.editId)client.id=this.editId;
    if(!client.id) client.id=Date.now();
    const id=await IDB.put('clients',client).catch(e=>{toast('Errore salvataggio: '+e.message,'error');return null;});
    if(!id) return;
    await logAction('client',id,this.editId?'updated':'created');
    AppStore.invalidate('clients');
    toast('Cliente salvato! ✅');closeModal('client');this.editId=null;
    AppStore.invalidate('clients');
    if(typeof BDW!=='undefined') BDW.touch('clients');
    await this.render();await App.populateClientSelects();
  },
  async del(id){
    id = typeof id==='string' ? +id||id : id;
    const record = await IDB.get('clients', id).catch(()=>null);
    if (!record) return;

    /* ── Un cliente con una storia non si cancella ─────────────────────────
       Prima si chiedeva conferma e si cancellava. I documenti restavano con un
       `clientId` che non puntava più a niente: nella scheda dell'ordine
       compariva uno spazio vuoto dove c'era un nome, e nessuna schermata
       sapeva più dire di chi fosse quel lavoro. Il danno non si vede il
       giorno in cui si cancella: si vede sei mesi dopo. */
    const G = window.InglyClienteIntegrita;
    if (G) {
      const v = await G.puoEliminare(id);
      if (!v.ok) {
        const nome = record.name || record.fullName || 'questo cliente';
        if (!confirm(v.spiega + '\n\nArchiviare «' + nome + '»?\n'
          + 'Resta collegato ai suoi documenti e sparisce dalla rubrica attiva. Reversibile.')) return;
        await IDB.put('clients', G.archivia(record, 'archiviato dalla rubrica'));
        AppStore.invalidate('clients');
        if(typeof BDW!=='undefined') BDW.touch('clients');
        await logAction('client', id, 'archived');
        toast('Cliente archiviato — i suoi ' + v.dipendenze.totale + ' documenti restano collegati', 'info');
        await this.render();
        if(typeof App!=='undefined') App.populateClientSelects();
        return;
      }
    }
    if(!confirm('Eliminare questo cliente?\nNon ha documenti collegati.')) return;
    if(!this._pendingDeletes) this._pendingDeletes = new Set();
    this._pendingDeletes.add(id);this._pendingDeletes.add(+id);this._pendingDeletes.add(String(id)); // type-safe
    if(typeof BDW!=='undefined') BDW.touch('clients');
    await this.render();
    await logAction('client',id,'deleted');
    UndoStack.schedule('clients', record, async () => {
      this._pendingDeletes.delete(id);
      /* Passa dallo scrittore unico: cancellare solo dall'archivio lasciava il
         cliente nello specchio della rubrica, e la migrazione successiva lo
         faceva risorgere. Un record che torna dopo essere stato cancellato è
         peggio di uno che non si cancella: nessuno va a ricontrollare. */
      if (window.InglyClienti) await window.InglyClienti.elimina(id, { forza: true });
      else await IDB.del('clients', id);
      AppStore.invalidate('clients');
      if(typeof App!=='undefined') App.populateClientSelects();
    }, 'Cliente ' + (record.name||''), () => {
      this._pendingDeletes.delete(id);
      this.render();
    });
  },

  // ===== vCard IMPORT =====
  _vcfPending:[],

  parseVCF(text){
    // Unfold multi-line values (vCard spec: lines starting with space/tab are continuations)
    text=text.replace(/\r\n[ \t]/g,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
    const cards=text.split(/BEGIN:VCARD/i).slice(1);
    return cards.map(block=>{
      const get=(key)=>{
        const re=new RegExp(`^${key}(?:;[^:]*)?:(.+)$`,'im');
        const m=block.match(re);
        return m?m[1].replace(/\\n/g,' ').replace(/\\,/g,',').trim():'';
      };
      // FN = Full Name (preferred), fallback to N field
      let name=get('FN');
      if(!name){
        const n=get('N').split(';');
        name=[n[1],n[0]].filter(Boolean).join(' ');
      }
      // TEL: pick first number found (may have TYPE params)
      const telMatch=block.match(/^TEL(?:;[^:]*)?:(.+)$/im);
      const phone=telMatch?telMatch[1].replace(/[^\d+\s\-().]/g,'').trim():'';
      // EMAIL: first email found
      const emailMatch=block.match(/^EMAIL(?:;[^:]*)?:(.+)$/im);
      const email=emailMatch?emailMatch[1].trim():'';
      // ADR: assemble readable address from parts
      const adrMatch=block.match(/^ADR(?:;[^:]*)?:(.+)$/im);
      let address='';
      if(adrMatch){address=adrMatch[1].split(';').filter(p=>p.trim()).join(', ');}
      // NOTE
      const note=get('NOTE');
      return {name:name.trim(),phone,email,address,notes:note,_createdAt:Date.now()};
    }).filter(c=>c.name);
  },

  async importVCF(input){
    const file=input.files[0];
    input.value=''; // reset so same file can be re-imported
    if(!file)return;
    const text=await file.text();
    const parsed=this.parseVCF(text);
    if(!parsed.length){toast('Nessun contatto trovato nel file vCard','warning');return;}

    // Load existing phones for dedup (normalize: strip non-digits except leading +)
    const normalize=p=>(p||'').replace(/[\s\-().]/g,'');
    const existing=await AppStore.get('clients');
    const existingPhones=new Set(existing.map(c=>normalize(c.phone)).filter(Boolean));

    let newCount=0,dupCount=0;
    this._vcfPending=[];
    parsed.forEach(c=>{
      const norm=normalize(c.phone);
      const isDup=norm&&existingPhones.has(norm);
      if(!isDup)this._vcfPending.push(c);
      isDup?dupCount++:newCount++;
    });

    // Build summary
    const summary=eid('vcf-import-summary');
    summary.innerHTML=`
      <span>📋 <strong style="color:#fff">${parsed.length}</strong> contatti trovati</span>
      <span>✅ <strong style="color:var(--green)">${newCount}</strong> nuovi</span>
      <span>⏭️ <strong style="color:var(--text-muted)">${dupCount}</strong> duplicati (ignorati)</span>
      <span style="color:var(--text-muted);font-size:11px">File: ${file.name}</span>`;

    // Build preview table
    const btn=eid('vcf-import-confirm-btn');
    if(newCount===0){
      btn.disabled=true;btn.style.opacity='0.4';
    } else {
      btn.disabled=false;btn.style.opacity='1';
      btn.innerHTML=`<i class="fas fa-download"></i> Importa ${newCount} Contatti`;
    }

    const tbody=eid('vcf-import-tbody');
    // Show all: new first, then dups
    const normalize2=p=>(p||'').replace(/[\s\-().]/g,'');
    tbody.innerHTML=parsed.map(c=>{
      const norm=normalize2(c.phone);
      const isDup=norm&&existingPhones.has(norm);
      const statusStyle=isDup?'color:var(--text-muted)':'color:var(--green)';
      const statusLabel=isDup?'<span style="'+statusStyle+';font-size:11px">⏭ duplicato</span>':'<span style="'+statusStyle+';font-size:11px">✅ nuovo</span>';
      const rowStyle=isDup?'opacity:0.45':'';
      return `<tr style="${rowStyle};border-bottom:1px solid var(--border)">
 await IDB.put('clients',c).catch(()=>{});px 12px;font-size:13px"><strong>${c.name}</strong></td>
        <td style="padding:8px 12px;font-size:12px;color:var(--text-muted)">${c.phone||'—'}</td>
        <td style="padding:8px 12px;font-size:12px;color:var(--blue)">${c.email||'—'}</td>
        <td style="padding:8px 12px">${statusLabel}</td>
      </tr>`;
    }).join('');

    openModal('vcf-import');
  },

  async confirmImport(){
    if(!this._vcfPending.length){closeModal('vcf-import');return;}
    let imported=0;
    for(const c of this._vcfPending){
      const id=await IDB.put('clients',c);
      await logAction('client',id,'created');
      imported++;
    }
    this._vcfPending=[];
    closeModal('vcf-import');
    toast(`✅ ${imported} contatti importati nella rubrica CRM!`,'success');
    await this.render();
    await App.populateClientSelects();
  },

  async renderPipeline(){
    const clients=await AppStore.get('clients').catch(()=>[]);
    const sales=await AppStore.get('sales').catch(()=>[]);
    const quotes=await AppStore.get('quotes').catch(()=>[]);
    // Compute pipeline stages
    const prospects=clients.filter(c=>c.leadStatus==='prospect'||!c.leadStatus);
    const inTreatative=clients.filter(c=>c.leadStatus==='trattativa');
    const closed=clients.filter(c=>c.leadStatus==='chiuso');
    const revenue=sales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
    const pipeline=quotes.filter(q=>q.status==='inviato'||q.status==='bozza').reduce((a,q)=>a+(+q.grossPrice||0),0);
    const el=eid('crm-pipeline-strip');
    if(el) el.innerHTML=[
      {l:'Prospect',v:prospects.length,c:'#64748b'},
      {l:'In Trattativa',v:inTreatative.length,c:'#f59e0b'},
      {l:'Clienti Chiusi',v:closed.length,c:'#10b981'},
      {l:'Pipeline €',v:fmtCur(pipeline),c:'var(--primary)'},
    ].map(k=>`<div class="kpi-card"><div class="kpi-value" style="color:${k.c}">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');
  },

  // ── Bulk selection ───────────────────────────────────────
  _selected: new Set(),

  toggleSelect(id) {
    id = +id || id;
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
    const masterCb = document.querySelector('#view-clients thead input[type=checkbox]');
    if(masterCb) masterCb.checked = !allChecked;
  },

  _updateBulkBar() {
    const bar = document.getElementById('cl-bulk-bar');
    const countEl = document.getElementById('cl-bulk-count');
    if (!bar) return;
    if (this._selected.size > 0) {
      bar.style.display = 'flex';
      if (countEl) countEl.textContent = this._selected.size + ' client' + (this._selected.size===1?'e':'i') + ' selezionat' + (this._selected.size===1?'o':'i');
    } else {
      bar.style.display = 'none';
    }
    document.querySelectorAll('.cl-bulk-cb').forEach(cb => {
      cb.checked = this._selected.has(+cb.dataset.id||cb.dataset.id);
    });
  },

  async bulkDelete() {
    const n = this._selected.size;
    if (!n) { toast('Nessun cliente selezionato','warning'); return; }
    const ids = [...this._selected];
    /* Lo stesso presidio dell'eliminazione singola: senza, bastava
       selezionare tutto per aggirarlo. Chi ha documenti viene archiviato,
       chi non ne ha viene eliminato, e il conto di cosa è successo si dice. */
    const G = window.InglyClienteIntegrita;
    let daArchiviare = [], daEliminare = [];
    if (G) {
      for (const id of ids) {
        const v = await G.puoEliminare(+id||id);
        (v.ok ? daEliminare : daArchiviare).push(+id||id);
      }
    } else { daEliminare = ids.map(x=>+x||x); }

    const parti = [];
    if (daEliminare.length) parti.push('eliminare ' + daEliminare.length + ' senza documenti');
    if (daArchiviare.length) parti.push('archiviare ' + daArchiviare.length + ' con documenti collegati');
    if (!confirm('Stai per ' + parti.join(' e ') + '.\n\nProcedere?')) return;

    this._selected.clear();
    this._updateBulkBar();
    for (const id of daArchiviare) {
      const rec = await IDB.get('clients', id).catch(()=>null);
      if (rec && G) await IDB.put('clients', G.archivia(rec, 'archiviato in blocco dalla rubrica')).catch(()=>{});
    }
    for (const id of daEliminare) {
      if (window.InglyClienti) await window.InglyClienti.elimina(id, { forza: true }).catch(()=>{});
      else await IDB.del('clients', id).catch(()=>{});
    }
    AppStore.invalidate('clients');
    await this.render();
    /* Il messaggio dice cosa è successo davvero: dire «eliminati» di clienti
       che sono stati archiviati insegnerebbe a non fidarsi dei messaggi. */
    const detto = [];
    if (daEliminare.length) detto.push(daEliminare.length + ' eliminat' + (daEliminare.length===1?'o':'i'));
    if (daArchiviare.length) detto.push(daArchiviare.length + ' archiviat' + (daArchiviare.length===1?'o':'i') + ' (hanno documenti collegati)');
    toast('✅ ' + detto.join(' · '), 'success', 4000);
  },

  clearSelection() {
    this._selected = new Set();
    this._updateBulkBar?.();
    document.querySelectorAll('.cl-bulk-cb').forEach(cb=>{ cb.checked=false; });
    const masterCb = document.querySelector('#view-clients thead input[type=checkbox]');
    if (masterCb) masterCb.checked = false;
  },

  showStorico(id){ toast('Storico cliente — sezione in arrivo','info'); },

  clearSelection() {
    this._selected = new Set();
    if(this._updateBulkBar) this._updateBulkBar();
    document.querySelectorAll('.cl-bulk-cb').forEach(cb=>{ cb.checked=false; });
    const masterCb = document.querySelector('#view-clients thead input[type=checkbox]');
    if (masterCb) masterCb.checked = false;
  },

  // ═══ CRM Intelligence — client health + quick actions ═══
  async renderClientPanel(clientId) {
    const [client, allSales, allOrders, allQuotes] = await Promise.all([
      IDB.get('clients', +clientId||clientId).catch(()=>null),
      IDB.getAll('sales').catch(()=>[]),
      IDB.getAll('orders').catch(()=>[]),
      IDB.getAll('quotes').catch(()=>[]),
    ]);
    if(!client) return;

    const cSales   = allSales.filter(s  => s.clientId===client.id || (s.clientName||'').toLowerCase()===(client.name||'').toLowerCase());
    const cOrders  = allOrders.filter(o => o.clientId===client.id || (o.clientName||'').toLowerCase()===(client.name||'').toLowerCase());
    const cQuotes  = allQuotes.filter(q => q.clientId===client.id || (q.clientName||'').toLowerCase()===(client.name||'').toLowerCase());

    const totalSpent = cSales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
    const lastSale   = cSales.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))[0];
    const daysSince  = lastSale ? Math.floor((Date.now()-new Date(lastSale.date||0).getTime())/864e5) : null;
    const avgOrder   = cSales.filter(s=>s.status==='pagato').length ? totalSpent / cSales.filter(s=>s.status==='pagato').length : 0;
    const convRate   = cQuotes.length ? Math.round(cQuotes.filter(q=>q.status==='confermato').length/cQuotes.length*100) : null;

    // Health score (0-100)
    let health = 50;
    if(totalSpent>500)  health += 15;
    if(totalSpent>2000) health += 10;
    if(daysSince !== null && daysSince < 30)  health += 15;
    if(daysSince !== null && daysSince > 180) health -= 25;
    if(cOrders.length > 3) health += 10;
    health = Math.max(0, Math.min(100, health));
    const healthColor = health>=70?'#22c55e':health>=40?'#f59e0b':'#ef4444';
    const healthLabel = health>=70?'🟢 Cliente fedele':health>=40?'🟡 Attivo':'🔴 A rischio churn';

    const ovl = document.createElement('div');
    ovl.id = '_client-panel';
    ovl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(2px)';
    ovl.onclick = e => { if(e.target===ovl) ovl.remove(); };
    ovl.innerHTML = `
    <div style="background:var(--bg-card);border-radius:16px;width:min(640px,100%);max-height:90vh;overflow-y:auto;border:1px solid var(--border2)" onclick="event.stopPropagation()">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;position:sticky;top:0;background:var(--bg-card);z-index:1;border-radius:16px 16px 0 0">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#06b6d4);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#000;flex-shrink:0">${(client.name||'?')[0].toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:800">${client.name||'—'}</div>
          <div style="font-size:11px;color:${healthColor};font-weight:600">${healthLabel}</div>
        </div>
        <div style="display:flex;gap:6px">
          ${client.phone?`<a href="https://wa.me/${client.phone.replace(/\D/g,'')}" target="_blank" style="padding:7px 12px;background:rgba(37,211,102,.12);color:#25D366;border:1px solid rgba(37,211,102,.25);border-radius:8px;font-size:12px;font-weight:700;text-decoration:none">💬 WA</a>`:''}
          ${client.email?`<a href="mailto:${client.email}" style="padding:7px 12px;background:var(--bg-card2);color:var(--primary);border:1px solid var(--border);border-radius:8px;font-size:12px;font-weight:700;text-decoration:none">✉️ Mail</a>`:''}
        </div>
        <button onclick="document.getElementById('_client-panel').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:20px">✕</button>
      </div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:16px">

        <!-- KPI strip -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          ${[
            {l:'Totale speso',v:'€'+Math.round(totalSpent),c:'#22c55e'},
            {l:'Ordini',v:cOrders.length,c:'#818cf8'},
            {l:'Valore medio',v:'€'+Math.round(avgOrder),c:'#60a5fa'},
            {l:'Preventivi',v:cQuotes.length+(convRate!==null?' ('+convRate+'%)':''),c:'#f59e0b'},
          ].map(k=>`<div style="background:var(--bg-card2);border-radius:10px;padding:10px 12px;text-align:center">
            <div style="font-size:16px;font-weight:900;color:${k.c}">${k.v}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${k.l}</div>
          </div>`).join('')}
        </div>

        <!-- Health bar -->
        <div style="background:var(--bg-card2);border-radius:10px;padding:12px 14px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px">
            <span>💊 Salute relazione</span><span style="color:${healthColor};font-weight:700">${health}/100</span>
          </div>
          <div style="height:6px;background:var(--bg-card);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${health}%;background:${healthColor};border-radius:99px;transition:width .5s"></div>
          </div>
          ${daysSince!==null?`<div style="font-size:10px;color:var(--text-muted);margin-top:5px">
            ${daysSince===0?'✅ Ha comprato oggi!':daysSince<=7?`✅ Ultima vendita ${daysSince}gg fa`:daysSince<=30?`🟡 Ultima vendita ${daysSince}gg fa`:daysSince<=90?`🟠 Inattivo da ${daysSince}gg — considera di ricontattarlo`:daysSince<=180?`⚠️ Inattivo da ${daysSince}gg — manda un aggiornamento prodotti`:`🔴 Inattivo da ${daysSince}gg — alto rischio abbandono`}
          </div>`:'<div style="font-size:10px;color:var(--text-muted);margin-top:5px">Nessuna vendita ancora</div>'}
        </div>

        <!-- Last orders -->
        ${cOrders.length?`<div>
          <div style="font-size:12px;font-weight:700;margin-bottom:8px">📦 Ultimi ordini</div>
          <div style="display:flex;flex-direction:column;gap:5px">
            ${cOrders.sort((a,b)=>new Date(b.createdAt||b.created||0)-new Date(a.createdAt||a.created||0)).slice(0,4).map(o=>`
            <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg-card2);border-radius:8px;border:1px solid var(--border)">
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.name||'Ordine'}</div>
                <div style="font-size:10px;color:var(--text-muted)">${o.createdAt?new Date(o.createdAt).toLocaleDateString('it-IT'):''}</div>
              </div>
              <div style="text-align:right">
                ${o.total?`<div style="font-size:13px;font-weight:800;color:#22c55e">€${Math.round(o.total)}</div>`:''}
                <div style="font-size:10px;color:var(--text-muted)">${o.stage||o.status||'—'}</div>
              </div>
            </div>`).join('')}
          </div>
        </div>`:''}

        <!-- Contact info -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${client.email?`<div style="background:var(--bg-card2);border-radius:8px;padding:10px 12px"><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;margin-bottom:3px">Email</div><div style="font-size:12px">${client.email}</div></div>`:''}
          ${client.phone?`<div style="background:var(--bg-card2);border-radius:8px;padding:10px 12px"><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;margin-bottom:3px">Telefono</div><div style="font-size:12px">${client.phone}</div></div>`:''}
          ${client.city||client.address?`<div style="background:var(--bg-card2);border-radius:8px;padding:10px 12px;grid-column:1/-1"><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;margin-bottom:3px">Indirizzo</div><div style="font-size:12px">${client.address||client.city||''}</div></div>`:''}
        </div>

        <!-- Quick actions -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:4px;border-top:1px solid var(--border)">
          <button onclick="App.navigate('quoter');document.getElementById('_client-panel').remove()"
            style="flex:1;padding:10px;background:var(--primary);color:#000;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:800">📋 Nuovo Preventivo</button>
          <button onclick="App.navigate('sales');document.getElementById('_client-panel').remove()"
            style="flex:1;padding:10px;background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.25);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">💰 Registra Vendita</button>
        </div>
      </div>
    </div>`;
    document.getElementById('_client-panel')?.remove();
    document.body.appendChild(ovl);
  },

  async quickWhatsApp(clientId, e) {
    e?.stopPropagation();
    const client = await IDB.get('clients', +clientId||clientId).catch(()=>null);
    if(!client?.phone){ if(typeof toast!=='undefined') toast('Numero telefono non presente','warning'); return; }
    const phone = client.phone.replace(/\D/g,'');
    const msg = encodeURIComponent(`Ciao ${client.name||''}! Ti scrivo da ${localStorage.getItem('ingly_company_name')||'il nostro studio'} 👋`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  },

  async exportClientsCSV() {
    const clients = await IDB.getAll('clients').catch(()=>[]);
    const sales   = await IDB.getAll('sales').catch(()=>[]);
    if(!clients.length){ if(typeof toast!=='undefined') toast('Nessun cliente da esportare','warning'); return; }
    const cols = ['id','name','company','email','phone','city','address','notes','created'];
    const csv = [
      cols.join(','),
      ...clients.map(cl => cols.map(col => `"${(cl[col]||'').toString().replace(/"/g,'""')}"`).join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'clienti_ingly_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    if(typeof toast!=='undefined') toast(`📤 ${clients.length} clienti esportati!`,'success');
  },

  // ══ Smart client filter system ══
  _search: '',
  _sort: 'name_asc',
  _filterType: 'all',

  _scrollToTop(){ const ci=document.getElementById('content-inner'); if(ci) ci.scrollTop=0; },
  filterClients(q){ this._search=q; this._page=0; this.render().then(()=>{}); },
  sortClients(s){ this._sort=s; this._page=0; this.render().then(()=>this._scrollToTop()); },
  filterType(t){ this._filterType=t; this._page=0; this.render().then(()=>this._scrollToTop()); },
  clearClientFilters(){
    this._search=''; this._sort='name_asc'; this._filterType='all'; this._page=0;
    const si=document.getElementById('clients-search-input');
    const so=document.getElementById('clients-sort-select');
    if(si) si.value=''; if(so) so.value='name_asc';
    this.render().then(()=>this._scrollToTop());
    if(typeof toast!=='undefined') toast('Filtri rimossi','info');
  },

  async getFilteredClients(){
    const all = await IDB.getAll('clients').catch(()=>[]);
    const sales = await IDB.getAll('sales').catch(()=>[]);
    const orders = await IDB.getAll('orders').catch(()=>[]);
    const q = this._search.toLowerCase();
    const now = Date.now();

    // Enrich clients with computed stats
    const enriched = all.map(cl=>{
      const cSales = sales.filter(s=>s.clientId===cl.id||(s.clientName||'').toLowerCase()===(cl.name||'').toLowerCase());
      const cOrders = orders.filter(o=>o.clientId===cl.id||(o.clientName||'').toLowerCase()===(cl.name||'').toLowerCase());
      const spent = cSales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
      const lastDate = cSales.length ? Math.max(...cSales.map(s=>new Date(s.date||0).getTime())) : 0;
      const daysSince = lastDate ? Math.floor((now-lastDate)/864e5) : null;
      return {...cl, _spent:spent, _orders:cOrders.length, _lastDate:lastDate, _daysSince:daysSince};
    });

    // Filter
    let filtered = enriched.filter(cl=>{
      if(q && ![(cl.name||''),(cl.email||''),(cl.phone||''),(cl.company||''),(cl.city||'')].join(' ').toLowerCase().includes(q)) return false;
      if(this._filterType==='active')   return cl._lastDate>0 && cl._daysSince<90;
      if(this._filterType==='at_risk')  return cl._lastDate>0 && cl._daysSince>=90 && cl._daysSince<365;
      if(this._filterType==='new')      return (now-new Date(cl.created||0).getTime())<30*864e5;
      if(this._filterType==='vip')      return cl._spent>=500;
      if(this._filterType==='no_sales') return cl._spent===0;
      return true;
    });

    // Sort
    filtered.sort((a,b)=>{
      switch(this._sort){
        case 'name_asc':    return (a.name||'').localeCompare(b.name||'');
        case 'name_desc':   return (b.name||'').localeCompare(a.name||'');
        case 'spent_desc':  return b._spent-a._spent;
        case 'spent_asc':   return a._spent-b._spent;
        case 'orders_desc': return b._orders-a._orders;
        case 'last_asc':    return (a._lastDate||0)-(b._lastDate||0);
        case 'last_desc':   return (b._lastDate||0)-(a._lastDate||0);
        case 'new_first':   return new Date(b.created||0)-new Date(a.created||0);
        default:            return (a.name||'').localeCompare(b.name||'');
      }
    });
    return {filtered, all, totals:{all:all.length, active:enriched.filter(c=>c._daysSince<90&&c._lastDate>0).length, vip:enriched.filter(c=>c._spent>=500).length, at_risk:enriched.filter(c=>c._daysSince>=90&&c._daysSince<365).length}};
  }
};
window.Clients = Clients; // immediate export


// ===== CATALOG =====
// ═══════════════════════════════════════════════════════════════════
// MORNING BRIEFING — Briefing giornaliero automatico
// ═══════════════════════════════════════════════════════════════════
const ClientLifecycle = {
  async analyzeAll() {
    const [sales, clients] = await Promise.all([
      IDB.getAll('sales').catch(() => []),
      IDB.getAll('clients').catch(() => []),
    ]);
    const now = new Date();

    return clients.map(client => {
      const cid = client.id;
      const clientSales = sales.filter(s => s.clientId === cid && s.status === 'pagato');
      const sortedSales = clientSales.sort((a, b) => new Date(b.date||0) - new Date(a.date||0));

      const lastSale = sortedSales[0];
      const lastDate = lastSale ? new Date(lastSale.date || 0) : null;
      const daysSince = lastDate ? (now - lastDate) / 86400000 : 9999;
      const totalRevenue = clientSales.reduce((a, s) => a + (+s.amount || 0), 0);
      const freq = clientSales.length;

      // Churn score 0-100 (higher = more at risk)
      const recencyScore = Math.min(50, daysSince * 0.5);
      const freqScore = Math.max(0, 20 - freq * 4);
      const trendScore = clientSales.length >= 2 ? (() => {
        const recent3 = clientSales.slice(0, 3).reduce((a, s) => a + (+s.amount||0), 0) / 3;
        const older3  = clientSales.slice(-3).reduce((a, s) => a + (+s.amount||0), 0) / 3;
        return older3 > 0 && recent3 < older3 * 0.7 ? 30 : 0;
      })() : 15;
      const churnScore = Math.min(100, Math.round(recencyScore + freqScore + trendScore));

      // Next Best Action
      let nba = 'do_nothing', nbaLabel = '✓ Niente da fare', nbaPriority = 0;
      if (daysSince > 90 && totalRevenue > 500) {
        nba = 'reactivate'; nbaLabel = '🔄 Riattiva cliente'; nbaPriority = 3;
      } else if (daysSince > 45 && freq >= 2) {
        nba = 'follow_up'; nbaLabel = '📞 Follow-up consigliato'; nbaPriority = 2;
      } else if (daysSince < 30 && freq >= 3) {
        nba = 'upsell'; nbaLabel = '💎 Proponi upsell'; nbaPriority = 2;
      } else if (daysSince < 60 && freq === 1) {
        nba = 'second_purchase'; nbaLabel = '🛍️ Stimola 2° acquisto'; nbaPriority = 1;
      }

      // Repurchase probability (simplified BG/NBD)
      const lambda = freq / Math.max(1, daysSince / 30);
      const repurchaseProb = Math.min(95, Math.round((1 - Math.exp(-lambda * 30)) * 100));

      return {
        ...client,
        churnScore,
        nba, nbaLabel, nbaPriority,
        daysSince: Math.round(daysSince),
        totalRevenue, freq,
        repurchaseProb,
        lastDate,
      };
    }).sort((a, b) => b.churnScore - a.churnScore);
  },

  churnColor(score) {
    if (score >= 70) return 'var(--red)';
    if (score >= 40) return 'var(--orange)';
    return 'var(--green)';
  },

  async renderDashboard(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">⏳ Analisi...</div>';

    const clients = await this.analyzeAll();
    const atRisk = clients.filter(c => c.churnScore >= 60);
    const toUpsell = clients.filter(c => c.nba === 'upsell');
    const toReactivate = clients.filter(c => c.nba === 'reactivate');

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
        <div style="background:var(--bg-card2);border:1px solid var(--red);border-radius:var(--radius);padding:12px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:var(--red)">${atRisk.length}</div>
          <div style="font-size:11px;color:var(--text-muted)">a rischio churn</div>
        </div>
        <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius);padding:12px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:var(--primary)">${toUpsell.length}</div>
          <div style="font-size:11px;color:var(--text-muted)">da upsellare</div>
        </div>
        <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius);padding:12px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:var(--orange)">${toReactivate.length}</div>
          <div style="font-size:11px;color:var(--text-muted)">da riattivare</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Top priorità</div>
      ${clients.slice(0, 8).map(c => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg-card2);border-radius:8px;margin-bottom:6px;border:1px solid var(--border)">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--bg-card3);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--text);flex-shrink:0">${(c.name||c.company||'?')[0].toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name||c.company||'Cliente'}</div>
            <div style="font-size:11px;color:var(--text-muted)">${c.nbaLabel} · ${c.daysSince < 9999 ? c.daysSince + 'gg fa' : 'mai'}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:13px;font-weight:700;color:${this.churnColor});}</div>
            <div style="font-size:10px;color:var(--text-dim)">churn risk</div>
          </div>
        </div>`).join('')}`;
  },
};
// ═══════════════════════════════════════════════════════════════════
const ClientPricing = {
  async getDiscount(clientId) {
    const client = await IDB.get('clients', clientId);
    return parseFloat(client?.customDiscount || 0);
  },
  async setDiscount(clientId, discount) {
    const client = await IDB.get('clients', clientId);
    if (client) { client.customDiscount = parseFloat(discount); await IDB.put('clients', client); }
  },
  applyDiscount(price, discountPct) {
    return price * (1 - discountPct / 100);
  }
};

// ===== ⑪ AI FORECASTING =====
const ClientTimeline = {
  async open(clientId) {
    const [clients,sales,quotes,sigs] = await Promise.all([
      IDB.getAll('clients').catch(()=>[]),
      IDB.getAll('sales').catch(()=>[]),
      IDB.getAll('quotes').catch(()=>[]),
      IDB.getAll('signatures').catch(()=>[])
    ]);
    const c = clients.find(x=>x.id===clientId);
    if(!c) return;

    const title = eid('timeline-title');
    if(title) title.innerHTML = `<span style="color:var(--primary)">${sanitize((c.name||'?')[0])}</span><span style="width:28px;height:28px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--primary);margin-right:8px;flex-shrink:0"></span> ${sanitize(c.name)} — Timeline`;

    const cSales  = sales.filter(s=>s.clientId===clientId);
    const cQuotes = quotes.filter(q=>q.clientId===clientId);
    const cSigs   = sigs.filter(s=>s.clientId===clientId);

    // Build unified timeline events
    const events = [
      ...cSales.map(s=>({ts:new Date(s.date||0).getTime()||0, type:'sale', icon:'💰', color:'#10b981', label:s.desc||'Vendita', detail:`${fmtCur(+s.amount||0)} · ${s.status}`, raw:s})),
      ...cQuotes.map(q=>({ts:new Date(q.date||q.createdAt||0).getTime()||0, type:'quote', icon:'📄', color:'#f59e0b', label:q.name||'Preventivo', detail:`${q.grossPrice?fmtCur(q.grossPrice):''} · ${q.status||'bozza'}`, raw:q})),
      ...cSigs.map(s=>({ts:s.ts||0, type:'signature', icon:'✍️', color:'#8b5cf6', label:'Firma digitale', detail:new Date(s.ts).toLocaleDateString('it-IT'), raw:s})),
    ].sort((a,b)=>b.ts-a.ts);

    const totSpent = cSales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
    const lastActivity = events[0]?.ts ? new Date(events[0].ts).toLocaleDateString('it-IT') : '—';

    const body = eid('timeline-body');
    if(!body) return;
    body.innerHTML = `
      <!-- KPI Bar -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:1px solid var(--border)">
        ${[
          {l:'Vendite',v:cSales.length,c:'#10b981',icon:'🛒'},
          {l:'Fatturato',v:fmtCur(totSpent),c:'#22c55e',icon:'💶'},
          {l:'Preventivi',v:cQuotes.length,c:'#f59e0b',icon:'📄'},
          {l:'Ultimo contatto',v:lastActivity,c:'var(--blue)',icon:'📅'},
        ].map(k=>`<div style="padding:16px 20px;text-align:center;border-right:1px solid var(--border)">
          <div style="font-size:20px;margin-bottom:2px">${k.icon}</div>
          <div style="font-size:16px;font-weight:800;color:${k.c}">${k.v}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${k.l}</div>
        </div>`).join('')}
      </div>
      <!-- Client info strip -->
      <div style="padding:12px 20px;background:var(--bg-card2);border-bottom:1px solid var(--border);display:flex;gap:16px;flex-wrap:wrap;font-size:12px">
        ${c.phone?`<span>📞 <a href="tel:${sanitize(c.phone)}" style="color:var(--text)">${sanitize(c.phone)}</a></span>`:''}
        ${c.email?`<span>✉️ <a href="mailto:${sanitize(c.email)}" style="color:var(--blue)">${sanitize(c.email)}</a></span>`:''}
        ${c.address?`<span>📍 ${sanitize(c.address)}</span>`:''}
        ${c.notes?`<span style="color:var(--text-muted)">📝 ${sanitize(c.notes)}</span>`:''}
        <button onclick="SignaturePad.open({clientId:${c.id},clientName:'${(c.name||'').replace(/'/g,'')}'});closeModal('client-timeline')" style="margin-left:auto;padding:4px 12px;background:var(--primary-dim);border:1px solid var(--primary-border);color:var(--primary);border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">✍️ Richiedi firma</button>
      </div>
      <!-- Timeline -->
      <div style="padding:20px;max-height:480px;overflow-y:auto">
        ${events.length === 0 ? '<div style="text-align:center;padding:48px;color:var(--text-dim)"><i class="fas fa-clock" style="font-size:32px;opacity:.2;display:block;margin-bottom:10px"></i>Nessuna attività registrata</div>'
          : events.map((ev,i)=>`
          <div style="display:flex;gap:12px;margin-bottom:${i<events.length-1?'0':'0'}">
            <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
              <div style="width:36px;height:36px;border-radius:50%;background:${ev.color}20;border:2px solid ${ev.color}60;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${ev.icon}</div>
              ${i<events.length-1?`<div style="width:2px;flex:1;min-height:24px;background:var(--border2);margin:4px 0"></div>`:''}
            </div>
            <div style="flex:1;padding-bottom:20px">
              <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
                <strong style="font-size:13px;color:var(--text)">${sanitize(ev.label)}</strong>
                <span style="font-size:11px;color:${ev.color};font-weight:600;background:${ev.color}15;padding:1px 7px;border-radius:4px">${ev.type}</span>
                <span style="font-size:11px;color:var(--text-dim);margin-left:auto">${ev.ts ? new Date(ev.ts).toLocaleDateString('it-IT') : '—'}</span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:3px">${sanitize(ev.detail)}</div>
              ${ev.type==='signature'&&ev.raw.dataUrl?`<img src="${ev.raw.dataUrl}" style="max-width:180px;border:1px solid var(--border2);border-radius:6px;margin-top:6px;background:#fff;padding:4px">`:''}
            </div>
          </div>`).join('')}
      </div>`;

    openModal('client-timeline');
  }
};

// Upgrade showStorico to use ClientTimeline
Clients.showStorico = async function(clientId) { ClientTimeline.open(clientId); };

// ══════════════════════════════════════════════════════════════════════════
// v75 — DASHBOARD DRAG-AND-DROP KPI LAYOUT  🖱️
// ══════════════════════════════════════════════════════════════════════════
const LeadScorer = {
  _all: [],
  _filtered: [],
  _currentFilter: 'all',
  _page: 0,
  _pageSize: 25,

  async render() {
    await BDW.init();
    const segs = BDW.segments;
    const leadScores = BDW.leadScores || {};
    const allClients = BDW._raw?.clients || [];

    // Build scored list
    this._all = allClients.map(c => {
      const score = leadScores[c.id] || this._calcScore(c, segs);
      const seg = this._getSeg(c.id, segs);
      const sales = (BDW._raw?.allSales || []).filter(s => s.clientId == c.id);
      const ltv = sales.filter(s => ['pagato','paid','completato'].includes(s.status))
                       .reduce((a,s) => a + (+s.amount||0), 0);
      const lastSale = sales.length ? sales.sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0].date : null;
      const daysSince = lastSale ? Math.floor((Date.now()-new Date(lastSale))/86400000) : 9999;
      return { ...c, score, seg, ltv, daysSince, orderCount: sales.length };
    }).sort((a,b) => b.score - a.score);

    this._renderKPIs();
    this.applyFilters();
  },

  _calcScore(c, segs) {
    const id = c.id;
    if (segs.champions?.find(x=>x.id==id)) return 85 + Math.random()*15 | 0;
    if (segs.loyal?.find(x=>x.id==id))     return 70 + Math.random()*15 | 0;
    if (segs.promising?.find(x=>x.id==id)) return 55 + Math.random()*15 | 0;
    if (segs.newbie?.find(x=>x.id==id))    return 45 + Math.random()*15 | 0;
    if (segs.needsAttention?.find(x=>x.id==id)) return 30 + Math.random()*15 | 0;
    if (segs.atRisk?.find(x=>x.id==id))    return 20 + Math.random()*10 | 0;
    if (segs.lost?.find(x=>x.id==id))      return 5  + Math.random()*10 | 0;
    return 25;
  },

  _getSeg(id, segs) {
    if (segs.champions?.find(x=>x.id==id))     return {label:'🏆 Champion',  color:'#f59e0b'};
    if (segs.loyal?.find(x=>x.id==id))          return {label:'💛 Loyal',     color:'#22c55e'};
    if (segs.promising?.find(x=>x.id==id))      return {label:'🚀 Promising', color:'#38bdf8'};
    if (segs.newbie?.find(x=>x.id==id))         return {label:'🌱 New',       color:'#a78bfa'};
    if (segs.needsAttention?.find(x=>x.id==id)) return {label:'⚠️ Needs Attn',color:'#fb923c'};
    if (segs.atRisk?.find(x=>x.id==id))         return {label:'🔴 At Risk',   color:'#ef4444'};
    if (segs.lost?.find(x=>x.id==id))           return {label:'💀 Lost',      color:'#6b7280'};
    return {label:'—', color:'#6b7280'};
  },

  _scoreColor(s) {
    if (s >= 70) return '#22c55e';
    if (s >= 45) return '#f59e0b';
    if (s >= 25) return '#fb923c';
    return '#ef4444';
  },

  _renderKPIs() {
    const el = eid('ls-kpis'); if (!el) return;
    const hot  = this._all.filter(c=>c.score>=70).length;
    const warm = this._all.filter(c=>c.score>=45&&c.score<70).length;
    const cold = this._all.filter(c=>c.score>=25&&c.score<45).length;
    const risk = this._all.filter(c=>c.score<25).length;
    el.innerHTML = [
      {l:'🔥 Hot Leads', v:hot, c:'#22c55e'},
      {l:'🟡 Warm', v:warm, c:'#f59e0b'},
      {l:'🧊 Cold', v:cold, c:'#fb923c'},
      {l:'🔴 At Risk / Lost', v:risk, c:'#ef4444'},
    ].map(k=>'<div style="background:var(--bg-card2);border-radius:10px;padding:14px;text-align:center;border-bottom:3px solid '+k.c+'"><div style="font-size:26px;font-weight:900;color:'+k.c+'">'+k.v+'</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px">'+k.l+'</div></div>').join('');
  },

  filter(f) {
    this._currentFilter = f;
    ['all','hot','warm','cold','atrisk'].forEach(id => {
      const b = eid('ls-filter-' + id);
      if (!b) return;
      b.className = 'btn btn-' + (id===f ? 'primary' : 'secondary') + ' btn-sm';
      b.style.fontSize = '11px';
    });
    this.applyFilters();
  },

  applyFilters(resetPage) {
    const search = (eid('ls-search')?.value||'').toLowerCase();
    const f = this._currentFilter;
    if(resetPage) this._page = 0;
    this._filtered = this._all.filter(c => {
      const matchScore = f==='all' ? true :
        f==='hot'    ? c.score>=70 :
        f==='warm'   ? c.score>=45&&c.score<70 :
        f==='cold'   ? c.score>=25&&c.score<45 :
        f==='atrisk' ? c.score<25 : true;
      const matchSearch = !search || (c.name||'').toLowerCase().includes(search) || (c.email||'').toLowerCase().includes(search);
      return matchScore && matchSearch;
    });
    this._renderTable();
  },

  _renderTable() {
    const el = eid('ls-table'); if (!el) return;
    if (!this._filtered.length) {
      el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-dim)">Nessun cliente in questo segmento</div>';
      return;
    }

    const ps = this._pageSize || 25;
    const totalPages = Math.max(1, Math.ceil(this._filtered.length / ps));
    if (this._page >= totalPages) this._page = totalPages - 1;
    const pg = this._page || 0;
    const pageItems = this._filtered.slice(pg * ps, pg * ps + ps);

    const rows = pageItems.map(c => {
      const sc = this._scoreColor(c.score);
      const pct = Math.min(100, c.score);
      const ltv = c.ltv > 0 ? fmtCur(c.ltv) : '—';
      const days = c.daysSince < 9999 ? c.daysSince + 'gg fa' : '—';
      return [
        '<tr style="border-top:1px solid var(--border2);transition:.15s" class="ls-row-hover">',
          '<td style="padding:10px 14px;font-weight:700;font-size:13px">' + (c.name||'—') + '</td>',
          '<td style="padding:10px 14px">',
            '<div style="display:flex;align-items:center;gap:8px">',
              '<div style="width:60px;height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:6px;background:'+sc+';width:'+pct+'%;border-radius:3px"></div></div>',
              '<span style="font-size:13px;font-weight:900;color:'+sc+'">'+c.score+'</span>',
            '</div>',
          '</td>',
          '<td style="padding:10px 14px"><span style="font-size:10px;padding:2px 8px;border-radius:10px;background:'+c.seg.color+'20;color:'+c.seg.color+';font-weight:700">'+c.seg.label+'</span></td>',
          '<td style="padding:10px 14px;font-size:12px;color:var(--text-muted)">'+c.orderCount+' ordini</td>',
          '<td style="padding:10px 14px;font-size:12px;font-weight:700;color:var(--primary)">'+ltv+'</td>',
          '<td style="padding:10px 14px;font-size:11px;color:var(--text-muted)">'+days+'</td>',
          '<td style="padding:10px 14px">',
            '<div style="display:flex;gap:6px">',
              '<button onclick="LeadScorer.openAction('+c.id+')" class="btn btn-primary btn-sm" style="font-size:10px;padding:4px 10px">⚡ Azione</button>',
              '<button onclick="LeadScorer.markPriority('+c.id+')" class="btn btn-secondary btn-sm" style="font-size:10px;padding:4px 10px" title="Segna priorità">⭐</button>',
            '</div>',
          '</td>',
        '</tr>'
      ].join('');
    }).join('');

    el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
      '<thead><tr style="background:var(--bg-card2)">' +
        '<th style="text-align:left;padding:10px 14px;font-size:10px;color:var(--text-muted)">CLIENTE</th>' +
        '<th style="text-align:left;padding:10px 14px;font-size:10px;color:var(--text-muted)">SCORE</th>' +
        '<th style="text-align:left;padding:10px 14px;font-size:10px;color:var(--text-muted)">SEGMENTO</th>' +
        '<th style="text-align:left;padding:10px 14px;font-size:10px;color:var(--text-muted)">ORDINI</th>' +
        '<th style="text-align:left;padding:10px 14px;font-size:10px;color:var(--text-muted)">LTV</th>' +
        '<th style="text-align:left;padding:10px 14px;font-size:10px;color:var(--text-muted)">ULTIMO ACQ.</th>' +
        '<th style="text-align:left;padding:10px 14px;font-size:10px;color:var(--text-muted)">AZIONI</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '</table>';

    // Pagination footer
    if (totalPages > 1) {
      const bs = 'padding:5px 11px;border:1px solid var(--border);border-radius:7px;background:var(--bg-card2);cursor:pointer;color:var(--text);font-size:11px';
      const bas = 'padding:5px 11px;border:1px solid #ec4899;border-radius:7px;background:rgba(236,72,153,.1);cursor:pointer;color:#ec4899;font-size:11px;font-weight:700';
      let pHtml = '<div style="display:flex;justify-content:center;align-items:center;gap:5px;margin-top:12px;padding:8px 0">';
      pHtml += '<button onclick="LeadScorer._page=Math.max(0,(LeadScorer._page||0)-1);LeadScorer._renderTable()" style="'+bs+'" '+(pg===0?'disabled':'')+'>‹ Prec</button>';
      for(let i=Math.max(0,pg-3);i<Math.min(totalPages,pg+4);i++){
        pHtml += '<button onclick="LeadScorer._page='+i+';LeadScorer._renderTable()" style="'+(i===pg?bas:bs)+'">'+(i+1)+'</button>';
      }
      pHtml += '<button onclick="LeadScorer._page=Math.min('+(totalPages-1)+',(LeadScorer._page||0)+1);LeadScorer._renderTable()" style="'+bs+'" '+(pg>=totalPages-1?'disabled':'')+'>Succ ›</button>';
      pHtml += '<span style="font-size:11px;color:var(--text-muted);margin-left:4px">Pag. '+(pg+1)+'/'+totalPages+' · '+this._filtered.length+' clienti</span>';
      pHtml += '</div>';
      el.innerHTML += pHtml;
    }
  },

  async openAction(clientId) {
    const client = this._all.find(c => c.id == clientId); if (!client) return;
    const modal = eid('ls-action-modal');
    const content = eid('ls-action-content');
    if (!modal || !content) return;

    const actions = this._getRecommendedActions(client);
    content.innerHTML = [
      "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:16px\">",
        "<div>",
          "<div style=\"font-weight:800;font-size:15px\">" + (client.name||"Cliente") + "</div>",
          "<div style=\"font-size:11px;color:var(--text-muted)\">Score: <strong style=\"color:" + this._scoreColor(client.score) + "\">" + client.score + "</strong> · " + client.seg.label + "</div>",
        "</div>",
        "<button onclick=\"LeadScorer.closeAction()\" style=\"background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px\">\u2715</button>",
      "</div>",
      "<div style=\"display:flex;flex-direction:column;gap:8px\">",
        actions.map(function(a) {
          return "<button data-cid=\"" + clientId + "\" data-act=\"" + a.type + "\" onclick=\"LeadScorer.executeAction(+this.dataset.cid,this.dataset.act)\" style=\"display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:left;width:100%;color:var(--text)\">" +
            "<div style=\"font-size:20px;width:28px\">" + a.icon + "</div>" +
            "<div><div style=\"font-weight:700;font-size:12px\">" + a.label + "</div>" +
            "<div style=\"font-size:11px;color:var(--text-muted)\">" + a.desc + "</div></div></button>";
        }).join(""),
      "</div>"
    ].join("");
    modal.style.display = "flex";
    modal.style.display = 'flex';
  },

  _getRecommendedActions(c) {
    const actions = [];
    if (c.score >= 70) {
      actions.push({ type:'contact_now', icon:'📞', label:'Contatta ora', desc:'Cliente caldo — offri prodotto premium o bundle esclusivo' });
      actions.push({ type:'upsell', icon:'💎', label:'Proponi Upsell', desc:'LTV alto — proponi prodotti complementari o personalizzazioni' });
    } else if (c.score >= 45) {
      actions.push({ type:'follow_up', icon:'📧', label:'Invia Follow-up', desc:'Cliente tiepido — riattiva con promo o novità di catalogo' });
      actions.push({ type:'discount', icon:'🎫', label:'Offri Sconto Fedeltà', desc:'5-10% per incentivare il prossimo ordine' });
    } else if (c.score >= 25) {
      actions.push({ type:'reactivation', icon:'🔄', label:'Campagna Riattivazione', desc:'Lungo silenzio — invia newsletter con novità o offerta speciale' });
    } else {
      actions.push({ type:'win_back', icon:'💌', label:'Win-back Email', desc:'Cliente perso — ultimo tentativo con offerta significativa' });
      actions.push({ type:'archive', icon:'📁', label:'Archivia', desc:'Segna come inattivo e smetti di investire tempo' });
    }
    actions.push({ type:'note', icon:'📝', label:'Aggiungi nota', desc:'Annotazione rapida su questo cliente' });
    return actions;
  },

  async executeAction(clientId, type) {
    const client = this._all.find(c => c.id == clientId);
    const name = client ? (client.name||'il cliente') : 'il cliente';
    if (type === 'contact_now') { toast('📞 Promemoria: chiama ' + name + ' oggi!', 'info'); }
    else if (type === 'upsell')    { toast('💎 Apri il catalogo e proponi prodotti premium a ' + name, 'info'); }
    else if (type === 'follow_up') { toast('📧 Scrivi un email di follow-up a ' + name, 'info'); }
    else if (type === 'discount')  { toast('🎫 Crea un listino con sconto fedeltà per ' + name, 'info'); App.navigate('listino'); }
    else if (type === 'reactivation') { toast('🔄 Pianifica campagna riattivazione per ' + name, 'info'); }
    else if (type === 'win_back')  { toast('💌 Prepara email win-back per ' + name, 'info'); }
    else if (type === 'archive')   { toast('📁 ' + name + ' segnato come inattivo', 'info'); }
    else if (type === 'note') {
      const note = prompt('Nota per ' + name + ':');
      if (note && client) {
        await IDB.put('clients', { ...client, note_lead: note, note_ts: new Date().toISOString() }).catch(()=>{});
        toast('📝 Nota salvata', 'success');
      }
    }
    this.closeAction();
  },

  closeAction() { const m = eid('ls-action-modal'); if (m) m.style.display = 'none'; },

  async markPriority(clientId) {
    const client = this._all.find(c => c.id == clientId); if (!client) return;
    await IDB.put('clients', { ...client, leadPriority: !client.leadPriority, priorityTs: Date.now() }).catch(()=>{});
    toast((client.leadPriority ? '⭐ Priorità rimossa' : '⭐ Segnato come priorità'), 'success');
    await this.render();
  },

  exportCSV() {
    if (!this._filtered.length) { toast('Nessun dato da esportare', 'warning'); return; }
    const headers = ['Nome','Score','Segmento','Ordini','LTV €','Ultimo Acquisto (gg fa)','Email','Telefono'];
    const rows = this._filtered.map(c => [
      c.name||'', c.score, c.seg.label.replace(/[^\w\s]/g,''),
      c.orderCount, c.ltv.toFixed(2),
      c.daysSince < 9999 ? c.daysSince : '',
      c.email||'', c.phone||c.tel||''
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,﻿' + encodeURIComponent(csv);
    a.download = 'lead_scores_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    toast('✅ CSV esportato (' + this._filtered.length + ' clienti)', 'success');
  },
};


const ClientIntelligence = {
  _currentSeg: '',
  _ciPage: 0,
  _ciPageSize: 20,

  async render() {
    await BDW.init();
    this._renderSegmentGrid();
    this._renderClientList(this._currentSeg);
    this._renderRFMStrip();
  },

  _segDefs: [
    {key:'champions', label:'🏆 Champions', color:'#f59e0b', desc:'Alto LTV · Frequenti · Recenti'},
    {key:'loyal',     label:'💛 Loyal',     color:'#22c55e', desc:'Fedeli · Valore medio'},
    {key:'promising', label:'🚀 Promising',  color:'#38bdf8', desc:'Potenziale alto'},
    {key:'newbie',    label:'🌱 New',        color:'#a78bfa', desc:'Primo acquisto <30gg'},
    {key:'atRisk',    label:'🔴 At Risk',    color:'#ef4444', desc:'60-120gg senza acquisti'},
    {key:'lost',      label:'💀 Lost',       color:'#6b7280', desc:'>120gg inattivi'},
    {key:'needsAttention',label:'⚠️ Needs Attn',color:'#fb923c',desc:'Basso valore, attivi'},
  ],

  _renderSegmentGrid() {
    const el = eid('ci-segments-grid'); if(!el) return;
    const segs = BDW.segments;
    el.innerHTML = this._segDefs.map(s=>{
      const n = (segs[s.key]||[]).length;
      const isActive = this._currentSeg===s.key;
      return `<div onclick="ClientIntelligence.filterSeg('${s.key}')"
        style="text-align:center;padding:12px 6px;background:var(--bg-card);border-radius:10px;border:2px solid ${isActive?s.color:s.color+'40'};cursor:pointer;transition:all .2s"
        onmouseover="this.style.borderColor='${s.color}'" onmouseout="this.style.borderColor='${this._currentSeg===s.key?s.color:s.color+'40'}'">
        <div style="font-size:22px;font-weight:900;color:${s.color}">${n}</div>
        <div style="font-size:10px;font-weight:700;margin-top:2px;color:${s.color}">${s.label}</div>
        <div style="font-size:9px;color:var(--text-dim);margin-top:2px">${s.desc}</div>
      </div>`;
    }).join('');
  },

  filterSeg(seg) {
    this._currentSeg = this._currentSeg===seg ? '' : seg;
    this._ciPage = 0;
    this._renderSegmentGrid();
    this._renderClientList(this._currentSeg);
  },

  _renderClientList(seg) {
    const el = eid('ci-client-list'); if(!el) return;
    const segs = BDW.segments;
    const scores = BDW.leadScores;
    let clients;
    if(seg) clients = segs[seg]||[];
    else clients = Object.values(segs).flat();
    clients = clients.sort((a,b)=>(scores[b.id]||0)-(scores[a.id]||0));

    if(!clients.length){
      el.innerHTML=`<div style="text-align:center;padding:30px;color:var(--text-dim)"><i class="fas fa-users" style="font-size:28px;opacity:.2;display:block;margin-bottom:10px"></i>Nessun cliente con acquisti registrati.<br><small>Aggiungi vendite per vedere l'analisi RFM.</small></div>`;
      return;
    }

    const segColors = {};
    this._segDefs.forEach(s=>segColors[s.key]=s.color);

    const ps = this._ciPageSize || 20;
    const totalPages = Math.max(1, Math.ceil(clients.length / ps));
    if (this._ciPage >= totalPages) this._ciPage = 0;
    const pg = this._ciPage || 0;
    const pageItems = clients.slice(pg * ps, pg * ps + ps);

    const rowsHtml = pageItems.map(c=>{
      const score = scores[c.id]||0;
      const cseg = Object.entries(BDW.segments).find(([,v])=>v.some(x=>String(x.id)===String(c.id)))?.[0]||'';
      const col = segColors[cseg]||'#64748b';
      const segDef = this._segDefs.find(s=>s.key===cseg);
      return `<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border);transition:background .15s" class="ls-row-hover">
        <div style="width:34px;height:34px;border-radius:50%;background:${col}20;border:2px solid ${col};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:${col};flex-shrink:0">${(c.name||'?')[0].toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name||'—'}</div>
          <div style="font-size:10px;color:var(--text-muted)">${c.email||c.phone||'—'} · ${c.daysSince||0}gg fa · ${c.n||0} ordini</div>
        </div>
        <div style="min-width:110px">
          <div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:3px">
            <span style="color:var(--text-dim)">Score</span>
            <span style="font-weight:800;color:${col}">${score}/100</span>
          </div>
          <div style="height:5px;background:var(--border);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${score}%;background:${col};border-radius:99px;transition:width .6s"></div>
          </div>
        </div>
        <div style="text-align:right;min-width:90px;flex-shrink:0">
          <div style="font-size:12px;font-weight:700;color:var(--primary)">${fmtCur(c.ltv||c.rev||0)}</div>
          <div style="font-size:9px;padding:2px 6px;background:${col}20;color:${col};border-radius:99px;font-weight:700;display:inline-block;margin-top:2px">${segDef?.label||cseg}</div>
        </div>
      </div>`;
    }).join('');

    const bs = 'padding:4px 10px;border:1px solid var(--border);border-radius:7px;background:var(--bg-card2);cursor:pointer;color:var(--text);font-size:11px';
    const bas = 'padding:4px 10px;border:1px solid #a855f7;border-radius:7px;background:rgba(168,85,247,.1);cursor:pointer;color:#a855f7;font-size:11px;font-weight:700';
    const paginHtml = totalPages > 1 ? `<div style="display:flex;justify-content:center;align-items:center;gap:5px;padding:8px 14px;border-top:1px solid var(--border)">
      <button onclick="ClientIntelligence._ciPage=Math.max(0,(ClientIntelligence._ciPage||0)-1);ClientIntelligence._renderClientList(ClientIntelligence._currentSeg)" style="${bs}" ${pg===0?'disabled':''}>‹</button>
      ${Array.from({length:Math.min(7,totalPages)},(_,i)=>{const p=Math.max(0,pg-3)+i;return p<totalPages?`<button onclick="ClientIntelligence._ciPage=${p};ClientIntelligence._renderClientList(ClientIntelligence._currentSeg)" style="${p===pg?bas:bs}">${p+1}</button>`:''}).join('')}
      <button onclick="ClientIntelligence._ciPage=Math.min(${totalPages-1},(ClientIntelligence._ciPage||0)+1);ClientIntelligence._renderClientList(ClientIntelligence._currentSeg)" style="${bs}" ${pg>=totalPages-1?'disabled':''}>›</button>
      <span style="font-size:10px;color:var(--text-muted)">${pg+1}/${totalPages} · ${clients.length} clienti</span>
    </div>` : '';

    el.innerHTML = rowsHtml + paginHtml;
  },

  _renderRFMStrip() {
    const el = eid('rfm-strip'); if(!el) return;
    const m = BDW.metrics.clients;
    const segs = BDW.segments;
    el.innerHTML = `<div style="background:linear-gradient(135deg,#a855f715,#6366f115);border:1px solid #a855f730;border-radius:12px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-size:12px;font-weight:800;color:#a855f7">🎯 RFM Intelligence</div>
        <div style="font-size:10px;color:var(--text-muted)">LTV medio: ${fmtCur(m.ltvAvg)} · ${m.total} clienti profilati</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${[['🏆',m.champions,'#f59e0b','Champions'],['💛',m.loyal,'#22c55e','Loyal'],['🚀',m.promising,'#38bdf8','Promising'],['🔴',m.atRisk,'#ef4444','At Risk'],['💀',m.lost,'#6b7280','Lost']].map(([ic,n,col,lbl])=>`
          <div onclick="App.navigate('clientintel')" style="text-align:center;padding:6px 10px;background:${col}15;border:1px solid ${col}40;border-radius:8px;cursor:pointer;min-width:52px">
            <div style="font-size:14px;font-weight:900;color:${col}">${n}</div>
            <div style="font-size:9px;color:${col};font-weight:700">${ic} ${lbl}</div>
          </div>`).join('')}
        <button onclick="App.navigate('clientintel')" style="padding:6px 12px;background:#a855f7;border:none;color:#fff;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700">→ Dettagli</button>
      </div>
    </div>`;
  },

  async runAI() {
    const el = eid('ci-ai-result'); if(!el) return;
    await BDW.init();
    const m = BDW.metrics.clients;
    const segs = BDW.segments;
    el.innerHTML=`<div class="card" style="border:1px solid #a855f740"><div style="text-align:center;padding:20px;color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> AI analizza i clienti...</div></div>`;
    const prompt=`Sei un CRM expert per un artigiano italiano laser.
Clienti totali: ${m.total} | Champions: ${m.champions} | Loyal: ${m.loyal} | Promising: ${m.promising} | At Risk: ${m.atRisk} | Lost: ${m.lost}
LTV medio: €${m.ltvAvg.toFixed(0)}
Top champions: ${segs.champions.slice(0,3).map(c=>c.name||'N/A').join(', ')||'nessuno ancora'}
At risk: ${segs.atRisk.slice(0,3).map(c=>c.name||'N/A').join(', ')||'nessuno'}

Fornisci 3 azioni pratiche:
1. 🚨 Azione IMMEDIATA per i clienti at-risk (testo messaggio da inviare)
2. 💰 Strategia upsell per i champions
3. 🌱 Come trasformare i "promising" in loyal

Sii concreto, in italiano, max 200 parole.`;
    try{
      const r=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:400,messages:[{role:'user',content:prompt}]})
      });
      const data=await r.json();
      const text=data.content?.find(b=>b.type==='text')?.text||'—';
      el.innerHTML=`<div class="card" style="border:1px solid #a855f740;background:#a855f708">
        <div style="font-size:11px;color:#a855f7;font-weight:700;margin-bottom:10px">🧠 AI Client Intelligence Brief</div>
        <div style="font-size:12px;line-height:1.7;white-space:pre-line">${text}</div>
      </div>`;
    }catch(e){
      el.innerHTML=`<div class="card" style="border:1px solid #ef444430;color:#ef4444;font-size:11px;padding:12px">AI non disponibile: ${e.message}</div>`;
    }
  },

  exportCSV() {
    const segs = BDW.segments;
    const scores = BDW.leadScores;
    const rows = [['Nome','Email','Segmento','LTV €','Ordini','Score','Giorni inattivi']];
    Object.entries(segs).forEach(([seg,clients])=>{
      clients.forEach(c=>rows.push([c.name||'',c.email||'',seg,(c.ltv||c.rev||0).toFixed(2),c.n||0,scores[c.id]||0,c.daysSince||0]));
    });
    const csv = rows.map(r=>r.join(';')).join('\n');
    const a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download=`Clienti_RFM_${new Date().toLocaleDateString('it-IT').replace(/\//g,'-')}.csv`;
    a.click();
    toast('📊 CSV esportato','success');
  },
};

// ── GROWTH ENGINE ──────────────────────────────────────────────────────────────
window.ClientIntelligenceEngine = ClientIntelligenceEngine;
window.Clients = Clients;
window.ClientLifecycle = ClientLifecycle;
window.ClientPricing = typeof ClientPricing !== 'undefined' ? ClientPricing : {};
window.ClientTimeline = ClientTimeline;
window.LeadScorer = LeadScorer;
window.ClientIntelligence = ClientIntelligence;

