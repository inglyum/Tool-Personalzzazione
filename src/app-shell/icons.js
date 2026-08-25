/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · ICONE
   ═══════════════════════════════════════════════════════════════════════════

   Il v96 caricava cinque librerie di icone e ne usava una: 974 riferimenti a
   Font Awesome, zero a Tabler, Phosphor, Remix e Lucide. Le altre quattro sono
   state rimosse dal build.

   Restava però il problema opposto: 9.158 emoji usate come icone, comprese le
   voci di menu. Un'emoji cambia forma su ogni sistema operativo, non eredita
   il colore del testo e non si allinea con le altre: come icona di prodotto
   non funziona.

   Qui i nomi semantici usati dalla tassonomia si traducono in classi Font
   Awesome. Il nome dice cosa rappresenta, non che glifo è: cambiare libreria
   un giorno significa riscrivere questa tabella e nient'altro.
   ═══════════════════════════════════════════════════════════════════════════ */

export const ICONS = {
  home: 'fa-house',
  gauge: 'fa-gauge-high',
  activity: 'fa-wave-square',
  zap: 'fa-bolt',
  layers: 'fa-layer-group',
  book: 'fa-book',
  box: 'fa-cube',
  shirt: 'fa-shirt',
  'git-branch': 'fa-code-branch',
  columns: 'fa-table-columns',
  truck: 'fa-truck',
  folder: 'fa-folder-open',
  clock: 'fa-clock',
  briefcase: 'fa-briefcase',
  grid: 'fa-th-large',
  'file-text': 'fa-file-invoice',
  clipboard: 'fa-clipboard-list',
  users: 'fa-users',
  receipt: 'fa-receipt',
  tag: 'fa-tags',
  archive: 'fa-box-archive',
  presentation: 'fa-chalkboard',
  calendar: 'fa-calendar',
  'calendar-check': 'fa-calendar-check',
  'calendar-clock': 'fa-calendar-day',
  'calendar-days': 'fa-calendar-days',
  'calendar-range': 'fa-calendar-week',
  store: 'fa-store',
  scan: 'fa-qrcode',
  file: 'fa-file-lines',
  'user-plus': 'fa-user-plus',
  building: 'fa-building',
  scale: 'fa-scale-balanced',
  tool: 'fa-screwdriver-wrench',
  cpu: 'fa-microchip',
  package: 'fa-boxes-stacked',
  droplet: 'fa-spray-can',
  'alert-triangle': 'fa-triangle-exclamation',
  barcode: 'fa-barcode',
  sliders: 'fa-sliders',
  'check-square': 'fa-square-check',
  lightbulb: 'fa-lightbulb',
  brain: 'fa-brain',
  sparkles: 'fa-wand-magic-sparkles',
  compass: 'fa-compass',
  radar: 'fa-satellite-dish',
  globe: 'fa-globe',
  search: 'fa-magnifying-glass',
  rss: 'fa-tower-broadcast',
  'file-search': 'fa-file-circle-question',
  crosshair: 'fa-crosshairs',
  'trending-up': 'fa-arrow-trend-up',
  swords: 'fa-chess',
  eye: 'fa-eye',
  map: 'fa-map-location-dot',
  target: 'fa-bullseye',
  'git-merge': 'fa-code-merge',
  flag: 'fa-flag',
  'user-search': 'fa-user-tag',
  star: 'fa-star',
  gem: 'fa-gem',
  rocket: 'fa-rocket',
  'line-chart': 'fa-chart-line',
  bell: 'fa-bell',
  'message-square': 'fa-comment-dots',
  megaphone: 'fa-bullhorn',
  share: 'fa-share-nodes',
  'bar-chart': 'fa-chart-column',
  'chart-column': 'fa-chart-column',
  quote: 'fa-quote-right',
  camera: 'fa-camera',
  image: 'fa-images',
  palette: 'fa-palette',
  badge: 'fa-certificate',
  euro: 'fa-euro-sign',
  waves: 'fa-water',
  anchor: 'fa-anchor',
  'book-open': 'fa-book-open',
  landmark: 'fa-landmark',
  repeat: 'fa-arrows-rotate',
  'file-check': 'fa-file-circle-check',
  send: 'fa-paper-plane',
  'pie-chart': 'fa-chart-pie',
  'file-bar-chart': 'fa-file-lines',
  'file-down': 'fa-file-pdf',
  settings: 'fa-gear',
  save: 'fa-floppy-disk',
  'hard-drive': 'fa-hard-drive',
  history: 'fa-clock-rotate-left',
  'cloud-download': 'fa-cloud-arrow-down',
};

/** Classe Font Awesome per un nome semantico. Sconosciuto → punto neutro. */
export function iconClass(name) {
  return 'fas ' + (ICONS[name] ?? 'fa-circle-dot');
}
