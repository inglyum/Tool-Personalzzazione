# LA DISTINTA ECONOMICA — dal preventivo alla vendita

## Il problema

Un preventivo salvato conservava tre numeri: `totalCost`, `netPrice`,
`grossPrice`. Le voci che li avevano prodotti restavano nel calcolo e non
arrivavano da nessuna parte. L'ordine che ne nasceva aveva un totale e
nient'altro, e alla domanda «perché costa così?» non poteva rispondere nessuno.

E la vendita che nasceva dall'ordine leggeva `o.value` — un campo che gli
ordini del preventivatore non scrivono mai. **Nasceva a zero euro.**

## Il modello

```
quote.costBreakdown     le voci, come si leggono nel preventivo
quote.pricingSnapshot   la fotografia, congelata

order.costBreakdown     le voci copiate
order.pricingSnapshot   la promessa fatta al cliente — non si tocca mai
order.currentPricing    quello che si sta facendo davvero — modificabile
order.pricingHistory    chi ha cambiato cosa, e quando

sale.costBreakdown      la distinta al momento della vendita
sale.pricingSnapshot    e quella preventivata, per il confronto
```

La differenza fra `pricingSnapshot` e `currentPricing` è lo **scostamento**, ed
è l'unica cosa che a fine mese risponde a «su questo lavoro ci ho guadagnato
quanto pensavo?». Sovrascrivere il primo con il secondo — la cosa più facile da
fare — cancella la domanda insieme alla risposta.

## Una riga

```js
{ id, category, label, description, quantity, unit,
  unitCost, totalCost, source, confidence, editable }
```

`source` non è decorazione: «Filamento PLA € 6,38» detto dal magazzino, con il
costo reale degli acquisti, e lo stesso numero digitato a mano sono due
affermazioni con due gradi di affidabilità diversi.

Le quantità arrivano dagli **ingressi** del calcolo — i grammi, le ore, i
minuti. Senza, la tabella «voce · quantità · costo unitario · totale» mostra
solo l'ultima colonna, che è quello che si vedeva prima.

Una voce di cui non si conosce la quantità resta senza costo unitario:
inventarne una — lo scarto è una percentuale, non un pezzo — produrrebbe un
numero che sembra un prezzo e non lo è.

## Due decisioni che vale la pena spiegare

**Non si inventano voci.** Se il preventivo non ha imballo, la distinta non ha
una riga imballo a zero: ha una riga in meno. Una riga a zero direbbe che
l'imballo c'è e non costa niente.

**Quando un costo sale, è il margine a scendere.** La prima versione
ricalcolava il prezzo dal margine, e su un preventivo dello Smart Quoter — dove
il prezzo nasce dai prezzi di riga, non da un margine sul costo — lo faceva
**crollare da € 385 a € 76**. Il prezzo concordato resta; riprezzare è una
decisione commerciale separata. È anche l'informazione che serve davvero: se il
materiale è costato di più, non è il cliente a pagarlo di colpo.

## Difetti trovati e corretti

1. **La vendita nasceva a zero euro.** `Orders.toSale` leggeva `o.value`.
2. **Due conversioni a vendita**, e ho corretto prima quella sbagliata:
   `Orders.toSale` e `OrderFlow.convertToSale`. Il pulsante del cassetto usa la
   seconda — cioè quella che si preme davvero.
3. **Il preventivo si duplicava.** `saveQuote()` azzerava `editId`, quindi il
   salvataggio che `sendToWorkflow` fa da sé ne creava un secondo identico, e
   l'ordine finiva collegato al duplicato.
4. **La distinta non tornava con se stessa.** Prendere `marginPct` dal motore
   dava «margine 50%» accanto a numeri che ne dicevano 92,7 — il motore calcola
   su una base di costo diversa dalla somma di queste righe. Il margine della
   distinta è ora quello della distinta.
5. **Sei implementazioni di `_openDetail`.** Cinque patch avvolgono la sesta e
   cercano tutte un `#go-detail-modal` che solo la patch 055 crea: sono codice
   morto. La card è montata nella 055, che è il dettaglio che si apre davvero.

## Esito

| Passaggio | Esito |
| --------- | ----- |
| preventivo → distinta salvata | PASS — voci, categorie, fonti, snapshot |
| distinta → ordine | PASS — tre copie che non condividono oggetti |
| modifica in lavorazione | PASS — snapshot intatto, scostamento calcolato |
| ordine → vendita | PASS — importo corretto e distinta al seguito |
| dopo il ricaricamento | PASS — tutto rileggibile |
| card «Economia ordine» | PASS — voci modificabili, provenienza, scostamento |
| Product Builder / Catalogo | NON VERIFICATO con una prova browser dedicata |

**Prove:** `tests/quote-order-economics.test.mjs` (22 casi) ·
`tests/qa/distinta-economica.mjs` (35 controlli, con ricaricamento vero).
