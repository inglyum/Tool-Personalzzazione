/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · TASSONOMIA DI NAVIGAZIONE
   ═══════════════════════════════════════════════════════════════════════════

   Questo file è dati, non codice. Descrive dove sta ciascuna delle 105 sezioni
   dell'applicazione; chi disegna il menu lo legge, non lo interpreta.

   Il v96 aveva 16 gruppi nati per accumulo: tre dedicati all'intelligenza
   artificiale, uno vuoto, due doppioni. Con 105 voci tutte allo stesso livello
   di importanza il prodotto sembrava una collezione di funzioni. Qui i gruppi
   sono otto e rispondono a una domanda operativa: *cosa sto facendo adesso?*

   Regole:
   · Nessuna sezione viene eliminata. Quelle secondarie restano nel loro gruppo
     con `primary: false` e si raggiungono dal gruppo espanso o dalla palette.
   · `aliasOf` marca gli id storici che portano alla stessa vista di un'altra
     sezione: compaiono nella ricerca, non nel menu (erano voci di menu che
     aprivano la schermata di un'altra voce).
   · `excluded` elenca gli id che non sono sezioni: vanno documentati, non
     nascosti.
   · `feature` collega la voce al registro licenze: il gating deriva da qui.
   · `countId` è l'id di un contatore che il codice esistente aggiorna: va
     conservato, altrimenti la voce perde il proprio badge.
   · `addedBy` marca le sezioni che non esistevano nel v96 e che vengono create
     da codice nuovo: il test le riconosce invece di segnalarle come fantasmi.

   Il test `tests/nav-map.test.mjs` verifica che la somma di voci, alias ed
   esclusioni sia esattamente l'elenco della baseline. Aggiungere una sezione
   senza collocarla fa fallire la suite.
   ═══════════════════════════════════════════════════════════════════════════ */

export const NAV_GROUPS = [
  {
    id: 'workspace',
    label: 'Workspace',
    icon: 'home',
    items: [
      { id: 'dashboard', label: 'Dashboard', aka: ['Dashboard ROI'], icon: 'gauge', primary: true, feature: 'core' },
      { id: 'kpi', label: 'KPI Live', icon: 'activity', primary: true, feature: 'core' },
    ],
  },

  {
    id: 'production',
    label: 'Produzione',
    icon: 'zap',
    items: [
      { id: 'lasercalc', label: 'Laser · Calcolatore', aka: ['🧮 Calc Laser'], icon: 'zap', primary: true, feature: 'laser', tech: 'laser' },
      { id: 'laser_b2b', label: 'Laser · Catalogo B2B', aka: ['Laser B2B'], icon: 'layers', feature: 'laser', tech: 'laser' },
      { id: 'laserresources', label: 'Laser · Risorse', aka: ['Risorse Laser'], icon: 'book', feature: 'laser', tech: 'laser' },
      { id: 'print3d', label: '3D Print', aka: ['Smart Quote 3D'], icon: 'box', primary: true, feature: 'print3d', tech: 'print3d' },
      { id: 'apparel', label: 'Tessile · DTF · Sublimazione', aka: ['Smart Quote Apparel'], icon: 'shirt', primary: true, feature: 'dtf', tech: 'dtf' },
      /* «Pianificazione lavori», «Kanban» e «Avanzamento ordini» mostravano
         gli stessi ordini di Ordini, con un altro nome e — nel caso di
         Avanzamento ordini — leggendoli da un archivio diverso. Sono viste,
         non sezioni: vivono in Ordini (📦 Ordini → Kanban / Analytics /
         Lista). Le rotte restano valide e ci portano, così i collegamenti
         esistenti non si rompono. */
      { id: 'projects', label: 'Progetti', icon: 'folder', feature: 'core' },
      { id: 'timetracker', label: 'Tempi di produzione', aka: ['Time Tracker'], icon: 'clock', feature: 'core' },
    ],
  },

  {
    id: 'business',
    label: 'Business',
    icon: 'briefcase',
    items: [
      { id: 'catalog', label: 'Prodotti', aka: ['Catalogo'], icon: 'grid', primary: true, feature: 'core' },
      // Sezione introdotta dalla Fase 2: la vista la crea src/product/product-builder.js.
      { id: 'product_builder', label: 'Product Builder', icon: 'box', primary: true, feature: 'quotes', addedBy: 'phase-2' },
      { id: 'quoter', label: 'Preventivi', aka: ['Smart Quoter'], icon: 'file-text', primary: true, feature: 'quotes' },
      { id: 'gestione_ordini', label: 'Ordini', aka: ['Ordini & Workflow'], icon: 'clipboard', primary: true, feature: 'core' },
      { id: 'clienti', label: 'Clienti', icon: 'users', primary: true, feature: 'core' },
      { id: 'sales', label: 'Vendite & Fatture', icon: 'receipt', primary: true, feature: 'core' },
      { id: 'listino', label: 'Listini B2B', aka: ['Listino B2B'], icon: 'tag', feature: 'core' },
      { id: 'sales_archive', label: 'Archivio vendite', icon: 'archive', feature: 'core' },
      { id: 'b2bpitch', label: 'Pitch B2B', aka: ['B2B Pitch Builder'], icon: 'presentation', feature: 'core' },
      { id: 'calendar', label: 'Calendario', icon: 'calendar', feature: 'core' },
      { id: 'booking', label: 'Prenotazioni', aka: ['Booking'], icon: 'calendar-check', feature: 'core' },
      { id: 'fiera', label: 'Fiere & eventi', aka: ['Fiera Assistant'], icon: 'store', feature: 'core' },
      { id: 'scanner', label: 'Scanner ordini', aka: ['Scanner Spese'], icon: 'scan', feature: 'core' },
      { id: 'template_docs', label: 'Modelli documenti', aka: ['Template Documenti'], icon: 'file', feature: 'core' },
      { id: 'team', label: 'Team', aka: ['Team & HR'], icon: 'user-plus', feature: 'multiuser' },
      { id: 'bu', label: 'Business Unit', icon: 'building', feature: 'multiuser' },
      { id: 'legal', label: 'Documenti legali', aka: ['Legale'], icon: 'scale', feature: 'core' },
    ],
  },

  {
    id: 'lab',
    label: 'Laboratorio',
    icon: 'tool',
    items: [
      { id: 'equipment', label: 'Macchine', aka: ['Attrezzature'], icon: 'cpu', primary: true, feature: 'core' },
      { id: 'items', label: 'Magazzino', icon: 'package', primary: true, feature: 'core' },
      { id: 'paints', label: 'Vernici & spray', aka: ['Vernici & Bombolette'], icon: 'droplet', feature: 'core' },
      { id: 'suppliers', label: 'Fornitori', icon: 'truck', primary: true, feature: 'core' },
      { id: 'stockalert', label: 'Alert scorte', icon: 'alert-triangle', feature: 'core' },
      { id: 'barcode', label: 'Barcode & etichette', aka: ['Barcode Scanner'], icon: 'barcode', feature: 'core' },
      { id: 'lab_setup', label: 'Setup laboratorio', aka: ['Lab & Lista Acquisti'], icon: 'sliders', feature: 'core' },
      { id: 'lab_musthave', label: 'Dotazione consigliata', icon: 'check-square', feature: 'core' },
      { id: 'ideas', label: 'Idee & Ispirazione', aka: ['Idee & prototipi'], icon: 'lightbulb', feature: 'core' },
    ],
  },

  {
    id: 'intelligence',
    label: 'Intelligence',
    icon: 'brain',
    items: [
      { id: 'ai', label: 'AI Assistant', aka: ['AI Decisioni'], icon: 'sparkles', primary: true, feature: 'ai', countId: 'nav-ai-count' },
      { id: 'aicoach', label: 'AI Coach', icon: 'compass', feature: 'ai' },
      { id: 'bizai', label: 'Business AI Hub', icon: 'brain', feature: 'ai' },
      { id: 'intel', label: 'Intelligence Hub', icon: 'radar', primary: true, feature: 'market' },
      { id: 'marketintel', label: 'Market Intelligence', aka: ['Market Intel'], icon: 'globe', primary: true, feature: 'market' },
      { id: 'market_agent', label: 'Market Agent', aka: ['Market AI Agent'], icon: 'search', feature: 'market' },
      { id: 'live_intel', label: 'Live Intel', aka: ['Live Intel Feed'], icon: 'rss', feature: 'market' },
      { id: 'quoteintel', label: 'Quote Intelligence', icon: 'file-search', primary: true, feature: 'quotes' },
      { id: 'product_hunter', label: 'Product Finder', aka: ['Product Hunter AI'], icon: 'crosshair', primary: true, feature: 'market' },
      { id: 'trendscanner', label: 'Trend Scanner', aka: ['Trend Hunter'], icon: 'trending-up', feature: 'market' },
      { id: 'price_radar', label: 'Price Radar', icon: 'radar', feature: 'market' },
      { id: 'dynamicprice', label: 'Prezzi dinamici', icon: 'sliders', feature: 'market' },
      { id: 'competitors', label: 'Concorrenti', aka: ['Competitor Monitor'], icon: 'swords', feature: 'market' },
      { id: 'competitormon', label: 'Monitor concorrenza', icon: 'eye', feature: 'market' },
      { id: 'supplierintel', label: 'Supplier Intelligence', icon: 'truck', feature: 'market' },
      { id: 'demand_map', label: 'Mappa della domanda', aka: ['Demand Map'], icon: 'map', feature: 'market' },
      { id: 'opportunity', label: 'Opportunity Scanner', icon: 'target', feature: 'market' },
      { id: 'decision', label: 'Decision Engine', icon: 'git-merge', feature: 'ai' },
      { id: 'strategy', label: 'Strategia', icon: 'flag', feature: 'ai' },
      { id: 'clientintel', label: 'Client Intelligence', icon: 'user-search', feature: 'ai' },
      { id: 'leadscorer', label: 'Lead Scorer', icon: 'star', feature: 'ai' },
      { id: 'clv', label: 'Valore cliente (CLV)', aka: ['CLV Clienti'], icon: 'gem', feature: 'ai' },
      { id: 'growthengine', label: 'Growth Engine', icon: 'rocket', feature: 'ai' },
      { id: 'forecaster', label: 'Financial Forecaster', icon: 'line-chart', feature: 'analytics' },
      { id: 'forecasting', label: 'Forecasting', aka: ['AI Previsioni'], icon: 'trending-up', feature: 'analytics' },
      { id: 'smartnotif', label: 'Notifiche intelligenti', aka: ['Notifiche Smart'], icon: 'bell', feature: 'ai' },
      { id: 'replyai', label: 'Reply AI', aka: ['Reply Assistant'], icon: 'message-square', feature: 'ai' },
    ],
  },

  {
    id: 'marketing',
    label: 'Marketing & Brand',
    icon: 'megaphone',
    items: [
      { id: 'marketing', label: 'Marketing', aka: ['Marketing Pro'], icon: 'megaphone', primary: true, feature: 'core' },
      { id: 'socialstudio', label: 'Social Studio', icon: 'share', primary: true, feature: 'core' },
      { id: 'contentperf', label: 'Rendimento contenuti', aka: ['Content Performance'], icon: 'bar-chart', feature: 'analytics' },
      { id: 'socialproof', label: 'Social Proof', aka: ['Social Proof AI'], icon: 'quote', feature: 'core' },
      { id: 'photostudio', label: 'Photo Studio', aka: ['Photo Studio AI'], icon: 'camera', feature: 'ai' },
      { id: 'imagelib', label: 'Libreria immagini', icon: 'image', feature: 'core' },
      { id: 'inglydesign', label: 'INGLY Design', icon: 'palette', feature: 'core' },
      { id: 'brand_identity', label: 'Brand Identity', icon: 'badge', feature: 'core' },
      { id: 'etsyai', label: 'Etsy · Analytics', aka: ['Etsy AI Suite'], icon: 'chart-column', feature: 'market' },
      { id: 'etsy_pulse', label: 'Etsy · Pulse', aka: ['Etsy Pulse Live'], icon: 'activity', feature: 'market' },
      { id: 'etsy_seo_wizard', label: 'Etsy · SEO', aka: ['Etsy SEO Wizard'], icon: 'search', feature: 'market' },
    ],
  },

  {
    id: 'finance',
    label: 'Finance',
    icon: 'euro',
    items: [
      { id: 'finance', label: 'Finance', aka: ['Finance Pro'], icon: 'euro', primary: true, feature: 'core' },
      { id: 'cashflow', label: 'Cashflow', icon: 'waves', primary: true, feature: 'core' },
      { id: 'analytics', label: 'Analytics', icon: 'bar-chart', primary: true, feature: 'analytics' },
      { id: 'goals', label: 'Obiettivi', icon: 'target', primary: true, feature: 'core' },
      { id: 'fixed_costs', label: 'Costi fissi', icon: 'anchor', feature: 'core' },
      { id: 'prima_nota', label: 'Prima nota', icon: 'book-open', feature: 'core' },
      { id: 'bank_funds', label: 'Bank & Funds', aka: ['Banca & fondi'], icon: 'landmark', feature: 'core' },
      { id: 'payment_schedule', label: 'Piano pagamenti', icon: 'calendar-clock', feature: 'core' },
      { id: 'recurring', label: 'Fatture ricorrenti', icon: 'repeat', feature: 'core' },
      { id: 'fiscal', label: 'Fiscale', aka: ['Radar Fiscale'], icon: 'file-check', feature: 'core' },
      { id: 'taxcalendar', label: 'Scadenzario fiscale', aka: ['Calendario Fiscale'], icon: 'calendar-days', feature: 'core' },
      { id: 'xmlsdi', label: 'Fatturazione elettronica', aka: ['Fattura XML SDI'], icon: 'send', feature: 'core' },
      { id: 'profitscope', label: 'Profit Scope', aka: ['ProfitScope'], icon: 'pie-chart', feature: 'analytics' },
      { id: 'revsim', label: 'Simulatore ricavi', aka: ['Revenue Simulator'], icon: 'sliders', feature: 'analytics' },
      { id: 'reports', label: 'Report', aka: ['Report PDF'], icon: 'file-bar-chart', primary: true, feature: 'core' },
      { id: 'weeklyreport', label: 'Report settimanale', icon: 'calendar-range', feature: 'core' },
      { id: 'pdfmonth', label: 'Report PDF mensile', icon: 'file-down', feature: 'core' },
    ],
  },

  {
    id: 'system',
    label: 'Sistema',
    icon: 'settings',
    items: [
      { id: 'settings', label: 'Impostazioni', icon: 'settings', primary: true, feature: 'core' },
      { id: 'backup', label: 'Backup & ripristino', aka: ['Backup Locale'], icon: 'save', primary: true, feature: 'core' },
      { id: 'portabile', label: 'Esporta portatile', icon: 'hard-drive', feature: 'core' },
      { id: 'history', label: 'Storico operazioni', aka: ['Storico'], icon: 'history', feature: 'core' },
      { id: 'cloud_updater', label: 'Aggiornamenti', icon: 'cloud-download', feature: 'core' },
    ],
  },
];

/* Id storici che aprivano la vista di un'altra sezione. Restano validi come
   destinazione (i link esistenti continuano a funzionare) ma non compaiono due
   volte nel menu. Verificato a runtime in tests/qa/navigation.mjs. */
export const NAV_ALIASES = {
  clients: 'clienti',
  crm: 'clienti',
  /* Lo store pipeline era un mirror di orders: la destinazione è Gestione
     Ordini, non il CRM. Allineato al _redirectMap del router. */
  crm_pipeline: 'gestione_ordini',
  /* Tre sezioni che mostravano gli stessi ordini di Ordini con un altro nome:
     `order_tracker` per giunta leggendoli da un archivio diverso. Sono
     diventate viste (Kanban, Analytics, Lista) e restano alias, così i
     collegamenti e le scorciatoie esistenti continuano ad aprire qualcosa. */
  workflow_dashboard: 'gestione_ordini',
  kanban: 'gestione_ordini',
  order_tracker: 'gestione_ordini',
  magazzino: 'items',
  market_intel: 'marketintel',
};

/* Id presenti fra le sezioni ma che sezioni non sono. Documentati, non
   nascosti: erano voci di menu che portavano a una schermata vuota. */
export const NAV_EXCLUDED = {
  briefing:
    'Widget della dashboard (Morning Briefing), non una vista. Nel v96 aveva una voce di menu che non apriva nulla.',
  monthly_report:
    'Consolidato dentro il hub Report dalla patch v88, che lo rimuove esplicitamente dalle sezioni. La voce di menu era rimasta.',
  stockplanner:
    'Nessuna vista e nessun modulo: compare solo negli elenchi dei piani. Va tolto anche dal registro licenze.',
};

export const TECH_LABELS = {
  laser: 'Laser',
  print3d: '3D Print',
  uv: 'UV Print',
  dtf: 'DTF',
  sublimation: 'Sublimazione',
};

/** Tutte le voci, in ordine di menu. */
export function allItems() {
  return NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.id, groupLabel: g.label })));
}

/** Risolve un id storico nella sezione che apre davvero. */
export function resolveSection(id) {
  return NAV_ALIASES[id] ?? id;
}

/** Le voci in evidenza di un gruppo: il menu mostra queste, il resto si espande. */
export function primaryItems(groupId) {
  const group = NAV_GROUPS.find((g) => g.id === groupId);
  return group ? group.items.filter((i) => i.primary) : [];
}
