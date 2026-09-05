/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · PRODUCT BUILDER
   ═══════════════════════════════════════════════════════════════════════════

   Trasforma un'idea in un prodotto producibile: cosa serve, quanto costa
   davvero, a che prezzo va venduto e con che margine.

       Prodotto → Tecnologia → Macchina → Materiale → Produzione
                → Costi → Prezzo → Varianti

   Da dove vengono i numeri — e da dove **non** vengono:

   · Le macchine sono quelle del parco (`equipment`), con i parametri che
     `MachineHub` già deriva dal record: ammortamento €/h e consumo €/h.
   · I materiali sono quelli del magazzino (`items`), con il loro costo reale.
   · Costo e prezzo li calcola `PricingEngine.suggest()`, il motore che il
     Catalogo usa già, con le tariffe salvate in Impostazioni.

   Qui non c'è aritmetica di costo: c'è la raccolta degli ingressi e la
   presentazione del risultato. Nessun secondo modello di costo, nessun
   secondo catalogo.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  const UI = global.InglyUI;
  const Data = global.InglyData;
  if (!UI || !Data) return;

  const esc = UI.esc;
  const fmt = UI.fmt;
  const SECTION = 'product_builder';
  const VIEW_ID = 'view-' + SECTION;

  const STEPS = [
    { id: 'product', label: 'Prodotto', icon: 'fa-tag' },
    { id: 'technology', label: 'Tecnologia', icon: 'fa-bolt' },
    { id: 'machine', label: 'Macchina', icon: 'fa-microchip' },
    { id: 'material', label: 'Materiale', icon: 'fa-boxes-stacked' },
    { id: 'production', label: 'Produzione', icon: 'fa-gears' },
    { id: 'costs', label: 'Costi', icon: 'fa-calculator' },
    { id: 'pricing', label: 'Prezzo', icon: 'fa-euro-sign' },
    { id: 'variants', label: 'Varianti', icon: 'fa-layer-group' },
  ];

  const VARIANT_AXES = [
    { id: 'dimension', label: 'Dimensione', placeholder: 'S, M, L · 10×10, 15×15' },
    { id: 'material', label: 'Materiale', placeholder: 'MDF, acrilico, alluminio' },
    { id: 'finish', label: 'Finitura', placeholder: 'naturale, laccato, satinato' },
    { id: 'personalization', label: 'Personalizzazione', placeholder: 'nome, logo, data' },
  ];

  /* Lo stato del builder. Vive in memoria finché non si salva: un prodotto a
     metà non deve comparire nel catalogo. */
  const state = {
    step: 0,
    /* La foto del prodotto: un prodotto senza immagine è una riga di testo in
       un listino, e un cliente non compra una riga di testo. */
    image: null,
    name: '',
    category: '',
    subcategory: '',
    target: 'b2c',
    tech: null,
    machineId: '',
    materialId: '',
    materialQty: 1,
    machineMin: 0,
    laborMin: 0,
    quantity: 1,
    packaging: 0,
    extra: 0,
    markupOverride: null,
    variants: { dimension: '', material: '', finish: '', personalization: '' },
  };

  let sources = null;
  let result = null;
  let spiegazione = null;
  /* Due interruttori di vista, non di calcolo: il conto è sempre lo stesso. */
  let mostraSpiegazione = false;
  let auditCosto = false;

  /* ── Passi ──────────────────────────────────────────────────────────────  */

  function stepRail() {
    return '<ol class="pb__rail">' + STEPS.map(function (s, i) {
      const status = i === state.step ? 'is-current' : i < state.step ? 'is-done' : '';
      return '<li class="pb__rail-step ' + status + '" data-pb-step="' + i + '" role="button" tabindex="0">' +
        '<span class="pb__rail-num">' + (i < state.step ? '<i class="fas fa-check"></i>' : i + 1) + '</span>' +
        '<span class="pb__rail-label">' + esc(s.label) + '</span></li>';
    }).join('') + '</ol>';
  }

  function field(label, html, hint) {
    return '<div class="form-group"><label class="form-label">' + esc(label) + '</label>' + html +
      (hint ? '<div class="form-hint">' + esc(hint) + '</div>' : '') + '</div>';
  }

  function stepProduct() {
    const cats = sources.categories;
    return field('Nome del prodotto',
      '<input class="form-control" data-pb="name" value="' + esc(state.name) + '" ' +
      'placeholder="Portachiavi personalizzato">') +
      '<div class="form-row">' +
      field('Categoria',
        '<input class="form-control" data-pb="category" list="pb-cats" value="' + esc(state.category) + '" ' +
        'placeholder="Gadget">' +
        '<datalist id="pb-cats">' + cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist>',
        cats.length ? 'Categorie già usate nel catalogo' : 'Il catalogo non ha ancora categorie') +
      field('Sottocategoria',
        '<input class="form-control" data-pb="subcategory" value="' + esc(state.subcategory) + '" ' +
        'placeholder="Portachiavi">') +
      '</div>' +
      field('Destinazione',
        '<select class="form-control" data-pb="target">' +
        [['b2c', 'B2C — vendita al pubblico'], ['b2b', 'B2B — rivenditori e aziende'], ['both', 'Entrambi']]
          .map(function (o) {
            return '<option value="' + o[0] + '"' + (state.target === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
          }).join('') + '</select>') +
      /* Il campo si monta dopo il render: qui si lascia solo il posto. */
      '<div data-pb-immagine></div>';
  }

  function stepTechnology() {
    return '<div class="pb__cards">' + Data.TECHNOLOGIES.map(function (t) {
      const owned = sources.machines.some(function (m) { return m.techId === t.id; });
      return '<button type="button" class="pb__card' + (state.tech === t.id ? ' is-selected' : '') + '" ' +
        'data-pb-tech="' + t.id + '">' +
        '<i class="fas ' + esc(t.icon) + '" aria-hidden="true"></i>' +
        '<span class="pb__card-label">' + esc(t.label) + '</span>' +
        '<span class="pb__card-detail">' + esc(t.detail) + '</span>' +
        (owned ? '<span class="pb__card-note">macchina disponibile</span>'
               : '<span class="pb__card-note is-muted">nessuna macchina registrata</span>') +
        '</button>';
    }).join('') + '</div>';
  }

  function stepMachine() {
    if (!sources.hasMachines) {
      return UI.emptyState({
        icon: 'fa-microchip',
        title: 'Nessuna macchina nel parco',
        body: 'Il calcolo dei costi usa i parametri della macchina registrata. Aggiungine una in Attrezzature.',
        action: { label: 'Vai ad Attrezzature', section: 'equipment' },
      });
    }
    const list = state.tech
      ? sources.machines.filter(function (m) { return m.techId === state.tech; })
      : sources.machines;
    if (!list.length) {
      return '<p class="pb__note">Nessuna macchina della tecnologia scelta. ' +
        'Puoi selezionarne una qualsiasi o registrare la macchina giusta in Attrezzature.</p>' +
        machineList(sources.machines);
    }
    return machineList(list);
  }

  function machineList(list) {
    return '<div class="pb__list">' + list.map(function (m) {
      const rate = m.hourly + m.energyH;
      return '<button type="button" class="pb__row' + (state.machineId === String(m.id) ? ' is-selected' : '') + '" ' +
        'data-pb-machine="' + esc(m.id) + '">' +
        '<span class="pb__row-main"><span class="pb__row-title">' + esc(m.name) + '</span>' +
        '<span class="pb__row-meta">' + esc(m.tech) + (m.workArea ? ' · ' + esc(m.workArea) : '') + '</span></span>' +
        '<span class="pb__row-value">' + (rate > 0 ? fmt.currency(rate) + '/h' : '—') + '</span></button>';
    }).join('') + '</div>' +
      '<p class="pb__note">Il valore €/h è ammortamento più energia, come lo calcola il registro macchine.</p>';
  }

  function stepMaterial() {
    if (!sources.hasMaterials) {
      return UI.emptyState({
        icon: 'fa-boxes-stacked',
        title: 'Magazzino vuoto',
        body: 'Il costo del materiale viene dal magazzino. Inserisci gli articoli che usi.',
        action: { label: 'Vai al magazzino', section: 'items' },
      });
    }
    const mat = selectedMaterial();
    return field('Materiale',
      '<select class="form-control" data-pb="materialId">' +
      '<option value="">— scegli dal magazzino —</option>' +
      sources.materials.map(function (m) {
        return '<option value="' + esc(m.id) + '"' + (state.materialId === String(m.id) ? ' selected' : '') + '>' +
          esc(m.name) + ' · ' + fmt.currency(m.cost) + '/' + esc(m.unit) + '</option>';
      }).join('') + '</select>') +
      field('Quantità di materiale per pezzo',
        '<input class="form-control" type="number" min="0" step="0.01" data-pb="materialQty" ' +
        'value="' + state.materialQty + '">',
        mat ? 'Espressa in ' + mat.unit + ' · giacenza attuale ' + fmt.number(mat.stock) + ' ' + mat.unit : null) +
      (mat && mat.stock <= 0
        ? '<div class="ds-alert ds-alert--warning">Questo materiale risulta esaurito in magazzino.</div>'
        : '');
  }

  function stepProduction() {
    return '<div class="form-row">' +
      field('Tempo macchina (minuti)',
        '<input class="form-control" type="number" min="0" step="0.5" data-pb="machineMin" value="' + state.machineMin + '">',
        'Taglio, incisione, stampa: il tempo in cui la macchina è occupata') +
      field('Manodopera (minuti)',
        '<input class="form-control" type="number" min="0" step="0.5" data-pb="laborMin" value="' + state.laborMin + '">',
        'Preparazione, scarico, rifinitura, controllo') +
      '</div>' +
      field('Pezzi per lotto',
        '<input class="form-control" type="number" min="1" step="1" data-pb="quantity" value="' + state.quantity + '">',
        'Serve per il prezzo B2B e il minimo d\'ordine') +
      '<p class="pb__note">Per una stima fine dei tempi usa i calcolatori dedicati: ' +
      '<button type="button" class="btn btn-ghost btn-sm" data-nav="lasercalc">Calcolatore laser</button> ' +
      '<button type="button" class="btn btn-ghost btn-sm" data-nav="print3d">Preventivatore 3D</button></p>';
  }

  function stepCosts() {
    return '<div class="form-row">' +
      field('Packaging (€ a pezzo)',
        '<input class="form-control" type="number" min="0" step="0.01" data-pb="packaging" value="' + state.packaging + '">') +
      field('Altri costi (€ a pezzo)',
        '<input class="form-control" type="number" min="0" step="0.01" data-pb="extra" value="' + state.extra + '">',
        'Grafica, spedizione, scarti') +
      '</div>' + costBreakdown();
  }

  function costBreakdown() {
    if (!result) return '<p class="pb__note">Compila i passi precedenti per vedere il calcolo.</p>';
    if (result.empty) {
      return '<div class="ds-alert ds-alert--warning">' + esc(result.reason) + '</div>';
    }

    const mat = selectedMaterial();
    const machine = selectedMachine();
    const materialCost = mat ? mat.cost * Number(state.materialQty || 0) : 0;
    const s = sources.settings;

    const rows = [
      ['Materiale' + (mat ? ' · ' + mat.name : ''), materialCost],
      ['Macchina · ' + state.machineMin + ' min × ' + fmt.currency(s.machineCostPerMin) + '/min',
        Number(state.machineMin || 0) * s.machineCostPerMin],
      ['Manodopera · ' + state.laborMin + ' min × ' + fmt.currency(s.laborCostPerMin) + '/min',
        Number(state.laborMin || 0) * s.laborCostPerMin],
      ['Packaging', Number(state.packaging || 0)],
      ['Altri costi', Number(state.extra || 0)],
    ].filter(function (r) { return r[1] > 0; });

    return '<div class="pb__breakdown">' +
      '<div class="pb__breakdown-title">Costo per pezzo</div>' +
      '<ul class="pb__cost-list">' + rows.map(function (r) {
        return '<li><span>' + esc(r[0]) + '</span><span>' + fmt.currency(r[1]) + '</span></li>';
      }).join('') +
      '<li class="is-total"><span>Costo totale</span><span>' + fmt.currency(result.totalCost) + '</span></li>' +
      '</ul>' +
      (machine && machine.hourly + machine.energyH > 0
        ? '<p class="pb__note">Nel registro macchine ' + esc(machine.name) + ' costa ' +
          fmt.currency(machine.hourly + machine.energyH) + '/h (ammortamento + energia), pari a ' +
          fmt.currency((machine.hourly + machine.energyH) / 60) + '/min. Il calcolo qui sopra usa la ' +
          'tariffa generale di Impostazioni (' + fmt.currency(s.machineCostPerMin) + '/min): allineale se vuoi ' +
          'il costo di questa macchina.</p>'
        : '') +
      '</div>';
  }

  function stepPricing() {
    if (!result || result.empty) {
      return '<p class="pb__note">Il prezzo si calcola dopo i costi.</p>' + costBreakdown();
    }

    const qty = Math.max(1, Number(state.quantity || 1));

    return '<div class="pb__prices">' +
      priceTile('Costo reale', result.totalCost, 'per pezzo, ' + qty + ' pz') +
      priceTile('Prezzo netto', result.priceNet, 'senza IVA') +
      priceTile('Prezzo cliente', result.priceGross, 'IVA ' + sources.settings.vat + '% inclusa') +
      priceTile('Margine', result.margin, 'sul ricavo', 'percent') +
      priceTile('Ricarico', result.markupPct, 'sul costo', 'percent') +
      '</div>' +
      posizionamenti() +
      field('Ricarico applicato (%)',
        '<input class="form-control" type="number" min="0" step="1" data-pb="markupOverride" ' +
        'value="' + (state.markupOverride === null ? sources.settings.markup : state.markupOverride) + '">',
        'Predefinito da Impostazioni: ' + sources.settings.markup + '%') +
      scaglioni() +
      '<div class="pb__actions-inline">' +
      '<button type="button" class="ds-btn ds-btn--ghost" data-pb-explain aria-expanded="' + (mostraSpiegazione ? 'true' : 'false') + '">' +
      '<i class="fa-solid fa-list-check" aria-hidden="true"></i> ' +
      (mostraSpiegazione ? 'Nascondi il calcolo' : 'Come è stato calcolato?') + '</button>' +
      '<button type="button" class="ds-btn ds-btn--ghost' + (auditCosto ? ' is-on' : '') + '" data-pb-audit aria-pressed="' + (auditCosto ? 'true' : 'false') + '">' +
      '<i class="fa-solid fa-magnifying-glass-dollar" aria-hidden="true"></i> Audit costo</button>' +
      '</div>' +
      cassetto();
  }

  /* ── I quattro posizionamenti ─────────────────────────────────────────────
     Non quattro numeri a caso: le politiche del motore, lette e non riscritte.
     È la differenza fra un prezzo e una decisione di prezzo. */
  function posizionamenti() {
    const cons = (spiegazione && spiegazione.recommendations) || [];
    if (!cons.length) return '';
    return '<div class="pb__policies">' +
      '<div class="pb__breakdown-title">Posizionamento</div>' +
      '<div class="pb__policy-row">' + cons.map(function (c) {
        return '<div class="pb__policy' + (c.recommended ? ' is-recommended' : '') + '">' +
          (c.recommended ? '<span class="pb__policy-tag">Consigliato</span>' : '') +
          '<div class="pb__policy-label">' + esc(c.label) + '</div>' +
          '<div class="pb__policy-price">' + fmt.currency(c.price) + '</div>' +
          '<div class="pb__policy-meta">margine ' + fmt.value(c.margin, 'percent') +
          ' · ricarico ' + fmt.value(c.markup, 'percent') + '</div>' +
          '<div class="pb__policy-why">' + esc(c.reason) + '</div>' +
          '</div>';
      }).join('') + '</div></div>';
  }

  /* ── Scaglioni di quantità ────────────────────────────────────────────────
     Il prezzo scende perché scende il costo: l'avviamento si divide. La
     colonna «Setup/pz» lo rende visibile, ed è la risposta alla domanda che
     il cliente fa sempre — «e se ne prendo il doppio?». */
  function scaglioni() {
    const righe = (result && result.quantityTiers) || [];
    if (!righe.length) return '';

    /* Il miglior punto non è il più grande: è quello dove l'ultimo raddoppio
       di quantità smette di far scendere il costo unitario in modo sensibile.
       Sotto il 3% il lotto più grande immobilizza magazzino senza guadagnarci. */
    let migliore = righe[0];
    for (let i = 1; i < righe.length; i += 1) {
      const guadagno = migliore.costoPezzo > 0
        ? (migliore.costoPezzo - righe[i].costoPezzo) / migliore.costoPezzo : 0;
      if (guadagno >= 0.03) migliore = righe[i];
    }

    return '<div class="pb__tiers">' +
      '<div class="pb__breakdown-title">Scaglioni di quantità</div>' +
      '<div class="pb__tiers-scroll"><table class="pb__tiers-table">' +
      '<thead><tr><th scope="col">Quantità</th><th scope="col">Costo/pz</th>' +
      '<th scope="col">Setup/pz</th><th scope="col">Prezzo/pz</th>' +
      '<th scope="col">Totale</th><th scope="col">Profitto</th><th scope="col">Margine</th></tr></thead>' +
      '<tbody>' + righe.map(function (t) {
        const evidenzia = t.qty === migliore.qty;
        return '<tr' + (evidenzia ? ' class="is-best"' : '') + '>' +
          '<th scope="row">' + t.qty + (evidenzia ? '<span class="pb__best">Miglior valore</span>' : '') + '</th>' +
          '<td>' + fmt.currency(t.costoPezzo) + '</td>' +
          '<td>' + fmt.currency(t.unaTantumPerPezzo) + '</td>' +
          '<td>' + fmt.currency(t.prezzoPezzo) + '</td>' +
          '<td>' + fmt.currency(t.totaleNetto) + '</td>' +
          '<td>' + fmt.currency(t.profitto) + '</td>' +
          '<td>' + fmt.value(t.marginePct, 'percent') + '</td>' +
          '</tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  /* ── Il cassetto «come è stato calcolato» ─────────────────────────────────
     Dentro la pagina, non in una finestra del browser: chi sta preventivando
     non deve perdere di vista i campi che ha appena compilato. */
  function cassetto() {
    if (!mostraSpiegazione || !spiegazione || spiegazione.vuoto) return '';

    const gruppi = [
      { id: 'una tantum', titolo: 'Costi una tantum' },
      { id: 'per pezzo', titolo: 'Costi per pezzo' },
      { id: 'costo', titolo: '' },
      { id: 'prezzo', titolo: 'Prezzo' },
      { id: 'profitto', titolo: 'Profitto' },
    ];

    const righe = gruppi.map(function (g) {
      const voci = spiegazione.lines.filter(function (r) { return r.gruppo === g.id; });
      if (!voci.length) return '';
      return (g.titolo ? '<li class="pb__calc-head">' + esc(g.titolo) + '</li>' : '') +
        voci.map(function (r) {
          const forte = r.id === 'costoPezzo' || r.id === 'lordo' || r.id === 'operativo';
          return '<li class="pb__calc-row' + (forte ? ' is-total' : '') + '">' +
            '<span class="pb__calc-label">' + esc(r.label) +
            (auditCosto ? badgeFonte(r.fonte) : '') + '</span>' +
            '<span class="pb__calc-formula">' + esc(r.formula) + '</span>' +
            '<span class="pb__calc-value">' + fmt.currency(r.result) + '</span>' +
            '</li>';
        }).join('');
    }).join('');

    const avvisi = (spiegazione.warnings || []).length
      ? '<ul class="pb__warnings">' + spiegazione.warnings.map(function (w) {
        return '<li class="pb__warning pb__warning--' + w.livello.toLowerCase() + '">' +
          '<span class="pb__warning-level">' + w.livello + '</span> ' + esc(w.messaggio) +
          (w.azione ? ' <em>' + esc(w.azione) + '</em>' : '') + '</li>';
      }).join('') + '</ul>'
      : '';

    return '<div class="pb__calc" role="region" aria-label="Dettaglio del calcolo">' +
      (auditCosto
        ? '<p class="pb__note">Audit costo attivo: accanto a ogni voce c\'è da dove viene il numero.</p>'
        : '') +
      '<ul class="pb__calc-list">' + righe + '</ul>' + avvisi + '</div>';
  }

  /* La provenienza di un numero, dichiarata e non dedotta: il motore sa se un
     campo c\'era, e chi lo chiama sa da dove l\'ha preso. */
  const FONTI = {
    magazzino:   { et: 'Magazzino',   cl: 'reale' },
    reale:       { et: 'Reale',       cl: 'reale' },
    inventory:   { et: 'Magazzino',   cl: 'reale' },
    configurato: { et: 'Configurato', cl: 'configurato' },
    inserito:    { et: 'Manuale',     cl: 'manuale' },
    default:     { et: 'Default',     cl: 'default' },
    stima:       { et: 'Stimato',     cl: 'stima' },
    calcolato:   { et: 'Calcolato',   cl: 'calcolato' },
    mancante:    { et: 'Mancante',    cl: 'mancante' },
  };

  function badgeFonte(fonte) {
    const f = FONTI[fonte];
    if (!f) return '';
    return ' <span class="pb__source pb__source--' + f.cl + '">' + esc(f.et) + '</span>';
  }

  function priceTile(label, value, note, format) {
    return '<div class="pb__price">' +
      '<div class="pb__price-label">' + esc(label) + '</div>' +
      '<div class="pb__price-value">' + fmt.value(value, format || 'currency') + '</div>' +
      '<div class="pb__price-note">' + esc(note) + '</div></div>';
  }

  function stepVariants() {
    return '<p class="pb__note">Gli assi lungo cui il prodotto si declina. Separa i valori con una virgola.</p>' +
      VARIANT_AXES.map(function (a) {
        return field(a.label,
          '<input class="form-control" data-pb-variant="' + a.id + '" ' +
          'value="' + esc(state.variants[a.id]) + '" placeholder="' + esc(a.placeholder) + '">');
      }).join('') + variantPreview();
  }

  function variantCount() {
    return VARIANT_AXES.reduce(function (acc, a) {
      const n = String(state.variants[a.id] || '').split(',').map(function (v) { return v.trim(); })
        .filter(Boolean).length;
      return acc * (n || 1);
    }, 1);
  }

  function variantPreview() {
    const n = variantCount();
    if (n <= 1) return '';
    return '<div class="ds-alert ds-alert--info">Combinazioni possibili: <strong>' + n + '</strong>. ' +
      'Il costo cambia solo dove cambia il materiale o il tempo.</div>';
  }

  /* ── Riepilogo ──────────────────────────────────────────────────────────  */
  function summary() {
    if (!state.name) return '';
    const mat = selectedMaterial();
    const machine = selectedMachine();
    const tech = Data.TECHNOLOGIES.find(function (t) { return t.id === state.tech; });

    const rows = [
      ['Prodotto', state.name],
      ['Categoria', [state.category, state.subcategory].filter(Boolean).join(' · ')],
      ['Tecnologia', tech ? tech.label : ''],
      ['Macchina', machine ? machine.name : ''],
      ['Materiale', mat ? mat.name : ''],
      ['Tempo macchina', state.machineMin > 0 ? fmt.minutes(Number(state.machineMin)) : ''],
      ['Manodopera', state.laborMin > 0 ? fmt.minutes(Number(state.laborMin)) : ''],
      ['Costo', result && !result.empty ? fmt.currency(result.totalCost) : ''],
      ['Prezzo B2C', result && !result.empty ? fmt.currency(result.gross) : ''],
      ['Margine', result && !result.empty ? fmt.percent(result.margin) : ''],
    ].filter(function (r) { return r[1]; });

    return '<aside class="pb__summary">' +
      '<div class="pb__summary-title">Scheda prodotto</div>' +
      '<dl class="pb__summary-list">' + rows.map(function (r) {
        return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
      }).join('') + '</dl>' +
      (result && !result.empty ? productionGuide() : '') +
      '<button type="button" class="btn btn-primary btn-block" data-pb-save ' +
      (result && !result.empty ? '' : 'disabled') + '>Salva nel catalogo</button>' +
      '</aside>';
  }

  function productionGuide() {
    const mat = selectedMaterial();
    const machine = selectedMachine();
    const steps = [
      mat ? 'Prelevare ' + state.materialQty + ' ' + mat.unit + ' di ' + mat.name : null,
      machine ? 'Preparare ' + machine.name : null,
      state.machineMin > 0 ? 'Lavorazione: ' + fmt.minutes(Number(state.machineMin)) : null,
      state.laborMin > 0 ? 'Rifinitura e controllo: ' + fmt.minutes(Number(state.laborMin)) : null,
      Number(state.packaging) > 0 ? 'Confezionamento' : null,
    ].filter(Boolean);
    if (!steps.length) return '';
    return '<div class="pb__guide"><div class="pb__guide-title">Guida di produzione</div>' +
      '<ol class="pb__guide-list">' + steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
      '</ol></div>';
  }

  /* ── Calcolo ────────────────────────────────────────────────────────────  */
  const selectedMaterial = () =>
    sources && sources.materials.find(function (m) { return String(m.id) === String(state.materialId); });
  const selectedMachine = () =>
    sources && sources.machines.find(function (m) { return String(m.id) === String(state.machineId); });

  async function recompute() {
    const mat = selectedMaterial();
    /* ── Confezione ed extra si contavano due volte ──────────────────────
       Erano sommati qui dentro `materialCost` **e** passati a `Data.price`
       come `packaging` e `other`, che li aggiunge come voci proprie. Ogni
       euro di confezione entrava due volte nel costo, e quindi nel prezzo.
       La spiegazione del prezzo li leggeva invece una volta sola: prezzo e
       spiegazione non tornavano.

       Il materiale è il materiale. La confezione ha la sua voce, dove il
       motore la vuole: costo diretto per pezzo, fuori dalla base dello
       scarto (un pezzo fallito non viene confezionato). */
    const materialCost = (mat ? mat.cost : 0) * Number(state.materialQty || 0);
    const machineMin = Number(state.machineMin || 0);
    const laborMin = Number(state.laborMin || 0);

    /* Un prodotto fatto di sola confezione è raro ma legittimo — un kit
       riconfezionato, per esempio — e prima contava perché la confezione era
       dentro `materialCost`. Ora che ha la sua voce, va nominata anche qui. */
    if (materialCost <= 0 && machineMin <= 0 && laborMin <= 0
        && Number(state.packaging || 0) <= 0 && Number(state.extra || 0) <= 0) {
      result = null;
      return;
    }
    result = await Data.price({
      materialCost, machineMin, laborMin, category: state.category,
      qty: Math.max(1, Number(state.quantity || 1)),
      packaging: Number(state.packaging || 0),
      other: Number(state.extra || 0),
    });
    /* La spiegazione si chiede insieme al prezzo: sono lo stesso conto visto
       da due lati, e chiederli in momenti diversi vorrebbe dire poterli
       vedere diversi. */
    spiegazione = await Data.priceExplain({
      materialCost, machineMin, laborMin,
      qty: Math.max(1, Number(state.quantity || 1)),
      packaging: Number(state.packaging || 0),
      other: Number(state.extra || 0),
    });
  }

  /* ── Salvataggio ────────────────────────────────────────────────────────
     Scrive nel catalogo esistente, con i campi che il modulo Catalogo usa già.
     Non crea uno store nuovo. */
  async function save() {
    if (!result || result.empty) return;
    const mat = selectedMaterial();
    const machine = selectedMachine();
    const product = {
      id: 'pb-' + Date.now(),
      name: state.name,
      category: state.category || '',
      subcategory: state.subcategory || '',
      costPrice: +result.totalCost.toFixed(2),
      salePrice: +result.gross.toFixed(2),
      margin: +result.margin.toFixed(1),
      time: Number(state.machineMin || 0) + Number(state.laborMin || 0),
      material: mat ? mat.name : '',
      machine: machine ? machine.name : '',
      tech: state.tech || '',
      variants: state.variants,
      /* Il catalogo chiama la foto `photo`: si scrive con il suo nome, non con
         uno nuovo. I metadati vanno accanto, senza toccare il campo che tutto
         il catalogo legge. */
      photo: state.image ? state.image.dataUrl : null,
      photoMeta: state.image || null,
      createdAt: new Date().toISOString(),
      source: 'product-builder',
    };

    try {
      await global.IDB.put('catalog', product);
      try { global.AppStore && global.AppStore.invalidate('catalog'); } catch (e) { /* cache assente */ }
      try { global.Bus && global.Bus.emit && global.Bus.emit('catalog:changed', product); } catch (e) { /* bus assente */ }
      UI.toast('Prodotto salvato nel catalogo', 'success');
      return true;
    } catch (e) {
      UI.toast('Non è stato possibile salvare il prodotto', 'danger');
      return false;
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────────  */
  function body() {
    switch (STEPS[state.step].id) {
      case 'product': return stepProduct();
      case 'technology': return stepTechnology();
      case 'machine': return stepMachine();
      case 'material': return stepMaterial();
      case 'production': return stepProduction();
      case 'costs': return stepCosts();
      case 'pricing': return stepPricing();
      case 'variants': return stepVariants();
      default: return '';
    }
  }

  function canAdvance() {
    if (STEPS[state.step].id === 'product') return state.name.trim().length > 1;
    return true;
  }

  async function render() {
    const view = document.getElementById(VIEW_ID);
    if (!view) return;
    if (!sources) sources = await Data.builderSources();
    await recompute();

    const step = STEPS[state.step];
    view.innerHTML =
      '<div class="module-header"><div>' +
      '<h2 class="module-title">Product Builder</h2>' +
      '<p class="module-subtitle">Da un\'idea a un prodotto producibile: macchina, materiale, tempi, costo e prezzo — ' +
      'con i dati del tuo laboratorio.</p></div></div>' +
      '<div class="pb">' +
      '<div class="pb__main">' +
      stepRail() +
      '<section class="pb__panel">' +
      '<header class="pb__panel-head">' +
      '<i class="fas ' + esc(step.icon) + '" aria-hidden="true"></i>' +
      '<h3>' + esc(step.label) + '</h3>' +
      '<span class="pb__panel-count">Passo ' + (state.step + 1) + ' di ' + STEPS.length + '</span>' +
      '</header>' +
      '<div class="pb__panel-body">' + body() + '</div>' +
      '<footer class="pb__panel-foot">' +
      '<button type="button" class="btn btn-secondary" data-pb-prev ' + (state.step === 0 ? 'disabled' : '') + '>' +
      'Indietro</button>' +
      '<button type="button" class="btn btn-primary" data-pb-next ' +
      (state.step === STEPS.length - 1 || !canAdvance() ? 'disabled' : '') + '>Avanti</button>' +
      '</footer></section></div>' +
      summary() +
      '</div>';

    montaImmagine(view);
  }

  /* Il campo immagine è lo stesso di preventivatori, ordini e catalogo:
     `InglyProductImage`. Non conosce archivi — dove finisce l'immagine lo
     decide chi lo monta, e qui finisce nello stato del builder, che si salva
     solo quando il prodotto si salva. */
  function montaImmagine(view) {
    const posto = view.querySelector('[data-pb-immagine]');
    if (!posto) return;
    const P = global.InglyProductImage;
    if (!P || !P.monta) return;
    P.monta(posto, {
      etichetta: 'Foto del prodotto',
      valore: state.image,
      compatto: true,
      onChange: function (img) { state.image = img; },
    });
  }

  /* ── Interazione ────────────────────────────────────────────────────────
     Un solo gestore delegato per tutta la sezione: nessun `onclick` nel
     markup. */
  function bind(view) {
    view.addEventListener('click', async function (e) {
      /* I due interruttori di vista: cambiano cosa si mostra, mai cosa si
         calcola. Il conto resta quello che il motore ha già fatto. */
      if (e.target.closest('[data-pb-explain]')) { mostraSpiegazione = !mostraSpiegazione; return render(); }
      if (e.target.closest('[data-pb-audit]')) {
        auditCosto = !auditCosto;
        if (auditCosto) mostraSpiegazione = true;   // l'audit senza il dettaglio non mostrerebbe nulla
        return render();
      }
      const stepBtn = e.target.closest('[data-pb-step]');
      if (stepBtn) { state.step = +stepBtn.getAttribute('data-pb-step'); return render(); }

      const tech = e.target.closest('[data-pb-tech]');
      if (tech) {
        state.tech = tech.getAttribute('data-pb-tech');
        // Cambiando tecnologia la macchina scelta potrebbe non servirla più.
        const m = selectedMachine();
        if (m && m.techId !== state.tech) state.machineId = '';
        return render();
      }

      const machine = e.target.closest('[data-pb-machine]');
      if (machine) { state.machineId = machine.getAttribute('data-pb-machine'); return render(); }

      if (e.target.closest('[data-pb-prev]')) { state.step = Math.max(0, state.step - 1); return render(); }
      if (e.target.closest('[data-pb-next]')) { state.step = Math.min(STEPS.length - 1, state.step + 1); return render(); }

      if (e.target.closest('[data-pb-save]')) {
        const ok = await UI.confirm({
          title: 'Salvare nel catalogo?',
          message: state.name + ' verrà aggiunto al catalogo con costo ' +
            fmt.currency(result.totalCost) + ' e prezzo ' + fmt.currency(result.gross) + '.',
          confirmLabel: 'Salva',
        });
        if (ok && await save()) render();
      }
    });

    view.addEventListener('input', function (e) {
      const f = e.target.getAttribute('data-pb');
      if (f) {
        state[f] = e.target.type === 'number' ? e.target.value : e.target.value;
        if (f === 'markupOverride') return;
        return scheduleRefresh();
      }
      const v = e.target.getAttribute('data-pb-variant');
      if (v) { state.variants[v] = e.target.value; return scheduleRefresh(); }
    });

    view.addEventListener('change', function (e) {
      const f = e.target.getAttribute('data-pb');
      if (f && (e.target.tagName === 'SELECT')) { state[f] = e.target.value; render(); }
    });
  }

  /* Ridisegnare a ogni tasto premuto farebbe perdere il fuoco nel campo: si
     aggiornano solo le parti che dipendono dai valori — riepilogo, costi e
     stato dei pulsanti. Quest'ultimo è il motivo per cui il pulsante "Avanti"
     restava disabilitato dopo aver scritto il nome del prodotto: la sua
     condizione veniva valutata solo al render completo. */
  let refreshTimer = null;

  function syncFooter(view) {
    const next = view.querySelector('[data-pb-next]');
    if (next) next.disabled = state.step === STEPS.length - 1 || !canAdvance();
    const save = view.querySelector('[data-pb-save]');
    if (save) save.disabled = !(result && !result.empty);
  }

  function scheduleRefresh() {
    const view = document.getElementById(VIEW_ID);
    if (view) syncFooter(view); // immediato: un pulsante non deve aspettare
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async function () {
      await recompute();
      const v = document.getElementById(VIEW_ID);
      if (!v) return;
      const aside = v.querySelector('.pb__summary');
      const fresh = summary();
      if (aside && fresh) aside.outerHTML = fresh;
      else if (fresh) v.querySelector('.pb').insertAdjacentHTML('beforeend', fresh);
      const bd = v.querySelector('.pb__breakdown');
      if (bd) bd.outerHTML = costBreakdown();

      // Il conteggio delle combinazioni dipende dai campi appena digitati:
      // va aggiornato anche lui, altrimenti compare solo cambiando passo.
      if (STEPS[state.step].id === 'variants') {
        const old = v.querySelector('.pb__panel-body .ds-alert--info');
        const fresh2 = variantPreview();
        if (old) old.outerHTML = fresh2;
        else if (fresh2) v.querySelector('.pb__panel-body').insertAdjacentHTML('beforeend', fresh2);
      }
      syncFooter(v);
    }, 350);
  }

  /* ── Montaggio ──────────────────────────────────────────────────────────  */
  function ensureView() {
    let view = document.getElementById(VIEW_ID);
    if (view) return view;
    const content = document.getElementById('content-inner') || document.getElementById('content');
    if (!content) return null;
    view = document.createElement('div');
    view.id = VIEW_ID;
    view.className = 'section-view';
    content.appendChild(view);
    bind(view);
    return view;
  }

  let booted = false;
  function boot() {
    if (booted) return true;
    if (!(document.getElementById('content-inner') || document.getElementById('content'))) return false;
    booted = true;
    ensureView();
    if (global.NavBus && global.NavBus.onAny) {
      global.NavBus.onAny(function (section) {
        if (section !== SECTION) return;
        ensureView();
        render();
      });
    }
    global.ProductBuilder = {
      render: function () { ensureView(); return render(); },
      state: state,
      open: function () {
        if (global.App && global.App.navigate) global.App.navigate(SECTION);
        ensureView();
        render();
      },
    };
    return true;
  }

  let attempts = 0;
  (function wait() {
    if (boot()) return;
    if (++attempts > 40) return;
    setTimeout(wait, 250);
  })();
})(window);
