
// === /src/modules/catalog/index.js ===
// Catalog Module - INGLY OS v88
const CatalogPDF={
  _color:'#6366f1',
  _palette:['#6366f1','#dc2626','#10b981','#f59e0b','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#0f172a'],

  toggle(){
    const el=document.getElementById('catalog-pdf-panel');
    if(!el)return;
    const open=el.style.display!=='none'&&el.style.display!=='';
    el.style.display=open?'none':'block';
    if(!open){
      // v5.1: Inject full panel form if not yet present
      const inner=document.getElementById('catalog-pdf-panel-inner');
      if(inner&&!inner.querySelector('#pdf-company')){
        inner.innerHTML=`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Nome Azienda / Laboratorio</label>
            <input id="pdf-company" class="form-control" style="font-size:12px" placeholder="es. Ingly Design" oninput="CatalogPDF.livePreview()"></div>
          <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Titolo Catalogo</label>
            <input id="pdf-title" class="form-control" style="font-size:12px" value="Catalogo Prodotti" oninput="CatalogPDF.livePreview()"></div>
          <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Sottotitolo</label>
            <input id="pdf-subtitle" class="form-control" style="font-size:12px" value="Handmade · Made in Italy" oninput="CatalogPDF.livePreview()"></div>
          <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Email</label>
            <input id="pdf-email" class="form-control" style="font-size:12px" placeholder="info@mio-negozio.it" oninput="CatalogPDF.livePreview()"></div>
          <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Telefono / WhatsApp</label>
            <input id="pdf-phone" class="form-control" style="font-size:12px" placeholder="+39 333 1234567" oninput="CatalogPDF.livePreview()"></div>
          <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Filtro Categoria</label>
            <select id="pdf-cat-filter" class="form-control" style="font-size:12px">
              <option value="">Tutte le categorie</option>
            </select></div>
        </div>
        <div style="display:flex;gap:14px;margin-bottom:14px;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="pdf-show-price" checked style="accent-color:var(--primary)"> Prezzi</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="pdf-show-cost" style="accent-color:var(--primary)"> Costi</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="pdf-show-margin" style="accent-color:var(--primary)"> Margini</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="pdf-show-material" checked style="accent-color:var(--primary)"> Materiali</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="pdf-show-trend" style="accent-color:var(--primary)"> Trend Score</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="pdf-show-b2b" style="accent-color:var(--primary)"> Prezzi B2B</label>
        </div>
        <div style="display:flex;gap:10px;margin-bottom:14px;align-items:center">
          <div style="font-size:11px;color:var(--text-muted);font-weight:700">Layout:</div>
          <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer"><input type="radio" name="pdf-layout" value="grid" checked style="accent-color:var(--primary)"> 3 colonne</label>
          <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer"><input type="radio" name="pdf-layout" value="big" style="accent-color:var(--primary)"> 2 colonne grande</label>
          <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer"><input type="radio" name="pdf-layout" value="single" style="accent-color:var(--primary)"> 1 per pagina</label>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
          <div style="font-size:11px;color:var(--text-muted);font-weight:700">Colore:</div>
          <div id="pdf-color-swatches" style="display:flex;gap:6px;flex-wrap:wrap"></div>
        </div>
        <!-- Preview mini -->
        <div style="background:var(--bg-card2);border-radius:8px;padding:10px;margin-bottom:14px;font-size:11px;color:var(--text-muted)">
          <span style="font-weight:700;color:var(--text)">Anteprima copertina:</span><br>
          <span id="pdf-prev-company" style="font-size:10px;font-weight:800;color:var(--primary);letter-spacing:2px;text-transform:uppercase"></span> —
          <span id="pdf-prev-title" style="font-weight:700"></span>
          <span id="pdf-prev-subtitle" style="color:var(--text-muted)"></span>
          <span id="pdf-prev-contact" style="color:var(--text-dim)"></span>
        </div>
        <div id="pdf-stats-mini" style="margin-bottom:14px"></div>
        <button onclick="CatalogPDF.generate()" style="width:100%;padding:11px;background:linear-gradient(135deg,var(--primary),#f97316);color:#000;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:800;letter-spacing:.02em">
          🖨️ Genera e Scarica PDF
        </button>`;
        this._initSwatches();
        this._fillCatFilter();
        // Pre-fill company info from settings
        IDB.get('settings','main').then(cfg=>{
          if(!cfg) return;
          const f = (id,val)=>{ const el=document.getElementById(id); if(el&&val)el.value=val; };
          f('pdf-company', cfg.company);
          f('pdf-email', cfg.email);
          f('pdf-phone', cfg.phone);
        });
      }
      this.loadStats();this.livePreview();
    }
  },

  _initSwatches(){
    const wrap=document.getElementById('pdf-color-swatches');
    if(!wrap||wrap.children.length>1)return;
    wrap.innerHTML='';
    this._palette.forEach((c,i)=>{
      const b=document.createElement('button');
      b.type='button';b.title=c;
      b.style.cssText=`width:22px;height:22px;border-radius:50%;background:${c};border:2px solid ${i===0?'#fff':'transparent'};cursor:pointer;flex-shrink:0`;
      b.onclick=()=>this.setColor(c,b);
      wrap.appendChild(b);
    });
  },

  setColor(c,btn){
    this._color=c;
    document.querySelectorAll('#pdf-color-swatches button').forEach(b=>b.style.border='2px solid transparent');
    if(btn)btn.style.border='2px solid #fff';
    const acc=document.getElementById('pdf-prev-accent');if(acc)acc.style.background=c;
    const bg=document.getElementById('pdf-preview-bg')||document.getElementById('pdf-prev-bg');
    if(bg)bg.style.background=`linear-gradient(135deg,#0f172a 55%,${c}25)`;
  },

  async _fillCatFilter(){
    const sel=document.getElementById('pdf-cat-filter');if(!sel||sel.options.length>1)return;
    const prods=await AppStore.get('catalog').catch(()=>[]);
    const cats=[...new Set(prods.map(p=>p.category||'').filter(Boolean))].sort();
    cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);});
  },

  async _fillCatFilter(){
    const sel=document.getElementById('pdf-cat-filter');if(!sel)return;
    const prods=await AppStore.get('catalog').catch(()=>[]);
    const cats=[...new Set(prods.map(p=>p.category||'Altro'))].sort();
    sel.innerHTML='<option value="">Tutte le categorie</option>'+cats.map(c=>`<option>${c}</option>`).join('');
  },
    async loadStats(){
    const el=document.getElementById('pdf-stats-mini');
    if(!el)return;
    const prods=await AppStore.get('catalog').catch(()=>[]);
    const cats=[...new Set(prods.map(p=>p.category||'Altro'))];
    const av=prods.reduce((a,p)=>a+(+p.salePrice||0),0)/(prods.length||1);
    el.innerHTML=`<div style="display:flex;gap:10px;font-size:11px;color:var(--text-muted)">
      <span>📦 <b style="color:var(--text)">${prods.length}</b> prodotti</span>
      <span>🗂️ <b style="color:var(--text)">${cats.length}</b> categorie</span>
      <span>💶 Prezzo medio <b style="color:var(--green)">${fmtCur(av)}</b></span>
    </div>`;
  },
    livePreview(){
    const g=id=>document.getElementById(id)?.value||'';
    const d=id=>document.getElementById(id);
    if(d('pdf-prev-company'))d('pdf-prev-company').textContent=(g('pdf-company')||'Nome Azienda').toUpperCase();
    if(d('pdf-prev-title'))d('pdf-prev-title').textContent=g('pdf-title')||'Catalogo Prodotti';
    if(d('pdf-prev-subtitle'))d('pdf-prev-subtitle').textContent=g('pdf-subtitle')||'Handmade · Made in Italy';
    const contact=[g('pdf-email'),g('pdf-phone')].filter(Boolean).join(' · ');
    if(d('pdf-prev-contact'))d('pdf-prev-contact').textContent=contact;
  },
  updatePreview(){this.livePreview();},// alias

  async loadStats(){
    const el=document.getElementById('pdf-stats-box')||document.getElementById('pdf-stats-content');if(!el)return;
    const prods=await AppStore.get('catalog').catch(()=>[]);
    const cf=document.getElementById('pdf-cat-filter')?.value||'';
    const f=cf?prods.filter(p=>p.category===cf):prods;
    const cats=[...new Set(f.map(p=>p.category||'Altro'))];
    const avg=f.length?f.reduce((a,p)=>a+(+p.salePrice||0),0)/f.length:0;
    const wph=f.filter(p=>p.photo).length;
    el.innerHTML=`<div style="display:flex;flex-direction:column;gap:5px">
      <div style="display:flex;justify-content:space-between"><span>Prodotti</span><strong style="color:var(--primary)">${f.length}</strong></div>
      <div style="display:flex;justify-content:space-between"><span>Categorie</span><strong style="color:var(--primary)">${cats.length}</strong></div>
      <div style="display:flex;justify-content:space-between"><span>Prezzo medio</span><strong style="color:var(--green)">${fmtCur(avg)}</strong></div>
      <div style="display:flex;justify-content:space-between"><span>Con foto</span><strong style="color:var(--blue)">${wph}/${f.length}</strong></div>
      <div style="display:flex;justify-content:space-between"><span>Pagine stimate</span><strong style="color:var(--orange)">${1+Math.ceil(f.length/4)}</strong></div>
    </div>`;
  },

  async generate(){
    // ⚡ Open window before any await to stay within user gesture
    const w=window.open('','_blank','width=960,height=720');
    if(!w){toast('Abilita i popup per generare il catalogo PDF','warning');return;}
    w.document.write('<html><body style="background:#f8f9fa;display:flex;height:100vh;align-items:center;justify-content:center"><p style="font-family:system-ui;color:#6366f1;font-size:15px">📚 Generazione catalogo...</p></body></html>');

        const prods=await AppStore.get('catalog').catch(()=>[]);
    const cf=document.getElementById('pdf-cat-filter')?.value||'';
    const all=(cf?prods.filter(p=>p.category===cf):prods).filter(p=>p.name);
    if(!all.length){toast('Nessun prodotto da esportare','warning');return;}

    const layout=document.querySelector('input[name="pdf-layout"]:checked')?.value||'grid';
    const g=id=>document.getElementById(id)?.value?.trim()||'';
    const gc=id=>!!document.getElementById(id)?.checked;
    const company=g('pdf-company')||'Ingly Design';
    const title=g('pdf-title')||'Catalogo Prodotti';
    const subtitle=g('pdf-subtitle')||'Handmade · Made in Italy';
    const email=g('pdf-email');const phone=g('pdf-phone');
    const col=this._color;

    const showPrice=gc('pdf-show-price'),showCost=gc('pdf-show-cost'),showMargin=gc('pdf-show-margin');
    const showMat=gc('pdf-show-material'),showTrend=gc('pdf-show-trend'),showB2B=gc('pdf-show-b2b');

    const cats=[...new Set(all.map(p=>p.category||'Altro'))].sort();
    const avg=all.reduce((a,p)=>a+(+p.salePrice||0),0)/all.length||0;
    const date=new Date().toLocaleDateString('it-IT',{year:'numeric',month:'long',day:'numeric'});

    const photoBlock=(p,h=105)=>p.photo
      ?`<img src="${p.photo}" style="width:100%;height:${h}px;object-fit:cover;border-radius:8px;margin-bottom:8px;display:block">`
      :`<div style="width:100%;height:${h}px;background:${col}18;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:${h>120?44:28}px;margin-bottom:8px">${p.emoji||'🎁'}</div>`;
    const priceLine=(p,big)=>showPrice&&p.salePrice?`<div style="font-size:${big?20:15}px;font-weight:900;color:${col};margin:5px 0">€${(+p.salePrice).toFixed(2)}</div>`:'';
    const costLine=(p)=>showCost&&p.costPrice?`<div style="font-size:10px;color:#777">Costo: €${(+p.costPrice).toFixed(2)}</div>`:'';
    const mgPct=(p)=>p.salePrice&&p.costPrice?Math.round(((+p.salePrice)-(+p.costPrice))/(+p.salePrice)*100):null;
    const marginLine=(p)=>{const m=mgPct(p);return showMargin&&m!==null?`<div style="font-size:10px;color:#10b981">Margine: ${m}%</div>`:'';}
    const matLine=(p)=>showMat&&p.material?`<div style="font-size:10px;color:#888;margin-top:3px">📦 ${p.material}</div>`:'';
    const tagsLine=(p)=>showMat&&p.tags?`<div style="margin-top:4px">${(p.tags+'').split(',').slice(0,4).map(t=>`<span style="display:inline-block;padding:1px 6px;background:${col}18;color:${col};border-radius:4px;font-size:9px;margin:1px">${t.trim()}</span>`).join('')}</div>`:'';
    const trendLine=(p)=>showTrend&&p.trendScore?`<div style="font-size:9px;color:#f59e0b;margin-top:3px">🔥 ${p.trendScore}/100</div>`:'';
    const b2bLine=(p)=>showB2B&&(p.priceKit||p.priceStock)?`<div style="margin-top:5px;padding:4px 7px;background:#f8f9fa;border-radius:5px;font-size:9px;color:#555">${p.priceKit?`🏫 Kit:<b>€${(+p.priceKit).toFixed(2)}/pz</b> `:''}${p.priceStock?`🏭 Stock:<b>€${(+p.priceStock).toFixed(2)}/pz</b>`:''}</div>`:'';

    let body='';
    if(layout==='grid'){
      cats.forEach((cat,ci)=>{
        const items=all.filter(p=>(p.category||'Altro')===cat);
        const cols = items.length<=3 ? items.length : 3;
        body+=`<div style="margin-bottom:36px;${ci>0?'page-break-before:auto':''}">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:10px;border-bottom:3px solid ${col}">
            <div style="background:${col};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;flex-shrink:0">${ci+1}</div>
            <div style="font-size:15px;font-weight:900;color:#111;text-transform:uppercase;letter-spacing:.5px">${cat}</div>
            <div style="font-size:11px;color:#aaa;margin-left:auto">${items.length} prodott${items.length===1?'o':'i'}</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:14px">
          ${items.map(p=>`<div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;break-inside:avoid;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.06)">
              ${photoBlock(p, layout==='single'?280:layout==='big'?180:120)}
              <div style="padding:12px">
                <div style="font-size:13px;font-weight:700;color:#111;margin-bottom:4px;line-height:1.3">${p.name}</div>
                ${p.desc?`<div style="font-size:10px;color:#666;margin-bottom:6px;line-height:1.5">${p.desc.substring(0,120)}${p.desc.length>120?'…':''}</div>`:''}
                ${priceLine(p,false)}${costLine(p)}${marginLine(p)}${matLine(p)}${tagsLine(p)}${trendLine(p)}${b2bLine(p)}
              </div>
            </div>`).join('')}
          </div></div>`;
      });
    } else if(layout==='elegant'){
      all.forEach(p=>{
        body+=`<div style="display:flex;gap:20px;margin-bottom:26px;padding-bottom:26px;border-bottom:1px solid #e5e7eb;break-inside:avoid">
          <div style="flex-shrink:0;width:190px">${p.photo?`<img src="${p.photo}" style="width:190px;height:170px;object-fit:cover;border-radius:10px">`:`<div style="width:190px;height:170px;background:${col}18;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:52px">${p.emoji||'🎁'}</div>`}</div>
          <div style="flex:1">
            <div style="font-size:10px;color:${col};font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">${p.category||''}</div>
            <div style="font-size:19px;font-weight:900;color:#111;margin-bottom:8px">${p.name}</div>
            ${p.desc?`<div style="font-size:12px;color:#555;line-height:1.65;margin-bottom:10px">${p.desc}</div>`:''}
            ${priceLine(p,true)}${costLine(p)}${marginLine(p)}${matLine(p)}${tagsLine(p)}${trendLine(p)}${b2bLine(p)}
          </div></div>`;
      });
    } else {
      const hdrs=[showPrice,showCost,showMargin,showB2B];
      const hLabels=['Prezzo','Costo','Margine','B2B'];
      const hCols=hLabels.filter((_,i)=>hdrs[i]).map(l=>`<th style="padding:8px;text-align:right;font-size:10px">${l}</th>`).join('');
      const rows=all.map(p=>`<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:7px 6px">${p.photo?`<img src="${p.photo}" style="width:28px;height:28px;object-fit:cover;border-radius:4px;vertical-align:middle">`:`<span style="font-size:18px">${p.emoji||'🎁'}</span>`}</td>
        <td style="padding:7px 6px;font-size:11px;font-weight:600">${p.name}</td>
        <td style="padding:7px 6px;font-size:10px;color:#888">${p.category||'—'}</td>
        <td style="padding:7px 6px;font-size:10px;color:#888">${p.material||'—'}</td>
        ${showPrice?`<td style="padding:7px;font-size:13px;font-weight:800;color:${col};text-align:right">${p.salePrice?'€'+(+p.salePrice).toFixed(2):'—'}</td>`:''}
        ${showCost?`<td style="padding:7px;font-size:10px;color:#888;text-align:right">${p.costPrice?'€'+(+p.costPrice).toFixed(2):'—'}</td>`:''}
        ${showMargin?`<td style="padding:7px;font-size:10px;color:#10b981;text-align:right">${mgPct(p)!==null?mgPct(p)+'%':'—'}</td>`:''}
        ${showB2B?`<td style="padding:7px;font-size:9px;color:#6366f1">${p.priceKit?'Kit:€'+(+p.priceKit).toFixed(2):''}</td>`:''}
      </tr>`).join('');
      body=`<table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:${col};color:#fff">
          <th style="padding:8px 6px;text-align:left;font-size:10px">📷</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px">Prodotto</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px">Categoria</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px">Materiale</th>
          ${hCols}
        </tr></thead><tbody>${rows}</tbody></table>`;
    }

    const indexHtml=cats.map((cat,i)=>{
      const catItems=all.filter(p=>(p.category||'Altro')===cat);
      const n=catItems.length;
      const avgPrice=catItems.reduce((a,p)=>a+(+p.salePrice||0),0)/Math.max(n,1);
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0">
        <span style="background:${col};color:#fff;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;flex-shrink:0">${i+1}</span>
        <span style="font-size:13px;font-weight:700;color:#111;flex:1">${cat}</span>
        <span style="font-size:11px;color:#888">${n} prodott${n===1?'o':'i'}</span>
        ${showPrice&&avgPrice>0?`<span style="font-size:11px;font-weight:700;color:${col}">da €${avgPrice.toFixed(2)}</span>`:''}
      </div>`;
    }).join('');

    const contact=[email,phone].filter(Boolean).join(' · ');
    const html=`<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>${title} — ${company}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#111;background:#fff}
@page{margin:16mm 12mm;size:A4}
@media print{
  body{font-size:11px}
  #cat-toolbar,#cat-toolbar+div{display:none!important}
  .page-break{page-break-before:always}
}
img{max-width:100%;display:block}
</style>
</head><body>
<div style="min-height:100vh;background:linear-gradient(135deg,#0f172a,#1e1b4b);display:flex;flex-direction:column;padding:50px;page-break-after:always;color:#fff">
  <div style="margin-bottom:auto">
    <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${col};margin-bottom:20px">${company.toUpperCase()}</div>
    <div style="font-size:52px;font-weight:900;line-height:1;margin-bottom:14px">${title}</div>
    <div style="font-size:16px;color:#94a3b8;margin-bottom:28px">${subtitle}</div>
    <div style="width:64px;height:4px;background:${col};border-radius:2px;margin-bottom:36px"></div>
    <div style="display:flex;gap:22px">
      ${[{v:all.length,l:'Prodotti'},{v:cats.length,l:'Categorie'},{v:'€'+avg.toFixed(0),l:'Prezzo medio'}].map(x=>`<div style="background:rgba(255,255,255,.08);border-radius:12px;padding:14px 22px;text-align:center"><div style="font-size:28px;font-weight:900;color:${col}">${x.v}</div><div style="font-size:11px;color:#94a3b8;margin-top:4px">${x.l}</div></div>`).join('')}
    </div>
  </div>
  <div style="font-size:10px;color:#475569;margin-top:40px;padding-top:20px;border-top:1px solid #1e293b;display:flex;justify-content:space-between"><span>${contact}</span><span>${date}</span></div>
</div>
<div style="padding:30px 0 20px;page-break-after:always">
  <div style="font-size:22px;font-weight:900;color:${col};margin-bottom:18px;padding-bottom:8px;border-bottom:2px solid ${col}">Indice</div>
  ${indexHtml}
</div>
<div style="padding:10px 0">${body}</div>
<div style="margin-top:30px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8"><span>${company} — ${title}</span><span>${date}</span></div>

<div style="position:fixed;top:0;left:0;right:0;background:#0f172a;padding:10px 20px;display:flex;align-items:center;gap:10px;z-index:999;box-shadow:0 2px 12px #0008;print:none" id="cat-toolbar">
  <div style="font-size:14px;font-weight:800;color:#6366f1">📚 Catalogo PDF</div>
  <div style="flex:1;font-size:11px;color:#475569">Clicca sui testi per modificarli prima di stampare</div>
  <button onclick="window.close()" style="padding:7px 14px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:7px;cursor:pointer;font-size:12px">✕ Chiudi</button>
  <button onclick="document.getElementById('cat-toolbar').style.display='none';window.print();setTimeout(()=>document.getElementById('cat-toolbar').style.display='flex',1000)" style="padding:7px 18px;background:#6366f1;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:700">🖨️ Stampa / Salva PDF</button>
</div>
<div style="height:52px"></div>
<style>@media print{#cat-toolbar,#cat-toolbar+div{display:none!important}}</style>
<\/body><\/html>`;

    // w was already opened above
    // Embed product data for re-import
    const _embedData = JSON.stringify({_ingly_catalog:true,_ts:new Date().toISOString(),products:all.map(p=>({
      id:p.id,name:p.name,category:p.category||'',salePrice:+p.salePrice||+p.price||0,
      costPrice:+p.costPrice||+p.cost||0,desc:p.desc||'',material:p.material||'',
      tags:p.tags||'',emoji:p.emoji||'🎁',sku:p.sku||'',productionTime:+p.productionTime||0,
      trendScore:+p.trendScore||0,photo:p.photo||''
    }))});
    const htmlWithData = html.replace('</head>', `<!-- INGLY_DATA:${btoa(unescape(encodeURIComponent(_embedData)))} --></head>`);
    w.document.open();
    w.document.write(htmlWithData);
    w.document.close();
  },
};

// ══════════════ BRAND IDENTITY MODULE ══════════════
// ═══════════════════════════════════════════════════════════════════════
// 🏷️ CATALOG CATEGORIES — Full CRUD + Visual Manager
// ═══════════════════════════════════════════════════════════════════════
const CatalogCats = {
  _KEY: 'ingly_catalog_cats',

  // Laser artisan defaults
  _defaults: [
    { name:'Home Decor',  icon:'fas fa-home',        color:'#22c55e' },
    { name:'Wedding',     icon:'fas fa-ring',         color:'#a855f7' },
    { name:'Kids',        icon:'fas fa-child',        color:'#f97316' },
    { name:'Seasonal',    icon:'fas fa-snowflake',    color:'#3b82f6' },
    { name:'Corporate',   icon:'fas fa-building',     color:'#64748b' },
    { name:'Accessori',   icon:'fas fa-gem',          color:'#fbbf24' },
    { name:'Lauree',      icon:'fas fa-graduation-cap', color:'#8b5cf6' },
    { name:'Animali',     icon:'fas fa-paw',          color:'#f43f5e' },
    { name:'Digital',     icon:'fas fa-laptop',       color:'#06b6d4' },
  ],

  _PACKS: {
    laser: [
      {name:'Taglieri',    icon:'fas fa-utensils',   color:'#92400e'},
      {name:'Targhe',      icon:'fas fa-sign',       color:'#1d4ed8'},
      {name:'Portachiavi', icon:'fas fa-key',        color:'#b45309'},
      {name:'Specchi',     icon:'fas fa-circle',     color:'#0e7490'},
      {name:'Cornici',     icon:'fas fa-image',      color:'#7c3aed'},
    ],
    wedding: [
      {name:'Tableau',     icon:'fas fa-table',      color:'#be185d'},
      {name:'Segnaposto',  icon:'fas fa-map-pin',    color:'#b45309'},
      {name:'Fedi box',    icon:'fas fa-ring',       color:'#a16207'},
      {name:'Bomboniere',  icon:'fas fa-gift',       color:'#166534'},
    ],
    kids: [
      {name:'Fiocchi',     icon:'fas fa-baby',       color:'#db2777'},
      {name:'Puzzle',      icon:'fas fa-puzzle-piece', color:'#d97706'},
      {name:'Lettere',     icon:'fas fa-font',       color:'#0284c7'},
    ],
  },

  _ICONS: ['fas fa-box','fas fa-home','fas fa-ring','fas fa-child','fas fa-snowflake','fas fa-building','fas fa-gem','fas fa-laptop','fas fa-graduation-cap','fas fa-paw','fas fa-gift','fas fa-heart','fas fa-star','fas fa-leaf','fas fa-crown','fas fa-sun','fas fa-moon','fas fa-flower','fas fa-palette','fas fa-paint-brush','fas fa-scissors','fas fa-tools','fas fa-key','fas fa-utensils','fas fa-image','fas fa-sign','fas fa-table','fas fa-map-pin','fas fa-baby','fas fa-puzzle-piece','fas fa-font','fas fa-music','fas fa-camera','fas fa-tag','fas fa-bookmark'],

  getAll() {
    try {
      const s = localStorage.getItem(this._KEY);
      if(s) return JSON.parse(s);
    } catch(_){}
    localStorage.setItem(this._KEY, JSON.stringify(this._defaults));
    return [...this._defaults];
  },

  save(cats) {
    localStorage.setItem(this._KEY, JSON.stringify(cats));
    this.renderTabs();
    if(typeof Catalog !== 'undefined') Catalog.render();
  },

  getColorMap() {
    const map = {};
    this.getAll().forEach(c => { map[c.name] = c.color; });
    return map;
  },

  renderTabs() {
    const tabsEl = document.getElementById('catalog-tabs') || document.getElementById('catalog-cat-tabs');
    const selectEl = document.getElementById('cat-filter');
    const modalSel = document.getElementById('cat-cat');
    const cats = this.getAll();

    if(tabsEl) {
      const allAct = Catalog.catFilter==='' ? ' active' : '';
      let th = `<button class="tab-btn${allAct}" onclick="Catalog.catTab('',this)" style="display:flex;align-items:center;gap:5px">
        <i class="fas fa-th-large" style="font-size:10px;opacity:.7"></i>Tutti
        <span style="font-size:10px;opacity:.6">(${(window._catalogAllCount)||''})</span>
      </button>`;
      cats.forEach(function(cc){
        const ia = Catalog.catFilter === cc.name;
        const ac = ia ? ' active' : '';
        const as = ia ? `border-color:${cc.color};color:${cc.color};background:${cc.color}18` : '';
        const sn = cc.name.replace(/'/g,"\\'");
        th += `<button class="tab-btn${ac}" onclick="Catalog.catTab('${sn}',this)" style="${as};display:flex;align-items:center;gap:5px">
          <i class="${cc.icon}" style="color:${cc.color};font-size:10px"></i>${cc.name}
        </button>`;
      });
      // Add "Gestisci" button
      th += `<button onclick="CatalogCats.openManager()" style="padding:5px 12px;background:var(--bg-card);border:1.5px dashed var(--border2);border-radius:99px;cursor:pointer;font-size:11px;font-weight:700;color:var(--text-muted);display:flex;align-items:center;gap:5px;flex-shrink:0" title="Gestisci categorie">
        <i class="fas fa-cog" style="font-size:10px"></i> Gestisci
      </button>`;
      tabsEl.innerHTML = th;
    }

    if(selectEl) {
      const cur = selectEl.value;
      selectEl.innerHTML = `<option value="">🗂️ Tutte le categorie</option>` +
        cats.map(cc => `<option value="${cc.name}" ${cur===cc.name?'selected':''}>${cc.name}</option>`).join('');
    }

    if(modalSel) {
      const cur2 = modalSel.value;
      modalSel.innerHTML = `<option value="">— Scegli categoria —</option>` +
        cats.map(cc => `<option value="${cc.name}" ${cur2===cc.name?'selected':''}>${cc.name}</option>`).join('');
    }

    Catalog.CAT_COLOR = this.getColorMap();
  },

  // ── FULL CATEGORY MANAGER MODAL ──────────────────────────────────
  openManager() {
    document.getElementById('_catman-modal')?.remove();
    const ov = document.createElement('div');
    ov.id = '_catman-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)';
    ov.onclick = e => { if(e.target===ov) ov.remove(); };
    document.body.appendChild(ov);
    this._renderManagerContent(ov);
  },

  _renderManagerContent(ov) {
    const cats = this.getAll();
    ov.innerHTML = `
    <div style="background:var(--bg-card);border-radius:18px;width:min(680px,100%);max-height:92vh;overflow-y:auto;border:1px solid var(--border2);box-shadow:0 28px 70px rgba(0,0,0,.5)" onclick="event.stopPropagation()">

      <!-- HEADER -->
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;position:sticky;top:0;background:var(--bg-card);z-index:1;border-radius:18px 18px 0 0">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🏷️</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:900">Gestisci Categorie</div>
          <div style="font-size:11px;color:var(--text-muted)">Aggiungi, modifica, rimuovi categorie · ${cats.length} categorie attive</div>
        </div>
        <button onclick="document.getElementById('_catman-modal').remove()" style="background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--text-muted);font-size:16px;flex-shrink:0">✕</button>
      </div>

      <div style="padding:20px;display:flex;flex-direction:column;gap:16px">

        <!-- ADD NEW CATEGORY -->
        <div style="background:var(--bg-card2);border-radius:12px;padding:14px 16px;border:1px solid var(--border)">
          <div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:6px">
            <span style="font-size:16px">✨</span> Aggiungi nuova categoria
          </div>
          <div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:end">
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Nome *</label>
              <input id="newcat-name" class="form-control" placeholder="Es. Portachiavi, Cornici, Puzzle..." style="font-size:13px"
                onkeydown="if(event.key==='Enter')CatalogCats.add()">
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Colore</label>
              <input type="color" id="newcat-color" value="#6366f1" style="width:40px;height:36px;border:1px solid var(--border);border-radius:8px;cursor:pointer;padding:2px;background:var(--bg-card2)">
            </div>
            <button onclick="CatalogCats.add()" style="padding:8px 18px;background:var(--primary);color:#000;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:800;height:36px;white-space:nowrap">+ Aggiungi</button>
          </div>

          <!-- Icon picker row -->
          <div style="margin-top:10px">
            <label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:6px">Icona</label>
            <div id="icon-picker" style="display:flex;flex-wrap:wrap;gap:5px;max-height:120px;overflow-y:auto;padding:2px">
              ${this._ICONS.map(ico=>`<button onclick="CatalogCats._selectIcon('${ico}',this)" id="ico-btn-${ico.replace(/ /g,'-')}"
                style="width:32px;height:32px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg-card);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s"
                title="${ico}" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor=this._sel?'var(--primary)':'var(--border)'">
                <i class="${ico}" style="font-size:13px;color:var(--text-muted)"></i>
              </button>`).join('')}
            </div>
            <input type="hidden" id="newcat-icon" value="fas fa-box">
          </div>
        </div>

        <!-- PRESET PACKS -->
        <div>
          <div style="font-size:12px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">📦 Pack predefiniti</div>
          <div style="display:flex;gap:7px;flex-wrap:wrap">
            ${Object.entries(this._PACKS).map(([pkey,packs])=>`
            <button onclick="CatalogCats._addPack('${pkey}')" style="padding:6px 14px;background:var(--bg-card2);border:1px solid var(--border2);border-radius:99px;cursor:pointer;font-size:11px;font-weight:700;color:var(--text-muted)">
              ${{laser:'⚡ Pack Laser',wedding:'💍 Pack Matrimoni',kids:'🧸 Pack Bambini'}[pkey]}
            </button>`).join('')}
          </div>
        </div>

        <!-- EXISTING CATEGORIES -->
        <div>
          <div style="font-size:12px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">🏷️ Categorie attive (${cats.length})</div>
          <div id="catman-list" style="display:flex;flex-direction:column;gap:7px">
            ${cats.map((cc,i)=>`
            <div id="catrow-${i}" style="display:flex;align-items:center;gap:10px;padding:11px 13px;background:var(--bg-card2);border-radius:10px;border:1.5px solid var(--border);transition:.15s"
              onmouseover="this.style.borderColor='${cc.color}50'" onmouseout="this.style.borderColor='var(--border)'">
              <!-- Color + icon preview -->
              <div style="width:36px;height:36px;border-radius:9px;background:${cc.color}22;border:2px solid ${cc.color};display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer" onclick="CatalogCats._startEdit(${i})">
                <i class="${cc.icon}" style="color:${cc.color};font-size:14px"></i>
              </div>
              <!-- Name display/edit -->
              <span id="catname-display-${i}" style="flex:1;font-weight:700;font-size:13px;color:var(--text)">${cc.name}</span>
              <input id="catname-edit-${i}" class="form-control" value="${cc.name}" style="flex:1;display:none;font-size:13px;height:32px">
              <!-- Color edit -->
              <input type="color" id="catcolor-edit-${i}" value="${cc.color}" style="width:36px;height:32px;border:1px solid var(--border);border-radius:7px;cursor:pointer;padding:2px;display:none;background:transparent">
              <!-- Icon edit -->
              <select id="caticon-edit-${i}" style="display:none;padding:5px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;font-size:11px;height:32px">
                ${this._ICONS.map(ico=>`<option value="${ico}" ${cc.icon===ico?'selected':''}>${ico.replace('fas fa-','').replace(/-/g,' ')}</option>`).join('')}
              </select>
              <!-- Action buttons -->
              <div id="view-btns-${i}" style="display:flex;gap:5px">
                <button onclick="CatalogCats._startEdit(${i})" style="padding:5px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted)" title="Modifica">✏️</button>
                <button onclick="CatalogCats.remove(${i})" style="padding:5px 10px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:7px;cursor:pointer;font-size:11px;color:#ef4444" title="Elimina">🗑</button>
              </div>
              <div id="edit-btns-${i}" style="display:none;gap:5px">
                <button onclick="CatalogCats._saveEdit(${i})" style="padding:5px 12px;background:#22c55e;border:none;border-radius:7px;color:#fff;cursor:pointer;font-size:11px;font-weight:700">✓ Salva</button>
                <button onclick="CatalogCats._cancelEdit(${i})" style="padding:5px 9px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted)">✕</button>
              </div>
            </div>`).join('')}
          </div>
        </div>

        <!-- Footer note -->
        <div style="background:#f59e0b0d;border:1px solid #f59e0b20;border-radius:10px;padding:10px 14px;font-size:11px;color:#f59e0b">
          <i class="fas fa-info-circle" style="margin-right:5px"></i>
          I prodotti già assegnati a una categoria mantengono la loro categoria originale. Dopo aver rinominato, riassegna manualmente i prodotti se necessario.
        </div>
      </div>
    </div>`;

    // Init icon picker — highlight selected
    const curIcon = document.getElementById('newcat-icon')?.value || 'fas fa-box';
    this._selectIcon(curIcon, document.querySelector(`#ico-btn-${curIcon.replace(/ /g,'-')}`));
  },

  _selectIcon(icon, btn){
    document.getElementById('newcat-icon').value = icon;
    document.querySelectorAll('#icon-picker button').forEach(b=>{
      b.style.background = 'var(--bg-card)';
      b.style.borderColor = 'var(--border)';
      b._sel = false;
      b.querySelector('i').style.color = 'var(--text-muted)';
    });
    if(btn){
      btn.style.background = 'var(--primary-dim)';
      btn.style.borderColor = 'var(--primary)';
      btn._sel = true;
      btn.querySelector('i').style.color = 'var(--primary)';
    }
  },

  _startEdit(i) {
    const dn = document.getElementById(`catname-display-${i}`);
    const en = document.getElementById(`catname-edit-${i}`);
    const ec = document.getElementById(`catcolor-edit-${i}`);
    const ei = document.getElementById(`caticon-edit-${i}`);
    const vb = document.getElementById(`view-btns-${i}`);
    const eb = document.getElementById(`edit-btns-${i}`);
    if(dn) dn.style.display='none';
    if(en){ en.style.display='block'; en.focus(); }
    if(ec) ec.style.display='block';
    if(ei) ei.style.display='block';
    if(vb) vb.style.display='none';
    if(eb) eb.style.display='flex';
  },

  _cancelEdit(i) {
    const cats = this.getAll();
    const en = document.getElementById(`catname-edit-${i}`);
    if(en) en.value = cats[i]?.name||'';
    ['catname-display','catname-edit','catcolor-edit','caticon-edit'].forEach((pfx,j)=>{
      const el = document.getElementById(`${pfx}-${i}`);
      if(el) el.style.display = j===0?'block':'none';
    });
    const vb=document.getElementById(`view-btns-${i}`),eb=document.getElementById(`edit-btns-${i}`);
    if(vb)vb.style.display='flex';if(eb)eb.style.display='none';
  },

  _saveEdit(i) {
    const newName = (document.getElementById(`catname-edit-${i}`)?.value||'').trim();
    const newColor = document.getElementById(`catcolor-edit-${i}`)?.value || '#6366f1';
    const newIcon = document.getElementById(`caticon-edit-${i}`)?.value || 'fas fa-box';
    if(!newName){ if(typeof toast!=='undefined') toast('Il nome non può essere vuoto','warning'); return; }
    const cats = this.getAll();
    const oldName = cats[i].name;
    cats[i].name = newName;
    cats[i].color = newColor;
    cats[i].icon = newIcon;
    this.save(cats);
    const ov = document.getElementById('_catman-modal');
    if(ov) this._renderManagerContent(ov);
    if(typeof toast!=='undefined') toast(`✅ Categoria aggiornata: ${newName}`,'success');
  },

  async remove(i) {
    const cats = this.getAll();
    const name = cats[i].name;
    if(!await askConfirm(`Eliminare la categoria "${name}"? I prodotti non vengono eliminati.`)) return;
    cats.splice(i,1);
    this.save(cats);
    if(typeof Catalog!=='undefined'&&Catalog.catFilter===name) Catalog.catFilter='';
    const ov=document.getElementById('_catman-modal');
    if(ov) this._renderManagerContent(ov);
    if(typeof toast!=='undefined') toast(`🗑 Categoria "${name}" eliminata`,'success');
  },

  add() {
    const name = (document.getElementById('newcat-name')?.value||'').trim();
    const icon = document.getElementById('newcat-icon')?.value || 'fas fa-box';
    const color = document.getElementById('newcat-color')?.value || '#6366f1';
    if(!name){ if(typeof toast!=='undefined') toast('Inserisci il nome','warning'); return; }
    const cats = this.getAll();
    if(cats.find(cc=>cc.name.toLowerCase()===name.toLowerCase())){
      if(typeof toast!=='undefined') toast('Categoria già esistente','warning'); return;
    }
    cats.push({name,icon,color});
    this.save(cats);
    const ni = document.getElementById('newcat-name');
    if(ni) ni.value='';
    const ov=document.getElementById('_catman-modal');
    if(ov) this._renderManagerContent(ov);
    if(typeof toast!=='undefined') toast(`✅ Categoria "${name}" aggiunta!`,'success');
  },

  _addPack(packKey){
    const pack = this._PACKS[packKey];
    if(!pack) return;
    const cats = this.getAll();
    const existNames = new Set(cats.map(c=>c.name.toLowerCase()));
    let added=0;
    pack.forEach(p=>{
      if(!existNames.has(p.name.toLowerCase())){cats.push(p);added++;}
    });
    this.save(cats);
    const ov=document.getElementById('_catman-modal');
    if(ov) this._renderManagerContent(ov);
    if(typeof toast!=='undefined') toast(`✅ ${added} categorie aggiunte dal pack!`,'success');
  },

  renderManager(){ /* legacy no-op */ },
  closeManager(){
    document.getElementById('_catman-modal')?.remove();
  },
};
window.CatalogCats = CatalogCats;
;

const Catalog={
  editId:null,catFilter:'',_photo:null,_sort:'',_search:'',_view:'grid',_onlyIngly:false,
  get CAT_COLOR(){ return CatalogCats.getColorMap(); },
  set CAT_COLOR(v){},
  catTab(v,btn){
    this.catFilter=v;
    CatalogCats.renderTabs();
    this.render();
  },
  filterCat(v){
    this.catFilter=v;
    CatalogCats.renderTabs();
    this.render();
  },
  async quickAddToQuote(id) {
    const p = await IDB.get('catalog', id).catch(()=>null);
    if (!p) return toast('Prodotto non trovato','warning');
    App.navigate('quoter');
    await new Promise(r=>setTimeout(r,200));
    if (typeof Quoter !== 'undefined' && Quoter.addFromCatalog) {
      Quoter.addFromCatalog(p);
    } else if (typeof Quoter !== 'undefined') {
      const line = {desc:p.name||'',name:p.name||'',qty:1,unit:p.unit||'pz',price:p.salePrice||0,cost:p.costPrice||0,vatRate:0.22,catalogId:p.id};
      if (Quoter.lines) { Quoter.lines.push(line); if(Quoter.renderLines) Quoter.renderLines(); if(Quoter.recalcRight) Quoter.recalcRight(); }
    }
    toast(`✅ "${(p.name||'').slice(0,25)}" aggiunto al preventivo`,'📋');
  },

  // Fase F — aggiunge al preventivo il prodotto + i suoi upsell (risolti per SKU dalla Scheda Ingly)
  async addBundleToQuote(id){
    const p = await IDB.get('catalog', id).catch(()=>null);
    if(!p) return toast('Prodotto non trovato','warning');
    const all = await AppStore.get('catalog').catch(()=>[]);
    const bySku = {};
    all.forEach(x=>{ if(x.sku) bySku[String(x.sku).toUpperCase()] = x; });
    const skus = String((p.ingly&&p.ingly.upsell)||'').match(/ING-[A-Z0-9-]+/gi) || [];
    const seen = new Set([String(p.id)]);
    const extras = [];
    skus.forEach(s=>{ const m = bySku[s.toUpperCase()]; if(m && !seen.has(String(m.id))){ seen.add(String(m.id)); extras.push(m); } });
    const toAdd = [p, ...extras];
    if(typeof closeModal!=='undefined') closeModal('catalog');
    App.navigate('quoter');
    await new Promise(r=>setTimeout(r,250));
    let n=0;
    for(const prod of toAdd){
      if(typeof Quoter!=='undefined' && Quoter.addFromCatalog){ Quoter.addFromCatalog(prod); n++; }
      else if(typeof Quoter!=='undefined' && Quoter.lines){
        Quoter.lines.push({desc:prod.name||'',name:prod.name||'',qty:1,unit:prod.unit||'pz',price:prod.salePrice||0,cost:prod.costPrice||0,vatRate:0.22,catalogId:prod.id}); n++;
      }
    }
    if(typeof Quoter!=='undefined'){ if(Quoter.renderLines)Quoter.renderLines(); if(Quoter.recalcRight)Quoter.recalcRight(); }
    const miss = skus.length - extras.length;
    toast('✅ Bundle nel preventivo: '+n+' voci'+(extras.length?(' (prodotto + '+extras.length+' upsell)'):'')+(miss>0?(' · '+miss+' upsell non in catalogo'):''),'success',5500);
  },

  search(v){this._search=v.toLowerCase();this.render();},
  sortBy(v){this._sort=v;this.render();},
  setView(v){
    this._view=v;
    eid('btn-view-grid')?.classList.toggle('btn-primary',v==='grid');
    eid('btn-view-grid')?.classList.toggle('btn-secondary',v!=='grid');
    eid('btn-view-list')?.classList.toggle('btn-primary',v==='list');
    eid('btn-view-list')?.classList.toggle('btn-secondary',v!=='list');
    this.render();
  },
  // ── v3.7: Category pill tabs ────────────────────────────────────────────
  async _renderCatTabs() {
    const el = document.getElementById('catalog-cat-tabs');
    if (!el) return;
    const items = await AppStore.get('catalog').catch(()=>[]);
    const cats = [...new Set(items.map(i=>i.category||'Altro'))].sort();
    const active = this.catFilter || '';
    el.innerHTML = [
      `<button onclick="Catalog.filterCat('')"
        style="padding:5px 14px;border-radius:99px;border:1.5px solid ${!active?'var(--primary)':'var(--border)'};background:${!active?'var(--primary)':'transparent'};color:${!active?'#000':'var(--text-muted)'};font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:.15s">
        Tutti <span style="font-size:10px;opacity:.7">(${items.length})</span>
      </button>`,
      ...cats.map(cat => {
        const col = this.CAT_COLOR[cat]||'#6366f1';
        const count = items.filter(i=>i.category===cat).length;
        const on = active===cat;
        return `<button onclick="Catalog.filterCat('${cat}')"
          style="padding:5px 14px;border-radius:99px;border:1.5px solid ${on?col:col+'40'};background:${on?col+'25':'transparent'};color:${on?col:'var(--text-muted)'};font-size:11px;font-weight:${on?'800':'600'};cursor:pointer;white-space:nowrap;flex-shrink:0;transition:.15s">
          ${cat} <span style="font-size:10px;opacity:.7">(${count})</span>
        </button>`;
      })
    ].join('');
  },

  // ── v3.7: Stats bar ──────────────────────────────────────────────────────
  _renderStats(items) {
    const el = document.getElementById('catalog-stats');
    if (!el) return;
    const badge = document.getElementById('catalog-count-badge');
    if (badge) badge.textContent = items.length + ' prodotti';

    const withCost = items.filter(i=>i.costPrice>0&&i.salePrice>0);
    const margins  = withCost.map(i=>Math.round((i.salePrice-i.costPrice)/i.salePrice*100));
    const avgMargin = margins.length ? Math.round(margins.reduce((a,v)=>a+v,0)/margins.length) : 0;
    const avgPrice  = items.length ? Math.round(items.reduce((a,i)=>a+(i.salePrice||0),0)/items.length) : 0;
    const topTrend  = items.filter(i=>i.trendScore>=90).length;
    const withPhoto = items.filter(i=>i.photo).length;
    const cats      = new Set(items.map(i=>i.category||'?')).size;
    const totalListino = items.reduce((a,i)=>a+(i.salePrice||0),0);
    // Margin breakdown
    const mgHigh = margins.filter(m=>m>50).length;
    const mgMid  = margins.filter(m=>m>30&&m<=50).length;
    const mgLow  = margins.filter(m=>m<=30).length;
    // Price suggestions (below 20% margin = flag)
    const underpriced = withCost.filter(i=>(i.salePrice-i.costPrice)/i.salePrice*100 < 20);
    // Copertura foto sui prodotti del catalogo ufficiale Ingly
    const inglyItems = items.filter(i=>i.ingly);
    const inglyPhoto = inglyItems.filter(i=>i.photo).length;
    const inglyCov   = inglyItems.length ? Math.round(inglyPhoto/inglyItems.length*100) : 0;

    const _tiles = [
      {ico:'fa-box',      l:'Prodotti',        v:items.length,              c:'#a78bfa', bg:'#8b5cf615'},
      {ico:'fa-tags',     l:'Categorie',        v:cats,                      c:'#60a5fa', bg:'#3b82f615'},
      {ico:'fa-euro-sign',l:'Listino totale',   v:'€'+Math.round(totalListino), c:'#34d399', bg:'#10b98115'},
      {ico:'fa-chart-bar',l:'Margine medio',    v:avgMargin+'%',             c:avgMargin>50?'#22c55e':avgMargin>30?'#f97316':'#ef4444', bg:'#22c55e15'},
      {ico:'fa-fire',     l:'Top Trend',        v:topTrend+' prodotti',      c:'#fb923c', bg:'#f9731615'},
      {ico:'fa-image',    l:'Con Foto',         v:withPhoto+'/'+items.length, c:'#38bdf8', bg:'#0ea5e915'},
    ];
    if(inglyItems.length) _tiles.push({ico:'fa-industry', l:'Foto Ingly', v:inglyPhoto+'/'+inglyItems.length+' · '+inglyCov+'%', c: inglyCov>=80?'#22c55e':inglyCov>=40?'#f59e0b':'#ef4444', bg:'#fbbf2415'});
    el.innerHTML = _tiles.map(k=>`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:12px;display:flex;align-items:center;gap:10px">
      <div style="width:30px;height:30px;background:${k.bg};border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas ${k.ico}" style="font-size:12px;color:${k.c}"></i>
      </div>
      <div>
        <div style="font-size:16px;font-weight:800;color:${k.c};line-height:1.1">${k.v}</div>
        <div style="font-size:10px;color:var(--text-muted)">${k.l}</div>
      </div>
    </div>`).join('');

    // ► Margin heatmap bar
    const mhEl = document.getElementById('catalog-margin-health');
    if(mhEl && margins.length) {
      const tot = margins.length;
      const w1=Math.round(mgHigh/tot*100), w2=Math.round(mgMid/tot*100), w3=100-w1-w2;
      mhEl.style.display='block';
      mhEl.innerHTML=`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">📊 Salute Margini</div>
        ${underpriced.length?`<div style="font-size:10px;font-weight:700;padding:2px 9px;background:rgba(239,68,68,.12);color:#ef4444;border-radius:99px">⚠️ ${underpriced.length} prodotti sottopagati</div>`:'<div style="font-size:10px;font-weight:700;padding:2px 9px;background:rgba(34,197,94,.12);color:#22c55e;border-radius:99px">✅ Margini sani</div>'}
      </div>
      <div style="height:10px;border-radius:99px;overflow:hidden;display:flex;gap:2px">
        ${w1>0?`<div style="flex:${w1};background:#22c55e;border-radius:99px 0 0 99px" title="Alto (>50%): ${mgHigh}"></div>`:''}
        ${w2>0?`<div style="flex:${w2};background:#f59e0b" title="Medio (30-50%): ${mgMid}"></div>`:''}
        ${w3>0?`<div style="flex:${w3};background:#ef4444;border-radius:${w2===0&&w1===0?'99px':'0 99px 99px 0'}" title="Basso (<30%): ${mgLow}"></div>`:''}
      </div>
      <div style="display:flex;gap:12px;margin-top:6px;font-size:10px">
        <span style="color:#22c55e">🟢 Alto (>50%) ${mgHigh} prod.</span>
        <span style="color:#f59e0b">🟡 Medio (30-50%) ${mgMid} prod.</span>
        <span style="color:#ef4444">🔴 Basso (<30%) ${mgLow} prod.</span>
      </div>
      ${underpriced.length?`
      <details style="margin-top:10px">
        <summary style="font-size:11px;color:#ef4444;cursor:pointer;font-weight:700">🔧 ${underpriced.length} prodotti con margine <20% — clicca per vedere</summary>
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:5px">
          ${underpriced.slice(0,5).map(p=>{
            const mg=Math.round((p.salePrice-p.costPrice)/p.salePrice*100);
            const suggested=Math.round(p.costPrice/(1-0.45));
            return `<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:rgba(239,68,68,.06);border-radius:8px;border:1px solid rgba(239,68,68,.15)">
              <div style="flex:1;font-size:12px;font-weight:600">${p.name}</div>
              <div style="font-size:11px;color:#ef4444;font-weight:700">${mg}% mg</div>
              <div style="font-size:11px;color:var(--text-muted)">€${p.salePrice} → <strong style="color:#22c55e">€${suggested}</strong> (+45%mg)</div>
            </div>`;
          }).join('')}
          ${underpriced.length>5?`<div style="font-size:11px;color:var(--text-muted);text-align:center">... e altri ${underpriced.length-5}</div>`:''}
        </div>
      </details>`:''}
      `;
    } else if(mhEl) {
      mhEl.style.display = items.length ? 'block' : 'none';
      if(items.length) mhEl.innerHTML='<div style="font-size:11px;color:var(--text-muted)">Aggiungi prezzi di costo per vedere l\'analisi margini</div>';
    }
  },


  async importFromPDF() {
    // Open file picker for .html (PDF saved as HTML) or .pdf text
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.html,.htm,.pdf,.txt';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return resolve(null);
        const text = await file.text().catch(()=>'');

        // Method 1: Find embedded INGLY_DATA comment
        const match = text.match(/<!-- INGLY_DATA:([A-Za-z0-9+/=]+) -->/);
        if (match) {
          try {
            const json = decodeURIComponent(escape(atob(match[1])));
            const data = JSON.parse(json);
            if (data._ingly_catalog && Array.isArray(data.products)) {
              const prods = data.products;
              // Show selection preview
              this._showPDFImportPreview(prods, file.name);
              return resolve(prods);
            }
          } catch(e) { console.warn('[importFromPDF] parse error', e); }
        }

        // Method 2: Try to parse as CSV/TSV (if user exported CSV)
        if (text.includes(',') || text.includes(';')) {
          toast('File PDF non contiene dati reimportabili. Usa un PDF generato da Ingly.','warning',5000);
        } else {
          toast('Formato non riconosciuto. Esporta il catalogo con "PDF" da Ingly per reimportarlo.','warning',5000);
        }
        resolve(null);
      };
      input.click();
    });
  },

  _showPDFImportPreview(prods, filename) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9700;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(8px)';
    ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });

    ov.innerHTML = `<div style="background:var(--bg-card);border-radius:20px;width:100%;max-width:600px;max-height:88vh;display:flex;flex-direction:column;border:1px solid var(--border2);box-shadow:0 32px 80px rgba(0,0,0,.8);overflow:hidden">

      <div style="padding:22px 24px 16px;border-bottom:1px solid var(--border);flex-shrink:0">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;border-radius:12px;background:#6366f120;border:1px solid #6366f140;display:flex;align-items:center;justify-content:center;font-size:22px">📄</div>
          <div>
            <div style="font-size:17px;font-weight:800;color:var(--text)">Importa da PDF Ingly</div>
            <div style="font-size:12px;color:var(--text-muted)">${filename} · ${prods.length} prodotti rilevati</div>
          </div>
          <button onclick="this.closest('[style*=fixed]').remove()" style="margin-left:auto;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);padding:6px 12px;cursor:pointer">✕</button>
        </div>
      </div>

      <!-- Product list -->
      <div style="flex:1;overflow-y:auto;padding:12px 16px;min-height:0">
        ${prods.slice(0,50).map((p,i)=>`
          <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;margin-bottom:4px;background:var(--bg-card2);border:1px solid var(--border)">
            <input type="checkbox" class="pdf-import-cb" data-idx="${i}" checked style="width:16px;height:16px;accent-color:var(--primary);flex-shrink:0">
            <div style="width:32px;height:32px;border-radius:6px;background:var(--bg-card3);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${p.photo?`<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`:p.emoji||'🎁'}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:700;color:var(--text)">${p.name||'—'}</div>
              <div style="font-size:11px;color:var(--text-muted)">${p.category||'—'} · ${p.salePrice?'€'+p.salePrice:''}</div>
            </div>
          </label>`).join('')}
        ${prods.length>50?`<div style="text-align:center;padding:8px;font-size:11px;color:var(--text-muted)">... e altri ${prods.length-50} prodotti (tutti selezionati)</div>`:''}
      </div>

      <div style="padding:14px 24px;border-top:1px solid var(--border);display:flex;gap:10px;align-items:center;flex-shrink:0">
        <span id="pdf-import-count" style="font-size:13px;color:var(--text-muted);flex:1">${prods.length} selezionati</span>
        <button onclick="this.closest('[style*=fixed]').remove()" style="padding:10px 18px;background:var(--bg-card3);color:var(--text-muted);border:1px solid var(--border);border-radius:9px;cursor:pointer">Annulla</button>
        <button id="pdf-import-confirm" style="padding:10px 22px;background:var(--primary);color:#0a0a0a;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">📥 Importa selezionati</button>
      </div>
    </div>`;

    document.body.appendChild(ov);

    // Update counter
    ov.querySelectorAll('.pdf-import-cb').forEach(cb=>cb.addEventListener('change',()=>{
      const n=ov.querySelectorAll('.pdf-import-cb:checked').length;
      const lbl=ov.querySelector('#pdf-import-count');
      if(lbl)lbl.textContent=n+' selezionati';
    }));

    // Confirm import
    ov.querySelector('#pdf-import-confirm').onclick = async () => {
      const selected = [];
      ov.querySelectorAll('.pdf-import-cb:checked').forEach(cb=>{
        const idx=+cb.dataset.idx;
        if(idx < prods.length) selected.push(prods[idx]);
      });
      // Also include items beyond the shown 50
      if(prods.length > 50) prods.slice(50).forEach(p=>selected.push(p));

      if(!selected.length){ toast('Nessun prodotto selezionato','warning'); return; }
      ov.remove();
      toast('Importazione in corso...','info',2500);
      let n=0;
      const existing = await AppStore.get('catalog').catch(()=>[]);
      for(const p of selected){
        if(existing.some(e=>(e.name||'').toLowerCase()===(p.name||'').toLowerCase())) continue;
        await IDB.put('catalog',{
          id:Date.now()+n,name:p.name,category:p.category||'',
          salePrice:+p.salePrice||0,costPrice:+p.costPrice||0,
          price:+p.salePrice||0,cost:+p.costPrice||0,
          desc:p.desc||'',material:p.material||'',tags:p.tags||'',
          emoji:p.emoji||'🎁',sku:p.sku||'',productionTime:+p.productionTime||0,
          trendScore:+p.trendScore||0,photo:p.photo||''
        });
        n++;
      }
      AppStore.invalidate('catalog');
      await this.render();
      toast('✅ '+n+' prodotti importati dal PDF','success',5000);
    };
  },

  showImportModal() {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9700;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(8px)';
    ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
    ov.innerHTML = `<div style="background:var(--bg-card);border-radius:20px;width:100%;max-width:520px;border:1px solid var(--border2);box-shadow:0 32px 80px rgba(0,0,0,.8);overflow:hidden">

      <div style="padding:22px 24px 16px;border-bottom:1px solid var(--border)">
        <div style="font-size:17px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:12px">
          <div style="width:42px;height:42px;border-radius:12px;background:#22c55e20;border:1px solid #22c55e40;display:flex;align-items:center;justify-content:center;font-size:20px">📥</div>
          Importa Catalogo
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px;margin-left:54px">Supporta Excel (.xlsx/.xls), CSV e ODS</div>
      </div>

      <div style="padding:20px 24px">
        <!-- Catalogo Ingly (seed 128 prodotti) -->
        <div style="background:linear-gradient(135deg,var(--primary-dim),transparent);border-radius:12px;padding:16px;margin-bottom:12px;border:1px solid var(--primary-border)">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
            <span style="font-size:24px">🏭</span>
            <div>
              <div style="font-weight:800;color:var(--text);font-size:14px">Catalogo Ingly <span style="font-size:10px;background:var(--primary-dim);color:var(--primary);padding:2px 7px;border-radius:99px;font-weight:700">128 PRODOTTI</span></div>
              <div style="font-size:11px;color:var(--text-muted)">Carica il catalogo ufficiale Ingly — Sicily, Event, B2B, Home — con prezzi, materiali, SEO e prompt di produzione</div>
            </div>
          </div>
          <button onclick="this.closest('[style*=fixed]').remove();Catalog.importSeedIngly()"
            style="width:100%;padding:10px;background:var(--primary);color:#0a0a0a;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">
            🏭 Importa i 128 prodotti Ingly
          </button>
        </div>
        <!-- Excel / ODS -->
        <div style="background:var(--bg-card2);border-radius:12px;padding:16px;margin-bottom:12px;border:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
            <span style="font-size:24px">📊</span>
            <div>
              <div style="font-weight:800;color:var(--text);font-size:14px">Excel / ODS</div>
              <div style="font-size:11px;color:var(--text-muted)">Colonne auto-rilevate: Nome, Prezzo, Costo, Categoria, SKU, Descrizione</div>
            </div>
          </div>
          <button onclick="this.closest('[style*=fixed]').remove();Catalog.importExcel()"
            style="width:100%;padding:10px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">
            📂 Scegli file Excel / ODS
          </button>
        </div>

        <!-- PDF Ingly (reimport) -->
        <div style="background:var(--bg-card2);border-radius:12px;padding:16px;margin-bottom:12px;border:1px solid #6366f140">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
            <span style="font-size:24px">📄</span>
            <div>
              <div style="font-weight:800;color:var(--text);font-size:14px">PDF Ingly <span style="font-size:10px;background:#6366f120;color:#a5b4fc;padding:2px 7px;border-radius:99px;font-weight:700">NUOVO</span></div>
              <div style="font-size:11px;color:var(--text-muted)">Reimporta da un catalogo PDF generato con Ingly — recupera tutti i prodotti con foto e prezzi</div>
            </div>
          </div>
          <button onclick="this.closest('[style*=fixed]').remove();Catalog.importFromPDF()"
            style="width:100%;padding:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">
            📂 Scegli file PDF Ingly
          </button>
        </div>

        <!-- CSV -->
        <div style="background:var(--bg-card2);border-radius:12px;padding:16px;border:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
            <span style="font-size:24px">📄</span>
            <div>
              <div style="font-weight:800;color:var(--text);font-size:14px">CSV</div>
              <div style="font-size:11px;color:var(--text-muted)">Prima riga = intestazioni. Separatore virgola o punto e virgola</div>
            </div>
          </div>
          <button onclick="this.closest('[style*=fixed]').remove();CatalogImportExport.importCSV()"
            style="width:100%;padding:10px;background:var(--bg-card3);color:var(--text);border:1px solid var(--border2);border-radius:9px;cursor:pointer;font-size:13px;font-weight:700">
            📂 Scegli file CSV
          </button>
        </div>

        <!-- Tip -->
        <div style="margin-top:12px;padding:10px 14px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:8px;font-size:11px;color:var(--text-muted)">
          💡 <strong>Suggerimento:</strong> Esporta prima con <em>Export Excel</em> per vedere il formato corretto, poi modifica e reimporta.
        </div>
      </div>
    </div>`;
    document.body.appendChild(ov);
  },

  // Fase A — importa il catalogo ufficiale Ingly (seed embedded, 128 prodotti)
  async importSeedIngly() {
    const seed = window.INGLY_CATALOG_SEED;
    if(!seed || !Array.isArray(seed.prodotti)){ toast('Seed catalogo non disponibile','error',5000); return; }
    const CAT_LABEL = { SICILY:'Sicily', EVENT:'Eventi', B2B:'B2B', HOME:'Casa' };
    const CAT_EMOJI = { SICILY:'🌋', EVENT:'🎉', B2B:'🏢', HOME:'🏠' };
    toast('Importazione catalogo Ingly...','info',2500);
    let n=0, skip=0;
    const existing = await AppStore.get('catalog').catch(()=>[]);
    const seen = new Set(existing.map(e=>(e.sku||'').toUpperCase()).filter(Boolean));
    for(let i=0;i<seed.prodotti.length;i++){
      const p = seed.prodotti[i];
      const sku = (p.sku||'').toUpperCase();
      if(sku && seen.has(sku)){ skip++; continue; }
      const prezzo = +p.prezzo_standard || 0;
      const costo = +p.costo || 0;
      const tmatch = /([\d.,]+)/.exec(p.tempo||'');
      const prodTime = tmatch ? Math.round(parseFloat(tmatch[1].replace(',','.'))) : 0;
      await IDB.put('catalog',{
        id: Date.now()+i,
        name: p.nome || p.sku,
        category: CAT_LABEL[p.categoria] || p.categoria || '',
        salePrice: prezzo, costPrice: costo, price: prezzo, cost: costo,
        margin: prezzo>0 ? Math.round((prezzo-costo)/prezzo*100) : 0,
        desc: (p.descrizione||[]).join('\n'),
        material: p.materiali || '',
        tags: (p.tags||[]).join(', '),
        emoji: CAT_EMOJI[p.categoria] || '🎁',
        sku: p.sku || '',
        productionTime: prodTime,
        trendScore: +p.score || 0,
        active: true,
        photo: '',
        ingly: {
          sottotitolo: p.sottotitolo, priorita: p.priorita,
          dimensioni: p.dimensioni, tecnologia: p.tecnologia,
          piattaforma: p.piattaforma, componenti: p.componenti, packaging: p.packaging,
          prezzoEntry: p.prezzo_entry, prezzoPremium: p.prezzo_premium, prezzoB2B: p.prezzo_b2b,
          margine: p.margine, posizionamento: p.posizionamento,
          personalizzazione: p.personalizzazione, upsell: p.upsell, bundle: p.bundle,
          seo: p.seo, keywords: p.keywords,
          promptProduzione: p.prompt_produzione, promptImmagine: p.prompt_immagine
        }
      }).catch(()=>{});
      n++;
    }
    AppStore.invalidate('catalog');
    await this.render();
    toast('✅ '+n+' prodotti Ingly importati'+(skip?(' · '+skip+' già presenti'):''),'success',5000);
  },

  // Fase C — esporta i prompt immagine (+ produzione) per generarli con un tool esterno
  async exportImagePrompts(){
    const items = await AppStore.get('catalog').catch(()=>[]);
    const rows = items
      .map(p=>({
        sku: p.sku||'',
        nome: p.name||'',
        categoria: p.category||'',
        prompt_immagine: (p.ingly&&p.ingly.promptImmagine)||'',
        prompt_produzione: (p.ingly&&p.ingly.promptProduzione)||'',
        materiali: p.material||'',
        dimensioni: (p.ingly&&p.ingly.dimensioni)||'',
      }))
      .filter(r=>r.prompt_immagine);
    if(!rows.length){ toast('Nessun prompt immagine trovato. Importa prima i prodotti Ingly.','warning',5000); return; }
    const stamp = new Date().toISOString().slice(0,10);
    const doJSON = () => {
      const blob = new Blob([JSON.stringify({_app:'INGLY OS',_type:'image-prompts',_exported:new Date().toISOString(),_count:rows.length,prompts:rows},null,2)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='prompt_immagini_ingly_'+stamp+'.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),4e4);
      toast('✅ '+rows.length+' prompt esportati (JSON)','success',4000);
    };
    const doCSV = () => {
      const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
      const head=['sku','nome','categoria','prompt_immagine','prompt_produzione','materiali','dimensioni'];
      const csv=[head.join(',')].concat(rows.map(r=>head.map(k=>q(r[k])).join(','))).join('\r\n');
      const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,﻿'+encodeURIComponent(csv); a.download='prompt_immagini_ingly_'+stamp+'.csv'; a.click();
      toast('✅ '+rows.length+' prompt esportati (CSV)','success',4000);
    };
    // Overlay scelta formato
    const ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9700;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(8px)';
    ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
    ov.innerHTML=`<div style="background:var(--bg-card);border-radius:20px;width:100%;max-width:440px;border:1px solid var(--border2);box-shadow:0 32px 80px rgba(0,0,0,.8);overflow:hidden">
      <div style="padding:22px 24px 16px;border-bottom:1px solid var(--border)">
        <div style="font-size:17px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:12px">
          <div style="width:42px;height:42px;border-radius:12px;background:var(--primary-dim);border:1px solid var(--primary-border);display:flex;align-items:center;justify-content:center;font-size:20px">🖼️</div>
          Esporta prompt immagini
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px;margin-left:54px">${rows.length} prompt pronti da incollare in un generatore esterno (Midjourney, GPT Image, FLUX…)</div>
      </div>
      <div style="padding:20px 24px;display:flex;flex-direction:column;gap:10px">
        <button id="epi-json" style="width:100%;padding:12px;background:var(--primary);color:#0a0a0a;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">📦 Scarica JSON (strutturato)</button>
        <button id="epi-csv" style="width:100%;padding:12px;background:var(--bg-card3);color:var(--text);border:1px solid var(--border2);border-radius:9px;cursor:pointer;font-size:13px;font-weight:700">📄 Scarica CSV (foglio di calcolo)</button>
      </div>
      <div style="padding:0 24px 18px;font-size:11px;color:var(--text-dim);line-height:1.5">💡 Genera le immagini fuori dal tool, poi caricale sul prodotto con il campo foto (tab Prodotto).</div>
    </div>`;
    document.body.appendChild(ov);
    ov.querySelector('#epi-json').onclick=()=>{ ov.remove(); doJSON(); };
    ov.querySelector('#epi-csv').onclick=()=>{ ov.remove(); doCSV(); };
  },

  async importExcel() {
    const file = await ExcelImport.openPicker();
    if (!file) return;
    try {
      const { rows, col } = await ExcelImport.parseFile(file);
      const iNome=col('nome','name','prodotto','product','titolo');const iDesc=col('descrizione','desc','description','note');
      const iPrezzo=col('prezzo','price','prezzo_vendita','selling_price','valore');const iCosto=col('costo','cost','cost_price');
      const iCat=col('categoria','category','cat','tipo');const iSKU=col('sku','codice','code','ref');
      const fields=[iNome>=0&&'Nome',iPrezzo>=0&&'Prezzo',iCosto>=0&&'Costo',iCat>=0&&'Categoria'].filter(Boolean);
      ExcelImport.showPreview(file, fields, rows.length, async () => {
        toast('Importazione catalogo...','info',2500);let n=0;
        for(let i=0;i<rows.length;i++){const r=rows[i];
          const nome=(iNome>=0?String(r[iNome]||''):'').trim();if(!nome)continue;
          const prezzo=iPrezzo>=0?parseFloat(String(r[iPrezzo]||'0').replace(/[€$,\s]/g,''))||0:0;
          const costo=iCosto>=0?parseFloat(String(r[iCosto]||'0').replace(/[€$,\s]/g,''))||0:0;
          await IDB.put('catalog',{id:Date.now()+i,name:nome,desc:iDesc>=0?String(r[iDesc]||''):'',salePrice:prezzo,costPrice:costo,price:prezzo,cost:costo,margin:prezzo>0?Math.round((prezzo-costo)/prezzo*100):0,category:iCat>=0?String(r[iCat]||'').trim():'',sku:iSKU>=0?String(r[iSKU]||'').trim():'',active:true,emoji:'🎁',tags:''}).catch(()=>{});n++;
        }
        AppStore.invalidate('catalog');await this.render();
        toast('✅ '+n+' prodotti importati','success',4000);
      });
    } catch(e){ toast('Errore: '+e.message,'error',6000); }
  },
  async render(){
    try {

    // v5.1: reset VirtualList state on every render (prevents stale VL on filter change)
    this._vlActive = false;
    this._vlOffset = 0;
    CatalogCats.renderTabs();
    let items=await AppStore.get('catalog');
    // Filter
    if(this.catFilter)items=items.filter(i=>i.category===this.catFilter);
    if(this._onlyIngly)items=items.filter(i=>i.ingly);
    if(this._search)items=items.filter(i=>(i.name+i.desc+i.tags+i.category).toLowerCase().includes(this._search));
    // Sort
    if(this._sort==='trend')items.sort((a,b)=>(b.trendScore||0)-(a.trendScore||0));
    else if(this._sort==='price_asc')items.sort((a,b)=>a.salePrice-b.salePrice);
    else if(this._sort==='price_desc')items.sort((a,b)=>b.salePrice-a.salePrice);
    else if(this._sort==='margin')items.sort((a,b)=>{const ma=a.costPrice>0?(a.salePrice-a.costPrice)/a.salePrice:0,mb=b.costPrice>0?(b.salePrice-b.costPrice)/b.salePrice:0;return mb-ma;});
    else if(this._sort==='name')items.sort((a,b)=>a.name.localeCompare(b.name));
    // KPI stats
    const all=await AppStore.get('catalog');
    window._catalogAllCount = all.length;
    this._renderStats(all);
        const el=eid('catalog-grid');if(!el)return;
    // Apply margin filter if active
    if(this._activeMarginFilter) items = this._applyMarginFilter(items);
    const filterCount = `${items.length} prodotto${items.length!==1?'i':''}`;
    const badge = document.getElementById('catalog-count-badge');
    if(badge) badge.textContent = filterCount;
    if(!items.length){el.innerHTML=`<div style="text-align:center;padding:50px 20px;grid-column:1/-1;background:var(--bg-card);border-radius:16px;border:2px dashed var(--border)"><div style="font-size:52px;margin-bottom:14px">📦</div><div style="font-size:16px;font-weight:800;margin-bottom:6px">Nessun prodotto trovato</div><div style="font-size:13px;color:var(--text-muted);margin-bottom:18px">${this.catFilter||this._search||this._activeMarginFilter||this._onlyIngly?'Prova a cambiare i filtri':'Inizia aggiungendo il tuo primo prodotto al catalogo'}</div><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">${this.catFilter||this._search||this._activeMarginFilter||this._onlyIngly?`<button onclick="Catalog._resetFilters()" style="padding:8px 18px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted)">✕ Rimuovi filtri</button>`:''}<button style="padding:8px 18px;background:var(--primary);color:#000;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800" onclick="Catalog.openModal()"><i class="fas fa-plus"></i> Aggiungi Prodotto</button></div></div>`;return;}
    if(this._view==='list'){this.renderList(items,el);return;}
    this.renderGrid(items,el);
    } catch(e){ console.error('[Catalog.render]', e.message||e); }
  },

  _vlActive: false,
  _vlItems: [],
  _vlOffset: 0,

  _vlRenderChunk(el){
    const CHUNK = 40;
    const slice = this._vlItems.slice(this._vlOffset, this._vlOffset + CHUNK);
    if(!slice.length){ this._vlActive=false; return; }
    // Build temp el, append
    const tmp = document.createElement('div');
    tmp.innerHTML = slice.map(p => this._renderCard(p)).join('');
    while(tmp.firstChild) el.appendChild(tmp.firstChild);
    this._vlOffset += CHUNK;
    if(this._vlOffset >= this._vlItems.length) this._vlActive = false;
  },

  _renderCard(p){
    const margin=p.costPrice>0?Math.round((p.salePrice-p.costPrice)/p.salePrice*100):0;
    const catColor=this.CAT_COLOR[p.category]||'var(--primary)';
    const photoEl=p.photo?`<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover">`:`<span style="font-size:40px">${p.emoji||'🎁'}</span>`;
    // Use existing renderGrid card logic via a temporary single-item call
    const tmp = document.createElement('div');
    tmp.className = 'grid-3';
    const prevActive = this._vlActive;
    this._vlActive = false; // prevent recursion
    tmp.innerHTML = [p].map(p=>{
      const trendColor=p.trendScore>=90?'#22c55e':p.trendScore>=70?'#f97316':'#6366f1';
      return `<div class="card" style="cursor:pointer;padding:0;overflow:hidden;border-top:3px solid ${catColor};display:flex;flex-direction:column"
        onclick="Catalog.openModal(${p.id})">
        <div style="height:120px;background:var(--bg-card2);display:flex;align-items:center;justify-content:center;overflow:hidden">${photoEl}</div>
        <div style="padding:12px;flex:1;display:flex;flex-direction:column;gap:6px">
          <div style="font-size:13px;font-weight:700;color:var(--text)">${p.name||'—'}</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:var(--primary);font-weight:700">${fmtCur(p.salePrice||p.price||0)}</span>
            ${margin>0?`<span style="font-size:10px;background:${margin>=30?'#22c55e20':'#f9731620'};color:${margin>=30?'#22c55e':'#f97316'};padding:2px 6px;border-radius:99px">${margin}%</span>`:''}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            ${p.category?`<span style="font-size:10px;color:var(--text-muted)">${p.category}</span>`:'<span></span>'}
            ${p.ingly?`<span title="Scheda Ingly disponibile" style="font-size:9px;font-weight:800;background:var(--primary-dim);color:var(--primary);padding:2px 6px;border-radius:99px">🏭 Ingly</span>`:''}
          </div>
        </div>
      </div>`;
    }).join('');
    this._vlActive = prevActive;
    return tmp.innerHTML;
  },

  renderGrid(items,el){
    el.style.display = 'grid';
    el.style.gridTemplateColumns = 'repeat(auto-fill,minmax(270px,1fr))';
    el.style.gap = '14px';
    el.className = '';
    this._vlActive = false;
    const _se = document.getElementById('content-inner');
    if(_se && _se._vlListener){ _se.removeEventListener('scroll',_se._vlListener); delete _se._vlListener; }

    el.innerHTML = items.map(p => {
      const sp   = +p.salePrice||+p.price||0;
      const cp   = +p.costPrice||+p.cost||0;
      const mg   = cp>0&&sp>0 ? Math.round((sp-cp)/sp*100) : null;
      const cc   = this.CAT_COLOR[p.category]||'#8b5cf6';
      const mgC  = mg===null?'var(--text-dim)':mg>=50?'#22c55e':mg>=30?'#f59e0b':'#ef4444';
      const mgBg = mg===null?'':''+mgC+'18';
      const tc   = p.trendScore>=90?'#22c55e':p.trendScore>=70?'#f97316':'#6366f1';
      const tStr = p.productionTime?(p.productionTime>=60?Math.round(p.productionTime/60)+'h'+(p.productionTime%60?p.productionTime%60+'m':''):p.productionTime+'min'):'';
      const catIcon = CatalogCats.getAll().find(x=>x.name===p.category)?.icon||'fas fa-box';

      return `<div style="background:var(--bg-card);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;border:1px solid var(--border);position:relative;transition:transform .15s,box-shadow .15s"
        onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 10px 32px rgba(0,0,0,.28)'"
        onmouseout="this.style.transform='';this.style.boxShadow=''">

        <!-- ► COLORED TOP ACCENT ◄ -->
        <div style="height:3px;background:linear-gradient(90deg,${cc},${cc}88)"></div>

        <!-- ► IMAGE / EMOJI AREA ◄ -->
        <div style="position:relative;height:160px;background:${p.photo?'#000':'var(--bg-card2)'};overflow:hidden;flex-shrink:0">
          ${p.photo
            ? `<img src="${p.photo}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;transition:transform .4s" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">`
            : `<div style="height:100%;display:flex;align-items:center;justify-content:center"><div style="font-size:58px;filter:drop-shadow(0 3px 8px rgba(0,0,0,.3))">${p.emoji||'🎁'}</div></div>`}

          <!-- Gradient overlay on photo -->
          ${p.photo?`<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 50%)"></div>`:''}

          <!-- Category pill -->
          <div style="position:absolute;top:9px;left:9px;background:${cc};color:#fff;font-size:10px;font-weight:800;padding:3px 9px;border-radius:99px;display:flex;align-items:center;gap:4px;box-shadow:0 2px 8px rgba(0,0,0,.3)">
            <i class="${catIcon}" style="font-size:9px"></i> ${p.category||'—'}
          </div>

          <!-- Trend badge -->
          ${p.trendScore?`<div style="position:absolute;top:9px;right:9px;background:${tc};color:#fff;font-size:10px;font-weight:800;padding:3px 9px;border-radius:99px;box-shadow:0 2px 8px rgba(0,0,0,.3)">🔥 ${p.trendScore}</div>`:''}

          <!-- Price on photo bottom-right -->
          ${p.photo&&sp?`<div style="position:absolute;bottom:9px;right:10px;font-size:18px;font-weight:900;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.7)">${fmtCur(sp)}</div>`:''}

          <!-- Ingly rich-data badge (scheda ufficiale) -->
          ${p.ingly?`<div title="Scheda Ingly disponibile" style="position:absolute;bottom:9px;left:9px;background:var(--primary);color:#0a0a0a;font-size:9px;font-weight:800;padding:3px 8px;border-radius:99px;box-shadow:0 2px 8px rgba(0,0,0,.3)">🏭 Ingly</div>`:''}

          <!-- Hover overlay -->
          <div class="cat-hover-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,.78);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;opacity:0;transition:.2s">
            <button onclick="event.stopPropagation();Catalog.openModal(${p.id})"
              style="padding:9px 20px;background:var(--primary);color:#000;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:800;width:180px">✏️ Modifica Prodotto</button>
            <button onclick="event.stopPropagation();Catalog.quickAddToQuote(${p.id})"
              style="padding:9px 20px;background:#22c55e;color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700;width:180px">📋 Aggiungi al Quoter</button>
            <div style="display:flex;gap:8px">
              <button onclick="event.stopPropagation();Catalog.quickEditPrice(${p.id},${sp},event)"
                style="padding:6px 14px;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">💶 Prezzo</button>
              <button onclick="event.stopPropagation();Catalog.del(${p.id})"
                style="padding:6px 14px;background:rgba(239,68,68,.2);color:#ef4444;border:1px solid rgba(239,68,68,.4);border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">🗑 Elimina</button>
            </div>
          </div>
        </div>

        <!-- ► CARD CONTENT ◄ -->
        <div style="padding:13px 14px;flex:1;display:flex;flex-direction:column;gap:7px">

          <!-- Name -->
          <div style="font-size:13px;font-weight:800;color:var(--text);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${p.name}</div>

          <!-- Description -->
          ${p.desc?`<div style="font-size:11px;color:var(--text-muted);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${p.desc}</div>`:''}

          <!-- Meta chips row -->
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            ${tStr?`<span style="font-size:10px;background:#f59e0b15;color:#f59e0b;border-radius:6px;padding:2px 7px;font-weight:600">⏱ ${tStr}</span>`:''}
            ${p.material?`<span style="font-size:10px;background:var(--bg-card2);color:var(--text-muted);border-radius:6px;padding:2px 7px">📦 ${p.material.slice(0,18)}</span>`:''}
            ${p.etsyRef?`<a href="${p.etsyRef}" target="_blank" rel="noopener" style="font-size:10px;background:#f5640012;color:#f56400;border-radius:6px;padding:2px 7px;text-decoration:none;font-weight:600" onclick="event.stopPropagation()"><i class="fab fa-etsy" style="font-size:9px"></i> Etsy</a>`:''}
            ${p.sku?`<span style="font-size:10px;background:var(--bg-card2);color:var(--text-dim);border-radius:6px;padding:2px 7px;font-family:monospace">${p.sku}</span>`:''}
          </div>

          <!-- Trend bar -->
          ${p.trendScore?`<div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:9px;color:var(--text-dim);flex-shrink:0;width:34px">Trend</span>
            <div style="flex:1;height:4px;background:var(--bg-card2);border-radius:2px;overflow:hidden">
              <div style="height:4px;width:${p.trendScore}%;background:${tc};border-radius:2px;transition:width .6s"></div>
            </div>
            <span style="font-size:9px;font-weight:700;color:${tc}">${p.trendScore}%</span>
          </div>`:''}

          <!-- PRICE + MARGIN ROW -->
          <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:auto;padding-top:10px;border-top:1px solid var(--border)">
            <div>
              ${cp?`<div style="font-size:10px;color:var(--text-dim);margin-bottom:1px">Costo: ${fmtCur(cp)}</div>`:''}
              <div style="font-size:22px;font-weight:900;color:${cc};line-height:1;letter-spacing:-.5px">${sp?fmtCur(sp):'—'}</div>
              ${p.unit?`<div style="font-size:9px;color:var(--text-dim)">per ${p.unit}</div>`:''}
            </div>
            ${mg!==null?`<div style="text-align:right">
              <div style="font-size:10px;color:var(--text-dim);margin-bottom:1px">Margine</div>
              <div style="font-size:20px;font-weight:900;color:${mgC}">${mg}%</div>
            </div>`:sp&&!cp?`<div style="font-size:10px;color:var(--text-dim);text-align:right">No costo<br>inserito</div>`:''}
          </div>

          <!-- Margin bar -->
          ${mg!==null?`<div>
            <div style="height:5px;background:var(--bg-card2);border-radius:99px;overflow:hidden">
              <div style="height:5px;width:${Math.min(Math.max(mg,0),100)}%;background:linear-gradient(90deg,${mgC}99,${mgC});border-radius:99px;transition:width .6s cubic-bezier(.34,1.56,.64,1)"></div>
            </div>
            ${mg<20&&mg>0?`<div style="font-size:9px;color:#ef4444;margin-top:2px;font-weight:700">⚠ Margine sotto soglia — considera di aumentare il prezzo</div>`:''}
            ${mg<=0&&cp>0?`<div style="font-size:9px;color:#ef4444;margin-top:2px;font-weight:700">🔴 SOTTOCOSTO — vendi in perdita!</div>`:''}
          </div>`:''}

          <!-- B2B tiers mini -->
          ${p.b2bTiers&&(p.b2bTiers.campione?.price||p.b2bTiers.kit?.price)?`<div style="display:flex;gap:4px;flex-wrap:wrap">
            ${p.b2bTiers.campione?.price?`<span style="font-size:9px;background:#f59e0b18;color:#f59e0b;border:1px solid #f59e0b40;border-radius:5px;padding:2px 7px;font-weight:700">1pz €${p.b2bTiers.campione.price}</span>`:''}
            ${p.b2bTiers.kit?.price?`<span style="font-size:9px;background:#22c55e18;color:#22c55e;border:1px solid #22c55e40;border-radius:5px;padding:2px 7px;font-weight:700">${p.b2bTiers.kit.qty||25}pz €${p.b2bTiers.kit.price}</span>`:''}
            ${p.b2bTiers.stock?.price?`<span style="font-size:9px;background:#6366f118;color:#a5b4fc;border:1px solid #6366f140;border-radius:5px;padding:2px 7px;font-weight:700">${p.b2bTiers.stock.qty||100}pz €${p.b2bTiers.stock.price}</span>`:''}
          </div>`:''}

          <!-- Quick action bar (always visible) -->
          <div style="display:flex;gap:5px;margin-top:6px">
            <button onclick="Catalog.openModal(${p.id})"
              style="flex:1;padding:6px;background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:4px;transition:.15s"
              onmouseover="this.style.background='var(--primary-dim)';this.style.color='var(--primary)';this.style.borderColor='var(--primary)'"
              onmouseout="this.style.background='var(--bg-card2)';this.style.color='var(--text-muted)';this.style.borderColor='var(--border)'">
              <i class="fas fa-edit" style="font-size:10px"></i> Modifica
            </button>
            <button onclick="Catalog.quickAddToQuote(${p.id})"
              style="flex:1;padding:6px;background:rgba(34,197,94,.08);color:#22c55e;border:1px solid rgba(34,197,94,.2);border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:4px;transition:.15s"
              onmouseover="this.style.background='rgba(34,197,94,.18)'"
              onmouseout="this.style.background='rgba(34,197,94,.08)'">
              <i class="fas fa-plus" style="font-size:10px"></i> Quoter
            </button>
            <button onclick="Catalog.del(${p.id})"
              style="padding:6px 9px;background:rgba(239,68,68,.06);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:8px;cursor:pointer;font-size:11px;transition:.15s"
              onmouseover="this.style.background='rgba(239,68,68,.18)'"
              onmouseout="this.style.background='rgba(239,68,68,.06)'" title="Elimina">
              <i class="fas fa-trash" style="font-size:10px"></i>
            </button>
          </div>
        </div>
      </div>`;
    }).join('');

    // Attach hover overlay logic
    el.querySelectorAll('.cat-hover-overlay').forEach(ov=>{
      const card = ov.closest('[style*="border-radius:16px"]');
      if(card){
        card.addEventListener('mouseenter',()=>ov.style.opacity='1');
        card.addEventListener('mouseleave',()=>ov.style.opacity='0');
      }
    });
  },
  renderList(items,el){
    el.className='';
    el.innerHTML=`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:var(--bg-card2);border-bottom:2px solid var(--border)">
            <th style="padding:10px 14px;text-align:left;font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;width:44px"></th>
            <th style="padding:10px 14px;text-align:left;font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase">Prodotto</th>
            <th style="padding:10px 14px;text-align:left;font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase">Categoria</th>
            <th style="padding:10px 14px;text-align:right;font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase">Costo</th>
            <th style="padding:10px 14px;text-align:right;font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase">Prezzo</th>
            <th style="padding:10px 14px;text-align:center;font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase">Margine</th>
            <th style="padding:10px 14px;text-align:center;font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase">Trend</th>
            <th style="padding:10px 14px;text-align:center;font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase">Tempo</th>
            <th style="padding:10px 14px;text-align:center;font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase">Azioni</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((p,i)=>{
            const margin=p.costPrice>0?Math.round((p.salePrice-p.costPrice)/p.salePrice*100):0;
            const catColor=Catalog.CAT_COLOR[p.category]||'var(--primary)';
            const trendColor=p.trendScore>=90?'#22c55e':p.trendScore>=70?'#f97316':'#6366f1';
            const mColor=margin>=50?'#22c55e':margin>=30?'#f97316':'#ef4444';
            const timeStr=p.productionTime?(p.productionTime>=60?Math.round(p.productionTime/60)+'h':p.productionTime+'m'):'—';
            const thumb=p.photo?`<img src="${p.photo}" style="width:36px;height:36px;object-fit:cover;border-radius:6px">`
              :`<div style="width:36px;height:36px;background:${catColor}20;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px">${p.emoji||'🎁'}</div>`;
            return `<tr style="border-bottom:1px solid var(--border);transition:.12s" onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background=''">
              <td style="padding:8px 12px">${thumb}</td>
              <td style="padding:8px 14px;max-width:220px">
                <div style="font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
                ${p.material?`<div style="font-size:10px;color:var(--text-dim)">📦 ${p.material}</div>`:''}
              </td>
              <td style="padding:8px 14px"><span style="background:${catColor}18;color:${catColor};font-size:10px;padding:2px 8px;border-radius:99px;font-weight:700">${p.category||'—'}</span></td>
              <td style="padding:8px 14px;text-align:right;color:var(--text-muted)">${fmtCur(p.costPrice||0)}</td>
              <td style="padding:8px 14px;text-align:right;font-weight:800;color:${catColor};font-size:13px">${fmtCur(salePrice_)}</td>
              <td style="padding:8px 14px;text-align:center">
                <span style="font-size:13px;font-weight:800;color:${mColor}">${margin}%</span>
                <div style="height:3px;background:var(--bg-card2);border-radius:2px;margin-top:3px;overflow:hidden"><div style="height:3px;width:${Math.min(margin,100)}%;background:${mColor}"></div></div>
              </td>
              <td style="padding:8px 14px;text-align:center">
                ${p.trendScore?`<span style="font-size:11px;font-weight:700;color:${trendColor}">🔥${p.trendScore}</span>`:'<span style="color:var(--text-dim)">—</span>'}
              </td>
              <td style="padding:8px 14px;text-align:center;font-size:11px;color:var(--text-muted)">${timeStr}</td>
              <td style="padding:8px 12px;text-align:center">
                <div style="display:flex;gap:4px;justify-content:center">
                  <button onclick="Catalog.openModal(${p.id})" style="padding:4px 8px;background:var(--bg-card2);border:1px solid var(--border2);border-radius:5px;cursor:pointer;font-size:10px;color:var(--text-muted)"><i class="fas fa-edit"></i></button>
                  <button onclick="Catalog.quickAddToQuote(${p.id})" style="padding:4px 8px;background:#22c55e18;border:1px solid #22c55e40;border-radius:5px;cursor:pointer;font-size:10px;color:#22c55e;font-weight:700">+Q</button>
                  <button onclick="Catalog.del(${p.id})" style="padding:4px 8px;background:#ef444415;border:1px solid #ef444440;border-radius:5px;cursor:pointer;font-size:10px;color:#ef4444"><i class="fas fa-trash"></i></button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  },
  handlePhoto(input){
    const file=input.files[0];if(!file)return;
    // v5.1: Canvas compression → JPEG max 600×600 quality 0.72
    // Reduces 2MB photo to ~50-80KB — keeps IDB fast
    const MAX=600, QUALITY=0.72;
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      const scale=Math.min(1, MAX/Math.max(img.width,img.height));
      const w=Math.round(img.width*scale), h=Math.round(img.height*scale);
      const cv=document.createElement('canvas');
      cv.width=w; cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      const compressed=cv.toDataURL('image/jpeg',QUALITY);
      this._photo=compressed;
      const prev=eid('cat-photo-preview');
      if(prev)prev.innerHTML=`<img src="${compressed}" style="width:100%;height:100%;object-fit:cover;border-radius:4px">`;
      const kb=Math.round(compressed.length*0.75/1024);
      if(INGLY_DEV)console.log('[Catalog] Photo compressed:',w+'×'+h,'~'+kb+'KB');
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); toast('Errore caricamento immagine','error'); };
    img.src=url;
  },
  clearPhoto(){
    this._photo=null;
    const prev=eid('cat-photo-preview');if(prev)prev.innerHTML=eid('cat-emoji')?.value||'🎁';
    const inp=eid('cat-photo-input');if(inp)inp.value='';
  },
  async openModal(id=null){
    this.editId=id;this._photo=null;
    eid('modal-catalog-title').textContent=id?'✏️ Modifica Prodotto':'➕ Nuovo Prodotto';
    // Reset to base tab
    this.modalTab('base', null);
    // Ingly rich-data tab: hidden until a product with .ingly is loaded
    this._editIngly=null;
    this._editSku=null;
    { const iTab=eid('ctab-ingly'); if(iTab)iTab.style.display='none';
      const iPane=eid('ctab-content-ingly'); if(iPane)iPane.innerHTML=''; }
    // Populate category select dynamically
    const catSel = eid('cat-cat');
    if(catSel){
      const cats = CatalogCats.getAll();
      catSel.innerHTML='<option value="">— Scegli categoria —</option>'+cats.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
    }
    const prev=eid('cat-photo-preview');
    const fields=['cat-name','cat-cost','cat-price','cat-desc','cat-tags','cat-emoji','cat-trend','cat-material','cat-size','cat-time','cat-etsy','cat-notes'];
    // Reset all fields
    fields.forEach(f=>{const el=eid(f);if(el)el.value='';});
    // Reset B2B fields
    ['b2b-mat-cost','b2b-labor','b2b-machine','b2b-time','b2b-camp-price','b2b-camp-disc','b2b-camp-note','b2b-kit-qty','b2b-kit-price','b2b-kit-disc','b2b-kit-total','b2b-kit-note','b2b-stock-qty','b2b-stock-price','b2b-stock-disc','b2b-stock-total','b2b-stock-note','b2b-custom-name','b2b-custom-qty','b2b-custom-price','b2b-custom-note'].forEach(id_=>{const el=eid(id_);if(el)el.value='';});
    ['b2b-kit-disc','b2b-stock-disc'].forEach((id_,i)=>{const el=eid(id_);if(el)el.value=[15,25][i];});
    ['b2b-kit-qty','b2b-stock-qty'].forEach((id_,i)=>{const el=eid(id_);if(el)el.value=[25,100][i];});
    if(eid('b2b-labor'))eid('b2b-labor').value='15';
    if(eid('b2b-machine'))eid('b2b-machine').value='0.35';
    if(eid('b2b-unit-cost-display'))eid('b2b-unit-cost-display').textContent='€ —';
    if(eid('b2b-ai-suggestion'))eid('b2b-ai-suggestion').innerHTML='';
    // Reset Etsy output
    const etsyOut=eid('cat-etsy-output');
    if(etsyOut)etsyOut.innerHTML='<div style="text-align:center;padding:30px;color:var(--text-dim)"><div style="font-size:36px;margin-bottom:8px">🛍️</div><div style="font-size:12px">Premi il pulsante per generare la descrizione ottimizzata</div></div>';
    if(eid('cat-etsy-saved'))eid('cat-etsy-saved').value='';
    if(eid('cat-etsy-tags-saved'))eid('cat-etsy-tags-saved').value='';
    if(id){
      const p=await IDB.get('catalog',id);
      if(p){
        fields.forEach(f=>{const el=eid(f);if(!el)return;const key=f.replace('cat-','');const map={name:'name',cost:'costPrice',price:'salePrice',desc:'desc',tags:'tags',emoji:'emoji',trend:'trendScore',material:'material',size:'size',time:'productionTime',etsy:'etsyRef',notes:'notes'};el.value=p[map[key]]||'';});
        eid('cat-cat').value=p.category;
        this._photo=p.photo||null;
        if(prev)prev.innerHTML=p.photo?`<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:4px">`:`<span style="font-size:32px">${p.emoji||'🎁'}</span>`;
        // Load B2B tiers
        const t=p.b2bTiers||{};
        if(t.matCost && eid('b2b-mat-cost')) eid('b2b-mat-cost').value=t.matCost;
        if(t.laborRate && eid('b2b-labor')) eid('b2b-labor').value=t.laborRate;
        if(t.machineRate && eid('b2b-machine')) eid('b2b-machine').value=t.machineRate;
        if(p.productionTime && eid('b2b-time')) eid('b2b-time').value=p.productionTime;
        if(t.campione){if(eid('b2b-camp-price'))eid('b2b-camp-price').value=t.campione.price||''; if(eid('b2b-camp-disc'))eid('b2b-camp-disc').value=t.campione.disc||0; if(eid('b2b-camp-note'))eid('b2b-camp-note').value=t.campione.note||'';}
        if(t.kit){if(eid('b2b-kit-qty'))eid('b2b-kit-qty').value=t.kit.qty||25; if(eid('b2b-kit-price'))eid('b2b-kit-price').value=t.kit.price||''; if(eid('b2b-kit-disc'))eid('b2b-kit-disc').value=t.kit.disc||15; if(eid('b2b-kit-note'))eid('b2b-kit-note').value=t.kit.note||''; if(eid('b2b-kit-total')&&t.kit.price)eid('b2b-kit-total').value=(t.kit.price*(t.kit.qty||25)).toFixed(2);}
        if(t.stock){if(eid('b2b-stock-qty'))eid('b2b-stock-qty').value=t.stock.qty||100; if(eid('b2b-stock-price'))eid('b2b-stock-price').value=t.stock.price||''; if(eid('b2b-stock-disc'))eid('b2b-stock-disc').value=t.stock.disc||25; if(eid('b2b-stock-note'))eid('b2b-stock-note').value=t.stock.note||''; if(eid('b2b-stock-total')&&t.stock.price)eid('b2b-stock-total').value=(t.stock.price*(t.stock.qty||100)).toFixed(2);}
        if(t.custom){if(eid('b2b-custom-name'))eid('b2b-custom-name').value=t.custom.name||''; if(eid('b2b-custom-qty'))eid('b2b-custom-qty').value=t.custom.qty||''; if(eid('b2b-custom-price'))eid('b2b-custom-price').value=t.custom.price||''; if(eid('b2b-custom-note'))eid('b2b-custom-note').value=t.custom.note||'';}
        // Load Etsy SEO
        if(p.etsyDesc && eid('cat-etsy-saved')) eid('cat-etsy-saved').value=p.etsyDesc;
        if(p.etsyTagsSEO && eid('cat-etsy-tags-saved')) eid('cat-etsy-tags-saved').value=p.etsyTagsSEO;
        this._editIngly=p.ingly||null;
        this._editSku=p.sku||null;
        this._renderInglyTab(p);
        this.recalcB2B();
      }
    }else{
      const firstCat = CatalogCats.getAll()[0]?.name||'';
      if(eid('cat-cat'))eid('cat-cat').value=firstCat;
      if(prev)prev.innerHTML='🎁';
    }
    openModal('catalog');
    // Init smart calc
    this.loadMachineParams();
    const _id2=id;
    const _p2=_id2?(await IDB.get('catalog',_id2).catch(()=>null)):null;
    await this.populateMaterialSel(_p2?.lcMatId||'',_p2?.material||'');
    if(_p2){
      const sv=(id2,v)=>{const el=document.getElementById(id2);if(el&&v!=null&&v!=='')el.value=v;};
      sv('cat-pw',_p2.lcPw);sv('cat-ph',_p2.lcPh);sv('cat-perim',_p2.lcPerim);sv('cat-engr',_p2.lcEngr);
      sv('cat-qty-kit',_p2.lcQtyKit||30);sv('cat-qty-stock',_p2.lcQtyStock||100);
      sv('cat-mat-sheet',_p2.lcSheetCost);
      sv('cat-price-kit',_p2.priceKit);sv('cat-price-stock',_p2.priceStock);
      if(_p2.lcCutMin){const e=document.getElementById('cat-cut-min');if(e){e.value=_p2.lcCutMin;e._manual=true;}}
      if(_p2.lcEngrMin){const e=document.getElementById('cat-engr-min');if(e){e.value=_p2.lcEngrMin;e._manual=true;}}
      sv('cat-labor-min',_p2.lcLaborMin);sv('cat-labor-rate',_p2.lcLaborRate||18);
      sv('cat-paint-cost',_p2.lcPaintCost);
      const ptEl=document.getElementById('cat-paint-type');if(ptEl)ptEl.value=_p2.lcPaintType||'';
      sv('cat-pack-cost',_p2.lcPackCost);sv('cat-extra-cost',_p2.lcExtraCost);
      const wnEl=document.getElementById('cat-work-note');if(wnEl)wnEl.value=_p2.lcWorkNote||'';
      const hpEl2=document.getElementById('cat-has-paint');if(hpEl2)hpEl2.checked=!!_p2.lcHasPaint;
      const hlEl2=document.getElementById('cat-has-labor');if(hlEl2)hlEl2.checked=_p2.lcHasLabor!==false;
      if(_p2.lcMatId)document.getElementById('cat-material-sel').value=_p2.lcMatId;
    }
    const badge=document.getElementById('calc-manual-badge');if(badge)badge.style.display='none';
    // Reset lavorazioni fields
    ['cat-cut-min','cat-engr-min','cat-labor-min','cat-paint-cost','cat-pack-cost','cat-extra-cost','cat-work-note','cat-paint-type'].forEach(id2=>{
      const el2=document.getElementById(id2);if(el2){el2.value='';el2._manual=false;}
    });
    const lrEl=document.getElementById('cat-labor-rate');if(lrEl)lrEl.value='15';
    const hpEl=document.getElementById('cat-has-paint');if(hpEl)hpEl.checked=false;
    const hlEl=document.getElementById('cat-has-labor');if(hlEl)hlEl.checked=true;
    setTimeout(()=>{this.smartRecalc();this.renderPresetBtns();},150);
  },
  modalTab(tab, btn){
    if(!tab) return;
    ['base','b2b','etsy','ingly'].forEach(t=>{
      const c=eid('ctab-content-'+t), b=eid('ctab-'+t);
      if(c) c.style.display=t===tab?'block':'none';
      if(b){ b.style.background=t===tab?'var(--bg-card)':'none'; b.style.borderBottomColor=t===tab?'var(--primary)':'transparent'; b.style.color=t===tab?'var(--primary)':'var(--text-muted)'; }
    });
    if(tab==='b2b') setTimeout(()=>this.syncB2BFromCalc(),80);
  },
  // Fase B — scheda ricca dei prodotti importati dal catalogo Ingly (read-only)
  _renderInglyTab(p){
    const pane=eid('ctab-content-ingly'), tabBtn=eid('ctab-ingly');
    const g=p&&p.ingly;
    if(!pane||!tabBtn) return;
    if(!g){ tabBtn.style.display='none'; pane.innerHTML=''; return; }
    tabBtn.style.display='';
    const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const eur=v=>(v==null||v==='')?'—':Number(v).toFixed(2).replace('.',',')+' €';
    const row=(lbl,val)=>val?`<div style="display:flex;gap:12px;padding:7px 0;border-bottom:1px solid var(--border)"><span style="flex:0 0 130px;font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">${esc(lbl)}</span><span style="flex:1;font-size:13px;color:var(--text)">${esc(val)}</span></div>`:'';
    const priceChip=(lbl,val,accent)=>`<div style="flex:1;min-width:90px;text-align:center;padding:10px 8px;background:var(--bg-card2);border:1px solid ${accent?'var(--primary-border)':'var(--border)'};border-radius:var(--radius-sm)"><div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">${esc(lbl)}</div><div style="font-size:15px;font-weight:800;color:${accent?'var(--primary)':'var(--text)'}">${eur(val)}</div></div>`;
    const promptBox=(lbl,txt)=>txt?`<div class="form-group"><label class="form-label">${esc(lbl)}</label><div style="position:relative"><textarea class="form-control" readonly rows="4" style="font-family:var(--mono);font-size:11px;resize:vertical">${esc(txt)}</textarea><button type="button" onclick="navigator.clipboard&&navigator.clipboard.writeText(this.previousElementSibling.value).then(()=>toast('Copiato','success',1500))" style="position:absolute;top:6px;right:6px;padding:4px 9px;background:var(--bg-card3);border:1px solid var(--border2);border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:11px">📋</button></div></div>`:'';
    const prio=g.priorita?`<span class="badge badge-purple" style="margin-left:8px">priorità ${esc(g.priorita)}</span>`:'';
    pane.innerHTML=`
      <div class="alert alert-info" style="margin-bottom:16px">🏭 Dati dal catalogo ufficiale Ingly. Sola lettura — la scheda di lavoro resta nei tab Prodotto / B2B / Etsy.</div>
      ${g.sottotitolo?`<div style="font-size:14px;color:var(--text-muted);margin-bottom:14px">${esc(g.sottotitolo)}${prio}</div>`:''}
      <div class="card-title">Listino consigliato</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
        ${priceChip('Entry',g.prezzoEntry)}
        ${priceChip('Standard',p.salePrice,true)}
        ${priceChip('Premium',g.prezzoPremium)}
        ${priceChip('B2B 50pz',g.prezzoB2B)}
      </div>
      <div class="card-title">Scheda tecnica</div>
      <div style="margin-bottom:20px">
        ${row('Dimensioni',g.dimensioni)}
        ${row('Tecnologia',g.tecnologia)}
        ${row('Piattaforma',g.piattaforma)}
        ${row('Componenti',g.componenti)}
        ${row('Packaging',g.packaging)}
        ${row('Margine',g.margine)}
        ${row('Posizionamento',g.posizionamento)}
        ${row('Personalizz.',g.personalizzazione)}
      </div>
      ${(g.upsell||g.bundle)?`<div class="card-title">Cross-sell</div><div style="margin-bottom:12px">${row('Upsell',g.upsell)}${row('Bundle',g.bundle)}</div>
        ${g.upsell?`<button type="button" onclick="Catalog.addBundleToQuote(${p.id})" style="width:100%;padding:11px;margin-bottom:20px;background:#22c55e;color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">➕ Crea bundle nel preventivo (prodotto + upsell)</button>`:''}`:''}
      ${(g.seo||g.keywords)?`<div class="card-title">SEO</div><div style="margin-bottom:20px">${row('Titolo SEO',g.seo)}${row('Keywords',g.keywords)}</div>`:''}
      <div class="card-title">Prompt</div>
      ${promptBox('⚙️ Prompt di produzione',g.promptProduzione)}
      ${promptBox('🖼️ Prompt immagine catalogo',g.promptImmagine)}
      ${g.promptImmagine?`
      <div class="card-title" style="margin-top:6px">Varianti immagine <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-dim)">— angolazione · luce · sfondo</span></div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${this._inglyImgVariants(g.promptImmagine).map(v=>`
          <div style="display:flex;gap:10px;align-items:flex-start;background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 11px">
            <span style="flex:0 0 96px;font-size:10px;font-weight:800;color:var(--primary);text-transform:uppercase;letter-spacing:.5px;padding-top:2px">${esc(v.label)}</span>
            <span style="flex:1;font-size:11px;color:var(--text-muted);font-family:var(--mono);line-height:1.5;word-break:break-word">${esc(v.text)}</span>
            <button type="button" data-vp="${esc(v.text)}" onclick="navigator.clipboard&&navigator.clipboard.writeText(this.dataset.vp).then(()=>toast('Variante copiata','success',1500))" style="flex:0 0 auto;padding:4px 9px;background:var(--bg-card3);border:1px solid var(--border2);border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:11px">📋</button>
          </div>`).join('')}
      </div>`:''}
    `;
  },
  // Fase D — genera varianti fotografiche dal prompt base (solo string-templating, nessuna chiamata esterna)
  _inglyImgVariants(base){
    const b=String(base||'').trim().replace(/\.*$/,'');
    const mods=[
      ['Front studio','front-on studio shot, soft diffused light, seamless off-white background, product centered'],
      ['Tre quarti','45° three-quarter angle, warm golden-hour side light grazing the texture, rustic wood surface'],
      ['Flat lay','top-down flat lay, bright even softbox light, neutral linen background, minimal props'],
      ['Macro','close-up macro of the engraved detail, dramatic raking light, dark slate background, shallow depth of field'],
      ['Lifestyle','lifestyle context, natural window light, softly blurred warm home interior in the background'],
    ];
    return mods.map(m=>({label:m[0], text:b+'. '+m[1]}));
  },
  // ──────────── SMART CALC ENGINE ────────────
  _MKEY:'ingly_laser_80w',
  getMachP(){try{return JSON.parse(localStorage.getItem(this._MKEY)||'{}');}catch(_){return {};}},
  saveMachineParams(){
    const g=id=>+(document.getElementById(id)?.value||0);
    localStorage.setItem(this._MKEY,JSON.stringify({kwh:g('cm-kwh'),kw:g('cm-kw'),depr:g('cm-depr'),labor:g('cm-labor'),mk1:g('cm-mk1'),mkit:g('cm-mkit'),mstock:g('cm-mstock')}));
  },
  loadMachineParams(){
    const p=this.getMachP();
    const s=(id,k,d)=>{const el=document.getElementById(id);if(el)el.value=(p[k]!=null?p[k]:d);};
    s('cm-kwh','kwh',0.28);s('cm-kw','kw',1.2);s('cm-depr','depr',0.80);s('cm-labor','labor',15);
    s('cm-mk1','mk1',3.5);s('cm-mkit','mkit',2.8);s('cm-mstock','mstock',2.2);
  },
  toggleMachinePanel(){
    const el=document.getElementById('cat-machine-panel');
    if(el)el.style.display=el.style.display==='none'?'block':'none';
  },
  async populateMaterialSel(savedId,savedName){
    const sel=document.getElementById('cat-material-sel');if(!sel)return;
    const all=await AppStore.get('materials').catch(()=>[]);
    const mats=all.filter(m=>m.type==='material');
    sel.innerHTML='<option value="">— Seleziona dal database materiali —</option>';
    const groups={legno:'🪵 Legni',mdf:'◾ MDF',plexy:'🔷 Plexiglass',tessuto:'🧵 Tessuti',altro:'📦 Altro'};
    Object.entries(groups).forEach(([cat,label])=>{
      const inCat=mats.filter(m=>(m.cat||'altro')===cat);if(!inCat.length)return;
      const og=document.createElement('optgroup');og.label=label;
      inCat.forEach(m=>{const o=document.createElement('option');o.value=m.id;o.dataset.cost=m.cost;o.dataset.unit=m.unit||'€/mq';o.dataset.name=m.name;o.textContent=m.name+' — '+fmtCur(m.cost)+'/'+(m.unit||'€/mq').replace('€/','');og.appendChild(o);});
      sel.appendChild(og);
    });
    if(savedId)sel.value=savedId;
    else if(savedName){const m=mats.find(x=>x.name===savedName||x.name.toLowerCase().startsWith(savedName.toLowerCase().substring(0,5)));if(m)sel.value=m.id;}
    if(sel.value)this.onMaterialSelect(true);
  },
  onMaterialSelect(silent=false){
    const sel=document.getElementById('cat-material-sel');
    const opt=sel?.options[sel?.selectedIndex];if(!opt?.value)return;
    const name=opt.dataset.name||opt.text.split(' — ')[0];
    const unit=opt.dataset.unit||'€/mq';
    const cost=parseFloat(opt.dataset.cost)||0;
    const matEl=document.getElementById('cat-material');if(matEl)matEl.value=name;
    const sheetEl=document.getElementById('cat-mat-sheet');
    if(sheetEl&&!sheetEl._manual){
      if(unit.includes('mq'))sheetEl.value=(cost*0.6*0.4).toFixed(2);
      else if(unit.includes('mt'))sheetEl.value=(cost*0.5).toFixed(2);
      else sheetEl.value=cost.toFixed(2);
    }
    const hint=document.getElementById('cat-mat-hint');
    if(hint)hint.textContent=name+' — '+fmtCur(cost)+'/'+(unit.replace('€/',''))+' · Foglio 60×40cm = '+fmtCur(+(cost*0.6*0.4).toFixed(2));
    if(!silent)this.smartRecalc();
  },
  applyPreset(w,h,p,e){
    const sv=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v;};
    sv('cat-pw',w);sv('cat-ph',h);sv('cat-perim',p);sv('cat-engr',e);
    const cut=document.getElementById('cat-has-cut');if(cut)cut.checked=(+p>0);
    const engr=document.getElementById('cat-has-engr');if(engr)engr.checked=(+e>0);
    const sz=document.getElementById('cat-size');if(sz)sz.value=`${Math.round(w/10)}×${Math.round(h/10)}cm`;
    this.smartRecalc();
  },

  // ─── PRESET CRUD ───
  _PRESET_KEY:'ingly_dim_presets',
  _defaultPresets:[
    {name:'Portachiavi 6×4cm',w:60,h:40,p:200,e:600},
    {name:'Segnaposto 7×5cm',w:70,h:50,p:240,e:800},
    {name:'Targa 30×10cm',w:300,h:100,p:800,e:5000},
    {name:'Tagliere 35×25cm',w:350,h:250,p:1200,e:0},
    {name:'Menu 10×20cm',w:100,h:200,p:600,e:8000},
    {name:'Scatola 20×14cm',w:200,h:140,p:680,e:2000},
    {name:'Tableau 80×60cm',w:800,h:600,p:2800,e:20000},
    {name:'Cornice 30×20cm',w:300,h:200,p:1000,e:10000},
  ],
  getPresets(){
    try{return JSON.parse(localStorage.getItem(this._PRESET_KEY)||'null')||JSON.parse(JSON.stringify(this._defaultPresets));}
    catch(_){return JSON.parse(JSON.stringify(this._defaultPresets));}
  },
  savePresets(list){localStorage.setItem(this._PRESET_KEY,JSON.stringify(list));},
  renderPresetBtns(){
    const wrap=document.getElementById('preset-btns-wrap');if(!wrap)return;
    const list=this.getPresets();
    if(!list.length){wrap.innerHTML='<span style="font-size:11px;color:var(--text-dim)">Nessun preset — clicca Gestisci per aggiungerne</span>';return;}
    wrap.innerHTML=list.map((pr,i)=>`
      <button type="button" onclick="Catalog.applyPreset(${pr.w},${pr.h},${pr.p},${pr.e})"
        style="padding:4px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:5px;color:var(--text-muted);cursor:pointer;font-size:10px;position:relative;transition:.1s"
        onmouseover="this.style.borderColor='#6366f1';this.style.color='#a5b4fc'"
        onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'"
        title="${pr.w}×${pr.h}mm · perim.${pr.p} · incis.${pr.e}mm²">${pr.name}</button>`).join('');
  },
  renderPresetEditList(){
    const el=document.getElementById('preset-list-edit');if(!el)return;
    const list=this.getPresets();
    if(!list.length){el.innerHTML='<div style="font-size:11px;color:var(--text-dim);text-align:center;padding:8px">Nessun preset</div>';return;}
    el.innerHTML=list.map((pr,i)=>`
      <div style="display:grid;grid-template-columns:2fr 60px 60px 70px 70px auto;gap:5px;align-items:center;background:#1e293b;border-radius:6px;padding:6px 8px" id="pedit-row-${i}">
        <input class="form-control" value="${pr.name}" style="font-size:11px;padding:4px 6px" oninput="Catalog._editPresetField(${i},'name',this.value)">
        <input class="form-control" type="number" value="${pr.w}" style="font-size:11px;padding:4px 5px;text-align:center" title="Larghezza mm" oninput="Catalog._editPresetField(${i},'w',+this.value)">
        <input class="form-control" type="number" value="${pr.h}" style="font-size:11px;padding:4px 5px;text-align:center" title="Altezza mm" oninput="Catalog._editPresetField(${i},'h',+this.value)">
        <input class="form-control" type="number" value="${pr.p}" style="font-size:11px;padding:4px 5px;text-align:center" title="Perimetro taglio mm" oninput="Catalog._editPresetField(${i},'p',+this.value)">
        <input class="form-control" type="number" value="${pr.e}" style="font-size:11px;padding:4px 5px;text-align:center" title="Area incisione mm²" oninput="Catalog._editPresetField(${i},'e',+this.value)">
        <button type="button" onclick="Catalog.deletePreset(${i})"
          style="padding:3px 7px;background:#ef444415;border:1px solid #ef444430;border-radius:4px;color:#ef4444;cursor:pointer;font-size:11px">🗑</button>
      </div>`).join('');
    // Add header labels
    el.insertAdjacentHTML('afterbegin','<div style="display:grid;grid-template-columns:2fr 60px 60px 70px 70px auto;gap:5px;padding:0 8px 4px"><span style="font-size:9px;color:var(--text-muted)">NOME</span><span style="font-size:9px;color:var(--text-muted);text-align:center">L mm</span><span style="font-size:9px;color:var(--text-muted);text-align:center">H mm</span><span style="font-size:9px;color:var(--text-muted);text-align:center">Perim</span><span style="font-size:9px;color:var(--text-muted);text-align:center">Incis.</span><span></span></div>');
  },
  _editPresetField(idx,field,val){
    const list=this.getPresets();
    if(!list[idx])return;
    list[idx][field]=val;
    this.savePresets(list);
    this.renderPresetBtns();
  },
  deletePreset(idx){
    const list=this.getPresets();
    list.splice(idx,1);
    this.savePresets(list);
    this.renderPresetEditList();
    this.renderPresetBtns();
    toast('Preset eliminato','warning');
  },
  addPreset(){
    const g=id=>document.getElementById(id)?.value||'';
    const name=g('pnew-name').trim();
    if(!name){toast('Inserisci un nome','warning');return;}
    const w=+g('pnew-w')||0,h=+g('pnew-h')||0;
    if(!w||!h){toast('Inserisci larghezza e altezza','warning');return;}
    const list=this.getPresets();
    list.push({name,w,h,p:+g('pnew-p')||0,e:+g('pnew-e')||0});
    this.savePresets(list);
    ['pnew-name','pnew-w','pnew-h','pnew-p','pnew-e'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    this.renderPresetEditList();
    this.renderPresetBtns();
    toast('Preset aggiunto ✅','success');
  },
  openPresetManager(){
    const pm=document.getElementById('preset-manager');
    if(!pm)return;
    const isOpen=pm.style.display!=='none';
    pm.style.display=isOpen?'none':'block';
    if(!isOpen)this.renderPresetEditList();
  },

  // ─── B2B SYNC FROM SMART CALC ───
  syncB2BFromCalc(){
    // Read computed prices from Prodotto tab fields
    const cost=+document.getElementById('cat-cost')?.value||0;
    const p1=+document.getElementById('cat-price')?.value||0;
    const pKit=+document.getElementById('cat-price-kit')?.value||0;
    const pStock=+document.getElementById('cat-price-stock')?.value||0;
    const qKit=+document.getElementById('cat-qty-kit')?.value||30;
    const qStock=+document.getElementById('cat-qty-stock')?.value||100;
    const time=+document.getElementById('cat-time')?.value||0;

    if(!p1&&!cost){
      toast('Prima calcola i costi nel tab Prodotto','warning');
      return;
    }

    // Fill B2B fields
    const sv=(id,v)=>{const el=document.getElementById(id);if(el&&v)el.value=(+v).toFixed(2);};
    sv('b2b-camp-price',p1);
    sv('b2b-kit-price',pKit);
    sv('b2b-kit-total',pKit*qKit);
    sv('b2b-stock-price',pStock);
    sv('b2b-stock-total',pStock*qStock);
    // Update qty fields
    const kq=document.getElementById('b2b-kit-qty');if(kq)kq.value=qKit;
    const sq=document.getElementById('b2b-stock-qty');if(sq)sq.value=qStock;
    // Update hidden compat fields
    const hbc=document.getElementById('b2b-mat-cost');if(hbc)hbc.value=cost.toFixed(2);
    const hbt=document.getElementById('b2b-time');if(hbt)hbt.value=time;

    // Update summary displays
    const fmt=v=>'€'+(+v).toFixed(2);
    const sd=id=>document.getElementById(id);
    if(sd('b2b-disp-cost'))sd('b2b-disp-cost').textContent=cost>0?fmt(cost):'—';
    if(sd('b2b-disp-single'))sd('b2b-disp-single').textContent=p1>0?fmt(p1):'—';
    if(sd('b2b-disp-kit'))sd('b2b-disp-kit').textContent=pKit>0?fmt(pKit):'—';
    if(sd('b2b-disp-stock'))sd('b2b-disp-stock').textContent=pStock>0?fmt(pStock):'—';

    // Update margins
    const mg=(v)=>cost>0&&v>0?Math.round((v-cost)/v*100)+'%':'—';
    if(sd('b2b-camp-margin'))sd('b2b-camp-margin').textContent='Margine: '+mg(p1);
    if(sd('b2b-kit-margin'))sd('b2b-kit-margin').textContent='Margine: '+mg(pKit);
    if(sd('b2b-stock-margin'))sd('b2b-stock-margin').textContent='Margine: '+mg(pStock);

    const status=document.getElementById('b2b-sync-status');
    if(status)status.textContent=`Sincronizzato: ${new Date().toLocaleTimeString('it-IT')} · Campione ${fmt(p1)} · Kit ${fmt(pKit)} · Stock ${fmt(pStock)}`;
    toast('B2B sincronizzato ✅','success');
  },
  onManualEdit(){const b=document.getElementById('calc-manual-badge');if(b)b.style.display='';},
  // Auto-calc minutes from perim/area when dims change, without overriding manual
  autoCalcMins(){
    const pw=parseFloat(document.getElementById('cat-pw')?.value)||0;
    const ph=parseFloat(document.getElementById('cat-ph')?.value)||0;
    const perim=parseFloat(document.getElementById('cat-perim')?.value)||0;
    const engrArea=parseFloat(document.getElementById('cat-engr')?.value)||0;
    // Only auto-fill if field is empty (user hasn't typed manually)
    const cutEl=document.getElementById('cat-cut-min');
    const engrEl=document.getElementById('cat-engr-min');
    if(cutEl&&!cutEl._manual){
      const secCut=perim>0?perim/15:pw>0&&ph>0?(2*(pw+ph))/15:0;
      if(secCut>0){cutEl.value=(secCut/60).toFixed(1);const h=document.getElementById('cat-cut-hint');if(h)h.textContent=`${(secCut/60).toFixed(1)} min · da perimetro ${perim||Math.round(2*(pw+ph))}mm`;}
    }
    if(engrEl&&!engrEl._manual){
      const secEngr=engrArea>0?engrArea/(300*0.2):pw>0&&ph>0?(pw*ph*0.3)/(300*0.2):0;
      if(secEngr>0){engrEl.value=(secEngr/60).toFixed(1);const h=document.getElementById('cat-engr-hint');if(h)h.textContent=`${(secEngr/60).toFixed(1)} min · da area ${engrArea||Math.round(pw*ph*0.3)}mm²`;}
    }
    this.smartRecalc();
  },
  smartRecalc(){
    // Mark manual edits on minute fields
    ['cat-cut-min','cat-engr-min'].forEach(id=>{
      const el=document.getElementById(id);
      if(el&&!el._listenerSet){el._listenerSet=true;el.addEventListener('input',()=>{el._manual=true;},true);}
    });
    const el=document.getElementById('cat-calc-result');if(!el)return;
    const p=this.getMachP();
    const kwh=+document.getElementById('cm-kwh')?.value||p.kwh||0.28;
    const kw=+document.getElementById('cm-kw')?.value||p.kw||1.2;
    const depr=+document.getElementById('cm-depr')?.value||p.depr||0.80;
    const laborRate=+document.getElementById('cat-labor-rate')?.value||+document.getElementById('cm-labor')?.value||p.labor||18;
    const mk1=+document.getElementById('cm-mk1')?.value||p.mk1||3.5;
    const mkit=+document.getElementById('cm-mkit')?.value||p.mkit||2.8;
    const mstock=+document.getElementById('cm-mstock')?.value||p.mstock||2.2;

    // ── Material ──
    const sel=document.getElementById('cat-material-sel');
    const opt=sel?.options[sel?.selectedIndex];
    const matUnit=opt?.dataset?.unit||'€/mq';
    const matCostRaw=parseFloat(opt?.dataset?.cost)||0;
    const sheetCost=parseFloat(document.getElementById('cat-mat-sheet')?.value)||0;
    const pw=parseFloat(document.getElementById('cat-pw')?.value)||0;
    const ph=parseFloat(document.getElementById('cat-ph')?.value)||0;
    let matCost=0;
    if(pw>0&&ph>0){
      const pW=pw/1000,pH=ph/1000;
      if(matUnit.includes('mq')){
        const sW=0.60,sH=0.40;
        const pps=Math.max(1,Math.floor(sW/pW)*Math.floor(sH/pH));
        const sc=sheetCost>0?sheetCost:(matCostRaw*sW*sH);
        matCost=(sc/pps)*1.15;
        const hint=document.getElementById('cat-mat-hint');
        if(hint&&opt?.value)hint.textContent=`${opt.dataset.name} · ${fmtCur(matCostRaw)}/mq · Foglio ${fmtCur(sc)} → ${pps} pz/foglio → ${fmtCur(+matCost.toFixed(2))}/pz (scarto 15% incl.)`;
      }else{matCost=sheetCost>0?sheetCost:matCostRaw;}
    }else if(sheetCost>0){matCost=sheetCost;}

    // ── Taglio Laser (min) ──
    const hasCut=document.getElementById('cat-has-cut')?.checked;
    const perim=parseFloat(document.getElementById('cat-perim')?.value)||0;
    let cutMinAuto=perim>0?perim/15/60:pw>0&&ph>0?(2*(pw+ph))/15/60:0;
    const cutMinManual=parseFloat(document.getElementById('cat-cut-min')?.value)||0;
    const cutMin=hasCut?(cutMinManual>0?cutMinManual:cutMinAuto):0;
    const cutHint=document.getElementById('cat-cut-hint');
    if(cutHint)cutHint.textContent=hasCut?`${cutMin.toFixed(1)} min usati nel calcolo`:'disabilitato';

    // ── Incisione Laser (min) ──
    const hasEngr=document.getElementById('cat-has-engr')?.checked;
    const engrArea=parseFloat(document.getElementById('cat-engr')?.value)||0;
    let engrMinAuto=engrArea>0?engrArea/(300*0.2)/60:0;
    const engrMinManual=parseFloat(document.getElementById('cat-engr-min')?.value)||0;
    const engrMin=hasEngr?(engrMinManual>0?engrMinManual:engrMinAuto):0;
    const engrHint=document.getElementById('cat-engr-hint');
    if(engrHint)engrHint.textContent=hasEngr?`${engrMin.toFixed(1)} min usati nel calcolo`:'disabilitata';

    // ── Manodopera (min separati dalla macchina) ──
    const hasLabor=document.getElementById('cat-has-labor')?.checked;
    const laborMin=hasLabor?(parseFloat(document.getElementById('cat-labor-min')?.value)||0):0;

    // ── Tempi totali ──
    const machMin=cutMin+engrMin+0.75; // 0.75 min = 45sec overhead fisso
    const totalWorkMin=machMin+laborMin;

    // ── Verniciatura ──
    const hasPaint=document.getElementById('cat-has-paint')?.checked;
    const paintCost=hasPaint?(parseFloat(document.getElementById('cat-paint-cost')?.value)||0):0;

    // ── Extra / Packaging ──
    const packCost=parseFloat(document.getElementById('cat-pack-cost')?.value)||0;
    const extraCost=parseFloat(document.getElementById('cat-extra-cost')?.value)||0;

    // ── Costi macchina e lavoro ──
    const calcQty=+document.getElementById('cat-calc-qty')?.value||30;
    const qtyKit=+document.getElementById('cat-qty-kit')?.value||30;
    const qtyStock=+document.getElementById('cat-qty-stock')?.value||100;
    const bf=calcQty>=100?0.35:calcQty>=30?0.55:calcQty>=10?0.75:1.0;
    const machRate=(kw*kwh)+depr+0.25;
    const machCost=machRate*(machMin/60);
    const labCost=hasLabor&&laborMin>0?(laborRate*(laborMin/60)):0;

    // ── Totale ──
    const tc=matCost+machCost+labCost+paintCost+packCost+extraCost;

    if(tc<=0&&matCost<=0){
      el.innerHTML='<div style="text-align:center;color:var(--text-dim);font-size:12px;padding:10px">Seleziona un materiale e inserisci le lavorazioni →</div>';
      return;
    }

    // ── Tiers batch ──
    const bfKit=qtyKit>=50?0.45:qtyKit>=25?0.55:0.70;
    const bfStock=qtyStock>=200?0.25:qtyStock>=100?0.35:0.45;
    const tcKit=matCost*1.08+machCost+(hasLabor&&laborMin>0?laborRate*(laborMin/60)*bfKit:0)+paintCost+packCost+extraCost;
    const tcStock=matCost*1.04+machCost+(hasLabor&&laborMin>0?laborRate*(laborMin/60)*bfStock:0)+paintCost+packCost+extraCost;
    const p1=+(tc*mk1).toFixed(2);
    const pKit=+(tcKit*mkit).toFixed(2);
    const pStock=+(tcStock*mstock).toFixed(2);
    const mg=v=>v>0?Math.round((v-tc)/v*100):0;
    const fmt=v=>'€'+(+v).toFixed(2);
    const mbar=(pct,col)=>`<div style="height:3px;background:#1e293b;border-radius:2px;margin-top:4px;overflow:hidden"><div style="height:3px;width:${Math.min(pct,100)}%;background:${col};border-radius:2px"></div></div>`;
    const pps=pw>0&&ph>0?Math.max(1,Math.floor(600/pw)*Math.floor(400/ph)):'-';

    // ── Auto-fill campi prezzo ──
    const badge=document.getElementById('calc-manual-badge');
    if(!badge||badge.style.display==='none'){
      const sv=(id,v)=>{const e=document.getElementById(id);if(e)e.value=(+v).toFixed(2);};
      sv('cat-cost',tc);sv('cat-price',p1);sv('cat-price-kit',pKit);sv('cat-price-stock',pStock);
      const tm=document.getElementById('cat-time');if(tm)tm.value=Math.ceil(totalWorkMin);
      const bmc=document.getElementById('b2b-mat-cost');if(bmc&&!bmc.value)bmc.value=matCost.toFixed(2);
      const btm=document.getElementById('b2b-time');if(btm&&!btm.value)btm.value=totalWorkMin.toFixed(1);
    }

    // ── Breakdown dettagliato ──
    const hasPaintLine=hasPaint&&paintCost>0;
    const hasExtraLine=(packCost+extraCost)>0;
    el.innerHTML=`
<!-- Cost breakdown: fino a 5 card dinamiche -->
<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
  <div style="background:#0f172a;border-radius:7px;padding:9px;border:1px solid #f59e0b30;text-align:center;flex:1;min-width:90px">
    <div style="font-size:9px;color:#f59e0b;font-weight:700;text-transform:uppercase;margin-bottom:2px">📦 MATERIALE</div>
    <div style="font-size:17px;font-weight:800;color:#f59e0b">${fmt(matCost)}</div>
    <div style="font-size:9px;color:#64748b;margin-top:2px">${pps} pz/foglio</div>
  </div>
  <div style="background:#0f172a;border-radius:7px;padding:9px;border:1px solid #3b82f630;text-align:center;flex:1;min-width:90px">
    <div style="font-size:9px;color:#60a5fa;font-weight:700;text-transform:uppercase;margin-bottom:2px">⚡ MACCHINA</div>
    <div style="font-size:17px;font-weight:800;color:#3b82f6">${fmt(machCost)}</div>
    <div style="font-size:9px;color:#64748b;margin-top:2px">${machMin.toFixed(1)} min · ${fmt(machRate)}/h</div>
    <div style="font-size:8px;color:#475569">✂️${cutMin.toFixed(1)}m 🎨${engrMin.toFixed(1)}m</div>
  </div>
  ${hasLabor&&laborMin>0?`<div style="background:#0f172a;border-radius:7px;padding:9px;border:1px solid #10b98130;text-align:center;flex:1;min-width:90px">
    <div style="font-size:9px;color:#34d399;font-weight:700;text-transform:uppercase;margin-bottom:2px">👤 MANODOPERA</div>
    <div style="font-size:17px;font-weight:800;color:#10b981">${fmt(labCost)}</div>
    <div style="font-size:9px;color:#64748b;margin-top:2px">${laborMin} min · ${fmt(laborRate)}/h</div>
  </div>`:''}
  ${hasPaintLine?`<div style="background:#0f172a;border-radius:7px;padding:9px;border:1px solid #f59e0b30;text-align:center;flex:1;min-width:90px">
    <div style="font-size:9px;color:#fbbf24;font-weight:700;text-transform:uppercase;margin-bottom:2px">🖌️ VERNICIATURA</div>
    <div style="font-size:17px;font-weight:800;color:#fbbf24">${fmt(paintCost)}</div>
    <div style="font-size:9px;color:#64748b;margin-top:2px">${document.getElementById('cat-paint-type')?.value||'finitura'}</div>
  </div>`:''}
  ${hasExtraLine?`<div style="background:#0f172a;border-radius:7px;padding:9px;border:1px solid #a855f730;text-align:center;flex:1;min-width:90px">
    <div style="font-size:9px;color:#c084fc;font-weight:700;text-transform:uppercase;margin-bottom:2px">📦 EXTRA</div>
    <div style="font-size:17px;font-weight:800;color:#a855f7">${fmt(packCost+extraCost)}</div>
    <div style="font-size:9px;color:#64748b;margin-top:2px">pack+altri</div>
  </div>`:''}
</div>
<div style="background:#050d1a;border-radius:9px;padding:11px;border:1px solid #22c55e30">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
    <span style="font-size:11px;color:#94a3b8;font-weight:700">🟢 COSTO REALE TOTALE/pz</span>
    <span style="font-size:22px;font-weight:900;color:#22c55e">${fmt(tc)}</span>
  </div>
  <div style="font-size:10px;color:#4ade80;margin-bottom:10px">Mat ${fmt(matCost)} + Macchina ${fmt(machCost)}${labCost>0?' + Mano '+fmt(labCost):''}${paintCost>0?' + Vern. '+fmt(paintCost):''}${(packCost+extraCost)>0?' + Extra '+fmt(packCost+extraCost):''}</div>
  <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin-bottom:8px">💡 PREZZI SUGGERITI PER SCAGLIONE — MODIFICA LE QUANTITÀ ↑</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:8px">
    <div style="background:#6366f120;border-radius:7px;padding:9px;border:1px solid #6366f140;text-align:center">
      <div style="font-size:9px;color:#a5b4fc;font-weight:700;text-transform:uppercase;margin-bottom:2px">🎯 CAMPIONE</div>
      <div style="font-size:9px;color:#475569;margin-bottom:4px">Qtà fissa 1 pz</div>
      <div style="font-size:22px;font-weight:900;color:#6366f1">${fmt(p1)}</div>
      <div style="font-size:9px;color:#818cf8;margin-top:2px">Margine ${mg(p1)}%</div>
      ${mbar(mg(p1),'#6366f1')}
      <button type="button" onclick="Catalog.applyCalcPrices(${tc},${p1},${pKit},${pStock})"
        style="margin-top:7px;width:100%;padding:5px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:10px;font-weight:700">
        ✅ Applica tutti ↓
      </button>
    </div>
    <div style="background:#10b98120;border-radius:7px;padding:9px;border:1px solid #10b98140;text-align:center">
      <div style="font-size:9px;color:#6ee7b7;font-weight:700;text-transform:uppercase;margin-bottom:2px">🏫 KIT CLASSE</div>
      <div style="font-size:9px;color:#475569;margin-bottom:4px">Qtà ${qtyKit} pz/ordine</div>
      <div style="font-size:22px;font-weight:900;color:#10b981">${fmt(pKit)}</div>
      <div style="font-size:9px;color:#6ee7b7;margin-top:2px">Margine ${mg(pKit)}%</div>
      ${mbar(mg(pKit),'#10b981')}
      <div style="font-size:9px;color:#64748b;margin-top:5px">Risparmio vs singolo: <strong style="color:#10b981">${fmt(p1-pKit)}/pz</strong></div>
    </div>
    <div style="background:#6366f120;border-radius:7px;padding:9px;border:1px solid #818cf840;text-align:center">
      <div style="font-size:9px;color:#c4b5fd;font-weight:700;text-transform:uppercase;margin-bottom:2px">🏭 STOCK ASSOC.</div>
      <div style="font-size:9px;color:#475569;margin-bottom:4px">Qtà ${qtyStock}+ pz/ordine</div>
      <div style="font-size:22px;font-weight:900;color:#818cf8">${fmt(pStock)}</div>
      <div style="font-size:9px;color:#a5b4fc;margin-top:2px">Margine ${mg(pStock)}%</div>
      ${mbar(mg(pStock),'#818cf8')}
      <div style="font-size:9px;color:#64748b;margin-top:5px">Risparmio vs singolo: <strong style="color:#818cf8">${fmt(p1-pStock)}/pz</strong></div>
    </div>
  </div>
  <div style="background:#0a0e1a;border-radius:6px;padding:8px;display:flex;gap:6px;flex-wrap:wrap">
    <div style="font-size:10px;color:#64748b;font-weight:700;width:100%;margin-bottom:3px">📊 Redditività per batch (stimata fattura lorda)</div>
    ${[[1,'🎯',p1,'#6366f1'],[qtyKit,'🏫',pKit,'#10b981'],[qtyStock,'🏭',pStock,'#818cf8']].map(([q,ic,pr,cl])=>`<div style="background:#1e293b;border-radius:5px;padding:5px 8px;flex:1;min-width:60px"><div style="font-size:9px;color:${cl};font-weight:700">${ic} ×${q} pz</div><div style="font-size:13px;font-weight:800;color:#fff">${fmt(pr*q)}</div><div style="font-size:9px;color:#475569">+${fmt((pr-tc)*q)} utile</div></div>`).join('')}
  </div>
</div>`;
  },
  applyCalcPrices(tc,p1,pKit,pStock){
    const sv=(id,v)=>{const el=document.getElementById(id);if(el)el.value=(+v).toFixed(2);};
    sv('cat-cost',tc);sv('cat-price',p1);sv('cat-price-kit',pKit);sv('cat-price-stock',pStock);
    const b=document.getElementById('calc-manual-badge');if(b)b.style.display='none';
    toast('Prezzi applicati ✅','success');
  },
  autoCalcPrices(){this.smartRecalc();},
  recalcB2B(){
    // Source of truth: smart calc prices from Prodotto tab
    const baseCost=+document.getElementById('cat-cost')?.value||+eid('b2b-mat-cost')?.value||0;
    const baseP1=+document.getElementById('cat-price')?.value||0;
    // Apply discounts on top of campione price
    const campDisc=(+eid('b2b-camp-disc')?.value||0)/100;
    const campPrice=baseP1>0?+(baseP1*(1-campDisc)).toFixed(2):0;
    if(eid('b2b-camp-price')&&!eid('b2b-camp-price')._manualEdit&&campPrice>0)eid('b2b-camp-price').value=campPrice;
    const kitDisc=(+eid('b2b-kit-disc')?.value||15)/100;
    const kitPrice=baseP1>0?+(baseP1*(1-kitDisc)).toFixed(2):+document.getElementById('cat-price-kit')?.value||0;
    const kitQty=+eid('b2b-kit-qty')?.value||25;
    if(eid('b2b-kit-price')&&!eid('b2b-kit-price')._manualEdit&&kitPrice>0)eid('b2b-kit-price').value=kitPrice;
    if(eid('b2b-kit-total'))eid('b2b-kit-total').value=(kitPrice*kitQty).toFixed(2);
    const stockDisc=(+eid('b2b-stock-disc')?.value||25)/100;
    const stockPrice=baseP1>0?+(baseP1*(1-stockDisc)).toFixed(2):+document.getElementById('cat-price-stock')?.value||0;
    const stockQty=+eid('b2b-stock-qty')?.value||100;
    if(eid('b2b-stock-price')&&!eid('b2b-stock-price')._manualEdit&&stockPrice>0)eid('b2b-stock-price').value=stockPrice;
    if(eid('b2b-stock-total'))eid('b2b-stock-total').value=(stockPrice*stockQty).toFixed(2);
    // Update margin displays
    const fmt=v=>'€'+(+v).toFixed(2);
    const mg=(v)=>baseCost>0&&v>0?Math.round((v-baseCost)/v*100)+'%':'—';
    const sd=id=>document.getElementById(id);
    if(sd('b2b-disp-cost'))sd('b2b-disp-cost').textContent=baseCost>0?fmt(baseCost):'—';
    if(sd('b2b-disp-single'))sd('b2b-disp-single').textContent=campPrice>0?fmt(campPrice):baseP1>0?fmt(baseP1):'—';
    if(sd('b2b-disp-kit'))sd('b2b-disp-kit').textContent=kitPrice>0?fmt(kitPrice):'—';
    if(sd('b2b-disp-stock'))sd('b2b-disp-stock').textContent=stockPrice>0?fmt(stockPrice):'—';
    if(sd('b2b-camp-margin'))sd('b2b-camp-margin').textContent='Margine: '+mg(campPrice||baseP1);
    if(sd('b2b-kit-margin'))sd('b2b-kit-margin').textContent='Margine: '+mg(kitPrice);
    if(sd('b2b-stock-margin'))sd('b2b-stock-margin').textContent='Margine: '+mg(stockPrice);
  },
  recalcKitFromTotal(){
    const qty=+eid('b2b-kit-qty')?.value||25;
    const total=+eid('b2b-kit-total')?.value||0;
    if(total && qty && eid('b2b-kit-price')) eid('b2b-kit-price').value=(total/qty).toFixed(2);
  },
  async aiSuggestPrices(){
    const el=eid('b2b-ai-suggestion');if(!el)return;
    el.innerHTML='<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:12px">✨ Analisi AI in corso...</div>';
    const name=eid('cat-name')?.value||'prodotto';
    const mat=eid('cat-material')?.value||'';
    const size=eid('cat-size')?.value||'';
    const unitCost=eid('b2b-unit-cost-display')?.textContent?.replace('€','').trim()||'sconosciuto';
    try{
      const resp=await AIProvider.call(`Sei un esperto di pricing per artigiani laser italiani.
Prodotto: "${name}" ${mat?'| Materiale: '+mat:''} ${size?'| Dimensioni: '+size:''}
Costo unitario stimato: €${unitCost}

Suggerisci prezzi B2B ottimali per il mercato italiano (Etsy, scuole, associazioni):
1. Campione singolo (1pz) 
2. Kit classe (25-30pz) - prezzo per pezzo
3. Stock associazioni (100pz) - prezzo per pezzo
4. Margine consigliato per ciascuna fascia

Rispondi in modo conciso con solo i prezzi e 1 riga di spiegazione per fascia. Non superare 150 parole.`, 400);
      el.innerHTML=`<div style="padding:14px;background:linear-gradient(135deg,#6366f115,#8b5cf615);border-radius:10px;border:1px solid #6366f140">
        <div style="font-size:11px;font-weight:700;color:#a5b4fc;margin-bottom:8px">✨ Suggerimento AI</div>
        <div style="font-size:12px;line-height:1.7;white-space:pre-wrap;color:var(--text)">${resp}</div>
      </div>`;
    }catch(e){
      el.innerHTML=`<div style="font-size:11px;color:var(--red);padding:8px">Errore AI: ${e.message}</div>`;
    }
  },
  _lastDesc:'',
  _copyDesc(){ navigator.clipboard.writeText(this._lastDesc||''); },
  async genEtsyDesc(){
    const out=eid('cat-etsy-output');if(!out)return;
    const name=eid('cat-name')?.value?.trim()||'';
    if(!name){toast('Prima inserisci il nome prodotto nel tab Prodotto','warning');return;}
    out.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">✨ Generazione listing in corso...</div>';
    const mat=eid('cat-material')?.value||'';
    const size=eid('cat-size')?.value||'';
    const desc=eid('cat-desc')?.value||'';
    const tags=eid('cat-tags')?.value||'';
    const price=eid('cat-price')?.value||'';
    const market=eid('cat-etsy-market')?.value||'italiano';
    const occasion=eid('cat-etsy-occasion')?.value||'regalo personalizzato';
    const strengths=eid('cat-etsy-strengths')?.value||'';
    try{
      const resp=await AIProvider.call(`Sei un esperto SEO di Etsy per artigiani italiani. Crea un listing ottimizzato completo.

PRODOTTO: ${name}
${mat?'MATERIALE: '+mat:''}
${size?'DIMENSIONI: '+size:''}
${desc?'DESCRIZIONE ESISTENTE: '+desc:''}
${tags?'TAG ESISTENTI: '+tags:''}
${price?'PREZZO: €'+price:''}
LINGUA: ${market}
OCCASIONE: ${occasion}
${strengths?'PUNTI DI FORZA: '+strengths:''}

Genera ESATTAMENTE in questo formato:

**TITOLO (130 car max, keyword-rich):**
[titolo ottimizzato]

**13 TAG SEO (separati da virgola):**
[tag1, tag2, ..., tag13]

**DESCRIZIONE ETSY COMPLETA:**
[descrizione di 200-300 parole con: apertura emozionale, caratteristiche, personalizzazione, spedizione, CTA finale]`, 1200);
      // Parse response
      const titleMatch=resp.match(/\*\*TITOLO[\s\S]*?([^\n*][^\n]{3,})/i);
      const tagsMatch=resp.match(/\*\*13 TAG[\s\S]*?([^\n*][^\n]{5,})/i);
      const descMatch=resp.match(/\*\*DESCRIZIONE[\s\S]*?\n([\s\S]{20,})$/i);
      const title=titleMatch?titleMatch[1].trim():'';
      const genTags=tagsMatch?tagsMatch[1].trim():'';
      const genDesc=descMatch?descMatch[1].trim():resp;
      // Show formatted output
      out.innerHTML=`<div style="display:flex;flex-direction:column;gap:12px">
        ${title?`<div style="background:var(--bg-card2);border-radius:8px;padding:12px;border-left:3px solid #f0728f">
          <div style="font-size:10px;font-weight:700;color:#f0728f;margin-bottom:4px;text-transform:uppercase">📝 Titolo (${title.length}/130)</div>
          <div style="font-size:13px;font-weight:600;color:var(--text)">${title}</div>
          <button onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent);toast('Titolo copiato!')" style="margin-top:6px;padding:3px 10px;background:#f0728f20;color:#f0728f;border:1px solid #f0728f40;border-radius:5px;cursor:pointer;font-size:10px">📋 Copia</button>
        </div>`:''}
        ${genTags?`<div style="background:var(--bg-card2);border-radius:8px;padding:12px;border-left:3px solid #10b981">
          <div style="font-size:10px;font-weight:700;color:#10b981;margin-bottom:6px;text-transform:uppercase">🏷️ 13 Tag SEO</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">${genTags.split(',').map(t=>`<span style="background:#10b98120;color:#10b981;border:1px solid #10b98140;border-radius:99px;padding:2px 8px;font-size:11px">${t.trim()}</span>`).join('')}</div>
          <button onclick="navigator.clipboard.writeText('${genTags.replace(/'/g,"\'")}');toast('Tag copiati!')" style="margin-top:6px;padding:3px 10px;background:#10b98120;color:#10b981;border:1px solid #10b98140;border-radius:5px;cursor:pointer;font-size:10px">📋 Copia tag</button>
        </div>`:''}
        ${genDesc?`<div style="background:var(--bg-card2);border-radius:8px;padding:12px;border-left:3px solid #6366f1">
          <div style="font-size:10px;font-weight:700;color:#6366f1;margin-bottom:6px;text-transform:uppercase">📖 Descrizione Completa</div>
          <div style="font-size:12px;line-height:1.7;color:var(--text);white-space:pre-wrap">${genDesc.substring(0,600)}${genDesc.length>600?'…':''}</div>
          <button onclick="Catalog._copyDesc();toast('Descrizione copiata!')" style="margin-top:6px;padding:3px 10px;background:#6366f120;color:#6366f1;border:1px solid #6366f140;border-radius:5px;cursor:pointer;font-size:10px">📋 Copia tutto</button>
        </div>`:''}
      </div>`;
      // Auto-save to fields
      Catalog._lastDesc = genDesc;
      if(eid('cat-etsy-saved')) eid('cat-etsy-saved').value=genDesc;
      if(eid('cat-etsy-tags-saved')) eid('cat-etsy-tags-saved').value=genTags;
      // Also update main desc if empty
      const mainDesc=eid('cat-desc');
      if(mainDesc && !mainDesc.value && genDesc) mainDesc.value=genDesc.substring(0,300);
      const mainTags=eid('cat-tags');
      if(mainTags && !mainTags.value && genTags) mainTags.value=genTags;
    }catch(e){
      out.innerHTML=`<div style="padding:12px;color:var(--red);font-size:12px">❌ Errore: ${e.message}</div>`;
    }
  },
  async save(){
    const name=eid('cat-name')?.value?.trim();
    if(!name){toast('Nome prodotto obbligatorio','warning');return;}
    const prod={
      name,
      category:eid('cat-cat').value,
      costPrice:+eid('cat-cost')?.value||0,
      salePrice:+eid('cat-price')?.value||0,
      desc:eid('cat-desc')?.value||'',
      tags:eid('cat-tags')?.value||'',
      emoji:eid('cat-emoji')?.value||'🎁',
      trendScore:+eid('cat-trend')?.value||0,
      material:eid('cat-material')?.value||'',
      size:eid('cat-size')?.value||'',
      productionTime:+eid('cat-time')?.value||0,
      etsyRef:eid('cat-etsy')?.value||'',
      notes:eid('cat-notes')?.value||'',
      // Smart calc state
      priceKit:+eid('cat-price-kit')?.value||0,
      priceStock:+eid('cat-price-stock')?.value||0,
      lcMatId:document.getElementById('cat-material-sel')?.value||'',
      lcPw:+document.getElementById('cat-pw')?.value||0,
      lcPh:+document.getElementById('cat-ph')?.value||0,
      lcPerim:+document.getElementById('cat-perim')?.value||0,
      lcEngr:+document.getElementById('cat-engr')?.value||0,
      lcQtyKit:+document.getElementById('cat-qty-kit')?.value||30,
      lcQtyStock:+document.getElementById('cat-qty-stock')?.value||100,
      lcSheetCost:+document.getElementById('cat-mat-sheet')?.value||0,
      lcCutMin:+document.getElementById('cat-cut-min')?.value||0,
      lcEngrMin:+document.getElementById('cat-engr-min')?.value||0,
      lcLaborMin:+document.getElementById('cat-labor-min')?.value||0,
      lcLaborRate:+document.getElementById('cat-labor-rate')?.value||18,
      lcPaintCost:+document.getElementById('cat-paint-cost')?.value||0,
      lcPaintType:document.getElementById('cat-paint-type')?.value||'',
      lcPackCost:+document.getElementById('cat-pack-cost')?.value||0,
      lcExtraCost:+document.getElementById('cat-extra-cost')?.value||0,
      lcWorkNote:document.getElementById('cat-work-note')?.value||'',
      lcHasPaint:document.getElementById('cat-has-paint')?.checked||false,
      lcHasLabor:document.getElementById('cat-has-labor')?.checked||true,
      // B2B tiers (kept for compatibility)
      b2bTiers:{
        matCost:+eid('b2b-mat-cost')?.value||0,
        laborRate:+eid('b2b-labor')?.value||18,
        machineRate:+eid('b2b-machine')?.value||0.35,
        campione:{price:+eid('b2b-camp-price')?.value||0, disc:+eid('b2b-camp-disc')?.value||0, note:eid('b2b-camp-note')?.value||''},
        kit:{qty:+eid('b2b-kit-qty')?.value||25, price:+eid('b2b-kit-price')?.value||+eid('cat-price-kit')?.value||0, disc:+eid('b2b-kit-disc')?.value||15, note:eid('b2b-kit-note')?.value||''},
        stock:{qty:+eid('b2b-stock-qty')?.value||100, price:+eid('b2b-stock-price')?.value||+eid('cat-price-stock')?.value||0, disc:+eid('b2b-stock-disc')?.value||25, note:eid('b2b-stock-note')?.value||''},
        custom:{name:eid('b2b-custom-name')?.value||'', qty:+eid('b2b-custom-qty')?.value||0, price:+eid('b2b-custom-price')?.value||0, note:eid('b2b-custom-note')?.value||''},
      },
      // Etsy SEO
      etsyDesc:eid('cat-etsy-saved')?.value||'',
      etsyTagsSEO:eid('cat-etsy-tags-saved')?.value||'',
    };
    if(this._photo)prod.photo=this._photo;
    // Preserva i dati ricchi Ingly e lo SKU sulle modifiche (save ricostruisce l'oggetto da zero)
    if(this._editIngly)prod.ingly=this._editIngly;
    if(this._editSku)prod.sku=this._editSku;
    if(this.editId){prod.id=this.editId;}else{prod.id=Date.now();}
    await IDB.put('catalog',prod).catch(e=>{toast('Errore salvataggio: '+e.message,'error');return;});
    AppStore.invalidate('catalog');
    toast(this.editId?'Prodotto aggiornato! ✅':'Prodotto aggiunto! ✅');
    closeModal('catalog');this.editId=null;this._photo=null;
    await this.render();
  },
  async del(id){
    if(!await askConfirm('Eliminare questo prodotto dal catalogo?'))return;
    await IDB.del('catalog',id).catch(e=>console.warn('[Catalog.del]',e));
    AppStore.invalidate('catalog');
    toast('Prodotto eliminato','warning');
    await this.render();
  },

  // ═══ Quick price editor + bulk operations ═══
  async quickEditPrice(productId, currentPrice, e) {
    e?.stopPropagation();
    const newPrice = await askPrompt('Nuovo prezzo di vendita (€):', currentPrice||'', {type:'number'});
    if(newPrice===null || newPrice==='') return;
    const price = parseFloat(newPrice);
    if(isNaN(price)||price<=0){ if(typeof toast!=='undefined') toast('Prezzo non valido','warning'); return; }
    const product = await IDB.get('catalog', +productId||productId).catch(()=>null);
    if(!product) return;
    const oldPrice = product.salePrice;
    product.salePrice = price;
    await IDB.put('catalog', product);
    if(typeof toast!=='undefined') toast(`✅ Prezzo aggiornato: €${oldPrice} → €${price}`,'success');
    this.render();
  },

  async bulkMarginFix() {
    const items = await IDB.getAll('catalog').catch(()=>[]);
    const low = items.filter(i=>i.costPrice>0&&i.salePrice>0&&(i.salePrice-i.costPrice)/i.salePrice<0.3);
    if(!low.length){ if(typeof toast!=='undefined') toast('✅ Nessun prodotto sotto il 30% di margine!','success'); return; }

    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.onclick = e=>{ if(e.target===ov) ov.remove(); };
    ov.innerHTML = `
    <div style="background:var(--bg-card);border-radius:14px;width:min(560px,100%);max-height:88vh;overflow-y:auto;border:1px solid var(--border2)" onclick="event.stopPropagation()">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);font-size:14px;font-weight:800">
        🔧 ${low.length} prodotti con margine basso — Correzione rapida
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:8px">
        ${low.map(p=>{
          const curMargin = Math.round((p.salePrice-p.costPrice)/p.salePrice*100);
          const price45 = Math.ceil(p.costPrice/(1-0.45));
          const price35 = Math.ceil(p.costPrice/(1-0.35));
          return `<div style="background:var(--bg-card2);border-radius:10px;padding:11px 13px;border:1px solid rgba(239,68,68,.15)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <div style="flex:1;font-size:13px;font-weight:700">${p.name}</div>
              <span style="background:rgba(239,68,68,.12);color:#ef4444;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700">${curMargin}% mg</span>
            </div>
            <div style="display:flex;gap:6px;align-items:center;font-size:11px;flex-wrap:wrap">
              <span style="color:var(--text-muted)">Costo: <b>€${p.costPrice}</b> · Attuale: <b>€${p.salePrice}</b></span>
              <span style="color:var(--text-dim)">→</span>
              <button onclick="Catalog._applyNewPrice(${p.id},${price35})" style="padding:4px 10px;background:rgba(245,158,11,.12);color:#f59e0b;border:1px solid rgba(245,158,11,.3);border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">€${price35} (35%)</button>
              <button onclick="Catalog._applyNewPrice(${p.id},${price45})" style="padding:4px 10px;background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.3);border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">€${price45} (45%)</button>
            </div>
          </div>`;
        }).join('')}
        <div style="display:flex;gap:8px;margin-top:4px">
          <button onclick="this.closest('[style*=fixed]').remove()" style="flex:1;padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:13px">Chiudi</button>
          <button onclick="Catalog._bulkApplyAll45();this.closest('[style*=fixed]').remove()"
            style="flex:2;padding:10px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">✅ Applica 45% a tutti</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(ov);
  },

  async _applyNewPrice(id, price) {
    const p = await IDB.get('catalog', +id||id).catch(()=>null);
    if(!p) return;
    p.salePrice = price;
    await IDB.put('catalog', p);
    if(typeof toast!=='undefined') toast(`✅ ${p.name}: €${price}`,'success');
    // Remove from list
    const all = document.querySelectorAll('[onclick*="_applyNewPrice('+id+',"]');
    all.forEach(b=>b.closest('[style*="border:1px solid rgba(239,68,68"]')?.remove());
  },

  async _bulkApplyAll45() {
    const items = await IDB.getAll('catalog').catch(()=>[]);
    const low = items.filter(i=>i.costPrice>0&&i.salePrice>0&&(i.salePrice-i.costPrice)/i.salePrice<0.3);
    for(const p of low) {
      p.salePrice = Math.ceil(p.costPrice/(1-0.45));
      await IDB.put('catalog', p);
    }
    if(typeof toast!=='undefined') toast(`✅ ${low.length} prezzi aggiornati a 45% margine!`,'success');
    this.render();
  },

  async exportCatalogCSV() {
    const items = await IDB.getAll('catalog').catch(()=>[]);
    if(!items.length){ if(typeof toast!=='undefined') toast('Catalogo vuoto','warning'); return; }
    const cols = ['name','sku','category','salePrice','costPrice','description','unit'];
    const headers = ['Nome','SKU','Categoria','Prezzo Vendita','Costo Produzione','Descrizione','Unità'];
    const csv = [
      headers.join(','),
      ...items.map(i=>cols.map(c=>`"${(i[c]||'').toString().replace(/"/g,'""')}"`).join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'catalogo_ingly_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    if(typeof toast!=='undefined') toast(`📤 ${items.length} prodotti esportati!`,'success');
  },

  _activeMarginFilter: '',

  _filterMargin(val){
    this._activeMarginFilter = val;
    this.render();
  },

  toggleOnlyIngly(){
    this._onlyIngly = !this._onlyIngly;
    const b = document.getElementById('cat-only-ingly');
    if(b){
      b.style.background = this._onlyIngly ? 'var(--primary)' : 'transparent';
      b.style.color = this._onlyIngly ? '#0a0a0a' : 'var(--text-muted)';
      b.style.borderColor = this._onlyIngly ? 'var(--primary)' : 'var(--border2)';
    }
    this.render();
  },
  _resetFilters(){
    this._activeMarginFilter = '';
    this._onlyIngly = false;
    { const b=document.getElementById('cat-only-ingly'); if(b){ b.style.background='transparent'; b.style.color='var(--text-muted)'; b.style.borderColor='var(--border2)'; } }
    this.filterCat('');
    this.search('');
    this.sortBy('name');
    const mf = document.getElementById('cat-margin-filter');
    const cf = document.getElementById('cat-filter');
    const cs = document.getElementById('cat-sort');
    const si = document.getElementById('cat-search-input');
    if(mf) mf.value='';
    if(cf) cf.value='';
    if(cs) cs.value='name';
    if(si) si.value='';
    if(typeof toast!=='undefined') toast('Filtri catalogo rimossi','info');
  },

  _applyMarginFilter(items){
    if(!this._activeMarginFilter) return items;
    return items.filter(p=>{
      if(!p.costPrice||!p.salePrice) return this._activeMarginFilter===''||this._activeMarginFilter==='high';
      const mg=(p.salePrice-p.costPrice)/p.salePrice*100;
      if(this._activeMarginFilter==='high')     return mg>50;
      if(this._activeMarginFilter==='mid')      return mg>=30&&mg<=50;
      if(this._activeMarginFilter==='low')      return mg<30&&mg>0;
      if(this._activeMarginFilter==='negative') return mg<=0;
      return true;
    });
  }
};
if(typeof Catalog!=="undefined")window.Catalog=Catalog; // immediate window export


// ===== CLIENTS - need populateSelect for projects  =====
// ===== MARKETING =====
/* PricingEngine non calcola più: traduce. La matematica sta in
   `InglyCostEngine`, profilo generico — lo stesso motore del quoter 3D, del
   laser e del tessile. Qui restano gli ingressi e la forma del risultato, che
   il Catalogo e il Product Builder si aspettano invariata.

   I numeri non cambiano: `suggest` chiedeva un prezzo da **ricarico** e
   continua a chiederlo. Cambia che il ricarico e il margine ora hanno un solo
   posto dove sono definiti, e che le voci aggiuntive (profitto, scaglioni di
   quantità, avviamento ammortizzato) arrivano gratis dallo stesso conto. */
const PricingEngine={
  async suggest({materialCost=0,machineMin=0,laborMin=0,category='',qty=1,setupCost=0,extras=[]}={}){
    const cfg=await IDB.get('settings','main')||{};
    const mcost=+cfg.machineCost||0.35,lcost=+cfg.laborCost||0.50;
    const markup=+cfg.markup||40,vat=+cfg.vat||22;
    const motore=(typeof window!=='undefined')&&window.InglyCostEngine;

    if(!motore){
      /* Senza il motore non si indovina un prezzo: si dice che manca. */
      return{empty:true,reason:'Motore di costo non disponibile',totalCost:0,net:0,gross:0,margin:0,markup};
    }

    const ingresso={
      tecnologia:'generico',
      qty:Math.max(1,+qty||1),
      costiUnaTantum:+setupCost>0?[{id:'avviamento',label:'Avviamento',value:+setupCost}]:[],
      costiPerPezzo:[
        {id:'materiale',label:'Materiale',value:+materialCost||0},
        {id:'macchina', label:'Macchina', value:(+machineMin||0)*mcost,detail:(+machineMin||0)+' min'},
        {id:'manodopera',label:'Manodopera',value:(+laborMin||0)*lcost,detail:(+laborMin||0)+' min',perdibile:false},
      ],
      extras:extras,
    };
    const opzioni={strategia:'ricarico',ricarico:1+markup/100,ivaPct:vat};

    const c=motore.calcola(ingresso);
    const p=motore.prezzo(c.costoPezzo,opzioni);

    return{
      /* Forma storica, invariata per chi la legge già. */
      totalCost:+c.costoPezzo.toFixed(2),
      net:+p.netto.toFixed(2),
      gross:+p.lordo.toFixed(2),
      margin:+p.marginePct.toFixed(1),
      markup,
      /* Voci nuove: additive, nessun chiamante esistente le vede sparire. */
      realCost:c.costoPezzo,
      costPerUnit:c.costoPezzo,
      priceNet:p.netto,
      vat:p.iva,
      priceGross:p.lordo,
      profit:p.profittoLordo,
      profitOperating:p.profittoOperativo,
      markupPct:p.ricaricoPct,
      setupPerUnit:c.unaTantum.perPezzo,
      quantityTiers:motore.scaglioni(ingresso,null,opzioni),
      breakdown:c.perPezzo.voci,
      category,
    };
  }
};

// ===== EQUIPMENT =====
const Components={
  editId:null,filterVal:'',catFilter:'',viewMode:'grid',
  catData:{
    'Basi Legno':{emoji:'🪵',color:'#a16207'},
    'LED & Luci':{emoji:'💡',color:'var(--primary)'},
    'Colle & Adesivi':{emoji:'🧴',color:'var(--blue)'},
    'Cornici & Supporti':{emoji:'🖼️',color:'var(--purple)'},
    'Plexiglass Tagliato':{emoji:'🔷',color:'#60a5fa'},
    'Gadget & Minuteria':{emoji:'⭐',color:'var(--orange)'},
    'Imballaggi':{emoji:'📦',color:'var(--text-muted)'},
    'Elettronica':{emoji:'🔌',color:'var(--green)'},
    'Altro':{emoji:'🔩',color:'var(--text-muted)'}
  },
  async render(){
    const items=await IDB.getAll('components');
    const filtered=items.filter(i=>{
      const matchCat=!this.catFilter||i.cat===this.catFilter;
      const matchSearch=!this.filterVal||i.name.toLowerCase().includes(this.filterVal)||(i.usedIn||'').toLowerCase().includes(this.filterVal)||(i.supplier||'').toLowerCase().includes(this.filterVal);
      return matchCat&&matchSearch;
    });
    const totVal=items.reduce((a,i)=>a+(+i.stock||0)*(+i.cost||0),0);
    const lowStock=items.filter(i=>(+i.stock||0)<=(+i.minStock||0));
    const cats=new Set(items.map(i=>i.cat)).size;
    const kpis=eid('components-kpis');
    if(kpis)kpis.innerHTML=[
      {l:'Componenti Totali',v:items.length,i:'fa-puzzle-piece',c:'var(--primary)'},
      {l:'Valore Magazzino',v:fmtCur(totVal),i:'fa-euro-sign',c:'var(--green)'},
      {l:'Sotto Scorta',v:lowStock.length,i:'fa-exclamation-triangle',c:lowStock.length>0?'var(--red)':'var(--text-muted)'},
      {l:'Categorie',v:cats,i:'fa-tag',c:'var(--blue)'},
    ].map(k=>`<div class="kpi-card"><i class="fas ${k.i} kpi-icon" style="color:${k.c}"></i><div class="kpi-value" style="font-size:20px">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');
    const alertEl=eid('components-alerts');
    if(alertEl&&lowStock.length)alertEl.innerHTML=`<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i> <strong>${lowStock.length} componenti sotto scorta:</strong> ${lowStock.map(i=>`<strong>${typeof sanitize==='function'?sanitize(i.name):String(i.name||'')}</strong>`).join(', ')}</div>`;
    else if(alertEl)alertEl.innerHTML='';
    const el=eid('components-grid');if(!el)return;
    if(!filtered.length){
      el.innerHTML=`<div class="empty-state"><i class="fas fa-puzzle-piece"></i><p>Nessun componente trovato.<br>Aggiungi basi legno, LED, colle, cornici e tutti i tuoi accessori di produzione!</p></div>`;
      return;
    }
    if(this.viewMode==='grid'){
      el.innerHTML=`<div class="grid-4">${filtered.map(i=>{
        const pct=i.minStock>0?Math.min(100,Math.round((+i.stock||0)/(+i.minStock||1)*100)):100;
        const isLow=(+i.stock||0)<=(+i.minStock||0);
        const catInfo=this.catData[i.cat]||{emoji:'🔩',color:'var(--text-muted)'};
        const totalVal=(+i.stock||0)*(+i.cost||0);
        return`<div class="card" style="position:relative">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div style="width:44px;height:44px;background:${catInfo.color}18;border:1px solid ${catInfo.color}30;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px">${i.emoji||catInfo.emoji}</div>
            <span class="badge badge-gray" style="font-size:9px">${i.cat}</span>
          </div>
          <div style="font-weight:700;font-size:13px;color:#fff;margin-bottom:4px;line-height:1.3">${i.name}</div>
          ${i.usedIn?`<div style="font-size:10px;color:var(--text-dim);margin-bottom:8px;line-height:1.4"><i class="fas fa-cube" style="margin-right:3px;color:var(--primary)"></i>${i.usedIn}</div>`:''}
          <div class="flex-between" style="margin-bottom:4px">
            <span class="text-muted" style="font-size:12px">Stock</span>
            <strong style="color:${isLow?'var(--red)':pct<80?'var(--orange)':'var(--green)'};font-size:14px">${i.stock} ${i.unit||'pz'}</strong>
          </div>
          <div class="progress mb-6" style="height:4px"><div class="progress-bar ${isLow?'red':pct<80?'':'green'}" style="width:${pct}%"></div></div>
          ${isLow?`<div style="background:#ef444415;border:1px solid #ef444430;border-radius:5px;padding:4px 7px;font-size:10px;color:var(--red);margin-bottom:8px">⚠️ Sotto scorta — min. ${i.minStock} ${i.unit||'pz'}</div>`:''}
          <div class="flex-between mt-auto">
            <span style="font-size:11px;color:var(--text-muted)">${fmtCur(i.cost)}/u</span>
            <span style="color:var(--primary);font-weight:700;font-size:13px">${fmtCur(totalVal)}</span>
          </div>
          ${i.supplier?`<div style="font-size:11px;color:var(--text-dim);margin-top:4px"><i class="fas fa-truck" style="margin-right:3px"></i>${i.supplier}</div>`:''}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:10px">
            <button class="act-btn" style="background:#ef444415;color:#f87171;border-color:#ef444430;justify-content:center" onclick="Components.use(${i.id})"><i class="fas fa-minus"></i> Usa</button>
            <button class="act-btn" style="background:#22c55e15;color:#4ade80;border-color:#22c55e30;justify-content:center" onclick="Components.restock(${i.id})"><i class="fas fa-plus"></i> Rifornisci</button>
          </div>
          <div class="act-group mt-5">
            <button class="act-btn act-edit" style="flex:1;justify-content:center" onclick="Components.openModal(${i.id})"><i class="fas fa-edit"></i> Modifica</button>
            <button class="act-btn act-del" onclick="Components.del(${i.id})"><i class="fas fa-trash"></i></button>
          </div>
        </div>`;
      }).join('')}</div>`;
    } else {
      el.innerHTML=`<div class="table-wrap"><table><thead><tr>
        <th>Componente</th><th>Categoria</th><th>Stock</th><th>Min.</th><th>Costo</th><th>Valore</th><th>Usato in</th><th>Fornitore</th><th>Azioni</th>
      </tr></thead><tbody>${filtered.map(i=>{
        const isLow=(+i.stock||0)<=(+i.minStock||0);
        const catInfo=this.catData[i.cat]||{emoji:'🔩',color:'var(--text-muted)'};
        return`<tr>
          <td><div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">${i.emoji||catInfo.emoji}</span><strong>${i.name}</strong></div></td>
          <td><span class="badge badge-gray" style="font-size:10px">${i.cat}</span></td>
          <td>
            <div style="display:flex;align-items:center;gap:5px">
              <button class="act-btn" style="background:#ef444415;color:#f87171;border-color:#ef444430;padding:2px 7px;font-size:12px" onclick="Components.use(${i.id})">−</button>
              <strong style="color:${isLow?'var(--red)':''}">${i.stock} ${i.unit||'pz'}</strong>
              <button class="act-btn" style="background:#22c55e15;color:#4ade80;border-color:#22c55e30;padding:2px 7px;font-size:12px" onclick="Components.restock(${i.id})">+</button>
            </div>
            ${isLow?`<span style="font-size:10px;color:var(--red)">⚠️ Bassa</span>`:''}
          </td>
          <td style="color:var(--text-muted)">${i.minStock}</td>
          <td>${fmtCur(i.cost)}</td>
          <td><strong style="color:var(--primary)">${fmtCur((+i.stock||0)*(+i.cost||0))}</strong></td>
          <td style="font-size:12px;color:var(--text-dim);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i.usedIn||'—'}</td>
          <td style="font-size:12px;color:var(--text-muted)">${i.supplier||'—'}</td>
          <td><div class="act-group">
            <button class="act-btn act-edit" onclick="Components.openModal(${i.id})"><i class="fas fa-edit"></i></button>
            <button class="act-btn act-del" onclick="Components.del(${i.id})"><i class="fas fa-trash"></i></button>
          </div></td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
    }
  },
  filter(v){this.filterVal=v.toLowerCase();this.render();},
  filterCat(v){this.catFilter=v;this.render();},
  view(mode,btn){
    this.viewMode=mode;
    const tabs=document.querySelectorAll('#view-components .tabs .tab-btn');
    tabs.forEach(b=>b.classList.remove('active'));
    if(btn)btn.classList.add('active');
    this.render();
  },
  async use(id){
    const i=await IDB.get('components',id);if(!i)return;
    const qty=+await askPrompt(`Disponibili: ${i.stock} ${i.unit||'pz'}`,1,{title:`Quante unità di "${i.name}" hai usato?`,type:'number'});
    if(!qty||qty<=0)return;
    if((+i.stock||0)<qty){toast('Quantità superiore allo stock disponibile!','error');return;}
    i.stock=Math.max(0,(+i.stock||0)-qty);
    await IDB.put('components',i);
    toast(`−${qty} ${i.unit||'pz'} di ${i.name}`,'info');
    await this.render();
  },
  async restock(id){
    const i=await IDB.get('components',id);if(!i)return;
    const qty=+await askPrompt(`Quante unità aggiungere a "${i.name}"?`,10,{type:'number'});
    if(!qty||qty<=0)return;
    i.stock=(+i.stock||0)+qty;
    await IDB.put('components',i);
    toast(`+${qty} ${i.unit||'pz'} di ${i.name} aggiunto! ✅`,'success');
    await this.render();
  },
  async openModal(id=null){
    this.editId=id;
    eid('modal-comp-title').textContent=id?'Modifica Componente':'Nuovo Componente';
    if(id){
      const i=await IDB.get('components',id);if(!i)return;
      eid('comp-name').value=i.name||'';eid('comp-emoji').value=i.emoji||'';
      eid('comp-cat').value=i.cat||'Basi Legno';eid('comp-unit').value=i.unit||'pz';
      eid('comp-stock').value=i.stock||0;eid('comp-min').value=i.minStock||5;
      eid('comp-cost').value=i.cost||0;eid('comp-supplier').value=i.supplier||'';
      eid('comp-sku').value=i.sku||'';eid('comp-usedIn').value=i.usedIn||'';
      eid('comp-notes').value=i.notes||'';
    }else{
      ['comp-name','comp-emoji','comp-supplier','comp-sku','comp-usedIn','comp-notes'].forEach(f=>{const el=eid(f);if(el)el.value='';});
      eid('comp-stock').value=0;eid('comp-min').value=5;eid('comp-cost').value=0;
    }
    openModal('component');
  },
  async save(){
    const item={
      name:eid('comp-name').value,emoji:eid('comp-emoji').value,
      cat:eid('comp-cat').value,unit:eid('comp-unit').value,
      stock:+eid('comp-stock').value||0,minStock:+eid('comp-min').value||5,
      cost:+eid('comp-cost').value||0,supplier:eid('comp-supplier').value,
      sku:eid('comp-sku').value,usedIn:eid('comp-usedIn').value,
      notes:eid('comp-notes').value
    };
    if(!item.name){toast('Inserisci il nome del componente','error');return;}
    if(this.editId)item.id=this.editId;
    const id=await IDB.put('components',item);
    await logAction('components',id,this.editId?'updated':'created',{name:item.name});
    toast(this.editId?'Componente aggiornato!':'Componente aggiunto!');
    closeModal('component');this.editId=null;await this.render();
  },
  async del(id){
    if(!await askConfirm('Eliminare questo componente?'))return;
    await IDB.del('components',id);toast('Componente eliminato','warning');await this.render()
  }
};

// ===== GADGETS =====
const Gadgets={
  editId:null, filterVal:'', catFilter:'',
  DEFAULTS:[
    {name:'LED Strip RGB 5m',category:'LED & Illuminazione',unit:'pz',cost:4.50,stock:20,minStock:5,usage:'decorazioni luminose',notes:'AliExpress'},
    {name:'Calamita Neodimio 20mm',category:'Magneti & Ganci',unit:'pz',cost:0.15,stock:200,minStock:50,usage:'bacheche e cornici'},
    {name:'Gancio D Metallo 3cm',category:'Magneti & Ganci',unit:'pz',cost:0.20,stock:100,minStock:30,usage:'portachiavi'},
    {name:'Resina Epossidica 1kg',category:'Resine & Colori',unit:'kg',cost:18,stock:5,minStock:2,usage:'colate su legno'},
    {name:'Nastro LED USB 1m',category:'LED & Illuminazione',unit:'pz',cost:3.20,stock:30,minStock:10,usage:'orologi e cornici'},
    {name:'Sacchetto Organza',category:'Packaging',unit:'pz',cost:0.08,stock:500,minStock:100,usage:'confezione bomboniere'},
    {name:'Scatola Kraft 15x15',category:'Packaging',unit:'pz',cost:0.35,stock:100,minStock:30,usage:'packaging prodotti'},
    {name:'Colori Acrilici set 12',category:'Resine & Colori',unit:'set',cost:8.50,stock:8,minStock:3,usage:'pittura su legno'},
  ],
  async seed(){
    const existing=await IDB.getAll('gadgets');
    if(!existing.length)for(const g of this.DEFAULTS)await IDB.put('gadgets',g);
  },
  async render(){
    const items=await IDB.getAll('gadgets');
    const filtered=items.filter(i=>{
      const matchText=!this.filterVal||i.name.toLowerCase().includes(this.filterVal)||(i.notes||'').toLowerCase().includes(this.filterVal);
      const matchCat=!this.catFilter||i.category===this.catFilter;
      return matchText&&matchCat;
    });
    const totalVal=items.reduce((a,i)=>a+(+i.stock||0)*(+i.cost||0),0);
    const lowStock=items.filter(i=>(+i.stock||0)<=(+i.minStock||0));
    const kpis=eid('gadgets-kpis');
    if(kpis)kpis.innerHTML=[
      {l:'Gadget Totali',v:items.length,i:'fa-puzzle-piece',c:'var(--primary)'},
      {l:'Valore Scorte',v:fmtCur(totalVal),i:'fa-euro-sign',c:'var(--green)'},
      {l:'Sotto Scorta Min.',v:lowStock.length,i:'fa-exclamation-triangle',c:'var(--red)'},
      {l:'Categorie',v:new Set(items.map(i=>i.category)).size,i:'fa-layer-group',c:'var(--blue)'},
    ].map(k=>`<div class="kpi-card"><i class="fas ${k.i} kpi-icon" style="color:${k.c}"></i><div class="kpi-value">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');
    const catColors={'LED & Illuminazione':'var(--primary)','Incisione & Stampa':'var(--blue)','Minuteria':'var(--green)','Packaging':'var(--orange)','Magneti & Ganci':'var(--purple)','Resine & Colori':'var(--red)','Altro':'var(--text-muted)'};
    const el=eid('gadgets-grid');if(!el)return;
    el.innerHTML=filtered.map(g=>{
      const valTot=(+g.stock||0)*(+g.cost||0);
      const pct=g.minStock>0?Math.min(100,(+g.stock||0)/(+g.minStock||1)*100):100;
      const low=(+g.stock||0)<=(+g.minStock||0);
      const catColor=catColors[g.category]||'var(--text-muted)';
      return`<div class="card" style="position:relative;border-color:${low?'var(--red)':'var(--border)'}">
        ${low?`<div style="position:absolute;top:8px;right:8px;background:#ef444430;color:var(--red);font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700">⚠️ SOTTO SCORTA</div>`:''}
        <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px">
          <div style="width:44px;height:44px;background:${catColor}18;border:1px solid ${catColor}40;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;overflow:hidden">${g.photo?`<img src="${g.photo}" style="width:100%;height:100%;object-fit:cover">`:`🧩`}</div>
          <div style="flex:1;min-width:0">
            <strong style="font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.name}</strong>
            <span class="badge" style="background:${catColor}18;color:${catColor};font-size:10px;margin-top:3px">${g.category}</span>
          </div>
        </div>
        <div class="stat-row" style="padding:5px 0"><span class="text-muted" style="font-size:12px">Costo unitario</span><span style="color:var(--primary);font-weight:700">${fmtCur(g.cost)}/${g.unit||'pz'}</span></div>
        <div class="stat-row" style="padding:5px 0">
          <span class="text-muted" style="font-size:12px">In stock</span>
          <span style="display:flex;align-items:center;gap:6px">
            <button class="act-btn" style="background:#ef444418;color:#f87171;border-color:#ef444430;padding:2px 7px;font-size:12px" onclick="Gadgets.adjust(${g.id},-1)">−</button>
            <strong style="color:${low?'var(--red)':'#fff'}">${g.stock} ${g.unit||'pz'}</strong>
            <button class="act-btn" style="background:#22c55e18;color:#4ade80;border-color:#22c55e30;padding:2px 7px;font-size:12px" onclick="Gadgets.adjust(${g.id},1)">+</button>
          </span>
        </div>
        <div class="progress mt-8" style="height:3px"><div class="progress-bar ${pct<50?'red':pct<100?'':'green'}" style="width:${Math.min(100,pct)}%"></div></div>
        <div style="font-size:10px;color:var(--text-dim);margin-top:3px">Min: ${g.minStock||0} ${g.unit||'pz'} · Valore: ${fmtCur(valTot)}</div>
        ${g.usage?`<div style="font-size:11px;color:var(--text-muted);margin-top:6px;font-style:italic">📌 ${g.usage}</div>`:''}
        <div class="act-group mt-12">
          <button class="act-btn act-edit" style="flex:1;justify-content:center" onclick="Gadgets.openModal(${g.id})"><i class="fas fa-edit"></i> Modifica</button>
          <button class="act-btn act-del" onclick="Gadgets.del(${g.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
    }).join('')||`<div class="card" style="grid-column:1/-1;text-align:center;padding:40px"><i class="fas fa-puzzle-piece" style="font-size:40px;color:var(--text-dim);display:block;margin-bottom:12px"></i><p class="text-muted">Nessun gadget. Aggiungine uno!</p></div>`;
  },
  filter(v){this.filterVal=v.toLowerCase();this.render();},
  filterCat(v){this.catFilter=v;this.render();},
  async adjust(id,delta){
    const g=await IDB.get('gadgets',id);if(!g)return;
    g.stock=Math.max(0,(+g.stock||0)+delta);
    await IDB.put('gadgets',g);await this.render();
  },
  async openModal(id=null){
    this.editId=id;
    eid('modal-gadget-title').textContent=id?'Modifica Gadget':'Nuovo Gadget';
    if(id){
      const g=await IDB.get('gadgets',id);if(!g)return;
      eid('gad-name').value=g.name;eid('gad-cat').value=g.category;eid('gad-supplier').value=g.supplier||'';
      eid('gad-unit').value=g.unit||'pz';eid('gad-cost').value=g.cost;eid('gad-stock').value=g.stock;
      eid('gad-min').value=g.minStock||0;eid('gad-usage').value=g.usage||'';eid('gad-notes').value=g.notes||'';
    }else{
      ['gad-name','gad-supplier','gad-usage','gad-notes'].forEach(f=>{const el=eid(f);if(el)el.value='';});
      eid('gad-unit').value='pz';eid('gad-cost').value='0';eid('gad-stock').value='0';eid('gad-min').value='5';
    }
    openModal('gadget');
  },
  async save(){
    const item={name:eid('gad-name').value,category:eid('gad-cat').value,supplier:eid('gad-supplier').value,
      unit:eid('gad-unit').value,cost:+eid('gad-cost').value||0,stock:+eid('gad-stock').value||0,
      minStock:+eid('gad-min').value||0,usage:eid('gad-usage').value,notes:eid('gad-notes').value};
    if(this.editId)item.id=this.editId;
    await IDB.put('gadgets',item);
    toast(this.editId?'Gadget aggiornato!':'Gadget salvato!');
    closeModal('gadget');this.editId=null;await this.render();
  },

  clearPhoto(){ this._photoData=null; const p=document.getElementById('gadget-photo-prev'); if(p)p.src=''; toast('Foto rimossa','info'); },

  async del(id){
    if(!await askConfirm('Eliminare questo gadget?'))return;
    await IDB.del('gadgets',id);toast('Eliminato','warning');await this.render()
  }
};

// ===== FIXED COSTS =====
const Listino = {
  _manualCamp:false, _manualKit:false, _manualStock:false,
  async render(){ this.loadDefaults(); await this.renderSaved(); },
  loadDefaults(){
    const cfg = JSON.parse(localStorage.getItem('ingly_listino_cfg')||'{}');
    if(cfg.mat && eid('lc-mat')) eid('lc-mat').value = cfg.mat;
    if(cfg.time && eid('lc-time')) eid('lc-time').value = cfg.time;
    const s = JSON.parse(localStorage.getItem('ingly_settings_main')||'{}');
    if(eid('lc-machine')) eid('lc-machine').value = cfg.machine || s.machineCost || 0.35;
    if(eid('lc-labor')) eid('lc-labor').value = cfg.labor || s.laborCost || 0.25;
    if(cfg.fixed && eid('lc-fixed')) eid('lc-fixed').value = cfg.fixed;
    if(cfg.custom && eid('lc-custom')) eid('lc-custom').value = cfg.custom;
    if(cfg.mat) this.calcola();
  },
  calcola(){
    this._manualCamp = this._manualKit = this._manualStock = false;
    const mat=+eid('lc-mat')?.value||0, time=+eid('lc-time')?.value||0;
    const machine=+eid('lc-machine')?.value||0.35, labor=+eid('lc-labor')?.value||0.25;
    const fixed=+eid('lc-fixed')?.value||0, custom=+eid('lc-custom')?.value||0;
    const costo = mat + (time*machine) + (time*labor) + fixed + custom;
    localStorage.setItem('ingly_listino_cfg', JSON.stringify({mat,time,machine,labor,fixed,custom}));
    const disp = eid('lc-unit-cost');
    if(disp) disp.textContent = costo>0 ? '€ '+costo.toFixed(2) : '€ —';
    if(costo<=0) return;
    // Campione
    const campMargin = (+eid('lc-camp-margin')?.value||50)/100;
    const campPrice = costo / (1-campMargin);
    if(eid('lc-camp-price')) eid('lc-camp-price').value = campPrice.toFixed(2);
    if(eid('lc-camp-info')) eid('lc-camp-info').textContent = 'Margine: '+Math.round(campMargin*100)+'% · Costo: €'+costo.toFixed(2);
    // Kit Classe
    const kitDisc = (+eid('lc-kit-disc')?.value||18)/100;
    const kitPrice = campPrice * (1-kitDisc);
    const kitQtyA = +eid('lc-kit-qty-a')?.value||25;
    const kitQtyB = +eid('lc-kit-qty-b')?.value||30;
    const kitMid = Math.round((kitQtyA+kitQtyB)/2);
    if(eid('lc-kit-price')) eid('lc-kit-price').value = kitPrice.toFixed(2);
    const kitMargin = Math.round((1-costo/kitPrice)*100);
    if(eid('lc-kit-info')) eid('lc-kit-info').textContent = 'Totale '+kitQtyA+'pz: €'+(kitPrice*kitQtyA).toFixed(0)+' · '+kitQtyB+'pz: €'+(kitPrice*kitQtyB).toFixed(0)+' · Margine: '+kitMargin+'%';
    // Stock
    const stockDisc = (+eid('lc-stock-disc')?.value||28)/100;
    const stockPrice = campPrice * (1-stockDisc);
    const stockQty = +eid('lc-stock-qty')?.value||100;
    if(eid('lc-stock-price')) eid('lc-stock-price').value = stockPrice.toFixed(2);
    const stockMargin = Math.round((1-costo/stockPrice)*100);
    if(eid('lc-stock-info')) eid('lc-stock-info').textContent = 'Totale '+stockQty+'pz: €'+(stockPrice*stockQty).toFixed(0)+' · Margine: '+stockMargin+'%';
  },
  manualEdit(type){
    if(type==='camp') this._manualCamp=true;
    if(type==='kit') this._manualKit=true;
    if(type==='stock') this._manualStock=true;
    // Recalc totals without overwriting manual
    const kitQtyA=+eid('lc-kit-qty-a')?.value||25, kitQtyB=+eid('lc-kit-qty-b')?.value||30;
    const kitPrice=+eid('lc-kit-price')?.value||0;
    if(eid('lc-kit-info')&&kitPrice) eid('lc-kit-info').textContent='Totale '+kitQtyA+'pz: €'+(kitPrice*kitQtyA).toFixed(0)+' · '+kitQtyB+'pz: €'+(kitPrice*kitQtyB).toFixed(0);
    const stockQty=+eid('lc-stock-qty')?.value||100;
    const stockPrice=+eid('lc-stock-price')?.value||0;
    if(eid('lc-stock-info')&&stockPrice) eid('lc-stock-info').textContent='Totale '+stockQty+'pz: €'+(stockPrice*stockQty).toFixed(0);
  },
  async aiSuggerisci(){
    const mat=eid('lc-mat')?.value||0, time=eid('lc-time')?.value||0;
    const machine=eid('lc-machine')?.value||0.35, labor=eid('lc-labor')?.value||0.25;
    const costo=((+mat)+(+time)*(+machine)+(+time)*(+labor)).toFixed(2);
    const out=eid('listino-ai-output');
    if(out) out.innerHTML='<div style="padding:12px;background:var(--bg-card2);border-radius:8px;font-size:13px">🤖 Analisi prezzi di mercato in corso...</div>';
    const prompt='Sei un consulente prezzi per artigiani italiani (incisione laser, personalizzazione). Costo produzione stimato per pezzo: EUR '+costo+' (materiale: EUR '+mat+', laser '+time+' min). Analizza il mercato italiano (Etsy IT, scuole, associazioni) e suggerisci prezzi ottimali per: campione 1pz, kit classe 25-30pz, stock 100+pz associazioni. Dai prezzi concreti in EUR, margini e strategia. Max 200 parole, rispondi in italiano.';
    try{
      const text = await AIProvider.call(prompt, 600);
      if(out) out.innerHTML='<div style="padding:14px;background:linear-gradient(135deg,var(--bg-card),#f59e0b08);border-radius:10px;border:1px solid #f59e0b30"><div style="font-weight:700;color:#f59e0b;margin-bottom:8px">🤖 Analisi AI prezzi mercato italiano</div><div style="font-size:13px;line-height:1.7;white-space:pre-wrap">'+text+'</div></div>';
    }catch(e){ if(out) out.innerHTML='<div style="color:#ef4444;padding:10px">'+e.message+'</div>'; }
  },
  async salvaListino(){
    const nome=await askPrompt('Nome listino (es. "Portachiavi Betulla"):'); if(!nome)return;
    const cliente=await askPrompt('Cliente / Categoria (opzionale):')||'';
    const prezzi={camp:+eid('lc-camp-price')?.value||0, kit:+eid('lc-kit-price')?.value||0, stock:+eid('lc-stock-price')?.value||0, kitQtyA:+eid('lc-kit-qty-a')?.value||25, kitQtyB:+eid('lc-kit-qty-b')?.value||30, stockQty:+eid('lc-stock-qty')?.value||100};
    const all=JSON.parse(localStorage.getItem('ingly_listini')||'[]');
    all.push({id:Date.now(),nome,cliente,prezzi,costo:eid('lc-unit-cost')?.textContent||'',created:new Date().toISOString()});
    localStorage.setItem('ingly_listini',JSON.stringify(all));
    toast('✅ Listino salvato!'); await this.renderSaved();
  },
  async renderSaved(){
    const el=eid('listini-saved-list'); if(!el)return;
    const all=JSON.parse(localStorage.getItem('ingly_listini')||'[]');
    const filter=eid('listino-cliente-filter');
    if(filter){const cs=[...new Set(all.map(l=>l.cliente).filter(Boolean))];filter.innerHTML='<option value="">— Tutti —</option>'+cs.map(c=>'<option>'+c+'</option>').join('');}
    const fv=eid('listino-cliente-filter')?.value||'';
    const list=fv?all.filter(l=>l.cliente===fv):all;
    if(!list.length){el.innerHTML='<p style="color:var(--text-muted);text-align:center;padding:24px">Nessun listino salvato. Calcola i prezzi e premi Salva.</p>';return;}
    el.innerHTML=list.sort((a,b)=>b.id-a.id).map(l=>`
      <div style="padding:14px;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:12px">
          <div style="flex:1">
            <div style="font-weight:700;font-size:14px">${l.nome}</div>
            ${l.cliente?`<div style="font-size:12px;color:#f59e0b">👤 ${l.cliente}</div>`:''}
            <div style="font-size:11px;color:var(--text-muted)">${new Date(l.created).toLocaleDateString('it-IT')} · Costo: ${l.costo}</div>
            <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
              ${l.prezzi.camp?`<span style="background:#f59e0b20;color:#f59e0b;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700">Campione €${l.prezzi.camp.toFixed(2)}</span>`:''}
              ${l.prezzi.kit?`<span style="background:#10b98120;color:#10b981;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700">Kit €${l.prezzi.kit.toFixed(2)}/pz</span>`:''}
              ${l.prezzi.stock?`<span style="background:#6366f120;color:#6366f1;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700">Stock €${l.prezzi.stock.toFixed(2)}/pz</span>`:''}
            </div>
          </div>
          <div style="display:flex;gap:5px;flex-shrink:0">
            <button onclick="Listino.carica(${l.id})" style="padding:5px 10px;background:var(--primary-dim);color:var(--primary);border:1px solid var(--primary-border);border-radius:6px;cursor:pointer;font-size:12px">📂</button>
            <button onclick="Listino.elimina(${l.id})" style="padding:5px 10px;background:#ef444418;color:#ef4444;border:1px solid #ef444440;border-radius:6px;cursor:pointer;font-size:12px">🗑️</button>
          </div>
        </div>
      </div>`).join('');
  },
  carica(id){
    const all=JSON.parse(localStorage.getItem('ingly_listini')||'[]');
    const l=all.find(x=>x.id===id); if(!l)return;
    if(l.prezzi.camp&&eid('lc-camp-price')) eid('lc-camp-price').value=l.prezzi.camp.toFixed(2);
    if(l.prezzi.kit&&eid('lc-kit-price')) eid('lc-kit-price').value=l.prezzi.kit.toFixed(2);
    if(l.prezzi.stock&&eid('lc-stock-price')) eid('lc-stock-price').value=l.prezzi.stock.toFixed(2);
    if(l.prezzi.kitQtyA&&eid('lc-kit-qty-a')) eid('lc-kit-qty-a').value=l.prezzi.kitQtyA;
    if(l.prezzi.kitQtyB&&eid('lc-kit-qty-b')) eid('lc-kit-qty-b').value=l.prezzi.kitQtyB;
    if(l.prezzi.stockQty&&eid('lc-stock-qty')) eid('lc-stock-qty').value=l.prezzi.stockQty;
    toast('📂 Listino "'+l.nome+'" caricato!');
  },
  async elimina(id){
    if(!await askConfirm('Eliminare questo listino?'))return;
    localStorage.setItem('ingly_listini',JSON.stringify(JSON.parse(localStorage.getItem('ingly_listini')||'[]').filter(x=>x.id!==id)));
    this.renderSaved(); toast('Eliminato','warning');
  },
  stampa(){
    const all=JSON.parse(localStorage.getItem('ingly_listini')||'[]');
    if(!all.length){toast('Nessun listino da stampare','warning');return;}
    const w=window.open('','_blank');
    w.document.write('<html><head><title>Listino Prezzi B2B</title><style>body{font-family:Arial,sans-serif;padding:30px;max-width:800px;margin:0 auto}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:10px;border:1px solid #ddd}th{background:#f0f0f0}.price{font-weight:700;color:#1d4ed8}h2{color:#1e40af;border-bottom:2px solid #1e40af;padding-bottom:8px}h1{color:#333}</style></head><body><h1>📋 Listino Prezzi B2B</h1><p style="color:#666">'+new Date().toLocaleDateString('it-IT')+' — Ingly Master</p>'+all.map(l=>'<h2>'+l.nome+(l.cliente?' — '+l.cliente:'')+'</h2><p><em>Costo produzione: '+l.costo+'</em></p><table><tr><th>Fascia</th><th>Quantità</th><th>Prezzo/pz</th><th>Totale</th><th>Sconto</th></tr><tr><td>🎯 Campione Singolo</td><td>1 pz</td><td class="price">€'+l.prezzi.camp.toFixed(2)+'</td><td>€'+l.prezzi.camp.toFixed(2)+'</td><td>—</td></tr><tr><td>🏫 Kit Classe</td><td>'+l.prezzi.kitQtyA+'-'+l.prezzi.kitQtyB+' pz</td><td class="price">€'+l.prezzi.kit.toFixed(2)+'</td><td>€'+(l.prezzi.kit*(l.prezzi.kitQtyA||25)).toFixed(0)+'-€'+(l.prezzi.kit*(l.prezzi.kitQtyB||30)).toFixed(0)+'</td><td>-'+Math.round((1-l.prezzi.kit/l.prezzi.camp)*100)+'%</td></tr><tr><td>🏢 Stock Assoc.</td><td>'+l.prezzi.stockQty+'+ pz</td><td class="price">€'+l.prezzi.stock.toFixed(2)+'</td><td>€'+(l.prezzi.stock*(l.prezzi.stockQty||100)).toFixed(0)+'</td><td>-'+Math.round((1-l.prezzi.stock/l.prezzi.camp)*100)+'%</td></tr></table>').join('')+'</body></html>');
    w.print();
  }
};

// =====================================================
// ETSY SEO MODULE
// ============================================================
const CatalogQR = {
  generate(productName, etsyUrl) {
    const text = etsyUrl || `https://www.etsy.com/search?q=${encodeURIComponent(productName)}`;
    // Use Google Charts API for QR generation
    const qrUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(text)}&choe=UTF-8`;
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10000;display:flex;align-items:center;justify-content:center';
    modal.innerHTML = `<div style="background:var(--bg-card);border-radius:16px;padding:24px;text-align:center;max-width:320px">
      <h3 style="margin-bottom:12px">🔗 QR Code — ${productName}</h3>
      <img src="${qrUrl}" style="width:200px;height:200px;border-radius:8px;margin:8px 0">
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">${text}</p>
      <div style="display:flex;gap:8px;justify-content:center">
        <a href="${qrUrl}" download="qr-${productName}.png" class="btn btn-primary btn-sm"><i class="fas fa-download"></i> Scarica</a>
        <button onclick="this.closest('div').parentNode.remove()" class="btn btn-secondary btn-sm">Chiudi</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
  }
};

// ===== ⑩ CLIENT CUSTOM PRICING =====
const CatalogView = {
  open() {
    const modal = document.createElement('div');
    modal.id = 'catalog-fullscreen';
    modal.style.cssText = 'position:fixed;inset:0;background:#0f0f0f;z-index:10000;overflow-y:auto;padding:20px';
    modal.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h2 style="color:#fff;margin:0">🏪 Catalogo Prodotti</h2>
      <button onclick="document.getElementById('catalog-fullscreen').remove()" style="background:none;border:1px solid #666;color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer">✕ Chiudi</button>
    </div>
    <div id="catalog-view-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px"></div>`;
    document.body.appendChild(modal);
    this.loadProducts();
  },

  async loadProducts() {
    const products = await AppStore.get('catalog');
    const grid = eid('catalog-view-grid');
    if (!grid) return;
    grid.innerHTML = products.map(p => `
      <div style="background:#1a1a2e;border-radius:12px;overflow:hidden;border:1px solid #333">
        ${p.image ? `<img src="${p.image}" style="width:100%;height:160px;object-fit:cover">` : `<div style="height:160px;background:linear-gradient(135deg,#8b5cf6,#06b6d4);display:flex;align-items:center;justify-content:center;font-size:48px">🎨</div>`}
        <div style="padding:12px">
          <div style="font-weight:600;color:#fff;margin-bottom:4px">${p.name}</div>
          <div style="color:#a78bfa;font-size:13px">€${parseFloat(p.price||0).toFixed(2)}</div>
          ${p.category ? `<div style="font-size:12px;color:#666;margin-top:4px">${p.category}</div>` : ''}
          <button onclick="CatalogQR.generate('${p.name}','${p.etsyUrl||''}')" style="width:100%;margin-top:8px;background:#8b5cf6;color:#fff;border:none;padding:6px;border-radius:6px;cursor:pointer;font-size:12px">
            🔗 QR Code
          </button>
        </div>
      </div>`).join('') || '<div style="color:#666;text-align:center;grid-column:1/-1;padding:40px">Nessun prodotto in catalogo</div>';
  }
};

// ===== PWA INSTALL =====
const Anchoring = {
  async generate() {
    const el = eid('anchoring-result');
    if (!el) return;
    el.style.display = 'block';
    el.innerHTML = '<div style="color:#f59e0b;font-size:11px;text-align:center;padding:8px">🧠 Analisi AI in corso…</div>';

    // Gather quote data
    const name    = eid('q-name')?.value || '';
    const markup  = parseFloat(eid('qr-markup')?.value || 100) / 100;
    const disc    = parseFloat(eid('qr-discount')?.value || 0) / 100;
    const lines   = Quoter.lines || [];
    const subTot  = lines.reduce((a, l) => a + (l.subtotal || 0) * (1 + markup), 0);
    const finalP  = subTot * (1 - disc);

    if (!lines.length && !name) {
      el.innerHTML = '<div style="color:#ef4444;font-size:11px;padding:8px">⚠️ Aggiungi almeno una voce al preventivo prima</div>';
      return;
    }

    const desc = lines.map(l => `${l.desc || l.name || ''}${l.detail ? ' - ' + l.detail : ''} (qtà ${l.qty}, €${(l.subtotal || 0).toFixed(2)})`).join('; ') || 'lavorazione laser su legno';

    const prompt = `Sei un esperto di pricing per prodotti artigianali laser (incisione/taglio legno, MDF, compensato) venduti su Etsy e mercatini italiani.

Prodotto: "${name || 'Lavoro laser'}"
Voci: ${desc}
Prezzo base calcolato: €${finalP.toFixed(2)}

Genera una strategia 3-tier con anchor pricing:

Rispondi SOLO con JSON valido (niente markdown):
{
  "tiers": [
    {"name":"🥉 BASE","price":0.00,"label":"Solo pezzo","features":["",""],"color":"#64748b"},
    {"name":"🥈 MEDIO","price":0.00,"label":"Consigliato","features":["","",""],"color":"#10b981","recommended":true},
    {"name":"🥇 PREMIUM","price":0.00,"label":"Top valore","features":["","","",""],"color":"#f59e0b"}
  ],
  "anchor_note":"breve frase psicologica sull'ancoraggio",
  "competitive_note":"breve nota sul mercato"
}

Prezzi realistici per mercato italiano Etsy/artigianato. BASE ≥ costo*2, MEDIO = buon margine, PREMIUM = valore percepito max.`;

    try {
      const txt = await AIProvider.call(prompt, 800);
      const json = JSON.parse(txt.replace(/```json|```/g, '').trim());

      el.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:#f59e0b;margin-bottom:8px">🧠 3-Tier Anchor Pricing</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px">
          ${json.tiers.map(t => `
            <div style="background:${t.color}15;border:1.5px solid ${t.color}40;border-radius:8px;padding:8px;text-align:center;${t.recommended ? 'border-color:' + t.color + ';box-shadow:0 0 8px ' + t.color + '30' : ''}">
              <div style="font-size:11px;font-weight:700;color:${t.color}">${t.name}</div>
              <div style="font-size:18px;font-weight:900;color:#fff;margin:4px 0">€${(+t.price).toFixed(2)}</div>
              <div style="font-size:9px;color:var(--text-muted);margin-bottom:4px">${t.label}</div>
              ${(t.features || []).map(f => `<div style="font-size:9px;color:var(--text-muted)">✓ ${f}</div>`).join('')}
              <button onclick="Anchoring.applyPrice(${t.price})" style="margin-top:6px;width:100%;padding:3px;background:${t.color}20;border:1px solid ${t.color}40;border-radius:4px;color:${t.color};cursor:pointer;font-size:9px;font-weight:700">Usa questo →</button>
            </div>
          `).join('')}
        </div>
        <div style="font-size:10px;color:#f59e0b;background:#f59e0b10;border-radius:6px;padding:6px;margin-bottom:4px">⚓ ${json.anchor_note || ''}</div>
        <div style="font-size:10px;color:var(--text-muted)">📊 ${json.competitive_note || ''}</div>`;
    } catch (err) {
      // Fallback: generate tiers locally without AI
      const base = Math.max(finalP, 2);
      const tiers = [
        { name: '🥉 BASE', price: +(base * 1.8).toFixed(2), label: 'Solo pezzo', color: '#64748b', features: ['Prodotto standard'] },
        { name: '🥈 MEDIO', price: +(base * 2.5).toFixed(2), label: '⭐ Consigliato', color: '#10b981', features: ['+ Confezione regalo', 'Personalizzazione inclusa'], recommended: true },
        { name: '🥇 PREMIUM', price: +(base * 3.5).toFixed(2), label: 'Top valore', color: '#f59e0b', features: ['+ Confezione deluxe', 'Font personalizzato', '+ Spedizione priority', 'Certificato artigianale'] }
      ];
      el.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:#f59e0b;margin-bottom:6px">🧠 3-Tier Pricing (locale — configura AI in Impostazioni)</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
          ${tiers.map(t => `
            <div style="background:${t.color}15;border:1.5px solid ${t.color}40;border-radius:8px;padding:8px;text-align:center">
              <div style="font-size:11px;font-weight:700;color:${t.color}">${t.name}</div>
              <div style="font-size:18px;font-weight:900;color:#fff;margin:4px 0">€${t.price.toFixed(2)}</div>
              <div style="font-size:9px;color:var(--text-muted);margin-bottom:4px">${t.label}</div>
              ${t.features.map(f => `<div style="font-size:9px;color:var(--text-muted)">✓ ${f}</div>`).join('')}
              <button onclick="Anchoring.applyPrice(${t.price})" style="margin-top:6px;width:100%;padding:3px;background:${t.color}20;border:1px solid ${t.color}40;border-radius:4px;color:${t.color};cursor:pointer;font-size:9px;font-weight:700">Usa →</button>
            </div>
          `).join('')}
        </div>`;
    }
  },

  applyPrice(price) {
    // Apply selected tier as manual override to the quoter right panel
    const discEl = eid('qr-discount');
    const markup = parseFloat(eid('qr-markup')?.value || 100) / 100;
    const lines = Quoter.lines || [];
    if (!lines.length) return;
    const baseSub = lines.reduce((a, l) => a + (l.subtotal || 0) * (1 + markup), 0);
    if (baseSub <= 0) return;
    // Compute what discount % would produce this price
    const targetDisc = Math.max(0, Math.min(80, Math.round((1 - price / baseSub) * 100)));
    if (discEl) { discEl.value = targetDisc; Quoter.recalcRight?.(); }
    toast(`Prezzo €${price.toFixed(2)} applicato (sconto ${targetDisc}%)`, 'success');
    const el = eid('anchoring-result');
    if (el) setTimeout(() => { el.style.display = 'none'; }, 2000);
  }
};

// ════════════════════════════════════════════════════════════════
// ⚡ LASER CALC PAGE  v60
// ════════════════════════════════════════════════════════════════
const LaserCalcPage = {
  _prices: { camp: 0, kit: 0, stock: 0 },
  _cost: 0,

  init() {
    this.loadSettings();
    this.recalc();
    if(typeof Bus!=='undefined' && !this._machBusRegistered){
      this._machBusRegistered=true;
      Bus.on('machine:selected',function(d){
        var m=d&&d.mach; if(!m) return;
        var kw=eid('lcp-kw'); var dep=eid('lcp-depr');
        if(kw && m.watts){ kw.value=(m.watts/1000).toFixed(2); }
        if(dep && m.hourly){ dep.value=m.hourly.toFixed(3); }
        if(typeof LaserCalcPage!=='undefined') LaserCalcPage.recalc();
        if(typeof toast!=='undefined') toast('⚡ Macchina sincronizzata al Calcolatore','info');
      });
    }
  },

  toggleSettings() {
    const body = eid('lcp-settings-body');
    const btn  = eid('lcp-settings-toggle');
    if (!body) return;
    const vis = body.style.display !== 'none';
    body.style.display = vis ? 'none' : 'block';
    if (btn) btn.textContent = vis ? '▼ Mostra' : '▲ Nascondi';
  },

  loadSettings() {
    const s = JSON.parse(localStorage.getItem('lcp_settings') || '{}');
    const fields = ['lcp-kwh','lcp-kw','lcp-depr','lcp-labor','lcp-mk1','lcp-mkit','lcp-mstock'];
    const defaults = { 'lcp-kwh':0.28,'lcp-kw':1.2,'lcp-depr':0.80,'lcp-labor':15,'lcp-mk1':3.5,'lcp-mkit':2.8,'lcp-mstock':2.2 };
    fields.forEach(id => {
      const el = eid(id);
      if (el) el.value = s[id] !== undefined ? s[id] : defaults[id];
    });
  },

  saveSettings() {
    const fields = ['lcp-kwh','lcp-kw','lcp-depr','lcp-labor','lcp-mk1','lcp-mkit','lcp-mstock'];
    const s = {};
    fields.forEach(id => { const el = eid(id); if (el) s[id] = +el.value; });
    localStorage.setItem('lcp_settings', JSON.stringify(s));
  },

  resetSettings() {
    localStorage.removeItem('lcp_settings');
    this.loadSettings();
    this.recalc();
    toast('Impostazioni ripristinate ai valori di mercato', 'info');
  },

  autoCalc() {
    const w = +eid('lcp-w')?.value || 0;
    const h = +eid('lcp-h')?.value || 0;
    if (w && h) {
      const perimEl = eid('lcp-perim');
      const engrEl  = eid('lcp-engr');
      if (perimEl && !perimEl.value) perimEl.placeholder = Math.round(2 * (w + h)) + ' (auto)';
      if (engrEl && !engrEl.value)  engrEl.placeholder  = Math.round(w * h * 0.6) + ' (auto)';
    }
    this.recalc();
  },

  recalc() {
    this.saveSettings();
    const kwh    = +eid('lcp-kwh')?.value  || 0.28;
    const kw     = +eid('lcp-kw')?.value   || 1.2;
    const depr   = +eid('lcp-depr')?.value || 0.80;
    const labor  = +eid('lcp-labor')?.value|| 15;
    const mk1    = +eid('lcp-mk1')?.value  || 3.5;
    const mkit   = +eid('lcp-mkit')?.value || 2.8;
    const mstock = +eid('lcp-mstock')?.value || 2.2;
    const mat    = +eid('lcp-mat')?.value  || 0;
    const extra  = eid('lcp-has-extra')?.checked ? (+eid('lcp-extra')?.value || 0) : 0;

    const w = +eid('lcp-w')?.value || 0;
    const h = +eid('lcp-h')?.value || 0;
    // Cut time: perimeter / speed; speed ~6mm/s for wood P3
    const perimRaw = +eid('lcp-perim')?.value || (w && h ? 2*(w+h) : 0);
    const engrRaw  = +eid('lcp-engr')?.value  || (w && h ? Math.round(w*h*0.6) : 0);

    const hasCut   = eid('lcp-has-cut')?.checked;
    const hasEngr  = eid('lcp-has-engr')?.checked;
    const hasLabor = eid('lcp-has-labor')?.checked;

    // Auto-calc minutes
    let cutMin  = +eid('lcp-cut-min')?.value  || 0;
    let engrMin = +eid('lcp-engr-min')?.value || 0;
    if (!cutMin  && perimRaw) { cutMin  = +(perimRaw / 360).toFixed(2); } // 6mm/s = 360mm/min
    if (!engrMin && engrRaw)  { engrMin = +(engrRaw  / 10000).toFixed(2); } // ~10000mm²/min fill
    const laborMin = +eid('lcp-labor-min')?.value || 5;

    // Hints
    const cutHint  = eid('lcp-cut-hint');
    const engrHint = eid('lcp-engr-hint');
    if (cutHint)  cutHint.textContent  = perimRaw ? `~${cutMin.toFixed(1)} min (${perimRaw}mm perim.)` : 'inserisci perimetro';
    if (engrHint) engrHint.textContent = engrRaw  ? `~${engrMin.toFixed(1)} min (${engrRaw}mm² area)` : 'inserisci area';

    // Machine cost per minute
    const machinePerMin = (kwh * kw + depr) / 60;
    const laborPerMin   = labor / 60;

    // Cost components
    const costCut   = hasCut   ? cutMin  * machinePerMin : 0;
    const costEngr  = hasEngr  ? engrMin * machinePerMin : 0;
    const costLabor = hasLabor ? laborMin * laborPerMin : 0;
    const costMat   = mat;
    const costExtra = extra;
    const totalCost = costMat + costCut + costEngr + costLabor + costExtra;
    this._cost = totalCost;

    // Tier prices
    const campPrice  = +(totalCost * mk1).toFixed(2);
    const kitPrice   = +(totalCost * mkit).toFixed(2);
    const stockPrice = +(totalCost * mstock).toFixed(2);
    this._prices = { camp: campPrice, kit: kitPrice, stock: stockPrice };

    const qty = +eid('lcp-qty')?.value || 1;

    // Breakdown
    const bd = eid('lcp-breakdown');
    if (bd && totalCost > 0) {
      bd.innerHTML = [
        ['🪵 Materiale', costMat],
        ['✂️ Taglio laser', costCut],
        ['🎨 Incisione laser', costEngr],
        ['👤 Manodopera', costLabor],
        ['✨ Extra', costExtra],
      ].filter(r => r[1] > 0).map(r => `
        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e293b">
          <span style="color:var(--text-muted)">${r[0]}</span>
          <span style="color:var(--text);font-weight:700">€${r[1].toFixed(2)}</span>
        </div>`).join('') +
        `<div style="display:flex;justify-content:space-between;padding:6px 0;margin-top:4px;border-top:2px solid var(--primary)">
          <span style="font-weight:800;color:var(--primary)">💰 COSTO TOTALE</span>
          <span style="font-weight:900;color:var(--primary);font-size:14px">€${totalCost.toFixed(2)}</span>
        </div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:4px">× ${qty} pz = €${(totalCost*qty).toFixed(2)}</div>`;
    } else if (bd) {
      bd.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px;font-size:12px">Inserisci i dati per calcolare</div>';
    }

    // Tiers
    const tiersEl = eid('lcp-tiers');
    if (tiersEl && totalCost > 0) {
      const margin = p => p > 0 ? Math.round((1 - totalCost / p) * 100) : 0;
      tiersEl.innerHTML = [
        { id:'camp',  label:'🧪 Campione', sub:'Singolo pezzo', price: campPrice,  color:'#64748b', qtys:'1 pz',  mk: mk1 },
        { id:'kit',   label:'🎒 Kit',      sub:'Classe 25–30pz', price: kitPrice,  color:'#10b981', qtys:'25–30 pz', mk: mkit, rec: true },
        { id:'stock', label:'📦 Stock',    sub:'100+ pezzi',     price: stockPrice,color:'#6366f1', qtys:'100+ pz', mk: mstock },
      ].map(t => `
        <div style="background:linear-gradient(135deg,${t.color}10,${t.color}05);border:2px solid ${t.color}${t.rec?'':'30'};border-radius:12px;padding:14px;text-align:center${t.rec?';box-shadow:0 0 16px '+t.color+'25':''}">
          ${t.rec ? '<div style="font-size:9px;font-weight:800;color:#10b981;margin-bottom:4px;text-transform:uppercase">⭐ Consigliato</div>' : ''}
          <div style="font-size:13px;font-weight:700;color:${t.color};margin-bottom:2px">${t.label}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:8px">${t.sub} · ${t.qtys}</div>
          <div style="font-size:28px;font-weight:900;color:#fff">€${t.price.toFixed(2)}</div>
          <div style="font-size:10px;color:${t.color};margin-bottom:8px">Margine ${margin(t.price)}% · ×${t.mk.toFixed(1)} costo</div>
          ${qty > 1 ? `<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:4px">Totale ${qty}pz: €${(t.price*qty).toFixed(2)}</div>` : ''}
          <button onclick="LaserCalcPage.selectTier('${t.id}')" style="width:100%;padding:6px;background:${t.color}20;border:1px solid ${t.color}40;border-radius:6px;color:${t.color};cursor:pointer;font-size:10px;font-weight:700;margin-top:4px">Seleziona</button>
        </div>`).join('');
    } else if (tiersEl) {
      tiersEl.innerHTML = '<div style="grid-column:span 3;text-align:center;padding:32px;color:var(--text-dim);font-size:13px">Inserisci materiale, tempo e dimensioni per vedere i prezzi di vendita</div>';
    }
  },

  selectTier(id) {
    const sel = eid('lcp-tier-select');
    if (sel) sel.value = id;
    toast('Tier "' + id + '" selezionato — clicca "Invia a Quoter"', 'info');
  },

  async aiSuggest() {
    const el = eid('lcp-ai-result');
    if (!el) return;
    el.innerHTML = '<div style="color:#f59e0b;font-size:11px;text-align:center;padding:6px">🧠 AI in corso…</div>';

    const name  = eid('lcp-name')?.value || 'prodotto laser su legno';
    const w     = eid('lcp-w')?.value || '?';
    const h     = eid('lcp-h')?.value || '?';
    const cost  = this._cost;
    const camp  = this._prices.camp;
    const kit   = this._prices.kit;
    const stock = this._prices.stock;

    const prompt = `Sei un esperto di pricing per prodotti artigianali laser (legno, MDF, compensato) su Etsy e mercatini italiani.

Prodotto: "${name}", dimensioni ${w}×${h}mm
Costo produzione: €${cost.toFixed(2)}/pz
Prezzi calcolati: Campione €${camp}, Kit €${kit}, Stock €${stock}

Analizza i prezzi e rispondi SOLO con JSON valido:
{
  "verdict": "ok|basso|alto",
  "suggestion": "testo breve 1 riga",
  "camp_ok": €valore suggerito campione,
  "kit_ok": €valore suggerito kit,
  "stock_ok": €valore suggerito stock,
  "tip": "consiglio strategico breve"
}`;

    try {
      const txt = await AIProvider.call(prompt, 400);
      const j = JSON.parse(txt.replace(/```json|```/g, '').trim());
      const vColors = { ok: '#10b981', basso: '#f59e0b', alto: '#6366f1' };
      const vLabels = { ok: '✅ Prezzi OK', basso: '⚠️ Prezzi bassi', alto: '📈 Prezzi alti' };
      el.innerHTML = `
        <div style="background:${vColors[j.verdict]||'#10b981'}15;border:1px solid ${vColors[j.verdict]||'#10b981'}40;border-radius:8px;padding:10px">
          <div style="font-size:12px;font-weight:700;color:${vColors[j.verdict]||'#10b981'};margin-bottom:4px">${vLabels[j.verdict]||''}</div>
          <div style="font-size:11px;color:var(--text);margin-bottom:6px">${j.suggestion||''}</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:6px">
            <div style="text-align:center;background:#0a0e1a;border-radius:5px;padding:5px"><div style="font-size:9px;color:var(--text-muted)">Campione</div><div style="font-size:13px;font-weight:800;color:#fff">€${(+j.camp_ok||camp).toFixed(2)}</div></div>
            <div style="text-align:center;background:#0a0e1a;border-radius:5px;padding:5px"><div style="font-size:9px;color:var(--text-muted)">Kit</div><div style="font-size:13px;font-weight:800;color:#10b981">€${(+j.kit_ok||kit).toFixed(2)}</div></div>
            <div style="text-align:center;background:#0a0e1a;border-radius:5px;padding:5px"><div style="font-size:9px;color:var(--text-muted)">Stock</div><div style="font-size:13px;font-weight:800;color:#6366f1">€${(+j.stock_ok||stock).toFixed(2)}</div></div>
          </div>
          <div style="font-size:10px;color:var(--text-muted)">💡 ${j.tip||''}</div>
        </div>`;
    } catch (e) {
      el.innerHTML = '<div style="color:var(--text-muted);font-size:10px;padding:6px">Configura API AI in Impostazioni per suggerimenti intelligenti</div>';
    }
  },

  // ─── Magazzino Picker per LaserCalc ────────────────────────────────
  async openMaterialPicker(){
    const all = await AppStore.get('items').catch(()=>[]);
    const matCats = ['Legno','MDF','Plexiglass','Sughero','Carta & Cartone','Feltro & Tessuto','Pelle','Metallo'];
    const mats = all.filter(i=>matCats.includes(i.category||''));
    if(!mats.length){ toast('Nessun materiale nel Magazzino — aggiungili prima','warning'); return; }
    this._showPickerModal('🪵 Scegli Materiale dal Magazzino', mats, (item)=>{
      const cost = item.costPrice||0;
      const dims = (item.width && item.height) ? ` (${item.width}×${item.height}mm)` : '';
      if(eid('lcp-mat')) eid('lcp-mat').value = cost.toFixed(2);
      if(eid('lcp-mat-sel-name')) eid('lcp-mat-sel-name').textContent = `✅ ${item.name}${dims} — ${fmtCur(cost)}/${item.unit||'mq'}`;
      // Auto-fill width/height if item has dims and fields are empty
      if(item.width && !eid('lcp-w')?.value) if(eid('lcp-w')) eid('lcp-w').value = item.width;
      if(item.height && !eid('lcp-h')?.value) if(eid('lcp-h')) eid('lcp-h').value = item.height;
      this.recalc();
      toast(`Materiale "${item.name}" → €${cost.toFixed(2)} impostato`, 'success');
    });
  },

  async openMachinePicker(){
    const all = await AppStore.get('items').catch(()=>[]);
    const macch = all.filter(i=>i.category==='Macchinari');
    const oldM = (await AppStore.get('materials').catch(()=>[])).filter(m=>m.type==='machine');
    const combined = [
      ...macch.map(i=>({...i, costPrice: i.costPerMin||i.costPrice||0.35, unit:'€/min', _source:'Magazzino'})),
      ...oldM.map(m=>({id:m.id,name:m.name,costPrice:m.cost,unit:'€/min',_source:'Legacy'}))
    ];
    if(!combined.length){ toast('Nessuna macchina trovata — aggiungila nel Magazzino','warning'); return; }
    this._showPickerModal('⚡ Scegli Macchina Laser', combined, (item)=>{
      const cpm = item.costPrice||0.35;
      if(eid('lcp-depr')) eid('lcp-depr').value = cpm.toFixed(2);
      this.recalc();
      toast(`Macchina "${item.name}" → €${cpm.toFixed(2)}/min impostata`,'success');
    });
  },

  _showPickerModal(title, items, onSelect){
    // Remove existing modal if any
    const existing = document.getElementById('lcp-picker-modal');
    if(existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'lcp-picker-modal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:12000;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick = e => { if(e.target===modal) modal.remove(); };

    const rows = items.map((item,i)=>`
      <div onclick="window._lcpPickItem(${i})" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card2);cursor:pointer;margin-bottom:6px;transition:.15s" onmouseover="this.style.borderColor='#38bdf8'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="font-size:22px;width:36px;text-align:center">${{Legno:'🪵',MDF:'⬛',Plexiglass:'💎',Sughero:'🍂','Feltro & Tessuto':'🧵',Pelle:'🐄',Metallo:'🔩','Carta & Cartone':'📄',Macchinari:'⚡'}[item.category]||'📦'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:var(--text)">${item.name}</div>
          <div style="font-size:10px;color:var(--text-muted)">${item.category||''}${item.width&&item.height?' · '+item.width+'×'+item.height+'mm':''}${item.supplier?' · '+item.supplier:''}</div>
        </div>
        <div style="font-size:14px;font-weight:800;color:#38bdf8">${fmtCur(item.costPrice||0)}<span style="font-size:9px;color:var(--text-muted);font-weight:400">/${item.unit||'mq'}</span></div>
      </div>`).join('');

    modal.innerHTML=`
      <div style="background:var(--bg-card);border-radius:16px;width:min(540px,96vw);max-height:80vh;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border)">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:15px;font-weight:800;color:var(--text)">${title}</div>
          <button onclick="document.getElementById('lcp-picker-modal').remove()" style="background:none;border:none;color:var(--text-muted);font-size:20px;cursor:pointer">×</button>
        </div>
        <div style="overflow-y:auto;padding:14px;flex:1">
          <input type="text" placeholder="🔍 Cerca..." oninput="window._lcpFilterPicker(this.value)" style="width:100%;padding:7px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;margin-bottom:10px">
          <div id="lcp-picker-list">${rows}</div>
        </div>
      </div>`;

    document.body.appendChild(modal);

    window._lcpPickItems = items;
    window._lcpPickCb = onSelect;
    window._lcpPickItem = idx => { onSelect(items[idx]); modal.remove(); };
    window._lcpFilterPicker = q => {
      const el = document.getElementById('lcp-picker-list'); if(!el) return;
      const filtered = items.filter(i=>(i.name+' '+(i.category||'')+(i.supplier||'')).toLowerCase().includes(q.toLowerCase()));
      // rebuild with correct indices
      el.innerHTML = filtered.map((item,ii)=>`
        <div onclick="window._lcpPickItem2(${ii})" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card2);cursor:pointer;margin-bottom:6px" onmouseover="this.style.borderColor='#38bdf8'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="font-size:22px;width:36px;text-align:center">${{Legno:'🪵',MDF:'⬛',Plexiglass:'💎'}[item.category]||'📦'}</div>
          <div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--text)">${item.name}</div><div style="font-size:10px;color:var(--text-muted)">${item.category||''}</div></div>
          <div style="font-size:14px;font-weight:800;color:#38bdf8">${fmtCur(item.costPrice||0)}</div>
        </div>`).join('');
      window._lcpPickItem2 = ii => { onSelect(filtered[ii]); modal.remove(); };
    };
  },

  sendToQuoter() {
    const tierKey = eid('lcp-tier-select')?.value || 'camp';
    const price   = this._prices[tierKey] || 0;
    const name    = eid('lcp-name')?.value || 'Lavorazione Laser';
    const qty     = +eid('lcp-qty')?.value || 1;
    if (!price) { toast('Calcola prima il costo per ottenere un prezzo', 'warning'); return; }
    // Navigate to quoter and add line
    App.navigate('quoter');
    setTimeout(() => {
      if (typeof Quoter !== 'undefined' && Quoter.addLineFromCalc) {
        Quoter.addLineFromCalc({ name, unitCost: price, qty });
      } else {
        // Fallback: fill the unit cost field
        if (eid('ql-unit-cost')) eid('ql-unit-cost').value = price.toFixed(2);
        if (eid('ql-qty'))       eid('ql-qty').value       = qty;
        toast('Prezzo €' + price.toFixed(2) + ' copiato nel Quoter', 'success');
      }
    }, 200);
  }
};

// ════════════════════════════════════════════════════════════════
// 🔄 KANBAN ↔ WORKFLOW SYNC  v60
// Quando un preventivo viene spostato su "produzione" nel Workflow
// → crea/aggiorna automaticamente un ordine in Coda Produzione
// Quando un ordine viene consegnato in Coda Produzione
// → aggiorna lo stato del preventivo correlato in Workflow
// ════════════════════════════════════════════════════════════════
(function() {
  // ── Workflow → Orders sync ──────────────────────────────────
  const _origWorkflowSetStatus = Workflow.setStatus?.bind(Workflow);
  if (_origWorkflowSetStatus) {
    Workflow.setStatus = async function(id, status) {
      await _origWorkflowSetStatus(id, status);
      // When quote moves to 'produzione' or 'confermato' → sync to Orders kanban
      if (status === 'produzione' || status === 'confermato') {
        try {
          const q = await IDB.get('quotes', id);
          if (!q) return;
          // Check if order already exists for this quote
          const existing = (await AppStore.get('orders').catch(() => [])).find(o => o._fromQuoteId === id);
          if (!existing) {
            const newOrder = {
              id: Date.now(),
              title: q.name || 'Ordine da Preventivo',
              clientName: q.clientName || '—',
              value: q.grossPrice || 0,
              status: 'backlog',
              dueDate: q.deadline || '',
              notes: `📋 Preventivo ${q.id} | ${q.notes || ''}`,
              _fromQuoteId: id,
              createdAt: new Date().toISOString()
            };
            await IDB.put('orders', newOrder);
            toast('📦 Ordine creato in Coda Produzione', 'success');
          }
        } catch(e) {}
      }
    };
  }

  // ── Orders → Workflow sync ──────────────────────────────────
  const _origOrdersMove = Orders.move?.bind(Orders);
  if (_origOrdersMove) {
    Orders.move = async function(id, newStatus) {
      await _origOrdersMove(id, newStatus);
      // When order is delivered → mark quote as confermato
      if (newStatus === 'delivered') {
        try {
          const order = await IDB.get('orders', id);
          if (!order || !order._fromQuoteId) return;
          const q = await IDB.get('quotes', order._fromQuoteId);
          if (q && q.status !== 'confermato') {
            q.status = 'confermato';
            await IDB.put('quotes', q);
            toast('✅ Preventivo aggiornato a "Confermato"', 'info');
          }
        } catch(e) {}
      }
    };
  }
})();

// ═══════════════════════════════════════════════════════════════════════════════
// INGLY v61 — NEW MODULES
// ═══════════════════════════════════════════════════════════════════════════════

// ── AnchorAI: 3-Tier Intelligent Price Suggestion ────────────────────────────
const AnchorAI = {
  _cache:{},
  _widgetId:'q-anchor-widget',

  async suggest(name,cat,qty,costPrice){
    if(!name||name.length<2)return null;
    const key=`${name}|${cat}|${Math.round(qty)}|${costPrice}`;
    if(this._cache[key])return this._cache[key];
    const prompt=`You are a pricing expert for an Italian artisan laser engraving business.
Product: "${name}"
Category: ${cat||'general'}
Quantity: ${qty||1}
Material cost: €${(costPrice||0).toFixed(2)}

Suggest 3 price tiers (euros, client price net IVA):
ECONOMY: competitive minimum, high volume
STANDARD: typical Italian market quality price  
PREMIUM: top quality, personalization, express

Rules:
- Italian market (Etsy IT, Fiera del Levante, artisan shops)
- Minimum 45% margin for ECONOMY, 60% for STANDARD, 75% for PREMIUM
- Be realistic: handmade laser work in Italy
- If costPrice=0, estimate from typical materials

Respond ONLY valid JSON: {"economy":12.50,"standard":18.00,"premium":28.00,"reasoning":"1 sentence max"}`;
    try{
      const r=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:150,messages:[{role:'user',content:prompt}]})
      });
      const data=await r.json();
      const txt=data.content?.find(b=>b.type==='text')?.text||'{}';
      const result=JSON.parse(txt.replace(/```json|```/g,'').trim());
      if(result.economy&&result.standard&&result.premium){this._cache[key]=result;return result;}
    }catch(e){console.warn('[AnchorAI]',e);}
    // Fallback: cost-based calculation
    if(costPrice>0){
      const r={economy:+(costPrice*2.2).toFixed(2),standard:+(costPrice*3.0).toFixed(2),premium:+(costPrice*4.2).toFixed(2),reasoning:'Calculated from cost with Italian market margins'};
      this._cache[key]=r;return r;
    }
    return null;
  },

  async renderWidget(name,cat,qty,costPrice){
    let w=eid(this._widgetId);
    if(!w){
      // Create widget next to the cost field
      const costGroup=eid('ql-unit-cost')?.closest('.form-group');
      if(!costGroup)return;
      w=document.createElement('div');w.id=this._widgetId;
      w.style.cssText='margin-top:10px;background:var(--bg-card2);border-radius:10px;padding:10px;border:1px solid var(--border)';
      costGroup.insertAdjacentElement('afterend',w);
    }
    w.innerHTML=`<div style="font-size:9px;text-align:center;color:var(--text-muted);margin-bottom:6px;font-weight:700">🧠 AI PRICE ANCHOR — ${(name||'').substring(0,22)}</div>
      <div style="display:flex;gap:3px;margin-bottom:5px">
        <div style="flex:1;text-align:center;font-size:9px;color:var(--text-dim);padding:6px;background:var(--bg-card);border-radius:6px;border:1px solid var(--border)">
          <div>💚 Economy</div><div style="font-size:11px;font-weight:700;color:#64748b">...</div>
        </div>
        <div style="flex:1;text-align:center;font-size:9px;color:var(--text-dim);padding:6px;background:var(--bg-card);border-radius:6px;border:1px solid var(--border)">
          <div>⭐ Standard</div><div style="font-size:11px;font-weight:700;color:#64748b">...</div>
        </div>
        <div style="flex:1;text-align:center;font-size:9px;color:var(--text-dim);padding:6px;background:var(--bg-card);border-radius:6px;border:1px solid var(--border)">
          <div>💎 Premium</div><div style="font-size:11px;font-weight:700;color:#64748b">...</div>
        </div>
      </div>
      <div style="font-size:9px;color:var(--text-dim);text-align:center">⏳ AI in elaborazione...</div>`;

    const tiers=await this.suggest(name,cat,qty,costPrice);
    if(!tiers){w.innerHTML=`<div style="font-size:9px;color:var(--text-dim);text-align:center;padding:6px">AI non disponibile — inserisci prezzo manualmente</div>`;return;}

    w.innerHTML=`<div style="font-size:9px;text-align:center;color:var(--text-muted);margin-bottom:6px;font-weight:700;letter-spacing:.3px">🧠 AI PRICE ANCHOR</div>
      <div style="display:flex;gap:3px;margin-bottom:6px">
        ${[{l:'💚',n:'Economy',k:'economy',c:'#22c55e'},{l:'⭐',n:'Standard',k:'standard',c:'#f59e0b'},{l:'💎',n:'Premium',k:'premium',c:'#a855f7'}].map(t=>`
          <button onclick="AnchorAI.apply(${tiers[t.k]})" title="Applica ${t.n}: €${tiers[t.k]}"
            style="flex:1;padding:7px 3px;background:${t.c}15;border:1.5px solid ${t.c}40;border-radius:8px;cursor:pointer;transition:all .15s;text-align:center"
            onmouseover="this.style.background='${t.c}30';this.style.borderColor='${t.c}'" onmouseout="this.style.background='${t.c}15';this.style.borderColor='${t.c}40'">
            <div style="font-size:9px;color:${t.c};font-weight:700">${t.l} ${t.n}</div>
            <div style="font-size:13px;font-weight:900;color:${t.c}">${fmtCur(tiers[t.k])}</div>
          </button>`).join('')}
      </div>
      ${tiers.reasoning?`<div style="font-size:9px;color:var(--text-dim);text-align:center;font-style:italic;line-height:1.3">${tiers.reasoning}</div>`:''}`;
  },

  apply(price){
    const el=eid('ql-unit-cost');
    if(el){
      el.value=price.toFixed(2);
      el.style.borderColor='#a855f7';
      el.dispatchEvent(new Event('input'));
      setTimeout(()=>el.style.borderColor='',1500);
      if(typeof Quoter!=='undefined'&&Quoter.calcItem)Quoter.calcItem();
    }
    toast(`🧠 Prezzo AI applicato: ${fmtCur(price)}`,'✅');
  }
};

// Trigger AnchorAI on resource change
document.addEventListener('change',function(e){
  if(e.target?.id==='ql-resource'){
    const opt=e.target.options[e.target.selectedIndex];
    const cost=parseFloat(opt?.dataset?.cost)||0;
    const name=opt?.dataset?.name||opt?.textContent||'';
    const cat=eid('ql-cat')?.value||'';
    const qty=parseFloat(eid('ql-qty')?.value)||1;
    if(name)AnchorAI.renderWidget(name,cat,qty,cost);
  }
  if(e.target?.id==='ql-qty'||e.target?.id==='ql-cat'){
    const opt=eid('ql-resource')?.options[eid('ql-resource')?.selectedIndex];
    const name=opt?.dataset?.name||'';
    const cost=parseFloat(opt?.dataset?.cost)||0;
    const cat=eid('ql-cat')?.value||'';
    const qty=parseFloat(eid('ql-qty')?.value)||1;
    if(name)AnchorAI.renderWidget(name,cat,qty,cost);
  }
});

// ── PaintCalc: area-based cost calculator for verniciatura ───────────────────
const PaintCalc={
  update(){
    const w=parseFloat(eid('pav-w')?.value)||0,h=parseFloat(eid('pav-h')?.value)||0;
    const coats=parseInt(eid('pav-coats')?.value)||2,waste=parseFloat(eid('pav-waste')?.value)||20;
    const res=eid('pav-result');if(!res||!w||!h)return;
    const areaMq=(w*h)/10000;
    const totalArea=areaMq*coats*(1+waste/100);
    const sel=eid('ql-resource');
    const costPerMq=parseFloat(sel?.options[sel?.selectedIndex]?.dataset?.cost)||10;
    const totalCost=totalArea*costPerMq;
    res.innerHTML=`${w}×${h}cm → <strong>${totalArea.toFixed(4)} m²</strong> · Costo: <strong style="color:#22c55e">${fmtCur(totalCost)}</strong>`;
    const qtyEl=eid('ql-qty');if(qtyEl)qtyEl.value=totalArea.toFixed(4);
    const costEl=eid('ql-unit-cost');if(costEl){costEl.value=costPerMq.toFixed(4);costEl.dispatchEvent(new Event('input'));}
  },
  apply(){
    const w=parseFloat(eid('pav-w')?.value)||0,h=parseFloat(eid('pav-h')?.value)||0;
    if(!w||!h){toast('Inserisci dimensioni','warning');return;}
    const coats=parseInt(eid('pav-coats')?.value)||2,waste=parseFloat(eid('pav-waste')?.value)||20;
    const areaMq=(w*h)/10000;
    const totalArea=areaMq*coats*(1+waste/100);
    const qtyEl=eid('ql-qty');if(qtyEl){qtyEl.value=totalArea.toFixed(4);qtyEl.dispatchEvent(new Event('input'));}
    toast(`🎨 Area ${totalArea.toFixed(4)} m² applicata`,'✅');
  }
};

// Show paint area calc when verniciatura is selected
document.addEventListener('change',function(e){
  if(e.target?.id!=='ql-cat')return;
  const existing=eid('paint-area-calc');if(existing)existing.remove();
  if(e.target.value==='verniciatura'){
    setTimeout(()=>{
      const costGroup=eid('ql-unit-cost')?.closest('.form-group');if(!costGroup)return;
      const calc=document.createElement('div');calc.id='paint-area-calc';
      calc.style.cssText='margin-top:8px;padding:10px;background:#a855f715;border-radius:8px;border:1px solid #a855f730';
      calc.innerHTML=`<div style="font-size:10px;color:#a855f7;font-weight:700;margin-bottom:8px">🎨 CALCOLA AREA VERNICIATURA</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
          <div><label style="font-size:9px;color:var(--text-muted);display:block;margin-bottom:2px">Larg (cm)</label><input id="pav-w" type="number" class="form-control" style="font-size:12px" placeholder="30" oninput="PaintCalc.update()"></div>
          <div><label style="font-size:9px;color:var(--text-muted);display:block;margin-bottom:2px">Alt (cm)</label><input id="pav-h" type="number" class="form-control" style="font-size:12px" placeholder="20" oninput="PaintCalc.update()"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
          <div><label style="font-size:9px;color:var(--text-muted);display:block;margin-bottom:2px">Mani</label>
            <select id="pav-coats" class="form-control" style="font-size:11px" onchange="PaintCalc.update()">
              <option value="1">1 mano</option><option value="2" selected>2 mani</option><option value="3">3 mani</option>
            </select></div>
          <div><label style="font-size:9px;color:var(--text-muted);display:block;margin-bottom:2px">Sfrido %</label><input id="pav-waste" type="number" class="form-control" style="font-size:12px" value="20" oninput="PaintCalc.update()"></div>
        </div>
        <div id="pav-result" style="font-size:11px;color:var(--text-muted);text-align:center;padding:5px;background:var(--bg-card);border-radius:5px;margin-bottom:6px">Inserisci dimensioni →</div>
        <button onclick="PaintCalc.apply()" style="width:100%;padding:6px;background:#a855f7;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">➕ Applica al Preventivo</button>`;
      costGroup.insertAdjacentElement('afterend',calc);
    },200);
  }
});

// ── Items: Category Management ────────────────────────────────────────────────
console.log('[INGLY v62] Items redesign: Sidebar · CSV · DB Laser IT 65+ items · Dimensioni · SupplierURL · LowStock banner');


// ══════════════════════════════════════════════════════════════════════════════
// INGLY v64 — AI BUSINESS OPERATING SYSTEM
// Architecture: BusinessDataWarehouse → Intelligence Engines → UI
// Modules: BDW · ClientIntelligence · GrowthEngine · FinancialForecaster
//          ProductionOptimizer · ClientPricelists · ListinoTabs
//          EnhancedDecisionEngine · Anomaly Detection · Lead Scoring
// ══════════════════════════════════════════════════════════════════════════════

// ── BUSINESS DATA WAREHOUSE ──────────────────────────────────────────────────
// Single source of truth. All intelligence modules read from here.

// ══════════════════════════════════════════════════════════════════════════════
// LEAD SCORER v65 — Dedicated view with scores, actions, export
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// KPI COHERENCE TEST v65 — verifica che BDW = KPIEngine = IntelHub/DataLayer
// ══════════════════════════════════════════════════════════════════════════════
const ListinoTabs = {
  async show(tab) {
    // Update tab buttons
    ['calc','pricelists','offers','analysis'].forEach(t=>{
      const btn=eid('lt-tab-'+t);
      if(btn) btn.className='btn '+(t===tab?'btn-primary':'btn-secondary')+' btn-sm';
    });
    const calc=eid('lt-calc-content');
    const dyn=eid('lt-dynamic-panel');
    if(!calc||!dyn) return;
    if(tab==='calc'){calc.style.display='';dyn.style.display='none';return;}
    calc.style.display='none'; dyn.style.display='';
    if(tab==='pricelists') await this._showPricelists(dyn);
    else if(tab==='offers') await this._showOffers(dyn);
    else if(tab==='analysis') await this._showAnalysis(dyn);
  },

  async _showPricelists(el) {
    const pls=await IDB.getAll('client_pricelists').catch(()=>[]);
    const clients=await AppStore.get('clients').catch(()=>[]);
    el.innerHTML=`
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div class="card-title">📁 Listini Clienti Personalizzati</div>
          <button onclick="ListinoTabs.newPricelist()" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> Nuovo Listino</button>
        </div>
        ${pls.length===0?`<div style="text-align:center;padding:30px;color:var(--text-dim)">
          <i class="fas fa-file-invoice" style="font-size:28px;opacity:.15;display:block;margin-bottom:10px"></i>
          Nessun listino personalizzato ancora.<br>
          <small>Crea listini per wedding planner, grossisti, aziende — con sconti categoria personalizzati.</small>
        </div>`:
          pls.map(pl=>{
            const cl=clients.find(c=>String(c.id)===String(pl.clientId));
            return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);margin-bottom:8px">
              <div style="flex:1">
                <div style="font-weight:700;font-size:13px">${pl.name}</div>
                <div style="font-size:11px;color:var(--text-muted)">${cl?cl.name:pl.clientGroup||'Gruppo generico'} · ${(pl.discounts||[]).length} regole · sconto base ${pl.baseDiscount||0}%</div>
              </div>
              <button onclick="ListinoTabs.genPDF(${pl.id})" style="padding:5px 12px;background:var(--primary);border:none;color:#000;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">📄 PDF</button>
              <button onclick="ListinoTabs.deletePricelist(${pl.id})" style="padding:5px 10px;background:none;border:1px solid #ef444440;color:#ef4444;border-radius:7px;cursor:pointer;font-size:11px">🗑️</button>
            </div>`;
          }).join('')}
      </div>`;
  },

  async newPricelist() {
    const clients=await AppStore.get('clients').catch(()=>[]);
    const modal=document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick=e=>{if(e.target===modal)modal.remove();};
    modal.innerHTML=`<div style="background:var(--bg-card);border-radius:16px;padding:24px;max-width:480px;width:100%;border:1px solid var(--border)">
      <div style="font-size:15px;font-weight:800;margin-bottom:16px">📁 Nuovo Listino Cliente</div>
      <div class="form-group"><label class="form-label">Nome Listino</label><input id="npl-name" class="form-control" placeholder="es. Listino Wedding, Grossista Nord"></div>
      <div class="form-group"><label class="form-label">Cliente / Gruppo</label>
        <select id="npl-client" class="form-control"><option value="">-- Gruppo generico --</option>
          ${clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
        </select></div>
      <div class="form-group"><label class="form-label">Sconto Base %</label><input id="npl-disc" type="number" class="form-control" placeholder="10" min="0" max="60"></div>
      <div class="form-group"><label class="form-label">Note interne</label><input id="npl-notes" class="form-control" placeholder="Condizioni speciali..."></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
        <button onclick="this.closest('[style*=position]').remove()" class="btn btn-secondary">Annulla</button>
        <button onclick="ListinoTabs._savePricelist(this)" class="btn btn-primary">💾 Salva</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
  },

  async _savePricelist(btn) {
    const name=eid('npl-name')?.value?.trim();
    if(!name){toast('Nome obbligatorio','warning');return;}
    const pl={id:Date.now(),name,clientId:eid('npl-client')?.value||null,
      clientGroup:eid('npl-client')?.options[eid('npl-client')?.selectedIndex]?.text||'',
      baseDiscount:parseFloat(eid('npl-disc')?.value)||0,
      notes:eid('npl-notes')?.value||'',discounts:[],createdAt:new Date().toISOString()};
    await IDB.put('client_pricelists',pl);
    btn.closest('[style*="position"]')?.remove();
    const dyn=eid('lt-dynamic-panel');
    if(dyn) await this._showPricelists(dyn);
    toast(`Listino "${name}" creato ✅`,'success');
  },

  async deletePricelist(id) {
    if(!await askConfirm('Eliminare questo listino?')) return;
    await IDB.del('client_pricelists',id)
    const dyn=eid('lt-dynamic-panel');
    if(dyn) await this._showPricelists(dyn);
    toast('Listino eliminato','success');
  },

  async genPDF(id) {
    const pl=await IDB.get('client_pricelists',id).catch(()=>null);
    if(!pl){toast('Listino non trovato','warning');return;}
    if(!window.jspdf?.jsPDF){toast('jsPDF non disponibile','warning');return;}
    const catalog=await AppStore.get('catalog').catch(()=>[]);
    const cfg=await IDB.get('settings','main')||{};
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF();
    doc.setFillColor(251,191,36); doc.rect(0,0,210,28,'F');
    doc.setFontSize(16);doc.setTextColor(0);doc.setFont(undefined,'bold');
    doc.text(cfg.company||'INGLY LASER STUDIO',14,14);
    doc.setFontSize(10);doc.setFont(undefined,'normal');
    doc.text('LISTINO PERSONALIZZATO — '+pl.name,14,22);
    doc.text(new Date().toLocaleDateString('it-IT'),170,22);
    const disc=pl.baseDiscount||0;
    const rows=catalog.filter(c=>c.salePrice>0).map(c=>[
      c.name||'—',c.category||'—',
      fmtCur(+c.salePrice||0),
      disc?'-'+disc+'%':'—',
      fmtCur((+c.salePrice||0)*(1-disc/100))
    ]);
    doc.autoTable({startY:36,head:[['Prodotto','Cat.','Prezzo Base','Sconto','Prezzo Listino']],
      body:rows,theme:'grid',
      headStyles:{fillColor:[40,40,50],textColor:[251,191,36],fontStyle:'bold',fontSize:8},
      styles:{fontSize:8},columnStyles:{2:{halign:'right'},3:{halign:'center'},4:{halign:'right',fontStyle:'bold'}}});
    const fy=doc.lastAutoTable.finalY+8;
    doc.setFontSize(8);doc.setTextColor(120);
    doc.text(`Listino riservato a: ${pl.clientGroup||pl.name} · Sconto base: ${disc}%`,14,fy);
    if(cfg.email) doc.text('Contatto: '+cfg.email,14,fy+6);
    doc.save(`Listino_${pl.name.replace(/\s+/g,'-')}_${new Date().toLocaleDateString('it-IT').replace(/\//g,'-')}.pdf`);
    toast('📄 PDF listino generato','success');
  },

  async _showOffers(el) {
    const pls=await IDB.getAll('client_pricelists').catch(()=>[]);
    const catalog=await AppStore.get('catalog').catch(()=>[]);
    el.innerHTML=`<div class="card">
      <div class="card-title">📦 Genera Offerta PDF Personalizzata</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div class="form-group"><label class="form-label">Listino da applicare</label>
          <select id="off-pl" class="form-control">
            <option value="">-- Prezzi standard --</option>
            ${pls.map(pl=>`<option value="${pl.id}">${pl.name} (-${pl.baseDiscount}%)</option>`).join('')}
          </select></div>
        <div class="form-group"><label class="form-label">Valida (giorni)</label>
          <input id="off-val" type="number" class="form-control" value="30"></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px">Prodotti (seleziona)</div>
      <div style="max-height:200px;overflow-y:auto;margin-bottom:14px">
        ${catalog.filter(c=>c.salePrice>0).slice(0,25).map(c=>`
          <label style="display:flex;align-items:center;gap:8px;padding:5px 8px;font-size:11px;cursor:pointer;border-radius:4px" class="ls-row-hover">
            <input type="checkbox" value="${c.id}" name="off-prod"> ${c.name} — ${fmtCur(+c.salePrice||0)}
          </label>`).join('')}
      </div>
      <button onclick="ListinoTabs._genOfferPDF()" class="btn btn-primary w-full">📄 Genera PDF Offerta Cliente</button>
    </div>`;
  },

  async _genOfferPDF() {
    if(!window.jspdf?.jsPDF){toast('jsPDF non disponibile','warning');return;}
    const selected=[...document.querySelectorAll('input[name="off-prod"]:checked')];
    if(!selected.length){toast('Seleziona almeno un prodotto','warning');return;}
    const plId=parseInt(eid('off-pl')?.value);
    const pl=plId?await IDB.get('client_pricelists',plId).catch(()=>null):null;
    const disc=pl?.baseDiscount||0;
    const validity=parseInt(eid('off-val')?.value)||30;
    const catalog=await AppStore.get('catalog').catch(()=>[]);
    const cfg=await IDB.get('settings','main')||{};
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF();
    doc.setFillColor(40,40,50);doc.rect(0,0,210,30,'F');
    doc.setFontSize(18);doc.setTextColor(251,191,36);doc.setFont(undefined,'bold');
    doc.text(cfg.company||'INGLY',14,16);
    doc.setFontSize(10);doc.setTextColor(200,200,200);doc.setFont(undefined,'normal');
    doc.text('OFFERTA PERSONALIZZATA'+(pl?' — '+pl.name:''),14,24);
    doc.setTextColor(180,180,180);
    doc.text(`Valida ${validity} giorni · ${new Date().toLocaleDateString('it-IT')}`,148,24);
    const rows=selected.map(cb=>{
      const item=catalog.find(c=>String(c.id)===cb.value);
      if(!item) return null;
      const base=+(item.salePrice||0);
      const final=base*(1-disc/100);
      return [item.name||'—',item.category||'—',fmtCur(base),disc?'-'+disc+'%':'—',fmtCur(final)];
    }).filter(Boolean);
    doc.autoTable({startY:38,head:[['Prodotto','Categoria','Prezzo','Sconto','Totale']],
      body:rows,theme:'striped',
      headStyles:{fillColor:[251,191,36],textColor:[0,0,0],fontStyle:'bold',fontSize:9},
      styles:{fontSize:9},
      columnStyles:{2:{halign:'right'},3:{halign:'center'},4:{halign:'right',fontStyle:'bold',textColor:[34,197,94]}}});
    const fy=doc.lastAutoTable.finalY+12;
    if(disc>0){
      doc.setFillColor(34,197,94,20);
      doc.setDrawColor(34,197,94);
      doc.roundedRect(14,fy-4,182,16,3,3,'FD');
      doc.setFontSize(10);doc.setTextColor(34,197,94);doc.setFont(undefined,'bold');
      doc.text(`✓ Sconto riservato ${disc}% applicato — offerta valida ${validity} giorni`,18,fy+7);
    }
    const fy2=fy+20;
    doc.setFontSize(8);doc.setTextColor(120);doc.setFont(undefined,'normal');
    if(cfg.piva) doc.text('P.IVA: '+cfg.piva,14,fy2);
    if(cfg.email) doc.text('Email: '+cfg.email,14,fy2+5);
    doc.text('Per accettare rispondere a questa email indicando "OFFERTA ACCETTATA".',14,fy2+12);
    doc.save(`Offerta_${(pl?.name||'Standard').replace(/\s+/g,'-')}_${new Date().toLocaleDateString('it-IT').replace(/\//g,'-')}.pdf`);
    toast('📄 PDF Offerta generato','success');
  },

  async _showAnalysis(el) {
    await BDW.init();
    const m=BDW.metrics;
    const pls=await IDB.getAll('client_pricelists').catch(()=>[]);
    el.innerHTML=`<div class="card">
      <div class="card-title">📈 Analisi Impatto Sconti</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
        <div style="text-align:center;padding:14px;background:var(--bg-card2);border-radius:10px">
          <div style="font-size:20px;font-weight:900;color:#22c55e">${fmtCur(m.revenue.mtd)}</div>
          <div style="font-size:10px;color:var(--text-muted)">Revenue MTD base</div>
        </div>
        <div style="text-align:center;padding:14px;background:var(--bg-card2);border-radius:10px">
          <div style="font-size:20px;font-weight:900;color:#f59e0b">${m.finance.netMarginPct.toFixed(1)}%</div>
          <div style="font-size:10px;color:var(--text-muted)">Margine netto medio</div>
        </div>
        <div style="text-align:center;padding:14px;background:var(--bg-card2);border-radius:10px">
          <div style="font-size:20px;font-weight:900;color:#a855f7">${pls.length}</div>
          <div style="font-size:10px;color:var(--text-muted)">Listini attivi</div>
        </div>
      </div>
      ${pls.length?`<div style="font-size:11px;font-weight:700;margin-bottom:10px">Impatto stimato per listino</div>
        ${pls.map(pl=>{
          const impact=m.revenue.mtd*(pl.baseDiscount/100);
          const newMargin=m.finance.netMarginPct-(pl.baseDiscount||0);
          return `<div style="display:flex;align-items:center;gap:12px;padding:9px 14px;background:var(--bg-card2);border-radius:8px;margin-bottom:7px">
            <div style="flex:1"><div style="font-size:12px;font-weight:600">${pl.name}</div>
              <div style="font-size:10px;color:var(--text-muted)">Sconto ${pl.baseDiscount||0}% · ${pl.clientGroup||'Generico'}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:12px;color:#ef4444;font-weight:700">-${fmtCur(impact)}/mese</div>
              <div style="font-size:9px;color:${newMargin>15?'#f59e0b':'#ef4444'}">Margine → ${newMargin.toFixed(1)}%</div>
            </div>
          </div>`;
        }).join('')}`:'<div style="text-align:center;padding:20px;color:var(--text-dim)">Crea listini clienti per vedere l\'analisi impatto</div>'}
    </div>`;
  },
};

// ── ENHANCED DECISION ENGINE — Hybrid AI+Rules ────────────────────────────────
(function upgradeDecisionEngine(){
  const _w=()=>{
    if(typeof DecisionEngine==='undefined'){setTimeout(_w,500);return;}
    if(DecisionEngine._v64){return;} DecisionEngine._v64=true;

    // Intercept loadLocal to use BDW for consistent data
    const origLoad=DecisionEngine.loadLocal.bind(DecisionEngine);
    DecisionEngine.loadLocal=async function(){
      await BDW.init(); // ensure fresh data
      return origLoad();
    };

    // Intercept runFull to pass BDW summary to AI prompt
    const origFull=DecisionEngine.runFull?.bind(DecisionEngine);
    if(origFull){
      DecisionEngine.runFull=async function(){
        await BDW.init();
        // Capture local analysis text before AI call
        const urgEl=eid('de-urgent'), impEl=eid('de-improve'), oppEl=eid('de-opp');
        await DecisionEngine.loadLocal();
        const urgTxt=urgEl?.innerText||'—';
        const impTxt=impEl?.innerText||'—';
        const oppTxt=oppEl?.innerText||'—';
        // Store for AI to use
        DecisionEngine._localAnalysis={urgent:urgTxt,improve:impTxt,opp:oppTxt};
        return origFull();
      };
    }

    console.log('[v64] DecisionEngine upgraded with BDW integration');
  };
  setTimeout(_w,2200);
})();

// ── AUTO INITIALIZATION ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(async()=>{
    // Init Production Optimizer in orders view
    const ordersEl=eid('po-panel');
    if(ordersEl) (typeof ProductionOptimizer!=='undefined'&&ProductionOptimizer.render());

    // Init RFM strip in clients view
    setTimeout(()=>ClientIntelligence._renderRFMStrip(),500);

    // Pre-init BDW when heavy modules open
    const origNav=App?.navigate?.bind(App);
    if(origNav&&!App._v64navPatch){
      App._v64navPatch=true;
      App.navigate=function(s){
        origNav(s);
        if(['clientintel','growthengine','forecaster','decision','opportunity','intel','clients','orders'].includes(s)){
          BDW.init();
          if(s==='clientintel') setTimeout(()=>(typeof ClientIntelligence!=='undefined'&&ClientIntelligence.render()),150);
          if(s==='growthengine') setTimeout(()=>(typeof GrowthEngine!=='undefined'&&GrowthEngine.render()),150);
          if(s==='forecaster') setTimeout(()=>(typeof FinancialForecaster!=='undefined'&&FinancialForecaster.render()),150);
          if(s==='orders') setTimeout(()=>(typeof ProductionOptimizer!=='undefined'&&ProductionOptimizer.render()),300);
          if(s==='clients') setTimeout(()=>ClientIntelligence._renderRFMStrip(),200);
          if(s==='listino') setTimeout(()=>ListinoTabs.show('calc'),100);
        }
      };
    }

    console.log('[v64] ✅ AI Business OS initialized: BDW · ClientIntelligence · GrowthEngine · FinancialForecaster · ProductionOptimizer · ListinoTabs');
  },2000);
},{once:true});

// Refresh BDW after data changes
// BDW incremental refresh via touch() — duplicated listener removed v73
Bus.on('data:updated',()=>{ setTimeout(()=>HealthScore.update(),2000); });

// ═══════════════════════════════════════════════════════
// v67 — SPRINT 3: QUOTE INTELLIGENCE
// ═══════════════════════════════════════════════════════
window.CatalogPDF = CatalogPDF;
window.CatalogCats = CatalogCats;
window.Catalog = Catalog;
window.PricingEngine = PricingEngine;
window.Components = Components;
window.Gadgets = Gadgets;
window.Listino = Listino;
window.CatalogQR = typeof CatalogQR !== 'undefined' ? CatalogQR : {};
window.CatalogView = typeof CatalogView !== 'undefined' ? CatalogView : {};
window.Anchoring = Anchoring;
window.LaserCalcPage = LaserCalcPage;
window.AnchorAI = AnchorAI;
window.PaintCalc = PaintCalc;
window.ListinoTabs = ListinoTabs;

