
// === /src/core/app.js ===
const App={
  sidebarOpen:true,
  currentSection:'dashboard',
  async init(){
    await IDB.open();
    await CurrencyEngine.init();
    if(typeof AutoBackup!=='undefined') AutoBackup.runIfNeeded();
    // Check supplier overdue orders
    if(typeof SuppliersManager!=='undefined' && typeof SuppliersManager.checkOverdueAlerts==='function') {
      try { SuppliersManager.checkOverdueAlerts(); } catch(_e) {}
    }
    await AppStore.prefetch();
    await RecurringInvoices.checkAndGenerate();
    await StockAlert.checkBadge();
    // Handle client configurator link ?cfg=
    const params=new URLSearchParams(location.search);
    if(params.get('cfg')){
      try{
        // v4.6 FIX: TextDecoder gestisce UTF-8 (nomi italiani, emoji)
        const bytes=Uint8Array.from(atob(params.get('cfg')),c=>c.charCodeAt(0));
        const data=JSON.parse(new TextDecoder('utf-8').decode(bytes));
        App._showClientConfigurator(data);
        return; // Don't init full app
      }catch(e){console.log('cfg param ignored:',e.message);}
    }
    await this.seedDefaults();
    await Gadgets.seed();
    await FixedCosts.seed();
    I18n.apply();
    ThemeSwitcher.init();
  ThemeSwitcher.initFont();
    this.navigate('dashboard');
    Settings.load();
    setTimeout(()=>Wizard.start(), 600);
    Favs.init();
  if(typeof IconPacks!=='undefined') setTimeout(()=>IconPacks.init(),600);
    Bus._bridges(); // v3.0: event bridges
    // v3.1: auto-migrazione pipeline (solo se pipeline vuota e orders presenti)
    setTimeout(()=>{ if(typeof PipelineMigrate!=='undefined') PipelineMigrate.autoRun(); }, 3000);
    // Ripristina stato sidebar
    try{if(localStorage.getItem('ingly_sidebar_collapsed')==='true'){App.toggleSidebar();}}catch(ex){}
    setTimeout(()=>NavGroups.init(), 600);
    setTimeout(()=>{ if(typeof BackupReminder!=='undefined') BackupReminder.check(); }, 4000);
    setTimeout(()=>{ if(typeof ModMgr!=='undefined') ModMgr.init(); }, 700);
    setTimeout(()=>{ if(typeof CmdPalette!=='undefined') CmdPalette.init(); }, 800);
    setTimeout(()=>HealthScore.startAutoRefresh(), 1500);
    this.populateClientSelects();
    Backup.scheduleAuto();
    // Auto backup on startup (silent, daily)
    (async()=>{
      const lastBk=localStorage.getItem('ingly_last_auto_backup');
      const now=Date.now();
      if(!lastBk||now-+lastBk>86400000){
        try{
          const stores=['sales','clients','quotes','cashflow','orders','materials'];
          const allData={_ts:new Date().toISOString(),_v:'INGLY_48'};
          for(const s of stores){allData[s]=await IDB.getAll(s).catch(()=>[]);}
          const bkList=JSON.parse(localStorage.getItem('ingly_auto_backups')||'[]');
          bkList.unshift({ts:now,label:'Auto_'+new Date().toISOString().slice(0,10),size:Object.values(allData).reduce((a,v)=>a+(Array.isArray(v)?v.length*500:0),0)});
          if(bkList.length>7)bkList.pop();
          localStorage.setItem('ingly_auto_backups',JSON.stringify(bkList));
          localStorage.setItem('ingly_last_auto_backup',String(now));
          console.log('✅ Auto-backup OK',new Date().toLocaleString('it-IT'));
        }catch(e){console.warn('Auto-backup fallito:',e);}
      }
    })();
    Bus.on('sale:created',()=>KPIEngine.run());
    Bus.on('kpi:updated',(kpi)=>Dashboard.updateKPIs(kpi));
    // 🤖 Boot AutoEngine (smart automations)
    setTimeout(()=>{ if(typeof AutoEngine!=='undefined') AutoEngine.boot().catch(()=>{}); }, 1000);
    console.log('✅ INGLY OS v16 — Gestionale Artigiano Laser | ' + new Date().toLocaleDateString('it-IT'));
  },
  async seedDefaults(){
    for(const[store,items] of Object.entries(DEFAULTS||{})){
      if(store==='settings'){ 
        const ex=await IDB.get('settings','main');
        if(!ex)await IDB.put('settings',{key:'main',...items}).catch(()=>{});
        continue;
      }
      const existing=await IDB.getAll(store);
      if(existing.length===0){
        for(const item of items)await IDB.put(store,item).catch(()=>{});
      }
    }
    // Seed modules with their own seed methods
    await Gadgets.seed();
    await Social.seed();
    await Materials.seed();
    // Ensure marketing_campaigns store exists
    if(!IDB.stores_ready)try{await IDB.getAll('marketing_campaigns');}catch(e){}
  },
  _showClientConfigurator(data){
    document.body.innerHTML=`<div style="min-height:100vh;background:#0d1117;display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui">
      <div style="background:#1c2330;border-radius:20px;padding:32px;max-width:520px;width:100%;border:2px solid #54F2F440;box-shadow:0 20px 60px #00000080">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:32px;margin-bottom:8px">🎁</div>
          <div style="font-size:22px;font-weight:900;color:#54F2F4;letter-spacing:1px">INGLY DESIGN</div>
          <div style="font-size:13px;color:#64748b;margin-top:4px">Il tuo preventivo personalizzato</div>
        </div>
        <div style="font-size:16px;font-weight:700;color:#e2e8f0;margin-bottom:16px">${data.title}</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">
          ${(data.items||[]).map(i=>`<div style="display:flex;justify-content:space-between;padding:10px 14px;background:#0d1117;border-radius:8px;font-size:13px"><span style="color:#94a3b8">${i.name}</span><span style="color:#fff;font-weight:700">€${(i.price*i.qty).toFixed(2)}</span></div>`).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;padding:14px 16px;background:linear-gradient(135deg,#54F2F420,#6366f120);border-radius:10px;border:1px solid #54F2F440;margin-bottom:20px">
          <span style="font-size:14px;color:#94a3b8;font-weight:700">TOTALE</span>
          <span style="font-size:22px;color:#54F2F4;font-weight:900">€${(data.total||0).toFixed(2)}</span>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button onclick="const m=this.parentElement.parentElement;m.innerHTML='<div style=text-align:center;padding:32px><div style=font-size:48px>✅</div><div style=font-size:18px;font-weight:800;color:#54F2F4;margin-top:12px>Preventivo Approvato!</div><div style=color:#64748b;font-size:13px;margin-top:8px>Ti contatteremo a breve per procedere</div></div>'" style="flex:1;padding:14px;background:linear-gradient(135deg,#54F2F4,#67B4C2);color:#0d1117;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:900">✅ Approvo il Preventivo</button>
          <a href="https://wa.me/?text=${encodeURIComponent('Ciao! Vorrei approvare il preventivo per '+data.title+' - €'+(data.total||0).toFixed(2))}" target="_blank" style="padding:14px;background:#25d36620;color:#25d366;border:1px solid #25d36640;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;display:flex;align-items:center">💬</a>
        </div>
        <div style="text-align:center;margin-top:16px;font-size:10px;color:#334155">Preventivo valido 7 giorni · Ingly Design — Made in Sicily 🇮🇹</div>
      </div>
    </div>`;
  },

  toggleSidebar(){
    this.sidebarOpen=!this.sidebarOpen;
    const sb=eid('sidebar');
    if(!sb) return;
    const isMobile = window.innerWidth <= 768;
    if(isMobile){
      sb.classList.toggle('mobile-open', this.sidebarOpen);
    } else {
      sb.classList.toggle('collapsed',!this.sidebarOpen);
      try{ localStorage.setItem('ingly_sidebar_collapsed', this.sidebarOpen ? 'false' : 'true'); }catch(e){}
    }
    /* Update toggle button icon and tooltip */
    const btn = eid('menu-toggle');
    if(btn){
      const ico = btn.querySelector('i');
      if(ico) ico.className = this.sidebarOpen ? 'fas fa-bars' : 'fas fa-chevron-right';
      btn.title = this.sidebarOpen ? 'Comprimi sidebar' : 'Espandi sidebar';
    }
    /* In icon-only mode, set title on each nav-item for tooltip on hover */
    if(!this.sidebarOpen){
      document.querySelectorAll('#sidebar-nav .nav-item[data-section]').forEach(el=>{
        if(!el.dataset._origTitle) el.dataset._origTitle = el.title||'';
        const txt = el.cloneNode(true);
        txt.querySelectorAll('i,.nav-badge,.nav-pin').forEach(n=>n.remove());
        el.title = txt.textContent.trim() || el.dataset.section;
      });
    } else {
      document.querySelectorAll('#sidebar-nav .nav-item[data-section]').forEach(el=>{
        el.title = el.dataset._origTitle||'';
      });
    }
  },
  _prevSection:null,
  navigate(section){
    const _now=Date.now();
    if(this.currentSection===section&&(_now-(this._lastNav||0))<80)return;
    this._lastNav=_now;
    // 🔑 Gate licenza: se una licenza è attiva e il modulo non è incluso nel
    // piano, mostra la schermata upgrade e interrompi (default: nessuna licenza
    // = accesso completo).
    if(typeof InglyLicense!=='undefined' && InglyLicense.gate(section)){ this.currentSection=section; return; }
    // Reset any apparel inline styles when navigating away
    if(section!=='apparel'){
      var _apEl=document.getElementById('view-apparel');
      if(_apEl){_apEl.style.display=''; _apEl.style.opacity='';}
    }
    // 🧹 v4.6: Esegui cleanup della sezione precedente (se esiste)
    if(this._prevSection && this._prevSection !== section){
      if(typeof NavigationGuard !== 'undefined'){
        NavigationGuard.executeCleanup(this._prevSection);
      }
    }
    
    // 🛡️ v4.6 FIX CRITICAL: Nascondi TUTTE le view attive (non solo previous)
    // Risolve bug overlay persistente quando navigazione rapida o stati inconsistenti
    document.querySelectorAll('.section-view.active').forEach(v => {
      v.classList.remove('active');
    });
    
    // 🎯 Reset TUTTI i nav-item attivi
    document.querySelectorAll('.nav-item.active').forEach(n => {
      n.classList.remove('active');
    });
    
    // ✅ Cleanup modali/overlay prima di cambiare sezione (safety)
    if(typeof ModalManager !== 'undefined'){
      ModalManager.closeAll();
    }
    
    // ✅ Imposta nuova sezione
    this.currentSection=section;
    this.curr=section;
    this._prevSection=section;
    
    // ✅ Mostra view richiesta con animazione
    const view=eid('view-'+section);
    if(view){
      view.classList.add('active');
      view.style.animation='none';
      view.offsetHeight; // reflow
      view.style.animation='pageIn .22s ease';
    }
    
    // ✅ Attiva nav-item corretto
    document.querySelectorAll(`.nav-item[data-section="${section}"]`)
      .forEach(n=>n.classList.add('active'));
    
    // Tracking e callbacks
    Favs.trackVisit(section);
    /* `trackVisit` tiene l'ordine delle ultime otto: dice qual è stata
       l'ultima, non quale torni ad aprire ogni giorno. Il conteggio serve a
       proporre un preferito sensato, e vive accanto ai preferiti stessi. */
    try { if (typeof NavPrefs !== 'undefined' && NavPrefs.segnaUso) NavPrefs.segnaUso(section); } catch (e) {}
    // v17 SSOT: redirect legacy sections to unified gestione_ordini
    /* `crm_pipeline` aggiunto: senza di lui la sezione apriva una vista vuota.
       Lo store pipeline era un mirror di orders, quindi la destinazione giusta
       è la stessa degli altri alias — Gestione Ordini, unica sorgente. */
    /* Le sezioni che mostravano gli stessi ordini con un altro nome diventano
       viste di Ordini. Il redirect non perde l'intenzione di chi ha cliccato:
       porta anche alla vista giusta — Kanban resta Kanban, «Pianificazione
       lavori» apre Analytics, «Avanzamento ordini» apre la Lista. */
    const _redirectMap = { pipeline:'gestione_ordini', crm_pipeline:'gestione_ordini', orders:'gestione_ordini', workflow:'gestione_ordini', produzione:'gestione_ordini', workflow_dashboard:'gestione_ordini', kanban:'gestione_ordini', order_tracker:'gestione_ordini' };
    const _vistaPerSezione = { kanban:'kanban', workflow_dashboard:'analytics', order_tracker:'lista', produzione:'produzione' };
    if(_redirectMap[section]) {
      const _target = _redirectMap[section];
      if(_vistaPerSezione[section] && typeof GestioneOrdini!=='undefined' && typeof GestioneOrdini._setView==='function') {
        /* Si imposta la vista senza ridisegnare: il render arriva subito dopo
           da renderSection, e disegnarla due volte è solo lavoro sprecato. */
        GestioneOrdini._view = _vistaPerSezione[section];
        try { localStorage.setItem('ingly_go_view_v1', GestioneOrdini._view); } catch(e) {}
      }
      if(this.currentSection !== _target) {
        this.currentSection = _target; this.curr = _target; this._prevSection = _target;
        document.querySelectorAll('.section-view.active').forEach(v=>v.classList.remove('active'));
        const _tv = document.getElementById('view-'+_target);
        if(_tv) { _tv.classList.add('active'); _tv.style.animation='none'; _tv.offsetHeight; _tv.style.animation='pageIn .22s ease'; }
        document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
        document.querySelectorAll('.nav-item[data-section="'+_target+'"]').forEach(n=>n.classList.add('active'));
        section = _target;
      }
    }
    if(typeof NavGroups!=='undefined') NavGroups.expandFor(section);
    this.renderSection(section);
  },
  _renderAbort: null,

  async renderSection(s){
    // v3.6: AbortController — cancella render precedente su navigazione rapida
    if(this._renderAbort){ this._renderAbort.abort(); }
    const ctrl = new AbortController();
    this._renderAbort = ctrl;
    // v10: renderSection with null-safe guards
    const _safeRender = (mod, fn) => { try { if(typeof mod !== 'undefined' && typeof mod[fn] === 'function') mod[fn](); } catch(e) { console.warn('[renderSection]', e.message); } };
    const map={      gestione_ordini:()=>{if(typeof GestioneOrdini!=='undefined')GestioneOrdini.render();},
      pipeline:()=>{if(typeof GestioneOrdini!=='undefined'){GestioneOrdini.render();}else(typeof PipelineOS!=='undefined'&&PipelineOS.render());},
      // Legacy aliases → pipeline (no more crashes/double-render)
      workflow:()=>{if(typeof GestioneOrdini!=='undefined'){App.navigate('gestione_ordini');}else{const v=eid('view-pipeline');if(v){document.querySelectorAll('.section-view.active').forEach(x=>x.classList.remove('active'));v.classList.add('active');App.currentSection='pipeline';}(typeof PipelineOS!=='undefined'&&PipelineOS.render());}},
      orders:()=>{if(typeof GestioneOrdini!=='undefined'){GestioneOrdini.render();}else(typeof Orders!=='undefined'&&Orders.render());},
      workflow_dashboard:()=>{
        if(typeof WorkflowDashboard!=='undefined') WorkflowDashboard.render();
        // Auto-inject Goals widget after dashboard renders
        setTimeout(async()=>{
          const dashView = document.getElementById('view-dashboard');
          if(!dashView) return;
          let goalsEl = document.getElementById('goals-weekly-widget');
          if(!goalsEl){
            goalsEl = document.createElement('div');
            goalsEl.id = 'goals-weekly-widget';
            goalsEl.style.cssText = 'max-width:900px;margin:0 auto 16px';
            const firstCard = dashView.querySelector('.card,.kpi-card,.page-content');
            if(firstCard) firstCard.parentNode.insertBefore(goalsEl, firstCard);
            else dashView.prepend(goalsEl);
          }
          if(typeof Goals!=='undefined'){
            goalsEl.innerHTML = await Goals.renderWidget();
          }
        }, 200);
      },
      produzione:()=>{if(typeof GestioneOrdini!=='undefined'){GestioneOrdini.render();}else(typeof Orders!=='undefined'&&Orders.render());},
      sales:()=>{ (typeof Sales!=='undefined'&&Sales.render()); setTimeout(()=>{ document.querySelectorAll('#sales-kpis .kpi-card').forEach((el,i)=>{ el.style.animation='none'; el.style.opacity='0'; el.style.transform='translateY(10px)'; setTimeout(()=>{ el.style.transition='opacity .3s ease '+(i*80)+'ms, transform .3s ease '+(i*80)+'ms'; el.style.opacity='1'; el.style.transform='translateY(0)'; },10); }); },100); },
      sales_archive:()=>{if(typeof SalesArchive!=='undefined')SalesArchive.render();},
      booking:()=>{ if(typeof BookingModule!=='undefined') (typeof BookingModule!=='undefined'&&BookingModule.render()); },
      scanner:()=>{ if(typeof BarcodeScanner!=='undefined') (typeof BarcodeScanner!=='undefined'&&BarcodeScanner.render()); else { const el=document.getElementById('view-scanner'); if(el&&!el.querySelector('.page-title')) App._renderScannerPlaceholder(); } },
      reports:()=>{ setTimeout(async()=>{ try{ const el=document.getElementById('reports-kpis'); if(!el||el.innerHTML.trim()) return; await BDW.init(); const m=BDW.metrics; el.innerHTML=[{l:'Revenue MTD',v:fmtCur(m.revenue.mtd),i:'fa-euro-sign',c:'#22c55e'},{l:'Ordini Attivi',v:m.ops.ordersActive,i:'fa-box-open',c:'#3b82f6'},{l:'Clienti',v:m.clients.total,i:'fa-users',c:'#a855f7'},{l:'Margine',v:m.finance.netMarginPct.toFixed(1)+'%',i:'fa-chart-pie',c:'#f59e0b'}].map(k=>`<div class="kpi-card"><i class="fas ${k.i} kpi-icon" style="color:${k.c}"></i><div class="kpi-value">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join(''); }catch(e){} },150); },
      forecasting:()=>{ if(typeof Forecasting!=='undefined'){ (window.requestIdleCallback||setTimeout)(function(){(typeof Forecasting!=='undefined'&&Forecasting.render());}); } },
      contentcalendar:()=>{ if(typeof ContentCalendar!=='undefined'){ (window.requestIdleCallback||setTimeout)(function(){(typeof ContentCalendar!=='undefined'&&ContentCalendar.render());}); } },
      trendscanner:()=>{if(typeof TrendHunterPro!=='undefined')TrendHunterPro.render();else if(typeof TrendScanner!=='undefined')TrendScanner.render();},
      laserresources:()=>{if(typeof LaserResources!=='undefined')(typeof LaserResources!=='undefined'&&LaserResources.render());},
      risorse:()=>{
        // Alias: "Risorse Laser" nav → redirect to laserresources view
        const lrEl=document.getElementById('view-laserresources');
        const rsEl=document.getElementById('view-risorse');
        if(lrEl&&rsEl){
          // Show laserresources view instead
          document.querySelectorAll('.section-view').forEach(v=>v.classList.remove('active'));
          lrEl.classList.add('active');
          App.currentSection='laserresources';
        }
        if(typeof LaserResources!=='undefined') (typeof LaserResources!=='undefined'&&LaserResources.render());
      },
      fiscal:()=>{if(typeof FiscalRadar!==typeof undefined)(typeof FiscalRadar!=='undefined'&&FiscalRadar.render());},
      etsyai:()=>{if(typeof EtsyAI!=='undefined')(typeof EtsyAI!=='undefined'&&EtsyAI.render());},
      etsy_analytics:()=>{ if(typeof EtsyAnalytics!=='undefined') EtsyAnalytics.render(); },
      bizai:()=>{if(typeof BizAI!=='undefined')(typeof BizAI!=='undefined'&&BizAI.render());},
      photostudio:()=>{if(typeof PhotoStudio!=='undefined')(typeof PhotoStudio!=='undefined'&&PhotoStudio.render());},
      revsim:()=>{if(typeof RevSim!==typeof undefined)(typeof RevSim!=='undefined'&&RevSim.render());},
      replyai:()=>{if(typeof ReplyAI!==typeof undefined)(typeof ReplyAI!=='undefined'&&ReplyAI.render());},
      comptrack:()=>{if(typeof CompetitorPrices!=='undefined')(typeof CompetitorPrices!=='undefined'&&CompetitorPrices.render());},
      fiera:()=>{if(typeof FieraAI!=='undefined')(typeof FieraAI!=='undefined'&&FieraAI.render());},
      briefing:()=>MorningBriefing.openManual(),
      clv:()=>{if(typeof CLVDash!==typeof undefined)(typeof CLVDash!=='undefined'&&CLVDash.render());},
      goals:()=>{if(typeof InvestPlanner!=='undefined'&&typeof InvestPlanner.render==='function'){InvestPlanner.render();}else if(typeof GoalTracker!=='undefined'){GoalTracker.render();}},
      weeklyreport:()=>{if(typeof WeeklyReport!==typeof undefined)(window.requestIdleCallback||setTimeout)(()=>(typeof WeeklyReport!=='undefined'&&WeeklyReport.render()),100);},
      profitleak:()=>{if(typeof ProfitLeakDetector!==typeof undefined)ProfitLeakDetector.renderPage();},
      stockalert:()=>{if(typeof StockAlert!==typeof undefined)StockAlert.render?.();},
      profitscope:()=>{if(typeof ProfitLeakDetector!==typeof undefined)ProfitLeakDetector.renderPage?.();},
      taxcalendar:()=>{if(typeof TaxCalendar!=='undefined')TaxCalendar.render?.(); else if(typeof FiscalRadar!=='undefined')FiscalRadar.render?.();},
      xmlsdi:()=>{if(typeof XMLHelper!=='undefined')XMLHelper.render?.();},
      b2bpitch:()=>{if(typeof B2BPitch!==typeof undefined)B2BPitch.render?.();},
      quoteintel:()=>{if(typeof QuoteIntelligence!=='undefined')(typeof QuoteIntelligence!=='undefined'&&QuoteIntelligence.render());},
      dynamicprice:()=>{if(typeof DynamicPriceSuggester!=='undefined')(typeof DynamicPriceSuggester!=='undefined'&&DynamicPriceSuggester.render());},
      timetracker:()=>{if(typeof TimeTracker!==typeof undefined)(typeof TimeTracker!=='undefined'&&TimeTracker.render());},
      supplierintel:()=>{if(typeof SupplierIntel!=='undefined')(typeof SupplierIntel!=='undefined'&&SupplierIntel.render());},
      contentperf:()=>{ if(typeof ContentPerf!=='undefined')(typeof ContentPerf!=='undefined'&&ContentPerf.render()); else setTimeout(()=>ContentPerf?.render(),800); },
      competitormon:()=>{ if(typeof CompetitorMon!=='undefined')(typeof CompetitorMon!=='undefined'&&CompetitorMon.render()); else setTimeout(()=>CompetitorMon?.render(),800); },
      smartnotif:()=>{if(typeof SmartNotif!=='undefined')(typeof SmartNotif!=='undefined'&&SmartNotif.render());},
      pdfmonth:()=>{ if(typeof MonthlyReport!=='undefined'){ (window.requestIdleCallback||setTimeout)(function(){(typeof MonthlyReport!=='undefined'&&MonthlyReport.render());}); } },
      recurring:()=>RecurringInvoices.renderView(),
      competitor:()=>{if(typeof CompetitorAI!=='undefined')(typeof CompetitorAI!=='undefined'&&CompetitorAI.render());},
      socialproof:()=>{if(typeof SocialProofAI!=='undefined')(typeof SocialProofAI!=='undefined'&&SocialProofAI.render());},
      dashboard:()=>{if(typeof Dashboard!=='undefined'){(typeof Dashboard!=='undefined'&&Dashboard.render());Dashboard._startAutoRefresh?.();}},
      ai:()=>{if(typeof AILayer!=='undefined')(typeof AILayer!=='undefined'&&AILayer.render());},
      kpi:()=>{ if(typeof KPIEngine!=='undefined'){ requestIdleCallback ? requestIdleCallback(()=>KPIEngine.renderPage()) : setTimeout(()=>KPIEngine.renderPage(),100); } },
      quoter:()=>Quoter.init(),
      template_docs:()=>{ if(typeof TemplateDocsModule!=='undefined') (typeof TemplateDocsModule!=='undefined'&&TemplateDocsModule.render()); },
      lasercalc:()=>LaserCalcPage.init(),
      // workflow → pipeline alias above
      // sales → pipeline alias above
      cashflow:()=>{if(typeof Cashflow!=='undefined')(typeof Cashflow!=='undefined'&&Cashflow.render());},
      inventory:()=>{if(typeof Inventory!=='undefined')(typeof Inventory!=='undefined'&&Inventory.render());},
      items:()=>{if(typeof Inventory!=='undefined')(typeof Inventory!=='undefined'&&Inventory.render());},
      materials:()=>{if(typeof Materials!=='undefined')(typeof Materials!=='undefined'&&Materials.render());},
      equipment:()=>{if(typeof Equipment!=='undefined')(typeof Equipment!=='undefined'&&Equipment.render());},
      lab_setup:()=>{ if(typeof LabSetup!=='undefined') (typeof LabSetup!=='undefined'&&LabSetup.render()); },
      components:()=>{if(typeof Components!=='undefined')(typeof Components!=='undefined'&&Components.render());},
      gadgets:()=>{if(typeof Gadgets!=='undefined')(typeof Gadgets!=='undefined'&&Gadgets.render());},
      fixed_costs:()=>{if(typeof FixedCosts!=='undefined')(typeof FixedCosts!=='undefined'&&FixedCosts.render());},
      clients:()=>{if(typeof Clients!=='undefined')(typeof Clients!=='undefined'&&Clients.render());},
      catalog:()=>{if(typeof Catalog!=='undefined')(typeof Catalog!=='undefined'&&Catalog.render());},
      marketing:()=>{if(typeof Marketing!=='undefined')(typeof Marketing!=='undefined'&&Marketing.render());},
      etsy:()=>{if(typeof Etsy!=='undefined')(typeof Etsy!=='undefined'&&Etsy.render());},
      calendar:()=>{if(typeof Calendar!=='undefined')(typeof Calendar!=='undefined'&&Calendar.render());},
      strategy:()=>{if(typeof Strategy!=='undefined')(typeof Strategy!=='undefined'&&Strategy.render());},
      finance:()=>{if(typeof Finance!=='undefined')(typeof Finance!=='undefined'&&Finance.render());},
      social:()=>{if(typeof Social!=='undefined')(typeof Social!=='undefined'&&Social.render());},
      socialstudio:()=>{ if(typeof SocialStudio!=='undefined') SocialStudio.load(); },
      design_studio:()=>{ if(typeof InglyDesign!=='undefined') (typeof InglyDesign!=='undefined'&&InglyDesign.render()); },
      suppliers: () => { if(typeof SuppliersManager !== 'undefined') (typeof SuppliersManager!=='undefined'&&SuppliersManager.render()); },
      ideas: () => { if(typeof IdeasModule !== 'undefined') (typeof IdeasModule!=='undefined'&&IdeasModule.render()); },
      apparel:()=>{ if(typeof ApparelQuoter!=='undefined') ApparelQuoter.render(); },
      print3d:()=>{ if(typeof Print3DQuoter!=='undefined') Print3DQuoter.render(); },
      competitor:()=>{ if(typeof CompetitorsModule!=='undefined') CompetitorsModule.render(); },
      competitors:()=>{ if(typeof CompetitorsBoard!=='undefined') CompetitorsBoard.render(); },
      marketintel:()=>{ if(typeof CompetitorTracker!=='undefined') (typeof CompetitorTracker!=='undefined'&&CompetitorTracker.render()); },
      leadscorer:()=>{ if(typeof LeadScorer!=='undefined') (typeof LeadScorer!=='undefined'&&LeadScorer.render()); },
      /* `AIStudio` esiste ma non ha `render`: è un insieme di funzioni AI
         (generateDescription, generateReply, generateNames…), non il
         disegnatore di una sezione. La chiamata lanciava
         «AIStudio.render is not a function» a ogni apertura, e la vista —
         che ha il suo contenuto statico — si vedeva lo stesso. Si controlla
         il metodo, non solo l'oggetto. */
      studio_ai:()=>{ if(typeof AIStudio!=='undefined' && typeof AIStudio.render==='function') AIStudio.render(); },
      web_presence:()=>{ if(typeof WebPresence!=='undefined') (typeof WebPresence!=='undefined'&&WebPresence.render()); },
      inglydesign:()=>{ if(typeof InglyDesign!=='undefined') (typeof InglyDesign!=='undefined'&&InglyDesign.render()); },
      
      paints:()=>{ if(typeof Paints!=='undefined') (typeof Paints!=='undefined'&&Paints.render()); else (typeof Materials!=='undefined'&&Materials.render()); },
      imagelib:()=>{ if(typeof ImageLib!=='undefined') (typeof ImageLib!=='undefined'&&ImageLib.render()); },
      innovation:()=>{ if(typeof Innovation!=='undefined') (typeof Innovation!=='undefined'&&Innovation.render()); },
      opportunity:()=>{ if(typeof Opportunity!=='undefined') (typeof Opportunity!=='undefined'&&Opportunity.render()); },
      etsy_pulse:()=>{ if(typeof EtsyPulse!=='undefined') (typeof EtsyPulse!=='undefined'&&EtsyPulse.render()); },
      price_radar:()=>{ if(typeof PriceRadar!=='undefined') (typeof PriceRadar!=='undefined'&&PriceRadar.render()); },
      demand_map:()=>{ if(typeof DemandMap!=='undefined') (typeof DemandMap!=='undefined'&&DemandMap.render()); },
      product_hunter:()=>{ if(typeof ProductHunter!=='undefined') (typeof ProductHunter!=='undefined'&&ProductHunter.render()); },
      market_agent:()=>{ if(typeof MarketAgent!=='undefined') (typeof MarketAgent!=='undefined'&&MarketAgent.render()); },
      etsy_seo_wizard:()=>{ if(typeof EtsySEOWizard!=='undefined') (typeof EtsySEOWizard!=='undefined'&&EtsySEOWizard.render()); },
      live_intel:()=>{ if(typeof LiveIntel!=='undefined') (typeof LiveIntel!=='undefined'&&LiveIntel.render()); },
      listino:()=>{ if(typeof Listino!=='undefined') (typeof Listino!=='undefined'&&Listino.render()); else (typeof Catalog!=='undefined'&&Catalog.render()); },
      decision:()=>{ if(typeof DecisionEngine!=='undefined') (typeof DecisionEngine!=='undefined'&&DecisionEngine.render()); },
      growthengine:()=>{ if(typeof GrowthEngine!=='undefined') (typeof GrowthEngine!=='undefined'&&GrowthEngine.render()); },
      brand_identity:()=>{if(typeof BrandIdentity!=='undefined')(typeof BrandIdentity!=='undefined'&&BrandIdentity.render());},
      team:()=>{if(typeof Team!=='undefined')(typeof Team!=='undefined'&&Team.render());},
      analytics:()=>{if(typeof Analytics!=='undefined')(typeof Analytics!=='undefined'&&Analytics.render());},
      bu:()=>{if(typeof BU!=='undefined')(typeof BU!=='undefined'&&BU.render());},
      legal:()=>{if(typeof Legal!=='undefined')(typeof Legal!=='undefined'&&Legal.render());},
      projects:()=>{if(typeof Projects!=='undefined')(typeof Projects!=='undefined'&&Projects.render());},
      backup:()=>{if(typeof Backup!=='undefined')(typeof Backup!=='undefined'&&Backup.render());},
      etsy_seo:()=>{if(typeof EtsySEO!=='undefined')(typeof EtsySEO!=='undefined'&&EtsySEO.render());},
      portabile:()=>{if(typeof Portabile!=='undefined')(typeof Portabile!=='undefined'&&Portabile.render());},
      aicoach:()=>{if(typeof AICoach!=='undefined')(typeof AICoach!=='undefined'&&AICoach.render());},
      barcode:()=>{if(typeof BarcodeScanner!=='undefined')(typeof BarcodeScanner!=='undefined'&&BarcodeScanner.render());},
      history:()=>{if(typeof HistoryModule!=='undefined')(typeof HistoryModule!=='undefined'&&HistoryModule.render());},
      settings:()=>{ Settings.load(); setTimeout(()=>{ const _pic=document.getElementById('icon-pack-picker-container'); if(_pic && typeof IconPacks!=='undefined') _pic.innerHTML=IconPacks.renderPicker(); },200); },
      // ── v64 Intelligence Suite ──────────────────────────────
      clientintel:()=>{if(typeof ClientIntelligenceEngine!=='undefined')(typeof ClientIntelligenceEngine!=='undefined'&&ClientIntelligenceEngine.render());},
      forecaster:()=>{if(typeof FinancialForecaster!=='undefined')(typeof FinancialForecaster!=='undefined'&&FinancialForecaster.render());},
      intel:()=>{ if(typeof IntelHub!=='undefined'){ requestIdleCallback ? requestIdleCallback(()=>(typeof IntelHub!=='undefined'&&IntelHub.render())) : setTimeout(()=>(typeof IntelHub!=='undefined'&&IntelHub.render()),100); } },
      workspace:    ()=>{ setTimeout(()=>{ if(typeof WorkspaceManager!=='undefined') WorkspaceManager.render(); },80); },
      bank_funds:   ()=>{ setTimeout(()=>{ if(typeof BankFunds!=='undefined') BankFunds.render(); },100); },
      laser_b2b:    ()=>{ setTimeout(()=>{ if(typeof LaserB2B!=='undefined') LaserB2B.render(); },100); },
      market_intel: ()=>{ setTimeout(()=>{ if(typeof MarketIntel!=='undefined') MarketIntel.render('home'); },100); },
      trend_hunter: ()=>{ setTimeout(()=>{ if(typeof MarketIntel!=='undefined') MarketIntel.render('trend_hunter'); },100); },
      product_hunter:()=>{ setTimeout(()=>{ if(typeof MarketIntel!=='undefined') MarketIntel.render('product_hunter'); },100); },
      market_agent: ()=>{ setTimeout(()=>{ if(typeof MarketIntel!=='undefined') MarketIntel.render('market_agent'); },100); },
      etsy_seo:     ()=>{ setTimeout(()=>{ if(typeof MarketIntel!=='undefined') MarketIntel.render('etsy_seo'); },100); },
      growth_engine:()=>{ setTimeout(()=>{ if(typeof MarketIntel!=='undefined') MarketIntel.render('growth_engine'); },100); },
      lead_scorer:  ()=>{ setTimeout(()=>{ if(typeof MarketIntel!=='undefined') MarketIntel.render('lead_scorer'); },100); },
    };
    if(ctrl.signal.aborted) return;
    try{if(map[s])map[s]();}catch(err){INGLY_DEV&&console.warn('[renderSection:'+s+']',err.message);}
    // v3.6: reset VirtualList state on section change
    if(typeof Catalog!=='undefined' && s!=='catalog') {
      Catalog._vlActive=false;
      const si = document.getElementById('content-inner');
      if(si&&si._vlListener){si.removeEventListener('scroll',si._vlListener);si._vlListener=null;}
    }
  },
  filterNav(q){
    const v=q.toLowerCase().trim();
    if(v){
      // Expand all groups while searching
      document.querySelectorAll('.nav-group[id^="ng-"]').forEach(g=>g.classList.remove('collapsed'));
    } else {
      // Restore saved state on clear
      if(typeof NavGroups!=='undefined') NavGroups.init();
    }
    document.querySelectorAll('.nav-item').forEach(item=>{
      const txt=item.textContent.toLowerCase();
      item.style.display=txt.includes(v)?'':'none';
    });
    document.querySelectorAll('.nav-group-title').forEach(g=>g.style.display=v?'none':'');
    // Show nav-group-items always while filtering
    if(v) document.querySelectorAll('.nav-group-items').forEach(g=>g.style.maxHeight='none');
    else document.querySelectorAll('.nav-group-items').forEach(g=>g.style.maxHeight='');
  },
  async populateClientSelects(){
    const clients=await AppStore.get('clients').catch(()=>[]);
    const opts=['<option value="">-- Seleziona --</option>',
      ...clients.map(c=>`<option value="${c.id}">${c.name}</option>`)].join('');
    // FIX: sale-client is a hidden input (not a select) — excluded from this list
    ['q-client','proj-client','ord-client','bk-client'].forEach(id=>{
      const el=eid(id);if(el)el.innerHTML=opts;
    });
  },
  async reset(){
    // v4.6 FIX: lista completa tutti gli store IDB
    const stores=['clients','sales','quotes','inventory','cashflow','catalog','team','events',
      'innovation','bu','materials','projects','history','backups',
      'equipment','gadgets','fixed_costs','components','social',
      'marketing_campaigns','image_lib','xmlinvoices','orders','bookings',
      'timelogs','timers','social_posts','scanner_log','shipments',
      'suppliers','supplier_orders','ideas','products','items',
      'social_accounts','competitors','paints','client_pricelists',
      'notifications','tax_events','goals','cost_entries','supplier_perf',
      'content_analytics','quote_templates','signatures','dash_layout',
      'recurring_invoices','workflow_steps','order_events','pipeline',
      'ai_log','kpi_snap','kpi_cache','scanner_history','versions'];
    for(const s of stores){
      const items=await IDB.getAll(s);
      for(const it of items)await IDB.del(s,it.id||it.key)
    }
    await IDB.del('settings','main')
    toast('Reset completato. Ricaricamento...','warning');
    setTimeout(()=>location.reload(),1500);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 🤖 INGLY AUTOMATION ENGINE v12
// Automazioni intelligenti: stage changes, alerts, suggerimenti, cleanup
// ═══════════════════════════════════════════════════════════════════════
const AutoEngine = {
  _booted: false,
  _SK: 'ingly_automation_v1',

  getCfg(){
    try{ return JSON.parse(localStorage.getItem(this._SK)||'{}'); }catch{ return {}; }
  },
  saveCfg(d){ localStorage.setItem(this._SK, JSON.stringify(d)); },

  // ── Boot: chiamato una volta da App.init ──────────────────────────
  async boot(){
    if(this._booted) return;
    this._booted = true;

    // 1. Register Bus event handlers
    this._registerBusHandlers();

    // 2. Run daily checks (once per session max)
    const todayStr = new Date().toISOString().split('T')[0];
    const lastRun = localStorage.getItem('ingly_ae_last_run');
    if(lastRun !== todayStr){
      localStorage.setItem('ingly_ae_last_run', todayStr);
      setTimeout(()=>this.runDailyChecks(), 3500);
    }

    // 3. Quoter auto-save (every 60s)
    setInterval(()=>this.quoterAutoSave(), 60000);

    // 4. Refresh Goals widget every 30s if dashboard visible
    setInterval(()=>{
      if(typeof App!=='undefined' && App.currentSection==='dashboard'){
        const el=document.getElementById('goals-weekly-widget');
        if(el && typeof Goals!=='undefined') Goals.renderWidget().then(html=>{ el.innerHTML=html; }).catch(()=>{});
      }
    }, 30000);

    // Boot SmartReminder
    if(typeof SmartReminder!=='undefined') SmartReminder.checkOnBoot();
    // Boot PushNotifications daily check
    if(typeof PushNotifications!=='undefined') PushNotifications.scheduleDailyCheck();
    console.log('🤖 AutoEngine booted');
  },

  // ── Bus event handlers ─────────────────────────────────────────────
  _registerBusHandlers(){
    if(typeof Bus === 'undefined') return;

    // When an order changes stage → smart actions
    Bus.on('order:stageChanged', (data)=>{
      try{ this.onOrderStageChange(data); }catch(e){}
    });

    // When a sale is created → refresh Goals + dashboard stats
    Bus.on('sale:created', ()=>{
      try{
        if(typeof Goals!=='undefined') Goals.refresh().catch(()=>{});
        if(typeof KPIEngine!=='undefined') KPIEngine.run().then(kpi=>{
          if(kpi && typeof Dashboard!=='undefined') Dashboard.updateKPIs(kpi).catch(()=>{});
        }).catch(()=>{});
      }catch(e){}
    });

    // When cashflow changes → refresh Finance P&L
    Bus.on('cashflow:changed', ()=>{
      try{
        if(typeof Finance!=='undefined' && typeof App!=='undefined' && App.currentSection==='finance'){
          Finance.renderPL().catch(()=>{});
        }
      }catch(e){}
    });

    // When pipeline quote is confirmed → auto-create order
    Bus.on('pipeline:confirmed', (data)=>{
      try{ this.onQuoteConfirmed(data); }catch(e){}
    });
  },

  // ── Order stage change automation ──────────────────────────────────
  async onOrderStageChange(data){
    const { orderId, newStage, oldStage } = data || {};
    if(!orderId || !newStage) return;
    const DONE = ['completato','consegnato','delivered','done','sold','venduto'];
    if(!DONE.includes((newStage||'').toLowerCase())) return;

    // Get order
    const order = await IDB.get('orders', +orderId||orderId).catch(()=>null);
    if(!order) return;
    if(order._sale_created) return; // already handled

    // Check if sale already exists for this order
    const allSales = await IDB.getAll('sales').catch(()=>[]);
    const hasSale = allSales.some(s=>String(s.fromOrderId)===String(orderId)||String(s.originOrder)===String(orderId));
    if(hasSale) return;

    // Show toast with action button
    const toastId = '_ae_complete_' + orderId;
    const existingToast = document.getElementById(toastId);
    if(existingToast) return;
    const toast_el = document.createElement('div');
    toast_el.id = toastId;
    toast_el.style.cssText = 'position:fixed;bottom:80px;right:16px;z-index:9998;background:var(--bg-card);border:1.5px solid #22c55e;border-radius:12px;padding:12px 16px;box-shadow:0 8px 32px rgba(0,0,0,.4);max-width:320px;animation:slideIn .3s ease';
    toast_el.innerHTML = `
      <div style="font-size:12px;font-weight:800;color:#22c55e;margin-bottom:5px">🎉 Ordine completato!</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">${order.clientName||'Cliente'} — ${order.name||'Ordine'} · €${Math.round(order.total||0)}</div>
      <div style="display:flex;gap:7px">
        <button onclick="AutoEngine.createSaleFromOrder('${orderId}');document.getElementById('${toastId}')?.remove()"
          style="flex:2;padding:6px 10px;background:#22c55e;color:#000;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:800">💰 Registra vendita</button>
        <button onclick="document.getElementById('${toastId}')?.remove()"
          style="flex:1;padding:6px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted)">Dopo</button>
      </div>`;
    document.getElementById('toasts-container')?.appendChild(toast_el) || document.body.appendChild(toast_el);
    setTimeout(()=>toast_el.remove(), 12000);
  },

  // Create sale from completed order
  async createSaleFromOrder(orderId){
    const order = await IDB.get('orders', +orderId||orderId).catch(()=>null);
    if(!order) return;
    const sale = {
      id: Date.now(),
      clientId: order.clientId || null,
      clientName: order.clientName || order.client || '',
      date: new Date().toISOString().split('T')[0],
      desc: order.name || 'Vendita da ordine',
      amount: order.total || 0,
      status: 'pagato',
      channel: 'Diretto',
      fromOrderId: order.id,
      createdAt: new Date().toISOString(),
    };
    await IDB.put('sales', sale);
    // Mark order
    order._sale_created = true;
    await IDB.put('orders', order);
    Bus.emit('sale:created', sale);
    if(typeof toast!=='undefined') toast('💰 Vendita registrata automaticamente!','success');
    if(typeof Goals!=='undefined') Goals.refresh().catch(()=>{});
  },

  // ── Quote confirmed → auto-create order ───────────────────────────
  async onQuoteConfirmed(data){
    // Already handled by WorkflowBridge — just refresh dashboard
    setTimeout(()=>{
      if(typeof Goals!=='undefined') Goals.refresh().catch(()=>{});
    }, 500);
  },

  // ── Daily checks ───────────────────────────────────────────────────
  async runDailyChecks(){
    try{ await this.checkAtRiskClients(); }catch(e){}
    try{ await this.checkExpiringQuotes(); }catch(e){}
    try{ await this.checkLowMarginProducts(); }catch(e){}
    try{ await this.checkSeasonalOpportunities(); }catch(e){}
    try{ await this.injectFinancePL(); }catch(e){}
    console.log('🤖 Daily checks done');
  },

  // Check clients inactive > 90 days
  async checkAtRiskClients(){
    const [clients, sales] = await Promise.all([
      IDB.getAll('clients').catch(()=>[]),
      IDB.getAll('sales').catch(()=>[]),
    ]);
    const now = Date.now();
    const atRisk = clients.filter(cl=>{
      const cSales = sales.filter(s=>s.clientId===cl.id||(s.clientName||'').toLowerCase()===(cl.name||'').toLowerCase());
      if(!cSales.length) return false; // never bought — not at-risk
      const lastSaleDate = Math.max(...cSales.map(s=>new Date(s.date||0).getTime()));
      const days = Math.floor((now - lastSaleDate)/864e5);
      return days >= 90 && days < 365; // between 90 and 365 days inactive
    });
    if(atRisk.length > 0 && typeof SmartNotif !== 'undefined'){
      SmartNotif.addHistory({
        id: 'at_risk_' + new Date().toISOString().split('T')[0],
        type: 'client_risk',
        title: `${atRisk.length} cliente/i inattivo/i da >90 giorni`,
        desc: atRisk.slice(0,3).map(c=>c.name||'—').join(', ') + (atRisk.length>3?'...':''),
        icon: '🔴',
        link: 'clients',
        ts: Date.now(),
        read: false,
      });
      SmartNotif._updateTopbarBadge();
    }
  },

  // Check quotes open > 7 days without response
  async checkExpiringQuotes(){
    const quotes = await IDB.getAll('quotes').catch(()=>[]);
    const now = Date.now();
    const expiring = quotes.filter(q=>{
      if(q.status==='confermato'||q.status==='rifiutato'||q.status==='scaduto') return false;
      const created = new Date(q.created||q.date||0).getTime();
      const days = Math.floor((now-created)/864e5);
      return days >= 7 && days <= 30;
    });
    if(expiring.length > 0 && typeof SmartNotif !== 'undefined'){
      SmartNotif.addHistory({
        id: 'expiring_quotes_' + new Date().toISOString().split('T')[0],
        type: 'quote_followup',
        title: `${expiring.length} preventivo/i senza risposta (>7gg)`,
        desc: 'Considera di fare follow-up per chiudere le trattative',
        icon: '📋',
        link: 'pipeline',
        ts: Date.now(),
        read: false,
      });
      SmartNotif._updateTopbarBadge();
    }
  },

  // Check low-margin products
  async checkLowMarginProducts(){
    const catalog = await IDB.getAll('catalog').catch(()=>[]);
    const lowMargin = catalog.filter(p=>p.costPrice>0&&p.salePrice>0&&(p.salePrice-p.costPrice)/p.salePrice<0.20);
    if(lowMargin.length > 0 && typeof SmartNotif !== 'undefined'){
      SmartNotif.addHistory({
        id: 'low_margin_' + new Date().toISOString().split('T')[0],
        type: 'catalog_health',
        title: `${lowMargin.length} prodotto/i con margine <20%`,
        desc: lowMargin.slice(0,2).map(p=>p.name).join(', '),
        icon: '📦',
        link: 'catalog',
        ts: Date.now(),
        read: false,
      });
      SmartNotif._updateTopbarBadge();
    }
  },

  // Check seasonal opportunities for next 14 days
  async checkSeasonalOpportunities(){
    const SEASONAL = [
      {m:2,d:14,name:"San Valentino 💝",prep:14},
      {m:5,d:12,name:"Festa della Mamma 💐",prep:21},
      {m:6,d:15,name:"Stagione Lauree 🎓",prep:30},
      {m:11,d:29,name:"Black Friday 🛍️",prep:21},
      {m:12,d:8,name:"Rush Natalizio 🎄",prep:30},
    ];
    const now = new Date();
    for(const ev of SEASONAL){
      const d = new Date(now.getFullYear(), ev.m-1, ev.d);
      if(d < now){ d.setFullYear(now.getFullYear()+1); }
      const daysUntil = Math.floor((d-now)/864e5);
      if(daysUntil <= ev.prep && daysUntil > 0 && typeof SmartNotif !== 'undefined'){
        const key = 'seasonal_' + ev.m + '_' + now.getFullYear();
        const hist = SmartNotif.getHistory() || [];
        if(!hist.find(h=>h.id===key)){
          SmartNotif.addHistory({
            id: key,
            type: 'seasonal',
            title: `${ev.name} tra ${daysUntil} giorni`,
            desc: 'Prepara prodotti e offerte stagionali in anticipo',
            icon: '🌿',
            link: 'catalog',
            ts: Date.now(),
            read: false,
          });
          SmartNotif._updateTopbarBadge();
        }
        break;
      }
    }
  },

  // Inject Finance P&L on first load
  async injectFinancePL(){
    const financePlEl = document.getElementById('finance-pl-container');
    if(financePlEl && typeof Finance !== 'undefined'){
      Finance.renderPL().catch(()=>{});
    }
  },

  // ── Quoter auto-save ────────────────────────────────────────────────
  quoterAutoSave(){
    try{
      if(typeof Quoter === 'undefined') return;
      if(!Quoter.lines || !Quoter.lines.length) return;
      const draft = {
        ts: Date.now(),
        name: document.getElementById('q-name')?.value || '',
        clientName: document.getElementById('q-client')?.value || '',
        lines: Quoter.lines,
        markup: Quoter._markup,
        discount: Quoter._discount,
        iva: Quoter._ivaMode,
      };
      localStorage.setItem('ingly_quoter_draft', JSON.stringify(draft));
    }catch(e){}
  },

  // Restore quoter draft on reopen
  quoterRestoreDraft(){
    try{
      const d = JSON.parse(localStorage.getItem('ingly_quoter_draft')||'null');
      if(!d || !d.lines || !d.lines.length) return null;
      const age = Math.floor((Date.now()-d.ts)/60000);
      if(age > 1440) return null; // older than 24h — discard
      return d;
    }catch{ return null; }
  },

  clearQuoterDraft(){
    localStorage.removeItem('ingly_quoter_draft');
  },

  // ── Finance: auto-categorize expense by keywords ─────────────────
  autoCategorizeExpense(desc){
    const d = (desc||'').toLowerCase();
    if(d.match(/mdf|betulla|legno|acrilico|materiale|laserplust|necchi/)) return 'Materiali';
    if(d.match(/elettricità|luce|gas|acqua|affitto|canone/)) return 'Costi fissi';
    if(d.match(/amazon|spedizione|corriere|dhl|ups|poste|posta/)) return 'Spedizioni';
    if(d.match(/attrezzatura|macchina|laser|strumento|tool|software/)) return 'Attrezzatura';
    if(d.match(/etsy|marketplace|commissione|fee|abbonamento/)) return 'Marketing';
    if(d.match(/commercialista|avvocato|consulen|professionista/)) return 'Consulenze';
    if(d.match(/imballaggio|packaging|scatola|cartone|nastro/)) return 'Packaging';
    return 'Altro';
  },
};
window.AutoEngine = AutoEngine;
;

// ===== KPI ENGINE =====
window.App = App;

