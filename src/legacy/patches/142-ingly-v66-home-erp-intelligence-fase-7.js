
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v66 — HOME ERP INTELLIGENCE (Fase 7)
   Un pannello "briefing" in cima alla Dashboard: legge i dati esistenti
   (ordini, magazzino, macchine, ricavi settimana) e sintetizza stato + prossime
   azioni, allineato ai KPI della KB (settimana ricavi ≥ €375, conversione ≥ 40%).
   SOLO lettura dei dati, nessuna modifica alla logica. Additivo, DS-based, offline.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.ERPIntel && window.ERPIntel.__v66) return;
  var TARGET_WEEK=375; // KB: ricavi settimana ≥ €375

  function eur(n){ n=+n||0; return '€'+n.toLocaleString('it-IT',{minimumFractionDigits:0,maximumFractionDigits:0}); }
  function num(v){ v=parseFloat(v); return isFinite(v)?v:0; }
  function getAll(s){ return (window.IDB&&IDB.getAll)?IDB.getAll(s).catch(function(){return [];}):Promise.resolve([]); }
  function field(o,keys,d){ for(var i=0;i<keys.length;i++){ if(o[keys[i]]!=null) return o[keys[i]]; } return d; }
  function ts(o){ var v=field(o,['createdAt','date','_upd','ts','created'],0); var t=(typeof v==='number')?v:Date.parse(v); return isFinite(t)?t:0; }

  var ERPIntel = {
    __v66:true,
    async compute(){
      var orders=await getAll('orders');
      var equip=await getAll('equipment');
      var inv=await getAll('inventory'); if(!inv.length) inv=await getAll('materials');
      var now=Date.now(), weekAgo=now-7*864e5;

      // Ricavi settimana: ordini "chiusi" nell'ultima settimana
      var CLOSED=['completato','venduto','paid','delivered','sold','invoiced','completed'];
      var weekRev=0, weekCount=0, pending=0, quotesTot=0;
      orders.forEach(function(o){
        var st=String(field(o,['status','stage'],'')).toLowerCase();
        var tot=num(field(o,['total','amount','price','totale','importo'],0));
        if(CLOSED.indexOf(st)>=0 && ts(o)>=weekAgo){ weekRev+=tot; weekCount++; }
        if(['preventivo','inviato','sent','draft','accettato','accepted'].indexOf(st)>=0){ pending++; quotesTot+=tot; }
      });

      // Magazzino sotto scorta
      var low=[];
      inv.forEach(function(i){ var q=num(field(i,['qty','quantita','stock','giacenza'],NaN));
        var min=num(field(i,['min','minStock','soglia','scortaMin'],NaN));
        if(isFinite(q)&&isFinite(min)&&min>0&&q<=min) low.push(field(i,['name','nome','label'],'—')); });

      // Macchine non ripagate
      var notPaid=[];
      equip.forEach(function(m){ var cost=num(m.costBuy), saved=num(m.setAside);
        if(cost>0 && saved<cost) notPaid.push({name:(m.name||((m.brand||'')+' '+(m.model||''))).trim()||'Macchina', pct: Math.round(saved/cost*100)}); });

      return { weekRev:weekRev, weekCount:weekCount, pending:pending, quotesTot:quotesTot,
        low:low, notPaid:notPaid, target:TARGET_WEEK, onTrack: weekRev>=TARGET_WEEK };
    },

    // Prossime azioni derivate (semplici, basate sui dati)
    actions:function(d){
      var a=[];
      if(!d.onTrack){ var gap=d.target-d.weekRev; a.push('Mancano '+eur(gap)+' al target settimanale ('+eur(d.target)+'): spingi 1-2 preventivi in attesa a chiusura.'); }
      if(d.pending>0) a.push(d.pending+' preventivi aperti ('+eur(d.quotesTot)+' potenziali): ricontatta chi non risponde da 3+ giorni.');
      if(d.low.length) a.push('Riordina materiali sotto scorta: '+d.low.slice(0,4).join(', ')+(d.low.length>4?'…':'')+'.');
      if(d.notPaid.length) a.push(d.notPaid.length+' macchine non ancora ripagate: accantona la quota mensile (Investimenti & ROI).');
      if(!a.length) a.push('Tutto in linea. Consolida: eventi ricorrenti e clienti B2B ripetuti.');
      return a;
    },

    async render(){
      var host=document.getElementById('view-dashboard'); if(!host) return;
      var mount=host.querySelector('#erp-intel-panel');
      if(!mount){ mount=document.createElement('div'); mount.id='erp-intel-panel';
        mount.style.cssText='margin:0 0 18px;';
        var hdr=host.querySelector('.module-header');
        if(hdr&&hdr.nextSibling) hdr.parentNode.insertBefore(mount, hdr.nextSibling);
        else host.insertBefore(mount, host.firstChild);
      }
      mount.textContent='';
      var d=await this.compute();

      var panel=document.createElement('div');
      panel.style.cssText='border:1px solid var(--border,#333);border-radius:var(--radius-lg,16px);padding:18px;background:linear-gradient(135deg, color-mix(in srgb,var(--primary,#fbbf24) 8%, var(--bg-card,#161616)), var(--bg-card,#161616));';

      var top=document.createElement('div'); top.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap;';
      var t=document.createElement('div'); t.style.cssText='font:800 18px inherit;';
      t.textContent='🧠 Intelligence — briefing di oggi'; top.appendChild(t);
      top.appendChild(DS.badge(d.onTrack?'In linea col target':'Sotto target', d.onTrack?'green':'red'));
      panel.appendChild(top);

      // KPI strip
      var strip=document.createElement('div'); strip.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px;';
      function kpi(label,val,sub){ var c=document.createElement('div');
        c.style.cssText='background:var(--bg-card,#111);border:1px solid var(--border,#333);border-radius:var(--radius,12px);padding:12px;';
        var v=document.createElement('div'); v.style.cssText='font:800 20px inherit;color:var(--primary,#fbbf24);'; v.textContent=val;
        var l=document.createElement('div'); l.className='ds-hint'; l.style.marginTop='4px'; l.textContent=label;
        c.appendChild(v); c.appendChild(l);
        if(sub){ var s=document.createElement('div'); s.className='ds-hint'; s.textContent=sub; c.appendChild(s); }
        return c; }
      strip.appendChild(kpi('Ricavi settimana', eur(d.weekRev), 'target '+eur(d.target)));
      strip.appendChild(kpi('Ordini chiusi (7g)', d.weekCount));
      strip.appendChild(kpi('Preventivi aperti', d.pending, eur(d.quotesTot)+' potenziali'));
      strip.appendChild(kpi('Sotto scorta', d.low.length+' art.'));
      panel.appendChild(strip);

      // Azioni
      var ah=document.createElement('div'); ah.style.cssText='font:700 13px inherit;margin-bottom:8px;'; ah.textContent='Prossime azioni'; panel.appendChild(ah);
      var ul=document.createElement('div'); ul.style.cssText='display:flex;flex-direction:column;gap:8px;';
      this.actions(d).forEach(function(txt){ var row=document.createElement('div');
        row.style.cssText='display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.4;';
        var dot=document.createElement('span'); dot.textContent='→'; dot.style.color='var(--primary,#fbbf24)'; dot.setAttribute('aria-hidden','true');
        var sp=document.createElement('span'); sp.textContent=txt;
        row.appendChild(dot); row.appendChild(sp); ul.appendChild(row); });
      panel.appendChild(ul);

      mount.appendChild(panel);
    }
  };
  window.ERPIntel = ERPIntel;

  function hook(){
    if(typeof Bus!=='undefined'&&Bus.on){ Bus.on('nav:dashboard', function(){ setTimeout(function(){ ERPIntel.render(); },350); }); }
    // primo render se già in dashboard
    setTimeout(function(){ var v=document.getElementById('view-dashboard'); if(v&&(v.classList.contains('active')||v.offsetParent!==null)) ERPIntel.render(); }, 2600);
    // aggiorna su cambi dati rilevanti
    try{ if(typeof Bus!=='undefined'&&Bus.on){ ['orders:changed','equipment:changed','inventory:changed'].forEach(function(ev){ Bus.on(ev,function(){ ERPIntel.render(); }); }); } }catch(e){}
  }
  if(document.readyState!=='loading') hook(); else document.addEventListener('DOMContentLoaded', hook);
})();
