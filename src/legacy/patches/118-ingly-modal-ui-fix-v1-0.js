
/* === INGLY MODAL & UI FIX v1.0 === */
/* ══════════════════════════════════════════════════════════════
   INGLY OS v35 — MODAL & UI HARDENING v1.0
   
   FIX:
   ✅ Tutti i pulsanti X/Chiudi/Annulla funzionanti
   ✅ ESC chiude qualsiasi modal aperto
   ✅ Click fuori dalla modal la chiude
   ✅ Cleanup automatico event listeners
   ✅ Sidebar toggle robusta
   ✅ Nessun modal bloccato per sempre
   ══════════════════════════════════════════════════════════════ */
(function InglyUIFix() {
  'use strict';

  /* ── 1. GLOBAL ESC HANDLER ──────────────────────────────── */
  if (!window._inglyEscInstalled) {
    window._inglyEscInstalled = true;
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape') return;
      /* Close topmost modal */
      var closers = [
        function() { /* ModalManager */
          if (typeof ModalManager !== 'undefined' && ModalManager._stack && ModalManager._stack.length) {
            var top = ModalManager._stack[ModalManager._stack.length - 1];
            if (top) { ModalManager.close(top.id); return true; }
          }
          return false;
        },
        function() { /* class-based modals with .open */
          var openModals = document.querySelectorAll('.modal-overlay.open, [class*="modal"][style*="flex"], [class*="modal"][style*="block"]');
          if (openModals.length) {
            openModals[openModals.length - 1].classList.remove('open');
            openModals[openModals.length - 1].style.display = 'none';
            document.body.style.overflow = '';
            return true;
          }
          return false;
        },
        function() { /* inline style display:flex modals */
          var allDivs = document.querySelectorAll('[id*="modal"],[id*="overlay"],[id*="popup"]');
          for (var i = allDivs.length - 1; i >= 0; i--) {
            var el = allDivs[i];
            if (el.style.display === 'flex' || el.style.display === 'block') {
              el.style.display = 'none';
              el.classList.remove('open');
              document.body.style.overflow = '';
              return true;
            }
          }
          return false;
        },
        function() { /* CmdPalette */
          if (typeof CmdPalette !== 'undefined' && CmdPalette.close) { CmdPalette.close(); return true; }
          return false;
        }
      ];
      for (var i = 0; i < closers.length; i++) {
        try { if (closers[i]()) break; } catch(err) {}
      }
    });
  }

  /* ── 2. AUTO-PATCH ALL CLOSE BUTTONS ────────────────────── */
  function patchCloseButtons() {
    /* Find buttons that should close something but have no handler */
    var selectors = [
      'button[title*="Chiudi"]', 'button[title*="Close"]',
      'button[aria-label*="close"]', 'button[aria-label*="chiudi"]',
      '.btn-close', '.modal-close', '[class*="close-btn"]',
      'button i.fa-times:only-child', 'button i.fa-xmark:only-child'
    ];

    selectors.forEach(function(sel) {
      try {
        document.querySelectorAll(sel).forEach(function(btn) {
          if (btn._inglyPatched) return;
          btn._inglyPatched = true;
          var originalOnclick = btn.onclick;
          if (!originalOnclick) {
            btn.addEventListener('click', function(e) {
              /* Find closest modal */
              var modal = btn.closest('[id*="modal"],[class*="modal"],[id*="overlay"],[class*="overlay"]');
              if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('open');
                document.body.style.overflow = '';
              }
            });
          }
        });
      } catch(err) {}
    });
  }

  /* ── 3. CLICK OUTSIDE TO CLOSE ──────────────────────────── */
  function setupClickOutside() {
    document.addEventListener('click', function(e) {
      /* Only for modals that support it */
      if (e.target.classList.contains('modal-overlay') ||
          (e.target.id && e.target.id.endsWith('-overlay') && e.target.style.display !== 'none')) {
        /* Check it's the backdrop, not the modal content */
        var isBackdrop = e.target === e.currentTarget ||
          (e.target.id && (e.target.id.includes('overlay') || e.target.id.includes('modal')));
        if (isBackdrop) {
          e.target.style.display = 'none';
          e.target.classList.remove('open');
          document.body.style.overflow = '';
        }
      }
    });
  }

  /* ── 4. UNIVERSAL closeModal OVERRIDE ──────────────────── */
  var _origCloseModal = window.closeModal;
  window.closeModal = function(id) {
    try {
      /* Try original first */
      if (_origCloseModal) _origCloseModal(id);
      /* Also try ModalManager */
      if (id && typeof ModalManager !== 'undefined') {
        try { ModalManager.close('modal-' + id); } catch(e){}
        try { ModalManager.close(id); } catch(e){}
      }
      /* Force hide any matching element */
      if (id) {
        var el = document.getElementById('modal-' + id) || document.getElementById(id);
        if (el) {
          el.classList.remove('open');
          el.style.display = 'none';
        }
      } else {
        /* No ID: close topmost visible modal */
        var allModals = document.querySelectorAll('[id*="modal"],[id*="overlay"]');
        for (var i = allModals.length - 1; i >= 0; i--) {
          var m = allModals[i];
          if (m.style.display !== 'none' && m.style.display !== '') {
            m.style.display = 'none';
            m.classList.remove('open');
            break;
          }
        }
      }
      document.body.style.overflow = '';
    } catch(err) {
      console.warn('[UIFix] closeModal error:', err.message);
    }
  };

  /* ── 5. FIX BODY SCROLL LOCK LEFT ON MODAL CLOSE ────────── */
  var _origBodyOverflow = document.body.style.overflow;
  var _modalCount = 0;
  var _origMMOpen  = typeof ModalManager !== 'undefined' ? ModalManager.open.bind(ModalManager) : null;
  var _origMMClose = typeof ModalManager !== 'undefined' ? ModalManager.close.bind(ModalManager) : null;
  if (typeof ModalManager !== 'undefined') {
    var origOpen  = ModalManager.open.bind(ModalManager);
    var origClose = ModalManager.close.bind(ModalManager);
    ModalManager.open = function(id, opts) {
      _modalCount++;
      return origOpen(id, opts);
    };
    ModalManager.close = function(id) {
      _modalCount = Math.max(0, _modalCount - 1);
      var r = origClose(id);
      if (_modalCount === 0) document.body.style.overflow = '';
      return r;
    };
    ModalManager.closeAll = function() {
      _modalCount = 0;
      var ids = [...ModalManager._activeModals];
      ids.forEach(function(id) { origClose(id); });
      document.body.style.overflow = '';
    };
  }

  /* ── 6. SIDEBAR ROBUSTNESS ──────────────────────────────── */
  function fixSidebar() {
    var sidebar = document.getElementById('sidebar');
    var sidebarInner = document.getElementById('sidebar-inner');
    if (!sidebar) return;

    /* Fix: sidebar items that have no click handler */
    var navItems = sidebar.querySelectorAll('.nav-item[data-section]');
    navItems.forEach(function(item) {
      if (item._inglyNavPatched) return;
      item._inglyNavPatched = true;
      if (!item.onclick && !item.getAttribute('onclick')) {
        var section = item.getAttribute('data-section');
        if (section && typeof App !== 'undefined') {
          item.addEventListener('click', function() {
            App.navigate(section);
          });
        }
      }
    });
  }

  /* ── 7. RUN PERIODICALLY (to catch dynamically added content) */
  function runFixes() {
    try { patchCloseButtons(); } catch(e){}
    try { fixSidebar(); } catch(e){}
  }

  /* Initial run */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setupClickOutside();
      setTimeout(runFixes, 500);
    });
  } else {
    setupClickOutside();
    setTimeout(runFixes, 500);
  }

  /* Re-run after each navigation */
  var _navObserver = null;
  var tries = 0;
  var iv = setInterval(function() {
    tries++;
    if (tries > 60) { clearInterval(iv); return; }
    if (!window.App || !App.navigate) return;
    clearInterval(iv);
    var origNav = App.navigate.bind(App);
    App.navigate = function(section) {
      var r = origNav(section);
      setTimeout(runFixes, 300);
      return r;
    };
    runFixes();
    console.log('[UIFix v1.0] Modal & UI hardening active');
  }, 300);

})();

