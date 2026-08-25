/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · PRIMITIVE DI INTERFACCIA
   ═══════════════════════════════════════════════════════════════════════════

   Le funzioni che i componenti nuovi usano al posto di `alert()`, `confirm()` e
   `prompt()`. Il v96 ne conta 282: bloccano il thread, non si possono stilare,
   e in un prodotto che deve sembrare un'applicazione professionale hanno
   l'aspetto di un errore di sistema.

   Qui non si sostituisce il `toast()` esistente — funziona ed è usato in
   centinaia di punti. Si aggiunge ciò che manca: una conferma e un prompt che
   restituiscono una Promise, così il codice chiamante resta lineare.

       if (await InglyUI.confirm({ title: 'Eliminare?', danger: true })) { … }

   Nessun `onclick` inline: tutti i gestori sono delegati.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── Formattazione ──────────────────────────────────────────────────────
     Un solo posto per i formati: importi, percentuali e conteggi devono
     apparire uguali in tutta l'applicazione.                              */
  const fmt = {
    currency(v) {
      if (v == null || !isFinite(v)) return '—';
      return new Intl.NumberFormat('it-IT', {
        style: 'currency', currency: 'EUR', maximumFractionDigits: v >= 1000 ? 0 : 2,
      }).format(v);
    },
    number(v) {
      if (v == null || !isFinite(v)) return '—';
      return new Intl.NumberFormat('it-IT').format(v);
    },
    percent(v, digits) {
      if (v == null || !isFinite(v)) return '—';
      return v.toFixed(digits == null ? 1 : digits).replace('.', ',') + '%';
    },
    minutes(v) {
      if (v == null || !isFinite(v) || v <= 0) return '—';
      const h = Math.floor(v / 60);
      const m = Math.round(v % 60);
      return h ? h + 'h ' + String(m).padStart(2, '0') + 'm' : m + ' min';
    },
    value(v, format) {
      return format === 'currency' ? fmt.currency(v)
        : format === 'percent' ? fmt.percent(v)
        : format === 'minutes' ? fmt.minutes(v)
        : fmt.number(v);
    },
    date(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      return isNaN(d) ? String(iso) : d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    },
  };

  /* ── Toast ──────────────────────────────────────────────────────────────
     Si appoggia al toast dell'applicazione quando c'è: due sistemi di notifica
     sovrapposti sarebbero un altro layer da consolidare fra un anno. */
  function toast(message, tone, ms) {
    if (typeof global.toast === 'function') {
      try {
        global.toast(message, tone === 'danger' ? 'error' : tone || 'success', ms || 3500);
        return;
      } catch (e) { /* si continua con il nostro */ }
    }
    let region = document.getElementById('ds-toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'ds-toast-region';
      region.className = 'ds-toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    const el = document.createElement('div');
    el.className = 'ds-toast ds-toast--' + (tone || 'success');
    el.innerHTML = '<div class="ds-toast__body">' + esc(message) + '</div>';
    region.appendChild(el);
    setTimeout(function () { el.remove(); }, ms || 3500);
  }

  /* ── Modale ─────────────────────────────────────────────────────────────
     Una sola implementazione per conferme, prompt e contenuti su misura, con
     gestione del focus: ESC chiude, il fuoco entra nel dialogo e non ne esce,
     e alla chiusura torna dove si trovava. Le 31 modali storiche non fanno
     nulla di tutto questo. */
  function openDialog({ title, body, actions, size, onMount, dismissible = true }) {
    const previouslyFocused = document.activeElement;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay is-open';
    overlay.innerHTML =
      '<div class="modal ' + (size === 'sm' ? 'modal-sm' : size === 'lg' ? 'modal-lg' : '') + '" ' +
      'role="dialog" aria-modal="true" aria-label="' + esc(title || 'Finestra') + '">' +
      (title
        ? '<div class="modal-header"><h3 class="modal-title">' + esc(title) + '</h3>' +
          (dismissible ? '<button type="button" class="modal-close" data-ds-close aria-label="Chiudi">✕</button>' : '') +
          '</div>'
        : '') +
      '<div class="modal-body">' + (body || '') + '</div>' +
      (actions && actions.length
        ? '<div class="modal-footer">' + actions.map(function (a, i) {
            return '<button type="button" class="btn ' + (a.variant ? 'btn-' + a.variant : 'btn-secondary') +
              '" data-ds-action="' + i + '">' + esc(a.label) + '</button>';
          }).join('') + '</div>'
        : '') +
      '</div>';

    document.body.appendChild(overlay);

    const dialog = overlay.querySelector('.modal');
    let settled = false;

    function close(result, resolve) {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      if (resolve) resolve(result);
    }

    const FOCUSABLE = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

    function onKey(e) {
      if (e.key === 'Escape' && dismissible) {
        e.preventDefault();
        close(undefined, resolver);
        return;
      }
      if (e.key !== 'Tab') return;
      // Trappola del fuoco: senza, il Tab porta dietro la modale e l'utente
      // si ritrova a interagire con una schermata che non vede.
      const items = [...dialog.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    let resolver = null;
    const promise = new Promise(function (resolve) { resolver = resolve; });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay && dismissible) return close(undefined, resolver);
      if (e.target.closest('[data-ds-close]')) return close(undefined, resolver);
      const btn = e.target.closest('[data-ds-action]');
      if (!btn) return;
      const action = actions[+btn.getAttribute('data-ds-action')];
      const value = action.value !== undefined ? action.value
        : action.collect ? action.collect(dialog)
        : true;
      if (action.keepOpen) return;
      close(value, resolver);
    });

    document.addEventListener('keydown', onKey, true);

    if (onMount) onMount(dialog);
    const firstField = dialog.querySelector('input,textarea,select') || dialog.querySelector('[data-ds-action]');
    if (firstField) firstField.focus();

    return { promise, close: function (v) { close(v, resolver); }, element: dialog };
  }

  /** Sostituisce `confirm()`. @returns {Promise<boolean>} */
  function confirm({ title, message, confirmLabel, cancelLabel, danger }) {
    return openDialog({
      title: title || 'Confermi?',
      size: 'sm',
      body: '<p class="ds-body-sm">' + esc(message || '') + '</p>',
      actions: [
        { label: cancelLabel || 'Annulla', variant: 'secondary', value: false },
        { label: confirmLabel || 'Conferma', variant: danger ? 'danger' : 'primary', value: true },
      ],
    }).promise.then(function (v) { return v === true; });
  }

  /** Sostituisce `prompt()`. @returns {Promise<string|null>} */
  function prompt({ title, message, value, placeholder, confirmLabel, type }) {
    return openDialog({
      title: title || 'Inserisci un valore',
      size: 'sm',
      body:
        (message ? '<p class="ds-body-sm" style="margin-bottom:var(--space-3)">' + esc(message) + '</p>' : '') +
        '<input class="form-control" data-ds-input type="' + (type || 'text') + '" ' +
        'value="' + esc(value || '') + '" placeholder="' + esc(placeholder || '') + '">',
      actions: [
        { label: 'Annulla', variant: 'secondary', value: null },
        {
          label: confirmLabel || 'Conferma',
          variant: 'primary',
          collect: function (d) { return d.querySelector('[data-ds-input]').value; },
        },
      ],
      onMount: function (d) {
        d.querySelector('[data-ds-input]').addEventListener('keydown', function (e) {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          d.querySelector('[data-ds-action="1"]').click();
        });
      },
    }).promise.then(function (v) { return v === undefined ? null : v; });
  }

  /* ── Blocchi ricorrenti ─────────────────────────────────────────────────  */

  /** Uno stato vuoto che dice perché è vuoto e cosa fare. */
  function emptyState({ icon, title, body, action }) {
    return '<div class="ds-empty">' +
      '<i class="fas ' + esc(icon || 'fa-inbox') + ' ds-empty__icon" aria-hidden="true"></i>' +
      '<div class="ds-empty__title">' + esc(title) + '</div>' +
      (body ? '<p class="ds-empty__body">' + esc(body) + '</p>' : '') +
      (action
        ? '<button type="button" class="btn btn-secondary btn-sm" data-nav="' + esc(action.section) + '">' +
          esc(action.label) + '</button>'
        : '') +
      '</div>';
  }

  function skeleton(lines) {
    let out = '<div class="ds-skeleton--title ds-skeleton"></div>';
    for (let i = 0; i < (lines || 3); i += 1) {
      out += '<div class="ds-skeleton ds-skeleton--text" style="width:' + (95 - i * 12) + '%"></div>';
    }
    return out;
  }

  function badge(text, tone) {
    return '<span class="badge badge-' + (tone || 'neutral') + '">' + esc(text) + '</span>';
  }

  /** Le sezioni della dashboard hanno tutte la stessa intestazione. */
  function sectionHeader(title, subtitle, action) {
    return '<div class="pv-section__head">' +
      '<div><h3 class="pv-section__title">' + esc(title) + '</h3>' +
      (subtitle ? '<p class="pv-section__sub">' + esc(subtitle) + '</p>' : '') + '</div>' +
      (action
        ? '<button type="button" class="btn btn-ghost btn-sm" data-nav="' + esc(action.section) + '">' +
          esc(action.label) + ' <i class="fas fa-arrow-right" aria-hidden="true"></i></button>'
        : '') +
      '</div>';
  }

  /* Un solo gestore per tutti i `data-nav` della Fase 2: i componenti nuovi
     non scrivono `onclick` nel markup. */
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-nav]');
    if (!el) return;
    const section = el.getAttribute('data-nav');
    if (!section) return;
    e.preventDefault();
    if (global.App && typeof global.App.navigate === 'function') global.App.navigate(section);
  });

  global.InglyUI = {
    esc, fmt, toast, confirm, prompt, openDialog,
    emptyState, skeleton, badge, sectionHeader,
  };
})(window);
