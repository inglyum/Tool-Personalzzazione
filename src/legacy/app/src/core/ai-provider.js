
// === /src/core/ai-provider.js ===
// ============================================================
// INGLY MASTER 20.0 — JavaScript Completo
// ============================================================

// ===== AIProvider — Unified AI Abstraction Layer =====
// Providers: anthropic | gemini | openrouter | groq | smart
const AIProvider = (function(){
  let _callCount = 0;
  let _callCountDate = new Date().toDateString();

  function _trackCall(){
    const today = new Date().toDateString();
    if(today !== _callCountDate){ _callCount = 0; _callCountDate = today; }
    _callCount++;
    try{ localStorage.setItem('ingly_ai_calls_today', JSON.stringify({count:_callCount, date:_callCountDate})); }catch(e){}
    const el = document.getElementById('ai-calls-badge');
    if(el) el.textContent = _callCount + ' chiamate oggi';
  }

  // ── Anthropic Claude ──
  async function _callAnthropic(prompt, maxTokens){
    const key = (localStorage.getItem('ingly_api_key')||'').trim();
    if(!key) throw new Error('NO_KEY');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: maxTokens||1500, messages: [{ role:'user', content:prompt }] })
    });
    const d = await res.json();
    if(!res.ok){ if(res.status===401||res.status===403) throw new Error('INVALID_KEY'); throw new Error(d.error?.message||`HTTP ${res.status}`); }
    return d.content?.[0]?.text || '';
  }

  // ── Google Gemini ──
  async function _callGemini(prompt, maxTokens){
    const key = (localStorage.getItem('ingly_gemini_key')||'').trim();
    if(!key) throw new Error('NO_GEMINI_KEY');
    const model = localStorage.getItem('ingly_gemini_model') || 'gemini-2.0-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens||1500 } })
    });
    const d = await res.json();
    if(!res.ok) throw new Error(d.error?.message || `HTTP ${res.status}`);
    return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async function _callGeminiVision(prompt, imageBase64, mimeType, maxTokens){
    const key = (localStorage.getItem('ingly_gemini_key')||'').trim();
    if(!key) throw new Error('NO_GEMINI_KEY');
    const model = localStorage.getItem('ingly_gemini_model') || 'gemini-2.0-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType||'image/jpeg', data: imageBase64 } }] }], generationConfig: { maxOutputTokens: maxTokens||800 } })
    });
    const d = await res.json();
    if(!res.ok) throw new Error(d.error?.message || `HTTP ${res.status}`);
    return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // ── OpenRouter (aggregatore, crediti gratuiti iniziali, funziona in EU) ──
  async function _callOpenRouter(prompt, maxTokens){
    const key = (localStorage.getItem('ingly_openrouter_key')||'').trim();
    if(!key) throw new Error('NO_OPENROUTER_KEY');
    const model = localStorage.getItem('ingly_openrouter_model') || 'meta-llama/llama-3.3-70b-instruct:free';
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': 'https://ingly.app', 'X-Title': 'Ingly Master' },
      body: JSON.stringify({ model, max_tokens: maxTokens||1500, messages: [{ role:'user', content: prompt }] })
    });
    const d = await res.json();
    if(!res.ok) throw new Error(d.error?.message || `HTTP ${res.status}`);
    return d.choices?.[0]?.message?.content || '';
  }

  // ── Groq (gratis, ultra-veloce, funziona in EU) ──
  async function _callGroq(prompt, maxTokens){
    const key = (localStorage.getItem('ingly_groq_key')||'').trim();
    if(!key) throw new Error('NO_GROQ_KEY');
    const model = localStorage.getItem('ingly_groq_model') || 'llama-3.3-70b-versatile';
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model, max_tokens: maxTokens||1500, messages: [{ role:'user', content: prompt }] })
    });
    const d = await res.json();
    if(!res.ok) throw new Error(d.error?.message || `HTTP ${res.status}`);
    return d.choices?.[0]?.message?.content || '';
  }

  // ── Modalità Smart Locale (ZERO API — analisi basata sui tuoi dati) ──
  async function _callSmart(prompt){
    // Genera analisi intelligente usando i dati reali salvati in IndexedDB
    // Nessuna chiamata esterna — tutto offline e gratuito
    const p = prompt.toLowerCase();

    // ── Brand Identity prompts → AIDemoMode (smart contextual responses) ──
    if(p.includes('brand story') || p.includes('mission statement') || p.includes('vision statement') ||
       p.includes('unique selling') || p.includes('usp') || p.includes('elevator pitch') ||
       p.includes('tagline') || p.includes('slogan') || p.includes('bio instagram') ||
       p.includes('about etsy') || p.includes('fiera') || p.includes('buyer persona') ||
       p.includes('tono di voce') || p.includes('palette') || p.includes('colori brand') ||
       (p.includes('storia') && (p.includes('brand') || p.includes('laboratorio') || p.includes('artigian'))) ||
       (p.includes('mission') && (p.includes('brand') || p.includes('artigian') || p.includes('scrivi'))) ||
       (p.includes('vision') && (p.includes('brand') || p.includes('artigian') || p.includes('scrivi'))) ||
       (p.includes('scrivi') && (p.includes('presentazione') || p.includes('testo') || p.includes('copy'))) ||
       (p.includes('genera') && (p.includes('testo') || p.includes('copy') || p.includes('descrizione'))) ||
       p.includes('copywriter') || p.includes('etsy seo') || p.includes('listing etsy')
    ){
      if(typeof AIDemoMode !== 'undefined') return AIDemoMode.get(prompt);
      return `Configura una API key in ⚙️ Impostazioni → AI Hub per generare testi con l'AI.`;
    }

    // Helper per leggere dati locali — v4.6 FIX: usa IDB module (era hardcodato a v17!)
    async function getData(store){
      try{ return await IDB.getAll(store); }catch(e){ return []; }
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth()-1, 1);

    // Analisi vendite
    const sales = await getData('sales');
    const thisMo = sales.filter(s=>s.status==='pagato'&&new Date(s.date)>=monthStart);
    const lastMo = sales.filter(s=>s.status==='pagato'&&new Date(s.date)>=lastMonthStart&&new Date(s.date)<monthStart);
    const revThis = thisMo.reduce((a,s)=>a+(+s.amount||0),0);
    const revLast = lastMo.reduce((a,s)=>a+(+s.amount||0),0);
    const revDelta = revLast>0 ? Math.round((revThis-revLast)/revLast*100) : 0;

    // Analisi cashflow
    const cashflow = await getData('cashflow');
    const uscite = cashflow.filter(c=>c.type==='uscita'&&new Date(c.date)>=monthStart).reduce((a,c)=>a+(+c.amount||0),0);
    const profitto = revThis - uscite;
    const margine = revThis>0 ? Math.round(profitto/revThis*100) : 0;

    // Analisi ordini
    const orders = await getData('orders');
    const attivi = orders.filter(o=>o.status!=='completato'&&o.status!=='consegnato');
    const inRitardo = attivi.filter(o=>o.dueDate&&new Date(o.dueDate)<now);

    // Inventario
    const inventory = await getData('inventory');
    const scorte = inventory.filter(i=>(+i.qty||0)<=(+i.minQty||2));

    // Clienti
    const clients = await getData('clients');
    const newClientsThis = clients.filter(c=>new Date(c.created||c.date||0)>=monthStart);

    // Genera risposta personalizzata in base al contesto del prompt
    const fmt = n => '€'+Math.round(n).toLocaleString('it-IT');

    let risposta = '';

    // === DASHBOARD / RIEPILOGO ===
    if(p.includes('dashboard')||p.includes('riepilogo')||p.includes('briefing')||p.includes('analisi')||p.includes('situazione')||p.includes('business')){
      risposta = `## 📊 Analisi Business — ${now.toLocaleDateString('it-IT',{month:'long',year:'numeric'})}

**Revenue questo mese:** ${fmt(revThis)} ${revDelta>=0?'📈 +'+revDelta+'%':'📉 '+revDelta+'%'} vs mese scorso
**Uscite registrate:** ${fmt(uscite)}
**Profitto stimato:** ${fmt(profitto)} (margine ${margine}%)

### 🎯 Priorità immediate
${inRitardo.length>0?`⚠️ **${inRitardo.length} ordini in ritardo** — da gestire subito`:'✅ Nessun ordine in ritardo'}
${scorte.length>0?`📦 **${scorte.length} articoli sotto scorta minima** — riordina presto`:'✅ Scorte nei limiti'}
${attivi.length>0?`🔧 **${attivi.length} ordini attivi** in lavorazione`:''}

### 💡 Suggerimenti basati sui tuoi dati
${revDelta<-10?'🔴 Revenue in calo rispetto al mese scorso — considera promozioni o nuovi canali':''}
${revDelta>=10?'🟢 Ottima crescita! Assicurati di avere capacità produttiva sufficiente':''}
${margine<20?'⚠️ Margine basso ('+margine+'%) — rivedi i prezzi o riduci i costi fissi':''}
${margine>=40?'💰 Ottimo margine! Puoi considerare investimenti in attrezzature':''}
${newClientsThis.length>0?`👥 ${newClientsThis.length} nuovi clienti questo mese — ottimo!`:'💡 Nessun nuovo cliente questo mese — attiva marketing'}`;
    }

    // === PREVISIONI ===
    else if(p.includes('previsioni')||p.includes('forecast')||p.includes('prossimo mese')||p.includes('futuro')){
      const avg = sales.length>0 ? sales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+s.amount||0),0)/Math.max(1,new Set(sales.map(s=>s.date?.substring(0,7))).size) : 0;
      risposta = `## 🔮 Previsioni per il prossimo mese

**Stima basata sulla media storica:** ${fmt(avg)}
**Revenue corrente (mese in corso):** ${fmt(revThis)}

### 📈 Proiezioni
- **Scenario ottimistico (+15%):** ${fmt(revThis*1.15)}
- **Scenario base (continuità):** ${fmt(revThis)}
- **Scenario conservativo (-10%):** ${fmt(revThis*0.9)}

### 🎯 Per raggiungere gli obiettivi
${revThis<avg?`💡 Sei sotto la media storica (${fmt(avg)}) — focus su upsell ai clienti esistenti`:`✅ Stai performando sopra la media storica`}
${attivi.length>0?`📦 Hai ${attivi.length} ordini attivi — assicurati di consegnare nei tempi`:''}

### 💡 Azioni consigliate
- Contatta i ${clients.length} clienti nel database per ordini ripetuti
- ${scorte.length>0?`Riordina ${scorte.length} articoli esauriti prima di accettare nuovi ordini`:'Scorte ok, puoi accettare nuovi ordini'}
- Analizza i prodotti più venduti per concentrare la produzione`;
    }

    // === CASHFLOW / FINANZE ===
    else if(p.includes('cash')||p.includes('finanz')||p.includes('costo')||p.includes('spese')||p.includes('profit')){
      risposta = `## 💰 Analisi Finanziaria — ${now.toLocaleDateString('it-IT',{month:'long',year:'numeric'})}

| Voce | Importo |
|------|---------|
| 📈 Entrate | ${fmt(revThis)} |
| 📉 Uscite registrate | ${fmt(uscite)} |
| 💵 Profitto netto | ${fmt(profitto)} |
| 📊 Margine | ${margine}% |

### ⚠️ Segnali di attenzione
${uscite>revThis?'🔴 **Le uscite superano le entrate** — situazione critica, intervieni subito':''}
${margine<15?'🟡 Margine inferiore al 15% — verifica i prezzi di vendita':''}
${margine>=35?'🟢 Margine eccellente — business sano':''}
${profitto>0&&margine>=25?`✅ Buona salute finanziaria. Profitto di ${fmt(profitto)} con margine ${margine}%`:''}

### 💡 Ottimizzazioni suggerite
- Confronta le uscite mensili con i costi fissi registrati
- Identifica le categorie di spesa più alte
- Considera di alzare i prezzi del 5-10% se il mercato lo permette`;
    }

    // === MARKETING / SOCIAL ===
    else if(p.includes('marketing')||p.includes('social')||p.includes('instagram')||p.includes('etsy')||p.includes('content')||p.includes('post')){
      risposta = `## 📱 Strategia Marketing — Suggerimenti Basati sui Tuoi Dati

### 📅 Piano Contenuti questa settimana
**Lunedì:** Behind the scenes — mostra il processo produttivo in lavorazione
**Mercoledì:** Prodotto finito + storia del cliente (con permesso)
**Venerdì:** Tips & tricks sull'incisione laser, coinvolgi la community
**Domenica:** Preview settimana prossima + offerta weekend

### 🎯 Focus basato sui tuoi ordini
${attivi.length>0?`📦 Hai ${attivi.length} ordini in corso — documenta la lavorazione per contenuti autentici`:''}
${clients.length>0?`👥 Con ${clients.length} clienti nel database, punta sui testimonial e referral`:''}

### 💡 Idee contenuti ad alto engagement
- **"Dal file al prodotto"** — Reels del processo laser (alto engagement)
- **"Personalizzato per te"** — Storie di clienti soddisfatti
- **Errori da evitare** — Educational content che genera fiducia
- **Prima/Dopo** — Confronti sempre efficaci

### 📊 KPI da monitorare
Follower growth, reach post, click verso shop, conversioni Etsy`;
    }

    // === PRODOTTI / CATALOGO ===
    else if(p.includes('prodott')||p.includes('catalog')||p.includes('prezz')||p.includes('listing')){
      const catalog = await getData('catalog');
      risposta = `## 🛍️ Analisi Prodotti

**Prodotti nel catalogo:** ${catalog.length}
${catalog.length>0?`**Prezzo medio:** ${fmt(catalog.reduce((a,p)=>a+(+p.salePrice||0),0)/catalog.length)}`:''}

### 💡 Ottimizzazione listing Etsy
- Usa foto con sfondo bianco/neutro per il thumbnail principale
- Aggiungi almeno 5 foto (dettaglio, scala, utilizzo, packaging)
- Titolo: includi materiale + uso + personalizzazione (es: "Tagliere legno personalizzato incisione laser regalo")
- Descrizione: problema → soluzione → beneficio → CTA
- Tag: usa tutti e 13, mix di generici e specifici

### 📈 Pricing
${catalog.length>0?`Il tuo prezzo medio è ${fmt(catalog.reduce((a,p)=>a+(+p.salePrice||0),0)/catalog.length)} — verifica che copra tutti i costi (materiale + lavoro + macchina + overhead)`:'Inserisci prodotti nel catalogo per analisi prezzi'}`;
    }

    // === ORDINI / WORKFLOW ===
    else if(p.includes('ordini')||p.includes('workflow')||p.includes('lavori')||p.includes('produzion')){
      risposta = `## 🔧 Gestione Ordini & Produzione

**Ordini attivi:** ${attivi.length}
**In ritardo:** ${inRitardo.length}
${inRitardo.length>0?`\n⚠️ **Ordini scaduti:**\n${inRitardo.slice(0,5).map(o=>`- ${o.client||o.name||'Cliente'} — scaduto ${o.dueDate?new Date(o.dueDate).toLocaleDateString('it-IT'):''}`).join('\n')}`:'✅ Nessun ritardo'}

### 📦 Stato produzione
${attivi.length===0?'🟢 Nessun ordine attivo — momento ideale per materiali e preparazione':attivi.length<=3?'🟢 Carico di lavoro gestibile':'🟡 Carico elevato — valuta tempi di consegna realistici'}

### 💡 Ottimizzazioni
- Raggruppa ordini simili per risparmiare setup tempo macchina
- Prepara materiali con anticipo basandoti sugli ordini in entrata
- ${inRitardo.length>0?'Contatta subito i clienti con ritardi — la comunicazione proattiva salva la reputazione':'Ottima puntualità nelle consegne!'}`;
    }

    // === CLIENTI / CRM ===
    else if(p.includes('client')||p.includes('crm')||p.includes('customer')){
      risposta = `## 👥 Analisi Clienti

**Clienti totali:** ${clients.length}
**Nuovi questo mese:** ${newClientsThis.length}

### 💡 Strategie CRM
${clients.length>0?`
**Segmentazione suggerita:**
- 🏆 Top clienti (>3 ordini): offri sconto fedeltà o priorità consegna
- 💫 Clienti recenti (ultimi 3 mesi): follow-up per ordine ripetuto
- 😴 Clienti dormienti (>6 mesi): campagna riattivazione con offerta speciale`:'Inserisci clienti nel CRM per analisi personalizzate'}

### 📧 Azioni immediate
- Invia update di stato agli ordini in lavorazione
- Chiedi recensioni ai clienti soddisfatti degli ultimi 30 giorni
- ${newClientsThis.length>0?`Benvenuto ai ${newClientsThis.length} nuovi clienti — follow-up entro 48h dalla consegna`:'Attiva promozione "porta un amico" per acquisire nuovi clienti'}`;
    }

    // === RISPOSTA GENERICA ===
    else {
      risposta = `## 🤖 Analisi Smart — ${now.toLocaleDateString('it-IT',{month:'long',year:'numeric'})}

Basandomi sui dati salvati in Ingly Master:

**📊 Situazione attuale:**
- Revenue mese corrente: ${fmt(revThis)} ${revDelta>=0?'(+'+revDelta+'% vs mese scorso)':'('+revDelta+'% vs mese scorso)'}
- Ordini attivi: ${attivi.length} ${inRitardo.length>0?`(⚠️ ${inRitardo.length} in ritardo)`:''}
- Clienti nel database: ${clients.length}

**💡 Consiglio del giorno:**
${profitto>0?`Stai generando ${fmt(profitto)} di profitto questo mese. Continua così!`:''}
${inRitardo.length>0?`Priorità: gestisci i ${inRitardo.length} ordini in ritardo`:''}
${scorte.length>0?`Ricorda di riordinare ${scorte.length} articoli sotto scorta`:''}

*Modalità Smart Locale — analisi basata sui tuoi dati, zero API richiesta*`;
    }

    return risposta || '## Analisi Smart\n\nInserisci più dati in Ingly Master per ottenere analisi personalizzate dettagliate.\n\n*Modalità Smart Locale — zero API, zero costi*';
  }

  return {
    getProvider(){ return localStorage.getItem('ingly_ai_provider') || 'smart'; },

    async call(prompt, maxTokens){
      _trackCall();
      const provider = this.getProvider();
      switch(provider){
        case 'gemini':    return await _callGemini(prompt, maxTokens);
        case 'openrouter':return await _callOpenRouter(prompt, maxTokens);
        case 'groq':      return await _callGroq(prompt, maxTokens);
        case 'anthropic': return await _callAnthropic(prompt, maxTokens);
        case 'perplexity': return await _callPerplexity(prompt, maxTokens);
        case 'smart':     return await _callSmart(prompt);
        default:          return await _callSmart(prompt);
      }
    },

    async callVision(prompt, imageBase64, mimeType, maxTokens){
      _trackCall();
      const provider = this.getProvider();
      if(provider === 'gemini'){
        return await _callGeminiVision(prompt, imageBase64, mimeType, maxTokens);
      } else if(provider === 'anthropic'){
        const key = (localStorage.getItem('ingly_api_key')||'').trim();
        if(!key) throw new Error('NO_KEY');
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: maxTokens||800, messages: [{ role:'user', content:[{ type:'image', source:{ type:'base64', media_type: mimeType||'image/jpeg', data: imageBase64 } },{ type:'text', text: prompt }]}] })
        });
        const d = await res.json();
        if(!res.ok) throw new Error(d.error?.message||`HTTP ${res.status}`);
        return d.content?.[0]?.text||'';
      } else {
        // OpenRouter/Groq vision non supportata — usa solo testo
        return await this.call('Analizza questo scontrino: ' + prompt, maxTokens);
      }
    },

    hasKey(){
      const provider = this.getProvider();
      if(provider === 'perplexity') return (localStorage.getItem('ingly_perplexity_key')||'').trim().startsWith('pplx-');
      if(provider === 'smart') return true; // sempre disponibile
      if(provider === 'gemini') return (localStorage.getItem('ingly_gemini_key')||'').trim().length > 10;
      if(provider === 'openrouter') return (localStorage.getItem('ingly_openrouter_key')||'').trim().length > 10;
      if(provider === 'groq') return (localStorage.getItem('ingly_groq_key')||'').trim().startsWith('gsk_');
      if(provider === 'anthropic') return (localStorage.getItem('ingly_api_key')||'').trim().startsWith('sk-ant-');
      return false;
    },

    getCallsToday(){
      try{
        const s = JSON.parse(localStorage.getItem('ingly_ai_calls_today')||'{}');
        if(s.date === new Date().toDateString()) return s.count || 0;
      }catch(e){}
      return 0;
    }
  };
})();


// ===== DATABASE IndexedDB =====
window.AIProvider = AIProvider;

