# Redditività — quale lavoro rende davvero

> `src/product/redditivita.js` · `ProfitScope` in `src/legacy/app/src/modules/sales/index.js`
> Test: `tests/redditivita.test.mjs` (35) · `tests/qa/redditivita.mjs` (25)

## La sezione era rotta in due modi insieme

**Non veniva mai disegnata.** La rotta `profitscope` in `app.js` era:

```js
profitscope:()=>{if(typeof ProfitLeakDetector!==typeof undefined)ProfitLeakDetector.renderPage?.();},
```

`ProfitLeakDetector` **non è definito in nessun file del progetto**. Misurato: ci
sono quattro riferimenti, tutti protetti da `typeof`, tutti in `app.js`,
`ai/index.js`, `marketing/index.js` e `dashboard/index.js`. Nessuna
definizione. Lo stesso schema di `RevSim`: una promessa scritta come se fosse
codice.

Chi apriva la sezione vedeva il segnaposto scritto nel markup — «Profit Leak
Detector · Identifica dove perdi margine» — con un pulsante che portava
altrove. Nel frattempo `ProfitScope` esisteva davvero: duecento righe in
`sales/index.js`, esportato su `window`, e **non lo chiamava nessuno**. Una
sezione intera orfana per un nome sbagliato in una riga di routing.

**E rispondeva con numeri inventati.** Quando finalmente la si guardava:

| Cosa diceva | Perché è stato tolto |
| ----------- | -------------------- |
| «€8/ora — sotto il minimo vitale» | Soglia senza fonte, presentata come fatto |
| «Target consigliato: €20+/ora» | Idem |
| «Sei sopra la media per artigiani» | Una media che nessuno ha misurato |
| Ore attribuite al prodotto cercando il nome del timer dentro il nome del prodotto, con dieci caratteri di sottostringa | Un «Portachiavi laser» e un «Portachiavi 3D» finivano nello stesso mucchio |
| `cost` = `materialCost` | Il margine usciva più alto del vero di tutta la manodopera |

## Cosa risponde adesso

La domanda che la sezione prometteva è la più utile che un laboratorio possa
farsi: **mi conviene più il laser o la stampa 3D?** Da quando l'ordine porta
`economic`, il programma conosce il costo di ogni lavoro e non solo il prezzo,
quindi può rispondere.

`InglyRedditivita` raggruppa gli ordini per **tecnologia**, **cliente**,
**canale** o **macchina** e dà tre numeri diversi, diversi apposta:

1. **Margine totale** — quanto ha lasciato in tutto. Premia il volume.
2. **Margine per ordine** — quanto lascia un lavoro tipico. È il numero su cui
   si decide se accettarne un altro uguale.
3. **Margine per ora** — quanto lascia un'ora di laboratorio. È l'unico che
   risponde davvero a «cosa conviene fare», perché le ore sono la cosa di cui
   ce n'è una quantità fissa.

## Le regole che il modulo non viola

**Un ordine senza costo dichiarato non entra nel margine.** Non come zero —
zero vorrebbe dire «prodotto gratis» e gonfierebbe la redditività del gruppo
esattamente in proporzione ai dati che mancano — ma come escluso, e il gruppo
dichiara quanti ne ha esclusi. Il ricavo invece si vede tutto.

**La percentuale di margine si calcola sul ricavo coperto**, cioè sul ricavo
dei soli ordini di cui si conosce il costo. Usare il ricavo totale la
abbasserebbe in proporzione agli ordini scoperti, e farebbe sembrare meno
redditizio chi ha soltanto meno dati.

**Sotto il 50% di copertura il gruppo non entra in classifica.**
`COPERTURA_MINIMA_PCT` è dichiarata nel file perché si possa discutere: non è
una soglia di verità, è una soglia di leggibilità. Un gruppo con due ordini su
dieci coperti non è un gruppo su cui decidere, e la riga lo scrive invece di
mostrare un margine che racconta un quinto della storia.

**Le ore non si deducono mai dal prezzo.** Dedurle dal prezzo renderebbe il
margine per ora una funzione del margine, cioè un numero che conferma sempre
sé stesso. Si leggono da `economic.hours` (o `minutes`, o dai campi storici) e
dove non ci sono la risposta è `—`, non una stima.

**Le ore di un ordine senza costo non entrano nel denominatore.** Altrimenti
il margine per ora avrebbe al numeratore un margine e al denominatore ore che
non gli appartengono.

**Il confronto non dà consigli che non può fondare.** `confronto()` nomina il
migliore e il peggiore per margine orario fra i gruppi confrontabili. Se non
ce ne sono almeno due, dice perché — non riempie il vuoto con una massima.

## Il difetto trovato dal collaudo a schermo

Alla prima esecuzione di `tests/qa/redditivita.mjs` il caso costruito apposta —
il laser fattura dieci volte tanto e lascia meno per ogni ora occupata — ha
fatto cadere un solo controllo, e ha rivelato un difetto vero: **le due metà
della pagina si contraddicevano**. Il verdetto in alto nominava la stampa 3D
come migliore (per ora), la tabella sotto metteva il laser al primo posto (per
margine totale). Chi scorreva la tabella concludeva il contrario di chi
leggeva il banner.

Non era un errore di calcolo: erano due ordinamenti impliciti sulla stessa
schermata. Da qui l'ordinamento è **un parametro dichiarato**:

```js
InglyRedditivita.per(ordini, 'tecnologia', { ordine: 'marginePerOra' })
// → esito.ordine, esito.ordineLabel
```

La schermata lo sceglie in automatico — per ora quando le ore ci sono, per
margine totale quando no — lo scrive accanto alla classifica («in classifica
ora: Margine per ora») e lascia cambiarlo. Chi il numero scelto non ce l'ha
finisce sotto a chi ce l'ha, mai a zero: un gruppo senza ore dichiarate non
vale zero euro all'ora, semplicemente non lo sa.

## Quali ordini si contano

Quelli arrivati in fondo: `delivered`, `sold`, `invoiced` — gli stadi delle
colonne del kanban ordini, non un elenco parallelo. Gli ordini più vecchi delle
colonne attuali non portano `stage` e si riconoscono dalle date di chiusura
(`invoicedAt`, `soldAt`, `deliveredAt`) o da `paymentStatus: 'paid'`.

Un ordine ancora in lavorazione ha un prezzo ma non ha una storia: contarlo
sposterebbe il margine di un gruppo a ogni trascinamento di card nel kanban.

## Cosa resta fuori, e perché

La redditività **per prodotto** — che è la domanda che il vecchio ProfitScope
provava a fare — richiede il costo per riga d'ordine, non per ordine. Le righe
congelate dello snapshot lo portano (`totalCostSnapshot`), ma solo gli ordini
nati dal preventivatore hanno lo snapshot: costruirla oggi darebbe una
classifica di prodotti calcolata su una parte dell'archivio, senza che si veda
quale parte. Resta da fare quando la copertura dello snapshot sarà misurata.
