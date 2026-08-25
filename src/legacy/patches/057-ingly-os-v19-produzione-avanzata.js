
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v19 — PRODUZIONE AVANZATA
// Timer per fase · Stampa etichette QR · Costo materiali · Scadenzario
// ════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 1. PRODUCTION TIMER — start/stop per ogni ordine in produzione
// ═══════════════════════════════════════════════════════════════════════
const ProductionTimer = {
  _SK:    'ingly_prod_timers_v1',
  _active: {},   // orderId → { start: timestamp }

  getAll() { try{ return JSON.parse(localStorage.getItem(this._SK)||'{}'); }catch{ return {}; } },
  _save(data) { localStorage.setItem(this._SK, JSON.stringify(data)); },

  isRunning(orderId) { return !!(this._active[String(orderId)]); },

  start(orderId) {
    const id = String(orderId);
    if(this._active[id]) return;  // already running
    this._active[id] = { start: Date.now() };
    this._refreshUI(orderId);
    if(typeof toast!=='undefined') toast('⏱ Timer avviato!','success');
  },

  stop(orderId) {
    const id    = String(orderId);
    const entry = this._active[id];
    if(!entry) return 0;
    const elapsed = Math.round((Date.now() - entry.start) / 1000); // seconds
    delete this._active[id];

    // Persist elapsed time
    const all = this.getAll();
    if(!all[id]) all[id] = { total: 0, sessions: [] };
    all[id].total += elapsed;
    all[id].sessions.push({ start: entry.start, elapsed, date: new Date().toISOString().slice(0,10) });
    this._save(all);
    this._refreshUI(orderId);
    if(typeof toast!=='undefined') toast(`⏹ Timer fermato: ${this._fmt(elapsed)} registrati`,'info');
    return elapsed;
  },

  reset(orderId) {
    const id  = String(orderId);
    delete this._active[id];
    const all = this.getAll();
    delete all[id];
    this._save(all);
    this._refreshUI(orderId);
    if(typeof toast!=='undefined') toast('🔄 Timer azzerato','info');
  },

  getTotal(orderId) {
    const id  = String(orderId);
    const all = this.getAll();
    const running = this._active[id] ? Math.round((Date.now()-this._active[id].start)/1000) : 0;
    return (all[id]?.total||0) + running;
  },

  _fmt(secs) {
    if(!secs) return '0m';
    const h = Math.floor(secs/3600);
    const m = Math.floor((secs%3600)/60);
    const s = secs%60;
    if(h>0) return `${h}h ${m}m`;
    if(m>0) return `${m}m ${s}s`;
    return `${s}s`;
  },

  _refreshUI(orderId) {
    // Update any visible timer widget for this order
    const timerEl = document.getElementById(`pt-display-${orderId}`);
    if(timerEl) {
      timerEl.textContent = this._fmt(this.getTotal(orderId));
    }
    const btnEl = document.getElementById(`pt-btn-${orderId}`);
    if(btnEl) {
      const running = this.isRunning(orderId);
      btnEl.textContent = running ? '⏹ Stop' : '▶ Avvia';
      btnEl.style.background = running ? '#ef444420' : '#22c55e20';
      btnEl.style.borderColor = running ? '#ef444440' : '#22c55e40';
      btnEl.style.color = running ? '#ef4444' : '#22c55e';
    }
  },

  // Live update timer displays every second
  startLiveUpdate() {
    if(this._liveTimer) return;
    this._liveTimer = setInterval(()=>{
      Object.keys(this._active).forEach(id=>this._refreshUI(id));
    }, 1000);
  },

  // Render widget for a specific order
  renderWidget(orderId, opts) {
    opts = opts || {};
    const running = this.isRunning(orderId);
    const total   = this.getTotal(orderId);
    const hourCost = opts.hourlyRate || 0;
    const costEur  = hourCost > 0 ? ((total/3600)*hourCost).toFixed(2) : null;
    
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:${running?'#22c55e10':'var(--bg-card2)'};border:1px solid ${running?'#22c55e30':'var(--border)'};border-radius:8px;transition:.3s">
      <span style="font-size:14px">${running?'⏱':'⏹'}</span>
      <div style="flex:1">
        <div style="font-size:11px;font-weight:700;color:var(--text)">Tempo produzione</div>
        <div style="font-size:13px;font-weight:800;color:${running?'#22c55e':'var(--text)'}" id="pt-display-${orderId}">${this._fmt(total)}</div>
        ${costEur?`<div style="font-size:10px;color:var(--text-dim)">Costo tempo: €${costEur}</div>`:''}
      </div>
      <div style="display:flex;gap:5px">
        <button id="pt-btn-${orderId}" 
          onclick="ProductionTimer.${running?'stop':'start'}(${orderId})"
          style="padding:5px 10px;background:${running?'#ef444420':'#22c55e20'};border:1px solid ${running?'#ef444440':'#22c55e40'};border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;color:${running?'#ef4444':'#22c55e'}">
          ${running?'⏹ Stop':'▶ Avvia'}
        </button>
        ${total>0?`<button onclick="ProductionTimer.reset(${orderId})" 
          style="padding:5px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:10px;color:var(--text-muted)" title="Reset timer">↺</button>`:''}
      </div>
    </div>`;
  },
};
window.ProductionTimer = ProductionTimer;
ProductionTimer.startLiveUpdate();


// ═══════════════════════════════════════════════════════════════════════
// 2. LABEL PRINTER — stampa etichette PDF per ordini
// ═══════════════════════════════════════════════════════════════════════
const LabelPrinter = {

  async print(orderId) {
    const order = await IDB.get('orders', +orderId||orderId).catch(()=>null);
    if(!order) return;
    if(typeof window.jspdf === 'undefined') { toast('jsPDF non disponibile','error'); return; }
    const { jsPDF } = window.jspdf;
    // A6 label 105x74mm (landscape)
    const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:[105,74] });
    const cp  = (typeof CompanyProfile!=='undefined') ? CompanyProfile.get() : {};
    const val = +(order.total||order.value||0);
    const due = order.dueDate ? new Date(order.dueDate).toLocaleDateString('it-IT') : '—';

    // Background
    doc.setFillColor(248,248,252);
    doc.rect(0,0,105,74,'F');

    // Header bar
    doc.setFillColor(99,102,241);
    doc.rect(0,0,105,12,'F');

    // Company name in header
    doc.setTextColor(255,255,255);
    doc.setFontSize(9); doc.setFont(undefined,'bold');
    doc.text(cp.name || 'INGLY OS', 4, 8);
    doc.setFontSize(7); doc.setFont(undefined,'normal');
    doc.text(new Date().toLocaleDateString('it-IT'), 101, 8, {align:'right'});

    // Order ID + status
    const norm = (typeof GestioneOrdini!=='undefined') ? GestioneOrdini._normalizeState(order.stage||'preventivo') : order.stage;
    const stLabel = (typeof GestioneOrdini!=='undefined') ? (GestioneOrdini.STATES[norm]?.label||norm) : norm;
    doc.setTextColor(80,80,80);
    doc.setFontSize(7); doc.setFont(undefined,'normal');
    doc.text(`#${order.id}`, 4, 17);
    doc.setTextColor(99,102,241);
    doc.text(`● ${stLabel}`, 50, 17, {align:'center'});

    // Client name
    doc.setTextColor(20,20,40);
    doc.setFontSize(14); doc.setFont(undefined,'bold');
    doc.text(order.clientName||'—', 4, 27, {maxWidth:70});

    // Order name
    doc.setFontSize(9); doc.setFont(undefined,'normal');
    doc.setTextColor(80,80,80);
    doc.text(order.name||'Ordine', 4, 34, {maxWidth:70});

    // Priority badge
    if(order.priority==='urgent') {
      doc.setFillColor(239,68,68);
      doc.roundedRect(76,19,26,8,2,2,'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(7); doc.setFont(undefined,'bold');
      doc.text('🔴 URGENTE', 89, 24, {align:'center'});
    }

    // Divider
    doc.setDrawColor(200,200,220);
    doc.line(4, 37, 101, 37);

    // Details row
    doc.setFontSize(8); doc.setTextColor(60,60,80);
    doc.setFont(undefined,'bold'); doc.text('Scadenza', 4, 43);
    doc.setFont(undefined,'normal'); doc.text(due, 4, 49);
    doc.setFont(undefined,'bold'); doc.text('Importo', 40, 43);
    doc.setFont(undefined,'normal'); doc.text(val?`€${val.toFixed(0)}`:'—', 40, 49);
    doc.setFont(undefined,'bold'); doc.text('Canale', 76, 43);
    doc.setFont(undefined,'normal'); doc.text(order.channel||'Diretto', 76, 49);

    // Notes if present
    if(order.notes) {
      doc.setDrawColor(200,200,220);
      doc.line(4,52,101,52);
      doc.setFontSize(7); doc.setTextColor(100,100,120);
      doc.text(order.notes.slice(0,80), 4, 57, {maxWidth:97});
    }

    // QR code area (placeholder box with order ID)
    doc.setFillColor(255,255,255);
    doc.roundedRect(78,55,23,16,1,1,'FD');
    doc.setFontSize(6); doc.setTextColor(80,80,80);
    doc.text('ID Ordine', 89.5, 60, {align:'center'});
    doc.setFontSize(8); doc.setFont(undefined,'bold');
    doc.text(String(order.id), 89.5, 67, {align:'center'});

    // Footer
    doc.setFillColor(240,240,250);
    doc.rect(0,68,105,6,'F');
    doc.setFontSize(6); doc.setTextColor(120,120,140); doc.setFont(undefined,'normal');
    doc.text(cp.phone||'', 4, 72);
    doc.text('INGLY OS — Gestionale Artigiano', 52.5, 72, {align:'center'});
    doc.text(cp.email||'', 101, 72, {align:'right'});

    doc.save(`etichetta-${order.clientName||order.id}-${Date.now()}.pdf`);
    toast('🏷️ Etichetta PDF generata!', 'success');
  },

  async printBatch(orderIds) {
    toast(`⏳ Generando ${orderIds.length} etichette...`, 'info');
    for(const id of orderIds) await this.print(id);
    toast(`✅ ${orderIds.length} etichette generate!`, 'success');
  },
};
window.LabelPrinter = LabelPrinter;


// ═══════════════════════════════════════════════════════════════════════
// 3. SCADENZARIO PAGAMENTI — calendario incassi con alert
// ═══════════════════════════════════════════════════════════════════════
const PaymentSchedule = {

  async render() {
    const el = document.getElementById('view-payment_schedule');
    if(!el) return;

    const sales   = await IDB.getAll('sales').catch(()=>[]);
    const orders  = await IDB.getAll('orders').catch(()=>[]);
    const now     = new Date();

    // Incassi attesi: vendite da_pagare + ordini completati/venduti senza vendita
    const pending = sales.filter(s => s.status === 'da_pagare' || s.status === 'pending');
    const overdue = pending.filter(s => s.paymentDue && new Date(s.paymentDue) < now);
    const dueThisWeek = pending.filter(s => {
      if(!s.paymentDue) return false;
      const d = new Date(s.paymentDue);
      const diff = (d - now) / 86400000;
      return diff >= 0 && diff <= 7;
    });

    const totalPending = pending.reduce((a,s)=>a+(+(s.amount||0)),0);
    const totalOverdue = overdue.reduce((a,s)=>a+(+(s.amount||0)),0);
    const fmtE = v=>'€'+Math.round(v).toLocaleString('it-IT');

    // Group by month
    const byMonth = {};
    pending.forEach(s => {
      const key = s.paymentDue ? s.paymentDue.slice(0,7) : new Date().toISOString().slice(0,7);
      if(!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(s);
    });

    el.innerHTML = `
    <div style="padding:16px 20px;max-width:1000px;margin:0 auto">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:2px solid var(--border)">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center;font-size:22px">💶</div>
        <div style="flex:1">
          <h2 style="margin:0 0 3px;font-size:19px;font-weight:900">Scadenzario Pagamenti</h2>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">${pending.length} pagamenti in attesa · ${fmtE(totalPending)} totale</p>
        </div>
        <div style="display:flex;gap:8px">
          ${overdue.length?`<div style="padding:6px 12px;background:#ef444415;border-radius:8px;border:1px solid #ef444430;text-align:center">
            <div style="font-size:13px;font-weight:800;color:#ef4444">${fmtE(totalOverdue)}</div>
            <div style="font-size:9px;color:#ef4444">Scaduti</div>
          </div>`:''}
          ${dueThisWeek.length?`<div style="padding:6px 12px;background:#f9731615;border-radius:8px;border:1px solid #f9731630;text-align:center">
            <div style="font-size:13px;font-weight:800;color:#f97316">${dueThisWeek.length}</div>
            <div style="font-size:9px;color:#f97316">Questa settimana</div>
          </div>`:''}
          <div style="padding:6px 12px;background:var(--primary-dim);border-radius:8px;border:1px solid var(--primary-border);text-align:center">
            <div style="font-size:13px;font-weight:800;color:var(--primary)">${fmtE(totalPending)}</div>
            <div style="font-size:9px;color:var(--text-dim)">Totale atteso</div>
          </div>
        </div>
      </div>

      ${overdue.length?`<div style="background:#ef444410;border:1px solid #ef444430;border-radius:10px;padding:12px 16px;margin-bottom:12px">
        <div style="font-size:12px;font-weight:800;color:#ef4444;margin-bottom:8px">⚠️ ${overdue.length} pagamenti scaduti — ${fmtE(totalOverdue)}</div>
        ${overdue.map(s=>`<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #ef444420">
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700">${s.clientName||'—'}</div>
            <div style="font-size:10px;color:var(--text-muted)">${s.desc||'—'} · scaduto ${s.paymentDue?new Date(s.paymentDue).toLocaleDateString('it-IT'):'—'}</div>
          </div>
          <div style="font-size:13px;font-weight:800;color:#ef4444">€${(+(s.amount||0)).toFixed(0)}</div>
          <button onclick="PaymentSchedule._sendReminder(${s.id})"
            style="padding:4px 8px;background:#25D36615;border:1px solid #25D36640;border-radius:5px;cursor:pointer;font-size:10px;color:#25D366">💬 WA</button>
          <button onclick="PaymentSchedule._markPaid(${s.id})"
            style="padding:4px 8px;background:#22c55e15;border:1px solid #22c55e30;border-radius:5px;cursor:pointer;font-size:10px;font-weight:700;color:#22c55e">✓ Pagato</button>
        </div>`).join('')}
      </div>`:``}

      <!-- Timeline per mese -->
      ${Object.entries(byMonth).sort().map(([month, mSales])=>{
        const mTotal = mSales.reduce((a,s)=>a+(+(s.amount||0)),0);
        const isCurrentMonth = month === now.toISOString().slice(0,7);
        return `<div style="background:var(--bg-card2);border-radius:10px;border:1px solid ${isCurrentMonth?'var(--primary-border)':'var(--border)'};margin-bottom:10px;overflow:hidden">
          <div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:${isCurrentMonth?'var(--primary-dim)':''}">
            <div style="font-size:13px;font-weight:800">${new Date(month+'-01').toLocaleDateString('it-IT',{month:'long',year:'numeric'})}</div>
            <div style="font-size:14px;font-weight:800;color:var(--primary)">${fmtE(mTotal)} <span style="font-size:11px;font-weight:500;color:var(--text-muted)">(${mSales.length})</span></div>
          </div>
          <div style="padding:8px 0">
            ${mSales.map(s=>{
              const isOver = s.paymentDue && new Date(s.paymentDue) < now;
              const daysLeft = s.paymentDue ? Math.ceil((new Date(s.paymentDue)-now)/86400000) : null;
              return `<div style="display:flex;align-items:center;gap:10px;padding:7px 14px;border-bottom:1px solid var(--border)${isOver?';background:#ef444408':''}">
                <div style="flex:1">
                  <div style="font-size:12px;font-weight:700">${s.clientName||'—'}</div>
                  <div style="font-size:10px;color:var(--text-muted)">${s.desc||'—'}</div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:12px;font-weight:800">€${(+(s.amount||0)).toFixed(0)}</div>
                  ${daysLeft!==null?`<div style="font-size:9px;color:${isOver?'#ef4444':daysLeft<=3?'#f97316':'var(--text-dim)'}">
                    ${isOver?'⚠️ scaduto':'tra '+daysLeft+'gg'}
                  </div>`:''}
                </div>
                <div style="display:flex;gap:4px">
                  <button onclick="PaymentSchedule._sendReminder(${s.id})"
                    style="padding:3px 7px;background:#25D36615;border:1px solid #25D36630;border-radius:5px;cursor:pointer;font-size:9px;color:#25D366" title="Promemoria WA">💬</button>
                  <button onclick="PaymentSchedule._markPaid(${s.id})"
                    style="padding:3px 7px;background:#22c55e15;border:1px solid #22c55e30;border-radius:5px;cursor:pointer;font-size:9px;font-weight:700;color:#22c55e">✓</button>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}

      ${!pending.length?`<div style="text-align:center;padding:60px;color:var(--text-dim)">
        <div style="font-size:48px;margin-bottom:12px;opacity:.3">💚</div>
        <div style="font-size:16px;font-weight:700;color:var(--text-muted)">Tutto in ordine!</div>
        <div style="font-size:12px;margin-top:6px">Nessun pagamento in sospeso</div>
      </div>`:''}
    </div>`;
  },

  async _markPaid(saleId) {
    const s = await IDB.get('sales', +saleId||saleId).catch(()=>null);
    if(!s) return;
    s.status = 'pagato';
    s.paidAt = new Date().toISOString().slice(0,10);
    await IDB.put('sales', s);
    AppStore?.invalidate('sales');
    await this.render();
    toast('✅ Pagamento registrato!','success');
  },

  async _sendReminder(saleId) {
    const s = await IDB.get('sales', +saleId||saleId).catch(()=>null);
    if(!s) return;
    const cp = (typeof CompanyProfile!=='undefined') ? CompanyProfile.get() : {};
    const text = encodeURIComponent(`Gentile ${s.clientName||'cliente'},\n\nti ricordo il pagamento di €${s.amount||0} per: ${s.desc||''}.\n\n${cp.iban?'IBAN: '+cp.iban+'\n':''}\nGrazie!\n${cp.name||'Studio'}`);
    window.open(`https://wa.me/?text=${text}`,'_blank');
  },
};
window.PaymentSchedule = PaymentSchedule;


// ═══════════════════════════════════════════════════════════════════════
// 4. INSTALL: view + nav + renderSection per nuove sezioni
// ═══════════════════════════════════════════════════════════════════════
(function installV19Sections(){
  const tryInstall = () => {
    if(typeof App === 'undefined') return setTimeout(tryInstall, 800);

    // view-payment_schedule
    if(!document.getElementById('view-payment_schedule')) {
      const salesArchive = document.getElementById('view-sales_archive');
      const div = document.createElement('div');
      div.className = 'section-view'; div.id = 'view-payment_schedule';
      if(salesArchive) salesArchive.parentNode.insertBefore(div, salesArchive.nextSibling);
    }

    // Nav item scadenzario
    if(!document.querySelector('[data-section="payment_schedule"]')) {
      const archiveNav = document.querySelector('[data-section="sales_archive"]');
      if(archiveNav) {
        const nav = document.createElement('div');
        nav.className = 'nav-item';
        nav.setAttribute('data-section','payment_schedule');
        nav.onclick = ()=>App.navigate('payment_schedule');
        nav.style.cssText = 'color:var(--text-muted);font-size:11px;padding-left:28px';
        nav.innerHTML = '<i class="fas fa-calendar-check" style="color:#3b82f6;font-size:10px"></i> Scadenzario';
        archiveNav.parentNode.insertBefore(nav, archiveNav.nextSibling);
      }
    }

    // Wire renderSection
    if(!App.__v19Patched) {
      App.__v19Patched = true;
      const _origRS = App.renderSection?.bind(App);
      if(_origRS) {
        App.renderSection = function(s) {
          if(s === 'payment_schedule') { PaymentSchedule.render(); return; }
          _origRS(s);
        };
      }
    }

    // Patch GestioneOrdini detail modal to include timer and label button
    const _origDetail = GestioneOrdini?._openDetail?.bind(GestioneOrdini);
    if(_origDetail && !GestioneOrdini.__v19DetailPatched) {
      GestioneOrdini.__v19DetailPatched = true;
      GestioneOrdini._openDetail = async function(id) {
        await _origDetail(id);
        // After modal appears, inject timer widget
        setTimeout(()=>{
          const modal = document.getElementById('go-detail-modal');
          if(!modal) return;
          const actionsDiv = modal.querySelector('[style*="border-top:1px solid"]');
          if(actionsDiv && !modal.querySelector('.prod-timer-widget')) {
            const timerDiv = document.createElement('div');
            timerDiv.className = 'prod-timer-widget';
            timerDiv.style.marginBottom = '8px';
            timerDiv.innerHTML = ProductionTimer.renderWidget(id);
            actionsDiv.parentNode.insertBefore(timerDiv, actionsDiv);
            
            // Label print button
            const labelBtn = document.createElement('button');
            labelBtn.style.cssText = 'padding:9px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)';
            labelBtn.innerHTML = '🏷️ Etichetta';
            labelBtn.onclick = () => LabelPrinter.print(id);
            const btnRow = actionsDiv.querySelector('div');
            if(btnRow) btnRow.appendChild(labelBtn);
          }
          ProductionTimer.startLiveUpdate();
        }, 150);
      };
    }

    // Alert badge per scadenzario nel sidebar
    setTimeout(async()=>{
      const sales = await IDB.getAll('sales').catch(()=>[]);
      const overdue = sales.filter(s=>s.status==='da_pagare'&&s.paymentDue&&new Date(s.paymentDue)<new Date());
      if(overdue.length) {
        const navEl = document.querySelector('[data-section="payment_schedule"]');
        if(navEl && !navEl.querySelector('.pay-badge')) {
          const badge = document.createElement('span');
          badge.className = 'pay-badge';
          badge.style.cssText = 'background:#ef4444;color:#fff;font-size:8px;font-weight:800;padding:1px 5px;border-radius:99px;margin-left:5px';
          badge.textContent = overdue.length;
          navEl.appendChild(badge);
        }
      }
    }, 2500);

    console.log('[v19] PaymentSchedule + ProductionTimer + LabelPrinter installed ✅');
  };
  setTimeout(tryInstall, 2000);
})();

console.log('[INGLY OS v19] Produzione avanzata loaded ✅');

