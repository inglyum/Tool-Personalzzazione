
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v37c — Multi-Profile (password locale)
// ═══════════════════════════════════════════════════════════════════

/* Qui viveva il Gantt Ordini (window.GanttOrdini, rotta 'gantt', il
   pulsante iniettato in #core-nav): leggeva da 'ingly_orders_pro_v1', un
   localStorage isolato che l'app reale non scrive più da tempo — sarebbe
   sempre stato vuoto o disallineato con gli ordini veri. Rimosso per
   intero, non nascosto: nessun percorso dell'app porta più a 'gantt'. */

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

console.log('[v37c] Multi-Profile · Export links · Dashboard shortcuts ✅');

