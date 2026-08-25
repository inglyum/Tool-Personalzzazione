
// ── Early safety stubs — prevent ReferenceError during load ──
window._earlyQueue = [];
['NavGroups','ModMgr','Quoter','Favs','App','MorningBriefing','ExcelExport','Anchoring','CloudSync','Backup'].forEach(name=>{
  if(typeof window[name]==='undefined'){
    window[name]=new Proxy({},{
      get:(t,k)=>typeof t[k]==='function'?t[k]:(...args)=>{
        window._earlyQueue.push([name,k,args]);
        // Once real object loads, replay
        const check=()=>{
          const real=window['_real_'+name]||window[name];
          if(real&&real!==window[name]&&typeof real[k]==='function'){real[k](...args);}
        };
        setTimeout(check,1500);
      }
    });
  }
});
