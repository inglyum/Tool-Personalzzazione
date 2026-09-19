# Changelog

Versionamento semantico. Ogni voce riflette il codice realmente presente al
commit indicato — non una roadmap, un resoconto.

## 1.3.0 — Procurement: ordine d'acquisto reale

**Nuove funzionalità**
- `src/product/purchase-order.js` (`InglyPurchaseOrder`) + `purchase-order-store.js`:
  ordine d'acquisto, dal suggerimento di riordino (`InglyRiordino`) al
  ricevimento. Il ricevimento passa i movimenti a `InglyInventory.registra`
  (mai una seconda scrittura di giacenza) e ricalcola le statistiche del
  fornitore dagli ordini realmente ricevuti.
- `SuppliersManager` (Gestione Fornitori): barra di tab reale
  («Lista mia»/«Scopri fornitori»/«Confronta»), modulo «🛒 Ordine» che crea un
  ordine vero sul fornitore IDB mostrato in lista, registro ordini
  («📦 Ordini», prima uno stub) con ricevimento e annullamento, tab
  «📊 Confronta» con punteggio fornitore da ordini ricevuti — mai un prezzo
  di mercato inventato.

**Difetti corretti**
- Le KPI «Ordini in Attesa» / «⚠️ In Ritardo» leggevano lo store IDB
  `supplier_orders`, dichiarato dalla v18 e mai scritto da nessuna funzione:
  sempre a zero, su ogni installazione. Ora scritte da un ordine vero.
- `SuppliersManager._renderConfronta` era chiamata (`this._tab==='confronta'`)
  ma mai definita — un crash reale, mai osservato perché nessun pulsante
  impostava mai quel tab (l'header non aveva una barra di schede). La stessa
  assenza rendeva irraggiungibile anche «Scopri Fornitori», una vista
  completa e funzionante.
- `SuppliersManager.openOrders()` era un `toast('...in arrivo')` dichiarato.
- Il pulsante «🛒 Ordine» chiamava `SupplierIntelligence`, che tiene i
  fornitori in un `localStorage` diverso da quello che la lista mostra (IDB
  `suppliers`) — stessa classe di CRM-05b su un'entità diversa: un id
  coincidente per caso poteva registrare l'ordine sul fornitore sbagliato, o
  aprire silenziosamente «nuovo fornitore» e creare un record fantasma con
  lo stesso id in un'altra memoria.

**Trovato, documentato, non corretto in questo giro**
- Unificare `SupplierIntelligence` (localStorage) e IDB `suppliers` in
  un'unica identità fornitore — lo stesso lavoro che CRM-04 ha fatto per i
  clienti, su un'altra entità. Tracciato in `docs/PROCUREMENT.md`.

**Test**
- `tests/purchase-order.test.mjs` (33 unit)
- `tests/qa/ordine-fornitore.mjs` (22, browser reale)

**Verificato**: 261 file sintassi, 2143/2143 unit, 85/85 suite browser QA,
0 errori JS, nessuna regressione.

## 1.2.0 — CRM Customer 360 (CRM-15 storico economico + CRM-17 timeline)

**Nuove funzionalità**
- `src/product/customer-360.js` (`InglyCustomer360`): storico economico per
  cliente su quattro finestre (30gg/90gg/anno/tutto) e timeline unificata
  (creazione cliente, preventivi con stato derivato, ordini, legame
  preventivo→ordine). Consuma `InglyOrderEconomics`/`InglyQuoteStatus`/
  `InglyCLV` — non ricalcola ricavo, costo, margine o valore cliente.
- Il pannello «Profilo cliente completo» mostra i nuovi KPI (fatturato,
  margine, tasso di conversione, valore medio ordine, storico economico,
  CLV, timeline), con N/D e motivo quando un dato non è calcolabile — mai
  un numero inventato.

**Sicurezza**
- Aggiunto `esc()` al pannello «Profilo cliente completo»: componeva l'HTML
  del popup interpolando nome/azienda/note/prodotto senza escaping —
  eseguibile da un cliente con markup nel nome (import CSV/VCF).

**Trovato, documentato, non corretto in questo giro**
- `CommHistory` (`lb2b_comm_hist_v1`, storico comunicazioni del CRM) è
  indicizzato per nome cliente, non per `clientId` — stessa classe di CRM-05b,
  su una superficie scritta dal calcolatore Laser B2B che non ha quasi mai un
  `clientId` risolto. Tracciato in `docs/CRM-ROADMAP.md`.

**Test**
- `tests/customer-360.test.mjs` (27 unit, incluso l'isolamento per clientId
  fra due clienti omonimi)
- `tests/qa/crm-customer-360.mjs` (10, browser reale)

**Verificato**: 259 file sintassi, 2110/2110 unit, 84/84 suite browser QA,
0 errori JS, nessuna regressione (un fallimento intermittente in
`apparel-scaglioni-consuntivo.mjs` root-causato come lo stesso flake
pre-esistente di `quoter3d-calcoli.mjs`, non una regressione — vedi
`docs/RELEASE-ACCOUNT-SUBSCRIPTION.md`).

## 1.1.0 → 1.2.0 (intermedio, stesso giorno) — Maintenance (§17)

- `src/product/machine-maintenance.js` (`InglyMachineMaintenance`): storico
  interventi (preventiva/correttiva/ispezione), calcolo usura/scadenza con
  confidence esplicita, tariffa macchina effettiva collegata a
  `InglyMachineRate` senza contaminare l'ammortamento.
- Integrato nella scheda macchina esistente (`MachineCard`, tab
  «Manutenzione»): card di stato, form di inserimento, allerta anche
  nell'elenco macchine.
- `tests/machine-maintenance.test.mjs` (26 unit), `tests/qa/manutenzione-macchina.mjs`
  (10, browser reale).

## 1.1.0 — CRM-05b + seguito SEC-009

- `ClientProfile.open` risolveva il cliente per nome e mostrava fatturato/
  ordini/preventivi di un altro cliente con lo stesso nome. Corretto a
  risoluzione per `clientId`.
- `InglyBilling.subscribe` e la barra di stato «INGLY v35» leggevano campi
  di sessione mai esistiti (`s.username`, `session.plan`, `.expiresAt`) —
  stessa classe SEC-009, fuori dal Cloud Sync. Corretti con gli accessor
  canonici (`InglyIdentita.idUtente`/`emailSessione`).
- Chiuso il cambio account (A→B→A, stesso browser, dati non mischiati),
  gap lasciato esplicitamente aperto nella release precedente.

Release precedenti a questa non hanno un changelog strutturato: la storia
di quel lavoro è nei documenti `docs/RELEASE-*.md` e `docs/SEC-*.md`.
