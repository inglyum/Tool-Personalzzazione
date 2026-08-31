
// ── Early safety stubs — prevent ReferenceError during load ──
/* Il segnaposto serve: durante il caricamento questi nomi vengono chiamati
   prima che i moduli esistano, e senza di lui la pagina si ferma su un
   ReferenceError.

   Com'era, però, mentiva due volte, e le due bugie sono state misurate:

   1. **Il replay non funzionava.** Dopo 1,5 s riprovava con
      `real = window['_real_'+name] || window[name]`, e poi chiedeva
      `real !== window[name]` — cioè, nel ramo che si verifica sempre,
      `window[name] !== window[name]`: falso per costruzione. Nessuna
      chiamata in coda è mai stata rigiocata.

   2. **Il segnaposto non si ritirava.** I moduli veri sono dichiarati
      `const NavGroups = {…}` in coda al file: un `const` di primo livello
      non crea una proprietà su `window`. Quindi `NavGroups` (identificatore
      nudo) è il modulo vero, mentre `window.NavGroups` è rimasto il
      segnaposto per tutta la vita della pagina — due oggetti diversi con lo
      stesso nome, e il segnaposto risponde `function` a **qualunque**
      proprietà, quindi nessun controllo `typeof x.metodo === 'function'`
      poteva accorgersene.

   Adesso: il segnaposto si dichiara tale (`__stub`), e prima di inghiottire
   una chiamata guarda se nel frattempo è comparso il modulo vero — come
   binding globale o su `window` — e gliela passa. */
window._earlyQueue = [];
window._earlyStubs = [];
['NavGroups','ModMgr','Quoter','Favs','App','MorningBriefing','ExcelExport','Anchoring','CloudSync','Backup'].forEach(function(name){
  if(typeof window[name]!=='undefined') return;

  /* Il modulo vero, se esiste: prima il binding globale (i moduli si
     dichiarano `const`, che non finisce su `window`), poi `window`. Mai il
     segnaposto stesso. */
  var vero=function(){
    var c=null;
    try{ c=(0,eval)(name); }catch(e){ c=null; }
    if(c && !c.__stub) return c;
    var w=window['_real_'+name];
    if(w && !w.__stub) return w;
    return null;
  };

  var stub=new Proxy({__stub:true, __nome:name},{
    get:function(t,k){
      if(k==='__stub'||k==='__nome') return t[k];
      var r=vero();
      if(r && typeof r[k]!=='undefined') return r[k];
      if(typeof t[k]==='function') return t[k];
      return function(){
        var args=Array.prototype.slice.call(arguments);
        var tardi=vero();
        if(tardi && typeof tardi[k]==='function') return tardi[k].apply(tardi,args);
        /* Non c'è ancora: si mette in coda e si riprova una volta. La coda
           resta leggibile — un segnaposto che inghiotte in silenzio è il
           motivo per cui questo difetto è vissuto tanto a lungo. */
        window._earlyQueue.push([name,k,args]);
        setTimeout(function(){
          var poi=vero();
          if(poi && typeof poi[k]==='function') poi[k].apply(poi,args);
        },1500);
      };
    },
  });
  window[name]=stub;
  window._earlyStubs.push(name);
});
