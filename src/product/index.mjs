/**
 * INGLY OS · FASE 2 — assemblaggio.
 *
 * I moduli della Fase 2 sono script classici (il monolite non carica moduli
 * ES) e vanno concatenati in un ordine preciso: `ui` e `data` non dipendono da
 * nulla, tutto il resto dipende da loro.
 *
 * Prende il posto di un blocco esistente invece di aggiungersi in fondo al
 * file — la regola che vale dalla Fase 1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * L'ultima patch del monolite: un layer di white-label branding che si limita
 * a leggere le impostazioni e applicare logo e colore. La Fase 2 la ingloba
 * anziché sostituirla — quel comportamento serve ancora.
 */
export const PRODUCT_HOST = 'patches/176-white-label-branding-additivo-reversibile-csp-sa.js';

/** L'ordine è una dipendenza, non una preferenza. */
/**
 * La command bar della v72 inseriva sette riquadri di azioni rapide in cima
 * alla dashboard. L'Operating Center ha le proprie azioni nell'intestazione:
 * tenerle entrambe significa due file di pulsanti che fanno le stesse cose.
 */
export const RETIRED_DASHBOARD_PATCHES = [
  'patches/148-ingly-v72-home-erp-unificata-command-bar.js',
];

export const PRODUCT_FILES = [
  'ui.js',
  'dialogs.js',
  'data.js',
  'work-center.js',
  'dashboard.js',
  'product-builder.js',
  'topbar.js',
  'command-palette.js',
  'first-run.js',
];

export function productJs(originalBlock) {
  const banner =
    '/* ═══ INGLY OS · FASE 2 — PREMIUM PRODUCT EXPERIENCE ════════════════════\n' +
    '   Operating Center, Work Center, Product Builder, topbar, command palette\n' +
    '   e ricerca globale. Legge dagli store esistenti e chiama i motori\n' +
    '   esistenti: nessun database nuovo, nessun modello di costo nuovo.\n' +
    '   Sorgenti in src/product/ — questo blocco è generato, non si edita.\n' +
    '   ═══════════════════════════════════════════════════════════════════════ */\n';

  const modules = PRODUCT_FILES
    .map((f) => fs.readFileSync(path.join(HERE, f), 'utf8'))
    .join('\n');

  return originalBlock + '\n' + banner + modules;
}
