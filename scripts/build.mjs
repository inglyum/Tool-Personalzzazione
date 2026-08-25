#!/usr/bin/env node
/**
 * build.mjs — ricompone i sorgenti in un singolo HTML offline-first.
 *
 * L'ordine dei blocchi è quello del manifest: non va riordinato, perché nel
 * monolite storico le patch successive sovrascrivono le precedenti.
 * `overrides` permette di sostituire il contenuto di un blocco (es. il layer
 * CSS legacy rimpiazzato dall'INGLY Design System) senza toccare il manifest.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function build({ srcDir, manifestPath, overrides = {}, drop = new Set() }) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath ?? path.join(srcDir, 'manifest.json'), 'utf8'));
  const out = [];
  for (const part of manifest.parts) {
    if (part.file && drop.has(part.file)) continue;
    if (part.type === 'markup') {
      out.push(part.text ?? fs.readFileSync(path.join(srcDir, part.file), 'utf8'));
      continue;
    }
    const body =
      part.file in overrides
        ? overrides[part.file]
        : fs.readFileSync(path.join(srcDir, part.file), 'utf8');
    const attrs = part.attrs ? ' ' + part.attrs : '';
    out.push(`<${part.type}${attrs}>${body}</${part.type}>`);
  }
  return { html: out.join(''), manifest };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const srcDir = process.argv[2] ?? 'src/legacy';
  const outFile = process.argv[3] ?? 'dist/INGLY-OS.html';
  const { html, manifest } = build({ srcDir });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html);
  const sha = crypto.createHash('sha256').update(html).digest('hex');
  const identical = sha === manifest.sourceSha256;
  console.log(`scritto ${outFile} — ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB`);
  console.log(`sha256 build   : ${sha}`);
  console.log(`sha256 sorgente: ${manifest.sourceSha256}`);
  console.log(identical ? 'IDENTICO al monolite originale ✔' : 'DIVERSO dal monolite originale');
  if (!identical) process.exitCode = 1;
}
