
window._archiveOrder = async function(orderId) {
  try {
    const id = +orderId||orderId;
    const o = await IDB.get('orders', id).catch(()=>null);
    if(!o) return;
    PipelineArchive.add({...o, _archivedAt:new Date().toISOString()});
    o._archived = true;
    o._archivedAt = new Date().toISOString();
    await IDB.put('orders', o);
    AppStore.invalidate('orders');
    AppStore.invalidate('pipeline');
    // Visual feedback
    const card = document.querySelector('.ofe-card[data-id="'+id+'"]');
    if(card){ card.style.transition='all .3s'; card.style.opacity='0'; card.style.transform='scale(.95)'; setTimeout(()=>card.remove(),300); }
    toast('📦 Ordine archiviato!','success');
  } catch(ex){ toast('Errore archivio','error'); console.error(ex); }
};
