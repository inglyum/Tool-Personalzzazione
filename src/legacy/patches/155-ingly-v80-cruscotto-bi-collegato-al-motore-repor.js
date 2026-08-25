
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v80 — Cruscotto BI collegato al motore reporting (Fase 5 · aggancio UI)
   Pannello "Report direzionale" che calcola con window.InglyDomain.reporting:
   ricavi per canale/mese, margine, ripartizione cassa profit-first (KB), forecast.
   Solo lettura. Additivo.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__biAssist) return; window.__biAssist=true;
  function DS(){ return window.DS; }
  function dom(){ return window.InglyDomain; }
  function eur(n){ try{ return dom().format.eur(n); }catch(e){ return '€'+Math.round(n||0); } }
  function getAll(s){ return (window.IDB&&IDB.getAll)?IDB.getAll(s).catch(function(){return[];}):Promise.resolve([]); }

  async function open(){
    var R=dom(); var D=DS(); if(!R||!R.reporting||!D){ if(D) D.toast('Motore BI non pronto','err'); return; }
    // sorgente: vendite (fallback ordini chiusi)
    var sales=await getAll('sales'); if(!sales.length){ sales=(await getAll('orders')).filter(function(o){
      var s=String(o.status||o.stage||'').toLowerCase(); return ['venduto','completato','paid','delivered','sold','invoiced','completed'].indexOf(s)>=0; }); }
    var rep=R.reporting;
    var byChannel=rep.revenueByChannel(sales);
    var byMonth=rep.revenueByMonth(sales);
    var margin=rep.marginSummary(sales);
    var split=rep.profitFirstSplit(margin.revenue);
    var forecast=rep.forecastNextMonth(byMonth);

    var box=document.createElement('div');
    var intro=document.createElement('p'); intro.className='ds-hint'; intro.style.marginBottom='12px';
    intro.textContent='Cruscotto calcolato dal motore BI su '+sales.length+' vendite. Ripartizione cassa profit-first secondo la Knowledge Base.';
    box.appendChild(intro);

    function tile(label,val,accent){ var c=document.createElement('div');
      c.style.cssText='background:var(--bg-card,#111);border:1px solid var(--border,#333);border-radius:12px;padding:14px';
      var v=document.createElement('div'); v.style.cssText='font:800 20px inherit;color:'+(accent||'var(--primary,#fbbf24)'); v.textContent=val; v.style.fontVariantNumeric='tabular-nums';
      var l=document.createElement('div'); l.className='ds-hint'; l.style.marginTop='4px'; l.textContent=label; c.appendChild(v); c.appendChild(l); return c; }
    var strip=document.createElement('div'); strip.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px';
    strip.appendChild(tile('Ricavi totali', eur(margin.revenue)));
    strip.appendChild(tile('Margine', eur(margin.margin)+' ('+(margin.marginPct*100).toFixed(0)+'%)', margin.marginPct>=0.6?'var(--green,#22c55e)':'var(--primary,#fbbf24)'));
    strip.appendChild(tile('Forecast mese prox.', eur(forecast)));
    box.appendChild(strip);

    // Cassa profit-first
    var ch=document.createElement('div'); ch.style.cssText='font:700 13px inherit;margin:6px 0 8px'; ch.textContent='Ripartizione cassa (profit-first)'; box.appendChild(ch);
    var cashCols=[
      {key:'k',label:'Voce'},{key:'pct',label:'%'},{key:'v',label:'Importo',render:function(r){ return eur(r.v); }}
    ];
    var cashRows=[
      {k:'💶 Tasse',pct:'15%',v:split.tasse},{k:'🛟 Riserva',pct:'10%',v:split.riserva},
      {k:'🎯 Obiettivi',pct:'15%',v:split.obiettivi},{k:'⚙️ Operativo',pct:'60%',v:split.operativo}
    ];
    box.appendChild(D.table(cashCols, cashRows));

    // Ricavi per canale
    var chn=document.createElement('div'); chn.style.cssText='font:700 13px inherit;margin:16px 0 8px'; chn.textContent='Ricavi per canale'; box.appendChild(chn);
    var chanRows=Object.keys(byChannel).map(function(k){ return {canale:k, ricavi:byChannel[k]}; }).sort(function(a,b){ return b.ricavi-a.ricavi; });
    if(chanRows.length) box.appendChild(D.table([{key:'canale',label:'Canale'},{key:'ricavi',label:'Ricavi',render:function(r){ return eur(r.ricavi); }}], chanRows));
    else { var e=document.createElement('div'); e.className='ds-hint'; e.textContent='Nessuna vendita registrata.'; box.appendChild(e); }

    D.modal({title:'📊 Report direzionale — motore BI', body:box});
  }
  window.BIAssist={ open:open };

  function injectBtn(){
    ['view-dashboard','view-analytics','view-kpi'].forEach(function(vid){
      var view=document.getElementById(vid); if(!view) return;
      if(view.querySelector('.bi-open-btn')) return;
      var host=view.querySelector('.module-actions')||view.querySelector('.module-header')||view;
      var b=document.createElement('button'); b.className='btn btn-secondary btn-sm ds-btn bi-open-btn';
      b.innerHTML='📊 Report direzionale (BI)'; b.style.margin='8px 6px'; b.onclick=open; host.appendChild(b);
    });
  }
  if(typeof Bus!=='undefined'&&Bus.on){ ['nav:dashboard','nav:analytics','nav:kpi'].forEach(function(ev){ Bus.on(ev,function(){ setTimeout(injectBtn,300); }); }); }
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(injectBtn,3000); });
})();
