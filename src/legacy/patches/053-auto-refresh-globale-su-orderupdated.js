
// Auto-refresh GLOBALE su orderUpdated
document.addEventListener('orderUpdated', function() {
  const sec = App?.currentSection;
  if(!sec) return;
  const map = {
    gestione_ordini:()=>{if(typeof GestioneOrdini!=='undefined')(async()=>{try{await GestioneOrdini.render();}catch(e){}})();},
    orders:()=>{ if(typeof OrderFlow!=='undefined') (async()=>{try{if(typeof OrderFlow!=='undefined')await OrderFlow.render();}catch(e){}})(); },
    pipeline:()=>{ if(typeof PipelineOS!=='undefined') (async()=>{try{if(typeof PipelineOS!=='undefined')await PipelineOS.render();}catch(e){}})(); },
    sales:()=>{ if(typeof Sales!=='undefined') (async()=>{try{if(typeof Sales!=='undefined')await Sales.render();}catch(e){}})(); },
  };
  const fn = map[sec];
  if(fn) { if(typeof AbortableTimer!=='undefined') AbortableTimer.set('order-ref-'+sec, fn, 200); else setTimeout(fn, 200); }
  setTimeout(()=>{ SidebarBadges?.update(); QuickStats?.update(); }, 300);
});
