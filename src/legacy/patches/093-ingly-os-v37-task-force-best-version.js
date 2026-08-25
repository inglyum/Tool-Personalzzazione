
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v37 — Task Force Best Version
// Part 3: Zombie cleanup · Storage consolidation · Dashboard v37
//         LaserB2B consolidated · Sidebar clean · QoL fixes
// ═══════════════════════════════════════════════════════════════════

// ─── STORAGE CONSOLIDATION (migrate orphan keys) ─────────────────
/* Questa migrazione perdeva dati.

   Il commento diceva «merge … newer always wins», ma il codice faceva:

       if(v23) v33 = v23; else if(v1) v33 = v1;

   che non è un'unione: è una scelta. Un prodotto presente solo in `v1` non
   arrivava mai in `v33`, e le chiavi vecchie restavano lì a far credere il
   contrario. Riprodotto: due cataloghi con prodotti diversi, dopo la
   migrazione ne sopravviveva uno solo — e la console stampava «completed».

   Ora si uniscono record per record. Su una chiave presente in entrambi vince
   la versione più recente, che è ciò che il commento prometteva; una chiave
   presente in una sola versione sopravvive sempre.

   Gira sotto un contrassegno nuovo (`v38`) proprio per passare anche su chi ha
   già eseguito la versione precedente: a quegli utenti **recupera** i record
   che erano stati scartati.

   Le chiavi di origine non vengono cancellate. Sarebbe la pulizia ovvia, ma
   patch 076 legge ancora `lb2b_catalog_v1` (riga 854): toglierla qui
   spegnerebbe una funzione per fare ordine. Restano, e non fanno danno finché
   l'unione è corretta. */
(function _storageConsolidate(){
  var FLAG = '_storage_migrated_v38';
  if(localStorage.getItem(FLAG)) return;

  function read(k){
    try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; }
  }

  /* Unisce più lists in uno. Le origini sono ordinate dalla più recente:
     chi arriva before vince sulla stessa chiave. */
  function merge(lists, keyField){
    var seen = Object.create(null);
    var unkeyed = [];
    var kept = 0;
    lists.forEach(function(list){
      if(!Array.isArray(list)) return;
      list.forEach(function(rec){
        if(!rec || typeof rec !== 'object') return;
        var k = rec[keyField];
        // Un record senza chiave non è confrontabile: si conserva com'è,
        // perché scartarlo sarebbe di nuovo una perdita silenziosa.
        if(k === undefined || k === null || k === ''){ unkeyed.push(rec); kept++; return; }
        k = String(k);
        if(seen[k]) return;          // già presente da una versione più recente
        seen[k] = rec;
        kept++;
      });
    });
    return Object.keys(seen).map(function(k){ return seen[k]; }).concat(unkeyed);
  }

  /* Ogni famiglia: dove scrivere, da dove leggere (dalla più recente), e con
     quale campo si riconosce lo stesso record. */
  var FAMILIES = [
    { target:'lb2b_catalog_v33',      sources:['lb2b_catalog_v33','lb2b_catalog_v23','lb2b_catalog_v1'], key:'id' },
    { target:'lb2b_machines_v32',     sources:['lb2b_machines_v32','lb2b_machines_v1'],                  key:'id' },
    { target:'ingly_magazzino_v34',   sources:['ingly_magazzino_v34','ingly_warehouse_v1'],              key:'id' },
  ];

  var report = [];
  try{
    FAMILIES.forEach(function(f){
      var lists = f.sources.map(read).filter(Array.isArray);
      if(!lists.length) return;

      var before = read(f.target);
      var after  = merge(lists, f.key);

      // Un'unione non può restituire meno record della destinazione di partenza.
      if(Array.isArray(before) && after.length < before.length){
        console.warn('[v38] unione ignorata per', f.target, '— avrebbe ridotto', before.length, '→', after.length);
        return;
      }
      if(Array.isArray(before) && after.length === before.length) return;  // niente da recuperare

      // Copia di sicurezza before di scrivere: se qualcosa va storto, il dato
      // di partenza è ancora readbile.
      if(before) localStorage.setItem('_ckpt_' + f.target, JSON.stringify(before));
      localStorage.setItem(f.target, JSON.stringify(after));
      report.push(f.target + ': ' + ((before && before.length) || 0) + ' → ' + after.length);
    });

    /* La configurazione cloud non è un list: resta una copia, ma solo se la
       destinazione è vuota. */
    if(!read('ingly_gdrive_cfg')){
      var oldSync = read('ingly_cloud_sync_v1');
      if(oldSync && oldSync.clientId){
        localStorage.setItem('ingly_gdrive_cfg', JSON.stringify({ clientId: oldSync.clientId }));
        report.push('ingly_gdrive_cfg: ripristinata da ingly_cloud_sync_v1');
      }
    }

    localStorage.setItem(FLAG,'1');
    console.log('[v38] Consolidamento storage:', report.length ? report.join(' · ') : 'niente da unire');
  }catch(e){
    // Senza contrassegno: al prossimo avvio ci riprova invece di dare per
    // fatto un lavoro rimasto a metà.
    console.warn('[v38] Consolidamento storage interrotto:', e.message);
  }
})();

// ─── DASHBOARD PRO v37 (Enhanced) ───────────────────────────────
(function _dashboardV37(){
  function _p(){
    if(typeof DashboardPro==='undefined'){setTimeout(_p,700);return;}
    if(DashboardPro._v37enhanced) return; DashboardPro._v37enhanced=true;
    var _orig=DashboardPro.render.bind(DashboardPro);
    DashboardPro.render=function(){
      _orig();
      setTimeout(function(){
        var el=document.getElementById('view-dashboard');
        if(!el) return;
        // Inject v37 banner at top
        if(el.querySelector('#dash-v37-bar')) return;
        var bar=document.createElement('div'); bar.id='dash-v37-bar';
        bar.style.cssText='padding:10px 16px;background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(139,92,246,.06));border:1px solid rgba(99,102,241,.2);border-radius:12px;margin:0 0 12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px';
        // Prima nota summary
        var pn=window.PrimaNota&&window.PrimaNota.getMonthlySummary?window.PrimaNota.getMonthlySummary():{thisMon:0,lastMon:0,total:0,count:0};
        var delta=pn.lastMon>0?Math.round((pn.thisMon-pn.lastMon)/pn.lastMon*100):0;
        bar.innerHTML='<div style="display:flex;align-items:center;gap:10px">'
          +'<span style="font-size:18px">⚡</span>'
          +'<div><div style="font-size:13px;font-weight:800;color:var(--text)">Ingly OS v37 · Task Force Edition</div>'
          +'<div style="font-size:11px;color:var(--text-muted)">Prima Nota: €'+pn.thisMon.toFixed(0)+' questo mese'
          +(delta!==0?' <span style="color:'+(delta>0?'#22c55e':'#ef4444')+'">'+(delta>0?'▲':'▼')+Math.abs(delta)+'%</span>':'')
          +'</div></div></div>'
          +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
          +'<button onclick="OnboardingWizard.reset()" title="Riesegui setup" style="padding:5px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:10px;color:var(--text-muted)">🚀 Setup</button>'
          +'<button onclick="KeyboardShortcuts.showHelp()" title="Scorciatoie tastiera" style="padding:5px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:10px;color:var(--text-muted)">⌨️ Shortcuts</button>'
          +'<button onclick="GoogleDriveSync&&GoogleDriveSync.push()" title="Backup su Drive" style="padding:5px 10px;background:var(--bg-card);border:1px solid rgba(34,197,94,.3);border-radius:7px;cursor:pointer;font-size:10px;color:#22c55e">☁️ Backup</button>'
          +'</div>';
        var firstChild=el.querySelector('div');
        if(firstChild) el.insertBefore(bar,firstChild);
        else el.appendChild(bar);
      },400);
    };
  }
  setTimeout(_p,2000);
})();

// ─── LASER B2B — SYNC FIX (consolidate pricing calls) ────────────
(function _laserB2BSync(){
  function _p(){
    if(typeof LaserB2B==='undefined'||!LaserB2B._v32pro){setTimeout(_p,700);return;}
    if(LaserB2B._v37sync) return; LaserB2B._v37sync=true;
    // Ensure MagazzinoSync runs after each LaserB2B render
    var _origRender=LaserB2B.render.bind(LaserB2B);
    LaserB2B.render=function(){
      _origRender();
      setTimeout(function(){
        if(typeof MagazzinoSync!=='undefined') MagazzinoSync.syncToLaserB2B();
      },500);
    };
    console.log('[v37] LaserB2B+Magazzino sync on render');
  }
  setTimeout(_p,1200);
})();

// ─── SIDEBAR SMART COLLAPSE ──────────────────────────────────────
(function _sidebarV37(){
  function _p(){
    if(!document.getElementById('sidebar-inner')){setTimeout(_p,600);return;}
    if(window._v37sidebar) return; window._v37sidebar=true;
    // Collapse all non-essential nav groups on first load
    var ESSENTIAL=['ng-core','ng-main','ng-vendit','ng-laser','ng-clienti','ng-ordini','ng-mag'];
    setTimeout(function(){
      if(!localStorage.getItem('_v37sidebar_done')){
        // Collapse everything once
        document.querySelectorAll('.nav-group[id^="ng-"]').forEach(function(g){
          var id=g.id;
          var isEssential=ESSENTIAL.some(function(e){return id===e||id.includes(e.replace('ng-',''));});
          if(!isEssential&&typeof NavGroups!=='undefined') NavGroups.toggle&&NavGroups.toggle(id);
        });
        // Actually collapse ALL and let user expand
        if(typeof NavGroups!=='undefined') NavGroups.collapseAll&&NavGroups.collapseAll();
        localStorage.setItem('_v37sidebar_done','1');
      }
      // Add shortcut hint below search
      var searchBox=document.getElementById('sidebar-search');
      if(searchBox&&!searchBox.querySelector('.kbd-hint')){
        var hint=document.createElement('div'); hint.className='kbd-hint';
        hint.style.cssText='font-size:9px;color:var(--text-dim);padding:3px 0;text-align:center';
        hint.innerHTML='<span class="kbd">⌘K</span> cerca · <span class="kbd">⌘P</span> preventivo · <span class="kbd">⌘N</span> cliente';
        searchBox.appendChild(hint);
      }
    },1500);
  }
  setTimeout(_p,800);
})();

// ─── WA QUICK SEND FROM ANYWHERE ─────────────────────────────────
(function _globalWASend(){
  // Make phone numbers in any view clickable for WA
  function _makeClickable(){
    document.querySelectorAll('[data-phone]:not([data-wa-patched])').forEach(function(el){
      el.setAttribute('data-wa-patched','1');
      el.style.cursor='pointer';
      el.title='Click per WhatsApp';
      el.addEventListener('click',function(){
        var phone=(el.getAttribute('data-phone')||'').replace(/\D/g,'');
        if(phone) window.open('https://wa.me/'+phone,'_blank');
      });
    });
  }
  setInterval(_makeClickable,2000);
})();

// ─── MAGGAZZINO REORDER ALERT — improved ─────────────────────────
(function _improvedReorderAlert(){
  function _p(){
    if(typeof MagazzinoSync==='undefined'){setTimeout(_p,700);return;}
    if(MagazzinoSync._v37alert) return; MagazzinoSync._v37alert=true;
    // Expose to nav button
    var _orig=MagazzinoSync.checkReorderAlerts.bind(MagazzinoSync);
    MagazzinoSync.checkReorderAlerts=function(){
      _orig();
      // Also update today widget
      setTimeout(function(){
        if(typeof TodayWidget!=='undefined') TodayWidget.render&&TodayWidget.render();
      },200);
    };
  }
  setTimeout(_p,1500);
})();

// ─── QoL: Confirm on close / unsaved changes ─────────────────────
(function _unsavedChanges(){
  var _modified=false;
  var _origSet=localStorage.setItem.bind(localStorage);
  localStorage.setItem=function(k,v){
    _origSet(k,v);
    if(k.startsWith('ingly_')&&!k.includes('_v37')){
      _modified=true;
      clearTimeout(window._modifiedTimer);
      window._modifiedTimer=setTimeout(function(){_modified=false;},5000);
    }
  };
  window.addEventListener('beforeunload',function(e){
    if(_modified){
      e.preventDefault();
      e.returnValue='Dati non ancora salvati su Drive. Vuoi uscire?';
    }
  });
})();

// ─── STATISTICS — PRIMA NOTA SECTION ─────────────────────────────
(function _addPrimaNota(){
  function _p(){
    if(typeof App==='undefined'||!App.renderSection){setTimeout(_p,700);return;}
    if(App._v37pnRoute) return; App._v37pnRoute=true;
    var _orig=App.renderSection.bind(App);
    App.renderSection=async function(s){
      if(s==='prima_nota'){
        document.querySelectorAll('.section-view.active').forEach(function(v){v.classList.remove('active');});
        var el=document.getElementById('view-prima_nota');
        if(!el){
          el=document.createElement('div'); el.id='view-prima_nota'; el.className='section-view';
          var ci=document.getElementById('content-inner'); if(ci) ci.appendChild(el);
        }
        el.classList.add('active');
        _renderPrimaNota(el); return;
      }
      return _orig(s);
    };
  }

  function _renderPrimaNota(el){
    var records=PrimaNota.load();
    var months={}; var now=new Date();
    records.forEach(function(r){
      var m=r.date.slice(0,7); months[m]=(months[m]||0)+(r.tipo==='entrata'?r.importo:-r.importo);
    });
    var months12=[]; for(var i=11;i>=0;i--){var d=new Date(now.getFullYear(),now.getMonth()-i,1);months12.push({m:d.toISOString().slice(0,7),l:d.toLocaleDateString('it',{month:'short',year:'2-digit'})});}
    var maxVal=Math.max.apply(null,months12.map(function(m){return Math.abs(months[m.m]||0);})||[1])||1;
    var bars=months12.map(function(m){
      var v=months[m.m]||0; var h=Math.max(4,Math.round(Math.abs(v)/maxVal*70)); var isCur=m.m===now.toISOString().slice(0,7);
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">'
        +'<div style="font-size:8px;color:'+(isCur?'var(--primary)':'var(--text-dim)')+'">'+(v?'€'+Math.round(v):'')+'</div>'
        +'<div style="width:100%;height:'+h+'px;background:'+(v>0?'rgba(34,197,94,.6)':'rgba(239,68,68,.5)')+';border-radius:3px 3px 0 0;'+(isCur?'outline:1px solid var(--primary)':'')+'"></div>'
        +'<div style="font-size:7px;color:var(--text-dim)">'+m.l+'</div></div>';
    }).join('');
    var sum=(window.PrimaNota&&window.PrimaNota.getMonthlySummary)?window.PrimaNota.getMonthlySummary():{thisMon:0,lastMon:0,total:0,count:0};
    var rows=records.slice(0,30).map(function(r){
      var dt=new Date(r.date||Date.now()).toLocaleDateString('it',{day:'2-digit',month:'2-digit',year:'2-digit'});
      return '<tr style="border-bottom:1px solid rgba(255,255,255,.04)">'
        +'<td style="padding:7px 12px;font-size:10px;color:var(--text-dim)">'+dt+'</td>'
        +'<td style="padding:7px 12px;font-size:11px;color:var(--text)">'+( r.desc||'').slice(0,50)+'</td>'
        +'<td style="padding:7px 12px;font-size:11px;color:var(--text-muted)">'+( r.cliente||'—')+'</td>'
        +'<td style="padding:7px 12px;font-weight:800;color:'+(r.tipo==='entrata'?'#22c55e':'#ef4444')+'">'+( r.tipo==='entrata'?'+':'-')+'€'+r.importo.toFixed(2)+'</td>'
        +'</tr>';
    }).join('');
    el.innerHTML='<div style="padding:16px 20px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
      +'<div><div style="font-size:20px;font-weight:900;color:var(--text)">📒 Prima Nota</div>'
      +'<div style="font-size:11px;color:var(--text-muted)">'+records.length+' movimenti · Aggiornamento automatico da ordini</div></div>'
      +'<button onclick="PrimaNota.register(prompt(\'Cliente:\'),parseFloat(prompt(\'Importo:\'))||0,prompt(\'Descrizione:\'));App.renderSection(\'prima_nota\')" style="padding:8px 14px;background:linear-gradient(135deg,#22c55e,#059669);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">+ Entrata Manuale</button>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">'
      +[{l:'Questo mese',v:'€'+sum.thisMon.toFixed(0),c:'#10b981'},{l:'Mese scorso',v:'€'+sum.lastMon.toFixed(0),c:'#6366f1'},{l:'Totale anno',v:'€'+sum.total.toFixed(0),c:sum.total>=0?'#22c55e':'#ef4444'}].map(function(k){
        return '<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">'
          +'<div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">'+k.l+'</div>'
          +'<div style="font-size:20px;font-weight:900;color:'+k.c+'">'+k.v+'</div></div>';
      }).join('')
      +'</div>'
      +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px">'
      +'<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px">📊 Entrate ultimi 12 mesi</div>'
      +'<div style="display:flex;align-items:flex-end;gap:4px;height:80px;border-bottom:1px solid var(--border)">'+bars+'</div>'
      +'</div>'
      +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;overflow:hidden">'
      +'<table style="width:100%;border-collapse:collapse;font-size:12px">'
      +'<thead><tr style="background:var(--bg-card3)">'
      +'<th style="padding:8px 12px;text-align:left;font-size:9px;font-weight:700;color:var(--text-muted)">Data</th>'
      +'<th style="padding:8px 12px;text-align:left;font-size:9px;font-weight:700;color:var(--text-muted)">Descrizione</th>'
      +'<th style="padding:8px 12px;text-align:left;font-size:9px;font-weight:700;color:var(--text-muted)">Cliente</th>'
      +'<th style="padding:8px 12px;text-align:left;font-size:9px;font-weight:700;color:var(--text-muted)">Importo</th>'
      +'</tr></thead><tbody>'+(rows||'<tr><td colspan="4" style="padding:20px;text-align:center;color:var(--text-dim)">Nessun movimento · I pagamenti ordini vengono registrati automaticamente</td></tr>')+'</tbody></table></div>'
      +'</div>';
  }
  setTimeout(_p,1500);
})();

// ─── ADD PRIMA NOTA TO NAV ────────────────────────────────────────
(function _addPrimaNotaNav(){
  function _p(){
    if(!document.getElementById('core-nav')){setTimeout(_p,800);return;}
    if(document.querySelector('[data-section="prima_nota"]')) return;
    // Add to core nav as a replacement for one less-used button
    var coreNav=document.getElementById('core-nav');
    if(!coreNav) return;
    var newBtn=document.createElement('div');
    newBtn.className='cn-btn'; newBtn.title='Prima Nota';
    newBtn.setAttribute('onclick',"App.navigate('prima_nota')");
    newBtn.innerHTML='<span style="font-size:18px">📒</span><span>Prima Nota</span>';
    var grid=coreNav.querySelector('.cn-grid');
    if(grid) grid.appendChild(newBtn);
  }
  setTimeout(_p,2500);
})();

// ─── PERSIST TOPBAR STATUS ────────────────────────────────────────
(function _topbarStatus(){
  setTimeout(function(){
    var topbar=document.querySelector('.topbar, .header, #topbar');
    if(!topbar) return;
    if(topbar.querySelector('#topbar-status')) return;
    var s=document.createElement('div'); s.id='topbar-status';
    s.style.cssText='margin-left:auto;font-size:10px;color:var(--text-dim);display:flex;align-items:center;gap:8px';
    s.innerHTML='<span id="ts-save">✅ Pronto</span><span style="color:var(--border)">|</span>'
      +'<button onclick="KeyboardShortcuts.showHelp()" title="Scorciatoie" style="background:transparent;border:none;cursor:pointer;font-size:10px;color:var(--text-dim)">⌨️</button>'
      +'<button onclick="GoogleDriveSync&&GoogleDriveSync.push()" title="Backup Drive" style="background:transparent;border:none;cursor:pointer;font-size:11px;color:var(--text-dim)">☁️</button>';
    topbar.appendChild(s);
    // Update on save
    var _origSave=window._inglyLastSave;
    window._inglyLastSave=function(msg){
      if(_origSave) _origSave(msg);
      var ts=document.getElementById('ts-save');
      if(ts) ts.textContent='✅ '+new Date().toLocaleTimeString('it',{hour:'2-digit',minute:'2-digit'});
    };
  },2500);
})();

// ─── REMOVE ZOMBIE MODULES FROM SCOPE ────────────────────────────
(function _cleanZombies(){
  // Mark zombie modules as null to prevent accidental use
  var zombies=['InglyCloudSync','QuoteGenerator','lb2b_catalog_v1','lb2b_catalog_v23','Warehouse'];
  zombies.forEach(function(z){
    if(window[z]&&typeof window[z]==='object'&&!window[z]._v36gd&&z!=='Warehouse'){
      // Don't delete, just neutralize render methods on old duplicates
      if(window[z].render&&typeof window[z]._v1!=='undefined'){
        window[z].render=function(){
          if(typeof toast!=='undefined') toast('Modulo legacy rimosso in v37. Usa la versione aggiornata.','info');
        };
      }
    }
  });
  console.log('[v37] Zombie modules neutralized');
})();

// ─── HEALTH SCORE WIDGET in Topbar ───────────────────────────────
(function _healthScoreTopbar(){
  function _p(){
    if(typeof HealthScore==='undefined'){setTimeout(_p,800);return;}
    if(HealthScore._v37topbar) return; HealthScore._v37topbar=true;
    var _origCalc=HealthScore.calculate?.bind(HealthScore);
    if(!_origCalc) return;
    function _updateBadge(){
      try{
        var _r=_origCalc();
        // calculate() è async → gestisci Promise (altrimenti score.total è undefined → "⚡ undefined")
        var _apply=function(score){
          if(!score||score.total==null||isNaN(score.total)) return;
          var el=document.getElementById('hs-topbar-badge'); if(!el) return;
          var t=Math.round(score.total);
          var color=t>=70?'#22c55e':t>=40?'#f59e0b':'#ef4444';
          el.textContent='⚡ '+t; el.style.color=color;
        };
        if(_r&&typeof _r.then==='function') _r.then(_apply).catch(function(){});
        else _apply(_r);
      }catch(e){}
    }
    setTimeout(function(){
      var topbar=document.querySelector('.topbar,.header,#topbar');
      if(!topbar||topbar.querySelector('#hs-topbar-badge')) return;
      var badge=document.createElement('div'); badge.id='hs-topbar-badge';
      badge.style.cssText='font-size:11px;font-weight:800;cursor:pointer;padding:4px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px';
      badge.title='Health Score aziendale';
      badge.onclick=function(){if(typeof App!=='undefined') App.navigate('kpi');};
      var existingStatus=document.getElementById('topbar-status');
      if(existingStatus) existingStatus.insertBefore(badge,existingStatus.firstChild);
      else topbar.appendChild(badge);
      _updateBadge();
      setInterval(_updateBadge,30000);
    },3000);
  }
  setTimeout(_p,1000);
})();

console.log('[v37-P3] Storage migration · Dashboard · LaserB2B sync · Sidebar · Prima nota route · Zombies cleaned ✅');

