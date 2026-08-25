/**
 * Verifica la composizione: cosa il design system sostituisce e cosa elimina.
 * Serve a impedire che qualcuno reintroduca un layer ritirato o aggiunga un
 * nuovo override in fondo al file, che è il modo in cui il problema è nato.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { composeInglyOs } from '../scripts/compose.mjs';
import { designSystemCss } from '../src/design-system/index.mjs';

const { html } = composeInglyOs();

test('i layer di design ritirati non compaiono nel build', () => {
  const retired = [
    'INGLY v55 — DESIGN Fase 2',
    'INGLY v56 — DESIGN Fase 3',
    'INGLY v57 — DESIGN Fase 7',
    'INGLY v58 — CHROME NORMALIZATION',
    'Rifinitura premium v92',
    'BLOCCO B — Salto di qualità premium',
  ];
  for (const marker of retired) {
    assert.ok(!html.includes(marker), `il layer "${marker}" è ancora nel build`);
  }
});

test('il design system è presente una volta sola', () => {
  const occurrences = html.split('INGLY DESIGN SYSTEM v1.0').length - 1;
  assert.equal(occurrences, 1);
});

test('i CSS di icone mai usati non vengono più caricati', () => {
  for (const cdn of ['@tabler/icons-webfont', '@phosphor-icons/web', 'remixicon', 'lucide-static']) {
    assert.ok(!html.includes(cdn), `${cdn} è ancora referenziato`);
  }
});

test('il CSS storico è stratificato, il design system no', () => {
  assert.ok(html.includes('@layer legacy {'), 'il CSS storico non è dentro @layer legacy');
  const ds = designSystemCss();
  assert.ok(!ds.includes('@layer'), 'il design system non deve stare in un layer: deve vincere');
});

test('il design system definisce i token del marchio', () => {
  const ds = designSystemCss();
  for (const token of ['--ingly-cyan', '--ingly-anthracite', '--ingly-gold', '--color-primary', '--color-surface']) {
    assert.ok(ds.includes(token), `manca il token ${token}`);
  }
});

test('il ponte non lascia definizioni circolari', () => {
  // `--x: var(--x)` invalida la variabile a runtime senza errori visibili.
  const ds = designSystemCss();
  for (const m of ds.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*var\(\s*(--[a-z0-9-]+)\s*\)/gm)) {
    assert.notEqual(m[1], m[2], `definizione circolare: ${m[1]}`);
  }
});
