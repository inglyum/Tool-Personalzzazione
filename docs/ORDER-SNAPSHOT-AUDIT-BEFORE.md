# Lo storico economico prima della Fase 30

Misurato sul codice consegnato, non dedotto.

## Che cosa conservava un ordine

`Pipeline.confirm(quoteId)` — `src/legacy/app/src/modules/orders/index.js:1055` —
è l'unico punto in cui un preventivo diventa un ordine. Creava questo:

```js
await IDB.put('orders', {
  id: orderId,
  name: q.name, client: q.clientName, clientId: q.clientId,
  status: 'working', priority: 'alta', dueDate: q.deadline,
  value: q.grossPrice || 0,          // ← il lordo
  desc: q.notes, originQuote: quoteId,
  createdAt: …, updatedAt: …,
});
```

e, accanto, una vendita con `amount: q.grossPrice` e `materialCost: q.totalCost`.

**Due numeri.** Il totale e il costo materiale. Non c'erano righe, non c'era il
dettaglio dei costi, non c'era il margine, non c'era lo sconto concesso, non
c'era la politica di prezzo, non c'era la versione del motore che aveva fatto il
conto. `OrderLine` non esisteva come concetto: l'ordine non sapeva *cosa*
conteneva, solo quanto era costato in totale.

## Perché è un blocker e non una mancanza estetica

Il difetto non si vede il giorno in cui nasce. Nasce a marzo, quando l'ordine
viene confermato, e si manifesta a settembre.

A settembre il filamento è rincarato del 15%. Chi riapre l'ordine di marzo per
capire se quel lavoro era conveniente legge un margine — e quel margine è
cambiato. Non perché fosse sbagliato allora: perché nessuno l'aveva congelato
allora, e ogni vista che voglia mostrare un margine deve ricalcolarlo dai dati
di **oggi**.

Un report di redditività costruito così misura i costi di oggi applicati alle
vendite di ieri. È plausibile, è precisissimo nella forma, ed è falso. Non c'è
modo di accorgersene guardandolo: i numeri non hanno nulla di strano.

Le tre conseguenze pratiche:

| Domanda | Risposta prima della Fase 30 |
| ------- | ---------------------------- |
| Quanto ho guadagnato su quell'ordine? | un numero che cambia da solo |
| Perché il margine era basso? | non si può sapere: il dettaglio non esiste |
| Il prezzo l'ha deciso il sistema o l'ho deciso io? | non registrato |

## Il difetto collaterale trovato durante l'audit

Cercando un modo di **ricostruire** lo storico dai campi salvati si è misurato
che gli ingredienti salvati non erano fedeli.

`Quoter.saveQuote` scrive:

```js
markup: parseFloat(eid('qr-markup')?.value || 100) / 100     // campo 100 → salvato 1
```

mentre `_statoPrezzo`, che alimenta il motore, usa `1 + percentuale/100`
(campo 100 → ricarico 2). Sono due semantiche diverse per lo stesso nome.

Le tre funzioni che ricaricano un preventivo salvato rimettevano il valore
salvato dentro il campo che si aspetta una percentuale:

| File | Riga | Cosa faceva |
| ---- | ---- | ----------- |
| `mod:quoter/index.js` | 1658 | `sv('qr-markup', q.markup)` |
| `mod:orders/index.js` | 90 | `eid('qr-markup').value = q.markup \|\| 100` |
| `mod:items/index.js` | 2208 | `setV('qr-markup', q.markup \|\| 100)` |

Un preventivo salvato al 100% si riapriva all'1%. Misurato su un costo di
100 €: il prezzo netto passava da **200,00 €** a **111,11 €** — il pavimento di
margine limitava il danno (senza, sarebbe stato 101 €) ma non lo annullava. Il
44% in meno, senza un avviso, perché niente sapeva che quel numero non l'aveva
scelto nessuno.

`q.markup || 100` non salvava la situazione: `1` è un valore vero, quindi il
ripiego non scattava mai.

È anche la ragione per cui lo snapshot si congela **alla quotazione** e non si
ricostruisce dopo: gli ingredienti salvati non erano fedeli abbastanza da
poterli rimettere nel motore.

## Dove si guarda il passato

Le viste che disegnano un ordine già confermato, censite da
`scripts/audit-historical-pricing.mjs`:

| Vista | File |
| ----- | ---- |
| `Orders.openDetail` | `mod:orders/index.js` |
| `OrderFlow.openDetail` | `mod:orders/index.js` |
| `_drawerTabOverview` / `Items` / `Payments` / `Timeline` | `mod:orders/index.js` |

Nessuna di queste mostrava economia: la modale aveva un campo «Valore €»
modificabile a mano, il drawer un totale. Il rischio, quando si aggiunge un
pannello economico, è di riempirlo chiamando il motore — ed è esattamente
quello che il cricchetto della Fase 30 rende impossibile.
