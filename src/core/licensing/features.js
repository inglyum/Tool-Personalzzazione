/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · REGISTRO LICENZE
   ═══════════════════════════════════════════════════════════════════════════

   Un solo elenco condiviso fra l'applicazione e INGLY Cloud Admin.

   Prima esistevano due sorgenti divergenti: `PLAN_MODULES` nell'OS e
   `PLANS_CFG` nell'Admin, entrambe elenchi di id di sezione scritti a mano.
   Assegnavano moduli diversi allo stesso piano, e ogni sezione nuova andava
   aggiunta in due posti — quando non veniva dimenticata. `stockplanner`, per
   esempio, compare nei piani ma non è mai esistito come sezione.

   Qui i piani abilitano *feature*, non sezioni. Ogni voce del menu dichiara la
   feature che le serve (vedi `src/app-shell/nav-map.js`), e i moduli abilitati
   si calcolano. Aggiungere una sezione non richiede di toccare i piani.

   ─── Nota sulla natura di questo controllo ───────────────────────────────
   Il gating è lato client: serve a non mettere davanti all'utente funzioni che
   non ha acquistato, non a impedirne l'uso a chi modifica il file. Una vera
   protezione richiede validazione server-side. Vedi docs/SECURITY.md.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Le capacità vendibili. L'ordine è quello con cui compaiono nel confronto piani. */
export const FEATURES = {
  core: { label: 'Gestionale', description: 'Prodotti, preventivi, ordini, clienti, vendite, magazzino, finance.' },
  quotes: { label: 'Preventivi avanzati', description: 'Motore preventivi, listini B2B, modelli e intelligenza sui preventivi.' },
  laser: { label: 'Laser', description: 'CO₂, diodo, MOPA, fibra: calcolo tempi, costi e catalogo B2B.' },
  print3d: { label: '3D Print', description: 'FDM e resina: materiali, filamenti, tempi e costi di stampa.' },
  dtf: { label: 'DTF · Sublimazione · UV', description: 'Stampa digitale su tessile e gadget, transfer e blank.' },
  analytics: { label: 'Analytics avanzati', description: 'Forecasting, profittabilità, simulazioni e report estesi.' },
  ai: { label: 'AI', description: 'Assistente, coach, decisioni, scoring clienti e generazione contenuti.' },
  market: { label: 'Market Intelligence', description: 'Ricerca di mercato, trend, concorrenza, prezzi e fornitori.' },
  multimachine: { label: 'Multi macchina', description: 'Più work center configurati contemporaneamente.' },
  multiuser: { label: 'Multi utente', description: 'Team, ruoli e business unit.' },
  api: { label: 'API', description: 'Accesso programmatico ai dati del laboratorio.' },
};

/**
 * I piani. `price: null` significa che il prezzo non è ancora stabilito: non si
 * scrive un numero plausibile per riempire la tabella.
 */
export const PLANS = {
  free: {
    label: 'Free',
    tagline: 'Per iniziare',
    price: 0,
    currency: 'EUR',
    storageGb: 1,
    features: ['core'],
  },
  starter: {
    label: 'Starter',
    tagline: 'Per piccoli laboratori',
    price: 19,
    currency: 'EUR',
    storageGb: 2,
    features: ['core', 'quotes', 'laser', 'print3d', 'dtf'],
  },
  pro: {
    label: 'Pro',
    tagline: 'Per professionisti',
    price: 49,
    currency: 'EUR',
    storageGb: 10,
    features: ['core', 'quotes', 'laser', 'print3d', 'dtf', 'analytics', 'ai', 'market', 'multimachine'],
  },
  business: {
    label: 'Business',
    tagline: 'Per aziende',
    price: 99,
    currency: 'EUR',
    storageGb: 50,
    features: [
      'core', 'quotes', 'laser', 'print3d', 'dtf',
      'analytics', 'ai', 'market', 'multimachine', 'multiuser',
    ],
  },
  enterprise: {
    label: 'Enterprise',
    tagline: 'Per laboratori strutturati',
    price: 199,
    currency: 'EUR',
    storageGb: 200,
    features: Object.keys(FEATURES),
  },
};

export const PLAN_ORDER = ['free', 'starter', 'pro', 'business', 'enterprise'];

/** Il piano include questa capacità? */
export function planHasFeature(plan, feature) {
  const p = PLANS[plan];
  return !!p && p.features.includes(feature);
}

/**
 * Le sezioni abilitate da un piano, derivate dalla tassonomia.
 * `navItems` arriva da `allItems()` di nav-map.js — passarlo esplicitamente
 * tiene questo modulo indipendente dal menu e testabile da solo.
 */
export function sectionsForPlan(plan, navItems) {
  return navItems.filter((item) => planHasFeature(plan, item.feature)).map((item) => item.id);
}

/** La matrice del confronto piani, pronta da disegnare. */
export function featureMatrix() {
  return Object.entries(FEATURES).map(([key, meta]) => ({
    feature: key,
    ...meta,
    plans: Object.fromEntries(PLAN_ORDER.map((p) => [p, planHasFeature(p, key)])),
  }));
}

/**
 * Il piano minimo che include una capacità: è ciò che va scritto sull'invito
 * all'upgrade, invece di un generico "funzione non disponibile".
 */
export function minimumPlanFor(feature) {
  return PLAN_ORDER.find((p) => planHasFeature(p, feature)) ?? null;
}
