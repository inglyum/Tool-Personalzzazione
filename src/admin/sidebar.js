/* ═══════════════════════════════════════════════════════════════════════════
   INGLY CLOUD ADMIN · SIDEBAR
   ═══════════════════════════════════════════════════════════════════════════

   Ricostruisce il menu dalla tassonomia in `nav-map.js`, conservando le classi
   e gli id che il resto della console già usa: `.sb-item[data-page]` per la
   navigazione, `#sb-badge-users` e `#sb-badge-exp` per i contatori che altri
   moduli aggiornano.

   Se il contenitore non c'è, non fa nulla e lascia in piedi il menu esistente.
   ═══════════════════════════════════════════════════════════════════════════ */

(function inglyAdminSidebar(global) {
  'use strict';

  var Nav = global.InglyAdminNav;
  if (!Nav) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function itemMarkup(item) {
    return (
      '<div class="sb-item" role="menuitem" tabindex="0" data-page="' + esc(item.id) + '">' +
      '<i class="fas ' + esc(item.icon) + '" aria-hidden="true"></i>' +
      '<span class="sb-label">' + esc(item.label) + '</span>' +
      // I contatori sono aggiornati per id da altri moduli: vanno disegnati qui.
      (item.badge
        ? '<div class="sb-badge' + (item.badge === 'sb-badge-exp' ? ' yellow' : '') +
          '" id="' + esc(item.badge) + '">0</div>'
        : '') +
      '</div>'
    );
  }

  function render(sidebar) {
    /* Il piede della sidebar (avatar, nome, ruolo, logout) non è navigazione:
       è la stessa identità che `_finishAppInit` popola per id. Va conservato
       così com'è, non ridisegnato. */
    var footer = sidebar.querySelector('.sb-footer');

    var html = '';
    for (var i = 0; i < Nav.ADMIN_NAV.length; i += 1) {
      var group = Nav.ADMIN_NAV[i];
      var items = group.items.filter(function (it) { return !it.planned; });
      if (!items.length) continue;
      html += '<div class="sb-section">' + esc(group.label) + '</div>';
      for (var j = 0; j < items.length; j += 1) html += itemMarkup(items[j]);
    }
    sidebar.innerHTML = html;
    if (footer) sidebar.appendChild(footer);
    sidebar.setAttribute('aria-label', 'Navigazione console');
  }

  function markActive(page) {
    var items = document.querySelectorAll('#sidebar .sb-item[data-page]');
    for (var i = 0; i < items.length; i += 1) {
      var active = items[i].getAttribute('data-page') === page;
      items[i].classList.toggle('active', active);
      if (active) items[i].setAttribute('aria-current', 'page');
      else items[i].removeAttribute('aria-current');
    }
  }

  function bind(sidebar) {
    sidebar.addEventListener('click', function (e) {
      var item = e.target.closest('.sb-item[data-page]');
      if (!item) return;
      var page = item.getAttribute('data-page');
      if (typeof global.nav === 'function') global.nav(page);
      markActive(page);
    });
    sidebar.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var item = e.target.closest('.sb-item[data-page]');
      if (!item) return;
      e.preventDefault();
      item.click();
    });
  }

  var attempts = 0;
  (function waitForSidebar() {
    var sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.querySelector('.sb-item')) {
      render(sidebar);
      bind(sidebar);
      markActive('dashboard');
      global.InglyAdminSidebar = { render: function () { render(sidebar); }, markActive: markActive };
      return;
    }
    if (++attempts > 40) return;
    setTimeout(waitForSidebar, 200);
  })();
})(window);
