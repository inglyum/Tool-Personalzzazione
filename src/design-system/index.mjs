/**
 * INGLY DESIGN SYSTEM — assemblaggio.
 *
 * L'ordine dei file è l'ordine dell'architettura: primitive → semantic →
 * component → base → componenti. Non è alfabetico e non va reso tale.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const DESIGN_SYSTEM_FILES = [
  'assets/fonts.css',
  'tokens/primitive.css',
  'tokens/semantic.css',
  'tokens/component.css',
  'tokens/legacy-bridge.css',
  'base/base.css',
  'components/controls.css',
  'components/surfaces.css',
  'components/overlays.css',
  'components/shell.css',
  'components/operating-center.css',
];

/** La variante per INGLY Cloud Admin: stessi token, ponte verso i suoi nomi. */
export function adminDesignSystemCss() {
  const files = DESIGN_SYSTEM_FILES.map((f) =>
    f === 'tokens/legacy-bridge.css' ? 'tokens/admin-bridge.css' : f,
  );
  const banner =
    '/* ═══ INGLY DESIGN SYSTEM v1.0 · INGLY CLOUD ADMIN ══════════════════════\n' +
    '   Gli stessi token dell\'applicazione. La console aveva una propria scala\n' +
    '   di variabili, indipendente e con l\'accento ambra: due prodotti dello\n' +
    '   stesso marchio che non si somigliavano.\n' +
    '   Sorgenti in src/design-system/ — questo blocco è generato, non si edita.\n' +
    '   ═══════════════════════════════════════════════════════════════════════ */\n';
  return banner + files.map((f) => fs.readFileSync(path.join(HERE, f), 'utf8')).join('\n');
}

export function designSystemCss() {
  const banner =
    '/* ═══ INGLY DESIGN SYSTEM v1.0 ═══════════════════════════════════════════\n' +
    '   Layer unico. Sostituisce i layer v54, v55, v56, v57, v58, v92 e BLOCCO B\n' +
    '   del monolite storico: sette strati che si sovrascrivevano a vicenda.\n' +
    '   Sorgenti in src/design-system/ — questo blocco è generato, non si edita.\n' +
    '   ═══════════════════════════════════════════════════════════════════════ */\n';
  return (
    banner +
    DESIGN_SYSTEM_FILES.map((f) => fs.readFileSync(path.join(HERE, f), 'utf8')).join('\n')
  );
}
