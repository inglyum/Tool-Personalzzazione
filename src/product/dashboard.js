/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · DASHBOARD — OPERATING CENTER
   ═══════════════════════════════════════════════════════════════════════════

   La schermata che risponde alla domanda con cui si apre il laboratorio la
   mattina: *cosa devo fare oggi?*

   Ordine di lettura, dall'urgente al riflessivo:

       intestazione + azioni rapide
       KPI                      quattro numeri, con confronto reale
       produzione oggi          i centri di lavoro
       richiede attenzione      ritardi, scadenze, incassi
       magazzino · macchine     due colonne
       redditività              dal catalogo, non ricalcolata
       INGLY Intelligence       indicazioni derivate dai conteggi

   Ogni blocco si disegna solo se ha dati. Nessuna sezione mostra un numero
   che non venga da uno store: dove manca il dato compare uno stato vuoto che
   dice quale, e come inserirlo.

   Non sostituisce `Dashboard.render()` del v96: si monta dentro la stessa
   vista, sopra il contenuto esistente, e può essere disattivata togliendo un
   blocco dal build.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  const UI = global.InglyUI;
  const Data = global.InglyData;
  const WC = global.InglyWorkCenter;
  if (!UI || !Data || !WC) return;

  const esc = UI.esc;
  const fmt = UI.fmt;
  const MOUNT_ID = 'ingly-operating-center';

  /* ── Intestazione ───────────────────────────────────────────────────────  */
  const QUICK_ACTIONS = [
    { label: 'Nuovo preventivo', icon: 'fa-file-invoice', section: 'quoter' },
    { label: 'Nuovo prodotto', icon: 'fa-cube', section: 'product_builder' },
    { label: 'Nuovo ordine', icon: 'fa-clipboard-list', section: 'gestione_ordini' },
    { label: 'Magazzino', icon: 'fa-boxes-stacked', section: 'items' },
  ];

  function renderHeader(ws) {
    return '<header class="oc__head">' +
      '<div class="oc__greeting">' +
      '<h1 class="oc__title">' + esc(ws.greeting) + (ws.name ? ', ' + esc(ws.name) : '') + '</h1>' +
      '<p class="oc__meta">' + esc(ws.lab) + ' · ' + esc(ws.date) + '</p>' +
      '</div>' +
      '<div class="oc__actions">' +
      QUICK_ACTIONS.map(function (a) {
        return '<button type="button" class="btn btn-secondary btn-sm" data-nav="' + esc(a.section) + '">' +
          '<i class="fas ' + esc(a.icon) + '" aria-hidden="true"></i> ' + esc(a.label) + '</button>';
      }).join('') +
      '</div></header>';
  }

  /* ── KPI ────────────────────────────────────────────────────────────────
     Il valore è il contenuto: etichetta piccola sopra, confronto piccolo
     sotto. Il trend compare solo se esiste un periodo precedente con cui
     confrontarsi — una freccia verde su un mese senza storia è una bugia. */
  function renderKpis(k) {
    if (k.empty) {
      return '<section class="oc__section">' +
        UI.emptyState({ icon: 'fa-chart-column', title: 'KPI non disponibili', body: k.reason }) +
        '</section>';
    }

    return '<section class="oc__section oc__kpis">' + k.cards.map(function (c) {
      const value = c.value === null ? '—' : fmt.value(c.value, c.format);
      const trend = c.trend === null || c.trend === undefined ? '' :
        '<span class="kpi-delta ' + (c.trend > 0 ? 'is-up' : c.trend < 0 ? 'is-down' : 'is-flat') + '">' +
        '<i class="fas fa-arrow-' + (c.trend > 0 ? 'up' : c.trend < 0 ? 'down' : 'right') + '" aria-hidden="true"></i> ' +
        (c.trend > 0 ? '+' : '') + c.trend + '%</span>';
      const compare = c.compare
        ? '<div class="kpi-card__compare' + (c.compare.tone ? ' is-' + c.compare.tone : '') + '">' +
          esc(c.compare.label) + ' · ' + fmt.value(c.compare.value, c.compare.format) + '</div>'
        : '';

      return '<article class="kpi-card">' +
        '<div class="kpi-label">' + esc(c.label) + '</div>' +
        '<div class="kpi-card__row"><span class="kpi-value">' + value + '</span>' + trend + '</div>' +
        '<div class="kpi-card__period">' + esc(c.period) + '</div>' +
        compare + '</article>';
    }).join('') + '</section>';
  }

  /* ── Produzione oggi ────────────────────────────────────────────────────  */
  function renderProduction(wc) {
    return '<section class="oc__section">' +
      UI.sectionHeader('Produzione oggi', 'Centri di lavoro attivi nel laboratorio',
        wc.empty ? null : { label: 'Ordini', section: 'gestione_ordini' }) +
      WC.grid(wc, { queueLimit: 3 }) +
      '</section>';
  }

  /* ── Richiede attenzione ────────────────────────────────────────────────  */
  function renderAttention(att) {
    if (att.empty) {
      return '<section class="oc__section">' +
        UI.sectionHeader('Richiede attenzione') +
        '<div class="oc__allgood"><i class="fas fa-circle-check" aria-hidden="true"></i> ' +
        esc(att.reason) + '</div></section>';
    }

    return '<section class="oc__section">' +
      UI.sectionHeader('Richiede attenzione', 'Ordini, preventivi e incassi che non possono aspettare') +
      '<div class="oc__attention">' + att.groups.map(function (g) {
        return '<article class="att-card att-card--' + esc(g.tone) + '">' +
          '<div class="att-card__head">' +
          '<span class="att-card__count">' + fmt.number(g.count) + '</span>' +
          '<span class="att-card__label">' + esc(g.label) + '</span>' +
          (g.value ? '<span class="att-card__value">' + fmt.currency(g.value) + '</span>' : '') +
          '</div>' +
          '<ul class="att-card__list">' + g.items.map(function (i) {
            return '<li><span class="att-card__item-title">' + esc(i.title) + '</span>' +
              (i.meta ? '<span class="att-card__item-meta">' + esc(i.meta) + '</span>' : '') + '</li>';
          }).join('') + '</ul>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-nav="' + esc(g.section) + '">Apri</button>' +
          '</article>';
      }).join('') + '</div></section>';
  }

  /* ── Magazzino ──────────────────────────────────────────────────────────  */
  function renderInventory(inv) {
    if (inv.empty) {
      return '<article class="oc__panel">' + UI.sectionHeader('Magazzino') +
        UI.emptyState({ icon: 'fa-boxes-stacked', title: 'Magazzino vuoto', body: inv.reason, action: inv.action }) +
        '</article>';
    }
    if (inv.ok) {
      return '<article class="oc__panel">' +
        UI.sectionHeader('Magazzino', fmt.number(inv.total) + ' articoli · ' + fmt.currency(inv.value),
          { label: 'Apri', section: 'items' }) +
        '<div class="oc__allgood"><i class="fas fa-circle-check" aria-hidden="true"></i> ' +
        'Nessun articolo sotto scorta.</div></article>';
    }

    const row = (i, tone) =>
      '<li class="inv-row"><span class="inv-row__name">' + esc(i.name) + '</span>' +
      '<span class="inv-row__stock is-' + tone + '">' + fmt.number(i.stock) + ' ' + esc(i.unit) + '</span></li>';

    return '<article class="oc__panel">' +
      UI.sectionHeader('Magazzino', fmt.number(inv.total) + ' articoli · ' + fmt.currency(inv.value),
        { label: 'Apri', section: 'items' }) +
      (inv.outCount
        ? '<div class="inv-block"><div class="inv-block__title">' + UI.badge('Esauriti', 'danger') +
          ' <span>' + fmt.number(inv.outCount) + '</span></div>' +
          '<ul class="inv-list">' + inv.out.map((i) => row(i, 'danger')).join('') + '</ul></div>'
        : '') +
      (inv.lowCount
        ? '<div class="inv-block"><div class="inv-block__title">' + UI.badge('Sotto scorta', 'warning') +
          ' <span>' + fmt.number(inv.lowCount) + '</span></div>' +
          '<ul class="inv-list">' + inv.low.map((i) => row(i, 'warning')).join('') + '</ul></div>'
        : '') +
      '</article>';
  }

  /* ── Macchine ───────────────────────────────────────────────────────────  */
  function renderMachines(mac) {
    if (mac.empty) {
      return '<article class="oc__panel">' + UI.sectionHeader('Macchine') +
        UI.emptyState({ icon: 'fa-microchip', title: 'Nessuna macchina', body: mac.reason, action: mac.action }) +
        '</article>';
    }

    const ORDER = [
      ['ready', 'Pronte', 'success'],
      ['running', 'In lavoro', 'info'],
      ['maintenance', 'Manutenzione', 'warning'],
      ['offline', 'Offline', 'danger'],
      ['unknown', 'Stato non indicato', 'neutral'],
    ];

    return '<article class="oc__panel">' +
      UI.sectionHeader('Macchine', fmt.number(mac.total) + ' registrate', { label: 'Apri', section: 'equipment' }) +
      '<div class="mac-states">' + ORDER.filter(function (o) { return mac.counts[o[0]] > 0; })
        .map(function (o) {
          return '<div class="mac-state mac-state--' + o[2] + '">' +
            '<span class="mac-state__count">' + fmt.number(mac.counts[o[0]]) + '</span>' +
            '<span class="mac-state__label">' + esc(o[1]) + '</span></div>';
        }).join('') + '</div>' +
      '<ul class="mac-list">' + mac.list.slice(0, 5).map(function (m) {
        const st = WC.MACHINE_STATE[m.state];
        return '<li class="mac-row"><span class="mac-row__name">' + esc(m.name) + '</span>' +
          '<span class="mac-row__tech">' + esc(m.tech) + '</span>' +
          UI.badge(st.label, st.tone) + '</li>';
      }).join('') + '</ul></article>';
  }

  /* ── Redditività ────────────────────────────────────────────────────────  */
  function renderProfitability(p) {
    if (p.empty) {
      return '<section class="oc__section">' + UI.sectionHeader('Redditività') +
        UI.emptyState({ icon: 'fa-chart-pie', title: 'Margini non calcolabili', body: p.reason, action: p.action }) +
        '</section>';
    }

    const tile = (label, name, value, tone) =>
      '<div class="prof-tile">' +
      '<div class="prof-tile__label">' + esc(label) + '</div>' +
      '<div class="prof-tile__name">' + esc(name) + '</div>' +
      '<div class="prof-tile__value is-' + tone + '">' + fmt.percent(value, 0) + '</div></div>';

    return '<section class="oc__section">' +
      UI.sectionHeader('Redditività',
        'Su ' + fmt.number(p.counted) + ' prodotti con costo e prezzo · target ' + fmt.percent(p.target, 0),
        { label: 'Catalogo', section: 'catalog' }) +
      '<div class="prof-grid">' +
      tile('Margine migliore', p.best.name, p.best.margin, 'success') +
      tile('Margine peggiore', p.worst.name, p.worst.margin, p.worst.margin < p.target ? 'danger' : 'warning') +
      tile('Categoria più redditizia', p.bestCategory.name + ' · ' + p.bestCategory.products + ' prodotti',
        p.bestCategory.margin, 'success') +
      '<div class="prof-tile">' +
      '<div class="prof-tile__label">Sotto il target</div>' +
      '<div class="prof-tile__name">prodotti da rivedere</div>' +
      '<div class="prof-tile__value is-' + (p.belowTarget.length ? 'warning' : 'success') + '">' +
      fmt.number(p.belowTarget.length) + '</div></div>' +
      '</div></section>';
  }

  /* ── INGLY Intelligence ─────────────────────────────────────────────────  */
  function renderInsights(ins) {
    if (ins.empty) {
      return '<section class="oc__section oc__intel">' +
        UI.sectionHeader('INGLY Intelligence') +
        '<div class="oc__allgood' + (ins.tone === 'neutral' ? ' is-neutral' : '') + '">' +
        '<i class="fas ' + (ins.tone === 'neutral' ? 'fa-circle-info' : 'fa-circle-check') + '" aria-hidden="true"></i> ' +
        esc(ins.reason) + '</div></section>';
    }

    return '<section class="oc__section oc__intel">' +
      UI.sectionHeader('INGLY Intelligence', 'Indicazioni ricavate dai dati del laboratorio') +
      '<ul class="intel-list">' + ins.items.map(function (i) {
        return '<li class="intel-item intel-item--' + esc(i.tone) + '">' +
          '<i class="fas ' + (i.tone === 'danger' ? 'fa-triangle-exclamation' :
            i.tone === 'warning' ? 'fa-circle-exclamation' : 'fa-circle-info') + '" aria-hidden="true"></i>' +
          '<div class="intel-item__body">' +
          '<div class="intel-item__text">' + esc(i.text) + '</div>' +
          (i.detail ? '<div class="intel-item__detail">' + esc(i.detail) + '</div>' : '') +
          '</div>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-nav="' + esc(i.section) + '">Vedi</button>' +
          '</li>';
      }).join('') + '</ul></section>';
  }

  /* ── Montaggio ──────────────────────────────────────────────────────────  */
  /* L'Operating Center è la dashboard: possiede la vista invece di affiancarsi
     al contenuto storico.

     Tre dashboard precedenti gli cedono il posto — quella del core, quella di
     `DashboardPro` e quella di ENTERPRISE V1 — ed è una modifica dichiarata in
     `baseline/deliberate-changes.json`. Restano però sei widget che si
     inseriscono per conto proprio, ciascuno con il proprio ritardo, tutti con
     `insertBefore(nodo, vista.firstChild)`: briefing del giorno, advisor,
     pannello Intelligence, griglia widget, azioni di oggi.

     Quello che mostrano è coperto dalle sezioni di questa schermata — KPI,
     "Richiede attenzione", INGLY Intelligence — e impilarli sopra significa
     tre dashboard una sull'altra. Un observer sulla sola vista li rimuove
     mentre arrivano.

     È l'unico punto della Fase 2 che difende il DOM, e ha un limite: dopo un
     numero massimo di recuperi smette e lo dice, invece di restare in lotta
     con un modulo che reinserisse all'infinito. */
  const MAX_RECLAIMS = 24;
  let reclaims = 0;
  let observer = null;

  function claim(view, mount) {
    let removed = 0;
    [...view.children].forEach(function (child) {
      if (child === mount) return;
      child.remove();
      removed += 1;
    });
    return removed;
  }

  function watchView(view, mount) {
    if (observer || !global.MutationObserver) return;
    observer = new MutationObserver(function () {
      if (reclaims >= MAX_RECLAIMS) return;
      if (view.children.length <= 1) return;
      reclaims += claim(view, mount) > 0 ? 1 : 0;
      if (reclaims >= MAX_RECLAIMS) {
        observer.disconnect();
        console.info('[OperatingCenter] recuperi esauriti: la vista resta condivisa.');
      }
    });
    observer.observe(view, { childList: true });
  }

  function host() {
    const view = document.getElementById('view-dashboard');
    if (!view) return null;

    let el = document.getElementById(MOUNT_ID);
    if (!el || el.parentNode !== view) {
      el = document.createElement('div');
      el.id = MOUNT_ID;
      el.className = 'oc';
      view.innerHTML = '';
      view.appendChild(el);
    } else {
      claim(view, el);
    }
    watchView(view, el);
    return el;
  }

  let rendering = false;

  async function render() {
    const el = host();
    if (!el || rendering) return;
    rendering = true;

    if (!el.dataset.rendered) el.innerHTML = '<div class="oc__loading">' + UI.skeleton(4) + '</div>';

    try {
      /* Tutte le letture in parallelo: la dashboard interroga sette store e
         farlo in sequenza si vedrebbe. */
      const [ws, k, wc, att, inv, mac, prof, ins] = await Promise.all([
        Data.workspace(), Data.kpis(), Data.workCenters(), Data.attention(),
        Data.inventory(), Data.machines(), Data.profitability(), Data.insights(),
      ]);

      el.innerHTML =
        renderHeader(ws) +
        renderKpis(k) +
        renderProduction(wc) +
        renderAttention(att) +
        '<section class="oc__section oc__two">' + renderInventory(inv) + renderMachines(mac) + '</section>' +
        renderProfitability(prof) +
        renderInsights(ins);

      el.dataset.rendered = '1';
    } catch (e) {
      console.error('[OperatingCenter]', e);
      el.innerHTML = UI.emptyState({
        icon: 'fa-triangle-exclamation',
        title: 'Non è stato possibile caricare la panoramica',
        body: 'I dati del laboratorio non sono raggiungibili in questo momento. Le altre sezioni continuano a funzionare.',
      });
    } finally {
      rendering = false;
    }
  }

  /* Si ridisegna quando cambia qualcosa che la riguarda, non a intervalli. */
  function watch() {
    if (!global.AppStore || !global.AppStore.on) return;
    ['orders', 'sales', 'items', 'catalog', 'equipment'].forEach(function (store) {
      try {
        global.AppStore.on(store, function () {
          if (global.App && global.App.currentSection === 'dashboard') render();
        });
      } catch (e) { /* store non sottoscrivibile */ }
    });
  }

  let booted = false;
  function boot() {
    if (booted) return true;
    if (!document.getElementById('view-dashboard')) return false;
    booted = true;
    render();
    watch();
    if (global.NavBus && global.NavBus.onAny) {
      global.NavBus.onAny(function (section) { if (section === 'dashboard') render(); });
    }
    /* I moduli storici si agganciano al Bus, non a NavBus: ascoltando anche
       questo evento la dashboard si ridisegna dopo di loro, non prima. */
    try {
      if (global.Bus && global.Bus.on) {
        global.Bus.on('nav:dashboard', function () { setTimeout(render, 400); });
      }
    } catch (e) { /* Bus non disponibile */ }
    global.InglyDashboard = { render: render };
    return true;
  }

  let attempts = 0;
  (function wait() {
    if (boot()) return;
    if (++attempts > 40) return;
    setTimeout(wait, 250);
  })();
})(window);
