/**
 * Le regole che non devono più poter tornare vere nella console: credenziali
 * nel sorgente, password in chiaro, un database che nasce già accessibile.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { composeInglyCloudAdmin } from '../scripts/compose.mjs';
import { ADMIN_NAV, adminPages, plannedPages } from '../src/admin/nav-map.js';

/* I commenti spiegano cosa è stato rimosso e ne citano i nomi: vanno tolti
   prima di cercare, altrimenti il test scatta sulla propria documentazione. */
const stripComments = (js) => js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const engine = stripComments(
  fs.readFileSync('src/admin/legacy/patches/003-engine-enterprise-database-demo-data.js', 'utf8'),
);

test('nessuna credenziale master nel sorgente', () => {
  assert.ok(!/MASTER_CREDENTIALS/.test(engine), 'il bypass con credenziali master è tornato');
  assert.ok(!/EMERGENCY BYPASS/i.test(engine));
  assert.ok(!/password\s*:\s*'admin'/.test(engine), "esiste ancora una password 'admin' nel sorgente");
});

test('il database non nasce con account già utilizzabili', () => {
  assert.ok(!/passwordHash:'admin'/.test(engine), 'il seed contiene di nuovo una password');
  assert.ok(/passwordHash:null/.test(engine), 'il super admin dovrebbe nascere senza password');
  assert.ok(/mustChangePassword:true/.test(engine), 'il primo accesso deve chiedere una password');
});

test('le password passano dal modulo credenziali', () => {
  for (const site of ['InglyAdminAuth.verify', 'InglyAdminAuth.hash', 'InglyAdminAuth.validate']) {
    assert.ok(engine.includes(site), `manca l'uso di ${site}`);
  }
  assert.ok(!/adm\.passwordHash!==p/.test(engine), 'il confronto in chiaro è tornato');
});

test('il modulo credenziali usa PBKDF2 con salt e confronto a tempo costante', () => {
  const auth = fs.readFileSync('src/admin/auth/credentials.js', 'utf8');
  assert.ok(auth.includes('PBKDF2'));
  assert.ok(auth.includes('getRandomValues'), 'il salt deve essere casuale');
  assert.ok(/diff \|= a\[i\] \^ b\[i\]/.test(auth), 'manca il confronto a tempo costante');
  assert.ok(/ITERATIONS = \d{6}/.test(auth), 'le iterazioni sembrano troppo poche');
});

test('la console si compone e include il modulo credenziali', () => {
  const { html } = composeInglyCloudAdmin();
  assert.ok(html.includes('InglyAdminAuth'), 'il modulo credenziali non è nel build');
  assert.ok(html.includes('INGLY DESIGN SYSTEM v1.0'), 'il design system non è nel build');
  assert.ok(!/MASTER_CREDENTIALS/.test(html));
});

test('la tassonomia della console copre tutte le pagine esistenti', () => {
  const markup = fs.readFileSync('src/admin/legacy/markup/001.html', 'utf8');
  const existing = [...new Set([...markup.matchAll(/id="page-([a-z-]+)"/g)].map((m) => m[1]))];
  const mapped = adminPages().map((p) => p.id);
  const missing = existing.filter((p) => !mapped.includes(p));
  assert.deepEqual(missing, [], `pagine senza posto nella tassonomia: ${missing.join(', ')}`);
});

test('le aree previste senza pagina sono dichiarate, non simulate', () => {
  const planned = plannedPages().map((p) => p.id);
  assert.ok(planned.length > 0);
  const mapped = adminPages().map((p) => p.id);
  for (const p of planned) assert.ok(!mapped.includes(p), `${p} è insieme prevista e reale`);
});

test('le sei aree della console sono quelle attese', () => {
  assert.deepEqual(
    ADMIN_NAV.map((g) => g.id),
    ['overview', 'customers', 'subscriptions', 'security', 'support', 'system'],
  );
});
