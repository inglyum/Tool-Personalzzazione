# CRM Clienti — piano di consolidamento

Voce della roadmap principale. Nulla di ciò che segue è implementato: quello
che esiste oggi, misurato, è in `docs/CRM-AUDIT-BEFORE.md`.

Il lavoro non è «aggiungere funzioni al CRM». È lo stesso lavoro che questo
progetto ha già fatto tre volte: **quattro sistemi possiedono il concetto
«cliente», e vanno ridotti a uno.**

---

## Ordine di esecuzione

Non è un elenco di desideri: è una sequenza, e le dipendenze sono reali. Chi
scrive la ricerca prima degli id stabili la riscrive due volte.

### Blocco A — la base (niente funziona bene senza)

| # | Cosa | Perché adesso |
| - | ---- | ------------- |
| **CRM-01** | Audit misurato delle quattro liste | ✅ fatto — `docs/CRM-AUDIT-BEFORE.md` |
| **CRM-02** | **Paginazione: togliere la causa** | riprodotto: `slice` calcolata e mai usata (patch 092). Una sola funzione costruisce le righe, e le costruisce dalla pagina. Presidio già scritto: `tests/qa/crm-paginazione.mjs`, da mettere in `npm run qa` **nello stesso commit** che lo corregge |
| **CRM-03** | Id stabile per ogni cliente, con migrazione | oggi le righe si identificano per **posizione**: `_editClient(i)`, `_deleteClient(i)`. Correggere CRM-02 senza questo significa modificare il cliente sbagliato |
| **CRM-04** | Una sorgente sola | `ingly_crm_v1` è dove stanno i clienti veri. L'archivio `clients` di IndexedDB e `BDW.segments` diventano viste, non copie. Migrazione conservativa: nessun record si perde, chi è solo da una parte sopravvive |
| **CRM-05** | Una funzione che disegna la riga | oggi ce ne sono quattro; è il motivo per cui una correzione ne aggiusta una e lascia le altre |

### Blocco B — scala (dopo A, non prima)

| # | Cosa |
| - | ---- |
| CRM-06 | Ricerca con indice, non `filter` su tutto a ogni battuta |
| CRM-07 | Ordinamento server-side rispetto alla pagina (oggi ordina l'array e poi lo ridisegna intero) |
| CRM-08 | Filtri combinabili (tipo, segmento, tag) che sopravvivono al cambio pagina |
| CRM-09 | Rendering a blocchi oltre i 500 clienti |
| CRM-10 | Conteggi che non richiedono di caricare tutti i record |

### Blocco C — integrità

| # | Cosa |
| - | ---- |
| CRM-11 | Vincoli in eliminazione: un cliente con ordini, preventivi, fatture o pagamenti **non si cancella** — `status: 'ARCHIVED'` |
| CRM-12 | Unione dei duplicati che non perde nulla: gli storici dei due record confluiscono, non si scelgono |
| CRM-13 | Validazione di email e telefono in ingresso, non solo alla vista |
| CRM-14 | Registro delle modifiche al cliente, come `economicLog` per gli ordini |

### Blocco D — valore per chi vende

| # | Cosa |
| - | ---- |
| CRM-15 | Scheda cliente con lo **storico economico reale**, cioè gli `economicSnapshot` degli ordini (Fase 30), non un ricalcolo |
| CRM-16 | Segmentazione RFM su una sorgente sola |
| CRM-17 | Timeline unificata: preventivi, ordini, vendite, pagamenti |
| CRM-18 | Esportazioni (VCF, CSV) che esportano la selezione, non l'elenco intero |

---

## Regole per chi esegue

Sono le stesse che valgono nel resto del progetto, ripetute perché il CRM è
esattamente il posto dove sono state violate.

1. **Un difetto si corregge alla causa.** Niente `display:none` sulle righe in
   eccesso: la tabella continuerebbe a costruirle.
2. **Non si crea una quinta lista.** Se la soluzione comincia con «facciamo un
   nuovo componente clienti», è la soluzione sbagliata.
3. **Non si cambia una chiave di memoria senza migrazione.** `ingly_crm_v1`
   contiene i clienti veri di chi usa il prodotto oggi.
4. **Non si cancella: si archivia.**
5. **Nessun dato inventato.** Punteggi, segmenti e statistiche senza una base
   reale restano vuoti e la vista lo dice.
6. **Ogni presidio nasce rosso.** `tests/qa/crm-paginazione.mjs` è rosso adesso:
   entra in `npm run qa` quando diventa verde per la ragione giusta.

## Come si saprà che è finito

- `tests/qa/crm-paginazione.mjs` verde e nella suite.
- Con 137 clienti: la prima pagina disegna 30 righe, la seconda ne disegna 30
  **diverse**.
- Con 5.000 clienti la vista si apre senza bloccare la pagina.
- Modificare il cliente in fondo alla pagina 4 modifica quel cliente.
- Un cliente con ordini non è cancellabile, ed è archiviabile.
- `scripts/audit-ui-duplicates.mjs` non trova più liste clienti concorrenti.
