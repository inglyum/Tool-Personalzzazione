
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v26 — CRM: Selezione multipla + Elimina + Export VCF/CSV
// ═══════════════════════════════════════════════════════════════════
;(function _crmSelectionPatch(){
  function _p(){
    if(typeof CRMSmart==='undefined'||!CRMSmart._v25){ setTimeout(_p,600); return; }
    if(CRMSmart._v26) return;
    CRMSmart._v26 = true;

    // ── State: set of selected indices ──────────────────────────
    CRMSmart._selected = new Set();

    /* ── Lo stato della vista, in un posto solo ────────────────────────────
       Ricerca, filtro, ordinamento, pagina e dimensione pagina vivevano in
       tre oggetti diversi — `CRMSmart._v37q`, `_v37page` e le variabili locali
       del render — e ognuno ne conosceva una parte. È il motivo per cui la
       paginazione poteva dire «pagina 2» mentre la tabella disegnava l'elenco
       intero: nessuno dei due sapeva cosa stesse facendo l'altro. */
    CRMSmart._stato = { q:'', tipo:'tutti', ordine:'name_asc', pagina:0, perPagina:30 };

    /* ── SOURCE → SEARCH → FILTER → SORT → PAGINATION ──────────────────────
       In quest'ordine, e in una funzione sola. Paginare prima di filtrare
       significa mostrare una pagina di trenta record di cui ne sopravvivono
       quattro — l'errore classico, e il motivo per cui l'ordine è scritto qui
       sopra invece che lasciato al buon senso di chi modifica. */
    CRMSmart._pipeline = function(){
      var st = this._stato;
      var tutti = this._load();                                   // SOURCE

      var out = tutti;
      var q = (st.q||'').trim().toLowerCase();
      if(q){                                                      // SEARCH
        out = out.filter(function(c){
          return ((c.name||'')+' '+(c.company||'')+' '+(c.email||'')+' '+
                  (c.phone||'')+' '+(c.vat||'')+' '+(c.code||'')+' '+(c.tags||''))
                  .toLowerCase().indexOf(q) >= 0;
        });
      }

      if(st.tipo && st.tipo!=='tutti'){                           // FILTER
        out = out.filter(function(c){
          if(st.tipo==='b2b')     return !!(c.company||c.vat);
          if(st.tipo==='privato') return !(c.company||c.vat);
          if(st.tipo==='telefono')return !!c.phone;
          if(st.tipo==='email')   return !!c.email;
          return true;
        });
      }

      /* Copia prima di ordinare: `sort` lavora sul posto, e riordinare
         l'array restituito da `_load` significherebbe riscrivere la rubrica
         dell'utente ogni volta che si cambia colonna. */
      out = out.slice();                                          // SORT
      var dir = /_desc$/.test(st.ordine) ? -1 : 1;
      var campo = String(st.ordine).replace(/_(asc|desc)$/,'');
      out.sort(function(a,b){
        var va = String((a&&a[campo])||'').toLowerCase();
        var vb = String((b&&b[campo])||'').toLowerCase();
        if(va===vb) return String((a&&a.id)||'').localeCompare(String((b&&b.id)||''));
        return va < vb ? -dir : dir;
      });

      var per = Math.max(1, st.perPagina||30);                    // PAGINATION
      var totalePagine = Math.max(1, Math.ceil(out.length/per));
      var pagina = Math.min(Math.max(0, st.pagina||0), totalePagine-1);
      st.pagina = pagina;

      return {
        tutti: tutti, filtrati: out,
        pagina: out.slice(pagina*per, pagina*per+per),
        numeroPagina: pagina, totalePagine: totalePagine, perPagina: per,
      };
    };

    /** Il contatto dietro un id, senza passare per la posizione. */
    CRMSmart._perId = function(id){
      var data = this._load();
      for(var i=0;i<data.length;i++) if(String(data[i].id)===String(id)) return data[i];
      return null;
    };

    // ── Override render + _buildHTML ────────────────────────────
    CRMSmart.render = function(){
      var el = document.getElementById('view-clienti')||document.getElementById('view-crm');
      if(!el) return;
      /* La selezione **non** si azzera a ogni render: è fatta di id, non di
         posizioni, quindi sopravvive al cambio pagina — che è ciò che chi
         seleziona venti contatti su tre pagine si aspetta. Si azzerano solo
         gli id spariti dalla rubrica. */
      var ctx = this._pipeline();
      var vivi = {};
      ctx.tutti.forEach(function(c){ vivi[String(c.id)] = true; });
      var sel = this._selected || new Set();
      Array.from(sel).forEach(function(id){ if(!vivi[String(id)]) sel.delete(id); });
      this._selected = sel;

      el.innerHTML = this._buildHTML(ctx);
      var fileInp = document.getElementById('crm-file-inp');
      if(fileInp) fileInp.setAttribute('accept','.vcf,.vcard,.csv,.xlsx,.xls,.txt');
    };

    /* I comandi della vista: cambiano lo stato e ridisegnano. Nessuno di loro
       tocca il DOM direttamente — è l'altra metà del motivo per cui la vecchia
       paginazione non funzionava. */
    CRMSmart.filterClients = function(q){ this._stato.q = q||''; this._stato.pagina = 0; this.render(); };
    CRMSmart.setTipo = function(t){ this._stato.tipo = t||'tutti'; this._stato.pagina = 0; this.render(); };
    CRMSmart.setOrdine = function(o){ this._stato.ordine = o||'name_asc'; this._stato.pagina = 0; this.render(); };
    CRMSmart.setPerPagina = function(n){ this._stato.perPagina = Math.max(1, +n||30); this._stato.pagina = 0; this.render(); };
    CRMSmart.vaiAPagina = function(p){ this._stato.pagina = Math.max(0, +p||0); this.render(); };

    CRMSmart._buildHTML = function(ctx){
      /* Retrocompatibilità: se qualcuno chiama ancora `_buildHTML(elenco)`
         con un array, si costruisce il contesto qui invece di disegnare una
         pagina sbagliata in silenzio. */
      if(Array.isArray(ctx)) ctx = { tutti: ctx, filtrati: ctx, pagina: ctx, numeroPagina: 0, totalePagine: 1, perPagina: ctx.length||1 };
      var data = ctx.pagina || [];
      var total = (ctx.tutti||[]).length;
      var withPhone = (ctx.tutti||[]).filter(function(c){ return c.phone; }).length;
      var esc = function(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x];}); };

      /* CRM-05 — le righe le disegna `InglyClienteRiga`, e nessun altro.
         Prima erano quattro copie: questa, i tag riappesi 200 ms dopo dalla
         patch 082 su `#crm-row-<indice>` (che dopo CRM-04 non esiste più),
         la tabella di CRM Pro e quella di `mod:clients`. Il renderer non
         legge dati e non inventa id: riceve la pagina già scelta da
         `_pipeline()`. Senza il modulo la tabella lo dichiara invece di
         disegnare una riga di scorta con un'altra grafia. */
      var R = window.InglyClienteRiga;
      var rows;
      if (R) {
        rows = R.righe(data, {
          selezionati: function(c){ return !!(CRMSmart._selected && CRMSmart._selected.has(c.id)); },
          presetTag: CRMSmart.PRESET_TAGS,
        });
      } else {
        rows = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#f59e0b">'
          + 'Modulo di disegno righe non caricato: l\'elenco non viene mostrato'
          + ' per non disegnarlo in un secondo modo.</td></tr>';
      }

      return '<div style="padding:16px 20px;max-width:1100px;margin:0 auto">'
        // Header
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">'
        +'<div style="display:flex;align-items:center;gap:12px">'
        +'<span style="font-size:26px">👥</span>'
        +'<div><div style="font-size:20px;font-weight:900;color:var(--text)">CRM Clienti</div>'
        +'<div style="font-size:11px;color:var(--text-muted)" id="crm-count-sub">'+total+' clienti · '+withPhone+' con telefono</div>'
        +'</div></div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
        +'<button onclick="CRMSmart._addClient()" style="padding:8px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">+ Aggiungi</button>'
        +'<button onclick="CRMSmart._importFile()" style="padding:8px 16px;background:var(--bg-card2);color:#10b981;border:1.5px solid rgba(16,185,129,.3);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">📂 Importa</button>'
        +'<input id="crm-file-inp" type="file" accept=".vcf,.vcard,.csv,.xlsx,.xls,.txt" style="display:none" onchange="CRMSmart._processFile(this)">'
        +'</div></div>'

        // KPI
        +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">'
        +[{l:'Totale',v:total,c:'#6366f1'},{l:'Con Telefono',v:withPhone,c:'#10b981'},{l:'Importati',v:data.filter(function(x){return x._imported;}).length,c:'#f59e0b'},{l:'Aggiunti oggi',v:data.filter(function(x){return x.added&&x.added.slice(0,10)===new Date().toISOString().slice(0,10);}).length,c:'#ec4899'}]
        .map(function(k){ return '<div style="background:var(--bg-card2);border:1px solid '+k.c+'30;border-radius:12px;padding:12px;text-align:center"><div style="font-size:9px;color:'+k.c+';font-weight:700;text-transform:uppercase;margin-bottom:3px">'+k.l+'</div><div style="font-size:20px;font-weight:900;color:'+k.c+'">'+k.v+'</div></div>'; }).join('')
        +'</div>'

        // Search
        +'<input id="crm-q" value="'+esc(ctx.q!=null?ctx.q:CRMSmart._stato.q)+'" oninput="CRMSmart._cerca(this.value)" placeholder="🔍 Cerca per nome, telefono, azienda, email, P.IVA..." '
        +'style="width:100%;padding:10px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:13px;margin-bottom:10px">'

        // Selection toolbar (initially hidden)
        +'<div id="crm-sel-bar" style="display:none;align-items:center;gap:8px;padding:10px 14px;background:rgba(99,102,241,.1);border:1.5px solid rgba(99,102,241,.3);border-radius:10px;margin-bottom:10px;flex-wrap:wrap">'
        +'<span id="crm-sel-count" style="font-size:12px;font-weight:800;color:var(--primary)">0 selezionati</span>'
        +'<button onclick="CRMSmart._selectAll()" style="padding:5px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text)">☑️ Seleziona tutti</button>'
        +'<button onclick="CRMSmart._deselectAll()" style="padding:5px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text)">⬜ Deseleziona</button>'
        +'<button onclick="CRMSmart._deleteSelected()" style="padding:5px 12px;background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.3);border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">🗑 Elimina selezionati</button>'
        +'<button onclick="CRMSmart._exportSelected(\'vcf\')" style="padding:5px 12px;background:rgba(16,185,129,.1);color:#10b981;border:1px solid rgba(16,185,129,.25);border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">📱 Esporta VCF</button>'
        +'<button onclick="CRMSmart._exportSelected(\'csv\')" style="padding:5px 12px;background:rgba(59,130,246,.1);color:#3b82f6;border:1px solid rgba(59,130,246,.25);border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">📊 Esporta CSV</button>'
        +'</div>'

        // Bulk action bar (always visible bottom)
        +'<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">'
        +'<button onclick="CRMSmart._toggleSelectMode()" id="crm-sel-toggle" style="padding:7px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted);font-weight:700">☐ Seleziona</button>'
        +'<button onclick="CRMSmart._exportAll(\'vcf\')" style="padding:7px 14px;background:var(--bg-card2);border:1px solid rgba(16,185,129,.3);border-radius:8px;cursor:pointer;font-size:11px;color:#10b981;font-weight:700">📱 Esporta tutto VCF</button>'
        +'<button onclick="CRMSmart._exportAll(\'csv\')" style="padding:7px 14px;background:var(--bg-card2);border:1px solid rgba(59,130,246,.3);border-radius:8px;cursor:pointer;font-size:11px;color:#3b82f6;font-weight:700">📊 Esporta tutto CSV</button>'
        +'<button onclick="CRMSmart._deleteAll()" style="padding:7px 14px;background:var(--bg-card2);border:1px solid rgba(239,68,68,.3);border-radius:8px;cursor:pointer;font-size:11px;color:#ef4444;font-weight:700">🗑 Elimina tutti</button>'
        +'</div>'

        // Table
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;overflow:hidden">'
        +'<table id="crm-table" style="width:100%;border-collapse:collapse">'
        +'<thead><tr style="background:var(--bg-card)">'
        +'<th style="padding:9px 10px;text-align:center;width:36px">'
        +'<input type="checkbox" id="crm-chk-all" onchange="CRMSmart._onCheckAll(this.checked)" '
        +'style="width:15px;height:15px;cursor:pointer;accent-color:var(--primary)" title="Seleziona/deseleziona tutti"></th>'
        +'<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Nome</th>'
        +'<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Telefono</th>'
        +'<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Email</th>'
        +'<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Note</th>'
        +'<th style="padding:9px 12px;text-align:center;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Azioni</th>'
        +'</tr></thead>'
        +'<tbody id="crm-tbody">'+rows+'</tbody>'
        +'</table></div>'
        + CRMSmart._barraPagine(ctx)
        +'</div>';
    };

    /* ── La barra delle pagine ─────────────────────────────────────────────
       Costruita **insieme** alle righe, dalla stessa chiamata e dallo stesso
       contesto. La versione precedente la appendeva 200 ms dopo, con numeri
       calcolati da una funzione che non era quella che aveva disegnato la
       tabella: è così che si arriva a «pagina 2 di 5» sopra l'elenco intero. */
    CRMSmart._barraPagine = function(ctx){
      var n = ctx.filtrati.length;
      var st = CRMSmart._stato;
      var bs = 'padding:5px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text)';
      var bas = bs + ';background:var(--primary);color:#000;font-weight:800';
      var p = ctx.numeroPagina, tot = ctx.totalePagine;
      var da = n ? p*ctx.perPagina + 1 : 0;
      var a = Math.min(n, (p+1)*ctx.perPagina);

      var numeri = '';
      var primo = Math.max(0, Math.min(p-3, tot-7));
      for(var i=primo; i<Math.min(tot, primo+7); i++){
        numeri += '<button onclick="CRMSmart.vaiAPagina('+i+')" style="'+(i===p?bas:bs)+'">'+(i+1)+'</button>';
      }

      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 2px">'
        +'<span id="crm-pag-info" style="font-size:11px;color:var(--text-muted)">'
        + (n ? da+'–'+a+' di '+n : 'nessun contatto') + (n ? ' · pagina '+(p+1)+' di '+tot : '') + '</span>'
        +'<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">'
        +'<button onclick="CRMSmart.vaiAPagina(0)" style="'+bs+'" '+(p===0?'disabled':'')+'>« Prima</button>'
        +'<button onclick="CRMSmart.vaiAPagina('+(p-1)+')" style="'+bs+'" '+(p===0?'disabled':'')+'>‹ Prec</button>'
        + numeri
        +'<button onclick="CRMSmart.vaiAPagina('+(p+1)+')" style="'+bs+'" '+(p>=tot-1?'disabled':'')+'>Succ ›</button>'
        +'<button onclick="CRMSmart.vaiAPagina('+(tot-1)+')" style="'+bs+'" '+(p>=tot-1?'disabled':'')+'>Ultima »</button>'
        +'<select onchange="CRMSmart.setPerPagina(this.value)" style="'+bs+'">'
        + [10,25,30,50,100].map(function(v){ return '<option value="'+v+'"'+(v===st.perPagina?' selected':'')+'>'+v+' per pagina</option>'; }).join('')
        +'</select>'
        +'</div></div>';
    };

    // ── Checkbox handlers ────────────────────────────────────────
    CRMSmart._selectMode = false;

    /* `_deleteClient` viveva nella patch 076 e prendeva una posizione: con la
       paginazione che funziona, la posizione a schermo non è più la posizione
       nell'archivio, e il pulsante cancellava un altro contatto. */
    CRMSmart._deleteClient = function(id){
      var c = this._perId(id); if(!c) return;
      if(!confirm('Eliminare "'+(c.name||'questo contatto')+'"?')) return;
      var data = this._load().filter(function(x){ return String(x.id)!==String(id); });
      this._save(data);
      this._selected.delete(String(id));
      this.render();
      if(typeof toast!=='undefined') toast('Contatto rimosso','info');
    };

    CRMSmart._toggleSelectMode = function(){
      this._selectMode = !this._selectMode;
      var btn = document.getElementById('crm-sel-toggle');
      if(btn) btn.textContent = this._selectMode ? '✅ Modalità Selezione ON' : '☐ Seleziona';
      // Show/hide checkbox column
      document.querySelectorAll('[id^="crm-chk-"]').forEach(function(el){
        el.closest('td').style.display = '';
      });
      var bar = document.getElementById('crm-sel-bar');
      if(!this._selectMode && bar){ bar.style.display='none'; this._deselectAll(); }
    };

    /* La selezione è fatta di **id**. Con le posizioni, selezionare tre
       contatti a pagina 1 e passare a pagina 2 selezionava i tre contatti che
       occupavano quelle posizioni nella pagina nuova — e la cancellazione
       multipla cancellava quelli. */
    CRMSmart._onCheck = function(id, checked){
      if(checked) this._selected.add(String(id));
      else this._selected.delete(String(id));
      this._updateSelBar();
    };

    /* «Seleziona tutti» seleziona ciò che l'utente sta guardando — il
       risultato di ricerca e filtro — non l'intera rubrica. Selezionare in
       silenzio 4.000 contatti che non sono a schermo, e poi offrire «elimina
       selezionati», è un modo di perdere dati. */
    CRMSmart._onCheckAll = function(checked){
      var ctx = this._pipeline();
      if(checked){
        ctx.filtrati.forEach(function(c){ CRMSmart._selected.add(String(c.id)); });
      } else {
        this._selected = new Set();
      }
      this.render();
    };

    CRMSmart._selectAll = function(){ this._onCheckAll(true); };

    CRMSmart._deselectAll = function(){
      this._selected = new Set();
      this.render();
    };

    CRMSmart._updateSelBar = function(){
      var n = this._selected.size;
      var bar = document.getElementById('crm-sel-bar');
      var cnt = document.getElementById('crm-sel-count');
      if(bar){ bar.style.display = n>0?'flex':'none'; }
      if(cnt){ cnt.textContent = n+' selezionati'; }
      /* Si evidenziano le righe **a schermo**, cioè quelle della pagina
         corrente: cercare `#crm-row-<id>` per contatti che non sono disegnati
         è lavoro sprecato che cresce con la rubrica. */
      var sel = this._selected;
      document.querySelectorAll('#crm-tbody tr[id^="crm-row-"]').forEach(function(row){
        var id = row.id.slice('crm-row-'.length);
        row.style.background = sel.has(id) ? 'rgba(99,102,241,.06)' : '';
      });
      var ctx = this._pipeline();
      var allChk = document.getElementById('crm-chk-all');
      if(allChk){
        allChk.indeterminate = n>0 && n<ctx.filtrati.length;
        allChk.checked = n>0 && n===ctx.filtrati.length;
      }
    };

    /* Ricerca con antirimbalzo: la pipeline è una sola, e la digitazione la
       attraversa una volta ogni 200 ms invece che a ogni tasto. */
    CRMSmart._cerca = function(q){
      clearTimeout(CRMSmart._timerCerca);
      CRMSmart._timerCerca = setTimeout(function(){
        var attivo = document.activeElement && document.activeElement.id;
        var pos = document.activeElement && document.activeElement.selectionStart;
        CRMSmart.filterClients(q);
        /* Il render sostituisce il campo: si restituisce il fuoco a chi stava
           scrivendo, altrimenti la ricerca diventa inutilizzabile. */
        if(attivo === 'crm-q'){
          var el = document.getElementById('crm-q');
          if(el){ el.focus(); try{ el.setSelectionRange(pos, pos); }catch(e){} }
        }
      }, 200);
    };
    CRMSmart._search = function(q){ CRMSmart._cerca(q); };

    // ── Delete operations ─────────────────────────────────────────
    CRMSmart._deleteSelected = function(){
      var n = this._selected.size;
      if(!n){ if(typeof toast!=='undefined') toast('Nessun contatto selezionato','info'); return; }
      if(!confirm('Eliminare '+n+' contatti selezionati?')) return;
      var sel = this._selected;
      /* Si filtra per id invece di fare `splice` su posizioni ordinate al
         contrario: quella scrittura funzionava solo finché l'elenco a schermo
         era l'elenco salvato, nello stesso ordine. */
      var data = this._load().filter(function(c){ return !sel.has(String(c.id)); });
      this._save(data);
      this._selected = new Set();
      if(typeof toast!=='undefined') toast('🗑 Eliminati '+n+' contatti','success');
      this.render();
    };

    CRMSmart._deleteAll = function(){
      var n = this._load().length;
      if(!n){ if(typeof toast!=='undefined') toast('Rubrica già vuota','info'); return; }
      if(!confirm('⚠️ Eliminare TUTTI i '+n+' contatti dalla rubrica?\n\nQuesta operazione non può essere annullata.')) return;
      this._save([]);
      if(typeof toast!=='undefined') toast('🗑 Rubrica svuotata ('+n+' contatti eliminati)','info');
      this.render();
    };

    // ── Export operations ─────────────────────────────────────────
    CRMSmart._getExportData = function(onlySelected){
      var data = this._load();
      if(onlySelected && this._selected.size>0){
        var sel = this._selected;
        return data.filter(function(c){ return sel.has(String(c.id)); });
      }
      return data;
    };

    CRMSmart._exportToVCF = function(data){
      var vcf = data.map(function(c){
        var lines = ['BEGIN:VCARD','VERSION:3.0'];
        // FN
        lines.push('FN:'+(c.name||''));
        // N: split first/last if possible
        var parts = (c.name||'').split(' ');
        var last = parts.length>1?parts.pop():'';
        var first = parts.join(' ');
        lines.push('N:'+last+';'+first+';;;');
        // TEL
        if(c.phone) lines.push('TEL;TYPE=CELL:'+c.phone);
        // EMAIL
        if(c.email) lines.push('EMAIL:'+c.email);
        // ORG
        if(c.company) lines.push('ORG:'+c.company);
        // NOTE
        if(c.notes) lines.push('NOTE:'+c.notes.replace(/\n/g,'\\n'));
        lines.push('END:VCARD');
        return lines.join('\r\n');
      }).join('\r\n\r\n');
      return vcf;
    };

    CRMSmart._exportToCSV = function(data){
      var rows = [['Nome','Telefono','Email','Azienda','Note','Aggiunto']];
      data.forEach(function(c){
        rows.push([
          c.name||'', c.phone||'', c.email||'', c.company||'',
          (c.notes||'').replace(/,/g,';'),
          c.added?new Date(c.added).toLocaleDateString('it'):''
        ]);
      });
      return rows.map(function(r){
        return r.map(function(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }).join(',');
      }).join('\n');
    };

    CRMSmart._exportSelected = function(fmt){
      var data = this._getExportData(true);
      if(!data.length){ if(typeof toast!=='undefined') toast('Nessun contatto selezionato','info'); return; }
      this._downloadExport(data, fmt, 'contatti_selezionati');
    };

    CRMSmart._exportAll = function(fmt){
      var data = this._load();
      if(!data.length){ if(typeof toast!=='undefined') toast('Rubrica vuota','info'); return; }
      this._downloadExport(data, fmt, 'rubrica_ingly');
    };

    CRMSmart._downloadExport = function(data, fmt, baseName){
      var content, mimeType, ext;
      if(fmt==='vcf'){
        content = this._exportToVCF(data);
        mimeType = 'text/vcard;charset=utf-8';
        ext = 'vcf';
      } else {
        content = this._exportToCSV(data);
        mimeType = 'text/csv;charset=utf-8';
        ext = 'csv';
      }
      var fname = baseName+'_'+new Date().toISOString().slice(0,10)+'.'+ext;
      var blob = new Blob(['\uFEFF'+content], {type: mimeType});
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      a.click();
      if(typeof toast!=='undefined') toast('📥 '+data.length+' contatti esportati → '+fname,'success');
    };

    // ── Search ───────────────────────────────────────────────────
    CRMSmart._search = function(q){
      q = q.toLowerCase();
      var rows = document.querySelectorAll('#crm-tbody tr[id^="crm-row-"]');
      var visible = 0;
      rows.forEach(function(tr){
        var txt = tr.textContent.toLowerCase();
        var show = !q || txt.includes(q);
        tr.style.display = show?'':'none';
        if(show) visible++;
      });
      var sub = document.getElementById('crm-count-sub');
      if(sub && q) sub.textContent = visible+' risultati per "'+q+'"';
      else if(sub){ var data=CRMSmart._load(); sub.textContent=data.length+' clienti · '+data.filter(function(c){return c.phone;}).length+' con telefono'; }
    };

    // ── Edit (inline modal) ──────────────────────────────────────
    CRMSmart._editClient = function(i){
      var client = this._perId(i); if(!client) return;
      var self = this;
      var old = document.getElementById('crm-add-modal'); if(old) old.remove();
      var modal = document.createElement('div');
      modal.id='crm-add-modal';
      modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)';
      modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:460px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5)">'
        +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">'
        +'<span style="font-size:24px">✏️</span>'
        +'<div><div style="font-size:16px;font-weight:900;color:var(--text)">Modifica Cliente</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">'+client.name+'</div></div>'
        +'<button onclick="document.getElementById(\'crm-add-modal\').remove()" style="margin-left:auto;background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:20px">✕</button>'
        +'</div>'
        +'<div style="display:grid;gap:10px">'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Nome *</label><input id="crm-f-name" value="'+client.name+'" style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Azienda</label><input id="crm-f-company" value="'+( client.company||'')+'" style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">📱 Telefono</label><input id="crm-f-phone" value="'+(client.phone||'')+'" type="tel" style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">✉️ Email</label><input id="crm-f-email" value="'+(client.email||'')+'" type="email" style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'</div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">📝 Note</label>'
        +'<textarea id="crm-f-notes" style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;height:60px;resize:vertical">'+( client.notes||'')+'</textarea></div>'
        +'</div>'
        +'<div style="display:flex;gap:8px;margin-top:8px">'
        +'<button onclick="CRMSmart._saveEditModal(\''+i+'\')" style="flex:1;padding:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva Modifiche</button>'
        +'<button onclick="document.getElementById(\'crm-add-modal\').remove()" style="padding:10px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:13px;color:var(--text-muted)">Annulla</button>'
        +'</div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click',function(e){ if(e.target===modal) modal.remove(); });
      setTimeout(function(){ document.getElementById('crm-f-name')?.focus(); },100);
    };

    CRMSmart._saveEditModal = function(i){
      var name = document.getElementById('crm-f-name')?.value?.trim();
      if(!name){ alert('Il nome è obbligatorio!'); return; }
      var data = this._load();
      var pos = -1;
      for(var k=0;k<data.length;k++) if(String(data[k].id)===String(i)) { pos = k; break; }
      if(pos < 0) return;
      var old = data[pos]||{};
      data[pos] = Object.assign({}, old, {
        name, company: document.getElementById('crm-f-company')?.value?.trim()||'',
        phone: document.getElementById('crm-f-phone')?.value?.trim()||'',
        email: document.getElementById('crm-f-email')?.value?.trim()||'',
        notes: document.getElementById('crm-f-notes')?.value?.trim()||'',
      });
      this._save(data);
      document.getElementById('crm-add-modal')?.remove();
      this.render();
      if(typeof toast!=='undefined') toast('✅ '+name+' aggiornato','success');
    };

    console.log('[CRM v26] Selezione multipla + Export VCF/CSV attivato');
  }
  setTimeout(_p, 1500);
})();

