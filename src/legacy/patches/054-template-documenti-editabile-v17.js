
// ════════════════════════════════════════════════════════════════════════
// TEMPLATE DOCUMENTI EDITABILE — v17
// Colori · Font · Logo · Header · Footer · Preview Live · localStorage
// ════════════════════════════════════════════════════════════════════════
const TemplateEditor = {
  _SK: 'ingly_tpl_custom_v1',

  DEFAULTS: {
    professionale: {
      id:'professionale', name:'🏢 Professionale',
      logo:'', slogan:'Artigianato di qualità',
      colors:{ primary:'#1e3a5f', headerBg:'#1e3a5f', headerText:'#ffffff', accent:'#2b6cb0', bg:'#ffffff', text:'#1a202c', border:'#cbd5e0', rowOdd:'#f7faff' },
      font:'Georgia, serif', fontSize:'13px',
      headerText:'Preventivo', footerText:'Grazie per aver scelto i nostri servizi · Preventivo valido 30 giorni',
      showLogo:true, showSlogan:true, showPiva:true,
    },
    amichevole: {
      id:'amichevole', name:'😊 Amichevole',
      logo:'', slogan:'Fatto con amore 🎨',
      colors:{ primary:'#276749', headerBg:'#276749', headerText:'#ffffff', accent:'#38a169', bg:'#f0fff4', text:'#22543d', border:'#c6f6d5', rowOdd:'#f0fff4' },
      font:'Arial, sans-serif', fontSize:'13px',
      headerText:'Preventivo Personalizzato', footerText:'💚 Grazie mille! Siamo felici di lavorare per te · Valido 7 giorni',
      showLogo:true, showSlogan:true, showPiva:false,
    },
    minimal: {
      id:'minimal', name:'◻️ Minimalista',
      logo:'', slogan:'',
      colors:{ primary:'#000000', headerBg:'#ffffff', headerText:'#000000', accent:'#555555', bg:'#ffffff', text:'#111111', border:'#e5e5e5', rowOdd:'#fafafa' },
      font:"'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize:'12px',
      headerText:'Preventivo', footerText:'Preventivo valido 30 giorni dalla data di emissione.',
      showLogo:false, showSlogan:false, showPiva:true,
    },
    premium: {
      id:'premium', name:'✨ Premium',
      logo:'', slogan:'Excellence by Design',
      colors:{ primary:'#d4af37', headerBg:'#0a0a0a', headerText:'#d4af37', accent:'#f0c040', bg:'#0a0a0a', text:'#e8e8e8', border:'#2a2a2a', rowOdd:'#111111' },
      font:"Georgia, 'Palatino Linotype', serif", fontSize:'13px',
      headerText:'PREVENTIVO ESCLUSIVO', footerText:'Servizio Premium · Qualità garantita · Preventivo valido 30 giorni',
      showLogo:true, showSlogan:true, showPiva:true,
    },
  },

  getAll() {
    try {
      const saved = JSON.parse(localStorage.getItem(this._SK)||'{}');
      // Deep merge: saved customizations override defaults
      const result = {};
      Object.keys(this.DEFAULTS).forEach(k=>{
        result[k] = { ...JSON.parse(JSON.stringify(this.DEFAULTS[k])), ...(saved[k]||{}) };
        if(saved[k]?.colors) result[k].colors = { ...this.DEFAULTS[k].colors, ...(saved[k].colors||{}) };
      });
      return result;
    } catch(e) { return JSON.parse(JSON.stringify(this.DEFAULTS)); }
  },

  save(templateId, updates) {
    try {
      const saved = JSON.parse(localStorage.getItem(this._SK)||'{}');
      if(!saved[templateId]) saved[templateId] = {};
      // Deep merge updates
      Object.keys(updates).forEach(k=>{
        if(typeof updates[k]==='object' && updates[k]!==null && !Array.isArray(updates[k])) {
          saved[templateId][k] = { ...(saved[templateId][k]||{}), ...updates[k] };
        } else {
          saved[templateId][k] = updates[k];
        }
      });
      localStorage.setItem(this._SK, JSON.stringify(saved));
    } catch(e) {}
  },

  reset(templateId) {
    try {
      const saved = JSON.parse(localStorage.getItem(this._SK)||'{}');
      delete saved[templateId];
      localStorage.setItem(this._SK, JSON.stringify(saved));
      toast('Template ripristinato ai valori originali','info');
    } catch(e) {}
  },

  // ── RENDER SEZIONE ────────────────────────────────────────────────────
  render() {
    const el = document.getElementById('view-template_docs');
    if(!el) return;
    const activeId = typeof TemplateManager!=='undefined' ? TemplateManager.getActive() : 'amichevole';
    const templates = this.getAll();

    el.innerHTML = `
    <div style="padding:20px 24px;max-width:1300px;margin:0 auto">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid var(--border)">
        <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#d4af37,#f0c040);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">🎨</div>
        <div style="flex:1">
          <h1 style="margin:0 0 3px;font-size:20px;font-weight:900">Template Documenti — Editor</h1>
          <p style="margin:0;font-size:11px;color:var(--text-muted)">Personalizza logo · colori · font · testi · footer · anteprima live istantanea</p>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="generatePDFQuote&&generatePDFQuote()" style="padding:8px 14px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px">📄 Test PDF</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:340px 1fr;gap:16px;align-items:start">
        <!-- ── LEFT: Template selector + editor ── -->
        <div>
          <!-- Template picker -->
          <div style="background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);margin-bottom:12px;overflow:hidden">
            <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px">
              <i class="fas fa-layer-group" style="color:var(--primary)"></i> Scegli Template
              <span style="margin-left:auto;font-size:10px;color:var(--text-muted)">attivo: <span id="tpl-active-label" style="color:var(--primary);font-weight:800">${templates[activeId]?.name||activeId}</span></span>
            </div>
            <div style="padding:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px" id="tpl-selector-grid">
              ${Object.values(templates).map(t=>{
                const isActive = t.id===activeId;
                return `<div onclick="TemplateEditor._selectTpl('${t.id}')"
                  data-tpl="${t.id}"
                  style="border:2px solid ${isActive?'#f59e0b':'var(--border)'};border-radius:9px;overflow:hidden;cursor:pointer;transition:.15s;background:${isActive?'#f59e0b0f':'var(--bg-card)'}"
                  onmouseover="this.style.borderColor='#f59e0b'" onmouseout="if(this.dataset.tpl!==TemplateEditor._current)this.style.borderColor='var(--border)'">
                  <div style="height:32px;background:${t.colors.headerBg};display:flex;align-items:center;padding:0 8px;gap:6px">
                    <span style="font-size:9px;font-weight:800;color:${t.colors.headerText};font-family:${t.font}">${t.name}</span>
                    ${isActive?'<span style="margin-left:auto;font-size:7px;background:#f59e0b;color:#000;padding:1px 4px;border-radius:3px;font-weight:800">✓</span>':''}
                  </div>
                  <div style="padding:4px 6px;background:${t.colors.bg}">
                    <div style="height:5px;background:${t.colors.primary};border-radius:2px;margin-bottom:2px;width:60%"></div>
                    <div style="height:4px;background:${t.colors.border};border-radius:2px;margin-bottom:2px"></div>
                    <div style="height:4px;background:${t.colors.border};border-radius:2px;width:80%"></div>
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>

          <!-- Editor pannello -->
          <div style="background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);overflow:hidden" id="tpl-editor-panel">
            <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:space-between">
              <span><i class="fas fa-sliders-h" style="color:var(--primary)"></i> Modifica: <span id="tpl-editor-title">${templates[activeId]?.name}</span></span>
              <button onclick="TemplateEditor.reset(TemplateEditor._current);TemplateEditor.render()" style="font-size:9px;color:#f87171;background:none;border:none;cursor:pointer;font-weight:700">↺ Reset</button>
            </div>
            <div id="tpl-editor-fields" style="padding:12px 14px;display:flex;flex-direction:column;gap:10px;max-height:520px;overflow-y:auto">
              ${this._buildEditorFields(templates[activeId]||templates.amichevole)}
            </div>
          </div>
        </div>

        <!-- ── RIGHT: Live preview ── -->
        <div>
          <div style="background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);overflow:hidden">
            <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:700;display:flex;align-items:center;gap:8px">
              <i class="fas fa-eye" style="color:var(--primary)"></i> Anteprima Live
              <span style="margin-left:auto;font-size:10px;color:var(--text-muted)">aggiornamento in tempo reale</span>
            </div>
            <div id="tpl-live-preview" style="padding:16px;background:#f8fafc;overflow:auto;max-height:660px"></div>
          </div>
          <!-- How it works -->
          <div style="background:var(--bg-card2);border-radius:10px;padding:12px 16px;border:1px solid var(--border);margin-top:12px;font-size:11px;color:var(--text-muted)">
            <strong style="color:var(--text)">Come funziona:</strong> Seleziona template → modifica campi → l'anteprima si aggiorna in tempo reale → clicca <strong>Applica come default</strong> per usarlo nei prossimi PDF.
          </div>
        </div>
      </div>
    </div>`;

    this._current = activeId;
    this._updatePreview(templates[activeId]);
  },

  _current: 'amichevole',

  _buildEditorFields(t) {
    const id = t.id;
    const colorFields = [
      ['primary',    'Colore primario (header, titoli)'],
      ['headerBg',   'Sfondo header'],
      ['headerText', 'Testo header'],
      ['accent',     'Colore accento'],
      ['bg',         'Sfondo documento'],
      ['text',       'Colore testo'],
    ];
    return `
      <!-- Logo -->
      <div>
        <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">🖼 URL Logo</label>
        <input class="form-control" id="tpl-logo-${id}" value="${t.logo||''}" placeholder="https://... (vuoto = nome azienda)"
          oninput="TemplateEditor._onField('${id}','logo',this.value)" style="font-size:11px;height:30px">
      </div>
      <!-- Slogan -->
      <div>
        <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">✏️ Slogan / Sottotitolo</label>
        <input class="form-control" id="tpl-slogan-${id}" value="${t.slogan||''}" placeholder="Es. Artigianato Made in Sicily"
          oninput="TemplateEditor._onField('${id}','slogan',this.value)" style="font-size:11px;height:30px">
      </div>
      <!-- Header text -->
      <div>
        <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">📌 Titolo header documento</label>
        <input class="form-control" id="tpl-hdr-${id}" value="${t.headerText||'Preventivo'}" placeholder="Preventivo"
          oninput="TemplateEditor._onField('${id}','headerText',this.value)" style="font-size:11px;height:30px">
      </div>
      <!-- Colors -->
      <div>
        <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">🎨 Colori</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          ${colorFields.map(([key,label])=>`
          <div style="display:flex;align-items:center;gap:6px;background:var(--bg-card);padding:5px 8px;border-radius:6px;border:1px solid var(--border)">
            <input type="color" value="${t.colors[key]||'#000000'}" title="${label}"
              oninput="TemplateEditor._onColor('${id}','${key}',this.value)"
              style="width:26px;height:26px;border:none;background:none;cursor:pointer;border-radius:4px;padding:0">
            <div style="flex:1;min-width:0">
              <div style="font-size:9px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label.split(' ')[0]}</div>
              <div style="font-size:9px;color:var(--text-dim)" id="tpl-col-val-${id}-${key}">${t.colors[key]||'#000'}</div>
            </div>
          </div>`).join('')}
        </div>
      </div>
      <!-- Font -->
      <div>
        <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">🔤 Font</label>
        <select class="form-control" id="tpl-font-${id}" style="font-size:11px;height:30px"
          onchange="TemplateEditor._onField('${id}','font',this.value)">
          ${[
            ["Georgia, serif","Georgia (Serif elegante)"],
            ["'Helvetica Neue', Arial, sans-serif","Helvetica (Moderno)"],
            ["Arial, sans-serif","Arial (Classico)"],
            ["'Times New Roman', serif","Times New Roman"],
            ["'Playfair Display', Georgia, serif","Playfair Display (Luxury)"],
            ["system-ui, sans-serif","System UI (Pulito)"],
          ].map(([v,l])=>`<option value="${v}" ${t.font===v?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
      <!-- Footer -->
      <div>
        <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">📝 Testo Footer</label>
        <textarea class="form-control" id="tpl-footer-${id}" rows="2"
          style="font-size:11px;resize:none"
          oninput="TemplateEditor._onField('${id}','footerText',this.value)">${t.footerText||''}</textarea>
      </div>
      <!-- Options -->
      <div style="display:flex;flex-direction:column;gap:5px">
        <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">Opzioni visualizzazione</label>
        ${[
          ['showLogo','Mostra logo/nome azienda'],
          ['showSlogan','Mostra slogan'],
          ['showPiva','Mostra P.IVA'],
        ].map(([k,l])=>`
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:11px">
          <input type="checkbox" ${t[k]?'checked':''} style="accent-color:var(--primary);width:14px;height:14px"
            onchange="TemplateEditor._onField('${id}','${k}',this.checked)">
          ${l}
        </label>`).join('')}
      </div>
      <!-- Apply button -->
      <button onclick="TemplateEditor._applyAsDefault('${id}')"
        style="width:100%;padding:9px;background:linear-gradient(135deg,var(--primary),#a855f7);color:#000;border:none;border-radius:9px;font-weight:800;cursor:pointer;font-size:12px;margin-top:4px">
        ⚡ Applica come Default per PDF
      </button>`;
  },

  _selectTpl(id) {
    this._current = id;
    const templates = this.getAll();
    // Update selector UI
    document.querySelectorAll('[data-tpl]').forEach(el=>{
      const isThis = el.dataset.tpl === id;
      el.style.borderColor = isThis ? '#f59e0b' : 'var(--border)';
      el.style.background  = isThis ? '#f59e0b0f' : 'var(--bg-card)';
    });
    // Update editor title
    const titleEl = document.getElementById('tpl-editor-title');
    if(titleEl) titleEl.textContent = templates[id]?.name || id;
    const activeLabel = document.getElementById('tpl-active-label');
    if(activeLabel) activeLabel.textContent = templates[id]?.name || id;
    // Rebuild editor fields
    const fields = document.getElementById('tpl-editor-fields');
    if(fields) fields.innerHTML = this._buildEditorFields(templates[id]);
    // Update preview
    this._updatePreview(templates[id]);
  },

  _onField(templateId, field, value) {
    this.save(templateId, { [field]: value });
    const templates = this.getAll();
    this._updatePreview(templates[templateId]);
  },

  _onColor(templateId, colorKey, value) {
    this.save(templateId, { colors: { [colorKey]: value } });
    // Update hex label
    const label = document.getElementById('tpl-col-val-'+templateId+'-'+colorKey);
    if(label) label.textContent = value;
    const templates = this.getAll();
    this._updatePreview(templates[templateId]);
  },

  _applyAsDefault(id) {
    if(typeof TemplateManager !== 'undefined') TemplateManager.setActive(id);
    else localStorage.setItem('ingly_quote_template_v1', id);
    // Update all selector cards
    document.querySelectorAll('[data-tpl]').forEach(el=>{
      const isThis = el.dataset.tpl === id;
      const hdr = el.querySelector('div');
      if(hdr) {
        let badge = hdr.querySelector('.tpl-default-badge');
        if(isThis && !badge) {
          badge = document.createElement('span');
          badge.className = 'tpl-default-badge';
          badge.style.cssText = 'margin-left:auto;font-size:7px;background:#f59e0b;color:#000;padding:1px 4px;border-radius:3px;font-weight:800';
          badge.textContent = '✓';
          hdr.appendChild(badge);
        } else if(!isThis && badge) badge.remove();
      }
    });
    const label = document.getElementById('tpl-active-label');
    const templates = this.getAll();
    if(label) label.textContent = templates[id]?.name || id;
    toast('⚡ Template "'+( templates[id]?.name||id)+'" impostato come default!', 'success');
  },

  // ── LIVE PREVIEW ─────────────────────────────────────────────────────
  _updatePreview(t) {
    const el = document.getElementById('tpl-live-preview');
    if(!el || !t) return;
    const cfg = (typeof IDB !== 'undefined') ? {} : {};  // will load async
    const company = 'Ingly Design';
    const T = t.colors;
    const borderStyle = t.id==='minimal' ? `border-bottom:2px solid ${T.text}` : '';

    el.innerHTML = `
    <div style="max-width:640px;margin:0 auto;background:${T.bg};border:1px solid ${T.border};border-radius:8px;overflow:hidden;font-family:${t.font};box-shadow:0 4px 20px rgba(0,0,0,.1)">
      <!-- Header -->
      <div style="background:${T.headerBg};padding:20px 28px;${borderStyle}">
        ${t.id==='minimal' ? `
        <div style="display:flex;justify-content:space-between;align-items:center">
          ${t.showLogo?`<div style="font-size:18px;font-weight:900;color:${T.headerText};font-family:${t.font}">${company}</div>`:''}
          ${t.slogan&&t.showSlogan?`<div style="font-size:10px;color:${T.headerText};opacity:.7">${t.slogan}</div>`:''}
        </div>` : t.id==='premium' ? `
        <div style="text-align:center">
          <div style="font-size:9px;letter-spacing:4px;color:${T.primary};text-transform:uppercase;margin-bottom:6px">— ${t.headerText||'Preventivo'} —</div>
          ${t.showLogo?`<div style="font-size:22px;font-weight:900;color:${T.primary};letter-spacing:2px;font-family:${t.font}">${company.toUpperCase()}</div>`:''}
          ${t.slogan&&t.showSlogan?`<div style="font-size:10px;color:${T.primary};opacity:.7;letter-spacing:2px;margin-top:5px">${t.slogan}</div>`:''}
          <div style="width:40px;height:1px;background:${T.primary};margin:12px auto 0"></div>
        </div>` : `
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            ${t.showLogo?`<div style="font-size:20px;font-weight:900;color:${T.headerText};font-family:${t.font}">${company}</div>`:''}
            ${t.slogan&&t.showSlogan?`<div style="font-size:9px;color:${T.headerText};opacity:.7;margin-top:3px;letter-spacing:.5px">${t.slogan}</div>`:''}
          </div>
          <div style="background:rgba(255,255,255,.12);border-radius:8px;padding:8px 14px;text-align:right">
            <div style="font-size:9px;color:${T.headerText};opacity:.7;text-transform:uppercase">${t.headerText||'Preventivo'}</div>
            <div style="font-size:16px;font-weight:800;color:${T.headerText}">PRV-000001</div>
          </div>
        </div>`}
      </div>
      <!-- Body -->
      <div style="padding:16px 22px;background:${T.bg}">
        <!-- Client -->
        <div style="background:${T.rowOdd};border:1px solid ${T.border};border-radius:6px;padding:10px 14px;margin-bottom:12px">
          <div style="font-size:8px;font-weight:700;color:${T.text};opacity:.5;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Destinatario</div>
          <div style="font-size:14px;font-weight:800;color:${T.text};font-family:${t.font}">Mario Rossi — Matrimonio 2026</div>
        </div>
        <!-- Table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:12px">
          <thead><tr style="background:${T.primary}">
            <th style="padding:7px 11px;text-align:left;font-size:9px;color:${T.headerText};font-family:${t.font}">Descrizione</th>
            <th style="padding:7px 8px;text-align:center;font-size:9px;color:${T.headerText}">Qtà</th>
            <th style="padding:7px 11px;text-align:right;font-size:9px;color:${T.headerText}">Totale</th>
          </tr></thead>
          <tbody>
            ${[['Segnaposto personalizzati','50','€200'],['Tableau acrilico','1','€350'],['Portachiavi coppia','30','€132']].map((row,i)=>`
            <tr style="background:${i%2===0?T.rowOdd:T.bg};border-bottom:1px solid ${T.border}">
              <td style="padding:8px 11px;font-size:11px;color:${T.text};font-family:${t.font}">${row[0]}</td>
              <td style="padding:8px 8px;text-align:center;font-size:11px;color:${T.text};opacity:.7">${row[1]}</td>
              <td style="padding:8px 11px;text-align:right;font-size:12px;font-weight:700;color:${T.text}">${row[2]}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <!-- Total -->
        <div style="max-width:180px;margin-left:auto;background:${T.rowOdd};border:1px solid ${T.border};border-radius:6px;padding:10px 13px">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:${T.text};opacity:.6;margin-bottom:3px;padding-bottom:5px;border-bottom:1px solid ${T.border}">
            <span>Imponibile</span><span>€ 682</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:900;color:${T.primary};font-family:${t.font}">
            <span>TOTALE</span><span>€ 832</span>
          </div>
        </div>
        <!-- Footer -->
        <div style="margin-top:16px;padding-top:12px;border-top:1px solid ${T.border};font-size:9px;color:${T.text};opacity:.5;text-align:center;font-family:${t.font}">
          ${t.footerText||'Preventivo valido 30 giorni'}
        </div>

      <!-- ► Seasonal Intelligence ◄ -->
      <div style="background:var(--bg-card2);border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:14px">
        <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:700;display:flex;align-items:center;gap:8px">
          <span>🌿 Calendario Stagionale — Opportunità ${new Date().getFullYear()}</span>
          <span style="margin-left:auto;font-size:10px;color:var(--text-muted)">basato sui tuoi dati storici</span>
        </div>
        <div style="padding:12px 14px">
          ${(() => {
            const now2 = new Date();
            const currentMonth = now2.getMonth();
            const SEASONAL = [
              {m:0, icon:'🎁', name:'Gennaio', opp:'Liquidazione stock · Capodanno · San Valentino prep'},
              {m:1, icon:'💝', name:'Febbraio', opp:'San Valentino — PICCO: gioielli, regali personalizzati'},
              {m:2, icon:'🌸', name:'Marzo', opp:'Festa della Donna · Primavera · Pasqua prep'},
              {m:3, icon:'🐣', name:'Aprile', opp:'Pasqua · Matrimoni inizio stagione · Prima Comunione'},
              {m:4, icon:'💐', name:'Maggio', opp:'Festa della Mamma — PICCO · Lauree · Matrimoni'},
              {m:5, icon:'🎓', name:'Giugno', opp:'Lauree PICCO · Matrimoni PICCO · Estate prep'},
              {m:6, icon:'☀️', name:'Luglio', opp:'Estate · Souvenir · Vacanze · Fiere estive'},
              {m:7, icon:'🏖️', name:'Agosto', opp:'Rallentamento · Prepara stock Natale'},
              {m:8, icon:'🍂', name:'Settembre', opp:'Back to school · Fiere autunnali · Halloween prep'},
              {m:9, icon:'🎃', name:'Ottobre', opp:'Halloween · Preparazione Natale · Black Friday prep'},
              {m:10, icon:'🛍️', name:'Novembre', opp:'Black Friday PICCO · Cyber Monday · Natale prep rush'},
              {m:11, icon:'🎄', name:'Dicembre', opp:'Natale MEGA PICCO · Capodanno prep · Regali aziendali'},
            ];
            const monthSalesMap = {};
            const _s = (typeof Sales !== 'undefined' && Sales._all) || [];
            _s.forEach(s => {
              if(s.date) {
                const m = new Date(s.date).getMonth();
                monthSalesMap[m] = (monthSalesMap[m]||0) + (+(s.amount||0));
              }
            });
            const maxSales = Math.max(1,...Object.values(monthSalesMap));
            
            return SEASONAL.map((s, i) => {
              const isCurrent = i === currentMonth;
              const next2 = i === (currentMonth+1)%12 || i === (currentMonth+2)%12;
              const revenue = monthSalesMap[s.m] || 0;
              const barWidth = Math.round(revenue/maxSales*100);
              const highlight = isCurrent ? 'var(--primary)' : next2 ? '#f59e0b' : 'var(--bg-card)';
              const borderStyle = isCurrent ? '2px solid var(--primary)' : next2 ? '1.5px solid #f59e0b40' : '1px solid var(--border)';
              return `<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:${highlight}${isCurrent?'15':'08'};border-radius:8px;border:${borderStyle};margin-bottom:5px">
                <div style="font-size:18px;flex-shrink:0">${s.icon}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12px;font-weight:${isCurrent?800:600};color:${isCurrent?'var(--text)':'var(--text-muted)'}">${s.name}${isCurrent?' 📍 ADESSO':next2?' ⏰ In arrivo':''}</div>
                  <div style="font-size:10px;color:var(--text-dim);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.opp}</div>
                </div>
                ${revenue>0?`<div style="text-align:right;flex-shrink:0">
                  <div style="font-size:12px;font-weight:800;color:#34d399">€${Math.round(revenue)}</div>
                  <div style="width:50px;height:3px;background:var(--bg-card);border-radius:2px;margin-top:3px;overflow:hidden"><div style="width:${barWidth}%;height:100%;background:#34d399;border-radius:2px"></div></div>
                </div>`:revenue===0&&_s.length?`<div style="font-size:10px;color:var(--text-dim)">no dati</div>`:''}
              </div>`;
            }).join('');
          })()}
        </div>
      </div>
      </div>
    </div>`;
  },
};
window.TemplateEditor = TemplateEditor;

