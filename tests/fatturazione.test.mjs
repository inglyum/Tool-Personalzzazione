/* Il confine con chi incassa. La regola che questi test difendono è una
   sola: niente, in questo prodotto, può dichiarare pagato un abbonamento
   senza un riferimento del fornitore. Un pagamento finto non è un pagamento
   incompleto — è un buco con l'aspetto di una funzione. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const MODULI = ['plan-catalog.js', 'subscription.js', 'auth-identity.js',
  'device-sessions.js', 'account-service.js', 'billing.js'];

function carica(link) {
  const store = new Map([['ingly_saas_db', '{}']]);
  if (link) store.set('ingly_stripe_links', JSON.stringify(link));
  const aperti = [];
  const ctx = {
    console, crypto: globalThis.crypto, TextEncoder, Buffer,
    navigator: { userAgent: 'Chrome/130.0 Windows NT 10.0', platform: 'Win32' },
    open: (u) => { aperti.push(u); return null; },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
    },
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of MODULI) {
    vm.runInContext(fs.readFileSync(new URL('../src/product/' + f, import.meta.url), 'utf8'), ctx);
  }
  return {
    ctx, F: ctx.InglyFatturazione, C: ctx.InglyAccount, A: ctx.InglyAbbonamento, aperti,
    db: () => JSON.parse(store.get('ingly_saas_db') || '{}'),
    scrivi: (d) => store.set('ingly_saas_db', JSON.stringify(d)),
  };
}

async function conWorkspace(link) {
  const h = carica(link);
  const r = await h.C.crea({
    nome: 'Giuseppe', laboratorio: 'INGLY', email: 'g@ingly.it',
    password: 'Laboratorio2026', conferma: 'Laboratorio2026', termini: true,
  }, {});
  assert.equal(r.ok, true, r.motivo);
  return Object.assign(h, { tenant: r.tenant.id, utente: r.utente });
}

/* ── Il fornitore ───────────────────────────────────────────────────────── */

test('senza link configurati non esiste nessun fornitore predefinito', () => {
  const { F } = carica();
  assert.equal(F.fornitore(), null);
  assert.equal(F.configurato(), false);
});

test('i link configurati definiscono il fornitore', () => {
  const { F } = carica({ premium_monthly: 'https://pay.example/premium' });
  assert.equal(F.configurato(), true);
  assert.equal(F.link('premium', 'monthly'), 'https://pay.example/premium');
});

/* ── Chiedere di pagare non è pagare ────────────────────────────────────── */

test('senza fornitore si dice la verità e non si attiva niente', async () => {
  const { F, tenant, db } = await conWorkspace();
  const r = F.richiedi('premium', 'monthly', { tenant_id: tenant });
  assert.equal(r.ok, false);
  assert.equal(r.via, 'contatto');
  assert.match(r.motivo, /non è ancora configurato/);
  assert.equal(db().subscriptions[0].status, 'trial', 'ha attivato un piano senza pagamento');
});

test('con fornitore si apre la pagina di pagamento, e l\'abbonamento non cambia', async () => {
  const { F, tenant, db, aperti } = await conWorkspace({ premium_monthly: 'https://pay.example/p' });
  const r = F.richiedi('premium', 'monthly', { tenant_id: tenant });
  assert.equal(r.ok, true);
  assert.equal(r.via, 'fornitore');
  assert.equal(aperti[0], 'https://pay.example/p');
  assert.equal(db().subscriptions[0].status, 'trial', 'ha attivato prima del pagamento');
  assert.equal(db().billing_requests.length, 1, 'la richiesta non è tracciata');
});

test('un piano o una periodicità che non esistono non producono una richiesta', async () => {
  const { F, tenant, db } = await conWorkspace({ premium_monthly: 'https://pay.example/p' });
  assert.equal(F.richiedi('inventato', 'monthly', { tenant_id: tenant }).ok, false);
  assert.equal(F.richiedi('premium', 'settimanale', { tenant_id: tenant }).ok, false);
  assert.equal((db().billing_requests || []).length, 0);
});

/* ── Solo un evento del fornitore attiva ────────────────────────────────── */

const EVENTO = {
  id: 'evt_1', type: 'checkout.completed', provider: 'stripe',
  provider_subscription_id: 'sub_stripe_1', plan_id: 'premium', billing_interval: 'monthly',
};

test('un evento completo attiva l\'abbonamento', async () => {
  const { F, tenant, db } = await conWorkspace();
  const r = F.applica(Object.assign({}, EVENTO, { tenant_id: tenant }));
  assert.equal(r.ok, true, r.motivo);
  const sub = db().subscriptions[0];
  assert.equal(sub.status, 'active');
  assert.equal(sub.plan_id, 'premium');
  assert.equal(sub.provider, 'stripe');
  assert.equal(sub.provider_subscription_id, 'sub_stripe_1');
});

test('un evento senza riferimento del fornitore viene rifiutato', async () => {
  const { F, tenant, db } = await conWorkspace();
  for (const manca of ['id', 'provider', 'provider_subscription_id', 'tenant_id']) {
    const ev = Object.assign({}, EVENTO, { tenant_id: tenant });
    delete ev[manca];
    const r = F.applica(ev);
    assert.equal(r.ok, false, 'accettato un evento senza ' + manca);
    assert.ok(r.mancanti.includes(manca));
  }
  assert.equal(db().subscriptions[0].status, 'trial');
});

test('un tipo di evento sconosciuto non fa niente', async () => {
  const { F, tenant, db } = await conWorkspace();
  const r = F.applica(Object.assign({}, EVENTO, { tenant_id: tenant, type: 'qualcosa.altro' }));
  assert.equal(r.ok, false);
  assert.equal(db().subscriptions[0].status, 'trial');
});

test('lo stesso evento due volte non fa due cose', async () => {
  const { F, tenant, db } = await conWorkspace();
  const ev = Object.assign({}, EVENTO, { tenant_id: tenant });
  assert.equal(F.applica(ev).ok, true);
  const fine = db().subscriptions[0].current_period_end;

  const due = F.applica(ev);
  assert.equal(due.ok, true);
  assert.equal(due.ripetuto, true, 'ha riapplicato lo stesso evento');
  assert.equal(db().subscriptions[0].current_period_end, fine, 'ha regalato un periodo');
  assert.equal(db().billing_events.length, 1);
});

test('un rinnovo ripetuto non regala un mese', async () => {
  const { F, tenant, db } = await conWorkspace();
  F.applica(Object.assign({}, EVENTO, { tenant_id: tenant }));
  const r1 = F.applica(Object.assign({}, EVENTO, { tenant_id: tenant, id: 'evt_2', type: 'invoice.paid' }));
  assert.equal(r1.ok, true, r1.motivo);
  const fine = db().subscriptions[0].current_period_end;
  F.applica(Object.assign({}, EVENTO, { tenant_id: tenant, id: 'evt_2', type: 'invoice.paid' }));
  assert.equal(db().subscriptions[0].current_period_end, fine);
});

test('un pagamento fallito mette in sospeso, non caccia fuori', async () => {
  const { F, A, tenant, db } = await conWorkspace();
  F.applica(Object.assign({}, EVENTO, { tenant_id: tenant }));
  const r = F.applica(Object.assign({}, EVENTO, {
    tenant_id: tenant, id: 'evt_3', type: 'invoice.payment_failed',
  }));
  assert.equal(r.ok, true, r.motivo);
  const st = A.stato(db().subscriptions[0]);
  assert.equal(st.stato, 'past_due');
  assert.equal(st.accesso, true, 'una carta rifiutata ha chiuso fuori il cliente');
});

test('ogni evento applicato lascia una traccia in audit', async () => {
  const { F, tenant, db } = await conWorkspace();
  F.applica(Object.assign({}, EVENTO, { tenant_id: tenant }));
  assert.ok(db().audit_log.some((v) => v.action === 'billing.attiva'));
});

test('un evento per un workspace che non esiste non tocca gli altri', async () => {
  const { F, db } = await conWorkspace();
  const r = F.applica(Object.assign({}, EVENTO, { tenant_id: 'ws_inventato' }));
  assert.equal(r.ok, false);
  assert.equal(db().subscriptions[0].status, 'trial');
  assert.equal((db().billing_events || []).length, 0);
});

/* ── Disdetta e riattivazione: nessun denaro, nessun fornitore ──────────── */

test('la disdetta non toglie l\'accesso: lo fa finire alla scadenza', async () => {
  const { F, A, tenant, db } = await conWorkspace();
  const r = F.disdici(tenant, { attore: 'utente' });
  assert.equal(r.ok, true, r.motivo);
  const sub = db().subscriptions[0];
  assert.equal(sub.status, 'cancelled');
  assert.equal(sub.cancel_at_period_end, true);
  assert.equal(A.stato(sub).accesso, true, 'ha chiuso subito');
  assert.ok(db().audit_log.some((v) => v.action === 'subscription.cancelled'));
});

test('la disdetta funziona anche senza fornitore configurato', async () => {
  const { F, tenant } = await conWorkspace();
  assert.equal(F.configurato(), false);
  assert.equal(F.disdici(tenant, {}).ok, true, 'disdire dipendeva dal fornitore');
});

test('ripensarci dentro il periodo riporta dov\'era', async () => {
  const { F, tenant, db } = await conWorkspace();
  F.disdici(tenant, {});
  const r = F.riattiva(tenant, {});
  assert.equal(r.ok, true, r.motivo);
  const sub = db().subscriptions[0];
  assert.equal(sub.status, 'trial');
  assert.equal(sub.cancel_at_period_end, false);
  assert.equal(sub.cancelled_at, null);
});

test('riattivare fuori periodo NON regala un periodo: serve pagare', async () => {
  const { F, tenant, db, scrivi } = await conWorkspace();
  F.disdici(tenant, {});
  const d = db();
  const ieri = new Date(Date.now() - 86400000).toISOString();
  d.subscriptions[0].current_period_end = ieri;
  d.subscriptions[0].trial_end = ieri;
  scrivi(d);
  const r = F.riattiva(tenant, {});
  assert.equal(r.ok, false);
  assert.match(r.motivo, /nuovo pagamento/);
  assert.equal(db().subscriptions[0].status, 'cancelled');
});

test('non si riattiva un abbonamento che non è disdetto', async () => {
  const { F, tenant } = await conWorkspace();
  assert.equal(F.riattiva(tenant, {}).ok, false);
});

/* ── Cambio di piano ────────────────────────────────────────────────────── */

test('salire di piano richiede un pagamento, e non attiva niente da solo', async () => {
  const { F, tenant, db } = await conWorkspace();
  const r = F.cambiaPiano(tenant, 'business', 'monthly', {});
  assert.equal(r.servePagamento, true);
  assert.equal(r.ok, false, 'ha cambiato piano senza pagamento');
  assert.equal(db().subscriptions[0].plan_id, 'premium');
});

test('scendere di piano si applica al rinnovo, non subito', async () => {
  const { F, tenant, db } = await conWorkspace();
  /* Prima si diventa paganti, tramite il fornitore. */
  F.applica({ id: 'evt_a', type: 'checkout.completed', tenant_id: tenant, provider: 'stripe',
    provider_subscription_id: 's1', plan_id: 'business', billing_interval: 'monthly' });
  assert.equal(db().subscriptions[0].plan_id, 'business');

  const r = F.cambiaPiano(tenant, 'standard', 'monthly', {});
  assert.equal(r.ok, true, r.motivo);
  const sub = db().subscriptions[0];
  assert.equal(sub.plan_id, 'business', 'ha tolto subito funzioni già pagate');
  assert.equal(sub.pending_plan_id, 'standard');
  assert.ok(db().audit_log.some((v) => v.action === 'subscription.plan_scheduled'));
});

test('un piano sconosciuto non si programma', async () => {
  const { F, tenant } = await conWorkspace();
  assert.equal(F.cambiaPiano(tenant, 'inventato', 'monthly', {}).ok, false);
});

/* ── Nessuna scorciatoia nel sorgente ───────────────────────────────────── */

test('nel modulo non esiste una riga che scrive «active» senza un fornitore', () => {
  const src = fs.readFileSync(new URL('../src/product/billing.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal(/status\s*:\s*['"]active['"]/.test(src), false,
    'qualcuno ha scritto «active» a mano in billing.js');
  assert.equal(/simula|fake|mock|finto/i.test(src), false,
    'un adattatore finto è entrato nel percorso di produzione');
});
