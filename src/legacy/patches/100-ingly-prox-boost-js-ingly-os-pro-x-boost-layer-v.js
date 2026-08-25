
// ingly-prox-boost.js — INGLY OS PRO X · Boost Layer v3
// Unified dock bar + LaserCalc/Listino/Progetti enhancements
(function () {
  'use strict';
  if (window._inglyProXBoost) return;
  window._inglyProXBoost = true;

  /* ═══════════════════════════════════════════════════════
     DATI MACCHINE & MATERIALI
  ═══════════════════════════════════════════════════════ */
  var DEFAULT_MACHINES = {
    'laser-co2-80w-p3': { label: 'Laser CO2 80W P3', icon: '⚡', hourly: 0.18, energyH: 0.12, kw: 1.2, depr: 0.80, speedCut: 360, speedEngr: 10000 },
    'laser-co2-60w':    { label: 'Laser CO2 60W',     icon: '🔆', hourly: 0.14, energyH: 0.09, kw: 0.9, depr: 0.60, speedCut: 300, speedEngr: 9000  },
    'laser-fibra-20w':  { label: 'Laser Fibra 20W',   icon: '💫', hourly: 0.22, energyH: 0.05, kw: 0.5, depr: 1.20, speedCut: 500, speedEngr: 15000 },
    'laser-fibra-50w':  { label: 'Laser Fibra 50W',   icon: '✨', hourly: 0.28, energyH: 0.08, kw: 0.8, depr: 1.50, speedCut: 800, speedEngr: 20000 },
    'dtf-a3':           { label: 'Stampante DTF A3',  icon: '🖨️', hourly: 0.30, energyH: 0.15, kw: 1.5, depr: 1.00, speedCut: 0,   speedEngr: 0     },
    'sublimazione':     { label: 'Pressa Sub 38×38',  icon: '🎨', hourly: 0.10, energyH: 0.04, kw: 0.4, depr: 0.20, speedCut: 0,   speedEngr: 0     },
    'uv-a3':            { label: 'Stampante UV A3',   icon: '🌈', hourly: 0.35, energyH: 0.20, kw: 2.0, depr: 1.80, speedCut: 0,   speedEngr: 0     }
  };

  var DEFAULT_MATERIALS = [
    { name: 'MDF 3mm',           cost: 1.20, unit: 'pz', note: '30×20cm' },
    { name: 'MDF 6mm',           cost: 2.20, unit: 'pz', note: '30×20cm' },
    { name: 'Legno Betulla 4mm', cost: 3.50, unit: 'pz', note: '30×20cm' },
    { name: 'Acrilico 3mm',      cost: 4.50, unit: 'pz', note: '30×20cm' },
    { name: 'Pelle naturale',    cost: 8.00, unit: 'pz', note: '20×15cm' },
    { name: 'Acciaio inox',      cost: 5.00, unit: 'pz', note: '100×50mm' },
    { name: 'Alluminio 2mm',     cost: 3.80, unit: 'pz', note: '100×50mm' },
    { name: 'Carta/Cartone',     cost: 0.30, unit: 'pz', note: 'A4' },
    { name: 'T-shirt DTF',       cost: 4.50, unit: 'pz', note: 'bianca 180g' },
    { name: 'Tazza bianca',      cost: 1.80, unit: 'pz', note: '11oz' },
    { name: 'Ardesia 10×10',     cost: 2.50, unit: 'pz', note: 'sottopentola' },
    { name: 'Vinile adesivo',    cost: 0.80, unit: 'pz', note: '20×20cm' }
  ];

  if (typeof window.LaserB2B === 'undefined') window.LaserB2B = {};
  if (!window.LaserB2B._MACHINES || Object.keys(window.LaserB2B._MACHINES).length === 0) {
    window.LaserB2B._MACHINES = DEFAULT_MACHINES;
  }
  if (!window.LaserB2B._PRODUCTS || !window.LaserB2B._PRODUCTS.length) {
    window.LaserB2B._PRODUCTS = [];
  }
  window.PROX_DEFAULT_MACHINES = DEFAULT_MACHINES;
  window.PROX_DEFAULT_MATERIALS = DEFAULT_MATERIALS;

  /* ═══════════════════════════════════════════════════════
     CSS
  ═══════════════════════════════════════════════════════ */
  function injectBoostCSS() {
    if (document.getElementById('ingly-boost-css')) return;
    var s = document.createElement('style');
    s.id = 'ingly-boost-css';
    s.textContent = `
/* ── Remove legacy conflicting bars ── */
#v37cfinal-shortcuts,
.v35-shortcuts,
#prox-cmd-topbar-btn { display:none!important; }

/* ── Machine/Material presets ── */
.boost-preset-bar { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; }
.boost-preset-btn { padding:5px 11px; border-radius:20px; border:1px solid var(--border2); background:var(--bg-card2); color:var(--text-muted,#888); font-size:11px; cursor:pointer; transition:.15s; white-space:nowrap; }
.boost-preset-btn:hover,.boost-preset-btn.active { border-color:var(--primary-border); color:var(--primary); background:var(--primary-dim); }

.boost-batch-table { width:100%; border-collapse:collapse; font-size:12px; }
.boost-batch-table th { background:var(--bg-card2); padding:7px 12px; text-align:center; font-size:10px; color:var(--text-muted,#888); text-transform:uppercase; letter-spacing:.5px; }
.boost-batch-table td { padding:8px 12px; text-align:center; border-top:1px solid var(--border); }
.boost-batch-table tr:hover td { background:var(--bg-card2); }
.boost-batch-table .price-camp { color:#a78bfa; font-weight:700; }
.boost-batch-table .price-kit  { color:var(--primary); font-weight:700; }
.boost-batch-table .price-stock{ color:var(--green); font-weight:700; }

.boost-mat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-bottom:12px; }
.boost-mat-card { padding:7px 10px; border:1px solid var(--border); border-radius:8px; cursor:pointer; background:var(--bg-card2); transition:.15s; }
.boost-mat-card:hover { border-color:var(--primary-border); }
.boost-mat-card .mat-name { font-size:11px; font-weight:600; color:var(--text); }
.boost-mat-card .mat-cost { font-size:10px; color:var(--primary); font-weight:700; }
.boost-mat-card .mat-note { font-size:9px; color:var(--text-dim); }
@media(max-width:900px) { .boost-mat-grid { grid-template-columns:repeat(3,1fr); } }

.tier-bronze { background:#cd7f3220; color:#cd7f32; border:1px solid #cd7f3240; }
.tier-silver { background:#c0c0c020; color:#a0a0a0; border:1px solid #a0a0a040; }
.tier-gold   { background:#fbbf2420; color:#fbbf24; border:1px solid #fbbf2440; }
.tier-plat   { background:#7c3aed20; color:#a78bfa; border:1px solid #7c3aed40; }

/* ── Progetti progress ── */
.proj-progress-bar { height:4px; background:var(--border); border-radius:99px; overflow:hidden; margin-top:10px; }
.proj-progress-fill { height:100%; border-radius:99px; transition:.5s; }
.proj-priority-dot { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:4px; }
.proj-priority-high   { background:var(--red); }
.proj-priority-medium { background:var(--primary); }
.proj-priority-low    { background:var(--green); }

/* ═══════════════════════════════════════════════════
   UNIFIED DOCK BAR
═══════════════════════════════════════════════════ */
#prox-dock {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 9900;
  background: rgba(9,9,11,0.96);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 -8px 32px rgba(0,0,0,0.6);
  display: flex;
  align-items: stretch;
  height: 62px;
  padding: 0 8px;
  user-select: none;
}
#prox-dock-main {
  display: flex;
  align-items: stretch;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  gap: 2px;
  scrollbar-width: none;
}
#prox-dock-main::-webkit-scrollbar { display:none; }

.dock-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 10px;
  min-width: 60px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 10px;
  transition: background .15s, color .15s;
  flex-shrink: 0;
  color: rgba(229,229,229,0.55);
  position: relative;
}
.dock-btn:hover {
  background: rgba(255,255,255,0.06);
  color: #e5e5e5;
}
.dock-btn.dock-active {
  color: #fbbf24;
}
.dock-btn.dock-active::after {
  content: '';
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: #fbbf24;
  border-radius: 2px;
}
.dock-btn .dock-icon {
  font-size: 17px;
  line-height: 1;
}
.dock-btn .dock-label {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .4px;
  white-space: nowrap;
}

.dock-divider {
  width: 1px;
  background: rgba(255,255,255,0.07);
  margin: 10px 4px;
  flex-shrink: 0;
}

/* PRO X expand panel */
#prox-dock-expand {
  display: none;
  position: fixed;
  bottom: 62px;
  right: 8px;
  background: rgba(15,15,17,0.98);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 14px;
  padding: 10px 8px;
  z-index: 9901;
  box-shadow: 0 -4px 40px rgba(0,0,0,.8);
  min-width: 200px;
}
#prox-dock-expand.open { display:block; }
#prox-dock-expand .exp-title {
  font-size: 9px;
  font-weight: 700;
  color: rgba(251,191,36,.7);
  text-transform: uppercase;
  letter-spacing: .5px;
  padding: 2px 8px 8px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  margin-bottom: 6px;
}
.exp-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  color: rgba(229,229,229,.7);
  font-size: 12px;
  text-align: left;
  transition: background .12s, color .12s;
}
.exp-btn:hover { background:rgba(251,191,36,.1); color:#fbbf24; }
.exp-btn .exp-icon { font-size:15px; width:20px; text-align:center; }

/* Dock PRO badge */
.dock-pro-badge {
  font-size: 7px;
  font-weight: 800;
  background: linear-gradient(135deg,#fbbf24,#f59e0b);
  color: #09090b;
  padding: 1px 4px;
  border-radius: 4px;
  position: absolute;
  top: 6px;
  right: 6px;
  letter-spacing: .3px;
}

/* Push page content up so dock doesn't cover it */
#content-inner,
#app-main,
.app-content,
main { padding-bottom: 70px !important; }

@media(max-width:600px) {
  .dock-btn { min-width: 50px; padding: 0 6px; }
  .dock-btn .dock-label { font-size: 8px; }
  .dock-btn .dock-icon { font-size: 15px; }
}
`;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════════════════
     KILL LEGACY BARS
  ═══════════════════════════════════════════════════════ */
  function killLegacyBars() {
    ['v37cfinal-shortcuts', 'prox-qa-bar', 'prox-cmd-topbar-btn'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    document.querySelectorAll('.v35-shortcuts').forEach(function (el) { el.remove(); });
  }


  /* ═══════════════════════════════════════════════════════
     BOTTOM DOCK — Complete rebuild
  ═══════════════════════════════════════════════════════ */
  var DOCK_SECTIONS = [
    { icon: '⊞',  label: 'Dashboard',   nav: 'dashboard' },
    { icon: '📋', label: 'Ordini',       nav: 'gestione_ordini' },
    { icon: '👥', label: 'CRM',          nav: 'clients' },
    { icon: '📦', label: 'Magazzino',    nav: 'inventory' },
    { icon: '🧾', label: 'Preventivo',   action: 'ppm' },
    { icon: '⚡', label: 'Laser B2B',    nav: 'laser_b2b' },
    { icon: '🔢', label: 'Calcolatore',  nav: 'lasercalc' },
    { icon: '📑', label: 'Listino',      nav: 'listino' },
    { icon: '📁', label: 'Progetti',     nav: 'projects' },
    { icon: '🏭', label: 'Fornitori',    nav: 'suppliers' },
    { icon: '💰', label: 'Fatture',      nav: 'fiscal' },
    { icon: '📊', label: 'Statistiche',  nav: 'analytics' },
    { icon: '📅', label: 'Gantt',        nav: 'workflow_dashboard' },
    { icon: '☁️', label: 'Cloud',        nav: 'backup' },
    { icon: '🎨', label: 'Brand',        nav: 'brand_identity' },
    { icon: '⚙️', label: 'Impostazioni', nav: 'settings' },
  ];

  var DOCK_PROX = [
    { icon: '🧠', label: 'Command AI',    nav: 'prox-command' },
    { icon: '👤', label: 'CRM Pro',       nav: 'prox-crm' },
    { icon: '🏗️', label: 'Produzione',    nav: 'prox-production' },
    { icon: '📦', label: 'Stock AI',      nav: 'prox-stock' },
    { icon: '💼', label: 'Preventivi AI', nav: 'prox-quotes' },
    { icon: '📈', label: 'Analytics AI',  nav: 'prox-analytics' },
    { icon: '📣', label: 'Marketing',     nav: 'prox-marketing' },
    { icon: '🤖', label: 'AI Agents',     nav: 'prox-agents' },
    { icon: '⚡', label: 'Automazioni',   nav: 'prox-automations' },
    { icon: '🌍', label: 'Market Intel',  nav: 'prox-market-intel' },
  ];

  var DOCK_THEMES = [
    { key: 'default', swatch: '#fbbf24', label: 'Gold' },
    { key: 'blue',    swatch: '#60a5fa', label: 'Blu' },
    { key: 'purple',  swatch: '#a78bfa', label: 'Viola' },
    { key: 'green',   swatch: '#22c55e', label: 'Verde' },
    { key: 'red',     swatch: '#ef4444', label: 'Rosso' },
    { key: 'cyan',    swatch: '#22d3ee', label: 'Cyan' },
  ];

  function buildDock() {
    if (document.getElementById('prox-dock')) return;

    var FAV_KEY   = 'prox_favs_v2';
    var MODE_KEY  = 'prox_dock_mode';   // 'full' | 'icons' | 'hidden'
    var THEME_KEY = 'prox_theme_v2';

    var favs    = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    var mode    = localStorage.getItem(MODE_KEY) || 'full';
    var proxOpen = false;
    var themeOpen = false;
    var favMode  = false;

    /* ── Inject CSS ── */
    if (!document.getElementById('prox-dock-css')) {
      var css = document.createElement('style');
      css.id = 'prox-dock-css';
      css.textContent = `
/* ── Dock container ── */
#prox-dock-wrap {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 9800;
}
#prox-dock {
  background: rgba(10,10,12,0.97);
  backdrop-filter: blur(24px) saturate(180%);
  border-top: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 -4px 30px rgba(0,0,0,0.7);
  display: flex; align-items: stretch;
  height: 62px; padding: 0 6px;
  transition: height .2s, opacity .2s;
}
#prox-dock.dock-icons { height: 46px; }
#prox-dock.dock-icons .dock-label { display: none; }
#prox-dock.dock-icons .dock-btn { min-width: 40px; padding: 0 5px; }
#prox-dock.dock-hidden { opacity: 0; pointer-events: none; height: 0; border: none; }

/* ── Dock scroll area ── */
#prox-dock-scroll {
  flex: 1; display: flex; align-items: stretch; gap: 1px;
  overflow-x: auto; overflow-y: hidden; scrollbar-width: none;
}
#prox-dock-scroll::-webkit-scrollbar { display: none; }

/* ── Buttons ── */
.dock-btn {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; min-width: 58px; padding: 0 9px;
  border: none; background: transparent; cursor: pointer;
  color: rgba(161,161,170,0.75); border-radius: 8px;
  transition: background .13s, color .13s; flex-shrink: 0; position: relative;
}
.dock-btn:hover { background: rgba(255,255,255,0.06); color: #e5e5e5; }
.dock-btn.dock-active { color: #fbbf24; }
.dock-btn.dock-active::after {
  content: ''; position: absolute; bottom: 5px; left: 50%;
  transform: translateX(-50%); width: 18px; height: 2px;
  background: #fbbf24; border-radius: 2px;
}
.dock-btn.dock-fav-on { color: #fbbf24; }
.dock-icon { font-size: 16px; line-height: 1; }
.dock-label {
  font-size: 9px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .4px; white-space: nowrap;
}
/* Fav star indicator */
.dock-star {
  position: absolute; top: 3px; right: 3px; font-size: 8px;
  opacity: 0; color: #fbbf24; pointer-events: none;
  transition: opacity .12s;
}
.dock-btn:hover .dock-star { opacity: 0.6; }
.dock-btn.dock-fav-item .dock-star { opacity: 1; }

/* Hidden in fav mode */
#prox-dock.dock-fav-mode .dock-btn:not(.dock-fav-item):not(.dock-ctrl) { display: none; }
/* Always-visible divider */
.dock-sep { width: 1px; background: rgba(255,255,255,0.07); margin: 8px 3px; flex-shrink: 0; }

/* PRO X panel */
#prox-dock-prox {
  position: fixed; bottom: 66px; right: 8px; z-index: 9850;
  background: rgba(12,12,14,0.98); border: 1px solid rgba(255,255,255,0.13);
  border-radius: 14px; padding: 10px 8px; min-width: 210px;
  box-shadow: 0 -6px 40px rgba(0,0,0,0.85); display: none;
}
#prox-dock-prox.open { display: block; }
.prox-panel-title {
  font-size: 9px; font-weight: 700; color: rgba(251,191,36,.65);
  text-transform: uppercase; letter-spacing: .5px;
  padding: 0 6px 7px; border-bottom: 1px solid rgba(255,255,255,.06); margin-bottom: 6px;
}
.prox-item {
  display: flex; align-items: center; gap: 9px; width: 100%;
  padding: 8px 10px; border: none; background: transparent;
  cursor: pointer; border-radius: 8px; color: rgba(229,229,229,.65);
  font-size: 12px; text-align: left; transition: .12s;
}
.prox-item:hover { background: rgba(251,191,36,.1); color: #fbbf24; }
.prox-item-icon { font-size: 14px; width: 18px; text-align: center; }
.dock-pro-badge {
  font-size: 7px; font-weight: 800;
  background: linear-gradient(135deg,#fbbf24,#f59e0b);
  color: #09090b; padding: 1px 4px; border-radius: 3px;
  position: absolute; top: 5px; right: 4px;
}

/* Theme panel */
#prox-dock-theme {
  position: fixed; bottom: 66px; right: 8px; z-index: 9850;
  background: rgba(12,12,14,0.98); border: 1px solid rgba(255,255,255,0.13);
  border-radius: 14px; padding: 14px; min-width: 240px;
  box-shadow: 0 -6px 40px rgba(0,0,0,0.85); display: none;
}
#prox-dock-theme.open { display: block; }
.theme-swatches { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0 12px; }
.th-swatch {
  width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
  border: 2px solid transparent; transition: .15s; position: relative;
}
.th-swatch:hover { transform: scale(1.15); }
.th-swatch.on { border-color: #fff; }
.th-swatch.on::after {
  content: '✓'; position: absolute; inset: 0; display: flex;
  align-items: center; justify-content: center; font-size: 12px;
  font-weight: 900; color: #000;
}
.th-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #71717a; margin-bottom: 8px; }

/* Show-hide toggle button (always visible at bottom-right corner) */
#prox-dock-showtoggle {
  position: fixed; bottom: 4px; right: 4px; z-index: 9801;
  background: rgba(10,10,12,0.9); border: 1px solid rgba(255,255,255,.12);
  border-radius: 8px; padding: 4px 8px; cursor: pointer;
  font-size: 10px; color: #52525b; transition: .15s; display: none;
}
#prox-dock-showtoggle:hover { color: #fbbf24; border-color: rgba(251,191,36,.4); }

/* Sidebar toggle button injected into topbar */
#prox-sidebar-toggle {
  background: none; border: 1px solid rgba(255,255,255,.1); border-radius: 7px;
  color: rgba(161,161,170,.8); cursor: pointer; padding: 5px 9px; font-size: 13px;
  transition: .15s; display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600;
}
#prox-sidebar-toggle:hover { border-color: rgba(251,191,36,.4); color: #fbbf24; }

/* Push content up */
body.dock-full   #content-inner { padding-bottom: 76px !important; }
body.dock-icons  #content-inner { padding-bottom: 58px !important; }
body             #content-inner { padding-bottom: 76px; }

/* Hide conflicting elements from old patches */
#v37cfinal-shortcuts, .v35-shortcuts, #prox-qa-bar,
#prox-cmd-topbar-btn, #prox-dock-prox-btn { display: none !important; }
`;
      document.head.appendChild(css);
    }

    /* ── Sidebar toggle button ── */
    function addSidebarToggle() {
      if (document.getElementById('prox-sidebar-toggle')) return;
      var menuToggle = document.getElementById('menu-toggle');
      if (!menuToggle) return;
      var btn = document.createElement('button');
      btn.id = 'prox-sidebar-toggle';
      btn.title = 'Mostra/nascondi sidebar';
      btn.innerHTML = '☰ Menu';
      btn.addEventListener('click', function () {
        if (typeof App !== 'undefined') App.toggleSidebar();
      });
      menuToggle.parentNode.insertBefore(btn, menuToggle.nextSibling);
    }
    setTimeout(addSidebarToggle, 500);

    /* ── Build dock HTML ── */
    var wrap = document.createElement('div');
    wrap.id = 'prox-dock-wrap';

    var dock = document.createElement('div');
    dock.id = 'prox-dock';
    dock.className = mode === 'icons' ? 'dock-icons' : '';

    var scroll = document.createElement('div');
    scroll.id = 'prox-dock-scroll';

    /* Helper: make a dock button */
    function makeBtn(cfg, isCtrl) {
      var btn = document.createElement('button');
      btn.className = 'dock-btn' + (isCtrl ? ' dock-ctrl' : '');
      if (cfg.nav)    btn.dataset.nav = cfg.nav;
      if (cfg.id)     btn.id = cfg.id;
      btn.title = cfg.label;
      btn.innerHTML =
        '<span class="dock-icon">' + cfg.icon + '</span>' +
        '<span class="dock-label">' + cfg.label + '</span>' +
        (cfg.badge ? '<span class="dock-pro-badge">' + cfg.badge + '</span>' : '') +
        (cfg.nav && !isCtrl ? '<span class="dock-star">★</span>' : '');
      return btn;
    }

    /* Left controls */
    var ctrlWrap = document.createElement('div');
    ctrlWrap.style.cssText = 'display:flex;align-items:stretch;flex-shrink:0;margin-right:2px';

    // Sidebar toggle
    var sbBtn = makeBtn({ icon: '☰', label: 'Sidebar', id: 'dock-sb-btn' }, true);
    sbBtn.title = 'Comprimi/espandi sidebar';
    sbBtn.addEventListener('click', function () {
      if (typeof App !== 'undefined') App.toggleSidebar();
    });
    ctrlWrap.appendChild(sbBtn);

    // Fav toggle
    var favBtn = makeBtn({ icon: '⭐', label: 'Preferiti', id: 'dock-fav-btn' }, true);
    favBtn.addEventListener('click', function () {
      if (!favs.length) {
        typeof toast !== 'undefined' && toast('Tieni premuto un bottone per fissarlo nei preferiti', 'info', 3000);
        return;
      }
      favMode = !favMode;
      dock.classList.toggle('dock-fav-mode', favMode);
      favBtn.style.color = favMode ? '#fbbf24' : '';
      favBtn.querySelector('.dock-label').textContent = favMode ? 'Tutti' : 'Preferiti';
    });
    ctrlWrap.appendChild(favBtn);

    // Collapse toggle
    var colBtn = makeBtn({ icon: '▼', label: 'Comprimi', id: 'dock-col-btn' }, true);
    colBtn.addEventListener('click', function () {
      if (mode === 'full') {
        mode = 'icons';
        dock.classList.add('dock-icons');
        colBtn.querySelector('.dock-icon').textContent = '▲';
        colBtn.querySelector('.dock-label').textContent = 'Espandi';
      } else if (mode === 'icons') {
        mode = 'hidden';
        dock.classList.add('dock-hidden');
        document.getElementById('prox-dock-showtoggle').style.display = 'block';
        typeof toast !== 'undefined' && toast('Dock nascosta — clicca ▲ in basso a destra per riaprire', 'info', 3000);
      }
      localStorage.setItem(MODE_KEY, mode);
      document.body.className = document.body.className.replace(/dock-\S+/g, '').trim() + ' dock-' + (mode === 'hidden' ? 'icons' : mode);
    });
    ctrlWrap.appendChild(colBtn);

    if (mode === 'icons') {
      colBtn.querySelector('.dock-icon').textContent = '▲';
      colBtn.querySelector('.dock-label').textContent = 'Espandi';
    }

    var sep0 = document.createElement('div'); sep0.className = 'dock-sep';
    ctrlWrap.appendChild(sep0);
    scroll.appendChild(ctrlWrap);

    /* Section buttons */
    DOCK_SECTIONS.forEach(function (cfg) {
      var btn = makeBtn(cfg);
      var isFav = favs.includes(cfg.nav || cfg.action);
      if (isFav) btn.classList.add('dock-fav-item');

      // Long-press to fav
      var _pressTimer;
      btn.addEventListener('mousedown', function () {
        _pressTimer = setTimeout(function () {
          var key = cfg.nav || cfg.action;
          var idx = favs.indexOf(key);
          if (idx >= 0) { favs.splice(idx, 1); btn.classList.remove('dock-fav-item'); }
          else { favs.push(key); btn.classList.add('dock-fav-item'); }
          localStorage.setItem(FAV_KEY, JSON.stringify(favs));
          typeof toast !== 'undefined' && toast((favs.includes(key) ? '⭐ Aggiunto' : '☆ Rimosso') + ' dai preferiti', 'info', 1500);
        }, 700);
      });
      btn.addEventListener('mouseup', function () { clearTimeout(_pressTimer); });
      btn.addEventListener('mouseleave', function () { clearTimeout(_pressTimer); });

      btn.addEventListener('click', function () {
        if (cfg.action === 'ppm') {
          if (window._ppmOpen) window._ppmOpen();
          else if (typeof QuoteGeneratorV2 !== 'undefined') QuoteGeneratorV2.open();
          return;
        }
        if (cfg.nav && typeof App !== 'undefined') App.navigate(cfg.nav);
        updateActive(cfg.nav);
      });
      scroll.appendChild(btn);
    });

    /* Right controls: PRO X + Theme */
    var sep1 = document.createElement('div'); sep1.className = 'dock-sep'; sep1.style.marginLeft = '4px';
    scroll.appendChild(sep1);

    var proxBtn = makeBtn({ icon: '✦', label: 'PRO X', id: 'dock-prox-btn', badge: 'PRO' }, true);
    proxBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      proxOpen = !proxOpen;
      themeOpen = false;
      document.getElementById('prox-dock-prox').classList.toggle('open', proxOpen);
      document.getElementById('prox-dock-theme').classList.remove('open');
    });
    scroll.appendChild(proxBtn);

    var themeBtn = makeBtn({ icon: '🎨', label: 'Tema', id: 'dock-theme-btn' }, true);
    themeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      themeOpen = !themeOpen;
      proxOpen = false;
      document.getElementById('prox-dock-theme').classList.toggle('open', themeOpen);
      document.getElementById('prox-dock-prox').classList.remove('open');
    });
    scroll.appendChild(themeBtn);

    dock.appendChild(scroll);
    wrap.appendChild(dock);
    document.body.appendChild(wrap);

    /* ── PRO X panel ── */
    var proxPanel = document.createElement('div');
    proxPanel.id = 'prox-dock-prox';
    proxPanel.innerHTML = '<div class="prox-panel-title">✦ PRO X — Sezioni Avanzate</div>' +
      DOCK_PROX.map(function (item) {
        return '<button class="prox-item" data-nav="' + item.nav + '">' +
          '<span class="prox-item-icon">' + item.icon + '</span><span>' + item.label + '</span></button>';
      }).join('');
    proxPanel.addEventListener('click', function (e) {
      var btn = e.target.closest('.prox-item');
      if (!btn) return;
      App.navigate(btn.dataset.nav);
      proxPanel.classList.remove('open'); proxOpen = false;
    });
    document.body.appendChild(proxPanel);

    /* ── Theme panel ── */
    var themePanel = document.createElement('div');
    themePanel.id = 'prox-dock-theme';
    themePanel.innerHTML =
      '<div style="font-size:10px;font-weight:700;color:rgba(251,191,36,.65);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">🎨 Tema & Colori</div>' +
      '<div class="theme-swatches">' +
      DOCK_THEMES.map(function (t) {
        return '<div class="th-swatch' + (localStorage.getItem(THEME_KEY) === t.key ? ' on' : '') + '" style="background:' + t.swatch + '" data-theme="' + t.key + '" data-accent="' + t.swatch + '" title="' + t.label + '"></div>';
      }).join('') +
      '</div>' +
      '<div class="th-row">🎨 Colore custom: <input type="color" id="th-custom" value="#fbbf24" style="width:32px;height:24px;border:none;border-radius:4px;cursor:pointer;background:none;padding:0;margin-left:4px"> <span style="font-size:10px;color:#52525b">Personalizzato</span></div>' +
      '<div style="display:flex;gap:6px;margin-top:8px">' +
      '<button onclick="window._dockApplyTheme(\'default\')" style="flex:1;padding:6px;background:#161618;border:1px solid rgba(255,255,255,.1);border-radius:6px;color:#a1a1aa;cursor:pointer;font-size:11px">Reset</button>' +
      '<button onclick="document.getElementById(\'prox-dock-theme\').classList.remove(\'open\')" style="flex:1;padding:6px;background:#161618;border:1px solid rgba(255,255,255,.1);border-radius:6px;color:#a1a1aa;cursor:pointer;font-size:11px">Chiudi</button>' +
      '</div>';

    themePanel.querySelectorAll('.th-swatch').forEach(function (sw) {
      sw.addEventListener('click', function () { window._dockApplyTheme(sw.dataset.theme, sw.dataset.accent); });
    });
    document.getElementById && themePanel.querySelector && themePanel.querySelector('#th-custom') &&
      themePanel.querySelector('#th-custom').addEventListener('input', function () { window._dockApplyTheme('custom', this.value); });
    document.body.appendChild(themePanel);

    // Bind custom color after append
    setTimeout(function () {
      var cc = document.getElementById('th-custom');
      if (cc) cc.addEventListener('input', function () { window._dockApplyTheme('custom', this.value); });
    }, 200);

    /* ── Show/hide toggle ── */
    var showToggle = document.createElement('button');
    showToggle.id = 'prox-dock-showtoggle';
    showToggle.textContent = '▲ Dock';
    showToggle.title = 'Mostra barra di navigazione';
    if (mode === 'hidden') showToggle.style.display = 'block';
    showToggle.addEventListener('click', function () {
      mode = 'full';
      dock.classList.remove('dock-hidden', 'dock-icons');
      colBtn.querySelector('.dock-icon').textContent = '▼';
      colBtn.querySelector('.dock-label').textContent = 'Comprimi';
      showToggle.style.display = 'none';
      localStorage.setItem(MODE_KEY, 'full');
    });
    document.body.appendChild(showToggle);

    /* ── Close panels on outside click ── */
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#prox-dock-prox') && !e.target.closest('#dock-prox-btn')) {
        proxOpen = false; document.getElementById('prox-dock-prox').classList.remove('open');
      }
      if (!e.target.closest('#prox-dock-theme') && !e.target.closest('#dock-theme-btn')) {
        themeOpen = false; document.getElementById('prox-dock-theme').classList.remove('open');
      }
    });

    /* ── Active state sync ── */
    function updateActive(nav) {
      document.querySelectorAll('#prox-dock-scroll .dock-btn[data-nav]').forEach(function (b) {
        b.classList.toggle('dock-active', b.dataset.nav === nav);
      });
    }
    window._dockSetActive = updateActive;

    /* ── Apply theme ── */
    window._dockApplyTheme = function (key, color) {
      var THEME_ACCENTS = { blue: '#60a5fa', purple: '#a78bfa', green: '#22c55e', red: '#ef4444', cyan: '#22d3ee', default: '#fbbf24' };
      var accent = color || THEME_ACCENTS[key] || '#fbbf24';
      var root = document.documentElement;
      if (key === 'default') {
        ['--primary','--primary-dim','--primary-border'].forEach(function (p) { root.style.removeProperty(p); });
        localStorage.removeItem(THEME_KEY);
      } else {
        root.style.setProperty('--primary', accent);
        root.style.setProperty('--primary-dim', accent + '1a');
        root.style.setProperty('--primary-border', accent + '50');
        if (key !== 'custom') localStorage.setItem(THEME_KEY, key);
      }
      document.querySelectorAll('.th-swatch').forEach(function (sw) { sw.classList.toggle('on', sw.dataset.theme === key); });
    };

    // Restore theme
    var savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
      var THEME_ACCENTS2 = { blue: '#60a5fa', purple: '#a78bfa', green: '#22c55e', red: '#ef4444', cyan: '#22d3ee' };
      if (THEME_ACCENTS2[savedTheme]) window._dockApplyTheme(savedTheme);
    }

    // Hook navigate
    if (!window._proxDockNavHooked && typeof App !== 'undefined') {
      var _origNav = App.navigate;
      App.navigate = function (section) {
        var r = _origNav.apply(this, arguments);
        setTimeout(function () { updateActive(section); }, 100);
        return r;
      };
      window._proxDockNavHooked = true;
    }

    // Body class for content padding
    document.body.classList.add(mode === 'icons' ? 'dock-icons' : 'dock-full');

    setTimeout(function () { updateActive('dashboard'); }, 300);
  }


  /* ═══════════════════════════════════════════════════════
     DOCK EXT CSS  (extra styles injected after dock build)
  ═══════════════════════════════════════════════════════ */
  function injectDockExtCSS() {
    if (document.getElementById('prox-dock-ext-css')) return;
    var s = document.createElement('style');
    s.id = 'prox-dock-ext-css';
    s.textContent = `
/* Preventivo modal overlay */
#prox-prev-overlay {
  position: fixed; inset: 0; z-index: 19000;
  background: rgba(0,0,0,0.82); backdrop-filter: blur(6px);
  display: none; align-items: center; justify-content: center;
  padding: 16px;
}
#prox-prev-overlay.open { display: flex; }
#prox-prev-modal {
  background: #0f0f11; border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px; width: 100%; max-width: 920px; max-height: 90vh;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 24px 80px rgba(0,0,0,0.9);
}
.ppm-header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0; background: #0a0a0c;
}
.ppm-header h2 { flex:1; font-size:16px; font-weight:700; color:#e5e5e5; margin:0; }
.ppm-body { display: grid; grid-template-columns: 1fr 1fr; flex:1; overflow:hidden; }
@media(max-width:700px) { .ppm-body { grid-template-columns:1fr; } }
.ppm-left, .ppm-right {
  padding: 16px 18px; overflow-y: auto; scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}
.ppm-left { border-right: 1px solid rgba(255,255,255,0.06); }
.ppm-section-title {
  font-size: 9px; font-weight: 700; color: #71717a;
  text-transform: uppercase; letter-spacing: .5px; margin: 14px 0 8px;
}
.ppm-section-title:first-child { margin-top: 0; }
.ppm-field { margin-bottom: 10px; }
.ppm-field label { display:block; font-size:10px; color:#71717a; margin-bottom:4px; }
.ppm-field input, .ppm-field select, .ppm-field textarea {
  width: 100%; padding: 8px 10px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
  color: #e5e5e5; font-size: 12px; outline: none; box-sizing: border-box;
  transition: border-color .12s;
}
.ppm-field input:focus, .ppm-field select:focus, .ppm-field textarea:focus {
  border-color: rgba(251,191,36,0.4);
}
.ppm-field select option { background: #1a1a1c; }
.ppm-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ppm-catalog-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 6px; margin-bottom: 10px;
}
.ppm-cat-item {
  padding: 7px 8px; border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; cursor: pointer; background: rgba(255,255,255,0.02);
  transition: .12s; text-align: center;
}
.ppm-cat-item:hover { border-color: rgba(251,191,36,0.4); background: rgba(251,191,36,0.06); }
.ppm-cat-item .ci-name { font-size: 10px; font-weight: 600; color: #e5e5e5; }
.ppm-cat-item .ci-price { font-size: 11px; font-weight: 700; color: #fbbf24; }
.ppm-rows-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.ppm-rows-table th { padding: 6px 8px; text-align: left; font-size: 9px; color: #52525b; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.06); }
.ppm-rows-table td { padding: 6px 4px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
.ppm-rows-table input { width: 100%; padding: 4px 6px; border-radius:5px; border:1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.04); color:#e5e5e5; font-size:11px; }
.ppm-totals { background: rgba(255,255,255,0.03); border-radius: 10px; padding: 12px 14px; margin-top: 12px; }
.ppm-tot-row { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; color: #a1a1aa; }
.ppm-tot-row.grand { font-size: 15px; font-weight: 800; color: #fbbf24; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 4px; }
.ppm-footer {
  padding: 12px 18px; border-top: 1px solid rgba(255,255,255,0.08);
  display: flex; gap: 8px; flex-shrink: 0; background: #0a0a0c; flex-wrap: wrap;
}
.ppm-btn {
  padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer;
  font-size: 12px; font-weight: 600; transition: .12s;
}
.ppm-btn-primary { background: #fbbf24; color: #09090b; }
.ppm-btn-primary:hover { background: #f59e0b; }
.ppm-btn-secondary { background: rgba(255,255,255,0.06); color: #a1a1aa; border: 1px solid rgba(255,255,255,0.1); }
.ppm-btn-secondary:hover { background: rgba(255,255,255,0.1); color: #e5e5e5; }
.ppm-btn-danger { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
.ppm-autocomplete {
  position: absolute; top: 100%; left: 0; right: 0;
  background: #161618; border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px; z-index: 100; max-height: 160px; overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0,0,0,.7);
}
.ppm-autocomplete .ac-item {
  padding: 8px 12px; cursor: pointer; font-size: 12px; color: #e5e5e5;
  border-bottom: 1px solid rgba(255,255,255,.04);
}
.ppm-autocomplete .ac-item:hover { background: rgba(251,191,36,.08); color: #fbbf24; }
.ppm-field-wrap { position: relative; }

/* ACCESSO RAPIDO — hideable */
#core-nav {
  transition: max-height .3s ease, opacity .3s ease;
  overflow: hidden;
}
#core-nav.cn-hidden { max-height: 0 !important; opacity: 0; pointer-events: none; }
#prox-cn-toggle {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 14px 4px; cursor: pointer; user-select: none;
}
#prox-cn-toggle:hover .cn-toggle-icon { color: #fbbf24; }
.cn-toggle-icon { font-size: 12px; color: #52525b; transition: .15s; }
#prox-cn-showhide {
  font-size: 10px; padding: 3px 10px; border-radius: 20px;
  border: 1px solid rgba(255,255,255,.1); background: transparent;
  color: #52525b; cursor: pointer; margin: 0 12px 8px;
  transition: .12s; width: calc(100% - 24px);
}
#prox-cn-showhide:hover { border-color: rgba(251,191,36,.35); color: #fbbf24; }
`;
    document.head.appendChild(s);
  }

  /* upgradeDock: patch nav hooks after App is available */
  function upgradeDock() {
    if (window._proxDockNavHooked) return;
    if (typeof App === 'undefined' || !App.navigate) return;
    var _orig = App.navigate;
    App.navigate = function (section) {
      var r = _orig.apply(this, arguments);
      if (window._dockSetActive) window._dockSetActive(section);
      return r;
    };
    window._proxDockNavHooked = true;
  }

  /* ═══════════════════════════════════════════════════════
     PATCH #core-nav: Preventivo → in-page modal + hideable
  ═══════════════════════════════════════════════════════ */
  function patchCoreNav() {
    function _patch() {
      var cn = document.getElementById('core-nav');
      if (!cn) return false;
      if (cn._proxPatched) return true;
      cn._proxPatched = true;

      /* 1. Patch Preventivo button onclick */
      cn.querySelectorAll('button, [onclick]').forEach(function (el) {
        var oc = el.getAttribute('onclick') || '';
        if (oc.includes('QuoteGenerator') || oc.includes('Preventivo') || oc.toLowerCase().includes('quot')) {
          el.setAttribute('onclick', '');
          el.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            if (window._ppmOpen) window._ppmOpen();
          });
        }
      });
      /* Also cover click delegation on inner links/divs */
      cn.addEventListener('click', function (e) {
        var btn = e.target.closest('[onclick]') || e.target.closest('button');
        if (!btn) return;
        var oc = btn.getAttribute('onclick') || btn.dataset.action || '';
        if (oc.includes('QuoteGenerator') && !btn._proxFixed) {
          e.preventDefault(); e.stopPropagation();
          if (window._ppmOpen) window._ppmOpen();
        }
      }, true);

      /* 2. Wrap the header div to add show/hide toggle */
      var header = cn.querySelector('div:first-child');
      var gridWrap = cn.querySelector('.cn-grid');

      /* Insert hide button below header */
      var hideBtn = document.createElement('button');
      hideBtn.id = 'prox-cn-showhide';
      hideBtn.textContent = '▲ Nascondi Accesso Rapido';
      var hidden = localStorage.getItem('prox_cn_hidden') === '1';
      if (hidden) {
        hideBtn.textContent = '▼ Mostra Accesso Rapido';
        if (gridWrap) gridWrap.style.display = 'none';
      }
      hideBtn.addEventListener('click', function () {
        var isHidden = gridWrap && gridWrap.style.display === 'none';
        if (gridWrap) gridWrap.style.display = isHidden ? '' : 'none';
        hideBtn.textContent = isHidden ? '▲ Nascondi Accesso Rapido' : '▼ Mostra Accesso Rapido';
        localStorage.setItem('prox_cn_hidden', isHidden ? '0' : '1');
      });

      if (header) {
        cn.insertBefore(hideBtn, header.nextSibling);
      } else {
        cn.insertBefore(hideBtn, cn.firstChild);
      }

      return true;
    }

    if (!_patch()) {
      var obs = new MutationObserver(function () {
        if (_patch()) obs.disconnect();
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { obs.disconnect(); }, 15000);
    }
  }

  /* ═══════════════════════════════════════════════════════
     PREVENTIVO RAPIDO — Full in-page modal
  ═══════════════════════════════════════════════════════ */
  function buildPreventivoModal() {
    if (document.getElementById('prox-prev-overlay')) return;

    /* ── CSS extra for new voce builder ── */
    if (!document.getElementById('ppm-extra-css')) {
      var xcs = document.createElement('style');
      xcs.id = 'ppm-extra-css';
      xcs.textContent = `
#ppm-type-tabs { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px; }
.ppm-type-tab {
  padding:5px 10px; border-radius:20px; border:1px solid rgba(255,255,255,.1);
  background:transparent; color:#71717a; cursor:pointer; font-size:10px;
  font-weight:600; transition:.12s; white-space:nowrap;
}
.ppm-type-tab:hover { border-color:rgba(251,191,36,.3); color:#e5e5e5; }
.ppm-type-tab.active { background:rgba(251,191,36,.12); border-color:rgba(251,191,36,.45); color:#fbbf24; }
#ppm-mat-picker { display:flex; flex-wrap:wrap; gap:4px; margin:6px 0 10px; }
.ppm-mat-chip {
  padding:4px 9px; border-radius:14px; border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.03); color:#a1a1aa; cursor:pointer;
  font-size:10px; transition:.12s;
}
.ppm-mat-chip:hover { border-color:rgba(251,191,36,.35); color:#fbbf24; }
.ppm-rows-table .row-type-badge {
  font-size:8px; font-weight:700; padding:2px 5px; border-radius:4px;
  text-transform:uppercase; letter-spacing:.3px; display:inline-block;
}
.rtb-prodotto  { background:rgba(96,165,250,.15);  color:#60a5fa; }
.rtb-materiale { background:rgba(180,120,60,.15);   color:#cd7f32; }
.rtb-laser     { background:rgba(251,191,36,.15);   color:#fbbf24; }
.rtb-dtf       { background:rgba(167,139,250,.15);  color:#a78bfa; }
.rtb-sub       { background:rgba(34,211,238,.15);   color:#22d3ee; }
.rtb-manodopera{ background:rgba(34,197,94,.15);    color:#22c55e; }
.rtb-spedizione{ background:rgba(249,115,22,.15);   color:#f97316; }
.rtb-sconto    { background:rgba(239,68,68,.15);    color:#ef4444; }
.rtb-altro     { background:rgba(113,113,122,.15);  color:#71717a; }
.ppm-voce-builder-box {
  background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.08);
  border-radius:10px; padding:12px; margin-top:4px;
}
.ppm-grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
@media(max-width:480px){.ppm-grid3{grid-template-columns:1fr 1fr;}}
.ppm-cat-item .ci-cat { font-size:8px; color:#52525b; text-transform:uppercase; letter-spacing:.3px; margin-bottom:2px; }
`;
      document.head.appendChild(xcs);
    }

    /* ── Catalog data ── */
    var BUILTIN_PRODUCTS = [
      /* Laser */
      { name: 'Targhetta MDF 10×5',      price: 8,    unit: 'pz', cat: 'Laser' },
      { name: 'Targhetta Acrilica 10×5', price: 12,   unit: 'pz', cat: 'Laser' },
      { name: 'Portachiavi legno',        price: 5,    unit: 'pz', cat: 'Laser' },
      { name: 'Targa porta ufficio',      price: 18,   unit: 'pz', cat: 'Laser' },
      { name: 'Cornice incisa 20×30',     price: 24,   unit: 'pz', cat: 'Laser' },
      { name: 'Righello personalizzato',  price: 6,    unit: 'pz', cat: 'Laser' },
      /* DTF */
      { name: 'T-shirt DTF A4',           price: 15,   unit: 'pz', cat: 'DTF' },
      { name: 'T-shirt DTF A3',           price: 20,   unit: 'pz', cat: 'DTF' },
      { name: 'Felpa DTF A4',             price: 28,   unit: 'pz', cat: 'DTF' },
      { name: 'Borsa tote DTF A4',        price: 12,   unit: 'pz', cat: 'DTF' },
      /* Sub */
      { name: 'Tazza sublim. 11oz',       price: 9,    unit: 'pz', cat: 'Sub' },
      { name: 'Cuscino sublim. 40×40',    price: 12,   unit: 'pz', cat: 'Sub' },
      { name: 'Mousepad sublim.',         price: 8,    unit: 'pz', cat: 'Sub' },
      { name: 'Ardesia sublim. 10×10',    price: 7,    unit: 'pz', cat: 'Sub' },
      /* UV */
      { name: 'Pannello UV 30×20',        price: 22,   unit: 'pz', cat: 'UV' },
      { name: 'Bottiglia UV 500ml',       price: 18,   unit: 'pz', cat: 'UV' },
      /* Gadget */
      { name: 'Tazza manico colorato',    price: 11,   unit: 'pz', cat: 'Gadget' },
      { name: 'Portachiavi metallo',      price: 4,    unit: 'pz', cat: 'Gadget' },
      { name: 'Calamita frigo 7×5',       price: 3,    unit: 'pz', cat: 'Gadget' },
      { name: 'Puzzle 20 pz',             price: 8,    unit: 'pz', cat: 'Gadget' },
      { name: 'Cornice portafoto',        price: 9,    unit: 'pz', cat: 'Gadget' },
      { name: 'Portapenne acrilico',      price: 7,    unit: 'pz', cat: 'Gadget' },
      { name: 'Pin spilla personalizzato',price: 2.5,  unit: 'pz', cat: 'Gadget' },
      { name: 'Tote bag cotone',          price: 6,    unit: 'pz', cat: 'Gadget' },
      { name: 'Notebook copertina',       price: 14,   unit: 'pz', cat: 'Gadget' },
      { name: 'Penna personalizzata',     price: 2,    unit: 'pz', cat: 'Gadget' },
      /* Print */
      { name: 'Biglietti da visita',      price: 0.3,  unit: 'pz', cat: 'Print' },
      { name: 'Volantino A5',             price: 0.15, unit: 'pz', cat: 'Print' },
      { name: 'Locandina A4',             price: 0.5,  unit: 'pz', cat: 'Print' },
    ];

    var VOCE_TYPES = [
      { id: 'prodotto',   icon: '📦', label: 'Prodotto',    color: '#60a5fa', um: 'pz',  defPrice: 0    },
      { id: 'materiale',  icon: '🪵', label: 'Materiale',   color: '#cd7f32', um: 'pz',  defPrice: 0    },
      { id: 'laser',      icon: '⚡', label: 'Laser',       color: '#fbbf24', um: 'h',   defPrice: 0    },
      { id: 'dtf',        icon: '🖨️', label: 'DTF',        color: '#a78bfa', um: 'pz',  defPrice: 8    },
      { id: 'sub',        icon: '🎨', label: 'Sub',         color: '#22d3ee', um: 'pz',  defPrice: 5    },
      { id: 'manodopera', icon: '🔧', label: 'Manodopera',  color: '#22c55e', um: 'h',   defPrice: 35   },
      { id: 'spedizione', icon: '🚚', label: 'Spedizione',  color: '#f97316', um: 'pz',  defPrice: 8    },
      { id: 'sconto',     icon: '🏷️', label: 'Sconto',     color: '#ef4444', um: '%',   defPrice: -5   },
      { id: 'altro',      icon: '✏️', label: 'Altro',       color: '#71717a', um: 'pz',  defPrice: 0    },
    ];

    var rows = [];
    var currentClient = null;
    var activeVoceType = 'prodotto';

    /* ── Build overlay ── */
    var overlay = document.createElement('div');
    overlay.id = 'prox-prev-overlay';

    var modal = document.createElement('div');
    modal.id = 'prox-prev-modal';

    modal.innerHTML = '<div class="ppm-header">' +
      '<span style="font-size:20px">🧾</span>' +
      '<h2>Preventivo Rapido</h2>' +
      '<span id="ppm-draft-info" style="font-size:10px;color:#52525b;flex:1;margin-left:8px"></span>' +
      '<button class="ppm-btn ppm-btn-secondary" id="ppm-close-btn">✕ Chiudi</button>' +
      '</div>' +
      '<div class="ppm-body">' +
      '<div class="ppm-left">' +

      /* Cliente */
      '<div class="ppm-section-title">👤 Cliente</div>' +
      '<div class="ppm-field"><label>Nome cliente</label>' +
      '<div class="ppm-field-wrap">' +
      '<input type="text" id="ppm-client-input" placeholder="Cerca o inserisci cliente..." autocomplete="off">' +
      '<div class="ppm-autocomplete" id="ppm-client-ac" style="display:none"></div>' +
      '</div></div>' +
      '<div class="ppm-grid2">' +
      '<div class="ppm-field"><label>Email</label><input type="email" id="ppm-client-email" placeholder="email@esempio.it"></div>' +
      '<div class="ppm-field"><label>Telefono</label><input type="tel" id="ppm-client-phone" placeholder="+39 000 0000000"></div>' +
      '</div>' +

      /* Impostazioni */
      '<div class="ppm-section-title">⚙️ Impostazioni</div>' +
      '<div class="ppm-grid2">' +
      '<div class="ppm-field"><label>Macchina</label><select id="ppm-machine-sel"></select></div>' +
      '<div class="ppm-field"><label>Canale vendita</label><select id="ppm-channel-sel">' +
      '<option value="diretto">Diretto</option><option value="b2b">B2B</option>' +
      '<option value="online">Online</option><option value="marketplace">Marketplace</option>' +
      '<option value="fiera">Fiera</option></select></div>' +
      '<div class="ppm-field"><label>€/ora lavorazione</label><input type="number" id="ppm-hourly" value="35" min="0" step="0.5"></div>' +
      '<div class="ppm-field"><label>Imballaggio (€)</label><input type="number" id="ppm-pack" value="2" min="0" step="0.5"></div>' +
      '</div>' +

      /* Catalogo */
      '<div class="ppm-section-title">📦 Catalogo</div>' +
      '<div style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap" id="ppm-cat-filters">' +
      '<button class="pfb-filter-btn active" data-cat="*">Tutti</button>' +
      '<button class="pfb-filter-btn" data-cat="Laser">⚡ Laser</button>' +
      '<button class="pfb-filter-btn" data-cat="DTF">🖨️ DTF</button>' +
      '<button class="pfb-filter-btn" data-cat="Sub">🎨 Sub</button>' +
      '<button class="pfb-filter-btn" data-cat="UV">🌈 UV</button>' +
      '<button class="pfb-filter-btn" data-cat="Gadget">🎁 Gadget</button>' +
      '<button class="pfb-filter-btn" data-cat="Print">📄 Print</button>' +
      '</div>' +
      '<div class="ppm-catalog-grid" id="ppm-catalog"></div>' +

      /* Aggiungi Voce */
      '<div class="ppm-section-title">➕ Aggiungi Voce</div>' +
      '<div class="ppm-voce-builder-box">' +
      '<div id="ppm-type-tabs">' +
      VOCE_TYPES.map(function (t) {
        return '<button class="ppm-type-tab' + (t.id === 'prodotto' ? ' active' : '') + '" data-type="' + t.id + '">' + t.icon + ' ' + t.label + '</button>';
      }).join('') +
      '</div>' +
      '<div id="ppm-mat-picker" style="display:none"></div>' +
      '<div class="ppm-grid3">' +
      '<div class="ppm-field" style="grid-column:1/-1"><label>Descrizione</label>' +
      '<input type="text" id="ppm-custom-desc" placeholder="Descrizione voce..."></div>' +
      '<div class="ppm-field"><label>€ Unitario</label><input type="number" id="ppm-custom-price" value="0" min="0" step="0.01"></div>' +
      '<div class="ppm-field"><label>Qtà</label><input type="number" id="ppm-custom-qty" value="1" min="1" step="1"></div>' +
      '<div class="ppm-field"><label>U.M.</label><input type="text" id="ppm-custom-um" value="pz" style="text-transform:lowercase"></div>' +
      '</div>' +
      '<button class="ppm-btn ppm-btn-primary" id="ppm-add-custom" style="width:100%;margin-top:8px">➕ Aggiungi alla Lista</button>' +
      '</div>' +

      '</div>' + /* /ppm-left */

      '<div class="ppm-right">' +
      '<div class="ppm-section-title">📋 Righe Preventivo</div>' +
      '<div style="overflow-x:auto"><table class="ppm-rows-table">' +
      '<thead><tr>' +
      '<th style="min-width:40px">Tipo</th>' +
      '<th style="min-width:120px">Descrizione</th>' +
      '<th style="width:44px">Qtà</th>' +
      '<th style="width:60px">U.M.</th>' +
      '<th style="width:70px">€ Unit.</th>' +
      '<th style="width:70px">Totale</th>' +
      '<th style="width:28px"></th>' +
      '</tr></thead>' +
      '<tbody id="ppm-rows-body"></tbody>' +
      '</table></div>' +

      '<div class="ppm-totals" id="ppm-totals">' +
      '<div class="ppm-tot-row"><span>Subtotale</span><span id="ppm-sub">€0,00</span></div>' +
      '<div class="ppm-tot-row"><span>Sconti</span><span id="ppm-disc" style="color:#ef4444">€0,00</span></div>' +
      '<div class="ppm-tot-row"><span>IVA 22%</span><span id="ppm-iva">€0,00</span></div>' +
      '<div class="ppm-tot-row"><span>Imballaggio</span><span id="ppm-pack-tot">€0,00</span></div>' +
      '<div class="ppm-tot-row grand"><span>TOTALE</span><span id="ppm-grand">€0,00</span></div>' +
      '</div>' +

      '<div class="ppm-section-title" style="margin-top:14px">📝 Note</div>' +
      '<div class="ppm-field"><textarea id="ppm-notes" rows="3" placeholder="Note per il cliente, tempi di consegna..." style="resize:vertical"></textarea></div>' +
      '<div class="ppm-section-title">💾 Stato</div>' +
      '<div class="ppm-field"><select id="ppm-status">' +
      '<option value="bozza">📝 Bozza</option>' +
      '<option value="inviato">📤 Inviato</option>' +
      '<option value="accettato">✅ Accettato</option>' +
      '<option value="rifiutato">❌ Rifiutato</option>' +
      '</select></div>' +

      '</div>' + /* /ppm-right */
      '</div>' + /* /ppm-body */

      '<div class="ppm-footer">' +
      '<button class="ppm-btn ppm-btn-primary" id="ppm-save-btn">💾 Salva</button>' +
      '<button class="ppm-btn ppm-btn-secondary" id="ppm-pdf-btn">🖨️ Stampa/PDF</button>' +
      '<button class="ppm-btn ppm-btn-secondary" id="ppm-email-btn">📧 Email</button>' +
      '<button class="ppm-btn ppm-btn-secondary" id="ppm-new-btn">📄 Nuovo</button>' +
      '<button class="ppm-btn ppm-btn-danger" id="ppm-clear-btn" style="margin-left:auto">🗑️ Svuota</button>' +
      '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    /* shortcuts to modal elements */
    function q(id) { return modal.querySelector('#' + id); }

    /* ── Machine select ── */
    var machineSel = q('ppm-machine-sel');
    Object.keys(DEFAULT_MACHINES).forEach(function (k) {
      var m = DEFAULT_MACHINES[k];
      var opt = document.createElement('option');
      opt.value = k;
      opt.textContent = m.icon + ' ' + m.label;
      machineSel.appendChild(opt);
    });

    /* ── Catalog ── */
    var catFilter = '*';

    function getAllProducts() {
      var prods = [];
      /* Try multiple storage keys */
      ['lb2b_products_v1', 'ingly_products', 'prox_catalog', 'ingly_listino'].forEach(function (key) {
        try {
          var d = JSON.parse(localStorage.getItem(key) || 'null');
          if (Array.isArray(d)) prods = prods.concat(d);
          else if (d && Array.isArray(d.items)) prods = prods.concat(d.items);
        } catch (e) {}
      });
      /* Merge with builtins (avoid duplicates by name) */
      var names = prods.map(function (p) { return (p.name || p.nome || '').toLowerCase(); });
      BUILTIN_PRODUCTS.forEach(function (p) {
        if (!names.includes(p.name.toLowerCase())) prods.push(p);
      });
      return prods;
    }

    function renderCatalog() {
      var all = getAllProducts();
      var filtered = catFilter === '*' ? all : all.filter(function (p) {
        return (p.cat || p.category || p.categoria || '') === catFilter;
      });
      var grid = q('ppm-catalog');
      if (!grid) return;
      if (!filtered.length) {
        grid.innerHTML = '<div style="color:#3f3f46;font-size:11px;padding:8px 0">Nessun prodotto in questa categoria</div>';
        return;
      }
      grid.innerHTML = filtered.map(function (p) {
        var nm = p.name || p.nome || '';
        var pr = +(p.price || p.prezzo || 0);
        var cat = p.cat || p.category || p.categoria || '';
        return '<div class="ppm-cat-item" data-name="' + nm.replace(/"/g, '&quot;') +
          '" data-price="' + pr + '" data-cat="' + cat + '">' +
          '<div class="ci-cat">' + cat + '</div>' +
          '<div class="ci-name">' + nm + '</div>' +
          '<div class="ci-price">€' + pr.toFixed(2) + '</div>' +
          '</div>';
      }).join('');
    }
    renderCatalog();

    q('ppm-cat-filters').addEventListener('click', function (e) {
      var btn = e.target.closest('.pfb-filter-btn');
      if (!btn) return;
      catFilter = btn.dataset.cat;
      modal.querySelectorAll('#ppm-cat-filters .pfb-filter-btn').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      renderCatalog();
    });

    q('ppm-catalog').addEventListener('click', function (e) {
      var item = e.target.closest('.ppm-cat-item');
      if (!item) return;
      addRow({
        type: 'prodotto',
        name: item.dataset.name,
        qty: 1, um: 'pz',
        price: parseFloat(item.dataset.price) || 0
      });
    });

    /* ── Voce type tabs ── */
    function setVoceType(typeId) {
      activeVoceType = typeId;
      modal.querySelectorAll('.ppm-type-tab').forEach(function (b) {
        b.classList.toggle('active', b.dataset.type === typeId);
      });
      var matPicker = q('ppm-mat-picker');
      var descEl   = q('ppm-custom-desc');
      var priceEl  = q('ppm-custom-price');
      var umEl     = q('ppm-custom-um');
      var vt = VOCE_TYPES.find(function (t) { return t.id === typeId; }) || VOCE_TYPES[0];

      matPicker.style.display = 'none';
      matPicker.innerHTML = '';

      if (typeId === 'materiale') {
        /* Show material chips */
        matPicker.style.display = 'flex';
        DEFAULT_MATERIALS.forEach(function (m) {
          var chip = document.createElement('span');
          chip.className = 'ppm-mat-chip';
          chip.textContent = m.name + ' €' + m.cost.toFixed(2);
          chip.addEventListener('click', function () {
            descEl.value = m.name + ' (' + m.note + ')';
            priceEl.value = m.cost;
            umEl.value = m.unit;
          });
          matPicker.appendChild(chip);
        });
        descEl.value = '';
        priceEl.value = 0;
        umEl.value = 'pz';
      } else if (typeId === 'laser') {
        var mKey = machineSel.value;
        var mData = DEFAULT_MACHINES[mKey] || {};
        descEl.value = 'Lavorazione Laser — ' + (mData.label || 'Laser');
        priceEl.value = parseFloat(q('ppm-hourly').value) || 35;
        umEl.value = 'h';
      } else if (typeId === 'dtf') {
        descEl.value = 'Stampa DTF A4';
        priceEl.value = 8;
        umEl.value = 'pz';
      } else if (typeId === 'sub') {
        descEl.value = 'Sublimazione';
        priceEl.value = 5;
        umEl.value = 'pz';
      } else if (typeId === 'manodopera') {
        descEl.value = 'Manodopera';
        priceEl.value = parseFloat(q('ppm-hourly').value) || 35;
        umEl.value = 'h';
      } else if (typeId === 'spedizione') {
        descEl.value = 'Spedizione standard';
        priceEl.value = 8;
        umEl.value = 'pz';
      } else if (typeId === 'sconto') {
        descEl.value = 'Sconto';
        priceEl.value = -5;
        umEl.value = '%';
      } else {
        descEl.value = '';
        priceEl.value = vt.defPrice || 0;
        umEl.value = vt.um || 'pz';
      }
    }

    q('ppm-type-tabs').addEventListener('click', function (e) {
      var btn = e.target.closest('.ppm-type-tab');
      if (btn) setVoceType(btn.dataset.type);
    });

    /* ── Rows ── */
    function addRow(r) {
      rows.push({
        type:  r.type  || 'prodotto',
        name:  r.name  || '',
        qty:   r.qty   || 1,
        um:    r.um    || 'pz',
        price: r.price || 0
      });
      renderRows();
    }

    function getTypeMeta(typeId) {
      return VOCE_TYPES.find(function (t) { return t.id === typeId; }) || { icon: '•', label: typeId, color: '#71717a' };
    }

    function renderRows() {
      var tbody = q('ppm-rows-body');
      if (!tbody) return;
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#3f3f46;padding:20px;font-size:11px">Nessuna riga — scegli dal catalogo o aggiungi una voce</td></tr>';
        updateTotals();
        return;
      }
      tbody.innerHTML = rows.map(function (r, i) {
        var vt = getTypeMeta(r.type);
        var tot = (r.qty * r.price);
        var totStr = (r.type === 'sconto' ? '-' : '') + '€' + Math.abs(tot).toFixed(2);
        var totColor = r.type === 'sconto' ? '#ef4444' : '#fbbf24';
        var nm = (r.name || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        return '<tr>' +
          '<td><span class="row-type-badge rtb-' + r.type + '">' + vt.icon + '</span></td>' +
          '<td><input value="' + nm + '" data-row="' + i + '" data-field="name" style="min-width:100px"></td>' +
          '<td><input type="number" value="' + r.qty + '" min="0.01" step="0.01" data-row="' + i + '" data-field="qty" style="width:44px"></td>' +
          '<td><input value="' + (r.um || 'pz') + '" data-row="' + i + '" data-field="um" style="width:36px;text-transform:lowercase"></td>' +
          '<td><input type="number" value="' + r.price + '" step="0.01" data-row="' + i + '" data-field="price" style="width:66px"></td>' +
          '<td style="color:' + totColor + ';font-weight:700;text-align:right;white-space:nowrap">' + totStr + '</td>' +
          '<td><button style="background:none;border:none;cursor:pointer;color:#52525b;font-size:13px;padding:2px 4px" data-del="' + i + '" title="Rimuovi">✕</button></td>' +
          '</tr>';
      }).join('');
      updateTotals();
    }

    q('ppm-rows-body').addEventListener('input', function (e) {
      var inp = e.target;
      var i = +inp.dataset.row;
      var field = inp.dataset.field;
      if (!field || isNaN(i) || i >= rows.length) return;
      if (field === 'name')  rows[i].name  = inp.value;
      else if (field === 'qty')   rows[i].qty   = +inp.value || 0;
      else if (field === 'um')    rows[i].um    = inp.value;
      else if (field === 'price') rows[i].price = +inp.value;
      updateTotals();
    });

    q('ppm-rows-body').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-del]');
      if (!btn) return;
      rows.splice(+btn.dataset.del, 1);
      renderRows();
    });

    function updateTotals() {
      var sub = 0, disc = 0;
      rows.forEach(function (r) {
        var val = r.qty * r.price;
        if (r.type === 'sconto') disc += Math.abs(val);
        else sub += val;
      });
      var net = Math.max(0, sub - disc);
      var pack = parseFloat(q('ppm-pack') ? q('ppm-pack').value : 0) || 0;
      var iva = net * 0.22;
      var grand = net + iva + pack;
      var fmt = function (n) { return '€' + n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
      if (q('ppm-sub'))      q('ppm-sub').textContent      = fmt(sub);
      if (q('ppm-disc'))     q('ppm-disc').textContent     = disc > 0 ? '-' + fmt(disc) : fmt(0);
      if (q('ppm-iva'))      q('ppm-iva').textContent      = fmt(iva);
      if (q('ppm-pack-tot')) q('ppm-pack-tot').textContent = fmt(pack);
      if (q('ppm-grand'))    q('ppm-grand').textContent    = fmt(grand);
    }

    q('ppm-pack').addEventListener('input', updateTotals);

    /* ── Add custom row ── */
    q('ppm-add-custom').addEventListener('click', function () {
      var desc  = q('ppm-custom-desc').value.trim();
      var price = parseFloat(q('ppm-custom-price').value);
      var qty   = parseFloat(q('ppm-custom-qty').value)  || 1;
      var um    = q('ppm-custom-um').value.trim()         || 'pz';
      if (!desc) {
        q('ppm-custom-desc').focus();
        q('ppm-custom-desc').style.borderColor = 'rgba(239,68,68,0.6)';
        setTimeout(function () { q('ppm-custom-desc').style.borderColor = ''; }, 1500);
        return;
      }
      addRow({ type: activeVoceType, name: desc, qty: qty, um: um, price: isNaN(price) ? 0 : price });
      /* Reset fields but keep type active */
      q('ppm-custom-desc').value  = '';
      q('ppm-custom-price').value = '0';
      q('ppm-custom-qty').value   = '1';
    });

    /* ── Client autocomplete ── */
    function getClients() {
      var clients = [];
      ['ingly_clients', 'ingly_crm_v1'].forEach(function (key) {
        try {
          var data = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(data)) clients = clients.concat(data);
          else if (data && data.clients) clients = clients.concat(data.clients);
        } catch (e) {}
      });
      return clients;
    }

    var clientInput = q('ppm-client-input');
    var clientAC    = q('ppm-client-ac');

    clientInput.addEventListener('input', function () {
      var val = this.value;
      var qry = val.toLowerCase().trim();
      clientAC.innerHTML = '';
      if (!qry) { clientAC.style.display = 'none'; return; }
      var matches = getClients().filter(function (c) {
        return (c.name || c.nome || c.ragioneSociale || c.company || '').toLowerCase().includes(qry);
      }).slice(0, 8);
      if (!matches.length) { clientAC.style.display = 'none'; return; }
      matches.forEach(function (c) {
        var name = c.name || c.nome || c.ragioneSociale || c.company || 'Cliente';
        var div = document.createElement('div');
        div.className = 'ac-item';
        div.textContent = name + (c.email ? ' — ' + c.email : '');
        div.addEventListener('mousedown', function (e) {
          e.preventDefault(); /* prevent blur before click */
          clientInput.value = name;
          q('ppm-client-email').value = c.email || '';
          q('ppm-client-phone').value = c.phone || c.telefono || '';
          currentClient = c;
          clientAC.style.display = 'none';
        });
        clientAC.appendChild(div);
      });
      clientAC.style.display = 'block';
    });

    clientInput.addEventListener('blur', function () {
      setTimeout(function () { clientAC.style.display = 'none'; }, 200);
    });

    /* ── Save ── */
    q('ppm-save-btn').addEventListener('click', function () {
      if (!rows.length) {
        typeof toast !== 'undefined' && toast('⚠️ Aggiungi almeno una riga prima di salvare', 'warning', 3000);
        return;
      }
      var sub = rows.filter(function (r) { return r.type !== 'sconto'; })
                    .reduce(function (s, r) { return s + r.qty * r.price; }, 0);
      var disc = rows.filter(function (r) { return r.type === 'sconto'; })
                     .reduce(function (s, r) { return s + Math.abs(r.qty * r.price); }, 0);
      var pack  = parseFloat(q('ppm-pack').value) || 0;
      var net   = Math.max(0, sub - disc);
      var grand = net * 1.22 + pack;
      var quote = {
        id: 'Q' + Date.now(),
        date: new Date().toISOString(),
        client:   q('ppm-client-input').value || 'Cliente',
        email:    q('ppm-client-email').value,
        phone:    q('ppm-client-phone').value,
        machine:  q('ppm-machine-sel').value,
        channel:  q('ppm-channel-sel').value,
        hourly:   q('ppm-hourly').value,
        pack:     pack,
        rows:     rows.slice(),
        notes:    q('ppm-notes').value,
        status:   q('ppm-status').value,
        subtotal: sub, discount: disc, iva: net * 0.22, total: grand
      };
      var quotes = [];
      try { quotes = JSON.parse(localStorage.getItem('ingly_quotes') || '[]'); } catch (e) {}
      quotes.push(quote);
      localStorage.setItem('ingly_quotes', JSON.stringify(quotes));
      typeof toast !== 'undefined' && toast('✅ Preventivo ' + quote.id + ' salvato!', 'success', 3000);
      q('ppm-draft-info').textContent = '✓ ' + quote.id + ' — ' + new Date().toLocaleDateString('it-IT');
    });

    /* ── Clear / New ── */
    function clearForm() {
      rows = [];
      renderRows();
      ['ppm-client-input','ppm-client-email','ppm-client-phone','ppm-notes'].forEach(function (id) {
        var el = q(id); if (el) el.value = '';
      });
      q('ppm-status').value = 'bozza';
      q('ppm-pack').value   = '2';
      q('ppm-draft-info').textContent = '';
      currentClient = null;
      setVoceType('prodotto');
    }
    q('ppm-clear-btn').addEventListener('click', function () {
      if (confirm('Svuotare il preventivo?')) clearForm();
    });
    q('ppm-new-btn').addEventListener('click', clearForm);

    /* ── Print/PDF ── */
    q('ppm-pdf-btn').addEventListener('click', function () {
      var client = q('ppm-client-input').value || 'Cliente';
      var sub = 0, disc = 0;
      rows.forEach(function (r) {
        if (r.type === 'sconto') disc += Math.abs(r.qty * r.price);
        else sub += r.qty * r.price;
      });
      var net = Math.max(0, sub - disc);
      var pack = parseFloat(q('ppm-pack').value) || 0;
      var iva  = net * 0.22;
      var grand = net + iva + pack;
      var fmt = function (n) { return '€' + n.toLocaleString('it-IT', { minimumFractionDigits: 2 }); };
      var typeLabel = { prodotto:'Prodotto', materiale:'Materiale', laser:'Laser', dtf:'DTF',
        sub:'Sub', manodopera:'Manodopera', spedizione:'Spedizione', sconto:'Sconto', altro:'Altro' };
      var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preventivo ' + client + '</title>' +
        '<style>@media print{body{margin:0}}body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px}' +
        'h1{font-size:22px;margin-bottom:4px}h2{font-size:15px;color:#555;margin:0 0 20px}' +
        'table{width:100%;border-collapse:collapse;margin-top:16px}' +
        'th{background:#f0f0f0;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.4px}' +
        'td{padding:8px 10px;border-bottom:1px solid #eee;font-size:12px}' +
        '.type{font-size:10px;color:#888;font-weight:600;text-transform:uppercase}' +
        '.amt{text-align:right;font-weight:600}.disc{color:#c00}' +
        'tfoot td{font-weight:700;border-top:2px solid #ccc;background:#fafafa}' +
        '.grand{font-size:16px;color:#111}.note{margin-top:20px;font-size:12px;color:#555;border-top:1px solid #eee;padding-top:12px}' +
        '</style></head><body>' +
        '<h1>Preventivo</h1><h2>' + new Date().toLocaleDateString('it-IT', { day:'2-digit', month:'long', year:'numeric' }) + '</h2>' +
        '<p><strong>Cliente:</strong> ' + client +
        (q('ppm-client-email').value ? '<br><strong>Email:</strong> ' + q('ppm-client-email').value : '') +
        (q('ppm-client-phone').value ? '<br><strong>Tel:</strong> '   + q('ppm-client-phone').value : '') + '</p>' +
        '<table><thead><tr><th>Tipo</th><th>Descrizione</th><th>Qtà</th><th>U.M.</th><th style="text-align:right">€ Unit.</th><th style="text-align:right">Totale</th></tr></thead><tbody>' +
        rows.map(function (r) {
          var tot = r.qty * r.price;
          var isDisc = r.type === 'sconto';
          return '<tr>' +
            '<td class="type">' + (typeLabel[r.type] || r.type) + '</td>' +
            '<td>' + (r.name || '') + '</td>' +
            '<td>' + r.qty + '</td>' +
            '<td>' + (r.um || 'pz') + '</td>' +
            '<td class="amt' + (isDisc ? ' disc' : '') + '">' + fmt(r.price) + '</td>' +
            '<td class="amt' + (isDisc ? ' disc' : '') + '">' + (isDisc ? '-' : '') + fmt(Math.abs(tot)) + '</td>' +
            '</tr>';
        }).join('') +
        '</tbody><tfoot>' +
        '<tr><td colspan="5">Subtotale</td><td class="amt">' + fmt(sub) + '</td></tr>' +
        (disc > 0 ? '<tr><td colspan="5">Sconti</td><td class="amt disc">-' + fmt(disc) + '</td></tr>' : '') +
        '<tr><td colspan="5">IVA 22%</td><td class="amt">' + fmt(iva) + '</td></tr>' +
        (pack > 0 ? '<tr><td colspan="5">Imballaggio</td><td class="amt">' + fmt(pack) + '</td></tr>' : '') +
        '<tr><td colspan="5" class="grand">TOTALE</td><td class="amt grand">' + fmt(grand) + '</td></tr>' +
        '</tfoot></table>' +
        (q('ppm-notes').value ? '<div class="note"><strong>Note:</strong> ' + q('ppm-notes').value + '</div>' : '') +
        '</body></html>';
      var w = window.open('', '_blank', 'width=780,height=900');
      if (w) { w.document.write(html); w.document.close(); setTimeout(function () { w.print(); }, 400); }
    });

    /* ── Email ── */
    q('ppm-email-btn').addEventListener('click', function () {
      var email  = q('ppm-client-email').value;
      var client = q('ppm-client-input').value  || 'Cliente';
      var sub = 0, disc = 0;
      rows.forEach(function (r) {
        if (r.type === 'sconto') disc += Math.abs(r.qty * r.price);
        else sub += r.qty * r.price;
      });
      var grand = Math.max(0, sub - disc) * 1.22 + (parseFloat(q('ppm-pack').value) || 0);
      var lines = rows.map(function (r) { return '• ' + r.qty + ' ' + (r.um||'pz') + ' × ' + r.name + ' = €' + (r.qty*r.price).toFixed(2); }).join('\n');
      var body = 'Gentile ' + client + ',\n\nIn allegato il preventivo richiesto.\n\nDettaglio:\n' + lines +
        '\n\nTOTALE: €' + grand.toFixed(2) + ' (IVA 22% inclusa)\n\nCordiali saluti';
      window.location.href = 'mailto:' + encodeURIComponent(email) +
        '?subject=' + encodeURIComponent('Preventivo del ' + new Date().toLocaleDateString('it-IT')) +
        '&body=' + encodeURIComponent(body);
    });

    /* ── Close ── */
    q('ppm-close-btn').addEventListener('click', function () { overlay.classList.remove('open'); });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('open');
    });

    /* ── Public API ── */
    window._ppmOpen = function (opts) {
      opts = opts || {};
      overlay.classList.add('open');
      renderCatalog();
      renderRows();
      if (opts.client) q('ppm-client-input').value = opts.client;
      setVoceType(activeVoceType);
    };

    renderRows();
  }

  /* ═══════════════════════════════════════════════════════
     PATCH QuoteGeneratorV2 → in-page modal
  ═══════════════════════════════════════════════════════ */
  function patchQuoteGeneratorV2() {
    function _patch() {
      if (typeof window.QuoteGeneratorV2 !== 'undefined') {
        var _origOpen = QuoteGeneratorV2.open;
        QuoteGeneratorV2.open = function () {
          if (window._ppmOpen) { window._ppmOpen(); return; }
          if (_origOpen) _origOpen.apply(this, arguments);
        };
        return true;
      }
      return false;
    }
    if (!_patch()) {
      var t = setInterval(function () { if (_patch()) clearInterval(t); }, 500);
      setTimeout(function () { clearInterval(t); }, 15000);
    }
  }

  /* ═══════════════════════════════════════════════════════
     LASER CALC — preset bar
  ═══════════════════════════════════════════════════════ */
  function enhanceLaserCalc() {
    var section = document.getElementById('view-lasercalc');
    if (!section || section._boostCalc) return;

    function _tryCalc(attempts) {
      attempts = attempts || 0;
      if (attempts > 20) return;
      var hasSel = section.querySelector('select[id*="machine"], select[id*="laser"], select');
      if (!hasSel) { setTimeout(function () { _tryCalc(attempts + 1); }, 500); return; }
      if (section._boostCalc) return;
      section._boostCalc = true;

      /* Machine preset bar */
      if (!document.getElementById('boost-calc-presets')) {
        var bar = document.createElement('div');
        bar.id = 'boost-calc-presets';
        bar.className = 'boost-preset-bar';
        bar.style.cssText = 'padding:10px 16px 0;';
        Object.keys(DEFAULT_MACHINES).forEach(function (k) {
          var m = DEFAULT_MACHINES[k];
          var btn = document.createElement('button');
          btn.className = 'boost-preset-btn';
          btn.textContent = m.icon + ' ' + m.label;
          btn.addEventListener('click', function () {
            document.querySelectorAll('#boost-calc-presets .boost-preset-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var sel = section.querySelector('select');
            if (sel) {
              for (var i = 0; i < sel.options.length; i++) {
                if (sel.options[i].value === k || sel.options[i].text.toLowerCase().includes(m.label.toLowerCase().slice(0, 8))) {
                  sel.selectedIndex = i;
                  sel.dispatchEvent(new Event('change'));
                  break;
                }
              }
            }
          });
          bar.appendChild(btn);
        });
        section.insertBefore(bar, section.firstChild);
      }
    }
    _tryCalc();
  }

  /* ═══════════════════════════════════════════════════════
     LISTINO — tier badges
  ═══════════════════════════════════════════════════════ */
  function enhanceListino() {
    var section = document.getElementById('view-listino');
    if (!section || section._boostListino) return;

    function _tryListino(attempts) {
      attempts = attempts || 0;
      if (attempts > 20) return;
      var hasContent = section.querySelector('table, .listino, .price-list, [class*="listino"]');
      if (!hasContent) { setTimeout(function () { _tryListino(attempts + 1); }, 500); return; }
      if (section._boostListino) return;
      section._boostListino = true;

      /* Tier KPI strip */
      if (!document.getElementById('boost-listino-tiers')) {
        var strip = document.createElement('div');
        strip.id = 'boost-listino-tiers';
        strip.style.cssText = 'display:flex;gap:8px;padding:12px 16px 4px;flex-wrap:wrap;';
        [
          { cls: 'tier-bronze', icon: '🥉', label: 'Bronze', desc: '0–500€/mese' },
          { cls: 'tier-silver', icon: '🥈', label: 'Silver',  desc: '500–2K€/mese' },
          { cls: 'tier-gold',   icon: '🥇', label: 'Gold',    desc: '2K–5K€/mese' },
          { cls: 'tier-plat',   icon: '💎', label: 'Platinum', desc: '5K+€/mese' },
        ].forEach(function (t) {
          var chip = document.createElement('span');
          chip.className = 'boost-preset-btn ' + t.cls;
          chip.style.cssText = 'cursor:default;font-size:10px;padding:5px 12px;';
          chip.textContent = t.icon + ' ' + t.label + ' · ' + t.desc;
          strip.appendChild(chip);
        });
        section.insertBefore(strip, section.firstChild);
      }
    }
    _tryListino();
  }

  /* ═══════════════════════════════════════════════════════
     PROGETTI — KPI strip + progress bars
  ═══════════════════════════════════════════════════════ */
  function enhanceProgetti() {
    var section = document.getElementById('view-projects');
    if (!section || section._boostProj) return;

    function _tryProj(attempts) {
      attempts = attempts || 0;
      if (attempts > 20) return;
      var hasContent = section.querySelector('.project-card, .project, [class*="project"], table, ul');
      if (!hasContent) { setTimeout(function () { _tryProj(attempts + 1); }, 500); return; }
      if (section._boostProj) return;
      section._boostProj = true;

      /* KPI strip */
      if (!document.getElementById('boost-proj-kpis')) {
        var kpis = document.createElement('div');
        kpis.id = 'boost-proj-kpis';
        kpis.style.cssText = 'display:flex;gap:8px;padding:12px 16px 4px;flex-wrap:wrap;';
        var projects = [];
        try { projects = JSON.parse(localStorage.getItem('ingly_projects') || '[]'); } catch (e) {}
        var active = projects.filter(function (p) { return p.status !== 'done' && p.status !== 'completed'; });
        var done = projects.filter(function (p) { return p.status === 'done' || p.status === 'completed'; });
        [
          { val: projects.length, lbl: 'Totali', color: '#e5e5e5' },
          { val: active.length, lbl: 'Attivi', color: '#fbbf24' },
          { val: done.length, lbl: 'Completati', color: '#22c55e' },
        ].forEach(function (k) {
          var chip = document.createElement('div');
          chip.style.cssText = 'padding:6px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;font-size:12px;';
          chip.innerHTML = '<span style="font-weight:700;color:' + k.color + '">' + k.val + '</span> <span style="color:#71717a;font-size:10px">' + k.lbl + '</span>';
          kpis.appendChild(chip);
        });
        section.insertBefore(kpis, section.firstChild);
      }
    }
    _tryProj();
  }

  /* ═══════════════════════════════════════════════════════
     ORDINI & WORKFLOW — CRM sync + search bar
  ═══════════════════════════════════════════════════════ */
  function enhanceOrdini() {
    var section = document.getElementById('view-gestione_ordini');
    if (!section || section._boostOrdini) return;

    function _tryOrdini(attempts) {
      attempts = attempts || 0;
      if (attempts > 40) return;
      /* Wait for the section to have some content */
      var hasContent = section.children.length > 0;
      if (!hasContent) { setTimeout(function () { _tryOrdini(attempts + 1); }, 400); return; }
      if (section._boostOrdini) return;
      section._boostOrdini = true;
      _injectOrdiniBar(section);
    }
    _tryOrdini();
  }

  function _injectOrdiniBar(section) {
    if (document.getElementById('prox-ordini-bar')) return;

    /* ── CSS ── */
    if (!document.getElementById('prox-ordini-css')) {
      var s = document.createElement('style');
      s.id = 'prox-ordini-css';
      s.textContent = `
#prox-ordini-bar {
  background: var(--bg-card,#0f0f11);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 14px; padding: 14px 16px;
  margin-bottom: 14px;
}
.pob-top { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:12px; }
.pob-title { font-size:11px; font-weight:700; color:#71717a; text-transform:uppercase; letter-spacing:.5px; }
#prox-ordini-search {
  flex:1; min-width:180px; padding:8px 12px 8px 32px;
  background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
  border-radius:8px; color:#e5e5e5; font-size:12px; outline:none;
  transition:border-color .12s;
}
#prox-ordini-search:focus { border-color:rgba(251,191,36,.4); }
.pob-search-wrap { position:relative; flex:1; min-width:180px; }
.pob-search-wrap::before {
  content:'🔍'; position:absolute; left:9px; top:50%; transform:translateY(-50%);
  font-size:13px; pointer-events:none;
}
.pob-filter { padding:7px 13px; border-radius:20px; border:1px solid rgba(255,255,255,.1); background:transparent; color:#71717a; cursor:pointer; font-size:11px; font-weight:600; transition:.12s; }
.pob-filter.active { border-color:rgba(251,191,36,.4); color:#fbbf24; background:rgba(251,191,36,.08); }
.pob-kpis { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
.pob-kpi { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:8px; padding:8px 14px; font-size:11px; }
.pob-kpi strong { color:#e5e5e5; font-size:14px; display:block; line-height:1; margin-bottom:2px; }
.pob-kpi span { color:#52525b; font-size:9px; text-transform:uppercase; letter-spacing:.4px; }
/* CRM client quick-select panel */
#prox-crm-sync-panel {
  display:none; background:rgba(10,10,12,.98);
  border:1px solid rgba(255,255,255,.12); border-radius:12px;
  padding:12px; max-height:260px; overflow-y:auto;
  box-shadow:0 8px 32px rgba(0,0,0,.8);
  position:absolute; top:100%; left:0; right:0; z-index:500;
  margin-top:4px;
}
#prox-crm-sync-panel.open { display:block; }
.crm-client-row {
  display:flex; align-items:center; gap:10px; padding:8px 10px;
  border-radius:8px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,.04);
  transition:.1s;
}
.crm-client-row:hover { background:rgba(251,191,36,.07); }
.crm-client-init {
  width:30px; height:30px; border-radius:50%; background:rgba(251,191,36,.15);
  color:#fbbf24; font-size:11px; font-weight:800; display:flex;
  align-items:center; justify-content:center; flex-shrink:0;
}
.crm-client-name { font-size:12px; font-weight:600; color:#e5e5e5; }
.crm-client-meta { font-size:10px; color:#52525b; }
.crm-client-orders { margin-left:auto; font-size:10px; color:#71717a; }
#prox-ordini-results {
  max-height:320px; overflow-y:auto; scrollbar-width:thin;
  scrollbar-color:rgba(255,255,255,.1) transparent;
}
.por-row {
  display:grid; grid-template-columns:auto 1fr auto auto auto;
  gap:8px 12px; align-items:center; padding:10px 12px;
  border-radius:8px; cursor:pointer; transition:.1s;
  border-bottom:1px solid rgba(255,255,255,.04);
  font-size:12px;
}
.por-row:hover { background:rgba(255,255,255,.04); }
.por-id { font-size:10px; color:#52525b; font-family:monospace; }
.por-client { font-weight:600; color:#e5e5e5; }
.por-date { font-size:10px; color:#52525b; }
.por-amount { color:#fbbf24; font-weight:700; }
.por-badge { font-size:9px; font-weight:700; padding:2px 7px; border-radius:10px; text-transform:uppercase; white-space:nowrap; }
.por-badge-attesa     { background:rgba(100,116,139,.15); color:#64748b; }
.por-badge-produzione { background:rgba(245,158,11,.15);  color:#f59e0b; }
.por-badge-consegnato { background:rgba(96,165,250,.15);  color:#60a5fa; }
.por-badge-pagato     { background:rgba(34,197,94,.15);   color:#22c55e; }
.por-badge-annullato  { background:rgba(239,68,68,.15);   color:#ef4444; }
`;
      document.head.appendChild(s);
    }

    /* ── Helpers ── */
    function getAllClients() {
      var out = [];
      ['ingly_clients', 'ingly_crm_v1'].forEach(function (key) {
        try {
          var d = JSON.parse(localStorage.getItem(key) || 'null');
          if (Array.isArray(d)) out = out.concat(d);
          else if (d && Array.isArray(d.clients)) out = out.concat(d.clients);
        } catch (e) {}
      });
      /* de-duplicate by id or name */
      var seen = {};
      return out.filter(function (c) {
        var k = c.id || c.name || c.nome || '';
        if (seen[k]) return false;
        seen[k] = true;
        return true;
      });
    }

    function getAllOrders() {
      var out = [];
      ['ingly_orders', 'ingly_quotes', 'lb2b_quotes_v1'].forEach(function (key) {
        try {
          var d = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(d)) out = out.concat(d.map(function (o) { o._src = key; return o; }));
        } catch (e) {}
      });
      return out;
    }

    function clientName(c) { return c.name || c.nome || c.ragioneSociale || c.company || 'Cliente'; }
    function orderClient(o) { return o.client || o.clientName || o.cliente || o.name || ''; }
    function orderAmount(o) { return +(o.total || o.totalPrice || o.amount || o.totale || o.subtotal || 0); }
    function orderDate(o) {
      var d = o.date || o.createdAt || o.data || o.orderDate || '';
      try { return d ? new Date(d).toLocaleDateString('it-IT') : '—'; } catch (e) { return d.slice(0,10) || '—'; }
    }
    function orderStatus(o) {
      var s = (o.status || o.stage || o.stato || '').toLowerCase();
      if (s.includes('produz') || s.includes('lavoraz')) return 'produzione';
      if (s.includes('spediz') || s.includes('consegn')) return 'consegnato';
      if (s.includes('pagat') || s.includes('paid') || s.includes('completat')) return 'pagato';
      if (s.includes('annull') || s.includes('cancel')) return 'annullato';
      return 'attesa';
    }
    function statusLabel(s) {
      return { attesa:'Da gestire', produzione:'In produzione', consegnato:'Consegnato', pagato:'Pagato', annullato:'Annullato' }[s] || s;
    }

    /* ── Build bar DOM ── */
    var bar = document.createElement('div');
    bar.id = 'prox-ordini-bar';

    bar.innerHTML =
      '<div class="pob-top">' +
      '<span class="pob-title">🔗 Ordini & CRM</span>' +
      /* Search */
      '<div class="pob-search-wrap">' +
      '<input type="text" id="prox-ordini-search" placeholder="Cerca ordine, cliente, importo...">' +
      '<div id="prox-crm-sync-panel"></div>' +
      '</div>' +
      /* Status filters */
      '<button class="pob-filter active" data-status="*">Tutti</button>' +
      '<button class="pob-filter" data-status="attesa">📥 Da gestire</button>' +
      '<button class="pob-filter" data-status="produzione">⚙️ In lavoraz.</button>' +
      '<button class="pob-filter" data-status="consegnato">🚚 Consegnati</button>' +
      '<button class="pob-filter" data-status="pagato">✅ Pagati</button>' +
      /* CRM button */
      '<button id="pob-crm-btn" class="pob-filter" style="border-color:rgba(251,191,36,.3);color:#fbbf24">👥 Seleziona Cliente CRM</button>' +
      '</div>' +
      '<div class="pob-kpis" id="pob-kpis"></div>' +
      '<div id="prox-ordini-results"></div>';

    section.insertBefore(bar, section.firstChild);

    /* ── KPIs ── */
    function refreshKPIs() {
      var orders = getAllOrders();
      var total  = orders.reduce(function (s, o) { return s + orderAmount(o); }, 0);
      var pagati = orders.filter(function (o) { return orderStatus(o) === 'pagato'; });
      var inProd = orders.filter(function (o) { return orderStatus(o) === 'produzione'; });
      var fmt    = function (n) { return n ? '€' + n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'; };
      var clients = getAllClients();
      var kpiEl = document.getElementById('pob-kpis');
      if (!kpiEl) return;
      kpiEl.innerHTML = [
        { val: orders.length,     lbl: 'Ordini totali',    color: '#e5e5e5' },
        { val: inProd.length,     lbl: 'In lavorazione',   color: '#f59e0b' },
        { val: pagati.length,     lbl: 'Pagati',           color: '#22c55e' },
        { val: fmt(total),        lbl: 'Valore totale',    color: '#fbbf24' },
        { val: clients.length,    lbl: 'Clienti CRM',      color: '#60a5fa' },
      ].map(function (k) {
        return '<div class="pob-kpi"><strong style="color:' + k.color + '">' + k.val + '</strong><span>' + k.lbl + '</span></div>';
      }).join('');
    }
    refreshKPIs();

    /* ── CRM panel ── */
    var crmPanel  = document.getElementById('prox-crm-sync-panel');
    var searchInp = document.getElementById('prox-ordini-search');
    var crmOpen   = false;

    function renderCRMPanel(query) {
      var clients = getAllClients();
      query = (query || '').toLowerCase().trim();
      var filtered = query
        ? clients.filter(function (c) { return clientName(c).toLowerCase().includes(query); })
        : clients;
      filtered = filtered.slice(0, 30);

      if (!filtered.length) {
        crmPanel.innerHTML = '<div style="text-align:center;color:#3f3f46;padding:16px;font-size:11px">' +
          (clients.length === 0
            ? '⚠️ Nessun cliente in CRM — aggiungili dalla sezione CRM Clienti'
            : '🔍 Nessun cliente trovato per "' + query + '"') +
          '</div>';
        return;
      }

      var orders = getAllOrders();
      crmPanel.innerHTML = filtered.map(function (c) {
        var nm    = clientName(c);
        var init  = nm.split(' ').map(function (w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase();
        var cOrds = orders.filter(function (o) {
          return orderClient(o).toLowerCase() === nm.toLowerCase() ||
                 (c.id && (o.client === c.id || o.clientId === c.id));
        });
        var lastAmt = cOrds.length ? orderAmount(cOrds[cOrds.length - 1]) : 0;
        return '<div class="crm-client-row" data-name="' + nm.replace(/"/g, '&quot;') +
          '" data-email="' + (c.email || '') + '" data-phone="' + (c.phone || c.telefono || '') + '">' +
          '<div class="crm-client-init">' + init + '</div>' +
          '<div><div class="crm-client-name">' + nm + '</div>' +
          '<div class="crm-client-meta">' + (c.email || c.phone || c.telefono || 'Nessun contatto') + '</div></div>' +
          '<div class="crm-client-orders">' +
          (cOrds.length ? cOrds.length + ' ord.' + (lastAmt ? ' · €' + lastAmt.toFixed(0) : '') : 'Nessun ordine') +
          '</div></div>';
      }).join('');
    }

    document.getElementById('pob-crm-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      crmOpen = !crmOpen;
      crmPanel.classList.toggle('open', crmOpen);
      if (crmOpen) { renderCRMPanel(''); searchInp.focus(); }
    });

    /* When a CRM client is selected, inject their name into any order form field */
    crmPanel.addEventListener('click', function (e) {
      var row = e.target.closest('.crm-client-row');
      if (!row) return;
      var nm    = row.dataset.name;
      var email = row.dataset.email;
      var phone = row.dataset.phone;

      /* Try to fill any client input in the section */
      var inputs = section.querySelectorAll('input[placeholder*="cliente" i], input[id*="client" i], input[name*="client" i], input[placeholder*="nome" i]');
      inputs.forEach(function (inp) { inp.value = nm; inp.dispatchEvent(new Event('input', { bubbles: true })); });

      /* Also try selects */
      var selects = section.querySelectorAll('select[id*="client" i], select[name*="client" i]');
      selects.forEach(function (sel) {
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].text.toLowerCase().includes(nm.toLowerCase())) {
            sel.selectedIndex = i;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
        /* If no match, add the option dynamically */
        if (sel.value === '' || !sel.value) {
          var opt = new Option(nm, nm);
          sel.appendChild(opt);
          sel.value = nm;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      /* Store as last selected for new order forms */
      window._proxLastCRMClient = { name: nm, email: email, phone: phone };
      crmPanel.classList.remove('open');
      crmOpen = false;
      searchInp.value = nm;
      renderResults(nm);
      typeof toast !== 'undefined' && toast('👥 Cliente: ' + nm, 'info', 2000);
    });

    /* ── Order results ── */
    var activeStatus = '*';

    function renderResults(query) {
      var resultsEl = document.getElementById('prox-ordini-results');
      if (!resultsEl) return;
      var orders = getAllOrders();
      query = (query || '').toLowerCase().trim();

      var filtered = orders.filter(function (o) {
        if (activeStatus !== '*' && orderStatus(o) !== activeStatus) return false;
        if (!query) return true;
        var client = orderClient(o).toLowerCase();
        var id = (o.id || o.orderId || '').toString().toLowerCase();
        var amt = orderAmount(o).toString();
        return client.includes(query) || id.includes(query) || amt.includes(query);
      });

      if (!filtered.length) {
        resultsEl.innerHTML = '<div style="text-align:center;color:#3f3f46;padding:12px;font-size:11px">' +
          (orders.length === 0
            ? '📋 Nessun ordine ancora — crea il primo ordine dalla sezione sotto'
            : '🔍 Nessun ordine trovato') +
          '</div>';
        return;
      }

      filtered = filtered.slice(0, 20);
      resultsEl.innerHTML = filtered.map(function (o) {
        var st  = orderStatus(o);
        var amt = orderAmount(o);
        var id  = (o.id || o.orderId || '—').toString();
        return '<div class="por-row">' +
          '<span class="por-id">#' + id.slice(-8) + '</span>' +
          '<span class="por-client">' + (orderClient(o) || '—') + '</span>' +
          '<span class="por-date">' + orderDate(o) + '</span>' +
          '<span class="por-amount">' + (amt ? '€' + amt.toFixed(2) : '—') + '</span>' +
          '<span class="por-badge por-badge-' + st + '">' + statusLabel(st) + '</span>' +
          '</div>';
      }).join('');
    }

    /* ── Search input ── */
    searchInp.addEventListener('input', function () {
      var val = this.value.trim();
      renderResults(val);
      if (val) { renderCRMPanel(val); crmPanel.classList.add('open'); crmOpen = true; }
      else { crmPanel.classList.remove('open'); crmOpen = false; }
    });

    searchInp.addEventListener('focus', function () {
      if (!this.value.trim()) { renderCRMPanel(''); }
    });

    searchInp.addEventListener('blur', function () {
      setTimeout(function () { crmPanel.classList.remove('open'); crmOpen = false; }, 220);
    });

    /* ── Status filters ── */
    bar.querySelectorAll('.pob-filter[data-status]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeStatus = this.dataset.status;
        bar.querySelectorAll('.pob-filter[data-status]').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        renderResults(searchInp.value.trim());
      });
    });

    /* ── Patch existing client fields in section (runs once DOM settles) ── */
    function patchSectionClientFields() {
      var clients = getAllClients();
      if (!clients.length) return;

      /* Any <select> that looks like a client picker — add CRM clients as options */
      section.querySelectorAll('select').forEach(function (sel) {
        var lbl = (sel.id + ' ' + sel.name + ' ' + (sel.getAttribute('aria-label') || '')).toLowerCase();
        if (!lbl.includes('client') && !lbl.includes('cliente') && !lbl.includes('nome')) return;
        if (sel._proxPatched) return;
        sel._proxPatched = true;

        var existingTexts = Array.from(sel.options).map(function (o) { return o.text.toLowerCase(); });
        clients.forEach(function (c) {
          var nm = clientName(c);
          if (!existingTexts.includes(nm.toLowerCase())) {
            sel.appendChild(new Option(nm, c.id || nm));
          }
        });
      });
    }
    setTimeout(patchSectionClientFields, 800);
    setTimeout(patchSectionClientFields, 2000);

    /* ── Storage sync ── */
    window.addEventListener('storage', function (e) {
      if (['ingly_clients','ingly_crm_v1','ingly_orders','ingly_quotes'].includes(e.key)) {
        refreshKPIs();
        renderResults(searchInp ? searchInp.value.trim() : '');
        section._boostOrdini = false;
        setTimeout(function () { section._boostOrdini = true; }, 100);
      }
    });

    /* Close CRM panel on outside click */
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#prox-ordini-bar')) {
        crmPanel.classList.remove('open');
        crmOpen = false;
      }
    });

    renderResults('');
  }

  /* ═══════════════════════════════════════════════════════
     FISCAL / VENDITE — Enhanced pipeline view
  ═══════════════════════════════════════════════════════ */
  function buildFiscalEnhancement() {
    var section = document.getElementById('view-fiscal');
    if (!section || section._boostFiscal) return;

    // Wait for Sales to render first
    function _tryEnhance(attempt) {
      attempt = attempt || 0;
      if (attempt > 30) return;
      // Only inject once Sales has rendered something
      var hasSales = section.querySelector('.sales-list, table, [class*="sales"], #sales-kpis');
      if (!hasSales) { setTimeout(function () { _tryEnhance(attempt + 1); }, 400); return; }
      if (section._boostFiscal) return;
      section._boostFiscal = true;
      _injectFiscalEnhancement(section);
    }
    _tryEnhance();
  }

  function _injectFiscalEnhancement(section) {
    // CSS
    if (!document.getElementById('prox-fiscal-css')) {
      var s = document.createElement('style');
      s.id = 'prox-fiscal-css';
      s.textContent = `
#prox-fiscal-bar {
  background: var(--bg-card,#0f0f11);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 14px;
  padding: 16px 18px;
  margin-bottom: 16px;
}
.pfb-title {
  font-size: 11px; font-weight: 700; color: #71717a;
  text-transform: uppercase; letter-spacing: .5px;
  margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
}
.pfb-kpis {
  display: grid; grid-template-columns: repeat(5,1fr); gap: 10px;
  margin-bottom: 16px;
}
.pfb-kpi {
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07);
  border-radius: 10px; padding: 12px 14px; text-align: center;
}
.pfb-kpi-val { font-size: 20px; font-weight: 800; color: #e5e5e5; line-height: 1; margin-bottom: 4px; }
.pfb-kpi-lbl { font-size: 9px; color: #71717a; text-transform: uppercase; letter-spacing: .4px; }
.pfb-pipeline {
  display: grid; grid-template-columns: repeat(5,1fr); gap: 8px;
}
.pfb-lane {
  background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.06);
  border-radius: 10px; overflow: hidden;
}
.pfb-lane-hdr {
  padding: 8px 12px; font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .4px; display: flex;
  align-items: center; justify-content: space-between;
}
.pfb-lane-body { padding: 8px; min-height: 60px; }
.pfb-card {
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07);
  border-radius: 8px; padding: 9px 10px; margin-bottom: 6px; cursor: pointer;
  transition: border-color .12s;
}
.pfb-card:hover { border-color: rgba(251,191,36,.35); }
.pfb-card-client { font-size: 11px; font-weight: 600; color: #e5e5e5; margin-bottom: 3px; }
.pfb-card-amount { font-size: 12px; font-weight: 700; color: var(--primary,#fbbf24); }
.pfb-card-date { font-size: 9px; color: #52525b; }
.pfb-lane-empty { font-size: 10px; color: #3f3f46; text-align: center; padding: 12px 0; }
.pfb-filters { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
.pfb-filter-btn {
  padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;
  border: 1px solid rgba(255,255,255,.1); background: transparent;
  color: #71717a; cursor: pointer; transition: .12s;
}
.pfb-filter-btn.active { border-color: var(--primary-border,rgba(251,191,36,.35)); color: var(--primary,#fbbf24); background: var(--primary-dim,rgba(251,191,36,.1)); }
@media(max-width:900px) { .pfb-pipeline { grid-template-columns: repeat(3,1fr); } .pfb-kpis { grid-template-columns: repeat(3,1fr); } }
`;
      document.head.appendChild(s);
    }

    // Read orders from localStorage
    function _getOrders() {
      var orders = [];
      try { orders = JSON.parse(localStorage.getItem('ingly_orders') || '[]'); } catch (e) {}
      // Also try Sales data
      if (!orders.length) {
        try { orders = JSON.parse(localStorage.getItem('lb2b_quotes_v1') || '[]'); } catch (e) {}
      }
      return orders;
    }

    // Normalize status
    function _getStage(o) {
      var s = (o.status || o.stage || o.stato || '').toLowerCase();
      if (s.includes('attesa') || s.includes('nuov') || s.includes('draft') || s.includes('new') || !s) return 'attesa';
      if (s.includes('produz') || s.includes('lavoraz') || s.includes('progress')) return 'produzione';
      if (s.includes('spediz') || s.includes('consegn') || s.includes('shipped')) return 'consegnato';
      if (s.includes('pagat') || s.includes('paid') || s.includes('completat') || s.includes('done')) return 'pagato';
      if (s.includes('annull') || s.includes('cancel')) return 'annullato';
      return 'attesa';
    }

    function _getAmount(o) {
      return +(o.total || o.totalPrice || o.amount || o.totale || o.value || 0);
    }
    function _getClient(o) {
      return o.client || o.clientName || o.cliente || o.name || 'Cliente';
    }
    function _getDate(o) {
      var d = o.date || o.createdAt || o.data || o.orderDate || '';
      if (!d) return '';
      try { return new Date(d).toLocaleDateString('it-IT'); } catch (e) { return d.slice(0, 10); }
    }

    var LANES = [
      { id: 'attesa',     label: 'Da Gestire',   color: '#64748b', icon: '📥' },
      { id: 'produzione', label: 'In Produzione', color: '#f59e0b', icon: '⚙️' },
      { id: 'consegnato', label: 'Consegnato',    color: '#60a5fa', icon: '🚚' },
      { id: 'pagato',     label: 'Pagato ✓',      color: '#22c55e', icon: '✅' },
      { id: 'annullato',  label: 'Annullato',     color: '#ef4444', icon: '❌' },
    ];

    function _buildBar() {
      var existing = document.getElementById('prox-fiscal-bar');
      if (existing) existing.remove();

      var orders = _getOrders();
      var laneMap = {};
      LANES.forEach(function (l) { laneMap[l.id] = []; });
      orders.forEach(function (o) {
        var stage = _getStage(o);
        if (laneMap[stage]) laneMap[stage].push(o);
      });

      var totRevenue = orders.reduce(function (s, o) { return s + _getAmount(o); }, 0);
      var totPagato = laneMap.pagato.reduce(function (s, o) { return s + _getAmount(o); }, 0);
      var totProd = laneMap.produzione.reduce(function (s, o) { return s + _getAmount(o); }, 0);
      var totAttesa = laneMap.attesa.reduce(function (s, o) { return s + _getAmount(o); }, 0);
      var fmt = function (n) { return n > 0 ? '€' + n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'; };

      var bar = document.createElement('div');
      bar.id = 'prox-fiscal-bar';

      bar.innerHTML =
        '<div class="pfb-title">📊 Pipeline Vendite & Fatturazione</div>' +
        '<div class="pfb-kpis">' +
        '<div class="pfb-kpi"><div class="pfb-kpi-val">' + orders.length + '</div><div class="pfb-kpi-lbl">Ordini Totali</div></div>' +
        '<div class="pfb-kpi"><div class="pfb-kpi-val" style="color:#f59e0b">' + laneMap.produzione.length + '</div><div class="pfb-kpi-lbl">In Produzione</div></div>' +
        '<div class="pfb-kpi"><div class="pfb-kpi-val" style="color:#22c55e">' + fmt(totPagato) + '</div><div class="pfb-kpi-lbl">Incassato</div></div>' +
        '<div class="pfb-kpi"><div class="pfb-kpi-val" style="color:#60a5fa">' + fmt(totProd) + '</div><div class="pfb-kpi-lbl">In Lavorazione</div></div>' +
        '<div class="pfb-kpi"><div class="pfb-kpi-val" style="color:#fbbf24">' + fmt(totAttesa) + '</div><div class="pfb-kpi-lbl">Da Gestire</div></div>' +
        '</div>' +
        '<div class="pfb-pipeline">' +
        LANES.map(function (lane) {
          var cards = laneMap[lane.id];
          return '<div class="pfb-lane">' +
            '<div class="pfb-lane-hdr" style="background:' + lane.color + '18;border-bottom:1px solid ' + lane.color + '30;color:' + lane.color + '">' +
            '<span>' + lane.icon + ' ' + lane.label + '</span>' +
            '<span style="background:' + lane.color + '30;border-radius:20px;padding:1px 7px;font-size:10px">' + cards.length + '</span>' +
            '</div>' +
            '<div class="pfb-lane-body">' +
            (cards.length ? cards.slice(0, 5).map(function (o) {
              var amt = _getAmount(o);
              return '<div class="pfb-card">' +
                '<div class="pfb-card-client">' + _getClient(o) + '</div>' +
                (amt ? '<div class="pfb-card-amount">' + fmt(amt) + '</div>' : '') +
                '<div class="pfb-card-date">' + _getDate(o) + '</div>' +
                '</div>';
            }).join('') + (cards.length > 5 ? '<div class="pfb-lane-empty">+' + (cards.length - 5) + ' altri</div>' : '')
            : '<div class="pfb-lane-empty">Nessun ordine</div>') +
            '</div></div>';
        }).join('') +
        '</div>' +
        (orders.length === 0 ? '<div style="text-align:center;padding:12px;font-size:11px;color:#52525b;border-top:1px solid rgba(255,255,255,.06);margin-top:12px">⚡ Aggiungi ordini dalla sezione <strong style="color:#fbbf24">Gestione Ordini</strong> — appariranno qui automaticamente</div>' : '');

      section.insertBefore(bar, section.firstChild);
    }

    _buildBar();

    // Refresh when orders change
    window.addEventListener('storage', function (e) {
      if (e.key === 'ingly_orders') {
        section._boostFiscal = false;
        _buildBar();
        section._boostFiscal = true;
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     BOOT
  ═══════════════════════════════════════════════════════ */
  var _tries = 0;
  function boot() {
    _tries++;
    if (_tries > 40) return;
    if (!document.getElementById('content-inner') || typeof App === 'undefined') {
      setTimeout(boot, 500); return;
    }

    killLegacyBars();
    injectBoostCSS();
    injectDockExtCSS();
    buildDock();
    setTimeout(upgradeDock, 200);
    enhanceLaserCalc();
    enhanceListino();
    enhanceProgetti();
    buildPreventivoModal();
    patchQuoteGeneratorV2();
    patchCoreNav();
    enhanceOrdini();
    buildFiscalEnhancement();

    // Re-run section enhancements after navigation
    if (!window._proxBoostNavHooked && App.navigate) {
      var _origNav2 = App.navigate;
      App.navigate = function (section) {
        var result = _origNav2.apply(this, arguments);
        setTimeout(function () {
          if (section === 'lasercalc') enhanceLaserCalc();
          if (section === 'listino') enhanceListino();
          if (section === 'projects') enhanceProgetti();
          if (section === 'gestione_ordini') enhanceOrdini();
          if (section === 'fiscal') buildFiscalEnhancement();
        }, 400);
        return result;
      };
      window._proxBoostNavHooked = true;
    }

    // Run legacy bar removal again after a delay (in case patches load late)
    setTimeout(killLegacyBars, 3000);

    console.log('[prox-boost] Dock + Boost layer loaded ✅');
    typeof toast !== 'undefined' && toast('PRO X Dock attivo ✦', 'success', 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 1500); });
  } else {
    setTimeout(boot, 1500);
  }

})();

