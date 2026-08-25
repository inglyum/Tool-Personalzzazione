
// === /src/modules/quoter/index.js ===
// Quoter Module - INGLY OS v88
const RecurringInvoices = {
  _page: 0,
  _pageSize: 15,
  _search: '',

  // ── Compute next date after current nextDate ──────────────────────────
  _nextDate(from, freq) {
    const d = new Date(from);
    switch(freq) {
      case 'weekly':    d.setDate(d.getDate() + 7); break;
      case 'monthly':   d.setMonth(d.getMonth() + 1); break;
      case 'quarterly': d.setMonth(d.getMonth() + 3); break;
      case 'yearly':    d.setFullYear(d.getFullYear() + 1); break;
    }
    return d.toISOString().split('T')[0];
  },

  _freqLabel: { weekly:'Settimanale', monthly:'Mensile', quarterly:'Trimestrale', yearly:'Annuale' },

  // ── Check + auto-generate due invoices (called at startup) ────────────
  async checkAndGenerate() {
    try {
      const templates = await IDB.getAll('recurring_invoices').catch(()=>[]);
      const today = (()=>new Date().toISOString().split('T')[0])();
      let generated = 0;

      for (const tmpl of templates) {
        if (!tmpl.active) continue;
        if (!tmpl.nextDate || tmpl.nextDate > today) continue;

        // Generate a sale record
        const sale = {
          id: Date.now() + Math.floor(Math.random()*999),
          clientId:   tmpl.clientId,
          clientName: tmpl.clientName || '—',
          date:       today(),
          desc:       tmpl.description || tmpl.name,
          amount:     tmpl.amount,
          netAmount:  tmpl.netAmount || tmpl.amount,
          vatAmount:  tmpl.vatAmount || 0,
          status:     'da_pagare',
          channel:    'Ricorrente',
          invoiceNo:  `RC-${today}`,
          fromRecurringId: tmpl.id,
          lines: tmpl.lines || [],
        };
        const saleId = await IDB.put('sales', sale);

        // Advance nextDate
        tmpl.nextDate = new Date(new Date(tmpl.nextDate).getTime() + (tmpl.freq||30)*86400000).toISOString().split('T')[0];
        tmpl.lastGenerated = today();
        tmpl.generatedCount = (tmpl.generatedCount || 0) + 1;
        await IDB.put('recurring_invoices', tmpl);

        Bus.emit('sale:created', { id: saleId, recurring: true });
        generated++;
      }

      if (generated > 0) {
        toast(`✅ ${generated} fattura/e ricorrente/i generate automaticamente`, 'info');
        Bus.emit('data:updated', { store: 'sales' });
      }
    } catch(e) {
      console.warn('[RecurringInvoices.checkAndGenerate]', e);
    }
  },

  // ── Save a template ───────────────────────────────────────────────────
  async save(data) {
    if (!data.name) { toast('Inserisci un nome per il template','warning'); return; }
    if (!data.amount || data.amount <= 0) { toast('Inserisci un importo valido','warning'); return; }
    if (!data.freq)  { toast('Seleziona la frequenza','warning'); return; }
    if (!data.nextDate) data.nextDate = data.startDate;
    data.active = data.active !== false;
    const id = await IDB.put('recurring_invoices', data).catch(()=>{});
    toast(`✅ Template "${data.name}" salvato`, 'success');
    this.render();
    return id;
  },

  // ── Render the recurring invoices management page ─────────────────────
  async render() {
    const el = document.getElementById('view-xmlsdi');
    if (!el) return;

    const templates = (await IDB.getAll('recurring_invoices').catch(()=>[])).sort((a,b)=>a.name?.localeCompare(b.name||''));
    const clients = await AppStore.get('clients').catch(()=>[]);
    const clientOpts = clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');

    // Build inline section (injected into XMLSDI page)
    let existing = document.getElementById('recurring-section');
    if (existing) existing.remove();

    const section = document.createElement('div');
    section.id = 'recurring-section';
    section.style.cssText = 'margin-top:24px;max-width:1100px';
    section.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div>
          <div style="font-size:17px;font-weight:800;color:#8b5cf6">🔄 Fatture Ricorrenti</div>
          <div style="font-size:12px;color:var(--text-muted)">Template per fatture mensili/trimestrali/annuali automatiche</div>
        </div>
        <button onclick="RecurringInvoices._openNewModal()" style="padding:8px 16px;background:#8b5cf6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700"><i class="fas fa-plus"></i> Nuovo Template</button>
      </div>

      ${templates.length === 0 ? `
        <div style="text-align:center;padding:40px;background:var(--bg-card);border-radius:12px;border:1px dashed var(--border)">
          <div style="font-size:36px;margin-bottom:12px">🔄</div>
          <div style="font-weight:700;margin-bottom:6px">Nessun template ancora</div>
          <div style="font-size:12px;color:var(--text-muted)">Crea un template per generare fatture automaticamente ogni mese, trimestre o anno</div>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:10px">
          ${templates.map(t => {
            const daysLeft = t.nextDate ? Math.ceil((new Date(t.nextDate)-new Date())/86400000) : null;
            const urgency = daysLeft !== null && daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : 'var(--green)';
            return `
              <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:var(--bg-card);border:1px solid ${t.active?'var(--border2)':'var(--border)'};border-radius:12px;opacity:${t.active?1:.6}">
                <div style="width:40px;height:40px;background:#8b5cf615;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🔄</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700;font-size:14px">${t.name}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${t.clientName||'—'} · ${this._freqLabel[t.freq]||t.freq} · €${(+t.amount).toFixed(2)}</div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-size:12px;color:${urgency};font-weight:700">${t.nextDate || '—'}</div>
                  <div style="font-size:10px;color:var(--text-muted)">${daysLeft !== null ? `tra ${daysLeft}gg` : 'non pianificata'}</div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0">
                  <button onclick="RecurringInvoices._toggle(${t.id})" title="${t.active?'Disattiva':'Attiva'}" style="padding:5px 10px;background:${t.active?'#22c55e20':'var(--bg-card2)'};color:${t.active?'#22c55e':'var(--text-muted)'};border:1px solid ${t.active?'#22c55e40':'var(--border)'};border-radius:6px;cursor:pointer;font-size:11px">${t.active?'✓ Attivo':'○ Off'}</button>
                  <button onclick="RecurringInvoices._generateNow(${t.id})" title="Genera ora" style="padding:5px 10px;background:#8b5cf620;color:#a78bfa;border:1px solid #8b5cf630;border-radius:6px;cursor:pointer;font-size:11px">⚡ Ora</button>
                  <button onclick="RecurringInvoices._delete(${t.id})" title="Elimina" style="padding:5px 8px;background:#ef444420;color:#f87171;border:1px solid #ef444430;border-radius:6px;cursor:pointer;font-size:11px">✕</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}

      <!-- New Template Modal -->
      <div id="modal-recurring" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;align-items:center;justify-content:center;padding:20px">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;width:100%;max-width:480px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.7)">
          <div style="padding:18px 22px;border-bottom:1px solid var(--border);background:var(--bg-card2);display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:15px;font-weight:800">🔄 Nuovo Template Ricorrente</div>
            <button onclick="document.getElementById('modal-recurring').style.display='none'" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;width:28px;height:28px;border-radius:8px;font-size:13px">✕</button>
          </div>
          <div style="padding:20px 22px;display:flex;flex-direction:column;gap:12px">
            <div><label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:5px">Nome Template</label><input id="ri-name-2" class="form-control" placeholder="Es: Canone mensile sito web"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div><label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:5px">Cliente</label>
                <select id="ri-client-2" class="form-control"><option value="">— Senza cliente —</option>${clientOpts}</select>
              </div>
              <div><label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:5px">Frequenza</label>
                <select id="ri-freq-2" class="form-control">
                  <option value="monthly">Mensile</option>
                  <option value="quarterly">Trimestrale</option>
                  <option value="yearly">Annuale</option>
                  <option value="weekly">Settimanale</option>
                </select>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div><label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:5px">Importo €</label><input id="ri-amount-2" class="form-control" type="number" step="0.01" min="0" placeholder="0.00"></div>
              <div><label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:5px">Prima data</label><input id="ri-start" class="form-control" type="date" value="${today()}"></div>
            </div>
            <div><label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:5px">Descrizione fattura</label><input id="ri-desc-2" class="form-control" placeholder="Es: Canone hosting + manutenzione"></div>
            <div style="padding:10px 12px;background:var(--bg-card2);border-radius:8px;font-size:11px;color:var(--text-muted)">
              ℹ️ La fattura verrà creata automaticamente come <strong style="color:var(--text)">vendita "da pagare"</strong> alla data di scadenza. Puoi poi convertirla in XML SDI con un click.
            </div>
          </div>
          <div style="padding:14px 22px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;background:var(--bg-card2)">
            <button onclick="document.getElementById('modal-recurring').style.display='none'" style="padding:8px 16px;background:transparent;border:1px solid var(--border);color:var(--text-muted);border-radius:8px;cursor:pointer;font-size:12px">Annulla</button>
            <button onclick="RecurringInvoices._saveFromModal()" style="padding:8px 20px;background:#8b5cf6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">💾 Salva Template</button>
          </div>
        </div>
      </div>
    `;

    // Append after the XMLSDI content
    const xmlsdiEl = document.getElementById('view-xmlsdi');
    if (xmlsdiEl) xmlsdiEl.appendChild(section);
  },

  _openNewModal() {
    const modal = document.getElementById('modal-recurring');
    if (modal) { modal.style.display = 'flex'; }
  },

  async _saveFromModal() {
    const clients = await AppStore.get('clients').catch(()=>[]);
    const clientId = document.getElementById('ri-client')?.value;
    const client = clients.find(c => c.id == clientId);
    await this.save({
      name:        document.getElementById('ri-name')?.value?.trim(),
      clientId:    clientId ? +clientId : null,
      clientName:  client?.name || '',
      freq:        document.getElementById('ri-freq')?.value || 'monthly',
      amount:      parseFloat(document.getElementById('ri-amount')?.value) || 0,
      startDate:   document.getElementById('ri-start')?.value || today(),
      nextDate:    document.getElementById('ri-start')?.value || today(),
      description: document.getElementById('ri-desc')?.value?.trim() || '',
      active:      true,
    });
    document.getElementById('modal-recurring')?.remove();
    this.render();
  },

  async _toggle(id) {
    const tmpl = await IDB.get('recurring_invoices', id);
    if (!tmpl) return;
    tmpl.active = !tmpl.active;
    await IDB.put('recurring_invoices', tmpl);
    this.render();
  },

  async _delete(id) {
    if (!confirm('Eliminare questo template ricorrente?')) return;
    await IDB.del('recurring_invoices', id)
    toast('Template eliminato','warning');
    this.render();
  },

  async _generateNow(id) {
    const tmpl = await IDB.get('recurring_invoices', id);
    if (!tmpl) return;
    const sale = {
      clientId: tmpl.clientId, clientName: tmpl.clientName || '—',
      date: today(), desc: tmpl.description || tmpl.name,
      amount: tmpl.amount, netAmount: +(tmpl.amount||0), status: 'da_pagare', channel: 'Ricorrente',
      invoiceNo: `RC-${today().replace(/-/g,'')}-${tmpl.id}`,
      fromRecurringId: tmpl.id,
    };
    const saleId = await IDB.put('sales', sale).catch(()=>{});
    tmpl.nextDate = this._nextDate(today(), tmpl.freq);
    tmpl.lastGenerated = today();
    tmpl.generatedCount = (tmpl.generatedCount || 0) + 1;
    await IDB.put('recurring_invoices', tmpl);
    toast(`✅ Fattura generata — ${fmtCur(tmpl.amount)} da pagare`, '🔄');
    Bus.emit('data:updated', { store: 'sales' });
    this.render();
    if (confirm('Aprire il generatore XML SDI per questa fattura?')) {
      App.navigate('xmlsdi');
      setTimeout(() => XMLSDI.prefillFromSale?.(saleId), 800);
    }
  },

  // ── Open new template form ──────────────────────────────────────────
  async _openNewForm() {
    const formCard = document.getElementById('ri-form-card');
    if (!formCard) { toast('Form non trovato — vai alla sezione Fatture Ricorrenti', 'warning'); App.navigate('recurring'); return; }
    // Pre-fill today + 1 month
    const nextDate = document.getElementById('ri-nextdate');
    if (nextDate) { const d=new Date(); d.setMonth(d.getMonth()+1); nextDate.value=d.toISOString().split('T')[0]; }
    // Populate client select
    const clients = await AppStore.get('clients').catch(()=>[]);
    const sel = document.getElementById('ri-client');
    if (sel) sel.innerHTML = '<option value="">— Nessun cliente —</option>' +
      clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    formCard.style.display = 'block';
    formCard.scrollIntoView({behavior:'smooth'});
  },

  _closeForm() {
    const f = document.getElementById('ri-form-card');
    if (f) f.style.display = 'none';
    ['ri-name','ri-amount','ri-desc'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  },

  async saveTemplate() {
    const name = document.getElementById('ri-name')?.value?.trim();
    const amount = parseFloat(document.getElementById('ri-amount')?.value || 0);
    const clientEl = document.getElementById('ri-client');
    const clientId = clientEl?.value ? +clientEl.value : null;
    const clients = await AppStore.get('clients').catch(()=>[]);
    const client = clients.find(c=>c.id===clientId);
    const freq = document.getElementById('ri-freq')?.value || 'monthly';
    const desc = document.getElementById('ri-desc')?.value?.trim() || name;
    const nextDate = document.getElementById('ri-nextdate')?.value || today();

    if (!name) { toast('Inserisci un nome per il template', 'warning'); return; }
    if (!amount || amount <= 0) { toast('Inserisci un importo valido', 'warning'); return; }
    const tmpl = { id: Date.now(),
      name, desc, amount, freq,
      clientId, clientName: client?.name || '',
      nextDate, active: true,
      createdAt: today(), generatedCount: 0
    };
    await IDB.put('recurring_invoices', tmpl);
    toast(`✅ Template "${name}" salvato — prossima generazione: ${nextDate}`);
    this._closeForm();
    await this.renderView();
  },

  // ── Render the view-recurring page ──────────────────────────────────
  _setSearch(val) { this._search = (val||'').trim().toLowerCase(); this._page = 0; this.renderView(); },
  _goPage(p) { this._page = p; this.renderView(); },

  async renderView() {
    const templates = await IDB.getAll('recurring_invoices').catch(()=>[]);
    const el = document.getElementById('ri-list');
    if (!el) return;

    // Update stats
    const active = templates.filter(t=>t.active);
    const monthlyVal = active.reduce((a,t)=>{
      if(t.freq==='monthly') return a+t.amount;
      if(t.freq==='weekly') return a+t.amount*4.33;
      if(t.freq==='quarterly') return a+t.amount/3;
      if(t.freq==='yearly') return a+t.amount/12;
      return a;
    }, 0);
    const allSales = await AppStore.get('sales').catch(()=>[]);
    const generatedCount = allSales.filter(s=>s.fromRecurringId).length;
    const nextDue = active
      .filter(t=>t.nextDate)
      .sort((a,b)=>a.nextDate.localeCompare(b.nextDate))[0];

    const statIds = {
      'ri-stat-active': active.length,
      'ri-stat-generated': generatedCount,
      'ri-stat-monthly': '€'+monthlyVal.toFixed(0),
      'ri-stat-next': nextDue ? nextDue.nextDate : '—'
    };
    for(const [id,val] of Object.entries(statIds)){
      const s = document.getElementById(id); if(s) s.textContent=val;
    }

    // search + pagination
    const srch = this._search || '';
    let filtered = templates.sort((a,b)=>a.nextDate?.localeCompare(b.nextDate||'')||0);
    if (srch) filtered = filtered.filter(t=>
      (t.name||'').toLowerCase().includes(srch) ||
      (t.clientName||'').toLowerCase().includes(srch) ||
      (t.desc||'').toLowerCase().includes(srch)
    );

    const ps = this._pageSize || 15;
    const totalPages = Math.max(1, Math.ceil(filtered.length / ps));
    if (this._page >= totalPages) this._page = totalPages - 1;
    const pg = this._page || 0;
    const pageItems = filtered.slice(pg * ps, pg * ps + ps);

    // search bar
    const searchBar = `<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
      <input type="text" placeholder="🔍 Cerca per nome, cliente..." value="${srch.replace(/"/g,'&quot;')}"
        oninput="RecurringInvoices._setSearch(this.value)"
        style="flex:1;padding:7px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-input);color:var(--text);font-size:13px">
      ${srch?`<button onclick="RecurringInvoices._setSearch('')" style="padding:6px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;color:var(--text-muted)">✕ Cancella</button>`:''}
      <span style="font-size:12px;color:var(--text-muted);white-space:nowrap">${filtered.length} template</span>
    </div>`;

    if (!filtered.length) {
      el.innerHTML = searchBar + `<div style="text-align:center;padding:40px;color:var(--text-dim)">
        <i class="fas fa-calendar-check" style="font-size:32px;opacity:.2;display:block;margin-bottom:12px"></i>
        ${srch ? 'Nessun template trovato per "'+srch+'".' : 'Nessun template. Clicca "Nuovo Template" per iniziare.'}
      </div>`;
      return;
    }

    const freqColors = {monthly:'#a78bfa',weekly:'#3b82f6',quarterly:'#f59e0b',yearly:'#22c55e'};
    const tableHTML = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="border-bottom:1px solid var(--border)">
        <th style="padding:10px;text-align:left;font-size:11px;color:var(--text-muted)">NOME</th>
        <th style="padding:10px;text-align:left;font-size:11px;color:var(--text-muted)">CLIENTE</th>
        <th style="padding:10px;text-align:left;font-size:11px;color:var(--text-muted)">FREQUENZA</th>
        <th style="padding:10px;text-align:right;font-size:11px;color:var(--text-muted)">IMPORTO</th>
        <th style="padding:10px;text-align:left;font-size:11px;color:var(--text-muted)">PROSSIMA</th>
        <th style="padding:10px;text-align:center;font-size:11px;color:var(--text-muted)">STATO</th>
        <th style="padding:10px;text-align:right;font-size:11px;color:var(--text-muted)">AZIONI</th>
      </tr></thead>
      <tbody>${pageItems.map(t=>{
        const isDue = t.nextDate <= today() && t.active;
        const fc = freqColors[t.freq] || 'var(--text-muted)';
        return `<tr style="border-bottom:1px solid var(--border);${isDue?'background:#fbbf2408':''}">
          <td style="padding:12px 10px">
            <div style="font-weight:700">${t.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${t.desc||''}</div>
          </td>
          <td style="padding:12px 10px;color:var(--text-muted)">${t.clientName||'—'}</td>
          <td style="padding:12px 10px">
            <span style="padding:3px 9px;border-radius:6px;font-size:11px;font-weight:700;background:${fc}20;color:${fc}">
              ${this._freqLabel[t.freq]||t.freq}
            </span>
          </td>
          <td style="padding:12px 10px;text-align:right;font-weight:700">€${(+t.amount||0).toFixed(2)}</td>
          <td style="padding:12px 10px;color:${isDue?'#fbbf24':'var(--text-muted)'}">
            ${t.nextDate||'—'} ${isDue?'⚠️ SCADUTA':''}
          </td>
          <td style="padding:12px 10px;text-align:center">
            <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" ${t.active?'checked':''} onchange="RecurringInvoices._toggle(${t.id})">
              <span style="font-size:11px;color:${t.active?'#22c55e':'var(--text-dim)'}">${t.active?'Attiva':'Pausa'}</span>
            </label>
          </td>
          <td style="padding:12px 10px;text-align:right">
            <div style="display:flex;gap:6px;justify-content:flex-end">
              <button onclick="RecurringInvoices._generateNow(${t.id})" style="padding:4px 10px;background:#22c55e20;color:#22c55e;border:1px solid #22c55e30;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700" title="Genera fattura adesso">▶ Genera</button>
              <button onclick="RecurringInvoices._delete(${t.id})" style="padding:4px 8px;background:#ef444420;color:#f87171;border:1px solid #ef444440;border-radius:6px;cursor:pointer;font-size:11px">🗑</button>
            </div>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;

    const paginationHTML = totalPages > 1 ? `<div style="display:flex;justify-content:center;align-items:center;gap:6px;margin-top:14px">
      <button onclick="RecurringInvoices._goPage(${pg-1})" ${pg===0?'disabled':''} style="padding:5px 12px;border:1px solid var(--border);border-radius:7px;background:var(--bg-card2);cursor:pointer;color:var(--text);font-size:12px${pg===0?';opacity:.4':''}">‹ Prec</button>
      <span style="font-size:12px;color:var(--text-muted)">Pagina ${pg+1} / ${totalPages}</span>
      <button onclick="RecurringInvoices._goPage(${pg+1})" ${pg>=totalPages-1?'disabled':''} style="padding:5px 12px;border:1px solid var(--border);border-radius:7px;background:var(--bg-card2);cursor:pointer;color:var(--text);font-size:12px${pg>=totalPages-1?';opacity:.4':''}">Succ ›</button>
    </div>` : '';

    el.innerHTML = searchBar + tableHTML + paginationHTML;
  }
};




// ===== APP CORE =====
const Quoter={
  lines:[],
  editId:null,
  _lastSavedId:null,

  addLineFromCalc(d){
    if(!d) return;
    this.lines.push({id:Date.now(), name:d.name, desc:d.name||'', catLabel:d.category||'', detail:'', unit:d.unit||'pz', qty:d.qty||1, unitCost:d.unitCost||0, markup:1.4, price:+((d.unitCost||0)*1.4).toFixed(2), subtotal:+((d.unitCost||0)*(d.qty||1)).toFixed(2)});
    this.renderLines();
    this.recalcRight();
    toast(`"${d.name}" aggiunto al preventivo`, 'success');
  },

  async init(){
    await App.populateClientSelects();
    this.lines=[];
    this.renderLines();
    this.recalcRight();
    await this.renderList();
    // init resource dropdown
    const sel=eid('ql-resource');
    if(sel)sel.innerHTML='<option value="">-- Scegli risorsa --</option>';
    // preload paint/color options from Magazzino
    await this.loadPaintOptions();
  },

  // ════════════════════════════════════════════════════════════════
  // loadResources — v63: TUTTO dal Magazzino (store items + paints + catalog)
  // Ogni categoria pesca i dati LIVE dagli store IDB corretti
  // ════════════════════════════════════════════════════════════════
  async loadResources(){
    const cat = eid('ql-cat')?.value || '';
    const sel = eid('ql-resource'); if(!sel) return;
    sel.innerHTML = '<option value="">-- Scegli risorsa --</option>';
    let items = [];

    // ── Helper: legge IDB items store filtrato per categoria ──
    const getMagazzinoItems = async (catKeys=[]) => {
      const all = await AppStore.get('items').catch(()=>[]);
      return catKeys.length ? all.filter(i => catKeys.includes(i.category || 'Altro')) : all;
    };

    if(cat === 'materiale'){
      // LEGNO · MDF · PLEXIGLASS · SUGHERO · CARTA · FELTRO · PELLE · METALLO dal Magazzino
      const matCats = ['Legno','MDF','Plexiglass','Sughero','Carta & Cartone','Feltro & Tessuto','Pelle','Metallo'];
      const mats = await getMagazzinoItems(matCats);
      mats.forEach(i => {
        const qty = +(i.quantity ?? i.qty ?? 0);
        const avail = qty <= 0 ? '❌' : qty <= +(i.minStock??1) ? '⚠️' : '✅';
        const dims = (i.width && i.height) ? ` ${i.width}×${i.height}${i.thickness?' ×'+i.thickness:''}mm` : '';
        items.push({
          label: `${avail} [🪵] ${i.name}${dims} — ${fmtCur(i.costPrice||0)}/${i.unit||'mq'}`,
          cost: i.costPrice||0, unit: i.unit||'mq', name: i.name,
          id: i.id, group: i.category||'Materiale',
          dims: dims.trim(), supplier: i.supplier||''
        });
      });
      // Fallback: vecchio store materials
      const old = (await AppStore.get('materials').catch(()=>[])).filter(m=>m.type==='material');
      old.forEach(m => items.push({
        label: `[🔧] ${m.name} — ${fmtCur(m.cost)} ${m.unit}`,
        cost: m.cost, unit: m.unit, name: m.name, group: 'Materiali (Legacy)'
      }));

    } else if(cat === 'verniciatura'){
      // VERNICI dal store paints (con calcolo costo/m² reale)
      const paints = await IDB.getAll('paints').catch(()=>[]);
      paints.forEach(p => {
        const tipo = p.tipo || p.type || 'smalto';
        const cov = tipo==='spray' ? 8 : tipo==='smalto' ? 6 : tipo==='epossidica' ? 4 : 10;
        const cpm = (p.costoUnitario || p.cost || 0) / cov;
        const ral = p.ral ? ` RAL${p.ral}` : '';
        items.push({
          label: `[🎨] ${p.nome||p.name}${ral} (${tipo}) — ${fmtCur(cpm)}/m²`,
          cost: cpm, unit: 'm²', name: p.nome||p.name,
          group: 'Vernici', paintId: p.id, tipo, coverage: cov,
          unitCost: p.costoUnitario||p.cost||0
        });
      });
      // Colori & Finitura dal Magazzino
      const colori = await getMagazzinoItems(['Colori & Finitura']);
      colori.forEach(i => {
        const cpm = (i.costPrice||0) / 6; // assume 6m²/unità default
        items.push({
          label: `[🖌️] ${i.name} (Magazzino) — ${fmtCur(cpm)}/m²`,
          cost: cpm, unit: 'm²', name: i.name,
          group: 'Colori Magazzino', id: i.id
        });
      });
      if(!paints.length && !colori.length){
        [{name:'Verniciatura Bianca',cost:8},{name:'Verniciatura Colorata RAL',cost:12},
         {name:'Spray Acrilico',cost:6.5},{name:'Vernice Epossidica',cost:18},{name:'Primer',cost:5.5}
        ].forEach(v => items.push({...v, unit:'m²', group:'Default', label:`[🎨] ${v.name} — ${fmtCur(v.cost)}/m²`}));
      }

    } else if(cat === 'laser'){
      // MACCHINARI dal Magazzino
      const macch = await getMagazzinoItems(['Macchinari']);
      macch.forEach(i => {
        const cpm = i.costPerMin || i.costPrice || 0.35;
        items.push({
          label: `[⚡] ${i.name} — ${fmtCur(cpm)}/min`,
          cost: cpm, unit: '€/min', name: i.name,
          group: 'Macchinari', id: i.id
        });
      });
      // Fallback macchine vecchio store
      const oldMach = (await AppStore.get('materials').catch(()=>[])).filter(m=>m.type==='machine');
      oldMach.forEach(m => items.push({
        label: `[⚙️] ${m.name} — ${fmtCur(m.cost)}/min`,
        cost: m.cost, unit: '€/min', name: m.name, group: 'Macchine (Legacy)'
      }));
      // Default da impostazioni
      const cfg = await IDB.get('settings','main')||{};
      items.unshift({
        label: `[🔥] Laser Generico — ${fmtCur(cfg.machineCost||0.35)}/min`,
        cost: cfg.machineCost||0.35, unit:'€/min', name:'Laser Generico', group:'Default'
      });

    } else if(cat === 'manodopera'){
      // Manodopera da impostazioni + team
      const cfg = await IDB.get('settings','main')||{};
      items.push({
        label:`[👷] Manodopera Generica — ${fmtCur(cfg.laborCost||0.50)}/min`,
        cost: cfg.laborCost||0.50, unit:'€/min', name:'Manodopera Generica', group:'Default'
      });
      const team = await IDB.getAll('team').catch(()=>[]);
      team.forEach(t => items.push({
        label:`[👤] ${t.name} (${t.role||'Team'}) — €${(+(t.rate||30)/60).toFixed(2)}/min`,
        cost: +(+(t.rate||30)/60).toFixed(4), unit:'€/min', name:t.name, group: t.role||'Team'
      }));

    } else if(cat === 'gadget'){
      // GADGET · LED · MINUTERIA · PACKAGING · PORTACHIAVI dal Magazzino
      const gadgetCats = ['Gadget','LED & Illuminazione','Minuteria','Packaging','Portachiavi','Frame & Cornici','Lightbox','Adesivi','Magneti'];
      const gadgets = await getMagazzinoItems(gadgetCats);
      gadgets.forEach(i => {
        const qty = +(i.quantity ?? i.qty ?? 0);
        const avail = qty <= 0 ? '❌' : qty <= +(i.minStock??1) ? '⚠️' : '✅';
        items.push({
          label: `${avail} [${i.category==='LED & Illuminazione'?'💡':i.category==='Minuteria'?'🔧':i.category==='Magneti'?'🧲':'🎁'}] ${i.name} — ${fmtCur(i.costPrice||0)}/${i.unit||'pz'}`,
          cost: i.costPrice||0, unit: i.unit||'pz', name: i.name,
          group: i.category||'Gadget', id: i.id
        });
      });
      // Fallback vecchio store gadgets
      const oldG = await IDB.getAll('gadgets').catch(()=>[]);
      oldG.forEach(g => items.push({
        label:`[🎁] ${g.name} — ${fmtCur(g.cost||0)}/${g.unit||'pz'}`,
        cost: g.cost||0, unit:g.unit||'pz', name:g.name, group:'Gadget (Legacy)'
      }));

    } else if(cat === 'catalogo'){
      const catalog = await AppStore.get('catalog').catch(()=>[]);
      catalog.forEach(c => items.push({
        label:`[📋] ${c.name} (${c.category||'Catalogo'}) — costo ${fmtCur(c.costPrice)}`,
        cost: c.costPrice, unit:'pz', sale: c.salePrice, name: c.name,
        group: c.category||'Catalogo'
      }));
    }

    // Populate hidden select (backward compat)
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.textContent = item.label;
      opt.dataset.cost = item.cost;
      opt.dataset.unit = item.unit||'pz';
      opt.dataset.name = item.name||'';
      if(item.sale) opt.dataset.sale = item.sale;
      if(item.id)   opt.dataset.itemId = item.id;
      sel.appendChild(opt);
    });

    // Update Resource Picker modal if open
    this._rpData = items;
    const rpl = eid('rp-items-list');
    if(rpl) this._renderRPList(items, rpl);
  },

  async loadPaintOptions(){
    const sel = eid('ql-color-paint'); if(!sel) return;
    sel.innerHTML = '<option value="">🎨 Seleziona vernice/finitura dal listino…</option>';
    const paints = await IDB.getAll('paints').catch(()=>[]);
    const colori = await AppStore.get('items').catch(()=>[]);
    const filteredColori = colori.filter(i=>i.category==='Colori & Finitura');

    if(paints.length){
      const grp1 = document.createElement('optgroup'); grp1.label = '🎨 Vernici & Spray';
      paints.forEach(p=>{
        const tipo = p.tipo||p.type||'smalto';
        const cov = tipo==='spray'?8:tipo==='smalto'?6:tipo==='epossidica'?4:10;
        const cpm = (p.costoUnitario||p.cost||0)/cov;
        const o = document.createElement('option');
        o.value = p.id||p.nome||p.name;
        o.textContent = `${p.nome||p.name}${p.ral?' RAL'+p.ral:''} (${tipo}) — ${fmtCur(cpm)}/m²`;
        o.dataset.costPerMq = cpm; o.dataset.tipo = tipo; o.dataset.coverage = cov;
        o.dataset.ral = p.ral||''; o.dataset.name = p.nome||p.name;
        o.dataset.hex = p.hex||''; grp1.appendChild(o);
      }); sel.appendChild(grp1);
    }
    if(filteredColori.length){
      const grp2 = document.createElement('optgroup'); grp2.label = '🖌️ Colori Magazzino';
      filteredColori.forEach(i=>{
        const o = document.createElement('option');
        o.value = i.id; o.textContent = `${i.name} — ${fmtCur(i.costPrice||0)}/${i.unit||'pz'}`;
        o.dataset.name = i.name; o.dataset.hex = i.hex||''; grp2.appendChild(o);
      }); sel.appendChild(grp2);
    }
  },

  onPaintColorChange(){
    const sel = eid('ql-color-paint');
    const opt = sel?.options[sel.selectedIndex];
    if(!opt||!opt.value) { if(eid('ql-color-paint-info')) eid('ql-color-paint-info').style.display='none'; return; }
    if(opt.dataset.name) eid('ql-color-text').value = opt.dataset.name+(opt.dataset.ral?' RAL'+opt.dataset.ral:'');
    if(opt.dataset.hex && opt.dataset.hex.match(/^#[0-9a-f]{3,6}$/i)) eid('ql-color-pick').value = opt.dataset.hex;
    const info = eid('ql-color-paint-info');
    if(info&&opt.dataset.tipo){
      info.style.display='block';
      info.innerHTML=`<b>${opt.dataset.tipo}</b> · copertura ${opt.dataset.coverage}m²/ud · <b>${fmtCur(parseFloat(opt.dataset.costPerMq||0))}/m²</b>`;
    } else if(info) info.style.display='none';
    // If currently in verniciatura, also update unit cost
    if(eid('ql-cat')?.value==='verniciatura' && opt.dataset.costPerMq){
      if(eid('ql-unit-cost')) eid('ql-unit-cost').value = parseFloat(opt.dataset.costPerMq).toFixed(4);
      this.calcItem();
    }
  },

  _mani: 1,
  _setMani(n){
    this._mani=n;
    [1,2,3].forEach(i=>{
      const b=eid('ql-mani-'+i); if(!b) return;
      const active=i===n;
      b.style.background=active?'var(--accent,#38bdf8)':'var(--bg-card2)';
      b.style.color=active?'#000':'var(--text-muted)';
    });
    this.calcItem();
  },

  async onCatChange(){
    const cat=eid('ql-cat').value;
    eid('ql-dims-group').style.display=(cat==='materiale'||cat==='verniciatura')?'':'none';
    eid('ql-min-group').style.display=(cat==='laser'||cat==='manodopera')?'':'none';
    const pg=eid('ql-paint-area-group');
    if(pg) pg.style.display=cat==='verniciatura'?'':'none';
    if(eid('ql-w'))eid('ql-w').value=0;
    if(eid('ql-h'))eid('ql-h').value=0;
    if(eid('ql-min'))eid('ql-min').value=0;
    if(eid('ql-unit-cost'))eid('ql-unit-cost').value=0;
    const rdl=eid('ql-resource-label');
    if(rdl) rdl.textContent='-- Scegli risorsa --';
    await this.loadResources();
    if(cat==='verniciatura') await this.loadPaintOptions();
  },

  onResourceChange(){
    const sel=eid('ql-resource');
    const opt=sel?.options[sel.selectedIndex];
    const cost=parseFloat(opt?.dataset?.cost||0);
    if(eid('ql-unit-cost'))eid('ql-unit-cost').value=cost.toFixed(4);
    // If catalog product, auto-fill sale price hint
    if(opt?.dataset?.sale&&eid('qr-markup')){
      const saleP=parseFloat(opt.dataset.sale);
      const markup=saleP>0?Math.round((saleP-cost)/cost*100):100;
      eid('qr-markup').value=markup>0?markup:100;
    }
    this.calcItem();
  },

  clearResource(){
    const sel=eid('ql-resource');if(sel)sel.selectedIndex=0;
    if(eid('ql-unit-cost'))eid('ql-unit-cost').value=0;
    this.calcItem();
  },

  calcItem(){
    const cat=eid('ql-cat')?.value||'';
    let cost=0;
    const unitCost=parseFloat(eid('ql-unit-cost')?.value||0);
    if(cat==='materiale'){
      const w=parseFloat(eid('ql-w')?.value||0);
      const h=parseFloat(eid('ql-h')?.value||0);
      const waste=parseFloat(eid('ql-waste')?.value||15);
      const mq=(w*h)/10000;
      cost=mq*unitCost*(1+waste/100);
    }else if(cat==='verniciatura'){
      const w=parseFloat(eid('ql-w')?.value||0);
      const h=parseFloat(eid('ql-h')?.value||0);
      const waste=parseFloat(eid('ql-waste')?.value||0);
      const mani=this._mani||1;
      const mq=(w*h)/10000;
      const mq_finale=mq*(1+waste/100)*mani;
      cost=mq_finale*unitCost;
      // Update info panel
      const info=eid('ql-paint-area-info');
      if(info&&mq>0){
        info.style.display='block';
        info.innerHTML=`🎨 ${mq.toFixed(2)}m² × ${mani} man${mani>1?'i':'o'} ${waste>0?'+ '+waste+'% sfrido':''}= <b>${mq_finale.toFixed(2)}m²</b> · Costo: <b>€${cost.toFixed(2)}</b>`;
      }else if(info) info.style.display='none';
    }else if(cat==='laser'||cat==='manodopera'){
      const min=parseFloat(eid('ql-min')?.value||0);
      cost=min*unitCost;
    }else{
      cost=unitCost;
    }
    // Update cost bar
    const bar=eid('ql-cost-bar');
    if(bar){const pct=Math.min(100,cost*3);bar.style.setProperty('--bar',pct+'%');}
    return cost;
  },

  onManualCost(){
    const cost=parseFloat(eid('ql-unit-cost')?.value||0);
    const bar=eid('ql-cost-bar');
    if(bar)bar.style.setProperty('--bar',Math.min(100,cost*3)+'%');
  },

  async addLine(){
    const cat=eid('ql-cat')?.value;
    if(!cat){toast('Seleziona una categoria','warning');return;}
    const resSel=eid('ql-resource');
    const resOpt=resSel?.options[resSel.selectedIndex];
    // Prefer the display label (set by resource picker) over raw select text
    const displayLabel=eid('ql-resource-label')?.textContent||'';
    const isLabelSet=displayLabel&&displayLabel!=='-- Scegli risorsa --';
    const resName=isLabelSet?displayLabel:(resOpt&&resOpt.value)?resOpt.textContent.split('—')[0].trim():'';
    const unitCost=parseFloat(eid('ql-unit-cost')?.value||0);
    const qty=Math.max(1,parseInt(eid('ql-qty')?.value||1));
    const colorText=eid('ql-color-text')?.value||'';
    const colorPick=eid('ql-color-pick')?.value||'';
    const catLabels={materiale:'Materiale',laser:'Laser',manodopera:'Manodopera',verniciatura:'Verniciatura',gadget:'Gadget/LED',catalogo:'Da Catalogo'};
    let calc=this.calcItem();
    let desc=resName||catLabels[cat]||cat;
    let detail='';
    if(cat==='materiale'){
      const w=parseFloat(eid('ql-w')?.value||0),h=parseFloat(eid('ql-h')?.value||0),waste=parseFloat(eid('ql-waste')?.value||15);
      detail=`${w}×${h}cm / Sfrido ${waste}%${colorText?' / '+colorText:''}`;
    }else if(cat==='verniciatura'){
      const w=parseFloat(eid('ql-w')?.value||0),h=parseFloat(eid('ql-h')?.value||0),waste=parseFloat(eid('ql-waste')?.value||0);
      const mani=this._mani||1;
      detail=`${w}×${h}cm × ${mani} man${mani>1?'i':'o'}${waste>0?' / Sfrido '+waste+'%':''}${colorText?' / 🎨'+colorText:''}`;
    }else if(cat==='laser'||cat==='manodopera'){
      const min=parseFloat(eid('ql-min')?.value||0);
      detail=`${min} min${colorText?' / '+colorText:''}`;
    }else{
      detail=colorText||catLabels[cat];
    }
    const unitFinal=calc>0?calc:unitCost;
    // Get unit from selected resource option
    const resUnit=(resOpt?.dataset?.unit)||'pz';
    const line={id:Date.now(),cat,catLabel:catLabels[cat],desc,detail,unitCost:+unitFinal.toFixed(4),unit:resUnit,qty,subtotal:+(unitFinal*qty).toFixed(2),color:colorText,colorPick};
    this.lines.push(line);
    this.renderLines();
    this.recalcRight();
    toast('✅ Voce aggiunta al preventivo!','success');
    if(eid('ql-qty'))eid('ql-qty').value=1;
    if(eid('ql-color-text'))eid('ql-color-text').value='';
  },

  removeLine(id){
    this.lines=this.lines.filter(l=>l.id!==id);
    this.renderLines();this.recalcRight();
  },

  renderLines(){
    const wrap=eid('ql-lines-wrap');
    const empty=eid('ql-lines-empty');
    const body=eid('ql-lines-body');
    if(!body)return;
    if(!this.lines.length){
      if(wrap)wrap.style.display='none';
      if(empty)empty.style.display='';
      this._updateTotals(0,0,0,0);
      return;
    }
    if(wrap)wrap.style.display='';
    if(empty)empty.style.display='none';
    body.innerHTML=this.lines.map(l=>`
      <tr style="border-top:1px solid var(--border)">
        <td style="padding:10px 6px">
          <div style="font-weight:600;font-size:13px;color:#fff">${l.desc}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${l.catLabel} · ${l.detail}</div>
          ${l.colorPick&&l.colorPick!='#8B5E3C'?`<span style="display:inline-block;width:10px;height:10px;background:${l.colorPick};border-radius:50%;margin-top:3px;vertical-align:middle"></span>`:''}</td>
        <td style="padding:10px 6px;text-align:center;color:var(--text)">${l.qty}</td>
        <td style="padding:10px 6px;text-align:right;color:var(--text-muted);font-size:12px">${fmtCur(l.unitCost)}</td>
        <td style="padding:10px 6px;text-align:right;font-weight:700;color:#fff">${fmtCur(l.subtotal)}</td>
        <td style="padding:10px 4px;text-align:right"><button onclick="Quoter.removeLine(${l.id})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:15px;padding:2px 4px">✕</button></td>
      </tr>`).join('');
    const totalCost=this.lines.reduce((a,l)=>a+(+(l.subtotal)||((+(l.unitCost)||0)*(+(l.qty)||1))),0);
    const markup=parseFloat(eid('qr-markup')?.value||100)/100;
    const discount=parseFloat(eid('qr-discount')?.value||0)/100;
    const net=totalCost*(1+markup)*(1-discount);
    const vatRate=this._ivaMode!==false?0.22:0;
    const vat=net*vatRate;
    const gross=net+vat;
    this._updateTotals(totalCost,net,vat,gross);
  },

  _updateTotals(cost,net,vat,gross){
    if(eid('ql-tot-cost'))eid('ql-tot-cost').textContent=fmtCur(cost);
    if(eid('ql-tot-net'))eid('ql-tot-net').textContent=fmtCur(net);
    if(eid('ql-tot-vat'))eid('ql-tot-vat').textContent=fmtCur(vat);
    if(eid('ql-tot-gross'))eid('ql-tot-gross').textContent=fmtCur(gross);
    // v3.1: margine live
    const mEl=eid('ql-tot-margin');
    if(mEl){
      if(net>0&&cost>=0){
        const pct=Math.round((net-cost)/net*100);
        mEl.textContent=pct+'%';
        mEl.style.color=pct>=30?'var(--green)':pct>=15?'var(--orange)':'var(--red)';
        mEl.title=pct>=30?'Ottimo margine':pct>=15?'Margine accettabile':'⚠️ Margine basso — valuta i costi';
      } else { mEl.textContent='—'; mEl.style.color='var(--text-muted)'; }
    }
  },

  _ivaMode: true, // true = show IVA, false = B2B no IVA

  setIVAMode(on){
    this._ivaMode = on;
    const yBtn=eid('qr-iva-yes-btn'), nBtn=eid('qr-iva-no-btn');
    if(yBtn){yBtn.style.background=on?'var(--primary)':'transparent';yBtn.style.color=on?'#000':'var(--text-muted)';yBtn.style.border=on?'none':'1px solid var(--border)';}
    if(nBtn){nBtn.style.background=!on?'#f87171':'transparent';nBtn.style.color=!on?'#fff':'var(--text-muted)';nBtn.style.border=!on?'none':'1px solid var(--border)';}
    const ivaRow=eid('qr-iva-row');
    if(ivaRow)ivaRow.style.opacity=on?'1':'0.35';
    this.recalcRight();
  },

  _recalcTimer: null,
  recalcRight(){
    // Debounce: collapse rapid keystroke events into one update
    if(this._recalcTimer) clearTimeout(this._recalcTimer);
    this._recalcTimer = setTimeout(()=>{ this._recalcNow(); this._recalcTimer=null; }, 60);
  },
  _getExtraCosts(){
    const qty=Math.max(1,this.lines.reduce((s,l)=>s+(+(l.qty)||1),0));
    const pack  =parseFloat(eid('qr-ext-pack')?.value||0)*qty;
    const ship  =parseFloat(eid('qr-ext-ship')?.value||0);
    const paint =parseFloat(eid('qr-ext-paint')?.value||0);
    const work  =parseFloat(eid('qr-ext-work')?.value||0);
    const custom=parseFloat(eid('qr-ext-custom')?.value||0);
    const other =parseFloat(eid('qr-ext-other')?.value||0);
    const total =+(pack+ship+paint+work+custom+other).toFixed(2);
    const lbl=eid('qr-extra-total-label'); if(lbl) lbl.textContent=total>0?'€'+total.toFixed(2):'';
    const sumEl=eid('qr-extra-sum'); if(sumEl) sumEl.textContent='€'+total.toFixed(2);
    return total;
  },
  _recalcNow(){
    const extraCost=this._getExtraCosts();
    const totalCost=this.lines.reduce((a,l)=>a+l.subtotal,0)+extraCost;
    const markup=parseFloat(eid('qr-markup')?.value||100)/100;
    const discount=parseFloat(eid('qr-discount')?.value||0)/100;
    const net=totalCost*(1+markup)*(1-discount);
    const vatRate=this._ivaMode!==false?0.22:0;
    const vat=net*vatRate;
    const gross=net+vat;
    const margin=net>0?((net-totalCost)/net*100):0;
    if(eid('qr-cost'))eid('qr-cost').textContent=fmtCur(totalCost);
    if(eid('qr-sub'))eid('qr-sub').textContent=fmtCur(net);
    if(eid('qr-iva'))eid('qr-iva').textContent=this._ivaMode!==false?fmtCur(vat):'— (esclusa)';
    if(eid('qr-final'))eid('qr-final').textContent=fmtCur(gross);
    const mLabel=eid('qr-margin-label');
    if(mLabel){
      const mc=margin>40?'var(--green)':margin>20?'var(--primary)':'var(--red)';
      mLabel.innerHTML=`<span style="color:${mc};font-weight:700">Margine: ${margin.toFixed(1)}%</span>`;
    }
    const tip=eid('qr-ai-tip');
    if(tip){
      if(!this.lines.length){tip.innerHTML='<div class="alert alert-info" style="font-size:12px"><i class="fas fa-robot"></i> Aggiungi voci per vedere l\'analisi AI.</div>';}
      else if(margin>50){tip.innerHTML='<div class="alert alert-success" style="font-size:12px"><i class="fas fa-robot"></i> Ottimo margine! Prezzo competitivo e redditizio.</div>';}
      else if(margin>30){tip.innerHTML='<div class="alert alert-warning" style="font-size:12px"><i class="fas fa-robot"></i> Margine buono. Valuta se il mercato regge un aumento.</div>';}
      else if(margin>0){tip.innerHTML='<div class="alert alert-danger" style="font-size:12px"><i class="fas fa-robot"></i> Margine basso. Aumenta markup o riduci i costi.</div>';}
      else{tip.innerHTML='<div class="alert alert-danger" style="font-size:12px"><i class="fas fa-robot"></i> ⚠️ Costo superiore al ricavo! Rivedi la struttura prezzi.</div>';}
    }
    this._updateTotals(totalCost,net,vat,gross);
  },

  setDiscount(pct){
    if(eid('qr-discount'))eid('qr-discount').value=pct;
    this.recalcRight();
  },

  async saveQuote(){
    const name=eid('q-name')?.value;
    if(!name){toast('Inserisci il titolo del lavoro','warning');return;}
    if(!this.lines.length){toast('Aggiungi almeno una voce','warning');return;}
    const clientEl=eid('q-client');
    const clientId=clientEl?.value?+clientEl.value:null;
    const clientName=clientId?clientEl.options[clientEl.selectedIndex].text:'';
    const totalCost=this.lines.reduce((a,l)=>a+l.subtotal,0);
    const markup=parseFloat(eid('qr-markup')?.value||100)/100;
    const discount=parseFloat(eid('qr-discount')?.value||0)/100;
    const net=+((totalCost*(1+markup))*(1-discount)).toFixed(2);
    const gross=+(net*1.22).toFixed(2);
    const q={name,clientId,clientName,date:today(),deadline:eid('q-deadline')?.value||'',priority:eid('q-priority')?.value||'Media',notes:eid('q-notes')?.value||'',lines:this.lines,totalCost:+totalCost.toFixed(2),netPrice:net,grossPrice:gross,markup:parseFloat(eid('qr-markup')?.value||100)/100,discount:parseFloat(eid('qr-discount')?.value||0),ivaMode:this._ivaMode!==false,status:'in_attesa',category:'Quoter'};
    if(this.editId){q.id=this.editId;await snapshotRecord('quotes',this.editId);}else{q.id=Date.now();}
    const id=await IDB.put('quotes',q);

    // v4.0: dual-write to pipeline (quotes as readonly, pipeline as source of truth)
    try {
      const plRecs = await IDB.getAll('pipeline').catch(()=>[]);
      const existing = plRecs.find(r => r._sourceId===id || (r._source==='quotes' && r._sourceId===id));
      const pEntry = {
        _source:'quotes', _sourceId:id,
        id: existing ? existing.id : Date.now()+Math.floor(Math.random()*9999),
        name: q.name, clientName: q.clientName, clientId: q.clientId,
        stage: q.status==='confermato'?'accepted':q.status==='bozza'?'draft':'sent',
        total: q.grossPrice||0, createdAt: q.createdAt||new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await IDB.put('pipeline', pEntry);
      AppStore.invalidate('pipeline');
    } catch(e) { console.warn('[saveQuote pipeline]', e); }    this._lastSavedId=id;
    await logAction('quote',id,this.editId?'updated':'created',{name,amount:gross});
    toast('Preventivo salvato!');this.editId=null;
    await this.renderList();
  },
  async shareWhatsApp(){
    if(!this.lines.length){toast('Aggiungi voci al preventivo prima','warning');return;}
    // Inline data extraction (no _buildPDFData dependency)
    const markup=parseFloat(eid('qr-markup')?.value||100)/100;
    const discount=parseFloat(eid('qr-discount')?.value||0)/100;
    const netBase=this.lines.reduce((a,l)=>a+l.subtotal,0)*(1+markup);
    const netFinal=netBase*(1-discount);
    const vatRate=this._ivaMode!==false?0.22:0;
    const grossPrice=netFinal*(1+vatRate);
    const clientEl=eid('q-client');
    const clientNameInline=clientEl?.selectedIndex>0?clientEl.options[clientEl.selectedIndex].text:'';
    const titleInline=eid('q-name')?.value||'Preventivo';
    const data={clientName:clientNameInline,title:titleInline,grossPrice,ivaMode:this._ivaMode!==false};
    // Look up client phone
    const clientId=+document.getElementById('q-client')?.value||0;
    let phone='';
    if(clientId){ const c=await IDB.get('clients',clientId).catch(()=>null); phone=(c?.phone||c?.tel||'').replace(/\D/g,''); }
    const cfg=await IDB.get('settings','main').catch(()=>null)||{};
    const biz=cfg.business||cfg.azienda||cfg.nome||'Ingly Design';
    const linesSummary=this.lines.length
      ? this.lines.slice(0,5).map(l=>`  • ${l.name||'Voce'}: ${fmtCur(l.subtotal||0)}`).join('\n')+(this.lines.length>5?`\n  ... e altri ${this.lines.length-5}`:'')
      : '';
    const msg=[
      `Ciao ${data.clientName||''}! 👋`,
      ``,
      `📋 *Preventivo: ${data.title||'—'}*`,
      `💶 Totale: *${fmtCur(data.grossPrice||0)}*`+(data.ivaMode!==false?' (IVA 22% inclusa)':' (IVA esclusa)'),
      linesSummary?`\n📦 Voci:\n${linesSummary}`:'',
      ``,
      `✅ Valido 14 giorni. Rispondi qui per confermare!`,
      `— ${biz}`,
    ].filter(Boolean).join('\n');
    const waUrl=phone?`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`:`https://wa.me/?text=${encodeURIComponent(msg)}`;
    const overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML=`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;max-width:480px;width:100%;padding:24px">
      <div style="font-size:16px;font-weight:800;margin-bottom:4px;color:#25D366"><i class="fab fa-whatsapp"></i> Invia via WhatsApp</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">${phone?'📱 +'+phone:'⚠️ Nessun numero — verifica la scheda cliente'}</div>
      <div style="background:#075E5420;border:1px solid #25D36630;border-radius:10px;padding:14px;font-size:12px;color:var(--text);white-space:pre-wrap;line-height:1.6;max-height:220px;overflow-y:auto">${msg}</div>
      <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">
        <button onclick="this.closest('[style*=fixed]').remove()" style="padding:8px 16px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text-muted);border-radius:8px;cursor:pointer">Annulla</button>
        <a href="${waUrl}" target="_blank" onclick="this.closest('[style*=fixed]').remove()" style="padding:8px 20px;background:#25D366;color:#fff;border:none;border-radius:8px;cursor:pointer;text-decoration:none;font-weight:700;font-size:13px"><i class="fab fa-whatsapp"></i> Apri WA</a>
      </div>
    </div>`;
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
    document.body.appendChild(overlay);
  },

  async exportPDF(){
    if(!this.lines.length){toast('Nessuna voce nel preventivo','warning');return;}
    // ⚡ Open window immediately within user gesture (before any await)
    const win=window.open('','_blank');
    if(!win){toast('Popup bloccato — abilita i popup','warning');return;}
    win.document.write('<html><body style="background:#070b14;height:100vh;display:flex;align-items:center;justify-content:center"><p style="font-family:system-ui;color:#fbbf24;font-size:15px">📊 Caricamento...</p>');
    const cfg=await IDB.get('settings','main')||{};
    const clientEl=eid('q-client');
    const clientName=clientEl?.selectedIndex>0?clientEl.options[clientEl.selectedIndex].text:'—';
    const jobName=eid('q-name')?.value||'Preventivo';
    const markupPct=parseFloat(eid('qr-markup')?.value||100);
    const markup=markupPct/100;
    const discountPct=parseFloat(eid('qr-discount')?.value||0);
    const discount=discountPct/100;
    const notes=eid('q-notes')?.value||'';
    const deadline=eid('q-deadline')?.value;
    const dateStr=new Date().toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'});
    const quoteNum='INT-'+Date.now().toString().slice(-6);

    // Cost aggregates
    const totalCost=this.lines.reduce((a,l)=>a+l.subtotal,0);
    const grossRevenue=totalCost*(1+markup);
    const netAfterDiscount=grossRevenue*(1-discount);
    const vat22=netAfterDiscount*0.22;
    const totalWithVat=netAfterDiscount+vat22;
    const totalProfit=netAfterDiscount-totalCost;
    const marginPct=netAfterDiscount>0?((totalProfit/netAfterDiscount)*100):0;

    // Cost by category
    const catTotals={};
    this.lines.forEach(l=>{
      const cat=l.catLabel||'Altro';
      catTotals[cat]=(catTotals[cat]||0)+l.subtotal;
    });

    const marginColor=marginPct>=40?'#22c55e':marginPct>=20?'#f59e0b':'#ef4444';
    const marginIcon=marginPct>=40?'✅':marginPct>=20?'⚠️':'🔴';

    const rowsHTML=this.lines.map((l,i)=>{
      const lineSell=l.subtotal*(1+markup)*(1-discount);
      const lineMargin=lineSell>0?((lineSell-l.subtotal)/lineSell*100):0;
      const lmColor=lineMargin>=40?'#22c55e':lineMargin>=20?'#f59e0b':'#ef4444';
      const lmBar=Math.max(0,Math.min(100,lineMargin));
      return `<tr style="background:${i%2===0?'#0f172a':'#111827'}">
        <td style="padding:10px 14px;border-bottom:1px solid #1e293b">
          <div style="font-size:13px;font-weight:600;color:#f1f5f9">${l.desc||'—'}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">${l.catLabel||''} ${l.detail&&l.detail!==l.desc?'· '+l.detail:''}</div>
        </td>
        <td style="padding:10px 8px;text-align:center;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:13px">${l.qty}</td>
        <td style="padding:10px 12px;text-align:right;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:13px">${fmtCur(l.unitCost||l.subtotal/l.qty)}</td>
        <td style="padding:10px 12px;text-align:right;border-bottom:1px solid #1e293b;color:#fbbf24;font-size:13px;font-weight:700">${fmtCur(l.subtotal)}</td>
        <td style="padding:10px 12px;text-align:right;border-bottom:1px solid #1e293b;color:#34d399;font-size:13px;font-weight:700">${fmtCur(lineSell)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #1e293b">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:6px;background:#1e293b;border-radius:3px;overflow:hidden">
              <div style="width:${lmBar}%;height:100%;background:${lmColor};border-radius:3px"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${lmColor};min-width:42px;text-align:right">${lineMargin.toFixed(1)}%</span>
          </div>
        </td>
      </tr>`;
    }).join('');

    const catBreakdownHTML=Object.entries(catTotals).map(([cat,cost])=>{
      const pct=totalCost>0?(cost/totalCost*100):0;
      return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="min-width:140px;font-size:12px;color:#94a3b8">${cat}</div>
        <div style="flex:1;height:8px;background:#1e293b;border-radius:4px;overflow:hidden">
          <div style="width:${pct.toFixed(1)}%;height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:4px"></div>
        </div>
        <div style="min-width:70px;text-align:right;font-size:12px;font-weight:700;color:#fbbf24">${fmtCur(cost)}</div>
        <div style="min-width:42px;text-align:right;font-size:11px;color:#64748b">${pct.toFixed(1)}%</div>
      </div>`;
    }).join('');

    const _cfgCompany = cfg.company||'LA TUA AZIENDA';
    const _cfgTagline = cfg.tagline||'Laser · Incisione · Personalizzazione';
    const html=`<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>[INTERNO] ${quoteNum} — ${jobName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0f1a;color:#f1f5f9;min-height:100vh}
  .page{max-width:960px;margin:0 auto;background:#0d1520;box-shadow:0 4px 60px rgba(0,0,0,.6)}
  .edit-toolbar{position:fixed;top:0;left:0;right:0;background:#0f172a;border-bottom:1px solid #1e293b;padding:10px 24px;display:flex;gap:12px;align-items:center;z-index:1000}
  .edit-toolbar span{color:#64748b;font-size:12px;flex:1}
  .btn-print{background:#ef4444;color:#fff;border:none;border-radius:8px;padding:8px 20px;font-size:13px;font-weight:700;cursor:pointer}
  .btn-close{background:transparent;border:1px solid #374151;color:#94a3b8;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer}
  .header{background:linear-gradient(135deg,#0f172a 0%,#1a0a0a 100%);border-bottom:3px solid #ef4444;padding:32px 48px 24px}
  .int-badge{display:inline-flex;align-items:center;gap:8px;background:#ef444420;border:1.5px solid #ef444450;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:800;color:#ef4444;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px}
  .company-row{display:flex;justify-content:space-between;align-items:flex-start}
  .company-name{font-size:24px;font-weight:900;color:#fff}
  .company-sub{font-size:11px;color:#475569;margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
  .doc-meta{text-align:right}
  .doc-num{font-size:20px;font-weight:800;color:#ef4444}
  .doc-date{font-size:12px;color:#64748b;margin-top:3px}
  .info-strip{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;padding:20px 48px;background:#090e18;border-bottom:1px solid #1e293b}
  .info-box{background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:14px}
  .info-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#475569;font-weight:700;margin-bottom:4px}
  .info-val{font-size:14px;font-weight:700;color:#f1f5f9}
  .info-sub{font-size:11px;color:#64748b;margin-top:3px}
  .body{padding:32px 48px}
  .section-hdr{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#475569;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px}
  .section-hdr::after{content:'';flex:1;height:1px;background:#1e293b}
  .items-table{width:100%;border-collapse:collapse;margin-bottom:28px;border-radius:10px;overflow:hidden;border:1px solid #1e293b}
  .items-table thead{background:linear-gradient(135deg,#1a0a0a,#200d0d)}
  .items-table thead th{padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:.7px;border-bottom:2px solid #ef444430}
  .items-table thead th:not(:first-child){text-align:right}
  .items-table thead th:nth-child(2){text-align:center}
  .summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}
  .summary-box{background:#090e18;border:1px solid #1e293b;border-radius:12px;overflow:hidden}
  .summary-title{background:#0f172a;border-bottom:1px solid #1e293b;padding:12px 16px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.7px}
  .summary-body{padding:16px}`
      +`
  .sum-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #0f172a;font-size:13px}
  .sum-row:last-child{border-bottom:none}
  .sum-row .lbl{color:#64748b}
  .sum-row .val{font-weight:700;color:#f1f5f9}
  .sum-row.highlight .lbl{color:#22c55e;font-weight:700}
  .sum-row.highlight .val{color:#22c55e;font-size:16px}
  .sum-row.total-row{background:linear-gradient(135deg,#0d2010,#0a1a0a);margin:0 -16px -16px;padding:14px 16px;border-radius:0 0 10px 10px}
  .sum-row.total-row .lbl{color:#4ade80;font-weight:800;font-size:14px}
  .sum-row.total-row .val{color:#4ade80;font-size:20px;font-weight:900}
  .margin-meter{background:#090e18;border:1px solid #1e293b;border-radius:12px;padding:20px;margin-bottom:28px;text-align:center}
  .meter-val{font-size:48px;font-weight:900;line-height:1}
  .meter-bar-bg{height:12px;background:#1e293b;border-radius:6px;overflow:hidden;margin:12px 0}
  .meter-bar{height:100%;border-radius:6px;transition:width .5s}
  .footer{background:#090e18;border-top:1px solid #1e293b;padding:16px 48px;display:flex;justify-content:space-between;align-items:center}
  .footer-text{font-size:10px;color:#374151}
  [contenteditable]:hover{background:rgba(239,68,68,.05);border-radius:3px}
  [contenteditable]:focus{background:rgba(239,68,68,.1);border-radius:3px;outline:2px solid #ef444440}
  @media print{.edit-toolbar,.no-print{display:none!important}body{background:#0a0f1a}.page{box-shadow:none;max-width:100%}@page{margin:10mm;size:A4}}
</style>
</head>
<body>
<div class="edit-toolbar no-print">
  <div class="int-badge" style="margin:0">⚠️ DOCUMENTO INTERNO</div>
  <span>✏️ Clicca su qualsiasi campo per modificarlo · <strong style="color:#ef4444">NON distribuire al cliente</strong></span>
  <button class="btn-close" onclick="window.close()">✕ Chiudi</button>
  <button class="btn-print" onclick="window.print()">🖨️ Stampa / Salva PDF</button>
</div>
<div style="height:56px" class="no-print"></div>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="int-badge">⚠️ INTERNO — NON distribuire al cliente</div>
    <div class="company-row">
      <div>
        <div class="company-name" contenteditable="true">${cfg.company||_cfgCompany}</div>
        <div class="company-sub" contenteditable="true">${_cfgTagline}</div>
      </div>
      <div class="doc-meta">
        <div class="doc-num">${quoteNum}</div>
        <div class="doc-date">${dateStr}</div>
        ${cfg.piva?`<div style="font-size:11px;color:#475569;margin-top:4px">P.IVA: ${cfg.piva}</div>`:''}
      </div>
    </div>
  </div>

  <!-- INFO STRIP -->
  <div class="info-strip">
    <div class="info-box">
      <div class="info-label">Lavoro</div>
      <div class="info-val" contenteditable="true">${jobName}</div>
      <div class="info-sub">Cliente: <span contenteditable="true">${clientName}</span></div>
    </div>
    <div class="info-box">
      <div class="info-label">Markup applicato</div>
      <div class="info-val" style="color:#f59e0b">${markupPct}%</div>
      <div class="info-sub">${discountPct>0?`Sconto: ${discountPct}% applicato`:'Nessuno sconto'}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Scadenza</div>
      <div class="info-val">${deadline?new Date(deadline).toLocaleDateString('it-IT',{day:'2-digit',month:'long'}):'Non definita'}</div>
      <div class="info-sub" contenteditable="true">${notes||'—'}</div>
    </div>
  </div>

  <div class="body">

    <!-- MARGINE TOTALE METER -->
    <div class="margin-meter">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#475569;font-weight:700;margin-bottom:12px">MARGINE TOTALE PREVENTIVO</div>
      <div class="meter-val" style="color:${marginColor}">${marginPct.toFixed(1)}%</div>
      <div class="meter-bar-bg"><div class="meter-bar" style="width:${Math.min(marginPct,100).toFixed(1)}%;background:${marginColor}"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#475569">
        <span>0%</span><span style="color:#ef4444">20% min</span><span style="color:#f59e0b">40% ottimo</span><span>100%</span>
      </div>
      <div style="margin-top:10px;font-size:14px;font-weight:700;color:${marginColor}">${marginIcon} ${marginPct>=40?'Margine eccellente — procedi con fiducia':marginPct>=20?'Margine accettabile — valuta se alzare il prezzo':'Margine critico — rivedi il pricing!'}</div>
    </div>

    <!-- DETTAGLIO VOCI -->
    <div class="section-hdr">Dettaglio Voci — Costi vs Prezzi di Vendita</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:35%;text-align:left">Descrizione / Categoria</th>
          <th style="width:7%;text-align:center">Qtà</th>
          <th style="width:13%;text-align:right">Costo Unit.</th>
          <th style="width:14%;text-align:right">Costo Tot.</th>
          <th style="width:14%;text-align:right">Prezzo Vendita</th>
          <th style="width:17%;text-align:right">Margine %</th>
        </tr>
      </thead>
      <tbody>${rowsHTML}</tbody>
    </table>

    <!-- SUMMARY + BREAKDOWN -->
    <div class="summary-grid">
      <div class="summary-box">
        <div class="summary-title">📊 Breakdown per Categoria</div>
        <div class="summary-body">${catBreakdownHTML||'<div style="color:#475569;font-size:12px">—</div>'}</div>
      </div>
      <div class="summary-box">
        <div class="summary-title">💰 Riepilogo Economico</div>
        <div class="summary-body">
          <div class="sum-row">
            <span class="lbl">Costo Vivo Totale</span>
            <span class="val" style="color:#fbbf24">${fmtCur(totalCost)}</span>
          </div>
          <div class="sum-row">
            <span class="lbl">Markup ${markupPct}%</span>
            <span class="val" style="color:#a78bfa">+${fmtCur(grossRevenue-totalCost)}</span>
          </div>
          ${discountPct>0?`<div class="sum-row">
            <span class="lbl">Sconto ${discountPct}%</span>
            <span class="val" style="color:#ef4444">−${fmtCur(grossRevenue-netAfterDiscount)}</span>
          </div>`:''}
          <div class="sum-row">
            <span class="lbl">Imponibile</span>
            <span class="val">${fmtCur(netAfterDiscount)}</span>
          </div>
          <div class="sum-row">
            <span class="lbl">IVA 22%</span>
            <span class="val">${fmtCur(vat22)}</span>
          </div>
          <div class="sum-row">
            <span class="lbl">Totale IVA incl.</span>
            <span class="val" style="color:#60a5fa">${fmtCur(totalWithVat)}</span>
          </div>
          <div class="sum-row highlight">
            <span class="lbl">✅ PROFITTO NETTO</span>
            <span class="val">${fmtCur(totalProfit)}</span>
          </div>
          <div class="sum-row total-row">
            <span class="lbl">MARGINE</span>
            <span class="val" style="color:${marginColor}">${marginPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>

    ${notes?`<div class="section-hdr">Note Interne</div>
    <div style="background:#090e18;border:1px solid #1e293b;border-radius:10px;padding:16px;font-size:13px;color:#94a3b8;line-height:1.6" contenteditable="true">${notes}</div>`:''}

  </div>

  <div class="footer">
    <div class="footer-text">
      Generato da INGLY · ${dateStr} · <strong style="color:#ef4444">USO INTERNO ESCLUSIVO</strong>
    </div>
    <div style="font-size:11px;color:#374151">${cfg.company||_cfgCompany} ${cfg.piva?('· P.IVA '+cfg.piva):''}</div>
  </div>

</div>
</body>
</html>`; // html template closed
    win.document.open();
    win.document.write(html);
    win.document.close();
    toast('✅ PDF Interno aperto — modificabile e stampabile','warning');
  },

  // ═══════════════════════════════════════════════════════════════
  // 📄 PDF CLIENTE — delegato all'implementazione canonica (fondo file)
  // ═══════════════════════════════════════════════════════════════
  exportClientPDF(){
    // L'implementazione definitiva è Quoter.exportClientPDF (assegnata dopo la chiusura di questo oggetto).
    // Questa stub viene sovrascritta da quella. Se per qualsiasi ragione questa venisse chiamata prima,
    // chiama direttamente la funzione canonica.
    if(typeof Quoter._doClientPDF==='function') Quoter.exportClientPDF();
    else toast('PDF non ancora pronto — riprova fra un secondo','warning');
  },

  async _generateClientPDF(){
    const dlg=eid('client-pdf-selector');
    const selectedIds=this.lines.filter(l=>{const _el=document.getElementById('cpdf-'+l.id);return _el&&_el.checked;}).map(l=>l.id);
    if(!selectedIds.length){toast('Seleziona almeno una voce','warning');return;}
    if(dlg)dlg.remove();

    // ⚡ Open window IMMEDIATELY within user gesture (before any await)
    const win=window.open('','_blank');
    if(!win){toast('Popup bloccato — abilita i popup per questo sito','warning');return;}
    win.document.write('<html><body style="background:#f1f5f9;display:flex;height:100vh;align-items:center;justify-content:center"><p style="font-family:system-ui;color:#64748b;font-size:15px">📄 Caricamento preventivo...</p></body></html>');

    const cfg=await IDB.get('settings','main')||{};
    const clientEl=eid('q-client');
    const clientName=clientEl?.selectedIndex>0?clientEl.options[clientEl.selectedIndex].text:'';
    const jobName=eid('q-name')?.value||'Preventivo';
    const markup=parseFloat(eid('qr-markup')?.value||100)/100;
    const discount=parseFloat(eid('qr-discount')?.value||0)/100;
    const notes=eid('q-notes')?.value||'';
    const withIVA=this._ivaMode!==false;
    const deadline=eid('q-deadline')?.value;
    const selectedLines=this.lines.filter(l=>selectedIds.includes(l.id));
    const subTotalNet=selectedLines.reduce((a,l)=>a+l.subtotal*(1+markup),0);
    const finalNet=subTotalNet*(1-discount);
    const vatRate=withIVA?0.22:0;
    const vat=finalNet*vatRate;
    const gross=finalNet+vat;
    const quoteNum='PRV-'+Date.now().toString().slice(-6);
    const dateStr=new Date().toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'});
    const accentColor=cfg.accentColor||'#10b981';

    // Build table rows HTML
    const rowsHTML=selectedLines.map((l,i)=>{
      const lineBase=l.subtotal*(1+markup);
      const lineNet=lineBase*(1-discount);
      const unitPrice=lineNet/l.qty;
      const _rowBg = i%2===0?'#f8fafc':'#fff';
      const _detailHtml = l.detail&&l.detail!==l.desc?('<br><span style="font-size:11px;color:#94a3b8;font-weight:400">'+l.detail+'</span>'):'';
      return '<tr style="border-bottom:1px solid #e2e8f0;background:'+_rowBg+'">'
        +'<td style="padding:12px 16px;font-size:13px;color:#1e293b;font-weight:500">'+(l.desc||l.name||'Voce')+_detailHtml+'</td>'
        +'<td style="padding:12px 8px;text-align:center;font-size:13px;color:#475569">'+l.qty+'</td>'
        +'<td style="padding:12px 8px;text-align:center;font-size:12px;color:#94a3b8">'+(l.unit||'pz')+'</td>'
        +'<td style="padding:12px 16px;text-align:right;font-size:13px;color:#475569">'+fmtCur(unitPrice)+'</td>'
        +'<td style="padding:12px 16px;text-align:right;font-size:14px;color:#1e293b;font-weight:700">'+fmtCur(lineNet)+'</td>'
        +'</tr>';
    }).join('');

    const html=`<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Preventivo ${quoteNum} — ${jobName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#f1f5f9;color:#1e293b;min-height:100vh}
  .page{max-width:860px;margin:0 auto;background:#fff;box-shadow:0 4px 40px rgba(0,0,0,.12)}
  .header{background:linear-gradient(135deg,${accentColor} 0%,${accentColor}cc 100%);padding:40px 48px 32px;position:relative;overflow:hidden}
  .header::after{content:'';position:absolute;right:-40px;top:-40px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.08)}
  .header::before{content:'';position:absolute;right:60px;bottom:-60px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.06)}
  .header-top{display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1}
  .company-name{font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px;text-shadow:0 2px 8px rgba(0,0,0,.2)}
  .company-sub{font-size:12px;color:rgba(255,255,255,.75);margin-top:4px;letter-spacing:0.5px;text-transform:uppercase}
  .quote-badge{background:rgba(255,255,255,.15);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.3);border-radius:12px;padding:12px 20px;text-align:right}
  .quote-badge-num{font-size:18px;font-weight:800;color:#fff}
  .quote-badge-date{font-size:11px;color:rgba(255,255,255,.75);margin-top:2px}
  .company-contacts{display:flex;gap:20px;margin-top:24px;position:relative;z-index:1}
  .contact-pill{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.15);border-radius:20px;padding:5px 14px;font-size:12px;color:#fff}
  .body{padding:40px 48px}
  .meta-strip{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:36px;padding:24px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0}
  .meta-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:4px}
  .meta-value{font-size:15px;font-weight:700;color:#1e293b}
  .meta-sub{font-size:12px;color:#64748b;margin-top:2px}
  .section-title{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px}
  .section-title::after{content:'';flex:1;height:1px;background:#e2e8f0}
  .items-table{width:100%;border-collapse:collapse;margin-bottom:32px;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0}
  .items-table thead{background:linear-gradient(135deg,${accentColor},${accentColor}cc)}
  .items-table thead th{padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.5px}
  .items-table thead th:not(:first-child){text-align:center}
  .items-table thead th:last-child{text-align:right}
  .items-table thead th:nth-child(4){text-align:right}
  .totals-area{display:flex;justify-content:flex-end;margin-bottom:32px}
  .totals-box{min-width:320px;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden}
  .totals-row{display:flex;justify-content:space-between;align-items:center;padding:10px 20px;border-bottom:1px solid #f1f5f9;font-size:13px}
  .totals-row .lbl{color:#64748b}
  .totals-row .val{font-weight:600;color:#1e293b}
  .totals-row.discount{background:#f0fdf4}
  .totals-row.discount .lbl{color:#16a34a;font-weight:700}
  .totals-row.discount .val{color:#16a34a;font-weight:800}
  .totals-row.original .val{text-decoration:line-through;color:#94a3b8}
  .totals-grand{background:linear-gradient(135deg,${accentColor},${accentColor}cc);padding:16px 20px;display:flex;justify-content:space-between;align-items:center}
  .totals-grand .lbl{font-size:13px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.5px}
  .totals-grand .val{font-size:24px;font-weight:900;color:#fff}
  .hook-box{background:linear-gradient(135deg,#fef3c7,#fef9ec);border:1px solid #fde68a;border-radius:16px;padding:20px 24px;margin-bottom:24px;display:flex;gap:16px;align-items:flex-start}
  .hook-icon{font-size:28px;flex-shrink:0}
  .hook-text{font-size:13px;color:#92400e;line-height:1.5}
  .hook-text strong{font-size:15px;font-weight:800;display:block;margin-bottom:4px;color:#78350f}
  .notes-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:32px;font-size:13px;color:#475569;line-height:1.6}
  .footer{background:#1e293b;padding:24px 48px;display:flex;justify-content:space-between;align-items:center}
  .footer-text{font-size:11px;color:#94a3b8;line-height:1.6}
  .footer-logo{font-size:16px;font-weight:900;color:${accentColor}}
  .validity-badge{display:inline-flex;align-items:center;gap:6px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:6px 14px;font-size:12px;color:#92400e;font-weight:600;margin-bottom:24px}
  .edit-toolbar{position:fixed;top:0;left:0;right:0;background:#1e293b;padding:10px 24px;display:flex;gap:12px;align-items:center;z-index:1000;box-shadow:0 4px 20px rgba(0,0,0,.3)}
  .edit-toolbar span{color:#94a3b8;font-size:13px;flex:1}
  .btn-print{background:${accentColor};color:#000;border:none;border-radius:8px;padding:8px 20px;font-size:13px;font-weight:700;cursor:pointer}
  .btn-close-toolbar{background:transparent;border:1px solid #475569;color:#94a3b8;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer}
  [contenteditable]{outline:none;cursor:text}
  [contenteditable]:hover{background:rgba(16,185,129,.05);border-radius:4px}
  [contenteditable]:focus{background:rgba(16,185,129,.1);border-radius:4px;box-shadow:0 0 0 2px ${accentColor}40}
  @media print{.edit-toolbar,.no-print{display:none!important}body{background:#fff}.page{box-shadow:none;max-width:100%}}
</style>
</head>
<body>
<div class="edit-toolbar no-print">
  <span>✏️ <strong style="color:#fff">Preventivo modificabile</strong> — Clicca su qualsiasi testo per modificarlo</span>
  <button class="btn-close-toolbar" onclick="window.close()">✕ Chiudi</button>
  <button class="btn-print" onclick="window.print()">🖨️ Stampa / Salva PDF</button>
</div>
<div style="height:52px" class="no-print"></div>
<div class="page">
  <div class="header">
    <div class="header-top">
      <div>
        <div class="company-name" contenteditable="true">${_cfgCompany}</div>
        <div class="company-sub" contenteditable="true">${_cfgTagline}</div>
      </div>
      <div class="quote-badge">
        <div style="font-size:10px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">PREVENTIVO</div>
        <div class="quote-badge-num" contenteditable="true">${quoteNum}</div>
        <div class="quote-badge-date" contenteditable="true">${dateStr}</div>
      </div>
    </div>
    <div class="company-contacts">
      ${cfg.email?`<div class="contact-pill">📧 <span contenteditable="true">${cfg.email}</span></div>`:''}
      ${cfg.phone?`<div class="contact-pill">📞 <span contenteditable="true">${cfg.phone}</span></div>`:''}
      ${cfg.address?`<div class="contact-pill">📍 <span contenteditable="true">${cfg.address}</span></div>`:''}
      ${cfg.website?`<div class="contact-pill">🌐 <span contenteditable="true">${cfg.website}</span></div>`:''}
    </div>
  </div>

  <div class="body">
    <div class="meta-strip">
      <div>
        <div class="meta-label">Lavoro</div>
        <div class="meta-value" contenteditable="true">${jobName}</div>
        ${clientName?`<div class="meta-sub">Cliente: <strong contenteditable="true">${clientName}</strong></div>`:''}
      </div>
      <div>
        <div class="meta-label">Validità</div>
        <div class="meta-value">${deadline?new Date(deadline).toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'}):'30 giorni'}</div>
        <div class="meta-sub" contenteditable="true">Questo preventivo è valido per 7 giorni</div>
      </div>
    </div>

    <div class="section-title">Dettaglio Voci</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:45%">Descrizione</th>
          <th style="width:8%;text-align:center">Qtà</th>
          <th style="width:8%;text-align:center">UM</th>
          <th style="width:18%;text-align:right">Prezzo Unit.</th>
          <th style="width:21%;text-align:right">Totale</th>
        </tr>
      </thead>
      <tbody id="quote-rows">
        ${rowsHTML}
      </tbody>
    </table>

    <div class="totals-area">
      <div class="totals-box">
        ${discount>0?`
        <div class="totals-row original">
          <span class="lbl">Prezzo di listino</span>
          <span class="val">${fmtCur(subTotalNet)}</span>
        </div>
        <div class="totals-row discount">
          <span class="lbl">🎁 Sconto riservato (${(discount*100).toFixed(0)}%)</span>
          <span class="val">− ${fmtCur(subTotalNet-finalNet)}</span>
        </div>`:``}
        <div class="totals-row">
          <span class="lbl">Imponibile</span>
          <span class="val">${fmtCur(finalNet)}</span>
        </div>
        ${withIVA?`<div class="totals-row">
          <span class="lbl">IVA 22%</span>
          <span class="val">${fmtCur(vat)}</span>
        </div>`:
        `<div class="totals-row">
          <span class="lbl" style="color:#94a3b8;font-size:11px">IVA esclusa (B2B/P.IVA)</span>
          <span class="val" style="color:#94a3b8">—</span>
        </div>`}
        <div class="totals-grand">
          <span class="lbl">${withIVA?'Totale IVA inclusa':'Totale netto'}</span>
          <span class="val">${fmtCur(gross)}</span>
        </div>
      </div>
    </div>

    ${discount>0?`
    <div class="hook-box">
      <div class="hook-icon">✨</div>
      <div class="hook-text">
        <strong>Prezzo riservato a te</strong>
        Con questo preventivo stai risparmiando <strong style="color:#d97706">${fmtCur(subTotalNet-finalNet)}</strong> rispetto al prezzo standard.
        Offerta valida per 7 giorni. Per accettare, rispondici via WhatsApp o email — saremo felici di procedere!
      </div>
    </div>`:''}

    ${notes?`
    <div class="section-title">Note</div>
    <div class="notes-box" contenteditable="true">${notes}</div>
    `:''}

    <div class="section-title">Condizioni</div>
    <div class="notes-box" contenteditable="true">
      Questo preventivo è da considerarsi valido per 7 giorni dalla data di emissione.
      I prezzi indicati sono comprensivi di lavorazione e materiali salvo diversa indicazione.
      Per accettare il preventivo è sufficiente rispondere via email o WhatsApp.
      Grazie per la fiducia! 🙏
    </div>
  </div>

  <div class="footer">
    <div>
      <div class="footer-logo" contenteditable="true">${cfg.company||_cfgCompany}</div>
      ${cfg.piva?`<div style="font-size:11px;color:#64748b;margin-top:2px" contenteditable="true">P.IVA: ${cfg.piva}</div>`:''}
    </div>
    <div class="footer-text" style="text-align:right" contenteditable="true">
      ${cfg.email||''}${cfg.email&&cfg.phone?' · ':''}${cfg.phone||''}<br>
      Generato con INGLY — ${dateStr}
    </div>
  </div>
</div>
</body>
</html>`;

    // Winready opened - now fill it with the generated HTML
    win.document.open();
    win.document.write(html);
    win.document.close();
    toast('✅ Preventivo aperto — modificabile e stampabile','success');
    return; // HTML popup approach — jsPDF block removed

  },

  async sendToWorkflow(){
    await this.saveQuote().catch(()=>{});
    const clientEl = eid('q-client');
    const clientName = clientEl?.selectedIndex>0 ? clientEl.options[clientEl.selectedIndex].text : '';
    const markup  = parseFloat(eid('qr-markup')?.value||100)/100;
    const total   = (this.lines||[]).reduce((a,l)=>a+l.subtotal*(1+markup),0);
    const discount= parseFloat(eid('qr-discount')?.value||0)/100;
    const finalTotal = total*(1-discount);
    // Create order in GestioneOrdini unified workflow
    if(typeof GestioneOrdini!=='undefined'){
      await GestioneOrdini._saveOrderFromQuoter({
        clientName,
        name:     eid('q-name')?.value||'Preventivo',
        total:    parseFloat(finalTotal.toFixed(2)),
        notes:    eid('q-notes')?.value||'',
        dueDate:  eid('q-deadline')?.value||'',
        quoteId:  this._lastSavedId||null,
      });
    } else {
      // Fallback to pipeline
      App.navigate('pipeline');
    }
  },

  async confirmToSale(){
    if(!this.lines.length){toast('Nessuna voce nel preventivo','warning');return;}
    await this.saveQuote();
    if(this._lastSavedId)await QuoterBridge.convert(this._lastSavedId);
  },

  clearAll(){
    this.lines=[];this.editId=null;this._lastSavedId=null;
    ['ql-cat','q-name','q-notes','ql-color-text'].forEach(id=>{const el=eid(id);if(el)el.value='';});
    if(eid('qr-markup'))eid('qr-markup').value=100;
    if(eid('qr-discount'))eid('qr-discount').value=0;
    if(eid('ql-unit-cost'))eid('ql-unit-cost').value=0;
    if(eid('ql-qty'))eid('ql-qty').value=1;
    const sel=eid('ql-resource');if(sel)sel.innerHTML='<option value="">-- Scegli risorsa --</option>';
    // Reset display pill
    const lbl=eid('ql-resource-label');if(lbl){lbl.textContent='-- Scegli risorsa --';lbl.style.color='var(--text-muted)';}
    const disp=eid('ql-resource-display');if(disp)disp.style.borderColor='var(--border)';
    this.renderLines();this.recalcRight();
    toast('Preventivo resettato','info');
  },

  // v3.9 Storico Revisioni
  async showHistory() {
    const id = this.editId || this._lastSavedId;
    if (!id) { toast('Salva prima il preventivo', 'warning'); return; }
    const all = await IDB.getAll('history').catch(()=>[]);
    const snaps = all.filter(h=>h.recordId===id&&h.store==='quotes').sort((a,b)=>b.ts-a.ts);
    window._quoterSnapshots = snaps;
    const modal = document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    const box = document.createElement('div');
    box.style.cssText='background:var(--bg-card);border-radius:16px;padding:24px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid var(--border)';
    const hdr = document.createElement('div');
    hdr.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:18px';
    hdr.innerHTML='<span style="font-size:16px;font-weight:800">Storico Revisioni Preventivo</span>';
    const xbtn = document.createElement('button');
    xbtn.textContent='X'; xbtn.style.cssText='width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card2);color:var(--text-muted);cursor:pointer;font-size:15px';
    xbtn.onclick=function(){modal.remove();};
    hdr.appendChild(xbtn); box.appendChild(hdr);
    const body = document.createElement('div');
    if (!snaps.length) {
      body.innerHTML='<div style="text-align:center;padding:32px;color:var(--text-muted)">Nessuna revisione salvata. Le revisioni si creano ad ogni salvataggio.</div>';
    } else {
      snaps.forEach(function(s,i){
        const q=s.data||{}; const d=new Date(s.ts);
        const row=document.createElement('div');
        row.style.cssText='background:var(--bg-card2);border-radius:10px;padding:14px;margin-bottom:10px;border:1px solid var(--border)';
        const rBtn=document.createElement('button');
        rBtn.textContent='Ripristina'; rBtn.dataset.idx=i;
        rBtn.style.cssText='padding:4px 10px;background:var(--primary);color:#000;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700';
        rBtn.onclick=function(){Quoter._restoreSnapshot(+this.dataset.idx);};
        row.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
          +'<div style="font-weight:700;font-size:13px">Rev.'+(snaps.length-i)+' - '+d.toLocaleString('it-IT')+'</div>'
          +'</div>'
          +'<div style="font-size:12px;color:var(--text-muted)">'+(q.name||'-')+' | '+(q.clientName||'-')+' | '+fmtCur(q.grossPrice||0)+'</div>'
          +(q.lines?'<div style="font-size:11px;color:var(--text-dim);margin-top:3px">'+q.lines.length+' voci</div>':'');
        row.querySelector('div').appendChild(rBtn);
        body.appendChild(row);
      });
    }
    box.appendChild(body); modal.appendChild(box); document.body.appendChild(modal);
    modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
  },
  async _restoreSnapshot(idx) {
    const snap = window._quoterSnapshots && window._quoterSnapshots[idx];
    if (!snap||!confirm('Ripristinare questa revisione?')) return;
    const q=snap.data;
    if(q.lines){this.lines=[...q.lines];}
    const sv=function(id,v){const el=document.getElementById(id);if(el&&v!=null)el.value=v;};
    sv('q-name',q.name); sv('q-notes',q.notes); sv('qr-markup',q.markup); sv('qr-discount',q.discount);
    this.renderLines(); this.recalcRight();
    document.querySelectorAll('[style*=position\:fixed]')[0]&&document.querySelectorAll('[style*=position\:fixed]')[0].remove();
    toast('Revisione ripristinata', 'success');
  },

  async renderList(){
    const el=eid('quotes-list');if(!el)return;
    const quotes=(await AppStore.get('quotes').catch(()=>[])).sort((a,b)=>(b.id||0)-(a.id||0)).slice(0,10);
    if(!quotes.length){el.innerHTML='<p class="text-muted" style="padding:10px;font-size:12px">Nessun preventivo ancora</p>';return;}
    el.innerHTML=quotes.map(q=>`<div class="stat-row" style="font-size:11px"><span style="flex:1">${sanitize(q.name||'—')}<br><small class="text-muted">${sanitize(q.clientName||'—')} · ${fmtDate(q.date)}</small></span><div style="display:flex;gap:6px;align-items:center">${fmtCur(q.grossPrice)} ${badgeStatus(q.status)}<button onclick="Quoter.convertToInvoice(${q.id})" title="Converti in Fattura" style="padding:2px 7px;background:#10b98120;color:#4ade80;border:1px solid #10b98140;border-radius:4px;cursor:pointer;font-size:10px;font-weight:700">→ FAT</button></div></div>`).join('');
  },
  // Legacy compat stubs
  onCategoryChange(){},
  async calc(){},
  async saveDraft(){await this.saveQuote();},

  async convertToInvoice(quoteId){
    const q = await IDB.get('quotes', quoteId);
    if(!q) return;
    const cfg = await IDB.get('settings','main').catch(()=>({})) || {};
    const client = q.clientId ? await IDB.get('clients', q.clientId).catch(()=>null) : null;

    // Build line descriptions for invoice
    const lineDesc = q.lines?.length
      ? q.lines.map(l=>`${l.name||'Voce'} x${l.qty||1}`).join('; ')
      : q.name;

    const confirmed = confirm(
      `Convertire il preventivo in fattura?\n\n` +
      `📋 ${q.name}\n` +
      `👤 ${q.clientName||'—'}\n` +
      `💶 ${fmtCur(q.grossPrice||0)} (IVA ${q.ivaMode!==false?'incl.':'escl.'})\n\n` +
      `Verrà creata una vendita "da_pagare" e potrai generare la fattura XML.`
    );
    if(!confirmed) return;

    // 1. Create sale record (already shows in Vendite)
    const sale = {
      clientId:    q.clientId,
      clientName:  q.clientName || client?.name || '—',
      date:        today(),
      dueDate:     new Date(Date.now()+30*86400000).toISOString().split('T')[0],
      desc:        q.name,
      lineDesc:    lineDesc,
      amount:      q.grossPrice || 0,
      netAmount:   q.netPrice || 0,
      vatAmount:   q.ivaMode!==false ? (q.grossPrice-q.netPrice)||0 : 0,
      status:      'da_pagare',
      channel:     'Fattura',
      invoiceNo:   `FAT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*900+100)}`,
      fromQuoteId: quoteId,
      clientPiva:  client?.piva || '',
      clientAddress: client?.address || '',
    };
    const saleId = await IDB.put('sales', sale);

    // 2. Mark quote accepted
    q.status = 'accettato';
    q.convertedToSaleId = saleId;
    await IDB.put('quotes', q);

    Bus.emit('sale:created', {id:saleId});
    Bus.emit('data:updated', {store:'sales'});

    // 3. Navigate to sales and highlight new record
    toast(`✅ Preventivo → Fattura ${sale.invoiceNo} (${fmtCur(sale.amount)})`, '🧾');
    App.navigate('sales');

    // 4. Optionally open XML invoice generator
    setTimeout(()=>{
      if(confirm(`Aprire il generatore fattura XML per ${sale.invoiceNo}?`)){
        App.navigate('xmlsdi');
        // Pre-fill XML invoice form if XMLInvoices module exists
        if(typeof XMLInvoices !== 'undefined' && XMLInvoices.prefillFromSale) {
          XMLInvoices.prefillFromSale(saleId);
        }
      }
    }, 500);
  },

  // ── v61: openResourcePicker visual modal ──────────────────────────────
  openResourcePicker(){
    const cat=eid('ql-cat')?.value||'';
    const existing=eid('rp-modal');if(existing)existing.remove();
    const modal=document.createElement('div');
    modal.id='rp-modal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick=e=>{if(e.target===modal)modal.remove();};
    const CATS=[
      {id:'',label:'Tutti'},
      {id:'materiale',label:'📦 Materiali'},
      {id:'verniciatura',label:'🎨 Vernici'},
      {id:'laser',label:'⚙️ Macchine'},
      {id:'manodopera',label:'👷 Team'},
      {id:'gadget',label:'🎁 Gadget'},
      {id:'catalogo',label:'📋 Catalogo'},
    ];
    modal.innerHTML=`
      <div style="background:var(--bg-card);border-radius:18px;width:100%;max-width:740px;max-height:88vh;display:flex;flex-direction:column;border:1px solid var(--border);box-shadow:0 24px 80px rgba(0,0,0,.7);overflow:hidden">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:var(--bg-card2)">
          <div style="font-size:15px;font-weight:800">📋 Scegli Risorsa da Listino</div>
          <div style="display:flex;gap:8px;align-items:center">
            <input id="rp-search-2" class="form-control" placeholder="🔍 Cerca..." style="width:180px;font-size:12px" oninput="Quoter._filterRP()">
            <button onclick="document.getElementById('rp-modal').remove()" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;width:28px;height:28px;border-radius:8px;font-size:13px">✕</button>
          </div>
        </div>
        <div style="display:flex;flex:1;overflow:hidden;min-height:0">
          <!-- Sidebar categories -->
          <div style="width:160px;flex-shrink:0;background:var(--bg-card2);border-right:1px solid var(--border);padding:8px;overflow-y:auto">
            ${CATS.map(c=>`
              <div onclick="Quoter._rpSetCat('${c.id}')" id="rp-cat-${c.id||'all'}"
                style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;margin-bottom:3px;transition:background .15s;background:${(cat===c.id||(c.id===''&&!cat))?'var(--primary-dim)':'none'};color:${(cat===c.id||(c.id===''&&!cat))?'var(--primary)':'var(--text-muted)'}"
                onmouseover="this.style.background=this.style.background||'var(--bg-card)'" onmouseout="">
                ${c.label}
              </div>`).join('')}
          </div>
          <!-- Items list -->
          <div id="rp-items-list" style="flex:1;overflow-y:auto;padding:8px 0">
            <div style="text-align:center;padding:30px;color:var(--text-dim)"><i class="fas fa-spinner fa-spin"></i> Caricamento...</div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    // Set category to current and load
    const catSel=eid('ql-cat');
    if(catSel&&cat)catSel.value=cat;
    this.loadResources();
  },

  _rpSetCat(cat){
    const catSel=eid('ql-cat');
    if(catSel)catSel.value=cat;
    // Update sidebar highlighting
    document.querySelectorAll('[id^="rp-cat-"]').forEach(el=>{
      el.style.background='none';el.style.color='var(--text-muted)';
    });
    const active=eid('rp-cat-'+(cat||'all'));
    if(active){active.style.background='var(--primary-dim)';active.style.color='var(--primary)';}
    this.loadResources();
  },

  _filterRP(){
    const q=(eid('rp-search')?.value||'').toLowerCase();
    const list=eid('rp-items-list');
    if(!list)return;
    list.querySelectorAll('.rp-item').forEach(el=>{
      el.style.display=(q&&!el.textContent.toLowerCase().includes(q))?'none':'';
    });
  },

  _renderRPList(items,container){
    if(!items.length){
      container.innerHTML=`<div style="text-align:center;padding:30px;color:var(--text-dim)"><i class="fas fa-inbox" style="font-size:24px;opacity:.2;display:block;margin-bottom:8px"></i>Nessuna risorsa in questa categoria.<br><small>Aggiungi items dalla sezione Items 📦</small></div>`;
      return;
    }
    container.innerHTML=items.map((item,idx)=>`
      <div class="rp-item" onclick="Quoter._selectRPItem(${idx},'${(item.name||'').replace(/'/g,'&apos;')}',${item.cost},'${item.unit||'pz'}')"
        style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s"
        class="ls-row-hover">
        <div style="width:36px;height:36px;border-radius:10px;background:var(--bg-card2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">
          ${item.label?.startsWith('[🎨]')?'🎨':item.label?.startsWith('[🎁]')?'🎁':item.label?.startsWith('[⚙️]')?'⚙️':item.label?.startsWith('[👤]')||item.label?.startsWith('[👷]')?'👤':item.label?.startsWith('[📋]')?'📋':'📦'}
        </div>
        <div style="flex:1;overflow:hidden">
          <div style="font-weight:600;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.name||item.label}</div>
          <div style="font-size:10px;color:var(--text-muted)">${item.unit||'pz'}</div>
        </div>
        <div style="font-weight:800;font-size:14px;color:var(--primary);white-space:nowrap">${fmtCur(item.cost)}</div>
      </div>`).join('');
    this._rpItems=items;
  },

  _rpItems:[],
  _selectRPItem(idx,name,cost,unit){
    // Set resource label
    const lbl=eid('ql-resource-label');if(lbl)lbl.textContent=name;
    // Set cost
    const costEl=eid('ql-unit-cost');
    if(costEl){costEl.value=cost;costEl.dispatchEvent(new Event('input'));}
    this.calcItem?.();
    // Close modal
    eid('rp-modal')?.remove();
    // Add to hidden select for compatibility
    const sel=eid('ql-resource');
    if(sel){
      let opt=[...sel.options].find(o=>o.dataset.name===name);
      if(!opt){opt=document.createElement('option');opt.dataset.name=name;opt.dataset.cost=cost;opt.dataset.unit=unit;opt.textContent=name;sel.appendChild(opt);}
      sel.value=opt.value;
    }
    // Trigger AnchorAI
    const descEl=eid('ql-color-text')||eid('ql-desc');
    const qtyEl=eid('ql-qty');
    const qname=eid('q-name')?.value||name;
    const cat=eid('ql-cat')?.value||'';
    AnchorAI.renderWidget(name,cat,parseFloat(qtyEl?.value)||1,cost);
    toast(`📦 "${name}" selezionato — €${cost}/${unit}`,'success');
  },

  // ── Auto-generated stubs for UI callbacks ────────────────
  closeResourcePicker() { const m=document.getElementById('q-resource-picker'); if(m)m.style.display='none'; },
  filterResources(v) { this._resFilter=v?.toLowerCase||''; this._renderResourcePicker?.(); },
  setResourceView(v) { this._resView=v; this._renderResourcePicker?.(); },
  _pdfGenerate() { toast('Generazione PDF preventivo...','info'); this._pdfRenderStep?.(0); },
  _pdfRenderStep(step) { if(step===0&&typeof QuoterPDF!=='undefined'){QuoterPDF.generate(this._qrLines||[]);} },
  _selectResource(id,type) { toast('Risorsa selezionata','info'); this.closeResourcePicker(); },
  _loadForEdit(id) { this.openQuoteModal?.(id); },
  _renderRPCatBtns() { /* resource picker category buttons - handled inline */ },
  shareConfigurator() { const url=window.location.href; navigator.clipboard?.writeText(url).then(()=>toast('Link copiato!','success')).catch(()=>toast(url,'info',8000)); },

  async _saveNewClient(){
    const name = document.getElementById('qnc2-name')?.value?.trim();
    if(!name){ toast('Inserisci almeno il nome','warning'); return; }
    const phone = document.getElementById('qnc2-phone')?.value?.trim()||'';
    const email = document.getElementById('qnc2-email')?.value?.trim()||'';
    const newClient = { id:'c'+Date.now(), name, phone, email, createdAt:new Date().toISOString(), tags:['nuovo'], source:'quoter' };
    try {
      const clients = await AppStore.get('clients').catch(()=>[]);
      clients.push(newClient);
      await AppStore.set('clients', clients);
      const sel = document.getElementById('q-client');
      if(sel){ const opt=document.createElement('option'); opt.value=newClient.id; opt.textContent=name; opt.selected=true; sel.appendChild(opt); }
      document.getElementById('q-new-client-form').style.display='none';
      ['qnc2-name','qnc2-phone','qnc2-email'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
      toast('✅ Cliente "'+name+'" aggiunto e selezionato!','success');
      if(typeof Bus!=='undefined') Bus.emit('client:created', newClient);
    } catch(e){ toast('Errore salvataggio cliente','error'); console.error('[Quoter._saveNewClient]',e); }
  }
};
if(typeof Quoter!=="undefined")window.Quoter=Quoter; // immediate window export
if(!window.Quoter) console.warn('[INGLY] Quoter export failed');


// ===== QUOTER BRIDGE — WORKFLOW 1-CLICK ===========================
const QuoterBridge={
  // Step 1: Preventivo → Ordine di Produzione
  async toOrder(quoteId){
    const q=await IDB.get('quotes',quoteId);if(!q)return;
    // DEDUP GUARD v85: abort if order already exists for this quote
    const allOrders=await AppStore.get('orders').catch(()=>[]);
    const existingOrder=allOrders.find(o=>o.originQuote===quoteId||o.quoteId===quoteId);
    if(existingOrder){
      toast(`⚠️ Ordine già esistente per questo preventivo (#${existingOrder.id})`, 'warning');
      App.navigate('orders'); return;
    }
    if(!confirm(`Creare ORDINE DI PRODUZIONE da preventivo "${q.name}"?`))return;
    const orderId=await IDB.put('orders',{
      id:Date.now(),
      name:q.name,                    // FIX: era 'title'
      client:q.clientName||'',        // FIX: era 'clientName'
      clientId:q.clientId,
      status:'backlog',               // FIX: era 'todo' (non esiste come colonna)
      priority:'alta',                // FIX: era 'high' (valore IT)
      dueDate:q.deadline||q.dueDate||'',
      value:q.grossPrice||0,          // FIX: era 'amount'
      desc:q.notes||'',               // FIX: era 'notes'
      originQuote:quoteId,
      createdAt:new Date().toISOString()
    });
    q.status='produzione';q.orderId=orderId;
    await IDB.put('quotes',q);
    toast(`✅ Ordine creato! Trovi l'ordine nel Kanban Produzione.`,'success');
    await Quoter.renderList();
    App.navigate('orders');
  },

  // Step 2: Preventivo → Vendita (fatturazione diretta)
  async convert(quoteId){
    const q=await IDB.get('quotes',quoteId);if(!q)return;
    if(!confirm(`Confermare preventivo "${q.name}" e creare VENDITA?`))return;
    await snapshotRecord('quotes',quoteId);
    const saleId = await IDB.put('sales',{
      clientId:q.clientId,clientName:q.clientName,
      date:today(),description:q.name,amount:q.grossPrice,
      materialCost:q.totalCost,
      status:'da_pagare',channel:'Diretto',originQuote:quoteId
    });
    q.status='confermato';q.saleId=saleId;
    await IDB.put('quotes',q);
    Bus.emit('sale:created',{saleId,quoteId});
    toast('📄 Vendita creata! Aggiungi data pagamento quando incassi.','success');
    await Quoter.renderList();
    App.navigate('sales');
  },

  // Step 3: Ordine → Vendita automatica al completamento
  async orderToSale(orderId){
    const o=await IDB.get('orders',orderId);if(!o)return;
    if(!confirm(`Segnare ordine "${o.name||o.title}" come PAGATO e creare una vendita?`))return;
    const saleId=await IDB.put('sales',{
      clientId:o.clientId,clientName:o.client||o.clientName,
      date:today(),description:o.name||o.title,amount:o.value||o.amount||0,
      status:'pagato',channel:'Diretto',originOrder:orderId
    });
    o.status='delivered';o.saleId=saleId;
    await IDB.put('orders',o);
    toast('🏆 Ordine completato → Vendita registrata!','success');
    App.navigate('orders');
  },

  shareConfigurator(){
    // Build a configurator data package from current state
    const name=eid('q-name')?.value||'Prodotto Ingly';
    const lines=Quoter.lines||[]; // FIX: era this.lines (undefined)
    const data={
      brand:'Ingly Design',
      title:name,
      items:lines.map(l=>({name:l.name,price:l.price,qty:l.qty})),
      total:lines.reduce((a,l)=>a+(l.price*l.qty),0),
      ts:Date.now(),
    };
    const b64=btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const link=`${location.href.split('?')[0]}?cfg=${b64}`;
    // Copy to clipboard
    if(navigator.clipboard){
      navigator.clipboard.writeText(link).then(()=>{
        toast('🔗 Link copiato! Mandalo al cliente su WhatsApp o email','success');
      });
    }
    // Also show modal with WA / email options
    const bd=JSON.parse(localStorage.getItem('ingly_brand_identity')||'{}');
    const waText=encodeURIComponent(`Ciao! 😊 Ecco il tuo preventivo personalizzato Ingly Design:
${name}: €${data.total.toFixed(2)}
Puoi vedere i dettagli qui: ${link}`);
    const modal=document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`<div style="background:var(--bg-card);border-radius:16px;padding:24px;max-width:480px;width:100%;border:1.5px solid var(--border)">
      <div style="font-size:15px;font-weight:800;margin-bottom:4px">🔗 Link Preventivo Cliente</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">Il cliente vedrà il riepilogo del preventivo e potrà approvarlo con un click.</div>
      <div style="background:var(--bg-card2);border-radius:8px;padding:10px;font-size:11px;color:var(--text-muted);word-break:break-all;margin-bottom:14px;border:1px solid var(--border)">${link}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a href="https://wa.me/?text=${waText}" target="_blank" style="padding:10px 14px;background:#25d36620;color:#25d366;border:1px solid #25d36640;border-radius:8px;text-decoration:none;font-size:12px;font-weight:700">💬 Manda su WhatsApp</a>
        <button onclick="navigator.clipboard?.writeText('${link}');toast('Copiato!','success')" style="padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);border-radius:8px;cursor:pointer;font-size:12px">📋 Copia Link</button>
        <button onclick="this.closest('[style*=fixed]').remove()" style="margin-left:auto;padding:10px 14px;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px">Chiudi</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  },

  // Full pipeline: Preventivo → Ordine → Vendita in 1 step
  async fullPipeline(quoteId){
    const q=await IDB.get('quotes',quoteId);if(!q)return;
    const confirmed=confirm(`CONVERSIONE COMPLETA:\n"${q.name}"\n\nCreerà: Ordine produzione + Vendita da pagare\nProcedere?`);
    if(!confirmed)return;
    // Create order
    const orderId=await IDB.put('orders',{
      id:Date.now(),
      name:q.name,                    // FIX: era 'title'
      client:q.clientName||'',        // FIX: era 'clientName'
      clientId:q.clientId,
      status:'working',               // FIX: era 'progress' (non esiste come colonna)
      priority:'alta',                // FIX: era 'high'
      dueDate:q.deadline||'',         // FIX: era 'deadline'
      value:q.grossPrice||0,          // FIX: era 'amount'
      desc:q.notes||'',               // FIX: era 'notes'
      originQuote:quoteId,
      createdAt:new Date().toISOString()
    });
    // Create sale
    const saleId=await IDB.put('sales',{clientId:q.clientId,clientName:q.clientName,
      date:today(),description:q.name,amount:q.grossPrice,
      materialCost:q.totalCost,
      status:'da_pagare',channel:'Diretto',originQuote:quoteId,originOrder:orderId
    });
    q.status='confermato';q.orderId=orderId;q.saleId=saleId;
    await IDB.put('quotes',q);
    Bus.emit('sale:created',{saleId,quoteId});
    toast('🚀 Pipeline completa! Ordine in Kanban + Vendita da pagare creati.','success');
    await Quoter.renderList();
    // Show choice
    if(confirm('Vai al Kanban Ordini?')) App.navigate('orders');
    else App.navigate('sales');
  }
};

// ── ALIAS: expose QuoterBridge methods needed by Quoter buttons ──────────
// The "🔗 Link" button in the Quoter toolbar calls Quoter.shareConfigurator()
// but the function lives in QuoterBridge — bridge it here so it is never undefined.
Quoter.shareConfigurator = function(){ QuoterBridge.shareConfigurator(); };

// ===== WORKFLOW =====
const QuoteShare = {
  async generateShareable(quoteId) {
    const q = await IDB.get('quotes', quoteId);
    if (!q) return;
    const settings = await IDB.get('settings', 'main') || {};
    const items = (q.items || []).map(i => `<tr><td style="padding:8px 12px">${i.name}</td><td style="padding:8px 12px;text-align:center">${i.qty}</td><td style="padding:8px 12px;text-align:right">€${parseFloat(i.price||0).toFixed(2)}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Preventivo — ${settings.company || 'Ingly Laser'}</title>
<style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px;color:#1f2937;background:#f9fafb}
.header{background:linear-gradient(135deg,#8b5cf6,#06b6d4);color:#fff;padding:30px;border-radius:12px;margin-bottom:24px}
h1{margin:0;font-size:24px}table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.1)}
th{background:#8b5cf6;color:#fff;padding:10px 12px;text-align:left}tr:nth-child(even){background:#f3f4f6}
.total{font-size:22px;font-weight:bold;color:#8b5cf6;text-align:right;margin-top:16px}
.sign{background:#fff;border-radius:12px;padding:20px;margin-top:24px;border:2px dashed #d1d5db;text-align:center}
</style></head><body>
<div class="header"><h1>📋 Preventivo</h1><p style="opacity:.8;margin:4px 0">${settings.company||'Ingly Laser'} — ${settings.email||''}</p></div>
<p><strong>Cliente:</strong> ${q.client||'N/D'} | <strong>Data:</strong> ${q.date||''}</p>
<table><thead><tr><th>Articolo</th><th>Qtà</th><th>Prezzo</th></tr></thead><tbody>${items}</tbody></table>
<div class="total">Totale: €${parseFloat(q.total||0).toFixed(2)}</div>
${q.notes ? `<p style="margin-top:16px;font-size:13px;color:#6b7280">${q.notes}</p>` : ''}
<div class="sign"><p style="color:#6b7280;font-size:13px">Per accettare questo preventivo, rispondere a questa email o contattarci via WhatsApp.</p>
<p style="font-size:12px;color:#9ca3af">Valido 7 giorni dalla data di emissione</p></div>
<\/body><\/html>`;
    const blob = new Blob([html], {type: 'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `preventivo-${q.client||'cliente'}.html`; a.click();
    toast('✅ Preventivo HTML scaricato! Condividilo via email o WhatsApp.', 'success');
  },

  generateQR(text, canvasId) {
    const canvas = eid(canvasId);
    if (!canvas || typeof QRCode === 'undefined') return;
    // Simple QR using canvas - fallback to URL display
    canvas.style.display = 'none';
  }
};

// ===== ⑧ WEEKLY GOALS GAMIFICATION =====
const QuoterTemplates = {
  async openSave() {
    const el = eid('qt-save-name'); if(el) el.value = '';
    const desc = eid('qt-save-desc'); if(desc) desc.value = '';
    const prev = eid('qt-save-preview');
    if(prev) {
      const lines = Quoter.lines || [];
      prev.innerHTML = lines.length
        ? `<strong style="color:var(--text)">${lines.length} voci · ${fmtCur(lines.reduce((a,l)=>a+(+l.price||0)*(+l.qty||1),0))} netto</strong>
           <div style="margin-top:6px">${lines.map(l=>`<div>• ${l.name||'Voce'} × ${l.qty||1}</div>`).join('')}</div>`
        : '<span style="color:var(--red)">⚠ Aggiungi almeno una voce al preventivo prima di salvare</span>';
    }
    openModal('qt-save');
    setTimeout(()=>eid('qt-save-name')?.focus(), 100);
  },

  async save() {
    const name = (eid('qt-save-name')?.value||'').trim();
    if(!name) { toast('Inserisci un nome per il template','warning'); return; }
    const lines = (Quoter.lines||[]).slice();
        if(!lines.length) { toast('Il preventivo è vuoto','warning'); return; }
    const markup = parseFloat(eid('qr-markup')?.value||100);
    const discount = parseFloat(eid('qr-discount')?.value||0);
    const tpl = { name, desc: eid('qt-save-desc')?.value||'', lines, markup, discount, ts: Date.now() };
    await IDB.put('quote_templates', tpl);
    closeModal('qt-save');
    toast(`✅ Template "${name}" salvato!`);
  },

  async openLoad() {
    const el = eid('qt-load-list'); if(!el) return;
    const templates = (await IDB.getAll('quote_templates').catch(()=>[])).sort((a,b)=>b.ts-a.ts);
    if(!templates.length) {
      el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted)"><i class="fas fa-layer-group" style="font-size:32px;opacity:.3;display:block;margin-bottom:10px"></i>Nessun template salvato.<br><small>Crea un preventivo e clicca "Salva Template"</small></div>';
    } else {
      el.innerHTML = templates.map(t=>`
        <div style="background:var(--bg-card2);border:1px solid var(--border2);border-radius:10px;padding:14px;display:flex;align-items:center;gap:12px">
          <div style="flex:1">
            <div style="font-weight:700;font-size:14px;color:var(--text)">${t.name}</div>
            ${t.desc?`<div style="font-size:12px;color:var(--text-muted);margin-top:2px">${t.desc}</div>`:''}
            <div style="font-size:11px;color:var(--text-dim);margin-top:4px">${t.lines.length} voci · ${fmtCur(t.lines.reduce((a,l)=>a+(+l.price||0)*(+l.qty||1),0))} · ${new Date(t.ts).toLocaleDateString('it-IT')}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px">
            <button class="btn btn-primary btn-sm" onclick="QuoterTemplates.load(${t.id});closeModal('qt-load')"><i class="fas fa-upload"></i> Usa</button>
            <button class="btn btn-secondary btn-sm" onclick="QuoterTemplates.del(${t.id},this.closest('div[style]'))"><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('');
    }
    openModal('qt-load');
  },

  async load(id) {
    const tpl = await IDB.get('quote_templates', id);
    if(!tpl) return;
    Quoter.lines = tpl.lines.map(l=>({...l, id:Date.now()+Math.random()}));
    if(eid('qr-markup')) eid('qr-markup').value = tpl.markup||100;
    if(eid('qr-discount')) eid('qr-discount').value = tpl.discount||0;
    Quoter.renderLines();
    Quoter.recalcRight();
    toast(`📋 Template "${tpl.name}" caricato`);
  },

  async del(id, rowEl) {
    if(!confirm('Eliminare questo template?')) return;
    await IDB.del('quote_templates', id)
    rowEl?.remove();
    toast('Template eliminato','warning');
  }
};

// ══════════════════════════════════════════════════════════════════════════
// v75 — SIGNATURE PAD  ✍️
// ══════════════════════════════════════════════════════════════════════════
const SignaturePad = {
  _drawing: false,
  _ctx: null,
  _canvas: null,
  _empty: true,
  _onConfirm: null,
  _clientId: null,
  _quoteId: null,

  open(opts={}) {
    this._clientId = opts.clientId||null;
    this._quoteId = opts.quoteId||null;
    this._onConfirm = opts.onConfirm||null;
    const lbl = eid('sig-client-name');
    if(lbl) lbl.textContent = opts.clientName ? `Cliente: ${opts.clientName}` : '';
    openModal('signature');
    setTimeout(()=>this._init(), 120);
  },

  _init() {
    this._canvas = eid('sig-canvas');
    if(!this._canvas) return;
    this._ctx = this._canvas.getContext('2d');
    this._ctx.strokeStyle = '#1a1a1a';
    this._ctx.lineWidth = 2.5;
    this._ctx.lineCap = 'round';
    this._ctx.lineJoin = 'round';
    this._empty = true;
    this._ctx.clearRect(0,0,this._canvas.width,this._canvas.height);
    const emptyMsg = eid('sig-empty-msg');
    if(emptyMsg) emptyMsg.style.display = 'flex';
    const confirmBtn = eid('sig-confirm-btn');
    if(confirmBtn) confirmBtn.disabled = true;

    const getPos = (e) => {
      const r = this._canvas.getBoundingClientRect();
      const scaleX = this._canvas.width/r.width;
      const scaleY = this._canvas.height/r.height;
      const src = e.touches?e.touches[0]:e;
      return { x:(src.clientX-r.left)*scaleX, y:(src.clientY-r.top)*scaleY };
    };

    const start = (e) => { e.preventDefault(); this._drawing=true; const p=getPos(e); this._ctx.beginPath(); this._ctx.moveTo(p.x,p.y); if(this._empty){this._empty=false;const m=eid('sig-empty-msg');if(m)m.style.display='none';const b=eid('sig-confirm-btn');if(b)b.disabled=false;} };
    const move  = (e) => { if(!this._drawing) return; e.preventDefault(); const p=getPos(e); this._ctx.lineTo(p.x,p.y); this._ctx.stroke(); };
    const end   = (e) => { e.preventDefault(); this._drawing=false; };

    this._canvas.removeEventListener('mousedown',this._startFn);
    this._canvas.removeEventListener('mousemove',this._moveFn);
    this._canvas.removeEventListener('mouseup',this._endFn);
    this._canvas.removeEventListener('touchstart',this._startFn);
    this._canvas.removeEventListener('touchmove',this._moveFn);
    this._canvas.removeEventListener('touchend',this._endFn);

    this._startFn=start; this._moveFn=move; this._endFn=end;
    this._canvas.addEventListener('mousedown',start);
    this._canvas.addEventListener('mousemove',move);
    this._canvas.addEventListener('mouseup',end);
    this._canvas.addEventListener('touchstart',start,{passive:false});
    this._canvas.addEventListener('touchmove',move,{passive:false});
    this._canvas.addEventListener('touchend',end,{passive:false});
  },

  clear() {
    if(!this._canvas||!this._ctx) return;
    this._ctx.clearRect(0,0,this._canvas.width,this._canvas.height);
    this._empty=true;
    com.style.display='flex';
    const b=eid('sig-confirm-btn'); if(b) b.disabled=true;
  },

  async confirm() {
    if(!this._canvas||this._empty) return;
    const dataUrl = this._canvas.toDataURL('image/png');
    const sig = { clientId:this._clientId, quoteId:this._quoteId, dataUrl, ts:Date.now() };
    const id = await IDB.put('signatures', sig);
    if(this._onConfirm) this._onConfirm({...sig, id});
    this.close();
    toast('✍️ Firma salvata!');
    return dataUrl;
  },

  close() { closeModal('signature'); }
};

// ══════════════════════════════════════════════════════════════════════════
// v75 — CRM CLIENT TIMELINE (visual upgrade of showStorico)  📅
// ══════════════════════════════════════════════════════════════════════════
const PriceAdvisor = {
  async analyze() {
    const outEl = eid('price-advisor-output');
    if(!outEl) return;
    outEl.innerHTML = '<div style="text-align:center;padding:32px"><div class="spinner" style="margin:0 auto 10px"></div><div style="color:var(--text-muted)">Analisi margini in corso...</div></div>';

    const [catalog,sales,items,cfg] = await Promise.all([
      IDB.getAll('catalog').catch(()=>[]),
      IDB.getAll('sales').catch(()=>[]),
      IDB.getAll('items').catch(()=>[]),
      IDB.get('settings','main').catch(()=>({}))
    ]);
    const salesData = await AppStore.get('sales').catch(()=>[]);

    // Build product data with margin analysis
    const products = catalog.filter(p=>p.name&&(+p.price||0)>0).map(p=>{
      const cost = +p.cost||0;
      const price = +p.price||0;
      const margin = price>0?(price-cost)/price*100:0;
      const pSales = salesData.filter(s=>(s.productId===p.id)||(s.desc||'').toLowerCase().includes((p.name||'').toLowerCase().substring(0,8)));
      const revenue = pSales.reduce((a,s)=>a+(+s.amount||0),0);
      const qty = pSales.reduce((a,s)=>a+(+s.qty||1),0);
      return {...p, margin, revenue, qtySold:qty, pSales};
    });

    if(!products.length) {
      outEl.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted)">Nessun prodotto nel catalogo con prezzo impostato.</div>';
      return;
    }

    // Categorize: underpriced, healthy, overpriced
    const underpriced = products.filter(p=>p.margin<25).sort((a,b)=>a.margin-b.margin);
    const healthy = products.filter(p=>p.margin>=25&&p.margin<=65).sort((a,b)=>b.revenue-a.revenue);
    const highMargin = products.filter(p=>p.margin>65).sort((a,b)=>b.revenue-a.revenue);

    const targetMargin = 45; // target %
    const row = (p,cls,reason,suggestion) => {
      const suggestedPrice = p.cost>0 ? p.cost/(1-targetMargin/100) : 0;
      const delta = suggestedPrice - p.price;
      return `<div style="border:1px solid var(--border2);border-radius:10px;padding:14px;background:var(--bg-card2);margin-bottom:8px">
        <div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap">
          <div style="flex:1;min-width:180px">
            <div style="font-weight:700;color:var(--text)">${p.name}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${p.category||''}</div>
          </div>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <div style="text-align:center"><div style="font-size:12px;color:var(--text-muted)">Prezzo</div><div style="font-weight:800;color:var(--text)">${fmtCur(p.price)}</div></div>
            <div style="text-align:center"><div style="font-size:12px;color:var(--text-muted)">Costo</div><div style="font-weight:800;color:var(--text-muted)">${p.cost?fmtCur(p.cost):'—'}</div></div>
            <div style="text-align:center"><div style="font-size:12px;color:var(--text-muted)">Margine</div><div style="font-weight:800;color:${p.margin<25?'#ef4444':p.margin>65?'#22c55e':'#f59e0b'}">${p.margin.toFixed(1)}%</div></div>
            ${p.revenue>0?`<div style="text-align:center"><div style="font-size:12px;color:var(--text-muted)">Fatturato</div><div style="font-weight:700;color:var(--green)">${fmtCur(p.revenue)}</div></div>`:''}
          </div>
        </div>
        <div style="margin-top:10px;padding:8px 10px;background:${cls==='under'?'#ef444415':cls==='high'?'#22c55e15':'#f59e0b15'};border-radius:7px;font-size:12px;color:var(--text-muted)">
          <span style="font-weight:700;color:${cls==='under'?'#ef4444':cls==='high'?'#22c55e':'#f59e0b'}">${reason}</span><br>${suggestion}
          ${cls==='under'&&suggestedPrice>0?`<br><span style="color:var(--primary)">💡 Prezzo consigliato per margine 45%: <strong>${fmtCur(suggestedPrice)}</strong> <span style="color:var(--green)">(+${fmtCur(Math.abs(delta))})</span></span>`:''}
        </div>
      </div>`;
    };

    outEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
        <div style="background:#ef444415;border:1px solid #ef444430;border-radius:10px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:800;color:#ef4444">${underpriced.length}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">⚠️ Sotto margine</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:4px">Margine &lt; 25%</div>
        </div>
        <div style="background:#22c55e15;border:1px solid #22c55e30;border-radius:10px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:800;color:#22c55e">${healthy.length}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">✅ Margine sano</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:4px">25% – 65%</div>
        </div>
        <div style="background:#f59e0b15;border:1px solid #f59e0b30;border-radius:10px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:800;color:#f59e0b">${highMargin.length}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">🚀 Alto margine</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:4px">Margine &gt; 65%</div>
        </div>
      </div>
      ${underpriced.length?`<div style="font-size:11px;font-weight:700;color:#ef4444;text-transform:uppercase;margin-bottom:8px">⚠️ Prodotti sotto margine (${underpriced.length})</div>${underpriced.map(p=>row(p,'under','Prezzo troppo basso','Considera un aumento del prezzo o una riduzione dei costi.')).join('')}`:''}
      ${healthy.length?`<div style="font-size:11px;font-weight:700;color:#22c55e;text-transform:uppercase;margin:14px 0 8px">✅ Prodotti con margine sano (${healthy.length})</div>${healthy.slice(0,5).map(p=>row(p,'ok','Margine equilibrato','Prezzi ben posizionati. Monitora i costi dei materiali.')).join('')}`:''}
      ${highMargin.length?`<div style="font-size:11px;font-weight:700;color:#f59e0b;text-transform:uppercase;margin:14px 0 8px">🚀 Alto margine — opportunità di volume (${highMargin.length})</div>${highMargin.slice(0,3).map(p=>row(p,'high','Ottimo margine','Potenziale per campagne marketing o bundle per aumentare il volume.')).join('')}`:''}
    `;
  }
,
  showPanel(id){ toast('Price Advisor — apri Margine AI dal menu Finance','info'); }};



PriceAdvisor.showPanel = function(){ openModal('price-advisor'); PriceAdvisor.analyze(); };

// v75: Quoter signature pad integration
Quoter._openSignaturePad = async function(){
  const clientEl = eid('q-client');
  const clientId = clientEl?.value ? +clientEl.value : null;
  const clientName = clientId&&clientEl.selectedIndex>0 ? clientEl.options[clientEl.selectedIndex].text : '';
  const quoteId = this._lastSavedId||null;
  SignaturePad.open({clientId, clientName, quoteId,
    onConfirm: (sig) => { toast('✅ Firma cliente salvata!'); }
  });
};


const QuoteIntelligence = {
  async render() {
    const el = document.getElementById('view-quoteintel');
    if (!el) return;
    el.innerHTML = `<div style="padding:20px;max-width:1100px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <h2 style="color:#a78bfa;margin:0;font-size:22px">🎯 Quote Intelligence</h2>
        <span style="font-size:11px;background:#a78bfa18;color:#a78bfa;padding:3px 10px;border-radius:99px;border:1px solid #a78bfa30;font-weight:700">ANALISI PREVENTIVI</span>
      </div>
      <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px">Win/loss analysis · Conversion rate per tipo · Tempo medio chiusura · Price sensitivity</p>
      <div id="qi-content"><div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto 12px"></div><div style="color:var(--text-muted)">Analisi in corso...</div></div></div>
    </div>`;
    await this._load();
  },

  async _load() {
    const el = document.getElementById('qi-content');
    if (!el) return;
    try {
      const quotes = await AppStore.get('quotes');
      const sales = await AppStore.get('sales');
      const now = new Date();
      const fmt = v => `€${Math.round(v).toLocaleString('it-IT')}`;
      const fmtD = d => new Date(d).toLocaleDateString('it-IT',{day:'2-digit',month:'short'});

      // Core metrics
      const total = quotes.length;
      const converted = quotes.filter(q => q.status === 'accettato' || q.status === 'convertito' || q.status === 'pagato').length;
      const rejected = quotes.filter(q => q.status === 'rifiutato' || q.status === 'perso').length;
      const pending = quotes.filter(q => !q.status || q.status === 'inviato' || q.status === 'pending').length;
      const convRate = total > 0 ? (converted / total * 100) : 0;

      const totalValue = quotes.reduce((a,q) => a+(+q.total||+q.amount||0), 0);
      const convertedValue = quotes.filter(q=>q.status==='accettato'||q.status==='convertito'||q.status==='pagato').reduce((a,q) => a+(+q.total||+q.amount||0), 0);
      const avgValue = total > 0 ? totalValue / total : 0;

      // Avg close time for converted quotes
      const closeTimes = quotes
        .filter(q => (q.status==='accettato'||q.status==='convertito'||q.status==='pagato') && q.date && q.closedAt)
        .map(q => Math.round((new Date(q.closedAt)-new Date(q.date))/(1000*60*60*24)));
      const avgCloseTime = closeTimes.length > 0 ? closeTimes.reduce((a,v)=>a+v,0)/closeTimes.length : null;

      // Group by product/type
      const byType = {};
      quotes.forEach(q => {
        const type = q.type || q.category || q.productType || (q.items && q.items[0]?.name) || 'Altro';
        const key = type.length > 30 ? type.substring(0,30)+'…' : type;
        if (!byType[key]) byType[key] = { total:0, converted:0, rejected:0, value:0 };
        byType[key].total++;
        byType[key].value += (+q.total||+q.amount||0);
        if (q.status==='accettato'||q.status==='convertito'||q.status==='pagato') byType[key].converted++;
        if (q.status==='rifiutato'||q.status==='perso') byType[key].rejected++;
      });

      // Price brackets
      const brackets = [
        { label: '< €50', min:0, max:50 },
        { label: '€50-150', min:50, max:150 },
        { label: '€150-500', min:150, max:500 },
        { label: '€500-1000', min:500, max:1000 },
        { label: '> €1000', min:1000, max:Infinity },
      ];
      const priceSensitivity = brackets.map(b => {
        const inBracket = quotes.filter(q => {
          const v = +q.total||+q.amount||0;
          return v >= b.min && v < b.max;
        });
        const conv = inBracket.filter(q=>q.status==='accettato'||q.status==='convertito'||q.status==='pagato');
        return { ...b, count: inBracket.length, conv: conv.length, rate: inBracket.length > 0 ? conv.length/inBracket.length*100 : 0 };
      });

      // Recent pending quotes (need follow-up)
      const staleQuotes = quotes.filter(q => {
        if (q.status && q.status !== 'inviato' && q.status !== 'pending' && q.status !== '') return false;
        if (!q.date) return false;
        const days = (now - new Date(q.date)) / (1000*60*60*24);
        return days > 7;
      }).sort((a,b) => new Date(a.date)-new Date(b.date));

      const convColor = convRate >= 60 ? '#22c55e' : convRate >= 35 ? '#f59e0b' : '#ef4444';

      el.innerHTML = `
        <!-- KPI strip -->
        <div class="qi-stat-grid">
          <div class="qi-stat">
            <div class="label">Conversion Rate</div>
            <div class="val" style="color:${convColor}">${convRate.toFixed(0)}%</div>
            <div class="sub">${converted}/${total} preventivi</div>
          </div>
          <div class="qi-stat">
            <div class="label">Valore Convertito</div>
            <div class="val" style="color:var(--green)">${fmt(convertedValue)}</div>
            <div class="sub">su ${fmt(totalValue)} totali</div>
          </div>
          <div class="qi-stat">
            <div class="label">Valore Medio</div>
            <div class="val">${fmt(avgValue)}</div>
            <div class="sub">per preventivo</div>
          </div>
          <div class="qi-stat">
            <div class="label">Tempo Medio Chiusura</div>
            <div class="val">${avgCloseTime !== null ? Math.round(avgCloseTime)+'gg' : '—'}</div>
            <div class="sub">${closeTimes.length > 0 ? `su ${closeTimes.length} campioni` : 'Aggiungi closedAt per trackare'}</div>
          </div>
          <div class="qi-stat">
            <div class="label">Pending / Da Seguire</div>
            <div class="val" style="color:${pending>0?'#f59e0b':'var(--text)'}">${pending}</div>
            <div class="sub">${staleQuotes.length} scaduti >7gg</div>
          </div>
          <div class="qi-stat">
            <div class="label">Win Rate Valore</div>
            <div class="val" style="color:#a78bfa">${totalValue>0?(convertedValue/totalValue*100).toFixed(0):'0'}%</div>
            <div class="sub">del valore offerto</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">

          <!-- Conversion by type -->
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:18px">
            <div style="font-weight:700;color:#a78bfa;font-size:13px;margin-bottom:14px">📦 Conversion per Tipologia</div>
            ${Object.keys(byType).length === 0 ? `<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">Nessun preventivo con tipo definito</div>` :
            `<table class="qi-table">
              <tr><th>Tipo</th><th>Totale</th><th>Conv.</th><th>%</th></tr>
              ${Object.entries(byType).sort((a,b)=>b[1].total-a[1].total).slice(0,8).map(([type,d])=>{
                const rate = d.total > 0 ? d.converted/d.total*100 : 0;
                const col = rate>=60?'#22c55e':rate>=35?'#f59e0b':'#ef4444';
                return `<tr>
                  <td style="color:var(--text);font-weight:500">${type}</td>
                  <td style="color:var(--text-muted)">${d.total}</td>
                  <td style="color:#22c55e">${d.converted}</td>
                  <td><span style="display:inline-flex;align-items:center;gap:6px">
                    <span class="conv-bar" style="width:${Math.max(4,rate)}px;background:${col}"></span>
                    <span style="font-weight:700;color:${col}">${rate.toFixed(0)}%</span>
                  </span></td>
                </tr>`;
              }).join('')}
            </table>`}
          </div>

          <!-- Price sensitivity -->
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:18px">
            <div style="font-weight:700;color:#f97316;font-size:13px;margin-bottom:14px">💰 Price Sensitivity</div>
            ${priceSensitivity.filter(b=>b.count>0).length === 0 ? `<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">Nessun preventivo</div>` :
            priceSensitivity.filter(b=>b.count>0).map(b=>{
              const col = b.rate>=60?'#22c55e':b.rate>=35?'#f59e0b':'#ef4444';
              return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                <div style="width:80px;font-size:12px;font-weight:600;color:var(--text-muted)">${b.label}</div>
                <div style="flex:1">
                  <div style="height:8px;background:var(--bg-card3);border-radius:99px;overflow:hidden">
                    <div style="height:100%;width:${b.rate}%;background:${col};border-radius:99px;transition:width 1s"></div>
                  </div>
                </div>
                <div style="width:60px;text-align:right;font-size:12px;font-weight:700;color:${col}">${b.rate.toFixed(0)}%</div>
                <div style="width:40px;text-align:right;font-size:11px;color:var(--text-muted)">${b.count} prev</div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Stale quotes follow-up -->
        ${staleQuotes.length > 0 ? `<div style="background:var(--bg-card);border:1px solid #f59e0b40;border-radius:var(--radius);padding:18px;margin-bottom:20px">
          <div style="font-weight:700;color:#f59e0b;font-size:13px;margin-bottom:12px">⏰ Follow-Up Urgente — Preventivi in attesa</div>
          <table class="qi-table">
            <tr><th>Cliente</th><th>Valore</th><th>Data</th><th>Giorni</th></tr>
            ${staleQuotes.slice(0,8).map(q=>{
              const days = Math.round((now-new Date(q.date))/(1000*60*60*24));
              const urgColor = days>30?'#ef4444':days>14?'#f59e0b':'var(--text-muted)';
              return `<tr onclick="App.navigate('quoter')" style="cursor:pointer">
                <td style="color:var(--text);font-weight:500">${q.clientName||q.client||'—'}</td>
                <td style="color:#22c55e;font-weight:700">${fmt(+q.total||+q.amount||0)}</td>
                <td style="color:var(--text-muted)">${fmtD(q.date)}</td>
                <td style="color:${urgColor};font-weight:700">${days}gg</td>
              </tr>`;
            }).join('')}
          </table>
        </div>` : ''}

        <!-- Win/Loss analysis -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:18px">
          <div style="font-weight:700;color:var(--text);font-size:13px;margin-bottom:14px">📊 Distribuzione Status</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${[
              { label:'Convertiti', count:converted, color:'#22c55e' },
              { label:'Rifiutati', count:rejected, color:'#ef4444' },
              { label:'In attesa', count:pending, color:'#f59e0b' },
              { label:'Tutti', count:total, color:'#a78bfa' },
            ].map(s=>`<div style="flex:1;min-width:100px;background:var(--bg-card2);border:1px solid ${s.color}30;border-radius:10px;padding:12px;text-align:center">
              <div style="font-size:24px;font-weight:800;color:${s.color}">${s.count}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${s.label}</div>
            </div>`).join('')}
          </div>
        </div>
      `;
    } catch(e) {
      document.getElementById('qi-content').innerHTML = `<div style="color:var(--text-muted);padding:30px;text-align:center">Errore nel calcolo: ${e.message}</div>`;
    }
  },
};

// ═══════════════════════════════════════════════════════
// v67 — SPRINT 3: DYNAMIC PRICE SUGGESTER
// ═══════════════════════════════════════════════════════
const DynamicPriceSuggester = {
  async render() {
    const el = document.getElementById('view-dynamicprice');
    if (!el) return;
    el.innerHTML = `<div style="padding:20px;max-width:1000px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <h2 style="color:#fb923c;margin:0;font-size:22px">🔥 Prezzi Dinamici</h2>
        <span style="font-size:11px;background:#fb923c18;color:#fb923c;padding:3px 10px;border-radius:99px;border:1px solid #fb923c30;font-weight:700">AI PRICING</span>
      </div>
      <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px">Suggerimenti di prezzo basati su domanda reale · stagionalità · margini · posizionamento</p>
      <div id="dp-content"><div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto 12px"></div><div style="color:var(--text-muted)">Analisi prezzi...</div></div></div>
    </div>`;
    await this._load();
  },

  _calcSeasonIndex(productSales) {
    // Compare current month vs average across months
    const now = new Date();
    const curM = now.getMonth();
    const byMonth = Array(12).fill(0);
    const countByMonth = Array(12).fill(0);
    productSales.forEach(s => {
      const m = new Date(s.date||0).getMonth();
      byMonth[m] += (+s.amount||0);
      countByMonth[m]++;
    });
    const avg = byMonth.reduce((a,v)=>a+v,0) / 12;
    if (avg === 0) return 1;
    return (byMonth[curM] / avg) || 1;
  },

  _calcVelocity(productSales, days=30) {
    const cutoff = new Date(Date.now() - days*24*3600*1000);
    const recent = productSales.filter(s => new Date(s.date||0) >= cutoff);
    const older = productSales.filter(s => {
      const d = new Date(s.date||0);
      return d < cutoff && d >= new Date(Date.now() - days*2*24*3600*1000);
    });
    const recentAmt = recent.reduce((a,s)=>a+(+s.amount||0),0);
    const olderAmt = older.reduce((a,s)=>a+(+s.amount||0),0);
    return olderAmt > 0 ? recentAmt / olderAmt : (recentAmt > 0 ? 1.5 : 0.8);
  },

  async _load() {
    const el = document.getElementById('dp-content');
    if (!el) return;
    try {
      const sales = await AppStore.get('sales');
      const catalog = await AppStore.get('catalog').catch(()=>[]);
      const fmt = v => `€${(+v).toFixed(2)}`;

      // Build product map from sales
      const productMap = {};
      sales.forEach(s => {
        const name = s.productName || s.product || s.item || 'Prodotto';
        if (!productMap[name]) productMap[name] = { name, sales:[], totalRev:0, count:0, prices:[] };
        productMap[name].sales.push(s);
        productMap[name].totalRev += (+s.amount||0);
        productMap[name].count++;
        if (+s.price||+s.amount) productMap[name].prices.push(+(s.price||s.amount||0));
      });

      const suggestions = Object.values(productMap)
        .filter(p => p.count >= 2)
        .map(p => {
          const avgPrice = p.prices.length > 0 ? p.prices.reduce((a,v)=>a+v,0)/p.prices.length : 0;
          const costFromCatalog = catalog.find(c => c.name === p.name)?.costPrice || 0;
          const margin = avgPrice > 0 && costFromCatalog > 0 ? (avgPrice - costFromCatalog)/avgPrice*100 : null;
          const velocity = this._calcVelocity(p.sales);
          const seasonIdx = this._calcSeasonIndex(p.sales);

          let multiplier = 1;
          const reasons = [];

          // Demand pressure: selling fast → raise
          if (velocity > 1.3) { multiplier *= 1.06; reasons.push('📈 Vendite in crescita (+' + ((velocity-1)*100).toFixed(0)+'%)'); }
          else if (velocity < 0.7) { multiplier *= 0.97; reasons.push('📉 Vendite in calo — considera promo'); }

          // Seasonal pressure
          if (seasonIdx > 1.3) { multiplier *= 1.05; reasons.push(`🗓 Stagione alta (${(seasonIdx*100).toFixed(0)}% rispetto alla media)`); }
          else if (seasonIdx < 0.7) { multiplier *= 0.97; reasons.push('❄️ Bassa stagione — possibile sconto strategico'); }

          // Margin pressure
          if (margin !== null && margin < 30) { multiplier *= 1.08; reasons.push(`⚠️ Margine basso (${margin.toFixed(0)}%) — prezzo troppo basso`); }
          else if (margin !== null && margin > 70) { reasons.push(`✅ Ottimo margine (${margin.toFixed(0)})%`); }

          const suggestedPrice = avgPrice * multiplier;
          const change = suggestedPrice - avgPrice;
          const pctChange = avgPrice > 0 ? change/avgPrice*100 : 0;
          const action = Math.abs(pctChange) < 2 ? 'ok' : pctChange > 0 ? 'raise' : 'lower';

          return { name: p.name, avgPrice, suggestedPrice, change, pctChange, action, reasons, count: p.count, margin, velocity, seasonIdx };
        })
        .sort((a,b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));

      if (suggestions.length === 0) {
        el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">
          <div style="font-size:48px;margin-bottom:12px">📦</div>
          <div style="font-size:14px">Servono almeno 2 vendite per prodotto per generare suggerimenti di prezzo.</div>
          <div style="font-size:12px;margin-top:8px">Aggiungi vendite nella sezione <a onclick="App.navigate('sales')" style="color:var(--primary);cursor:pointer">Vendite</a></div>
        </div>`;
        return;
      }

      const actionCounts = { raise: suggestions.filter(s=>s.action==='raise').length, lower: suggestions.filter(s=>s.action==='lower').length, ok: suggestions.filter(s=>s.action==='ok').length };

      el.innerHTML = `
        <!-- Summary -->
        <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
          <div style="flex:1;min-width:120px;background:#22c55e18;border:1px solid #22c55e30;border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:22px;font-weight:800;color:#22c55e">${actionCounts.raise}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px">Alza il prezzo 📈</div>
          </div>
          <div style="flex:1;min-width:120px;background:#ef444415;border:1px solid #ef444430;border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:22px;font-weight:800;color:#ef4444">${actionCounts.lower}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px">Rivedi il prezzo 📉</div>
          </div>
          <div style="flex:1;min-width:120px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:22px;font-weight:800;color:var(--text-muted)">${actionCounts.ok}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px">Prezzo ok ✅</div>
          </div>
          <div style="flex:1;min-width:120px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:22px;font-weight:800;color:var(--text)">${suggestions.length}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px">Prodotti analizzati</div>
          </div>
        </div>

        <!-- Product cards -->
        ${suggestions.map(s => `
          <div class="dp-card">
            <div class="dp-header">
              <div class="dp-product">${s.name}</div>
              <span class="dp-badge ${s.action}">${s.action==='raise'?'↑ Alza Prezzo':s.action==='lower'?'↓ Rivedi':'✓ OK'}</span>
            </div>
            <div class="dp-prices">
              <div class="dp-price-item">
                <div class="label">Prezzo Attuale</div>
                <div class="val">${s.avgPrice>0?fmt(s.avgPrice):'—'}</div>
              </div>
              <div class="dp-arrow">${s.action==='raise'?'→':'→'}</div>
              <div class="dp-price-item" style="border:1px solid ${s.action==='raise'?'#22c55e40':s.action==='lower'?'#ef444440':'var(--border)'}">
                <div class="label">Prezzo Suggerito</div>
                <div class="val" style="color:${s.action==='raise'?'#22c55e':s.action==='lower'?'#f59e0b':'var(--text)'}">${s.suggestedPrice>0?fmt(s.suggestedPrice):'—'}</div>
              </div>
              ${s.pctChange !== 0 ? `<div class="dp-price-item">
                <div class="label">Variazione</div>
                <div class="val" style="color:${s.pctChange>0?'#22c55e':'#f59e0b'}">${s.pctChange>0?'+':''}${s.pctChange.toFixed(1)}%</div>
              </div>` : ''}
            </div>
            <div class="dp-reason">${s.reasons.join(' &nbsp;·&nbsp; ') || 'Prezzo nella fascia ottimale'}</div>
            <div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:var(--text-dim)">
              <span>📊 ${s.count} vendite</span>
              ${s.margin !== null ? `<span>💰 Margine: ${s.margin.toFixed(0)}%</span>` : ''}
              <span>⚡ Velocità: ${(s.velocity*100).toFixed(0)}%</span>
              <span>🗓 Stagione: ${(s.seasonIdx*100).toFixed(0)}%</span>
            </div>
          </div>
        `).join('')}
      `;
    } catch(e) {
      document.getElementById('dp-content').innerHTML = `<div style="color:var(--text-muted);padding:30px;text-align:center">Errore: ${e.message}</div>`;
    }
  },
};

// ═══════════════════════════════════════════════════════
// v67 — SPRINT 3: TAX CALENDAR
// ═══════════════════════════════════════════════════════
window.RecurringInvoices = RecurringInvoices;
window.Quoter = Quoter;
window.QuoterBridge = QuoterBridge;
window.QuoteShare = typeof QuoteShare !== 'undefined' ? QuoteShare : {};
window.QuoterTemplates = QuoterTemplates;
window.SignaturePad = SignaturePad;
window.PriceAdvisor = PriceAdvisor;
window.QuoteIntelligence = QuoteIntelligence;
window.DynamicPriceSuggester = DynamicPriceSuggester;

