# Nessuna voce di menù deve portare a una pagina bianca

Misurato aprendo l'applicazione in un browser, una sezione per volta. Lo smoke
test ne segnalava quindici fra vuote, quasi vuote e nascoste. Non erano un
problema: erano **quattro problemi diversi**, e tre di quelle quindici non erano
un problema affatto.

## 1. Sei sezioni aspettavano un momento di quiete che non arrivava

`weeklyreport`, `pdfmonth`, `kpi`, `intel`, `forecasting`, `contentcalendar`.

La rotta rinviava il disegno con `requestIdleCallback(fn)` — senza scadenza.
«Quando capita», che in una pagina che carica centoquarantotto script può voler
dire mai.

Misurato su `weeklyreport`: il modulo produce **1617 caratteri** se lo si chiama
a mano, **zero** passando dalla rotta.

`_appenaPossibile(fn, ms)` passa una scadenza vera a `requestIdleCallback` e
tiene un `setTimeout` di sicurezza dietro, perché la scadenza di
`requestIdleCallback` non è onorata ovunque. Una bandiera impedisce che il
disegno parta due volte.

| Sezione | Prima | Dopo |
| ------- | ----: | ---: |
| weeklyreport | 0 | 1617 |
| intel | 0 | 3396 |
| contentcalendar | 0 | 1122 |
| pdfmonth | 0 | 660 |
| kpi | 0 | 660 |
| forecasting | 0 | 182 |

`WeeklyReport` aveva anche un secondo problema: era un `const` mai esportato su
`window`. Ora lo è.

## 2. Una sezione promette una funzione mai costruita

`revsim` — «Revenue Simulator». `RevSim` non è definito in nessun file
sorgente: esistono solo due export protetti che non trovano niente.

Non si inventa il modulo. Un simulatore di ricavi senza uno storico di vendite
proietta numeri inventati, e il §43 vale anche qui. `sezione-incompleta.js` dice
tre cose: a cosa servirebbe, perché non c'è, e **quale strumento già presente
risponde alla stessa domanda adesso** — Financial Forecaster e KPI, entrambi
verificati funzionanti dalla suite, che preme il consiglio e guarda dove
finisce.

Se un giorno `RevSim` verrà scritto, `mostra()` non disegnerà più: la rotta
prova sempre prima il modulo vero.

## 3. Due sezioni erano vuote perché l'archivio era vuoto

`bu` e `team`.

**Qui la prima diagnosi era sbagliata, ed è la parte che vale la pena
raccontare.** `window.BU` è `undefined`, e questo mi ha fatto concludere che il
modulo non esistesse. Esiste: `const BU = {` in `modules/settings/index.js`, un
modulo completo con render, grafici, modale e cancellazione. Come quasi tutti i
moduli legacy è un `const` globale, non una proprietà di `window`: guardare solo
`window` fa credere assente un modulo che c'è.

Per un'ora quelle due sezioni hanno mostrato un cartello «non ancora
disponibile» sopra due moduli funzionanti — peggio del difetto che volevo
correggere. Il test che l'ha scoperto è la fase che verifica che *il modulo
vero vinca*: falliva, e falliva perché nel test assegnavo `window.BU`, che il
`const` oscura.

Da qui due conseguenze permanenti:

- `moduloPresente()` non guarda solo `window`: risolve anche l'identificatore
  globale, che è come sono scritti i moduli di questo programma.
- `sezione-incompleta.js` contiene **una sezione sola**. Un archivio vuoto non è
  una funzione mancante, e va risolto dove sta: dentro il modulo che disegna la
  lista.

`BU.render()` e `Team.render()` hanno adesso uno stato vuoto che dice cosa
manca e porta il pulsante che lo riempie. Per `team` il messaggio distingue
esplicitamente l'anagrafica del personale dal costo orario che entra nei
preventivi: sono due cose diverse e restano separate.

## 4. Tre delle quindici non erano rotte

- `briefing` e `monthly_report` non sono sezioni: sono comandi che aprono un
  pannello. Misurato al clic: il DOM cresce di 14 959 e 8 148 caratteri. Lo
  smoke test le contava come «senza vista» perché cercava un `view-<nome>`.
- `stockplanner` non ha più una voce di menù: patch 076 la rimappa.
- `clients`, `etsyai`, `kanban`, `workflow_dashboard` funzionano: la
  navigazione le porta al loro alias (`view-clienti`, `view-etsy_analytics`,
  `view-gestione_ordini`). Resta un `view-<nome>` orfano nel documento, con
  markup morto che nessuno vede — da ritirare insieme alle altre schermate
  morte, non da riparare.

## Cosa lo verifica

- `tests/sezioni-vuote.test.mjs` — 20 asserzioni, fra cui il confine che
  impedisce di rimettere `bu` e `team` dietro il cartello, e il controllo che
  nessuna delle sei rotte torni a rinviare senza scadenza.
- `tests/qa/sezioni-vuote.mjs` — 23 controlli in un browser vero. L'ultimo gira
  **tutte le 110 voci di menù** e conta quelle che dopo due secondi non hanno
  disegnato niente. Attende con polling e non a tempo fisso: `etsy_pulse`
  impiega circa un secondo e con un'attesa secca risultava bianca senza esserlo.
