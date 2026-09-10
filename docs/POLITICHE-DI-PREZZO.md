# I margini si possono raggiungere, e ogni prodotto può avere il suo

## Cosa chiedeva la richiesta, e cosa ho trovato invece

La richiesta parlava di quattro profili — HOBBY, MAKER, BUSINESS, PREMIUM — e
di un `cost_profile_id` sul catalogo.

Misurando prima di scrivere: **le politiche di prezzo esistono già**, sono
sette, dichiarate nel motore e ordinate per margine crescente.

| Politica | Margine | Sconto max | Minimo |
| -------- | ------: | ---------: | -----: |
| Ingrosso | 20% | 25% | 12% |
| Competitivo | 25% | 10% | 12% |
| B2B | 30% | 20% | 15% |
| Standard *(consigliata)* | 40% | 15% | 20% |
| Premium | 60% | 20% | 30% |
| Luxury | 80% | 25% | 45% |
| Su misura | 40% | 100% | 10% |

Aggiungerne quattro con nomi nuovi avrebbe creato un secondo sistema accanto a
questo, con «Premium» che vale 60 in un posto e qualcos'altro nell'altro. È
esattamente il difetto che questo progetto passa il tempo a smontare. Quindi
non l'ho fatto, e ho lavorato sui due difetti veri che c'erano dietro.

## Difetto 1 — sette margini che nessuno poteva cambiare

`InglyPricingPolicies` ha `imposta()` e `ripristina()` dal primo giorno.
**Non li chiamava nessuno.** Un `grep` sull'intera applicazione trovava un solo
consumatore delle politiche — patch 120 — e nessuna schermata per configurarle.

È lo stesso difetto dei profili di costo prima del loro pannello: un numero che
il programma sa usare e che l'utente non può dichiarare vale zero.

Adesso c'è la quarta scheda in **Profili economici → 💰 Margini**: le sette
politiche, i loro tre numeri, e sotto la riga che dice cosa diventano 100 € di
costo di produzione con ognuna. Un margine in percentuale non dice quanto si
incassa finché non lo si vede su una cifra.

Due regole strutturali:

- **Si salva solo quello che è stato davvero cambiato.** Conservare un valore
  identico al predefinito lo congelerebbe: il giorno in cui il motore cambia i
  suoi, questo laboratorio resterebbe fermo ai vecchi senza saperlo. Una
  politica riportata al valore del motore si cancella dall'archivio invece di
  essere riscritta uguale.
- **Il pavimento resta al motore.** La vista non copia la regola del margine
  minimo: una regola che vive in due posti prima o poi vale due cose.

L'intestazione del pannello adesso distingue esplicitamente le prime tre schede
(quello che il laboratorio **costa**) dalla quarta (quello che ci si vuole
**guadagnare** sopra). È la prima volta che quel pannello parla di prezzo, e la
distinzione non è pedanteria: è il modo in cui un laboratorio scopre a fine anno
di aver lavorato in perdita credendo di avere il 40%.

## Difetto 2 — il ricalcolo applicava un margine solo a tutti

`InglyCatalogRicalcolo.proposta()` prendeva `marginePct` e lo usava per ogni
riga. Un portachiavi da tre euro e un pezzo su commissione uscivano con la
stessa percentuale; distinguerli voleva dire lanciare il ricalcolo due volte
filtrando a mano.

Adesso un prodotto può dichiarare la sua politica, dalla scheda prodotto.
Il campo si chiama `pricingPolicyId`; **`cost_profile_id` è accettato come
sinonimo**, insieme a `costProfileId` e `politicaPrezzo`, perché è il nome con
cui la richiesta è arrivata e un dato già scritto così non deve diventare
invisibile per una questione di etichetta.

Tre comportamenti, tutti verificati in browser su un caso reale:

| Prodotto | Politica dichiarata | Margine usato | Prezzo su 10 € di costo |
| -------- | ------------------- | ------------: | ----------------------: |
| Generale | nessuna | 45% (generale) | € 18,18 |
| Premium | `premium` | 60% | € 25,00 |
| Ingrosso | `cost_profile_id: wholesale` | 20% | € 12,50 |
| Inventata | `inesistente` | 45%, **dichiarato sconosciuto** | € 18,18 |

L'ultima riga è la più importante: una politica dichiarata e non trovata **non
si sostituisce in silenzio** con quella generale. Il calcolo si fa lo stesso —
il sito non deve crollare per un dato imperfetto — ma la riga lo dice, con una
colonna dedicata nella finestra di anteprima.

`catalog-recalc.js` resta puro: le politiche gliele passa chi lo chiama. Se se
le andasse a prendere da sé leggerebbe `localStorage`, e i ricalcoli
smetterebbero di essere riproducibili. Un test lo verifica — e la sua prima
versione falliva sul commento che spiega perché il test esiste, il che è un
buon promemoria che un controllo va scritto sul codice, non sul testo.

## Cosa lo verifica

- `tests/politiche-prezzo.test.mjs` — 21 asserzioni.
- `tests/qa/politiche-prezzo.mjs` — 19 controlli in un browser vero. Cambia il
  margine Premium a **77%** — un valore che non è il predefinito di nessuna
  politica, così se ricompare da qualche parte ci è arrivato da lì — lo salva,
  rilegge l'archivio, verifica che **solo** quella toccata sia stata scritta,
  apre un prodotto, gli assegna la politica, lancia il ricalcolo vero dalla
  finestra del catalogo e controlla che il prezzo di quel prodotto sia diverso
  dagli altri. Poi preme «riporta ai valori del motore» e controlla che
  l'archivio torni vuoto.
