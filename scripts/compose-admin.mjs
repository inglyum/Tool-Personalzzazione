#!/usr/bin/env node
/** Entry point del build di INGLY Cloud Admin. La composizione sta in compose.mjs. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { composeInglyCloudAdmin } from './compose.mjs';

const outFile = process.argv[2] ?? 'dist/INGLY-CLOUD-ADMIN.html';
const { html, manifest } = composeInglyCloudAdmin();
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html);
const delta = Buffer.byteLength(html) - manifest.sourceBytes;
console.log(`scritto ${outFile} — ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB (${delta > 0 ? '+' : ''}${(delta / 1024).toFixed(1)} KB rispetto alla v1.2)`);
console.log(`sha256: ${crypto.createHash('sha256').update(html).digest('hex')}`);
