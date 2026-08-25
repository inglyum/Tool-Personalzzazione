/**
 * Dataset di prova per la QA visiva.
 *
 * Vive nei test, non nel prodotto: serve a vedere come si comportano dashboard
 * e work center quando il laboratorio ha davvero ordini, macchine e materiali.
 * L'applicazione non contiene nessun dato di esempio — a schermo compare solo
 * ciò che l'utente ha inserito.
 */
export const SEED = {
  equipment: [
    { id: 'eq1', name: 'xTool P2S', brand: 'xTool', model: 'P2S', tech: 'CO₂', workArea: '600×308', costBuy: 4200, lifeYears: 6, powerW: 55, status: 'attiva', materials: 'legno, acrilico, cuoio' },
    { id: 'eq2', name: 'Fiber 30W', brand: 'Cloudray', model: 'MP-30', tech: 'Fibra/MOPA', workArea: '175×175', costBuy: 3100, lifeYears: 8, powerW: 500, status: 'in lavoro', materials: 'metallo, alluminio anodizzato' },
    { id: 'eq3', name: 'Bambu Lab P1S', brand: 'Bambu Lab', model: 'P1S', tech: '3D FDM', workArea: '256³', costBuy: 850, lifeYears: 5, powerW: 350, status: 'attiva', materials: 'PLA, PETG, ABS' },
    { id: 'eq4', name: 'Pressa DTF 40×60', brand: 'Secabo', model: 'TC7', tech: 'DTF', costBuy: 1200, lifeYears: 8, powerW: 1800, status: 'manutenzione', materials: 'film PET, cotone' },
    { id: 'eq5', name: 'WonderPress Mug', brand: 'WonderPress', model: 'MP-11', tech: 'Sublimazione', costBuy: 320, lifeYears: 6, powerW: 350, status: 'attiva', materials: 'tazze, tessuto poliestere' },
  ],
  orders: [
    { id: 'o1', title: 'Targhe premiazione 40 pz', clientName: 'ASD Panormus', tech: 'CO₂', material: 'MDF 3mm', qty: 40, total: 236, status: 'in_lavorazione', dueDate: iso(-2), createdAt: iso(-9) },
    { id: 'o2', title: 'Portachiavi inciso', clientName: 'Bar Centrale', tech: 'laser', material: 'Acrilico 3mm', qty: 150, total: 885, status: 'aperto', dueDate: iso(0), createdAt: iso(-4) },
    { id: 'o3', title: 'Placche numeriche hotel', clientName: 'Hotel Ortigia', tech: 'Fibra', material: 'Alluminio anodizzato', qty: 62, total: 1240, status: 'in_lavorazione', dueDate: iso(1), createdAt: iso(-6) },
    { id: 'o4', title: 'Espositori da banco', clientName: 'Pasticceria Costa', tech: '3D FDM', material: 'PETG nero', qty: 12, total: 348, status: 'aperto', dueDate: iso(4), createdAt: iso(-1) },
    { id: 'o5', title: 'Prototipo supporto', clientName: 'Studio Vinci', tech: '3d', material: 'PLA', qty: 3, total: 96, status: 'aperto', dueDate: iso(6), createdAt: iso(-1) },
    { id: 'o6', title: 'T-shirt evento 120 pz', clientName: 'Comune di Noto', tech: 'DTF', material: 'Film PET 60cm', qty: 120, total: 1440, status: 'in_lavorazione', dueDate: iso(2), createdAt: iso(-3) },
    { id: 'o7', title: 'Tazze bomboniera', clientName: 'Wedding Aurora', tech: 'sublimazione', material: 'Tazze 325ml', qty: 80, total: 720, status: 'aperto', dueDate: iso(-1), createdAt: iso(-11) },
    { id: 'o8', title: 'Insegna retroilluminata', clientName: 'Osteria del Molo', tech: 'Stampa UV', material: 'Plexi 5mm', qty: 1, total: 640, status: 'aperto', dueDate: iso(8), createdAt: iso(-2) },
    { id: 'o9', title: 'Riordino gadget', clientName: 'Farmacia Sud', total: 210, status: 'aperto', dueDate: iso(12), createdAt: iso(-1) },
    { id: 'o10', title: 'Targa consegnata', clientName: 'Studio Rizzo', tech: 'CO₂', total: 180, status: 'delivered', dueDate: iso(-20), createdAt: iso(-30) },
  ],
  sales: [
    { id: 's1', date: iso(-3), amount: 1240, status: 'pagato', clientName: 'Hotel Ortigia', description: 'Placche numeriche' },
    { id: 's2', date: iso(-8), amount: 885, status: 'pagato', clientName: 'Bar Centrale', description: 'Portachiavi' },
    { id: 's3', date: iso(-12), amount: 640, status: 'da_pagare', clientName: 'Osteria del Molo', description: 'Insegna' },
    { id: 's4', date: iso(-15), amount: 320, status: 'da_pagare', clientName: 'Farmacia Sud', description: 'Gadget' },
    { id: 's5', date: iso(-40), amount: 1980, status: 'pagato', clientName: 'Comune di Noto', description: 'Fornitura evento' },
    { id: 's6', date: iso(-46), amount: 760, status: 'pagato', clientName: 'ASD Panormus', description: 'Targhe' },
  ],
  items: [
    { id: 'i1', name: 'MDF 3mm 600×400', category: 'Legno', unit: 'fogli', quantity: 42, minStock: 20, costPrice: 1.8, supplier: 'Legnami Sud' },
    { id: 'i2', name: 'Acrilico trasparente 3mm', category: 'Plastica', unit: 'fogli', quantity: 4, minStock: 10, costPrice: 7.4, supplier: 'PlexiSicilia' },
    { id: 'i3', name: 'Film PET DTF 60cm', category: 'Consumabili DTF', unit: 'm', quantity: 0, minStock: 30, costPrice: 0.9, supplier: 'Burger Print' },
    { id: 'i4', name: 'Tazze sublimazione 325ml', category: 'Blank', unit: 'pz', quantity: 18, minStock: 50, costPrice: 0.95, supplier: '2Stamp' },
    { id: 'i5', name: 'PLA nero 1kg', category: 'Filamenti', unit: 'kg', quantity: 6, minStock: 3, costPrice: 17, supplier: 'Bambu Lab' },
    { id: 'i6', name: 'Alluminio anodizzato 1mm', category: 'Metallo', unit: 'fogli', quantity: 0, minStock: 8, costPrice: 12.5, supplier: 'MetalSud' },
    { id: 'i7', name: 'Polvere adesiva DTF', category: 'Consumabili DTF', unit: 'kg', quantity: 2, minStock: 2, costPrice: 14, supplier: 'Burger Print' },
  ],
  catalog: [
    { id: 'c1', name: 'Portachiavi inciso MDF', category: 'Gadget', costPrice: 1.45, salePrice: 5.9, sku: 'PK-MDF' },
    { id: 'c2', name: 'Targa premiazione', category: 'Targhe', costPrice: 4.2, salePrice: 14.5, sku: 'TG-01' },
    { id: 'c3', name: 'Tazza personalizzata', category: 'Sublimazione', costPrice: 2.6, salePrice: 9, sku: 'MUG-01' },
    { id: 'c4', name: 'T-shirt DTF 1 stampa', category: 'Tessile', costPrice: 6.8, salePrice: 12, sku: 'TS-DTF' },
    { id: 'c5', name: 'Espositore PETG', category: 'Stampa 3D', costPrice: 21, salePrice: 29, sku: 'EX-3D' },
    { id: 'c6', name: 'Placca hotel alluminio', category: 'Targhe', costPrice: 5.9, salePrice: 20, sku: 'PL-AL' },
  ],
  clients: [
    { id: 'cl1', name: 'Hotel Ortigia', company: 'Ortigia Srl', email: 'info@hotelortigia.it' },
    { id: 'cl2', name: 'Comune di Noto', company: 'Comune di Noto', email: 'protocollo@comune.noto.sr.it' },
    { id: 'cl3', name: 'Bar Centrale', company: 'Centrale Snc', email: 'barcentrale@pec.it' },
  ],
  suppliers: [
    { id: 'sp1', name: 'Burger Print', company: 'Burger Print Srl', email: 'ordini@burger-print.it' },
    { id: 'sp2', name: '2Stamp', company: '2Stamp', email: 'info@2stamp.it' },
  ],
  quotes: [
    { id: 'q1', title: 'Fornitura targhe 2026', clientName: 'Hotel Ortigia', total: 2400, status: 'inviato' },
    { id: 'q2', title: 'Gadget fiera', clientName: 'ASD Panormus', total: 780, status: 'inviato' },
  ],
  settings: [{ key: 'main', machineCost: 0.35, laborCost: 0.5, markup: 45, vat: 22, companyName: 'INGLY Lab' }],
};

function iso(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Scrive il dataset negli store dell'applicazione, dentro la pagina. */
export function seedScript(seed) {
  return `(async () => {
    const data = ${JSON.stringify(seed)};
    for (const [store, rows] of Object.entries(data)) {
      for (const row of rows) { try { await window.IDB.put(store, row); } catch (e) {} }
    }
    try { window.AppStore && Object.keys(data).forEach((s) => window.AppStore.invalidate(s)); } catch (e) {}
    return true;
  })()`;
}
