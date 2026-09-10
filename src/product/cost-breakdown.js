/* ═══════════════════════════════════════════════════════════════════════════
   DISTINTA ECONOMICA — il preventivo smette di essere un totale
   ═══════════════════════════════════════════════════════════════════════════

   Un preventivo salvato conservava `totalCost`, `netPrice`, `grossPrice`: tre
   numeri. Le voci che li avevano prodotti — il materiale, le ore macchina, i
   minuti di persona, l'imballo, l'avviamento — restavano nel calcolo e non
   arrivavano da nessuna parte. L'ordine che ne nasceva aveva un totale e
   nient'altro, e alla domanda «perché costa così?» non poteva rispondere
   nessuno.

   Questo modulo costruisce la distinta: una riga per ogni voce che è stata
   davvero calcolata, con quantità, unità, costo unitario, totale e **da dove
   viene il numero**. Non inventa voci. Se il preventivo non ha imballo, la
   distinta non ha una riga imballo a zero: ha una riga in meno.

   ── Tre stati, e non vanno confusi ────────────────────────────────────────

   · `quote.pricingSnapshot`  — la fotografia di quando il preventivo è stato
                                fatto. Non si tocca mai più.
   · `order.pricingSnapshot`  — la stessa fotografia, copiata nell'ordine.
                                Serve a sapere che cosa era stato promesso.
   · `order.currentPricing`   — quello che si sta facendo davvero, modificabile.
                                Parte identico allo snapshot e diverge quando
                                qualcuno cambia una voce.

   La differenza fra il secondo e il terzo è lo scostamento, ed è l'unica cosa
   che permette di sapere a fine mese se si è guadagnato quanto si pensava.
   Modificare l'ordine **non** modifica il preventivo: sono due momenti
   diversi della stessa storia.

   ── Perché una riga porta la sua provenienza ──────────────────────────────

   `source` non è decorazione. «Filamento PLA € 6,38» detto dal magazzino, con
   il costo reale degli acquisti, e lo stesso numero digitato a mano sono due
   affermazioni con due gradi di affidabilità diversi, e chi rilegge il
   preventivo fra sei mesi deve poterli distinguere.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d == null ? 0 : d); };
  var pos = function (v, d) { return Math.max(0, num(v, d)); };
  var arr = function (v) { return Math.round(num(v) * 1000) / 1000; };
  /* Un costo unitario non è un importo in euro: è una tariffa, e su quantità
     grandi tre decimali non bastano. Il filamento a € 0,0155 il grammo
     arrotondato a € 0,016 sbaglia del 3% su ogni preventivo, e i tre numeri
     della riga smettono di tornare fra loro. */
  var tariffa = function (v) { return Math.round(num(v) * 1000000) / 1000000; };

  /* Le categorie del comando, nell'ordine in cui si leggono in un preventivo:
     prima quello che si compra, poi quello che si consuma, poi quello che si
     fa, poi quello che si perde. */
  var CATEGORIE = [
    { id: 'material', label: 'Materiale' },
    { id: 'machine', label: 'Macchina' },
    { id: 'energy', label: 'Energia' },
    { id: 'labor', label: 'Manodopera' },
    { id: 'setup', label: 'Avviamento' },
    { id: 'postProcess', label: 'Post-processo' },
    { id: 'packaging', label: 'Imballo' },
    { id: 'accessories', label: 'Accessori' },
    { id: 'waste', label: 'Scarti' },
    { id: 'overhead', label: 'Spese generali' },
    { id: 'other', label: 'Altri costi' },
  ];
  var ORDINE = CATEGORIE.map(function (c) { return c.id; });

  function labelCategoria(id) {
    for (var i = 0; i < CATEGORIE.length; i++) if (CATEGORIE[i].id === id) return CATEGORIE[i].label;
    return id;
  }

  /* Come il motore chiama le sue voci → in quale categoria vanno. Le voci che
     il motore non conosce finiscono in `other`, che è meglio di perderle. */
  var MAPPA = {
    materiale: 'material', material: 'material', supporto: 'material',
    inchiostro: 'material', film: 'material', resina: 'material', blank: 'material',
    macchina: 'machine', ammortamento: 'machine',
    manutenzione: 'machine',
    energia: 'energy',
    manodopera: 'labor', finitura: 'labor', lavoro: 'labor',
    setup: 'setup', avviamento: 'setup', primaStampa: 'setup', profilo: 'setup',
    post: 'postProcess', postprocesso: 'postProcess', lavaggio: 'postProcess',
    packaging: 'packaging', imballo: 'packaging',
    hardware: 'accessories', accessori: 'accessories', primer: 'accessories',
    scarto: 'waste', scarti: 'waste',
    overhead: 'overhead', spese: 'overhead',
  };

  function categoriaDi(id) {
    var k = String(id || '').toLowerCase().replace(/[^a-z]/g, '');
    return MAPPA[k] || 'other';
  }

  /* ── Quanto, di che cosa ───────────────────────────────────────────────
     Il motore conosce i costi delle sue voci ma non li accompagna con una
     quantità: sa che il materiale costa € 6,38, non che sono 290 grammi. Senza
     quantità non c'è costo unitario, e senza costo unitario la tabella
     «voce · quantità · costo unitario · totale» non si può disegnare — si
     vedrebbe solo l'ultima colonna, che è quello che si vedeva prima.

     Le quantità stanno negli **ingressi** del calcolo, e sono quelle: i grammi
     che si stampano, le ore che la macchina lavora, i minuti di persona. Qui
     si rimettono accanto al numero a cui appartengono. Una voce di cui non si
     conosce la quantità resta senza: inventarne una produrrebbe un costo
     unitario che sembra un prezzo e non lo è. */
  function quantitaDi(voceId, ingresso, ore) {
    var i = ingresso || {};
    var g = pos(i.grams);
    var min = function (v) { return pos(v); };
    switch (String(voceId)) {
      case 'materiale':
        return g > 0 ? { quantity: g, unit: 'g' }
          : (pos(i.volumeCm3) > 0 ? { quantity: pos(i.volumeCm3), unit: 'cm³' } : null);
      case 'macchina':
      case 'manutenzione':
        return pos(ore) > 0 ? { quantity: arr(ore), unit: 'h' } : null;
      case 'energia':
        return pos(ore) > 0 ? { quantity: arr(ore), unit: 'h' } : null;
      case 'finitura':
        return min(i.finishMin) + min(i.qcMin) > 0
          ? { quantity: min(i.finishMin) + min(i.qcMin), unit: 'min' } : null;
      case 'manodopera':
        return min(i.handlingMin) + min(i.curingMin) > 0
          ? { quantity: min(i.handlingMin) + min(i.curingMin), unit: 'min' } : null;
      case 'setup':
        return min(i.setupMin) > 0 ? { quantity: min(i.setupMin), unit: 'min' } : null;
      default:
        return null;
    }
  }

  /* ── Una riga ─────────────────────────────────────────────────────────── */

  function riga(v, opzioni) {
    var o = opzioni || {};
    var totale = arr(v.totalCost != null ? v.totalCost : v.value);
    var q = v.quantity != null ? num(v.quantity) : null;
    return {
      id: String(v.id || o.id || ('voce-' + Math.random().toString(36).slice(2, 8))),
      category: v.category || categoriaDi(v.id),
      label: String(v.label || v.id || 'Voce'),
      description: String(v.detail || v.description || v.conti || ''),
      quantity: q,
      unit: v.unit || null,
      /* Il costo unitario si calcola solo se c'è una quantità: dividere per
         niente produrrebbe un numero che sembra un prezzo e non lo è. */
      unitCost: q != null && q !== 0 ? tariffa(totale / q) : null,
      totalCost: totale,
      source: v.source || o.source || 'motore',
      confidence: v.confidence || null,
      editable: v.editable !== false,
    };
  }

  /* ── La distinta, dal risultato del motore ────────────────────────────── */

  /**
   * @param calcolo il risultato di `InglyCostEngine.calcola()`
   * @param opzioni { quantita, sorgenti: {voceId: 'magazzino'|…} }
   */
  function daCalcolo(calcolo, opzioni) {
    var o = opzioni || {};
    if (!calcolo || calcolo.vuoto || calcolo.indisponibile) {
      return vuota(o.motivo || (calcolo && calcolo.motivo) || 'nessun calcolo disponibile');
    }

    var qty = Math.max(1, pos(o.quantita != null ? o.quantita : calcolo.qty, 1));
    var voci = [];

    var ingresso = calcolo._ingresso || o.ingresso || {};
    var ore = pos(calcolo.ore);
    (calcolo.perPezzo && calcolo.perPezzo.voci ? calcolo.perPezzo.voci : []).forEach(function (v) {
      if (!(pos(v.value) > 0)) return;   /* niente righe a zero: sono rumore */
      var q = quantitaDi(v.id, ingresso, ore);
      voci.push(riga(q ? Object.assign({}, v, q) : v,
        { source: (o.sorgenti || {})[v.id] || 'motore' }));
    });

    /* L'avviamento è per lavoro e va diviso: la riga porta il totale del
       lavoro e il costo unitario che ne esce, così si vedono tutti e due. */
    (calcolo.unaTantum && calcolo.unaTantum.voci ? calcolo.unaTantum.voci : []).forEach(function (v) {
      if (!(pos(v.value) > 0)) return;
      var qs = quantitaDi(v.id, ingresso, ore);
      var r = riga(v, { source: (o.sorgenti || {})[v.id] || 'motore' });
      /* L'avviamento ha due quantità che vogliono dire cose diverse: i minuti
         che ci vogliono, e i pezzi su cui si dividono. In tabella conta la
         seconda — è quella che spiega perché su dieci pezzi costa un decimo —
         e i minuti restano nella descrizione. */
      if (qs) r.description = (r.description ? r.description + ' · ' : '') + qs.quantity + ' ' + qs.unit;
      r.quantity = qty;
      r.unit = 'pz';
      r.unitCost = arr(pos(v.value) / qty);
      r.totalCost = arr(pos(v.value));
      r.description = (r.description ? r.description + ' · ' : '') + 'una tantum, ripartito su ' + qty;
      voci.push(r);
    });

    if (pos(calcolo.overhead) > 0) {
      voci.push(riga({
        id: 'overhead', label: 'Spese generali', value: calcolo.overhead,
        detail: calcolo.overheadModo ? 'ripartite ' + calcolo.overheadModo : '',
      }, { source: 'profilo' }));
    }

    return componi(voci, calcolo, qty);
  }

  /** La distinta dalle righe di un preventivo classico (Smart Quoter), dove
      ogni riga è un prodotto o un servizio con il suo costo. */
  function daRighe(lines, calcolo, opzioni) {
    var o = opzioni || {};
    var voci = (lines || []).map(function (l) {
      var q = num(l.qty, 1);
      var unit = num(l.unitCost, 0);
      return {
        id: String(l.id || l.itemKey || l.name),
        category: l.category ? categoriaDi(l.category) : 'material',
        label: l.name || l.desc || 'Voce',
        description: l.detail || l.catLabel || '',
        quantity: q,
        unit: l.unit || 'pz',
        unitCost: tariffa(unit),
        totalCost: arr(l.subtotal != null ? l.subtotal : unit * q),
        source: l.itemKey ? 'magazzino' : 'preventivo',
        confidence: l.itemKey ? 'verified' : 'declared',
        editable: true,
      };
    });
    return componi(voci, calcolo, Math.max(1, pos(o.quantita, 1)));
  }

  /* ── Composizione ─────────────────────────────────────────────────────── */

  function componi(voci, calcolo, qty) {
    var perCategoria = {};
    ORDINE.forEach(function (c) { perCategoria[c] = []; });
    voci.forEach(function (v) {
      if (!perCategoria[v.category]) perCategoria[v.category] = [];
      perCategoria[v.category].push(v);
    });

    var totaliCategoria = {};
    var costo = 0;
    Object.keys(perCategoria).forEach(function (c) {
      var t = perCategoria[c].reduce(function (a, v) { return a + num(v.totalCost); }, 0);
      totaliCategoria[c] = arr(t);
      costo += t;
    });

    var k = calcolo || {};
    /* ── Il margine si ricava dai numeri della distinta ──────────────────
       Prendere `marginPct` dal motore sembrava naturale e produceva una
       distinta che non torna con se stessa: sul preventivo di prova il
       motore diceva 50% mentre costo € 28 e netto € 385 ne dicono 92,7. Il
       motore calcola il suo margine su una base di costo diversa dalla somma
       di queste righe, e mostrare i due accanto significa mostrare un numero
       che contraddice quelli che ha sopra.
       Il margine di questa distinta è quello di questa distinta: prezzo meno
       costo, diviso il prezzo. Quello del motore resta leggibile a parte. */
    var nettoTot = arr(k.subtotalNet);
    var costoTot = arr(k.costoTotale != null ? k.costoTotale : costo * qty);
    var margineTot = arr(nettoTot - costoTot);
    return {
      schemaVersion: VERSIONE,
      /* Le categorie vuote restano nell'oggetto ma con lista vuota: chi legge
         non deve indovinare se «packaging assente» significa zero o non
         calcolato. La lista vuota dice «non c'era». */
      categorie: perCategoria,
      totaliCategoria: totaliCategoria,
      voci: voci,
      quantita: qty,
      totals: {
        costoVoci: arr(costo),
        costoPezzo: arr(k.costoPezzo != null ? k.costoPezzo : costo),
        costoTotale: arr(k.costoTotale != null ? k.costoTotale : costo * qty),
        nettoPezzo: arr(k.subtotalNet != null ? k.subtotalNet / Math.max(1, qty) : 0),
        netto: nettoTot,
        lordo: arr(k.totalGross),
        iva: arr(k.vat),
        margine: margineTot,
        marginePct: nettoTot > 0 ? arr((margineTot / nettoTot) * 100) : 0,
        /* Il margine che il motore dichiara, per chi deve confrontarli. */
        margineMotorePct: arr(k.marginPct),
        scontoPct: arr(k.discountAppliedPct),
      },
      vuota: voci.length === 0,
    };
  }

  function vuota(motivo) {
    var perCategoria = {};
    ORDINE.forEach(function (c) { perCategoria[c] = []; });
    return {
      schemaVersion: VERSIONE, categorie: perCategoria, totaliCategoria: {},
      voci: [], quantita: 1,
      totals: { costoVoci: 0, costoPezzo: 0, costoTotale: 0, nettoPezzo: 0,
        netto: 0, lordo: 0, iva: 0, margine: 0, marginePct: 0, scontoPct: 0 },
      vuota: true, motivo: motivo || 'nessuna voce',
    };
  }

  /* ── Modificare una voce ──────────────────────────────────────────────── */

  /** Ricalcola tutto a partire dalle voci. Non tocca l'originale: restituisce
      una distinta nuova, perché lo snapshot del preventivo deve restare
      quello che era. */
  function conVoce(distinta, voceId, modifiche) {
    if (!distinta || !distinta.voci) return distinta;
    var trovata = false;
    var voci = distinta.voci.map(function (v) {
      if (String(v.id) !== String(voceId)) return Object.assign({}, v);
      trovata = true;
      var n = Object.assign({}, v, modifiche || {});
      /* Se cambia la quantità o il costo unitario, il totale si ricalcola.
         Se cambia il totale, è il costo unitario a seguirlo. Non si accetta
         una terna incoerente: sarebbe un numero che non torna con se stesso. */
      if (modifiche && (modifiche.quantity != null || modifiche.unitCost != null)
          && modifiche.totalCost == null) {
        var q = num(n.quantity, 1);
        n.totalCost = arr(num(n.unitCost) * q);
      } else if (modifiche && modifiche.totalCost != null) {
        n.totalCost = arr(modifiche.totalCost);
        var q2 = num(n.quantity, 0);
        /* Se la voce non ha una quantità — capita: lo scarto è una
           percentuale, non un pezzo — il costo unitario resta assente invece
           di diventare uguale al totale, che sarebbe una quantità di 1
           inventata. */
        n.unitCost = q2 ? tariffa(n.totalCost / q2) : null;
      }
      n.source = 'modificato';
      return n;
    });
    if (!trovata) return distinta;
    return ricomponi(distinta, voci);
  }

  function senzaVoce(distinta, voceId) {
    if (!distinta || !distinta.voci) return distinta;
    var voci = distinta.voci.filter(function (v) { return String(v.id) !== String(voceId); });
    return ricomponi(distinta, voci);
  }

  function conNuovaVoce(distinta, dati) {
    if (!distinta) return distinta;
    var d = Object.assign({ id: 'manuale-' + Date.now(), category: 'other',
      label: 'Voce', quantity: 1, unit: 'pz' }, dati || {});
    /* Il totale si calcola **prima** di costruire la riga: `riga()` legge il
       totale e ne ricava il costo unitario, quindi passarle solo il costo
       unitario le farebbe leggere zero e riscrivere zero. Chi aggiunge una
       voce scrive «3,50 a pezzo per due pezzi», non «sette». */
    if (d.totalCost == null && d.unitCost != null) {
      d.totalCost = arr(num(d.unitCost) * num(d.quantity, 1));
    }
    return ricomponi(distinta, (distinta.voci || []).concat([riga(d, { source: 'manuale' })]));
  }

  /** Rifà i totali dalle voci, conservando margine, sconto e IVA della
      distinta di partenza: sono decisioni commerciali, non conseguenze delle
      voci, e ricalcolarle qui vorrebbe dire deciderle al posto di qualcuno. */
  function ricomponi(distinta, voci) {
    var perCategoria = {};
    ORDINE.forEach(function (c) { perCategoria[c] = []; });
    voci.forEach(function (v) {
      if (!perCategoria[v.category]) perCategoria[v.category] = [];
      perCategoria[v.category].push(v);
    });
    var totaliCategoria = {};
    var costo = 0;
    Object.keys(perCategoria).forEach(function (c) {
      var t = perCategoria[c].reduce(function (a, v) { return a + num(v.totalCost); }, 0);
      totaliCategoria[c] = arr(t);
      costo += t;
    });

    var vecchi = distinta.totals || {};
    var qty = Math.max(1, pos(distinta.quantita, 1));
    var marginePct = num(vecchi.marginePct);
    /* ── Che cosa cambia quando cambia un costo ───────────────────────
       La prima versione di questa funzione ricalcolava il prezzo dal margine:
       `netto = costo / (1 − margine)`. Misurato, su un preventivo dello Smart
       Quoter il prezzo **crollava** da € 385 a € 76 — perché in quel
       preventivatore il prezzo nasce dai prezzi di riga, non da un margine
       applicato al costo, e riderivarlo da un margine che non era la base di
       partenza produce un numero che non è mai esistito.

       Il prezzo resta quello concordato. Se il materiale costa di più, non è
       il cliente a pagarlo di colpo: è il margine a scendere, ed è
       esattamente l'informazione che serve vedere. Riprezzare è una decisione
       commerciale separata, e chi la prende lo fa scrivendo il prezzo nuovo.

       Il margine si ricalcola dal costo e dal prezzo, e la sua aritmetica non
       ha alternative: profitto = prezzo − costo. */
    var netto = num(vecchi.netto);
    var iva = num(vecchi.iva);
    var costoTotale = costo * qty;
    var margine = netto - costoTotale;
    var marginePctNuovo = netto > 0 ? (margine / netto) * 100 : 0;

    return {
      schemaVersion: distinta.schemaVersion || VERSIONE,
      categorie: perCategoria,
      totaliCategoria: totaliCategoria,
      voci: voci,
      quantita: qty,
      totals: {
        costoVoci: arr(costo),
        costoPezzo: arr(costo),
        costoTotale: arr(costo * qty),
        nettoPezzo: arr(netto / qty),
        netto: arr(netto),
        lordo: arr(netto + iva),
        iva: arr(iva),
        margine: arr(margine),
        marginePct: arr(marginePctNuovo),
        margineOriginalePct: arr(marginePct),
        scontoPct: num(vecchi.scontoPct),
      },
      vuota: voci.length === 0,
      modificata: true,
    };
  }

  /* ── Confronto: che cosa era stato promesso, che cosa si sta facendo ──── */

  function scostamento(originale, corrente) {
    if (!originale || !corrente) return null;
    var a = originale.totals || {};
    var b = corrente.totals || {};
    var perVoce = [];
    var perId = {};
    (originale.voci || []).forEach(function (v) { perId[v.id] = v; });
    (corrente.voci || []).forEach(function (v) {
      var o = perId[v.id];
      if (!o) { perVoce.push({ id: v.id, label: v.label, stato: 'aggiunta', delta: num(v.totalCost) }); return; }
      var d = arr(num(v.totalCost) - num(o.totalCost));
      if (d !== 0) perVoce.push({ id: v.id, label: v.label, stato: 'modificata',
        prima: num(o.totalCost), dopo: num(v.totalCost), delta: d });
      delete perId[v.id];
    });
    Object.keys(perId).forEach(function (k) {
      perVoce.push({ id: k, label: perId[k].label, stato: 'rimossa', delta: -num(perId[k].totalCost) });
    });
    return {
      costo: arr(num(b.costoTotale) - num(a.costoTotale)),
      netto: arr(num(b.netto) - num(a.netto)),
      margine: arr(num(b.margine) - num(a.margine)),
      marginePct: arr(num(b.marginePct) - num(a.marginePct)),
      voci: perVoce,
      invariato: perVoce.length === 0,
    };
  }

  /* ── Migrazione dei record vecchi ─────────────────────────────────────── */

  /** Un preventivo salvato prima di questa distinta non ne ha una, e non se
      ne può inventare una dai tre totali che conserva. Si dichiara che manca:
      è l'unica cosa onesta, e permette all'interfaccia di dirlo invece di
      mostrare una tabella vuota che sembra un errore. */
  function daRecordVecchio(record) {
    if (!record) return vuota('nessun record');
    if (record.costBreakdown && record.costBreakdown.voci) return record.costBreakdown;
    var v = vuota('preventivo salvato prima della distinta economica: le voci non sono ricostruibili');
    v.legacy = true;
    v.totals.costoTotale = arr(record.totalCost);
    v.totals.costoPezzo = arr(record.totalCost);
    v.totals.netto = arr(record.netPrice);
    v.totals.lordo = arr(record.grossPrice);
    return v;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     IL MODELLO ECONOMICO DELL'ORDINE
     ═══════════════════════════════════════════════════════════════════════

     Un ordine che porta solo `value: 150` non sa niente di se stesso. Aperto
     fra sei mesi non può dire quanto era costato produrlo, che margine ci si
     era messi, né quali voci componessero quel costo — e senza quei numeri la
     domanda «su questo lavoro ci ho guadagnato?» non ha risposta.

     `economic` è quella risposta, congelata al momento del preventivo.

     ── Perché `costs` non usa le categorie della distinta ─────────────────

     La distinta raggruppa manutenzione dentro «macchina», perché in tabella
     leggerle separate non aiuta nessuno. Qui invece si conservano distinte:
     ammortamento e manutenzione sono due decisioni diverse — la prima
     dipende da quanto è costata la macchina, la seconda da quanto la si usa —
     e chi rilegge il costo deve poterle separare. Le voci portano il loro
     `id` originale, e da lì si costruisce `costs` senza accorpare niente.

     ── Che cosa NON entra qui ────────────────────────────────────────────

     Nulla di questo va mostrato al cliente. Il cliente vede descrizione,
     quantità, prezzo unitario, sconto, imponibile, IVA e totale. Costo di
     produzione, margine, markup e profitto restano dentro INGLY OS. */

  /* La mappa fra l'id della voce e il nome del costo. Un id che non è qui
     finisce in `altro`: perderlo sarebbe peggio che classificarlo male. */
  var COSTI = {
    materiale: 'materiale', material: 'materiale', resina: 'materiale',
    inchiostro: 'materiale', film: 'materiale', supporto: 'materiale', blank: 'materiale',
    energia: 'energia',
    macchina: 'macchina', ammortamento: 'macchina',
    manutenzione: 'manutenzione',
    manodopera: 'manodopera', finitura: 'manodopera', lavoro: 'manodopera',
    setup: 'setup', avviamento: 'setup', primaStampa: 'setup', profilo: 'setup',
    scarto: 'scarto', scarti: 'scarto',
    overhead: 'overhead', spese: 'overhead',
    packaging: 'packaging', imballo: 'packaging',
    commissioni: 'commissioni',
    spedizione: 'spedizione',
    hardware: 'accessori', accessori: 'accessori', primer: 'accessori',
    post: 'postProcesso', postprocesso: 'postProcesso', lavaggio: 'postProcesso',
  };
  var VOCI_COSTO = ['materiale', 'energia', 'macchina', 'manutenzione', 'manodopera',
    'setup', 'postProcesso', 'scarto', 'overhead', 'packaging', 'accessori',
    'commissioni', 'spedizione', 'altro'];

  function costoDi(id) {
    var k = String(id || '').toLowerCase().replace(/[^a-z]/g, '');
    return COSTI[k] || 'altro';
  }

  /**
   * @param calcolo  il risultato del motore (o dell'adapter del preventivo)
   * @param distinta la distinta già costruita, per non rifarla
   * @param opzioni  { quantita, righe, versione }
   */
  function economico(calcolo, distinta, opzioni) {
    var o = opzioni || {};
    var k = calcolo || {};
    var d = distinta || vuota('nessuna distinta');
    var qty = Math.max(1, pos(o.quantita != null ? o.quantita : (d.quantita || k.qty), 1));

    /* I costi per nome, senza accorpare. */
    var costs = {};
    VOCI_COSTO.forEach(function (c) { costs[c] = 0; });
    (d.voci || []).forEach(function (v) {
      var c = costoDi(v.id);
      costs[c] = arr(num(costs[c]) + num(v.totalCost));
    });
    /* Le voci che il motore tiene fuori dalla distinta ma dentro il conto. */
    if (pos(k.commissionsTotal) > 0) costs.commissioni = arr(pos(k.commissionsTotal));
    if (k.shipping && pos(k.shipping.cost) > 0) costs.spedizione = arr(pos(k.shipping.cost));

    var costTotal = arr(k.totalCost != null ? k.totalCost
      : (k.costoTotale != null ? k.costoTotale : (d.totals || {}).costoTotale));
    var revenueNet = arr(k.subtotalNet != null ? k.subtotalNet : (d.totals || {}).netto);
    var revenueGross = arr(k.totalGross != null ? k.totalGross : (d.totals || {}).lordo);
    var iva = arr(k.vat != null ? k.vat : (d.totals || {}).iva);

    /* Il profitto è ricavo netto meno costo di produzione, e basta. Non si
       somma voce per voce: il prezzo lo decide il pricing sull'insieme, e
       ricavarlo dalle righe darebbe un numero diverso da quello che il motore
       ha calcolato. */
    var profit = arr(revenueNet - costTotal);
    var marginPct = revenueNet > 0 ? arr((profit / revenueNet) * 100) : 0;
    var markupPct = costTotal > 0 ? arr((profit / costTotal) * 100) : 0;

    /* Le linee: quello che si vende, con accanto quello che costa. Le due
       cose non vanno confuse — è la classe di errore che questo modello esiste
       per rendere impossibile — quindi hanno nomi diversi e stanno in campi
       diversi. */
    var righe = (o.righe && o.righe.length ? o.righe : (k.lines || [])).map(function (l) {
      var q = num(l.qty != null ? l.qty : l.quantity, 1) || 1;
      var costoRiga = arr(num(l.unitCost != null ? l.unitCost * q : l.subtotal));
      var prezzoRiga = arr(num(l.lineNet != null ? l.lineNet
        : (l.price != null ? l.price * q : l.subtotal)));
      return {
        id: String(l.id || l.name || ''),
        name: l.name || l.desc || 'Voce',
        category: l.category || l.catLabel || '',
        detail: l.detail || '',
        quantity: q,
        productionCostUnit: arr(costoRiga / q),
        productionCostTotal: costoRiga,
        salePriceUnit: arr(prezzoRiga / q),
        salePriceTotal: prezzoRiga,
        profitUnit: arr((prezzoRiga - costoRiga) / q),
        profitTotal: arr(prezzoRiga - costoRiga),
        marginPct: prezzoRiga > 0 ? arr(((prezzoRiga - costoRiga) / prezzoRiga) * 100) : 0,
        source: l.itemKey ? 'magazzino' : 'preventivo',
      };
    });

    return {
      currency: 'EUR',
      costTotal: costTotal,
      revenueNet: revenueNet,
      revenueGross: revenueGross,
      profit: profit,
      marginPct: marginPct,
      markupPct: markupPct,
      quantity: qty,
      lines: righe,
      costs: costs,
      pricing: {
        markupPct: arr(k.markupPct),
        discountPct: arr(k.discountAppliedPct != null ? k.discountAppliedPct : k.discountRequestedPct),
        ivaPct: arr(k.vatPct),
        net: revenueNet,
        iva: iva,
        gross: revenueGross,
      },
      calculationVersion: o.versione
        || (global.InglyCostEngine && global.InglyCostEngine.version) || null,
      calculatedAt: o.quando || new Date().toISOString(),
    };
  }

  /** Da un ordine vecchio, senza `economic`, si ricostruisce quello che i suoi
      campi permettono — e si marca da dove viene. Non si inventa un costo che
      non è mai stato scritto: resta zero, e chi legge lo vede. */
  function economicoLegacy(ordine) {
    var o = ordine || {};
    var costTotal = arr(o.totalCost != null ? o.totalCost : (o.cost != null ? o.cost : 0));
    var revenueNet = arr(o.totalNet != null ? o.totalNet
      : (o.netPrice != null ? o.netPrice : (o.total != null ? o.total : o.value)));
    var revenueGross = arr(o.grossPrice != null ? o.grossPrice : revenueNet);
    var profit = arr(revenueNet - costTotal);
    var costs = {};
    VOCI_COSTO.forEach(function (c) { costs[c] = 0; });
    return {
      currency: 'EUR',
      costTotal: costTotal, revenueNet: revenueNet, revenueGross: revenueGross,
      profit: profit,
      marginPct: revenueNet > 0 ? arr((profit / revenueNet) * 100) : 0,
      markupPct: costTotal > 0 ? arr((profit / costTotal) * 100) : 0,
      quantity: 1, lines: [], costs: costs,
      pricing: { markupPct: 0, discountPct: arr(o.discount), ivaPct: 0,
        net: revenueNet, iva: arr(revenueGross - revenueNet), gross: revenueGross },
      calculationVersion: null, calculatedAt: o.createdAt || null,
      source: 'legacy',
      costoAttendibile: costTotal > 0,
    };
  }

  global.InglyCostBreakdown = {
    VOCI_COSTO: VOCI_COSTO,
    costoDi: costoDi,
    economico: economico,
    economicoLegacy: economicoLegacy,
    VERSIONE: VERSIONE,
    CATEGORIE: CATEGORIE,
    ORDINE: ORDINE,
    labelCategoria: labelCategoria,
    categoriaDi: categoriaDi,
    daCalcolo: daCalcolo,
    daRighe: daRighe,
    daRecordVecchio: daRecordVecchio,
    conVoce: conVoce,
    senzaVoce: senzaVoce,
    conNuovaVoce: conNuovaVoce,
    scostamento: scostamento,
    vuota: vuota,
  };
})(typeof window !== 'undefined' ? window : globalThis);
