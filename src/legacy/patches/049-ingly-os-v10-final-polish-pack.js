
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v10 — FINAL POLISH PACK
// Dashboard today widget · WA quote template · Global init patches
// ════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 1. DASHBOARD TODAY WIDGET — inject "Oggi" section if dashboard is open
// ═══════════════════════════════════════════════════════════════════════
const DashboardToday = {
  _rendered: false,

  async render() {
    const el = document.getElementById('dash-today-widget');
    if(!el) return;
    if(this._rendered && Date.now()-this._lastRender < 60000) return; // cache 1 min
    this._rendered=true; this._lastRender=Date.now();

    try {
      const [orders, sales] = await Promise.all([
        IDB.getAll('orders').catch(()=>[]),
        IDB.getAll('sales').catch(()=>[]),
      ]);
      const today    = new Date().toISOString().slice(0,10);
      const DONE     = new Set(['paid','delivered','sold','invoiced','completed','rejected','cancelled','archived']);
      const active   = orders.filter(o=>!DONE.has(o.stage||o.status||'')&&!o._archived);
      const todayDue = active.filter(o=>o.dueDate===today);
      const overdue  = active.filter(o=>o.dueDate&&o.dueDate<today);
      const ready    = active.filter(o=>(o.stage||'')===('ready'));
      const pendingAmt = sales.filter(s=>s.status==='da_pagare').reduce((a,s)=>a+(+s.amount||0),0);
      const paidToday  = sales.filter(s=>s.status==='pagato'&&(s.date||'')==today).reduce((a,s)=>a+(+s.amount||0),0);
      const fmt = v => typeof fmtCur!=='undefined'?fmtCur(v):('€'+v.toFixed(0));

      el.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px">
          <div onclick="App.navigate('pipeline')" style="padding:14px;background:var(--bg-card);border-radius:10px;border:1px solid var(--border);cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
            <div style="font-size:22px;font-weight:900;color:${overdue.length?'#ef4444':'var(--primary)'}">${active.length}</div>
            <div style="font-size:11px;color:var(--text-muted)">Ordini attivi</div>
            ${overdue.length?`<div style="font-size:10px;color:#ef4444;font-weight:700;margin-top:3px">⚠️ ${overdue.length} in ritardo</div>`:''}
          </div>
          <div onclick="App.navigate('sales')" style="padding:14px;background:var(--bg-card);border-radius:10px;border:1px solid var(--border);cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='#f97316'" onmouseout="this.style.borderColor='var(--border)'">
            <div style="font-size:22px;font-weight:900;color:${pendingAmt>0?'#f97316':'var(--text-muted)'}">${fmt(pendingAmt)}</div>
            <div style="font-size:11px;color:var(--text-muted)">Da incassare</div>
            ${paidToday>0?`<div style="font-size:10px;color:#22c55e;font-weight:700;margin-top:3px">✅ ${fmt(paidToday)} oggi</div>`:''}
          </div>
        </div>

        ${todayDue.length?`
        <div style="background:var(--bg-card);border-radius:10px;border:1px solid #f59e0b40;padding:12px 14px;margin-bottom:8px">
          <div style="font-size:11px;font-weight:700;color:#f59e0b;margin-bottom:8px">📦 Da consegnare oggi (${todayDue.length})</div>
          ${todayDue.slice(0,3).map(o=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
            <div style="width:24px;height:24px;border-radius:50%;background:var(--primary-dim);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:var(--primary)">${(o.clientName||'?')[0]}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.clientName||'—'}</div>
              <div style="font-size:10px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.name||'Ordine'}</div>
            </div>
            <div style="font-size:11px;font-weight:700;color:#22c55e">€${+(o.total||o.value||0).toFixed(0)}</div>
          </div>`).join('')}
          ${todayDue.length>3?`<div style="font-size:10px;color:var(--text-dim);margin-top:5px;text-align:center">+${todayDue.length-3} altri</div>`:''}
        </div>`:''}

        ${ready.length?`
        <div style="background:var(--bg-card);border-radius:10px;border:1px solid #10b98140;padding:10px 14px">
          <div style="font-size:11px;font-weight:700;color:#10b981;margin-bottom:6px">✅ Pronti da consegnare (${ready.length})</div>
          ${ready.slice(0,2).map(o=>`<div style="font-size:11px;color:var(--text-muted);padding:2px 0">• ${o.clientName||'—'}: ${o.name||'Ordine'}</div>`).join('')}
          <button onclick="App.navigate('pipeline')" style="margin-top:6px;padding:4px 10px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:5px;color:var(--primary);cursor:pointer;font-size:10px;font-weight:700">Vedi in Pipeline →</button>
        </div>`:''}

        ${!todayDue.length&&!ready.length&&!overdue.length?`
        <div style="text-align:center;padding:16px;color:var(--text-muted)">
          <div style="font-size:28px;margin-bottom:8px">🎉</div>
          <div style="font-size:12px">Nessun ordine urgente oggi!</div>
        </div>`:''}`;
    } catch(ex) {
      el.innerHTML = '<div style="color:var(--text-dim);font-size:11px;padding:10px">Caricamento…</div>';
    }
  },

  inject() {
    // Find dashboard view and inject the today widget
    const dashView = document.getElementById('view-dashboard');
    if(!dashView || dashView.querySelector('#dash-today-widget')) return;

    // Look for a good injection point - after the first card or kpi row
    const firstCard = dashView.querySelector('.card, .kpi-card, [class*="dash"]');
    if(!firstCard) return;

    const container = document.createElement('div');
    container.style.cssText = 'background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px';
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:12px;font-weight:800;color:var(--text)">📅 Panoramica Oggi</div>
        <div style="font-size:10px;color:var(--text-dim)">${new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'})}</div>
      </div>
      <div id="dash-today-widget"><div style="color:var(--text-dim);font-size:11px;padding:8px">⏳ Caricamento…</div></div>`;

    firstCard.parentNode.insertBefore(container, firstCard);
    this.render();
  }
};
window.DashboardToday = DashboardToday;


// ═══════════════════════════════════════════════════════════════════════
// 2. WA QUOTE TEMPLATE — send quote via WhatsApp
// ═══════════════════════════════════════════════════════════════════════
const WAQuoteTemplate = {
  sendQuote(quote) {
    const company = 'Ingly Design';
    const items   = (quote.items||[]).map(i=>`• ${i.name||'Prodotto'}: €${(+i.price||0).toFixed(2)}`).join('\n');
    const total   = quote.grossPrice||quote.total||0;
    const phone   = quote.clientPhone||'';

    const msg = `Ciao ${quote.clientName||''}! 👋\n\n` +
      `Ti invio il preventivo da *${company}*:\n\n` +
      `📋 *${quote.name||'Preventivo'}*\n` +
      (items ? items+'\n\n' : '\n') +
      `💶 *Totale: €${(+total).toFixed(2)}*\n\n` +
      `Per confermare o per qualsiasi domanda rispondimi qui!\n\n` +
      `_${company} – Artigianato laser Made in Sicily 🇮🇹_`;

    const url = phone
      ? `https://wa.me/${phone.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  },

  sendOrderConfirm(order) {
    const msg = `Ciao ${order.clientName||''}! 👋\n\n` +
      `✅ Il tuo ordine è stato *confermato*!\n\n` +
      `📦 *${order.name||'Ordine'}*\n` +
      `💶 Importo: *€${(+(order.total||order.value||0)).toFixed(2)}*\n` +
      `📅 Consegna prevista: *${order.dueDate||'Da definire'}*\n\n` +
      `Ti aggiornerò appena pronto!\n\n` +
      `_Ingly Design – Artigianato laser 🇮🇹_`;

    const url = (order.clientPhone
      ? `https://wa.me/${order.clientPhone.replace(/[^0-9]/g,'')}?text=`
      : `https://wa.me/?text=`) + encodeURIComponent(msg);
    window.open(url, '_blank');
  }
};
window.WAQuoteTemplate = WAQuoteTemplate;


// ═══════════════════════════════════════════════════════════════════════
// 3. PATCH: Wire Dashboard Today + Navigation refresh
// ═══════════════════════════════════════════════════════════════════════
(function wireAll(){
  const tryWire = () => {
    if(typeof App==='undefined'||!App.navigate) return setTimeout(tryWire, 600);

    // Patch navigate to trigger improvements
    const _origNav = App.navigate.bind(App);
    App.navigate = function(section) {
      _origNav(section);
      // Refresh QuickStats on each navigation
      setTimeout(()=>typeof QuickStats!=='undefined'&&QuickStats.update(), 400);
      // Initialize sparkline when sales opens
      if(section==='sales') setTimeout(()=>typeof SalesSparkline!=='undefined'&&SalesSparkline.init(), 350);
      // Inject today widget when dashboard opens
      if(section==='dashboard') setTimeout(()=>typeof DashboardToday!=='undefined'&&DashboardToday.inject(), 300);
    };

    // Init QuickStats
    if(typeof QuickStats!=='undefined') {
      setTimeout(()=>QuickStats.init(), 1000);
    }

    // Init SidebarBadges
    if(typeof SidebarBadges!=='undefined') {
      setTimeout(()=>SidebarBadges.init(), 1200);
    }

    // Sync theme icon on load
    const updateThemeIcon = () => {
      const btn = document.querySelector('.topbar-btn[id="theme-toggle-btn"]');
      if(btn) {
        const isLight = document.documentElement.classList.contains('light') ||
                        document.body.classList.contains('light-mode') ||
                        document.documentElement.getAttribute('data-theme')==='light';
        btn.innerHTML = isLight ? '🌙' : '☀️';
      }
    };
    setTimeout(updateThemeIcon, 500);

    // Run a startup repair for WorkflowSync
    setTimeout(()=>{
      if(typeof WorkflowSync!=='undefined') {
        WorkflowSync.repair().then(n=>{
          if(n>0) (console.info||console.log)('[WorkflowSync startup] Repaired '+n+' records');
        }).catch(()=>{});
      }
    }, 3000);

    // Check birthdays once at startup
    setTimeout(()=>{
      if(typeof ClientEnhancements!=='undefined') {
        const bdays = ClientEnhancements.checkBirthdays();
        const todayBday = bdays.filter(b=>b.daysUntil===0);
        const soon = bdays.filter(b=>b.daysUntil>0&&b.daysUntil<=3);
        if(todayBday.length) {
          setTimeout(()=>toast('🎂 Compleanno cliente oggi! Controlla i clienti.','info'), 4000);
        } else if(soon.length) {
          setTimeout(()=>toast('🎂 '+soon.length+' compleanno/anniversario nei prossimi 3 giorni','info'), 4000);
        }
      }
    }, 3500);

    (console.info||console.log)('[Final Wire] All systems initialized ✅');
  };
  setTimeout(tryWire, 800);
})();


// ═══════════════════════════════════════════════════════════════════════
// 4. PATCH SALES: add WA button per row (send payment reminder via WA)
// ═══════════════════════════════════════════════════════════════════════
(function patchSalesWARow(){
  const tryPatch = () => {
    if(typeof Sales==='undefined'||!Sales._renderRows) return setTimeout(tryPatch, 800);
    const _orig = Sales._renderRows?.bind(Sales);
    if(!_orig) return;
    Sales._renderRows = function(salesData){
      _orig(salesData);
      // After render, add WA buttons on da_pagare rows that have phone
      const tbody = document.getElementById('sales-tbody');
      if(!tbody) return;
      tbody.querySelectorAll('tr.sales-row').forEach((row, idx) => {
        const s = (this._all||[])[idx];
        if(!s || s.status!=='da_pagare') return;
        const actionsDiv = row.querySelector('.sales-actions');
        if(!actionsDiv || actionsDiv.querySelector('.wa-remind-btn')) return;
        const waBtn = document.createElement('button');
        waBtn.className = 'wa-remind-btn';
        waBtn.title = 'Invia reminder pagamento via WhatsApp';
        waBtn.style.cssText = 'padding:4px 8px;background:#25D36615;color:#25D366;border:1px solid #25D36640;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700';
        waBtn.innerHTML = '<i class="fab fa-whatsapp"></i>';
        waBtn.onclick = () => {
          const msg = 'Ciao '+s.clientName+'! 😊\n\nTi ricordo che è in attesa il pagamento per:\n📦 '+s.desc+'\n💶 *€'+s.amount+'*\n\nPuoi effettuare il pagamento quando preferisci. Grazie! 🙏\n\n_Ingly Design_';
          window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
        };
        actionsDiv.insertBefore(waBtn, actionsDiv.firstChild);
      });
      if(this._renderFooterRow) this._renderFooterRow();
      if(this._updatePillCountsEnhanced) this._updatePillCountsEnhanced();
    };
    (console.info||console.log)('[SalesWA] Row WA patch ✅');
  };
  setTimeout(tryPatch, 1500);
})();


// ═══════════════════════════════════════════════════════════════════════
// 5. ORDERS: add WA order confirm button in detail actions
// ═══════════════════════════════════════════════════════════════════════
(function patchOrderDetailWA(){
  // The order detail modal already has the WA button from waBtn injection
  // This adds a "Conferma ordine WA" flow for the quotes kanban
  const tryPatch = () => {
    if(typeof Workflow==='undefined') return setTimeout(tryPatch, 800);
    // Find cards in workflow kanban and add WA confirm button
    const addWAButtons = () => {
      document.querySelectorAll('.kanban-card').forEach(card=>{
        if(card.querySelector('.wa-confirm-btn')) return;
        const editBtn = card.querySelector('.act-btn.act-edit');
        if(!editBtn) return;
        const idMatch = editBtn.getAttribute('onclick')?.match(/\d+/);
        if(!idMatch) return;
        const id = +idMatch[0];
        const btn = document.createElement('button');
        btn.className = 'act-btn wa-confirm-btn';
        btn.style.cssText = 'background:#25D36615;color:#25D366;border-color:#25D36640';
        btn.innerHTML = '<i class="fab fa-whatsapp"></i>';
        btn.title = 'Invia preventivo via WA';
        btn.onclick = async ()=>{
          const q = await IDB.get('quotes', id).catch(()=>null);
          if(q) WAQuoteTemplate.sendQuote(q);
        };
        editBtn.parentNode?.insertBefore(btn, editBtn);
      });
    };
    // Observe kanban renders
    const obs = new MutationObserver(()=>setTimeout(addWAButtons, 200));
    obs.observe(document.body, {childList:true, subtree:true});
    (console.info||console.log)('[OrderDetailWA] Kanban WA patch ✅');
  };
  setTimeout(tryPatch, 1500);
})();

