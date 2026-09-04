# Miglioramenti proposti — otto moduli

Proposte, non lavoro fatto. Ogni voce parte da un divario **misurato** su questo
codice, non da un'idea generica di cosa dovrebbe avere un gestionale.

Legenda: **⬛ alto** = cambia come si lavora · **◧ medio** = toglie attrito ·
**◦ basso** = rifinitura.

---

## Il divario che pesa più di tutti

**Precisazione, dopo aver letto il codice invece dei soli conteggi.** L'Apparel
il lavoro sul *motore* l'ha ricevuto, e si vede: pavimento di margine,
avviamento ammortizzato sulla quantità, margine vero al posto del ricarico
travestito. Tre difetti corretti e documentati nel file stesso.

Quello che non ha ricevuto è il lavoro di livello **preventivatore**: le sei
fasi che hanno reso il 3D uno strumento da trattativa. Contato sui due file:

| | Quoter 3D | Apparel |
|---|---:|---:|
| scaglioni di quantità | 7 | **0** |
| multi-materiale | 20 | **0** |
| consuntivo | 30 | **0** |
| scostamento preventivo/reale | 7 | **0** |
| import da slicer | 74 | **0** |
| politiche di prezzo | 22 | **0** |
| confidenza del dato | 3 | **0** |

Due righe di questa tabella vanno lette con attenzione, perché il numero da
solo mentirebbe:

- **`slicer` 74 vs 0** non è un divario: importare un G-code non ha senso per
  una maglietta. Va tolto dal conto.
- **`scaglioni` 7 vs 0 è un falso.** Il conteggio cercava `SCAGLIONI`, che è il
  nome della costante nel 3D — non la funzione. Leggendo il file, l'Apparel una
  griglia di quantità ce l'ha: `QTY_BREAKS = [1,5,10,15,20,30,50,75,100,150,200]`,
  undici scaglioni, con un riquadro «⚡ Calcolo rapido quantità» che ricalcola
  ogni scaglione passando dal motore. Economicamente è già corretto.

  **Stavo per proporre di costruire una cosa che c'è.** È esattamente il difetto
  che questa serie di fasi passa il tempo a togliere — due sistemi per un
  concetto solo — e l'avrei introdotto io. Il conteggio da solo mentiva; il file
  no.

Il divario vero, letto il codice, è più stretto e più preciso: si trova sotto.

---

## 1 · Smart Quoter 3D

Il modulo più maturo. Le proposte sono di grado successivo, non di recupero.

**⬛ Il prezzo che regge la trattativa.** Oggi il preventivo dice un numero. Non
dice *fin dove si può scendere*. Il motore conosce già costo e margine: da lì il
**prezzo di rottura** (dove il margine va a zero) e il **prezzo di soglia**
(margine minimo accettabile, impostabile) sono due sottrazioni. Chi tratta al
telefono sa quando fermarsi invece di scoprirlo a consuntivo.

**⬛ Il preventivo che si difende da solo.** `confidenza` esiste ma è usata
poco. Un preventivo dove filamento e kWh sono *misurati* vale più di uno dove
sono *stimati*, e il cliente ha diritto di vederlo. Una riga sul PDF —
«prezzo basato su dati misurati / stimati» — è un argomento di vendita, non un
dettaglio tecnico.

**◧ Il costo del fallimento, dal vero.** `failureRate` è un numero che si
digita. Il consuntivo (`p3d_consuntivo_v1`) registra già com'è andata davvero.
Proporre il tasso osservato invece di quello dichiarato — *«sulle ultime 20
stampe con questo materiale: 8%, hai impostato 5%»* — trasforma un'ipotesi in
una misura.

**◧ Riuso del piatto.** `PIATTI` sa quanti pezzi stanno su un piatto. Non sa
dire *«mettendone 6 invece di 4 il costo per pezzo scende del 18%»*. È la stessa
funzione, valutata su tre quantità invece che su una.

**◦ Il preventivo che scade.** Il filamento cambia prezzo. Un preventivo di
sessanta giorni fa non vale più, ma non lo dice.

## 2 · Apparel · DTF · Sublimazione

Qui non servono idee nuove: serve portare quello che il 3D ha già.

**◧ Gli scaglioni dicono metà di quello che sanno.** La griglia esiste e i conti
sono giusti, ma ogni riquadro mostra **solo il totale**: `×50 → €412`. Non dice
il costo per pezzo, non dice il prezzo per pezzo, non dice il margine. Non
esiste il codice da scrivere — `calcQuote` calcola già tutto e lo butta via
tenendo `grand`.

E soprattutto non dice **qual è lo scaglione giusto**. Il 3D lo segna: miglior
costo unitario, profitto totale più alto, prezzo migliore per il cliente. Sono
tre ordinamenti su dati già in mano. È la differenza fra una tabella e uno
strumento di trattativa.

**⬛ Il costo dello scarto per taglia.** Un lotto misto S–XL non consuma come
uno di sole M, e non produce lo stesso scarto. Oggi il calcolo lo ignora.

**⬛ Consuntivo e scostamento.** Zero occorrenze, e qui il divario è pieno: non
c'è modo di registrare com'è andata davvero. Sul tessile lo scarto reale — capi
bruciati, stampe storte, taglie sbagliate — è la voce che mangia il margine, ed
è l'unica che oggi nessuno misura. `InglyActualCost` e `InglyScostamento`
esistono già: manca l'aggancio.

**◧ Il costo del colore.** Il DTF con molto bianco costa più del DTF senza. Oggi
il preventivo non distingue: è la variabile più grossa non modellata.

**◧ Nesting dei fogli.** Quanti trasferimenti stanno su un foglio A3 è aritmetica
che oggi fa l'operatore a mente.

## 3 · Magazzino (Items)

Ha già il libro mastro (`inventory-ledger`) e il risolutore di costo
(`inventory-cost-resolver`): FIFO, medio, ultimo. È una base solida sfruttata a
metà.

**⬛ Riordino guidato dal consumo reale.** Il ledger sa quanto è uscito e quando.
Da lì il punto di riordino si **calcola** (consumo medio × tempo di
riapprovvigionamento + scorta di sicurezza) invece di essere una soglia scritta
a mano che nessuno aggiorna.

**⬛ Il costo che cambia sotto i preventivi.** Quando il prezzo di un materiale
si muove, i preventivi aperti che lo usano diventano sbagliati in silenzio.
Il collegamento OrderLine→Item esiste già: manca l'avviso.

**◧ Lotti e scadenze.** Resine e adesivi scadono. Il ledger ha i lotti; manca la
data.

**◦ Inventario da telefono.** Il barcode c'è. Un conteggio guidato che propone
la rettifica invece di farla scrivere a mano è un'ora risparmiata ogni mese.

## 4 · Produzione

Oggi è una vista di Ordini filtrata per stato: mostra cosa c'è da fare, non
**quando** si riesce a farlo.

**⬛ Capacità, non solo elenco.** Le macchine hanno ore/giorno. Gli ordini hanno
tempi e scadenze. Con questi due dati si risponde alla domanda vera: *«questo
lavoro entra entro venerdì?»* — oggi si risponde a occhio.

**⬛ Sequenza che riduce i cambi.** Cinque lavori sullo stesso materiale fatti di
fila costano meno di cinque alternati. Il raggruppamento è calcolabile e il
risparmio è reale.

**◧ Il ritardo prima che accada.** Non «è in ritardo», ma *«a questo ritmo
sfora giovedì»*. La differenza è il tempo per rimediare.

**◧ Tempo reale contro tempo previsto.** `TimeTracker` esiste. Confrontarlo con
il tempo del preventivo, per macchina, corregge le stime da sé.

## 5 · CRM Clienti

**⬛ Il preventivo che non è mai diventato ordine.** Il collegamento
preventivo→ordine ora è solido (un `quoteId`, un `orderId`). Da lì si vede quali
preventivi restano fermi e da quanto: è l'elenco delle telefonate da fare,
e oggi non esiste.

**⬛ Il cliente che sta scomparendo.** Chi ordinava ogni mese e da tre non si fa
vivo. Il dato c'è; l'avviso no.

**◧ Il margine per cliente, non il fatturato.** Il cliente che fattura di più non
è quello che rende di più. Con estimate/actual per ordine questo diventa
calcolabile — ed è spesso una sorpresa.

**◧ Prezzi concordati.** Se a un cliente si applica sempre lo sconto del 10%, il
preventivatore dovrebbe saperlo invece di farlo ridigitare.

## 6 · Product Builder

**⬛ Un prodotto è una distinta, non una scheda.** Se il prodotto sa di cosa è
fatto, il costo si aggiorna da solo quando cambia il magazzino. Oggi il costo è
un numero copiato al momento della creazione.

**⬛ Varianti senza duplicare.** Taglie, colori, materiali: oggi sono prodotti
diversi. Una variante è un prodotto con due campi diversi, non un altro prodotto.

**◧ Dal preventivo al prodotto.** Un preventivo accettato descrive già un
prodotto. Trasformarlo in voce di catalogo con un clic evita di ridigitare tutto.

## 7 · Catalogo

**⬛ Il prezzo che si ricalcola.** Il catalogo usa il motore in 4 punti, ma i
prezzi restano fermi finché non li si tocca. Un ricalcolo sui costi correnti,
con **anteprima di cosa cambierebbe** prima di applicare, è la funzione che
manca.

**⬛ Il prodotto che sta perdendo soldi.** Con il costo aggiornato, i prodotti
sotto margine si vedono. Oggi si scoprono a fine anno.

**◧ Listini per cliente.** I listini B2B esistono come sezione separata: dovrebbero
essere una proprietà del catalogo, non un secondo catalogo.

## 8 · Vendite & Fatture

**⬛ Il ciclo che si chiude da solo.** Ordine → vendita → fattura → incasso.
La sezione Analytics di Ordini mostra già gli ordini venduti senza vendita
collegata; il passo dopo è la vendita senza fattura e la fattura senza incasso.

**⬛ Chi non ha pagato, e da quanto.** Lo scadenzario esiste. Manca la
sollecitazione: chi è in ritardo, di quanto, con il testo già pronto.

**◧ FatturaPA su più righe.** Il generatore emette una riga sola («Personalizzazione
laser»). Un ordine con quattro voci merita quattro righe: è anche più corretto.

**◦ Incasso parziale.** Acconto e saldo esistono sull'ordine, non sulla fattura.

---

## Se dovessi sceglierne cinque

In quest'ordine, e per questo motivo:

1. **Apparel: consuntivo, e gli scaglioni che dicono tutto.** Il consuntivo è il
   divario vero e pieno (zero, verificato leggendo il file). Gli scaglioni
   invece ci sono già e vanno completati, non costruiti: mostrano il totale e
   scartano costo/pz, prezzo/pz e margine che `calcQuote` ha già calcolato.
2. **Magazzino: riordino dal consumo reale.** Il ledger c'è: è valore già pagato
   e non ancora incassato.
3. **Produzione: capacità e scadenze.** Risponde alla domanda che si fa ogni
   giorno e a cui oggi si risponde a occhio.
4. **Catalogo: ricalcolo con anteprima.** Impedisce la perdita silenziosa, che è
   la più cara.
5. **CRM: preventivi fermi.** L'elenco delle telefonate da fare: ricavo che
   esiste già e aspetta solo di essere chiesto.

Le prime due si appoggiano a codice già scritto e collaudato. Le altre tre sono
lavoro nuovo, ma su fondamenta che questa serie di fasi ha già messo a posto.
