#!/usr/bin/env node
/**
 * inventory.mjs — il registro di magazzino da riga di comando.
 *
 * Serve a tre cose che l'interfaccia non fa bene:
 *
 *   · **provare** un registro senza aprire il browser, su dati inventati da
 *     chi lo prova, per capire cosa succede prima che succeda ai dati veri;
 *   · **verificare** un registro esportato da un'installazione, quando un
 *     inventario non torna e serve sapere dove;
 *   · **spiegare** un singolo movimento — «perché sono passato da 12 a 7».
 *
 * Il registro è un modulo puro: questo file lo carica e gli parla, non
 * contiene un solo calcolo di giacenza.
 *
 *   node scripts/inventory.mjs demo                      un registro d'esempio, spiegato
 *   node scripts/inventory.mjs replay <file.json>        ricostruisce le giacenze
 *   node scripts/inventory.mjs check <file.json> [--stock giacenze.json]
 *                                                       riconcilia registro e giacenze
 *   node scripts/inventory.mjs cost <file.json> <itemId> ultimo / medio / FIFO
 *   node scripts/inventory.mjs explain <file.json> <movimentoId>
 *   node scripts/inventory.mjs types                     i tipi di movimento
 *
 * I file JSON sono un array di movimenti nella forma di `InventoryTransaction`
 * — quella che l'applicazione salva nello store `inventory_ledger`.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const ctx = vm.createContext({ Math, JSON, Object, Array, String, Number, Date, parseFloat, isFinite, console });
vm.runInContext(fs.readFileSync(path.join(process.cwd(), 'src/product/inventory-ledger.js'), 'utf8'), ctx);
const L = ctx.InglyInventoryLedger;

const [, , comando, ...resto] = process.argv;
const json = process.argv.includes('--json');
const eu = (n) => (n == null ? '—' : '€ ' + (Math.round(n * 100) / 100).toFixed(2));
const q = (n) => (Math.round(n * 1000) / 1000).toString();

function leggi(f) {
  if (!f) { console.error('manca il file del registro'); process.exit(2); }
  if (!fs.existsSync(f)) { console.error('file non trovato: ' + f); process.exit(2); }
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const mov = Array.isArray(d) ? d : (d.movimenti || d.ledger || d.inventory_ledger || []);
  if (!Array.isArray(mov)) { console.error('il file non contiene un elenco di movimenti'); process.exit(2); }
  return mov;
}

/** Le chiavi articolo@deposito presenti nel registro. */
function chiavi(mov) {
  const s = new Map();
  mov.forEach((m) => {
    const k = String(m.itemId) + '@' + String(m.warehouseId || 'default');
    if (!s.has(k)) s.set(k, { itemId: String(m.itemId), warehouseId: String(m.warehouseId || 'default'), nome: m.itemName || null });
    else if (!s.get(k).nome && m.itemName) s.get(k).nome = m.itemName;
  });
  return [...s.values()];
}

const COMANDI = {

  types() {
    console.log('\nTIPI DI MOVIMENTO\n');
    Object.entries(L.TIPI).forEach(([k, v]) => {
      console.log('  ' + k.padEnd(16) + (v.segno > 0 ? ' +' : v.segno < 0 ? ' −' : ' ±') +
        '   ' + v.label + (v.valorizzato ? '' : '   (senza valorizzazione automatica)'));
    });
    console.log('\n  TRANSFER_OUT e TRANSFER_IN nascono sempre in coppia: un trasferimento');
    console.log('  registrato come movimento singolo lascia il totale giusto e i due');
    console.log('  depositi sbagliati.\n');
    console.log('  RESERVATION e RELEASE non compaiono: una prenotazione non sposta');
    console.log('  materiale, e sottrarla dalla giacenza fisica farebbe dire al');
    console.log('  magazzino che qualcosa non c\'è mentre è sullo scaffale.\n');
  },

  demo() {
    /* Il conto del capitolo 31R, costruito passo per passo. */
    const passi = [
      { type: 'OPENING_BALANCE', quantity: 100, unitCost: 1.20, note: 'giacenza al primo giorno di registro' },
      { type: 'PURCHASE', quantity: 50, unitCost: 1.35, referenceType: 'PURCHASE_ORDER', referenceId: 'ODF-2026-014', supplierId: 'legnami-sud' },
      { type: 'CONSUMPTION', quantity: 20, unitCost: 1.20, referenceType: 'ORDER', referenceId: '900123', note: 'targhe premiazione' },
      { type: 'WASTE', quantity: 5, unitCost: 1.20, note: 'fogli rigati in fase di taglio' },
      { type: 'RETURN', quantity: 3, unitCost: 1.35, referenceType: 'ORDER', referenceId: '900123' },
      { type: 'SALE', quantity: 10, unitCost: 1.20, referenceType: 'SALE', referenceId: '77' },
      { type: 'ADJUSTMENT', quantity: -2, note: 'inventario fisico: due fogli in meno' },
    ];
    let corrente = 0;
    const mov = passi.map((p, i) => {
      const m = L.crea({ ...p, id: 'demo' + String(i + 1).padStart(2, '0'), itemId: 'items:7',
        itemName: 'MDF 3mm 600×400', unit: 'fogli', warehouseId: 'default', userId: 'demo',
        timestamp: new Date(Date.UTC(2026, 0, 5 + i * 3, 9, 30)).toISOString() }, corrente);
      corrente = m.resultingQuantity;
      return m;
    });

    if (json) { console.log(JSON.stringify(mov, null, 2)); return; }

    console.log('\nREGISTRO D\'ESEMPIO — MDF 3mm 600×400, deposito predefinito\n');
    console.log('  ' + 'quando'.padEnd(12) + 'movimento'.padEnd(22) + 'qtà'.padStart(8) + '   ' +
      'da'.padStart(7) + ' →' + 'a'.padStart(8) + '   ' + 'costo'.padStart(9) + '   documento');
    console.log('  ' + '─'.repeat(96));
    mov.forEach((m) => {
      const s = L.spiega(m);
      console.log('  ' + String(m.timestamp).slice(0, 10).padEnd(12) + s.cosa.padEnd(22) +
        s.quantita.padStart(8) + '   ' + q(s.da).padStart(7) + ' →' + q(s.a).padStart(8) + '   ' +
        eu(s.valore).padStart(9) + '   ' + s.documento);
    });

    const r = L.ricostruisci(mov, 'items:7', 'default');
    console.log('  ' + '─'.repeat(96));
    console.log('  giacenza ricostruita dal registro : ' + q(r.quantity) + ' fogli');
    console.log('  movimenti                         : ' + r.movimenti + (r.valoreCompleto ? ' (tutti valorizzati)' : ''));
    console.log('  consumato davvero                 : ' + q(r.perTipo.CONSUMPTION || 0) + ' fogli');
    console.log('  perso in scarto                   : ' + q(r.perTipo.WASTE || 0) + ' fogli');

    const cu = L.costoUltimo(mov, 'items:7', 'default');
    const cm = L.costoMedioPonderato(mov, 'items:7', 'default');
    const cf = L.costoFifo(mov, 'items:7', 'default');
    console.log('\n  COSTO, letto solo dal registro');
    console.log('    ultimo costo      : ' + (cu.disponibile ? eu(cu.costo) : cu.motivo));
    console.log('    media ponderata   : ' + (cm.disponibile ? eu(cm.costo) : cm.motivo));
    console.log('    FIFO sul residuo  : ' + (cf.disponibile ? eu(cf.costo) + '  su ' + q(cf.quantitaResidua) + ' fogli' : cf.motivo));
    console.log('\n  Nessuno dei tre legge il listino corrente: se domani l\'MDF costa 1,70,');
    console.log('  questi numeri non si muovono di un centesimo.\n');
  },

  replay(f) {
    const mov = leggi(f);
    const righe = chiavi(mov).map((k) => {
      const r = L.ricostruisci(mov, k.itemId, k.warehouseId);
      return { ...k, ...r };
    }).sort((a, b) => b.movimenti - a.movimenti);

    if (json) { console.log(JSON.stringify(righe, null, 2)); return; }

    console.log('\nGIACENZE RICOSTRUITE DAL REGISTRO — ' + mov.length + ' movimenti, ' + righe.length + ' articoli\n');
    console.log('  ' + 'articolo'.padEnd(34) + 'deposito'.padEnd(12) + 'giacenza'.padStart(10) +
      'mov.'.padStart(7) + '   ' + 'valore'.padStart(11) + '   note');
    console.log('  ' + '─'.repeat(96));
    righe.forEach((r) => {
      const nome = (r.nome || r.itemId).slice(0, 32);
      const note = [
        r.discontinuita.length ? r.discontinuita.length + ' scritture fuori registro' : null,
        !r.valoreCompleto ? (r.movimenti - r.movimentiValorizzati) + ' senza costo' : null,
      ].filter(Boolean).join(' · ');
      console.log('  ' + nome.padEnd(34) + r.warehouseId.slice(0, 10).padEnd(12) +
        q(r.quantity).padStart(10) + String(r.movimenti).padStart(7) + '   ' +
        (r.valoreCompleto ? eu(r.valore) : '~' + eu(r.valore)).padStart(11) + '   ' + note);
    });
    const salti = righe.reduce((a, r) => a + r.discontinuita.length, 0);
    console.log('\n  scritture avvenute fuori dal registro: ' + salti +
      (salti ? '  ← qualcuno scrive ancora la giacenza a mano' : ' ✔'));
    console.log('');
  },

  check(f) {
    const mov = leggi(f);
    const i = process.argv.indexOf('--stock');
    const materializzate = i >= 0 ? JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8')) : [];
    const r = L.riconcilia(mov, materializzate);

    if (json) { console.log(JSON.stringify(r, null, 2)); return; }

    console.log('\nRICONCILIAZIONE — registro contro giacenze materializzate\n');
    if (!materializzate.length) {
      console.log('  nessuna giacenza da confrontare: passa --stock <file.json>');
      console.log('  (un elenco di {itemId, warehouseId, quantity, itemName})\n');
    }
    console.log('  ' + 'articolo'.padEnd(34) + 'atteso'.padStart(10) + 'trovato'.padStart(10) +
      'delta'.padStart(10) + '   stato');
    console.log('  ' + '─'.repeat(84));
    r.righe.forEach((x) => {
      const stato = x.actual == null ? 'nessuna giacenza materializzata'
        : Math.abs(x.delta) < 0.0000001 ? 'quadra'
          : (x.movimenti === 0 ? 'giacenza senza registro' : 'DIVERGE');
      console.log('  ' + String(x.itemName || x.itemId).slice(0, 32).padEnd(34) +
        q(x.expected).padStart(10) + (x.actual == null ? '—' : q(x.actual)).padStart(10) +
        (x.delta == null ? '—' : (x.delta > 0 ? '+' : '') + q(x.delta)).padStart(10) + '   ' + stato);
    });
    console.log('  ' + '─'.repeat(84));
    console.log('  articoli               : ' + r.totale);
    console.log('  divergenti             : ' + r.divergenti);
    console.log('  giacenze senza registro: ' + r.senzaRegistro);
    if (!r.quadra) {
      console.error('\n  Il registro e le giacenze non si parlano. Non correggere il registro:');
      console.error('  registra una RETTIFICA, che è un movimento nuovo e lascia traccia.\n');
      process.exit(1);
    }
    console.log('\n  registro e giacenze coincidono ✔\n');
  },

  cost(f, itemId) {
    const mov = leggi(f);
    if (!itemId) {
      console.log('\narticoli nel registro:\n');
      chiavi(mov).forEach((k) => console.log('  ' + k.itemId + (k.nome ? '  ' + k.nome : '')));
      console.log('');
      return;
    }
    const cu = L.costoUltimo(mov, itemId, null);
    const cm = L.costoMedioPonderato(mov, itemId, null);
    const cf = L.costoFifo(mov, itemId, null);
    if (json) { console.log(JSON.stringify({ itemId, ultimo: cu, medio: cm, fifo: cf }, null, 2)); return; }

    console.log('\nCOSTO DI ' + itemId + ' — letto solo dal registro\n');
    console.log('  ultimo costo    : ' + (cu.disponibile ? eu(cu.costo) + '   (movimento ' + cu.fonte + ' del ' + String(cu.quando).slice(0, 10) + ')' : cu.motivo));
    console.log('  media ponderata : ' + (cm.disponibile ? eu(cm.costo) + '   (' + cm.entrate + ' entrate, ' + q(cm.quantita) + ' unità)' : cm.motivo));
    console.log('  FIFO            : ' + (cf.disponibile ? eu(cf.costo) + '   (residuo ' + q(cf.quantitaResidua) + ' in ' + cf.lotti + ' lotti)' : cf.motivo));
    if (cf.scoperto > 0) console.log('\n  ⚠ ' + q(cf.scoperto) + ' unità uscite senza un\'entrata corrispondente nel registro:');
    if (cf.scoperto > 0) console.log('    manca un saldo di apertura, o un acquisto non è stato registrato.');
    if (cf.parziale) console.log('\n  ⚠ alcuni lotti residui non hanno un costo: il FIFO è parziale.');
    console.log('');
  },

  explain(f, id) {
    const mov = leggi(f);
    const m = mov.find((x) => String(x.id) === String(id));
    if (!m) { console.error('movimento non trovato: ' + id); process.exit(2); }
    const s = L.spiega(m);
    if (json) { console.log(JSON.stringify(s, null, 2)); return; }
    console.log('\nPERCHÉ SONO PASSATO DA ' + q(s.da) + ' A ' + q(s.a) + '\n');
    console.log('  quando     : ' + s.quando);
    console.log('  movimento  : ' + s.cosa);
    console.log('  quantità   : ' + s.quantita);
    console.log('  costo      : ' + (s.costo != null ? eu(s.costo) + ' l\'unità · ' + eu(s.valore) + ' in tutto' : 'non registrato'));
    console.log('  documento  : ' + s.documento);
    if (s.operazione) console.log('  operazione : ' + s.operazione);
    if (s.chi) console.log('  chi        : ' + s.chi);
    if (s.nota) console.log('  nota       : ' + s.nota);
    console.log('');
  },
};

if (!comando || comando === '--help' || comando === '-h' || !COMANDI[comando]) {
  console.log(fs.readFileSync(new URL(import.meta.url).pathname, 'utf8')
    .split('\n').slice(1, 27).map((r) => r.replace(/^ \*\/?ex?/, '').replace(/^ \* ?/, '').replace(/^\/\*\*/, '')).join('\n'));
  process.exit(comando && comando !== '--help' && comando !== '-h' ? 2 : 0);
}
COMANDI[comando](...resto.filter((a) => !a.startsWith('--')));
