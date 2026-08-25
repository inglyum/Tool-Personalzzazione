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
          }).join('') + '</select>');
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
    // Il prezzo B2B è il netto del motore con lo sconto quantità che il
    // laboratorio applica di norma: nessuna scala inventata, solo la soglia
    // dichiarata dall'utente nel campo "pezzi per lotto".
    const b2b = result.net * (qty >= 50 ? 0.8 : qty >= 20 ? 0.88 : 0.95);

    return '<div class="pb__prices">' +
      priceTile('Costo', result.totalCost, 'per pezzo') +
      priceTile('Prezzo B2C', result.gross, 'IVA inclusa') +
      priceTile('Prezzo B2B', b2b, 'netto, da ' + qty + ' pz') +
      priceTile('Margine', result.margin, 'sul netto', 'percent') +
      '</div>' +
      field('Ricarico applicato (%)',
        '<input class="form-control" type="number" min="0" step="1" data-pb="markupOverride" ' +
        'value="' + (state.markupOverride === null ? sources.settings.markup : state.markupOverride) + '">',
        'Predefinito da Impostazioni: ' + sources.settings.markup + '%') +
      '<p class="pb__note">Prezzi calcolati da <strong>PricingEngine</strong>, lo stesso motore del Catalogo, ' +
      'con IVA al ' + sources.settings.vat + '%.</p>';
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
    const materialCost = (mat ? mat.cost : 0) * Number(state.materialQty || 0) +
      Number(state.packaging || 0) + Number(state.extra || 0);
    const machineMin = Number(state.machineMin || 0);
    const laborMin = Number(state.laborMin || 0);

    if (materialCost <= 0 && machineMin <= 0 && laborMin <= 0) {
      result = null;
      return;
    }
    result = await Data.price({ materialCost, machineMin, laborMin, category: state.category });
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
  }

  /* ── Interazione ────────────────────────────────────────────────────────
     Un solo gestore delegato per tutta la sezione: nessun `onclick` nel
     markup. */
  function bind(view) {
    view.addEventListener('click', async function (e) {
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
