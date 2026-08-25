
/* ── Ricerca cliente sopra ogni tendina "a cascata" (Quoter, Ordini, Progetti…)
   Filtra le opzioni per nome/email → non devi più scrollare. Additivo. ── */
(function(){
  "use strict";
  if(window.__clientPicker) return; window.__clientPicker=true;
  function enhance(sel){
    if(sel.dataset.csp) return; sel.dataset.csp='1';
    var inp=document.createElement('input');
    inp.type='text'; inp.className=sel.className||'form-control';
    inp.placeholder='🔍 Cerca cliente…';
    inp.setAttribute('autocomplete','off');
    inp.style.marginBottom='6px'; inp.style.fontSize='12px';
    inp.addEventListener('input',function(){
      var q=inp.value.toLowerCase().trim(), opts=sel.options, shown=0, first=-1;
      for(var i=0;i<opts.length;i++){
        var o=opts[i];
        if(!o.value){ o.hidden=false; continue; }
        var m=!q||(o.textContent||'').toLowerCase().indexOf(q)>-1;
        o.hidden=!m; if(m){ shown++; if(first<0) first=i; }
      }
      if(q && shown===1 && first>=0 && sel.selectedIndex!==first){
        sel.selectedIndex=first; sel.dispatchEvent(new Event('change',{bubbles:true}));
      }
    });
    // Enter → seleziona il primo risultato visibile
    inp.addEventListener('keydown',function(e){
      if(e.key==='Enter'){ e.preventDefault();
        for(var i=0;i<sel.options.length;i++){ if(sel.options[i].value && !sel.options[i].hidden){ sel.selectedIndex=i; sel.dispatchEvent(new Event('change',{bubbles:true})); break; } }
      }
    });
    sel.parentNode.insertBefore(inp, sel);
  }
  function scan(){
    document.querySelectorAll('select[id*="client" i]').forEach(function(sel){
      if(sel.options && sel.options.length>=5) enhance(sel); // solo liste clienti lunghe
    });
  }
  function run(){ try{ scan(); }catch(e){} }
  if(document.readyState!=='loading') setTimeout(run,1600);
  else document.addEventListener('DOMContentLoaded',function(){ setTimeout(run,1600); });
  setInterval(run, 2500); // riesamina: le tendine si popolano quando apri i form
})();
