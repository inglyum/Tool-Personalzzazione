# Changelog

Versionamento semantico. Ogni voce riflette il codice realmente presente al
commit indicato — non una roadmap, un resoconto.

## 2.5.0 — CRM-18: l'esportazione rispetta davvero la selezione

Il motore e i pulsanti di esportazione selettiva (`CRMSmart._exportSelected`/
`._exportAll`, patch 081) esistevano già — ma senza mai essere stati
verificati da un click vero: zero occorrenze in `tests/`, verificato con
`grep`, la stessa classe di difetto («dichiarato ma mai controllato dal
click vero») già trovata più volte in questo progetto.

**Verificato dal click vero, per la prima volta**: selezione di due contatti
su tre, esportazione CSV e VCF che contengono solo quei due, «Esporta
tutto» che ignora la selezione e prende tutti i contatti, la barra di
esportazione selezione che sparisce quando la selezione si svuota.

**Bug reale trovato scrivendo il test, non dalla lettura del codice**:
`_getExportData(onlySelected)` con `onlySelected=true` ma **zero** contatti
selezionati cadeva nel ramo «restituisci tutta la rubrica» invece di un
elenco vuoto — la guardia era `onlySelected && size>0`, non solo
`onlySelected`. Nella UI questo caso non è raggiungibile davvero (la barra
con «Esporta CSV/VCF selezionati» sparisce quando la selezione è vuota),
ma il ramo esisteva nel codice ed era la stessa classe di difetto che
questa voce della roadmap CRM doveva chiudere. Corretto: una selezione
vuota ora restituisce sempre un elenco vuoto.

**Test**: `tests/qa/crm-export-selezione.mjs` (11, browser reale).

**Verificato**: 267 file sintassi, 2203/2203 unit, 96/96 suite browser QA,
0 errori JS, nessuna regressione. Login admin verificato esplicitamente
prima del rilascio.

## 2.4.0 — Procurement: ricevimento parziale riga per riga

Il motore (`InglyPurchaseOrder.ricevi`) e lo store hanno sempre supportato
un ricevimento parziale per singola riga, testato a unità dal primo giorno
— mancava solo la UI: «✅ Segna ricevuto» chiamava `ricevi()` passando
sempre l'intero residuo di ogni riga, quindi chi riceveva tre casse su
cinque ordinate doveva forzare un «tutto ricevuto» falso o aspettare
l'arrivo completo.

**Nuove funzionalità**
- Nuovo pulsante «✏️ Parziale» nel registro ordini fornitore, accanto a
  «✅ Segna ricevuto» (che resta, per il caso comune di ricevere tutto in
  un click). Apre un modulo con una quantità per riga, precompilata al
  **residuo di quella riga** e con un tetto che non lascia scrivere più di
  quanto manca.
- «Conferma ricevimento» costruisce l'elenco righe dai soli campi con una
  quantità maggiore di zero e lo passa a `InglyPurchaseOrderStore.ricevi`
  — la stessa funzione di sempre, nessun secondo motore di ricevimento.
- Un ordine ricevuto in due volte genera due movimenti di magazzino
  distinti per riga, mai un doppio conteggio: la seconda apertura del
  modulo precompila il residuo rimasto, non il totale originale.

**Test**: `tests/qa/ordine-fornitore-parziale.mjs` (12, browser reale).

**Verificato**: 267 file sintassi, 2203/2203 unit, 95/95 suite browser QA,
0 errori JS, nessuna regressione (incluso il test di ricevimento totale
preesistente). Login admin verificato esplicitamente prima del rilascio.

## 2.3.0 — Multi-Tech BOM, rilascio 8: fabbisogno netto sugli ordini aperti

Chiude il gap che il rilascio 6 (2.0.0) rimandava esplicitamente nella sua
stessa documentazione: `fabbisognoDaOrdine` diceva solo «quanto c'è oggi
sullo scaffale», non «quanto ne impegnano già gli altri ordini aperti» —
due ordini per lo stesso materiale potevano risultare **entrambi**
disponibili, verificati ciascuno da solo.

**Nuove funzionalità**
- `InglyProductBOMStore._impegnatoAltriOrdini(ordine, IDB)`: somma, per
  articolo, il fabbisogno di tutti gli ALTRI ordini aperti (stessa
  definizione di aperto/chiuso di `InglyFabbisogno.impegnato` — non una
  seconda regola). Un ordine aperto con distinta contribuisce dalla sua
  distinta; un ordine aperto senza distinta ma con un preventivo collegato
  contribuisce da `InglyFabbisogno.daOrdine` — il motore esistente dalla
  Fase 31/32, che non aveva mai avuto un consumatore reale prima d'ora.
  Ogni ordine impegna per una sola via, mai per entrambe.
- `fabbisognoDaOrdine` guadagna tre campi per riga, puramente additivi,
  stesso contratto di prima: `impegnatoAltri`, `disponibileNetto`
  (giacenza meno l'impegno altrui), `sufficienteNetto`. Il pannello
  Produzione mostra la riga netta solo quando c'è un impegno da mostrare —
  un ordine da solo sul suo materiale non vede niente di nuovo.

**Non impegna, non scrive**: come il rilascio 6, resta una lettura. Nessuna
prenotazione persistita: il numero si ricalcola dagli ordini aperti
correnti, quindi non può disallinearsi da loro.

**Non ancora fatto, apposta**: nessun ordinamento per priorità fra ordini
concorrenti sullo stesso materiale scarso — il pannello dice che non basta
per tutti, non decide chi vince; è una scelta commerciale, non di
magazzino.

**Test**: `tests/qa/multitech-material-net-availability.mjs` (9, browser
reale) — copertura di entrambe le direzioni (A vede B e viceversa),
esclusione di un ordine consegnato, e del percorso via preventivo per un
ordine senza distinta.

**Verificato**: 267 file sintassi, 2203/2203 unit, 94/94 suite browser QA,
0 errori JS, nessuna regressione. Login admin verificato esplicitamente
prima del rilascio (`admin-primo-avvio.mjs`, `admin-console-accesso.mjs`).

## 2.2.0 — Multi-Tech BOM, rilascio 7: consumo materiale reale (ORDER → OPERAZIONE COMPLETATA → LEDGER → COSTO REALE)

Chiude il gap più importante rimasto nel core produttivo: un'operazione
completata ora consuma davvero il materiale dal magazzino, non solo
dichiara buoni/scarti/rifacimenti.

**Nuove funzionalità**
- `InglyProductBOMStore.consumaDaOperazione(ordine, operazione, quantitaProcessataTotale)`:
  registra il consumo reale — solo la **differenza** rispetto a quanto già
  consumato per quell'operazione (tracciata su `ordine.production.
  materialConsumption`, mai sull'operazione stessa) — tramite `InglyInventory.
  registra`, l'unico scrittore di giacenza già esistente: nessun secondo
  sistema di scrittura creato. Un pezzo scartato ha comunque consumato il
  materiale del tentativo: buoni + scarti + rifacimenti, mai solo i buoni.
  Accumula anche il costo reale (materiale dal resolver di magazzino +
  lavorazione dalla tariffa macchina/manodopera) su `operazione.actualCost`/
  `actualTime`.
- Chiamata dalla stessa registrazione qualità (`_registraQualita`, patch
  052) che già scrive buoni/scarti/rifacimenti dal rilascio Quality
  (1.4.0): non un secondo punto d'ingresso, un secondo passo dello stesso.
- `InglyProductBOMStore.consumoRealeDaOrdine(ordine)`: rilegge dal registro
  vero (non da un totale calcolato altrove) quanto è stato consumato e
  quanto costato finora. Il pannello Preventivato·Reale·Scostamento mostra
  ora «🏭 Consumo reale registrato» — un quarto numero, misurato, distinto
  dal preventivato (congelato), dal costo tecnico della distinta (una
  stima) e dal consuntivo a mano.

**Idempotenza senza un identificativo esterno**: registrare due volte lo
stesso totale processato dà una differenza di zero — nessun movimento
scritto, nessun costo raddoppiato. Verificato sia dal click reale ripetuto
sia da una chiamata diretta alla funzione con lo stesso input.

**Completamento parziale**: 4 pezzi oggi (un movimento), 6 domani (un
secondo movimento, per la sola differenza) — mai il totale ricalcolato da
capo, che avrebbe consumato due volte i primi 4.

**Difetto trovato e corretto scrivendo il test**: una riga materiale della
distinta non porta sempre `itemStore`/`itemId` separati (dipende da come è
stata creata) — solo `itemKey`. Il primo tentativo chiamava la scorciatoia
`InglyInventory.consuma(store, id, ...)`, che li richiede: con `itemKey`
soltanto, scriveva zero movimenti in silenzio. Corretto a chiamare
`InglyInventory.registra` direttamente con `itemKey` (che lo accetta), e a
derivare `store`/`itemId` dalla stessa chiave quando non dichiarati, per
tenere allineata anche la giacenza materializzata sull'archivio giusto.

**Non ancora fatto, apposta**: nessuna scrittura automatica nei campi
manuali del consuntivo (`cost_entries`) — restano una misura a mano,
distinta da questa misura automatica.

**Test**: `tests/qa/multitech-actual-consumption.mjs` (24, browser reale).

**Verificato**: 267 file sintassi, 2203/2203 unit, 93/93 suite browser QA,
0 errori JS, nessuna regressione.

## 2.1.0 — Release management: versione tracciabile in Admin, artefatti versionati

**Trovato verificando l'architettura reale prima di scrivere codice**:
nessun punto della console Admin, né del prodotto, leggeva mai la versione
di INGLY OS — il bundle finale è un file HTML statico, non un'app Node con
accesso a `package.json`. Chi amministrava l'installazione non aveva modo
di sapere quale release stesse gestendo. Nessun meccanismo equivalente
esisteva già (verificato con `grep` su "release"/"version"/"build metadata"
nell'intero `src/`): questo non sostituisce né duplica niente.

**Una sola source of truth**, non un sistema parallelo:
- `RELEASES.json` (tracciato in git, alla radice del repository) è l'unico
  registro di versione/commit/branch/build/artefatti/stato test/QA/blocker
  per ogni release. `scripts/snapshot-release.mjs` (`npm run
  release-artifacts`) lo scrive dopo che una release è verificata verde,
  senza mai cancellare le voci delle altre versioni.
- `scripts/compose.mjs` legge **la stessa** `RELEASES.json` (più
  `package.json` e git direttamente, per commit/branch/data sempre
  aggiornati anche fra due snapshot) e incorpora il risultato come
  `window.INGLY_RELEASE_INFO` nel bundle Admin al momento della build — mai
  un secondo posto che dichiara una versione diversa.

**Nuove funzionalità**
- Un badge «INGLY OS vX.Y.Z» in basso a destra nella console Admin
  (`src/admin/release-info.js`): un click mostra versione, commit, branch,
  build, quali file sono l'artefatto Product e l'artefatto Admin, stato
  test/QA e blocker noti — e dichiara esplicitamente che sottoscrizione,
  licenza e utenti live richiedono un backend non ancora collegato, mai
  dati finti al loro posto.
- `scripts/snapshot-release.mjs`: copia `dist/INGLY-OS.html` e
  `dist/INGLY-CLOUD-ADMIN.html` correnti sotto `dist/releases/<versione>/`
  come `INGLY-OS-<versione>.html` / `INGLY-CLOUD-ADMIN-<versione>.html`, e
  scrive/aggiorna `RELEASES.json`. Le copie HTML versionate restano locali
  (`dist/` non è tracciato: sono 10+ MB, riproducibili da `npm run build`
  su qualunque commit); `RELEASES.json` è la fonte di verità storica,
  apposta piccola e testuale.

**Non ancora fatto, apposta**: nessuna sezione Admin dedicata a utenti/
dispositivi/sicurezza live per-release — quelle superfici esistono già
(Postazioni aperte, Attività recente, gestione utenti, force logout,
audit di sicurezza, dal mandato Account/Abbonamento) e restano invariate;
questo rilascio aggiunge solo l'informazione di versione che mancava, senza
duplicare o spostare ciò che già c'era.

**Difetto trovato e corretto scrivendo il test**: il primo modale copriva
l'intera pagina (`position:fixed;inset:0`) sopra il badge che lo apre — un
secondo click sul badge, con il modale già aperto, non può mai raggiungerlo
davvero (l'overlay lo intercetta), esattamente come Playwright ha rilevato
per hit-testing reale. Aggiunto un pulsante di chiusura esplicito nel box;
il click fuori dal box chiude comunque.

**Secondo difetto, trovato eseguendo `npm run release-artifacts` una prima
volta**: `productArtifact`/`adminArtifact` ripiegavano su `RELEASES.json`
quando presente — ma quei campi, scritti da `snapshot-release.mjs`,
descrivono la copia **versionata** (`dist/releases/<versione>/...`), non il
bundle che il build corrente sta scrivendo. Il badge di un `dist/INGLY-OS.html`
appena generato dichiarava se stesso con il percorso della release
precedente. Corretto a dichiarare sempre i percorsi vivi
(`dist/INGLY-OS.html`/`dist/INGLY-CLOUD-ADMIN.html`), mai letti da
`RELEASES.json`.

**Test**: `tests/qa/admin-release-info.mjs` (16, browser reale) — il badge
esiste, la versione incorporata coincide con `package.json`, commit/branch/
build non sono vuoti, entrambi gli artefatti sono nominati esplicitamente,
lo stato test/QA è mostrato (mai un falso PASS), dichiara il limite del
backend, il pulsante di chiusura chiude davvero, il badge riapre dopo una
chiusura.

**Verificato**: 267 file sintassi (aggiunto `src/admin/release-info.js`),
2203/2203 unit, 92/92 suite browser QA, 0 errori JS, nessuna regressione.

## 2.0.0 — Multi-Tech BOM, rilascio 6: fabbisogno materiali reale (Material Reservation)

Downstream del percorso BOM→Routing→Cost→Order appena chiuso (1.9.0):
verificato con `grep` che `InglyFabbisogno` (`material-requirement.js`,
Fase 31/32) non ha mai avuto un consumatore in tutto il codice, e che
comunque leggerebbe solo dal preventivo (`costBreakdown.voci`), mai da una
distinta di prodotto.

**Nuove funzionalità**
- `InglyProductBOMStore.fabbisognoDaOrdine(ordine)`: il fabbisogno
  materiali di un ordine dalla distinta del suo prodotto — righe espanse
  sulla quantità ordinata, scarto già compreso — con la giacenza attuale
  letta dal registro di magazzino (`InglyInventoryLedger.ricostruisci`,
  lo stesso registro che il resolver di costo già usa). Stessa applicabilità
  di `routingDaOrdine`/`costoDaOrdine` (`_bomApplicabile`, condivisa):
  un ordine per cui viene il routing dalla distinta è lo stesso per cui
  viene anche il fabbisogno.
- Il Pannello Produzione mostra ora «🧱 Materiali necessari»: quanto serve
  e se lo scaffale ne ha abbastanza, con il numero esatto che manca quando
  non basta. Un ordine senza distinta applicabile non vede la sezione.

**Non ancora fatto, apposta**: questo è il fabbisogno di **un** ordine
contro la giacenza fisica, non al netto di quanto già impegnato dagli altri
ordini aperti (quel conto, `InglyFabbisogno.impegnato`, esiste ma sul
vecchio percorso preventivo — incrociarlo con la distinta è un rilascio a
sé, più rischioso da mescolare qui).

**Test**: `tests/qa/multitech-material-reservation.mjs` (8, browser reale).

**Verificato**: 266 file sintassi, 2203/2203 unit, 91/91 suite browser QA,
0 errori JS, nessuna regressione.

## 1.9.0 — Multi-Tech BOM, rilascio 5: l'orchestratore reale (distinta → routing → costo → ordine)

**Nuove funzionalità**
- `InglyProductBOMStore.costoDaOrdine(ordine)`: il primo punto di questo
  verticale che collega i motori puri (`InglyProductBOM`, `InglyBOMCost`)
  a IndexedDB per davvero — non tariffe passate a mano come nei rilasci
  precedenti. Risolve l'oraria macchina da `equipment` via
  `InglyMachineCost`, l'oraria manodopera di ripiego dai profili economici
  del laboratorio (`InglyCostProfilesStore`, la stessa fonte del
  preventivatore) e il costo materiale dal registro di magazzino
  (`InglyInventoryCostResolver`, lo stesso resolver che valorizza un
  preventivo). La domanda «questa distinta è applicabile a questo ordine?»
  — già isolata in una funzione sola nel rilascio 3 (`routingDaOrdine`) —
  è ora condivisa da entrambe le funzioni (`_bomApplicabile`): mai due
  risposte diverse alla stessa domanda per lo stesso ordine.
- Il pannello «Preventivato · Reale · Scostamento» di un ordine mostra ora,
  quando applicabile, una riga «📐 Secondo la distinta» col costo per pezzo
  e le tecnologie — un terzo numero, diverso dal preventivato (congelato al
  cliente) e dal reale (misurato a mano): puramente informativo, non scrive
  mai nei campi di consuntivo. Un ordine senza distinta collegata non lo
  vede: nessuna regressione sul pannello esistente.

**Protezione doppio conteggio**, verificata con test dedicati (unit e
browser): richiamare l'orchestratore più volte non accumula nulla; una
distinta con N righe genera esattamente N voci di costo; due lavorazioni
sulla stessa macchina applicano ciascuna il proprio tempo, mai una tariffa
già conteggiata una seconda volta.

**Non ancora fatto, apposta**: nessuna scrittura automatica nel consuntivo
misurato (`cost_entries`) — quei campi restano una misura fatta a mano, non
una stima; un pulsante che li pre-compili lasciando la conferma
all'operatore resta un'estensione naturale, fuori dallo scopo di questo
rilascio. Nessun collegamento al fabbisogno materiali reale
(`InglyFabbisogno`, ancora senza alcun consumatore nel codice).

**Test**: `tests/bom-cost.test.mjs` esteso a 12 unit (tre nuovi, dedicati
alla protezione doppio conteggio). `tests/qa/multitech-bom-e2e.mjs` — 18
controlli in browser reale, il percorso completo a tre tecnologie
(stampa 3D + laser con macchina, assemblaggio a mano senza) dal prodotto
all'ordine al pannello, con ricaricamento e verifica di non-regressione su
un ordine senza distinta.

**Verificato**: 266 file sintassi, 2203/2203 unit, 90/90 suite browser QA,
0 errori JS, nessuna regressione.

## 1.8.0 — Multi-Tech BOM, rilascio 4: costo aggregato multi-tecnologia

**Nuove funzionalità**
- `src/product/bom-cost.js` (`InglyBOMCost`): il costo di una distinta con
  più tecnologie, aggregando — non ricalcolando — quello che la distinta
  dichiara. Il tempo di ogni operazione (avviamento in una tantum, tempo per
  pezzo in per-pezzo, mai l'uno moltiplicato come l'altro) va alla tariffa
  oraria della sua macchina o, in mancanza, a una tariffa di manodopera di
  ripiego; i materiali vanno al loro costo unitario. Overhead, imballo e
  spedizione restano fuori: sono costi dell'ordine, non della lavorazione —
  sommarli qui li avrebbe sommati una volta per tecnologia invece che una
  volta sola sull'ordine.

**Decisione esplicita**: `InglyCostEngine` non viene toccato. Farlo leggere
una distinta multi-tecnologia avrebbe richiesto un profilo combinato
inventato dentro il file con la storia di difetti critici sui totali più
lunga di questo codice; l'aggregazione vive invece in un modulo nuovo e
puro, che riusa `InglyProductBOM` senza duplicarne i conti.

**N/D esplicito**: una voce (operazione o materiale) senza tariffa/costo
noto non entra nel totale — il risultato dichiara `completo:false`, elenca
che cosa manca e perché, mai un numero indovinato.

**Non ancora fatto, apposta**: nessun collegamento a un ordine reale.
Risolvere le tariffe (macchina/manodopera/materiale) per un ordine vero
richiede IDB — un orchestratore asincrono come `routingDaOrdine` del
rilascio 3, insieme al percorso end-to-end in browser, è il rilascio 5.

**Test**: `tests/bom-cost.test.mjs` (9 unit).

**Verificato**: 266 file sintassi, 2200/2200 unit, nessuna regressione
(nessun modulo esistente toccato).

## 1.7.0 — Multi-Tech BOM, rilascio 3: un ordine espande la distinta in routing reale

**Nuove funzionalità**
- `InglyProductBOMStore.routingDaOrdine(ordine)`: se un ordine ha una sola
  riga collegata (`catalogId`) a un prodotto con una distinta base corrente,
  il routing di produzione viene da `InglyProductBOM.espandiOperazioni`
  (una operazione per lavorazione dichiarata nella distinta, avviamento e
  tempo per pezzo espansi sulla quantità realmente ordinata) invece che
  dedotto dalla singola tecnologia dell'ordine. Senza distinta applicabile
  il comportamento non cambia.

**Trovato verificando l'architettura reale prima di scrivere codice**: il
routing di un ordine si genera lazy in **due** punti, non uno — la
transizione automatica a produzione (`WorkflowSync.transition`, patch 042)
e l'apertura a mano del Pannello Produzione (`GestioneOrdini.openProductionPanel`,
patch 052), entrambi verificati con `grep` sull'unica chiamata precedente a
`InglyOperazioni.costruisciDaOrdine`. Le due patch ora chiamano la stessa
`routingDaOrdine` invece di duplicare la logica ciascuna per conto proprio —
la stessa classe di difetto di CRM-05b (due letture della stessa cosa che
divergono alla prima modifica fatta su una sola), evitata mettendo la
decisione in un solo posto (`product-bom-store.js`).

**Non ancora fatto, apposta**: il fabbisogno materiali reale
(`espandiMateriali` → `material-requirement.js`) e l'aggregazione di costo
multi-tecnologia restano per il rilascio successivo — un cambio al routing
(nessun numero economico) è un rischio diverso da uno al costo, su un
motore con una storia documentata di difetti critici sui totali.

**Test**: `tests/qa/bom-routing-ordine.mjs` (12, browser reale) — routing
multi-tecnologia da distinta su transizione di stato, non ricostruito su una
transizione successiva, nessuna regressione su un ordine senza distinta,
stesso routing dal Pannello Produzione aperto a mano, persistenza dopo un
ricaricamento vero.

**Verificato**: 265 file sintassi, 2191/2191 unit, 89/89 suite browser QA,
0 errori JS, nessuna regressione.

## 1.6.0 — Multi-Tech BOM, rilascio 2: UI dal catalogo

**Nuove funzionalità**
- Pulsante «🧬 Distinta base» sulla card prodotto del Catalogo
  (`Catalog.openBOM`): pannello a parte (non nel modale di modifica
  prodotto, già grande e delicato) per dichiarare materiali — collegati a
  un vero articolo di magazzino, mai testo libero — e operazioni
  multi-tecnologia con avviamento e tempo per pezzo separati. Salvare crea
  sempre una nuova versione; le versioni precedenti restano nel registro.

**Difetto trovato e corretto scrivendo il pannello**: le righe bozza usano
il nome di campo che `InglyProductBOM.valida`/`crea` si aspettano
(`quantity`), le righe già salvate portano quello che `crea()` congela
(`quantityPerPiece`) — senza riallinearli al caricamento di una distinta
esistente, ogni salvataggio dopo il primo falliva la validazione in
silenzio (l'utente vedeva un errore, ma non capiva perché una distinta già
salvata non si potesse più modificare). Riallineato in un solo punto.

**Test**: `tests/qa/distinta-base-prodotto.mjs` (15, browser reale).

**Verificato**: 265 file sintassi, 2191/2191 unit, 88/88 suite browser QA,
0 errori JS, nessuna regressione.

## 1.5.0 — Multi-Tech BOM, rilascio 1: dominio e persistenza

Primo rilascio del verticale Multi-Tech (Product → BOM → Routing → Cost
Engine), scomposto in blocchi utilizzabili — vedi `docs/MULTI-TECH-BOM.md`.

**Nuove funzionalità**
- `src/product/product-bom.js` (`InglyProductBOM`) + `product-bom-store.js`:
  distinta base di prodotto (materiali + operazioni), riusabile da un ordine
  all'altro — oggi il catalogo dichiara una tecnologia e un materiale soli
  per prodotto. Espande le proprie righe nella forma che
  `material-requirement.js` e `InglyOperazioni` sanno già leggere, senza
  ricalcolare né duplicare i loro conti. L'anatomia avviamento/tempo-per-
  pezzo sulle operazioni impedisce di moltiplicare un avviamento per la
  quantità dell'ordine (verificato a 100 pezzi contro 1 nei test).
- Store IDB `product_bom` (v34, migrazione additiva).

**Non ancora fatto, apposta**: nessuna UI, nessun collegamento a un ordine
reale — dominio e persistenza prima del pulsante, come per Manutenzione.

**Test**: `tests/product-bom.test.mjs` (24 unit).

**Verificato**: 265 file sintassi, 2191/2191 unit, nessuna regressione.

## 1.4.0 — Qualità: uno scarto diventa una decisione

**Nuove funzionalità**
- `src/product/quality-ncr.js` (`InglyQualityNCR`) + `quality-ncr-store.js`:
  registro delle non conformità (rilavorazione/scarto/accettato con
  deroga/reso al fornitore), collegato al routing di produzione
  (`InglyOperazioni`, già esistente e testato) senza ricalcolarne i numeri.
  Una non conformità nasce sempre aperta e non si propone mai senza uno
  scarto o un rifacimento **con un motivo dichiarato**.
- Il Pannello Produzione di un ordine (⚙️ in Gestione Ordini) mostra ora il
  routing dell'ordine — prima invisibile ovunque tranne un badge «2/3» in
  lista — con un modulo per registrare buoni/scarti/rifacimenti per
  operazione, e le non conformità aperte con chiusura per disposizione.

**Trovato**: `InglyOperazioni` (buoni/scarti/rifacimenti, stato routing,
resa/coerenza) esisteva completo e testato dalla Fase precedente ma non
aveva **nessuna** superficie di inserimento dati — solo tre consumatori
in lettura (redditività macchina, fabbisogno materiali, repository) e un
badge di avanzamento. Verificato sull'architettura reale prima di
concludere alcunché, come richiesto: non un modulo mancante, un modulo
senza UI.

**Verificato**: 263 file sintassi, 2167/2167 unit, 87/87 suite browser QA,
0 errori JS, nessuna regressione.

## 1.3.1 — CRM: un'altra superficie della classe CRM-05b

Continuando la ricerca sistematica di "identità cliente risolta per nome"
avviata con CRM-04/05b, iniziata durante l'indagine sul verticale
Procurement (vedi 1.3.0, `AutoInvoicePDF`).

**Difetti corretti**
- `Clients.openModal` (pannello «📊 Statistiche Cliente» nella scheda di
  modifica): filtrava le vendite con `s.clientId===id||(cl&&s.clientName===cl.name)`
  — il ripiego sul nome si sommava al filtro per id invece di sostituirlo
  solo quando l'id manca. Una vendita di un cliente **omonimo** (clientId
  diverso, stesso nome) entrava comunque nel conteggio di acquisti, spesa
  totale e scontrino medio. Corretto a sommare il nome solo quando
  `clientId` è assente. `tests/qa/statistiche-cliente-omonimi.mjs` (rosso
  confermato prima del fix).

**Trovato, documentato, non corretto in questo giro**
- Il modulo «CRM Pro» del pacchetto Prox (`healthScore`/`buildCRMPro`,
  `App.navigate('prox-crm')`) ha lo stesso schema di filtro, ma la causa è
  più profonda: il modulo «Nuovo Ordine» del Prox non cattura mai un
  `clientId` reale (scrive lo stesso testo libero sia in `client` sia in
  `clientName`) — un fix onesto richiede un vero selettore cliente su quel
  form, non solo correggere la lettura. Tracciato in `docs/CRM-ROADMAP.md`.

**Verificato**: 261 file sintassi, 2143/2143 unit, 86/86 suite browser QA,
0 errori JS, nessuna regressione.

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
