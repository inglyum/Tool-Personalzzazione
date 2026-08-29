# PRICING-ARCHITECTURE — dove vive la matematica dei prezzi

`InglyCostEngine` è l'unico motore. Questo documento dice chi ci passa, cosa
resta fuori, e quali soglie impediscono al residuo di crescere.

```bash
node scripts/classify-pricing-math.mjs            # le sei categorie
node scripts/classify-pricing-math.mjs --category D
node --test tests/architecture-cost-engine.test.mjs
```

---

## Perché non si conta «i file con formule»

Il conteggio grezzo diceva **55 file**. È un numero che spaventa e non aiuta:
dentro ci sono barre di completamento, medie di vendita, conversioni di unità e
librerie di terzi. Portarlo a zero cancellando aritmetica innocua sarebbe
lavoro sprecato che sembra progresso.

L'obiettivo non è zero formule. È **zero motori di prezzo duplicati**.

| | Categoria | Azione | File |
|---|---|---|---:|
| A | il motore di costo | mantieni | 1 |
| B | formattazione per la vista | mantieni | 0 |
| C | matematica non di prezzo | mantieni | 4 |
| **D** | **prezzo legacy** | **migra** | **13** |
| **E** | **regola commerciale nel codice** | **estrai in politica** | **7** |
| F | libreria di terzi | ignora | 0 |

---

## Chi passa dal motore

| Modulo | Punto di ingresso | Stato |
|---|---|---|
| Smart Quoter | `InglyQuoteAdapter.calculateQuote()` | **migrato** — 0 formule rimaste nel file |
| Smart Quoter 3D | `InglyPrint3D.cost()` → adapter | **migrato** — 200 casi identici prima/dopo |
| Laser Quoter B2B | `_calcV32()` → `calcola` + `prezzo` | **migrato** |
| Smart Quote Apparel | `calcLine()` / `calcQuote()` | **migrato** — difetti corretti |
| Product Builder | `PricingEngine.suggest()` → adapter | **migrato** |
| Catalogo | `PricingEngine.suggest()` | **migrato** (listini B2B ancora fuori) |

---

## Il contratto

Ogni quoter produce lo stesso oggetto, `QuoteCalculationResult`:

```
lines · subtotalCost · setupCost · overhead · totalCost
subtotalNet · discountRequestedPct · discountAppliedPct · vat
shipping { charged, cost, margin }
commissions { pagamentoPct, pagamentoFissa, marketplace }
totalGross
grossProfit · operatingProfit · netProfit · marginPct · markupPct
quantityTiers · floorProtection · warnings · recommendations
```

Una schermata scritta per un quoter funziona per gli altri.

### Le quattro righe del profitto

L'IVA non compare in nessuna di esse: è denaro dello Stato che transita.

```
profitto lordo         = prezzo netto − costo
dopo le commissioni    = − pagamento % − pagamento fisso − marketplace %
dopo la spedizione     = − (costo spedizione − spedizione addebitata)
profitto operativo     = − altri costi variabili
```

La spedizione ha due facce che venivano confuse: quanto si fa pagare e quanto
costa. Chi addebita 6 € e ne spende 9 perde 3 € a ogni ordine, e il conto
vecchio non lo mostrava.

---

## Le politiche

Vivono in `InglyCostEngine.POLITICHE`. La UI le **legge**, non le riscrive.

| id | margine obiettivo | sconto massimo | pavimento |
|---|---:|---:|---:|
| competitive | 25% | 10% | 12% |
| **standard** *(consigliato)* | 40% | 15% | 20% |
| premium | 55% | 20% | 30% |
| luxury | 70% | 25% | 45% |

`MARGINE_MINIMO` = 10%: nessuna combinazione di sconto e quantità scende sotto.

---

## Le soglie che presidiano il residuo

`tests/architecture-cost-engine.test.mjs` fallisce se uno di questi cresce.
Sono **misurati**, non stimati — il primo tentativo li aveva indovinati e due
erano sbagliati.

| Cosa | Soglia |
|---|---:|
| motori di prezzo duplicati (categoria D) | 13 |
| regole commerciali nel codice (categoria E) | 7 |
| prezzo da margine calcolato a mano | 1 |
| prezzo da ricarico calcolato a mano | 13 |
| sconto sul prezzo applicato a mano | 28 |
| IVA moltiplicata a mano | 6 |
| scaglioni di sconto scritti nel codice | 39 |

Scendono a mano, insieme al codice che li produce. Nessuno può salire.

---

## Cosa resta

I prossimi per peso reale, in ordine:

1. `mod:items/index.js` — 8 formule di prezzo, il residuo più grande
2. `p:050-pdf-template-system` — 4 formule nel generatore di PDF
3. `p:075-ai-market-intelligence` — scaglioni di sconto scritti nel codice
4. Listini B2B nel Catalogo — `campPrice` / `kitPrice` / `stockPrice`
5. `mod:orders/index.js` — un ricarico a mano
