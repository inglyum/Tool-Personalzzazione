/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · WORK CENTER
   ═══════════════════════════════════════════════════════════════════════════

   Un centro di lavoro è la vista operativa di una tecnologia: quali macchine
   la servono, quali lavori sono in coda, quale viene dopo.

   Un'unica implementazione per tutte e cinque le tecnologie. Laser, 3D, UV,
   DTF e sublimazione cambiano per quali campi hanno senso — il filamento per
   la stampa 3D, il film per il DTF, la pressa per la sublimazione — non per
   come sono fatte. Quei campi sono dichiarati in `FIELDS`, e il markup è uno.

   I dati arrivano da `InglyData.workCenters()`: ordini reali raggruppati per
   tecnologia, macchine reali dal parco. Se un campo non è stato compilato
   nell'ordine, la riga non lo mostra — non lo stima.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  const UI = global.InglyUI;
  const esc = UI.esc;
  const fmt = UI.fmt;

  /* Cosa mostrare di un lavoro, per tecnologia. Le etichette parlano la lingua
     del reparto: chi stampa in DTF cerca "film", non "materiale". */
  const FIELDS = {
    laser: [
      { key: 'material', label: 'Materiale' },
      { key: 'qty', label: 'Pezzi', format: 'number' },
      { key: 'total', label: 'Valore', format: 'currency' },
    ],
    print3d: [
      { key: 'material', label: 'Filamento / resina' },
      { key: 'qty', label: 'Pezzi', format: 'number' },
      { key: 'total', label: 'Valore', format: 'currency' },
    ],
    uv: [
      { key: 'material', label: 'Supporto' },
      { key: 'qty', label: 'Pezzi', format: 'number' },
      { key: 'total', label: 'Valore', format: 'currency' },
    ],
    dtf: [
      { key: 'material', label: 'Film' },
      { key: 'qty', label: 'Capi', format: 'number' },
      { key: 'total', label: 'Valore', format: 'currency' },
    ],
    sublimation: [
      { key: 'material', label: 'Blank / transfer' },
      { key: 'qty', label: 'Pezzi', format: 'number' },
      { key: 'total', label: 'Valore', format: 'currency' },
    ],
  };

  const STATUS = {
    ready: { label: 'Pronto', dot: 'ready' },
    running: { label: 'In lavorazione', dot: 'running' },
    warning: { label: 'Attenzione', dot: 'warning' },
    'no-machine': { label: 'Nessuna macchina', dot: 'error' },
  };

  const MACHINE_STATE = {
    ready: { label: 'Pronta', tone: 'success' },
    running: { label: 'In lavoro', tone: 'info' },
    maintenance: { label: 'Manutenzione', tone: 'warning' },
    offline: { label: 'Offline', tone: 'danger' },
    unknown: { label: 'Stato non indicato', tone: 'neutral' },
  };

  /* ── WorkCenterStatus ───────────────────────────────────────────────────  */
  function statusBadge(status) {
    const s = STATUS[status] || STATUS.ready;
    return '<span class="ds-workcenter__status">' +
      '<span class="ds-workcenter__dot ds-workcenter__dot--' + s.dot + '" aria-hidden="true"></span>' +
      esc(s.label) + '</span>';
  }

  /* ── WorkCenterHeader ───────────────────────────────────────────────────  */
  function header(center) {
    return '<div class="wc__head">' +
      '<div class="wc__identity">' +
      '<i class="fas ' + esc(center.icon) + ' wc__icon" aria-hidden="true"></i>' +
      '<div><div class="wc__name">' + esc(center.label) + '</div>' +
      '<div class="wc__detail">' + esc(center.detail) + '</div></div>' +
      '</div>' + statusBadge(center.status) + '</div>';
  }

  /* ── WorkCenterMetrics ──────────────────────────────────────────────────
     Tre numeri, non dieci. Coda, macchine, ritardi: è ciò che si guarda da
     lontano passando davanti allo schermo.                                */
  function metrics(center) {
    const cells = [
      { label: 'In coda', value: center.queueLength, format: 'number' },
      { label: 'Macchine', value: center.machineCount, format: 'number' },
      { label: 'In ritardo', value: center.late, format: 'number', tone: center.late > 0 ? 'danger' : null },
    ];
    return '<div class="wc__metrics">' + cells.map(function (c) {
      return '<div class="wc__metric">' +
        '<div class="wc__metric-value' + (c.tone ? ' is-' + c.tone : '') + '">' +
        fmt.value(c.value, c.format) + '</div>' +
        '<div class="wc__metric-label">' + esc(c.label) + '</div></div>';
    }).join('') + '</div>';
  }

  /* ── WorkCenterJob ──────────────────────────────────────────────────────  */
  function job(item, techId, isNext) {
    const fields = (FIELDS[techId] || FIELDS.laser)
      .map(function (f) {
        const v = item[f.key];
        if (v === null || v === undefined || v === '') return null;
        return '<span class="wc__job-field"><span class="wc__job-field-label">' + esc(f.label) + '</span>' +
          esc(f.format ? fmt.value(v, f.format) : v) + '</span>';
      })
      .filter(Boolean)
      .join('');

    const due = item.due
      ? '<span class="wc__job-due' + (item.overdue ? ' is-late' : '') + '">' +
        (item.overdue ? 'scaduto ' : '') + fmt.date(item.due) + '</span>'
      : '';

    return '<li class="wc__job' + (isNext ? ' is-next' : '') + (item.overdue ? ' is-late' : '') + '">' +
      '<div class="wc__job-main">' +
      '<span class="wc__job-title">' + esc(item.title) + '</span>' +
      (item.client ? '<span class="wc__job-client">' + esc(item.client) + '</span>' : '') +
      '</div>' +
      (fields ? '<div class="wc__job-fields">' + fields + '</div>' : '') +
      due + '</li>';
  }

  /* ── WorkCenterQueue ────────────────────────────────────────────────────  */
  function queue(center, limit) {
    if (!center.queueLength) {
      return '<p class="wc__idle">Nessun lavoro assegnato' +
        (center.machineCount ? '. Le macchine sono libere.' : '.') + '</p>';
    }
    const shown = center.queue.slice(0, limit || 3);
    const rest = center.queueLength - shown.length;
    return '<ul class="wc__queue">' +
      shown.map(function (j, i) { return job(j, center.id, i === 0); }).join('') +
      '</ul>' +
      (rest > 0
        ? '<button type="button" class="btn btn-ghost btn-sm wc__more" data-nav="gestione_ordini">' +
          'Altri ' + rest + ' lavori</button>'
        : '');
  }

  /* ── WorkCenterCard ─────────────────────────────────────────────────────  */
  function card(center, options) {
    const opts = options || {};
    const machines = center.machines.length
      ? '<div class="wc__machines">' + center.machines.slice(0, 3).map(function (m) {
          const st = MACHINE_STATE[m.state] || MACHINE_STATE.unknown;
          return '<span class="wc__machine">' + esc(m.name) +
            ' ' + UI.badge(st.label, st.tone) + '</span>';
        }).join('') + '</div>'
      : '<p class="wc__idle">Nessuna macchina di questa tecnologia nel parco.</p>';

    return '<article class="ds-workcenter ds-workcenter--' + esc(center.id) + ' wc" ' +
      'aria-label="Centro di lavoro ' + esc(center.label) + '">' +
      header(center) +
      metrics(center) +
      machines +
      (opts.showQueue === false ? '' : queue(center, opts.queueLimit)) +
      '</article>';
  }

  /* ── La griglia dei centri ──────────────────────────────────────────────  */
  function grid(data, options) {
    if (data.empty) {
      return UI.emptyState({
        icon: 'fa-microchip',
        title: 'Nessun centro di lavoro',
        body: data.reason + ' I centri compaiono quando registri una macchina o assegni una tecnologia a un lavoro.',
        action: data.action,
      });
    }
    return '<div class="wc-grid">' +
      data.centers.map(function (c) { return card(c, options); }).join('') +
      '</div>' +
      (data.unassigned > 0
        ? '<p class="wc-grid__note">' + data.unassigned +
          (data.unassigned === 1 ? ' lavoro attivo non è assegnato' : ' lavori attivi non sono assegnati') +
          ' a una tecnologia e non compare in nessun centro.</p>'
        : '');
  }

  global.InglyWorkCenter = {
    FIELDS, STATUS, MACHINE_STATE,
    statusBadge, header, metrics, job, queue, card, grid,
  };
})(window);
