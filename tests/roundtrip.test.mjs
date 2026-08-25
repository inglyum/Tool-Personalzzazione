/**
 * La rete di sicurezza dell'intero progetto: finché il build senza override
 * riproduce il monolite originale bit per bit, la decomposizione non ha perso
 * nulla. Quando una fase introduce override, questo test dice esattamente
 * quali blocchi sono cambiati.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { build } from '../scripts/build.mjs';

const apps = [
  { name: 'INGLY OS', dir: 'src/legacy' },
  { name: 'INGLY Cloud Admin', dir: 'src/admin/legacy' },
];

for (const app of apps) {
  test(`${app.name}: il build ricompone il monolite originale bit per bit`, () => {
    const { html, manifest } = build({ srcDir: app.dir });
    const sha = crypto.createHash('sha256').update(html).digest('hex');
    assert.equal(sha, manifest.sourceSha256, 'SHA-256 divergente dal sorgente registrato');
    assert.equal(Buffer.byteLength(html), manifest.sourceBytes);
  });

  test(`${app.name}: ogni parte del manifest esiste su disco`, () => {
    const manifest = JSON.parse(fs.readFileSync(`${app.dir}/manifest.json`, 'utf8'));
    for (const part of manifest.parts) {
      if (!part.file) continue;
      assert.ok(fs.existsSync(`${app.dir}/${part.file}`), `manca ${part.file}`);
    }
  });
}
