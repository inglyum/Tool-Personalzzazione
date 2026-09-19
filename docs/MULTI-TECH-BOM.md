# Multi-Tech BOM — un prodotto multi-tecnologia si dichiara una volta

`src/product/product-bom.js` (`InglyProductBOM`), `src/product/product-bom-store.js`
(`InglyProductBOMStore`). Verticale in corso, rilasciato a pezzi — questo
documento cresce con ogni release.

## Il gap che chiude

Misurato prima di questo lavoro: `product-builder.js` (il wizard a 8 passi
che scrive nel catalogo) sa dichiarare **una** tecnologia (`tech`), **un**
materiale (`material`) e un costo già calcolato una volta per tutte
(`costPrice`). Corretto per un portachiavi tagliato al laser. Non c'è modo
di dichiarare un prodotto vero come «orologio in legno + incisione laser +
stampa UV + assemblaggio»: quattro lavorazioni, materiali diversi, nessun
posto dove scriverle insieme e riusarle al prossimo ordine dello stesso
prodotto.

Verificato anche cosa esiste già, prima di costruire qualcosa di nuovo sopra
— la prima regola di analisi di questo progetto:

- `InglyOperazioni` (routing di produzione, con stato, tempi, qualità) esiste
  completo e testato, ma legge un array di operazioni che qualcuno deve
  fornirgli — oggi lo fa solo `costruisciDaOrdine`, deducendo **una sola**
  operazione dalla tecnologia singola dell'ordine.
- `material-requirement.js` sa calcolare fabbisogno/impegnato/consumato per
  un ordine, ma legge le righe da `costBreakdown.voci` — il preventivo,
  non una distinta di prodotto riusabile.
- `InglyCostEngine` sa calcolare un costo per tecnologia (profili), ma non
  aggrega mai più tecnologie sullo stesso prodotto: quell'aggregazione non
  esiste in nessun file.

## Rilascio 1 — dominio e persistenza (questa release)

`InglyProductBOM` è puro, stesso schema di `machine-maintenance.js` e
`purchase-order.js`: una distinta base per prodotto (`productId`), righe di
due tipi soli — `materiale` (articolo di magazzino + quantità per pezzo,
con uno scarto percentuale dichiarabile) e `operazione` (tecnologia +
tempo di avviamento + tempo per pezzo, **mai un solo numero**: l'anatomia
una-tantum/per-pezzo è la stessa di `InglyCostEngine`, ed è quello che
impedisce di centuplicare un avviamento di 15 minuti moltiplicandolo per
100 pezzi).

Non calcola un costo (`InglyCostEngine`), non impegna magazzino
(`material-requirement.js`), non genera un routing da solo
(`InglyOperazioni`) — **espande** le proprie righe nella forma che quei tre
motori sanno già leggere:

- `espandiMateriali(bom, quantitaOrdine)` → righe nella stessa forma di una
  voce di `costBreakdown.voci` (`category:'material'`, `itemKey`,
  `quantity`, ecc.), pronte per essere lette da `material-requirement.js`
  senza un adattatore diverso per ogni fonte.
- `espandiOperazioni(bom, quantitaOrdine)` → operazioni nella forma che
  `InglyOperazioni.normalizza` sa leggere, con `estimatedTime = avviamento
  + (tempo per pezzo × quantità)`.

`InglyProductBOMStore` scrive in `product_bom` (IDB, nuovo store, v34 —
migrazione additiva). Una distinta non si aggiorna in-place:
`salvaNuovaVersione` crea sempre una nuova versione; le versioni precedenti
restano leggibili per gli ordini che le hanno già espanse, per la stessa
disciplina di `order-snapshot.js` (il preventivo di ieri non cambia perché
la ricetta cambia oggi).

**Non ancora fatto, apposta**: nessuna UI per creare/modificare una
distinta, nessun collegamento reale a un ordine o al Product Builder. Il
dominio deve esistere, essere corretto e testato prima che qualcuno ci
costruisca sopra un pulsante — la stessa sequenza di `machine-maintenance.js`
(dominio) → `MachineCard` (UI) del verticale Manutenzione.

## Rilascio 2 — UI: creare e modificare una distinta dal catalogo

Un pulsante «🧬 Distinta base» sulla card prodotto (accanto a «✏️ Modifica
Prodotto», mai dentro quel modale — già grande e delicato, con tab Base/
B2B/Etsy/Ingly: rischiarlo per aggiungere una distinta base sarebbe stato
sbagliato) apre `Catalog.openBOM(id)`: un pannello a parte con righe di
materiale (selezionate da un vero articolo di magazzino — `items`,
`materials`, `components`, `gadgets`, gli stessi quattro archivi di
`inventory-store.js` — mai un testo libero) e di operazione (tecnologia,
avviamento, tempo per pezzo).

Salvare crea sempre una **nuova versione** (`InglyProductBOMStore.salvaNuovaVersione`):
la versione precedente resta nel registro, non si sovrascrive — coerente
con la disciplina di `order-snapshot.js`. Un difetto reale trovato e
corretto scrivendo il pannello: le righe bozza (non ancora congelate) usano
il nome di campo `quantity` (quello che `InglyProductBOM.valida`/`crea` si
aspettano in ingresso), mentre le righe già salvate portano
`quantityPerPiece` (il nome che `crea()` congela in uscita) — senza
riallineare i due nomi al caricamento, ogni salvataggio successivo al primo
falliva la validazione. Riallineato in un solo punto (`openBOM`, al
caricamento), non sparso nel resto del pannello.

## Test

- `tests/product-bom.test.mjs` — 24 unit: validazione, congelamento,
  tecnologie dichiarate (il concetto di "misto"), espansione materiali
  (compatibile con `costBreakdown`), espansione operazioni (mai un setup
  raddoppiato per pezzo, verificato anche a 100 pezzi contro 1).
- `tests/qa/distinta-base-prodotto.mjs` — 15 controlli in browser reale:
  apertura del pannello su un prodotto vero, collegamento a un materiale
  vero (non testo libero), due operazioni multi-tecnologia con l'anatomia
  avviamento/per-pezzo verificata anche nell'espansione a 20 pezzi,
  riapertura che ritrova la distinta salvata, seconda modifica che crea la
  versione 2 senza cancellare la versione 1.

## Prossimi rilasci di questo verticale

| # | Cosa | Stato |
| - | ---- | ----- |
| 1 | Dominio + persistenza (`InglyProductBOM`/-Store) | ✅ rilascio 1 |
| 2 | UI: creare/modificare una distinta da un prodotto del catalogo | ✅ rilascio 2 |
| 3 | Collegamento ordine → distinta: un ordine di quel prodotto espande la distinta in routing e fabbisogno materiali reali | ⬜ |
| 4 | Aggregazione di costo multi-tecnologia: `InglyCostEngine` legge la distinta invece di un singolo profilo, senza doppiare setup/manodopera/overhead fra le tecnologie | ⬜ |
| 5 | Percorso end-to-end verificato in browser: prodotto con distinta → ordine → routing reale → qualità → costo aggregato | ⬜ |
