# Fase 1 — Audit professionale dei costi e dei preventivatori

Nessuna riga di logica è stata modificata per produrre questo documento.
Ogni numero è misurato da `scripts/audit-quoters.mjs` (rieseguibile) o dal
motore stesso interrogato con gli ingressi indicati.

---

## 0. La risposta breve

**La matematica non è il problema.** Tredici sonde sui doppi conteggi passano
tutte (§3). Margine e ricarico sono distinti e corretti. Il setup si divide per
la quantità, lo scarto si applica solo al perdibile, l'IVA non entra nel costo.

I problemi misurati sono altri tre, e sono tutti **di dati e di vocabolario**:

1. **Il motore non ha un livello che risponda alla domanda dello slicer.** Il
   più basso include già l'energia. Manca il costo del solo materiale — ed è
   esattamente la domanda a cui €4,50 risponde (§5).
2. **Nessun modulo distingue consumo misurato da potenza di targa.** Zero su
   sessantatré. Sette usano la targa come se fosse consumo, e nessuno lo dice
   (§6).
3. **Tre moduli calcolano ancora un prezzo per conto loro**, e uno di essi è
   una scala di sei moltiplicatori (§2).

---

## 1. Chi produce un costo o un prezzo

Misurato su 190 file sorgente, commenti esclusi.

| | |
| --- | --- |
| moduli che scrivono un costo o un prezzo | **63** |
| di questi, che passano da `InglyCostEngine` | **12** |
| con matematica di prezzo propria e nessuna chiamata al motore | **3** |

I 63 non sono 63 preventivatori: la maggior parte **legge** un prezzo già
calcolato per disegnarlo (righe d'ordine, card di catalogo, PDF). Il numero che
conta è il terzo.

### I dodici sul motore

```
src/product/cost-engine.js          il motore
src/product/print3d-cost.js         adapter 3D
src/product/quote-adapter.js        adapter preventivo
src/product/quoter3d-view.js        vista 3D
src/product/order-snapshot.js       congelamento storico
src/product/data.js
legacy/app/modules/quoter/index.js  Smart Quoter principale
legacy/app/modules/catalog/index.js Catalogo
legacy/patches/069-…apparel          Apparel Quoter
legacy/patches/078-…laser-b2b        Laser B2B (catalogo)
legacy/patches/096-…laserb2b-master  Laser B2B (consolidato)
legacy/patches/108-…print3dquoter    Smart Quoter 3D
```

---

## 2. Le matematiche parallele — tre, non quattro

| Modulo | × propri | Cosa fa |
| ------ | -------- | ------- |
| `patches/075-…market-intelligence` | **7** | `salePz = totalCostPz * markup` e una scala di mercato `{5: cost×5, 10: ×4.5, 20: ×4, 50: ×3.5, 100: ×3, 200: ×2.8}` |
| `app/modules/items/index.js` | 2 | `cost * 2.5` come prezzo suggerito di magazzino |
| `patches/099-…pro-x-v2` | 1 | `base * 1.2` |

Patch 075 è il caso serio, per tre ragioni:

- Ricalcola tutto — materiale, macchina, manodopera, packaging — con formule
  proprie: `machCostPz = (mach.hourly + mach.energyH)/60 * timeMin`.
- Calcola il margine **dal prezzo che si è appena inventato**:
  `marginPct = (salePz − totalCostPz)/salePz`. Il numero è aritmeticamente
  giusto e informativamente vuoto: dice il margine di un prezzo che nessuno ha
  scelto.
- La scala `cost×5 … cost×2.8` è la stessa forma che il quoter 3D ha appena
  ritirato: un ricarico presentato come posizionamento di mercato.

### Moltiplicatori dichiarati altrove

| Dove | Valore | Categoria |
| ---- | ------ | --------- |
| `patches/120-…calcolatore-macchine` r142, r619 | `markup: 3.5` | D — default di un campo utente, salvato in localStorage |
| `patches/085-…professional` r564-566 | `markup: 2.0 / 1.8 / 1.6` | F — tre «scenari» che sono tre ricarichi |
| `app/modules/quoter/index.js` r473 | `markup: 1.4`, `price = unitCost*1.4` | D — default di `addLineFromCalc` |

Il `markup: 3.5` del Calcolatore Macchine è **lo stesso numero** che il quoter
3D applicava allo scaglione singolo. Due moduli, stesso ricarico, nessuno dei
due lo chiamava margine finché non glielo si chiedeva.

---

## 3. Doppi conteggi — tredici sonde, tredici verdi

Interrogando il motore con ingressi controllati (`290 g · 9,95 h · PLA €24/kg`):

| Verifica | Esito | Misura |
| -------- | ----- | ------ |
| supporti sommati una volta sola | ✔ | +€1,200 per 50 g = 0,050 × 24 |
| purge sommato una volta sola | ✔ | +€0,720 per 30 g |
| energia non dentro l'ammortamento | ✔ | invariata azzerando `machinePrice` |
| manutenzione non dentro l'ammortamento | ✔ | invariata azzerando `maintenancePerHour` |
| setup e post-processo non si sovrappongono | ✔ | additivi esatti |
| setup diviso per la quantità (è per job) | ✔ | 1 pz €18,00 · 10 pz €1,80 |
| packaging per pezzo, non per job | ✔ | €2,00/pz a ogni quantità |
| scarto solo sul perdibile | ✔ | €1,155 = perdibile × 0,10/0,90 |
| IVA fuori dal costo | ✔ | `ivaPct` non muove `costoPezzo` |
| margine 40% su 100 € | ✔ | **166,67 €** |
| ricarico 40% su 100 € | ✔ | **140 €**, margine 28,57% |
| commissioni sul lordo incassato | ✔ | €6,10 su lordo €203,33 |
| overhead di macchina non presidiata sulle ore uomo | ✔ | €1,00 con 15 min di setup; sarebbe €39,80 sulle ore macchina |

Le due righe del margine sono il test che il piano chiede esplicitamente, e
passano.

---

## 4. Percorso diagnostico dello Smart Quoter 3D

```
campo DOM        ingresso motore        provenienza            categoria
─────────────────────────────────────────────────────────────────────────
p3d-g            grams                  utente (da slicer)     E — digitato a mano
p3d-sup          supportGrams           utente                 E
p3d-mkg          spoolPrice             campo, default 24      F ⚠ vedi §5
p3d-mu           spoolGrams             campo, default 1000    D
p3d-h            hours                  utente (da slicer)     E
p3d-watt         watt                   tabella MACH           B ⚠ è potenza di targa
p3d-duty         dutyCycle              campo, default 0,6     E ⚠ non dichiarata
p3d-kwh          kwhPrice               campo, default 0,28    F ⚠ non da bolletta
p3d-mc           machinePrice           tabella MACH           B
p3d-lh           machineLifeHours       tabella MACH           D — 2000/2500 stimati
p3d-mnt          maintenancePerHour     campo, 0,12 / 0,20     E
p3d-fail         failureRate            campo, 7% / 12%        E ⚠ default non nullo
p3d-setup        setupMin               campo, default 15      D
p3d-lm           finishMin              campo, default 10      D
p3d-lr           laborPerHour           campo, default 18      C — dovrebbe venire da Impostazioni
p3d-mat          (selezione)            magazzino `p3dq_v4`    A ⚠ magazzino separato
```

Nessuno degli ingressi arriva dal **registro di magazzino** vero
(`InglyInventoryCostResolver`): la selezione materiale legge `p3dq_v4`, una
copia in localStorage popolata una volta sola da `InglySync.importMaterials()`
in una direzione sola.

---

## 5. Il caso di calibrazione — 290 g · 9h57 · PLA · slicer € 4,50

### I tre livelli attuali

| Livello | Costo | Composizione |
| ------- | ----- | ------------ |
| **stampa** | € 7,21 | materiale 6,96 · energia 0,25 |
| **macchina** | € 11,18 | + ammortamento 1,99 · manutenzione 1,19 · scarto 0,78 |
| **completo** | € 18,68 | + finitura 3,00 · setup ripartito 4,50 |

### Prezzo dal margine, sul costo aziendale pieno

| Margine | Prezzo | Ricarico equivalente |
| ------- | ------ | -------------------- |
| 25% | € 24,90 | ×1,33 |
| 30% | € 26,68 | ×1,43 |
| 40% | € 31,13 | ×1,67 |
| 50% | € 37,35 | ×2,00 |
| 60% | € 46,69 | ×2,50 |

### Perché lo slicer dice € 4,50

Il livello più vicino è **stampa**, con un residuo di **€ 2,71**. Quel residuo
si scompone esattamente:

```
  € 6,96   materiale INGLY   290 g × €24,00/kg
− € 4,50   materiale slicer  290 g × €15,52/kg
─────────
  € 2,46   differenza di prezzo del filamento
+ € 0,25   energia, che lo slicer non conta
─────────
  € 2,71   il residuo, al centesimo
```

**Lo slicer non usa una formula diversa: usa un filamento diverso.** Per dire
€ 4,50 su 290 g deve valutare il PLA **€ 15,52/kg** — un prezzo di listino EU
plausibile (Bambu Lab EU intorno a € 15,99/kg: a quel prezzo il materiale
sarebbe € 4,64). Il preventivatore è impostato su € 24,00/kg.

Confrontare i due numeri e concludere «INGLY costa troppo» è confrontare due
filamenti a prezzo diverso.

### Cosa manca al motore

Il residuo è materiale + energia, ma il livello più basso **include già
l'energia**: non esiste un livello che risponda alla stessa domanda dello
slicer. È la ragione tecnica per cui la Fase 2 chiede un **livello 1 —
materiale puro**. Senza, il confronto resta approssimativo per costruzione.

---

## 6. Audit dei dati macchina — l'energia

| | |
| --- | --- |
| moduli con consumo **misurato** | **0** |
| moduli con consumo **medio** | **0** |
| moduli con la sola **potenza di targa** | **7** |
| moduli che **dichiarano** quale stanno usando | **0** |

La tabella `MACH` del quoter 3D dà una sola cifra per macchina — `w: 250` per
Bambu A1, `w: 350` per X1 Carbon — che è la potenza massima, non il consumo
medio. Viene moltiplicata per un `dutyCycle` di 0,6, e il risultato è una
stima ragionevole presentata come misura:

```
  dettaglio a schermo :  «150 W × 9.95 h»
  calcolo reale       :  150 × 0,6 × 9,95 / 1000 × 0,28 = € 0,251
```

Il coefficiente 0,6 non compare nella spiegazione. Chi legge non ha modo di
sapere che sta guardando una stima, e quindi non ha ragione di misurare.

Il modello da introdurre (Fase 2):

```
  measuredPowerW  →  averagePowerW  →  ratedPowerW
  measuredEnergyKwh ha priorità su tutti
```

con `energyMode` esposto nel risultato e mostrato nella UI.

Nota sul €/kWh: `0,28` è scritto come default in quattro punti. Non è un
valore assurdo, ma non è **la bolletta di questa azienda** — e la bolletta è
l'unico numero difendibile. Va portato in Impostazioni con periodo di
riferimento.

---

## 7. Valori economici scritti nel codice

Sessanta occorrenze con unità riconoscibile, classificate dal contesto:

| Cat. | Significato | N |
| ---- | ----------- | - |
| A | dato reale dal magazzino | 1 |
| B | dato reale dalla macchina | 0 |
| C | impostazione aziendale | 0 |
| D | default tecnico | 12 |
| E | stima dichiarata | 0 |
| **F** | **hardcoded senza fonte** | **47** |

| Tipo | N |
| ---- | - |
| aliquota IVA dentro un'espressione (`× 0.22`, `× 1.22`) | **21** |
| aliquota IVA come campo | 16 |
| moltiplicatore | 11 |
| % margine | 6 |
| €/kWh | 4 |
| overhead, €/h manutenzione | 2 |

**L'IVA al 22% compare in dieci file diversi**, ventuno volte come letterale
dentro un'espressione. Non è un difetto di calcolo — i ventuno valori sono
uguali — ma finché resta così l'aliquota non è configurabile, e una modifica
di legge richiederebbe ventuno correzioni coordinate.

Nessun valore è classificato **E**: nel progetto non esiste oggi il concetto
di «questo numero è una stima». È il campo `confidence` che la Fase 2 chiede.

---

## 8. Ordine delle correzioni proposto

L'ordine del piano regge alla misura, con una precisazione.

| # | Fase | Perché in questa posizione |
| - | ---- | -------------------------- |
| 1 | **Livello materiale + energyMode + confidence** (Fase 2) | senza il livello 1 il confronto con lo slicer resta impreciso; senza `confidence` non si può dire quali numeri sono stime — ed è la metà dei numeri |
| 2 | **Magazzino source of truth** (Fase 4) | **anticipata**: il difetto misurato in §5 è un prezzo materiale, non una formula. Correggere il motore prima di collegare il magazzino lascia il difetto principale intatto |
| 3 | **Quoter 3D production grade** (Fase 3) | import slicer, modalità energia, materiale dal magazzino: tutte dipendono da 1 e 2 |
| 4 | **Machine Cost Engine** (Fase 5) | i dati macchina sono già in tabella; separarli per ora è additivo |
| 5 | **Laser B2B** (Fase 6) | riusa il motore machine appena reso unico |
| 6 | **Suite di calibrazione** (Fase 7) | blocca le regressioni prima della UI |
| 7 | **UI professionale** (Fase 8) | per ultima, per costruzione: mostra ciò che esiste |
| — | **Ritiro delle tre matematiche parallele** | in coda a ogni fase che tocca il modulo interessato, non in un passaggio unico: patch 075 va portato sul motore quando si tocca il pricing di mercato |

### Rischi di regressione

- **Il livello materiale cambia il default se lo si mette come predefinito.**
  Non va fatto: `completo` resta il default, il livello 1 si aggiunge.
- **Collegare il magazzino cambia i prezzi dei preventivi nuovi** — da €24/kg
  al costo reale. È l'effetto voluto, ma va annunciato, e i preventivi salvati
  devono restare congelati (`materialCostAtQuote`).
- **`failureRate` a 0 di default** abbassa i costi rispetto a oggi (7%/12%).
  Il piano lo chiede esplicitamente, con un warning: va fatto, e va misurato
  quanto sposta il preventivo tipo (sul caso §5: da €18,68 a €17,90, −4,2%).
- **Le tre matematiche parallele** producono oggi prezzi che l'utente vede.
  Portarle sul motore li sposta. Ogni ritiro va fatto convertendo il
  moltiplicatore nel margine equivalente, come già fatto per il quoter 3D.

### Test necessari prima di ogni fase

Quelli della Fase 7, anticipati: le tredici sonde di §3 diventano test
permanenti (oggi sono uno script), più il caso §5 come fixture d'oro con i
suoi tre livelli e le sue cinque righe di margine.

---

## 9. Cosa questo audit **non** ha esaminato

- I preventivatori UV, DTF e sublimazione: cercati, non trovati come moduli
  autonomi con matematica propria. Se esistono, sono dentro il Product Builder
  o il Quoter principale e vanno mappati quando si toccano.
- La correttezza dei **valori** delle tabelle macchina (`w`, `c`, `l`): sono
  plausibili, ma non ho una fonte per verificarli uno per uno. Sono classificati
  B perché vengono da una tabella di macchine, non perché siano verificati.
- Il Product Builder: usa il motore per il costo ma non è stato sondato per i
  doppi conteggi con la stessa profondità del 3D.
