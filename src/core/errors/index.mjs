import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* Il registro deve esistere prima della guardia sullo spazio, perché la
   guardia gli riferisce i fallimenti. Entrambi stanno davanti al primo script
   del documento: da lì in poi nulla fallisce in silenzio. */
export function errorLoggerJs() {
  return fs.readFileSync(path.join(HERE, 'logger.js'), 'utf8');
}
