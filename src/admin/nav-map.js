/* ═══════════════════════════════════════════════════════════════════════════
   INGLY CLOUD ADMIN · TASSONOMIA
   ═══════════════════════════════════════════════════════════════════════════

   Le 18 pagine esistenti, riorganizzate nelle sei aree di una console SaaS.
   Nessuna pagina viene rimossa: cambia solo dove si trova.

   Le aree che una console del genere prevede ma per cui una pagina non esiste
   ancora — Companies, Workspaces, Trials, Tickets, Announcements — sono
   dichiarate qui con `planned: true`. Non compaiono nel menu: preferiamo una
   voce assente a una voce che apre una schermata riempita di dati generati.
   ═══════════════════════════════════════════════════════════════════════════ */

export const ADMIN_NAV = [
  {
    id: 'overview',
    label: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' }],
  },
  {
    id: 'customers',
    label: 'Customers',
    items: [
      { id: 'users', label: 'Utenti', icon: 'fa-users', badge: 'sb-badge-users' },
      { id: 'creations', label: 'Creazioni', icon: 'fa-folder-open' },
      { id: 'storage', label: 'Storage', icon: 'fa-database' },
      { id: 'companies', label: 'Aziende', icon: 'fa-building', planned: true },
      { id: 'workspaces', label: 'Workspace', icon: 'fa-diagram-project', planned: true },
    ],
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    items: [
      { id: 'plans', label: 'Piani', icon: 'fa-layer-group' },
      { id: 'subscriptions', label: 'Abbonamenti', icon: 'fa-credit-card' },
      { id: 'license-server', label: 'Licenze', icon: 'fa-key' },
      { id: 'billing-expiration', label: 'Scadenze', icon: 'fa-calendar-xmark', badge: 'sb-badge-exp' },
      { id: 'trials', label: 'Prove gratuite', icon: 'fa-hourglass-half', planned: true },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    items: [
      { id: 'sessions', label: 'Sessioni', icon: 'fa-desktop' },
      { id: 'devices', label: 'Dispositivi', icon: 'fa-fingerprint' },
      { id: 'security', label: 'Security Center', icon: 'fa-shield-halved' },
      { id: 'anti-sharing', label: 'Anti-Sharing', icon: 'fa-ban' },
      { id: 'audit-log', label: 'Audit Log', icon: 'fa-list-check' },
      { id: 'admin-roles', label: 'Admin & ruoli', icon: 'fa-user-shield' },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    items: [
      { id: 'notifications', label: 'Notifiche', icon: 'fa-bell' },
      { id: 'tickets', label: 'Ticket', icon: 'fa-life-ring', planned: true },
      { id: 'announcements', label: 'Comunicazioni', icon: 'fa-bullhorn', planned: true },
    ],
  },
  {
    id: 'system',
    label: 'Sistema',
    items: [
      { id: 'cloud-settings', label: 'Impostazioni cloud', icon: 'fa-cloud' },
      { id: 'architecture', label: 'Architettura', icon: 'fa-sitemap' },
      { id: 'roadmap', label: 'Roadmap', icon: 'fa-map' },
    ],
  },
];

/** Le pagine che esistono davvero, in ordine di menu. */
export function adminPages() {
  return ADMIN_NAV.flatMap((g) =>
    g.items.filter((i) => !i.planned).map((i) => ({ ...i, group: g.id, groupLabel: g.label })),
  );
}

/** Le aree previste per cui manca la pagina: vanno dette, non simulate. */
export function plannedPages() {
  return ADMIN_NAV.flatMap((g) => g.items.filter((i) => i.planned).map((i) => ({ ...i, group: g.id })));
}
