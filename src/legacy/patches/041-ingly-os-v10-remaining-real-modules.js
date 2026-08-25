
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v10 — REMAINING REAL MODULES
// B2BPitch · ContentPerf · CompetitorMon
// ════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 🏢 B2B PITCH BUILDER — Genera preventivi e pitch professionali
// ═══════════════════════════════════════════════════════════════════════
const B2BPitch = {
  _SK: 'ingly_b2b_pitches_v1',
  _TEMPLATES: [
    {id:'corporate_gift', label:'🎁 Regalo Aziendale', icon:'🏢',
     context:'Regali di Natale/eventi per aziende. Pack personalizzato con logo.'},
    {id:'office_branding', label:'🏷️ Branding Ufficio', icon:'🔖',
     context:'Targhe porta ufficio, segnaletica, personalizzazione spazi di lavoro.'},
    {id:'event_gadget', label:'🎪 Gadget Evento', icon:'⭐',
     context:'Gadget personalizzati per convegni, team building, fiere, lanci prodotto.'},
    {id:'restaurant', label:'🍽️ Ristorante / Hotel', icon:'🍽️',
     context:'Menu laser, insegne, branding, decor personalizzato per locali e hotel.'},
    {id:'wedding_planner', label:'💒 Wedding Planner', icon:'💒',
     context:'Partnership con wedding planner per forniture wholesale segnaposto/bomboniere.'},
    {id:'retail', label:'🛍️ Retail / Negozio', icon:'🛍️',
     context:'Insegne LED, decor vetrina, etichette prodotto personalizzate per negozi.'},
  ],

  getPitches(){ try{return JSON.parse(localStorage.getItem(this._SK)||'[]')}catch{return[]} },
  savePitches(d){ try{localStorage.setItem(this._SK,JSON.stringify(d))}catch{} },

  render(){
    const el=document.getElementById('view-b2bpitch');
    if(!el) return;
    const pitches=this.getPitches();
    const hasAI=typeof AIProvider!=='undefined'&&AIProvider.hasKey();

    el.innerHTML=`
    <div style="padding:16px 20px;max-width:1100px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">
        <div style="width:48px;height:48px;border-radius:13px;background:linear-gradient(135deg,#38bdf8,#0ea5e9);display:flex;align-items:center;justify-content:center;font-size:24px">🏢</div>
        <div style="flex:1">
          <h2 style="margin:0 0 2px;font-size:20px;font-weight:800;background:linear-gradient(135deg,#38bdf8,#0ea5e9);-webkit-background-clip:text;-webkit-text-fill-color:transparent">B2B Pitch Builder</h2>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">Genera email e preventivi B2B professionali · Corporate gifts · Office branding · Wholesale</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <!-- LEFT: Generator -->
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
            <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🎯 Tipo di Pitch B2B</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
              ${this._TEMPLATES.map(t=>`
                <button onclick="document.getElementById('b2b-type').value='${t.id}';document.querySelectorAll('.b2b-type-btn').forEach(b=>{b.style.background='var(--bg-card2)';b.style.borderColor='var(--border)';b.style.color='var(--text-muted)'});this.style.background='#38bdf812';this.style.borderColor='#38bdf8';this.style.color='#38bdf8'"
                  class="b2b-type-btn" style="padding:8px 10px;text-align:left;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);cursor:pointer;font-size:10px;font-weight:700;transition:.15s;display:flex;align-items:center;gap:6px">
                  <span style="font-size:14px">${t.icon}</span> ${t.label}
                </button>`).join('')}
              <input id="b2b-type" value="corporate_gift" type="hidden">
            </div>
          </div>

          <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
            <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📋 Dettagli Cliente</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Azienda / Cliente</label>
                <input id="b2b-company" class="form-control" placeholder="es. Studio Legale Rossi & Associati" style="font-size:12px"></div>
              <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Referente</label>
                <input id="b2b-contact" class="form-control" placeholder="es. Dott.ssa Maria Bianchi" style="font-size:12px"></div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Quantità stimata</label>
                  <input id="b2b-qty" class="form-control" placeholder="es. 50 pezzi" style="font-size:12px"></div>
                <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Budget indicativo</label>
                  <input id="b2b-budget" class="form-control" placeholder="es. €500-800" style="font-size:12px"></div>
              </div>
              <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Note specifiche (opzionale)</label>
                <textarea id="b2b-notes" class="form-control" rows="2" style="font-size:12px;resize:none" placeholder="Colori aziendali, logo, personalizzazioni richieste…"></textarea></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px">
              <button onclick="B2BPitch.generateEmail()" style="padding:9px;background:linear-gradient(135deg,#38bdf8,#0ea5e9);color:#000;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-size:12px">📧 Genera Email</button>
              <button onclick="B2BPitch.generateQuote()" style="padding:9px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-size:12px">💰 Genera Preventivo</button>
            </div>
          </div>
        </div>

        <!-- RIGHT: Output -->
        <div style="display:flex;flex-direction:column;gap:12px">
          <div id="b2b-output" style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border);min-height:280px;display:flex;align-items:center;justify-content:center;flex:1">
            <div style="text-align:center;color:var(--text-muted)">
              <div style="font-size:40px;margin-bottom:10px">🏢</div>
              <div style="font-size:12px">Compila i dettagli e genera un pitch professionale</div>
            </div>
          </div>

          <!-- Saved Pitches -->
          ${pitches.length?`<div style="background:var(--bg-card);border-radius:12px;padding:12px;border:1px solid var(--border)">
            <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">📁 Pitch Salvati (${pitches.length})</div>
            ${pitches.slice(0,4).map(p=>`<div style="padding:7px 10px;border-radius:7px;background:var(--bg-card2);border:1px solid var(--border);margin-bottom:5px;cursor:pointer;font-size:11px" onclick="B2BPitch.loadPitch('${p.id}')">
              <div style="font-weight:700;color:var(--text)">${p.company||'Cliente'}</div>
              <div style="color:var(--text-muted);font-size:10px">${p.type} · ${p.ts}</div>
            </div>`).join('')}
          </div>`:''}
        </div>
      </div>

      <!-- B2B Pricing Guide -->
      <div style="margin-top:14px;background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
        <div style="font-size:11px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">💡 Guida Prezzi B2B — Riferimenti per corporate</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          ${[
            {prod:'Kit regalo 5pz (portachiavi laser)', qty:'50+', price:'€7-12/pz', margin:'65%'},
            {prod:'Targa ufficio acrilico', qty:'20+', price:'€18-28/pz', margin:'68%'},
            {prod:'Bundle regalo Natale', qty:'100+', price:'€12-20/pz', margin:'60%'},
            {prod:'Insegna LED custom', qty:'1+', price:'€90-180', margin:'72%'},
          ].map(p=>`<div style="padding:10px;background:var(--bg-card2);border-radius:8px;border:1px solid var(--border)">
            <div style="font-size:10px;font-weight:700;color:var(--text);margin-bottom:4px;line-height:1.3">${p.prod}</div>
            <div style="font-size:9px;color:var(--text-dim)">Qty: ${p.qty}</div>
            <div style="font-size:13px;font-weight:800;color:#22c55e">${p.price}</div>
            <div style="font-size:9px;color:#f59e0b">Margine: ${p.margin}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>`;
  },

  async generateEmail(){
    const type=document.getElementById('b2b-type')?.value||'corporate_gift';
    const company=document.getElementById('b2b-company')?.value?.trim()||'Azienda';
    const contact=document.getElementById('b2b-contact')?.value?.trim()||'';
    const qty=document.getElementById('b2b-qty')?.value||'da definire';
    const budget=document.getElementById('b2b-budget')?.value||'';
    const notes=document.getElementById('b2b-notes')?.value||'';
    const tpl=this._TEMPLATES.find(t=>t.id===type)||this._TEMPLATES[0];
    const out=document.getElementById('b2b-output');
    if(!out) return;
    out.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted)">🤖 Generazione email B2B…</div>';
    try{
      const r=await AIStudio._callAI(`Genera una email professionale B2B per un artigiano laser siciliano (Ingly Design) che propone i propri servizi a:\n\nAzienda: ${company}\nReferente: ${contact||'responsabile acquisti'}\nTipo pitch: ${tpl.label} — ${tpl.context}\nQuantità: ${qty}\nBudget indicato: ${budget||'flessibile'}\nNote: ${notes||'nessuna'}\n\nL'email deve essere: professionale ma calda, evidenziare qualità artigianale italiana, proporre un sopralluogo/call conoscitiva, includere 2-3 esempi concreti di prodotti laser adatti alla loro esigenza. Struttura: oggetto email, corpo, firma.\n\nMax 300 parole. In italiano.`);
      out.innerHTML=`
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border)">
            <div style="font-size:12px;font-weight:700;color:#38bdf8">📧 Email B2B — ${tpl.label}</div>
            <div style="display:flex;gap:5px">
              <button onclick="navigator.clipboard.writeText(document.getElementById('b2b-text').innerText).then(()=>toast('📋 Copiato!','success'))" style="padding:4px 9px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:5px;color:var(--primary);cursor:pointer;font-size:10px;font-weight:700"><i class="fas fa-copy"></i> Copia</button>
              <button onclick="B2BPitch.savePitch('${type}','${company}',document.getElementById('b2b-text').innerText)" style="padding:4px 9px;background:#38bdf812;border:1px solid #38bdf840;border-radius:5px;color:#38bdf8;cursor:pointer;font-size:10px;font-weight:700">💾 Salva</button>
              <button onclick="WAQuick&&WAQuick.openPanel&&WAQuick.openPanel('',document.getElementById('b2b-text').innerText.slice(0,300))" style="padding:4px 9px;background:#25D36612;border:1px solid #25D36640;border-radius:5px;color:#25D366;cursor:pointer;font-size:10px;font-weight:700">💬 WA</button>
            </div>
          </div>
          <div id="b2b-text" style="font-size:12px;line-height:1.8;color:var(--text);white-space:pre-wrap">${r}</div>
        </div>`;
    }catch(e){
      out.innerHTML='<div style="text-align:center;padding:20px"><div style="color:var(--text-muted);margin-bottom:8px">Configura API Key AI in Impostazioni</div><button onclick="App.navigate(\'settings\')" class="btn btn-primary btn-sm">⚙️ Impostazioni</button></div>';
    }
  },

  async generateQuote(){
    const type=document.getElementById('b2b-type')?.value||'corporate_gift';
    const company=document.getElementById('b2b-company')?.value?.trim()||'Cliente';
    const qty=document.getElementById('b2b-qty')?.value||'50';
    const budget=document.getElementById('b2b-budget')?.value||'';
    const notes=document.getElementById('b2b-notes')?.value||'';
    const tpl=this._TEMPLATES.find(t=>t.id===type)||this._TEMPLATES[0];
    const out=document.getElementById('b2b-output');
    if(!out) return;
    out.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted)">🤖 Generazione preventivo…</div>';
    try{
      const r=await AIStudio._callAI(`Genera un preventivo professionale per un artigiano laser (Ingly Design, Sicilia):\n\nCliente: ${company}\nTipo: ${tpl.label}\nQuantità: ${qty}\nBudget indicato: ${budget||'flessibile'}\nNote: ${notes||'prodotti laser personalizzati'}\n\nPreventivo strutturato con: intestazione, righe prodotti con qty/prezzo unitario/totale, note su personalizzazione e tempistiche, condizioni di pagamento (50% acconto), validità preventivo (7 giorni).\n\nInclude 3-4 voci prodotto realistiche. Usa tabella ASCII semplice.\nMax 250 parole.`);
      out.innerHTML=`
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border)">
            <div style="font-size:12px;font-weight:700;color:#0ea5e9">💰 Preventivo — ${company}</div>
            <div style="display:flex;gap:5px">
              <button onclick="navigator.clipboard.writeText(document.getElementById('b2b-text').innerText).then(()=>toast('📋 Copiato!','success'))" style="padding:4px 9px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:5px;color:var(--primary);cursor:pointer;font-size:10px;font-weight:700"><i class="fas fa-copy"></i> Copia</button>
            </div>
          </div>
          <div id="b2b-text" style="font-size:11px;line-height:1.7;color:var(--text);white-space:pre-wrap;font-family:monospace">${r}</div>
        </div>`;
    }catch(e){
      out.innerHTML='<div style="text-align:center;padding:20px"><button onclick="App.navigate(\'settings\')" class="btn btn-primary btn-sm">⚙️ Configura AI</button></div>';
    }
  },

  savePitch(type,company,text){
    const d=this.getPitches();
    d.unshift({id:'p_'+Date.now(),type,company,text,ts:new Date().toLocaleDateString('it-IT')});
    this.savePitches(d.slice(0,20));
    toast('💾 Pitch salvato!','success');
    this.render();
  },
  loadPitch(id){
    const p=this.getPitches().find(x=>x.id===id);
    if(!p) return;
    const out=document.getElementById('b2b-output');
    if(out) out.innerHTML=`<div><div style="font-size:12px;font-weight:700;color:#38bdf8;margin-bottom:8px">${p.company}</div><div style="font-size:11px;line-height:1.7;white-space:pre-wrap;color:var(--text)">${p.text}</div></div>`;
  }
};
window.B2BPitch = B2BPitch;


// ═══════════════════════════════════════════════════════════════════════
// 📊 CONTENT PERFORMANCE — Track post reach, conversions, revenue
// ═══════════════════════════════════════════════════════════════════════
const ContentPerf = {
  _SK: 'ingly_contentperf_v1',
  _PLATFORMS: ['Instagram','TikTok','Facebook','Pinterest','Etsy','Email','WhatsApp'],

  get(){ try{return JSON.parse(localStorage.getItem(this._SK)||'[]')}catch{return[]} },
  save(d){ try{localStorage.setItem(this._SK,JSON.stringify(d))}catch{} },

  render(){
    const el=document.getElementById('view-contentperf');
    if(!el) return;
    const entries=this.get();

    // Compute stats
    const totalReach=entries.reduce((a,e)=>a+(parseInt(e.reach)||0),0);
    const totalSales=entries.reduce((a,e)=>a+(parseInt(e.sales)||0),0);
    const totalRev=entries.reduce((a,e)=>a+(parseFloat(e.revenue)||0),0);
    const topEntry=entries.sort((a,b)=>(parseFloat(b.revenue)||0)-(parseFloat(a.revenue)||0))[0];

    el.innerHTML=`
    <div style="padding:16px 20px;max-width:1200px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--border)">
        <div style="width:48px;height:48px;border-radius:13px;background:linear-gradient(135deg,#f472b6,#ec4899);display:flex;align-items:center;justify-content:center;font-size:24px">📊</div>
        <div style="flex:1">
          <h2 style="margin:0 0 2px;font-size:20px;font-weight:800;background:linear-gradient(135deg,#f472b6,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Content Performance</h2>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">Traccia il ROI di ogni post social · Reach → Vendite → Revenue</p>
        </div>
        <button onclick="ContentPerf.openAdd()" style="padding:8px 14px;background:linear-gradient(135deg,#f472b6,#ec4899);color:#fff;border:none;border-radius:9px;font-weight:700;cursor:pointer;font-size:12px"><i class="fas fa-plus"></i> Aggiungi Post</button>
      </div>

      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
        ${[
          {em:'👁️',label:'Reach totale',val:totalReach.toLocaleString('it-IT'),col:'#60a5fa'},
          {em:'🛒',label:'Vendite tracciate',val:totalSales,col:'#22c55e'},
          {em:'💰',label:'Revenue da social',val:'€'+totalRev.toFixed(0),col:'#f59e0b'},
          {em:'🏆',label:'Post migliore',val:topEntry?topEntry.platform:'—',col:'#f472b6'},
        ].map(k=>`<div style="padding:14px;background:var(--bg-card);border-radius:11px;border:1px solid var(--border);text-align:center">
          <div style="font-size:22px;margin-bottom:4px">${k.em}</div>
          <div style="font-size:18px;font-weight:800;color:${k.col}">${k.val}</div>
          <div style="font-size:10px;color:var(--text-dim)">${k.label}</div>
        </div>`).join('')}
      </div>

      <!-- Table -->
      ${entries.length?`
      <div style="background:var(--bg-card);border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:14px">
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr style="background:var(--bg-card2)">
              <th style="padding:10px 12px;text-align:left;color:var(--text-dim);font-weight:700">Data</th>
              <th style="padding:10px 12px;text-align:left;color:var(--text-dim);font-weight:700">Piattaforma</th>
              <th style="padding:10px 12px;text-align:left;color:var(--text-dim);font-weight:700">Contenuto</th>
              <th style="padding:10px 12px;text-align:center;color:var(--text-dim);font-weight:700">👁️ Reach</th>
              <th style="padding:10px 12px;text-align:center;color:var(--text-dim);font-weight:700">❤️ Like</th>
              <th style="padding:10px 12px;text-align:center;color:var(--text-dim);font-weight:700">🛒 Vendite</th>
              <th style="padding:10px 12px;text-align:center;color:var(--text-dim);font-weight:700">💰 Revenue</th>
              <th style="padding:10px 12px;text-align:center;color:var(--text-dim);font-weight:700">📈 Conv%</th>
              <th style="padding:10px 12px;text-align:center;color:var(--text-dim);font-weight:700"></th>
            </tr></thead>
            <tbody>
            ${entries.map(e=>{
              const conv=e.reach>0?((e.sales/e.reach)*100).toFixed(2):'—';
              const platColors={'Instagram':'#e1306c','TikTok':'#ff0050','Facebook':'#1877f2','Pinterest':'#e60023','Etsy':'#f0728f','Email':'#22c55e','WhatsApp':'#25D366'};
              const col=platColors[e.platform]||'#60a5fa';
              return `<tr style="border-top:1px solid var(--border);transition:.15s" onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background=''">
                <td style="padding:9px 12px;color:var(--text-muted);white-space:nowrap">${e.date||'—'}</td>
                <td style="padding:9px 12px"><span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:${col}20;color:${col};border:1px solid ${col}30">${e.platform}</span></td>
                <td style="padding:9px 12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)">${e.content||'—'}</td>
                <td style="padding:9px 12px;text-align:center;color:#60a5fa;font-weight:700">${(e.reach||0).toLocaleString()}</td>
                <td style="padding:9px 12px;text-align:center;color:#f472b6">${(e.likes||0).toLocaleString()}</td>
                <td style="padding:9px 12px;text-align:center;color:#22c55e;font-weight:700">${e.sales||0}</td>
                <td style="padding:9px 12px;text-align:center;color:#f59e0b;font-weight:700">€${parseFloat(e.revenue||0).toFixed(0)}</td>
                <td style="padding:9px 12px;text-align:center;color:${parseFloat(conv)>1?'#22c55e':'var(--text-dim)'}">${conv}${conv!=='—'?'%':''}</td>
                <td style="padding:9px 12px;text-align:center">
                  <button onclick="ContentPerf.deleteEntry('${e.id}')" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:11px" title="Elimina">🗑</button>
                </td>
              </tr>`;
            }).join('')}
            </tbody>
          </table>
        </div>
      </div>` : `
      <div style="text-align:center;padding:40px;color:var(--text-muted);background:var(--bg-card);border-radius:12px;border:1px solid var(--border)">
        <div style="font-size:40px;margin-bottom:12px">📊</div>
        <div style="font-size:14px;font-weight:600;margin-bottom:8px">Nessun post tracciato</div>
        <div style="font-size:12px;color:var(--text-dim);margin-bottom:16px">Aggiungi i tuoi post social per vedere quanto ogni contenuto genera in vendite</div>
        <button onclick="ContentPerf.openAdd()" class="btn btn-primary">➕ Aggiungi primo post</button>
      </div>`}

      <!-- AI Insights -->
      ${entries.length>=3?`
      <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:#f472b6">🤖 AI Insights — Cosa funziona meglio</div>
          <button onclick="ContentPerf.aiInsights()" style="padding:5px 12px;background:linear-gradient(135deg,#f472b6,#ec4899);color:#fff;border:none;border-radius:7px;font-weight:700;cursor:pointer;font-size:11px">Analizza →</button>
        </div>
        <div id="cp-ai-out" style="font-size:12px;color:var(--text-muted)">Clicca "Analizza" per scoprire quali contenuti convertono di più e come ottimizzare.</div>
      </div>`:''}

      <!-- Add Modal -->
      <div id="cp-modal" style="display:none;position:fixed;inset:0;background:#000b;z-index:9999;align-items:center;justify-content:center">
        <div id="cp-modal-body" style="background:var(--bg-card);border-radius:16px;width:min(520px,96vw);max-height:85vh;overflow-y:auto;border:1px solid var(--border2);box-shadow:0 24px 64px #000c"></div>
      </div>
    </div>`;
  },

  openAdd(){
    const modal=document.getElementById('cp-modal');
    const body=document.getElementById('cp-modal-body');
    if(!modal||!body) return;
    body.innerHTML=`
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:15px;font-weight:800">➕ Aggiungi Post</div>
        <button onclick="document.getElementById('cp-modal').style.display='none'" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px">✕</button>
      </div>
      <div style="padding:14px 18px;display:flex;flex-direction:column;gap:9px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Data</label>
            <input id="cp-f-date" type="date" class="form-control" value="${new Date().toISOString().split('T')[0]}" style="font-size:12px"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Piattaforma</label>
            <select id="cp-f-platform" class="form-control" style="font-size:12px">
              ${this._PLATFORMS.map(p=>`<option>${p}</option>`).join('')}
            </select></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">👁️ Reach / Impressioni</label>
            <input id="cp-f-reach" type="number" class="form-control" placeholder="es. 3200" style="font-size:12px"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">❤️ Like / Reazioni</label>
            <input id="cp-f-likes" type="number" class="form-control" placeholder="es. 145" style="font-size:12px"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">🛒 Vendite generate</label>
            <input id="cp-f-sales" type="number" class="form-control" placeholder="es. 4" style="font-size:12px"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">💰 Revenue (€)</label>
            <input id="cp-f-rev" type="number" step="0.01" class="form-control" placeholder="es. 68.00" style="font-size:12px"></div>
        </div>
        <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Descrizione contenuto</label>
          <input id="cp-f-content" class="form-control" placeholder="es. Reel segnaposto matrimonio, video processo laser" style="font-size:12px"></div>
        <button onclick="ContentPerf._save()" style="width:100%;padding:10px;background:linear-gradient(135deg,#f472b6,#ec4899);color:#fff;border:none;border-radius:9px;font-weight:800;cursor:pointer;font-size:13px">➕ Aggiungi</button>
      </div>`;
    modal.style.display='flex';
    modal.onclick=e=>{if(e.target===modal)modal.style.display='none';};
  },

  _save(){
    const d=this.get();
    d.unshift({
      id:'e_'+Date.now(),
      date:document.getElementById('cp-f-date')?.value||'',
      platform:document.getElementById('cp-f-platform')?.value||'Instagram',
      reach:parseInt(document.getElementById('cp-f-reach')?.value)||0,
      likes:parseInt(document.getElementById('cp-f-likes')?.value)||0,
      sales:parseInt(document.getElementById('cp-f-sales')?.value)||0,
      revenue:parseFloat(document.getElementById('cp-f-rev')?.value)||0,
      content:document.getElementById('cp-f-content')?.value||'',
    });
    this.save(d);
    document.getElementById('cp-modal').style.display='none';
    toast('✅ Post aggiunto!','success');
    this.render();
  },

  deleteEntry(id){
    this.save(this.get().filter(e=>e.id!==id));
    toast('Rimosso','info');
    this.render();
  },

  async aiInsights(){
    const entries=this.get().slice(0,10);
    const out=document.getElementById('cp-ai-out');
    if(out) out.innerHTML='<span style="color:var(--text-muted)">🤖 Analisi…</span>';
    const summary=entries.map(e=>`${e.platform}/${e.date}: reach ${e.reach}, likes ${e.likes}, vendite ${e.sales}, rev €${e.revenue}`).join('\n');
    try{
      const r=await AIStudio._callAI(`Analisi performance content per artigiano laser italiano:\n${summary}\n\nFornisci: piattaforma con miglior ROI, tipo di contenuto che converte, quando postare, come migliorare conversioni. Max 150 parole.`);
      if(out) out.innerHTML=r.replace(/\*\*([^*]+)\*\*/g,'<strong style="color:#f472b6">$1</strong>').replace(/\n/g,'<br>');
    }catch(e){if(out) out.innerHTML='<span style="color:var(--text-muted)">Configura API Key.</span>';}
  }
};
window.ContentPerf = ContentPerf;


// ═══════════════════════════════════════════════════════════════════════
// 🎯 COMPETITOR MONITOR — Track competitor prices and listings
// ═══════════════════════════════════════════════════════════════════════
const CompetitorMon = {
  _SK: 'ingly_compmon_v1',

  _PRESET_COMPETITORS: [
    {id:1,name:'LaserCraft Italia',url:'https://www.etsy.com/it/shop/LaserCraftItalia',platform:'Etsy',category:'Segnaposto matrimonio',priceRange:'€3-9',rating:4.8,reviews:1243,notes:'Top seller IT per segnaposto. Font calligrafici. Packaging premium.',lastCheck:''},
    {id:2,name:'WoodArtShop',url:'https://www.etsy.com/it/shop/WoodArtShop',platform:'Etsy',category:'Wall art legno',priceRange:'€25-80',rating:4.7,reviews:892,notes:'Wall art geometrici. Forte su acrilico mirror. Target fascia alta.',lastCheck:''},
    {id:3,name:'PersonalizedByUs',url:'https://www.etsy.com/search?q=personalized+laser+engraved&ships_to=IT',platform:'Etsy Global',category:'Custom gifts',priceRange:'$12-45',rating:4.9,reviews:5230,notes:'Top global seller USA. Standard qualità alta. Spedisce in EU.',lastCheck:''},
  ],

  get(){ try{return JSON.parse(localStorage.getItem(this._SK)||JSON.stringify(this._PRESET_COMPETITORS))}catch{return this._PRESET_COMPETITORS} },
  save(d){ try{localStorage.setItem(this._SK,JSON.stringify(d))}catch{} },

  render(){
    const el=document.getElementById('view-competitormon');
    if(!el) return;
    const competitors=this.get();
    const body=el.querySelector('#competitor-mon-body')||el;

    const html=`
    <div style="padding:0 0 16px">
      <!-- KPI Strip -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
        ${[
          {em:'🎯',label:'Competitor monitorati',val:competitors.length,col:'#ef4444'},
          {em:'⭐',label:'Rating medio competitor',val:(competitors.reduce((a,c)=>a+c.rating,0)/Math.max(competitors.length,1)).toFixed(1),col:'#fbbf24'},
          {em:'💬',label:'Review totali tracciate',val:competitors.reduce((a,c)=>a+c.reviews,0).toLocaleString(),col:'#60a5fa'},
        ].map(k=>`<div style="padding:12px;background:var(--bg-card);border-radius:10px;border:1px solid var(--border);text-align:center">
          <div style="font-size:20px;margin-bottom:3px">${k.em}</div>
          <div style="font-size:17px;font-weight:800;color:${k.col}">${k.val}</div>
          <div style="font-size:10px;color:var(--text-dim)">${k.label}</div>
        </div>`).join('')}
      </div>

      <!-- Competitor Cards -->
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px">
        ${competitors.map(comp=>`
          <div style="background:var(--bg-card);border-radius:12px;border:1px solid var(--border);padding:14px;transition:.15s" onmouseover="this.style.borderColor='#ef4444'" onmouseout="this.style.borderColor='var(--border)'">
            <div style="display:flex;align-items:flex-start;gap:12px">
              <div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#ef4444,#f97316);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🎯</div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
                  <span style="font-size:14px;font-weight:800;color:var(--text)">${comp.name}</span>
                  <span style="padding:2px 7px;background:#ef444415;border:1px solid #ef444430;border-radius:99px;font-size:9px;font-weight:700;color:#ef4444">${comp.platform}</span>
                  <span style="padding:2px 7px;background:var(--bg-card2);border:1px solid var(--border);border-radius:99px;font-size:9px;color:var(--text-muted)">${comp.category}</span>
                </div>
                <div style="display:flex;gap:16px;margin-bottom:6px;font-size:11px;flex-wrap:wrap">
                  <span style="color:#22c55e;font-weight:700">💰 ${comp.priceRange}</span>
                  <span style="color:#fbbf24;font-weight:700">⭐ ${comp.rating} · ${comp.reviews.toLocaleString()} reviews</span>
                </div>
                <div style="font-size:10px;color:var(--text-muted);line-height:1.4">${comp.notes}</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
                <a href="${comp.url}" target="_blank" style="padding:4px 8px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:6px;color:var(--primary);text-decoration:none;font-size:10px;font-weight:700;text-align:center">🔗 Apri</a>
                <button onclick="CompetitorMon.aiAnalyze(${comp.id})" style="padding:4px 8px;background:#ef444412;border:1px solid #ef444430;border-radius:6px;color:#ef4444;cursor:pointer;font-size:10px;font-weight:700">🤖 AI</button>
                <button onclick="CompetitorMon.delete(${comp.id})" style="padding:4px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text-dim);cursor:pointer;font-size:10px">🗑</button>
              </div>
            </div>
          </div>`).join('')}
      </div>

      <!-- Add Form -->
      <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border);margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">➕ Aggiungi Competitor</div>
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;align-items:end">
          <input id="cm-name" class="form-control" placeholder="Nome shop / brand" style="font-size:12px">
          <input id="cm-url" class="form-control" placeholder="URL Etsy shop" style="font-size:12px">
          <input id="cm-price" class="form-control" placeholder="Range prezzi" style="font-size:12px">
          <button onclick="CompetitorMon.add()" style="padding:8px 12px;background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:11px">+ Add</button>
        </div>
      </div>

      <!-- AI Gap Analysis -->
      <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:#ef4444">🤖 AI Gap Analysis — Come differenziarti</div>
          <button onclick="CompetitorMon.aiGapAnalysis()" style="padding:5px 12px;background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;border:none;border-radius:7px;font-weight:700;cursor:pointer;font-size:11px">Analizza →</button>
        </div>
        <div id="cm-ai-out" style="font-size:12px;color:var(--text-muted)">Clicca per analisi AI su come differenziarti dalla concorrenza monitorata.</div>
      </div>
    </div>`;

    if(el.querySelector('#competitor-mon-body')){
      el.querySelector('#competitor-mon-body').innerHTML=html;
    } else {
      el.innerHTML=`<div style="padding:16px 20px">${html}</div>`;
    }
  },

  add(){
    const name=document.getElementById('cm-name')?.value?.trim();
    if(!name){toast('Inserisci nome','warning');return;}
    const d=this.get();
    d.push({id:Date.now(),name,url:document.getElementById('cm-url')?.value||'',platform:'Etsy',category:'Prodotti laser',priceRange:document.getElementById('cm-price')?.value||'—',rating:0,reviews:0,notes:'',lastCheck:''});
    this.save(d);
    document.getElementById('cm-name').value='';
    document.getElementById('cm-url').value='';
    document.getElementById('cm-price').value='';
    toast('✅ Competitor aggiunto!','success');
    this.render();
  },

  delete(id){
    if(!confirm('Rimuovere questo competitor?')) return;
    this.save(this.get().filter(c=>c.id!==id));
    toast('Rimosso','info');
    this.render();
  },

  async aiAnalyze(id){
    const comp=this.get().find(c=>c.id===id);
    if(!comp) return;
    try{
      const r=await AIStudio._callAI(`Analisi competitor per artigiano laser italiano:\nNome: ${comp.name}\nPrezzi: ${comp.priceRange}\nRating: ${comp.rating} (${comp.reviews} reviews)\nCategoria: ${comp.category}\nNote: ${comp.notes}\n\nFornisci: punti di forza del competitor, opportunità per differenziarsi, come batterlo sul pricing o qualità. Max 120 parole.`);
      alert(`🎯 Analisi ${comp.name}:\n\n${r}`);
    }catch(e){toast('Configura API Key AI','warning');}
  },

  async aiGapAnalysis(){
    const comps=this.get();
    const out=document.getElementById('cm-ai-out');
    if(out) out.innerHTML='<span style="color:var(--text-muted)">🤖 Gap analysis in corso…</span>';
    const summary=comps.map(c=>`${c.name}(${c.category},${c.priceRange},${c.rating}★)`).join('; ');
    try{
      const r=await AIStudio._callAI(`Gap analysis vs competitor per artigiano laser siciliano (Ingly Design):\nCompetitor: ${summary}\n\nFornisci: nicchie non coperte dai competitor, come differenziarsi con made-in-Sicily premium, pricing positioning suggerito, 3 azioni concrete questa settimana. Max 180 parole.`);
      if(out) out.innerHTML=r.replace(/\*\*([^*]+)\*\*/g,'<strong style="color:#ef4444">$1</strong>').replace(/\n/g,'<br>');
    }catch(e){if(out) out.innerHTML='<span style="color:var(--text-muted)">Configura API Key.</span>';}
  }
};
window.CompetitorMon = CompetitorMon;

// ── Initialize all new modules on load ───────────────────────────────────
(function patchRenderSectionV10(){
  const tryPatch=()=>{
    if(typeof App==='undefined') return setTimeout(tryPatch,400);
    if(App._v10patched) return;
    App._v10patched=true;
    const origRS=App.renderSection?.bind(App);
    if(!origRS) return;
    App.renderSection=async function(s){
      await origRS(s);
      const mods={
        b2bpitch:    ()=>B2BPitch.render(),
        contentperf: ()=>(typeof ContentPerf!=='undefined'&&ContentPerf.render()),
        competitormon:()=>(typeof CompetitorMon!=='undefined'&&CompetitorMon.render()),
      };
      if(mods[s]) try{mods[s]()}catch(e){console.warn('[v10]',e);}
    };
    console.log('[INGLY v10] Modules B2BPitch + ContentPerf + CompetitorMon patched ✅');
  };
  setTimeout(tryPatch, 1500);
})();

