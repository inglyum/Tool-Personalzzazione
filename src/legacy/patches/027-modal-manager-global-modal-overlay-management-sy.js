
// ╔═══════════════════════════════════════════════════════════════════════╗
// ║ MODAL MANAGER - Global modal/overlay management system                ║
// ║ Gestisce z-index, scroll lock, ESC key, click outside                 ║
// ╚═══════════════════════════════════════════════════════════════════════╝
const ModalManager = {
  _stack: [],
  _activeModals: new Set(),
  _baseZIndex: 1000,
  
  /**
   * Apre una modale con gestione automatica z-index e event listeners
   * @param {string} modalId - ID dell'elemento modale
   * @param {Object} options - Opzioni { blockScroll, closeOnEsc, closeOnClickOutside }
   */
  open(modalId, options = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.warn(`[ModalManager] Modal "${modalId}" not found`);
      return;
    }
    
    // Gestione z-index automatica (stacking)
    const zIndex = this._baseZIndex + (this._stack.length * 10);
    modal.style.zIndex = zIndex;
    
    // Blocco scroll body (default: true)
    if (options.blockScroll !== false) {
      document.body.style.overflow = 'hidden';
    }
    
    // Aggiungi a stack
    this._stack.push({ id: modalId, modal, options, zIndex });
    this._activeModals.add(modalId);
    
    // Mostra modal
    modal.classList.add('open');
    if(modal.style.display === 'none') modal.style.display = 'flex';
    
    // Setup event listeners
    this._setupModalListeners(modal, modalId, options);
    
    console.log(`[ModalManager] Opened "${modalId}" (z-index: ${zIndex})`);
  },
  
  /**
   * Chiude una modale e pulisce event listeners
   * @param {string} modalId - ID della modale da chiudere
   */
  close(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    // Rimuovi da stack
    this._stack = this._stack.filter(m => m.id !== modalId);
    this._activeModals.delete(modalId);
    
    // Ripristina scroll se nessuna modale attiva
    if (this._stack.length === 0) {
      document.body.style.overflow = '';
    }
    
    // Nascondi modal con animazione
    modal.classList.remove('open');
    setTimeout(() => {
      if (!this._activeModals.has(modalId)) {
        modal.style.display = 'none';
      }
    }, 300); // durata animazione CSS
    
    // Cleanup listeners
    this._cleanupModalListeners(modal);
    
    console.log(`[ModalManager] Closed "${modalId}"`);
  },
  
  /**
   * Chiude TUTTE le modali attive
   */
  closeAll() {
    const modalsToClose = [...this._activeModals];
    modalsToClose.forEach(id => this.close(id));
    console.log('[ModalManager] All modals closed');
  },
  
  /**
   * Verifica se una modale è aperta
   */
  isOpen(modalId) {
    return this._activeModals.has(modalId);
  },
  
  /**
   * Setup event listeners per modale (ESC key, click outside)
   * @private
   */
  _setupModalListeners(modal, modalId, options) {
    // ESC key handler
    if (options.closeOnEsc !== false) {
      const escHandler = (e) => {
        if (e.key === 'Escape' && this._activeModals.has(modalId)) {
          // Chiudi solo la modale top-most nello stack
          const topModal = this._stack[this._stack.length - 1];
          if (topModal && topModal.id === modalId) {
            this.close(modalId);
          }
        }
      };
      modal._escHandler = escHandler;
      document.addEventListener('keydown', escHandler);
    }
    
    // Click outside handler
    if (options.closeOnClickOutside !== false) {
      const clickHandler = (e) => {
        if (e.target === modal) {
          this.close(modalId);
        }
      };
      modal._clickHandler = clickHandler;
      modal.addEventListener('click', clickHandler);
    }
  },
  
  /**
   * Rimuove event listeners da modale
   * @private
   */
  _cleanupModalListeners(modal) {
    if (modal._escHandler) {
      document.removeEventListener('keydown', modal._escHandler);
      delete modal._escHandler;
    }
    if (modal._clickHandler) {
      modal.removeEventListener('click', modal._clickHandler);
      delete modal._clickHandler;
    }
  }
};

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║ NAVIGATION GUARD - Cleanup automatico quando si lascia una sezione    ║
// ╚═══════════════════════════════════════════════════════════════════════╝
const NavigationGuard = {
  _beforeLeaveCallbacks: {},
  
  /**
   * Registra callback di cleanup per una sezione
   * @param {string} section - Nome della sezione
   * @param {Function} callback - Funzione da eseguire prima di lasciare la sezione
   */
  onBeforeLeave(section, callback) {
    if (!this._beforeLeaveCallbacks[section]) {
      this._beforeLeaveCallbacks[section] = [];
    }
    this._beforeLeaveCallbacks[section].push(callback);
  },
  
  /**
   * Esegue tutti i cleanup registrati per una sezione
   * @param {string} section - Nome della sezione
   */
  async executeCleanup(section) {
    const callbacks = this._beforeLeaveCallbacks[section] || [];
    
    if (callbacks.length > 0) {
      console.log(`[NavigationGuard] Executing ${callbacks.length} cleanup(s) for "${section}"`);
    }
    
    await Promise.all(callbacks.map(async (cb) => {
      try {
        await cb();
      } catch(e) {
        console.warn(`[NavigationGuard] Cleanup failed for "${section}":`, e);
      }
    }));
  },
  
  /**
   * Rimuove tutti i callback per una sezione
   */
  clearSection(section) {
    delete this._beforeLeaveCallbacks[section];
  }
};

// Registra cleanup automatico per la sezione settings
NavigationGuard.onBeforeLeave('settings', () => {
  // Chiudi eventuali modal/overlay aperti
  ModalManager.closeAll();
  // Blur input attivi
  document.querySelectorAll('#view-settings input:focus').forEach(i => i.blur());
});

// Esponi globalmente
window.ModalManager = ModalManager
// v4.6: ESC key closes topmost modal
document.addEventListener('keydown', function(e){
  if(e.key !== 'Escape') return;
  const open = document.querySelector('.modal-overlay.open');
  if(open){ open.classList.remove('open'); return; }
  if(typeof ModalManager !== 'undefined') ModalManager.closeAll();
}, true);
;
window.NavigationGuard = NavigationGuard;

console.log('%c✅ ModalManager & NavigationGuard initialized', 
  'color:#22c55e;font-weight:bold;font-size:12px');

