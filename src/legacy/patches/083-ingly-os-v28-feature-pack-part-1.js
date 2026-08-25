
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v28 — Feature Pack Part 1
// Features 1, 3, 4, 8
// ═══════════════════════════════════════════════════════════════════

// ─── FEATURE 1: Dashboard KPI Pro ────────────────────────────────
window.DashboardPro = {
  render: function(){
    /* L'Operating Center (Fase 2) è la dashboard del prodotto. Quando è
       disponibile disegna lui, e questa funzione gli cede il posto invece di
       sovrascrivere la vista con `el.innerHTML`.

       Non è solo una questione di aspetto: il codice qui sotto legge da
       localStorage (`ingly_sales_v1`, `ingly_orders_pro_v1`…) mentre KPIEngine
       e tutto il resto dell'applicazione leggono da IndexedDB. Erano due
       dashboard con due verità diverse sugli stessi numeri.

       Resta come riserva: se il modulo nuovo non si carica, la dashboard
       storica funziona ancora. */
    if (window.InglyDashboard && typeof window.InglyDashboard.render === 'function') {
      window.InglyDashboard.render();
      return;
    }
    var el=document.getElementById('view-dashboard')||document.getElementById('view-kpi');
    if(!el) return;
    try{
      var sales=JSON.parse(localStorage.getItem('ingly_sales_v1')||'[]');
      var quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');
      var clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');
      var orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');
      var warehouse=JSON.parse(localStorage.getItem('ingly_warehouse_v1')||'[]');
      var now=new Date(), ym=now.toISOString().slice(0,7);
      var lmd=new Date(now.getFullYear(),now.getMonth()-1,1); var lm=lmd.toISOString().slice(0,7);
      var isMo=function(d,m){return d&&d.slice(0,7)===m;};
      var revTM=sales.filter(function(s){return isMo(s.date||s.ts,ym);}).reduce(function(a,s){return a+parseFloat(s.total||s.amount||0);},0);
      var revLM=sales.filter(function(s){return isMo(s.date||s.ts,lm);}).reduce(function(a,s){return a+parseFloat(s.total||s.amount||0);},0);
      var delta=revLM>0?Math.round((revTM-revLM)/revLM*100):0;
      var qTM=quotes.filter(function(q){return isMo(q.date,ym);}).length;
      var newCli=clients.filter(function(c){return isMo(c.added,ym);}).length;
      var activeOrd=orders.filter(function(o){return ['draft','confirmed','in_progress'].indexOf(o.status)>-1;}).length;
      var lowStock=warehouse.filter(function(w){return (w.qty||0)<(w.minStock||1);});
      var prodCount={};
      quotes.forEach(function(q){if(q.product) prodCount[q.product]=(prodCount[q.product]||0)+(q.qty||1);});
      var top5=Object.entries(prodCount).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
      var months6=[]; for(var i=5;i>=0;i--){var md=new Date(now.getFullYear(),now.getMonth()-i,1);months6.push({ym:md.toISOString().slice(0,7),l:md.toLocaleDateString('it',{month:'short'})});}
      var rev6=months6.map(function(m){return sales.filter(function(s){return isMo(s.date||s.ts,m.ym);}).reduce(function(a,s){return a+parseFloat(s.total||0);},0);});
      var maxRev=Math.max.apply(null,rev6)||1;

      var kpis=[
        {l:'Entrate Mese',v:'€'+revTM.toFixed(0),sub:(delta>=0?'▲':'▼')+Math.abs(delta)+'% vs mese scorso',c:delta>=0?'#22c55e':'#ef4444',ic:'💰'},
        {l:'Preventivi',v:qTM+'',sub:'Emessi questo mese',c:'#3b82f6',ic:'📄'},
        {l:'Ordini Attivi',v:activeOrd+'',sub:'In corso',c:'#f59e0b',ic:'📋'},
        {l:'Nuovi Clienti',v:newCli+'',sub:'Acquisiti questo mese',c:'#8b5cf6',ic:'👥'},
        {l:'Stock Basso',v:lowStock.length+'',sub:lowStock.length?lowStock[0].name.slice(0,20):'Tutto OK',c:lowStock.length?'#ef4444':'#22c55e',ic:'🏭'},
      ];

      el.innerHTML=
        '<div style="padding:16px 20px;max-width:1200px;margin:0 auto">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
        +'<div><div style="font-size:22px;font-weight:900;color:var(--text)">📊 Dashboard</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">'+now.toLocaleDateString('it',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})+'</div></div>'
        +'<div style="display:flex;gap:8px">'
        +'<button onclick="QuoteGenerator&&QuoteGenerator.open()" style="padding:8px 14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">⚡ Preventivo Rapido</button>'
        +'<button onclick="DashboardPro.render()" style="padding:8px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted)">🔄</button>'
        +'</div></div>'
        // KPI bar
        +'<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:18px">'
        +kpis.map(function(k){
          return '<div style="background:var(--bg-card2);border:1.5px solid '+k.c+'30;border-radius:14px;padding:14px">'
            +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px"><span style="font-size:18px">'+k.ic+'</span><div style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase">'+k.l+'</div></div>'
            +'<div style="font-size:22px;font-weight:900;color:'+k.c+'">'+k.v+'</div>'
            +'<div style="font-size:10px;color:var(--text-dim);margin-top:3px">'+k.sub+'</div>'
            +'</div>';
        }).join('')+'</div>'
        // Charts
        +'<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;margin-bottom:14px">'
        // Revenue bars
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:16px">'
        +'<div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:14px">📈 Entrate Ultimi 6 Mesi</div>'
        +'<div style="display:flex;align-items:flex-end;gap:6px;height:90px;border-bottom:1px solid var(--border)">'
        +rev6.map(function(v,i){
          var h=Math.max(4,Math.round(v/maxRev*76));
          var isCur=i===5;
          return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">'
            +'<div style="font-size:9px;color:'+(isCur?'var(--primary)':'var(--text-dim)')+';font-weight:700">'+(v>0?'€'+Math.round(v):'')+'</div>'
            +'<div style="width:100%;height:'+h+'px;background:'+(isCur?'#6366f1':'#6366f125')+';border-radius:3px 3px 0 0"></div>'
            +'<div style="font-size:9px;color:var(--text-muted)">'+months6[i].l+'</div>'
            +'</div>';
        }).join('')+'</div></div>'
        // Top products
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:16px">'
        +'<div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:12px">🏆 Top Prodotti</div>'
        +(top5.length?top5.map(function(p,i){
          var cols=['#fbbf24','#94a3b8','#f59e0b','#10b981','#6366f1'];
          var maxV=top5[0][1]||1;
          return '<div style="margin-bottom:7px">'
            +'<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px"><span style="color:var(--text);font-weight:600">'+(i+1)+'. '+p[0].slice(0,18)+'</span><span style="color:var(--text-muted)">'+p[1]+' pz</span></div>'
            +'<div style="height:4px;background:var(--bg-card);border-radius:2px"><div style="height:4px;background:'+cols[i]+';border-radius:2px;width:'+Math.round(p[1]/maxV*100)+'%"></div></div></div>';
        }).join(''):'<div style="color:var(--text-dim);font-size:11px;padding:20px 0;text-align:center">Salva preventivi per vedere i dati</div>')
        +'</div>'
        // Low stock
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:16px">'
        +'<div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:12px">⚠️ Stock Basso</div>'
        +(lowStock.length?lowStock.slice(0,5).map(function(it){
          var c=(it.qty||0)<=0?'#ef4444':'#f59e0b';
          return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding:5px 8px;background:'+c+'10;border-radius:7px">'
            +'<span style="font-size:10px;color:var(--text)">'+it.name.slice(0,16)+'</span>'
            +'<span style="font-size:10px;font-weight:800;color:'+c+'">'+(it.qty||0)+' '+( it.unit||'')+'</span></div>';
        }).join(''):'<div style="color:#22c55e;font-size:11px;text-align:center;padding:20px 0">✅ Tutto OK!</div>')
        +'</div></div>'
        // Quick actions
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:14px">'
        +'<div style="font-size:11px;font-weight:800;color:var(--text-muted);margin-bottom:10px;text-transform:uppercase">⚡ Azioni Rapide</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
        +[
          {l:'💼 Preventivo',c:'#6366f1',fn:"QuoteGenerator&&QuoteGenerator.open()"},
          {l:'👤 + Cliente',c:'#10b981',fn:"CRMSmart&&CRMSmart._addClient()"},
          {l:'📋 + Ordine',c:'#f59e0b',fn:"OrderTracker&&OrderTracker.newOrder()"},
          {l:'📊 Report Mese',c:'#8b5cf6',fn:"ReportGenerator&&ReportGenerator.generateReport('month')"},
          {l:'☁️ Cloud Sync',c:'#3b82f6',fn:"InglyCloudSync&&InglyCloudSync.push()"},
          {l:'🏭 Magazzino',c:'#64748b',fn:"App&&App.navigate('magazzino')"},
        ].map(function(b){
          return '<button onclick="'+b.fn+'" style="padding:8px 14px;background:'+b.c+'15;color:'+b.c+';border:1px solid '+b.c+'30;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">'+b.l+'</button>';
        }).join('')+'</div></div></div>';
    }catch(e){ console.warn('[DashboardPro]',e); }
  }
};

// ─── FEATURE 8: WA Templates ─────────────────────────────────────
window.WATemplates = {
  templates:{
    draft:       '📝 Ciao {name}! Ho preparato un preventivo per te. Posso inviartelo?',
    confirmed:   '✅ Ciao {name}! Il tuo ordine è confermato. Avvio la lavorazione!',
    in_progress: '⚙️ Ciao {name}! Il tuo ordine è in lavorazione. Pronto in 5-7 giorni!',
    delivered:   '📦 Ciao {name}! Il tuo ordine è pronto per ritiro/consegna. 🎉',
    paid:        '🙏 Ciao {name}! Grazie mille! A presto per il prossimo ordine!',
  },
  getTemplate:function(status,order){
    var tpl=this.templates[status]||this.templates.draft;
    var name=order&&order.client?order.client.split(' ')[0]:'';
    return tpl.replace('{name}',name);
  }
};

// ─── FEATURE 3: Order Tracker ────────────────────────────────────
window.OrderTracker = (function(){
  var SK='ingly_orders_pro_v1';
  var STATUSES=[
    {id:'draft',       label:'📝 Bozza',         color:'#64748b'},
    {id:'confirmed',   label:'✅ Confermato',     color:'#3b82f6'},
    {id:'in_progress', label:'⚙️ Lavorazione',   color:'#f59e0b'},
    {id:'delivered',   label:'📦 Consegnato',     color:'#10b981'},
    {id:'paid',        label:'💰 Pagato',         color:'#22c55e'},
    {id:'cancelled',   label:'❌ Annullato',      color:'#ef4444'},
  ];
  function load(){ try{return JSON.parse(localStorage.getItem(SK)||'[]');}catch(e){return[];} }
  function save(d){ try{localStorage.setItem(SK,JSON.stringify(d));}catch(e){} }
  function si(id){ return STATUSES.find(function(s){return s.id===id;})||STATUSES[0]; }

  return {
    render:function(){
      var el=document.getElementById('view-order_tracker');
      if(!el){ el=document.createElement('div'); el.id='view-order_tracker'; el.className='section-view'; el.style.cssText='padding:0;overflow-y:auto'; var ci=document.getElementById('content-inner'); if(ci) ci.appendChild(el); }
      var orders=load();
      var paid=orders.filter(function(o){return o.status==='paid';});
      var totalPaid=paid.reduce(function(a,o){return a+(o.total||0);},0);
      var active=orders.filter(function(o){return ['draft','confirmed','in_progress'].indexOf(o.status)>-1;});
      var expiring=orders.filter(function(o){
        if(o.status!=='draft'&&o.status!=='confirmed') return false;
        return Date.now()-new Date(o.created||o.date||0).getTime()>25*864e5;
      });

      var stCounts={};
      STATUSES.forEach(function(s){stCounts[s.id]=orders.filter(function(o){return o.status===s.id;}).length;});

      el.innerHTML='<div style="padding:16px 20px;max-width:1200px;margin:0 auto">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
        +'<div><div style="font-size:20px;font-weight:900;color:var(--text)">📋 Ordini & Preventivi</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">'+orders.length+' totali · '+active.length+' attivi · €'+totalPaid.toFixed(0)+' incassati</div></div>'
        +'<div style="display:flex;gap:8px">'
        +'<button onclick="OrderTracker.newOrder()" style="padding:8px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">+ Nuovo Ordine</button>'
        +'<button onclick="QuoteGenerator&&QuoteGenerator.open()" style="padding:8px 14px;background:rgba(99,102,241,.1);color:#818cf8;border:1px solid rgba(99,102,241,.25);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">⚡ Da Preventivo</button>'
        +'</div></div>'
        +(expiring.length?'<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:11px"><span style="color:#ef4444;font-weight:700">⏰ In scadenza (>25gg): </span><span style="color:var(--text-muted)">'+expiring.map(function(o){return o.client;}).join(' · ')+'</span></div>':'')
        // Pipeline KPI
        +'<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:14px">'
        +STATUSES.map(function(s){
          return '<div style="background:var(--bg-card2);border:1px solid '+s.color+'30;border-radius:10px;padding:10px;text-align:center">'
            +'<div style="font-size:18px;font-weight:900;color:'+s.color+'">'+(stCounts[s.id]||0)+'</div>'
            +'<div style="font-size:9px;color:var(--text-muted);margin-top:2px">'+s.label+'</div></div>';
        }).join('')+'</div>'
        // Table
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;overflow:hidden">'
        +'<table style="width:100%;border-collapse:collapse">'
        +'<thead><tr style="background:var(--bg-card)">'
        +'<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Cliente</th>'
        +'<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Descrizione</th>'
        +'<th style="padding:9px 12px;text-align:right;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">€</th>'
        +'<th style="padding:9px 12px;text-align:center;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Status</th>'
        +'<th style="padding:9px 12px;text-align:center;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Azioni</th>'
        +'</tr></thead><tbody>'
        +(orders.length?orders.map(function(o,i){
          var s=si(o.status);
          var dt=new Date(o.created||o.date||Date.now()).toLocaleDateString('it',{day:'2-digit',month:'2-digit'});
          return '<tr style="border-bottom:1px solid var(--border)">'
            +'<td style="padding:8px 12px"><div style="font-size:12px;font-weight:700;color:var(--text)">'+o.client+'</div><div style="font-size:10px;color:var(--text-muted)">'+dt+'</div></td>'
            +'<td style="padding:8px 12px;font-size:11px;color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(o.description||'—')+'</td>'
            +'<td style="padding:8px 12px;text-align:right;font-weight:800;color:var(--primary)">€'+(o.total||0).toFixed(0)+'</td>'
            +'<td style="padding:8px 12px;text-align:center">'
            +'<select onchange="OrderTracker.setStatus('+i+',this.value)" style="padding:4px 7px;background:'+s.color+'15;border:1px solid '+s.color+'40;border-radius:7px;color:'+s.color+';font-size:10px;font-weight:700;cursor:pointer">'
            +STATUSES.map(function(ss){return '<option value="'+ss.id+'"'+(ss.id===o.status?' selected':'')+'>'+ss.label+'</option>';}).join('')
            +'</select></td>'
            +'<td style="padding:8px 10px;text-align:center"><div style="display:flex;gap:3px;justify-content:center">'
            +'<button onclick="OrderTracker.editOrder('+i+')" style="padding:3px 7px;background:var(--bg-card);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:11px">✏️</button>'
            +(o.phone?'<button onclick="WAQuick&&WAQuick.openPanel(\''+o.phone.replace(/[^0-9+]/g,'')+'\',\'\')" style="padding:3px 7px;background:#25D36615;color:#25D366;border:1px solid #25D36630;border-radius:5px;cursor:pointer;font-size:11px">💬</button>':'')
            +'<button onclick="OrderTracker.delOrder('+i+')" style="padding:3px 7px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:5px;cursor:pointer;font-size:11px">🗑</button>'
            +'</div></td></tr>';
        }).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-dim)">Nessun ordine. Crea il primo!</td></tr>')
        +'</tbody></table></div></div>';
    },
    setStatus:function(i,status){
      var d=load(); if(!d[i]) return;
      d[i].status=status; d[i].updatedAt=new Date().toISOString(); save(d);
      if(typeof toast!=='undefined') toast('✅ '+si(status).label,'success');
      this.render();
    },
    delOrder:function(i){
      if(!confirm('Eliminare questo ordine?')) return;
      var d=load(); d.splice(i,1); save(d); this.render();
    },
    newOrder:function(){
      var old=document.getElementById('ot-modal'); if(old) old.remove();
      var clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');
      var dlOpts=clients.map(function(c){return '<option value="'+(c.name+(c.phone?' | '+c.phone:''))+'">'+c.name+'</option>';}).join('');
      var modal=document.createElement('div'); modal.id='ot-modal';
      modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)';
      var selOpts=STATUSES.map(function(s){return '<option value="'+s.id+'">'+s.label+'</option>';}).join('');
      modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:480px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5)">'
        +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px"><span style="font-size:22px">📋</span><div style="font-size:16px;font-weight:900;color:var(--text)">Nuovo Ordine</div><button onclick="document.getElementById(\'ot-modal\').remove()" style="margin-left:auto;background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:20px">✕</button></div>'
        +'<div style="display:grid;gap:10px">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Cliente</label><input id="ot-client" list="ot-dl" placeholder="Nome cliente..." style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"><datalist id="ot-dl">'+dlOpts+'</datalist></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Telefono</label><input id="ot-phone" placeholder="+39 333..." type="tel" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Descrizione</label><textarea id="ot-desc" placeholder="Es. 50 portachiavi bambù laser..." style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;height:55px;resize:vertical"></textarea></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Totale €</label><input id="ot-total" type="number" step="0.01" placeholder="0.00" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div><div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Status</label><select id="ot-status" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px">'+selOpts+'</select></div></div></div>'
        +'<div style="display:flex;gap:8px;margin-top:16px"><button onclick="OrderTracker._saveNew()" style="flex:1;padding:11px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">✅ Salva</button><button onclick="document.getElementById(\'ot-modal\').remove()" style="padding:11px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;color:var(--text-muted)">Annulla</button></div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
      setTimeout(function(){document.getElementById('ot-client')?.focus();},100);
    },
    _saveNew:function(){
      var client=document.getElementById('ot-client')?.value?.trim();
      if(!client){alert('Inserisci un cliente!');return;}
      var d=load();
      d.unshift({id:Date.now(),client:client.split(' | ')[0],phone:(client.includes(' | ')?client.split(' | ')[1]:document.getElementById('ot-phone')?.value)||'',description:document.getElementById('ot-desc')?.value?.trim()||'',total:parseFloat(document.getElementById('ot-total')?.value)||0,status:document.getElementById('ot-status')?.value||'draft',created:new Date().toISOString()});
      save(d); document.getElementById('ot-modal')?.remove(); this.render();
      if(typeof toast!=='undefined') toast('📋 Ordine creato!','success');
    },
    editOrder:function(i){
      var d=load(); var o=d[i]; if(!o) return;
      var old=document.getElementById('ot-modal'); if(old) old.remove();
      var modal=document.createElement('div'); modal.id='ot-modal';
      modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)';
      var selOpts=STATUSES.map(function(s){return '<option value="'+s.id+'"'+(s.id===o.status?' selected':'')+'>'+s.label+'</option>';}).join('');
      modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:480px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5)">'
        +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px"><span style="font-size:22px">✏️</span><div style="font-size:16px;font-weight:900;color:var(--text)">Modifica Ordine</div><button onclick="document.getElementById(\'ot-modal\').remove()" style="margin-left:auto;background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:20px">✕</button></div>'
        +'<div style="display:grid;gap:10px">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Cliente</label><input id="ot-e-cli" value="'+o.client+'" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Descrizione</label><textarea id="ot-e-desc" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;height:55px;resize:vertical">'+( o.description||'')+'</textarea></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Totale €</label><input id="ot-e-tot" type="number" value="'+(o.total||0)+'" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div><div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Status</label><select id="ot-e-stat" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px">'+selOpts+'</select></div></div></div>'
        +'<div style="display:flex;gap:8px;margin-top:16px"><button onclick="OrderTracker._saveEdit('+i+')" style="flex:1;padding:11px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva</button><button onclick="document.getElementById(\'ot-modal\').remove()" style="padding:11px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;color:var(--text-muted)">Annulla</button></div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
    },
    _saveEdit:function(i){
      var d=load(); if(!d[i]) return;
      Object.assign(d[i],{client:document.getElementById('ot-e-cli')?.value?.trim()||d[i].client,description:document.getElementById('ot-e-desc')?.value||'',total:parseFloat(document.getElementById('ot-e-tot')?.value)||0,status:document.getElementById('ot-e-stat')?.value||d[i].status,updatedAt:new Date().toISOString()});
      save(d); document.getElementById('ot-modal')?.remove(); this.render();
      if(typeof toast!=='undefined') toast('✅ Aggiornato!','success');
    },
  };
})();

// ─── FEATURE 4: Report Generator ─────────────────────────────────
window.ReportGenerator = {
  generateReport:function(period){
    var sales=JSON.parse(localStorage.getItem('ingly_sales_v1')||'[]');
    var quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');
    var clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');
    var orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');
    var now=new Date(), ym=now.toISOString().slice(0,7);
    var isIn=function(d){
      if(!d) return false;
      if(period==='month') return d.slice(0,7)===ym;
      return Date.now()-new Date(d).getTime()<7*864e5;
    };
    var pSales=sales.filter(function(s){return isIn(s.date||s.ts);});
    var pQuotes=quotes.filter(function(q){return isIn(q.date);});
    var pOrders=orders.filter(function(o){return isIn(o.created);});
    var newCli=clients.filter(function(c){return isIn(c.added);});
    var revTotal=pSales.reduce(function(a,s){return a+parseFloat(s.total||0);},0);
    var qTotal=pQuotes.reduce(function(a,q){return a+(q.total||0);},0);
    var avgMg=pQuotes.length?Math.round(pQuotes.reduce(function(a,q){return a+(q.marginPct||0);},0)/pQuotes.length):0;
    var cliRev={};
    pOrders.forEach(function(o){cliRev[o.client]=(cliRev[o.client]||0)+(o.total||0);});
    var topCli=Object.entries(cliRev).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
    var prodCnt={};
    pQuotes.forEach(function(q){if(q.product) prodCnt[q.product]=(prodCnt[q.product]||0)+(q.qty||1);});
    var topProd=Object.entries(prodCnt).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
    var lbl=period==='month'?now.toLocaleDateString('it',{month:'long',year:'numeric'}):'Ultima settimana';

    var w=window.open('','_blank','width=850,height=750');
    if(!w){if(typeof toast!=='undefined') toast('Abilita popup per il report','info');return;}
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report '+lbl+'</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:40px;font-size:13px;color:#1e293b}'
      +'.hdr{display:flex;justify-content:space-between;padding-bottom:20px;border-bottom:3px solid #6366f1;margin-bottom:28px}'
      +'.brand{font-size:22px;font-weight:900;color:#6366f1}'
      +'.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}'
      +'.kpi{background:#f8fafc;border-radius:10px;padding:16px;text-align:center}'
      +'.kv{font-size:24px;font-weight:900;color:#6366f1;margin:6px 0}.kl{font-size:10px;color:#64748b;text-transform:uppercase;font-weight:700}'
      +'table{width:100%;border-collapse:collapse;margin-bottom:20px}'
      +'th{background:#6366f1;color:#fff;padding:9px 12px;text-align:left;font-size:11px;font-weight:700}'
      +'td{padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:12px}'
      +'.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}'
      +'.sec-title{font-size:14px;font-weight:800;color:#1e293b;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}'
      +'@media print{.np{display:none}}</style></head><body>'
      +'<div class="hdr"><div><div class="brand">⚡ Ingly Laser</div><div style="font-size:11px;color:#64748b">Report '+(period==='month'?'Mensile':'Settimanale')+'</div></div>'
      +'<div style="text-align:right"><div style="font-size:18px;font-weight:900">'+lbl.toUpperCase()+'</div><div style="font-size:11px;color:#64748b">Generato '+now.toLocaleDateString('it')+'</div></div></div>'
      +'<div class="kpis"><div class="kpi"><div class="kl">Entrate</div><div class="kv">€'+revTotal.toFixed(0)+'</div></div>'
      +'<div class="kpi"><div class="kl">Preventivi emessi</div><div class="kv">€'+qTotal.toFixed(0)+'</div></div>'
      +'<div class="kpi"><div class="kl">Nuovi Clienti</div><div class="kv">'+newCli.length+'</div></div>'
      +'<div class="kpi"><div class="kl">Margine Medio</div><div class="kv" style="color:'+(avgMg>=50?'#22c55e':'#f59e0b')+'">'+avgMg+'%</div></div></div>'
      +'<div class="grid">'
      +'<div><div class="sec-title">🏆 Top Clienti</div><table><tr><th>#</th><th>Cliente</th><th style="text-align:right">€</th></tr>'+(topCli.length?topCli.map(function(c,i){return '<tr><td>'+(i+1)+'</td><td>'+c[0]+'</td><td style="text-align:right;font-weight:700">€'+c[1].toFixed(0)+'</td></tr>';}).join(''):'<tr><td colspan="3" style="text-align:center;color:#94a3b8">Nessun dato</td></tr>')+'</table></div>'
      +'<div><div class="sec-title">📦 Prodotti Più Richiesti</div><table><tr><th>#</th><th>Prodotto</th><th style="text-align:right">Qty</th></tr>'+(topProd.length?topProd.map(function(p,i){return '<tr><td>'+(i+1)+'</td><td>'+p[0].slice(0,30)+'</td><td style="text-align:right;font-weight:700">'+p[1]+'</td></tr>';}).join(''):'<tr><td colspan="3" style="text-align:center;color:#94a3b8">Nessun dato</td></tr>')+'</table></div></div>'
      +'<div class="np" style="text-align:center"><button onclick="print()" style="padding:11px 24px;background:#6366f1;color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:14px;font-weight:700">🖨️ Stampa / PDF</button> <button onclick="close()" style="padding:11px 18px;background:#f1f5f9;border:none;border-radius:9px;cursor:pointer">Chiudi</button></div>'
      +'</body></html>');
    w.document.close();
    if(typeof toast!=='undefined') toast('📊 Report generato!','success');
  }
};

// Patch navigate
(function _patchRoutes1(){
  function _p(){
    if(typeof App==='undefined'||!App.renderSection){setTimeout(_p,700);return;}
    if(App._v28r1) return; App._v28r1=true;
    var _o=App.renderSection.bind(App);
    App.renderSection=async function(s){
      if(s==='dashboard'||s==='kpi'){
        document.querySelectorAll('.section-view.active').forEach(function(v){v.classList.remove('active');});
        // Si prendeva sempre `view-dashboard` perché il primo id esiste
        // sempre: la voce "KPI Live" apriva la dashboard e la sua pagina era
        // irraggiungibile dal menu.
        var e=document.getElementById('view-'+s)||document.getElementById('view-dashboard');
        if(e){
          e.classList.add('active');
          if(s==='kpi'&&typeof KPIEngine!=='undefined'&&KPIEngine.renderPage) KPIEngine.renderPage();
          else DashboardPro.render();
          return;
        }
      }
      if(s==='order_tracker'||s==='orders_pro'){
        document.querySelectorAll('.section-view.active').forEach(function(v){v.classList.remove('active');});
        OrderTracker.render();
        var e2=document.getElementById('view-order_tracker');
        if(e2){e2.classList.add('active');return;}
      }
      return _o(s);
    };
  }
  setTimeout(_p,1000);
  // Weekly backup reminder on startup
  (function _weeklyBackup(){
    try{
      var last=localStorage.getItem('_last_backup_reminder');
      var now=Date.now();
      if(!last||now-parseInt(last)>7*864e5){
        setTimeout(function(){
          if(typeof toast!=='undefined') toast('💾 Suggerimento: esporta un backup settimanale! (Cloud Sync → Esporta JSON)','info');
          localStorage.setItem('_last_backup_reminder',now.toString());
        },8000);
      }
    }catch(e){}
  })();
})();
console.log('[v28-P1] Dashboard · OrderTracker · Reports · WATemplates loaded');

