# QA-GRAPHICS — come si misura un difetto che si vede solo guardando

> Un testo sopra un altro testo non sposta il documento, non lancia eccezioni e
> non fa fallire nessun test. Arriva in produzione perché nessuno lo misura.

---

## 1. Cosa misura il collaudo grafico

```bash
node tests/qa/responsive.mjs dist/INGLY-OS.html
node tests/qa/duplicati.mjs  dist/INGLY-OS.html
```

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

Il rilevatore quindi:

1. scarta ciò che è `display:none`, `visibility:hidden` o `opacity:0`
2. scarta ciò che sta dentro un contenitore compresso (`max-height:0`)
3. **scarta ciò che è fuori dall'area visibile del contenitore che scorre**
4. scarta le coppie in cui uno contiene l'altro
5. richiede una sovrapposizione di almeno 10 px per lato, per non contare i bordi

---

## 3. Il controllo negativo — obbligatorio

Un rilevatore che non è mai diventato rosso non è un rilevatore: è una
decorazione. Ogni presidio grafico va provato **al contrario**.

Procedura, eseguita davvero:

1. rimuovere la correzione (le due righe che nascondono il menu mentre si cerca)
2. ricostruire e rilanciare → **131 coppie a 1440, 110 a 1280, 37 a 1024**
3. rimettere la correzione, ricostruire, rilanciare → **0**

Se il passo 2 resta verde, il difetto non è quello che si pensava, oppure il
rilevatore non lo vede. In entrambi i casi il lavoro non è finito.

---

## 4. I difetti trovati così

| Difetto | Come si presentava | Causa |
|---|---|---|
| 404 coppie sovrapposte | i risultati della ricerca leggibili *attraverso* il menu | `#search-dropdown` in posizione assoluta disegnato sopra la lista |
| Etichette illeggibili | l'intera voce diventava una pastiglia ciano | `mark.sh` con sfondo pieno su ogni corrispondenza |
| «NaNKB» nella barra di stato | un NaN mostrato all'utente | `for…in` su `localStorage` enumera anche i metodi del prototipo |
| Sette sovrapposizioni all'avvio | tre benvenuti sovrapposti su un archivio vuoto | tre sistemi di onboarding indipendenti |

Nessuno di questi è stato corretto nascondendolo. Le sovrapposizioni non sono
state coperte meglio: sono state rese impossibili.
