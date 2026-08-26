
// === /src/modules/settings/index.js ===
// Settings Module - INGLY OS v88
const MorningBriefing = {
  _KEY: 'ingly_briefing_shown',

  async maybeShow() {
    const today = new Date().toISOString().split('T')[0];
    const lastShown = localStorage.getItem(this._KEY);
    if (lastShown === today) return;
    setTimeout(() => this.showV2(), 2200); // after HealthScore loads
  },

  async show() {
    // `show()` e `showV2()` inserivano l'overlay senza rimuovere quello
    // esistente: al primo avvio venivano chiamate entrambe e due modali
    // con lo stesso id si sovrapponevano.
    this.close();
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(this._KEY, today);

    // Gather all data in parallel
    const [sales, orders, materials, cashflow, quotes] = await Promise.all([
      IDB.getAll('sales').catch(() => []),
      IDB.getAll('orders').catch(() => []),
      IDB.getAll('materials').catch(() => []),
      IDB.getAll('cashflow').catch(() => []),
      IDB.getAll('quotes').catch(() => [])
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const todayStr = today;

    // Month revenue
    const monthSales = sales.filter(s => s.status === 'pagato' && new Date(s.date||0) >= monthStart);
    const monthRevenue = monthSales.reduce((a,s) => a + (+s.amount||0), 0);

    // Orders due today or overdue
    const urgentOrders = orders.filter(o => {
      if (o.status === 'delivered' || o.status === 'done') return false;
      if (!o.deadline) return false;
      return o.deadline <= todayStr;
    });

    // Orders due in next 3 days
    const soonDeadline = new Date(now.getTime() + 3*24*3600*1000).toISOString().split('T')[0];
    const soonOrders = orders.filter(o => {
      if (o.status === 'delivered' || o.status === 'done') return false;
      if (!o.deadline) return false;
      return o.deadline > todayStr && o.deadline <= soonDeadline;
    });

    // Active orders count
    const activeOrders = orders.filter(o => o.status !== 'delivered').length;

    // Low stock materials
    const lowStock = materials.filter(m => {
      const stock = +m.quantity||0;
      const min = +m.minStock||+m.minQuantity||0;
      return stock <= 0 || (min > 0 && stock <= min);
    });

    // Cash balance
    const cashIn = cashflow.filter(c => c.type === 'entrata').reduce((a,c) => a+(+c.amount||0), 0);
    const cashOut = cashflow.filter(c => c.type === 'uscita').reduce((a,c) => a+(+c.amount||0), 0);
    const cashBalance = cashIn - cashOut;

    // Pending quotes
    const pendingQuotes = quotes.filter(q => q.status === 'in_attesa' || q.status === 'bozza');

    // Year revenue (for forfettario monitor)
    const yearSales = sales.filter(s => s.status === 'pagato' && new Date(s.date||0) >= yearStart);
    const yearRevenue = yearSales.reduce((a,s) => a+(+s.amount||0), 0);
    const forfPct = Math.min(100, (yearRevenue/85000)*100);

    // Day of week greeting
    const days = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
    const dayName = days[now.getDay()];
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';

    // Build priority actions
    const actions = [];
    if (urgentOrders.length) {
      actions.push({ icon: 'fa-fire', color: '#ef4444', text: `${urgentOrders.length} ordine/i IN SCADENZA OGGI — produci subito`, nav: 'orders', urgent: true });
    }
    if (soonOrders.length) {
      actions.push({ icon: 'fa-clock', color: '#f59e0b', text: `${soonOrders.length} ordine/i scade nei prossimi 3 giorni`, nav: 'orders', urgent: false });
    }
    if (lowStock.length) {
      actions.push({ icon: 'fa-warehouse', color: '#f97316', text: `Scorte basse: ${lowStock.slice(0,3).map(m=>m.name).join(', ')}`, nav: 'stockalert', urgent: lowStock.some(m=>(+m.quantity||0)<=0) });
    }
    if (pendingQuotes.length) {
      actions.push({ icon: 'fa-file-invoice', color: '#a855f7', text: `${pendingQuotes.length} preventivo/i in attesa di risposta`, nav: 'quoter', urgent: false });
    }
    if (forfPct >= 80) {
      actions.push({ icon: 'fa-balance-scale', color: '#ef4444', text: `Regime forfettario al ${forfPct.toFixed(0)}% — monitora!`, nav: 'fiscal', urgent: forfPct >= 90 });
    }
    if (!actions.length) {
      actions.push({ icon: 'fa-check-circle', color: '#22c55e', text: 'Tutto in ordine — nessuna urgenza oggi!', nav: null, urgent: false });
    }

    const fmt = v => '€'+Math.round(v).toLocaleString('it-IT');
    const fmtDec = v => '€'+v.toFixed(2);

    const html = `
<div id="morning-briefing-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)" onclick="if(event.target.id==='morning-briefing-overlay')MorningBriefing.close()">
  <div style="background:var(--bg-card);border-radius:20px;border:1.5px solid var(--border);width:680px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,.8);position:relative">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:24px 28px;border-radius:20px 20px 0 0;position:relative">
      <button onclick="MorningBriefing.close()" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,.1);border:none;border-radius:50%;width:32px;height:32px;color:#fff;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">✕</button>
      <div style="display:flex;align-items:center;gap:14px">
        <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#f59e0b,#ef4444);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">⚡</div>
        <div>
          <div style="color:#f59e0b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:2px">${dayName} ${now.toLocaleDateString('it-IT',{day:'numeric',month:'long'})}</div>
          <div style="color:#fff;font-size:20px;font-weight:800">${greeting}! Ecco il tuo briefing.</div>
        </div>
      </div>
    </div>

    <div style="padding:24px 28px">

      <!-- KPI GRID -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px">
        ${[
          ['💰', 'Revenue Mese', fmt(monthRevenue), monthRevenue > 0 ? '#22c55e' : '#6b7280'],
          ['📋', 'Ordini Attivi', activeOrders, activeOrders > 0 ? '#3b82f6' : '#6b7280'],
          ['💳', 'Saldo Cassa', fmt(cashBalance), cashBalance >= 0 ? '#22c55e' : '#ef4444'],
          ['📄', 'Preventivi', pendingQuotes.length, pendingQuotes.length > 0 ? '#a855f7' : '#6b7280'],
        ].map(([ic,lb,v,c]) => `<div style="background:var(--bg-card2);border-radius:12px;padding:14px;border:1px solid var(--border);text-align:center">
          <div style="font-size:20px;margin-bottom:4px">${ic}</div>
          <div style="font-size:20px;font-weight:800;color:${c}">${v}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${lb}</div>
        </div>`).join('')}
      </div>

      <!-- FORFETTARIO BAR -->
      <div style="background:var(--bg-card2);border-radius:12px;padding:14px 16px;margin-bottom:22px;border:1px solid ${forfPct>=80?'#ef444440':'var(--border)'}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:12px;font-weight:700;color:var(--text)">🏛 Regime Forfettario ${now.getFullYear()}</div>
          <div style="font-size:12px;color:${forfPct>=90?'#ef4444':forfPct>=70?'#f59e0b':'#22c55e'};font-weight:700">${fmt(yearRevenue)} / €85.000 (${forfPct.toFixed(0)}%)</div>
        </div>
        <div style="background:var(--border);border-radius:99px;height:8px;overflow:hidden">
          <div style="height:8px;border-radius:99px;background:${forfPct>=90?'#ef4444':forfPct>=70?'#f59e0b':'#22c55e'};width:${forfPct}%;transition:width .5s"></div>
        </div>
      </div>

      <!-- PRIORITY ACTIONS -->
      <div style="margin-bottom:22px">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">🎯 COSA FARE OGGI</div>
        ${actions.map(a => `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:${a.urgent?a.color+'15':'var(--bg-card2)'};border-radius:10px;margin-bottom:8px;border:1px solid ${a.urgent?a.color+'40':'var(--border)'};cursor:${a.nav?'pointer':'default'}" ${a.nav?`onclick="MorningBriefing.close();App.navigate('${a.nav}')"`:''}>
          <div style="width:34px;height:34px;border-radius:9px;background:${a.color}20;border:1.5px solid ${a.color}40;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas ${a.icon}" style="color:${a.color};font-size:13px"></i>
          </div>
          <div style="flex:1;font-size:13px;color:var(--text);font-weight:${a.urgent?'700':'500'}">${a.text}</div>
          ${a.nav?`<i class="fas fa-chevron-right" style="color:var(--text-muted);font-size:11px"></i>`:''}
        </div>`).join('')}
      </div>

      <!-- FOOTER ACTIONS -->
      <div style="display:flex;gap:10px;justify-content:space-between;align-items:center">
        <div style="font-size:11px;color:var(--text-muted)">Questo briefing appare una volta al giorno</div>
        <div style="display:flex;gap:8px">
          <button onclick="MorningBriefing.snooze()" style="padding:9px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);cursor:pointer;font-size:12px;font-weight:600">Mostra domani</button>
          <button onclick="MorningBriefing.close()" style="padding:9px 20px;background:var(--primary);color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px">Inizia la giornata →</button>
        </div>
      </div>
    </div>
  </div>
</div>`;

    document.body.insertAdjacentHTML('beforeend', html);
  },

  close() {
    const el1 = document.getElementById('morning-briefing-overlay');
    const el2 = document.getElementById('morning-briefing-overlay-2');
    if (el1) el1.remove();
    if (el2) el2.remove();
  },

  snooze() {
    localStorage.removeItem(this._KEY);
    this.close();
  },

  // Manual trigger from nav
  async openManual() {
    localStorage.removeItem(this._KEY);
    await this.show();
  },

  // ── v2 UPGRADE: show() upgraded inline to use HealthScore ──
  async showV2() {
    // `show()` e `showV2()` inserivano l'overlay senza rimuovere quello
    // esistente: al primo avvio venivano chiamate entrambe e due modali
    // con lo stesso id si sovrapponevano.
    this.close();
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(this._KEY, today);

    const hsData = await HealthScore.calculate().catch(() => ({ total: 0, metrics: null }));
    const m = hsData.metrics;
    const now = new Date();
    const days = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
    const dayName = days[now.getDay()];
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';
    const scoreColor = hsData.total >= 75 ? '#22c55e' : hsData.total >= 50 ? '#f59e0b' : '#ef4444';

    // --- URGENZE (max 3) ---
    const urgencies = [];
    if (m) {
      if ((m.ops?.ordersOverdue || 0) > 0) urgencies.push({ icon: '🔴', text: `${m.ops.ordersOverdue} ordini scaduti in produzione`, nav: 'orders' });
      if ((m.anomalies?.length || 0) > 0) urgencies.push({ icon: '⚠️', text: m.anomalies[0]?.message || 'Anomalia rilevata', nav: 'analytics' });
      if ((m.clients?.atRisk || 0) > 0) urgencies.push({ icon: '😟', text: `${m.clients.atRisk} clienti a rischio abbandono`, nav: 'clv' });
    }

    // --- OPPORTUNITÀ (max 3) ---
    const opportunities = [];
    if (m) {
      if ((m.clients?.champions || 0) > 0) {
        const dormantChamp = ((typeof BDW!=='undefined'?BDW.segments?.champions:null) || []).filter(c => {
          const last = c.lastPurchase ? new Date(c.lastPurchase) : null;
          return !last || (now - last) / 86400000 > 45;
        });
        if (dormantChamp.length > 0) opportunities.push({ icon: '💎', text: `${dormantChamp.length} cliente/i top da ricontattare`, nav: 'clv' });
      }
      const pendingVal = ((typeof BDW!=='undefined'?BDW._raw?.quotes:null) || []).filter(q => q.status === 'in_attesa').reduce((a, q) => a + (+q.total || 0), 0);
      if (pendingVal > 100) opportunities.push({ icon: '📋', text: `€${pendingVal.toFixed(0)} di preventivi in attesa conferma`, nav: 'quoter' });
      if ((m.revenue?.growth || 0) > 10) opportunities.push({ icon: '📈', text: `Crescita +${m.revenue.growth.toFixed(0)}% — momento per aumentare prezzi`, nav: 'catalog' });
    }

    // --- TREND INSIGHT ---
    let insight = '📊 Aggiungi vendite per vedere insight personalizzati';
    if (m?.revenue?.mtd > 0) {
      const gr = m.revenue?.growth || 0;
      if (gr > 15) insight = `📈 Stai crescendo del +${gr.toFixed(0)}% vs mese scorso — momento di spingere!`;
      else if (gr < -10) insight = `📉 Revenue in calo del ${Math.abs(gr).toFixed(0)}% — analizza i prodotti più venduti`;
      else if ((m.clients?.champions || 0) >= 3) insight = `💎 Hai ${m.clients.champions} clienti champion — nurtura il rapporto con loro`;
      else if ((m.finance?.cashRunway || 0) < 2) insight = `🏦 Runway di cassa basso (${(m.finance?.cashRunway||0).toFixed(1)} mesi) — accelera incassi`;
    }

    // --- FOCUS DEL GIORNO ---
    let focus = '🎯 Apri un preventivo e mandalo a un prospect';
    if (urgencies.length > 0) focus = `🔴 Risolvi prima: ${urgencies[0].text}`;
    else if (opportunities.length > 0) focus = `💡 Opportunità: ${opportunities[0].text}`;

    const fmt = v => '€' + Math.round(v).toLocaleString('it-IT');
    const score = hsData.total;

    // ── STATO NEUTRO: nessun dato reale nel tool → schermata pulita, niente
    //    numeri inventati né urgenze/insight fittizi. L'utente importerà il backup. ──
    const hasData = !!m && (
      (m.revenue?.mtd || 0) > 0 ||
      (m.ops?.ordersActive || 0) > 0 ||
      (m.ops?.ordersTotal || 0) > 0 ||
      (m.ops?.ordersOverdue || 0) > 0 ||
      (m.clients?.total || 0) > 0 ||
      (m.finance?.cashBalance || 0) > 0
    );
    if (!hasData) {
      const neutral = `
<div id="morning-briefing-overlay-2" style="position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)" onclick="if(event.target.id==='morning-briefing-overlay-2')MorningBriefing.close()">
  <div style="background:var(--bg-card);border-radius:20px;border:1.5px solid var(--border2);width:560px;max-width:96vw;max-height:92vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,.8);position:relative">
    <button onclick="MorningBriefing.close()" style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,.1);border:none;border-radius:50%;width:30px;height:30px;color:#fff;cursor:pointer;font-size:14px;z-index:1">✕</button>
    <div style="padding:34px 30px 26px;text-align:center">
      <div style="width:64px;height:64px;border-radius:18px;background:var(--primary-dim);border:1px solid var(--primary-border);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:30px">🧭</div>
      <div style="color:var(--text-dim);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em">${dayName} ${now.toLocaleDateString('it-IT',{day:'numeric',month:'long'})} • ${greeting}</div>
      <div style="color:var(--text);font-size:20px;font-weight:800;margin:6px 0 8px">Benvenuto in Ingly OS</div>
      <div style="color:var(--text-muted);font-size:13px;line-height:1.6;max-width:420px;margin:0 auto">Nessun dato ancora presente. Importa il tuo backup per vedere KPI, urgenze e insight sincronizzati con la tua attività — oppure inizia a inserire i primi dati.</div>
    </div>
    <div style="display:flex;gap:10px;padding:0 30px 30px;justify-content:center;flex-wrap:wrap">
      <button onclick="MorningBriefing.close();App.navigate('backup')" style="padding:11px 20px;background:var(--primary);color:#000;border:none;border-radius:10px;font-weight:800;cursor:pointer;font-size:13px">📦 Importa backup</button>
      <button onclick="MorningBriefing.close();App.navigate('quoter')" style="padding:11px 18px;background:var(--bg-card2);color:var(--text);border:1px solid var(--border2);border-radius:10px;font-weight:700;cursor:pointer;font-size:13px">Crea primo preventivo</button>
      <button onclick="MorningBriefing.close()" style="padding:11px 18px;background:transparent;color:var(--text-muted);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px">Esplora il tool →</button>
    </div>
  </div>
</div>`;
      document.body.insertAdjacentHTML('beforeend', neutral);
      return;
    }

    const html = `
<div id="morning-briefing-overlay-2" style="position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)" onclick="if(event.target.id==='morning-briefing-overlay-2')MorningBriefing.close()">
  <div style="background:var(--bg-card);border-radius:20px;border:1.5px solid var(--border2);width:700px;max-width:96vw;max-height:92vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,.8);position:relative">
    <button onclick="MorningBriefing.close()" style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,.1);border:none;border-radius:50%;width:30px;height:30px;color:#fff;cursor:pointer;font-size:14px;z-index:1">✕</button>

    <!-- HEADER con Health Score -->
    <div style="background:linear-gradient(135deg,#0f0f23,#1a1a3e);padding:22px 26px;border-radius:20px 20px 0 0">
      <div style="display:flex;align-items:center;gap:16px">
        <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,${scoreColor}30,${scoreColor}15);border:2px solid ${scoreColor}60;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <span style="font-size:28px;font-weight:900;color:${scoreColor}">${score}</span>
        </div>
        <div>
          <div style="color:#a0a0c0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em">${dayName} ${now.toLocaleDateString('it-IT',{day:'numeric',month:'long'})} • Salute aziendale</div>
          <div style="color:#fff;font-size:19px;font-weight:800;margin-top:2px">${greeting}! ${score >= 70 ? '🚀 Ottima forma.' : score >= 50 ? '📊 Giornata produttiva.' : '⚡ Ci sono cose da sistemare.'}</div>
        </div>
      </div>
    </div>

    <div style="padding:22px 26px;display:flex;flex-direction:column;gap:18px">

      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
        ${m ? [
          ['💰', fmt(m.revenue?.mtd||0), 'Revenue MTD', (m.revenue?.mtd||0)>0?'#22c55e':'#9ca3af'],
          ['📦', m.ops?.ordersActive||0, 'Ordini attivi', '#3b82f6'],
          ['💎', ((m.finance?.netMarginPct||0).toFixed(0))+'%', 'Margine netto', (m.finance?.netMarginPct||0)>=30?'#22c55e':(m.finance?.netMarginPct||0)>=15?'#f59e0b':'#ef4444'],
          ['🏦', (m.finance?.cashRunway||0)>=99?'∞':(m.finance?.cashRunway||0).toFixed(1)+'m', 'Cash runway', (m.finance?.cashRunway||0)>=3?'#22c55e':'#f59e0b'],
        ].map(([ic,v,lb,c])=>`<div style="background:#ffffff08;border-radius:12px;padding:12px;text-align:center;border:1px solid #ffffff10">
          <div style="font-size:17px;margin-bottom:2px">${ic}</div>
          <div style="font-size:17px;font-weight:800;color:${c}">${v}</div>
          <div style="font-size:10px;color:#6b7280;margin-top:2px">${lb}</div>
        </div>`).join('') : '<div style="grid-column:1/-1;color:#6b7280;text-align:center;padding:16px">Caricamento dati...</div>'}
      </div>

      <!-- URGENZE -->
      ${urgencies.length > 0 ? `
      <div>
        <div style="font-size:10px;font-weight:800;color:#ef4444;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">🔴 URGENZE (${urgencies.length})</div>
        ${urgencies.slice(0,3).map(u=>`<div onclick="MorningBriefing.close();${u.nav?`App.navigate('${u.nav}')`:''}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#ef444412;border:1px solid #ef444430;border-radius:10px;margin-bottom:6px;cursor:pointer">
          <span style="font-size:16px">${u.icon}</span>
          <span style="flex:1;font-size:13px;color:#f8f8f8;font-weight:600">${u.text}</span>
          <span style="color:#ef4444;font-size:11px">→</span>
        </div>`).join('')}
      </div>` : `<div style="padding:10px 14px;background:#22c55e12;border:1px solid #22c55e30;border-radius:10px;font-size:13px;color:#22c55e;font-weight:600">✅ Nessuna urgenza — tutto sotto controllo!</div>`}

      <!-- OPPORTUNITÀ -->
      ${opportunities.length > 0 ? `
      <div>
        <div style="font-size:10px;font-weight:800;color:#f59e0b;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">💰 OPPORTUNITÀ (${opportunities.length})</div>
        ${opportunities.slice(0,3).map(o=>`<div onclick="MorningBriefing.close();${o.nav?`App.navigate('${o.nav}')`:''}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f59e0b10;border:1px solid #f59e0b30;border-radius:10px;margin-bottom:6px;cursor:pointer">
          <span style="font-size:16px">${o.icon}</span>
          <span style="flex:1;font-size:13px;color:#f8f8f8">${o.text}</span>
          <span style="color:#f59e0b;font-size:11px">→</span>
        </div>`).join('')}
      </div>` : ''}

      <!-- INSIGHT -->
      <div style="padding:12px 16px;background:#3b82f612;border:1px solid #3b82f630;border-radius:10px">
        <div style="font-size:10px;font-weight:800;color:#60a5fa;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px">📊 TREND DEL GIORNO</div>
        <div style="font-size:13px;color:#e0e0e0">${insight}</div>
      </div>

      <!-- TOP 3 AZIONI CEO -->
      <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:14px 18px">
        <div style="font-size:10px;font-weight:800;color:#a78bfa;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">🎯 TOP 3 AZIONI OGGI</div>
        <div style="display:flex;flex-direction:column;gap:7px">
          ${([...urgencies.map(u=>({icon:u.icon,text:u.text,nav:u.nav,tag:'URGENTE',tagColor:'#ef4444'})),...opportunities.map(o=>({icon:o.icon,text:o.text,nav:o.nav,tag:'OPPORTUNITÀ',tagColor:'#f59e0b'}))].slice(0,3).length > 0
            ? [...urgencies.map(u=>({icon:u.icon,text:u.text,nav:u.nav,tag:'URGENTE',tagColor:'#ef4444'})),...opportunities.map(o=>({icon:o.icon,text:o.text,nav:o.nav,tag:'OPPORTUNITÀ',tagColor:'#f59e0b'}))].slice(0,3).map((a,i)=>
              `<div onclick="MorningBriefing.close();if('${a.nav}'!=='null')App.navigate('${a.nav}')" style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#ffffff05;border-radius:8px;cursor:pointer;border:1px solid #ffffff08">
                <span style="font-size:18px;flex-shrink:0">${i===0?'1️⃣':i===1?'2️⃣':'3️⃣'}</span>
                <div style="flex:1"><span style="font-size:10px;background:${a.tagColor}20;color:${a.tagColor};border-radius:4px;padding:1px 6px;font-weight:700;margin-right:6px">${a.tag}</span><span style="font-size:12px;color:#e0e0e0">${a.text}</span></div>
                <span style="color:#4b5563;font-size:11px">→</span>
              </div>`).join('')
            : `<div style="color:#6b7280;font-size:12px;padding:6px">✅ Nessuna azione urgente — ottima giornata!</div>`)}
        </div>
      </div>

      <!-- FOCUS -->
      <div style="padding:14px 18px;background:linear-gradient(135deg,${scoreColor}18,${scoreColor}08);border:1.5px solid ${scoreColor}40;border-radius:12px">
        <div style="font-size:10px;font-weight:800;color:${scoreColor};text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px">💡 INSIGHT DEL GIORNO</div>
        <div style="font-size:13px;color:#f8f8f8">${insight}</div>
      </div>

      <!-- FOOTER -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:4px">
        <button onclick="MorningBriefing.snooze()" style="padding:9px 14px;background:transparent;border:1px solid #333;border-radius:8px;color:#6b7280;cursor:pointer;font-size:12px">Domani</button>
        <div style="display:flex;gap:8px">
          <button onclick="MorningBriefing.close();App.navigate('profitleak')" style="padding:9px 16px;background:#ef444415;border:1px solid #ef444430;border-radius:8px;color:#ef4444;cursor:pointer;font-size:12px;font-weight:600">💸 Profit Leaks</button>
          <button onclick="MorningBriefing.close()" style="padding:9px 22px;background:var(--primary);color:#000;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-size:13px">Inizia →</button>
        </div>
      </div>
    </div>
  </div>
</div>`;

    document.body.insertAdjacentHTML('beforeend', html);
  },
};


// ═══════════════════════════════════════════════════════════════════
// CLV DASHBOARD — Clienti per Lifetime Value
// ═══════════════════════════════════════════════════════════════════
const MonthlyReport = {
  _month: new Date().getMonth(),
  _year: new Date().getFullYear(),

  async render() {
    const el = eid('view-pdfmonth'); if (!el) return;
    const now = new Date();
    const months = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

    el.innerHTML = `<div style="padding:20px;max-width:900px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <h2 style="color:#ef4444;margin:0;font-size:22px">📄 Report PDF Mensile</h2>
        <span style="font-size:11px;background:#ef444415;color:#ef4444;padding:3px 10px;border-radius:99px;border:1px solid #ef444430;font-weight:700">AUTOMATICO</span>
      </div>
      <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px">Report professionale mensile — pronto per il commercialista o per i tuoi archivi</p>

      <div style="background:var(--bg-card);border-radius:12px;padding:20px;border:1px solid var(--border);margin-bottom:20px">
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <div>
            <label class="form-label">Mese</label>
            <select class="form-control" id="rpm-month" style="width:150px">
              ${months.map((m,i)=>`<option value="${i}" ${i===this._month?'selected':''}>${m}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Anno</label>
            <select class="form-control" id="rpm-year" style="width:100px">
              ${[now.getFullYear()-1, now.getFullYear()].map(y=>`<option value="${y}" ${y===this._year?'selected':''}>${y}</option>`).join('')}
            </select>
          </div>
          <div style="margin-top:20px">
            <button onclick="MonthlyReport.generate()" style="padding:10px 24px;background:#ef4444;color:#fff;border:none;border-radius:9px;font-weight:700;cursor:pointer;font-size:14px"><i class="fas fa-file-pdf" style="margin-right:6px"></i>Genera Report</button>
          </div>
        </div>
      </div>

      <div id="rpm-preview" style="background:var(--bg-card);border-radius:12px;padding:24px;border:1px solid var(--border)">
        <div style="text-align:center;padding:40px;color:var(--text-muted)">
          <div style="font-size:52px;margin-bottom:14px">📄</div>
          <div style="font-size:15px;color:var(--text);margin-bottom:10px">Scegli mese e anno → Genera Report</div>
          <div style="font-size:13px;line-height:1.8">Il report include:<br>💰 Revenue e margini · 📦 Ordini · 👑 Top clienti · 🧱 Costi · 📈 Confronto mese precedente</div>
        </div>
      </div>
    </div>`;
  },

  async generate() {
    const m = parseInt(eid('rpm-month')?.value ?? this._month);
    const y = parseInt(eid('rpm-year')?.value ?? this._year);
    this._month = m; this._year = y;
    const prev = eid('rpm-preview'); if (!prev) return;
    prev.innerHTML = '<div style="text-align:center;padding:40px"><div style="width:44px;height:44px;border:3px solid var(--border);border-top-color:#ef4444;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 14px"></div><div style="color:var(--text-muted)">Elaborazione dati…</div></div>';

    const months = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    const mStart = new Date(y, m, 1);
    const mEnd = new Date(y, m+1, 0);
    const prevStart = new Date(y, m-1, 1);
    const prevEnd = new Date(y, m, 0);

    try {
      const [sales, orders, materials, costs, cashflow] = await Promise.all([
        IDB.getAll('sales').catch(()=>[]),
        IDB.getAll('orders').catch(()=>[]),
        IDB.getAll('materials').catch(()=>[]),
        IDB.getAll('fixed_costs').catch(()=>[]),
        IDB.getAll('cashflow').catch(()=>[]),
      ]);

      const inRange = (s, start, end) => { const d=new Date(s.date||0); return d>=start&&d<=end; };
      const mSales = sales.filter(s=>s.status==='pagato'&&inRange(s,mStart,mEnd));
      const pSales = sales.filter(s=>s.status==='pagato'&&inRange(s,prevStart,prevEnd));
      const mOrders = orders.filter(o=>inRange(o,mStart,mEnd));

      const rev = mSales.reduce((a,s)=>a+(+s.amount||0),0);
      const pRev = pSales.reduce((a,s)=>a+(+s.amount||0),0);
      const matCost = mSales.reduce((a,s)=>a+(+s.materialCost||0),0);
      const fixedMonthly = costs.reduce((a,fc)=>{const v=+fc.amount||0; if(fc.frequency==='yearly')return a+v/12; if(fc.frequency==='quarterly')return a+v/3; return a+v;},0);
      const netProfit = rev - matCost - fixedMonthly;
      const delta = pRev > 0 ? ((rev-pRev)/pRev*100) : null;

      // Top clients
      const clientMap = {};
      mSales.forEach(s=>{const k=s.clientName||'Sconosciuto';clientMap[k]=(clientMap[k]||0)+(+s.amount||0);});
      const topClients = Object.entries(clientMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

      // Orders summary
      const ordersByStatus = {todo:0,progress:0,done:0,delivered:0};
      mOrders.forEach(o=>{if(ordersByStatus[o.status]!==undefined)ordersByStatus[o.status]++;});

      const fmt = v => '€'+Math.round(v).toLocaleString('it-IT');
      const fmtDelta = d => d===null?'—':((d>=0?'<span style="color:#22c55e">▲':'<span style="color:#ef4444">▼')+Math.abs(d).toFixed(0)+'%</span>');

      const reportHtml = `
        <div id="report-content" style="font-family:system-ui,sans-serif">
          <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:12px;padding:24px 28px;margin-bottom:24px;color:#fff">
            <div style="font-size:11px;color:#f59e0b;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">INGLY LASER — REPORT MENSILE</div>
            <div style="font-size:24px;font-weight:800">${months[m]} ${y}</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px">Generato il ${new Date().toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})}</div>
          </div>

          <!-- KPI ROW -->
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
            ${[
              ['💰 Revenue',fmt(rev),`vs mese prec.: ${fmtDelta(delta)}`,'#22c55e'],
              ['🧱 Costi Mat.',fmt(matCost),`${rev>0?(matCost/rev*100).toFixed(0):'0'}% del revenue`,'#f97316'],
              ['🏗 Costi Fissi',fmt(fixedMonthly),'mensili stimati','#6366f1'],
              ['🏆 Profitto Netto',fmt(netProfit),`margine ${rev>0?(netProfit/rev*100).toFixed(0):'0'}%`,netProfit>=0?'#22c55e':'#ef4444'],
            ].map(([l,v,s,c])=>`<div style="background:var(--bg-card2);border-radius:10px;padding:14px;border:1px solid var(--border)">
              <div style="font-size:11px;color:var(--text-muted);font-weight:700;margin-bottom:4px">${l}</div>
              <div style="font-size:22px;font-weight:800;color:${c}">${v}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${s}</div>
            </div>`).join('')}
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
            <!-- Top Clienti -->
            <div style="background:var(--bg-card);border-radius:10px;border:1px solid var(--border);overflow:hidden">
              <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:700;color:var(--text);font-size:13px">👑 Top Clienti</div>
              ${topClients.length ? topClients.map(([n,v],i)=>`<div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                <div style="font-size:12px;color:var(--text)">${i+1}. ${n}</div>
                <div style="font-size:13px;font-weight:700;color:#22c55e">${fmt(v)}</div>
              </div>`).join('') : '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px">Nessuna vendita nel mese</div>'}
            </div>

            <!-- Ordini mese -->
            <div style="background:var(--bg-card);border-radius:10px;border:1px solid var(--border);overflow:hidden">
              <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:700;color:var(--text);font-size:13px">📋 Ordini del Mese</div>
              ${Object.entries({todo:'Da Fare',progress:'In Lavorazione',done:'Completati',delivered:'Consegnati'}).map(([k,l])=>`<div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
                <div style="font-size:12px;color:var(--text-muted)">${l}</div>
                <div style="font-size:13px;font-weight:700;color:var(--text)">${ordersByStatus[k]||0}</div>
              </div>`).join('')}
              <div style="padding:10px 16px;display:flex;justify-content:space-between">
                <div style="font-size:12px;font-weight:700;color:var(--text)">Totale</div>
                <div style="font-size:13px;font-weight:800;color:#3b82f6">${mOrders.length}</div>
              </div>
            </div>
          </div>

          <!-- Vendite del mese -->
          <div style="background:var(--bg-card);border-radius:10px;border:1px solid var(--border);overflow:hidden;margin-bottom:20px">
            <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:700;color:var(--text);font-size:13px">💳 Vendite Incassate — ${months[m]} ${y}</div>
            ${mSales.length === 0 ? '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px">Nessuna vendita pagata nel mese</div>' :
            `<table style="width:100%;border-collapse:collapse">
              <thead><tr style="background:var(--bg-card2)">
                ${['Data','Cliente','Descrizione','Importo'].map(h=>`<th style="padding:8px 12px;text-align:left;font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase">${h}</th>`).join('')}
              </tr></thead>
              <tbody>
                ${mSales.map(s=>`<tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:8px 12px;font-size:12px;color:var(--text-muted)">${new Date(s.date).toLocaleDateString('it-IT')}</td>
                  <td style="padding:8px 12px;font-size:12px;color:var(--text)">${s.clientName||'—'}</td>
                  <td style="padding:8px 12px;font-size:12px;color:var(--text-muted)">${s.description||s.desc||s.amount||'—'}</td>
                  <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#22c55e">${fmt(+s.amount)}</td>
                </tr>`).join('')}
                <tr style="background:var(--bg-card2)">
                  <td colspan="3" style="padding:10px 12px;font-size:13px;font-weight:700;color:var(--text)">TOTALE</td>
                  <td style="padding:10px 12px;font-size:15px;font-weight:800;color:#22c55e">${fmt(rev)}</td>
                </tr>
              </tbody>
            </table>`}
          </div>

          <div style="display:flex;gap:10px;justify-content:flex-end">
            <button onclick="MonthlyReport.print()" style="padding:10px 20px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px"><i class="fas fa-print" style="margin-right:6px"></i>Stampa / Salva PDF</button>
          </div>
        </div>`;
      prev.innerHTML = reportHtml;
    } catch(e) {
      prev.innerHTML = `<div style="color:#ef4444;padding:20px">${e.message}</div>`;
    }
  },

  print() {
    const content = eid('report-content');
    if (!content) return;
    const win = window.open('','_blank','width=900,height=700');
    win.document.write(`<html><head><title>Report Mensile — Ingly Laser</title>
      <style>body{font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:20px;} @media print{body{background:#fff;color:#000;}}</style>
    </head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(function(){ try { win.focus(); } catch(e){} }, 400);
  }
};

// ═══════════════════════════════════════════════════════════════════
// XML SDI — Fattura Elettronica XML — CRUD completo + archivio IDB
// ═══════════════════════════════════════════════════════════════════
const XMLSDI = {
  _editId: null,

  async render() {
    const el = eid('view-xmlsdi'); if (!el) return;
    const invoices = (await IDB.getAll('xmlinvoices').catch(()=>[])).sort((a,b)=>(b.id||0)-(a.id||0));
    const recurrings = await IDB.getAll('recurring_invoices').catch(()=>[]);
    const dueSoon = recurrings.filter(r=>r.active && r.nextDate && r.nextDate <= new Date(Date.now()+7*86400000).toISOString().split('T')[0]).length;

    el.innerHTML = `<div style="padding:20px;max-width:1100px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <h2 style="color:#8b5cf6;margin:0;font-size:22px">🧾 Fattura XML SDI</h2>
        <span style="font-size:11px;background:#8b5cf615;color:#8b5cf6;padding:3px 10px;border-radius:99px;border:1px solid #8b5cf630;font-weight:700">FatturaPA 1.2.2</span>
        <button onclick="(typeof RecurringInvoices!=='undefined'&&RecurringInvoices.render())" style="padding:3px 12px;background:#8b5cf620;color:#a78bfa;border:1px solid #8b5cf640;border-radius:99px;font-size:11px;font-weight:700;cursor:pointer">🔄 Ricorrenti${dueSoon > 0 ? ` <span style='background:#ef4444;color:#fff;border-radius:99px;padding:1px 6px;font-size:10px'>${dueSoon}</span>` : ''}</button>
      </div>
      <p style="color:var(--text-muted);margin-bottom:6px;font-size:14px">Genera, salva, modifica ed elimina fatture XML per il Sistema di Interscambio — RF19 forfettario</p>
      <div style="background:#8b5cf615;border:1px solid #8b5cf630;border-radius:9px;padding:10px 14px;margin-bottom:20px;font-size:12px;color:#c4b5fd;display:flex;gap:8px">
        <i class="fas fa-info-circle" style="margin-top:1px;flex-shrink:0"></i>
        <span>Verifica sempre il file con il tuo commercialista prima dell'invio al SDI.</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

        <!-- ── LEFT: FORM ── -->
        <div style="display:flex;flex-direction:column;gap:12px">

          <!-- form header -->
          <div id="xi-form-header" style="background:var(--bg-card);border-radius:10px;padding:10px 14px;border:1px solid var(--border);font-weight:700;color:#8b5cf6;font-size:13px;display:flex;justify-content:space-between;align-items:center">
            <span id="xi-form-title">📄 Nuova Fattura</span>
            <button onclick="XMLSDI._resetForm()" style="padding:3px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:5px;color:var(--text-muted);cursor:pointer;font-size:11px">✕ Reset</button>
          </div>

          <!-- emittente -->
          <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border)">
            <div style="font-weight:700;color:#8b5cf6;font-size:11px;margin-bottom:10px;text-transform:uppercase">🏢 Cedente (Tu)</div>
            <div class="form-row">
              <div class="form-group" style="flex:2"><label class="form-label" style="font-size:11px">Nome / Ragione Sociale</label><input class="form-control" id="xi-nom" placeholder="Mario Rossi"></div>
              <div class="form-group"><label class="form-label" style="font-size:11px">P.IVA</label><input class="form-control" id="xi-piva" placeholder="IT12345678901" maxlength="13"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label" style="font-size:11px">Codice Fiscale</label><input class="form-control" id="xi-cf" placeholder="RSSMRA80A01H501A" maxlength="16"></div>
              <div class="form-group" style="flex:2"><label class="form-label" style="font-size:11px">Indirizzo</label><input class="form-control" id="xi-adr" placeholder="Via Roma 1"></div>
            </div>
            <div class="form-row">
              <div class="form-group" style="flex:.6"><label class="form-label" style="font-size:11px">CAP</label><input class="form-control" id="xi-cap" placeholder="00100"></div>
              <div class="form-group" style="flex:2"><label class="form-label" style="font-size:11px">Comune</label><input class="form-control" id="xi-city" placeholder="Roma"></div>
              <div class="form-group" style="flex:.5"><label class="form-label" style="font-size:11px">Prov.</label><input class="form-control" id="xi-prov" placeholder="RM" maxlength="2"></div>
            </div>
          </div>

          <!-- cliente -->
          <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border)">
            <div style="font-weight:700;color:#8b5cf6;font-size:11px;margin-bottom:10px;text-transform:uppercase">👤 Cessionario (Cliente)</div>
            <div class="form-row">
              <div class="form-group" style="flex:2"><label class="form-label" style="font-size:11px">Nome / Ragione Sociale</label><input class="form-control" id="xc-nom" placeholder="Azienda SRL"></div>
              <div class="form-group"><label class="form-label" style="font-size:11px">CF / P.IVA</label><input class="form-control" id="xc-cf" placeholder="12345678901"></div>
            </div>
            <div class="form-row">
              <div class="form-group" style="flex:2"><label class="form-label" style="font-size:11px">Indirizzo</label><input class="form-control" id="xc-adr" placeholder="Via Milano 10"></div>
              <div class="form-group" style="flex:.7"><label class="form-label" style="font-size:11px">CAP</label><input class="form-control" id="xc-cap" placeholder="20100"></div>
              <div class="form-group"><label class="form-label" style="font-size:11px">Comune</label><input class="form-control" id="xc-city" placeholder="Milano"></div>
            </div>
            <div class="form-group"><label class="form-label" style="font-size:11px">Codice Destinatario SDI (7 caratteri, oppure 0000000)</label><input class="form-control" id="xc-sdi" placeholder="0000000" maxlength="7"></div>
          </div>

          <!-- dati fattura -->
          <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border)">
            <div style="font-weight:700;color:#8b5cf6;font-size:11px;margin-bottom:10px;text-transform:uppercase">📄 Dati Fattura</div>
            <div class="form-row">
              <div class="form-group" style="flex:.5"><label class="form-label" style="font-size:11px">N° Fattura</label><input class="form-control" id="xf-num" type="number" min="1" value="${invoices.length+1}"></div>
              <div class="form-group"><label class="form-label" style="font-size:11px">Data Fattura</label><input class="form-control" id="xf-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
            </div>
            <div class="form-group" style="margin-bottom:8px"><label class="form-label" style="font-size:11px">Descrizione prestazione</label><input class="form-control" id="xf-desc" placeholder="Es: Lavorazione laser su legno personalizzata"></div>
            <div class="form-row">
              <div class="form-group" style="flex:.5"><label class="form-label" style="font-size:11px">Quantità</label><input class="form-control" id="xf-qty" type="number" value="1" min="1" step="1"></div>
              <div class="form-group"><label class="form-label" style="font-size:11px">Prezzo unitario (€)</label><input class="form-control" id="xf-price" type="number" step="0.01" placeholder="0.00"></div>
            </div>
            <div class="form-group"><label class="form-label" style="font-size:11px">Causale / Note (opzionale)</label><input class="form-control" id="xf-note" placeholder="Es: Pagamento a 30 giorni"></div>
          </div>

          <button onclick="XMLSDI._saveAndGenerate()" style="padding:13px;background:#8b5cf6;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:14px">
            <i class="fas fa-save" style="margin-right:6px"></i><span id="xi-btn-lbl">Salva e Genera XML</span>
          </button>
        </div>

        <!-- ── RIGHT: PREVIEW + LIST ── -->
        <div style="display:flex;flex-direction:column;gap:14px">

          <!-- xml preview -->
          <div id="xi-preview" style="background:var(--bg-card);border-radius:12px;padding:20px;border:1px solid var(--border);min-height:220px;display:flex;flex-direction:column">
            <div style="text-align:center;padding:28px;color:var(--text-muted)">
              <div style="font-size:44px;margin-bottom:10px">🧾</div>
              <div style="font-size:13px;color:var(--text)">Compila il form e premi Salva →</div>
              <div style="font-size:12px;margin-top:6px;line-height:1.8">XML FatturaPA 1.2.2 · RF19 · N2.2</div>
            </div>
          </div>

          <!-- saved list -->
          <div style="background:var(--bg-card);border-radius:12px;border:1px solid var(--border);overflow:hidden">
            <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
              <div style="font-weight:700;color:var(--text);font-size:13px">📋 Fatture Archiviate (${invoices.length})</div>
            </div>
            ${invoices.length===0
              ? '<div style="padding:28px;text-align:center;color:var(--text-muted);font-size:13px">Nessuna fattura salvata.<br>Crea la prima fattura dal form.</div>'
              : '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">'
                +'<thead><tr style="background:var(--bg-card2)">'
                +['N°','Data','Cliente','Importo','Azioni'].map(h=>'<th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase">'+h+'</th>').join('')
                +'</tr></thead><tbody>'
                +invoices.map(inv=>
                  '<tr style="border-bottom:1px solid var(--border)">'
                  +'<td style="padding:8px 10px;font-weight:700;color:#8b5cf6">'+inv.num+'</td>'
                  +'<td style="padding:8px 10px;font-size:12px;color:var(--text-muted)">'+inv.date+'</td>'
                  +'<td style="padding:8px 10px;font-size:12px;color:var(--text)">'+inv.clientName+'</td>'
                  +'<td style="padding:8px 10px;font-weight:700;color:#22c55e">€'+(+inv.total||0).toFixed(2)+'</td>'
                  +'<td style="padding:8px 10px"><div style="display:flex;gap:4px">'
                  +'<button onclick="XMLSDI._edit('+inv.id+')" title="Modifica" style="padding:5px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:11px"><i class="fas fa-edit"></i></button>'
                  +'<button onclick="XMLSDI._redownload('+inv.id+')" title="Scarica XML" style="padding:5px 8px;background:#8b5cf620;border:1px solid #8b5cf640;border-radius:6px;color:#8b5cf6;cursor:pointer;font-size:11px"><i class="fas fa-download"></i></button>'
                  +'<button onclick="XMLSDI._del('+inv.id+')" title="Elimina" style="padding:5px 8px;background:var(--bg-card);border:1px solid #ef444440;border-radius:6px;color:#ef4444;cursor:pointer;font-size:11px"><i class="fas fa-trash"></i></button>'
                  +'</div></td></tr>'
                ).join('')
                +'</tbody></table></div>'
            }
          </div>

        </div>
      </div>
    </div>`;
  },

  _g: id => (document.getElementById(id)?.value||'').trim(),

  _buildXml(d) {
    const piva = d.piva.replace('IT','');
    const total = (d.qty * d.price).toFixed(2);
    return `<?xml version="1.0" encoding="UTF-8"?>\n<p:FatturaElettronica versione="FPA12" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.2.xsd">\n  <FatturaElettronicaHeader>\n    <DatiTrasmissione>\n      <IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>${piva||'00000000000'}</IdCodice></IdTrasmittente>\n      <ProgressivoInvio>${String(d.num).padStart(5,'0')}</ProgressivoInvio>\n      <FormatoTrasmissione>FPA12</FormatoTrasmissione>\n      <CodiceDestinatario>${d.sdi||'0000000'}</CodiceDestinatario>\n    </DatiTrasmissione>\n    <CedentePrestatore>\n      <DatiAnagrafici>\n        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>${piva||'00000000000'}</IdCodice></IdFiscaleIVA>\n        <CodiceFiscale>${d.cf||piva}</CodiceFiscale>\n        <Anagrafica><Nome>${d.nom||'Nome'}</Nome></Anagrafica>\n        <RegimeFiscale>RF19</RegimeFiscale>\n      </DatiAnagrafici>\n      <Sede><Indirizzo>${d.adr||'Via'}</Indirizzo><CAP>${d.cap||'00000'}</CAP><Comune>${d.city||'Comune'}</Comune><Provincia>${d.prov||'RM'}</Provincia><Nazione>IT</Nazione></Sede>\n    </CedentePrestatore>\n    <CessionarioCommittente>\n      <DatiAnagrafici>\n        <CodiceFiscale>${d.ccf||'00000000000'}</CodiceFiscale>\n        <Anagrafica><Denominazione>${d.cnom||'Cliente'}</Denominazione></Anagrafica>\n      </DatiAnagrafici>\n      <Sede><Indirizzo>${d.cadr||'Via'}</Indirizzo><CAP>${d.ccap||'00000'}</CAP><Comune>${d.ccity||'Comune'}</Comune><Nazione>IT</Nazione></Sede>\n    </CessionarioCommittente>\n  </FatturaElettronicaHeader>\n  <FatturaElettronicaBody>\n    <DatiGenerali>\n      <DatiGeneraliDocumento>\n        <TipoDocumento>TD01</TipoDocumento><Divisa>EUR</Divisa>\n        <Data>${d.date}</Data><Numero>${d.num}</Numero>\n        ${d.note ? '<Causale>'+d.note+'</Causale>' : ''}\n        <ImportoTotaleDocumento>${total}</ImportoTotaleDocumento>\n      </DatiGeneraliDocumento>\n    </DatiGenerali>\n    <DatiBeniServizi>\n      <DettaglioLinee>\n        <NumeroLinea>1</NumeroLinea><Descrizione>${d.desc||'Prestazione'}</Descrizione>\n        <Quantita>${(+d.qty).toFixed(2)}</Quantita><PrezzoUnitario>${(+d.price).toFixed(2)}</PrezzoUnitario>\n        <PrezzoTotale>${total}</PrezzoTotale><AliquotaIVA>0.00</AliquotaIVA><Natura>N2.2</Natura>\n      </DettaglioLinee>\n      <DatiRiepilogo>\n        <AliquotaIVA>0.00</AliquotaIVA><Natura>N2.2</Natura>\n        <ImponibileImporto>${total}</ImponibileImporto><Imposta>0.00</Imposta>\n        <RiferimentoNormativo>Operazione non soggetta ad IVA ai sensi dell art. 1 commi da 54 a 89 L. 190/2014 - Regime Forfetario</RiferimentoNormativo>\n      </DatiRiepilogo>\n    </DatiBeniServizi>\n    <DatiPagamento>\n      <CondizioniPagamento>TP02</CondizioniPagamento>\n      <DettaglioPagamento><ModalitaPagamento>MP05</ModalitaPagamento><ImportoPagamento>${total}</ImportoPagamento></DettaglioPagamento>\n    </DatiPagamento>\n  </FatturaElettronicaBody>\n</p:FatturaElettronica>`;
  },

  async _saveAndGenerate() {
    const g = this._g;
    const d = {
      nom:g('xi-nom'), piva:g('xi-piva'), cf:g('xi-cf'), adr:g('xi-adr'), cap:g('xi-cap'), city:g('xi-city'), prov:g('xi-prov'),
      cnom:g('xc-nom'), ccf:g('xc-cf'), cadr:g('xc-adr'), ccap:g('xc-cap'), ccity:g('xc-city'), sdi:g('xc-sdi')||'0000000',
      num:g('xf-num')||'1', date:g('xf-date'), desc:g('xf-desc')||'Prestazione artigianale',
      qty:parseFloat(g('xf-qty')||'1'), price:parseFloat(g('xf-price')||'0'), note:g('xf-note')
    };
    if (!d.nom)   { toast('Inserisci il tuo nome/ragione sociale','warning'); return; }
    if (!d.cnom)  { toast('Inserisci il nome del cliente','warning');         return; }
    if (!d.price || d.price<=0) { toast('Inserisci importo valido','warning'); return; }

    const xml   = this._buildXml(d);
    const total = d.qty * d.price;
    const rec   = { num:d.num, date:d.date, clientName:d.cnom, clientCf:d.ccf, total, description:d.desc, xml, raw:d, created:new Date().toISOString() };
    if (this._editId) rec.id = this._editId;

    await IDB.put('xmlinvoices', rec);
    toast(this._editId ? 'Fattura aggiornata!' : 'Fattura n.'+d.num+' salvata!', 'success');
    this._editId = null;

    // Show preview
    this._showPreview(xml, d.num, d.piva.replace('IT',''), d.date);
    await this.render();
  },

  _showPreview(xml, num, piva, date) {
    const el = eid('xi-preview'); if (!el) return;
    const escaped = xml.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const fn = 'IT'+(piva||'00000000000')+'_'+(date||'').replace(/-/g,'')+'_'+String(num).padStart(5,'0')+'.xml';
    el.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
      +'<div style="font-weight:700;color:#8b5cf6;font-size:13px">🧾 Fattura n.'+num+'</div>'
      +'<div style="display:flex;gap:6px">'
      +'<button onclick="navigator.clipboard.writeText(document.getElementById(\'xi-raw\')?.value||\'\')" style="padding:5px 10px;background:#8b5cf620;border:1px solid #8b5cf640;border-radius:6px;color:#8b5cf6;cursor:pointer;font-size:11px;font-weight:700">📋 Copia</button>'
      +'<button onclick="XMLSDI._dlXml(document.getElementById(\'xi-raw\')?.value||\'\',\''+piva+'\',\''+date+'\','+num+')" style="padding:5px 10px;background:#22c55e;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:11px;font-weight:700">⬇ .xml</button>'
      +'</div></div>'
      +'<textarea id="xi-raw" style="display:none">'+xml+'</textarea>'
      +'<div style="background:#0f172a;border-radius:8px;padding:12px;overflow-y:auto;max-height:360px;border:1px solid #1e293b;flex:1">'
      +'<pre style="font-size:10px;line-height:1.6;color:#a5f3fc;margin:0;white-space:pre-wrap;font-family:monospace">'+escaped+'</pre>'
      +'</div>'
      +'<div style="margin-top:8px;font-size:10px;color:var(--text-muted)">📁 '+fn+'</div>';
  },

  async _edit(id) {
    const inv = await IDB.get('xmlinvoices', id);
    if (!inv) return;
    this._editId = id;
    const d = inv.raw || {};
    const map = {
      'xi-nom':d.nom||inv.emitterName||'', 'xi-piva':d.piva||'', 'xi-cf':d.cf||'',
      'xi-adr':d.adr||'', 'xi-cap':d.cap||'', 'xi-city':d.city||'', 'xi-prov':d.prov||'',
      'xc-nom':d.cnom||inv.clientName||'', 'xc-cf':d.ccf||inv.clientCf||'',
      'xc-adr':d.cadr||'', 'xc-cap':d.ccap||'', 'xc-city':d.ccity||'', 'xc-sdi':d.sdi||'0000000',
      'xf-num':d.num||inv.num||'1', 'xf-date':d.date||inv.date||'',
      'xf-desc':d.desc||inv.description||'', 'xf-qty':d.qty||1,
      'xf-price':d.price||(inv.total/1)||0, 'xf-note':d.note||''
    };
    Object.entries(map).forEach(([k,v]) => { const el=document.getElementById(k); if(el) el.value=v; });
    const hdr = eid('xi-form-title'); if(hdr) hdr.textContent = '✏️ Modifica Fattura n.'+inv.num;
    const btn = eid('xi-btn-lbl');   if(btn) btn.textContent = 'Aggiorna Fattura';
    if (inv.xml) this._showPreview(inv.xml, inv.num, (inv.raw?.piva||'').replace('IT',''), inv.date);
    eid('view-xmlsdi')?.scrollTo(0,0);
    toast('Fattura caricata per la modifica','success');
  },

  async _redownload(id) {
    const inv = await IDB.get('xmlinvoices', id);
    if (!inv?.xml) { toast('XML non trovato','warning'); return; }
    this._dlXml(inv.xml, (inv.raw?.piva||'').replace('IT',''), inv.date, inv.num);
  },

  _dlXml(xml, piva, date, num) {
    const blob = new Blob([xml], {type:'application/xml'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'IT'+(piva||'00000000000')+'_'+(date||'').replace(/-/g,'')+'_'+String(num||1).padStart(5,'0')+'.xml';
    a.click();
    URL.revokeObjectURL(url);
    toast('XML scaricato!','success');
  },

  async _del(id) {
    const inv = await IDB.get('xmlinvoices', id);
    if (!inv) return;
    if (!confirm('Eliminare la fattura n.'+inv.num+' — '+inv.clientName+'?\n\nL\'XML non sarà recuperabile.')) return;
    await IDB.del('xmlinvoices', id)
    if (this._editId===id) this._resetForm();
    toast('Fattura n.'+inv.num+' eliminata','success');
    await this.render();
  },


  // v77: prefillFromSale — called from Quoter.convertToInvoice()
  async prefillFromSale(saleId) {
    // Ensure XMLSDI view is rendered first
    const el = eid('view-xmlsdi');
    if (!el || !el.innerHTML.trim()) await this.render();

    const sale = await IDB.get('sales', saleId).catch(()=>null);
    if (!sale) { toast('Vendita non trovata','warning'); return; }

    const cfg = await IDB.get('settings','main').catch(()=>({})) || {};
    const client = sale.clientId ? await IDB.get('clients', sale.clientId).catch(()=>null) : null;

    // Get next invoice number
    const invoices = await IDB.getAll('xmlinvoices').catch(()=>[]);
    const nextNum = invoices.length
      ? Math.max(...invoices.map(i=>parseInt(i.num)||0)) + 1
      : 1;

    const map = {
      // Emitter (us)
      'xi-nom':   cfg.company   || cfg.businessName || '',
      'xi-piva':  cfg.piva      || '',
      'xi-cf':    cfg.cf        || cfg.piva || '',
      'xi-adr':   cfg.address   || '',
      'xi-cap':   cfg.cap       || '',
      'xi-city':  cfg.city      || '',
      'xi-prov':  cfg.prov      || '',
      // Client
      'xc-nom':   sale.clientName  || client?.name  || '',
      'xc-cf':    sale.clientPiva  || client?.piva  || client?.cf || '',
      'xc-adr':   sale.clientAddress || client?.address || '',
      'xc-cap':   client?.cap      || '',
      'xc-city':  client?.city     || '',
      'xc-sdi':   client?.sdi      || '0000000',
      // Invoice data
      'xf-num':   nextNum,
      'xf-date':  sale.date || today(),
      'xf-desc':  sale.lineDesc || sale.desc || 'Prestazione artigianale',
      'xf-qty':   '1',
      'xf-price': (sale.netAmount || sale.amount || 0).toFixed(2),
      'xf-note':  `Rif. preventivo #${sale.fromQuoteId||''} — ${sale.invoiceNo||''}`.trim(),
    };

    Object.entries(map).forEach(([id, val]) => {
      const el2 = document.getElementById(id);
      if (el2 && val !== undefined) el2.value = val;
    });

    const hdr = eid('xi-form-title');
    if (hdr) hdr.textContent = `📄 Fattura n.${nextNum} — pre-compilata da preventivo`;

    eid('view-xmlsdi')?.scrollTo(0, 0);
    toast(`✅ Fattura n.${nextNum} pre-compilata da vendita`, 'success');
  },
  _resetForm() {
    this._editId = null;
    ['xi-nom','xi-piva','xi-cf','xi-adr','xi-cap','xi-city','xi-prov','xc-nom','xc-cf','xc-adr','xc-cap','xc-city','xc-sdi','xf-desc','xf-note'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    const qty=eid('xf-qty'); if(qty)qty.value='1';
    const pr=eid('xf-price'); if(pr)pr.value='';
    const t=eid('xi-form-title'); if(t)t.textContent='📄 Nuova Fattura';
    const b=eid('xi-btn-lbl'); if(b)b.textContent='Salva e Genera XML';
    const p=eid('xi-preview'); if(p)p.innerHTML='<div style="text-align:center;padding:28px;color:var(--text-muted)"><div style="font-size:44px;margin-bottom:10px">🧾</div><div style="font-size:13px">Form resettato</div></div>';
  }
};


// ═══════════════════════════════════════════════════════════════════
// CATALOGCATS — Gestione dinamica categorie Catalogo Prodotti
// ═══════════════════════════════════════════════════════════════════
const Calendar={
  current:new Date(),
  editId:null,
  // Italian marketing calendar: static recurring events per year
  getMarketingEvents(year){
    const e=[];
    const add=(m,d,title,cat,note,link)=>e.push({
      date:`${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
      title,cat,note:note||'',link:link||'',_static:true
    });
    add(1,1,"🎆 Capodanno","holiday","Sospendi produzione. Pianifica anno nuovo");
    add(1,6,"🎁 Epifania / Befana","holiday","Regali bambini, decorazioni laser");
    add(1,7,"📋 Planning anno","deadline","Budget, obiettivi Etsy, materiali da ordinare");
    add(1,14,"❤️ Pre-Valentine: avvio","deadline","Portachiavi coppia, cornici cuori");
    add(1,25,"🛒 Listing Valentine live","deadline","Pubblica su Etsy: san valentino personalizzato");
    add(2,14,'❤️ San Valentino ★★★',"occasion","PICCO: portachiavi coppia, cornici, lampade cuori",
      "https://www.etsy.com/it/search?q=san+valentino+personalizzato");
    add(2,15,"📊 Post-Valentine review","deadline","Analisi vendite, bestseller, margini");
    add(2,18,"🌸 Pre-Comunioni: -10 settimane","deadline","Avvio cornici Prima Comunione, album");
    add(2,22,"🛒 Listing Pasqua live","deadline","Pubblica decorazioni pasquali su Etsy");
    add(3,8,'🌺 Festa della Donna ★★',"occasion","Orecchini laser, fiori legno, lampade rose",
      "https://www.etsy.com/it/search?q=festa+della+donna+personalizzato");
    add(3,17,"☘️ St. Patrick's Day","occasion","UK/USA/Irlanda: trifoglio, beer signs laser");
    add(3,19,'👨 Festa del Papà ★★',"occasion","Taglieri incisi, targhe, portachiavi, organizer",
      "https://www.etsy.com/it/search?q=festa+papa+personalizzato");
    add(3,20,"🌷 Equinozio Primavera","season","Decorazioni floreali, ghirlande spring laser");
    add(3,25,"🐣 Pre-Pasqua stock check","deadline","Verifica uova legno, coniglietti, campanelle");
    add(4,1,"🌸 STAGIONE ALTA: INIZIO","season","Matrimoni + Comunioni + Lauree: 3 mesi di picco");
    add(4,6,"🐣 Pasqua ★★","holiday","Decorazioni pasquali, uova personalizzate, bunny");
    add(4,7,"🐣 Pasquetta","holiday","Festività nazionale");
    add(4,14,"🎀 Comunioni Peak","kids","Cornici, album, targhe cerimonia Prima Comunione",
      "https://www.etsy.com/it/search?q=prima+comunione+ricordo");
    add(4,22,"🌍 Earth Day","occasion","Eco-nicchia: legno naturale, prodotti sostenibili");
    add(4,23,"📚 Giornata Mondiale Libro","occasion","Segnalibri laser, bookends, portacopie incisi");
    add(4,25,"🇮🇹 Festa della Liberazione","holiday","Festività nazionale");
    add(5,1,"🛠️ Festa dei Lavoratori","holiday","Festività — pianifica stock Festa Mamma");
    add(5,4,"⭐ Star Wars Day USA","occasion","Nicchia USA: May the 4th — laser SW props");
    add(5,11,'💐 Festa della Mamma ★★★',"occasion","PICCO ASSOLUTO: cornici, lampade, gioielli laser",
      "https://www.etsy.com/it/search?q=festa+mamma+personalizzato");
    add(5,15,'💒 Matrimoni: INIZIO STAGIONE ★★★',"wedding","Bomboniere, segnaposto, album, menu",
      "https://www.etsy.com/it/search?q=segnaposto+matrimonio+legno");
    add(5,20,"🎓 Prima Laurea Peak","occasion","Portachiavi, targhe, cornici laurea",
      "https://www.etsy.com/it/search?q=laurea+personalizzata+laser");
    add(5,25,"📦 Ordine materiali estate","deadline","Stock betulla, acrilico, packaging per estate");
    add(6,1,'🎓 Stagione Lauree ★★',"occasion","Giugno: picco triennali e magistrali",
      "https://www.etsy.com/it/search?q=laurea+regalo+personalizzato");
    add(6,2,"🇮🇹 Festa della Repubblica","holiday","Festività nazionale");
    add(6,15,'💒 Matrimoni Giugno Peak ★★★',"wedding","Picco — considera lista attesa per urgenti");
    add(6,20,"☀️ Solstizio Estate","season","Fiere estive, magneti città, souvenir");
    add(6,21,"👨 Father's Day UK/USA","occasion","Taglieri, beer opener, targhe laser",
      "https://www.etsy.com/search?q=personalized+fathers+day+laser");
    add(7,4,'🇺🇸 Independence Day USA ★★',"occasion","USA: patriotic signs, American flags laser",
      "https://www.etsy.com/search?q=independence+day+laser+cut");
    add(7,5,"🏢 B2B: corporate estate","b2b","Gadget eventi estivi, fiere, team building");
    add(7,10,"🎄 Natale: pianificazione EARLY","deadline","CRITICO: design catalogo natalizio, ordina materiali");
    add(7,20,"📋 Review Q2","deadline","Analisi vendite H1, bestseller, keyword");
    add(8,1,"🎄 Produzione Natale: AVVIO","deadline","CRITICO: ornamenti, cornici, decorazioni natalizie");
    add(8,15,"🌞 Ferragosto","holiday","Chiusura aziendale — imposta auto-reply Etsy");
    add(8,20,"🍂 Catalogo Autunno: design","deadline","Foglie, zucche, harvest, fall vibes");
    add(8,25,"📦 Materiali Natale: ORDINE","deadline","URGENTE: legno, acrilico, packaging regalo");
    add(8,28,"📸 Foto prodotti natalizi","deadline","Mood board invernale per Etsy");
    add(9,1,"🔙 Back to School","occasion","Targhe scrivania, gadget scolastici laser");
    add(9,5,"🛒 Listing Natale LIVE","deadline","Early bird buyers cercano da settembre");
    add(9,5,"🏢 B2B: rientro forte ★","b2b","Targeting proattivo aziende che rientrano");
    add(9,15,'💒 Ultimi Matrimoni Estate',"wedding","Premium price per ordini urgenti");
    add(9,21,"🍂 Autunno: INIZIO","season","Autumn decor: foglie, zucche, fall home decor");
    add(9,29,"🎃 Pre-Halloween: avvio","deadline","USA/UK: Halloween ornaments, signs, decor");
    add(10,1,"🛍️ Black Friday: pianificazione","deadline","Prepara sconti, bundle, coupon Etsy");
    add(10,5,"🏢 B2B: budget Natale","b2b","Le aziende definiscono budget regali ORA — contattale!");
    add(10,15,'🎃 Halloween Peak ★★',"occasion","USA/UK/EU: laser Halloween decor",
      "https://www.etsy.com/search?q=halloween+laser+cut");
    add(10,20,"🛒 Black Friday early listing","deadline","Attiva early BF sconti su Etsy");
    add(10,25,"📦 Stock Natale: verifica","deadline","Hai stock per 8 settimane Natale? Conta ORA");
    add(10,31,"🎃 Halloween ★★","holiday","Picco Halloween — spedizioni rapide");
    add(11,1,"🕯️ Ognissanti","holiday","Festività — auto-reply Etsy");
    add(11,2,"💀 Día de Muertos","occasion","USA/Mexico: calaveras laser, sugar skull decor");
    add(11,5,'🏢 B2B: ordini Natale ★★',"b2b","URGENTE: ordini corporate con scadenza realistica");
    add(11,15,"📧 Email clienti: Natale","deadline","Newsletter con offerte natalizie ai tuoi clienti");
    add(11,28,'🛍️ BLACK FRIDAY ★★★★',"occasion","PICCO ASSOLUTO VENDITE dell anno",
      "https://www.etsy.com/search?q=christmas+laser+engraved+gift");
    add(11,29,"🏪 Small Business Saturday","occasion","USA: push artigiani sui social media");
    add(11,30,'💻 Cyber Monday ★★★',"occasion","Bundle, coupon digitali, set regalo");
    add(12,1,'🎄 NATALE: PICCO MASSIMO ★★★★',"season","MASSIMO PICCO ASSOLUTO — tutto a piena capacità");
    add(12,5,"🎪 Mercatini Natale: apertura","fair","Allestimento stand, stock, pricing fiera");
    add(12,6,"📦 Deadline spedizioni standard","deadline","CRITICO: ultima data consegna garantita Natale");
    add(12,10,"⚡ Solo express/ritiro","deadline","Dopo oggi solo corriere premium o ritiro locale");
    add(12,13,"🇸🇪 Santa Lucia Scandinavia","occasion","Nordico: candele, lanterne, hygge laser decor");
    add(12,17,"⚡ Panic buyers peak","deadline","Ordini urgenti — premium urgency price giustificato");
    add(12,21,"❄️ Solstizio Inverno","season","Nordic winter decor, fiocchi neve laser");
    add(12,24,"🎄 Vigilia Natale","holiday","Produzione sospesa — auguri clienti");
    add(12,25,'🎄 Natale ★★★★',"holiday","Festività — monitora recensioni");
    add(12,26,"🎁 Boxing Day UK/AU","occasion","UK/Australia: saldi post-Natale");
    add(12,28,"📊 Analisi anno + piano 2027","deadline","Risultati, obiettivi, corso azione nuovo anno");
    add(12,31,"🥂 Capodanno eve","holiday","Fine anno — celebra i successi");
    // Review mensile
    ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"].forEach((mn,i)=>{
      add(i+1,28,`📊 Review ${mn}`,"deadline",`Revenue, bestseller, margini, stock ordini`);
    });
    add(3,10,"🎪 Fiera Primavera: iscrizioni","fair","Deadline iscrizioni fiere artigianato");
    add(5,5,"🎪 Mercatino Maggio: prep","fair","Stand, prezzi, catalogo, packaging");
    add(9,20,"🎪 Fiera Autunno: prep","fair","Stock invernale anticipato, allestimento");
    add(11,10,"🎪 Mercatini Natale","fair","Apertura mercatini natalizi");
    // ── EVENTI SCUOLA, MAESTRE, LAUREE, MATRIMONI ────────────────────
    add(1,15,"🍎 Regali maestre (gen)","occasion","Portachiavi maestre, mele laser, righelli personalizzati");
    add(2,1,"🎓 Lauree febbraio","occasion","Cornici, portachiavi laurea, pergamene personalizzate");
    add(3,8,"🌷 Festa della Donna","occasion","Portachiavi, dediche, prodotti personalizzati per lei");
    add(3,19,"👨 Festa del Papà ★★","occasion","Portachiavi papà, targhe, regali personalizzati. PICCO");
    add(3,25,"🐣 Pre-Pasqua — avvio","deadline","Uova laser, decorazioni pasquali — INIZIA PRODUZIONE ORA");
    add(4,10,"💍 Stagione matrimoni","season","Bomboniere, tableau, segnaposto laser — picco fino settembre");
    add(4,22,"🌍 Earth Day","occasion","Prodotti eco: bambù, sughero, legno naturale");
    add(5,15,"🍎 REGALO MAESTRE FINE ANNO","occasion","AVVIA PRODUZIONE: portachiavi maestre, mele, libri laser");
    add(5,20,"🎓 Lauree estate — prep","deadline","Pergamene laurea, portachiavi, cornici diploma — ordini in arrivo");
    add(5,25,"🏫 Rappresentanti classe","occasion","Gadget fine anno: badge classe, prodotti scuola, diplomi");
    add(6,1,"🎓 LAUREE GIUGNO ★★★","occasion","PICCO MASSIMO lauree. Bomboniere, cornici, portachiavi");
    add(6,5,"🍎 MAESTRE FINE ANNO ★★★","occasion","PICCO: regalino maestre. Mele legno, libri, porta-matite laser");
    add(6,8,"🏅 FINE ANNO SCOLASTICO","occasion","Diplomi, gadget classe, rappresentanti. Altissima richiesta");
    add(6,15,"💍 Matrimoni picco estate","season","ALTA STAGIONE matrimoni. Bomboniere laser urgenti");
    add(7,15,"🎓 Lauree luglio","occasion","Lauree estive. Portachiavi, pergamene");
    add(7,20,"📦 Stock planning autunno","deadline","Ordina materiali per autunno: legni, plexiglass, MDF");
    add(8,20,"📋 Planning Q4 — inizia","deadline","Pianifica Natale, Black Friday, mercatini. Ordine materiali");
    add(9,1,"📚 Back to School ★★","season","Cancelleria laser, astucci, righelli, gadget scuola personalizzati");
    add(9,5,"🍎 Maestre nuovo anno","occasion","Benvenuto scuola: portachiavi, kit back-to-school");
    add(9,15,"🏫 Rappresentanti nuovi","occasion","Elezioni rappresentanti: badge, gadget classe");
    add(10,15,"🎄 Pre-Natale Etsy listing","deadline","⚠️ PUBBLICA ORA su Etsy: natale per SEO ottobre");
    add(10,20,"📦 Stock Natale materiali","deadline","Ordina legni, plexiglass, packaging natalizio");
    add(11,1,"🎄 PRODUZIONE NATALE","deadline","⚠️ AVVIA: decorazioni, presepi, stelle, palline laser");
    add(11,15,"🎓 Lauree autunno","occasion","Lauree autunnali. Regali personalizzati laurea");
    add(11,22,"🛍️ Black Friday ★★★","occasion","SUPER PICCO vendite. Sconti gadget, abbigliamento personalizzato");
    add(12,5,"🎅 Mercatini Natale picco","fair","Massima affluenza. Porta stock completo");
    add(12,10,"⏰ Last order Natale","deadline","AVVISA: ultima data ordini per consegna garantita Natale");
    add(12,20,"🎁 Regali aziendali","occasion","Gadget aziendali last minute. Abbigliamento personalizzato aziendale");
    return e.sort((a,b)=>a.date.localeCompare(b.date));
  },
  CAT_COLOR:{holiday:'var(--red)',season:'var(--green)',wedding:'#a78bfa',kids:'var(--blue)',occasion:'var(--orange)',deadline:'var(--primary)',personal:'var(--text-muted)',meeting:'var(--green)',production:'#f59e0b',fair:'#ec4899',etsy:'#f0728f',b2b:'#38bdf8',social:'#22c55e',fiscal:'#ef4444'},
  CAT_ICON:{
    holiday:'<i class="fas fa-star" style="font-size:8px"></i>',
    season:'<i class="fas fa-leaf" style="font-size:8px"></i>',
    wedding:'<i class="fas fa-ring" style="font-size:8px"></i>',
    kids:'<i class="fas fa-child" style="font-size:8px"></i>',
    occasion:'<i class="fas fa-gift" style="font-size:8px"></i>',
    deadline:'<i class="fas fa-exclamation-triangle" style="font-size:8px"></i>',
    personal:'<i class="fas fa-thumbtack" style="font-size:8px"></i>',
    meeting:'<i class="fas fa-handshake" style="font-size:8px"></i>',
    production:'<i class="fas fa-cog" style="font-size:8px"></i>',
    fair:'<i class="fas fa-store" style="font-size:8px"></i>',
    b2b:'<i class="fas fa-building" style="font-size:8px"></i>',
    etsy:'<i class="fas fa-shopping-bag" style="font-size:8px"></i>',
    fiscal:'<i class="fas fa-balance-scale" style="font-size:8px"></i>',
    social:'<i class="fas fa-share-alt" style="font-size:8px"></i>',
    fair:'<i class="fas fa-store" style="font-size:8px"></i>',
    b2b:'<i class="fas fa-building" style="font-size:8px"></i>',
    etsy:'<i class="fas fa-shopping-bag" style="font-size:8px"></i>',
    fiscal:'<i class="fas fa-balance-scale" style="font-size:8px"></i>',
    social:'<i class="fas fa-share-nodes" style="font-size:8px"></i>'
  },
  async render(){
    const el=eid('calendar-grid');if(!el)return;
    const userEvents=await IDB.getAll('events');
    const year=this.current.getFullYear(),month=this.current.getMonth();
    const marketing=this.getMarketingEvents(year);
    const allEvents=[...userEvents,...marketing];
    eid('cal-title').textContent=new Date(year,month,1).toLocaleDateString('it-IT',{month:'long',year:'numeric'}).toUpperCase();
    const firstDay=new Date(year,month,1).getDay();
    const daysInMonth=new Date(year,month+1,0).getDate();
    const days=['LUN','MAR','MER','GIO','VEN','SAB','DOM'];
    let html=`<div class="card" style="padding:12px"><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">`;
    days.forEach((d,i)=>html+=`<div style="text-align:center;font-size:10px;color:${i>=5?'var(--primary)':'var(--text-muted)'};padding:8px 2px;font-weight:700">${d}</div>`);
    const startOffset=(firstDay+6)%7;
    for(let i=0;i<startOffset;i++)html+=`<div></div>`;
    for(let d=1;d<=daysInMonth;d++){
      const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayEvents=allEvents.filter(e=>e.date===dateStr);
      const isToday=dateStr===today();
      const isWeekend=(new Date(dateStr).getDay()+6)%7>=5;
      const hasHoliday=dayEvents.some(e=>e.cat==='holiday');
      html+=`<div style="background:${isToday?'var(--primary)20':isWeekend?'var(--bg-card2)':'var(--bg-card)'};border:1px solid ${isToday?'var(--primary)':hasHoliday?'var(--red)40':'var(--border)'};border-radius:6px;padding:5px;min-height:72px;cursor:pointer;position:relative;transition:.15s" onclick="Calendar.addOnDay('${dateStr}')" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='${isToday?'var(--primary)':hasHoliday?'var(--red)40':'var(--border)'}'">
        <div style="font-size:11px;font-weight:${isToday?800:isWeekend?600:400};color:${isToday?'var(--primary)':isWeekend?'var(--primary)':'var(--text-muted)'};">${d}</div>
        ${dayEvents.slice(0,3).map(e=>`<div style="font-size:9px;padding:1px 3px;margin-top:1px;border-radius:3px;background:${this.CAT_COLOR[e.cat]||'var(--primary)'}22;color:${this.CAT_COLOR[e.cat]||'var(--primary)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:2px" title="${e.title}">
          <span>${this.CAT_ICON[e.cat]||'•'}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis">${e.title}</span>
          ${!e._static?`<span onclick="event.stopPropagation();Calendar.delEvent(${e.id})" style="opacity:.6;cursor:pointer;flex-shrink:0">✕</span>`:''}
        </div>`).join('')}
        ${dayEvents.length>3?`<div style="font-size:9px;color:var(--text-dim);text-align:center">+${dayEvents.length-3}</div>`:''}
      </div>`;
    }
    html+=`</div></div>`;
    el.innerHTML=html;
    // Upcoming events list
    const listEl=eid('calendar-event-list');
    if(listEl){
      const upcoming=[...userEvents,...marketing].filter(e=>e.date>=today()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,10);
      listEl.innerHTML=upcoming.length?upcoming.map(e=>`<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
        <div style="width:8px;height:8px;border-radius:50%;background:${this.CAT_COLOR[e.cat]||'var(--primary)'};flex-shrink:0;margin-top:5px"></div>
        <span style="flex:1">
          <strong style="font-size:12px;display:block">${e.title}</strong>
          <small style="color:var(--text-muted)">${fmtDate(e.date)}</small>
        </span>
        ${!e._static?`<div class="act-group"><button class="act-btn act-edit" onclick="Calendar.editEvent(${e.id})" style="padding:2px 6px"><i class="fas fa-edit"></i></button><button class="act-btn act-del" onclick="Calendar.delEvent(${e.id})" style="padding:2px 6px"><i class="fas fa-trash"></i></button></div>`:''}
      </div>`).join(''):`<p style="color:var(--text-muted);text-align:center;padding:16px;font-size:13px">Nessun evento imminente</p>`;
    }
    // Season info
    const seasonEl=eid('calendar-season-info');
    if(seasonEl){
      const m=month+1;
      const seasons=[
        {months:[12,1,2],label:'❄️ Inverno',tip:'Natale, Epifania, San Valentino. Produci regali personalizzati e decorazioni natalizie.',color:'var(--blue)'},
        {months:[3,4,5],label:'🌸 Primavera',tip:'Pasqua, Comunioni, Cresime, Matrimoni, Festa Mamma/Papà. STAGIONE ALTISSIMA.',color:'var(--green)'},
        {months:[6,7,8],label:'☀️ Estate',tip:'Matrimoni estate, lauree, fiere locali. Produci targhe, cornici, gadget turismo.',color:'var(--orange)'},
        {months:[9,10,11],label:'🍂 Autunno',tip:'Rientro scuole, Halloween, Black Friday, avvio produzione natalizia urgente.',color:'var(--primary)'},
      ];
      const cur=seasons.find(s=>s.months.includes(m));
      const monthlyEvents=marketing.filter(e=>parseInt(e.date.split('-')[1])===m);
      seasonEl.innerHTML=`<div style="margin-bottom:10px">
        <div style="font-size:20px;margin-bottom:4px">${cur?.label||''}</div>
        <p style="font-size:12px;color:var(--text-muted);line-height:1.5">${cur?.tip||''}</p>
      </div>
      <div style="font-size:11px;font-weight:600;color:var(--text-dim);margin-bottom:6px;text-transform:uppercase">QUESTO MESE:</div>
      ${monthlyEvents.slice(0,6).map(e=>`<div style="display:flex;gap:6px;align-items:center;margin-bottom:5px">
        <span style="width:6px;height:6px;border-radius:50%;background:${this.CAT_COLOR[e.cat]||'var(--primary)'};flex-shrink:0"></span>
        <span style="font-size:11px;flex:1">${e.title}</span>
        <span style="font-size:10px;color:var(--text-dim)">${e.date.split('-')[2]}</span>
      </div>`).join('')}`;
    }
  },
  goToday(){this.current=new Date();this.render();},
  prev(){this.current.setMonth(this.current.getMonth()-1);this.render();},
  next(){this.current.setMonth(this.current.getMonth()+1);this.render();},
  addOnDay(date){this.editId=null;eid('ev-date').value=date;eid('ev-title').value='';eid('ev-notes').value='';eid('ev-cat').value='personal';openModal('calendar');},
  openModal(){this.editId=null;eid('ev-date').value=today();eid('ev-title').value='';eid('ev-notes').value='';eid('ev-cat').value='personal';openModal('calendar');},
  async editEvent(id){
    const e=await IDB.get('events',id);if(!e)return;
    this.editId=id;
    eid('ev-title').value=e.title;eid('ev-date').value=e.date;eid('ev-cat').value=e.cat||'personal';eid('ev-notes').value=e.notes||'';
    openModal('calendar');
  },
  async save(){
    const title=eid('ev-title').value.trim();if(!title){toast('Titolo obbligatorio','warning');return;}
    const ev={title,date:eid('ev-date').value,cat:eid('ev-cat').value,notes:eid('ev-notes').value};
    if(this.editId)ev.id=this.editId;
    await IDB.put('events',ev);
    toast('Evento salvato!');closeModal('calendar');this.editId=null;await this.render();
  },
  async delEvent(id){
    if(!confirm('Eliminare questo evento?'))return;
    await IDB.del('events',id);toast('Evento eliminato','warning');await this.render()
  }
};

// ===== STRATEGY =====
const Team={
  editId:null,
  async render(){
    const el=eid('team-grid');if(!el)return;
    const members=await IDB.getAll('team');
    el.innerHTML=members.map(m=>`<div class="card" style="position:relative">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <div style="width:48px;height:48px;background:linear-gradient(135deg,var(--primary-dim),var(--bg-card2));border:2px solid var(--primary-border);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:var(--primary);flex-shrink:0">${m.name.charAt(0).toUpperCase()}</div>
        <div>
          <strong style="font-size:14px">${m.name}</strong>
          <p style="font-size:12px;color:var(--text-muted);margin-top:2px">${m.role}</p>
        </div>
      </div>
      <div class="stat-row"><span class="text-muted" style="font-size:12px">Tipo</span><span class="badge badge-gray">${m.type}</span></div>
      <div class="stat-row"><span class="text-muted" style="font-size:12px">Tariffa</span><span style="color:var(--primary);font-weight:700">${fmtCur(m.rate)}/h</span></div>
      <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:3px">${(m.skills||'').split(',').filter(s=>s.trim()).map(s=>`<span class="badge badge-gray" style="font-size:10px">${s.trim()}</span>`).join('')}</div>
      <div class="act-group mt-12">
        <button class="act-btn act-edit" style="flex:1;justify-content:center" onclick="Team.openModal(${m.id})"><i class="fas fa-edit"></i> Modifica</button>
        <button class="act-btn act-del" onclick="Team.del(${m.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>`).join('');
  },
  async openModal(id=null){
    this.editId=id;
    eid('modal-team-title').textContent=id?'Modifica Membro':'Aggiungi Membro';
    if(id){const m=await IDB.get('team',id);if(m){eid('team-name').value=m.name;eid('team-role').value=m.role;eid('team-type').value=m.type;eid('team-rate').value=m.rate;eid('team-skills').value=m.skills||'';}}
    else{['team-name','team-role','team-rate','team-skills'].forEach(f=>{const el=eid(f);if(el)el.value=''});}
    openModal('team');
  },
  async save(){
    const m={name:eid('team-name').value,role:eid('team-role').value,type:eid('team-type').value,rate:+eid('team-rate').value||0,skills:eid('team-skills').value};
    if(this.editId)m.id=this.editId;
    await IDB.put('team',m);toast('Membro salvato!');closeModal('team');this.editId=null;await this.render();
  },
  async del(id){if(!confirm('Eliminare?'))return;await IDB.del('team',id).catch(e=>console.warn('[IDB.del]',e));toast('Eliminato','warning');await this.render();}
};

// ===== FINANCE PRO =====
const Equipment={
  editId:null, filterVal:'', catFilter:'', viewTab:'list',
  async render(){
    try { await this.tab('list',null); } catch(e){ console.error('[Equipment.render]',e); }
  },
  async tab(t,btn){
    this.viewTab=t;
    document.querySelectorAll('#view-equipment .tab-btn').forEach(b=>b.classList.remove('active'));
    if(btn)btn.classList.add('active');
    else{const btns=document.querySelectorAll('#view-equipment .tab-btn');if(btns[0])btns[0].classList.add('active');}
    const items=await IDB.getAll('equipment');
    const totalInvest=items.reduce((a,i)=>a+(+i.cost||0),0);
    const active=items.filter(i=>i.status==='attivo');
    const totalAnnAmm=items.reduce((a,i)=>a+((+i.cost||0)/(+i.life||5)),0);
    const kpis=eid('equipment-kpis');
    if(kpis)kpis.innerHTML=[
      {l:'Totale Investito',v:fmtCur(totalInvest),i:'fa-euro-sign',c:'var(--primary)'},
      {l:'Attrezzature Attive',v:active.length,i:'fa-check-circle',c:'var(--green)'},
      {l:'Amm. Annuo',v:fmtCur(totalAnnAmm),i:'fa-chart-line',c:'var(--blue)'},
      {l:'Valore Residuo',v:fmtCur(items.reduce((a,i)=>{
        const age=i.purchaseDate?(new Date().getFullYear()-new Date(i.purchaseDate).getFullYear()):0;
        return a+Math.max(0,(+i.cost||0)-(age*(+i.cost||0)/(+i.life||5)));
      },0)),i:'fa-coins',c:'var(--orange)'},
    ].map(k=>`<div class="kpi-card"><i class="fas ${k.i} kpi-icon" style="color:${k.c}"></i><div class="kpi-value">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');
    const el=eid('equipment-content');if(!el)return;
    const statusBadge={attivo:'badge-green',manutenzione:'badge-yellow',dismesso:'badge-red'};
    const statusLabel={attivo:'✅ Attivo',manutenzione:'🔧 Manutenzione',dismesso:'⛔ Dismesso'};
    // Alerts
    const alertEl=eid('equipment-alerts');
    const maintItems=items.filter(i=>i.status==='manutenzione');
    const warrantyExpiring=items.filter(i=>{
      if(!i.warranty)return false;
      const diff=(new Date(i.warranty)-new Date())/(1000*3600*24);
      return diff>=0&&diff<=60;
    });
    if(alertEl){
      let alertHtml='';
      if(maintItems.length)alertHtml+=`<div class="alert alert-warning"><i class="fas fa-wrench"></i> <strong>${maintItems.length} in manutenzione:</strong> ${maintItems.map(i=>i.name).join(', ')}</div>`;
      if(warrantyExpiring.length)alertHtml+=`<div class="alert alert-danger"><i class="fas fa-shield-alt"></i> <strong>Garanzie in scadenza entro 60gg:</strong> ${warrantyExpiring.map(i=>i.name).join(', ')}</div>`;
      alertEl.innerHTML=alertHtml;
    }
    if(t==='list'){
      if(!items.length){el.innerHTML=`<div class="empty-state"><i class="fas fa-tools"></i><p>Nessuna attrezzatura. Aggiungi la prima!</p></div>`;return;}
      el.innerHTML=`<div class="table-wrap"><table><thead><tr>
        <th>Attrezzatura</th><th>Cat.</th><th>Acquisto</th><th>Costo</th><th>Ammort.</th><th>Valore Res.</th><th>Stato</th><th>Azioni</th>
      </tr></thead><tbody>${items.map(i=>{
        const age=i.purchaseDate?(new Date().getFullYear()-new Date(i.purchaseDate).getFullYear()):0;
        const annAmm=(+i.cost||0)/(+i.life||5);
        const valResiduo=Math.max(0,(+i.cost||0)-(age*annAmm));
        const pct=Math.max(0,Math.min(100,100-(age/(+i.life||5)*100)));
        const wBadge=i.warranty?`<span title="Garanzia: ${fmtDate(i.warranty)}" style="margin-left:4px;font-size:10px;color:var(--green)"><i class="fas fa-shield-alt"></i></span>`:'';
        return`<tr>
          <td>
            <div style="display:flex;align-items:center;gap:8px">${i.photo?`<img src="${i.photo}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;border:1px solid var(--border);flex-shrink:0;cursor:zoom-in" onclick="window.open(this.src,'_blank')" title="Click per ingrandire">`:`<div style="width:36px;height:36px;background:var(--bg-card2);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">⚙️</div>`}
            <div><strong>${i.name}</strong>${wBadge}
            ${i.brand?`<br><small class="text-muted">${i.brand}${i.serial?' · S/N: '+i.serial:''}</small>`:''}
            ${i.supportName?`<br><small style="color:var(--blue);font-size:10px"><i class="fas fa-headset"></i> ${i.supportName}</small>`:''}</div></div>
          </td>
          <td><span class="badge badge-gray" style="font-size:10px">${i.category}</span></td>
          <td style="color:var(--text-muted)">${fmtDate(i.purchaseDate)}</td>
          <td><strong style="color:var(--primary)">${fmtCur(i.cost)}</strong></td>
          <td style="color:var(--blue)">${fmtCur(annAmm)}/a</td>
          <td>
            <strong>${fmtCur(valResiduo)}</strong>
            <div class="progress mt-4" style="height:3px"><div class="progress-bar ${pct>60?'green':pct>30?'':'red'}" style="width:${pct}%"></div></div>
          </td>
          <td><span class="badge ${statusBadge[i.status]||'badge-gray'}">${statusLabel[i.status]||i.status}</span></td>
          <td>
            <div class="act-group">
              <button class="act-btn act-edit" onclick="Equipment.openModal(${i.id})"><i class="fas fa-edit"></i></button>
              <button class="act-btn act-del" onclick="Equipment.del(${i.id})"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
    } else if(t==='support'){
      if(!items.length){el.innerHTML=`<div class="empty-state"><i class="fas fa-headset"></i><p>Nessuna attrezzatura</p></div>`;return;}
      el.innerHTML=`<div class="grid-3">${items.map(i=>`<div class="card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <div style="width:44px;height:44px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px">⚙️</div>
          <div><strong>${i.name}</strong><br><small class="text-muted">${i.brand||''} ${i.serial?'· S/N:'+i.serial:''}</small></div>
        </div>
        <div class="stat-row"><span class="text-muted" style="font-size:12px">Stato</span><span class="badge ${statusBadge[i.status]||'badge-gray'}">${statusLabel[i.status]||i.status}</span></div>
        ${i.warranty?`<div class="stat-row"><span class="text-muted" style="font-size:12px"><i class="fas fa-shield-alt" style="margin-right:3px;color:var(--green)"></i>Garanzia</span><span style="font-size:12px;color:var(--green)">${fmtDate(i.warranty)}</span></div>`:''}
        ${i.supportName?`<div class="stat-row"><span class="text-muted" style="font-size:12px"><i class="fas fa-building" style="margin-right:3px"></i>Supporto</span><strong style="font-size:12px">${i.supportName}</strong></div>`:''}
        ${i.supportPhone?`<div class="stat-row"><span class="text-muted" style="font-size:12px"><i class="fas fa-phone" style="margin-right:3px"></i>Tel</span><a href="tel:${i.supportPhone}" style="color:var(--green);font-weight:700;font-size:13px;text-decoration:none">${i.supportPhone}</a></div>`:''}
        ${i.supportEmail?`<div class="stat-row"><span class="text-muted" style="font-size:12px"><i class="fas fa-envelope" style="margin-right:3px"></i>Email</span><a href="mailto:${i.supportEmail}" style="color:var(--blue);font-size:12px;text-decoration:none">${i.supportEmail}</a></div>`:''}
        ${i.supportNotes?`<div style="margin-top:8px;font-size:11px;color:var(--text-muted);background:var(--bg-card2);padding:8px;border-radius:6px;border-left:3px solid var(--primary)">${i.supportNotes}</div>`:''}
        ${!i.supportName&&!i.supportPhone&&!i.supportEmail?`<p class="text-muted" style="font-size:12px;text-align:center;padding:12px">Nessun contatto supporto inserito</p>`:''}
        <div class="act-group mt-12">
          <button class="act-btn act-edit" style="flex:1;justify-content:center" onclick="Equipment.openModal(${i.id})"><i class="fas fa-edit"></i> Modifica</button>
          ${i.supportPhone?`<a class="act-btn act-pay" href="tel:${i.supportPhone}"><i class="fas fa-phone"></i></a>`:''}
        </div>
      </div>`).join('')}</div>`;
    } else if(t==='chart'){
      const byCat={};
      items.forEach(i=>{byCat[i.category]=(byCat[i.category]||0)+(+i.cost||0);});
      el.innerHTML=`<div class="grid-2">
        <div class="card"><div class="card-title">Investimento per Categoria</div><div class="chart-wrap"><canvas id="chart-equipment"></canvas></div></div>
        <div class="card"><div class="card-title">Riepilogo per Categoria</div>${Object.entries(byCat).map(([cat,tot])=>`<div class="stat-row"><span>${cat}</span><span class="stat-val">${fmtCur(tot)}</span></div>`).join('')}</div>
      </div>`;
      setTimeout(()=>{
        if(eid('chart-equipment')&&Object.keys(byCat).length){
          new Chart(eid('chart-equipment'),{type:'doughnut',data:{labels:Object.keys(byCat),datasets:[{data:Object.values(byCat),backgroundColor:['rgba(251,191,36,.7)','rgba(59,130,246,.7)','rgba(34,197,94,.7)','rgba(239,68,68,.7)','rgba(168,85,247,.7)','rgba(249,115,22,.7)'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#888'}}}}});
        }
      },50);
    }
  },
  filter(v){this.filterVal=v.toLowerCase();this.render();},
  filterCat(v){this.catFilter=v;this.render();},
  _photoData:null,
  handlePhoto(input){const f=input.files?.[0];if(!f)return;const r=new FileReader();r.onload=e=>{this._photoData=e.target.result;const p=eid('eq-photo-preview');if(p){p.innerHTML=`<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`;}};r.readAsDataURL(f);},
  clearPhoto(){this._photoData=null;const p=eid('eq-photo-preview');if(p)p.innerHTML='⚙️';const u=eid('eq-photo-url');if(u)u.value='';},
  _loadPhotoUrl(url){
    if(!url||!url.startsWith('http'))return;
    this._photoData=url;
    const p=eid('eq-photo-preview');
    if(p)p.innerHTML=`<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.parentElement.innerHTML='⚙️'">`;
  },
  _photoData:null,
  handlePhoto(input){const f=input.files?.[0];if(!f)return;const r=new FileReader();r.onload=e=>{this._photoData=e.target.result;const p=eid('eq-photo-preview');if(p)p.innerHTML=`<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`;};r.readAsDataURL(f);},
  clearPhoto(){this._photoData=null;const p=eid('eq-photo-preview');if(p)p.innerHTML='⚙️';},
    async openModal(id=null){
    this.editId=id;this._photoData=null;
    const prev=eid('eq-photo-preview');if(prev)prev.innerHTML='⚙️';
    eid('modal-equipment-title').textContent=id?'Modifica Attrezzatura':'Nuova Attrezzatura';
    if(id){
      const i=await IDB.get('equipment',id);if(!i)return;
      this._photoData=i.photo||null;
      // Restore preview if photo exists
      const prevP=eid('eq-photo-preview');
      if(prevP){prevP.innerHTML=i.photo?`<img src="${i.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">` : '⚙️';}
      if(prev&&i.photo)prev.innerHTML=`<img src="${i.photo}" style="width:100%;height:100%;object-fit:cover">`;
      eid('eq-name').value=i.name;eid('eq-cat').value=i.category;eid('eq-brand').value=i.brand||'';
      eid('eq-serial').value=i.serial||'';eid('eq-cost').value=i.cost;eid('eq-date').value=i.purchaseDate||'';
      eid('eq-life').value=i.life||5;eid('eq-status').value=i.status||'attivo';
      eid('eq-supplier').value=i.supplier||'';eid('eq-notes').value=i.notes||'';
      eid('eq-support-name').value=i.supportName||'';eid('eq-support-phone').value=i.supportPhone||'';
      eid('eq-support-email').value=i.supportEmail||'';eid('eq-warranty').value=i.warranty||'';
      eid('eq-support-notes').value=i.supportNotes||'';
    }else{
      ['eq-name','eq-brand','eq-serial','eq-supplier','eq-notes','eq-support-name','eq-support-phone','eq-support-email','eq-support-notes'].forEach(f=>{const el=eid(f);if(el)el.value='';});
      eid('eq-cost').value='0';eid('eq-life').value='5';eid('eq-date').value=today();eid('eq-status').value='attivo';eid('eq-warranty').value='';
    }
    openModal('equipment');
  },

  async importExcel() {
    const file = await ExcelImport.openPicker();
    if (!file) return;
    try {
      const { rows, col } = await ExcelImport.parseFile(file);
      const iNome   = col('nome','name','attrezzatura','equipment','macchinario');
      const iBrand  = col('brand','marca','produttore','manufacturer');
      const iSerial = col('seriale','serial','sn','s_n','numero_serie');
      const iCosto  = col('costo','cost','prezzo','price','valore');
      const iData   = col('data','date','acquisto','purchase_date','data_acquisto');
      const iCat    = col('categoria','category','tipo','type');
      const iVita   = col('vita','anni','life','anni_vita','durata');
      const fields  = [iNome>=0&&'Nome',iBrand>=0&&'Brand',iCosto>=0&&'Costo',iData>=0&&'Data Acquisto'].filter(Boolean);
      ExcelImport.showPreview(file, fields, rows.length, async () => {
        toast('Importazione attrezzature...','info',2500);
        let n=0;
        for(let i=0;i<rows.length;i++){
          const r=rows[i];
          const nome=(iNome>=0?String(r[iNome]||''):'').trim();
          if(!nome) continue;
          const costo=iCosto>=0?parseFloat(String(r[iCosto]||'0').replace(/[€$,\s]/g,''))||0:0;
          await IDB.put('equipment',{id:Date.now()+i,name:nome,brand:iBrand>=0?String(r[iBrand]||'').trim():'',serialNo:iSerial>=0?String(r[iSerial]||'').trim():'',cost:costo,purchaseDate:iData>=0?String(r[iData]||'').trim():'',lifeYears:iVita>=0?+r[iVita]||5:5,category:iCat>=0?String(r[iCat]||'').trim():'Altro',status:'active'}).catch(()=>{});
          n++;
        }
        AppStore.invalidate('equipment');
        await this.render();
        toast('✅ '+n+' attrezzature importate','success',4000);
      });
    } catch(e){ toast('Errore: '+e.message,'error',6000); }
  },
  async save(){
    const item={name:eid('eq-name').value,category:eid('eq-cat').value,brand:eid('eq-brand').value,
      serial:eid('eq-serial').value,cost:+eid('eq-cost').value||0,purchaseDate:eid('eq-date').value,
      life:+eid('eq-life').value||5,status:eid('eq-status').value,
      supplier:eid('eq-supplier').value,notes:eid('eq-notes').value,
      supportName:eid('eq-support-name').value,supportPhone:eid('eq-support-phone').value,
      supportEmail:eid('eq-support-email').value,warranty:eid('eq-warranty').value,
      supportNotes:eid('eq-support-notes').value,
      photo:this._photoData||null};
    if(this.editId){item.id=this.editId;}else{item.id=Date.now();}
    await IDB.put('equipment',item).catch(e=>{toast('Errore salvataggio','error');console.error('[Equipment.save]',e);});
    await logAction('equipment',item.id||'new',this.editId?'updated':'created',{name:item.name});
    toast(this.editId?'Attrezzatura aggiornata!':'Attrezzatura salvata!');
    AppStore.invalidate('equipment');
    closeModal('equipment');this.editId=null;await this.render();
  },
  async del(id){
    if(!confirm('Eliminare questa attrezzatura?'))return;
    await IDB.del('equipment',id).catch(e=>console.warn('[IDB.del]',e));toast('Eliminata','warning');AppStore.invalidate('equipment');
    await this.render();
  }
};
if(typeof Equipment!=="undefined")window.Equipment=Equipment; // immediate window export


// ===== COMPONENTS (COMPONENTI & ACCESSORI) =====
const FixedCosts={
  editId:null, catFilter:'', freqFilter:'',
  DEFAULTS:[
    {name:'Affitto Laboratorio',category:'Sede & Affitto',amount:0,freq:'mensile',vendor:'Proprietario',payMethod:'Bonifico',notes:''},
    {name:'Energia Elettrica',category:'Utenze',amount:0,freq:'mensile',vendor:'Enel',payMethod:'Addebito diretto',notes:''},
    {name:'Acqua',category:'Utenze',amount:0,freq:'trimestrale',vendor:'Comune',payMethod:'Bonifico',notes:''},
    {name:'Internet Fibra',category:'Internet & Telefono',amount:0,freq:'mensile',vendor:'TIM',payMethod:'Addebito diretto',notes:''},
    {name:'Cellulare Business',category:'Internet & Telefono',amount:0,freq:'mensile',vendor:'Iliad',payMethod:'Addebito diretto',notes:''},
    {name:'Adobe Creative Cloud',category:'Software & Abbonamenti',amount:0,freq:'mensile',vendor:'Adobe',payMethod:'Carta di credito',notes:''},
    {name:'LightBurn',category:'Software & Abbonamenti',amount:0,freq:'annuale',vendor:'LightBurn',payMethod:'Carta di credito',notes:'Licenza laser'},
    {name:'Pulizie',category:'Pulizie & Manutenzione',amount:0,freq:'mensile',vendor:'Servizio pulizie',payMethod:'Contanti',notes:''},
    {name:'Assicurazione',category:'Assicurazioni',amount:0,freq:'annuale',vendor:'Generali',payMethod:'Bonifico',notes:''},
    {name:'Canone Bancario',category:'Banche & Finanza',amount:0,freq:'mensile',vendor:'BancaX',payMethod:'Addebito diretto',notes:''},
  ],
  async seed(){
    const existing=await IDB.getAll('fixed_costs');
    if(!existing.length)for(const c of this.DEFAULTS){
      const start=today();
      await IDB.put('fixed_costs',{...c,startDate:start,nextDate:this._nextDate(start,c.freq)});
    }
  },
  _nextDate(from,freq){
    const d=new Date(from||today());
    if(freq==='mensile')d.setMonth(d.getMonth()+1);
    else if(freq==='trimestrale')d.setMonth(d.getMonth()+3);
    else if(freq==='annuale')d.setFullYear(d.getFullYear()+1);
    return d.toISOString().slice(0,10);
  },
  _monthly(c){
    if(c.freq==='mensile')return +c.amount;
    if(c.freq==='trimestrale')return (+c.amount||0)/3;
    if(c.freq==='annuale')return (+c.amount||0)/12;
    return 0;
  },
  async render(){
    const items=await IDB.getAll('fixed_costs');
    const filtered=items.filter(i=>{
      const mc=!this.catFilter||i.category===this.catFilter;
      const mf=!this.freqFilter||i.freq===this.freqFilter;
      return mc&&mf;
    });
    const totalMonthly=items.reduce((a,i)=>a+this._monthly(i),0);
    const totalAnnual=totalMonthly*12;
    const overdue=items.filter(i=>i.nextDate&&i.nextDate<today()).length;
    const kpis=eid('fixed-costs-kpis');
    if(kpis)kpis.innerHTML=[
      {l:'Costo Mensile',v:fmtCur(totalMonthly),i:'fa-calendar-day',c:'var(--primary)'},
      {l:'Costo Annuale',v:fmtCur(totalAnnual),i:'fa-calendar',c:'var(--blue)'},
      {l:'Voci di Costo',v:items.length,i:'fa-receipt',c:'var(--text-muted)'},
      {l:'Scadute / In Ritardo',v:overdue,i:'fa-exclamation-triangle',c:overdue>0?'var(--red)':'var(--green)'},
    ].map(k=>`<div class="kpi-card"><i class="fas ${k.i} kpi-icon" style="color:${k.c}"></i><div class="kpi-value">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');
    // Chart by category
    const byCat={};
    items.forEach(i=>{byCat[i.category]=(byCat[i.category]||0)+this._monthly(i);});
    destroyChart('chart-fixed-costs');
    if(eid('chart-fixed-costs')&&Object.keys(byCat).length){
      new Chart(eid('chart-fixed-costs'),{type:'doughnut',data:{labels:Object.keys(byCat),datasets:[{data:Object.values(byCat).map(v=>v.toFixed(2)),backgroundColor:['rgba(251,191,36,.7)','rgba(59,130,246,.7)','rgba(34,197,94,.7)','rgba(239,68,68,.7)','rgba(168,85,247,.7)','rgba(249,115,22,.7)','rgba(20,184,166,.7)','rgba(148,163,184,.7)'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#888',font:{size:10},boxWidth:12}}}}});
    }
    // Upcoming
    const upcoming=items.filter(i=>i.nextDate).sort((a,b)=>a.nextDate.localeCompare(b.nextDate)).slice(0,5);
    const upEl=eid('fixed-costs-upcoming');
    if(upEl)upEl.innerHTML=upcoming.map(i=>{
      const isLate=i.nextDate<today();
      return`<div class="stat-row" style="align-items:center">
        <span style="flex:1"><strong style="font-size:13px">${i.name}</strong><br><small style="color:${isLate?'var(--red)':'var(--text-muted)'}">${isLate?'⚠️ Scaduta':'📅'} ${fmtDate(i.nextDate)} · ${i.freq}</small></span>
        <span style="color:var(--primary);font-weight:700">${fmtCur(i.amount)}</span>
      </div>`;
    }).join('')||`<p class="text-muted" style="padding:12px;text-align:center">Nessuna scadenza impostata</p>`;
    // Table
    const el=eid('fixed-costs-tbody');if(!el)return;
    const catIcons={'Sede & Affitto':'🏠','Utenze':'⚡','Internet & Telefono':'📡','Software & Abbonamenti':'💻','Pulizie & Manutenzione':'🧹','Assicurazioni':'🛡️','Banche & Finanza':'🏦','Altro':'📋'};
    el.innerHTML=filtered.map(i=>{
      const monthly=this._monthly(i);
      const isLate=i.nextDate&&i.nextDate<today();
      return`<tr>
        <td>
          <strong>${catIcons[i.category]||'📋'} ${i.name}</strong>
          ${i.vendor?`<br><small class="text-muted">${i.vendor} · ${i.payMethod||''}</small>`:''}
          ${i.notes?`<br><small style="color:var(--text-dim);font-size:10px">${i.notes}</small>`:''}
        </td>
        <td><span class="badge badge-gray" style="font-size:10px">${i.category}</span></td>
        <td><span class="badge ${i.freq==='mensile'?'badge-blue':i.freq==='annuale'?'badge-green':'badge-yellow'}" style="font-size:10px">${i.freq}</span></td>
        <td><strong style="color:var(--primary)">${fmtCur(i.amount)}</strong></td>
        <td style="color:var(--text-muted)">${fmtCur(monthly)}/mese</td>
        <td style="color:${isLate?'var(--red)':'var(--text-muted)'}">${i.nextDate?fmtDate(i.nextDate):'—'}${isLate?' ⚠️':''}</td>
        <td><span class="badge ${isLate?'badge-red':'badge-green'}">${isLate?'Scaduta':'Attiva'}</span></td>
        <td>
          <div class="act-group">
            <button class="act-btn act-edit" onclick="FixedCosts.openModal(${i.id})"><i class="fas fa-edit"></i> Modifica</button>
            <button class="act-btn act-del" onclick="FixedCosts.del(${i.id})"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('')||`<tr><td colspan="8"><div class="empty-state"><i class="fas fa-receipt"></i><p>Nessun costo fisso. Aggiungine uno!</p></div></td></tr>`;
  },
  filterCat(v){this.catFilter=v;this.render();},
  filterFreq(v){this.freqFilter=v;this.render();},
  async openModal(id=null){
    this.editId=id;
    eid('modal-fc-title').textContent=id?'Modifica Costo Fisso':'Nuovo Costo Fisso';
    if(id){
      const i=await IDB.get('fixed_costs',id);if(!i)return;
      eid('fc-name').value=i.name;eid('fc-cat').value=i.category;eid('fc-amount').value=i.amount;
      eid('fc-freq').value=i.freq||'mensile';eid('fc-start').value=i.startDate||'';
      eid('fc-next').value=i.nextDate||'';eid('fc-vendor').value=i.vendor||'';
      eid('fc-pay').value=i.payMethod||'Bonifico';eid('fc-notes').value=i.notes||'';
    }else{
      ['fc-name','fc-vendor','fc-notes'].forEach(f=>{const el=eid(f);if(el)el.value='';});
      eid('fc-amount').value='0';eid('fc-freq').value='mensile';
      eid('fc-start').value=today();eid('fc-next').value=this._nextDate(today(),'mensile');
    }
    openModal('fixed-cost');
  },
  async save(){
    const item={name:eid('fc-name').value,category:eid('fc-cat').value,amount:+eid('fc-amount').value||0,
      freq:eid('fc-freq').value,startDate:eid('fc-start').value,nextDate:eid('fc-next').value,
      vendor:eid('fc-vendor').value,payMethod:eid('fc-pay').value,notes:eid('fc-notes').value};
    if(this.editId)item.id=this.editId;
    await IDB.put('fixed_costs',item);
    toast(this.editId?'Costo aggiornato!':'Costo salvato!');
    closeModal('fixed-cost');this.editId=null;await this.render();
  },
  async del(id){
    if(!confirm('Eliminare questo costo fisso?'))return;
    await IDB.del('fixed_costs',id).catch(e=>console.warn('[IDB.del]',e));toast('Eliminato','warning');AppStore.invalidate('fixed_costs');
    await this.render();
  }
};

// ===== ANALYTICS =====
const Analytics={
  async render(){
    const sales=await AppStore.get('sales');
    // Channels
    const channels={};
    sales.forEach(s=>{if(s.status==='pagato'&&s.channel)channels[s.channel]=(channels[s.channel]||0)+(+s.amount||0);});
    destroyChart('chart-channels');
    new Chart(eid('chart-channels'),{type:'doughnut',data:{labels:Object.keys(channels),datasets:[{data:Object.values(channels),backgroundColor:['rgba(251,191,36,0.7)','rgba(59,130,246,0.7)','rgba(168,85,247,0.7)','rgba(34,197,94,0.7)','rgba(239,68,68,0.7)'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#888'}}}}});
    // Top products
    const catalog=await AppStore.get('catalog');
    const top=catalog.sort((a,b)=>b.salePrice-a.salePrice).slice(0,5);
    const topEl=eid('analytics-top-products');
    if(topEl)topEl.innerHTML=top.map(p=>`<div class="stat-row"><span>${p.name}<br><small class="text-muted">${p.category}</small></span><span class="stat-val">${fmtCur(p.salePrice)}</span></div>`).join('');
    // Cost sim
    const simEl=eid('analytics-cost-sim');
    if(simEl)simEl.innerHTML=`<div class="form-group"><label class="form-label">Minuti Macchina</label><input class="form-control" id="sim-min" type="number" value="30" oninput="Analytics.calcSim()"></div><div class="form-group"><label class="form-label">Materiale (€)</label><input class="form-control" id="sim-mat" type="number" value="10" oninput="Analytics.calcSim()"></div><div id="sim-result"></div>`;
    this.calcSim();
    // Growth chart
    const months=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    const monthly=new Array(12).fill(0);
    sales.filter(s=>s.status==='pagato').forEach(s=>{const m=new Date(s.date).getMonth();monthly[m]+=(+s.amount||0);});
    destroyChart('chart-growth');
    new Chart(eid('chart-growth'),{type:'line',data:{labels:months,datasets:[{label:'Revenue',data:monthly,borderColor:'var(--primary)',backgroundColor:'rgba(251,191,36,0.1)',fill:true,tension:.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#888'},grid:{color:'#ffffff08'}},x:{ticks:{color:'#888'},grid:{display:false}}}}});
    // Breakeven
    const beEl=eid('analytics-breakeven');
    const totalCosts=5;// simplified
    if(beEl)beEl.innerHTML=`<div class="stat-row"><span>Costi Fissi/mese</span><span class="stat-val">€500</span></div><div class="stat-row"><span>Margine Medio</span><span class="stat-val">42%</span></div><div class="stat-row"><span>Break Even</span><span class="stat-val text-primary">€1.190/mese</span></div>`;
  },
  async calcSim(){
    const min=+eid('sim-min')?.value||0,mat=+eid('sim-mat')?.value||0;
    const pricing=await PricingEngine.suggest({materialCost:mat,machineMin:min});
    const el=eid('sim-result');
    if(el)el.innerHTML=`<div class="alert alert-info mt-12"><strong>Costo totale:</strong> ${fmtCur(pricing.totalCost)}<br><strong>Prezzo suggerito:</strong> ${fmtCur(pricing.gross)}<br><strong>Margine:</strong> ${pricing.margin}%</div>`;
  }
};

// ===== BUSINESS UNIT =====
const BU={
  editId:null,
  async render(){
    const units=await IDB.getAll('bu');
    const el=eid('bu-cards');if(!el)return;
    el.innerHTML=units.map(u=>{
      const profit=u.revenue-u.costs;
      const margin=u.revenue>0?Math.round(profit/u.revenue*100):0;
      return`<div class="card">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <div style="font-size:36px;line-height:1">${u.icon||'🏭'}</div>
          <div>
            <strong style="font-size:15px">${u.name}</strong>
            <div class="badge ${margin>30?'badge-green':margin>10?'badge-yellow':'badge-red'}" style="margin-top:4px;font-size:10px">Margine ${margin}%</div>
          </div>
        </div>
        <div class="stat-row"><span class="text-muted" style="font-size:12px">Revenue</span><span style="color:var(--green);font-weight:700">${fmtCur(u.revenue)}</span></div>
        <div class="stat-row"><span class="text-muted" style="font-size:12px">Costi</span><span style="color:var(--red)">${fmtCur(u.costs)}</span></div>
        <div class="stat-row"><span class="text-muted" style="font-size:12px">Profitto</span><span style="color:${profit>=0?'var(--green)':'var(--red)'};font-weight:700">${fmtCur(profit)}</span></div>
        <div class="progress mt-12" style="height:5px"><div class="progress-bar ${margin>30?'green':''}" style="width:${Math.max(0,Math.min(100,margin))}%"></div></div>
        <div class="act-group mt-12">
          <button class="act-btn act-edit" style="flex:1;justify-content:center" onclick="BU.openModal(${u.id})"><i class="fas fa-edit"></i> Modifica</button>
          <button class="act-btn act-del" onclick="BU.del(${u.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
    }).join('');
    this.renderCharts(units);
  },
  renderCharts(units){
    destroyChart('chart-bu-rev');
    new Chart(eid('chart-bu-rev'),{type:'bar',data:{labels:units.map(u=>u.name),datasets:[{label:'Revenue',data:units.map(u=>u.revenue),backgroundColor:'rgba(251,191,36,0.7)'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#888'},grid:{color:'#ffffff08'}},x:{ticks:{color:'#888'},grid:{display:false}}}}});
    destroyChart('chart-bu-margin');
    new Chart(eid('chart-bu-margin'),{type:'doughnut',data:{labels:units.map(u=>u.name),datasets:[{data:units.map(u=>Math.max(0,u.revenue-u.costs)),backgroundColor:['rgba(251,191,36,0.7)','rgba(59,130,246,0.7)','rgba(34,197,94,0.7)'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#888'}}}}});
  },
  async openModal(id=null){
    this.editId=id;
    eid('modal-bu-title').textContent=id?'Modifica BU':'Nuova Business Unit';
    if(id){const u=await IDB.get('bu',id);if(u){eid('bu-name').value=u.name;eid('bu-icon').value=u.icon||'';eid('bu-rev').value=u.revenue;eid('bu-cost').value=u.costs;}}
    else{['bu-name','bu-icon','bu-rev','bu-cost'].forEach(f=>{const el=eid(f);if(el)el.value=f.includes('rev')||f.includes('cost')?'0':''});}
    openModal('bu');
  },
  async save(){
    const u={name:eid('bu-name').value,icon:eid('bu-icon').value,revenue:+eid('bu-rev').value||0,costs:+eid('bu-cost').value||0};
    if(this.editId)u.id=this.editId;
    await IDB.put('bu',u);toast('BU salvata!');closeModal('bu');this.editId=null;await this.render();
  },
  async del(id){if(!confirm('Eliminare?'))return;await IDB.del('bu',id).catch(e=>console.warn('[IDB.del]',e));toast('Eliminata','warning');await this.render();}
};

// ===== LEGAL =====
const Legal={
  render(){
    const el=eid('legal-templates');if(!el)return;
    const templates=[
      {name:'Termini e Condizioni',icon:'📋',type:'tos'},
      {name:'Privacy Policy GDPR',icon:'🔒',type:'gdpr'},
      {name:'Politica Resi',icon:'↩️',type:'returns'},
      {name:'NDA Riservatezza',icon:'🤝',type:'nda'},
      {name:'Contratto Collaborazione',icon:'📝',type:'collab'},
      {name:'Preventivo Professionale',icon:'💰',type:'quote'},
    ];
    el.innerHTML=templates.map(t=>`<div class="card" style="text-align:center;cursor:pointer" onclick="Legal.generate('${t.type}')">
      <div style="font-size:36px;margin-bottom:10px">${t.icon}</div>
      <strong>${t.name}</strong>
      <div class="mt-12"><button class="btn btn-primary btn-sm w-full">Genera</button></div>
    </div>`).join('');
  },
  async generate(type){
    const cfg=await IDB.get('settings','main')||{};
    const company=cfg.company||'Ingly Laser Studio';
    const docs={
      tos:`TERMINI E CONDIZIONI DI VENDITA\n${company}\n\nArt. 1 - OGGETTO\nI presenti Termini regolano la vendita di prodotti personalizzati realizzati con tecnologia laser cutting e incisione.\n\nArt. 2 - PRODOTTI PERSONALIZZATI\nI prodotti vengono realizzati su misura. Non sono previsti resi salvo difetti di produzione.\n\nArt. 3 - PAGAMENTI\nIl pagamento avviene al momento dell'ordine tramite bonifico o PayPal. Per ordini personalizzati superiori a €50 è richiesto un acconto del 50%.\n\nArt. 4 - CONSEGNE\nI tempi di consegna standard sono 7-10 giorni lavorativi. Per ordini urgenti contattarci preventivamente.\n\nArt. 5 - GARANZIA\nGarantiamo la conformità del prodotto al preventivo approvato. In caso di difetti contattarci entro 7 giorni dalla consegna.`,
      gdpr:`INFORMATIVA PRIVACY GDPR\n${company}\n\nAi sensi del Regolamento UE 2016/679 (GDPR), informiamo che i dati personali dei clienti vengono trattati per:\n- Gestione ordini e fatturazione\n- Comunicazioni commerciali (con consenso)\n- Adempimenti fiscali e legali\n\nI dati sono trattati in conformità al GDPR e non vengono ceduti a terzi salvo necessità operative. Il titolare del trattamento è ${company}. Per esercitare i diritti (accesso, rettifica, cancellazione) scrivere a ${cfg.email||'info@example.com'}.`,
      nda:`ACCORDO DI RISERVATEZZA (NDA)\n\nTra ${company} ("Divulgante") e il Cliente ("Ricevente").\n\nIl Ricevente si impegna a:\n- Non divulgare informazioni riservate ricevute\n- Utilizzarle esclusivamente per la finalità concordata\n- Proteggerle con lo stesso livello di riservatezza delle proprie informazioni confidenziali\n\nDurata: 3 anni dalla firma. Violazioni comportano risarcimento danni.\n\nFirma: _________________ Data: _________________`,
      returns:`POLITICA RESI E RIMBORSI\n${company}\n\nProdotti personalizzati: In conformità con l'art. 59 Codice del Consumo, i prodotti personalizzati sono esclusi dal diritto di recesso.\n\nDifetti di produzione: In caso di difetto documentato, il cliente deve contattarci entro 7 giorni. Provvederemo a ristampare il prodotto senza costi aggiuntivi.\n\nErrori del cliente: Non siamo responsabili per errori nel testo o nel design approvati dal cliente prima della produzione.`,
      collab:`CONTRATTO DI COLLABORAZIONE\n\nTra ${company} ("Committente") e il Collaboratore.\n\nOggetto: Prestazione di servizi di [specificare]\nDurata: Dal ___ al ___\nCompenso: €___ [lordi/netti] [a ore/a progetto]\nPagamento: Entro 30 giorni da fattura\n\nIl Collaboratore opererà come lavoratore autonomo. Non esiste rapporto di subordinazione. Riservatezza garantita sulle informazioni aziendali.\n\nFirme: _________________ Data: _________________`,
      quote:`PREVENTIVO PROFESSIONALE N. ${new Date().getFullYear()}-${Math.floor(Math.random()*1000)}\n\n${company}\nP.IVA: ${cfg.piva||''}\nData: ${new Date().toLocaleDateString('it-IT')}\n\nArticolo: [Da compilare]\nQuantità: [Da compilare]\nDescrizione: [Da compilare]\n\nImporto netto: €___\nIVA 22%: €___\n-----------\nTOTALE: €___\n\nValidità preventivo: 30 giorni\nCondizioni: 50% alla conferma, saldo alla consegna`,
    };
    const doc=docs[type];if(!doc)return;
    const outEl=eid('legal-doc-output');
    if(outEl)outEl.innerHTML=`<div class="card mt-16"><div class="flex-between mb-12"><span class="card-title" style="margin:0">Documento Generato</span><div style="display:flex;gap:8px"><button class="btn btn-sm btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('legal-text').value).then(()=>toast('Copiato!'))"><i class="fas fa-copy"></i> Copia</button><button class="btn btn-sm btn-secondary" onclick="Legal.downloadDoc()"><i class="fas fa-download"></i> Scarica TXT</button></div></div><textarea id="legal-text" class="form-control" rows="20" style="font-family:monospace;font-size:12px">${doc}</textarea></div>`;
  },
  downloadDoc(){
    const text=eid('legal-text')?.value;if(!text)return;
    const blob=new Blob([text],{type:'text/plain'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='documento_legale.txt';a.click();
  }
};

// ===== PROJECTS =====
const Projects={
  editId:null,
  activeTab:'all',
  _photo:null,
  clearPhoto(){
    this._photo=null;
    const prev=eid('proj-photo-preview');
    if(prev)prev.innerHTML='📁';
  },
  PRIORITY_COLOR:{Alta:'var(--red)',Media:'var(--orange)',Bassa:'var(--blue)'},
  STATUS_LABEL:{todo:'📋 In Attesa',inprogress:'⚡ Attivo',done:'✅ Completato',onhold:'⏸️ In Pausa'},
  STATUS_COLOR:{todo:'var(--orange)',inprogress:'var(--blue)',done:'var(--green)',onhold:'var(--text-muted)'},
  async render(){await this.setTab(this.activeTab,null);},
  async setTab(t,btn){
    this.activeTab=t;
    document.querySelectorAll('#view-projects .tab-btn').forEach(b=>b.classList.remove('active'));
    if(btn)btn.classList.add('active');
    else{const tabs=document.querySelectorAll('#view-projects .tab-btn');const idx=['all','inprogress','todo','done','onhold','kanban'].indexOf(t);if(tabs[idx])tabs[idx].classList.add('active');}
    const projects=await IDB.getAll('projects');
    // KPIs
    const kpis=eid('projects-kpis');
    const totalBudget=projects.reduce((a,p)=>a+(+p.budget||0),0);
    const earned=projects.filter(p=>p.status==='done').reduce((a,p)=>a+(+p.budget||0),0);
    if(kpis)kpis.innerHTML=[
      {l:'⚡ Attivi',v:projects.filter(p=>p.status==='inprogress').length,c:'var(--blue)',i:'fa-bolt'},
      {l:'✅ Completati',v:projects.filter(p=>p.status==='done').length,c:'var(--green)',i:'fa-check-circle'},
      {l:'📋 In Attesa',v:projects.filter(p=>p.status==='todo').length,c:'var(--orange)',i:'fa-clock'},
      {l:'💰 Budget Totale',v:fmtCur(totalBudget),c:'var(--primary)',i:'fa-euro-sign'},
      {l:'✅ Incassato',v:fmtCur(earned),c:'var(--green)',i:'fa-wallet'},
      {l:'⏳ In Pipeline',v:fmtCur(totalBudget-earned),c:'var(--text-muted)',i:'fa-hourglass-half'},
      {l:'📅 In Scadenza',v:projects.filter(p=>p.deadline&&p.deadline<=new Date(Date.now()+7*86400000).toISOString().split('T')[0]&&p.status!=='done').length,c:'var(--red)',i:'fa-exclamation-triangle'},
      {l:'📁 Totale',v:projects.length,c:'var(--text-muted)',i:'fa-folder'},
    ].map(k=>`<div class="kpi-card"><i class="fas ${k.i} kpi-icon" style="color:${k.c}"></i><div class="kpi-value">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');
    const el=eid('projects-content');if(!el)return;
    if(t==='kanban'){this.renderKanban(projects,el);return;}
    let filtered=projects;
    if(t!=='all')filtered=projects.filter(p=>p.status===t);
    if(!filtered.length){el.innerHTML=`<div class="card" style="text-align:center;padding:40px"><i class="fas fa-folder-open" style="font-size:48px;color:var(--text-dim);margin-bottom:16px;display:block"></i><div style="color:var(--text-muted)">Nessun progetto in questa categoria</div><button class="btn btn-primary btn-sm mt-16" onclick="Projects.openModal()"><i class="fas fa-plus"></i> Nuovo Progetto</button></div>`;return;}
    // Sort by deadline then priority
    filtered.sort((a,b)=>{
      if(a.deadline&&b.deadline)return a.deadline.localeCompare(b.deadline);
      if(a.deadline)return -1;if(b.deadline)return 1;
      const pp={Alta:0,Media:1,Bassa:2};return (pp[a.priority]||1)-(pp[b.priority]||1);
    });
    el.innerHTML=`<div style="display:flex;flex-direction:column;gap:12px">${filtered.map(p=>{
      const progress=p.progress||0;
      const overdue=p.deadline&&p.deadline<today()&&p.status!=='done';
      const dueSoon=p.deadline&&p.deadline<=new Date(Date.now()+7*86400000).toISOString().split('T')[0]&&p.status!=='done'&&!overdue;
      return`<div class="card" style="border-left:4px solid ${this.STATUS_COLOR[p.status]||'var(--border)'}">
        <div style="display:flex;align-items:flex-start;gap:16px">
          ${p.photo?`<div style="width:52px;height:52px;border-radius:var(--radius-sm);overflow:hidden;flex-shrink:0"><img src="${p.photo}" style="width:100%;height:100%;object-fit:cover"></div>`:'' }
          <div style="flex:1">
            <div class="flex-between mb-8">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <strong style="font-size:15px">${p.name}</strong>
                <span class="badge" style="background:${this.STATUS_COLOR[p.status]}22;color:${this.STATUS_COLOR[p.status]}">${this.STATUS_LABEL[p.status]||p.status}</span>
                <span class="badge" style="background:${this.PRIORITY_COLOR[p.priority]||'var(--primary)'}22;color:${this.PRIORITY_COLOR[p.priority]||'var(--primary)'}">P: ${p.priority||'—'}</span>
                ${overdue?'<span class="badge" style="background:#ef444422;color:var(--red)">⚠️ SCADUTO</span>':''}
                ${dueSoon?'<span class="badge" style="background:#f9731622;color:var(--orange)">⏰ In scadenza</span>':''}
              </div>
              <strong style="color:var(--primary);font-size:16px;white-space:nowrap">${fmtCur(p.budget)}</strong>
            </div>
            ${p.desc?`<p style="font-size:13px;color:var(--text-muted);margin-bottom:10px">${p.desc}</p>`:''}
            <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--text-muted);margin-bottom:10px">
              ${p.clientName?`<span><i class="fas fa-user" style="margin-right:4px"></i>${p.clientName}</span>`:''}
              ${p.deadline?`<span style="color:${overdue?'var(--red)':dueSoon?'var(--orange)':'var(--text-muted)'}"><i class="fas fa-calendar" style="margin-right:4px"></i>Scadenza: ${fmtDate(p.deadline)}</span>`:''}
              ${p.category?`<span><i class="fas fa-tag" style="margin-right:4px"></i>${p.category}</span>`:''}
            </div>
            <!-- Progress bar -->
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <div style="flex:1;height:6px;background:var(--bg-card2);border-radius:3px;overflow:hidden">
                <div style="height:6px;width:${progress}%;background:${progress>=100?'var(--green)':progress>=50?'var(--primary)':'var(--orange)'};transition:width .3s"></div>
              </div>
              <span style="font-size:11px;font-weight:700;color:${progress>=100?'var(--green)':progress>=50?'var(--primary)':'var(--orange)'};white-space:nowrap">${progress}%</span>
              <input type="range" min="0" max="100" value="${progress}" style="width:80px;accent-color:var(--primary)" onchange="Projects.setProgress(${p.id},+this.value)">
            </div>
            <!-- Notes / milestones preview -->
            ${p.milestones&&p.milestones.length?`<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">Milestone: ${p.milestones.map(m=>`<span style="margin-right:8px">${m.done?'✅':'○'} ${m.text}</span>`).join('')}</div>`:''}
          </div>
        </div>
        <div class="flex-between" style="margin-top:4px">
          <select class="form-control" style="max-width:180px;padding:4px 8px;font-size:12px" onchange="Projects.setStatus(${p.id},this.value)">
            <option value="todo" ${p.status==='todo'?'selected':''}>📋 In Attesa</option>
            <option value="inprogress" ${p.status==='inprogress'?'selected':''}>⚡ Attivo</option>
            <option value="onhold" ${p.status==='onhold'?'selected':''}>⏸️ In Pausa</option>
            <option value="done" ${p.status==='done'?'selected':''}>✅ Completato</option>
          </select>
          <div class="act-group">
            <button class="act-btn act-edit" onclick="Projects.openModal(${p.id})"><i class="fas fa-edit"></i> Modifica</button>
            <button class="act-btn act-del" onclick="Projects.del(${p.id})"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>`;
    }).join('')}</div>`;
  },
  renderKanban(projects,el){
    const cols=[
      {id:'todo',label:'📋 In Attesa',color:'var(--orange)'},
      {id:'inprogress',label:'⚡ Attivi',color:'var(--blue)'},
      {id:'done',label:'✅ Completati',color:'var(--green)'},
      {id:'onhold',label:'⏸️ In Pausa',color:'var(--text-muted)'},
    ];
    el.innerHTML=`<div class="kanban">${cols.map(col=>{
      const items=projects.filter(p=>p.status===col.id);
      return`<div class="kanban-col">
        <div class="kanban-col-header"><span style="color:${col.color}">${col.label}</span><span class="badge badge-gray">${items.length}</span></div>
        ${items.length===0?`<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:12px"><i class="fas fa-folder-open" style="font-size:20px;display:block;margin-bottom:6px;opacity:.3"></i>Vuoto</div>`:''}
        ${items.map(p=>`<div class="kanban-card">
          <div class="flex-between mb-8">
            <div class="kanban-card-title" style="flex:1">${p.name}</div>
            <span class="badge" style="font-size:9px;background:${this.PRIORITY_COLOR[p.priority]||'var(--primary)'}22;color:${this.PRIORITY_COLOR[p.priority]||'var(--primary)'}">${p.priority||'—'}</span>
          </div>
          ${p.desc?`<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${p.desc.substring(0,80)}${p.desc.length>80?'...':''}</div>`:''}
          <div class="kanban-card-meta mb-8">
            <span><i class="fas fa-user" style="margin-right:3px;opacity:.5"></i>${p.clientName||'Interno'}</span>
            <strong style="color:var(--primary)">${fmtCur(p.budget)}</strong>
          </div>
          <div style="height:4px;background:var(--bg-card2);border-radius:2px;margin-bottom:6px;overflow:hidden">
            <div style="height:4px;width:${p.progress||0}%;background:var(--primary)"></div>
          </div>
          ${p.deadline?`<div style="font-size:11px;color:${p.deadline<today()&&col.id!=='done'?'var(--red)':'var(--text-muted)'}"><i class="fas fa-calendar" style="margin-right:3px"></i>${fmtDate(p.deadline)}</div>`:''}
          <div class="act-group mt-8">
            <button class="act-btn act-edit" style="flex:1;justify-content:center" onclick="Projects.openModal(${p.id})"><i class="fas fa-edit"></i></button>
            <button class="act-btn act-del" onclick="Projects.del(${p.id})"><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('')}
      </div>`;
    }).join('')}</div>`;
  },
  async openModal(id=null){
    this.editId=id;
    const isEdit=!!id;
    let p=null;
    if(id)p=await IDB.get('projects',id);
    await App.populateClientSelects();
    // Build dynamic modal
    const existing=eid('modal-project');
    if(existing)existing.classList.remove('open');
    const milestones=p?.milestones||[];
    eid('proj-name').value=p?.name||'';
    eid('proj-client').value=p?.clientId||'';
    eid('proj-budget').value=p?.budget||0;
    eid('proj-deadline').value=p?.deadline||'';
    eid('proj-priority').value=p?.priority||'Media';
    eid('proj-desc').value=p?.desc||'';
    const catEl=eid('proj-cat');if(catEl)catEl.value=p?.category||'';
    const progEl=eid('proj-progress');if(progEl)progEl.value=p?.progress||0;
    const statusEl=eid('proj-status');if(statusEl)statusEl.value=p?.status||'todo';
    // Milestones
    const mEl=eid('proj-milestones');
    if(mEl){mEl.innerHTML=milestones.map((m,i)=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <input type="checkbox" ${m.done?'checked':''} onchange="Projects.toggleMilestone(${i},this.checked)" style="accent-color:var(--primary)">
      <input class="form-control" value="${m.text}" style="flex:1;padding:4px 8px;font-size:12px" onchange="Projects.updateMilestone(${i},this.value)">
      <button onclick="Projects.removeMilestone(${i})" style="background:none;border:none;color:var(--red);cursor:pointer;padding:2px 5px">✕</button>
    </div>`).join('');}
    eid('modal-project-title').textContent=isEdit?'Modifica Progetto':'Nuovo Progetto';
    // Load photo preview
    this._photo=null;
    const photoPrev=eid('proj-photo-preview');
    if(photoPrev){
      if(p?.photo){this._photo=p.photo;photoPrev.innerHTML=`<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:4px">`;}
      else photoPrev.innerHTML='📁';
    }
    openModal('project');
  },
  _milestones:[],
  toggleMilestone(i,done){this._milestones[i].done=done;},
  updateMilestone(i,text){if(this._milestones[i])this._milestones[i].text=text;},
  removeMilestone(i){this._milestones.splice(i,1);const el=eid('proj-milestones');if(el){const items=el.querySelectorAll('div');if(items[i])items[i].remove();}},
  addMilestone(){
    const text=prompt('Testo milestone:');if(!text)return;
    this._milestones.push({text,done:false});
    const el=eid('proj-milestones');if(!el)return;
    const i=this._milestones.length-1;
    el.insertAdjacentHTML('beforeend',`<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <input type="checkbox" onchange="Projects.toggleMilestone(${i},this.checked)" style="accent-color:var(--primary)">
      <input class="form-control" value="${text}" style="flex:1;padding:4px 8px;font-size:12px" onchange="Projects.updateMilestone(${i},this.value)">
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--red);cursor:pointer;padding:2px 5px">✕</button>
    </div>`);
  },
  async save(){
    const name=eid('proj-name').value.trim();
    if(!name){toast('Nome progetto obbligatorio','warning');return;}
    const clientEl=eid('proj-client');
    const clientId=clientEl?.value?+clientEl.value:null;
    const clientName=clientId?clientEl.options[clientEl.selectedIndex].text:'Interno';
    // Collect milestones from DOM
    const mEl=eid('proj-milestones');
    const milestoneDivs=mEl?mEl.querySelectorAll('div'):[];
    const milestones=[...milestoneDivs].map((div,i)=>{
      const inp=div.querySelector('input[type=text],input:not([type])');
      const chk=div.querySelector('input[type=checkbox]');
      return{text:inp?.value||'',done:chk?.checked||false};
    }).filter(m=>m.text);
    const p={
      name,clientId,clientName,
      budget:+eid('proj-budget').value||0,
      deadline:eid('proj-deadline').value,
      priority:eid('proj-priority').value,
      status:eid('proj-status')?.value||'todo',
      category:eid('proj-cat')?.value||'',
      progress:+eid('proj-progress')?.value||0,
      desc:eid('proj-desc').value,
      milestones
    };
    if(this._photo)p.photo=this._photo;
    else if(this.editId){const ex=await IDB.get('projects',this.editId);if(ex?.photo)p.photo=ex.photo;}
    if(this.editId)p.id=this.editId;
    const id=await IDB.put('projects',p);
    await logAction('project',id,this.editId?'updated':'created');
    toast(this.editId?'Progetto aggiornato!':'Progetto salvato!');
    closeModal('project');this.editId=null;await this.render();
  },
  async setStatus(id,status){
    const p=await IDB.get('projects',id);if(!p)return;
    p.status=status;if(status==='done')p.progress=100;
    await IDB.put('projects',p);toast('Stato aggiornato','info');await this.render();
  },
  async setProgress(id,val){
    const p=await IDB.get('projects',id);if(!p)return;
    p.progress=val;if(val>=100)p.status='done';
    await IDB.put('projects',p);await this.render();
  },
  async del(id){
    if(!confirm('Eliminare questo progetto definitivamente?'))return;
    await IDB.del('projects',id).catch(e=>console.warn('[IDB.del]',e));toast('Eliminato','warning');await this.render();
  }
};

// ===== BACKUP =====
// ── Backup sanitizer — removes large base64, excluded stores ──────────
function _sanitizeForBackup(data){
  const SKIP=['backups','image_lib','scanner_history'];
  const result={};
  for(const [store,records] of Object.entries(data)){
    if(SKIP.includes(store)) continue;
    if(!Array.isArray(records)){ result[store]=records; continue; }
    result[store]=records.map(rec=>{
      if(!rec||typeof rec!=='object') return rec;
      const clean={...rec};
      for(const [k,v] of Object.entries(clean)){
        if(typeof v==='string'&&v.length>60000&&v.startsWith('data:'))
          clean[k]='[image-stripped-from-backup]';
        // Also strip very large text blobs
        if(typeof v==='string'&&v.length>200000)
          clean[k]=v.slice(0,200000)+'[truncated]';
      }
      return clean;
    });
  }
  return result;
}
const Backup={
  _timer:null,

  // ── Auto-daily backup on app open ──────────────────────────────
  async autoBackup(){
    try {
      const lastKey = 'ingly_last_autobackup';
      const last = localStorage.getItem(lastKey);
      const today = new Date().toISOString().split('T')[0];
      if (last === today) return; // already backed up today
      // Wait 5s after init so data is loaded
      setTimeout(async () => {
        try {
          const allData = {};
          const stores = ['sales','clients','orders','pipeline','equipment','catalog','cashflow','quotes','inventory'];
          for (const s of stores) {
            try { allData[s] = await IDB.getAll(s); } catch(e) {}
          }
          const totalRecords = Object.values(allData).reduce((a,v)=>a+(v.length||0),0);
          if (totalRecords < 2) return; // no real data yet
          // Don't create full JSON string — just count approximate size
          const approxSize = totalRecords * 800; // ~800 bytes avg per record
          const rec = { id: Date.now(), date: today, size: approxSize, type: 'auto', records: totalRecords };
          await IDB.put('backups', rec).catch(()=>{});
          localStorage.setItem(lastKey, today);
          // Keep only last 7 auto backups
          const all = await IDB.getAll('backups').catch(()=>[]);
          const autos = all.filter(b=>b.type==='auto').sort((a,b)=>b.date?.localeCompare(a.date||''));
          for (const old of autos.slice(7)) await IDB.del('backups', old.id);
          INGLY_DEV && console.log('[AutoBackup] ✅', today, totalRecords+'rec');
        } catch(e) { console.warn('[AutoBackup]', e.message); }
      }, 5000);
    } catch(e) {}
  },

  async render(){
    const el=eid('backup-list');if(!el)return;
    const list=await IDB.getAll('backups');
    // Update stats bar
    try{
      const allData=await IDB.exportAll();
      const totalRecords=Object.values(allData).reduce((a,arr)=>a+(Array.isArray(arr)?arr.length:0),0);
      const lastBackup=list.length?new Date(Math.max(...list.map(b=>b.ts||0))):null;
      const lbEl=eid('last-backup-time'),bcEl=eid('backup-count-stat'),brEl=eid('backup-records-stat');
      if(lbEl)lbEl.textContent=lastBackup?lastBackup.toLocaleString('it-IT'):'Mai';
      // Health indicator
      const daysEl=eid('last-backup-days');
      const alertEl=eid('backup-health-alert');
      const alertTitle=eid('backup-alert-title');
      const alertSub=eid('backup-alert-sub');
      const healthIco=eid('backup-health-ico');
      if(lastBackup){
        const daysSince=Math.floor((Date.now()-lastBackup.getTime())/(1000*60*60*24));
        if(daysEl) daysEl.textContent=daysSince===0?'📗 Oggi':daysSince===1?'📗 Ieri':`📕 ${daysSince} giorni fa`;
        const urgent=daysSince>=7, warn=daysSince>=3;
        if(alertEl){ alertEl.style.display=urgent||warn?'flex':'none'; }
        if(urgent&&alertTitle) alertTitle.textContent=`⚠️ Backup non aggiornato da ${daysSince} giorni`;
        if(urgent&&alertSub) alertSub.textContent='I tuoi dati non sono stati protetti di recente — fai subito un backup!';
        if(warn&&!urgent&&alertTitle) alertTitle.textContent=`⏰ Ultimo backup ${daysSince} giorni fa`;
        if(healthIco) healthIco.innerHTML=urgent?'🔴':warn?'🟡':'✅';
      } else {
        if(daysEl) daysEl.textContent='';
        if(alertEl){ alertEl.style.display='flex'; }
        if(alertTitle) alertTitle.textContent='Nessun backup eseguito!';
        if(alertSub) alertSub.textContent='Non hai ancora eseguito un backup — i tuoi dati sono a rischio.';
        if(healthIco) healthIco.innerHTML='🔴';
      }
      if(bcEl)bcEl.textContent=list.length+' backup';
      if(brEl)brEl.textContent=totalRecords.toLocaleString()+' record';
    }catch{}
    if(!list.length){
      el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--text-dim)">
        <i class="fas fa-database" style="font-size:32px;opacity:.2;display:block;margin-bottom:12px"></i>
        <div>Nessun backup ancora.</div><div style="font-size:12px;margin-top:6px">Clicca "Backup Ora" per creare il primo.</div>
      </div>`;
      return;
    }
    el.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="border-bottom:1px solid var(--border)">
        <th style="padding:10px;text-align:left;font-size:11px;color:var(--text-muted)">TIPO</th>
        <th style="padding:10px;text-align:left;font-size:11px;color:var(--text-muted)">DATA</th>
        <th style="padding:10px;text-align:right;font-size:11px;color:var(--text-muted)">DIMENSIONE</th>
        <th style="padding:10px;text-align:right;font-size:11px;color:var(--text-muted)">AZIONI</th>
      </tr></thead>
      <tbody>${list.sort((a,b)=>b.ts-a.ts).slice(0,20).map(b=>`
        <tr style="border-bottom:1px solid var(--border);transition:.15s" onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background=''">
          <td style="padding:12px 10px">
            <span style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;background:${b.type==='auto'?'var(--bg-card2)':'#3b82f620'};color:${b.type==='auto'?'var(--text-muted)':'var(--blue)'}">
              ${b.type==='auto'?'🔄 Auto':'💾 Manuale'}
            </span>
          </td>
          <td style="padding:12px 10px;color:var(--text)">${new Date(b.ts).toLocaleString('it-IT')}</td>
          <td style="padding:12px 10px;text-align:right;color:var(--text-muted);font-size:12px">${(b.size/1024).toFixed(1)} KB</td>
          <td style="padding:12px 10px;text-align:right">
            <div style="display:flex;gap:6px;justify-content:flex-end">
              <button onclick="Backup.downloadBackup(${b.id})" title="Scarica questo backup" style="padding:4px 10px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text-muted);border-radius:6px;cursor:pointer;font-size:11px"><i class="fas fa-download"></i></button>
              <button onclick="Backup.restore(${b.id})" style="padding:4px 10px;background:#10b98120;color:#4ade80;border:1px solid #10b98140;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700"><i class="fas fa-undo"></i> Ripristina</button>
              <button onclick="Backup.delBackup(${b.id})" style="padding:4px 10px;background:#ef444420;color:#f87171;border:1px solid #ef444440;border-radius:6px;cursor:pointer;font-size:11px"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  },
  async downloadBackup(id){
    const bk = await IDB.get('backups', id);
    if(!bk) return;
    if(bk.data) {
      // Legacy backup with embedded data
      const blob = new Blob([bk.data], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ingly_backup_${new Date(bk.ts||Date.now()).toISOString().slice(0,10)}_${bk.type||'backup'}.json`;
      a.click();
      toast('📥 Backup scaricato', 'success');
    } else {
      // New-style backup — re-export fresh data on demand
      toast('⏳ Generazione backup...', 'info');
      await this.download();
    }
  },
  async createNow(type='manual'){
    const data=await IDB.exportAll();
    const _safeData = _sanitizeForBackup(data);
    const json=JSON.stringify(_safeData);
    // Store only metadata in IDB — NOT the full json (prevents exponential growth)
    const bk={ts:Date.now(),date:new Date().toISOString(),type,size:json.length,records:Object.values(_safeData).reduce((a,v)=>a+(Array.isArray(v)?v.length:0),0)};
    await IDB.put('backups',bk);
    await logAction('backup',bk.ts,'created',{type,size:bk.size});
    const lastEl=eid('last-backup-time');
    if(lastEl)lastEl.textContent=new Date(bk.ts).toLocaleString('it-IT');
    if(type==='manual'){toast('Backup creato!');if(App.currentSection==='backup')await this.render();
      if(typeof AutoBackup!=='undefined') AutoBackup.markFullBackup();}
    // Mantieni solo ultimi 30
    const all=await IDB.getAll('backups');
    const sorted=all.sort((a,b)=>b.ts-a.ts);
    for(const old of sorted.slice(30))await IDB.del('backups',old.id||old.ts).catch(e=>console.warn('[IDB.del]',e));
    return bk;
  },
  async download(){
    const btn = document.getElementById('backup-download-btn');
    if(btn){ btn.disabled=true; btn.textContent='⏳ Preparazione backup...'; }
    try {
      const data = await IDB.exportAll();
      const clean = _sanitizeForBackup(data);
      // Use streaming Blob construction to avoid string length limits
      const jsonParts = [];
      jsonParts.push('{"_ingly_backup":true,"_ts":"'+new Date().toISOString()+'","_v":"11",');
      const storeKeys = Object.keys(clean);
      for(let i=0;i<storeKeys.length;i++){
        const k=storeKeys[i];
        const val=clean[k];
        jsonParts.push('"'+k+'":'+JSON.stringify(val)+(i<storeKeys.length-1?',':''));
        // Yield to event loop every 5 stores
        if(i%5===0) await new Promise(r=>setTimeout(r,0));
      }
      jsonParts.push('}');
      const blob = new Blob(jsonParts, {type:'application/json;charset=utf-8'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ingly_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(a.href), 10000);
      const sizeKB = (blob.size/1024).toFixed(0);
      const records = Object.values(clean).reduce((a,v)=>a+(Array.isArray(v)?v.length:0),0);
      toast(`✅ Backup scaricato — ${sizeKB}KB · ${records} record`,'success');
    } catch(e) {
      console.error('[Backup download]', e);
      if(e.message.includes('string length')||e.message.includes('allocation')){
        toast('⚠️ Dati troppo grandi — avvio backup parziale...','warning');
        await this._downloadPartial();
      } else {
        toast('❌ Errore backup: '+e.message,'error');
      }
    } finally {
      if(btn){ btn.disabled=false; btn.textContent='⬇️ Scarica Backup'; }
    }
  },

  // Fallback: download only essential stores if full backup fails
  async _downloadPartial(){
    try {
      const ESSENTIAL = ['orders','sales','clients','quotes','catalog','materials'];
      const data={};
      for(const s of ESSENTIAL){
        try{ data[s]=await IDB.getAll(s); }catch{}
      }
      const clean = _sanitizeForBackup(data);
      const blob = new Blob([JSON.stringify({_partial:true,_ts:new Date().toISOString(),...clean})],{type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ingly_backup_partial_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      toast('📥 Backup parziale scaricato (ordini, vendite, clienti, catalogo)','info');
    } catch(e){ toast('❌ Impossibile creare backup: '+e.message,'error'); }
  },
  importFile(){eid('import-file').click();},
  async onImport(input){
    const file=input.files[0];if(!file)return;
    const progEl=eid('import-progress'), progMsg=eid('import-progress-msg');
    const showProg=(msg)=>{if(progEl){progEl.style.display='block';if(progMsg)progMsg.textContent=msg;}};
    const hideProg=()=>{if(progEl)progEl.style.display='none';};
    try{
      showProg('Lettura file...');
      const text=await file.text();
      const raw=JSON.parse(text);
      const isFullBackup=raw._v==='INGLY_FULL'||(raw.data&&typeof raw.data==='object'&&!Array.isArray(raw.data));
      const dataMap=isFullBackup?raw.data:raw;
      const tsLabel=raw._ts?new Date(raw._ts).toLocaleString('it-IT'):'';
      // Salta gli store effimeri/cache anche in import (backup vecchi li contengono):
      // si rigenerano da soli e importarne decine di migliaia rallenta inutilmente.
      const EPHEMERAL=['kpi_snap','kpi_cache','notifications','ai_log','scanner_history'];
      const stores=Object.keys(dataMap||{}).filter(k=>Array.isArray(dataMap[k])&&dataMap[k].length&&!EPHEMERAL.includes(k));
      const totalRecords=stores.reduce((a,s)=>a+dataMap[s].length,0);
      const imgStores=isFullBackup?Object.keys(raw.images||{}).length:0;
      const msg=`RIPRISTINO BACKUP\n\n`+
        (tsLabel?`📅 Data backup: ${tsLabel}\n`:'')+
        `📦 ${totalRecords.toLocaleString()} record in ${stores.length} categorie\n`+
        (imgStores?`🖼 Include immagini\n`:'')+
        `\nScegli modalità:\n`+
        `✅ OK = SOSTITUZIONE COMPLETA (cancella i dati attuali e importa il backup)\n`+
        `❌ Annulla = annulla operazione`;
      hideProg();
      if(!confirm(msg)){input.value='';return;}
      // CLEAN RESTORE: clear each store before import to prevent ghost data
      const doClean = true; // Always clean restore - user confirmed above
      await IDB.ensureOpen();
      let count=0,errors=0,s_done=0;
      if(doClean){
        showProg('Pulizia dati precedenti...');
        const skipClear=['backups','settings','versions','history','ai_log'];
        for(const s of stores){
          if(!skipClear.includes(s)){
            try{ await IDB.clearStore(s); }catch(e){ console.warn('[Import] clearStore failed:',s,e); }
          }
        }
      }
      // Use putBulk for speed
      for(const s of stores){
        s_done++;
        showProg(`Importando ${s} (${s_done}/${stores.length})...`);
        const rows=dataMap[s];
        try{
          const n=await IDB.putBulk(s,rows);
          count+=n||rows.length;
        }catch(e){
          // fallback to one-by-one
          for(const item of rows){try{await IDB.safePut(s,item);count++;}catch{errors++;}}
        }
      }
      // Restore images
      if(isFullBackup&&raw.images){
        showProg('Ripristino immagini...');
        for(const[store,byId]of Object.entries(raw.images||{})){
          for(const[id,fields]of Object.entries(byId||{})){
            try{
              const existing=await IDB.get(store,+id||id).catch(()=>null);
              if(existing){Object.assign(existing,fields);await IDB.safePut(store,existing);count++;}
            }catch{}
          }
        }
      }
      hideProg();
      input.value='';
      toast(`✅ Import: ${count.toLocaleString()} record${errors?', '+errors+' errori':''}. Ricarico...`);
      setTimeout(()=>location.reload(),1800);
    }catch(e){
      hideProg();
      input.value='';
      toast('❌ Errore importazione: '+e.message,'error');
      console.error('[Backup.onImport]',e);
    }
  },
  async restore(id){
    if(!confirm('Ripristinare questo backup?\n\nATTENZIONE: i dati attuali verranno CANCELLATI e sostituiti con il backup.\n\nProcedere?'))return;
    const bk=await IDB.get('backups',id);if(!bk)return;
    try{
      const raw=JSON.parse(bk.data);
      const dataMap = (raw._v==='INGLY_FULL'||raw.data) ? raw.data : raw;
      await IDB.ensureOpen();
      let count=0;
      const EPHEMERAL=['kpi_snap','kpi_cache','notifications','ai_log','scanner_history'];
      const skipClear=['backups','settings','versions','history','ai_log'];
      // CLEAN RESTORE: clear stores first to prevent ghost records
      for(const [s,rows] of Object.entries(dataMap||{})){
        if(!Array.isArray(rows)||skipClear.includes(s)||EPHEMERAL.includes(s)) continue;
        try{ await IDB.clearStore(s); }catch{}
      }
      for(const [s,rows] of Object.entries(dataMap||{})){
        if(!Array.isArray(rows)||EPHEMERAL.includes(s)) continue;
        for(const item of rows){ try{await IDB.safePut(s,item);count++;}catch{} }
      }
      // Restore images if full backup
      if(raw._v==='INGLY_FULL'&&raw.images){
        for(const[store,byId]of Object.entries(raw.images||{})){
          for(const[id,fields]of Object.entries(byId||{})){
            try{
              const existing=await IDB.get(store,+id||id).catch(()=>null);
              if(existing){Object.assign(existing,fields);await IDB.safePut(store,existing);count++;}
            }catch{}
          }
        }
      }
      // v4.0: invalidate ALL AppStore caches after restore
      Object.keys(AppStore._cache||{}).forEach(s=>AppStore.invalidate(s));
      toast(`✅ Ripristino completato (${count} record)! Ricaricamento...`);
      setTimeout(()=>location.reload(),1500);
    }catch(e){toast('Errore ripristino: '+e.message,'error');console.error(e);}
  },
  async delBackup(id){
    if(!confirm('Eliminare questo backup?'))return;
    await IDB.del('backups',id).catch(e=>console.warn('[IDB.del]',e));toast('Backup eliminato','warning');await this.render();
  },

  async factoryReset(){
    if(!confirm('⚠️ CANCELLA TUTTI I DATI\n\nQuesta operazione cancellerà PERMANENTEMENTE:\n- Tutti i clienti, ordini, prodotti, immagini\n- Tutti i preventivi, vendite, idee\n- Tutti i backup salvati\n\nOperazione IRREVERSIBILE.\n\nFai un backup prima!\n\nProcedere con la cancellazione totale?')) return;
    if(!confirm('Sei sicuro al 100%?\n\nTutti i dati verranno eliminati definitivamente.')) return;
    try {
      toast('🗑️ Cancellazione in corso...', 'warning');
      await IDB.ensureOpen();
      const stores = ['sales','orders','clients','quotes','cashflow','materials','suppliers','supplier_orders',
        'ideas','products','items','catalog','backups','settings','paints','image_lib','social_posts',
        'workflow_steps','order_events','quote_templates','ai_log','action_log'];
      for (const s of stores) {
        try { await IDB.clearStore(s); } catch(e) { console.warn('clearStore failed:', s, e); }
      }
      // Clear localStorage keys
      const lsKeys = Object.keys(localStorage).filter(k => k.startsWith('ingly'));
      lsKeys.forEach(k => localStorage.removeItem(k));
      toast('✅ Tutti i dati cancellati. Ricaricamento...', 'success');
      setTimeout(() => location.reload(), 1500);
    } catch(e) {
      toast('❌ Errore: ' + e.message, 'error');
      console.error('[factoryReset]', e);
    }
  },
  scheduleAuto(){
    if(this._timer)clearInterval(this._timer);
    this._timer=setInterval(()=>this.createNow('auto'),24*3600*1000);
  },
  async exportCSV(store){
    const data=await IDB.getAll(store);
    if(!data.length){toast('Nessun dato da esportare','warning');return;}
    const keys=Object.keys(data[0]).filter(k=>!k.startsWith('_'));
    const csv=[keys.join(','),...data.map(row=>keys.map(k=>`"${(row[k]||'').toString().replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ingly_${store}_${today()}.csv`;a.click();
    toast(`CSV ${store} scaricato!`);
  },

  async downloadWithImages(){
    toast('⏳ Raccolta dati e immagini...','success');
    const stores = ['catalog','image_lib','items','materials','products','inventory','ideas','clients','quotes','suppliers','paints','orders','social_posts'];
    const allData = await IDB.exportAll().catch(()=>({}));
    // Escludi gli store effimeri/cache dal backup: gonfiano il file e si
    // rigenerano da soli (KPI snapshot, cache, log notifiche/AI, scanner).
    const EPHEMERAL = ['kpi_snap','kpi_cache','notifications','ai_log','scanner_history'];
    EPHEMERAL.forEach(s=>{ delete allData[s]; });
    const images  = {};
    const imgFields = ['image','img','photo','thumbnail','imageData','base64','photoData'];

    for(const store of stores){
      const records = await IDB.getAll(store).catch(()=>[]);
      records.forEach(rec=>{
        if(!rec||!rec.id) return;
        imgFields.forEach(f=>{
          if(rec[f]&&typeof rec[f]==='string'&&rec[f].length>100){
            if(!images[store]) images[store]={};
            images[store][rec.id] = images[store][rec.id]||{};
            images[store][rec.id][f] = rec[f];
          }
        });
      });
    }
    const nImg = Object.values(images).reduce((a,s)=>a+Object.keys(s).length,0);
    const payload = { _ts: new Date().toISOString(), _v:'INGLY_FULL', data: allData, images };
    const blob = new Blob([JSON.stringify(payload)],{type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ingly_FULL_backup_${today()}_${nImg}img.json`;
    a.click();
    toast(`✅ Backup COMPLETO scaricato — ${nImg} immagini incluse`,'success');
  },

  async restoreWithImages(input){
    const file = input?.files?.[0]; if(!file) return;
    try{
      const text = await file.text();
      const payload = JSON.parse(text);
      const isFullBackup = payload._v === 'INGLY_FULL';
      const dataObj = (payload.data && typeof payload.data === 'object') ? payload.data : payload;
      const stores = Object.keys(dataObj).filter(k=>Array.isArray(dataObj[k])&&dataObj[k].length);
      const total = stores.reduce((a,s)=>a+dataObj[s].length,0);
      const msg = `Ripristinare ${isFullBackup?'backup COMPLETO':'backup'}?\n\n`+
        (payload._ts?`📅 ${new Date(payload._ts).toLocaleString('it-IT')}\n`:'')+
        `📦 ${total.toLocaleString()} record · ${stores.length} store\n\n`+
        '⚠️ I dati attuali verranno sovrascritti. Considera di fare un backup prima.';
      if(!confirm(msg)) return;
      await IDB.ensureOpen();
      let count=0, imgCount=0;
      // Use putBulk for speed
      for(const [s,rows] of Object.entries(dataObj)){
        if(!Array.isArray(rows)) continue;
        try{ const n=await IDB.putBulk(s,rows); count+=n||rows.length; }
        catch{ for(const r of rows){try{await IDB.safePut(s,r);count++;}catch{}} }
      }
      if(payload.images){
        for(const [store,recs] of Object.entries(payload.images)){
          for(const [id,fields] of Object.entries(recs)){
            try{
              const existing = await IDB.get(store,+id||id).catch(()=>null);
              if(existing){ await IDB.safePut(store,{...existing,...fields}); imgCount++; }
            }catch{}
          }
        }
      }
      toast(`✅ Ripristino: ${count.toLocaleString()} record + ${imgCount} immagini`,'🔄');
      input.value='';
      setTimeout(()=>location.reload(),1500);
    }catch(e){ toast('❌ Errore backup: '+e.message,'warning'); console.error(e); }
  },

  // ═══ Full download + restore ═══
  async downloadFull() {
    const btn = document.getElementById('backup-download-btn');
    if(btn){ btn.disabled=true; btn.textContent='⏳ Preparazione...'; }
    try {
      const allData = await IDB.exportAll();
      const safe = {};
      for(const [store,records] of Object.entries(allData)){
        if(!Array.isArray(records)){safe[store]=records;continue;}
        safe[store] = records.map(r=>{
          if(!r||typeof r!=='object') return r;
          const c2 = {...r};
          Object.keys(c2).forEach(k=>{
            if(typeof c2[k]==='string'&&c2[k].length>60000&&c2[k].startsWith('data:')) c2[k]='[img]';
          });
          return c2;
        });
      }
      const payload = JSON.stringify({
        _ingly_backup: true,
        _version: 'v15',
        _exported: new Date().toISOString(),
        _records: Object.values(safe).reduce((a,v)=>a+(Array.isArray(v)?v.length:0),0),
        ...safe,
      });
      const blob = new Blob([payload], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ingly_backup_' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      localStorage.setItem('ingly_last_manual_backup', new Date().toISOString());
      if(typeof toast!=='undefined') toast('✅ Backup scaricato! (' + (blob.size/1024).toFixed(0) + 'KB)','success');
      this.render();
    } catch(err) {
      if(typeof toast!=='undefined') toast('❌ Errore: ' + err.message,'error');
    } finally {
      if(btn){ btn.disabled=false; btn.textContent='⬇️ Scarica Backup'; }
    }
  },

  async importRestore() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = async e => {
      const file = e.target.files[0]; if(!file) return;
      if(!confirm('Importare il backup? I dati attuali verranno sovrascritti.')) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if(!data._ingly_backup){ if(typeof toast!=='undefined') toast('File non valido','error'); return; }
        const STORES = ['orders','sales','clients','quotes','catalog','materials','equipment','suppliers','cashflow','fixed_costs','inventory','ideas','backups','settings','goals','events'];
        for(const store of STORES) {
          if(!data[store]||!Array.isArray(data[store])) continue;
          try {
            const tx = (await indexedDB.open('InglyDB',3)).transaction(store,'readwrite').objectStore(store);
            await new Promise((res,rej)=>{const r=tx.clear();r.onsuccess=res;r.onerror=rej;});
            for(const rec of data[store]) {
              if(rec?.id) await IDB.put(store, rec).catch(()=>{});
            }
          } catch {}
        }
        if(typeof toast!=='undefined') toast('✅ Backup ripristinato!','success');
        setTimeout(()=>window.location.reload(), 1500);
      } catch(err) {
        if(typeof toast!=='undefined') toast('❌ Errore ripristino: ' + err.message,'error');
      }
    };
    inp.click();
  },

  // ── Cloud backup via Google Drive (free) ─────────────────────────
  async saveToGoogleDrive(){
    // Show options modal first — no heavy data processing until user chooses
    const ov = document.createElement('div');
    ov.id = '_cloud-save-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(2px)';
    ov.onclick = function(e){ if(e.target===ov) ov.remove(); };
    ov.innerHTML = '<div style="background:var(--bg-card);border-radius:16px;width:min(480px,100%);border:1px solid var(--border2);box-shadow:0 24px 60px rgba(0,0,0,.5)" onclick="event.stopPropagation()">'
      + '<div style="padding:16px 20px;border-bottom:1px solid var(--border)">'
      + '<div style="font-size:16px;font-weight:900;margin-bottom:4px">☁️ Salva su Cloud (gratuito)</div>'
      + '<div style="font-size:11px;color:var(--text-muted)">Scegli come salvare il tuo backup</div>'
      + '</div>'
      + '<div style="padding:14px;display:flex;flex-direction:column;gap:8px">'
      + '<button onclick="document.getElementById(&quot;_cloud-save-modal&quot;).remove();Backup.downloadFull()" style="padding:14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;cursor:pointer;text-align:left;display:flex;align-items:center;gap:12px">'
      + '<div style="width:40px;height:40px;background:#22c55e20;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">💾</div>'
      + '<div style="text-align:left"><div style="font-size:13px;font-weight:800">Download locale</div><div style="font-size:11px;color:var(--text-muted)">Salva il file JSON sul dispositivo</div></div>'
      + '</button>'
      + '<button onclick="document.getElementById(&quot;_cloud-save-modal&quot;).remove();Backup._driveUpload()" style="padding:14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;cursor:pointer;text-align:left;display:flex;align-items:center;gap:12px">'
      + '<div style="width:40px;height:40px;background:#4285F420;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">📁</div>'
      + '<div style="text-align:left"><div style="font-size:13px;font-weight:800">Google Drive <span style="background:#22c55e15;color:#22c55e;font-size:9px;padding:1px 6px;border-radius:99px;margin-left:4px">GRATIS 15GB</span></div><div style="font-size:11px;color:var(--text-muted)">Scarica + apri Google Drive</div></div>'
      + '</button>'
      + '<button onclick="document.getElementById(&quot;_cloud-save-modal&quot;).remove();Backup._emailBackup()" style="padding:14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;cursor:pointer;text-align:left;display:flex;align-items:center;gap:12px">'
      + '<div style="width:40px;height:40px;background:#3b82f620;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">✉️</div>'
      + '<div style="text-align:left"><div style="font-size:13px;font-weight:800">Invia via Email</div><div style="font-size:11px;color:var(--text-muted)">Apre il client email</div></div>'
      + '</button>'
      + '</div>'
      + '<div style="padding:0 14px 14px;text-align:right">'
      + '<button onclick="document.getElementById(&quot;_cloud-save-modal&quot;).remove()" style="padding:8px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;color:var(--text-muted)">Annulla</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(ov);
  },

  async _driveUpload(){
    // Step 1: download backup
    await this.downloadFull();
    // Step 2: show instructions
    const ov2 = document.createElement('div');
    ov2.id = '_drive-upload-modal';
    ov2.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov2.onclick = function(e){ if(e.target===ov2) ov2.remove(); };
    var steps = ['Il file JSON è stato scaricato','Clicca "Apri Google Drive" qui sotto','Trascina il file nella cartella Drive','Backup al sicuro nel cloud! ✅'];
    var stepsHtml = '';
    for(var i=0;i<steps.length;i++){
      stepsHtml += '<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px">'
        + '<div style="width:22px;height:22px;border-radius:50%;background:var(--primary);color:#000;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;flex-shrink:0">'+(i+1)+'</div>'
        + '<div style="font-size:12px;color:var(--text-muted);padding-top:3px">'+steps[i]+'</div>'
        + '</div>';
    }
    ov2.innerHTML = '<div style="background:var(--bg-card);border-radius:14px;width:min(460px,100%);padding:20px;border:1px solid var(--border2)" onclick="event.stopPropagation()">'
      + '<div style="font-size:16px;font-weight:900;margin-bottom:14px">📁 Salva su Google Drive</div>'
      + stepsHtml
      + '<div style="display:flex;gap:8px;margin-top:16px">'
      + '<button onclick="document.getElementById(&quot;_drive-upload-modal&quot;).remove()" style="flex:1;padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:13px;color:var(--text-muted)">Chiudi</button>'
      + '<a href="https://drive.google.com" target="_blank" style="flex:2;padding:10px;background:#4285F4;color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px">📁 Apri Google Drive</a>'
      + '</div>'
      + '</div>';
    document.body.appendChild(ov2);
  },

  _emailBackup(){
    // Download + open email with instructions
    this.downloadFull();
    const subject = encodeURIComponent('Backup INGLY OS — '+new Date().toLocaleDateString('it-IT'));
    const body = encodeURIComponent('In allegato trovi il backup di INGLY OS.\n\nSalvalo in un posto sicuro (Google Drive, cartella Backup, ecc.)\n\nData: '+new Date().toLocaleDateString('it-IT'));
    window.open(`mailto:?subject=${subject}&body=${body}`,'_blank');
    if(typeof toast!=='undefined') toast('📧 Apri la mail e allega il file scaricato','info');
  },

  async autoBackupCloud(){
    // Weekly auto-backup check
    const lastCloud = localStorage.getItem('ingly_last_cloud_backup');
    const weekAgo = Date.now() - 7*864e5;
    if(lastCloud && new Date(lastCloud).getTime() > weekAgo) return; // Already backed up this week
    // Show suggestion
    const t = document.createElement('div');
    t.id = '_cloud-backup-toast';
    t.style.cssText='position:fixed;bottom:14px;left:14px;background:var(--bg-card);border:1.5px solid #4285F4;border-radius:12px;padding:12px 16px;z-index:9998;max-width:300px;box-shadow:0 8px 32px rgba(0,0,0,.4)';
    t.innerHTML=`<div style="font-size:12px;font-weight:800;margin-bottom:6px">☁️ Backup settimanale</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">È passata una settimana dall'ultimo backup. Salva i tuoi dati!</div>
      <div style="display:flex;gap:6px">
        <button onclick="Backup.saveToGoogleDrive();document.getElementById('_cloud-backup-toast')?.remove();localStorage.setItem('ingly_last_cloud_backup',new Date().toISOString())"
          style="flex:2;padding:6px;background:#4285F4;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:800">☁️ Salva ora</button>
        <button onclick="document.getElementById('_cloud-backup-toast')?.remove();localStorage.setItem('ingly_last_cloud_backup',new Date().toISOString())"
          style="flex:1;padding:6px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:10px;color:var(--text-muted)">Dopo</button>
      </div>`;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 12000);
  }
};

// v77: alias for Quoter.convertToInvoice() compatibility
const XMLInvoices = XMLSDI;

// ===== HISTORY MODULE =====
const HistoryModule={
  async render(){
    const el=eid('history-tbody');if(!el)return;
    const entries=(await IDB.getAll('history')).sort((a,b)=>b.ts-a.ts).slice(0,50);
    if(!entries.length){el.innerHTML='<tr><td colspan="4" class="text-muted" style="text-align:center;padding:24px">Nessuna operazione registrata</td></tr>';return;}
    const actionLabels={saved:'Salvato',created:'Creato',updated:'Aggiornato',deleted:'Eliminato',marked_paid:'Pagato',converted_to_sale:'→ Vendita',status_changed:'Cambio Stato',stock_adjusted:'Rettifica Stock',restored:'Ripristinato',startup:'Avvio'};
    const entityColor={sale:'var(--green)',quote:'var(--primary)',client:'var(--blue)',inventory:'var(--orange)',cashflow:'var(--purple)',backup:'var(--text-muted)',project:'var(--blue)',system:'var(--text-dim)'};
    el.innerHTML=entries.map(e=>`<tr>
      <td>${new Date(e.ts).toLocaleString('it-IT')}</td>
      <td><span class="badge" style="background:${entityColor[e.entity]||'var(--text-muted)'}20;color:${entityColor[e.entity]||'var(--text-muted)'}">${e.entity}</span></td>
      <td>${actionLabels[e.action]||e.action}</td>
      <td style="font-size:11px;color:var(--text-muted)">${e.entityId} ${e.data&&Object.keys(e.data).length?'· '+JSON.stringify(e.data).replace(/[{}\"]/g,'').substring(0,60):''}</td>
    </tr>`).join('');
  }
};

// ===== SETTINGS =====
const Settings={
  async load(){
    try{
    const cfg=await IDB.get('settings','main')||(DEFAULTS&&DEFAULTS.settings)||{};
    eid('set-company').value=cfg.company||'';
    const bizName=document.getElementById('topbar-biz-name');if(bizName)bizName.textContent=cfg.company||'Ingly Design';
    if(eid('set-slogan')) eid('set-slogan').value=cfg.slogan||'';
    if(eid('set-logo')) eid('set-logo').value=cfg.logo||'';
    if(eid('set-brand-color')) { eid('set-brand-color').value=cfg.brandColor||'#54F2F4'; eid('set-brand-color-pick').value=cfg.brandColor||'#54F2F4'; }
    eid('set-piva').value=cfg.piva||'';
    eid('set-email').value=cfg.email||'';
    eid('set-phone').value=cfg.phone||'';
    if(eid('set-address'))eid('set-address').value=cfg.address||'';
    eid('set-markup').value=cfg.markup||40;
    eid('set-vat').value=cfg.vat||22;
    eid('set-machine-cost').value=cfg.machineCost||0.35;
    eid('set-labor-cost').value=cfg.laborCost||0.50;
    eid('set-goal-rev').value=cfg.goalRevenue||5000;
    eid('set-goal-save').value=cfg.goalSavings||500;
    eid('set-backup-freq').value=cfg.backupFreq||'daily';
    // Currency
    const curSel=eid('set-currency');
    if(curSel) curSel.value=cfg.currency||'EUR';
    const backups=await IDB.getAll('backups');
    if(backups.length){const last=backups.sort((a,b)=>b.ts-a.ts)[0];const el=eid('last-backup-time');if(el)el.textContent=new Date(last.ts).toLocaleString('it-IT');}
    await this.renderGoals(cfg);
    ThemeSwitcher.renderSwatches();
    // Load AI provider settings
    const keyEl=eid('set-api-key');
    if(keyEl){ const k=localStorage.getItem('ingly_api_key')||''; keyEl.value=k; Settings._updateKeyStatus(k); }
    const geminiEl=eid('set-gemini-key');
    if(geminiEl){ geminiEl.value=localStorage.getItem('ingly_gemini_key')||''; }
    const groqEl=eid('set-groq-key');
    if(groqEl){ groqEl.value=localStorage.getItem('ingly_groq_key')||''; }
    const orEl=eid('set-openrouter-key');
    if(orEl){ orEl.value=localStorage.getItem('ingly_openrouter_key')||''; }
    Settings._renderProviderUI(localStorage.getItem('ingly_ai_provider')||'smart');
    const badge=eid('ai-calls-badge');
    if(badge) badge.textContent=AIProvider.getCallsToday()+' chiamate oggi';
    }catch(e){console.warn('[Settings.load]',e);}
  },
  saveApiKey(val){
    const v=(val||'').trim();
    localStorage.setItem('ingly_api_key',v);
    Settings._updateKeyStatus(v);
  },
  saveProviderKey(provider, val){
    const v=(val||'').trim();
    const keyMap={gemini:'ingly_gemini_key',groq:'ingly_groq_key',openrouter:'ingly_openrouter_key'};
    if(keyMap[provider]) localStorage.setItem(keyMap[provider],v);
    const statusEl=eid(provider+'-key-status'); if(!statusEl)return;
    if(!v){ statusEl.innerHTML='<span style="color:#f59e0b">⚠️ Chiave non inserita</span>'; return; }
    const ok={gemini:k=>k.startsWith('AIza')&&k.length>20, groq:k=>k.startsWith('gsk_')&&k.length>10, openrouter:k=>k.startsWith('sk-or-')&&k.length>10};
    if(ok[provider]&&ok[provider](v)) statusEl.innerHTML='<span style="color:#10b981">✅ Chiave valida</span>';
    else statusEl.innerHTML='<span style="color:#ef4444">❌ Formato non valido</span>';
  },
  async save(){
    try {
      const cfg = await IDB.get('settings','main').catch(()=>({}))||{};
      const updated = {
        ...cfg,
        company:     eid('set-company')?.value?.trim()||cfg.company||'',
        slogan:      eid('set-slogan')?.value?.trim()||cfg.slogan||'',
        logo:        eid('set-logo')?.value?.trim()||cfg.logo||'',
        brandColor:  eid('set-brand-color')?.value?.trim()||cfg.brandColor||'#54F2F4',
        piva:        eid('set-piva')?.value?.trim()||cfg.piva||'',
        email:       eid('set-email')?.value?.trim()||cfg.email||'',
        phone:       eid('set-phone')?.value?.trim()||cfg.phone||'',
        address:     eid('set-address')?.value?.trim()||cfg.address||'',
        markup:      +(eid('set-markup')?.value||cfg.markup||40),
        vat:         +(eid('set-vat')?.value||cfg.vat||22),
        machineCost: +(eid('set-machine-cost')?.value||cfg.machineCost||0.35),
        laborCost:   +(eid('set-labor-cost')?.value||cfg.laborCost||0.50),
        goalRevenue: +(eid('set-goal-rev')?.value||cfg.goalRevenue||5000),
        goalSavings: +(eid('set-goal-save')?.value||cfg.goalSavings||500),
        backupFreq:  eid('set-backup-freq')?.value||cfg.backupFreq||'daily',
        currency:    eid('set-currency')?.value||cfg.currency||'EUR',
        updatedAt:   new Date().toISOString(),
      };
      await IDB.put('settings', {...updated, id:'main'});
      // Persist API keys to localStorage
      const apiKey = eid('set-api-key')?.value?.trim();
      if(apiKey !== undefined) { localStorage.setItem('ingly_api_key', apiKey); Settings._updateKeyStatus(apiKey); }
      const gemKey = eid('set-gemini-key')?.value?.trim();
      if(gemKey !== undefined) localStorage.setItem('ingly_gemini_key', gemKey);
      const groqKey = eid('set-groq-key')?.value?.trim();
      if(groqKey !== undefined) localStorage.setItem('ingly_groq_key', groqKey);
      const orKey = eid('set-openrouter-key')?.value?.trim();
      if(orKey !== undefined) localStorage.setItem('ingly_openrouter_key', orKey);
      // Invalidate caches that depend on settings
      AppStore.invalidate('settings');
      toast('✅ Impostazioni salvate!', 'success');
      // Reload quoter with new markup if open
      if(typeof Quoter !== 'undefined' && App.currentSection === 'quoter') Quoter.init();
    } catch(e) {
      toast('Errore salvataggio impostazioni: '+e.message, 'error');
      console.error('[Settings.save]', e);
    }
  },
    setProvider(provider){
    localStorage.setItem('ingly_ai_provider',provider);
    Settings._renderProviderUI(provider);
  },
  _renderProviderUI(provider){
    const colors={smart:'#10b981',groq:'#f59e0b',openrouter:'#06b6d4',gemini:'#4285f4',anthropic:'#6366f1'};
    ['smart','groq','openrouter','gemini','anthropic'].forEach(p=>{
      const card=eid('prov-'+p+'-card'), badge=eid('prov-'+p+'-badge'), sec=eid(p+'-key-section');
      const on=p===provider;
      if(card){card.style.border=on?`2px solid ${colors[p]}`:'2px solid var(--border)';card.style.opacity=on?'1':'0.5';}
      if(badge)badge.style.display=on?'inline-block':'none';
      if(sec)sec.style.display=on?'block':'none';
    });
  },
  _updateKeyStatus(k){
    const el=eid('api-key-status'); if(!el)return;
    if(!k){el.innerHTML='<span style="color:#f59e0b">⚠️ Non configurata</span>';return;}
    if(k.startsWith('sk-ant-')&&k.length>30){el.innerHTML='<span style="color:#10b981">✅ Chiave configurata</span>';return;}
    el.innerHTML='<span style="color:#ef4444">❌ Formato non valido</span>';
  },
  async save(){
    const cfg={key:'main',company:eid('set-company').value,piva:eid('set-piva').value,email:eid('set-email').value,phone:eid('set-phone').value,address:eid('set-address')?.value||'',markup:+eid('set-markup').value||40,vat:+eid('set-vat').value||22,machineCost:+eid('set-machine-cost').value||0.35,laborCost:+eid('set-labor-cost').value||0.50,goalRevenue:+eid('set-goal-rev').value||5000,goalSavings:+eid('set-goal-save').value||500,backupFreq:eid('set-backup-freq').value,currency:eid('set-currency')?.value||'EUR'};
    if (!cfg.key) cfg.key = 'main';
    await IDB.put('settings',cfg);
    await logAction('settings','main','updated');
    toast('Impostazioni salvate!');
    await this.renderGoals(cfg);
  },
  async renderGoals(cfg){
    const el=eid('goals-progress');if(!el)return;
    const sales=await AppStore.get('sales');
    const cashflow=await AppStore.get('cashflow');
    const now=new Date();const monthStart=new Date(now.getFullYear(),now.getMonth(),1).getTime();
    const revenue=sales.filter(s=>s.status==='pagato'&&new Date(s.date).getTime()>=monthStart).reduce((a,s)=>a+(+s.amount||0),0);
    const savings=cashflow.filter(c=>c.type==='entrata'&&new Date(c.date).getTime()>=monthStart).reduce((a,c)=>a+(+c.amount||0),0);
    const revPct=Math.min(100,Math.round(revenue/(cfg.goalRevenue||5000)*100));
    const savPct=Math.min(100,Math.round(savings/(cfg.goalSavings||500)*100));
    el.innerHTML=`<div class="mb-12"><div class="flex-between mb-12" style="font-size:12px"><span>${I18n.t('monthlyRevenue')}</span><span>${fmtCur(revenue)} / ${fmtCur(cfg.goalRevenue||5000)}</span></div><div class="progress"><div class="progress-bar ${revPct>=100?'green':revPct>=50?'':'red'}" style="width:${revPct}%"></div></div></div><div class="mb-12"><div class="flex-between mb-12" style="font-size:12px"><span>${I18n.t('savingsGoal')}</span><span>${fmtCur(savings)} / ${fmtCur(cfg.goalSavings||500)}</span></div><div class="progress"><div class="progress-bar ${savPct>=100?'green':savPct>=50?'':'red'}" style="width:${savPct}%"></div></div></div>`;
  },

  async quickSetupCompany() {
    const existing = await CompanyProfile.get().catch(()=>({}));
    const ov = document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.onclick=e=>{if(e.target===ov)ov.remove();};
    ov.innerHTML=`
    <div style="background:var(--bg-card);border-radius:16px;width:min(480px,100%);border:1px solid var(--border2)" onclick="event.stopPropagation()">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);font-size:15px;font-weight:800">🏢 Setup rapido — Profilo Aziendale</div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:12px">
        <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Nome Azienda / Studio *</label>
          <input class="form-control" id="qs-name" value="${existing.name||''}" placeholder="Es. Legno & Design Studio"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Email</label>
            <input class="form-control" id="qs-email" type="email" value="${existing.email||''}" placeholder="info@..."></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Telefono / WA</label>
            <input class="form-control" id="qs-phone" value="${existing.phone||''}" placeholder="+39 ..."></div>
        </div>
        <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">P.IVA / Codice Fiscale</label>
          <input class="form-control" id="qs-piva" value="${existing.piva||existing.vatNumber||''}" placeholder="IT12345678901"></div>
        <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Sito web / Etsy shop</label>
          <input class="form-control" id="qs-web" value="${existing.website||existing.web||''}" placeholder="https://..."></div>
        <div style="display:flex;gap:8px;padding-top:6px">
          <button onclick="this.closest('[style*=fixed]').remove()" style="flex:1;padding:11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px">Annulla</button>
          <button onclick="Settings._saveQuickSetup()" style="flex:2;padding:11px;background:var(--primary);color:#000;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva profilo</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    setTimeout(()=>document.getElementById('qs-name')?.focus(),80);
  },

  async _saveQuickSetup() {
    const name  = document.getElementById('qs-name')?.value?.trim();
    if(!name){ if(typeof toast!=='undefined') toast('Inserisci il nome','warning'); return; }
    const data  = {
      name,
      email:   document.getElementById('qs-email')?.value?.trim()||'',
      phone:   document.getElementById('qs-phone')?.value?.trim()||'',
      piva:    document.getElementById('qs-piva')?.value?.trim()||'',
      website: document.getElementById('qs-web')?.value?.trim()||'',
    };
    await CompanyProfile.save(data).catch(()=>{});
    // Also update localStorage for quick access
    localStorage.setItem('ingly_company_name', name);
    document.querySelector('.company-name,.sidebar-logo-text')?.textContent && (document.querySelector('.company-name,.sidebar-logo-text').textContent = name);
    document.querySelector('[id*="company-name"]')?.textContent && (document.querySelector('[id*="company-name"]').textContent = name);
    document.getElementById('qs-name')?.closest('[style*=fixed]')?.remove();
    if(typeof toast!=='undefined') toast('✅ Profilo salvato!','success');
  }
};


// ============================================================
// LISTINO B2B MODULE
// ============================================================
const Portabile = {
  async render(){
    await this.renderStats();
    this.renderLog();
  },

  async renderStats(){
    const el=eid('portabile-stats'); if(!el)return;
    const stores=['clients','sales','catalog','quotes','inventory','cashflow','orders','materials','projects'];
    const counts={};
    for(const s of stores){
      try{ counts[s]=(await IDB.getAll(s)).length; }catch(e){ counts[s]=0; }
    }
    const catalog=await AppStore.get('catalog');
    const withPhotos=catalog.filter(p=>p.photo).length;
    const totalSize=JSON.stringify(counts).length;
    const icons={clients:'👥',sales:'💰',catalog:'📦',quotes:'📋',inventory:'🏭',cashflow:'💳',orders:'🔧',materials:'🪵',projects:'📁'};
    el.innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${stores.filter(s=>counts[s]>0).map(s=>`<div style="padding:10px;background:var(--bg-card2);border-radius:8px;display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">${icons[s]||'📄'}</span>
          <div><div style="font-weight:700;font-size:13px">${counts[s]}</div><div style="font-size:11px;color:var(--text-muted)">${s}</div></div>
        </div>`).join('')}
      </div>
      <div style="margin-top:10px;padding:10px;background:var(--bg-card2);border-radius:8px;font-size:12px">
        📸 <strong>${withPhotos}</strong> prodotti con foto · tutto incluso nel JSON come base64
      </div>`;
  },

  renderLog(){
    const el=eid('portabile-log'); if(!el)return;
    const logs=JSON.parse(localStorage.getItem('ingly_export_log')||'[]');
    if(!logs.length){el.innerHTML='<p style="color:var(--text-muted);text-align:center;padding:16px;font-size:13px">Nessuna esportazione ancora</p>';return;}
    el.innerHTML=logs.map(l=>`<div style="padding:10px 12px;border-bottom:1px solid var(--border)"><div style="font-weight:700;font-size:13px">${l.filename}</div><div style="font-size:11px;color:var(--text-muted)">${new Date(l.ts).toLocaleString('it-IT')} · ${(l.size/1024).toFixed(0)} KB</div></div>`).join('');
  },

  addLog(entry){
    const logs=JSON.parse(localStorage.getItem('ingly_export_log')||'[]');
    logs.unshift(entry);
    localStorage.setItem('ingly_export_log',JSON.stringify(logs.slice(0,20)));
      if(typeof BackupReminder!=='undefined') BackupReminder.markDone();
    this.renderLog();
  },

  soloBackup(){ Backup.download(); },
  soloTool(){
    const html=document.documentElement.outerHTML;
    const blob=new Blob([html],{type:'text/html'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='INGLY_MASTER_latest.html';a.click();URL.revokeObjectURL(a.href);
    toast('🛠️ Tool HTML scaricato!');
  },

  async esporta(){
    const inclTool=eid('exp-include-tool')?.checked!==false;
    const inclData=eid('exp-include-data')?.checked!==false;
    const inclReadme=eid('exp-include-readme')?.checked!==false;
    toast('📦 Creazione pacchetto ZIP...','info');

    // Collect data — sanitized (no large base64, no backups store)
    const rawData = await IDB.exportAll();
    const data = typeof _sanitizeForBackup==='function' ? _sanitizeForBackup(rawData) : rawData;
    const date = new Date().toISOString().split('T')[0];
    // Don't include full HTML (4MB+) in ZIP — user already has the file
    const toolHtml = '<!-- HTML not included in data export — open the .html file directly -->';

    const readme=`INGLY MASTER — Pacchetto Portatile
Creato: ${new Date().toLocaleString('it-IT')}
===========================================

CONTENUTO PACCHETTO:
- INGLY_MASTER.html  → Il tool completo (apri con qualsiasi browser)
- ingly_data.json    → Tutti i dati (clienti, vendite, catalogo, foto, preventivi...)
- README.txt         → Questo file

COME USARE SU UN ALTRO PC:
1. Copia questa cartella su USB o carica lo ZIP su Google Drive
2. Sul nuovo PC: estrai lo ZIP (o copia la cartella)
3. Apri INGLY_MASTER.html con il browser (Chrome, Firefox, Edge, Safari)
4. Vai su: Backup Locale (nella sidebar sinistra)
5. Clicca "Importa" → seleziona il file ingly_data.json
6. Tutti i tuoi dati, immagini e configurazioni saranno ripristinati!

NOTE:
- Le foto dei prodotti sono salvate dentro il JSON come base64 (non serve cartella separata)
- Le impostazioni AI (chiavi API) NON vengono esportate per sicurezza — reinseriscile
- Puoi riesportare il pacchetto aggiornato in qualsiasi momento da "Esporta Portatile"

BACKUP AUTOMATICO CONSIGLIATO:
Esporta il pacchetto ogni settimana e salvalo su Google Drive o USB.
`;

    // Build JSON string from collected data
    const json = JSON.stringify(typeof data==='object' ? data : {}, null, 2);

    // Build ZIP using JSZip (inline implementation for single-file)
    try{
      // Try to use JSZip if available
      const zipAvailable = typeof JSZip !== 'undefined';
      if(zipAvailable){
        await this._esportaConZip(json,toolHtml,readme,inclTool,inclData,inclReadme,date);
      } else {
        // Download individually with clear instructions
        await this._esportaSeparati(json,toolHtml,readme,inclTool,inclData,inclReadme,date);
      }
    }catch(e){
      await this._esportaSeparati(json,toolHtml,readme,inclTool,inclData,inclReadme,date);
    }
  },

  async _esportaConZip(json,toolHtml,readme,inclTool,inclData,inclReadme,date){
    const zip=new JSZip();
    const folder=zip.folder('Ingly_Pacchetto_'+date);
    if(inclData) folder.file('ingly_data.json',json);
    if(inclTool) folder.file('INGLY_MASTER.html',toolHtml);
    if(inclReadme) folder.file('README.txt',readme);
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}},meta=>{ if(meta.percent%20<1) toast('ZIP: '+Math.round(meta.percent)+'%...','info'); });
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='Ingly_Pacchetto_'+date+'.zip';a.click();URL.revokeObjectURL(a.href);
    this.addLog({ts:new Date().toISOString(),filename:'Ingly_Pacchetto_'+date+'.zip',size:blob.size});
    toast('✅ ZIP scaricato! Salvalo su USB o Google Drive.');
  },

  async _esportaSeparati(json,toolHtml,readme,inclTool,inclData,inclReadme,date){
    toast('📦 Scaricamento file separati (ZIP non disponibile)...','info');
    const delay=ms=>new Promise(r=>setTimeout(r,ms));
    let count=0;
    if(inclData){
      const b=new Blob([json],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='ingly_data_'+date+'.json';a.click();URL.revokeObjectURL(a.href);
      this.addLog({ts:new Date().toISOString(),filename:'ingly_data_'+date+'.json',size:b.size});count++;
      await delay(500);
    }
    if(inclTool){
      const b=new Blob([toolHtml],{type:'text/html'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='INGLY_MASTER_'+date+'.html';a.click();URL.revokeObjectURL(a.href);
      count++;await delay(500);
    }
    if(inclReadme){
      const b=new Blob([readme],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='README.txt';a.click();URL.revokeObjectURL(a.href);
      count++;
    }
    toast('✅ '+count+' file scaricati! Mettili tutti in una cartella e copiala su USB o Drive.');
    // Show instructions modal
    setTimeout(()=>{
      alert('✅ SCARICATI '+count+' FILE\n\n📁 CREA UNA CARTELLA chiamata "Ingly_'+date+'" e metti dentro:\n- ingly_data_'+date+'.json\n- INGLY_MASTER_'+date+'.html\n- README.txt\n\nCopia questa cartella su USB o caricala su Google Drive.\n\n🔄 PER RIPRISTINARE su altro PC:\n1. Apri INGLY_MASTER.html nel browser\n2. Vai su Backup Locale → Importa\n3. Seleziona il file ingly_data.json');
    },1500);
  }
};



// ===== ENGINE UI =====
const EngineUI={
  isOpen:false,
  activeTab:'ai',
  toggle(){
    this.isOpen=!this.isOpen;
    eid('engine-drawer').classList.toggle('hidden',!this.isOpen);
    if(this.isOpen)this.renderTab(this.activeTab);
  },
  tab(t,btn){
    this.activeTab=t;
    document.querySelectorAll('#engine-drawer .tab-btn').forEach(b=>b.classList.remove('active'));
    if(btn)btn.classList.add('active');
    this.renderTab(t);
  },
  async renderTab(t){
    const el=eid('engine-content');if(!el)return;
    if(t==='ai'){
      el.innerHTML='<p style="color:var(--text-muted)">Analisi...</p>';
      const{decisions}=await AILayer.analyze();
      if(!decisions.length){el.innerHTML='<p style="color:var(--green)">✅ Tutto OK!</p>';return;}
      el.innerHTML=decisions.map(d=>`<div style="padding:8px;margin-bottom:6px;border-radius:6px;background:var(--bg-card2);border-left:3px solid ${d.priority==='critica'?'var(--red)':d.priority==='alta'?'var(--orange)':d.priority==='positiva'?'var(--green)':'var(--primary)'}"><span style="font-size:12px">${d.icon} ${d.message}</span></div>`).join('');
    }else if(t==='kpi'){
      const kpi=await KPIEngine.run();
      el.innerHTML=[
        {l:'Revenue',v:fmtCur(kpi.revenue)},{l:'Netto',v:fmtCur(kpi.netFlow)},
        {l:'Conversione',v:kpi.convRate+'%'},{l:'Scorte basse',v:kpi.lowStock},
      ].map(k=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px"><span style="color:var(--text-muted)">${k.l}</span><strong>${k.v}</strong></div>`).join('')+`<button onclick="App.navigate('kpi')" style="margin-top:8px;width:100%;padding:6px;background:var(--primary);color:#000;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700">Vedi tutti KPI →</button>`;
    }else if(t==='backup'){
      const list=await IDB.getAll('backups');
      const last=list.sort((a,b)=>b.ts-a.ts)[0];
      el.innerHTML=`<div style="font-size:12px;margin-bottom:8px;color:var(--text-muted)">Ultimo backup:<br><strong style="color:var(--text)">${last?new Date(last.ts).toLocaleString('it-IT'):'Nessuno'}</strong></div>
        <button onclick="Backup.createNow('manual').then(()=>EngineUI.renderTab('backup'))" style="width:100%;padding:6px;background:var(--primary);color:#000;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;margin-bottom:6px">💾 Backup Ora</button>
        <button onclick="Backup.download()" style="width:100%;padding:6px;background:var(--bg-card2);color:var(--text);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px">⬇️ Scarica JSON</button>`;
    }
  }
};

// ===== I18N / LANGUAGE SYSTEM =====
const I18n={
  lang:'it',
  dict:{
    it:{
      // Nav groups
      'nav.control':'Controllo','nav.sales':'Vendite','nav.production':'Produzione',
      'nav.clientsMarketing':'Clienti & Marketing','nav.planning':'Pianificazione',
      'nav.business':'Business','nav.system':'Sistema',
      // Nav items
      'nav.dashboard':'Dashboard ROI','nav.ai':'AI Decisioni','nav.kpi':'KPI Live',
      'nav.quoter':'Smart Quoter','nav.workflow':'Workflow','nav.salesInv':'Vendite & Fatture',
      'nav.cashflow':'Cashflow','nav.inventory':'Magazzino','nav.materials':'Materiali & Macchine',
      'nav.projects':'Progetti','nav.clients':'CRM Clienti','nav.catalog':'Catalogo',
      'nav.marketing':'Marketing Pro','nav.etsy':'Trend Etsy','nav.calendar':'Calendario',
      'nav.strategy':'Strategia','nav.innovation':'Innovazione','nav.team':'Team & HR',
      'nav.analytics':'Analytics','nav.bu':'Business Unit','nav.legal':'Legale',
      'nav.backup':'Backup','nav.history':'Storico','nav.settings':'Impostazioni',
      // Topbar
      'topbar.search':'Cerca modulo...',
      // Dashboard
      'dashboard.title':'Dashboard ROI','dashboard.subtitle':'Panoramica business in tempo reale',
      'dashboard.refresh':'Aggiorna','dashboard.newQuote':'Nuovo Preventivo',
      'dashboard.recentSales':'Ultime Vendite','dashboard.recentQuotes':'Preventivi Recenti',
      // Common buttons
      'btn.save':'Salva','btn.cancel':'Annulla','btn.delete':'Elimina','btn.edit':'Modifica',
      'btn.add':'Aggiungi','btn.new':'Nuovo','btn.close':'Chiudi','btn.export':'Esporta',
      'btn.import':'Importa','btn.download':'Scarica','btn.backup':'Backup Ora','btn.refresh':'Aggiorna',
      // Sections
      'section.ai':'AI Decisioni','section.ai.sub':'Analisi intelligente del tuo business',
      'section.kpi':'KPI Live','section.kpi.sub':'Indicatori chiave aggiornati in tempo reale',
      'section.quoter':'Smart Quoter','section.quoter.sub':'Crea preventivi professionali con pricing dinamico',
      'section.workflow':'Workflow Preventivi','section.sales':'Vendite & Fatture',
      'section.cashflow':'Cashflow','section.inventory':'Magazzino',
      'section.materials':'Materiali & Macchine','section.clients':'CRM Clienti',
      'section.catalog':'Catalogo Prodotti','section.marketing':'Marketing Pro',
      'section.etsy':'Trend Etsy 2026','section.calendar':'Calendario',
      'section.strategy':'Strategia','section.innovation':'Innovazione & R&D',
      'section.team':'Team & HR','section.analytics':'Analytics Business',
      'section.bu':'Business Unit','section.legal':'Documenti Legali',
      'section.backup':'Backup & Sicurezza','section.history':'Storico Operazioni',
      'section.settings':'Impostazioni',
      // Goals
      'monthlyRevenue':'Revenue Mensile','savingsGoal':'Obiettivo Risparmio',
      // Settings labels
      'settings.company':'Azienda','settings.companyName':'Nome Azienda',
      'settings.piva':'P.IVA','settings.email':'Email','settings.phone':'Telefono',
      'settings.calcParams':'Parametri Calcolo','settings.markup':'Markup Default (%)',
      'settings.vat':'IVA (%)','settings.machineCost':'Costo Macchina (€/min)',
      'settings.laborCost':'Costo Lavoro (€/min)','settings.goals':'Obiettivi',
      'settings.goalRev':'Obiettivo Revenue Mensile (€)','settings.goalSave':'Obiettivo Risparmio (€)',
      'settings.autoBackup':'Backup Automatico','settings.freq':'Frequenza',
      'settings.daily':'Ogni 24 ore','settings.weekly':'Ogni settimana','settings.manual':'Solo manuale',
      'settings.lastBackup':'Ultimo backup:','settings.reset':'Reset Completo',
      // Backup section
      'backup.available':'Backup Disponibili','backup.exportCsv':'Esporta Dati CSV',
      'backup.clients':'Clienti CSV','backup.sales':'Vendite CSV',
      'backup.inventory':'Magazzino CSV','backup.quotes':'Preventivi CSV',
      // History
      'history.dateTime':'Data/Ora','history.entity':'Entità','history.action':'Azione','history.details':'Dettagli',
      // Sales table headers
      'sales.th1':'#','sales.th2':'Cliente','sales.th3':'Data','sales.th4':'Articolo',
      'sales.th5':'Importo','sales.th6':'Stato','sales.th7':'Azioni',
      // Inventory headers
      'inv.sku':'SKU','inv.item':'Articolo','inv.cat':'Categoria','inv.stock':'Stock',
      'inv.min':'Min.','inv.cost':'Costo','inv.value':'Valore','inv.status':'Stato','inv.actions':'Azioni',
      // Client headers
      'cli.id':'#','cli.name':'Nome','cli.phone':'Telefono','cli.email':'Email',
      'cli.notes':'Note','cli.orders':'Ordini','cli.actions':'Azioni',
      // ── v55 Pipeline + Paints ──
      'section.paints':'Vernici & Bombolette','section.paints.sub':'Colori RAL · CMYK · Stock · Fornitori · Qualità',
      // ── v54 AI Business OS ──
      'section.decision':'Decision Engine','section.decision.sub':'Cosa fare oggi · Profitto nascosto · Brief strategico AI',
      'section.opportunity':'Opportunity Scanner','section.opportunity.sub':'Trend · Gap mercato · Stagionalità · Nuovi prodotti',
      'section.intel':'Intelligence Hub','section.intel.sub':'Customer · Product · Financial · Growth Intelligence',
      // New sections v50
      'section.orders':'Coda Produzione — Kanban','section.orders.sub':'Gestisci lo stato di ogni ordine dal banco di lavoro',
      'section.studio_ai':'AI Studio','section.studio_ai.sub':'Genera contenuti con intelligenza artificiale',
      'section.social':'Social Studio','section.social.sub':'Pianifica contenuti e cresci sui social',
      'section.web_presence':'Presenza Online','section.web_presence.sub':'Portfolio, landing page e profili social',
      'section.produzione':'Produzione','section.produzione.sub':'Gestisci la produzione e le spedizioni',
      'section.design_studio':'Design Studio','section.design_studio.sub':'Personalizza tema, colori e logo',
      'btn.newOrder':'Nuovo Ordine','btn.printPicking':'Stampa Lista Picking',
      'orders.title':'Coda Produzione — Kanban',
      'ai.generateDesc':'Genera Descrizione','ai.generateReply':'Genera Risposta',
      'ai.generateNames':'Genera 10 Nomi','ai.generateCopy':'Genera Testo',
      'social.newPost':'Nuovo Post','social.savePost':'Salva nel Calendario',
      'web.generatePortfolio':'Genera Portfolio HTML','web.generateLanding':'Genera Pagina',
      'design.applyTheme':'Applica Tema','design.saveTheme':'Salva Tema',
    },
    en:{
      'nav.control':'Control','nav.sales':'Sales','nav.production':'Production',
      'nav.clientsMarketing':'Clients & Marketing','nav.planning':'Planning',
      'nav.business':'Business','nav.system':'System',
      'nav.dashboard':'Dashboard ROI','nav.ai':'AI Decisions','nav.kpi':'Live KPI',
      'nav.quoter':'Smart Quoter','nav.workflow':'Workflow','nav.salesInv':'Sales & Invoices',
      'nav.cashflow':'Cash Flow','nav.inventory':'Inventory','nav.materials':'Materials & Machines',
      'nav.projects':'Projects','nav.clients':'CRM Clients','nav.catalog':'Catalog',
      'nav.marketing':'Marketing Pro','nav.etsy':'Etsy Trends','nav.calendar':'Calendar',
      'nav.strategy':'Strategy','nav.innovation':'Innovation','nav.team':'Team & HR',
      'nav.analytics':'Analytics','nav.bu':'Business Units','nav.legal':'Legal',
      'nav.backup':'Backup','nav.history':'History','nav.settings':'Settings',
      'topbar.search':'Search module...',
      'dashboard.title':'Dashboard ROI','dashboard.subtitle':'Real-time business overview',
      'dashboard.refresh':'Refresh','dashboard.newQuote':'New Quote',
      'dashboard.recentSales':'Recent Sales','dashboard.recentQuotes':'Recent Quotes',
      'btn.save':'Save','btn.cancel':'Cancel','btn.delete':'Delete','btn.edit':'Edit',
      'btn.add':'Add','btn.new':'New','btn.close':'Close','btn.export':'Export',
      'btn.import':'Import','btn.download':'Download','btn.backup':'Backup Now','btn.refresh':'Refresh',
      'section.ai':'AI Decisions','section.ai.sub':'Intelligent business analysis',
      'section.kpi':'Live KPI','section.kpi.sub':'Key indicators updated in real time',
      'section.quoter':'Smart Quoter','section.quoter.sub':'Create professional quotes with dynamic pricing',
      'section.workflow':'Quote Workflow','section.sales':'Sales & Invoices',
      'section.cashflow':'Cash Flow','section.inventory':'Inventory',
      'section.materials':'Materials & Machines','section.clients':'CRM Clients',
      'section.catalog':'Product Catalog','section.marketing':'Marketing Pro',
      'section.etsy':'Etsy Trends 2026','section.calendar':'Calendar',
      'section.strategy':'Strategy','section.innovation':'Innovation & R&D',
      'section.team':'Team & HR','section.analytics':'Business Analytics',
      'section.bu':'Business Units','section.legal':'Legal Documents',
      'section.backup':'Backup & Security','section.history':'Operations History',
      'section.settings':'Settings',
      'monthlyRevenue':'Monthly Revenue','savingsGoal':'Savings Goal',
      'settings.company':'Company','settings.companyName':'Company Name',
      'settings.piva':'VAT Number','settings.email':'Email','settings.phone':'Phone',
      'settings.calcParams':'Calculation Parameters','settings.markup':'Default Markup (%)',
      'settings.vat':'VAT (%)','settings.machineCost':'Machine Cost (€/min)',
      'settings.laborCost':'Labour Cost (€/min)','settings.goals':'Goals',
      'settings.goalRev':'Monthly Revenue Goal (€)','settings.goalSave':'Savings Goal (€)',
      'settings.autoBackup':'Automatic Backup','settings.freq':'Frequency',
      'settings.daily':'Every 24 hours','settings.weekly':'Every week','settings.manual':'Manual only',
      'settings.lastBackup':'Last backup:','settings.reset':'Full Reset',
      'backup.available':'Available Backups','backup.exportCsv':'Export CSV Data',
      'backup.clients':'Clients CSV','backup.sales':'Sales CSV',
      'backup.inventory':'Inventory CSV','backup.quotes':'Quotes CSV',
      'history.dateTime':'Date/Time','history.entity':'Entity','history.action':'Action','history.details':'Details',
      'sales.th1':'#','sales.th2':'Client','sales.th3':'Date','sales.th4':'Item',
      'sales.th5':'Amount','sales.th6':'Status','sales.th7':'Actions',
      'inv.sku':'SKU','inv.item':'Item','inv.cat':'Category','inv.stock':'Stock',
      'inv.min':'Min.','inv.cost':'Cost','inv.value':'Value','inv.status':'Status','inv.actions':'Actions',
      'cli.id':'#','cli.name':'Name','cli.phone':'Phone','cli.email':'Email',
      'cli.notes':'Notes','cli.orders':'Orders','cli.actions':'Actions',
      // ── v55 Pipeline + Paints ──
      'section.paints':'Paints & Spray Cans','section.paints.sub':'RAL colors · CMYK · Stock · Suppliers · Quality',
      // ── v54 AI Business OS ──
      'section.decision':'Decision Engine','section.decision.sub':'What to do today · Hidden profit · AI strategic brief',
      'section.opportunity':'Opportunity Scanner','section.opportunity.sub':'Trends · Market gaps · Seasonality · New products',
      'section.intel':'Intelligence Hub','section.intel.sub':'Customer · Product · Financial · Growth Intelligence',
      // New sections v50
      'section.orders':'Production Queue — Kanban','section.orders.sub':'Manage order status from your workbench',
      'section.studio_ai':'AI Studio','section.studio_ai.sub':'Generate content with artificial intelligence',
      'section.social':'Social Studio','section.social.sub':'Plan content and grow on social media',
      'section.web_presence':'Online Presence','section.web_presence.sub':'Portfolio, landing pages and social profiles',
      'section.produzione':'Production','section.produzione.sub':'Manage production and shipping',
      'section.design_studio':'Design Studio','section.design_studio.sub':'Customize theme, colors and logo',
      'btn.newOrder':'New Order','btn.printPicking':'Print Picking List',
      'orders.title':'Production Queue — Kanban',
      'ai.generateDesc':'Generate Description','ai.generateReply':'Generate Reply',
      'ai.generateNames':'Generate 10 Names','ai.generateCopy':'Generate Text',
      'social.newPost':'New Post','social.savePost':'Save to Calendar',
      'web.generatePortfolio':'Generate Portfolio HTML','web.generateLanding':'Generate Page',
      'design.applyTheme':'Apply Theme','design.saveTheme':'Save Theme',
    }
  },
  t(key){return(this.dict[this.lang]||{})[key]||(this.dict['it']||{})[key]||key},
  toggle(){
    this.lang=this.lang==='it'?'en':'it';
    const btn=eid('lang-toggle');
    if(btn)btn.innerHTML=this.lang==='it'?'🇬🇧 EN':'🇮🇹 IT';
    this.apply();
    App.renderSection(App.currentSection);
    toast(this.lang==='en'?'Language: English 🇬🇧':'Lingua: Italiano 🇮🇹','info');
  },
  apply(){
    // Static nav labels
    const navMap={
      'dashboard':'nav.dashboard','ai':'nav.ai','kpi':'nav.kpi','quoter':'nav.quoter',
      'workflow':'nav.workflow','sales':'nav.salesInv','cashflow':'nav.cashflow',
      'inventory':'nav.inventory','materials':'nav.materials','projects':'nav.projects',
      'clients':'nav.clients','catalog':'nav.catalog','marketing':'nav.marketing',
      'etsy':'nav.etsy','calendar':'nav.calendar','strategy':'nav.strategy',
      'innovation':'nav.innovation','team':'nav.team','analytics':'nav.analytics',
      'bu':'nav.bu','legal':'nav.legal','backup':'nav.backup','history':'nav.history',
      'items':'nav.items','socialstudio':'nav.socialstudio',
      'marketintel':'nav.marketintel','etsyai':'nav.etsyai','paints':'nav.paints',
      'settings':'nav.settings',
      // New v50 sections
      'studio_ai':'section.studio_ai','social':'section.social',
      'web_presence':'section.web_presence','produzione':'section.produzione',
      'design_studio':'section.design_studio','orders':'section.orders',
    };
    document.querySelectorAll('.nav-item[data-section]').forEach(el=>{
      const sec=el.dataset.section;
      if(navMap[sec]){
        const icon=el.querySelector('i');
        const badge=el.querySelector('.nav-badge');
        el.textContent=this.t(navMap[sec]);
        if(icon)el.prepend(icon);
        if(badge)el.appendChild(badge);
      }
    });
    // ── Nav GROUP titles (v70: full translation) ──
    const groupTitleMap={
      'ng-ai':      {it:'🧠 AI Command Center',      en:'🧠 AI Command Center'},
      'ng-intel':   {it:'📊 Intelligence & Analytics',en:'📊 Intelligence & Analytics'},
      'ng-market':  {it:'🔮 Market Intelligence',     en:'🔮 Market Intelligence'},
      'ng-pipeline':{it:'🏗️ Gestione Lavori',         en:'🏗️ Job Management'},
      'ng-stock':   {it:'🏭 Produzione & Stock',      en:'🏭 Production & Stock'},
      'ng-finance': {it:'💰 Finance & Fiscale',       en:'💰 Finance & Tax'},
      'ng-crm':     {it:'👥 CRM & Customer AI',       en:'👥 CRM & Customer AI'},
      'ng-mkt':     {it:'📢 Marketing & Content AI',  en:'📢 Marketing & Content AI'},
      'ng-ops':     {it:'📅 Pianificazione & Ops',    en:'📅 Planning & Ops'},
      'ng-brand':   {it:'🏢 Brand & Business',        en:'🏢 Brand & Business'},
      'ng-report':  {it:'📄 Report & Export',         en:'📄 Report & Export'},
      'ng-sistema': {it:'⚙️ Sistema',                 en:'⚙️ System'},
    };
    const lang=this.lang;
    Object.entries(groupTitleMap).forEach(([id,labels])=>{
      const grp=document.getElementById(id);
      if(!grp)return;
      const titleEl=grp.querySelector('.nav-group-title');
      if(!titleEl)return;
      const chevron=titleEl.querySelector('.ng-chevron');
      const label=labels[lang]||labels.it;
      // Find only the FIRST text node (before the chevron) and update it
      // Do NOT touch text nodes after the chevron to avoid visual duplication
      let firstTextNode=null;
      for(const n of titleEl.childNodes){
        if(n.nodeType===3){firstTextNode=n;break;}
      }
      if(firstTextNode) firstTextNode.textContent=label;
      else if(!chevron) titleEl.textContent=label;
      // Remove any trailing text nodes after chevron (cleanup legacy whitespace)
      if(chevron){
        let node=chevron.nextSibling;
        while(node){
          const next=node.nextSibling;
          if(node.nodeType===3)node.remove();
          node=next;
        }
      }
    });
    // ── Favorites bar label ──
    const favSpan=document.querySelector('#nav-favs-group .nav-group-title span:first-child');
    if(favSpan)favSpan.textContent=lang==='en'?'⭐ Favorites':'⭐ Preferiti';
    const recSpan=document.querySelector('#nav-recent-group .nav-group-title span:first-child');
    if(recSpan)recSpan.textContent=lang==='en'?'🕐 Recent':'🕐 Recenti';
    // ── Module Manager titles ──
    const mmH3=document.querySelector('#mod-mgr-panel h3');
    if(mmH3)mmH3.textContent=lang==='en'?'⚙️ Module Manager':'⚙️ Gestione Moduli';
    const mmSub=document.querySelector('.mmgr-subtitle');
    if(mmSub)mmSub.textContent=lang==='en'?'Show or hide entire sidebar groups. Hide what you don\'t use.':'Attiva o nascondi gruppi interi dalla sidebar. Nascondi ciò che non usi per tenere tutto più pulito.';
    document.querySelectorAll('.mmgr-btn').forEach(btn=>{
      if(btn.textContent.includes('Mostra')||btn.textContent.includes('Show'))
        btn.textContent=lang==='en'?'👁 Show All':'👁 Mostra tutti';
      if(btn.textContent.includes('Nascondi')||btn.textContent.includes('Hide'))
        btn.textContent=lang==='en'?'🔒 Hide Unused':'🔒 Nascondi inutilizzati';
      if(btn.textContent.includes('Fatto')||btn.textContent.includes('Done'))
        btn.textContent=lang==='en'?'✓ Done':'✓ Fatto';
    });
    // Also update ModMgr GROUPS labels for the rendered list
    if(window.ModMgr){
      const groupLabels={
        'ng-pipeline': {it:'Gestione Lavori',          en:'Job Management'},
        'ng-stock':    {it:'Produzione & Stock',     en:'Production & Stock'},
        'ng-finance':  {it:'Finance & Fiscale',      en:'Finance & Tax'},
        'ng-ops':      {it:'Pianificazione & Ops',   en:'Planning & Ops'},
        'ng-sistema':  {it:'Sistema',                en:'System'},
      };
      (ModMgr?.GROUPS||[]).forEach(g=>{
        if(groupLabels[g.id])g.label=groupLabels[g.id][lang]||groupLabels[g.id].it;
      });
    }
    // ── Command Palette placeholder ──
    const cp=eid('cmd-input');if(cp)cp.placeholder=lang==='en'?'Search commands and modules...':'Cerca comandi e moduli...';
    // Search placeholder
    const ns=eid('nav-search');if(ns)ns.placeholder=this.t('topbar.search');
    // Apply data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key=el.dataset.i18n;
      if(el.tagName==='INPUT'||el.tagName==='TEXTAREA')el.placeholder=this.t(key);
      else el.textContent=this.t(key);
    });
  }
};

// ===== AI MARKETING MODULE =====
const ThemeSwitcher = {
  THEMES: [
    {
      id: 'default', name: 'Obsidian Gold', emoji: '✨',
      bg: '#09090b', card: '#0f0f11', primary: '#fbbf24',
      desc: 'Nero con accento dorato — il classico Ingly'
    },
    {
      id: 'midnight', name: 'Midnight Blue', emoji: '🌊',
      bg: '#0a0e1a', card: '#0d1220', primary: '#60a5fa',
      desc: 'Blu profondo, eleganza notturna'
    },
    {
      id: 'emerald', name: 'Emerald Dark', emoji: '💚',
      bg: '#050f0a', card: '#081410', primary: '#10b981',
      desc: 'Verde bosco, fresco e professionale'
    },
    {
      id: 'crimson', name: 'Crimson Dark', emoji: '🔴',
      bg: '#0c0505', card: '#130808', primary: '#f43f5e',
      desc: 'Rosso passione, impatto visivo forte'
    },
    {
      id: 'arctic', name: 'Arctic White', emoji: '🌨️',
      bg: '#f0f4f8', card: '#ffffff', primary: '#0ea5e9',
      desc: 'Light mode pulito e luminoso'
    },
    {
      id: 'purple', name: 'Purple Haze', emoji: '🔮',
      bg: '#08060f', card: '#0f0d18', primary: '#a855f7',
      desc: 'Viola scuro, creativo e moderno'
    },
    {
      id: 'sand', name: 'Desert Sand', emoji: '🏜️',
      bg: '#1a1510', card: '#211c16', primary: '#d97706',
      desc: 'Caldo ambrato, artigianale e naturale'
    },
    {
      id: 'matrix', name: 'Matrix', emoji: '💾',
      bg: '#000300', card: '#010a02', primary: '#00ff41',
      desc: 'Verde fosforescente su nero assoluto'
    },
    { id:'rosegold', name:'Rose Gold',      emoji:'🌸', bg:'#0d0508', card:'#160c12', primary:'#f9a8d4', desc:'Rosa dorato elegante' },
    { id:'ocean',    name:'Deep Ocean',     emoji:'🌊', bg:'#020b10', card:'#04141e', primary:'#22d3ee', desc:'Oceano profondo turchese' },
    { id:'cyberpunk',name:'Cyberpunk',      emoji:'⚡', bg:'#050008', card:'#0a0010', primary:'#ff006e', desc:'Neon rosa — massimo impatto' },
    { id:'vulcano',  name:'Vulcano',        emoji:'🌋', bg:'#0c0200', card:'#180500', primary:'#fb923c', desc:'Fuoco e lava artigianale' },
    { id:'foresta',  name:'Foresta',        emoji:'🌿', bg:'#010804', card:'#041208', primary:'#4ade80', desc:'Verde natura sostenibile' },
    { id:'slate',    name:'Slate Pro',      emoji:'🔷', bg:'#0d1117', card:'#161b22', primary:'#7dd3fc', desc:'Professionale stile dev' },
    { id:'aurora',   name:'Aurora Boreale', emoji:'🌌', bg:'#030512', card:'#060a1e', primary:'#a78bfa', desc:'Viola cosmico polare' },
    { id:'latte',    name:'Caffè Latte',    emoji:'☕', bg:'#fdf6ed', card:'#fff8f0', primary:'#7c3a1e', desc:'Light mode caldo artigianale' },
    { id:'tokyo',    name:'Neon Tokyo',     emoji:'🗼', bg:'#020008', card:'#060010', primary:'#f0abfc', desc:'Lilla neon cyberpop' },
    { id:'ghiaccio', name:'Ghiaccio',       emoji:'❄️', bg:'#f8faff', card:'#ffffff', primary:'#3b82f6', desc:'Light mode freddo minimalista' },
    { id:'ingly',    name:'🏷️ Ingly Brand',  emoji:'🔵', bg:'#141820', card:'#1c2330', primary:'#54F2F4', desc:'Colori ufficiali del logo Ingly Design' },
    { id:'nordic',   name:'Nordic Ice',    emoji:'*',  bg:'#060d14', card:'#0a1520', primary:'#38bdf8', desc:'Blu ghiaccio scandinavo' },
    { id:'sakura',   name:'Sakura',         emoji:'+',  bg:'#0d0509', card:'#180a12', primary:'#ec4899', desc:'Rosa giapponese' },
    { id:'olive',    name:'Olive Pro',      emoji:'o',  bg:'#090b06', card:'#111508', primary:'#84cc16', desc:'Verde oliva naturale' },
    { id:'amber',    name:'Amber Studio',   emoji:'~',  bg:'#0c0900', card:'#161000', primary:'#f59e0b', desc:'Ambra calda' },
    { id:'graphite', name:'Graphite',       emoji:'-',  bg:'#111111', card:'#1a1a1a', primary:'#e2e8f0', desc:'Grigio minimalista' },
    { id:'neongreen',name:'Neon Green',     emoji:'@',  bg:'#000000', card:'#020d02', primary:'#4ade80', desc:'Verde neon' },
  ],

  current: 'default',

  init() {
    const saved = localStorage.getItem('ingly_theme') || 'default';
    this.apply(saved, false);
    this.renderSwatches();
  },

  FONTS: [
    { id:'inter',  name:'Inter',    stack:"'Inter',system-ui,sans-serif",  label:'Moderno' },
    { id:'outfit', name:'Outfit',   stack:"'Outfit',system-ui,sans-serif", label:'Geometrico' },
    { id:'poppins',name:'Poppins',  stack:"'Poppins',system-ui,sans-serif",label:'Ampio' },
    { id:'dm',     name:'DM Sans',  stack:"'DM Sans',system-ui,sans-serif",label:'Umanistico' },
    { id:'system', name:'Sistema',  stack:'system-ui,sans-serif',          label:'Nativo' },
  ],
  _currentFont: 'inter',
  applyFont(id, save=true) {
    const f = (this.FONTS||[]).find(x=>x.id===id)||this.FONTS[0];
    document.documentElement.style.setProperty('--font-body', f.stack);
    if (save) localStorage.setItem('ingly_font', id);
    this._currentFont = id;
    // Update font grid if open
    const sfg = document.getElementById('settings-font-grid');
    if (sfg) this._renderFontGrid(sfg);
    const pv = document.getElementById('font-preview-text');
    if (pv) pv.style.fontFamily = f.stack;
    toast('Font: ' + f.name, 'success');
  },
  initFont() {
    const saved = localStorage.getItem('ingly_font') || 'inter';
    this.applyFont(saved, false);
  },
  _renderFontGrid(container) {
    const curF = this._currentFont || 'inter';
    container.innerHTML = (this.FONTS||[]).map(function(f) {
      return '<div onclick="ThemeSwitcher.applyFont(\'' + f.id + '\')" style="cursor:pointer;padding:12px 14px;border-radius:10px;background:' + (curF===f.id?'var(--primary-dim)':'var(--bg-card2)') + ';border:2px solid ' + (curF===f.id?'var(--primary)':'var(--border)') + '">'
        + '<div style="font-family:' + f.stack + ';font-size:18px;font-weight:700;color:var(--text);margin-bottom:3px">Aa ' + f.name + '</div>'
        + '<div style="font-size:10px;color:var(--text-muted)">' + f.label + '</div>'
        + (curF===f.id ? '<div style="font-size:9px;color:var(--primary);margin-top:3px;font-weight:700">Attivo</div>' : '')
        + '</div>';
    }).join('');
  },
  apply(themeId, save = true) {
    const theme = this.THEMES.find(t => t.id === themeId) || this.THEMES[0];
    document.documentElement.setAttribute('data-theme', themeId === 'default' ? '' : themeId);
    this.current = themeId;
    if (save) localStorage.setItem('ingly_theme', themeId);

    // Update topbar button accent
    const btn = eid('theme-toggle-btn');
    if (btn) btn.style.borderColor = theme.primary + '60';

    // Update active state in all swatch grids
    document.querySelectorAll('.theme-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.theme === themeId);
    });

    // Update current name label
    const nameEl = eid('theme-current-name');
    if (nameEl) nameEl.textContent = theme.emoji + ' ' + theme.name;
  },

  renderSwatches() {
    const targets = ['theme-swatches', 'settings-theme-grid'];
    targets.forEach(targetId => {
      const container = eid(targetId);
      if (!container) return;

      if (targetId === 'theme-swatches') {
        // Compact grid for topbar panel
        container.innerHTML = this.THEMES.map(t => `
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
            <div class="theme-swatch ${this.current === t.id ? 'active' : ''}"
              data-theme="${t.id}"
              onclick="ThemeSwitcher.apply('${t.id}')"
              style="background:linear-gradient(135deg,${t.bg} 50%,${t.card} 50%);border-color:${t.primary}40"
              title="${t.name}">
              <div style="width:14px;height:14px;border-radius:50%;background:${t.primary};box-shadow:0 0 6px ${t.primary}88"></div>
            </div>
            <div class="theme-name">${t.emoji}</div>
          </div>`).join('');
      } else {
        // Full card grid for settings
        container.innerHTML = this.THEMES.map(t => `
          <div onclick="ThemeSwitcher.apply('${t.id}')"
            data-theme="${t.id}"
            class="theme-swatch ${this.current === t.id ? 'active' : ''}"
            style="aspect-ratio:unset;padding:12px 10px;background:${t.bg};border-color:${this.current === t.id ? t.primary : t.primary + '30'};border-radius:var(--radius);display:flex;flex-direction:column;gap:6px;align-items:flex-start;cursor:pointer;transition:.2s"
            title="${t.desc}">
            <div style="display:flex;align-items:center;gap:8px;width:100%">
              <div style="width:20px;height:20px;border-radius:50%;background:${t.primary};box-shadow:0 0 8px ${t.primary}88;flex-shrink:0"></div>
              <div style="font-size:12px;font-weight:700;color:${t.primary};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.emoji} ${t.name}</div>
              ${this.current === t.id ? `<div style="margin-left:auto;color:${t.primary};font-size:14px">✓</div>` : ''}
            </div>
            <div style="display:flex;gap:4px;width:100%">
              <div style="flex:1;height:6px;border-radius:3px;background:${t.bg};border:1px solid ${t.primary}40"></div>
              <div style="flex:1;height:6px;border-radius:3px;background:${t.card}"></div>
              <div style="flex:1;height:6px;border-radius:3px;background:${t.primary}"></div>
            </div>
            <div style="font-size:10px;color:${t.primary}88;line-height:1.3">${t.desc}</div>
          </div>`).join('');
      }
    });
    // Render font grid in settings
    const sfg = document.getElementById('settings-font-grid');
    if (sfg) this._renderFontGrid(sfg);
    const pv = document.getElementById('font-preview-text');
    if (pv) {
      const curF = this._currentFont || localStorage.getItem('ingly_font') || 'inter';
      const ff = (this.FONTS||[]).find(x=>x.id===curF)||{stack:"'Inter',system-ui,sans-serif"};
      pv.style.fontFamily = ff.stack;
    }
  },

  togglePanel() {
    const panel = eid('theme-picker-panel');
    if (!panel) return;
    panel.classList.toggle('open');
    this.renderSwatches();
    if (panel.classList.contains('open')) {
      // Close on outside click
      setTimeout(() => {
        document.addEventListener('click', function close(e) {
          if (!panel.contains(e.target) && e.target.id !== 'theme-toggle-btn') {
            panel.classList.remove('open');
          }
          document.removeEventListener('click', close);
        });
      }, 50);
    }
  }
};

// ============================================================
// INGLY MASTER 27.0 — NUOVE FUNZIONALITÀ
// ============================================================

// ===== ① NOTIFICATION CENTER =====
const Notifications = {
  panel: null,
  async getAll() {
    const [quotes, clients, sales, cashflow] = await Promise.all([
      IDB.getAll('quotes'), IDB.getAll('clients'), IDB.getAll('sales'), IDB.getAll('cashflow')
    ]);
    const notifs = [];
    const now = new Date();
    // Quotes waiting > 5 days
    quotes.filter(q => q.status === 'inviato' || q.status === 'bozza').forEach(q => {
      const d = new Date(q.date || q.created);
      const days = Math.floor((now - d) / 86400000);
      if (days >= 5) notifs.push({ type: 'warning', icon: '📋', msg: `Preventivo "${q.title || q.client}" in attesa da ${days} giorni`, section: 'quoter', time: d });
    });
    // Clients inactive > 60 days
    for (const c of clients) {
      const lastSale = sales.filter(s => s.client === c.id || s.client === c.name).sort((a,b) => new Date(b.date) - new Date(a.date))[0];
      if (lastSale) {
        const days = Math.floor((now - new Date(lastSale.date)) / 86400000);
        if (days >= 60) notifs.push({ type: 'info', icon: '👤', msg: `${c.name} non ordina da ${days} giorni`, section: 'clients', time: new Date(lastSale.date) });
      }
    }
    // VAT deadline check (quarterly)
    const month = now.getMonth() + 1;
    const vatMonths = [1, 4, 7, 10]; // IVA trimestrale
    const nextVat = vatMonths.find(m => m > month) || vatMonths[0];
    const daysToVat = Math.floor((new Date(now.getFullYear(), nextVat - 1, 16) - now) / 86400000);
    if (daysToVat >= 0 && daysToVat <= 7) notifs.push({ type: 'danger', icon: '🏛️', msg: `Scadenza IVA tra ${daysToVat} giorni`, section: 'cashflow', time: now });
    // Upcoming bookings
    const bookings = await IDB.getAll('bookings').catch(() => []);
    bookings.filter(b => {
      const d = new Date(b.date + 'T' + (b.time || '00:00'));
      const diff = Math.floor((d - now) / 86400000);
      return diff >= 0 && diff <= 2;
    }).forEach(b => {
      notifs.push({ type: 'info', icon: '📅', msg: `Appuntamento: ${b.title} il ${b.date}`, section: 'booking', time: new Date(b.date) });
    });
    // v3.9: Orders overdue - check pipeline as source of truth
    const rawOrd = await AppStore.get('orders').catch(()=>[]);
    const rawPl = await AppStore.get('pipeline').catch(()=>[]);
    const allOrd = rawPl.length>0?rawPl:rawOrd;
    allOrd.filter(function(o){
      const stage=o.stage||o.status||'';
      const due=o.dueDate||o.deadline||'';
      return !['paid','delivered','rejected','lost','consegnato'].includes(stage)&&due&&new Date(due)<now;
    }).forEach(function(o){
      const late=Math.floor((now-new Date(o.dueDate||o.deadline))/86400000);
      notifs.push({type:'danger',icon:'warning',msg:'Ordine "'+(o.name||o.title||'#'+o.id)+'" scaduto da '+late+'g',section:'gestione_ordini',time:new Date(o.dueDate||o.deadline)});
    });
    return notifs.sort((a,b) => b.time - a.time).slice(0, 20);
  },
  _tab: 'all',

  async update() {
    const all = await this.getAll();
    const tab = this._tab || 'all';
    const notifs = tab==='all' ? all : all.filter(function(n){return n.type===tab;});
    const count = all.length;
    const b = document.getElementById('notif-count');
    if (b) { b.textContent=count; b.style.display=count>0?'':'none'; }
    const ub = document.getElementById('notif-unread-badge');
    if (ub) { ub.textContent=count; ub.style.display=count>0?'':'none'; }
    const list = document.getElementById('notif-list');
    if (!list) return;
    list.innerHTML = '';
    if (!notifs.length) {
      list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted)"><div style="font-size:28px;opacity:.4;margin-bottom:8px">&#9989;</div><div style="font-size:13px;font-weight:600">Tutto sotto controllo!</div></div>';
      return;
    }
    const colors = {danger:'#ef4444',warning:'#f97316',info:'#3b82f6',success:'#22c55e'};
    notifs.forEach(function(n) {
      const col = colors[n.type] || '#94a3b8';
      const row = document.createElement('div');
      row.className = 'notif-item';
      row.style.cssText = 'display:flex;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer';
      if (n.section) row.onclick = function(){ App.navigate(n.section); document.getElementById('notif-panel').style.display='none'; };
      const ic = document.createElement('div');
      ic.style.cssText = 'width:32px;height:32px;border-radius:50%;background:'+col+'18;border:1px solid '+col+'40;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0';
      ic.textContent = n.icon || '&#x1F514;';
      const tx = document.createElement('div');
      tx.style.cssText = 'flex:1;min-width:0';
      const mg = document.createElement('div');
      mg.style.cssText = 'font-size:12px;font-weight:600;color:var(--text);line-height:1.4';
      mg.textContent = n.msg;
      tx.appendChild(mg);
      if (n.time) {
        const ts = document.createElement('div');
        ts.style.cssText = 'font-size:10px;color:var(--text-dim);margin-top:2px';
        ts.textContent = new Date(n.time).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
        tx.appendChild(ts);
      }
      const dot = document.createElement('div');
      dot.style.cssText = 'width:6px;height:6px;border-radius:50%;background:'+col+';flex-shrink:0;margin-top:6px';
      row.append(ic,tx,dot);
      list.appendChild(row);
    });
  },
  toggle() {
    const p = eid('notif-panel');
    if (!p) return;
    p.style.display = p.style.display === 'none' ? '' : 'none';
    if (p.style.display !== 'none') this.update();
  },
  markAllRead() { const p = eid('notif-panel'); if(p) p.style.display='none'; const b=eid('notif-count');if(b){b.textContent='0';b.style.display='none';}const ub=eid('notif-unread-badge');if(ub){ub.textContent='0';ub.style.display='none';} },
  goTo(section) { App.navigate(section); const p=eid('notif-panel'); if(p) p.style.display='none'; }
};
// Close notifications panel on outside click
document.addEventListener('click',function(e){
  const panel=document.getElementById('notif-panel');
  const btn=document.getElementById('notif-btn');
  if(panel&&panel.style.display!=='none'&&!panel.contains(e.target)&&e.target!==btn&&!btn?.contains(e.target)){
    panel.style.display='none';
  }
},true);
// Auto-refresh notification badge every 5 minutes
setInterval(function(){if(typeof Notifications!=='undefined')Notifications.update();},300000);

// ===== ② PRODUCTION TIMER =====
const Timer = {
  timers: {},
  async start(id, type) {
    const key = `${type}-${id}`;
    if (this.timers[key]) return;
    this.timers[key] = { start: Date.now(), interval: setInterval(() => this.tick(key, id, type), 1000) };
    toast('⏱️ Timer avviato!', 'success');
    this.updateBtn(key, true);
  },
  async stop(id, type) {
    const key = `${type}-${id}`;
    const t = this.timers[key];
    if (!t) return;
    clearInterval(t.interval);
    const elapsed = Math.floor((Date.now() - t.start) / 60000);
    delete this.timers[key];
    // Save to order/project
    const store = type === 'order' ? 'orders' : 'projects';
    const item = await IDB.get(store, id);
    if (item) {
      item.actualTime = (item.actualTime || 0) + elapsed;
      await IDB.put(store, item);
      const diff = item.estimatedTime ? item.actualTime - item.estimatedTime : null;
      toast(`⏱️ +${elapsed}min registrati. Totale: ${item.actualTime}min${diff !== null ? `. Diff: ${diff > 0 ? '+' : ''}${diff}min` : ''}`, 'info');
    }
    this.updateBtn(key, false);
  },
  tick(key, id, type) {
    const t = this.timers[key];
    if (!t) return;
    const secs = Math.floor((Date.now() - t.start) / 1000);
    const btn = eid(`timer-btn-${key}`);
    if (btn) btn.innerHTML = `<i class="fas fa-stop"></i> ${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;
  },
  updateBtn(key, running) {
    const btn = eid(`timer-btn-${key}`);
    if (!btn) return;
    btn.style.background = running ? '#ef4444' : '';
    if (!running) btn.innerHTML = '<i class="fas fa-play"></i> Timer';
  },
  isRunning(key) { return !!this.timers[key]; },
  renderBtn(id, type) {
    const key = `${type}-${id}`;
    const running = this.isRunning(key);
    return `<button id="timer-btn-${key}" class="btn btn-sm" style="background:${running?'#ef4444':'var(--primary)'}" onclick="${running?'Timer.stop':'Timer.start'}('${id}','${type}')">
      <i class="fas fa-${running?'stop':'play'}"></i> ${running?'Stop':'Timer'}
    </button>`;
  }
};

// ===== ③ ORDERS KANBAN =====
const Booking = {
  async render() {
    const el = eid('view-booking');
    if (!el) return;
    const bookings = await IDB.getAll('bookings').catch(() => []);
    const now = new Date();
    const sorted = [...bookings].sort((a,b) => new Date(a.date+'T'+(a.time||'00:00')) - new Date(b.date+'T'+(b.time||'00:00')));
    const upcoming = sorted.filter(b => new Date(b.date+'T'+(b.time||'23:59')) >= now);
    const past = sorted.filter(b => new Date(b.date+'T'+(b.time||'23:59')) < now).reverse();
    
    el.innerHTML = `
      <div class="module-header">
        <div class="module-title"><i class="fas fa-calendar-check"></i> Booking & Appuntamenti</div>
        <div class="module-actions"><button class="btn btn-primary btn-sm" onclick="Booking.openNew()"><i class="fas fa-plus"></i> Nuovo Appuntamento</button></div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title">📅 Prossimi Appuntamenti (${upcoming.length})</div>
          ${!upcoming.length ? '<div style="color:var(--text-muted);text-align:center;padding:20px">Nessun appuntamento in programma</div>' :
            upcoming.map(b => this.renderCard(b, false)).join('')}
        </div>
        <div class="card">
          <div class="card-title">📁 Storico (${past.length})</div>
          ${!past.length ? '<div style="color:var(--text-muted);text-align:center;padding:20px">Nessuno storico</div>' :
            past.slice(0, 5).map(b => this.renderCard(b, true)).join('')}
        </div>
      </div>`;
  },

  renderCard(b, isPast) {
    const d = new Date(b.date + 'T' + (b.time || '00:00'));
    const now = new Date();
    const hoursLeft = Math.floor((d - now) / 3600000);
    const typeEmoji = {Consegna:'📦',Sopralluogo:'🏠','Consulenza Wedding':'💍',Videocall:'💻',Altro:'📌'}[b.type] || '📌';
    return `<div style="background:var(--bg-card2);border-radius:8px;padding:12px;margin-bottom:8px;${isPast?'opacity:0.6':''}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong style="font-size:13px">${typeEmoji} ${b.title}</strong>
        <button onclick="Booking.del('${b.id}')" style="background:none;border:none;color:#ef4444;cursor:pointer"><i class="fas fa-trash"></i></button>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
        📆 ${b.date} ${b.time || ''} ${b.location ? '| 📍 '+b.location : ''}
        ${b.client ? '| 👤 '+b.client : ''}
      </div>
      ${!isPast && hoursLeft >= 0 && hoursLeft <= 24 ? `<div style="font-size:12px;color:#f59e0b;margin-top:4px">⚡ Tra ${hoursLeft}h!</div>` : ''}
      ${b.notes ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${b.notes}</div>` : ''}
      ${!isPast ? `<div style="margin-top:8px;display:flex;gap:6px">
        <button class="btn btn-sm" onclick="Booking.sendReminder('${b.id}')" style="background:#25d366;color:#fff"><i class="fab fa-whatsapp"></i> Promemoria</button>
        <button class="btn btn-primary btn-sm" onclick="Booking.markDone('${b.id}')">✅ Fatto</button>
      </div>` : ''}
    </div>`;
  },

  openNew() {
    eid('bk-title').value = '';
    eid('bk-date').value = new Date().toISOString().split('T')[0];
    eid('bk-notes').value = '';
    eid('bk-location').value = '';
    openModal('booking');
    App.populateClientSelects();
  },

  async save() {
    const title = eid('bk-title').value.trim();
    const date = eid('bk-date').value;
    if (!title || !date) { toast('Titolo e data sono obbligatori', 'warning'); return; }
    const clients = await AppStore.get('clients');
    const selClient = eid('bk-client').value;
    const clientName = clients.find(c => c.id == selClient)?.name || '';
    await IDB.put('bookings', {
      id: Date.now().toString(),
      title, date, type: eid('bk-type').value,
      time: eid('bk-time').value,
      client: clientName,
      location: eid('bk-location').value,
      notes: eid('bk-notes').value,
      created: new Date().toISOString()
    });
    closeModal('booking');
    toast('✅ Appuntamento salvato!', 'success');
    this.render();
  },

  async del(id) {
    if (!confirm('Eliminare appuntamento?')) return;
    await IDB.del('bookings', id).catch(e=>console.warn('[IDB.del]',e));
    this.render();
  },

  async markDone(id) {
    const b = await IDB.get('bookings', id);
    if (b) { b.done = true; b.date = '2000-01-01'; await IDB.put('bookings', b); }
    this.render();
  },

  async sendReminder(id) {
    const b = await IDB.get('bookings', id);
    if (!b) return;
    const msg = encodeURIComponent(`Ciao! Ti ricordo il nostro appuntamento: "${b.title}" il ${b.date} alle ${b.time||''}${b.location?' presso '+b.location:''}. A presto! 🎨`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }
};

// ===== ⑤ AI RECEIPT SCANNER =====
const Scanner = {
  render() {
    const el = eid('view-scanner');
    if (!el) return;
    el.innerHTML = `
      <div class="module-header"><div class="module-title"><i class="fas fa-camera"></i> Scanner Spese AI</div></div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title">📸 Scansiona Scontrino</div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Carica la foto di uno scontrino o ricevuta. L'AI estrae automaticamente importo, data e fornitore.</p>
          <div style="border:2px dashed var(--border);border-radius:12px;padding:40px;text-align:center;cursor:pointer;margin-bottom:16px" onclick="eid('receipt-file').click()">
            <div style="font-size:48px">📷</div>
            <div style="color:var(--text-muted);font-size:14px;margin-top:8px">Clicca per caricare foto</div>
            <div style="color:var(--text-muted);font-size:12px">JPG, PNG supportati</div>
          </div>
          <input type="file" id="receipt-file" accept="image/*" style="display:none" onchange="Scanner.analyze(this.files[0])">
          <div id="scanner-preview" style="margin-bottom:12px"></div>
          <div id="scanner-result" style="display:none">
            <div class="card-title">Dati Estratti</div>
            <div class="form-group"><label class="form-label">Importo (€)</label><input class="form-control" id="sc-amount" type="number" step="0.01"></div>
            <div class="form-group"><label class="form-label">Data</label><input class="form-control" id="sc-date" type="date"></div>
            <div class="form-group"><label class="form-label">Fornitore</label><input class="form-control" id="sc-vendor"></div>
            <div class="form-group"><label class="form-label">Categoria</label>
              <select class="form-control" id="sc-cat">
                <option value="fixed">Costo Fisso</option><option value="cashflow">Uscita Cashflow</option>
              </select>
            </div>
            <div style="display:flex;gap:8px;margin-top:12px">
              <button class="btn btn-primary" onclick="Scanner.saveExpense()"><i class="fas fa-save"></i> Salva Spesa</button>
              <button class="btn btn-secondary" onclick="eid('scanner-result').style.display='none'">Annulla</button>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">📋 Spese Recenti Scansionate</div>
          <div id="scanner-history"></div>
        </div>
      </div>`;
    this.loadHistory();
  },

  async analyze(file) {
    if (!file) return;
    const preview = eid('scanner-preview');
    const reader = new FileReader();
    reader.onload = async (e) => {
      preview.innerHTML = `<img src="${e.target.result}" style="width:100%;max-height:200px;object-fit:contain;border-radius:8px;margin-bottom:12px">`;
      toast('🔍 Analisi in corso...', 'info');
      try {
        const base64 = e.target.result.split(',')[1];
        const _scanPrompt = 'Analizza questo scontrino/ricevuta e rispondi SOLO in JSON con: {"amount": numero, "date": "YYYY-MM-DD", "vendor": "nome fornitore", "description": "breve desc"}. Se non riesci a leggere un campo usa null.';
        const text = await AIProvider.callVision(_scanPrompt, base64, file.type || 'image/jpeg', 500).catch(() => '{}');
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        eid('sc-amount').value = parsed.amount || '';
        eid('sc-date').value = parsed.date || new Date().toISOString().split('T')[0];
        eid('sc-vendor').value = parsed.vendor || parsed.description || '';
        eid('scanner-result').style.display = '';
        toast('✅ Dati estratti! Verifica e salva.', 'success');
      } catch (err) {
        // Fallback: manual entry
        eid('sc-date').value = new Date().toISOString().split('T')[0];
        eid('sc-amount').value = '';
        eid('sc-vendor').value = '';
        eid('scanner-result').style.display = '';
        toast('Inserisci i dati manualmente', 'warning');
      }
    };
    reader.readAsDataURL(file);
  },

  async saveExpense() {
    const amount = parseFloat(eid('sc-amount').value);
    if (!amount) { toast('Importo obbligatorio', 'warning'); return; }
    const cat = eid('sc-cat').value;
    const entry = {
      id: Date.now().toString(),
      amount, date: eid('sc-date').value,
      vendor: eid('sc-vendor').value,
      scanned: true, created: new Date().toISOString()
    };
    if (cat === 'fixed') {
      await IDB.put('fixed_costs', { ...entry, name: entry.vendor, category: 'altro', frequency: 'una_tantum', monthly: amount });
    } else {
      await IDB.put('cashflow', { ...entry, type: 'uscita', desc: entry.vendor, category: 'spese' });
    }
    await IDB.put('scanner_history', entry).catch(()=>{});
    toast('✅ Spesa salvata!', 'success');
    eid('scanner-result').style.display = 'none';
    const _sp=eid('scanner-preview'); if(_sp) _sp.innerHTML = '';
    this.loadHistory();
  },

  async loadHistory() {
    const hist = await IDB.getAll('scanner_history').catch(() => []);
    const el = eid('scanner-history');
    if (!el) return;
    const sorted = hist.sort((a,b) => new Date(b.created) - new Date(a.created)).slice(0, 10);
    el.innerHTML = !sorted.length ? '<div style="color:var(--text-muted);text-align:center;padding:20px">Nessuna spesa scansionata</div>' :
      sorted.map(h => `<div style="background:var(--bg-card2);border-radius:8px;padding:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:13px;font-weight:600">${h.vendor || 'Spesa'}</div>
          <div style="font-size:12px;color:var(--text-muted)">${h.date}</div>
        </div>
        <div style="color:#ef4444;font-weight:700">-€${parseFloat(h.amount).toFixed(2)}</div>
      </div>`).join('');
  }
};

// ===== ⑥ MONTHLY PDF REPORT =====
const Reports = {
  render() {
    const el = eid('view-reports');
    if (!el) return;
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleDateString('it-IT', {month:'long',year:'numeric'}), value: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` });
    }
    el.innerHTML = `
      <div class="module-header"><div class="module-title"><i class="fas fa-file-pdf"></i> Report Mensile PDF</div></div>
      <div class="card" style="max-width:600px">
        <div class="card-title">📊 Genera Report Professionale</div>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Crea un report PDF completo con revenue, clienti, cashflow e KPI. Perfetto per il commercialista.</p>
        <div class="form-group">
          <label class="form-label">Mese di riferimento</label>
          <select class="form-control" id="rep-month">
            ${months.map(m => `<option value="${m.value}">${m.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Elementi da includere</label>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
            ${['revenue','clients','cashflow','kpi','products'].map(k => `
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="rep-${k}" checked style="width:16px;height:16px">
                <span style="font-size:13px">${{revenue:'💰 Fatturato & Vendite',clients:'👥 Nuovi Clienti',cashflow:'💸 Cashflow',kpi:'📈 KPI principali',products:'🏷️ Prodotti Top'}[k]}</span>
              </label>`).join('')}
          </div>
        </div>
        <button class="btn btn-primary" onclick="Reports.generate()" style="width:100%;margin-top:8px">
          <i class="fas fa-file-pdf"></i> Genera Report PDF
        </button>
      </div>`;
  },

  async generate() {
    const month = eid('rep-month').value;
    const [year, mon] = month.split('-').map(Number);
    toast('📄 Generazione report...', 'info');
    const [sales, cashflow, clients, quotes] = await Promise.all([
      IDB.getAll('sales'), IDB.getAll('cashflow'), IDB.getAll('clients'), IDB.getAll('quotes')
    ]);
    const mSales = sales.filter(s => s.date?.startsWith(month));
    const mCF = cashflow.filter(c => c.date?.startsWith(month));
    const revenue = mSales.reduce((s, v) => s + parseFloat(v.amount || 0), 0);
    const expenses = mCF.filter(c => c.type === 'uscita').reduce((s,v) => s+parseFloat(v.amount||0), 0);
    const income = mCF.filter(c => c.type === 'entrata').reduce((s,v) => s+parseFloat(v.amount||0), 0);
    const newClients = clients.filter(c => c.created?.startsWith(month)).length;
    const monthName = new Date(year, mon-1).toLocaleDateString('it-IT', {month:'long', year:'numeric'});

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;
    const addText = (text, x, size=10, style='normal', color=[50,50,50]) => {
      doc.setFontSize(size); doc.setFont('helvetica', style); doc.setTextColor(...color); doc.text(text, x, y);
    };
    // Header
    doc.setFillColor(139, 92, 246); doc.rect(0, 0, 210, 30, 'F');
    doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(255,255,255);
    doc.text('INGLY — REPORT MENSILE', 15, 18);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text(monthName.toUpperCase(), 15, 26);
    y = 45;
    // KPI boxes
    const boxes = [
      { label: 'Fatturato', val: `€${revenue.toFixed(2)}`, color: [16, 185, 129] },
      { label: 'Spese', val: `€${expenses.toFixed(2)}`, color: [239, 68, 68] },
      { label: 'Margine', val: `€${(revenue - expenses).toFixed(2)}`, color: [59, 130, 246] },
      { label: 'N. Vendite', val: String(mSales.length), color: [139, 92, 246] },
    ];
    boxes.forEach((b, i) => {
      const x = 15 + i * 47;
      doc.setFillColor(...b.color); doc.roundedRect(x, y, 42, 22, 3, 3, 'F');
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255,255,255);
      doc.text(b.val, x+5, y+13);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(b.label, x+5, y+19);
    });
    y += 32;
    if (eid('rep-revenue')?.checked && mSales.length) {
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(50,50,50);
      doc.text('VENDITE DEL MESE', 15, y); y += 8;
      doc.autoTable({
        startY: y, head: [['Data','Cliente','Descrizione','€']],
        body: mSales.map(s => [s.date, s.client||'-', s.desc||'-', `€${parseFloat(s.amount||0).toFixed(2)}`]),
        theme: 'striped', headStyles: { fillColor: [139,92,246] }, margin: { left: 15, right: 15 }
      });
      y = doc.lastAutoTable.finalY + 10;
    }
    if (eid('rep-cashflow')?.checked && mCF.length) {
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(50,50,50);
      doc.text('CASHFLOW', 15, y); y += 8;
      doc.autoTable({
        startY: y, head: [['Data','Tipo','Descrizione','€']],
        body: mCF.map(c => [c.date, c.type, c.desc||'-', `${c.type==='entrata'?'+':'-'}€${parseFloat(c.amount||0).toFixed(2)}`]),
        theme: 'striped', headStyles: { fillColor: [59,130,246] }, margin: { left: 15, right: 15 }
      });
      y = doc.lastAutoTable.finalY + 10;
    }
    // Footer
    const pageH = doc.internal.pageSize.height;
    doc.setFontSize(8); doc.setTextColor(150,150,150);
    doc.text(`Report generato da INGLY MASTER 27.0 — ${new Date().toLocaleDateString('it-IT')}`, 15, pageH - 10);
    doc.save(`report-${month}.pdf`);
    toast('✅ Report PDF scaricato!', 'success');
  }
};

// ===== ⑦ SHAREABLE QUOTE (QR + Web link) =====
const Goals = {
  async getWeekStats() {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1); weekStart.setHours(0,0,0,0);
    const weekStr = weekStart.toISOString().split('T')[0];
    const [orders, sales, quotes, clients] = await Promise.all([
      IDB.getAll('orders').catch(() => []),
      IDB.getAll('sales'),
      IDB.getAll('quotes'),
      IDB.getAll('clients')
    ]);
    const DONE_STATUSES=['delivered','consegnato','completato','done','venduto','paid','completed'];
    const weekOrders = orders.filter(o => DONE_STATUSES.includes((o.status||o.stage||'').toLowerCase()) && (o.created||o.date||'') >= weekStr).length;
    const weekSales = sales.filter(s => s.date >= weekStr).length;
    const weekQuotes = quotes.filter(q => q.created >= weekStr || q.date >= weekStr).length;
    const weekClients = clients.filter(c => c.created >= weekStr).length;
    const weekRevenue = sales.filter(s => s.date >= weekStr).reduce((s,v) => s+parseFloat(v.amount||0), 0);
    return { weekOrders, weekSales, weekQuotes, weekClients, weekRevenue };
  },

  _GOALS_SK: 'ingly_goals_targets_v2',
  getTargets(){
    try{ return JSON.parse(localStorage.getItem(this._GOALS_SK)||'null'); }catch{return null;}
  },
  saveTargets(t){ localStorage.setItem(this._GOALS_SK,JSON.stringify(t)); },
  openTargetEditor(){
    const t=this.getTargets()||{orders:5,sales:8,quotes:3,clients:2,revenue:500};
    const ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.onclick=e=>{if(e.target===ov)ov.remove();};
    ov.innerHTML=`<div style="background:var(--bg-card);border-radius:14px;width:min(380px,100%);padding:20px;border:1px solid var(--border2)" onclick="event.stopPropagation()">
      <div style="font-size:15px;font-weight:800;margin-bottom:14px">🎯 Obiettivi Settimana — Imposta target</div>
      ${[['orders','📦 Ordini da consegnare',t.orders],['sales','💰 Vendite',t.sales],['quotes','📋 Preventivi',t.quotes],['clients','👤 Nuovi clienti',t.clients],['revenue','💵 Revenue (€)',t.revenue]].map(([k,l,v])=>`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <label style="flex:1;font-size:12px">${l}</label>
        <input id="gt-${k}" type="number" min="0" value="${v}" style="width:80px;padding:5px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:13px;text-align:center">
      </div>`).join('')}
      <div style="display:flex;gap:8px;margin-top:14px">
        <button onclick="this.closest('[style*=fixed]').remove()" style="flex:1;padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px">Annulla</button>
        <button onclick="Goals.saveTargets({orders:+document.getElementById('gt-orders').value,sales:+document.getElementById('gt-sales').value,quotes:+document.getElementById('gt-quotes').value,clients:+document.getElementById('gt-clients').value,revenue:+document.getElementById('gt-revenue').value});this.closest('[style*=fixed]').remove();Goals.refresh()" style="flex:2;padding:9px;background:var(--primary);color:#000;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">💾 Salva target</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
  },

  async renderWidget() {
    const s = await this.getWeekStats();
    const t = this.getTargets() || {orders:5,sales:8,quotes:3,clients:2,revenue:500};
    const goals = [
      { label: 'Ordini consegnati', current: s.weekOrders, target: t.orders, icon: '📦' },
      { label: 'Vendite', current: s.weekSales, target: t.sales, icon: '💰' },
      { label: 'Preventivi', current: s.weekQuotes, target: t.quotes, icon: '📋' },
      { label: 'Nuovi clienti', current: s.weekClients, target: t.clients, icon: '👤' },
    ];
    const totalDone = goals.reduce((s,g) => s + Math.min(g.current, g.target), 0);
    const totalTarget = goals.reduce((s,g) => s + g.target, 0);
    const pct = Math.round(totalDone / totalTarget * 100);
    const streak = this.calcStreak();
    const badge = pct >= 100 ? '🏆 Settimana Perfetta!' : pct >= 75 ? '🔥 Ottimo lavoro!' : pct >= 50 ? '💪 Continua così!' : '🚀 Inizia la settimana!';
    return `<div class="card" style="margin-bottom:16px">
      <div class="card-title">🎯 Obiettivi Settimana ${badge}</div>
      <div style="background:var(--bg-card2);border-radius:8px;height:8px;margin-bottom:12px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#8b5cf6,#06b6d4);transition:width .5s"></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px">
        ${goals.map(g => {
          const p = g.target>0 ? Math.min(Math.round(g.current/g.target*100), 100) : 0;
          const done = p>=100;
          const barColor = done?'#10b981':p>=60?'#8b5cf6':p>=30?'#f59e0b':'#6366f1';
          return `<div style="background:var(--bg-card2);border-radius:9px;padding:10px 12px;border:1px solid ${done?'rgba(16,185,129,.2)':'var(--border)'};transition:.2s">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-size:12px;display:flex;align-items:center;gap:5px;font-weight:600">${g.icon} ${g.label}</span>
              <span style="font-size:11px;font-weight:800;color:${done?'#10b981':barColor}">
                ${done?'✅ ':''} ${g.current}<span style="color:var(--text-dim);font-weight:400">/${g.target}</span>
              </span>
            </div>
            <div style="background:var(--border);border-radius:99px;height:6px;overflow:hidden">
              <div style="height:100%;width:${p}%;background:linear-gradient(90deg,${barColor}99,${barColor});border-radius:99px;transition:width .5s cubic-bezier(.34,1.56,.64,1)"></div>
            </div>
            ${p>0&&p<100?`<div style="font-size:9px;color:var(--text-dim);margin-top:2px">${p}% — ancora ${g.target-g.current} ${g.label.toLowerCase()}</div>`:''}
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;flex-wrap:wrap;gap:6px">
        <span style="color:var(--text-muted)">💵 Revenue: <strong style="color:#10b981">€${s.weekRevenue.toFixed(0)}</strong><span style="color:var(--text-dim)"> / €${(t.revenue||500)}</span></span>
        <div style="display:flex;align-items:center;gap:10px">
          <span>🔥 Streak: <strong>${streak}</strong> ${streak===1?'giorno':'giorni'}</span>
          <button onclick="event.stopPropagation();Goals.openTargetEditor()" style="padding:3px 9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:10px;color:var(--text-muted)">⚙️ Target</button>
        </div>
      </div>
    </div>`;
  },

  calcStreak() {
    // Simple streak based on localStorage
    const lastActive = localStorage.getItem('ingly_last_active');
    const today = new Date().toISOString().split('T')[0];
    const streak = parseInt(localStorage.getItem('ingly_streak') || '0');
    if (lastActive === today) return streak;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
    const yStr = yesterday.toISOString().split('T')[0];
    const newStreak = lastActive === yStr ? streak + 1 : 1;
    localStorage.setItem('ingly_streak', newStreak);
    localStorage.setItem('ingly_last_active', today);
    return newStreak;
  },

  // ► Auto-refresh every 30s when dashboard is visible
  startAutoRefresh(){
    if(this._refreshTimer) return;
    this._refreshTimer = setInterval(async()=>{
      const dashView = document.getElementById('view-dashboard');
      if(dashView && dashView.classList.contains('active')){
        const el = document.getElementById('goals-weekly-widget');
        if(el && typeof Goals !== 'undefined') el.innerHTML = await Goals.renderWidget();
      }
    }, 30000);
  },

  // ► Instant refresh after any save action
  async refresh(){
    const el = document.getElementById('goals-weekly-widget');
    if(el) el.innerHTML = await this.renderWidget();
  }
};


// ═══════════════════════════════════════════════════════════════════════
// 💡 IDEAS MODULE — Idee & Ispirazione (completo)
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// 💡 IDEAS MODULE v12 — Idee & Ispirazione (FIXED + Export/Import)
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// 💡 IDEAS MODULE v12 PRO — Idee & Ispirazione PROFESSIONAL
// Views: Kanban | Grid  ·  Preferiti · Da URL · Top 20 · Export/Import
// ═══════════════════════════════════════════════════════════════════════
const IdeasModule = {
  _SK:     'ingly_ideas_v2',
  _filter: 'all',
  _search: '',
  _view:   'grid',   // 'grid' | 'kanban'
  _sort:   'newest', // 'newest' | 'priority' | 'alpha'

  _load()   { try{ return JSON.parse(localStorage.getItem(this._SK)||'[]'); }catch{ return []; } },
  _persist(d){ try{ localStorage.setItem(this._SK,JSON.stringify(d)); }catch{} },

  _CATS: [
    {id:'prodotto',  l:'📦 Prodotto',   c:'#7c3aed'},
    {id:'design',    l:'🎨 Design',     c:'#0891b2'},
    {id:'marketing', l:'📣 Marketing',  c:'#be185d'},
    {id:'prezzo',    l:'💰 Prezzo',     c:'#047857'},
    {id:'processo',  l:'⚙️ Processo',   c:'#b45309'},
    {id:'etsy',      l:'🛍️ Etsy',      c:'#e07000'},
    {id:'altro',     l:'✏️ Altro',      c:'#475569'},
  ],
  _PRIS: [
    {id:'alta',  l:'🔴 Alta',   c:'#ef4444'},
    {id:'media', l:'🟡 Media',  c:'#f59e0b'},
    {id:'bassa', l:'🟢 Bassa',  c:'#22c55e'},
  ],

  _filtered(){
    let all = this._load();
    if(this._filter==='preferiti') all = all.filter(i=>i.fav);
    else if(this._filter!=='all')  all = all.filter(i=>i.category===this._filter||i.priority===this._filter||i.status===this._filter);
    if(this._search){
      const q=this._search.toLowerCase();
      all=all.filter(i=>[i.title||'',i.desc||'',i.tags||'',i.url||''].join(' ').toLowerCase().includes(q));
    }
    if(this._sort==='priority'){
      const P={alta:0,media:1,bassa:2};
      all.sort((a,b)=>(P[a.priority||'media']||1)-(P[b.priority||'media']||1));
    } else if(this._sort==='alpha'){
      all.sort((a,b)=>(a.title||'').localeCompare(b.title||''));
    } else {
      all.sort((a,b)=>new Date(b.created||0)-new Date(a.created||0));
    }
    return all;
  },

  async render(){
    const el=document.getElementById('view-ideas');
    if(!el)return;
    const all   = this._load();
    const shown = this._filtered();
    const stats = {
      total:  all.length,
      alta:   all.filter(i=>i.priority==='alta').length,
      fav:    all.filter(i=>i.fav).length,
      done:   all.filter(i=>i.status==='done').length,
      week:   all.filter(i=>(Date.now()-new Date(i.created||0).getTime())<7*864e5).length,
    };
    el.innerHTML = `
<!-- ───────────── HEADER ───────────── -->
<div style="padding:14px 0 10px;max-width:1200px;margin:0 auto">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:42px;height:42px;background:linear-gradient(135deg,#fbbf24,#f59e0b);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">💡</div>
      <div>
        <h1 style="font-size:20px;font-weight:900;margin:0;color:var(--text)">Idee & Ispirazione</h1>
        <p style="font-size:11px;color:var(--text-muted);margin:2px 0 0">Raccogli idee per nuovi prodotti, marketing, processi e design</p>
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button onclick="IdeasModule._setView('kanban')"
        style="padding:7px 13px;background:${this._view==='kanban'?'var(--primary)':'var(--bg-card)'};color:${this._view==='kanban'?'#000':'var(--text-muted)'};border:1px solid ${this._view==='kanban'?'var(--primary)':'var(--border)'};border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px">
        <span style="font-size:14px">☰</span> Kanban
      </button>
      <button onclick="IdeasModule._setView('grid')"
        style="padding:7px 13px;background:${this._view==='grid'?'var(--primary)':'var(--bg-card)'};color:${this._view==='grid'?'#000':'var(--text-muted)'};border:1px solid ${this._view==='grid'?'var(--primary)':'var(--border)'};border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px">
        <span style="font-size:14px">⊞</span> Griglia
      </button>
      <button onclick="IdeasModule._filter='preferiti';IdeasModule.render()"
        style="padding:7px 13px;background:${this._filter==='preferiti'?'#fbbf24':'var(--bg-card)'};color:${this._filter==='preferiti'?'#1a1200':'var(--text-muted)'};border:1px solid ${this._filter==='preferiti'?'#fbbf24':'var(--border)'};border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px">
        ⭐ Preferiti${stats.fav?` <span style="background:rgba(0,0,0,.2);border-radius:99px;padding:0 5px;font-size:10px">${stats.fav}</span>`:''}
      </button>
      <button onclick="IdeasModule.openFromUrl()"
        style="padding:7px 13px;background:var(--bg-card2);color:var(--primary);border:1.5px solid var(--primary);border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px">
        🔗 Da URL
      </button>
      <button onclick="IdeasModule.openNew()"
        style="padding:7px 14px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1a1200;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:800;display:flex;align-items:center;gap:5px">
        + Nuova Idea
      </button>
      <button onclick="IdeasModule.showTop20()"
        style="padding:7px 13px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1a1200;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:800;display:flex;align-items:center;gap:5px">
        ⭐ Top 20 Prodotti
      </button>
    </div>
  </div>

  <!-- KPI Strip -->
  <div style="display:flex;gap:8px;margin-bottom:14px;overflow-x:auto;padding-bottom:2px">
    ${[
      {l:'Totale',v:all.length,c:'#fbbf24',ico:'💡'},
      {l:'Alta priorità',v:stats.alta,c:'#ef4444',ico:'🔴'},
      {l:'Preferiti',v:stats.fav,c:'#f59e0b',ico:'⭐'},
      {l:'Completate',v:stats.done,c:'#22c55e',ico:'✅'},
      {l:'Questa settimana',v:stats.week,c:'#818cf8',ico:'📅'},
    ].map(k=>`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:8px;flex-shrink:0;min-width:130px">
      <span style="font-size:18px">${k.ico}</span>
      <div><div style="font-size:17px;font-weight:900;color:${k.c};line-height:1">${k.v}</div><div style="font-size:9px;color:var(--text-muted);margin-top:2px">${k.l}</div></div>
    </div>`).join('')}
    <div style="flex:1"></div>
    <!-- Export/Import -->
    <button onclick="IdeasModule.exportJSON()" style="padding:8px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted);flex-shrink:0">📤 Esporta</button>
    <button onclick="IdeasModule.importJSON()" style="padding:8px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted);flex-shrink:0">📥 Importa</button>
  </div>

  <!-- Filters + Search -->
  <div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
    <div style="position:relative;flex:1;min-width:180px;max-width:280px">
      <span style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:13px">🔍</span>
      <input type="text" class="form-control" value="${this._search.replace(/"/g,'&quot;')}" placeholder="Cerca idee, tag, URL..."
        style="padding-left:28px;font-size:12px" oninput="IdeasModule._search=this.value;IdeasModule.render()">
    </div>
    ${[{id:'all',l:'Tutte'},...this._CATS,{id:'alta',l:'🔴 Alta',c:'#ef4444'},{id:'done',l:'✅ Fatte',c:'#22c55e'}].map(f=>
      `<button onclick="IdeasModule._filter='${f.id}';IdeasModule.render()"
        style="padding:5px 11px;background:${this._filter===f.id?(f.c||'var(--primary)')+'22':'var(--bg-card)'};color:${this._filter===f.id?(f.c||'var(--primary)'):'var(--text-muted)'};border:1.5px solid ${this._filter===f.id?(f.c||'var(--primary)'):'var(--border)'};border-radius:99px;cursor:pointer;font-size:11px;font-weight:${this._filter===f.id?700:400};white-space:nowrap">${f.l}</button>`
    ).join('')}
    <!-- Sort -->
    <select onchange="IdeasModule._sort=this.value;IdeasModule.render()"
      style="padding:5px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;font-size:11px;color:var(--text-muted);cursor:pointer">
      <option value="newest" ${this._sort==='newest'?'selected':''}>📅 Più recenti</option>
      <option value="priority" ${this._sort==='priority'?'selected':''}>🔴 Priorità</option>
      <option value="alpha" ${this._sort==='alpha'?'selected':''}>🔤 A-Z</option>
    </select>
  </div>

  <!-- CONTENT -->
  <div id="ideas-content">
    ${shown.length===0 ? this._renderEmpty() :
      this._view==='kanban' ? this._renderKanban(shown) : this._renderGrid(shown)}
  </div>
</div>`;
  },

  _setView(v){ this._view=v; this.render(); },

  _renderEmpty(){
    const isFiltered = this._filter!=='all'||this._search;
    return `<div style="text-align:center;padding:60px 20px;background:var(--bg-card);border-radius:16px;border:2px dashed var(--border)">
      <div style="font-size:48px;margin-bottom:10px">💡</div>
      <div style="font-size:16px;font-weight:800;margin-bottom:6px">${isFiltered?'Nessun risultato trovato':'Inizia a raccogliere idee'}</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">${isFiltered?'Prova a modificare i filtri o la ricerca':'Aggiungi prodotti, ispirazioni, link Etsy — costruisci il tuo archivio di idee creative'}</div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        ${isFiltered
          ?`<button onclick="IdeasModule._filter='all';IdeasModule._search='';IdeasModule.render()" style="padding:8px 18px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted)">✕ Rimuovi filtri</button>`
          :`<button onclick="IdeasModule.openNew()" style="padding:9px 18px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1a1200;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">+ Nuova Idea</button>
           <button onclick="IdeasModule.openFromUrl()" style="padding:9px 18px;background:var(--bg-card2);border:1.5px solid var(--primary);border-radius:9px;cursor:pointer;font-size:13px;font-weight:700;color:var(--primary)">🔗 Da URL</button>`}
      </div>
    </div>`;
  },

  _renderGrid(ideas){
    return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(265px,1fr));gap:11px">
      ${ideas.map(i=>this._card(i)).join('')}
    </div>`;
  },

  _renderKanban(ideas){
    const cols = this._PRIS.map(p=>({...p, items:ideas.filter(i=>(i.priority||'media')===p.id)}));
    return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;align-items:start">
      ${cols.map(col=>`
      <div style="background:var(--bg-card);border-radius:12px;overflow:hidden;border:1px solid var(--border)">
        <div style="padding:10px 13px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;background:${col.c}12">
          <div style="width:10px;height:10px;border-radius:50%;background:${col.c};flex-shrink:0"></div>
          <span style="font-size:12px;font-weight:800;color:${col.c}">${col.l}</span>
          <span style="margin-left:auto;background:${col.c}22;color:${col.c};font-size:10px;font-weight:700;border-radius:99px;padding:1px 7px">${col.items.length}</span>
        </div>
        <div style="padding:8px;display:flex;flex-direction:column;gap:7px;min-height:80px">
          ${col.items.length
            ? col.items.map(i=>this._cardKanban(i)).join('')
            : `<div style="text-align:center;padding:20px 10px;color:var(--text-dim);font-size:11px;font-style:italic">Nessuna idea</div>`}
          <button onclick="IdeasModule.openNew()" style="padding:6px;background:transparent;border:1.5px dashed var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-dim);width:100%;margin-top:2px">+ Aggiungi</button>
        </div>
      </div>`).join('')}
    </div>`;
  },

  _card(i){
    const cat = this._CATS.find(x=>x.id===i.category)||this._CATS[6];
    const pri = this._PRIS.find(x=>x.id===i.priority)||this._PRIS[1];
    const isDone = i.status==='done';
    return `<div style="background:var(--bg-card);border:1.5px solid var(--border);border-left:3px solid ${cat.c};border-radius:13px;overflow:hidden;transition:.15s;${isDone?'opacity:.58':''}"
      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 28px rgba(0,0,0,.22)'"
      onmouseout="this.style.transform='';this.style.boxShadow=''">
      ${i.image?`<div style="height:130px;overflow:hidden;position:relative">
        <img src="${i.image}" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.style.display='none'">
        <div style="position:absolute;top:7px;right:7px;display:flex;gap:4px">
          <button onclick="event.stopPropagation();IdeasModule.toggleFav('${i.id}')" title="${i.fav?'Rimuovi dai preferiti':'Aggiungi ai preferiti'}"
            style="width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.6);border:none;cursor:pointer;font-size:13px;line-height:1">${i.fav?'⭐':'☆'}</button>
        </div>
      </div>`:
      `<div style="display:flex;justify-content:flex-end;padding:8px 10px 0">
        <button onclick="event.stopPropagation();IdeasModule.toggleFav('${i.id}')" title="${i.fav?'Rimuovi dai preferiti':'Aggiungi ai preferiti'}"
          style="background:none;border:none;cursor:pointer;font-size:15px;color:${i.fav?'#fbbf24':'var(--text-dim)'};padding:0">${i.fav?'⭐':'☆'}</button>
      </div>`}
      <div style="padding:${i.image?'11px 13px':'5px 13px 11px'}">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:7px;flex-wrap:wrap">
          <span style="background:${cat.c}18;color:${cat.c};padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700">${cat.l}</span>
          <span style="color:${pri.c};font-size:10px;margin-left:auto">${pri.l}</span>
        </div>
        <div style="font-size:13px;font-weight:800;line-height:1.35;margin-bottom:6px;${isDone?'text-decoration:line-through;color:var(--text-muted)':''}">${i.title||'—'}</div>
        ${i.desc?`<div style="font-size:11px;color:var(--text-muted);line-height:1.55;margin-bottom:7px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${i.desc}</div>`:''}
        ${i.url?`<a href="${i.url}" target="_blank" rel="noopener" style="font-size:10px;color:var(--primary);display:flex;align-items:center;gap:3px;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" onclick="event.stopPropagation()">🔗 <span style="overflow:hidden;text-overflow:ellipsis">${i.url.replace(/^https?:\/\/(www\.)?/,'').slice(0,42)}</span></a>`:''}
        ${i.tags?`<div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:8px">${i.tags.split(',').map(t=>t.trim()).filter(Boolean).slice(0,4).map(t=>`<span style="background:var(--bg-card2);padding:1px 7px;border-radius:99px;font-size:10px;color:var(--text-dim)">#${t}</span>`).join('')}</div>`:''}
        <div style="display:flex;gap:5px;align-items:center;border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
          <button onclick="IdeasModule.toggleDone('${i.id}')"
            style="flex:1;padding:5px 7px;background:${isDone?'rgba(34,197,94,.1)':'var(--bg-card2)'};color:${isDone?'#22c55e':'var(--text-muted)'};border:1px solid ${isDone?'rgba(34,197,94,.3)':'var(--border)'};border-radius:7px;cursor:pointer;font-size:10px;font-weight:600;white-space:nowrap">
            ${isDone?'✅ Fatto':'○ Segna fatto'}
          </button>
          <button onclick="IdeasModule.editIdea('${i.id}')" style="padding:5px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:12px" title="Modifica">✏️</button>
          <button onclick="IdeasModule.delIdea('${i.id}')" style="padding:5px 8px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:7px;cursor:pointer;font-size:12px" title="Elimina">🗑</button>
        </div>
      </div>
    </div>`;
  },

  _cardKanban(i){
    const cat = this._CATS.find(x=>x.id===i.category)||this._CATS[6];
    const isDone = i.status==='done';
    return `<div style="background:var(--bg-card2);border-radius:9px;padding:9px 11px;border:1px solid var(--border);border-left:2px solid ${cat.c}">
      <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:5px">
        <div style="flex:1;font-size:12px;font-weight:700;line-height:1.35;${isDone?'text-decoration:line-through;opacity:.6':''}">${i.title||'—'}</div>
        <button onclick="IdeasModule.toggleFav('${i.id}')" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0;flex-shrink:0;color:${i.fav?'#fbbf24':'var(--text-dim)'}">${i.fav?'⭐':'☆'}</button>
      </div>
      ${i.desc?`<div style="font-size:10px;color:var(--text-muted);margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${i.desc}</div>`:''}
      <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
        <span style="background:${cat.c}18;color:${cat.c};padding:1px 7px;border-radius:99px;font-size:9px;font-weight:700">${cat.l}</span>
        <div style="flex:1"></div>
        <button onclick="IdeasModule.editIdea('${i.id}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--text-dim)">✏️</button>
        <button onclick="IdeasModule.delIdea('${i.id}')" style="background:none;border:none;cursor:pointer;font-size:11px;color:rgba(239,68,68,.6)">🗑</button>
      </div>
    </div>`;
  },

  // ── TOGGLE FAV ─────────────────────────────────────────────────────
  toggleFav(id){
    const all=this._load();
    const idx=all.findIndex(x=>x.id===id);
    if(idx>=0){ all[idx].fav=!all[idx].fav; this._persist(all); this.render(); }
  },

  // ── DA URL — Open Graph meta scraper ───────────────────────────────
  openFromUrl(){
    document.getElementById('_ideas-overlay')?.remove();
    const ov=document.createElement('div');
    ov.id='_ideas-overlay';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(2px)';
    ov.onclick=e=>{if(e.target===ov)ov.remove();};
    ov.innerHTML=`
    <div style="background:var(--bg-card);border-radius:16px;width:min(560px,100%);box-shadow:0 24px 60px rgba(0,0,0,.5);border:1px solid var(--border2)" onclick="event.stopPropagation()">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
        <div style="width:38px;height:38px;background:rgba(109,81,247,.12);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🔗</div>
        <div><div style="font-size:15px;font-weight:800">Importa Idea da URL</div>
        <div style="font-size:11px;color:var(--text-muted)">Incolla il link prodotto (o l'URL diretto dell'immagine). Etsy blocca i bot: usa tasto destro → "Copia indirizzo immagine".</div></div>
        <button onclick="document.getElementById('_ideas-overlay').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:20px;margin-left:auto">✕</button>
      </div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;gap:8px">
          <input class="form-control" id="url-import-input" type="url"
            placeholder="https://www.etsy.com/listing/... oppure Amazon, Pinterest, Instagram"
            style="flex:1;font-size:13px" oninput="IdeasModule._autoFetch()"
            onpaste="setTimeout(function(){IdeasModule._fetchMeta();},60)"
            onkeydown="if(event.key==='Enter')IdeasModule._fetchMeta()">
          <button onclick="IdeasModule._fetchMeta()"
            style="padding:0 18px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1a1200;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800;white-space:nowrap;flex-shrink:0">
            🔍 Carica
          </button>
        </div>
        <div id="url-import-preview" style="display:none;background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);overflow:hidden">
          <img id="url-prev-img" src="" alt="" style="width:100%;height:140px;object-fit:cover;display:none" onerror="this.style.display='none'">
          <div style="padding:12px 14px">
            <div id="url-prev-title" style="font-size:14px;font-weight:800;margin-bottom:5px"></div>
            <div id="url-prev-desc" style="font-size:11px;color:var(--text-muted);line-height:1.5"></div>
          </div>
        </div>
        <div id="url-import-msg" style="display:none;font-size:12px;color:var(--text-muted);text-align:center;padding:8px"></div>
        <div style="display:flex;gap:8px">
          <button onclick="document.getElementById('_ideas-overlay').remove()"
            style="flex:1;padding:11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;color:var(--text-muted)">Annulla</button>
          <button onclick="IdeasModule._saveFromUrl()"
            style="flex:2;padding:11px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1a1200;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">
            💾 Salva Idea con immagine
          </button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    setTimeout(()=>document.getElementById('url-import-input')?.focus(),80);
  },

  // Auto-fetch al paste/typing (debounced): l'immagine si prende DA SOLA.
  _autoFetch(){
    clearTimeout(this._afTimer);
    const url=document.getElementById('url-import-input')?.value?.trim()||'';
    if(!/^https?:\/\/.+\..+/.test(url)) return;
    this._afTimer=setTimeout(()=>{ this._fetchMeta(); }, 600);
  },

  // Scarica l'HTML della pagina provando più proxy CORS (fallback a cascata).
  async _fetchHTML(url){
    const builders=[
      u=>({url:`https://api.allorigins.win/get?url=${encodeURIComponent(u)}`, json:true}),
      u=>({url:`https://corsproxy.io/?url=${encodeURIComponent(u)}`, json:false}),
      u=>({url:`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`, json:false}),
    ];
    for(const mk of builders){
      try{
        const {url:pu,json}=mk(url);
        const res=await fetch(pu,{signal:AbortSignal.timeout(9000)});
        if(!res.ok) continue;
        if(json){ const d=await res.json(); if(d&&d.contents&&d.contents.length>200) return d.contents; }
        else { const t=await res.text(); if(t&&t.length>200) return t; }
      }catch(e){ /* prova il proxy successivo */ }
    }
    return '';
  },

  async _fetchMeta(){
    const url=document.getElementById('url-import-input')?.value?.trim();
    if(!url||!/^https?:\/\//.test(url)){if(typeof toast!=='undefined')toast('Incolla un URL valido','warning');return;}
    const msg=document.getElementById('url-import-msg');
    const prev=document.getElementById('url-import-preview');
    const ti=document.getElementById('url-prev-title');
    const de=document.getElementById('url-prev-desc');
    const im=document.getElementById('url-prev-img');
    if(msg){msg.style.display='block';msg.textContent='⏳ Recupero immagine e dati…';}
    if(prev) prev.style.display='none';
    const dec=s=>String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#0?39;|&#x27;/g,"'").replace(/&#x2F;|&#47;/g,'/');
    let title='',desc='',image='';

    // 0) URL immagine diretto (es. i.etsystatic.com/...jpg) → usalo senza scraping.
    if(/\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(url) || /i\.etsystatic\.com|images-?[a-z]*\.(?:ssl-images-)?amazon|media-amazon|\.pinimg\.com|scontent|fbcdn/i.test(url)){
      window._urlImportData={url, title:(function(){try{return new URL(url).hostname.replace(/^www\./,'');}catch(e){return 'Immagine';}})(), desc:'', image:url};
      if(prev) prev.style.display='block';
      if(ti) ti.textContent='Immagine prodotto';
      if(de) de.textContent='Da URL immagine diretto';
      if(im){ im.onerror=function(){ im.style.display='none'; if(msg){msg.style.display='block';msg.textContent='Immagine non caricabile da questo URL.';} }; im.onload=function(){ if(msg) msg.style.display='none'; }; im.src=url; im.style.display='block'; }
      return;
    }

    // 1) Microlink: risolve og:image lato server (gestisce l'anti-bot di Etsy & co.)
    try{
      const r=await fetch('https://api.microlink.io/?url='+encodeURIComponent(url),{signal:AbortSignal.timeout(12000)});
      if(r.ok){ const j=await r.json(); if(j&&j.data){ title=dec(j.data.title||''); desc=dec(j.data.description||''); if(j.data.image&&j.data.image.url) image=j.data.image.url; } }
    }catch(e){}

    // 2) Fallback: HTML via proxy CORS per riempire i buchi
    if(!title||!image){
      const html=await this._fetchHTML(url);
      if(html){
        const metaTag=(name)=>{ const m=html.match(new RegExp('<meta[^>]+(?:property|name)=["\']'+name+'["\'][^>]+content=["\']([^"\']+)["\']','i'))||html.match(new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']'+name+'["\']','i')); return m?dec(m[1]):''; };
        const titleTag=html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if(!title) title=metaTag('og:title')||(titleTag?dec(titleTag[1]).trim():'');
        if(!desc)  desc=metaTag('og:description')||metaTag('description')||'';
        if(!image){ image=metaTag('og:image')||metaTag('og:image:secure_url')||metaTag('twitter:image')||metaTag('twitter:image:src')||''; if(!image){ const li=html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i); if(li) image=dec(li[1]); } }
      }
    }

    // 2b) Jina Reader: rende la pagina e aggira i blocchi (ottimo per Etsy).
    if(!image || !title){
      try{
        const jr=await fetch('https://r.jina.ai/'+url,{signal:AbortSignal.timeout(13000)});
        if(jr.ok){
          const md=await jr.text();
          if(!image){
            let mm=md.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+\.(?:jpe?g|png|webp)[^)\s]*)\)/i)
                 ||md.match(/(https?:\/\/i\.etsystatic\.com\/[^\s)"']+)/i)
                 ||md.match(/(https?:\/\/[^\s)"']+\.(?:jpe?g|png|webp)[^\s)"']*)/i);
            if(mm) image=mm[1];
          }
          if(!title){ const tm=md.match(/^#\s+(.+)$/m)||md.match(/Title:\s*(.+)/i); if(tm) title=tm[1].trim().slice(0,100); }
        }
      }catch(e){}
    }

    if(image && image.startsWith('//')) image='https:'+image;
    if(!title){ try{ title=new URL(url).hostname.replace(/^www\./,''); }catch(e){} }
    title=title.trim().slice(0,100); desc=desc.trim().slice(0,400);

    // 3) Catena immagini: risolutori server-side come <img>, funzionano anche se lo scraping è bloccato.
    const enc=encodeURIComponent(url);
    const candidates=[];
    if(image) candidates.push(image);
    candidates.push('https://api.microlink.io/?url='+enc+'&embed=image.url');
    candidates.push('https://image.thum.io/get/ogImage/width/600/'+url);

    window._urlImportData={url,title,desc,image:candidates[0]};

    if(prev) prev.style.display='block';
    if(ti) ti.textContent=title||url;
    if(de) de.textContent=desc||'Descrizione non trovata — puoi aggiungerla a mano';
    if(im){
      let ci=0;
      im.onload=function(){ if(window._urlImportData) window._urlImportData.image=im.src; im.style.display='block'; if(msg) msg.style.display='none'; };
      im.onerror=function(){ ci++; if(ci<candidates.length){ im.src=candidates[ci]; } else { im.style.display='none'; if(msg){ msg.style.display='block'; var etsy=/etsy\.com/i.test(url); msg.innerHTML= etsy ? '<span style="color:var(--text-muted)">🛡️ Etsy blocca il recupero automatico. Soluzione: sulla pagina Etsy <b>tasto destro sull\'immagine → "Copia indirizzo immagine"</b> e incolla quell\'URL qui.</span>' : '<span style="color:var(--text-muted)">ℹ️ Immagine non recuperabile da questo sito. Incolla l\'URL diretto dell\'immagine, oppure salva e aggiungila a mano.</span>'; } } };
      im.style.display='block'; im.src=candidates[0];
    }
  },

  _saveFromUrl(){
    const data=window._urlImportData||{};
    const url=document.getElementById('url-import-input')?.value?.trim()||data.url||'';
    if(!url){if(typeof toast!=='undefined')toast('Nessun URL inserito','warning');return;}
    // Detect category from URL
    let cat='altro';
    if(url.includes('etsy.com'))cat='etsy';
    else if(url.includes('instagram.com')||url.includes('pinterest.com'))cat='marketing';
    else if(url.includes('amazon.'))cat='prodotto';
    const idea={
      id:'idea_'+Date.now(),
      title:data.title||url.replace(/^https?:\/\/(www\.)?/,'').split('/')[0].slice(0,60),
      desc:data.desc||'',
      category:cat,
      priority:'media',
      url,
      image:data.image||'',
      tags:'',
      status:'active',
      created:new Date().toISOString(),
    };
    const all=this._load();
    all.unshift(idea);
    this._persist(all);
    window._urlImportData=null;
    document.getElementById('_ideas-overlay')?.remove();
    this.render();
    if(typeof toast!=='undefined')toast('🔗 Idea importata da URL!','success');
    // Open edit immediately so user can refine
    setTimeout(()=>this.editIdea(idea.id),300);
  },

  // ── TOP 20 PRODOTTI ────────────────────────────────────────────────
  async showTop20(){
    const TOP20=[
      {rank:1,  cat:'🎁 Regali',       name:'Tagliere personalizzato con nome',   margin:'72%', demand:'⭐⭐⭐⭐⭐'},
      {rank:2,  cat:'🎁 Regali',       name:'Portachiavi laser con iniziali',      margin:'85%', demand:'⭐⭐⭐⭐⭐'},
      {rank:3,  cat:'🏠 Casa',         name:'Targa porta con cognome famiglia',   margin:'68%', demand:'⭐⭐⭐⭐⭐'},
      {rank:4,  cat:'💒 Matrimoni',    name:'Tableau de mariage in legno',        margin:'74%', demand:'⭐⭐⭐⭐⭐'},
      {rank:5,  cat:'🐾 Animali',      name:'Targa con ritratto animale laser',   margin:'78%', demand:'⭐⭐⭐⭐⭐'},
      {rank:6,  cat:'🎓 Lauree',       name:'Pergamena laurea personalizzata',    margin:'70%', demand:'⭐⭐⭐⭐'},
      {rank:7,  cat:'🎄 Natale',       name:'Decorazione albero incisa laser',    margin:'82%', demand:'⭐⭐⭐⭐'},
      {rank:8,  cat:'💒 Matrimoni',    name:'Segnaposto acrilico nome sposi',     margin:'80%', demand:'⭐⭐⭐⭐'},
      {rank:9,  cat:'🏠 Casa',         name:'Specchio acrilico decorativo',       margin:'65%', demand:'⭐⭐⭐⭐'},
      {rank:10, cat:'🎁 Regali',       name:'Box regalo legno inciso',            margin:'67%', demand:'⭐⭐⭐⭐'},
      {rank:11, cat:'💼 Business',     name:'Targhetta ufficio personalizzata',   margin:'75%', demand:'⭐⭐⭐'},
      {rank:12, cat:'🧸 Bambini',      name:'Puzzle nome bambino legno',          margin:'71%', demand:'⭐⭐⭐⭐'},
      {rank:13, cat:'🎄 Natale',       name:'Calendario avvento laser',           margin:'69%', demand:'⭐⭐⭐⭐'},
      {rank:14, cat:'🐾 Animali',      name:'Medaglietta incisa per cane/gatto',  margin:'87%', demand:'⭐⭐⭐⭐'},
      {rank:15, cat:'💒 Matrimoni',    name:'Libro firme cover laser',            margin:'73%', demand:'⭐⭐⭐'},
      {rank:16, cat:'🏠 Casa',         name:'Porta-piante acrilico colorato',     margin:'76%', demand:'⭐⭐⭐'},
      {rank:17, cat:'🎁 Regali',       name:'Candelabro legno personalizzato',    margin:'70%', demand:'⭐⭐⭐'},
      {rank:18, cat:'💼 Business',     name:'Packaging box brand personalizzato', margin:'60%', demand:'⭐⭐⭐'},
      {rank:19, cat:'🧸 Bambini',      name:'Fiocco nascita legno inciso',        margin:'77%', demand:'⭐⭐⭐⭐'},
      {rank:20, cat:'🎓 Lauree',       name:'Cornice diploma laurea laser',       margin:'66%', demand:'⭐⭐⭐'},
    ];
    document.getElementById('_ideas-overlay')?.remove();
    const ov=document.createElement('div');
    ov.id='_ideas-overlay';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(2px)';
    ov.onclick=e=>{if(e.target===ov)ov.remove();};
    ov.innerHTML=`
    <div style="background:var(--bg-card);border-radius:16px;width:min(700px,100%);max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.5);border:1px solid var(--border2)" onclick="event.stopPropagation()">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;position:sticky;top:0;background:var(--bg-card);z-index:1;border-radius:16px 16px 0 0">
        <div style="width:38px;height:38px;background:linear-gradient(135deg,#fbbf24,#f59e0b);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px">⭐</div>
        <div><div style="font-size:15px;font-weight:800">Top 20 Prodotti Laser — Bestseller Etsy</div>
        <div style="font-size:11px;color:var(--text-muted)">I prodotti più venduti dagli artigiani laser in Italia · ${new Date().toLocaleDateString('it-IT',{month:'long',year:'numeric'})}</div></div>
        <button onclick="document.getElementById('_ideas-overlay').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:20px;margin-left:auto">✕</button>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:7px">
        ${TOP20.map(p=>`
        <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--bg-card2);border-radius:10px;border:1px solid var(--border)">
          <div style="width:28px;height:28px;background:${p.rank<=3?'linear-gradient(135deg,#fbbf24,#f59e0b)':'var(--bg-card)'};border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:${p.rank<=3?'13px':'11px'};font-weight:900;color:${p.rank<=3?'#1a1200':'var(--text-muted)'};flex-shrink:0">${p.rank<=3?['🥇','🥈','🥉'][p.rank-1]:p.rank}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</div>
            <div style="font-size:10px;color:var(--text-muted)">${p.cat}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:11px;font-weight:700;color:#22c55e">${p.margin} mg</div>
            <div style="font-size:10px">${p.demand}</div>
          </div>
          <button onclick="IdeasModule._addFromTop20('${p.name}','${p.cat}')"
            style="padding:5px 11px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1a1200;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:800;flex-shrink:0">
            + Aggiungi
          </button>
        </div>`).join('')}
      </div>
    </div>`;
    document.body.appendChild(ov);
  },

  _addFromTop20(name, cat){
    const idea={
      id:'idea_'+Date.now(),
      title:name,
      desc:'Idea da Top 20 Bestseller Etsy laser',
      category:'prodotto',
      priority:'alta',
      url:'',image:'',tags:'laser,etsy,bestseller',
      status:'active',fav:false,
      created:new Date().toISOString(),
    };
    const all=this._load();
    all.unshift(idea);
    this._persist(all);
    document.getElementById('_ideas-overlay')?.remove();
    this.render();
    if(typeof toast!=='undefined')toast(`⭐ "${name}" aggiunta alle idee!`,'success');
  },

  // ── OPEN/EDIT FORM ─────────────────────────────────────────────────
  openNew(prefillUrl='',prefillTitle=''){
    this._openForm(null,prefillUrl,prefillTitle);
  },
  editIdea(id){
    const idea=this._load().find(x=>x.id===id);
    if(idea)this._openForm(idea);
  },
  _openForm(idea,prefillUrl='',prefillTitle=''){
    const isEdit=!!idea;
    document.getElementById('_ideas-overlay')?.remove();
    const ov=document.createElement('div');
    ov.id='_ideas-overlay';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(2px)';
    ov.onclick=e=>{if(e.target===ov)ov.remove();};
    ov.innerHTML=`
    <div style="background:var(--bg-card);border-radius:16px;width:min(580px,100%);max-height:92vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.5);border:1px solid var(--border2)" onclick="event.stopPropagation()">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--bg-card);z-index:1;border-radius:16px 16px 0 0">
        <div style="font-size:16px;font-weight:800">${isEdit?'✏️ Modifica Idea':'💡 Nuova Idea'}</div>
        <button onclick="document.getElementById('_ideas-overlay').remove()" style="background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--text-muted);font-size:16px">✕</button>
      </div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:13px">
        <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px">Titolo *</label>
          <input class="form-control" id="idea-f-title" value="${(idea?.title||prefillTitle||'').replace(/"/g,'&quot;')}" placeholder="Es. Tagliere betulla con nome famiglia" style="font-size:14px;font-weight:600"></div>
        <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px">Descrizione</label>
          <textarea class="form-control" id="idea-f-desc" rows="3" placeholder="Note, dettagli tecnici, target cliente, prezzo stimato...">${idea?.desc||''}</textarea></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px">Categoria</label>
            <select class="form-control" id="idea-f-cat">
              ${this._CATS.map(x=>`<option value="${x.id}" ${(idea?.category||'altro')===x.id?'selected':''}>${x.l}</option>`).join('')}
            </select></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px">Priorità</label>
            <select class="form-control" id="idea-f-pri">
              ${this._PRIS.map(x=>`<option value="${x.id}" ${(idea?.priority||'media')===x.id?'selected':''}>${x.l}</option>`).join('')}
            </select></div>
        </div>
        <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px">🔗 URL di ispirazione</label>
          <input class="form-control" id="idea-f-url" type="url" value="${(idea?.url||prefillUrl||'').replace(/"/g,'&quot;')}" placeholder="https://www.etsy.com/listing/..."></div>
        <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px">🖼️ Immagine</label>
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <input class="form-control" id="idea-f-img-url" type="url" value="${idea?.image&&idea.image.startsWith('http')?idea.image.replace(/"/g,'&quot;'):''}" placeholder="https://...immagine.jpg" style="flex:1">
            <label style="padding:0 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-muted);white-space:nowrap;flex-shrink:0">
              📷 Carica<input type="file" accept="image/*" style="display:none" onchange="IdeasModule._handleImg(this)"></label>
          </div>
          <div id="idea-f-preview" style="${idea?.image&&!idea.image.startsWith('http')||idea?.image?'':'display:none'}">
            ${idea?.image?`<div style="position:relative;display:inline-block">
              <img src="${idea.image}" style="height:80px;border-radius:8px;object-fit:cover;border:1px solid var(--border)" onerror="this.parentElement.style.display='none'">
              <button onclick="document.getElementById('idea-f-preview').style.display='none';window._ideaTmpImg=null;document.getElementById('idea-f-img-url').value=''"
                style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:99px;background:#ef4444;border:none;cursor:pointer;color:#fff;font-size:11px">✕</button>
            </div>`:''}
          </div></div>
        <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px"># Tag</label>
          <input class="form-control" id="idea-f-tags" value="${(idea?.tags||'').replace(/"/g,'&quot;')}" placeholder="laser, legno, regalo, natale, personalizzato..."></div>
        <div style="display:flex;gap:8px;padding-top:4px;border-top:1px solid var(--border)">
          <button onclick="document.getElementById('_ideas-overlay').remove()" style="flex:1;padding:11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;color:var(--text-muted)">Annulla</button>
          <button onclick="IdeasModule.saveForm('${idea?.id||''}')" style="flex:2;padding:11px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1a1200;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">
            💾 ${isEdit?'Aggiorna Idea':'Salva Idea'}</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    setTimeout(()=>document.getElementById('idea-f-title')?.focus(),80);
  },

  _handleImg(input){
    const file=input.files[0];if(!file)return;
    if(file.size>2*1024*1024){if(typeof toast!=='undefined')toast('Immagine troppo grande (max 2MB)','warning');return;}
    const r=new FileReader();
    r.onload=e=>{
      window._ideaTmpImg=e.target.result;
      const prev=document.getElementById('idea-f-preview');
      if(prev){prev.style.display='block';prev.innerHTML=`<div style="position:relative;display:inline-block">
        <img src="${e.target.result}" style="height:80px;border-radius:8px;object-fit:cover;border:1px solid var(--border)">
        <button onclick="document.getElementById('idea-f-preview').style.display='none';window._ideaTmpImg=null"
          style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:99px;background:#ef4444;border:none;cursor:pointer;color:#fff;font-size:11px">✕</button>
      </div>`;}
    };r.readAsDataURL(file);
  },

  saveForm(editId){
    const title=document.getElementById('idea-f-title')?.value?.trim();
    if(!title){if(typeof toast!=='undefined')toast('Inserisci un titolo','warning');return;}
    const imgUrl=document.getElementById('idea-f-img-url')?.value?.trim();
    const image=window._ideaTmpImg||imgUrl||(editId?this._load().find(x=>x.id===editId)?.image||'':'');
    const obj={
      id:editId||('idea_'+Date.now()),
      title,
      desc:  document.getElementById('idea-f-desc')?.value?.trim()||'',
      category:document.getElementById('idea-f-cat')?.value||'altro',
      priority:document.getElementById('idea-f-pri')?.value||'media',
      url:   document.getElementById('idea-f-url')?.value?.trim()||'',
      image,
      tags:  document.getElementById('idea-f-tags')?.value?.trim()||'',
      status:'active',fav:false,
      created:new Date().toISOString(),
    };
    const all=this._load();
    if(editId){const idx=all.findIndex(x=>x.id===editId);if(idx>=0){obj.created=all[idx].created;obj.fav=all[idx].fav||false;all[idx]=obj;}else all.unshift(obj);}
    else all.unshift(obj);
    this._persist(all);
    window._ideaTmpImg=null;
    document.getElementById('_ideas-overlay')?.remove();
    this.render();
    if(typeof toast!=='undefined')toast(editId?'💡 Idea aggiornata!':'💡 Idea salvata!','success');
  },

  toggleDone(id){
    const all=this._load();const idx=all.findIndex(x=>x.id===id);
    if(idx>=0){all[idx].status=all[idx].status==='done'?'active':'done';this._persist(all);this.render();}
  },
  delIdea(id){
    if(!confirm('Eliminare questa idea?'))return;
    this._persist(this._load().filter(x=>x.id!==id));
    this.render();
    if(typeof toast!=='undefined')toast('Idea eliminata','info');
  },

  // ── EXPORT / IMPORT ────────────────────────────────────────────────
  exportJSON(){
    const all=this._load();
    if(!all.length){if(typeof toast!=='undefined')toast('Nessuna idea da esportare','warning');return;}
    const blob=new Blob([JSON.stringify({_app:'INGLY OS',_type:'ideas',_v:'v12',_exported:new Date().toISOString(),_count:all.length,ideas:all},null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='idee_ingly_'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href);
    if(typeof toast!=='undefined')toast(`📤 ${all.length} idee esportate!`,'success');
  },
  exportCSV(){
    const all=this._load();if(!all.length)return;
    const cols=['id','title','desc','category','priority','status','url','tags','created','fav'];
    const csv=[cols.join(','),...all.map(i=>cols.map(col=>`"${(i[col]||'').toString().replace(/"/g,'""')}"`).join(','))].join('\n');
    const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download='idee_ingly_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
    if(typeof toast!=='undefined')toast('📤 CSV esportato!','success');
  },
  importJSON(){
    const inp=document.createElement('input');inp.type='file';inp.accept='.json,.csv';
    inp.onchange=async e=>{
      const file=e.target.files[0];if(!file)return;
      try{
        const text=await file.text();let imported=0;
        const existing=this._load();const existIds=new Set(existing.map(x=>x.id));
        if(file.name.endsWith('.csv')){
          const lines=text.split('\n').filter(l=>l.trim());const hdrs=lines[0].replace(/"/g,'').split(',');
          for(let i=1;i<lines.length;i++){
            const vals=lines[i].match(/(".*?"|[^,]+)(?=,|$)/g)||[];
            const obj={};hdrs.forEach((h,j)=>{obj[h]=(vals[j]||'').replace(/^"|"$/g,'').replace(/""/g,'"');});
            if(obj.title&&!existIds.has(obj.id)){obj.id=obj.id||('imp_'+Date.now()+i);obj.status=obj.status||'active';existing.push(obj);imported++;}
          }
        }else{
          const data=JSON.parse(text);const ideas=data.ideas||(Array.isArray(data)?data:[]);
          for(const idea of ideas){if(idea.title&&!existIds.has(idea.id)){existing.push(idea);existIds.add(idea.id);imported++;}}
        }
        this._persist(existing);this.render();
        if(typeof toast!=='undefined')toast(`✅ ${imported} idee importate!`,'success');
      }catch(err){if(typeof toast!=='undefined')toast('❌ Errore: '+err.message,'error');}
    };inp.click();
  },
};
window.IdeasModule = IdeasModule;


// ===== ⑨ QR CODE PER PRODOTTI =====
const Forecasting = {
  async render() {
    const el = eid('view-forecasting');
    if (!el) return;
    el.innerHTML = `<div class="module-header"><div class="module-title"><i class="fas fa-chart-line"></i> AI Previsioni</div></div>
      <div class="card">
        <div class="card-title">📈 Genera Previsioni AI</div>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Basato sulle tue vendite storiche, l'AI calcola previsioni mensili e consiglio di produzione.</p>
        <button class="btn btn-primary" onclick="Forecasting.generate()"><i class="fas fa-robot"></i> Analizza & Prevedi</button>
      </div>
      <div id="forecast-result" style="margin-top:16px"></div>`;
  },

  async generate() {
    const resultEl = eid('forecast-result');
    if (resultEl) resultEl.innerHTML = '<div class="card"><div style="text-align:center;padding:20px">⏳ Analisi in corso...</div></div>';
    const [sales, events] = await Promise.all([IDB.getAll('sales'), IDB.getAll('events').catch(() => [])]);
    // Build monthly data
    const monthlyRevenue = {};
    sales.forEach(s => {
      if (!s.date) return;
      const key = s.date.substring(0, 7);
      monthlyRevenue[key] = (monthlyRevenue[key] || 0) + parseFloat(s.amount || 0);
    });
    const sortedMonths = Object.entries(monthlyRevenue).sort((a,b) => a[0].localeCompare(b[0]));
    const dataStr = sortedMonths.map(([m, v]) => `${m}: €${v.toFixed(0)}`).join(', ');
    const nextMonth = new Date(); nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthName = nextMonth.toLocaleDateString('it-IT', {month:'long', year:'numeric'});
    
    try {
      const text = await AIProvider.call(`Sei un business analyst per un'artigiana laser italiana (Ingly Laser). \nDati vendite mensili: ${dataStr || 'Nessun dato ancora'}.\nProssimo mese: ${nextMonthName}.\nAnalizza e fornisci: 1) Previsione ricavi 2) Categorie prodotto da spingere 3) Consigli pratici.\nRispondi in italiano, in formato strutturato con emoji, massimo 300 parole.`, 1000).catch(()=>'Analisi non disponibile');
      if (resultEl) resultEl.innerHTML = `
        <div class="card">
          <div class="card-title">🤖 Analisi AI per ${nextMonthName}</div>
          <div style="font-size:14px;line-height:1.7;white-space:pre-wrap">${text}</div>
        </div>
        <div class="card" style="margin-top:12px">
          <div class="card-title">📊 Storico Revenue</div>
          ${sortedMonths.slice(-6).map(([m,v]) => {
            const max = Math.max(...sortedMonths.slice(-6).map(x=>x[1]));
            return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:12px;color:var(--text-muted);width:80px">${m}</span>
              <div style="flex:1;background:var(--bg-card2);border-radius:4px;height:20px">
                <div style="height:100%;width:${max?v/max*100:0}%;background:linear-gradient(90deg,#8b5cf6,#06b6d4);border-radius:4px;display:flex;align-items:center;padding-left:8px">
                  <span style="font-size:11px;color:#fff;font-weight:600">€${v.toFixed(0)}</span>
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>`;
    } catch (e) {
      if (resultEl) resultEl.innerHTML = `<div class="card"><p style="color:var(--text-muted)">AI temporaneamente non disponibile. Dati storici: ${dataStr || 'nessuno'}</p></div>`;
    }
  }
};

// ===== ⑫ MINI CATALOG VIEW =====
const PWA = {
  deferredPrompt: null,
  init() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const btn = eid('pwa-install-btn');
      if (btn) btn.style.display = '';
    });
  },
  async install() {
    if (!this.deferredPrompt) {
      toast('App già installata o browser non supporta PWA', 'info');
      return;
    }
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') toast('✅ App installata!', 'success');
    this.deferredPrompt = null;
  }
};

// ===== WHATSAPP QUICK SEND =====
const WhatsApp = {
  TEMPLATES: [
    {id:'welcome',   label:'👋 Benvenuto',       text:'Ciao {nome}! 👋 Benvenuto in Ingly Design. Siamo specializzati in prodotti personalizzati laser in legno e plexiglass Made in Sicily. Come possiamo aiutarti? 🎁'},
    {id:'order_ok',  label:'✅ Ordine confermato', text:'Ciao {nome}! ✅ Il tuo ordine è confermato. Importo: €{importo}. Inizieremo la lavorazione entro 24h. Ti aggiorneremo su ogni step! 🔧 — Ingly Design'},
    {id:'ready',     label:'🎁 Ordine pronto',     text:'Ciao {nome}! 🎁 Il tuo ordine è pronto! Puoi ritirarlo o organizziamo la spedizione. Grazie per aver scelto Ingly Design 🇮🇹'},
    {id:'followup',  label:'📬 Follow-up',         text:'Ciao {nome}! 😊 Volevamo sapere come stai trovando il tuo prodotto Ingly. Un feedback ci aiuta a migliorare! ⭐ Grazie mille'},
    {id:'quote_sent',label:'📄 Preventivo inviato', text:'Ciao {nome}! 📄 Ti ho inviato il preventivo di €{importo} per {descrizione}. Hai domande? Sono disponibile! — Ingly Design 🎯'},
    {id:'payment',   label:'💳 Richiesta pagamento', text:'Ciao {nome}! 💳 Ti ricordo il pagamento di €{importo} per il tuo ordine. Puoi pagare tramite bonifico o PayPal. Grazie! — Ingly Design'},
    {id:'shipping',  label:'🚚 Spedizione',         text:'Ciao {nome}! 🚚 Il tuo pacco Ingly è in partenza! Tracking: {tracking}. Consegna prevista in 2-3 giorni lavorativi. 📦'},
  ],

  openTemplates(phone, clientName, data={}){
    const modal=document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`<div style="background:var(--bg-card);border-radius:16px;padding:24px;max-width:500px;width:100%;border:1.5px solid var(--border);max-height:90vh;overflow-y:auto">
      <div style="font-size:16px;font-weight:800;margin-bottom:16px">💬 Template WhatsApp</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
        ${this.TEMPLATES.map(t=>{
          const msg=t.text.replace('{nome}',clientName||'cliente').replace('{importo}',data.importo||'—').replace('{descrizione}',data.descrizione||'').replace('{tracking}',data.tracking||'');
          const url=phone?`https://wa.me/${(phone||'').replace(/\\D/g,'')}?text=${encodeURIComponent(msg)}`:`https://wa.me/?text=${encodeURIComponent(msg)}`;
          return `<a href="${url}" target="_blank" onclick="this.closest('[style*=fixed]').remove()" style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;text-decoration:none;color:var(--text);transition:.15s" onmouseover="this.style.borderColor='#25d366'" onmouseout="this.style.borderColor='var(--border)'">
            <span style="font-size:20px">${t.label.split(' ')[0]}</span>
            <div><div style="font-size:12px;font-weight:700">${t.label.slice(2)}</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px">${msg.slice(0,60)}...</div></div>
            <span style="margin-left:auto;color:#25d366;font-size:18px">→</span>
          </a>`;
        }).join('')}
      </div>
      <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;padding:10px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);border-radius:8px;cursor:pointer">Chiudi</button>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  },

  sendToClient(phone, clientName) {
    this.openTemplates(phone, clientName);
  },

  _legacySend(phone, clientName) {
    const msg = encodeURIComponent(`Ciao ${clientName}! 👋 Siamo Ingly Laser. Come possiamo aiutarti oggi?`);
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  },
  sendQuote(phone, clientName, total) {
    const msg = encodeURIComponent(`Ciao ${clientName}! 🎨 Ti inviamo il preventivo per il tuo ordine: €${parseFloat(total).toFixed(2)}. Vuoi procedere? Rispundi qui per confermare!`);
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  }
};

// ===== EXTEND IDB STORES =====
// [v3.0: _origIDBinit rimosso]

// ===== GOALS WIDGET INJECTION =====
if (typeof Dashboard !== 'undefined' && Dashboard.render) {
  const _dashBase = Dashboard.render.bind(Dashboard);
  Dashboard.render = async function() {
    await _dashBase();
    // Inject goals widget
    const firstCard = document.querySelector('#view-dashboard .card');
    if (firstCard && !eid('goals-widget')) {
      const widget = document.createElement('div');
      widget.id = 'goals-widget';
      firstCard.parentNode.insertBefore(widget, firstCard);
      widget.innerHTML = await Goals.renderWidget();
    }
  };
}

// ===== EXTEND CLIENTS SECTION WITH WHATSAPP & CUSTOM PRICING =====
if (typeof Clients !== 'undefined') {
  Clients.renderExtra = function(c) {
    return `<button class="btn btn-sm" onclick="WhatsApp.sendToClient('${c.phone||''}','${c.name}')" style="background:#25d366;color:#fff;padding:4px 8px"><i class="fab fa-whatsapp"></i></button>`;
  };
}

// ===== EXTEND CATALOG WITH QR BUTTON =====
if (typeof Catalog !== 'undefined') {
  Catalog.renderQRExtra = function(p) {
    return `<button class="btn btn-sm" onclick="CatalogQR.generate('${p.name}','${p.etsyUrl||''}')" title="QR Code"><i class="fas fa-qrcode"></i></button>`;
  };
}

// Add PWA manifest inline
(function() {
  const manifest = {
    name: 'Ingly Master', short_name: 'Ingly', start_url: '/', display: 'standalone',
    background_color: '#0a0a0a', theme_color: '#8b5cf6',
    icons: [{ src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%238b5cf6"/><text y=".9em" font-size="80">🎨</text></svg>', sizes: '192x192', type: 'image/svg+xml' }]
  };
  const blob = new Blob([JSON.stringify(manifest)], {type:'application/json'});
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = URL.createObjectURL(blob);
  document.head.appendChild(link);
})();

// ===== NOTIFICATIONS AUTO-UPDATE =====
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => { Notifications.update(); PWA.init(); MorningBriefing.maybeShow(); SmartNotif.scheduleChecks(); }, 1500);
  setInterval(() => Notifications.update(), 60000);
});

// ===== INIT =====
window.addEventListener('DOMContentLoaded',()=>{
  // ── Verify critical modules before init ─────────────────────────
  var _missing = [];
  ['Bus','App','IDB','AppStore'].forEach(function(m){ if(typeof window[m]==='undefined') _missing.push(m); });
  if(_missing.length) console.error('[INGLY] Missing modules on DOMContentLoaded:', _missing.join(', '));
  App.init();
});


// ══════════════════════════════════════════════════════════════════
// WIZARD ONBOARDING + DEMO DATA
// ══════════════════════════════════════════════════════════════════
const Wizard={
  _step:1,_STEPS:5,_KEY:'ingly_wizard_done_v2',
  shouldShow(){return!localStorage.getItem(this._KEY);},
  start(){
    if(!this.shouldShow())return;
    const ov=document.getElementById('wizard-overlay');
    if(ov){ov.style.display='block';document.body.style.overflow='hidden';}
    this._step=1;this.render();
  },
  skip(){
    localStorage.setItem(this._KEY,'1');
    const ov=document.getElementById('wizard-overlay');
    if(ov)ov.style.display='none';
    document.body.style.overflow='';
    toast('Configurazione saltata — trovi tutto in ⚙️ Impostazioni','info');
  },
  next(){
    const s=this._step;
    if(s===1){
      const name=document.getElementById('wiz-brand')?.value?.trim();
      if(!name){toast('Inserisci il nome del laboratorio','warning');return;}
      const bd=JSON.parse(localStorage.getItem('ingly_brand_identity')||'{}');
      bd.brand_name=name;
      bd.founder=document.getElementById('wiz-owner')?.value||'';
      bd.location=document.getElementById('wiz-city')?.value||'';
      bd.founded_year=document.getElementById('wiz-year')?.value||'';
      localStorage.setItem('ingly_brand_identity',JSON.stringify(bd));
    }
    if(s===2){
      const key=document.getElementById('wiz-ai-key')?.value?.trim();
      if(key)localStorage.setItem('ingly_api_key',key);
      const prov=document.querySelector('input[name="wiz-provider"]:checked')?.value||'gemini';
      localStorage.setItem('ingly_ai_provider',prov);
    }
    if(s===4&&document.getElementById('wiz-demo-yes')?.checked){
      this._loadDemoData();
    }
    if(s>=this._STEPS){this._finish();return;}
    this._step++;this.render();
  },
  prev(){if(this._step>1){this._step--;this.render();}},
  render(){
    const el=document.getElementById('wiz-content');if(!el)return;
    const prog=document.getElementById('wiz-progress');
    const lbl=document.getElementById('wiz-step-label');
    if(prog)prog.style.width=(this._step/this._STEPS*100)+'%';
    if(lbl)lbl.textContent=`${this._step} / ${this._STEPS}`;
    const bd=JSON.parse(localStorage.getItem('ingly_brand_identity')||'{}');
    const isLast=this._step===this._STEPS;
    const nav=`<div style="display:flex;justify-content:space-between;align-items:center;margin-top:28px">
      <button onclick="Wizard.skip()" style="background:none;border:none;color:#475569;cursor:pointer;font-size:12px;padding:8px">Salta →</button>
      <div style="display:flex;gap:10px">
        ${this._step>1?'<button onclick="Wizard.prev()" style="padding:12px 20px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;font-size:13px">← Indietro</button>':''}
        <button onclick="Wizard.next()" style="padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:800">${isLast?'🚀 Inizia!':'Avanti →'}</button>
      </div></div>`;

    const steps={
      1:`<div style="text-align:center;margin-bottom:28px"><div style="font-size:52px;margin-bottom:12px">👋</div>
        <h2 style="font-size:26px;font-weight:900;color:#fff;margin-bottom:8px">Benvenuto in INGLY!</h2>
        <p style="font-size:14px;color:#94a3b8;line-height:1.65">Il gestionale intelligente per artigiani laser.<br>2 minuti per configurare tutto.</p></div>
        <div style="background:#1e293b;border-radius:12px;padding:22px;display:flex;flex-direction:column;gap:14px">
          <div><label style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;display:block;margin-bottom:6px">Nome del laboratorio *</label>
            <input class="form-control" id="wiz-brand" placeholder="Es. Ingly Design..." value="${bd.brand_name||''}" style="font-size:16px;padding:12px"></div>
          <div class="form-row">
            <div><label style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;display:block;margin-bottom:5px">Il tuo nome</label>
              <input class="form-control" id="wiz-owner" placeholder="Es. Giulia Marini" value="${bd.founder||''}"></div>
            <div><label style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;display:block;margin-bottom:5px">Città</label>
              <input class="form-control" id="wiz-city" placeholder="Es. Torino" value="${bd.location||''}"></div>
          </div>
          <div><label style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;display:block;margin-bottom:5px">Anno di fondazione</label>
            <input class="form-control" id="wiz-year" placeholder="Es. 2019" value="${bd.founded_year||''}" style="max-width:130px"></div>
        </div>${nav}`,

      2:`<div style="text-align:center;margin-bottom:24px"><div style="font-size:48px;margin-bottom:12px">🤖</div>
        <h2 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px">Attiva l'AI Assistant</h2>
        <p style="font-size:13px;color:#94a3b8"><strong style="color:#a5b4fc">Gratis con Gemini o Groq</strong> — nessuna carta richiesta.</p></div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px">
          ${[{id:'gemini',name:'Google Gemini',desc:'Crea key gratuita su aistudio.google.com',col:'#4285f4',icon:'✨'},
             {id:'groq',name:'Groq Llama 3',desc:'Velocissimo. Key su console.groq.com',col:'#f97316',icon:'⚡'},
             {id:'anthropic',name:'Anthropic Claude',desc:'Il più potente, a pagamento',col:'#8b5cf6',icon:'🧠'},
          ].map(p=>`<label style="display:flex;align-items:center;gap:12px;padding:12px;background:#1e293b;border-radius:10px;border:1px solid ${p.col}30;cursor:pointer">
            <input type="radio" name="wiz-provider" value="${p.id}" ${p.id==='gemini'?'checked':''} style="accent-color:${p.col}">
            <span style="font-size:20px">${p.icon}</span>
            <div><div style="font-size:13px;font-weight:700;color:#fff">${p.name}</div><div style="font-size:11px;color:#64748b">${p.desc}</div></div>
          </label>`).join('')}
        </div>
        <div><label style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;display:block;margin-bottom:6px">API Key (puoi aggiungere dopo)</label>
          <input class="form-control" id="wiz-ai-key" type="password" placeholder="AIzaSy... / gsk_..."></div>
        ${nav}`,

      3:`<div style="text-align:center;margin-bottom:24px"><div style="font-size:48px;margin-bottom:12px">🎨</div>
        <h2 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px">Tipo di produzione</h2>
        <p style="font-size:13px;color:#94a3b8">Ottimizziamo i modelli e i preset per te.</p></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${[{id:'laser',icon:'⚡',name:'Laser',desc:'Legno, acrilico, MDF'},
             {id:'sewing',icon:'🧵',name:'Cucito/Tessile',desc:'Borse, abiti, accessori'},
             {id:'ceramics',icon:'🏺',name:'Ceramica',desc:'Vasi, gioielli, argilla'},
             {id:'jewelry',icon:'💍',name:'Gioielleria',desc:'Resina, metallo, perle'},
             {id:'wood',icon:'🪵',name:'Falegnameria',desc:'Mobili, oggetti in legno'},
             {id:'mixed',icon:'🎭',name:'Misto/Altro',desc:'Più tecniche'},
          ].map(p=>`<label style="display:flex;align-items:center;gap:10px;padding:12px;background:#1e293b;border-radius:10px;border:1px solid var(--border);cursor:pointer">
            <input type="radio" name="wiz-type" value="${p.id}" ${p.id==='laser'?'checked':''} style="accent-color:#6366f1">
            <span style="font-size:22px">${p.icon}</span>
            <div><div style="font-size:12px;font-weight:700;color:#fff">${p.name}</div><div style="font-size:10px;color:#64748b">${p.desc}</div></div>
          </label>`).join('')}
        </div>${nav}`,

      4:`<div style="text-align:center;margin-bottom:24px"><div style="font-size:48px;margin-bottom:12px">📦</div>
        <h2 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px">Dati di esempio</h2>
        <p style="font-size:13px;color:#94a3b8;line-height:1.6">Vuoi caricare dati demo realistici?<br>Clienti, vendite, grafici già popolati — cancellabili in qualsiasi momento.</p></div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <label style="display:flex;align-items:center;gap:14px;padding:18px;background:#1e293b;border-radius:12px;border:2px solid #10b98150;cursor:pointer">
            <input type="radio" name="wiz-data" id="wiz-demo-yes" value="demo" checked style="accent-color:#10b981;width:18px;height:18px">
            <div><div style="font-size:14px;font-weight:700;color:#4ade80">✅ Sì, carica dati demo</div>
              <div style="font-size:11px;color:#64748b;margin-top:3px">5 prodotti · 3 clienti · 10 vendite · grafici animati</div></div>
          </label>
          <label style="display:flex;align-items:center;gap:14px;padding:18px;background:#1e293b;border-radius:12px;border:1px solid var(--border);cursor:pointer">
            <input type="radio" name="wiz-data" value="empty" style="accent-color:#6366f1;width:18px;height:18px">
            <div><div style="font-size:14px;font-weight:700;color:var(--text)">🗒️ No, parto da zero</div>
              <div style="font-size:11px;color:#64748b;margin-top:3px">App pulita, inserisci i tuoi dati reali</div></div>
          </label>
        </div>${nav}`,

      5:`<div style="text-align:center;margin-bottom:28px"><div style="font-size:64px;margin-bottom:16px">🚀</div>
        <h2 style="font-size:26px;font-weight:900;color:#fff;margin-bottom:10px">Tutto pronto!</h2>
        <p style="font-size:14px;color:#94a3b8;line-height:1.7">Il tuo laboratorio è configurato. Cosa fare subito:</p></div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:24px">
          ${[['📦','Aggiungi il tuo primo prodotto nel Catalogo'],
             ['👥','Registra i tuoi clienti nel CRM'],
             ['💰','Calcola i costi con il Calcolatore Laser'],
             ['📄','Crea il primo preventivo con Smart Quoter'],
             ['🎨','Completa la tua Brand Identity'],
          ].map(([ic,tx])=>`<div style="display:flex;align-items:center;gap:12px;padding:11px 16px;background:#1e293b;border-radius:8px"><span style="font-size:20px">${ic}</span><span style="font-size:13px;color:#cbd5e1">${tx}</span></div>`).join('')}
        </div>${nav}`,
    };
    el.innerHTML=steps[this._step]||'';
  },
  async _loadDemoData(){
    const now=new Date();
    const dd=(offset=0)=>{const dt=new Date(now);dt.setDate(dt.getDate()-offset);return dt.toISOString().split('T')[0];};
    const clients=[
      {id:9001,name:'Marta Bianchi',email:'marta@email.it',phone:'333-1234567',city:'Torino',notes:'Cliente fissa — ordina mensilmente per regali'},
      {id:9002,name:'IC Leonardo Da Vinci',email:'segreteria@ic-leonardo.edu.it',phone:'011-987654',city:'Torino',notes:'Scuola — kit classe ogni settembre'},
      {id:9003,name:'Baita del Gusto Srl',email:'ordini@baitagousto.it',phone:'0165-456789',city:'Aosta',notes:'Negozio souvenir — riordino trimestrale'},
    ];
    for(const c of clients)await IDB.put('clients',c);
    const sales=[
      {id:8001,clientId:9001,clientName:'Marta Bianchi',date:dd(2),desc:'Tagliere Quercia Personalizzato x2',amount:84,status:'pagato',channel:'WhatsApp'},
      {id:8002,clientId:9002,clientName:'IC Leonardo',date:dd(5),desc:'Kit Classe 28 portachiavi betulla',amount:280,status:'pagato',channel:'Passaparola'},
      {id:8003,clientId:9003,clientName:'Baita del Gusto',date:dd(8),desc:'Stock 50 magneti personalizzati',amount:125,status:'pagato',channel:'Fiera'},
      {id:8004,clientId:9001,clientName:'Marta Bianchi',date:dd(12),desc:'Cornice foto 20×15cm noce',amount:42,status:'pagato',channel:'Instagram'},
      {id:8005,clientId:9002,clientName:'IC Leonardo',date:dd(18),desc:'Tableau matrimonio 80×60cm',amount:95,status:'da_pagare',channel:'Passaparola'},
      {id:8006,clientId:9003,clientName:'Baita del Gusto',date:dd(22),desc:'Portachiavi mappa Aosta x30',amount:180,status:'pagato',channel:'Fiera'},
      {id:8007,clientId:9001,clientName:'Marta Bianchi',date:dd(28),desc:'Set 4 sottobicchieri betulla',amount:28,status:'pagato',channel:'WhatsApp'},
      {id:8008,clientId:9002,clientName:'IC Leonardo',date:dd(35),desc:'Kit Classe 25 portachiavi',amount:250,status:'pagato',channel:'Passaparola'},
      {id:8009,clientId:9003,clientName:'Baita del Gusto',date:dd(40),desc:'Calamite laser x40',amount:100,status:'pagato',channel:'Fiera'},
      {id:8010,clientId:9001,clientName:'Marta Bianchi',date:dd(45),desc:'Tagliere grande noce 40×28',amount:58,status:'pagato',channel:'Instagram'},
    ];
    for(const s of sales)await IDB.put('sales',s);
    const cf=[
      {id:7001,type:'uscita',category:'Materiali',desc:'MDF 40 fogli 60×40',amount:85,date:dd(3)},
      {id:7002,type:'uscita',category:'Materiali',desc:'Betulla 3mm x20 fogli',amount:60,date:dd(10)},
      {id:7003,type:'uscita',category:'Attrezzatura',desc:'Lenti focali xTool P3',amount:45,date:dd(15)},
      {id:7004,type:'uscita',category:'Marketing',desc:'Promo Instagram',amount:30,date:dd(20)},
    ];
    for(const c of cf)await IDB.put('cashflow',c);
    toast('✅ Dati demo caricati! 3 clienti, 10 vendite, grafici animati.','🎉');
  },
  _finish(){
    localStorage.setItem(this._KEY,'1');
    const ov=document.getElementById('wizard-overlay');
    if(ov)ov.style.display='none';
    document.body.style.overflow='';
    App.navigate('dashboard');
    setTimeout(()=>toast('🎉 Benvenuto in INGLY!','success'),400);
  },
};

// ══════════════════════════════════════════════════════════════════
// RITENUTA D'ACCONTO helpers
// ══════════════════════════════════════════════════════════════════
Sales.toggleRitenuta=function(){
  const has=document.getElementById('sale-has-ritenuta')?.checked;
  const detail=document.getElementById('sale-ritenuta-detail');
  if(detail)detail.style.display=has?'block':'none';
  if(has)Sales.calcRitenuta();
};
Sales.calcRitenuta=function(){
  const amount=parseFloat(document.getElementById('sale-amount')?.value)||0;
  const ritenuta=+(amount*0.20).toFixed(2);
  const netto=+(amount-ritenuta).toFixed(2);
  const s=id=>document.getElementById(id);
  if(s('sale-imponibile'))s('sale-imponibile').value=amount.toFixed(2);
  if(s('sale-ritenuta-val'))s('sale-ritenuta-val').value=ritenuta.toFixed(2);
  if(s('sale-netto'))s('sale-netto').value=netto.toFixed(2);
};
// Hook amount input to update ritenuta live
document.addEventListener('DOMContentLoaded',()=>{
  const amtEl=document.getElementById('sale-amount');
  if(amtEl)amtEl.addEventListener('input',()=>{if(document.getElementById('sale-has-ritenuta')?.checked)Sales.calcRitenuta();},{passive:true});
});

// ══════════════════════════════════════════════════════════════════
// PRIMA NOTA — Finance tab injection
// ══════════════════════════════════════════════════════════════════
const CloudSync = {
  _KEY_URL: 'ingly_backend_url',
  _KEY_API: 'ingly_backend_key',
  _KEY_AUTO: 'ingly_sync_auto',
  _autoTimer: null,
  _STORES: ['sales','clients','quotes','cashflow','orders','materials','settings','catalog','inventory','fixed_costs'],

  get url(){ return localStorage.getItem(this._KEY_URL)||''; },
  get apiKey(){ return localStorage.getItem(this._KEY_API)||''; },

  init(){
    const urlEl = eid('sync-backend-url');
    const keyEl = eid('sync-api-key');
    const autoEl = eid('sync-auto-toggle');
    if(urlEl) urlEl.value = this.url;
    if(keyEl) keyEl.value = this.apiKey;
    if(autoEl){
      autoEl.checked = localStorage.getItem(this._KEY_AUTO)==='true';
      if(autoEl.checked) this.startAutoSync();
    }
    this._updateLastTime();
    if(this.url && this.apiKey) this._pingStatus();
  },

  updateUrl(v){ localStorage.setItem(this._KEY_URL, v.trim()); },
  updateKey(v){ localStorage.setItem(this._KEY_API, v.trim()); },

  _headers(){
    return { 'Content-Type':'application/json', 'X-API-Key': this.apiKey };
  },

  async _fetch(path, opts={}){
    if(!this.url) throw new Error('URL backend non configurato');
    if(!this.apiKey) throw new Error('API key non configurata');
    const res = await fetch(this.url.replace(/\/$/,'')+path, {
      ...opts,
      headers: { ...this._headers(), ...(opts.headers||{}) }
    });
    if(!res.ok){
      const txt = await res.text().catch(()=>'');
      throw new Error(`HTTP ${res.status}: ${txt.slice(0,100)}`);
    }
    return res.json();
  },

  async testConnection(){
    const el = eid('sync-test-result');
    const dot = eid('sync-status-dot');
    if(el) el.innerHTML = '⏳ Connessione in corso...';
    try{
      const data = await this._fetch('/health');
      if(el) el.innerHTML = `<span style="color:var(--green)">✅ Connesso — Backend OK · ${data.ts?.slice(0,10)||'now'}</span>`;
      if(dot) dot.style.background = '#22c55e';
      toast('Cloud Sync connesso ✅','success');
    }catch(e){
      if(el) el.innerHTML = `<span style="color:var(--red)">❌ ${e.message}</span><br><span style="font-size:10px;color:var(--text-dim)">Controlla URL e API key in Settings</span>`;
      if(dot) dot.style.background = '#ef4444';
    }
  },

  async _pingStatus(){
    const dot = eid('sync-status-dot');
    try{
      await this._fetch('/health');
      if(dot) dot.style.background = '#22c55e';
    }catch{
      if(dot) dot.style.background = '#ef4444';
    }
  },

  async pushAll(){
    const prog = eid('sync-progress');
    if(prog) prog.textContent = '⬆️ Push in corso...';
    try{
      const payload = {};
      for(const store of this._STORES){
        const records = await IDB.getAll(store).catch(()=>[]);
        if(records.length > 0) payload[store] = records;
      }
      const data = await this._fetch('/api/sync/bulk/push', {
        method:'POST',
        body: JSON.stringify({stores: payload})
      });
      const total = Object.values(data.results||{}).reduce((a,b)=>a+b,0);
      localStorage.setItem('ingly_sync_last', new Date().toISOString());
      this._updateLastTime();
      if(prog) prog.textContent = `✅ Push completato — ${total} record sincronizzati`;
      toast(`☁️ Cloud Sync: ${total} record inviati`,'success');
    }catch(e){
      if(prog) prog.innerHTML = `<span style="color:var(--red)">❌ ${e.message}</span>`;
    }
  },

  async pullAll(){
    const prog = eid('sync-progress');
    if(prog) prog.textContent = '⬇️ Pull in corso...';
    try{
      const since = localStorage.getItem('ingly_sync_last');
      const url = '/api/sync/bulk/pull' + (since ? `?since=${encodeURIComponent(since)}` : '');
      const data = await this._fetch(url);
      let total = 0;
      for(const [store, records] of Object.entries(data.stores||{})){
        if(records.length > 0){
          for(const r of records) await IDB.put(store, r).catch(()=>{});
          total += records.length;
        }
      }
      localStorage.setItem('ingly_sync_last', data.timestamp);
      this._updateLastTime();
      if(prog) prog.textContent = `✅ Pull completato — ${total} record aggiornati`;
      if(total > 0){
        toast(`☁️ ${total} record aggiornati dal cloud`,'success');
        // Refresh current section
        App.navigate(App.currentSection);
      }
    }catch(e){
      if(prog) prog.innerHTML = `<span style="color:var(--red)">❌ ${e.message}</span>`;
    }
  },

  async syncEtsy(){
    const prog = eid('sync-progress');
    if(prog) prog.textContent = '🛍️ Sincronizzazione ordini Etsy...';
    try{
      const data = await this._fetch('/api/etsy/sync', {method:'POST'});
      if(prog) prog.textContent = `✅ Etsy: ${data.imported} nuovi ordini importati in Kanban (${data.skipped} già presenti)`;
      if(data.imported > 0) toast(`🛍️ ${data.imported} nuovi ordini Etsy in Kanban!`,'success');
      else toast('Nessun nuovo ordine Etsy','success');
    }catch(e){
      if(prog) prog.innerHTML = `<span style="color:var(--red)">❌ Etsy: ${e.message}</span>`;
    }
  },

  async createStripeLink(quoteId, amountEur, description, clientEmail){
    try{
      const data = await this._fetch('/api/stripe/checkout', {
        method:'POST',
        body: JSON.stringify({
          quote_id: quoteId,
          amount_eur: amountEur,
          description,
          client_email: clientEmail,
        })
      });
      return data.url;
    }catch(e){
      throw new Error('Stripe: ' + e.message);
    }
  },

  async getPayPalLink(amountEur, description){
    try{
      const data = await this._fetch('/api/stripe/paypal-link', {
        method:'POST',
        body: JSON.stringify({amount_eur: amountEur, description})
      });
      return data.url;
    }catch{
      const username = prompt('Username PayPal.me (es. inglydesign):','inglydesign');
      return `https://paypal.me/${username}/${amountEur}EUR`;
    }
  },

  async getNotifications(){
    try{
      const data = await this._fetch('/api/notifications');
      if(data.notifications?.length > 0){
        const strip = eid('sync-notif-strip');
        if(strip){
          strip.style.display='block';
          strip.innerHTML = data.notifications.slice(0,3).map(n=>
            `<div style="padding:6px 10px;background:var(--bg-card2);border-radius:6px;font-size:11px;margin-bottom:4px;border-left:3px solid var(--primary)">
              <strong>${n.title}</strong><br><span style="color:var(--text-muted)">${n.body}</span>
            </div>`
          ).join('');
          // Mark as read
          this._fetch('/api/notifications/read', {method:'POST', body:JSON.stringify({ids: data.notifications.map(n=>n.id)})});
        }
      }
    }catch{}
  },

  async downloadBackup(){
    try{
      if(!this.url||!this.apiKey){toast('Configura prima il cloud sync','warning');return;}
      const url = this.url.replace(/\/$/,'') + '/api/admin/backup';
      const res = await fetch(url, {headers: this._headers()});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ingly_cloud_backup_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      toast('Backup cloud scaricato ✅','success');
    }catch(e){
      toast('Errore backup: '+e.message,'warning');
    }
  },

  toggleAuto(enabled){
    localStorage.setItem(this._KEY_AUTO, String(enabled));
    if(enabled) this.startAutoSync();
    else this.stopAutoSync();
    toast(enabled?'Auto-sync attivato (5 min)':'Auto-sync disattivato','☁️');
  },

  startAutoSync(){
    this.stopAutoSync();
    this._autoTimer = setInterval(()=>this.pullAll(), 5*60*1000);
    console.log('☁️ Auto-sync started (5min)');
  },

  stopAutoSync(){
    if(this._autoTimer){ clearInterval(this._autoTimer); this._autoTimer=null; }
  },

  _updateLastTime(){
    const el = eid('sync-last-time');
    const last = localStorage.getItem('ingly_sync_last');
    if(el) el.textContent = last ? `Ultimo sync: ${new Date(last).toLocaleString('it-IT')}` : '';
  },
};

// Init on settings render
if(window.Settings && typeof Settings.load==='function'){
  const _slBase=Settings.load;
  Settings.load=function(){_slBase.call(this);if(typeof CloudSync!=='undefined')try{CloudSync.init()}catch(e){}}
}

// ── Kanban ↔ Vendite ↔ Workflow sync via Bus ─────────────────────
// Quando viene creata/aggiornata una vendita, aggiorna Kanban se visibile
Bus.on('sale:created', ()=>{ if(App.currentSection==='orders') (typeof Orders!=='undefined'&&Orders.render()); });
Bus.on('order:updated', ()=>{ if(App.currentSection==='orders') (typeof Orders!=='undefined'&&Orders.render()); });
// Quando si salva un ordine nel Kanban, notifica le altre sezioni
Bus.on('order:created', ()=>{ if(App.currentSection==='orders') RenderQueue.schedule('orders', ()=>(typeof Orders!=='undefined'&&Orders.render())); });
Bus.on('order:stage_changed', ()=>{ if(App.currentSection==='orders') RenderQueue.schedule('orders', ()=>(typeof Orders!=='undefined'&&Orders.render())); });
Bus.on('data:updated', ({store})=>{ if(store==='sales'||store==='orders') RenderQueue.schedule('kpi', ()=>KPIEngine.run()); });
Bus.on('order:saved', ()=>{
  if(App.currentSection==='sales') Sales?.render?.();
  if(App.currentSection==='workflow') Workflow?.render?.();
});

// Add 💳 Paga button in Quoter when backend is configured
(function(){
  const _origQuoterSave = Quoter.saveQuote;
  if(_origQuoterSave){
    // We'll inject the pay button dynamically when Quoter renders
  }
})();



// ══════════════════════════════════════════════════════════════════
// AI STUDIO — Generatore contenuti AI
// ══════════════════════════════════════════════════════════════════
const NavPrefs = {
  _prefs: { favorites: [], hidden: [] },
  _loaded: false,

  async load() {
    const saved = await IDB.get('settings', 'nav_prefs').catch(() => null);
    if (saved) this._prefs = { favorites: saved.favorites || [], hidden: saved.hidden || [] };

    /* Fino alla v88 esistevano due sistemi di preferiti che non si parlavano:
       questo (IndexedDB, `nav_prefs`) e `Favs` (localStorage, `ingly_favs3`).
       Ogni voce di menu portava due stelle, e aggiungere ai preferiti in una
       non si vedeva nell'altra. Ora la sorgente è una sola — ma i preferiti
       già salvati nel vecchio sistema non si buttano: si assorbono. */
    try {
      const vecchi = JSON.parse(localStorage.getItem('ingly_favs3') || '[]');
      if (Array.isArray(vecchi) && vecchi.length) {
        const prima = this._prefs.favorites.length;
        vecchi.forEach((s) => { if (s && this._prefs.favorites.indexOf(s) === -1) this._prefs.favorites.push(s); });
        if (this._prefs.favorites.length !== prima) await this.save();
      }
    } catch (e) { /* un JSON illeggibile non deve impedire l'avvio */ }

    this._loaded = true;
    this.apply();
  },

  async save() {
    await IDB.put('settings', { key: 'nav_prefs', ...this._prefs });
  },

  async toggleFavorite(section) {
    const idx = this._prefs.favorites.indexOf(section);
    if (idx > -1) this._prefs.favorites.splice(idx, 1);
    else this._prefs.favorites.push(section);
    await this.save();
    this.apply();
    toast(idx > -1 ? 'Rimosso dai preferiti' : 'Aggiunto ai preferiti ⭐', 'info');
  },

  async toggleHide(section) {
    const idx = this._prefs.hidden.indexOf(section);
    if (idx > -1) this._prefs.hidden.splice(idx, 1);
    else this._prefs.hidden.push(section);
    await this.save();
    this.apply();
  },

  restoreAll() {
    this._prefs.hidden = [];
    this.save().catch(()=>{});
    this.apply();
    toast('✅ Tutte le sezioni ripristinate!', 'success');
  },

  isFav(section) { return this._prefs.favorites.includes(section); },
  isHidden(section) { return this._prefs.hidden.includes(section); },

  apply() {
    // 1. Favorites bar
    this._renderFavBar();
    // 2. Hide/show nav items
    document.querySelectorAll('.nav-item[data-section]').forEach(el => {
      const section = el.dataset.section;
      const hide = this.isHidden(section);
      if (hide) {
        el.style.opacity = '0';
        el.style.maxHeight = '0';
        el.style.overflow = 'hidden';
        el.style.padding = '0';
        el.style.margin = '0';
        setTimeout(() => { el.style.display='none'; }, 200);
      } else {
        el.style.display = '';
        el.style.transition = 'opacity .2s, max-height .2s';
        requestAnimationFrame(() => {
          el.style.opacity = '1';
          el.style.maxHeight = '60px';
          el.style.overflow = '';
          el.style.padding = '';
          el.style.margin = '';
        });
      }
    });
    // 3. Add star + hide buttons to nav items (if not already)
    this._addNavControls();
  },

  _renderFavBar() {
    let bar = eid('nav-favorites-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'nav-favorites-bar';
      bar.style.cssText = 'padding:6px 8px;border-bottom:1px solid var(--border);margin-bottom:4px;display:flex;flex-wrap:wrap;gap:4px;min-height:0';
      const sidebar = document.querySelector('.sidebar') || document.querySelector('nav');
      if (sidebar) sidebar.insertBefore(bar, sidebar.firstChild);
    }

    // Show restore button if any sections hidden
    const hiddenCount = this._prefs.hidden.length;
    const restoreBarId = 'nav-restore-bar';
    let restoreBar = document.getElementById(restoreBarId);
    if (hiddenCount > 0) {
      if (!restoreBar) {
        restoreBar = document.createElement('div');
        restoreBar.id = restoreBarId;
        restoreBar.style.cssText = 'padding:5px 10px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)';
        const sidebar = document.querySelector('.sidebar') || document.querySelector('nav');
        if (sidebar) sidebar.insertBefore(restoreBar, sidebar.firstChild);
      }
      restoreBar.innerHTML = `<span style="font-size:10px;color:var(--text-dim)">${hiddenCount} sezione${hiddenCount>1?'':'e'} nascosta${hiddenCount>1?'':'e'}</span>
        <button onclick="NavPrefs.restoreAll()" style="font-size:10px;color:var(--primary);background:none;border:none;cursor:pointer;font-weight:700;padding:2px 6px;border-radius:4px" onmouseover="this.style.background='var(--primary-dim)'" onmouseout="this.style.background='none'">
          <i class="fas fa-eye"></i> Ripristina
        </button>`;
    } else if (restoreBar) {
      restoreBar.remove();
    }

    if (!this._prefs.favorites.length) {
      bar.innerHTML = `<div style="font-size:10px;color:var(--text-dim);padding:4px 6px;width:100%">⭐ Favorites — hover nav items to pin</div>`;
      bar.style.minHeight = '0';
      return;
    }

    bar.innerHTML = `<div style="font-size:9px;color:var(--text-dim);width:100%;margin-bottom:2px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">⭐ Quick Access</div>` +
      this._prefs.favorites.map(section => {
        const navEl = document.querySelector(`.nav-item[data-section="${section}"]`);
        const label = navEl?.textContent?.trim()?.replace(/^[⭐👁️\s]+/, '').slice(0, 14) || section;
        return `<button onclick="App.navigate('${section}')" 
          style="font-size:10px;padding:3px 8px;background:var(--primary);color:#000;border:none;border-radius:5px;cursor:pointer;font-weight:700;white-space:nowrap;max-width:110px;overflow:hidden;text-overflow:ellipsis"
          title="${label}">${label}</button>`;
      }).join('');
  },

  /* L'unica funzione che disegna le azioni di una voce di menu: una stella e
     un nascondi, mai due. È idempotente per costruzione — se il gruppo esiste
     lo aggiorna invece di aggiungerne un altro. */
  renderSectionActions(el) {
    if (!el || !el.dataset || !el.dataset.section) return;
    const section = el.dataset.section;
    const esistente = el.querySelector('.nav-ctrl');
    if (esistente) {
      const st = esistente.querySelector('button');
      if (st) { st.textContent = this.isFav(section) ? '⭐' : '☆'; }
      return;
    }
    this._buildNavControls(el, section);
  },

  _addNavControls() {
    document.querySelectorAll('.nav-item[data-section]').forEach(el => this.renderSectionActions(el));
  },

  _buildNavControls(el, section) {
    {
      const ctrl = document.createElement('div');
      ctrl.className = 'nav-ctrl';
      ctrl.style.cssText = 'display:none;gap:2px;margin-left:auto;flex-shrink:0';

      const starBtn = document.createElement('button');
      starBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:11px;padding:1px 3px;opacity:.7;line-height:1';
      starBtn.title = 'Aggiungi ai preferiti';
      starBtn.textContent = this.isFav(section) ? '⭐' : '☆';
      starBtn.onclick = (e) => { e.stopPropagation(); NavPrefs.toggleFavorite(section); };

      const hideBtn = document.createElement('button');
      hideBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:11px;padding:1px 3px;opacity:.7;line-height:1';
      hideBtn.innerHTML = '<i class="fas fa-eye-slash" style="font-size:10px"></i>';
      hideBtn.title = 'Nascondi dal menu';
      hideBtn.style.cssText += ';border-radius:4px;transition:all .15s;';
      hideBtn.onmouseover = ()=>{ hideBtn.style.background='#ef444430';hideBtn.style.color='#ef4444'; };
      hideBtn.onmouseout  = ()=>{ hideBtn.style.background='none';hideBtn.style.color=''; };
      hideBtn.onclick = async (e) => {
        e.stopPropagation();
        await NavPrefs.toggleHide(section);
        const name = section.charAt(0).toUpperCase()+section.slice(1);
        toast('Sezione nascosta — riaprila dal Gestore Moduli', 'info', 3000);
      };

      ctrl.appendChild(starBtn);
      ctrl.appendChild(hideBtn);
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.appendChild(ctrl);

      el.addEventListener('mouseenter', () => { ctrl.style.display = 'flex'; });
      el.addEventListener('mouseleave', () => { ctrl.style.display = 'none'; });
    }

    // Add "Show hidden" toggle at bottom of each nav group
    this._addShowHiddenButtons();
  },

  _addShowHiddenButtons() {
    document.querySelectorAll('.nav-group').forEach(group => {
      if (group.querySelector('.nav-show-hidden')) return;
      const hiddenInGroup = [...group.querySelectorAll('.nav-item[data-section]')]
        .filter(el => this.isHidden(el.dataset.section));
      if (!hiddenInGroup.length) return;

      const btn = document.createElement('div');
      btn.className = 'nav-show-hidden';
      btn.style.cssText = 'font-size:10px;color:var(--text-dim);padding:4px 12px;cursor:pointer;opacity:.6;user-select:none';
      btn.textContent = `+ ${hiddenInGroup.length} hidden`;
      btn.onclick = () => {
        hiddenInGroup.forEach(el => {
          NavPrefs.toggleHide(el.dataset.section);
        });
      };
      group.appendChild(btn);
    });
  },
};

// Auto-load NavPrefs when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => NavPrefs.load().catch(console.warn), 1000);
});

// ══════════════════════════════════════════════════════════════════════════════
// 🌐 FULL ENGLISH i18n EXTENSION v56
// Extends I18n.dict.en with ALL missing keys (full parity with Italian)
// ══════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  if (typeof I18n === 'undefined') return;

  // Extend EN dictionary with complete translations
  const enExtensions = {
    // Nav groups - full English
    'nav.ai_command': 'AI Command Center',
    'nav.intelligence': 'Intelligence & Analytics',
    'nav.market': 'Market Intelligence',
    'nav.pipeline': 'Sales Pipeline',
    'nav.production': 'Production & Stock',
    'nav.finance': 'Finance & Tax',
    'nav.crm': 'CRM & Customer AI',
    'nav.marketing': 'Marketing & Content AI',
    'nav.planning': 'Planning & Ops',
    'nav.brand': 'Brand & Business',
    'nav.reports': 'Reports & Export',
    'nav.system': 'System',
    // New merged sections
    'nav.items': 'Items',
    'nav.socialstudio': 'Social Studio',
    'nav.marketintel': 'Market Intel',
    'nav.etsyai': 'Etsy Suite',
    'nav.paints': 'Paints & Sprays',
    'section.items': 'Magazzino',
    'section.items.sub': 'Inventario unificato — Materiali · Gadget · Macchinari',
    'section.socialstudio': 'Social Studio',
    'section.socialstudio.sub': 'Accounts · Calendar · AI content generation',
    'section.marketintel': 'Market Intel',
    'section.marketintel.sub': 'Competitors · Trends · Pricing · AI Analysis',
    'section.etsyai': 'Etsy Suite',
    'section.etsyai.sub': 'Listings · SEO · Trends · Social · AI optimization',
    'section.paints': 'Paints & Sprays',
    'section.paints.sub': 'RAL colors · CMYK · Stock · Suppliers · Quality',
    // Items module UI
    'items.addItem': 'Add Item',
    'items.totalItems': 'Total Items',
    'items.inStock': 'In Stock',
    'items.lowStock': 'Low Stock',
    'items.outOfStock': 'Out of Stock',
    'items.stockValue': 'Stock Value',
    'items.allCategories': 'All Categories',
    'items.allAvailability': 'All Availability',
    'items.name': 'Name',
    'items.category': 'Category',
    'items.location': 'Location',
    'items.quantity': 'Quantity',
    'items.costPrice': 'Cost Price',
    'items.salePrice': 'Sale Price',
    'items.availability': 'Availability',
    'items.supplier': 'Supplier',
    'items.minStock': 'Min Stock Alert',
    'items.unit': 'Unit',
    'items.notes': 'Notes',
    // Categories
    'cat.rawMaterial': 'Raw Material',
    'cat.component': 'Component',
    'cat.tool': 'Tool',
    'cat.hardware': 'Hardware',
    'cat.packaging': 'Packaging',
    'cat.electronics': 'Electronics',
    'cat.wood': 'Wood',
    'cat.acrylic': 'Acrylic',
    'cat.metal': 'Metal',
    'cat.adhesive': 'Adhesive',
    'cat.paint': 'Paint',
    'cat.gadget': 'Gadget',
    'cat.ledLighting': 'LED & Lighting',
    'cat.laserSupply': 'Laser Supply',
    'cat.other': 'Other',
    // Pipeline
    'pipeline.confirm': 'Confirm Order',
    'pipeline.confirmed': 'Confirmed',
    'pipeline.cancelled': 'Cancelled',
    'pipeline.inProgress': 'In Progress',
    // Workflow
    'workflow.draft': 'Draft',
    'workflow.waiting': 'Awaiting Client',
    'workflow.production': 'In Production',
    'workflow.confirmed': 'Confirmed',
    'workflow.cancelled': 'Cancelled',
    // Kanban
    'kanban.backlog': 'To Do',
    'kanban.working': 'In Progress',
    'kanban.ready': 'Ready',
    'kanban.delivered': 'Delivered',
    // Common
    'common.search': 'Search...',
    'common.filter': 'Filter',
    'common.reset': 'Reset',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.loading': 'Loading...',
    'common.noResults': 'No results found',
    'common.confirmDelete': 'Are you sure you want to delete this?',
    // Social Studio
    'social.accounts': 'Accounts',
    'social.calendar': 'Calendar',
    'social.create': 'Create',
    'social.analytics': 'Analytics',
    'social.addAccount': 'Add Account',
    'social.newPost': 'New Post',
    'social.generateAI': 'Generate with AI',
    'social.schedule': 'Schedule',
    'social.platforms': 'Platforms',
    'social.tone': 'Tone',
    'social.topic': 'Topic / Product',
    // Market Intel
    'market.tracker': 'Tracker',
    'market.aiAnalysis': 'AI Analysis',
    'market.trends': 'Trends',
    'market.pricing': 'Pricing',
    'market.addCompetitor': 'Add Competitor',
    'market.yourPrice': 'Your Avg Price',
    'market.marketAvg': 'Market Average',
    'market.yourPosition': 'Your Position',
    // Finance
    'finance.revenue': 'Revenue',
    'finance.costs': 'Costs',
    'finance.profit': 'Net Profit',
    'finance.margin': 'Margin',
    'finance.breakeven': 'Break-Even',
    'finance.cashflow': 'Cash Flow',
    'finance.forecast': 'Forecast',
    'finance.taxReserve': 'Tax Reserve (15%)',
    // Clients
    'clients.champions': 'Champions',
    'clients.loyal': 'Loyal',
    'clients.atRisk': 'At Risk',
    'clients.lost': 'Lost',
    'clients.new': 'New',
    'clients.ltv': 'Lifetime Value',
    'clients.lastOrder': 'Last Order',
    'clients.totalOrders': 'Total Orders',
  };

  // Extend IT dictionary with complete Italian for any missing keys
  const itExtensions = {
    'nav.items': 'Items',
    'nav.socialstudio': 'Social Studio',
    'nav.marketintel': 'Market Intel',
    'nav.etsyai': 'Etsy Suite',
    'nav.paints': 'Vernici & Spray',
    'section.items': 'Magazzino',
    'section.items.sub': 'Magazzino unificato — Componenti · Materiali · Gadget',
    'section.socialstudio': 'Social Studio',
    'section.socialstudio.sub': 'Account · Calendario · Generazione contenuti AI',
    'section.marketintel': 'Market Intel',
    'section.marketintel.sub': 'Competitor · Trend · Prezzi · Analisi AI',
    'section.etsyai': 'Etsy Suite',
    'section.etsyai.sub': 'Listing · SEO · Trend · Social · Ottimizzazione AI',
    'items.addItem': 'Aggiungi Articolo',
    'items.totalItems': 'Articoli Totali',
    'items.inStock': 'In Stock',
    'items.lowStock': 'Scorta Bassa',
    'items.outOfStock': 'Esaurito',
    'items.stockValue': 'Valore Magazzino',
    'items.allCategories': 'Tutte le Categorie',
    'items.allAvailability': 'Tutta la Disponibilità',
    'items.name': 'Nome',
    'items.category': 'Categoria',
    'items.location': 'Posizione',
    'items.quantity': 'Quantità',
    'items.costPrice': 'Prezzo di Costo',
    'items.salePrice': 'Prezzo di Vendita',
    'items.availability': 'Disponibilità',
    'items.supplier': 'Fornitore',
    'items.minStock': 'Scorta Minima',
    'items.unit': 'Unità',
    'items.notes': 'Note',
    'cat.rawMaterial': 'Materia Prima',
    'cat.component': 'Componente',
    'cat.tool': 'Strumento',
    'cat.hardware': 'Hardware',
    'cat.packaging': 'Imballaggi',
    'cat.electronics': 'Elettronica',
    'cat.wood': 'Legno',
    'cat.acrylic': 'Plexiglass / Acrilico',
    'cat.metal': 'Metallo',
    'cat.adhesive': 'Adesivi / Colle',
    'cat.paint': 'Vernice',
    'cat.gadget': 'Gadget',
    'cat.ledLighting': 'LED & Illuminazione',
    'cat.laserSupply': 'Materiali Laser',
    'cat.other': 'Altro',
    'pipeline.confirm': 'Conferma Ordine',
    'pipeline.confirmed': 'Confermato',
    'pipeline.cancelled': 'Annullato',
    'workflow.draft': 'Bozza',
    'workflow.waiting': 'In Attesa Cliente',
    'workflow.production': 'In Produzione',
    'workflow.confirmed': 'Confermato',
    'workflow.cancelled': 'Annullato',
    'common.search': 'Cerca...',
    'common.filter': 'Filtra',
    'common.reset': 'Reset',
    'common.save': 'Salva',
    'common.cancel': 'Annulla',
    'common.delete': 'Elimina',
    'common.edit': 'Modifica',
    'common.add': 'Aggiungi',
    'common.export': 'Esporta',
    'common.import': 'Importa',
    'common.loading': 'Caricamento...',
    'common.noResults': 'Nessun risultato',
    'common.confirmDelete': 'Eliminare questo elemento?',
    'social.addAccount': 'Aggiungi Account',
    'social.newPost': 'Nuovo Post',
    'social.generateAI': 'Genera con AI',
    'market.addCompetitor': 'Aggiungi Competitor',
    'market.yourPrice': 'Tuo Prezzo Medio',
    'market.marketAvg': 'Media Mercato',
    'market.yourPosition': 'La Tua Posizione',
    'finance.revenue': 'Ricavi',
    'finance.costs': 'Costi',
    'finance.profit': 'Utile Netto',
    'finance.margin': 'Margine',
    'finance.breakeven': 'Break-Even',
    'finance.taxReserve': 'Riserva Fiscale (15%)',
    'clients.champions': 'Campioni',
    'clients.loyal': 'Fedeli',
    'clients.atRisk': 'A Rischio',
    'clients.lost': 'Persi',
    'clients.new': 'Nuovi',
  };

  // Apply extensions
  if (I18n.dict.en) Object.assign(I18n.dict.en, enExtensions);
  if (I18n.dict.it) Object.assign(I18n.dict.it, itExtensions);

  // Patch I18n navMap to include new sections
  const origApply = I18n.apply?.bind(I18n);
  if (origApply) {
    I18n.apply = function() {
      origApply();
      // Update new nav items labels
      const newNavMap = {
        'items': 'nav.items', 'socialstudio': 'nav.socialstudio',
        'marketintel': 'nav.marketintel', 'etsyai': 'nav.etsyai', 'paints': 'nav.paints',
      };
      Object.entries(newNavMap).forEach(([section, key]) => {
        document.querySelectorAll(`.nav-item[data-section="${section}"]`).forEach(el => {
          const t = I18n.t(key);
          if (t && t !== key) {
            // Preserve icons - only update text node
            const textNodes = [...el.childNodes].filter(n => n.nodeType === 3);
            if (textNodes.length) textNodes[textNodes.length - 1].textContent = ' ' + t;
          }
        });
      });
    };
  }

  console.log('[v56] i18n extensions loaded — IT+EN full parity');
});


// ══════════════════════════════════════════════════════════════════
// ETSY LAB — Ideas Tracker (link → info + image + rating)
// ══════════════════════════════════════════════════════════════════

// ── Universal Excel/CSV Import Engine v5.1 ──────────────────────────
// Supports .xlsx, .xls, .ods, .csv — uses SheetJS (already loaded)
const ExcelImport = {
  // Parse file and return rows as objects with mapped columns
  async parseFile(file) {
    if (!window.XLSX) throw new Error('SheetJS non caricato');
    const buf  = await file.arrayBuffer();
    const wb   = XLSX.read(buf, { type: 'array', cellDates: true });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:'', blankrows:false, raw:false });
    if (rows.length < 2) throw new Error('File vuoto o senza intestazione');
    const hdrs = rows[0].map(h => String(h).trim().toLowerCase()
      .replace(/\s+/g,'_').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9_]/g,''));
    const col = (...names) => { for(const n of names){ const i=hdrs.findIndex(h=>h===n||h.includes(n)); if(i>=0)return i; } return -1; };
    return { rows: rows.slice(1), hdrs, col, sheetName: wb.SheetNames[0], fileName: file.name };
  },

  // Show preview modal before import
  showPreview(file, mappedFields, totalRows, onConfirm) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:9600;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px)';
    const badges = mappedFields.filter(Boolean).map(f=>`<span style="padding:2px 10px;background:var(--primary-dim);color:var(--primary);border-radius:99px;font-size:11px;font-weight:600">${f}</span>`).join('');
    const warn = mappedFields.filter(Boolean).length < 2 ? '<div style="color:var(--orange);font-size:12px;margin-top:8px">⚠️ Poche colonne rilevate — controlla intestazione file</div>' : '';
    ov.innerHTML = `<div style="background:var(--bg-card);border-radius:18px;padding:26px;width:100%;max-width:500px;border:1px solid var(--border2);box-shadow:0 24px 60px rgba(0,0,0,.7)">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
        <div style="width:42px;height:42px;border-radius:10px;background:#22c55e20;border:1px solid #22c55e40;display:flex;align-items:center;justify-content:center;font-size:20px">📊</div>
        <div><div style="font-size:16px;font-weight:800;color:var(--text)">Import Excel / CSV</div>
        <div style="font-size:12px;color:var(--text-muted)">${file.name} · ${totalRows} righe</div></div>
        <button onclick="this.closest('[style*=fixed]').remove()" style="margin-left:auto;background:none;border:1px solid var(--border);border-radius:8px;color:var(--text-muted);padding:4px 10px;cursor:pointer">✕</button>
      </div>
      <div style="margin-bottom:14px;padding:12px;background:var(--bg-card2);border-radius:10px">
        <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Colonne Rilevate</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">${badges}${warn}</div>
      </div>
      <div style="display:flex;gap:10px">
        <button onclick="this.closest('[style*=fixed]').remove()" style="flex:1;padding:10px;background:var(--bg-card3);color:var(--text-muted);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:13px;font-weight:600">Annulla</button>
        <button id="xl-confirm-btn" style="flex:2;padding:10px;background:var(--primary);color:#0a0a0a;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:700">📥 Importa ${totalRows} righe</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
    document.getElementById('xl-confirm-btn').onclick = async () => { ov.remove(); await onConfirm(); };
  },

  // Open file picker and return parsed result
  openPicker(accept='.xlsx,.xls,.ods,.csv') {
    return new Promise(res => {
      const inp = document.createElement('input');
      inp.type='file'; inp.accept=accept;
      inp.onchange = e => res(e.target.files[0] || null);
      inp.click();
    });
  }
};

const ExcelExport = {
  async exportSales(){
    const sales=await AppStore.get('sales').catch(()=>[]);
    const clients=await AppStore.get('clients').catch(()=>[]);
    if(!window.XLSX){toast('SheetJS non disponibile','warning');return;}
    const wb=XLSX.utils.book_new();
    // Sheet 1: All sales
    const hdr=['ID','Data','Cliente','Email','Descrizione','Canale','Importo €','Stato','Note'];
    const rows=sales.map(s=>{
      const cl=clients.find(c=>c.id===s.clientId)||{};
      return [s.id||'',s.date||'',s.clientName||cl.name||'',cl.email||'',s.desc||'',s.channel||'',+s.amount||0,s.status==='pagato'?'Pagato':s.status==='da_pagare'?'Da Pagare':(s.status||''),s.note||''];
    });
    const totPagato=sales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
    const totDaPag=sales.filter(s=>s.status==='da_pagare').reduce((a,s)=>a+(+s.amount||0),0);
    rows.push([]);rows.push(['','','','','','','TOTALE PAGATO:',totPagato,'']);rows.push(['','','','','','','DA INCASSARE:',totDaPag,'']);rows.push(['','','','','','','TOTALE:',totPagato+totDaPag,'']);
    const ws1=XLSX.utils.aoa_to_sheet([hdr,...rows]);
    ws1['!cols']=[{wch:10},{wch:13},{wch:26},{wch:28},{wch:38},{wch:16},{wch:14},{wch:14},{wch:24}];
    XLSX.utils.book_append_sheet(wb,ws1,'Vendite');
    // Sheet 2: Monthly summary
    const monthMap={};
    sales.forEach(s=>{if(!s.date)return;const m=s.date.slice(0,7);if(!monthMap[m])monthMap[m]={pagato:0,daPagare:0,n:0};if(s.status==='pagato')monthMap[m].pagato+=(+s.amount||0);if(s.status==='da_pagare')monthMap[m].daPagare+=(+s.amount||0);monthMap[m].n++;});
    const r2=[['Mese','N° Vendite','Incassato €','Da Incassare €','Totale €']];
    Object.entries(monthMap).sort().forEach(([m,v])=>{r2.push([m,v.n,v.pagato,v.daPagare,v.pagato+v.daPagare]);});
    const ws2=XLSX.utils.aoa_to_sheet(r2);ws2['!cols']=[{wch:12},{wch:12},{wch:16},{wch:18},{wch:14}];
    XLSX.utils.book_append_sheet(wb,ws2,'Riepilogo Mensile');
    // Sheet 3: Per cliente
    const cm={};sales.forEach(s=>{const k=(s.clientName||'—').trim();if(!cm[k])cm[k]={pagato:0,daPag:0,n:0,ultimo:''};if(s.status==='pagato')cm[k].pagato+=(+s.amount||0);if(s.status==='da_pagare')cm[k].daPag+=(+s.amount||0);cm[k].n++;if((s.date||'')>cm[k].ultimo)cm[k].ultimo=s.date||'';});
    const r3=[['Cliente','N° Ordini','Incassato €','Da Incassare €','Ultimo Ordine']];
    Object.entries(cm).sort((a,b)=>b[1].pagato-a[1].pagato).forEach(([k,v])=>{r3.push([k,v.n,v.pagato,v.daPag,v.ultimo]);});
    const ws3=XLSX.utils.aoa_to_sheet(r3);ws3['!cols']=[{wch:28},{wch:12},{wch:16},{wch:18},{wch:14}];
    XLSX.utils.book_append_sheet(wb,ws3,'Per Cliente');
    const fname='Ingly_Vendite_'+new Date().toISOString().slice(0,10)+'.xlsx';
    XLSX.writeFile(wb,fname);
    toast('✅ Excel scaricato: '+sales.length+' vendite · 3 fogli','success',4000);
  },


  async exportClients(){
    const clients = await AppStore.get('clients').catch(()=>[]);
    const sales = await AppStore.get('sales').catch(()=>[]);
    const data = [
      ['ID', 'Nome', 'Email', 'Telefono', 'Città', 'N° Ordini', 'Valore Totale €', 'Ultimo Ordine'],
      ...clients.map(c=>{
        const cSales = sales.filter(s=>s.clientId===c.id&&s.status==='pagato');
        const totalVal = cSales.reduce((a,s)=>a+(+s.amount||0),0);
        const lastOrder = cSales.sort((a,b)=>new Date(b.date)-new Date(a.date))[0]?.date||'—';
        return [c.id, c.name||'—', c.email||'—', c.phone||'—', c.city||'—', cSales.length, totalVal, lastOrder];
      })
    ];
    this._download(data, `Ingly_Clienti_${new Date().toISOString().slice(0,10)}.xlsx`, {
      headerRow: true, col_widths: [8,28,30,18,18,12,16,16]
    });
    toast('Export Excel clienti completato ✅', 'success');
  },

  async exportPrimaNota(){
    const cf = await AppStore.get('cashflow').catch(()=>[]);
    const data = [
      ['Data', 'Tipo', 'Categoria', 'Descrizione', 'Entrata €', 'Uscita €', 'Note'],
      ...cf.map(r=>[r.date, r.type==='income'?'Entrata':'Uscita', r.cat||'—', r.desc||'—',
        r.type==='income'?(+r.amount||0):0, r.type==='expense'?(+r.amount||0):0, r.notes||'—'])
    ];
    const totIn = cf.filter(r=>r.type==='income').reduce((a,r)=>a+(+r.amount||0),0);
    const totOut = cf.filter(r=>r.type==='expense').reduce((a,r)=>a+(+r.amount||0),0);
    data.push(['', '', '', 'TOTALE', totIn, totOut, `NETTO: €${(totIn-totOut).toFixed(2)}`]);
    this._download(data, `Ingly_PrimaNota_${new Date().toISOString().slice(0,10)}.xlsx`, {
      headerRow: true, totalRow: true, col_widths: [14,12,18,40,14,14,28]
    });
    toast('Export Prima Nota completato ✅', 'success');
  },

  async exportMaterials(){
    const mats = await AppStore.get('materials').catch(()=>[]);
    const data = [
      ['ID','Nome','Categoria','Spessore','Costo €/mq','Fornitore','Scorta (fogli)','Note'],
      ...mats.map(m=>[m.id, m.name, m.cat||'—', m.thickness||'—', m.cost||0, m.supplier||'—', m.stockQty??'—', (m.notes||'').slice(0,60)])
    ];
    this._download(data, `Ingly_Materiali_${new Date().toISOString().slice(0,10)}.xlsx`, {
      headerRow: true, col_widths: [8,40,14,12,14,24,16,60]
    });
    toast('Export Excel materiali completato ✅', 'success');
  },


  async exportCatalog(){
    const items=await AppStore.get('catalog').catch(()=>[]);
    if(!window.XLSX){toast('SheetJS non disponibile','warning');return;}
    const wb=XLSX.utils.book_new();
    const hdr=['Nome','Descrizione','Categoria','SKU','Prezzo €','Costo €','Margine %','Attivo'];
    const rows=items.map(i=>[i.name||'',i.desc||'',i.category||'',i.sku||'',(+i.salePrice||+i.price||0),(+i.costPrice||+i.cost||0),(+i.margin||0),i.active!==false?'Sì':'No']);
    const ws=XLSX.utils.aoa_to_sheet([hdr,...rows]);
    ws['!cols']=[{wch:28},{wch:36},{wch:18},{wch:12},{wch:12},{wch:12},{wch:12},{wch:8}];
    XLSX.utils.book_append_sheet(wb,ws,'Catalogo');
    // Sheet 2: per categoria
    const cats={};items.forEach(i=>{const k=i.category||'Altro';if(!cats[k])cats[k]=[];cats[k].push(i);});
    const catRows=[['Categoria','N° Prodotti','Prezzo Medio €','Margine Medio %']];
    Object.entries(cats).sort().forEach(([k,v])=>{catRows.push([k,v.length,Math.round(v.reduce((a,i)=>a+(+i.salePrice||+i.price||0),0)/v.length*100)/100,Math.round(v.reduce((a,i)=>a+(+i.margin||0),0)/v.length)]);});
    const ws2=XLSX.utils.aoa_to_sheet(catRows);
    ws2['!cols']=[{wch:20},{wch:14},{wch:16},{wch:18}];
    XLSX.utils.book_append_sheet(wb,ws2,'Per Categoria');
    XLSX.writeFile(wb,'Ingly_Catalogo_'+new Date().toISOString().slice(0,10)+'.xlsx');
    toast('✅ Catalogo esportato ('+items.length+' prodotti)','success');
  },

  async exportEquipment(){
    const items=await AppStore.get('equipment').catch(()=>[]);
    if(!window.XLSX){toast('SheetJS non disponibile','warning');return;}
    const wb=XLSX.utils.book_new();
    const hdr=['Nome','Brand','Categoria','Seriale','Data Acquisto','Costo €','Vita (anni)','Stato','Note'];
    const rows=items.map(i=>[i.name||'',i.brand||'',i.category||'',i.serialNo||'',i.purchaseDate||'',+i.cost||0,+i.lifeYears||5,i.status==='active'?'Attivo':'Inattivo',i.notes||'']);
    const ws=XLSX.utils.aoa_to_sheet([hdr,...rows]);
    ws['!cols']=[{wch:36},{wch:14},{wch:16},{wch:18},{wch:14},{wch:12},{wch:12},{wch:10},{wch:28}];
    XLSX.utils.book_append_sheet(wb,ws,'Attrezzature');
    XLSX.writeFile(wb,'Ingly_Attrezzature_'+new Date().toISOString().slice(0,10)+'.xlsx');
    toast('✅ Attrezzature esportate ('+items.length+' record)','success');
  },

  async exportCashflow(){
    const items=await AppStore.get('cashflow').catch(()=>[]);
    if(!window.XLSX){toast('SheetJS non disponibile','warning');return;}
    const wb=XLSX.utils.book_new();
    const hdr=['Data','Tipo','Descrizione','Importo €','Categoria'];
    const rows=items.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(i=>[i.date||'',i.type==='entrata'?'Entrata':'Uscita',i.desc||'',+i.amount||0,i.cat||'']);
    const totEnt=items.filter(i=>i.type==='entrata').reduce((a,i)=>a+(+i.amount||0),0);
    const totUsc=items.filter(i=>i.type==='uscita').reduce((a,i)=>a+(+i.amount||0),0);
    rows.push([]);rows.push(['','TOTALE ENTRATE:','',totEnt,'']);rows.push(['','TOTALE USCITE:','',-totUsc,'']);rows.push(['','SALDO:','',totEnt-totUsc,'']);
    const ws=XLSX.utils.aoa_to_sheet([hdr,...rows]);
    ws['!cols']=[{wch:13},{wch:10},{wch:40},{wch:13},{wch:18}];
    XLSX.utils.book_append_sheet(wb,ws,'Cashflow');
    XLSX.writeFile(wb,'Ingly_Cashflow_'+new Date().toISOString().slice(0,10)+'.xlsx');
    toast('✅ Cashflow esportato ('+items.length+' movimenti)','success');
  },


  // ── Catalog ZIP export: Excel + images folder ──────────────────────
  async exportCatalogZip(){
    const prods = await AppStore.get('catalog').catch(()=>[]);
    if(!prods.length){ toast('Nessun prodotto nel catalogo','warning'); return; }
    if(!window.XLSX){ toast('SheetJS non disponibile','warning'); return; }
    // Carica JSZip on-demand se non ancora disponibile
    if(!window.JSZip){
      await new Promise((res,rej)=>{
        const s=document.createElement('script');
        s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        s.onload=res; s.onerror=rej;
        document.head.appendChild(s);
      });
    }
    if(!window.JSZip){ toast('JSZip non disponibile — controlla la connessione','warning'); return; }

    toast('📦 Creazione ZIP catalogo...','info',3000);

    const zip = new JSZip();
    const imgFolder = zip.folder('immagini');

    // Build Excel sheet
    const wb = XLSX.utils.book_new();
    const hdr = ['Nome','Categoria','SKU','Prezzo €','Costo €','Margine %','Descrizione','Materiale','Tempi (min)','Emoji','File Immagine'];
    const rows = prods.map((p,i) => {
      const margin = p.salePrice>0&&p.costPrice>0 ? Math.round((p.salePrice-p.costPrice)/p.salePrice*100) : 0;
      const safeName = (p.name||'prodotto_'+i).replace(/[^a-z0-9àèìòùáéíóú]/gi,'_').replace(/_+/g,'_').toLowerCase().slice(0,40);
      const imgFileName = p.photo ? `${(p.category||'altro').replace(/[^a-z0-9]/gi,'_').toLowerCase()}/${safeName}.jpg` : '';
      // Add photo to ZIP if present
      if(p.photo){
        try {
          // Strip base64 header
          const b64 = p.photo.replace(/^data:image\/[a-z+]+;base64,/,'');
          imgFolder.file(imgFileName, b64, {base64:true});
        } catch(e){}
      }
      return [p.name||'',p.category||'',p.sku||'',+p.salePrice||0,+p.costPrice||0,margin,p.desc||'',p.material||'',+p.productionTime||0,p.emoji||'',imgFileName];
    });
    const ws = XLSX.utils.aoa_to_sheet([hdr,...rows]);
    ws['!cols']=[{wch:28},{wch:16},{wch:12},{wch:12},{wch:12},{wch:12},{wch:36},{wch:16},{wch:14},{wch:8},{wch:30}];
    XLSX.utils.book_append_sheet(wb,'Catalogo',ws);

    // Convert XLSX to base64 for ZIP
    const xlsxBuf = XLSX.write(wb, {type:'base64', bookType:'xlsx'});
    zip.file('catalogo_'+new Date().toISOString().slice(0,10)+'.xlsx', xlsxBuf, {base64:true});

    // README
    zip.file('LEGGIMI.txt', 'CATALOGO INGLY OS\n==================\n'+
      'Data: '+new Date().toLocaleDateString('it-IT')+'\n'+
      'Prodotti: '+prods.length+'\n'+
      'Immagini: '+prods.filter(p=>p.photo).length+'\n\n'+
      'Per reimportare: usa il bottone Import Excel nel Catalogo\n'+
      'Nomi immagini corrispondono alla colonna "File Immagine" nel foglio Excel\n');

    // Generate ZIP blob
    const blob = await zip.generateAsync({type:'blob', compression:'DEFLATE', compressionOptions:{level:6}});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Ingly_Catalogo_'+new Date().toISOString().slice(0,10)+'.zip';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 3000);

    const imgCount = prods.filter(p=>p.photo).length;
    toast('✅ ZIP scaricato: '+prods.length+' prodotti'+(imgCount?' + '+imgCount+' immagini':''),'success',5000);
  },

  _download(data, filename, opts={}){
    if(!window.XLSX){ toast('SheetJS non caricato — ricarica la pagina','warning'); return; }
    let ws;
    // Build worksheet via HTML table → preserves <b> tags as bold in Excel
    if(opts.headerRow && data.length > 0){
      const headers = data[0];
      const rows = data.slice(1);
      // Build HTML table string with bold headers
      let html = '<table><thead><tr>'
        + headers.map(h => `<th><b>${h}</b></th>`).join('')
        + '</tr></thead><tbody>'
        + rows.map(row => '<tr>' + row.map(cell => `<td>${cell ?? ''}</td>`).join('') + '</tr>').join('')
        + '</tbody></table>';
      ws = window.XLSX.utils.table_to_sheet(
        (() => { const d = document.createElement('div'); d.innerHTML = html; return d.firstChild; })()
      );
    } else {
      ws = window.XLSX.utils.aoa_to_sheet(data);
    }
    // Column widths
    if(opts.col_widths) ws['!cols'] = opts.col_widths.map(w=>({wch:w}));
    // AutoFilter on header row
    if(opts.headerRow && data.length > 0){
      const cols = data[0].length;
      const colLetter = String.fromCharCode(64 + cols); // A-Z
      ws['!autofilter'] = { ref: `A1:${colLetter}1` };
    }
    // Total row separator (freeze header row)
    ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2' };
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Ingly Export');
    window.XLSX.writeFile(wb, filename);
    toast('Export Excel completato ✅', 'info');
  },

  // Export Quotes
  async exportQuotes(){
    const quotes = await AppStore.get('quotes').catch(()=>[]);
    const data = [
      ['#','Data','Nome','Cliente','Stato','Netto €','Lordo €','IVA','Sconto%'],
      ...quotes.map(q=>[q.id, q.date||'—', q.name||'—', q.clientName||'—', q.status||'bozza',
        +(q.netPrice||0), +(q.grossPrice||0), q.ivaMode!==false?'22%':'esclusa', +(q.discount||0)+'%'])
    ];
    this._download(data, `Ingly_Preventivi_${new Date().toISOString().slice(0,10)}.xlsx`, {
      headerRow:true, col_widths:[8,14,40,24,12,12,12,10,10]
    });
  },

  // Export Orders
  async exportOrders(){
    const orders = await AppStore.get('orders').catch(()=>[]);
    const data = [
      ['#','Data','Cliente','Titolo','Stato','Priorità','Scadenza','Prezzo €'],
      ...orders.map(o=>[o.id, o.date||'—', o.clientName||'—', o.title||'—',
        o.status||'—', o.priority||'—', o.deadline||'—', +(o.price||o.total||0)])
    ];
    this._download(data, `Ingly_Ordini_${new Date().toISOString().slice(0,10)}.xlsx`, {
      headerRow:true, col_widths:[8,14,24,40,14,12,14,12]
    });
  },

  // Export Items/Inventory
  async exportItems(){
    const items = await AppStore.get('items').catch(()=>[]);
    const mats = await AppStore.get('materials').catch(()=>[]);
    const all = [...items, ...mats];
    const data = [
      ['#','Nome','Tipo/Cat','Quantità','Scorta Min','Costo €','Prezzo €','Fornitore','SKU'],
      ...all.map(i=>[i.id, i.name||'—', i.category||i.cat||i.type||'—',
        +(i.quantity||i.qty||i.stockQty||0), +(i.minStock||i.minQty||0),
        +(i.cost||i.costPrice||0), +(i.price||i.sellPrice||0), i.supplier||'—', i.sku||'—'])
    ];
    this._download(data, `Ingly_Magazzino_${new Date().toISOString().slice(0,10)}.xlsx`, {
      headerRow:true, col_widths:[8,40,16,12,12,12,12,24,16]
    });
  },

  showMenu(){
    const modal=document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=`<div style="background:var(--bg-card);border-radius:16px;padding:24px;max-width:380px;width:100%;border:1.5px solid var(--border)">
      <div style="font-size:16px;font-weight:800;margin-bottom:16px">📊 Export Excel (.xlsx)</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button onclick="ExcelExport.exportSales();this.closest('[style*=fixed]').remove()" style="padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);border-radius:8px;cursor:pointer;text-align:left;font-size:13px;display:flex;align-items:center;gap:10px"><span style="width:24px">📈</span><div><strong>Vendite & Fatture</strong><br><small style="opacity:.6">Importo, stato, cliente, canale</small></div></button>
        <button onclick="ExcelExport.exportQuotes();this.closest('[style*=fixed]').remove()" style="padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);border-radius:8px;cursor:pointer;text-align:left;font-size:13px;display:flex;align-items:center;gap:10px"><span style="width:24px">📋</span><div><strong>Preventivi</strong><br><small style="opacity:.6">Con stato, importo, IVA, sconto</small></div></button>
        <button onclick="ExcelExport.exportClients();this.closest('[style*=fixed]').remove()" style="padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);border-radius:8px;cursor:pointer;text-align:left;font-size:13px;display:flex;align-items:center;gap:10px"><span style="width:24px">👥</span><div><strong>Clienti</strong><br><small style="opacity:.6">Contatti, note, storico</small></div></button>
        <button onclick="ExcelExport.exportOrders();this.closest('[style*=fixed]').remove()" style="padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);border-radius:8px;cursor:pointer;text-align:left;font-size:13px;display:flex;align-items:center;gap:10px"><span style="width:24px">📦</span><div><strong>Ordini</strong><br><small style="opacity:.6">Kanban, stato, scadenze</small></div></button>
        <button onclick="ExcelExport.exportItems();this.closest('[style*=fixed]').remove()" style="padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);border-radius:8px;cursor:pointer;text-align:left;font-size:13px;display:flex;align-items:center;gap:10px"><span style="width:24px">🏭</span><div><strong>Magazzino completo</strong><br><small style="opacity:.6">Items + Materiali unificati</small></div></button>
        <button onclick="ExcelExport.exportPrimaNota();this.closest('[style*=fixed]').remove()" style="padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);border-radius:8px;cursor:pointer;text-align:left;font-size:13px;display:flex;align-items:center;gap:10px"><span style="width:24px">📒</span><div><strong>Prima Nota / Cashflow</strong><br><small style="opacity:.6">Entrate e uscite</small></div></button>
        <button onclick="ExcelExport.exportMaterials();this.closest('[style*=fixed]').remove()" style="padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);border-radius:8px;cursor:pointer;text-align:left;font-size:13px;display:flex;align-items:center;gap:10px"><span style="width:24px">🪵</span><div><strong>Materiali laser</strong><br><small style="opacity:.6">Catalogo materiali produzione</small></div></button>
      </div>
      <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;padding:10px;background:none;border:none;color:var(--text-muted);cursor:pointer;margin-top:12px;font-size:12px">Annulla</button>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  },

  // ── Export tutto in un unico file multi-sheet ─────────────────────────────
  async exportAll() {
    if(!window.XLSX){ toast('SheetJS non disponibile','warning'); return; }
    toast('⏳ Preparazione export completo...','info',2000);
    try {
      const [sales,clients,orders,catalog,cashflow,materials,items] = await Promise.all([
        AppStore.get('sales').catch(()=>[]),
        AppStore.get('clients').catch(()=>[]),
        AppStore.get('orders').catch(()=>[]),
        AppStore.get('catalog').catch(()=>[]),
        AppStore.get('cashflow').catch(()=>[]),
        AppStore.get('materials').catch(()=>[]),
        AppStore.get('items').catch(()=>[]),
      ]);
      const wb = XLSX.utils.book_new();

      // Sheet 1: Vendite
      const s1=[['Data','Cliente','Descrizione','Importo €','Stato','Canale'],
        ...sales.map(s=>[s.date||'',s.clientName||'',s.desc||'',+s.amount||0,s.status||'',s.channel||''])];
      const ws1=XLSX.utils.aoa_to_sheet(s1); ws1['!cols']=[{wch:13},{wch:26},{wch:40},{wch:14},{wch:14},{wch:16}];
      XLSX.utils.book_append_sheet(wb,ws1,'Vendite');

      // Sheet 2: Clienti
      const s2=[['Nome','Email','Telefono','Città','Canale'],
        ...clients.map(c=>[c.name||'',c.email||'',c.phone||c.tel||'',c.city||'',c.channel||''])];
      const ws2=XLSX.utils.aoa_to_sheet(s2); ws2['!cols']=[{wch:28},{wch:30},{wch:18},{wch:18},{wch:16}];
      XLSX.utils.book_append_sheet(wb,ws2,'Clienti');

      // Sheet 3: Ordini
      const s3=[['Nome Lavoro','Cliente','Valore €','Scadenza','Stato'],
        ...orders.map(o=>[o.name||'',o.clientName||'',+o.value||0,o.dueDate||'',o.status||o.stage||''])];
      const ws3=XLSX.utils.aoa_to_sheet(s3); ws3['!cols']=[{wch:36},{wch:26},{wch:14},{wch:14},{wch:18}];
      XLSX.utils.book_append_sheet(wb,ws3,'Ordini');

      // Sheet 4: Cashflow
      const s4=[['Data','Tipo','Categoria','Descrizione','Importo €'],
        ...cashflow.map(r=>[r.date||'',r.type==='entrata'?'Entrata':'Uscita',r.cat||r.category||'',r.desc||r.description||'',+r.amount||0])];
      const ws4=XLSX.utils.aoa_to_sheet(s4); ws4['!cols']=[{wch:13},{wch:10},{wch:18},{wch:40},{wch:14}];
      XLSX.utils.book_append_sheet(wb,ws4,'Cashflow');

      // Sheet 5: Catalogo
      const s5=[['Nome','Categoria','Prezzo Vendita €','Prezzo Costo €','Margine %','Materiale'],
        ...catalog.map(p=>[p.name||'',p.category||'',+p.salePrice||0,+p.costPrice||0,+p.margin||0,p.material||''])];
      const ws5=XLSX.utils.aoa_to_sheet(s5); ws5['!cols']=[{wch:40},{wch:22},{wch:18},{wch:16},{wch:13},{wch:22}];
      XLSX.utils.book_append_sheet(wb,ws5,'Catalogo');

      const fname = 'Ingly_Export_Completo_'+new Date().toISOString().slice(0,10)+'.xlsx';
      XLSX.writeFile(wb, fname);
      toast(`✅ Export completo: ${sales.length} vendite · ${clients.length} clienti · ${orders.length} ordini — 5 fogli`, 'success', 5000);
    } catch(e) {
      toast('Errore export: '+e.message,'error');
    }
  },
};

// ══════════════════════════════════════════════════════════════════
// SOLLECITI AUTOMATICI
// ══════════════════════════════════════════════════════════════════
const StockAlert = {
  async render() {
    const el = eid('view-stockalert'); if(!el) return;
    el.innerHTML = `<div style="padding:20px;max-width:1100px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <h2 style="color:#fbbf24;margin:0;font-size:22px">📦 Stock Alert</h2>
        <span style="font-size:11px;background:#fbbf2415;color:#fbbf24;padding:3px 10px;border-radius:99px;border:1px solid #fbbf2430;font-weight:700">INTELLIGENTE</span>
      </div>
      <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px">Monitor materiali basato sui tuoi ordini reali — alert automatici prima che finisca lo stock</p>
      <div id="sa-content"><div style="text-align:center;padding:40px"><div style="width:40px;height:40px;border:3px solid var(--border);border-top-color:#fbbf24;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 12px"></div></div></div>
    </div>`;
    await this._load();
  },

  async _load() {
    const el = eid('sa-content'); if(!el) return;
    try {
      const [materials, sales, orders] = await Promise.all([
        IDB.getAll('materials').catch(()=>[]),
        IDB.getAll('sales').catch(()=>[]),
        IDB.getAll('orders').catch(()=>[])
      ]);

      // Calculate monthly material consumption from sales
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthSales = sales.filter(s=>s.status==='pagato'&&new Date(s.date||0)>=monthStart);
      const monthRevenue = monthSales.reduce((a,s)=>a+(+s.amount||0),0);
      const openOrders = orders.filter(o=>o.status!=='done'&&o.status!=='completed');

      // Stock status for each material
      const matItems = materials.map(m => {
        const stock = +m.quantity||0;
        const minStock = +m.minStock||+m.minQuantity||0;
        const unit = m.unit||'pz';
        const price = +m.price||+m.unitCost||0;
        const monthlyConsumption = +m.monthlyConsumption||0;
        const daysLeft = monthlyConsumption > 0 ? Math.floor(stock / (monthlyConsumption/30)) : null;
        const status = stock <= 0 ? 'empty' : minStock > 0 && stock <= minStock ? 'low' : daysLeft !== null && daysLeft < 14 ? 'warning' : 'ok';
        return { ...m, stock, minStock, unit, price, daysLeft, status, monthlyConsumption };
      }).sort((a,b) => {
        const order = {empty:0,low:1,warning:2,ok:3};
        return (order[a.status]||3) - (order[b.status]||3);
      });

      const empty = matItems.filter(m=>m.status==='empty');
      const low = matItems.filter(m=>m.status==='low');
      const warning = matItems.filter(m=>m.status==='warning');
      const ok = matItems.filter(m=>m.status==='ok');

      const statusBadge = s => ({
        empty: `<span style="background:#ef444420;color:#ef4444;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700">🚨 ESAURITO</span>`,
        low:   `<span style="background:#f59e0b20;color:#f59e0b;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700">⚠️ SCORTE BASSE</span>`,
        warning:`<span style="background:#fb923c20;color:#fb923c;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700">📉 ATTENZIONE</span>`,
        ok:    `<span style="background:#22c55e20;color:#22c55e;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700">✅ OK</span>`,
      }[s]||'');

      const matRow = m => `<tr style="border-bottom:1px solid var(--border)">
        <td style="padding:10px 12px;font-weight:600;color:var(--text);font-size:13px">${m.name||m.material||'Materiale'}</td>
        <td style="padding:10px 12px;text-align:center">${statusBadge(m.status)}</td>
        <td style="padding:10px 12px;text-align:right;font-size:13px">
          <span style="color:${m.status==='empty'?'#ef4444':m.status==='low'?'#f59e0b':'var(--text)'}">
            ${m.stock} ${m.unit}
          </span>
          ${m.minStock?`<span style="color:var(--text-muted);font-size:11px"> / min ${m.minStock}</span>`:''}
        </td>
        <td style="padding:10px 12px;text-align:right;font-size:12px;color:var(--text-muted)">${m.daysLeft!==null?`~${m.daysLeft} giorni`:'—'}</td>
        <td style="padding:10px 12px;text-align:right;font-size:12px;color:var(--text-muted)">${m.price>0?`€${m.price}/${m.unit}`:'—'}</td>
        <td style="padding:10px 12px;text-align:center">
          ${m.status!=='ok'?`<button onclick="if(typeof StockAlert!==typeof undefined)StockAlert._order(${(m.name||'').replace(/'/g,'')},${m.stock||0},${m.unit})" style="padding:5px 10px;background:#fbbf24;color:#000;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">Ordina</button>
              <button onclick="if(typeof StockAlert!==typeof undefined){StockAlert.createPO(${m.id||m._id})}" style="padding:5px 10px;background:#3b82f620;color:#60a5fa;border:1px solid #3b82f640;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">&#x1F6D2; OA</button>`:''}
        </td>
      </tr>`;

      el.innerHTML = `
        <!-- ALERT SUMMARY -->
        ${empty.length||low.length ? `<div style="background:${empty.length?'#ef444420':'#f59e0b20'};border:${empty.length?'1.5px solid #ef4444':'1.5px solid #f59e0b'};border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;gap:14px;align-items:center">
          <span style="font-size:32px">${empty.length?'🚨':'⚠️'}</span>
          <div>
            <div style="color:${empty.length?'#ef4444':'#f59e0b'};font-weight:800;font-size:15px">${empty.length?`${empty.length} materiale/i ESAURITO/I`:''} ${low.length?`${low.length} materiale/i a scorte basse`:''}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:3px">${[...empty,...low].map(m=>m.name||m.material).join(', ')}</div>
          </div>
        </div>` : ''}

        <!-- KPIs -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px">
          ${[
            ['📦 Totale materiali', materials.length, 'nel database', '#fbbf24'],
            ['🚨 Esauriti', empty.length, 'da riordinare subito', '#ef4444'],
            ['⚠️ Scorte basse', low.length, 'sotto il minimo', '#f59e0b'],
            ['✅ OK', ok.length, 'livelli sicuri', '#22c55e'],
            ['📋 Ordini aperti', openOrders.length, 'in lavorazione', '#38bdf8'],
          ].map(([l,v,s,c])=>`<div style="background:var(--bg-card);border-radius:10px;padding:14px;border:1px solid var(--border);text-align:center">
            <div style="font-size:20px;font-weight:800;color:${c}">${v}</div>
            <div style="font-size:11px;font-weight:700;color:var(--text);margin-top:2px">${l}</div>
            <div style="font-size:10px;color:var(--text-muted)">${s}</div>
          </div>`).join('')}
        </div>

        ${materials.length === 0 ? `<div style="background:var(--bg-card);border-radius:12px;padding:40px;text-align:center;border:1px solid var(--border)">
          <div style="font-size:48px;margin-bottom:12px">📦</div>
          <div style="font-size:15px;color:var(--text);margin-bottom:8px">Nessun materiale nel database</div>
          <div style="font-size:13px;color:var(--text-muted)">Aggiungi i tuoi materiali in <button onclick="App.navigate('materials')" style="background:none;border:none;color:#fbbf24;cursor:pointer;font-weight:700">Materiali & Macchine →</button><br>e configura le scorte minime per ricevere gli alert.</div>
        </div>` : `
        <!-- MATERIALS TABLE -->
        <div style="background:var(--bg-card);border-radius:12px;border:1px solid var(--border);overflow:hidden">
          <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
            <div style="font-weight:700;color:var(--text);font-size:14px">📦 Stato Scorte</div>
            <button onclick="if(typeof StockAlert!==typeof undefined){(typeof StockAlert!=='undefined'&&StockAlert.render())}" style="padding:5px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:11px">↺ Aggiorna</button>
              <button onclick="InventoryReorder.triggerFromUI()" style="padding:5px 14px;background:#f59e0b;color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700"><i class="fas fa-shopping-cart"></i> Riordina automatico</button>
          </div>
          <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:var(--bg-card2)">
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Materiale</th>
              <th style="padding:10px 12px;text-align:center;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Stato</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Scorta</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Giorni rimasti</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Prezzo</th>
              <th style="padding:10px 12px;text-align:center;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Azione</th>
            </tr></thead>
            <tbody>${matItems.map(matRow).join('')}</tbody>
          </table>
          </div>
        </div>

        <div style="margin-top:12px;font-size:12px;color:var(--text-muted);text-align:center">
          💡 Per attivare i "giorni rimasti": aggiungi il consumo mensile stimato in <button onclick="App.navigate('materials')" style="background:none;border:none;color:#fbbf24;cursor:pointer;font-size:12px">Materiali & Macchine</button>
        </div>`}
      `;
    } catch(e) {
      el.innerHTML = `<div style="color:#ef4444;padding:24px">${e.message}</div>`;
    }
  },

  _order(name, stock, unit) {
    toast(`Ricordati di ordinare: ${name} (stock attuale: ${stock} ${unit})`, '📦');
    if(navigator.clipboard) navigator.clipboard.writeText(`Ordine materiale: ${name}\nStock attuale: ${stock} ${unit}\nData: ${new Date().toLocaleDateString('it-IT')}`).then(()=>toast('Info ordine copiata!','success'));
  }
,

  // ── Auto-check on app start: update sidebar badge ──────────────────
  async checkBadge() {
    try {
      const materials = await AppStore.get('materials').catch(()=>[]);
      const lowStock = materials.filter(m=>{
        const stock = +m.quantity||0;
        const minStock = +m.minStock||+m.minQuantity||0;
        return minStock > 0 && stock <= minStock;
      });
      const _res = {lowStock};
      const count = lowStock?.length || 0;
      // Update nav badge
      const navItem = document.querySelector('[data-section="stockalert"]');
      if(navItem && count>0){
        let badge = navItem.querySelector('.sa-badge');
        if(!badge){ badge=document.createElement('span'); badge.className='sa-badge'; badge.style.cssText='margin-left:auto;background:#ef4444;color:#fff;border-radius:99px;padding:1px 7px;font-size:10px;font-weight:800'; navItem.appendChild(badge); }
        badge.textContent = count;
      } else {
        navItem?.querySelector('.sa-badge')?.remove();
      }
      if(count > 0) {
        toast(`⚠️ ${count} materiale/i sotto scorta minima — controlla Stock Alert`, 'warning');
      }
    } catch(e){ console.warn('[StockAlert.checkBadge]', e); }
  },

  // ── Create Purchase Order for a low-stock item ─────────────────────
  async createPO(itemId) {
    const items = await AppStore.get('items').catch(()=>[]);
    const item = items.find(i=>i.id===itemId || i.id===+itemId);
    if(!item){ toast('Articolo non trovato','warning'); return; }

    const suggestedQty = Math.max(10, (item.minStock||5) * 3);
    const suppliers = await IDB.getAll('suppliers').catch(()=>[]);

    const overlay = document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML=`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;max-width:440px;width:100%;padding:24px">
      <div style="font-size:16px;font-weight:800;margin-bottom:16px">🛒 Ordine d'Acquisto — ${item.name}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div class="form-group">
          <label class="form-label">Quantità da ordinare</label>
          <input class="form-control" id="po-qty" type="number" value="${suggestedQty}" min="1">
        </div>
        <div class="form-group">
          <label class="form-label">Fornitore</label>
          <select class="form-control" id="po-supplier">
            <option value="">— Nessuno —</option>
            ${suppliers.map(s=>`<option value="${s.name}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Note</label>
          <input class="form-control" id="po-notes" placeholder="Urgenza, varianti, specifiche...">
        </div>
      </div>
      <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:12px;margin-bottom:14px">
        <strong>📦 ${item.name}</strong><br>
        Stock attuale: <strong style="color:#ef4444">${item.qty||0}</strong> ${item.unit||'pz'} · 
        Min: ${item.minStock||0} · 
        Fornitore: ${item.supplier||'—'}
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button onclick="this.closest('[style*=fixed]').remove()" style="padding:8px 16px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text-muted);border-radius:8px;cursor:pointer">Annulla</button>
        <button onclick="if(typeof StockAlert!==typeof undefined){StockAlert._savePO(${itemId})}" style="padding:8px 20px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:700">🛒 Crea OA</button>
      </div>
    </div>`;
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
    document.body.appendChild(overlay);
  },

  async _savePO(itemId) {
    const qty = +document.getElementById('po-qty')?.value||0;
    const supplier = document.getElementById('po-supplier')?.value||'';
    const notes = document.getElementById('po-notes')?.value||'';
    if(!qty){ toast('Inserisci quantità','warning'); return; }
    const items = await AppStore.get('items').catch(()=>[]);
    const item = items.find(i=>i.id===itemId||i.id===+itemId);
    // Save as order notification
    await IDB.put('notifications',{
      type:'purchase_order',
      title:`OA: ${item?.name||'Articolo'} ×${qty}`,
      body: `Ordine d'acquisto: ${qty} ${item?.unit||'pz'} da ${supplier||'fornitore da definire'}. ${notes}`,
      itemId, qty, supplier, notes,
      status:'pending',
      ts: Date.now(),
      date: today()
    });
    document.querySelector('[style*="position:fixed"]')?.remove();
    toast(`✅ Ordine d'acquisto creato: ${qty}× ${item?.name}. Vai in Notifiche per gestirlo.`);
    (typeof StockAlert!=='undefined'&&StockAlert.render());
  }
};

// ═══════════════════════════════════════════════════════════════════
// B2B PITCH BUILDER — Acquisisci clienti aziendali
// ═══════════════════════════════════════════════════════════════════
const GDrive = {
  CLIENT_ID: null, // Set via localStorage 'ingly_gdrive_client_id'
  SCOPE: 'https://www.googleapis.com/auth/drive.file',
  _token: null,
  _tokenExpiry: 0,

  getClientId(){
    return localStorage.getItem('ingly_gdrive_client_id') || this.CLIENT_ID;
  },

  isConnected(){
    return !!(this._token && Date.now() < this._tokenExpiry);
  },

  async authorize(){
    // Use Google Identity Services (GIS) tokenClient
    const clientId = this.getClientId();
    if(!clientId){
      // Guide user to get client ID
      const id = prompt(`Per usare Google Drive backup:

1. Vai su https://console.cloud.google.com
2. Crea progetto → "API e servizi" → "Credenziali"
3. "+ Crea credenziali" → "ID client OAuth 2.0"
4. Tipo: Applicazione Web
5. Origin autorizzato: ${window.location.origin}
6. Copia l'ID client (es: 123456789-xxx.apps.googleusercontent.com)

Inserisci il tuo Google OAuth Client ID:`);
      if(!id || !id.includes('.apps.googleusercontent.com')){ toast('Client ID non valido', 'error'); return; }
      localStorage.setItem('ingly_gdrive_client_id', id.trim());
    }
    
    try {
      // Load GIS script
      await this._loadGIS();
      await this._requestToken();
      this._updateUI();
      toast('✅ Google Drive collegato!');
      GDrive.scheduleAuto();
    } catch(e) {
      toast('Errore autorizzazione: ' + e.message, 'error');
      console.error('GDrive auth error:', e);
    }
  },

  _loadGIS(){
    return new Promise((resolve, reject) => {
      if(window.google?.accounts?.oauth2){ resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Impossibile caricare Google Identity Services'));
      document.head.appendChild(s);
    });
  },

  _requestToken(){
    return new Promise((resolve, reject) => {
      const clientId = this.getClientId();
      if(!clientId){ reject(new Error('Client ID non configurato')); return; }
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: this.SCOPE,
        callback: (resp) => {
          if(resp.error){ reject(new Error(resp.error)); return; }
          this._token = resp.access_token;
          this._tokenExpiry = Date.now() + (resp.expires_in - 60) * 1000;
          localStorage.setItem('ingly_gdrive_token_expiry', this._tokenExpiry);
          resolve();
        }
      });
      client.requestAccessToken();
    });
  },

  async backupNow(){
    if(!this._token){
      await this.authorize();
      if(!this._token) return;
    }
    try {
      toast('☁️ Backup Google Drive in corso…');
      // Collect all data
      const stores = ['clients','sales','quotes','cashflow','inventory','catalog','orders','settings','marketing_campaigns','backups'];
      const data = {};
      for(const store of stores){
        try{ data[store] = await IDB.getAll(store); }catch(e){ data[store]=[]; }
      }
      const cleanData = typeof _sanitizeForBackup==='function' ? _sanitizeForBackup(data) : data;
      const backup = {
        version: 36,
        timestamp: new Date().toISOString(),
        app: 'Ingly Master',
        data: cleanData
      };
      // Build JSON in parts to avoid string length limits
      const jsonParts = ['{"version":36,"timestamp":"'+new Date().toISOString()+'","app":"Ingly Master","data":{'];
      const keys = Object.keys(cleanData);
      keys.forEach((k,i) => {
        jsonParts.push('"'+k+'":'+JSON.stringify(cleanData[k])+(i<keys.length-1?',':''));
      });
      jsonParts.push('}}');
      const json = jsonParts.join('');
      const blob = new Blob([json], {type: 'application/json'});
      const fileName = `ingly_backup_${new Date().toISOString().substring(0,10)}.json`;

      // Find or create Ingly Backups folder
      const folderId = await this._getOrCreateFolder('Ingly Backups');

      // Upload file
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify({
        name: fileName,
        parents: [folderId],
        mimeType: 'application/json'
      })], {type: 'application/json'}));
      form.append('file', blob);

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + this._token },
        body: form
      });

      if(!res.ok) throw new Error('Upload fallito: ' + res.status);
      const file = await res.json();

      localStorage.setItem('ingly_gdrive_last_backup', new Date().toISOString());
      this._updateUI();
      toast(`✅ Backup salvato su Drive: ${fileName}`);

      // Keep only last 5 backups
      await this._cleanOldBackups(folderId);
    } catch(e) {
      toast('Errore backup Drive: ' + e.message, 'error');
      console.error('GDrive backup error:', e);
    }
  },

  async _getOrCreateFolder(name){
    // Search existing
    const search = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`, {
      headers: { 'Authorization': 'Bearer ' + this._token }
    });
    const r = await search.json();
    if(r.files && r.files.length) return r.files[0].id;
    // Create
    const create = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + this._token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' })
    });
    const f = await create.json();
    return f.id;
  },

  async _cleanOldBackups(folderId){
    try {
      const list = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&orderBy=createdTime desc&fields=files(id,name,createdTime)`, {
        headers: { 'Authorization': 'Bearer ' + this._token }
      });
      const r = await list.json();
      if(r.files && r.files.length > 5){
        for(const file of r.files.slice(5)){
          await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + this._token }
          });
        }
      }
    } catch(e) { /* non critico */ }
  },

  async listBackups(){
    if(!this._token){
      await this.authorize();
      if(!this._token) return;
    }
    const el = eid('gdrive-backups-list');
    if(!el) return;
    el.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">Caricamento...</div>';
    try {
      const folderId = await this._getOrCreateFolder('Ingly Backups');
      const list = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&orderBy=createdTime desc&fields=files(id,name,createdTime,size)`, {
        headers: { 'Authorization': 'Bearer ' + this._token }
      });
      const r = await list.json();
      if(!r.files || !r.files.length){
        el.innerHTML = '<div style="font-size:11px;color:var(--text-muted);padding:8px">Nessun backup trovato</div>';
        return;
      }
      el.innerHTML = `<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:6px">📂 Backup disponibili su Drive:</div>
        ${r.files.map(f=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:var(--bg-card);border-radius:6px;margin-bottom:4px;border:1px solid var(--border)">
          <span style="font-size:11px;color:var(--text)">${f.name.replace('ingly_backup_','').replace('.json','')} · ${Math.round(f.size/1024)}KB</span>
          <button onclick="GDrive.restore('${f.id}','${f.name}')" style="padding:3px 8px;background:#4285f420;color:#4285f4;border:1px solid #4285f440;border-radius:4px;cursor:pointer;font-size:10px;font-weight:700">↩️ Ripristina</button>
        </div>`).join('')}`;
    } catch(e) {
      el.innerHTML = `<div style="font-size:11px;color:var(--red)">Errore: ${e.message}</div>`;
    }
  },

  async restore(fileId, fileName){
    if(!confirm(`Ripristinare il backup "${fileName}"?

ATTENZIONE: I dati attuali verranno SOSTITUITI!`)) return;
    try {
      toast('⬇️ Download backup in corso…');
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': 'Bearer ' + this._token }
      });
      if(!res.ok) throw new Error('Download fallito');
      const backup = await res.json();
      if(!backup.data) throw new Error('File non valido');
      // Restore all stores
      for(const [store, items] of Object.entries(backup.data)){
        if(!Array.isArray(items)) continue;
        try {
          const existing = await IDB.getAll(store);
          for(const ex of existing) await IDB.del(store, ex.id||ex.key);
          for(const item of items) await IDB.put(store, item);
        } catch(e) { console.warn('Restore error for', store, e); }
      }
      toast(`✅ Backup "${fileName}" ripristinato! Ricarica la pagina.`);
      setTimeout(()=>window.location.reload(), 2000);
    } catch(e) {
      toast('Errore ripristino: ' + e.message, 'error');
    }
  },

  setFreq(freq){
    localStorage.setItem('ingly_gdrive_freq', freq);
    this.scheduleAuto();
  },

  scheduleAuto(){
    if(!this._token) return;
    const freq = localStorage.getItem('ingly_gdrive_freq') || 'daily';
    if(freq === 'manual') return;
    const lastBackup = localStorage.getItem('ingly_gdrive_last_backup');
    const now = Date.now();
    const lastTs = lastBackup ? new Date(lastBackup).getTime() : 0;
    const interval = freq === 'daily' ? 24*3600*1000 : 7*24*3600*1000;
    if(now - lastTs > interval){
      setTimeout(()=>GDrive.backupNow(), 5000); // 5s after load
    }
  },

  _updateUI(){
    const statusEl = eid('gdrive-status');
    const authBtn = eid('gdrive-auth-btn');
    const lastBackup = localStorage.getItem('ingly_gdrive_last_backup');
    const isConn = this.isConnected();
    if(statusEl){
      statusEl.innerHTML = isConn
        ? `<div style="font-size:11px;color:#34a853;font-weight:600">✅ Connesso a Google Drive${lastBackup?' · Ultimo backup: '+new Date(lastBackup).toLocaleDateString('it-IT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):''}</div>`
        : `<div style="font-size:11px;color:var(--text-muted)">❌ Non collegato${lastBackup?' · Ultimo sync: '+new Date(lastBackup).toLocaleDateString('it-IT',{day:'2-digit',month:'short'}):''}</div>`;
    }
    if(authBtn) authBtn.style.display = isConn ? 'none' : 'flex';
  },

  init(){
    const expiry = +localStorage.getItem('ingly_gdrive_token_expiry') || 0;
    // Token expired — don't try to auto-reconnect silently (needs user interaction)
    this._updateUI();
    const freq = localStorage.getItem('ingly_gdrive_freq') || 'daily';
    const sel = eid('gdrive-freq');
    if(sel) sel.value = freq;
  }
};

// GDrive OAuth callback on page load

// ═══════════════════════════════════════════════════════════════════
// FAVS — Preferiti fissi + Recenti (no hover JS needed, CSS handles)
// ═══════════════════════════════════════════════════════════════════
const Favs = {
  FK:'ingly_favs3', RK:'ingly_recent3',
  /* La sorgente di verità dei preferiti è `NavPrefs` (IndexedDB, `nav_prefs`).
     `ingly_favs3` resta letta solo come ripiego finché la migrazione in
     `NavPrefs.load()` non è passata su questa installazione. */
  getFavs(){
    if (typeof NavPrefs !== 'undefined' && NavPrefs._loaded) return NavPrefs._prefs.favorites.slice();
    try{return JSON.parse(localStorage.getItem(this.FK)||'[]')}catch(e){return[]}
  },
  getRecent(){ try{return JSON.parse(localStorage.getItem(this.RK)||'[]')}catch(e){return[]} },
  _cat: null,

  _buildCat(){
    if(this._cat) return;
    this._cat = {};
    // Store original FA class on first scan
    document.querySelectorAll('#sidebar-nav .nav-item[data-section] i:not(.nav-pin):not(.nav-badge)').forEach(ic=>{
      if(!ic.dataset.fa) ic.dataset.fa = ic.className;
    });
    document.querySelectorAll('#sidebar-nav .nav-item[data-section]').forEach(el=>{
      if(el.closest('#nav-favs-list')||el.closest('#nav-recent-list')) return;
      const s = el.dataset.section;
      const iEl = el.querySelector('i');
      const imgEl = el.querySelector('img');
      let ico = imgEl
        ? `<img src="${imgEl.src}" style="width:14px;height:14px;border-radius:50%;flex-shrink:0;object-fit:contain">`
        : `<i class="${iEl?iEl.className:'fas fa-circle'}" style="width:16px;text-align:center;font-size:13px;flex-shrink:0"></i>`;
      const tmp = el.cloneNode(true);
      tmp.querySelectorAll('.nav-pin,.nav-badge,img').forEach(x=>x.remove());
      const label = tmp.textContent.trim();
      const col = el.style.color||'';
      this._cat[s] = {ico, label, col};
    });
  },

  /* Un solo interruttore. Prima ce n'erano due, su due memorie diverse:
     l'utente aggiungeva ai preferiti e la voce compariva in un elenco ma non
     nell'altro. `Favs.togglePin` resta perché è richiamata da `onclick` scritti
     nel markup, ma non decide più nulla: inoltra. */
  togglePin(s, ev){
    if(ev){ev.stopPropagation();ev.preventDefault();}
    if (typeof NavPrefs !== 'undefined') {
      return Promise.resolve(NavPrefs.toggleFavorite(s)).then(() => this.render());
    }
    const favs = this.getFavs();
    const i = favs.indexOf(s);
    if(i>=0) favs.splice(i,1); else favs.unshift(s);
    localStorage.setItem(this.FK, JSON.stringify(favs));
    this.render();
  },

  trackVisit(s){
    if(!s||s==='dashboard') return;
    const r = this.getRecent().filter(x=>x!==s);
    r.unshift(s);
    localStorage.setItem(this.RK, JSON.stringify(r.slice(0,8)));
    if(this._cat) this.render();
  },

  clearRecent(){
    localStorage.removeItem(this.RK);
    this.render();
    toast('🕐 Recenti cancellati');
  },

  // Better icon map for sections
  _iconMap: {
    dashboard:'fa-gauge-high',sales:'fa-receipt',pipeline:'fa-diagram-project',
    clients:'fa-users',quoter:'fa-file-invoice',catalog:'fa-store',
    cashflow:'fa-money-bill-wave',inventory:'fa-boxes-stacked',materials:'fa-layer-group',
    marketing:'fa-bullhorn',calendar:'fa-calendar-days',social:'fa-share-nodes',
    finance:'fa-chart-pie',analytics:'fa-chart-line',growthengine:'fa-rocket',
    trendscanner:'fa-magnifying-glass-chart',settings:'fa-gear',backup:'fa-cloud-arrow-up',
    booking:'fa-calendar-check',reports:'fa-file-chart-column',strategy:'fa-chess',
    innovation:'fa-lightbulb',team:'fa-people-group',projects:'fa-folder-open',
    equipment:'fa-screwdriver-wrench',fixed_costs:'fa-coins',etsy:'fa-shop',
    risorse:'fa-layer-group',
    lasercalc:'fa-calculator',imagelib:'fa-images',weeklyreport:'fa-newspaper',
    suppliers:'fa-truck',ideas:'fa-brain',stockalert:'fa-triangle-exclamation',
    profitleak:'fa-arrow-trend-down',competitor:'fa-crosshairs',
    leadscorer:'fa-ranking-star',timetracker:'fa-stopwatch',
  },

  _getIcon(s, d){
    if(typeof IconPacks!=='undefined'){
      const raw = IconPacks.getIcon(s);
      if(raw){
        if(raw.startsWith('__emoji__'))
          return '<i style="width:18px;text-align:center;font-size:13px;flex-shrink:0;font-style:normal;line-height:1;display:inline-flex;align-items:center;justify-content:center">'+raw.slice(9)+'</i>';
        if(raw.startsWith('__abbr__'))
          return '<i style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:14px;font-size:7px;font-weight:900;font-style:normal;color:var(--primary);background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:3px;flex-shrink:0;letter-spacing:-.5px;line-height:1">'+raw.slice(8)+'</i>';
        if(raw.startsWith('__dot__')){
          const parts=raw.slice(7).split('|');
          const col=parts[0]||'var(--primary)'; const cls=parts[1]||'fas fa-circle';
          return '<i class="'+cls+'" style="width:18px;height:18px;border-radius:50%;background:'+col+'22;color:'+col+';display:inline-flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;border:1px solid '+col+'44;font-style:normal"></i>';
        }
        return '<i class="'+raw+'" style="width:16px;text-align:center;font-size:14px;flex-shrink:0"></i>';
      }
    }
    const fa = this._iconMap[s];
    if(fa){
      const faName = fa.startsWith('fa-') ? fa : 'fa-'+fa;
      return '<i class="fas '+faName+'" style="width:16px;text-align:center;font-size:14px;flex-shrink:0"></i>';
    }
    if(d && d.ico) return d.ico;
    return '<i class="fas fa-circle" style="width:16px;text-align:center;font-size:14px;flex-shrink:0"></i>';
  },

  render(){
    this._buildCat();
    const favs   = this.getFavs();
    const recent = this.getRecent().filter(s=>!favs.includes(s)).slice(0,5);
    const cur    = App.currentSection||'dashboard';

    // --- Preferiti list in sidebar (enhanced card style) ---
    const fg = eid('nav-favs-group'), fl = eid('nav-favs-list'), fc = eid('nav-favs-count');
    if(fg) fg.style.display = favs.length ? '' : 'none';
    if(fc) fc.textContent = favs.length ? '('+favs.length+')' : '';
    if(fl) fl.innerHTML = favs.length === 0
      ? '<div style="padding:8px 10px;font-size:11px;color:var(--text-dim)">Nessun preferito — clicca ☆ accanto a un modulo</div>'
      : favs.map(s=>{
          const d = this._cat[s]; if(!d) return '';
          const isActive = cur===s;
          const ico = this._getIcon(s, d);
          const col = d.col||'';
          return `<div class="nav-item${isActive?' active':''}" data-section="${s}" onclick="App.navigate('${s}')"
            style="${col?'color:'+col+';':''}position:relative;padding-right:32px;border-radius:8px;margin-bottom:2px;
            ${isActive?'background:var(--primary-dim);border-left:3px solid var(--primary);padding-left:7px;':''}">
            ${ico}
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;min-width:0;font-size:13px">${d.label}</span>
            <span class="nav-pin pinned" onclick="Favs.togglePin('${s}',event)" title="Rimuovi dai preferiti"
              style="position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:13px;color:#fbbf24;opacity:1">★</span>
          </div>`;
        }).join('');

    // --- Recenti ---
    const rg = eid('nav-recent-group'), rl = eid('nav-recent-list');
    if(rg) rg.style.display = recent.length ? '' : 'none';
    if(rl) rl.innerHTML = recent.map(s=>{
      const d = this._cat[s]; if(!d) return '';
      const a = cur===s?' active':'';
      const col = d.col ? `style="color:${d.col}"` : '';
      const ico = this._getIcon(s, d);
      return `<div class="nav-item${a}" data-section="${s}" onclick="App.navigate('${s}')" ${col}>
        ${ico}<span style="flex:1;overflow:hidden;text-overflow:ellipsis;min-width:0;font-size:12px;color:var(--text-muted)">${d.label}</span>
      </div>`;
    }).join('');

    /* Qui `Favs` iniettava una PROPRIA stella in ogni voce di menu, accanto a
       quella che `NavPrefs` già disegnava: due stelle per voce, su 98 voci, e
       due memorie che non si parlavano — cliccarne una non aggiornava l'altra.

       Le azioni di una voce le disegna `NavPrefs.renderSectionActions`, e le
       disegna una volta sola. Qui resta il compito che è davvero di `Favs`:
       gli elenchi dei preferiti e dei recenti. */
    if (typeof NavPrefs !== 'undefined') NavPrefs._addNavControls();
  },

  init(){
    setTimeout(()=>{ this._buildCat(); this.render(); }, 500);
  }
};

// ══════════════════════════════════════════════════════════════════════
// NavGroups — Collapsible sidebar sections with localStorage persistence
// ══════════════════════════════════════════════════════════════════════
const NavGroups = {
  SK: 'ingly_navgroups_v1',
  // Groups collapsed by default (less-used sections)
  DEFAULT_COLLAPSED: ['ng-market','ng-mkt','ng-ops','ng-brand','ng-report','ng-sistema'],

  _getState() {
    try { return JSON.parse(localStorage.getItem(this.SK) || 'null'); }
    catch(e) { return null; }
  },
  _saveState(state) {
    try { localStorage.setItem(this.SK, JSON.stringify(state)); } catch(e) {}
  },

  init() {
    let state = this._getState();
    // First time: apply defaults
    if (!state) {
      state = {};
      this.DEFAULT_COLLAPSED.forEach(id => { state[id] = true; });
      this._saveState(state);
    }
    // Apply collapse state to all groups
    document.querySelectorAll('.nav-group[id^="ng-"]').forEach(el => {
      if (state[el.id]) el.classList.add('collapsed');
      else el.classList.remove('collapsed');
    });
  },

  toggle(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const isCollapsed = el.classList.toggle('collapsed');
    const state = this._getState() || {};
    state[id] = isCollapsed;
    this._saveState(state);
  },

  // Expand the group containing a given section (called on navigate)
  expandFor(section) {
    const item = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (!item) return;
    const group = item.closest('.nav-group[id^="ng-"]');
    if (!group) return;
    if (group.classList.contains('collapsed')) {
      group.classList.remove('collapsed');
      const state = this._getState() || {};
      state[group.id] = false;
      this._saveState(state);
    }
  },

  collapseAll() {
    const state = {};
    document.querySelectorAll('.nav-group[id^="ng-"]').forEach(el => {
      el.classList.add('collapsed');
      state[el.id] = true;
    });
    this._saveState(state);
  },

  expandAll() {
    const state = {};
    document.querySelectorAll('.nav-group[id^="ng-"]').forEach(el => {
      el.classList.remove('collapsed');
      state[el.id] = false;
    });
    this._saveState(state);
  },
};

// ═══════════════════════════════════════════════════════════════════════
// HEALTH SCORE — Business vitals in real-time nella topbar
// Formula: Revenue(40) + Margin(30) + Clients(20) + Cash(10) = 100
// ═══════════════════════════════════════════════════════════════════════
const BarcodeScanner = {
  _stream: null,
  _scanning: false,
  _history: [],

  render(){
    const el = eid('view-barcode');
    if(!el) return;
    el.innerHTML = `
    <div style="padding:20px;max-width:900px">
      <h2 style="color:#34d399;margin-bottom:4px">📦 Barcode Scanner</h2>
      <p style="color:var(--text-muted);margin-bottom:20px">Usa la fotocamera per scansionare barcode prodotti e aggiornare il magazzino istantaneamente.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>
          <div style="background:var(--bg-card);border-radius:var(--radius);padding:16px;border:1px solid var(--border);margin-bottom:12px">
            <h3 style="font-size:13px;margin-bottom:12px;color:var(--text-muted)">📷 Scanner Camera</h3>
            <div id="bc-cam-wrap" style="position:relative;background:#000;border-radius:8px;overflow:hidden;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;margin-bottom:12px">
              <video id="bc-video" style="width:100%;height:100%;object-fit:cover;display:none" playsinline autoplay muted></video>
              <canvas id="bc-canvas" style="display:none"></canvas>
              <div id="bc-cam-placeholder" style="text-align:center;color:#666">
                <div style="font-size:48px">📷</div>
                <div style="font-size:13px;margin-top:8px">Camera non attiva</div>
              </div>
              <div id="bc-crosshair" style="display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:180px;height:80px;border:2px solid #34d399;border-radius:4px;box-shadow:0 0 0 1000px rgba(0,0,0,.3)"></div>
            </div>
            <div style="display:flex;gap:8px">
              <button onclick="BarcodeScanner.startCamera()" id="bc-start" style="flex:1;padding:10px;background:#34d399;color:#000;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px">▶ Avvia Camera</button>
              <button onclick="BarcodeScanner.stopCamera()" id="bc-stop" style="flex:1;padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;font-size:13px">⏹ Stop</button>
            </div>
          </div>
          <div style="background:var(--bg-card);border-radius:var(--radius);padding:16px;border:1px solid var(--border)">
            <h3 style="font-size:13px;margin-bottom:12px;color:var(--text-muted)">✏️ Inserimento Manuale</h3>
            <div style="display:flex;gap:8px">
              <input id="bc-manual" type="text" placeholder="Inserisci codice manualmente..." style="flex:1;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px" onkeydown="if(event.key==='Enter')BarcodeScanner.processCode(this.value)">
              <button onclick="BarcodeScanner.processCode(eid('bc-manual').value)" style="padding:8px 14px;background:var(--primary);color:#000;border:none;border-radius:6px;font-weight:700;cursor:pointer">OK</button>
            </div>
          </div>
        </div>
        <div>
          <div style="background:var(--bg-card);border-radius:var(--radius);padding:16px;border:1px solid var(--border);margin-bottom:12px">
            <h3 style="font-size:13px;margin-bottom:12px;color:var(--text-muted)">⚡ Azione rapida</h3>
            <div style="display:flex;flex-direction:column;gap:8px" id="bc-actions">
              ${[['scarico','📦 Scarico (vendita)','#ef4444'],['carico','📥 Carico (acquisto)','#22c55e'],['inventario','🔍 Controllo inventario','#3b82f6'],['info','ℹ️ Info prodotto','#a855f7']].map(([v,l,cl])=>`
              <label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:6px;cursor:pointer;border:1px solid transparent;transition:.15s" id="bc-opt-${v}">
                <input type="radio" name="bc-action" value="${v}" ${v==='scarico'?'checked':''} style="accent-color:${cl}" onchange="BarcodeScanner.setAction('${v}')"> 
                <span style="font-size:13px">${l}</span>
              </label>`).join('')}
            </div>
            <div style="margin-top:12px">
              <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Quantità</label>
              <input id="bc-qty" type="number" value="1" min="1" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px">
            </div>
          </div>
          <div style="background:var(--bg-card);border-radius:var(--radius);padding:16px;border:1px solid var(--border)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <h3 style="font-size:13px;color:var(--text-muted)">📋 Sessione</h3>
              <button onclick="BarcodeScanner.clearHistory()" style="font-size:11px;color:var(--text-dim);background:none;border:none;cursor:pointer">cancella ×</button>
            </div>
            <div id="bc-history" style="max-height:280px;overflow-y:auto">
              <div style="text-align:center;padding:30px;color:var(--text-dim);font-size:13px">Nessuna scansione ancora</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
    BarcodeScanner.setAction('scarico');
  },

  setAction(v){
    const colors = {scarico:'#ef4444',carico:'#22c55e',inventario:'#3b82f6',info:'#a855f7'};
    ['scarico','carico','inventario','info'].forEach(a=>{
      const el = eid('bc-opt-'+a);
      if(el) el.style.borderColor = a===v ? colors[a] : 'transparent';
    });
  },

  async startCamera(){
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
      const vid = eid('bc-video');
      if(!vid) return;
      vid.srcObject = this._stream;
      vid.style.display = 'block';
      const ph = eid('bc-cam-placeholder'); if(ph) ph.style.display='none';
      const ch = eid('bc-crosshair'); if(ch) ch.style.display='block';
      this._scanning = true;
      this._scanLoop();
      toast('📷 Camera attiva — punta il barcode');
    } catch(err){
      toast('❌ Camera non disponibile: ' + err.message);
    }
  },

  stopCamera(){
    this._scanning = false;
    if(this._stream){ this._stream.getTracks().forEach(t=>t.stop()); this._stream=null; }
    const vid = eid('bc-video'); if(vid){ vid.srcObject=null; vid.style.display='none'; }
    const ph = eid('bc-cam-placeholder'); if(ph) ph.style.display='';
    const ch = eid('bc-crosshair'); if(ch) ch.style.display='none';
  },

  _scanLoop(){
    if(!this._scanning) return;
    const vid = eid('bc-video');
    const can = eid('bc-canvas');
    if(!vid||!can||vid.readyState<2){ setTimeout(()=>this._scanLoop(),200); return; }
    can.width=vid.videoWidth; can.height=vid.videoHeight;
    can.getContext('2d').drawImage(vid,0,0);
    // Use BarcodeDetector if available
    if('BarcodeDetector' in window){
      const bd = new BarcodeDetector({formats:['ean_13','ean_8','code_128','qr_code','code_39']});
      bd.detect(can).then(codes=>{
        if(codes.length>0){
          const code = codes[0].rawValue;
          this.processCode(code);
          this.stopCamera();
        } else {
          setTimeout(()=>this._scanLoop(),300);
        }
      }).catch(()=>setTimeout(()=>this._scanLoop(),300));
    } else {
      // Fallback: show manual entry toast
      setTimeout(()=>this._scanLoop(),500);
    }
  },

  async processCode(code){
    code = code?.trim();
    if(!code) return;
    const action = document.querySelector('input[name="bc-action"]:checked')?.value || 'info';
    const qty    = parseInt(eid('bc-qty')?.value)||1;
    const ts     = new Date().toLocaleTimeString('it-IT');
    
    // Try to find product in inventory
    let prodName = code;
    try {
      const items = await IDB.getAll('inventory');
      const match = items.find(i=>i.barcode===code||i.sku===code||i.name?.toLowerCase()===code.toLowerCase());
      if(match){
        prodName = match.name;
        if(action==='scarico'&&match.quantity!==undefined){
          match.quantity = Math.max(0,(match.quantity||0)-qty);
          await IDB.put('inventory',match);
          toast(`📦 Scaricato: ${match.name} (×${qty}) → rimane ${match.quantity}`);
        } else if(action==='carico'){
          match.quantity = (match.quantity||0)+qty;
          await IDB.put('inventory',match);
          toast(`📥 Caricato: ${match.name} (×${qty}) → totale ${match.quantity}`);
        }
      } else {
        prodName = 'Prodotto sconosciuto';
        toast(`⚠️ Codice ${code} non trovato in magazzino`);
      }
    } catch(e){}

    // Add to session history
    const actionLabel = {scarico:'📦 Scarico',carico:'📥 Carico',inventario:'🔍 Controllo',info:'ℹ️ Info'}[action];
    this._history.unshift({code,prodName,action:actionLabel,qty,ts});
    this.renderHistory();
    const mi = eid('bc-manual'); if(mi) mi.value='';
  },

  renderHistory(){
    const el = eid('bc-history');
    if(!el) return;
    if(!this._history.length){
      el.innerHTML='<div style="text-align:center;padding:30px;color:var(--text-dim);font-size:13px">Nessuna scansione ancora</div>';
      return;
    }
    el.innerHTML = this._history.map(h=>`
    <div style="padding:8px 10px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center">
      <span style="font-size:18px">${h.action.split(' ')[0]}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.prodName}</div>
        <div style="font-size:11px;color:var(--text-muted)">${h.code} · ×${h.qty} · ${h.ts}</div>
      </div>
    </div>`).join('');
  },

  clearHistory(){
    this._history=[];
    this.renderHistory();
  }
};

// ══════════════════════════════════════════════════════════════════════════
// v75 — QUOTER TEMPLATES  💾
// ══════════════════════════════════════════════════════════════════════════
const BDW = {
  _cache: null, _ts: 0, TTL: 90000,
  _dirty: new Set(),   // stores that changed since last full refresh
  _partial: {},        // last known counts per store for delta detection

  // Call this when a specific store is modified — avoids full BDW refresh
  touch(storeName) {
    this._dirty.add(storeName);
    // If only non-revenue stores changed, refresh only relevant metrics
    const heavyStores = new Set(['sales','cashflow','quotes','orders']);
    if (!heavyStores.has(storeName)) {
      // Lightweight touch: just update ops metrics
      this._ts = 0; // force refresh but flag as incremental
    } else {
      this._ts = 0; this._cache = null; // full refresh needed
    }
    Bus.emit('bdw:dirty', { store: storeName });
  },

  metrics: {
    revenue: { mtd:0, ytd:0, lm:0, growth:0, forecast:[], revsArr:[], slope:0, intercept:0 },
    clients: { total:0, champions:0, loyal:0, atRisk:0, lost:0, newbie:0, promising:0, ltvAvg:0, churnCount:0 },
    products: { top:[], marginAvg:0, lowMargin:[], bestsellers:[] },
    finance:  { netProfit:0, netMarginPct:0, breakEven:0, cashBalance:0, cashRunway:0, taxReserve:0, mCosts:0 },
    ops:      { ordersActive:0, ordersOverdue:0, quotesPending:0, convRate:0 },
    anomalies: [],
  },
  segments: { champions:[], loyal:[], promising:[], newbie:[], atRisk:[], lost:[], needsAttention:[] },
  productPerf: {},
  leadScores: {},
  _raw: null,

  async init(force=false) {
    if (!force && this._cache && Date.now()-this._ts < this.TTL) return this._cache;
    console.log('[BDW] refreshing...');

    const [sales, clients, quotes, orders, cashflow, catalog, fixedCosts, items, gadgets, campaigns] =
      await Promise.all([
        IDB.getAll('sales').catch(()=>[]),
        IDB.getAll('clients').catch(()=>[]),
        IDB.getAll('quotes').catch(()=>[]),
        IDB.getAll('orders').catch(()=>[]),
        IDB.getAll('cashflow').catch(()=>[]),
        IDB.getAll('catalog').catch(()=>[]),
        IDB.getAll('fixed_costs').catch(()=>[]),
        IDB.getAll('items').catch(()=>[]),
        IDB.getAll('gadgets').catch(()=>[]),
        IDB.getAll('marketing_campaigns').catch(()=>[]),
      ]);

    const now = new Date();
    const ym  = m => new Date(now.getFullYear(), now.getMonth()-m, 1).toISOString().slice(0,7);
    const thisMonth = ym(0), lastMonth = ym(1);
    const last12 = Array.from({length:12},(_,i)=>ym(11-i));

    // ── Revenue ───────────────────────────────────────────────────────────────
    const paid = sales.filter(s=>['pagato','paid','completato'].includes(s.status));
    const mRev = paid.filter(s=>s.date?.slice(0,7)===thisMonth).reduce((a,s)=>a+(+s.amount||0),0);
    const lRev = paid.filter(s=>s.date?.slice(0,7)===lastMonth).reduce((a,s)=>a+(+s.amount||0),0);
    const yRev = paid.filter(s=>new Date(s.date)>=new Date(now.getFullYear(),0,1)).reduce((a,s)=>a+(+s.amount||0),0);
    const revsArr = last12.map(m=>paid.filter(s=>s.date?.slice(0,7)===m).reduce((a,s)=>a+(+s.amount||0),0));

    // Weighted linear regression (recent months weighted more)
    const n = revsArr.length;
    const weights = revsArr.map((_,i)=>1+(i/n)); // more weight to recent
    const wSum = weights.reduce((a,v)=>a+v,0);
    const wMeanX = weights.reduce((a,v,i)=>a+v*i,0)/wSum;
    const wMeanY = weights.reduce((a,v,i)=>a+v*revsArr[i],0)/wSum;
    const ssXY = weights.reduce((a,v,i)=>a+v*(i-wMeanX)*(revsArr[i]-wMeanY),0);
    const ssXX = weights.reduce((a,v,i)=>a+v*(i-wMeanX)**2,0);
    const slope = ssXX>0 ? ssXY/ssXX : 0;
    const intercept = wMeanY - slope*wMeanX;
    const forecast = [1,2,3].map(i=>Math.max(0,Math.round(intercept+slope*(n+i))));

    // ── Financial ─────────────────────────────────────────────────────────────
    const mFixed = fixedCosts.reduce((a,c)=>a+(+c.monthly||+c.amount||0),0);
    const mVar   = paid.filter(s=>s.date?.slice(0,7)===thisMonth).reduce((a,s)=>a+(+s.cost||0),0);
    const mCosts = mFixed+mVar;
    const netProfit = mRev-mCosts;
    const netMarginPct = mRev>0?(netProfit/mRev)*100:0;
    const allMargins = paid.filter(s=>+s.amount>0).map(s=>{const a=+s.amount||0,c=+s.cost||0;return a>0?(a-c)/a*100:0;});
    const avgMarginPct = allMargins.length ? allMargins.reduce((a,v)=>a+v,0)/allMargins.length : 0;
    const cfIn  = cashflow.filter(c=>c.type==='entrata').reduce((a,c)=>a+(+c.amount||0),0);
    const cfOut = cashflow.filter(c=>c.type==='uscita').reduce((a,c)=>a+(+c.amount||0),0);
    const cashBalance = cfIn-cfOut;
    const breakEven = avgMarginPct>0 ? mFixed/(avgMarginPct/100) : 0;
    const taxReserve = netProfit>0 ? netProfit*0.15 : 0; // profit-first: 15% fondo tasse (CASHFLOW.md)
    const cashRunway = mCosts>0 ? Math.floor(cashBalance/mCosts) : 0;

    // ── Quotes/Ops ────────────────────────────────────────────────────────────
    const wonQ = quotes.filter(q=>['confermato','pagato'].includes(q.status));
    const convRate = quotes.length>0?(wonQ.length/quotes.length)*100:0;
    const openOrders = orders.filter(o=>!['delivered','consegnato','cancelled'].includes(o.status));
    const overdueOrders = openOrders.filter(o=>o.dueDate&&new Date(o.dueDate)<now);
    const pendingQ = quotes.filter(q=>['bozza','in_attesa'].includes(q.status));

    // ── Client Segments (RFM) ─────────────────────────────────────────────────
    const clientMap = new Map();
    paid.forEach(s=>{
      if(!s.clientId) return;
      const p = clientMap.get(s.clientId)||{rev:0,n:0,last:null,first:null};
      const dt = new Date(s.date);
      clientMap.set(s.clientId,{
        rev: p.rev+(+s.amount||0), n: p.n+1,
        last: !p.last||dt>p.last?dt:p.last,
        first: !p.first||dt<p.first?dt:p.first
      });
    });

    const segs = {champions:[],loyal:[],promising:[],newbie:[],atRisk:[],lost:[],needsAttention:[]};
    const leadScores = {};
    clientMap.forEach((stats,cid)=>{
      const cl = clients.find(c=>String(c.id)===String(cid))||{id:cid,name:'#'+cid};
      const dys = stats.last ? Math.floor((now-stats.last)/86400000) : 999;
      const obj = {...cl,...stats,daysSince:dys,ltv:stats.rev};
      // RFM scoring
      const R = dys<30?5:dys<60?4:dys<90?3:dys<120?2:1;
      const F = stats.n>10?5:stats.n>5?4:stats.n>3?3:stats.n>1?2:1;
      const M = stats.rev>2000?5:stats.rev>800?4:stats.rev>300?3:stats.rev>100?2:1;
      const score = Math.round(R*0.35*20+F*0.35*20+M*0.30*20);
      leadScores[cid] = score;
      // Segment assignment
      if(M>=4&&F>=4&&R>=4) segs.champions.push(obj);
      else if(F>=3&&R>=3) segs.loyal.push(obj);
      else if(M>=3&&R>=2) segs.promising.push(obj);
      else if(F===1&&R>=4) segs.newbie.push(obj);
      else if(R===2||R===3&&F<3) segs.atRisk.push(obj);
      else if(R===1) segs.lost.push(obj);
      else segs.needsAttention.push(obj);
    });

    const ltvAvg = clientMap.size>0 ? [...clientMap.values()].reduce((a,v)=>a+v.rev,0)/clientMap.size : 0;

    // ── Product Performance ───────────────────────────────────────────────────
    const prodPerf = {};
    paid.forEach(s=>{
      const key = s.productName||s.description||'Varie';
      const cat = catalog.find(c=>c.name===key);
      if(!prodPerf[key]) prodPerf[key]={name:key,rev:0,n:0,cost:0,margin:0};
      prodPerf[key].rev+=(+s.amount||0);
      prodPerf[key].n++;
      prodPerf[key].cost+=(+s.cost||+(cat?.costPrice)||0);
    });
    Object.values(prodPerf).forEach(p=>{ p.margin=p.rev>0?(p.rev-p.cost)/p.rev*100:0; });
    const topProds = Object.values(prodPerf).sort((a,b)=>b.rev-a.rev);

    // ── Anomaly Detection (z-score based) ────────────────────────────────────
    const anomalies = [];
    if(revsArr.length>=4){
      const mean = revsArr.reduce((a,v)=>a+v,0)/revsArr.length;
      const std  = Math.sqrt(revsArr.reduce((a,v)=>a+(v-mean)**2,0)/revsArr.length);
      const lastV = revsArr[revsArr.length-1];
      if(std>0){
        const z=(lastV-mean)/std;
        if(z<-1.8) anomalies.push({type:'revenue_drop',sev:'high',msg:`Revenue -${Math.abs(z).toFixed(1)}σ sotto media (€${lastV.toFixed(0)} vs €${mean.toFixed(0)})`,action:'Verifica canali vendita e pipeline preventivi'});
        if(z>1.8)  anomalies.push({type:'revenue_spike',sev:'opportunity',msg:`Picco revenue +${z.toFixed(1)}σ sopra media (€${lastV.toFixed(0)})`,action:'Analizza fonte — replica questo risultato'});
      }
    }
    if(overdueOrders.length>2) anomalies.push({type:'ops_delay',sev:'medium',msg:`${overdueOrders.length} ordini scaduti in Kanban`,action:'Contatta clienti e aggiorna stato consegne'});
    if(segs.atRisk.length>3) anomalies.push({type:'churn_risk',sev:'medium',msg:`${segs.atRisk.length} clienti at-risk (60-120gg inattivi)`,action:'Invia campagna re-engagement con offerta personalizzata'});

    // ── Store results ─────────────────────────────────────────────────────────
    // ── Real Cost Engine: timelogs → orders → real margins ─────────────
    // (moved BEFORE metrics assembly to avoid TDZ error on realMarginAvg)
    const timelogs = await IDB.getAll('timelogs').catch(()=>[]);
    const costEntries = await IDB.getAll('cost_entries').catch(()=>[]);
    const settings = await IDB.get('settings','main').catch(()=>null)||{};
    const laborCostPerMin = parseFloat(settings.laborCost)||0.25; // €/min
    const machineCostPerMin = parseFloat(settings.machineCost)||0.08; // €/min

    // Build real cost per order from timelogs + cost_entries
    const realCostByOrder = {};
    timelogs.forEach(t=>{
      if(!t.orderId && !t.quoteId) return;
      const key = t.orderId || ('q'+t.quoteId);
      const mins = (+t.minutes||0) + (+t.duration||0)/60;
      const laborCost = mins * laborCostPerMin;
      const machineCost = mins * machineCostPerMin * (+t.machineCount||1);
      realCostByOrder[key] = (realCostByOrder[key]||0) + laborCost + machineCost;
    });
    costEntries.forEach(e=>{
      if(!e.orderId) return;
      realCostByOrder[e.orderId] = (realCostByOrder[e.orderId]||0) + (+e.amount||0);
    });

    // Enrich sales with real costs where available
    const enrichedSales = paid.map(s=>{
      const orderKey = s.orderId || ('q'+s.quoteId);
      const realCost = realCostByOrder[orderKey];
      return realCost ? {...s, realCost, realMargin: s.amount>0?(s.amount-realCost)/s.amount*100:0} : s;
    });
    const salesWithRealCost = enrichedSales.filter(s=>s.realCost!=null);
    const realMarginAvg = salesWithRealCost.length
      ? salesWithRealCost.reduce((a,s)=>a+s.realMargin,0)/salesWithRealCost.length
      : null;
    const totalLaborCost = timelogs.reduce((a,t)=>a+(+t.minutes||0)*laborCostPerMin,0);

    // ── Store results (after real cost engine so realMarginAvg is defined) ──
    this.metrics = {
      revenue:  {mtd:mRev,ytd:yRev,lm:lRev,growth:lRev>0?(mRev-lRev)/lRev*100:0,forecast,revsArr,slope,intercept},
      clients:  {total:clients.length,champions:segs.champions.length,loyal:segs.loyal.length,atRisk:segs.atRisk.length,lost:segs.lost.length,newbie:segs.newbie.length,promising:segs.promising.length,ltvAvg,churnCount:segs.atRisk.length+segs.lost.length},
      products: {top:topProds.slice(0,5),marginAvg:avgMarginPct,lowMargin:topProds.filter(p=>p.margin<25&&p.rev>0)},
      finance:  {netProfit,netMarginPct,breakEven,cashBalance,cashRunway,taxReserve,mCosts,realMarginAvg:realMarginAvg||avgMarginPct,totalLaborCost},
      ops:      {ordersActive:openOrders.length,ordersOverdue:overdueOrders.length,quotesPending:pendingQ.length,convRate},
      anomalies,
    };
    this.segments = segs;
    this.productPerf = prodPerf;
    this.leadScores = leadScores;
    this._raw = {sales:paid,allSales:sales,clients,quotes,orders,cashflow,catalog,items,gadgets,campaigns,openOrders,overdueOrders,pendingQ,now,thisMonth,lastMonth,revsArr,forecast,timelogs,costEntries,enrichedSales,realCostByOrder,realMarginAvg,totalLaborCost};
    this._cache = this.metrics;
    this._ts = Date.now();

    Bus.emit('bdw:updated', this.metrics);
    console.log('[BDW] ✅ updated — revenue MTD:', mRev.toFixed(0));
    return this._cache;
  },

  // Refresh on data changes
  invalidate() { this._ts = 0; this._cache = null; },
};

// Auto-init BDW on page load
setTimeout(async()=>{
  try{ await BDW.init(); }catch(e){ console.warn('[BDW init]',e); }
},1500);
// BDW refresh handled by incremental touch() — see Bus.on below

// ══════════════════════════════════════════════════════════════════════════════
// DAO — Standardized Data Access Object Layer v65
// Formal API over BDW. All modules should prefer these over direct IDB calls.
// ══════════════════════════════════════════════════════════════════════════════
const DAO = {

  // ── Sales ────────────────────────────────────────────────────────────────
  async getSales(opts={}) {
    await BDW.init();
    let s = BDW._raw?.allSales || [];
    if (opts.status)    s = s.filter(x => x.status === opts.status);
    if (opts.month)     s = s.filter(x => (x.date||'').startsWith(opts.month));
    if (opts.clientId)  s = s.filter(x => x.clientId == opts.clientId);
    if (opts.limit)     s = s.slice(0, opts.limit);
    return s;
  },

  getPaidSales() { return BDW._raw?.sales || []; },

  getMTDRevenue() { return BDW.metrics.revenue.mtd; },

  getYTDRevenue() { return BDW.metrics.revenue.ytd; },

  getForecast()   { return BDW.metrics.revenue.forecast || []; },

  // ── Products / Catalog ───────────────────────────────────────────────────
  async getProductsWithMargins() {
    await BDW.init();
    const catalog = BDW._raw?.catalog || [];
    const salesByProd = {};
    (BDW._raw?.sales || []).forEach(s => {
      const name = s.itemName || s.product || s.description || '';
      if (!name) return;
      salesByProd[name] = (salesByProd[name] || 0) + (+s.amount || 0);
    });
    return catalog.map(p => {
      const price = +p.price || 0;
      const cost  = +p.cost  || +p.costPrice || 0;
      const margin = price > 0 ? Math.round((price - cost) / price * 100) : null;
      return { ...p, margin, revenue: salesByProd[p.name] || 0 };
    }).sort((a,b) => b.revenue - a.revenue);
  },

  getTopProducts(n=10)   { return (BDW.metrics.products.top || []).slice(0, n); },
  getLowMarginProducts() { return BDW.metrics.products.lowMargin || []; },
  getBestsellers(n=5)    { return (BDW.metrics.products.top || []).slice(0, n); },

  // ── Clients ──────────────────────────────────────────────────────────────
  async getClientLTV(clientId) {
    await BDW.init();
    const sales = (BDW._raw?.allSales || [])
      .filter(s => s.clientId == clientId && ['pagato','paid','completato'].includes(s.status));
    return sales.reduce((a, s) => a + (+s.amount || 0), 0);
  },

  async getClientsWithLTV() {
    await BDW.init();
    const clients = BDW._raw?.clients || [];
    const ltvMap = {};
    (BDW._raw?.sales || []).forEach(s => {
      if (!s.clientId) return;
      ltvMap[s.clientId] = (ltvMap[s.clientId] || 0) + (+s.amount || 0);
    });
    return clients.map(c => ({ ...c, ltv: ltvMap[c.id] || 0 }))
                  .sort((a,b) => b.ltv - a.ltv);
  },

  getSegments()       { return BDW.segments; },
  getChampions()      { return BDW.segments.champions || []; },
  getAtRiskClients()  { return BDW.segments.atRisk || []; },
  getLostClients()    { return BDW.segments.lost || []; },
  getLeadScores()     { return BDW.leadScores || {}; },

  // ── Finance ──────────────────────────────────────────────────────────────
  getFinance()        { return BDW.metrics.finance; },
  getNetProfit()      { return BDW.metrics.finance.netProfit; },
  getBreakEven()      { return BDW.metrics.finance.breakEven; },
  getCashRunway()     { return BDW.metrics.finance.cashRunway; },
  getTaxReserve()     { return BDW.metrics.finance.taxReserve; },

  // ── Operations ───────────────────────────────────────────────────────────
  getOps()            { return BDW.metrics.ops; },
  getOpenOrders()     { return BDW._raw?.openOrders || []; },
  getOverdueOrders()  { return BDW._raw?.overdueOrders || []; },
  getPendingQuotes()  { return BDW._raw?.pendingQ || []; },
  getConvRate()       { return BDW.metrics.ops.convRate; },

  // ── Anomalies ────────────────────────────────────────────────────────────
  getAnomalies()      { return BDW.metrics.anomalies || []; },

  // ── KPI Coherence check ──────────────────────────────────────────────────
  async coherenceCheck() {
    await BDW.init();
    const bdwRev = BDW.metrics.revenue.mtd;
    // Compare vs KPIEngine run
    const kpi = await KPIEngine.run();
    const delta = Math.abs(bdwRev - kpi.revenue);
    const pct   = bdwRev > 0 ? (delta / bdwRev * 100).toFixed(1) : 0;
    const ok    = delta < 1 || +pct < 0.5;
    const result = {
      bdwRevenue: bdwRev, kpiRevenue: kpi.revenue,
      delta, deltaPercent: +pct, ok,
      timestamp: new Date().toISOString(),
      message: ok
        ? `✅ KPI coherent — BDW €${bdwRev.toFixed(0)} vs KPIEngine €${kpi.revenue.toFixed(0)}`
        : `⚠️ KPI mismatch ${pct}% — BDW €${bdwRev.toFixed(0)} vs KPIEngine €${kpi.revenue.toFixed(0)} (Δ€${delta.toFixed(0)})`,
    };
    console.log('[DAO.coherenceCheck]', result.message);
    await IDB.put('notifications', {
      id: 'kpi_coherence_' + Date.now(),
      type: ok ? 'info' : 'warning',
      title: 'KPI Coherence Check',
      body: result.message,
      ts: Date.now()
    });
    return result;
  },

  // ── Invalidate BDW on writes ─────────────────────────────────────────────
  invalidate() { BDW.invalidate(); Bus.emit('data:updated'); },
};

// Run coherence check every 5min in background (silent)
setInterval(async () => {
  try { await DAO.coherenceCheck(); } catch(e) { /* silent */ }
}, 5 * 60 * 1000);


// ── CLIENT INTELLIGENCE ───────────────────────────────────────────────────────
const GrowthEngine = {
  async render() {
    await BDW.init();
    const el = eid('ge-root'); if(!el) return;
    const m = BDW.metrics;
    el.innerHTML = this._buildHTML(m);
  },

  _buildHTML(m) {
    const rev = m.revenue; const fin = m.finance; const cl = m.clients;
    const maxRev = Math.max(...rev.revsArr,...rev.forecast,1);

    return `
      <div class="module-header">
        <div class="module-header-left">
          <div class="module-title"><i class="fas fa-rocket" style="color:#22c55e"></i> Growth Engine</div>
          <div class="module-subtitle">Anomaly Detection · Forecast · Opportunità · AI Growth Plan</div>
        </div>
        <div class="module-actions"><button onclick="GrowthEngine.runAI()" class="btn" style="background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;padding:8px 16px"><i class="fas fa-brain"></i> AI Growth Plan</button></div>
      </div>

      <!-- KPI strip -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
        ${[
          {val:(rev.growth>=0?'+':'')+rev.growth.toFixed(1)+'%', lbl:'MoM Growth', sub:rev.growth>=0?'📈 Positivo':'📉 Attenzione', col:rev.growth>=0?'#22c55e':'#ef4444'},
          {val:fmtCur(rev.forecast[0]||0),       lbl:'Forecast +1 mese', sub:`→ ${fmtCur(rev.forecast[1]||0)} · ${fmtCur(rev.forecast[2]||0)}`, col:'#38bdf8'},
          {val:fmtCur(fin.netProfit),             lbl:'Profitto netto MTD', sub:`Margine ${fin.netMarginPct.toFixed(1)}%`, col:fin.netProfit>=0?'#22c55e':'#ef4444'},
          {val:cl.atRisk+cl.lost,                 lbl:'Clienti a rischio', sub:`${cl.atRisk} at-risk · ${cl.lost} persi`, col:cl.atRisk+cl.lost>3?'#ef4444':'#22c55e'},
        ].map(k=>`<div class="card" style="text-align:center;border-top:3px solid ${k.col}">
          <div style="font-size:20px;font-weight:900;color:${k.col}">${k.val}</div>
          <div style="font-size:10px;font-weight:700;margin-top:4px">${k.lbl}</div>
          <div style="font-size:9px;color:var(--text-dim);margin-top:3px">${k.sub}</div>
        </div>`).join('')}
      </div>

      <!-- Revenue chart -->
      <div class="card" style="margin-bottom:14px">
        <div class="card-title">📊 Revenue 12 mesi + Forecast (━ storico · ╌ previsione)</div>
        <div style="display:flex;align-items:flex-end;gap:2px;height:90px;padding:4px 0;overflow:hidden">
          ${rev.revsArr.map((v,i)=>{
            const h=Math.max(3,Math.round((v/maxRev)*86));
            const isLast=i===rev.revsArr.length-1;
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center">
              <div title="€${v.toFixed(0)}" style="width:100%;height:${h}px;background:${isLast?'#38bdf8':'#38bdf825'};border-radius:2px 2px 0 0;border-top:2px solid ${isLast?'#38bdf8':'#38bdf840'};transition:height .5s"></div>
            </div>`;
          }).join('')}
          ${rev.forecast.map((v,i)=>{
            const h=Math.max(3,Math.round((v/maxRev)*86));
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center">
              <div title="Forecast: €${v.toFixed(0)}" style="width:100%;height:${h}px;background:#a855f718;border:1px dashed #a855f760;border-radius:2px 2px 0 0"></div>
            </div>`;
          }).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-dim);margin-top:6px">
          <span>${new Date(new Date().setMonth(new Date().getMonth()-11)).toLocaleDateString('it-IT',{month:'short',year:'2-digit'})}</span>
          <span>Oggi</span>
          <span style="color:#a855f7">+3m forecast</span>
        </div>
      </div>

      <!-- Anomalies -->
      ${m.anomalies.length ? `
        <div class="card" style="margin-bottom:14px;border:1px solid ${m.anomalies[0]?.sev==='high'?'#ef4444':'#f59e0b'}50">
          <div class="card-title" style="color:${m.anomalies[0]?.sev==='high'?'#ef4444':'#f59e0b'}">⚡ Anomalie Rilevate</div>
          ${m.anomalies.map(a=>`<div style="padding:9px 12px;background:var(--bg-card2);border-radius:8px;margin-bottom:7px">
            <div style="font-weight:700;font-size:12px">${a.msg}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px">→ ${a.action}</div>
          </div>`).join('')}
        </div>` :
        `<div class="card" style="margin-bottom:14px;border:1px solid #22c55e40;text-align:center;padding:14px;color:#22c55e;font-size:12px">✅ Nessuna anomalia — revenue nella norma statistica</div>`}

      <!-- Opportunities -->
      <div class="card" style="margin-bottom:14px">
        <div class="card-title">🎯 Opportunità di Crescita</div>
        ${this._buildOpps(m)}
      </div>

      <div id="ge-ai-result"></div>
    `;
  },

  _buildOpps(m) {
    const opps=[];
    if(m.clients.atRisk>0) opps.push({ic:'🔄',t:`Re-engage ${m.clients.atRisk} clienti at-risk`,imp:'Alto',a:'Invia offerta +15% sconto loyalty — usa la sezione CRM per filtrare',col:'#ef4444'});
    if(m.revenue.growth<0) opps.push({ic:'📈',t:'Revenue in calo — azione urgente',imp:'Critico',a:'Aumenta visibilità social + velocizza invio preventivi',col:'#f59e0b'});
    if(m.finance.breakEven>0&&m.revenue.mtd<m.finance.breakEven) opps.push({ic:'💰',t:'Sotto breakeven questo mese',imp:'Urgente',a:`Necessari ${fmtCur(m.finance.breakEven-m.revenue.mtd)} per coprire costi fissi`,col:'#f59e0b'});
    if(m.clients.champions>0) opps.push({ic:'🏆',t:`Upsell ai ${m.clients.champions} champions`,imp:'Medio',a:'Offri prodotti premium o kit esclusivi via WhatsApp',col:'#22c55e'});
    if(m.revenue.slope>0) opps.push({ic:'🚀',t:`Trend positivo +${fmtCur(m.revenue.slope)}/mese`,imp:'Positivo',a:`Scala capacità produttiva — forecast: ${fmtCur(m.revenue.forecast[0]||0)}`,col:'#22c55e'});
    if(m.products.lowMargin.length>0) opps.push({ic:'✂️',t:`${m.products.lowMargin.length} prodotti con margine <25%`,imp:'Medio',a:`Rivedi prezzi di: ${m.products.lowMargin.slice(0,2).map(p=>p.name).join(', ')}`,col:'#fb923c'});
    if(!opps.length) opps.push({ic:'✅',t:'Business in salute',imp:'Info',a:'Continua a monitorare e mantenere il ritmo',col:'#22c55e'});
    return opps.map(o=>`<div style="display:flex;align-items:center;gap:12px;padding:10px;background:${o.col}06;border-radius:8px;border:1px solid ${o.col}20;margin-bottom:8px">
      <div style="font-size:22px;width:30px;text-align:center">${o.ic}</div>
      <div style="flex:1"><div style="font-weight:700;font-size:12px">${o.t}</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px">${o.a}</div></div>
      <span style="font-size:10px;padding:3px 8px;background:${o.col}20;color:${o.col};border-radius:99px;font-weight:700;white-space:nowrap;flex-shrink:0">${o.imp}</span>
    </div>`).join('');
  },

  async runAI() {
    const el=eid('ge-ai-result'); if(!el) return;
    await BDW.init(); const m=BDW.metrics;
    el.innerHTML=`<div class="card"><div style="text-align:center;padding:20px;color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> AI elabora il tuo Growth Plan...</div></div>`;
    const prompt=`Business artigianale laser italiano. Dati reali:
Revenue MTD: €${m.revenue.mtd.toFixed(0)} (${(m.revenue.growth>=0?'+':'')+m.revenue.growth.toFixed(1)}% vs mese scorso)
Revenue YTD: €${m.revenue.ytd.toFixed(0)} | Forecast next 3m: €${m.revenue.forecast.join(', ')}
Margine netto: ${m.finance.netMarginPct.toFixed(1)}% | Breakeven: €${m.finance.breakEven.toFixed(0)} | Cash runway: ${m.finance.cashRunway} mesi
Clienti: ${m.clients.total} totali · ${m.clients.champions} champions · ${m.clients.atRisk} at-risk · ${m.clients.lost} persi
LTV medio: €${m.clients.ltvAvg.toFixed(0)} | Ordini attivi: ${m.ops.ordersActive} | Scaduti: ${m.ops.ordersOverdue}
Anomalie: ${m.anomalies.map(a=>a.msg).join('; ')||'nessuna'}

Crea un Growth Plan a 4 settimane con:
🔴 SETTIMANA 1: Azione immediata (con numeri specifici)
🟡 SETTIMANE 2-3: Iniziativa di crescita
🟢 MESE: Obiettivo strategico misurabile
Pratico, numeri concreti, in italiano. Max 180 parole.`;
    try{
      const r=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:450,messages:[{role:'user',content:prompt}]})
      });
      const data=await r.json();
      const text=data.content?.find(b=>b.type==='text')?.text||'—';
      el.innerHTML=`<div class="card" style="border:1px solid #22c55e40;background:#22c55e06">
        <div style="font-size:11px;color:#22c55e;font-weight:700;margin-bottom:10px">🚀 AI Growth Plan — ${new Date().toLocaleDateString('it-IT')}</div>
        <div style="font-size:12px;line-height:1.7;white-space:pre-line">${text}</div>
      </div>`;
    }catch(e){el.innerHTML=`<div class="card" style="color:#ef4444;font-size:11px;padding:12px">AI non disponibile</div>`;}
  },
};

// ── FINANCIAL FORECASTER ──────────────────────────────────────────────────────
const ProductionOptimizer = {
  async render() {
    await BDW.init();
    const el=eid('po-panel'); if(!el) return;
    const raw=BDW._raw; if(!raw) return;
    const {openOrders,overdueOrders,items}=raw;
    const sorted=openOrders.sort((a,b)=>{
      const pm={urgent:0,high:1,normal:2,low:3};
      return (pm[a.priority]||2)-(pm[b.priority]||2);
    });
    const lowItems=(items||[]).filter(i=>(i.quantity||0)<=(i.minStock||1));

    el.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <div class="card-title" style="margin-bottom:2px">🏭 Production Optimizer</div>
          <div style="font-size:10px;color:var(--text-muted)">${sorted.length} ordini in coda · ${overdueOrders.length} scaduti · ${lowItems.length} materiali sotto scorta</div>
        </div>
        <button onclick="ProductionOptimizer.runAI()" class="btn btn-sm" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;border:none"><i class="fas fa-brain"></i> Piano AI</button>
      </div>
      ${sorted.length===0?`<div style="text-align:center;padding:16px;color:var(--text-dim)">✅ Nessun ordine in coda</div>`:
        sorted.slice(0,6).map((o,i)=>{
          const pc={urgent:'#ef4444',high:'#f59e0b',normal:'#38bdf8',low:'#64748b'};
          const col=pc[o.priority]||'#38bdf8';
          const ov=o.dueDate&&new Date(o.dueDate)<new Date();
          return `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg-card2);border-radius:7px;margin-bottom:5px;border-left:3px solid ${col}">
            <div style="font-size:12px;font-weight:900;color:var(--text-dim);width:16px">${i+1}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.name||'Ordine #'+o.id}</div>
              <div style="font-size:9px;color:var(--text-muted)">${o.client||'—'}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:10px;font-weight:700;color:${col}">${o.priority||'normal'}</div>
              ${ov?`<div style="font-size:8px;color:#ef4444;font-weight:700">⚠️ SCADUTO</div>`:o.dueDate?`<div style="font-size:8px;color:var(--text-dim)">${new Date(o.dueDate).toLocaleDateString('it-IT')}</div>`:''}
            </div>
          </div>`;
        }).join('')}
      ${lowItems.length?`<div style="margin-top:8px;padding:8px;background:#ef444410;border-radius:7px;border:1px solid #ef444430">
        <div style="font-size:10px;color:#ef4444;font-weight:700">⚠️ Materiali sotto scorta: ${lowItems.slice(0,4).map(i=>i.name).join(', ')}${lowItems.length>4?'...':''}</div>
      </div>`:''}
      <div id="po-ai-result" style="margin-top:8px"></div>
    `;
  },

  async runAI() {
    const el=eid('po-ai-result'); if(!el) return;
    el.innerHTML=`<div style="text-align:center;padding:10px;color:var(--text-muted);font-size:11px"><i class="fas fa-spinner fa-spin"></i></div>`;
    const raw=BDW._raw||{};
    const orders=(raw.openOrders||[]).slice(0,5).map(o=>`${o.name}(${o.priority||'normal'})`).join(', ')||'nessuno';
    const low=(raw.items||[]).filter(i=>(i.quantity||0)<=(i.minStock||1)).slice(0,4).map(i=>i.name).join(', ')||'nessuno';
    const prompt=`Piano produzione per oggi, laser workshop italiano.
Ordini urgenti: ${orders}
Materiali sotto scorta: ${low}
Suggerisci piano produzione per oggi (max 5 passi, pratico, italiano, includi quando riordinare materiali).`;
    try{
      const r=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:250,messages:[{role:'user',content:prompt}]})
      });
      const data=await r.json();
      const text=data.content?.find(b=>b.type==='text')?.text||'—';
      el.innerHTML=`<div style="background:#f59e0b0a;border:1px solid #f59e0b25;border-radius:7px;padding:10px;font-size:11px;line-height:1.6;white-space:pre-line">${text}</div>`;
    }catch(e){el.innerHTML='';}
  },
};

// ── LISTINO TABS — B2B Pricelist Suite ───────────────────────────────────────
const WeeklyReport = {
  async render() {
    const el = document.getElementById('view-weeklyreport');
    if (!el) return;
    el.innerHTML = `<div style="padding:20px;max-width:1000px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <h2 style="color:#60a5fa;margin:0;font-size:22px">📰 Weekly Report</h2>
        <span style="font-size:11px;background:#60a5fa18;color:#60a5fa;padding:3px 10px;border-radius:99px;border:1px solid #60a5fa30;font-weight:700">REPORT AUTOMATICO</span>
      </div>
      <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px">Sintesi settimanale automatica — revenue, clienti top, anomalie, previsione della prossima settimana</p>
      <div id="wr-content"><div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto 12px"></div><div style="color:var(--text-muted)">Generazione report...</div></div></div>
    </div>`;
    await this._load();
  },

  _weekBounds(offset=0) {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
    monday.setHours(0,0,0,0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);
    return { start: monday, end: sunday };
  },

  async _load() {
    const el = document.getElementById('wr-content');
    if (!el) return;
    try {
      const sales = await AppStore.get('sales');
      const clients = await AppStore.get('clients');
      const orders = await AppStore.get('orders').catch(()=>[]);
      const quotes = await AppStore.get('quotes').catch(()=>[]);
      const cashflow = await AppStore.get('cashflow').catch(()=>[]);

      const fmt = v => `€${Math.round(v).toLocaleString('it-IT')}`;
      const fmtD = d => new Date(d).toLocaleDateString('it-IT',{day:'2-digit',month:'short'});

      // Current week and previous week
      const thisWeek = this._weekBounds(0);
      const prevWeek = this._weekBounds(-1);
      const prev2Week = this._weekBounds(-2);

      const salesInRange = (start, end) => sales.filter(s => {
        const d = new Date(s.date||0);
        return d >= start && d <= end;
      });

      const thisSales = salesInRange(thisWeek.start, thisWeek.end);
      const prevSales = salesInRange(prevWeek.start, prevWeek.end);
      const prev2Sales = salesInRange(prev2Week.start, prev2Week.end);

      const thisRev = thisSales.reduce((a,s)=>a+(+s.amount||0), 0);
      const prevRev = prevSales.reduce((a,s)=>a+(+s.amount||0), 0);
      const prev2Rev = prev2Sales.reduce((a,s)=>a+(+s.amount||0), 0);

      const revDelta = prevRev > 0 ? (thisRev - prevRev) / prevRev * 100 : 0;
      const prevDelta = prev2Rev > 0 ? (prevRev - prev2Rev) / prev2Rev * 100 : 0;

      // Top clients this week
      const clientMap = {};
      thisSales.forEach(s => {
        const k = s.clientName || s.client || '—';
        clientMap[k] = (clientMap[k]||0) + (+s.amount||0);
      });
      const topClients = Object.entries(clientMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

      // Top products this week
      const prodMap = {};
      thisSales.forEach(s => {
        const k = s.productName || s.product || s.item || '—';
        prodMap[k] = { rev: (prodMap[k]?.rev||0) + (+s.amount||0), count: (prodMap[k]?.count||0)+1 };
      });
      const topProds = Object.entries(prodMap).sort((a,b)=>b[1].rev-a[1].rev).slice(0,5);

      // Orders status this week
      const thisOrders = orders.filter(o => {
        const d = new Date(o.createdAt||o.date||0);
        return d >= thisWeek.start && d <= thisWeek.end;
      });
      const overdueOrders = orders.filter(o => {
        if (o.status === 'completato' || o.status === 'consegnato') return false;
        return o.dueDate && new Date(o.dueDate) < new Date();
      });

      // Quotes pending
      const pendingQuotes = quotes.filter(q => !q.status || q.status === 'inviato' || q.status === 'pending');
      const pendingValue = pendingQuotes.reduce((a,q)=>a+(+q.total||+q.amount||0), 0);

      // MTD revenue
      const now = new Date();
      const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const mtdRev = sales.filter(s=>new Date(s.date||0)>=mtdStart).reduce((a,s)=>a+(+s.amount||0),0);

      // New clients this week
      const newClients = clients.filter(c => {
        const d = new Date(c.createdAt||c.date||0);
        return d >= thisWeek.start && d <= thisWeek.end;
      });

      // Anomaly: biggest single sale this week
      const maxSale = thisSales.reduce((a,s)=>Math.max(a,+s.amount||0),0);
      const avgSale = prevSales.length > 0 ? prevSales.reduce((a,s)=>a+(+s.amount||0),0)/prevSales.length : 0;

      // Week selector
      const weekLabel = w => `${fmtD(w.start)} — ${fmtD(w.end)}`;
      const deltaClass = d => d > 5 ? 'up' : d < -5 ? 'down' : 'flat';
      const deltaIcon = d => d > 5 ? '↑' : d < -5 ? '↓' : '→';

      el.innerHTML = `
        <!-- Week nav -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 18px">
          <div style="font-size:14px;font-weight:700;color:var(--text)">📅 Settimana corrente: ${weekLabel(thisWeek)}</div>
          <div style="flex:1"></div>
          <button onclick="if(typeof WeeklyReport!==typeof undefined){WeeklyReport._exportHTML()}" style="padding:8px 14px;background:var(--primary);color:#000;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">📤 Esporta HTML</button>
        </div>

        <!-- Revenue section -->
        <div class="wr-section">
          <div class="wr-section-title">💰 Revenue</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px">
            <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:14px">
              <div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">Questa settimana</div>
              <div style="font-size:24px;font-weight:800;color:${thisRev>0?'#22c55e':'var(--text-muted)'}">${fmt(thisRev)}</div>
              <div style="margin-top:6px"><span class="wr-delta ${deltaClass(revDelta)}">${deltaIcon(revDelta)} ${Math.abs(revDelta).toFixed(0)}%</span> <span style="font-size:11px;color:var(--text-muted)">vs sett. scorsa</span></div>
            </div>
            <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:14px">
              <div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">Settimana scorsa</div>
              <div style="font-size:24px;font-weight:800;color:var(--text)">${fmt(prevRev)}</div>
              <div style="margin-top:6px"><span class="wr-delta ${deltaClass(prevDelta)}">${deltaIcon(prevDelta)} ${Math.abs(prevDelta).toFixed(0)}%</span> <span style="font-size:11px;color:var(--text-muted)">vs 2 sett. fa</span></div>
            </div>
            <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:14px">
              <div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">MTD (mese)</div>
              <div style="font-size:24px;font-weight:800;color:var(--blue)">${fmt(mtdRev)}</div>
              <div style="margin-top:6px;font-size:11px;color:var(--text-muted)">${thisSales.length} vendite questa sett.</div>
            </div>
            <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:14px">
              <div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">Nuovi clienti</div>
              <div style="font-size:24px;font-weight:800;color:#a855f7">${newClients.length}</div>
              <div style="margin-top:6px;font-size:11px;color:var(--text-muted)">${overdueOrders.length > 0 ? `⚠️ ${overdueOrders.length} ordini scaduti` : '✅ Nessun ritardo'}</div>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px">
          <!-- Top clients -->
          <div class="wr-section">
            <div class="wr-section-title">👑 Top Clienti</div>
            ${topClients.length === 0 ? `<div style="color:var(--text-muted);font-size:13px">Nessuna vendita questa settimana</div>` :
            topClients.map(([name, rev], i) => `
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <div style="width:20px;height:20px;border-radius:50%;background:${['#fbbf24','#94a3b8','#cd7c2b','var(--border)','var(--border)'][i]};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#000;flex-shrink:0">${i+1}</div>
                <div style="flex:1;font-size:13px;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</div>
                <div style="font-size:13px;font-weight:700;color:#22c55e;flex-shrink:0">${fmt(rev)}</div>
              </div>
            `).join('')}
          </div>

          <!-- Top products -->
          <div class="wr-section">
            <div class="wr-section-title">📦 Top Prodotti</div>
            ${topProds.length === 0 ? `<div style="color:var(--text-muted);font-size:13px">Nessun prodotto questa settimana</div>` :
            topProds.map(([name, d], i) => `
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <div style="width:20px;height:20px;border-radius:50%;background:${['#60a5fa','#94a3b8','#cbd5e1','var(--border)','var(--border)'][i]};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#000;flex-shrink:0">${i+1}</div>
                <div style="flex:1;font-size:13px;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-size:12px;font-weight:700;color:#60a5fa">${fmt(d.rev)}</div>
                  <div style="font-size:10px;color:var(--text-dim)">${d.count} un.</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Alerts & opportunities -->
        <div class="wr-section">
          <div class="wr-section-title">🔔 Alert & Opportunità</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${overdueOrders.length > 0 ? `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#ef444415;border:1px solid #ef444430;border-radius:9px;cursor:pointer" onclick="App.navigate('orders')">
              <span style="font-size:18px">🚨</span>
              <div style="flex:1"><div style="font-size:13px;font-weight:600;color:#ef4444">${overdueOrders.length} ordini in ritardo</div>
              <div style="font-size:11px;color:var(--text-muted)">Clicca per gestire la produzione</div></div>
            </div>` : ''}
            ${pendingQuotes.length > 0 ? `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f59e0b12;border:1px solid #f59e0b30;border-radius:9px;cursor:pointer" onclick="App.navigate('quoter')">
              <span style="font-size:18px">💼</span>
              <div style="flex:1"><div style="font-size:13px;font-weight:600;color:#f59e0b">${pendingQuotes.length} preventivi in attesa</div>
              <div style="font-size:11px;color:var(--text-muted)">${fmt(pendingValue)} di valore potenziale</div></div>
            </div>` : ''}
            ${maxSale > avgSale * 2 && maxSale > 0 ? `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#a855f715;border:1px solid #a855f730;border-radius:9px">
              <span style="font-size:18px">⭐</span>
              <div style="flex:1"><div style="font-size:13px;font-weight:600;color:#a855f7">Vendita eccezionale questa settimana</div>
              <div style="font-size:11px;color:var(--text-muted)">${fmt(maxSale)} — ben oltre la media (${fmt(avgSale)})</div></div>
            </div>` : ''}
            ${thisRev === 0 && prevRev > 0 ? `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#ef444415;border:1px solid #ef444430;border-radius:9px">
              <span style="font-size:18px">😶</span>
              <div style="flex:1"><div style="font-size:13px;font-weight:600;color:#ef4444">Nessuna vendita questa settimana</div>
              <div style="font-size:11px;color:var(--text-muted)">La settimana precedente era ${fmt(prevRev)}</div></div>
            </div>` : ''}
            ${overdueOrders.length===0 && pendingQuotes.length===0 && thisRev>0 ? `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#22c55e12;border:1px solid #22c55e30;border-radius:9px">
              <span style="font-size:18px">✅</span>
              <div style="flex:1"><div style="font-size:13px;font-weight:600;color:#22c55e">Settimana senza problemi</div>
              <div style="font-size:11px;color:var(--text-muted)">Nessun ordine in ritardo, nessun preventivo scaduto</div></div>
            </div>` : ''}
          </div>
        </div>

        <!-- Previous weeks comparison chart -->
        <div class="wr-section">
          <div class="wr-section-title">📊 Confronto Ultime 3 Settimane</div>
          <div style="display:flex;gap:12px;align-items:flex-end;height:80px;padding:4px 0">
            ${[
              { label:'2 sett. fa', rev:prev2Rev, color:'#60a5fa60' },
              { label:'Sett. scorsa', rev:prevRev, color:'#60a5faa0' },
              { label:'Questa sett.', rev:thisRev, color:'#60a5fa' },
            ].map(w => {
              const maxRev = Math.max(prev2Rev, prevRev, thisRev, 1);
              const h = Math.round(w.rev / maxRev * 70);
              return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">
                <div style="font-size:11px;font-weight:700;color:var(--text)">${fmt(w.rev)}</div>
                <div style="width:100%;height:${h}px;background:${w.color};border-radius:4px 4px 0 0;min-height:4px;transition:height .5s"></div>
                <div style="font-size:10px;color:var(--text-dim);text-align:center">${w.label}</div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div style="font-size:11px;color:var(--text-dim);text-align:center;padding:10px">
          📰 Il report viene aggiornato in tempo reale dai tuoi dati. Usa "Esporta HTML" per salvare o condividere.
        </div>
      `;
    } catch(e) {
      document.getElementById('wr-content').innerHTML = `<div style="color:var(--text-muted);padding:30px;text-align:center">Errore nella generazione: ${e.message}</div>`;
    }
  },

  async _exportHTML() {
    const el = document.getElementById('wr-content');
    if (!el) return;
    const now = new Date();
    const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Weekly Report INGLY — ${now.toLocaleDateString('it-IT')}</title>
<style>body{font-family:system-ui,sans-serif;background:#09090b;color:#e5e5e5;padding:24px;max-width:900px;margin:0 auto}
.wr-section{background:#0f0f11;border:1px solid #ffffff0f;border-radius:12px;padding:18px;margin-bottom:14px}
.wr-section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#555;margin-bottom:14px}
.wr-delta{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;padding:2px 7px;border-radius:99px}
.wr-delta.up{background:#22c55e20;color:#22c55e}
.wr-delta.down{background:#ef444420;color:#ef4444}
.wr-delta.flat{background:#1c1c1f;color:#888}
h1{color:#fbbf24;margin-bottom:4px}
</style></head><body>
<h1>📰 Weekly Report INGLY</h1>
<div style="color:#888;margin-bottom:20px;font-size:13px">Generato: ${now.toLocaleString('it-IT')}</div>
${el.innerHTML}
<\/body><\/html>`;
    const blob = new Blob([html], { type:'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ingly_weekly_${now.toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async generate() {
    // Navigate to weeklyreport view and render
    if(typeof App !== 'undefined') {
      App.navigate('weeklyreport');
      setTimeout(() => this._load(), 300);
    } else {
      await this._load();
    }
  },

  async _exportWeek() {
    const [sales] = await Promise.all([AppStore.get('sales').catch(()=>[])]);
    const now=new Date(), mon=new Date(now);
    mon.setDate(now.getDate()-((now.getDay()||7)-1)+this._weekOffset*7);
    const sun=new Date(mon); sun.setDate(mon.getDate()+6);
    const week=sales.filter(s=>{const d=new Date(s.date||s.createdAt||'');return d>=mon&&d<=sun&&s.status==='pagato';});
    if(!week.length){toast('Nessuna vendita questa settimana','info');return;}
    const csv='Data,Cliente,Importo\n'+week.map(s=>`"${s.date||''}","${s.clientName||''}",${+s.amount||0}`).join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    const a=document.createElement('a');a.href=url;a.download=`report-settimana-${mon.toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
    toast('Report settimanale esportato!','success');
  }
};

// ══════════════════════════════════════════════════════════════════════
// MODULE MANAGER v69
// ══════════════════════════════════════════════════════════════════════
const ModMgr = {
  SK_HIDDEN:  'ingly_hidden_groups_v2',
  SK_CUSTOM:  'ingly_custom_sections_v1',  // custom-added sections
  SK_REMOVED: 'ingly_removed_sections_v1', // user-removed sections
  SK_ORDER:   'ingly_section_order_v1',    // custom reorder per group
  _tab: 'groups',

  GROUPS: [
    {id:'ng-ai',      icon:'🧠', label:'AI Command Center',        color:'#a78bfa'},
    {id:'ng-intel',   icon:'📊', label:'Intelligence & Analytics', color:'#38bdf8'},
    {id:'ng-market',  icon:'🔮', label:'Market Intelligence',      color:'#f97316'},
    {id:'ng-pipeline',icon:'💼', label:'Gestione Lavori',          color:'#fbbf24'},
    {id:'ng-stock',   icon:'🏭', label:'Produzione & Stock',       color:'#34d399'},
    {id:'ng-finance', icon:'💰', label:'Finance & Fiscale',        color:'#22c55e'},
    {id:'ng-crm',     icon:'👥', label:'CRM & Customer AI',        color:'#ec4899'},
    {id:'ng-mkt',     icon:'📢', label:'Marketing & Content AI',   color:'#f59e0b'},
    {id:'ng-ops',     icon:'📅', label:'Pianificazione & Ops',     color:'#60a5fa'},
    {id:'ng-brand',   icon:'🏢', label:'Brand & Business',         color:'#a855f7'},
    {id:'ng-report',  icon:'📄', label:'Report & Export',          color:'#ef4444'},
  ],

  // ── Storage helpers ──────────────────────────────────────────────────
  getHidden(){ try{return JSON.parse(localStorage.getItem(this.SK_HIDDEN)||'[]')}catch{return[]} },
  setHidden(a){ try{localStorage.setItem(this.SK_HIDDEN,JSON.stringify(a))}catch{} },
  getCustom(){ try{return JSON.parse(localStorage.getItem(this.SK_CUSTOM)||'[]')}catch{return[]} },
  setCustom(a){ try{localStorage.setItem(this.SK_CUSTOM,JSON.stringify(a))}catch{} },
  getRemoved(){ try{return JSON.parse(localStorage.getItem(this.SK_REMOVED)||'[]')}catch{return[]} },
  setRemoved(a){ try{localStorage.setItem(this.SK_REMOVED,JSON.stringify(a))}catch{} },

  // ── Apply hidden groups ──────────────────────────────────────────────
  _apply(){
    const hidden  = this.getHidden();
    const removed = this.getRemoved();
    const favs    = new Set(typeof Favs!=='undefined' ? (Favs.getFavs()||[]) : []);

    // Show/hide groups
    this.GROUPS.forEach(g=>{
      const el = document.getElementById(g.id);
      if(!el) return;
      const isHidden = hidden.includes(g.id);
      if(!isHidden){ el.classList.remove('ng-hidden'); el.querySelectorAll('.nav-item[data-section]').forEach(i=>{ if(!removed.includes(i.dataset.section)) i.style.display=''; }); return; }
      const hasFav = [...el.querySelectorAll('.nav-item[data-section]')].some(i=>favs.has(i.dataset.section));
      if(hasFav){
        el.classList.remove('ng-hidden');
        el.querySelectorAll('.nav-item[data-section]').forEach(i=>{ i.style.display = favs.has(i.dataset.section)?'':'none'; });
      } else { el.classList.add('ng-hidden'); }
    });

    // Hide individually removed sections
    removed.forEach(section=>{
      document.querySelectorAll(`.nav-item[data-section="${section}"]`).forEach(el=>{
        if(!el.closest('#nav-favs-list')&&!el.closest('#nav-recent-list')) el.style.display='none';
      });
    });

    // Inject custom sections
    this._injectCustom();
  },

  // ── Inject user-created custom sections into sidebar ────────────────
  _injectCustom(){
    const customs = this.getCustom();
    customs.forEach(sec=>{
      if(document.querySelector(`.nav-item[data-section="${sec.id}"]`)) return; // already exists
      const group = document.getElementById(sec.group||'ng-ops');
      if(!group) return;
      const items = group.querySelector('.nav-group-items');
      if(!items) return;
      const el = document.createElement('div');
      el.className = 'nav-item';
      el.dataset.section = sec.id;
      el.onclick = ()=>{ if(typeof SectionWorkspace!=='undefined') SectionWorkspace.open(sec); else toast(`${sec.label}`,'info'); };
      el.innerHTML = `<i class="${sec.icon||'fas fa-circle'}"></i> ${sec.label}`;
      if(sec.color) el.style.color = sec.color;
      el.style.fontWeight = '600';
      items.appendChild(el);
    });
  },

  // ── Toggle group visibility ──────────────────────────────────────────
  toggle(groupId){
    const h = this.getHidden();
    const i = h.indexOf(groupId);
    if(i>=0) h.splice(i,1); else h.push(groupId);
    this.setHidden(h);
    this._apply();
    this._renderBody();
  },

  // ── Remove individual section ────────────────────────────────────────
  removeSection(section){
    if(!confirm(`Rimuovere "${section}" dalla sidebar?`)) return;
    const r = this.getRemoved();
    if(!r.includes(section)) r.push(section);
    this.setRemoved(r);
    this._apply();
    this.switchTab('sections');
  },

  // ── Restore removed section ──────────────────────────────────────────
  restoreSection(section){
    const r = this.getRemoved().filter(s=>s!==section);
    this.setRemoved(r);
    this._apply();
    this.switchTab('sections');
  },

  // ── Add custom section ───────────────────────────────────────────────
  addCustomSection(){
    const label  = document.getElementById('mm-new-label')?.value?.trim();
    const icon   = document.getElementById('mm-new-icon')?.value?.trim()||'fas fa-circle';
    const color  = document.getElementById('mm-new-color')?.value||'';
    const group  = document.getElementById('mm-new-group')?.value||'ng-ops';
    const url    = document.getElementById('mm-new-url')?.value?.trim()||'';
    if(!label){ toast('Inserisci un nome per la sezione','warning'); return; }
    const id = 'custom_'+Date.now();
    const customs = this.getCustom();
    customs.push({id, label, icon, color, group, url});
    this.setCustom(customs);
    this._apply();
    toast(`✅ Sezione "${label}" aggiunta!`,'success');
    // Clear form
    ['mm-new-label','mm-new-url'].forEach(k=>{ const el=document.getElementById(k); if(el) el.value=''; });
    this.switchTab('sections');
  },

  // ── Delete custom section ────────────────────────────────────────────
  deleteCustom(id){
    if(!confirm('Eliminare questa sezione personalizzata?')) return;
    this.setCustom(this.getCustom().filter(s=>s.id!==id));
    document.querySelectorAll(`.nav-item[data-section="${id}"]`).forEach(el=>el.remove());
    toast('Sezione eliminata','info');
    this.switchTab('sections');
  },

  // ── Rename a section label in sidebar ────────────────────────────────
  renameSection(section, currentLabel){
    const newLabel = prompt(`Rinomina sezione "${section}":`, currentLabel);
    if(!newLabel||newLabel===currentLabel) return;
    // Update in DOM
    document.querySelectorAll(`.nav-item[data-section="${section}"]`).forEach(el=>{
      const ico = el.querySelector('i');
      el.textContent = '';
      if(ico) el.appendChild(ico);
      el.appendChild(document.createTextNode(' '+newLabel));
    });
    // Store rename
    let renames;
    try{ renames=JSON.parse(localStorage.getItem('ingly_renames')||'{}'); }catch{ renames={}; }
    renames[section]=newLabel;
    localStorage.setItem('ingly_renames',JSON.stringify(renames));
    toast(`✏️ Rinominato in "${newLabel}"`,'success');
    this.switchTab('sections');
  },

  // ── Bulk actions ─────────────────────────────────────────────────────
  showAll(){
    this.setHidden([]);
    this.setRemoved([]);
    this._apply();
    this._renderBody();
    toast('👁 Tutto visibile','success');
  },

  resetToDefault(){
    if(!confirm('Ripristinare la sidebar originale? Perderai personalizzazioni e sezioni aggiunte.')) return;
    [this.SK_HIDDEN,this.SK_CUSTOM,this.SK_REMOVED,this.SK_ORDER,'ingly_renames'].forEach(k=>localStorage.removeItem(k));
    // Remove custom DOM elements
    document.querySelectorAll('.nav-item[data-section^="custom_"]').forEach(el=>el.remove());
    this._apply();
    this._renderBody();
    toast('↩ Sidebar ripristinata','success');
  },

  // ── UI: Switch tab ───────────────────────────────────────────────────
  switchTab(tab){
    this._tab = tab;
    ['groups','sections','add'].forEach(t=>{
      const btn = document.getElementById('mmgr-tab-'+t);
      if(!btn) return;
      if(t===tab){
        btn.style.background='var(--primary-dim)';btn.style.borderBottomColor='var(--primary)';btn.style.color='var(--primary)';
      } else {
        btn.style.background='transparent';btn.style.borderBottomColor='transparent';btn.style.color='var(--text-muted)';
      }
    });
    this._renderBody();
  },

  // ── UI: Render body content ──────────────────────────────────────────
  _renderBody(){
    const body = document.getElementById('mod-mgr-body');
    if(!body) return;
    if(this._tab==='groups') this._renderGroups(body);
    else if(this._tab==='sections') this._renderSections(body);
    else this._renderAdd(body);
  },

  // ── Tab: GROUPS ──────────────────────────────────────────────────────
  _renderGroups(body){
    const hidden = this.getHidden();
    body.innerHTML = `
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
        Attiva o disattiva interi gruppi della sidebar. I preferiti restano sempre visibili.
      </div>
      ${this.GROUPS.map(g=>{
        const isHidden = hidden.includes(g.id);
        const groupEl = document.getElementById(g.id);
        const count = groupEl ? groupEl.querySelectorAll('.nav-item[data-section]').length : g.n||0;
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;margin-bottom:6px;background:${isHidden?'var(--bg-card)':'var(--bg-card2)'};border:1px solid ${isHidden?'var(--border)':'var(--border2)'};transition:.15s;opacity:${isHidden?.55:1}">
          <span style="font-size:18px;flex-shrink:0">${g.icon}</span>
          <span style="flex:1;font-size:13px;font-weight:600;color:var(--text)">${g.label}</span>
          <span style="font-size:11px;color:var(--text-dim);flex-shrink:0">${count} voci</span>
          <label style="position:relative;display:inline-block;width:36px;height:20px;flex-shrink:0;cursor:pointer">
            <input type="checkbox" ${isHidden?'':'checked'} onchange="ModMgr.toggle('${g.id}')" style="opacity:0;width:0;height:0;position:absolute">
            <span style="position:absolute;inset:0;border-radius:99px;background:${isHidden?'var(--border2)':'var(--primary)'};transition:.2s;cursor:pointer"></span>
            <span style="position:absolute;top:2px;left:${isHidden?'2px':'18px'};width:16px;height:16px;border-radius:50%;background:#fff;transition:.2s;box-shadow:0 1px 3px #0004"></span>
          </label>
        </div>`;
      }).join('')}`;
  },

  // ── Tab: SECTIONS ────────────────────────────────────────────────────
  _renderSections(body){
    const removed  = this.getRemoved();
    const customs  = this.getCustom();
    let renames;
    try{ renames=JSON.parse(localStorage.getItem('ingly_renames')||'{}'); }catch{ renames={}; }

    // Collect all current nav items
    const sections = [];
    document.querySelectorAll('#sidebar-nav .nav-item[data-section]').forEach(el=>{
      if(el.closest('#nav-favs-list')||el.closest('#nav-recent-list')) return;
      const s = el.dataset.section;
      const group = el.closest('.nav-group');
      const groupId = group?.id||'';
      const groupInfo = this.GROUPS.find(g=>g.id===groupId);
      const tmp = el.cloneNode(true);
      tmp.querySelectorAll('.nav-pin,.nav-badge,i').forEach(x=>x.remove());
      const label = (renames[s]||tmp.textContent.trim()||s).replace(/[⭐🔴🟡🚀📈💰🧠⚡🔔🎯]/g,'').trim();
      const iEl = el.querySelector('i');
      const ico = iEl?.className||'fas fa-circle';
      const isRemoved = removed.includes(s);
      const isCustom = customs.some(c=>c.id===s);
      sections.push({s, label, ico, groupId, groupLabel:groupInfo?.label||groupId, isRemoved, isCustom, color:el.style.color});
    });

    // Also add removed sections that may not be in DOM
    removed.forEach(s=>{
      if(!sections.find(sec=>sec.s===s)){
        sections.push({s, label:s, ico:'fas fa-circle', groupId:'', groupLabel:'(rimosso)', isRemoved:true, isCustom:false});
      }
    });

    const active = sections.filter(s=>!s.isRemoved);
    const removedSecs = sections.filter(s=>s.isRemoved);

    body.innerHTML = `
      <!-- Search -->
      <div style="position:relative;margin-bottom:12px">
        <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-dim);font-size:12px"></i>
        <input id="mmgr-search" placeholder="Cerca sezione..." oninput="ModMgr._filterSections(this.value)"
          style="width:100%;padding:8px 10px 8px 32px;background:var(--bg-card2);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-size:12px;box-sizing:border-box;outline:none">
      </div>

      <!-- Active sections -->
      <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">
        Sezioni attive (${active.length})
      </div>
      <div id="mmgr-section-list">
        ${active.map(sec=>`
          <div class="mmgr-sec-row" data-label="${sec.label.toLowerCase()}" data-group="${sec.groupLabel.toLowerCase()}"
            style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:9px;margin-bottom:4px;background:var(--bg-card2);border:1px solid var(--border);transition:.15s"
            onmouseover="this.style.borderColor='var(--border2)'" onmouseout="this.style.borderColor='var(--border)'">
            <i class="${sec.ico}" style="width:16px;text-align:center;font-size:13px;flex-shrink:0;color:${sec.color||'var(--text-muted)'}"></i>
            <span style="flex:1;font-size:12px;font-weight:600;color:var(--text)">${sec.label}</span>
            <span style="font-size:9px;color:var(--text-dim);padding:2px 7px;background:var(--bg-card3);border-radius:99px">${sec.groupLabel}</span>
            ${sec.isCustom?'<span style="font-size:9px;color:var(--primary);padding:2px 7px;background:var(--primary-dim);border-radius:99px;border:1px solid var(--primary-border)">Custom</span>':''}
            <!-- Actions -->
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button onclick="ModMgr.renameSection('${sec.s}','${sec.label.replace(/'/g,"\\'")}') " title="Rinomina"
                style="padding:3px 7px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:10px;transition:.15s"
                onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--primary)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">✏️</button>
              ${sec.isCustom
                ?`<button onclick="ModMgr.deleteCustom('${sec.s}')" title="Elimina" style="padding:3px 7px;background:none;border:1px solid #ef444430;border-radius:6px;color:#ef4444;cursor:pointer;font-size:10px;transition:.15s" onmouseover="this.style.background='#ef444415'" onmouseout="this.style.background='none'">🗑️</button>`
                :`<button onclick="ModMgr.removeSection('${sec.s}')" title="Nascondi dalla sidebar" style="padding:3px 7px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:10px;transition:.15s" onmouseover="this.style.borderColor='#ef4444';this.style.color='#ef4444'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">🙈</button>`
              }
            </div>
          </div>`).join('')}
      </div>

      <!-- Removed sections -->
      ${removedSecs.length?`
      <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 8px">
        Sezioni nascoste (${removedSecs.length}) — clicca per ripristinare
      </div>
      ${removedSecs.map(sec=>`
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:9px;margin-bottom:4px;background:var(--bg-card);border:1px dashed var(--border);opacity:.6;cursor:pointer;transition:.15s"
          onclick="ModMgr.restoreSection('${sec.s}')" onmouseover="this.style.opacity='1';this.style.borderStyle='solid'" onmouseout="this.style.opacity='.6';this.style.borderStyle='dashed'">
          <i class="${sec.ico}" style="width:16px;text-align:center;font-size:13px;color:var(--text-dim)"></i>
          <span style="flex:1;font-size:12px;color:var(--text-muted)">${sec.label}</span>
          <span style="font-size:10px;color:var(--green);font-weight:700">↩ Ripristina</span>
        </div>`).join('')}
      `:''}`;
  },

  // ── Filter sections list ──────────────────────────────────────────────
  _filterSections(q){
    const query = q.toLowerCase().trim();
    document.querySelectorAll('.mmgr-sec-row').forEach(row=>{
      const visible = !query || row.dataset.label?.includes(query) || row.dataset.group?.includes(query);
      row.style.display = visible ? '' : 'none';
    });
  },

  // ── Tab: ADD ─────────────────────────────────────────────────────────
  _renderAdd(body){
    const FA_ICONS = ['fas fa-star','fas fa-bolt','fas fa-fire','fas fa-heart','fas fa-gem',
      'fas fa-rocket','fas fa-crown','fas fa-flag','fas fa-bell','fas fa-tag',
      'fas fa-link','fas fa-globe','fas fa-code','fas fa-chart-bar','fas fa-table',
      'fas fa-folder','fas fa-file','fas fa-calendar','fas fa-clock','fas fa-users',
      'fas fa-briefcase','fas fa-shopping-cart','fas fa-truck','fas fa-cog','fas fa-wrench',
      'fas fa-paint-brush','fas fa-camera','fas fa-image','fas fa-music','fas fa-video'];

    body.innerHTML = `
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">
        Crea una sezione personalizzata nella sidebar. Puoi usarla come collegamento rapido o come promemoria.
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:5px">Nome sezione *</label>
          <input id="mm-new-label" class="form-control" placeholder="es. Ordini Amazon" style="font-size:13px">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:5px">Gruppo</label>
          <select id="mm-new-group" class="form-control" style="font-size:13px">
            ${this.GROUPS.map(g=>`<option value="${g.id}">${g.icon} ${g.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:5px">Colore</label>
          <div style="display:flex;gap:6px;align-items:center">
            <input type="color" id="mm-new-color" value="#fbbf24" style="width:36px;height:32px;border:1px solid var(--border);border-radius:6px;cursor:pointer;background:none;padding:2px">
            <span style="font-size:11px;color:var(--text-dim)">Colore del testo nella sidebar</span>
          </div>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:5px">URL / Link esterno (opzionale)</label>
          <input id="mm-new-url" class="form-control" placeholder="https://..." style="font-size:13px">
        </div>
      </div>

      <div style="margin-bottom:14px">
        <label style="font-size:11px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:8px">Icona</label>
        <input id="mm-new-icon-input" class="form-control" placeholder="fas fa-star" value="fas fa-star" oninput="document.getElementById('mm-icon-preview').className=this.value" style="font-size:12px;font-family:monospace;margin-bottom:8px">
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${FA_ICONS.map(ico=>`<button onclick="document.getElementById('mm-new-icon-input').value='${ico}';document.getElementById('mm-icon-preview').className='${ico}';document.querySelectorAll('.mm-ico-btn').forEach(b=>b.style.background='var(--bg-card2)');this.style.background='var(--primary-dim)'" class="mm-ico-btn"
            style="width:34px;height:34px;border:1px solid var(--border);border-radius:8px;background:var(--bg-card2);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s;font-size:14px"
            title="${ico}" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
            <i class="${ico}" style="pointer-events:none"></i>
          </button>`).join('')}
        </div>
      </div>

      <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--bg-card2);border-radius:10px;margin-bottom:16px">
        <div style="font-size:12px;color:var(--text-muted)">Anteprima nella sidebar:</div>
        <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--bg-card);border-radius:8px;border:1px solid var(--border)">
          <i id="mm-icon-preview" class="fas fa-star" style="font-size:13px;color:var(--primary)"></i>
          <span style="font-size:13px;font-weight:600" id="mm-label-preview">Nome sezione</span>
        </div>
      </div>

      <button onclick="ModMgr.addCustomSection()" style="width:100%;padding:11px;background:var(--primary);color:#000;border:none;border-radius:9px;font-weight:800;font-size:14px;cursor:pointer;transition:.15s" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
        ➕ Aggiungi alla Sidebar
      </button>

      <script>
        document.getElementById('mm-new-label')?.addEventListener('input',function(){
          const prev = document.getElementById('mm-label-preview');
          if(prev) prev.textContent = this.value||'Nome sezione';
        });
      <\/script>`;
  },

  // ── Old list render (kept for compat) ────────────────────────────────
  _renderList(){ this._renderBody(); },

  // ── Open/close ───────────────────────────────────────────────────────
  open(){
    this._tab = 'groups';
    const ov = document.getElementById('mod-mgr-overlay');
    if(ov) ov.classList.add('open');
    this.switchTab('groups');
  },

  close(){
    const ov = document.getElementById('mod-mgr-overlay');
    if(ov) ov.classList.remove('open');
  },

  init(){ this._apply(); }
};
window.ModMgr = ModMgr;

// ── SectionWorkspace v1: workspace personalizzabile per sezioni custom ──────
const SectionWorkspace = {
  SK: 'ingly_section_workspaces_v1',

  _data(){ try{ return JSON.parse(localStorage.getItem(this.SK)||'{}'); }catch{ return{}; } },
  _save(d){ try{ localStorage.setItem(this.SK, JSON.stringify(d)); }catch{} },

  open(sec){
    let view = document.getElementById('view-'+sec.id);
    if(!view){
      view = document.createElement('div');
      view.className = 'section-view';
      view.id = 'view-'+sec.id;
      const ci = document.getElementById('content-inner');
      if(ci) ci.appendChild(view);
    }
    this._render(view, sec);
    if(typeof App !== 'undefined') App.navigate(sec.id);
  },

  _render(view, sec){
    const d = this._data();
    const ws = d[sec.id] || { notes:'', pins:[], tasks:[] };
    const safeid = sec.id.replace(/[^a-zA-Z0-9_]/g,'_');
    const QUICK = ['dashboard','quoter','sales','clients','catalog','cashflow','inventory','lasercalc','goals'];
    view.innerHTML = `
      <div style="padding:20px 24px;max-width:960px">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px;flex-wrap:wrap">
          <div style="width:46px;height:46px;border-radius:12px;background:var(--primary-dim);border:1px solid var(--primary-border);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${sec.icon?`<i class="${sec.icon}" style="color:${sec.color||'var(--primary)'}"></i>`:'📁'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:20px;font-weight:800;color:var(--text);line-height:1.2">${sec.label}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Workspace personalizzato · Sezione custom</div>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0">
            <button onclick="SectionWorkspace._editMeta('${sec.id}')" style="padding:7px 13px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);font-size:12px;cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">✏️ Modifica</button>
            <button onclick="ModMgr.open()" style="padding:7px 13px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);font-size:12px;cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">⚙️ Gestisci Sezioni</button>
          </div>
        </div>

        <!-- Description if set -->
        ${ws.desc ? `<div style="padding:12px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;font-size:13px;color:var(--text-muted);margin-bottom:16px;line-height:1.5">${ws.desc}</div>` : ''}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <!-- Note Interne -->
          <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:16px">
            <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📝 Note Interne</div>
            <textarea id="ws-notes-${safeid}" placeholder="Scrivi note, idee, promemoria per questa sezione..."
              style="width:100%;min-height:140px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:10px;resize:vertical;color:var(--text);font-size:13px;line-height:1.6;outline:none;box-sizing:border-box;font-family:inherit;transition:.2s"
              onfocus="this.style.borderColor='var(--primary-border)'" onblur="this.style.borderColor='var(--border)';SectionWorkspace._saveNote('${sec.id}',this.value)"
            >${ws.notes||''}</textarea>
            <button onclick="SectionWorkspace._saveNote('${sec.id}',document.getElementById('ws-notes-${safeid}').value)" style="margin-top:8px;padding:5px 12px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:7px;color:var(--primary);font-size:11px;font-weight:700;cursor:pointer">💾 Salva nota</button>
          </div>

          <!-- Task List -->
          <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:16px">
            <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">✅ Task / To-Do</div>
            <div id="ws-tasks-${safeid}" style="margin-bottom:10px;max-height:160px;overflow-y:auto">
              ${(ws.tasks||[]).map((t,i)=>`
                <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
                  <input type="checkbox" ${t.done?'checked':''} onchange="SectionWorkspace._toggleTask('${sec.id}',${i},this.checked)"
                    style="width:15px;height:15px;cursor:pointer;accent-color:var(--primary);flex-shrink:0">
                  <span style="flex:1;font-size:12px;color:var(--text);${t.done?'text-decoration:line-through;opacity:.5':''}">${t.text}</span>
                  <button onclick="SectionWorkspace._removeTask('${sec.id}',${i})" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:13px;padding:0 4px" title="Rimuovi">✕</button>
                </div>`).join('')||'<div style="font-size:12px;color:var(--text-dim);padding:8px 0">Nessun task — aggiungine uno sotto</div>'}
            </div>
            <div style="display:flex;gap:6px">
              <input id="ws-newtask-${safeid}" placeholder="Nuovo task..." onkeydown="if(event.key==='Enter')SectionWorkspace._addTask('${sec.id}','${safeid}')"
                style="flex:1;padding:6px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;outline:none">
              <button onclick="SectionWorkspace._addTask('${sec.id}','${safeid}')" style="padding:6px 12px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:7px;color:var(--primary);font-size:11px;font-weight:700;cursor:pointer">+ Add</button>
            </div>
          </div>
        </div>

        <!-- Pinned sections -->
        <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">📌 Sezioni Pinnate</div>
            <button onclick="SectionWorkspace._pinPicker('${sec.id}','${safeid}')" style="padding:4px 10px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:6px;color:var(--primary);font-size:11px;cursor:pointer;font-weight:700">+ Pin</button>
          </div>
          <div id="ws-pins-${safeid}" style="display:flex;flex-wrap:wrap;gap:8px">
            ${(ws.pins||[]).length ? (ws.pins||[]).map(p=>`
              <div style="display:flex;align-items:center;gap:6px;padding:7px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;cursor:pointer;transition:.15s"
                onclick="App.navigate('${p.id}')" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
                <span style="font-size:12px;color:var(--text);font-weight:600">${p.label}</span>
                <button onclick="event.stopPropagation();SectionWorkspace._unpin('${sec.id}','${safeid}','${p.id}')" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:11px;padding:0;line-height:1" title="Rimuovi pin">✕</button>
              </div>`).join('') : '<div style="font-size:12px;color:var(--text-dim)">Nessuna sezione pinnata — clicca + Pin</div>'}
          </div>
        </div>

        <!-- Quick Access -->
        <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:16px">
          <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">⚡ Accesso Rapido</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${QUICK.map(s=>`<button onclick="App.navigate('${s}')" style="padding:6px 13px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);font-size:12px;cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--text)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">${s}</button>`).join('')}
          </div>
        </div>
      </div>`;
  },

  _saveNote(sectionId, text){
    const d = this._data();
    if(!d[sectionId]) d[sectionId] = { notes:'', pins:[], tasks:[] };
    d[sectionId].notes = text;
    this._save(d);
    toast('📝 Nota salvata','success');
  },

  _addTask(sectionId, safeid){
    const inp = document.getElementById('ws-newtask-'+safeid);
    if(!inp) return;
    const text = inp.value.trim();
    if(!text) return;
    const d = this._data();
    if(!d[sectionId]) d[sectionId] = { notes:'', pins:[], tasks:[] };
    d[sectionId].tasks.push({ text, done:false });
    this._save(d);
    inp.value = '';
    const sec = (typeof ModMgr !== 'undefined' ? ModMgr.getCustom() : []).find(s=>s.id===sectionId);
    if(sec){ const v=document.getElementById('view-'+sectionId); if(v) this._render(v,sec); }
  },

  _toggleTask(sectionId, idx, done){
    const d = this._data();
    if(d[sectionId]&&d[sectionId].tasks[idx]) d[sectionId].tasks[idx].done = done;
    this._save(d);
  },

  _removeTask(sectionId, idx){
    const d = this._data();
    if(d[sectionId]&&d[sectionId].tasks) d[sectionId].tasks.splice(idx,1);
    this._save(d);
    const sec = (typeof ModMgr !== 'undefined' ? ModMgr.getCustom() : []).find(s=>s.id===sectionId);
    if(sec){ const v=document.getElementById('view-'+sectionId); if(v) this._render(v,sec); }
  },

  _pinPicker(sectionId, safeid){
    const sections = [];
    document.querySelectorAll('#sidebar-nav .nav-item[data-section]').forEach(el=>{
      if(el.closest('#nav-favs-list')||el.closest('#nav-recent-list')) return;
      const id = el.dataset.section; if(id===sectionId) return;
      const tmp = el.cloneNode(true);
      tmp.querySelectorAll('.nav-pin,.nav-badge,i').forEach(x=>x.remove());
      sections.push({ id, label: (tmp.textContent||'').trim().slice(0,30) });
    });

    let ov = document.getElementById('ws-pin-picker-ov');
    if(!ov){ ov=document.createElement('div'); ov.id='ws-pin-picker-ov'; ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center'; ov.onclick=(e)=>{if(e.target===ov)ov.remove();}; document.body.appendChild(ov); }
    ov.innerHTML = `<div style="background:var(--bg-card);border:1px solid var(--border2);border-radius:16px;padding:20px;width:340px;max-height:480px;display:flex;flex-direction:column">
      <div style="font-size:14px;font-weight:800;color:var(--text);margin-bottom:12px">📌 Pinna una sezione</div>
      <input placeholder="Cerca..." oninput="const q=this.value.toLowerCase();this.nextElementSibling.querySelectorAll('[data-l]').forEach(r=>{r.style.display=r.dataset.l.includes(q)?'':'none'})"
        style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;outline:none;margin-bottom:10px;box-sizing:border-box">
      <div style="overflow-y:auto;flex:1">
        ${sections.map(s=>`<div data-l="${s.label.toLowerCase()}" style="padding:8px 12px;border-radius:8px;cursor:pointer;font-size:13px;color:var(--text);transition:.1s"
          onclick="SectionWorkspace._pinSection('${sectionId}','${safeid}','${s.id}','${s.label.replace(/'/g,"\\'")}')" onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background='none'">${s.label}</div>`).join('')}
      </div>
    </div>`;
  },

  _pinSection(sectionId, safeid, pinId, pinLabel){
    const d = this._data();
    if(!d[sectionId]) d[sectionId] = { notes:'', pins:[], tasks:[] };
    if(!d[sectionId].pins.find(p=>p.id===pinId)){
      d[sectionId].pins.push({ id:pinId, label:pinLabel });
      this._save(d);
      const ov=document.getElementById('ws-pin-picker-ov'); if(ov) ov.remove();
      const sec = (typeof ModMgr !== 'undefined' ? ModMgr.getCustom() : []).find(s=>s.id===sectionId);
      if(sec){ const v=document.getElementById('view-'+sectionId); if(v) this._render(v,sec); }
      toast(`📌 "${pinLabel}" pinnata!`,'success');
    }
  },

  _unpin(sectionId, safeid, pinId){
    const d = this._data();
    if(d[sectionId]) d[sectionId].pins = (d[sectionId].pins||[]).filter(p=>p.id!==pinId);
    this._save(d);
    const sec = (typeof ModMgr !== 'undefined' ? ModMgr.getCustom() : []).find(s=>s.id===sectionId);
    if(sec){ const v=document.getElementById('view-'+sectionId); if(v) this._render(v,sec); }
    toast('Pin rimosso','info');
  },

  _editMeta(sectionId){
    const d = this._data();
    const ws = d[sectionId] || { notes:'', pins:[], tasks:[] };
    const desc = prompt('Descrizione del workspace (opzionale):', ws.desc||'');
    if(desc===null) return;
    if(!d[sectionId]) d[sectionId] = { notes:'', pins:[], tasks:[] };
    d[sectionId].desc = desc;
    this._save(d);
    const sec = (typeof ModMgr !== 'undefined' ? ModMgr.getCustom() : []).find(s=>s.id===sectionId);
    if(sec){ const v=document.getElementById('view-'+sectionId); if(v) this._render(v,sec); }
    toast('✅ Workspace aggiornato','success');
  }
};
window.SectionWorkspace = SectionWorkspace;

// GlobalSearch → in final batch block


const CmdPalette = {
  _sel: 0,
  _items: [],
  _actions: [],
  _enriched: false,

  _buildIndex(){
    this._items = [];
    document.querySelectorAll('#sidebar-nav .nav-item[data-section]').forEach(el=>{
      if(el.closest('#nav-favs-list')||el.closest('#nav-recent-list')) return;
      const s = el.dataset.section;
      const iEl = el.querySelector('i');
      const ico = iEl ? iEl.className : 'fas fa-circle';
      const tmp = el.cloneNode(true);
      tmp.querySelectorAll('.nav-pin,.nav-badge,img').forEach(x=>x.remove());
      const label = tmp.textContent.trim();
      const col = el.style.color||'';
      const group = el.closest('.nav-group');
      const groupLabel = group ? group.querySelector('.nav-group-title')?.textContent?.replace('▼','').trim() : '';
      this._items.push({s, ico, label, col, groupLabel});
    });
  },

  async _dataSearch(query){
    if(!query||query.length<2) return [];
    const q = query.toLowerCase();
    const results = [];
    try{
      const [clients, sales] = await Promise.all([
        AppStore.get('clients').catch(()=>[]),
        AppStore.get('sales').catch(()=>[]),
      ]);
      clients.filter(cl=>(cl.name||'').toLowerCase().includes(q)).slice(0,3).forEach(cl=>{
        results.push({type:'client',label:`👤 ${cl.name}`,sub:cl.email||cl.phone||'CRM',action:()=>{App.navigate('clients');}});
      });
      sales.filter(s=>(s.desc||s.product||'').toLowerCase().includes(q)).slice(0,2).forEach(s=>{
        results.push({type:'sale',label:`💰 ${s.desc||s.product||'Vendita'}`,sub:`€${s.amount||0}`,action:()=>{App.navigate('sales');}});
      });
    }catch(e){}
    return results;
  },

  async search(q){
    const results_el = document.getElementById('cmd-results');
    if(!results_el) return;
    if(!q.trim()){ results_el.innerHTML = this._renderDefault(); this._sel=0; return; }
    const ql = q.toLowerCase();
    const nav = this._items.filter(item=>item.label.toLowerCase().includes(ql)||item.s.toLowerCase().includes(ql)).slice(0,8);
    const data = await this._dataSearch(q);
    const actions = (this._actions||[]).filter(a=>a.label.toLowerCase().includes(ql)).slice(0,4);
    if(!nav.length&&!data.length&&!actions.length){
      results_el.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px">Nessun risultato per <em>"'+q+'"</em></div>';
      return;
    }
    let html='';
    if(nav.length){
      html+='<div style="padding:6px 14px 4px;font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">Sezioni</div>';
      html+=nav.map((item,i)=>`<div class="cmd-item${i===0?' cmd-sel':''}" data-idx="${i}" onclick="App.navigate('${item.s}');CmdPalette.close()"
        style="display:flex;align-items:center;gap:12px;padding:9px 14px;cursor:pointer;transition:.1s"
        onmouseover="this.classList.add('cmd-sel')" onmouseout="if(CmdPalette._sel!==${i})this.classList.remove('cmd-sel')">
        <i class="${item.ico}" style="width:18px;text-align:center;font-size:14px;flex-shrink:0;color:${item.col||'var(--text-muted)'}"></i>
        <div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text)">${item.label}</div>
        <div style="font-size:10px;color:var(--text-dim)">${item.groupLabel||''}</div></div>
        <span style="font-size:9px;color:var(--text-dim);background:var(--bg-card2);padding:2px 7px;border-radius:5px">↵</span>
      </div>`).join('');
    }
    if(actions.length){
      html+='<div style="padding:6px 14px 4px;font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">Azioni</div>';
      html+=actions.map((a,i)=>`<div class="cmd-item" onclick="CmdPalette._runAction(CmdPalette._actions.indexOf(a_${i}));CmdPalette.close()"
        style="display:flex;align-items:center;gap:12px;padding:9px 14px;cursor:pointer;transition:.1s"
        onmouseover="this.classList.add('cmd-sel')" onmouseout="this.classList.remove('cmd-sel')">
        <span style="font-size:16px">${a.icon}</span>
        <div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text)">${a.label}</div>
        <div style="font-size:10px;color:var(--text-dim)">${a.sub||''}</div></div>
      </div>`).join('');
    }
    if(data.length){
      html+='<div style="padding:6px 14px 4px;font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">Dati</div>';
      html+=data.map(d=>`<div class="cmd-item" onclick="(${JSON.stringify(d.action.toString())});CmdPalette.close()"
        style="display:flex;align-items:center;gap:12px;padding:9px 14px;cursor:pointer;transition:.1s"
        onmouseover="this.classList.add('cmd-sel')" onmouseout="this.classList.remove('cmd-sel')">
        <span style="font-size:16px">${d.label.split(' ')[0]}</span>
        <div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text)">${d.label.slice(d.label.indexOf(' ')+1)}</div>
        <div style="font-size:10px;color:var(--text-dim)">${d.sub||''}</div></div>
      </div>`).join('');
    }
    results_el.innerHTML = html;
    this._sel = 0;
    this._updateSel();
  },

  _renderDefault(){
    const recents = (typeof Favs!=='undefined' ? Favs.getRecent() : []).slice(0,6);
    if(!recents.length) return '<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px">Digita per cercare sezioni, dati o azioni</div>';
    return '<div style="padding:6px 14px 4px;font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">Recenti</div>'
      + recents.map((s,i)=>{
          const item = this._items.find(x=>x.s===s);
          if(!item) return '';
          return `<div class="cmd-item${i===0?' cmd-sel':''}" data-idx="${i}" onclick="App.navigate('${s}');CmdPalette.close()"
            style="display:flex;align-items:center;gap:12px;padding:9px 14px;cursor:pointer;transition:.1s"
            onmouseover="this.classList.add('cmd-sel')" onmouseout="if(CmdPalette._sel!==${i})this.classList.remove('cmd-sel')">
            <i class="${item.ico}" style="width:18px;text-align:center;font-size:14px;flex-shrink:0;color:${item.col||'var(--text-muted)'}"></i>
            <div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text)">${item.label}</div>
            <div style="font-size:10px;color:var(--text-dim)">${item.groupLabel||''}</div></div>
            <span style="font-size:9px;color:var(--text-dim)">recente</span>
          </div>`;
        }).join('');
  },

  _updateSel(){
    document.querySelectorAll('#cmd-results .cmd-item').forEach((el,i)=>{
      el.classList.toggle('cmd-sel', i===this._sel);
    });
  },

  keyNav(e){
    const items = document.querySelectorAll('#cmd-results .cmd-item');
    if(e.key==='ArrowDown'){ e.preventDefault(); this._sel=Math.min(this._sel+1,items.length-1); this._updateSel(); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); this._sel=Math.max(this._sel-1,0); this._updateSel(); }
    else if(e.key==='Enter'){ e.preventDefault(); items[this._sel]?.click(); }
    else if(e.key==='Escape'){ this.close(); }
  },

  _runAction(idx){ const a=(this._actions||[])[idx]; if(a){ this.close(); setTimeout(()=>a.action(),100); } },

  open(){
    this._buildIndex();
    const ov = document.getElementById('cmd-overlay');
    if(ov) ov.classList.add('cmd-open');
    const inp = document.getElementById('cmd-input');
    if(inp){ inp.value=''; inp.focus(); }
    const res = document.getElementById('cmd-results');
    if(res) res.innerHTML = this._renderDefault();
    this._sel=0;
  },

  close(){
    document.getElementById('cmd-overlay')?.classList.remove('cmd-open');
  },

  init(){ this._buildIndex(); }
};
window.CmdPalette = CmdPalette;

