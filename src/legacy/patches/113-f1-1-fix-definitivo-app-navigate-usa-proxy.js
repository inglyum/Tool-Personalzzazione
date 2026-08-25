
/* ════════════════════════════════════════════════════════════════
   F1.1 FIX DEFINITIVO APP.NAVIGATE — usa Proxy
   Il problema: il nostro defineProperty arriva con setInterval
   a 100ms, ma i 21 override si eseguono subito al parsing.
   Soluzione: sostituiamo App con un Proxy che intercetta QUALSIASI
   tentativo di sovrascrivere navigate e lo reindirizza a NavBus.
   ════════════════════════════════════════════════════════════ */
(function fixNavigateForever(){
  var _tries = 0;
  var _t = setInterval(function(){
    if(typeof App === 'undefined' || typeof NavBus === 'undefined'){
      if(++_tries > 60) clearInterval(_t);
      return;
    }
    clearInterval(_t);

    // Ottieni la navigate reale (già 21-volte-wrapped ma funzionante)
    var _realNavigate = App.navigate;

    // Usa Proxy per intercettare assegnazioni future a App.navigate
    try {
      var _appProxy = new Proxy(App, {
        set: function(target, prop, value, receiver){
          if(prop === 'navigate'){
            // Qualcuno sta sovrascrivendo navigate — registra su NavBus invece
            console.warn('[NavBus] Blocked override of App.navigate. Register via NavBus.on() instead.');
            // Esegui la funzione ma wrappandola nel sistema esistente
            var _newFn = value;
            var _prevNav = target.navigate;
            NavBus.onAny(function(section){
              try { _newFn.call(App, section); } catch(e){}
            });
            return true; // Simula successo senza sovrascrivere
          }
          return Reflect.set(target, prop, value, receiver);
        }
      });
      // Non possiamo sostituire App con Proxy facilmente senza rompere il file
      // Usiamo invece defineProperty in modo più aggressivo
    } catch(e) {}

    // Approccio più semplice e sicuro: ridefinisci navigate non-writable ora
    // che siamo sicuri che il NavBus sia installato e funzionante
    try {
      var _currentNav = App.navigate;
      Object.defineProperty(App, 'navigate', {
        get: function(){ return _currentNav; },
        set: function(fn){
          console.warn('[NavBus v2] Blocked App.navigate override. Use NavBus.on() instead.');
          // Estrai side-effects dalla funzione e registrali su NavBus
          NavBus.onAny(function(s){ try{ fn(s); }catch(e){} });
        },
        configurable: false
      });
      console.log('[NavBus v2] ✅ App.navigate permanently protected via property descriptor');
    } catch(e){
      console.log('[NavBus v2] defineProperty failed (already defined):', e.message);
    }
  }, 150);
})();

/* ════════════════════════════════════════════════════════════════
   F1.3 BREADCRUMB NAVIGATION
   ════════════════════════════════════════════════════════════ */
(function installBreadcrumb(){
  var SECTION_NAMES = {
    dashboard:'Dashboard ROI', sales:'Vendite & Fatture', clients:'CRM Clienti',
    quoter:'Smart Quoter', lasercalc:'🧮 Calc Laser', print3d:'Smart Quote 3D',
    apparel:'Smart Quote Apparel', gadgets:'Magazzino Gadget',
    fixed_costs:'Costi Fissi', cashflow:'Cashflow', finance:'Finance Pro',
    gestione_ordini:'Ordini & Workflow', catalog:'Catalogo',
    materials:'Materiali', inventory:'Inventario', equipment:'Attrezzature',
    marketing:'Marketing', etsy:'Etsy', calendar:'Calendario',
    settings:'Impostazioni', items:'Magazzino', projects:'Progetti',
    ai:'AI Decisioni', kpi:'KPI Live', analytics:'Analytics',
    goals:'Obiettivi', intel:'Intelligence Hub', decision:'Decision Engine',
    listino:'Listino B2B', suppliers:'Fornitori', ideas:'Idee',
    finance:'Finance Pro', social:'Social', backup:'Backup',
  };

  var SECTION_GROUPS = {
    dashboard:'Home', sales:'Vendite', clients:'Vendite', quoter:'Preventivi',
    lasercalc:'Preventivi', print3d:'Preventivi', apparel:'Preventivi',
    gadgets:'Magazzino', fixed_costs:'Finanza', cashflow:'Finanza',
    finance:'Finanza', gestione_ordini:'Produzione', catalog:'Catalogo',
    materials:'Magazzino', inventory:'Magazzino', equipment:'Magazzino',
    items:'Magazzino', marketing:'Marketing', etsy:'Marketing',
    settings:'Sistema', backup:'Sistema', ai:'AI', kpi:'Analytics',
    analytics:'Analytics', goals:'Analytics', intel:'Analytics',
    decision:'Analytics', listino:'Vendite', suppliers:'Acquisti',
    ideas:'Creatività', social:'Social',
  };

  function updateBreadcrumb(section){
    var bc = document.getElementById('ingly-breadcrumb');
    if(!bc) return;
    var group = SECTION_GROUPS[section] || 'Tool';
    var name  = SECTION_NAMES[section] || section;
    bc.innerHTML = '<span class="bc-home" onclick="App.navigate(\'dashboard\')">🏠 INGLY OS</span>'
      +'<span class="bc-sep">›</span>'
      +'<span>'+group+'</span>'
      +'<span class="bc-sep">›</span>'
      +'<span class="bc-cur">'+name+'</span>';
  }

  // Inietta breadcrumb nel layout
  function injectBreadcrumb(){
    var content = document.getElementById('content');
    if(!content || document.getElementById('ingly-breadcrumb')) return;
    var bc = document.createElement('div');
    bc.id = 'ingly-breadcrumb';
    bc.innerHTML = '<span class="bc-home" onclick="App.navigate(\'dashboard\')">🏠 INGLY OS</span><span class="bc-sep">›</span><span class="bc-cur">Dashboard</span>';
    content.insertBefore(bc, content.firstChild);
  }

  if(typeof NavBus !== 'undefined'){
    NavBus.onAny(updateBreadcrumb);
  }
  setTimeout(injectBreadcrumb, 800);
})();

/* ════════════════════════════════════════════════════════════════
   F1.4 TOAST SYSTEM UPGRADE
   Queue, deduplication, azione click, progress bar
   ════════════════════════════════════════════════════════════ */
(function installToastUpgrade(){
  // Crea container dedicato
  var container;
  function getContainer(){
    if(!container || !document.contains(container)){
      container = document.createElement('div');
      container.id = 'ingly-toasts';
      document.body.appendChild(container);
    }
    return container;
  }

  var _shown = {};
  var MAX_TOASTS = 4;

  window.iToast = function(msg, type, opts){
    opts = opts || {};
    var c = getContainer();

    // Deduplica
    if(_shown[msg] && Date.now() - _shown[msg] < 2000) return;
    _shown[msg] = Date.now();

    // Max 4 toast contemporanei
    var existing = c.querySelectorAll('.itoast');
    if(existing.length >= MAX_TOASTS) existing[0].remove();

    var icons = {success:'✅', error:'❌', warning:'⚠️', info:'ℹ️'};
    var t = document.createElement('div');
    t.className = 'itoast ' + (type||'info');
    t.innerHTML = '<span class="it-icon">'+(icons[type]||'ℹ️')+'</span>'
      +'<div class="it-body"><div class="it-title">'+msg+'</div>'
      +(opts.sub?'<div class="it-sub">'+opts.sub+'</div>':'')
      +'</div>'
      +'<span class="it-close" onclick="this.parentElement.remove()">✕</span>'
      +'<div class="it-bar" style="animation-duration:'+(opts.duration||3)+'s"></div>';
    t.onclick = function(e){
      if(e.target.classList.contains('it-close')) return;
      if(opts.action) opts.action();
      t.remove();
    };
    c.appendChild(t);

    var dur = (opts.duration || 3) * 1000;
    setTimeout(function(){
      if(document.contains(t)){
        t.style.animation = 'itoastIn .2s ease reverse forwards';
        setTimeout(function(){ t.remove(); }, 200);
      }
    }, dur);
    return t;
  };

  // Backward compat: patch il showToast esistente
  var _origShow = window.showToast;
  window.showToast = function(msg, type, sub){
    iToast(msg, type, {sub:sub});
    if(typeof _origShow === 'function') try{ _origShow(msg, type); }catch(e){}
  };
})();

/* ════════════════════════════════════════════════════════════════
   F2.1 AI QUICK BAR
   Barra flottante con comandi AI rapidi contestuali per sezione
   ════════════════════════════════════════════════════════════ */
(function installAIQuickBar(){
  var bar;
  var _visible = false;

  var SECTION_ACTIONS = {
    sales: [
      {icon:'fas fa-chart-line', label:'Analizza trend', prompt:'Analizza le mie vendite degli ultimi 3 mesi e dammi 3 insight actionable'},
      {icon:'fas fa-file-invoice', label:'Genera fattura', action:'fattura'},
    ],
    clients: [
      {icon:'fas fa-user-clock', label:'Clienti a rischio churn', prompt:'Analizza i miei clienti e identifica quelli a rischio di abbandono'},
      {icon:'fas fa-envelope', label:'Email follow-up AI', prompt:'Scrivi un\'email di follow-up professionale per un cliente che non acquista da 30 giorni'},
    ],
    gestione_ordini: [
      {icon:'fas fa-magic', label:'Ottimizza coda', prompt:'Analizza gli ordini in pipeline e suggerisci la priorità ottimale di produzione'},
      {icon:'fas fa-check-double', label:'Completa ordine', action:'autocomplete'},
    ],
    catalog: [
      {icon:'fas fa-tag', label:'Prezzi ottimali', prompt:'Analizza i miei prodotti e suggerisci prezzi ottimali basati su margine e mercato'},
      {icon:'fas fa-search', label:'SEO Etsy', prompt:'Suggerisci 5 title tag SEO ottimizzati per Etsy per il mio catalogo prodotti laser'},
    ],
    print3d: [
      {icon:'fas fa-cube', label:'Analizza costi 3D', prompt:'Dammi consigli per ridurre i costi di stampa 3D mantenendo la qualità'},
      {icon:'fas fa-tag', label:'Pricing 3D', prompt:'Come prezzare correttamente prodotti di stampa 3D FDM nel mercato italiano artigianale?'},
    ],
    lasercalc: [
      {icon:'fas fa-bolt', label:'Ottimizza laser', prompt:'Dammi 5 consigli per ottimizzare la produttività del mio laser 80W'},
    ],
    dashboard: [
      {icon:'fas fa-brain', label:'Business review AI', prompt:'Fai una business review della mia situazione attuale e dammi le 3 azioni prioritarie'},
      {icon:'fas fa-rocket', label:'Crescita rapida', prompt:'Quali sono le 3 leve più efficaci per aumentare fatturato del 20% nei prossimi 90 giorni?'},
    ],
  };

  var DEFAULT_ACTIONS = [
    {icon:'fas fa-question-circle', label:'Chiedi all\'AI', prompt:'Come posso migliorare questo aspetto del mio business artigianale?'},
  ];

  function createBar(){
    if(document.getElementById('ai-quick-bar')) return;
    bar = document.createElement('div');
    bar.id = 'ai-quick-bar';
    bar.innerHTML = '<button class="aqb-toggle" onclick="AIQuickBar.toggle()">'
      +'<i class="fas fa-robot"></i> AI Quick</button>';
    document.body.appendChild(bar);
    bar.classList.add('hidden');
  }

  function updateBar(section){
    if(!bar) return;
    var actions = SECTION_ACTIONS[section] || DEFAULT_ACTIONS;
    var btns = actions.map(function(a){
      if(a.action === 'fattura') return '<button class="aqb-btn" onclick="FatturaRapida.open()"><i class="fas '+a.icon+'"></i>'+a.label+'</button>';
      if(a.action === 'autocomplete') return '<button class="aqb-btn" onclick="OrderAutoComplete.run()"><i class="fas '+a.icon+'"></i>'+a.label+'</button>';
      return '<button class="aqb-btn" onclick="AIQuickBar.ask(\''+a.prompt.replace(/'/g,"\\'")+'\')" title="'+a.prompt+'"><i class="fas '+a.icon+'"></i>'+a.label+'</button>';
    }).join('<div class="aqb-sep"></div>');

    bar.innerHTML = '<button class="aqb-toggle" onclick="AIQuickBar.toggle()"><i class="fas fa-robot"></i> AI</button>'
      + (actions.length ? '<div class="aqb-sep"></div>' + btns : '')
      +'<div class="aqb-sep"></div>'
      +'<button class="aqb-btn" onclick="App.navigate(\'ai\')" title="AI Studio completo"><i class="fas fa-external-link-alt"></i></button>';
  }

  window.AIQuickBar = {
    toggle: function(){
      _visible = !_visible;
      if(bar) bar.classList.toggle('hidden', !_visible);
    },
    show: function(){ _visible=true; if(bar) bar.classList.remove('hidden'); },
    hide: function(){ _visible=false; if(bar) bar.classList.add('hidden'); },
    ask: function(prompt){
      // Naviga all'AI con il prompt pre-compilato
      if(typeof App !== 'undefined') App.navigate('ai');
      setTimeout(function(){
        var inp = document.getElementById('ai-prompt') || document.querySelector('[id*="prompt"]');
        if(inp){ inp.value = prompt; inp.focus(); }
        // Se esiste AILayer, eseguilo direttamente
        if(typeof AILayer !== 'undefined' && AILayer.ask) AILayer.ask(prompt);
      }, 200);
    },
    update: updateBar,
    init: function(){
      createBar();
      // Mostra con shortcut A
      document.addEventListener('keydown', function(e){
        if(e.key==='a' && !['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){
          window.AIQuickBar.toggle();
        }
      });
    }
  };

  if(typeof NavBus !== 'undefined'){
    NavBus.onAny(function(section){
      createBar();
      updateBar(section);
      // Mostra bar automaticamente su sezioni chiave dopo 1s
      if(['dashboard','sales','gestione_ordini'].includes(section)){
        setTimeout(function(){ window.AIQuickBar.show(); }, 1200);
      }
    });
  }
  setTimeout(function(){ window.AIQuickBar.init(); }, 1500);
})();

/* ════════════════════════════════════════════════════════════════
   F2.2 SMART NOTIFICATIONS PROATTIVE
   Controlla dati IDB e genera notifiche contestuali automatiche
   ════════════════════════════════════════════════════════════ */
(function installSmartNotifUpgrade(){
  var _KEY = 'ingly_notif_v31';
  var _notifs = [];
  var _unread = 0;

  function loadNotifs(){
    try{ _notifs = JSON.parse(localStorage.getItem(_KEY)||'[]'); }catch(e){ _notifs=[]; }
    _unread = _notifs.filter(function(n){ return !n.read; }).length;
    updateBadge();
  }
  function saveNotifs(){ try{ localStorage.setItem(_KEY, JSON.stringify(_notifs.slice(0,50))); }catch(e){} }
  function updateBadge(){
    var badges = document.querySelectorAll('#notif-count, .notif-badge, [id*="notif-count"]');
    badges.forEach(function(b){ b.textContent = _unread || ''; b.style.display = _unread?'':'none'; });
  }

  function addNotif(icon, title, sub, action, type){
    var id = Date.now() + Math.random();
    _notifs.unshift({ id:id, icon:icon, title:title, sub:sub, action:action, type:type||'info', read:false, time:new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}) });
    if(_notifs.length > 50) _notifs = _notifs.slice(0,50);
    _unread++;
    saveNotifs();
    updateBadge();
    iToast(title, type||'info', {sub:sub, duration:4});
  }

  async function runChecks(){
    if(typeof IDB === 'undefined') return;
    var today = new Date();

    // Check 1: Ordini in scadenza nelle prossime 48h
    try {
      var orders = await IDB.getAll('orders').catch(function(){return[];});
      var soon = orders.filter(function(o){
        if(!o.dueDate || o.status === 'completato') return false;
        var d = new Date(o.dueDate);
        var diff = (d - today) / (1000*60*60);
        return diff > 0 && diff <= 48;
      });
      soon.forEach(function(o){
        var h = Math.round((new Date(o.dueDate)-today)/(1000*60*60));
        addNotif('⏰','Ordine in scadenza',''+o.name+' — tra '+h+'h', function(){ App.navigate('gestione_ordini'); }, 'warning');
      });
    }catch(e){}

    // Check 2: Materiali sotto scorta
    try {
      var mats = (await IDB.getAll('materials').catch(function(){return[];}))
        .concat(await IDB.getAll('gadgets').catch(function(){return[];}));
      var low = mats.filter(function(m){ return (+m.stock||0) <= (+m.minStock||0) && (+m.minStock||0) > 0; });
      if(low.length > 0){
        addNotif('📦','Scorte basse',''+low.length+' articoli sotto scorta minima', function(){ App.navigate('items'); }, 'warning');
      }
    }catch(e){}

    // Check 3: Vendite da incassare > 7 giorni
    try {
      var sales = await IDB.getAll('sales').catch(function(){return[];});
      var old = sales.filter(function(s){
        if(s.status !== 'da_pagare') return false;
        var d = new Date(s.date||s.createdAt||0);
        return (today - d) > 7*24*60*60*1000;
      });
      if(old.length > 0){
        var tot = old.reduce(function(a,s){ return a+(+s.amount||0); },0);
        addNotif('💰','Pagamenti in attesa',''+old.length+' vendite · €'+tot.toFixed(0)+' da incassare', function(){ App.navigate('sales'); }, 'warning');
      }
    }catch(e){}

    // Check 4: No vendite oggi
    try {
      var todayStr = today.toDateString();
      var sales2 = await IDB.getAll('sales').catch(function(){return[];});
      var todaySales = sales2.filter(function(s){ return new Date(s.date||0).toDateString() === todayStr; });
      if(todaySales.length === 0 && today.getHours() >= 14){
        addNotif('📊','Nessuna vendita oggi','Aggiorna le vendite o verifica il pipeline', function(){ App.navigate('sales'); }, 'info');
      }
    }catch(e){}
  }

  // Panel UI
  function openPanel(){
    var panel = document.getElementById('ingly-notif-panel');
    if(!panel){
      panel = document.createElement('div');
      panel.id = 'ingly-notif-panel';
      document.body.appendChild(panel);
    }
    _notifs.forEach(function(n){ n.read=true; }); _unread=0; saveNotifs(); updateBadge();
    panel.innerHTML = '<div class="inp-header"><span class="inp-title">🔔 Notifiche</span>'
      +'<div style="display:flex;gap:8px;align-items:center">'
      +'<span style="font-size:11px;color:var(--text-muted);cursor:pointer" onclick="SmartNotifV2.clear()">Svuota</span>'
      +'<span style="cursor:pointer;color:var(--text-muted)" onclick="document.getElementById(\'ingly-notif-panel\').classList.remove(\'open\')">✕</span>'
      +'</div></div>'
      +'<div class="inp-list">'
      +(_notifs.length ? _notifs.map(function(n){
        return '<div class="inp-item'+(n.read?'':' unread')+'" onclick="SmartNotifV2.click('+JSON.stringify(n.id)+')">'
          +'<span class="inp-item-icon">'+n.icon+'</span>'
          +'<div class="inp-item-body"><div class="inp-item-title">'+n.title+'</div>'
          +'<div class="inp-item-sub">'+n.sub+'</div>'
          +'<div class="inp-item-time">'+n.time+'</div></div></div>';
      }).join('') : '<div class="inp-empty">Nessuna notifica<br><small>I controlli automatici girano ogni 30 min</small></div>')
      +'</div>';
    panel.classList.add('open');
    document.addEventListener('click', function closePanel(e){
      if(!panel.contains(e.target) && !e.target.closest('[onclick*="SmartNotifV2"]')){
        panel.classList.remove('open');
        document.removeEventListener('click', closePanel);
      }
    }, {once:false});
  }

  window.SmartNotifV2 = {
    add: addNotif,
    open: openPanel,
    run: runChecks,
    clear: function(){
      _notifs=[]; _unread=0; saveNotifs(); updateBadge();
      var p=document.getElementById('ingly-notif-panel'); if(p) p.classList.remove('open');
    },
    click: function(id){
      var n = _notifs.find(function(x){ return x.id===id; });
      if(n && n.action) { n.action(); document.getElementById('ingly-notif-panel').classList.remove('open'); }
    },
    getUnread: function(){ return _unread; }
  };

  // Boot
  setTimeout(function(){
    loadNotifs();
    runChecks();
    // Aggiungi hook al campanellino esistente
    var bell = document.querySelector('[onclick*="SmartNotif"]') || document.querySelector('[onclick*="notif"]');
    if(bell && !bell._v31patched){
      bell._v31patched = true;
      var origClick = bell.getAttribute('onclick');
      bell.setAttribute('onclick', 'SmartNotifV2.open();');
    }
    // Auto-check ogni 30 minuti
    setInterval(runChecks, 30*60*1000);
  }, 2000);
})();

/* ════════════════════════════════════════════════════════════════
   F2.3 ORDER AUTO-COMPLETE
   Quando un ordine viene completato: crea vendita automatica,
   aggiorna stock, propone WhatsApp al cliente
   ════════════════════════════════════════════════════════════ */
window.OrderAutoComplete = {
  async run(orderId){
    if(typeof IDB === 'undefined') return;

    // Se non passato, prendi l'ordine attivo dalla UI
    if(!orderId){
      var activeCard = document.querySelector('.kanban-card.selected, [data-order-id]');
      if(activeCard) orderId = activeCard.dataset.orderId || activeCard.dataset.id;
    }

    if(!orderId){
      iToast('Seleziona prima un ordine da completare','warning');
      return;
    }

    var order = await IDB.get('orders', typeof orderId==='number'?orderId:parseInt(orderId)).catch(function(){return null;});
    if(!order){
      iToast('Ordine non trovato','error');
      return;
    }

    // 1. Aggiorna stato ordine → completato
    order.status = 'completato';
    order.completedAt = new Date().toISOString();
    await IDB.put('orders', order).catch(function(){});

    // 2. Crea vendita automatica
    var saleAmount = +order.grossPrice || +order.totalPrice || +order.amount || 0;
    if(saleAmount > 0){
      var sale = {
        date: new Date().toISOString().slice(0,10),
        description: (order.name||'Ordine') + ' — completato automaticamente',
        amount: saleAmount,
        materialCost: +order.totalCost||0,
        status: 'da_pagare',
        channel: order.channel||'Diretto',
        clientId: order.clientId,
        clientName: order.clientName||order.client||'',
        originOrder: orderId,
      };
      var saleId = await IDB.put('sales', sale).catch(function(){return null;});
      if(saleId) iToast('✅ Vendita creata automaticamente — €'+saleAmount.toFixed(2),'success',{
        sub:'Clicca per visualizzare', duration:5,
        action: function(){ App.navigate('sales'); }
      });
    }

    // 3. Proponi WhatsApp al cliente
    if(order.clientName || order.client){
      var clientName = order.clientName || order.client;
      var msg = '🎉 Buone notizie '+clientName+'!\n\nIl tuo ordine "'+order.name+'" è pronto per il ritiro/spedizione.\n\nGrazie per aver scelto noi! 🙏';
      var waLink = 'https://wa.me/?text='+encodeURIComponent(msg);
      iToast('📱 Notifica cliente?','info',{
        sub:'Invia WhatsApp a '+clientName,
        duration:8,
        action: function(){ window.open(waLink,'_blank'); }
      });
    }

    if(typeof Bus !== 'undefined') Bus.emit('order:updated', {id:orderId, status:'completato'});
    return true;
  }
};

/* ════════════════════════════════════════════════════════════════
   F2.4 FATTURA RAPIDA (genera PDF + XML bozza)
   ════════════════════════════════════════════════════════════ */
window.FatturaRapida = {
  open: async function(saleId){
    if(typeof IDB === 'undefined') return;

    var sale = saleId ? await IDB.get('sales', parseInt(saleId)).catch(function(){return null;}) : null;

    // Prendi settings
    var cfg = {};
    try{ cfg = JSON.parse(localStorage.getItem('ingly_settings_main')||'{}'); }catch(e){}

    var modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.id = 'fattura-rapida-modal';
    var amount = sale ? (+sale.amount||0) : 0;
    var vat = amount * 0.22;
    var total = amount + vat;
    var fattNum = 'FAT-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4);

    modal.innerHTML = '<div class="modal modal-lg">'
      +'<div class="modal-header"><div class="modal-title">🧾 Fattura Rapida</div>'
      +'<button class="modal-close" onclick="document.getElementById(\'fattura-rapida-modal\').remove()">✕</button></div>'
      +'<div class="modal-body">'
      +'<div class="form-row" style="margin-bottom:14px">'
        +'<div class="form-group"><label class="form-label">N° Fattura</label><input class="form-control" id="fr-num" value="'+fattNum+'"></div>'
        +'<div class="form-group"><label class="form-label">Data</label><input class="form-control" type="date" id="fr-date" value="'+new Date().toISOString().slice(0,10)+'"></div>'
      +'</div>'
      +'<div class="form-group"><label class="form-label">Cliente / Destinatario</label><input class="form-control" id="fr-client" value="'+(sale&&sale.clientName||'')+'"></div>'
      +'<div class="form-group"><label class="form-label">Descrizione</label><input class="form-control" id="fr-desc" value="'+(sale&&sale.description||'Prestazione professionale')+'"></div>'
      +'<div class="form-row">'
        +'<div class="form-group"><label class="form-label">Importo netto €</label><input class="form-control" id="fr-amount" type="number" step="0.01" value="'+amount.toFixed(2)+'" oninput="FatturaRapida.updateTotals()"></div>'
        +'<div class="form-group"><label class="form-label">Regime IVA</label><select class="form-control" id="fr-iva" onchange="FatturaRapida.updateTotals()">'
          +'<option value="0.22">IVA 22%</option>'
          +'<option value="0.10">IVA 10%</option>'
          +'<option value="0.04">IVA 4%</option>'
          +'<option value="0">Esente / Forfettario</option>'
        +'</select></div>'
      +'</div>'
      +'<div class="card" style="margin-top:10px">'
        +'<div class="fattura-row"><span style="color:var(--text-muted)">Imponibile</span><span id="fr-imp">'+amount.toFixed(2)+' €</span></div>'
        +'<div class="fattura-row"><span style="color:var(--text-muted)">IVA</span><span id="fr-vatshow">'+(amount*0.22).toFixed(2)+' €</span></div>'
        +'<div class="fattura-row"><span style="color:var(--text-muted)">Ritenuta d\'acconto (20%)</span>'
        +'<label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="checkbox" id="fr-ritenuta" onchange="FatturaRapida.updateTotals()"> Applica</label></div>'
        +'<div class="fattura-total">TOTALE: <span id="fr-total">'+total.toFixed(2)+'</span> €</div>'
      +'</div>'
      +'<div class="form-group" style="margin-top:10px"><label class="form-label">Note</label><textarea class="form-control" id="fr-notes" rows="2" placeholder="Note aggiuntive..."></textarea></div>'
      +'</div>'
      +'<div class="modal-footer">'
        +'<button class="btn btn-secondary" onclick="document.getElementById(\'fattura-rapida-modal\').remove()">Annulla</button>'
        +'<button class="btn btn-secondary" onclick="FatturaRapida.whatsapp()"><i class="fab fa-whatsapp"></i> WA</button>'
        +'<button class="btn btn-primary" onclick="FatturaRapida.pdf()"><i class="fas fa-file-pdf"></i> Genera PDF</button>'
      +'</div></div>';
    document.body.appendChild(modal);
  },

  updateTotals: function(){
    var amt = parseFloat((document.getElementById('fr-amount')||{}).value)||0;
    var ivaRate = parseFloat((document.getElementById('fr-iva')||{value:'0.22'}).value)||0;
    var ritenuta = (document.getElementById('fr-ritenuta')||{}).checked;
    var vat = amt * ivaRate;
    var rit = ritenuta ? amt * 0.2 : 0;
    var total = amt + vat - rit;
    var impEl=document.getElementById('fr-imp'), vatEl=document.getElementById('fr-vatshow'), totEl=document.getElementById('fr-total');
    if(impEl) impEl.textContent = amt.toFixed(2)+' €';
    if(vatEl) vatEl.textContent = vat.toFixed(2)+' €';
    if(totEl) totEl.textContent = total.toFixed(2);
  },

  pdf: function(){
    var g = function(id){ return (document.getElementById(id)||{}).value||''; };
    var amt = parseFloat(g('fr-amount'))||0;
    var ivaRate = parseFloat((document.getElementById('fr-iva')||{value:'0.22'}).value)||0;
    var ritenuta = (document.getElementById('fr-ritenuta')||{}).checked;
    var vat = amt*ivaRate, rit=ritenuta?amt*0.2:0, total=amt+vat-rit;
    var cfg={}; try{cfg=JSON.parse(localStorage.getItem('ingly_settings_main')||'{}');}catch(e){}
    var w = window.open('','_blank'); if(!w) return;
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fattura '+g('fr-num')+'</title>'
      +'<style>body{font-family:Arial,sans-serif;padding:40px;max-width:720px;margin:0 auto}'
      +'h1{color:#6366f1;font-size:24px;margin-bottom:4px}h2{color:#64748b;font-size:14px;font-weight:400;margin-bottom:24px}'
      +'.header{display:flex;justify-content:space-between;margin-bottom:32px}'
      +'.label{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}'
      +'.val{font-size:14px;color:#1e293b}'
      +'table{width:100%;border-collapse:collapse;margin:24px 0}'
      +'th{background:#f8fafc;padding:10px 14px;text-align:left;font-size:12px;color:#64748b}'
      +'td{padding:10px 14px;border-top:1px solid #e2e8f0}'
      +'.total-box{background:linear-gradient(135deg,#6366f115,#6366f105);border:1px solid #6366f130;border-radius:10px;padding:16px;margin-top:16px}'
      +'.grand{font-size:22px;font-weight:800;color:#6366f1}</style>'
      +'</head><body>'
      +'<div class="header">'
        +'<div><h1>'+(cfg.businessName||'La Tua Attività')+'</h1><h2>Fattura N° '+g('fr-num')+' del '+g('fr-date')+'</h2>'
        +(cfg.piva?'<div class="label">P.IVA</div><div class="val">'+cfg.piva+'</div>':'')
        +(cfg.email?'<div class="label" style="margin-top:8px">Email</div><div class="val">'+cfg.email+'</div>':'')
        +'</div>'
        +'<div style="text-align:right"><div class="label">Destinatario</div><div class="val" style="font-weight:600">'+g('fr-client')+'</div></div>'
      +'</div>'
      +'<table><thead><tr><th>Descrizione</th><th style="text-align:right">Importo</th></tr></thead>'
      +'<tbody><tr><td>'+g('fr-desc')+(g('fr-notes')?'<br><small style="color:#94a3b8">'+g('fr-notes')+'</small>':'')+'</td>'
      +'<td style="text-align:right;font-weight:600">€ '+amt.toFixed(2)+'</td></tr></tbody></table>'
      +'<div class="total-box">'
        +'<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#64748b">Imponibile</span><span>€ '+amt.toFixed(2)+'</span></div>'
        +(ivaRate>0?'<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#64748b">IVA ('+Math.round(ivaRate*100)+'%)</span><span>€ '+vat.toFixed(2)+'</span></div>':'')
        +(ritenuta?'<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#64748b">Ritenuta d\'acconto (20%)</span><span style="color:#ef4444">- € '+rit.toFixed(2)+'</span></div>':'')
        +'<div class="grand" style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid #6366f130"><span>TOTALE</span><span>€ '+total.toFixed(2)+'</span></div>'
      +'</div>'
      +'<p style="margin-top:32px;font-size:10px;color:#94a3b8">Generato da INGLY OS · '+new Date().toLocaleString('it-IT')+'</p>'
      +'<br><button onclick="window.print()" style="padding:10px 20px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">🖨️ Stampa / PDF</button>'
      +'</body></html>');
    w.document.close();
    document.getElementById('fattura-rapida-modal').remove();
    iToast('📄 Fattura generata','success');
  },

  whatsapp: function(){
    var g=function(id){return(document.getElementById(id)||{}).value||'';};
    var amt=parseFloat(g('fr-amount'))||0;
    var msg='🧾 *Fattura N° '+g('fr-num')+'*\n\nCliente: '+g('fr-client')+'\nDescrizione: '+g('fr-desc')+'\nImporto: €'+amt.toFixed(2)+'\nData: '+g('fr-date')+'\n\nGrazie!';
    window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
  }
};

/* ════════════════════════════════════════════════════════════════
   F2.6 REVENUE FORECAST RAPIDO
   3 mesi proiettati su storico IDB — appare sulla Dashboard
   ════════════════════════════════════════════════════════════ */
window.RevenueForecast = {
  async compute(){
    if(typeof IDB === 'undefined') return null;
    var sales = await IDB.getAll('sales').catch(function(){return[];});
    if(!sales.length) return null;

    // Raggruppa per mese ultimi 6 mesi
    var months = {};
    var now = new Date();
    for(var i=5;i>=0;i--){
      var d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      var key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      months[key] = 0;
    }
    sales.forEach(function(s){
      var d = new Date(s.date||s.createdAt||0);
      var key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      if(months[key] !== undefined) months[key] += (+s.amount||0);
    });

    var values = Object.values(months);
    var labels = Object.keys(months).map(function(k){
      var parts = k.split('-');
      var d = new Date(+parts[0], +parts[1]-1, 1);
      return d.toLocaleString('it-IT',{month:'short'});
    });

    // Trend lineare semplice (media mobile)
    var last3 = values.slice(-3);
    var avg = last3.reduce(function(a,b){return a+b;},0)/3;
    var growth = values[4]>0 ? (values[5]-values[4])/values[4] : 0.05;

    var forecast = [
      Math.round(avg * (1 + growth)),
      Math.round(avg * (1 + growth*1.5)),
      Math.round(avg * (1 + growth*2)),
    ];

    var fmts = ['%s fa','%s fa','%s fa','3 mesi fa','2 mesi fa','Scorso mese'];
    return { real: values, forecast: forecast, labels: labels, avg: avg, growth: growth };
  },

  async injectDashboard(){
    var data = await this.compute();
    if(!data) return;

    var existing = document.getElementById('ingly-forecast-widget');
    if(existing) existing.remove();

    var view = document.getElementById('view-dashboard');
    if(!view || !view.classList.contains('active')) return;

    var widget = document.createElement('div');
    widget.id = 'ingly-forecast-widget';
    widget.className = 'card';
    widget.style.cssText = 'margin-bottom:16px;max-width:900px';

    var all = data.real.concat(data.forecast);
    var maxVal = Math.max.apply(null, all) || 1;
    var allLabels = data.labels.concat(['+1m','+2m','+3m']);

    var barsHtml = all.map(function(v,i){
      var isForecast = i >= data.real.length;
      var h = Math.round((v/maxVal)*100);
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">'
        +'<div style="font-size:9px;color:var(--text-muted)">€'+Math.round(v/100)/10+'k</div>'
        +'<div style="flex:1;width:100%;display:flex;align-items:flex-end">'
        +'<div style="width:100%;height:'+Math.max(4,h)+'%;border-radius:4px 4px 0 0;background:'
        +(isForecast?'#6366f160':'var(--primary)')
        +(isForecast?';border:1px dashed var(--primary)':'')
        +';transition:height .8s ease;min-height:4px"></div></div>'
        +'<div style="font-size:9px;color:var(--text-muted);text-align:center">'+allLabels[i]+'</div>'
        +(isForecast?'<div style="font-size:8px;color:var(--primary);opacity:.7">prev.</div>':'<div style="font-size:8px"></div>')
        +'</div>';
    }).join('');

    var growthPct = Math.round(data.growth*100);
    var nextMonth = data.forecast[0];

    widget.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
      +'<div><div class="card-title" style="margin-bottom:0">📈 Revenue Forecast — 3 mesi</div>'
      +'<div style="font-size:11px;color:var(--text-muted);margin-top:2px">Proiezione basata sullo storico vendite IDB</div></div>'
      +'<div style="text-align:right"><div style="font-size:20px;font-weight:800;color:var(--primary)">€'+nextMonth.toLocaleString('it-IT')+'</div>'
      +'<div style="font-size:10px;color:'+(growthPct>=0?'var(--green)':'var(--red)')+'">'+( growthPct>=0?'▲+':'▼')+Math.abs(growthPct)+'% trend mensile</div></div>'
      +'</div>'
      +'<div style="display:flex;gap:6px;height:80px;align-items:flex-end">'+barsHtml+'</div>'
      +'<div style="display:flex;gap:12px;margin-top:10px;font-size:10px;color:var(--text-muted)">'
      +'<span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:var(--primary);display:inline-block"></span>Reale</span>'
      +'<span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#6366f160;border:1px dashed var(--primary);display:inline-block"></span>Proiezione</span>'
      +'</div>';

    var firstCard = view.querySelector('.card,.kpi-card,.grid-4');
    if(firstCard && firstCard.parentNode) firstCard.parentNode.insertBefore(widget, firstCard.nextSibling);
    else view.appendChild(widget);
  }
};

// Inietta forecast sulla dashboard quando si naviga
if(typeof NavBus !== 'undefined'){
  NavBus.on('dashboard', function(){
    setTimeout(function(){ RevenueForecast.injectDashboard(); }, 500);
  });
}

console.log('[INGLY OS v31] 🚀 Fase 1 completata + Fase 2 avviata: NavBus·Breadcrumb·Toast·AIQuickBar·SmartNotif·AutoComplete·Fattura·Forecast');
