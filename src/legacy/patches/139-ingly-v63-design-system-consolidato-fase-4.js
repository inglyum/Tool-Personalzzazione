
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v63 — DESIGN SYSTEM consolidato (Fase 4)
   Un solo set di componenti riusabili: Button, Input, Select, Modal, Toast,
   Badge, Table. Sostituisce gradualmente gli stili inline SENZA rompere il
   layout esistente. Classi namespaced `.ds-*` + factory `window.DS`.
   Additivo: non tocca .btn/.card esistenti se non con focus-ring accessibile.
   Amber #fbbf24 come accento. CSP-safe, zero dipendenze esterne.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.DS && window.DS.__v63) return;

  // ── CSS layer ──────────────────────────────────────────────────────────
  var css = `
  :root{ --ds-accent:var(--primary,#fbbf24); }
  .ds-btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px;
    font:600 14px/1 inherit; padding:10px 16px; min-height:40px; border-radius:var(--radius,12px);
    border:1px solid transparent; background:var(--bg-card,#1a1a1a); color:var(--text,#fff);
    cursor:pointer; transition:transform .12s var(--ease-out,ease), box-shadow .12s ease, background .12s ease;
    user-select:none; white-space:nowrap; }
  .ds-btn:hover{ transform:translateY(-1px); box-shadow:var(--shadow-md,0 4px 12px rgba(0,0,0,.2)); }
  .ds-btn:active{ transform:translateY(0); }
  .ds-btn:focus-visible{ outline:2px solid var(--ds-accent); outline-offset:2px; }
  .ds-btn--primary{ background:var(--ds-accent); color:#1a1200; border-color:var(--ds-accent); }
  .ds-btn--ghost{ background:transparent; border-color:var(--border,#333); }
  .ds-btn--danger{ background:var(--red,#ef4444); color:#fff; border-color:var(--red,#ef4444); }
  .ds-btn--sm{ min-height:32px; padding:6px 12px; font-size:13px; }
  .ds-btn--lg{ min-height:48px; padding:14px 22px; font-size:15px; }
  .ds-btn[disabled]{ opacity:.5; cursor:not-allowed; transform:none; box-shadow:none; }

  .ds-field{ display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
  .ds-label{ font:600 12px/1.2 inherit; color:var(--text-muted,#9ca3af); letter-spacing:.02em; }
  .ds-input,.ds-select,.ds-textarea{ width:100%; box-sizing:border-box; font:400 14px/1.4 inherit;
    padding:10px 12px; min-height:40px; border-radius:var(--radius-sm,8px);
    border:1px solid var(--border,#333); background:var(--bg-card,#111); color:var(--text,#fff);
    transition:border-color .12s ease, box-shadow .12s ease; }
  .ds-textarea{ min-height:88px; resize:vertical; }
  .ds-input:focus,.ds-select:focus,.ds-textarea:focus{ outline:none; border-color:var(--ds-accent);
    box-shadow:0 0 0 3px color-mix(in srgb, var(--ds-accent) 25%, transparent); }
  .ds-hint{ font-size:11px; color:var(--text-dim,#6b7280); }

  .ds-badge{ display:inline-flex; align-items:center; gap:5px; font:600 11px/1 inherit;
    padding:5px 9px; border-radius:999px; background:color-mix(in srgb, var(--ds-accent) 15%, transparent);
    color:var(--ds-accent); border:1px solid color-mix(in srgb, var(--ds-accent) 30%, transparent); }
  .ds-badge--green{ background:color-mix(in srgb,var(--green,#22c55e) 15%,transparent); color:var(--green,#22c55e); border-color:color-mix(in srgb,var(--green,#22c55e) 30%,transparent); }
  .ds-badge--red{ background:color-mix(in srgb,var(--red,#ef4444) 15%,transparent); color:var(--red,#ef4444); border-color:color-mix(in srgb,var(--red,#ef4444) 30%,transparent); }
  .ds-badge--muted{ background:var(--bg-card,#222); color:var(--text-muted,#9ca3af); border-color:var(--border,#333); }

  .ds-modal-ov{ position:fixed; inset:0; z-index:99990; display:flex; align-items:center; justify-content:center;
    background:rgba(0,0,0,.55); backdrop-filter:blur(4px); padding:20px; opacity:0; transition:opacity .18s ease; }
  .ds-modal-ov.ds-in{ opacity:1; }
  .ds-modal{ width:100%; max-width:560px; max-height:88vh; overflow:auto; background:var(--bg-card,#161616);
    border:1px solid var(--border,#333); border-radius:var(--radius-lg,16px); box-shadow:var(--shadow-lg,0 20px 60px rgba(0,0,0,.5));
    transform:translateY(8px) scale(.98); transition:transform .18s var(--ease-out,ease); }
  .ds-modal-ov.ds-in .ds-modal{ transform:translateY(0) scale(1); }
  .ds-modal-hd{ display:flex; align-items:center; justify-content:space-between; gap:12px;
    padding:18px 20px; border-bottom:1px solid var(--border,#333); position:sticky; top:0; background:inherit; z-index:1; }
  .ds-modal-hd h3{ margin:0; font:700 17px/1.2 inherit; color:var(--text,#fff); }
  .ds-modal-x{ background:none; border:none; color:var(--text-muted,#9ca3af); font-size:22px; cursor:pointer; line-height:1; padding:4px 8px; border-radius:8px; }
  .ds-modal-x:hover{ background:var(--bg-card,#222); color:var(--text,#fff); }
  .ds-modal-bd{ padding:20px; }
  .ds-modal-ft{ display:flex; gap:10px; justify-content:flex-end; padding:16px 20px; border-top:1px solid var(--border,#333); }

  .ds-toast-wrap{ position:fixed; right:18px; bottom:18px; z-index:99999; display:flex; flex-direction:column; gap:10px; max-width:min(360px,90vw); }
  .ds-toast{ display:flex; align-items:flex-start; gap:10px; padding:12px 14px; border-radius:var(--radius,12px);
    background:var(--bg-card,#1c1c1c); border:1px solid var(--border,#333); box-shadow:var(--shadow-lg,0 10px 30px rgba(0,0,0,.4));
    color:var(--text,#fff); font-size:13px; transform:translateX(120%); transition:transform .25s var(--ease-out,ease); }
  .ds-toast.ds-in{ transform:translateX(0); }
  .ds-toast--ok{ border-left:3px solid var(--green,#22c55e); }
  .ds-toast--err{ border-left:3px solid var(--red,#ef4444); }
  .ds-toast--info{ border-left:3px solid var(--ds-accent); }

  .ds-table{ width:100%; border-collapse:collapse; font-size:13px; }
  .ds-table th{ text-align:left; font:600 12px/1 inherit; color:var(--text-muted,#9ca3af);
    padding:10px 12px; border-bottom:1px solid var(--border,#333); position:sticky; top:0; background:var(--bg-card,#161616); }
  .ds-table td{ padding:11px 12px; border-bottom:1px solid var(--border2,#242424); color:var(--text,#eee); }
  .ds-table tbody tr{ transition:background .12s ease; }
  .ds-table tbody tr:hover{ background:color-mix(in srgb, var(--ds-accent) 6%, transparent); }
  .ds-table-wrap{ overflow-x:auto; border:1px solid var(--border,#333); border-radius:var(--radius,12px); }

  @media (prefers-reduced-motion: reduce){
    .ds-btn,.ds-modal,.ds-modal-ov,.ds-toast{ transition:none !important; }
  }`;
  var st=document.createElement('style'); st.id='ds-styles-v63'; st.textContent=css;
  (document.head||document.documentElement).appendChild(st);

  // ── helpers ───────────────────────────────────────────────────────────
  function el(tag, cls, txt){ var n=document.createElement(tag); if(cls) n.className=cls; if(txt!=null) n.textContent=txt; return n; }
  function attrs(n,o){ if(!o) return n; Object.keys(o).forEach(function(k){
    if(k==='onclick'||k==='oninput'||k==='onchange'){ n[k]=o[k]; }
    else if(k==='html'){ /* volutamente non usato: preferiamo textContent (security-rules) */ }
    else n.setAttribute(k,o[k]); }); return n; }

  // ── factory ───────────────────────────────────────────────────────────
  var DS = {
    __v63:true,
    button:function(label, opts){ opts=opts||{};
      var b=el('button','ds-btn'+(opts.variant?' ds-btn--'+opts.variant:'')+(opts.size?' ds-btn--'+opts.size:''));
      if(opts.icon){ var i=el('span',null,opts.icon); i.setAttribute('aria-hidden','true'); b.appendChild(i); }
      b.appendChild(document.createTextNode(label||''));
      if(opts.onclick) b.onclick=opts.onclick;
      if(opts.disabled) b.disabled=true;
      if(opts.title) b.title=opts.title;
      return b;
    },
    field:function(opts){ opts=opts||{};
      var f=el('div','ds-field');
      if(opts.label){ var l=el('label','ds-label',opts.label); if(opts.id) l.htmlFor=opts.id; f.appendChild(l); }
      var input;
      if(opts.type==='select'){ input=el('select','ds-select');
        (opts.options||[]).forEach(function(o){ var op=el('option',null, o.label!=null?o.label:o);
          op.value=(o.value!=null?o.value:o); input.appendChild(op); });
        if(opts.value!=null) input.value=opts.value;
      } else if(opts.type==='textarea'){ input=el('textarea','ds-textarea'); if(opts.value!=null) input.value=opts.value; }
      else { input=el('input','ds-input'); input.type=opts.type||'text'; if(opts.value!=null) input.value=opts.value; if(opts.placeholder) input.placeholder=opts.placeholder; }
      if(opts.id) input.id=opts.id;
      if(opts.oninput) input.oninput=opts.oninput;
      if(opts.onchange) input.onchange=opts.onchange;
      f.appendChild(input);
      if(opts.hint){ f.appendChild(el('div','ds-hint',opts.hint)); }
      f._input=input; return f;
    },
    badge:function(label, variant){ return el('span','ds-badge'+(variant?' ds-badge--'+variant:''), label); },
    modal:function(opts){ opts=opts||{};
      var ov=el('div','ds-modal-ov'); var m=el('div','ds-modal');
      var hd=el('div','ds-modal-hd'); hd.appendChild(el('h3',null,opts.title||''));
      var x=el('button','ds-modal-x','×'); x.setAttribute('aria-label','Chiudi'); hd.appendChild(x);
      var bd=el('div','ds-modal-bd');
      if(typeof opts.body==='string') bd.textContent=opts.body; else if(opts.body) bd.appendChild(opts.body);
      m.appendChild(hd); m.appendChild(bd);
      var api={ el:ov, body:bd, close:function(){ ov.classList.remove('ds-in');
        setTimeout(function(){ if(ov.parentNode) ov.parentNode.removeChild(ov); if(opts.onClose) opts.onClose(); },200); } };
      if(opts.footer && opts.footer.length){ var ft=el('div','ds-modal-ft');
        opts.footer.forEach(function(b){ ft.appendChild(b); }); m.appendChild(ft); }
      x.onclick=api.close;
      ov.addEventListener('click',function(e){ if(e.target===ov) api.close(); });
      document.addEventListener('keydown',function esc(e){ if(e.key==='Escape'){ api.close(); document.removeEventListener('keydown',esc);} });
      ov.appendChild(m); document.body.appendChild(ov);
      requestAnimationFrame(function(){ ov.classList.add('ds-in'); });
      return api;
    },
    toast:function(msg, kind, ms){ kind=kind||'info'; ms=ms||3200;
      var wrap=document.getElementById('ds-toast-wrap');
      if(!wrap){ wrap=el('div','ds-toast-wrap'); wrap.id='ds-toast-wrap'; document.body.appendChild(wrap); }
      var t=el('div','ds-toast ds-toast--'+kind);
      var ic={ok:'✓',err:'✕',info:'ℹ'}[kind]||'ℹ';
      var i=el('span',null,ic); i.setAttribute('aria-hidden','true'); t.appendChild(i);
      t.appendChild(el('span',null,msg));
      wrap.appendChild(t);
      requestAnimationFrame(function(){ t.classList.add('ds-in'); });
      setTimeout(function(){ t.classList.remove('ds-in'); setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); },260); }, ms);
      return t;
    },
    table:function(cols, rows){ // cols:[{key,label,render?}] rows:[obj]
      var wrap=el('div','ds-table-wrap'); var tb=el('table','ds-table');
      var thead=el('thead'); var htr=el('tr');
      cols.forEach(function(c){ htr.appendChild(el('th',null,c.label||c.key)); });
      thead.appendChild(htr); tb.appendChild(thead);
      var body=el('tbody');
      (rows||[]).forEach(function(r){ var tr=el('tr');
        cols.forEach(function(c){ var td=el('td'); var v=c.render?c.render(r):r[c.key];
          if(v instanceof Node) td.appendChild(v); else td.textContent=(v!=null?v:''); tr.appendChild(td); });
        body.appendChild(tr); });
      tb.appendChild(body); wrap.appendChild(tb); return wrap;
    },
    confirm:function(msg, opts){ opts=opts||{}; return new Promise(function(res){
      var yes=DS.button(opts.okLabel||'Conferma',{variant:'primary',onclick:function(){ api.close(); res(true); }});
      var no=DS.button(opts.cancelLabel||'Annulla',{variant:'ghost',onclick:function(){ api.close(); res(false); }});
      var api=DS.modal({ title:opts.title||'Conferma', body:msg, footer:[no,yes], onClose:function(){ res(false); } });
    }); }
  };
  window.DS = DS;
})();
