#!/usr/bin/env node
/**
 * extract.mjs — deconstruisce un monolite INGLY OS in sorgenti separati.
 *
 * Il monolite è un unico HTML da ~9 MB in cui convivono librerie vendorizzate,
 * il vero sorgente modulare (`/src/**`, marcato dai commenti lasciati dal build
 * originale), decine di patch storiche e il markup delle viste.
 * Qui non si riscrive nulla: si taglia lungo i confini che il file già dichiara
 * e si registra l'ordine in un manifest, perché l'ordine di caricamento è
 * portante (le patch si sovrascrivono a vicenda).
 *
 *   node scripts/extract.mjs <monolite.html> <cartella-destinazione>
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const VENDOR_SIGNATURES = [
  [/Chart\.js\s+([\d.]+)/i, 'chartjs'],
  [/jsPDF\s+([\d.]+)/i, 'jspdf'],
  [/html2canvas\s+([\d.]+)/i, 'html2canvas'],
  [/SheetJS xlsx\s+([\d.]+)/i, 'sheetjs-xlsx'],
  [/jspdf-autotable\s+([\d.]+)/i, 'jspdf-autotable'],
  [/simple-statistics\s+([\d.]+)/i, 'simple-statistics'],
  [/JSZip\s+([\d.]+)/i, 'jszip'],
];

const INLINE_MARKUP_LIMIT = 512;
const SRC_MARKER = /\/\/\s*===\s*(\/src\/[^\s]+)\s*===/;

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 48) || 'block';

/** Prima riga "parlante" di un blocco: serve solo a dare un nome leggibile al file. */
function label(body) {
  for (const raw of body.split('\n').slice(0, 12)) {
    const line = raw.replace(/^[\s/*=\-─━═╔╚║╗╝•·<!>]+/, '').trim();
    if (line.length > 3 && !/^['"`]/.test(line)) return line;
  }
  return '';
}

function classify(body, attrs, kind) {
  if (kind === 'style') return { dir: 'styles', ext: 'css' };
  if (/\ssrc\s*=/.test(attrs)) return { dir: 'external', ext: 'js' };
  const head = body.slice(0, 400);
  for (const [re, name] of VENDOR_SIGNATURES) {
    if (re.test(head)) return { dir: 'vendor', ext: 'js', name };
  }
  const m = body.match(SRC_MARKER);
  if (m) return { dir: 'app', ext: 'js', srcPath: m[1] };
  return { dir: 'patches', ext: 'js' };
}

export function extract(htmlPath, outDir) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const re = /<(style|script)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  const parts = [];
  let cursor = 0;
  let m;
  let index = 0;

  const push = (part) => parts.push(part);
  const writeFile = (rel, content) => {
    const abs = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  };

  // Fra un <script> e l'altro il monolite lascia soprattutto ritorni a capo.
  // Quei frammenti restano inline nel manifest: su disco finisce solo il markup vero.
  let markupIndex = 0;
  const pushMarkup = (markup) => {
    if (Buffer.byteLength(markup) <= INLINE_MARKUP_LIMIT) {
      push({ type: 'markup', text: markup, bytes: Buffer.byteLength(markup) });
      return;
    }
    const rel = `markup/${String(++markupIndex).padStart(3, '0')}.html`;
    writeFile(rel, markup);
    push({ type: 'markup', file: rel, bytes: Buffer.byteLength(markup) });
  };

  while ((m = re.exec(html))) {
    if (m.index > cursor) pushMarkup(html.slice(cursor, m.index));
    index += 1;
    const [kind, attrs, body] = [m[1].toLowerCase(), m[2], m[3]];
    const cls = classify(body, attrs, kind);
    const n = String(index).padStart(3, '0');
    let rel;
    if (cls.dir === 'app') {
      rel = `app${cls.srcPath}`; // /src/core/app.js -> app/src/core/app.js
    } else if (cls.dir === 'vendor') {
      rel = `vendor/${cls.name}.js`;
    } else {
      rel = `${cls.dir}/${n}-${slug(label(body))}.${cls.ext}`;
    }
    writeFile(rel, body);
    push({
      type: kind,
      file: rel,
      attrs: attrs.trim(),
      bytes: Buffer.byteLength(body),
      sha256: crypto.createHash('sha256').update(body).digest('hex').slice(0, 16),
      label: label(body).slice(0, 120),
    });
    cursor = re.lastIndex;
  }
  if (cursor < html.length) pushMarkup(html.slice(cursor));

  const manifest = {
    source: path.basename(htmlPath),
    sourceBytes: Buffer.byteLength(html),
    sourceSha256: crypto.createHash('sha256').update(html).digest('hex'),
    extractedAt: new Date().toISOString().slice(0, 10),
    parts,
  };
  writeFile('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [src, out] = process.argv.slice(2);
  if (!src || !out) {
    console.error('uso: node scripts/extract.mjs <monolite.html> <cartella>');
    process.exit(2);
  }
  const man = extract(src, out);
  const by = {};
  for (const p of man.parts) {
    const d = p.type === 'markup' ? 'markup' : p.file.split('/')[0];
    by[d] = by[d] || { n: 0, bytes: 0 };
    by[d].n += 1;
    by[d].bytes += p.bytes;
  }
  console.log(`sorgente: ${man.source} — ${(man.sourceBytes / 1048576).toFixed(2)} MB`);
  for (const [k, v] of Object.entries(by)) {
    console.log(`  ${k.padEnd(9)} ${String(v.n).padStart(4)} file  ${(v.bytes / 1048576).toFixed(2)} MB`);
  }
}
