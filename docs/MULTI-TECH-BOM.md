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

## Rilascio 3 — collegamento ordine → distinta: routing reale

Un ordine entra in produzione senza routing in due punti soli del codice
(verificato con `grep`, non dedotto): la transizione automatica di stato
(`WorkflowSync.transition`, quando lo stage passa a uno di produzione) e
l'apertura a mano del Pannello Produzione (`GestioneOrdini.openProductionPanel`).
Entrambi chiamavano `InglyOperazioni.costruisciDaOrdine`, che deduce **una
sola** operazione dalla tecnologia singola dell'ordine — corretto per un
prodotto senza distinta, sbagliato per uno che ne ha una multi-tecnologia.

Aggiunta `InglyProductBOMStore.routingDaOrdine(ordine)`: se l'ordine ha
**una sola riga** che porta un `catalogId` con una distinta corrente con
almeno una riga di lavorazione, espande quella distinta
(`InglyProductBOM.espandiOperazioni`) sulla quantità realmente ordinata e
restituisce un routing con una operazione per lavorazione dichiarata,
avviamento e tempo per pezzo già separati com'è nella distinta. In ogni
altro caso restituisce `null`, e chi chiama ricade sulla deduzione
esistente — nessun comportamento cambia per un ordine senza distinta
collegata.

**Una funzione sola, non due copie**: la stessa decisione serve sia a
`WorkflowSync.transition` (042) sia a `openProductionPanel` (052). Le due
patch chiamano `routingDaOrdine` invece di duplicare la logica ciascuna per
conto proprio — la stessa classe di difetto già vista con CRM-05b (due copie
della stessa lettura che divergono alla prima modifica fatta su una sola)
qui evitata alla radice, mettendo la decisione in un solo posto della
persistenza (`product-bom-store.js`, che già parla con IDB) invece che nei
due punti UI che la consumano.

**Ancora non fatto, apposta**: il fabbisogno materiali reale
(`InglyProductBOM.espandiMateriali` → `material-requirement.js`) resta per
il rilascio successivo — mescolare in questo stesso rilascio una modifica al
routing (rischio basso: nessun numero economico cambia) con una al
fabbisogno/costo (rischio più alto, su un file — `quote-to-order.js`/il
cost engine — con una storia documentata di difetti critici sui totali)
avrebbe reso più difficile isolare un eventuale problema.

Riga 6 della tabella finale, aggiunta durante il rilascio 3, non nella
scomposizione originale: `InglyFabbisogno` (`material-requirement.js`)
esiste, è testato, e **non ha nessun punto di consumo nel codice** —
verificato con `grep`, zero occorrenze fuori dal proprio file. Collegarlo
alla distinta richiederebbe anche costruire la sua prima UI, non solo un
nuovo lettore: un lavoro più grande della sola aggregazione di costo
(rilascio 4), quindi separato invece di infilato nello stesso rilascio.

## Rilascio 4 — il costo aggregato di una distinta multi-tecnologia

`InglyCostEngine` preventiva **una** tecnologia alla volta, con un profilo
che conosce i suoi driver fisici — grammi e filamento per il 3D, potenza e
velocità di taglio per il laser. Farlo leggere una distinta con più
tecnologie avrebbe voluto dire inventare un profilo combinato dentro il file
con la storia di difetti critici sui totali più lunga di questo codice
(`quote-to-order.js`/il cost engine stesso) — il rischio più alto possibile
per il guadagno più incerto. Non toccato.

Aggiunto invece `src/product/bom-cost.js` (`InglyBOMCost`), puro come
`product-bom.js`: aggrega quello che la distinta **già dichiara** — tempo di
ogni operazione (avviamento + tempo per pezzo, mai l'uno moltiplicato per
la quantità come l'altro) e quantità di ogni materiale — a tariffe che
arrivano già risolte da chi lo chiama (oraria macchina, oraria manodopera di
ripiego, costo unitario materiale). Non calcola overhead, imballo o
spedizione: sono costi dell'ordine, non della lavorazione, e li somma chi
consuma il risultato — una volta sola sull'ordine, mai una volta per
tecnologia.

Una voce senza tariffa o costo noto non entra nel totale e non genera un
numero inventato: il risultato dichiara `completo:false` e la lista di che
cosa manca, con un motivo — la stessa disciplina N/D del resto del motore.

**Ancora non fatto, apposta**: nessun collegamento a un ordine reale, nessuna
UI. Le tariffe (macchina/manodopera/materiale) oggi vivono in tre posti
diversi (`InglyMachineCost`, `InglyCostProfiles`, il magazzino) e risolverle
per un ordine vero richiede IDB — un orchestratore asincrono, sullo stesso
modello di `InglyProductBOMStore.routingDaOrdine` del rilascio 3, che è
lavoro del rilascio 5 insieme al percorso end-to-end in browser.

## Rilascio 5 — l'orchestratore reale: distinta → routing → costo → ordine

L'ultimo pezzo del percorso: `InglyProductBOMStore.costoDaOrdine(ordine)`,
il primo punto di questo verticale che parla **sia** con i motori puri
(`InglyProductBOM`, `InglyBOMCost`) **sia** con IndexedDB per davvero,
risolvendo le tariffe che il rilascio 4 aveva lasciato ai chiamanti:

- oraria macchina — `equipment` (IDB) → `InglyMachineCost.daCatalogo`
  (`machineCostPerHour`, mai `fullMachineCostPerHour`: l'overhead della
  macchina non si somma qui, altrimenti si sommerebbe una seconda volta
  quando l'ordine applica il suo overhead di laboratorio);
- oraria manodopera di ripiego, per una lavorazione senza macchina propria
  (assemblaggio a mano, finitura) — `InglyCostProfilesStore.ingresso()`,
  la stessa fonte che il preventivatore già usa;
- costo materiale — `inventory_ledger` (IDB) → `InglyInventoryCostResolver`,
  lo stesso resolver che valorizza le righe di un preventivo, non un secondo
  modo di leggere il magazzino.

La stessa domanda «questa distinta è applicabile a questo ordine?» che il
rilascio 3 aveva isolato in una funzione sola (`routingDaOrdine`) è stata
estratta un livello più su (`_bomApplicabile`), condivisa anche da
`costoDaOrdine`: un ordine per cui il routing viene dalla distinta è lo
stesso ordine per cui il costo viene dalla distinta, mai una decisione
diversa fra i due.

**Dove si vede**: il pannello «Preventivato · Reale · Scostamento» di un
ordine (`InglyOrderEconomics.pannelloConsuntivo`, già esistente dal mandato
Ordini §16-17) mostra ora, quando applicabile, una riga «📐 Secondo la
distinta» col costo per pezzo e le tecnologie coinvolte — **non** il
preventivato (congelato al cliente, non cambia) e **non** il reale (misurato
a mano dall'operatore, in `InglyActualCost`): un terzo numero, «cosa dice
la distinta tecnica che dovrebbe costare», utile quando il preventivo era
nato da un profilo a singola tecnologia e il prodotto ne dichiara più d'una.
Non scrive niente da solo — è puramente informativo, e un ordine senza
distinta collegata non lo vede: il pannello si comporta esattamente come
prima.

**Protezione doppio conteggio**, verificata esplicitamente: richiamare
`costoDaOrdine` più volte sullo stesso ordine dà lo stesso identico
risultato (nessun accumulo); una distinta con N righe genera esattamente N
voci di costo, mai una per lettura; due lavorazioni sulla stessa macchina
mantengono la tariffa oraria ma applicano ciascuna il proprio tempo, mai
una tariffa già usata sommata di nuovo.

**Ancora non fatto, apposta**: il costo dalla distinta non scrive mai nei
campi «Registra com'è andata» (`cost_entries`/`InglyActualCost`) — quei
campi restano una misura, non una stima, e riempirli in automatico
confonderebbe le due cose. Un pulsante «usa questo valore» che li
pre-compili lasciando all'operatore la conferma è un'estensione naturale,
non fatta qui per restare nello scopo di questo rilascio.

## Rilascio 6 — fabbisogno materiali reale, nel Pannello Produzione

Verificato con `grep` prima di scrivere codice: `InglyFabbisogno`
(`material-requirement.js`, Fase 31/32) esiste, è testato, e **non ha mai
avuto un consumatore** — zero occorrenze fuori dal proprio file in tutto il
codice. E anche con un consumatore leggerebbe solo `costBreakdown.voci` (il
preventivo), mai la distinta di un prodotto.

Aggiunta `InglyProductBOMStore.fabbisognoDaOrdine(ordine)`, sullo stesso
schema di `routingDaOrdine`/`costoDaOrdine` (stessa `_bomApplicabile`,
condivisa fra le tre): espande i materiali della distinta sulla quantità
ordinata (`InglyProductBOM.espandiMateriali`, scarto già compreso) e legge
la giacenza attuale da `inventory_ledger` (`InglyInventoryLedger.ricostruisci`
— lo stesso registro, non un secondo modo di leggere il magazzino). Non
impegna niente, non scrive niente: dice solo se un ordine potrebbe partire
subito con quello che c'è oggi sullo scaffale.

**Dove si vede**: una nuova sezione «🧱 Materiali necessari» nel Pannello
Produzione, sorella di quella Qualità — stesso pattern, stesso file
(`_materialiHTML` accanto a `_qualitaHTML`). Un ordine senza distinta
applicabile non la vede: nessuna regressione.

**Ancora non fatto, apposta**: questo è «quanto serve a questo ordine»
contro «quanto c'è oggi», non «quanto è davvero disponibile dopo aver
tolto quello che gli altri ordini aperti hanno già impegnato» — quel conto
esiste già in `InglyFabbisogno.impegnato(ordini)`, ma aggregato sul vecchio
percorso (`costBreakdown`). Incrociarlo con la distinta per un fabbisogno
realmente al netto degli impegni di tutti gli ordini aperti è un rilascio a
sé: mescolarlo qui avrebbe reso questo rilascio più grande e più difficile
da isolare in caso di problemi.

## Rilascio 7 — consumo materiale reale: ORDER → OPERAZIONE COMPLETATA → LEDGER → COSTO REALE

Chiude il percorso richiesto esplicitamente: un'operazione completata deve
consumare davvero il materiale, non solo dichiarare buoni/scarti/rifacimenti.

Verificato prima di scrivere codice (niente di nuovo inventato): il
registro di magazzino ha già un solo scrittore, `InglyInventory.registra`
(`inventory-store.js`) — «non legge-modifica-scrive: **aggiunge** un
movimento e poi ricalcola» — con scorciatoie tipizzate (`consuma`, `scarta`,
`acquista`...) e tipi di riferimento già pronti (`PRODUCTION`, `ORDER`) nel
registro puro (`inventory-ledger.js`). Nessun secondo sistema di scrittura
creato: `InglyProductBOMStore.consumaDaOperazione` chiama esattamente
`InglyInventory.registra`, come farebbe qualunque altro modulo.

**Il punto d'ingresso non è nuovo**: è la stessa registrazione qualità
(`_registraQualita`, patch 052) che già scrive buoni/scarti/rifacimenti
sull'operazione dal rilascio Quality (1.4.0). Non un secondo pulsante, un
secondo passo della stessa azione.

**Idempotenza senza un identificativo esterno**: la quantità già consumata
per un'operazione si tiene su `ordine.production.materialConsumption[opId].
processedQty` (non sull'operazione stessa — `InglyOperazioni.normalizza` la
ricostruisce con uno schema fisso, un campo in più lì sparirebbe alla
prossima lettura). Ogni registrazione consuma solo la **differenza** fra il
nuovo totale (buoni + scarti + rifacimenti — un pezzo scartato ha comunque
consumato il materiale del tentativo) e quello già consumato. Registrare
due volte lo stesso totale dà una differenza di zero: non si scrive nessun
movimento, non serve un `completionId` passato da fuori — lo stato «cosa è
già stato fatto» vive nell'ordine, non in una chiave che qualcuno potrebbe
sbagliare a costruire.

**Completamento parziale**: 4 pezzi oggi, 6 domani — due registrazioni,
due movimenti di consumo, ciascuno per la differenza, mai per il totale
ricalcolato da capo (che avrebbe consumato due volte i primi 4).

**Costo reale**: oltre al materiale (valorizzato con lo stesso resolver del
costo tecnico — `InglyInventoryCostResolver`, mai un secondo modo di
leggere un prezzo), la stessa registrazione accumula su `operazione.
actualCost`/`actualTime` il costo di lavorazione per il delta appena
lavorato — stessa tariffa (macchina o manodopera) e stesso tempo per pezzo
che la distinta dichiara per quella tecnologia, mai sull'intero storico.
`InglyProductBOMStore.consumoRealeDaOrdine` rilegge questi due numeri (dal
registro vero, non da un totale calcolato altrove) e li mostra nel pannello
Preventivato·Reale·Scostamento come «🏭 Consumo reale registrato» — un
quarto numero, distinto da preventivato (congelato), da «secondo la
distinta» (stima tecnica) e dal consuntivo a mano: questo è misurato, non
stimato.

**Ancora non fatto, apposta**: nessuna scrittura automatica nei campi
manuali del consuntivo (`cost_entries`/`InglyActualCost`) — quei campi
restano una misura a mano, distinta da questa misura automatica; nessuna
gestione di rollback multi-fase oltre a quanto `InglyInventory.registra`
già garantisce (un movimento scritto è definitivo, append-only — non è mai
stato possibile né necessario "annullare" un movimento in questo registro,
solo registrarne uno di segno opposto se serve una rettifica).

## Rilascio 8 — fabbisogno netto: quanto impegnano GLI ALTRI ordini aperti

Chiude il gap che il Rilascio 6 (2.0.0) rimandava esplicitamente: fino a
qui `fabbisognoDaOrdine` diceva solo «quanto c'è oggi sullo scaffale»
contro «quanto serve a questo ordine» — due ordini aperti che chiedono lo
stesso materiale potevano risultare *entrambi* «disponibile», perché
ciascuno veniva verificato da solo.

`_impegnatoAltriOrdini(ordine, IDB)` legge tutti gli ordini, esclude
`ordine` stesso, e per ognuno degli altri **aperti** (stessa definizione di
`InglyFabbisogno.apertoPerImpegno` più il controllo "routing tutto chiuso
non impegna più" — lo stesso motore usato da `InglyFabbisogno.impegnato`,
non una seconda regola) somma il suo fabbisogno per articolo:

- un ordine aperto **con distinta** contribuisce espandendo la sua
  distinta (`Motore.espandiMateriali`, lo stesso di `fabbisognoDaOrdine`);
- un ordine aperto **senza distinta** ma con un preventivo collegato
  contribuisce tramite `InglyFabbisogno.daOrdine` (il motore esistente,
  dalla Fase 31/32, che leggeva `costBreakdown.voci` e non aveva mai avuto
  un consumatore — verificato con `grep`, zero occorrenze fuori dal
  proprio file prima di questo rilascio).

Ogni ordine impegna per **una sola** via, mai per entrambe: un ordine con
distinta non passa anche dal preventivo, altrimenti lo stesso impegno
verrebbe contato due volte.

`fabbisognoDaOrdine` resta con lo stesso contratto di prima — nessuna
regressione — e aggiunge tre campi per riga, puramente additivi:
`impegnatoAltri`, `disponibileNetto` (`giacenza − impegnatoAltri`),
`sufficienteNetto` (`disponibileNetto ≥ quantity`). Il pannello Produzione
mostra la riga netta solo quando `impegnatoAltri > 0` — un ordine da solo
sul suo materiale non vede niente di nuovo.

**Non impegna, non scrive**: come il Rilascio 6, questa è ancora una
lettura. Nessun movimento, nessuna prenotazione persistita — il numero
si ricalcola ogni volta dagli ordini aperti correnti, quindi non può
disallinearsi da loro.

**Ancora non fatto, apposta**: nessun ordinamento per priorità fra ordini
concorrenti (chi arriva prima, chi ha la consegna più vicina) — il pannello
dice "non basta per tutti", non decide chi vince; quella è una scelta
commerciale, non un fatto di magazzino.

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
- `tests/qa/bom-routing-ordine.mjs` — 12 controlli in browser reale: un
  ordine reale che transita a "working" riceve il routing dalla distinta
  (due operazioni, laser + uv, coi tempi giusti a 20 pezzi), una transizione
  successiva non lo ricostruisce, un ordine senza distinta collegata si
  comporta esattamente come prima (nessuna regressione), il Pannello
  Produzione aperto a mano genera lo stesso routing senza passare da una
  transizione, e tutto resta dopo un ricaricamento vero della pagina.
- `tests/bom-cost.test.mjs` — 12 unit: tempo in minuti convertito in ore
  alla tariffa macchina, anatomia avviamento/per-pezzo (una tantum identico
  a 1 e a 100 pezzi, costo per pezzo che cala), ripiego sulla manodopera
  quando la macchina non ha tariffa, nessuna tariffa nota → nessun numero
  inventato, materiali risolti/non risolti, due tecnologie sommate senza
  doppiare, overhead/imballo/spedizione esclusi, tre test dedicati di
  protezione doppio conteggio (idempotenza, una voce per riga, tariffa non
  sommata due volte sulla stessa macchina).
- `tests/qa/multitech-bom-e2e.mjs` — 18 controlli in browser reale, il
  percorso completo: prodotto con distinta a **tre** tecnologie (stampa 3D
  + laser, con macchina; assemblaggio a mano, senza) → ordine vero →
  Pannello Produzione (routing reale, tre operazioni nell'ordine giusto) →
  `costoDaOrdine` con tariffe risolte da IDB vere (equipaggiamento, profili
  economici, registro di magazzino) → pannello Preventivato·Reale·
  Scostamento (mostra «Secondo la distinta», il preventivo del cliente non
  cambia) → ricaricamento vero (tutto resta identico) → un ordine senza
  distinta non regredisce (nessuna sezione mostrata).
- `tests/qa/multitech-material-reservation.mjs` — 8 controlli in browser
  reale: un prodotto con due materiali (uno abbondante, uno scarso), un
  ordine piccolo per cui entrambi bastano, uno grande per cui il materiale
  scarso non basta più (e lo dice con il numero esatto che manca), un
  ordine senza distinta che non mostra la sezione, persistenza dopo un
  ricaricamento vero.
- `tests/qa/multitech-actual-consumption.mjs` — 24 controlli in browser
  reale: completamento parziale (3 buoni + 1 scarto = 4 pezzi) che scrive
  un movimento di consumo vero e riduce la giacenza esattamente di quanto
  consumato; la stessa registrazione ripetuta due volte non scrive un
  secondo movimento né raddoppia il costo (verificato sia dal click reale
  sia da una chiamata diretta a `consumaDaOperazione`); il completamento
  dei 6 pezzi rimanenti aggiunge un secondo movimento per la sola
  differenza; il costo reale dell'operazione cresce in proporzione, mai
  ricalcolato da capo; il pannello ordine mostra «Consumo reale
  registrato»; un ordine senza distinta non consuma nulla (nessuna
  regressione); tutto resta dopo un ricaricamento vero.
- `tests/qa/multitech-material-net-availability.mjs` — 9 controlli in
  browser reale: un ordine da solo sul suo materiale non vede nessun
  impegno (nessuna regressione rispetto al rilascio 6); un secondo ordine
  aperto sullo stesso materiale fa apparire l'impegno su **entrambi**, in
  entrambe le direzioni, e il netto che non basta più; un ordine consegnato
  con lo stesso materiale non impegna niente; un ordine senza distinta ma
  con un preventivo collegato allo stesso materiale impegna comunque,
  dalla via del motore esistente (`InglyFabbisogno.daOrdine`), sommandosi
  correttamente a quello della distinta senza doppiare; tutto resta dopo
  un ricaricamento vero.

## Prossimi rilasci di questo verticale

| # | Cosa | Stato |
| - | ---- | ----- |
| 1 | Dominio + persistenza (`InglyProductBOM`/-Store) | ✅ rilascio 1 |
| 2 | UI: creare/modificare una distinta da un prodotto del catalogo | ✅ rilascio 2 |
| 3 | Collegamento ordine → distinta: un ordine di quel prodotto espande la distinta in routing reale | ✅ rilascio 3 |
| 4 | Aggregazione di costo multi-tecnologia (`InglyBOMCost`, dominio puro) | ✅ rilascio 4 |
| 5 | Orchestratore reale (`costoDaOrdine`, IDB) + percorso end-to-end verificato in browser: prodotto con distinta → ordine → routing reale → costo aggregato → pannello ordine | ✅ rilascio 5 |
| 6 | Fabbisogno materiali reale dalla distinta, con giacenza dal registro di magazzino, nel Pannello Produzione | ✅ rilascio 6 |
| 7 | Consumo materiale reale a operazione completata (parziale, idempotente, scarto compreso) → registro di magazzino → costo reale sull'operazione → pannello ordine | ✅ rilascio 7 |
| 8 | Fabbisogno al netto degli impegni di **tutti** gli ordini aperti (incrociare `fabbisognoDaOrdine` con `InglyFabbisogno.impegnato`/`.daOrdine`), non solo di questo ordine | ✅ rilascio 8 |
| 9 | Un modo per portare il costo reale nel consuntivo misurato (`cost_entries`), con conferma dell'operatore — mai automatico | ⬜ |
| 10 | Collegare la Qualità al percorso: un'operazione dedotta dalla distinta multi-tecnologia propone comunque una non conformità con scarto/rifacimento | ✅ già vero dal rilascio 1.4.0 — verificato: `_registraQualita` chiama `InglyQualityNCR.daOperazione` sulla stessa operazione normalizzata indipendentemente da dove viene il routing |
