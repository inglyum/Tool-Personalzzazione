
(function(){
  var tries=0, iv=setInterval(function(){
    tries++; if(tries>120){clearInterval(iv);return;}
    if(typeof App==='undefined') return;
    if(window._goalsOrderHooked) return;
    window._goalsOrderHooked=true;
    clearInterval(iv);
    window.Goals=window.Goals||{};
    window.Goals.onOrderComplete=function(orderId,profit){
      if(typeof window.Goals.processOrder==='function'){
        window.Goals.processOrder(orderId,profit||0);
      }
    };
    console.log('[Goals Integration] Order completion hook ready');
  },300);
})();
