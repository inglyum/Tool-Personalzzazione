
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v11 — ENGLISH 100% + CLOUD UPDATE SYSTEM
// ════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 1. I18n PATCH — forza traduzione di TUTTI gli elementi quando EN
// ═══════════════════════════════════════════════════════════════════════
(function patchI18nFullEN(){
  const tryPatch = () => {
    if(typeof I18n === 'undefined') return setTimeout(tryPatch, 600);
    if(I18n.__fullEnPatched) return;
    I18n.__fullEnPatched = true;

    const _origToggle = I18n.toggle.bind(I18n);
    const _origApply  = I18n.apply.bind(I18n);

    // Extended EN translations for all UI strings
    const EN_EXTRA = {
      // Page titles & headers
      'Dashboard':'Dashboard','Ordini & Workflow':'Orders & Workflow',
      'Gestione Workflow':'Orders & Workflow','Coda Produzione':'Production Queue',
      'Workflow Overview':'Workflow Overview','Vendite & Fatture':'Sales & Invoices',
      'Smart Quoter':'Smart Quoter','Catalogo':'Catalog','Materiali':'Materials',
      'Clienti':'Clients','Impostazioni':'Settings','Backup':'Backup',
      'Archivio Vendite':'Sales Archive','Scadenzario':'Payment Schedule',
      'Prima Nota':'Journal','Risorse Laser':'Laser Resources',
      'Brand & Identità':'Brand Identity','Licenza INGLY OS':'INGLY OS License',
      'Profilo Azienda':'Company Profile','API Key Manager':'API Key Manager',
      'Tema & White Label':'Theme & White Label','Notifiche Push':'Push Notifications',
      'Tour guidato':'Guided Tour','Avvia tour':'Start tour',
      // Buttons & actions
      'Salva':'Save','Annulla':'Cancel','Elimina':'Delete','Modifica':'Edit',
      'Aggiungi':'Add','Conferma':'Confirm','Chiudi':'Close','Cerca':'Search',
      'Esporta':'Export','Importa':'Import','Stampa':'Print','Scarica':'Download',
      'Condividi':'Share','Copia':'Copy','Incolla':'Paste','Apri':'Open',
      'Nuovo preventivo':'New quote','Nuovo ordine':'New order',
      'Aggiungi voce':'Add line','Salva preventivo':'Save quote',
      'Invia a Workflow':'Send to Workflow','Conferma vendita':'Confirm sale',
      'Scarica PDF':'Download PDF','PDF Cliente':'Client PDF',
      'Analisi interna':'Internal analysis','Link cliente':'Client link',
      // Status labels  
      'preventivo':'quote','accettato':'accepted','in_produzione':'in production',
      'spedito':'shipped','completato':'completed','venduto':'sold','annullato':'cancelled',
      'In attesa':'Pending','In produzione':'In production','Completato':'Completed',
      'da_pagare':'to pay','pagato':'paid','in ritardo':'overdue',
      // Order detail
      'Cliente':'Client','Importo €':'Amount €','Scadenza':'Due date',
      'Priorità':'Priority','Canale':'Channel','Fonte':'Source',
      'Stato':'Status','Note interne':'Internal notes','Salva modifiche':'Save changes',
      'Avanzamento rapido':'Quick advance','Storico':'History',
      'Tempo produzione':'Production time','Etichetta':'Label',
      'Archivia':'Archive','Ripristina':'Restore','Costo materiali':'Material cost',
      'Profitto netto':'Net profit','Margine':'Margin',
      // Dashboard
      'Fatturato':'Revenue','Ordini attivi':'Active orders','In ritardo':'Overdue',
      'Clienti totali':'Total clients','Ultimi ordini':'Recent orders',
      'Grafico ricavi':'Revenue chart','Alert stagionali':'Seasonal alerts',
      'Azioni rapide':'Quick actions','Top clienti':'Top clients','Timer attivi':'Active timers',
      'Azioni di oggi':'Today\'s actions','aggiorna':'refresh',
      'Personalizza dashboard':'Customize dashboard','Aggiungi widget':'Add widget',
      'Modalità modifica':'Edit mode','Fine':'Done',
      // Seasonal alerts (key titles)
      'Befana':'Epiphany','Festa del Papà':'Father\'s Day','Pasqua':'Easter',
      'Festa della Mamma':'Mother\'s Day','Lauree':'Graduations',
      'Matrimoni':'Weddings','Halloween':'Halloween',
      'Black Friday':'Black Friday','Natale':'Christmas',
      // Forms
      'Nome cliente':'Client name','Nome ordine / Descrizione':'Order name / Description',
      'Normale':'Normal','Alta':'High','Urgente':'Urgent',
      'Nessun dato':'No data','Tutto in ordine':'All good',
      // Brand Identity
      'La Nostra Storia':'Our Story','Come tutto è iniziato':'How it all started',
      'Tono di Voce':'Tone of Voice','Come parliamo':'How we speak',
      'Parole che USI':'Words you USE','Parole che EVITI':'Words you AVOID',
      'Impegno Green & Sostenibilità':'Green Commitment & Sustainability',
      'I tuoi impegni eco':'Your eco commitments','Aggiungi impegno':'Add commitment',
      'Aggiungi valore':'Add value','Salva tutto':'Save all',
      // Months
      'gennaio':'January','febbraio':'February','marzo':'March','aprile':'April',
      'maggio':'May','giugno':'June','luglio':'July','agosto':'August',
      'settembre':'September','ottobre':'October','novembre':'November','dicembre':'December',
    };

    I18n.apply = function() {
      _origApply();
      if(this.lang !== 'en') return;

      // 1. Translate all text nodes with data-i18n or matching known strings
      // Also translate page titles, section headers, buttons
      document.querySelectorAll(
        'h1,h2,h3,.page-title,.section-title,button,.nav-item,.btn,[class*="title"]'
      ).forEach(el => {
        // Don't touch elements with children (complex HTML)
        if(el.childElementCount > 0 && !el.classList.contains('nav-item') && el.tagName !== 'BUTTON') return;
        const txt = el.textContent.trim();
        if(!txt || txt.length > 100) return;
        // Try direct translation
        for(const [it, en] of Object.entries(EN_EXTRA)) {
          if(txt === it || txt.includes(it)) {
            const icon = el.querySelector('i,img,span.nav-badge');
            const badge = el.querySelector('.nav-badge');
            const newTxt = txt.replace(it, en);
            if(newTxt !== txt) {
              el.textContent = newTxt;
              if(icon) el.prepend(icon);
              if(badge) el.appendChild(badge);
            }
            break;
          }
        }
      });

      // 2. Translate placeholders
      document.querySelectorAll('[placeholder]').forEach(el => {
        const ph = el.placeholder;
        for(const [it, en] of Object.entries(EN_EXTRA)) {
          if(ph.includes(it)) { el.placeholder = ph.replace(it, en); break; }
        }
      });

      // 3. Translate modal/dynamic content labels by walking text nodes
      const walker = document.createTreeWalker(
        document.body, NodeFilter.SHOW_TEXT, null, false
      );
      const toTranslate = [];
      let node;
      while(node = walker.nextNode()) {
        const txt = node.textContent.trim();
        if(!txt || txt.length < 2 || txt.length > 80) continue;
        if(EN_EXTRA[txt]) toTranslate.push([node, EN_EXTRA[txt]]);
      }
      toTranslate.forEach(([node, en]) => { node.textContent = node.textContent.replace(node.textContent.trim(), en); });

      // 4. Also translate document.title
      document.title = 'INGLY OS — Artisan Workshop Manager';
    };

    // Also patch toggle to trigger full re-render
    I18n.toggle = function() {
      this.lang = (this.lang === 'it') ? 'en' : 'it';
      if(typeof localStorage !== 'undefined') localStorage.setItem('ingly_lang', this.lang);
      this.apply();
      if(typeof App !== 'undefined') App.renderSection(App.currentSection);
      const msg = this.lang === 'en' ? '🇬🇧 Language: English' : '🇮🇹 Lingua: Italiano';
      if(typeof toast !== 'undefined') toast(msg,'info');
    };

    // Load saved language preference
    const savedLang = localStorage.getItem('ingly_lang');
    if(savedLang && savedLang !== I18n.lang) {
      I18n.lang = savedLang;
      setTimeout(() => I18n.apply(), 2000);
    }

    console.log('[I18n Full EN Patch] Installed ✅');
  };
  setTimeout(tryPatch, 1500);
})();


// ═══════════════════════════════════════════════════════════════════════
// 2. CLOUD UPDATE SYSTEM — trends, news, fornitori con un click
// ═══════════════════════════════════════════════════════════════════════
const CloudUpdater = {
  _SK:      'ingly_cloud_v1',
  _SK_DATA: 'ingly_cloud_data_v1',

  SOURCES: [
    // Etsy trend data (public RSS → CORS proxy)
    { id:'etsy_trends',   label:'📈 Etsy Trends',       icon:'🛍',
      url: 'https://www.etsy.com/it/trending',
      type:'scrape', parser:'etsy_trends' },
    // Material prices Italy (simulated — replace with real supplier RSS if available)
    { id:'material_news', label:'🪵 Prezzi Materiali',   icon:'🪵',
      url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://legno.it/feed/'),
      type:'rss', parser:'rss_generic' },
    // AI-powered trend analysis using Claude
    { id:'ai_trends',     label:'🤖 AI Trend Analysis', icon:'🤖',
      url: 'https://api.anthropic.com/v1/messages',
      type:'ai', parser:'ai_trends' },
    // Seasonal forecast
    { id:'seasonal',      label:'🎯 Aggiorna Stagionale', icon:'🎯',
      url: null, type:'local', parser:'seasonal_refresh' },
  ],

  getLastUpdate() {
    try { return JSON.parse(localStorage.getItem(this._SK)||'null'); } catch { return null; }
  },

  getData() {
    try { return JSON.parse(localStorage.getItem(this._SK_DATA)||'{}'); } catch { return {}; }
  },

  async updateAll() {
    const results = {};
    const errors  = [];
    const meta    = { ts: Date.now(), items: {} };

    if(typeof toast !== 'undefined') toast('☁️ Aggiornamento in corso...','info');

    // 1. AI Trend Analysis (most reliable — uses Claude if key available)
    const aiKey = (typeof ApiKeyManager !== 'undefined') ? ApiKeyManager.get('claude') : '';
    if(aiKey) {
      try {
        const now   = new Date();
        const month = now.toLocaleDateString('it-IT', {month:'long'});
        const resp  = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type':'application/json', 'x-api-key':aiKey, 'anthropic-version':'2023-06-01' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: `Sei un esperto di artigianato laser e mercato Etsy italiano. Oggi è ${month} ${now.getFullYear()}.
Dammi in formato JSON (solo JSON, no testo):
{
  "trending_products": ["prodotto1", "prodotto2", "prodotto3", "prodotto4", "prodotto5"],
  "hot_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "seasonal_tip": "consiglio pratico specifico per questo mese",
  "material_focus": "materiale o tecnica da priorizzare questo mese",
  "pricing_insight": "insight sul pricing per artigiani laser questo mese",
  "avoid": "cosa evitare o ridurre questo mese"
}`
            }]
          })
        });
        if(resp.ok) {
          const data = await resp.json();
          const text = data.content?.[0]?.text || '';
          const clean = text.replace(/```json|```/g,'').trim();
          results.ai_trends = JSON.parse(clean);
          meta.items.ai_trends = Date.now();
        }
      } catch(e) { errors.push('AI: '+e.message); }
    }

    // 2. Local seasonal data refresh
    results.seasonal = this._refreshSeasonal();
    meta.items.seasonal = Date.now();

    // 3. Save results
    localStorage.setItem(this._SK_DATA, JSON.stringify(results));
    localStorage.setItem(this._SK, JSON.stringify(meta));

    const count = Object.keys(results).length;
    if(typeof toast !== 'undefined')
      toast(`✅ Aggiornato: ${count} fonti · ${errors.length ? errors.length+' errori' : 'tutto ok'}`, 'success');

    // Refresh the panel if visible
    this.renderPanel();
    return results;
  },

  _refreshSeasonal() {
    const now = new Date();
    const month = now.getMonth();
    // Return upcoming events for next 60 days
    if(typeof SeasonalGuard !== 'undefined') {
      const active = SeasonalGuard._getActive();
      return { active_alerts: active.length, next_event: active[0]?.title || null };
    }
    return { month: now.toLocaleDateString('it-IT',{month:'long'}), refreshed: true };
  },

  renderPanel() {
    const el = document.getElementById('view-cloud_updater');
    if(!el || !el.offsetParent) return; // not visible

    const lastUpdate = this.getLastUpdate();
    const data       = this.getData();
    const trends     = data.ai_trends;
    const ago        = lastUpdate ? Math.round((Date.now()-lastUpdate.ts)/60000) : null;

    el.innerHTML = `
    <div style="padding:20px 24px;max-width:900px;margin:0 auto">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid var(--border)">
        <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#0ea5e9,#6366f1);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">☁️</div>
        <div style="flex:1">
          <h2 style="margin:0 0 3px;font-size:20px;font-weight:900">Cloud Update</h2>
          <p style="margin:0;font-size:12px;color:var(--text-muted)">
            ${ago !== null ? `Ultimo aggiornamento: ${ago < 60 ? ago+'m fa' : Math.round(ago/60)+'h fa'}` : 'Mai aggiornato'} · 
            Funziona offline — aggiornato solo su richiesta
          </p>
        </div>
        <button onclick="CloudUpdater.updateAll()" id="cloud-update-btn"
          style="padding:11px 22px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">
          ☁️ Aggiorna ora
        </button>
      </div>

      <!-- What gets updated -->
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px">
        ${[
          ['🤖','AI Trend Analysis','Trending products, keywords, consigli mensili via Claude AI','ai_trends'],
          ['🎯','Alert Stagionali','Prossimi eventi e picchi di domanda del calendario','seasonal'],
          ['📊','KPI Insights','Analisi automatica dei tuoi dati di vendita','kpi'],
          ['🔔','Push Alerts','Aggiorna le notifiche per scadenze e pagamenti','push'],
        ].map(([em,title,desc,key])=>`
        <div style="display:flex;gap:10px;padding:12px 14px;background:var(--bg-card2);border-radius:10px;border:1px solid var(--border)">
          <span style="font-size:20px;flex-shrink:0">${em}</span>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700;color:var(--text)">${title}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${desc}</div>
          </div>
          <span style="font-size:10px;color:${data[key]?'#22c55e':'var(--text-dim)'};font-weight:700;align-self:center">${data[key]?'✅':'—'}</span>
        </div>`).join('')}
      </div>

      ${trends ? `
      <!-- AI Trend Results -->
      <div style="background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:14px">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:linear-gradient(90deg,#0ea5e920,transparent);display:flex;align-items:center;gap:8px">
          <span style="font-size:14px">🤖</span>
          <div style="font-size:13px;font-weight:700">AI Trend Analysis — ${new Date().toLocaleDateString('it-IT',{month:'long',year:'numeric'})}</div>
        </div>
        <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:14px">
          ${trends.trending_products?.length ? `
          <div>
            <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">🔥 Trending prodotti</div>
            ${trends.trending_products.map(p=>`<div style="display:flex;gap:6px;align-items:center;padding:3px 0"><span style="color:#f97316;font-size:10px">▶</span><span style="font-size:12px">${p}</span></div>`).join('')}
          </div>` : ''}
          ${trends.hot_keywords?.length ? `
          <div>
            <div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">🔍 Hot keywords</div>
            <div style="display:flex;flex-wrap:wrap;gap:5px">
              ${trends.hot_keywords.map(k=>`<span style="padding:3px 9px;background:var(--primary-dim);color:var(--primary);border-radius:99px;font-size:11px;font-weight:600">${k}</span>`).join('')}
            </div>
          </div>` : ''}
          ${trends.seasonal_tip ? `
          <div style="grid-column:1/-1;padding:10px 14px;background:linear-gradient(135deg,#064e3b12,#064e3b05);border-left:3px solid #10b981;border-radius:0 8px 8px 0">
            <div style="font-size:10px;font-weight:700;color:#10b981;margin-bottom:4px">💡 Consiglio del mese</div>
            <div style="font-size:12px;line-height:1.6">${trends.seasonal_tip}</div>
          </div>` : ''}
          ${trends.pricing_insight ? `
          <div style="padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px">
            <div style="font-size:10px;font-weight:700;color:var(--text-dim);margin-bottom:4px">💶 Pricing</div>
            <div style="font-size:12px">${trends.pricing_insight}</div>
          </div>` : ''}
          ${trends.material_focus ? `
          <div style="padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px">
            <div style="font-size:10px;font-weight:700;color:var(--text-dim);margin-bottom:4px">🪵 Focus materiali</div>
            <div style="font-size:12px">${trends.material_focus}</div>
          </div>` : ''}
          ${trends.avoid ? `
          <div style="grid-column:1/-1;padding:8px 14px;background:#ef444410;border-left:3px solid #ef4444;border-radius:0 6px 6px 0">
            <div style="font-size:10px;font-weight:700;color:#ef4444;margin-bottom:2px">⚠️ Evita questo mese</div>
            <div style="font-size:12px">${trends.avoid}</div>
          </div>` : ''}
        </div>
      </div>` : `
      <div style="text-align:center;padding:40px;color:var(--text-dim)">
        <div style="font-size:48px;margin-bottom:12px;opacity:.3">☁️</div>
        <div style="font-size:14px;font-weight:700;color:var(--text-muted)">Nessun dato ancora</div>
        <div style="font-size:12px;margin-top:6px">Clicca "Aggiorna ora" per ricevere trend, consigli AI e aggiornamenti stagionali</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:8px">⚡ Richiede API key Claude in Impostazioni → API Key Manager</div>
      </div>`}

      <!-- Privacy note -->
      <div style="font-size:10px;color:var(--text-dim);text-align:center;padding:8px;background:var(--bg-card2);border-radius:6px">
        🔒 Il tool funziona sempre offline · I tuoi dati non vengono mai inviati · Solo le richieste AI usano la connessione
      </div>
    </div>`;
  },
};
window.CloudUpdater = CloudUpdater;


// ── INSTALL CloudUpdater ─────────────────────────────────────────────
(function installCloudUpdater(){
  const tryInstall = () => {
    if(typeof App === 'undefined') return setTimeout(tryInstall, 800);

    // view container
    if(!document.getElementById('view-cloud_updater')) {
      const div = document.createElement('div');
      div.className = 'section-view'; div.id = 'view-cloud_updater';
      const backupView = document.getElementById('view-backup');
      if(backupView) backupView.parentNode.insertBefore(div, backupView.nextSibling);
      else document.body.appendChild(div);
    }

    // Nav item
    if(!document.querySelector('[data-section="cloud_updater"]')) {
      const backupNav = document.querySelector('[data-section="backup"]');
      if(backupNav) {
        const nav = document.createElement('div');
        nav.className = 'nav-item';
        nav.setAttribute('data-section','cloud_updater');
        nav.onclick = ()=>App.navigate('cloud_updater');
        nav.innerHTML = '<i class="fas fa-cloud-download-alt" style="color:#0ea5e9"></i> ☁️ Cloud Update';
        backupNav.parentNode.insertBefore(nav, backupNav.nextSibling);
      }
    }

    // renderSection
    if(!App.__cloudPatch) {
      App.__cloudPatch = true;
      const _origRS = App.renderSection?.bind(App);
      if(_origRS) App.renderSection = function(s) {
        if(s==='cloud_updater') { CloudUpdater.renderPanel(); return; }
        _origRS(s);
      };
    }

    // Add quick update button to topbar
    setTimeout(()=>{
      if(document.getElementById('cloud-topbar-btn')) return;
      const topbar = document.getElementById('topbar') || document.querySelector('.topbar');
      if(!topbar) return;
      const btn = document.createElement('button');
      btn.id = 'cloud-topbar-btn';
      btn.style.cssText = 'padding:5px 9px;background:rgba(14,165,233,.15);border:1px solid rgba(14,165,233,.3);border-radius:7px;cursor:pointer;font-size:10px;color:#0ea5e9;font-weight:700;white-space:nowrap';
      btn.innerHTML = '☁️';
      btn.title = 'Cloud Update — aggiorna trend e notizie';
      btn.onclick = ()=>App.navigate('cloud_updater');
      topbar.appendChild(btn);
    }, 3000);

    console.log('[CloudUpdater] Installed ✅');
  };
  setTimeout(tryInstall, 2500);
})();

console.log('[INGLY OS v11] EN Full + CloudUpdater loaded ✅');

