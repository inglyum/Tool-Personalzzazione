# Previsioni — una sola, e dichiara quanto vale

> `src/product/previsioni.js` · `FinancialForecaster` in `sales/index.js` · `BDW` in `settings/index.js`
> Test: `tests/previsioni.test.mjs` (25) · `tests/qa/previsioni.mjs` (19)

## Quattro implementazioni, e vinceva quella sbagliata

Il programma prometteva le previsioni in tre voci di menù. Misurando si è
scoperto che le implementazioni erano **quattro**, e che quella che l'utente
vedeva davvero non era nessuna delle tre annunciate.

| Cosa | Dove | Cosa faceva |
| --- | --- | --- |
| `forecaster` | `FinancialForecaster`, sales | Regressione sulle vendite vere, what-if, breakeven, cash runway. **Non si è mai visto.** |
| `forecasting` | `Forecasting`, settings | 54 righe, un pulsante «Analizza & Prevedi», sotto un'intestazione che prometteva «Scenario planning · Break-even · Cash runway» |
| `revsim` | `RevSim` | **Non definito in nessun file.** Il pulsante «Aggiorna» dentro `forecasting` chiamava lui |
| — | patch 106, `RENDERERS.forecaster` | Una tabella di ricavi mensili **scritti a mano**, partendo da valori d'esempio. **Questo è quello che si vedeva.** |

Il quarto vinceva per un motivo meccanico: patch 106 ha un `setInterval` da 600
millisecondi che, per ogni vista attiva del suo elenco, controlla
`if(!el.querySelector('[data-ai-rendered]'))` e in quel caso riscrive
`el.innerHTML` **per intero**. Così `#ff-root` — il contenitore che
`FinancialForecaster` riempie — veniva cancellato, e il modulo vero scriveva
dentro un nodo che non esisteva più. Misurato: `#ff-root` assente dal DOM,
`FinancialForecaster.render()` che restituisce senza errori e non cambia
niente, la vista ferma a 507 caratteri di tabella compilabile.

Un piano compilato a mano e una previsione calcolata sono due cose diverse.
Chiamarle con lo stesso nome era il modo per non avere né l'una né l'altra.

## Il difetto nel calcolo che restava

Anche la previsione vera, quando finalmente si vede, aveva due errori opposti
nella stessa formula.

**Dodici mesi fissi.** `revsArr` copriva sempre gli ultimi dodici mesi, e i
mesi in cui il laboratorio non esisteva ancora valevano **zero**. Un
laboratorio aperto da tre mesi otteneva una retta tirata attraverso nove zeri e
tre valori veri. Nove zeri non sono nove mesi andati male: sono nove mesi che
non ci sono stati.

**Il mese corrente dentro il calcolo.** Il mese in corso è sempre incompleto.
Il giorno 3 la serie mostra un crollo che non esiste, e la regressione lo
insegue.

Da quella formula uscivano tre cifre in euro precise all'unità, mostrate come
fatti.

## Cosa fa adesso `InglyPrevisioni`

1. **La finestra parte dal primo mese con attività.** Un mese a zero *dentro*
   la finestra resta zero — quello è un fatto — ma prima dell'inizio non si
   inventa storia.
2. **Il mese corrente resta fuori**, e torna a parte come parziale.
3. **Sotto quattro mesi conclusi non si prevede niente**, e si dice perché.
   `MESI_MINIMI` è dichiarata nel file perché si possa discutere. `null` è una
   risposta; tre cifre precise costruite su tre punti no.
4. **Si dichiara quanto la retta spiega i dati** (`r2` → attendibilità buona /
   discreta / debole) e **quanto è largo l'errore tipico** (`intervallo`, che
   si allarga andando avanti: prevedere fra tre mesi è più incerto che fra
   uno). Nessuno dei due è inventato — escono dagli stessi numeri della
   previsione.

L'attendibilità debole **non nasconde** il numero, lo accompagna: nascondere la
previsione quando i dati ballano sarebbe l'eccesso opposto, e chi guarda ha
diritto al numero e al suo peso.

Dove la previsione non c'è, adesso si legge un trattino e il motivo. Prima si
leggeva `fmtCur(undefined)`, che il formattatore traduceva in un euro-zero
indistinguibile da una previsione di chiusura.

## Cosa è stato ritirato

- **`forecasting`** → alias di `forecaster`. Il modulo resta come rinvio: la
  ricerca e i collegamenti vecchi usano quel nome.
- **`revsim`** → alias di `forecaster`. Le viste `#view-forecasting` e
  `#view-revsim` non ci sono più.
- **`_sezione()` e `InglySezioneIncompleta`** — il pannello che spiegava
  l'assenza di `RevSim`. Copriva solo quella sezione, e quella sezione ora
  porta a una che funziona. Un nome che apre qualcosa di vero è meglio di una
  spiegazione ben scritta del vuoto. Con loro se ne vanno 20 test unitari e 23
  controlli browser: la copertura scende di 43 controlli su un meccanismo che
  non ha più niente da coprire.
- **Il renderer `forecaster` di patch 106** — la tabella compilabile che
  vinceva sul calcolo vero.

## Come leggere quello che si vede

La riga in cima alla sezione dice sempre due cose: **su quanti mesi conclusi**
si basa la previsione e **quanto la tendenza spiega** i mesi passati. Sono le
due informazioni che rendono la cifra leggibile — o la smascherano. Tre cifre
precise su quattro mesi ballerini non sono una previsione, e chi guarda deve
saperlo prima di decidere.
