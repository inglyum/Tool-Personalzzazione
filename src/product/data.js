/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · ADATTATORE DATI (sola lettura)
   ═══════════════════════════════════════════════════════════════════════════

   L'unico punto da cui la Dashboard, i Work Center e il Product Builder
   leggono. Non crea uno store nuovo, non scrive niente, non calcola costi:
   interroga gli store esistenti (`AppStore` / `IDB`) e i motori già presenti
   (`KPIEngine`, `MachineHub`, `PricingEngine`).

   Ogni funzione restituisce dati veri oppure `{ empty: true, reason }`. È il
   meccanismo che rende impossibile inventare numeri: se il laboratorio non ha
   ancora ordini, la Dashboard non ha nulla da cui inventarli e mostra uno stato
   vuoto che dice cosa manca.

   Store letti — nessuno creato:
     orders · sales · quotes · items · catalog · clients · equipment · suppliers
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ── Accesso agli store ─────────────────────────────────────────────────
     `AppStore` ha cache e TTL; `IDB` è la via diretta. Si preferisce il primo
     e si ricade sul secondo, come fa già il resto dell'applicazione. */
  async function readStore(name) {
    try {
      if (global.AppStore && typeof global.AppStore.get === 'function') {
        return (await global.AppStore.get(name)) || [];
      }
    } catch (e) { /* si prova la via diretta */ }
    try {
      if (global.IDB && typeof global.IDB.getAll === 'function') {
        return (await global.IDB.getAll(name)) || [];
      }
    } catch (e) { /* store assente: nessun dato, non zero inventato */ }
    return [];
  }

  async function readSettings() {
    try {
      return (global.IDB && (await global.IDB.get('settings', 'main'))) || {};
    } catch (e) {
      return {};
    }
  }

  const num = (v, d) => {
    const n = parseFloat(v);
    return isFinite(n) ? n : (d === undefined ? 0 : d);
  };

  const todayISO = () => new Date().toISOString().slice(0, 10);

  /* ── Tecnologie ─────────────────────────────────────────────────────────
     Nei dati reali la tecnologia è scritta in molti modi: 'laser', 'CO₂',
     'Diodo', 'Fibra/MOPA', 'Sublimazione', 'Sub', 'DTF', 'Stampa UV',
     'uvdtf'… Sono anni di inserimenti a mano. Qui vengono ricondotte ai cinque
     centri di lavoro, senza modificare i record: la normalizzazione è di
     lettura, i dati dell'utente restano suoi.                              */
  const TECH_PATTERNS = [
    { id: 'laser', re: /laser|co2|co₂|diodo|diode|fibra|mopa|fiber|incisione|taglio/i },
    { id: 'print3d', re: /3d|fdm|resin|resina|filament|stampa 3d/i },
    { id: 'uv', re: /uv(?!\s*dtf)|stampa uv/i },
    { id: 'dtf', re: /dtf|uvdtf|uv dtf|film/i },
    { id: 'sublimation', re: /subli|sublimazione|sub\b|pressa|transfer/i },
  ];

  function normalizeTech(raw) {
    if (!raw) return null;
    const s = String(raw);
    // L'ordine conta: 'uvdtf' è DTF, non UV. Si prova prima il più specifico.
    if (/uv\s*dtf|uvdtf/i.test(s)) return 'dtf';
    for (const p of TECH_PATTERNS) if (p.re.test(s)) return p.id;
    return null;
  }

  const TECHNOLOGIES = [
    { id: 'laser', label: 'Laser', icon: 'fa-bolt', detail: 'CO₂ · Diodo · MOPA · Fibra' },
    { id: 'print3d', label: '3D Print', icon: 'fa-cube', detail: 'FDM · Resina' },
    { id: 'uv', label: 'UV Print', icon: 'fa-droplet', detail: 'Stampa UV diretta' },
    { id: 'dtf', label: 'DTF', icon: 'fa-shirt', detail: 'Film · UV DTF' },
    { id: 'sublimation', label: 'Sublimazione', icon: 'fa-fire', detail: 'Presse · transfer · blank' },
  ];

  /* ── Stato degli ordini ─────────────────────────────────────────────────
     Gli stati convivono in italiano e inglese perché le patch li hanno
     aggiunti in momenti diversi. Sono gli stessi insiemi che usa la pipeline. */
  const DONE = new Set([
    'paid', 'delivered', 'sold', 'invoiced', 'completed', 'rejected', 'lost',
    'cancelled', 'archived', 'done', 'closed', 'pagato', 'consegnato', 'annullato',
  ]);

  const stageOf = (o) => String(o.stage || o.status || '').toLowerCase();
  const isActive = (o) => !o._archived && !DONE.has(stageOf(o));
  const isOverdue = (o) => isActive(o) && o.dueDate && o.dueDate < todayISO();

  function dueInDays(o) {
    if (!o.dueDate) return null;
    const d = Math.round((new Date(o.dueDate) - new Date(todayISO())) / 86400000);
    return isFinite(d) ? d : null;
  }

  /* ══ KPI ═══════════════════════════════════════════════════════════════
     Non ricalcola niente: chiama il motore che l'applicazione usa già, e ne
     traduce i campi in schede leggibili. `revenueTrend` è confronto reale con
     il mese precedente, non una percentuale decorativa.                    */
  async function kpis() {
    let k = null;
    try {
      if (global.KPIEngine && global.KPIEngine.run) k = await global.KPIEngine.run();
    } catch (e) { /* il motore non è pronto */ }
    if (!k) return { empty: true, reason: 'Il motore KPI non è ancora disponibile.' };

    const orders = await readStore('orders');
    const inProduction = orders.filter(isActive).length;

    return {
      empty: false,
      cards: [
        {
          id: 'revenue',
          label: 'Fatturato',
          value: k.revenue,
          format: 'currency',
          period: 'mese corrente',
          trend: k.lastMonthRevenue > 0 ? k.revenueTrend : null,
          compare: k.lastMonthRevenue > 0
            ? { label: 'mese scorso', value: k.lastMonthRevenue, format: 'currency' }
            : null,
        },
        {
          id: 'orders',
          label: 'Ordini attivi',
          value: k.activeOrders,
          format: 'number',
          period: 'adesso',
          trend: null,
          compare: k.overdueOrders > 0
            ? { label: 'in ritardo', value: k.overdueOrders, format: 'number', tone: 'danger' }
            : null,
        },
        {
          id: 'margin',
          /* Senza costi registrati nel mese, `profitMargin` vale 100%: è un
             artefatto dei dati mancanti, non un margine. Meglio dire che il
             dato non c'è e indicare cosa serve per averlo. */
          label: 'Margine',
          value: k.revenue > 0 && k.expenses > 0 ? k.profitMargin : null,
          format: 'percent',
          period: k.revenue > 0 && k.expenses === 0 ? 'nessun costo registrato' : 'mese corrente',
          trend: null,
          compare: k.revenue > 0
            ? { label: 'ticket medio', value: k.avgOrder, format: 'currency' }
            : null,
        },
        {
          id: 'production',
          label: 'In produzione',
          value: inProduction,
          format: 'number',
          period: 'lavori aperti',
          trend: null,
          compare: k.unpaid > 0
            ? { label: 'da incassare', value: k.unpaid, format: 'currency', tone: 'warning' }
            : null,
        },
      ],
      raw: k,
    };
  }

  /* ══ Work Center ═══════════════════════════════════════════════════════
     Un centro di lavoro esiste se il laboratorio ha almeno una macchina di
     quella tecnologia **oppure** almeno un lavoro che la richiede. Non si
     mostrano cinque riquadri vuoti a chi possiede solo un laser.           */
  async function workCenters() {
    const [orders, equipment] = await Promise.all([readStore('orders'), readStore('equipment')]);

    const machinesByTech = {};
    for (const e of equipment) {
      const t = normalizeTech(e.tech) || normalizeTech(e.name) || normalizeTech(e.materials);
      if (!t) continue;
      (machinesByTech[t] = machinesByTech[t] || []).push({
        id: e.id,
        name: (e.name || ((e.brand || '') + ' ' + (e.model || ''))).trim() || 'Macchina',
        tech: e.tech || '',
        // Lo stesso stato normalizzato che usa la sezione Macchine: la stessa
        // macchina non può risultare "pronta" in un riquadro e "sconosciuta"
        // nell'altro.
        state: machineState(e.status),
        workArea: e.workArea || '',
        powerW: num(e.powerW, 0),
      });
    }

    const active = orders.filter(isActive);
    const jobsByTech = {};
    for (const o of active) {
      const t = normalizeTech(o.tech) || normalizeTech(o.machine) || normalizeTech(o.title);
      if (!t) continue;
      (jobsByTech[t] = jobsByTech[t] || []).push(o);
    }

    const centers = TECHNOLOGIES
      .filter((tech) => machinesByTech[tech.id] || jobsByTech[tech.id])
      .map((tech) => {
        const machines = machinesByTech[tech.id] || [];
        const queue = (jobsByTech[tech.id] || []).slice().sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate < b.dueDate ? -1 : 1;
        });
        const late = queue.filter(isOverdue).length;
        const running = machines.filter((m) => m.state === 'running').length;

        return {
          ...tech,
          machines,
          machineCount: machines.length,
          queue: queue.map((o) => ({
            id: o.id,
            title: o.title || o.product || 'Lavoro',
            client: o.clientName || o.client || '',
            due: o.dueDate || null,
            dueInDays: dueInDays(o),
            overdue: isOverdue(o),
            qty: num(o.qty, 0) || null,
            material: o.material || '',
            total: num(o.total ?? o.amount, 0) || null,
            stage: stageOf(o),
          })),
          queueLength: queue.length,
          late,
          // Lo stato del centro deriva dai suoi lavori e dalle sue macchine:
          // non esiste un campo "stato del work center" da inventare.
          status: !machines.length ? 'no-machine'
            : late > 0 ? 'warning'
            : queue.length > 0 ? 'running'
            : 'ready',
          nextJob: queue[0] || null,
        };
      });

    if (!centers.length) {
      return {
        empty: true,
        reason: 'Nessuna macchina configurata e nessun lavoro assegnato a una tecnologia.',
        action: { label: 'Configura le macchine', section: 'equipment' },
      };
    }

    const unassigned = active.length - Object.values(jobsByTech).reduce((a, l) => a + l.length, 0);
    return { empty: false, centers, unassigned };
  }

  /* ══ Ordini che richiedono attenzione ══════════════════════════════════ */
  async function attention() {
    const [orders, sales, quotes] = await Promise.all([
      readStore('orders'), readStore('sales'), readStore('quotes'),
    ]);

    const activeOrders = orders.filter(isActive);
    const overdue = activeOrders.filter(isOverdue);
    const urgent = activeOrders.filter((o) => {
      const d = dueInDays(o);
      return d !== null && d >= 0 && d <= 2;
    });
    const pendingQuotes = quotes.filter((q) => {
      const s = String(q.status || '').toLowerCase();
      return s === 'inviato' || s === 'sent' || s === 'in attesa' || s === 'pending';
    });
    const unpaid = sales.filter((s) => s.status === 'da_pagare');

    const groups = [
      {
        id: 'overdue', label: 'Ordini in ritardo', tone: 'danger', section: 'gestione_ordini',
        count: overdue.length,
        items: overdue.slice(0, 5).map((o) => ({
          title: o.title || o.product || 'Ordine',
          meta: (o.clientName || o.client || '') + (o.dueDate ? ' · scaduto il ' + o.dueDate : ''),
        })),
      },
      {
        id: 'urgent', label: 'In scadenza entro 48 h', tone: 'warning', section: 'gestione_ordini',
        count: urgent.length,
        items: urgent.slice(0, 5).map((o) => ({
          title: o.title || o.product || 'Ordine',
          meta: (o.clientName || o.client || '') + ' · ' + (dueInDays(o) === 0 ? 'oggi' : 'fra ' + dueInDays(o) + ' g'),
        })),
      },
      {
        id: 'quotes', label: 'Preventivi da seguire', tone: 'info', section: 'quoter',
        count: pendingQuotes.length,
        items: pendingQuotes.slice(0, 5).map((q) => ({
          title: q.title || q.number || 'Preventivo',
          meta: (q.clientName || q.client || '') + (q.total ? ' · ' + q.total : ''),
        })),
      },
      {
        id: 'payments', label: 'Pagamenti pendenti', tone: 'warning', section: 'sales',
        count: unpaid.length,
        value: unpaid.reduce((a, s) => a + num(s.amount), 0),
        items: unpaid.slice(0, 5).map((s) => ({
          title: s.description || s.product || 'Vendita',
          meta: (s.clientName || '') + ' · ' + (s.date || ''),
        })),
      },
    ].filter((g) => g.count > 0);

    if (!groups.length) {
      return { empty: true, reason: 'Nessun ordine in ritardo, nessun pagamento pendente.', tone: 'ok' };
    }
    return { empty: false, groups };
  }

  /* ══ Magazzino ═════════════════════════════════════════════════════════ */
  async function inventory() {
    const items = await readStore('items');
    if (!items.length) {
      return {
        empty: true,
        reason: 'Il magazzino è vuoto.',
        action: { label: 'Apri il magazzino', section: 'items' },
      };
    }

    const withStock = items.map((i) => ({
      name: i.name || 'Articolo',
      category: i.category || '',
      unit: i.unit || '',
      supplier: i.supplier || '',
      stock: num(i.quantity ?? i.stock, 0),
      min: num(i.minStock, 0),
      cost: num(i.costPrice ?? i.cost, 0),
    }));

    const out = withStock.filter((i) => i.stock <= 0);
    // Sotto scorta solo dove una soglia è stata impostata: senza soglia non
    // esiste un "sotto scorta" da dedurre.
    const low = withStock.filter((i) => i.stock > 0 && i.min > 0 && i.stock <= i.min);

    return {
      empty: false,
      total: items.length,
      value: withStock.reduce((a, i) => a + i.stock * i.cost, 0),
      out: out.slice(0, 6),
      outCount: out.length,
      low: low.slice(0, 6),
      lowCount: low.length,
      ok: out.length === 0 && low.length === 0,
    };
  }

  /* Gli stati del parco macchine sono testo libero. Si riconducono a quattro
     categorie leggibili; quello che non si riconosce resta "sconosciuto"
     invece di essere contato come funzionante. */
  function machineState(raw) {
    const v = String(raw || '').toLowerCase();
    if (/manutenz|maintenance|riparaz/.test(v)) return 'maintenance';
    if (/offline|guasto|fermo|dismess|broken/.test(v)) return 'offline';
    if (/lavoro|running|occupa|busy/.test(v)) return 'running';
    if (/attiva|active|ready|pronta|ok/.test(v)) return 'ready';
    return 'unknown';
  }

  /* ══ Macchine ══════════════════════════════════════════════════════════ */
  async function machines() {
    const equipment = await readStore('equipment');
    if (!equipment.length) {
      return {
        empty: true,
        reason: 'Nessuna macchina registrata.',
        action: { label: 'Aggiungi una macchina', section: 'equipment' },
      };
    }

    const list = equipment.map((e) => ({
      id: e.id,
      name: (e.name || ((e.brand || '') + ' ' + (e.model || ''))).trim() || 'Macchina',
      tech: e.tech || '',
      techId: normalizeTech(e.tech),
      state: machineState(e.status),
      raw: String(e.status || ''),
    }));

    const counts = { ready: 0, running: 0, maintenance: 0, offline: 0, unknown: 0 };
    for (const m of list) counts[m.state] += 1;

    return { empty: false, list, counts, total: list.length };
  }

  /* ══ Redditività ═══════════════════════════════════════════════════════
     Legge i margini che il catalogo già contiene (costPrice/salePrice sono i
     campi che il modulo Catalogo salva). Non ricalcola i prezzi e non applica
     una propria formula. */
  async function profitability() {
    const [catalog, settings] = await Promise.all([readStore('catalog'), readSettings()]);
    const target = num(settings.markup, 40);

    const priced = catalog
      .filter((p) => num(p.salePrice) > 0 && num(p.costPrice) > 0)
      .map((p) => ({
        name: p.name || 'Prodotto',
        category: p.category || '—',
        cost: num(p.costPrice),
        price: num(p.salePrice),
        margin: (num(p.salePrice) - num(p.costPrice)) / num(p.salePrice) * 100,
      }));

    if (!priced.length) {
      return {
        empty: true,
        reason: catalog.length
          ? 'Nessun prodotto del catalogo ha sia costo sia prezzo di vendita.'
          : 'Il catalogo è vuoto.',
        action: { label: 'Apri il catalogo', section: 'catalog' },
      };
    }

    const sorted = priced.slice().sort((a, b) => b.margin - a.margin);
    const byCategory = {};
    for (const p of priced) {
      const c = byCategory[p.category] || (byCategory[p.category] = { sum: 0, n: 0 });
      c.sum += p.margin;
      c.n += 1;
    }
    const categories = Object.entries(byCategory)
      .map(([name, c]) => ({ name, margin: c.sum / c.n, products: c.n }))
      .sort((a, b) => b.margin - a.margin);

    return {
      empty: false,
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      bestCategory: categories[0],
      belowTarget: priced.filter((p) => p.margin < target),
      target,
      counted: priced.length,
      total: catalog.length,
    };
  }

  /* ══ INGLY Intelligence ════════════════════════════════════════════════
     Ogni voce nasce da un conteggio su dati reali e porta con sé il numero da
     cui deriva. Se non c'è abbastanza materiale, si dice.                  */
  async function insights() {
    const [inv, prof, att, wc] = await Promise.all([
      inventory(), profitability(), attention(), workCenters(),
    ]);
    const out = [];

    if (!prof.empty && prof.belowTarget.length) {
      out.push({
        tone: 'warning',
        text: prof.belowTarget.length === 1
          ? '1 prodotto ha un margine sotto il target del ' + Math.round(prof.target) + '%'
          : prof.belowTarget.length + ' prodotti hanno un margine sotto il target del ' + Math.round(prof.target) + '%',
        detail: prof.belowTarget.slice(0, 3).map((p) => p.name + ' (' + p.margin.toFixed(0) + '%)').join(' · '),
        section: 'catalog',
      });
    }
    if (!inv.empty && inv.outCount) {
      out.push({
        tone: 'danger',
        text: inv.outCount === 1 ? '1 materiale è esaurito' : inv.outCount + ' materiali sono esauriti',
        detail: inv.out.slice(0, 3).map((i) => i.name).join(' · '),
        section: 'items',
      });
    }
    if (!inv.empty && inv.lowCount) {
      out.push({
        tone: 'warning',
        text: inv.lowCount === 1 ? '1 materiale sta per esaurirsi' : inv.lowCount + ' materiali stanno per esaurirsi',
        detail: inv.low.slice(0, 3).map((i) => i.name + ' (' + i.stock + ' ' + i.unit + ')').join(' · '),
        section: 'items',
      });
    }
    if (!att.empty) {
      const late = att.groups.find((g) => g.id === 'overdue');
      if (late) {
        out.push({
          tone: 'danger',
          text: late.count === 1 ? 'Un ordine è in ritardo' : late.count + ' ordini sono in ritardo',
          detail: late.items.slice(0, 3).map((i) => i.title).join(' · '),
          section: 'gestione_ordini',
        });
      }
    }
    if (!wc.empty && wc.unassigned > 0) {
      out.push({
        tone: 'info',
        text: wc.unassigned === 1
          ? "1 lavoro attivo non è assegnato a una tecnologia"
          : wc.unassigned + ' lavori attivi non sono assegnati a una tecnologia',
        detail: 'Senza tecnologia non compaiono in nessun centro di lavoro.',
        section: 'gestione_ordini',
      });
    }

    if (!out.length) {
      const noData = inv.empty && prof.empty && att.empty;
      return {
        empty: true,
        reason: noData
          ? 'Dati insufficienti: servono prodotti, materiali o ordini per generare indicazioni.'
          : 'Nessuna criticità rilevata sui dati attuali.',
        tone: noData ? 'neutral' : 'ok',
      };
    }
    return { empty: false, items: out };
  }

  /* ══ Product Builder — sorgenti ════════════════════════════════════════
     Macchine e materiali arrivano dai registri esistenti. Nessun catalogo
     parallelo. */
  async function builderSources() {
    const [equipment, items, catalog, settings] = await Promise.all([
      readStore('equipment'), readStore('items'), readStore('catalog'), readSettings(),
    ]);

    let hub = {};
    try {
      if (global.MachineHub && global.MachineHub.list) hub = (await global.MachineHub.list()) || {};
    } catch (e) { /* il quoter non è caricato: si usano i soli record equipment */ }

    const machines = equipment.map((e) => {
      const key = 'eq_' + e.id;
      const h = hub[key] || {};
      return {
        id: e.id,
        name: (e.name || ((e.brand || '') + ' ' + (e.model || ''))).trim() || 'Macchina',
        tech: e.tech || '',
        techId: normalizeTech(e.tech),
        workArea: e.workArea || '',
        // Costo orario e consumo vengono da MachineHub, che è la sorgente
        // documentata per i parametri macchina: qui non si ricalcolano.
        hourly: num(h.hourly, 0),
        energyH: num(h.energyH, 0),
        materials: e.materials || '',
      };
    });

    const materials = items.map((i) => ({
      id: i.id,
      name: i.name || 'Materiale',
      category: i.category || '',
      unit: i.unit || 'pz',
      cost: num(i.costPrice ?? i.cost, 0),
      stock: num(i.quantity ?? i.stock, 0),
      supplier: i.supplier || '',
    })).filter((m) => m.name);

    const categories = [...new Set(catalog.map((p) => p.category).filter(Boolean))].sort();

    return {
      machines,
      materials,
      categories,
      settings: {
        machineCostPerMin: num(settings.machineCost, 0.35),
        laborCostPerMin: num(settings.laborCost, 0.5),
        markup: num(settings.markup, 40),
        vat: num(settings.vat, 22),
      },
      hasMachines: machines.length > 0,
      hasMaterials: materials.length > 0,
    };
  }

  /* Il preventivo del Product Builder passa dal motore esistente: qui non c'è
     aritmetica di costo, solo la chiamata e i suoi ingressi. */
  async function price({ materialCost, machineMin, laborMin, category }) {
    if (!global.PricingEngine || !global.PricingEngine.suggest) {
      return { empty: true, reason: 'Il motore di pricing non è disponibile.' };
    }
    const r = await global.PricingEngine.suggest({
      materialCost: num(materialCost),
      machineMin: num(machineMin),
      laborMin: num(laborMin),
      category: category || '',
    });
    return { empty: false, ...r };
  }

  /* ══ Ricerca globale ═══════════════════════════════════════════════════
     Interroga gli store esistenti a ogni ricerca. Nessun indice da mantenere
     allineato, nessun secondo database. */
  const SEARCH_SOURCES = [
    { store: 'catalog', label: 'Prodotto', section: 'catalog', icon: 'fa-th-large', fields: ['name', 'sku', 'category'] },
    { store: 'orders', label: 'Ordine', section: 'gestione_ordini', icon: 'fa-clipboard-list', fields: ['title', 'clientName', 'client', 'product'] },
    { store: 'clients', label: 'Cliente', section: 'clienti', icon: 'fa-users', fields: ['name', 'company', 'email', 'phone'] },
    { store: 'equipment', label: 'Macchina', section: 'equipment', icon: 'fa-microchip', fields: ['name', 'brand', 'model', 'tech'] },
    { store: 'items', label: 'Materiale', section: 'items', icon: 'fa-boxes-stacked', fields: ['name', 'sku', 'category', 'supplier'] },
    { store: 'suppliers', label: 'Fornitore', section: 'suppliers', icon: 'fa-truck', fields: ['name', 'company', 'email'] },
  ];

  async function search(query, limitPerSource) {
    const q = String(query || '').trim().toLowerCase();
    if (q.length < 2) return [];
    const cap = limitPerSource || 5;

    const groups = await Promise.all(SEARCH_SOURCES.map(async (src) => {
      const rows = await readStore(src.store);
      const hits = [];
      for (const r of rows) {
        const hay = src.fields.map((f) => r[f]).filter(Boolean).join(' ').toLowerCase();
        if (!hay || hay.indexOf(q) === -1) continue;
        hits.push({
          kind: src.label,
          icon: src.icon,
          section: src.section,
          title: String(r[src.fields[0]] || r.name || r.title || '—'),
          meta: src.fields.slice(1).map((f) => r[f]).filter(Boolean).join(' · '),
        });
        if (hits.length >= cap) break;
      }
      return hits;
    }));

    return groups.flat();
  }

  /* ══ Intestazione ══════════════════════════════════════════════════════ */
  async function workspace() {
    const settings = await readSettings();
    const hour = new Date().getHours();
    return {
      greeting: hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera',
      name: settings.ownerName || settings.userName || '',
      lab: settings.companyName || settings.labName ||
        (global.localStorage && localStorage.getItem('ingly_company_name')) || 'Il tuo laboratorio',
      date: new Date().toLocaleDateString('it-IT', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }),
    };
  }

  global.InglyData = {
    TECHNOLOGIES,
    normalizeTech,
    isActive,
    isOverdue,
    kpis,
    workCenters,
    attention,
    inventory,
    machines,
    profitability,
    insights,
    builderSources,
    price,
    search,
    workspace,
    _readStore: readStore,
  };
})(window);
