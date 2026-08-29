# ERP-DATA-CONTRACT — chi possiede cosa

Un dato ha **una sola fonte primaria**. Gli altri moduli la referenziano per
id: non ne tengono una copia, non la reinterpretano, non la ricalcolano.

La regola nasce da difetti misurati in questo progetto, non da teoria: due
sistemi di preferiti su due memorie diverse, due moduli Impostazioni con gli
stessi campi dove solo il primo veniva salvato, quattro motori di prezzo che
davano quattro cifre allo stesso lavoro.

---

## Le entità e chi le possiede

| Entità | Fonte primaria | Store | Referenziata da |
|---|---|---|---|
| **Company** | Impostazioni | `settings` chiave `main` | PDF, fatture, catalogo, report |
| **Customer** | Clienti | IDB `clients` | Preventivi, Ordini, Vendite, CRM |
| **Supplier** | Fornitori | IDB `suppliers` | Materiali, Acquisti |
| **Material** | Magazzino → `Materials` | IDB `materials` | Product Builder, quoter, Catalogo |
| **Machine** | Macchine | IDB `equipment` | Product Builder, quoter, ROI |
| **Item** | Magazzino → `ItemsModule` | IDB `items` | Preventivi, Ordini, Catalogo |
| **Product** | Catalogo | IDB `catalog` | Preventivi, Vendite, Etsy |
| **Quote** | Smart Quoter | IDB `quotes` | Ordini, Report |
| **QuoteLine** | dentro `Quote` | — | — |
| **Order** | Gestione Ordini | IDB `orders` | Produzione, Fatture, Dashboard |
| **OrderLine** | dentro `Order` | — | — |
| **InventoryTransaction** | *non esiste ancora* | — | — |
| **Purchase** | *non esiste ancora* | — | — |
| **Invoice** | Finance | IDB `sales` | Prima nota, Report |
| **Payment** | Finance | IDB `cashflow` | Prima nota |
| **Project** | Progetti | IDB `projects` | Ordini |
| **ProductionJob** | Gestione Ordini (stato `produzione`) | IDB `orders` | Workflow |

### Le due caselle vuote sono una scelta, non una dimenticanza

`InventoryTransaction` e `Purchase` non esistono. Le giacenze oggi sono un
**numero** dentro il record dell'articolo, non il saldo di un registro di
movimenti. Significa che non si può rispondere a «perché ho 7 pezzi invece di
12» — e che due scritture concorrenti si sovrascrivono.

Costruirle è il prerequisito di qualunque costo medio o costo per lotto: senza
un registro dei movimenti, il «costo medio ponderato» non ha un dato su cui
calcolarsi. È per questo che `InventoryCostResolver` non è stato scritto in
questa fase — sarebbe stato un risolutore senza niente da risolvere.

---

## Le relazioni

```
Customer ──< Quote ──< QuoteLine >── Item / Product
    │           │
    │           └──> Order ──< OrderLine ──> ProductionJob
    │                  │
    │                  ├──> Invoice ──> Payment
    └──────────────────┘

Supplier ──< Material >── Item
Machine ──< ProductionJob
Company ──> tutti i documenti
```

Ogni passo conserva il riferimento al precedente: `Order.quoteId`,
`Invoice.orderId`, `QuoteLine.itemId`. È ciò che permette di risalire da un
pagamento al preventivo che l'ha originato.

---

## Lo snapshot economico

Un ordine confermato **congela** il conto. Se domani il costo del materiale
sale, l'ordine di ieri non deve cambiare: era quello il margine con cui è stato
accettato.

Campi previsti su `OrderLine`:

```
costSnapshot      il costo al momento dell'accettazione
priceSnapshot     il prezzo concordato
marginSnapshot    il margine che ne risultava
policySnapshot    quale posizionamento era in uso
taxSnapshot       aliquota applicata
discountSnapshot  sconto concesso, dopo il pavimento
shippingSnapshot  costo e addebito della spedizione
```

**Stato: previsti, non ancora scritti.** Il motore produce già tutti questi
numeri — `QuoteCalculationResult` li contiene — ma la conversione da preventivo
a ordine non li conserva. Finché non lo fa, uno storico economico letto oggi
mostra i costi di oggi applicati agli ordini di ieri.

---

## Cosa NON va duplicato

| Tentazione | Perché no | Cosa fare |
|---|---|---|
| Copiare il nome del cliente nell'ordine | cambia il cliente, non l'ordine | `customerId` + nome come ripiego |
| Copiare il costo del materiale nel prodotto | due verità che divergono | riferimento + snapshot solo alla conferma |
| Un secondo elenco di macchine per un quoter | è successo, ed è stato ritirato | `equipment` |
| Un secondo catalogo prodotti in un modulo | è successo nell'apparel | `items` con categoria |
| Ricalcolare un margine in ogni schermata | alcune usano il costo, altre il ricavo | `InglyCostEngine.margineDi` |
