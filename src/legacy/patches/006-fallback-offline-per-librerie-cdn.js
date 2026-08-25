
/* ═══ FALLBACK OFFLINE per librerie CDN ═══════════════════════════════════
   Se un CDN non è raggiungibile (offline / CDN down), definisci stub no-op
   così le sezioni con grafici/export degradano senza crashare l'app.
   Obiettivo offline-first: nessuna dipendenza esterna deve rompere il tool. */
(function(){
  if (typeof window.Chart === 'undefined') {
    var Stub = function(){ return { destroy:function(){}, update:function(){}, resize:function(){}, render:function(){}, data:{datasets:[]}, options:{} }; };
    Stub.getChart = function(){ return null; };
    Stub.register = function(){};
    Stub.defaults = { plugins:{}, font:{}, color:'#888', scale:{} };
    Stub.__offlineStub = true;
    window.Chart = Stub;
  }
  // Segnala una volta lo stato offline delle librerie non caricate
  window._inglyCDNoffline = [];
  ['Chart','jspdf','html2canvas','XLSX'].forEach(function(g){
    var ok = (g==='jspdf') ? (window.jspdf||window.jsPDF) : window[g];
    if (!ok || (window.Chart && window.Chart.__offlineStub && g==='Chart')) window._inglyCDNoffline.push(g);
  });
})();
