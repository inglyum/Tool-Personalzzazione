
/* ═══════════════════════════════════════════════════════════════
   INGLY OS — LASER QUOTER B2B v2.0
   35+ macchine · CRUD completo · Sync Magazzino · Multi-macchina
   ═══════════════════════════════════════════════════════════════ */
;(function LaserB2Bv2(){
  'use strict';
  if(window._laserB2Bv2) return;
  window._laserB2Bv2 = true;

  var LS = {
    get:function(k,d){try{var v=localStorage.getItem(k);return v!=null?JSON.parse(v):d;}catch(e){return d;}},
    set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  };
  var KB={
    added: 'v4_b2b_added',
    input: 'v4_b2b_input',
    sel:   'v4_b2b_sel',
    favs:  'v4_b2b_favs',
  };

  function tt(m,t){if(typeof toast!=='undefined')toast(m,t||'info');}
  function eu(n){return '€'+parseFloat(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:3});}
  function uid(){return 'b2b-'+Date.now()+'-'+Math.random().toString(36).slice(2,5);}

  /* ── Pull all machines from CalcMacchine ──────────────── */
  function getAllMachines(){
    /* Primary: use CalcMacchine if available */
    if (typeof CalcMacchine !== 'undefined' && CalcMacchine.allMachines) {
      return CalcMacchine.allMachines();
    }
    /* Fallback built-in list */
    return FALLBACK_MACHINES;
  }

  /* Fallback if CalcMacchine not yet loaded */
  var FALLBACK_MACHINES = [
    {id:'xt-f2',brand:'xTool',model:'F2',tech:'Diodo+IR',power_w:20,price:999,life_h:3000,kw:0.080,maint:0.04,icon:'⚡',color:'#fbbf24'},
    {id:'xt-f2-ultra',brand:'xTool',model:'F2 Ultra',tech:'Diodo+IR',power_w:40,price:1399,life_h:3000,kw:0.120,maint:0.05,icon:'⚡',color:'#f59e0b'},
    {id:'xt-f2-uv',brand:'xTool',model:'F2 Ultra UV',tech:'UV+IR',power_w:40,price:1699,life_h:3000,kw:0.100,maint:0.03,icon:'🌈',color:'#a78bfa'},
    {id:'xt-m2',brand:'xTool',model:'M2',tech:'Diodo',power_w:20,price:799,life_h:3000,kw:0.090,maint:0.04,icon:'🔷',color:'#38bdf8'},
    {id:'xt-p3',brand:'xTool',model:'P3',tech:'Diodo',power_w:20,price:799,life_h:3000,kw:0.065,maint:0.04,icon:'🔷',color:'#06b6d4'},
    {id:'xt-p3-co2',brand:'xTool',model:'P3 CO₂ 80W',tech:'CO₂',power_w:80,price:3199,life_h:8000,kw:0.160,maint:0.07,icon:'⚡',color:'#6366f1'},
    {id:'xt-p2',brand:'xTool',model:'P2 CO₂',tech:'CO₂',power_w:55,price:2499,life_h:6000,kw:0.120,maint:0.06,icon:'🔵',color:'#3b82f6'},
    {id:'xt-f1',brand:'xTool',model:'F1 Fibra',tech:'Fibra',power_w:20,price:1099,life_h:50000,kw:0.050,maint:0.02,icon:'💫',color:'#7c3aed'},
    {id:'fi-20mopa',brand:'Fibra',model:'20W MOPA',tech:'Fibra',power_w:20,price:3500,life_h:50000,kw:0.050,maint:0.02,icon:'🔥',color:'#f43f5e'},
    {id:'fi-30',brand:'Fibra',model:'30W Raycus',tech:'Fibra',power_w:30,price:3000,life_h:60000,kw:0.080,maint:0.02,icon:'🔥',color:'#e11d48'},
    {id:'co-80',brand:'CO₂',model:'80W',tech:'CO₂',power_w:80,price:1200,life_h:6000,kw:0.200,maint:0.07,icon:'💨',color:'#06b6d4'},
    {id:'co-100',brand:'CO₂',model:'100W Reci',tech:'CO₂',power_w:100,price:1800,life_h:8000,kw:0.280,maint:0.09,icon:'🔥',color:'#ef4444'},
    {id:'cnc-3018',brand:'CNC',model:'Router 3018',tech:'CNC',power_w:60,price:120,life_h:2000,kw:0.100,maint:0.05,icon:'🔩',color:'#d97706'},
    {id:'dtf-pa3',brand:'Prestige',model:'A3 DTF',tech:'DTF',power_w:0,price:2500,life_h:3000,kw:0.500,maint:0.12,icon:'🖨️',color:'#fb7185'},
    {id:'uv-a3',brand:'UV',model:'A3 Flatbed',tech:'UV',power_w:0,price:6000,life_h:5000,kw:2.000,maint:0.15,icon:'🌈',color:'#818cf8'},
    {id:'sub-sg5',brand:'Sawgrass',model:'SG500',tech:'Sub',power_w:0,price:699,life_h:3000,kw:0.020,maint:0.02,icon:'🎨',color:'#fb923c'},
    {id:'pr-3838',brand:'Pressa',model:'38×38cm',tech:'Pressa',power_w:0,price:200,life_h:5000,kw:1.500,maint:0.02,icon:'♨️',color:'#d97706'},
  ];

  /* Compute hourly cost for a machine */
  function hourlyOf(m,kwh,extra_labor){
    var price  = m.price||1000;
    var lifeH  = m.life_h||3000;
    var kw     = m.kw||0.1;
    var maint  = m.maint||0.05;
    var labor  = extra_labor||0;
    return (price/lifeH) + kw*(kwh||0.28) + maint + labor/60;
  }

  /* ── Added machines persistence ───────────────────────── */
  function getAdded(){return LS.get(KB.added,[]);}
  function saveAdded(a){LS.set(KB.added,a);}
  function isAdded(id){return getAdded().indexOf(id)>-1;}
  function addMachine(id){if(!isAdded(id)){var a=getAdded();a.push(id);saveAdded(a);}}
  function removeMachine(id){saveAdded(getAdded().filter(function(x){return x!==id;}));}

  /* ── Materials from Magazzino ─────────────────────────── */
  function getMaterials(){
    if (typeof CalcMacchine !== 'undefined' && CalcMacchine.getMaterials) {
      return CalcMacchine.getMaterials();
    }
    try {
      var db=JSON.parse(localStorage.getItem('ingly_saas_db')||'{}');
      var items=(db.items||[]).filter(function(i){return i.nome||i.name;});
      if(items.length) return items.map(function(i){
        return {id:i.id,name:i.nome||i.name,price:+(i.prezzo||0),unit:i.unit||'pz',stock:i.stock||i.qty||0,cat:i.categoria||'Generico'};
      });
    } catch(e){}
    return [
      {id:'m-mdf3',name:'MDF 3mm',price:1.20,unit:'pz',stock:100,cat:'Legno'},
      {id:'m-plexi',name:'Plexiglass 3mm',price:2.50,unit:'pz',stock:40,cat:'Plexiglass'},
      {id:'m-inox',name:'Acciaio Inox',price:1.50,unit:'pz',stock:60,cat:'Metallo'},
      {id:'m-dtf-a4',name:'Film DTF A4',price:0.25,unit:'fg',stock:500,cat:'DTF'},
      {id:'m-tshirt',name:'T-shirt Bianca',price:4.50,unit:'pz',stock:200,cat:'Tessuto'},
      {id:'m-tazza',name:'Tazza 11oz',price:1.80,unit:'pz',stock:150,cat:'Ceramica'},
    ];
  }

  /* ── STATE ────────────────────────────────────────────── */
  var _selMachId  = LS.get(KB.sel,'xt-p3');
  var _searchQ    = '';
  var _machFilter = 'Tutte';

  /* ── MAIN RENDER ──────────────────────────────────────── */
  function render(){
    var el = document.getElementById('view-laser_b2b');
    if(!el){ el=document.createElement('div'); el.id='view-laser_b2b'; el.className='section-view'; }
    if(!document.getElementById('view-laser_b2b')) {
      var ci=document.getElementById('content-inner');
      if(ci) ci.appendChild(el);
    }

    var inp   = LS.get(KB.input,{kwh:0.28,labor:18,pack:0.30,markup_b2b:2.0,markup_etsy:3.5,markup_retail:3.0,qty:10});
    var mats  = getMaterials();
    var allM  = getAllMachines();
    var favs  = LS.get(KB.favs,[]);
    var added = getAdded();

    /* If nothing added yet, auto-add first 12 */
    if(!added.length){
      allM.slice(0,12).forEach(function(m){added.push(m.id);});
      saveAdded(added);
    }

    var activeMachines = allM.filter(function(m){return added.indexOf(m.id)>-1;});
    var notAdded = allM.filter(function(m){
      var matchQ = !_searchQ || (m.brand+' '+m.model+' '+m.tech).toLowerCase().indexOf(_searchQ.toLowerCase())>-1;
      var matchF = _machFilter==='Tutte' || (m.tech||'').indexOf(_machFilter)>-1;
      return added.indexOf(m.id)<0 && matchQ && matchF;
    });

    var selM = activeMachines.find(function(m){return m.id===_selMachId;}) || activeMachines[0] || allM[0];
    if(selM) _selMachId = selM.id;

    var TECHS = ['Tutte','CO₂','Diodo','Fibra','UV','DTF','Sub','Pressa','CNC'];

    var matOpts = '<option value="">— Nessun materiale —</option>'
      + mats.map(function(m){return '<option value="'+m.id+'" data-price="'+m.price+'">'+m.name+' '+eu(m.price)+'/'+m.unit+'</option>';}).join('');

    el.innerHTML =
    '<div style="padding:0;height:calc(100vh - 64px);display:grid;grid-template-columns:280px 1fr;overflow:hidden">'

    /* ══ LEFT — Machine Management ═══════════════════════ */
    +'<div style="display:flex;flex-direction:column;border-right:1px solid var(--border,#2a2a35);overflow:hidden">'

      +'<div style="padding:10px 12px;background:var(--bg-card,#111115);border-bottom:1px solid var(--border,#2a2a35)">'
        +'<div style="font-size:13px;font-weight:800;color:var(--text,#e8e8f0);margin-bottom:6px">💼 Laser Quoter B2B</div>'
        +'<div style="font-size:11px;color:var(--text-muted,#888);margin-bottom:8px">'+activeMachines.length+' macchine attive · clicca per calcolare</div>'
        +'<input id="_b2_search" placeholder="🔍 Cerca macchina..." style="width:100%;box-sizing:border-box;padding:6px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:11px;outline:none">'
      +'</div>'

      /* Active machines */
      +'<div style="flex:1;overflow-y:auto;padding:4px 6px">'
        +'<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted,#666);padding:6px 10px 2px">Macchine attive ('+activeMachines.length+')</div>'
        +activeMachines.map(function(m){
          var isSel = m.id===_selMachId;
          return '<div class="_b2_mach" data-id="'+m.id+'" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;margin-bottom:2px;'
            +(isSel?'background:'+m.color+'18;border:1px solid '+m.color+'44;':'border:1px solid transparent;')+'">'
            +'<div style="width:30px;height:30px;border-radius:7px;background:'+(m.color||'#6366f1')+'20;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">'+(m.icon||'⚡')+'</div>'
            +'<div style="flex:1;min-width:0">'
              +'<div style="font-size:11px;font-weight:700;color:var(--text,#e8e8f0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+m.brand+' '+m.model+'</div>'
              +'<div style="font-size:9px;color:var(--text-muted,#888)">'+m.tech+(m.power_w?' · '+m.power_w+'W':'')+'</div>'
            +'</div>'
            +'<button class="_b2_rem" data-id="'+m.id+'" title="Rimuovi da B2B" style="background:none;border:none;cursor:pointer;font-size:12px;color:#ef4444;padding:2px;opacity:.5;line-height:1">−</button>'
            +'</div>';
        }).join('')
        +'<div style="border-top:1px solid var(--border,#2a2a35);margin:6px 0"></div>'
        +'<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted,#666);padding:4px 10px 2px">Aggiungi macchina ('+notAdded.length+')</div>'
        +'<div style="display:flex;gap:3px;flex-wrap:wrap;padding:4px 8px 6px">'
          +TECHS.map(function(t){
            return '<button class="_b2_tf" data-t="'+t+'" style="padding:2px 7px;border-radius:99px;border:1px solid '+(_machFilter===t?'var(--primary,#6366f1)':'var(--border,#333)')+';background:'+(_machFilter===t?'var(--primary,#6366f1)':'transparent')+';color:'+(_machFilter===t?'#fff':'var(--text-muted,#888)')+';cursor:pointer;font-size:9px;font-family:inherit">'+t+'</button>';
          }).join('')
        +'</div>'
        +notAdded.slice(0,30).map(function(m){
          return '<div class="_b2_add_m" data-id="'+m.id+'" style="display:flex;align-items:center;gap:7px;padding:6px 10px;border-radius:7px;cursor:pointer;border:1px solid transparent;margin-bottom:1px;opacity:.7" title="Aggiungi '+m.brand+' '+m.model+' a B2B">'
            +'<div style="width:26px;height:26px;border-radius:6px;background:'+(m.color||'#6366f1')+'20;display:flex;align-items:center;justify-content:center;font-size:12px">'+(m.icon||'⚡')+'</div>'
            +'<div style="flex:1;min-width:0">'
              +'<div style="font-size:10px;font-weight:700;color:var(--text,#e8e8f0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+m.brand+' '+m.model+'</div>'
              +'<div style="font-size:9px;color:var(--text-muted,#888)">'+m.tech+'</div>'
            +'</div>'
            +'<span style="color:var(--primary,#818cf8);font-size:14px;font-weight:700">+</span>'
            +'</div>';
        }).join('')
      +'</div>'

      /* Toolbar */
      +'<div style="padding:8px 10px;border-top:1px solid var(--border,#2a2a35);background:var(--bg-card,#111115)">'
        +'<button id="_b2_add_all" style="width:100%;padding:7px;background:var(--primary,#6366f1)15;border:1px solid var(--primary,#6366f1)30;border-radius:7px;color:var(--primary,#818cf8);cursor:pointer;font-size:11px;font-weight:700;font-family:inherit">⚙️ Gestisci da Calcolatore Macchine</button>'
      +'</div>'

    +'</div>'

    /* ══ RIGHT — Quote Calculator ═════════════════════════ */
    +'<div style="overflow-y:auto;padding:16px 18px">'

    +(selM?
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">'
        +'<div style="width:42px;height:42px;border-radius:11px;background:'+selM.color+'20;display:flex;align-items:center;justify-content:center;font-size:20px">'+selM.icon+'</div>'
        +'<div><div style="font-size:17px;font-weight:900;color:var(--text,#e8e8f0)">'+selM.brand+' '+selM.model+'</div>'
        +'<div style="font-size:11px;color:'+selM.color+';font-weight:600">'+selM.tech+(selM.power_w?' · '+selM.power_w+'W':'')+'</div></div>'
        +'<button id="_b2_send_q" style="margin-left:auto;padding:8px 16px;background:var(--primary,#6366f1);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:12px">→ Invia a Smart Quoter</button>'
      +'</div>'

      /* Config row */
      +'<div class="card" style="padding:14px;margin-bottom:12px">'
        +'<div style="font-size:12px;font-weight:700;color:var(--text,#e8e8f0);margin-bottom:10px">⚙️ Parametri</div>'
        +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'
          +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">💡 €/kWh</label>'
            +'<input id="_b2_kwh" type="number" step="0.01" value="'+(inp.kwh||0.28)+'" class="_b2_inp" style="width:100%;box-sizing:border-box;padding:7px 8px;background:var(--bg-card2,#18181f);border:1.5px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px"></div>'
          +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">👤 Manodopera €/h</label>'
            +'<input id="_b2_labor" type="number" value="'+(inp.labor||18)+'" class="_b2_inp" style="width:100%;box-sizing:border-box;padding:7px 8px;background:var(--bg-card2,#18181f);border:1.5px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px"></div>'
          +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">📦 Imballo €/pz</label>'
            +'<input id="_b2_pack" type="number" step="0.01" value="'+(inp.pack||0.30)+'" class="_b2_inp" style="width:100%;box-sizing:border-box;padding:7px 8px;background:var(--bg-card2,#18181f);border:1.5px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px"></div>'
          +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">🔢 Quantità</label>'
            +'<input id="_b2_qty" type="number" min="1" value="'+(inp.qty||10)+'" class="_b2_inp" style="width:100%;box-sizing:border-box;padding:7px 8px;background:var(--bg-card2,#18181f);border:1.5px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px"></div>'
        +'</div>'
        +'<div id="_b2_hourly_hint" style="margin-top:8px;font-size:11px;color:var(--text-muted,#888)">Costo orario macchina: <strong id="_b2_cph" style="color:var(--primary,#818cf8)">—</strong></div>'
      +'</div>'

      /* Product / Work data */
      +'<div class="card" style="padding:14px;margin-bottom:12px">'
        +'<div style="font-size:12px;font-weight:700;color:var(--text,#e8e8f0);margin-bottom:10px">📐 Dati Produzione</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
          +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">📝 Descrizione prodotto</label>'
            +'<input id="_b2_job" value="'+(inp.job||'Incisione laser')+'" placeholder="es: Portachiavi bambù con logo" class="_b2_inp" style="width:100%;box-sizing:border-box;padding:7px 8px;background:var(--bg-card2,#18181f);border:1.5px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px"></div>'
          +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">⏲ Tempo macchina (min/pz)</label>'
            +'<input id="_b2_min" type="number" step="0.1" value="'+(inp.min||2)+'" class="_b2_inp" style="width:100%;box-sizing:border-box;padding:7px 8px;background:var(--bg-card2,#18181f);border:1.5px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
          +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">🪵 Materiale (Magazzino)</label>'
            +'<select id="_b2_mat" class="_b2_inp" style="width:100%;padding:7px 8px;background:var(--bg-card2,#18181f);border:1.5px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px">'+matOpts+'</select>'
          +'</div>'
          +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">💶 Costo materiale €/pz</label>'
            +'<input id="_b2_mat_cost" type="number" step="0.01" value="'+(inp.mat_cost||0)+'" class="_b2_inp" style="width:100%;box-sizing:border-box;padding:7px 8px;background:var(--bg-card2,#18181f);border:1.5px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px"></div>'
        +'</div>'
      +'</div>'

      /* Markup tiers */
      +'<div class="card" style="padding:14px;margin-bottom:12px">'
        +'<div style="font-size:12px;font-weight:700;color:var(--text,#e8e8f0);margin-bottom:10px">💰 Markup per Canale</div>'
        +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'
          +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">× B2B</label><input id="_b2_mk_b2b" type="number" step="0.1" value="'+(inp.markup_b2b||2.0)+'" class="_b2_inp" style="width:100%;box-sizing:border-box;padding:7px 8px;background:var(--bg-card2,#18181f);border:1.5px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px"></div>'
          +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">× Etsy/Marketplace</label><input id="_b2_mk_etsy" type="number" step="0.1" value="'+(inp.markup_etsy||3.5)+'" class="_b2_inp" style="width:100%;box-sizing:border-box;padding:7px 8px;background:var(--bg-card2,#18181f);border:1.5px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px"></div>'
          +'<div><label style="font-size:10px;color:var(--text-muted,#888);display:block;margin-bottom:3px">× Retail</label><input id="_b2_mk_ret" type="number" step="0.1" value="'+(inp.markup_retail||3.0)+'" class="_b2_inp" style="width:100%;box-sizing:border-box;padding:7px 8px;background:var(--bg-card2,#18181f);border:1.5px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:12px"></div>'
        +'</div>'
      +'</div>'

      /* Results */
      +'<div id="_b2_results"></div>'

    :'<div style="padding:40px;text-align:center;color:var(--text-muted,#888)"><div style="font-size:36px;margin-bottom:12px">💼</div><div>Aggiungi macchine dal pannello a sinistra per iniziare</div></div>')

    +'</div>'
    +'</div>'; /* end grid */

    bindB2B(el, selM, inp);
    if (selM) calcB2B(el, selM, inp);
  }

  function bindB2B(el, selM, inp){
    /* Machine select */
    el.querySelectorAll('._b2_mach').forEach(function(card){
      card.onclick = function(){
        _selMachId = card.dataset.id;
        LS.set(KB.sel,_selMachId);
        render();
      };
    });
    /* Remove machine */
    el.querySelectorAll('._b2_rem').forEach(function(btn){
      btn.onclick = function(e){
        e.stopPropagation();
        var id=btn.dataset.id;
        var name=(getAllMachines().find(function(m){return m.id===id;})||{}).model||id;
        if(!window.confirm('Rimuovere '+name+' da B2B?')) return;
        removeMachine(id);
        if(_selMachId===id) _selMachId=getAdded()[0]||'xt-p3';
        render(); tt('Macchina rimossa','info');
      };
    });
    /* Add machine from list */
    el.querySelectorAll('._b2_add_m').forEach(function(card){
      card.onclick = function(){
        addMachine(card.dataset.id);
        _selMachId = card.dataset.id;
        LS.set(KB.sel,_selMachId);
        render();
        var m=getAllMachines().find(function(x){return x.id===card.dataset.id;});
        tt('+'+(m?m.brand+' '+m.model:card.dataset.id)+' aggiunta','success');
      };
    });
    /* Tech filter */
    el.querySelectorAll('._b2_tf').forEach(function(btn){
      btn.onclick = function(){ _machFilter=btn.dataset.t; render(); };
    });
    /* Search */
    var srch=el.querySelector('#_b2_search');
    if(srch) srch.oninput = function(){ _searchQ=this.value; render(); };
    /* Go to Calcolatore Macchine */
    var addAll=el.querySelector('#_b2_add_all');
    if(addAll) addAll.onclick = function(){
      if(typeof App!=='undefined'&&App.navigate) App.navigate('lasercalc');
      else tt('Vai a Calcolatore Macchine','info');
    };
    /* Material select */
    var matSel=el.querySelector('#_b2_mat');
    if(matSel) matSel.onchange = function(){
      var opt=this.options[this.selectedIndex];
      var price=parseFloat(opt.dataset.price)||0;
      var ce=el.querySelector('#_b2_mat_cost');
      if(ce&&price>0) ce.value=price;
      saveB2BInput(el);
      if(selM) calcB2B(el,selM,LS.get(KB.input,inp));
    };
    /* Send to quoter */
    var sendQ=el.querySelector('#_b2_send_q');
    if(sendQ) sendQ.onclick = function(){
      var r=computeB2B(el,selM);
      if(!r) return;
      var job=(el.querySelector('#_b2_job')||{}).value||(selM.brand+' '+selM.model);
      var qty=r.qty;
      LS.set('lc_to_quoter',{machine:_selMachId,cost:r.unitCost,price:r.p_etsy,label:job,qty});
      if(typeof App!=='undefined'&&App.navigate) App.navigate('quoter');
      setTimeout(function(){
        if(typeof Quoter!=='undefined'&&Quoter.addLineFromCalc)
          Quoter.addLineFromCalc({name:job,unitCost:r.p_etsy,qty,category:'Laser B2B',detail:selM.brand+' '+selM.model});
      },400);
      tt('→ '+job+' · '+eu(r.p_etsy)+'/pz → Quoter','success');
    };
    /* All inputs */
    el.querySelectorAll('._b2_inp').forEach(function(inp){
      inp.oninput = function(){
        saveB2BInput(el);
        if(selM) calcB2B(el,selM,LS.get(KB.input,{}));
      };
    });
  }

  function saveB2BInput(el){
    var g=function(id,def){var e=el.querySelector('#'+id);return e?(isNaN(parseFloat(e.value))?(e.value||def):parseFloat(e.value)):def;};
    LS.set(KB.input,{
      kwh:g('_b2_kwh',0.28), labor:g('_b2_labor',18), pack:g('_b2_pack',0.30), qty:g('_b2_qty',10),
      job:g('_b2_job',''), min:g('_b2_min',2), mat_cost:g('_b2_mat_cost',0),
      markup_b2b:g('_b2_mk_b2b',2.0), markup_etsy:g('_b2_mk_etsy',3.5), markup_retail:g('_b2_mk_ret',3.0),
    });
  }

  function computeB2B(el,m){
    if(!m) return null;
    var g=function(id,def){var e=el.querySelector('#'+id);return e?parseFloat(e.value)||def:def;};
    var kwh     = g('_b2_kwh',0.28);
    var labor   = g('_b2_labor',18)/60; /* per minute */
    var pack    = g('_b2_pack',0.30);
    var qty     = Math.max(1,g('_b2_qty',10));
    var jobMin  = g('_b2_min',2);
    var matCost = g('_b2_mat_cost',0);
    var mk_b2b  = g('_b2_mk_b2b',2.0);
    var mk_etsy = g('_b2_mk_etsy',3.5);
    var mk_ret  = g('_b2_mk_ret',3.0);

    var hourly  = hourlyOf(m,kwh,0);
    var machMin = hourly/60; /* cost per minute of machine */
    var laborMin= labor;

    var machineCost = (machMin + laborMin) * jobMin;
    var unitCost    = machineCost + matCost + pack;
    var totalCost   = unitCost * qty;

    var p_b2b  = +(unitCost*mk_b2b).toFixed(2);
    var p_etsy = +(unitCost*mk_etsy).toFixed(2);
    var p_ret  = +(unitCost*mk_ret).toFixed(2);
    var m_b2b  = p_b2b>0  ? Math.round((p_b2b-unitCost)/p_b2b*100)  : 0;
    var m_etsy = p_etsy>0 ? Math.round((p_etsy-unitCost)/p_etsy*100) : 0;
    var m_ret  = p_ret>0  ? Math.round((p_ret-unitCost)/p_ret*100)   : 0;

    return {hourly,machineCost,matCost,pack,unitCost,totalCost,qty,
            p_b2b,p_etsy,p_ret,m_b2b,m_etsy,m_ret,jobMin};
  }

  function calcB2B(el,m,inp){
    var r=computeB2B(el,m); if(!r) return;
    var cph=el.querySelector('#_b2_cph');
    if(cph) cph.textContent=eu(r.hourly)+'/h';

    var box=el.querySelector('#_b2_results'); if(!box) return;
    function row(label,val,color){
      return '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:1px solid var(--border2,#1e1e2e)">'
        +'<span style="color:var(--text-muted,#888)">'+label+'</span>'
        +'<span style="font-weight:700;color:'+(color||'var(--text,#e8e8f0)')+'">'+eu(val)+'</span></div>';
    }
    box.innerHTML=
      '<div class="card" style="padding:14px">'
        +'<div style="font-size:12px;font-weight:700;color:var(--text,#e8e8f0);margin-bottom:10px">💵 Calcolo</div>'
        +row('Costo macchina ('+r.jobMin+'min)',r.machineCost)
        +row('Materiale',r.matCost)
        +row('Imballo',r.pack)
        +'<div style="border-top:1px solid var(--border,#2a2a35);margin:6px 0"></div>'
        +row('Costo unitario',r.unitCost,'#fbbf24')
        +(r.qty>1?row('Costo totale ×'+r.qty,r.totalCost,'#fbbf24'):'')
        +'<div style="border-top:1px solid var(--border,#2a2a35);margin:10px 0"></div>'
        +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">'
          +[
            {l:'🏭 B2B',p:r.p_b2b,m:r.m_b2b,c:'#64748b'},
            {l:'🛍 Etsy',p:r.p_etsy,m:r.m_etsy,c:'#f97316'},
            {l:'🏪 Retail',p:r.p_ret,m:r.m_ret,c:'#6366f1'},
          ].map(function(t){
            return '<div style="background:'+t.c+'12;border:1px solid '+t.c+'25;border-radius:8px;padding:8px;text-align:center">'
              +'<div style="font-size:10px;font-weight:700;color:'+t.c+'">'+t.l+'</div>'
              +'<div style="font-size:18px;font-weight:900;color:'+t.c+'">'+eu(t.p)+'</div>'
              +(r.qty>1?'<div style="font-size:9px;color:#555">×'+r.qty+' '+eu(t.p*r.qty)+'</div>':'')
              +'<div style="font-size:10px;color:'+t.c+';opacity:.7">marg.'+t.m+'%</div>'
              +'</div>';
          }).join('')
        +'</div>'
        +(r.m_etsy<25?'<div style="margin-top:8px;padding:7px;background:#ef444410;border:1px solid #ef444425;border-radius:7px;font-size:11px;color:#fca5a5">⚠️ Margine Etsy basso ('+r.m_etsy+'%). Rivedi markup o costi.</div>':'')
        +(r.m_etsy>50?'<div style="margin-top:8px;padding:7px;background:#10b98110;border:1px solid #10b98125;border-radius:7px;font-size:11px;color:#86efac">✅ Ottimo margine Etsy!</div>':'')
      +'</div>';
  }

  /* ── Expose and hook ──────────────────────────────────── */
  window.LaserB2Bv2Module = { render };

  ;(function hookNav(){
    var tries=0, iv=setInterval(function(){
      tries++; if(tries>80){clearInterval(iv);return;}
      if(typeof App==='undefined'||!App.renderSection) return;
      clearInterval(iv);
      if(App._b2bHooked) return;
      App._b2bHooked = true;
      var _orig=App.renderSection.bind(App);
      App.renderSection=async function(s){
        var r=await _orig(s);
        if(s==='laser_b2b'){
          setTimeout(function(){
            var el=document.getElementById('view-laser_b2b');
            if(el&&!el.querySelector('._b2_mach')) render();
          },100);
        }
        return r;
      };
    },300);
  })();

  setTimeout(function(){
    var el=document.getElementById('view-laser_b2b');
    if(el&&el.classList.contains('active')&&!el.querySelector('._b2_mach')) render();
  },700);

  console.log('[Laser Quoter B2B v2] '+getAllMachines().length+' macchine disponibili · Magazzino sync ✅');
})();

