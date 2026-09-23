
// ingly-prox-v2.js — INGLY OS · V1 Fondamenta Operative + V2 Intelligenza Commerciale
// Roadmap V1: Kanban Ordini, CRM Segmentazione, Backup Auto, Finance Pipeline
// Roadmap V2: AI Business Advisor, Finance P&L, Smart Quoter Unificato, CRM LTV/Churn
(function () {
  'use strict';
  if (window._inglyProXV2) return;
  window._inglyProXV2 = true;

  /* ═══════════════════════════════════════════════════════════════════
     SHARED UTILITIES
  ═══════════════════════════════════════════════════════════════════ */
  var STORE = {
    get: function (key) {
      try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
    },
    set: function (key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
    },
    arr: function (key) {
      var v = this.get(key);
      if (Array.isArray(v)) return v;
      if (v && Array.isArray(v.items)) return v.items;
      if (v && Array.isArray(v.clients)) return v.clients;
      return [];
    }
  };

  function fmt(n, dec) {
    dec = dec === undefined ? 2 : dec;
    return '€' + (+n || 0).toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function fmtN(n) { return (+n || 0).toLocaleString('it-IT', { maximumFractionDigits: 0 }); }
  function dateIT(d) { try { return new Date(d).toLocaleDateString('it-IT'); } catch (e) { return d || '—'; } }
  function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function toastr(msg, type, ms) {
    if (typeof toast !== 'undefined') { toast(msg, type || 'info', ms || 2500); return; }
    console.log('[v2]', msg);
  }

  // Unified client reader
  function readClients() {
    var out = [], seen = {};
    ['ingly_clients', 'ingly_crm_v1'].forEach(function (k) {
      STORE.arr(k).forEach(function (c) {
        var id = c.id || c.name || c.nome || '';
        if (!seen[id]) { seen[id] = true; out.push(c); }
      });
    });
    return out;
  }

  // Unified order reader
  function readOrders() {
    var out = [], seen = {};
    ['ingly_orders', 'ingly_quotes', 'lb2b_quotes_v1'].forEach(function (k) {
      STORE.arr(k).forEach(function (o) {
        var id = o.id || o.orderId || '';
        if (!seen[id]) { seen[id] = true; out.push(o); }
      });
    });
    return out;
  }

  function clientName(c) { return c.name || c.nome || c.ragioneSociale || c.company || 'Cliente'; }
  function orderClient(o) { return o.client || o.clientName || o.cliente || o.name || ''; }
  function orderAmt(o) { return +(o.total || o.totalPrice || o.amount || o.totale || o.subtotal || 0); }
  function orderDate(o) { return o.date || o.createdAt || o.data || o.orderDate || ''; }
  function orderStatus(o) {
    var s = (o.status || o.stage || o.stato || '').toLowerCase();
    if (s.includes('produz') || s.includes('lavoraz') || s.includes('progress')) return 'produzione';
    if (s.includes('spediz') || s.includes('consegn') || s.includes('shipped')) return 'consegnato';
    if (s.includes('pagat') || s.includes('paid') || s.includes('completat') || s.includes('done')) return 'pagato';
    if (s.includes('annull') || s.includes('cancel')) return 'annullato';
    return 'attesa';
  }

  /* ═══════════════════════════════════════════════════════════════════
     GLOBAL CSS
  ═══════════════════════════════════════════════════════════════════ */
  function injectV2CSS() {
    if (document.getElementById('prox-v2-css')) return;
    var s = document.createElement('style');
    s.id = 'prox-v2-css';
    s.textContent = `
/* ── V2 shared ── */
.v2-card {
  background:var(--bg-card,#0f0f11);
  border:1px solid rgba(255,255,255,.08);
  border-radius:14px; padding:16px 18px; margin-bottom:14px;
}
.v2-title {
  font-size:11px; font-weight:700; color:#71717a;
  text-transform:uppercase; letter-spacing:.5px;
  display:flex; align-items:center; gap:8px; margin-bottom:14px;
}
.v2-title span { flex:1; }
.v2-kpis {
  display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr));
  gap:8px; margin-bottom:14px;
}
.v2-kpi {
  background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06);
  border-radius:10px; padding:12px 14px; text-align:center;
  transition:border-color .12s;
}
.v2-kpi:hover { border-color:rgba(255,255,255,.15); }
.v2-kpi-val { font-size:22px; font-weight:800; line-height:1; margin-bottom:4px; }
.v2-kpi-lbl { font-size:9px; color:#71717a; text-transform:uppercase; letter-spacing:.4px; }
.v2-btn {
  padding:8px 16px; border-radius:8px; border:none; cursor:pointer;
  font-size:12px; font-weight:600; transition:.12s; display:inline-flex;
  align-items:center; gap:6px;
}
.v2-btn-primary { background:#fbbf24; color:#09090b; }
.v2-btn-primary:hover { background:#f59e0b; }
.v2-btn-secondary { background:rgba(255,255,255,.06); color:#a1a1aa; border:1px solid rgba(255,255,255,.1); }
.v2-btn-secondary:hover { background:rgba(255,255,255,.1); color:#e5e5e5; }
.v2-btn-sm { padding:5px 11px; font-size:11px; border-radius:6px; }
.v2-search {
  padding:8px 12px 8px 34px; background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.1); border-radius:8px;
  color:#e5e5e5; font-size:12px; outline:none; transition:.12s; width:100%; box-sizing:border-box;
}
.v2-search:focus { border-color:rgba(251,191,36,.4); }
.v2-search-wrap { position:relative; }
.v2-search-wrap::before { content:'🔍'; position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:13px; pointer-events:none; }

/* CSS del secondo Kanban Ordini e del suo modale "+ Nuovo Ordine" —
   rimossi insieme al JS, vedi il commento più sotto dove vivevano
   buildKanban()/_doKanban()/buildNewOrderModal(). */

/* ════════════════════════════════════
   CRM ENHANCEMENT
════════════════════════════════════ */
#prox-crm-bar { margin-bottom:14px; }
.crm-seg-strip { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; }
.crm-seg-badge {
  padding:5px 12px; border-radius:20px; font-size:11px; font-weight:700;
  cursor:pointer; transition:.12s; border:1px solid transparent;
}
.crm-seg-A    { background:rgba(34,197,94,.12);   color:#22c55e; border-color:rgba(34,197,94,.2); }
.crm-seg-B    { background:rgba(251,191,36,.12);  color:#fbbf24; border-color:rgba(251,191,36,.2); }
.crm-seg-C    { background:rgba(100,116,139,.12); color:#94a3b8; border-color:rgba(100,116,139,.2); }
.crm-seg-dorm { background:rgba(239,68,68,.12);   color:#ef4444; border-color:rgba(239,68,68,.2); }
.crm-seg-badge.active { box-shadow:0 0 0 2px currentColor; }

.crm-client-list { display:flex; flex-direction:column; gap:4px; }
.crm-client-item {
  display:grid; grid-template-columns:36px 1fr auto auto auto;
  align-items:center; gap:8px 12px; padding:10px 12px;
  background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.06);
  border-radius:10px; cursor:pointer; transition:.12s;
}
.crm-client-item:hover { border-color:rgba(251,191,36,.25); background:rgba(255,255,255,.04); }
.crm-init {
  width:36px; height:36px; border-radius:50%; display:flex; align-items:center;
  justify-content:center; font-size:13px; font-weight:800; flex-shrink:0;
}
.crm-name { font-size:13px; font-weight:600; color:#e5e5e5; }
.crm-meta { font-size:10px; color:#52525b; margin-top:2px; }
.crm-ltv { font-size:13px; font-weight:700; color:#fbbf24; text-align:right; }
.crm-seg { font-size:9px; font-weight:700; padding:2px 6px; border-radius:10px; text-align:center; }
.crm-dormancy { font-size:9px; color:#71717a; text-align:right; white-space:nowrap; }
.crm-dormancy.alert { color:#ef4444; font-weight:600; }

.crm-detail-panel {
  position:fixed; top:0; right:0; bottom:0; z-index:15000; width:360px; max-width:95vw;
  background:#0a0a0c; border-left:1px solid rgba(255,255,255,.1);
  box-shadow:-8px 0 40px rgba(0,0,0,.8); display:none; flex-direction:column;
  overflow-y:auto; padding-bottom:80px;
}
.crm-detail-panel.open { display:flex; }
.cdp-header { padding:20px; border-bottom:1px solid rgba(255,255,255,.06); }
.cdp-header h3 { margin:0 0 4px; font-size:18px; color:#e5e5e5; }

/* CSS del pannello Backup Manager iniettato in cima alla vista Backup
   reale — rimosso insieme al JS, vedi il commento più sotto dove
   vivevano performBackup()/buildBackupEnhancement()/_doBackup(). */

/* ════════════════════════════════════
   FINANCE SUITE (P&L)
════════════════════════════════════ */
#prox-finance-pl { margin-bottom:14px; }
.pl-month-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:6px; margin-bottom:12px; }
.pl-month-card {
  padding:10px 12px; border-radius:9px; border:1px solid rgba(255,255,255,.07);
  background:rgba(255,255,255,.025); cursor:pointer; transition:.12s;
}
.pl-month-card:hover { border-color:rgba(251,191,36,.3); }
.pl-month-card.active { border-color:rgba(251,191,36,.5); background:rgba(251,191,36,.06); }
.pl-month-name { font-size:10px; color:#71717a; font-weight:600; text-transform:uppercase; margin-bottom:4px; }
.pl-month-rev { font-size:14px; font-weight:800; color:#22c55e; }
.pl-month-exp { font-size:10px; color:#ef4444; margin-top:2px; }
.pl-table { width:100%; border-collapse:collapse; font-size:12px; }
.pl-table th { padding:6px 10px; font-size:9px; color:#52525b; text-transform:uppercase; letter-spacing:.4px; border-bottom:1px solid rgba(255,255,255,.06); }
.pl-table td { padding:8px 10px; border-bottom:1px solid rgba(255,255,255,.04); }
.pl-row-income td { color:#22c55e; }
.pl-row-expense td { color:#ef4444; }
.pl-row-net td { color:#fbbf24; font-weight:800; font-size:13px; border-top:1px solid rgba(255,255,255,.1); }

/* ════════════════════════════════════
   AI BUSINESS ADVISOR
════════════════════════════════════ */
#prox-advisor-widget {
  background:linear-gradient(135deg,rgba(251,191,36,.08),rgba(167,139,250,.06));
  border:1px solid rgba(251,191,36,.2); border-radius:14px;
  padding:16px 18px; margin-bottom:14px;
}
.adv-header { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
.adv-icon { font-size:24px; }
.adv-title { font-size:14px; font-weight:700; color:#e5e5e5; }
.adv-subtitle { font-size:10px; color:#71717a; }
.adv-kpis { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:8px; margin-bottom:14px; }
.adv-kpi { background:rgba(0,0,0,.3); border:1px solid rgba(255,255,255,.07); border-radius:9px; padding:10px 12px; }
.adv-kpi-val { font-size:18px; font-weight:800; color:#fbbf24; line-height:1; margin-bottom:3px; }
.adv-kpi-lbl { font-size:9px; color:#71717a; text-transform:uppercase; letter-spacing:.3px; }
.adv-alerts { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
.adv-alert {
  display:flex; align-items:flex-start; gap:8px; padding:8px 12px;
  border-radius:8px; font-size:11px;
}
.adv-alert-warn { background:rgba(245,158,11,.1); border:1px solid rgba(245,158,11,.2); color:#d97706; }
.adv-alert-ok   { background:rgba(34,197,94,.08); border:1px solid rgba(34,197,94,.15); color:#16a34a; }
.adv-alert-info { background:rgba(96,165,250,.08); border:1px solid rgba(96,165,250,.15); color:#3b82f6; }
.adv-weekly-brief {
  background:rgba(0,0,0,.3); border-radius:10px; padding:12px 14px;
  font-size:11px; color:#a1a1aa; line-height:1.6;
}
.adv-brief-line { margin-bottom:3px; }
.adv-brief-line strong { color:#e5e5e5; }

/* Cashflow chart */
.cf-bar-wrap { display:flex; gap:6px; align-items:flex-end; height:80px; }
.cf-bar-col { display:flex; flex-direction:column; align-items:center; gap:2px; flex:1; }
.cf-bar { border-radius:4px 4px 0 0; min-height:4px; width:100%; transition:.3s; }
.cf-bar-lbl { font-size:8px; color:#52525b; white-space:nowrap; }
`;
    document.head.appendChild(s);
  }

  /* Qui vivevano buildKanban()/_doKanban() e buildNewOrderModal(): un
     secondo Kanban Ordini (#prox-kanban) e il suo modale "+ Nuovo
     Ordine", iniettati sopra la vista nativa di GestioneOrdini — che ha
     già Kanban/Lista/Produzione/Calendario propri. Rimossi perché
     duplicati E rotti: il modale scriveva i nuovi ordini in
     STORE('ingly_orders', localStorage), mentre l'unico store reale è
     IDB('orders') — un ordine creato da lì sarebbe stato invisibile
     ovunque nell'app vera. Vedi CHANGELOG per il dettaglio. */

  /* ═══════════════════════════════════════════════════════════════════
     V1 + V2 — CRM SEGMENTAZIONE
  ═══════════════════════════════════════════════════════════════════ */
  function buildCRMEnhancement() {
    var section = document.getElementById('view-clients');
    if (!section || section._crmEnhanced) return;

    function _try(n) {
      n = n||0; if(n>40) return;
      if(!section.children.length){ setTimeout(function(){ _try(n+1); }, 400); return; }
      if(section._crmEnhanced) return;
      section._crmEnhanced = true;
      _doCRM(section);
    }
    _try();
  }

  function _doCRM(section) {
    if (document.getElementById('prox-crm-bar')) return;

    /* ── Segment client ── */
    function segmentClient(c, orders) {
      var cOrds = orders.filter(function(o){
        return (orderClient(o)||'').toLowerCase() === clientName(c).toLowerCase() ||
               (c.id && (o.client===c.id || o.clientId===c.id));
      });
      var ltv = cOrds.reduce(function(s,o){ return s+orderAmt(o); }, 0);
      var lastDate = cOrds.length ? new Date(orderDate(cOrds.sort(function(a,b){
        return new Date(orderDate(b))-new Date(orderDate(a));
      })[0]) || Date.now()) : null;
      var daysSince = lastDate ? Math.floor((Date.now()-lastDate)/(1000*86400)) : 9999;
      var seg = ltv > 2000 ? 'A' : ltv > 500 ? 'B' : 'C';
      var dormant = daysSince > 60;
      return { ltv, seg, daysSince, dormant, orders: cOrds.length };
    }

    /* ── Build bar ── */
    var bar = document.createElement('div');
    bar.id = 'prox-crm-bar';
    bar.className = 'v2-card';
    bar.innerHTML =
      '<div class="v2-title"><span>👥 CRM Clienti — Intelligence</span>'+
      '<button class="v2-btn v2-btn-primary v2-btn-sm" id="crm-new-btn">＋ Nuovo Cliente</button>'+
      '</div>'+
      '<div class="v2-kpis" id="crm-kpis"></div>'+
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">'+
      '<div class="v2-search-wrap" style="flex:1;min-width:200px"><input class="v2-search" id="crm-search" placeholder="Cerca cliente per nome, email, telefono..."></div>'+
      '<div class="crm-seg-strip" id="crm-seg-filters">'+
      '<button class="crm-seg-badge active" data-seg="*" style="background:rgba(255,255,255,.06);color:#e5e5e5;border-color:rgba(255,255,255,.15)">Tutti</button>'+
      '<button class="crm-seg-badge crm-seg-A" data-seg="A">⭐ VIP (A)</button>'+
      '<button class="crm-seg-badge crm-seg-B" data-seg="B">👍 Attivi (B)</button>'+
      '<button class="crm-seg-badge crm-seg-C" data-seg="C">🆕 Nuovi (C)</button>'+
      '<button class="crm-seg-badge crm-seg-dorm" data-seg="dormant">😴 Dormienti</button>'+
      '</div>'+
      '</div>'+
      '<div class="crm-client-list" id="crm-client-list"></div>';

    section.insertBefore(bar, section.firstChild);

    /* ── Render KPIs ── */
    function renderCRMKPIs() {
      var clients = readClients();
      var orders  = readOrders();
      var segs    = clients.map(function(c){ return segmentClient(c,orders); });
      var totalLTV = segs.reduce(function(s,x){ return s+x.ltv; }, 0);
      var dormant  = segs.filter(function(x){ return x.dormant; }).length;
      var el = document.getElementById('crm-kpis');
      if (!el) return;
      el.innerHTML = [
        { val: clients.length,                              lbl:'Clienti totali', color:'#e5e5e5' },
        { val: segs.filter(function(x){return x.seg==='A';}).length, lbl:'VIP (A) > 2K€', color:'#22c55e' },
        { val: segs.filter(function(x){return x.seg==='B';}).length, lbl:'Attivi (B)',     color:'#fbbf24' },
        { val: dormant,                                     lbl:'Dormienti >60gg', color:'#ef4444' },
        { val: fmt(totalLTV,0),                             lbl:'LTV totale',      color:'#a78bfa' },
      ].map(function(k){
        return '<div class="v2-kpi"><div class="v2-kpi-val" style="color:'+k.color+'">'+k.val+'</div><div class="v2-kpi-lbl">'+k.lbl+'</div></div>';
      }).join('');
    }
    renderCRMKPIs();

    /* ── Render client list ── */
    var activeSeg = '*', searchQ = '';

    function renderCRMList() {
      var clients = readClients();
      var orders  = readOrders();
      var q = searchQ.toLowerCase().trim();

      var enriched = clients.map(function(c){
        return Object.assign({}, c, { _seg: segmentClient(c, orders) });
      });

      if (q) enriched = enriched.filter(function(c){
        var nm = clientName(c).toLowerCase();
        return nm.includes(q) || (c.email||'').toLowerCase().includes(q) || (c.phone||c.telefono||'').includes(q);
      });

      if (activeSeg === 'dormant') enriched = enriched.filter(function(c){ return c._seg.dormant; });
      else if (activeSeg !== '*')  enriched = enriched.filter(function(c){ return c._seg.seg === activeSeg; });

      /* Sort: A first, then by LTV desc */
      enriched.sort(function(a,b){ return b._seg.ltv - a._seg.ltv; });

      var list = document.getElementById('crm-client-list');
      if (!list) return;

      if (!enriched.length) {
        list.innerHTML = '<div style="text-align:center;padding:24px;color:#3f3f46;font-size:12px">'+
          (clients.length===0 ? '⚠️ Nessun cliente — aggiungi il primo cliente' : '🔍 Nessun risultato')+
          '</div>';
        return;
      }

      var SEG_COLORS = { A:'#22c55e', B:'#fbbf24', C:'#94a3b8' };
      var SEG_BG     = { A:'rgba(34,197,94,.12)', B:'rgba(251,191,36,.12)', C:'rgba(100,116,139,.1)' };

      list.innerHTML = enriched.slice(0,50).map(function(c){
        var nm   = clientName(c);
        var init = nm.split(' ').map(function(w){ return w[0]||''; }).join('').slice(0,2).toUpperCase();
        var seg  = c._seg;
        var dormStr = seg.daysSince < 9999
          ? (seg.daysSince === 0 ? 'Oggi' : seg.daysSince + 'gg fa')
          : 'Nessun ordine';
        var dormAlert = seg.dormant;
        return '<div class="crm-client-item" data-id="'+esc(c.id||nm)+'">'+
          '<div class="crm-init" style="background:'+SEG_BG[seg.seg]+';color:'+SEG_COLORS[seg.seg]+'">'+init+'</div>'+
          '<div><div class="crm-name">'+esc(nm)+'</div>'+
          '<div class="crm-meta">'+(c.email||c.phone||c.telefono||'—')+'&nbsp;·&nbsp;'+seg.orders+' ordini</div></div>'+
          '<div class="crm-ltv">'+fmt(seg.ltv,0)+'</div>'+
          '<div><span class="crm-seg" style="background:'+SEG_BG[seg.seg]+';color:'+SEG_COLORS[seg.seg]+'">'+seg.seg+'</span></div>'+
          '<div class="crm-dormancy'+(dormAlert?' alert':'')+'">'+dormStr+'</div>'+
          '</div>';
      }).join('');

      /* Alert dormienti banner */
      var dormCount = enriched.filter(function(c){ return c._seg.dormant; }).length;
      var existing = document.getElementById('crm-dormant-alert');
      if (existing) existing.remove();
      if (dormCount > 0 && activeSeg !== 'dormant') {
        var alert = document.createElement('div');
        alert.id = 'crm-dormant-alert';
        alert.className = 'adv-alert adv-alert-warn';
        alert.style.cssText = 'margin-bottom:10px;cursor:pointer;';
        alert.innerHTML = '😴 <strong>'+dormCount+' clienti dormienti</strong> (inattivi da >60 giorni) — Clicca per vederli';
        alert.addEventListener('click', function(){
          activeSeg = 'dormant';
          bar.querySelectorAll('[data-seg]').forEach(function(b){ b.classList.toggle('active', b.dataset.seg==='dormant'); });
          renderCRMList();
        });
        list.insertBefore(alert, list.firstChild);
      }
    }
    renderCRMList();

    /* ── Filters ── */
    document.getElementById('crm-seg-filters').addEventListener('click', function(e){
      var btn = e.target.closest('[data-seg]');
      if (!btn) return;
      activeSeg = btn.dataset.seg;
      bar.querySelectorAll('[data-seg]').forEach(function(b){ b.classList.toggle('active', b===btn); });
      renderCRMList();
    });
    document.getElementById('crm-search').addEventListener('input', function(){
      searchQ = this.value;
      renderCRMList();
    });

    /* ── New Client Modal ── */
    document.getElementById('crm-new-btn').addEventListener('click', function(){ openNewClientModal(); });

    function openNewClientModal() {
      var existing = document.getElementById('prox-new-client-modal-ov');
      if (existing) { existing.classList.add('open'); return; }

      var ov = document.createElement('div');
      ov.id = 'prox-new-client-modal-ov';
      ov.style.cssText = 'position:fixed;inset:0;z-index:18000;background:rgba(0,0,0,.8);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;';
      ov.classList.add('open');
      ov.style.display = 'flex';

      var m = document.createElement('div');
      m.style.cssText = 'background:#0f0f11;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:24px;width:100%;max-width:440px;box-shadow:0 24px 60px rgba(0,0,0,.9);';
      m.innerHTML =
        '<h3 style="margin:0 0 16px;font-size:16px;color:#e5e5e5">➕ Nuovo Cliente</h3>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
        ['Nome / Ragione Sociale|nom-nc-name|text|Inserisci nome...',
         'Email|nom-nc-email|email|email@esempio.it',
         'Telefono|nom-nc-phone|tel|+39 000 0000000',
         'Città|nom-nc-city|text|es. Milano',
         'P.IVA|nom-nc-piva|text|IT00000000000',
         'Note|nom-nc-notes|text|Note interne...'].map(function(f,i){
           var parts=f.split('|');
           return '<div'+(i===0?' style="grid-column:1/-1"':'')+'><label style="font-size:10px;color:#71717a;display:block;margin-bottom:4px">'+parts[0]+'</label>'+
             '<input type="'+parts[2]+'" id="'+parts[1]+'" class="v2-search" placeholder="'+parts[3]+'" style="padding-left:12px"></div>';
         }).join('')+
        '</div>'+
        '<div style="display:flex;gap:8px;margin-top:16px">'+
        '<button class="v2-btn v2-btn-primary" id="nc-save">💾 Salva Cliente</button>'+
        '<button class="v2-btn v2-btn-secondary" id="nc-cancel">Annulla</button>'+
        '</div>';

      ov.appendChild(m);
      document.body.appendChild(ov);

      ov.addEventListener('click', function(e){ if(e.target===ov) ov.classList.remove('open'); ov.style.display='none'; });
      document.getElementById('nc-cancel').addEventListener('click', function(){ ov.style.display='none'; });
      document.getElementById('nc-save').addEventListener('click', function(){
        var name = document.getElementById('nom-nc-name').value.trim();
        if (!name) { document.getElementById('nom-nc-name').focus(); return; }
        var client = {
          id: 'C'+Date.now(), name: name,
          email: document.getElementById('nom-nc-email').value.trim(),
          phone: document.getElementById('nom-nc-phone').value.trim(),
          city:  document.getElementById('nom-nc-city').value.trim(),
          piva:  document.getElementById('nom-nc-piva').value.trim(),
          notes: document.getElementById('nom-nc-notes').value.trim(),
          createdAt: new Date().toISOString(),
        };
        var clients = STORE.arr('ingly_clients');
        clients.push(client);
        STORE.set('ingly_clients', clients);
        ov.style.display = 'none';
        toastr('✅ Cliente "'+name+'" aggiunto!', 'success', 2500);
        section._crmEnhanced = false;
        renderCRMKPIs();
        renderCRMList();
        /* Notify other sections */
        window.dispatchEvent(new StorageEvent('storage', { key:'ingly_clients' }));
      });
    }

    /* Storage sync */
    window.addEventListener('storage', function(e){
      if (['ingly_clients','ingly_crm_v1','ingly_orders','ingly_quotes'].includes(e.key)){
        renderCRMKPIs(); renderCRMList();
      }
    });
  }

  /* Qui vivevano performBackup()/startAutoBackup()/buildBackupEnhancement()
     /_doBackup(): un secondo pannello di backup, iniettato sopra la vista
     Backup reale (che già ha il proprio export/import/restore su tutta
     IndexedDB, in src/legacy/app/src/modules/settings/index.js). I suoi
     pulsanti di export/import erano già stati corretti per delegare al
     modulo Backup canonico (vedi CHANGELOG per i due bug misurati allora),
     ma restava un secondo, autonomo meccanismo di snapshot/ripristino:
     ogni 30 minuti salvava 10 chiavi di localStorage — nessuna delle quali
     è uno store IndexedDB reale (ordini, clienti, magazzino ci vivono) —
     e il suo pulsante «↩ Ripristina» faceva
     `localStorage.setItem(k, bk.data[k])` su quello snapshot, annunciando
     "✅ Backup ripristinato" senza aver toccato un solo dato vero. Rimosso
     per intero: non restava nulla da salvare. */

  /* ═══════════════════════════════════════════════════════════════════
     V2 — AI BUSINESS ADVISOR (Dashboard widget)
  ═══════════════════════════════════════════════════════════════════ */
  function buildAdvisorWidget() {
    var section = document.getElementById('view-dashboard');
    if (!section || section._advisorBuilt) return;

    function _try(n){
      n=n||0; if(n>30) return;
      if(!section.children.length){ setTimeout(function(){ _try(n+1); }, 400); return; }
      if(section._advisorBuilt) return;
      section._advisorBuilt = true;
      _doAdvisor(section);
    }
    _try();
  }

  function _doAdvisor(section) {
    if (document.getElementById('prox-advisor-widget')) return;

    var widget = document.createElement('div');
    widget.id = 'prox-advisor-widget';
    widget.innerHTML =
      '<div class="adv-header">'+
      '<div class="adv-icon">🧠</div>'+
      '<div><div class="adv-title">AI Business Advisor</div>'+
      '<div class="adv-subtitle">Analisi in tempo reale · Aggiornato: '+new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})+'</div></div>'+
      '<button class="v2-btn v2-btn-secondary v2-btn-sm" id="adv-refresh" style="margin-left:auto">↺ Aggiorna</button>'+
      '</div>'+
      '<div class="adv-kpis" id="adv-kpis"></div>'+
      '<div class="adv-alerts" id="adv-alerts"></div>'+
      '<div id="adv-cashflow-section" style="margin-bottom:12px"></div>'+
      '<div class="adv-weekly-brief" id="adv-brief"></div>';

    section.insertBefore(widget, section.firstChild);

    function renderAdvisor() {
      var orders  = readOrders();
      var clients = readClients();
      var now     = new Date();
      var thisMonth = orders.filter(function(o){
        var d=new Date(orderDate(o)||0);
        return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
      });
      var lastMonth = orders.filter(function(o){
        var d=new Date(orderDate(o)||0);
        var lm=new Date(now.getFullYear(),now.getMonth()-1,1);
        return d.getMonth()===lm.getMonth()&&d.getFullYear()===lm.getFullYear();
      });
      var rev      = thisMonth.reduce(function(s,o){ return s+orderAmt(o); },0);
      var revLast  = lastMonth.reduce(function(s,o){ return s+orderAmt(o); },0);
      var revDelta = revLast>0 ? Math.round((rev-revLast)/revLast*100) : 0;
      var inProd   = orders.filter(function(o){ return orderStatus(o)==='produzione'; });
      var pagati   = orders.filter(function(o){ return orderStatus(o)==='pagato'; });
      var incass   = pagati.filter(function(o){
        var d=new Date(orderDate(o)||0);
        return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
      }).reduce(function(s,o){ return s+orderAmt(o); },0);

      /* Dormant clients */
      var dormant = clients.filter(function(c){
        var cOrds = orders.filter(function(o){ return (orderClient(o)||'').toLowerCase()===clientName(c).toLowerCase(); });
        if (!cOrds.length) return true;
        var last = cOrds.sort(function(a,b){ return new Date(orderDate(b))-new Date(orderDate(a)); })[0];
        return (Date.now()-new Date(orderDate(last)))/(1000*86400) > 60;
      });

      /* KPIs */
      var kpiEl = document.getElementById('adv-kpis');
      if (kpiEl) kpiEl.innerHTML = [
        { val: fmt(rev,0),         lbl:'Fatturato mese',   color:'#22c55e' },
        { val: fmt(incass,0),      lbl:'Incassato mese',   color:'#fbbf24' },
        { val: thisMonth.length,   lbl:'Ordini mese',      color:'#60a5fa' },
        { val: inProd.length,      lbl:'In lavorazione',   color:'#f59e0b' },
        { val: clients.length,     lbl:'Clienti totali',   color:'#a78bfa' },
        { val: dormant.length,     lbl:'Dormienti >60gg',  color:'#ef4444' },
      ].map(function(k){
        return '<div class="adv-kpi"><div class="adv-kpi-val" style="color:'+k.color+'">'+k.val+'</div>'+
          '<div class="adv-kpi-lbl">'+k.lbl+'</div></div>';
      }).join('');

      /* Alerts */
      var alerts = [];
      if (dormant.length > 0) alerts.push({ type:'warn', msg:'😴 <strong>'+dormant.length+' clienti dormienti</strong> — non ordinano da oltre 60 giorni. Considera una campagna di ri-attivazione.' });
      if (inProd.length > 5)  alerts.push({ type:'warn', msg:'⚙️ <strong>'+inProd.length+' ordini in lavorazione</strong> — verifica che non ci siano ritardi nella produzione.' });
      if (revDelta > 0)       alerts.push({ type:'ok',   msg:'📈 <strong>Fatturato +'+revDelta+'%</strong> rispetto al mese scorso. Ottimo trend!' });
      if (revDelta < -10)     alerts.push({ type:'warn', msg:'📉 <strong>Fatturato -'+Math.abs(revDelta)+'%</strong> rispetto al mese scorso. Analizza le cause.' });
      if (!clients.length)    alerts.push({ type:'info', msg:'👥 <strong>Aggiungi i tuoi clienti</strong> alla sezione CRM per ottenere analisi e previsioni accurate.' });
      if (!orders.length)     alerts.push({ type:'info', msg:'📋 <strong>Nessun ordine registrato</strong> — inizia a creare ordini per attivare l\'analisi business.' });

      var alertEl = document.getElementById('adv-alerts');
      if (alertEl) alertEl.innerHTML = alerts.map(function(a){
        return '<div class="adv-alert adv-alert-'+a.type+'"><span>'+a.msg+'</span></div>';
      }).join('');

      /* Cashflow 6-month bar chart */
      var months = [];
      for (var i=5; i>=0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        var mOrds = orders.filter(function(o){
          var od=new Date(orderDate(o)||0);
          return od.getMonth()===d.getMonth()&&od.getFullYear()===d.getFullYear();
        });
        var mRev = mOrds.reduce(function(s,o){ return s+orderAmt(o); },0);
        months.push({ label: d.toLocaleString('it-IT',{month:'short'}), rev: mRev });
      }
      var maxRev = Math.max.apply(null, months.map(function(m){ return m.rev; })) || 1;
      var cfEl = document.getElementById('adv-cashflow-section');
      if (cfEl) {
        cfEl.innerHTML =
          '<div style="font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px;font-weight:700">📊 Fatturato ultimi 6 mesi</div>'+
          '<div class="cf-bar-wrap">'+
          months.map(function(m,i){
            var pct = Math.max(4, Math.round(m.rev/maxRev*72));
            var isCurrent = (i===5);
            var clr = isCurrent ? '#fbbf24' : '#374151';
            return '<div class="cf-bar-col">'+
              '<div style="font-size:9px;color:#52525b;margin-bottom:2px">'+
              (m.rev?fmt(m.rev,0):'')+'</div>'+
              '<div class="cf-bar" style="height:'+pct+'px;background:'+clr+'"></div>'+
              '<div class="cf-bar-lbl">'+m.label+'</div>'+
              '</div>';
          }).join('')+
          '</div>';
      }

      /* Weekly brief */
      var topClient = '';
      var clientAmt = {};
      orders.forEach(function(o){
        var cn = orderClient(o)||'';
        clientAmt[cn] = (clientAmt[cn]||0) + orderAmt(o);
      });
      var sorted = Object.keys(clientAmt).sort(function(a,b){ return clientAmt[b]-clientAmt[a]; });
      if (sorted.length) topClient = sorted[0];

      var briefEl = document.getElementById('adv-brief');
      if (briefEl) {
        var today = now.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'});
        briefEl.innerHTML =
          '<div style="font-size:9px;color:#52525b;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px;font-weight:700">📋 Brief del giorno — '+today+'</div>'+
          '<div class="adv-brief-line">📦 <strong>'+orders.length+'</strong> ordini totali registrati ('+thisMonth.length+' questo mese)</div>'+
          '<div class="adv-brief-line">💰 Fatturato mese: <strong>'+fmt(rev,0)+'</strong>'+(revDelta?(' · '+(revDelta>0?'▲+':'▼')+revDelta+'% vs mese scorso'):'')+'</div>'+
          (topClient?'<div class="adv-brief-line">⭐ Cliente top: <strong>'+esc(topClient)+'</strong> ('+fmt(clientAmt[topClient],0)+')</div>':'')+
          (inProd.length?'<div class="adv-brief-line">⚙️ <strong>'+inProd.length+'</strong> ordini in produzione oggi</div>':'')+
          (dormant.length?'<div class="adv-brief-line" style="color:#f59e0b">😴 <strong>'+dormant.length+'</strong> clienti non ordinano da >60 giorni</div>':'')+
          '<div class="adv-brief-line" style="margin-top:6px;color:#52525b">💡 Suggerimento: '+(
            dormant.length>2 ? 'Contatta i clienti dormienti con un\'offerta personalizzata.' :
            inProd.length>5  ? 'Coda di produzione alta — valuta di ottimizzare la schedulazione.' :
            rev < 500        ? 'Fatturato basso questo mese — aumenta le azioni commerciali.' :
                               'Ottima operatività! Concentrati sull\'acquisizione nuovi clienti.'
          )+'</div>';
      }
    }

    renderAdvisor();
    document.getElementById('adv-refresh').addEventListener('click', renderAdvisor);

    window.addEventListener('storage', function(e){
      if (['ingly_orders','ingly_quotes','ingly_clients','ingly_crm_v1'].includes(e.key)) renderAdvisor();
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     V2 — FINANCE SUITE (P&L mensile)
  ═══════════════════════════════════════════════════════════════════ */
  function buildFinanceSuite() {
    var section = document.getElementById('view-fiscal');
    if (!section || section._financeSuiteBuilt) return;

    function _try(n){
      n=n||0; if(n>30) return;
      if(!section.children.length){ setTimeout(function(){ _try(n+1); }, 500); return; }
      if(section._financeSuiteBuilt) return;
      section._financeSuiteBuilt = true;
      _doFinance(section);
    }
    _try();
  }

  function _doFinance(section) {
    if (document.getElementById('prox-finance-pl')) return;

    var card = document.createElement('div');
    card.id = 'prox-finance-pl';
    card.className = 'v2-card';
    card.innerHTML =
      '<div class="v2-title"><span>💰 Finance Suite — P&L & Cashflow</span>'+
      '<button class="v2-btn v2-btn-secondary v2-btn-sm" id="fin-export-btn">📥 Esporta CSV</button></div>'+
      '<div class="pl-month-grid" id="pl-months"></div>'+
      '<div id="pl-detail" style="margin-top:6px"></div>';

    /* Insert before existing fiscal content */
    var existing = document.getElementById('prox-fiscal-bar');
    if (existing) section.insertBefore(card, existing);
    else section.insertBefore(card, section.firstChild);

    var selectedMonth = new Date().getMonth();
    var selectedYear  = new Date().getFullYear();

    function getMonthOrders(m, y) {
      return readOrders().filter(function(o){
        var d = new Date(orderDate(o)||0);
        return d.getMonth()===m && d.getFullYear()===y;
      });
    }

    function renderMonths() {
      var now = new Date();
      var grid = document.getElementById('pl-months');
      if (!grid) return;
      var months = [];
      for (var i=11; i>=0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        months.push({ m: d.getMonth(), y: d.getFullYear(), label: d.toLocaleString('it-IT',{month:'short', year:'2-digit'}) });
      }
      grid.innerHTML = months.map(function(mo){
        var ords = getMonthOrders(mo.m, mo.y);
        var rev  = ords.reduce(function(s,o){ return s+orderAmt(o); },0);
        var active = (mo.m===selectedMonth && mo.y===selectedYear);
        return '<div class="pl-month-card'+(active?' active':'')+'" data-m="'+mo.m+'" data-y="'+mo.y+'">'+
          '<div class="pl-month-name">'+mo.label+'</div>'+
          '<div class="pl-month-rev">'+(rev?fmt(rev,0):'—')+'</div>'+
          '<div class="pl-month-exp">'+ords.length+' ord.</div>'+
          '</div>';
      }).join('');
    }
    renderMonths();

    function renderDetail(m, y) {
      var el = document.getElementById('pl-detail');
      if (!el) return;
      var ords = getMonthOrders(m, y);
      var fixed = STORE.get('ingly_fixed_costs') || {};
      var fixedTotal = Object.values(fixed).reduce(function(s,v){ return s+(+v||0); }, 0);

      /* Group by technique/source */
      var byTech = {};
      ords.forEach(function(o){
        var tech = o.technique || o.machine || 'altro';
        byTech[tech] = (byTech[tech]||0) + orderAmt(o);
      });

      var totalRev  = ords.reduce(function(s,o){ return s+orderAmt(o); },0);
      var totalCost = fixedTotal;
      var gross = totalRev - totalCost;
      var margin = totalRev>0 ? Math.round(gross/totalRev*100) : 0;

      var monthLabel = new Date(y,m,1).toLocaleString('it-IT',{month:'long',year:'numeric'});

      el.innerHTML =
        '<div style="font-size:12px;font-weight:700;color:#e5e5e5;margin-bottom:10px;text-transform:capitalize">'+monthLabel+'</div>'+
        '<table class="pl-table">'+
        '<thead><tr><th>Voce</th><th>Importo</th><th>%</th></tr></thead>'+
        '<tbody>'+
        /* Revenue lines */
        Object.keys(byTech).map(function(t){
          var v = byTech[t];
          var pct = totalRev>0 ? Math.round(v/totalRev*100) : 0;
          return '<tr class="pl-row-income"><td>📥 Ricavi '+t+'</td><td>'+fmt(v,0)+'</td><td>'+pct+'%</td></tr>';
        }).join('')+
        '<tr class="pl-row-income" style="font-weight:700"><td><strong>TOTALE RICAVI</strong></td><td><strong>'+fmt(totalRev,0)+'</strong></td><td>100%</td></tr>'+
        /* Cost lines */
        (fixedTotal>0?'<tr class="pl-row-expense"><td>📤 Costi fissi</td><td>'+fmt(fixedTotal,0)+'</td><td>'+(totalRev>0?Math.round(fixedTotal/totalRev*100):0)+'%</td></tr>':'')+''+
        '<tr class="pl-row-net"><td><strong>MARGINE LORDO</strong></td><td><strong>'+fmt(gross,0)+'</strong></td><td><strong>'+(margin>0?'+':'')+margin+'%</strong></td></tr>'+
        '</tbody></table>'+
        (ords.length===0?'<div style="text-align:center;color:#3f3f46;padding:16px;font-size:11px">Nessun ordine in questo mese</div>':'');
    }
    renderDetail(selectedMonth, selectedYear);

    document.getElementById('pl-months').addEventListener('click', function(e){
      var card = e.target.closest('.pl-month-card');
      if (!card) return;
      selectedMonth = +card.dataset.m;
      selectedYear  = +card.dataset.y;
      document.querySelectorAll('.pl-month-card').forEach(function(c){ c.classList.remove('active'); });
      card.classList.add('active');
      renderDetail(selectedMonth, selectedYear);
    });

    document.getElementById('fin-export-btn').addEventListener('click', function(){
      var ords = readOrders();
      var csv = 'ID,Cliente,Data,Importo,Stato,Tecnica\n';
      ords.forEach(function(o){
        csv += [o.id||'', orderClient(o), dateIT(orderDate(o)), orderAmt(o).toFixed(2),
                orderStatus(o), o.technique||''].map(function(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }).join(',')+'\n';
      });
      var blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
      var a = document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download='ingly-ordini-'+new Date().toISOString().slice(0,10)+'.csv';
      a.click();
      toastr('📥 CSV esportato ('+ords.length+' ordini)', 'success', 2000);
    });

    window.addEventListener('storage', function(e){
      if (['ingly_orders','ingly_quotes','ingly_fixed_costs'].includes(e.key)){
        renderMonths(); renderDetail(selectedMonth, selectedYear);
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     BOOT
  ═══════════════════════════════════════════════════════════════════ */
  var _bootTries = 0;
  function boot() {
    _bootTries++;
    if (_bootTries > 40) return;
    if (!document.getElementById('content-inner') || typeof App === 'undefined') {
      setTimeout(boot, 500); return;
    }

    injectV2CSS();

    buildCRMEnhancement();
    buildAdvisorWidget();
    buildFinanceSuite();

    /* Nav hooks */
    if (!window._proxV2NavHooked && App.navigate) {
      var _origNav = App.navigate;
      App.navigate = function (section) {
        var r = _origNav.apply(this, arguments);
        setTimeout(function () {
          if (section === 'clients')         buildCRMEnhancement();
          if (section === 'dashboard')       buildAdvisorWidget();
          if (section === 'fiscal')          buildFinanceSuite();
        }, 300);
        return r;
      };
      window._proxV2NavHooked = true;
    }

    console.log('[prox-v2] V1+V2 layer loaded ✅');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 2000); });
  } else {
    setTimeout(boot, 2000);
  }

})();

