
/* ════════════════════════════════════════════════════════════════
   FASE 1 — NAVIGATION BUS
   Sostituisce i 21 override di App.navigate con un sistema
   a plugin registrabili. Ogni modulo registra i suoi hooks
   invece di sovrascrivere App.navigate.
   ════════════════════════════════════════════════════════════ */
(function installNavBus() {
  'use strict';

  /* ── NavBus: sistema di plugin per navigazione ─────────────── */
  window.NavBus = {
    _hooks: {},      // { section: [fn, fn, ...] }
    _global: [],     // fn chiamate su ogni navigate
    _after:  [],     // fn chiamate dopo ogni navigate

    /* Registra hook per sezione specifica */
    on: function(section, fn) {
      if (!this._hooks[section]) this._hooks[section] = [];
      this._hooks[section].push(fn);
    },

    /* Registra hook globale (ogni navigate) */
    onAny: function(fn) {
      this._global.push(fn);
    },

    /* Registra hook post-navigate */
    after: function(fn) {
      this._after.push(fn);
    },

    /* Esegui tutti i plugin per una sezione */
    _fire: function(section) {
      // Global hooks
      this._global.forEach(function(fn) {
        try { fn(section); } catch(e) { console.warn('[NavBus] global hook error:', e.message); }
      });
      // Section-specific hooks
      var hooks = this._hooks[section] || [];
      hooks.forEach(function(fn) {
        try { fn(section); } catch(e) { console.warn('[NavBus] hook error for', section, ':', e.message); }
      });
      // After hooks
      this._after.forEach(function(fn) {
        try { fn(section); } catch(e) { console.warn('[NavBus] after hook error:', e.message); }
      });
    }
  };

  /* ── Aspetta che App sia disponibile, poi installa il bus ─── */
  var _installed = false;
  function installBus() {
    if (_installed || typeof App === 'undefined' || typeof App.navigate !== 'function') return;
    _installed = true;

    var _coreNavigate = App.navigate.bind(App);

    /* Nuovo App.navigate: chiama core + NavBus, non si può più sovrascrivere */
    App.navigate = function(section) {
      _coreNavigate(section);
      NavBus._fire(section);
    };

    /* Rendi non-wrappabile (previene ulteriori override).
       IMPORTANTE: configurable:false è INTENZIONALE. Blocca i ~6 override
       tardivi (App.navigate=... dopo questa riga) facendoli fallire e restare
       inattivi — com'era in origine. NON metterlo a true: l'accessor successivo
       si installerebbe e riattiverebbe quegli override morti come handler
       NavBus eseguiti a ogni navigazione, causando un FREEZE con dati reali.
       L'errore console "Cannot assign to read only property navigate" è innocuo. */
    Object.defineProperty(App, 'navigate', {
      value: App.navigate,
      writable: false,
      configurable: false,
    });

    console.log('[Fase1] ✅ NavBus installed — App.navigate is now protected');
  }

  /* ── Migra i 21 override esistenti al NavBus ──────────────── */
  /* Tutti i moduli che facevano App.navigate = function(s){ ... }  */
  /* ora registrano i loro side-effects come NavBus.on() hooks     */

  // Hook: BDW init per intelligence modules
  NavBus.onAny(function(s) {
    var bdwSections = ['clientintel','growthengine','forecaster','decision','opportunity','intel','clients','orders'];
    if (bdwSections.indexOf(s) !== -1 && typeof BDW !== 'undefined') {
      BDW.init().catch(function(){});
    }
  });

  // Hook: sezioni specifiche con i loro init
  NavBus.on('clientintel',    function() { setTimeout(function(){ typeof ClientIntelligence !=='undefined' && ClientIntelligence._renderRFMStrip && ClientIntelligence._renderRFMStrip(); }, 200); });
  NavBus.on('growthengine',   function() { setTimeout(function(){ typeof GrowthEngine        !=='undefined' && GrowthEngine.render(); }, 150); });
  NavBus.on('forecaster',     function() { setTimeout(function(){ typeof FinancialForecaster !=='undefined' && FinancialForecaster.render(); }, 150); });
  NavBus.on('orders',         function() { setTimeout(function(){ typeof ProductionOptimizer !=='undefined' && ProductionOptimizer.render(); }, 300); });
  NavBus.on('listino',        function() { setTimeout(function(){ typeof ListinoTabs !=='undefined' && ListinoTabs.show && ListinoTabs.show('calc'); }, 100); });
  NavBus.on('sales',          function() { setTimeout(function(){ typeof QuickStats !=='undefined' && QuickStats.refresh && QuickStats.refresh(); }, 400); });
  NavBus.on('items',          function() { setTimeout(function(){ typeof ItemsMigration !=='undefined' && ItemsMigration.run && ItemsMigration.run(); }, 100); });
  NavBus.on('print3d',        function() {
    setTimeout(function() {
      if (typeof Print3DQuoter !== 'undefined') Print3DQuoter.render();
      /* Sync settings → 3D quoter */
      try {
        var s = JSON.parse(localStorage.getItem('ingly_settings_main') || '{}');
        if (s.laborCost) { var el = document.getElementById('p3d-lr'); if (el) el.value = s.laborCost; }
        if (s.kwhCost)   { var el = document.getElementById('p3d-kwh'); if (el) el.value = s.kwhCost; }
      } catch(e) {}
    }, 60);
  });
  NavBus.on('apparel',        function() { setTimeout(function(){ typeof ApparelQuoter !=='undefined' && ApparelQuoter.render(); }, 60); });
  NavBus.on('studio_ai',      function() { setTimeout(function(){ typeof AIStudio !=='undefined' && AIStudio.render(); }, 100); });
  NavBus.on('decision',       function() { setTimeout(function(){ typeof BDW !=='undefined' && BDW.init().then(function(){ typeof DecisionEngine !=='undefined' && DecisionEngine.render(); }); }, 100); });

  // Hook globale: chiudi sidebar su mobile dopo navigazione
  NavBus.onAny(function() {
    if (window.innerWidth <= 768) {
      var sb = document.getElementById('sidebar');
      var ov = document.getElementById('sidebar-overlay');
      if (sb) sb.classList.remove('mobile-open');
      if (ov) ov.classList.remove('visible');
      if (typeof App !== 'undefined') App.sidebarOpen = false;
    }
  });

  // Installa dopo che App è pronto
  var _tries = 0;
  var _t = setInterval(function() {
    installBus();
    _tries++;
    if (_installed || _tries > 40) clearInterval(_t);
  }, 100);

})();

/* ════════════════════════════════════════════════════════════════
   FASE 1 — MOBILE SIDEBAR OVERLAY
   ════════════════════════════════════════════════════════════ */
(function setupMobileSidebar() {
  document.addEventListener('DOMContentLoaded', function() {
    // Aggiungi overlay div per chiudere sidebar su mobile
    var overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.onclick = function() {
      var sb = document.getElementById('sidebar');
      if (sb) sb.classList.remove('mobile-open');
      overlay.classList.remove('visible');
      if (typeof App !== 'undefined') App.sidebarOpen = false;
    };
    document.body.appendChild(overlay);

    // Patch toggleSidebar per mobile
    var _origToggle = App && App.toggleSidebar && App.toggleSidebar.bind(App);
    if (_origToggle) {
      App.toggleSidebar = function() {
        if (window.innerWidth <= 768) {
          this.sidebarOpen = !this.sidebarOpen;
          var sb = document.getElementById('sidebar');
          var ov = document.getElementById('sidebar-overlay');
          if (sb) sb.classList.toggle('mobile-open', this.sidebarOpen);
          if (ov) ov.classList.toggle('visible', this.sidebarOpen);
        } else {
          _origToggle();
        }
      };
    }
  }, { once: true });
})();

/* ════════════════════════════════════════════════════════════════
   FASE 1 — SECTION ERROR BOUNDARY
   Wrappa renderSection per catturare errori senza crash
   ════════════════════════════════════════════════════════════ */
(function installErrorBoundary() {
  var _tries = 0;
  var _t = setInterval(function() {
    if (typeof App === 'undefined' || typeof App.renderSection !== 'function') {
      if (++_tries > 40) clearInterval(_t);
      return;
    }
    clearInterval(_t);

    var _coreRender = App.renderSection.bind(App);
    App.renderSection = async function(section) {
      try {
        await _coreRender(section);
      } catch(e) {
        console.error('[ErrorBoundary] Section', section, 'crashed:', e);
        var view = document.getElementById('view-' + section);
        if (view && !view.querySelector('.section-error')) {
          var errDiv = document.createElement('div');
          errDiv.className = 'section-error';
          errDiv.innerHTML = '<strong>⚠️ Errore nel caricamento di questa sezione</strong><br><small>' + e.message + '</small><br><button onclick="App.navigate(\''+section+'\')" style="margin-top:8px;padding:5px 12px;background:#ef444430;border:1px solid #ef444440;color:var(--red);border-radius:6px;cursor:pointer">🔄 Riprova</button>';
          view.prepend(errDiv);
        }
      }
    };
    console.log('[Fase1] ✅ Error boundary installed on renderSection');
  }, 200);
})();

/* ════════════════════════════════════════════════════════════════
   FASE 1 — DATA SYNC BUS
   Sincronizzazione automatica dati tra sezioni
   ════════════════════════════════════════════════════════════ */
(function installDataSync() {
  /* Debounce helper */
  function debounce(fn, ms) {
    var timer;
    return function() {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }

  /* Ogni volta che vendite/ordini cambiano → aggiorna KPI dashboard */
  if (typeof Bus !== 'undefined') {
    /* Aggiorna Health Score dopo ogni dato */
    Bus.on('sale:created',   debounce(function() { typeof HealthScore !== 'undefined' && HealthScore.update(); }, 1500));
    Bus.on('order:updated',  debounce(function() { typeof HealthScore !== 'undefined' && HealthScore.update(); }, 1500));
    Bus.on('data:updated',   debounce(function() { typeof HealthScore !== 'undefined' && HealthScore.update(); }, 2000));

    /* Aggiorna badge stock alert */
    Bus.on('inventory:changed', debounce(function() {
      typeof StockAlert !== 'undefined' && StockAlert.checkBadge && StockAlert.checkBadge();
    }, 800));

    /* Sync Gadgets 3D → Print3DQuoter quando magazzino cambia */
    Bus.on('gadgets:changed', debounce(function() {
      if (typeof InglySync !== 'undefined') InglySync.applySettings && InglySync.applySettings();
    }, 500));
  }

  console.log('[Fase1] ✅ Data sync bus active');
})();

/* ════════════════════════════════════════════════════════════════
   FASE 1 — PERFORMANCE: SECTION RENDER CACHE
   Evita re-render inutili su sezioni già caricate con dati statici
   ════════════════════════════════════════════════════════════ */
(function installRenderCache() {
  window.SectionCache = {
    _cache: {},
    _ttl: 30000, // 30 secondi

    isStale: function(section) {
      var entry = this._cache[section];
      if (!entry) return true;
      return (Date.now() - entry.ts) > this._ttl;
    },

    mark: function(section) {
      this._cache[section] = { ts: Date.now() };
    },

    invalidate: function(section) {
      if (section) {
        delete this._cache[section];
      } else {
        this._cache = {};
      }
    },

    /* Invalida tutte le sezioni finanziarie quando cambiano i dati */
    invalidateFinancial: function() {
      ['dashboard','kpi','finance','profitscope','cashflow','analytics','goals','forecaster'].forEach(function(s) {
        delete window.SectionCache._cache[s];
      });
    }
  };

  /* Invalida cache finanziaria su nuova vendita */
  if (typeof Bus !== 'undefined') {
    Bus.on('sale:created', function() { SectionCache.invalidateFinancial(); });
    Bus.on('order:updated', function() { SectionCache.invalidateFinancial(); });
  }

  console.log('[Fase1] ✅ Section render cache active');
})();

/* ════════════════════════════════════════════════════════════════
   FASE 1 — KEYBOARD SHORTCUTS
   ════════════════════════════════════════════════════════════ */
(function installShortcuts() {
  document.addEventListener('keydown', function(e) {
    /* Ignora se focus in input */
    if (['INPUT','TEXTAREA','SELECT'].indexOf(e.target.tagName) !== -1) return;

    /* Cmd/Ctrl + K → Command palette (se esiste) */
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (typeof CmdPalette !== 'undefined') CmdPalette.open && CmdPalette.open();
      return;
    }

    /* Escape → chiudi modali/sidebar mobile */
    if (e.key === 'Escape') {
      if (window.innerWidth <= 768) {
        var sb = document.getElementById('sidebar');
        var ov = document.getElementById('sidebar-overlay');
        if (sb) sb.classList.remove('mobile-open');
        if (ov) ov.classList.remove('visible');
      }
      return;
    }

    /* G + tasto → navigate shortcuts */
    if (window._lastKey === 'g') {
      var map = { d:'dashboard', s:'sales', o:'gestione_ordini', c:'clients', q:'quoter', l:'lasercalc', '3':'print3d', f:'finance' };
      if (map[e.key] && typeof App !== 'undefined') {
        App.navigate(map[e.key]);
        window._lastKey = null;
        return;
      }
    }
    window._lastKey = e.key;
    setTimeout(function() { window._lastKey = null; }, 800);
  });

  console.log('[Fase1] ✅ Keyboard shortcuts active (G+D=Dashboard, G+S=Sales, G+3=Print3D, G+Q=Quoter...)');
})();

/* ════════════════════════════════════════════════════════════════
   FASE 1 — HEALTH MONITOR
   Console report dello stato del sistema
   ════════════════════════════════════════════════════════════ */
(function healthMonitor() {
  setTimeout(function() {
    var checks = {
      'App.navigate':     typeof App !== 'undefined' && typeof App.navigate === 'function',
      'IDB':              typeof IDB !== 'undefined',
      'Bus':              typeof Bus !== 'undefined',
      'NavBus':           typeof NavBus !== 'undefined',
      'Print3DQuoter':    typeof Print3DQuoter !== 'undefined',
      'Dashboard':        typeof Dashboard !== 'undefined',
      'Sales':            typeof Sales !== 'undefined',
      'Gadgets':          typeof Gadgets !== 'undefined',
    };

    var ok = Object.values(checks).filter(Boolean).length;
    var total = Object.keys(checks).length;

    console.log('\n[INGLY OS Fase1] ═══════════════════════════');
    console.log('[INGLY OS Fase1] System Health: ' + ok + '/' + total + ' modules OK');
    Object.entries(checks).forEach(function(e) {
      console.log('[INGLY OS Fase1] ' + (e[1] ? '✅' : '❌') + ' ' + e[0]);
    });
    console.log('[INGLY OS Fase1] NavBus hooks registered:', Object.keys(NavBus._hooks).length + ' sections, ' + NavBus._global.length + ' global');
    console.log('[INGLY OS Fase1] ═══════════════════════════\n');
  }, 3500);
})();

console.log('[INGLY OS Fase1] 🚀 Stabilizzazione caricata — NavBus · ErrorBoundary · DataSync · Mobile · Shortcuts');
