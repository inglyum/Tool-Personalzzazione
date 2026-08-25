
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v76 — Ordini & Clienti collegati ai MOTORI KB (Fase 1 · aggancio UI)
   Pannelli additivi che calcolano con window.InglyDomain.orders / .clients
   (motori estratti, tipizzati e testati). Solo lettura, nessuna modifica alla
   logica esistente.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__ordCliAssist) return; window.__ordCliAssist=true;
  function DS(){ return window.DS; }
  function dom(){ return window.InglyDomain; }
  function eur(n){ try{ return dom().format.eur(n); }catch(e){ return '€'+(n||0); } }
  function getAll(s){ return (window.IDB&&IDB.getAll)?IDB.getAll(s).catch(function(){return[];}):Promise.resolve([]); }

  // ── ORDINI: KPI settimana (motore orders) ──
  async function openOrdersKpi(){
    var O=dom(); var D=DS(); if(!O||!O.orders||!D) return;
    var orders=await getAll('orders');
    var weekAgo=Date.now()-7*864e5;
    function ts(o){ var v=o.createdAt||o.date||o._upd||0; var t=typeof v==='number'?v:Date.parse(v); return isFinite(t)?t:0; }
    var week=orders.filter(function(o){ return ts(o)>=weekAgo; });
    var k=O.orders.computeKpi(week);
    var box=document.createElement('div');
    var intro=document.createElement('p'); intro.className='ds-hint'; intro.style.marginBottom='12px';
    intro.textContent='KPI ultimi 7 giorni calcolati dal motore (target KB: ricavi ≥ €375 · conversione ≥ 40% · ticket medio ≥ €45).';
    box.appendChild(intro);
    function tile(label,val,ok){ var c=document.createElement('div');
      c.style.cssText='background:var(--bg-card,#111);border:1px solid var(--border,#333);border-radius:12px;padding:14px';
      var v=document.createElement('div'); v.style.cssText='font:800 22px inherit;color:'+(ok?'var(--green,#22c55e)':'var(--primary,#fbbf24)'); v.textContent=val; v.style.fontVariantNumeric='tabular-nums';
      var l=document.createElement('div'); l.className='ds-hint'; l.style.marginTop='4px'; l.textContent=label;
      c.appendChild(v); c.appendChild(l); return c; }
    var grid=document.createElement('div'); grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px';
    grid.appendChild(tile('Ricavi settimana', eur(k.revenue), k.meetsRevenue));
    grid.appendChild(tile('Conversione', (k.conversion*100).toFixed(0)+'%', k.meetsConversion));
    grid.appendChild(tile('Ticket medio', eur(k.avgTicket), k.meetsAvgTicket));
    grid.appendChild(tile('Vinti / aperti', k.won+' / '+k.open));
    box.appendChild(grid);
    D.modal({title:'📊 KPI Ordini — motore KB', body:box});
  }

  // ── CLIENTI: segmentazione + CLV (motore clients) ──
  async function openClientsSeg(){
    var O=dom(); var D=DS(); if(!O||!O.clients||!D) return;
    var clients=await getAll('clients'); var orders=await getAll('orders');
    // indicizza ordini per cliente (clientId | client | clientеName fallback)
    var byClient={};
    orders.forEach(function(o){ var cid=o.clientId!=null?o.clientId:(o.client!=null?o.client:null); if(cid==null) return;
      (byClient[cid]=byClient[cid]||[]).push(o); });
    var rows=clients.map(function(c){
      var cs=O.clients.clientStats(byClient[c.id]||byClient[c.name]||[]);
      return { name:c.name||c.id||'—', stats:cs };
    });
    rows=O.clients.rankByValue(rows);
    var box=document.createElement('div');
    var intro=document.createElement('p'); intro.className='ds-hint'; intro.style.marginBottom='12px';
    intro.textContent='Segmentazione e valore cliente (CLV) dal motore. Priorità di relazione dal più alto valore.';
    box.appendChild(intro);
    var cols=[
      {key:'name',label:'Cliente'},
      {key:'seg',label:'Segmento',render:function(r){ return D.badge(O.clients.segmentLabel(r.stats.segment), r.stats.segment==='champion'?'green':(r.stats.segment==='a_rischio'?'red':'muted')); }},
      {key:'ord',label:'Ordini',render:function(r){ return String(r.stats.orders); }},
      {key:'rev',label:'Speso',render:function(r){ return eur(r.stats.revenue); }},
      {key:'clv',label:'CLV',render:function(r){ return eur(r.stats.clv); }}
    ];
    if(!rows.length){ var e=document.createElement('div'); e.className='ds-hint'; e.textContent='Nessun cliente.'; box.appendChild(e); }
    else box.appendChild(D.table(cols, rows.slice(0,50)));
    D.modal({title:'🏆 Segmentazione clienti — motore KB', body:box});
  }
  window.OrdersAssist={ openKpi:openOrdersKpi };
  window.ClientsAssist={ openSeg:openClientsSeg };

  function injectBtn(viewId, id, label, fn){
    var view=document.getElementById(viewId); if(!view) return;
    if(view.querySelector('#'+id)) return;
    var host=view.querySelector('.module-actions')||view.querySelector('.module-header')||view;
    var b=document.createElement('button'); b.id=id; b.className='btn btn-secondary btn-sm ds-btn';
    b.innerHTML=label; b.style.margin='8px 6px'; b.onclick=fn; host.appendChild(b);
  }
  function tryInject(){
    injectBtn('view-gestione_ordini','oa-kpi-btn','📊 KPI Ordini (motore KB)', openOrdersKpi);
    injectBtn('view-orders','oa-kpi-btn2','📊 KPI Ordini (motore KB)', openOrdersKpi);
    injectBtn('view-clients','ca-seg-btn','🏆 Segmentazione (motore KB)', openClientsSeg);
  }
  if(typeof Bus!=='undefined'&&Bus.on){ ['nav:gestione_ordini','nav:orders','nav:clients'].forEach(function(ev){ Bus.on(ev,function(){ setTimeout(tryInject,300); }); }); }
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(tryInject,2900); });
})();
