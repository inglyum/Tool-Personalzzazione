/**
 * machine-maintenance.test.mjs — una macchina più usurata costa di più.
 *
 * §17 del mandato di completamento: "Una macchina con più usura deve poter
 * produrre un costo operativo differente." Prima di questo modulo,
 * `InglyMachineRate` sapeva solo il budget annuo preventivato — una macchina
 * mai manutenuta e una appena revisionata costavano identico all'ora. Questi
 * test provano che ora non è più così, e che il modulo non inventa una
 * scadenza quando l'intervallo di manutenzione non è dichiarato.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, Date });
vm.runInContext(fs.readFileSync('src/product/machine-rate.js', 'utf8'), contesto);
vm.runInContext(fs.readFileSync('src/product/machine-maintenance.js', 'utf8'), contesto);
const R = contesto.InglyMachineRate;
const M = contesto.InglyMachineMaintenance;

const MACCHINA = {
  id: 'm1', purchasePrice: 5000, expectedLifeHours: 10000,
  annualMaintenance: 1200, expectedAnnualHours: 1500,
  maintenanceIntervalHours: 500,
};

test('validazione', async (t) => {
  await t.test('un intervento senza tipo non è valido', () => {
    assert.equal(M.valida({ machineId: 'm1', hoursAtService: 10 }).valido, false);
  });
  await t.test('un intervento senza macchina non è valido', () => {
    assert.equal(M.valida({ type: 'PREVENTIVA', hoursAtService: 10 }).valido, false);
  });
  await t.test('un intervento senza ore macchina non è valido', () => {
    assert.equal(M.valida({ type: 'PREVENTIVA', machineId: 'm1' }).valido, false);
  });
  await t.test('un intervento completo è valido', () => {
    assert.equal(M.valida({ type: 'PREVENTIVA', machineId: 'm1', hoursAtService: 10 }).valido, true);
  });
});

test('la nascita di un intervento', async (t) => {
  await t.test('congela il record: non si modifica dopo', () => {
    const i = M.crea({ type: 'PREVENTIVA', machineId: 'm1', hoursAtService: 100, laborCost: 50 });
    assert.throws(() => { i.laborCost = 0; });
  });
  await t.test('i ricambi si somminano nel costo totale', () => {
    const i = M.crea({
      type: 'CORRETTIVA', machineId: 'm1', hoursAtService: 200, laborCost: 30,
      parts: [{ name: 'cinghia', cost: 15 }, { name: 'lente', cost: 45 }],
    });
    assert.equal(i.partsCost, 60);
    assert.equal(i.totalCost, 90);
  });
  await t.test('un tipo sconosciuto non produce un record', () => {
    assert.equal(M.crea({ type: 'BOH', machineId: 'm1', hoursAtService: 1 }), null);
  });
});

test('lo stato di manutenzione', async (t) => {
  await t.test('senza intervallo dichiarato, non è calcolabile — non si inventa', () => {
    const s = M.stato({ id: 'm2' }, [], 900);
    assert.equal(s.calcolabile, false);
    assert.equal(s.confidence, 'missing');
    assert.match(s.motivo, /nessun intervallo/);
  });

  await t.test('appena manutenuta: usura vicina a zero', () => {
    const interventi = [M.crea({ type: 'PREVENTIVA', machineId: 'm1', hoursAtService: 1000 })];
    const s = M.stato(MACCHINA, interventi, 1010);
    assert.equal(s.calcolabile, true);
    assert.ok(s.usura < 0.05, 'appena 10 ore su 500 di intervallo');
    assert.equal(s.stato, 'ok');
  });

  await t.test('vicina alla scadenza all\'80% dell\'intervallo', () => {
    const interventi = [M.crea({ type: 'PREVENTIVA', machineId: 'm1', hoursAtService: 1000 })];
    const s = M.stato(MACCHINA, interventi, 1000 + 420); // 420/500 = 0.84
    assert.equal(s.stato, 'vicina');
  });

  await t.test('scaduta oltre l\'intervallo', () => {
    const interventi = [M.crea({ type: 'PREVENTIVA', machineId: 'm1', hoursAtService: 1000 })];
    const s = M.stato(MACCHINA, interventi, 1000 + 600);
    assert.equal(s.stato, 'scaduta');
    assert.ok(s.usura > 1);
  });

  await t.test('un\'ispezione non azzera l\'usura: solo la preventiva lo fa', () => {
    const interventi = [
      M.crea({ type: 'PREVENTIVA', machineId: 'm1', hoursAtService: 1000 }),
      M.crea({ type: 'ISPEZIONE', machineId: 'm1', hoursAtService: 1400 }),
    ];
    const s = M.stato(MACCHINA, interventi, 1450);
    /* L'ultima preventiva resta quella a 1000h, non l'ispezione a 1400h:
       450 ore trascorse su 500 di intervallo, non 50. */
    assert.ok(Math.abs(s.oreTrascorse - 450) < 0.0001);
  });

  await t.test('senza nessuna preventiva registrata, l\'usura si stima dalle ore totali', () => {
    const s = M.stato(MACCHINA, [], 600);
    assert.equal(s.calcolabile, true);
    assert.equal(s.confidence, 'estimated');
    assert.ok(Math.abs(s.oreTrascorse - 600) < 0.0001);
  });
});

test('la tariffa effettiva — il punto centrale del §17', async (t) => {
  await t.test('una macchina appena manutenuta costa quanto quella preventivata', () => {
    const interventi = [M.crea({ type: 'PREVENTIVA', machineId: 'm1', hoursAtService: 1000 })];
    const eff = M.tariffaEffettiva(MACCHINA, interventi, 1005);
    const base = R.tariffa(MACCHINA);
    assert.equal(eff.euroOra, base.euroOra);
    assert.equal(eff.sovrapprezzoManutenzione, 0);
  });

  await t.test('una macchina scaduta di manutenzione costa più all\'ora di una appena manutenuta', () => {
    const recente = [M.crea({ type: 'PREVENTIVA', machineId: 'm1', hoursAtService: 1000 })];
    const scaduta = [M.crea({ type: 'PREVENTIVA', machineId: 'm1', hoursAtService: 1000 })];
    const tariffaRecente = M.tariffaEffettiva(MACCHINA, recente, 1010);       // 10h dopo
    const tariffaScaduta = M.tariffaEffettiva(MACCHINA, scaduta, 1000 + 1000); // il doppio dell'intervallo
    assert.ok(tariffaScaduta.euroOra > tariffaRecente.euroOra,
      `scaduta (${tariffaScaduta.euroOra} €/h) deve costare più di recente (${tariffaRecente.euroOra} €/h)`);
  });

  await t.test('il sovrapprezzo non supera il tetto ×3 sulla sola componente di manutenzione', () => {
    const interventi = [M.crea({ type: 'PREVENTIVA', machineId: 'm1', hoursAtService: 0 })];
    /* Usura estrema: 20 volte l'intervallo dichiarato. */
    const eff = M.tariffaEffettiva(MACCHINA, interventi, 500 * 20);
    const base = R.tariffa(MACCHINA);
    const manutenzioneBaseComponente = base.componenti.manutenzione;
    assert.ok(eff.sovrapprezzoManutenzione <= manutenzioneBaseComponente * 2 + 0.01,
      'il sovrapprezzo non può superare (tetto − 1) × la componente di manutenzione base');
  });

  await t.test('l\'ammortamento non è toccato dall\'usura — solo la manutenzione', () => {
    const interventi = [M.crea({ type: 'PREVENTIVA', machineId: 'm1', hoursAtService: 0 })];
    const eff = M.tariffaEffettiva(MACCHINA, interventi, 5000);
    assert.equal(eff.componenti.ammortamento, R.tariffa(MACCHINA).componenti.ammortamento);
  });

  await t.test('tariffa dichiarata a mano: l\'usura non la cambia', () => {
    const manuale = Object.assign({}, MACCHINA, { machineRateMode: 'manuale', machineHourlyRate: 7 });
    const interventi = [M.crea({ type: 'PREVENTIVA', machineId: 'm1', hoursAtService: 0 })];
    const eff = M.tariffaEffettiva(manuale, interventi, 5000);
    assert.equal(eff.euroOra, 7);
  });

  await t.test('l\'assunzione del sovrapprezzo è dichiarata, non silenziosa', () => {
    const interventi = [M.crea({ type: 'PREVENTIVA', machineId: 'm1', hoursAtService: 0 })];
    const eff = M.tariffaEffettiva(MACCHINA, interventi, 900);
    assert.ok(eff.assunzione && eff.assunzione.length > 10);
  });
});

test('allerta manutenzione', async (t) => {
  await t.test('elenca solo le macchine scadute o vicine, non quelle a posto', () => {
    const macchine = [
      Object.assign({}, MACCHINA, { id: 'a', name: 'A appena revisionata' }),
      Object.assign({}, MACCHINA, { id: 'b', name: 'B scaduta' }),
      { id: 'c', name: 'C senza intervallo dichiarato' },
    ];
    const interventi = [
      M.crea({ type: 'PREVENTIVA', machineId: 'a', hoursAtService: 990 }),
      M.crea({ type: 'PREVENTIVA', machineId: 'b', hoursAtService: 0 }),
    ];
    const oreCorrenti = { a: 1000, b: 1000, c: 1000 };
    const lista = M.allerta(macchine, interventi, oreCorrenti);
    const ids = lista.map((r) => r.machineId);
    assert.ok(ids.includes('b'), 'la macchina scaduta deve comparire');
    assert.ok(!ids.includes('a'), 'la macchina appena revisionata non deve comparire');
    assert.ok(!ids.includes('c'), 'la macchina senza intervallo dichiarato non si inventa in allerta');
  });

  await t.test('ordina dalla più scaduta alla meno scaduta', () => {
    const macchine = [
      Object.assign({}, MACCHINA, { id: 'x' }),
      Object.assign({}, MACCHINA, { id: 'y' }),
    ];
    const interventi = [
      M.crea({ type: 'PREVENTIVA', machineId: 'x', hoursAtService: 0 }),
      M.crea({ type: 'PREVENTIVA', machineId: 'y', hoursAtService: 0 }),
    ];
    const lista = M.allerta(macchine, interventi, { x: 1000, y: 1500 }); // x: usura 2, y: usura 3
    assert.equal(lista[0].machineId, 'y', 'y è più scaduta e deve venire prima');
  });
});
