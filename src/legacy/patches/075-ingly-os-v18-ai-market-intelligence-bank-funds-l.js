
// ═══════════════════════════════════════════════════════════════════════════
// INGLY OS v18 — AI MARKET INTELLIGENCE + BANK FUNDS + LASER QUOTER B2B
// ═══════════════════════════════════════════════════════════════════════════

// ── Shared AI caller (Anthropic API) ────────────────────────────────────────
async function _inglyAI(prompt, systemPrompt, maxTokens) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens: maxTokens||1000,
        system: systemPrompt || 'Sei un assistente esperto per un artigiano laser italiano specializzato in gadget personalizzati (portachiavi, tazze, plexiglass, DTF). Opera a Palermo, Sicilia. Dai risposte concrete, pratiche e specifiche per il mercato italiano ed europeo. Usa dati reali e prezzi realistici. Rispondi sempre in italiano.',
        messages:[{role:'user',content:prompt}]
      })
    });
    const d = await res.json();
    if(d.error) throw new Error(d.error.message);
    return d.content?.find(b=>b.type==='text')?.text || '';
  } catch(e) {
    return '⚠️ Errore AI: ' + e.message;
  }
}

// ── Shared renderer helper ──────────────────────────────────────────────────
function _inglyMd(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>')
    .replace(/^###\s(.+)$/gm,'<h4 style="color:var(--primary);margin:14px 0 6px;font-size:13px">$1</h4>')
    .replace(/^##\s(.+)$/gm,'<h3 style="color:var(--primary);margin:16px 0 8px;font-size:15px">$1</h3>')
    .replace(/^#\s(.+)$/gm,'<h2 style="color:var(--primary);margin:18px 0 10px;font-size:17px">$1</h2>')
    .replace(/^-\s(.+)$/gm,'<li style="margin:4px 0;padding-left:8px">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g,'<ul style="list-style:disc;padding-left:20px;margin:8px 0">$&</ul>')
    .replace(/\n\n/g,'</p><p style="margin:8px 0">')
    .replace(/\n/g,'<br>');
}

function _inglyCard(title, icon, color, content, badge) {
  var badgeHtml = badge ? '<span style="font-size:10px;background:'+color+'25;color:'+color+';padding:2px 8px;border-radius:20px;font-weight:700">'+badge+'</span>' : '';
  return '<div style="background:var(--bg-card2);border:1px solid '+color+'30;border-radius:14px;padding:18px;margin-bottom:16px">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'
    +'<span style="font-size:24px">'+icon+'</span>'
    +'<div style="flex:1"><div style="font-size:15px;font-weight:800;color:var(--text)">'+title+'</div>'
    +badgeHtml+'</div></div>'+content+'</div>';
}

function _inglyRunBtn(label, onclick, color) {
  color = color||'#6366f1';
  return '<button onclick="'+onclick+'" style="padding:10px 20px;background:linear-gradient(135deg,'+color+','+color+'cc);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800;display:flex;align-items:center;gap:8px;transition:.2s">'+label+'</button>';
}

function _inglyLoading(id) {
  document.getElementById(id).innerHTML = `<div style="display:flex;align-items:center;gap:12px;padding:20px;color:var(--text-muted)">
    <div style="width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite"></div>
    <span>Analisi AI in corso...</span></div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKET INTEL HUB — tutti i tool AI
// ═══════════════════════════════════════════════════════════════════════════
const MarketIntel = {

  _cache: {},
  _store(key, data) { try { localStorage.setItem('mi_'+key, JSON.stringify({d:data,t:Date.now()})); } catch(e){} },
  _load(key, maxAgeMs) {
    try {
      const raw = JSON.parse(localStorage.getItem('mi_'+key)||'null');
      if(raw && (Date.now()-raw.t) < (maxAgeMs||3600000)) return raw.d;
    } catch(e){}
    return null;
  },

  _viewEl() { return document.getElementById('view-market_intel') || document.getElementById('view-ai'); },

  render(tool) {
    const el = this._viewEl(); if(!el) return;
    el.innerHTML = this._renderHub(tool||'home');
  },

  _renderHub(tool) {
    const tools = [
      {id:'trend_hunter',   icon:'🔍', label:'Trend Hunter Pro',    color:'#ec4899', desc:'Trova trend emergenti laser/gadget IT/EU'},
      {id:'price_radar',    icon:'📡', label:'Price Radar',          color:'#f59e0b', desc:'Monitora prezzi competitors Palermo/Italia'},
      {id:'etsy_pulse',     icon:'🔥', label:'Etsy Pulse Live',      color:'#ff6b6b', desc:'Trending su Etsy in tempo reale'},
      {id:'demand_map',     icon:'🗺️', label:'Demand Map',            color:'#10b981', desc:'Mappa domanda stagionale per categoria'},
      {id:'product_hunter', icon:'🎯', label:'Product Hunter AI',    color:'#8b5cf6', desc:'Trova nuovi prodotti laser ad alta margine'},
      {id:'market_agent',   icon:'🤖', label:'Market AI Agent',      color:'#06b6d4', desc:'Assistente intelligenza di mercato 24/7'},
      {id:'etsy_seo',       icon:'✨', label:'Etsy SEO Wizard',       color:'#f0728f', desc:'Ottimizza listing Etsy con AI'},
      {id:'live_intel',     icon:'📡', label:'Live Intel Feed',      color:'#22c55e', desc:'Feed notizie mercato laser IT/EU'},
      {id:'growth_engine',  icon:'🚀', label:'Growth Engine',        color:'#a855f7', desc:'Strategie crescita per il tuo business'},
      {id:'forecaster',     icon:'📈', label:'Financial Forecaster', color:'#3b82f6', desc:'Proiezioni finanziarie con AI'},
      {id:'supplier_intel', icon:'🚚', label:'Supplier Intelligence',color:'#f97316', desc:'Analisi fornitori e opportunità sourcing'},
      {id:'content_perf',   icon:'📊', label:'Content Performance',  color:'#84cc16', desc:'Analizza performance prodotti/contenuti'},
      {id:'competitor_mon', icon:'👁️', label:'Competitor Monitor',   color:'#64748b', desc:'Monitora i competitor della zona'},
      {id:'lead_scorer',    icon:'⭐', label:'Lead Scorer',           color:'#fbbf24', desc:'Valuta e prioritizza i lead B2B'},
    ];
    if(tool && tool!=='home') {
      const t = tools.find(x=>x.id===tool);
      if(t) return this._renderTool(t);
    }
    // Home grid
    let H = `<div style="padding:16px 20px;max-width:1100px;margin:0 auto">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <span style="font-size:28px">🧠</span>
        <div><div style="font-size:20px;font-weight:900;color:var(--text)">AI Market Intelligence</div>
        <div style="font-size:12px;color:var(--text-muted)">14 tool AI per restare sempre un passo avanti al mercato</div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">`;
    tools.forEach(t=>{
      H+=`<button onclick="MarketIntel.render('${t.id}')" style="padding:16px;background:var(--bg-card2);border:1px solid ${t.color}30;border-radius:14px;cursor:pointer;text-align:left;transition:.15s;hover:opacity:.8">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:22px">${t.icon}</span>
          <div style="font-size:13px;font-weight:800;color:${t.color}">${t.label}</div></div>
        <div style="font-size:11px;color:var(--text-dim)">${t.desc}</div>
      </button>`;
    });
    H+=`</div></div>`;
    return H;
  },

  _backBtn() {
    return `<button onclick="MarketIntel.render('home')" style="padding:6px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;color:var(--text);margin-bottom:16px">← Tutti i tool</button>`;
  },

  _renderTool(t) {
    const methods = {
      trend_hunter: this._toolTrendHunter.bind(this),
      price_radar: this._toolPriceRadar.bind(this),
      etsy_pulse: this._toolEtsyPulse.bind(this),
      demand_map: this._toolDemandMap.bind(this),
      product_hunter: this._toolProductHunter.bind(this),
      market_agent: this._toolMarketAgent.bind(this),
      etsy_seo: this._toolEtsySEO.bind(this),
      live_intel: this._toolLiveIntel.bind(this),
      growth_engine: this._toolGrowthEngine.bind(this),
      forecaster: this._toolForecaster.bind(this),
      supplier_intel: this._toolSupplierIntel.bind(this),
      content_perf: this._toolContentPerf.bind(this),
      competitor_mon: this._toolCompetitorMon.bind(this),
      lead_scorer: this._toolLeadScorer.bind(this),
    };
    const fn = methods[t.id];
    return `<div style="padding:16px 20px;max-width:900px;margin:0 auto">
      ${this._backBtn()}
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <span style="font-size:28px">${t.icon}</span>
        <div><div style="font-size:18px;font-weight:900;color:${t.color}">${t.label}</div>
        <div style="font-size:11px;color:var(--text-muted)">${t.desc}</div></div>
      </div>
      ${fn ? fn(t) : '<p>Tool in costruzione...</p>'}
    </div>`;
  },

  _toolTrendHunter(t) {
    const cached = this._load('trend_hunter', 3600000*6);
    const period = new Date().toLocaleDateString('it',{month:'long',year:'numeric'});
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <select id="th-cat" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
          <option>Tutti i prodotti</option><option>Portachiavi laser</option><option>Gadget incisi</option>
          <option>Sublimazione</option><option>DTF t-shirt</option><option>Plexiglass</option><option>Decor casa</option>
        </select>
        <select id="th-mkt" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
          <option>Italia + Europa</option><option>Solo Italia</option><option>Palermo area</option><option>Etsy globale</option>
        </select>
      </div>
      ${_inglyRunBtn('🔍 Analizza Trend — '+period, "MarketIntel._runTrendHunter()", t.color)}
      <div id="th-out" style="margin-top:16px">${cached?'<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">⏱ Cache '+new Date(JSON.parse(localStorage.getItem('mi_trend_hunter')||'{}').t||0).toLocaleTimeString('it')+'</div>'+_inglyMd(cached):'<div style="color:var(--text-dim);font-size:12px;padding:20px 0">Clicca "Analizza Trend" per ricevere una analisi dettagliata dei trend attuali per il tuo settore.</div>'}</div>`;
  },

  async _runTrendHunter() {
    const cat = document.getElementById('th-cat')?.value||'Tutti';
    const mkt = document.getElementById('th-mkt')?.value||'Italia';
    const month = new Date().toLocaleDateString('it',{month:'long',year:'numeric'});
    _inglyLoading('th-out');
    const res = await _inglyAI(`
Analisi trend di mercato per ${month} — categoria: ${cat} — mercato: ${mkt}

Sono un artigiano laser a Palermo. Ho: xTool F2 (laser diodo+IR 15W+5W), xTool P3 (20W diodo), Epson EcoTank ET-2865 (sublimazione).

Fornisci:
## 🔥 Top 5 Prodotti Trending
Per ognuno: nome prodotto, perché sta crescendo, prezzo mercato suggerito, margine stimato

## 📈 Trend Stagionali — ${month}
Cosa vendere ADESSO, cosa preparare per il prossimo mese

## 🎯 Nicchie Sottosfruttate
3 nicchie con alta domanda e bassa concorrenza nella mia area

## 💶 Pricing Competitivo
Range prezzi per i prodotti top in zona Palermo/IT/EU

## ⚡ Azione Immediata
1 cosa che posso fare OGGI per aumentare le vendite
    `, null, 1200);
    document.getElementById('th-out').innerHTML = _inglyMd(res);
    this._store('trend_hunter', res);
  },

  _toolPriceRadar(t) {
    const month = new Date().toLocaleDateString('it',{month:'long',year:'numeric'});
    return `
      <div style="margin-bottom:12px;font-size:12px;color:var(--text-muted)">Monitora e confronta prezzi di mercato per i tuoi prodotti — ${month}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
        <select id="pr-prod" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
          <option>Portachiavi bambù laser</option><option>Portachiavi inox laser</option><option>Targa incisa laser</option>
          <option>Tazze sublimazione</option><option>T-shirt DTF</option><option>Gadget plexiglass</option>
          <option>Set regalo personalizzato</option><option>Bomboniere laser</option>
        </select>
        <select id="pr-area" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
          <option>Palermo + Sicilia</option><option>Italia nazionale</option><option>Etsy IT</option><option>Etsy EU</option>
        </select>
        <select id="pr-qty" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
          <option>Singolo pezzo</option><option>10-20 pezzi</option><option>50-100 pezzi</option><option>200+ pezzi</option>
        </select>
      </div>
      ${_inglyRunBtn('📡 Scansiona Prezzi', "MarketIntel._runPriceRadar()", t.color)}
      <div id="pr-out" style="margin-top:16px"><div style="color:var(--text-dim);font-size:12px;padding:20px 0">Seleziona prodotto e area geografica, poi clicca Scansiona per vedere i prezzi di mercato attuali.</div></div>`;
  },

  async _runPriceRadar() {
    const prod = document.getElementById('pr-prod')?.value;
    const area = document.getElementById('pr-area')?.value;
    const qty  = document.getElementById('pr-qty')?.value;
    const month = new Date().toLocaleDateString('it',{month:'long',year:'numeric'});
    _inglyLoading('pr-out');
    const res = await _inglyAI(`
Price Radar — ${month}
Prodotto: ${prod} | Area: ${area} | Quantità: ${qty}

Sei un esperto di pricing per artigiani laser italiani. Analizza:

## 📊 Range Prezzi di Mercato — ${prod}
Mostra una tabella con:
- Prezzo minimo mercato (concorrenza aggressiva)
- Prezzo medio mercato
- Prezzo premium (qualità artigianale)
- Prezzo consigliato per me (ottimale profitto/vendite)

## 🗺️ Variazioni per Area — ${area}
Come variano i prezzi: online vs fisico, nord vs sud, Palermo specifica

## 💡 Strategia Pricing Consigliata
- Posizionamento ottimale
- Quando fare sconti (e quando no)
- Bundle/kit per aumentare scontrino medio

## ⚠️ Red Flag
Segnali di guerra prezzi da evitare in questa categoria

## 🎯 Il Mio Prezzo Ottimale
Per ${qty}: €___/pz con margine stimato ___%
    `, null, 1000);
    document.getElementById('pr-out').innerHTML = _inglyMd(res);
    this._store('price_radar_'+prod, res);
  },

  _toolEtsyPulse(t) {
    const now = new Date();
    const month = now.toLocaleDateString('it',{month:'long',year:'numeric'});
    const week = Math.ceil(now.getDate()/7);
    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding:10px 14px;background:rgba(255,107,107,.08);border:1px solid rgba(255,107,107,.2);border-radius:10px">
        <span>🔥</span><span style="font-size:12px;color:var(--text-muted)">Settimana ${week} di ${month} — dati trend Etsy aggiornati</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <select id="ep-niche" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
          <option>Tutte le nicchie</option><option>Bomboniere matrimonio</option><option>Regali neonato</option>
          <option>Regalo laurea</option><option>Animali domestici</option><option>Decor casa</option>
          <option>Corporate/B2B</option><option>Natale/Feste</option><option>San Valentino</option>
        </select>
        <select id="ep-price" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
          <option>Tutti i prezzi</option><option>€5-15 (impulso)</option><option>€15-30 (medio)</option>
          <option>€30-60 (premium)</option><option>€60+ (lusso)</option>
        </select>
      </div>
      ${_inglyRunBtn('🔥 Live Etsy Pulse', "MarketIntel._runEtsyPulse()", t.color)}
      <div id="ep-out" style="margin-top:16px"><div style="color:var(--text-dim);font-size:12px;padding:20px 0">Analizza i trend Etsy in tempo reale per la tua categoria. Aggiornato ogni 6 ore.</div></div>`;
  },

  async _runEtsyPulse() {
    const niche = document.getElementById('ep-niche')?.value;
    const price = document.getElementById('ep-price')?.value;
    const month = new Date().toLocaleDateString('it',{month:'long',year:'numeric'});
    const week  = Math.ceil(new Date().getDate()/7);
    _inglyLoading('ep-out');
    const res = await _inglyAI(`
Etsy Pulse Live — Settimana ${week} di ${month}
Nicchia: ${niche} | Fascia prezzo: ${price}
Sono artigiano laser a Palermo (portachiavi, gadget incisi, sublimazione, DTF)

## 🔥 Top 10 Prodotti TRENDING su Etsy Ora
Per ognuno: nome prodotto, numero vendite stimate/settimana, prezzo medio, perché funziona ADESSO

## 📈 Keyword in Ascesa
10 keyword Etsy con crescita alta questa settimana per la mia nicchia

## 💡 Insight Stagionale
Cosa sta guidando la domanda ora in ${month}? Cosa boomerà nelle prossime 2 settimane?

## 🎯 Prodotti da Caricare SUBITO
3 prodotti specifici che dovrei aggiungere al mio shop questa settimana con titolo e prezzo suggerito

## ⚡ Ottimizzazione Rapida
1 modifica che posso fare OGGI ai miei listing per aumentare views del 20%+
    `, null, 1200);
    document.getElementById('ep-out').innerHTML = _inglyMd(res);
    this._store('etsy_pulse', res);
  },

  _toolDemandMap(t) {
    const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    const curM = new Date().getMonth();
    const demandData = {
      'Bomboniere matrimonio':[2,4,8,9,9,7,5,5,6,5,3,2],
      'Portachiavi regalo':[5,8,5,5,6,7,5,5,6,6,7,9],
      'Gadget natalizi':[1,1,1,1,1,1,1,1,3,7,10,10],
      'Tazze sublimazione':[6,8,5,4,4,4,3,3,5,6,7,8],
      'T-shirt DTF':[4,4,5,6,7,9,9,8,7,6,5,4],
      'Laurea/Diploma':[1,1,2,3,5,9,10,3,1,1,1,1],
      'San Valentino':[8,10,2,1,1,1,1,1,1,1,2,3],
      'Animali/Pet':[5,5,5,5,5,5,5,5,5,5,5,5],
    };
    let H = `<div style="margin-bottom:14px;font-size:12px;color:var(--text-muted)">Domanda mensile stimata per categoria — basata su trend mercato IT/Etsy</div>`;
    H += `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px">
      <tr><th style="text-align:left;padding:8px;color:var(--text-muted)">Categoria</th>`;
    months.forEach((m,i)=>{
      const isNow = i===curM;
      H += `<th style="padding:6px 4px;color:${isNow?'var(--primary)':'var(--text-muted)'};font-weight:${isNow?800:500};white-space:nowrap">${m}${isNow?' ◄':''}</th>`;
    });
    H += '</tr>';
    Object.entries(demandData).forEach(([cat,vals])=>{
      H += `<tr>`;
      H += `<td style="padding:8px;color:var(--text);font-weight:600;white-space:nowrap">${cat}</td>`;
      vals.forEach((v,i)=>{
        const isNow = i===curM;
        const color = v>=8?'#ef4444':v>=6?'#f59e0b':v>=4?'#22c55e':'#64748b';
        const bg = isNow?'rgba(99,102,241,.12)':'';
        H += `<td style="padding:6px 4px;text-align:center;background:${bg}">
          <div style="background:${color};border-radius:4px;height:${v*3}px;width:100%;min-height:8px;opacity:.8"></div>
          <div style="font-size:10px;color:${color};margin-top:2px">${v}</div></td>`;
      });
      H += '</tr>';
    });
    H += `</table></div>`;
    H += `<div style="margin-top:14px">${_inglyRunBtn('🤖 Analisi AI Domanda', "MarketIntel._runDemandMap()", t.color)}</div>`;
    H += `<div id="dm-out" style="margin-top:16px"></div>`;
    return H;
  },

  async _runDemandMap() {
    const month = new Date().toLocaleDateString('it',{month:'long',year:'numeric'});
    _inglyLoading('dm-out');
    const res = await _inglyAI(`
Analisi Domanda Stagionale — ${month} per artigiano laser Palermo

## 📊 Situazione Attuale
Quali categorie sono in PICCO di domanda in questo periodo?

## 🗓️ Prossime 4 Settimane
Piano settimana per settimana: cosa produrre, cosa promozionare

## 💡 Opportunità Non Sfruttate
Categorie con alta domanda ma pochi seller in Italia

## 🎯 Budget Produzione Consigliato
Come distribuire ore di produzione questo mese tra le categorie

## ⚡ Azione Immediata
Prodotto specifico da lanciare questa settimana
    `, null, 800);
    document.getElementById('dm-out').innerHTML = _inglyMd(res);
  },

  _toolProductHunter(t) {
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <select id="ph-machine" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
          <option>xTool F2 (Diodo+IR)</option><option>xTool P3 (20W)</option><option>Epson ET-2865 (Sub)</option><option>Pressa DTF</option>
        </select>
        <select id="ph-price" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
          <option>Tutti i margini</option><option>Margine 60%+</option><option>Margine 70%+</option><option>Margine 80%+</option>
        </select>
      </div>
      ${_inglyRunBtn('🎯 Trova Prodotti Profittevoli', "MarketIntel._runProductHunter()", t.color)}
      <div id="ph-out" style="margin-top:16px"><div style="color:var(--text-dim);font-size:12px;padding:20px 0">Analizza quali prodotti laser hanno il miglior rapporto costo/ricavo nel mercato attuale.</div></div>`;
  },

  async _runProductHunter() {
    const machine = document.getElementById('ph-machine')?.value;
    const priceFilter = document.getElementById('ph-price')?.value;
    const month = new Date().toLocaleDateString('it',{month:'long',year:'numeric'});
    _inglyLoading('ph-out');
    const res = await _inglyAI(`
Product Hunter AI — ${month}
Macchina: ${machine} | Target: ${priceFilter}
Artigiano laser Palermo. Fornisci analisi dettagliata:

## 🏆 Top 8 Prodotti ad Alto Margine
Per ognuno:
- **Nome prodotto**: [nome]
- **Costo materiale**: €___ | **Tempo produzione**: ___ min
- **Prezzo vendita**: €___ | **Margine lordo**: ___%
- **Domanda attuale**: bassa/media/alta
- **Nicchia target**: [chi compra]
- **Dove vendere**: Etsy/B2B/Fiera/Instagram

## 🚀 Prodotti Virali Potenziali
Prodotti che potrebbero diventare viral su Instagram/TikTok

## 💼 Opportunità B2B
Prodotti ideali per aziende locali (Palermo): ristoranti, negozi, hotel, eventi

## ⚡ Quick Win
Il prodotto che posso iniziare a vendere domani con margine 70%+
    `, null, 1200);
    document.getElementById('ph-out').innerHTML = _inglyMd(res);
  },

  _toolMarketAgent(t) {
    const hist = JSON.parse(localStorage.getItem('mi_agent_hist')||'[]');
    let chatHTML = hist.map(m=>`
      <div style="display:flex;gap:10px;margin-bottom:12px;justify-content:${m.role==='user'?'flex-end':'flex-start'}">
        <div style="max-width:85%;padding:12px 16px;background:${m.role==='user'?'linear-gradient(135deg,#6366f1,#8b5cf6)':'var(--bg-card2)'};border-radius:12px;font-size:12px;line-height:1.5;color:${m.role==='user'?'#fff':'var(--text)'}">
          ${m.role==='user'?m.content:_inglyMd(m.content)}</div></div>`).join('');
    return `
      <div style="height:350px;overflow-y:auto;padding:12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;margin-bottom:12px" id="agent-chat">
        ${chatHTML||'<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:60px 0">🤖 Chiedi qualsiasi cosa sul mercato, prezzi, trends, strategie...<br><br><em style="font-size:11px">Es: "Qual è il prezzo giusto per 100 portachiavi inox a Palermo?" o "Come posso trovare clienti B2B?"</em></div>'}
      </div>
      <div style="display:flex;gap:8px">
        <input id="agent-input" placeholder="Fai una domanda sul mercato..." style="flex:1;padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:13px" onkeydown="if(event.key==='Enter')MarketIntel._runAgent()">
        ${_inglyRunBtn('Invia 🤖', "MarketIntel._runAgent()", t.color)}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
        ${['Prezzi portachiavi Palermo','Trend Etsy questa settimana','Clienti B2B migliori','Quanto guadagno per 100 pz?','Come battere la concorrenza'].map(q=>`<button onclick="document.getElementById('agent-input').value='${q}';MarketIntel._runAgent()" style="padding:4px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:20px;cursor:pointer;font-size:10px;color:var(--text-muted)">${q}</button>`).join('')}
      </div>
      ${hist.length?`<button onclick="localStorage.removeItem('mi_agent_hist');MarketIntel.render('market_agent')" style="margin-top:8px;padding:4px 10px;background:transparent;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:10px;color:var(--text-muted)">🗑 Cancella chat</button>`:''}`;
  },

  async _runAgent() {
    const input = document.getElementById('agent-input');
    const q = input?.value?.trim(); if(!q) return;
    input.value='';
    const hist = JSON.parse(localStorage.getItem('mi_agent_hist')||'[]');
    hist.push({role:'user',content:q});
    const month = new Date().toLocaleDateString('it',{month:'long',year:'numeric'});
    const chat = document.getElementById('agent-chat');
    if(chat) {
      chat.innerHTML += `<div style="display:flex;gap:10px;margin-bottom:12px;justify-content:flex-end"><div style="max-width:85%;padding:12px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;font-size:12px;color:#fff">${q}</div></div>`;
      chat.innerHTML += `<div id="agent-typing" style="padding:12px;color:var(--text-muted);font-size:12px">🤖 Sto analizzando...</div>`;
      chat.scrollTop = chat.scrollHeight;
    }
    const context = `Sei un consulente di business esperto per artigiani laser italiani. ${new Date().toLocaleDateString('it',{month:'long',year:'numeric'})}. 
L'utente è un artigiano laser a Palermo con: xTool F2 (diodo+IR), xTool P3 (20W), Epson EcoTank ET-2865 (sublimazione). 
Vende portachiavi, gadget incisi, tazze sub, t-shirt DTF. Ha un negozio Etsy e vende B2B localmente.
Precedente conversazione: ${hist.slice(-3).map(m=>m.role+': '+m.content.slice(0,100)).join(' | ')}`;
    const res = await _inglyAI(q, context, 600);
    const typing = document.getElementById('agent-typing');
    if(typing) typing.outerHTML = `<div style="display:flex;gap:10px;margin-bottom:12px"><div style="max-width:85%;padding:12px 16px;background:var(--bg-card2);border-radius:12px;font-size:12px;line-height:1.5;color:var(--text)">${_inglyMd(res)}</div></div>`;
    hist.push({role:'assistant',content:res});
    if(hist.length > 20) hist.splice(0,2);
    localStorage.setItem('mi_agent_hist', JSON.stringify(hist));
    if(chat) chat.scrollTop = chat.scrollHeight;
  },

  _toolEtsySEO(t) {
    return `
      <div style="display:grid;gap:10px;margin-bottom:14px">
        <input id="seo-prod" placeholder="Prodotto (es. Portachiave bambù inciso nome personalizzato)" style="padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <input id="seo-price" placeholder="Prezzo €" type="number" style="padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
          <select id="seo-lang" style="padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
            <option>Italiano</option><option>Inglese (UK/US)</option><option>Entrambe le lingue</option>
          </select>
        </div>
      </div>
      ${_inglyRunBtn('✨ Genera Listing SEO', "MarketIntel._runEtsySEO()", t.color)}
      <div id="seo-out" style="margin-top:16px"><div style="color:var(--text-dim);font-size:12px;padding:20px 0">Inserisci il prodotto e genera un listing Etsy ottimizzato per il massimo traffico organico.</div></div>`;
  },

  async _runEtsySEO() {
    const prod = document.getElementById('seo-prod')?.value;
    const price = document.getElementById('seo-price')?.value;
    const lang = document.getElementById('seo-lang')?.value;
    if(!prod) { alert('Inserisci il prodotto!'); return; }
    _inglyLoading('seo-out');
    const res = await _inglyAI(`
Crea un listing Etsy SEO-ottimizzato in ${lang}:
Prodotto: ${prod}${price?' | Prezzo: €'+price:''}
Artigianato italiano, produzione laser a Palermo.

Fornisci:
## 📝 Titolo Etsy (max 140 char)
[titolo ottimizzato con keyword principali]

## 🏷️ 13 Tag Etsy
tag1, tag2, tag3, ... (tutti separati da virgola)

## 📖 Descrizione Completa
Paragrafo 1: hook emotivo (perché è speciale)
Paragrafo 2: dettagli tecnici (materiale, dimensioni, tecnica)
Paragrafo 3: personalizzazione disponibile
Paragrafo 4: spedizione e tempi
Paragrafo 5: call to action

## 📐 Categorie Consigliate
Percorso categoria Etsy ottimale

## 💡 Tips per le foto
5 foto consigliate per massimizzare conversioni
    `, null, 1200);
    document.getElementById('seo-out').innerHTML = _inglyMd(res);
  },

  _toolGrowthEngine(t) {
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <select id="ge-focus" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
          <option>Crescita generale</option><option>Aumentare revenue</option><option>Nuovi clienti B2B</option>
          <option>Scalare Etsy</option><option>Lancio nuovo prodotto</option><option>Marketing locale</option>
        </select>
        <select id="ge-budget" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
          <option>Budget €0 (organico)</option><option>Budget €50-100/mese</option><option>Budget €100-300/mese</option><option>Budget €300+/mese</option>
        </select>
      </div>
      ${_inglyRunBtn('🚀 Genera Growth Plan', "MarketIntel._runGrowthEngine()", t.color)}
      <div id="ge-out" style="margin-top:16px"><div style="color:var(--text-dim);font-size:12px;padding:20px 0">Ricevi un piano di crescita personalizzato per il tuo business laser.</div></div>`;
  },

  async _runGrowthEngine() {
    const focus = document.getElementById('ge-focus')?.value;
    const budget = document.getElementById('ge-budget')?.value;
    const month = new Date().toLocaleDateString('it',{month:'long',year:'numeric'});
    _inglyLoading('ge-out');
    const res = await _inglyAI(`
Growth Plan — ${month}
Obiettivo: ${focus} | Budget marketing: ${budget}
Artigiano laser Palermo: xTool F2+P3, Epson sub, portachiavi/gadget/DTF

## 🎯 Obiettivo SMART per i Prossimi 90 Giorni
Specifico, misurabile, raggiungibile

## 📅 Piano Azione Settimana per Settimana (4 settimane)
**Settimana 1**: [azioni specifiche]
**Settimana 2**: [azioni specifiche]
**Settimana 3**: [azioni specifiche]
**Settimana 4**: [review + scala]

## 💰 ROI Stimato
Investimento vs ritorno previsto con ${budget}

## 🔑 Canali Prioritari
Quali 3 canali dare TUTTA l'energia questo mese

## ⚡ Quick Win (Questa Settimana)
1 cosa che posso fare lunedì mattina che porta risultati entro venerdì

## 📊 KPI da Monitorare
Metriche specifiche per sapere se sta funzionando
    `, null, 1200);
    document.getElementById('ge-out').innerHTML = _inglyMd(res);
  },

  _toolForecaster(t) {
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
        <input id="fc-rev" placeholder="Revenue mensile attuale €" type="number" style="padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
        <input id="fc-orders" placeholder="N° ordini/mese" type="number" style="padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
        <input id="fc-margin" placeholder="Margine % medio" type="number" style="padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
      </div>
      ${_inglyRunBtn('📈 Proiezioni AI', "MarketIntel._runForecaster()", t.color)}
      <div id="fc-out" style="margin-top:16px"><div style="color:var(--text-dim);font-size:12px;padding:20px 0">Inserisci i dati attuali per ricevere proiezioni finanziarie a 3-12 mesi.</div></div>`;
  },

  async _runForecaster() {
    const rev = document.getElementById('fc-rev')?.value||'1000';
    const orders = document.getElementById('fc-orders')?.value||'20';
    const margin = document.getElementById('fc-margin')?.value||'60';
    _inglyLoading('fc-out');
    const res = await _inglyAI(`
Financial Forecaster — Artigiano Laser Palermo
Dati attuali: Revenue €${rev}/mese | ${orders} ordini/mese | Margine ${margin}%

## 📊 Proiezioni a 3-6-12 Mesi
Con crescita organica (scenario base, ottimista, pessimista)

## 💡 Leva Finanziaria Principale
Il singolo cambiamento che impatta di più il revenue

## 📈 Break-Even su Investimenti
Se compro UV Printer €3000: quanti mesi per recupero?
Se compro DTF Roll €800: break-even in ___ mesi?
Se assumo collaboratore: impatto su margine

## 🎯 Target Revenue per Scalabilità
A quale revenue posso permettermi: nuovo macchinario / collaboratore / locale

## ⚠️ Risk Analysis
Top 3 rischi finanziari da monitorare
    `, null, 1000);
    document.getElementById('fc-out').innerHTML = _inglyMd(res);
  },

  _toolSupplierIntel(t) {
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <select id="si-cat" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
          <option>Portachiavi blank</option><option>Abbigliamento neutro</option><option>Sublimabili</option>
          <option>Plexiglass</option><option>DTF/UV stampa</option><option>Materiali laser</option><option>Packaging</option>
        </select>
        <select id="si-region" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
          <option>Italia (consegna veloce)</option><option>Europa (qualità)</option><option>Cina/AliExpress (prezzo)</option><option>Tutti</option>
        </select>
      </div>
      ${_inglyRunBtn('🚚 Analizza Fornitori', "MarketIntel._runSupplierIntel()", t.color)}
      <div id="si-out" style="margin-top:16px"><div style="color:var(--text-dim);font-size:12px;padding:20px 0">Ricevi un'analisi comparativa dei migliori fornitori per la tua categoria.</div></div>`;
  },

  async _runSupplierIntel() {
    const cat = document.getElementById('si-cat')?.value;
    const region = document.getElementById('si-region')?.value;
    _inglyLoading('si-out');
    const res = await _inglyAI(`
Supplier Intelligence — Artigiano Laser Palermo
Categoria: ${cat} | Regione sourcing: ${region}

## 🏆 Top 5 Fornitori Raccomandati
Per ognuno:
- **Nome**: [fornitore] | **URL**: [link]
- **Prezzo**: €___ (qualità stock)
- **MOQ**: ___ pezzi min
- **Consegna**: ___ giorni in Sicilia
- **Pro**: [vantaggi]
- **Contro**: [svantaggi]
- **Voto**: ⭐⭐⭐⭐⭐

## 💡 Strategia Sourcing Ottimale
Come combinare più fornitori per ottimizzare: prezzo + velocità + qualità

## 🔥 Deal/Promo Attuali
Promozioni, flash sales, sconti volume disponibili ora

## ⚠️ Red Flag Fornitori
Segnali d'allarme da evitare (qualità scadente, truffe, ritardi)

## 💰 Calcolo Risparmio
Se spendo €___ /mese in materiali, posso risparmiare ___% con il fornitore ottimale
    `, null, 1000);
    document.getElementById('si-out').innerHTML = _inglyMd(res);
  },

  _toolContentPerf(t) {
    return `
      <div style="margin-bottom:14px">
        <textarea id="cp-data" placeholder="Incolla dati prodotti/vendite (opzionale) o lascia vuoto per analisi generica:&#10;Es: Portachiavi bambù: 45 vendite, €4.90&#10;Tazze sub: 12 vendite, €12.00&#10;..." style="width:100%;padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;height:100px;resize:vertical"></textarea>
      </div>
      ${_inglyRunBtn('📊 Analizza Performance', "MarketIntel._runContentPerf()", t.color)}
      <div id="cp-out" style="margin-top:16px"><div style="color:var(--text-dim);font-size:12px;padding:20px 0">Analizza quali prodotti e contenuti performano meglio e ottieni raccomandazioni.</div></div>`;
  },

  async _runContentPerf() {
    const data = document.getElementById('cp-data')?.value;
    _inglyLoading('cp-out');
    const res = await _inglyAI(`
Content & Product Performance Analysis — Artigiano Laser Palermo
${data?'Dati forniti:\n'+data:'Analisi generica per artigiano laser con portachiavi, gadget, sublimazione, DTF'}

## 📊 Analisi Performance
Cosa funziona, cosa non funziona e perché

## 🏆 Top Performers
Prodotti/contenuti con miglior ROI da potenziare

## 📉 Underperformers  
Prodotti da modificare, ottimizzare o eliminare

## 📱 Content Strategy
Che tipo di contenuto porta più vendite per artigiani laser (Instagram, TikTok, Pinterest)

## 🎯 Quick Wins
3 azioni immediate per migliorare performance

## 📈 Previsione
Con queste ottimizzazioni, revenue stimato +___% in 30 giorni
    `, null, 900);
    document.getElementById('cp-out').innerHTML = _inglyMd(res);
  },

  _toolCompetitorMon(t) {
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <input id="cm-area" placeholder="Area (es. Palermo, Sicilia, Italia)" style="padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px" value="Palermo e Sicilia">
        <select id="cm-cat" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
          <option>Laser personalizzazione</option><option>Sublimazione gadget</option><option>DTF stampa tessuti</option>
          <option>Portachiavi personalizzati</option><option>Tazze/Gadget</option>
        </select>
      </div>
      ${_inglyRunBtn('👁️ Monitor Competitor', "MarketIntel._runCompetitorMon()", t.color)}
      <div id="cm-out" style="margin-top:16px"><div style="color:var(--text-dim);font-size:12px;padding:20px 0">Analizza i competitor locali e online per posizionarti strategicamente.</div></div>`;
  },

  async _runCompetitorMon() {
    const area = document.getElementById('cm-area')?.value||'Palermo';
    const cat = document.getElementById('cm-cat')?.value;
    _inglyLoading('cm-out');
    const res = await _inglyAI(`
Competitor Monitor — ${area} | Categoria: ${cat}
Artigiano laser Palermo: come mi confronto con i competitor?

## 🗺️ Panorama Competitivo
Chi sono i principali competitor in ${area} per ${cat}?

## 💶 Benchmark Prezzi
Confronto prezzi competitor vs prezzi di mercato ottimali

## 📊 SWOT Competitivo
I miei vantaggi e svantaggi vs competitor locali

## 🎯 Differenziazione
Come posizionarmi in modo unico per non competere solo sul prezzo

## 🔍 Intelligence Gaps
Informazioni sui competitor da monitorare regolarmente

## ⚡ Vantaggio Competitivo da Costruire
1 area in cui posso superare tutti i competitor nei prossimi 60 giorni

## 💡 Blue Ocean
Nicchie nel ${area} non ancora servite bene da nessuno
    `, null, 1000);
    document.getElementById('cm-out').innerHTML = _inglyMd(res);
  },

  _toolLiveIntel(t) {
    const month = new Date().toLocaleDateString('it',{month:'long',year:'numeric'});
    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding:10px 14px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:10px">
        <div style="width:8px;height:8px;background:#22c55e;border-radius:50%;animation:pulse 2s infinite"></div>
        <span style="font-size:12px;color:var(--text-muted)">Feed notizie di mercato — ${month}</span>
      </div>
      ${_inglyRunBtn('📡 Aggiorna Intel Feed', "MarketIntel._runLiveIntel()", t.color)}
      <div id="li-out" style="margin-top:16px"><div style="color:var(--text-dim);font-size:12px;padding:20px 0">Ricevi un briefing sulle ultime novità dal mercato laser, sublimazione e gadget personalizzati.</div></div>`;
  },

  async _runLiveIntel() {
    const month = new Date().toLocaleDateString('it',{month:'long',year:'numeric'});
    _inglyLoading('li-out');
    const res = await _inglyAI(`
Live Intel Feed — ${month} — Artigiano Laser Palermo

Fornisci un briefing di mercato completo:

## 📰 News Mercato
Novità rilevanti per il settore laser/personalizzazione/gadget in Italia/EU

## 🚀 Nuovi Prodotti/Tecnologie
Macchine laser, sublimazione, DTF: nuovi modelli, upgrade, prezzi

## 💶 Variazioni Prezzi Materiali
Variazioni prezzi: legno, plexiglass, inchiostri sub, DTF, blank portachiavi

## 📈 Trend Piattaforme
Novità Etsy, Instagram, TikTok rilevanti per artigiani

## ⚠️ Alert Mercato
Segnali negativi da monitorare: nuovi competitor, cali domanda, problemi supply chain

## 🎯 Opportunità della Settimana
La più grande opportunità di mercato da sfruttare QUESTA settimana
    `, null, 1000);
    document.getElementById('li-out').innerHTML = _inglyMd(res);
    this._store('live_intel', res);
  },

  _toolLeadScorer(t) {
    return `
      <div style="display:grid;gap:10px;margin-bottom:14px">
        <input id="ls-name" placeholder="Nome azienda/cliente" style="padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
          <select id="ls-type" style="padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
            <option>Azienda locale</option><option>Ristorante/Bar</option><option>Hotel/B&B</option>
            <option>Evento/Matrimonio</option><option>Negozio retail</option><option>Privato</option>
          </select>
          <input id="ls-qty" placeholder="Qty stimata/mese" type="number" style="padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
          <input id="ls-value" placeholder="Valore stimato €" type="number" style="padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
        </div>
        <textarea id="ls-notes" placeholder="Note lead (prodotti richiesti, urgenza, budget...)" style="padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;height:70px;resize:vertical"></textarea>
      </div>
      ${_inglyRunBtn('⭐ Score Lead', "MarketIntel._runLeadScorer()", t.color)}
      <div id="ls-out" style="margin-top:16px"><div style="color:var(--text-dim);font-size:12px;padding:20px 0">Inserisci i dettagli del lead per ricevere uno score di priorità e strategia di follow-up.</div></div>`;
  },

  async _runLeadScorer() {
    const name = document.getElementById('ls-name')?.value||'Lead sconosciuto';
    const type = document.getElementById('ls-type')?.value;
    const qty = document.getElementById('ls-qty')?.value;
    const value = document.getElementById('ls-value')?.value;
    const notes = document.getElementById('ls-notes')?.value;
    _inglyLoading('ls-out');
    const res = await _inglyAI(`
Lead Scorer B2B — Artigiano Laser Palermo
Lead: ${name} | Tipo: ${type} | Qty: ${qty||'?'}/mese | Valore: €${value||'?'}
Note: ${notes||'nessuna'}

## ⭐ SCORE LEAD: ___/10
Giustificazione in 2 righe

## 📊 Analisi Opportunità
- Valore annuo stimato: €___
- Probabilità di conversione: ___%
- Tempo stimato per chiudere: ___ settimane

## 🎯 Strategia Follow-up
Step 1 (domani): [azione specifica]
Step 2 (questa settimana): [azione specifica]
Step 3 (entro 2 settimane): [proposta/preventivo]

## 💡 Prodotti Consigliati
Top 3 prodotti laser ideali per questo cliente con prezzo e margine

## ⚠️ Red Flag
Segnali negativi da valutare prima di investire tempo

## 📝 Email/WhatsApp Template
Un messaggio di apertura ideale per questo lead
    `, null, 1000);
    document.getElementById('ls-out').innerHTML = _inglyMd(res);
  },
};

// Patch renderSection
(function _setupRenderSection(){
  function _doSetup(){
    if(typeof App==='undefined'||!App.renderSection){setTimeout(_doSetup,500);return;}
    if(App._v18patched) return;
    App._v18patched = true;
    const _origRS = App.renderSection.bind(App);
    App.renderSection = async function(s){
    const _miSections = {
      market_intel: ()=> MarketIntel.render('home'),
      trend_hunter: ()=> MarketIntel.render('trend_hunter'),
      price_radar:  ()=> MarketIntel.render('price_radar'),
      etsy_pulse:   ()=> MarketIntel.render('etsy_pulse'),
      demand_map:   ()=> MarketIntel.render('demand_map'),
      product_hunter:()=>MarketIntel.render('product_hunter'),
      market_agent: ()=> MarketIntel.render('market_agent'),
      etsy_seo:     ()=> MarketIntel.render('etsy_seo'),
      live_intel:   ()=> MarketIntel.render('live_intel'),
      growth_engine:()=> MarketIntel.render('growth_engine'),
      forecaster:   ()=> MarketIntel.render('forecaster'),
      supplier_intel:()=>MarketIntel.render('supplier_intel'),
      content_perf: ()=> MarketIntel.render('content_perf'),
      competitor_mon:()=>MarketIntel.render('competitor_mon'),
      lead_scorer:  ()=> MarketIntel.render('lead_scorer'),
      bank_funds:   ()=>{ if(typeof BankFundsV2!=='undefined') BankFundsV2.render(); else BankFunds.render(); },
      laser_b2b:    ()=> LaserB2B.render(),
      kanban:       ()=>{ if(typeof KanbanOS!=='undefined') KanbanOS.render(); },
      goals:        ()=>{ if(typeof InvestPlanner!=='undefined'&&typeof InvestPlanner.render==='function') InvestPlanner.render(); else if(typeof GoalTracker!=='undefined') GoalTracker.render(); },
      apparel:      ()=>{ if(typeof ApparelQuoter!=='undefined') ApparelQuoter.render(); },
      print3d:      ()=>{ if(typeof Print3DQuoter!=='undefined') Print3DQuoter.render(); },
    };
    if(_miSections[s]) {
      document.querySelectorAll('.section-view').forEach(v=>v.classList.remove('active'));
      // For market intel tools, render into the section that's active
      let viewEl = document.getElementById('view-'+s);
      if(!viewEl) {
        // Create the view if missing
        viewEl = document.createElement('div');
        viewEl.id = 'view-'+s;
        viewEl.className = 'section-view';
        const ci = document.getElementById('content-inner');
        if(ci) ci.appendChild(viewEl);
      }
      viewEl.classList.add('active');
      _miSections[s]();
      return;
    }
    return _origRS(s);
    };
  }
  setTimeout(_doSetup, 800);
})();

// ═══════════════════════════════════════════════════════════════════════════
// BANK FUNDS — Liquidità & Obiettivi Investimento
// ═══════════════════════════════════════════════════════════════════════════
const BankFunds = {
  _SK: 'ingly_bank_funds_v1',
  _load() { try { return JSON.parse(localStorage.getItem(this._SK)||'{"cash":0,"bank":0,"goals":[]}'); } catch(e){ return {cash:0,bank:0,goals:[]}; } },
  _save(d) { try { localStorage.setItem(this._SK, JSON.stringify(d)); } catch(e){} },

  render() {
    let el = document.getElementById('view-bank_funds');
    if(!el) { el=document.createElement('div'); el.id='view-bank_funds'; el.className='section-view'; const ci=document.getElementById('content-inner'); if(ci)ci.appendChild(el); }
    el.innerHTML = this._renderHTML();
  },

  _renderHTML() {
    const d = this._load();
    const total = (d.cash||0)+(d.bank||0);
    const allocatedGoals = d.goals.filter(g=>g.active!==false);
    const totalNeeded = allocatedGoals.reduce((s,g)=>s+(g.target||0),0);
    const totalSaved  = allocatedGoals.reduce((s,g)=>s+(g.saved||0),0);
    const freeFunds   = total - totalSaved;

    let H = `<div style="padding:16px 20px;max-width:900px;margin:0 auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:28px">🏦</span>
          <div><div style="font-size:20px;font-weight:900;color:var(--text)">Bank & Funds</div>
          <div style="font-size:11px;color:var(--text-muted)">Liquidità disponibile e obiettivi investimento</div></div>
        </div>
        <button onclick="BankFunds._editFunds()" style="padding:8px 16px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:12px">✏️ Aggiorna Saldi</button>
      </div>

      <!-- KPI Cards -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        ${[
          {l:'💵 Contanti',v:'€'+this._fmt(d.cash||0),c:'#22c55e',sub:'In cassa'},
          {l:'🏦 Banca',v:'€'+this._fmt(d.bank||0),c:'#3b82f6',sub:'Conto corrente'},
          {l:'💰 Totale Liquidità',v:'€'+this._fmt(total),c:'#a855f7',sub:'Cash + Banca'},
          {l:'🆓 Libero per investire',v:'€'+this._fmt(Math.max(0,freeFunds)),c:freeFunds>=0?'#10b981':'#ef4444',sub:freeFunds<0?'⚠️ Allocato in eccesso':'Disponibile'},
        ].map(k=>`<div style="background:var(--bg-card2);border:1px solid ${k.c}30;border-radius:14px;padding:16px">
          <div style="font-size:11px;color:${k.c};font-weight:700;margin-bottom:4px">${k.l}</div>
          <div style="font-size:22px;font-weight:900;color:var(--text)">${k.v}</div>
          <div style="font-size:10px;color:var(--text-dim)">${k.sub}</div></div>`).join('')}
      </div>

      <!-- Progress overview -->
      <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div style="font-size:13px;font-weight:800;color:var(--text)">📊 Riepilogo Obiettivi</div>
          <div style="font-size:12px;color:var(--text-muted)">${totalSaved>0?Math.round(totalSaved/totalNeeded*100)+'%':0+'%'} fondi allocati</div>
        </div>
        <div style="background:var(--bg-card);border-radius:8px;height:12px;overflow:hidden">
          <div style="height:100%;width:${totalNeeded>0?Math.min(100,Math.round(totalSaved/totalNeeded*100)):0}%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);border-radius:8px;transition:.3s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:var(--text-muted)">
          <span>Salvato: <strong style="color:var(--text)">€${this._fmt(totalSaved)}</strong></span>
          <span>Obiettivo totale: <strong style="color:var(--text)">€${this._fmt(totalNeeded)}</strong></span>
        </div>
      </div>

      <!-- Goals List -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-size:14px;font-weight:800;color:var(--text)">🎯 Obiettivi Investimento</div>
        <button onclick="BankFunds._addGoal()" style="padding:7px 14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">+ Aggiungi Obiettivo</button>
      </div>`;

    if(!d.goals||d.goals.length===0) {
      H+=`<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:13px">
        Nessun obiettivo ancora. Clicca "+ Aggiungi Obiettivo" per iniziare!<br>
        <small style="font-size:11px">Es: UV Printer, DTF Roll, Nuovo laser, Stock materiali...</small></div>`;
    } else {
      H+='<div style="display:grid;gap:12px">';
      d.goals.forEach((g,i)=>{
        const pct = g.target>0?Math.min(100,Math.round((g.saved||0)/g.target*100)):0;
        const remaining = (g.target||0)-(g.saved||0);
        const months = g.monthly>0?Math.ceil(remaining/g.monthly):null;
        const active = g.active!==false;
        H+=`<div style="background:var(--bg-card2);border:1px solid ${active?g.color||'#6366f1':'var(--border)'}30;border-radius:14px;padding:16px;opacity:${active?1:.6}">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <span style="font-size:22px">${g.icon||'🎯'}</span>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:800;color:var(--text)">${g.name}</div>
              <div style="font-size:10px;color:var(--text-muted)">${g.desc||''}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:16px;font-weight:900;color:${g.color||'#6366f1'}">€${this._fmt(g.saved||0)}</div>
              <div style="font-size:10px;color:var(--text-muted)">di €${this._fmt(g.target||0)}</div>
            </div>
            <div style="display:flex;gap:6px">
              <button onclick="BankFunds._addFunds(${i})" style="padding:6px 10px;background:#10b981;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px">+€</button>
              <button onclick="BankFunds._editGoal(${i})" style="padding:6px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px">✏️</button>
              <button onclick="BankFunds._removeGoal(${i})" style="padding:6px 10px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:7px;cursor:pointer;font-size:11px">🗑</button>
            </div>
          </div>
          <div style="background:var(--bg-card);border-radius:8px;height:10px;overflow:hidden;margin-bottom:8px">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${g.color||'#6366f1'},${g.color||'#8b5cf6'});border-radius:8px;transition:.3s"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted)">
            <span>${pct}% completato</span>
            <span>${remaining>0?'Mancano €'+this._fmt(remaining):'✅ COMPLETATO!'}</span>
            ${months?`<span>~${months} mesi al ritmo di €${this._fmt(g.monthly)}/mese</span>`:''}
          </div>
        </div>`;
      });
      H+='</div>';
    }
    // ─── Proportional Distribution Section ───────────────────────────────
    const distGoals = (d.goals||[]).filter(g=>g.active!==false&&(g.priority||0)>0);
    H+=`<div style="margin-top:20px;background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:14px;font-weight:800;color:var(--text)">📊 Distribuzione Proporzionale</div>
        <button onclick="BankFunds._editDistrib()" style="padding:6px 12px;background:var(--primary-dim);border:1px solid var(--primary-border);color:var(--primary);border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">⚙️ Modifica Priorità</button>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">Budget totale: <strong style="color:var(--text)">€${this._fmt(total)}</strong> — basata sulle priorità assegnate</div>
      ${this._renderDistrib(d)}
    </div>`;
    H+='</div>';
    return H;
  },

  _fmt(n) { return Number(n||0).toLocaleString('it',{minimumFractionDigits:0,maximumFractionDigits:0}); },

  _editFunds() {
    const d = this._load();
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    div.innerHTML = `<div style="background:var(--bg-card);border-radius:16px;padding:24px;width:360px;border:1px solid var(--border)">
      <div style="font-size:16px;font-weight:800;margin-bottom:16px">💰 Aggiorna Saldi</div>
      <div style="display:grid;gap:12px;margin-bottom:16px">
        <div><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">💵 Contanti in cassa €</label>
          <input id="_bf_cash" type="number" value="${d.cash||0}" style="width:100%;padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:14px"></div>
        <div><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">🏦 Banca €</label>
          <input id="_bf_bank" type="number" value="${d.bank||0}" style="width:100%;padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:14px"></div>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="BankFunds._saveFundsEdit()" style="flex:1;padding:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:9px;cursor:pointer;font-weight:800">💾 Salva</button>
        <button onclick="this.closest('[style*=fixed]').remove()" style="padding:10px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;color:var(--text)">✕</button>
      </div></div>`;
    document.body.appendChild(div);
    div.addEventListener('click',e=>{if(e.target===div)div.remove();});
  },

  _saveFundsEdit() {
    const d = this._load();
    d.cash = parseFloat(document.getElementById('_bf_cash')?.value)||0;
    d.bank = parseFloat(document.getElementById('_bf_bank')?.value)||0;
    this._save(d);
    document.querySelector('[style*="fixed"][style*="z-index:99999"]')?.remove();
    this.render();
    if(typeof toast!=='undefined') toast('💰 Saldi aggiornati!','success');
  },

  _addGoal() {
    const PRESETS = [
      {name:'UV Printer',icon:'🖨️',color:'#8b5cf6',target:3000,desc:'Stampante UV A3 per oggetti rigidi'},
      {name:'DTF Roll Printer',icon:'🎨',color:'#ec4899',target:800,desc:'Stampante DTF al metro'},
      {name:'xTool P3 20W',icon:'🔷',color:'#06b6d4',target:800,desc:'Laser diodo 20W 400x400mm'},
      {name:'xTool P2 CO2',icon:'🔵',color:'#3b82f6',target:2500,desc:'Laser CO2 55W professionale'},
      {name:'Rotary Laser',icon:'⚡',color:'#fbbf24',target:200,desc:'Accessorio rotary per cilindri'},
      {name:'Stock Materiali',icon:'📦',color:'#10b981',target:500,desc:'Stock portachiavi, legno, plexi'},
      {name:'Fondo Emergenza',icon:'🛡️',color:'#64748b',target:2000,desc:'3 mesi di costi fissi'},
    ];
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    const presetsHTML = PRESETS.map(p=>`<button onclick="BankFunds._usePreset('${p.name}','${p.icon}','${p.color}',${p.target},'${p.desc}')" style="padding:10px 12px;background:${p.color}15;border:1px solid ${p.color}40;border-radius:10px;cursor:pointer;text-align:left;transition:.15s">
      <div style="font-size:16px">${p.icon}</div><div style="font-size:11px;font-weight:700;color:${p.color};margin-top:3px">${p.name}</div><div style="font-size:10px;color:var(--text-dim)">€${p.target.toLocaleString('it')}</div></button>`).join('');
    div.innerHTML = `<div style="background:var(--bg-card);border-radius:16px;padding:24px;width:500px;max-height:90vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="font-size:16px;font-weight:800;margin-bottom:16px">🎯 Nuovo Obiettivo</div>
      <div style="margin-bottom:14px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">⚡ Preset rapidi</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px">${presetsHTML}</div>
      </div>
      <div style="background:var(--bg-card2);border-radius:10px;padding:14px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">✏️ Personalizzato</div>
        <div style="display:grid;gap:10px">
          <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px">
            <input id="_bg_name" placeholder="Nome obiettivo" style="padding:9px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">
            <input id="_bg_icon" placeholder="Icona 🎯" style="padding:9px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;text-align:center">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <input id="_bg_target" type="number" placeholder="Target € " style="padding:9px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">
            <input id="_bg_saved" type="number" placeholder="Già salvato €" style="padding:9px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">
            <input id="_bg_monthly" type="number" placeholder="€/mese piano" style="padding:9px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">
          </div>
          <input id="_bg_desc" placeholder="Descrizione (opzionale)" style="padding:9px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button onclick="BankFunds._saveNewGoal()" style="flex:1;padding:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-weight:800">✅ Aggiungi</button>
        <button onclick="this.closest('[style*=fixed]').remove()" style="padding:10px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;color:var(--text)">✕</button>
      </div></div>`;
    document.body.appendChild(div);
    div.addEventListener('click',e=>{if(e.target===div)div.remove();});
  },

  _usePreset(name, icon, color, target, desc) {
    document.getElementById('_bg_name').value = name;
    document.getElementById('_bg_icon').value = icon;
    document.getElementById('_bg_target').value = target;
    document.getElementById('_bg_desc').value = desc;
  },

  _saveNewGoal() {
    const d = this._load();
    const name = document.getElementById('_bg_name')?.value?.trim();
    if(!name) { alert('Inserisci un nome!'); return; }
    const g = {
      name, icon: document.getElementById('_bg_icon')?.value||'🎯',
      target: parseFloat(document.getElementById('_bg_target')?.value)||0,
      saved: parseFloat(document.getElementById('_bg_saved')?.value)||0,
      monthly: parseFloat(document.getElementById('_bg_monthly')?.value)||0,
      desc: document.getElementById('_bg_desc')?.value||'',
      color: '#6366f1', active: true, createdAt: new Date().toISOString(),
    };
    if(!d.goals) d.goals=[];
    d.goals.push(g);
    this._save(d);
    document.querySelector('[style*="fixed"][style*="z-index:99999"]')?.remove();
    this.render();
    if(typeof toast!=='undefined') toast('🎯 Obiettivo aggiunto!','success');
  },

  _addFunds(idx) {
    const amt = parseFloat(prompt('Aggiungi fondi a questo obiettivo (€):'));
    if(isNaN(amt)||amt<=0) return;
    const d = this._load();
    if(d.goals[idx]) { d.goals[idx].saved = (d.goals[idx].saved||0)+amt; this._save(d); this.render(); }
  },

  _editGoal(idx) {
    const d = this._load(); const g = d.goals[idx]; if(!g) return;
    const newTarget = parseFloat(prompt('Nuovo target € (attuale: '+g.target+'):',g.target));
    if(!isNaN(newTarget)&&newTarget>0) g.target=newTarget;
    const newSaved = parseFloat(prompt('Totale salvato € (attuale: '+g.saved+'):',g.saved||0));
    if(!isNaN(newSaved)&&newSaved>=0) g.saved=newSaved;
    const newMonthly = parseFloat(prompt('Piano mensile €/mese (0=nessuno):',g.monthly||0));
    if(!isNaN(newMonthly)) g.monthly=newMonthly;
    this._save(d); this.render();
  },

  _removeGoal(idx) {
    if(!confirm('Rimuovere questo obiettivo?')) return;
    const d = this._load(); d.goals.splice(idx,1); this._save(d); this.render();
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// LASER QUOTER B2B — Calcolo costi portachiavi/gadget laser
// ═══════════════════════════════════════════════════════════════════════════
const LaserB2B = {

  _MACHINES: {
    /* ── xTool (aggiornato con F2, M2, F2 Ultra UV) ─────── */
    xtool_f2:       {label:'xTool F2 Diodo+IR',    icon:'⚡',color:'#fbbf24',hourly:0.156,energyH:0.022,watts:80, timePerPz:{keychain:1.5,tag:2,custom:3}},
    xtool_f2_ultra: {label:'xTool F2 Ultra UV',     icon:'🌈',color:'#a78bfa',hourly:0.200,energyH:0.030,watts:100,timePerPz:{keychain:1.2,tag:1.8,custom:2.5}},
    xtool_m2:       {label:'xTool M2 Diodo',        icon:'🔷',color:'#38bdf8',hourly:0.130,energyH:0.025,watts:90, timePerPz:{keychain:1.8,tag:2.2,custom:3.0}},
    xtool_p3_20w:   {label:'xTool P3 20W Diodo',    icon:'🔷',color:'#06b6d4',hourly:0.100,energyH:0.018,watts:65, timePerPz:{keychain:2.0,tag:2.5,custom:3.5}},
    xtool_p3_co2:   {label:'xTool P3 CO₂ 80W',      icon:'⚡',color:'#6366f1',hourly:0.222,energyH:0.044,watts:160,timePerPz:{keychain:0.8,tag:1.2,custom:2.0}},
    xtool_p2_55w:   {label:'xTool P2 CO₂ 55W',      icon:'🔵',color:'#2563eb',hourly:0.195,energyH:0.034,watts:120,timePerPz:{keychain:1.2,tag:1.8,custom:2.5}},
    xtool_p2s:      {label:'xTool P2S CO₂ 55W',     icon:'🔵',color:'#1d4ed8',hourly:0.200,energyH:0.036,watts:130,timePerPz:{keychain:1.1,tag:1.7,custom:2.3}},
    xtool_s1_40w:   {label:'xTool S1 40W',           icon:'⚡',color:'#818cf8',hourly:0.170,energyH:0.030,watts:120,timePerPz:{keychain:1.5,tag:2.0,custom:2.8}},
    xtool_f1:       {label:'xTool F1 Fibra 20W',     icon:'💫',color:'#a78bfa',hourly:0.156,energyH:0.014,watts:50, timePerPz:{keychain:1.0,tag:1.5,custom:2.5}},
    xtool_f1_ultra: {label:'xTool F1 Ultra Fibra+CO₂',icon:'💫',color:'#7c3aed',hourly:0.200,energyH:0.020,watts:70, timePerPz:{keychain:0.9,tag:1.4,custom:2.2}},
    xtool_d1_pro:   {label:'xTool D1 Pro 10W',       icon:'⚡',color:'#818cf8',hourly:0.080,energyH:0.012,watts:40, timePerPz:{keychain:3.0,tag:4.0,custom:5.0}},
    /* ── CO₂ professionali ───────────────────────────────── */
    aeon_mira5:     {label:'Aeon Mira 5 50W',        icon:'🔆',color:'#10b981',hourly:0.210,energyH:0.050,watts:180,timePerPz:{keychain:0.9,tag:1.3,custom:2.0}},
    aeon_mira7:     {label:'Aeon Mira 7 80W',        icon:'🔆',color:'#059669',hourly:0.270,energyH:0.070,watts:250,timePerPz:{keychain:0.7,tag:1.0,custom:1.8}},
    aeon_nova10:    {label:'Aeon Nova 10 100W',       icon:'🔆',color:'#047857',hourly:0.330,energyH:0.098,watts:350,timePerPz:{keychain:0.6,tag:0.9,custom:1.5}},
    thunder_bolt:   {label:'Thunder Bolt 60W',        icon:'⚡',color:'#f59e0b',hourly:0.230,energyH:0.055,watts:200,timePerPz:{keychain:0.9,tag:1.3,custom:2.0}},
    omtech_polar:   {label:'OMTech Polar 50W',        icon:'❄️',color:'#06b6d4',hourly:0.190,energyH:0.042,watts:120,timePerPz:{keychain:1.1,tag:1.5,custom:2.2}},
    omtech_turbo:   {label:'OMTech Turbo 80W',        icon:'🌀',color:'#0891b2',hourly:0.250,energyH:0.070,watts:250,timePerPz:{keychain:0.8,tag:1.1,custom:1.8}},
    gweike_cloud:   {label:'Gweike Cloud 50W',        icon:'☁️',color:'#8b5cf6',hourly:0.185,energyH:0.039,watts:140,timePerPz:{keychain:1.1,tag:1.5,custom:2.2}},
    glowforge_pro:  {label:'Glowforge Pro 45W',       icon:'✨',color:'#db2777',hourly:0.240,energyH:0.067,watts:240,timePerPz:{keychain:1.0,tag:1.4,custom:2.0}},
    monport_80w:    {label:'Monport 80W CO₂',         icon:'🟢',color:'#14b8a6',hourly:0.220,energyH:0.056,watts:200,timePerPz:{keychain:0.9,tag:1.2,custom:1.9}},
    co2_80w:        {label:'CO₂ 80W Generico',        icon:'💨',color:'#67e8f9',hourly:0.200,energyH:0.056,watts:200,timePerPz:{keychain:1.0,tag:1.4,custom:2.1}},
    co2_100w:       {label:'CO₂ 100W Generico',       icon:'💨',color:'#06b6d4',hourly:0.260,energyH:0.078,watts:280,timePerPz:{keychain:0.8,tag:1.1,custom:1.7}},
    /* ── Fibra ───────────────────────────────────────────── */
    fibra_20w_mopa: {label:'Fibra 20W MOPA',          icon:'🔥',color:'#f43f5e',hourly:0.156,energyH:0.014,watts:50, timePerPz:{keychain:0.8,tag:1.2,custom:2.0}},
    fibra_30w:      {label:'Fibra 30W Raycus',        icon:'🔥',color:'#e11d48',hourly:0.180,energyH:0.022,watts:80, timePerPz:{keychain:0.6,tag:0.9,custom:1.5}},
    fibra_50w:      {label:'Fibra 50W JPT',            icon:'🔥',color:'#be123c',hourly:0.220,energyH:0.039,watts:140,timePerPz:{keychain:0.5,tag:0.7,custom:1.2}},
    fibra_100w:     {label:'Fibra 100W IPG',           icon:'🔥',color:'#9f1239',hourly:0.360,energyH:0.083,watts:300,timePerPz:{keychain:0.4,tag:0.6,custom:1.0}},
    /* ── DTF ─────────────────────────────────────────────── */
    dtf_prestige_a3:{label:'DTF Prestige A3',          icon:'🖨️',color:'#fb7185',hourly:0.250,energyH:0.140,watts:500,timePerPz:{keychain:5.0,tag:4.0,custom:8.0}},
    dtf_epson_l1800:{label:'DTF Epson L1800',           icon:'🖨️',color:'#f9a8d4',hourly:0.180,energyH:0.084,watts:300,timePerPz:{keychain:6.0,tag:5.0,custom:10.0}},
    /* ── UV ──────────────────────────────────────────────── */
    uv_a3_flatbed:  {label:'UV A3 Flatbed',            icon:'🌈',color:'#818cf8',hourly:0.550,energyH:0.560,watts:2000,timePerPz:{keychain:3.0,tag:2.5,custom:5.0}},
    uv_procolored:  {label:'UV Procolored A4',          icon:'🌈',color:'#7c3aed',hourly:0.380,energyH:0.224,watts:800,timePerPz:{keychain:4.0,tag:3.5,custom:7.0}},
    /* ── Sublimazione e Presse ───────────────────────────── */
    sub_sawgrass:   {label:'Sub Sawgrass SG500',        icon:'🎨',color:'#fb923c',hourly:0.060,energyH:0.006,watts:20,  timePerPz:{keychain:4.0,tag:3.5,custom:6.0}},
    pressa_3838:    {label:'Pressa 38×38 Sub',          icon:'♨️',color:'#d97706',hourly:0.065,energyH:0.042,watts:1500,timePerPz:{keychain:3.0,tag:3.0,custom:5.0}},
    /* ── Diodo economici ─────────────────────────────────── */
    creality_f40:   {label:'Creality Falcon 40W',       icon:'🦅',color:'#fbbf24',hourly:0.120,energyH:0.034,watts:120,timePerPz:{keychain:2.0,tag:2.8,custom:4.0}},
    atomstack_x40:  {label:'Atomstack X40',             icon:'⚛️',color:'#84cc16',hourly:0.115,energyH:0.034,watts:120,timePerPz:{keychain:2.2,tag:3.0,custom:4.5}},
    sculpfun_s30:   {label:'Sculpfun S30',              icon:'🎭',color:'#e879f9',hourly:0.100,energyH:0.021,watts:70,  timePerPz:{keychain:2.5,tag:3.2,custom:5.0}},
  },


  _PRODUCTS: [
    {id:'pk_bambu_rot',name:'Portachiavi Bambù Rotondo 40mm',cat:'Legno',cost:0.40,timeMin:1.5,sup:'BSI Gadget',url:'https://www.bsigadget.com',img:'🎋'},
    {id:'pk_bambu_ret',name:'Portachiavi Bambù Rettangolare',cat:'Legno',cost:0.45,timeMin:1.5,sup:'BSI Gadget',url:'https://www.bsigadget.com',img:'🎋'},
    {id:'pk_bambu_casa',name:'Portachiavi Bambù Forma Casa',cat:'Legno',cost:0.85,timeMin:2.0,sup:'StampaSi.it',url:'https://www.stampasi.it',img:'🏠'},
    {id:'pk_bambu_cuore',name:'Portachiavi Bambù Cuore',cat:'Legno',cost:0.90,timeMin:2.0,sup:'gadget365.it',url:'https://www.gadget365.it',img:'❤️'},
    {id:'pk_faggio_rot',name:'Portachiavi Faggio Rotondo 40mm',cat:'Legno',cost:0.55,timeMin:1.5,sup:'gadget365.it',url:'https://www.gadget365.it',img:'🪵'},
    {id:'pk_faggio_ret',name:'Portachiavi Faggio Rettangolare',cat:'Legno',cost:0.65,timeMin:1.5,sup:'gadget365.it',url:'https://www.gadget365.it',img:'🪵'},
    {id:'pk_inox_rot',name:'Portachiavi Acciaio Inox Rotondo',cat:'Metallo',cost:1.20,timeMin:2.5,sup:'HiGift.it',url:'https://www.higift.it',img:'⚙️'},
    {id:'pk_inox_ret',name:'Portachiavi Inox Rettangolare',cat:'Metallo',cost:1.30,timeMin:2.5,sup:'gadget365.it',url:'https://www.gadget365.it',img:'⚙️'},
    {id:'pk_inox_bicolore',name:'Portachiavi Inox Bicolore 150pz',cat:'Metallo',cost:0.76,timeMin:2.0,sup:'HiGift.it',url:'https://www.higift.it',img:'✨'},
    {id:'pk_allum_col',name:'Portachiavi Alluminio Colorato',cat:'Metallo',cost:0.83,timeMin:2.0,sup:'HiGift.it',url:'https://www.higift.it',img:'🎨'},
    {id:'pk_plexi_tr',name:'Portachiavi Plexiglass Trasparente',cat:'Plexiglass',cost:0.80,timeMin:2.0,sup:'Artistico.it',url:'https://www.artistico.it',img:'💎'},
    {id:'pk_plexi_oro',name:'Portachiavi Plexiglass Specchiato Oro',cat:'Plexiglass',cost:1.50,timeMin:2.0,sup:'Artistico.it',url:'https://www.artistico.it',img:'💛'},
    {id:'pk_plexi_argento',name:'Portachiavi Plexiglass Specchiato Argento',cat:'Plexiglass',cost:1.40,timeMin:2.0,sup:'Artistico.it',url:'https://www.artistico.it',img:'🪙'},
    {id:'pk_sughero',name:'Portachiavi Sughero Rotondo FSC',cat:'Sughero',cost:0.75,timeMin:1.5,sup:'gadget365.it',url:'https://www.gadget365.it',img:'🌿'},
    {id:'pk_pelle',name:'Portachiavi Pelle Naturale',cat:'Pelle',cost:2.50,timeMin:3.0,sup:'Cuoio.it',url:'',img:'🐄'},
    {id:'tg_legno',name:'Targhetta Luggage Tag Legno',cat:'Legno',cost:1.50,timeMin:2.5,sup:'Atomm.com',url:'https://www.atomm.com',img:'🏷️'},
    {id:'tg_inox',name:'Placca Acciaio Inox 8x5cm',cat:'Metallo',cost:0.60,timeMin:3.0,sup:'AliExpress',url:'https://www.aliexpress.com',img:'🔩'},
    {id:'medaglia',name:'Medaglia Premio Alluminio 50mm',cat:'Metallo',cost:1.50,timeMin:3.0,sup:'prezziingrosso.com',url:'https://prezziingrosso.com',img:'🏅'},
    {id:'penna_laser',name:'Penna Metallo con Incisione',cat:'Metallo',cost:1.80,timeMin:3.0,sup:'gadget365.it',url:'https://www.gadget365.it',img:'🖊️'},
  ],

  _QTYS: [5,10,20,50,100,200],
  _laborHourly: 18,
  _packCost: 0.30,
  /* I moltiplicatori restano come **valori di partenza** dei margini di
     canale: ×2,0 vale un margine del 50%, ×3,5 del 71,4%. Il prezzo non li usa
     più direttamente — lo fa il motore, dal margine — ma cambiarli qui
     continuerebbe a spostare i prezzi come prima, quindi nessun numero si è
     mosso con questa modifica. */
  _markup: {b2b:2.0, etsy:3.5, retail:3.0},
  /* Zero, e non un valore verosimile: un avviamento inventato gonfierebbe i
     preventivi a bassa quantità di un numero che nessuno ha misurato. Finché
     è zero la tabella lo dichiara. */
  _setupMin: 0,

  /* ── Le ipotesi di quantità, dichiarate ─────────────────────────────────
     Erano tre ternari annidati dentro il calcolo: `qty>=50?0.20:qty>=25?...`.
     Scritte così erano invisibili — nessuno poteva vederle senza leggere la
     funzione, e nessuno poteva cambiarle senza modificarla.

     Sono **ipotesi**, non dati: nessun fornitore ha confermato lo sconto del
     20% sopra i 50 pezzi, e nessun cronometro la riduzione del 15% dei tempi.
     Restano perché erano già in uso e toglierle sposterebbe i prezzi in
     silenzio; come dati dichiarati almeno si vedono, si discutono e si
     correggono senza toccare il codice. I valori riproducono esattamente i
     ternari che sostituiscono. */
  _ipotesiQuantita: [
    { da: 50, scontoMateriale: 0.20, riduzioneTempo: 0.15 },
    { da: 25, scontoMateriale: 0.15, riduzioneTempo: 0.08 },
    { da: 20, scontoMateriale: 0.10, riduzioneTempo: 0.08 },
    { da: 10, scontoMateriale: 0.10, riduzioneTempo: 0 },
    { da: 1,  scontoMateriale: 0,    riduzioneTempo: 0 },
  ],

  _ipotesiPer(qty) {
    const t = this._ipotesiQuantita;
    for (let i = 0; i < t.length; i++) if (qty >= t[i].da) return t[i];
    return t[t.length - 1];
  },

  render() {
    let el = document.getElementById('view-laser_b2b');
    if(!el) { el=document.createElement('div'); el.id='view-laser_b2b'; el.className='section-view'; const ci=document.getElementById('content-inner'); if(ci)ci.appendChild(el); }
    el.innerHTML = this._renderHTML();
  },

  _renderHTML() {
    const cats = [...new Set(this._PRODUCTS.map(p=>p.cat))];
    let H = `<div style="padding:16px 20px;max-width:1100px;margin:0 auto">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <span style="font-size:28px">💼</span>
        <div style="flex:1"><div style="font-size:20px;font-weight:900;color:var(--text)">Laser Quoter B2B</div>
        <div style="font-size:11px;color:var(--text-muted)">Calcolo costi e prezzi per portachiavi e gadget laser — F2 · P3 · P2 CO2</div></div>
        <button onclick="LaserB2BCatalog.openManager()" style="padding:8px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px"><i class="fas fa-list"></i> Gestisci Catalogo</button>
      </div>

      <!-- Config Row -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:16px">
        <div>
          <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">⚡ Macchina</label>
          <select id="lb2b-machine" onchange="LaserB2B.calc()" style="width:100%;padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
            ${Object.entries(this._MACHINES).map(([k,m])=>`<option value="${k}">${m.icon} ${m.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">🎯 Canale Vendita</label>
          <select id="lb2b-channel" onchange="LaserB2B.calc()" style="width:100%;padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
            <option value="b2b">B2B Aziende (×2.0)</option>
            <option value="etsy">Etsy (×3.5)</option>
            <option value="retail">Retail/Fiera (×3.0)</option>
          </select>
        </div>
        <div>
          <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">👷 Manodopera €/h</label>
          <input id="lb2b-labor" type="number" value="${this._laborHourly}" onchange="LaserB2B.calc()" style="width:100%;padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
        </div>
        <div>
          <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">📦 Packaging/pz €</label>
          <input id="lb2b-pack" type="number" value="${this._packCost}" step="0.05" onchange="LaserB2B.calc()" style="width:100%;padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
        </div>
        <div>
          <label style="display:block;font-size:10px;color:var(--text-muted);font-weight:700;margin-bottom:5px;text-transform:uppercase;letter-spacing:.4px">Avviamento (min/lavoro)</label>
          <input id="lb2b-setup" type="number" value="${this._setupMin}" step="1" min="0" onchange="LaserB2B.calc()" title="Si paga una volta e si divide per i pezzi" style="width:100%;padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">
        </div>
      </div>

      <!-- Products Grid -->
      <div style="display:grid;grid-template-columns:1fr 2fr;gap:16px">
        <!-- Left: Product selector -->
        <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;overflow:hidden">
          <div style="padding:12px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:800">🎁 Prodotti (${this._PRODUCTS.length})</div>
          <div style="padding:8px">
            ${cats.map(cat=>`
              <div style="margin-bottom:6px">
                <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;padding:4px 8px">${cat}</div>
                ${this._PRODUCTS.filter(p=>p.cat===cat).map(p=>`
                  <button onclick="LaserB2B.selectProduct('${p.id}')" id="lb2b-btn-${p.id}"
                    style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;background:transparent;border:1px solid transparent;border-radius:8px;cursor:pointer;text-align:left;transition:.15s"
                    onmouseover="this.style.background='var(--bg-card)'" onmouseout="if(!this.classList.contains('sel'))this.style.background='transparent'">
                    <span>${p.img}</span>
                    <div style="flex:1;min-width:0">
                      <div style="font-size:11px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</div>
                      <div style="font-size:10px;color:var(--text-dim)">€${p.cost.toFixed(2)} · ${p.timeMin}min · ${p.sup}</div>
                    </div>
                  </button>`).join('')}
              </div>`).join('')}
          </div>
        </div>

        <!-- Right: Calculator output -->
        <div id="lb2b-calc" style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:20px">
          <div style="text-align:center;padding:60px 0;color:var(--text-dim)">
            <div style="font-size:40px;margin-bottom:12px">💼</div>
            <div style="font-size:14px;font-weight:700;margin-bottom:6px">Seleziona un prodotto</div>
            <div style="font-size:12px">Scegli dalla lista a sinistra per calcolare costi e prezzi B2B</div>
          </div>
        </div>
      </div>
    </div>`;
    return H;
  },

  _selProduct: null,

  selectProduct(id) {
    this._selProduct = this._PRODUCTS.find(p=>p.id===id);
    // Highlight selected
    document.querySelectorAll('[id^="lb2b-btn-"]').forEach(b=>{
      b.classList.remove('sel');
      b.style.background='transparent';
      b.style.borderColor='transparent';
    });
    const btn = document.getElementById('lb2b-btn-'+id);
    if(btn){ btn.classList.add('sel'); btn.style.background='var(--primary-dim)'; btn.style.borderColor='var(--primary)'; }
    this.calc();
  },

  /* ── Il conto, in un posto solo ─────────────────────────────────────────
     Questa funzione esisteva due volte: una dentro `calc()` per disegnare la
     tabella e una dentro `exportCSV()` per scriverla su file. Le due copie
     erano già divergenti — il CSV non conosceva l'avviamento — e nessuna delle
     due sapeva di essere una copia. È lo stesso difetto che questo progetto ha
     già trovato quattro volte: due sistemi che possiedono lo stesso concetto,
     ciascuno corretto da solo e sbagliato insieme. */
  _conto() {
    const p = this._selProduct;
    if(!p) return { rows:[], posizioni:[], rifCosto:0, margineCanale:0, setupMin:0, p:null, mach:null };
    const machKey = document.getElementById('lb2b-machine')?.value||'xtool_f2';
    const mach = this._MACHINES[machKey];
    const laborH = parseFloat(document.getElementById('lb2b-labor')?.value)||18;
    const packCost = parseFloat(document.getElementById('lb2b-pack')?.value)||0.30;
    const channelKey = document.getElementById('lb2b-channel')?.value||'b2b';
    const markup = this._markup[channelKey]||2.0;

    /* Il moltiplicatore diventa il margine che gli corrisponde. ×2,0 è un
       margine del 50%, ×3,5 del 71,4%: sono lo stesso prezzo detto in due
       modi, e dirlo come margine è l'unico dei due che resta confrontabile con
       il pavimento sotto cui non si vende. Nessun numero si muove. */
    const MOT = (typeof window!=='undefined') && window.InglyCostEngine;
    const margineCanale = markup>0 ? (1 - 1/markup)*100 : 0;
    const setupMin = parseFloat(document.getElementById('lb2b-setup')?.value)||this._setupMin||0;

    const rows = this._QTYS.map(qty=>{
      /* Lo sconto quantità sul materiale e la riduzione dei tempi sono
         **ipotesi**, non dati: nessun fornitore le ha confermate. Restano
         perché erano già in uso e toglierle sposterebbe i prezzi in silenzio,
         ma adesso viaggiano dichiarate e il margine che producono è visibile. */
      const ip = this._ipotesiPer(qty);
      const scaleDiscount = ip.scontoMateriale;
      const materialCost = p.cost * (1 - scaleDiscount);
      const timeMin = p.timeMin * (1 - ip.riduzioneTempo);
      const machCostPz = (mach.hourly+mach.energyH)/60*timeMin;
      const laborCostPz = laborH/60*timeMin;
      /* L'avviamento si paga una volta per lavoro e si divide per i pezzi: è
         la ragione vera per cui il pezzo costa meno in quantità, e finora non
         era conteggiato affatto. */
      const setupCostPz = (setupMin/60*laborH)/Math.max(1,qty);
      const totalCostPz = materialCost+machCostPz+laborCostPz+packCost+setupCostPz;
      /* Il prezzo lo fa il motore, dal margine. Senza motore non si indovina:
         si mostra il costo e si tace il prezzo. */
      const salePz = MOT ? MOT.prezzo(totalCostPz,{strategia:'margine',marginePct:margineCanale,ivaPct:0}).netto : null;
      const minPz  = MOT ? MOT.prezzo(totalCostPz,{strategia:'margine',marginePct:MOT.MARGINE_MINIMO,ivaPct:0}).netto : null;
      const marginPct = salePz>0 ? Math.round((salePz-totalCostPz)/salePz*100) : 0;
      const totalSale = salePz!=null ? salePz*qty : null;
      const totalCost = totalCostPz*qty;
      const profit = totalSale!=null ? totalSale-totalCost : null;
      return {qty,materialCost,machCostPz,laborCostPz,packCost,setupCostPz,totalCostPz,salePz,minPz,marginPct,totalSale,totalCost,profit,scaleDiscount};
    });

    /* Le cinque posizioni commerciali del motore, sul costo della quantità
       mediana. Prima qui c'era una seconda scala di prezzi — cost×5 … cost×2,8
       — scollegata dalla prima: due tabelle di prezzo nella stessa schermata
       che non si parlavano. */
    const rifCosto = (rows[Math.floor(rows.length/2)]||rows[0]||{totalCostPz:0}).totalCostPz;
    const posizioni = MOT ? MOT.politiche().map(pol=>({
      id: pol.id, label: pol.label, marginTarget: pol.marginTarget,
      prezzo: MOT.prezzo(rifCosto,{strategia:'margine',marginePct:pol.marginTarget,ivaPct:0}).netto,
    })) : [];

    return { rows, posizioni, rifCosto, margineCanale, setupMin, p, mach, channelKey, markup };
  },

  calc() {
    const el = document.getElementById('lb2b-calc'); if(!el) return;
    const p = this._selProduct; if(!p){ return; }
    /* Tutto il conto viene da `_conto()`: qui si disegna soltanto. Le righe che
       rileggevano macchina, manodopera e canale per rifarlo sono sparite. */
    const { rows, posizioni, rifCosto, margineCanale, setupMin, mach, channelKey } = this._conto();

    const channelLabel = {b2b:'B2B Aziende',etsy:'Etsy',retail:'Retail/Fiera'}[channelKey];

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <span style="font-size:24px">${p.img}</span>
        <div>
          <div style="font-size:15px;font-weight:800;color:var(--text)">${p.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">${mach.icon} ${mach.label} · ${channelLabel}</div>
        </div>
        <a href="${p.url}" target="_blank" style="margin-left:auto;padding:6px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;text-decoration:none;font-size:11px;color:var(--primary)">🛒 ${p.sup}</a>
      </div>

      <!-- Cost breakdown for base qty -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px">
        ${[
          {l:'Materiale',v:'€'+rows[0].materialCost.toFixed(2),c:'#f59e0b'},
          {l:'Macchina',v:'€'+rows[0].machCostPz.toFixed(2),c:'#6366f1'},
          {l:'Lavoro',v:'€'+rows[0].laborCostPz.toFixed(2),c:'#ec4899'},
          {l:'Packaging',v:'€'+rows[0].packCost.toFixed(2),c:'#10b981'},
          {l:'TOTALE/pz',v:'€'+rows[0].totalCostPz.toFixed(2),c:'#ef4444'},
        ].map(k=>`<div style="background:var(--bg-card);border-radius:9px;padding:8px;text-align:center">
          <div style="font-size:9px;color:${k.c};text-transform:uppercase;font-weight:700">${k.l}</div>
          <div style="font-size:13px;font-weight:800;color:var(--text)">${k.v}</div></div>`).join('')}
      </div>

      <!-- Quantity table -->
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:var(--bg-card)">
              <th style="padding:9px 12px;text-align:left;color:var(--text-muted);font-weight:700">Quantità</th>
              <th style="padding:9px 12px;text-align:right;color:var(--text-muted);font-weight:700">Sconto mat.</th>
              <th style="padding:9px 12px;text-align:right;color:var(--text-muted);font-weight:700">Costo/pz</th>
              <th style="padding:9px 12px;text-align:right;color:var(--primary);font-weight:700">Prezzo/pz</th>
              <th style="padding:9px 12px;text-align:right;color:var(--text-muted);font-weight:700">Margine</th>
              <th style="padding:9px 12px;text-align:right;color:var(--text-muted);font-weight:700">Totale</th>
              <th style="padding:9px 12px;text-align:right;color:'#22c55e';font-weight:700">Profitto</th>
              <th style="padding:9px 12px;text-align:right;color:var(--text-muted);font-weight:700" title="Sotto questo prezzo il lavoro non va accettato">Minimo</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r=>{
              const mgColor = r.marginPct>=60?'#22c55e':r.marginPct>=45?'#f59e0b':'#ef4444';
              const eur = (v)=> v==null?'—':'€'+v.toFixed(2);
              return `<tr style="border-bottom:1px solid var(--border)">
                <td style="padding:9px 12px;font-weight:800;color:var(--text)">${r.qty} pz</td>
                <td style="padding:9px 12px;text-align:right;color:#22c55e">${r.scaleDiscount>0?'-'+Math.round(r.scaleDiscount*100)+'%':'—'}</td>
                <td style="padding:9px 12px;text-align:right;color:var(--text-muted)" title="materiale €${r.materialCost.toFixed(2)} · macchina €${r.machCostPz.toFixed(2)} · lavoro €${r.laborCostPz.toFixed(2)} · confezione €${r.packCost.toFixed(2)}${r.setupCostPz>0?' · avviamento €'+r.setupCostPz.toFixed(2):''}">€${r.totalCostPz.toFixed(2)}</td>
                <td style="padding:9px 12px;text-align:right;font-weight:800;color:var(--primary);font-size:13px">${eur(r.salePz)}</td>
                <td style="padding:9px 12px;text-align:right"><span style="background:${mgColor}20;color:${mgColor};padding:2px 8px;border-radius:20px;font-weight:700">${r.marginPct}%</span></td>
                <td style="padding:9px 12px;text-align:right;font-weight:700">${r.totalSale==null?'—':'€'+r.totalSale.toFixed(0)}</td>
                <td style="padding:9px 12px;text-align:right;font-weight:800;color:#22c55e">${r.profit==null?'—':'€'+r.profit.toFixed(0)}</td>
                <td style="padding:9px 12px;text-align:right;color:var(--text-dim);font-size:11px">${eur(r.minPz)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      ${posizioni.length?`
      <div style="margin-top:14px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted);font-weight:700;margin-bottom:8px">
          Posizioni di prezzo &mdash; su un costo di €${rifCosto.toFixed(2)}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">
          ${posizioni.map(x=>`<div style="padding:10px;border-radius:10px;background:var(--bg-card);border:1px solid ${x.id==='standard'?'var(--primary)':'var(--border)'}">
            <div style="font-size:10px;font-weight:800;color:${x.id==='standard'?'var(--primary)':'var(--text-muted)'}">${x.label}</div>
            <div style="font-size:16px;font-weight:900;color:var(--text);line-height:1.2">€${x.prezzo.toFixed(2)}</div>
            <div style="font-size:9px;color:var(--text-muted)">margine ${x.marginTarget}%</div>
          </div>`).join('')}
        </div>
      </div>`:''}

      <!-- Le ipotesi, dichiarate -->
      <div style="margin-top:12px;padding:10px 12px;background:var(--bg-card);border-radius:10px;border-left:3px solid var(--orange)">
        <div style="font-size:10px;font-weight:700;color:var(--orange);margin-bottom:4px">Su cosa regge questo conto</div>
        <div style="font-size:10px;color:var(--text-muted);line-height:1.6">
          Lo sconto materiale in quantità (fino al 20%) e la riduzione dei tempi (fino al 15%) sono <b>ipotesi</b>, non dati confermati da un fornitore: se non valgono, il costo reale è più alto.
          ${setupMin>0?`L'avviamento di ${setupMin} min si divide sui pezzi.`:`<b>L'avviamento non è configurato:</b> il costo a bassa quantità esce più basso del reale.`}
          Il prezzo viene dal margine del canale (${Math.round(margineCanale)}%), non da un moltiplicatore.
        </div>
      </div>

      <!-- AI Pricing Button -->
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="LaserB2B.getAIPricing()" style="padding:8px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">🤖 AI Pricing Strategy</button>
        <button onclick="LaserB2B.exportCSV()" style="padding:8px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text)">📤 Esporta CSV</button>
      </div>
      <div id="lb2b-ai-out" style="margin-top:12px"></div>`;
  },

  async getAIPricing() {
    const p = this._selProduct; if(!p) return;
    const machKey = document.getElementById('lb2b-machine')?.value||'xtool_f2';
    const mach = this._MACHINES[machKey];
    const channelKey = document.getElementById('lb2b-channel')?.value||'b2b';
    const el = document.getElementById('lb2b-ai-out');
    el.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:12px">🤖 Analisi AI prezzi...</div>';
    const res = await _inglyAI(`
Pricing Strategy per: ${p.name}
Macchina: ${mach.label} | Canale: ${channelKey}
Costo materiale: €${p.cost.toFixed(2)}/pz | Tempo: ${p.timeMin} min/pz
Fornitore: ${p.sup}

## 🎯 Prezzo Ottimale per Quantità
Dai il prezzo esatto che massimizza profitto+vendite per: 5/10/20/50/100/200 pz

## 💼 Strategia B2B Locale (Palermo)
Come presentare questo prodotto alle aziende locali e che prezzo proporre

## 🛒 Strategia Etsy
Titolo e prezzo ottimale per Etsy IT ed EU

## ⚡ Quick Win
1 cosa che posso fare per vendere 100+ pz di questo prodotto questa settimana
    `, null, 700);
    el.innerHTML = `<div style="background:var(--bg-card2);border:1px solid #6366f130;border-radius:10px;padding:14px;font-size:12px;line-height:1.7">${_inglyMd(res)}</div>`;
  },

  exportCSV() {
    const p = this._selProduct; if(!p) { alert('Seleziona un prodotto!'); return; }
    /* Lo stesso conto della tabella, non una sua copia: il file esportato e la
       schermata non possono più divergere. */
    const { rows: righe, mach, setupMin } = this._conto();
    const rows = [['Prodotto','Macchina','Quantità','Sconto Materiale','Avviamento/pz','Costo/pz','Prezzo/pz','Margine%','Prezzo minimo','Totale Ricavo','Profitto Totale']];
    righe.forEach(r=>{
      rows.push([p.name, mach.label, r.qty, (r.scaleDiscount*100).toFixed(0)+'%',
        r.setupCostPz.toFixed(2), r.totalCostPz.toFixed(2),
        r.salePz==null?'':r.salePz.toFixed(2), r.marginPct+'%',
        r.minPz==null?'':r.minPz.toFixed(2),
        r.totalSale==null?'':r.totalSale.toFixed(2),
        r.profit==null?'':r.profit.toFixed(2)]);
    });
    const csv = rows.map(r=>r.map(v=>'"'+String(v)+'"').join(',')).join('\n');
    const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv); a.download='quoter_b2b_'+p.id+'.csv'; a.click();
    if(typeof toast!=='undefined') toast('📤 CSV esportato!','success');
  },
};


// ─── LaserB2B Stock Manager ─────────────────────────────────────────
LaserB2B._STOCK_KEY = 'lb2b_stock_v1';
LaserB2B._loadStock = function(){
  try{return JSON.parse(localStorage.getItem(this._STOCK_KEY)||'[]');}catch(e){return [];}
};
LaserB2B._saveStock = function(arr){
  localStorage.setItem(this._STOCK_KEY, JSON.stringify(arr));
};
LaserB2B.openStockManager = function(){
  var self=this;
  function eu(v){return '€'+parseFloat(v||0).toFixed(2);}
  function renderList(){
    var listEl=document.getElementById('_lb2b_stock_list');
    if(!listEl)return;
    var stock=self._loadStock();
    if(!stock.length){
      listEl.innerHTML='<div style="text-align:center;padding:32px;color:var(--text-muted,#888);font-size:12px">Nessun articolo in magazzino.<br>Clicca "+" per aggiungere.</div>';
      return;
    }
    var totalVal=stock.reduce(function(s,it){return s+(parseFloat(it.qty)||0)*(parseFloat(it.cost)||0);},0);
    var html='<div style="padding:7px 12px;font-size:10px;color:var(--text-muted,#888);border-bottom:1px solid var(--border,#2a2a35);display:flex;justify-content:space-between">'
      +'<span>'+stock.length+' articoli</span><span>Valore totale: '+eu(totalVal)+'</span></div>';
    stock.forEach(function(it,i){
      var low=(parseFloat(it.qty)||0)<=(parseFloat(it.minQty)||0);
      html+='<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--border,#2a2a35)">'
        +'<span style="font-size:18px;width:24px;text-align:center">'+(it.icon||'📦')+'</span>'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-size:12px;font-weight:700;color:var(--text,#e8e8f0)">'+(it.name||'—')+(low?'<span style="margin-left:6px;font-size:9px;background:#ef444415;color:#ef4444;padding:1px 5px;border-radius:4px">⚠️ SCORTA BASSA</span>':'')+'</div>'
          +'<div style="font-size:10px;color:var(--text-muted,#888)">'+(parseFloat(it.qty)||0)+' '+(it.unit||'pz')+' · Min: '+(it.minQty||0)+' · '+eu(it.cost)+'/pz</div>'
        +'</div>'
        +'<div style="text-align:right;font-size:11px;font-weight:700;color:var(--primary,#6366f1);flex-shrink:0">'+eu((parseFloat(it.qty)||0)*(parseFloat(it.cost)||0))+'</div>'
        +'<div style="display:flex;gap:3px;flex-shrink:0">'
          +'<button onclick="LaserB2B._adjustStock('+i+')" style="padding:3px 7px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.25);border-radius:5px;cursor:pointer;font-size:10px;color:#6366f1" title="Aggiusta quantità">±</button>'
          +'<button onclick="LaserB2B._editStockItem('+i+')" style="padding:3px 7px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:5px;cursor:pointer;font-size:10px;color:var(--text-muted,#888)">✏️</button>'
          +'<button onclick="LaserB2B._delStockItem('+i+')" style="padding:3px 7px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:5px;cursor:pointer;font-size:10px;color:#ef4444">🗑</button>'
        +'</div>'
      +'</div>';
    });
    listEl.innerHTML=html;
  }
  var ov=document.getElementById('_lb2b_stock_ov');if(ov)ov.remove();
  ov=document.createElement('div');ov.id='_lb2b_stock_ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:19999;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.onclick=function(e){if(e.target===ov)ov.remove();};
  ov.innerHTML='<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:14px;width:100%;max-width:600px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden">'
    +'<div style="padding:14px 18px;border-bottom:1px solid var(--border,#2a2a35);display:flex;align-items:center;justify-content:space-between;background:var(--bg-card2,#18181f)">'
      +'<div><div style="font-size:14px;font-weight:800;color:var(--text,#e8e8f0)">📦 Magazzino Interno</div>'
      +'<div style="font-size:10px;color:var(--text-muted,#888)">Gestione articoli · Scorte · Valore</div></div>'
      +'<button onclick="document.getElementById(\'_lb2b_stock_ov\').remove()" style="background:none;border:none;color:var(--text-muted,#888);font-size:18px;cursor:pointer">✕</button>'
    +'</div>'
    +'<div style="padding:10px 14px;border-bottom:1px solid var(--border,#2a2a35)">'
      +'<button onclick="LaserB2B._editStockItem(-1)" style="width:100%;padding:8px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">+ Aggiungi Articolo</button>'
    +'</div>'
    +'<div id="_lb2b_stock_list" style="overflow-y:auto;flex:1"></div>'
  +'</div>';
  document.body.appendChild(ov);
  renderList();
};
LaserB2B._editStockItem = function(idx){
  var self=this;
  var stock=self._loadStock();
  var it=idx>=0?stock[idx]:{};
  var ov2=document.getElementById('_lb2b_stock_edit');if(ov2)ov2.remove();
  ov2=document.createElement('div');ov2.id='_lb2b_stock_edit';
  ov2.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:20000;display:flex;align-items:center;justify-content:center;padding:16px';
  ov2.onclick=function(e){if(e.target===ov2)ov2.remove();};
  var finp=function(id,lbl,val,type){type=type||'text';return '<div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:10px;color:var(--text-muted,#888)">'+lbl+'</label><input id="'+id+'" type="'+type+'" value="'+(val||'')+'" style="padding:6px 9px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:6px;color:var(--text,#e8e8f0);font-size:12px;width:100%"></div>';};
  ov2.innerHTML='<div style="background:var(--bg-card,#111115);border:1px solid var(--border,#2a2a35);border-radius:12px;width:100%;max-width:440px;overflow:hidden">'
    +'<div style="padding:12px 16px;border-bottom:1px solid var(--border,#2a2a35);font-size:13px;font-weight:800;color:var(--text,#e8e8f0);background:var(--bg-card2,#18181f)">'+(idx>=0?'✏️ Modifica':'➕ Nuovo')+' Articolo</div>'
    +'<div style="padding:14px 16px;display:flex;flex-direction:column;gap:8px">'
      +finp('_lse_icon','Icona',it.icon||'📦')
      +finp('_lse_name','Nome articolo',it.name||'')
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'
        +finp('_lse_qty','Quantità',it.qty||0,'number')
        +finp('_lse_unit','Unità',it.unit||'pz')
        +finp('_lse_min','Scorta minima',it.minQty||0,'number')
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
        +finp('_lse_cost','Costo/pz €',it.cost||0,'number')
        +finp('_lse_sup','Fornitore',it.supplier||'')
      +'</div>'
      +finp('_lse_note','Note',it.notes||'')
    +'</div>'
    +'<div style="padding:10px 16px;border-top:1px solid var(--border,#2a2a35);display:flex;gap:8px;justify-content:flex-end">'
      +'<button onclick="document.getElementById(\'_lb2b_stock_edit\').remove()" style="padding:7px 14px;background:var(--bg-card2,#18181f);border:1px solid var(--border,#2a2a35);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted,#888)">Annulla</button>'
      +'<button id="_lb2b_stock_save" style="padding:7px 14px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">💾 Salva</button>'
    +'</div>'
  +'</div>';
  document.body.appendChild(ov2);
  document.getElementById('_lb2b_stock_save').onclick=function(){
    var gv=function(id){var el=document.getElementById(id);return el?el.value.trim():'';};
    var gn=function(id){return parseFloat(gv(id))||0;};
    var item={icon:gv('_lse_icon')||'📦',name:gv('_lse_name'),qty:gn('_lse_qty'),unit:gv('_lse_unit')||'pz',minQty:gn('_lse_min'),cost:gn('_lse_cost'),supplier:gv('_lse_sup'),notes:gv('_lse_note')};
    if(!item.name){if(typeof toast!=='undefined')toast('Inserisci il nome articolo','error');return;}
    var stock2=self._loadStock();
    if(idx>=0)stock2[idx]=item;else stock2.push(item);
    self._saveStock(stock2);
    document.getElementById('_lb2b_stock_edit').remove();
    if(typeof toast!=='undefined')toast('✅ Articolo salvato','success');
    self.openStockManager();
  };
};
LaserB2B._adjustStock = function(idx){
  var self=this;
  var stock=self._loadStock();
  var it=stock[idx];if(!it)return;
  var delta=prompt('Aggiusta quantità "'+it.name+'" (es: +5 o -3)\nCorrente: '+(it.qty||0)+' '+it.unit,'');
  if(delta===null)return;
  var d=parseFloat(delta);if(isNaN(d)){if(typeof toast!=='undefined')toast('Valore non valido','error');return;}
  it.qty=Math.max(0,(parseFloat(it.qty)||0)+d);
  stock[idx]=it;self._saveStock(stock);
  if(typeof toast!=='undefined')toast((d>0?'+':'')+d+' '+it.unit+' → '+it.name,'success');
  self.openStockManager();
};
LaserB2B._delStockItem = function(idx){
  if(!confirm('Eliminare questo articolo dal magazzino?'))return;
  var stock=this._loadStock();
  stock.splice(idx,1);this._saveStock(stock);
  if(typeof toast!=='undefined')toast('Articolo rimosso','info');
  this.openStockManager();
};

window.MarketIntel = MarketIntel;
window.BankFunds = BankFunds;
window.LaserB2B = LaserB2B;

