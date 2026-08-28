# QA-GRAPHICS — come si misura un difetto che si vede solo guardando

> Un testo sopra un altro testo non sposta il documento, non lancia eccezioni e
> non fa fallire nessun test. Arriva in produzione perché nessuno lo misura.

---

## 1. Cosa misura il collaudo grafico

```bash
node tests/qa/sovrapposizioni.mjs dist/INGLY-OS.html   # navigazione, 8 larghezze
node tests/qa/responsive.mjs      dist/INGLY-OS.html   # overflow, 5 larghezze × 8 sezioni
node tests/qa/duplicati.mjs       dist/INGLY-OS.html   # idempotenza dei render
```

`npm run qa` li esegue tutti.

Cinque larghezze — **1440 · 1280 · 1024 · 768 · 390** — per otto sezioni, più
tre cose che vivono fuori dalla vista attiva e che la misura dell'overflow non
vedrebbe: la topbar, la sidebar e una modale aperta apposta.

Per ognuna:

| Controllo | Fallisce quando |
|---|---|
| Overflow orizzontale | il documento diventa scorrevole di lato |
| Sovrapposizioni nella sidebar | due elementi visibili occupano lo stesso rettangolo |
| Sovrapposizioni con la ricerca aperta | il pannello dei risultati si disegna sopra il menu |
| Larghezza della sidebar | esce dal bordo, o è più larga dello schermo |
| Modale | sfora il viewport |

---

## 2. La cautela che rende il numero affidabile

`getBoundingClientRect()` restituisce la posizione di un elemento **anche
quando è fuori dall'area visibile di un contenitore che scorre**.

Senza ritagliare su quell'area, il primo rilevatore contava **53
sovrapposizioni** dove la geometria era perfettamente impilata. Un test che
grida al lupo è peggio di nessun test: la volta che ha ragione non gli si crede.

Il rilevatore vive in un solo posto — **`tests/qa/rilevatore.mjs`** — e da lì lo
importano tutti i collaudi grafici. Prima ce n'erano due, con due idee diverse
di cosa sia «visibile»: quando non erano d'accordo non c'era modo di sapere
quale avesse ragione.

Quello che fa:

1. scarta ciò che è `display:none`, `visibility:hidden` o `opacity:0`
2. scarta ciò che sta dentro un contenitore compresso (`max-height:0`)
3. **ritaglia il rettangolo di ogni elemento sull'area visibile di ogni antenato
   che scorre o taglia**, e confronta i rettangoli ritagliati
4. confronta **solo le foglie**: un contenitore di gruppo è alto quanto tutte le
   sue voci, e confrontarlo con la voce di un altro gruppo inventa sovrapposizioni
5. richiede una sovrapposizione di almeno 10 px per lato, per non contare i bordi

Il punto 3 è arrivato per ultimo ed è il più importante. Prima si scartava
l'elemento *interamente* fuori dall'area visibile, ma si confrontava per intero
quello che sporgeva anche di due pixel: una voce tagliata dal bordo del menu
risultava «sovrapposta» al riquadro di ricerca, dove sullo schermo non c'era
niente. Sedici falsi positivi.

Ciò che il rilevatore misura è quindi **ciò che viene davvero dipinto**, non ciò
che occupa coordinate. È lo stesso criterio dell'occhio di chi guarda.

---

## 3. Il controllo negativo — obbligatorio

Un rilevatore che non è mai diventato rosso non è un rilevatore: è una
decorazione. Ogni presidio grafico va provato **al contrario**.

Procedure eseguite davvero:

**a) il pannello di ricerca sopra il menu**

1. rimuovere la correzione (le due righe che nascondono il menu mentre si cerca)
2. ricostruire e rilanciare → **131 coppie a 1440, 110 a 1280, 37 a 1024**
3. rimettere la correzione, ricostruire, rilanciare → **0**

**b) il controllo negativo permanente**

`sovrapposizioni.mjs` costruisce a ogni esecuzione una sovrapposizione finta —
un clone di una voce, fissato sopra un'altra — e fallisce se **non** la vede.
Si aggiunge un clone invece di spostare una voce vera: togliere un elemento dal
flusso farebbe risalire tutte le altre, e la sovrapposizione costruita non si
verificherebbe più. (Il primo tentativo faceva esattamente questo errore e
dichiarava il rilevatore cieco.)

Se il passo 2 resta verde, il difetto non è quello che si pensava, oppure il
rilevatore non lo vede. In entrambi i casi il lavoro non è finito — ed è successo:
irrigidito il ritaglio al punto 3, il difetto del `!important` qui sotto **non**
tornava rosso. Verificato a schermo: quelle voci erano sì fuori posto, ma
tagliate via dal contenitore, quindi mai dipinte. Il rilevatore aveva ragione e
la correzione resta giusta per un'altra ragione — sotto.

---

## 4. I difetti trovati così

| Difetto | Come si presentava | Causa |
|---|---|---|
| 404 coppie sovrapposte | i risultati della ricerca leggibili *attraverso* il menu | `#search-dropdown` in posizione assoluta disegnato sopra la lista |
| Etichette illeggibili | l'intera voce diventava una pastiglia ciano | `mark.sh` con sfondo pieno su ogni corrispondenza |
| «NaNKB» nella barra di stato | un NaN mostrato all'utente | `for…in` su `localStorage` enumera anche i metodi del prototipo |
| Sette sovrapposizioni all'avvio | tre benvenuti sovrapposti su un archivio vuoto | tre sistemi di onboarding indipendenti |
| Voci di menu che nessuna regola poteva nascondere | le voci di un «Altro (n)» chiuso disegnate a coordinate reali | `.nav-item{display:flex !important}` in un layer basso, più due punti che scrivevano `style.display='flex'` in linea |
| Categorie che non si estendevano | otto gruppi muti al clic | due nomi di classe per lo stesso stato (`collapsed` e `is-collapsed`), posseduti da due moduli |

### Il caso del `!important`

Vale la pena raccontarlo perché è controintuitivo. Un `!important` dichiarato in
un **layer basso** batte qualunque dichiarazione normale di un layer alto — e
batte anche uno stile in linea. Finché `009-favs-quickbar` diceva
`.nav-item{display:flex !important}`, nessuna regola poteva più nascondere una
voce di menu: né quella del browser per un `<details>` chiuso, né quella del
design system, né il gestore dei moduli. Lo stesso valeva per le due righe che
scrivevano `el.style.display='flex'` prima di appendere una stella o un badge.

La correzione è togliere l'affermazione superflua, non aggiungerne una più forte:
`.nav-item` è già `display:flex` per foglio di stile in due posti.

`sovrapposizioni.mjs` presidia ora anche la **forma** del difetto, non solo il
sintomo: fallisce se una voce di menu torna a dichiarare `display` in linea.

Nessuno di questi è stato corretto nascondendolo. Le sovrapposizioni non sono
state coperte meglio: sono state rese impossibili.
