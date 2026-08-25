
/* === INGLY CALCOLATORE MACCHINA LASER v2.0 === */
/* ══════════════════════════════════════════════════════════════
   INGLY OS — Calcolatore Macchina Laser v2.0
   Sostituisce il vecchio "🧮 Calc Laser" con un motore
   universale per laser, DTF, UV, sublimazione, CNC, presse.
   Mantiene piena compatibilità con sendToQuoter() e v35 DB.
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Machine Database ─────────────────────────────────────── */
  const MACHINE_DB = [
    /* ── xTool ── */
    { id:'xt-p2',     brand:'xTool', model:'P2',       tech:'Diode CO₂', power_w:55,  area:'430×300',  price:2500, color:'#6366f1', icon:'⚡', depr_h:3000 },
    { id:'xt-p2s',    brand:'xTool', model:'P2S',      tech:'Diode CO₂', power_w:55,  area:'430×300',  price:2800, color:'#6366f1', icon:'⚡', depr_h:3000 },
    { id:'xt-p3',     brand:'xTool', model:'P3',       tech:'Diode',     power_w:20,  area:'430×390',  price:1599, color:'#818cf8', icon:'⚡', depr_h:3000 },
    { id:'xt-s1',     brand:'xTool', model:'S1',       tech:'Diode',     power_w:40,  area:'498×319',  price:1800, color:'#818cf8', icon:'⚡', depr_h:3000 },
    { id:'xt-f1',     brand:'xTool', model:'F1',       tech:'Fibra+Diode',power_w:20, area:'115×115',  price:1099, color:'#a78bfa', icon:'🔥', depr_h:5000 },
    { id:'xt-f1u',    brand:'xTool', model:'F1 Ultra', tech:'Fibra+CO₂', power_w:20,  area:'170×170',  price:1699, color:'#a78bfa', icon:'🔥', depr_h:5000 },
    { id:'xt-m1',     brand:'xTool', model:'M1',       tech:'Diode+Blade',power_w:10, area:'385×300',  price:699,  color:'#818cf8', icon:'⚡', depr_h:2000 },
    { id:'xt-m1u',    brand:'xTool', model:'M1 Ultra', tech:'Diode+Blade',power_w:20, area:'385×305',  price:1299, color:'#818cf8', icon:'⚡', depr_h:2000 },
    { id:'xt-d1pro',  brand:'xTool', model:'D1 Pro',   tech:'Diode',     power_w:10,  area:'430×390',  price:599,  color:'#818cf8', icon:'⚡', depr_h:2000 },
    { id:'xt-d1',     brand:'xTool', model:'D1',       tech:'Diode',     power_w:5,   area:'410×415',  price:399,  color:'#818cf8', icon:'⚡', depr_h:2000 },
    /* ── Aeon ── */
    { id:'ae-m5',     brand:'Aeon', model:'Mira 5',    tech:'CO₂',  power_w:50,  area:'500×300',  price:3200, color:'#10b981', icon:'🔆', depr_h:8000 },
    { id:'ae-m7',     brand:'Aeon', model:'Mira 7',    tech:'CO₂',  power_w:80,  area:'700×500',  price:5500, color:'#10b981', icon:'🔆', depr_h:8000 },
    { id:'ae-n10',    brand:'Aeon', model:'Nova 10',   tech:'CO₂',  power_w:100, area:'1000×600', price:7500, color:'#10b981', icon:'🔆', depr_h:8000 },
    { id:'ae-n14',    brand:'Aeon', model:'Nova 14',   tech:'CO₂',  power_w:150, area:'1400×900', price:11000,color:'#10b981', icon:'🔆', depr_h:8000 },
    { id:'ae-sn',     brand:'Aeon', model:'Super Nova', tech:'CO₂',  power_w:180, area:'1600×1000',price:15000,color:'#10b981', icon:'🔆', depr_h:8000 },
    /* ── Thunder Laser ── */
    { id:'tl-bolt',   brand:'Thunder', model:'Bolt',   tech:'CO₂',  power_w:60,  area:'600×400',  price:3800, color:'#f59e0b', icon:'⚡', depr_h:8000 },
    { id:'tl-nova',   brand:'Thunder', model:'Nova',   tech:'CO₂',  power_w:100, area:'900×600',  price:7000, color:'#f59e0b', icon:'⚡', depr_h:8000 },
    { id:'tl-aurora', brand:'Thunder', model:'Aurora', tech:'Diode', power_w:22,  area:'420×400',  price:999,  color:'#f59e0b', icon:'⚡', depr_h:3000 },
    /* ── OMTech ── */
    { id:'om-polar',  brand:'OMTech', model:'Polar',    tech:'CO₂',  power_w:50,  area:'300×210',  price:1299, color:'#06b6d4', icon:'❄️', depr_h:6000 },
    { id:'om-turbo',  brand:'OMTech', model:'Turbo',    tech:'CO₂',  power_w:80,  area:'700×500',  price:3500, color:'#06b6d4', icon:'🌀', depr_h:6000 },
    { id:'om-pronto', brand:'OMTech', model:'Pronto',   tech:'CO₂',  power_w:60,  area:'400×400',  price:2200, color:'#06b6d4', icon:'💨', depr_h:6000 },
    /* ── Glowforge ── */
    { id:'gf-aura',   brand:'Glowforge', model:'Aura',  tech:'Diode', power_w:6,   area:'279×508',  price:599,  color:'#ec4899', icon:'🌸', depr_h:2000 },
    { id:'gf-plus',   brand:'Glowforge', model:'Plus',  tech:'CO₂',   power_w:45,  area:'279×508',  price:3499, color:'#ec4899', icon:'✨', depr_h:5000 },
    { id:'gf-pro',    brand:'Glowforge', model:'Pro',   tech:'CO₂',   power_w:45,  area:'279×508',  price:4999, color:'#ec4899', icon:'💫', depr_h:5000 },
    /* ── Gweike ── */
    { id:'gw-cloud',  brand:'Gweike', model:'Cloud',   tech:'CO₂',   power_w:50,  area:'300×210',  price:999,  color:'#8b5cf6', icon:'☁️', depr_h:5000 },
    { id:'gw-lc',     brand:'Gweike', model:'LC6090',  tech:'CO₂',   power_w:80,  area:'600×900',  price:2800, color:'#8b5cf6', icon:'🔆', depr_h:5000 },
    { id:'gw-lf30',   brand:'Gweike', model:'LF30',    tech:'Fibra',  power_w:30,  area:'110×110',  price:3500, color:'#8b5cf6', icon:'🔥', depr_h:8000 },
    /* ── Epilog ── */
    { id:'ep-fe',     brand:'Epilog', model:'Fusion Edge', tech:'CO₂', power_w:60,  area:'610×457',  price:12000,color:'#ef4444', icon:'🔴', depr_h:10000 },
    { id:'ep-fp',     brand:'Epilog', model:'Fusion Pro',  tech:'CO₂', power_w:120, area:'864×610',  price:25000,color:'#ef4444', icon:'🔴', depr_h:10000 },
    /* ── Trotec ── */
    { id:'tr-s100',   brand:'Trotec', model:'Speedy 100', tech:'CO₂', power_w:60,  area:'610×305',  price:8000, color:'#f97316', icon:'🟠', depr_h:10000 },
    { id:'tr-s300',   brand:'Trotec', model:'Speedy 300', tech:'CO₂', power_w:100, area:'726×432',  price:15000,color:'#f97316', icon:'🟠', depr_h:10000 },
    { id:'tr-s400',   brand:'Trotec', model:'Speedy 400', tech:'CO₂', power_w:120, area:'1000×610', price:20000,color:'#f97316', icon:'🟠', depr_h:10000 },
    /* ── Monport ── */
    { id:'mp-40',     brand:'Monport', model:'40W', tech:'CO₂', power_w:40,  area:'300×200', price:599,  color:'#14b8a6', icon:'🟢', depr_h:5000 },
    { id:'mp-60',     brand:'Monport', model:'60W', tech:'CO₂', power_w:60,  area:'400×300', price:799,  color:'#14b8a6', icon:'🟢', depr_h:5000 },
    { id:'mp-80',     brand:'Monport', model:'80W', tech:'CO₂', power_w:80,  area:'600×400', price:1299, color:'#14b8a6', icon:'🟢', depr_h:5000 },
    /* ── Creality ── */
    { id:'cr-f10',    brand:'Creality', model:'Falcon 10W', tech:'Diode', power_w:10, area:'400×415', price:299, color:'#fbbf24', icon:'🦅', depr_h:2000 },
    { id:'cr-f22',    brand:'Creality', model:'Falcon 22W', tech:'Diode', power_w:22, area:'400×415', price:499, color:'#fbbf24', icon:'🦅', depr_h:2000 },
    { id:'cr-f40',    brand:'Creality', model:'Falcon 40W', tech:'Diode', power_w:40, area:'400×415', price:699, color:'#fbbf24', icon:'🦅', depr_h:2000 },
    /* ── Ortur ── */
    { id:'or-lm3',    brand:'Ortur', model:'Laser Master 3', tech:'Diode', power_w:10, area:'400×400', price:299, color:'#a3e635', icon:'💚', depr_h:2000 },
    /* ── Atomstack ── */
    { id:'at-a5',     brand:'Atomstack', model:'A5',  tech:'Diode', power_w:5,  area:'410×400', price:199, color:'#84cc16', icon:'⚛️', depr_h:2000 },
    { id:'at-x20',    brand:'Atomstack', model:'X20', tech:'Diode', power_w:20, area:'400×400', price:399, color:'#84cc16', icon:'⚛️', depr_h:2000 },
    { id:'at-x40',    brand:'Atomstack', model:'X40', tech:'Diode', power_w:40, area:'400×400', price:699, color:'#84cc16', icon:'⚛️', depr_h:2000 },
    /* ── Sculpfun ── */
    { id:'sc-s30',    brand:'Sculpfun', model:'S30', tech:'Diode', power_w:30, area:'400×400', price:299, color:'#e879f9', icon:'🎭', depr_h:2000 },
    /* ── LaserPecker ── */
    { id:'lp-lp4',    brand:'LaserPecker', model:'LP4', tech:'Diode', power_w:22, area:'420×420', price:999, color:'#c084fc', icon:'🖊️', depr_h:2000 },
    { id:'lp-lp5',    brand:'LaserPecker', model:'LP5', tech:'Fibra', power_w:20, area:'100×100', price:1499, color:'#c084fc', icon:'🖊️', depr_h:5000 },
    /* ── Snapmaker ── */
    { id:'sm-art',    brand:'Snapmaker', model:'Artisan', tech:'Diode+CNC', power_w:20, area:'400×400', price:2999, color:'#f472b6', icon:'🔧', depr_h:3000 },
    { id:'sm-ray',    brand:'Snapmaker', model:'Ray',     tech:'Diode',     power_w:40, area:'400×400', price:799,  color:'#f472b6', icon:'☀️', depr_h:2000 },
    /* ── Flux ── */
    { id:'fl-bm',     brand:'Flux', model:'Beamo',  tech:'CO₂',   power_w:30, area:'300×210', price:1499, color:'#38bdf8', icon:'💎', depr_h:5000 },
    { id:'fl-hx',     brand:'Flux', model:'Hexa',   tech:'Diode', power_w:55, area:'420×420', price:1299, color:'#38bdf8', icon:'🔷', depr_h:3000 },
    /* ── Laser Fibra ── */
    { id:'fi-20',     brand:'Fibra', model:'20W MOPA',  tech:'Fibra MOPA', power_w:20, area:'110×110', price:3500, color:'#f43f5e', icon:'🔥', depr_h:8000 },
    { id:'fi-30',     brand:'Fibra', model:'30W Raycus', tech:'Fibra',     power_w:30, area:'110×110', price:3000, color:'#f43f5e', icon:'🔥', depr_h:8000 },
    { id:'fi-50',     brand:'Fibra', model:'50W JPT',    tech:'Fibra',     power_w:50, area:'200×200', price:5500, color:'#f43f5e', icon:'🔥', depr_h:8000 },
    { id:'fi-100',    brand:'Fibra', model:'100W IPG',   tech:'Fibra',     power_w:100,area:'300×300', price:12000,color:'#f43f5e', icon:'🔥', depr_h:10000 },
    /* ── CO₂ generici ── */
    { id:'co-40',     brand:'CO₂', model:'40W',  tech:'CO₂', power_w:40,  area:'300×200', price:500,  color:'#67e8f9', icon:'💨', depr_h:5000 },
    { id:'co-60',     brand:'CO₂', model:'60W',  tech:'CO₂', power_w:60,  area:'400×300', price:700,  color:'#67e8f9', icon:'💨', depr_h:5000 },
    { id:'co-80',     brand:'CO₂', model:'80W',  tech:'CO₂', power_w:80,  area:'600×400', price:1200, color:'#67e8f9', icon:'💨', depr_h:5000 },
    { id:'co-100',    brand:'CO₂', model:'100W', tech:'CO₂', power_w:100, area:'900×600', price:1800, color:'#67e8f9', icon:'💨', depr_h:5000 },
    { id:'co-130',    brand:'CO₂', model:'130W', tech:'CO₂', power_w:130, area:'900×600', price:2500, color:'#67e8f9', icon:'💨', depr_h:5000 },
    /* ── DTF ── */
    { id:'dtf-pxa3',  brand:'Prestige', model:'A3',       tech:'DTF',   power_w:0.5, area:'A3',      price:2500, color:'#fb7185', icon:'🖨️', depr_h:3000 },
    { id:'dtf-pxxl',  brand:'Prestige', model:'XL2',      tech:'DTF',   power_w:0.8, area:'A2',      price:5000, color:'#fb7185', icon:'🖨️', depr_h:3000 },
    { id:'dtf-ep18',  brand:'Epson',    model:'L1800 DTF', tech:'DTF',  power_w:0.3, area:'A3+',     price:800,  color:'#f9a8d4', icon:'🖨️', depr_h:2000 },
    { id:'dtf-aud',   brand:'Audley',   model:'A3 DTF',   tech:'DTF',   power_w:0.6, area:'A3',      price:1800, color:'#f9a8d4', icon:'🖨️', depr_h:2000 },
    /* ── UV ── */
    { id:'uv-mim',    brand:'Mimaki',   model:'UV A3',    tech:'UV',    power_w:1.2, area:'A3',      price:8000, color:'#818cf8', icon:'🌈', depr_h:5000 },
    { id:'uv-rol',    brand:'Roland',   model:'UV A4',    tech:'UV',    power_w:0.8, area:'A4',      price:5000, color:'#818cf8', icon:'🌈', depr_h:5000 },
    { id:'uv-pro',    brand:'Procolored', model:'UV A4',  tech:'UV',    power_w:0.4, area:'A4',      price:1200, color:'#a78bfa', icon:'🌈', depr_h:2000 },
    /* ── Sublimazione ── */
    { id:'sub-sg5',   brand:'Sawgrass',  model:'SG500',   tech:'Sublimazione', power_w:0.2, area:'A4', price:699, color:'#fb923c', icon:'🎨', depr_h:3000 },
    { id:'sub-sg10',  brand:'Sawgrass',  model:'SG1000',  tech:'Sublimazione', power_w:0.3, area:'A3', price:1299, color:'#fb923c', icon:'🎨', depr_h:3000 },
    { id:'sub-ep5',   brand:'Epson',     model:'F500',    tech:'Sublimazione', power_w:0.4, area:'A4', price:2500, color:'#fdba74', icon:'🎨', depr_h:4000 },
    /* ── Presse ── */
    { id:'pr-3838',   brand:'Press', model:'38×38cm', tech:'Pressa caldo', power_w:1.5, area:'380×380', price:200, color:'#d97706', icon:'♨️', depr_h:5000 },
    { id:'pr-4050',   brand:'Press', model:'40×50cm', tech:'Pressa caldo', power_w:2.0, area:'400×500', price:350, color:'#d97706', icon:'♨️', depr_h:5000 },
    { id:'pr-mug',    brand:'Press', model:'Mug',     tech:'Pressa mug',   power_w:0.3, area:'Mug',    price:150, color:'#92400e', icon:'☕', depr_h:3000 },
    { id:'pr-cap',    brand:'Press', model:'Cap',     tech:'Pressa cap',   power_w:0.3, area:'Cap',    price:180, color:'#92400e', icon:'🧢', depr_h:3000 },
    /* ── CNC ── */
    { id:'cnc-3018',  brand:'CNC', model:'3018 Pro',  tech:'CNC',  power_w:0.5, area:'300×180', price:250,  color:'#6b7280', icon:'🔩', depr_h:2000 },
    { id:'cnc-6090',  brand:'CNC', model:'6090',      tech:'CNC',  power_w:2.2, area:'600×900', price:2500, color:'#6b7280', icon:'🔩', depr_h:5000 },
    { id:'cnc-art',   brand:'CNC', model:'Artisan 3',  tech:'CNC', power_w:3.5, area:'800×800', price:5000, color:'#6b7280', icon:'🔩', depr_h:5000 },
  ];

  /* ── Technology groups for filter ─────────────────────────── */
  const TECH_GROUPS = [
    { key:'all',          label:'Tutte',        icon:'🔍' },
    { key:'Diode',        label:'Laser Diodo',  icon:'⚡' },
    { key:'CO₂',          label:'Laser CO₂',    icon:'💨' },
    { key:'Fibra',        label:'Fibra / MOPA', icon:'🔥' },
    { key:'DTF',          label:'DTF',          icon:'🖨️' },
    { key:'UV',           label:'UV',           icon:'🌈' },
    { key:'Sublimazione', label:'Sublimazione', icon:'🎨' },
    { key:'Pressa',       label:'Presse',       icon:'♨️' },
    { key:'CNC',          label:'CNC',          icon:'🔩' },
  ];

  /* ── Persistent state ─────────────────────────────────────── */
  const LS_KEY     = 'ingly_laser_calc_v2';
  const LS_FAVS    = 'ingly_laser_favs';
  const LS_CUSTOM  = 'ingly_laser_custom';
  const LS_HISTORY = 'ingly_laser_history';

  function loadState()  { try { return JSON.parse(localStorage.getItem(LS_KEY)||'{}'); } catch { return {}; } }
  function saveState(s) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} }
  function loadFavs()   { try { return JSON.parse(localStorage.getItem(LS_FAVS)||'[]'); } catch { return []; } }
  function saveFavs(f)  { try { localStorage.setItem(LS_FAVS, JSON.stringify(f)); } catch {} }
  function loadCustom() { try { return JSON.parse(localStorage.getItem(LS_CUSTOM)||'[]'); } catch { return []; } }
  function saveCustom(c){ try { localStorage.setItem(LS_CUSTOM, JSON.stringify(c)); } catch {} }
  function loadHistory(){ try { return JSON.parse(localStorage.getItem(LS_HISTORY)||'[]'); } catch { return []; } }
  function addHistory(id){ const h=[id,...loadHistory().filter(x=>x!==id)].slice(0,5); try{localStorage.setItem(LS_HISTORY,JSON.stringify(h));}catch{} }

  function allMachines() { return [...MACHINE_DB, ...loadCustom()]; }

  function genId() { return 'mc-'+Date.now()+'-'+Math.random().toString(36).slice(2,5); }

  /* ── State variables ──────────────────────────────────────── */
  let _selectedMachine = null;
  let _techFilter      = 'all';
  let _searchQ         = '';
  let _extraCosts      = [];
  let _calcResult      = null;

  /* ── CSS ──────────────────────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById('_lcv2_css')) return;
    const s = document.createElement('style');
    s.id = '_lcv2_css';
    s.textContent = `
      #view-lasercalc { padding: 0; }
      .lcv2-wrap { display:grid; grid-template-columns:320px 1fr 300px; gap:0; height:calc(100vh - 60px); overflow:hidden; }
      .lcv2-panel { overflow-y:auto; border-right:1px solid var(--border,#243040); }
      .lcv2-panel-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--text-muted); padding:12px 16px 6px; position:sticky; top:0; background:var(--bg-card,#141820); z-index:1; border-bottom:1px solid var(--border); }
      .lcv2-machine-card { padding:10px 12px; border-bottom:1px solid var(--border2,#2d3f50); cursor:pointer; display:flex; align-items:center; gap:10px; transition:.12s; }
      .lcv2-machine-card:hover { background:var(--bg-card2,#1c2330); }
      .lcv2-machine-card.selected { background:var(--primary,#6366f1)18; border-left:3px solid var(--primary,#6366f1); }
      .lcv2-machine-icon { width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
      .lcv2-machine-name { font-size:12px; font-weight:700; color:var(--text); }
      .lcv2-machine-sub  { font-size:10px; color:var(--text-muted); }
      .lcv2-tech-filter  { display:flex; gap:4px; padding:8px 12px; overflow-x:auto; flex-wrap:wrap; border-bottom:1px solid var(--border); }
      .lcv2-tech-btn { padding:3px 10px; border-radius:99px; border:1px solid var(--border2); background:transparent; color:var(--text-muted); cursor:pointer; font-size:10px; font-weight:600; white-space:nowrap; }
      .lcv2-tech-btn.active { background:var(--primary,#6366f1); color:#fff; border-color:var(--primary,#6366f1); }
      .lcv2-search { width:100%; padding:8px 12px; background:var(--bg-card2); border:none; border-bottom:1px solid var(--border); color:var(--text); font-size:12px; outline:none; }
      .lcv2-section-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--text-dim); padding:6px 12px 3px; }
      .lcv2-fav-star { margin-left:auto; font-size:12px; cursor:pointer; opacity:.4; }
      .lcv2-fav-star.active { opacity:1; }
      .lcv2-center { padding:16px; overflow-y:auto; }
      .lcv2-right { border-left:1px solid var(--border,#243040); padding:0; overflow-y:auto; }
      .lcv2-param-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px; }
      .lcv2-param-row.three { grid-template-columns:1fr 1fr 1fr; }
      .lcv2-field { display:flex; flex-direction:column; gap:3px; }
      .lcv2-label { font-size:9px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; }
      .lcv2-input { background:var(--bg-card2); border:1px solid var(--border2); border-radius:6px; padding:7px 10px; color:var(--text); font-size:12px; width:100%; outline:none; }
      .lcv2-input:focus { border-color:var(--primary,#6366f1); }
      .lcv2-card { background:var(--bg-card,#141820); border:1px solid var(--border,#243040); border-radius:12px; padding:14px; margin-bottom:12px; }
      .lcv2-card-title { font-size:12px; font-weight:700; color:var(--text); margin-bottom:10px; display:flex; align-items:center; gap:6px; }
      .lcv2-result-row { display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid var(--border2); font-size:12px; }
      .lcv2-result-row:last-child { border-bottom:none; }
      .lcv2-cost-total { background:var(--primary,#6366f1)18; border:1px solid var(--primary,#6366f1)44; border-radius:8px; padding:12px; margin:10px 0; text-align:center; }
      .lcv2-tier-card { border-radius:10px; padding:12px; text-align:center; cursor:pointer; transition:.15s; border:2px solid transparent; }
      .lcv2-tier-card:hover { transform:translateY(-2px); }
      .lcv2-tier-card.selected { border-color:var(--primary,#6366f1) !important; }
      .lcv2-ai-tip { background:var(--primary,#6366f1)10; border:1px solid var(--primary,#6366f1)25; border-radius:8px; padding:10px 12px; font-size:11px; color:var(--text-muted); margin-bottom:8px; display:flex; gap:8px; align-items:flex-start; }
      .lcv2-extra-row { display:flex; gap:6px; align-items:center; margin-bottom:6px; }
      .lcv2-extra-input { flex:1; background:var(--bg-card2); border:1px solid var(--border2); border-radius:6px; padding:6px 8px; color:var(--text); font-size:11px; }
      .lcv2-no-machine { padding:40px; text-align:center; color:var(--text-muted); }
      @media(max-width:900px) { .lcv2-wrap { grid-template-columns:1fr; } .lcv2-panel,.lcv2-right { border:none; } }
    `;
    document.head.appendChild(s);
  }

  /* ── RENDER ───────────────────────────────────────────────── */
  function render() {
    const el = document.getElementById('view-lasercalc');
    if (!el) return;
    injectCSS();

    el.innerHTML = `
    <div class="lcv2-wrap">
      <!-- LEFT: Machine List -->
      <div class="lcv2-panel" id="lcv2-left">
        <div class="lcv2-panel-title">
          🧮 Calcolatore Macchina
          <button onclick="_lcv2AddMachine()" style="float:right;background:var(--primary)20;border:1px solid var(--primary)40;border-radius:5px;color:var(--primary,#818cf8);cursor:pointer;font-size:9px;padding:2px 8px;font-family:inherit">+ Nuova</button>
        </div>
        <input class="lcv2-search" id="lcv2-search" placeholder="🔍 Cerca macchina…" oninput="_lcv2Search(this.value)">
        <div class="lcv2-tech-filter" id="lcv2-tech-filter">
          ${TECH_GROUPS.map(t => `<button class="lcv2-tech-btn${_techFilter===t.key?' active':''}" onclick="_lcv2SetTech('${t.key}')">${t.icon} ${t.label}</button>`).join('')}
        </div>
        <div id="lcv2-machine-list"></div>
      </div>

      <!-- CENTER: Calculator -->
      <div class="lcv2-center" id="lcv2-center">
        ${_selectedMachine ? renderCalculator() : renderNoMachine()}
      </div>

      <!-- RIGHT: Results -->
      <div class="lcv2-right" id="lcv2-right">
        ${_selectedMachine ? renderResults() : renderResultsEmpty()}
      </div>
    </div>`;

    renderMachineList();
    if (_selectedMachine) recalc();
  }

  /* ── Machine list ─────────────────────────────────────────── */
  function renderMachineList() {
    const el = document.getElementById('lcv2-machine-list');
    if (!el) return;
    const favs     = loadFavs();
    const history  = loadHistory();
    const machines = allMachines();
    const q = _searchQ.toLowerCase();

    let filtered = machines.filter(m => {
      if (_techFilter !== 'all' && !m.tech.includes(_techFilter)) return false;
      if (q && !(m.brand+' '+m.model+' '+m.tech).toLowerCase().includes(q)) return false;
      return true;
    });

    const favMachines  = filtered.filter(m => favs.includes(m.id));
    const histMachines = history.map(id => filtered.find(m=>m.id===id)).filter(Boolean).filter(m=>!favs.includes(m.id));
    const others       = filtered.filter(m => !favs.includes(m.id) && !history.includes(m.id));

    function machineCard(m) {
      const isFav = favs.includes(m.id);
      const isSel = _selectedMachine?.id === m.id;
      return `<div class="lcv2-machine-card${isSel?' selected':''}" onclick="_lcv2SelectMachine('${m.id}')">
        <div class="lcv2-machine-icon" style="background:${m.color}20">${m.icon}</div>
        <div style="flex:1;min-width:0">
          <div class="lcv2-machine-name">${m.brand} ${m.model}</div>
          <div class="lcv2-machine-sub">${m.tech} · ${m.power_w}W · ${m.area}mm</div>
        </div>
        <span class="lcv2-fav-star${isFav?' active':''}" onclick="event.stopPropagation();_lcv2ToggleFav('${m.id}')">${isFav?'⭐':'☆'}</span>
      </div>`;
    }

    let html = '';
    if (favMachines.length)  html += `<div class="lcv2-section-label">⭐ Preferite</div>${favMachines.map(machineCard).join('')}`;
    if (histMachines.length) html += `<div class="lcv2-section-label">🕐 Recenti</div>${histMachines.map(machineCard).join('')}`;
    if (others.length)       html += `<div class="lcv2-section-label">Tutte (${others.length})</div>${others.map(machineCard).join('')}`;
    if (!filtered.length)    html  = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12px">Nessuna macchina trovata</div>';

    el.innerHTML = html;
  }

  /* ── No machine selected ─────────────────────────────────── */
  function renderNoMachine() {
    return `<div class="lcv2-no-machine">
      <div style="font-size:48px;margin-bottom:16px">🧮</div>
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px">Calcolatore Macchina Laser</div>
      <div style="font-size:13px;line-height:1.6">Seleziona una macchina dalla lista a sinistra per iniziare il calcolo dei costi di produzione.</div>
      <div style="margin-top:20px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        ${TECH_GROUPS.filter(t=>t.key!=='all').slice(0,4).map(t=>`<button onclick="_lcv2SetTech('${t.key}')" style="padding:6px 14px;background:var(--bg-card);border:1px solid var(--border2);border-radius:8px;cursor:pointer;color:var(--text-muted);font-size:12px">${t.icon} ${t.label}</button>`).join('')}
      </div>
    </div>`;
  }

  function renderResultsEmpty() {
    return `<div style="padding:24px;text-align:center;color:var(--text-muted)">
      <div style="font-size:36px;margin-bottom:12px">📊</div>
      <div style="font-size:13px">I risultati appariranno qui dopo aver selezionato una macchina e inserito i dati</div>
    </div>`;
  }

  /* ── Calculator form ─────────────────────────────────────── */
  function renderCalculator() {
    const m = _selectedMachine;
    const st = loadState();
    const val = (k, def) => st[k] !== undefined ? st[k] : def;

    return `
    <div>
      <!-- Machine Header -->
      <div class="lcv2-card" style="background:linear-gradient(135deg,${m.color}18,${m.color}08);border-color:${m.color}40;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="lcv2-machine-icon" style="background:${m.color}30;width:44px;height:44px;font-size:22px">${m.icon}</div>
          <div>
            <div style="font-size:16px;font-weight:900;color:var(--text)">${m.brand} ${m.model}</div>
            <div style="font-size:11px;color:${m.color};font-weight:600">${m.tech} · ${m.power_w}W · Area: ${m.area}mm</div>
          </div>
          <div style="margin-left:auto;display:flex;gap:6px">
            <button onclick="_lcv2EditMachine('${m.id}')" style="background:${m.color}20;border:1px solid ${m.color}40;border-radius:6px;color:${m.color};cursor:pointer;font-size:10px;padding:4px 10px">✏️ Modifica</button>
            <button onclick="_lcv2DupMachine('${m.id}')" style="background:var(--bg-card2);border:1px solid var(--border2);border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:10px;padding:4px 10px">⧉ Duplica</button>
          </div>
        </div>
      </div>

      <!-- Parametri Macchina -->
      <div class="lcv2-card">
        <div class="lcv2-card-title">⚙️ Parametri Macchina <span style="font-size:10px;font-weight:400;color:var(--text-muted)">(modifica e salva automaticamente)</span></div>
        <div class="lcv2-param-row">
          <div class="lcv2-field"><div class="lcv2-label">💰 Prezzo macchina €</div><input class="lcv2-input" id="lc-price" type="number" value="${val('price',m.price||1000)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
          <div class="lcv2-field"><div class="lcv2-label">⏱ Vita utile (ore)</div><input class="lcv2-input" id="lc-life" type="number" value="${val('life',m.depr_h||3000)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
        </div>
        <div class="lcv2-param-row three">
          <div class="lcv2-field"><div class="lcv2-label">⚡ Potenza kW</div><input class="lcv2-input" id="lc-kw" type="number" step="0.01" value="${val('kw',+(m.power_w/1000).toFixed(2)||1.2)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
          <div class="lcv2-field"><div class="lcv2-label">💡 €/kWh</div><input class="lcv2-input" id="lc-kwh" type="number" step="0.01" value="${val('kwh',0.28)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
          <div class="lcv2-field"><div class="lcv2-label">🔧 Manut. €/h</div><input class="lcv2-input" id="lc-maint" type="number" step="0.01" value="${val('maint',0.50)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
        </div>
        <div class="lcv2-param-row three">
          <div class="lcv2-field"><div class="lcv2-label">👤 Operatore €/h</div><input class="lcv2-input" id="lc-labor" type="number" value="${val('labor',15)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
          <div class="lcv2-field"><div class="lcv2-label">🛒 Consumabili €/h</div><input class="lcv2-input" id="lc-cons" type="number" step="0.01" value="${val('cons',0.30)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
          <div class="lcv2-field"><div class="lcv2-label">📦 Imballo €/pz</div><input class="lcv2-input" id="lc-pack" type="number" step="0.01" value="${val('pack',0.20)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);padding:6px 8px;background:var(--bg-card2);border-radius:6px;margin-top:4px">
          💡 Costo ora macchina: <strong id="lc-cost-per-hour" style="color:var(--primary,#818cf8)">€0.00/h</strong> · 
          Costo minuto: <strong id="lc-cost-per-min" style="color:var(--primary,#818cf8)">€0.000/min</strong>
        </div>
      </div>

      <!-- Dati Lavorazione -->
      <div class="lcv2-card">
        <div class="lcv2-card-title">📐 Dati Lavorazione</div>
        <div class="lcv2-param-row">
          <div class="lcv2-field"><div class="lcv2-label">Nome lavoro</div><input class="lcv2-input" id="lc-name" type="text" value="${val('name','Lavorazione Laser')}" placeholder="es: Incisione logo..." oninput="_lcv2Save()"></div>
          <div class="lcv2-field"><div class="lcv2-label">📦 Quantità</div><input class="lcv2-input" id="lc-qty" type="number" min="1" value="${val('qty',1)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
        </div>
        <div class="lcv2-param-row three">
          <div class="lcv2-field"><div class="lcv2-label">↔ Largh. (mm)</div><input class="lcv2-input" id="lc-w" type="number" value="${val('w','')}" placeholder="es: 200" oninput="_lcv2AutoCalc()"></div>
          <div class="lcv2-field"><div class="lcv2-label">↕ Alt. (mm)</div><input class="lcv2-input" id="lc-h" type="number" value="${val('h','')}" placeholder="es: 150" oninput="_lcv2AutoCalc()"></div>
          <div class="lcv2-field"><div class="lcv2-label">📐 Spessore (mm)</div><input class="lcv2-input" id="lc-thick" type="number" step="0.1" value="${val('thick','')}" placeholder="es: 3"></div>
        </div>
        <div class="lcv2-param-row three">
          <div class="lcv2-field"><div class="lcv2-label">⏱ Tempo macchina (min)</div><input class="lcv2-input" id="lc-machine-min" type="number" step="0.1" value="${val('machine_min','')}" placeholder="Auto" oninput="_lcv2Save();_lcv2Recalc()"><div id="lc-machine-hint" style="font-size:9px;color:var(--text-dim);margin-top:2px"></div></div>
          <div class="lcv2-field"><div class="lcv2-label">⚙️ Setup (min)</div><input class="lcv2-input" id="lc-setup-min" type="number" step="0.5" value="${val('setup_min',5)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
          <div class="lcv2-field"><div class="lcv2-label">🧹 Pulizia (min)</div><input class="lcv2-input" id="lc-clean-min" type="number" step="0.5" value="${val('clean_min',2)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
        </div>

        <!-- Materiale -->
        <div class="lcv2-card-title" style="margin-top:8px;margin-bottom:8px">🪵 Materiale</div>
        <div class="lcv2-param-row">
          <div class="lcv2-field">
            <div class="lcv2-label">Materiale</div>
            <div style="display:flex;gap:4px">
              <input class="lcv2-input" id="lc-mat-name" type="text" value="${val('mat_name','')}" placeholder="es: Compensato 3mm" oninput="_lcv2Save()" style="flex:1">
              <button onclick="_lcv2PickMaterial()" style="padding:6px 10px;background:var(--bg-card2);border:1px solid var(--border2);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-muted)">📦 Magazzino</button>
            </div>
          </div>
          <div class="lcv2-field"><div class="lcv2-label">💶 Costo materiale €</div><input class="lcv2-input" id="lc-mat" type="number" step="0.01" value="${val('mat',0)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
        </div>

        <!-- Spedizione e progettazione -->
        <div class="lcv2-param-row three" style="margin-top:4px">
          <div class="lcv2-field"><div class="lcv2-label">🚚 Spedizione €</div><input class="lcv2-input" id="lc-ship" type="number" step="0.01" value="${val('ship',0)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
          <div class="lcv2-field"><div class="lcv2-label">🎨 Progettazione €</div><input class="lcv2-input" id="lc-design" type="number" step="0.01" value="${val('design',0)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
          <div class="lcv2-field"><div class="lcv2-label">🎁 Extra €</div><input class="lcv2-input" id="lc-extra-fixed" type="number" step="0.01" value="${val('extra_fixed',0)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
        </div>
      </div>

      <!-- Costi Aggiuntivi illimitati -->
      <div class="lcv2-card">
        <div class="lcv2-card-title">➕ Costi Aggiuntivi <button onclick="_lcv2AddExtra()" style="margin-left:auto;background:var(--primary)20;border:1px solid var(--primary)40;border-radius:5px;color:var(--primary,#818cf8);cursor:pointer;font-size:10px;padding:2px 8px">+ Aggiungi</button></div>
        <div id="lc-extras"></div>
      </div>

      <!-- Prezzi e Margini -->
      <div class="lcv2-card">
        <div class="lcv2-card-title">💰 Prezzi e Margini</div>
        <div class="lcv2-param-row three">
          <div class="lcv2-field"><div class="lcv2-label">× Margine campione</div><input class="lcv2-input" id="lc-mk1" type="number" step="0.1" value="${val('mk1',3.5)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
          <div class="lcv2-field"><div class="lcv2-label">× Margine kit</div><input class="lcv2-input" id="lc-mk2" type="number" step="0.1" value="${val('mk2',2.8)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
          <div class="lcv2-field"><div class="lcv2-label">× Margine stock</div><input class="lcv2-input" id="lc-mk3" type="number" step="0.1" value="${val('mk3',2.2)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
        </div>
        <div class="lcv2-param-row">
          <div class="lcv2-field"><div class="lcv2-label">💸 Sconto %</div><input class="lcv2-input" id="lc-disc" type="number" min="0" max="100" value="${val('disc',0)}" oninput="_lcv2Save();_lcv2Recalc()"></div>
          <div class="lcv2-field"><div class="lcv2-label">🧾 IVA %</div><select class="lcv2-input" id="lc-iva" onchange="_lcv2Save();_lcv2Recalc()"><option value="0" ${val('iva',22)==0?'selected':''}>Esente (0%)</option><option value="4" ${val('iva',22)==4?'selected':''}>Ridotta (4%)</option><option value="10" ${val('iva',22)==10?'selected':''}>Agevolata (10%)</option><option value="22" ${val('iva',22)==22?'selected':''}>Ordinaria (22%)</option></select></div>
        </div>
      </div>

      <!-- Actions -->
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="_lcv2SendToQuoter()" style="flex:1;padding:10px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:9px;cursor:pointer;font-weight:700;font-size:13px">📄 Invia a Quoter</button>
        <button onclick="_lcv2SavePreset()" style="padding:10px 14px;background:var(--bg-card);border:1px solid var(--border2);border-radius:9px;cursor:pointer;color:var(--text-muted);font-size:12px">💾 Salva Preset</button>
        <button onclick="_lcv2Reset()" style="padding:10px 14px;background:var(--bg-card);border:1px solid var(--border2);border-radius:9px;cursor:pointer;color:var(--text-muted);font-size:12px">↺ Reset</button>
      </div>
    </div>`;
  }

  /* ── Results panel ────────────────────────────────────────── */
  function renderResults() {
    return `
    <div>
      <div style="padding:12px 14px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);background:var(--bg-card);position:sticky;top:0">📊 Risultati</div>
      <div style="padding:14px">
        <!-- Cost breakdown -->
        <div id="lcv2-breakdown" style="margin-bottom:12px"></div>

        <!-- Pie chart placeholder -->
        <div id="lcv2-chart" style="margin-bottom:12px"></div>

        <!-- Tier prices -->
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Prezzi di Vendita</div>
        <div id="lcv2-tiers" style="display:flex;flex-direction:column;gap:8px"></div>

        <!-- AI tips -->
        <div id="lcv2-ai-tips" style="margin-top:12px"></div>

        <!-- Tier selector for quoter -->
        <div style="margin-top:12px">
          <select id="lcv2-tier-select" class="lcv2-input" style="width:100%">
            <option value="0">🧪 Campione (×mk1)</option>
            <option value="1" selected>🎒 Kit (×mk2) — Consigliato</option>
            <option value="2">📦 Stock (×mk3)</option>
            <option value="custom">📝 Prezzo personalizzato</option>
          </select>
          <div id="lcv2-custom-price-wrap" style="display:none;margin-top:6px">
            <input id="lcv2-custom-price" class="lcv2-input" type="number" step="0.01" placeholder="€ prezzo personalizzato" oninput="_lcv2Recalc()">
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ── Core calculation ─────────────────────────────────────── */
  function eid(id) { return document.getElementById(id); }
  function gv(id, def) { const el = eid(id); return el ? (parseFloat(el.value)||def||0) : (def||0); }
  function gs(id, def) { const el = eid(id); return el ? (el.value||def||'') : (def||''); }

  function recalc() {
    if (!_selectedMachine) return;

    /* Machine cost per minute */
    const price    = gv('lc-price', _selectedMachine.price || 1000);
    const lifeH    = gv('lc-life', _selectedMachine.depr_h || 3000);
    const kw       = gv('lc-kw', _selectedMachine.power_w/1000 || 1.2);
    const kwh      = gv('lc-kwh', 0.28);
    const maint    = gv('lc-maint', 0.50);   /* €/h */
    const cons     = gv('lc-cons', 0.30);    /* €/h */
    const labor    = gv('lc-labor', 15);     /* €/h */
    const pack     = gv('lc-pack', 0.20);    /* €/pz */

    const deprH       = lifeH > 0 ? price / lifeH : 0;     /* €/h depreciation */
    const energyH     = kw * kwh;                            /* €/h energy */
    const totalMachH  = deprH + energyH + maint + cons;     /* €/h machine */
    const totalLaborH = labor;                                /* €/h labor */
    const totalH      = totalMachH + totalLaborH;

    const cpm = totalH / 60; /* cost per minute */

    /* Update machine cost display */
    const cphEl = eid('lc-cost-per-hour'); if (cphEl) cphEl.textContent = '€' + totalH.toFixed(2) + '/h';
    const cpmEl = eid('lc-cost-per-min');  if (cpmEl) cpmEl.textContent = '€' + cpm.toFixed(4) + '/min';

    /* Work data */
    const w       = gv('lc-w', 0);
    const h_dim   = gv('lc-h', 0);
    const qty     = Math.max(1, gv('lc-qty', 1));
    const machMin = gv('lc-machine-min', 0) || (w && h_dim ? +(w*h_dim/10000).toFixed(2) : 0);
    const setupMin= gv('lc-setup-min', 5);
    const cleanMin= gv('lc-clean-min', 2);

    /* Update auto-hint */
    const hint = eid('lc-machine-hint');
    if (hint && w && h_dim && !gv('lc-machine-min',0)) {
      hint.textContent = `Auto: ~${machMin.toFixed(1)}min (${w}×${h_dim}mm)`;
    }

    /* Cost components */
    const costMachine = machMin  * cpm;
    const costSetup   = setupMin * cpm;
    const costClean   = cleanMin * cpm;
    const costMat     = gv('lc-mat', 0);
    const costShip    = gv('lc-ship', 0);
    const costDesign  = gv('lc-design', 0);
    const costExtraF  = gv('lc-extra-fixed', 0);
    const costPack    = pack;

    /* Extra costs from dynamic list */
    let costExtras = 0;
    _extraCosts.forEach((ec, i) => {
      const v = gv('lc-extra-val-'+i, 0);
      const pct = gv('lc-extra-pct-'+i, 0);
      costExtras += v + (pct > 0 ? costMat * pct / 100 : 0);
    });

    const subtotal = costMachine + costSetup + costClean + costMat + costShip + costDesign + costExtraF + costPack + costExtras;
    const total    = subtotal;

    /* Margin multipliers */
    const mk1 = gv('lc-mk1', 3.5);
    const mk2 = gv('lc-mk2', 2.8);
    const mk3 = gv('lc-mk3', 2.2);
    const disc = gv('lc-disc', 0);
    const iva  = gv('lc-iva', 22);

    const p1raw = total * mk1;
    const p2raw = total * mk2;
    const p3raw = total * mk3;
    const applyDisc = v => +(v * (1 - disc/100)).toFixed(2);
    const applyIva  = v => +(v * (1 + iva/100)).toFixed(2);
    const p1 = applyDisc(p1raw);
    const p2 = applyDisc(p2raw);
    const p3 = applyDisc(p3raw);

    _calcResult = { total, qty, p1, p2, p3, breakdown: {
      machine: costMachine, setup: costSetup, clean: costClean,
      mat: costMat, ship: costShip, design: costDesign, pack: costPack,
      extras: costExtraF + costExtras
    }};

    /* Render breakdown */
    const bdEl = eid('lcv2-breakdown');
    if (bdEl) {
      const items = [
        ['⚙️ Macchina', costMachine],
        ['🔧 Setup + Pulizia', costSetup+costClean],
        ['🪵 Materiale', costMat],
        ['📦 Imballo', costPack],
        ['🚚 Spedizione', costShip],
        ['🎨 Progettazione', costDesign],
        ['➕ Extra', costExtraF+costExtras],
      ].filter(r => r[1] > 0);

      const pctOf = v => total>0 ? Math.round(v/total*100) : 0;
      bdEl.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Ripartizione Costi</div>
        ${items.map(([label, val]) => `
          <div class="lcv2-result-row">
            <span style="color:var(--text-muted)">${label}</span>
            <span style="display:flex;align-items:center;gap:6px">
              <span style="font-size:9px;color:var(--text-dim)">${pctOf(val)}%</span>
              <span style="font-weight:700;color:var(--text)">€${val.toFixed(2)}</span>
            </span>
          </div>`).join('')}
        <div class="lcv2-cost-total">
          <div style="font-size:11px;color:var(--primary,#818cf8);margin-bottom:4px">💰 Costo Reale Unitario</div>
          <div style="font-size:28px;font-weight:900;color:#fff">€${total.toFixed(2)}</div>
          ${qty>1 ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">× ${qty} pz = <strong style="color:var(--primary,#818cf8)">€${(total*qty).toFixed(2)}</strong></div>` : ''}
        </div>
      `;
    }

    /* Render tiers */
    const tiersEl = eid('lcv2-tiers');
    if (tiersEl) {
      const margin = (p, c) => p>0 ? Math.round((p-c)/p*100) : 0;
      const tiers = [
        { label:'🧪 Campione', sub:'Singolo / prova', price:p1, mk:mk1, color:'#64748b' },
        { label:'🎒 Kit',      sub:'Piccola serie',   price:p2, mk:mk2, color:'#10b981', rec:true },
        { label:'📦 Stock',    sub:'Grande serie',    price:p3, mk:mk3, color:'#6366f1' },
      ];
      tiersEl.innerHTML = tiers.map((t,i) => `
        <div class="lcv2-tier-card" style="background:linear-gradient(135deg,${t.color}15,${t.color}08);border-color:${t.color}30" onclick="_lcv2SelectTierEl(${i},${t.price})">
          ${t.rec ? '<div style="font-size:9px;color:#10b981;font-weight:700;margin-bottom:3px">⭐ CONSIGLIATO</div>' : ''}
          <div style="font-size:12px;font-weight:700;color:${t.color}">${t.label}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:6px">${t.sub} · ×${t.mk}</div>
          <div style="font-size:24px;font-weight:900;color:#fff">€${t.price.toFixed(2)}</div>
          ${iva>0 ? `<div style="font-size:9px;color:var(--text-dim)">IVA incl: €${applyIva(t.price).toFixed(2)}</div>` : ''}
          <div style="font-size:10px;color:${t.color};margin-top:4px">Margine ${margin(t.price,total)}%</div>
          ${qty>1 ? `<div style="font-size:10px;color:var(--text-muted);margin-top:3px">Totale ×${qty}: €${(t.price*qty).toFixed(2)}</div>` : ''}
        </div>`).join('');
    }

    /* AI tips */
    const aiEl = eid('lcv2-ai-tips');
    if (aiEl) {
      const tips = [];
      const margin1 = total>0 ? (p1-total)/p1*100 : 0;
      if (margin1 < 40) tips.push({ icon:'⚠️', text:`Margine campione basso (${margin1.toFixed(0)}%). Considera di aumentare mk1 o ridurre i costi.` });
      if (costMat > total*0.6) tips.push({ icon:'💡', text:`Il materiale rappresenta ${pctOf(costMat)}% del costo. Cerca un fornitore alternativo o acquista in volume.` });
      if (machMin < 1 && w > 0) tips.push({ icon:'⏱', text:'Tempo macchina molto breve. Verifica che sia corretto.' });
      if (disc > 20) tips.push({ icon:'📉', text:`Sconto alto (${disc}%). Valuta l'impatto sul margine.` });
      aiEl.innerHTML = tips.map(t => `<div class="lcv2-ai-tip"><span>${t.icon}</span><span>${t.text}</span></div>`).join('') ||
        '<div class="lcv2-ai-tip"><span>✅</span><span>Calcolo corretto. Parametri nella norma.</span></div>';
    }

    /* Mini bar chart (CSS only) */
    const chartEl = eid('lcv2-chart');
    if (chartEl && total > 0) {
      const items = [
        ['Macchina',    costMachine+costSetup+costClean, '#6366f1'],
        ['Materiale',   costMat,    '#10b981'],
        ['Imballo',     costPack,   '#f59e0b'],
        ['Extra',       costExtraF+costExtras+costShip+costDesign, '#ef4444'],
      ].filter(r => r[1] > 0);
      chartEl.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Composizione Costi</div>
        <div style="background:var(--border2,#2d3f50);border-radius:6px;overflow:hidden;height:12px;display:flex;margin-bottom:6px">
          ${items.map(([, val, color]) => `<div style="height:100%;width:${Math.round(val/total*100)}%;background:${color};transition:.4s"></div>`).join('')}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${items.map(([label, val, color]) => `<div style="font-size:10px;color:var(--text-muted);display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block"></span>${label} ${Math.round(val/total*100)}%</div>`).join('')}
        </div>`;
      function pctOf(v) { return total>0 ? Math.round(v/total*100) : 0; }
    }

    /* Handle custom tier selector */
    const tierSel = eid('lcv2-tier-select');
    const customWrap = eid('lcv2-custom-price-wrap');
    if (tierSel && customWrap) {
      customWrap.style.display = tierSel.value === 'custom' ? 'block' : 'none';
    }
  }

  /* ── Event handlers ──────────────────────────────────────── */
  window._lcv2SelectMachine = function(id) {
    _selectedMachine = allMachines().find(m => m.id === id) || null;
    addHistory(id);
    render();
    setTimeout(() => recalc(), 50);
  };

  window._lcv2SetTech = function(tech) {
    _techFilter = tech;
    document.querySelectorAll('.lcv2-tech-btn').forEach(b => {
      b.classList.toggle('active', b.textContent.includes(TECH_GROUPS.find(t=>t.key===tech)?.label||'_'));
    });
    renderMachineList();
  };

  window._lcv2Search = function(q) {
    _searchQ = q;
    renderMachineList();
  };

  window._lcv2ToggleFav = function(id) {
    const favs = loadFavs();
    const idx = favs.indexOf(id);
    if (idx > -1) favs.splice(idx, 1); else favs.unshift(id);
    saveFavs(favs);
    renderMachineList();
  };

  window._lcv2Save = function() {
    const st = {
      price:         gv('lc-price',0),    life:          gv('lc-life',0),
      kw:            gv('lc-kw',0),       kwh:           gv('lc-kwh',0.28),
      maint:         gv('lc-maint',0),    cons:          gv('lc-cons',0),
      labor:         gv('lc-labor',15),   pack:          gv('lc-pack',0.20),
      name:          gs('lc-name',''),    qty:           gv('lc-qty',1),
      w:             gv('lc-w',0),        h:             gv('lc-h',0),
      thick:         gv('lc-thick',0),    machine_min:   gv('lc-machine-min',0),
      setup_min:     gv('lc-setup-min',5),clean_min:     gv('lc-clean-min',2),
      mat_name:      gs('lc-mat-name',''),mat:           gv('lc-mat',0),
      ship:          gv('lc-ship',0),     design:        gv('lc-design',0),
      extra_fixed:   gv('lc-extra-fixed',0),
      mk1:           gv('lc-mk1',3.5),   mk2:           gv('lc-mk2',2.8),
      mk3:           gv('lc-mk3',2.2),   disc:          gv('lc-disc',0),
      iva:           gv('lc-iva',22),
      machine_id:    _selectedMachine?.id,
    };
    saveState(st);
  };

  window._lcv2Recalc = function() { recalc(); };

  window._lcv2AutoCalc = function() {
    _lcv2Save();
    const w = gv('lc-w',0), h = gv('lc-h',0);
    const hint = eid('lc-machine-hint');
    if (hint && w && h && !gv('lc-machine-min',0)) {
      hint.textContent = `Auto: ~${+(w*h/10000).toFixed(2)}min (area ${w}×${h}mm)`;
    }
    recalc();
  };

  window._lcv2AddExtra = function() {
    _extraCosts.push({ name:'', value:0, pct:0 });
    renderExtraList();
  };

  window._lcv2RemoveExtra = function(i) {
    _extraCosts.splice(i, 1);
    renderExtraList();
    recalc();
  };

  function renderExtraList() {
    const el = eid('lc-extras');
    if (!el) return;
    el.innerHTML = _extraCosts.map((ec, i) => `
      <div class="lcv2-extra-row">
        <input class="lcv2-extra-input" placeholder="Nome costo..." value="${ec.name||''}" oninput="_extraCosts[${i}].name=this.value">
        <input class="lcv2-extra-input" type="number" step="0.01" placeholder="€ fisso" value="${ec.value||''}" id="lc-extra-val-${i}" oninput="_lcv2Recalc()" style="width:80px">
        <input class="lcv2-extra-input" type="number" step="0.1" placeholder="% su mat." value="${ec.pct||''}" id="lc-extra-pct-${i}" oninput="_lcv2Recalc()" style="width:70px">
        <button onclick="_lcv2RemoveExtra(${i})" style="background:#ef444420;border:1px solid #ef444440;border-radius:5px;color:#ef4444;cursor:pointer;padding:4px 8px;font-size:11px">✕</button>
      </div>`).join('');
  }

  window._lcv2SelectTierEl = function(idx, price) {
    document.querySelectorAll('.lcv2-tier-card').forEach((c,i) => c.classList.toggle('selected', i===idx));
    const sel = eid('lcv2-tier-select');
    if (sel) sel.value = String(idx);
  };

  window._lcv2SendToQuoter = function() {
    if (!_calcResult) { if(typeof toast==='function') toast('Calcola prima i costi','warning'); return; }
    const sel     = eid('lcv2-tier-select');
    const selIdx  = sel ? sel.value : '1';
    let price = selIdx === 'custom' ? gv('lcv2-custom-price', 0) : [_calcResult.p1, _calcResult.p2, _calcResult.p3][parseInt(selIdx)||1];
    const name = gs('lc-name', 'Lavorazione Laser') || (_selectedMachine ? _selectedMachine.brand+' '+_selectedMachine.model : 'Lavorazione');
    const qty  = Math.max(1, gv('lc-qty',1));
    if (!price) { if(typeof toast==='function') toast('Inserisci i dati per calcolare il prezzo','warning'); return; }
    if (typeof App !== 'undefined') App.navigate('quoter');
    setTimeout(() => {
      if (typeof Quoter !== 'undefined' && Quoter.addLineFromCalc) {
        Quoter.addLineFromCalc({ name, unitCost: price, qty });
        if(typeof toast==='function') toast('✅ Aggiunto al Quoter: '+name+' €'+price.toFixed(2),'success');
      }
    }, 400);
  };

  window._lcv2Reset = function() {
    localStorage.removeItem(LS_KEY);
    _extraCosts = [];
    render();
    if(typeof toast==='function') toast('Dati azzerati','info');
  };

  window._lcv2SavePreset = function() {
    _lcv2Save();
    if(typeof toast==='function') toast('💾 Preset salvato','success');
  };

  window._lcv2PickMaterial = function() {
    /* Try to open Materials picker if available */
    if (typeof Materials !== 'undefined' && Materials._showPickerModal) {
      Materials._showPickerModal(function(mat) {
        const nameEl = eid('lc-mat-name');
        const costEl = eid('lc-mat');
        if (nameEl) nameEl.value = mat.nome || mat.name || '';
        if (costEl) costEl.value = mat.prezzo || mat.price || 0;
        _lcv2Save(); recalc();
      });
    } else {
      if(typeof toast==='function') toast('Aggiungi materiali nel Magazzino prima','info');
    }
  };

  /* ── Add/Edit/Duplicate machine ───────────────────────────── */
  window._lcv2AddMachine = function(clone) {
    const m = clone || { id:genId(), brand:'', model:'', tech:'', power_w:0, area:'', price:0, color:'#6366f1', icon:'⚡', depr_h:3000 };
    const isEdit = !!clone;
    const existingCustom = loadCustom();
    if (typeof openModal !== 'function') { alert('openModal non disponibile'); return; }
    openModal(`
      <div class="modal modal-md" style="font-family:Inter,system-ui">
        <div class="modal-header">
          <div style="font-weight:700;color:var(--text)">${isEdit&&clone.id?'✏️ Modifica':'➕ Nuova'} Macchina</div>
          <button onclick="closeModal()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:18px">×</button>
        </div>
        <div class="modal-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="form-group"><label>Marca *</label><input id="_mch_brand" class="form-control" value="${m.brand}" placeholder="es: xTool"></div>
            <div class="form-group"><label>Modello *</label><input id="_mch_model" class="form-control" value="${m.model}" placeholder="es: P3"></div>
            <div class="form-group"><label>Tecnologia</label><select id="_mch_tech" class="form-control">
              ${['Diode','CO₂','Fibra','Fibra MOPA','DTF','UV','Sublimazione','Pressa caldo','CNC','Altro'].map(t=>`<option ${m.tech===t?'selected':''}>${t}</option>`).join('')}
            </select></div>
            <div class="form-group"><label>Potenza (W)</label><input id="_mch_pw" class="form-control" type="number" value="${m.power_w}"></div>
            <div class="form-group"><label>Area lavoro (mm)</label><input id="_mch_area" class="form-control" value="${m.area}" placeholder="es: 400×400"></div>
            <div class="form-group"><label>Prezzo acquisto €</label><input id="_mch_price" class="form-control" type="number" value="${m.price}"></div>
            <div class="form-group"><label>Vita utile (ore)</label><input id="_mch_life" class="form-control" type="number" value="${m.depr_h}"></div>
            <div class="form-group"><label>Icona (emoji)</label><input id="_mch_icon" class="form-control" value="${m.icon}" placeholder="⚡"></div>
            <div class="form-group"><label>Colore brand</label><input id="_mch_color" class="form-control" type="color" value="${m.color}"></div>
            <div class="form-group"><label>Note</label><input id="_mch_note" class="form-control" value="${m.note||''}" placeholder="Note opzionali"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="closeModal()" style="padding:8px 16px;background:var(--bg-card2);border:1px solid var(--border2);border-radius:8px;cursor:pointer;color:var(--text-muted);font-family:inherit">Annulla</button>
          <button id="_mch_save_btn" data-mid="${m.id}" style="padding:8px 18px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit">💾 Salva Macchina</button>
        </div>
      </div>`);
    setTimeout(() => {
      const saveBtn = document.getElementById('_mch_save_btn');
      if (!saveBtn) return;
      saveBtn.addEventListener('click', function() {
        const brand = (document.getElementById('_mch_brand')||{value:''}).value.trim();
        const model = (document.getElementById('_mch_model')||{value:''}).value.trim();
        if (!brand || !model) { if(typeof toast==='function') toast('Inserisci marca e modello','error'); return; }
        const newM = {
          id:       m.id,
          brand, model,
          tech:     (document.getElementById('_mch_tech')||{value:'Altro'}).value,
          power_w:  parseFloat((document.getElementById('_mch_pw')||{value:0}).value)||0,
          area:     (document.getElementById('_mch_area')||{value:''}).value,
          price:    parseFloat((document.getElementById('_mch_price')||{value:0}).value)||0,
          depr_h:   parseFloat((document.getElementById('_mch_life')||{value:3000}).value)||3000,
          icon:     (document.getElementById('_mch_icon')||{value:'⚡'}).value||'⚡',
          color:    (document.getElementById('_mch_color')||{value:'#6366f1'}).value,
          note:     (document.getElementById('_mch_note')||{value:''}).value,
          custom:   true,
        };
        const customs = loadCustom().filter(x => x.id !== newM.id);
        customs.unshift(newM);
        saveCustom(customs);
        closeModal();
        if(typeof toast==='function') toast('✅ Macchina salvata: '+brand+' '+model,'success');
        _selectedMachine = newM;
        addHistory(newM.id);
        render();
        setTimeout(() => recalc(), 50);
      });
    }, 50);
  };

  window._lcv2EditMachine = function(id) {
    const customs = loadCustom();
    const existing = customs.find(m => m.id === id);
    if (existing) {
      _lcv2AddMachine(existing);
    } else {
      /* Editing a built-in: clone it as custom */
      const builtin = MACHINE_DB.find(m => m.id === id);
      if (builtin) {
        const clone = { ...builtin, id: genId(), custom: true };
        _lcv2AddMachine(clone);
        if(typeof toast==='function') toast('Creata copia personalizzabile della macchina','info');
      }
    }
  };

  window._lcv2DupMachine = function(id) {
    const m = allMachines().find(m => m.id === id);
    if (!m) return;
    const clone = { ...m, id: genId(), model: m.model+' (copia)', custom: true };
    const customs = loadCustom();
    customs.unshift(clone);
    saveCustom(customs);
    _selectedMachine = clone;
    addHistory(clone.id);
    if(typeof toast==='function') toast('Macchina duplicata: '+clone.brand+' '+clone.model,'success');
    render();
    setTimeout(() => recalc(), 50);
  };

  /* ── Main render function exposed to App ──────────────────── */
  window.LaserCalcV2 = { render };

  /* Restore last machine */
  const st = loadState();
  if (st.machine_id) {
    _selectedMachine = allMachines().find(m => m.id === st.machine_id) || null;
  }

  /* Hook into App navigation */
  (function hookNav() {
    let tries = 0;
    const iv = setInterval(function() {
      tries++;
      if (tries > 100) { clearInterval(iv); return; }
      if (!window.App || !App.navigate) return;
      clearInterval(iv);

      /* Patch App.renderSection to call our render */
      const origNav = App.navigate.bind(App);
      App.navigate = function(section) {
        const r = origNav(section);
        if (section === 'lasercalc') {
          setTimeout(function() {
            const el = document.getElementById('view-lasercalc');
            if (el && el.children.length === 0) render();
            else if (el) render();
          }, 80);
        }
        return r;
      };
      console.log('[LaserCalcV2] Hooked to App.navigate');
    }, 300);
  })();

})();

