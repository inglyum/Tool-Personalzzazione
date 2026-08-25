
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v18 — TOUR GUIDATO + PWA + PROFILO AZIENDA + API KEY MANAGER
// ════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 1. TOUR GUIDATO INTERATTIVO — 7 step onboarding
// ═══════════════════════════════════════════════════════════════════════
const OnboardingTour = {
  _SK: 'ingly_tour_done_v1',
  _step: 0,

  STEPS: [
    {
      section: null,
      target: null,
      title: '👋 Benvenuto in INGLY OS!',
      desc: 'Il tuo gestionale artigiano completo. In 60 secondi ti mostriamo le 6 aree principali. Puoi saltare in qualsiasi momento.',
      pos: 'center',
    },
    {
      section: 'quoter',
      target: '[data-section="quoter"]',
      title: '📋 Smart Quoter',
      desc: 'Crea preventivi professionali in secondi. Aggiungi voci dal catalogo, applica markup, genera PDF con il tuo logo e condividi via WhatsApp.',
      pos: 'right',
    },
    {
      section: 'gestione_ordini',
      target: '[data-section="gestione_ordini"]',
      title: '🔄 Gestione Ordini & Workflow',
      desc: 'Kanban unificato: trascina gli ordini da Preventivo → Produzione → Venduto. Tutto si aggiorna in tempo reale. Nessuna sezione duplicata.',
      pos: 'right',
    },
    {
      section: 'sales',
      target: '[data-section="sales"]',
      title: '💰 Vendite & Fatture',
      desc: 'Storico vendite con grafici, totali per periodo, PDF fattura/ricevuta, fatture ricorrenti e gestione pagamenti. Collegato automaticamente al workflow.',
      pos: 'right',
    },
    {
      section: 'clients',
      target: '[data-section="clients"]',
      title: '👤 Clienti',
      desc: 'Rubrica completa con storico acquisti, CLV, tag, note private, promemoria compleanni. Tutto collegato ai preventivi e agli ordini.',
      pos: 'right',
    },
    {
      section: 'ai',
      target: '[data-section="ai"]',
      title: '🤖 AI Intelligence',
      desc: 'Price Advisor, Etsy SEO, Competitor Tracking, Morning Briefing, Market Intel e molto altro. Configura la tua API key in Impostazioni → AI.',
      pos: 'right',
    },
    {
      section: 'settings',
      target: '[data-section="settings"]',
      title: '⚙️ Impostazioni',
      desc: 'Configura il tuo profilo azienda, le API key AI, il tema e molto altro. Inizia da qui per personalizzare INGLY con i tuoi dati.',
      pos: 'right',
    },
  ],

  shouldShow() {
    return !localStorage.getItem(this._SK);
  },

  start(force=false) {
    if(!force && !this.shouldShow()) return;
    this._step = 0;
    this._render();
  },

  _render() {
    document.getElementById('ingly-tour-overlay')?.remove();
    const step = this.STEPS[this._step];
    if(!step) { this._finish(); return; }

    // Navigate to section if needed
    if(step.section && typeof App !== 'undefined') {
      App.navigate(step.section);
    }

    const overlay = document.createElement('div');
    overlay.id = 'ingly-tour-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none';

    // Spotlight on target
    let spotlightHTML = '';
    let tooltipStyle = 'top:50%;left:50%;transform:translate(-50%,-50%)';
    
    if(step.target && step.pos !== 'center') {
      const targetEl = document.querySelector(step.target);
      if(targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const pad = 8;
        spotlightHTML = `
          <div style="position:fixed;inset:0;background:#000;opacity:.6;pointer-events:all" 
               onclick="OnboardingTour.skip()" 
               style="position:fixed;inset:0;background:rgba(0,0,0,.65)"></div>
          <div style="position:fixed;left:${rect.left-pad}px;top:${rect.top-pad}px;width:${rect.width+pad*2}px;height:${rect.height+pad*2}px;
               border-radius:10px;box-shadow:0 0 0 9999px rgba(0,0,0,.65);background:transparent;z-index:1;pointer-events:none"></div>`;
        
        // Position tooltip next to target
        const tipLeft = rect.right + 16;
        const tipTop  = Math.min(rect.top, window.innerHeight - 220);
        tooltipStyle = `top:${tipTop}px;left:${Math.min(tipLeft, window.innerWidth-340)}px`;
      } else {
        spotlightHTML = `<div style="position:fixed;inset:0;background:rgba(0,0,0,.65);pointer-events:all" onclick="OnboardingTour.skip()"></div>`;
      }
    } else {
      spotlightHTML = `<div style="position:fixed;inset:0;background:rgba(0,0,0,.65);pointer-events:all" onclick="OnboardingTour.next()"></div>`;
    }

    overlay.innerHTML = `
      ${spotlightHTML}
      <div style="position:fixed;${tooltipStyle};background:var(--bg-card,#1e1e2e);border:1px solid rgba(255,255,255,.15);
           border-radius:14px;padding:20px 22px;width:310px;box-shadow:0 24px 64px rgba(0,0,0,.5);z-index:99999;pointer-events:all">
        <!-- Progress dots -->
        <div style="display:flex;gap:5px;margin-bottom:12px">
          ${this.STEPS.map((_,i)=>`<div style="height:3px;flex:1;border-radius:2px;background:${i<=this._step?'#818cf8':'rgba(255,255,255,.15)'}"></div>`).join('')}
        </div>
        <!-- Step counter -->
        <div style="font-size:10px;color:rgba(255,255,255,.5);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">
          Passo ${this._step+1} di ${this.STEPS.length}
        </div>
        <!-- Content -->
        <div style="font-size:17px;font-weight:800;color:#fff;margin-bottom:8px">${step.title}</div>
        <div style="font-size:13px;color:rgba(255,255,255,.75);line-height:1.6;margin-bottom:18px">${step.desc}</div>
        <!-- Buttons -->
        <div style="display:flex;gap:8px;align-items:center">
          <button onclick="OnboardingTour.skip()" 
            style="padding:6px 12px;background:transparent;border:1px solid rgba(255,255,255,.2);border-radius:7px;color:rgba(255,255,255,.5);cursor:pointer;font-size:12px;transition:.15s"
            onmouseover="this.style.borderColor='rgba(255,255,255,.4)'" onmouseout="this.style.borderColor='rgba(255,255,255,.2)'">
            Salta tour
          </button>
          <div style="flex:1"></div>
          ${this._step > 0 ? `<button onclick="OnboardingTour.prev()"
            style="padding:7px 14px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:#fff;cursor:pointer;font-size:13px">
            ← Indietro
          </button>` : ''}
          <button onclick="OnboardingTour.next()"
            style="padding:8px 18px;background:linear-gradient(135deg,#6366f1,#818cf8);border:none;border-radius:8px;color:#fff;cursor:pointer;font-size:13px;font-weight:700">
            ${this._step === this.STEPS.length - 1 ? '✅ Inizia!' : 'Avanti →'}
          </button>
        </div>
      </div>`;
    
    document.body.appendChild(overlay);
  },

  next() { this._step++; if(this._step >= this.STEPS.length) this._finish(); else this._render(); },
  prev() { if(this._step > 0) { this._step--; this._render(); } },
  skip() { this._finish(); },

  _finish() {
    document.getElementById('ingly-tour-overlay')?.remove();
    localStorage.setItem(this._SK, '1');
    if(typeof toast !== 'undefined') toast('🚀 Tour completato! Inizia da Impostazioni per configurare il tuo profilo.','success');
    if(typeof App !== 'undefined') App.navigate('settings');
  },
};
window.OnboardingTour = OnboardingTour;

// Auto-start on first visit
(function(){
  const tryStart = () => {
    if(typeof App === 'undefined' || typeof toast === 'undefined') return setTimeout(tryStart, 800);
    if(OnboardingTour.shouldShow()) setTimeout(()=>OnboardingTour.start(), 2500);
  };
  setTimeout(tryStart, 1000);
})();


// ═══════════════════════════════════════════════════════════════════════
// 2. PWA — manifest embed + service worker registration
// ═══════════════════════════════════════════════════════════════════════
(function installPWA(){
  // Inline manifest as blob URL (no server needed)
  const manifest = {
    name: 'INGLY OS',
    short_name: 'INGLY',
    description: 'Il gestionale completo per artigiani creativi',
    start_url: '.',
    display: 'standalone',
    background_color: '#0f0f1a',
    theme_color: '#6366f1',
    orientation: 'portrait-primary',
    icons: [
      { src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="32" fill="%236366f1"/><text x="96" y="130" text-anchor="middle" font-size="110" font-family="Arial">🎨</text></svg>', sizes: '192x192', type: 'image/svg+xml' },
      { src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="80" fill="%236366f1"/><text x="256" y="340" text-anchor="middle" font-size="300" font-family="Arial">🎨</text></svg>', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
    ],
  };

  // Manifest already in <head> — no need to create another

  // Meta theme-color
  if(!document.querySelector('meta[name=theme-color]')) {
    const meta = document.createElement('meta');
    meta.name    = 'theme-color';
    meta.content = '#6366f1';
    document.head.appendChild(meta);
  }

  // Apple touch icon
  if(!document.querySelector('link[rel=apple-touch-icon]')) {
    const link  = document.createElement('link');
    link.rel    = 'apple-touch-icon';
    link.href   = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" rx="36" fill="%236366f1"/><text x="90" y="122" text-anchor="middle" font-size="100" font-family="Arial">🎨</text></svg>';
    document.head.appendChild(link);
  }

  // Install prompt handler
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    window._pwaInstallPrompt = e;
    // Show install button in nav
    setTimeout(() => {
      const installBtn = document.getElementById('pwa-install-btn');
      if(!installBtn) {
        const btn = document.createElement('button');
        btn.id    = 'pwa-install-btn';
        btn.style.cssText = 'padding:5px 10px;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:10px;font-weight:700;white-space:nowrap';
        btn.innerHTML = '📲 Installa App';
        btn.onclick   = () => { window._pwaInstallPrompt.prompt(); window._pwaInstallPrompt.userChoice.then(()=>btn.remove()); };
        const topbar  = document.getElementById('topbar') || document.querySelector('.topbar');
        if(topbar) topbar.appendChild(btn);
      }
    }, 1000);
  });

  console.log('[PWA] Manifest installed ✅');
})();


// ═══════════════════════════════════════════════════════════════════════
// 3. PROFILO AZIENDA — salva e pre-compila tutti i PDF
// ═══════════════════════════════════════════════════════════════════════
const CompanyProfile = {
  _SK: 'ingly_company_v1',

  get() {
    try { return JSON.parse(localStorage.getItem(this._SK)||'{}'); } catch(e) { return {}; }
  },

  save(data) {
    localStorage.setItem(this._SK, JSON.stringify({...this.get(), ...data}));
    // Trigger refresh of any PDF-related module
    if(typeof toast !== 'undefined') toast('✅ Profilo azienda salvato!','success');
    document.dispatchEvent(new CustomEvent('companyProfileUpdated'));
  },

  _handleLogoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { toast('Logo troppo grande (max 1MB)','warning'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target.result;
      this.save({ logo: b64 });
      const preview = document.getElementById('cp-logo-preview');
      if (preview) preview.innerHTML = `<img src="${b64}" style="width:100%;height:100%;object-fit:contain">`;
      toast('✅ Logo caricato e salvato!', 'success');
      this.renderPanel();
    };
    reader.readAsDataURL(file);
    input.value = '';
  },

  _applyLogoUrl() {
    const url = document.getElementById('cp-logo-url')?.value?.trim();
    if (!url) return;
    this.save({ logo: url });
    toast('✅ Logo URL salvato!', 'success');
    this.renderPanel();
  },

  _removeLogo() {
    if (!confirm('Rimuovere il logo?')) return;
    this.save({ logo: '' });
    toast('Logo rimosso','info');
    this.renderPanel();
  },

  // Render pannello in Settings
  renderPanel() {
    const p   = this.get();
    const el  = document.getElementById('company-profile-panel');
    if(!el) return;

    el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px;padding-top:8px">

      <!-- ► LOGO UPLOAD ◄ -->
      <div style="background:var(--bg-card);border:1.5px solid var(--border2);border-radius:12px;padding:14px 16px">
        <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🖼️ Logo Aziendale</div>
        <div style="display:flex;align-items:center;gap:14px">
          <div id="cp-logo-preview"
            style="width:80px;height:80px;border-radius:12px;border:2px dashed var(--border2);background:var(--bg-card2);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;cursor:pointer"
            onclick="document.getElementById('cp-logo-file').click()"
            title="Clicca per caricare il logo">
            ${p.logo
              ? `<img src="${p.logo}" style="width:100%;height:100%;object-fit:contain">`
              : `<span style="font-size:28px;opacity:.4">🏢</span>`
            }
          </div>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:600;margin-bottom:6px">Logo usato nei preventivi PDF</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              <button type="button" onclick="document.getElementById('cp-logo-file').click()"
                style="padding:5px 12px;background:var(--primary);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">
                📤 Carica immagine
              </button>
              ${p.logo ? `<button type="button" onclick="CompanyProfile._removeLogo()"
                style="padding:5px 12px;background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.25);border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">
                🗑 Rimuovi
              </button>` : ''}
            </div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:5px">PNG, JPG, SVG · Max 1MB · Consigliato 200×200px</div>
            <input type="file" id="cp-logo-file" accept="image/*" style="display:none"
              onchange="CompanyProfile._handleLogoUpload(this)">
          </div>
        </div>
        <!-- URL input alternative -->
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
          <label style="font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">Oppure URL immagine</label>
          <div style="display:flex;gap:6px">
            <input type="url" class="form-control" id="cp-logo-url" placeholder="https://..." value="${p.logo&&p.logo.startsWith('http')?p.logo:''}" style="font-size:11px;flex:1">
            <button type="button" onclick="CompanyProfile._applyLogoUrl()"
              style="padding:5px 12px;background:var(--bg-card2);border:1px solid var(--border2);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted);white-space:nowrap">Usa URL</button>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="grid-column:1/-1">
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">🏢 Nome azienda / Studio</label>
          <input id="cp-name" class="form-control" value="${p.name||''}" placeholder="Es. Studio Creativo di Maria" style="font-size:12px">
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">🪪 P.IVA / Cod. Fiscale</label>
          <input id="cp-piva" class="form-control" value="${p.piva||''}" placeholder="IT12345678901" style="font-size:12px">
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">📱 Telefono / WhatsApp</label>
          <input id="cp-phone" class="form-control" value="${p.phone||''}" placeholder="+39 333 123 4567" style="font-size:12px">
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">📧 Email</label>
          <input id="cp-email" class="form-control" value="${p.email||''}" placeholder="tu@studio.it" style="font-size:12px">
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">🌐 Sito web / Etsy shop</label>
          <input id="cp-web" class="form-control" value="${p.web||''}" placeholder="www.miosito.it" style="font-size:12px">
        </div>
        <div style="grid-column:1/-1">
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">📍 Indirizzo completo</label>
          <input id="cp-address" class="form-control" value="${p.address||''}" placeholder="Via Roma 1, 90100 Palermo (PA)" style="font-size:12px">
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">🏦 IBAN (per fatture)</label>
          <input id="cp-iban" class="form-control" value="${p.iban||''}" placeholder="IT60 X054 2811 1010 0000 0123 456" style="font-size:12px">
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">📋 Regime fiscale</label>
          <select id="cp-regime" class="form-control" style="font-size:12px">
            ${['Forfettario','Ordinario','Semplificato','Minimi'].map(r=>`<option value="${r}" ${(p.regime||'Forfettario')===r?'selected':''}>${r}</option>`).join('')}
          </select>
        </div>
        <div style="grid-column:1/-1">
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:3px">✏️ Condizioni di pagamento standard</label>
          <textarea id="cp-payment" class="form-control" rows="2" style="font-size:12px;resize:none" placeholder="Es. Pagamento entro 30 giorni dalla data fattura. Acconto 50% alla conferma ordine.">${p.paymentTerms||''}</textarea>
        </div>
        <!-- Logo section -->
        <div style="grid-column:1/-1">
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:6px">🖼 Logo aziendale (per PDF preventivi)</label>
          <div style="display:flex;align-items:center;gap:10px">
            ${p.logo ? `<img src="${p.logo}" style="height:40px;max-width:120px;object-fit:contain;border-radius:6px;border:1px solid var(--border)">` : `<div style="width:40px;height:40px;border-radius:6px;border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:18px">🖼</div>`}
            <label style="flex:1;padding:8px 12px;background:var(--bg-card2);border:1.5px dashed var(--border);border-radius:7px;cursor:pointer;font-size:12px;color:var(--text-muted);text-align:center">
              <i class="fas fa-upload"></i> Carica logo
              <input type="file" accept="image/*" style="display:none" onchange="CompanyProfile._onLogoUpload(this)">
            </label>
            ${p.logo ? `<button onclick="CompanyProfile.save({logo:''});CompanyProfile.renderPanel()" style="padding:6px 10px;background:#ef444415;border:1px solid #ef444440;border-radius:6px;cursor:pointer;font-size:11px;color:#ef4444">✕</button>` : ''}
          </div>
        </div>
      </div>
      <button onclick="CompanyProfile._save()" style="padding:10px;background:var(--primary);color:#000;border:none;border-radius:9px;font-weight:800;cursor:pointer;font-size:13px;margin-top:4px">
        💾 Salva profilo azienda
      </button>
      ${p.name ? `<div style="padding:8px 12px;background:var(--bg-card2);border-radius:7px;border-left:3px solid #22c55e;font-size:11px;color:var(--text-muted)">✅ Profilo completo — verrà usato automaticamente in tutti i PDF</div>` : ''}
    </div>`;
  },

  _onLogoUpload(input) {
    const file = input.files[0];
    if(!file) return;
    if(file.size > 300*1024) { if(typeof toast!=='undefined')toast('Logo troppo grande (max 300KB)','warning'); return; }
    const r = new FileReader();
    r.onload = (e) => { this.save({logo: e.target.result}); this.renderPanel(); };
    r.readAsDataURL(file);
  },

  _save() {
    const data = {
      name:         document.getElementById('cp-name')?.value?.trim()||'',
      piva:         document.getElementById('cp-piva')?.value?.trim()||'',
      phone:        document.getElementById('cp-phone')?.value?.trim()||'',
      email:        document.getElementById('cp-email')?.value?.trim()||'',
      web:          document.getElementById('cp-web')?.value?.trim()||'',
      address:      document.getElementById('cp-address')?.value?.trim()||'',
      iban:         document.getElementById('cp-iban')?.value?.trim()||'',
      regime:       document.getElementById('cp-regime')?.value||'Forfettario',
      paymentTerms: document.getElementById('cp-payment')?.value?.trim()||'',
    };
    this.save(data);
    setTimeout(()=>this.renderPanel(), 100);
  },
};
window.CompanyProfile = CompanyProfile;

// Integra CompanyProfile nel generatePDFQuote
document.addEventListener('companyProfileUpdated', () => {
  // Invalidate any cached PDF config
  if(typeof AppStore!=='undefined') AppStore.invalidate('settings');
});


// ═══════════════════════════════════════════════════════════════════════
// 4. API KEY MANAGER — Configura e testa tutte le API
// ═══════════════════════════════════════════════════════════════════════
const ApiKeyManager = {
  _SK: 'ingly_apikeys_v1',

  SERVICES: [
    { id:'claude',  name:'Claude AI (Anthropic)', emoji:'🤖', url:'https://console.anthropic.com/keys',  test:'models', placeholder:'sk-ant-api03-...' },
    { id:'openai',  name:'OpenAI (GPT-4)',         emoji:'🧠', url:'https://platform.openai.com/api-keys', test:'models', placeholder:'sk-...' },
    { id:'etsy',    name:'Etsy API',               emoji:'🛍', url:'https://www.etsy.com/developers/register', test:'shops', placeholder:'...' },
    { id:'google',  name:'Google (Sheets/Places)', emoji:'📊', url:'https://console.cloud.google.com/apis',   test:'',   placeholder:'AIza...' },
  ],

  get(id) {
    try { return JSON.parse(localStorage.getItem(this._SK)||'{}')[id]||''; } catch(e) { return ''; }
  },

  set(id, val) {
    try {
      const all = JSON.parse(localStorage.getItem(this._SK)||'{}');
      all[id] = val;
      localStorage.setItem(this._SK, JSON.stringify(all));
    } catch(e) {}
  },

  renderPanel() {
    const el = document.getElementById('api-key-panel');
    if(!el) return;

    el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;padding-top:8px">
      ${this.SERVICES.map(svc=>{
        const stored = this.get(svc.id);
        const masked = stored ? stored.slice(0,8)+'…'+stored.slice(-4) : '';
        return `
        <div style="background:var(--bg-card2);border-radius:10px;border:1px solid var(--border);padding:12px 14px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:16px">${svc.emoji}</span>
            <div style="flex:1">
              <div style="font-size:12px;font-weight:700">${svc.name}</div>
              ${stored ? `<div style="font-size:10px;color:#22c55e">✅ Configurata · ${masked}</div>` : `<div style="font-size:10px;color:var(--text-dim)">Non configurata</div>`}
            </div>
            <a href="${svc.url}" target="_blank" rel="noopener" style="font-size:10px;color:var(--primary);text-decoration:none">Ottieni →</a>
          </div>
          <div style="display:flex;gap:6px">
            <input type="password" id="ak-${svc.id}" class="form-control" value="${stored}" placeholder="${svc.placeholder}" 
              style="font-size:11px;height:30px;flex:1" autocomplete="off">
            <button onclick="ApiKeyManager._save('${svc.id}')" 
              style="padding:0 12px;background:var(--primary);color:#000;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap">
              Salva
            </button>
            <button id="ak-test-${svc.id}" onclick="ApiKeyManager._test('${svc.id}')"
              style="padding:0 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted);white-space:nowrap">
              Test
            </button>
          </div>
        </div>`;
      }).join('')}
      
      <!-- Status summary -->
      <div style="padding:10px 14px;background:var(--bg-card2);border-radius:8px;font-size:11px;color:var(--text-muted)">
        <strong style="color:var(--text)">Come funziona:</strong> Le API key sono salvate solo nel browser (localStorage). 
        Non vengono mai inviate a nessun server. Per Claude AI, ottieni la chiave su 
        <a href="https://console.anthropic.com/keys" target="_blank" style="color:var(--primary)">console.anthropic.com</a>.
      </div>
    </div>`;
  },

  _save(id) {
    const val = document.getElementById('ak-'+id)?.value?.trim()||'';
    this.set(id, val);
    // Also update the global AIProvider if available
    if(id==='claude' && typeof AIProvider!=='undefined') {
      AIProvider.apiKey = val;
    }
    if(id==='openai' && typeof AIProvider!=='undefined') {
      AIProvider.openaiKey = val;
    }
    // Update Settings storage
    try {
      const settings = JSON.parse(localStorage.getItem('ingly_settings')||'{}');
      if(id==='claude') settings.aiApiKey = val;
      if(id==='openai') settings.openaiKey = val;
      localStorage.setItem('ingly_settings', JSON.stringify(settings));
    } catch(e) {}
    if(typeof toast!=='undefined') toast(`✅ API key ${id} salvata!`,'success');
    setTimeout(()=>this.renderPanel(), 100);
  },

  async _test(id) {
    const key = document.getElementById('ak-'+id)?.value?.trim() || this.get(id);
    if(!key) { if(typeof toast!=='undefined') toast('Inserisci prima la chiave','warning'); return; }
    const btn = document.getElementById('ak-test-'+id);
    if(btn) { btn.textContent='⏳'; btn.disabled=true; }
    
    try {
      let ok = false;
      if(id === 'claude') {
        const r = await fetch('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': key, 'anthropic-version':'2023-06-01' }
        });
        ok = r.ok;
      } else if(id === 'openai') {
        const r = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': 'Bearer '+key }
        });
        ok = r.ok;
      } else {
        ok = key.length > 5; // Basic validation for others
      }
      if(btn) { btn.textContent = ok ? '✅' : '❌'; btn.disabled=false; }
      if(typeof toast!=='undefined') toast(ok ? `✅ ${id} API key funzionante!` : `❌ ${id} API key non valida`,'success');
    } catch(e) {
      if(btn) { btn.textContent='❌'; btn.disabled=false; }
      if(typeof toast!=='undefined') toast(`❌ Errore test: ${e.message}`,'error');
    }
    setTimeout(()=>{ if(btn) btn.textContent='Test'; },3000);
  },
};
window.ApiKeyManager = ApiKeyManager;


// ═══════════════════════════════════════════════════════════════════════
// 5. UNDO STACK — annulla azioni critiche (elimina, archivia, transizione)
// ═══════════════════════════════════════════════════════════════════════
const UndoHistory = {
  _stack: [],
  _MAX: 20,

  push(action) {
    this._stack.push({ ...action, ts: Date.now() });
    if(this._stack.length > this._MAX) this._stack.shift();
  },

  async undo() {
    const last = this._stack.pop();
    if(!last) { if(typeof toast!=='undefined') toast('Nessuna azione da annullare','info'); return; }
    
    try {
      if(last.type === 'deleteOrder') {
        await IDB.put('orders', last.data);
        if(typeof AppStore!=='undefined') AppStore.invalidate('orders');
        if(typeof GestioneOrdini!=='undefined') await GestioneOrdini.render();
        toast('↩ Ordine ripristinato','success');
      } else if(last.type === 'archiveOrder') {
        const o = await IDB.get('orders', last.orderId).catch(()=>null);
        if(o) { o._archived = false; delete o._archivedAt; await IDB.put('orders', o); }
        if(typeof AppStore!=='undefined') AppStore.invalidate('orders');
        if(typeof GestioneOrdini!=='undefined') await GestioneOrdini.render();
        toast('↩ Archiviazione annullata','success');
      } else if(last.type === 'transitionOrder') {
        const o = await IDB.get('orders', last.orderId).catch(()=>null);
        if(o) { o.stage = last.fromState; o.status = last.fromState; await IDB.put('orders', o); }
        if(typeof AppStore!=='undefined') AppStore.invalidate('orders');
        if(typeof GestioneOrdini!=='undefined') await GestioneOrdini.render();
        toast('↩ Stato precedente ripristinato','success');
      }
    } catch(e) { if(typeof toast!=='undefined') toast('Errore undo: '+e.message,'error'); }
  },
};
window.UndoHistory = UndoHistory;

// Intercetta Ctrl+Z
document.addEventListener('keydown', e => {
  if((e.ctrlKey||e.metaKey) && e.key==='z' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    UndoHistory.undo();
  }
}, {capture:false});

// Patch GestioneOrdini._deleteOrder per usare UndoHistory
(function patchUndo(){
  const tryPatch = () => {
    if(typeof GestioneOrdini==='undefined') return setTimeout(tryPatch, 800);
    const _origDel = GestioneOrdini._deleteOrder.bind(GestioneOrdini);
    GestioneOrdini._deleteOrder = async function(id) {
      // Save to undo stack before deleting
      const o = await IDB.get('orders', +id||id).catch(()=>null);
      if(o) UndoHistory.push({ type:'deleteOrder', orderId: id, data: {...o} });
      await _origDel(id);
      if(typeof toast!=='undefined') {
        // Show toast with undo option
        const toastEl = document.querySelector('.toast-latest');
        setTimeout(()=>{
          if(typeof toast!=='undefined') toast('🗑 Eliminato · <u style="cursor:pointer" onclick="UndoHistory.undo()">Annulla (Ctrl+Z)</u>','info');
        }, 100);
      }
    };

    const _origArch = GestioneOrdini._archiveToSales?.bind(GestioneOrdini);
    if(_origArch) {
      GestioneOrdini._archiveToSales = async function(id) {
        const o = await IDB.get('orders', +id||id).catch(()=>null);
        if(o) UndoHistory.push({ type:'archiveOrder', orderId: id, fromState: o.stage||o.status });
        await _origArch(id);
      };
    }
    console.log('[UndoHistory] Patched ✅');
  };
  setTimeout(tryPatch, 1500);
})();


// PDF Company Profile patch → handled by new generatePDFQuote engine



// ═══════════════════════════════════════════════════════════════════════
// 7. SETTINGS — Inject pannelli nel Settings esistente
// ═══════════════════════════════════════════════════════════════════════
(function injectSettingsPanels(){
  const tryInject = () => {
    const view = document.getElementById('view-settings');
    if(!view || view.children.length < 2) return setTimeout(tryInject, 800);

    // Inject company profile and API key panels if not present
    if(!document.getElementById('company-profile-panel')) {
      // Find a good insertion point in settings view
      const settingsContent = view.querySelector('.page-content') || view.querySelector('[class*=content]') || view;
      
      const cpSection = document.createElement('div');
      cpSection.style.cssText = 'padding:0 20px 20px;max-width:800px;margin:0 auto';
      cpSection.innerHTML = `
      <!-- Company Profile -->
      <div style="background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);margin-bottom:14px;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
          <span style="font-size:16px">🏢</span>
          <div style="flex:1"><div style="font-size:13px;font-weight:700">Profilo Azienda</div><div style="font-size:11px;color:var(--text-muted)">Nome, P.IVA, logo, IBAN — pre-compila tutti i PDF</div></div>
          <span style="color:var(--text-muted)">▼</span>
        </div>
        <div id="company-profile-panel" style="padding:12px 16px;display:none"></div>
      </div>

      <!-- API Key Manager -->
      <div style="background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);margin-bottom:14px;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
          <span style="font-size:16px">🔑</span>
          <div style="flex:1"><div style="font-size:13px;font-weight:700">API Key Manager</div><div style="font-size:11px;color:var(--text-muted)">Claude AI, OpenAI, Etsy — configura e testa</div></div>
          <span style="color:var(--text-muted)">▼</span>
        </div>
        <div id="api-key-panel" style="padding:12px 16px;display:none"></div>
      </div>

      <!-- Tour button -->
      <div style="background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);padding:14px 16px;display:flex;align-items:center;gap:12px">
        <span style="font-size:20px">🚀</span>
        <div style="flex:1"><div style="font-size:13px;font-weight:700">Tour guidato</div><div style="font-size:11px;color:var(--text-muted)">Rivedi le 7 aree principali del tool</div></div>
        <button onclick="OnboardingTour.start(true)" style="padding:7px 14px;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">
          ▶ Avvia tour
        </button>
      </div>`;

      // Find insertion point - insert at beginning of settings content
      const firstChild = settingsContent.firstChild;
      if(firstChild) settingsContent.insertBefore(cpSection, firstChild.nextSibling || firstChild);
      else settingsContent.appendChild(cpSection);

      // Render the panels
      setTimeout(()=>{
        CompanyProfile.renderPanel();
        ApiKeyManager.renderPanel();
      }, 200);
    }
    console.log('[Settings panels] Injected ✅');
  };
  
  // Intercept settings navigation to inject panels
  const _origRS = App?.renderSection?.bind(App);
  if(_origRS && !App.__v18SettingsPatch) {
    App.__v18SettingsPatch = true;
    const _origRSfn = App.renderSection;
    App.renderSection = function(s) {
      _origRSfn.call(this, s);
      if(s === 'settings') setTimeout(()=>{
        injectSettingsPanels();
        CompanyProfile.renderPanel();
        ApiKeyManager.renderPanel();
      }, 300);
    };
  }

  setTimeout(tryInject, 3000);
})();

console.log('[INGLY OS v18] Tour + PWA + CompanyProfile + ApiKeyManager + UndoHistory loaded ✅');

