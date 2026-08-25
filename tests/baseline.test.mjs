/**
 * Confronta lo stato corrente con la baseline registrata. Fallisce quando una
 * sezione, un modulo globale o una chiave di storage spariscono: sono le tre
 * cose che un refactor può perdere senza che nulla protesti a compile time.
 *
 * Aggiungere è sempre lecito. Togliere richiede di aggiornare la baseline
 * di proposito, con `npm run baseline`, in un commit dedicato.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { snapshot } from '../scripts/baseline.mjs';

const apps = [
  { name: 'INGLY OS', dir: 'src/legacy', file: 'baseline/ingly-os.json' },
  { name: 'INGLY Cloud Admin', dir: 'src/admin/legacy', file: 'baseline/ingly-cloud-admin.json' },
];

const missing = (before, after) => before.filter((x) => !after.includes(x));

for (const app of apps) {
  const expected = JSON.parse(fs.readFileSync(app.file, 'utf8'));
  const actual = snapshot(app.dir);

  for (const key of ['sections', 'views', 'globals', 'windowGlobals', 'storageKeys', 'idbStores']) {
    test(`${app.name}: nessun ${key} perso`, () => {
      const lost = missing(expected[key], actual[key]);
      assert.deepEqual(lost, [], `spariti: ${lost.join(', ')}`);
    });
  }
}
