
/* ═══════════════════════════════════════════════════════════════
   INGLY OS — CALCOLATORE MACCHINE v4.0
   Modulo completo: DB 90+ macchine, CRUD full, sync Magazzino,
   Export/Import, Preferiti, Cronologia, AI tips, Quoter bridge.
   ═══════════════════════════════════════════════════════════════ */
;(function CalcolatoreV4(){
  'use strict';
  if(window._calcMacchineV4) return;
  window._calcMacchineV4 = true;

  /* ── LocalStorage helpers ─────────────────────────────── */
  var LS = {
    get: function(k,d){ try{ var v=localStorage.getItem(k); return v!=null?JSON.parse(v):d; }catch(e){return d;} },
    set: function(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} },
    del: function(k){   try{ localStorage.removeItem(k); }catch(e){} }
  };

  var K = {
    custom:  'v4_cm_custom',    // custom machines
    favs:    'v4_cm_favs',      // favourites []
    history: 'v4_cm_history',   // recently used []
    sel:     'v4_cm_sel',       // selected machine id
    input:   'v4_cm_input',     // calc inputs
    extras:  'v4_cm_extras',    // extra costs {}
    tech:    'v4_cm_tech',      // tech filter
    presets: 'v4_cm_presets',   // saved presets
  };

  function tt(m,t){ if(typeof toast!=='undefined')toast(m,t||'info'); }
  function eu(n){ return '€'+parseFloat(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:3}); }
  function uid(){ return 'cm-'+Date.now()+'-'+Math.random().toString(36).slice(2,5); }

  /* ── MACHINE DATABASE — 90+ macchine ═══════════════════ */
  var BUILT_IN = [
    /* ─── xTool (catalogo completo 2024/25) ─── */
    {id:'xt-f2',      brand:'xTool', model:'F2',         tech:'Diodo+IR',  power_w:20,  area:'430×390', price:999,  life_h:3000,  kw:0.080, maint:0.04, speed_cut:600,  speed_engr:10000, setup_min:5, color:'#fbbf24', icon:'⚡', note:'Diodo 20W + IR · multi-materiale · porta camera chiusa'},
    {id:'xt-f2-ultra',brand:'xTool', model:'F2 Ultra',   tech:'Diodo+IR',  power_w:40,  area:'430×390', price:1399, life_h:3000,  kw:0.120, maint:0.05, speed_cut:800,  speed_engr:12000, setup_min:5, color:'#f59e0b', icon:'⚡', note:'Diodo 40W + IR · più potente dell F2'},
    {id:'xt-f2-uv',   brand:'xTool', model:'F2 Ultra UV',tech:'UV+IR',     power_w:40,  area:'210×148', price:1699, life_h:3000,  kw:0.100, maint:0.03, speed_cut:0,    speed_engr:6000,  setup_min:5, color:'#a78bfa', icon:'🌈', note:'UV + Diodo + IR · stampa UV su qualsiasi superficie'},
    {id:'xt-m1',      brand:'xTool', model:'M1',         tech:'Diodo+Lama',power_w:10,  area:'385×300', price:599,  life_h:2000,  kw:0.060, maint:0.03, speed_cut:300,  speed_engr:6000,  setup_min:6, color:'#818cf8', icon:'⚡', note:'Laser 10W + lama taglio · vinile, carta, MDF sottile'},
    {id:'xt-m1u',     brand:'xTool', model:'M1 Ultra',   tech:'Diodo+Lama',power_w:20,  area:'385×305', price:1299, life_h:2000,  kw:0.080, maint:0.04, speed_cut:500,  speed_engr:8000,  setup_min:6, color:'#6366f1', icon:'⚡', note:'Laser 20W + lama · taglio + incisione professionale'},
    {id:'xt-m2',      brand:'xTool', model:'M2',         tech:'Diodo',     power_w:20,  area:'400×400', price:799,  life_h:3000,  kw:0.090, maint:0.04, speed_cut:500,  speed_engr:9000,  setup_min:5, color:'#38bdf8', icon:'🔷', note:'Diodo 20W · autofocus · camera chiusa · erede M1 Ultra'},
    {id:'xt-p2',      brand:'xTool', model:'P2',         tech:'CO₂',       power_w:55,  area:'430×300', price:2499, life_h:6000,  kw:0.120, maint:0.06, speed_cut:1000, speed_engr:12000, setup_min:5, color:'#3b82f6', icon:'🔵', note:'CO₂ 55W · MDF 6mm in 1 pass · acrilico 8mm'},
    {id:'xt-p2s',     brand:'xTool', model:'P2S',        tech:'CO₂',       power_w:55,  area:'430×300', price:2799, life_h:6000,  kw:0.130, maint:0.06, speed_cut:1200, speed_engr:13000, setup_min:5, color:'#1d4ed8', icon:'🔵', note:'P2 con air assist migliorato e camera ridisegnata'},
    {id:'xt-p3',      brand:'xTool', model:'P3',         tech:'Diodo',     power_w:20,  area:'430×390', price:799,  life_h:3000,  kw:0.065, maint:0.04, speed_cut:600,  speed_engr:10000, setup_min:5, color:'#06b6d4', icon:'🔷', note:'Diodo 20W · desktop compatto · ottimo per legno'},
    {id:'xt-p3-co2',  brand:'xTool', model:'P3 CO₂ 80W', tech:'CO₂',      power_w:80,  area:'500×300', price:3199, life_h:8000,  kw:0.160, maint:0.07, speed_cut:1500, speed_engr:15000, setup_min:5, color:'#6366f1', icon:'⚡', note:'CO₂ 80W · produzione di serie · grande area'},
    {id:'xt-s1',      brand:'xTool', model:'S1',         tech:'Diodo',     power_w:40,  area:'498×319', price:1799, life_h:3000,  kw:0.120, maint:0.05, speed_cut:800,  speed_engr:11000, setup_min:5, color:'#818cf8', icon:'⚡', note:'Diodo 40W · camera chiusa con air assist integrato'},
    {id:'xt-f1',      brand:'xTool', model:'F1',         tech:'Fibra',     power_w:20,  area:'115×115', price:1099, life_h:50000, kw:0.050, maint:0.02, speed_cut:0,    speed_engr:8000,  setup_min:4, color:'#7c3aed', icon:'💫', note:'Fibra 20W · portatile · marcatura metalli'},
    {id:'xt-f1u',     brand:'xTool', model:'F1 Ultra',   tech:'Fibra+CO₂', power_w:20,  area:'170×170', price:1699, life_h:50000, kw:0.070, maint:0.02, speed_cut:0,    speed_engr:10000, setup_min:4, color:'#a78bfa', icon:'💫', note:'Fibra + CO₂ · dual laser · metalli + non-metalli'},
    {id:'xt-d1',      brand:'xTool', model:'D1',         tech:'Diodo',     power_w:5,   area:'410×415', price:249,  life_h:2000,  kw:0.020, maint:0.02, speed_cut:150,  speed_engr:4000,  setup_min:5, color:'#94a3b8', icon:'⚡', note:'Diodo 5W · budget entry-level'},
    {id:'xt-d1pro',   brand:'xTool', model:'D1 Pro',     tech:'Diodo',     power_w:10,  area:'430×390', price:499,  life_h:2000,  kw:0.050, maint:0.03, speed_cut:400,  speed_engr:6000,  setup_min:5, color:'#64748b', icon:'⚡', note:'Diodo 10W · struttura rigida migliorata'},
    /* ─── Aeon ─── */
    {id:'ae-m5',      brand:'Aeon',  model:'Mira 5',     tech:'CO₂',       power_w:50,  area:'500×300', price:3200, life_h:8000,  kw:0.180, maint:0.08, speed_cut:1200, speed_engr:12000, setup_min:6, color:'#10b981', icon:'🔆', note:'CO₂ 50W · compatto pro · MDF 4mm, acrilico 6mm'},
    {id:'ae-m7',      brand:'Aeon',  model:'Mira 7',     tech:'CO₂',       power_w:80,  area:'700×500', price:5500, life_h:8000,  kw:0.250, maint:0.10, speed_cut:1500, speed_engr:14000, setup_min:6, color:'#059669', icon:'🔆', note:'CO₂ 80W · semi-industriale · grande produzione'},
    {id:'ae-n10',     brand:'Aeon',  model:'Nova 10',    tech:'CO₂',       power_w:100, area:'1000×600',price:7500, life_h:10000, kw:0.350, maint:0.12, speed_cut:2000, speed_engr:16000, setup_min:8, color:'#047857', icon:'🔆', note:'CO₂ 100W · industriale · grande formato'},
    {id:'ae-sn',      brand:'Aeon',  model:'Super Nova',  tech:'CO₂',      power_w:180, area:'1600×1000',price:15000,life_h:12000, kw:0.550, maint:0.18, speed_cut:3000, speed_engr:20000, setup_min:10,color:'#065f46', icon:'⭐', note:'CO₂ 180W · massima potenza Aeon · industriale pesante'},
    /* ─── Thunder Laser ─── */
    {id:'tl-bolt',    brand:'Thunder',model:'Bolt',       tech:'CO₂',       power_w:60,  area:'600×400', price:3800, life_h:8000,  kw:0.200, maint:0.09, speed_cut:1500, speed_engr:14000, setup_min:6, color:'#f59e0b', icon:'⚡', note:'CO₂ 60W · affidabilità industriale'},
    {id:'tl-nova',    brand:'Thunder',model:'Nova',        tech:'CO₂',      power_w:100, area:'900×600', price:7000, life_h:10000, kw:0.350, maint:0.12, speed_cut:2000, speed_engr:16000, setup_min:8, color:'#d97706', icon:'⚡', note:'CO₂ 100W · produzione ad alto volume'},
    {id:'tl-aurora',  brand:'Thunder',model:'Aurora',      tech:'Diodo',    power_w:22,  area:'420×400', price:999,  life_h:3000,  kw:0.080, maint:0.04, speed_cut:600,  speed_engr:8000,  setup_min:5, color:'#b45309', icon:'⚡', note:'Diodo 22W · open frame desktop'},
    /* ─── OMTech ─── */
    {id:'om-polar',   brand:'OMTech',model:'Polar',       tech:'CO₂',       power_w:50,  area:'300×210', price:1299, life_h:6000,  kw:0.120, maint:0.06, speed_cut:800,  speed_engr:10000, setup_min:5, color:'#06b6d4', icon:'❄️', note:'CO₂ 50W · compatto · rapporto qualità/prezzo'},
    {id:'om-turbo',   brand:'OMTech',model:'Turbo',       tech:'CO₂',       power_w:80,  area:'700×500', price:3500, life_h:8000,  kw:0.250, maint:0.10, speed_cut:1500, speed_engr:14000, setup_min:6, color:'#0891b2', icon:'🌀', note:'CO₂ 80W · alta velocità'},
    {id:'om-pronto',  brand:'OMTech',model:'Pronto',      tech:'CO₂',       power_w:60,  area:'400×400', price:2200, life_h:6000,  kw:0.180, maint:0.08, speed_cut:1200, speed_engr:12000, setup_min:5, color:'#0e7490', icon:'💨', note:'CO₂ 60W · formato quadrato versatile'},
    /* ─── Glowforge ─── */
    {id:'gf-aura',    brand:'Glowforge',model:'Aura',     tech:'Diodo',     power_w:6,   area:'279×508', price:599,  life_h:2000,  kw:0.030, maint:0.03, speed_cut:200,  speed_engr:3000,  setup_min:5, color:'#ec4899', icon:'🌸', note:'Diodo 6W · hobby entry level · camera chiusa'},
    {id:'gf-plus',    brand:'Glowforge',model:'Plus',     tech:'CO₂',       power_w:45,  area:'279×508', price:3499, life_h:5000,  kw:0.200, maint:0.09, speed_cut:1000, speed_engr:12000, setup_min:5, color:'#db2777', icon:'✨', note:'CO₂ 45W · cloud-based · legno, acrilico, pelle'},
    {id:'gf-pro',     brand:'Glowforge',model:'Pro',      tech:'CO₂',       power_w:45,  area:'279×508', price:4999, life_h:5000,  kw:0.240, maint:0.10, speed_cut:1200, speed_engr:13000, setup_min:5, color:'#be185d', icon:'💫', note:'CO₂ 45W · filtro aria integrato · uso professionale'},
    /* ─── Epilog ─── */
    {id:'ep-fe',      brand:'Epilog',model:'Fusion Edge', tech:'CO₂',       power_w:60,  area:'610×457', price:12000,life_h:10000, kw:0.300, maint:0.18, speed_cut:2000, speed_engr:18000, setup_min:6, color:'#ef4444', icon:'🔴', note:'CO₂ 60W · top di gamma professionale USA'},
    {id:'ep-fp',      brand:'Epilog',model:'Fusion Pro',  tech:'CO₂',       power_w:120, area:'864×610', price:25000,life_h:12000, kw:0.550, maint:0.30, speed_cut:3000, speed_engr:22000, setup_min:8, color:'#b91c1c', icon:'🔴', note:'CO₂ 120W · industriale premium'},
    /* ─── Trotec ─── */
    {id:'tr-s100',    brand:'Trotec',model:'Speedy 100',  tech:'CO₂',       power_w:60,  area:'610×305', price:8000, life_h:10000, kw:0.250, maint:0.15, speed_cut:1800, speed_engr:16000, setup_min:6, color:'#f97316', icon:'🟠', note:'CO₂ 60W · qualità tedesca · professionale'},
    {id:'tr-s300',    brand:'Trotec',model:'Speedy 300',  tech:'CO₂',       power_w:100, area:'726×432', price:15000,life_h:12000, kw:0.380, maint:0.20, speed_cut:2500, speed_engr:20000, setup_min:7, color:'#ea580c', icon:'🟠', note:'CO₂ 100W · lavorazione di serie'},
    {id:'tr-s400',    brand:'Trotec',model:'Speedy 400',  tech:'CO₂',       power_w:120, area:'1000×610',price:20000,life_h:12000, kw:0.500, maint:0.25, speed_cut:3000, speed_engr:24000, setup_min:8, color:'#c2410c', icon:'🟠', note:'CO₂ 120W · grande formato ad alta velocità'},
    /* ─── Monport ─── */
    {id:'mp-40',      brand:'Monport',model:'40W',        tech:'CO₂',       power_w:40,  area:'300×200', price:599,  life_h:5000,  kw:0.090, maint:0.04, speed_cut:500,  speed_engr:8000,  setup_min:5, color:'#14b8a6', icon:'🟢', note:'CO₂ 40W · budget · buon entry level'},
    {id:'mp-60',      brand:'Monport',model:'60W',        tech:'CO₂',       power_w:60,  area:'400×300', price:799,  life_h:5000,  kw:0.140, maint:0.05, speed_cut:700,  speed_engr:10000, setup_min:5, color:'#0d9488', icon:'🟢', note:'CO₂ 60W · rapporto qualità/prezzo ottimo'},
    {id:'mp-80',      brand:'Monport',model:'80W',        tech:'CO₂',       power_w:80,  area:'600×400', price:1299, life_h:6000,  kw:0.200, maint:0.07, speed_cut:1000, speed_engr:12000, setup_min:5, color:'#0f766e', icon:'🟢', note:'CO₂ 80W · piccola-media produzione'},
    /* ─── Gweike ─── */
    {id:'gw-cloud',   brand:'Gweike',model:'Cloud',       tech:'CO₂',       power_w:50,  area:'300×210', price:999,  life_h:5000,  kw:0.140, maint:0.06, speed_cut:700,  speed_engr:10000, setup_min:5, color:'#8b5cf6', icon:'☁️', note:'CO₂ 50W · cloud-ready · economico'},
    {id:'gw-lc6090',  brand:'Gweike',model:'LC6090',      tech:'CO₂',       power_w:80,  area:'600×900', price:2800, life_h:8000,  kw:0.280, maint:0.10, speed_cut:1400, speed_engr:14000, setup_min:7, color:'#7c3aed', icon:'🔆', note:'CO₂ 80W · grande formato'},
    {id:'gw-lf30',    brand:'Gweike',model:'LF30',        tech:'Fibra',     power_w:30,  area:'110×110', price:3500, life_h:60000, kw:0.080, maint:0.03, speed_cut:0,    speed_engr:20000, setup_min:4, color:'#6d28d9', icon:'🔥', note:'Fibra 30W · marcatura metalli ad alta velocità'},
    /* ─── LaserPecker ─── */
    {id:'lp-lp4',     brand:'LaserPecker',model:'LP4',    tech:'Diodo',     power_w:22,  area:'420×420', price:999,  life_h:2000,  kw:0.070, maint:0.04, speed_cut:400,  speed_engr:6000,  setup_min:4, color:'#c084fc', icon:'🖊️', note:'Diodo 22W · portatile con stand 3D integrato'},
    {id:'lp-lp5',     brand:'LaserPecker',model:'LP5',    tech:'Fibra',     power_w:20,  area:'100×100', price:1499, life_h:50000, kw:0.050, maint:0.02, speed_cut:0,    speed_engr:8000,  setup_min:4, color:'#a855f7', icon:'🖊️', note:'Fibra 20W · portatile · marcatura metalli'},
    /* ─── Creality Falcon ─── */
    {id:'cr-f10',     brand:'Creality',model:'Falcon 10W',tech:'Diodo',     power_w:10,  area:'400×415', price:299,  life_h:2000,  kw:0.040, maint:0.02, speed_cut:300,  speed_engr:5000,  setup_min:5, color:'#fbbf24', icon:'🦅', note:'Diodo 10W · budget entry level'},
    {id:'cr-f22',     brand:'Creality',model:'Falcon 22W',tech:'Diodo',     power_w:22,  area:'400×415', price:499,  life_h:2000,  kw:0.070, maint:0.03, speed_cut:500,  speed_engr:7000,  setup_min:5, color:'#f59e0b', icon:'🦅', note:'Diodo 22W · ottimo per legno e MDF'},
    {id:'cr-f40',     brand:'Creality',model:'Falcon 40W',tech:'Diodo',     power_w:40,  area:'400×415', price:699,  life_h:2000,  kw:0.120, maint:0.04, speed_cut:700,  speed_engr:9000,  setup_min:5, color:'#d97706', icon:'🦅', note:'Diodo 40W · massima potenza Creality'},
    /* ─── Atomstack ─── */
    {id:'at-a5',      brand:'Atomstack',model:'A5',       tech:'Diodo',     power_w:5,   area:'410×400', price:199,  life_h:2000,  kw:0.030, maint:0.02, speed_cut:200,  speed_engr:4000,  setup_min:5, color:'#84cc16', icon:'⚛️', note:'Diodo 5W · hobby entry level'},
    {id:'at-x20',     brand:'Atomstack',model:'X20',      tech:'Diodo',     power_w:20,  area:'400×400', price:399,  life_h:2000,  kw:0.070, maint:0.03, speed_cut:500,  speed_engr:7000,  setup_min:5, color:'#65a30d', icon:'⚛️', note:'Diodo 20W · laser combinato quadruplo'},
    {id:'at-x40',     brand:'Atomstack',model:'X40',      tech:'Diodo',     power_w:40,  area:'400×400', price:699,  life_h:2000,  kw:0.120, maint:0.04, speed_cut:700,  speed_engr:10000, setup_min:5, color:'#4d7c0f', icon:'⚛️', note:'Diodo 40W · massima potenza Atomstack'},
    /* ─── Sculpfun / TwoTrees / Snapmaker ─── */
    {id:'sc-s30',     brand:'Sculpfun',model:'S30',       tech:'Diodo',     power_w:30,  area:'400×400', price:299,  life_h:2000,  kw:0.070, maint:0.03, speed_cut:400,  speed_engr:6000,  setup_min:5, color:'#e879f9', icon:'🎭', note:'Diodo 30W · aria compressa integrata'},
    {id:'sm-art',     brand:'Snapmaker',model:'Artisan',  tech:'Diodo+CNC', power_w:20,  area:'400×400', price:2999, life_h:3000,  kw:0.120, maint:0.06, speed_cut:600,  speed_engr:8000,  setup_min:8, color:'#f472b6', icon:'🔧', note:'Diodo 20W + CNC + FDM · multifunzione premium'},
    {id:'sm-ray',     brand:'Snapmaker',model:'Ray',       tech:'Diodo',    power_w:40,  area:'400×400', price:799,  life_h:2000,  kw:0.090, maint:0.04, speed_cut:600,  speed_engr:9000,  setup_min:5, color:'#ec4899', icon:'☀️', note:'Diodo 40W · camera chiusa · air assist integrato'},
    /* ─── Fibra ─── */
    {id:'fi-20mopa',  brand:'Fibra',  model:'20W MOPA',   tech:'Fibra',     power_w:20,  area:'110×110', price:3500, life_h:50000, kw:0.050, maint:0.02, speed_cut:0,    speed_engr:15000, setup_min:4, color:'#f43f5e', icon:'🔥', note:'MOPA 20W · colori su acciaio inox · gioielli'},
    {id:'fi-30',      brand:'Fibra',  model:'30W Raycus', tech:'Fibra',     power_w:30,  area:'150×150', price:3000, life_h:60000, kw:0.080, maint:0.02, speed_cut:0,    speed_engr:20000, setup_min:4, color:'#e11d48', icon:'🔥', note:'Fibra Raycus 30W · alta velocità · metalli'},
    {id:'fi-50',      brand:'Fibra',  model:'50W JPT',    tech:'Fibra',     power_w:50,  area:'200×200', price:5500, life_h:60000, kw:0.140, maint:0.03, speed_cut:200,  speed_engr:25000, setup_min:4, color:'#be123c', icon:'🔥', note:'Fibra JPT 50W · incisione profonda + taglio lamiera'},
    {id:'fi-100',     brand:'Fibra',  model:'100W IPG',   tech:'Fibra',     power_w:100, area:'300×300', price:12000,life_h:80000, kw:0.300, maint:0.05, speed_cut:300,  speed_engr:30000, setup_min:5, color:'#9f1239', icon:'🔥', note:'IPG 100W · taglio acciaio + marcatura industriale'},
    /* ─── CO₂ generici ─── */
    {id:'co-60',      brand:'CO₂',   model:'60W',         tech:'CO₂',      power_w:60,  area:'400×300', price:700,  life_h:5000,  kw:0.140, maint:0.05, speed_cut:700,  speed_engr:10000, setup_min:5, color:'#22d3ee', icon:'💨', note:'CO₂ 60W generico · tuttofare laser'},
    {id:'co-80',      brand:'CO₂',   model:'80W',         tech:'CO₂',      power_w:80,  area:'600×400', price:1200, life_h:6000,  kw:0.200, maint:0.07, speed_cut:1000, speed_engr:12000, setup_min:5, color:'#06b6d4', icon:'💨', note:'CO₂ 80W generico · piccola produzione'},
    {id:'co-100',     brand:'CO₂',   model:'100W',        tech:'CO₂',      power_w:100, area:'900×600', price:1800, life_h:7000,  kw:0.280, maint:0.09, speed_cut:1500, speed_engr:14000, setup_min:6, color:'#0891b2', icon:'💨', note:'CO₂ 100W · media produzione'},
    {id:'co-130',     brand:'CO₂',   model:'130W',        tech:'CO₂',      power_w:130, area:'1300×900',price:2500, life_h:8000,  kw:0.380, maint:0.11, speed_cut:2000, speed_engr:16000, setup_min:7, color:'#0e7490', icon:'💨', note:'CO₂ 130W · grande produzione'},
    /* ─── DTF ─── */
    {id:'dtf-pa3',    brand:'Prestige',model:'A3',         tech:'DTF',      power_w:0,   area:'A3',      price:2500, life_h:3000,  kw:0.500, maint:0.12, speed_cut:0,    speed_engr:0,     setup_min:8, color:'#fb7185', icon:'🖨️', note:'DTF A3 · trasferimento su qualsiasi tessuto'},
    {id:'dtf-pxl',    brand:'Prestige',model:'XL2',        tech:'DTF',      power_w:0,   area:'A2',      price:5000, life_h:3000,  kw:0.800, maint:0.18, speed_cut:0,    speed_engr:0,     setup_min:10,color:'#f43f5e', icon:'🖨️', note:'DTF A2 · grande formato · produzione serie'},
    {id:'dtf-ep18',   brand:'Epson',  model:'L1800 DTF',  tech:'DTF',      power_w:0,   area:'A3+',     price:800,  life_h:2000,  kw:0.300, maint:0.10, speed_cut:0,    speed_engr:0,     setup_min:8, color:'#f9a8d4', icon:'🖨️', note:'Epson L1800 conv. DTF · ink ~€0.80/A4'},
    {id:'dtf-aud',    brand:'Audley', model:'A3 DTF',     tech:'DTF',      power_w:0,   area:'A3',      price:1800, life_h:2000,  kw:0.600, maint:0.12, speed_cut:0,    speed_engr:0,     setup_min:8, color:'#fda4af', icon:'🖨️', note:'DTF A3 · media qualità · ottimo prezzo'},
    /* ─── UV ─── */
    {id:'uv-a3',      brand:'UV',    model:'A3 Flatbed',  tech:'UV',       power_w:0,   area:'A3',      price:6000, life_h:5000,  kw:2.000, maint:0.15, speed_cut:0,    speed_engr:0,     setup_min:6, color:'#818cf8', icon:'🌈', note:'UV A3 flatbed · legno, acrilico, metallo, PVC'},
    {id:'uv-mim',     brand:'Mimaki',model:'UV A3',       tech:'UV',       power_w:0,   area:'A3',      price:8000, life_h:7000,  kw:2.500, maint:0.20, speed_cut:0,    speed_engr:0,     setup_min:8, color:'#6366f1', icon:'🌈', note:'UV Mimaki · qualità professionale · lunga durata'},
    {id:'uv-pro',     brand:'Procolored',model:'UV A4',   tech:'UV',       power_w:0,   area:'A4',      price:1200, life_h:2000,  kw:0.800, maint:0.10, speed_cut:0,    speed_engr:0,     setup_min:5, color:'#7c3aed', icon:'🌈', note:'UV A4 budget · testine Epson · entry level'},
    /* ─── Sublimazione ─── */
    {id:'sub-sg5',    brand:'Sawgrass',model:'SG500',     tech:'Sub',      power_w:0,   area:'A4',      price:699,  life_h:3000,  kw:0.020, maint:0.02, speed_cut:0,    speed_engr:0,     setup_min:5, color:'#fb923c', icon:'🎨', note:'Sub A4 · Sawgrass · tazze, tessuto, gadget'},
    {id:'sub-sg10',   brand:'Sawgrass',model:'SG1000',    tech:'Sub',      power_w:0,   area:'A3',      price:1299, life_h:3000,  kw:0.030, maint:0.02, speed_cut:0,    speed_engr:0,     setup_min:5, color:'#f97316', icon:'🎨', note:'Sub A3 · produzione di serie'},
    {id:'sub-ep5',    brand:'Epson',  model:'F500',       tech:'Sub',      power_w:0,   area:'A4',      price:2500, life_h:4000,  kw:0.040, maint:0.03, speed_cut:0,    speed_engr:0,     setup_min:5, color:'#ea580c', icon:'🎨', note:'Epson F500 · velocità 18 m²/h · tessile'},
    /* ─── Presse ─── */
    {id:'pr-3838',    brand:'Pressa',model:'38×38cm',     tech:'Pressa',   power_w:0,   area:'380×380', price:200,  life_h:5000,  kw:1.500, maint:0.02, speed_cut:0,    speed_engr:0,     setup_min:2, color:'#d97706', icon:'♨️', note:'Pressa caldo 38×38 · DTF/Sub T-shirt · 30s/pz'},
    {id:'pr-4050',    brand:'Pressa',model:'40×50cm',     tech:'Pressa',   power_w:0,   area:'400×500', price:350,  life_h:5000,  kw:2.000, maint:0.03, speed_cut:0,    speed_engr:0,     setup_min:2, color:'#b45309', icon:'♨️', note:'Pressa caldo 40×50 · felpe, toppe grandi'},
    {id:'pr-mug',     brand:'Pressa',model:'Mug',         tech:'Pressa',   power_w:0,   area:'Mug',     price:150,  life_h:3000,  kw:0.300, maint:0.02, speed_cut:0,    speed_engr:0,     setup_min:3, color:'#92400e', icon:'☕', note:'Pressa tazze · sublimazione ceramica · 45s/tazza'},
    {id:'pr-cap',     brand:'Pressa',model:'Cappelli',    tech:'Pressa',   power_w:0,   area:'Cap',     price:180,  life_h:3000,  kw:0.300, maint:0.02, speed_cut:0,    speed_engr:0,     setup_min:3, color:'#78350f', icon:'🧢', note:'Pressa curvata · cappelli · 60s/cappello'},
    /* ─── CNC ─── */
    {id:'cnc-3018',   brand:'CNC',   model:'3018 Pro',    tech:'CNC',      power_w:0,   area:'300×180', price:250,  life_h:2000,  kw:0.040, maint:0.03, speed_cut:500,  speed_engr:0,     setup_min:10,color:'#6b7280', icon:'🔩', note:'CNC 3018 · legno morbido, PCB, plastica'},
    {id:'cnc-6090',   brand:'CNC',   model:'6090',        tech:'CNC',      power_w:0,   area:'600×900', price:2500, life_h:5000,  kw:0.800, maint:0.10, speed_cut:2000, speed_engr:0,     setup_min:15,color:'#374151', icon:'🔩', note:'CNC 6090 · legno, alluminio, compositi'},
  ];

  /* Tech groups for filter */
  var TECHS = ['Tutte','CO₂','Diodo','Fibra','UV','DTF','Sub','Pressa','CNC'];

  /* ── Data helpers ─────────────────────────────────────── */
  function getCustom()       { return LS.get(K.custom, []); }
  function saveCustom(arr)   { LS.set(K.custom, arr); }
  function getFavs()         { return LS.get(K.favs, []); }
  function toggleFav(id)     { var f=getFavs(); var i=f.indexOf(id); i>-1?f.splice(i,1):f.unshift(id); LS.set(K.favs,f); }
  function getHistory()      { return LS.get(K.history, []); }
  function pushHistory(id)   { var h=getHistory().filter(function(x){return x!==id;}); h.unshift(id); LS.set(K.history,h.slice(0,8)); }
  function getInput()        { return LS.get(K.input, {qty:1,kwh:0.28,labor:18,markup:3.5,iva:22,disc:0}); }
  function saveInput(d)      { LS.set(K.input, d); }
  function getExtras(id)     { var e=LS.get(K.extras,{}); return e[id]||[]; }
  function saveExtras(id,arr){ var e=LS.get(K.extras,{}); e[id]=arr; LS.set(K.extras,e); }

  function allMachines() {
    return BUILT_IN.concat(getCustom()).filter(function(m){ return !m.archived; });
  }
  function getMachine(id) {
    return allMachines().find(function(m){ return m.id===id; }) || BUILT_IN[0];
  }

  /* ── Magazzino materials ──────────────────────────────── */
  function getMaterials() {
    try {
      var db = JSON.parse(localStorage.getItem('ingly_saas_db')||'{}');
      var items = (db.items||[]).filter(function(i){return i.nome||i.name;});
      if (items.length) return items.map(function(i){
        return { id:i.id, name:i.nome||i.name||'?', price:+(i.prezzo||i.price||0), unit:i.unit||i.unita||'pz',
                 cat:i.categoria||i.category||'Generico', note:i.note||'', stock:i.stock||i.qty||0 };
      });
    } catch(e){}
    /* Default demo materials if magazzino is empty */
    return [
      {id:'m-mdf3',    name:'MDF 3mm',                price:1.20, unit:'pz',  cat:'Legno',     stock:100},
      {id:'m-mdf6',    name:'MDF 6mm',                price:1.80, unit:'pz',  cat:'Legno',     stock:50},
      {id:'m-bamboo',  name:'Bambù 3mm',              price:0.90, unit:'pz',  cat:'Legno',     stock:80},
      {id:'m-plexi-t', name:'Plexiglass chiaro 3mm',  price:2.50, unit:'pz',  cat:'Plexiglass',stock:40},
      {id:'m-plexi-n', name:'Plexiglass nero 3mm',    price:2.80, unit:'pz',  cat:'Plexiglass',stock:30},
      {id:'m-inox',    name:'Acciaio Inox 0.5mm',     price:1.50, unit:'pz',  cat:'Metallo',   stock:60},
      {id:'m-allum',   name:'Alluminio anodizzato',   price:1.20, unit:'pz',  cat:'Metallo',   stock:50},
      {id:'m-pelle',   name:'Pelle Naturale 2mm',     price:4.00, unit:'pz',  cat:'Pelle',     stock:20},
      {id:'m-sughero', name:'Sughero 5mm',            price:0.60, unit:'pz',  cat:'Naturale',  stock:100},
      {id:'m-dtf-a4',  name:'Film DTF A4',            price:0.25, unit:'fg',  cat:'DTF',       stock:500},
      {id:'m-dtf-a3',  name:'Film DTF A3',            price:0.45, unit:'fg',  cat:'DTF',       stock:300},
      {id:'m-carta-s', name:'Carta Sub A4',           price:0.08, unit:'fg',  cat:'Sub',       stock:1000},
      {id:'m-tshirt',  name:'T-shirt Bianca',         price:4.50, unit:'pz',  cat:'Tessuto',   stock:200},
      {id:'m-tazza',   name:'Tazza Ceramica 11oz',    price:1.80, unit:'pz',  cat:'Ceramica',  stock:150},
      {id:'m-borsa',   name:'Shopper Canvas',         price:2.00, unit:'pz',  cat:'Tessuto',   stock:80},
    ];
  }

  /* ── STATE ────────────────────────────────────────────── */
  var _selId   = LS.get(K.sel, 'xt-p3');
  var _techF   = LS.get(K.tech, 'Tutte');
  var _searchQ = '';

  /* ══════════════════════════════════════════════════════
     MAIN RENDER
  ══════════════════════════════════════════════════════ */
  function render() {
    var el = document.getElementById('view-lasercalc')
          || document.getElementById('view-calc_macchine')
          || document.getElementById('view-laser_calc');
    if (!el) return;

    var m     = getMachine(_selId);
    var inp   = getInput();
    var favs  = getFavs();
    var hist  = getHistory().filter(function(id){ return id !== _selId; }).slice(0,5);
    var mats  = getMaterials();

    /* Filter machine list */
    var filtered = allMachines().filter(function(mm){
      var techOk = _techF === 'Tutte' || (mm.tech||'').indexOf(_techF) > -1;
      var qOk    = !_searchQ || (mm.brand+' '+mm.model+' '+mm.tech).toLowerCase().indexOf(_searchQ.toLowerCase()) > -1;
      return techOk && qOk;
    });
    var favMachines  = filtered.filter(function(mm){ return favs.indexOf(mm.id) > -1; });
    var histMachines = hist.map(function(id){ return filtered.find(function(mm){return mm.id===id;}); }).filter(Boolean);
    var otherMachines= filtered.filter(function(mm){ return favs.indexOf(mm.id)<0 && hist.indexOf(mm.id)<0; });

    function machCard(mm) {
      var isSel = mm.id === _selId;
      var isFv  = favs.indexOf(mm.id) > -1;
      var isCustom = !!mm.custom;
      return '<div class="_cm_mach_card" data-id="'+mm.id+'" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;margin-bottom:2px;'
        +(isSel?'background:'+mm.color+'18;border:1px solid '+mm.color+'44;':'border:1px solid transparent;')
        +'">'
        +'<div style="width:30px;height:30px;border-radius:7px;background:'+mm.color+'20;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">'+mm.icon+'</div>'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-size:11px;font-weight:700;color:var(--text,#e5e5e5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+mm.brand+' '+mm.model+'</div>'
          +'<div style="font-size:9px;color:var(--text-muted,#888)">'+mm.tech+(mm.power_w?' · '+mm.power_w+'W':'')+'</div>'
        +'</div>'
        +'<div style="display:flex;gap:2px;align-items:center">'
          +'<button class="_cm_fav" data-id="'+mm.id+'" title="Preferita" style="background:none;border:none;cursor:pointer;font-size:12px;padding:2px;opacity:'+(isFv?1:.3)+'">★</button>'
          +(isCustom?'<button class="_cm_del_q" data-id="'+mm.id+'" title="Elimina" style="background:none;border:none;cursor:pointer;font-size:11px;color:#ef4444;padding:2px;opacity:.6">✕</button>':'')
        +'</div>'
        +'</div>';
    }

    function machSection(label, arr) {
      if (!arr.length) return '';
      return '<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted,#666);padding:6px 10px 2px">'+label+'</div>'
        + arr.map(machCard).join('');
    }

    var machineListHTML = machSection('⭐ Preferite', favMachines)
      + machSection('🕐 Recenti', histMachines)
      + machSection('Tutte ('+otherMachines.length+')', otherMachines);
    if (!filtered.length) machineListHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted,#888);font-size:12px">Nessuna macchina trovata</div>';

    /* Tech filter buttons */
    var techHTML = TECHS.map(function(t){
      return '<button class="_cm_tech" data-tech="'+t+'" style="padding:3px 8px;border-radius:99px;border:1px solid '
        +(_techF===t?'var(--primary,#6366f1)':'var(--border,#333)')+';background:'
        +(_techF===t?'var(--primary,#6366f1)':'transparent')+';color:'
        +(_techF===t?'#fff':'var(--text-muted,#888)')+';cursor:pointer;font-size:10px;font-weight:600;white-space:nowrap;font-family:inherit">'+t+'</button>';
    }).join('');

    /* Material dropdown */
    var matHTML = '<option value="">— Inserisci costo manuale —</option>'
      + mats.map(function(mat){
        return '<option value="'+mat.id+'" data-price="'+mat.price+'" data-unit="'+mat.unit+'">'
          +mat.name+' ('+eu(mat.price)+'/'+mat.unit+') — stock '+mat.stock+'</option>';
      }).join('');

    /* IVA select */
    var ivaOpts = [0,4,10,22].map(function(v){
      return '<option value="'+v+'"'+(inp.iva==v?' selected':'')+'>'+v+'%</option>';
    }).join('');

    el.innerHTML =
    '<div style="display:grid;grid-template-columns:270px 1fr 340px;height:calc(100vh - 64px);overflow:hidden;border-top:1px solid var(--border,#2a2a35)">'

    /* ══ LEFT — Machine list ══════════════════════════════ */
    +'<div style="display:flex;flex-direction:column;border-right:1px solid var(--border,#2a2a35);overflow:hidden">'

      /* Header */
      +'<div style="padding:10px 12px;background:var(--bg-card,#111115);border-bottom:1px solid var(--border,#2a2a35)">'
        +'<div style="font-size:13px;font-weight:800;color:var(--text,#e8e8f0);margin-bottom:6px">🧮 Calcolatore Macchine</div>'
        +'<input id="_cm_search" placeholder="🔍 Cerca macchina..." style="width:100%;box-sizing:border-box;padding:7px 10px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:8px;color:var(--text,#e8e8f0);font-size:11px;outline:none">'
        +'<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">'+techHTML+'</div>'
      +'</div>'

      /* Machine list */
      +'<div id="_cm_list" style="flex:1;overflow-y:auto;padding:4px 6px">'
        + machineListHTML
      +'</div>'

      /* Bottom toolbar */
      +'<div style="padding:8px 10px;border-top:1px solid var(--border,#2a2a35);background:var(--bg-card,#111115)">'
        +'<div style="display:flex;gap:4px;flex-wrap:wrap">'
          +'<button id="_cm_add" title="Aggiungi macchina" style="flex:1;padding:7px 6px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit">+ Nuova</button>'
          +'<button id="_cm_dup" title="Duplica selezionata" style="padding:7px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888);font-family:inherit" title="Duplica">⧉</button>'
          +'<button id="_cm_edit" title="Modifica selezionata" style="padding:7px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888);font-family:inherit">✏️</button>'
          +'<button id="_cm_arch" title="Archivia selezionata" style="padding:7px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888);font-family:inherit">📦</button>'
          +'<button id="_cm_export" title="Esporta macchine" style="padding:7px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888);font-family:inherit">📤</button>'
          +'<button id="_cm_import" title="Importa macchine" style="padding:7px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888);font-family:inherit">📥</button>'
        +'</div>'
      +'</div>'

    +'</div>'

    /* ══ CENTER — Calculator form ═════════════════════════ */
    +'<div style="overflow-y:auto;padding:16px 18px">'

      /* Machine header */
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">'
        +'<div style="width:44px;height:44px;border-radius:12px;background:'+m.color+'22;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">'+m.icon+'</div>'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-size:18px;font-weight:900;color:var(--text,#e8e8f0)">'+m.brand+' '+m.model+'</div>'
          +'<div style="font-size:11px;color:'+m.color+';font-weight:600">'+m.tech+(m.power_w?' · '+m.power_w+'W':'')+' · '+m.area+'mm</div>'
        +'</div>'
        +'<div style="display:flex;gap:5px">'
          +'<button id="_cm_send_q" style="padding:7px 14px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit">→ Quoter</button>'
          +'<button id="_cm_save_p" style="padding:7px 10px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted,#888);font-family:inherit">💾 Preset</button>'
          +'<button id="_cm_reset" style="padding:7px 10px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted,#888);font-family:inherit">↺</button>'
        +'</div>'
      +'</div>'

      +(m.note?'<div style="font-size:11px;color:var(--text-muted,#888);padding:8px 12px;background:'+m.color+'0a;border:1px solid '+m.color+'25;border-radius:8px;margin-bottom:14px">ℹ️ '+m.note+'</div>':'')

      /* Parametri macchina */
      +'<div class="card" style="padding:14px;margin-bottom:12px">'
        +'<div style="font-size:12px;font-weight:700;color:var(--text,#e8e8f0);margin-bottom:10px">⚙️ Parametri Macchina <span style="font-size:10px;font-weight:400;color:var(--text-muted,#888)">(salvati automaticamente)</span></div>'
        +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'
          +field('_f_price','💰 Prezzo acquisto €',inp.price!=null?inp.price:m.price,'1')
          +field('_f_life','⏱ Vita utile (ore)',inp.life_h!=null?inp.life_h:m.life_h,'100')
          +field('_f_kw','⚡ Potenza (kW)',inp.kw!=null?inp.kw:m.kw,'0.001')
          +field('_f_kwh','💡 €/kWh bolletta',inp.kwh||m.defKwh||0.28,'0.01')
          +field('_f_maint','🔧 Manut. €/h',inp.maint!=null?inp.maint:m.maint,'0.01')
          +field('_f_labor','👤 Manodopera €/h',inp.labor||18,'1')
          +field('_f_setup','⚙️ Setup (min)',inp.setup_min!=null?inp.setup_min:m.setup_min||5,'0.5')
          +field('_f_clean','🧹 Pulizia (min)',inp.clean_min!=null?inp.clean_min:2,'0.5')
          +field('_f_pack','📦 Imballo €/pz',inp.pack!=null?inp.pack:0.20,'0.01')
        +'</div>'
        +'<div style="margin-top:8px;padding:7px 10px;background:var(--bg-card2,#18181f);border-radius:7px;font-size:11px;color:var(--text-muted,#888)">'
          +'💡 Costo macchina/h: <strong id="_cm_cost_ph" style="color:var(--primary,#818cf8)">—</strong> · /min: <strong id="_cm_cost_pm" style="color:var(--primary,#818cf8)">—</strong>'
        +'</div>'
      +'</div>'

      /* Dati lavorazione */
      +'<div class="card" style="padding:14px;margin-bottom:12px">'
        +'<div style="font-size:12px;font-weight:700;color:var(--text,#e8e8f0);margin-bottom:10px">📐 Dati Lavorazione</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
          +field('_f_job','📝 Nome lavoro',inp.job||'','','Descrizione lavorazione...')
          +field('_f_qty','🔢 Quantità',inp.qty||1,'1')
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">'
          +field('_f_w','↔ Largh. (mm)',inp.w||'','1','Auto-calcolo area')
          +field('_f_h','↕ Alt. (mm)',inp.h||'','1','Auto-calcolo area')
          +field('_f_min','⏲ Tempo macchina (min)',inp.min||'','0.5','Lascia 0 per auto')
        +'</div>'
        /* Material from magazzino */
        +'<div style="margin-bottom:8px">'
          +'<label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">🪵 Materiale dal Magazzino</label>'
          +'<div style="display:flex;gap:6px">'
            +'<select id="_f_mat_sel" style="flex:1;padding:7px 10px;background:var(--bg-card2,#18181f);border:1.5px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px">'+matHTML+'</select>'
            +'<button id="_cm_go_mag" title="Vai a Magazzino" style="padding:7px 10px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">📦</button>'
          +'</div>'
          +'<div id="_cm_mat_hint" style="font-size:9px;color:var(--text-dim,#555);margin-top:2px">Seleziona un materiale dal Magazzino o inserisci costo manuale</div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
          +field('_f_mat_cost','💶 Costo materiale €',inp.mat_cost||0,'0.001')
          +field('_f_ship','🚚 Spedizione €',inp.ship||0,'0.01')
        +'</div>'
      +'</div>'

      /* Costi aggiuntivi */
      +'<div class="card" style="padding:14px;margin-bottom:12px">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
          +'<div style="font-size:12px;font-weight:700;color:var(--text,#e8e8f0)">➕ Costi Aggiuntivi</div>'
          +'<button id="_cm_add_extra" style="font-size:11px;padding:4px 10px;background:var(--primary,#6366f1);border:none;border-radius:6px;color:#fff;cursor:pointer;font-weight:700;font-family:inherit">+ Aggiungi</button>'
        +'</div>'
        +'<div id="_cm_extras_list"></div>'
      +'</div>'

      /* Prezzi e Margini */
      +'<div class="card" style="padding:14px">'
        +'<div style="font-size:12px;font-weight:700;color:var(--text,#e8e8f0);margin-bottom:10px">💰 Prezzi & Margini</div>'
        +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px">'
          +field('_f_mk1','× Campione',inp.mk1||3.5,'0.1')
          +field('_f_mk2','× Kit',inp.mk2||2.8,'0.1')
          +field('_f_mk3','× Stock',inp.mk3||2.2,'0.1')
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
          +field('_f_disc','💸 Sconto %',inp.disc||0,'1')
          +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">🧾 IVA</label>'
            +'<select id="_f_iva" style="width:100%;padding:7px 10px;background:var(--bg-card2,#18181f);border:1.5px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px">'+ivaOpts+'</select>'
          +'</div>'
        +'</div>'
      +'</div>'

    +'</div>'

    /* ══ RIGHT — Results ══════════════════════════════════ */
    +'<div style="border-left:1px solid var(--border,#2a2a35);display:flex;flex-direction:column;overflow-y:auto">'
      +'<div style="padding:12px 14px;border-bottom:1px solid var(--border,#2a2a35);font-size:11px;font-weight:700;color:var(--text-muted,#888);text-transform:uppercase;letter-spacing:.06em;background:var(--bg-card,#111115)">📊 Risultati</div>'
      +'<div id="_cm_results" style="flex:1;padding:14px"></div>'
    +'</div>'

    +'</div>'; /* end grid */

    /* Bind events */
    bindAll(el, m);
    renderExtras(el);
    recalc(el, m, inp);
  }

  /* ── Field helper ─────────────────────────────────────── */
  function field(id, label, value, step, placeholder) {
    var isText = (step === '');
    return '<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">'+label+'</label>'
      +'<input id="'+id+'" type="'+(isText?'text':'number')+'" '+(step&&!isText?'step="'+step+'" ':'')+' value="'+(value!=null?value:'')+'" '
      +(placeholder?'placeholder="'+placeholder+'" ':'')+' style="width:100%;box-sizing:border-box;padding:7px 9px;background:var(--bg-card2,#18181f);border:1.5px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px;outline:none" class="_cm_input">'
      +'</div>';
  }

  /* ── Extras list ──────────────────────────────────────── */
  function renderExtras(el) {
    var box = el.querySelector('#_cm_extras_list'); if (!box) return;
    var extras = getExtras(_selId);
    if (!extras.length) {
      box.innerHTML = '<div style="font-size:11px;color:var(--text-muted,#666);padding:4px 2px">Nessun costo extra. Aggiungi spese come design, imballaggio speciale, urgenza...</div>';
      return;
    }
    box.innerHTML = extras.map(function(ex, i){
      return '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">'
        +'<input data-ei="'+i+'" data-ef="name" value="'+(ex.name||'')+'" placeholder="Nome costo..." style="flex:1;padding:6px 8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:6px;color:var(--text,#e8e8f0);font-size:11px" class="_cm_extra_inp">'
        +'<input data-ei="'+i+'" data-ef="value" type="number" step="0.01" value="'+(ex.value||0)+'" placeholder="€" style="width:75px;padding:6px 8px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:6px;color:var(--text,#e8e8f0);font-size:11px" class="_cm_extra_inp">'
        +'<button data-ei="'+i+'" class="_cm_extra_del" style="padding:5px 8px;background:#ef444420;border:1px solid #ef444440;border-radius:6px;color:#ef4444;cursor:pointer;font-size:12px;line-height:1">✕</button>'
        +'</div>';
    }).join('');
    box.querySelectorAll('._cm_extra_inp').forEach(function(inp){
      inp.oninput = function(){
        var ei=parseInt(this.dataset.ei), ef=this.dataset.ef;
        extras[ei][ef] = ef==='value' ? parseFloat(this.value)||0 : this.value;
        saveExtras(_selId, extras);
        recalcFromDOM(el);
      };
    });
    box.querySelectorAll('._cm_extra_del').forEach(function(btn){
      btn.onclick = function(){
        extras.splice(parseInt(this.dataset.ei),1);
        saveExtras(_selId, extras);
        renderExtras(el);
        recalcFromDOM(el);
      };
    });
  }

  /* ── Bind all events ──────────────────────────────────── */
  function bindAll(el, m) {
    /* Machine list clicks */
    el.querySelectorAll('._cm_mach_card').forEach(function(card){
      card.onclick = function(){
        _selId = card.dataset.id;
        LS.set(K.sel, _selId);
        pushHistory(_selId);
        render();
      };
    });
    el.querySelectorAll('._cm_fav').forEach(function(btn){
      btn.onclick = function(e){
        e.stopPropagation();
        toggleFav(btn.dataset.id);
        render();
      };
    });
    el.querySelectorAll('._cm_del_q').forEach(function(btn){
      btn.onclick = function(e){
        e.stopPropagation();
        var id = btn.dataset.id;
        var name = (getMachine(id)||{}).model||id;
        if (!window.confirm('Eliminare '+name+'?')) return;
        saveCustom(getCustom().filter(function(x){return x.id!==id;}));
        if (_selId===id) _selId='xt-p3';
        render();
        tt('Macchina eliminata','warn');
      };
    });
    /* Tech filter */
    el.querySelectorAll('._cm_tech').forEach(function(btn){
      btn.onclick = function(){ _techF=btn.dataset.tech; LS.set(K.tech,_techF); render(); };
    });
    /* Search */
    var srch = el.querySelector('#_cm_search');
    if (srch) srch.oninput = function(){ _searchQ=this.value; render(); };

    /* Toolbar buttons */
    var addBtn  = el.querySelector('#_cm_add');
    var dupBtn  = el.querySelector('#_cm_dup');
    var editBtn = el.querySelector('#_cm_edit');
    var archBtn = el.querySelector('#_cm_arch');
    var expBtn  = el.querySelector('#_cm_export');
    var impBtn  = el.querySelector('#_cm_import');

    if (addBtn) addBtn.onclick  = function(){ openMachineModal(null); };
    if (dupBtn) dupBtn.onclick  = function(){
      var src = getMachine(_selId);
      var clone = JSON.parse(JSON.stringify(src));
      clone.id = uid(); clone.model = clone.model+' (copia)'; clone.custom = true;
      saveCustom(getCustom().concat([clone]));
      _selId = clone.id; pushHistory(clone.id);
      render(); tt('⧉ Macchina duplicata: '+clone.brand+' '+clone.model,'success');
    };
    if (editBtn) editBtn.onclick = function(){
      var src = getMachine(_selId);
      if (!src.custom) {
        /* Clone built-in to custom then edit */
        var clone = JSON.parse(JSON.stringify(src));
        clone.id = uid(); clone.custom = true; clone.model = clone.model+' (mod.)';
        saveCustom(getCustom().concat([clone]));
        _selId = clone.id; pushHistory(clone.id);
        tt('Creata copia modificabile','info');
      }
      openMachineModal(getMachine(_selId));
    };
    if (archBtn) archBtn.onclick = function(){
      var src = getMachine(_selId);
      if (!src.custom) { tt('Non puoi archiviare macchine di sistema','warn'); return; }
      if (!window.confirm('Archiviare '+src.model+'?')) return;
      var c = getCustom().map(function(x){ return x.id===_selId?Object.assign({},x,{archived:true}):x; });
      saveCustom(c);
      _selId = 'xt-p3';
      render(); tt('📦 Macchina archiviata','info');
    };
    if (expBtn) expBtn.onclick = function(){
      var data = { built_in_customized: LS.get(K.input,{}), custom: getCustom(), favs: getFavs() };
      var blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ingly_macchine_'+new Date().toISOString().slice(0,10)+'.json';
      a.click();
      tt('📤 Esportazione completata','success');
    };
    if (impBtn) impBtn.onclick = function(){
      var fi = document.createElement('input'); fi.type='file'; fi.accept='.json';
      fi.onchange = function(e){
        var f = e.target.files[0]; if(!f) return;
        var r = new FileReader();
        r.onload = function(ev){
          try {
            var d = JSON.parse(ev.target.result);
            if (d.custom && Array.isArray(d.custom)){
              var existing = getCustom();
              var ids = existing.map(function(x){return x.id;});
              d.custom.forEach(function(m){ if(!ids.includes(m.id)) existing.push(m); });
              saveCustom(existing);
              render(); tt('📥 '+d.custom.length+' macchine importate','success');
            }
          } catch(ex){ tt('File non valido','error'); }
        };
        r.readAsText(f);
      };
      fi.click();
    };

    /* Material select */
    var matSel = el.querySelector('#_f_mat_sel');
    if (matSel) matSel.onchange = function(){
      var opt = this.options[this.selectedIndex];
      var price = parseFloat(opt.dataset.price)||0;
      var unit  = opt.dataset.unit||'pz';
      var costEl = el.querySelector('#_f_mat_cost');
      var hintEl = el.querySelector('#_cm_mat_hint');
      if (price && costEl) costEl.value = price;
      if (hintEl) hintEl.textContent = price>0 ? eu(price)+'/'+unit+' · Scorta: '+(opt.text.match(/stock (\d+)/)||['','?'])[1]+'pz' : '';
      recalcFromDOM(el);
    };

    /* Go to magazzino */
    var goMag = el.querySelector('#_cm_go_mag');
    if (goMag) goMag.onclick = function(){
      if (typeof App!=='undefined'&&App.navigate) App.navigate('items');
      else tt('Vai a Magazzino → Articoli','info');
    };

    /* All number/text inputs */
    el.querySelectorAll('._cm_input').forEach(function(inp){
      inp.oninput = function(){ saveAllInputs(el); recalcFromDOM(el); };
    });

    /* Extra costs */
    var addEx = el.querySelector('#_cm_add_extra');
    if (addEx) addEx.onclick = function(){
      var extras = getExtras(_selId);
      extras.push({name:'',value:0});
      saveExtras(_selId, extras);
      renderExtras(el);
    };

    /* Send to quoter */
    var sendQ = el.querySelector('#_cm_send_q');
    if (sendQ) sendQ.onclick = function(){
      var r = computeResult(el, m);
      if (!r) return;
      var job = (el.querySelector('#_f_job')||{}).value || (m.brand+' '+m.model);
      var qty = parseInt((el.querySelector('#_f_qty')||{}).value)||1;
      var mk2 = parseFloat((el.querySelector('#_f_mk2')||{}).value)||2.8;
      var price = +(r.unitCost*mk2).toFixed(2);
      LS.set('lc_to_quoter', {machine:_selId,cost:r.unitCost,price,label:job,qty});
      if (typeof App!=='undefined'&&App.navigate) App.navigate('quoter');
      setTimeout(function(){
        if (typeof Quoter!=='undefined'&&Quoter.addLineFromCalc) {
          Quoter.addLineFromCalc({name:job,unitCost:price,qty,category:'Laser',detail:m.brand+' '+m.model});
        }
      },400);
      tt('→ '+job+' · '+eu(price)+'/pz inviato al Quoter','success');
    };

    /* Save preset */
    var saveP = el.querySelector('#_cm_save_p');
    if (saveP) saveP.onclick = function(){
      var pname = window.prompt('Nome preset:');
      if (!pname) return;
      var presets = LS.get(K.presets,[]);
      presets.push({name:pname,machineId:_selId,input:getInput(),extras:getExtras(_selId),ts:Date.now()});
      LS.set(K.presets,presets);
      tt('💾 Preset salvato: '+pname,'success');
    };

    /* Reset */
    var rst = el.querySelector('#_cm_reset');
    if (rst) rst.onclick = function(){
      if (!window.confirm('Azzerare tutti i dati di calcolo?')) return;
      saveInput({qty:1,kwh:0.28,labor:18,markup:3.5,iva:22,disc:0});
      saveExtras(_selId,[]);
      render();
      tt('↺ Dati azzerati','info');
    };
  }

  /* ── Save all inputs to localStorage ─────────────────── */
  function saveAllInputs(el) {
    var g = function(id,def){ var e=el.querySelector('#'+id); return e?(isNaN(parseFloat(e.value))?(e.value||def):parseFloat(e.value)):def; };
    saveInput({
      price:     g('_f_price',null), life_h:  g('_f_life',null),
      kw:        g('_f_kw',null),    kwh:     g('_f_kwh',0.28),
      maint:     g('_f_maint',null), labor:   g('_f_labor',15),
      setup_min: g('_f_setup',5),    clean_min:g('_f_clean',2),
      pack:      g('_f_pack',0.20),
      job:       g('_f_job',''),     qty:     g('_f_qty',1),
      w:         g('_f_w',0),        h:       g('_f_h',0),
      min:       g('_f_min',0),      mat_cost:g('_f_mat_cost',0),
      ship:      g('_f_ship',0),
      mk1:       g('_f_mk1',3.5),    mk2:     g('_f_mk2',2.8),    mk3:g('_f_mk3',2.2),
      disc:      g('_f_disc',0),     iva:     g('_f_iva',22),
    });
  }

  /* ── Recalculate ──────────────────────────────────────── */
  function recalcFromDOM(el) {
    saveAllInputs(el);
    var m = getMachine(_selId);
    var inp = getInput();
    recalc(el, m, inp);
  }

  function computeResult(el, m) {
    var inp = getInput();
    var g = function(id,def){ var e=el.querySelector('#'+id); return e?parseFloat(e.value)||def:def; };
    var price    = g('_f_price', m.price||1000);
    var lifeH    = g('_f_life',  m.life_h||3000)||1;
    var kw       = g('_f_kw',    m.kw||0.1);
    var kwh      = g('_f_kwh',   0.28);
    var maint    = g('_f_maint', m.maint||0.05);
    var labor    = g('_f_labor', 15);
    var setupMin = g('_f_setup', m.setup_min||5);
    var cleanMin = g('_f_clean', 2);
    var pack     = g('_f_pack',  0.20);
    var jobMin   = g('_f_min',   0);
    var matCost  = g('_f_mat_cost', 0);
    var ship     = g('_f_ship',  0);
    var qty      = Math.max(1, g('_f_qty', 1));
    var mk1      = g('_f_mk1', 3.5);
    var mk2      = g('_f_mk2', 2.8);
    var mk3      = g('_f_mk3', 2.2);
    var disc     = g('_f_disc', 0);
    var iva      = g('_f_iva',  22);

    /* Auto time from area */
    if (!jobMin) {
      var w = g('_f_w',0), h = g('_f_h',0);
      if (w>0 && h>0) {
        var spd = m.speed_engr||8000;
        jobMin = +(w*h/spd/10).toFixed(2);
      }
    }
    var totalMin = jobMin + setupMin + cleanMin;
    var totalH   = totalMin / 60;

    var depr   = (price/lifeH) * totalH;
    var energy = kw * kwh * totalH;
    var mainC  = maint * totalH;
    var laborC = labor * totalH;
    var machC  = depr + energy + mainC + laborC;

    var extraTotal = 0;
    getExtras(_selId).forEach(function(ex){ extraTotal += parseFloat(ex.value)||0; });

    var unitCost = machC + matCost + pack + ship + extraTotal;
    var totalCost= unitCost * qty;

    var applyDisc = function(v){ return +(v*(1-disc/100)).toFixed(2); };
    var applyIva  = function(v){ return +(v*(1+iva/100)).toFixed(2); };
    var p1 = applyDisc(unitCost*mk1), p2=applyDisc(unitCost*mk2), p3=applyDisc(unitCost*mk3);
    var m1pct = p1>0?Math.round((p1-unitCost)/p1*100):0;
    var m2pct = p2>0?Math.round((p2-unitCost)/p2*100):0;
    var m3pct = p3>0?Math.round((p3-unitCost)/p3*100):0;

    return {depr,energy,mainC,laborC,machC,matCost,pack,ship,extraTotal,
            unitCost,totalCost,p1,p2,p3,m1pct,m2pct,m3pct,qty,disc,iva,
            totalMin,jobMin,setupMin,cleanMin,depr,energy,totalH,mk1,mk2,mk3};
  }

  function recalc(el, m, inp) {
    var r = computeResult(el, m); if (!r) return;

    /* Update cost/h display */
    var cph = el.querySelector('#_cm_cost_ph'), cpm = el.querySelector('#_cm_cost_pm');
    var cpHour = r.totalH>0 ? r.machC/r.totalH : 0;
    var cpMin  = r.totalMin>0 ? r.machC/r.totalMin : 0;
    if (cph) cph.textContent = eu(cpHour)+'/h';
    if (cpm) cpm.textContent = eu(cpMin)+'/min';

    var box = el.querySelector('#_cm_results'); if (!box) return;
    function row(label,val,color,sub){
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border2,#1e1e2e);font-size:12px">'
        +'<span style="color:var(--text-muted,#888)">'+label+'</span>'
        +'<div style="text-align:right"><div style="font-weight:700;color:'+(color||'var(--text,#e8e8f0)')+'">'+eu(val)+'</div>'
        +(sub?'<div style="font-size:9px;color:#555">'+sub+'</div>':'')
        +'</div></div>';
    }

    /* Bar chart for cost breakdown */
    var costs = [
      {l:'Macchina',v:r.machC,c:'#6366f1'},
      {l:'Materiale',v:r.matCost,c:'#10b981'},
      {l:'Imballo',v:r.pack,c:'#f59e0b'},
      {l:'Spedizione',v:r.ship,c:'#06b6d4'},
      {l:'Extra',v:r.extraTotal,c:'#ef4444'},
    ].filter(function(x){return x.v>0;});
    var total = r.unitCost;

    box.innerHTML =
      /* Cost breakdown */
      row('Ammortamento',r.depr)
      +row('Energia',r.energy)
      +row('Manutenzione',r.mainC)
      +row('Manodopera',r.laborC)
      +row('Materiale',r.matCost)
      +(r.pack>0?row('Imballo',r.pack):'')
      +(r.ship>0?row('Spedizione',r.ship):'')
      +(r.extraTotal>0?row('Costi extra',r.extraTotal):'')
      +'<div style="border-top:1px solid var(--border,#2a2a35);margin:8px 0"></div>'
      +row('Costo unitario',r.unitCost,'#fbbf24')
      +(r.qty>1?row('Costo totale ×'+r.qty,r.totalCost,'#fbbf24'):'')

      /* Bar chart */
      +(costs.length>1?'<div style="margin:10px 0">'
        +'<div style="height:8px;border-radius:99px;overflow:hidden;background:var(--border,#2a2a35);display:flex">'
          +costs.map(function(c){return '<div style="height:100%;width:'+Math.round(c.v/total*100)+'%;background:'+c.c+'"></div>';}).join('')
        +'</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">'
          +costs.map(function(c){return '<div style="font-size:9px;color:var(--text-muted,#888);display:flex;align-items:center;gap:3px"><span style="width:7px;height:7px;border-radius:50%;background:'+c.c+';display:inline-block"></span>'+c.l+' '+Math.round(c.v/total*100)+'%</div>';}).join('')
        +'</div></div>':'')

      /* Price tiers */
      +'<div style="margin:10px 0">'
        +'<div style="font-size:10px;color:var(--text-muted,#888);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Prezzi di vendita</div>'
        +(r.disc>0?'<div style="font-size:10px;color:#f59e0b;margin-bottom:6px">Sconto '+r.disc+'% applicato</div>':'')
        +[
          {l:'🧪 Campione',p:r.p1,pct:r.m1pct,mk:r.mk1,c:'#64748b'},
          {l:'🎒 Kit',p:r.p2,pct:r.m2pct,mk:r.mk2,c:'#10b981'},
          {l:'📦 Stock',p:r.p3,pct:r.m3pct,mk:r.mk3,c:'#6366f1'},
        ].map(function(tier){
          return '<div style="background:'+tier.c+'12;border:1px solid '+tier.c+'30;border-radius:8px;padding:8px 10px;margin-bottom:5px;display:flex;align-items:center;justify-content:space-between">'
            +'<div><div style="font-size:11px;font-weight:700;color:'+tier.c+'">'+tier.l+' ×'+tier.mk+'</div>'
              +(r.iva>0?'<div style="font-size:9px;color:#555">IVA '+r.iva+'%: '+eu(+(tier.p*(1+r.iva/100)).toFixed(2))+'</div>':'')
            +'</div>'
            +'<div style="text-align:right"><div style="font-size:17px;font-weight:900;color:'+tier.c+'">'+eu(tier.p)+'</div>'
              +'<div style="font-size:9px;color:'+tier.c+';opacity:.7">marg.'+tier.pct+'%'+(r.qty>1?' · tot '+eu(tier.p*r.qty):'')+'</div>'
            +'</div></div>';
        }).join('')
      +'</div>'

      /* AI tips */
      +(r.m2pct<25?'<div style="padding:8px;background:#ef444410;border:1px solid #ef444425;border-radius:7px;font-size:11px;color:#fca5a5;margin-top:6px">⚠️ Margine kit basso ('+r.m2pct+'%). Aumenta mk2 o riduci i costi.</div>':'')
      +(r.matCost>0&&r.unitCost>0&&r.matCost/r.unitCost>0.6?'<div style="padding:8px;background:#f59e0b10;border:1px solid #f59e0b25;border-radius:7px;font-size:11px;color:#fcd34d;margin-top:6px">💡 Materiale '+Math.round(r.matCost/r.unitCost*100)+'% del costo. Valuta acquisti in volume.</div>':'')
      +(r.m2pct>55?'<div style="padding:8px;background:#10b98110;border:1px solid #10b98125;border-radius:7px;font-size:11px;color:#86efac;margin-top:6px">✅ Ottimo margine! Kit a '+eu(r.p2)+' con margine '+r.m2pct+'%.</div>':'');
  }

  /* ── Machine add/edit modal ───────────────────────────── */
  function openMachineModal(existing) {
    if (typeof openModal === 'undefined') { tt('openModal non disponibile','warn'); return; }
    var isEdit = !!(existing && existing.id);
    var m = existing || {brand:'',model:'',tech:'CO₂',power_w:0,area:'',price:0,life_h:3000,kw:0.1,maint:0.05,setup_min:5,icon:'⚡',color:'#6366f1',note:''};
    var techOpts = ['CO₂','Diodo','Fibra','UV','DTF','Sub','Pressa','CNC','Altro']
      .map(function(t){return '<option'+(m.tech===t?' selected':'')+'>'+t+'</option>';}).join('');

    openModal(
      '<div class="modal modal-md">'
      +'<div class="modal-header"><span style="font-weight:700">'+(isEdit?'✏️ Modifica':'➕ Nuova')+' Macchina</span>'
        +'<button onclick="closeModal()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:18px">×</button></div>'
      +'<div class="modal-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +'<div class="form-group"><label>Marca *</label><input id="_nm_brand" class="form-control" value="'+m.brand+'" placeholder="es: xTool"></div>'
        +'<div class="form-group"><label>Modello *</label><input id="_nm_model" class="form-control" value="'+m.model+'" placeholder="es: P3"></div>'
        +'<div class="form-group"><label>Tecnologia</label><select id="_nm_tech" class="form-control">'+techOpts+'</select></div>'
        +'<div class="form-group"><label>Potenza (W)</label><input id="_nm_pw" class="form-control" type="number" value="'+m.power_w+'"></div>'
        +'<div class="form-group"><label>Area lavoro (mm)</label><input id="_nm_area" class="form-control" value="'+m.area+'" placeholder="es: 400×400"></div>'
        +'<div class="form-group"><label>Prezzo acquisto €</label><input id="_nm_price" class="form-control" type="number" value="'+m.price+'"></div>'
        +'<div class="form-group"><label>Vita utile (ore)</label><input id="_nm_life" class="form-control" type="number" value="'+m.life_h+'"></div>'
        +'<div class="form-group"><label>Potenza kW</label><input id="_nm_kw" class="form-control" type="number" step="0.001" value="'+m.kw+'"></div>'
        +'<div class="form-group"><label>Manut. €/h</label><input id="_nm_maint" class="form-control" type="number" step="0.01" value="'+m.maint+'"></div>'
        +'<div class="form-group"><label>Setup (min)</label><input id="_nm_setup" class="form-control" type="number" value="'+m.setup_min+'"></div>'
        +'<div class="form-group"><label>Icona (emoji)</label><input id="_nm_icon" class="form-control" value="'+m.icon+'"></div>'
        +'<div class="form-group"><label>Colore brand</label><input id="_nm_color" class="form-control" type="color" value="'+m.color+'"></div>'
        +'<div class="form-group" style="grid-column:span 2"><label>Note</label><input id="_nm_note" class="form-control" value="'+(m.note||'')+'" placeholder="Descrizione breve della macchina"></div>'
      +'</div></div>'
      +'<div class="modal-footer">'
        +'<button onclick="closeModal()" style="padding:8px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--text-muted);font-family:inherit">Annulla</button>'
        +'<button id="_nm_save_btn" style="padding:8px 18px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit">💾 Salva</button>'
      +'</div>'
      +'</div>'
    );

    setTimeout(function(){
      var btn = document.getElementById('_nm_save_btn');
      if (!btn) return;
      btn.onclick = function(){
        var brand = (document.getElementById('_nm_brand')||{}).value.trim();
        var model = (document.getElementById('_nm_model')||{}).value.trim();
        if (!brand||!model){ tt('Inserisci marca e modello','error'); return; }
        var newM = {
          id:        isEdit ? m.id : uid(),
          brand, model,
          tech:      (document.getElementById('_nm_tech')||{}).value,
          power_w:   parseFloat((document.getElementById('_nm_pw')||{}).value)||0,
          area:      (document.getElementById('_nm_area')||{}).value,
          price:     parseFloat((document.getElementById('_nm_price')||{}).value)||0,
          life_h:    parseFloat((document.getElementById('_nm_life')||{}).value)||3000,
          kw:        parseFloat((document.getElementById('_nm_kw')||{}).value)||0.1,
          maint:     parseFloat((document.getElementById('_nm_maint')||{}).value)||0.05,
          setup_min: parseFloat((document.getElementById('_nm_setup')||{}).value)||5,
          icon:      (document.getElementById('_nm_icon')||{}).value||'⚡',
          color:     (document.getElementById('_nm_color')||{}).value||'#6366f1',
          note:      (document.getElementById('_nm_note')||{}).value,
          custom:    true,
        };
        var customs = getCustom().filter(function(x){return x.id!==newM.id;});
        customs.unshift(newM);
        saveCustom(customs);
        _selId = newM.id;
        pushHistory(newM.id);
        if (typeof closeModal!=='undefined') closeModal();
        render();
        tt('✅ '+(isEdit?'Modificata':'Aggiunta')+': '+brand+' '+model,'success');
      };
    }, 60);
  }

  /* ── Expose API ──────────────────────────────────────── */
  window.CalcMacchine = {
    render,
    getMachine,
    allMachines,
    getMaterials,
    _getCurrentResult: function(){
      var el = document.getElementById('view-lasercalc');
      if (!el) return null;
      return computeResult(el, getMachine(_selId));
    },
    _getSelectedId: function(){ return _selId; },
  };

  /* ── Hook into App navigation ────────────────────────── */
  ;(function hookNav(){
    var tries=0, iv=setInterval(function(){
      tries++; if(tries>80){clearInterval(iv);return;}
      if(typeof App==='undefined'||!App.renderSection) return;
      clearInterval(iv);
      if(App._calcHooked) return;
      App._calcHooked = true;
      var _orig = App.renderSection.bind(App);
      App.renderSection = async function(s){
        var r = await _orig(s);
        if(['lasercalc','laser_calc','calc_macchine','calcolatore_macchine'].indexOf(s)>-1){
          setTimeout(function(){
            var el=document.getElementById('view-'+s)||document.getElementById('view-lasercalc');
            if(el && !el.querySelector('._cm_mach_card')) render();
          },100);
        }
        return r;
      };
    },300);
  })();

  /* Initial render if already on this section */
  setTimeout(function(){
    var el=document.getElementById('view-lasercalc');
    if(el&&el.classList.contains('active')&&!el.querySelector('._cm_mach_card')) render();
  },600);

  console.log('[Calcolatore Macchine v4] '+allMachines().length+' macchine · '+getMaterials().length+' materiali magazzino ✅');
})();

