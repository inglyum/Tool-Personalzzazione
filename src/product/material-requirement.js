/* ═══════════════════════════════════════════════════════════════════════════
   FABBISOGNO MATERIALI — impegnato non vuol dire consumato
   ═══════════════════════════════════════════════════════════════════════════

   Nel ciclo precedente avevo scritto, e lasciato scritto nella
   documentazione, che `reserved` non si poteva calcolare perché nessun ordine
   dichiara il proprio fabbisogno. Rimisurato: il fabbisogno c'era già, e si
   perdeva per strada.

   Le righe del preventivo che nascono dal magazzino portano `itemKey` —
   `materials:12`, cioè *quale* articolo — insieme a quantità e unità di
   misura. La distinta economica usava quel campo per decidere se il costo
   fosse verificato o dichiarato, e poi lo buttava. Quindi la distinta sapeva
   quanto costa il materiale e non quale fosse.

   Ora lo conserva, e da lì nasce questo modulo.

   ── Le quattro quantità, e perché sono quattro ──────────────────────────

     FABBISOGNO   quanto serve, secondo il preventivo
     IMPEGNATO    il fabbisogno degli ordini aperti: **non tocca la giacenza**
     CONSUMATO    quanto è uscito davvero: movimento nel registro, saldo giù
     SCARTO       quanto si è buttato: movimento separato, perché quanto si
                  butta è una domanda a sé

   La regola che tiene insieme tutto: `disponibile = giacenza − impegnato`.
   La giacenza è fisica, il disponibile è una promessa. Scrivere una
   prenotazione come movimento le confonderebbe — un movimento sposta il
   saldo, e il materiale impegnato è ancora lì sullo scaffale.

   ── Quello che non si inventa ────────────────────────────────────────────

   Una riga senza `itemKey` è un costo senza un articolo dietro: entra fra le
   `nonCollegate` e non genera fabbisogno. Un preventivo scritto a mano, senza
   passare dal magazzino, non produce prenotazioni — e il modulo lo dice invece
   di indovinare.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  function num(v) {
    if (v == null || v === '') return null;
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : null;
  }
  function arr(v) { return v == null ? null : Math.round(v * 1000) / 1000; }
  function OP() { return global.InglyOperazioni; }

  /* Gli stati in cui un ordine ha già impegnato materiale ma non l'ha ancora
     consumato tutto. Un ordine consegnato non impegna più niente. */
  var STATI_APERTI = ['confermato', 'confirmed', 'accettato', 'accepted',
    'produzione', 'production', 'working', 'in_produzione', 'lavorazione',
    'in_coda', 'queued', 'ready', 'pronto', 'backlog'];

  function apertoPerImpegno(ordine) {
    var s = String((ordine && (ordine.stage || ordine.status)) || '').toLowerCase();
    return STATI_APERTI.indexOf(s) >= 0;
  }

  /* ── Il fabbisogno di un ordine ───────────────────────────────────────── */

  function _distinta(record) {
    var r = record || {};
    if (r.costBreakdown && Array.isArray(r.costBreakdown.voci)) return r.costBreakdown;
    if (r.economic && r.economic.costBreakdown && Array.isArray(r.economic.costBreakdown.voci)) {
      return r.economic.costBreakdown;
    }
    if (r.currentPricing && Array.isArray(r.currentPricing.voci)) return r.currentPricing;
    if (r.pricingSnapshot && r.pricingSnapshot.costBreakdown
      && Array.isArray(r.pricingSnapshot.costBreakdown.voci)) {
      return r.pricingSnapshot.costBreakdown;
    }
    return null;
  }

  /**
   * Che cosa serve a questo ordine, e in che quantità.
   * @returns { righe[], nonCollegate[], disponibile, motivo }
   */
  function daOrdine(ordine) {
    var d = _distinta(ordine);
    if (!d) {
      return { righe: [], nonCollegate: [], disponibile: false,
        motivo: 'l\'ordine non porta una distinta economica' };
    }
    var righe = [];
    var nonCollegate = [];
    /* Il moltiplicatore: la distinta è per pezzo, l'ordine ha una quantità. */
    var pezzi = Math.max(1, num((ordine || {}).quantity) || num(d.quantita) || 1);

    (d.voci || []).forEach(function (v) {
      /* Solo il materiale genera fabbisogno. Manodopera e spese generali sono
         costi, non cose da prendere da uno scaffale. */
      var cat = String(v.category || '');
      if (cat !== 'material' && cat !== 'accessories' && cat !== 'packaging') return;
      var q = num(v.quantity);
      if (!v.itemKey || q == null || q <= 0) {
        nonCollegate.push({ label: v.label, quantity: q, unit: v.unit,
          motivo: !v.itemKey ? 'nessun articolo di magazzino collegato'
            : 'quantità non dichiarata' });
        return;
      }
      var parti = String(v.itemKey).split(':');
      righe.push({
        itemKey: v.itemKey,
        itemStore: v.itemStore || (parti.length > 1 ? parti[0] : null),
        itemId: v.itemId != null ? v.itemId : (parti.length > 1 ? parti[1] : null),
        label: v.label,
        category: cat,
        unit: v.unit || 'pz',
        quantityPerPiece: arr(q),
        quantity: arr(q * pezzi),
        unitCost: v.unitCost != null ? v.unitCost : null,
        totalCost: v.totalCost != null ? arr(v.totalCost * (pezzi / Math.max(1, num(d.quantita) || 1))) : null,
        source: v.source || null,
      });
    });

    return {
      righe: righe,
      nonCollegate: nonCollegate,
      pezzi: pezzi,
      disponibile: righe.length > 0,
      motivo: righe.length ? null
        : (nonCollegate.length
          ? 'nessuna riga di materiale è collegata a un articolo di magazzino'
          : 'la distinta non contiene materiali'),
    };
  }

  /* ── L'impegnato ──────────────────────────────────────────────────────── */

  /**
   * Quanto materiale è promesso agli ordini aperti.
   * Non scrive niente, non tocca nessun saldo: è una somma sugli ordini.
   *
   * Un ordine le cui operazioni sono tutte completate non impegna più: il
   * materiale o è stato consumato o non serve più.
   */
  function impegnato(ordini) {
    var lista = Array.isArray(ordini) ? ordini : [];
    var per = {};
    var contati = 0;
    var senzaFabbisogno = 0;
    var op = OP();

    lista.forEach(function (o) {
      if (!apertoPerImpegno(o)) return;
      /* Se il routing esiste ed è tutto chiuso, l'ordine non impegna più. */
      if (op) {
        var ops = op.leggi(o);
        if (ops.length && ops.every(function (x) { return op.chiusa(x); })) return;
      }
      var f = daOrdine(o);
      if (!f.disponibile) { senzaFabbisogno += 1; return; }
      contati += 1;
      f.righe.forEach(function (r) {
        var g = per[r.itemKey] || (per[r.itemKey] = {
          itemKey: r.itemKey, itemStore: r.itemStore, itemId: r.itemId,
          label: r.label, unit: r.unit, quantita: 0, ordini: [],
        });
        g.quantita = arr(g.quantita + r.quantity);
        if (g.ordini.indexOf(o.id) < 0) g.ordini.push(o.id);
      });
    });

    return {
      righe: Object.keys(per).map(function (k) { return per[k]; }),
      ordiniContati: contati,
      ordiniSenzaFabbisogno: senzaFabbisogno,
      /* Impegnare non è consumare: questo modulo non scrive movimenti, e
         dichiararlo qui evita che qualcuno lo creda. */
      toccaLaGiacenza: false,
    };
  }

  /**
   * Il disponibile di un articolo: giacenza meno impegnato.
   * La giacenza la dice il registro — qui non si ricalcola.
   */
  function disponibile(itemKey, giacenza, righeImpegnate) {
    var g = num(giacenza);
    var riga = (righeImpegnate || []).filter(function (r) { return r.itemKey === itemKey; })[0];
    var imp = riga ? riga.quantita : 0;
    if (g == null) {
      return { itemKey: itemKey, giacenza: null, impegnato: arr(imp), disponibile: null,
        noto: false, motivo: 'giacenza non nota' };
    }
    return {
      itemKey: itemKey,
      giacenza: arr(g),
      impegnato: arr(imp),
      disponibile: arr(g - imp),
      /* Sotto zero non è un errore di conto: è un ordine che promette
         materiale che non c'è, e va visto. */
      scoperto: (g - imp) < 0,
      noto: true,
    };
  }

  /**
   * Il quadro delle quattro quantità per un articolo.
   * `consumato` e `scarto` vengono dal registro, che è l'unico che li sa.
   */
  function quadro(itemKey, opzioni) {
    var o = opzioni || {};
    var mov = Array.isArray(o.movimenti) ? o.movimenti : [];
    var consumato = 0;
    var scarto = 0;
    var visto = false;
    mov.forEach(function (m) {
      if (String(m.itemKey || (m.itemStore + ':' + m.itemId)) !== String(itemKey)) return;
      var q = Math.abs(num(m.quantity) || 0);
      if (m.type === 'CONSUMPTION') { consumato += q; visto = true; }
      else if (m.type === 'WASTE') { scarto += q; visto = true; }
    });
    var disp = disponibile(itemKey, o.giacenza, o.impegnate);
    return {
      itemKey: itemKey,
      giacenza: disp.giacenza,
      impegnato: disp.impegnato,
      disponibile: disp.disponibile,
      /* Zero movimenti non è «zero consumato»: è «non registrato». */
      consumato: visto ? arr(consumato) : null,
      scarto: visto ? arr(scarto) : null,
      registrato: visto,
      scoperto: disp.scoperto === true,
    };
  }

  global.InglyFabbisogno = {
    VERSIONE: VERSIONE,
    STATI_APERTI: STATI_APERTI,
    apertoPerImpegno: apertoPerImpegno,
    daOrdine: daOrdine,
    impegnato: impegnato,
    disponibile: disponibile,
    quadro: quadro,
  };
})(typeof window !== 'undefined' ? window : globalThis);
