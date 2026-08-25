
// === /src/modules/dashboard/index.js ===
// Dashboard Module - INGLY OS v88
const KPIEngine={
  async run(){
    // Prefer BDW (Single Source of Truth) when ready; fallback to IDB direct
    let revenue=0, unpaid=0, income=0, expenses=0, converted=0, totalQuotes=0,
        totalSales=0, totalClients=0, lowStock=0, invValue=0;

    try {
      await BDW.init();
      const m = BDW.metrics;
      const raw = BDW._raw || {};
      const now = new Date();
      const monthStart = new Date(now.getFullYear(),now.getMonth(),1).getTime();
      const allSales = raw.allSales || [];
      const mSales = allSales.filter(s => new Date(s.date||0).getTime() >= monthStart);
      revenue = m.revenue.mtd;
      unpaid = mSales.filter(s => s.status==='da_pagare').reduce((a,s)=>a+(+s.amount||0),0);
      const cf = raw.cashflow || [];
      income   = cf.filter(c=>c.type==='entrata'&&new Date(c.date||0).getTime()>=monthStart).reduce((a,c)=>a+(+c.amount||0),0);
      expenses = cf.filter(c=>c.type==='uscita'&&new Date(c.date||0).getTime()>=monthStart).reduce((a,c)=>a+(+c.amount||0),0);
      const quotes = raw.quotes || [];
      converted = quotes.filter(q=>q.status==='confermato').length;
      totalQuotes = quotes.length;
      totalSales = mSales.length;
      totalClients = (raw.clients||[]).length;
      const items = raw.items || [];
      lowStock = items.filter(i=>(+(i.quantity??i.stock??0)) <= (+(i.minStock??1))).length;
      invValue = items.reduce((a,i)=>(+(i.quantity??i.stock??0))*(+(i.costPrice??i.cost??0))+a,0);
    } catch(e) {
      // BDW not ready — fallback to direct IDB
      const [sales,quotes,inventory,cashflow,clients]=await Promise.all([
        IDB.getAll('sales').catch(()=>[]),IDB.getAll('quotes').catch(()=>[]),
        IDB.getAll('items').catch(()=>[]),IDB.getAll('cashflow').catch(()=>[]),
        IDB.getAll('clients').catch(()=>[])
      ]);
      const now=new Date();
      const monthStart=new Date(now.getFullYear(),now.getMonth(),1).getTime();
      const mSales=sales.filter(s=>new Date(s.date||0).getTime()>=monthStart);
      revenue=mSales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
      unpaid=mSales.filter(s=>s.status==='da_pagare').reduce((a,s)=>a+(+s.amount||0),0);
      income=cashflow.filter(c=>c.type==='entrata'&&new Date(c.date||0).getTime()>=monthStart).reduce((a,c)=>a+(+c.amount||0),0);
      expenses=cashflow.filter(c=>c.type==='uscita'&&new Date(c.date||0).getTime()>=monthStart).reduce((a,c)=>a+(+c.amount||0),0);
      converted=quotes.filter(q=>q.status==='confermato').length;
      totalQuotes=quotes.length; totalSales=mSales.length; totalClients=clients.length;
      lowStock=inventory.filter(i=>(+i.stock||0)<=(+i.minStock||0)).length;
      invValue=inventory.reduce((a,i)=>(+i.stock||0)*(+i.costPrice||0)+a,0);
    }
    // ► Active orders + overdue + today revenue
    let activeOrders=0,overdueOrders=0,todayRevenue=0,lastMonthRevenue=0;
    try{
      const todayStr2=today();
      const allOrders=await IDB.getAll('orders').catch(()=>[]);
      const ACTIVE_ST=['aperto','in_lavorazione','accettato','in produzione','preventivo','processing','open','attesa','working'];
      activeOrders=allOrders.filter(o=>ACTIVE_ST.includes((o.status||o.stage||'').toLowerCase())).length;
      overdueOrders=allOrders.filter(o=>ACTIVE_ST.includes((o.status||o.stage||'').toLowerCase())&&o.dueDate&&o.dueDate<todayStr2).length;
      const allSales2=await IDB.getAll('sales').catch(()=>[]);
      todayRevenue=allSales2.filter(s=>s.date===todayStr2&&s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
      const now3=new Date();
      const lmS=new Date(now3.getFullYear(),now3.getMonth()-1,1).getTime();
      const lmE=new Date(now3.getFullYear(),now3.getMonth(),0,23,59,59).getTime();
      lastMonthRevenue=allSales2.filter(s=>{const t=new Date(s.date||0).getTime();return s.status==='pagato'&&t>=lmS&&t<=lmE;}).reduce((a,s)=>a+(+s.amount||0),0);
    }catch{}
    const revenueTrend=lastMonthRevenue>0?Math.round((revenue-lastMonthRevenue)/lastMonthRevenue*100):0;

    const kpi={
      revenue,unpaid,income,expenses,netFlow:income-expenses,
      totalSales,avgOrder:totalSales?revenue/totalSales:0,
      convRate:totalQuotes?Math.round(converted/totalQuotes*100):0,
      totalClients,lowStock,invValue,
      profitMargin:revenue>0?((revenue-expenses)/revenue*100):0,
      activeOrders,overdueOrders,todayRevenue,lastMonthRevenue,revenueTrend,
      _src:'BDW', _ts:Date.now()
    };
    await IDB.put('kpi_snap',{period:'month',date:today(),...kpi}).catch(()=>{});
    Bus.emit('kpi:updated',kpi);
    return kpi;
  },
  async renderPage(){
    const kpi=await this.run();
    const el=eid('kpi-page-content');
    if(!el)return;
    const items=[
      {l:'Revenue Mensile',v:fmtCur(kpi.revenue),i:'💰',c:kpi.revenue>2000?'green':'red'},
      {l:'Non Incassato',v:fmtCur(kpi.unpaid),i:'⏳',c:'yellow'},
      {l:'Cashflow Netto',v:fmtCur(kpi.netFlow),i:'💸',c:kpi.netFlow>0?'green':'red'},
      {l:'Tasso Conversione',v:kpi.convRate+'%',i:'🎯',c:kpi.convRate>40?'green':'yellow'},
      {l:'Ordine Medio',v:fmtCur(kpi.avgOrder),i:'🛒',c:'blue'},
      {l:'Clienti Totali',v:kpi.totalClients,i:'👥',c:'blue'},
      {l:'Scorte Basse',v:kpi.lowStock,i:'📦',c:kpi.lowStock>2?'red':'green'},
      {l:'Valore Magazzino',v:fmtCur(kpi.invValue),i:'🏪',c:'blue'},
      {l:'Margine Profitto',v:kpi.profitMargin.toFixed(1)+'%',i:'📈',c:kpi.profitMargin>20?'green':'red'},
    ];
    el.innerHTML=`<div class="grid-3">${items.map(k=>`
      <div class="kpi-card">
        <div class="kpi-icon">${k.i}</div>
        <div class="kpi-value" style="color:${k.c==='green'?'var(--green)':k.c==='red'?'var(--red)':k.c==='yellow'?'var(--primary)':'var(--blue)'}">${k.v}</div>
        <div class="kpi-label">${k.l}</div>
      </div>`).join('')}</div>`;
  }
};

// ===== AI LAYER =====
const Dashboard={
  _refreshTimer: null,
  _startAutoRefresh() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    this._refreshTimer = setInterval(() => {
      if (typeof App !== 'undefined' && App.currentSection === 'dashboard') {
        KPIEngine.run().catch(()=>{});
      }
    }, 5 * 60 * 1000); // refresh every 5 min when on dashboard
  },
  async render(){
    try {

    /* L'Operating Center (Fase 2) è la dashboard del prodotto: possiede la
       vista e disegna KPI, produzione, attenzione, magazzino, macchine,
       redditività e intelligence da un'unica lettura degli store.

       Questa funzione orchestrava una decina di widget che si iniettavano
       ciascuno nel proprio contenitore, creandolo se mancava: lasciarla girare
       significa impilare le due dashboard. Resta come riserva se il modulo
       nuovo non si carica. */
    if (window.InglyDashboard && typeof window.InglyDashboard.render === 'function') {
      window.InglyDashboard.render();
      return;
    }

    const kpi=await KPIEngine.run();
    this.updateKPIs(kpi);
    await this.renderCharts();
    await this.renderRecentSales();
    await this.renderRecentQuotes();
    await this.renderDueSoon();
    if(typeof DashLayout!=='undefined'&&DashLayout.renderSmartActions) await DashLayout.renderSmartActions();
    // Connect DashboardToday widget
    setTimeout(()=>{ if(typeof DashboardToday!=='undefined') DashboardToday.inject(); },300);
    // Connect HealthScore
    setTimeout(()=>{ if(typeof HealthScore!=='undefined') HealthScore.update(); },500);
    // Morning briefing (once per day)
    if(typeof MorningBriefing!=='undefined') MorningBriefing.maybeShow();
    // Subscribe to data changes — auto-refresh KPI strip
    if(!this._subscribed){
      this._subscribed=true;
      AppStore.on('sales',()=>{if(App.currentSection==='dashboard')KPIEngine.run().then(k=>{if(k)this.updateKPIs(k).catch(()=>{});})});
      AppStore.on('orders',()=>{if(App.currentSection==='dashboard')KPIEngine.run().then(k=>{if(k)this.updateKPIs(k).catch(()=>{});})});
    }
    const{decisions}=await AILayer.analyze();
    const alertEl=eid('dashboard-ai-alert');
    // Load Product Intelligence widget async (non-blocking)
    ProductIntelligence.renderWidget('prod-intel-widget');
    if(alertEl&&decisions.filter(d=>d.priority==='critica'||d.priority==='alta').length){
      const urgent=decisions.find(d=>d.priority==='critica')||decisions.find(d=>d.priority==='alta');
      alertEl.innerHTML=`<div class="alert alert-warning mb-16"><i class="fas fa-robot"></i> <strong>AI:</strong> ${urgent.message} <button class="btn btn-sm btn-secondary" style="margin-left:auto" onclick="App.navigate('ai')">Vedi tutto</button></div>`;
    }else if(alertEl)alertEl.innerHTML='';
    } catch(e){ console.error('[Dashboard.render]', e.message||e); }
  },
  async updateKPIs(kpi){
    // Guardia: se chiamata senza kpi (o con oggetto incompleto), ricalcola prima di renderizzare
    if(!kpi||typeof kpi!=='object'){ try{ kpi=await KPIEngine.run(); }catch{ kpi=null; } }
    if(!kpi) return;
    const el=eid('dashboard-kpis')||eid('dash-kpi-grid');if(!el)return; if(el.id==='dashboard-kpis')el.id='dash-kpi-grid';
    const items=[
      {l:'Revenue MTD',v:fmtCur(kpi.revenue),i:'fa-euro-sign',c:'var(--primary)',w:'revenue'},
      {l:'Da Incassare',v:fmtCur(kpi.unpaid),i:'fa-hourglass-half',c:'var(--orange)',w:'unpaid',sub:kpi.unpaid>0?'⚠️ da saldare':'✅'},
      {l:'Cashflow Netto',v:fmtCur(kpi.netFlow),i:'fa-water',c:kpi.netFlow>=0?'var(--green)':'var(--red)',w:'cashflow',sub:kpi.netFlow>=0?'✅ positivo':'⚠️ negativo'},
      {l:'Ordini Attivi',v:kpi.activeOrders??'—',i:'fa-tasks',c:'var(--blue)',w:'active',sub:kpi.overdueOrders>0?`⚠️ ${kpi.overdueOrders} in ritardo`:'✅ in ordine'},
      {l:'Clienti Totali',v:kpi.totalClients||'—',i:'fa-users',c:'var(--green)',w:'clients',sub:'nel database'},
      {l:'Vendite Mese',v:kpi.totalSales||'—',i:'fa-shopping-bag',c:'#8b5cf6',w:'orders',sub:kpi.totalSales>0?`~€${Math.round((kpi.avgOrder||0))} media`:'inizia a vendere'},
    ];
    const trendArrow=kpi.revenueTrend>5?'↑':kpi.revenueTrend<-5?'↓':'→';
    const trendColor=kpi.revenueTrend>5?'#22c55e':kpi.revenueTrend<-5?'#ef4444':'#f59e0b';
    // Update revenue sub to show trend
    items[0].sub=`${trendArrow} ${kpi.revenueTrend>0?'+':''}${kpi.revenueTrend||0}% vs mese scorso`;
    items[0].subColor=trendColor;
    el.innerHTML=items.map((k,i)=>`<div class="kpi-card kpi-draggable" draggable="true" data-widget="${k.w||'w'+i}" style="position:relative;overflow:hidden">
      <i class="fas ${k.i} kpi-icon" style="color:${k.c}"></i>
      <div class="kpi-value">${k.v}</div>
      <div class="kpi-label">${k.l}</div>
      ${k.sub?`<div style="font-size:10px;color:${k.subColor||'var(--text-dim)'};margin-top:2px">${k.sub}</div>`:''}
    </div>`).join('');
    // Init drag-drop after render
    setTimeout(()=>DashLayout?.initDrag(),50);
  },
  async renderCharts(){
    const months=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    const now=new Date();
    const thisYear=now.getFullYear();

    // ── Prefer BDW revenue array (already computed, last 12 months ordered oldest→newest)
    let monthly=new Array(12).fill(0);
    const monthlyOrders=new Array(12).fill(0);
    const monthlyAvg=new Array(12).fill(0);
    let sales = []; // declared outside try/catch so it's accessible below
    try {
      await BDW.init();
      sales = BDW._raw?.allSales || [];
      const bdwArr = BDW.metrics.revenue.revsArr || []; // last12 oldest→newest
      if (bdwArr.length === 12) {
        // bdwArr[0]=11mo ago ... bdwArr[11]=current month. Align to calendar year.
        // Rebuild calendar-year monthly from raw sales for the chart
        sales.filter(s=>s.status==='pagato'&&new Date(s.date||0).getFullYear()===thisYear).forEach(s=>{
          const m=new Date(s.date||0).getMonth();
          monthly[m]+=(+s.amount||0); monthlyOrders[m]++;
        });
      }
    } catch(e) {
      sales = await AppStore.get('sales').catch(()=>[]);
      sales.filter(s=>s.status==='pagato'&&new Date(s.date||0).getFullYear()===thisYear).forEach(s=>{
        const m=new Date(s.date||0).getMonth();
        monthly[m]+=(+s.amount||0); monthlyOrders[m]++;
      });
    }
    monthlyAvg.forEach((_,i)=>monthlyAvg[i]=monthlyOrders[i]?+(monthly[i]/monthlyOrders[i]).toFixed(2):0);
    this._chartData={monthly,monthlyOrders,monthlyAvg,months};

    destroyChart('chart-monthly');
    const cMonthly=eid('chart-monthly');
    if(cMonthly){
      new Chart(cMonthly,{
        type:'bar',
        data:{
          labels:months,
          datasets:[
            {label:'Revenue €',data:monthly,backgroundColor:months.map((_,i)=>i===now.getMonth()?'rgba(99,102,241,0.9)':'rgba(99,102,241,0.35)'),borderColor:'#6366f1',borderWidth:1,borderRadius:4},
            {label:'Trend',data:monthly.map((_,i,a)=>i>0?(a[i]+a[i-1])/2:a[i]),type:'line',borderColor:'#a78bfa',backgroundColor:'transparent',borderWidth:2,pointRadius:2,tension:0.4},
          ]
        },
        options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index'},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${ctx.dataset.type==='line'?'~':''}€${ctx.raw?.toFixed(0)||0}`}}},scales:{y:{beginAtZero:true,ticks:{color:'#64748b',callback:v=>'€'+v.toLocaleString('it')},grid:{color:'#ffffff08'}},x:{ticks:{color:'#64748b'},grid:{display:false}}}}
      });
    }

    // ── Payments doughnut ──────────────────────────────────────
    const paid=sales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0);
    const unpaid=sales.filter(s=>s.status==='da_pagare').reduce((a,s)=>a+(+s.amount||0),0);
    const cancelled=sales.filter(s=>s.status==='annullato').reduce((a,s)=>a+(+s.amount||0),0);
    destroyChart('chart-payments');
    const cPay=eid('chart-payments');
    if(cPay){
      new Chart(cPay,{
        type:'doughnut',
        data:{labels:['Incassato','Da incassare','Annullato'],datasets:[{data:[paid,unpaid,cancelled],backgroundColor:['rgba(34,197,94,0.8)','rgba(251,191,36,0.8)','rgba(239,68,68,0.5)'],borderWidth:0,hoverOffset:4}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{display:false}}}
      });
      const leg=eid('dash-payment-legend');
      if(leg)leg.innerHTML=[{l:'Incassato',v:paid,c:'#22c55e'},{l:'Da incassare',v:unpaid,c:'#fbbf24'},{l:'Annullato',v:cancelled,c:'#ef4444'}]
        .map(x=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><div style="width:10px;height:10px;border-radius:50%;background:${x.c};flex-shrink:0"></div><div><div style="font-size:11px;color:var(--text)">${x.l}</div><div style="font-size:13px;font-weight:700;color:${x.c}">€${x.v.toFixed(0)}</div></div></div>`).join('');
    }

    // ── Channels bar ──────────────────────────────────────────
    const channelMap={};
    sales.filter(s=>s.status==='pagato').forEach(s=>{const ch=s.channel||'Altro';channelMap[ch]=(channelMap[ch]||0)+(+s.amount||0);});
    const chLabels=Object.keys(channelMap).sort((a,b)=>channelMap[b]-channelMap[a]).slice(0,6);
    const chVals=chLabels.map(k=>channelMap[k]);
    const chColors=['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#818cf8','#4f46e5'];
    destroyChart('chart-channels');
    const cCh=eid('chart-channels');
    if(cCh&&chLabels.length){
      new Chart(cCh,{
        type:'bar',
        data:{labels:chLabels,datasets:[{data:chVals,backgroundColor:chColors,borderRadius:4}]},
        options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>'€'+ctx.raw?.toFixed(0)}}},scales:{x:{ticks:{color:'#64748b',callback:v=>'€'+v},grid:{color:'#ffffff08'}},y:{ticks:{color:'#94a3b8'},grid:{display:false}}}}
      });
    }

    // ── Forecast 3 months (linear regression) ───────────────
    const paidSorted=sales.filter(s=>s.status==='pagato').sort((a,b)=>new Date(a.date)-new Date(b.date));
    if(paidSorted.length>=6){
      // Group by month (rolling 12)
      const mRevMap={};
      paidSorted.forEach(s=>{const k=s.date?.slice(0,7);if(k)mRevMap[k]=(mRevMap[k]||0)+(+s.amount||0);});
      const mKeys=Object.keys(mRevMap).sort().slice(-9);
      const mVals=mKeys.map(k=>mRevMap[k]);
      // Simple linear regression
      const n=mVals.length;
      const meanX=(n-1)/2, meanY=mVals.reduce((a,b)=>a+b,0)/n;
      let num=0,den=0;
      mVals.forEach((y,x)=>{num+=(x-meanX)*(y-meanY);den+=(x-meanX)**2;});
      const slope=den?num/den:0;
      const intercept=meanY-slope*meanX;
      const forecast=[1,2,3].map(i=>Math.max(0,+(intercept+slope*(n-1+i)).toFixed(0)));
      const allLabels=[...mKeys.map(k=>{const[y,m]=k.split('-');return months[+m-1]+' '+y.slice(2);}),'→1m','→2m','→3m'];
      const allVals=[...mVals,...forecast];
      destroyChart('chart-forecast');
      const cFc=eid('chart-forecast');
      if(cFc){
        new Chart(cFc,{
          type:'line',
          data:{
            labels:allLabels,
            datasets:[
              {label:'Storico',data:[...mVals,...forecast.map(()=>null)],borderColor:'#6366f1',backgroundColor:'rgba(99,102,241,.15)',fill:true,tension:0.4,borderWidth:2,pointRadius:3},
              {label:'Previsione',data:[...mVals.map(()=>null),mVals[mVals.length-1],...forecast],borderColor:'#f97316',borderDash:[6,4],tension:0.4,borderWidth:2,pointRadius:4,fill:false},
            ]
          },
          options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#94a3b8',boxWidth:12}},tooltip:{callbacks:{label:ctx=>`€${(ctx.raw||0).toLocaleString('it')}`}}},scales:{y:{beginAtZero:true,ticks:{color:'#64748b',callback:v=>'€'+v.toLocaleString('it')},grid:{color:'#ffffff08'}},x:{ticks:{color:'#64748b'},grid:{display:false}}}}
        });
      }
    }

    // ── YoY comparison ────────────────────────────────────────
    const lastYear=thisYear-1;
    const thisYearM=new Array(12).fill(0);
    const lastYearM=new Array(12).fill(0);
    sales.filter(s=>s.status==='pagato').forEach(s=>{
      const yr=new Date(s.date).getFullYear();
      const m=new Date(s.date).getMonth();
      if(yr===thisYear)thisYearM[m]+=(+s.amount||0);
      if(yr===lastYear)lastYearM[m]+=(+s.amount||0);
    });
    destroyChart('chart-yoy');
    const cYoy=eid('chart-yoy');
    if(cYoy){
      new Chart(cYoy,{
        type:'line',
        data:{
          labels:months,
          datasets:[
            {label:String(thisYear),data:thisYearM,borderColor:'#6366f1',backgroundColor:'rgba(99,102,241,0.15)',fill:true,tension:0.4,borderWidth:2,pointRadius:3},
            {label:String(lastYear),data:lastYearM,borderColor:'#475569',backgroundColor:'transparent',borderDash:[5,5],tension:0.4,borderWidth:1.5,pointRadius:2},
          ]
        },
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#94a3b8',boxWidth:12,padding:12}}},scales:{y:{beginAtZero:true,ticks:{color:'#64748b',callback:v=>'€'+v},grid:{color:'#ffffff08'}},x:{ticks:{color:'#64748b'},grid:{display:false}}}}
      });
    }

    // ── Top 5 Products ────────────────────────────────────────
    const prodMap={};
    sales.filter(s=>s.status==='pagato').forEach(s=>{
      const key=(s.desc||'Altro').split(' ').slice(0,4).join(' ');
      if(!prodMap[key])prodMap[key]={revenue:0,count:0};
      prodMap[key].revenue+=(+s.amount||0);
      prodMap[key].count++;
    });
    const topProds=Object.entries(prodMap).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,5);
    const maxRev=topProds[0]?.[1]?.revenue||1;
    const tpEl=eid('dash-top-products');
    if(tpEl)tpEl.innerHTML=topProds.length?topProds.map(([name,{revenue,count}],i)=>{
      const pct=Math.round(revenue/maxRev*100);
      const medals=['🥇','🥈','🥉','4️⃣','5️⃣'];
      return `<div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
          <span style="color:var(--text)">${medals[i]} ${name}</span>
          <span style="color:#a78bfa;font-weight:700">€${revenue.toFixed(0)} <span style="color:var(--text-muted);font-weight:400">(${count}×)</span></span>
        </div>
        <div style="height:4px;background:var(--bg-card2);border-radius:2px">
          <div style="height:4px;background:linear-gradient(90deg,#6366f1,#a78bfa);border-radius:2px;width:${pct}%"></div>
        </div>
      </div>`;
    }).join('') : '<p style="color:var(--text-dim);font-size:12px;padding:8px 0">Nessuna vendita ancora</p>';

    // Show forecast card if enough data
    const fcCard=eid('dash-forecast-card');
    if(fcCard) fcCard.style.display=sales.filter(s=>s.status==='pagato').length>=6?'block':'none';
    // ── Solleciti alert ───────────────────────────────────────
    await this.renderSollecitiAlert(sales);
  },

  switchChart(mode){
    if(!this._chartData)return;
    const {monthly,monthlyOrders,monthlyAvg,months}=this._chartData;
    const data={revenue:monthly,orders:monthlyOrders,avg:monthlyAvg}[mode]||monthly;
    const labels={revenue:'Revenue €',orders:'N° Ordini',avg:'Scontrino Medio €'};
    const chart=Chart.getChart(eid('chart-monthly'));
    if(chart){chart.data.datasets[0].data=data;chart.data.datasets[0].label=labels[mode];chart.update();}
  },

  async renderSollecitiAlert(sales){
    const el=eid('dash-solleciti-alert');if(!el)return;
    const today=new Date().toISOString().split('T')[0];
    // Overdue: da_pagare with date > 30 days ago
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-30);
    const overdue=sales.filter(s=>s.status==='da_pagare'&&s.date&&new Date(s.date)<cutoff);
    if(!overdue.length){el.innerHTML='';return;}
    const totalOverdue=overdue.reduce((a,s)=>a+(+s.amount||0),0);
    el.innerHTML=`<div style="background:linear-gradient(135deg,#7c2d1220,#1e293b);border:1.5px solid #f9731650;border-radius:12px;padding:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <div style="font-size:28px">⚠️</div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:700;color:#fb923c">${overdue.length} pagament${overdue.length>1?'i':'o'} scadut${overdue.length>1?'i':'o'} — totale <strong>€${totalOverdue.toFixed(2)}</strong></div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px">Da oltre 30 giorni: ${overdue.map(s=>s.clientName||'Cliente').slice(0,3).join(', ')}${overdue.length>3?' e altri...':''}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="Solleciti.showPanel()" style="padding:8px 14px;background:#f97316;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">📧 Invia Solleciti</button>
        <button onclick="App.navigate('sales')" style="padding:8px 14px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);border-radius:8px;cursor:pointer;font-size:12px">Vedi Vendite</button>
      </div>
    </div>`;
  },
  async renderRecentSales(){
    const el=eid('dashboard-recent-sales');if(!el)return;
    const sales=(await AppStore.get('sales').catch(()=>[])).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
    if(!sales.length){el.innerHTML='<p class="text-muted" style="padding:16px">Nessuna vendita ancora</p>';return;}
    el.innerHTML=sales.map(s=>`<div class="stat-row"><span>${s.clientName||'—'}<br><small class="text-muted">${fmtDate(s.date)}</small></span><span class="stat-val">${fmtCur(s.amount)} ${badgeStatus(s.status)}</span></div>`).join('');
  },
  async renderDueSoon() {
    const el = eid('dashboard-due-soon');
    if (!el) return;
    try {
      const [orders, pipeline] = await Promise.all([
        AppStore.get('orders').catch(()=>[]),
        AppStore.get('pipeline').catch(()=>[]),
      ]);
      const all = [...orders, ...pipeline].filter((o,i,a)=>a.findIndex(x=>x.id===o.id)===i);
      const now = new Date();
      const todayStr = now.toISOString().slice(0,10);
      const soonStr  = new Date(now.getTime()+72*3600*1000).toISOString().slice(0,10);
      const done = ['paid','delivered','rejected','lost'];
      const due = all.filter(o=>o.dueDate&&o.dueDate>=todayStr&&o.dueDate<=soonStr&&!done.includes(o.stage||''));
      const overdue = all.filter(o=>o.dueDate&&o.dueDate<todayStr&&!done.includes(o.stage||''));
      
      if(!due.length && !overdue.length){
        el.innerHTML='<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px"><i class="fas fa-check-circle" style="color:var(--green);margin-right:6px"></i>Nessuna scadenza urgente</div>';
        return;
      }
      const mkCard = (o,type)=>{
        const col = type==='overdue'?'#ef4444':o.dueDate===todayStr?'#f97316':'var(--primary)';
        const lbl = type==='overdue'?'⚠️ Scaduto':o.dueDate===todayStr?'⚡ Oggi':'↑ Presto';
        return `<div onclick="App.navigate('pipeline')" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:8px;background:var(--bg-card2);border-left:3px solid ${col};margin-bottom:6px;cursor:pointer" onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
          <div><div style="font-size:12px;font-weight:700;color:var(--text)">${o.name||o.clientName||'Ordine'}</div>
          <div style="font-size:10px;color:var(--text-muted)">${o.clientName||''} ${o.total?'· €'+o.total:''}</div></div>
          <span style="font-size:10px;font-weight:800;color:${col};flex-shrink:0">${lbl}</span>
        </div>`;
      };
      el.innerHTML = [
        ...overdue.slice(0,3).map(o=>mkCard(o,'overdue')),
        ...due.slice(0,5).map(o=>mkCard(o,'soon')),
      ].join('');
    } catch(e) { el.innerHTML=''; }
  },


  async renderRecentQuotes(){
    const el=eid('dashboard-recent-quotes');if(!el)return;
    const quotes=(await AppStore.get('quotes').catch(()=>[])).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
    if(!quotes.length){el.innerHTML='<p class="text-muted" style="padding:16px">Nessun preventivo ancora</p>';return;}
    el.innerHTML=quotes.map(q=>`<div class="stat-row"><span>${sanitize(q.name||'—')}<br><small class="text-muted">${sanitize(q.clientName||'—')}</small></span><span class="stat-val">${fmtCur(q.grossPrice)} ${badgeStatus(q.status)}</span></div>`).join('');
  }
};
if(typeof Dashboard!=="undefined")window.Dashboard=Dashboard; // immediate window export


// ===== QUOTER (Multi-Voce) =====
const DashLayout = {
  _defaultOrder: ['revenue','unpaid','cashflow','convrate'],
  // Widget registry — all available KPIs for Dashboard
  _widgets: [
    {id:'revenue',   label:'Revenue Mensile',   icon:'fa-euro-sign',   color:'var(--primary)'},
    {id:'unpaid',    label:'Non Incassato',      icon:'fa-hourglass-half', color:'var(--orange)'},
    {id:'cashflow',  label:'Cashflow Netto',     icon:'fa-water',       color:'var(--green)'},
    {id:'convrate',  label:'Tasso Conversione',  icon:'fa-bullseye',    color:'var(--blue)'},
    {id:'orders_open',label:'Ordini Aperti',     icon:'fa-tasks',       color:'var(--purple)'},
    {id:'clients_active',label:'Clienti Attivi', icon:'fa-users',       color:'var(--blue)'},
    {id:'avg_order', label:'Media Ordine',       icon:'fa-chart-bar',   color:'var(--green)'},
    {id:'tax_next',  label:'Prossima Scadenza',  icon:'fa-calendar-exclamation', color:'var(--red)'},
  ],

  async _load() {
    const saved = await IDB.get('dash_layout','main').catch(()=>null);
    return {
      order:  saved?.order  || [...this._defaultOrder],
      hidden: saved?.hidden || []
    };
  },

  async getOrder() { return (await this._load()).order; },
  async getHidden() { return (await this._load()).hidden; },

  async saveOrder(order) {
    const cur = await this._load();
    await IDB.put('dash_layout', {key:'main', order, hidden:cur.hidden, ts:Date.now()}).catch(()=>{});
  },

  async saveHidden(hidden) {
    const cur = await this._load();
    await IDB.put('dash_layout', {key:'main', order:cur.order, hidden, ts:Date.now()}).catch(()=>{});
  },

  async openConfig() {
    const {order, hidden} = await this._load();
    const visible = this._widgets.filter(w => !hidden.includes(w.id));
    const hiddenW = this._widgets.filter(w => hidden.includes(w.id));

    // Build config modal
    let existing = document.getElementById('modal-dash-config');
    if(existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'modal-dash-config';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };

    overlay.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;width:100%;max-width:540px;max-height:90vh;overflow:auto;box-shadow:0 24px 80px rgba(0,0,0,.6)">
        <div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:var(--bg-card2);border-radius:18px 18px 0 0">
          <div>
            <div style="font-size:17px;font-weight:800">⚙️ Configura Dashboard</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Scegli quali KPI visualizzare · trascina per riordinare</div>
          </div>
          <button onclick="document.getElementById('modal-dash-config').remove()" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;width:32px;height:32px;border-radius:8px;font-size:14px">✕</button>
        </div>
        <div style="padding:20px 24px">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:10px">✅ Visibili (${visible.length})</div>
          <div id="dash-cfg-visible" style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px">
            ${visible.map(w => `
              <div draggable="true" data-wid="${w.id}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border2);border-radius:10px;cursor:grab" class="dash-cfg-row">
                <i class="fas fa-grip-vertical" style="color:var(--text-dim);font-size:12px"></i>
                <i class="fas ${w.icon}" style="color:${w.color};width:16px;text-align:center"></i>
                <span style="flex:1;font-size:13px;font-weight:600">${w.label}</span>
                <button onclick="DashLayout._toggleWidget('${w.id}', false)" style="padding:3px 10px;background:#ef444420;color:#ef4444;border:1px solid #ef444430;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">Nascondi</button>
              </div>`).join('')}
          </div>
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:10px">🚫 Nascosti (${hiddenW.length})</div>
          <div id="dash-cfg-hidden" style="display:flex;flex-direction:column;gap:6px">
            ${hiddenW.length ? hiddenW.map(w => `
              <div data-wid="${w.id}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;opacity:.6">
                <i class="fas ${w.icon}" style="color:${w.color};width:16px;text-align:center"></i>
                <span style="flex:1;font-size:13px;font-weight:600">${w.label}</span>
                <button onclick="DashLayout._toggleWidget('${w.id}', true)" style="padding:3px 10px;background:#22c55e20;color:#22c55e;border:1px solid #22c55e30;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">Mostra</button>
              </div>`).join('')
            : '<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:12px">Tutti i widget sono visibili</div>'}
          </div>
        </div>
        <div style="padding:14px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;background:var(--bg-card2);border-radius:0 0 18px 18px">
          <button onclick="DashLayout._resetLayout()" style="padding:8px 16px;background:transparent;border:1px solid var(--border);color:var(--text-muted);border-radius:8px;cursor:pointer;font-size:12px">↩ Reset</button>
          <button onclick="document.getElementById('modal-dash-config').remove();(typeof Dashboard!=='undefined'&&Dashboard.render())" style="padding:8px 20px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">Applica</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
  },

  async _toggleWidget(id, show) {
    const {hidden} = await this._load();
    const newHidden = show ? hidden.filter(h=>h!==id) : [...hidden, id];
    await this.saveHidden(newHidden);
    // Refresh the config modal
    document.getElementById('modal-dash-config')?.remove();
    await this.openConfig();
  },

  async _resetLayout() {
    await IDB.put('dash_layout', {key:'main', order:[...this._defaultOrder], hidden:[], ts:Date.now()}).catch(()=>{});
    document.getElementById('modal-dash-config')?.remove();
    (typeof Dashboard!=='undefined'&&Dashboard.render());
    toast('Dashboard reset al layout predefinito','success');
  },

  // Call this after Dashboard renders KPI cards
  initDrag() {
    const cards = document.querySelectorAll('#dash-kpi-grid .kpi-draggable');
    if(!cards.length) return;
    let dragged = null;

    cards.forEach(card => {
      card.draggable = true;
      card.addEventListener('dragstart', e => {
        dragged = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        document.querySelectorAll('.kpi-draggable').forEach(c=>c.classList.remove('drag-over'));
        // Persist new order
        const newOrder = [...document.querySelectorAll('#dash-kpi-grid .kpi-draggable')].map(c=>c.dataset.widget).filter(Boolean);
        if(newOrder.length) DashLayout.saveOrder(newOrder);
      });
      card.addEventListener('dragover', e => { e.preventDefault(); if(card!==dragged) card.classList.add('drag-over'); });
      card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
      card.addEventListener('drop', e => {
        e.preventDefault();
        card.classList.remove('drag-over');
        if(dragged&&card!==dragged) {
          const grid = card.parentNode;
          const allCards = [...grid.querySelectorAll('.kpi-draggable')];
          const dragIdx = allCards.indexOf(dragged);
          const dropIdx = allCards.indexOf(card);
          if(dragIdx < dropIdx) grid.insertBefore(dragged, card.nextSibling);
          else grid.insertBefore(dragged, card);
        }
      });
    });
  },

  async renderSmartActions(){
    const el=document.getElementById('dashboard-smart-actions');
    if(!el)return;
    try{
      const now=new Date();
      const todayStr=now.toISOString().split('T')[0];
      const [orders,sales,quotes,clients,inventory]=await Promise.all([
        IDB.getAll('orders').catch(()=>[]),
        IDB.getAll('sales').catch(()=>[]),
        IDB.getAll('quotes').catch(()=>[]),
        IDB.getAll('clients').catch(()=>[]),
        IDB.getAll('items').catch(()=>[]),
      ]);

      const actions=[];

      // Overdue orders
      const overdue=orders.filter(o=>{
        const active=['aperto','in_lavorazione','accettato','preventivo'].includes((o.status||o.stage||'').toLowerCase());
        return active&&o.dueDate&&o.dueDate<todayStr;
      });
      if(overdue.length) actions.push({
        priority:1,color:'#ef4444',icon:'⚠️',
        title:`${overdue.length} ordine/i in ritardo`,
        desc:overdue.slice(0,2).map(o=>o.clientName||o.client||'Cliente').join(', ')+(overdue.length>2?`… +${overdue.length-2}`:''),
        action:`App.navigate('produzione')`,btnLabel:'Vedi Ordini'
      });

      // Unpaid sales > 7 days
      const unpaidOld=sales.filter(s=>{
        if(s.status!=='da_pagare')return false;
        const daysDiff=(now-new Date(s.date||s.created||0))/864e5;
        return daysDiff>7;
      });
      if(unpaidOld.length) actions.push({
        priority:2,color:'#f59e0b',icon:'💰',
        title:`${unpaidOld.length} fattura/e non pagate (>7gg)`,
        desc:'Totale: €'+Math.round(unpaidOld.reduce((a,s)=>a+(+s.amount||0),0)),
        action:`App.navigate('sales')`,btnLabel:'Gestisci Vendite'
      });

      // Quotes awaiting response > 5 days
      const pendingQuotes=quotes.filter(q=>{
        if(q.status==='confermato'||q.status==='rifiutato')return false;
        const daysDiff=(now-new Date(q.created||q.date||0))/864e5;
        return daysDiff>5;
      });
      if(pendingQuotes.length) actions.push({
        priority:3,color:'#818cf8',icon:'📋',
        title:`${pendingQuotes.length} preventivo/i in attesa di risposta`,
        desc:'Segui up con i clienti per chiudere le trattative',
        action:`App.navigate('pipeline')`,btnLabel:'Vedi Pipeline'
      });

      // Low stock
      const lowStock=inventory.filter(i=>(+i.stock||0)<=(+i.minStock||0)&&(+i.minStock||0)>0);
      if(lowStock.length) actions.push({
        priority:4,color:'#f97316',icon:'📦',
        title:`${lowStock.length} articolo/i sotto scorta minima`,
        desc:lowStock.slice(0,3).map(i=>i.name||'—').join(', '),
        action:`App.navigate('items')`,btnLabel:'Vedi Magazzino'
      });

      // Orders completed today (suggest creating sale)
      const completedToday=orders.filter(o=>{
        const done=['completato','consegnato','delivered','done'].includes((o.status||o.stage||'').toLowerCase());
        const updated=o.updated||o.date||o.created||'';
        return done&&updated.startsWith(todayStr)&&!o._sale_created;
      });
      if(completedToday.length) actions.push({
        priority:5,color:'#22c55e',icon:'🎉',
        title:`${completedToday.length} ordine/i completato/i oggi`,
        desc:'Registra le vendite per aggiornare il fatturato',
        action:`App.navigate('sales')`,btnLabel:'Registra Vendita'
      });

      // New clients this week with no order
      const weekStart=new Date(now);weekStart.setDate(now.getDate()-7);
      const newClientsNoOrder=clients.filter(cl=>{
        if(!cl.created||new Date(cl.created)<weekStart)return false;
        return!orders.some(o=>(o.clientId===cl.id)||(o.clientName||'').toLowerCase()===(cl.name||'').toLowerCase());
      });
      if(newClientsNoOrder.length) actions.push({
        priority:6,color:'#60a5fa',icon:'👤',
        title:`${newClientsNoOrder.length} nuovo/i cliente/i senza preventivo`,
        desc:newClientsNoOrder.slice(0,2).map(c=>c.name||'—').join(', '),
        action:`App.navigate('pipeline')`,btnLabel:'Crea Preventivo'
      });

      if(!actions.length){
        el.innerHTML=`<div style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <span style="font-size:24px">🎉</span>
          <div><div style="font-weight:700;font-size:13px;color:#22c55e">Tutto in ordine!</div>
          <div style="font-size:11px;color:var(--text-muted)">Nessuna azione urgente — ottimo lavoro.</div></div>
        </div>`;
        return;
      }

      actions.sort((a,b)=>a.priority-b.priority);
      el.innerHTML=`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:16px">
        <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:800;display:flex;align-items:center;gap:7px">
          <span>🎯</span> Azioni consigliate per oggi
          <span style="margin-left:auto;background:var(--primary);color:#000;border-radius:99px;padding:1px 8px;font-size:10px">${actions.length}</span>
        </div>
        ${actions.slice(0,4).map(a=>`
        <div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
          <span style="font-size:20px;flex-shrink:0">${a.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:700;color:${a.color}">${a.title}</div>
            <div style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.desc}</div>
          </div>
          <button onclick="${a.action}" style="padding:5px 11px;background:${a.color}18;color:${a.color};border:1px solid ${a.color}40;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;flex-shrink:0">${a.btnLabel}</button>
        </div>`).join('')}
      </div>`;
    }catch(e){ console.warn('renderSmartActions:',e); el.innerHTML=''; }
  }
};

// Patch Dashboard.renderKPIs to add drag attributes and call DashLayout.initDrag
const _origDashRenderKPIs = Dashboard.renderKPIs?.bind(Dashboard);
if(_origDashRenderKPIs) {
  Dashboard.renderKPIs = async function(...args) {
    await _origDashRenderKPIs(...args);
    // Add draggable class + data-widget to kpi cards
    const grid = document.getElementById('dash-kpi-grid');
    if(grid) {
      grid.querySelectorAll('.kpi-card,.kpi-draggable').forEach((card,i)=>{
        card.classList.add('kpi-draggable');
        if(!card.dataset.widget) card.dataset.widget = DashLayout._defaultOrder[i]||('widget_'+i);
      });
      DashLayout.initDrag();
    }
  };
}

// ══════════════════════════════════════════════════════════════════════════
// v75 — AI PRICE SUGGESTER (upgrade + standalone panel)  🤖💲
// ══════════════════════════════════════════════════════════════════════════
const KPICoherenceUI = {
  async run() {
    const el = eid('kpi-coherence-result');
    if (el) el.innerHTML = '<div style="padding:14px;background:var(--bg-card2);border-radius:8px;font-size:12px;color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> Test coerenza KPI in corso...</div>';

    try {
      // Run all three sources in parallel
      const [bdwResult, kpiResult, dlResult] = await Promise.all([
        BDW.init(true).then(() => BDW.metrics.revenue.mtd),
        KPIEngine.run().then(k => k.revenue).catch(()=>{}),
        DataLayer.fetch(true).then(d => d.mRev || d.revenue || 0).catch(() => 0),
      ]);

      const sources = [
        { name: 'BDW (Single Source of Truth)', value: bdwResult, primary: true },
        { name: 'KPIEngine', value: kpiResult },
        { name: 'DataLayer', value: dlResult },
      ];

      const maxDelta = Math.max(...sources.map(s => Math.abs(s.value - bdwResult)));
      const allOk = maxDelta < 1;

      const rows = sources.map(s => {
        const delta = Math.abs(s.value - bdwResult);
        const ok = delta < 1 || delta / Math.max(bdwResult, 1) < 0.005;
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border2)">' +
          '<div><div style="font-weight:' + (s.primary?'700':'500') + ';font-size:12px">' + s.name + (s.primary?' 🏭':'') + '</div>' +
          (s.primary ? '' : '<div style="font-size:10px;color:var(--text-dim)">Δ vs BDW: ' + (delta < 1 ? '< €1' : '€' + delta.toFixed(0)) + '</div>') +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:10px">' +
          '<span style="font-weight:700;font-size:13px">€' + s.value.toFixed(0) + '</span>' +
          '<span style="font-size:14px">' + (s.primary ? '🏭' : ok ? '✅' : '⚠️') + '</span>' +
          '</div></div>';
      }).join('');

      const statusColor = allOk ? '#22c55e' : '#f59e0b';
      const statusMsg = allOk
        ? '✅ Tutti i moduli sono allineati — nessuna discrepanza KPI'
        : '⚠️ Discrepanza rilevata (Δ€' + maxDelta.toFixed(0) + '). Possibile causa: cache non aggiornata. Premi Ricalcola.';

      if (el) el.innerHTML = [
        '<div class="card" style="border-left:4px solid ' + statusColor + '">',
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">',
            '<div class="card-title" style="margin:0">🔍 KPI Coherence Test</div>',
            '<span style="font-size:10px;color:var(--text-muted)">' + new Date().toLocaleTimeString('it-IT') + '</span>',
          '</div>',
          '<div style="font-size:12px;font-weight:700;color:' + statusColor + ';margin-bottom:12px;padding:8px 12px;background:' + statusColor + '15;border-radius:6px">' + statusMsg + '</div>',
          '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">Revenue MTD per sorgente:</div>',
          rows,
          '<div style="font-size:10px;color:var(--text-dim);margin-top:10px">Il test verifica che BDW, KPIEngine e DataLayer restituiscano valori Revenue MTD coerenti (Δ&lt;€1).</div>',
        '</div>'
      ].join('');

    } catch(e) {
      if (el) el.innerHTML = '<div style="padding:14px;background:#ef444410;border-radius:8px;border-left:3px solid #ef4444;font-size:12px">❌ Errore test: ' + e.message + '</div>';
    }
  }
};


const KPIAutoTest = {
  _running: false,
  THRESHOLD: 5, // % difference before flagging

  async run(silent=true) {
    if (this._running) return;
    this._running = true;
    try {
      await BDW.init();
      const bdwRev = BDW.metrics.revenue.mtd;

      // Try KPIEngine if available
      let kpiRev = null;
      try {
        if (typeof KPIEngine !== 'undefined') {
          const k = await KPIEngine.run();
          kpiRev = k?.revenue ?? k?.mtdRevenue ?? null;
        }
      } catch(e) { /* KPIEngine may not have run yet */ }

      const delta = kpiRev != null && bdwRev > 0
        ? Math.abs((bdwRev - kpiRev) / bdwRev * 100)
        : 0;

      const snap = {
        id: Date.now(), ts: new Date().toISOString(),
        bdw: bdwRev, kpi: kpiRev, delta,
        status: delta > this.THRESHOLD ? 'mismatch' : 'ok'
      };

      await IDB.put('kpi_cache', snap).catch(()=>{});

      if (snap.status === 'mismatch' && !silent) {
        console.warn(`[KPI AutoTest] ⚠️ Mismatch: BDW=${bdwRev.toFixed(0)} KPI=${kpiRev?.toFixed(0)} Δ=${delta.toFixed(1)}%`);
        // Show badge
        const topbar = document.querySelector('#topbar-right, .topbar-actions');
        if (topbar && !eid('kpi-mismatch-badge')) {
          const badge = document.createElement('div');
          badge.id = 'kpi-mismatch-badge';
          badge.style.cssText = 'background:#ef444420;border:1px solid #ef444440;border-radius:6px;padding:4px 10px;font-size:11px;color:#ef4444;font-weight:700;cursor:pointer';
          badge.textContent = `⚠️ KPI Δ${delta.toFixed(0)}%`;
          badge.title = `BDW: €${bdwRev.toFixed(0)} vs KPI: €${kpiRev?.toFixed(0)}`;
          badge.onclick = () => App.navigate('intel');
          topbar.prepend(badge);
          setTimeout(() => badge.remove(), 30000);
        }
      } else if (snap.status === 'ok') {
        console.log(`[KPI AutoTest] ✅ Coherent — MTD: €${bdwRev.toFixed(0)}`);
      }
      return snap;
    } finally {
      this._running = false;
    }
  },

  async getHistory(n=20) {
    const all = await IDB.getAll('kpi_cache').catch(()=>[]);
    return all.sort((a,b) => b.ts > a.ts ? 1 : -1).slice(0, n);
  }
};

// Auto-run KPI test 3s after page load (non-blocking)
setTimeout(async()=>{
  try { await KPIAutoTest.run(true); } catch(e) { /* silent */ }
}, 3000);

// ════════════════════════════════════════════════════════════════════════
// 🗃️ IDB STORE UNIFICATION v73
// Migrates legacy 'material' references to 'materials' store
// Runs once on first load after v12 upgrade
// ════════════════════════════════════════════════════════════════════════
const HealthScore = {
  _panelOpen: false,
  _lastScore: null,
  _refreshTimer: null,

  async calculate() {
    try {
      await BDW.init();
      const m = BDW.metrics;
      const r = m.revenue, f = m.finance, c = m.clients;

      // Revenue score (0-40): crescita positiva + volume
      let revScore = 0;
      if (r.mtd > 0) revScore += 20;
      if (r.growth > 0) revScore += Math.min(20, r.growth * 0.4);
      else revScore += Math.max(0, 10 + r.growth * 0.2);

      // Margin score (0-30): margine netto %
      const marginScore = Math.min(30, Math.max(0, f.netMarginPct * 1.2));

      // Client score (0-20): % clienti champion + loyal
      const goodClients = (c.champions || 0) + (c.loyal || 0);
      const clientScore = c.total > 0 ? Math.min(20, (goodClients / c.total) * 40) : 5;

      // Cash score (0-10): runway in mesi
      const cashScore = Math.min(10, Math.max(0, (f.cashRunway || 0) * 2.5));

      const total = Math.round(revScore + marginScore + clientScore + cashScore);
      this._lastScore = { total, revScore, marginScore, clientScore, cashScore, metrics: m };
      return this._lastScore;
    } catch(e) {
      console.warn('[HealthScore] calc error', e);
      return { total: 0, revScore: 0, marginScore: 0, clientScore: 0, cashScore: 0, metrics: null };
    }
  },

  _scoreColor(n) {
    if (n >= 75) return 'var(--green)';
    if (n >= 50) return 'var(--primary)';
    if (n >= 30) return 'var(--orange)';
    return 'var(--red)';
  },

  _scoreLabel(n) {
    if (n >= 80) return '🟢 Eccellente';
    if (n >= 65) return '🟢 Buona salute';
    if (n >= 50) return '🟡 Discreta';
    if (n >= 35) return '🟠 Attenzione';
    return '🔴 Critica';
  },

  async update() {
    const data = await this.calculate();
    const n = data.total;
    const color = this._scoreColor(n);
    const m = data.metrics;

    // Update pill
    const numEl = document.getElementById('hs-score-num');
    const mtdEl = document.getElementById('hs-mtd-num');
    const alertEl = document.getElementById('hs-alerts-num');
    const ringFill = document.getElementById('hs-ring-fill');

    if (numEl) { numEl.textContent = n; numEl.style.color = color; }
    if (mtdEl && m) {
      const mtd = m.revenue?.mtd || 0;
      mtdEl.textContent = mtd >= 1000 ? '€' + (mtd/1000).toFixed(1) + 'k' : '€' + mtd.toFixed(0);
      mtdEl.style.color = mtd > 0 ? 'var(--green)' : 'var(--red)';
    }
    if (alertEl && m) {
      const alerts = (m.anomalies?.length || 0) + (m.ops?.ordersOverdue || 0);
      alertEl.textContent = alerts;
      alertEl.style.color = alerts > 0 ? 'var(--orange)' : 'var(--text-muted)';
    }

    // Ring animation: circumference = 2π*12 ≈ 75.4
    if (ringFill) {
      const offset = 75.4 - (75.4 * n / 100);
      ringFill.style.strokeDashoffset = offset;
      ringFill.style.stroke = color;
    }

    // Update open panel if visible
    if (this._panelOpen) this._renderPanel(data);
  },

  _renderPanel(data) {
    const n = data.total;
    const m = data.metrics;
    if (!m) return;

    const big = document.getElementById('hp-score-big');
    const lbl = document.getElementById('hp-score-label');
    const lu  = document.getElementById('hp-last-update');
    if (big) { big.textContent = n; big.style.color = this._scoreColor(n); }
    if (lbl) lbl.textContent = this._scoreLabel(n);
    if (lu)  lu.textContent = new Date().toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit'});

    // Grid cells
    const rev = m.revenue, fin = m.finance, cli = m.clients;
    const set = (id, val, cls) => {
      const el = document.getElementById(id);
      if (el) { el.textContent = val; if (cls) el.className = 'val ' + cls; }
    };
    const mtd = rev?.mtd || 0;
    set('hp-rev-mtd', '€' + (mtd >= 1000 ? (mtd/1000).toFixed(1)+'k' : mtd.toFixed(0)), mtd > 0 ? 'green' : 'red');
    const gr = rev?.growth || 0;
    const grEl = document.getElementById('hp-rev-growth');
    if (grEl) grEl.textContent = (gr >= 0 ? '+' : '') + gr.toFixed(1) + '% vs mese scorso';

    const mg = fin?.netMarginPct || 0;
    set('hp-margin', mg.toFixed(1) + '%', mg >= 30 ? 'green' : mg >= 15 ? '' : 'red');
    const mgEl = document.getElementById('hp-margin-sub');
    if (mgEl) mgEl.textContent = mg >= 30 ? '✓ Ottimo' : mg >= 15 ? 'Nella media' : '⚠ Basso';

    const champ = cli?.champions || 0;
    set('hp-champ', champ, champ >= 3 ? 'green' : '');
    const csEl = document.getElementById('hp-champ-sub');
    if (csEl) csEl.textContent = `di ${cli?.total || 0} totali`;

    const rwy = fin?.cashRunway || 0;
    set('hp-runway', rwy >= 99 ? '∞' : rwy.toFixed(1), rwy >= 3 ? 'green' : rwy >= 1 ? 'orange' : 'red');

    // Score bars
    const barsEl = document.getElementById('hp-bars');
    if (barsEl) {
      const bars = [
        { label: 'Revenue', val: data.revScore, max: 40, color: 'var(--blue)' },
        { label: 'Margine', val: data.marginScore, max: 30, color: 'var(--purple)' },
        { label: 'Clienti',  val: data.clientScore, max: 20, color: 'var(--green)' },
        { label: 'Cassa',    val: data.cashScore,   max: 10, color: 'var(--primary)' },
      ];
      barsEl.innerHTML = bars.map(b => `
        <div style="margin-bottom:8px">
          <label style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;margin-bottom:4px">
            <span>${b.label}</span><span style="color:var(--text);font-weight:600">${Math.round(b.val)}/${b.max}</span>
          </label>
          <div class="hp-bar-track"><div class="hp-bar-fill" style="width:${(b.val/b.max)*100}%;background:${b.color}"></div></div>
        </div>`).join('');
    }
  },

  togglePanel() {
    this._panelOpen = !this._panelOpen;
    const panel = document.getElementById('health-panel');
    if (!panel) return;
    if (this._panelOpen) {
      panel.classList.add('open');
      if (this._lastScore) this._renderPanel(this._lastScore);
      else this.calculate().then(d => this._renderPanel(d));
    } else {
      panel.classList.remove('open');
    }
  },

  closePanel() {
    this._panelOpen = false;
    const panel = document.getElementById('health-panel');
    if (panel) panel.classList.remove('open');
  },

  startAutoRefresh() {
    if(this._refreshTimer) return; // v3.0: no duplicati
    this.update();
    this._refreshTimer = setInterval(() => this.update(), 120000);
    if(!this._clickHandler){
      this._clickHandler=(e)=>{if(!e.target.closest('#health-pill')&&!e.target.closest('#health-panel'))this.closePanel()};
      document.addEventListener('click',this._clickHandler);
    }
  },
  stopAutoRefresh(){if(this._refreshTimer){clearInterval(this._refreshTimer);this._refreshTimer=null}if(this._clickHandler){document.removeEventListener('click',this._clickHandler);this._clickHandler=null}},
};

// ═══════════════════════════════════════════════════════════════════════
// GOAL TRACKER — Obiettivi aziendali con progress collegato a BDW
// ═══════════════════════════════════════════════════════════════════════
const GoalTracker = {
  SK: 'ingly_goals_v1',
  ICONS: { revenue_monthly:'💰', revenue_ytd:'📈', margin_pct:'💎', new_clients:'👥', orders_mtd:'📦', cash_runway:'🏦', custom:'🎯' },

  _load() {
    try { return JSON.parse(localStorage.getItem(this.SK) || '[]'); } catch { return []; }
  },

  _save(goals) {
    localStorage.setItem(this.SK, JSON.stringify(goals));
  },

  async _getMetricValue(type) {
    await BDW.init();
    const m = BDW.metrics;
    switch(type) {
      case 'revenue_monthly': return m.revenue?.mtd || 0;
      case 'revenue_ytd':     return m.revenue?.ytd || 0;
      case 'margin_pct':      return m.finance?.netMarginPct || 0;
      case 'new_clients':     return m.clients?.newbie || 0;
      case 'orders_mtd':      return m.ops?.ordersActive || 0;
      case 'cash_runway':     return m.finance?.cashRunway || 0;
      default: return null;
    }
  },

  async render() {
    const el = document.getElementById('view-goals');
    if (!el) return;
    const goals = this._load();

    // Load current values for all tracked goals
    const withProgress = await Promise.all(goals.map(async g => {
      const current = g.type !== 'custom' ? await this._getMetricValue(g.type) : (g.current || 0);
      const pct = g.target > 0 ? Math.min(100, Math.round((current / g.target) * 100)) : 0;
      return { ...g, current, pct };
    }));

    const isOverTarget = g => g.pct >= 100;
    const barColor = pct => pct >= 100 ? 'var(--green)' : pct >= 70 ? 'var(--blue)' : pct >= 40 ? 'var(--primary)' : 'var(--orange)';

    el.innerHTML = `
      <div style="padding:24px;max-width:900px;margin:0 auto">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
          <div>
            <h1 style="margin:0;font-size:22px;font-weight:800">🎯 Obiettivi Aziendali</h1>
            <div style="color:var(--text-muted);font-size:13px;margin-top:4px">Monitora i tuoi goal collegati ai dati live</div>
          </div>
          <button class="btn btn-primary" onclick="if(typeof GoalTracker!==typeof undefined){GoalTracker.showAddForm()}">+ Aggiungi Obiettivo</button>
        </div>

        <div id="goal-form-container"></div>

        ${withProgress.length === 0 ? `
          <div style="text-align:center;padding:60px 20px;color:var(--text-muted);background:var(--bg-card);border:1px dashed var(--border2);border-radius:var(--radius)">
            <div style="font-size:48px;margin-bottom:12px">🎯</div>
            <div style="font-size:16px;font-weight:600;margin-bottom:8px">Nessun obiettivo ancora</div>
            <div style="font-size:13px;margin-bottom:20px">Aggiungine uno per iniziare a monitorare i tuoi progressi</div>
            <button class="btn btn-primary" onclick="if(typeof GoalTracker!==typeof undefined){GoalTracker.showAddForm()}">Crea il tuo primo obiettivo</button>
          </div>
        ` : `
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
            ${withProgress.map(g => `
              <div class="goal-card" style="${isOverTarget(g) ? 'border-color:var(--green)' : ''}">
                <div class="goal-header">
                  <span class="goal-icon">${this.ICONS[g.type] || '🎯'}</span>
                  <div style="flex:1">
                    <div class="goal-title">${g.label}</div>
                    <div style="font-size:11px;color:var(--text-dim)">${g.deadline ? 'Scadenza: ' + g.deadline : 'Senza scadenza'}</div>
                  </div>
                  <span class="goal-pct" style="color:${barColor(g.pct)}">${g.pct}%</span>
                </div>
                <div class="goal-track">
                  <div class="goal-fill" style="width:${g.pct}%;background:${barColor(g.pct)}"></div>
                </div>
                <div class="goal-meta">
                  <span>${g.type !== 'custom' ? (g.unit === '%' ? g.current?.toFixed(1) : '€' + (g.current >= 1000 ? (g.current/1000).toFixed(1)+'k' : g.current?.toFixed(0))) : g.current} ${g.unit || ''}</span>
                  <span>Target: ${g.unit === '%' ? g.target + '%' : '€' + (g.target >= 1000 ? (g.target/1000).toFixed(1)+'k' : g.target)}</span>
                </div>
                ${isOverTarget(g) ? '<div style="text-align:center;margin-top:8px;font-size:12px;color:var(--green);font-weight:700">🎉 Obiettivo raggiunto!</div>' : ''}
                <div style="display:flex;gap:8px;margin-top:10px">
                  <button class="btn btn-sm btn-secondary" style="flex:1;font-size:11px" onclick="if(typeof GoalTracker!==typeof undefined)GoalTracker.editGoal('${g.id}')">✏️ Modifica</button>
                  <button class="btn btn-sm" style="flex:1;font-size:11px;background:var(--bg-card3);color:var(--text-muted)" onclick="if(typeof GoalTracker!==typeof undefined)GoalTracker.deleteGoal('${g.id}')">🗑️ Elimina</button>
                </div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:24px;padding:16px;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border)">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">📊 Riepilogo progresso</div>
            <div style="display:flex;gap:24px;flex-wrap:wrap">
              <span style="font-size:13px"><strong style="color:var(--green)">${withProgress.filter(g=>g.pct>=100).length}</strong> raggiunti</span>
              <span style="font-size:13px"><strong style="color:var(--blue)">${withProgress.filter(g=>g.pct>=70&&g.pct<100).length}</strong> in corso</span>
              <span style="font-size:13px"><strong style="color:var(--orange)">${withProgress.filter(g=>g.pct<70).length}</strong> indietro</span>
            </div>
          </div>
        `}
      </div>`;
  },

  showAddForm(existing = null) {
    const container = document.getElementById('goal-form-container');
    if (!container) return;
    const isEdit = !!existing;
    const g = existing || { type:'revenue_monthly', label:'', target:'', unit:'€', deadline:'', notes:'' };

    container.innerHTML = `
      <div class="goal-form">
        <h4>${isEdit ? '✏️ Modifica Obiettivo' : '➕ Nuovo Obiettivo'}</h4>
        <div class="goal-form-grid">
          <div>
            <div class="form-label">Tipo</div>
            <select class="form-control" id="gf-type" onchange="if(typeof GoalTracker!==typeof undefined){GoalTracker._autoFillLabel()}">
              <option value="revenue_monthly" ${g.type==='revenue_monthly'?'selected':''}>💰 Fatturato mensile</option>
              <option value="revenue_ytd" ${g.type==='revenue_ytd'?'selected':''}>📈 Fatturato annuale</option>
              <option value="margin_pct" ${g.type==='margin_pct'?'selected':''}>💎 Margine % netto</option>
              <option value="new_clients" ${g.type==='new_clients'?'selected':''}>👥 Nuovi clienti/mese</option>
              <option value="orders_mtd" ${g.type==='orders_mtd'?'selected':''}>📦 Ordini attivi</option>
              <option value="cash_runway" ${g.type==='cash_runway'?'selected':''}>🏦 Cash runway (mesi)</option>
              <option value="custom" ${g.type==='custom'?'selected':''}>🎯 Personalizzato</option>
            </select>
          </div>
          <div>
            <div class="form-label">Etichetta</div>
            <input class="form-control" id="gf-label" placeholder="Es. Fatturato Novembre" value="${g.label}">
          </div>
          <div>
            <div class="form-label">Target</div>
            <input class="form-control" id="gf-target" type="number" placeholder="0" value="${g.target}">
          </div>
          <div>
            <div class="form-label">Scadenza (opzionale)</div>
            <input class="form-control" id="gf-deadline" type="date" value="${g.deadline || ''}">
          </div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('goal-form-container').innerHTML=''">Annulla</button>
          <button class="btn btn-primary btn-sm" onclick="if(typeof GoalTracker!==typeof undefined)GoalTracker.saveGoal('${g.id || ''}')">💾 Salva</button>
        </div>
      </div>`;
  },

  _autoFillLabel() {
    const type = document.getElementById('gf-type')?.value;
    const labelEl = document.getElementById('gf-label');
    if (!labelEl || labelEl.value) return;
    const labels = { revenue_monthly:'Fatturato mensile', revenue_ytd:'Fatturato annuale', margin_pct:'Margine netto', new_clients:'Nuovi clienti', orders_mtd:'Ordini attivi', cash_runway:'Runway di cassa' };
    labelEl.value = labels[type] || '';
  },

  saveGoal(existingId) {
    const type = document.getElementById('gf-type')?.value;
    const label = document.getElementById('gf-label')?.value?.trim();
    const target = parseFloat(document.getElementById('gf-target')?.value);
    const deadline = document.getElementById('gf-deadline')?.value;
    if (!label || !target) { toast('Inserisci etichetta e target', 'warning'); return; }
    const goals = this._load();
    const units = { revenue_monthly:'€', revenue_ytd:'€', margin_pct:'%', new_clients:'', orders_mtd:'', cash_runway:'mesi', custom:'' };
    const goal = { id: existingId || 'g' + Date.now(), type, label, target, unit: units[type] || '', deadline, createdAt: new Date().toISOString() };
    if (existingId) {
      const idx = goals.findIndex(g => g.id === existingId);
      if (idx >= 0) goals[idx] = goal; else goals.push(goal);
    } else {
      goals.push(goal);
    }
    this._save(goals);
    toast('Obiettivo salvato!', 'success');
    this.render();
  },

  editGoal(id) {
    const goals = this._load();
    const g = goals.find(x => x.id === id);
    if (g) this.showAddForm(g);
  },

  deleteGoal(id) {
    if (!confirm('Eliminare questo obiettivo?')) return;
    const goals = this._load().filter(g => g.id !== id);
    this._save(goals);
    this.render();
  },

  async _addGoal() { await this.openAddGoal?.(); },
  async _delGoal(id) { await this.deleteGoal?.(id); }
};

// ═══════════════════════════════════════════════════════════════════════
// PROFIT LEAK DETECTOR — Trova dove stai perdendo soldi oggi
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
window.KPIEngine = KPIEngine;
window.Dashboard = Dashboard;
window.DashLayout = DashLayout;
window.KPICoherenceUI = KPICoherenceUI;
window.KPIAutoTest = KPIAutoTest;
window.HealthScore = HealthScore;
window.GoalTracker = GoalTracker;
if(typeof ProfitLeakDetector!==typeof undefined) window.ProfitLeakDetector = ProfitLeakDetector;

