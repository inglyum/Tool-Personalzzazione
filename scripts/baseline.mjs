#!/usr/bin/env node
/**
 * baseline.mjs — fotografa lo stato funzionale dei sorgenti estratti.
 *
 * Serve a dimostrare, dopo ogni refactor, che nulla di importante è sparito:
 * sezioni, moduli globali, chiavi di storage e funzioni pubbliche vengono
 * confrontate con `baseline/<nome>.json` dal test `tests/baseline.test.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';

const walk = (dir, acc = []) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
};

const uniqSorted = (arr) => [...new Set(arr)].sort();

export function snapshot(srcDir) {
  const files = walk(srcDir).filter((f) => /\.(js|html|css)$/.test(f));
  let js = '';
  let html = '';
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    if (f.endsWith('.js')) js += t + '\n';
    else if (f.endsWith('.html')) html += t + '\n';
  }
  const all = js + html;
  const grab = (re, src = all) => [...src.matchAll(re)].map((m) => m[1]);

  return {
    sections: uniqSorted(grab(/data-section="([a-z0-9_]+)"/g)),
    views: uniqSorted(grab(/id="view-([a-z0-9_-]+)"/g, html)),
    globals: uniqSorted(grab(/^\s*(?:const|var|let)\s+([A-Z][A-Za-z0-9_]{2,})\s*=\s*[{(]/gm, js)),
    windowGlobals: uniqSorted(grab(/window\.([A-Z][A-Za-z0-9_]{2,})\s*=/g, js)),
    storageKeys: uniqSorted(grab(/(?:localStorage|sessionStorage)\.(?:get|set|remove)Item\(\s*['"]([^'"]+)['"]/g, js)),
    idbStores: uniqSorted(grab(/createObjectStore\(\s*['"]([^'"]+)['"]/g, js)),
    vendored: uniqSorted(
      fs.existsSync(path.join(srcDir, 'vendor'))
        ? fs.readdirSync(path.join(srcDir, 'vendor')).map((f) => f.replace(/\.js$/, ''))
        : [],
    ),
    counts: {
      files: files.length,
      bytes: files.reduce((a, f) => a + fs.statSync(f).size, 0),
      inlineStyleAttrs: (all.match(/style="/g) || []).length,
      inlineOnclick: (all.match(/onclick="/g) || []).length,
      hardcodedHex: (all.match(/#[0-9a-fA-F]{6}\b/g) || []).length,
      important: (all.match(/!important/g) || []).length,
      emoji: (all.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu) || []).length,
      alertCalls: (js.match(/\balert\(/g) || []).length,
      confirmCalls: (js.match(/\bconfirm\(/g) || []).length,
      promptCalls: (js.match(/\bprompt\(/g) || []).length,
      ariaAttrs: (all.match(/aria-[a-z]+/g) || []).length,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [srcDir, outFile] = process.argv.slice(2);
  const snap = snapshot(srcDir ?? 'src/legacy');
  const json = JSON.stringify(snap, null, 2) + '\n';
  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, json);
    console.log(`baseline scritta in ${outFile}`);
  }
  console.log(
    `sezioni ${snap.sections.length} · viste ${snap.views.length} · globali ${snap.globals.length} · ` +
      `window.* ${snap.windowGlobals.length} · storage keys ${snap.storageKeys.length} · store IDB ${snap.idbStores.length}`,
  );
}
