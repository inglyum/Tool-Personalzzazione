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
import { build } from './build.mjs';
import { designSystemCss } from '../src/design-system/index.mjs';

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

/**
 * Abbassa la priorità del CSS storico senza modificarne una riga: in cascata
 * un layer perde sempre contro il CSS non stratificato, quindi il design
 * system vince per i selettori che ridefinisce e il resto continua a valere.
 * Alternativa scartata: cospargere il design system di `!important`.
 */
const wrapInLegacyLayer = (css) => `@layer legacy {\n${css}\n}`;

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

  let { html } = build({ srcDir, overrides, drop: new Set(RETIRED_DESIGN_LAYERS) });
  for (const re of DEAD_ICON_CDNS) html = html.replace(re, '');
  return { html, manifest, retired: RETIRED_DESIGN_LAYERS.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outFile = process.argv[2] ?? 'dist/INGLY-OS.html';
  const { html, manifest, retired } = composeInglyOs();
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html);
  const delta = Buffer.byteLength(html) - manifest.sourceBytes;
  console.log(`scritto ${outFile} — ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB (${delta > 0 ? '+' : ''}${(delta / 1024).toFixed(1)} KB rispetto al v96)`);
  console.log(`layer di design ritirati: ${retired} · design system: 1`);
  console.log(`sha256: ${crypto.createHash('sha256').update(html).digest('hex')}`);
}
