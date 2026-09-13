# Audit di tutte le sezioni — cosa funziona, cosa migliorerei

Misurato aprendo **una per una le 110 voci del menù** in un browser vero,
aspettando che ognuna disegni, e contando: caratteri prodotti, controlli
presenti, tabelle, righe, stati vuoti, comandi che puntano a moduli inesistenti,
errori JavaScript.

## Il quadro

| | esito |
| --- | --- |
| Sezioni esaminate | 110 |
| Errori JavaScript all'avvio | **0** |
| Sezioni che producono un errore JavaScript | **0** |
| Sezioni che restano bianche | **0** (erano 3) |
| Tabelle vuote senza una parola di spiegazione | **0** (erano 2) |
| Pulsanti che puntano a un modulo inesistente | **0** |

Distribuzione per contenuto prodotto:

| caratteri | sezioni |
| --------- | ------: |
| oltre 2000 | 26 |
| 1000–2000 | 19 |
| 500–1000 | 26 |
| 300–500 | 15 |
| sotto 300 | 20 |

## I tre difetti trovati e corretti

### 1. Tre voci di menù svuotavano lo schermo

«Export Commercialista», «Morning Briefing» e «Report Mensile» non sono sezioni:
sono comandi. La navigazione spegneva comunque la vista corrente e, non
trovandone una nuova da accendere, lasciava l'area contenuti **bianca**.

Misurato: dopo il clic, nessuna `.section-way.active` nel documento. L'export era
riuscito e lo schermo sembrava rotto.

La correzione è una regola generale, non un elenco di tre nomi: **se la rotta non
ha una vista, la vista corrente resta dov'è.** Vale per i comandi di oggi, per
quelli che una patch aggiungerà domani, e su una rotta davvero rotta mostrare la
schermata precedente è comunque meglio del vuoto.

### 2. Due tabelle vuote che non dicevano niente

- **Client Intelligence**: cinque riquadri con «0» e nient'altro. Ora spiega che
  la segmentazione RFM ha bisogno di **vendite incassate**, non di clienti in
  anagrafica — che è la confusione probabile («ho dieci clienti, perché non vedo
  niente?») — e si adatta a quanti clienti ci sono.
- **Prima Nota**: intestazione della tabella e niente sotto. Ora dice che i
  movimenti arrivano dalle vendite pagate e **non si scrivono a mano**. Il
  messaggio sta dentro la tabella, non sopra: sopra avrebbe lasciato
  l'intestazione delle colonne col vuoto sotto, due messaggi che si
  contraddicono nello stesso riquadro.

### 3. Numeri inventati mostrati come dati

Il difetto di integrità più grosso trovato in questo giro. Tredici moduli di
analisi mostravano in riquadri grandi — gli stessi che altrove mostrano il
fatturato reale:

- «68% margine medio», «×3.2 markup consigliato» (Price Radar)
- «2.4M ricerche *personalized*», «+18% crescita nicchia», «€24 prezzo medio» (Etsy Pulse)
- «Lombardia regione top», «Nov-Dic picco stagionale» (Demand Map)
- «+350% top crescita» (Trend Hunter)
- «€35 margine medio» (Product Hunter)

Sono scritti nel codice. Non sono misurati da nessuna parte. Il §2 del progetto
dice che un numero senza fonte reale non si mostra come dato.

Non si possono cancellare — una sezione di analisi vuota non aiuta, e le tabelle
sotto sono modificabili proprio perché l'idea è partire da un esempio e
sostituirlo — ma si possono **dichiarare**. Ogni riquadro porta adesso «esempio
da sostituire», e in testa alla sezione c'è una riga che lo dice una volta per
tutte.

Con una via d'uscita che conta: `reale: true` toglie la dicitura. I conteggi che
vengono davvero dalle righe che l'utente compila — «idee in elenco», «trend in
elenco» — sono dichiarati dati veri, perché chiamare esempio una misura
insegnerebbe a ignorare la dicitura proprio dove serve.

## Sezione per sezione — il mio giudizio

### Solide, non le toccherei

**Preventivi** (7 sezioni, 6 ricche di contenuto). Smart Quoter, Quoter 3D,
Calcolatore, Laser B2B, Apparel. Sono la parte più lavorata del programma: un
motore di costo solo, la provenienza di ogni numero dichiarata, il passaggio a
ordine atomico e verificato. Il Quoter 3D ha 50 campi e 63 comandi su 7864
caratteri — è la schermata più densa del programma e regge.

**Catalogo e magazzino** (13 sezioni, 11 ricche). Registro delle giacenze,
riordino calcolato dal consumo reale, ricalcolo del listino con anteprima
annullabile, politica di prezzo per prodotto. La parte dei dati è in ordine.

**Sistema** (7 sezioni, tutte ricche). Impostazioni 16 773 caratteri con 91
comandi, Brand Identity 10 506. Completo.

### Funzionano, ma le arricchirei

**Ordini e produzione.** Funzionano, e il consuntivo Preventivato/Reale/
Scostamento adesso legge i dati giusti. Cosa manca: **`booking` (224 caratteri)**
è un guscio. Se le prenotazioni ti servono, va costruita; se non ti servono, va
ritirata dal menù — una voce che esiste e non fa niente costa attenzione ogni
volta che la vedi.

**CRM e vendite** (solo 2 su 7 ricche). Il CRM funziona, ma tre sezioni sono
sottili: `sales_archive` (269), `clv` (232), `ai-clv` (383). Il valore del ciclo
di vita del cliente è un numero che il programma **potrebbe calcolare davvero** —
ha le vendite, ha le date, ha i clienti — e invece lo mostra come voce separata e
quasi vuota. È il caso in cui aggiungere un calcolo vero vale più di dieci
schermate nuove.

**Report e KPI** (5 su 10 ricche). `forecaster` e `forecasting` sono due sezioni
diverse per la stessa cosa, entrambe magre (182 e 164 caratteri). `history` ha 89
caratteri e nessun controllo. Qui consoliderei: una sezione di previsione sola,
che usa lo storico vero.

### Quelle che meritano una decisione, non un ritocco

**Intelligence** (18 sezioni, 5 ricche su 18). È la famiglia più numerosa e la
più vuota. Dieci sezioni sotto i 300 caratteri: `ai`, `price_radar`,
`demand_map`, `competitormon`, `growthengine`, `contentperf`, `etsyai`,
`dynamicprice`, `trendscanner`, `ai-reorder`.

Adesso almeno dicono che i loro numeri sono esempi. Ma il punto resta: **diciotto
voci di menù per cinque schermate con contenuto**. La mia opinione, detta
chiaramente: questa famiglia andrebbe ridotta a tre o quattro sezioni che
calcolano qualcosa dai tuoi dati, e le altre ritirate. Tredici voci che mostrano
esempi da sostituire non sono tredici strumenti: sono tredici promesse.

Il criterio per decidere, per ognuna: **quale numero può calcolare dai dati che
hai già?** `ai-reorder` può farlo (consumo e giacenze ci sono). `price_radar` non
può, senza che tu inserisca i prezzi che vedi in giro — e allora la sezione non è
un radar, è un quaderno, e va chiamata così.

## Cosa resta aperto, in ordine di valore

1. **Il CLV calcolato davvero.** I dati ci sono tutti. È il miglior rapporto fra
   lavoro e utilità di tutto quello che resta.
2. **Consolidare previsioni** (`forecaster` + `forecasting` + `revsim` → una).
3. **Decidere sulla famiglia Intelligence**: quali tre tenere e costruire, quali
   quindici ritirare. È una decisione tua, non mia: dipende da cosa usi.
4. **Il debito di prezzo**: 14 punti, quasi tutti negli scaglioni B2B dei file
   dormienti 086 e 094.
5. **Ritirare i moduli dormienti** (086, 094, 096 per il B2B; `LaserCalcPage` e
   patch 119 per il Calcolatore). Richiede di verificare chi chiama ognuno dei
   nomi che esportano.
