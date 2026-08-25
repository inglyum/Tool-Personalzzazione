/**
 * INGLY OS · APP SHELL — assemblaggio.
 *
 * La tassonomia (`nav-map.js`), le icone (`icons.js`) e il registro licenze
 * sono moduli ES: si testano da soli, senza browser. Il monolite però esegue
 * script classici, quindi qui vengono convertiti in un blocco unico che li
 * espone su `window` e poi lancia la sidebar.
 *
 * Sorgente unico, due formati: il codice non viene duplicato.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

/**
 * Undici patch che ricostruivano il menu una sopra l'altra. Alcune dichiarano
 * nel proprio commento di correggere il flicker e le icone doppie causati
 * dalle precedenti: il problema era il numero di script che riscrivevano lo
 * stesso DOM, non l'ordine in cui lo facevano.
 */
export const RETIRED_SIDEBAR_PATCHES = [
  'patches/147-ingly-v71-nav-tidy-sidebar-ordinata-dedup-prefer.js',
  'patches/150-ingly-v74-icone-proprietarie-line-svg-stile-bran.js',
  'patches/156-ingly-v81-sidebar-unificata-fix-flicker-icone-do.js',
  'patches/158-ingly-v83-polish-finale-sidebar-allineamento-sto.js',
  'patches/159-ingly-v85-icone-svg-proprietarie-su-tutta-la-sid.js',
  'patches/162-ingly-v89-icone-precise-niente-doppioni.js',
  'patches/168-icone-premium-rimuove-le-emoji-decorative-dalle-.js',
];

/**
 * L'app shell prende il posto dell'ultima patch di navigazione — quella che
 * apriva d'ufficio il gruppo "Preventivi" — così viene eseguita per ultima,
 * dopo qualunque altro script che tocchi la sidebar.
 */
export const SIDEBAR_HOST = 'patches/171-apre-il-gruppo-preventivi-una-volta-le-4-smart-s.js';

/** Toglie la sintassi dei moduli da un sorgente ES per eseguirlo come script classico. */
function toClassicScript(file) {
  return fs
    .readFileSync(path.join(ROOT, file), 'utf8')
    .replace(/^\s*import[^;]+;\s*$/gm, '')
    .replace(/^export\s+(const|function|let|var|class)\b/gm, '$1')
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '');
}

export function appShellJs() {
  const banner =
    '/* ═══ INGLY OS · APP SHELL ═══════════════════════════════════════════════\n' +
    '   Tassonomia, icone e registro licenze. Sostituisce 11 patch che\n' +
    '   ricostruivano il menu una sopra l\'altra (v71, v74, v81, v83, v85, v89 e\n' +
    '   le rifiniture successive) e la parte di v88/v90 che nascondeva le voci\n' +
    '   ridondanti con `display:none !important`.\n' +
    '   Sorgenti in src/app-shell/ — questo blocco è generato, non si edita.\n' +
    '   ═══════════════════════════════════════════════════════════════════════ */\n';

  const bridge = `
(function (global) {
  'use strict';
${toClassicScript('src/app-shell/nav-map.js')}
${toClassicScript('src/app-shell/icons.js')}
${toClassicScript('src/core/licensing/features.js')}

  global.InglyNav = {
    NAV_GROUPS: NAV_GROUPS,
    NAV_ALIASES: NAV_ALIASES,
    NAV_EXCLUDED: NAV_EXCLUDED,
    TECH_LABELS: TECH_LABELS,
    allItems: allItems,
    resolveSection: resolveSection,
    primaryItems: primaryItems,
  };
  global.InglyIconsClass = iconClass;
  global.InglyLicensing = {
    FEATURES: FEATURES,
    PLANS: PLANS,
    PLAN_ORDER: PLAN_ORDER,
    planHasFeature: planHasFeature,
    sectionsForPlan: sectionsForPlan,
    featureMatrix: featureMatrix,
    minimumPlanFor: minimumPlanFor,
  };
})(window);
`;

  return banner + bridge + '\n' + fs.readFileSync(path.join(HERE, 'sidebar.js'), 'utf8');
}
