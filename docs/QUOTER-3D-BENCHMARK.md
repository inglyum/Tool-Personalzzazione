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

---

# Fase 3D.2 — validazione

## Il caso di riferimento, fissato

PLA · 290 g · 9 h 57 m · 1 pezzo · 150 W al 60% · € 0,28/kWh · macchina € 400
su 2 000 h · manutenzione € 0,12/h · scarto 7% · manodopera € 18/h ·
avviamento 15 min · finitura 10 min.

| voce | 15,99 €/kg | 20,00 €/kg | 24,00 €/kg |
| ---- | ---------: | ---------: | ---------: |
| materialCost        | 4,6371 | 5,8000 | 6,9600 |
| energyCost          | 0,2507 | 0,2507 | 0,2507 |
| machineDepreciation | 1,9900 | 1,9900 | 1,9900 |
| maintenance         | 1,1940 | 1,1940 | 1,1940 |
| consumables         | 0,0000 | 0,0000 | 0,0000 |
| waste (spreco)      | 0,0000 | 0,0000 | 0,0000 |
| failure (scarto)    | 0,6076 | 0,6951 | 0,7824 |
| labor               | 7,5000 | 7,5000 | 7,5000 |
| hardware            | 0,0000 | 0,0000 | 0,0000 |
| packaging           | 0,0000 | 0,0000 | 0,0000 |
| overhead            | 0,0000 | 0,0000 | 0,0000 |
| **TRUE COST**       | **16,1794** | **17,4298** | **18,6771** |

Con € 15,99/kg, IVA 22%:

| posizione | netto | profitto | margine | ricarico | IVA | lordo |
| --------- | ----: | -------: | ------: | -------: | --: | ----: |
| Competitive 25% | 21,57 | 5,39 | 25,0% | 33,3% | 4,75 | 26,32 |
| Standard 40%    | 26,97 | 10,79 | 40,0% | 66,7% | 5,93 | 32,90 |
| Premium 60%     | 40,45 | 24,27 | 60,0% | 150,0% | 8,90 | 49,35 |
| Luxury 80%      | 80,90 | 64,72 | 80,0% | 400,0% | 17,80 | 98,69 |

`tests/calibrazione-290g.test.mjs` non copia questi numeri: li ricalcola dalle
grandezze dichiarate. Un test che copia l'output non si accorge mai di un
errore, lo certifica.

## La catena, provata sui documenti veri

`tests/qa/quoter-3d-integrita.mjs` non intercetta `totali()`: apre il PDF che
il preventivatore genera davvero e legge l'URL WhatsApp che compone davvero.

```
canonico  16,1794    (InglyCostEngine.calcola)
live      16,1794    (schermo)
voci      16,1794    (spiegazione, somma delle righe)
riga      16,1794    (snapshot della voce a preventivo)
netto     26,9657 = 16,1794 / (1 − 0,40)
PDF       32,90      WhatsApp 32,90      (netto + 22%)
```

Poi si cambia tutto — filamento a € 39,90, macchina a € 1 200, vita utile a
1 000 h, € 0,55/kWh, manodopera a € 30/h, avviamento a 45 min, margine al 70%,
IVA al 10% — e la voce a preventivo non si muove di un centesimo. Lo snapshot è
identico campo per campo; il costo vivo sì che cambia, e la schermata lo dice.

## Difetti trovati in questa fase

1. **Il FIFO non riceveva la quantità.** `material-cost.js` passava
   `richiesta:` dove il resolver legge `quantity:`. Il parametro veniva
   ignorato in silenzio e il FIFO rispondeva con il costo dei **lotti
   residui** invece che del prelievo — un numero corretto per un'altra
   domanda, che è il modo peggiore di sbagliare.
2. **La scala dell'energia era invisibile.** La confidenza della voce è la
   peggiore fra consumo e prezzo al kWh — corretto — ma dichiarare solo quella
   faceva sì che comprare una presa intelligente non cambiasse niente di ciò
   che si vede. Adesso la provenienza porta `confidenzaConsumo` e
   `confidenzaPrezzo` accanto alla complessiva, e la banda le mostra separate.
3. **La distinta rifaceva i conti.** Calcolava grammi × €/kg per conto suo:
   con uno spreco percentuale o un secondo materiale sarebbe divergita dal
   dettaglio senza che nulla lo dicesse. Ora legge le voci del motore.
4. **«Costo Vivo»** non aveva un significato contabile preciso.

## Preventivato vs Reale

`InglyScostamento` (puro, 12 test) più la card nel preventivatore. Il
consuntivo sta in `p3d_consuntivo_v1` e non tocca lo snapshot. Semaforo: verde
entro il 5%, giallo oltre, rosso in perdita o oltre il 20%. Quando lo
scostamento supera il 10% compare «Disponibili nuovi dati per aggiornare le
stime» — e nient'altro succede: la revisione la decide una persona.

## Architettura

```
InglyCostEngine   stima      →  QUOTE  (snapshot congelato)
InglyActualCost   consuntivo →  ORDER
InglyScostamento  confronto  →  VARIANCE
```

---

# Benchmark esterno — che cosa si è potuto confrontare, e che cosa no

## Il vincolo, dichiarato

I due siti di riferimento **non sono raggiungibili da questo ambiente**: il
proxy di rete risponde `403 CONNECT tunnel failed` per entrambi i domini.

```
https://3dprintingcostcalculator.com/   → EGRESS_BLOCKED
https://stimalo.com/calcola_costo       → EGRESS_BLOCKED
```

Quindi i numeri delle due colonne restano **N/D**. Non sono stati stimati, né
ricostruiti da ricordi: un benchmark con numeri inventati è peggio di un
benchmark mancante, perché sembra una misura.

## La tabella, con le colonne che si possono compilare

Scenario: PLA · 290 g · 9 h 57 m · 1 pz · € 15,99/kg.

| Componente | INGLY | 3DPCC | Stimalo | Note |
| ---------- | ----: | ----: | ------: | ---- |
| Material   | 4,6371 | N/D | N/D | 290 g × € 15,99/kg |
| Energy     | 0,2507 | N/D | N/D | 150 W × 60% × 9,95 h × € 0,28/kWh — **stimato da targa** |
| Machine    | 1,9900 | N/D | N/D | (400 − 0) ÷ 2000 h × 9,95 h |
| Maintenance| 1,1940 | N/D | N/D | € 0,12/h × 9,95 h |
| Labor      | 7,5000 | N/D | N/D | 15 min avviamento + 10 min finitura × € 18/h |
| Waste      | 0,0000 | N/D | N/D | spreco materiale 0% in questo caso |
| Failure    | 0,7824 | N/D | N/D | perdibile × 7%/(1−7%) |
| Hardware   | 0,0000 | N/D | N/D | nessun componente dichiarato |
| Packaging  | 0,0000 | N/D | N/D | nessuna confezione dichiarata |
| **Total Cost** | **16,1794** | N/D | N/D | costo aziendale pieno |
| **Standard Price** | **26,97** | N/D | N/D | margine 40% → costo ÷ 0,60 |

## Il livello di costo — la parte del confronto che conta davvero

Anche potendo leggere i due siti, confrontare i totali sarebbe stato
scorretto senza prima dichiarare **a quale domanda** ognuno risponde. È
esattamente l'errore che ha prodotto la segnalazione da cui è nata questa
serie di correzioni: € 4,50 dello slicer contro € 6,96 di INGLY sembravano un
errore di formula ed erano due prezzi al chilo diversi sulla stessa formula.

INGLY dichiara quattro livelli, e il preventivatore lascia scegliere:

| livello | che cosa comprende | a chi risponde |
| ------- | ------------------ | -------------- |
| **Material cost** | solo materiale, supporti e spurgo | è il numero che dichiara uno slicer come «costo filamento» |
| **Print cost** | + energia | è il numero che mostrano gli slicer |
| **Production cost** | + ammortamento, manutenzione, scarto | quanto costa produrlo |
| **Full cost** | + tempo di persona e spese generali | quanto devi rientrare per non lavorare in perdita |

Sul caso qui sopra, misurati: material € 4,6371 · print € 4,8878 ·
production € 8,6794 · full € 16,1794. Chi confronta il « € 4,64 » di INGLY con un «costo totale» di un
altro strumento sta confrontando due cose diverse — e il divario si legge come
un errore.

Il confronto con un riferimento esterno è già una funzione del prodotto
(«Confronta con lo slicer»): si inserisce il costo che l'altro strumento
dichiara, e `InglyCostEngine.calibra()` risponde **a quale livello** quel
numero corrisponde, invece di forzare INGLY a coincidere.

---

# Audit delle assunzioni

Generato da `scripts/audit-assunzioni.mjs`, che **chiede al motore** invece di
elencare a mano: un elenco scritto a mano invecchia al primo campo aggiunto, e
nessuno se ne accorge. L'uscita completa è in `docs/ASSUNZIONI-3D.txt`.

Caso 290 g · 9 h 57 m · 1 pz, compilato come lo compila la vista al primo uso:

| voce | valore | fonte | confidenza |
| ---- | -----: | ----- | ---------- |
| Materiale | € 6,9600 | campo del preventivatore | USER CONFIGURED |
| Energia | € 0,2507 | campo del preventivatore | ESTIMATED *(consumo ESTIMATED)* |
| Ammortamento macchina | € 1,9900 | campo del preventivatore | USER CONFIGURED |
| Manutenzione e consumabili | € 1,1940 | campo del preventivatore | USER CONFIGURED |
| Finitura | € 3,0000 | campo del preventivatore | USER CONFIGURED |
| Scarto previsto | € 0,7824 | campo del preventivatore | USER CONFIGURED |
| Avviamento | € 4,5000 | campo del preventivatore | USER CONFIGURED |
| **complessiva** | **€ 18,6771** | la peggiore delle voci | **ESTIMATED** |

La complessiva è `ESTIMATED` per una sola voce: l'energia stimata dalla targa.
Basta inserire i W medi o i kWh contati perché salga — ed è il senso di averla
resa visibile.

Le tre ipotesi che il conto dichiara di dare per scontate:

- il consumo è stimato dalla potenza di targa con un ciclo di lavoro del 60%;
- la macchina si assume senza valore residuo a fine vita;
- nessuna spesa generale ripartita su questo lavoro.

Diventano `VERIFIED` o `FROM INVENTORY` quando: il materiale ha un acquisto a
registro (allora il prezzo viene dal magazzino, non dal campo), la macchina è
scelta dal Calcolatore Macchine, o il consumo è misurato.
