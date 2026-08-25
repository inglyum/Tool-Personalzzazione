
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v75 — Preventivatore collegato al MOTORE KB (Fase 1 · aggancio UI)
   Pannello additivo nel preventivatore che calcola con window.InglyDomain.quote
   (motore estratto, tipizzato e testato). NON sostituisce il quoter esistente:
   è uno strumento di calcolo/verifica coerente al 100% con la Knowledge Base.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__quoterAssist) return; window.__quoterAssist=true;

  function D(){ return window.DS; }
  function dom(){ return window.InglyDomain; }
  function eur(n){ try{ return dom().format.eur(n); }catch(e){ return '€'+(n||0); } }

  function open(){
    var Q=dom(); if(!Q||!Q.quote){ if(D()) D().toast('Motore non pronto','err'); return; }
    var DS=D(); if(!DS) return;
    var box=document.createElement('div');
    var intro=document.createElement('p'); intro.className='ds-hint'; intro.style.marginBottom='12px';
    intro.textContent='Calcolo coerente con la Knowledge Base: (Materiale+Macchina+Lavoro+Design)×Markup → ,90, sconti quantità, acconto 50% sui personalizzati >€50, validità 7 giorni.';
    box.appendChild(intro);

    var grid=document.createElement('div'); grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px';
    var fMat=DS.field({label:'Materiale (€)',type:'number',value:'2'});
    var fMac=DS.field({label:'Macchina (€)',type:'number',value:'1'});
    var fOre=DS.field({label:'Ore lavoro',type:'number',value:'0.5'});
    var fDes=DS.field({label:'Design (€)',type:'number',value:'0'});
    var fQty=DS.field({label:'Quantità',type:'number',value:'1'});
    var fCanale=DS.field({label:'Canale',type:'select',options:[{value:'b2c',label:'B2C ×3'},{value:'b2b',label:'B2B ×2.5'},{value:'etsy',label:'Etsy ×3.5'}]});
    var fCat=DS.field({label:'Categoria (minimo)',type:'select',options:[{value:'',label:'—'},{value:'portachiavi',label:'Portachiavi €6.90'},{value:'cake_topper',label:'Cake topper €24.90'},{value:'targa_a5',label:'Targa A5 €29.90'},{value:'qr_menu',label:'QR menu €19.90'}]});
    [fMat,fMac,fOre,fDes,fQty,fCanale,fCat].forEach(function(f){ f.style.marginBottom='0'; grid.appendChild(f); });
    box.appendChild(grid);
    var rowCustom=document.createElement('label'); rowCustom.style.cssText='display:flex;gap:8px;align-items:center;font-size:13px;margin-bottom:12px;cursor:pointer';
    var cb=document.createElement('input'); cb.type='checkbox';
    rowCustom.appendChild(cb); rowCustom.appendChild(document.createTextNode('Personalizzato (acconto 50% se >€50)'));
    box.appendChild(rowCustom);

    var out=document.createElement('div'); box.appendChild(out);
    function num(v){ v=parseFloat(v); return isFinite(v)?v:0; }
    function calc(){
      var line={ label:'Articolo', material:num(fMat._input.value), machine:num(fMac._input.value),
        laborHours:num(fOre._input.value), design:num(fDes._input.value), qty:num(fQty._input.value),
        category:fCat._input.value||undefined, custom:cb.checked };
      var res=Q.quote.computeQuote([line], fCanale._input.value);
      var l=res.lines[0];
      out.textContent='';
      var card=document.createElement('div'); card.style.cssText='border:1px solid var(--border,#333);border-radius:12px;padding:16px;background:var(--bg-card,#161616)';
      function row(k,v,strong){ var r=document.createElement('div'); r.style.cssText='display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border2,#242424);font-size:14px'+(strong?';font-weight:800':'');
        var a=document.createElement('span'); a.textContent=k; a.style.color='var(--text-muted,#9ca3af)';
        var b=document.createElement('span'); b.textContent=v; b.style.fontVariantNumeric='tabular-nums'; if(strong) b.style.color='var(--primary,#fbbf24)';
        r.appendChild(a); r.appendChild(b); return r; }
      card.appendChild(row('Prezzo unitario', eur(l.unit)));
      card.appendChild(row('Sconto quantità', (l.discount*100).toFixed(0)+'%'));
      card.appendChild(row('Totale riga ('+l.qty+' pz)', eur(l.lineTotal), true));
      card.appendChild(row('Margine unitario', (l.margin*100).toFixed(0)+'%'));
      card.appendChild(row('Acconto richiesto', res.deposit>0?eur(res.deposit):'—'));
      card.appendChild(row('Minimo ordine (€15)', res.meetsOrderMinimum?'✓ ok':'⚠️ sotto minimo'));
      card.appendChild(row('Valido fino al', res.validUntil));
      out.appendChild(card);
      // avviso margine sotto soglia canale
      var ch=fCanale._input.value; var minMargin={b2c:0.65,b2b:0.55,etsy:0.65}[ch];
      if(l.margin<minMargin){ var w=document.createElement('div'); w.className='ds-hint'; w.style.cssText='margin-top:8px;color:var(--red,#ef4444)';
        w.textContent='⚠️ Margine '+(l.margin*100).toFixed(0)+'% sotto il minimo '+ch.toUpperCase()+' ('+(minMargin*100)+'%): aggiungi valore, non tagliare il prezzo.'; out.appendChild(w); }
    }
    [fMat,fMac,fOre,fDes,fQty].forEach(function(f){ f._input.oninput=calc; });
    [fCanale,fCat].forEach(function(f){ f._input.onchange=calc; }); cb.onchange=calc;
    calc();
    DS.modal({title:'⚡ Preventivo rapido — motore KB', body:box});
  }
  window.QuoterAssist={ open:open };

  function injectBtn(){
    var view=document.getElementById('view-quoter'); if(!view) return setTimeout(injectBtn,1200);
    if(view.querySelector('#qa-open-btn')) return;
    var host=view.querySelector('.module-actions')||view.querySelector('.module-header')||view;
    var b=document.createElement('button'); b.id='qa-open-btn'; b.className='btn btn-secondary btn-sm ds-btn';
    b.innerHTML='⚡ Preventivo rapido (motore KB)'; b.style.margin='8px 6px';
    b.onclick=open; host.appendChild(b);
  }
  if(typeof Bus!=='undefined'&&Bus.on) Bus.on('nav:quoter', function(){ setTimeout(injectBtn,300); });
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(injectBtn,2800); });
})();
