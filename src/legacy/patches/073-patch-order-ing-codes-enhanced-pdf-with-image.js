
// ═══════════════════════════════════════════════════════════════════════
// PATCH: Order ING codes + enhanced PDF with image
// ═══════════════════════════════════════════════════════════════════════
(function patchOrderSystem() {
  'use strict';

  // ── ING Code generator ────────────────────────────────────────────────
  async function _nextIngCode() {
    try {
      var all = await IDB.getAll('orders').catch(function(){return[];});
      var max = 0;
      all.forEach(function(o) {
        var m = (o.ingCode||o.orderNum||'').match(/ING[-_]?(\d+)/i);
        if (m) { var n=parseInt(m[1]); if(n>max) max=n; }
      });
      return 'ING-' + String(max+1).padStart(4,'0');
    } catch(e) { return 'ING-' + Date.now().toString().slice(-4); }
  }

  // ── Patch saveNewOrder to assign ING code ─────────────────────────────
  if (window.WorkflowModule && window.WorkflowModule.saveNewOrder) {
    var origSave = window.WorkflowModule.saveNewOrder.bind(window.WorkflowModule);
    window.WorkflowModule.saveNewOrder = async function(modalEl) {
      var cost = parseFloat((document.getElementById('no-cost')||{}).value) || 0;
      var markup = parseFloat((document.getElementById('no-markup')||{}).value) || 0;
      var ingCode = await _nextIngCode();
      var o = {
        id: Date.now(),
        ingCode: ingCode,
        orderNum: ingCode,
        name: (document.getElementById('no-name')||{}).value?.trim() || 'Nuovo Ordine',
        client: (document.getElementById('no-client')||{}).value?.trim() || '',
        clientName: (document.getElementById('no-client')||{}).value?.trim() || '',
        status: 'backlog',
        stage: 'backlog',
        priority: (document.getElementById('no-prio')||{}).value || 'media',
        dueDate: (document.getElementById('no-due')||{}).value || '',
        value: parseFloat((document.getElementById('no-value')||{}).value) || 0,
        total: parseFloat((document.getElementById('no-value')||{}).value) || 0,
        desc: (document.getElementById('no-desc')||{}).value || '',
        supplierCost: cost||undefined,
        markup: markup||undefined,
        isDirect: cost>0,
        createdAt: new Date().toISOString(),
      };
      await IDB.put('orders', o);
      if (modalEl) modalEl.remove();
      if (typeof Orders !== 'undefined') await Orders.render().catch(function(){});
      if (typeof toast !== 'undefined') toast('Ordine '+ingCode+' creato ✅','success');
    };
  }

  // ── Patch createFromQuote to assign ING code ──────────────────────────
  if (window.OrderFlow && window.OrderFlow.createFromQuote) {
    var origCFQ = window.OrderFlow.createFromQuote.bind(window.OrderFlow);
    window.OrderFlow.createFromQuote = async function(quote) {
      var ingCode = await _nextIngCode();
      var now = new Date().toISOString();
      // Get quote image if available
      var qImg = null;
      if (typeof QuoterImagePanel !== 'undefined') {
        try { var sp=QuoterImagePanel.getSpecs(); qImg=sp&&sp.image||null; } catch(e){}
      }
      var order = {
        id: Date.now(),
        ingCode: ingCode,
        orderNum: ingCode,
        quoteId: quote.id,
        name: quote.name||'Preventivo',
        clientId: quote.clientId||0,
        clientName: quote.clientName||'—',
        items: (quote.lines||[]).map(function(l){return{
          desc: l.desc||l.name||'—',
          qty: l.qty||1,
          price: l.price||(l.unitCost||0),
          total: l.subtotal||((l.price||l.unitCost||0)*(l.qty||1)),
        };}),
        total: quote.grand||quote.total||0,
        subtotal: quote.subFinal||quote.subtotal||0,
        tax: quote.vatAmt||0,
        vatRate: 0.22,
        stage: 'backlog',
        status: 'backlog',
        paymentStatus: 'none',
        notes: quote.notes||'',
        photo: qImg,
        createdAt: now,
        updatedAt: now,
      };
      await IDB.put('orders', order);
      if (typeof toast !== 'undefined') toast('Ordine '+ingCode+' creato da preventivo ✅','success');
      if (typeof Orders !== 'undefined') await Orders.render().catch(function(){});
      return order;
    };
  }

  // ── Ensure existing orders without ING code get one ───────────────────
  async function _migrateOldCodes() {
    try {
      var all = await IDB.getAll('orders').catch(function(){return[];});
      var changed=0;
      for (var i=0; i<all.length; i++) {
        var o = all[i];
        if (!o.ingCode && !/(ING[-_]?\d{3,})/i.test(o.orderNum||'')) {
          var code = await _nextIngCode();
          o.ingCode = code;
          if (!o.orderNum || /^ORD-/.test(o.orderNum)) o.orderNum = code;
          await IDB.put('orders', o).catch(function(){});
          changed++;
        }
      }
      if (changed>0) console.log('[InglyOrders] Migrated '+changed+' orders to ING codes');
    } catch(e) {}
  }

  // Run migration after 3s
  setTimeout(_migrateOldCodes, 3000);

  // Expose for use
  window._nextIngCode = _nextIngCode;
})();

