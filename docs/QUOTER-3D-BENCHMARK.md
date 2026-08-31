# Smart Quoter 3D — ricostruzione sul benchmark

Riferimenti funzionali: 3dprintingcostcalculator.com e stimalo.com. Nessun
codice, testo, grafica o marchio è stato copiato: si è ricreata la **logica**,
dentro l'architettura che INGLY ha già.

Un preventivatore solo — `Print3DQuoter`. Un motore solo — `InglyCostEngine`.
Nessun `Print3DQuoterV2`, nessun secondo motore: `tests/qa/quoter-3d-benchmark.mjs`
lo verifica a runtime, non sul sorgente.

---

## 1. La pipeline

```
INPUT (campi, slicer, magazzino, macchine)
  → ingresso()            normalizza: un solo oggetto, letto una volta sola
  → InglyCostEngine       costo per voce, per livello, con provenienza
  → InglyCostEngine.prezzo margine o ricarico, mai confusi
  → snapshot              congelato nella riga di preventivo
```

Il preventivatore non ha una propria matematica. Quando la vista mostra un
numero, quel numero è uscito dal motore; quando la riga lo registra, registra
quello che è uscito dal motore, non un ricalcolo.

## 2. Che cosa è cambiato

| Prima | Adesso |
| ----- | ------ |
| Peso, tempo e macchina; supporti e spurgo sommabili due volte | Slicer come sorgente dichiarata (`COMPLETE_SLICER_TOTAL` / `MANUAL_BREAKDOWN` / `MODEL_ONLY`) |
| Un materiale, un €/kg | Più materiali per pezzo, ognuno con i suoi grammi e il suo prezzo |
| Prezzo materiale da un campo | Quattro politiche: FIFO, costo medio, ultimo acquisto, a mano — dal registro di magazzino |
| Minuti umani sparsi in tre campi | Sette fasi, l'avviamento marcato «per lavoro» |
| Nessuna spesa generale | Tre modi (per lavoro, per ora macchina, percentuale), alternativi e mai sommati |
| Sei scaglioni | Nove, fino a 1000, con miglior costo unitario, miglior prezzo cliente e miglior profitto totale |
| Cinque posizioni di prezzo | Sette (Ingrosso, Competitivo, B2B, Standard, Premium, Luxury, Su misura), configurabili |
| Un solo modo di compilare | Rapida e Professionale — stesso calcolo, meno campi |
| Nessun import | `.gcode` e `.3mf` letti **nella pagina** |
| Nessuna distinta | Distinta base da materiale, componenti e confezione |

## 3. Le formule

```
costo materiale   = Σ (grammi_i / 1000 × €/kg_i) × (1 + spreco%)
                    oppure (g + supporti + spurgo)/1000 × €/kg quando il materiale è uno
energia           = kWh × €/kWh    kWh: misurato → W medi → W di targa × ciclo
ammortamento      = (prezzo − residuo) / vita utile in ore × ore
manutenzione      = €/h × ore
manodopera        = (fasi per pezzo)/60 × €/h  +  avviamento/60 × €/h / qtà
scarto            = perdibile × t/(1 − t)
spese generali    = per lavoro / qtà · oppure €/h × ore presidiate · oppure % del costo
────────────────────────────────────────────────────────────────────
costo vero        = somma delle voci

margine  m%  →  prezzo = costo / (1 − m/100)
ricarico r%  →  prezzo = costo × (1 + r/100)
IVA          →  sul netto, mai dentro il costo
```

Margine e ricarico non si confondono mai: ogni prezzo restituisce entrambe le
letture. Su 10 € un ricarico del 40% fa 14,00; un margine del 40% fa 16,6667.

## 4. L'origine di € 12,78 → € 44,73

`var MARG = (1 - 1/3.5) * 100` — il vecchio moltiplicatore ×3,5 travestito da
margine del 71,43%, tenuto come predefinito durante il montaggio perché nessun
prezzo si muovesse. `1/(1 − 0,7143) = 3,5`. Il predefinito ora è la politica
Standard, 40%: 12,78 / 0,60 = **21,30**.

## 5. FIFO

Il calcolo è del resolver di magazzino, che lo aveva già; il preventivatore
adesso gli dice **quanto** consuma, che è l'informazione senza cui il FIFO non
è FIFO:

```
lotto 1   420 g @ 15,99 €/kg
lotto 2  1200 g @ 19,50 €/kg
consumo   500 g  →  420 × 15,99 + 80 × 19,50   (non 500 × una media)
```

Le unità che eccedono i lotti registrati non diventano zero euro: si dichiarano,
e il costo vale per la parte coperta.

## 6. Il segnaposto che mentiva

Trovato mentre si verificava «nessun secondo motore»: `patches/020` installava
un `Proxy` per dieci nomi non ancora definiti, e quel Proxy rispondeva
`function` a **qualunque** proprietà. Due difetti:

- il replay delle chiamate in coda confrontava `window[name] !== window[name]`
  — falso per costruzione: nessuna chiamata è mai stata rigiocata;
- i moduli veri sono `const NavGroups = {…}`, e un `const` di primo livello non
  crea una proprietà su `window`: `window.NavGroups` è rimasto il segnaposto
  per tutta la vita della pagina.

Il segnaposto adesso si dichiara (`__stub`) e passa la chiamata al modulo vero
quando compare.

## 7. Collaudi

| Suite | Che cosa presidia |
| ----- | ----------------- |
| `tests/benchmark-3d.test.mjs` | margine vs ricarico, sette politiche, multi-materiale, tre modi di spese generali, i casi 290 g/100 g/500 g, scarto 0% e 10%, quantità 1/5/10/100, IVA |
| `tests/slicer-import.test.mjs` | le grafie di Prusa, Orca, Bambu e Cura; il modello è il totale **meno** quel che si butta; e il parser non può contattare nessuno |
| `tests/qa/quoter-3d-benchmark.mjs` | tutto quanto sopra sulla pagina vera, più: nessun preventivatore parallelo, il costo della riga è il costo canonico, nessun moltiplicatore nascosto |
| `tests/qa/quoter-3d-coerenza.mjs` | schermo = PDF = WhatsApp = riga |
| `tests/qa/quoter-3d-redesign.mjs` | il ×3,5 non è più il predefinito |

## 8. Che cosa resta stimato

Energia da targa (marcata `stimata`; sale a `verificata` con i W medi, a
`misurata` con i kWh contati), manutenzione €/h e tasso di fallimento
predefiniti, vita utile macchina, e il prezzo materiale finché non c'è un
acquisto a registro — dichiarato «non verificato».

## 9. Non ancora fatto

- Il 3MF si legge quando contiene `Metadata/slice_info.config`: un progetto non
  ancora affettato non ha quei dati, e lo dice invece di indovinarli.
- Ogni piatto può avere la sua macchina nel file, ma il conto usa la macchina
  scelta a schermo: «Usa» carica un piatto per volta.
- Il confronto «preventivato contro reale» ha i dati (`InglyActualCost`) ma non
  ancora una schermata nel preventivatore.
