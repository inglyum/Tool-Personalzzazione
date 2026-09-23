
// ingly-prox-v3.js — INGLY OS · V3 Production Hub + Magazzino ERP Pro
// Magazzino: table ERP, movimenti, modal editing, analytics
// Attrezzature: manutenzione predittiva, log ore
// Supplier Intel: tier ranking, benchmark
(function () {
  'use strict';
  if (window._inglyProXV3) return;
  window._inglyProXV3 = true;

  /* ── utils ── */
  function _get(k){ try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;} }
  function _set(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} }
  function _store(k){ var v=_get(k); return Array.isArray(v)?v:(v&&Array.isArray(v.items)?v.items:[]); }
  function fmt(n,d){ d=d===undefined?2:d; return '€'+(+n||0).toLocaleString('it-IT',{minimumFractionDigits:d,maximumFractionDigits:d}); }
  function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
  function dateIT(d){ try{return new Date(d).toLocaleDateString('it-IT');}catch(e){return d||'—';} }
  function readOrders(){ var out=[],seen={}; ['ingly_orders','ingly_quotes','lb2b_quotes_v1'].forEach(function(k){ _store(k).forEach(function(o){ var id=o.id||o.orderId||''; if(!seen[id]){seen[id]=true;out.push(o);} }); }); return out; }
  function orderClient(o){ return o.client||o.clientName||o.cliente||o.name||''; }
  function orderAmt(o){ return +(o.total||o.totalPrice||o.amount||o.totale||o.subtotal||0); }
  function orderStatus(o){ var s=(o.status||o.stage||o.stato||'').toLowerCase(); if(s.includes('produz')||s.includes('lavoraz'))return 'produzione'; if(s.includes('spediz')||s.includes('consegn'))return 'consegnato'; if(s.includes('pagat')||s.includes('paid')||s.includes('completat'))return 'pagato'; if(s.includes('annull')||s.includes('cancel'))return 'annullato'; return 'attesa'; }

  /* ── CSS ── */
  function injectV3CSS(){
    if(document.getElementById('prox-v3-css'))return;
    var s=document.createElement('style');
    s.id='prox-v3-css';
    s.textContent=
/* ── base ── */
'.v3-card{background:var(--bg-card,#0f0f11);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:18px 20px;margin-bottom:16px;}'+
'.v3-section-header{display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap;}'+
'.v3-section-title{font-size:1rem;font-weight:700;color:var(--text,#e5e5e5);flex:1;}'+
'.v3-btn{padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-size:.8rem;font-weight:700;transition:.15s;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}'+
'.v3-btn-primary{background:#fbbf24;color:#09090b;}.v3-btn-primary:hover{background:#f59e0b;}'+
'.v3-btn-ghost{background:transparent;border:1px solid rgba(255,255,255,.12);color:#a1a1aa;}.v3-btn-ghost:hover{border-color:var(--primary,#fbbf24);color:var(--primary,#fbbf24);}'+
'.v3-btn-danger{background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);}.v3-btn-danger:hover{background:rgba(239,68,68,.2);}'+
'.v3-btn-green{background:rgba(34,197,94,.1);color:#22c55e;border:1px solid rgba(34,197,94,.2);}.v3-btn-green:hover{background:rgba(34,197,94,.2);}'+
'.v3-btn-sm{padding:5px 11px;font-size:.72rem;border-radius:7px;}'+
'.v3-btn-xs{padding:3px 8px;font-size:.68rem;border-radius:6px;}'+
'.v3-input{padding:8px 11px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#e5e5e5;font-size:.82rem;outline:none;width:100%;box-sizing:border-box;transition:border-color .12s;}'+
'.v3-input:focus{border-color:rgba(251,191,36,.5);}'+
'.v3-select{padding:8px 11px;background:#111113;border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#e5e5e5;font-size:.82rem;outline:none;box-sizing:border-box;cursor:pointer;}'+
'.v3-label{font-size:.72rem;color:#71717a;display:block;margin-bottom:5px;font-weight:600;text-transform:uppercase;letter-spacing:.03em;}'+
'.v3-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:16px;}'+
'.v3-kpi{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:12px 14px;}'+
'.v3-kpi-val{font-size:1.4rem;font-weight:800;line-height:1.1;margin-bottom:4px;}'+
'.v3-kpi-lbl{font-size:.68rem;color:#71717a;text-transform:uppercase;letter-spacing:.04em;}'+
'.v3-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:.68rem;font-weight:700;}'+
'.v3-badge-red{background:rgba(239,68,68,.15);color:#ef4444;}'+
'.v3-badge-yellow{background:rgba(245,158,11,.15);color:#f59e0b;}'+
'.v3-badge-green{background:rgba(34,197,94,.15);color:#22c55e;}'+
'.v3-badge-gray{background:rgba(100,116,139,.15);color:#94a3b8;}'+
'.v3-badge-blue{background:rgba(96,165,250,.15);color:#60a5fa;}'+
'.v3-sep{height:1px;background:rgba(255,255,255,.06);margin:14px 0;}'+
/* ── alert strips ── */
'.v3-alert{padding:10px 14px;border-radius:9px;font-size:.8rem;display:flex;align-items:center;gap:8px;margin-bottom:10px;}'+
'.v3-alert-warn{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);color:#fcd34d;}'+
'.v3-alert-err{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:#fca5a5;}'+
'.v3-alert-ok{background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);color:#86efac;}'+
/* ═══ MAGAZZINO ERP ═══ */
'#prox-mag-wrap{padding:0 0 40px;}'+
'#prox-mag-wrap .mag-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px;}'+
'#prox-mag-wrap .mag-search-wrap{flex:1;min-width:200px;position:relative;}'+
'#prox-mag-wrap .mag-search-wrap::before{content:"🔍";position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:.8rem;pointer-events:none;}'+
'#prox-mag-wrap .mag-search{padding:8px 10px 8px 32px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#e5e5e5;font-size:.82rem;outline:none;width:100%;box-sizing:border-box;}'+
'#prox-mag-wrap .mag-search:focus{border-color:rgba(251,191,36,.4);}'+
/* tabs */
'.mag-tab-bar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;}'+
'.mag-tab{padding:5px 14px;border-radius:20px;border:1px solid rgba(255,255,255,.1);background:transparent;color:#71717a;cursor:pointer;font-size:.75rem;font-weight:600;transition:.12s;}'+
'.mag-tab.active{border-color:rgba(251,191,36,.5);color:#fbbf24;background:rgba(251,191,36,.08);}'+
/* view toggle */
'.mag-view-btn{padding:6px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:transparent;color:#52525b;cursor:pointer;font-size:.78rem;transition:.12s;}'+
'.mag-view-btn.active{background:rgba(251,191,36,.1);border-color:rgba(251,191,36,.3);color:#fbbf24;}'+
/* TABLE view */
'.mag-table-wrap{overflow-x:auto;border:1px solid rgba(255,255,255,.07);border-radius:10px;}'+
'.mag-table{width:100%;border-collapse:collapse;font-size:.8rem;}'+
'.mag-table th{padding:10px 12px;text-align:left;color:#52525b;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);white-space:nowrap;cursor:pointer;user-select:none;}'+
'.mag-table th:hover{color:#a1a1aa;}'+
'.mag-table th.sorted-asc::after{content:" ↑";color:#fbbf24;}'+
'.mag-table th.sorted-desc::after{content:" ↓";color:#fbbf24;}'+
'.mag-table td{padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.04);vertical-align:middle;color:#e5e5e5;}'+
'.mag-table tr:last-child td{border-bottom:none;}'+
'.mag-table tr:hover td{background:rgba(255,255,255,.02);}'+
'.mag-table tr.row-out td{background:rgba(239,68,68,.03);}'+
'.mag-table tr.row-low td{background:rgba(245,158,11,.03);}'+
/* GRID view */
'.mag-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;}'+
'.mag-card{padding:14px 16px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-radius:11px;transition:.15s;position:relative;cursor:pointer;}'+
'.mag-card:hover{border-color:rgba(255,255,255,.18);background:rgba(255,255,255,.04);}'+
'.mag-card.card-out{border-color:rgba(239,68,68,.35)!important;background:rgba(239,68,68,.04);}'+
'.mag-card.card-low{border-color:rgba(245,158,11,.3)!important;background:rgba(245,158,11,.03);}'+
'.mag-card-cat{font-size:.65rem;color:#52525b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;}'+
'.mag-card-name{font-size:.88rem;font-weight:700;color:#e5e5e5;margin-bottom:8px;line-height:1.3;}'+
'.mag-card-qty{font-size:1.6rem;font-weight:800;line-height:1;}'+
'.mag-card-unit{font-size:.7rem;color:#71717a;}'+
'.mag-card-meta{font-size:.72rem;color:#94a3b8;margin-top:6px;}'+
'.mag-card-bar{height:4px;background:rgba(255,255,255,.07);border-radius:2px;margin-top:8px;}'+
'.mag-card-bar-fill{height:100%;border-radius:2px;transition:.3s;}'+
'.mag-card-actions{display:flex;gap:4px;margin-top:10px;}'+
'.mag-alert-chip{position:absolute;top:9px;right:9px;font-size:.6rem;font-weight:800;padding:2px 7px;border-radius:10px;}'+
/* inline qty stepper */
'.mag-qty-ctrl{display:flex;align-items:center;gap:4px;}'+
'.mag-qty-btn{width:24px;height:24px;border-radius:5px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#a1a1aa;cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;font-weight:700;transition:.1s;line-height:1;padding:0;}'+
'.mag-qty-btn:hover{border-color:var(--primary,#fbbf24);color:var(--primary,#fbbf24);}'+
'.mag-qty-in{width:52px;text-align:center;padding:4px 6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:5px;color:#e5e5e5;font-size:.82rem;outline:none;}'+
'.mag-qty-in:focus{border-color:rgba(251,191,36,.4);}'+
/* ── MODAL ── */
'.mag-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;}'+
'.mag-modal{background:#111113;border:1px solid rgba(255,255,255,.12);border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.7);}'+
'.mag-modal-header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.08);}'+
'.mag-modal-title{font-size:1rem;font-weight:700;color:#e5e5e5;}'+
'.mag-modal-close{width:30px;height:30px;border-radius:50%;border:1px solid rgba(255,255,255,.1);background:transparent;color:#71717a;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;}'+
'.mag-modal-close:hover{border-color:#ef4444;color:#ef4444;}'+
'.mag-modal-body{padding:20px;}'+
'.mag-modal-footer{padding:14px 20px;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:flex-end;gap:8px;}'+
'.mag-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;}'+
'@media(max-width:480px){.mag-form-grid{grid-template-columns:1fr;}}'+
/* movements history */
'.mov-table{width:100%;border-collapse:collapse;font-size:.75rem;}'+
'.mov-table th{padding:8px 10px;text-align:left;color:#52525b;font-size:.65rem;font-weight:700;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07);}'+
'.mov-table td{padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.04);color:#a1a1aa;}'+
'.mov-table tr:last-child td{border-bottom:none;}'+
'.mov-plus{color:#22c55e;font-weight:700;}'+
'.mov-minus{color:#ef4444;font-weight:700;}'+
/* reorder panel */
'.reorder-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-radius:8px;margin-bottom:6px;}'+
'.reorder-icon{font-size:1.2rem;flex-shrink:0;}'+
'.reorder-info{flex:1;}'+
'.reorder-name{font-size:.83rem;font-weight:700;color:#e5e5e5;}'+
'.reorder-meta{font-size:.72rem;color:#94a3b8;margin-top:2px;}'+
/* analytics */
'.cat-bar{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);}'+
'.cat-bar-label{font-size:.8rem;font-weight:600;color:#e5e5e5;width:120px;flex-shrink:0;}'+
'.cat-bar-track{flex:1;height:8px;background:rgba(255,255,255,.07);border-radius:4px;}'+
'.cat-bar-fill{height:100%;border-radius:4px;background:#fbbf24;}'+
'.cat-bar-val{font-size:.78rem;color:#71717a;width:70px;text-align:right;flex-shrink:0;}'+
/* ═══ PRODUCTION SCHEDULER ═══ */
'#prox-scheduler .sched-queue{display:flex;flex-direction:column;gap:6px;max-height:380px;overflow-y:auto;}'+
'.sched-item{display:grid;grid-template-columns:28px 1fr auto auto auto;align-items:center;gap:8px 12px;padding:10px 12px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:9px;transition:.12s;}'+
'.sched-item:hover{border-color:rgba(251,191,36,.2);}'+
'.sched-pos{width:24px;height:24px;border-radius:50%;background:rgba(251,191,36,.12);color:#fbbf24;font-size:.72rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}'+
'.sched-client{font-size:.85rem;font-weight:600;color:#e5e5e5;}'+
'.sched-desc{font-size:.7rem;color:#52525b;margin-top:2px;}'+
'.sched-tech{font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:8px;}'+
'.sched-laser{background:rgba(251,191,36,.12);color:#fbbf24;}'+
'.sched-dtf{background:rgba(167,139,250,.12);color:#a78bfa;}'+
'.sched-sublimazione{background:rgba(34,211,238,.12);color:#22d3ee;}'+
'.sched-uv{background:rgba(34,197,94,.12);color:#22c55e;}'+
'.sched-misto,.sched-altro{background:rgba(100,116,139,.12);color:#94a3b8;}'+
'.sched-deadline{font-size:.7rem;color:#52525b;white-space:nowrap;}'+
'.sched-deadline.urgent{color:#ef4444;font-weight:700;}'+
'.sched-deadline.soon{color:#f59e0b;font-weight:600;}'+
'.sched-amount{font-size:.78rem;font-weight:700;color:#fbbf24;}'+
'.machine-load-bar{height:6px;background:rgba(255,255,255,.08);border-radius:3px;margin-top:5px;}'+
'.machine-load-fill{height:100%;border-radius:3px;transition:.4s;}';
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════════════════════════════
     V3 — MAGAZZINO ERP PROFESSIONALE
  ═══════════════════════════════════════════════════════════════════ */
  var MAG_KEY  = 'prox_magazzino_v1';
  var MOVS_KEY = 'prox_magazzino_movimenti_v1';

  var DEFAULT_MAG_ITEMS = [
    { id:'m1',  name:'MDF 3mm 30×20 cm',      cat:'Legno',         qty:50,  minQty:10, maxQty:200, unit:'pz',     cost:1.20, supplier:'Modulor',     location:'A1',  notes:'' },
    { id:'m2',  name:'MDF 6mm 30×20 cm',      cat:'Legno',         qty:20,  minQty:5,  maxQty:100, unit:'pz',     cost:2.20, supplier:'Modulor',     location:'A2',  notes:'' },
    { id:'m3',  name:'Acrilico 3mm Trasparente',cat:'Acrilico',     qty:15,  minQty:5,  maxQty:60,  unit:'pz',     cost:4.50, supplier:'Plastica2',   location:'B1',  notes:'' },
    { id:'m4',  name:'Acrilico 3mm Bianco',    cat:'Acrilico',      qty:12,  minQty:5,  maxQty:60,  unit:'pz',     cost:4.20, supplier:'Plastica2',   location:'B2',  notes:'' },
    { id:'m5',  name:'Pelle Naturale A4',      cat:'Pelle',         qty:8,   minQty:3,  maxQty:30,  unit:'fg',     cost:8.00, supplier:'CuoioIT',     location:'C1',  notes:'' },
    { id:'m6',  name:'Transfer DTF A4',        cat:'DTF',           qty:200, minQty:50, maxQty:800, unit:'fg',     cost:0.35, supplier:'DTFprint',    location:'D1',  notes:'' },
    { id:'m7',  name:'Transfer DTF A3',        cat:'DTF',           qty:80,  minQty:20, maxQty:400, unit:'fg',     cost:0.65, supplier:'DTFprint',    location:'D2',  notes:'' },
    { id:'m8',  name:'Carta Sublimazione A4',  cat:'Sub',           qty:500, minQty:100,maxQty:2000,unit:'fg',     cost:0.08, supplier:'SubliMat',    location:'E1',  notes:'' },
    { id:'m9',  name:'Carta Sublimazione A3',  cat:'Sub',           qty:200, minQty:50, maxQty:1000,unit:'fg',     cost:0.14, supplier:'SubliMat',    location:'E2',  notes:'' },
    { id:'m10', name:'Tazze Bianche 11oz',     cat:'Gadget',        qty:30,  minQty:12, maxQty:120, unit:'pz',     cost:1.80, supplier:'GadgetPro',   location:'F1',  notes:'' },
    { id:'m11', name:'Tazze Bianche Magic',    cat:'Gadget',        qty:12,  minQty:6,  maxQty:60,  unit:'pz',     cost:2.50, supplier:'GadgetPro',   location:'F2',  notes:'' },
    { id:'m12', name:'T-shirt Bianca S',       cat:'Abbigliamento', qty:15,  minQty:5,  maxQty:60,  unit:'pz',     cost:3.20, supplier:'TextilIT',    location:'G1',  notes:'' },
    { id:'m13', name:'T-shirt Bianca M',       cat:'Abbigliamento', qty:20,  minQty:10, maxQty:80,  unit:'pz',     cost:3.20, supplier:'TextilIT',    location:'G1',  notes:'' },
    { id:'m14', name:'T-shirt Bianca L',       cat:'Abbigliamento', qty:18,  minQty:10, maxQty:80,  unit:'pz',     cost:3.20, supplier:'TextilIT',    location:'G1',  notes:'' },
    { id:'m15', name:'Lente CO2 20mm',         cat:'Ricambi',       qty:2,   minQty:1,  maxQty:5,   unit:'pz',     cost:35,   supplier:'LaserParts',  location:'H1',  notes:'Ricambio critico' },
    { id:'m16', name:'Specchio Laser 25mm',    cat:'Ricambi',       qty:3,   minQty:1,  maxQty:6,   unit:'pz',     cost:22,   supplier:'LaserParts',  location:'H1',  notes:'' },
    { id:'m17', name:'Vinile Bianco 50cm',     cat:'Vinile',        qty:3,   minQty:1,  maxQty:10,  unit:'rotolo', cost:18,   supplier:'PlotterMat',  location:'I1',  notes:'' },
    { id:'m18', name:'Schiuma Imballaggio',    cat:'Imballo',       qty:10,  minQty:3,  maxQty:40,  unit:'fg',     cost:0.50, supplier:'PackIT',      location:'L1',  notes:'' },
    { id:'m19', name:'Cuscino Bianco 40x40',   cat:'Gadget',        qty:8,   minQty:4,  maxQty:40,  unit:'pz',     cost:4.50, supplier:'GadgetPro',   location:'F3',  notes:'' },
    { id:'m20', name:'Toner Laser Nero',       cat:'Ricambi',       qty:1,   minQty:1,  maxQty:4,   unit:'pz',     cost:45,   supplier:'LaserParts',  location:'H2',  notes:'Ricambio critico' },
  ];

  function getMagItems(){
    var saved=_get(MAG_KEY);
    if(Array.isArray(saved)&&saved.length) return saved;
    _set(MAG_KEY,DEFAULT_MAG_ITEMS);
    return DEFAULT_MAG_ITEMS.slice();
  }
  function saveMagItems(items){ _set(MAG_KEY,items); }

  function getMov(){ var v=_get(MOVS_KEY); return Array.isArray(v)?v:[]; }
  function addMov(itemId,itemName,type,qty,note,user){
    var movs=getMov();
    movs.unshift({ id:uid(), itemId:itemId, itemName:itemName, type:type, qty:qty, note:note||'', user:user||'—', date:new Date().toISOString() });
    if(movs.length>500) movs=movs.slice(0,500);
    _set(MOVS_KEY,movs);
  }

  var ALL_CATS = ['Tutti','Legno','Acrilico','DTF','Sub','Gadget','Abbigliamento','Pelle','Ricambi','Vinile','Imballo'];

  function buildMagazzino(){
    var section=document.getElementById('view-inventory');
    if(!section||section._magBuilt)return;
    function _try(n){ n=n||0; if(n>30)return; if(!section.children.length){setTimeout(function(){_try(n+1);},400);return;} if(section._magBuilt)return; section._magBuilt=true; _doMagazzino(section); }
    _try();
  }

  function _doMagazzino(section){
    if(document.getElementById('prox-mag-wrap'))return;

    /* State */
    var state={ view:'table', tab:'Tutti', search:'', sort:'name', sortDir:'asc', tab2:'stock' };

    var wrap=document.createElement('div');
    wrap.id='prox-mag-wrap';
    section.insertBefore(wrap, section.firstChild);

    /* ── render ── */
    function render(){
      var items=getMagItems();
      var movs=getMov();

      /* filter */
      var q=state.search.toLowerCase();
      var filtered=items.filter(function(it){
        if(state.tab!=='Tutti'&&it.cat!==state.tab)return false;
        if(q&&!(it.name||'').toLowerCase().includes(q)&&!(it.cat||'').toLowerCase().includes(q)&&!(it.supplier||'').toLowerCase().includes(q)&&!(it.location||'').toLowerCase().includes(q))return false;
        return true;
      });

      /* sort */
      var sd=state.sortDir==='asc'?1:-1;
      filtered.sort(function(a,b){
        switch(state.sort){
          case 'name':     return sd*a.name.localeCompare(b.name);
          case 'cat':      return sd*a.cat.localeCompare(b.cat);
          case 'qty':      return sd*(a.qty-b.qty);
          case 'minQty':   return sd*(a.minQty-b.minQty);
          case 'cost':     return sd*(a.cost-b.cost);
          case 'value':    return sd*((a.qty*a.cost)-(b.qty*b.cost));
          case 'supplier': return sd*(a.supplier||'').localeCompare(b.supplier||'');
          case 'status':   return sd*(statusRank(a)-statusRank(b));
          default:         return 0;
        }
      });

      /* KPIs */
      var low=items.filter(function(it){return it.qty>0&&it.qty<=it.minQty;}).length;
      var out=items.filter(function(it){return it.qty===0;}).length;
      var totalVal=items.reduce(function(s,it){return s+(it.qty*it.cost)||0;},0);
      var crit=items.filter(function(it){return (it.notes||'').includes('critico')||it.qty===0;}).length;

      /* category analytics */
      var catMap={};
      items.forEach(function(it){
        if(!catMap[it.cat])catMap[it.cat]=0;
        catMap[it.cat]+=(it.qty*it.cost)||0;
      });
      var catArr=Object.keys(catMap).map(function(c){return{cat:c,val:catMap[c]};}).sort(function(a,b){return b.val-a.val;});
      var maxCatVal=catArr.length?catArr[0].val:1;

      /* reorder list */
      var reorder=items.filter(function(it){return it.qty<=it.minQty;});

      /* HTML */
      wrap.innerHTML=
        /* header */
        '<div class="v3-section-header" style="padding-top:16px">'+
        '<div class="v3-section-title">📦 Magazzino ERP — Gestione Scorte</div>'+
        '<button class="v3-btn v3-btn-primary" id="mag-btn-new">＋ Nuovo Articolo</button>'+
        '<button class="v3-btn v3-btn-ghost" id="mag-btn-mov">📋 Movimenti</button>'+
        '<button class="v3-btn v3-btn-ghost" id="mag-btn-export">⬇ CSV</button>'+
        '</div>'+
        /* KPIs */
        '<div class="v3-kpis">'+
        mkKPI(items.length,'Articoli totali','#e5e5e5')+
        mkKPI(low,'Scorte basse','#f59e0b')+
        mkKPI(out,'Esauriti','#ef4444')+
        mkKPI(fmt(totalVal,0),'Valore a magazzino','#fbbf24')+
        mkKPI(crit,'Critici','#ef4444')+
        '</div>'+
        /* alerts */
        (out>0?'<div class="v3-alert v3-alert-err">🚨 <strong>'+out+' articoli ESAURITI</strong> — riordino urgente necessario</div>':'')+
        (low>0?'<div class="v3-alert v3-alert-warn">⚠️ <strong>'+low+' articoli</strong> sotto scorta minima — verifica riordini</div>':'')+
        (out===0&&low===0?'<div class="v3-alert v3-alert-ok">✅ Tutte le scorte nei livelli ottimali</div>':'')+
        /* tabs */
        '<div class="mag-tab-bar" id="mag-tabs">'+
        ALL_CATS.map(function(c){
          var count=c==='Tutti'?items.length:items.filter(function(it){return it.cat===c;}).length;
          return '<button class="mag-tab'+(state.tab===c?' active':'')+'" data-cat="'+c+'">'+c+(count?' ('+count+')':'')+'</button>';
        }).join('')+
        '</div>'+
        /* toolbar */
        '<div class="mag-toolbar">'+
        '<div class="mag-search-wrap"><input class="mag-search" id="mag-search-in" placeholder="Cerca per nome, categoria, fornitore, posizione..." value="'+esc(state.search)+'"></div>'+
        '<div style="display:flex;gap:4px">'+
        '<button class="mag-view-btn'+(state.view==='table'?' active':'')+'" id="mag-view-table" title="Vista tabella">☰</button>'+
        '<button class="mag-view-btn'+(state.view==='grid'?' active':'')+'" id="mag-view-grid" title="Vista griglia">⊞</button>'+
        '</div>'+
        '</div>'+
        /* inner tab bar: stock / reorder / analytics */
        '<div style="display:flex;gap:6px;margin-bottom:14px">'+
        ['stock','reorder','analytics'].map(function(t){
          var labels={stock:'📋 Inventario ('+filtered.length+')',reorder:'🔄 Riordini ('+reorder.length+')',analytics:'📊 Analytics'};
          return '<button class="mag-tab'+(state.tab2===t?' active':'')+'" data-tab2="'+t+'">'+labels[t]+'</button>';
        }).join('')+
        '</div>'+
        /* panels */
        /* ── STOCK panel ── */
        '<div id="mag-panel-stock" style="'+(state.tab2!=='stock'?'display:none':'')+'">'+(filtered.length===0?'<div style="text-align:center;color:#3f3f46;padding:40px;font-size:.85rem">Nessun articolo trovato</div>':state.view==='table'?renderTable(filtered):renderGrid(filtered))+'</div>'+
        /* ── REORDER panel ── */
        '<div id="mag-panel-reorder" style="'+(state.tab2!=='reorder'?'display:none':'')+'">'+(reorder.length===0?'<div class="v3-alert v3-alert-ok">✅ Nessun riordino necessario</div>':reorder.map(function(it){ var isOut=it.qty===0; return '<div class="reorder-item">'+
          '<div class="reorder-icon">'+(isOut?'🚨':'⚠️')+'</div>'+
          '<div class="reorder-info">'+
          '<div class="reorder-name">'+esc(it.name)+'</div>'+
          '<div class="reorder-meta">'+it.cat+' · Fornitore: '+esc(it.supplier||'—')+' · Pos: '+esc(it.location||'—')+' · Qty attuale: <strong style="color:'+(isOut?'#ef4444':'#f59e0b')+'">'+it.qty+' '+it.unit+'</strong> (min: '+it.minQty+')</div>'+
          '</div>'+
          '<div style="text-align:right">'+
          '<div class="v3-badge'+(isOut?' v3-badge-red':' v3-badge-yellow')+'" style="margin-bottom:6px">'+(isOut?'ESAURITO':'BASSO')+'</div>'+
          '<div style="font-size:.72rem;color:#71717a">Suggerito: '+(it.maxQty||it.minQty*4)+' '+it.unit+'</div>'+
          '</div>'+
          '</div>'; }).join(''))+'</div>'+
        /* ── ANALYTICS panel ── */
        '<div id="mag-panel-analytics" style="'+(state.tab2!=='analytics'?'display:none':'')+'">'+(
          '<div style="margin-bottom:16px"><div style="font-size:.78rem;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:.04em;margin-bottom:12px">Valore per categoria</div>'+
          catArr.map(function(c){ return '<div class="cat-bar"><div class="cat-bar-label">'+c.cat+'</div><div class="cat-bar-track"><div class="cat-bar-fill" style="width:'+Math.round(c.val/maxCatVal*100)+'%"></div></div><div class="cat-bar-val">'+fmt(c.val,0)+'</div></div>'; }).join('')+
          '</div>'+
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">'+
          [
            {v:items.length,l:'Articoli',c:'#e5e5e5'},
            {v:fmt(totalVal,0),l:'Valore totale',c:'#fbbf24'},
            {v:fmt(totalVal/items.length,0),l:'Valore medio',c:'#60a5fa'},
            {v:items.filter(function(x){return x.qty>0;}).length,l:'Disponibili',c:'#22c55e'},
          ].map(function(k){ return '<div class="v3-kpi"><div class="v3-kpi-val" style="color:'+k.c+'">'+k.v+'</div><div class="v3-kpi-lbl">'+k.l+'</div></div>'; }).join('')+
          '</div>'
        )+'</div>';

      bindMagEvents(items,movs);
    }

    function statusRank(it){ if(it.qty===0)return 0; if(it.qty<=it.minQty)return 1; return 2; }
    function mkKPI(v,l,c){ return '<div class="v3-kpi"><div class="v3-kpi-val" style="color:'+c+'">'+v+'</div><div class="v3-kpi-lbl">'+l+'</div></div>'; }

    /* ── TABLE ── */
    function renderTable(items){
      function th(key,label){ var active=state.sort===key; return '<th data-sort="'+key+'"'+(active?' class="sorted-'+state.sortDir+'"':'')+'>'+label+'</th>'; }
      return '<div class="mag-table-wrap"><table class="mag-table"><thead><tr>'+
        th('name','Articolo')+th('cat','Categoria')+th('qty','Qty')+th('minQty','Min')+
        th('cost','Costo')+th('value','Valore')+th('supplier','Fornitore')+
        '<th>Posizione</th>'+th('status','Stato')+'<th>Azioni</th>'+
        '</tr></thead><tbody>'+
        items.map(function(it){
          var isOut=it.qty===0, isLow=it.qty>0&&it.qty<=it.minQty;
          var pct=it.maxQty?Math.min(100,Math.round(it.qty/it.maxQty*100)):50;
          var barColor=isOut?'#ef4444':isLow?'#f59e0b':'#22c55e';
          var rowClass=isOut?' class="row-out"':isLow?' class="row-low"':'';
          return '<tr'+rowClass+' data-id="'+it.id+'">'+
            '<td><div style="font-weight:700;font-size:.83rem">'+esc(it.name)+'</div>'+(it.notes?'<div style="font-size:.65rem;color:#52525b">'+esc(it.notes)+'</div>':'')+
            '<div style="display:flex;height:3px;background:rgba(255,255,255,.07);border-radius:2px;margin-top:5px;width:80px"><div style="width:'+pct+'%;background:'+barColor+';border-radius:2px"></div></div>'+
            '</td>'+
            '<td><span class="v3-badge v3-badge-gray" style="font-size:.65rem">'+it.cat+'</span></td>'+
            '<td>'+
            '<div class="mag-qty-ctrl">'+
            '<button class="mag-qty-btn" data-minus="'+it.id+'" title="Sottrai">−</button>'+
            '<input class="mag-qty-in" type="number" value="'+it.qty+'" min="0" data-qin="'+it.id+'" title="Modifica quantità">'+
            '<button class="mag-qty-btn" data-plus="'+it.id+'" title="Aggiungi">+</button>'+
            '</div>'+
            '<div style="font-size:.65rem;color:#52525b;margin-top:3px">'+it.unit+'</div>'+
            '</td>'+
            '<td style="color:#71717a;font-size:.82rem">'+it.minQty+'</td>'+
            '<td style="color:#fbbf24;font-weight:700">'+fmt(it.cost)+'</td>'+
            '<td style="font-weight:700">'+fmt(it.qty*it.cost,0)+'</td>'+
            '<td style="font-size:.78rem;color:#94a3b8">'+esc(it.supplier||'—')+'</td>'+
            '<td><span style="font-size:.72rem;background:rgba(96,165,250,.1);color:#60a5fa;padding:2px 7px;border-radius:6px">'+esc(it.location||'—')+'</span></td>'+
            '<td>'+(isOut?'<span class="v3-badge v3-badge-red">ESAURITO</span>':isLow?'<span class="v3-badge v3-badge-yellow">BASSO</span>':'<span class="v3-badge v3-badge-green">OK</span>')+'</td>'+
            '<td><div style="display:flex;gap:4px">'+
            '<button class="v3-btn v3-btn-ghost v3-btn-xs" data-edit="'+it.id+'" title="Modifica">✏️</button>'+
            '<button class="v3-btn v3-btn-ghost v3-btn-xs" data-hist="'+it.id+'" title="Storico movimenti">📋</button>'+
            '<button class="v3-btn v3-btn-danger v3-btn-xs" data-del="'+it.id+'" title="Elimina">✕</button>'+
            '</div></td>'+
            '</tr>';
        }).join('')+
        '</tbody></table></div>';
    }

    /* ── GRID ── */
    function renderGrid(items){
      return '<div class="mag-grid">'+items.map(function(it){
        var isOut=it.qty===0, isLow=it.qty>0&&it.qty<=it.minQty;
        var pct=it.maxQty?Math.min(100,Math.round(it.qty/it.maxQty*100)):50;
        var barColor=isOut?'#ef4444':isLow?'#f59e0b':'#22c55e';
        var qtyColor=isOut?'#ef4444':isLow?'#f59e0b':'#e5e5e5';
        return '<div class="mag-card'+(isOut?' card-out':isLow?' card-low':'')+'" data-id="'+it.id+'">'+
          (isOut?'<span class="mag-alert-chip v3-badge v3-badge-red">ESAURITO</span>':isLow?'<span class="mag-alert-chip v3-badge v3-badge-yellow">BASSO</span>':'')+
          '<div class="mag-card-cat">'+it.cat+' · '+esc(it.location||'—')+'</div>'+
          '<div class="mag-card-name">'+esc(it.name)+'</div>'+
          '<div style="display:flex;align-items:baseline;gap:5px">'+
          '<span class="mag-card-qty" style="color:'+qtyColor+'">'+it.qty+'</span>'+
          '<span class="mag-card-unit">'+it.unit+' (min '+it.minQty+')</span>'+
          '</div>'+
          '<div class="mag-card-meta">'+fmt(it.cost)+'/'+it.unit+' · Valore: '+fmt(it.qty*it.cost,0)+'</div>'+
          '<div style="font-size:.68rem;color:#52525b;margin-top:3px">'+esc(it.supplier||'—')+'</div>'+
          '<div class="mag-card-bar"><div class="mag-card-bar-fill" style="width:'+pct+'%;background:'+barColor+'"></div></div>'+
          '<div class="mag-card-actions">'+
          '<button class="v3-btn v3-btn-ghost v3-btn-xs" data-minus="'+it.id+'">−</button>'+
          '<button class="v3-btn v3-btn-primary v3-btn-xs" data-plus="'+it.id+'">＋</button>'+
          '<button class="v3-btn v3-btn-ghost v3-btn-xs" data-edit="'+it.id+'">✏️</button>'+
          '<button class="v3-btn v3-btn-danger v3-btn-xs" data-del="'+it.id+'">✕</button>'+
          '</div>'+
          '</div>';
      }).join('')+'</div>';
    }

    /* ── BINDINGS ── */
    function bindMagEvents(items){
      /* category tabs */
      var tabBar=document.getElementById('mag-tabs');
      if(tabBar) tabBar.addEventListener('click',function(e){ var b=e.target.closest('.mag-tab'); if(!b)return; state.tab=b.dataset.cat; render(); });

      /* inner tabs */
      wrap.querySelectorAll('[data-tab2]').forEach(function(b){ b.addEventListener('click',function(){ state.tab2=b.dataset.tab2; render(); }); });

      /* search */
      var si=document.getElementById('mag-search-in');
      if(si){ si.addEventListener('input',function(){ state.search=this.value; render(); }); si.focus(); }

      /* view toggle */
      var vt=document.getElementById('mag-view-table'), vg=document.getElementById('mag-view-grid');
      if(vt) vt.addEventListener('click',function(){ state.view='table'; render(); });
      if(vg) vg.addEventListener('click',function(){ state.view='grid'; render(); });

      /* table sort */
      wrap.querySelectorAll('th[data-sort]').forEach(function(th){
        th.addEventListener('click',function(){
          if(state.sort===th.dataset.sort) state.sortDir=state.sortDir==='asc'?'desc':'asc';
          else{ state.sort=th.dataset.sort; state.sortDir='asc'; }
          render();
        });
      });

      /* inline qty input */
      wrap.querySelectorAll('[data-qin]').forEach(function(inp){
        inp.addEventListener('change',function(){
          var items2=getMagItems();
          var idx=items2.findIndex(function(x){return x.id===inp.dataset.qin;});
          if(idx<0)return;
          var newQty=Math.max(0,parseInt(this.value)||0);
          var delta=newQty-items2[idx].qty;
          if(delta===0)return;
          addMov(items2[idx].id,items2[idx].name,delta>0?'carico':'scarico',Math.abs(delta),'Modifica diretta','operatore');
          items2[idx].qty=newQty;
          saveMagItems(items2);
          render();
        });
      });

      /* +/- buttons */
      wrap.addEventListener('click',function(e){
        var plusBtn=e.target.closest('[data-plus]');
        var minusBtn=e.target.closest('[data-minus]');
        var editBtn=e.target.closest('[data-edit]');
        var delBtn=e.target.closest('[data-del]');
        var histBtn=e.target.closest('[data-hist]');

        if(plusBtn){ openQtyModal(plusBtn.dataset.plus,'carico'); return; }
        if(minusBtn){ openQtyModal(minusBtn.dataset.minus,'scarico'); return; }
        if(editBtn){ openEditModal(editBtn.dataset.edit); return; }
        if(histBtn){ openHistModal(histBtn.dataset.hist); return; }
        if(delBtn){ openDelConfirm(delBtn.dataset.del); return; }
      });

      /* new item */
      var btnNew=document.getElementById('mag-btn-new');
      if(btnNew) btnNew.addEventListener('click',function(){ openEditModal(null); });

      /* movimenti */
      var btnMov=document.getElementById('mag-btn-mov');
      if(btnMov) btnMov.addEventListener('click',function(){ openAllMovModal(); });

      /* export CSV */
      var btnExport=document.getElementById('mag-btn-export');
      if(btnExport) btnExport.addEventListener('click',function(){
        var items2=getMagItems();
        var csv='Nome,Categoria,Fornitore,Posizione,Qty,Min,Max,Unità,Costo,Valore,Note\n'+
          items2.map(function(it){ return [it.name,it.cat,it.supplier||'',it.location||'',it.qty,it.minQty,it.maxQty||'',it.unit,it.cost.toFixed(2),(it.qty*it.cost).toFixed(2),it.notes||''].map(function(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }).join(','); }).join('\n');
        var blob=new Blob([csv],{type:'text/csv'});
        var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='magazzino-'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
      });
    }

    /* ── MODALS ── */
    function closeModal(){ var ov=document.getElementById('mag-overlay-root'); if(ov) ov.remove(); }

    function openQtyModal(itemId, defaultType){
      var items=getMagItems();
      var it=items.find(function(x){return x.id===itemId;});
      if(!it)return;
      var ov=document.createElement('div'); ov.className='mag-overlay'; ov.id='mag-overlay-root';
      ov.innerHTML=
        '<div class="mag-modal">'+
        '<div class="mag-modal-header">'+
        '<div class="mag-modal-title">'+(defaultType==='carico'?'📥 Carico Magazzino':'📤 Scarico Magazzino')+'</div>'+
        '<button class="mag-modal-close" id="qm-close">✕</button>'+
        '</div>'+
        '<div class="mag-modal-body">'+
        '<div style="background:rgba(255,255,255,.03);border-radius:10px;padding:14px;margin-bottom:16px">'+
        '<div style="font-size:.78rem;color:#71717a;margin-bottom:4px">Articolo</div>'+
        '<div style="font-size:1rem;font-weight:700;color:#e5e5e5">'+esc(it.name)+'</div>'+
        '<div style="font-size:.78rem;color:#94a3b8;margin-top:4px">'+it.cat+' · Scorta attuale: <strong style="color:#fbbf24">'+it.qty+' '+it.unit+'</strong></div>'+
        '</div>'+
        '<div class="mag-form-grid">'+
        '<div><label class="v3-label">Tipo operazione</label>'+
        '<select class="v3-select" id="qm-type" style="width:100%">'+
        '<option value="carico"'+(defaultType==='carico'?' selected':'')+'>📥 Carico (arrivo merce)</option>'+
        '<option value="scarico"'+(defaultType==='scarico'?' selected':'')+'>📤 Scarico (utilizzo)</option>'+
        '<option value="rettifica">🔧 Rettifica (inventario)</option>'+
        '</select></div>'+
        '<div><label class="v3-label">Quantità</label>'+
        '<input type="number" class="v3-input" id="qm-qty" value="1" min="1" style="font-size:1.1rem;font-weight:700">'+
        '</div>'+
        '</div>'+
        '<div><label class="v3-label">Note (opzionale)</label>'+
        '<input class="v3-input" id="qm-note" placeholder="es. Ordine fornitore #123, rientro da cliente...">'+
        '</div>'+
        '</div>'+
        '<div class="mag-modal-footer">'+
        '<button class="v3-btn v3-btn-ghost" id="qm-cancel">Annulla</button>'+
        '<button class="v3-btn v3-btn-primary" id="qm-save">💾 Conferma</button>'+
        '</div>'+
        '</div>';
      document.body.appendChild(ov);
      document.getElementById('qm-qty').focus(); document.getElementById('qm-qty').select();
      document.getElementById('qm-close').onclick=document.getElementById('qm-cancel').onclick=closeModal;
      ov.addEventListener('click',function(e){if(e.target===ov)closeModal();});
      document.getElementById('qm-save').onclick=function(){
        var type=document.getElementById('qm-type').value;
        var qty=parseInt(document.getElementById('qm-qty').value)||0;
        var note=document.getElementById('qm-note').value.trim();
        if(!qty)return;
        var items2=getMagItems();
        var idx=items2.findIndex(function(x){return x.id===itemId;});
        if(idx<0)return;
        if(type==='carico'){ items2[idx].qty+=qty; }
        else if(type==='scarico'){ items2[idx].qty=Math.max(0,items2[idx].qty-qty); }
        else if(type==='rettifica'){ items2[idx].qty=qty; }
        addMov(items2[idx].id,items2[idx].name,type,qty,note,'operatore');
        saveMagItems(items2);
        closeModal(); render();
      };
    }

    function openEditModal(itemId){
      var items=getMagItems();
      var it=itemId?items.find(function(x){return x.id===itemId;}):null;
      var isNew=!it;
      if(!it) it={ id:uid(), name:'', cat:'Legno', qty:0, minQty:5, maxQty:100, unit:'pz', cost:0, supplier:'', location:'', notes:'' };

      var ov=document.createElement('div'); ov.className='mag-overlay'; ov.id='mag-overlay-root';
      var catOpts=ALL_CATS.slice(1).map(function(c){ return '<option value="'+c+'"'+(it.cat===c?' selected':'')+'>'+c+'</option>'; }).join('');
      ov.innerHTML=
        '<div class="mag-modal" style="max-width:600px">'+
        '<div class="mag-modal-header">'+
        '<div class="mag-modal-title">'+(isNew?'➕ Nuovo Articolo':'✏️ Modifica Articolo')+'</div>'+
        '<button class="mag-modal-close" id="em-close">✕</button>'+
        '</div>'+
        '<div class="mag-modal-body">'+
        '<div class="mag-form-grid">'+
        '<div style="grid-column:1/-1"><label class="v3-label">Nome articolo *</label><input class="v3-input" id="em-name" value="'+esc(it.name)+'" placeholder="es. MDF 3mm 30×20 cm" required></div>'+
        '<div><label class="v3-label">Categoria</label><select class="v3-select" id="em-cat" style="width:100%">'+catOpts+'</select></div>'+
        '<div><label class="v3-label">Unità misura</label><select class="v3-select" id="em-unit" style="width:100%"><option'+(it.unit==='pz'?' selected':'')+'>pz</option><option'+(it.unit==='fg'?' selected':'')+'>fg</option><option'+(it.unit==='rotolo'?' selected':'')+'>rotolo</option><option'+(it.unit==='h'?' selected':'')+'>h</option><option'+(it.unit==='m'?' selected':'')+'>m</option><option'+(it.unit==='kg'?' selected':'')+'>kg</option><option'+(it.unit==='l'?' selected':'')+'>l</option></select></div>'+
        '<div><label class="v3-label">Quantità attuale</label><input type="number" class="v3-input" id="em-qty" value="'+it.qty+'" min="0"></div>'+
        '<div><label class="v3-label">Scorta minima (alert)</label><input type="number" class="v3-input" id="em-minqty" value="'+it.minQty+'" min="0"></div>'+
        '<div><label class="v3-label">Scorta massima</label><input type="number" class="v3-input" id="em-maxqty" value="'+(it.maxQty||'')+'" min="0"></div>'+
        '<div><label class="v3-label">Costo unitario (€)</label><input type="number" class="v3-input" id="em-cost" value="'+it.cost+'" min="0" step="0.01"></div>'+
        '<div><label class="v3-label">Fornitore</label><input class="v3-input" id="em-supplier" value="'+esc(it.supplier||'')+'" placeholder="es. Modulor"></div>'+
        '<div><label class="v3-label">Posizione magazzino</label><input class="v3-input" id="em-loc" value="'+esc(it.location||'')+'" placeholder="es. A1, Scaffale 2..."></div>'+
        '<div style="grid-column:1/-1"><label class="v3-label">Note</label><input class="v3-input" id="em-notes" value="'+esc(it.notes||'')+'" placeholder="es. Ricambio critico, gestione speciale..."></div>'+
        '</div>'+
        '</div>'+
        '<div class="mag-modal-footer">'+
        (!isNew?'<button class="v3-btn v3-btn-danger" id="em-del" style="margin-right:auto">🗑️ Elimina</button>':'')+
        '<button class="v3-btn v3-btn-ghost" id="em-cancel">Annulla</button>'+
        '<button class="v3-btn v3-btn-primary" id="em-save">💾 '+(isNew?'Aggiungi':'Salva')+'</button>'+
        '</div>'+
        '</div>';
      document.body.appendChild(ov);
      document.getElementById('em-name').focus();
      document.getElementById('em-close').onclick=document.getElementById('em-cancel').onclick=closeModal;
      ov.addEventListener('click',function(e){if(e.target===ov)closeModal();});
      if(!isNew){
        document.getElementById('em-del').onclick=function(){
          var items2=getMagItems();
          var idx=items2.findIndex(function(x){return x.id===itemId;});
          if(idx>=0){items2.splice(idx,1);saveMagItems(items2);}
          closeModal(); render();
        };
      }
      document.getElementById('em-save').onclick=function(){
        var name=document.getElementById('em-name').value.trim();
        if(!name){ document.getElementById('em-name').style.borderColor='#ef4444'; return; }
        var newIt={
          id:it.id, name:name,
          cat:document.getElementById('em-cat').value,
          unit:document.getElementById('em-unit').value,
          qty:Math.max(0,parseInt(document.getElementById('em-qty').value)||0),
          minQty:Math.max(0,parseInt(document.getElementById('em-minqty').value)||0),
          maxQty:Math.max(0,parseInt(document.getElementById('em-maxqty').value)||0)||100,
          cost:parseFloat(document.getElementById('em-cost').value)||0,
          supplier:document.getElementById('em-supplier').value.trim(),
          location:document.getElementById('em-loc').value.trim(),
          notes:document.getElementById('em-notes').value.trim(),
        };
        var items2=getMagItems();
        if(isNew){ items2.push(newIt); addMov(newIt.id,newIt.name,'carico',newIt.qty,'Primo carico — articolo creato','operatore'); }
        else{ var idx=items2.findIndex(function(x){return x.id===itemId;}); if(idx>=0) items2[idx]=newIt; }
        saveMagItems(items2);
        closeModal(); render();
      };
    }

    function openDelConfirm(itemId){
      var items=getMagItems();
      var it=items.find(function(x){return x.id===itemId;});
      if(!it)return;
      var ov=document.createElement('div'); ov.className='mag-overlay'; ov.id='mag-overlay-root';
      ov.innerHTML=
        '<div class="mag-modal" style="max-width:400px">'+
        '<div class="mag-modal-header"><div class="mag-modal-title">🗑️ Conferma eliminazione</div><button class="mag-modal-close" id="dc-close">✕</button></div>'+
        '<div class="mag-modal-body">'+
        '<p style="color:#e5e5e5;font-size:.9rem">Eliminare <strong>'+esc(it.name)+'</strong> dal magazzino?</p>'+
        '<p style="font-size:.8rem;color:#94a3b8">Questa azione non è reversibile. Lo storico movimenti verrà conservato.</p>'+
        '</div>'+
        '<div class="mag-modal-footer">'+
        '<button class="v3-btn v3-btn-ghost" id="dc-cancel">Annulla</button>'+
        '<button class="v3-btn v3-btn-danger" id="dc-confirm">🗑️ Elimina definitivamente</button>'+
        '</div></div>';
      document.body.appendChild(ov);
      document.getElementById('dc-close').onclick=document.getElementById('dc-cancel').onclick=closeModal;
      ov.addEventListener('click',function(e){if(e.target===ov)closeModal();});
      document.getElementById('dc-confirm').onclick=function(){
        var items2=getMagItems(); var idx=items2.findIndex(function(x){return x.id===itemId;});
        if(idx>=0){items2.splice(idx,1);saveMagItems(items2);}
        closeModal(); render();
      };
    }

    function openHistModal(itemId){
      var items=getMagItems();
      var it=items.find(function(x){return x.id===itemId;});
      var movs=getMov().filter(function(m){return m.itemId===itemId;});
      var ov=document.createElement('div'); ov.className='mag-overlay'; ov.id='mag-overlay-root';
      var typeLabels={ carico:'📥 Carico', scarico:'📤 Scarico', rettifica:'🔧 Rettifica' };
      ov.innerHTML=
        '<div class="mag-modal" style="max-width:600px">'+
        '<div class="mag-modal-header"><div class="mag-modal-title">📋 Movimenti — '+(it?esc(it.name):'Articolo')+'</div><button class="mag-modal-close" id="hm-close">✕</button></div>'+
        '<div class="mag-modal-body">'+
        (movs.length===0?'<div style="text-align:center;color:#52525b;padding:30px;font-size:.85rem">Nessun movimento registrato per questo articolo</div>':
        '<div style="overflow-x:auto"><table class="mov-table"><thead><tr><th>Data</th><th>Tipo</th><th>Qty</th><th>Note</th></tr></thead><tbody>'+
        movs.slice(0,50).map(function(m){
          var isCarico=m.type==='carico';
          return '<tr>'+
            '<td>'+dateIT(m.date)+'</td>'+
            '<td>'+(typeLabels[m.type]||m.type)+'</td>'+
            '<td class="'+(isCarico?'mov-plus':'mov-minus')+'">'+(isCarico?'+':'-')+m.qty+'</td>'+
            '<td style="color:#a1a1aa">'+(esc(m.note)||'—')+'</td>'+
            '</tr>';
        }).join('')+
        '</tbody></table></div>')+
        '</div>'+
        '<div class="mag-modal-footer"><button class="v3-btn v3-btn-ghost" id="hm-close2">Chiudi</button></div>'+
        '</div>';
      document.body.appendChild(ov);
      document.getElementById('hm-close').onclick=document.getElementById('hm-close2').onclick=closeModal;
      ov.addEventListener('click',function(e){if(e.target===ov)closeModal();});
    }

    function openAllMovModal(){
      var movs=getMov();
      var ov=document.createElement('div'); ov.className='mag-overlay'; ov.id='mag-overlay-root';
      var typeLabels={ carico:'📥 Carico', scarico:'📤 Scarico', rettifica:'🔧 Rettifica' };
      ov.innerHTML=
        '<div class="mag-modal" style="max-width:700px">'+
        '<div class="mag-modal-header"><div class="mag-modal-title">📋 Tutti i Movimenti Magazzino</div><button class="mag-modal-close" id="am-close">✕</button></div>'+
        '<div class="mag-modal-body">'+
        (movs.length===0?'<div style="text-align:center;color:#52525b;padding:30px;font-size:.85rem">Nessun movimento registrato</div>':
        '<div style="overflow-x:auto"><table class="mov-table"><thead><tr><th>Data</th><th>Articolo</th><th>Tipo</th><th>Qty</th><th>Note</th></tr></thead><tbody>'+
        movs.slice(0,100).map(function(m){
          var isCarico=m.type==='carico';
          return '<tr>'+
            '<td style="white-space:nowrap">'+dateIT(m.date)+'</td>'+
            '<td style="font-weight:600;color:#e5e5e5">'+esc(m.itemName||'—')+'</td>'+
            '<td>'+(typeLabels[m.type]||m.type)+'</td>'+
            '<td class="'+(isCarico?'mov-plus':'mov-minus')+'">'+(isCarico?'+':'-')+m.qty+'</td>'+
            '<td style="color:#a1a1aa">'+(esc(m.note)||'—')+'</td>'+
            '</tr>';
        }).join('')+
        '</tbody></table></div>'+
        (movs.length>100?'<div style="text-align:center;font-size:.72rem;color:#52525b;margin-top:8px">Mostrando gli ultimi 100 movimenti</div>':'')+
        '</div>'+
        '<div class="mag-modal-footer"><button class="v3-btn v3-btn-ghost" id="am-close2">Chiudi</button></div>')+
        '</div>';
      document.body.appendChild(ov);
      document.getElementById('am-close').onclick=document.getElementById('am-close2').onclick=closeModal;
      ov.addEventListener('click',function(e){if(e.target===ov)closeModal();});
    }

    render();

    /* live storage sync */
    window.addEventListener('storage',function(e){ if(e.key===MAG_KEY) render(); });
  }

  /* ═══════════════════════════════════════════════════════════════════
     V3 — PRODUCTION SCHEDULER
  ═══════════════════════════════════════════════════════════════════ */
  function buildProductionScheduler(){
    var wf=document.getElementById('view-workflow_dashboard');
    if(!wf||wf._schedulerBuilt)return;
    function _try(n){ n=n||0; if(n>30)return; if(!wf.children.length){setTimeout(function(){_try(n+1);},400);return;} if(wf._schedulerBuilt)return; wf._schedulerBuilt=true; _doScheduler(wf); }
    _try();
  }

  function _doScheduler(wf){
    if(document.getElementById('prox-scheduler'))return;
    var MACHINES=[
      {id:'laser',label:'⚡ Laser CO2',hoursDay:8,color:'#fbbf24'},
      {id:'dtf',label:'🖨️ DTF',hoursDay:6,color:'#a78bfa'},
      {id:'sublimazione',label:'🎨 Sublimazione',hoursDay:4,color:'#22d3ee'},
      {id:'uv',label:'🌈 UV',hoursDay:4,color:'#22c55e'},
    ];
    var EST_HOURS={laser:2,dtf:1.5,sublimazione:1,uv:2,misto:3,altro:1};
    var card=document.createElement('div'); card.id='prox-scheduler'; card.className='v3-card';
    wf.insertBefore(card,wf.firstChild);

    function render(){
      var orders=readOrders().filter(function(o){return orderStatus(o)==='produzione'||orderStatus(o)==='attesa';});
      orders.sort(function(a,b){
        var da=a.deadline?new Date(a.deadline):new Date('2099-01-01');
        var db=b.deadline?new Date(b.deadline):new Date('2099-01-01');
        return da!==db?da-db:orderAmt(b)-orderAmt(a);
      });
      var load={};
      MACHINES.forEach(function(m){load[m.id]=0;});
      orders.forEach(function(o){ var t=(o.technique||o.machine||'altro').toLowerCase().split('-')[0]; var h=EST_HOURS[t]||1; if(load[t]!==undefined)load[t]+=h; });

      card.innerHTML=
        '<div class="v3-section-header">'+
        '<div class="v3-section-title">🏭 Schedulazione Produzione</div>'+
        '<button class="v3-btn v3-btn-ghost v3-btn-sm" id="sched-refresh">↺ Aggiorna</button>'+
        '</div>'+
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:16px">'+
        MACHINES.map(function(m){
          var l=load[m.id]||0; var pct=Math.min(100,Math.round(l/m.hoursDay*100));
          var c=pct>90?'#ef4444':pct>70?'#f59e0b':'#22c55e';
          return '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:9px;padding:10px 12px">'+
            '<div style="font-size:.72rem;font-weight:700;color:#a1a1aa;margin-bottom:5px">'+m.label+'</div>'+
            '<div style="font-size:.85rem;font-weight:700;color:'+c+'">'+l+'h / '+m.hoursDay+'h</div>'+
            '<div class="machine-load-bar"><div class="machine-load-fill" style="width:'+pct+'%;background:'+c+'"></div></div>'+
            '<div style="font-size:.65rem;color:#52525b;margin-top:3px">'+pct+'% capacità</div>'+
            '</div>';
        }).join('')+
        '</div>'+
        '<div style="font-size:.72rem;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Coda ('+orders.length+' ordini)</div>'+
        '<div class="sched-queue">'+
        (orders.length===0?'<div style="text-align:center;color:#3f3f46;padding:20px;font-size:.82rem">Nessun ordine in coda</div>':
        orders.slice(0,20).map(function(o,i){
          var t=(o.technique||o.machine||'altro').toLowerCase().split('-')[0];
          var dl=o.deadline?Math.ceil((new Date(o.deadline)-Date.now())/86400000):null;
          var uc=dl!==null?(dl<=1?'urgent':dl<=3?'soon':''):'';
          var ds=dl!==null?(dl<0?'⚠️ Scaduto ':dl===0?'🔴 Oggi':dl+'gg'):' — ';
          return '<div class="sched-item">'+
            '<div class="sched-pos">'+(i+1)+'</div>'+
            '<div><div class="sched-client">'+esc(orderClient(o)||'Cliente')+'</div><div class="sched-desc">'+(o.description||o.desc||'')+'</div></div>'+
            '<span class="sched-tech sched-'+t+'">'+t.toUpperCase()+'</span>'+
            '<div class="sched-deadline '+uc+'">'+ds+'</div>'+
            '<div class="sched-amount">'+fmt(orderAmt(o),0)+'</div>'+
            '</div>';
        }).join(''))+
        '</div>';

      card.querySelector('#sched-refresh') && card.querySelector('#sched-refresh').addEventListener('click',render);
    }
    render();
    window.addEventListener('storage',function(e){if(['ingly_orders','ingly_quotes'].includes(e.key))render();});
  }

  /* Qui vivevano due pannelli, entrambi rimossi:
     - buildAttrezzature()/_doAtt(): un secondo elenco macchine, iniettato
       in cima a Impostazioni (non a Macchine), con DEFAULT_ATT che
       seminava tre macchine finte in localStorage('prox_attrezzature_v1')
       se lo store era vuoto — stesso schema del "Machine Intelligence" già
       rimosso da 105, dati inventati spacciati per parco macchine reale.
     - buildSupplierIntel(): un "Supplier Intelligence" iniettato sopra la
       vista Fornitori reale, interamente su SUPPLIERS_DB — dieci fornitori
       con nomi, rating e URL inventati, mai collegati allo store reale dei
       fornitori. Non poteva disallinearsi dai dati veri perché non li
       leggeva mai: sembrava intelligence, era un elenco statico. */

  /* ═══════════════════════════════════════════════════════════════════
     BOOT
  ═══════════════════════════════════════════════════════════════════ */
  var _tries=0;
  function boot(){
    _tries++;
    if(_tries>40)return;
    if(!document.getElementById('content-inner')||typeof App==='undefined'){ setTimeout(boot,500); return; }
    injectV3CSS();
    buildProductionScheduler();
    buildMagazzino();

    if(!window._proxV3NavHooked&&App.navigate){
      var _orig=App.navigate;
      App.navigate=function(id){
        var r=_orig.apply(this,arguments);
        setTimeout(function(){
          if(id==='workflow_dashboard') buildProductionScheduler();
          if(id==='inventory')          buildMagazzino();
        },300);
        return r;
      };
      window._proxV3NavHooked=true;
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,2500);});
  } else {
    setTimeout(boot,2500);
  }
})();

