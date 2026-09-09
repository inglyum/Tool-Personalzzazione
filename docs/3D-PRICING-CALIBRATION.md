# PRICING 3D — che cosa fa davvero salire il prezzo

La segnalazione era: «nove ore di stampa producono un prezzo molto superiore al
mercato, il costo macchina esplode». L'ho misurato prima di toccare la formula.

## Il caso, misurato

290 g, 9 ore, un pezzo, con i parametri predefiniti del preventivatore
(stampante 420 €, 3000 ore di vita utile):

| Voce | Importo | Peso |
| ---- | ------- | ---- |
| Materiale (290 g × 24 €/kg) | € 6,96 | 43% |
| **Avviamento** (15 min × 18 €/h) | **€ 4,50** | **28%** |
| Finitura (5 min) | € 1,50 | 9% |
| Macchina (0,14 €/h × 9 h) | € 1,26 | 8% |
| Manutenzione (0,12 €/h × 9 h) | € 1,08 | 7% |
| Scarto 7% | € 0,72 | 4% |
| Energia | € 0,23 | 1% |
| **Costo interno** | **€ 16,24** | |
| Prezzo (margine 40%) | € 27,07 | |

**Il costo macchina non era il problema.** € 1,26 per nove ore — l'8% del
costo. A pesare erano due cose diverse:

1. **L'avviamento**: quindici minuti pieni, addebitati per intero su un pezzo
   solo. Su dieci pezzi vale € 0,45 l'uno, su cento € 0,045. È corretto che sia
   così, ma su un pezzo singolo è la voce più grossa dopo il materiale.
2. **Il prezzo del materiale**: il predefinito era **24 €/kg**, contro i
   **15,50 €/kg** reali. Due euro e mezzo su un preventivo da quindici.

Con il prezzo vero del filamento lo stesso pezzo costa € 13,77 e si vende a
€ 22,95.

## Il costo macchina però *può* esplodere

E quando lo fa, niente lo segnala. La formula era:

```
(prezzo − valore residuo) / ore di vita utile
```

Corretta. Ma una macchina da **5000 € dichiarata a 500 ore** dà **10 €/h**, e
nove ore portano **90 €** di sola macchina. Non è un errore di formula: è una
formula che non ha idea di quando i suoi ingressi sono assurdi. E le ore di
vita utile sono il campo che si compila a occhio, sempre per difetto.

## `InglyMachineRate` — tre modalità e una soglia

| Modalità | Che cosa calcola |
| -------- | ---------------- |
| `manuale` | la tariffa la scrivi tu; niente viene ricalcolato |
| `ammortamento` | solo il recupero dell'investimento |
| `ibrido` *(predefinito)* | ammortamento **più** manutenzione annua ripartita sulle ore lavorate |

L'ibrida è il predefinito perché una macchina costa anche quando non si rompe.

**La soglia** (`maxRagionevole`) non è un limite arbitrario: è la domanda «una
macchina di questa categoria può davvero costare così tanto all'ora?».

| Tecnologia | Soglia |
| ---------- | ------ |
| Stampa 3D | 3 €/h |
| Sublimazione | 8 €/h |
| Laser | 12 €/h |
| DTF | 15 €/h |
| UV | 20 €/h |
| CNC | 25 €/h |

Quando scatta, la tariffa **non viene abbassata in silenzio**: si applica la
soglia e si dichiara, con il numero originale accanto e la domanda giusta —
*«controlla le ore di vita utile: 500 ore dichiarate su un prezzo di 5000 €»*.
Il rimedio vero non è un prezzo più basso, è un dato corretto.

La soglia si può alzare (`maxRagionevole`), e una macchina industriale costa
quello che costa. Ma va fatto scrivendolo, non lasciando che un valore fuori
scala passi inosservato.

## La curva

Con 290 g e prezzo del filamento reale, al variare delle ore:

| Ore | Costo | Macchina |
| --- | ----- | -------- |
| 1 | € 11,11 | € 0,14 |
| 3 | € 11,72 | € 0,42 |
| 5 | € 12,34 | € 0,70 |
| 9 | € 13,56 | € 1,26 |
| 15 | € 15,40 | € 2,10 |
| 24 | € 18,16 | € 3,36 |

Da 1 a 24 ore le ore si moltiplicano per 24, il costo per 1,6. È giusto che sia
così: materiale e avviamento non dipendono dal tempo. Un costo che crescesse
quanto le ore vorrebbe dire che qualcosa scala con il tempo e non dovrebbe —
ed è la forma che il test presidia.

## Che cosa resta da fare

- **Il predefinito del materiale è ancora 24 €/kg** nel campo del
  preventivatore. Quando il filamento è a magazzino il prezzo arriva da lì e il
  predefinito non si usa; per chi non ha ancora caricato il magazzino, resta.
- **La calibrazione col mercato** (range basso/mediano/alto, con l'avviso «il
  tuo costo interno è sopra il mercato») non è stata implementata in questo
  giro. Richiede prezzi di mercato con una fonte, e inventarli sarebbe peggio
  che non averli.
- **I profili HOBBY / MAKER / BUSINESS / PREMIUM** non esistono ancora.

## Prove

`tests/3d-realistic-pricing.test.mjs` — 22 casi: la curva su sei durate, la
macchina che esplode e la soglia che la ferma, le tre modalità, e la
manutenzione che non si conta due volte fra tariffa e voce di costo.
