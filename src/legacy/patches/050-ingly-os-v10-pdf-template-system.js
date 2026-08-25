
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v10 — PDF & TEMPLATE SYSTEM
// Senior Full Stack Engineer + UI/UX SaaS + PDF Rendering Specialist
// ════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// TEMPLATE DEFINITIONS — 4 professional styles
// ═══════════════════════════════════════════════════════════════════════
const QUOTE_TEMPLATES = {
  professionale: {
    id:         'professionale',
    name:       '🏢 Professionale',
    desc:       'Stile formale B2B · Navy elegante · Serif · Ideale per aziende',
    colors: {
      primary:    '#1e3a5f',
      secondary:  '#2c5282',
      accent:     '#2b6cb0',
      bg:         '#ffffff',
      headerBg:   '#1e3a5f',
      headerText: '#ffffff',
      rowOdd:     '#f7faff',
      rowEven:    '#ffffff',
      border:     '#cbd5e0',
      text:       '#1a202c',
      textMuted:  '#4a5568',
    },
    font:       "'Georgia', 'Times New Roman', serif",
    fontHeader: "'Georgia', serif",
    headerStyle:'formal',
    logoStyle:  'left-aligned',
    accentLine: true,
  },
  amichevole: {
    id:         'amichevole',
    name:       '😊 Amichevole',
    desc:       'Tono caldo · Verde fresco · Emoji · Perfetto per artigiani e freelance',
    colors: {
      primary:    '#276749',
      secondary:  '#2f855a',
      accent:     '#38a169',
      bg:         '#f0fff4',
      headerBg:   '#276749',
      headerText: '#ffffff',
      rowOdd:     '#f0fff4',
      rowEven:    '#ffffff',
      border:     '#c6f6d5',
      text:       '#22543d',
      textMuted:  '#48bb78',
    },
    font:       "'Arial', 'Helvetica', sans-serif",
    fontHeader: "'Arial', sans-serif",
    headerStyle:'friendly',
    emoji:      true,
    logoStyle:  'centered',
  },
  minimal: {
    id:         'minimal',
    name:       '◻️ Minimalista',
    desc:       'Bianco puro · Grigio · Tipografia pulita · Spazi ampi',
    colors: {
      primary:    '#000000',
      secondary:  '#333333',
      accent:     '#555555',
      bg:         '#ffffff',
      headerBg:   '#ffffff',
      headerText: '#000000',
      rowOdd:     '#fafafa',
      rowEven:    '#ffffff',
      border:     '#e5e5e5',
      text:       '#111111',
      textMuted:  '#666666',
    },
    font:       "'Helvetica Neue', 'Helvetica', Arial, sans-serif",
    fontHeader: "'Helvetica Neue', 'Arial', sans-serif",
    headerStyle:'minimal',
    logoStyle:  'right-aligned',
    accentLine: false,
  },
  premium: {
    id:         'premium',
    name:       '✨ Premium',
    desc:       'Oro su nero · Luxury style · Tipografia elegante · Alto di gamma',
    colors: {
      primary:    '#d4af37',
      secondary:  '#b8960c',
      accent:     '#f0c040',
      bg:         '#0a0a0a',
      headerBg:   '#0a0a0a',
      headerText: '#d4af37',
      rowOdd:     '#111111',
      rowEven:    '#0d0d0d',
      border:     '#2a2a2a',
      text:       '#e8e8e8',
      textMuted:  '#888888',
    },
    font:       "'Georgia', 'Palatino', serif",
    fontHeader: "'Georgia', 'Palatino', serif",
    headerStyle:'luxury',
    logoStyle:  'centered',
    accentLine: true,
  }
};

const TemplateManager = {
  _SK: 'ingly_quote_template_v1',
  getActive(){ try{return localStorage.getItem(this._SK)||'amichevole';}catch{return 'amichevole';} },
  setActive(id){ try{localStorage.setItem(this._SK,id);}catch{} return QUOTE_TEMPLATES[id]||QUOTE_TEMPLATES.amichevole; },
  get(id){ return QUOTE_TEMPLATES[id||this.getActive()]||QUOTE_TEMPLATES.amichevole; },
};
window.TemplateManager = TemplateManager;


// ═══════════════════════════════════════════════════════════════════════
// generatePDFQuote() — THE STABLE PDF GENERATOR
// Uses: html2canvas + jsPDF, A4 format, multi-page, template-aware

// ════════════════════════════════════════════════════════════════════════
// SMART QUOTER — PDF ENGINE v2 (REWRITE COMPLETO)
// Fix: TDZ logoSrc · TemplateEditor.getAll() · HTML rotto · window.open
//      sync · cross-origin · exportClientPDF stub · wrapper patches
// ════════════════════════════════════════════════════════════════════════

// ── 1. UTILITY LOCALE ────────────────────────────────────────────────
function _buildQuoteData() {
  // Raccoglie tutti i dati del preventivo attuale dal DOM + IDB
  const cp = (typeof CompanyProfile !== 'undefined') ? CompanyProfile.get() : {};
  const cfg = {};  // sarà completato async
  const clientEl = (typeof eid !== 'undefined') ? eid('q-client') : document.getElementById('q-client');
  const clientName = clientEl?.selectedIndex > 0
    ? clientEl.options[clientEl.selectedIndex].text
    : '';
  const jobName  = (document.getElementById('q-name')?.value || 'Preventivo').trim();
  const markupPct = parseFloat(document.getElementById('qr-markup')?.value || 100);
  const discountPct = parseFloat(document.getElementById('qr-discount')?.value || 0);
  const notes    = document.getElementById('q-notes')?.value || '';
  const deadline = document.getElementById('q-deadline')?.value || '';
  const withIVA  = (typeof Quoter !== 'undefined') ? Quoter._ivaMode !== false : false;
  const lines    = (typeof Quoter !== 'undefined') ? (Quoter.lines || []) : [];

  // Validazione
  if (!lines.length) {
    if (typeof toast !== 'undefined') toast('⚠️ Aggiungi almeno una voce al preventivo', 'warning');
    return null;
  }

  // Calcoli
  const markup   = markupPct / 100;
  const discount = discountPct / 100;
  const subBase  = lines.reduce((a, l) => a + (+(l.subtotal) || 0) * (1 + markup), 0);
  const subFinal = subBase * (1 - discount);
  const vatAmt   = withIVA ? subFinal * 0.22 : 0;
  const grand    = subFinal + vatAmt;
  const saved    = subBase - subFinal;
  const quoteNum = 'PRV-' + Date.now().toString().slice(-6);
  const dateStr  = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  const deadlineStr = deadline
    ? new Date(deadline).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
    : '30 giorni dalla data di emissione';

  // Get product image from QuoterImagePanel
  const qipSpecs = (typeof QuoterImagePanel !== 'undefined') ? QuoterImagePanel.getSpecs() : {};
  const productImage  = qipSpecs.image || null;
  const productW      = qipSpecs.width  || null;
  const productH      = qipSpecs.height || null;
  const productMat    = qipSpecs.material || '';
  const productNotes  = qipSpecs.techNotes || '';

  return { cp, clientName, jobName, markupPct, discountPct, markup, discount,
           notes, deadline, deadlineStr, withIVA, lines, subBase, subFinal,
           vatAmt, grand, saved, quoteNum, dateStr,
           productImage, productW, productH, productMat, productNotes };
}

function _buildQuoteHTML(data, tplId, cfg) {
  const {
    cp, clientName, jobName, markupPct, discountPct, markup, discount,
    notes, deadlineStr, withIVA, lines, subBase, subFinal,
    vatAmt, grand, saved, quoteNum, dateStr,
    productImage = null, productW = null, productH = null,
    productMat = '', productNotes = ''
  } = data;

  // ── Template system ──────────────────────────────────────────────
  const TEMPLATES = {
    ingly:         { name:'Ingly Design',  hBg:'#0d0d14', hFg:'#fbbf24', ac:'#f59e0b', bodyBg:'#f8f7f2', borderR:'8px',  font:"'Segoe UI',system-ui,sans-serif", accent2:'#1a1200' },
    professionale: { name:'Professionale', hBg:'#0f172a', hFg:'#38bdf8', ac:'#0ea5e9', bodyBg:'#f8fafc', borderR:'4px',  font:"'Segoe UI',system-ui,sans-serif" },
    amichevole:    { name:'Amichevole',    hBg:'#064e3b', hFg:'#6ee7b7', ac:'#10b981', bodyBg:'#f0fdf4', borderR:'16px', font:"Nunito,system-ui,sans-serif" },
    minimal:       { name:'Minimal',       hBg:'#ffffff', hFg:'#0f172a', ac:'#6366f1', bodyBg:'#ffffff', borderR:'0px',  font:"Inter,system-ui,sans-serif" },
    premium:       { name:'Premium Gold',  hBg:'#1c1410', hFg:'#fbbf24', ac:'#d97706', bodyBg:'#fffbf0', borderR:'4px',  font:"Georgia,serif" },
    friendly:      { name:'Amichevole',    hBg:'#064e3b', hFg:'#6ee7b7', ac:'#10b981', bodyBg:'#f0fdf4', borderR:'16px', font:"Nunito,system-ui,sans-serif" },
    professional:  { name:'Professionale', hBg:'#0f172a', hFg:'#38bdf8', ac:'#0ea5e9', bodyBg:'#f8fafc', borderR:'4px',  font:"'Segoe UI',system-ui,sans-serif" },
    minimalista:   { name:'Minimal',       hBg:'#ffffff', hFg:'#0f172a', ac:'#6366f1', bodyBg:'#ffffff', borderR:'0px',  font:"Inter,system-ui,sans-serif" },
    classico:      { name:'Classico',      hBg:'#1e3a5f', hFg:'#ffffff', ac:'#2563eb', bodyBg:'#f9f9f9', borderR:'2px',  font:"Georgia,serif" },
  };

  // Merge with TemplateEditor customizations
  let tBase = TEMPLATES[tplId] || TEMPLATES.ingly;
  let logoSrc = '';
  try {
    if (typeof TemplateEditor !== 'undefined' && typeof TemplateEditor.getAll === 'function') {
      const customTpl = TemplateEditor.getAll()[tplId];
      if (customTpl) {
        if (customTpl.colors?.primary) tBase = { ...tBase, ac: customTpl.colors.primary };
        if (customTpl.colors?.headerBg) tBase = { ...tBase, hBg: customTpl.colors.headerBg };
        if (customTpl.colors?.headerText) tBase = { ...tBase, hFg: customTpl.colors.headerText };
        if (customTpl.font) tBase = { ...tBase, font: customTpl.font };
        if (customTpl.logo) logoSrc = customTpl.logo;
      }
    }
  } catch(e) {}

  // Logo from CompanyProfile as fallback
  if (!logoSrc && cp.logo) logoSrc = cp.logo;

  const T  = tBase;
  const ac = T.ac;

  // ── Company info ──────────────────────────────────────────────────
  const company  = (cfg && cfg.company) || cp.name  || 'La Tua Azienda';
  const tagline  = (cfg && cfg.tagline) || cp.slogan || cp.web || '';
  const piva     = (cfg && cfg.piva)    || cp.piva  || '';
  const email    = (cfg && cfg.email)   || cp.email || '';
  const phone    = (cfg && cfg.phone)   || cp.phone || '';
  const iban     = (cfg && cfg.iban)    || cp.iban  || '';
  const payTerms = cp.paymentTerms || '';

  const fmtE = v => '€' + (+v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // ── Row items ─────────────────────────────────────────────────────
  const rowsHTML = lines.map((l, i) => {
    const sub = +(l.subtotal) || ((+(l.unitCost) || 0) * (+(l.qty) || 1));
    const lineBase = sub * (1 + markup);
    const lineNet  = lineBase * (1 - discount);
    const unitNet  = lineNet / Math.max(+(l.qty) || 1, 1);
    const bg = i % 2 === 0 ? T.bodyBg : (T.bodyBg === '#ffffff' ? '#f8fafc' : '#ffffff');
    const lineDiscBadge = discount>0 ? `<span style="font-size:9px;background:#22c55e15;color:#22c55e;padding:1px 6px;border-radius:99px;font-weight:700;margin-left:6px">-${discountPct}%</span>` : '';
    const lineOrigPrice = discount>0 ? `<div style="font-size:10px;color:#94a3b8;text-decoration:line-through">${fmtE(lineBase)}</div>` : '';
    const catDetail = [l.catLabel, l.detail].filter(Boolean).join(' · ');
    return `<tr style="background:${bg};border-bottom:1px solid #e2e8f0">
      <td style="padding:11px 18px;font-size:13px;color:#1e293b;font-weight:500">
        <div style="font-weight:600">${l.desc || l.name || 'Voce'}</div>
        ${catDetail ? `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${catDetail}</div>` : ''}
      </td>
      <td style="padding:11px 8px;text-align:center;font-size:13px;color:#64748b">${l.qty || 1}</td>
      <td style="padding:11px 8px;text-align:center;font-size:11px;color:#94a3b8">${l.unit || 'pz'}</td>
      <td style="padding:11px 18px;text-align:right;font-size:13px;color:#64748b">${fmtE(unitNet)}</td>
      <td style="padding:11px 18px;text-align:right">
        ${lineOrigPrice}
        <span style="font-size:14px;color:#0f172a;font-weight:700">${fmtE(lineNet)}</span>${lineDiscBadge}
      </td>
    </tr>`;
  }).join('');

  // ── Logo HTML (safe — no broken CSS) ─────────────────────────────
  const logoHTML = logoSrc
    ? `<img src="${logoSrc}" style="max-height:${tplId==='ingly'?'56':'48'}px;max-width:180px;object-fit:contain;display:block" alt="${company}">`
    : '';

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Preventivo ${quoteNum} — ${company}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:${T.font};background:${T.bodyBg};color:#1e293b;min-height:100vh}
  @page{size:A4;margin:12mm}
  @media print{
    body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
    .no-print{display:none!important}
    .page{box-shadow:none!important;max-width:100%!important;margin:0!important}
  }
  .page{max-width:860px;margin:0 auto;background:${T.bodyBg};box-shadow:0 4px 40px rgba(0,0,0,.1)}
  .header{background:${T.hBg};padding:32px 40px;border-radius:${T.borderR} ${T.borderR} 0 0}
  ${tplId==='ingly'?'.header{background:linear-gradient(135deg,#0d0d14 60%,#1a1200);border-bottom:3px solid #fbbf24;position:relative;overflow:hidden}.header::before{content:\'\';position:absolute;top:0;right:0;width:200px;height:200px;background:radial-gradient(circle at top right,#fbbf2415,transparent 70%);pointer-events:none}.header::after{content:\'\';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#fbbf2440,transparent)}':''}
  .body{padding:28px 40px}
  .section-title{font-size:10px;font-weight:700;color:${ac};text-transform:uppercase;letter-spacing:1px;
    margin:20px 0 10px;padding-bottom:5px;border-bottom:2px solid ${ac}}
  .items-table{width:100%;border-collapse:collapse;margin-bottom:20px;
    border-radius:${T.borderR};overflow:hidden;border:1px solid #e2e8f0}
  .items-table thead tr{background:${ac}}
  .items-table thead th{padding:11px 18px;text-align:left;font-size:10px;font-weight:700;
    color:#fff;text-transform:uppercase;letter-spacing:.5px}
  .totals-box{max-width:300px;margin-left:auto;background:#fff;border:1px solid #e2e8f0;
    border-radius:${T.borderR};overflow:hidden}
  .tot-row{display:flex;justify-content:space-between;padding:9px 18px;
    font-size:13px;border-bottom:1px solid #f1f5f9;color:#64748b}
  .tot-row.grand{background:${ac};color:#fff;font-size:17px;font-weight:900;border:none;padding:13px 18px}
  .client-box{background:#fff;border:1.5px solid #e2e8f0;border-radius:${T.borderR};
    padding:18px 22px;margin-bottom:20px}
  .notes-box{background:#fff;border-left:4px solid ${ac};padding:12px 16px;
    border-radius:0 ${T.borderR} ${T.borderR} 0;margin:16px 0;font-size:13px;color:#475569;line-height:1.6}
  .footer{background:${tplId==='ingly'?'linear-gradient(135deg,#0d0d14,#1a1200)':T.hBg};padding:14px 40px;display:flex;justify-content:space-between;
    align-items:center;font-size:11px;color:${T.hFg};opacity:.85;
    border-top:${tplId==='ingly'?'2px solid #fbbf2440':'none'};
    border-radius:0 0 ${T.borderR} ${T.borderR}}
  .meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 20px}
  .meta-item{text-align:center;padding:10px;background:#fff;border-radius:${T.borderR};
    border:1px solid #e2e8f0}
  .meta-label{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
  .meta-value{font-size:13px;font-weight:700;color:#1e293b}
  .hint-bar{position:fixed;top:0;left:0;right:0;background:${ac};color:#fff;text-align:center;
    padding:8px;font-size:13px;font-weight:700;z-index:9999;display:flex;align-items:center;justify-content:center;gap:14px}
  .hint-bar button{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;padding:5px 16px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700}
  @media print{.hint-bar,.no-print{display:none!important}}
</style>
</head>
<body>
<div class="no-print hint-bar">
  ✏️ Modifica il testo cliccando · 
  <kbd style="background:rgba(0,0,0,.25);padding:2px 8px;border-radius:4px">Ctrl+P</kbd> per stampare/PDF ·
  <span style="cursor:pointer;text-decoration:underline" onclick="this.closest('.hint-bar').style.display='none'">Nascondi</span>
</div>
<div style="height:44px" class="no-print"></div>

<div class="page">
  <!-- HEADER -->
  <div class="header">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;gap:20px">
      <!-- LEFT: Logo + Company info -->
      <div style="display:flex;align-items:flex-start;gap:14px;flex:1">
        ${logoHTML ? `<div style="flex-shrink:0">${logoHTML}</div>` : ''}
        <div>
          <div style="font-size:${tplId==='ingly'?'26':'22'}px;font-weight:900;color:${T.hFg};line-height:1.1;letter-spacing:${tplId==='ingly'?'-0.5px':'0'}">${company}</div>
          ${tagline ? `<div style="font-size:11px;color:${T.hFg}90;margin-top:4px;font-style:italic">${tagline}</div>` : ''}
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:3px">
            ${piva ? `<div style="font-size:10px;color:${T.hFg}65"><span style="opacity:.6">P.IVA / CF:</span> ${piva}</div>` : ''}
            ${email ? `<div style="font-size:10px;color:${T.hFg}65"><span style="opacity:.6">Email:</span> ${email}</div>` : ''}
            ${phone ? `<div style="font-size:10px;color:${T.hFg}65"><span style="opacity:.6">Tel:</span> ${phone}</div>` : ''}
            ${iban ? `<div style="font-size:10px;color:${T.hFg}65"><span style="opacity:.6">IBAN:</span> ${iban}</div>` : ''}
          </div>
        </div>
      </div>
      <!-- RIGHT: Quote number box -->
      <div style="text-align:right;flex-shrink:0;min-width:170px">
        <div style="background:${tplId==='ingly'?'rgba(251,191,36,.1)':'rgba(255,255,255,.12)'};border:${tplId==='ingly'?'2px solid rgba(251,191,36,.4)':'1px solid rgba(255,255,255,.25)'};border-radius:12px;padding:14px 18px;display:inline-block">
          <div style="font-size:9px;color:${T.hFg}55;text-transform:uppercase;letter-spacing:2px;margin-bottom:5px">Preventivo Nr.</div>
          <div style="font-size:30px;font-weight:900;color:${T.hFg};line-height:1">${quoteNum}</div>
          <div style="font-size:10px;color:${T.hFg}55;margin-top:6px;padding-top:6px;border-top:1px solid ${tplId==='ingly'?'rgba(251,191,36,.25)':'rgba(255,255,255,.2)'}">Data: ${dateStr}</div>
          ${deadlineStr ? `<div style="font-size:10px;color:${T.hFg}50;margin-top:3px">Valido: ${deadlineStr}</div>` : ''}
        </div>
      </div>
    </div>
  </div>

  <div class="body">
    <!-- META -->
    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Numero</div>
        <div class="meta-value">${quoteNum}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Data</div>
        <div class="meta-value">${dateStr}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Validità</div>
        <div class="meta-value">${deadlineStr}</div>
      </div>
    </div>

    <!-- CLIENT -->
    <div class="client-box" style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px">
      <div>
        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px">Destinatario</div>
        <div style="font-size:17px;font-weight:800;color:#0f172a" contenteditable>${clientName || 'Cliente'}</div>
        <div style="font-size:13px;color:#64748b;margin-top:3px;font-style:italic" contenteditable>${jobName}</div>
      </div>
      ${discountPct > 0 ? `
      <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #86efac;border-radius:10px;padding:10px 16px;text-align:center;flex-shrink:0">
        <div style="font-size:10px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">🎉 Sconto speciale</div>
        <div style="font-size:24px;font-weight:900;color:#16a34a;line-height:1">-${discountPct}%</div>
        <div style="font-size:10px;color:#16a34a;margin-top:3px">Risparmi ${fmtE(saved)}</div>
      </div>` : ''}
    </div>

    ${productImage ? `
    <!-- PRODUCT IMAGE -->
    <div style="display:flex;gap:18px;margin-bottom:18px;background:#f8fafc;border-radius:10px;padding:14px 18px;border:1.5px solid #e2e8f0;page-break-inside:avoid">
      <img src="${productImage}" style="max-width:160px;max-height:160px;object-fit:contain;border-radius:8px;border:1px solid #e2e8f0;background:#fff;padding:4px;flex-shrink:0" alt="Foto di riferimento">
      <div>
        <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">📷 Foto prodotto / riferimento</div>
        <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:5px">${jobName}</div>
        ${productMat ? `<div style="font-size:11px;color:#64748b;margin-bottom:3px">🪵 Materiale: <strong style="color:#1e293b">${productMat}</strong></div>` : ''}
        ${(productW && productH) ? `<div style="font-size:11px;color:#64748b;margin-bottom:3px">📐 Dimensioni: <strong style="color:#1e293b">${productW} × ${productH} mm</strong></div>` : ''}
        ${productNotes ? `<div style="font-size:11px;color:#475569;margin-top:5px;line-height:1.5;border-top:1px solid #e2e8f0;padding-top:5px">${productNotes}</div>` : ''}
      </div>
    </div>` : ''}

    <!-- ITEMS TABLE -->
    <div class="section-title">Dettaglio Voci</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:44%;text-align:left">Descrizione</th>
          <th style="width:8%;text-align:center">Qtà</th>
          <th style="width:8%;text-align:center">UM</th>
          <th style="width:18%;text-align:right">Prezzo Unit.</th>
          <th style="width:22%;text-align:right">Totale</th>
        </tr>
      </thead>
      <tbody>${rowsHTML}</tbody>
    </table>

    <!-- TOTALS -->
    ${discountPct > 0 ? `
    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:12px;padding:12px 18px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:10px;font-weight:800;color:#16a34a;text-transform:uppercase;letter-spacing:.5px">🎉 Sconto applicato</div>
        <div style="font-size:28px;font-weight:900;color:#16a34a;line-height:1.1">-${discountPct}%</div>
        <div style="font-size:11px;color:#15803d;margin-top:2px">Hai risparmiato ${fmtE(saved)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:#64748b">Prezzo originale</div>
        <div style="font-size:15px;color:#94a3b8;text-decoration:line-through;font-weight:600">${fmtE(subBase)}</div>
        <div style="font-size:11px;color:#16a34a;margin-top:4px;font-weight:700">Prezzo scontato: ${fmtE(subFinal)}</div>
      </div>
    </div>` : ''}
    <div class="totals-box">
      ${discountPct > 0 ? `
      <div class="tot-row">
        <span>Prezzo pieno</span>
        <span style="text-decoration:line-through;color:#94a3b8">${fmtE(subBase)}</span>
      </div>
      <div class="tot-row" style="color:#16a34a;font-weight:700;background:#f0fdf4">
        <span>✅ Sconto ${discountPct}%</span>
        <span>− ${fmtE(saved)}</span>
      </div>` : ''}
      <div class="tot-row">
        <span>Imponibile</span>
        <span style="font-weight:700">${fmtE(subFinal)}</span>
      </div>
      ${withIVA ? `<div class="tot-row"><span>IVA 22%</span><span>${fmtE(vatAmt)}</span></div>` : ''}
      <div class="tot-row grand">
        <span>TOTALE FINALE</span>
        <span>${fmtE(grand)}</span>
      </div>
    </div>

    ${notes ? `
    <div class="section-title" style="margin-top:24px">Note</div>
    <div class="notes-box" contenteditable>${notes}</div>` : ''}

    ${payTerms ? `<div style="margin-top:12px;font-size:12px;color:#94a3b8;padding:10px 14px;background:#f8fafc;border-radius:${T.borderR};border:1px solid #e2e8f0">${payTerms}</div>` : ''}

    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
      Questo preventivo è valido per 7 giorni · Non costituisce fattura
      ${iban ? `<br>Pagamento: ${iban}` : ''}
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>${company}${piva ? ' · P.IVA ' + piva : ''}</div>
    <div>Generato con INGLY OS · ${dateStr}</div>
  </div>
</div>

</body>
</html>`;
}

// ── 2. NUOVA generatePDFQuote — TUTTI I BUG FIXATI ───────────────────
async function generatePDFQuote(templateIdOverride) {
  // ── Step 1: Validate lines ─────────────────────────────────────────
  const lines = (typeof Quoter !== 'undefined') ? (Quoter.lines || []) : [];
  if (!lines.length) {
    if (typeof toast !== 'undefined') toast('⚠️ Aggiungi almeno una voce al preventivo', 'warning');
    return;
  }

  // ── Step 2: Build data & HTML ──────────────────────────────────────
  let data, html, cfg = {};
  try {
    data = _buildQuoteData();
    if (!data) return;
    cfg = await IDB.get('settings', 'main').catch(() => null) || {};
    const activeId = templateIdOverride || 'ingly';
    // Override cp with latest from CompanyProfile (customizer may have just saved it)
    const cpLatest = (typeof CompanyProfile !== 'undefined') ? CompanyProfile.get() : {};
    data.cp = Object.assign({}, data.cp, cpLatest);
    html = _buildQuoteHTML(data, activeId, cfg);
  } catch (err) {
    console.error('[PDF] build error:', err);
    if (typeof toast !== 'undefined') toast('❌ Errore generazione: ' + err.message, 'error');
    return;
  }

  // ── Step 3: Show PDF in overlay (no popup = no blocker) ────────────
  var existing = document.getElementById('_pdf-preview-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = '_pdf-preview-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:0;overflow:hidden';

  // Top toolbar
  var toolbar = document.createElement('div');
  toolbar.style.cssText = 'width:100%;background:#1a1a2e;border-bottom:1px solid rgba(255,255,255,.1);padding:10px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0;z-index:1';
  toolbar.innerHTML = [
    '<div style="display:flex;align-items:center;gap:8px;flex:1">',
    '<span style="font-size:18px">📄</span>',
    '<span style="font-size:14px;font-weight:800;color:#fff">Anteprima Preventivo</span>',
    '<span style="font-size:11px;color:rgba(255,255,255,.4);margin-left:4px">— ' + (data.quoteNum || 'PRV') + ' · ' + (data.clientName || '') + '</span>',
    '</div>',
    '<button id="_pdf-print-btn" style="padding:8px 20px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800;display:flex;align-items:center;gap:7px"><span>🖨️</span> Stampa / Salva PDF</button>',
    '<button id="_pdf-dl-btn" style="padding:8px 16px;background:rgba(59,130,246,.15);color:#60a5fa;border:1.5px solid rgba(59,130,246,.3);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px"><span>⬇️</span> Scarica HTML</button>',
    '<button onclick="document.getElementById(\'_pdf-preview-overlay\').remove()" style="padding:8px 14px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.15);border-radius:9px;cursor:pointer;font-size:13px">✕ Chiudi</button>',
  ].join('');
  overlay.appendChild(toolbar);

  // Hint bar
  var hint = document.createElement('div');
  hint.style.cssText = 'width:100%;background:rgba(16,185,129,.1);border-bottom:1px solid rgba(16,185,129,.2);padding:7px 20px;font-size:11px;color:#6ee7b7;text-align:center;flex-shrink:0';
  hint.textContent = '💡 Clicca "Stampa / Salva PDF" → nella finestra di stampa seleziona "Salva come PDF" come stampante';
  overlay.appendChild(hint);

  // IFrame container
  var frameWrap = document.createElement('div');
  frameWrap.style.cssText = 'flex:1;width:100%;overflow:hidden;background:#525659;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto';

  var iframe = document.createElement('iframe');
  iframe.id = '_pdf-iframe';
  iframe.style.cssText = 'width:860px;min-height:1000px;border:none;border-radius:4px;box-shadow:0 8px 40px rgba(0,0,0,.5);background:#fff;display:block;flex-shrink:0';
  frameWrap.appendChild(iframe);
  overlay.appendChild(frameWrap);
  document.body.appendChild(overlay);

  // Write HTML to iframe
  try {
    var doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
  } catch(e) {
    console.error('[PDF] iframe write:', e);
    // Fallback: blob URL
    var blob = new Blob([html], {type:'text/html;charset=utf-8'});
    iframe.src = URL.createObjectURL(blob);
  }

  // ── Print button ───────────────────────────────────────────────────
  document.getElementById('_pdf-print-btn').onclick = function() {
    try {
      var fr = document.getElementById('_pdf-iframe');
      if (fr && fr.contentWindow) {
        fr.contentWindow.focus();
        fr.contentWindow.print();
      } else {
        // Fallback: open in new tab
        var w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
        else {
          // Last resort: blob URL
          var b = new Blob([html], {type:'text/html'});
          var a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.target = '_blank';
          a.click();
        }
      }
    } catch(err) {
      console.warn('[PDF print]', err);
      var w2 = window.open('', '_blank');
      if (w2) { w2.document.write(html); w2.document.close(); w2.print(); }
    }
  };

  // ── Download HTML button ────────────────────────────────────────────
  document.getElementById('_pdf-dl-btn').onclick = function() {
    var cp2 = (typeof CompanyProfile !== 'undefined') ? CompanyProfile.get() : {};
    var company = cfg.company || cp2.name || 'preventivo';
    var fname = 'Preventivo-' + (data.quoteNum||'PRV') + '-' + company.replace(/[^a-zA-Z0-9]/g,'-').slice(0,25) + '.html';
    var blob = new Blob([html], {type:'text/html;charset=utf-8'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    a.click();
    URL.revokeObjectURL(a.href);
    if (typeof toast !== 'undefined') toast('📥 HTML scaricato: ' + fname, 'success');
  };

  // ESC to close
  var _escHandler = function(e) {
    if (e.key === 'Escape') {
      var ov = document.getElementById('_pdf-preview-overlay');
      if (ov) ov.remove();
      document.removeEventListener('keydown', _escHandler);
    }
  };
  document.addEventListener('keydown', _escHandler);

  if (typeof toast !== 'undefined') toast('📄 Preventivo pronto — clicca Stampa per salvare come PDF', 'success');
}

window.generatePDFQuote = generatePDFQuote;


// ── 3. INTERNO: Quoter.exportPDF — rimane invariato (già funziona) ───
// Il dark-theme internal report funziona già, non lo tocchiamo.

// ── 4. FIX exportClientPDF — rimuovi stub, usa _pdfRenderStep ────────
(function fixExportClientPDF() {
  const tryFix = () => {
    if (typeof Quoter === 'undefined') return setTimeout(tryFix, 600);
    if (typeof Quoter._pdfRenderStep !== 'function') return setTimeout(tryFix, 600);

    // Sostituisci con una versione pulita che chiama sempre _pdfRenderStep(1)
    Quoter.exportClientPDF = function () {
      if (!Quoter.lines || !Quoter.lines.length) {
        if (typeof toast !== 'undefined') toast('⚠️ Aggiungi almeno una voce al preventivo', 'warning');
        return;
      }
      // Rimuovi overlay esistente
      document.getElementById('pdf-chooser-overlay')?.remove();
      // Crea overlay
      const overlay = document.createElement('div');
      overlay.id = 'pdf-chooser-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);backdrop-filter:blur(5px);z-index:19999;display:flex;align-items:center;justify-content:center;padding:20px';
      overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
      document.body.appendChild(overlay);
      Quoter._pdfRenderStep(1);
    };

    console.log('[PDF] exportClientPDF fixed ✅');
  };
  setTimeout(tryFix, 1200);
})();


// ── 5. RIMUOVI I WRAPPER DUPLICATI CHE WRAPPANO generatePDFQuote ────
// (i patch v17/v18 che wrappavano generatePDFQuote e aggiungevano logoSrc
//  sono ora inutili — la nuova funzione gestisce tutto internamente)
// Non facciamo nulla qui — la nuova funzione sovrascrive già window.generatePDFQuote

// ── 6. BOTTONE PDF INTERNO NELLA TOPBAR DEL QUOTER ──────────────────
(function addQuoterPDFButtons() {
  const tryAdd = () => {
    if (typeof Quoter === 'undefined') return setTimeout(tryAdd, 800);
    // Aggiungi bottone "PDF Interno" se non presente
    const quoterView = document.getElementById('view-quoter');
    if (!quoterView) return;

    // Cerca la barra azioni del quoter
    const actionBar = quoterView.querySelector('[class*="action"]') ||
                      quoterView.querySelector('.quoter-actions') ||
                      document.getElementById('quoter-actions');

    if (!actionBar || document.getElementById('quoter-pdf-btns-v2')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'quoter-pdf-btns-v2';
    wrapper.style.cssText = 'display:inline-flex;gap:5px';
    wrapper.innerHTML = `
      <button onclick="generatePDFQuote()"
        style="padding:8px 13px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;border:none;
               border-radius:8px;cursor:pointer;font-size:12px;font-weight:700"
        title="PDF per il cliente — popup modificabile + download automatico">
        📄 PDF Cliente
      </button>
      <button onclick="Quoter.exportPDF&&Quoter.exportPDF()"
        style="padding:8px 11px;background:#0f172a;color:#38bdf8;border:1px solid #1e293b;
               border-radius:8px;cursor:pointer;font-size:12px;font-weight:700"
        title="PDF interno con margini e markup">
        📊 Analisi interna
      </button>`;
    actionBar.appendChild(wrapper);
  };
  setTimeout(tryAdd, 2500);
})();

console.log('[INGLY OS v16 — Gestionale Artigiano Laser] Smart Quoter PDF Engine v2 caricato ✅');




// ═══════════════════════════════════════════════════════════════════════
// applyTemplate(templateName) — applies template to current preview
// ═══════════════════════════════════════════════════════════════════════
function applyTemplate(templateId) {
  const tpl = TemplateManager.setActive(templateId);
  toast(`🎨 Template "${tpl.name}" attivo!`, 'success');
  // Update any live preview if open
  const preview = document.getElementById('tpl-live-preview');
  if(preview) TemplateDocsModule._updatePreview(preview, templateId);
  // Update active state in UI
  document.querySelectorAll('.tpl-card').forEach(card=>{
    const isActive = card.dataset.tplId === templateId;
    card.style.borderColor = isActive ? '#f59e0b' : 'var(--border)';
    card.style.background  = isActive ? '#f59e0b12' : 'var(--bg-card2)';
    const badge = card.querySelector('.tpl-active-badge');
    if(badge) badge.style.display = isActive ? 'inline-flex' : 'none';
  });
  return tpl;
}
window.applyTemplate = applyTemplate;


// ═══════════════════════════════════════════════════════════════════════
// TemplateDocsModule — Template Documenti section
// ═══════════════════════════════════════════════════════════════════════
const TemplateDocsModule = {

  render() {
    // v17: delegate to TemplateEditor (full editabile version)
    if(typeof TemplateEditor !== 'undefined') {
      TemplateEditor.render();
      return;
    }
    // Fallback: original render
    const el = document.getElementById('view-template_docs');
    if(!el) return;
    el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Template Editor in caricamento...</div>';
  },
    _updatePreview(container, templateId) {
    if(!container) return;
    const tpl = TemplateManager.get(templateId);
    const T   = tpl.colors;

    // Update label
    const label = document.getElementById('tpl-preview-label');
    if(label) label.textContent = tpl.name;

    // Update preview buttons
    document.querySelectorAll('[id^="tpl-prev-btn-"]').forEach(btn=>{
      const id = btn.id.replace('tpl-prev-btn-','');
      const isActive = id === templateId;
      btn.style.borderColor = isActive ? '#f59e0b' : 'var(--border)';
      btn.style.background  = isActive ? '#f59e0b12' : 'transparent';
      btn.style.color       = isActive ? '#f59e0b' : 'var(--text-muted)';
    });

    // Sample preview HTML
    container.innerHTML = `
      <div style="max-width:700px;margin:0 auto;background:${T.bg};border:1px solid ${T.border};border-radius:8px;overflow:hidden;font-family:${tpl.font};box-shadow:0 4px 20px rgba(0,0,0,.1)">
        <!-- Header -->
        <div style="background:${T.headerBg};padding:24px 32px;${tpl.headerStyle==='minimal'?'border-bottom:2px solid '+T.text:''}">
          ${tpl.headerStyle==='luxury' ? `
          <div style="text-align:center">
            <div style="font-size:9px;letter-spacing:4px;color:${T.primary};text-transform:uppercase;margin-bottom:6px">— Preventivo —</div>
            <div style="font-size:22px;font-weight:900;color:${T.primary}">INGLY DESIGN</div>
            <div style="width:40px;height:1px;background:${T.primary};margin:10px auto 0"></div>
          </div>` :
          tpl.headerStyle==='minimal' ? `
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:18px;font-weight:900;color:${T.text}">Ingly Design</div>
            <div style="text-align:right;font-size:10px;color:${T.textMuted}">info@inglydesign.it · +39 333 123456</div>
          </div>` : `
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-size:20px;font-weight:900;color:${T.headerText}">Ingly Design</div>
              <div style="font-size:9px;color:${T.headerText}80;margin-top:3px;letter-spacing:.5px">Artigianato Laser · Made in Sicily</div>
            </div>
            <div style="background:rgba(255,255,255,.12);border-radius:8px;padding:8px 14px;text-align:right">
              <div style="font-size:9px;color:${T.headerText}70;text-transform:uppercase">Preventivo</div>
              <div style="font-size:16px;font-weight:800;color:${T.headerText}">PRV-000001</div>
            </div>
          </div>`}
        </div>
        <!-- Body preview -->
        <div style="padding:18px 24px;background:${T.bg}">
          <!-- Client box -->
          <div style="background:${T.rowOdd};border:1px solid ${T.border};border-radius:6px;padding:12px 16px;margin-bottom:14px">
            <div style="font-size:8px;font-weight:700;color:${T.textMuted};text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Destinatario</div>
            <div style="font-size:14px;font-weight:800;color:${T.text}">Mario Rossi — Matrimonio 2026</div>
          </div>
          <!-- Table preview -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
            <thead><tr style="background:${T.primary}">
              <th style="padding:8px 12px;text-align:left;font-size:10px;color:${T.headerText};font-family:${tpl.font}">Descrizione</th>
              <th style="padding:8px 8px;text-align:center;font-size:10px;color:${T.headerText}">Qtà</th>
              <th style="padding:8px 12px;text-align:right;font-size:10px;color:${T.headerText}">Totale</th>
            </tr></thead>
            <tbody>
              ${['Segnaposto matrimonio personalizzati','Tableau matrimonio acrilico','Portachiavi nascita coppia'].map((item,i)=>`
              <tr style="background:${i%2===0?T.rowOdd:T.rowEven};border-bottom:1px solid ${T.border}">
                <td style="padding:9px 12px;font-size:12px;color:${T.text};font-family:${tpl.font}">${item}</td>
                <td style="padding:9px 8px;text-align:center;font-size:12px;color:${T.textMuted}">50</td>
                <td style="padding:9px 12px;text-align:right;font-size:13px;font-weight:700;color:${T.text}">€ ${(i+1)*150}</td>
              </tr>`).join('')}
            </tbody>
          </table>
          <!-- Total -->
          <div style="max-width:200px;margin-left:auto;background:${T.rowOdd};border:1px solid ${T.border};border-radius:6px;padding:12px 14px">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:${T.textMuted};margin-bottom:4px">
              <span>Imponibile</span><span>€ 682</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:${T.textMuted};margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid ${T.border}">
              <span>IVA 22%</span><span>€ 150</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:900;color:${T.primary}">
              <span>TOTALE</span><span>€ 832</span>
            </div>
          </div>
        </div>
      </div>`;
  }
};
window.TemplateDocsModule = TemplateDocsModule;


// ═══════════════════════════════════════════════════════════════════════
// PATCH Quoter.exportClientPDF → use generatePDFQuote()
// ═══════════════════════════════════════════════════════════════════════
(function patchQuoterPDF(){
  const tryPatch = () => {
    if(typeof Quoter==='undefined') return setTimeout(tryPatch, 800);

    // Keep original as fallback
    const _origExportClient = Quoter.exportClientPDF?.bind(Quoter) || Quoter._generateClientPDF?.bind(Quoter);

    Quoter.exportClientPDF = async function() {
      if(!this.lines || !this.lines.length){
        toast('Aggiungi almeno una voce al preventivo','warning');
        return;
      }
      // Check if template should be selected first
      const activeId = TemplateManager.getActive();
      // Show template picker if user hasn't chosen yet or wants to change
      const shouldPick = false; // auto-use active template for speed
      if(shouldPick) {
        QuoteTemplatePicker.open(()=>generatePDFQuote());
      } else {
        await generatePDFQuote(activeId);
      }
    };

    (console.info||console.log)('[QuoterPDF] Patched → generatePDFQuote ✅');
  };
  setTimeout(tryPatch, 1500);
})();


// ═══════════════════════════════════════════════════════════════════════
// QUICK TEMPLATE PICKER — shown in Quoter for fast template switch
// ═══════════════════════════════════════════════════════════════════════
const QuoteTemplatePicker = {
  open(onConfirm) {
    const existing = document.getElementById('qtp-modal');
    if(existing) existing.remove();
    const activeId = TemplateManager.getActive();

    const modal = document.createElement('div');
    modal.id = 'qtp-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:#000b;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    modal.onclick = e=>{ if(e.target===modal) modal.remove(); };
    modal.innerHTML = `
      <div style="background:var(--bg-card);border-radius:16px;width:min(640px,96vw);border:1px solid var(--border2);box-shadow:0 24px 64px #000c;overflow:hidden">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:15px;font-weight:800">🎨 Scegli Template Preventivo</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Il template selezionato verrà usato per generare il PDF</div>
          </div>
          <button onclick="document.getElementById('qtp-modal').remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--text-muted)">✕</button>
        </div>
        <div style="padding:16px 20px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
          ${Object.values(QUOTE_TEMPLATES).map(tpl=>{
            const T=tpl.colors;
            const isActive=tpl.id===activeId;
            return `<div onclick="document.querySelectorAll('.qtp-card').forEach(c=>c.style.borderColor='var(--border)');this.style.borderColor='#f59e0b';document.getElementById('qtp-selected').value='${tpl.id}'"
              class="qtp-card" style="border:2px solid ${isActive?'#f59e0b':'var(--border)'};border-radius:10px;overflow:hidden;cursor:pointer;transition:.15s"
              onmouseover="this.style.opacity='.9'" onmouseout="this.style.opacity='1'">
              <div style="height:40px;background:${T.headerBg};display:flex;align-items:center;padding:0 12px;justify-content:space-between">
                <div style="font-size:11px;font-weight:700;color:${T.headerText};font-family:${tpl.font}">Ingly Design</div>
                ${isActive?'<span style="font-size:8px;background:#f59e0b;color:#000;padding:1px 5px;border-radius:3px;font-weight:700">DEFAULT</span>':''}
              </div>
              <div style="padding:8px 12px;background:${T.bg}">
                <div style="font-size:12px;font-weight:800;color:var(--text)">${tpl.name}</div>
                <div style="font-size:10px;color:var(--text-muted);margin-top:1px">${tpl.desc.split('·')[0]}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
        <input type="hidden" id="qtp-selected" value="${activeId}">
        <div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px">
          <button onclick="const sel=document.getElementById('qtp-selected').value;applyTemplate(sel);document.getElementById('qtp-modal').remove();onConfirm&&onConfirm(sel)"
            style="flex:1;padding:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:9px;font-weight:800;cursor:pointer;font-size:13px">
            📄 Genera PDF con questo template
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
};
window.QuoteTemplatePicker = QuoteTemplatePicker;

