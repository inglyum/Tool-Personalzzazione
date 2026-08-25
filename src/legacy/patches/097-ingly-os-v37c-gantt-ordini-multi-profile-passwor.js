
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v37c — Gantt Ordini + Multi-Profile (password locale)
// ═══════════════════════════════════════════════════════════════════

// ─── GANTT ORDINI ─────────────────────────────────────────────────
window.GanttOrdini = {
  render: function(){
    var orders=[]; try{orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');}catch(e){}
    var active=orders.filter(function(o){return ['confirmed','in_progress','draft'].indexOf(o.status)>-1;});
    if(!active.length){if(typeof toast!=='undefined')toast('Nessun ordine attivo per il Gantt','info');return;}

    var el=document.getElementById('view-gantt');
    if(!el){
      el=document.createElement('div'); el.id='view-gantt'; el.className='section-view';
      el.style.cssText='padding:0;overflow:hidden';
      var ci=document.getElementById('content-inner'); if(ci) ci.appendChild(el);
    }

    var now=new Date(); var today=now.toISOString().slice(0,10);
    // Compute date range
    var minDate=new Date(Math.min.apply(null,active.map(function(o){return new Date(o.created||o.date||Date.now()).getTime();})));
    var maxDate=new Date(Date.now()+21*864e5); // +21 days
    var totalDays=Math.ceil((maxDate-minDate)/864e5)+1;
    var dayW=Math.max(28, Math.floor(Math.min(900, window.innerWidth-300)/Math.min(totalDays,30)));

    // Build dates array (show max 30 days)
    var days=[]; var d=new Date(minDate);
    for(var i=0;i<Math.min(totalDays,35);i++){
      days.push(new Date(d)); d.setDate(d.getDate()+1);
    }

    var STATUS_COLORS={draft:'#64748b',confirmed:'#3b82f6',in_progress:'#f59e0b',delivered:'#10b981',paid:'#22c55e',cancelled:'#ef4444'};
    var STATUS_LABELS={draft:'Bozza',confirmed:'Confermato',in_progress:'In Lavoro',delivered:'Consegnato',paid:'Pagato',cancelled:'Annullato'};

    function dateToX(dateStr){
      var d2=new Date(dateStr||Date.now());
      var diff=Math.floor((d2-minDate)/864e5);
      return 180 + diff*dayW;
    }

    // Build SVG
    var SVG_W=180+days.length*dayW+20;
    var ROW_H=42;
    var SVG_H=60+active.length*ROW_H+30;

    var svgLines='';
    // Day columns
    days.forEach(function(day,i){
      var x=180+i*dayW;
      var isToday=day.toISOString().slice(0,10)===today;
      var isWeekend=day.getDay()===0||day.getDay()===6;
      svgLines+='<rect x="'+x+'" y="0" width="'+dayW+'" height="'+SVG_H+'" fill="'+(isToday?'rgba(99,102,241,.08)':isWeekend?'rgba(255,255,255,.02)':'none')+'"/>';
      if(isToday) svgLines+='<line x1="'+(x+dayW/2)+'" y1="0" x2="'+(x+dayW/2)+'" y2="'+SVG_H+'" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="4 3" opacity=".6"/>';
      svgLines+='<line x1="'+x+'" y1="0" x2="'+x+'" y2="'+SVG_H+'" stroke="rgba(255,255,255,.05)" stroke-width="0.5"/>';
      // Date label
      var dayLbl=day.getDate();
      var monLbl=day.toLocaleDateString('it',{month:'short'});
      if(i===0||day.getDate()===1){
        svgLines+='<text x="'+(x+dayW/2)+'" y="20" text-anchor="middle" font-size="10" fill="#64748b" font-family="Arial">'+monLbl+'</text>';
      }
      svgLines+='<text x="'+(x+dayW/2)+'" y="42" text-anchor="middle" font-size="9" fill="'+(isToday?'#818cf8':'#64748b')+'" font-family="Arial">'+dayLbl+'</text>';
    });

    // Header row background
    svgLines='<rect x="0" y="0" width="'+SVG_W+'" height="50" fill="rgba(30,41,59,.9)"/>'+svgLines;

    // Order rows
    active.forEach(function(o,i){
      var y=50+i*ROW_H;
      var startDate=o.created||o.date||new Date().toISOString();
      var estDays=(o.status==='in_progress'?7:14); // estimated days
      var endDate=new Date(new Date(startDate).getTime()+estDays*864e5).toISOString();
      var x1=Math.max(180,dateToX(startDate));
      var x2=Math.min(SVG_W-5,dateToX(endDate));
      var barW=Math.max(dayW*0.8, x2-x1);
      var color=STATUS_COLORS[o.status||'draft']||'#64748b';
      var isLate=new Date(endDate)<now&&o.status!=='delivered'&&o.status!=='paid';

      // Row background
      svgLines+='<rect x="0" y="'+(y+1)+'" width="'+SVG_W+'" height="'+(ROW_H-2)+'" fill="'+(i%2===0?'rgba(255,255,255,.015)':'rgba(255,255,255,.008)')+'"/>';
      // Client name
      var nameStr=(o.client||'').slice(0,22);
      svgLines+='<text x="8" y="'+(y+ROW_H/2+5)+'" font-size="11" fill="rgba(241,245,249,.9)" font-weight="600" font-family="Arial">'+nameStr+'</text>';
      // Amount
      svgLines+='<text x="170" y="'+(y+ROW_H/2+5)+'" text-anchor="end" font-size="10" fill="#10b981" font-weight="700" font-family="Arial">€'+(o.total||0).toFixed(0)+'</text>';

      // Bar background track
      svgLines+='<rect x="'+x1+'" y="'+(y+6)+'" width="'+Math.max(barW,4)+'" height="'+(ROW_H-14)+'" rx="5" fill="'+color+'20" stroke="'+color+'40" stroke-width="0.5"/>';
      // Progress fill
      var pct=o.status==='paid'||o.status==='delivered'?1:o.status==='in_progress'?.6:o.status==='confirmed'?.3:.1;
      svgLines+='<rect x="'+x1+'" y="'+(y+6)+'" width="'+Math.max(barW*pct,4)+'" height="'+(ROW_H-14)+'" rx="5" fill="'+color+'" opacity="0.8"/>';
      // Status label inside bar
      if(barW>60){
        svgLines+='<text x="'+(x1+8)+'" y="'+(y+ROW_H/2+4)+'" font-size="9" fill="#fff" font-weight="700" font-family="Arial">'+( STATUS_LABELS[o.status||'draft']||o.status||'')+'</text>';
      }
      // Late indicator
      if(isLate) svgLines+='<text x="'+(x2+4)+'" y="'+(y+ROW_H/2+4)+'" font-size="10" fill="#ef4444" font-family="Arial">⚠️ Ritardo</text>';
    });

    // Today label
    var todayX=dateToX(today);
    if(todayX>180&&todayX<SVG_W){
      svgLines+='<rect x="'+(todayX-18)+'" y="44" width="36" height="12" rx="3" fill="#6366f1"/>';
      svgLines+='<text x="'+todayX+'" y="53" text-anchor="middle" font-size="8" fill="#fff" font-weight="700" font-family="Arial">OGGI</text>';
    }

    el.innerHTML='<div style="padding:14px 18px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">'
      +'<div><div style="font-size:20px;font-weight:900;color:var(--text)">📅 Gantt Ordini</div>'
      +'<div style="font-size:11px;color:var(--text-muted)">'+active.length+' ordini attivi · Barra = durata stimata · Riempimento = avanzamento</div></div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
      +Object.entries(STATUS_COLORS).map(function(kv){return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--text-muted)"><span style="width:10px;height:10px;border-radius:3px;background:'+kv[1]+';display:inline-block"></span>'+(STATUS_LABELS[kv[0]]||kv[0])+'</span>';}).join('')
      +'</div></div>'
      +'<div style="overflow-x:auto;border-radius:12px;border:1px solid var(--border)">'
      +'<svg width="'+SVG_W+'" height="'+SVG_H+'" style="min-width:'+SVG_W+'px;display:block">'
      +svgLines
      +'</svg></div>'
      +'<div style="margin-top:10px;font-size:10px;color:var(--text-dim)">💡 La linea viola indica oggi · Barre rosse = ordini in ritardo · Clicca su Ordini per aggiornare gli stati</div>'
      +'</div>';
  }
};

// Route for gantt
(function _ganttRoute(){
  function _p(){
    if(typeof App==='undefined'||!App.renderSection){setTimeout(_p,700);return;}
    if(App._v37cgantt) return; App._v37cgantt=true;
    var _orig=App.renderSection.bind(App);
    App.renderSection=async function(s){
      if(s==='gantt'){
        document.querySelectorAll('.section-view.active').forEach(function(v){v.classList.remove('active');});
        var el=document.getElementById('view-gantt');
        if(!el){el=document.createElement('div');el.id='view-gantt';el.className='section-view';el.style.cssText='padding:0';var ci=document.getElementById('content-inner');if(ci)ci.appendChild(el);}
        el.classList.add('active'); GanttOrdini.render(); return;
      }
      return _orig(s);
    };
  }
  setTimeout(_p,900);
  // Add Gantt button to Core Nav
  setTimeout(function(){
    var coreNav=document.getElementById('core-nav');
    if(!coreNav||coreNav.querySelector('[title="Gantt"]')) return;
    var grid=coreNav.querySelector('.cn-grid'); if(!grid) return;
    var btn=document.createElement('div'); btn.className='cn-btn'; btn.title='Gantt';
    btn.setAttribute('onclick',"App.navigate('gantt')");
    btn.innerHTML='<span style="font-size:18px">📅</span><span>Gantt</span>';
    grid.appendChild(btn);
  },3000);
})();

// ─── MULTI-PROFILE (Profili locali con PIN) ────────────────────────
window.ProfileManager = {
  _SK: 'ingly_profiles_v1',
  _activeSK: 'ingly_active_profile',
  load: function(){ try{return JSON.parse(localStorage.getItem(this._SK)||'[]');}catch(e){return[];} },
  save: function(d){ try{localStorage.setItem(this._SK,JSON.stringify(d));}catch(e){} },
  getActive: function(){ return localStorage.getItem(this._activeSK)||'default'; },
  setActive: function(id){ localStorage.setItem(this._activeSK,id); },
  openManager: function(){
    var profiles=this.load();
    if(!profiles.length) profiles=[{id:'default',name:'Principale',pin:'',emoji:'⚡',created:new Date().toISOString()}];
    var old=document.getElementById('profile-modal'); if(old) old.remove();
    var modal=document.createElement('div'); modal.id='profile-modal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px)';
    var active=this.getActive();
    modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:24px;width:420px;max-width:100%;box-shadow:0 24px 64px rgba(0,0,0,.6)">'
      +'<div style="font-size:18px;font-weight:900;color:var(--text);margin-bottom:20px">👤 Profili Utente</div>'
      +'<div id="profile-list" style="display:grid;gap:8px;margin-bottom:16px">'
      +profiles.map(function(p){
        var isActive=p.id===active;
        return '<div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--bg-card2);border:1.5px solid '+(isActive?'var(--primary)':'var(--border)')+';border-radius:12px;cursor:pointer" onclick="ProfileManager._switchTo(\''+p.id+'\')">'
          +'<span style="font-size:22px">'+p.emoji+'</span>'
          +'<div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--text)">'+p.name+'</div>'
          +'<div style="font-size:10px;color:var(--text-muted)">'+(p.pin?'🔐 PIN impostato':'🔓 Nessun PIN')+(isActive?' · Attivo':'')+'</div></div>'
          +(isActive?'<span style="background:var(--primary);color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">Attivo</span>':'')
          +'</div>';
      }).join('')
      +'</div>'
      +'<div style="display:flex;gap:8px">'
      +'<button onclick="ProfileManager._addProfile()" style="flex:1;padding:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700">+ Nuovo Profilo</button>'
      +'<button onclick="document.getElementById(\'profile-modal\').remove()" style="padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;color:var(--text-muted)">Chiudi</button>'
      +'</div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
  },
  _switchTo: function(id){
    var profiles=this.load();
    var p=profiles.find(function(x){return x.id===id;});
    if(!p) return;
    if(p.pin){
      var entered=prompt('Inserisci PIN per "'+p.name+'":');
      if(entered!==p.pin){if(typeof toast!=='undefined')toast('PIN errato','error');return;}
    }
    this.setActive(id);
    document.getElementById('profile-modal')?.remove();
    if(typeof toast!=='undefined') toast('👤 Profilo attivo: '+p.emoji+' '+p.name,'success');
    // Update topbar
    var tb=document.getElementById('profile-topbar-btn');
    if(tb) tb.textContent=p.emoji+' '+p.name;
  },
  _addProfile: function(){
    var name=prompt('Nome del nuovo profilo (es. Operatore 2):');
    if(!name) return;
    var pin=prompt('PIN opzionale (lascia vuoto per nessun PIN):','');
    var emoji=prompt('Emoji per il profilo:','👤');
    var profiles=this.load();
    profiles.push({id:'prof_'+Date.now(),name:name,pin:pin||'',emoji:emoji||'👤',created:new Date().toISOString()});
    this.save(profiles);
    this.openManager(); // Refresh
    if(typeof toast!=='undefined') toast('✅ Profilo "'+name+'" creato','success');
  }
};

// Add profile button to topbar
(function _addProfileBtn(){
  setTimeout(function(){
    var topbar=document.querySelector('.topbar, .header, #topbar');
    if(!topbar||topbar.querySelector('#profile-topbar-btn')) return;
    var profiles=ProfileManager.load();
    var active=ProfileManager.getActive();
    var p=profiles.find(function(x){return x.id===active;})||{emoji:'👤',name:'Profilo'};
    var btn=document.createElement('button'); btn.id='profile-topbar-btn';
    btn.style.cssText='padding:5px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;color:var(--text-muted)';
    btn.textContent=p.emoji+' '+p.name;
    btn.onclick=function(){ProfileManager.openManager();};
    topbar.insertBefore(btn,topbar.firstChild);
  },3000);
})();

// ─── EXPORT COMMERCIALISTA — aggiungi pulsante alla finanza ──────
(function _addExportBtn(){
  setTimeout(function(){
    var el=document.getElementById('view-xmlsdi')||document.getElementById('view-finance');
    if(!el||el.querySelector('.export-comm-btn')) return;
    var btn=document.createElement('button'); btn.className='export-comm-btn btn-v37 btn-ghost';
    btn.style.cssText='padding:8px 14px;background:rgba(34,197,94,.1);color:#22c55e;border:1px solid rgba(34,197,94,.3);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700';
    btn.innerHTML='📊 Export Commercialista';
    btn.onclick=function(){ExportCommercialista&&ExportCommercialista.export();};
    var firstChild=el.querySelector('div'); if(firstChild) el.insertBefore(btn,firstChild.nextSibling);
  },2500);
})();

// ─── FINAL DASHBOARD SHORTCUTS ──────────────────────────────────
(function _finalDashShortcuts(){
  function _p(){
    if(typeof DashboardPro==='undefined'){setTimeout(_p,800);return;}
    if(DashboardPro._v37cfinal) return; DashboardPro._v37cfinal=true;
    var _orig=DashboardPro.render.bind(DashboardPro);
    DashboardPro.render=function(){
      _orig();
      setTimeout(function(){
        var shortcuts=document.getElementById('v37cfinal-shortcuts');
        if(shortcuts) return;
        var el=document.getElementById('view-dashboard')||document.getElementById('view-kpi');
        if(!el) return;
        var div=document.createElement('div'); div.id='v37cfinal-shortcuts';
        div.style.cssText='display:flex;gap:8px;flex-wrap:wrap;padding:12px;background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);margin-bottom:10px';
        var btns=[
          {label:'📅 Gantt Ordini', action:"App.navigate('gantt')"},
          {label:'📒 Prima Nota', action:"App.navigate('prima_nota')"},
          {label:'📊 Export Commercialista', action:"ExportCommercialista&&ExportCommercialista.export()"},
          {label:'🔀 Merge Duplicati CRM', action:"CRMMerge&&CRMMerge.openManager()"},
          {label:'🔀 Converti Preventivo→Ordine', action:"PreventivoArchivio&&PreventivoArchivio.openForClient()"},
          {label:'📋 Calcolo Fabbisogno', action:"MagazzinoFabbisogno&&MagazzinoFabbisogno.calculate()"},
          {label:'🏷️ Segmenta Clienti', action:"CRMSegmentation&&CRMSegmentation.segment()"},
          {label:'📄 Report Dashboard PDF', action:"DashboardPDFExport&&DashboardPDFExport.export()"},
          {label:'👤 Profili', action:"ProfileManager&&ProfileManager.openManager()"},
        ];
        div.innerHTML='<div style="font-size:9px;font-weight:800;color:var(--text-dim);text-transform:uppercase;width:100%;margin-bottom:2px">🛠️ Strumenti Avanzati</div>'
          +btns.map(function(b){
            return '<button onclick="try{'+b.action+'}catch(e){}" style="padding:6px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted);font-weight:600">'+b.label+'</button>';
          }).join('');
        var firstDiv=el.querySelector('div'); if(firstDiv) el.insertBefore(div,firstDiv);
      },600);
    };
  }
  setTimeout(_p,3000);
})();

console.log('[v37c] Gantt · Multi-Profile · Export links · Dashboard shortcuts ✅');

