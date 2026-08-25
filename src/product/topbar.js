/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · TOPBAR
   ═══════════════════════════════════════════════════════════════════════════

   La topbar del v96 contava una trentina di controlli: due lenti di ingrandimento,
   una chiave, tre bandiere, un orologio, quattro pastiglie di stato, sei icone
   nuvola e altrettante scorciatoie. Nessuna gerarchia: tutto grande uguale,
   quindi niente in evidenza.

   Qui restano sei elementi:

       workspace · ricerca · azione rapida · notifiche · piano · account

   Il resto **non viene eliminato**. I pulsanti esistenti sono nodi con i loro
   gestori attaccati: vengono spostati dentro un menu "Altri strumenti"
   conservando l'elemento originale, quindi continuano a funzionare esattamente
   come prima. Ricostruirli sarebbe stato il modo più rapido per rompere una
   funzione che nessuno ricorda di avere.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  const UI = global.InglyUI;
  if (!UI) return;

  const esc = UI.esc;
  const MARK = 'data-ingly-topbar';

  /* I controlli che restano in barra, riconosciuti dal loro id storico.
     Quello che non è in questo elenco finisce nel menu, non nel cestino. */
  /* Ricerca e palette hanno il proprio posto in barra: i due pulsanti storici
     che aprivano le versioni precedenti finiscono nel menu, per non avere tre
     modi di aprire tre ricerche diverse. */
  const KEEP = ['quick-capture-btn', 'notif-btn', 'lic-topbar-btn', 'theme-toggle-btn'];

  function labOf() {
    try {
      return localStorage.getItem('ingly_company_name') ||
        localStorage.getItem('ingly_brand_name') || 'INGLY OS';
    } catch (e) {
      return 'INGLY OS';
    }
  }

  function build(bar) {
    if (bar.getAttribute(MARK)) return;
    bar.setAttribute(MARK, '1');

    /* Si conservano i nodi originali: contengono i gestori che il resto
       dell'applicazione ha attaccato negli anni. */
    const originals = [...bar.children];
    const kept = [];
    const overflow = [];

    originals.forEach(function (node) {
      const id = node.id || '';
      if (node.classList && node.classList.contains('logo')) return; // il logo si ridisegna
      if (KEEP.indexOf(id) !== -1) kept.push(node);
      else overflow.push(node);
    });

    const shell = document.createElement('div');
    shell.className = 'tb';
    shell.innerHTML =
      '<div class="tb__workspace">' +
      '<button type="button" class="tb__brand" data-nav="dashboard" title="Vai alla dashboard">' +
      '<span class="tb__mark" aria-hidden="true"></span>' +
      '<span class="tb__brand-text"><span class="tb__brand-name">INGLY OS</span>' +
      '<span class="tb__brand-lab">' + esc(labOf()) + '</span></span></button>' +
      '</div>' +
      '<button type="button" class="tb__search" data-tb-search>' +
      '<i class="fas fa-magnifying-glass" aria-hidden="true"></i>' +
      '<span>Cerca ordini, clienti, materiali…</span>' +
      '<kbd class="tb__kbd">⌘K</kbd></button>' +
      '<div class="tb__right">' +
      '<button type="button" class="btn btn-primary btn-sm tb__action" data-tb-quick>' +
      '<i class="fas fa-plus" aria-hidden="true"></i> Nuovo</button>' +
      '<div class="tb__slot" data-tb-slot></div>' +
      '<div class="tb__more"><button type="button" class="topbar-btn" data-tb-more ' +
      'aria-haspopup="true" aria-expanded="false" title="Altri strumenti">' +
      '<i class="fas fa-ellipsis" aria-hidden="true"></i></button>' +
      '<div class="tb__menu ds-menu" hidden data-tb-menu></div></div>' +
      '</div>';

    bar.innerHTML = '';
    bar.appendChild(shell);

    // I pulsanti che restano tornano in barra, gli altri nel menu: stessi nodi.
    const slot = shell.querySelector('[data-tb-slot]');
    kept.forEach(function (n) { slot.appendChild(n); });

    const menu = shell.querySelector('[data-tb-menu]');
    overflow.forEach(function (n) {
      const row = document.createElement('div');
      row.className = 'tb__menu-row';
      row.appendChild(n);
      menu.appendChild(row);
    });
    if (!overflow.length) shell.querySelector('.tb__more').hidden = true;

    bind(shell, menu);
  }

  function bind(shell, menu) {
    shell.addEventListener('click', function (e) {
      if (e.target.closest('[data-tb-search]')) {
        e.preventDefault();
        return global.InglyPalette && global.InglyPalette.open();
      }
      if (e.target.closest('[data-tb-quick]')) {
        e.preventDefault();
        return quickMenu(e.target.closest('[data-tb-quick]'));
      }
      const more = e.target.closest('[data-tb-more]');
      if (more) {
        e.preventDefault();
        const open = menu.hidden;
        menu.hidden = !open;
        more.setAttribute('aria-expanded', String(open));
        return;
      }
      // Un clic su uno strumento del menu lo richiude: resta aperto solo
      // finché serve.
      if (e.target.closest('[data-tb-menu]')) menu.hidden = true;
    });

    document.addEventListener('click', function (e) {
      if (menu.hidden) return;
      if (!e.target.closest('.tb__more')) menu.hidden = true;
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') menu.hidden = true;
    });
  }

  const QUICK = [
    { label: 'Nuovo prodotto', icon: 'fa-cube', run: function () {
      if (global.ProductBuilder) global.ProductBuilder.open();
    } },
    { label: 'Nuovo preventivo', icon: 'fa-file-invoice', section: 'quoter' },
    { label: 'Nuovo ordine', icon: 'fa-clipboard-list', section: 'gestione_ordini' },
    { label: 'Nuovo cliente', icon: 'fa-user-plus', section: 'clienti' },
    { label: 'Registra vendita', icon: 'fa-receipt', section: 'sales' },
  ];

  function quickMenu(anchor) {
    const existing = document.querySelector('.tb__quick-menu');
    if (existing) return existing.remove();

    const menu = document.createElement('div');
    menu.className = 'ds-menu tb__quick-menu';
    menu.innerHTML = QUICK.map(function (q, i) {
      return '<button type="button" class="ds-menu__item" data-tb-quick-index="' + i + '">' +
        '<i class="fas ' + esc(q.icon) + '" aria-hidden="true"></i>' + esc(q.label) + '</button>';
    }).join('');

    const r = anchor.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = r.bottom + 6 + 'px';
    menu.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
    document.body.appendChild(menu);

    menu.addEventListener('click', function (e) {
      const b = e.target.closest('[data-tb-quick-index]');
      if (!b) return;
      const q = QUICK[+b.getAttribute('data-tb-quick-index')];
      menu.remove();
      if (q.run) return q.run();
      if (q.section && global.App && global.App.navigate) global.App.navigate(q.section);
    });

    setTimeout(function () {
      document.addEventListener('click', function once(ev) {
        if (menu.contains(ev.target)) return;
        menu.remove();
        document.removeEventListener('click', once);
      });
    }, 0);
  }

  let attempts = 0;
  (function wait() {
    const bar = document.getElementById('topbar');
    /* Si aspetta che la topbar sia popolata: ricostruirla prima significherebbe
       spostare pulsanti che non esistono ancora. */
    if (bar && bar.children.length > 3) {
      build(bar);
      global.InglyTopbar = { rebuild: function () { bar.removeAttribute(MARK); build(bar); } };
      return;
    }
    if (++attempts > 40) return;
    setTimeout(wait, 250);
  })();
})(window);
