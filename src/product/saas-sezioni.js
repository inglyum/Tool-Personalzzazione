/* ═══════════════════════════════════════════════════════════════════════════
   LE TRE SEZIONI NUOVE — amministrazione, piani, abbonamento
   ═══════════════════════════════════════════════════════════════════════════

   La mappa delle sezioni in `app.js` è un oggetto scritto a mano. Aggiungerci
   dentro tre voci vorrebbe dire modificare il cuore della navigazione per una
   cosa che gli sta accanto.

   Qui si fa come le altre quarantotto patch di navigazione, che è il modo in
   cui questo progetto ha sempre aggiunto sezioni: si avvolge
   `App.renderSection`, si creano i contenitori se mancano, e si passa la
   palla all'implementazione di prima per tutto il resto. Un percorso solo,
   con un anello in più.

   ── Perché «Amministrazione» non compare a tutti ────────────────────────

   La voce di menu si nasconde a chi non è proprietario o amministratore. Ma
   nasconderla non è la protezione: `InglyAmministrazione.render()` rifiuta
   comunque, e lo dice. Il menu è cortesia, il controllo è nel codice.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  var SEZIONI = [
    { id: 'amministrazione', titolo: 'Amministrazione',
      sottotitolo: 'Persone, ruoli e workspace', soloAdmin: true },
    { id: 'prezzi', titolo: 'Piani e prezzi',
      sottotitolo: 'Scegli il piano che fa crescere il tuo laboratorio', soloAdmin: false },
    { id: 'abbonamento', titolo: 'Abbonamento',
      sottotitolo: 'Piano, stato, utilizzo', soloAdmin: false },
    { id: 'sicurezza', titolo: 'Sicurezza',
      sottotitolo: 'La tua password e le postazioni da cui sei connesso', soloAdmin: false },
  ];

  function sessione() {
    try { return JSON.parse(global.sessionStorage.getItem('ingly_saas_session') || 'null'); }
    catch (e) { return null; }
  }

  /** Il contenitore di una sezione, creato se manca. */
  function contenitore(id) {
    if (typeof document === 'undefined') return null;
    var el = document.getElementById('view-' + id);
    if (el) return el;
    var padre = document.getElementById('content-inner')
      || document.querySelector('.section-view')
      && document.querySelector('.section-view').parentNode;
    if (!padre) return null;
    el = document.createElement('div');
    el.id = 'view-' + id;
    el.className = 'section-view';
    el.setAttribute('data-sezione', id);
    padre.appendChild(el);
    return el;
  }

  function intestazione(s) {
    return '<div style="margin-bottom:20px">'
      + '<h1 style="font:700 24px/1.2 var(--font-sans,system-ui);color:var(--text,#f3f4f6);margin:0 0 5px;'
      + 'letter-spacing:-.01em">' + s.titolo + '</h1>'
      + '<p style="font:400 14px var(--font-sans,system-ui);color:var(--text-muted,#9ca3af);margin:0">'
      + s.sottotitolo + '</p></div>';
  }

  function disegna(id) {
    var s = null;
    for (var i = 0; i < SEZIONI.length; i++) if (SEZIONI[i].id === id) s = SEZIONI[i];
    if (!s) return false;
    var el = contenitore(id);
    if (!el) return false;

    var corpo = document.createElement('div');
    el.innerHTML = '';
    el.appendChild(document.createRange().createContextualFragment(intestazione(s)));
    el.appendChild(corpo);

    try {
      if (id === 'amministrazione') {
        if (!global.InglyAmministrazione) throw new Error('modulo amministrazione non caricato');
        global.InglyAmministrazione.render(corpo);
      } else if (id === 'prezzi') {
        if (!global.InglyLancio) throw new Error('modulo lancio non caricato');
        global.InglyLancio.renderPrezzi(corpo);
      } else if (id === 'abbonamento') {
        if (!global.InglyLancio) throw new Error('modulo lancio non caricato');
        var E = global.InglyEntitlements;
        global.InglyLancio.renderAbbonamento(corpo, E ? E.contesto() : null);
      } else if (id === 'sicurezza') {
        if (!global.InglySicurezza) throw new Error('modulo sicurezza non caricato');
        global.InglySicurezza.render(corpo);
      }
    } catch (e) {
      /* Una sezione che non si disegna lo dice: una schermata vuota lascia
         chi guarda a chiedersi se stia caricando. */
      corpo.innerHTML = '<p style="padding:16px;border-radius:10px;font:400 14px var(--font-sans,system-ui);'
        + 'background:var(--red,#ef4444)1a;color:var(--red-300,#fca5a5)">'
        + 'Questa sezione non è disponibile: ' + String(e && e.message) + '</p>';
    }
    return true;
  }

  /** Le voci di menu, aggiunte alla barra laterale se c'è. */
  function voci() {
    if (typeof document === 'undefined') return;
    var nav = document.querySelector('.sidebar-nav') || document.querySelector('#sidebar');
    if (!nav) return;
    var s = sessione();
    var admin = global.InglyAmministrazione
      && global.InglyAmministrazione.puoAmministrare(s && s.ruolo);

    SEZIONI.forEach(function (sez) {
      var esistente = nav.querySelector('[data-nav-saas="' + sez.id + '"]');
      if (sez.soloAdmin && !admin) { if (esistente) esistente.remove(); return; }
      if (esistente) return;
      var a = document.createElement('a');
      a.className = 'nav-item';
      a.setAttribute('data-nav-saas', sez.id);
      a.setAttribute('data-section', sez.id);
      a.href = '#' + sez.id;
      a.textContent = sez.titolo;
      a.onclick = function (ev) {
        ev.preventDefault();
        if (global.App && global.App.navigate) global.App.navigate(sez.id);
      };
      nav.appendChild(a);
    });
  }

  /** Avvolge `renderSection`: le tre sezioni nuove qui, tutto il resto di là. */
  function installa() {
    if (typeof global.App === 'undefined' || !global.App.renderSection) return false;
    if (global.App.__saasSezioni) return true;
    var prima = global.App.renderSection.bind(global.App);
    global.App.renderSection = function (s) {
      for (var i = 0; i < SEZIONI.length; i++) {
        if (SEZIONI[i].id === s) { disegna(s); return; }
      }
      return prima(s);
    };
    global.App.__saasSezioni = true;
    return true;
  }

  function avvia() {
    if (typeof document === 'undefined') return;
    var tentativi = 0;
    (function prova() {
      if (installa()) { voci(); return; }
      if (++tentativi < 60) setTimeout(prova, 250);
    }());
    /* Le voci si rileggono quando cambia la sessione: chi entra come operatore
       non deve vedere l'amministrazione lasciata dal proprietario. */
    if (global.Bus && typeof global.Bus.on === 'function') {
      global.Bus.on('session:changed', voci);
    }
  }

  global.InglySezioniSaaS = {
    VERSIONE: VERSIONE,
    SEZIONI: SEZIONI,
    contenitore: contenitore,
    disegna: disegna,
    voci: voci,
    installa: installa,
    avvia: avvia,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(avvia, 1500); });
    } else { setTimeout(avvia, 1500); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
