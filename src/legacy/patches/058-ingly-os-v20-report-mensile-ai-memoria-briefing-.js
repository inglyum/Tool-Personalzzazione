
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v20 — REPORT MENSILE · AI MEMORIA · BRIEFING AZIONI · LICENZE
// ════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 1. REPORT MENSILE AUTOMATICO — genera PDF ogni fine mese
// ═══════════════════════════════════════════════════════════════════════
const MonthlyAutoReport = {
  _SK: 'ingly_monthly_report_v1',

  async generate(monthOverride) {
    const now   = new Date();
    const month = monthOverride || now.getMonth();
    const year  = monthOverride !== undefined ? now.getFullYear() : (month === now.getMonth() ? now.getFullYear() : (month === 11 ? now.getFullYear()-1 : now.getFullYear()));
    const mName = new Date(year, month, 1).toLocaleDateString('it-IT',{month:'long',year:'numeric'});

    if(typeof toast !== 'undefined') toast('📊 Generando report '+mName+'...','info');

    try {
      const [sales, orders, clients, quotes] = await Promise.all([
        IDB.getAll('sales').catch(()=>[]),
        IDB.getAll('orders').catch(()=>[]),
        IDB.getAll('clients').catch(()=>[]),
        IDB.getAll('quotes').catch(()=>[]),
      ]);

      // Filter by month/year
      const inMonth = (dateStr) => {
        if(!dateStr) return false;
        const d = new Date(dateStr);
        return d.getMonth() === month && d.getFullYear() === year;
      };

      const mSales   = sales.filter(s => inMonth(s.date||s.createdAt));
      const mOrders  = orders.filter(o => inMonth(o.createdAt));
      const mQuotes  = quotes.filter(q => inMonth(q.date||q.createdAt));
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear  = month === 0 ? year - 1 : year;
      const prevSales = sales.filter(s => {
        const d = new Date(s.date||s.createdAt||0);
        return d.getMonth()===prevMonth && d.getFullYear()===prevYear;
      });

      const revenue      = mSales.reduce((a,s)=>a+(+(s.amount||0)),0);
      const prevRevenue  = prevSales.reduce((a,s)=>a+(+(s.amount||0)),0);
      const revenueChg   = prevRevenue > 0 ? ((revenue-prevRevenue)/prevRevenue*100).toFixed(1) : null;
      const paid         = mSales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+(s.amount||0)),0);
      const pending      = mSales.filter(s=>s.status!=='pagato').reduce((a,s)=>a+(+(s.amount||0)),0);

      // Top clienti del mese
      const clientMap = {};
      mSales.forEach(s => {
        const k = s.clientName||'—';
        clientMap[k] = (clientMap[k]||0) + (+(s.amount||0));
      });
      const topClients = Object.entries(clientMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

      // Channel breakdown
      const channelMap = {};
      mSales.forEach(s => { const k=s.channel||'Diretto'; channelMap[k]=(channelMap[k]||0)+(+(s.amount||0)); });

      // AI insights (if available)
      let aiInsights = [];
      if(typeof AIProvider !== 'undefined' && AIProvider.getKey && AIProvider.getKey()) {
        try {
          const prompt = `Sei un consulente business per artigiani. Analizza questi dati del mese ${mName}:
- Fatturato: €${revenue.toFixed(0)} (${revenueChg !== null ? (revenueChg >= 0 ? '+' : '') + revenueChg + '% vs mese scorso' : 'primo mese'})
- Ordini completati: ${mSales.length}
- Top canale: ${Object.entries(channelMap).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—'}
- Pagamenti in sospeso: €${pending.toFixed(0)}
Dai 3 consigli pratici e concreti per il mese prossimo, in italiano, max 2 righe ciascuno. Formato: "1. [titolo]: [consiglio]"`;

          const r = await fetch('https://api.anthropic.com/v1/messages', {
            method:'POST',
            headers:{'Content-Type':'application/json','x-api-key':AIProvider.getKey(),'anthropic-version':'2023-06-01'},
            body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:400,messages:[{role:'user',content:prompt}]})
          });
          if(r.ok) {
            const data = await r.json();
            const text = data.content?.[0]?.text || '';
            aiInsights = text.split('\n').filter(l=>l.trim().match(/^\d\./)).slice(0,3);
          }
        } catch(e) { /* AI optional */ }
      }

      // Render HTML report
      const cp = (typeof CompanyProfile!=='undefined') ? CompanyProfile.get() : {};
      const html = this._buildHTML({ mName, revenue, prevRevenue, revenueChg, paid, pending,
        mSales, mOrders, mQuotes, topClients, channelMap, aiInsights, cp });

      // Show in modal
      this._showModal(html, mName);

      // Save to IDB
      const reportId = `${year}-${String(month+1).padStart(2,'0')}`;
      await IDB.put('backups', { id:'report_'+reportId, type:'monthly_report', month:reportId, html, ts:Date.now() }).catch(()=>{});

    } catch(e) {
      if(typeof toast!=='undefined') toast('Errore report: '+e.message,'error');
    }
  },

  _buildHTML(d) {
    const fmt = v => '€'+Math.round(v).toLocaleString('it-IT');
    const chg = d.revenueChg !== null ? (d.revenueChg >= 0 ? `<span style="color:#22c55e">▲ ${d.revenueChg}%</span>` : `<span style="color:#ef4444">▼ ${Math.abs(d.revenueChg)}%</span>`) : '<span style="color:#888">primo mese</span>';

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:'Helvetica Neue',Arial,sans-serif;margin:0;background:#f8f9fa;color:#1a1a2e}
  .page{max-width:800px;margin:0 auto;background:#fff;padding:40px}
  h1{font-size:26px;font-weight:900;margin:0 0 4px}
  .sub{font-size:14px;color:#666;margin-bottom:30px}
  .kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px}
  .kpi{background:linear-gradient(135deg,#6366f1,#818cf8);border-radius:12px;padding:18px;color:#fff}
  .kpi.green{background:linear-gradient(135deg,#10b981,#059669)}
  .kpi.orange{background:linear-gradient(135deg,#f97316,#ea580c)}
  .kpi .label{font-size:11px;opacity:.8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
  .kpi .value{font-size:26px;font-weight:900}
  .kpi .sub2{font-size:11px;opacity:.7;margin-top:2px}
  section{margin-bottom:28px}
  h2{font-size:16px;font-weight:700;margin:0 0 12px;padding-bottom:6px;border-bottom:2px solid #6366f1;color:#1a1a2e}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#f1f5f9;padding:8px 12px;text-align:left;font-weight:700;color:#475569;font-size:11px;text-transform:uppercase}
  td{padding:9px 12px;border-bottom:1px solid #f1f5f9}
  tr:last-child td{border:none}
  .ai-box{background:#f8f7ff;border-left:4px solid #6366f1;padding:14px 18px;border-radius:0 10px 10px 0}
  .ai-item{margin-bottom:10px;font-size:13px;line-height:1.6}
  .footer{text-align:center;font-size:11px;color:#999;margin-top:30px;padding-top:20px;border-top:1px solid #eee}
  @media print{body{background:#fff}.page{padding:0}}
</style></head><body><div class="page">
<h1>${d.cp.name||'Report Mensile'}</h1>
<div class="sub">📊 Report ${d.mName} — generato il ${new Date().toLocaleDateString('it-IT')}</div>

<div class="kpi-row">
  <div class="kpi"><div class="label">Fatturato</div><div class="value">${fmt(d.revenue)}</div><div class="sub2">${chg} vs mese scorso</div></div>
  <div class="kpi green"><div class="label">Incassato</div><div class="value">${fmt(d.paid)}</div><div class="sub2">${d.mSales.filter(s=>s.status==='pagato').length} fatture pagate</div></div>
  <div class="kpi orange"><div class="label">In sospeso</div><div class="value">${fmt(d.pending)}</div><div class="sub2">${d.mSales.filter(s=>s.status!=='pagato').length} da incassare</div></div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px">
  <div style="background:#f8f9fa;border-radius:10px;padding:14px">
    <div style="font-size:12px;font-weight:700;color:#6366f1;margin-bottom:8px;text-transform:uppercase">Riepilogo attività</div>
    <div style="font-size:13px;margin-bottom:5px">📋 Preventivi: <strong>${d.mQuotes.length}</strong></div>
    <div style="font-size:13px;margin-bottom:5px">📦 Ordini: <strong>${d.mOrders.length}</strong></div>
    <div style="font-size:13px">💰 Vendite: <strong>${d.mSales.length}</strong></div>
  </div>
  <div style="background:#f8f9fa;border-radius:10px;padding:14px">
    <div style="font-size:12px;font-weight:700;color:#6366f1;margin-bottom:8px;text-transform:uppercase">Canali</div>
    ${Object.entries(d.channelMap).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>`
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
      <span>${k}</span><strong>${fmt(v)}</strong>
    </div>`).join('')}
  </div>
</div>

${d.topClients.length ? `<section>
<h2>Top Clienti del Mese</h2>
<table>
  <thead><tr><th>#</th><th>Cliente</th><th>Fatturato</th><th>%</th></tr></thead>
  <tbody>
    ${d.topClients.map(([name,val],i)=>`<tr>
      <td style="color:#6366f1;font-weight:700">${i+1}</td>
      <td>${name}</td>
      <td style="font-weight:700">${fmt(val)}</td>
      <td style="color:#888">${d.revenue>0?(val/d.revenue*100).toFixed(0):'0'}%</td>
    </tr>`).join('')}
  </tbody>
</table></section>` : ''}

${d.aiInsights.length ? `<section>
<h2>🤖 Consigli AI per il prossimo mese</h2>
<div class="ai-box">
  ${d.aiInsights.map(tip=>`<div class="ai-item">${tip}</div>`).join('')}
</div></section>` : ''}

<div class="footer">${d.cp.name||'INGLY OS'} · ${d.cp.piva||''} · ${d.cp.phone||''} · Generato con INGLY OS v20</div>
</div></body></html>`;
  },

  _showModal(html, mName) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:#000c;z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick = e=>{ if(e.target===modal) modal.remove(); };
    modal.innerHTML = `
    <div style="background:var(--bg-card);border-radius:14px;width:min(860px,96vw);max-height:90vh;overflow:hidden;border:1px solid var(--border2);box-shadow:0 24px 64px #000d;display:flex;flex-direction:column">
      <div style="padding:12px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0">
        <div style="flex:1">
          <div style="font-size:14px;font-weight:800">📊 Report ${mName}</div>
          <div style="font-size:10px;color:var(--text-muted)">Anteprima — clicca Stampa/PDF per salvare</div>
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="document.getElementById('monthly-report-frame').contentWindow.print()"
            style="padding:7px 14px;background:var(--primary);color:#000;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">🖨️ Stampa/PDF</button>
          <button onclick="MonthlyAutoReport._download()"
            style="padding:7px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px">📥 HTML</button>
          <button onclick="this.closest('[style*=fixed]').remove()"
            style="padding:7px 10px;background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">✕</button>
        </div>
      </div>
      <div style="flex:1;overflow:auto">
        <iframe id="monthly-report-frame" srcdoc="" style="width:100%;height:600px;border:none"></iframe>
      </div>
    </div>`;
    document.body.appendChild(modal);
    setTimeout(()=>{
      const frame = document.getElementById('monthly-report-frame');
      if(frame) frame.srcdoc = html;
      this._lastHTML = html;
      this._lastName = mName;
    }, 100);
  },

  _download() {
    if(!this._lastHTML) return;
    const blob = new Blob([this._lastHTML],{type:'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'report-'+this._lastName.replace(/ /g,'-')+'.html';
    a.click();
    URL.revokeObjectURL(a.href);
  },
};
window.MonthlyAutoReport = MonthlyAutoReport;


// ═══════════════════════════════════════════════════════════════════════
// 2. AI MEMORIA CONVERSAZIONE — contesto persistente
// ═══════════════════════════════════════════════════════════════════════
const AIMemory = {
  _SK: 'ingly_ai_memory_v1',
  _MAX_SESSIONS: 10,
  _MAX_CHARS: 4000,

  get() {
    try { return JSON.parse(localStorage.getItem(this._SK)||'{"sessions":[],"summary":"","facts":[]}'); }
    catch { return {sessions:[],summary:'',facts:[]}; }
  },

  save(data) {
    localStorage.setItem(this._SK, JSON.stringify(data));
  },

  addSession(messages) {
    const mem = this.get();
    const session = {
      ts: new Date().toISOString(),
      date: new Date().toLocaleDateString('it-IT'),
      msgs: messages.slice(-6), // ultimi 6 messaggi
    };
    mem.sessions.unshift(session);
    mem.sessions = mem.sessions.slice(0, this._MAX_SESSIONS);
    this.save(mem);
  },

  addFact(fact) {
    const mem = this.get();
    if(!mem.facts.includes(fact)) {
      mem.facts.unshift(fact);
      mem.facts = mem.facts.slice(0,20);
    }
    this.save(mem);
  },

  buildContext() {
    const mem = this.get();
    const cp = (typeof CompanyProfile!=='undefined') ? CompanyProfile.get() : {};
    let ctx = '';

    if(cp.name) ctx += `Studio/azienda: ${cp.name}. `;
    if(cp.regime) ctx += `Regime fiscale: ${cp.regime}. `;

    if(mem.facts.length) {
      ctx += '\nInformazioni note sull\'utente: ' + mem.facts.slice(0,8).join('; ') + '. ';
    }

    if(mem.sessions.length) {
      const lastSession = mem.sessions[0];
      const lastMsg = lastSession.msgs[lastSession.msgs.length-1];
      if(lastMsg) ctx += `\nUltima conversazione (${lastSession.date}): "${lastMsg.content?.slice(0,100)}..."`;
    }

    return ctx.trim();
  },

  extractFacts(aiResponse) {
    // Estrai fatti chiave dalla risposta AI (materiali usati, preferenze, ecc)
    const patterns = [
      /lavori con (\w[\w\s,]+)/gi,
      /usi (\w[\w\s]+) per/gi,
      /la tua.*?è (\w[\w\s]+)/gi,
    ];
    patterns.forEach(p => {
      const matches = aiResponse.matchAll(p);
      for(const m of matches) {
        if(m[1] && m[1].length < 50) this.addFact(m[1].trim());
      }
    });
  },

  // Pannello memoria in AI Studio
  renderMemoryPanel() {
    const mem = this.get();
    const el = document.getElementById('ai-memory-panel');
    if(!el) return;
    el.innerHTML = `
    <div style="padding:10px">
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">
        🧠 Memoria AI — ${mem.sessions.length} sessioni · ${mem.facts.length} fatti
      </div>
      ${mem.facts.length ? `<div style="margin-bottom:8px">
        <div style="font-size:10px;font-weight:700;color:var(--primary);margin-bottom:4px">Fatti memorizzati</div>
        ${mem.facts.slice(0,6).map(f=>`<div style="font-size:10px;padding:2px 6px;background:var(--primary-dim);border-radius:4px;display:inline-block;margin:2px;color:var(--primary)">${f}</div>`).join('')}
      </div>`:''}
      <div style="display:flex;gap:5px">
        <button onclick="AIMemory.clear()" style="padding:4px 8px;background:#ef444415;border:1px solid #ef444430;border-radius:5px;cursor:pointer;font-size:10px;color:#ef4444">🗑 Cancella memoria</button>
      </div>
    </div>`;
  },

  clear() {
    localStorage.removeItem(this._SK);
    if(typeof toast!=='undefined') toast('🗑 Memoria AI cancellata','info');
    this.renderMemoryPanel();
  },
};
window.AIMemory = AIMemory;


// ═══════════════════════════════════════════════════════════════════════
// 3. MORNING BRIEFING v2 — azioni clickabili + contestuali
// ═══════════════════════════════════════════════════════════════════════
const BriefingActions = {

  async getActions() {
    const now   = new Date();
    const today = now.toISOString().slice(0,10);
    const actions = [];

    try {
      const [orders, sales, clients] = await Promise.all([
        IDB.getAll('orders').catch(()=>[]),
        IDB.getAll('sales').catch(()=>[]),
        IDB.getAll('clients').catch(()=>[]),
      ]);

      // 1. Ordini in scadenza oggi o domani
      const urgent = orders.filter(o => {
        if(!o.dueDate || ['venduto','annullato','completato'].includes(o.stage||o.status)) return false;
        const diff = Math.ceil((new Date(o.dueDate) - now) / 86400000);
        return diff <= 1;
      });
      if(urgent.length) actions.push({
        icon:'⚡', priority:'critical',
        title: `${urgent.length} ordine${urgent.length>1?'s':''} in scadenza`,
        desc: urgent.slice(0,2).map(o=>`${o.clientName||'—'} (${new Date(o.dueDate).toLocaleDateString('it-IT')})`).join(', '),
        cta:'Vedi ordini', action:()=>App.navigate('gestione_ordini'),
      });

      // 2. Pagamenti scaduti
      const overduePayments = sales.filter(s=>s.status==='da_pagare'&&s.paymentDue&&new Date(s.paymentDue)<now);
      if(overduePayments.length) {
        const total = overduePayments.reduce((a,s)=>a+(+(s.amount||0)),0);
        actions.push({
          icon:'💶', priority:'warn',
          title:`€${Math.round(total).toLocaleString('it-IT')} da incassare`,
          desc:`${overduePayments.length} pagament${overduePayments.length>1?'i':'o'} scadut${overduePayments.length>1?'i':'o'} — promemoria WA?`,
          cta:'Scadenzario', action:()=>App.navigate('payment_schedule'),
        });
      }

      // 3. Preventivi non risposti (> 5 giorni)
      const oldQuotes = (await IDB.getAll('quotes').catch(()=>[])).filter(q=>{
        if(!['draft','sent'].includes(q.status||'')) return false;
        const days = Math.ceil((now - new Date(q.date||q.createdAt||0)) / 86400000);
        return days > 5;
      });
      if(oldQuotes.length) actions.push({
        icon:'📋', priority:'info',
        title:`${oldQuotes.length} preventiv${oldQuotes.length>1?'i':'o'} senza risposta`,
        desc:`Inviati oltre 5 giorni fa — follow-up?`,
        cta:'Vai al Quoter', action:()=>App.navigate('quoter'),
      });

      // 4. Ordini fermi in produzione da > 7 giorni
      const stuckOrders = orders.filter(o=>{
        if((o.stage||o.status)!=='produzione') return false;
        const days = Math.ceil((now - new Date(o.updatedAt||o.createdAt||0)) / 86400000);
        return days > 7;
      });
      if(stuckOrders.length) actions.push({
        icon:'⚙️', priority:'warn',
        title:`${stuckOrders.length} ordin${stuckOrders.length>1?'i':'e'} fermo in produzione`,
        desc:`Non aggiornato da > 7 giorni — verifica stato`,
        cta:'Produzione', action:()=>{ App.navigate('gestione_ordini'); setTimeout(()=>GestioneOrdini?._setView('produzione'),300); },
      });

      // 5. Mese corrente vs scorso
      const mRevenue = sales.filter(s=>new Date(s.date||'').getMonth()===now.getMonth()&&new Date(s.date||'').getFullYear()===now.getFullYear()).reduce((a,s)=>a+(+(s.amount||0)),0);
      const prevM = now.getMonth()===0?11:now.getMonth()-1;
      const prevY = now.getMonth()===0?now.getFullYear()-1:now.getFullYear();
      const prevRevenue = sales.filter(s=>new Date(s.date||'').getMonth()===prevM&&new Date(s.date||'').getFullYear()===prevY).reduce((a,s)=>a+(+(s.amount||0)),0);
      if(mRevenue > 0 || prevRevenue > 0) {
        const chg = prevRevenue > 0 ? ((mRevenue-prevRevenue)/prevRevenue*100).toFixed(0) : null;
        actions.push({
          icon: chg !== null && +chg >= 0 ? '📈' : '📉', priority:'info',
          title:`€${Math.round(mRevenue).toLocaleString('it-IT')} questo mese`,
          desc: chg !== null ? `${chg >= 0 ? '+' : ''}${chg}% vs mese scorso (€${Math.round(prevRevenue).toLocaleString('it-IT')})` : 'Primo dato del mese',
          cta:'Report', action:()=>MonthlyAutoReport.generate(now.getMonth()),
        });
      }
    } catch(e) { /* non bloccare */ }

    return actions;
  },

  async injectIntoDashboard() {
    const el = document.getElementById('briefing-actions-panel');
    if(!el) return;
    const actions = await this.getActions();
    if(!actions.length) { el.innerHTML = '<div style="padding:12px;font-size:11px;color:var(--text-dim);text-align:center">✅ Nessuna azione urgente oggi</div>'; return; }
    const colors = {critical:'#ef4444', warn:'#f97316', info:'#3b82f6'};
    const bgs    = {critical:'#ef444412', warn:'#f9731610', info:'#3b82f610'};
    el.innerHTML = actions.map(a=>`
    <div style="display:flex;gap:10px;align-items:flex-start;padding:9px 12px;border-bottom:0.5px solid var(--border)">
      <span style="font-size:16px;flex-shrink:0">${a.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:700;color:var(--text)">${a.title}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.desc}</div>
      </div>
      <button onclick="(${a.action.toString()})()"
        style="padding:4px 9px;background:${colors[a.priority]};color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:10px;font-weight:700;white-space:nowrap;flex-shrink:0">
        ${a.cta} →
      </button>
    </div>`).join('');
  },
};
window.BriefingActions = BriefingActions;


// ═══════════════════════════════════════════════════════════════════════
// 4. SISTEMA LICENZE — trial 14 giorni poi licenza
// ═══════════════════════════════════════════════════════════════════════
// LicenseManager — always active (no trial restrictions)
const LicenseManager = {
  isValid()          { return true; },
  isTrial()          { return false; },
  getDaysRemaining() { return 999; },
  getLicense()       { return { key:'INGLY-PRO-UNLOCKED', active:true }; },
  getInstallDate()   { return new Date(Date.now()-86400000); },
  activate()         { return true; },
  injectBadge()      {},
  init()             {},
  check()            {},
  renderPanel() {
    const el = document.getElementById('license-panel');
    if(!el) return;
    el.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#22c55e10;border:1px solid #22c55e30;border-radius:8px"><span style="font-size:20px">\u2705</span><div><div style="font-size:13px;font-weight:700;color:#22c55e">INGLY OS \u2014 Versione completa</div><div style="font-size:11px;color:var(--text-muted)">Tutte le funzionalit\u00e0 attive \u00b7 Nessun limite</div></div></div>';
  },
};
window.LicenseManager = LicenseManager;


// ═══════════════════════════════════════════════════════════════════════
// 5. INSTALL — wires tutti i nuovi moduli
// ═══════════════════════════════════════════════════════════════════════
(function installV20(){
  const tryInstall = () => {
    if(typeof App==='undefined') return setTimeout(tryInstall, 800);

    // A. Nav item Report nel menu Vendite
    const archiveNav = document.querySelector('[data-section="sales_archive"]');
    if(archiveNav && !document.querySelector('[data-section="monthly_report"]')) {
      const rNav = document.createElement('div');
      rNav.className = 'nav-item';
      rNav.setAttribute('data-section','monthly_report');
      rNav.style.cssText = 'color:var(--text-muted);font-size:11px;padding-left:28px';
      rNav.innerHTML = '<i class="fas fa-chart-bar" style="color:#6366f1;font-size:10px"></i> Report Mensile';
      rNav.onclick = ()=>{ MonthlyAutoReport.generate(); };
      archiveNav.parentNode.insertBefore(rNav, archiveNav.nextSibling);
    }

    // B. Wire renderSection patch
    if(!App.__v20Patched) {
      App.__v20Patched = true;
      const _origRS = App.renderSection?.bind(App);
      if(_origRS) App.renderSection = function(s) {
        if(s==='monthly_report') { MonthlyAutoReport.generate(); return; }
        _origRS(s);
      };
    }

    // C. Inject Briefing Actions panel nel dashboard
    const injectBriefing = () => {
      const dashView = document.getElementById('view-dashboard');
      if(!dashView || document.getElementById('briefing-actions-panel')) return;
      const panel = document.createElement('div');
      panel.style.cssText = 'margin:16px 0;background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);overflow:hidden;max-width:900px';
      panel.innerHTML = `
        <div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
          <span style="font-size:14px">⚡</span>
          <div style="flex:1;font-size:13px;font-weight:700">Azioni di oggi</div>
          <button onclick="BriefingActions.injectIntoDashboard()" style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--text-dim)">↺ aggiorna</button>
        </div>
        <div id="briefing-actions-panel"></div>`;
      const firstChild = dashView.querySelector('.page-content') || dashView.firstElementChild;
      if(firstChild) dashView.insertBefore(panel, firstChild.nextSibling || firstChild);
      else dashView.appendChild(panel);
      BriefingActions.injectIntoDashboard();
    };

    // D. Inject License + Report panels in Settings
    const injectSettings = () => {
      if(document.getElementById('license-panel')) return;
      const existingPanel = document.getElementById('company-profile-panel');
      if(!existingPanel) return;
      const parentSection = existingPanel.closest('[style*="padding:0 20px"]') || existingPanel.parentElement;
      if(!parentSection) return;

      const licSection = document.createElement('div');
      licSection.style.cssText = 'background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);margin-bottom:14px;overflow:hidden';
      licSection.innerHTML = `
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
          <span style="font-size:16px">🔑</span>
          <div style="flex:1"><div style="font-size:13px;font-weight:700">Licenza INGLY OS</div><div style="font-size:11px;color:var(--text-muted)">Trial · Attivazione · Stato</div></div>
          <span style="color:var(--text-muted)">▼</span>
        </div>
        <div id="license-panel" style="padding:0 16px;display:none"></div>`;
      parentSection.insertBefore(licSection, parentSection.firstChild);
      LicenseManager.renderPanel();
    };

    // E. Intercept settings navigation
    const _origRS2 = App.renderSection?.bind(App);
    if(_origRS2 && !App.__v20SettingsPatch) {
      App.__v20SettingsPatch = true;
      const _fn = App.renderSection;
      App.renderSection = function(s) {
        _fn.call(this, s);
        if(s==='settings') setTimeout(()=>{ injectSettings(); LicenseManager.renderPanel(); }, 400);
        if(s==='dashboard') setTimeout(injectBriefing, 500);
      };
    }

    // F. Init license + briefing
    LicenseManager.init();
    setTimeout(injectBriefing, 3500);
    setTimeout(injectSettings, 4000);

    console.log('[v20] MonthlyReport + AIMemory + BriefingActions + LicenseManager installed ✅');
  };
  setTimeout(tryInstall, 2000);
})();

