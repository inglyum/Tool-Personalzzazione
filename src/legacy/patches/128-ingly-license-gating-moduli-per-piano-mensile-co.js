
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY LICENSE — gating moduli per piano mensile (codice licenza offline)
   Default (nessuna licenza) = accesso COMPLETO (copia master). Il gating si
   attiva SOLO quando viene inserito un codice licenza valido di un piano.
   Codec identico all'Admin Panel (INGLY-OS-Enterprise-Admin).
   ═══════════════════════════════════════════════════════════════════════════ */
const InglyLicense = {
  _KEY:'ingly_license_v1', _SALT:'ingly-belice-2026',
  PLANS:{
    starter:   {name:'Starter',   price:19,  color:'#06b6d4', modules:['backup','catalog','clienti','clients','dashboard','finance','fiscal','fixed_costs','gestione_ordini','goals','history','items','kpi','lab_setup','listino','magazzino','monthly_report','payment_schedule','prima_nota','quick_quote','quoter','reports','sales','settings','suppliers','taxcalendar','timetracker','weeklyreport']},
    pro:       {name:'Pro',       price:49,  color:'#6366f1', modules:['ai','ai-dashboard','ai-predictor','aicoach','analytics','apparel','backup','barcode','booking','brand_identity','calendar','catalog','clienti','clients','crm','crm_pipeline','dashboard','equipment','finance','fiscal','fixed_costs','forecasting','gestione_ordini','goals','history','imagelib','items','kpi','lab_setup','laser_b2b','lasercalc','laserresources','leadscorer','listino','magazzino','marketing','monthly_report','paints','payment_schedule','prima_nota','print3d','projects','quick_quote','quoteintel','quoter','recurring','reports','revsim','sales','scanner','settings','socialstudio','stockalert','stockplanner','suppliers','taxcalendar','team','timetracker','weeklyreport','workflow_dashboard']},
    business:  {name:'Business',  price:99,  color:'#f59e0b', modules:['ai','ai-anomaly','ai-clv','ai-dashboard','ai-predictor','ai-reorder','aicoach','analytics','apparel','backup','barcode','bizai','booking','brand_identity','calendar','catalog','clienti','clientintel','clients','clv','competitormon','competitors','crm','crm_pipeline','dashboard','decision','demand_map','dynamicprice','equipment','etsy_pulse','etsy_seo_wizard','etsyai','finance','fiscal','fixed_costs','forecaster','forecasting','gestione_ordini','goals','growthengine','history','imagelib','inglydesign','intel','items','kpi','lab_setup','laser_b2b','lasercalc','laserresources','leadscorer','listino','live_intel','magazzino','market_agent','market_intel','marketing','marketintel','monthly_report','opportunity','paints','payment_schedule','photostudio','price_radar','prima_nota','print3d','product_hunter','profitscope','projects','quick_quote','quoteintel','quoter','recurring','reports','revsim','sales','scanner','settings','socialproof','socialstudio','stockalert','stockplanner','strategy','supplierintel','suppliers','taxcalendar','team','timetracker','trendscanner','weeklyreport','workflow_dashboard']},
    enterprise:{name:'Enterprise',price:199, color:'#a855f7', modules:['*']},
  },
  _sig(s){ let h=0; const x=s+this._SALT; for(let i=0;i<x.length;i++){h=(h*31+x.charCodeAt(i))>>>0;} return h.toString(36); },
  _enc(o){ return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); },
  _dec(s){ s=s.replace(/-/g,'+').replace(/_/g,'/'); return JSON.parse(decodeURIComponent(escape(atob(s)))); },
  encode(plan,expISO,name){ const b=this._enc({p:plan,e:expISO||'',n:name||'',t:Date.now()}); return 'INGLY.'+b+'.'+this._sig(b); },
  decode(code){ try{ const P=String(code||'').trim().split('.'); if(P.length!==3||P[0]!=='INGLY') return null;
    if(this._sig(P[1])!==P[2]) return {err:'firma non valida'}; const p=this._dec(P[1]);
    if(!this.PLANS[p.p]) return {err:'piano sconosciuto'};
    return {plan:p.p, exp:p.e, name:p.n, expired:!!(p.e && new Date(p.e) < new Date())}; }catch(e){ return {err:'codice illeggibile'}; } },
  get(){ try{ return JSON.parse(localStorage.getItem(this._KEY)||'null'); }catch(e){ return null; } },
  apply(code){ const d=this.decode(code); if(!d||d.err) return {ok:false,err:(d&&d.err)||'codice non valido'};
    localStorage.setItem(this._KEY, JSON.stringify({plan:d.plan,exp:d.exp,name:d.name,code:code})); return {ok:true,...d}; },
  clear(){ localStorage.removeItem(this._KEY); },
  active(){ const l=this.get(); if(!l||!l.code) return null; const d=this.decode(l.code); return (d&&!d.err)?d:null; },
  allowed(section){ const p=this.active(); if(!p) return true;
    if(p.expired) return ['dashboard','settings','licenza'].includes(section);
    const m=this.PLANS[p.plan].modules; if(m[0]==='*') return true;
    return m.includes(section)||['settings','licenza'].includes(section); },
  gate(section){ if(this.allowed(section)) return false;
    const p=this.active()||{}; const pl=this.PLANS[p.plan]||{};
    const v=document.getElementById('view-'+section)||(function(){var e=document.createElement('div');e.id='view-'+section;e.className='section-view';var ci=document.getElementById('content-inner');if(ci)ci.appendChild(e);return e;})();
    document.querySelectorAll('.section-view.active').forEach(x=>x.classList.remove('active')); v.classList.add('active');
    v.innerHTML='<div style="max-width:520px;margin:8vh auto;text-align:center;padding:32px;background:var(--bg-card);border:1px solid var(--border);border-radius:16px">'
      +'<div style="font-size:40px;margin-bottom:8px">🔒</div>'
      +'<div style="font-size:18px;font-weight:800;margin-bottom:6px">Modulo non incluso nel piano '+(pl.name||p.plan||'')+'</div>'
      +'<div style="font-size:13px;color:var(--text-muted);margin-bottom:18px">'+(p.expired?'La tua licenza è scaduta. Rinnova per continuare.':'Questa funzione è disponibile in un piano superiore.')+'</div>'
      +'<button class="btn btn-primary" onclick="InglyLicense.openModal()">Gestisci licenza / Upgrade</button>'
      +'</div>';
    return true; },
  openModal(){ const cur=this.active(); const ex=this.get();
    var ov=document.createElement('div'); ov.className='modal-overlay open'; ov.id='_lic_modal';
    ov.style.cssText='position:fixed;inset:0;background:#000a;z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.innerHTML='<div class="modal" style="max-width:480px;background:var(--bg-card);border:1px solid var(--border2);border-radius:16px;padding:24px">'
      +'<div style="font-size:17px;font-weight:800;margin-bottom:4px">🔑 Licenza & Piano</div>'
      +'<div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">'+(cur?('Piano attivo: <strong style="color:'+(this.PLANS[cur.plan].color)+'">'+this.PLANS[cur.plan].name+'</strong>'+(cur.exp?' · scade '+cur.exp:'')+(cur.expired?' · <span style=color:var(--red)>SCADUTA</span>':'')):'Nessuna licenza attiva — accesso completo (copia master).')+'</div>'
      +'<label style="font-size:11px;color:var(--text-muted);font-weight:700;text-transform:uppercase">Incolla codice licenza</label>'
      +'<textarea id="_lic_input" class="form-control" rows="3" placeholder="INGLY.xxxxx.xxxx" style="width:100%;margin:6px 0 12px;font-family:monospace;font-size:12px">'+(ex&&ex.code?ex.code:'')+'</textarea>'
      +'<div id="_lic_msg" style="font-size:12px;min-height:18px;margin-bottom:10px"></div>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end">'
      +(cur?'<button class="btn btn-secondary" onclick="InglyLicense.clear();document.getElementById(\'_lic_modal\').remove();location.reload()">Rimuovi licenza</button>':'')
      +'<button class="btn btn-secondary" onclick="document.getElementById(\'_lic_modal\').remove()">Chiudi</button>'
      +'<button class="btn btn-primary" onclick="InglyLicense._applyFromModal()">Attiva</button>'
      +'</div></div>';
    ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
    document.body.appendChild(ov); },
  _applyFromModal(){ const code=document.getElementById('_lic_input').value; const msg=document.getElementById('_lic_msg');
    const r=this.apply(code);
    if(r.ok){ msg.style.color='var(--green)'; msg.textContent='✅ Licenza '+this.PLANS[r.plan].name+' attivata. Ricarico...'; setTimeout(()=>location.reload(),1000); }
    else { msg.style.color='var(--red)'; msg.textContent='❌ '+r.err; } },
};
window.InglyLicense = InglyLicense;
/* Punto d'accesso topbar: pulsante 🔑 con badge del piano attivo (se presente). */
(function _licTopbar(){
  function ins(){
    var tb=document.getElementById('topbar'); if(!tb){ return setTimeout(ins,800); }
    if(document.getElementById('lic-topbar-btn')) return;
    var sp=tb.querySelector('.spacer');
    var b=document.createElement('button'); b.id='lic-topbar-btn'; b.className='topbar-btn';
    b.title='Licenza & Piano'; b.onclick=function(){ InglyLicense.openModal(); };
    var a=InglyLicense.active();
    b.innerHTML = a ? ('🔑 <span style="font-weight:700;color:'+(InglyLicense.PLANS[a.plan].color)+'">'+InglyLicense.PLANS[a.plan].name+'</span>'+(a.expired?' <span style="color:var(--red)">(scaduta)</span>':'')) : '🔑';
    if(sp&&sp.parentNode){ sp.parentNode.insertBefore(b, sp.nextSibling); } else { tb.appendChild(b); }
  }
  if(document.readyState!=='loading') ins(); else document.addEventListener('DOMContentLoaded', ins);
})();
