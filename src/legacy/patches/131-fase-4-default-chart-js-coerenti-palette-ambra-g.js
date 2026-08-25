
/* Fase 4: default Chart.js coerenti (palette ambra, griglia tenue, font Inter).
   Applicati solo dove i grafici non sovrascrivono. Additivo, nessuna logica. */
(function(){
  function apply(){
    if(typeof Chart==='undefined'||Chart.__offlineStub||!Chart.defaults){ return setTimeout(apply,500); }
    try{
      var css=getComputedStyle(document.documentElement);
      var muted=(css.getPropertyValue('--text-muted')||'#888').trim();
      var border=(css.getPropertyValue('--border2')||'#ffffff18').trim();
      var primary=(css.getPropertyValue('--primary')||'#fbbf24').trim();
      Chart.defaults.font.family="'Inter',system-ui,sans-serif";
      Chart.defaults.font.size=11;
      Chart.defaults.color=muted;
      Chart.defaults.borderColor=border;
      if(Chart.defaults.plugins&&Chart.defaults.plugins.legend){
        Chart.defaults.plugins.legend.labels=Chart.defaults.plugins.legend.labels||{};
        Chart.defaults.plugins.legend.labels.usePointStyle=true;
        Chart.defaults.plugins.legend.labels.boxWidth=8;
        Chart.defaults.plugins.legend.labels.padding=14;
      }
      if(Chart.defaults.plugins&&Chart.defaults.plugins.tooltip){
        var tt=Chart.defaults.plugins.tooltip;
        tt.padding=10; tt.cornerRadius=8; tt.boxPadding=6;
        tt.titleColor='#fff'; tt.bodyColor='#e5e5e5';
        tt.backgroundColor='rgba(20,20,26,.95)'; tt.borderColor=border; tt.borderWidth=1;
      }
      Chart.defaults.elements={...(Chart.defaults.elements||{})};
      if(Chart.defaults.elements.line){ Chart.defaults.elements.line.tension=0.35; }
      if(Chart.defaults.elements.point){ Chart.defaults.elements.point.radius=0; Chart.defaults.elements.point.hoverRadius=4; }
      window.__inglyChartDefaults=true;
    }catch(e){}
  }
  apply();
})();
