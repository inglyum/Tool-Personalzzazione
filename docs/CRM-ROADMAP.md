# CRM Clienti — piano di consolidamento

Voce della roadmap principale. Nulla di ciò che segue è implementato: quello
che esiste oggi, misurato, è in `docs/CRM-AUDIT-BEFORE.md`.

Il lavoro non è «aggiungere funzioni al CRM». È lo stesso lavoro che questo
progetto ha già fatto tre volte: **quattro sistemi possiedono il concetto
«cliente», e vanno ridotti a uno.**

---

## Ordine di esecuzione

Non è un elenco di desideri: è una sequenza, e le dipendenze sono reali. Chi
scrive la ricerca prima degli id stabili la riscrive due volte.

### Blocco A — la base (niente funziona bene senza)

| # | Cosa | Perché adesso |
| - | ---- | ------------- |
| **CRM-01** | Audit misurato delle quattro liste | ✅ fatto — `docs/CRM-AUDIT-BEFORE.md` |
| **CRM-02** | **Paginazione: togliere la causa** | ✅ fatto — pipeline unica `CRMSmart._pipeline()` in ordine SOURCE → SEARCH → FILTER → SORT → PAGINATION; ritirato il secondo render della patch 092. `tests/qa/crm-paginazione.mjs` è in `npm run qa`: 152 controlli su nove dimensioni di rubrica, controllo negativo rosso |
| **CRM-03** | Id stabile per ogni cliente, con migrazione | ✅ fatto — `_load` assegna un id a chi non ce l'ha e lo salva una volta; righe, selezione, modifica, eliminazione ed esportazione passano dall'id. La selezione sopravvive al cambio pagina |
| **CRM-04** | Una sorgente sola | ✅ fatto — `src/product/clienti.js`. Misurato nel browser prima di correggere: le due liste erano **disgiunte**. IndexedDB `clients` è il canonico (è ciò che ordini, preventivi e vendite riferiscono per id); `ingly_crm_v1` resta come specchio di compatibilità che un solo scrittore mantiene, dichiarato e non nascosto, finché le patch 076/080/081/092/095 che lo leggono direttamente non saranno portate qui. Unione per id o per email — mai per nome, «Rossi» e «Rossi» sono spesso due clienti diversi. Su conflitto vince il canonico ma il valore scartato resta registrato. `tests/qa/clienti-unici.mjs` in `npm run qa` |
| **CRM-05** | Una funzione che disegna la riga | ✅ fatto — `src/product/cliente-riga.js`. Non erano quattro: misurandoli sul file consegnato sono **otto** i punti che costruivano o modificavano la riga di un cliente, e **cinque** cercavano `#crm-row-<indice nell'array>` mentre CRM-04 aveva già dato alle righe l'id del cliente. Conseguenza verificata nel browser: i chip dei tag e quattro pulsanti — storico comunicazioni, note interne, archivio preventivi, profilo cliente — avevano smesso di comparire, senza un errore in console. Due di quei pulsanti non partivano nemmeno: aspettavano `CRMSmart._v31qbtn`, un contrassegno che **nessuno imposta in tutto il file**, con un `setTimeout` ogni 700 ms che non finiva mai. Ora chi vuole aggiungere un comando si registra con `aggiungiAzione()` e il pulsante entra mentre la riga viene costruita. Il renderer non recupera dati, non crea id, e tutto passa da `esc()`. `tests/cliente-riga.test.mjs` (18) e `tests/qa/crm-riga-unica.mjs` (25 controlli sulla pagina vera). Censimento completo in `docs/CRM-05-RIGA-UNICA.md` |
| **CRM-05b** | Il pulsante «profilo cliente» apriva il profilo del nome, non del cliente | ✅ fatto — riparato ma non elencato prima: `ClientProfile.open` (patch 092) sopravviveva a CRM-05 con lo stesso difetto che CRM-04 aveva chiuso altrove — risolveva il cliente per **nome** e filtrava preventivi e ordini per lo stesso nome. Due clienti omonimi (padre e figlio, per dire) vedevano fatturato e storico l'uno dell'altro nella stessa finestra. Corretto a risolvere per `id` (`InglyClienti.perId`) e a filtrare per `clientId`, con ripiego dichiarato sul nome solo per i record scritti prima che `clientId` esistesse. `tests/qa/profilo-cliente-per-id.mjs`, 11/11, confermato rosso contro il codice precedente. Le note interne e lo sconto fisso (`ingly_note_interne_v1`, `ingly_listino_v1`, moduli 088/089) restano chiavi per nome — limite residuo dichiarato, non corretto in questo giro |

### Blocco B — scala (dopo A, non prima)

| # | Cosa |
| - | ---- |
| CRM-06 | Ricerca con indice, non `filter` su tutto a ogni battuta (oggi: antirimbalzo 200 ms nella pipeline, 5.000 contatti in meno di 1,5 s misurati) |
| CRM-07 | Ordinamento su indice invece che su copia dell'array (oggi: `slice()` prima di `sort`, corretto ma O(n log n) a ogni render) |
| CRM-08 | Filtri combinabili (segmento, tag) oltre ai quattro già nella pipeline: B2B, privato, con telefono, con email |
| CRM-09 | Rendering a blocchi oltre i 500 clienti |
| CRM-10 | Conteggi che non richiedono di caricare tutti i record |

### Blocco C — integrità

| # | Cosa |
| - | ---- |
| CRM-11 | Vincoli in eliminazione: un cliente con ordini, preventivi, fatture o pagamenti **non si cancella** — `status: 'ARCHIVED'` | ✅ fatto — `src/product/cliente-integrita.js`. Presidia i **tre** punti di eliminazione (rubrica, eliminazione in blocco, scheda cliente): senza quello in blocco bastava selezionare tutto per aggirarlo. Conta i riferimenti su cinque archivi e tre nomi di campo, confronta gli id per valore perché arrivano stringa dalle `<select>` e numero dal database, e distingue «ho guardato e non c'era niente» da «l'archivio non esiste». Archiviare aggiunge tre campi e non ne toglie nessuno; è reversibile. `tests/qa/cliente-integrita.mjs` crea un cliente con un ordine, prova a cancellarlo e verifica **nel database** che sia ancora lì, archiviato, con l'ordine collegato |
| CRM-12 | Unione dei duplicati che non perde nulla: gli storici dei due record confluiscono, non si scelgono |
| CRM-13 | Validazione di email e telefono in ingresso, non solo alla vista |
| CRM-14 | Registro delle modifiche al cliente, come `economicLog` per gli ordini |

### Blocco D — valore per chi vende

| # | Cosa |
| - | ---- |
| CRM-15 | Scheda cliente con lo **storico economico reale** | ✅ fatto — `src/product/customer-360.js` (`InglyCustomer360.statisticheCliente`/`storicoEconomico`). Non ricalcola: legge `InglyOrderEconomics` (ricavo/costo/profitto/margine per ordine) e `InglyQuoteStatus` (conversione), filtrando sempre per `clientId`, mai per nome — CRM-04 applicato ai dati economici. Ogni KPI non calcolabile torna N/D con motivo, non zero. Quattro finestre (30gg/90gg/anno/tutto) nella tab «Storico economico» del profilo cliente. `tests/customer-360.test.mjs` (27 unit) + `tests/qa/crm-customer-360.mjs` (10, browser reale) |
| CRM-16 | Segmentazione RFM su una sorgente sola | ⬜ non iniziato |
| CRM-17 | Timeline unificata: preventivi, ordini, vendite, pagamenti | ✅ fatto in parte — `InglyCustomer360.timelineCliente` aggrega creazione cliente, preventivi (con stato derivato da `InglyQuoteStatus` e legame verso l'ordine), ordini. **Non aggregati, deliberatamente**: note interne (`ingly_note_interne_v1`) e storico comunicazioni (`lb2b_comm_hist_v1`, scritto da `CommHistory.add` — trovato durante questo lavoro, attivamente scritto da tre punti in `src/legacy/patches/086,094,096`) restano indicizzati per **nome cliente**, non per `clientId`. Includerli riaprirebbe lo stesso difetto di CRM-05b in una superficie nuova; il lato che scrive `CommHistory` (il campo cliente del calcolatore Laser B2B) è testo libero e quasi mai ha un `clientId` risolto — chiuderlo per davvero è un intervento sul flusso di preventivazione, non su questo modulo. Vendite/pagamenti: non aggregati in questo giro, nessuna sorgente dati con timestamp per-cliente trovata oltre agli ordini |
| CRM-18 | Esportazioni (VCF, CSV) che esportano la selezione, non l'elenco intero | ✅ fatto — il motore e i pulsanti (`CRMSmart._exportSelected`/`._exportAll`, patch 081) esistevano già ma senza nessuna copertura da un click vero: zero occorrenze in `tests/`, verificato con `grep`. `tests/qa/crm-export-selezione.mjs` (11, browser reale) li verifica selezionando due contatti su tre e leggendo il file scaricato davvero — CSV e VCF, selezione ed «esporta tutto». Trovato e corretto un bug reale scrivendo il test: `_getExportData(true)` con selezione **vuota** cadeva nel ramo «restituisci tutto» (la guardia era `onlySelected && size>0`, non solo `onlySelected`) — la stessa classe di difetto che questa voce doveva chiudere, nel caso limite. Nella UI il caso non è raggiungibile (la barra di esportazione selezione sparisce quando la selezione è vuota), ma il ramo esisteva nel codice ed era sbagliato |

### Trovato durante CRM-15/17, non corretto — stessa classe di CRM-05b

`CommHistory` (`src/legacy/patches/086-...js`, scritto anche da `094-...js` e
`096-...js`) è un secondo store attivo, non note interne morte: registra
ogni preventivo/ordine salvato dal calcolatore Laser B2B, indicizzato per
`client.toLowerCase().trim()`. Due clienti omonimi vedono lo storico
comunicazioni l'uno dell'altro nel pulsante «📋 Storico comunicazioni» di
CRM-05. Non corretto qui perché il lato scrittore (`cl`, una stringa libera
nel form del calcolatore) non porta quasi mai un `clientId` — un fix onesto
richiede prima far risolvere quel campo a un cliente vero, che è un
intervento sul calcolatore Laser B2B (oggi verde), non sul CRM.

### Trovato e corretto durante il verticale Procurement — stessa ricerca

`Clients.openModal(id)` (`src/legacy/app/src/modules/clients/index.js`), il
pannello «📊 Statistiche Cliente» dentro la scheda di modifica, filtrava le
vendite con `s.clientId===id||(cl&&s.clientName===cl.name)`: il ripiego sul
nome si **sommava** al filtro per id invece di sostituirlo solo quando l'id
manca, quindi una vendita di un cliente **omonimo** (`clientId` diverso,
stesso nome) entrava comunque nel conteggio — acquisti, spesa totale e
scontrino medio di due Mario Rossi si mischiavano. Corretto a
`s.clientId==null&&cl&&s.clientName===cl.name`: il nome copre solo le
vendite scritte prima che `clientId` esistesse. `tests/qa/statistiche-cliente-omonimi.mjs`
(rosso confermato prima del fix).

`AutoInvoicePDF.generate` (`src/legacy/patches/064-...js`), la ricevuta/
fattura PDF automatica, risolveva il cliente per nome
(`c.name===sale.clientName`) per stampare email e indirizzo: due clienti
omonimi potevano scambiarsi questi dati su un documento fiscale vero.
Corretto a risolvere per `sale.clientId` quando presente (lo è dalla Fase
30 in poi), nome come ripiego dichiarato per le vendite più vecchie.
`tests/qa/documenti-cliente.mjs` (rosso confermato prima del fix). Vedi
`docs/PROCUREMENT.md` per il contesto (trovato indagando la duplicazione
`SupplierIntelligence` vs `suppliers`, stessa classe su un'altra entità).

**Trovato, non corretto — causa più profonda di un filtro**: il modulo
«CRM Pro» del pacchetto Prox (`src/legacy/patches/099-ingly-prox-js-ingly-os-pro-x-v2.js`,
`healthScore()` e `buildCRMPro()`, raggiungibile da
`App.navigate('prox-crm')`) filtra gli ordini con lo stesso schema
`o.client===c.id||o.clientName===c.name` — ma il modulo che scrive quegli
ordini (`101-...js`, il modulo «Nuovo Ordine» del pacchetto Prox) non
cattura mai un `clientId` reale: il campo cliente è testo libero, e viene
scritto **identico** sia in `client` sia in `clientName`
(`client: client, clientName: client`). Il primo termine del filtro non
incontra mai un id vero: in pratica il match è sempre e solo per nome. Due
clienti omonimi condividono Health Score, Kanban lifecycle e conteggio
ordini in questa schermata. Non corretto qui perché il filtro non è la
causa: la causa è che il modulo «Nuovo Ordine» del Prox non ha mai avuto un
selettore cliente reale — servirebbe dare a quel form un vero
autocompletamento su `ingly_clients` che scriva un id, non solo correggere
la lettura. È un intervento sul modulo di inserimento ordini del Prox, non
sul CRM standard (che usa `clientId` correttamente dalla Fase 30).

---

## Regole per chi esegue

Sono le stesse che valgono nel resto del progetto, ripetute perché il CRM è
esattamente il posto dove sono state violate.

1. **Un difetto si corregge alla causa.** Niente `display:none` sulle righe in
   eccesso: la tabella continuerebbe a costruirle.
2. **Non si crea una quinta lista.** Se la soluzione comincia con «facciamo un
   nuovo componente clienti», è la soluzione sbagliata.
3. **Non si cambia una chiave di memoria senza migrazione.** `ingly_crm_v1`
   contiene i clienti veri di chi usa il prodotto oggi.
4. **Non si cancella: si archivia.**
5. **Nessun dato inventato.** Punteggi, segmenti e statistiche senza una base
   reale restano vuoti e la vista lo dice.
6. **Ogni presidio nasce rosso.** `tests/qa/crm-paginazione.mjs` è rosso adesso:
   entra in `npm run qa` quando diventa verde per la ragione giusta.

## Come si saprà che è finito

| | esito |
| - | ----- |
| `tests/qa/crm-paginazione.mjs` verde e nella suite | ✅ |
| con 137 clienti la seconda pagina disegna 30 righe **diverse** | ✅ misurato |
| nessun contatto in due pagine, nessuno perso, su 9 dimensioni di rubrica | ✅ misurato |
| primo / precedente / successivo / ultimo / dimensione pagina | ✅ misurato |
| filtro e ricerca **prima** della paginazione | ✅ misurato, con controllo negativo |
| modificare il cliente in fondo a pagina 4 modifica quel cliente | ✅ misurato |
| la selezione sopravvive al cambio pagina | ✅ misurato |
| con 5.000 clienti la vista si apre senza bloccare la pagina | ✅ 30 righe disegnate, render sotto 1,5 s |
| un cliente con ordini non è cancellabile, ed è archiviabile | ⬜ CRM-11 |
| `scripts/audit-ui-duplicates.mjs` non trova più liste clienti concorrenti | ⬜ CRM-04: restano quattro liste su due memorie |
