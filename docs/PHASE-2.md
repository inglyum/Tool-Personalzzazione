# FASE 2 — INGLY OS come prodotto verticale

> Cosa è stato costruito sopra le fondamenta della fase 1, cosa è cambiato nel
> codice storico, cosa è stato deliberatamente lasciato stare, e cosa non
> funziona ancora.

La fase 1 ha reso il monolite ricomponibile e verificabile. La fase 2 lo rende
un prodotto per un laboratorio che lavora **laser, stampa 3D, UV, DTF,
sublimazione e personalizzazione**.

---

## 1. Il principio che decide tutto: nessun numero inventato

Una dashboard bella con dati finti è una bugia con un grafico sopra. Ogni cifra
mostrata in fase 2 è letta dagli store esistenti attraverso un solo adattatore,
`src/product/data.js`, che è **di sola lettura** e non sa scrivere.

Quando un dato non c'è, l'adattatore restituisce `{ empty: true, reason }` e
l'interfaccia dice cosa manca invece di mostrare uno zero:

| Situazione | Cosa mostra il vecchio approccio | Cosa mostra INGLY OS |
| --- | --- | --- |
| Nessuna spesa registrata | `Margine 100%` | `—` · «nessun costo registrato» |
| Nessuna macchina censita | `0 macchine attive` | «nessuna macchina» |
| Motore prezzi non disponibile | `€0,00` | il motivo per cui non c'è un prezzo |

Il margine al 100% non è un dettaglio estetico: è il numero che fa prendere
decisioni sbagliate sui listini.

**Il dataset di laboratorio vive nei test, mai nel prodotto.**
`tests/qa/seed.mjs` contiene cinque macchine, dieci ordini, sei vendite, sette
articoli, sei prodotti, tre clienti e due fornitori realistici. Serve a provare
che i calcoli funzionano. Non viene compilato dentro `dist/`.

---

## 2. Cosa è stato costruito

Tutti i moduli nuovi stanno in `src/product/` e vengono aggiunti in coda alla
patch 176. Nessuno di loro riscrive un motore esistente.

| Modulo | Cosa fa | Su cosa si appoggia |
| --- | --- | --- |
| `ui.js` | toast, dialoghi con trappola del fuoco, stati vuoti, formattazione | il `toast()` storico quando c'è |
| `dialogs.js` | ponte `alert()`, aiuti `askConfirm` / `askPrompt` / `askForm` | `ui.js` |
| `data.js` | l'unica lettura dei dati: KPI, centri di lavoro, scorte, macchine, redditività, ricerca | `AppStore`, `IDB`, `PricingEngine` |
| `work-center.js` | un centro di lavoro configurabile per tecnologia | `data.js` |
| `dashboard.js` | l'Operating Center | tutti i precedenti |
| `product-builder.js` | otto passi da un'idea a un prodotto producibile | `PricingEngine`, store `catalog` |
| `topbar.js` | sei elementi in barra, il resto in un menu | i nodi originali |
| `command-palette.js` | comandi e ricerca globale su sei entità | `data.js`, `App.navigate` |

### Il Work Center

Cinque tecnologie, **una sola implementazione** configurata cinque volte. Le
tecnologie vengono dedotte dai dati reali, che sono disordinati: `normalizeTech`
riconosce «CO₂», «diodo», «MOPA», «fibra» come laser e «UV DTF» come DTF, non
come UV — l'ordine dei controlli conta, ed è per questo che il caso UV DTF è
verificato per primo.

Lo stesso vale per lo stato di una macchina. Prima della fase 2 la stessa
macchina risultava «PRONTA» in una schermata e «STATO NON INDICATO» in un'altra,
perché due punti del codice interpretavano la stessa stringa in modo diverso.
Ora `machineState()` è uno solo.

### Il Product Builder

Otto passi: prodotto → tecnologia → macchina → materiale → produzione → costi →
prezzo → varianti. Il costo non viene ricalcolato: viene chiesto a
`PricingEngine.suggest()`, il motore che l'applicazione già usa. La QA lo
verifica confrontando il numero mostrato con una invocazione separata dello
stesso motore.

---

## 3. Cosa è cambiato nel codice storico

Ogni file storico modificato è dichiarato in `baseline/deliberate-changes.json`
con la ragione. Il test fallisce sia se compare una modifica non dichiarata, sia
se una modifica dichiarata **non è più presente**.

### Bug corretti alla causa

| Sintomo | Causa | Correzione |
| --- | --- | --- |
| L'Operating Center spariva dopo il primo render | tre moduli ridisegnavano la dashboard e sei iniettori tardivi inserivano nodi | i tre delegano a `InglyDashboard.render()`; gli iniettori sono gestiti da un osservatore limitato |
| Due palette sovrapposte con `Ctrl/Cmd + K` | cinque moduli registravano un gestore sulla stessa scorciatoia | un gestore in fase di cattura che ferma la propagazione — un punto invece di cinque file |
| Sei notifiche di scadenza identiche impilate | `_schedule` leggeva `dueAt` mentre chi le crea scrive `dueMs`: `setTimeout(fn, NaN)` parte subito; in più `add()` e `_fire()` mostravano la stessa scheda due volte; in più nessuno segnava una notifica come già mostrata | i tre punti corretti separatamente; `_fire` è ora idempotente e limitato a quattro schede |
| Nove pulsanti tornavano in topbar dopo la ricostruzione | le patch li aggiungono secondi dopo l'avvio | un osservatore limitato applica loro la stessa regola: il nodo si sposta, non si ricrea |
| «Avanti» restava disabilitato dopo aver scritto il nome | il piede della finestra si aggiornava solo al cambio passo | `syncFooter()` chiamato nel ciclo di aggiornamento |
| La sidebar a 60 px conteneva 260 px di contenuto | `#sidebar-inner` è ancorato a `--sidebar-w`, che non segue la larghezza della barra | l'interno segue la barra; vedi §5 |

### Dialoghi di sistema

`alert()` è instradato verso una notifica da **un solo punto**, non modificando
trenta file. La scelta è motivata, non comoda: le 46 chiamate nel codice
dell'applicazione sono state lette una per una e sono tutte della forma «messaggio, poi `return`». Nessuna
dipende dal fatto che `alert` sospenda l'esecuzione — le due che precedono un
reload sono guardie che escono prima — e nessun chiamante ne legge il valore.
Una parte vive dentro codice generato come stringa, dove il diff largo sarebbe
stato più rischioso del ponte. `InglyUI.nativeAlert` conserva l'originale.

`confirm()` e `prompt()` **non** sono ponteggiati: restituiscono un valore in
modo sincrono, e qualunque sostituzione non bloccante renderebbe
`if (confirm(…))` sempre vero — cancellando dati che l'utente ha appena
rifiutato di cancellare. Sono migrati a mano, un componente alla volta:

| Modulo | Chiamate migrate | Stato |
| --- | --- | --- |
| `catalog` | 10 | fatto |
| `items` | 9 | fatto |
| `orders` | 10 | fatto |
| `settings`, `quoter`, `marketing`, `sales` e le patch | 165 | **da fare** |

Dove i prompt erano in fila — tre per un fornitore, quattro per una voce
d'ordine — ora c'è un modulo solo.

---

## 4. Cosa è stato lasciato stare, e perché

- **I 2.543 `onclick` inline non sono stati migrati in blocco.** Il codice nuovo
  non ne usa nessuno; quello storico si converte per componenti, quando quel
  componente viene toccato per un'altra ragione.
- **Nessuna funzione è stata rimossa perché non ancora capita.** I pulsanti della
  topbar che nessuno ricorda di avere sono nel menu, con i loro gestori
  originali, non nel cestino.
- **`addToQuoterFromMat` non ha chiamanti** in tutto il repository. È stata
  migrata come le altre e lasciata al suo posto: «senza chiamanti» non è
  «morta», e la rimozione è una decisione separata.
- **Nessun nuovo database, nessun motore duplicato, nessun sistema di costi
  parallelo.** `data.js` legge e basta.

### Un ritrovamento da decidere

`SmartReminder` in patch 064 definisce `checkOnBoot` **due volte nello stesso
oggetto**. In JavaScript vince l'ultima, quindi la prima — che avvisa degli
ordini in scadenza entro 24 ore e dei pagamenti scaduti — non è mai stata
eseguita da nessuno. Non è stata risvegliata in questa fase: farlo aggiunge due
notifiche all'avvio, ed è una decisione di prodotto, non una correzione. È
segnalata qui perché sparisca dalla categoria «comportamento misterioso».

---

## 5. Responsive

Cinque larghezze, otto sezioni, più topbar, sidebar e una modale aperta apposta —
`tests/qa/responsive.mjs`. La misura non è estetica: è se il documento diventa
scorrevole in orizzontale.

| Larghezza | Sidebar | Layout |
| --- | --- | --- |
| 1440 · 1280 | completa, con etichette | griglie a più colonne |
| 1024 | binario di sole icone (60 px) | colonne ridotte |
| 768 · 390 | pannello estraibile, fuori schermo da chiuso | colonna singola |

Due ostacoli non risolvibili per selettore, entrambi documentati nel foglio:

1. I riquadri di solo testo della sidebar sono creati da JavaScript con
   `style.cssText`, quindi portano `display:flex` **in linea**. Sono i due soli
   punti del design system con `!important`, e il test di igiene ora pretende un
   marcatore `/* !important-ok: … */` con la ragione accanto alla regola.
2. Le voci di menu scrivono l'etichetta come **nodo di testo nudo** accanto
   all'icona — `<i class="fas…"></i>Dashboard ROI` — non dentro uno `<span>`.
   Per questo nasconderla per selettore non funzionava: si azzera il corpo del
   testo sulla voce e lo si restituisce all'icona.

Nulla diventa irraggiungibile: la ricerca è nella topbar e risponde a `⌘K` a
ogni larghezza.

---

## 6. Verifiche

```bash
npm run check                          # sintassi + build + 55 test
node tests/qa/dashboard.mjs  dist/INGLY-OS.html
node tests/qa/builder.mjs    dist/INGLY-OS.html
node tests/qa/palette.mjs    dist/INGLY-OS.html
node tests/qa/dialogs.mjs    dist/INGLY-OS.html
node tests/qa/responsive.mjs dist/INGLY-OS.html
```

Le prove che contano non sono «la pagina si apre»:

- **I numeri vengono dagli store.** Con il dataset di laboratorio la dashboard
  ricava cinque centri di lavoro da stringhe di tecnologia disordinate, due
  articoli esauriti e tre sotto scorta, e cinque osservazioni ognuna derivata da
  un conteggio reale.
- **Il costo del Product Builder coincide** con una invocazione separata di
  `PricingEngine.suggest()`.
- **Annullare non cancella.** Il test conta i prodotti prima e dopo: annullando
  restano 76, confermando diventano 75. È la sola prova che la migrazione dei
  `confirm()` non ha rotto niente.
- **Zero finestre native**, zero errori JS, notifiche da sei a due senza
  duplicati.

---

## 7. Limiti noti

1. **I calcolatori specialistici non sono richiamabili senza interfaccia.**
   `LaserCalcV2`, `CalcMacchine` e `Print3DQuoter` leggono i valori dagli `id`
   dei campi nel DOM, quindi non si possono invocare da codice. Il Product
   Builder usa perciò `PricingEngine.suggest()` come motore unico e **mostra**
   il costo orario della macchina scelta da MachineHub, con una nota esplicita
   che il calcolo usa la tariffa generica delle Impostazioni. Renderli
   richiamabili significa separare calcolo e lettura del modulo: è un lavoro a
   sé, non un ritocco.
2. **La migrazione di `confirm()` e `prompt()` è ferma a tre moduli.** Gli altri
   usano ancora le finestre del browser. Il comportamento è corretto, l'aspetto
   no.
3. **Una richiesta di rete fallisce da offline**: il cambio valuta interroga la
   BCE. È l'unico errore residuo in console e riguarda una funzione che senza
   rete non può funzionare.
4. **Il conteggio di `--sidebar-w`.** Il ponte dei nomi storici mappa
   `--sidebar-w` su `--shell-sidebar-width`, ma nel documento composto prevale
   la definizione storica. Il layout è corretto perché il design system dichiara
   direttamente la larghezza dell'interno; la variabile resta però un doppione
   da riunificare.
