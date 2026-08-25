
// === /src/modules/ai/index.js ===
// AI Module - INGLY OS v88
const AILayer={
  rules:[
    {id:'cash_neg',check:k=>k.netFlow<0,icon:'🔴',msg:k=>`Cashflow negativo: ${fmtCur(k.netFlow)}. Verifica le uscite!`,priority:'critica'},
    {id:'low_stock',check:k=>k.lowStock>2,icon:'🟠',msg:k=>`${k.lowStock} materiali sotto scorta minima. Riordina presto!`,priority:'alta'},
    {id:'unpaid_high',check:k=>k.revenue>0&&k.unpaid/k.revenue>0.4,icon:'🟠',msg:k=>`${Math.round(k.unpaid/k.revenue*100)}% del fatturato non incassato. Invia solleciti!`,priority:'alta'},
    {id:'margin_low',check:k=>k.revenue>0&&k.profitMargin<60,icon:'🔴',msg:k=>`Margine netto ${k.profitMargin?.toFixed(1)}% sotto target (≥60%). Rivedi costi o aumenta i prezzi.`,priority:'alta'},
    {id:'conv_low',check:k=>k.convRate<40,icon:'🟡',msg:k=>`Tasso conversione basso: ${k.convRate}% (target ≥40%). Attiva follow-up a 48h e 5gg.`,priority:'media'},
    {id:'rev_good',check:k=>k.revenue>=1500,icon:'🟢',msg:k=>`✅ Revenue mensile ${fmtCur(k.revenue)} — a target (€1.500–3.000/mese)${k.revenue>=3000?' 🏆 Eccellente, scala!':''}`,priority:'positiva'},
    {id:'season',check:()=>[3,4,5].includes(new Date().getMonth()+1),icon:'💡',msg:()=>'Stagione matrimoni/comunioni! Prepara il catalogo dedicato.',priority:'opportunità'},
    {id:'season_xmas',check:()=>[11,12].includes(new Date().getMonth()+1),icon:'🎄',msg:()=>'Periodo natalizio! Massimizza le vendite con promozioni stagionali.',priority:'opportunità'},
  ],
  async analyze(){
    const kpi=await KPIEngine.run();
    const decisions=this.rules.filter(r=>{try{return r.check(kpi)}catch{return false}}).map(r=>({...r,message:r.msg(kpi),_ts:Date.now()}));
    for(const d of decisions)await IDB.put('ai_log',{type:d.id,msg:d.message,priority:d.priority,ts:Date.now()}).catch(()=>{});
    const count=decisions.length;
    eid('ai-count').textContent=count;
    eid('nav-ai-count').textContent=count;
    return{kpi,decisions};
  },
  async render(){
    const el=eid('ai-decisions-list');if(!el)return;
    el.innerHTML='<p class="text-muted">Analisi in corso...</p>';
    const{kpi,decisions}=await this.analyze();
    if(!decisions.length){el.innerHTML='<div class="alert alert-success"><i class="fas fa-check-circle"></i> Tutto OK! Nessuna azione urgente richiesta.</div>';return;}
    const prioColor={critica:'var(--red)',alta:'var(--orange)',media:'var(--primary)',positiva:'var(--green)',opportunità:'var(--blue)'};
    el.innerHTML=`
      <div class="grid-3 mb-16">${[
        {l:'Revenue',v:fmtCur(kpi.revenue)},{l:'Cashflow',v:fmtCur(kpi.netFlow)},{l:'Conversione',v:kpi.convRate+'%'}
      ].map(k=>`<div class="card card-sm"><div class="kpi-value" style="font-size:18px">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('')}
      </div>
      ${decisions.map(d=>`<div class="alert" style="border-left:4px solid ${prioColor[d.priority]||'var(--primary)'};background:var(--bg-card2);margin-bottom:10px">
        <span style="font-size:20px">${d.icon}</span>
        <div><strong style="color:#fff">${d.priority.toUpperCase()}</strong><br>${d.message}</div>
      </div>`).join('')}
      <div class="alert alert-info mt-12"><i class="fas fa-info-circle"></i> Analisi eseguita il ${new Date().toLocaleString('it-IT')}</div>`;
  }
};


// ══════════════════════════════════════════════════════════════════════
// PRODUCT INTELLIGENCE ENGINE  v79
// Scores products using: profit (40%) · velocity (30%) · margin (20%) · trend (10%)
// Accessible from: Decision Engine + Dashboard + Opportunity Scanner
// ══════════════════════════════════════════════════════════════════════
const ProductIntelligence = {

  async compute() {
    const [sales, catalog, items] = await Promise.all([
      AppStore.get('sales'),
      AppStore.get('catalog'),
      AppStore.get('items'),
    ]);

    const paid = sales.filter(s => s.status === 'pagato');
    const now = Date.now();
    const msPerDay = 86400000;

    // Build product performance map from sales lines
    const perfMap = {};

    paid.forEach(s => {
      const lines = s.lines || [];
      if (lines.length === 0 && s.desc) {
        // Single-line sale — use description as product name
        const key = s.desc.slice(0, 40);
        if (!perfMap[key]) perfMap[key] = { name: key, rev: 0, cost: 0, sales: 0, lastSale: 0, monthlySales: new Array(12).fill(0) };
        const p = perfMap[key];
        p.rev += +s.amount || 0;
        p.sales++;
        const sDate = new Date(s.date || 0);
        p.lastSale = Math.max(p.lastSale, sDate.getTime());
        p.monthlySales[sDate.getMonth()] += +s.amount || 0;
      }
      lines.forEach(l => {
        const key = l.name || l.desc || 'Altro';
        if (!perfMap[key]) perfMap[key] = { name: key, rev: 0, cost: 0, sales: 0, lastSale: 0, monthlySales: new Array(12).fill(0) };
        const p = perfMap[key];
        p.rev += +l.subtotal || +l.price || 0;
        p.cost += +l.costTotal || (+l.cost * +l.qty) || 0;
        p.sales++;
        const sDate = new Date(s.date || 0);
        p.lastSale = Math.max(p.lastSale, sDate.getTime());
        p.monthlySales[sDate.getMonth()] += +l.subtotal || 0;
      });
    });

    // Enrich with catalog data
    catalog.forEach(c => {
      const p = perfMap[c.name] || perfMap[c.title];
      if (p) {
        p.catalogId = c.id;
        p.cost = p.cost || +c.cost || 0;
        p.stock = +c.stock || 0;
        p.category = c.category || c.cat || '';
      }
    });

    // Calculate scores
    const products = Object.values(perfMap).filter(p => p.rev > 0);
    if (products.length === 0) return [];

    const maxRev = Math.max(...products.map(p => p.rev));
    const maxSales = Math.max(...products.map(p => p.sales));
    const now30 = now - 30 * msPerDay;
    const now90 = now - 90 * msPerDay;

    products.forEach(p => {
      // Profit score (40%)
      const profitScore = maxRev > 0 ? (p.rev / maxRev) * 100 : 0;
      // Velocity score (30%) — sales frequency in last 90d
      const recentSales = paid.filter(s => new Date(s.date || 0).getTime() > now90 && (s.lines || []).some(l => l.name === p.name) || (s.desc === p.name)).length;
      const velocityScore = maxSales > 0 ? (recentSales / Math.max(maxSales, 1)) * 100 : 0;
      // Margin score (20%)
      const margin = p.rev > 0 && p.cost > 0 ? ((p.rev - p.cost) / p.rev * 100) : 50;
      const marginScore = Math.min(margin, 100);
      // Trend score (10%) — last 30d vs prev 30d revenue
      const last30 = p.monthlySales[new Date().getMonth()] || 0;
      const prev30 = p.monthlySales[(new Date().getMonth() + 11) % 12] || 0;
      const trendScore = prev30 > 0 ? Math.min(((last30 - prev30) / prev30 + 1) * 50, 100) : 50;

      p.score = Math.round(profitScore * 0.4 + velocityScore * 0.3 + marginScore * 0.2 + trendScore * 0.1);
      p.margin = +margin.toFixed(1);
      p.daysSinceLastSale = p.lastSale > 0 ? Math.floor((now - p.lastSale) / msPerDay) : 999;
      p.trend = trendScore > 60 ? 'up' : trendScore < 40 ? 'down' : 'flat';
      p.label = p.score >= 75 ? 'star' : p.score >= 50 ? 'good' : p.daysSinceLastSale > 60 ? 'slow' : 'ok';
    });

    return products.sort((a, b) => b.score - a.score);
  },

  async renderWidget(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const products = await this.compute();
    const top5 = products.slice(0, 5);
    const slow = products.filter(p => p.label === 'slow').slice(0, 3);

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div>
          <div style="font-size:10px;font-weight:800;color:#22c55e;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">⭐ TOP PRODOTTI</div>
          ${top5.map((p, i) => `
            <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:11px;color:#6b7280;width:14px">${i+1}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
                <div style="font-size:10px;color:#6b7280">€${p.rev.toFixed(0)} · ${p.margin}% margine</div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-size:13px;font-weight:800;color:${p.score>=75?'#22c55e':p.score>=50?'#f59e0b':'#ef4444'}">${p.score}</div>
                <div style="font-size:9px;color:#6b7280">score</div>
              </div>
            </div>`).join('')}
        </div>
        <div>
          <div style="font-size:10px;font-weight:800;color:#ef4444;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">🐌 DA SPINGERE</div>
          ${slow.length > 0 ? slow.map(p => `
            <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
                <div style="font-size:10px;color:#ef4444">Inattivo da ${p.daysSinceLastSale}gg</div>
              </div>
              <span style="font-size:16px">${p.trend==='down'?'📉':p.trend==='up'?'📈':'➡️'}</span>
            </div>`).join('') : '<div style="font-size:12px;color:#22c55e;padding:8px 0">✅ Tutti i prodotti attivi!</div>'}
          ${products.length > 0 ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)"><div style="font-size:10px;color:#6b7280">Analizzati ${products.length} prodotti · Aggiornato adesso</div></div>` : ''}
        </div>
      </div>`;
  },
};



// ══════════════════════════════════════════════════════════════════════
// CLIENT INTELLIGENCE ENGINE  v79
// RFM segmentation + LTV + churn prediction
// Renders into view-clientintel
// ══════════════════════════════════════════════════════════════════════
const CLVDash = {
  _sort: 'revenue',

  async render() {
    const el = eid('view-clv'); if (!el) return;
    el.innerHTML = `<div style="padding:20px;max-width:1200px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <h2 style="color:#ec4899;margin:0;font-size:22px">👑 CLV Dashboard</h2>
        <span style="font-size:11px;background:#ec489915;color:#ec4899;padding:3px 10px;border-radius:99px;border:1px solid #ec489930;font-weight:700">LIFETIME VALUE</span>
      </div>
      <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px">Scopri chi sono davvero i tuoi clienti migliori. Modifica o elimina direttamente da qui.</p>
      <div id="clv-content"><div style="text-align:center;padding:40px"><div style="width:40px;height:40px;border:3px solid var(--border);border-top-color:#ec4899;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 12px"></div></div></div>
    </div>`;
    await this._load();
  },

  async _load() {
    const el = eid('clv-content'); if (!el) return;
    try {
      const [sales, clients] = await Promise.all([
        IDB.getAll('sales').catch(() => []),
        IDB.getAll('clients').catch(() => [])
      ]);
      const paid = sales.filter(s => s.status === 'pagato');

      // Build CLV map — track clientDbId for CRUD
      const map = {};
      paid.forEach(s => {
        const key = s.clientId || s.clientName || 'Sconosciuto';
        const name = s.clientName || s.clientId || 'Sconosciuto';
        if (!map[key]) map[key] = { key, name, revenue:0, orders:0, first:s.date, last:s.date, clientDbId: (+s.clientId||null) };
        map[key].revenue += (+s.amount || 0);
        map[key].orders++;
        if (s.date < map[key].first) map[key].first = s.date;
        if (s.date > map[key].last)  map[key].last  = s.date;
      });

      // Enrich with Clients DB records
      clients.forEach(c => {
        const k = String(c.id);
        if (map[k]) { map[k].email = c.email; map[k].phone = c.phone; map[k].city = c.city; map[k].clientDbId = c.id; }
      });

      const now = new Date();
      const clvList = Object.values(map).map(c => {
        const avgTicket    = c.revenue / c.orders;
        const daysSince1st = Math.max(1, (now - new Date(c.first)) / 86400000);
        const daysSinceLst = Math.max(0, (now - new Date(c.last))  / 86400000);
        const ordPerYear   = (c.orders / daysSince1st) * 365;
        const clv          = avgTicket * ordPerYear * 3;
        const churnRisk    = daysSinceLst > 180 ? 'alto' : daysSinceLst > 90 ? 'medio' : 'basso';
        const tier         = c.revenue > 1000 ? 'gold' : c.revenue > 300 ? 'silver' : 'bronze';
        return { ...c, avgTicket, daysSinceLst: Math.round(daysSinceLst), clv, churnRisk, tier };
      });

      if (!clvList.length) {
        el.innerHTML = '<div style="background:var(--bg-card);border-radius:12px;padding:48px;text-align:center;border:1px solid var(--border)"><div style="font-size:48px;margin-bottom:12px">👑</div><div style="font-size:15px;color:var(--text);margin-bottom:8px">Nessun cliente con vendite registrate</div><div style="font-size:13px;color:var(--text-muted)">Aggiungi vendite pagate nella sezione Vendite</div></div>';
        return;
      }

      const totalCLV  = clvList.reduce((a,c) => a+c.clv, 0);
      const topCliPct = clvList.slice(0, Math.ceil(clvList.length*.2)).reduce((a,c)=>a+c.revenue,0) / Math.max(1,clvList.reduce((a,c)=>a+c.revenue,0)) * 100;
      const atRisk    = clvList.filter(c => c.churnRisk !== 'basso');
      const fmt       = v => '€'+Math.round(v).toLocaleString('it-IT');

      const tierBadge  = t => ({gold:'<span style="background:#f59e0b20;color:#f59e0b;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700">👑 GOLD</span>',silver:'<span style="background:#94a3b820;color:#94a3b8;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700">🥈 SILVER</span>',bronze:'<span style="background:#92400e20;color:#b45309;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700">🥉 BRONZE</span>'}[t]||'');
      const churnBadge = r => ({alto:'<span style="background:#ef444420;color:#ef4444;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700">⚠️ ALTO</span>',medio:'<span style="background:#f59e0b20;color:#f59e0b;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700">~ MEDIO</span>',basso:'<span style="background:#22c55e20;color:#22c55e;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700">✓ BASSO</span>'}[r]||'');

      const sorted = [...clvList].sort((a,b)=>{
        if(this._sort==='clv')    return b.clv-a.clv;
        if(this._sort==='orders') return b.orders-a.orders;
        if(this._sort==='ticket') return b.avgTicket-a.avgTicket;
        if(this._sort==='last')   return (b.last||'').localeCompare(a.last||'');
        return b.revenue-a.revenue;
      });

      el.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px">
          ${[['👑','Clienti',clvList.length,'#ec4899'],['💰','Revenue',fmt(clvList.reduce((a,c)=>a+c.revenue,0)),'#22c55e'],['📈','CLV 3yr',fmt(totalCLV),'#a855f7'],['⚠️','A rischio churn',atRisk.length,atRisk.length>0?'#ef4444':'#22c55e'],['🏆','Top 20% genera',topCliPct.toFixed(0)+'%','#f59e0b']].map(([ic,lb,v,c])=>'<div style="background:var(--bg-card);border-radius:10px;padding:14px;border:1px solid var(--border);text-align:center"><div style="font-size:18px;margin-bottom:4px">'+ic+'</div><div style="font-size:20px;font-weight:800;color:'+c+'">'+v+'</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px">'+lb+'</div></div>').join('')}
        </div>

        ${atRisk.length ? '<div style="background:#ef444415;border:1.5px solid #ef444440;border-radius:12px;padding:14px 18px;margin-bottom:18px;display:flex;gap:12px;align-items:center"><span style="font-size:22px">⚠️</span><div style="flex:1"><div style="color:#ef4444;font-weight:700;font-size:13px">'+atRisk.length+' clienti non comprano da oltre 90 giorni</div><div style="color:#fca5a5;font-size:12px;margin-top:2px">'+atRisk.slice(0,3).map(c=>c.name).join(', ')+(atRisk.length>3?' e altri…':'')+'</div></div><button onclick="App.navigate(\'replyai\')" style="padding:8px 14px;background:#ef4444;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap">Genera Messaggio →</button></div>' : ''}

        <div style="background:var(--bg-card);border-radius:12px;border:1px solid var(--border);overflow:hidden">
          <div style="padding:12px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
            <div style="font-weight:700;color:var(--text);font-size:14px">👑 Classifica per Valore</div>
            <select onchange="if(typeof CLVDash!==typeof undefined){CLVDash._sort=this.value;CLVDash._load();}" style="padding:5px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;cursor:pointer">
              <option value="revenue" ${this._sort==='revenue'?'selected':''}>Revenue totale</option>
              <option value="clv"     ${this._sort==='clv'    ?'selected':''}>CLV proiettato</option>
              <option value="orders"  ${this._sort==='orders' ?'selected':''}>Ordini totali</option>
              <option value="ticket"  ${this._sort==='ticket' ?'selected':''}>Ticket medio</option>
              <option value="last"    ${this._sort==='last'   ?'selected':''}>Ultima data</option>
            </select>
          </div>
          <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:var(--bg-card2)">
              ${['#','Cliente','Tier','Revenue','Ordini','Ticket','CLV 3yr','Ultimo acq.','Churn','Azioni'].map(h=>'<th style="padding:8px 12px;text-align:left;font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;white-space:nowrap">'+h+'</th>').join('')}
            </tr></thead>
            <tbody>
              ${sorted.map((c,i)=>{
                const actEdit = c.clientDbId
                  ? '<button onclick="window.Clients&&window.Clients.openModal('+c.clientDbId+')" title="Modifica cliente" style="padding:5px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:11px"><i class=\\"fas fa-edit\\"></i></button>'
                  : '';
                const actDel = c.clientDbId
                  ? ('<button onclick="if(typeof CLVDash!==typeof undefined)CLVDash._del(' + c.clientDbId + ')" title="Elimina cliente" style="padding:5px 8px;background:var(--bg-card);border:1px solid #ef444440;border-radius:6px;color:#ef4444;cursor:pointer;font-size:11px"><i class=\"fas fa-trash\"></i></button>')
                  : '';                const actMsg = c.churnRisk!=='basso'
                  ? '<button onclick="App.navigate(\'replyai\')" title="Genera messaggio" style="padding:5px 8px;background:#ec489920;border:1px solid #ec489940;border-radius:6px;color:#ec4899;cursor:pointer;font-size:11px"><i class=\\"fas fa-envelope\\"></i></button>'
                  : '';
                return '<tr style="border-bottom:1px solid var(--border)'+(c.churnRisk==='alto'?';background:#ef444408':'')+'">'
                  +'<td style="padding:9px 12px;font-weight:700;color:var(--text-muted)">'+(i+1)+'</td>'
                  +'<td style="padding:9px 12px"><div style="font-weight:700;font-size:13px;color:var(--text)">'+c.name+'</div>'+(c.email?'<div style="font-size:11px;color:var(--text-muted)">'+c.email+'</div>':'')+'</td>'
                  +'<td style="padding:9px 12px">'+tierBadge(c.tier)+'</td>'
                  +'<td style="padding:9px 12px;font-weight:700;color:#22c55e">'+fmt(c.revenue)+'</td>'
                  +'<td style="padding:9px 12px;text-align:center">'+c.orders+'</td>'
                  +'<td style="padding:9px 12px">'+fmt(c.avgTicket)+'</td>'
                  +'<td style="padding:9px 12px;font-weight:600;color:#a855f7">'+fmt(c.clv)+'</td>'
                  +'<td style="padding:9px 12px;font-size:12px;color:var(--text-muted)">'+(c.last?new Date(c.last).toLocaleDateString('it-IT'):'—')+'<br><span style="font-size:10px">'+c.daysSinceLst+'g fa</span></td>'
                  +'<td style="padding:9px 12px">'+churnBadge(c.churnRisk)+'</td>'
                  +'<td style="padding:9px 12px"><div style="display:flex;gap:4px">'+actEdit+actDel+actMsg+'</div></td>'
                  +'</tr>';
              }).join('')}
            </tbody>
          </table>
          </div>
        </div>`;
    } catch(e) {
      el.innerHTML = '<div style="color:#ef4444;padding:20px">'+e.message+'</div>';
    }
  },

  async _del(clientId) {
    const cl = await IDB.get('clients', clientId).catch(()=>null);
    const nm = cl ? (cl.name||cl.fullName||'Cliente') : 'Cliente';
    if (!confirm('Eliminare "'+nm+'"?\nEliminata la scheda, NON le vendite.')) return;
    await IDB.del('clients', clientId)
    toast('Cliente eliminato','\ud83d\uddd1');
    await this._load();
  }
};

// ═══════════════════════════════════════════════════════════════════
// DEMAND PREDICTOR — Stagionalità + previsioni + alert riassortimento
// ═══════════════════════════════════════════════════════════════════
const DemandPredictor = {
  async analyze() {
    const sales = await AppStore.get('sales').catch(() => []);
    const catalog = await AppStore.get('catalog').catch(() => []);
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11

    // Build monthly revenue per product
    const byProduct = {};
    sales.filter(s => s.status === 'pagato').forEach(s => {
      const d = new Date(s.date || 0);
      const month = d.getMonth();
      const year = d.getFullYear();
      const pid = s.productId || s.product || 'generic';
      const pname = s.productName || s.product || 'Generico';
      if (!byProduct[pid]) byProduct[pid] = { name: pname, months: Array(12).fill(0), years: {} };
      byProduct[pid].months[month] += (+s.amount || 0);
      if (!byProduct[pid].years[year]) byProduct[pid].years[year] = Array(12).fill(0);
      byProduct[pid].years[year][month] += (+s.amount || 0);
    });

    // Also aggregate all sales together for overall trend
    const totalMonths = Array(12).fill(0);
    const monthNames = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    sales.filter(s => s.status === 'pagato').forEach(s => {
      const month = new Date(s.date || 0).getMonth();
      totalMonths[month] += (+s.amount || 0);
    });

    // Seasonal index: ratio of each month to average
    const avgMonth = totalMonths.reduce((a, v) => a + v, 0) / 12 || 1;
    const seasonalIndex = totalMonths.map(v => v / avgMonth);

    // Forecast next 3 months
    const forecasts = [];
    for (let i = 1; i <= 3; i++) {
      const m = (currentMonth + i) % 12;
      const idx = seasonalIndex[m];
      const baseRevenue = totalMonths[currentMonth] || avgMonth;
      const predicted = baseRevenue * idx;
      forecasts.push({
        month: monthNames[m],
        index: idx,
        predicted,
        isHigh: idx > 1.2,
        isLow: idx < 0.8,
      });
    }

    // Peak month
    const peakMonth = seasonalIndex.indexOf(Math.max(...seasonalIndex));
    const troughMonth = seasonalIndex.indexOf(Math.min(...seasonalIndex));

    // Top products by revenue
    const topProducts = Object.entries(byProduct)
      .map(([id, p]) => ({
        id, name: p.name,
        total: p.months.reduce((a, v) => a + v, 0),
        peakMonth: p.months.indexOf(Math.max(...p.months)),
        currentMonthRev: p.months[currentMonth],
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { forecasts, seasonalIndex, totalMonths, monthNames, peakMonth, troughMonth, topProducts, avgMonth };
  },

  async renderWidget() {
    // Returns a compact HTML widget for dashboard
    try {
      const data = await this.analyze();
      const { forecasts, peakMonth, monthNames, avgMonth } = data;
      if (avgMonth === 0) return '';
      const next = forecasts[0];
      const arrow = next.isHigh ? '🚀 +alto del solito' : next.isLow ? '📉 sotto la media' : '📊 nella media';
      return `<div style="background:var(--bg-card2);border-radius:var(--radius);padding:14px 16px;border:1px solid var(--border)">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">🔮 Domanda prevista</div>
        <div style="font-size:13px;font-weight:700;color:var(--text)">${next.month}: ${arrow}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Picco stagionale: <strong>${monthNames[peakMonth]}</strong></div>
        <div style="display:flex;gap:6px;margin-top:8px">${forecasts.map(f=>`<div style="flex:1;background:${f.isHigh?'var(--green)':f.isLow?'var(--orange)':'var(--border2)'};border-radius:6px;padding:5px;text-align:center"><div style="font-size:10px;color:${f.isHigh?'#000':f.isLow?'#000':'var(--text-muted)'}">${f.month}</div><div style="font-size:11px;font-weight:700;color:${f.isHigh?'#000':f.isLow?'#000':'var(--text)'}">${(f.index*100).toFixed(0)}%</div></div>`).join('')}</div>
      </div>`;
    } catch { return ''; }
  },
};

// ═══════════════════════════════════════════════════════════════════
// CLIENT LIFECYCLE ENGINE — Churn score + Next Best Action
// ═══════════════════════════════════════════════════════════════════
const SmartNotif = {
  _KEY: 'ingly_smart_notif_cfg',
  _HISTORY: 'ingly_notif_history',

  _defaults: {
    orderDeadline: { active: true, days: 2, label: 'Ordine in scadenza tra N giorni' },
    lowStock: { active: true, label: 'Materiale sotto scorta minima' },
    churnClient: { active: true, days: 60, label: 'Cliente non compra da N giorni' },
    forfettario: { active: true, pct: 80, label: 'Forfettario supera N% del limite' },
    unpaidSale: { active: true, days: 30, label: 'Vendita non pagata da N giorni' },
    pendingQuote: { active: true, days: 7, label: 'Preventivo senza risposta da N giorni' },
  },

  async checkOverdue() {
    try {
      const [orders, pipeline] = await Promise.all([AppStore.get('orders').catch(()=>[]), AppStore.get('pipeline').catch(()=>[])]);
      const all = [...orders, ...pipeline].filter((o,i,a)=>a.findIndex(x=>x.id===o.id)===i);
      const today = new Date().toISOString().slice(0,10);
      const soon  = new Date(Date.now()+48*3600*1000).toISOString().slice(0,10);
      const done  = ['paid','delivered','rejected','lost'];
      const over  = all.filter(o=>o.dueDate&&o.dueDate<today&&!done.includes(o.stage||o.status||''));
      const near  = all.filter(o=>o.dueDate&&o.dueDate>=today&&o.dueDate<=soon&&!done.includes(o.stage||o.status||''));
      if(!over.length&&!near.length) return;
      document.getElementById('deadline-alert-banner')?.remove();
      const b = document.createElement('div');
      b.id='deadline-alert-banner';
      b.style.cssText='position:fixed;top:54px;left:0;right:0;z-index:8000;pointer-events:none';
      let h='';
      if(over.length) h+=`<div style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:9px 20px;display:flex;align-items:center;gap:10px;pointer-events:all;font-size:13px"><i class="fas fa-exclamation-triangle"></i><span><b>${over.length} in ritardo:</b> ${over.slice(0,3).map(o=>o.name||'#'+o.id).join(', ')}${over.length>3?' +altri':''}</span><button onclick="App.navigate('pipeline')" style="margin-left:auto;padding:4px 12px;background:rgba(255,255,255,.25);border:1px solid rgba(255,255,255,.5);border-radius:6px;color:#fff;cursor:pointer;font-size:12px;font-weight:700">Pipeline →</button><button onclick="this.closest('#deadline-alert-banner').remove()" style="padding:4px 8px;background:rgba(255,255,255,.2);border:none;border-radius:6px;color:#fff;cursor:pointer">✕</button></div>`;
      if(near.length) h+=`<div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:8px 20px;display:flex;align-items:center;gap:10px;pointer-events:all;font-size:12px"><i class="fas fa-clock"></i><span><b>${near.length} scadenza 48h:</b> ${near.slice(0,3).map(o=>o.name||'#'+o.id).join(', ')}</span><button onclick="this.parentElement.remove()" style="margin-left:auto;padding:3px 8px;background:rgba(255,255,255,.2);border:none;border-radius:6px;color:#fff;cursor:pointer">✕</button></div>`;
      b.innerHTML=h; document.body.appendChild(b);
      setTimeout(()=>document.getElementById('deadline-alert-banner')?.remove(), 30000);
    } catch(e) {}
  },


  getCfg() {
    try { return { ...this._defaults, ...JSON.parse(localStorage.getItem(this._KEY)||'{}') }; }
    catch(_) { return { ...this._defaults }; }
  },

  saveCfg(cfg) { localStorage.setItem(this._KEY, JSON.stringify(cfg)); },

  getHistory() {
    try { return JSON.parse(localStorage.getItem(this._HISTORY)||'[]'); }
    catch(_) { return []; }
  },

  addHistory(notifs) {
    const h = this.getHistory();
    const today = new Date().toISOString().split('T')[0];
    notifs.forEach(n => h.unshift({ ...n, date: today, read: false }));
    localStorage.setItem(this._HISTORY, JSON.stringify(h.slice(0, 100)));
  },

  async scheduleChecks() {
    await this.check();
    this._updateTopbarBadge();
    setInterval(() => {
      this.check();
      this._updateTopbarBadge();
    }, 30 * 60 * 1000); // every 30min
  },

  _updateTopbarBadge() {
    try {
      const history = this.getHistory();
      const unread = history.filter(n => !n.read).length;
      const badge = document.getElementById('notif-count');
      if (badge) {
        badge.textContent = unread;
        badge.style.display = unread > 0 ? '' : 'none';
      }
      if (typeof Notifications !== 'undefined') Notifications.update();
    } catch (e) {}
  },

  markAllRead() {
    try {
      const h = this.getHistory().map(n => ({ ...n, read: true }));
      localStorage.setItem(this._HISTORY, JSON.stringify(h));
      this._updateTopbarBadge();
    } catch (e) {}
  },

  async check() {
    const cfg = this.getCfg();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const newNotifs = [];

    try {
      const [orders, materials, sales, quotes] = await Promise.all([
        IDB.getAll('orders').catch(()=>[]),
        IDB.getAll('materials').catch(()=>[]),
        IDB.getAll('sales').catch(()=>[]),
        IDB.getAll('quotes').catch(()=>[]),
      ]);

      // Order deadline
      if (cfg.orderDeadline?.active) {
        const threshold = new Date(now.getTime() + cfg.orderDeadline.days*24*3600*1000).toISOString().split('T')[0];
        orders.filter(o => o.status!=='delivered' && o.deadline && o.deadline<=threshold && o.deadline>=todayStr)
          .forEach(o => newNotifs.push({ type:'deadline', icon:'fa-clock', color:'#f59e0b', title:'Scadenza ordine', body:`"${o.title||o.clientName}" scade il ${new Date(o.deadline).toLocaleDateString('it-IT')}`, nav:'orders' }));
      }

      // Low stock — check both legacy 'materials' AND unified 'items' store
      if (cfg.lowStock?.active) {
        const allStockItems = [
          ...materials,
          ...(await AppStore.get('items').catch(()=>[])),
        ];
        // Deduplicate by name (items may overlap with materials during migration)
        const seen = new Set();
        allStockItems.filter(m => {
          if (!m.name || seen.has(m.name)) return false;
          seen.add(m.name);
          const s = +m.quantity || +m.qty || 0;
          const min = +m.minStock || +m.minQty || 0;
          return s <= 0 || (min > 0 && s <= min);
        }).forEach(m => newNotifs.push({
          type:'stock', icon:'fa-warehouse', color:'#f97316',
          title:'Scorte basse',
          body:`${m.name}: ${+m.quantity||+m.qty||0} ${m.unit||'pz'} rimasti (min: ${+m.minStock||+m.minQty||0})`,
          nav:'stockalert'
        }));
      }

      // Unpaid sales
      if (cfg.unpaidSale?.active) {
        const threshold = new Date(now.getTime() - cfg.unpaidSale.days*24*3600*1000).toISOString().split('T')[0];
        sales.filter(s => s.status==='da_pagare' && s.date && s.date<threshold)
          .forEach(s => newNotifs.push({ type:'unpaid', icon:'fa-euro-sign', color:'#ef4444', title:'Pagamento in ritardo', body:`${s.clientName||'Cliente'} — €${s.amount} da oltre ${cfg.unpaidSale.days}gg`, nav:'sales' }));
      }

      // Pending quotes
      if (cfg.pendingQuote?.active) {
        const threshold = new Date(now.getTime() - cfg.pendingQuote.days*24*3600*1000).toISOString().split('T')[0];
        quotes.filter(q => (q.status==='in_attesa'||q.status==='bozza') && q.date && q.date<threshold)
          .forEach(q => newNotifs.push({ type:'quote', icon:'fa-file-invoice', color:'#a855f7', title:'Preventivo senza risposta', body:`"${q.name}" — ${cfg.pendingQuote.days}+ giorni fa`, nav:'quoter' }));
      }

      // Forfettario
      if (cfg.forfettario?.active) {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearRev = sales.filter(s=>s.status==='pagato'&&new Date(s.date||0)>=yearStart).reduce((a,s)=>a+(+s.amount||0),0);
        const pct = yearRev/85000*100;
        if (pct >= cfg.forfettario.pct) {
          newNotifs.push({ type:'fiscal', icon:'fa-balance-scale', color:pct>=90?'#ef4444':'#f59e0b', title:'Regime forfettario', body:`Sei al ${pct.toFixed(0)}% del limite €85.000`, nav:'fiscal' });
        }
      }

      if (newNotifs.length) {
        this.addHistory(newNotifs);
        this._updateBadge(newNotifs.length);
      }
    } catch(_){}
  },

  _updateBadge(count) {
    // Try to update existing notification badge
    try {
      const badge = document.querySelector('[data-notif-badge]');
      if (badge) badge.textContent = count;
    } catch(_){}
  },

  render() {
    const el = eid('view-smartnotif'); if (!el) return;
    const cfg = this.getCfg();
    const history = this.getHistory();

    el.innerHTML = `<div style="padding:20px;max-width:900px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <h2 style="color:#f97316;margin:0;font-size:22px">🔔 Notifiche Smart</h2>
        <span style="font-size:11px;background:#f9731615;color:#f97316;padding:3px 10px;border-radius:99px;border:1px solid #f9731630;font-weight:700">CONFIGURABILI</span>
      </div>
      <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px">Alert automatici su scadenze, pagamenti, scorte e soglie fiscali</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <!-- SETTINGS -->
        <div>
          <div style="background:var(--bg-card);border-radius:12px;border:1px solid var(--border);overflow:hidden">
            <div style="padding:14px 18px;border-bottom:1px solid var(--border);font-weight:700;color:var(--text);font-size:14px">⚙️ Configurazione Alert</div>
            <div style="padding:16px 18px;display:flex;flex-direction:column;gap:12px">
              ${Object.entries(cfg).map(([key, c]) => `
                <div style="background:var(--bg-card2);border-radius:9px;padding:12px 14px;border:1px solid var(--border)">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${c.days||c.pct?'8px':'0'}">
                    <div style="font-size:13px;font-weight:600;color:var(--text)">${c.label}</div>
                    <label style="position:relative;display:inline-block;width:40px;height:22px;flex-shrink:0;cursor:pointer">
                      <input type="checkbox" ${c.active?'checked':''} onchange="SmartNotif._toggle('${key}',this.checked)" style="opacity:0;width:0;height:0">
                      <span style="position:absolute;inset:0;background:${c.active?'#22c55e':'var(--border)'};border-radius:22px;transition:.2s">
                        <span style="position:absolute;height:16px;width:16px;left:${c.active?'20px':'3px'};bottom:3px;background:#fff;border-radius:50%;transition:.2s"></span>
                      </span>
                    </label>
                  </div>
                  ${c.days ? `<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted)">
                    Soglia: <input type="number" value="${c.days}" min="1" max="365" onchange="SmartNotif._setDays('${key}',this.value)" style="width:60px;padding:3px 6px;background:var(--bg-card);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:12px"> giorni
                  </div>` : ''}
                  ${c.pct !== undefined ? `<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted)">
                    Soglia: <input type="number" value="${c.pct}" min="50" max="99" onchange="SmartNotif._setPct('${key}',this.value)" style="width:60px;padding:3px 6px;background:var(--bg-card);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:12px"> %
                  </div>` : ''}
                </div>
              `).join('')}
              <button onclick="SmartNotif.check().then(()=>(typeof SmartNotif!=='undefined'&&SmartNotif.render()))" style="padding:10px;background:#f97316;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px">🔍 Controlla Ora</button>
            </div>
          </div>
        </div>

        <!-- HISTORY -->
        <div>
          <div style="background:var(--bg-card);border-radius:12px;border:1px solid var(--border);overflow:hidden">
            <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
              <div style="font-weight:700;color:var(--text);font-size:14px">📋 Storico Alert (${history.length})</div>
              <button onclick="localStorage.removeItem(SmartNotif._HISTORY);(typeof SmartNotif!=='undefined'&&SmartNotif.render())" style="padding:4px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:5px;color:var(--text-muted);cursor:pointer;font-size:11px">Svuota</button>
            </div>
            <div style="max-height:500px;overflow-y:auto">
              ${history.length === 0 ? `<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">Nessun alert ancora.<br>Premi "Controlla Ora" per generarli.</div>` :
              history.slice(0,30).map(n=>`<div style="padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer" ${n.nav?`onclick="App.navigate('${n.nav}')"`:''}
                onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background='transparent'">
                <div style="display:flex;gap:10px;align-items:flex-start">
                  <div style="width:28px;height:28px;border-radius:7px;background:${n.color}20;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">
                    <i class="fas ${n.icon}" style="color:${n.color};font-size:11px"></i>
                  </div>
                  <div style="flex:1">
                    <div style="font-size:12px;font-weight:700;color:var(--text)">${n.title}</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${n.body}</div>
                    <div style="font-size:10px;color:var(--text-muted);margin-top:3px">${n.date||''}</div>
                  </div>
                </div>
              </div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  _toggle(key, val) {
    const cfg = this.getCfg(); cfg[key].active = val; this.saveCfg(cfg);
  },
  _setDays(key, val) {
    const cfg = this.getCfg(); cfg[key].days = parseInt(val); this.saveCfg(cfg);
  },
  _setPct(key, val) {
    const cfg = this.getCfg(); cfg[key].pct = parseInt(val); this.saveCfg(cfg);
  }
};

// ═══════════════════════════════════════════════════════════════════
// MONTHLY REPORT — Report PDF mensile automatico
// ═══════════════════════════════════════════════════════════════════
const VoiceInput={
  _recog:null,_listening:false,
  open(){
    const ov=document.getElementById('voice-overlay');
    if(ov){ov.style.display='flex';}
    document.getElementById('voice-transcript').textContent='';
    document.getElementById('voice-result').textContent='';
    document.getElementById('voice-status').textContent='Premi il microfono e parla';
    document.getElementById('voice-icon').textContent='🎙️';
  },
  close(){this.stop();const ov=document.getElementById('voice-overlay');if(ov)ov.style.display='none';},
  toggle(){if(this._listening)this.stop();else this.start();},
  start(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){toast('Microfono non supportato su questo browser (usa Chrome/Edge)','warning');return;}
    this._recog=new SR();
    this._recog.lang='it-IT';this._recog.continuous=false;this._recog.interimResults=true;
    this._recog.onstart=()=>{
      this._listening=true;
      const btn=document.getElementById('voice-btn');
      if(btn){btn.textContent='⏹️';btn.style.background='linear-gradient(135deg,#ef4444,#dc2626)';}
      document.getElementById('voice-status').textContent='🔴 Sto ascoltando...';
      document.getElementById('voice-icon').textContent='🔴';
    };
    this._recog.onresult=(e)=>{
      const t=Array.from(e.results).map(r=>r[0].transcript).join('');
      document.getElementById('voice-transcript').textContent=t;
      if(e.results[e.results.length-1].isFinal)this._processCommand(t);
    };
    this._recog.onend=()=>this.stop();
    this._recog.onerror=(e)=>{
      document.getElementById('voice-status').textContent='❌ Errore: '+e.error;
      this.stop();
    };
    this._recog.start();
  },
  stop(){
    this._listening=false;this._recog?.stop();
    const btn=document.getElementById('voice-btn');
    if(btn){btn.textContent='🎙️';btn.style.background='linear-gradient(135deg,#6366f1,#8b5cf6)';}
    const st=document.getElementById('voice-status');
    if(st)st.textContent='Premi il microfono e parla';
    const ic=document.getElementById('voice-icon');
    if(ic)ic.textContent='🎙️';
  },
  async _processCommand(text){
    const t=text.toLowerCase().trim();
    document.getElementById('voice-status').textContent='🤖 Elaborazione...';
    // vendita N prodotto a X euro
    const sale=t.match(/vendita?\s+(\d+)\s+(.+?)\s+a\s+(\d+(?:[.,]\d+)?)\s*euro/i);
    if(sale){
      const qty=+sale[1],desc=sale[2].trim(),price=parseFloat(sale[3].replace(',','.'));
      const amount=+(qty*price).toFixed(2);
      await IDB.put('sales',{date:new Date().toISOString().split('T')[0],desc:`${qty}× ${desc}`,amount,status:'da_pagare',channel:'Voice'});
      document.getElementById('voice-result').textContent=`✅ Vendita: ${qty}× ${desc} = ${fmtCur(amount)}`;
      toast(`💰 Vendita registrata: ${desc} × ${qty} = ${fmtCur(amount)}`,'✅');
      return;
    }
    // spesa X euro di Y
    const exp=t.match(/(?:spesa|acquisto|pagato?)\s+(\d+(?:[.,]\d+)?)\s*euro\s+(?:di|per)?\s+(.+)/i);
    if(exp){
      const amount=parseFloat(exp[1].replace(',','.')),desc=exp[2].trim();
      await IDB.put('cashflow',{type:'uscita',category:'Materiali',desc,amount,date:new Date().toISOString().split('T')[0]});
      document.getElementById('voice-result').textContent=`✅ Spesa: ${desc} = ${fmtCur(amount)}`;
      toast(`📉 Spesa registrata: ${fmtCur(amount)} per ${desc}`,'✅');
      return;
    }
    // AI fallback
    try{
      const prompt=`Comando vocale: "${text}"\nInterpreta in JSON: {"action":"sale|expense|unknown","desc":"...","amount":0,"qty":1}. Solo JSON.`;
      const res=await AIProvider.call(prompt,150);
      const data=JSON.parse(res.replace(/```json?|```/g,'').trim());
      if(data.action==='sale'&&data.amount>0){
        await IDB.put('sales',{date:new Date().toISOString().split('T')[0],desc:data.desc,amount:data.amount,status:'da_pagare',channel:'Voice'});
        document.getElementById('voice-result').textContent=`✅ AI: ${data.desc} — ${fmtCur(data.amount)}`;
        toast('💰 Vendita registrata via AI','success');
      }else{
        document.getElementById('voice-result').textContent='💡 Prova: "Vendita 3 portachiavi a 12 euro"';
      }
    }catch(e){
      document.getElementById('voice-result').textContent='💡 Prova: "Vendita 3 portachiavi a 12 euro" · "Spesa 50 euro di legno"';
    }
  },
};

// ══════════════════════════════════════════════════════════════════
// GROQ/AI KEY HINT — banner when no key configured
// ══════════════════════════════════════════════════════════════════
// ── AI DEMO MODE ──────────────────────────────────────────────────
const AIDemoMode={
  _short(p){
    p=(typeof p==='string'?p:JSON.stringify(p)).toLowerCase();
    if(p.includes('mission')||p.includes('product'))return 'Artigiano digitale specializzato in laser cutting e incisione su legno, plexiglass e materiali compositi.';
    if(p.includes('client')||p.includes('opportunit'))return 'Cliente VIP: Mario Rossi (€2.400 LTV). Opportunità: preventivo scaduto +3 follow-up non inviati. Azione consigliata: chiamata entro 48h.';
    if(p.includes('brief')||p.includes('today')||p.includes('oggi'))return '📊 Revenue oggi: €340. 3 ordini aperti. 1 preventivo in scadenza. Opportunità: Mario Rossi non risponde da 7 giorni — contattalo.';
    if(p.includes('stock')||p.includes('material'))return '⚠️ Legno MDF 6mm: 2 fogli rimasti (min 5). Plexiglass trasparente: OK. Consiglio: ordina MDF entro domani.';
    if(p.includes('price')||p.includes('margin'))return 'Margine medio prodotti: 42%. Portachiavi laser: 68% ✅. Targa personalizzata: 18% ⚠️ — rivedi il prezzo (+15% consigliato).';
    if(p.includes('market')||p.includes('competitor'))return 'Trend Etsy: +23% prodotti laser incisi. Competitor principale abbassa prezzi del 10% — mantieni differenziazione su qualità materiali.';
    if(p.includes('social')||p.includes('content'))return 'Post ottimale: Martedì 18:00-20:00. Formato: Reel prima/dopo lavorazione. Caption: mostra il processo artigianale.';
    if(p.includes('forecast')||p.includes('prevision'))return 'Revenue stimato prossimi 30gg: €3.200 (+12% vs mese scorso). Alta stagionalità: prepara stock natalizio.';
    if(p.includes('etsy')||p.includes('seo'))return 'Tag consigliati: "laser engraving", "personalized wood gift", "custom keychain Italy". Title ottimale: 140 caratteri con keyword principale all inizio.';
    if(p.includes('coach')||p.includes('grow'))return 'Focus questa settimana: (1) Manda 5 follow-up preventivi scaduti. (2) Aumenta prezzo targhe del 10%. (3) Posta 2 Reel process video.';
    return "Analisi completata. Dati insufficienti per una raccomandazione precisa — aggiungi vendite e ordini per attivare l'AI predittiva.";
  },
  get(prompt){ return this._short(prompt); },
  analyze(prompt){ return this._short(prompt); },
  suggest(prompt){ return this._short(prompt); }
};

const AIStudio = {
  // Usa AIProvider (sistema AI centrale di INGLY — supporta Groq, Gemini, OpenRouter, Anthropic)
  async _callAI(prompt) {
    if (typeof AIProvider === 'undefined') {
      toast('Sistema AI non disponibile. Ricarica la pagina.','warning'); 
      throw new Error('AIProvider not found');
    }
    try {
      const result = await AIProvider.call(prompt, 1200);
      return result;
    } catch(e) {
      if (e.message === 'NO_KEY' || e.message?.includes('NO_') || e.message?.includes('key')) {
        toast('Configura un provider AI in Impostazioni → 🤖 AI Provider','warning');
      } else {
        toast('Errore AI: ' + e.message, 'warning');
      }
      throw e;
    }
  },

  _showLoading(resultId) {
    const el = eid(resultId);
    if (el) { el.style.display='block'; el.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted)">✨ Generazione in corso...</div>'; }
  },

  async generateDescription() {
    const name = eid('ai-prod-name')?.value?.trim();
    const details = eid('ai-prod-details')?.value?.trim();
    const platform = eid('ai-prod-platform')?.value || 'etsy';
    const tone = eid('ai-prod-tone')?.value || 'professionale';
    if (!name) { toast('Inserisci il nome del prodotto','warning'); return; }
    this._showLoading('ai-desc-result');
    try {
      const prompt = `Sei un esperto copywriter per artigiani italiani. 
Crea una descrizione prodotto ${tone} per "${name}" (${details || 'prodotto artigianale'}).
Piattaforma: ${platform}.
${platform === 'etsy' || platform === 'both' ? '--- ETSY ---\nTitolo SEO (max 140 caratteri)\nDescrizione lunga con bullet points, include: materiali, dimensioni, personalizzazione, spedizione, cura\n' : ''}
${platform === 'instagram' || platform === 'both' ? '--- INSTAGRAM ---\nCaption coinvolgente con emoji, max 2200 caratteri, call-to-action finale\n30 hashtag pertinenti\n' : ''}
Lingua: italiano. Tono: ${tone}. Brand: Ingly Design, Made in Sicily.`;
      const result = await this._callAI(prompt);
      const el = eid('ai-desc-result');
      if (el) {
        el.style.display = 'block';
        el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:11px;color:var(--text-muted)">Risultato</span>
          <button class="btn btn-secondary btn-sm" onclick="AIStudio.copyResult('ai-desc-text')">📋 Copia</button>
        </div>
        <div id="ai-desc-text-studio" style="background:var(--bg-card2);border-radius:8px;padding:12px;font-size:12px;line-height:1.6;white-space:pre-wrap;max-height:300px;overflow-y:auto">${result.replace(/</g,'&lt;')}</div>`;
      }
    } catch(e) { toast('Errore AI: '+e.message,'warning'); }
  },

  async generateReply() {
    const msg = eid('ai-client-msg')?.value?.trim();
    const channel = eid('ai-reply-channel')?.value || 'whatsapp';
    const type = eid('ai-reply-type')?.value || 'info';
    if (!msg) { toast('Incolla il messaggio del cliente','warning'); return; }
    this._showLoading('ai-reply-result');
    try {
      const prompt = `Sei il team di Ingly Design, artigiani siciliani che creano targhe e decori personalizzati in acrilico e legno laser.
Rispondi a questo messaggio di un cliente su ${channel}:

"${msg}"

Tipo di risposta: ${type}
Canale: ${channel} (${channel==='whatsapp'?'informale, usa emoji':'professionale'})
Tono: caldo, professionale, entusiasta del lavoro artigianale
NON inventare prezzi specifici — usa "contattaci per un preventivo personalizzato"
Lingua: italiano
Lunghezza: adatta al canale (WhatsApp/Instagram: breve; email: più dettagliata)`;
      const result = await this._callAI(prompt);
      const el = eid('ai-reply-result');
      if (el) {
        el.style.display = 'block';
        el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:11px;color:var(--text-muted)">Risposta pronta</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-secondary btn-sm" onclick="AIStudio.copyResult('ai-reply-text')">📋 Copia</button>
            <button class="btn btn-sm" style="background:#25D366;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer" onclick="AIStudio.sendWhatsApp()">WhatsApp</button>
          </div>
        </div>
        <div id="ai-reply-text-studio" style="background:var(--bg-card2);border-radius:8px;padding:12px;font-size:12px;line-height:1.6;white-space:pre-wrap;max-height:220px;overflow-y:auto">${result.replace(/</g,'&lt;')}</div>`;
      }
    } catch(e) { toast('Errore AI: '+e.message,'warning'); }
  },

  async generateNames() {
    const input = eid('ai-naming-input')?.value?.trim();
    const lang = eid('ai-naming-lang')?.value || 'italiano';
    const style = eid('ai-naming-style')?.value || 'poetico';
    if (!input) { toast('Descrivi il prodotto','warning'); return; }
    const resultEl = eid('ai-names-result');
    const listEl = eid('ai-names-list');
    if (listEl) listEl.innerHTML = '✨ Generazione...';
    if (resultEl) resultEl.style.display = 'block';
    try {
      const prompt = `Sei un esperto di naming per brand artigianali italiani.
Crea 10 nomi originali per questo prodotto: "${input}"
Lingua: ${lang}
Stile: ${style}
Formato: lista numerata 1-10, ogni nome su una riga, con una riga di spiegazione breve sotto
Rendi i nomi evocativi, memorabili, adatti a Etsy e Instagram.`;
      const result = await this._callAI(prompt);
      if (listEl) listEl.innerHTML = result.replace(/\n/g,'<br>').replace(/</g,'&lt;').replace(/&lt;br>/g,'<br>');
    } catch(e) { toast('Errore AI: '+e.message,'warning'); }
  },

  async generateCopy() {
    const type = eid('ai-copy-type')?.value || 'bio_instagram';
    const info = eid('ai-copy-info')?.value?.trim();
    if (!info) { toast('Inserisci le informazioni su di te','warning'); return; }
    this._showLoading('ai-copy-result');
    const typeLabels = {
      bio_instagram: 'Bio Instagram (max 150 caratteri, con emoji, include link)',
      about_etsy: 'About Etsy Shop (testo lungo, racconta la storia, include parole chiave SEO)',
      email_promo: 'Email promozionale (oggetto accattivante + corpo email con offerta)',
      caption: 'Caption Instagram (coinvolgente, con emoji, call-to-action, max 300 caratteri)',
      hashtags: '30 hashtag ottimizzati (mix di popolari e nicchia, divisi per categoria)',
    };
    try {
      const prompt = `Sei un copywriter esperto per artigiani italiani.
Crea: ${typeLabels[type]}
Informazioni fornite: "${info}"
Brand: Ingly Design, Made in Sicily 🇮🇹
Lingua: italiano
Tono: caldo, autentico, artigianale ma moderno`;
      const result = await this._callAI(prompt);
      const el = eid('ai-copy-result');
      if (el) {
        el.style.display = 'block';
        el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:11px;color:var(--text-muted)">Testo generato</span>
          <button class="btn btn-secondary btn-sm" onclick="AIStudio.copyResult('ai-copy-text')">📋 Copia</button>
        </div>
        <div id="ai-copy-text-studio" style="background:var(--bg-card2);border-radius:8px;padding:12px;font-size:12px;line-height:1.6;white-space:pre-wrap;max-height:250px;overflow-y:auto">${result.replace(/</g,'&lt;')}</div>`;
      }
    } catch(e) { toast('Errore AI: '+e.message,'warning'); }
  },

  copyResult(id) {
    const el = eid(id);
    if (!el) return;
    const text = el.innerText || el.textContent;
    navigator.clipboard.writeText(text).then(() => toast('Copiato negli appunti!','success'));
  },

  sendWhatsApp() {
    const el = eid('ai-reply-text');
    if (!el) return;
    const text = encodeURIComponent(el.innerText || el.textContent);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  },
};

// ══════════════════════════════════════════════════════════════════
// SOCIAL STUDIO — Content Calendar & Post Planner
// ══════════════════════════════════════════════════════════════════
const DesignStudio = {
  _themes: {
    dark_cyan:   { primary:'#54F2F4', bg:'#0a0f1a', card:'#151c2c', card2:'#1a2436', border:'#1e2d4a', text:'#e2e8f0', textMuted:'#94a3b8' },
    dark_purple: { primary:'#9b59b6', bg:'#0f0a1a', card:'#1a0f2e', card2:'#220f3a', border:'#2d1a4a', text:'#e2e8f0', textMuted:'#94a3b8' },
    dark_gold:   { primary:'#f39c12', bg:'#1a1200', card:'#2a1e00', card2:'#3a2a00', border:'#4a3500', text:'#e2e8f0', textMuted:'#a0916b' },
    dark_rose:   { primary:'#e91e8c', bg:'#1a0a10', card:'#2a0a1a', card2:'#3a0a22', border:'#4a1a30', text:'#e2e8f0', textMuted:'#94a3b8' },
    dark_green:  { primary:'#22c55e', bg:'#0a1a10', card:'#0f2a18', card2:'#143520', border:'#1a4a28', text:'#e2e8f0', textMuted:'#86efac' },
    light:       { primary:'#2563eb', bg:'#f8fafc', card:'#ffffff', card2:'#f1f5f9', border:'#e2e8f0', text:'#1e293b', textMuted:'#64748b' },
  },

  applyTheme(name) {
    const t = this._themes[name];
    if (!t) return;
    Object.entries(t).forEach(([k,v]) => {
      const cssVar = '--' + k.replace(/([A-Z])/g, '-$1').toLowerCase();
      document.documentElement.style.setProperty(cssVar, v);
    });
    document.documentElement.style.setProperty('--primary', t.primary);
    document.documentElement.style.setProperty('--bg', t.bg);
    document.documentElement.style.setProperty('--bg-card', t.card);
    document.documentElement.style.setProperty('--bg-card2', t.card2);
    document.documentElement.style.setProperty('--border', t.border);
    document.documentElement.style.setProperty('--text', t.text);
    document.documentElement.style.setProperty('--text-muted', t.textMuted);
    localStorage.setItem('ingly_theme', JSON.stringify({name, ...t}));
    this._updatePreview(t);
    toast(`Tema ${name.replace('_','success')} applicato!`,'🎨');
    // Update color pickers
    if (eid('ds-primary-color')) eid('ds-primary-color').value = t.primary;
    if (eid('ds-primary-hex')) eid('ds-primary-hex').value = t.primary;
    if (eid('ds-bg-color')) eid('ds-bg-color').value = t.bg;
    if (eid('ds-bg-hex')) eid('ds-bg-hex').value = t.bg;
  },

  previewColor(value, type) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) return;
    const map = { primary:'--primary', bg:'--bg', card:'--bg-card' };
    if (map[type]) document.documentElement.style.setProperty(map[type], value);
    // Sync inputs
    if (type === 'primary') {
      if (eid('ds-primary-color')) eid('ds-primary-color').value = value;
      if (eid('ds-primary-hex')) eid('ds-primary-hex').value = value;
    }
  },

  applyCustom() {
    const primary = eid('ds-primary-hex')?.value || '#54F2F4';
    const bg = eid('ds-bg-hex')?.value || '#0a0f1a';
    const card = eid('ds-card-hex')?.value || '#151c2c';
    const brandName = eid('ds-brand-name')?.value?.trim();
    document.documentElement.style.setProperty('--primary', primary);
    document.documentElement.style.setProperty('--bg', bg);
    document.documentElement.style.setProperty('--bg-card', card);
    localStorage.setItem('ingly_theme_custom', JSON.stringify({primary, bg, card}));
    if (brandName) {
      const brandEls = document.querySelectorAll('[data-brand]');
      brandEls.forEach(el => el.textContent = brandName);
      localStorage.setItem('ingly_brand_name', brandName);
    }
    toast('Tema custom applicato!','success');
  },

  uploadLogo(input) {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target.result;
      localStorage.setItem('ingly_logo', src);
      const preview = eid('ds-logo-preview');
      const img = eid('ds-logo-img');
      if (preview) preview.style.display = 'block';
      if (img) img.src = src;
      // Apply logo to app header if it exists
      const logoEls = document.querySelectorAll('[data-logo]');
      logoEls.forEach(el => { el.src = src; el.style.display='block'; });
      toast('Logo caricato!','success');
    };
    reader.readAsDataURL(file);
  },

  reset() {
    this.applyTheme('dark_cyan');
    localStorage.removeItem('ingly_theme_custom');
    toast('Tema ripristinato','success');
  },

  _updatePreview(t) {
    const previewBrand = eid('ds-preview-brand');
    if (previewBrand) previewBrand.style.color = t.primary;
  },

  save() {
    toast('Tema salvato — si applica ad ogni avvio','success');
  },

  loadSaved() {
    // Called on App.init() — restore saved theme
    const custom = localStorage.getItem('ingly_theme_custom');
    if (custom) {
      try {
        const t = JSON.parse(custom);
        if (t.primary) document.documentElement.style.setProperty('--primary', t.primary);
        if (t.bg) document.documentElement.style.setProperty('--bg', t.bg);
        if (t.card) document.documentElement.style.setProperty('--bg-card', t.card);
      } catch {}
    }
    const savedTheme = localStorage.getItem('ingly_theme');
    if (savedTheme && !custom) {
      try { this.applyTheme(JSON.parse(savedTheme).name); } catch {}
    }
    // Restore logo
    const logo = localStorage.getItem('ingly_logo');
    if (logo) {
      document.querySelectorAll('[data-logo]').forEach(el => { el.src = logo; el.style.display='block'; });
    }
  },
};

// ── Hook into App.navigate for new sections ──────────────────────
(function() {
  const _origNavigate = App.navigate.bind(App);
  App.navigate = function(section) {
    _origNavigate(section);
    if (section === 'studio_ai') { /* AI Studio loaded statically */ }
    if (section === 'social') SocialStudio.load();
    if (section === 'web_presence') WebPresence.init();
    if (section === 'produzione') Produzione.load();
    if (section === 'design_studio') { /* Design Studio loaded statically */ }
  };

  // Init on app load
  const _origInit = App.init.bind(App);
  App.init = async function() {
    await _origInit();
    DesignStudio.loadSaved();
  };
})();


// ══════════════════════════════════════════════════════════════════
// AI BUSINESS OS v54 — DataLayer · DecisionEngine · OpportunityScanner · IntelHub
// Architecture: 4-layer BI · RFM · BCG · P&L · Forecast · Funnel
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// DATA LAYER v54
// Unified relational aggregator — connects all 10 IDB stores
// Runs once, caches 60s, feeds all intelligence modules
// ══════════════════════════════════════════════════════════════════════════════
const DataLayer = {
  _cache: null,
  _cacheTime: 0,
  TTL: 60000,

  async fetch(force) {
    if (!force && this._cache && Date.now() - this._cacheTime < this.TTL) return this._cache;

    const [sales, quotes, clients, orders, catalog, materials,
      cashflow, fixedCosts, inventory, campaigns] = await Promise.all([
      IDB.getAll('sales').catch(() => []),
      IDB.getAll('quotes').catch(() => []),
      IDB.getAll('clients').catch(() => []),
      IDB.getAll('orders').catch(() => []),
      IDB.getAll('catalog').catch(() => []),
      IDB.getAll('materials').catch(() => []),
      IDB.getAll('cashflow').catch(() => []),
      IDB.getAll('fixed_costs').catch(() => []),
      IDB.getAll('inventory').catch(() => []),
      IDB.getAll('marketing_campaigns').catch(() => []),
    ]);

    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const last12 = Array.from({ length: 12 }, (_, i) =>
      new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 7)
    );

    // ── Revenue ──────────────────────────────────────────────────────────────
    const paid = sales.filter(s => ['pagato', 'paid', 'completato'].includes(s.status));
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + (now.getDay()===0?-6:1)); const weekStr = weekStart.toISOString().slice(0,10);
    const weekRev = paid.filter(s => (s.date||'') >= weekStr).reduce((a,s) => a + (+s.amount||0), 0);
    const mRev = paid.filter(s => s.date?.slice(0, 7) === thisMonth).reduce((a, s) => a + (+s.amount || 0), 0);
    const lRev = paid.filter(s => s.date?.slice(0, 7) === lastMonth).reduce((a, s) => a + (+s.amount || 0), 0);
    const yRev = paid.filter(s => s.date?.startsWith(String(now.getFullYear()))).reduce((a, s) => a + (+s.amount || 0), 0);
    const revByMonth = {};
    last12.forEach(m => { revByMonth[m] = paid.filter(s => s.date?.slice(0, 7) === m).reduce((a, s) => a + (+s.amount || 0), 0); });
    const revsArr = last12.slice().reverse().map(m => revByMonth[m] || 0);
    const momGrowth = lRev > 0 ? +((mRev - lRev) / lRev * 100).toFixed(1) : null;

    // ── Costs ─────────────────────────────────────────────────────────────────
    const mFixed = fixedCosts.reduce((a, f) => a + (+f.monthly || +f.amount || 0), 0);
    const mVar = cashflow.filter(c => (c.type === 'expense' || c.amount < 0) && c.date?.slice(0, 7) === thisMonth)
      .reduce((a, c) => a + Math.abs(+c.amount || 0), 0);
    const mCosts = mFixed + mVar;
    const netProfit = mRev - mCosts;
    const netMarginPct = mRev > 0 ? +((netProfit / mRev) * 100).toFixed(1) : 0;

    // ── Break-even ───────────────────────────────────────────────────────────
    const catWithMargin = catalog.map(p => {
      const price = +p.price || 0;
      const cost = +p.cost || +p.materialCost || 0;
      const margin = price > 0 ? ((price - cost) / price * 100) : null;
      return { ...p, price, cost, margin };
    });
    const marginsArr = catWithMargin.filter(p => p.margin !== null);
    const avgMarginPct = marginsArr.length ? marginsArr.reduce((a, p) => a + p.margin, 0) / marginsArr.length : 60;
    const breakEven = avgMarginPct > 0 ? mFixed / (avgMarginPct / 100) : 0;

    // ── Tax & runway ──────────────────────────────────────────────────────────
    const taxReserve = Math.round(yRev * 0.15);
    const totalCashIn = cashflow.filter(c => c.type === 'income' || c.amount > 0).reduce((a, c) => a + (+c.amount || 0), 0);
    const totalCashOut = cashflow.filter(c => c.type === 'expense' || c.amount < 0).reduce((a, c) => a + Math.abs(+c.amount || 0), 0);
    const cashBalance = totalCashIn - totalCashOut;
    const cashRunway = mCosts > 0 ? Math.floor(cashBalance / mCosts) : null;

    // ── Quotes conversion ────────────────────────────────────────────────────
    const sentQ = quotes.filter(q => ['inviato', 'sent'].includes(q.status));
    const wonQ = quotes.filter(q => ['accettato', 'won', 'chiuso'].includes(q.status));
    const convRate = (sentQ.length + wonQ.length) > 0
      ? +((wonQ.length / (sentQ.length + wonQ.length)) * 100).toFixed(1) : 0;

    // ── Client analytics ──────────────────────────────────────────────────────
    const cRevMap = {}, cCountMap = {}, cLastMap = {};
    paid.forEach(s => {
      const k = s.clientId || s.client || s.clientName;
      if (k) {
        cRevMap[k] = (cRevMap[k] || 0) + (+s.amount || 0);
        cCountMap[k] = (cCountMap[k] || 0) + 1;
        if (!cLastMap[k] || s.date > cLastMap[k]) cLastMap[k] = s.date;
      }
    });

    const enrichedClients = clients.map(c => {
      const k = c.id || c.name;
      const k2 = c.name || c.id;
      const ltv = cRevMap[k] || cRevMap[k2] || 0;
      const orderCount = cCountMap[k] || cCountMap[k2] || 0;
      const lastOrder = cLastMap[k] || cLastMap[k2] || null;
      const daysSince = lastOrder ? Math.floor((Date.now() - new Date(lastOrder)) / 86400000) : 999;
      return { ...c, ltv, orderCount, lastOrder, daysSince };
    });

    const topClients = [...enrichedClients].sort((a, b) => b.ltv - a.ltv).slice(0, 10);
    const avgLTV = enrichedClients.filter(c => c.ltv > 0).reduce((a, c) => a + c.ltv, 0) / (enrichedClients.filter(c => c.ltv > 0).length || 1);
    const churnRisk = enrichedClients.filter(c => c.daysSince > 60 && c.orderCount >= 2);
    const repeatClients = enrichedClients.filter(c => c.orderCount >= 2);
    const avgOrderValue = paid.length > 0 ? paid.reduce((a, s) => a + (+s.amount || 0), 0) / paid.length : 0;

    // ── RFM scoring ───────────────────────────────────────────────────────────
    const rfm = { champions: [], loyal: [], atRisk: [], lost: [], newbie: [] };
    enrichedClients.filter(c => c.ltv > 0).forEach(c => {
      const r = c.daysSince < 30 ? 5 : c.daysSince < 60 ? 4 : c.daysSince < 90 ? 3 : c.daysSince < 180 ? 2 : 1;
      const f = c.orderCount >= 5 ? 5 : c.orderCount >= 3 ? 4 : c.orderCount >= 2 ? 3 : c.orderCount >= 1 ? 2 : 1;
      const m = c.ltv > 500 ? 5 : c.ltv > 200 ? 4 : c.ltv > 100 ? 3 : c.ltv > 50 ? 2 : 1;
      const score = (r + f + m) / 3;
      if (score >= 4) rfm.champions.push(c);
      else if (score >= 3.5 || f >= 4) rfm.loyal.push(c);
      else if (r <= 2 && f >= 2) rfm.atRisk.push(c);
      else if (r === 1 && f <= 2) rfm.lost.push(c);
      else rfm.newbie.push(c);
    });

    // ── Product performance ───────────────────────────────────────────────────
    const prodSalesMap = {};
    paid.forEach(s => {
      const k = s.productId || s.product || s.title || s.description;
      if (k) {
        if (!prodSalesMap[k]) prodSalesMap[k] = { name: k, revenue: 0, count: 0 };
        prodSalesMap[k].revenue += (+s.amount || 0);
        prodSalesMap[k].count++;
      }
    });
    const productPerf = Object.values(prodSalesMap).sort((a, b) => b.revenue - a.revenue);
    const catEnriched = catWithMargin.map(p => {
      const key = p.name || p.id;
      const ps = prodSalesMap[key];
      return { ...p, salesRevenue: ps?.revenue || 0, salesCount: ps?.count || 0 };
    });

    // ── Linear regression forecast ────────────────────────────────────────────
    const n = revsArr.length;
    const sumX = n * (n - 1) / 2;
    const sumY = revsArr.reduce((a, v) => a + v, 0);
    const sumXY = revsArr.reduce((a, v, i) => a + i * v, 0);
    const sumX2 = revsArr.reduce((a, _, i) => a + i * i, 0);
    const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
    const intercept = (sumY - slope * sumX) / n;
    const forecast = [1, 2, 3].map(i => Math.max(0, Math.round(intercept + slope * (n + i))));

    // ── Open orders ───────────────────────────────────────────────────────────
    const openOrders = orders.filter(o => !['delivered', 'consegnato'].includes(o.status));
    const overdueOrders = openOrders.filter(o => o.dueDate && new Date(o.dueDate) < now);

    this._cache = {
      now, thisMonth, lastMonth, last12,
      // revenue
      paid, mRev, lRev, yRev, revByMonth, revsArr, momGrowth,
      // costs / profit
      mFixed, mVar, mCosts, netProfit, netMarginPct,
      // financial
      avgMarginPct, breakEven, taxReserve, cashBalance, cashRunway,
      // quotes
      quotes, sentQ, wonQ, convRate,
      // clients
      clients, enrichedClients, topClients, avgLTV, churnRisk,
      repeatClients, avgOrderValue, rfm,
      // products
      catalog, catEnriched, catWithMargin, productPerf,
      // orders
      orders, openOrders, overdueOrders,
      // campaigns
      campaigns,
      // forecast
      slope, intercept, forecast,
      // weekly
      weekRev,
    };
    this._cacheTime = Date.now();
    return this._cache;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// DECISION ENGINE v54
// Daily AI Priority Generator — no AI key needed for local analysis
// ══════════════════════════════════════════════════════════════════════════════
const DecisionEngine = {

  render() { this.loadLocal(); },

  async loadLocal() {
    try {
      const d = await DataLayer.fetch(true);
      this._renderLocal(d);
      const ts = eid('de-last-run');
      if (ts) ts.textContent = 'Aggiornato ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { console.warn('DE local error:', e); }
  },

  async runFull() {
    const brief = eid('de-brief');
    if (brief) brief.innerHTML = '🧠 <em>Analisi AI in corso — elaborazione dati business reali...</em>';
    const cpBtn = eid('de-copy-btn');
    if (cpBtn) cpBtn.style.display = 'none';
    try {
      const d = await DataLayer.fetch(true);
      this._renderLocal(d);
      await this._runAI(d);
      if (cpBtn) cpBtn.style.display = 'inline-flex';
    } catch (e) {
      if (brief) brief.textContent = '⚠️ Errore: ' + e.message;
    }
  },


  // ── Proportional distribution ──────────────────────────────────────────
  _renderDistrib(d) {
    const goals = (d.goals||[]).filter(g=>g.active!==false&&(g.priority||0)>0);
    if(!goals.length) return '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">Aggiungi priorità agli obiettivi per vedere la distribuzione proporzionale</div>';
    const total = (d.cash||0)+(d.bank||0);
    const sumPrio = goals.reduce((s,g)=>s+(g.priority||0),0);
    if(!sumPrio) return '';
    return goals.map(g=>{
      const pct = Math.round((g.priority||0)/sumPrio*100);
      const amount = Math.round((g.priority||0)/sumPrio*total*100)/100;
      const color = g.color||'#6366f1';
      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:18px">${g.icon||'🎯'}</span>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:700;color:var(--text)">${g.name}</div>
          <div style="height:6px;background:var(--bg-card3);border-radius:99px;margin-top:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:99px"></div>
          </div>
        </div>
        <div style="text-align:right;min-width:80px">
          <div style="font-size:13px;font-weight:800;color:${color}">€${this._fmt(amount)}</div>
          <div style="font-size:10px;color:var(--text-muted)">${pct}% — priorità ${g.priority||0}</div>
        </div>
      </div>`;
    }).join('');
  },

  _editDistrib() {
    const d = this._load();
    const goals = d.goals||[];
    if(!goals.length){ toast('Aggiungi prima degli obiettivi','warning'); return; }
    const items = goals.map((g,i)=>`
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span>${g.icon||'🎯'} ${g.name}</span>
        <div style="flex:1"></div>
        <label style="font-size:11px;color:var(--text-muted)">Priorità:</label>
        <input type="number" min="0" max="100" value="${g.priority||0}" id="bf-prio-${i}"
          style="width:60px;padding:4px 8px;background:var(--bg-card2);border:1px solid var(--border2);border-radius:6px;color:var(--text);font-size:12px">
      </div>`).join('');
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:#000a;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `<div style="background:var(--bg-card);border:1px solid var(--border2);border-radius:16px;padding:24px;width:min(460px,92vw);max-height:80vh;overflow-y:auto">
      <h3 style="margin:0 0 16px;font-size:16px;color:var(--text)">⚙️ Modifica Priorità Distribuzione</h3>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:14px">Le priorità determinano la distribuzione proporzionale del budget totale.</p>
      ${items}
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
        <button onclick="this.closest('[style*=fixed]').remove()" style="padding:8px 16px;background:var(--bg-card2);border:1px solid var(--border2);border-radius:8px;color:var(--text-muted);cursor:pointer;font-size:12px">Annulla</button>
        <button onclick="BankFunds._savePriorities(${goals.length})" style="padding:8px 16px;background:var(--primary);border:none;border-radius:8px;color:#000;cursor:pointer;font-size:12px;font-weight:700">💾 Salva</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
  },

  _savePriorities(count) {
    const d = this._load();
    for(let i=0;i<count;i++){
      const inp = document.getElementById('bf-prio-'+i);
      if(inp && d.goals[i]) d.goals[i].priority = parseInt(inp.value)||0;
    }
    this._save(d);
    document.querySelector('[style*="position:fixed"][style*="9999"]')?.remove();
    toast('✅ Priorità aggiornate!','success');
    this.render();
  },

  _fmt(v) { return v >= 1000 ? '€' + (Math.round(v / 100) / 10) + 'k' : '€' + Math.round(v); },

  _renderLocal(d) {
    const f = this._fmt.bind(this);

    // ── URGENT ───────────────────────────────────────────────────────────────
    const urgent = [];
    if (d.netProfit < 0) urgent.push(`🔴 Mese in perdita: ${f(d.netProfit)} — riduci costi o aumenta prezzi`);
    if (d.mRev < d.breakEven) urgent.push(`⚡ Revenue (${f(d.mRev)}) sotto break-even (${f(d.breakEven)})`);
    if (d.overdueOrders.length) urgent.push(`📦 ${d.overdueOrders.length} ordini in ritardo sulla consegna`);
    if (d.churnRisk.length) urgent.push(`⚠️ ${d.churnRisk.length} clienti a rischio churn (inattivi >60gg)`);
    const todayDow = new Date().getDay(); // 1=Mon … 0=Sun
    const daysIntoWeek = todayDow === 0 ? 6 : todayDow - 1; // days since Monday
    const weekTarget = Math.round(375 / 7 * (daysIntoWeek + 1)); // pro-rata target
    if (d.weekRev !== undefined && daysIntoWeek >= 2 && d.weekRev < weekTarget) {
      urgent.push(`📅 Ricavi settimana: ${f(d.weekRev)} / target €375 (oggi: ≥${f(weekTarget)} pro-rata) — spingi vendite`);
    }
    const pendingQ = d.sentQ.filter(q => { const days = Math.floor((Date.now() - new Date(q.date || q.createdAt || Date.now())) / 86400000); return days > 7; });
    if (pendingQ.length) urgent.push(`📄 ${pendingQ.length} preventivi senza risposta da >7gg`);
    if (!urgent.length) urgent.push('✅ Nessuna emergenza critica — ottimo!');

    eid('de-urgent') && (eid('de-urgent').innerHTML = urgent.map(u => `<div style="margin-bottom:5px;line-height:1.5">• ${u}</div>`).join(''));
    eid('de-cnt-u') && (eid('de-cnt-u').textContent = urgent.filter(u => !u.startsWith('✅')).length || 'OK');

    // ── IMPROVE ───────────────────────────────────────────────────────────────
    const improve = [];
    if (d.convRate < 40) improve.push(`📊 Conversione preventivi al ${d.convRate}% — target 40%+ (follow-up entro 48h)`);
    const lowM = d.catEnriched.filter(p => p.margin !== null && p.margin < 30 && p.price > 0);
    if (lowM.length) improve.push(`💰 ${lowM.length} prodotti con margine <30% (target ≥65% B2C / ≥55% B2B): ${lowM.slice(0, 2).map(p => p.name || p.id).join(', ')}`);
    if (d.avgOrderValue > 0 && d.avgOrderValue < 45) improve.push(`🛒 Scontrino medio basso (${f(d.avgOrderValue)}) — target €45, proponi upsell o bundle`);
    const single = d.enrichedClients.filter(c => c.orderCount === 1 && c.daysSince < 90);
    if (single.length > 3) improve.push(`🔁 ${single.length} clienti con 1 solo acquisto — attiva follow-up`);
    if (!improve.length) improve.push('✅ Nessun problema critico rilevato');

    eid('de-improve') && (eid('de-improve').innerHTML = improve.map(i => `<div style="margin-bottom:5px;line-height:1.5">• ${i}</div>`).join(''));
    eid('de-cnt-i') && (eid('de-cnt-i').textContent = improve.filter(i => !i.startsWith('✅')).length || 'OK');

    // ── OPPORTUNITIES ─────────────────────────────────────────────────────────
    const opps = [];
    if (d.rfm.loyal.length > 0) opps.push(`🏆 ${d.rfm.loyal.length} clienti fedeli da portare su prodotto premium`);
    if (d.slope > 0) opps.push(`📈 Trend revenue crescente +${f(d.slope)}/mese — scala la produzione`);
    if (d.productPerf[0]) opps.push(`⭐ "${d.productPerf[0].name}" è il bestseller — spingi di più`);
    if (d.forecast[0] > d.mRev * 1.05) opps.push(`🔮 Forecast prossimo mese: ${f(d.forecast[0])}`);
    if (!opps.length) opps.push('💡 Inserisci più dati per opportunità personalizzate');

    eid('de-opp') && (eid('de-opp').innerHTML = opps.map(o => `<div style="margin-bottom:5px;line-height:1.5">• ${o}</div>`).join(''));
    eid('de-cnt-o') && (eid('de-cnt-o').textContent = opps.filter(o => !o.startsWith('💡')).length || '?');

    // ── TOP 5 PRIORITIES ──────────────────────────────────────────────────────
    const all = [
      ...urgent.filter(u => !u.startsWith('✅')).map(u => ({ icon: '🔴', text: u, score: 10 })),
      ...improve.filter(i => !i.startsWith('✅')).map(i => ({ icon: '🟡', text: i, score: 7 })),
      ...opps.filter(o => !o.startsWith('💡')).map(o => ({ icon: '🟢', text: o, score: 5 })),
    ].slice(0, 5);

    const priEl = eid('de-priorities');
    if (priEl) {
      priEl.innerHTML = all.length
        ? all.map((p, i) => `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:var(--bg-card2);border-radius:8px">
            <div style="font-size:18px;min-width:24px">${p.icon}</div>
            <div><div style="font-size:10px;color:var(--text-dim);margin-bottom:2px">PRIORITÀ ${i + 1}</div>
            <div style="font-size:12px;font-weight:600;color:var(--text)">${p.text}</div></div></div>`).join('')
        : '<div style="color:var(--text-dim);font-size:11px;text-align:center;padding:20px">Aggiungi vendite e clienti per priorità personalizzate</div>';
    }

    // ── HIDDEN PROFIT ─────────────────────────────────────────────────────────
    const hidden = [];
    const underpriced = d.catEnriched.filter(p => p.margin !== null && p.margin < 30 && p.price > 0 && p.price < 80);
    if (underpriced.length) hidden.push(`💰 ${underpriced.length} prodotti con margine <30% e prezzo <€80 — rialzo del 15% = +${f(underpriced.reduce((a, p) => a + p.price * p.salesCount * 0.15, 0))}/mese stim.`);
    if (d.topClients.length && d.topClients[0]?.ltv > 0) hidden.push(`🏆 ${d.topClients.slice(0, 2).map(c => (c.name || c.id) + ' (LTV ' + f(c.ltv) + ')').join(', ')} — proponi ordini premium`);
    if (!hidden.length) hidden.push('Aggiungi prodotti con prezzo+costo per rilevare profitto nascosto');

    eid('de-hidden') && (eid('de-hidden').innerHTML = hidden.map(h =>
      `<div style="padding:8px;background:var(--bg-card2);border-radius:6px;border-left:3px solid #22c55e;font-size:11px;margin-bottom:6px">${h}</div>`
    ).join(''));

    // ── STOP DOING ────────────────────────────────────────────────────────────
    const stop = [];
    const inLoss = d.catEnriched.filter(p => p.margin !== null && p.margin < 0 && p.salesCount > 0);
    if (inLoss.length) stop.push(`🛑 ${inLoss.length} prodotti venduti IN PERDITA: ${inLoss.slice(0, 2).map(p => p.name || p.id).join(', ')}`);
    if (d.rfm.lost.length > 5) stop.push(`🚶 ${d.rfm.lost.length} clienti "persi" — smetti di investire, concentrati sui fedeli`);
    if (!stop.length) stop.push('✅ Nessuna attività chiaramente in perdita');

    eid('de-stop') && (eid('de-stop').innerHTML = stop.map(s =>
      `<div style="padding:8px;background:var(--bg-card2);border-radius:6px;border-left:3px solid #ef4444;font-size:11px;margin-bottom:6px">${s}</div>`
    ).join(''));
  },

  async _runAI(d) {
    const f = this._fmt.bind(this);
    const brief = eid('de-brief');
    const prompt = `Sei un advisor strategico per artigiani italiani con laboratorio laser/CNC. Analizza questi dati REALI e fornisci un brief strategico professionale.

═══ DATI BUSINESS — ${new Date().toLocaleDateString('it-IT')} ═══
💰 Revenue questo mese: ${f(d.mRev)} | Mese scorso: ${f(d.lRev)} | Crescita MoM: ${d.momGrowth !== null ? d.momGrowth + '%' : 'n/d'}
📊 Costi mensili: ${f(d.mCosts)} (fissi: ${f(d.mFixed)} + variabili: ${f(d.mVar)})
🎯 Margine netto: ${d.netMarginPct}% | Break-even: ${f(d.breakEven)} | Utile: ${f(d.netProfit)}
📅 Forecast prossimo mese: ${f(d.forecast[0])} | Trend slope: ${d.slope > 0 ? '+' : ''}${f(d.slope)}/mese
📦 Ordini aperti: ${d.openOrders.length} | In ritardo: ${d.overdueOrders.length}
📄 Preventivi: ${d.convRate}% conversione (${d.wonQ.length} vinti / ${d.sentQ.length + d.wonQ.length} inviati)
👥 Clienti: ${d.clients.length} totali | ${d.churnRisk.length} a rischio churn | ${d.repeatClients.length} ricorrenti
🏆 RFM: Champions(${d.rfm.champions.length}) Fedeli(${d.rfm.loyal.length}) A-Rischio(${d.rfm.atRisk.length}) Persi(${d.rfm.lost.length})
🛍️ LTV medio: ${f(d.avgLTV)} | Valore medio ordine: ${f(d.avgOrderValue)}
📦 Catalogo: ${d.catalog.length} prodotti | Margine medio: ${d.avgMarginPct.toFixed(1)}%
⭐ Bestseller: ${d.productPerf[0]?.name || 'n/d'} (${f(d.productPerf[0]?.revenue || 0)})
🔝 Top cliente: ${d.topClients[0]?.name || 'n/d'} (LTV ${f(d.topClients[0]?.ltv || 0)})
💶 Riserva fiscale stimata: ${f(d.taxReserve)} | Cash runway: ${d.cashRunway !== null ? d.cashRunway + ' mesi' : 'n/d'}

Scrivi in italiano, sii diretto e concreto. Ogni consiglio deve citare i numeri reali.

## 🎯 DIAGNOSI (2-3 righe)
[Stato del business basato sui dati]

## ⚡ LE 3 AZIONI DI QUESTA SETTIMANA
1. [Azione concreta + impatto stimato in €]
2. [Azione concreta + impatto stimato in €]
3. [Azione concreta + impatto stimato in €]

## 💰 PROFITTO NASCOSTO
[2-3 opportunità concrete con stima impatto mensile]

## 🚀 STRATEGIA 30 GIORNI
[Piano realistico basato sui numeri, non generalità]

## ⚠️ RISCHI DA MONITORARE
[1-2 rischi critici con soglie di allerta precise]`;

    try {
      const result = await AIProvider.call(prompt, 2000);
      if (brief) brief.textContent = result;
    } catch (e) {
      if (brief) brief.innerHTML = `<div style="padding:14px;background:var(--bg-card2);border-radius:8px;border-left:3px solid #f59e0b">
<strong>⚠️ AI non configurata</strong><br><br>
Vai in <strong>Impostazioni → 🤖 AI Provider</strong> e configura un provider gratuito (Groq o Gemini).<br><br>
<em>L'analisi locale sopra funziona già senza AI — i dati critici sono già visibili.</em></div>`;
    }
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// OPPORTUNITY SCANNER v54
// 6 AI-powered market intelligence scans
// ══════════════════════════════════════════════════════════════════════════════
const OpportunityScanner = {
  _f(v) { return v >= 1000 ? '€' + (Math.round(v / 100) / 10) + 'k' : '€' + Math.round(v); },

  async runAll() {
    toast('Scansione completa in corso...', 'success');
    // Use AppStore for data (faster, cached)
    const [sales, quotes, clients, catalog, items, cashflow] = await Promise.all([
      AppStore.get('sales'),
      AppStore.get('quotes'),
      AppStore.get('clients'),
      AppStore.get('catalog'),
      AppStore.get('items'),
      AppStore.get('cashflow'),
    ]);
    const paid = sales.filter(s => s.status === 'pagato');
    const mRev = paid.filter(s => new Date(s.date||0).getMonth() === new Date().getMonth()).reduce((a,s)=>a+(+s.amount||0),0);
    const d = {
      sales: paid, allSales: sales, quotes, clients, catalog, cashflow, items,
      mRev,
      productPerf: await ProductIntelligence.compute().catch(()=>[]),
    };
    this._renderLocalWins(d);
    await this.scan('trends', d);
  },

  _renderLocalWins(d) {
    const el = eid('opp-local-wins');
    if (!el) return;
    const wins = [];
    // Pending quotes value
    const pending = d.quotes.filter(q => ['in_attesa','bozza'].includes(q.status));
    const pendingVal = pending.reduce((a,q)=>a+(+q.netPrice||+q.total||0), 0);
    if (pendingVal > 50) wins.push({ icon:'📋', title:`€${pendingVal.toFixed(0)} in preventivi in sospeso`, sub:`${pending.length} preventivi senza conferma`, nav:'quoter', color:'#3b82f6' });
    // Top product to push
    const topProd = (d.productPerf || [])[0];
    if (topProd && topProd.score >= 70) wins.push({ icon:'⭐', title:`"${topProd.name}" — tuo best seller`, sub:`Score ${topProd.score}/100 · margine ${topProd.margin}%`, nav:'catalog', color:'#22c55e' });
    // Slow product to discount
    const slowProd = (d.productPerf || []).find(p => p.daysSinceLastSale > 60);
    if (slowProd) wins.push({ icon:'🐌', title:`"${slowProd.name}" inattivo da ${slowProd.daysSinceLastSale}gg`, sub:'Considera uno sconto o una promozione', nav:'catalog', color:'#f59e0b' });
    // Month target
    if (d.mRev > 0) wins.push({ icon:'💰', title:`Revenue MTD: €${d.mRev.toFixed(0)}`, sub:'Aggiorna il target mensile nel Dashboard', nav:'dashboard', color:'#a855f7' });

    el.innerHTML = wins.length > 0 ? `
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
        <div style="font-size:10px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em">📊 WINS LOCALI (DATI REALI)</div>
        ${wins.map(w => `<div onclick="App.navigate('${w.nav}')" style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:${w.color}10;border:1px solid ${w.color}30;border-radius:10px;cursor:pointer">
          <span style="font-size:20px">${w.icon}</span>
          <div><div style="font-size:13px;font-weight:700;color:${w.color}">${w.title}</div><div style="font-size:11px;color:var(--text-muted)">${w.sub}</div></div>
        </div>`).join('')}
      </div>` : '';
  },

  async scan(type, data) {
    const titleEl = eid('opp-title');
    const resultEl = eid('opp-result');
    const loader = eid('opp-loader');
    if (loader) loader.style.display = 'inline';
    if (resultEl) resultEl.textContent = '🔍 Analisi AI in corso...';

    const d = data || await DataLayer.fetch();
    const f = this._f.bind(this);

    const TITLES = {
      trends: '📈 Trend Prodotti 2025', gaps: '🕳️ Gap di Mercato',
      seasonal: '🌊 Analisi Stagionalità', new_products: '✨ Nuovi Prodotti da Lanciare',
      pricing: '💰 Ottimizzazione Prezzi', b2b: '🏢 Opportunità B2B',
    };
    if (titleEl) titleEl.textContent = TITLES[type] || '📊 Analisi';

    const season = ['Inverno', 'Inverno', 'Primavera', 'Primavera', 'Primavera',
      'Estate', 'Estate', 'Estate', 'Autunno', 'Autunno', 'Autunno', 'Inverno'][new Date().getMonth()];
    const cats = d.catalog.map(p => p.name).filter(Boolean).slice(0, 15).join(', ') || 'n/d';
    const best = d.productPerf.slice(0, 3).map(p => `${p.name}(${f(p.revenue)})`).join(', ') || 'n/d';

    const PROMPTS = {
      trends: `Sei un esperto di mercato per artigianato laser/CNC italiano. Stagione: ${season} ${new Date().getFullYear()}.
Catalogo attuale: ${cats}. Bestseller: ${best}.

Analizza e fornisci:
## 📈 TOP 5 TREND PRODOTTI (artigianato laser/acrilico/legno)
Per ogni trend: Nome prodotto | Domanda stimata | Target cliente | Prezzo consigliato | Difficoltà (⭐1-5) | Margine stimato %

## 🎯 PRODOTTI DA AGGIUNGERE SUBITO AL CATALOGO
(gap rispetto ai tuoi prodotti attuali + trend di mercato)

## ⚡ TREND EMERGENTI PROSSIMI 3 MESI
(con date precise di picco domanda)

Sii specifico. Usa esempi reali di prodotti laser italiani.`,

      gaps: `Sei un analista di mercato specializzato in artigianato laser italiano su Etsy e marketplace.
Catalogo attuale: ${cats}. Revenue/mese: ${f(d.mRev)}.

## 🕳️ TOP 5 GAP DI MERCATO
(opportunità non coperte dai competitor Etsy italiani, con stima volume)

## 🎯 NICCHIE AD ALTA MARGINALITÀ NON SFRUTTATE
(alta domanda + bassa concorrenza + buon margine)

## 🏆 COME POSIZIONARSI PER DOMINARE UNA NICCHIA
(strategia differenziazione pratica)

## 💰 POTENZIALE REVENUE AGGIUNTIVO MENSILE
(stima realista per ogni gap)`,

      seasonal: `Mese: ${new Date().toLocaleString('it-IT', { month: 'long', year: 'numeric' })}. Revenue attuale: ${f(d.mRev)}.
Prodotti: ${cats}.

## 🌊 CALENDARIO DOMANDA — PROSSIMI 3 MESI
Per ogni mese: Livello domanda (🔥Alta/🟡Media/❄️Bassa) | Prodotti da spingere | Azioni da fare ORA

## 🎁 EVENTI E PICCHI DA NON PERDERE
(date precise + prodotti + stima vendite aggiuntive)

## 📦 PIANO PRODUZIONE CONSIGLIATO
(cosa iniziare a produrre questa settimana per il prossimo picco)

## ⚡ TOP 3 AZIONI IMMEDIATE
(da fare nei prossimi 7 giorni per massimizzare la stagione)`,

      new_products: `Business dati reali: Revenue/mese: ${f(d.mRev)}, Catalogo: ${cats}, Bestseller: ${best}.
LTV medio clienti: ${f(d.avgLTV)}. Margine medio: ${d.avgMarginPct.toFixed(1)}%.

## 💡 TOP 5 NUOVI PRODOTTI DA LANCIARE
Per ognuno: Nome | Descrizione breve | Target cliente | Prezzo vendita | Costo prod. stimato | Margine % | Volume mensile stimato | Difficoltà ⭐1-5

## 🚀 1 PRODOTTO HIGH-TICKET (>€150)
(alta marginalità + basso volume necessario)

## 🎯 3 BUNDLE DA CREARE CON PRODOTTI ESISTENTI
(aumenta scontrino medio da ${f(d.avgOrderValue)} a ?)`,

      pricing: `Catalogo con prezzi: ${d.catEnriched.filter(p => p.price > 0).map(p => `${p.name || p.id}:${f(p.price)}(marg:${p.margin?.toFixed(0) || '?'}%)`).slice(0, 12).join(', ') || 'n/d'}.
Scontrino medio: ${f(d.avgOrderValue)}. Revenue/mese: ${f(d.mRev)}.

## 💰 PRODOTTI CON PREZZO SUB-OTTIMALE
(cosa aumentare senza perdere clienti, con % esatta e motivazione)

## 📊 STRUTTURA PREZZI CONSIGLIATA
(Good/Better/Best tiers + anchor pricing)

## ⚡ IMPATTO DI UN RIALZO DEL 10%
(calcolo preciso su revenue mensile)

## 🎯 PREZZI PSICOLOGICI OTTIMALI
(per ogni fascia di prodotto)`,

      b2b: `Business: ${d.clients.length} clienti, LTV medio ${f(d.avgLTV)}, Revenue/mese ${f(d.mRev)}.
Prodotti: ${cats}.

## 🏢 TOP 5 CATEGORIE B2B DA TARGETTARE
(con volume potenziale, approccio, timing)

## 📋 OFFERTA B2B DA COSTRUIRE
(prezzi, bundle, condizioni, MOQ)

## 📈 IMPATTO REVENUE SE ACQUISISCI 3-5 CLIENTI B2B/MESE
(stima conservativa e ottimistica)

## ⚡ CANALI DI ACQUISIZIONE B2B
(dove trovarli + script contatto in 3 righe)`,
    };

    try {
      const result = await AIProvider.call(PROMPTS[type] || PROMPTS.trends, 2000);
      if (resultEl) resultEl.textContent = result;
    } catch (e) {
      if (resultEl) resultEl.innerHTML = `<div style="padding:14px;background:var(--bg-card2);border-radius:8px;border-left:3px solid #f59e0b">⚠️ Configura un provider AI in <strong>Impostazioni → 🤖 AI Provider</strong><br><br>Groq e Gemini sono gratuiti e funzionano immediatamente.<br><small style="color:var(--text-dim)">${e.message}</small></div>`;
    }
    if (loader) loader.style.display = 'none';
  },

  _renderWins(d) {
    const f = this._f.bind(this);
    const el = eid('opp-wins');
    if (!el) return;
    const wins = [
      d.churnRisk.length && { icon: '📱', title: `Ricontatta ${d.churnRisk.length} clienti`, desc: `Potenziale recupero ${f(d.churnRisk.reduce((a, c) => a + c.ltv * 0.25, 0))}` },
      d.catEnriched.filter(p => p.margin !== null && p.margin < 30).length && { icon: '💰', title: 'Aumenta prezzi low-margin +15%', desc: `Impatto stimato +${f(d.mRev * 0.08)}/mese` },
      d.rfm.loyal.length && { icon: '🏆', title: `Upsell ${d.rfm.loyal.length} clienti fedeli`, desc: 'Proponi prodotto premium o pack' },
      { icon: '📈', title: `Forecast: ${f(d.forecast[0])}`, desc: d.slope > 0 ? '📈 Trend positivo' : '⚠️ Monitora il trend' },
      d.sentQ.length && { icon: '📄', title: `Follow-up ${d.sentQ.length} preventivi`, desc: 'Aumenta conversione al 40%' },
    ].filter(Boolean).slice(0, 6);

    el.innerHTML = wins.map(w => `<div style="background:var(--bg-card2);border-radius:8px;padding:12px">
      <div style="font-size:20px;margin-bottom:6px">${w.icon}</div>
      <div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:4px">${w.title}</div>
      <div style="font-size:10px;color:var(--text-muted)">${w.desc}</div>
    </div>`).join('') || `<div style="grid-column:span 3;text-align:center;color:var(--text-dim);font-size:11px;padding:14px">Aggiungi dati per i quick wins</div>`;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// INTELLIGENCE HUB v54
// 4-layer Business Intelligence: Customer · Product · Financial · Growth
// ══════════════════════════════════════════════════════════════════════════════
const IntelHub = {
  _loaded: false,

  // render() is an alias for load() — called by navigate map
  async render(force) { return this.load(force); },

  async load(force) {
    if (this._loaded && !force) return;
    // Refresh BDW first (Single Source of Truth)
    try { await BDW.init(force); } catch(e) { console.warn('[IntelHub] BDW err', e); }
    const d = await DataLayer.fetch(force || false);
    this._renderClients(d);
    this._renderProducts(d);
    this._renderFinance(d);
    this._renderGrowth(d);
    this._loaded = true;
    // Emit coherence check in background
    setTimeout(() => DAO.coherenceCheck(), 500);
  },

  tab(name) {
    document.querySelectorAll('.intel-tab').forEach(b => {
      b.className = b.dataset.tab === name
        ? 'btn btn-primary btn-sm intel-tab'
        : 'btn btn-secondary btn-sm intel-tab';
    });
    ['clients', 'products', 'finance', 'growth'].forEach(t => {
      const el = eid('intel-' + t);
      if (el) el.style.display = t === name ? 'block' : 'none';
    });
    if (!this._loaded) this.load();
  },

  _f(v) { return v >= 1000 ? '€' + (Math.round(v / 100) / 10) + 'k' : '€' + Math.round(v); },
  _set(id, val) { const e = eid(id); if (e) e.textContent = val; },

  _renderClients(d) {
    const f = this._f.bind(this);
    this._set('ic-total', d.clients.length);
    this._set('ic-ltv', f(d.avgLTV));
    this._set('ic-champ', d.rfm.champions.length);
    this._set('ic-risk', d.churnRisk.length);

    const topEl = eid('ic-top');
    if (topEl) {
      const withLTV = d.topClients.filter(c => c.ltv > 0);
      topEl.innerHTML = withLTV.length
        ? withLTV.map((c, i) => `<div style="display:flex;align-items:center;gap:8px;padding:8px;background:${i === 0 ? 'var(--primary)20' : 'var(--bg-card2)'};border-radius:6px;margin-bottom:4px">
            <div style="width:22px;height:22px;border-radius:50%;background:var(--primary);color:var(--bg);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0">${i + 1}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name || c.id || '—'}</div>
              <div style="font-size:10px;color:var(--text-muted)">${c.orderCount} ordini · ${c.daysSince < 365 ? c.daysSince + 'gg fa' : '>1 anno'}</div>
            </div>
            <div style="font-weight:800;font-size:12px;color:var(--primary);flex-shrink:0">${f(c.ltv)}</div>
          </div>`).join('')
        : '<div style="color:var(--text-dim);font-size:11px;text-align:center;padding:20px">Aggiungi vendite con nome cliente per vedere i top clienti</div>';
    }

    const rfmEl = eid('ic-rfm');
    if (rfmEl) {
      const segs = [
        { k: 'champions', l: '🏆 Champions', c: '#22c55e', d: 'Comprano spesso, alto valore' },
        { k: 'loyal', l: '💙 Fedeli', c: '#3b82f6', d: 'Comprano regolarmente' },
        { k: 'atRisk', l: '⚠️ A Rischio', c: '#f59e0b', d: 'Inattivi da >60gg' },
        { k: 'lost', l: '😢 Persi', c: '#ef4444', d: 'Inattivi da >180gg' },
        { k: 'newbie', l: '🆕 Nuovi', c: '#a855f7', d: 'Prima volta' },
      ];
      rfmEl.innerHTML = segs.map(s => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:36px;height:36px;border-radius:8px;background:${s.c}20;border:1px solid ${s.c}40;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${s.l.split(' ')[0]}</div>
        <div style="flex:1">
          <div style="font-size:11px;font-weight:700;color:${s.c}">${s.l.slice(2)} (${d.rfm[s.k].length})</div>
          <div style="font-size:10px;color:var(--text-dim)">${s.d}</div>
        </div>
        <div style="background:${s.c};color:#fff;border-radius:99px;padding:2px 8px;font-size:10px;font-weight:700;flex-shrink:0">${d.rfm[s.k].length}</div>
      </div>`).join('');
    }
  },

  _renderProducts(d) {
    const f = this._f.bind(this);
    const active = d.catEnriched.filter(p => p.price > 0);
    const margined = active.filter(p => p.margin !== null);
    const topM = margined.length ? Math.max(...margined.map(p => p.margin)) : null;
    const avgM = margined.length ? margined.reduce((a, p) => a + p.margin, 0) / margined.length : null;
    const underThresh = margined.filter(p => p.margin < 30).length;

    this._set('ip-total', active.length || d.catalog.length);
    this._set('ip-top', topM !== null ? topM.toFixed(1) + '%' : '—');
    this._set('ip-avg', avgM !== null ? avgM.toFixed(1) + '%' : '—');
    this._set('ip-low', underThresh);

    const perfEl = eid('ip-perf');
    if (perfEl) {
      const withSales = active.filter(p => p.salesRevenue > 0).sort((a, b) => b.salesRevenue - a.salesRevenue);
      perfEl.innerHTML = withSales.length
        ? withSales.slice(0, 10).map((p, i) => `<div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-card2);border-radius:6px;margin-bottom:4px">
            <div style="font-size:16px">${['🥇', '🥈', '🥉'][i] || '📦'}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name || p.id}</div>
              <div style="font-size:10px;color:var(--text-muted)">${p.salesCount} vendite · margine ${p.margin?.toFixed(0) || '?'}%</div>
            </div>
            <div style="font-weight:700;font-size:12px;color:var(--primary);flex-shrink:0">${f(p.salesRevenue)}</div>
          </div>`).join('')
        : '<div style="color:var(--text-dim);font-size:11px;text-align:center;padding:20px">Collega vendite ai prodotti per vedere la performance</div>';
    }

    const bcgEl = eid('ip-bcg');
    if (bcgEl) {
      const avgRev = active.filter(p => p.salesRevenue > 0).reduce((a, p) => a + p.salesRevenue, 0) / (active.filter(p => p.salesRevenue > 0).length || 1);
      const am = avgM || 40;
      const groups = [
        { l: '⭐ Stelle', items: active.filter(p => p.salesRevenue >= avgRev && (p.margin || 0) >= am), c: '#22c55e', d: 'Alto fatturato + alto margine → SPINGI' },
        { l: '🐄 Vacche', items: active.filter(p => p.salesRevenue >= avgRev && (p.margin || 0) < am), c: '#3b82f6', d: 'Alto fatturato, migliora il margine' },
        { l: '❓ Dubbi', items: active.filter(p => p.salesRevenue < avgRev && (p.margin || 0) >= am), c: '#f59e0b', d: 'Buon margine, poca domanda → PROMUOVI' },
        { l: '🐕 Cani', items: active.filter(p => p.salesRevenue < avgRev && (p.margin || 0) < am), c: '#ef4444', d: 'Basso tutto → valuta se tenerli' },
      ];
      bcgEl.innerHTML = groups.map(g => `<div style="margin-bottom:10px;padding:8px;background:var(--bg-card2);border-radius:8px;border-left:3px solid ${g.c}">
        <div style="font-size:11px;font-weight:700;color:${g.c};margin-bottom:3px">${g.l} (${g.items.length})</div>
        <div style="font-size:10px;color:var(--text-dim);margin-bottom:5px">${g.d}</div>
        ${g.items.slice(0, 3).map(p => `<span style="font-size:10px;background:${g.c}20;border-radius:4px;padding:1px 6px;margin-right:3px">${p.name || p.id}</span>`).join('')}
        ${g.items.length > 3 ? `<span style="font-size:10px;color:var(--text-dim)">+${g.items.length - 3}</span>` : ''}
      </div>`).join('');
    }
  },

  _renderFinance(d) {
    const f = this._f.bind(this);
    this._set('if-margin', d.netMarginPct + '%');
    this._set('if-be', f(d.breakEven));
    this._set('if-tax', f(d.taxReserve));
    this._set('if-runway', d.cashRunway !== null ? d.cashRunway + ' mesi' : '—');

    const pnlEl = eid('if-pnl');
    if (pnlEl) {
      const rows = [
        ['Revenue mese', d.mRev, true],
        ['Costi fissi', -d.mFixed, false],
        ['Costi variabili', -(d.mVar), false],
        ['— Totale costi', -d.mCosts, false],
        ['= Utile lordo', d.netProfit, d.netProfit >= 0],
        ['Margine netto', null, +d.netMarginPct >= 0, d.netMarginPct + '%'],
        ['Riserva fiscale 15%', -Math.round(d.mRev * 0.15), false],
        ['= Utile disponibile', d.netProfit - Math.round(d.mRev * 0.15), d.netProfit > 0],
      ];
      pnlEl.innerHTML = `<table style="width:100%;border-collapse:collapse">${rows.map(([label, val, pos, extra]) =>
        `<tr style="border-bottom:1px solid var(--border)">
          <td style="padding:6px 4px;font-size:11px;color:var(--text)">${label}</td>
          <td style="padding:6px 4px;text-align:right;font-size:11px;font-weight:700;color:${pos ? '#22c55e' : '#ef4444'}">${extra || f(val || 0)}</td>
        </tr>`).join('')}</table>`;
    }

    const fcastEl = eid('if-fcast');
    if (fcastEl) {
      const months = [1, 2, 3].map(i => new Date(d.now.getFullYear(), d.now.getMonth() + i, 1)
        .toLocaleString('it-IT', { month: 'long', year: 'numeric' }));
      fcastEl.innerHTML = d.forecast.map((v, i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-card2);border-radius:6px;margin-bottom:8px">
        <div>
          <div style="font-size:11px;font-weight:600;text-transform:capitalize">${months[i]}</div>
          <div style="font-size:10px;color:var(--text-muted)">regressione lineare</div>
        </div>
        <div style="font-size:16px;font-weight:800;color:var(--primary)">${f(v)}</div>
      </div>`).join('') + '<div style="font-size:10px;color:var(--text-dim);margin-top:6px">⚠️ Basato su andamento storico 12 mesi. Aggiorna spesso le vendite.</div>';
    }
  },

  _renderGrowth(d) {
    const f = this._f.bind(this);
    this._set('ig-conv', d.convRate + '%');
    this._set('ig-repeat', d.repeatClients.length);
    this._set('ig-aov', f(d.avgOrderValue));
    this._set('ig-mom', d.momGrowth !== null ? (d.momGrowth > 0 ? '+' : '') + d.momGrowth + '%' : '—');

    const funnel = eid('ig-funnel');
    if (funnel) {
      const stages = [
        { l: '📋 Preventivi creati', v: d.quotes.length, base: d.quotes.length },
        { l: '📤 Inviati', v: d.sentQ.length + d.wonQ.length, base: d.quotes.length },
        { l: '✅ Vinti', v: d.wonQ.length, base: d.sentQ.length + d.wonQ.length },
        { l: '💰 Clienti paganti', v: d.enrichedClients.filter(c => c.orderCount > 0).length, base: d.clients.length },
      ];
      funnel.innerHTML = stages.map(s => {
        const pct = s.base > 0 ? Math.round(s.v / s.base * 100) : 0;
        return `<div style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="font-size:11px">${s.l}</span>
            <span style="font-size:11px;font-weight:700;color:var(--primary)">${s.v} (${pct}%)</span>
          </div>
          <div style="background:var(--bg-card2);border-radius:4px;height:8px;overflow:hidden">
            <div style="height:100%;background:var(--primary);border-radius:4px;width:${pct}%;transition:width .5s"></div>
          </div>
        </div>`;
      }).join('');
    }

    const bars = eid('ig-bars');
    const trendInfo = eid('ig-trend-info');
    if (bars && d.revsArr) {
      const max = Math.max(...d.revsArr, 1);
      bars.innerHTML = d.revsArr.map((v, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center">
        <div title="${f(v)}" style="width:100%;background:${i === d.revsArr.length - 1 ? 'var(--primary)' : 'var(--primary)55'};border-radius:3px 3px 0 0;height:${Math.max(3, Math.round(v / max * 68))}px;transition:height .5s"></div>
      </div>`).join('');
    }
    if (trendInfo) {
      const col = d.momGrowth !== null && d.momGrowth >= 0 ? '#22c55e' : '#ef4444';
      trendInfo.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-dim);margin-bottom:6px"><span>${d.last12[d.last12.length - 1]}</span><span>Oggi</span></div>
        <div style="font-size:11px;color:${col};font-weight:600">
          MoM: ${d.momGrowth !== null ? (d.momGrowth > 0 ? '+' : '') + d.momGrowth + '%' : 'n/d'} &nbsp;|&nbsp;
          Trend: ${d.slope > 50 ? '📈' : d.slope < -50 ? '📉' : '➡️'} ${f(Math.abs(d.slope || 0))}/mese
        </div>`;
    }
  },
};

// ── Navigate hook ─────────────────────────────────────────────────────────────
(function patchNavigate() {
  const _orig = App.navigate?.bind(App);
  if (!_orig) { setTimeout(patchNavigate, 300); return; }
  App.navigate = function (section) {
    _orig(section);
    if (section === 'decision')    { BDW.init().then(() => DecisionEngine.loadLocal()); }
    if (section === 'goals')       { if(typeof InvestPlanner!=='undefined'&&typeof InvestPlanner.render==='function'){InvestPlanner.render();}else if(typeof GoalTracker!=='undefined'){GoalTracker.render();} }
    if (section === 'profitleak')  { if(typeof ProfitLeakDetector!==typeof undefined) ProfitLeakDetector.renderPage(); }
    if (section === 'intel')       { IntelHub.load(); }
    if (section === 'leadscorer')  { (typeof LeadScorer!=='undefined'&&LeadScorer.render()); }
    if (section === 'marketintel') { CompetitorTracker.load(); }
    if (section === 'kpi')         { BDW.init().then(() => KPIEngine.renderPage()); }
    if (section === 'dashboard')   { BDW.init(false); }
    if (section === 'listino')     { if(typeof ListinoTabs!=='undefined') ListinoTabs.show('calc'); else if(typeof Listino!=='undefined') (typeof Listino!=='undefined'&&Listino.render()); }
  };
})();


// ══════════════════════════════════════════════════════════════════
// PIPELINE ORCHESTRATOR + PAINTS MODULE v55
// Orchestrazione Quote→Kanban→Vendite + Vernici & Bombolette
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// PIPELINE ORCHESTRATOR v55
// Il direttore d'orchestra — connette Quoter ↔ Workflow ↔ Kanban ↔ Vendite
// ══════════════════════════════════════════════════════════════════════════════
const AISetupGuide = {
  show(){
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = `<div style="background:var(--bg-card);border-radius:20px;padding:32px;max-width:520px;width:100%;border:2px solid #6366f140;max-height:90vh;overflow-y:auto">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:48px;margin-bottom:8px">🤖</div>
        <h2 style="font-size:22px;font-weight:900;color:#fff;margin:0 0 8px">Attiva l'AI — Gratis</h2>
        <p style="font-size:13px;color:#94a3b8;line-height:1.6">Sblocca tutti i 20+ moduli AI con una chiave gratuita. Ci vogliono 2 minuti.</p>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px">
        <!-- Groq - recommended -->
        <div style="background:#f9731610;border:2px solid #f9731640;border-radius:12px;padding:16px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <span style="font-size:24px">⚡</span>
            <div>
              <div style="font-size:14px;font-weight:800;color:#fb923c">Groq — Consigliato</div>
              <div style="font-size:11px;color:#64748b">Llama 3.3 70B · Gratuito · Velocissimo · Nessuna carta</div>
            </div>
            <span style="margin-left:auto;background:#f9731620;color:#fb923c;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">FREE</span>
          </div>
          <ol style="font-size:11px;color:#94a3b8;margin:0 0 10px 16px;line-height:2">
            <li>Vai su <a href="https://console.groq.com/keys" target="_blank" style="color:#fb923c">console.groq.com/keys</a></li>
            <li>Clicca "Create API Key"</li>
            <li>Copia e incolla qui sotto</li>
          </ol>
          <input id="setup-groq-key" class="form-control" type="password" placeholder="gsk_xxxxxxxxxxxxxxxxxxxx" style="margin-bottom:8px">
          <button onclick="AISetupGuide.saveKey('groq')" style="width:100%;padding:10px;background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:800">⚡ Attiva Groq</button>
        </div>

        <!-- Gemini -->
        <div style="background:#4285f410;border:1.5px solid #4285f430;border-radius:12px;padding:14px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="font-size:20px">✨</span>
            <div>
              <div style="font-size:13px;font-weight:700;color:#60a5fa">Google Gemini</div>
              <div style="font-size:10px;color:#64748b">Gemini 2.0 Flash · Gratuito · Ottimo per italiano</div>
            </div>
            <span style="margin-left:auto;background:#4285f420;color:#60a5fa;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">FREE</span>
          </div>
          <input id="setup-gemini-key" class="form-control" type="password" placeholder="AIzaSyxxxxxxxxxxxxxxx" style="margin-bottom:8px">
          <button onclick="AISetupGuide.saveKey('gemini')" style="width:100%;padding:8px;background:linear-gradient(135deg,#4285f4,#60a5fa);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">✨ Attiva Gemini</button>
        </div>
      </div>

      <div style="text-align:center">
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:#475569;cursor:pointer;font-size:12px">Continua in modalità demo →</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e=>{if(e.target===modal)modal.remove();});
  },

  saveKey(provider){
    const keyEl = eid(`setup-${provider}-key`);
    const key = keyEl?.value?.trim();
    if(!key || key.length < 10){ toast('Chiave non valida — controlla e riprova','warning'); return; }

    if(provider==='groq'){
      localStorage.setItem('ingly_groq_key', key);
      localStorage.setItem('ingly_groq_model', 'llama-3.3-70b-versatile');
    } else if(provider==='gemini'){
      localStorage.setItem('ingly_gemini_key', key);
    }
    localStorage.setItem('ingly_ai_provider', provider);

    document.querySelector('[style*="position:fixed"][style*="9999"]')?.remove();
    toast(`🚀 AI ${provider==='groq'?'Groq ⚡':'Gemini ✨'} attivata! Tutti i moduli AI sono ora disponibili.`, 'info');
    Settings.load?.();
  },
};

// Hook: show AI setup guide when AI is used without key
(function(){
  const _origDemo = AIDemoMode.get.bind(AIDemoMode);
  AIDemoMode.get = function(prompt){
    const res = _origDemo(prompt);
    // Show setup guide after 3 demo uses
    const count = (+localStorage.getItem('ingly_demo_uses')||0) + 1;
    localStorage.setItem('ingly_demo_uses', count);
    if(count >= 3 && !localStorage.getItem('ingly_ai_provider_set')){
      setTimeout(()=>AISetupGuide.show(), 1500);
      localStorage.setItem('ingly_ai_provider_set','prompted');
    }
    return res + '\n\n—\n💡 *Risposta demo — [Configura AI gratuita](javascript:AISetupGuide.show()) per risposte reali*';
  };
})();

// ══════════════════════════════════════════════════════════════════
// COMPETITOR PRICE TRACKER
// ══════════════════════════════════════════════════════════════════
const BizAI = {

  _tab: 'opportunity',

  async _callAI(prompt, maxTokens=2000) {
    return await AIProvider.call(prompt, maxTokens);
  },

  _noKey() {
    return `<div style="background:linear-gradient(135deg,#1e1b4b,#0f172a);border:1.5px solid #6366f1;border-radius:14px;padding:24px;text-align:center;margin:32px auto;max-width:480px">
      <div style="font-size:48px;margin-bottom:12px">🔑</div>
      <div style="color:#a5b4fc;font-weight:700;font-size:16px;margin-bottom:8px">API Key non configurata</div>
      <div style="color:#818cf8;font-size:13px;margin-bottom:18px">Vai in Impostazioni e configura la chiave AI (Gemini gratuito o Anthropic).</div>
      <button onclick="App.navigate('settings')" style="padding:10px 22px;background:#6366f1;color:#fff;border:none;border-radius:9px;font-weight:700;cursor:pointer;font-size:13px">⚙️ Vai alle Impostazioni</button>
    </div>`;
  },

  _errMsg(e) {
    if(e.message==='NO_KEY') return this._noKey();
    if(e.message==='INVALID_KEY') return `<div style="color:#ef4444;padding:24px;text-align:center;border:1px solid #ef444440;border-radius:12px;margin:20px 0"><div style="font-size:32px;margin-bottom:8px">❌</div><div style="font-weight:700;margin-bottom:6px">API Key non valida</div><div style="font-size:13px">Verifica la chiave in Impostazioni.</div></div>`;
    if(e.message==='RATE_LIMIT') return `<div style="color:#f59e0b;padding:24px;text-align:center;border:1px solid #f59e0b40;border-radius:12px;margin:20px 0"><div style="font-size:32px;margin-bottom:8px">⏱</div><div style="font-weight:700;margin-bottom:6px">Troppe richieste</div><div style="font-size:13px">Attendi 30 secondi e riprova.</div></div>`;
    return `<div style="color:#f97316;padding:24px;text-align:center;border:1px solid #f9731640;border-radius:12px;margin:20px 0"><div style="font-size:32px;margin-bottom:8px">⚠️</div><div style="font-weight:700;margin-bottom:6px">Errore AI</div><div style="font-size:13px">${e.message}</div></div>`;
  },

  _loader(msg) {
    return `<div style="text-align:center;padding:52px 20px">
      <div style="width:48px;height:48px;border:3px solid var(--border);border-top-color:#f59e0b;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 16px"></div>
      <div style="color:var(--text-muted);font-size:14px;font-weight:500">${msg}</div>
    </div>`;
  },

  _tabBtn(id, icon, label, active) {
    const isActive = active === id;
    return `<button onclick="BizAI.switchTab('${id}')" style="display:flex;align-items:center;gap:7px;padding:10px 16px;border-radius:9px;border:1.5px solid ${isActive?'#f59e0b':'var(--border)'};background:${isActive?'#f59e0b20':'transparent'};color:${isActive?'#f59e0b':'var(--text-muted)'};cursor:pointer;font-size:13px;font-weight:${isActive?'700':'500'};white-space:nowrap;transition:all .2s">
      <span style="font-size:16px">${icon}</span>${label}
    </button>`;
  },

  switchTab(tab) {
    this._tab = tab;
    this.render();
  },

  async render() {
    const el = eid('view-bizai');
    if(!el) return;
    const hasKey = AIProvider.hasKey();
    const tab = this._tab;

    el.innerHTML = `
<div style="padding:20px;max-width:1100px">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
    <h2 style="color:#f59e0b;margin:0;font-size:22px">⚡ Business AI Hub</h2>
    <span style="font-size:11px;background:#f59e0b15;color:#f59e0b;padding:3px 10px;border-radius:99px;border:1px solid #f59e0b30;font-weight:700">v1.0</span>
  </div>
  <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px">Il tuo consulente business AI — opportunità, prodotti, prezzi, fornitori</p>

  ${!hasKey ? `<div style="background:#f59e0b15;border:1px solid #f59e0b40;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;display:flex;align-items:center;gap:10px"><span style="font-size:20px">⚠️</span><span>API Key non configurata. <button onclick="App.navigate('settings')" style="background:none;border:none;color:#f59e0b;cursor:pointer;font-weight:700;font-size:13px;padding:0">→ Impostazioni</button></span></div>` : ''}

  <!-- TABS -->
  <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
    ${this._tabBtn('opportunity','🎯','Opportunità del Mese',tab)}
    ${this._tabBtn('products','💡','Nuovi Prodotti',tab)}
    ${this._tabBtn('pricing','💰','Analisi Prezzi',tab)}
    ${this._tabBtn('suppliers','🏭','Fornitori & Materiali',tab)}
  </div>

  <div id="bizai-tab-content">
    ${tab==='opportunity' ? BizAI._renderOpportunityTab() : ''}
    ${tab==='products' ? BizAI._renderProductsTab() : ''}
    ${tab==='pricing' ? BizAI._renderPricingTab() : ''}
    ${tab==='suppliers' ? BizAI._renderSuppliersTab() : ''}
  </div>
</div>`;
  },

  // ─── TAB 1: OPPORTUNITÀ DEL MESE ───────────────────────────────────
  _renderOpportunityTab() {
    return `<div>
      <div style="display:grid;grid-template-columns:320px 1fr;gap:20px">
        <!-- FORM -->
        <div style="background:var(--bg-card);border-radius:12px;padding:18px;border:1px solid var(--border)">
          <div style="font-weight:700;color:#f59e0b;margin-bottom:14px;font-size:13px">🎯 ANALISI CONTESTO</div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Mese di riferimento</label>
            <input class="form-control" id="biz-opp-month" type="month" value="${new Date().toISOString().substring(0,7)}">
          </div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Categoria principale</label>
            <select class="form-control" id="biz-opp-cat">
              <option value="legno laser">Legno Laser (taglieri, decori, nomi)</option>
              <option value="acrilico laser">Acrilico Laser (insegne, targhe, gadget)</option>
              <option value="personalizzazione prodotti">Personalizzazione Prodotti</option>
              <option value="articoli matrimonio">Articoli Matrimonio & Eventi</option>
              <option value="regali aziendali">Regali Aziendali</option>
              <option value="bomboniere">Bomboniere & Cerimonie</option>
              <option value="decorazioni casa">Decorazioni Casa</option>
              <option value="tutto artigianato laser">Tutto Artigianato Laser</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Canale di vendita principale</label>
            <select class="form-control" id="biz-opp-channel">
              <option value="Etsy">Etsy</option>
              <option value="Instagram + vendita diretta">Instagram + vendita diretta</option>
              <option value="mercatini artigianali">Mercatini Artigianali</option>
              <option value="sito web proprio">Sito Web Proprio</option>
              <option value="B2B aziendale">B2B Aziendale</option>
              <option value="tutti i canali">Tutti i canali</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Budget marketing mensile (€)</label>
            <input class="form-control" id="biz-opp-budget" type="number" value="100" min="0">
          </div>

          <button onclick="BizAI.runOpportunity()" style="width:100%;padding:12px;background:#f59e0b;color:#000;border:none;border-radius:9px;font-weight:700;cursor:pointer;font-size:14px">
            🚀 Analizza Opportunità
          </button>
        </div>

        <!-- OUTPUT -->
        <div id="biz-opp-output" style="background:var(--bg-card);border-radius:12px;padding:24px;border:1px solid var(--border)">
          <div style="text-align:center;padding:40px 20px;color:var(--text-muted)">
            <div style="font-size:52px;margin-bottom:14px">🎯</div>
            <div style="font-size:15px;color:var(--text);margin-bottom:10px">Analisi Opportunità del Mese</div>
            <div style="font-size:13px;line-height:1.8">
              Scopri <strong>cosa vendere questo mese</strong> basato su:<br>
              stagionalità italiana • trend Etsy live • eventi del calendario • psicologia acquisto
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  async runOpportunity() {
    const out = eid('biz-opp-output');
    if(!out) return;
    out.innerHTML = this._loader('Analisi opportunità di mercato in corso…');

    const month = eid('biz-opp-month')?.value || new Date().toISOString().substring(0,7);
    const cat = eid('biz-opp-cat')?.value || 'artigianato laser';
    const channel = eid('biz-opp-channel')?.value || 'Etsy';
    const budget = eid('biz-opp-budget')?.value || '100';

    const [d,y] = [new Date(month+'-01'), month.split('-')];
    const monthName = d.toLocaleDateString('it-IT',{month:'long',year:'numeric'});

    let salesCtx = '';
    try {
      const sales = await AppStore.get('sales');
      if(sales.length) {
        const top = Object.entries(sales.reduce((acc,s)=>{ const k=s.productName||s.description||'Altro'; acc[k]=(acc[k]||0)+(+s.amount||0); return acc; },{}))
          .sort((a,b)=>b[1]-a[1]).slice(0,5);
        salesCtx = `\nTuoi top prodotti per revenue: ${top.map(([k,v])=>`${k} (€${v.toFixed(0)})`).join(', ')}.`;
      }
    } catch(_){}

    const prompt = `Sei un consulente business esperto di artigianato laser e mercato italiano/europeo. Analisi CONCRETA e PRATICA.

CONTESTO ARTIGIANA:
- Categoria: ${cat}
- Canale principale: ${channel}
- Mese analisi: ${monthName}
- Budget marketing: €${budget}/mese${salesCtx}

COMPITO: Crea un piano opportunità CONCRETO per ${monthName}.

Rispondi ESATTAMENTE con questo schema:

🏆 TOP 3 PRODOTTI DA SPINGERE QUESTO MESE
Per ogni prodotto:
• Nome prodotto specifico
• Perché ora (stagionalità/evento/trend)
• Prezzo di vendita consigliato (€)
• Costo stimato materiali (€)
• Margine atteso (%)
• 2 hook per social media

📅 EVENTI E RICORRENZE DI ${monthName.toUpperCase()}
Lista completa eventi italiani + europei rilevanti con date precise e opportunità concrete

📈 TREND ETSY QUESTO MESE
5 keyword/prodotti in crescita su Etsy per la tua categoria con volume ricerche stimato e competizione (bassa/media/alta)

💬 STRATEGIA CONTENUTI (${budget>50?'budget presente':'budget minimo'})
Piano settimanale concreto: cosa postare, quando, su quale piattaforma

⚡ 3 QUICK WIN (azioni entro 48 ore)
Azioni immediate ad alto impatto con ROI stimato

Sii SPECIFICO con cifre reali, non generici. Pensa come un imprenditore esperto di Etsy e social selling italiano.`;

    try {
      const text = await this._callAI(prompt, 2500);
      out.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div style="font-weight:700;color:#f59e0b;font-size:15px">🎯 Opportunità — ${monthName}</div>
          <button onclick="navigator.clipboard.writeText(eid('biz-opp-text').innerText).then(()=>toast('Copiato!','success'))" style="padding:6px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);cursor:pointer;font-size:12px">📋 Copia</button>
        </div>
        <div id="biz-opp-text" style="font-size:13px;line-height:1.85;color:var(--text);white-space:pre-wrap">${text}</div>`;
    } catch(e) {
      out.innerHTML = this._errMsg(e);
    }
  },

  // ─── TAB 2: NUOVI PRODOTTI ──────────────────────────────────────────
  _renderProductsTab() {
    return `<div>
      <div style="display:grid;grid-template-columns:320px 1fr;gap:20px">
        <div style="background:var(--bg-card);border-radius:12px;padding:18px;border:1px solid var(--border)">
          <div style="font-weight:700;color:#10b981;margin-bottom:14px;font-size:13px">💡 GENERATORE PRODOTTI</div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Materiali disponibili</label>
            <textarea class="form-control" id="biz-prod-materials" rows="3" placeholder="Es: legno compensato 3mm e 5mm, acrilico trasparente e colorato, MDF, sughero...">${'legno compensato 3mm e 5mm, acrilico, MDF, sughero'}</textarea>
          </div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Macchinari & strumenti</label>
            <textarea class="form-control" id="biz-prod-tools" rows="2" placeholder="Es: laser CO2 80W, stampante 3D, plotter da taglio...">${'laser CO2, incisore laser'}</textarea>
          </div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Target cliente</label>
            <select class="form-control" id="biz-prod-target">
              <option value="privati gift personalized">Privati — regali personalizzati</option>
              <option value="coppie matrimonio">Coppie — matrimoni & cerimonie</option>
              <option value="aziende B2B">Aziende — regali aziendali B2B</option>
              <option value="mamme bambini">Mamme & bambini</option>
              <option value="amanti animali">Amanti degli animali</option>
              <option value="sportivi outdoor">Sportivi & outdoor</option>
              <option value="tutti">Tutti i target</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Fascia prezzo target (€)</label>
            <select class="form-control" id="biz-prod-price">
              <option value="5-20">€5–€20 (volume alto)</option>
              <option value="20-50" selected>€20–€50 (bilanciato)</option>
              <option value="50-150">€50–€150 (premium)</option>
              <option value="150+">€150+ (lusso artigianale)</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Tendenza da seguire (opzionale)</label>
            <input class="form-control" id="biz-prod-trend" placeholder="Es: cottagecore, dark academia, personalizzazione animali...">
          </div>

          <button onclick="BizAI.runProducts()" style="width:100%;padding:12px;background:#10b981;color:#fff;border:none;border-radius:9px;font-weight:700;cursor:pointer;font-size:14px">
            💡 Genera Idee Prodotto
          </button>
        </div>

        <div id="biz-prod-output" style="background:var(--bg-card);border-radius:12px;padding:24px;border:1px solid var(--border)">
          <div style="text-align:center;padding:40px 20px;color:var(--text-muted)">
            <div style="font-size:52px;margin-bottom:14px">💡</div>
            <div style="font-size:15px;color:var(--text);margin-bottom:10px">Generatore Nuovi Prodotti</div>
            <div style="font-size:13px;line-height:1.8">
              AI analizza i tuoi materiali + trend mercato + psicologia acquisto<br>
              e genera <strong>10 idee prodotto concrete e vendibili</strong> con:<br>
              prezzo, margine, difficoltà, canale ideale, titolo Etsy pronto
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  async runProducts() {
    const out = eid('biz-prod-output');
    if(!out) return;
    out.innerHTML = this._loader('Generazione idee prodotto in corso…');

    const materials = eid('biz-prod-materials')?.value || 'legno, acrilico';
    const tools = eid('biz-prod-tools')?.value || 'laser';
    const target = eid('biz-prod-target')?.value || 'privati';
    const price = eid('biz-prod-price')?.value || '20-50';
    const trend = eid('biz-prod-trend')?.value || '';

    const prompt = `Sei un product strategist esperto di e-commerce artigianale, Etsy Italia, e trend di consumo europei.

PROFILO ARTIGIANA:
- Materiali: ${materials}
- Macchinari: ${tools}  
- Target cliente: ${target}
- Range prezzo: €${price}
- Trend da seguire: ${trend || 'nessuno specifico, scegli tu i trend più caldi'}

COMPITO: Genera 10 idee prodotto CONCRETE, NUOVE e VENDIBILI.

Per ogni prodotto rispondi con:

━━━━━━━━━━━━━━━━━━━━━━━━
💡 PRODOTTO [N]: [NOME PRODOTTO]
━━━━━━━━━━━━━━━━━━━━━━━━
📝 Descrizione: [cosa è esattamente, 1 riga]
🎯 Perché vende: [trend/bisogno/emozione che soddisfa]
💰 Prezzo vendita: €[X] — Costo materiali: €[Y] — Margine: [Z]%
⏱ Tempo produzione: [X] minuti
📦 Varianti possibili: [lista varianti personalizzabili]
🛒 Titolo Etsy pronto: "[titolo ottimizzato SEO 130 char]"
📱 Hook social (1 riga per fermare lo scroll): "[testo]"
🏆 Difficoltà produzione: [Facile/Media/Avanzata]
📈 Potenziale vendita: [Basso/Medio/Alto/Virale]
━━━━━━━━━━━━━━━━━━━━━━━━

Alla fine aggiungi:
🌟 TOP 3 DA INIZIARE SUBITO: [numeri] con motivazione

Sii SPECIFICO: nomi prodotto veri, cifre reali, titoli Etsy pronti all'uso. Non essere generico.`;

    try {
      const text = await this._callAI(prompt, 3000);
      out.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div style="font-weight:700;color:#10b981;font-size:15px">💡 10 Idee Prodotto</div>
          <button onclick="navigator.clipboard.writeText(eid('biz-prod-text').innerText).then(()=>toast('Copiato!','success'))" style="padding:6px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);cursor:pointer;font-size:12px">📋 Copia tutto</button>
        </div>
        <div id="biz-prod-text" style="font-size:13px;line-height:1.85;color:var(--text);white-space:pre-wrap">${text}</div>`;
    } catch(e) {
      out.innerHTML = this._errMsg(e);
    }
  },

  // ─── TAB 3: ANALISI PREZZI ──────────────────────────────────────────
  _renderPricingTab() {
    return `<div>
      <div style="display:grid;grid-template-columns:320px 1fr;gap:20px">
        <div style="background:var(--bg-card);border-radius:12px;padding:18px;border:1px solid var(--border)">
          <div style="font-weight:700;color:#a855f7;margin-bottom:14px;font-size:13px">💰 PRICE INTELLIGENCE</div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Prodotto da analizzare</label>
            <input class="form-control" id="biz-price-product" placeholder="Es: tagliere personalizzato con nome in legno">
          </div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Il tuo prezzo attuale (€)</label>
            <input class="form-control" id="biz-price-current" type="number" step="0.50" placeholder="Es: 28.00">
          </div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Costo materiali (€)</label>
            <input class="form-control" id="biz-price-material" type="number" step="0.10" placeholder="Es: 4.50">
          </div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Tempo produzione (minuti)</label>
            <input class="form-control" id="biz-price-time" type="number" placeholder="Es: 25">
          </div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Posizionamento</label>
            <select class="form-control" id="biz-price-position">
              <option value="economico">Economico (volume)</option>
              <option value="medio" selected>Medio (bilanciato)</option>
              <option value="premium">Premium (qualità)</option>
              <option value="lusso artigianale">Lusso Artigianale</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Mercato target</label>
            <select class="form-control" id="biz-price-market">
              <option value="Italia">Italia</option>
              <option value="Europa (IT+DE+FR+UK)" selected>Europa</option>
              <option value="Global Etsy">Global Etsy</option>
              <option value="USA Etsy">USA Etsy</option>
            </select>
          </div>

          <button onclick="BizAI.runPricing()" style="width:100%;padding:12px;background:#a855f7;color:#fff;border:none;border-radius:9px;font-weight:700;cursor:pointer;font-size:14px">
            💰 Analizza Prezzi
          </button>
        </div>

        <div id="biz-price-output" style="background:var(--bg-card);border-radius:12px;padding:24px;border:1px solid var(--border)">
          <div style="text-align:center;padding:40px 20px;color:var(--text-muted)">
            <div style="font-size:52px;margin-bottom:14px">💰</div>
            <div style="font-size:15px;color:var(--text);margin-bottom:10px">Price Intelligence AI</div>
            <div style="font-size:13px;line-height:1.8">
              AI analizza il mercato Etsy e consiglia:<br>
              • Se stai <strong>sotto-prezzando</strong> o sopra-prezzando<br>
              • Il <strong>prezzo psicologico ottimale</strong> per convertire<br>
              • Strategie di pricing per aumentare il ticket medio
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  async runPricing() {
    const out = eid('biz-price-output');
    if(!out) return;
    out.innerHTML = this._loader('Analisi prezzi di mercato in corso…');

    const product = eid('biz-price-product')?.value || '';
    const current = eid('biz-price-current')?.value || '0';
    const material = eid('biz-price-material')?.value || '0';
    const time = eid('biz-price-time')?.value || '0';
    const position = eid('biz-price-position')?.value || 'medio';
    const market = eid('biz-price-market')?.value || 'Europa';

    const laborCost = parseFloat(current) > 0
      ? (parseFloat(time) * 0.50 / 60).toFixed(2)
      : '0';
    const totalCost = (parseFloat(material) + parseFloat(laborCost)).toFixed(2);
    const margin = parseFloat(current) > 0
      ? (((parseFloat(current)-parseFloat(totalCost))/parseFloat(current))*100).toFixed(0)
      : '?';

    const prompt = `Sei un esperto di pricing per e-commerce artigianale con profonda conoscenza di Etsy, mercati europei e psicologia del prezzo.

PRODOTTO IN ANALISI:
- Prodotto: ${product || 'prodotto artigianale laser personalizzato'}
- Prezzo attuale: €${current}
- Costo materiali: €${material}
- Tempo produzione: ${time} minuti
- Costo lavoro stimato (€0.50/min): €${laborCost}
- Costo totale stimato: €${totalCost}
- Margine attuale: ${margin}%
- Posizionamento desiderato: ${position}
- Mercato target: ${market}

COMPITO: Analisi prezzi COMPLETA e STRATEGICA.

Rispondi con:

📊 BENCHMARK MERCATO
- Range prezzi Etsy per questo prodotto: da €X a €Y
- Prezzo mediano competitor: €X
- Prezzo top seller: €X
- Il tuo prezzo vs mercato: [sotto/nella media/sopra] del X%

🎯 VERDETTO
[Stai sotto-prezzando/prezzando correttamente/sovra-prezzando] — con spiegazione concreta

💡 PREZZO OTTIMALE CONSIGLIATO: €X
Motivazione psicologica e di mercato

📈 STRATEGIA PRICING IN 3 STEP
Step 1 (ora): [azione immediata]
Step 2 (30 giorni): [ottimizzazione]
Step 3 (90 giorni): [posizionamento premium]

🧠 PSICOLOGIA DEL PREZZO
- Soglie psicologiche da rispettare (es. €X.99 vs €X.00)
- Come comunicare il valore per giustificare il prezzo
- Upsell e bundle consigliati con prezzi specifici

💰 OTTIMIZZAZIONE MARGINI
- Margine attuale: ${margin}%
- Margine target consigliato: X%
- Come raggiungerlo: [azioni concrete]
- Revenue extra mensile stimata applicando i consigli: €X (ipotesi 30 vendite/mese)

Sii diretto, usa cifre reali basate su dati di mercato Etsy 2024-2025.`;

    try {
      const text = await this._callAI(prompt, 2000);
      out.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div style="font-weight:700;color:#a855f7;font-size:15px">💰 Price Intelligence — ${product||'Prodotto'}</div>
          <button onclick="navigator.clipboard.writeText(eid('biz-price-text').innerText).then(()=>toast('Copiato!','success'))" style="padding:6px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);cursor:pointer;font-size:12px">📋 Copia</button>
        </div>
        <div id="biz-price-text" style="font-size:13px;line-height:1.85;color:var(--text);white-space:pre-wrap">${text}</div>`;
    } catch(e) {
      out.innerHTML = this._errMsg(e);
    }
  },

  // ─── TAB 4: FORNITORI & MATERIALI ──────────────────────────────────
  _renderSuppliersTab() {
    return `<div>
      <div style="display:grid;grid-template-columns:320px 1fr;gap:20px">
        <div style="background:var(--bg-card);border-radius:12px;padding:18px;border:1px solid var(--border)">
          <div style="font-weight:700;color:#06b6d4;margin-bottom:14px;font-size:13px">🏭 RICERCA FORNITORI</div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Materiale o prodotto cercato</label>
            <input class="form-control" id="biz-sup-material" placeholder="Es: legno compensato betulla 3mm, acrilico colorato, MDF, sughero...">
          </div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Zona geografica preferita</label>
            <select class="form-control" id="biz-sup-geo">
              <option value="Italia">Italia (consegna veloce)</option>
              <option value="Europa UE" selected>Europa UE (no dazi)</option>
              <option value="Global (Alibaba/AliExpress)">Global — Alibaba/AliExpress</option>
              <option value="tutti">Tutti — voglio confrontare</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Quantità acquisto mensile stimata</label>
            <select class="form-control" id="biz-sup-qty">
              <option value="piccola (meno di 50 pezzi)">Piccola (&lt;50 pz/mese)</option>
              <option value="media (50-200 pezzi)" selected>Media (50–200 pz/mese)</option>
              <option value="grande (200+ pezzi)">Grande (200+ pz/mese)</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Priorità nella scelta</label>
            <select class="form-control" id="biz-sup-priority">
              <option value="prezzo minimo">Prezzo minimo</option>
              <option value="qualità massima" selected>Qualità massima</option>
              <option value="velocità consegna">Velocità consegna</option>
              <option value="sostenibilità (FSC, eco)">Sostenibilità (FSC/eco)</option>
              <option value="MOQ basso (piccoli ordini)">MOQ basso</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Note aggiuntive</label>
            <textarea class="form-control" id="biz-sup-notes" rows="2" placeholder="Es: deve essere compatibile laser CO2, spessore specifico, certificato FSC..."></textarea>
          </div>

          <button onclick="BizAI.runSuppliers()" style="width:100%;padding:12px;background:#06b6d4;color:#000;border:none;border-radius:9px;font-weight:700;cursor:pointer;font-size:14px">
            🏭 Trova Fornitori
          </button>
        </div>

        <div id="biz-sup-output" style="background:var(--bg-card);border-radius:12px;padding:24px;border:1px solid var(--border)">
          <div style="text-align:center;padding:40px 20px;color:var(--text-muted)">
            <div style="font-size:52px;margin-bottom:14px">🏭</div>
            <div style="font-size:15px;color:var(--text);margin-bottom:10px">Ricerca Fornitori & Materiali</div>
            <div style="font-size:13px;line-height:1.8">
              AI ti guida verso i <strong>migliori fornitori</strong>:<br>
              • Nomi e piattaforme specifiche dove cercare<br>
              • Prezzi di mercato di riferimento<br>
              • Consigli per negoziare prezzi migliori<br>
              • Alternative low-cost con stessa qualità
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  async runSuppliers() {
    const out = eid('biz-sup-output');
    if(!out) return;
    out.innerHTML = this._loader('Ricerca fornitori in corso…');

    const material = eid('biz-sup-material')?.value || 'materiali per laser';
    const geo = eid('biz-sup-geo')?.value || 'Europa UE';
    const qty = eid('biz-sup-qty')?.value || 'media';
    const priority = eid('biz-sup-priority')?.value || 'qualità massima';
    const notes = eid('biz-sup-notes')?.value || '';

    const prompt = `Sei un esperto di supply chain e acquisti per piccole aziende artigianali italiane specializzate in lavorazioni laser (CO2 e diodo). Hai conoscenza approfondita del mercato dei materiali per laser cutting/engraving.

RICHIESTA MATERIALE:
- Materiale cercato: ${material}
- Zona geografica: ${geo}
- Quantità mensile: ${qty}
- Priorità: ${priority}
- Note specifiche: ${notes || 'nessuna'}

COMPITO: Fornisci una guida PRATICA e CONCRETA per approvvigionarsi.

Rispondi con:

🏭 TOP 5 FORNITORI CONSIGLIATI
Per ogni fornitore:
• Nome fornitore/piattaforma
• Sito web o dove trovarlo
• Specializzazione
• Range prezzi indicativi (€/mq o €/pezzo o €/kg)
• MOQ (ordine minimo)
• Tempi consegna Italia
• Pro e contro
• Consiglio specifico per laser

💡 DOVE CERCARE ONLINE
Piattaforme specifiche con URL:
- Italia: [siti specifici italiani]
- Europa: [siti specifici europei]
- Global: [marketplace con sezione specifica]
- Marketplace laser specifici: [nomi]

💰 PREZZI DI MERCATO 2024-2025
Range prezzi realistici per ${material}:
- Qualità base: €X
- Qualità media: €X
- Qualità premium: €X
Come capire se un prezzo è giusto o troppo alto

🤝 COME NEGOZIARE
Script pratico per chiedere sconto ai fornitori:
"[messaggio template da inviare]"
Tattiche specifiche per piccoli artigiani

⚡ ALTERNATIVA SMART
Materiale alternativo meno costoso con stesse performance laser + dove trovarlo

🚨 RED FLAG
Cosa evitare assolutamente quando si acquista ${material} per uso laser

Sii CONCRETO con nomi reali di fornitori, URL reali, cifre reali. Questo è per un artigiano che deve prendere decisioni di acquisto oggi.`;

    try {
      const text = await this._callAI(prompt, 2500);
      out.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div style="font-weight:700;color:#06b6d4;font-size:15px">🏭 Fornitori — ${material}</div>
          <button onclick="navigator.clipboard.writeText(eid('biz-sup-text').innerText).then(()=>toast('Copiato!','success'))" style="padding:6px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);cursor:pointer;font-size:12px">📋 Copia</button>
        </div>
        <div id="biz-sup-text" style="font-size:13px;line-height:1.85;color:var(--text);white-space:pre-wrap">${text}</div>`;
    } catch(e) {
      out.innerHTML = this._errMsg(e);
    }
  }
};


const AICoach = {
  async _buildRealContext(){
    try{
      const sales = await AppStore.get('sales').catch(()=>[]);
      const clients = await AppStore.get('clients').catch(()=>[]);
      const quotes = await AppStore.get('quotes').catch(()=>[]);
      const orders = await AppStore.get('orders').catch(()=>[]);
      const now = new Date();
      const thisMonth = now.toISOString().slice(0,7);
      const lastMonth = new Date(now.getFullYear(),now.getMonth()-1,1).toISOString().slice(0,7);
      const mRev = sales.filter(s=>s.status==='pagato'&&s.date?.slice(0,7)===thisMonth).reduce((a,s)=>a+(+s.amount||0),0);
      const lRev = sales.filter(s=>s.status==='pagato'&&s.date?.slice(0,7)===lastMonth).reduce((a,s)=>a+(+s.amount||0),0);
      const ytd = sales.filter(s=>s.status==='pagato'&&new Date(s.date||0).getFullYear()===now.getFullYear()).reduce((a,s)=>a+(+s.amount||0),0);
      const pending = sales.filter(s=>s.status==='da_pagare').reduce((a,s)=>a+(+s.amount||0),0);
      // Top products
      const prodMap={};
      sales.filter(s=>s.status==='pagato').forEach(s=>{const k=(s.desc||'Altro').split(' ').slice(0,4).join(' ');prodMap[k]=(prodMap[k]||0)+(+s.amount||0);});
      const topProds=Object.entries(prodMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,v])=>`${n} (€${v.toFixed(0)})`).join(', ');
      // Channels
      const chMap={};
      sales.filter(s=>s.status==='pagato').forEach(s=>{const ch=s.channel||'Altro';chMap[ch]=(chMap[ch]||0)+(+s.amount||0);});
      const topChannels=Object.entries(chMap).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([n,v])=>`${n}: €${v.toFixed(0)}`).join(', ');
      return {
        revenue_this_month: mRev, revenue_last_month: lRev, revenue_ytd: ytd,
        pending_payments: pending, total_clients: clients.length,
        active_orders: orders.filter(o=>o.status!=='delivered').length,
        open_quotes: quotes.filter(q=>q.status==='inviato'||q.status==='bozza').length,
        top_products: topProds||'Nessun dato',
        top_channels: topChannels||'Nessun dato',
        trend: mRev>lRev?`+${((mRev/Math.max(lRev,1)-1)*100).toFixed(0)}% vs mese scorso`:`${((mRev/Math.max(lRev,1)-1)*100).toFixed(0)}% vs mese scorso`,
      };
    }catch(e){ return {}; }
  },

  render(){
    const el = eid('view-aicoach');
    if(!el) return;
    el.innerHTML = `
    <div style="padding:20px;max-width:960px">
      <h2 style="color:#f59e0b;margin-bottom:4px">🧠 AI Coach</h2>
      <p style="color:var(--text-muted);margin-bottom:20px">Il tuo coach personale analizza i dati di Ingly e ti dice esattamente su cosa concentrarti questa settimana.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div style="background:var(--bg-card);border-radius:var(--radius);padding:18px;border:1px solid var(--border)">
          <h3 style="font-size:13px;color:var(--text-muted);margin-bottom:12px">📊 Cosa analizzare</h3>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${[['vendite','📦 Vendite ultime 4 settimane'],['margini','💰 Margini per prodotto'],['clienti','👤 Clienti più attivi'],['scorte','📦 Scorte critiche'],['obiettivi','🎯 Obiettivi mensili'],['mercato','📈 Trend di mercato']].map(([v,l])=>`
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
              <input type="checkbox" value="${v}" class="coach-check" checked style="accent-color:var(--primary)"> ${l}
            </label>`).join('')}
          </div>
        </div>
        <div style="background:var(--bg-card);border-radius:var(--radius);padding:18px;border:1px solid var(--border)">
          <h3 style="font-size:13px;color:var(--text-muted);margin-bottom:12px">🎯 Il tuo contesto</h3>
          <div style="margin-bottom:12px">
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Tipo di business</label>
            <select id="coach-biz" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px">
              <option>Artigianato creativo (Etsy/B2C)</option>
              <option>B2B / Grossisti</option>
              <option>Misto B2C + B2B</option>
              <option>Servizi personalizzati su commissione</option>
            </select>
          </div>
          <div style="margin-bottom:12px">
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Obiettivo principale questa settimana</label>
            <select id="coach-goal" style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px">
              <option>Aumentare fatturato</option>
              <option>Ridurre costi</option>
              <option>Trovare nuovi clienti</option>
              <option>Ottimizzare produzione</option>
              <option>Migliorare margini</option>
              <option>Lanciare nuovo prodotto</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Note aggiuntive (opzionale)</label>
            <textarea id="coach-notes" rows="3" placeholder="es. Ho una fiera sabato, devo preparare 50 pezzi..." style="width:100%;padding:8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;resize:none;box-sizing:border-box"></textarea>
          </div>
        </div>
      </div>
      <button onclick="AICoach.generate()" style="padding:12px 28px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:15px;margin-bottom:20px">
        🧠 Genera Briefing Settimanale
      </button>
      <div id="coach-output"></div>
    </div>`;
  },

  async generate(){
    const checks = [...document.querySelectorAll('.coach-check:checked')].map(c=>c.value);
    const biz   = eid('coach-biz')?.value || '';
    const goal  = eid('coach-goal')?.value || '';
    const notes = eid('coach-notes')?.value || '';
    const out   = eid('coach-output');
    if(!out) return;
    out.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fas fa-spinner fa-spin" style="font-size:32px;color:var(--primary)"></i><p style="margin-top:16px">Il tuo AI Coach sta analizzando tutti i dati...</p></div>`;
    try {
      const today = new Date();
      const dayName = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'][today.getDay()];
      const prompt = `Sei l'AI Coach di Ingly Master, un gestionale per artigiani e piccole imprese creative italiane.
Oggi è ${dayName} ${today.toLocaleDateString('it-IT')}.
Business: ${biz}
Obiettivo settimana: ${goal}
Aree da analizzare: ${checks.join(', ')}
Note: ${notes||'nessuna'}

Genera un briefing settimanale professionale in italiano con:
1. **🎯 Priorità #1 della settimana** — una sola azione concreta da fare entro venerdì
2. **📋 Piano giornaliero** — cosa fare ogni giorno da oggi a venerdì (max 2 azioni/giorno)
3. **⚠️ Rischi da monitorare** — 2-3 cose a cui prestare attenzione
4. **💡 Insight strategico** — un'opportunità che potrebbe sfuggire
5. **📊 KPI da tracciare** — 3 numeri specifici da misurare questa settimana

Sii specifico, pratico, orientato all'azione. Usa emoji per rendere il testo scannable.`;
      const resp = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:1200,
          messages:[{role:'user',content:prompt}]
        })
      });
      const data = await resp.json();
      const text = data.content?.find(b=>b.type==='text')?.text || 'Errore nella risposta';
      out.innerHTML = `<div style="background:var(--bg-card);border:1px solid #f59e0b40;border-radius:var(--radius);padding:24px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)">
          <span style="font-size:24px">🧠</span>
          <div><strong style="color:#f59e0b">AI Coach — ${dayName} ${today.toLocaleDateString('it-IT')}</strong><br><span style="font-size:12px;color:var(--text-muted)">${biz} · Obiettivo: ${goal}</span></div>
        </div>
        <div style="line-height:1.7;white-space:pre-wrap;font-size:14px">${text.replace(/\*\*(.*?)\*\*/g,'<strong style="color:var(--primary)">$1</strong>')}</div>
        <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);display:flex;gap:8px">
          <button onclick="(typeof AICoach!=='undefined'&&AICoach.render())" style="padding:6px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;font-size:12px">🔄 Rigenera</button>
          <button onclick="navigator.clipboard.writeText(document.querySelector('#coach-output').innerText);toast('📋 Copiato!')" style="padding:6px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;font-size:12px">📋 Copia</button>
        </div>
      </div>`;
    } catch(err) {
      out.innerHTML = `<div style="color:var(--red);padding:20px">Errore: ${err.message}</div>`;
    }
  },

  async analyzeWithRealData(){
    const ctx = await this._buildRealContext();
    const bd = JSON.parse(localStorage.getItem('ingly_brand_identity')||'{}');
    const resultEl = eid('coach-result');
    if(resultEl) resultEl.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted)">⏳ AI analizza i tuoi dati reali...</div>';
    const checks = Array.from(document.querySelectorAll('.coach-check')).filter(c=>c.checked).map(c=>c.value);
    const prompt = `Sei il coach di ${bd.brand_name||'Ingly Design'} — artigiano laser Made in Sicily.\n\nDATI REALI:\n- Revenue questo mese: €${(ctx.revenue_this_month||0).toFixed(0)} ${ctx.trend||''}\n- Revenue YTD: €${(ctx.revenue_ytd||0).toFixed(0)}\n- Da incassare: €${(ctx.pending_payments||0).toFixed(0)}\n- Clienti: ${ctx.total_clients||0} | Ordini attivi: ${ctx.active_orders||0} | Preventivi aperti: ${ctx.open_quotes||0}\n- Top prodotti: ${ctx.top_products||'—'}\n- Canali: ${ctx.top_channels||'—'}\n\nAnalisi richiesta: ${checks.join(', ')||'completa'}\n\nRispondi con 5 punti concreti e specifici:\n1. 🎯 AZIONE PRIORITARIA QUESTA SETTIMANA\n2. 💰 OPPORTUNITÀ REVENUE IMMEDIATA\n3. ⚠️ RISCHIO DA GESTIRE\n4. 📈 COSA REPLICARE\n5. 🔧 PROCESSO DA OTTIMIZZARE\nUsa i numeri reali, sii diretto.`;
    try {
      const res = await AIProvider.call(prompt, 1200);
      if(resultEl) resultEl.innerHTML = `<div style="white-space:pre-wrap;font-size:13px;line-height:1.9;color:var(--text)">${res}</div>`;
    } catch(e) {
      if(resultEl) resultEl.innerHTML = `<div style="color:var(--orange);padding:16px;border-radius:8px;background:var(--bg-card2)">⚠️ ${e.message==='NO_KEY'?'Configura la chiave AI in Impostazioni':e.message}</div>`;
    }
  },


};

// ════════════════════════════════════════════════════════════════;

// ════════════════════════════════════════════════════════════════════
// BARCODE SCANNER — Camera → leggi barcode → aggiorna magazzino
// ════════════════════════════════════════════════════════════════════
const Store = (function() {
  // v87 AI modules use Store.get() - bridge to v86 AppStore cache
  const _cache = {};
  
  function getAll(storeName) {
    // Try AppStore cache first (synchronous via _cache)
    if (_cache[storeName]) return _cache[storeName];
    // Return empty array as fallback for AI modules 
    return [];
  }
  
  // Populate cache from AppStore when data loads
  async function hydrate(stores) {
    for (const s of stores) {
      try {
        const data = await AppStore.get(s);
        _cache[s] = Array.isArray(data) ? data : [];
      } catch(e) {}
    }
  }
  
  // Auto-hydrate when app boots
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
      await hydrate(['clients','sales','catalog','inventory','cashflow','items','paints','equipment','projects','orders','quotes']);
    }, 2000);
  });
  
  // Also expose refresh
  function refresh(storeName, data) {
    if (storeName) _cache[storeName] = data;
  }
  
  return { get: getAll, refresh, hydrate };
})();

// ═══════════════════════════════════════════════════
// AI ENGINE v88 — Machine Learning & Predictive Analytics
// ═══════════════════════════════════════════════════
const AI = (function() {
  const ss = window.ss; // simple-statistics
  const KMeans = window.ml_kmeans?.KMeans;

  // Linear forecast
  function linearForecast(data, steps = 30) {
    if (!ss || data.length < 2) return null;
    const points = data.map((y, x) => [x, y]);
    const regression = ss.linearRegression(points);
    const line = ss.linearRegressionLine(regression);
    const forecast = [];
    for (let i = 0; i < steps; i++) {
      forecast.push(line(data.length + i));
    }
    return forecast;
  }

  // Detect anomalies using IQR
  function detectAnomalies(data, valueKey = 'amount') {
    if (!Array.isArray(data) || data.length < 4) return [];
    const values = data.map(d => parseFloat(d[valueKey]) || 0).filter(v => v > 0);
    if (values.length === 0) return [];
    const q1 = ss.quantile(values, 0.25);
    const q3 = ss.quantile(values, 0.75);
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    return data.filter(d => {
      const v = parseFloat(d[valueKey]) || 0;
      return v < lower || v > upper;
    });
  }

  // Calculate RFM scores for clients
  function calculateRFM() {
    const clients = Store.get('clients');
    const sales = Store.get('sales').filter(s => s.status === 'pagato');
    const now = Date.now();
    const oneDay = 86400000;

    return clients.map(c => {
      const clientSales = sales.filter(s => s.clientId === c.id);
      if (clientSales.length === 0) return { ...c, recency: 999, frequency: 0, monetary: 0 };

      const lastDate = new Date(Math.max(...clientSales.map(s => new Date(s.date).getTime())));
      const recency = Math.floor((now - lastDate) / oneDay);
      const frequency = clientSales.length;
      const monetary = clientSales.reduce((acc, s) => acc + parseFloat(s.amount || 0), 0);
      return { ...c, recency, frequency, monetary };
    });
  }

  // Cluster clients using k-means (requires ml-kmeans)
  function clusterClients(k = 3) {
    const rfm = calculateRFM().filter(c => c.frequency > 0); // only active
    if (rfm.length < k || !KMeans) return [];

    // Normalize recency (lower is better) -> invert so higher recency becomes lower score
    const maxRecency = Math.max(...rfm.map(c => c.recency));
    const maxFreq = Math.max(...rfm.map(c => c.frequency));
    const maxMon = Math.max(...rfm.map(c => c.monetary));

    const data = rfm.map(c => [
      1 - (c.recency / maxRecency), // normalized recency score
      c.frequency / maxFreq,
      c.monetary / maxMon
    ]);

    const kmeans = new KMeans({ k, maxIterations: 100 });
    const clusters = kmeans.predict(data);
    return rfm.map((c, i) => ({ ...c, cluster: clusters[i] }));
  }

  // Market basket analysis: find frequent product pairs
  function findFrequentPairs(minSupport = 0.1) {
    const sales = Store.get('sales').filter(s => s.status === 'pagato' && s.productId);
    if (sales.length < 5) return [];

    const productIds = [...new Set(sales.map(s => s.productId).filter(Boolean))];
    const pairs = {};
    const total = sales.length;

    // Group sales by client to consider transactions (multiple items per client may be separate sales)
    // For simplicity, we treat each sale as a transaction containing one product.
    // So we'll look for products bought by the same client within a short time window? Too complex.
    // Instead, we'll use product co-occurrence in the same sale (if a sale could have multiple products, but currently each sale has one product).
    // Alternative: Use orders? Orders can have multiple products? In current system, orders are single product. So skip for now.
    // We'll implement a simple rule: if two products are bought by the same client frequently.
    // Group by clientId and count pairs.
    const clientProducts = {};
    sales.forEach(s => {
      if (!s.productId) return;
      if (!clientProducts[s.clientId]) clientProducts[s.clientId] = new Set();
      clientProducts[s.clientId].add(s.productId);
    });

    Object.values(clientProducts).forEach(products => {
      const list = Array.from(products);
      for (let i = 0; i < list.length; i++) {
        for (let j = i+1; j < list.length; j++) {
          const key = [list[i], list[j]].sort().join('|');
          pairs[key] = (pairs[key] || 0) + 1;
        }
      }
    });

    const supportThreshold = minSupport * Object.keys(clientProducts).length;
    const frequentPairs = Object.entries(pairs)
      .filter(([_, count]) => count >= supportThreshold)
      .map(([key, count]) => ({ pair: key.split('|'), count }));

    return frequentPairs;
  }

  // Calculate reorder points
  function calculateReorderPoints() {
    const inventory = Store.get('inventory');
    const sales = Store.get('sales').filter(s => s.status === 'pagato');
    // Map sales to materials? Not direct. We'll use product category as proxy for now.
    // For demo, we'll compute average daily consumption of each material by counting how many products sold that likely use that material.
    // This is a simplification.
    const productMaterialMap = {}; // productId -> material? Not available.
    // We'll just return the inventory with a suggested reorder point based on minStock and average usage.
    return inventory.map(item => {
      // Dummy calculation: assume each sale of a product in category matching material consumes 1 unit of material
      const usage = sales.filter(s => s.productCategory === item.category).length / 30; // daily average over last 30 days
      const leadTime = 7; // days (could be stored per supplier)
      const safetyStock = item.minStock;
      const reorderPoint = usage * leadTime + safetyStock;
      return { ...item, reorderPoint: Math.ceil(reorderPoint) };
    });
  }

  return {
    linearForecast,
    detectAnomalies,
    calculateRFM,
    clusterClients,
    findFrequentPairs,
    calculateReorderPoints
  };
})();


// ═══════════════════════════════════════════════════
// 19. NEW AI MODULES
// ═══════════════════════════════════════════════════

// AI Predictor

// ── AI Predictor: Previsioni Vendite ──────────────────────────────────
const AIPredictor = {
  async render(){
    const el = document.getElementById('view-ai-predictor');
    if(!el) return;
    el.innerHTML = '<div style="padding:20px"><div style="display:flex;align-items:center;gap:12px;margin-bottom:20px"><div style="width:42px;height:42px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px">🔮</div><div><h2 style="margin:0;font-size:20px;font-weight:900">Previsioni Vendite AI</h2><p style="margin:3px 0 0;font-size:12px;color:var(--text-muted)">Analisi trend e forecast basato sui tuoi dati storici</p></div></div><div id="ai-pred-content" style="text-align:center;padding:30px;color:var(--text-muted)">⏳ Analisi in corso...</div></div>';
    try {
      const sales = await AppStore.get('sales').catch(()=>[]);
      const paid  = sales.filter(s=>s.status==='pagato');
      const now   = new Date();
      // Build monthly data
      const months = [];
      for(let i=11;i>=0;i--){
        const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const label = d.toLocaleDateString('it-IT',{month:'short',year:'2-digit'});
        const rev = paid.filter(s=>(s.date||'').startsWith(key)).reduce((a,s)=>a+(+s.amount||0),0);
        months.push({label, rev, key});
      }
      const totalRevenue = paid.reduce((a,s)=>a+(+s.amount||0),0);
      const avgMonthly   = totalRevenue/12;
      const lastMonth    = months[months.length-1].rev;
      const lastLastMonth= months[months.length-2].rev;
      const trend        = lastLastMonth>0 ? (lastMonth-lastLastMonth)/lastLastMonth*100 : 0;
      // Simple linear forecast (next 3 months)
      const recent3      = months.slice(-3).map(m=>m.rev);
      const avgRecent    = recent3.reduce((a,v)=>a+v,0)/3;
      const forecastNext = Math.round(avgRecent*(1+trend/100/3));
      const maxRev       = Math.max(...months.map(m=>m.rev),1);
      
      const el2 = document.getElementById('ai-pred-content');
      if(el2) el2.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px">
        ${[
          {l:'Revenue Anno',  v:'€'+Math.round(totalRevenue), c:'#22c55e', ico:'💶'},
          {l:'Media Mensile', v:'€'+Math.round(avgMonthly),   c:'#818cf8', ico:'📊'},
          {l:'Tendenza',      v:(trend>=0?'+':'')+Math.round(trend)+'%', c:trend>=0?'#22c55e':'#ef4444', ico:'📈'},
          {l:'Forecast pross.',v:'€'+forecastNext, c:'#fbbf24', ico:'🔮'},
        ].map(k=>`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:24px;margin-bottom:4px">${k.ico}</div>
          <div style="font-size:18px;font-weight:900;color:${k.c}">${k.v}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${k.l}</div>
        </div>`).join('')}
      </div>
      <!-- Chart bars -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:14px">
        <div style="font-size:13px;font-weight:800;margin-bottom:14px">📊 Andamento mensile (12 mesi)</div>
        <div style="display:flex;align-items:flex-end;gap:4px;height:100px">
          ${months.map((m,i)=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
            <div style="width:100%;height:${Math.max(2,Math.round(m.rev/maxRev*80))}px;background:${i===months.length-1?'#6366f1':'#6366f150'};border-radius:3px 3px 0 0;transition:.4s" title="${m.label}: €${Math.round(m.rev)}"></div>
            <div style="font-size:8px;color:var(--text-dim);white-space:nowrap">${m.label}</div>
          </div>`).join('')}
          <!-- Forecast -->
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;opacity:.7">
            <div style="width:100%;height:${Math.max(2,Math.round(forecastNext/maxRev*80))}px;background:repeating-linear-gradient(45deg,#fbbf24 0,#fbbf24 3px,transparent 3px,transparent 6px);border-radius:3px 3px 0 0;border:1px dashed #fbbf24"></div>
            <div style="font-size:8px;color:#fbbf24;white-space:nowrap">forecast</div>
          </div>
        </div>
      </div>
      <!-- Insights -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px">
        <div style="font-size:13px;font-weight:800;margin-bottom:10px">💡 Insights automatici</div>
        <div style="display:flex;flex-direction:column;gap:7px">
          ${trend>10?`<div style="background:rgba(34,197,94,.08);border-left:3px solid #22c55e;border-radius:8px;padding:9px 12px;font-size:12px;color:#22c55e">🚀 <strong>Crescita forte</strong>: trend +${Math.round(trend)}% — mantieni la strategia attuale</div>`:''}
          ${trend<-10?`<div style="background:rgba(239,68,68,.08);border-left:3px solid #ef4444;border-radius:8px;padding:9px 12px;font-size:12px;color:#ef4444">⚠️ <strong>Calo rilevato</strong>: trend ${Math.round(trend)}% — rivedi prezzi e marketing</div>`:''}
          ${avgMonthly>0?`<div style="background:rgba(99,102,241,.08);border-left:3px solid #6366f1;border-radius:8px;padding:9px 12px;font-size:12px;color:#818cf8">📊 <strong>Media mensile</strong>: €${Math.round(avgMonthly)} — prevedo €${forecastNext} il prossimo mese</div>`:''}
          ${paid.length===0?`<div style="background:var(--bg-card2);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--text-muted)">📝 Aggiungi vendite con status "pagato" per vedere le previsioni</div>`:''}
        </div>
      </div>`;
    } catch(e) {
      const el2=document.getElementById('ai-pred-content');
      if(el2) el2.innerHTML=`<div style="color:var(--text-muted);padding:20px">Errore: ${e.message}</div>`;
    }
  }
};

// ── AI Reorder: Riordino Intelligente ────────────────────────────────
const AIReorder = {
  async render(){
    const el=document.getElementById('view-ai-reorder');
    if(!el)return;
    el.innerHTML='<div style="padding:20px"><div style="display:flex;align-items:center;gap:12px;margin-bottom:20px"><div style="width:42px;height:42px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px">📦</div><div><h2 style="margin:0;font-size:20px;font-weight:900">Riordino Intelligente</h2><p style="margin:3px 0 0;font-size:12px;color:var(--text-muted)">Materiali da riordinare in base allo stock e ai consumi</p></div></div><div id="ai-reorder-list" style="text-align:center;padding:20px;color:var(--text-muted)">⏳ Analisi stock...</div></div>';
    try{
      const items = await AppStore.get('items').catch(()=>[]);
      const critical = items.filter(i=>(+i.qty||+i.quantity||+i.stock||0)<=(+i.minStock||+i.minQty||3));
      const warning  = items.filter(i=>{const q=+i.qty||+i.quantity||0; const min=+i.minStock||+i.minQty||3; return q>min && q<=min*2;});
      const el2=document.getElementById('ai-reorder-list');
      if(!el2)return;
      if(!items.length){el2.innerHTML='<div style="background:var(--bg-card2);border-radius:10px;padding:20px;text-align:center;color:var(--text-muted)">Aggiungi materiali nel Magazzino per il riordino automatico</div>';return;}
      el2.innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
        ${[
          {l:'Esauriti/Critici',v:critical.length,c:'#ef4444',ico:'🔴'},
          {l:'In esaurimento',  v:warning.length,  c:'#f59e0b',ico:'🟡'},
          {l:'In ordine',       v:items.length-critical.length-warning.length,c:'#22c55e',ico:'✅'},
        ].map(k=>`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:11px;text-align:center">
          <div style="font-size:20px">${k.ico}</div>
          <div style="font-size:18px;font-weight:900;color:${k.c}">${k.v}</div>
          <div style="font-size:10px;color:var(--text-muted)">${k.l}</div>
        </div>`).join('')}
      </div>
      ${critical.length?`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:12px">
        <div style="padding:10px 14px;background:rgba(239,68,68,.08);border-bottom:1px solid var(--border);font-size:12px;font-weight:800;color:#ef4444">🔴 Da riordinare subito (${critical.length})</div>
        ${critical.map(i=>`<div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
          <div style="flex:1;font-size:12px;font-weight:700">${i.name||'—'}</div>
          <div style="font-size:11px;color:#ef4444;font-weight:700">Stock: ${+i.qty||+i.quantity||0} ${i.unit||'pz'}</div>
          <div style="font-size:10px;color:var(--text-muted)">Min: ${+i.minStock||3}</div>
          <a href="${i.supplierUrl||'https://www.google.com/search?q='+encodeURIComponent(i.name+' acquisto')}" target="_blank" style="padding:4px 10px;background:var(--primary);color:#000;border-radius:6px;font-size:10px;font-weight:800;text-decoration:none">🛒 Ordina</a>
        </div>`).join('')}
      </div>`:``}
      ${warning.length?`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden">
        <div style="padding:10px 14px;background:rgba(245,158,11,.08);border-bottom:1px solid var(--border);font-size:12px;font-weight:800;color:#f59e0b">🟡 In esaurimento presto (${warning.length})</div>
        ${warning.map(i=>`<div style="padding:9px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
          <div style="flex:1;font-size:12px">${i.name||'—'}</div>
          <div style="font-size:11px;color:#f59e0b;font-weight:700">Stock: ${+i.qty||+i.quantity||0} ${i.unit||'pz'}</div>
        </div>`).join('')}
      </div>`:``}`;
    }catch(e){const el2=document.getElementById('ai-reorder-list');if(el2)el2.innerHTML=`<div style="color:#ef4444;padding:10px">${e.message}</div>`;}
  }
};

// ── AI CLV: CLV & Segmentazione ──────────────────────────────────────
const AICLV = {
  async render(){
    const el=document.getElementById('view-ai-clv');
    if(!el)return;
    el.innerHTML='<div style="padding:20px"><div style="display:flex;align-items:center;gap:12px;margin-bottom:20px"><div style="width:42px;height:42px;background:linear-gradient(135deg,#a855f7,#7c3aed);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px">👥</div><div><h2 style="margin:0;font-size:20px;font-weight:900">CLV & Segmentazione Clienti</h2><p style="margin:3px 0 0;font-size:12px;color:var(--text-muted)">Valore lifetime cliente, segmenti RFM, clienti VIP</p></div></div><div id="ai-clv-content" style="text-align:center;padding:20px;color:var(--text-muted)">⏳ Calcolo CLV...</div></div>';
    try{
      const [clients,sales]=await Promise.all([AppStore.get('clients').catch(()=>[]),AppStore.get('sales').catch(()=>[])]);
      const paid=sales.filter(s=>s.status==='pagato');
      const now=Date.now();
      // Enrich clients with RFM
      const enriched=clients.map(cl=>{
        const cSales=paid.filter(s=>s.clientId===cl.id||(s.clientName||'').toLowerCase()===(cl.name||'').toLowerCase());
        const revenue=cSales.reduce((a,s)=>a+(+s.amount||0),0);
        const lastDate=cSales.length?Math.max(...cSales.map(s=>new Date(s.date||0).getTime())):0;
        const days=lastDate?Math.floor((now-lastDate)/864e5):999;
        return {...cl,_revenue:revenue,_orders:cSales.length,_days:days,_clv:revenue};
      }).filter(c=>c._orders>0).sort((a,b)=>b._revenue-a._revenue);
      
      const vip=enriched.filter(c=>c._revenue>=500);
      const active=enriched.filter(c=>c._days<90);
      const atRisk=enriched.filter(c=>c._days>=90&&c._days<365);
      const avgClv=enriched.length?enriched.reduce((a,c)=>a+c._revenue,0)/enriched.length:0;
      
      const el2=document.getElementById('ai-clv-content');
      if(!el2)return;
      el2.innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
        ${[
          {l:'CLV Medio',    v:'€'+Math.round(avgClv),   c:'#a855f7',ico:'💎'},
          {l:'Clienti VIP',  v:vip.length,               c:'#fbbf24',ico:'⭐'},
          {l:'Clienti Attivi',v:active.length,           c:'#22c55e',ico:'🟢'},
          {l:'A rischio',    v:atRisk.length,            c:'#ef4444',ico:'⚠️'},
        ].map(k=>`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:11px;text-align:center">
          <div style="font-size:20px">${k.ico}</div>
          <div style="font-size:18px;font-weight:900;color:${k.c}">${k.v}</div>
          <div style="font-size:10px;color:var(--text-muted)">${k.l}</div>
        </div>`).join('')}
      </div>
      ${enriched.length?`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden">
        <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:800">🏆 Top clienti per CLV</div>
        ${enriched.slice(0,8).map((cl,i)=>`<div style="padding:9px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
          <div style="width:24px;height:24px;border-radius:6px;background:${i<3?'linear-gradient(135deg,#fbbf24,#f59e0b)':'var(--bg-card2)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:${i<3?'#000':'var(--text-muted)'};flex-shrink:0">${i+1}</div>
          <div style="flex:1;font-size:12px;font-weight:700">${cl.name||'—'}</div>
          <div style="font-size:10px;color:var(--text-muted)">${cl._orders} ordini · ${cl._days<90?'🟢 Attivo':'⚠️ A rischio'}</div>
          <div style="font-size:13px;font-weight:900;color:#a855f7">€${Math.round(cl._revenue)}</div>
          <button onclick="Clients.renderClientPanel(${cl.id})" style="padding:3px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:10px">👤</button>
        </div>`).join('')}
      </div>`:
      `<div style="background:var(--bg-card2);border-radius:10px;padding:20px;text-align:center;color:var(--text-muted)">Aggiungi clienti e vendite per la segmentazione CLV</div>`}`;
    }catch(e){const el2=document.getElementById('ai-clv-content');if(el2)el2.innerHTML=`<div style="color:#ef4444;padding:10px">${e.message}</div>`;}
  }
};

// ── AI Anomaly: Anomalie Finanziarie ──────────────────────────────────
const AIAnomaly = {
  async render(){
    const el=document.getElementById('view-ai-anomaly');
    if(!el)return;
    el.innerHTML='<div style="padding:20px"><div style="display:flex;align-items:center;gap:12px;margin-bottom:20px"><div style="width:42px;height:42px;background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px">⚠️</div><div><h2 style="margin:0;font-size:20px;font-weight:900">Anomalie Finanziarie</h2><p style="margin:3px 0 0;font-size:12px;color:var(--text-muted)">Rilevamento automatico di anomalie nel cashflow e nelle vendite</p></div></div><div id="ai-anomaly-list" style="text-align:center;padding:20px;color:var(--text-muted)">⏳ Analisi anomalie...</div></div>';
    try{
      const [sales,cashflow]=await Promise.all([AppStore.get('sales').catch(()=>[]),AppStore.get('cashflow').catch(()=>[])]);
      const anomalies=[];
      const paid=sales.filter(s=>s.status==='pagato');
      
      // Anomaly 1: Very high single sale (>3x average)
      const avgSale=paid.length?paid.reduce((a,s)=>a+(+s.amount||0),0)/paid.length:0;
      paid.filter(s=>(+s.amount||0)>avgSale*3).forEach(s=>{
        anomalies.push({type:'high_sale',severity:'info',title:`Vendita alta: €${s.amount}`,desc:`€${Math.round(avgSale)} è la media — ${Math.round(+s.amount/avgSale)}x la media`,date:s.date});
      });
      
      // Anomaly 2: Month with 0 revenue
      const now=new Date();
      for(let i=1;i<=6;i++){
        const d=new Date(now.getFullYear(),now.getMonth()-i,1);
        const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const rev=paid.filter(s=>(s.date||'').startsWith(key)).reduce((a,s)=>a+(+s.amount||0),0);
        if(rev===0) anomalies.push({type:'zero_month',severity:'warning',title:`Nessuna vendita: ${d.toLocaleDateString('it-IT',{month:'long',year:'numeric'})}`,desc:'Mese senza entrate — verifica il periodo',date:key});
      }
      
      // Anomaly 3: Large expense spike
      const expenses=cashflow.filter(x=>x.type==='uscita');
      const avgExp=expenses.length?expenses.reduce((a,x)=>a+(+x.amount||0),0)/expenses.length:0;
      expenses.filter(x=>(+x.amount||0)>avgExp*4).forEach(x=>{
        anomalies.push({type:'high_expense',severity:'warning',title:`Spesa alta: €${x.amount} — ${x.desc||x.cat||''}`,desc:`Oltre 4x la media (€${Math.round(avgExp)})`,date:x.date});
      });

      const el2=document.getElementById('ai-anomaly-list');
      if(!el2)return;
      if(!anomalies.length){
        el2.innerHTML=`<div style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);border-radius:12px;padding:24px;text-align:center">
          <div style="font-size:40px;margin-bottom:10px">✅</div>
          <div style="font-size:15px;font-weight:800;color:#22c55e;margin-bottom:6px">Nessuna anomalia rilevata!</div>
          <div style="font-size:12px;color:var(--text-muted)">I tuoi dati finanziari sembrano nella norma.</div>
        </div>`;return;
      }
      el2.innerHTML=`<div style="display:flex;flex-direction:column;gap:8px">
        ${anomalies.slice(0,10).map(a=>{
          const s={info:'rgba(99,102,241,.08)|#818cf8|ℹ️',warning:'rgba(245,158,11,.08)|#f59e0b|⚠️',danger:'rgba(239,68,68,.08)|#ef4444|🚨'}[a.severity]||'rgba(99,102,241,.08)|#818cf8|ℹ️';
          const [bg,col,ico]=s.split('|');
          return `<div style="background:${bg};border-left:3px solid ${col};border-radius:9px;padding:11px 13px">
            <div style="font-size:12px;font-weight:800;color:${col};margin-bottom:3px">${ico} ${a.title}</div>
            <div style="font-size:11px;color:var(--text-muted)">${a.desc}</div>
            ${a.date?`<div style="font-size:10px;color:var(--text-dim);margin-top:3px">📅 ${a.date}</div>`:''}
          </div>`;
        }).join('')}
      </div>`;
    }catch(e){const el2=document.getElementById('ai-anomaly-list');if(el2)el2.innerHTML=`<div style="color:#ef4444;padding:10px">${e.message}</div>`;}
  }
};

// ── AI Dashboard: AI Insights ──────────────────────────────────────────
const AIDashboard = {
  async render(){
    const el=document.getElementById('view-ai-dashboard');
    if(!el)return;
    el.innerHTML='<div style="padding:20px"><div style="display:flex;align-items:center;gap:12px;margin-bottom:20px"><div style="width:42px;height:42px;background:linear-gradient(135deg,#06b6d4,#0891b2);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px">🤖</div><div><h2 style="margin:0;font-size:20px;font-weight:900">AI Business Insights</h2><p style="margin:3px 0 0;font-size:12px;color:var(--text-muted)">Analisi intelligente del tuo business con suggerimenti pratici</p></div></div><div id="ai-dash-content" style="text-align:center;padding:20px;color:var(--text-muted)">⏳ Generazione insights...</div></div>';
    try{
      const [sales,clients,catalog,cashflow]=await Promise.all([
        AppStore.get('sales').catch(()=>[]),AppStore.get('clients').catch(()=>[]),
        AppStore.get('catalog').catch(()=>[]),AppStore.get('cashflow').catch(()=>[]),
      ]);
      const paid=sales.filter(s=>s.status==='pagato');
      const totalRev=paid.reduce((a,s)=>a+(+s.amount||0),0);
      const totalExp=cashflow.filter(x=>x.type==='uscita').reduce((a,x)=>a+(+x.amount||0),0);
      const profit=totalRev-totalExp;
      const margin=totalRev>0?Math.round(profit/totalRev*100):0;
      const now=new Date();
      const mKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const monthRev=paid.filter(s=>(s.date||'').startsWith(mKey)).reduce((a,s)=>a+(+s.amount||0),0);
      
      // Generate insights
      const insights=[];
      if(totalRev===0) insights.push({type:'empty',ico:'📊',title:'Inizia a registrare le vendite',desc:'Aggiungi vendite pagate per vedere gli insights del business.',c:'#818cf8'});
      if(margin<20&&totalRev>0) insights.push({type:'margin',ico:'💸',title:'Margine basso ('+margin+'%)',desc:'Il margine è sotto il 20% — rivedi i prezzi del catalogo o riduci i costi.',c:'#ef4444'});
      if(margin>=40) insights.push({type:'good_margin',ico:'💰',title:'Margine eccellente ('+margin+'%)',desc:'Ottimo lavoro! Il margine sopra il 40% è molto buono per un artigiano.',c:'#22c55e'});
      
      const lowCat=catalog.filter(p=>p.costPrice>0&&p.salePrice>0&&(p.salePrice-p.costPrice)/p.salePrice<0.2);
      if(lowCat.length>0) insights.push({type:'catalog',ico:'📦',title:lowCat.length+' prodotti sotto il 20% di margine',desc:'Considera di alzare i prezzi o ridurre i costi di produzione.',c:'#f59e0b'});
      
      const inactiveClients=clients.filter(cl=>{
        const cSales=paid.filter(s=>s.clientId===cl.id||(s.clientName||'').toLowerCase()===(cl.name||'').toLowerCase());
        if(!cSales.length)return false;
        const last=Math.max(...cSales.map(s=>new Date(s.date||0).getTime()));
        return Math.floor((Date.now()-last)/864e5)>90;
      });
      if(inactiveClients.length>0) insights.push({type:'clients',ico:'👥',title:inactiveClients.length+' clienti inattivi da >90gg',desc:'Considera una campagna di ricontatto WhatsApp o email.',c:'#a855f7'});
      
      if(monthRev>0) insights.push({type:'month',ico:'📅',title:'Questo mese: €'+Math.round(monthRev),desc:'Revenue del mese corrente. Aggiorna le vendite ogni giorno per una previsione precisa.',c:'#06b6d4'});
      
      const el2=document.getElementById('ai-dash-content');
      if(!el2)return;
      el2.innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
        ${[
          {l:'Revenue totale',v:'€'+Math.round(totalRev),c:'#22c55e',ico:'💶'},
          {l:'Profitto',      v:'€'+Math.round(profit),  c:profit>=0?'#22c55e':'#ef4444',ico:'📈'},
          {l:'Margine',       v:margin+'%',              c:margin>=40?'#22c55e':margin>=20?'#f59e0b':'#ef4444',ico:'🎯'},
          {l:'Questo mese',  v:'€'+Math.round(monthRev), c:'#818cf8',ico:'📅'},
        ].map(k=>`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:11px;text-align:center">
          <div style="font-size:20px">${k.ico}</div>
          <div style="font-size:18px;font-weight:900;color:${k.c}">${k.v}</div>
          <div style="font-size:10px;color:var(--text-muted)">${k.l}</div>
        </div>`).join('')}
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${insights.map(ins=>`<div style="background:${ins.c}10;border-left:3px solid ${ins.c};border-radius:9px;padding:12px 14px">
          <div style="font-size:13px;font-weight:800;color:${ins.c};margin-bottom:4px">${ins.ico} ${ins.title}</div>
          <div style="font-size:12px;color:var(--text-muted)">${ins.desc}</div>
        </div>`).join('')}
        ${insights.length===0?'<div style="background:var(--bg-card2);border-radius:10px;padding:20px;text-align:center;color:var(--text-muted)">Nessun insight disponibile — aggiungi più dati</div>':''}
      </div>`;
    }catch(e){const el2=document.getElementById('ai-dash-content');if(el2)el2.innerHTML=`<div style="color:#ef4444;padding:10px">${e.message}</div>`;}
  }
};

// ═══════════════════════════════════════════════════
// 20. DEFAULT DATA — Pre-populated database (esteso con productId per sales)
// ═══════════════════════════════════════════════════


// ═══════════ AI Navigation Handlers v88 ═══════════
(function(){
  const _origNavigate = App.navigate.bind(App);
  const _AI_SECTIONS = {
    'ai-predictor': () => { if(typeof AIPredictor !== "undefined") (typeof AIPredictor!=='undefined'&&AIPredictor.render()); },
    'ai-reorder': () => { if(typeof AIReorder !== "undefined") (typeof AIReorder!=='undefined'&&AIReorder.render()); },
    'ai-clv': () => { if(typeof AICLV !== "undefined") (typeof AICLV!=='undefined'&&AICLV.render()); },
    'ai-anomaly': () => { if(typeof AIAnomaly !== "undefined") (typeof AIAnomaly!=='undefined'&&AIAnomaly.render()); },
    'ai-dashboard': () => { if(typeof AIDashboard !== "undefined") (typeof AIDashboard!=='undefined'&&AIDashboard.render()); }

  };
  App.navigate = function(section, ...args) {
    if (_AI_SECTIONS[section]) {
      _origNavigate(section, ...args);
      setTimeout(() => {
        try { _AI_SECTIONS[section](); } catch(e) { console.warn('[AI Nav]', section, e); }
      }, 100);
    } else {
      _origNavigate(section, ...args);
    }
  };
})();
window.AILayer = AILayer;
window.ProductIntelligence = ProductIntelligence;
window.CLVDash = CLVDash;
window.DemandPredictor = DemandPredictor;
window.SmartNotif = SmartNotif;
window.VoiceInput = VoiceInput;
window.AIDemoMode = AIDemoMode;
window.AIStudio = typeof AIStudio !== 'undefined' ? AIStudio : {};
window.DesignStudio = DesignStudio;
window.DataLayer = DataLayer;
window.DecisionEngine = DecisionEngine;
window.OpportunityScanner = OpportunityScanner;
window.IntelHub = IntelHub;
window.AISetupGuide = AISetupGuide;
window.BizAI = BizAI;
window.AICoach = AICoach;
window.Store = Store;
window.AI = AI;
window.AIPredictor = AIPredictor;
window.AIReorder = AIReorder;
window.AICLV = AICLV;
window.AIAnomaly = AIAnomaly;
window.AIDashboard = AIDashboard;

