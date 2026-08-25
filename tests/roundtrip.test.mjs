/**
 * La rete di sicurezza dell'intero progetto.
 *
 * Il manifest registra l'impronta di ogni blocco così com'era nel monolite di
 * partenza. Qui si ricalcola quella di ogni file: tutto ciò che è cambiato deve
 * comparire in `baseline/deliberate-changes.json` con la sua ragione. Una
 * modifica accidentale dentro 9 MB di codice storico non si nota rivedendo un
 * diff — si nota qui.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { build } from '../scripts/build.mjs';

const declared = JSON.parse(fs.readFileSync('baseline/deliberate-changes.json', 'utf8'));

const apps = [
  { name: 'INGLY OS', dir: 'src/legacy' },
  { name: 'INGLY Cloud Admin', dir: 'src/admin/legacy' },
];

const shortSha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);

for (const app of apps) {
  const manifest = JSON.parse(fs.readFileSync(path.join(app.dir, 'manifest.json'), 'utf8'));
  const allowed = declared[app.dir] ?? {};

  test(`${app.name}: ogni parte del manifest esiste su disco`, () => {
    for (const part of manifest.parts) {
      if (!part.file) continue;
      assert.ok(fs.existsSync(path.join(app.dir, part.file)), `manca ${part.file}`);
    }
  });

  test(`${app.name}: nessuna modifica non dichiarata al codice storico`, () => {
    const changed = [];
    for (const part of manifest.parts) {
      if (!part.file || !part.sha256) continue;
      const current = shortSha(fs.readFileSync(path.join(app.dir, part.file)));
      if (current !== part.sha256 && !(part.file in allowed)) changed.push(part.file);
    }
    assert.deepEqual(
      changed,
      [],
      `modifiche non dichiarate — vanno aggiunte a baseline/deliberate-changes.json con la ragione`,
    );
  });

  test(`${app.name}: ogni modifica dichiarata è ancora effettiva`, () => {
    const stale = [];
    for (const [file, reason] of Object.entries(allowed)) {
      const part = manifest.parts.find((p) => p.file === file);
      assert.ok(part, `dichiarata una modifica a ${file}, che non è nel manifest`);
      assert.ok(reason.length > 30, `la ragione per ${file} è troppo vaga`);
      const current = shortSha(fs.readFileSync(path.join(app.dir, file)));
      if (current === part.sha256) stale.push(file);
    }
    assert.deepEqual(stale, [], `dichiarate come modificate ma identiche all'originale: ${stale.join(', ')}`);
  });

  test(`${app.name}: il build ricompone i blocchi nell'ordine del manifest`, () => {
    const { html } = build({ srcDir: app.dir }); // senza override né esclusioni
    // Si ri-tokenizza il risultato con la stessa regola usata per estrarlo: la
    // sequenza di tipi e attributi deve tornare identica. Contare le occorrenze
    // di "<script" non basterebbe — molte patch generano HTML contenente a sua
    // volta dei tag.
    const re = /<(style|script)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    const rebuilt = [...html.matchAll(re)].map((m) => `${m[1].toLowerCase()}|${m[2].trim()}`);
    const expected = manifest.parts
      .filter((p) => p.type !== 'markup')
      .map((p) => `${p.type}|${p.attrs ?? ''}`);
    assert.deepEqual(rebuilt, expected);
  });
}

test('INGLY Cloud Admin: il build è ancora identico al file di partenza', () => {
  // L'Admin non è stato ancora toccato: finché è così vale la verifica forte.
  const { html, manifest } = build({ srcDir: 'src/admin/legacy' });
  assert.equal(crypto.createHash('sha256').update(html).digest('hex'), manifest.sourceSha256);
});
