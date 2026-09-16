import path from 'node:path';
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({viewport:{width:1400,height:900}});
const p = await ctx.newPage();
p.on('pageerror', e=>console.log('PAGEERROR:', String(e.message).slice(0,200)));
p.on('console', m=>{ if(['error','warning'].includes(m.type())) console.log('['+m.type()+']', m.text().slice(0,180)); });
p.on('dialog', d=>{ console.log('DIALOG:', d.message().slice(0,150)); d.accept().catch(()=>{}); });
await p.goto('file://' + path.resolve('dist/INGLY-OS.html'), { waitUntil:'load', timeout:120000 });
await p.waitForTimeout(18000);

// stato iniziale: primo avvio o registrazione?
const s0 = await p.evaluate(() => ({
  primoAvvio: !!(window.InglyPrimoAvvio && window.InglyPrimoAvvio.serve().serve),
  haRegister: !!document.getElementById('reg-submit'),
  haSetup: !!document.getElementById('su-submit'),
  utenti: (JSON.parse(localStorage.getItem('ingly_saas_db')||'{}').users||[]).length,
}));
console.log('STATO INIZIALE', JSON.stringify(s0));

// Caso A: il percorso di PRIMO AVVIO (quello che vede chi apre il file nuovo)
if (s0.haSetup) {
  const r = await p.evaluate(async () => {
    const t0 = performance.now();
    document.getElementById('su-lab').value='Bottega Belice';
    document.getElementById('su-nome').value='Giuseppe';
    document.getElementById('su-email').value='g@belice.it';
    document.getElementById('su-pass').value='Laboratorio2026';
    document.getElementById('su-conf').value='Laboratorio2026';
    let risolto=false, errore=null;
    const pr = window.InglyPrimoAvvio.invia().then(x=>{risolto=true; return x;}).catch(e=>{errore=String(e&&e.message); risolto=true;});
    await Promise.race([pr, new Promise(r=>setTimeout(r,12000))]);
    return { risolto, errore, ms: Math.round(performance.now()-t0),
      btn: (document.getElementById('su-submit')||{}).textContent,
      btnDisabled: (document.getElementById('su-submit')||{}).disabled,
      err: (document.getElementById('su-err')||{}).textContent,
      gateVisibile: (()=>{const g=document.getElementById('saas-gate'); return g? getComputedStyle(g).display : 'assente';})(),
      utenti: (JSON.parse(localStorage.getItem('ingly_saas_db')||'{}').users||[]).length,
      sessione: !!(window.SaaSGate && window.SaaSGate._session),
    };
  });
  console.log('PRIMO AVVIO →', JSON.stringify(r,null,1));
}
await b.close();
