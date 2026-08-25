
// === /src/core/currency.js ===
const CurrencyEngine = {
  _STORE_KEY: 'ingly_fx_rates',    // localStorage key
  _CACHE_TTL: 24 * 3600 * 1000,   // 24h cache

  // Hardcoded fallback rates (ECB averages, good enough for offline)
  _fallback: {
    EUR: 1.0000,
    USD: 1.0850,
    GBP: 0.8560,
    CHF: 0.9280,
    JPY: 161.50,
    CAD: 1.4680,
  },

  _symbols: { EUR:'€', USD:'$', GBP:'£', CHF:'₣', JPY:'¥', CAD:'CA$' },
  _names:   { EUR:'Euro', USD:'US Dollar', GBP:'British Pound', CHF:'Swiss Franc', JPY:'Japanese Yen', CAD:'Canadian Dollar' },

  _rates: null,
  _ratesTs: 0,
  _activeCurrency: 'EUR',           // current quoter currency
  _defaultCurrency: 'EUR',          // persisted in settings

  // ── Init ─────────────────────────────────────────────────────────────
  async init() {
    // Load default from settings
    try {
      const cfg = await IDB.get('settings','main').catch(()=>null) || {};
      this._defaultCurrency = cfg.currency || 'EUR';
      this._activeCurrency = this._defaultCurrency;
    } catch {}

    // Load cached rates
    try {
      const stored = JSON.parse(localStorage.getItem(this._STORE_KEY) || 'null');
      if (stored && stored.ts && (Date.now() - stored.ts) < this._CACHE_TTL) {
        this._rates = stored.rates;
        this._ratesTs = stored.ts;
        return;
      }
    } catch {}

    // Use fallback (fetch will update async)
    this._rates = { ...this._fallback };
    this._fetchRates(); // fire and forget
  },

  // ── Fetch live rates from ECB XML API ────────────────────────────────
  async _fetchRates() {
    try {
      // ECB daily reference rates — CORS-friendly XML endpoint
      const resp = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', {
        signal: AbortSignal.timeout(5000)
      });
      const text = await resp.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/xml');
      const cubes = doc.querySelectorAll('Cube[currency]');
      const rates = { EUR: 1.0 };
      cubes.forEach(c => {
        const cur = c.getAttribute('currency');
        const rate = parseFloat(c.getAttribute('rate'));
        if (cur && !isNaN(rate)) rates[cur] = rate;
      });
      if (Object.keys(rates).length > 5) {
        this._rates = { ...this._fallback, ...rates };
        this._ratesTs = Date.now();
        localStorage.setItem(this._STORE_KEY, JSON.stringify({ rates: this._rates, ts: this._ratesTs }));
      }
    } catch (e) {
      // Offline — keep fallback
    }
  },

  // ── Core conversion ──────────────────────────────────────────────────
  convert(amountEUR, toCurrency) {
    if (!toCurrency || toCurrency === 'EUR') return amountEUR;
    const rate = (this._rates || this._fallback)[toCurrency] || 1;
    return amountEUR * rate;
  },

  convertBack(amount, fromCurrency) {
    if (!fromCurrency || fromCurrency === 'EUR') return amount;
    const rate = (this._rates || this._fallback)[fromCurrency] || 1;
    return amount / rate;
  },

  // ── Format with currency symbol ──────────────────────────────────────
  format(amountEUR, currency) {
    const cur = currency || this._activeCurrency;
    const val = this.convert(amountEUR, cur);
    const sym = this._symbols[cur] || cur;
    return sym + val.toFixed(2);
  },

  // ── Get symbol ───────────────────────────────────────────────────────
  symbol(currency) {
    return this._symbols[currency || this._activeCurrency] || '€';
  },

  // ── Set active Quoter currency ────────────────────────────────────────
  setQuoterCurrency(currency) {
    this._activeCurrency = currency || 'EUR';
    const sel = document.getElementById('quoter-currency');
    if (sel) sel.value = this._activeCurrency;
    // Update all visible price displays
    const displays = document.querySelectorAll('[data-eur-amount]');
    displays.forEach(el => {
      const eur = parseFloat(el.dataset.eurAmount) || 0;
      el.textContent = this.format(eur);
    });
    // Trigger quoter recalc
    if (typeof Quoter !== 'undefined') Quoter._recalcNow?.();
    toast(`Valuta: ${this._symbols[currency] || currency} ${this._names[currency] || currency}`, 'info');
  },

  // ── Set default currency (saved to settings) ─────────────────────────
  async setDefault(currency) {
    this._defaultCurrency = currency;
    this._activeCurrency = currency;
    try {
      const cfg = await IDB.get('settings','main').catch(()=>({})) || {};
      cfg.currency = currency;
      await IDB.put('settings', cfg);
    } catch {}
    this.setQuoterCurrency(currency);
  },

  // ── Rate info for display ─────────────────────────────────────────────
  getRateInfo(currency) {
    const rate = (this._rates || this._fallback)[currency] || 1;
    const age = this._ratesTs ? Math.round((Date.now() - this._ratesTs) / 3600000) : null;
    return {
      currency, rate, symbol: this._symbols[currency] || currency,
      source: this._ratesTs ? (age < 1 ? 'live' : `${age}h fa`) : 'fallback ECB',
      ageHours: age
    };
  },

  // ── Rate picker modal ─────────────────────────────────────────────────
  showRatePicker() {
    let existing = document.getElementById('modal-currency');
    if (existing) { existing.remove(); return; }
    const rates = this._rates || this._fallback;
    const overlay = document.createElement('div');
    overlay.id = 'modal-currency';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
    const age = this._ratesTs ? Math.round((Date.now()-this._ratesTs)/3600000) : null;
    overlay.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;width:100%;max-width:400px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6)">
        <div style="padding:18px 22px;border-bottom:1px solid var(--border);background:var(--bg-card2)">
          <div style="font-size:16px;font-weight:800">💱 Tassi di Cambio</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:3px">
            Fonte: ECB · ${age !== null ? (age < 1 ? '🟢 live' : `🟡 ${age}h fa`) : '⚪ fallback'} · <button onclick="CurrencyEngine._fetchRates().then(()=>CurrencyEngine.showRatePicker())" style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:11px;padding:0">Aggiorna</button>
          </div>
        </div>
        <div style="padding:14px 22px;display:flex;flex-direction:column;gap:8px">
          ${Object.entries(this._symbols).map(([cur, sym]) => {
            const rate = rates[cur] || 1;
            const active = cur === this._activeCurrency;
            return `<div onclick="CurrencyEngine.setQuoterCurrency('${cur}');document.getElementById('modal-currency').remove()"
              style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:${active?'var(--primary-dim)':'var(--bg-card2)'};border:1px solid ${active?'var(--primary)':'var(--border)'};border-radius:10px;cursor:pointer;transition:.15s">
              <span style="font-size:20px;width:28px;text-align:center">${sym}</span>
              <div style="flex:1">
                <div style="font-weight:700;font-size:13px">${cur} — ${this._names[cur]}</div>
                <div style="font-size:11px;color:var(--text-muted)">1 EUR = ${rate.toFixed(4)} ${cur}</div>
              </div>
              ${active ? '<span style="color:var(--primary);font-size:12px;font-weight:700">✓ attivo</span>' : ''}
            </div>`;
          }).join('')}
        </div>
        <div style="padding:12px 22px;border-top:1px solid var(--border);text-align:right">
          <button onclick="document.getElementById('modal-currency').remove()" style="padding:7px 18px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text-muted);border-radius:8px;cursor:pointer;font-size:12px">Chiudi</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  },
};


// ══════════════════════════════════════════════════════════════════════
// GLOBAL ERROR BOUNDARY  🛡️  v76
// Catches ALL unhandled JS errors + promise rejections and shows
// a non-intrusive toast with console details.
// ══════════════════════════════════════════════════════════════════════
(function() {
  const IGNORE = ['ResizeObserver loop','Script error.','Loading chunk','console.info is not a function','console.debug is not a function','is not defined at Object.render','PhotoStudio is not defined','ReplyAI is not defined','FieraAI is not defined','is not a function at Object.<anonymous>'];
  let _errCount = 0;
  const _errorLog = [];

  function handleErr(msg, src, line, col, err) {
    if (!msg) return;
    const msgStr = String(msg);
    if (IGNORE.some(s => msgStr.includes(s))) return;
    _errCount++;
    const entry = { ts: Date.now(), msg: msgStr, src, line, col, stack: err?.stack };
    _errorLog.push(entry);
    if (_errorLog.length > 100) _errorLog.shift();

    console.error('[ErrorBoundary]', msgStr, src ? `${src}:${line}` : '', err||'');

    // Show toast only for first 3 errors per session to avoid flooding
    if (_errCount <= 3) {
      const label = msgStr.length > 80 ? msgStr.substring(0, 80) + '…' : msgStr;
      // Use toast if available, otherwise fallback
      if (typeof toast === 'function') {
        toast(`⚠️ JS Error: ${label}`, 'warning');
      } else {
        console.warn('⚠️ Early error (toast not ready):', label);
      }
    }
    return false; // let default handling proceed
  }

  window.onerror = handleErr;

  window.addEventListener('unhandledrejection', e => {
    const reason = e.reason;
    const msg = reason?.message || String(reason) || 'Unhandled Promise rejection';
    // Suppress benign IDB connection errors (auto-retried)
    if(msg.includes('connection is closing')||msg.includes('IDBDatabase')||msg.includes('transaction')){
      e.preventDefault(); // suppress from ErrorBoundary — IDB module retries automatically
      console.warn('[IDB] Suppressed transient error (auto-retry):', msg);
      return;
    }
    handleErr(msg, 'promise', 0, 0, reason);
    // Don't prevent default — keep devtools working
  });

  // Expose for debugging
  window._inglyErrors = { getLog: () => [..._errorLog], count: () => _errCount, clear: () => { _errorLog.length=0; _errCount=0; },
    // Compat: alcuni handler trattano _inglyErrors come array (.push/.slice).
    push: (e) => { _errorLog.push(e); _errCount++; if(_errorLog.length>50) _errorLog.splice(0, _errorLog.length-50); return _errorLog.length; },
    slice: (...a) => _errorLog.slice(...a) };
})();

// ══════════════════════════════════════════════════════════════════════
// RECURRING INVOICE ENGINE  v78
// Genera fatture ricorrenti da template.
// Frequenze: weekly | monthly | quarterly | yearly
// Al login/startup, controlla se ci sono fatture da generare oggi.
// ══════════════════════════════════════════════════════════════════════
window.CurrencyEngine = CurrencyEngine;

