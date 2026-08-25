/**
 * Regole di igiene che valgono da subito sul codice NUOVO. I sorgenti in
 * src/legacy/ sono esclusi: il loro debito è misurato, non ancora sanato, e
 * bloccarli qui renderebbe il test rosso per mesi senza dire nulla di utile.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const NEW_CODE = ['src/design-system', 'src/app-shell', 'src/core', 'src/domain'];

const walk = (dir, acc = []) => {
  if (!fs.existsSync(dir)) return acc;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
};

const newFiles = NEW_CODE.flatMap((d) => walk(d));

test('nessun colore esadecimale fuori dai token primitivi', () => {
  const offenders = [];
  for (const f of newFiles.filter((f) => f.endsWith('.css'))) {
    if (f.endsWith('primitive.css')) continue; // è il posto in cui i colori nascono
    const hex = fs.readFileSync(f, 'utf8').match(/#[0-9a-fA-F]{3,8}\b/g);
    if (hex) offenders.push(`${f}: ${[...new Set(hex)].join(' ')}`);
  }
  assert.deepEqual(offenders, []);
});

test('nessun !important nel design system', () => {
  const offenders = newFiles
    .filter((f) => f.endsWith('.css'))
    .filter((f) => fs.readFileSync(f, 'utf8').includes('!important'));
  assert.deepEqual(offenders, []);
});

test('nessuna credenziale nel codice nuovo', () => {
  const re = /(password|passwd|secret|api[_-]?key)\s*[:=]\s*['"][^'"]{3,}['"]/i;
  const offenders = newFiles.filter((f) => /\.(js|mjs|ts|json)$/.test(f) && re.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(offenders, []);
});
