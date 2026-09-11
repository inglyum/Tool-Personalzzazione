# Cost Audit e debito di prezzo

Due lavori diversi che si sono rivelati lo stesso lavoro: togliere le copie.

## Parte 1 — «Da dove viene questo numero» aveva tre risposte

Il Cost Audit non mancava: **esisteva già** nel Product Builder, come
interruttore che mette accanto a ogni voce la sua provenienza. Il difetto era
un altro, ed è emerso solo estendendolo ai preventivatori.

La stessa domanda aveva tre vocabolari:

| Chi | Su cosa | Parole |
| --- | ------- | ------ |
| il motore | `fonte` | inventory, configurato, inserito, default, stima, calcolato, mancante, scelta commerciale, normativa, protezione |
| Product Builder | `fonte` | una tabella privata: Magazzino, Configurato, Manuale, Default… |
| Smart Quoter 3D | `confidence` — **un'altra scala** | una seconda tabella privata: verificato, dichiarato, stimato, mancante |

Tre tabelle divergono. Lo stesso valore risultava «Stimato» in una schermata e
«stimato» in un'altra, su scale che non coincidevano, e nessuna delle due era
in torto.

`src/product/cost-audit.js` tiene **una** traduzione. Le due lingue in ingresso
restano due — `fonte` dice *da dove* viene un numero, `confidence` dice *quanto*
ci si può contare, e sono domande diverse — ma la scala in uscita è una sola, di
cinque livelli: dichiarato, calcolato, scritto a mano, stimato, non dichiarato.

Il disegno resta alle viste: il Product Builder ha le sue classi CSS, il Quoter
3D la sua tabella. Imporre un markup comune avrebbe prodotto due schermate che
sembrano una terza.

### Il conteggio, che è la domanda vera

La domanda di un audit non è «da dove viene questo numero» ma **«quanti di
questi numeri non li ho scelti io»**, e non si legge nel totale. Il Quoter 3D
adesso apre il pannello con una riga sola:

> Tutte le 9 voci di costo poggiano su un numero dichiarato.

oppure, quando non è così, quante sono e per quanti euro di costo. Nessun
giudizio: la frase dice i numeri, il colore fa il resto, e a decidere è chi
legge.

### Due numeri che risultavano «Non dichiarata»

Il test in browser ha trovato due voci senza traduzione: il **prezzo netto**
(fonte `scelta commerciale`) e l'**IVA** (fonte `normativa`). Erano gli unici
due con un cartello rosso accanto — e sono i due che si sanno con più
certezza di tutti: il margine l'hai scelto tu, l'aliquota è di legge. Adesso
si chiamano «Decisione» e «Di legge».

Il controllo che lo impedirà in futuro **legge i nomi dal motore** invece di
tenerne un elenco a mano: un elenco a mano invecchia in silenzio, ed è
esattamente così che quelle due erano rimaste indietro.

## Parte 2 — Tre documenti per il cliente con il conto fatto in casa

Il cricchetto contava **18 punti** in cui il prezzo si calcolava fuori dal
motore. Non sono un numero astratto: tre di quei punti sono documenti che il
cliente riceve, e ognuno rifaceva il conto per conto suo.

| Dove | Cosa faceva |
| ---- | ----------- |
| `patch 100` — preventivo rapido e sua mail | `net * 1.22`, aliquota scritta a mano in due punti, e il corpo del messaggio che dichiarava «IVA 22% inclusa» qualunque aliquota fosse impostata |
| `patch 050` — il PDF | ricarico, sconto e IVA ricalcolati per il totale **e una seconda volta per ogni riga**, con il 22% scritto a mano |
| `patch 157` — anteprima fattura | lo stesso imponibile dello schermo, ottenuto per un'altra strada, riga per riga e in totale |

Chi vende libri al 4% o esporta in esenzione **mandava già oggi documenti
sbagliati**, e non c'era modo di accorgersene: il numero sullo schermo era
giusto, quello sulla carta no.

Adesso tutti e tre chiedono il conto a `InglyCostEngine.prezzo()`, con lo
stesso ordine di operazioni che facevano prima — ricarico, poi sconto, poi IVA
sul netto scontato — quindi **i numeri non cambiano**. Un test lo verifica
mettendo a confronto il conto a mano e quello del motore sugli stessi ingressi.

Due scelte che vale la pena dichiarare:

- **Nessun pavimento di margine.** Questi tre documenti non decidono un prezzo:
  mettono su carta uno già concordato. Applicare qui il margine minimo
  alzerebbe di nascosto un totale che il cliente ha già visto.
- **Senza motore non si stampa.** Il PDF non si genera e l'anteprima fattura
  dichiara zero, invece di produrre un totale plausibile e diverso da quello
  approvato. Un documento con un numero sbagliato è peggio di un documento che
  non esce.

### Il cricchetto

| | prima | dopo |
| --- | ---: | ---: |
| motori di prezzo duplicati (D) | 9 | 5 |
| regole commerciali nel codice (E) | 9 | 9 |
| **somma** | **18** | **14** |

I tetti sono stati abbassati insieme al codice: da qui in avanti il test
fallisce se qualcuno risale.

Restano 14, e il grosso è nei listini B2B — scaglioni di sconto per quantità e
prezzi minimi scritti dentro le formule, distribuiti su cinque patch che si
somigliano molto (078, 086, 094, 096). Non è lavoro da fare di corsa: `096` si
chiama «master consolidato» e potrebbe aver già superato le altre, ma
stabilirlo richiede di misurare quale delle cinque disegna davvero la
schermata — la stessa domanda che ha rivelato le due schermate morte del
Calcolatore Laser.

## Cosa lo verifica

- `tests/cost-audit.test.mjs` — 21 asserzioni, fra cui il controllo che legge
  le fonti dal motore.
- `tests/documenti-cliente-un-conto-solo.test.mjs` — 11 asserzioni, fra cui la
  prova che il motore fa esattamente lo stesso conto di prima.
- `tests/qa/cost-audit.mjs` — 15 controlli in un browser vero: apre entrambe le
  schermate e confronta le parole che mostrano.
- `tests/architecture-cost-engine.test.mjs` — il cricchetto, ai nuovi tetti.

---

# Appendice — chi disegna davvero il Laser Quoter B2B

Cinque patch scrivono in `#view-laser_b2b`. Misurato aprendo la sezione e
aspettando nove secondi — abbastanza perché anche i moduli che si annunciano in
ritardo abbiano finito:

| Patch | Firma nell'intestazione | Esito |
| ----- | ----------------------- | ----- |
| **078** — Laser B2B Pro | «Calcolo costi + margini in tempo reale» | **disegna la schermata** |
| 086 — LaserB2B Pro Ultimate | «Calcolo costi professionale» | mai visibile |
| 096 — v37c Master consolidato | «v37c Consolidato» | mai visibile |
| 094 — task force | *(ids diversi)* | non disegna questa rotta |
| 121 — Laser Quoter B2B v2 | *(ids diversi)* | non disegna questa rotta |

**Una preoccupazione che si è rivelata infondata, e va detto.** Vedendo che
vince 078 e non 096 — il file chiamato «master consolidato», quello che il
cricchetto sorveglia come consumatore del motore — ho temuto che la migrazione
al motore unico fosse finita in un file che nessuno vede. Non è così: **078 usa
già il motore**, con `InglyCostEngine.prezzo()` e una politica dichiarata. Il
lavoro era arrivato anche lì.

## Il difetto che la misura ha fatto emergere

Nella schermata viva, la **scheda riepilogo** e la **tabella degli scaglioni**
— che stanno una sopra l'altra nella stessa pagina — applicavano due scale di
sconto sul materiale diverse:

| quantità | scheda | tabella |
| -------: | -----: | ------: |
| 10 | 10% | 0% |
| 20 | 10% | 4% |
| 50 | **20%** | **7%** |
| 100 | 20% | 10% |
| 200 | 20% | 15% |

Cinque quantità su sei. A cinquanta pezzi la scheda scontava il materiale quasi
tre volte più della tabella: **stesso prodotto, stessa quantità, due costi e due
prezzi a due centimetri di distanza.**

Il motivo per cui è durato è istruttivo: la tabella aveva già la sua scala
*dichiarata* come politica, con un commento che spiegava perché le politiche
vanno dichiarate. La scheda aveva la vecchia scritta nella formula. Nessuno dei
due punti nominava l'altro, quindi chi aveva sistemato la tabella non aveva modo
di sapere che la scheda esisteva.

Adesso `POLITICHE_B2B` è dichiarata una volta in cima al modulo, e le due viste
la leggono. Anche la resa del lotto — che non è una politica commerciale ma
conoscenza di mestiere — sta in una funzione sola, perché due copie divergono
comunque.

**I prezzi della scheda cambiano.** Applicava uno sconto materiale più alto di
quello dichiarato, quindi mostrava costi più bassi del vero: a cinquanta pezzi
il costo del materiale sale del 13% rispetto a prima. Il numero giusto è quello
nuovo — è la politica scritta — ma è un cambiamento visibile e va saputo.

## Cosa resta, e perché non l'ho fatto adesso

Ritirare 086, 094 e 096 sembra il passo ovvio. Non lo è: **094 esporta cinque
moduli veri** — `LaserCalcHistory`, `LaserTemplates`, `MachineCompare`,
`OrderChecklist`, `PreventivToOrder` — che non c'entrano con la rotta B2B e
possono essere usati altrove. 086 esporta gestori di finestra dai nomi generici
(`closeModal`, `saveMachine`) che potrebbero servire ad altro.

Ritirarli richiede di misurare, per ognuno di quei nomi, se qualcuno lo chiama:
è un passaggio suo, con la sua verifica, e va fatto all'inizio di una sessione
e non alla fine. La misura di chi disegna cosa — che è la parte difficile — è
fatta e sta qui sopra.
