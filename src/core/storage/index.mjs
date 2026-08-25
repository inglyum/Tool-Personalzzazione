import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* La guardia deve essere attiva prima di qualunque scrittura, quindi viene
   anteposta al primo blocco JavaScript del documento. Non lo sostituisce: gli
   sta davanti, come `productJs` si accoda all'ultimo. */
export const STORAGE_GUARD_HOST = 'vendor/chartjs.js';

export function storageGuardJs(originalBlock) {
  const banner =
    '/* ═══ INGLY OS · GUARDIA SULLO SPAZIO ═══════════════════════════════════\n' +
    '   Anteposta al primo script del documento: da qui in poi una scrittura\n' +
    '   che fallisce per spazio esaurito non passa più inosservata.\n' +
    '   ═══════════════════════════════════════════════════════════════════ */\n';
  return banner + fs.readFileSync(path.join(HERE, 'guard.js'), 'utf8') + '\n' + originalBlock;
}
