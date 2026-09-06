# FULL SYSTEM QA REPORT — audit funzionale completo

Data: 6 settembre 2026 · ramo `claude/ingly-personalization-repo-ekvc0z`
Artefatto misurato: `dist/INGLY-OS.html` — il file che si consegna, non i
sorgenti da cui nasce.

Corsa finale: `npm run qa` — **26 suite, 1101 controlli, 0 rossi, exit 0**;
`npm test` — 1313 asserzioni, 0 fallite; `npm run verify` — 224 file.

Documenti fratelli: `FULL-SYSTEM-BASELINE.md` (da dove si partiva) e
`FULL-TEST-MATRIX.md` (che cosa è stato provato e come).

---

## In una riga

Tredici difetti veri, tutti riprodotti prima di essere corretti, tutti coperti
da un controllo di regressione scritto **prima** della correzione e visto
fallire. Nessuno era visibile dai 913 controlli verdi della baseline: stavano
tutti nei quattro punti ciechi elencati nel documento di baseline.

---

## Come si è lavorato

Ogni difetto è passato per gli stessi otto passi, senza saltarne nessuno:

1. riprodotto nel browser, con i valori osservati scritti;
2. registrato l'errore esatto (messaggio, o numero sbagliato);
3. individuata la causa nel codice, non un sintomo;
4. scritto un controllo di regressione **e visto fallire**;
5. corretto;
6. rieseguito il controllo;
7. riverificato nel browser sul file ricomposto;
8. rieseguite tutte le altre suite per escludere regressioni.

Un episodio vale la pena di raccontarlo, perché è il modo tipico di sbagliare
un collaudo: dopo le prime cinque correzioni la suite è rimasta rossa negli
stessi punti. Il codice era corretto, ma il collaudo legge `dist/INGLY-OS.html`
e nessuno lo aveva ricomposto. Quella corsa è stata scartata, non riportata.

---

## I difetti trovati e corretti

### Smart Quoter 3D — una causa sola, cinque effetti

`render()` ricostruisce l'intero pannello da un template, e subito dopo
`_ripristina` rimette nei campi i valori che c'erano prima del ridisegno. È il
meccanismo che tiene in vita quello che l'utente sta scrivendo. Ma riscrive
anche **sopra i valori che il ridisegno voleva cambiare**: qualunque comando
che modifichi un predefinito viene annullato un millisecondo dopo averlo
applicato.

| ID | Che cosa faceva | Misurato | Causa | Correzione |
| -- | --------------- | -------- | ----- | ---------- |
| **BUG-3D-001** | «Reset» non resettava | campo a 777 → dopo il reset ancora 777 | `_ripristina` rimetteva i valori di prima | `SALTA_RIPRISTINO` durante il reset |
| **BUG-3D-002** | FDM→Resina teneva i parametri della FDM | 150W invece di 40; €420 invece di €250; 7% invece di 12% | i predefiniti della resina erano codice morto | `setType` dichiara i campi che sta rigenerando |
| **BUG-3D-003** | La strategia cambiava il prezzo, non il margine a schermo | prezzi 11,49→45,97 ma campo fermo a 40% | idem, sul campo margine | `setStrategia` rigenera margine e cursore |
| **BUG-3D-004** | «Rapida» e ritorno perdeva i campi avanzati | manodopera 31 €/h → 18 €/h da sola, costo 13,53 → 9,19 | i campi non disegnati sparivano dalla fotografia | memoria dei campi che sopravvive alla loro assenza |
| **BUG-3D-005** | «+IVA 22%» restava acceso su un preventivo senza IVA | lo sfondo del pulsante non cambiava mai | lo stato acceso era scritto fisso nel template | lo stato si legge da `IVA_ON` |
| **BUG-3D-006** | Caricare un preventivo non ne riportava il nome | campo nome vuoto dopo il caricamento | `loadSaved` ripristinava solo le righe | ripristina anche nome e cliente |
| **BUG-3D-007** | «→ Quoter» diceva «inviate N voci» e apriva un preventivo vuoto | righe: 1 subito dopo l'invio, 0 trecento millisecondi dopo | la navigazione chiama `Quoter.init()`, che azzera `lines` | le righe consegnate passano da `_inArrivo`, che l'ingresso consuma |

BUG-3D-007 non riguardava solo il 3D: valeva per ogni calcolatore che consegna
allo Smart Quoter — laser, catalogo, calcolatore macchine. La correzione sta in
un posto solo, dove il difetto nasceva.

**Perché contava.** BUG-3D-002 e BUG-3D-003 producevano prezzi sbagliati senza
dirlo: una stampa in resina costata con i consumi di una FDM, e uno schermo che
dichiara un margine mentre il motore ne applica un altro. BUG-3D-004 cambiava
il costo di un preventivo perché l'utente era passato per la vista rapida.

### Il resto dell'applicazione — sette pulsanti morti

Il censimento è costruito dal DOM: si aprono tutte le 101 rotte dichiarate, si
prendono i 1641 pulsanti con un gestore in linea e si risolve ogni nome
**nell'ambito globale** — non in `window`, perché un `const` in cima al file non
ci finisce e mezza applicazione risulterebbe inesistente. Poi, sui dieci moduli
principali, si preme.

| ID | Pulsante | Misurato | Causa |
| -- | -------- | -------- | ----- |
| **BUG-APP-001** | Backup · «🗑️ Azzera tutti i dati operativi» | `DataReset.run` non è definita | il modulo non è mai esistito |
| **BUG-APP-002** | Prenotazioni · «Nuova Prenotazione» | `BookingModule.openNew` non è definita | il modulo si chiama `Booking`. La rotta usava lo stesso nome sbagliato dietro un `typeof` sempre falso: la sezione era vuota per un nome, non per una funzione mancante |
| **BUG-APP-003** | Catalogo · «CSV In» e «CSV Out» | `CatalogImportExport` non è definito | le funzioni esistevano già con un altro nome |
| **BUG-APP-004** | Alert Scorte · «Ordina» | errore di sintassi nel gestore | il template scriveva `_order(Plywood Tiglio 3mm,4,mq)`: argomenti ripuliti dagli apici invece che quotati |
| **BUG-APP-005** | Catalogo · «ZIP+Foto» | `e.indexOf is not a function` | `book_append_sheet(wb,'Catalogo',ws)`: foglio e nome invertiti. Più una promessa rifiutata non raccolta quando JSZip non arriva dalla rete |
| **BUG-APP-006** | CRM · «☐ Seleziona» | `Cannot read properties of null` | `[id^="crm-chk-"]` prende anche la casella dell'intestazione, che sta in un `<th>`: `closest('td')` tornava null |
| **BUG-APP-007** | Laser B2B · «⚙️ Macchine» | `eu is not defined` | la formattazione era dentro l'IIFE di un'altra patch, e i gestori in linea valutano nell'ambito globale |

Su BUG-APP-001 una scelta che vale la pena spiegare: esisteva già
`Backup.factoryReset()`, che cancella tutto. Collegarci il pulsante sarebbe
stato veloce e sbagliato — quel pulsante dichiara «Catalogo, fornitori e
impostazioni rimangono intatti». `DataReset` è stata scritta per fare quello
che c'è scritto: azzera clienti, ordini, vendite, cashflow e attrezzatura, e
dei costi fissi tiene la lista mettendo gli importi a zero.

---

## Che cosa dicono i numeri

| Misura | Prima | Dopo |
| ------ | ----: | ---: |
| `npm test` | 1313 pass · 0 fail | 1313 pass · 0 fail |
| `npm run qa` — suite | 23 | 26 |
| `npm run qa` — controlli | 913 ✔ · 0 ✘ | **1101 ✔ · 0 ✘** (exit 0) |
| pulsanti del 3D provati premendoli | 0 | 62 |
| pulsanti dell'applicazione con gestore risolto | non misurato | 1641 su 1641 |
| pulsanti premuti sui moduli principali | non misurato | 811 |
| rotte aperte e classificate | 101 (solo elencate) | 101 (aperte, con esito) |
| domini con ciclo scrivi/leggi/modifica/cancella | non misurato | 11 |
| larghezze provate sui dieci moduli | 3 (solo sovrapposizioni) | 5 |

### Le rotte, classificate

101 rotte dichiarate, tutte aperte:

- **91 con contenuto** — la schermata si apre e mostra qualcosa;
- **4 alias** — `clients`→`view-clienti`, `etsyai`→`view-etsy_analytics`,
  `kanban` e `workflow_dashboard`→`view-gestione_ordini`. Sono gli accorpamenti
  dei mesi scorsi: la voce di menu resta, il modulo è uno. Misurare
  `view-<rotta>` le avrebbe dichiarate «nascoste» a torto;
- **3 vuote per scelta, dichiarate con il motivo** — `briefing` (è una
  finestra), `monthly_report` (genera un PDF), `stockplanner` (è un pannello
  dentro Magazzino);
- **6 quasi vuote** — `bu`, `etsy_pulse`, `history`, `revsim`, `team`,
  `weeklyreport`. Sono moduli annunciati e non finiti: non si aprono su un
  errore, si aprono su poco. Sono un elenco di lavoro, non un difetto di
  questa campagna;
- **0 nascoste, 0 con eccezione.**

### Prestazioni e larghezze

Cinque larghezze (390, 430, 768, 1366, 1920 px) × dieci moduli: **sbordo
orizzontale massimo 0 px**, nessun modulo senza contenuto.

Passaggio da un modulo all'altro, a caldo: da 4 ms (dashboard) a 46 ms
(impostazioni). Documento: 15.615 nodi. DOM pronto al caricamento: 1139 ms.

### I `catch` che ingoiano

Censiti, non stimati: **1008 blocchi `catch` in tutto il progetto, 460 con il
corpo vuoto.** Classificati per quello che avvolgono:

| Che cosa avvolge il `try` | Quanti | Rischio |
| ------------------------- | -----: | ------- |
| una **scrittura** (`setItem`, `IDB.put/del/clearStore`, `AppStore.set`) | 134 | **neutralizzato**: la sorveglianza in `src/core/errors/logger.js` intercetta le sei funzioni di scrittura, registra e avvisa **prima** che il `catch` ingoi. Verificato da `scritture-non-silenziose.mjs` |
| una **lettura con valore di ripiego** (`getItem`, `JSON.parse`, `IDB.get`) | 120 | legittimo: è un valore predefinito, non un guasto nascosto |
| un accesso al **DOM** | 18 | basso |
| altro | 188 | **rimane silenzioso** |

I 188 restanti sono un elenco di lavoro dichiarato, non una cosa corretta in
questa campagna. Quello che si può dire con una misura: sotto 811 pressioni sui
moduli principali non hanno prodotto nessun errore JavaScript e nessuna catena
asincrona rotta.

---

## Che cosa resta NON VERIFICATO

Elencato perché non resti implicito. Ogni voce ha il suo motivo.

1. **Il verso «conferma» dei comandi distruttivi.** Nella campagna sugli 811
   pulsanti `window.confirm` risponde `false`. Un collaudo che accetta ogni
   conferma cancella i dati a metà del giro e i comandi successivi falliscono
   per una ragione che non è loro. Conseguenza diretta: `DataReset.run()` è
   verificata fino alla domanda di conferma, non oltre.
2. **I selettori di file.** Importazione Excel, CSV, immagini e .gcode arrivano
   fino al punto in cui il file entrerebbe: `<input type="file">` non è
   pilotabile da un collaudo.
3. **I file che escono.** PDF, ZIP ed Excel sono verificati sul testo e sui
   numeri che il prodotto genera, non aprendoli in un lettore.
4. **I gestori legati all'elemento** (`this.parentElement.remove()`): non
   valutabili senza il clic, esclusi dal censimento e dichiarati tali.
5. **Il tocco su schermo vero.** Si emula la larghezza, non il dito.
6. **I sei moduli quasi vuoti** (`bu`, `etsy_pulse`, `history`, `revsim`,
   `team`, `weeklyreport`): si aprono, non hanno contenuto da provare.
7. **I 188 `catch` vuoti della categoria «altro»**: censiti, non corretti.

---

## STATUS

**COMPLETE** rispetto al criterio dichiarato: nessuno dei dieci moduli
principali ha più un pulsante che non funziona. La misura che lo sostiene —
1641 gestori risolti su 1641, 811 pulsanti premuti, 0 eccezioni, 0 catene
asincrone rotte, 0 errori JavaScript — è rieseguibile con
`node tests/qa/rotte-e-pulsanti.mjs`.

Con le sette esclusioni dichiarate qui sopra, la prima delle quali è la più
importante: i rami «conferma» dei comandi distruttivi restano NON VERIFICATI, e
questo è un limite del metodo, non una svista.

---

## Come rifare le misure

```bash
npm run verify   # 224 file JS
npm test         # 1313 asserzioni sui moduli puri
npm run build    # ricompone dist/INGLY-OS.html — senza questo, il collaudo
                 # misura la versione precedente
npm run qa       # 26 suite Playwright sul file consegnato

# le singole suite di questa campagna
node tests/qa/quoter3d-pulsanti.mjs          # 62 pulsanti del 3D
node tests/qa/quoter3d-calcoli.mjs           # i numeri del 3D
node tests/qa/quoter3d-materiali-slicer.mjs  # macchina, materiale, slicer, consegna
node tests/qa/rotte-e-pulsanti.mjs           # 101 rotte, 1641 pulsanti
node tests/qa/storage-crud.mjs               # 11 domini
node tests/qa/responsive-prestazioni.mjs     # 5 larghezze e i tempi
```
