#!/usr/bin/env node
/**
 * audit-report.mjs — rigenera i numeri citati in docs/AUDIT.md e docs/BASELINE.md.
 * Serve a rendere l'audit ripetibile invece che una fotografia da fidarsi.
 */
import fs from 'node:fs';
import { snapshot } from './baseline.mjs';

const row = (k, v) => console.log(`  ${String(k).padEnd(30)} ${String(v).padStart(10)}`);

for (const [name, dir] of [['INGLY OS', 'src/legacy'], ['INGLY Cloud Admin', 'src/admin/legacy']]) {
  const manifest = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, 'utf8'));
  const snap = snapshot(dir);
  const byDir = {};
  for (const p of manifest.parts) {
    const d = p.type === 'markup' ? 'markup' : p.file.split('/')[0];
    byDir[d] = byDir[d] || { n: 0, bytes: 0 };
    byDir[d].n += 1;
    byDir[d].bytes += p.bytes;
  }
  console.log(`\n${name} — ${manifest.source}`);
  console.log(`  sha256 ${manifest.sourceSha256}`);
  for (const [d, v] of Object.entries(byDir)) row(d, `${v.n} file · ${(v.bytes / 1048576).toFixed(2)} MB`);
  console.log('');
  row('sezioni', snap.sections.length);
  row('viste', snap.views.length);
  row('globali', snap.globals.length);
  row('window.*', snap.windowGlobals.length);
  row('chiavi storage', snap.storageKeys.length);
  for (const [k, v] of Object.entries(snap.counts)) row(k, v);
}
