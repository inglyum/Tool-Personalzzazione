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
  /* Il motore di costo prima del quoter 3D, che ne è un profilo: chi legge il
     bundle incontra la matematica comune prima delle sue applicazioni. */
  'cost-engine.js',
  'print3d-cost.js',
  /* L'adapter del preventivo: dopo il motore, prima di chi lo usa. */
  'quote-adapter.js',
  /* Lo storico economico: congela ciò che l'adapter ha appena calcolato, e
     va quindi dopo di lui — ma prima dei moduli storici che lo chiamano. */
  'order-snapshot.js',
  /* La vista dello storico: dopo lo snapshot che legge e dopo `ui.js`, da cui
     prende `esc` e i dialoghi. */
  'order-economics.js',
  /* La lettura normalizzata dei campi dell'ordine: legge lo snapshot, quindi
     dopo di lui, e il registro delle tecnologie del motore, quindi dopo il
     cost engine. Non disegna e non salva: la vista storica lo interroga. */
  'order-fields.js',
  /* Capacità e scadenze di produzione: legge la macchina di un ordine
     attraverso `order-fields`, quindi dopo di lui. Puro: nessun DOM. */
  'production-capacity.js',
  /* Il ricalcolo del catalogo: usa `InglyCostEngine.prezzo`, quindi dopo il
     motore. Prepara una proposta e non scrive: scrivere è di chi conferma. */
  'catalog-recalc.js',
  /* Il registro di magazzino: puro, poi la metà che parla con il database.
     Nessuno dei due dipende dal resto, ma l'ordine fra i due sì. */
  'inventory-ledger.js',
  'inventory-store.js',
  /* Il resolver: legge il registro, non il listino. Dopo il registro e prima
     di chiunque chieda un costo. */
  'inventory-cost-resolver.js',
  'material-cost.js',
  'machine-cost.js',
  'fisco.js',
  /* I margini configurati: dopo il motore, di cui conserva le sole modifiche.
     È qui e non nel motore perché il motore deve restare puro. */
  'pricing-policies.js',
  /* Preventivato contro reale: puro, non recupera niente. */
  'scostamento.js',
  /* Il registro di com'è andata davvero: un proprietario solo per tutti i
     preventivatori. Prima dei preventivatori che lo interrogano. */
  'consuntivo.js',
  /* Il campo immagine riusabile: nessuna dipendenza, lo montano sei moduli. */
  'product-image.js',
  /* Quando ricomprare, calcolato dai movimenti invece che scritto a mano.
     Puro: legge un registro che riceve, non lo va a prendere. */
  'inventory-riordino.js',
  'tema.js',
  'tema-view.js',
  'cliente-integrita.js',
  'clienti.js',
  /* Il renderer unico della riga cliente (CRM-05): puro, prima delle viste
     che lo usano. Non legge dati, quindi non dipende da `clienti.js` — ma
     stargli accanto dice che appartengono allo stesso consolidamento. */
  'cliente-riga.js',
  /* Il lettore dei file di slicer: puro, nessuna rete. Prima della vista del
     preventivatore, che glieli passa. */
  'slicer-import.js',
  /* La vista del registro: dopo il registro e dopo ui.js. */
  'inventory-view.js',
  /* I template di preventivo: puri, dopo l'adapter di cui usano lo stato. */
  'quote-templates.js',
  /* La vista del preventivatore 3D: dopo il motore, di cui è solo la faccia. */
  'quoter3d-view.js',
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
