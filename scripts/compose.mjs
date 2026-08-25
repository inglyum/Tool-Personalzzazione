#!/usr/bin/env node
/**
 * compose.mjs — la composizione di INGLY OS: quali blocchi del monolite
 * vengono sostituiti, quali eliminati, e cosa prende il loro posto.
 *
 * È l'unico punto in cui si dichiara una differenza rispetto al v96. Tutto ciò
 * che non compare qui viene ricomposto identico, e `tests/roundtrip.test.mjs`
 * lo verifica.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
import { designSystemCss } from '../src/design-system/index.mjs';
import { appShellJs, RETIRED_SIDEBAR_PATCHES, SIDEBAR_HOST } from '../src/app-shell/index.mjs';

const readSrc = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* I sette layer di design accumulati fra il v54 e il v96. Il primo viene
   sostituito dall'INGLY Design System, gli altri sei spariscono: facevano le
   stesse cose (tipografia, KPI, badge, tabelle, sidebar, topbar, responsive,
   focus) in punti diversi della cascata, e vincere la cascata era diventato
   il criterio di progettazione. */
const DESIGN_LAYER_HOST = 'styles/129-ingly-v54-design-system-fase-1-fondazione-premiu.css';
const RETIRED_DESIGN_LAYERS = [
  'styles/130-ingly-v55-design-fase-2-componenti-dati-rifinitu.css',
  'styles/132-ingly-v56-design-fase-3-shell-di-navigazione-mic.css',
  'styles/133-ingly-v57-design-fase-7-mobile-responsive-touch.css',
  'styles/134-ingly-v58-chrome-normalization-topbar-sidebar-co.css',
  'styles/167-rifinitura-premium-v92-additiva-token-based-them.css',
  'styles/173-blocco-b-salto-di-qualita-premium-per-le-4-sezio.css',
];

/* Il branding white-label deve poter vincere sul design system: è la sua
   ragione d'essere. Resta fuori dal layer `legacy`. */
const UNLAYERED_STYLES = new Set(['styles/175-white-label-branding-logo-nome-colore-additivo-r.css']);

/* Cinque fogli di icone da CDN per una sola libreria effettivamente usata:
   974 riferimenti a Font Awesome, zero a Tabler, Phosphor, Remix e Lucide.
   Sono ~1,2 MB di download e quattro richieste di rete a ogni avvio, su un
   prodotto che si dichiara offline-first. */
const DEAD_ICON_CDNS = [
  /<link[^>]+@tabler\/icons-webfont[^>]*>/gi,
  /<link[^>]+@phosphor-icons\/web[^>]*>/gi,
  /<link[^>]+remixicon[^>]*>/gi,
  /<link[^>]+lucide-static[^>]*>/gi,
];

/* Inter da Google Fonts e Font Awesome da cdnjs: due richieste di rete in un
   prodotto che si apre con un doppio click. Senza connessione l'applicazione
   restava senza icone e con il font di sistema. Ora sono incorporati come data
   URI in src/design-system/assets/fonts.css. */
const EXTERNAL_FONT_TAGS = [
  /<link[^>]+fonts\.googleapis\.com[^>]*>/gi,
  /<link[^>]+fonts\.gstatic\.com[^>]*>/gi,
  /<link[^>]+font-awesome[^>]*>/gi,
  /<link[^>]+fa-solid-900\.woff2[^>]*>/gi,
];

/**
 * Abbassa la priorità del CSS storico senza modificarne una riga: in cascata
 * un layer perde sempre contro il CSS non stratificato, quindi il design
 * system vince per i selettori che ridefinisce e il resto continua a valere.
 * Alternativa scartata: cospargere il design system di `!important`.
 */
const wrapInLegacyLayer = (css) => `@layer legacy {\n${css}\n}`;

/* Il fulmine INGLY in ciano su antracite, come SVG inline. */
const INLINE_FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E" +
  "%3Crect width='32' height='32' rx='7' fill='%231F2328'/%3E" +
  "%3Cpath d='M18.6 4 9 18h5.6L13 28l9.8-14.4H17L18.6 4z' fill='%2300E6D2'/%3E%3C/svg%3E";

export function composeInglyOs({ srcDir = 'src/legacy' } = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(srcDir, 'manifest.json'), 'utf8'));
  const overrides = {};

  for (const part of manifest.parts) {
    if (part.type !== 'style' || !part.file) continue;
    if (part.file === DESIGN_LAYER_HOST) {
      overrides[part.file] = designSystemCss();
    } else if (!UNLAYERED_STYLES.has(part.file)) {
      overrides[part.file] = wrapInLegacyLayer(fs.readFileSync(path.join(srcDir, part.file), 'utf8'));
    }
  }

  overrides[SIDEBAR_HOST] = appShellJs();

  /* L'unico script ancora caricato da un CDN. Sostituito da un adattatore su
     simple-statistics, che è già vendorizzata e contiene lo stesso algoritmo. */
  overrides['external/008-block.js'] = {
    body: readSrc('src/core/vendor-shims/kmeans.js'),
    attrs: '',
  };


  const drop = new Set([...RETIRED_DESIGN_LAYERS, ...RETIRED_SIDEBAR_PATCHES]);
  let { html } = build({ srcDir, overrides, drop });
  for (const re of [...DEAD_ICON_CDNS, ...EXTERNAL_FONT_TAGS]) html = html.replace(re, '');
  html = html.replace(
    /<link rel="icon"[^>]*img\.icons8\.com[^>]*>/gi,
    '<link rel="icon" type="image/svg+xml" href="' + INLINE_FAVICON + '">',
  );
  return {
    html,
    manifest,
    retiredDesign: RETIRED_DESIGN_LAYERS.length,
    retiredSidebar: RETIRED_SIDEBAR_PATCHES.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outFile = process.argv[2] ?? 'dist/INGLY-OS.html';
  const { html, manifest, retiredDesign, retiredSidebar } = composeInglyOs();
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html);
  const delta = Buffer.byteLength(html) - manifest.sourceBytes;
  console.log(`scritto ${outFile} — ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB (${delta > 0 ? '+' : ''}${(delta / 1024).toFixed(1)} KB rispetto al v96)`);
  console.log(`layer di design ritirati: ${retiredDesign} → 1 design system`);
  console.log(`patch sidebar ritirate : ${retiredSidebar} → 1 app shell`);
  console.log(`sha256: ${crypto.createHash('sha256').update(html).digest('hex')}`);
}
