#!/usr/bin/env node
/**
 * vendor-fonts.mjs — incorpora tipografia e icone nel prodotto.
 *
 * INGLY OS si dichiara offline-first — un file HTML che si apre con un doppio
 * click — ma caricava Inter da Google Fonts e Font Awesome da un CDN. Senza
 * rete: nessuna icona, testo con il font di sistema. Nel v96 quel difetto era
 * invisibile perché si provava il file su una macchina connessa.
 *
 * Qui i font vengono presi dai pacchetti npm e scritti come data URI dentro
 * `src/design-system/assets/fonts.css`, che è versionato: il build non ha mai
 * bisogno di rete e il repository resta autosufficiente.
 *
 * Delle 2.000+ icone di Font Awesome si generano solo le classi effettivamente
 * usate nel codice — poche centinaia — invece di un foglio da 70 KB.
 *
 *   node scripts/vendor-fonts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FA = path.join(ROOT, 'node_modules/@fortawesome/fontawesome-free');
const INTER = path.join(ROOT, 'node_modules/@fontsource/inter/files');
const OUT = path.join(ROOT, 'src/design-system/assets/fonts.css');

const dataUri = (file) =>
  `url("data:font/woff2;base64,${fs.readFileSync(file).toString('base64')}") format("woff2")`;

/** Ogni classe `fa-*` che compare davvero nei sorgenti. */
function usedIconClasses() {
  const found = new Set();
  const walk = (dir) => {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(js|mjs|html|css)$/.test(p)) {
        const text = fs.readFileSync(p, 'utf8');
        for (const m of text.matchAll(/\bfa-([a-z0-9-]+)\b/g)) found.add('fa-' + m[1]);
      }
    }
  };
  walk(path.join(ROOT, 'src'));
  return found;
}

function iconRules(used) {
  const css = fs.readFileSync(path.join(FA, 'css/all.css'), 'utf8');
  const rules = [];
  const kept = new Set();

  // `.fa-nome:before { content: "\f015" }` — Font Awesome 6 usa i due punti
  // singoli, la sintassi CSS2: il pattern deve corrispondere a com'è scritto
  // nel pacchetto, non a come lo si scriverebbe oggi.
  for (const m of css.matchAll(/\.fa-([a-z0-9-]+):{1,2}before\s*\{\s*content:\s*"([^"]+)"/g)) {
    const name = 'fa-' + m[1];
    if (!used.has(name) || kept.has(name)) continue;
    kept.add(name);
    rules.push(`.${name}::before{content:"${m[2]}"}`);
  }
  return { rules, kept };
}

const used = usedIconClasses();
const { rules, kept } = iconRules(used);

const css = `/* ═══════════════════════════════════════════════════════════════════════════
   INGLY DESIGN SYSTEM · TIPOGRAFIA E ICONE INCORPORATE
   File generato da scripts/vendor-fonts.mjs — non si modifica a mano.

   Inter (SIL Open Font License 1.1) · Font Awesome Free 6 (CC BY 4.0 per le
   icone, SIL OFL 1.1 per i font, MIT per il CSS).

   Sono incorporati come data URI perché il prodotto deve funzionare senza
   rete: prima Inter arrivava da Google Fonts e le icone da un CDN, e aprendo
   il file offline non si vedeva nessuna icona.
   ═══════════════════════════════════════════════════════════════════════════ */

${[400, 500, 600, 700]
  .map(
    (w) => `@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: ${w};
  font-display: swap;
  src: ${dataUri(path.join(INTER, `inter-latin-${w}-normal.woff2`))};
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
    U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191,
    U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}`,
  )
  .join('\n\n')}

@font-face {
  font-family: 'Font Awesome 6 Free';
  font-style: normal;
  font-weight: 900;
  font-display: block;
  src: ${dataUri(path.join(FA, 'webfonts/fa-solid-900.woff2'))};
}

@font-face {
  font-family: 'Font Awesome 6 Brands';
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: ${dataUri(path.join(FA, 'webfonts/fa-brands-400.woff2'))};
}

.fa,
.fas,
.fa-solid,
.fab,
.fa-brands {
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  display: var(--fa-display, inline-block);
  font-style: normal;
  font-variant: normal;
  line-height: 1;
  text-rendering: auto;
}

.fa,
.fas,
.fa-solid {
  font-family: 'Font Awesome 6 Free';
  font-weight: 900;
}

.fab,
.fa-brands {
  font-family: 'Font Awesome 6 Brands';
  font-weight: 400;
}

.fa-fw {
  text-align: center;
  width: 1.25em;
}

.fa-lg { font-size: 1.25em; vertical-align: -0.075em; }
.fa-2x { font-size: 2em; }
.fa-3x { font-size: 3em; }

.fa-spin {
  animation: fa-spin 2s linear infinite;
}

@keyframes fa-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .fa-spin {
    animation-duration: 0s;
  }
}

/* ── Glifi usati dal prodotto (${kept.size} su oltre 2.000 disponibili) ── */
${rules.join('\n')}
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, css);

console.log(`scritto ${path.relative(ROOT, OUT)} — ${(Buffer.byteLength(css) / 1024).toFixed(0)} KB`);
console.log(`classi fa-* trovate nei sorgenti: ${used.size} · glifi incorporati: ${kept.size}`);
const missing = [...used].filter((u) => !kept.has(u)).slice(0, 12);
if (missing.length) console.log(`classi senza glifo (probabilmente modificatori o nomi non icona): ${missing.join(' ')}`);
