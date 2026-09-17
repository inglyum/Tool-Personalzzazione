/* ═══════════════════════════════════════════════════════════════════════════
   LANCIO — accesso, listino, abbonamento
   ═══════════════════════════════════════════════════════════════════════════

   Tre schermate che un prodotto commerciale deve avere e che qui non c'erano
   in forma presentabile: la porta d'ingresso, il listino, e il posto dove si
   vede che cosa si sta pagando.

   ── Perché ridisegna invece di riscrivere ───────────────────────────────

   La schermata di accesso esisteva già, con la sua logica — quella che è
   appena stata messa in sicurezza. Riscriverla da capo vorrebbe dire
   riscrivere anche quella. Qui si sostituisce **solo l'aspetto**, e i campi
   conservano gli stessi `id`: `gate-user`, `gate-pass`, `gate-submit`,
   `gate-err`, `reg-*`. Il codice che legge quei campi non sa che la schermata
   è cambiata, ed è esattamente quello che si vuole da un intervento
   reversibile.

   ── Niente emoji come struttura ─────────────────────────────────────────

   Un'emoji al posto di un'icona è un carattere che cambia forma su ogni
   sistema operativo e non ha un nome accessibile. Dove serve un segno, qui
   c'è un SVG con il suo `aria-hidden`; dove serve un significato, c'è del
   testo.

   ── Il listino non è scritto qui ────────────────────────────────────────

   Ogni prezzo e ogni funzione arrivano da `InglyPiani`. Se questa schermata
   contenesse un «€39» scritto a mano, quel numero prima o poi direbbe una
   cosa diversa da quella che il cliente paga.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  function P() { return global.InglyPiani; }
  function A() { return global.InglyAbbonamento; }
  function E() { return global.InglyEntitlements; }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function eur(v) {
    return '€' + Number(v || 0).toLocaleString('it-IT',
      { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  /* ── Segni ─────────────────────────────────────────────────────────────
     Quattro SVG, non quattro emoji. Nascosti agli assistenti vocali, che
     leggono il testo accanto e non il disegno. */
  var SEGNI = {
    spunta: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">'
      + '<path d="M2 8.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2" '
      + 'stroke-linecap="round" stroke-linejoin="round"/></svg>',
    meno: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">'
      + '<path d="M3.5 8h9" fill="none" stroke="currentColor" stroke-width="2" '
      + 'stroke-linecap="round"/></svg>',
    lucchetto: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">'
      + '<rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/>'
      + '<path d="M5.5 7V5a2.5 2.5 0 015 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    occhio: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">'
      + '<path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" fill="none" '
      + 'stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="2" fill="none" '
      + 'stroke="currentColor" stroke-width="1.4"/></svg>',
  };

  /* ── Lo stile ──────────────────────────────────────────────────────────
     Tutto in variabili del design system, così tema chiaro e scuro
     funzionano senza un secondo foglio di stile. */

  var CSS = [
    '.ly{--ly-gap:16px;--ly-r:14px}',
    /* Accesso */
    '#saas-gate.ly-gate{position:fixed;inset:0;z-index:9999;display:flex;background:var(--bg,#0b0f17)}',
    '.ly-gate *{box-sizing:border-box}',
    '.ly-aside{flex:1 1 52%;display:flex;flex-direction:column;justify-content:space-between;',
    'padding:clamp(28px,5vw,64px);background:linear-gradient(160deg,var(--bg2,#111826),var(--bg,#0b0f17));',
    'border-right:1px solid var(--border,#1f2937);position:relative;overflow:hidden}',
    '.ly-aside::after{content:"";position:absolute;right:-30%;top:-20%;width:70%;height:70%;',
    'border-radius:50%;background:radial-gradient(circle,var(--primary,#6366f1)22,transparent 70%)}',
    '.ly-mark{font:800 15px/1 var(--font-sans,system-ui);letter-spacing:.18em;text-transform:uppercase;color:var(--text,#e5e7eb)}',
    '.ly-mark span{color:var(--primary,#6366f1)}',
    '.ly-claim{font:700 clamp(26px,3.4vw,44px)/1.15 var(--font-sans,system-ui);color:var(--text,#f3f4f6);',
    'letter-spacing:-.02em;max-width:15ch;margin:0 0 14px}',
    '.ly-claim em{font-style:normal;color:var(--primary,#6366f1)}',
    '.ly-sub{font:400 15px/1.7 var(--font-sans,system-ui);color:var(--text-muted,#9ca3af);max-width:46ch;margin:0}',
    '.ly-points{list-style:none;margin:28px 0 0;padding:0;display:grid;gap:10px}',
    '.ly-points li{display:flex;gap:10px;align-items:flex-start;font:400 14px/1.5 var(--font-sans,system-ui);color:var(--text-muted,#9ca3af)}',
    '.ly-points svg{color:var(--primary,#6366f1);flex:none;margin-top:3px}',
    '.ly-foot{font:400 12px/1.6 var(--font-sans,system-ui);color:var(--text-muted,#6b7280);position:relative;z-index:1}',
    '.ly-panel{flex:1 1 48%;display:flex;align-items:center;justify-content:center;padding:clamp(24px,4vw,48px);overflow-y:auto}',
    '.ly-card{width:100%;max-width:400px}',
    '.ly-h1{font:700 26px/1.2 var(--font-sans,system-ui);color:var(--text,#f3f4f6);margin:0 0 6px;letter-spacing:-.01em}',
    '.ly-h2{font:400 14px/1.6 var(--font-sans,system-ui);color:var(--text-muted,#9ca3af);margin:0 0 26px}',
    '.ly-field{margin-bottom:14px}',
    '.ly-label{display:block;font:600 12px/1 var(--font-sans,system-ui);color:var(--text-muted,#9ca3af);margin-bottom:7px}',
    '.ly-inputwrap{position:relative;display:flex;align-items:center}',
    '.ly-gate input[type=text],.ly-gate input[type=email],.ly-gate input[type=password]{',
    'width:100%;height:46px;padding:0 14px;border-radius:10px;border:1px solid var(--border,#374151);',
    'background:var(--bg-card,#151b26);color:var(--text,#f3f4f6);font:400 15px var(--font-sans,system-ui);',
    'transition:border-color .15s,box-shadow .15s}',
    '.ly-gate input:focus{outline:none;border-color:var(--primary,#6366f1);box-shadow:0 0 0 3px var(--primary,#6366f1)26}',
    '.ly-gate input[aria-invalid=true]{border-color:var(--red,#ef4444)}',
    '.ly-reveal{position:absolute;right:6px;height:34px;width:34px;display:flex;align-items:center;justify-content:center;',
    'background:none;border:none;color:var(--text-muted,#9ca3af);cursor:pointer;border-radius:8px}',
    '.ly-reveal:hover{color:var(--text,#f3f4f6);background:var(--bg-card2,#1c2331)}',
    '.ly-reveal:focus-visible{outline:2px solid var(--primary,#6366f1);outline-offset:2px}',
    '.ly-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:4px 0 20px;flex-wrap:wrap}',
    '.ly-check{display:flex;align-items:center;gap:8px;font:400 13px var(--font-sans,system-ui);color:var(--text-muted,#9ca3af);cursor:pointer}',
    '.ly-check input{width:16px;height:16px;accent-color:var(--primary,#6366f1)}',
    '.ly-link{font:500 13px var(--font-sans,system-ui);color:var(--primary,#6366f1);text-decoration:none;cursor:pointer;background:none;border:none;padding:0}',
    '.ly-link:hover{text-decoration:underline}',
    '.ly-link:focus-visible{outline:2px solid var(--primary,#6366f1);outline-offset:2px;border-radius:4px}',
    '.ly-cta{width:100%;height:46px;border:none;border-radius:10px;background:var(--primary,#6366f1);color:#fff;',
    'font:600 15px var(--font-sans,system-ui);cursor:pointer;transition:filter .15s,transform .05s;',
    'display:flex;align-items:center;justify-content:center;gap:8px}',
    '.ly-cta:hover:not(:disabled){filter:brightness(1.08)}',
    '.ly-cta:active:not(:disabled){transform:translateY(1px)}',
    '.ly-cta:disabled{opacity:.6;cursor:progress}',
    '.ly-cta:focus-visible{outline:2px solid var(--primary,#6366f1);outline-offset:3px}',
    '.ly-err{display:none;margin-top:12px;padding:10px 13px;border-radius:9px;font:400 13px/1.5 var(--font-sans,system-ui);',
    'background:var(--red,#ef4444)1a;color:var(--red-300,#fca5a5);border:1px solid var(--red,#ef4444)40}',
    '.ly-div{display:flex;align-items:center;gap:12px;margin:22px 0;color:var(--text-muted,#6b7280);',
    'font:400 12px var(--font-sans,system-ui)}',
    '.ly-div::before,.ly-div::after{content:"";flex:1;height:1px;background:var(--border,#374151)}',
    '.ly-switch{text-align:center;font:400 13px var(--font-sans,system-ui);color:var(--text-muted,#9ca3af)}',
    '.ly-legal{margin-top:24px;text-align:center;font:400 11px/1.6 var(--font-sans,system-ui);color:var(--text-muted,#6b7280)}',
    '.ly-mark-m{display:none}',
    '@media(max-width:900px){',
    '#saas-gate.ly-gate{flex-direction:column;overflow-y:auto}',
    '.ly-aside{display:none}',
    '.ly-mark-m{display:block;margin-bottom:26px}',
    '.ly-panel{flex:1;align-items:flex-start;padding:28px 20px 40px}',
    '.ly-card{max-width:100%}',
    '.ly-gate input,.ly-cta{height:48px}',
    '}',
    /* Listino e abbonamento */
    '.ly-wrap{padding:8px 0 32px}',
    '.ly-hero{text-align:center;max-width:620px;margin:0 auto 28px}',
    '.ly-hero h2{font:700 clamp(22px,3vw,32px)/1.2 var(--font-sans,system-ui);color:var(--text,#f3f4f6);margin:0 0 10px;letter-spacing:-.01em}',
    '.ly-hero p{font:400 15px/1.6 var(--font-sans,system-ui);color:var(--text-muted,#9ca3af);margin:0}',
    '.ly-toggle{display:flex;justify-content:center;align-items:center;gap:10px;margin:0 0 26px;flex-wrap:wrap}',
    '.ly-seg{display:inline-flex;padding:3px;border-radius:99px;background:var(--bg-card2,#1c2331);border:1px solid var(--border,#374151)}',
    '.ly-seg button{border:none;background:none;padding:7px 16px;border-radius:99px;cursor:pointer;',
    'font:600 13px var(--font-sans,system-ui);color:var(--text-muted,#9ca3af)}',
    '.ly-seg button[aria-pressed=true]{background:var(--primary,#6366f1);color:#fff}',
    '.ly-seg button:focus-visible{outline:2px solid var(--primary,#6366f1);outline-offset:2px}',
    '.ly-save{font:600 12px var(--font-sans,system-ui);color:var(--green,#22c55e)}',
    '.ly-plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;align-items:start}',
    '.ly-plan{border:1px solid var(--border,#374151);border-radius:var(--ly-r);padding:22px;background:var(--bg-card,#151b26);position:relative}',
    '.ly-plan[data-top=true]{border-color:var(--primary,#6366f1);box-shadow:0 0 0 1px var(--primary,#6366f1)}',
    '.ly-badge{position:absolute;top:-10px;left:22px;padding:3px 10px;border-radius:99px;background:var(--primary,#6366f1);',
    'color:#fff;font:700 10px/1.6 var(--font-sans,system-ui);letter-spacing:.06em;text-transform:uppercase}',
    '.ly-plan h3{font:700 18px var(--font-sans,system-ui);color:var(--text,#f3f4f6);margin:0 0 3px}',
    '.ly-target{font:400 12px var(--font-sans,system-ui);color:var(--text-muted,#6b7280);margin:0 0 16px}',
    '.ly-price{display:flex;align-items:baseline;gap:5px;margin-bottom:4px}',
    '.ly-price b{font:700 34px/1 var(--font-sans,system-ui);color:var(--text,#f3f4f6);letter-spacing:-.02em}',
    '.ly-price span{font:400 13px var(--font-sans,system-ui);color:var(--text-muted,#9ca3af)}',
    '.ly-price-note{font:400 12px var(--font-sans,system-ui);color:var(--text-muted,#6b7280);margin:0 0 18px;min-height:18px}',
    '.ly-feats{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:9px}',
    '.ly-feats li{display:flex;gap:9px;align-items:flex-start;font:400 13px/1.45 var(--font-sans,system-ui);color:var(--text-muted,#9ca3af)}',
    '.ly-feats li[data-on=true]{color:var(--text,#e5e7eb)}',
    '.ly-feats svg{flex:none;margin-top:2px}',
    '.ly-feats li[data-on=true] svg{color:var(--green,#22c55e)}',
    '.ly-feats li[data-on=false] svg{color:var(--text-muted,#4b5563)}',
    '.ly-lock{border:1px dashed var(--border,#374151);border-radius:var(--ly-r);padding:26px;text-align:center;max-width:460px;margin:24px auto}',
    '.ly-lock h3{font:700 17px var(--font-sans,system-ui);color:var(--text,#f3f4f6);margin:12px 0 8px}',
    '.ly-lock p{font:400 14px/1.6 var(--font-sans,system-ui);color:var(--text-muted,#9ca3af);margin:0 0 18px}',
    '.ly-lock-tag{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:99px;',
    'background:var(--primary,#6366f1)1f;color:var(--primary,#6366f1);font:700 11px var(--font-sans,system-ui);letter-spacing:.05em;text-transform:uppercase}',
    '.ly-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:40px;padding:0 20px;border-radius:9px;',
    'border:none;background:var(--primary,#6366f1);color:#fff;font:600 14px var(--font-sans,system-ui);cursor:pointer}',
    '.ly-btn.ghost{background:none;border:1px solid var(--border,#374151);color:var(--text,#e5e7eb)}',
    '.ly-btn:focus-visible{outline:2px solid var(--primary,#6366f1);outline-offset:2px}',
    '.ly-state{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin-bottom:22px}',
    '.ly-tile{border:1px solid var(--border,#374151);border-radius:var(--ly-r);padding:16px;background:var(--bg-card,#151b26)}',
    '.ly-tile dt{font:600 11px var(--font-sans,system-ui);color:var(--text-muted,#6b7280);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}',
    '.ly-tile dd{margin:0;font:700 19px var(--font-sans,system-ui);color:var(--text,#f3f4f6)}',
    '.ly-tile small{display:block;margin-top:4px;font:400 12px var(--font-sans,system-ui);color:var(--text-muted,#9ca3af)}',
    '.ly-meter{height:6px;border-radius:99px;background:var(--bg-card2,#1c2331);margin-top:9px;overflow:hidden}',
    '.ly-meter i{display:block;height:100%;border-radius:99px;background:var(--primary,#6366f1)}',
    '.ly-meter i[data-warn=true]{background:var(--amber-500,#f59e0b)}',
    '.ly-meter i[data-full=true]{background:var(--red,#ef4444)}',
    '.ly-note{padding:12px 15px;border-radius:10px;font:400 13px/1.6 var(--font-sans,system-ui);margin-bottom:18px}',
    '@media(prefers-reduced-motion:reduce){.ly-cta,.ly-gate input{transition:none}}',
  ].join('');

  function stile() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('ly-style')) return;
    var s = document.createElement('style');
    s.id = 'ly-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ── La schermata di accesso ──────────────────────────────────────────── */

  function markupAccesso() {
    var c = P();
    var giorni = c ? c.GIORNI_TRIAL : 14;
    var punti = [
      'Preventivi che tengono conto di materiale, macchina, tempo ed energia.',
      'Dal preventivo all’ordine alla produzione, senza riscrivere niente.',
      'Costo reale accanto a quello previsto, su ogni lavoro.',
    ];
    return '<aside class="ly-aside">'
      + '<div class="ly-mark">INGLY <span>OS</span></div>'
      + '<div>'
      + '<h1 class="ly-claim">Il laboratorio, <em>tutto insieme</em>.</h1>'
      + '<p class="ly-sub">Preventivi, ordini, produzione e conti in un posto solo. '
      + 'Pensato per chi lavora con laser, stampa 3D, UV e tessile.</p>'
      + '<ul class="ly-points">' + punti.map(function (p) {
        return '<li>' + SEGNI.spunta + '<span>' + esc(p) + '</span></li>';
      }).join('') + '</ul>'
      + '</div>'
      + '<div class="ly-foot">INGLY Design · Valle del Belice, Sicilia</div>'
      + '</aside>'

      + '<section class="ly-panel">'
      + '<div class="ly-card">'
      + '<div class="ly-mark ly-mark-m">INGLY <span>OS</span></div>'

      /* Accesso — gli id restano quelli che la logica conosce. */
      + '<div id="gate-login">'
      + '<h2 class="ly-h1" id="gf-title">Bentornato</h2>'
      + '<p class="ly-h2" id="gf-sub">Accedi al tuo workspace</p>'
      /* Il campo era `type="email"`: il browser applica la propria validazione
         di formato email e mostra il campo come non valido appena qualcuno
         scrive uno username. La logica sotto (SaaSGate.login/doLogin) accetta
         da sempre sia l'username sia l'email — era solo il campo a
         dichiarare, sbagliando, di accettarne una sola. */
      + '<div class="ly-field"><label class="ly-label" for="gate-user">Username o email</label>'
      + '<div class="ly-inputwrap"><input id="gate-user" type="text" autocomplete="username" '
      + 'placeholder="Il tuo username o la tua email" aria-describedby="gate-err"></div></div>'
      + '<div class="ly-field"><label class="ly-label" for="gate-pass">Password</label>'
      + '<div class="ly-inputwrap"><input id="gate-pass" type="password" autocomplete="current-password" '
      + 'placeholder="La tua password" aria-describedby="gate-err" '
      + 'onkeydown="if(event.key===\'Enter\')SaaSGate.login()">'
      + '<button type="button" class="ly-reveal" aria-label="Mostra la password" '
      + 'onclick="InglyLancio.mostraPassword(this,\'gate-pass\')">' + SEGNI.occhio + '</button></div></div>'
      + '<div class="ly-row">'
      + '<label class="ly-check"><input type="checkbox" id="gate-remember"> Resta connesso</label>'
      + '<button type="button" class="ly-link" onclick="InglyLancio.recupero()">Password dimenticata?</button>'
      + '</div>'
      + '<button class="ly-cta" id="gate-submit" onclick="SaaSGate.login()">Accedi</button>'
      + '<div class="ly-err" id="gate-err" role="alert" aria-live="polite"></div>'
      + '<div class="gate-hint" id="gate-hint"></div>'
      + '<div class="ly-div">oppure</div>'
      + '<div class="ly-switch">Non hai un account? '
      + '<button type="button" class="ly-link" onclick="SaaSGate.showRegister()">Prova ' + giorni + ' giorni gratis</button></div>'
      + '</div>'

      /* Registrazione. */
      + '<div id="gate-register" style="display:none">'
      + '<h2 class="ly-h1">Crea il tuo workspace</h2>'
      + '<p class="ly-h2">' + giorni + ' giorni di prova completa. Nessuna carta richiesta.</p>'
      + '<div class="ly-field"><label class="ly-label" for="reg-lab">Nome del laboratorio</label>'
      + '<div class="ly-inputwrap"><input id="reg-lab" type="text" autocomplete="organization" placeholder="Es. Bottega Belice"></div></div>'
      + '<div class="ly-field"><label class="ly-label" for="reg-user">Nome utente</label>'
      + '<div class="ly-inputwrap"><input id="reg-user" type="text" autocomplete="username" placeholder="Come vuoi essere chiamato"></div></div>'
      + '<div class="ly-field"><label class="ly-label" for="reg-email">Email</label>'
      + '<div class="ly-inputwrap"><input id="reg-email" type="email" autocomplete="email" inputmode="email" placeholder="nome@laboratorio.it"></div></div>'
      + '<div class="ly-field"><label class="ly-label" for="reg-pass">Password</label>'
      + '<div class="ly-inputwrap"><input id="reg-pass" type="password" autocomplete="new-password" '
      + 'placeholder="Almeno 8 caratteri, con un numero" '
      + 'oninput="InglyLancio.forza(this.value)" '
      + 'onkeydown="if(event.key===\'Enter\')SaaSGate.register()">'
      + '<button type="button" class="ly-reveal" aria-label="Mostra la password" '
      + 'onclick="InglyLancio.mostraPassword(this,\'reg-pass\')">' + SEGNI.occhio + '</button></div>'
      + '<div id="reg-forza" class="ly-price-note" aria-live="polite"></div></div>'
      + '<button class="ly-cta" id="reg-submit" onclick="SaaSGate.register()">Inizia la prova gratuita</button>'
      + '<div class="ly-err" id="reg-err" role="alert" aria-live="polite"></div>'
      + '<div class="ly-div">oppure</div>'
      + '<div class="ly-switch">Hai già un account? '
      + '<button type="button" class="ly-link" onclick="SaaSGate.showLogin()">Accedi</button></div>'
      + '</div>'

      + '<p class="ly-legal">Continuando accetti le condizioni di servizio di INGLY Design.<br>'
      + 'Assistenza: inglydesign@gmail.com</p>'
      + '</div></section>';
  }

  /** Sostituisce l'aspetto della schermata di accesso conservandone i campi. */
  function disegnaAccesso() {
    if (typeof document === 'undefined') return false;
    var g = document.getElementById('saas-gate');
    if (!g) return false;
    stile();
    g.classList.add('ly-gate');
    g.innerHTML = markupAccesso();
    return true;
  }

  function mostraPassword(bottone, id) {
    var i = document.getElementById(id);
    if (!i) return;
    var visibile = i.type === 'text';
    i.type = visibile ? 'password' : 'text';
    bottone.setAttribute('aria-label', visibile ? 'Mostra la password' : 'Nascondi la password');
    i.focus();
  }

  function forza(v) {
    var el = document.getElementById('reg-forza');
    if (!el) return;
    var I = global.InglyIdentita;
    if (!I || !v) { el.textContent = ''; return; }
    var r = I.robustezza(v);
    el.textContent = r.ok ? ('Password ' + r.livello) : ('Serve: ' + r.problemi.join(', '));
    el.style.color = r.ok ? 'var(--green,#22c55e)' : 'var(--text-muted,#9ca3af)';
  }

  function recupero() {
    var e = document.getElementById('gate-err');
    if (!e) return;
    /* Non c'è un servizio di posta collegato, e fingere che la mail sia
       partita è peggio che dirlo. */
    e.innerHTML = 'Per reimpostare la password scrivi a '
      + '<a class="ly-link" href="mailto:inglydesign@gmail.com">inglydesign@gmail.com</a>'
      + ' dall’indirizzo del tuo account.';
    e.style.display = 'block';
  }

  /* ── Il listino ───────────────────────────────────────────────────────── */

  var _intervallo = 'monthly';

  function renderPrezzi(host, opzioni) {
    var c = P();
    if (!host) return '';
    stile();
    var o = opzioni || {};
    var intervallo = o.intervallo || _intervallo;
    if (!c) { host.innerHTML = '<p class="ly-note">Listino non disponibile.</p>'; return; }

    var confronto = c.confronto();
    var risparmio = c.risparmioAnnuale('premium');

    var carte = c.elenco().map(function (p) {
      var pr = c.prezzo(p.id, intervallo);
      var mensilizzato = (intervallo === 'yearly' && pr) ? (pr.amount / 12) : null;
      var righe = confronto.filter(function (r) { return r[p.id]; }).slice(0, 9);
      var ordini = p.limiti.orders_month == null ? 'Ordini senza limite'
        : ('Fino a ' + p.limiti.orders_month + ' ordini al mese');
      var utenti = p.limiti.users == null ? 'Utenti illimitati'
        : (p.limiti.users + (p.limiti.users === 1 ? ' utente' : ' utenti'));

      return '<article class="ly-plan" data-top="' + (p.badge ? 'true' : 'false') + '" data-plan="' + esc(p.id) + '">'
        + (p.badge ? '<span class="ly-badge">' + esc(p.badge) + '</span>' : '')
        + '<h3>' + esc(p.nome) + '</h3>'
        + '<p class="ly-target">' + esc(p.target) + '</p>'
        + '<div class="ly-price"><b>' + (pr ? eur(pr.amount) : '—') + '</b>'
        + '<span>' + (intervallo === 'yearly' ? '/anno' : '/mese') + '</span></div>'
        + '<p class="ly-price-note">' + (mensilizzato != null
          ? ('equivale a ' + eur(Math.round(mensilizzato)) + ' al mese') : '&nbsp;') + '</p>'
        + '<button class="ly-btn" data-azione="scegli" data-plan="' + esc(p.id) + '" '
        + 'onclick="InglyLancio.scegli(\'' + esc(p.id) + '\',\'' + esc(intervallo) + '\')">Inizia gratis</button>'
        + '<ul class="ly-feats">'
        + '<li data-on="true">' + SEGNI.spunta + '<span>' + esc(ordini) + '</span></li>'
        + '<li data-on="true">' + SEGNI.spunta + '<span>' + esc(utenti) + '</span></li>'
        + righe.map(function (r) {
          return '<li data-on="true">' + SEGNI.spunta + '<span>' + esc(r.label) + '</span></li>';
        }).join('')
        + '</ul></article>';
    }).join('');

    host.innerHTML = '<div class="ly ly-wrap">'
      + '<header class="ly-hero">'
      + '<h2>Scegli il piano che fa crescere il tuo laboratorio</h2>'
      + '<p>Da preventivo a produzione, vendite e analisi: INGLY OS riunisce tutto in un unico workspace.</p>'
      + '</header>'
      + '<div class="ly-toggle" role="group" aria-label="Periodo di fatturazione">'
      + '<div class="ly-seg">'
      + '<button type="button" aria-pressed="' + (intervallo === 'monthly') + '" onclick="InglyLancio.periodo(\'monthly\')">Mensile</button>'
      + '<button type="button" aria-pressed="' + (intervallo === 'yearly') + '" onclick="InglyLancio.periodo(\'yearly\')">Annuale</button>'
      + '</div>'
      + (risparmio ? '<span class="ly-save">Risparmi ' + risparmio.mesiRegalati
        + ' mesi</span>' : '')
      + '</div>'
      + '<div class="ly-plans">' + carte + '</div>'
      + '<p class="ly-legal" style="margin-top:26px">Tutti i piani partono con '
      + c.GIORNI_TRIAL + ' giorni di prova completa. Nessuna carta richiesta per iniziare. '
      + 'Puoi disdire quando vuoi: l’accesso resta fino alla fine del periodo pagato.</p>'
      + '</div>';
    _ultimoHostPrezzi = host;
  }

  var _ultimoHostPrezzi = null;
  function periodo(v) {
    _intervallo = (v === 'yearly') ? 'yearly' : 'monthly';
    if (_ultimoHostPrezzi) renderPrezzi(_ultimoHostPrezzi, { intervallo: _intervallo });
  }
  function _avvisa(msg, tipo, ms) {
    if (typeof global.toast === 'function') global.toast(msg, tipo || 'info', ms || 7000);
  }

  function _tenant() {
    var s = (global.SaaSGate && global.SaaSGate._session) || null;
    if (!s) {
      try { s = JSON.parse(global.sessionStorage.getItem('ingly_saas_session') || 'null'); }
      catch (e) { s = null; }
    }
    return s ? s.tenant_id : null;
  }

  function _ridisegnaAbbonamento() {
    if (typeof document === 'undefined') return;
    var h = document.getElementById('view-abbonamento')
      || document.querySelector('[data-sezione="abbonamento"]');
    if (!h) return;
    var corpo = h.lastElementChild || h;
    renderAbbonamento(corpo, E() ? E().contesto() : null);
  }

  /**
   * Scegliere un piano non lo attiva: manda a pagarlo. Attivarlo da qui
   * vorrebbe dire regalarlo a chiunque apra la console del browser.
   */
  function scegli(planId, intervallo) {
    var F = global.InglyFatturazione;
    if (!F) { _avvisa('Servizio di pagamento non disponibile.', 'error'); return { ok: false }; }
    var r = F.cambiaPiano(_tenant(), planId, intervallo || 'monthly', {});
    if (r.ok && r.via === 'fornitore') {
      _avvisa('Ti abbiamo aperto la pagina di pagamento. L’abbonamento si attiva '
        + 'appena il pagamento risulta.', 'info', 9000);
    } else if (r.ok) {
      _avvisa('Il cambio di piano sarà applicato al prossimo rinnovo.', 'success', 8000);
      _ridisegnaAbbonamento();
    } else {
      _avvisa(r.motivo, 'info', 12000);
    }
    return r;
  }

  /* ── Il centro abbonamento ────────────────────────────────────────────── */

  function renderAbbonamento(host, contesto) {
    if (!host) return;
    stile();
    var c = P(); var a = A(); var e = E();
    if (!c || !a || !e) { host.innerHTML = '<p class="ly-note">Servizio abbonamenti non disponibile.</p>'; return; }

    var ctx = contesto || e.contesto();
    var s = a.stato(ctx && ctx.abbonamento);
    var piano = s.accesso ? c.piano(s.piano) : null;
    var pr = piano && ctx.abbonamento && ctx.abbonamento.billing_interval
      ? c.prezzo(piano.id, ctx.abbonamento.billing_interval) : null;

    var avviso = '';
    if (s.stato === 'trial' && s.inScadenza) {
      avviso = '<div class="ly-note" style="background:var(--amber-500,#f59e0b)1a;color:var(--amber-300,#fcd34d)">'
        + 'La prova finisce fra ' + s.giorniRimasti
        + (s.giorniRimasti === 1 ? ' giorno' : ' giorni') + '. Scegli un piano per non interrompere il lavoro.</div>';
    } else if (s.stato === 'past_due') {
      avviso = '<div class="ly-note" style="background:var(--red,#ef4444)1a;color:var(--red-300,#fca5a5)">'
        + esc(s.motivo) + '</div>';
    } else if (!s.accesso) {
      avviso = '<div class="ly-note" style="background:var(--red,#ef4444)1a;color:var(--red-300,#fca5a5)">'
        + esc(s.motivo || 'Abbonamento non attivo') + '</div>';
    }

    var uso = e.getUsage(ctx);
    var misure = ['orders_month', 'users'].map(function (k) {
      var l = e.limit(k, ctx);
      var etichetta = k === 'orders_month' ? 'Ordini questo mese' : 'Utenti';
      var valore = l.illimitato ? (l.usato + ' / senza limite') : (l.usato + ' / ' + l.limite);
      var barra = l.illimitato ? '' : '<div class="ly-meter"><i style="width:'
        + Math.min(100, l.pct) + '%" data-warn="' + (l.pct >= 80 && l.pct < 100)
        + '" data-full="' + (l.pct >= 100) + '"></i></div>';
      return '<div class="ly-tile"><dt>' + etichetta + '</dt><dd>' + esc(valore) + '</dd>'
        + barra
        + (!l.illimitato && !l.entro ? '<small>Limite raggiunto</small>' : '') + '</div>';
    }).join('');

    var scadenza = s.scadenza
      ? new Date(s.scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—';

    host.innerHTML = '<div class="ly ly-wrap">'
      + avviso
      + '<dl class="ly-state">'
      + '<div class="ly-tile"><dt>Piano</dt><dd>' + esc(piano ? piano.nome : 'Nessuno') + '</dd>'
      + (pr ? '<small>' + eur(pr.amount) + (pr.billing_interval === 'yearly' ? '/anno' : '/mese') + '</small>' : '')
      + '</div>'
      + '<div class="ly-tile"><dt>Stato</dt><dd style="color:' + esc(s.info.colore) + '">'
      + esc(s.info.label) + '</dd>'
      + (s.giorniRimasti != null ? '<small>' + s.giorniRimasti + ' giorni</small>' : '') + '</div>'
      + '<div class="ly-tile"><dt>' + (s.stato === 'cancelled' ? 'Attivo fino al' : 'Prossimo rinnovo')
      + '</dt><dd style="font-size:15px">' + esc(scadenza) + '</dd></div>'
      + misure
      + '</dl>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:26px">'
      + '<button class="ly-btn" onclick="InglyLancio.vaiAiPrezzi()">Cambia piano</button>'
      + (s.stato === 'active' || s.stato === 'trial'
        ? '<button class="ly-btn ghost" onclick="InglyLancio.disdici()">Disdici</button>' : '')
      + (s.stato === 'cancelled'
        ? '<button class="ly-btn ghost" onclick="InglyLancio.riattiva()">Riattiva</button>' : '')
      + '</div>'
      + (ctx && ctx.abbonamento && ctx.abbonamento.pending_plan_id
        ? '<p class="ly-note">Al prossimo rinnovo passerai al piano '
          + esc((c.piano(ctx.abbonamento.pending_plan_id) || {}).nome
            || ctx.abbonamento.pending_plan_id) + '.</p>'
        : '')
      + '<h3 style="font:700 15px var(--font-sans,system-ui);color:var(--text,#f3f4f6);margin:0 0 12px">Cosa è incluso</h3>'
      + '<ul class="ly-feats" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr));display:grid">'
      + e.tutte(ctx).map(function (f) {
        return '<li data-on="' + f.ok + '">' + (f.ok ? SEGNI.spunta : SEGNI.meno)
          + '<span>' + esc(f.label) + '</span></li>';
      }).join('')
      + '</ul></div>';
  }

  function vaiAiPrezzi() {
    if (global.App && typeof global.App.navigate === 'function') global.App.navigate('prezzi');
  }
  function disdici() {
    var F = global.InglyFatturazione;
    if (!F) { _avvisa('Servizio non disponibile.', 'error'); return { ok: false }; }
    var r = F.disdici(_tenant(), { attore: 'utente' });
    _avvisa(r.ok
      ? 'Abbonamento disdetto. L’accesso resta fino alla fine del periodo già pagato.'
      : r.motivo, r.ok ? 'success' : 'error', 9000);
    if (r.ok) _ridisegnaAbbonamento();
    return r;
  }

  /** Ripensarci prima della scadenza: il periodo è già pagato, non si ripaga. */
  function riattiva() {
    var F = global.InglyFatturazione;
    if (!F) { _avvisa('Servizio non disponibile.', 'error'); return { ok: false }; }
    var r = F.riattiva(_tenant(), { attore: 'utente' });
    _avvisa(r.ok ? 'Abbonamento riattivato.' : r.motivo, r.ok ? 'success' : 'error', 9000);
    if (r.ok) _ridisegnaAbbonamento();
    return r;
  }

  /* ── Il blocco di una funzione ────────────────────────────────────────── */

  /**
   * Quando una funzione non è nel piano non si nasconde: si spiega.
   * Nascondere lascia l'utente a chiedersi dove sia finita; spiegare gli dice
   * che cosa otterrebbe. È anche l'unico modo perché un blocco sia una leva
   * commerciale invece di un vicolo cieco.
   */
  function blocco(funzione, esito) {
    stile();
    var c = P();
    var e = esito || (E() ? E().can(funzione) : null);
    var f = c && c.funzione(funzione);
    var richiesto = e && e.pianoRichiesto;
    var titolo = f ? f.label : 'Questa funzione';
    return '<div class="ly ly-lock">'
      + '<span class="ly-lock-tag">' + SEGNI.lucchetto
      + (richiesto ? esc(richiesto.nome) : 'Non disponibile') + '</span>'
      + '<h3>' + esc(titolo) + '</h3>'
      + '<p>' + esc((e && e.motivo) || 'Non è compresa nel tuo piano.')
      + (richiesto ? ' ' + esc(richiesto.sintesi) : '') + '</p>'
      + '<button class="ly-btn" onclick="InglyLancio.vaiAiPrezzi()">'
      + (richiesto ? 'Scopri ' + esc(richiesto.nome) : 'Vedi i piani') + '</button>'
      + '</div>';
  }

  global.InglyLancio = {
    VERSIONE: VERSIONE,
    SEGNI: SEGNI,
    stile: stile,
    markupAccesso: markupAccesso,
    disegnaAccesso: disegnaAccesso,
    mostraPassword: mostraPassword,
    forza: forza,
    recupero: recupero,
    renderPrezzi: renderPrezzi,
    periodo: periodo,
    scegli: scegli,
    renderAbbonamento: renderAbbonamento,
    vaiAiPrezzi: vaiAiPrezzi,
    disdici: disdici,
    riattiva: riattiva,
    blocco: blocco,
  };
})(typeof window !== 'undefined' ? window : globalThis);
