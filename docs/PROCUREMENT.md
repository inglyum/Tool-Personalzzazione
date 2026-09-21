# Procurement — dal riordino all'ordine reale

`src/product/purchase-order.js` (`InglyPurchaseOrder`), `src/product/purchase-order-store.js`
(`InglyPurchaseOrderStore`). UI: `SuppliersManager` in `src/legacy/app/src/main.js`.

## Il gap che chiude

`InglyRiordino` (Fase 57) calcola da tempo, dai movimenti reali di
magazzino, quando riordinare e quanto. Da lì in poi non c'era niente: lo
store `supplier_orders`, dichiarato in `idb.js` dalla v18 («Registro ordini
fornitore»), non veniva scritto da nessuna funzione in tutto il progetto.

Misurato prima di questo lavoro, nella Gestione Fornitori:

- le card KPI «Ordini in Attesa» e «⚠️ In Ritardo» leggevano `supplier_orders`
  e mostravano **sempre zero**, su qualunque installazione, per sempre — non
  un bug che si manifesta in certi casi, una funzione che non poteva mai
  funzionare;
- il tab «Confronta» chiamava `this._renderConfronta(el)`, funzione mai
  definita in nessun file — un crash reale, mai osservato perché **nessun
  pulsante impostava mai `_tab='confronta'`**: l'header della Gestione
  Fornitori non aveva una barra di schede, solo un pulsante «← Lista mia»
  dentro la vista «Scopri Fornitori» per tornare indietro. La stessa vista
  «Scopri Fornitori» — un catalogo curato di fornitori esterni reali, completo
  e funzionante — era quindi anch'essa irraggiungibile dalla UI;
- `SuppliersManager.openOrders()` era uno stub dichiarato: `toast('Funzione
  ordini fornitore in arrivo')`.

## Un secondo difetto, trovato investigando il primo

Il pulsante «🛒 Ordine» di ogni fornitore chiamava
`SupplierIntelligence._recordOrder(s.id)` (patch
`065-ingly-os-final-roadmap-batch.js`) — un oggetto che tiene i propri
fornitori in `localStorage['ingly_suppliers_v1']`, **una memoria diversa**
da quella che la lista mostra (IDB `suppliers`, letta da
`SuppliersManager.render()`). Un id numerico (`Date.now()`) uguale per
coincidenza tra le due liste poteva far scrivere l'ordine su un fornitore
diverso da quello su cui si era davvero cliccato; se nessun record con
quell'id esisteva nell'altra memoria, `SupplierIntelligence._openModal`
apriva silenziosamente il modulo «nuovo fornitore» — cliccare «✏️ Modifica»
su un fornitore vero poteva quindi generare un secondo record fantasma con
lo stesso id, in un'altra memoria. Stessa classe di difetto di CRM-05b, su
un'entità diversa: un'identità (il fornitore) risolta nel posto sbagliato.

**Non corretto in questo giro**: unificare `SupplierIntelligence`
(localStorage, CRUD fornitore, CSV import/export, contatto WhatsApp, tutti
funzionanti) con IDB `suppliers` è un intervento sull'identità del
fornitore — lo stesso lavoro che CRM-04 ha fatto per i clienti — non sul
flusso di acquisto. Il pulsante «🛒 Ordine» ora opera **solo** sul fornitore
IDB effettivamente mostrato in lista (`SuppliersManager._nuovoOrdine`), che
è dove il problema di identità sbagliata avrebbe avuto conseguenze
economiche reali (statistiche di spesa sul fornitore sbagliato); «✏️
Modifica» e «💬 WA» restano collegati a `SupplierIntelligence`, invariati,
con lo stesso limite di prima.

## Cosa fa

`InglyPurchaseOrder` è puro, stesso schema di `machine-maintenance.js`:

- `crea(ordine)` — un ordine congelato alla nascita, righe con `itemId`,
  `quantity`, `unitCost` opzionale. Nasce in stato `attesa` — deliberatamente
  la stessa stringa che le KPI della Gestione Fornitori leggevano già da
  anni: le card diventano vere scrivendo qui, senza toccare la vista.
- `daSuggerimento(righeRiordino)` — chiude la pipeline REORDER SUGGESTION →
  PURCHASE PROPOSAL: da una riga di `InglyRiordino.elenco().righe` (solo se
  misurabile e con `daOrdinare > 0`) propone una riga d'ordine. Non produce
  un ordine da sola: manca il fornitore, che il motore di riordino non
  conosce.
- `ricevi(ordine, ricevimento)` — ricevimento totale o parziale. Le righe
  avanzano (`received`), non si riscrivono; un tentativo di ricevere più del
  residuo si taglia al residuo e lo dichiara in un avviso, non lo somma in
  silenzio. Restituisce l'ordine aggiornato **e** i movimenti da passare a
  `InglyInventory.registra` — questo modulo non scrive mai la giacenza da
  solo, per la stessa ragione per cui `machine-maintenance.js` non scrive
  mai IndexedDB: un secondo scrittore di giacenza è il difetto che questo
  progetto ha già pagato quattro volte (Fase 31).
- `punteggioFornitore(ordini)` — solo da ordini **ricevuti davvero**, mai da
  un prezzo di mercato o una recensione (nessuna storia prezzi
  multi-fornitore esiste in questo progetto). Con meno di due ricevimenti:
  `calcolabile: false`, «dati insufficienti» — un solo ordine è un punto, non
  una tendenza.
- `confronta(fornitori, ordiniPerFornitore)` — ordina i fornitori
  confrontabili per puntualità e tempo di consegna medio; chi non ha
  abbastanza storia resta in fondo, dichiarato, non sparisce e non riceve un
  punteggio inventato.

`InglyPurchaseOrderStore` è la metà che parla con IndexedDB: scrive in
`supplier_orders` (mai un secondo store), passa i movimenti di `ricevi()` a
`InglyInventory.registra` (mai una seconda scrittura di giacenza), e
ricalcola — non incrementa — le statistiche del fornitore (`totalSpent`,
`orderCount`, `lastOrder`, `avgDeliveryDays`, `avgDaysBetween`) dagli ordini
realmente ricevuti: un ricevimento parziale seguito da uno finale sullo
stesso ordine deve contare un ordine, non due.

## UI

`SuppliersManager` (Gestione Fornitori) ha ora una vera barra di tab
(«📋 Lista mia» / «🌍 Scopri fornitori» / «📊 Confronta») — prima assente, per
questo `_renderScopri` e `_renderConfronta` erano irraggiungibili. Il
pulsante «🛒 Ordine» apre un modulo reale (articolo, quantità, costo
unitario opzionale, data di consegna attesa, note) che crea un ordine vero.
Il pulsante «📦 Ordini» apre il registro (prima uno stub): elenco ordini con
stato, ritardo se la consegna attesa è passata, «✅ Segna ricevuto» (riceve
per intero le righe residue) e «✖ Annulla». Il tab «📊 Confronta» mostra la
tabella di `InglyPurchaseOrder.confronta()`.

## Cosa NON è stato fatto, e perché

| Non fatto | Perché |
| --- | --- |
| Unificare `SupplierIntelligence` e IDB `suppliers` in un'unica identità fornitore | è un intervento su un'altra area (CRM-04 applicato ai fornitori), non sul flusso di acquisto — vedi sopra |
| ~~Ricevimento parziale con quantità scelta riga per riga nella UI~~ | fatto — vedi «Rilascio 2» sotto |
| Confronto prezzi fra fornitori per lo stesso articolo | nessuna storia prezzi multi-fornitore esiste in questo progetto: un confronto prezzi onesto richiederebbe prima raccogliere quel dato, non inventarlo qui |
| Un ordine multi-riga dal modulo «🛒 Ordine» | il motore accetta più righe (`daSuggerimento` ne produce un array); la UI di creazione oggi ne accetta una per invio — più invii producono più ordini, non un limite dei dati |

## Rilascio 2 — ricevimento parziale riga per riga (2.4.0)

Il motore (`InglyPurchaseOrder.ricevi`) e lo store hanno sempre supportato
un ricevimento parziale per singola riga — era testato a unità dal primo
giorno. Solo la UI non lo esponeva: «✅ Segna ricevuto» chiamava `ricevi()`
passando **sempre l'intero residuo** di ogni riga, quindi chi riceveva tre
casse su cinque ordinate doveva forzare un «tutto ricevuto» falso (le altre
due non sarebbero mai arrivate) o aspettare l'arrivo completo prima di
registrare qualunque cosa.

Aggiunto un secondo pulsante, «✏️ Parziale», accanto al primo — non lo
sostituisce, perché ricevere tutto in un click resta il caso comune e non
deve richiedere di ritoccare ogni riga. Apre un modulo con una riga per
articolo, ciascuna con un campo quantità precompilato al **residuo di
quella riga** (non un valore condiviso) e con un tetto (`max`) che non
lascia scrivere più di quanto manca. «Conferma ricevimento» costruisce
l'elenco righe dai soli campi con una quantità maggiore di zero e lo passa
a `InglyPurchaseOrderStore.ricevi(id, {righe})` — la stessa funzione di
sempre, nessun secondo motore di ricevimento.

Un ordine ricevuto in due volte (25 di 40, poi i 15 restanti) genera due
movimenti di magazzino distinti, mai un doppio conteggio: la seconda
apertura del modulo precompila il **residuo rimasto** (15), non il totale
originale (40), perché legge `quantitaResidua()` sulla riga aggiornata
dell'ordine, non un valore salvato altrove.

**Test**: `tests/qa/ordine-fornitore-parziale.mjs` (12, browser reale) —
precompilazione per riga, due ricevimenti parziali consecutivi sullo stesso
ordine senza doppio conteggio, transizione di stato (`ricevuto_parziale` →
`ricevuto`), nessuna regressione su «✅ Segna ricevuto», persistenza dopo
un ricaricamento vero.

## Test

- `tests/purchase-order.test.mjs` — 33 unit: validazione, congelamento,
  `daSuggerimento` (misurabile → proposta, non misurabile → niente),
  scadenza, ricevimento totale/parziale/oltre-il-residuo, punteggio
  fornitore (N/D sotto la soglia minima), confronto.
- `tests/qa/ordine-fornitore.mjs` — 22 controlli in browser reale: click vero
  sul fornitore vero, KPI da zero a reali, registro non più uno stub,
  ricevimento vero con movimento di magazzino verificato nel registro,
  confronto senza crash e senza punteggio inventato con un solo ordine,
  persistenza dopo un ricaricamento vero.
