# Il listino

| | Standard | Premium | Business |
| --- | ---: | ---: | ---: |
| Mensile | €19 | €39 | €79 |
| Annuale | €190 | €390 | €790 |
| Ordini/mese | 100 | 500 | senza limite |
| Utenti | 1 | 3 | illimitati |
| | | **Più scelto** | |

**«Risparmi 2 mesi» non è scritto accanto al pulsante: è calcolato** dai due
prezzi veri. `risparmioAnnuale()` restituisce `mesiRegalati: 2` per tutti e tre
i piani perché 19×12−190 = 38 = 19×2. Se un giorno il listino cambiasse e il
rapporto non tornasse più, la schermata direbbe il numero nuovo invece di una
promessa falsa.

## Le funzioni

28 funzioni dichiarate per nome. Standard ne ha 11, Premium 22, Business 28, e
ogni piano contiene quelle dei piani sotto — verificato da un test, non dalla
disciplina.

**Standard** — dashboard, CRM, preventivi, Smart Quoter, ordini, catalogo,
materiali, vendite, documenti, backup, analisi di base.

**Premium** — tutto Standard, più produzione e MES, operazioni, macchine,
distinta base, fabbisogno materiali, magazzino, costi reali, marginalità,
pagamenti, analisi avanzate, strumenti AI.

**Business** — tutto Premium, più API, più sedi, ruoli avanzati, audit
avanzato, integrazioni, supporto prioritario.

## I prezzi sono righe, non costanti

Ogni prezzo ha `id`, `plan_id`, `billing_interval`, `amount`, `currency`,
`active`, `effective_from`, `effective_to`. Cambiare listino significa
aggiungere righe con una nuova data di validità, non modificare un numero — i
contratti in corso restano leggibili.

## Una cosa che non si può fare

Il catalogo restituisce copie. Modificare il piano ricevuto non modifica il
catalogo: un piano mutato a runtime sarebbe un diritto regalato.
