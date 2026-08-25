
// ═══════════════════════════════════════════════════════════════════════
// 📄 QUOTE PDF CUSTOMIZER — Professionale
// Mostra un modal di personalizzazione PRIMA di generare il PDF
// ═══════════════════════════════════════════════════════════════════════
var QuotePDFCustomizer = (function(){
  var _SK = 'ingly_quote_pdf_prefs';

  function load(){
    try{ return JSON.parse(localStorage.getItem(_SK)||'{}'); }catch(e){ return {}; }
  }
  function save(d){
    try{ var cur=load(); localStorage.setItem(_SK,JSON.stringify(Object.assign({},cur,d))); }catch(e){}
  }

  function open(){
    // Pre-fill from CompanyProfile + saved prefs
    var cp = (typeof CompanyProfile!=='undefined') ? CompanyProfile.get() : {};
    var cfg = {};
    try{ cfg = JSON.parse(localStorage.getItem('ingly_settings_main')||'{}'); }catch(e){}
    var prefs = load();

    // Get client name from quote DOM
    var clientEl = document.getElementById('q-client');
    var clientName = '';
    if(clientEl && clientEl.selectedIndex>0)
      clientName = clientEl.options[clientEl.selectedIndex].text;
    var jobName = (document.getElementById('q-name')?.value||'Preventivo').trim();

    // Get existing lines count for subtitle
    var linesCount = 0;
    try{
      if(typeof Quoter!=='undefined') linesCount = (Quoter.lines||[]).length;
    }catch(e){}

    // Remove existing modal
    var existing = document.getElementById('qpdf-customizer-modal');
    if(existing) existing.remove();

    var ov = document.createElement('div');
    ov.id = 'qpdf-customizer-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)';
    ov.onclick = function(e){ if(e.target===ov) ov.remove(); };

    var logoSrc = prefs.logo || cp.logo || '';
    var companyName = prefs.company || cfg.company || cp.name || '';
    var tagline = prefs.tagline || cfg.tagline || cp.slogan || '';
    var pivaVal = prefs.piva || cfg.piva || cp.piva || '';
    var emailVal = prefs.email || cfg.email || cp.email || '';
    var phoneVal = prefs.phone || cfg.phone || cp.phone || '';
    var ibanVal = prefs.iban || cfg.iban || cp.iban || '';
    var clientNameVal = prefs.lastClient || clientName || '';
    var templateVal = prefs.template || 'ingly';

    var TEMPLATES = [
      {id:'ingly',         name:'✨ Ingly Design',  desc:'Oro/nero — brand INGLY OS (predefinito)'},
      {id:'professionale', name:'🔵 Professionale', desc:'Dark blue header, moderno'},
      {id:'premium',       name:'🟡 Premium Gold',  desc:'Elegante oro su scuro'},
      {id:'minimal',       name:'⚪ Minimal',       desc:'Bianco puro, essenziale'},
      {id:'amichevole',    name:'🟢 Amichevole',    desc:'Verde, caldo, artigianale'},
    ];

    var tplOpts = TEMPLATES.map(function(t){
      return '<option value="'+t.id+'"'+(templateVal===t.id?' selected':'')+'>'+t.name+' — '+t.desc+'</option>';
    }).join('');

    ov.innerHTML = [
      '<div style="background:var(--bg-card);border-radius:18px;width:min(680px,100%);max-height:94vh;overflow-y:auto;border:1px solid var(--border2);box-shadow:0 32px 80px rgba(0,0,0,.6)" onclick="event.stopPropagation()">',

      // Header
      '<div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;position:sticky;top:0;background:var(--bg-card);border-radius:18px 18px 0 0;z-index:1">',
      '<div style="width:42px;height:42px;background:linear-gradient(135deg,#10b981,#059669);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">📄</div>',
      '<div style="flex:1">',
      '<div style="font-size:16px;font-weight:900;color:var(--text)">Personalizza PDF Preventivo</div>',
      '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">Imposta logo, dati azienda e layout — salvati per i prossimi PDF</div>',
      '</div>',
      '<button onclick="document.getElementById(\'qpdf-customizer-modal\').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:22px;line-height:1;padding:4px">✕</button>',
      '</div>',

      '<div style="padding:20px 22px;display:flex;flex-direction:column;gap:16px">',

      // Logo section
      '<div style="background:var(--bg-card2);border-radius:12px;padding:14px 16px;border:1px solid var(--border)">',
      '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🖼️ Logo Aziendale</div>',
      '<div style="display:flex;align-items:center;gap:14px">',
      '<div id="qpdf-logo-preview" onclick="document.getElementById(\'qpdf-logo-file\').click()" style="width:80px;height:80px;border-radius:12px;border:2px dashed var(--border2);background:var(--bg-card);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;cursor:pointer;transition:.2s" title="Clicca per caricare logo">',
      logoSrc ? '<img src="'+logoSrc+'" style="width:100%;height:100%;object-fit:contain" onerror="this.parentElement.innerHTML=\'🏢\'">' : '<span style="font-size:30px;opacity:.3">🏢</span>',
      '</div>',
      '<div style="flex:1;display:flex;flex-direction:column;gap:7px">',
      '<input type="url" id="qpdf-logo-url" placeholder="https://... URL immagine logo" value="'+(logoSrc&&!logoSrc.startsWith('data:')?logoSrc:'')+'" oninput="QuotePDFCustomizer._previewUrl()" style="width:100%;padding:8px 11px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;outline:none;box-sizing:border-box">',
      '<div style="display:flex;gap:7px">',
      '<button onclick="document.getElementById(\'qpdf-logo-file\').click()" style="padding:7px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted);font-weight:600">📷 Carica file</button>',
      '<button onclick="QuotePDFCustomizer._removeLogo()" style="padding:7px 12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px;cursor:pointer;font-size:11px;color:#ef4444">✕ Rimuovi</button>',
      '</div>',
      '<div style="font-size:10px;color:var(--text-dim)">JPG, PNG, SVG · max 2MB · appare nell\'intestazione del PDF</div>',
      '</div>',
      '<input type="file" id="qpdf-logo-file" accept="image/*" style="display:none" onchange="QuotePDFCustomizer._handleFile(this)">',
      '</div>',
      '</div>',

      // Company info
      '<div style="background:var(--bg-card2);border-radius:12px;padding:14px 16px;border:1px solid var(--border)">',
      '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🏢 Dati Azienda</div>',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">',

      // Nome azienda
      '<div style="grid-column:1/-1">',
      '<label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Nome Azienda / Business *</label>',
      '<input id="qpdf-company" class="qpdf-field" placeholder="Es. Ingly Design · Laser Studio Rossi..." value="'+companyName.replace(/"/g,'&quot;')+'">',
      '</div>',

      // Slogan
      '<div style="grid-column:1/-1">',
      '<label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Slogan / Tagline</label>',
      '<input id="qpdf-tagline" class="qpdf-field" placeholder="Es. Artigianato laser di precisione · Dal 2019..." value="'+tagline.replace(/"/g,'&quot;')+'">',
      '</div>',

      // PIVA + Email
      '<div>',
      '<label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">P.IVA / CF</label>',
      '<input id="qpdf-piva" class="qpdf-field" placeholder="IT12345678901" value="'+pivaVal.replace(/"/g,'&quot;')+'">',
      '</div>',
      '<div>',
      '<label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Email</label>',
      '<input id="qpdf-email" class="qpdf-field" type="email" placeholder="info@tuasocietà.it" value="'+emailVal.replace(/"/g,'&quot;')+'">',
      '</div>',

      // Telefono + IBAN
      '<div>',
      '<label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Telefono</label>',
      '<input id="qpdf-phone" class="qpdf-field" type="tel" placeholder="+39 0XX XXXXXXX" value="'+phoneVal.replace(/"/g,'&quot;')+'">',
      '</div>',
      '<div>',
      '<label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">IBAN (pagamenti)</label>',
      '<input id="qpdf-iban" class="qpdf-field" placeholder="IT60 X054 2811 1010 0000 0123 456" value="'+ibanVal.replace(/"/g,'&quot;')+'">',
      '</div>',

      '</div>',
      '</div>',

      // Client + Job + Template
      '<div style="background:var(--bg-card2);border-radius:12px;padding:14px 16px;border:1px solid var(--border)">',
      '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📋 Preventivo</div>',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">',
      '<div>',
      '<label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Nome Cliente</label>',
      '<input id="qpdf-client" class="qpdf-field" placeholder="Mario Rossi / Azienda Bianchi..." value="'+clientNameVal.replace(/"/g,'&quot;')+'">',
      '</div>',
      '<div>',
      '<label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Titolo Preventivo</label>',
      '<input id="qpdf-jobname" class="qpdf-field" placeholder="Es. Targhe personalizzate..." value="'+jobName.replace(/"/g,'&quot;')+'">',
      '</div>',
      '<div style="grid-column:1/-1">',
      '<label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">🎨 Template Design</label>',
      '<select id="qpdf-template" class="qpdf-field" style="cursor:pointer">'+tplOpts+'</select>',
      '</div>',
      '</div>',
      '</div>',

      // Save + Generate buttons
      '<div style="display:flex;gap:10px;align-items:center;padding-top:4px;border-top:1px solid var(--border)">',
      '<label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:12px;color:var(--text-muted)">',
      '<input type="checkbox" id="qpdf-save-pref" checked style="width:14px;height:14px;cursor:pointer">',
      'Salva come predefinito',
      '</label>',
      '<div style="flex:1"></div>',
      '<button onclick="document.getElementById(\'qpdf-customizer-modal\').remove()" style="padding:11px 20px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;color:var(--text-muted)">Annulla</button>',
      '<button onclick="QuotePDFCustomizer.generate()" style="padding:11px 28px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800;display:flex;align-items:center;gap:8px"><span>📄</span> Genera PDF</button>',
      '</div>',

      '</div>',
      '</div>',
    ].join('');

    // Add CSS for inputs
    if(!document.getElementById('qpdf-css')){
      var st = document.createElement('style');
      st.id = 'qpdf-css';
      st.textContent = '.qpdf-field{width:100%;padding:9px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;outline:none;box-sizing:border-box;transition:border-color .2s;font-family:inherit}.qpdf-field:focus{border-color:rgba(16,185,129,.5)}.qpdf-field option{background:var(--bg-card);color:var(--text)}';
      document.head.appendChild(st);
    }

    document.body.appendChild(ov);
    setTimeout(function(){ document.getElementById('qpdf-company').focus(); }, 80);
  }

  function _previewUrl(){
    var url = (document.getElementById('qpdf-logo-url').value||'').trim();
    var prev = document.getElementById('qpdf-logo-preview');
    if(!prev) return;
    if(url){
      prev.innerHTML = '<img src="'+url+'" style="width:100%;height:100%;object-fit:contain" onerror="this.parentElement.innerHTML=\'⚠️\'">';
    } else {
      prev.innerHTML = '<span style="font-size:30px;opacity:.3">🏢</span>';
    }
  }

  function _handleFile(input){
    var file = input.files[0]; if(!file) return;
    if(file.size > 2*1024*1024){ alert('Immagine troppo grande (max 2MB)'); return; }
    var reader = new FileReader();
    reader.onload = function(e){
      var b64 = e.target.result;
      var prev = document.getElementById('qpdf-logo-preview');
      if(prev) prev.innerHTML = '<img src="'+b64+'" style="width:100%;height:100%;object-fit:contain">';
      // Store in session
      window._qpdfLogoData = b64;
    };
    reader.readAsDataURL(file);
  }

  function _removeLogo(){
    window._qpdfLogoData = '';
    var prev = document.getElementById('qpdf-logo-preview');
    if(prev) prev.innerHTML = '<span style="font-size:30px;opacity:.3">🏢</span>';
    var urlInput = document.getElementById('qpdf-logo-url');
    if(urlInput) urlInput.value = '';
  }

  function generate(){
    // Collect form data
    var logoUrl = (document.getElementById('qpdf-logo-url').value||'').trim();
    var logoData = window._qpdfLogoData || logoUrl || '';
    var company  = (document.getElementById('qpdf-company').value||'').trim();
    var tagline  = (document.getElementById('qpdf-tagline').value||'').trim();
    var piva     = (document.getElementById('qpdf-piva').value||'').trim();
    var email    = (document.getElementById('qpdf-email').value||'').trim();
    var phone    = (document.getElementById('qpdf-phone').value||'').trim();
    var iban     = (document.getElementById('qpdf-iban').value||'').trim();
    var client   = (document.getElementById('qpdf-client').value||'').trim();
    var jobname  = (document.getElementById('qpdf-jobname').value||'').trim();
    var template = (document.getElementById('qpdf-template').value||'professionale');
    var saveDefault = document.getElementById('qpdf-save-pref').checked;

    if(!company){ alert('Inserisci il nome dell\'azienda'); document.getElementById('qpdf-company').focus(); return; }

    // Patch CompanyProfile temporarily
    if(typeof CompanyProfile !== 'undefined'){
      var orig = CompanyProfile.get();
      CompanyProfile.save({
        logo: logoData || orig.logo || '',
        name: company, slogan: tagline,
        piva: piva, email: email, phone: phone, iban: iban,
      });
    }

    // Also patch IDB settings (async, best effort)
    if(typeof IDB !== 'undefined'){
      IDB.get('settings','main').then(function(cfg){
        var newCfg = Object.assign({}, cfg||{}, {
          company: company, tagline: tagline,
          piva: piva, email: email, phone: phone, iban: iban,
          logo: logoData,
        });
        IDB.put('settings', newCfg);
      }).catch(function(){});
    }

    // Save prefs for next time
    if(saveDefault){
      save({
        logo: logoData, company: company, tagline: tagline,
        piva: piva, email: email, phone: phone, iban: iban,
        template: template, lastClient: client,
      });
    }

    // Override job name in DOM if user changed it
    if(jobname){
      var jobEl = document.getElementById('q-name');
      if(jobEl) jobEl.value = jobname;
    }

    // Close modal
    var modal = document.getElementById('qpdf-customizer-modal');
    if(modal) modal.remove();
    window._qpdfLogoData = null;

    // Generate PDF with selected template
    if(typeof generatePDFQuote === 'function'){
      generatePDFQuote(template);
    }
  }

  return {
    open: open,
    generate: generate,
    _previewUrl: _previewUrl,
    _handleFile: _handleFile,
    _removeLogo: _removeLogo,
  };
})();

