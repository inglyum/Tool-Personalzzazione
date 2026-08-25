
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v77 — VOCI IN PREVENTIVO editabili + PDF allineato allo Smart Quoter
   • Rende quantità e prezzo unitario di ogni voce modificabili DOPO l'aggiunta,
     con ricalcolo immediato (subtotale, riepilogo, PDF).
   • Il fix del totale PDF (inclusione Costi Aggiuntivi) è applicato inline.
   Additivo: wrappa Quoter.renderLines senza cambiarne la logica.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  function boot(){
    if(typeof Quoter==='undefined'||!Quoter.renderLines){ return setTimeout(boot,800); }
    if(Quoter.renderLines.__editWrapped) return;
    var _rl=Quoter.renderLines.bind(Quoter);
    function num(v){ v=parseFloat(v); return isFinite(v)?v:0; }

    function mkInput(val, align){
      var i=document.createElement('input');
      i.type='text'; i.value=val;
      i.style.cssText='width:100%;max-width:90px;background:var(--bg-card2,#1a1a1a);border:1px solid var(--border2,#333);'+
        'border-radius:6px;color:#fff;font:inherit;font-size:13px;padding:4px 6px;text-align:'+(align||'right')+';';
      i.onfocus=function(){ i.style.borderColor='var(--primary,#fbbf24)'; i.select(); };
      i.onblur=function(){ i.style.borderColor='var(--border2,#333)'; };
      i.onkeydown=function(e){ if(e.key==='Enter'){ i.blur(); } };
      return i;
    }
    function commit(){ if(Quoter.recalcRight) Quoter.recalcRight(); Quoter.renderLines(); }

    function enhance(){
      var body=document.getElementById('ql-lines-body'); if(!body) return;
      var rows=body.querySelectorAll('tr');
      rows.forEach(function(tr,idx){
        var line=Quoter.lines[idx]; if(!line) return;
        var tds=tr.querySelectorAll('td');
        if(tds.length<4) return;
        // Qtà (td[1]) editabile
        var qtyTd=tds[1]; qtyTd.textContent='';
        var qtyIn=mkInput(line.qty, 'center'); qtyIn.style.maxWidth='60px';
        qtyIn.onchange=function(){ var q=Math.max(1,Math.round(num(qtyIn.value)||1));
          line.qty=q; line.subtotal=+((num(line.unitCost))*q).toFixed(2); commit(); };
        qtyTd.appendChild(qtyIn);
        // Prezzo unitario (td[2]) editabile
        var unitTd=tds[2]; unitTd.textContent='';
        var unitIn=mkInput((num(line.unitCost)).toFixed(2), 'right');
        unitIn.onchange=function(){ var u=num(unitIn.value);
          line.unitCost=+u.toFixed(4); line.subtotal=+(u*(num(line.qty)||1)).toFixed(2); commit(); };
        unitTd.appendChild(unitIn);
        // marca la riga come editabile (hint)
        if(!tr.dataset.editHint){ tr.dataset.editHint='1'; tr.title='Quantità e prezzo unitario sono modificabili'; }
      });
    }

    Quoter.renderLines=function(){ var r=_rl.apply(this, arguments); try{ enhance(); }catch(e){} return r; };
    Quoter.renderLines.__editWrapped=true;
    // primo enhance se già renderizzato
    try{ enhance(); }catch(e){}
  }
  if(document.readyState!=='loading') setTimeout(boot,1500); else document.addEventListener('DOMContentLoaded',function(){ setTimeout(boot,1500); });
})();
