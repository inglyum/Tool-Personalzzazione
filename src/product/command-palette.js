/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · COMMAND PALETTE E RICERCA GLOBALE
   ═══════════════════════════════════════════════════════════════════════════

   Un solo componente, due modi di aprirlo: `Ctrl/Cmd + K` per i comandi, la
   ricerca della topbar per i dati. Sono la stessa cosa — si scrive e si ottiene
   ciò che serve — e tenerli separati significherebbe due campi di ricerca che
   non trovano le stesse cose.

   Cerca dentro prodotti, ordini, clienti, macchine, materiali e fornitori
   interrogando gli store a ogni ricerca. Nessun indice da tenere allineato,
   nessun secondo database: se un ordine viene modificato, la ricerca lo trova
   aggiornato perché lo legge nel momento in cui lo cerchi.

   I comandi navigano con `App.navigate` e aprono i moduli esistenti. La palette
   non sa fare niente che l'applicazione non sappia già fare: sa solo dove sono
   le cose.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  const UI = global.InglyUI;
  const Data = global.InglyData;
  if (!UI || !Data) return;

  const esc = UI.esc;
  const ID = 'ingly-palette';

  /* I comandi sono dati. Ognuno dichiara cosa fa; nessuno reimplementa nulla. */
  const COMMANDS = [
    { label: 'Vai alla Dashboard', hint: 'Panoramica del laboratorio', icon: 'fa-gauge-high', section: 'dashboard' },
    { label: 'Nuovo prodotto', hint: 'Product Builder', icon: 'fa-cube', run: openBuilder },
    { label: 'Nuovo preventivo', hint: 'Preventivatore', icon: 'fa-file-invoice', section: 'quoter' },
    { label: 'Nuovo ordine', hint: 'Gestione ordini', icon: 'fa-clipboard-list', section: 'gestione_ordini' },
    { label: 'Apri Macchine', hint: 'Parco macchine e attrezzature', icon: 'fa-microchip', section: 'equipment' },
    { label: 'Apri Magazzino', hint: 'Articoli, scorte, fornitori', icon: 'fa-boxes-stacked', section: 'items' },
    { label: 'Apri Clienti', hint: 'CRM', icon: 'fa-users', section: 'clienti' },
    { label: 'Apri Catalogo', hint: 'Prodotti e listini', icon: 'fa-th-large', section: 'catalog' },
    { label: 'Apri AI Assistant', hint: 'Intelligence', icon: 'fa-wand-magic-sparkles', section: 'ai' },
    { label: 'Apri Finance', hint: 'Cassa, costi, fiscale', icon: 'fa-euro-sign', section: 'finance' },
    { label: 'Impostazioni', hint: 'Configurazione del laboratorio', icon: 'fa-gear', section: 'settings' },
    { label: 'Backup e ripristino', hint: 'Esporta o importa i dati', icon: 'fa-floppy-disk', section: 'backup' },
  ];

  function openBuilder() {
    if (global.ProductBuilder && global.ProductBuilder.open) return global.ProductBuilder.open();
    if (global.App && global.App.navigate) global.App.navigate('product_builder');
  }

  /* La navigazione passa dalla tassonomia: un id storico apre la sezione che
     apre davvero, non una schermata vuota. */
  function go(section) {
    const target = global.InglyNav && global.InglyNav.resolveSection
      ? global.InglyNav.resolveSection(section)
      : section;
    if (global.App && global.App.navigate) global.App.navigate(target);
  }

  let el = null;
  let items = [];
  let cursor = 0;
  let seq = 0;

  function build() {
    if (el) return el;
    el = document.createElement('div');
    el.id = ID;
    el.className = 'modal-overlay cp';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Cerca e comandi');
    el.innerHTML =
      '<div class="ds-palette">' +
      '<div class="cp__field">' +
      '<i class="fas fa-magnifying-glass" aria-hidden="true"></i>' +
      '<input class="ds-palette__input" type="text" autocomplete="off" spellcheck="false" ' +
      'placeholder="Cerca un comando, un ordine, un cliente, un materiale…" aria-label="Cerca">' +
      '<kbd class="cp__kbd">esc</kbd>' +
      '</div>' +
      '<div class="cp__results" role="listbox"></div>' +
      '<div class="cp__foot">' +
      '<span><kbd class="cp__kbd">↑</kbd><kbd class="cp__kbd">↓</kbd> scorri</span>' +
      '<span><kbd class="cp__kbd">↵</kbd> apri</span>' +
      '<span>cerca in prodotti, ordini, clienti, macchine, materiali, fornitori</span>' +
      '</div></div>';
    document.body.appendChild(el);

    const input = el.querySelector('input');
    input.addEventListener('input', function () { schedule(input.value); });
    el.addEventListener('click', function (e) {
      if (e.target === el) return close();
      const row = e.target.closest('[data-cp-index]');
      if (row) activate(+row.getAttribute('data-cp-index'));
    });
    el.addEventListener('keydown', onKey);
    return el;
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); return close(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); return move(1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); return move(-1); }
    if (e.key === 'Enter') { e.preventDefault(); return activate(cursor); }
  }

  function move(delta) {
    if (!items.length) return;
    cursor = (cursor + delta + items.length) % items.length;
    paint();
    const active = el.querySelector('.ds-palette__item.is-selected');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function activate(index) {
    const item = items[index];
    if (!item) return;
    close();
    if (item.run) return item.run();
    if (item.section) return go(item.section);
  }

  function paint() {
    const box = el.querySelector('.cp__results');
    if (!items.length) {
      box.innerHTML = '<div class="cp__empty">Nessun risultato. Prova con il nome di un ordine, ' +
        'di un cliente o di un materiale.</div>';
      return;
    }
    let lastGroup = null;
    box.innerHTML = items.map(function (it, i) {
      let head = '';
      if (it.group !== lastGroup) {
        lastGroup = it.group;
        head = '<div class="cp__group">' + esc(it.group) + '</div>';
      }
      return head +
        '<div class="ds-palette__item' + (i === cursor ? ' is-selected' : '') + '" ' +
        'role="option" aria-selected="' + (i === cursor) + '" data-cp-index="' + i + '">' +
        '<i class="fas ' + esc(it.icon) + '" aria-hidden="true"></i>' +
        '<span class="cp__label">' + esc(it.label) + '</span>' +
        (it.hint ? '<span class="cp__hint">' + esc(it.hint) + '</span>' : '') +
        '</div>';
    }).join('');
  }

  function commandsFor(query) {
    const q = query.trim().toLowerCase();
    return COMMANDS
      .filter(function (c) { return !q || (c.label + ' ' + (c.hint || '')).toLowerCase().indexOf(q) !== -1; })
      .map(function (c) { return { ...c, group: 'Comandi' }; });
  }

  let timer = null;
  function schedule(query) {
    clearTimeout(timer);
    // I comandi rispondono subito; i dati dopo una pausa, perché ogni ricerca
    // interroga sei store.
    items = commandsFor(query);
    cursor = 0;
    paint();
    if (query.trim().length < 2) return;
    const mine = ++seq;
    timer = setTimeout(async function () {
      const hits = await Data.search(query);
      if (mine !== seq) return; // una ricerca più recente ha già risposto
      items = commandsFor(query).concat(hits.map(function (h) {
        return { label: h.title, hint: h.meta, icon: h.icon, section: h.section, group: h.kind };
      }));
      cursor = 0;
      paint();
    }, 180);
  }

  function open(initial) {
    build();
    el.classList.add('is-open');
    const input = el.querySelector('input');
    input.value = initial || '';
    schedule(input.value);
    input.focus();
    input.select();
  }

  function close() {
    if (!el) return;
    el.classList.remove('is-open');
    seq += 1; // annulla eventuali ricerche in volo
  }

  /* Scorciatoia globale.
     Nel v96 cinque moduli diversi registrano un gestore su `Ctrl/Cmd + K` —
     due palette dei comandi e tre ricerche — e premendolo si aprivano
     sovrapposte. Questo gestore è in fase di cattura e ferma la propagazione:
     arriva prima di tutti e chiude la questione in un punto solo, invece di
     modificare cinque file.
     Non si attiva mentre si scrive in un campo, tranne dentro la palette. */
  document.addEventListener('keydown', function (e) {
    const isK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K');
    if (!isK) return;
    const t = e.target;
    const typing = t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.closest('#' + ID);
    if (typing) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (el && el.classList.contains('is-open')) close();
    else open();
  }, true);

  global.InglyPalette = { open, close, COMMANDS };
})(window);
