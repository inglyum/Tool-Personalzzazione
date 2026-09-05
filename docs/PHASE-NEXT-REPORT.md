# Fase successiva — Ordini, Produzione, Catalogo, CRM, Cost Engine

Report della fase richiesta con la direttiva «ORDERS + PRODUZIONE + CATALOGO +
CRM + COST ENGINE».

Ogni riga della tabella è un difetto **misurato**, non dedotto: la colonna
«Risultato» dice dove lo si vede verificato.

---

## Difetti trovati e risolti

| ID | Modulo | Bug | Causa | Correzione | Test | Risultato |
|---|---|---|---|---|---|---|
| ORD-01 | Ordini | La lista non mostrava immagine, margine né assegnatario | I primi due erano nei dati senza un posto sullo schermo; il terzo non esisteva come campo | Tre colonne nuove; `src/product/order-fields.js` è l'unico posto che sa da dove leggere ogni campo | ORD-001…005 unit + browser | ✔ |
| ORD-02 | Ordini | Il margine si sarebbe potuto ricalcolare con i costi di oggi | Nessuna regola scritta su quale fonte usare | Solo `economicSnapshot.totals`; senza snapshot la cella dice «—» con il motivo | ORD-003/004/012 | ✔ |
| ORD-03 | Ordini | Immagini rotte possibili, e foto perse dopo 200 ordini | `OrderSpecs` teneva 200 voci e buttava le più vecchie | L'immagine vive anche sull'ordine; mai `<img>` senza sorgente, sempre `alt`, `onerror` sul segnaposto | ORD-001/002 | ✔ |
| ORD-04 | Ordini | I filtri macchina/operatore/tecnologia non esistevano | Non esistevano nemmeno i campi | Tre campi nel pannello di produzione + tre filtri; tecnologie dal registro del motore | ORD-006…010 | ✔ |
| ORD-05 | Ordini | Il KPI «Ritardo» svuotava la lista | Due pipeline di filtro: `render()` ne aveva una scritta a mano, `_getFilteredOrders` un'altra più completa che non chiamava nessuno | Una pipeline sola, quella completa | ORD-010c | ✔ |
| ORD-06 | Ordini | Due filtri cambiati in fretta lasciavano in tabella il risultato precedente | Due render concorrenti, dipinge il primo che finisce | Un turno: solo il render più recente disegna | ORD-010 | ✔ |
| ORD-07 | Ordini | «Ordine aggiornato» anche quando il salvataggio falliva | `await IDB.put` senza rete | Esito verificato, errore in `Ingly.Errors`, avviso all'utente | FASE 8/8b/8c | ✔ |
| PROD-01 | Produzione | Nessun conto di capacità, carico o scadenza reale | Non esistevano né le ore per ordine né le ore/giorno per macchina | `src/product/production-capacity.js` + i due campi sorgente che mancavano | PROD-001…010 | ✔ |
| PROD-02 | Produzione | Rischio di un utilizzo «bello» ignorando i dati mancanti | — | Un ordine senza ore vale «non lo so», non zero; una macchina senza ore/giorno non ha capacità; entrambi dichiarati | PROD-010…010h | ✔ |
| CAT-01 | Catalogo | «Applica 45% a tutti» riscriveva i prezzi al clic, senza anteprima né annullamento | — | Anteprima con attuale/nuovo/delta €/delta %/margini, selezione riga per riga, scrittura solo alla conferma in una transazione sola | CAT-001…011 | ✔ |
| CAT-02 | Catalogo | Tre matematiche per lo stesso prezzo | `costPrice/(1-0.45)` scritto a mano due volte accanto a `_prezzoConsigliato` | Solo `InglyCostEngine.prezzo` | CAT-001 | ✔ |
| CAT-03 | Catalogo | Il pannello «Margini bassi» non si apriva | `Catalogo._prezzoConsigliato`: quell'oggetto non esiste in tutto il progetto, due `ReferenceError` | Rinominato in `Catalog` | browser, 0 errori JS | ✔ |
| CRM-01 | CRM | «Preventivi fermi»: la pipeline segnava zero | Il preventivatore crea con `status:'in_attesa'`; la striscia sommava `'inviato'` o `'bozza'`, valori che nessuno scrive | `src/product/quote-status.js`: sette stati canonici, tutti i nomi storici tradotti in lettura | CRM-002/004 | ✔ |
| CRM-02 | CRM | La striscia non era mai stata disegnata | `renderPipeline()` scriveva in `#crm-pipeline-strip`, id assente dal DOM, e non la chiamava nessuno | Ritirata; i KPI stanno nella vista CRM che esiste davvero | CRM-004c…g | ✔ |
| CRM-03 | CRM | Un preventivo convertito restava «aperto» se nessuno aggiornava il suo stato | Lo stato scritto era l'unica fonte | Un ordine collegato batte lo stato scritto | CRM-006 | ✔ |
| CRM-04 | CRM | Il legame preventivo↔ordine dipendeva da quale dei cinque campi era stato usato | `originQuote`, `quoteId`, `_fromQuoteId`, `fromQuote`, `sourceQuoteId` letti in punti diversi | Una lettura sola, nei due sensi | CRM-006/007/008 | ✔ |
| CRM-05 | Dashboard | «Convertiti» contava uno dei tre modi in cui un preventivo diventa ordine | Due copie identiche e parziali dello stesso conteggio | Una funzione sola, dal vocabolario | unit CRM-010 | ✔ |
| CRM-06 | Dashboard | Il ramo di ripiego dei KPI leggeva una variabile inesistente | `orders` non era fra i dati caricati | Aggiunto alla lettura | verify + browser | ✔ |
| PB-01 | Product Builder | La confezione era contata **due volte** nel prezzo | Sommata in `materialCost` e ripassata a `Data.price` come voce | Una volta sola, come voce | costi-parametri + browser (5,00 → 8,00 con 3 €) | ✔ |
| ERR-01 | Tutto | Una promessa rifiutata veniva registrata ma non detta a nessuno | Il presidio centrale solo osservava | Avviso all'utente, limitato a uno ogni dieci secondi | FASE 8e/8f | ✔ |
| PERF-01 | Ordini | La vista Produzione rileggeva tutti gli ordini una seconda volta a ogni disegno | — | Gli ordini arrivano da `render()` che li ha già letti | PROD 26/26 | ✔ |
| MACH-01 | Smart Quoter 3D | Il preventivatore ignorava il parco macchine registrato | `MACH` (listino di modelli noti) era l'unico registro letto; `equipment` è l'inventario vero | La tendina apre con «Le tue macchine»; potenza, prezzo, vita utile e manutenzione vengono dal record | quoter3d-parco, 14 controlli | ✔ |
| ERR-02 | Tutto | 200 `catch {}` vuoti attorno a una scrittura: un salvataggio poteva non avvenire senza che nessuno lo dicesse | Duecento chiamanti, un canale solo | Spia su `localStorage.setItem` e sui metodi di scrittura di `IDB`: registra, avvisa, e rilancia identico | scritture-non-silenziose, 13 controlli | ✔ |
| CONS-01 | Consuntivi | Due consuntivi spariti dopo il ricaricamento, in modo intermittente | `leggiJSON` restituiva `{}` sia per «vuoto» sia per «non leggibile»: la migrazione ci fondeva dentro i consuntivi del vecchio 3D e riscriveva l'archivio senza il resto | `leggiSicuro` distingue i tre casi; la migrazione non scrive e non si segna fatta se un archivio non si è potuto leggere | consuntivo, 2 unit nuovi | ✔ |
| PROD-03 | Produzione | I giorni lavorativi erano una regola muta: sabato e domenica chiusi, nessuna ferie | Il calendario non esisteva come dato | `calendarioProduzione` nelle impostazioni: giorni della settimana e date di chiusura; il predefinito resta quello di prima e la vista dichiara quale sta usando | PROD-011…011i unit + 4 browser | ✔ |

## Parametri di costo — decisioni

Dettaglio in `docs/COST-PARAMETERS-AUDIT.md`.

| Parametro | Prima | Dopo | Perché |
|---|---|---|---|
| Manutenzione FDM | 0,12 €/h | **invariato** | 0,05 €/h su 2000 h non coprono due piatti e un set di ugelli; nessun dato dell'applicazione sostiene il taglio |
| Macchina «Personalizzata» | 400 €/2000 h · 0,2000 €/h | **420 €/3000 h · 0,1398 €/h** | mediana degli undici preset reali; il valore vecchio è più caro di nove, quello proposto è il secondo più economico |
| Confezione | doppio conteggio nel Product Builder | **costo diretto per pezzo, una volta** | è un costo variabile causato dal pezzo, fuori dalla base dello scarto |

---

## Riepilogo

| | |
|---|---|
| **Bug trovati** | 25 |
| **Bug risolti** | 25 |
| **Moduli nuovi** | 4 (`order-fields`, `production-capacity`, `catalog-recalc`, `quote-status`) |
| **Test totali (unitari)** | 1313 |
| **Test passati** | 1313 |
| **Test falliti** | 0 |
| **Suite su browser** | 40, tutte verdi (`npm run qa`, uscita 0) |
| **Controlli su browser nelle suite nuove** | 157 (28 ordini · 30 produzione · 21 catalogo · 18 CRM · 8 confezione · 28 coerenza · 14 parco macchine · 13 scritture) |
| **Errori JavaScript nelle suite nuove** | 0 |
| **Controlli superati nella regressione completa** | 913 · 0 falliti · 0 errori JavaScript |

---

## NOT VERIFIED

Cose che questa fase **non** ha verificato, e il motivo.

1. **I 517 `catch` vuoti del codice storico** — di cui **200** avvolgono una
   scrittura — non sono stati riscritti uno per uno: toccare duecento punti di
   9 MB di codice che funziona è il modo di romperne uno per correggerne un
   altro. Si è intercettato il **canale**, come già fatto con `console.error`:
   `localStorage.setItem` e i metodi di scrittura di `IDB` passano da una spia
   che registra e avvisa, poi rilancia l'eccezione o lascia la promessa
   rifiutata. Il comportamento non cambia — chi ha un `catch {}` continua a
   ingoiarla — ma il silenzio non c'è più.

   Resta vero che una revisione voce per voce direbbe, per ognuno di quei
   duecento, se il salvataggio ingoiato andava anche *ritentato* o annullato.
   Quella non è stata fatta.

2. **Il carico su più giorni.** Il calendario ora esiste: quali giorni della
   settimana si produce e in quali date si è chiusi si dichiarano nelle
   impostazioni (`calendarioProduzione`), e capacità e scadenze li usano. Il
   predefinito resta lunedì-venerdì senza chiusure — cioè il comportamento di
   prima — e la vista dice quando sta usando il calendario del laboratorio.
   Le festività non si inventano: nessun elenco nazionale preconfezionato,
   chi chiude a Ferragosto lo scrive.

   Restano fuori: i turni (la capacità giornaliera è un numero solo per
   macchina), le lavorazioni parallele sulla stessa macchina, e la coda che è
   trattata come sequenziale. Dove i dati non arrivano, la stima si dichiara
   incompleta invece di inventare.

3. **La conversione «visto dal cliente».** Lo stato esiste nel vocabolario ma
   nessuna parte dell'applicazione registra una data di visione: nessun
   preventivo risulterà mai «visto» finché quel dato non esiste. Dedurlo
   dall'invio sarebbe una statistica inventata.

4. **Le 15 registrazioni di Escape e i 35 gestori `keydown` globali** rilevati
   dall'audit dell'interfaccia sono preesistenti e non sono stati toccati:
   nessuno di essi è sul percorso di questa fase, e ritirarli senza capire
   quale finestra chiude ciascuno è il modo classico di rompere una modale.

---

## Come si verifica tutto

```bash
npm run verify   # 224 file JS parsati
npm test         # 1313 test unitari
npm run qa       # 40 suite su browser reale
```

## FASE 9 — regressione sulla sidebar

La soluzione della fase precedente non è stata toccata. Riverificata nella
regressione completa:

| Controllo | Esito |
|---|---|
| Gruppi chiusi all'avvio | 0 su 9 ✔ |
| Voci di menu visibili | 110 su 110 ✔ |
| «Mostra / Nascondi Accesso Rapido» | assente ✔ |
| Ricerca rapida | funzionante ✔ |
| Memoria dei gruppi dopo il ricaricamento | rispettata ✔ |
| Scorrimento della barra | 4234 px in 593, scorre ✔ |
