/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · SIDEBAR
   ═══════════════════════════════════════════════════════════════════════════

   Sostituisce sette patch che ricostruivano il menu una sopra l'altra — v71
   (nav tidy), v74, v85 e v89 (icone, tre volte), v81 (sidebar unificata,
   "fix flicker + icone doppie"), v83 (polish, "stop ondeggiamento") e la
   rifinitura che toglieva le emoji dalle voci — più la parte di v88 e v90 che
   nascondeva le voci ridondanti con `display:none !important`. Il flicker e le
   icone doppie erano il sintomo: troppi script che riscrivevano lo stesso DOM
   in momenti diversi.

   Qui il menu viene costruito una volta sola da `nav-map.js`. Non tocca la
   navigazione: continua a chiamare `App.navigate`, e ascolta `NavBus` per lo
   stato attivo. Se il DOM non è quello atteso non fa nulla e lascia in piedi
   il menu esistente.
   ═══════════════════════════════════════════════════════════════════════════ */

(function inglySidebar(global) {
  'use strict';

  var Nav = global.InglyNav;
  var icon = global.InglyIconsClass;
  if (!Nav || !icon) return;

  var STORAGE_GROUPS = 'ingly_nav_groups_v1';
  var STORAGE_FAVS = 'ingly_nav_favs_v1';
  var built = false;

  /* Tutto ciò che entra in innerHTML passa da qui: le etichette arrivano dai
     dati, ma il giorno in cui arriveranno da una sezione personalizzata
     dell'utente questa funzione è già al suo posto. */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function readSet(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      return new Set();
    }
  }

  function writeSet(key, set) {
    try {
      localStorage.setItem(key, JSON.stringify([].slice.call(set)));
    } catch (e) {
      /* quota piena: il menu funziona lo stesso, si perde solo la preferenza */
    }
  }

  var collapsed = readSet(STORAGE_GROUPS);
  var favourites = readSet(STORAGE_FAVS);

  function itemMarkup(item, isFav) {
    return (
      '<a class="nav-item" role="menuitem" tabindex="0" href="#" ' +
      'data-section="' + esc(item.id) + '" data-feature="' + esc(item.feature) + '" ' +
      'title="' + esc(item.label) + '">' +
      '<i class="' + icon(item.icon) + '" aria-hidden="true"></i>' +
      '<span>' + esc(item.label) + '</span>' +
      // Alcune voci hanno un contatore che moduli esistenti aggiornano per id.
      // L'elemento va disegnato qui, altrimenti quel codice scrive nel vuoto.
      (item.countId ? '<span class="nav-item__count" id="' + esc(item.countId) + '"></span>' : '') +
      (isFav ? '<i class="fas fa-star nav-item__fav" aria-hidden="true"></i>' : '') +
      '</a>'
    );
  }

  function groupMarkup(group) {
    var isCollapsed = collapsed.has(group.id);
    var primary = group.items.filter(function (i) { return i.primary; });
    var secondary = group.items.filter(function (i) { return !i.primary; });

    var html =
      '<div class="nav-group' + (isCollapsed ? ' is-collapsed' : '') + '" id="ng-' + esc(group.id) + '" ' +
      'data-group="' + esc(group.id) + '">' +
      '<button type="button" class="nav-group-title ng-header" aria-expanded="' + (!isCollapsed) + '" ' +
      'aria-controls="ngi-' + esc(group.id) + '">' +
      '<i class="' + icon(group.icon) + '" aria-hidden="true"></i>' +
      '<span>' + esc(group.label) + '</span>' +
      '<i class="fas fa-chevron-down ng-chevron" aria-hidden="true"></i>' +
      '</button>' +
      '<div class="nav-group-items" id="ngi-' + esc(group.id) + '" role="menu"' +
      (isCollapsed ? ' hidden' : '') + '>';

    for (var i = 0; i < primary.length; i += 1) html += itemMarkup(primary[i], favourites.has(primary[i].id));

    /* Progressive disclosure: le voci secondarie esistono, ma non pesano sulla
       lettura finché non servono. Sono comunque raggiungibili dalla ricerca. */
    if (secondary.length) {
      html +=
        '<details class="nav-more"><summary class="nav-item nav-item--more">' +
        '<i class="fas fa-ellipsis" aria-hidden="true"></i><span>Altro (' + secondary.length + ')</span>' +
        '</summary>';
      for (var j = 0; j < secondary.length; j += 1) html += itemMarkup(secondary[j], favourites.has(secondary[j].id));
      html += '</details>';
    }

    return html + '</div></div>';
  }

  function favouritesMarkup() {
    if (!favourites.size) return '';
    var items = Nav.allItems().filter(function (i) { return favourites.has(i.id); });
    if (!items.length) return '';
    var html =
      '<div class="nav-group" id="ng-favourites"><div class="nav-group-title">' +
      '<i class="fas fa-star" aria-hidden="true"></i><span>Preferiti</span></div>' +
      '<div class="nav-group-items" role="menu">';
    for (var i = 0; i < items.length; i += 1) html += itemMarkup(items[i], false);
    return html + '</div></div>';
  }

  /* Nodi che questa funzione NON ha creato e che quindi non le appartengono:
     la barra dei preferiti, le voci aggiunte dalle patch storiche, i pulsanti
     di ripristino. `innerHTML = …` li cancellava tutti — sette voci di menu e
     la barra dei preferiti sparivano al primo re-render, e non tornavano.

     Un render deve poter girare mille volte e lasciare lo stesso risultato:
     compreso ciò che non ha messo lui. Si mettono da parte e si rimettono. */
  var ADOTTATI = ['#nav-favorites-bar', '#nav-restore-bar', '#core-nav'];

  function ospiti(container) {
    var fuori = [];
    ADOTTATI.forEach(function (sel) {
      var el = container.querySelector(sel);
      if (el) fuori.push(el);
    });
    /* Voci di menu che la tassonomia non conosce: le hanno aggiunte le patch,
       e portano a sezioni che esistono davvero. */
    var noti = {};
    Nav.NAV_GROUPS.forEach(function (g) {
      g.items.forEach(function (it) { noti[it.id] = true; });
    });
    var estranee = container.querySelectorAll('.nav-item[data-section]');
    for (var i = 0; i < estranee.length; i += 1) {
      var sec = estranee[i].getAttribute('data-section');
      if (!noti[sec] && fuori.indexOf(estranee[i]) === -1 &&
          !estranee[i].closest('#nav-favorites-bar')) fuori.push(estranee[i]);
    }
    return fuori;
  }

  function render(container) {
    var conservati = ospiti(container);

    var html =
      '<div class="nav-search">' +
      '<label class="ds-visually-hidden" for="nav-filter">Filtra il menu</label>' +
      '<input id="nav-filter" class="form-control" type="search" placeholder="Filtra il menu…" autocomplete="off">' +
      '</div>' +
      favouritesMarkup();
    for (var i = 0; i < Nav.NAV_GROUPS.length; i += 1) html += groupMarkup(Nav.NAV_GROUPS[i]);
    container.innerHTML = html;

    /* Rimessi dov'erano: le barre in cima, le voci estranee in fondo, dentro
       un gruppo che dice da dove vengono invece di confonderle con le altre. */
    var barre = conservati.filter(function (n) { return n.id; });
    var voci = conservati.filter(function (n) { return !n.id; });

    for (var b = barre.length - 1; b >= 0; b -= 1) container.insertBefore(barre[b], container.firstChild);

    if (voci.length) {
      var extra = document.createElement('div');
      extra.className = 'nav-group';
      extra.id = 'ng-estensioni';
      extra.innerHTML = '<div class="nav-group-title"><span>Estensioni</span></div>';
      var lista = document.createElement('div');
      lista.className = 'nav-group-items';
      voci.forEach(function (v) { lista.appendChild(v); });
      extra.appendChild(lista);
      container.appendChild(extra);
    }
  }

  function markActive(section) {
    var target = Nav.resolveSection(section);
    var items = document.querySelectorAll('#sidebar-nav .nav-item[data-section]');
    for (var i = 0; i < items.length; i += 1) {
      var isActive = items[i].getAttribute('data-section') === target;
      items[i].classList.toggle('active', isActive);
      if (isActive) items[i].setAttribute('aria-current', 'page');
      else items[i].removeAttribute('aria-current');
      /* Se la voce attiva sta fra le secondarie, il gruppo si apre da solo:
         altrimenti l'utente non vede dove si trova. */
      if (isActive) {
        var group = items[i].closest('.nav-group');
        if (group) openGroup(group);
        var more = items[i].closest('details.nav-more');
        if (more) more.open = true;
      }
    }
  }

  function openGroup(group) {
    var id = group.getAttribute('data-group');
    if (!id || !collapsed.has(id)) return;
    collapsed.delete(id);
    writeSet(STORAGE_GROUPS, collapsed);
    group.classList.remove('is-collapsed');
    var body = group.querySelector('.nav-group-items');
    var header = group.querySelector('.ng-header');
    if (body) body.hidden = false;
    if (header) header.setAttribute('aria-expanded', 'true');
  }

  function toggleGroup(group) {
    var id = group.getAttribute('data-group');
    if (!id) return;
    var nowCollapsed = !collapsed.has(id);
    if (nowCollapsed) collapsed.add(id);
    else collapsed.delete(id);
    writeSet(STORAGE_GROUPS, collapsed);
    group.classList.toggle('is-collapsed', nowCollapsed);
    var body = group.querySelector('.nav-group-items');
    var header = group.querySelector('.ng-header');
    if (body) body.hidden = nowCollapsed;
    if (header) header.setAttribute('aria-expanded', String(!nowCollapsed));
  }

  function filter(query) {
    var q = query.trim().toLowerCase();
    var groups = document.querySelectorAll('#sidebar-nav .nav-group');
    for (var i = 0; i < groups.length; i += 1) {
      var visible = 0;
      var links = groups[i].querySelectorAll('.nav-item[data-section]');
      for (var j = 0; j < links.length; j += 1) {
        var match = !q || links[j].textContent.toLowerCase().indexOf(q) !== -1;
        links[j].hidden = !match;
        if (match) visible += 1;
      }
      groups[i].hidden = q && !visible;
      /* Durante una ricerca i gruppi si aprono tutti: nascondere un risultato
         dentro un gruppo chiuso è il modo più rapido per far credere che la
         funzione non esista. */
      var body = groups[i].querySelector('.nav-group-items');
      var more = groups[i].querySelector('details.nav-more');
      if (q) {
        if (body) body.hidden = false;
        if (more) more.open = true;
      } else if (body && collapsed.has(groups[i].getAttribute('data-group'))) {
        body.hidden = true;
      }
    }
  }

  function bind(container) {
    container.addEventListener('click', function (e) {
      var header = e.target.closest('.ng-header');
      if (header) {
        e.preventDefault();
        toggleGroup(header.closest('.nav-group'));
        return;
      }
      var link = e.target.closest('.nav-item[data-section]');
      if (!link) return;
      e.preventDefault();
      var section = link.getAttribute('data-section');
      if (global.App && typeof global.App.navigate === 'function') global.App.navigate(section);
      markActive(section);
      /* Su mobile la sidebar è un pannello a scomparsa: dopo aver scelto si
         chiude, altrimenti copre la schermata appena aperta. */
      var sidebar = document.getElementById('sidebar');
      if (sidebar && window.matchMedia('(max-width: 768px)').matches) sidebar.classList.remove('is-open');
    });

    container.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var link = e.target.closest('.nav-item[data-section]');
      if (!link) return;
      e.preventDefault();
      link.click();
    });

    var input = container.querySelector('#nav-filter');
    if (input) {
      input.addEventListener('input', function () { filter(input.value); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { input.value = ''; filter(''); }
      });
    }
  }

  function install() {
    if (built) return true;
    var container = document.getElementById('sidebar-nav');
    if (!container) return false;
    built = true;
    render(container);
    bind(container);
    container.setAttribute('aria-label', 'Navigazione principale');
    if (global.NavBus && global.NavBus.onAny) global.NavBus.onAny(markActive);
    markActive((global.App && global.App.currentSection) || 'dashboard');
    global.InglySidebar = { render: function () { built = false; install(); }, markActive: markActive, filter: filter };
    return true;
  }

  /* Il DOM della sidebar viene creato dal core: si aspetta che esista, con un
     numero finito di tentativi invece di un polling che non finisce mai. */
  var attempts = 0;
  (function waitForSidebar() {
    if (install()) return;
    if (++attempts > 40) return;
    setTimeout(waitForSidebar, 250);
  })();
})(window);
