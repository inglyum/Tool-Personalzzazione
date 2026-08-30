# Perché il preventivatore 3D costa più dello slicer

Caso di calibrazione: **290 g, 9h57, riferimento € 4,50** (Bambu Studio).
Tutto quello che segue è misurato sul motore, non dedotto.

---

## 1. La misura, prima di toccare qualunque cosa

Con i valori predefiniti del quoter FDM — 24 €/kg, 150 W, 0,28 €/kWh, duty 0,6,
macchina 400 € su 2000 h, manutenzione 0,12 €/h, scarto 7%, manodopera 18 €/h,
avviamento 15 min, finitura 10 min:

| voce | € |
| ---- | -: |
| Materiale · 290 g | 6,96 |
| Energia · 150 W × 9,95 h | 0,25 |
| Ammortamento macchina | 1,99 |
| Manutenzione e consumabili | 1,19 |
| Finitura · 10 min | 3,00 |
| Scarto previsto · 7% | 0,78 |
| Avviamento · 15 min, su **un** pezzo | 4,50 |
| **Totale** | **18,68** |

**+ 315% sul riferimento.**

## 2. Le due cause, quantificate

### (a) Si confrontano due domande diverse — vale ~11,47 €

Costruendo il costo un livello alla volta:

| livello | € | quanto aggiunge |
| ------- | -: | -: |
| solo materiale | 6,96 | — |
| + energia | 7,21 | +0,25 |
| + macchina e manutenzione | 10,39 | +3,18 |
| + scarto | 11,18 | +0,78 |
| + manodopera (avviamento e finitura) | 18,68 | **+7,50** |

Lo slicer mostra **il materiale**. Il preventivatore mostrava il **costo
aziendale pieno**. La sola manodopera di avviamento e finitura vale 7,50 €:
più del riferimento intero.

Non è un errore di calcolo. È una risposta giusta a una domanda che nessuno
aveva fatto — e il preventivatore non diceva a quale domanda stesse
rispondendo, che è il difetto vero.

### (b) Il prezzo del materiale è diverso — vale ~2,46 €

```
4,50 € ÷ 0,290 kg = 15,52 €/kg   ← implicito nel riferimento
                     24,00 €/kg   ← valore predefinito INGLY
```

Il 55% in più. Con 15,52 €/kg il materiale costa **esattamente 4,50 €**: il
riferimento dello slicer è materiale puro, senza nemmeno l'energia.

## 3. Il terzo difetto, trovato mentre si misurava

Le spese generali orarie si spalmavano sulle ore **della macchina**.

Una stampante 3D lavora dieci ore da sola, spesso di notte. Con 4 €/h di
struttura:

| | € |
| - | -: |
| prima · 4 €/h × 9,95 h di stampa | **39,80** |
| dopo · 4 €/h × 0,42 h di persona | **1,67** |

Ventiquattro volte tanto. Il costo aziendale pieno passava da 18,68 € a
58,48 € appena si dichiaravano le spese generali — più del triplo del costo di
produzione, su un pezzo da 290 grammi.

Le spese generali si consumano quando **qualcuno è al lavoro**. Su una macchina
presidiata — il laser, la pressa — le due cose coincidono e non cambia niente;
su una che lavora da sola, cambia tutto. Il profilo ora lo dichiara
(`presidiata: false`), e `overheadHours` permette di scavalcarlo a mano.

## 4. Cosa **non** era rotto

Verificato uno per uno, come chiede il punto 12 della direttiva:

| sospetto | esito |
| -------- | ----- |
| markup applicato due volte | **no** — un solo punto applica il prezzo |
| margine trasformato in ricarico | **no** — `strategia: 'margine'` fa `costo / (1 − m)`, verificato: 40% → 166,67 e margine 40,0% |
| scarto duplicato | **no** — una sola voce, formula `perdibile × tasso/(1−tasso)` |
| ammortamento duplicato | **no** — una sola voce |
| avviamento duplicato | **no** — una tantum ÷ quantità, verificato su 1000 pezzi |
| costi applicati sia nel resolver sia nel motore | **no** — il resolver dà il costo del materiale, il motore compone |
| moltiplicatori nascosti | **no** — nessun fattore correttivo, e ora un test lo impedisce |

L'aritmetica era corretta. Il difetto era di **comunicazione** — e uno di
**attribuzione**, quello delle spese generali.

## 5. La correzione

**Non** si è abbassato nessun numero. Si sono aggiunti i **livelli di costo**:

| livello | contiene | il caso di calibrazione |
| ------- | -------- | -: |
| `stampa` | materiale, energia | 7,21 € |
| `macchina` | + macchina, manutenzione, scarto, confezione | 11,18 € |
| `completo` | + il tuo tempo, avviamento, spese generali | 18,68 € |

Il livello predefinito resta **`completo`**, cioè il comportamento che il
motore ha sempre avuto: cambiarlo sposterebbe in silenzio il prezzo di ogni
preventivo già costruito. Chi vuole il costo di stampa lo dichiara.

Ogni risultato porta `livello`, `livelloLabel`, `livelloSpiega`, `escluse` e
`esclusoTotale`: «questo livello non conta la manodopera» è un'informazione,
non un silenzio.

## 6. La calibrazione spiega, non aggiusta

`InglyCostEngine.calibra(ingresso, { costo, sistema })` confronta il
riferimento con tutti e tre i livelli e dice quale risponde alla stessa
domanda:

```
riferimento € 4,50 (Bambu Studio)

  Costo di stampa            €  7,21    +2,71    +60%
  Costo di produzione        € 11,18    +6,68   +148%
  Costo aziendale pieno      € 18,68   +14,18   +315%

  livello che risponde alla stessa domanda : Costo di stampa
  materiale implicito nel riferimento      : € 15,52/kg  (il nostro: € 24,00/kg)
```

Allineando l'unico ingresso che differisce, i due numeri coincidono: il
materiale fa **4,50 € esatti**.

**Nessun fattore di calibrazione**, e un test lo impedisce per il futuro:
`fudge`, `calibrationFactor`, `fattoreCorrettivo` non compaiono nel motore e
non potranno comparire. Un numero inventato per far coincidere due conti
nasconde la differenza invece di spiegarla.

## 7. Prestazioni

Obiettivo della direttiva: < 50 ms.

| | ms |
| - | -: |
| `calcola()` | 0,030 |
| `prezzo()` | 0,008 |
| `calibra()` · 3 livelli | 0,095 |
| `scaglioni()` · 11 quantità | 0,390 |

Due ordini di grandezza sotto.

## 8. Stato

| | |
| - | - |
| causa individuata e quantificata | **PASS** |
| nessuna duplicazione di costo | **PASS** — sette sospetti verificati uno per uno |
| livelli di costo | **PASS** — 3 livelli, default invariato |
| calibrazione | **PASS** — spiega, non aggiusta |
| spese generali sulle ore giuste | **PASS** — 39,80 € → 1,67 € |
| margine ≠ ricarico | **PASS** |
| 16 casi golden | **PASS** |
| prestazioni < 50 ms | **PASS** |
| zero regressioni | **PASS** — 768 test |
