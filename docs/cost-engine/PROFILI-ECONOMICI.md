# PROFILI ECONOMICI — manodopera, spese generali, imballo

Fase 2-4 del piano in `COST-ENGINE-V2-AUDIT.md`. Documento breve per scelta:
quello che serve sapere per usarli e per non romperli.

## Il problema, misurato

Il caso obbligatorio del comando — **250 g di PLA in 9 h 57, un pezzo** — usciva
così sul file consegnato:

```
materiale € 6,00 · energia € 0,25 · macchina € 1,39 · manutenzione € 1,19
finitura € 1,50 · scarto € 0,67
spese generali € 0,00 · imballo € 0,00
costo pieno € 15,50 · prezzo € 25,84
```

Ogni riga era aritmeticamente giusta. Il costo era basso perché **tre voci non
c'erano**: le spese generali del laboratorio, l'imballo, e una tariffa oraria
decisa da qualcuno invece che scritta in un campo — `value="18"` nell'HTML del
preventivatore.

Con gli stessi minuti e gli stessi grammi, dichiarando il laboratorio:

```
… finitura € 1,67 · imballo € 0,65
spese generali € 1,33 · costo pieno € 18,15 · prezzo € 30,26
```

**€ 2,65 a pezzo**, il 17% del costo, che prima non veniva chiesto a nessuno.

## I tre pezzi

| Pezzo | File | Cosa fa |
| ----- | ---- | ------- |
| Il calcolo | `src/product/cost-profiles.js` | **puro**: non tocca DOM, archivio o orologio. Un test lo verifica |
| L'archivio | `src/product/cost-profiles-store.js` | legge e scrive i tre store, con una cache di 5 secondi |
| La schermata | `src/product/cost-profiles-view.js` | il pannello dove il laboratorio si descrive |

Tre store nuovi in IndexedDB, migrazione additiva **v31 → v32**:
`labor_profiles`, `overhead_profiles`, `packaging_items`, tutti con chiave
`key: 'main'`.

## Le tre regole rese strutturali

Non sono commenti: sono forme che rendono l'errore impossibile.

**1 · Il costo interno di un'ora non è la tariffa che si fa pagare.**
Due campi distinti per ogni ruolo. Il preventivo usa il primo; il secondo serve
a sapere se sul lavoro si guadagna. Gli oneri si sommano alla retribuzione, e le
ore non produttive alzano il costo dell'ora prodotta: pagato per 1600 ore, ne
produce 1200 → ogni ora prodotta costa un terzo in più della busta paga.

**2 · Le tre modalità di spese generali non si sommano mai.**
`overhead()` restituisce tre campi con **due sempre a zero**. Chi riceve
l'oggetto non può sommare due modalità perché non ne ha due. È il §21 del
comando reso impossibile da violare invece che raccomandato.

**3 · L'imballo per ordine si divide per la quantità.**
Prima di entrare nel costo del pezzo, e il nome della voce dice come è stato
ripartito (`Scatola (÷ 10)`). Quantità zero, negativa o `NaN` non producono una
divisione per zero: il costo resta quello pieno.

## Cosa NON fanno

- **Non inventano un affitto.** Tutte le nove voci di spesa partono da **zero**
  e restano a zero finché non le si compila. Un affitto plausibile è comunque un
  affitto inventato, e il §43 vale anche per i costi propri. A zero, il pannello
  e il preventivo dichiarano che le spese generali non stanno entrando.
- **Non leggono il browser.** `cost-profiles.js` non nomina `localStorage`,
  `document`, `IDB`, `Date.now` né `new Date` — verificato da un test, perché un
  preventivo deve poter essere rifatto identico fra sei mesi.
- **Non decidono il prezzo.** Consegnano al motore i campi che il motore già
  conosce (`laborPerHour`, `overheadPerHour`, `overheadPerJob`, `overheadPct`,
  `packagingItems`). La matematica del prezzo resta una sola.

## Perché la manodopera ha un predefinito e le spese no

Un preventivo senza costo del lavoro sarebbe **più falso** di uno con un
predefinito: il lavoro c'è comunque, e non contarlo dice zero, che è
certamente sbagliato. Un affitto invece può davvero non esserci — c'è chi lavora
in casa — e metterne uno di default direbbe una cosa che nessuno ha dichiarato.
Il predefinito della manodopera si dichiara tale (`predefinito: true`,
`confidence: 'estimated'`), e il pannello lo scrive sotto il campo.

## Dove entrano

- **Preventivatore 3D** (`patches/108`): la tariffa segue il profilo finché
  nessuno tocca il campo. Toccato una volta, il valore digitato vince — un
  numero riscritto sotto le dita è peggio di un predefinito.
- **Calcolatore Macchine** (`patches/120`): stessa tariffa, stesso pannello.
- **Tutte e quattro le tecnologie**: `tests/economia-tecnologie.test.mjs`
  verifica che manodopera, spese generali e imballo arrivino a `print3d`,
  `laser`, `uv` e `dtf` con lo stesso significato — un modulo scritto lavorando
  sul 3D poteva facilmente valere solo per il 3D.

I minuti di lavoro umano hanno un nome diverso per tecnologia (`finishMin` per
laser e 3D, `handlingMin` per UV e DTF): non è un difetto, sono passaggi
diversi. Chi scrive un test su questo deve saperlo, o misura il nulla e passa
lo stesso.

## Le spese generali seguono le ore uomo, non le ore macchina

Per il profilo `print3d` è deliberato e preesistente: la stampante lavora da
sola, spesso di notte. Nel caso dei 250 g l'overhead è € 1,33 = € 4/h × 0,333 h
di lavoro umano, non × 9,95 h di macchina. Chi cambia questa scelta cambia il
costo di ogni stampa lunga: si tocca in `PROFILI.print3d.presidiata`.

## Prove

- `tests/cost-profiles.test.mjs` — 26 casi sul modulo puro
- `tests/economia-tecnologie.test.mjs` — 35 casi sulle quattro tecnologie
- `tests/qa/cost-profiles-quoter.mjs` — il caso 250 g nel browser, prima e dopo
- `tests/qa/profili-economici-pannello.mjs` — il giro completo dal pannello
