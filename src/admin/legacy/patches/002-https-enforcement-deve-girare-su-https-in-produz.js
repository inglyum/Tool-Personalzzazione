
// HTTPS enforcement — deve girare su HTTPS in produzione
(function(){
  if(location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1'){
    document.body.innerHTML = '<div style="min-height:100vh;background:#09090b;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui;padding:20px">'
      + '<div style="text-align:center;max-width:420px">'
      + '<div style="font-size:48px;margin-bottom:16px">&#128274;</div>'
      + '<div style="font-size:22px;font-weight:900;color:#e8e8f0;margin-bottom:12px">Connessione non sicura</div>'
      + '<div style="font-size:13px;color:#666;line-height:1.8">L&#39;Admin Panel INGLY richiede HTTPS.<br>Contatta il responsabile tecnico.</div>'
      + '</div></div>';
  }
})();
