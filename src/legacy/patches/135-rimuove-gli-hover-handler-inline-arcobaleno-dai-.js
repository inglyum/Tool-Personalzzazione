
/* Rimuove gli hover-handler inline "arcobaleno" dai quick-tool della sidebar
   così l'hover ambra coerente del CSS può applicarsi. Safe: gira una volta,
   nessun loop, nessuna logica. */
(function(){
  function tidy(){
    var tb=document.getElementById('sidebar-toolbar'); if(!tb){ return setTimeout(tidy,600); }
    tb.querySelectorAll('button[onmouseover]').forEach(function(b){
      // mantieni Espandi/Comprimi neutri; togli i colori hardcoded a tutti
      b.removeAttribute('onmouseover'); b.removeAttribute('onmouseout');
    });
  }
  if(document.readyState!=='loading') tidy(); else document.addEventListener('DOMContentLoaded',tidy);
})();
