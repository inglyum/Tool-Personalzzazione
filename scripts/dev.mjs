#!/usr/bin/env node
/**
 * dev.mjs — server di sviluppo senza dipendenze.
 *
 * Ricompila su richiesta invece che a ogni salvataggio: il build dura ~1 s e
 * ricostruire 9 MB a ogni tasto premuto non serve a nessuno. Ogni richiesta
 * della pagina rilegge i sorgenti, quindi basta ricaricare il browser.
 *
 *   node scripts/dev.mjs [--port 5173] [--no-watch]
 */
import http from 'node:http';
import { build } from './build.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const PORT = Number(arg('--port', 5173));
const APPS = {
  '/': { dir: 'src/legacy', title: 'INGLY OS' },
  '/admin': { dir: 'src/admin/legacy', title: 'INGLY Cloud Admin' },
};

const INDEX = `<!doctype html><meta charset="utf-8"><title>INGLY OS — dev</title>
<style>body{font:15px/1.6 system-ui;background:#0D1014;color:#fff;padding:48px;margin:0}
a{color:#00E6D2;display:block;margin:8px 0;text-decoration:none}a:hover{text-decoration:underline}</style>
<h1>INGLY OS — server di sviluppo</h1>
<a href="/app">INGLY OS</a><a href="/admin">INGLY Cloud Admin</a>`;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(INDEX);
  }
  const app = url === '/app' ? APPS['/'] : APPS[url];
  if (!app) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    return res.end('non trovato');
  }
  const started = Date.now();
  try {
    const { html } = build({ srcDir: app.dir });
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(html);
    console.log(`${app.title} ricompilato in ${Date.now() - started} ms`);
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`errore di build:\n${e.stack}`);
    console.error(e);
  }
});

server.listen(PORT, () => {
  console.log(`INGLY OS dev  →  http://localhost:${PORT}/app`);
  console.log(`Cloud Admin   →  http://localhost:${PORT}/admin`);
  console.log('Ogni ricarica del browser ricompila dai sorgenti.');
});
