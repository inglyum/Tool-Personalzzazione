
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v37 — Task Force Best Version
// Part 1: Design System · Nav Overhaul · Shortcuts · Onboarding
// ═══════════════════════════════════════════════════════════════════

// ─── DESIGN SYSTEM CSS ─────────────────────────────────────────
(function _designSystem(){
  var style=document.createElement('style');
  style.id='ingly-ds-v37';
  if(document.getElementById('ingly-ds-v37')) return;
  style.textContent=[
    ':root{',
    '--ds-radius:10px;--ds-radius-lg:14px;--ds-radius-xl:18px;',
    '--ds-shadow:0 2px 12px rgba(0,0,0,.3);--ds-shadow-lg:0 8px 32px rgba(0,0,0,.4);',
    '--ds-success:#22c55e;--ds-warning:#f59e0b;--ds-danger:#ef4444;--ds-info:#3b82f6;',
    '--ds-success-bg:rgba(34,197,94,.1);--ds-warning-bg:rgba(245,158,11,.1);',
    '--ds-danger-bg:rgba(239,68,68,.1);--ds-info-bg:rgba(59,130,246,.1);',
    '--ds-green:#22c55e;--ds-yellow:#f59e0b;--ds-red:#ef4444;--ds-blue:#3b82f6;',
    '--ds-purple:#8b5cf6;--ds-teal:#14b8a6;--ds-orange:#f97316;',
    '}',
    // Global button reset
    '.btn-v37{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:var(--ds-radius);cursor:pointer;font-size:12px;font-weight:700;transition:.15s;white-space:nowrap}',
    '.btn-v37:hover{filter:brightness(1.1)}',
    '.btn-v37:active{transform:scale(.97)}',
    '.btn-primary{background:linear-gradient(135deg,var(--primary),#8b5cf6);color:#fff}',
    '.btn-success{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff}',
    '.btn-danger{background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.25)}',
    '.btn-ghost{background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border)}',
    // Cards
    '.card-v37{background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--ds-radius-lg);padding:16px}',
    '.card-v37:hover{border-color:rgba(99,102,241,.4)}',
    // Badge
    '.badge-v37{display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700}',
    '.badge-green{background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.25)}',
    '.badge-yellow{background:rgba(245,158,11,.12);color:#f59e0b;border:1px solid rgba(245,158,11,.25)}',
    '.badge-red{background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.25)}',
    '.badge-blue{background:rgba(59,130,246,.12);color:#3b82f6;border:1px solid rgba(59,130,246,.25)}',
    '.badge-purple{background:rgba(139,92,246,.12);color:#8b5cf6;border:1px solid rgba(139,92,246,.25)}',
    // Save indicator
    '#save-indicator{position:fixed;bottom:0;left:0;right:0;height:22px;background:var(--bg-card2);',
    'border-top:1px solid var(--border);display:flex;align-items:center;justify-content:center;',
    'font-size:10px;color:var(--text-dim);z-index:9990;letter-spacing:.3px}',
    // Keyboard shortcut hint
    '.kbd{display:inline-block;background:var(--bg-card2);border:1px solid var(--border);',
    'border-radius:4px;padding:1px 5px;font-size:9px;color:var(--text-muted);font-family:monospace}',
    // Smooth transitions
    '.section-view{transition:opacity .15s}',
    '.nav-item.active{background:rgba(99,102,241,.12)!important;color:var(--primary)!important;border-left:2px solid var(--primary)}',
    // Core nav panel — redesigned compact collapsible
    '#core-nav{border-bottom:1px solid var(--border);flex-shrink:0;overflow:hidden}',
    '#cn-header{display:flex;align-items:center;justify-content:space-between;padding:8px 12px 4px;cursor:pointer;user-select:none}',
    '#cn-header:hover .cn-h-label{color:var(--primary)}',
    '.cn-h-label{font-size:10px;font-weight:800;color:var(--text-dim);text-transform:uppercase;letter-spacing:.6px;transition:.15s}',
    '.cn-h-badge{font-size:9px;color:var(--text-dim);background:var(--bg-card2);border:1px solid var(--border);border-radius:4px;padding:2px 6px;transition:.15s}',
    '#cn-body{max-height:200px;transition:max-height .28s ease,opacity .2s;overflow:hidden;opacity:1;padding:0 10px 10px}',
    '#cn-body.cn-collapsed{max-height:0;opacity:0;pointer-events:none;padding:0}',
    '#core-nav .cn-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}',
    '#core-nav .cn-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;',
    'gap:2px;padding:7px 2px;background:var(--bg-card);border:1px solid var(--border);',
    'border-radius:8px;cursor:pointer;transition:.15s;font-size:16px}',
    '#core-nav .cn-btn span{font-size:8px;font-weight:700;color:var(--text-muted);text-align:center;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}',
    '#core-nav .cn-btn:hover{background:rgba(99,102,241,.1);border-color:var(--primary)}',
    '#core-nav .cn-btn:hover span{color:var(--primary)}',
    '#core-nav .cn-btn.active{background:rgba(99,102,241,.15);border-color:var(--primary)}',
    // Hide orphan nav groups to reduce clutter
    '.ng-hidden-v37{display:none!important}',
    // Mobile responsive basics
    '@media(max-width:768px){',
    '.sidebar{width:100%!important;height:auto!important;position:fixed;bottom:0;left:0;right:0;',
    'top:auto!important;border-right:none!important;border-top:1px solid var(--border);',
    'flex-direction:row;overflow-x:auto;z-index:1000}',
    '#core-nav .cn-grid{grid-template-columns:repeat(6,1fr)}',
    '#sidebar-search,#sidebar-toolbar,.nav-group{display:none!important}',
    '}',
  ].join('\n');
  document.head.appendChild(style);
})();

// ─── SAVE INDICATOR ──────────────────────────────────────────────
(function _saveIndicator(){
  if(document.getElementById('save-indicator')) return;
  var bar=document.createElement('div'); bar.id='save-indicator';
  bar.textContent='⚡ Ingly OS v37 · Dati salvati localmente';
  document.body.appendChild(bar);
  window._inglyLastSave=function(msg){
    var b=document.getElementById('save-indicator');
    if(!b) return;
    b.innerHTML='<span style="color:var(--ds-success)">✅</span> '+(msg||'Salvato')
      +' — '+new Date().toLocaleTimeString('it',{hour:'2-digit',minute:'2-digit'})
      +'&nbsp;&nbsp;|&nbsp;&nbsp;Ingly OS v37 · <span id="si-storage"></span>';
    _updateStorageInfo();
  };
  function _updateStorageInfo(){
    try{
      var total=0;
      for(var k in localStorage) if(localStorage.hasOwnProperty(k)) total+=localStorage[k].length;
      var kb=Math.round(total/1024);
      var si=document.getElementById('si-storage');
      if(si) si.textContent='Storage: '+kb+'KB usato';
    }catch(e){}
  }
  _updateStorageInfo();
  // Intercept localStorage.setItem globally
  var _origSet=localStorage.setItem.bind(localStorage);
  localStorage.setItem=function(k,v){
    _origSet(k,v);
    clearTimeout(window._saveTick);
    window._saveTick=setTimeout(function(){window._inglyLastSave&&window._inglyLastSave('Salvato');},300);
  };
})();

// ─── CORE NAVIGATION PANEL ──────────────────────────────────────
(function _coreNavPanel(){
  function _inject(){
    if(document.getElementById('core-nav')) return;
    var si=document.getElementById('sidebar-inner'); if(!si) return;
    // Remove legacy v27-core-nav to avoid duplication
    var legacy=document.getElementById('v27-core-nav'); if(legacy) legacy.remove();
    var div=document.createElement('div'); div.id='core-nav';
    var CORE=[
      {icon:'📊',label:'Dashboard',   action:"App.navigate('dashboard')"},
      {icon:'👥',label:'CRM',         action:"App.navigate('clienti')"},
      {icon:'⚡',label:'Quoter',      action:"QuoteGeneratorV2&&QuoteGeneratorV2.open()"},
      {icon:'💼',label:'B2B',         action:"App.navigate('laser_b2b')"},
      {icon:'📋',label:'Ordini',      action:"App.navigate('order_tracker')"},
      {icon:'🏭',label:'Magazzino',   action:"App.navigate('magazzino')"},
      {icon:'🗂️',label:'Pipeline',   action:"App.navigate('crm_pipeline')"},
      {icon:'📄',label:'Fatture',     action:"App.navigate('xmlsdi')"},
      {icon:'📊',label:'Stats',       action:"SalesStats&&SalesStats.render()"},
      {icon:'☁️',label:'Cloud',       action:"App.navigate('cloud_updater')"},
      {icon:'🎨',label:'Brand',       action:"BrandConfig&&BrandConfig.openSettings()"},
      {icon:'⚙️',label:'Settings',   action:"IVAConfig&&IVAConfig.openSettings()"},
    ];
    var CN_KEY='cn_collapsed_v1';
    var isCollapsed=localStorage.getItem(CN_KEY)==='1';
    div.innerHTML='<div id="cn-header" onclick="(function(){var b=document.getElementById(\'cn-body\');if(!b)return;var c=b.classList.toggle(\'cn-collapsed\');localStorage.setItem(\''+CN_KEY+'\',c?\'1\':\'0\');var chev=document.getElementById(\'cn-chev\');if(chev)chev.textContent=c?\'▸\':\'▾\';})()">'
      +'<span class="cn-h-label">⚡ Rapido</span>'
      +'<span class="cn-h-badge"><span id="cn-chev">'+(isCollapsed?'▸':'▾')+'</span></span>'
      +'</div>'
      +'<div id="cn-body" class="'+(isCollapsed?'cn-collapsed':'')+'">'
      +'<div class="cn-grid">'
      +CORE.map(function(b){
        return '<div class="cn-btn" onclick="'+b.action+';document.querySelectorAll(\'.cn-btn\').forEach(function(x){x.classList.remove(\'active\')});this.classList.add(\'active\')" title="'+b.label+'">'
          +'<span style="font-size:16px">'+b.icon+'</span>'
          +'<span>'+b.label+'</span>'
          +'</div>';
      }).join('')
      +'</div></div>';
    si.insertBefore(div, si.firstChild);
  }
  setTimeout(function(){_inject();},1000);
})();

// ─── KEYBOARD SHORTCUTS ─────────────────────────────────────────
window.KeyboardShortcuts = (function(){
  function _act(fn){ try{fn();}catch(e){} }
  document.addEventListener('keydown',function(e){
    var cmd=(e.metaKey||e.ctrlKey);
    if(!cmd) return;
    var key=e.key.toLowerCase();
    if(key==='k'&&!e.shiftKey){ e.preventDefault(); _act(function(){
      var gs=document.getElementById('global-search-input')||document.getElementById('nav-search');
      if(gs){gs.focus();gs.select();}else if(typeof CmdPalette!=='undefined') CmdPalette.open();
    }); return; }
    if(key==='n'){ e.preventDefault(); _act(function(){
      // New client modal
      if(typeof CRMSmart!=='undefined'&&CRMSmart._addClient) CRMSmart._addClient();
      else if(typeof App!=='undefined') App.navigate('clienti');
    }); return; }
    if(key==='p'){ e.preventDefault(); _act(function(){
      if(typeof QuoteGeneratorV2!=='undefined') QuoteGeneratorV2.open();
    }); return; }
    if(key==='o'){ e.preventDefault(); _act(function(){
      if(typeof App!=='undefined') App.navigate('order_tracker');
    }); return; }
    if(key==='m'){ e.preventDefault(); _act(function(){
      if(typeof App!=='undefined') App.navigate('magazzino');
    }); return; }
    if(key==='d'){ e.preventDefault(); _act(function(){
      if(typeof App!=='undefined') App.navigate('dashboard');
    }); return; }
    if(key==='/'){ e.preventDefault(); _act(function(){
      var ns=document.getElementById('nav-search'); if(ns){ns.focus();ns.select();}
    }); return; }
  });
  // Show shortcut hints
  return {
    showHelp:function(){
      var old=document.getElementById('shortcut-help'); if(old){old.remove();return;}
      var modal=document.createElement('div'); modal.id='shortcut-help';
      modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
      var shortcuts=[
        ['⌘K / Ctrl+K','Ricerca globale'],['⌘N / Ctrl+N','Nuovo cliente'],
        ['⌘P / Ctrl+P','Nuovo preventivo'],['⌘O / Ctrl+O','Ordini'],
        ['⌘M / Ctrl+M','Magazzino'],['⌘D / Ctrl+D','Dashboard'],['/ ','Cerca moduli'],
      ];
      modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:400px;box-shadow:0 20px 60px rgba(0,0,0,.6)">'
        +'<div style="font-size:16px;font-weight:900;color:var(--text);margin-bottom:16px">⌨️ Scorciatoie Tastiera</div>'
        +shortcuts.map(function(s){return '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)">'
          +'<span class="kbd">'+s[0]+'</span><span style="font-size:12px;color:var(--text-muted)">'+s[1]+'</span></div>';}).join('')
        +'<button onclick="document.getElementById(\'shortcut-help\').remove()" style="width:100%;margin-top:14px;padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;color:var(--text-muted);font-size:13px">Chiudi</button>'
        +'</div>';
      document.body.appendChild(modal);
      modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
    }
  };
})();

// ─── ONBOARDING WIZARD ──────────────────────────────────────────
window.OnboardingWizard = {
  _SK:'_wizard_done_v37',
  _step:0,
  check:function(){
    if(localStorage.getItem(this._SK)) return;
    setTimeout(function(){OnboardingWizard.show();},2500);
  },
  show:function(){
    if(document.getElementById('onboarding-v37')) return;
    var modal=document.createElement('div'); modal.id='onboarding-v37';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px)';
    this._step=0;
    this._render(modal);
    document.body.appendChild(modal);
  },
  _steps:[
    {
      icon:'⚡',title:'Benvenuto in Ingly OS!',
      sub:'Il gestionale professionale per artigiani della personalizzazione laser',
      content:'Configura il tuo profilo in 4 step rapidi per iniziare a usare tutte le funzionalità al massimo.',
      action:null, actionLabel:'Inizia Setup →',
      skip:true
    },
    {
      icon:'🎨',title:'Step 1 / 4 — Configura il tuo Brand',
      sub:'Nome attività, P.IVA, colori · appare su tutti i PDF preventivi',
      content:'Inserisci i dati della tua attività. Verranno usati automaticamente su tutti i preventivi, fatture e documenti generati.',
      action:'BrandConfig.openSettings()',actionLabel:'Apri Configurazione Brand',
      note:'Dopo aver salvato il brand, torna qui per continuare',skip:true
    },
    {
      icon:'⚙️',title:'Step 2 / 4 — Configura le Macchine',
      sub:'xTool F2, xTool P3 CO2 80W e le tue macchine personalizzate',
      content:'Il calcolatore costi usa i dati reali delle tue macchine (costo orario, energia, velocità) per calcolare margini precisi.',
      action:"App.navigate('laser_b2b');OnboardingWizard._close()",actionLabel:'Vai a Laser Quoter',skip:true
    },
    {
      icon:'👥',title:'Step 3 / 4 — Aggiungi il primo cliente',
      sub:'Importa da VCF/Excel o aggiungi manualmente',
      content:'Il CRM ti permette di gestire tutti i tuoi clienti, preventivi, ordini e comunicazioni in un unico posto.',
      action:"App.navigate('clienti');OnboardingWizard._close()",actionLabel:'Vai al CRM',skip:true
    },
    {
      icon:'💼',title:'Step 4 / 4 — Crea il primo preventivo',
      sub:'Calcola costi, margini e genera PDF professionale in 3 click',
      content:'Usa il Preventivo Rapido (⌘P) per creare preventivi multi-prodotto con calcolo costi istantaneo, markup configurabile e PDF branded.',
      action:'QuoteGeneratorV2&&QuoteGeneratorV2.open();OnboardingWizard._close()',actionLabel:'Crea Preventivo Rapido',skip:true
    },
    {
      icon:'🚀',title:'Setup Completato!',
      sub:'Ingly OS è pronto per la tua attività',
      content:'Ricorda: ⌘K per la ricerca globale, ⌘P per un preventivo rapido, ⌘N per un nuovo cliente. Il pannello "Accesso Rapido" nella sidebar ti porta ovunque in 1 click.',
      action:null,actionLabel:'Inizia a usare Ingly OS ✅',skip:false
    },
  ],
  _render:function(modal){
    var s=this._steps[this._step]; var self=this;
    var isLast=this._step===this._steps.length-1;
    modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:28px;width:500px;max-width:100%;box-shadow:0 24px 64px rgba(0,0,0,.6)">'
      +'<div style="text-align:center;margin-bottom:20px">'
      +'<div style="font-size:44px;margin-bottom:10px">'+s.icon+'</div>'
      +'<div style="font-size:20px;font-weight:900;color:var(--text);line-height:1.2">'+s.title+'</div>'
      +'<div style="font-size:12px;color:var(--primary2);margin-top:6px">'+s.sub+'</div>'
      +'</div>'
      +'<div style="background:var(--bg-card2);border-radius:12px;padding:14px;margin-bottom:20px;font-size:12px;color:var(--text-muted);line-height:1.7">'+s.content+'</div>'
      // Progress dots
      +'<div style="display:flex;justify-content:center;gap:6px;margin-bottom:20px">'
      +this._steps.map(function(_,i){
        return '<div style="width:'+(i===self._step?'20':'8')+'px;height:8px;border-radius:4px;background:'+(i===self._step?'var(--primary)':'var(--border)')+';transition:.2s"></div>';
      }).join('')+'</div>'
      +'<div style="display:flex;gap:8px">'
      +(s.skip?'<button onclick="OnboardingWizard._skip()" style="padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:12px;color:var(--text-muted)">'+( isLast?'Chiudi':'Salta per ora')+'</button>':'')
      +'<button onclick="OnboardingWizard._next()" style="flex:1;padding:11px;background:linear-gradient(135deg,var(--primary),#8b5cf6);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:800">'+s.actionLabel+'</button>'
      +'</div>'
      +(s.note?'<div style="margin-top:10px;font-size:10px;color:var(--text-dim);text-align:center">'+s.note+'</div>':'')
      +'</div>';
  },
  _next:function(){
    var s=this._steps[this._step];
    if(s.action) try{eval(s.action);}catch(e){}
    if(this._step>=this._steps.length-1){this._complete();return;}
    this._step++; var modal=document.getElementById('onboarding-v37');
    if(modal) this._render(modal);
  },
  _skip:function(){
    var modal=document.getElementById('onboarding-v37'); if(modal) modal.remove();
    // Ricorda SEMPRE lo skip: altrimenti l'onboarding si riapre a ogni apertura.
    // Si può sempre riaprire da Dashboard → ⚙️ Impostazioni.
    localStorage.setItem(OnboardingWizard._SK,'1');
    if(typeof toast!=='undefined') toast('Setup rimandato — riapribile da Impostazioni','info');
    if(this._step>=this._steps.length-1) this._complete();
  },
  _close:function(){ var m=document.getElementById('onboarding-v37');if(m)m.remove(); },
  _complete:function(){
    localStorage.setItem(this._SK,'1');
    var modal=document.getElementById('onboarding-v37');if(modal)modal.remove();
    if(typeof toast!=='undefined') toast('🚀 Setup completato! Benvenuto in Ingly OS v37','success');
  },
  reset:function(){ localStorage.removeItem(this._SK); this.show(); }
};
setTimeout(function(){OnboardingWizard.check();},2000);

// ─── ERROR BOUNDARY GLOBALE ──────────────────────────────────────
(function _errorBoundary(){
  window._inglyErrors=window._inglyErrors||[];
  window.onerror=function(msg,src,line,col,err){
    window._inglyErrors.push({msg:msg,src:src,line:line,col:col,time:new Date().toISOString()});
    window._inglyErrors=window._inglyErrors.slice(-20);
    // Show non-intrusive error toast
    var existing=document.getElementById('err-toast-v37');
    if(existing) return false;
    var t=document.createElement('div'); t.id='err-toast-v37';
    t.style.cssText='position:fixed;bottom:28px;left:16px;z-index:99990;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:8px 12px;font-size:11px;color:#ef4444;max-width:300px;display:flex;align-items:center;gap:8px';
    t.innerHTML='<span>⚠️</span><span style="flex:1">Errore recuperato automaticamente</span><button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:14px">✕</button>';
    document.body.appendChild(t);
    setTimeout(function(){var e=document.getElementById('err-toast-v37');if(e)e.remove();},5000);
    return false;
  };
  window.addEventListener('unhandledrejection',function(e){
    window._inglyErrors&&window._inglyErrors.push({msg:String(e.reason),time:new Date().toISOString()});
    e.preventDefault();
  });
})();

console.log('[v37-P1] Design system · Core nav · Shortcuts · Onboarding · Error boundary ✅');

