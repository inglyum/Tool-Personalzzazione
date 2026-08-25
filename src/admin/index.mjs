/**
 * INGLY CLOUD ADMIN — composizione.
 *
 * Dichiara cosa cambia rispetto all'Enterprise Admin v1.2: il design system al
 * posto della sua scala di variabili, il modulo credenziali prima di ogni
 * codice che le usa, e la sidebar riorganizzata nelle sei aree della console.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Il blocco CSS che definiva i token della console. Lo sostituisce il design system. */
export const ADMIN_STYLE_HOST = 'styles/001-ingly-enterprise-design-system.css';

/** Blocco eseguito prima di tutto: ci va il modulo credenziali. */
export const ADMIN_SECURITY_HOST = 'patches/002-https-enforcement-deve-girare-su-https-in-produz.js';

/** Ultimo blocco: ci va la sidebar, così parte dopo il resto della console. */
export const ADMIN_SHELL_HOST = 'patches/008-azioni-bulk-utenti-selezione-multipla-layer-non-.js';

function toClassicScript(file) {
  return fs
    .readFileSync(path.join(HERE, file), 'utf8')
    .replace(/^\s*import[^;]+;\s*$/gm, '')
    .replace(/^export\s+(const|function|let|var|class)\b/gm, '$1')
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '');
}

export function adminAuthJs(originalBlock) {
  return (
    originalBlock +
    '\n\n' +
    fs.readFileSync(path.join(HERE, 'auth/credentials.js'), 'utf8')
  );
}

export function adminShellJs(originalBlock) {
  const bridge =
    '\n(function (global) {\n  "use strict";\n' +
    toClassicScript('nav-map.js') +
    '\n  global.InglyAdminNav = { ADMIN_NAV: ADMIN_NAV, adminPages: adminPages, plannedPages: plannedPages };\n' +
    '})(window);\n';
  return originalBlock + '\n' + bridge + '\n' + fs.readFileSync(path.join(HERE, 'sidebar.js'), 'utf8');
}
