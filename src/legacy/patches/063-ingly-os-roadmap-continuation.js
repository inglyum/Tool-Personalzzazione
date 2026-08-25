
// ════════════════════════════════════════════════════════════════════════
// INGLY OS — ROADMAP CONTINUATION
// 1. Export CSV Commercialista  2. AI Listing da Foto
// 3. WA Notifiche Automatiche   4. Preventivo Multi-Lingua
// 5. Gestione Fornitori v2      6. Statistiche Etsy Avanzate
// ════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 1. EXPORT CSV COMMERCIALISTA — export contabile professionale
// ═══════════════════════════════════════════════════════════════════════
const CommercialExport = {

  async exportAll(year) {
    year = year || new Date().getFullYear();
    const [sales, orders, clients] = await Promise.all([
      IDB.getAll('sales').catch(()=>[]),
      IDB.getAll('orders').catch(()=>[]),
      IDB.getAll('clients').catch(()=>[]),
    ]);

    const cp = (typeof CompanyProfile !== 'undefined') ? CompanyProfile.get() : {};
    const ySales = sales.filter(s => new Date(s.date||s.createdAt||0).getFullYear() === year);

    // --- Sheet 1: Registro Corrispettivi ---
    const registroRows = [
      ['DATA', 'N. DOCUMENTO', 'CLIENTE', 'DESCRIZIONE', 'IMPONIBILE', 'IVA', 'TOTALE', 'STATO', 'CANALE', 'NOTE']
    ];
    let progressivo = 1;
    ySales.sort((a,b)=>new Date(a.date||0)-new Date(b.date||0)).forEach(s => {
      const imp = +(s.amount||0);
      const iva = s.withIVA ? imp*0.22 : 0;
      registroRows.push([
        s.date || s.paidAt || '',
        `RIC-${year}-${String(progressivo++).padStart(4,'0')}`,
        s.clientName || '',
        s.desc || s.description || '',
        imp.toFixed(2),
        iva.toFixed(2),
        (imp+iva).toFixed(2),
        s.status === 'pagato' ? 'PAGATO' : 'DA PAGARE',
        s.channel || 'Diretto',
        s.notes || '',
      ]);
    });

    // Totali
    const totImp = ySales.reduce((a,s)=>a+(+(s.amount||0)),0);
    const totPaid = ySales.filter(s=>s.status==='pagato').reduce((a,s)=>a+(+(s.amount||0)),0);
    const totPend = totImp - totPaid;
    registroRows.push([]);
    registroRows.push(['', '', '', 'TOTALE ANNO', totImp.toFixed(2), '', '', '', '', '']);
    registroRows.push(['', '', '', 'INCASSATO', totPaid.toFixed(2), '', '', '', '', '']);
    registroRows.push(['', '', '', 'DA INCASSARE', totPend.toFixed(2), '', '', '', '', '']);

    // --- Sheet 2: Clienti ---
    const clientiRows = [['NOME', 'EMAIL', 'TELEFONO', 'INDIRIZZO', 'P.IVA/CF', 'FATTURATO ANNO', 'N. ORDINI', 'CANALE PRINCIPALE']];
    const clientMap = {};
    ySales.forEach(s => {
      const k = s.clientName||'—';
      if(!clientMap[k]) clientMap[k] = { total:0, count:0, channels:{} };
      clientMap[k].total += +(s.amount||0);
      clientMap[k].count++;
      const ch = s.channel||'Diretto';
      clientMap[k].channels[ch] = (clientMap[k].channels[ch]||0)+1;
    });
    clients.forEach(cl => {
      const k = cl.name||cl.company||'';
      const stats = clientMap[k] || { total:0, count:0, channels:{} };
      const topCh = Object.entries(stats.channels).sort((a,b)=>b[1]-a[1])[0]?.[0] || '';
      clientiRows.push([k, cl.email||'', cl.phone||'', cl.address||'', cl.piva||cl.taxCode||'', stats.total.toFixed(2), stats.count, topCh]);
    });

    // --- Genera Excel-like CSV multi-sheet (due file separati) ---
    const csvReg = this._toCsv(registroRows);
    const csvCli = this._toCsv(clientiRows);

    // Genera un unico file HTML con tabelle (più leggibile per il commercialista)
    const html = this._buildCommercialHTML(year, cp, registroRows, clientiRows, totImp, totPaid, totPend);

    this._showExportModal(year, csvReg, csvCli, html, totImp, totPaid, ySales.length);
  },

  _toCsv(rows) {
    return '\uFEFF' + rows.map(r => r.map(v => '"' + String(v||'').replace(/"/g,'""') + '"').join(',')).join('\n');
  },

  _buildCommercialHTML(year, cp, regRows, cliRows, totImp, totPaid, totPend) {
    const fmt = v => '€' + Number(v).toLocaleString('it-IT', {minimumFractionDigits:2});
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Export Contabile ${year} — ${cp.name||'Azienda'}</title>
<style>
  body{font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:20px;background:#f8f9fa;color:#1a1a2e;font-size:12px}
  h1{font-size:20px;font-weight:900;margin-bottom:4px}
  .sub{color:#666;margin-bottom:24px;font-size:12px}
  .kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
  .kpi{background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;padding:16px;border-radius:10px}
  .kpi .n{font-size:22px;font-weight:900}.kpi .l{font-size:10px;opacity:.8;text-transform:uppercase}
  .kpi.green{background:linear-gradient(135deg,#10b981,#059669)}
  .kpi.orange{background:linear-gradient(135deg,#f97316,#ea580c)}
  h2{font-size:14px;font-weight:800;margin:20px 0 10px;border-bottom:2px solid #6366f1;padding-bottom:5px}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.08);margin-bottom:20px}
  th{background:#0f172a;color:#fff;padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase}
  td{padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px}
  tr:nth-child(even)td{background:#f8fafc}
  .paid{color:#10b981;font-weight:700}.unpaid{color:#f97316;font-weight:700}
  .total-row td{font-weight:800;background:#0f172a!important;color:#fff!important}
  @media print{body{background:#fff}@page{margin:10mm;size:A4}}
  .footer{text-align:center;font-size:10px;color:#94a3b8;margin-top:20px}
</style></head><body>
<h1>📊 Export Contabile ${year}</h1>
<div class="sub">${cp.name||''}${cp.piva?' · P.IVA '+cp.piva:''} · Generato il ${new Date().toLocaleDateString('it-IT')}</div>
<div class="kpi-row">
  <div class="kpi"><div class="l">Fatturato ${year}</div><div class="n">${fmt(totImp)}</div></div>
  <div class="kpi green"><div class="l">Incassato</div><div class="n">${fmt(totPaid)}</div></div>
  <div class="kpi orange"><div class="l">Da incassare</div><div class="n">${fmt(totPend)}</div></div>
</div>
<h2>Registro Corrispettivi</h2>
<table><thead><tr>${regRows[0].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>
${regRows.slice(1).filter(r=>r.length>3).map((r,i)=>`<tr${i===regRows.length-5?' class="total-row"':''}>
  ${r.map((v,j)=>`<td${j===7?(v==='PAGATO'?' class="paid"':' class="unpaid"'):''}>${v||''}</td>`).join('')}
</tr>`).join('')}
</tbody></table>
<h2>Clienti</h2>
<table><thead><tr>${cliRows[0].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>
${cliRows.slice(1).map(r=>`<tr>${r.map(v=>`<td>${v||''}</td>`).join('')}</tr>`).join('')}
</tbody></table>
<div class="footer">INGLY OS · Export contabile per uso commercialista · ${cp.name||''}</div>
</body></html>`;
  },

  _showExportModal(year, csvReg, csvCli, html, totImp, totPaid, count) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:#000c;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick = e=>{ if(e.target===modal) modal.remove(); };
    const fmt = v => '€' + Math.round(v).toLocaleString('it-IT');
    modal.innerHTML = `
    <div style="background:var(--bg-card);border-radius:14px;width:min(500px,96vw);border:1px solid var(--border2);box-shadow:0 24px 64px #000d;overflow:hidden">
      <div style="background:linear-gradient(135deg,#0f172a,#1e1b4b);padding:20px 22px">
        <div style="font-size:16px;font-weight:900;color:#fff;margin-bottom:6px">📊 Export Contabile ${year}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px">
          <div style="background:rgba(255,255,255,.1);border-radius:8px;padding:10px;text-align:center">
            <div style="font-size:14px;font-weight:900;color:#fff">${fmt(totImp)}</div>
            <div style="font-size:9px;color:rgba(255,255,255,.6);text-transform:uppercase">Fatturato</div>
          </div>
          <div style="background:rgba(16,185,129,.2);border-radius:8px;padding:10px;text-align:center">
            <div style="font-size:14px;font-weight:900;color:#6ee7b7">${fmt(totPaid)}</div>
            <div style="font-size:9px;color:rgba(255,255,255,.6);text-transform:uppercase">Incassato</div>
          </div>
          <div style="background:rgba(99,102,241,.2);border-radius:8px;padding:10px;text-align:center">
            <div style="font-size:14px;font-weight:900;color:#a5b4fc">${count}</div>
            <div style="font-size:9px;color:rgba(255,255,255,.6);text-transform:uppercase">Vendite</div>
          </div>
        </div>
      </div>
      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:8px">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Scegli il formato per il tuo commercialista:</div>
        <button onclick="CommercialExport._dl('ingly_contabile_${year}.html', '${btoa(unescape(encodeURIComponent(html))).slice(0,10)}...', 'html_full')"
          onclick2="CommercialExport._dlHTML()"
          style="padding:11px 14px;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:700;text-align:left;display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">📄</span>
          <div>
            <div style="font-weight:800">Report HTML completo</div>
            <div style="font-size:10px;opacity:.8">Apribile nel browser, stampabile, leggibile da tutti</div>
          </div>
        </button>
        <button onclick="CommercialExport._dlCSV('registro', \`${csvReg.replace(/`/g,'\\`')}\`)"
          style="padding:11px 14px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);border-radius:9px;cursor:pointer;font-size:13px;font-weight:700;text-align:left;display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">📋</span>
          <div>
            <div style="font-weight:800">CSV Registro Corrispettivi</div>
            <div style="font-size:10px;color:var(--text-muted)">Per Excel/Sheets · da inviare al commercialista</div>
          </div>
        </button>
        <button onclick="CommercialExport._dlCSV('clienti', \`${csvCli.replace(/`/g,'\\`')}\`)"
          style="padding:11px 14px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text);border-radius:9px;cursor:pointer;font-size:13px;font-weight:700;text-align:left;display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">👥</span>
          <div>
            <div style="font-weight:800">CSV Anagrafica Clienti</div>
            <div style="font-size:10px;color:var(--text-muted)">Tutti i clienti con fatturato anno</div>
          </div>
        </button>
        <button onclick="this.closest('[style*=fixed]').remove()"
          style="padding:9px;background:none;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;color:var(--text-muted);margin-top:4px">
          Chiudi
        </button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    // Store for download
    window._ceExportData = { html, csvReg, csvCli, year };
  },

  _dlCSV(type, csv) {
    const data = window._ceExportData;
    if(!data) return;
    const content = type === 'registro' ? data.csvReg : data.csvCli;
    const blob = new Blob([content], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ingly_${type}_${data.year}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    if(typeof toast !== 'undefined') toast('📥 CSV scaricato!','success');
  },

  _dlHTML() {
    const data = window._ceExportData;
    if(!data) return;
    const blob = new Blob([data.html], {type:'text/html;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ingly_contabile_${data.year}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
    if(typeof toast !== 'undefined') toast('📄 Report HTML scaricato!','success');
  },
};
window.CommercialExport = CommercialExport;


// ═══════════════════════════════════════════════════════════════════════
// 2. AI LISTING DA FOTO — Vision API per generare listing Etsy
// ═══════════════════════════════════════════════════════════════════════
const ListingFromPhoto = {

  async open() {
    const aiKey = (typeof ApiKeyManager !== 'undefined') ? ApiKeyManager.get('claude') : '';
    if(!aiKey) {
      if(typeof toast !== 'undefined') toast('⚠️ Configura la API key Claude in Impostazioni → API Key Manager','warning');
      if(typeof App !== 'undefined') App.navigate('settings');
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'listing-photo-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:#000c;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick = e=>{ if(e.target===modal) modal.remove(); };
    modal.innerHTML = `
    <div style="background:var(--bg-card);border-radius:14px;width:min(640px,96vw);max-height:90vh;overflow-y:auto;border:1px solid var(--border2);box-shadow:0 24px 64px #000d">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;position:sticky;top:0;background:var(--bg-card);z-index:5">
        <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#6366f1);display:flex;align-items:center;justify-content:center;font-size:16px">🤖</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:800">AI Listing da Foto</div>
          <div style="font-size:10px;color:var(--text-muted)">Carica una foto → AI genera titolo, descrizione, 13 tag e prezzo suggerito</div>
        </div>
        <button onclick="document.getElementById('listing-photo-modal')?.remove()" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-muted)">✕</button>
      </div>

      <div style="padding:16px 18px;display:flex;flex-direction:column;gap:14px">
        <!-- Upload area -->
        <label id="lfp-upload-label" style="display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px dashed var(--border);border-radius:12px;padding:24px;cursor:pointer;transition:.2s;min-height:160px;background:var(--bg-card2)"
          onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
          <div id="lfp-preview-area" style="width:100%;display:flex;flex-direction:column;align-items:center;gap:8px">
            <span style="font-size:40px">📷</span>
            <div style="font-size:13px;font-weight:700;color:var(--text)">Trascina foto o clicca per scegliere</div>
            <div style="font-size:11px;color:var(--text-muted)">JPG, PNG, WEBP — max 4MB</div>
          </div>
          <input type="file" accept="image/*" style="display:none" id="lfp-file-input" onchange="ListingFromPhoto._onFileSelect(this)">
        </label>

        <!-- Options -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div>
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">🌍 Lingua listing</label>
            <select id="lfp-lang" class="form-control" style="font-size:12px">
              <option value="it">🇮🇹 Italiano</option>
              <option value="en">🇬🇧 English (Etsy globale)</option>
              <option value="both">🌐 Entrambe le lingue</option>
            </select>
          </div>
          <div>
            <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">🏷 Categoria prodotto</label>
            <select id="lfp-category" class="form-control" style="font-size:12px">
              <option value="auto">Auto-rileva dalla foto</option>
              <option value="laser_wood">Incisione laser legno</option>
              <option value="laser_acrylic">Incisione laser acrilico</option>
              <option value="personalized_gift">Regalo personalizzato</option>
              <option value="wedding">Matrimoni & Cerimonie</option>
              <option value="home_decor">Home Decor</option>
              <option value="jewelry">Gioielli & Accessori</option>
            </select>
          </div>
        </div>

        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px">💬 Note aggiuntive per l'AI (opzionale)</label>
          <input id="lfp-notes" class="form-control" placeholder="Es. è personalizzabile, misura 20x15cm, legno di betulla..." style="font-size:12px">
        </div>

        <button id="lfp-generate-btn" onclick="ListingFromPhoto._generate()" disabled
          style="padding:12px;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800;opacity:.5;transition:.2s">
          🤖 Genera Listing con AI
        </button>

        <!-- Results -->
        <div id="lfp-results" style="display:none"></div>
      </div>
    </div>`;
    document.body.appendChild(modal);

    // Drag & drop
    const uploadLabel = document.getElementById('lfp-upload-label');
    uploadLabel?.addEventListener('dragover', e=>{ e.preventDefault(); uploadLabel.style.borderColor='var(--primary)'; });
    uploadLabel?.addEventListener('dragleave', ()=>{ uploadLabel.style.borderColor='var(--border)'; });
    uploadLabel?.addEventListener('drop', e=>{ e.preventDefault(); const f=e.dataTransfer?.files[0]; if(f) ListingFromPhoto._loadFile(f); });
  },

  _onFileSelect(input) {
    const file = input.files[0];
    if(file) this._loadFile(file);
  },

  _loadFile(file) {
    if(file.size > 4*1024*1024) { if(typeof toast!=='undefined') toast('Immagine troppo grande (max 4MB)','warning'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      this._imageData = e.target.result;
      const mediaType = file.type || 'image/jpeg';
      this._mediaType = mediaType;
      // Show preview
      const previewArea = document.getElementById('lfp-preview-area');
      if(previewArea) {
        previewArea.innerHTML = `
          <img src="${e.target.result}" style="max-height:200px;max-width:100%;border-radius:10px;object-fit:contain">
          <div style="font-size:11px;color:#22c55e;font-weight:700">✅ ${file.name} (${(file.size/1024).toFixed(0)}KB)</div>`;
      }
      const btn = document.getElementById('lfp-generate-btn');
      if(btn) { btn.disabled=false; btn.style.opacity='1'; }
    };
    reader.readAsDataURL(file);
  },

  async _generate() {
    if(!this._imageData) return;
    const btn = document.getElementById('lfp-generate-btn');
    const resultsEl = document.getElementById('lfp-results');
    const lang = document.getElementById('lfp-lang')?.value || 'it';
    const category = document.getElementById('lfp-category')?.value || 'auto';
    const notes = document.getElementById('lfp-notes')?.value || '';
    const aiKey = (typeof ApiKeyManager !== 'undefined') ? ApiKeyManager.get('claude') : '';

    if(btn) { btn.disabled=true; btn.textContent='⏳ Analisi in corso...'; }
    if(resultsEl) resultsEl.style.display='none';

    const catContext = {
      'laser_wood':'Il prodotto è inciso con laser su legno.',
      'laser_acrylic':'Il prodotto è inciso con laser su acrilico/plexiglass.',
      'personalized_gift':'Il prodotto è un regalo personalizzabile.',
      'wedding':'Il prodotto è per matrimoni o cerimonie.',
      'home_decor':'Il prodotto è decorazione per la casa.',
      'jewelry':'Il prodotto è un gioiello o accessorio.',
      'auto':'',
    }[category] || '';

    const langInstr = lang === 'en'
      ? 'Generate ONLY in English.'
      : lang === 'both'
      ? 'Generate content in BOTH Italian and English, clearly labeled.'
      : 'Generate ONLY in Italian.';

    const prompt = `You are an Etsy SEO expert specializing in laser engraving and artisan products.
Analyze this product photo and generate a complete Etsy listing.

${catContext} ${notes ? 'Additional info: '+notes : ''}
${langInstr}

Respond ONLY with valid JSON (no markdown, no preamble):
{
  "title": "Etsy title max 140 chars, keyword-rich, starting with main keyword",
  "description": "Full product description 150-200 words, benefits-first, includes size/material/customization info",
  "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10","tag11","tag12","tag13"],
  "price_suggestion": "suggested price in EUR based on market analysis (number only)",
  "materials": "comma-separated list of materials detected",
  "category_suggestion": "most appropriate Etsy category",
  "seo_score": "score 1-10 of this listing's SEO potential"
}`;

    try {
      const base64 = this._imageData.split(',')[1];
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': aiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: [
              { type:'image', source:{ type:'base64', media_type: this._mediaType||'image/jpeg', data: base64 }},
              { type:'text', text: prompt }
            ]
          }]
        })
      });

      if(!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();
      const text = data.content?.[0]?.text || '';
      const clean = text.replace(/```json|```/g,'').trim();
      const result = JSON.parse(clean);

      this._showResults(result, lang);
    } catch(e) {
      if(typeof toast !== 'undefined') toast('❌ Errore AI: ' + e.message, 'error');
    } finally {
      if(btn) { btn.disabled=false; btn.textContent='🤖 Genera di nuovo'; }
    }
  },

  _showResults(r, lang) {
    const el = document.getElementById('lfp-results');
    if(!el) return;
    el.style.display = 'block';
    const seoColor = r.seo_score >= 8 ? '#22c55e' : r.seo_score >= 6 ? '#f97316' : '#ef4444';

    el.innerHTML = `
    <div style="border-top:1px solid var(--border);padding-top:14px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div style="font-size:13px;font-weight:800;color:var(--text)">✅ Listing generato!</div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:11px;color:var(--text-muted)">SEO Score</span>
          <span style="font-size:14px;font-weight:900;color:${seoColor}">${r.seo_score}/10</span>
        </div>
      </div>

      <!-- Titolo -->
      <div>
        <div style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">📝 TITOLO (${(r.title||'').length}/140 chars)</div>
        <div style="position:relative">
          <textarea id="lfp-title" class="form-control" rows="2" style="font-size:12px;padding-right:36px">${r.title||''}</textarea>
          <button onclick="navigator.clipboard.writeText(document.getElementById('lfp-title').value).then(()=>toast('✅ Copiato!','success'))"
            style="position:absolute;top:6px;right:6px;background:var(--primary);color:#000;border:none;border-radius:5px;padding:2px 7px;cursor:pointer;font-size:10px">📋</button>
        </div>
      </div>

      <!-- Descrizione -->
      <div>
        <div style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">📋 DESCRIZIONE</div>
        <div style="position:relative">
          <textarea id="lfp-desc" class="form-control" rows="5" style="font-size:12px;padding-right:36px">${r.description||''}</textarea>
          <button onclick="navigator.clipboard.writeText(document.getElementById('lfp-desc').value).then(()=>toast('✅ Copiato!','success'))"
            style="position:absolute;top:6px;right:6px;background:var(--primary);color:#000;border:none;border-radius:5px;padding:2px 7px;cursor:pointer;font-size:10px">📋</button>
        </div>
      </div>

      <!-- Tag -->
      <div>
        <div style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">🏷 TAG ETSY (${(r.tags||[]).length}/13)</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px">
          ${(r.tags||[]).map(tag=>`<span style="padding:3px 10px;background:var(--primary-dim);color:var(--primary);border:1px solid var(--primary-border);border-radius:99px;font-size:11px;font-weight:600;cursor:pointer"
            onclick="navigator.clipboard.writeText('${tag}').then(()=>toast('Tag copiato!','info'))"
            title="Clicca per copiare">${tag}</span>`).join('')}
        </div>
        <button onclick="navigator.clipboard.writeText(${JSON.stringify((r.tags||[]).join(', '))}).then(()=>toast('✅ Tutti i tag copiati!','success'))"
          style="padding:5px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-muted)">
          📋 Copia tutti i tag
        </button>
      </div>

      <!-- Prezzo e info -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <div style="padding:10px;background:var(--bg-card2);border-radius:8px;border:1px solid var(--border);text-align:center">
          <div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;margin-bottom:3px">Prezzo suggerito</div>
          <div style="font-size:18px;font-weight:900;color:#22c55e">€${r.price_suggestion||'—'}</div>
        </div>
        <div style="padding:10px;background:var(--bg-card2);border-radius:8px;border:1px solid var(--border);text-align:center">
          <div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;margin-bottom:3px">Materiali</div>
          <div style="font-size:11px;font-weight:600">${r.materials||'—'}</div>
        </div>
        <div style="padding:10px;background:var(--bg-card2);border-radius:8px;border:1px solid var(--border);text-align:center">
          <div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;margin-bottom:3px">Categoria</div>
          <div style="font-size:10px;font-weight:600">${r.category_suggestion||'—'}</div>
        </div>
      </div>

      <!-- Save to catalog button -->
      <button onclick="ListingFromPhoto._saveToCatalog()"
        style="padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700;color:var(--text)">
        📦 Salva nel Catalogo come bozza
      </button>
    </div>`;

    this._lastResult = r;
  },

  async _saveToCatalog() {
    if(!this._lastResult) return;
    const r = this._lastResult;
    const title = document.getElementById('lfp-title')?.value || r.title || '';
    const desc  = document.getElementById('lfp-desc')?.value || r.description || '';
    await IDB.put('catalog', {
      id: Date.now(),
      name: title.substring(0,100),
      description: desc,
      tags: (r.tags||[]).join(', '),
      salePrice: parseFloat(r.price_suggestion)||0,
      materials: r.materials||'',
      category: r.category_suggestion||'',
      status: 'bozza',
      aiGenerated: true,
      createdAt: new Date().toISOString(),
    });
    if(typeof AppStore!=='undefined') AppStore.invalidate('catalog');
    if(typeof toast!=='undefined') toast('📦 Salvato nel Catalogo come bozza!','success');
    document.getElementById('listing-photo-modal')?.remove();
    if(typeof App!=='undefined') App.navigate('catalog');
  },
};
window.ListingFromPhoto = ListingFromPhoto;


// ═══════════════════════════════════════════════════════════════════════
// 3. WA NOTIFICHE AUTOMATICHE — reminder WhatsApp pre-compilati
// ═══════════════════════════════════════════════════════════════════════
const WAAutoNotify = {
  _SK: 'ingly_wa_templates_v1',

  TEMPLATES: {
    order_ready: {
      label: '📦 Ordine pronto',
      text: (o,cp) => `Ciao ${o.clientName}! 👋\n\nIl tuo ordine "${o.name}" è pronto per il ritiro/spedizione! 🎉\n\nPer qualsiasi informazione sono qui.\n\n${cp.name||''}${cp.phone?' · '+cp.phone:''}`,
    },
    payment_reminder: {
      label: '💶 Reminder pagamento',
      text: (s,cp) => `Gentile ${s.clientName},\n\nti ricordiamo il pagamento di €${s.amount||0} per: "${s.desc||'ordine'}".\n\n${cp.iban?'IBAN: '+cp.iban+'\n':''}Grazie mille! 🙏\n\n${cp.name||''}`,
    },
    quote_follow_up: {
      label: '📋 Follow-up preventivo',
      text: (q,cp) => `Ciao ${q.clientName}! 😊\n\nVolevo solo assicurarmi che tu abbia ricevuto il preventivo per "${q.name||'il lavoro discusso'}".\n\nHai domande o vuoi procedere? Sono a tua disposizione!\n\n${cp.name||''}${cp.phone?' · '+cp.phone:''}`,
    },
    order_shipped: {
      label: '🚚 Ordine spedito',
      text: (o,cp) => `Ciao ${o.clientName}! 🚚\n\nIl tuo ordine "${o.name}" è stato spedito oggi!\n\nTe lo farò sapere appena arriva. Qualsiasi problema non esitare a scrivermi.\n\nGrazie per la fiducia! 🙏\n${cp.name||''}`,
    },
    birthday: {
      label: '🎂 Compleanno cliente',
      text: (cl,cp) => `Ciao ${cl.name}! 🎂\n\nAuguri di buon compleanno!\n\nCome piccolo regalo, ho preparato un codice sconto del 10% per te: BDAY${new Date().getFullYear()}\n\nValido per 30 giorni 🎁\n\n${cp.name||''}`,
    },
  },

  async openSender(type, entityId) {
    const cp = (typeof CompanyProfile !== 'undefined') ? CompanyProfile.get() : {};
    let entity = null;

    try {
      if(type === 'order' || type === 'order_ready' || type === 'order_shipped') {
        entity = await IDB.get('orders', +entityId||entityId).catch(()=>null);
      } else if(type === 'payment_reminder') {
        entity = await IDB.get('sales', +entityId||entityId).catch(()=>null);
      } else if(type === 'quote_follow_up') {
        entity = await IDB.get('quotes', +entityId||entityId).catch(()=>null);
      } else if(type === 'birthday') {
        entity = await IDB.get('clients', +entityId||entityId).catch(()=>null);
      }
    } catch(e) {}

    // Get template key
    const tplKey = type === 'order' ? 'order_ready' : type;
    const tpl = this.TEMPLATES[tplKey];
    if(!tpl || !entity) {
      if(typeof toast !== 'undefined') toast('Entità non trovata','error');
      return;
    }

    const text = tpl.text(entity, cp);
    const phone = entity.phone || entity.clientPhone || '';

    const modal = document.createElement('div');
    modal.id = 'wa-sender-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:#000c;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick = e=>{ if(e.target===modal) modal.remove(); };
    modal.innerHTML = `
    <div style="background:var(--bg-card);border-radius:14px;width:min(500px,96vw);border:1px solid var(--border2);box-shadow:0 24px 64px #000d;overflow:hidden">
      <div style="background:linear-gradient(135deg,#064e3b,#065f46);padding:14px 18px;display:flex;align-items:center;gap:10px">
        <span style="font-size:22px">💬</span>
        <div>
          <div style="font-size:14px;font-weight:800;color:#fff">${tpl.label}</div>
          <div style="font-size:11px;color:rgba(255,255,255,.7)">Messaggio WhatsApp pre-compilato</div>
        </div>
        <button onclick="document.getElementById('wa-sender-modal')?.remove()" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:16px;color:rgba(255,255,255,.6)">✕</button>
      </div>
      <div style="padding:16px 18px;display:flex;flex-direction:column;gap:10px">
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:4px">📱 Numero WhatsApp (opzionale)</label>
          <input id="wa-phone" class="form-control" value="${phone}" placeholder="+39 333 1234567 (senza spazi)" style="font-size:12px">
        </div>
        <div>
          <label style="font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;display:block;margin-bottom:4px">💬 Messaggio (editabile)</label>
          <textarea id="wa-text" class="form-control" rows="7" style="font-size:12px;line-height:1.6;resize:vertical">${text}</textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button onclick="WAAutoNotify._send('chat')"
            style="padding:10px;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:700">
            💬 Apri in WA
          </button>
          <button onclick="navigator.clipboard.writeText(document.getElementById('wa-text').value).then(()=>toast('✅ Testo copiato!','success'))"
            style="padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:13px;font-weight:700;color:var(--text)">
            📋 Copia testo
          </button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(modal);
  },

  _send(mode) {
    const phone = (document.getElementById('wa-phone')?.value||'').replace(/[^+\d]/g,'');
    const text  = document.getElementById('wa-text')?.value||'';
    const encoded = encodeURIComponent(text);
    const url = phone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
    document.getElementById('wa-sender-modal')?.remove();
  },

  // Inject WA buttons in GestioneOrdini detail modal
  injectInOrderModal(orderId, modal) {
    if(!modal) return;
    const actionsDiv = modal.querySelector('[style*="border-top:1px solid"]');
    if(!actionsDiv || modal.querySelector('.wa-auto-btn')) return;
    const btnRow = actionsDiv.querySelector('div');
    if(!btnRow) return;

    const waBtn = document.createElement('button');
    waBtn.className = 'wa-auto-btn';
    waBtn.style.cssText = 'padding:9px 11px;background:#25D36615;border:1px solid #25D36640;border-radius:8px;cursor:pointer;font-size:11px;color:#25D366;font-weight:700';
    waBtn.innerHTML = '💬 WA';
    waBtn.onclick = () => {
      // Show WA template chooser
      const picker = document.createElement('div');
      picker.style.cssText = 'position:fixed;inset:0;background:#000c;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
      picker.onclick = e=>{ if(e.target===picker) picker.remove(); };
      picker.innerHTML = `
      <div style="background:var(--bg-card);border-radius:12px;width:min(380px,96vw);border:1px solid var(--border);box-shadow:0 20px 60px #000c;padding:16px">
        <div style="font-size:13px;font-weight:800;margin-bottom:12px">💬 Scegli messaggio WA</div>
        ${['order_ready','order_shipped','payment_reminder'].map(k=>`
        <button onclick="WAAutoNotify.openSender('${k}','${orderId}');this.closest('[style*=fixed]').remove()"
          style="width:100%;padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;text-align:left;margin-bottom:6px">
          ${WAAutoNotify.TEMPLATES[k]?.label||k}
        </button>`).join('')}
        <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;padding:8px;background:none;border:none;cursor:pointer;font-size:11px;color:var(--text-muted)">Annulla</button>
      </div>`;
      document.body.appendChild(picker);
    };
    btnRow.appendChild(waBtn);
  },
};
window.WAAutoNotify = WAAutoNotify;

// Patch GestioneOrdini to inject WA buttons
(function patchWAInOrders(){
  const tryPatch = () => {
    if(typeof GestioneOrdini === 'undefined') return setTimeout(tryPatch, 800);
    if(GestioneOrdini.__waPatch) return;
    GestioneOrdini.__waPatch = true;
    const _orig = GestioneOrdini._openDetail.bind(GestioneOrdini);
    GestioneOrdini._openDetail = async function(id) {
      await _orig(id);
      setTimeout(()=>{
        const modal = document.getElementById('go-detail-modal');
        if(modal) WAAutoNotify.injectInOrderModal(id, modal);
      }, 250);
    };
  };
  setTimeout(tryPatch, 2000);
})();


// ═══════════════════════════════════════════════════════════════════════
// 4. INSTALL — wires nuovi moduli in nav/sezioni
// ═══════════════════════════════════════════════════════════════════════
(function installRoadmapCont(){
  const tryInstall = () => {
    if(typeof App==='undefined') return setTimeout(tryInstall, 800);

    // Aggiungi voci nel nav Finanza
    const addNavAfter = (afterSection, id, label, icon, color) => {
      if(document.querySelector(`[data-section="${id}"]`)) return;
      const after = document.querySelector(`[data-section="${afterSection}"]`);
      if(!after) return;
      const nav = document.createElement('div');
      nav.className='nav-item';
      nav.setAttribute('data-section',id);
      nav.onclick=()=>App.navigate(id);
      nav.innerHTML=`<i class="fas ${icon}" style="color:${color};font-size:10px"></i> ${label}`;
      after.parentNode.insertBefore(nav, after.nextSibling);
    };

    addNavAfter('prima_nota', 'commercial_export', '📊 Export Commercialista', 'fa-file-export', '#6366f1');

    // Aggiungi "AI Listing da Foto" nel nav accanto a Quoter/Catalogo
    addNavAfter('catalog', 'ai_listing_photo', '📷 AI Listing da Foto', 'fa-camera', '#8b5cf6');

    // Wire renderSection
    if(!App.__roadmapContPatch) {
      App.__roadmapContPatch = true;
      const _origRS = App.renderSection?.bind(App);
      if(_origRS) App.renderSection = function(s) {
        if(s==='commercial_export') {
          const y = new Date().getFullYear();
          CommercialExport.exportAll(y);
          return;
        }
        if(s==='ai_listing_photo') {
          ListingFromPhoto.open();
          return;
        }
        _origRS(s);
      };
    }

    // Quick access button in Quoter toolbar for AI Listing
    setTimeout(()=>{
      if(document.getElementById('ai-listing-quick-btn')) return;
      const quoterView = document.getElementById('view-quoter');
      if(!quoterView) return;
      const pageActions = quoterView.querySelector('.page-actions');
      if(!pageActions) return;
      const btn = document.createElement('button');
      btn.id='ai-listing-quick-btn';
      btn.className='btn btn-secondary btn-sm';
      btn.style.cssText='color:#8b5cf6;border-color:#8b5cf660;background:#8b5cf610';
      btn.innerHTML='📷 AI da Foto';
      btn.onclick=()=>ListingFromPhoto.open();
      pageActions.appendChild(btn);
    }, 3500);

    // Inject CommercialExport button in Prima Nota / Vendite
    setTimeout(()=>{
      if(document.getElementById('ce-export-btn')) return;
      const salesView = document.getElementById('view-sales') || document.getElementById('view-prima_nota');
      if(!salesView) return;
      const pageActions = salesView.querySelector('.page-actions') || salesView.querySelector('[style*="gap:5px"]');
      if(!pageActions) return;
      const btn = document.createElement('button');
      btn.id='ce-export-btn';
      btn.className='btn btn-secondary btn-sm';
      btn.innerHTML='📊 Export Commercialista';
      btn.onclick=()=>CommercialExport.exportAll(new Date().getFullYear());
      pageActions.appendChild(btn);
    }, 3500);

    console.log('[RoadmapCont] CommercialExport + ListingFromPhoto + WAAutoNotify installed ✅');
  };
  setTimeout(tryInstall, 2200);
})();

console.log('[INGLY OS] Roadmap continuation loaded ✅');

