# `order.economic` — l'ordine che sa quanto è costato

## Il difetto, come si vedeva

La card «Preventivato · Reale · Scostamento» mostrava:

```
Costo      € 0.00      —        —
Ricavo     € 150.00    € 150.00  € 0.00
Profitto   € 150.00    —        —
```

Un profitto uguale al ricavo, perché il costo risultava zero. La card leggeva
`o.cost`; gli ordini nati dal preventivatore scrivono `totalCost`. Ripiegava su
`o.cost` perché lo snapshot non c'era, e trovava un campo che nessuno scrive.

## La fonte di verità

Per la card, il preventivato viene **dall'ordine**, in quest'ordine:

1. `order.economic` — il modello canonico, congelato al preventivo
2. i campi economici dell'ordine, letti dai lettori canonici
3. `InglyOrderSnapshot` — solo come ripiego per ordini vecchi

Lo snapshot resta come storico immutabile e audit. Non è più la sorgente.

## Il modello

```js
economic: {
  currency, costTotal, revenueNet, revenueGross, profit,
  marginPct, markupPct, quantity,
  lines: [{ id, name, category, detail, quantity,
            productionCostUnit, productionCostTotal,
            salePriceUnit, salePriceTotal,
            profitUnit, profitTotal, marginPct, source }],
  costs: { materiale, energia, macchina, manutenzione, manodopera,
           setup, postProcesso, scarto, overhead, packaging,
           accessori, commissioni, spedizione, altro },
  pricing: { markupPct, discountPct, ivaPct, net, iva, gross },
  calculationVersion, calculatedAt
}
```

**`costs` non usa le categorie della distinta.** La distinta raggruppa la
manutenzione dentro «macchina», perché in tabella leggerle separate non aiuta.
Qui restano distinte: l'ammortamento dipende da quanto è costata la macchina,
la manutenzione da quanto la si usa. Sono due decisioni, e chi rilegge il costo
deve poterle separare.

**Il profitto è ricavo netto meno costo, e basta.** Non si somma voce per voce:
il prezzo lo decide il pricing sull'insieme, e ricavarlo dalle righe darebbe un
numero diverso da quello che il motore ha calcolato.

## I due lettori canonici

Il ricavo viveva in quattro campi e ogni funzione ne leggeva uno diverso.
`Orders.toSale` leggeva `value`, che gli ordini del preventivatore non
scrivono: **la vendita nasceva a zero euro**.

```js
InglyOrderEconomics.ricavoOrdine(order)       // lordo
InglyOrderEconomics.ricavoNettoOrdine(order)  // netto
InglyOrderEconomics.costoOrdine(order)        // { valore, noto }
```

`costoOrdine` restituisce anche `noto`, perché **zero e «non dichiarato» sono
due cose diverse**: un lavoro che costa poco e uno di cui non si è mai scritto
il costo non vanno mostrati allo stesso modo. Quando il costo non è noto la
card scrive un trattino e lo spiega, invece di un € 0,00 che sembra un dato.

Nessun campo è stato rimosso: i vecchi restano come ripiego, perché gli ordini
di ieri devono continuare ad aprirsi.

## Il cliente non vede il costo

Nel documento cliente compaiono descrizione, quantità, prezzo unitario, sconto,
imponibile, IVA e totale. Costo di produzione, margine, markup e profitto
restano dentro INGLY OS, nella sezione **«🔒 Economia preventivata — solo
interna»** del dettaglio ordine.

Verificato sul messaggio che il cliente riceve davvero:

```
Ciao! 👋
📋 *Preventivo: Medagliere*
💶 Totale: *€ 6,83* (IVA 22% inclusa)
```

## Un difetto trovato strada facendo

I costi extra del preventivatore avevano due predefiniti diversi da zero:
**imballo € 0,50 e spedizione € 4,50**. Su un preventivo di quattro voci
facevano € 6,50 di costi che nessuno aveva scritto. Finché quei campi non
entravano nel preventivo salvato la cosa restava invisibile; da quando i totali
sono unificati, entravano ovunque. Ora partono da zero, come le spese generali
dei profili economici: una spedizione predefinita è comunque una spedizione
inventata.

## I costi reali

`registraVoce` scrive il consuntivo in un record suo. **Non tocca `economic`**:
il preventivato resta quello promesso al cliente, e la differenza fra i due è
lo scostamento. È l'unica cosa che a fine mese dice se si è guadagnato quanto
si pensava.

## Prove

`tests/order-economic-model.test.mjs` — 14 casi, compreso quello del comando
(costo € 4,50, prezzo € 150, profitto € 145,50) e la granularità che non si
perde · `tests/qa/economia-ordine.mjs` — 34 controlli nel browser, dal
preventivo alla card ai reali, con l'ordine legacy che continua ad aprirsi.
