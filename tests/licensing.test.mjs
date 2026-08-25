/**
 * Il registro licenze è l'unica sorgente per OS e Admin. Questi test tengono
 * fermi gli invarianti commerciali: i piani crescono, nessuno perde funzioni
 * salendo di prezzo, e ogni feature dichiarata dal menu esiste davvero.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { FEATURES, PLANS, PLAN_ORDER, planHasFeature, sectionsForPlan, minimumPlanFor, featureMatrix } from '../src/core/licensing/features.js';
import { allItems } from '../src/app-shell/nav-map.js';

const items = allItems();

test('ogni feature richiesta dal menu esiste nel registro', () => {
  const unknown = [...new Set(items.map((i) => i.feature))].filter((f) => !(f in FEATURES));
  assert.deepEqual(unknown, [], `feature citate dal menu ma non definite: ${unknown.join(', ')}`);
});

test('ogni feature del registro è usata da almeno una sezione', () => {
  const used = new Set(items.map((i) => i.feature));
  // multimachine e api non sono sezioni: sono capacità trasversali.
  const trasversali = new Set(['multimachine', 'api']);
  const unused = Object.keys(FEATURES).filter((f) => !used.has(f) && !trasversali.has(f));
  assert.deepEqual(unused, [], `feature vendute ma non collegate a nulla: ${unused.join(', ')}`);
});

test('i piani sono cumulativi: salendo non si perde nulla', () => {
  for (let i = 1; i < PLAN_ORDER.length; i += 1) {
    const lower = PLANS[PLAN_ORDER[i - 1]].features;
    const higher = PLANS[PLAN_ORDER[i]].features;
    const lost = lower.filter((f) => !higher.includes(f));
    assert.deepEqual(lost, [], `${PLAN_ORDER[i]} perde rispetto a ${PLAN_ORDER[i - 1]}: ${lost.join(', ')}`);
  }
});

test('i prezzi crescono con il piano', () => {
  for (let i = 1; i < PLAN_ORDER.length; i += 1) {
    assert.ok(
      PLANS[PLAN_ORDER[i]].price > PLANS[PLAN_ORDER[i - 1]].price,
      `${PLAN_ORDER[i]} non costa più di ${PLAN_ORDER[i - 1]}`,
    );
  }
});

test('il piano gratuito dà accesso al gestionale e a nulla di più', () => {
  assert.deepEqual(PLANS.free.features, ['core']);
  assert.ok(!planHasFeature('free', 'ai'));
  assert.ok(!planHasFeature('free', 'market'));
});

test('enterprise include ogni capacità', () => {
  for (const f of Object.keys(FEATURES)) assert.ok(planHasFeature('enterprise', f), `enterprise non include ${f}`);
});

test('le sezioni abilitate si derivano dal menu, non da un elenco a mano', () => {
  const free = sectionsForPlan('free', items);
  const enterprise = sectionsForPlan('enterprise', items);
  assert.ok(free.includes('dashboard'));
  assert.ok(!free.includes('ai'));
  assert.equal(enterprise.length, items.length, 'enterprise deve vedere tutte le sezioni');
});

test('ogni feature ha un piano minimo da proporre in upgrade', () => {
  for (const f of Object.keys(FEATURES)) assert.ok(minimumPlanFor(f), `nessun piano include ${f}`);
});

test('la matrice di confronto copre tutti i piani', () => {
  for (const row of featureMatrix()) {
    assert.deepEqual(Object.keys(row.plans), PLAN_ORDER);
    assert.ok(row.label && row.description);
  }
});
