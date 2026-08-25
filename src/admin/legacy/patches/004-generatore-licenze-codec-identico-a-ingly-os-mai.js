
/* ═══ GENERATORE LICENZE (codec identico a INGLY OS main) ═══════════════════ */
(function(){
  var GEN = {
    _SALT:'ingly-belice-2026',
    PLANS:{starter:{name:'Starter',price:19,color:'#06b6d4'},pro:{name:'Pro',price:49,color:'#6366f1'},business:{name:'Business',price:99,color:'#f59e0b'},enterprise:{name:'Enterprise',price:199,color:'#a855f7'}},
    _sig:function(s){var h=0,x=s+this._SALT;for(var i=0;i<x.length;i++){h=(h*31+x.charCodeAt(i))>>>0;}return h.toString(36);},
    _enc:function(o){return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');},
    encode:function(plan,expISO,name){var b=this._enc({p:plan,e:expISO||'',n:name||'',t:Date.now()});return 'INGLY.'+b+'.'+this._sig(b);}
  };
  window.InglyLicenseGen = GEN;
  function openGen(){
    if(document.getElementById('_lgen')) return;
    var ov=document.createElement('div'); ov.id='_lgen';
    ov.style.cssText='position:fixed;inset:0;background:#000b;z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,sans-serif';
    var today=new Date(); var y1=new Date(today.getTime()+365*864e5).toISOString().slice(0,10);
    ov.innerHTML='<div style="background:#12121a;border:1px solid #2a2a3a;border-radius:16px;padding:24px;width:480px;max-width:95vw;color:#e8e8f0">'
      +'<div style="font-size:17px;font-weight:800;margin-bottom:14px">🔑 Genera Codice Licenza</div>'
      +'<label style="font-size:11px;color:#888;text-transform:uppercase;font-weight:700">Piano</label>'
      +'<select id="_lg_plan" style="width:100%;padding:9px;margin:5px 0 12px;background:#1c1c26;border:1px solid #2a2a3a;border-radius:8px;color:#fff;font-size:13px">'
      +'<option value="starter">Starter — €19/mese (28 moduli)</option>'
      +'<option value="pro">Pro — €49/mese (60 moduli)</option>'
      +'<option value="business">Business — €99/mese (91 moduli)</option>'
      +'<option value="enterprise">Enterprise — €199/mese (tutti)</option>'
      +'</select>'
      +'<label style="font-size:11px;color:#888;text-transform:uppercase;font-weight:700">Intestatario (opzionale)</label>'
      +'<input id="_lg_name" placeholder="Es. Bar Centrale — Palermo" style="width:100%;padding:9px;margin:5px 0 12px;background:#1c1c26;border:1px solid #2a2a3a;border-radius:8px;color:#fff;font-size:13px">'
      +'<label style="font-size:11px;color:#888;text-transform:uppercase;font-weight:700">Scadenza</label>'
      +'<input id="_lg_exp" type="date" value="'+y1+'" style="width:100%;padding:9px;margin:5px 0 14px;background:#1c1c26;border:1px solid #2a2a3a;border-radius:8px;color:#fff;font-size:13px">'
      +'<button id="_lg_go" style="width:100%;padding:11px;background:#6366f1;border:none;border-radius:9px;color:#fff;font-weight:800;cursor:pointer;font-size:13px">Genera codice</button>'
      +'<div id="_lg_out" style="display:none;margin-top:14px">'
        +'<label style="font-size:11px;color:#888;text-transform:uppercase;font-weight:700">Codice licenza (copia e invia al cliente)</label>'
        +'<textarea id="_lg_code" readonly rows="3" style="width:100%;padding:9px;margin:5px 0;background:#0a0a12;border:1px solid #6366f1;border-radius:8px;color:#a5b4fc;font-family:monospace;font-size:12px"></textarea>'
        +'<button id="_lg_copy" style="width:100%;padding:9px;background:#22c55e;border:none;border-radius:8px;color:#052e16;font-weight:800;cursor:pointer">📋 Copia negli appunti</button>'
      +'</div>'
      +'<button id="_lg_close" style="width:100%;padding:9px;margin-top:8px;background:transparent;border:1px solid #2a2a3a;border-radius:8px;color:#888;cursor:pointer">Chiudi</button>'
      +'</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
    document.getElementById('_lg_close').onclick=function(){ov.remove();};
    document.getElementById('_lg_go').onclick=function(){
      var plan=document.getElementById('_lg_plan').value, name=document.getElementById('_lg_name').value, exp=document.getElementById('_lg_exp').value;
      var code=GEN.encode(plan,exp,name);
      document.getElementById('_lg_code').value=code;
      document.getElementById('_lg_out').style.display='block';
    };
    document.getElementById('_lg_copy').onclick=function(){
      var t=document.getElementById('_lg_code'); t.select();
      try{navigator.clipboard.writeText(t.value);}catch(e){document.execCommand('copy');}
      this.textContent='✅ Copiato!'; var b=this; setTimeout(function(){b.textContent='📋 Copia negli appunti';},1500);
    };
  }
  var btn=document.createElement('button');
  btn.textContent='🔑 Genera Licenza';
  btn.style.cssText='position:fixed;bottom:20px;right:20px;z-index:99999;padding:12px 18px;background:#6366f1;color:#fff;border:none;border-radius:99px;font-weight:800;cursor:pointer;box-shadow:0 8px 24px #6366f166;font-family:system-ui,sans-serif;font-size:13px';
  btn.onclick=openGen;
  if(document.body) document.body.appendChild(btn); else window.addEventListener('DOMContentLoaded',function(){document.body.appendChild(btn);});
})();
