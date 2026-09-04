# ORDERS — centro operativo unico

Esito del consolidamento. Ogni numero è misurato, non stimato.
La mappa delle dipendenze da cui è partito è in `docs/ORDERS-AUDIT.md`.

---

## 1. Store trovati

Erano **tre**, non due.

| Store | Dove | Ruolo prima | Ruolo dopo |
|-------|------|-------------|-----------|
| `orders` | IndexedDB | canonico | **canonico, unico** |
| `pipeline` | IndexedDB | specchio letto in preferenza | vista derivata da `orders` |
| `ingly_orders_pro_v1` | localStorage | archivio indipendente | sorgente di migrazione, non più scritto |

Più due store di supporto che copie non contenevano e restano dov'erano:
`workflow_steps` (configurazione delle fasi) e `order_events` (timeline).

## 2. Source of truth

`orders`. Era già la scelta della Fase 3; mancava che tutti la rispettassero.

## 3. Il difetto che pesava di più

Non era `pipeline`. Era il terzo archivio.

`OrderTracker` teneva i suoi ordini in `localStorage`, con stati propri, e
`orders` non li vedeva. Ci si arrivava per due strade:

- l'import CSV/XLSX degli ordini (patch 084);
- **la conferma di un preventivo Laser B2B** (patch 094), che creava l'ordine
  lì e scriveva `orderId` sul preventivo.

Un ordine nato da un preventivo Laser B2B **non compariva in Ordini**. Non era
perso: era in un secondo cassetto che nessuna vista apriva.

## 4. Dipendenze pipeline

17 punti di scrittura in 7 file. La maggior parte era già innocua: patch 046
intercetta `IDB.put('pipeline')` e lo dirotta su `orders`, e `getAll('pipeline')`
proietta da `orders`. La pipeline era già una vista — con due buchi:

- **l'intercettore aveva una via d'uscita che perdeva i dati.** Se l'ordine non
  esisteva, scriveva nello store `pipeline` legacy, che le letture non
  restituiscono: la scrittura riusciva e il record non era più raggiungibile.
  Ora ogni scrittura finisce in `orders` — se l'ordine c'è si fonde, se non c'è
  si crea. Una vista non ha un archivio proprio in cui far sparire le cose.
- **il quoter ci specchiava i preventivi** con `_sourceId` uguale all'id del
  *preventivo*. L'intercettore cercava un ordine con quell'id: o non lo trovava
  (record perso come sopra), o — se quell'id apparteneva per caso a un ordine
  vero — **fondeva i dati del preventivo dentro quell'ordine**. Specchio rimosso.

E una lettura sbagliata: `PipelineOS.render()` usava `pipeline` **in preferenza**
a `orders` quando conteneva almeno un record. Non era un fallback, era una
seconda sorgente di verità che prevaleva.

## 5. Dipendenze workflow

`workflow_steps` conteneva già solo configurazione (`id`, `label`, `color`,
`group`, `order`), non copie di ordini: `OrderFlow.stages()` lo legge,
`_addStage` / `_updateStageLabel|Color|Group` lo scrivono. Nessun intervento.

`order_events` era già la timeline unica. La nuova vista Timeline lo **legge**;
non ne crea un secondo.

## 6. Funzioni migrate

Da «Workflow Overview» (`workflow_dashboard`), verificate una per una prima di
toglierne l'accesso:

| Funzione | Dove vive ora |
|----------|---------------|
| Diagramma di flusso per fase (conteggi + valore) | Ordini → Analytics |
| KPI (aperti, in ritardo, in produzione, venduto) | Ordini → Analytics |
| Alert ordini incoerenti | Ordini → Analytics, «Coerenza ordini → vendite» |
| **Repair Sync** | Ordini → Analytics, delega a `WorkflowSync.repair()` |

Il Repair non è reimplementato: chiama lo stesso motore di prima.

## 7. Funzioni deprecate

Nessuna funzione è stata eliminata. Tre **sezioni** sono diventate viste:

| Sezione | Ora | Rotta |
|---------|-----|-------|
| `workflow_dashboard` «Pianificazione lavori» | Ordini → Analytics | alias, valida |
| `kanban` | Ordini → Kanban | alias, valida |
| `order_tracker` «Avanzamento ordini» | Ordini → Lista | alias, valida |

Le rotte restano: chi ci arriva da un collegamento vecchio viene portato alla
sezione giusta **e alla vista giusta**, così il clic non perde la sua intenzione.

## 8. Record migrati

Migrazione `src/core/migrations/orders-pro-to-orders.js`, sulla stessa disciplina
di quella pipeline: funzione pura che decide senza scrivere, checkpoint prima di
toccare qualcosa, contrassegno scritto **solo dopo** che la verifica dei conteggi
è passata. Lo store legacy non viene mai svuotato.

Due regole di deduplica, diverse fra loro:

1. **`quoteId`** — un preventivo genera un solo ordine. Se `orders` conosce già
   quel `quoteId`, il record legacy è lo stesso ordine visto dall'altro cassetto.
2. **`_migratoDa`** — una seconda esecuzione non riscrive ciò che la prima ha
   già portato.

Misurato su cento record misti (40 nuovi, 30 già migrati, 30 con preventivo già
collegato): 40 scritti, 60 saltati con motivo, verifica passata.
Sulla pagina vera, con due ordini nel terzo archivio: 2 migrati, stati tradotti,
`quoteId` conservato, e dopo una ricarica sono ancora 2 — non 4.

## 9. Quote → Order

Il campo `quoteId` sopravvive alla migrazione e alla creazione. Un preventivo
confermato produce **un solo** `orderId`, sia che passi dal percorso canonico sia
che passi da quello Laser B2B, che ora scrive nello stesso archivio.

## 10. Difetto trovato strada facendo: `updateOrderStatus`

Patch 092 riavvolgeva la funzione dichiarata SSOT perdendo tre cose in silenzio:

1. **il terzo argomento `opts`** — `opts.note` non finiva mai nello storico, e
   `opts.skipSale` non arrivava: la vendita automatica scattava anche quando il
   chiamante aveva chiesto di non crearla;
2. **il valore di ritorno** — `GestioneOrdini.transition()` riceveva `undefined`,
   quindi `QuickStats.update()` e `SidebarBadges.update()` non venivano **mai**
   eseguiti dopo un cambio di stato;
3. **l'attesa** — l'originale è `async`; la prima nota si registrava prima che
   l'ordine fosse salvato.

E, sotto, un quarto: `PrimaNota.register` come identificativo nudo si legava alla
`const PrimaNota` della patch 059, che quel metodo non ce l'ha. Lanciava un
`TypeError`, invisibile solo perché nessuno attendeva la funzione. Emerso appena
il `await` è stato messo — la suite QA l'ha fatto fallire subito.

## 10-bis. FatturaPA stava per restare senza porta

Il generatore `FatturaDaOrdine` (XML FatturaPA per SDI) aveva **una sola** via
d'accesso: un bottone «📄 Fattura» iniettato nelle righe di «Avanzamento
ordini» trecento millisecondi dopo ogni render. Ritirare quella sezione lo
avrebbe reso irraggiungibile — la perdita di funzione che il §11 vieta.

Il generatore non è stato riscritto. È stato spostato il punto da cui lo si
chiama: `GestioneOrdini._fatturaPA()`, dalla lista di Ordini.

E ne è emerso un difetto suo: dopo la generazione scriveva `status:'paid'` in
`ingly_orders_pro_v1`. **Segnava pagata una copia** che nessun'altra vista
leggeva; l'ordine vero, in `orders`, restava non pagato. Ora il passaggio a
«venduto» lo fa la funzione SSOT, che aggiorna stato, storico ed eventi.

Con questo, le scritture rimaste sul terzo archivio sono **zero**.

## 11. Duplicazione visiva rimossa

- Patch 084 iniettava, due secondi dopo il caricamento, una **seconda voce
  «📋 Ordini»** verso `order_tracker`: stessa etichetta della sezione vera, e un
  archivio diverso da leggere.
- Patch 161 metteva dentro Ordini una barra «Viste» i cui bottoni chiamavano
  `App.navigate()` — erano uscite dalla sezione, non selettori di vista. Ora la
  barra delle viste è una sola, ed è quella vera.
- La sidebar **conservava** le voci che la tassonomia non conosce, per non
  perdere quelle aggiunte dalle patch. Un alias dichiarato però non è una voce
  sconosciuta: è una rotta ritirata. Era questo a far ricomparire
  «⚡ Workflow Overview» dopo averla tolta.

## 12. Ordini — le sei viste

`Lista · Kanban · Produzione · Calendario · Timeline · Analytics`

Non sono moduli: sono selettori sullo stesso `getOrders()`, che legge `orders`.
Le prime quattro esistevano; Timeline e Analytics sono nuove.
La vista scelta si ricorda (`ingly_go_view_v1`).

## 13. Test

| Suite | Controlli |
|-------|----------|
| `tests/order-tracker-migration.test.mjs` | 21 |
| `tests/qa/orders-unified.mjs` (pagina vera) | 49 |

La suite QA copre i 19 punti del §23 e in più: scrittura sulla pipeline che
aggiorna l'ordine, scrittura su un ordine assente che non sparisce, `opts` che
arriva, `skipSale` rispettato, dodici render che non moltiplicano nulla,
attraversamento di tutte e sei le viste senza alterare l'archivio, e ricarica
della pagina con la migrazione che non si ripete.

## 14. Cosa resta legacy, e perché

Secondo il §22 nulla è stato cancellato:

- lo store `pipeline` **esiste ancora** e resta sorgente di migrazione;
- `ingly_orders_pro_v1` **resta in localStorage**, non più scritto, così una
  seconda esecuzione può accorgersi di ciò che la prima non ha visto;
- `OrderTracker`, `PipelineOS`, `WorkflowDashboard` sono ancora definiti: non
  hanno più una voce di menu, e le loro rotte portano a Ordini.

La deprecazione vera è il passo dopo, e va fatta quando i dati di chi usa il
programma sono passati per la migrazione almeno una volta.

---

## 15. Che cosa di questa direttiva **non** è stato fatto

Detto per intero, così non passa per fatto.

| § | Punto | Stato |
|---|-------|-------|
| 14 | `ProductImageField` riutilizzabile in 6 moduli | **non fatto**. Oggi l'immagine prodotto è `OrderSpecs` (patch 066), un contenitore in `localStorage` per ordine, usato da Quoter e Gestione Ordini. Non è un campo riusabile, e Apparel, Product Builder e Catalogo non lo usano. |
| 16 | Orders mostra Estimated / Actual / Variance | **non fatto**. I tre motori esistono e sono distinti (`InglyCostEngine`, `InglyActualCost`, `InglyScostamento`), ma Ordini non li affianca in una vista. |
| 17 | Inserimento dei consuntivi al completamento | **non fatto** in Ordini. Esiste nel preventivatore 3D (`p3d_consuntivo_v1`). |
| 4 | Lista con Immagine, Margine, Assegnato a, Priorità | **parziale**. La lista mostra cliente, ordine, stato, scadenza, importo e priorità come filtro; mancano colonna immagine, margine e assegnatario. |
| 6 | Vista Produzione con i filtri macchina/operatore/tecnologia | **parziale**. La vista esiste; quei filtri no. |

Queste cinque cose sono lavoro vero, non rifiniture, e vanno fatte prima di
considerare chiusa l'intera direttiva. Quello che è chiuso è il punto che la
direttiva metteva come condizione: **un ordine, un record**, e una sola
centrale che lo mostra.
